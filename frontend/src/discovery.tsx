import { marked } from "marked";
import { useAtom } from "jotai";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { app, main } from "./api";
import { Card } from "./card";
import { Factor, FactorID } from "./factors";
import { Block, Flex, lt } from "./layout";
import {
    createPair,
    currentDate,
    partition,
    randomElem,
    shuffle,
    sleep,
    tryJSONParse,
    useAsyncEffect,
    useInterval,
    yesterDate,
} from "./lib";
import { appState } from "./state";
import { AudioPlayer, AudioPlayer$ } from "./AudioPlayer";
import {
    Badge,
    Button,
    CardBox,
    Checkbox,
    Details,
    EventUtil,
    Icon,
    RadioButton,
    RadioGroup,
    Range,
    Shoe,
    Tag,
    Tooltip,
} from "./shoelace";
import { boolean, z } from "zod";
import { produce, enableMapSet } from "immer";
import { canPlayAudio } from "./DeckAudio";
import { Tick } from "./components";

enableMapSet();

function useReviewingCards(deckName?: string) {
    const [allCards, setAllCards] = useState<Card[]>([]);
    const [cards, setCards] = useState<Card[]>([]);
    const [drillCards] = useAtom(appState.drillCards);

    const fn = useCallback(async () => {
        const cardData = await app.GetReviewingCards(deckName ?? "", -1);
        setAllCards(cardData.map((c) => Card.parse(c)));
    }, [deckName]);
    useAsyncEffect(fn);

    useEffect(() => {
        const yester = yesterDate();
        const today = currentDate();
        const idSet = new Set(drillCards.map((c) => c.id));
        const cards = allCards.filter((c) => {
            if (c.lastRecallDate === today) return false;
            if (idSet.has(c.id)) return false;
            return true;
        });
        let [yesterdayCards, otherCards] = partition(cards, (c) => c.lastUpdate === yester);

        yesterdayCards = shuffle(yesterdayCards);
        otherCards = shuffle(otherCards);
        setCards(yesterdayCards.concat(otherCards));
    }, [allCards, drillCards]);

    return createPair(cards, setCards);
}

function CardInfo({ card }: { card: Card }) {
    return (
        <Block inline>
            <Flex mx={Shoe.spacing_small_2x} cml={Shoe.spacing_small_2x}>
                {card.id}
                {Card.isNew(card) && (
                    <div>
                        <Tooltip content="new card">
                            <Tag variant="success" pill size="small">
                                new
                            </Tag>
                        </Tooltip>
                    </div>
                )}
                {Card.isReviewing(card) && (
                    <div>
                        <Tooltip content="reviewing card">
                            <Tag variant="primary" pill size="small">
                                review
                            </Tag>
                        </Tooltip>
                    </div>
                )}
                <div>
                    <Tooltip content="recalls">
                        <Badge variant="success" pill>
                            {card.numRecall}
                        </Badge>
                    </Tooltip>
                </div>
                <div>
                    <Tooltip content="forgets">
                        <Badge variant="danger" pill>
                            {card.numForget}
                        </Badge>
                    </Tooltip>
                </div>
            </Flex>
        </Block>
    );
}

function TestInterval() {
    const [index, setIndex] = useState(0);
    const [count, setCount] = useState(0);

    useInterval(
        1000,
        () => {
            setCount((count) => count + 1);
        },
        [setCount],
    );

    return (
        <div>
            count={count}
            <br />
            index={index}
        </div>
    );
}

export namespace SequentRecap$ {
    namespace Options {
        const lsKey = "sequent-recap";

        export const schema = z.object({
            factor: z.enum(["meaning", "sound", "text", "auto"]),
            notify: z.boolean(),
            secondsPerCard: z.number().min(5),
            soundDelay: z.number().min(3),
            notifyDelay: z.number().min(10),
        });

        export type T = z.infer<typeof schema>;

        export const defaultOptions: T = Object.freeze({
            factor: "auto",
            notify: false,
            secondsPerCard: 5,
            soundDelay: 5,
            notifyDelay: 10,
        });

        export function load() {
            const res = schema.safeParse(tryJSONParse(localStorage.getItem(lsKey) ?? ""));
            if (!res.success) {
                console.log("failed to load options", res.error);
                return { ...defaultOptions };
            }
            return res.data;
        }
        export function save(options: T) {
            localStorage.setItem(lsKey, JSON.stringify(options));
        }
    }

    export interface Props {
        cardData: main.CardData[];
    }

    const defaultRenderState = {
        index: -1,
        //currentCard: null as Card | null,
        factor: null as FactorID | null,
        countdown: 10,
        showSettings: false,
        options: Options.defaultOptions,
        lastNotify: 0,
        lastSound: 0,
    };
    type RenderState = typeof defaultRenderState;

