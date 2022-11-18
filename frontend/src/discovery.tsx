import { marked } from "marked";
import { useAtom } from "jotai";
import { memo, ReactNode, useRef, useState } from "react";
import styled from "styled-components";
import { app, main } from "./api";
import { Card } from "./card";
import { Factor, FactorID, Factors } from "./factors";
import { Block, Flex, lt } from "./layout";
import {
    parseZodFromLocalStorage,
    partition,
    randomElem,
    setToArray,
    shuffle,
    tryJSONParse,
} from "./lib";
import { appState } from "./state";
import { AudioPlayer, AudioPlayer$ } from "./AudioPlayer";
import {
    Badge,
    Button,
    CardBox,
    Checkbox,
    EventUtil,
    Icon,
    Range,
    Shoe,
    Tag,
    Tooltip,
    Animation,
    Divider,
} from "./shoelace";
import { z } from "zod";
import { produce, enableMapSet } from "immer";
import { canPlayAudio, DeckAudio } from "./DeckAudio";
import { Keybind, Space } from "./components";
import { config } from "./config";
import { CardFilter$ } from "./playground";
import { useChanged, useDrillCards, useOnMount, usePreviousSessionIDs, useInterval } from "./hooks";
import { Flipper, Flipper$ } from "./Flipper";
import { iterate as iterateLoadedCards } from "./loadedCards";

enableMapSet();

function CardInfo({ card }: { card: Card }) {
    return (
        <Block inline>
            <Flex mx={Shoe.spacing_small_2x} cml={Shoe.spacing_small_2x}>
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
                <div>
                    <Tooltip content="proficiency">
                        <Badge variant="primary" pill>
                            {Factors.getAverage(card.proficiency)}
                        </Badge>
                    </Tooltip>
                </div>
            </Flex>
        </Block>
    );
}

export namespace SequentRecap$ {
    namespace DeferredCards {
        const lsKey = "sequent-deferred-cards";
        export const schema = z.object({
            cardIDs: z.array(z.number()),
            date: z.number(),
        });
        export type T = z.infer<typeof schema>;

        export function createDefault(): T {
            return {
                cardIDs: [],
                date: config().currentDate,
            };
        }

        export function load(): T {
            const defaultValue = createDefault();
            const val = parseZodFromLocalStorage(schema, lsKey) ?? defaultValue;
            if (val.date != config().currentDate) {
                return defaultValue;
            }
            return val;
        }
        export function save(val: T) {
            localStorage.setItem(lsKey, JSON.stringify(val));
        }
    }

    namespace Options {
        const lsKey = "sequent-recap";

        export const schema = z.object({
            factor: z.enum(["meaning", "sound", "text", "auto"]),
            notify: z.boolean(),
            secondsPerCard: z.number().min(5),
            autoplaySound: z.boolean(),
            soundDelay: z.number().min(3),
            notifyDelay: z.number().min(10),
        });

        export type T = z.infer<typeof schema>;