    export function View({ cardData }: Props) {
        type FactorFilter = FactorID | "auto";
        const [drillCards, setDrillCards] = useAtom(appState.drillCards);
        const [state, setState] = useState<RenderState>(defaultRenderState);
        const audioPlayer = useRef<AudioPlayer$.Control | null>(null);

        const { current: refState } = useRef({
            reviewingCards: [] as Card[],
        });

        function update(fn: (arg: RenderState) => void | unknown) {
            const newState = produce(state, (draft) => {
                fn(draft);
            });
            setState(newState);
            return newState;
        }

        function updateOptions(fn: (arg: Options.T) => void | unknown) {
            const state = update((s) => {
                s.countdown = s.options.secondsPerCard;
                fn(s.options);
            });
            Options.save(state.options);

            return state;
        }

        function onHuh() {
            update((s) => updateNextCard(s, refState.reviewingCards));
        }

        function onAdd(card: Card | null) {
            if (!card) return;

            if (!drillCards.find((c) => c.id === card.id)) {
                setDrillCards(drillCards.concat(card));
                update((s) => updateNextCard(s, refState.reviewingCards));
            }
        }

        useInterval(
            1000,
            () => {
                update((s) => {
                    const n = s.countdown;
                    s.countdown = n > 0 ? n - 1 : 0;
                    const card = refState.reviewingCards[state.index];
                    tryPlaySound(s, card, audioPlayer.current);

                    if (s.countdown === 0) {
                        s.countdown = s.options.secondsPerCard;
                        updateNextCard(s, refState.reviewingCards);
                    }
                });
            },
            [state],
        );

        useEffect(() => {
            const newState = produce(defaultRenderState, (state) => {
                const cards = shuffle(cardData)
                    .slice(0, 120)
                    .map((c) => Card.parse(c));

                const options = Options.load();
                state.options = options;
                state.index = -1;
                refState.reviewingCards = cards;

                updateNextCard(state, cards);
            });

            setState(newState);
        }, [cardData, refState]);

        const card = refState.reviewingCards[state.index];
        if (!card) {
            return <Container>no more cards for recap</Container>;
        }

        const randomExample = randomElem(card.examples);
        const options = state.options;

        return (
            <Container>
                <CardBox>
                    <Flex justifyContent={"space-between"}>
                        <CardInfo card={card} />
                        <Button
                            onClick={() => update((s) => (s.showSettings = !s.showSettings))}
                            size="small"
                        >
                            <Icon slot="prefix" name="gear-wide" />
                        </Button>
                    </Flex>
                    <Flex
                        hide={!state.showSettings}
                        direction="column"
                        alignItems={"start"}
                        mb={Shoe.spacing_large}
                        cmt={Shoe.spacing_small_2x}
                    >
                        <Flex cmr={Shoe.spacing_small}>
                            <SettingsLabel>show</SettingsLabel>
                            {Object.keys(Factor)
                                .concat("auto")
                                .map((f) => (
                                    <Checkbox
                                        key={f}
                                        name="factors"
                                        value={f}
                                        checked={f === options.factor}
                                        onSlChange={() =>
                                            updateOptions((o) => (o.factor = f as FactorFilter))
                                        }
                                    >
                                        {f}
                                    </Checkbox>
                                ))}
                        </Flex>
                        <Flex>
                            <SettingsLabel>seconds / card</SettingsLabel>
                            <Range
                                min={5}
                                max={60}
                                value={options.secondsPerCard}
                                onSlChange={(e) => {
                                    const value: number =
                                        EventUtil.value(e) ?? options.secondsPerCard;
                                    updateOptions((o) => (o.secondsPerCard = value));
                                }}
                            />
                        </Flex>
                        <Flex>
                            <SettingsLabel>sound delay loop </SettingsLabel>
                            <Range
                                min={3}
                                max={Math.max(options.secondsPerCard, 3)}
                                value={options.soundDelay}
                                onSlChange={(e) =>
                                    updateOptions(
                                        (o) => (o.soundDelay = EventUtil.value(e) ?? o.soundDelay),
                                    )
                                }
                            />
                        </Flex>
                        <Flex>
                            <SettingsLabel>show notification</SettingsLabel>
                            <Checkbox
                                checked={options.notify}
                                onSlChange={(e) =>
                                    updateOptions((o) => (o.notify = EventUtil.isChecked(e)))
                                }
                            ></Checkbox>
                        </Flex>
                    </Flex>
                </CardBox>

                <Details summary="see details">
                    <FactorDetails card={card} except={state.factor} />
                </Details>

                <lt.Row justifyContent={"center"} direction={"column"}>
                    {card.contextHint && <Hint>{card.contextHint}</Hint>}
                    {state.factor &&
                        (state.factor === "text" && randomExample?.length ? (
                            <TestedFactor
                                dangerouslySetInnerHTML={{
                                    __html: marked.parse(randomExample),
                                }}
                            />
                        ) : state.factor === "sound" ? (
                            <AudioPlayer
                                src={card.factorData["sound"] ?? ""}
                                ref={(ref) => (audioPlayer.current = ref)}
                            />
                        ) : (
                            <TestedFactor>{card.factorData[state.factor]}</TestedFactor>
                        ))}

                    <div>
                        {state.factor} ({state.countdown})
                    </div>

                    <br />
                    <Flex>
                        <Button variant="neutral" onClick={onHuh} size="large">
                            next
                        </Button>
                        <Block mx={Shoe.spacing_medium}>??</Block>
                        <Button
                            size="large"
                            variant={Card.isNew(card) ? "success" : "warning"}
                            onClick={() => onAdd(card)}
                        >
                            {Card.isNew(card) ? "study" : "forgot"}
                        </Button>
                    </Flex>
                </lt.Row>
            </Container>
        );
    }

    function FactorDetails({ card, except }: { card: Card; except: string | null }) {
        const factors = Object.keys(Factor).filter((f) => f !== except);
        factors.sort((a, b) => (a === "sound" ? -1 : 0));
        return (
            <FactorDetailsContainer>
                {factors.map((f) => (
                    <div key={f}>
                        {f === "meaning" || f === "text" ? (
                            <div>{card.factorData[f as FactorID]}</div>
                        ) : f === "sound" ? (
                            <AudioPlayer src={card.factorData.sound ?? ""} />
                        ) : null}
                    </div>
                ))}
            </FactorDetailsContainer>
        );
    }
    const FactorDetailsContainer = styled.div`
        display: flex;
        align-items: center;
        justify-content: center;
        div {
            font-size: ${Shoe.font_size_large};
            margin-right: ${Shoe.spacing_small};
        }
    `;

    const Container = styled.div`
        sl-card {
            width: 100%;
            ::part(body) {
                padding: ${Shoe.spacing_small_x};
            }
        }
        sl-details {
            ::part(base) {
                background: inherit;
                border: 0;
            }
        }
    `;
    const SettingsLabel = styled.div`
        &::after {
            content: ":";
        }
        text-align: right;
        margin-right: ${Shoe.spacing_small};
    `;
    const TestedFactor = styled.div`
        font-size: ${Shoe.font_size_2x_large};
        p {
            margin: 0;
        }
    `;
    const Hint = styled.div``;

    function updateNextCard(state: RenderState, cards: Card[]) {
        const { index, options } = state;

        if (index + 1 >= cards.length) cards = shuffle(cards);
        //audioPlayer.current = null;

        let found = false;
        for (let retry = 0; retry < cards.length; retry++) {
            const i = (index + 1) % cards.length;
            const card = cards[i];
            if (!card) continue;

            let factor: FactorID = "meaning";
            if (options.factor === "auto") {
                factor = Card.getRandomFactor(card);
            } else if (card.availableFactors.has(options.factor)) {
                factor = options.factor;
            } else {
                continue;
            }

            state.index = i;
            state.factor = factor;
            state.countdown = state.options.secondsPerCard;
            state.lastSound = 0;

            found = true;
            break;

            //elapsed.current.millis = 0;
            //elapsed.current.lastUpdate = 0;
            //elapsed.current.lastSound = 0;
        }

        if (!found) {
            state.index = -1;
        }
    }

    function tryPlaySound(
        state: RenderState,
        card: Card | null,
        audioPlayer: AudioPlayer$.Control | null,
    ) {
        const { options, factor } = state;

        const now = Date.now();
        if (!card) return;
        if (!audioPlayer) return;

        const text = card.factorData.text ?? card.factorData.meaning;
        if (factor === "sound") {
            if (
                canPlayAudio() &&
                audioPlayer &&
                !audioPlayer.isPlaying() &&
                now - state.lastSound > options.soundDelay * 1000
            ) {
                audioPlayer.play();
                if (card.factorData.text && state.options.notify) {
                    app.Notify("", card.factorData.text);
                }

                state.lastSound = now;
            }
        } else if (text && state.options.notify) {
            if (now - state.lastNotify > 10 * 1000) {
                app.Notify("", text);
                state.lastNotify = now;
            }
        }
        return;
    }
}
export const SequentRecap = memo(SequentRecap$.View);

export namespace UnorderedRecap$ {
    export interface Props {}
    export function View({}: Props) {
        return <Container></Container>;
    }
    const Container = styled.div``;
}
export const UnorderedRecap = UnorderedRecap$.View;