        export const defaultOptions: T = Object.freeze({
            factor: "auto",
            notify: false,
            autoplaySound: true,
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

    const defaultRenderState = {
        index: -1,
        running: true,
        currentCard: null as Card | null,
        factor: null as FactorID | null,
        countdown: 10,
        showSettings: false,
        showDetails: false,
        options: Options.defaultOptions,
        deferredCards: new Set<number>([]),
        lastNotify: 0,
        lastSound: 0,
        lastChange: 0,
        lastShown: {} as Record<string, number | undefined>,
        addedCards: {} as Record<number, boolean>,
    };
    type RenderState = typeof defaultRenderState;

    type FactorFilter = FactorID | "auto";

    export interface Props {
        filter: CardFilter$.Options;
    }
    export function View({ filter }: Props) {
        const [actions] = useAtom(appState.actions);
        const [drillCards, setDrillCards] = useDrillCards();
        const [state, setState] = useState<RenderState>(defaultRenderState);
        const [filteredCards, setFilteredCards] = useState<main.CardData[]>([]);

        const flipper = useRef<Flipper$.Control | null>(null);
        const audioPlayer = useRef<AudioPlayer$.Control | null>(null);
        const previousIDs = usePreviousSessionIDs();

        type UpdateFn = (arg: RenderState) => void | unknown;
        type UpdateOptionsFn = (arg: Options.T) => void | unknown;

        function update(fn: UpdateFn, currentState?: RenderState) {
            const newState = produce(currentState ?? state, (draft) => {
                fn(draft);
            });
            setState(newState);
            return newState;
        }

        function updateOptions(fn: UpdateOptionsFn) {
            const nextState = update((s) => {
                s.countdown = s.options.secondsPerCard;
                fn(s.options);
            });

            Options.save(nextState.options);

            return state;
        }

        function onNextCard($state: RenderState) {
            DeckAudio.stop();
            $state.lastSound = 0;
            updateNextCard($state, filteredCards);
        }

        async function onHuh(card: Card | null) {
            await flipper.current?.flipOut();
            update((s) => {
                if (card) {
                    s.deferredCards.add(card.id);
                    DeferredCards.save({
                        cardIDs: setToArray(s.deferredCards),
                        date: config().currentDate,
                    });
                }
                onNextCard(s);
            });
            await flipper.current?.flipIn();
        }

        async function onAdd(card: Card | null) {
            if (!card) return;

            await flipper.current?.flipOut();
            if (!drillCards.find((c) => c.id === card.id)) {
                setDrillCards(drillCards.concat(card));
            }

            update(($state) => {
                $state.addedCards[card.id] = true;
                onNextCard($state);
            });
            await flipper.current?.flipIn();
        }

        function onLearnCard(card: Card) {
            if (card.numForget + card.numRecall > 0) return;
            const updated: Card = {
                ...card,
                numRecall: 1,
                numForget: 1,
            };
            actions.updateCardStat(updated);
            update((s) => (s.currentCard = updated));
        }

        useInterval(1000, () => {
            const now = Date.now();
            if (now - state.lastChange < 1000) {
                return;
            }

            update(($state) => {
                const n = $state.countdown;
                $state.countdown = n > 0 ? n - 1 : 0;
                const card = state.currentCard;
                tryPlaySound($state, card, audioPlayer.current);

                if ($state.countdown === 0) {
                    $state.countdown = $state.options.secondsPerCard;
                    updateNextCard($state, filteredCards);
                }
            });
        });

        function refresh() {
            DeferredCards.save(DeferredCards.createDefault());
            initialize();
        }
        function initialize() {
            const deferred = DeferredCards.load();
            const deferredSet = new Set(deferred.cardIDs);

            console.log("initializing state");
            let rawCards = filter ? CardFilter$.filterCards(iterateLoadedCards(), filter) : [];
            rawCards = shuffleCards(rawCards, previousIDs);
            setFilteredCards(rawCards);

            update(($state) => {
                for (const c of drillCards) {
                    $state.addedCards[c.id] = true;
                }

                const options = Options.load();
                $state.options = options;
                $state.index = -1;
                $state.deferredCards = deferredSet;

                updateNextCard($state, rawCards);
            });
        }

        useOnMount(initialize);

        if (useChanged(filter)) {
            initialize();
        }

        const card = state.currentCard;
        if (!card || filteredCards.length === 0) {
            return (
                <Container>
                    No more cards for recap. If you need to add more:
                    <ul>
                        <li>change filter settings</li>
                        <li>create more card files</li>
                        <li>
                            press
                            <span>
                                <Space />
                                <Icon name="arrow-clockwise" />
                            </span>
                            refresh to view again the cards you skipped with "next"
                        </li>
                    </ul>
                </Container>
            );
        }

        const randomExample = randomElem(card.examples);
        const options = state.options;

        if (!state.running) {
            return (
                <Container>
                    <Flex justifyContent={"center"} direction="column">
                        <Block p={Shoe.spacing_large_x}>
                            <Icon name="info-circle" />
                            <Space />
                            Pick cards to study for the day.
                            <br />
                            <br />
                            Use this to find cards that you may have forgotten, or discover new
                            cards to learn. It's recommended that you add as many card as you can,
                            even if you don't manage or plan to study them within the day. The
                            algorithm will adjust the difficulty for you, and more cards results to
                            better spacing.
                            <br />
                            <br />
                            Of course, it's still up to you how you prefer to study.
                        </Block>
                        <Button onClick={() => update((s) => (s.running = true))}>okay</Button>
                    </Flex>
                </Container>
            );
        }

        return (
            <Container>
                <CardBox>
                    <Flex justifyContent={"space-between"}>
                        <div>
                            <small>{(state.index % filteredCards.length) + 1}</small>.
                            <CardInfo card={card} />
                        </div>
                        <Block cml={Shoe.spacing_small_2x}>
                            <Button size="small" onClick={() => update((s) => (s.running = false))}>
                                stop
                            </Button>
                            <Tooltip content="refresh">
                                <Button onClick={() => refresh()} size="small">
                                    <Icon slot="prefix" name="arrow-clockwise" />
                                </Button>
                            </Tooltip>
                            <Button
                                onClick={() => update((s) => (s.showSettings = !s.showSettings))}
                                size="small"
                            >
                                <Icon slot="prefix" name="gear-wide" />
                            </Button>
                        </Block>
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
                            <SettingsLabel>show notification</SettingsLabel>
                            <Checkbox
                                checked={options.notify}
                                onSlChange={(e) =>
                                    updateOptions((o) => (o.notify = EventUtil.isChecked(e)))
                                }
                            ></Checkbox>
                        </Flex>

                        <Block b={"1px"} p={Shoe.spacing_medium}>
                            <Flex>
                                <SettingsLabel>auto-play sound</SettingsLabel>
                                <Checkbox
                                    checked={options.autoplaySound}
                                    onSlChange={(e) =>
                                        updateOptions(
                                            (o) => (o.autoplaySound = EventUtil.isChecked(e)),
                                        )
                                    }
                                ></Checkbox>
                            </Flex>
                            <Flex>
                                <SettingsLabel>sound delay loop </SettingsLabel>
                                <Range
                                    min={3}
                                    max={Math.max(options.secondsPerCard, 3)}
                                    value={options.soundDelay}
                                    disabled={!options.autoplaySound}
                                    onSlChange={(e) =>
                                        updateOptions(
                                            (o) =>
                                                (o.soundDelay = EventUtil.value(e) ?? o.soundDelay),
                                        )
                                    }
                                />
                            </Flex>
                        </Block>
                    </Flex>
                </CardBox>

                <br />
                <br />
                {state.showDetails && (
                    <Block>
                        <FactorDetails card={card} except={state.factor} />
                        <Divider />
                    </Block>
                )}

                <lt.Row justifyContent={"center"} direction={"column"}>
                    <Flipper
                        ref={flipper}
                        rate={2.0}
                        inAnimation="bounceIn"
                        outAnimation="bounceOut"
                    >
                        <Flex direction="column">
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
                        </Flex>
                    </Flipper>

                    <br />
                    <Keybind keyName="ArrowUp">
                        <Button
                            size="small"
                            outline
                            onClick={() => update((s) => (s.showDetails = !s.showDetails))}
                        >
                            ↑ {state.showDetails ? "hide" : "show"} details
                        </Button>
                    </Keybind>
                    <Flex>
                        <Keybind keyName="ArrowLeft" placement="bottom">
                            <Button
                                size="medium"
                                variant={Card.isNew(card) ? "success" : "warning"}
                                onClick={() => onAdd(card)}
                            >
                                <Icon name="arrow-left" />
                                {Card.isNew(card) ? "study" : "forgot"}
                            </Button>
                        </Keybind>
                        <Block mx={Shoe.spacing_medium}>??</Block>
                        <Keybind keyName="ArrowRight">
                            <Button variant="neutral" onClick={() => onHuh(card)} size="medium">
                                next <Icon name="arrow-right" />
                            </Button>
                        </Keybind>
                    </Flex>
                    {Card.isNew(card) && (
                        <Keybind keyName="ArrowDown">
                            <Button outline size="small" onClick={() => onLearnCard(card)}>
                                ↓ mark as reviewing
                            </Button>
                        </Keybind>
                    )}
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

    function shuffleCards(cards: main.CardData[], previousIDs: Set<number>) {
        const [recent, others] = partition(cards, (c) => {
            return previousIDs.has(c.id);
        });
        others.sort((a, b) => a.lastUpdate - b.lastUpdate);

        return shuffle(recent).concat(shuffle(others));
    }

    function updateNextCard(state: RenderState, cards: main.CardData[]) {
        if (Object.keys(state.lastShown).length >= pickSettings.bufferSize) {
            const now = Date.now();
            for (const [cardID, time] of Object.entries(state.lastShown)) {
                if (!time || now - time > pickSettings.cardShownDelay) {
                    delete state.lastShown[cardID];
                }
            }
        }

        const result = findNextCard(state, cards);

        if (!result) {
            state.index = -1;
            state.currentCard = null;
        } else {
            const { card, index: nextIndex, factor } = result;
            console.log(state.currentCard?.filename, "->", card.filename);

            state.index = nextIndex;
            state.factor = factor;
            state.countdown = state.options.secondsPerCard;
            state.lastSound = 0;
            state.currentCard = card;
            state.lastShown[card.id] = Date.now();
        }
        state.lastChange = Date.now();
    }

    type findNextCardResult = {
        card: Card;
        index: number;
        factor: FactorID;
    };
    function findNextCard(state: RenderState, cards: main.CardData[]): findNextCardResult | null {
        const { index, options } = state;
        let result: findNextCardResult | null = null;

        for (let n = 1; n <= cards.length; n++) {
            const i = index + n;
            const card = Card.parse(cards[i % cards.length]);

            if (!card) continue;
            if (state.addedCards[card.id]) continue;
            if (state.deferredCards.has(card.id)) continue;
            if (card.id === state.currentCard?.id) continue;

            let factor: FactorID = "meaning";
            if (options.factor === "auto") {
                factor = Card.getRandomFactor(card);
            } else if (card.availableFactors.has(options.factor)) {
                factor = options.factor;
            } else {
                continue;
            }

            const ret = { card, factor, index: i };
            if (!result) result = ret;

            const lastShown = state.lastShown[card.id];
            if (lastShown) {
                const now = Date.now();
                if (now - lastShown < pickSettings.cardShownDelay) {
                    continue;
                }
            }

            return ret;
        }
        // if all cards are already shown,
        // return the first matching card anyway

        return result;
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
                state.options.autoplaySound &&
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

    const pickSettings = {
        cardShownDelay: 10 * 60 * 1000,
        bufferSize: 500,
    };
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

function AnimateOnClick({
    name = "rubberBand",
    duration = 1000,
    children,
}: {
    duration?: number;
    name?: string;
    children: ReactNode;
}) {
    const [play, setPlay] = useState(false);
    return (
        <Animation
            iterations={1}
            duration={duration}
            name={name}
            play={play}
            onSlFinish={() => setPlay(false)}
            onClick={() => {
                setPlay(true);
            }}
        >
            {children}
        </Animation>
    );
}
