import { memo, useCallback, useEffect, useRef, useState } from "react";
import styled, { css } from "styled-components";
import { main } from "../wailsjs/go/models";
import { Card } from "./card";
import { FactorTrial } from "./factors";

import {
    Action,
    currentDate,
    hasProp,
    LocalStorageSerializer,
    OrderedSet,
    parseZodFromLocalStorage,
    sleep,
    useAsyncEffect,
    useAsyncEffectUnmount,
    useCardWatch,
    useInterval,
} from "./lib";

import { ProficiencyTrial } from "./trials";
import * as app from "../wailsjs/go/main/App";
import { TabOutDistraction } from "./distraction";
import { AudioPlayer } from "./AudioPlayer";
import { config } from "./config";
import { ShortAlternating } from "./scheduler";
import ReactMarkdown from "react-markdown";
import {
    Alert,
    Button,
    ButtonGroup,
    Divider,
    Drawer,
    Icon,
    Shoe,
    Textarea,
    TextareaRef,
    Tooltip,
} from "./shoelace";
import { Block, Flex } from "./layout";
import { appState } from "./state";
import { useAtom } from "jotai";
import { Flipper, Flipper$, GrindSettings$ } from "./App";
import { useChanged, useOnMount } from "./hooks";
import { z } from "zod";
import { Space } from "./components";

const distractionSeconds = 1.0 * 60;
const batchSize = 7;

namespace _GrindStudySession {
    export interface Props {
        sessionName: string;
        initCards: Card[];
        onQuit: Action;
        onAddMoreCards?: Action;
    }
    export function View(props: Props) {
        const { initCards, onQuit } = props;
        const [actions] = useAtom(appState.actions);
        const [remind, setRemind] = useState(true);
        const [cards, setCards] = useState<Card[]>([]);
        const [breakTime, setBreakTime] = useState(false);
        const [cardID, setCardID] = useState<number | undefined>();
        const [loading, setLoading] = useState(false);
        const [showActions, setShowActions] = useState(false);
        const [options, setOptions] = useState(GrindSettings$.Options.current);
        const flipper = useRef<Flipper$.Control | null>(null);

        const containerRef = useRef<HTMLDivElement>(null);

        const { current: refs } = useRef({
            batchNum: 0,
            counter: 0,
            cardsReviewed: 0,
            secondsElapsed: 0,

            batchSize: batchSize,
            studyBatchDuration: options.studyBatchDuration,
            breakTimeDuration: options.breakTimeDuration,
        });

        function onReturn() {
            setBreakTime(false);
            const { item: card, nextCounter } = ShortAlternating.nextDue(
                refs.counter,
                refs.batchSize,
                cards,
            );
            if (card) setCardID(card.id);
            flipper.current?.flipIn();
            refs.secondsElapsed = 0;
            refs.counter = nextCounter;
        }

        async function onSubmit(recalled: boolean, trial: FactorTrial) {
            //await waitAnimation(() => setLoading(true));
            await flipper.current?.reset();
            await flipper.current?.flipOut();

            const currentCard = OrderedSet.get(cards, cardID);
            if (!currentCard) return;

            const elapsed = Math.min(refs.secondsElapsed, 60 * 5);
            const updatedCard = await studyCard(refs.counter, currentCard, trial, recalled);
            const updatedCards = cards.map((c: Card) =>
                c.path !== updatedCard.path ? c : updatedCard,
            );

            //refs.state.elapsed = elapsed;
            //refs.state.cardStatsMap = getCardStats(updatedCards);

            setCards(updatedCards);

            PersistentState.save({
                counter: refs.counter,
                batchNum: refs.batchNum,
                date: config().currentDate,
                elapsed: refs.secondsElapsed,
            });

            if (refs.secondsElapsed < refs.studyBatchDuration * 60) {
                const { item: nextCard, nextCounter } = ShortAlternating.nextDue(
                    refs.counter,
                    refs.batchSize,
                    updatedCards,
                    currentCard.id,
                );
                if (nextCard) {
                    setCardID(nextCard.id);
                    console.log("card", currentCard.filename, "->", nextCard.filename);
                } else {
                    console.log("no next card");
                }
                refs.counter = nextCounter;
            } else {
                onBreakTime();
            }

            await sleep(100);
            await flipper.current?.flipIn();
            setLoading(false);
        }

        function onBreakTime() {
            setBreakTime(true);
            refs.cardsReviewed = 0;

            if (refs.batchSize < 20) {
                refs.batchSize += 0.3;
            }
            if (options.autoAdjust) {
                const { batchNum, studyBatchDuration, breakTimeDuration } = refs;
                const o = options;
                refs.studyBatchDuration = blah(batchNum, studyBatchDuration, o.studyBatchDuration);
                refs.breakTimeDuration = blah(batchNum, breakTimeDuration, o.breakTimeDuration);
            }
            refs.batchNum++;
        }

        function onEditCard() {
            const card = OrderedSet.get(cards, cardID);
            if (!card) return;
            app.OpenCardFile(card.path);
            actions.toastInfo(`opened card file:<br />${card.path}`, { variant: "success" });
            setShowActions(false);
        }
        function onRemoveCard() {
            const card = OrderedSet.get(cards, cardID);
            if (!card) return;
            actions.toastInfo(`removed from today's study:<br />${card.path}`, {
                variant: "warning",
            });
            setShowActions(false);

            actions.removeDrillCard(card.id);
            const updatedCards = cards.filter((c) => c.id !== card.id);

            const { item: nextCard, nextCounter } = ShortAlternating.nextDue(
                refs.counter,
                refs.batchSize,
                updatedCards,
            );

            setCards(updatedCards);
            refs.counter = nextCounter;
            if (nextCard) setCardID(nextCard.id);
        }

        const initialize = function () {
            //const state = (refs.state = SerializedState.load());
            const savedState = PersistentState.load();
            if (savedState && savedState.date == config().currentDate) {
                console.log({ savedState });
                refs.counter = savedState.counter;
                refs.batchNum = savedState.batchNum;
                //refs.secondsElapsed = savedState.elapsed;
            }

            setCards(initCards);

            const { item: card, nextCounter } = ShortAlternating.nextDue(
                refs.counter,
                refs.batchSize,
                initCards,
            );
            if (card) {
                setCardID(card.id);
            }

            refs.counter = nextCounter;
            refs.batchSize = Math.min(refs.batchSize, initCards.length);
        };

        useOnMount(initialize);

        useInterval(1000, () => {
            if (document.hasFocus()) {
                refs.secondsElapsed++;
            }
        });

        {
            const newOptions = GrindSettings$.Options.current;
            if (useChanged(newOptions)) {
                setOptions(newOptions);
                refs.studyBatchDuration = newOptions.studyBatchDuration;
                refs.breakTimeDuration = newOptions.breakTimeDuration;
            }
        }

        const currentCard = OrderedSet.get(cards, cardID);
        let body = <div />;
        if (remind) {
            body = <Reminders onSubmit={() => setRemind(false)} />;
        } else if (currentCard) {
            body = (
                <>
                    {breakTime && (
                        <TabOutDistraction
                            key={currentCard.id}
                            seconds={refs.breakTimeDuration * 60}
                            onReturn={onReturn}
                        />
                    )}
                    {!breakTime && (
                        <ProficiencyTrial
                            card={currentCard}
                            otherCards={cards}
                            onSubmit={onSubmit}
                        />
                    )}
                </>
            );
        } else if (!cards.length) {
            body = (
                <>
                    no cards in collection <button onClick={onQuit}>return</button>
                </>
            );
        }

        return (
            <div>
                <small style={{ textAlign: "center" }}>
                    study time: {refs.studyBatchDuration.toFixed(2)}
                    <Space />
                    |
                    <Space />
                    break time: {refs.breakTimeDuration.toFixed(2)}
                </small>
                <Container isLoading={loading} ref={containerRef}>
                    <Flex>
                        <Buttons>
                            <Tooltip content="double-click to return">
                                <Button onDoubleClick={() => actions.changePage("home")}>
                                    <Icon slot="prefix" name="house" /> Main
                                </Button>
                            </Tooltip>
                            {currentCard && (
                                <Button onClick={() => setShowActions(true)}>
                                    <Icon slot="prefix" name="card-text" /> Card
                                </Button>
                            )}
                            <Button>
                                <Icon slot="prefix" name="pencil-square" /> Queue
                            </Button>
                            <Button
                                onClick={() =>
                                    actions.setDrawer(
                                        { title: "notes", keepOpen: true, width: "35vw" },
                                        <Notes />,
                                    )
                                }
                            >
                                <Icon slot="prefix" name="pencil-square" /> Notes
                            </Button>
                            <Button onClick={() => actions.showGrindSettings()}>
                                <Icon slot="prefix" name="gear" /> Settings
                            </Button>
                        </Buttons>
                    </Flex>
                    <CardActions
                        label={currentCard?.filename}
                        show={showActions}
                        onRemove={onRemoveCard}
                        onEdit={onEditCard}
                        onClose={() => setShowActions(false)}
                    />
                    <br />
                    <Flipper ref={flipper} rate={1.5}>
                        {body}
                    </Flipper>
                </Container>
            </div>
        );
    }
    const Buttons = styled(ButtonGroup)`
        display: flex;
        justify-content: start;
        width: 100%;
    `;

    export const Container = styled.div<{ isLoading: boolean }>`
        padding: ${Shoe.spacing_small};
        position: relative;
        /*transition: top 0.3s;*/
        top: ${(props) => (props.isLoading ? "-100vh" : "0")};
        min-height: 50vh;
    `;
    export const Ready = styled.div`
        position: absolute;
        top: 0;
        height: 0;
        width: 100%;
        height: 100%;
        background: #000a;
        display: flex;
        align-items: center;
        justify-content: center;
    `;

    type CardStatsMap = Record<number, main.CardStats | undefined>;

    /*
    function getCardStats(cards: Card[]) {
        return cards.reduce((result, card) => {
            result[card.id] = {
                proficiency: card.proficiency,
                consecForget: card.consecForget,
                consecRecall: card.consecRecall,
                interval: card.interval,
                lastUpdate: card.lastUpdate,
                numForget: card.numForget,
                numRecall: card.numRecall,
            };
            return result;
        }, {} as CardStatsMap);
    }
    */

    namespace PersistentState {
        export const schema = z.object({
            date: z.number(),
            counter: z.number(),
            batchNum: z.number(),
            elapsed: z.number(),
        });
        type T = z.infer<typeof schema>;
        const defaultVal: T = {
            date: config().currentDate,
            counter: 0,
            batchNum: 0,
            elapsed: 0,
        };
        const lsKey = "grind-session-state";
        export function load(): T | null {
            return parseZodFromLocalStorage(schema, lsKey);
        }
        export function save(state: T) {
            localStorage.setItem(lsKey, JSON.stringify(state));
        }
    }

    /*
    namespace SessionState {
        const statsSchema = z.object({
            interval: z.number(),
            proficiency: z.number(),
            numRecall: z.number(),
            numForget: z.number(),
            consecRecall: z.number(),
            consecForget: z.number(),
            lastUpdate: z.number(),
        });
        export const schema = z.object({
            date: z.number(),
            counter: z.number(),
            elapsed: z.number(),
            cardStatsMap: z.record(z.number(), statsSchema),
        });
        type T = z.infer<typeof schema>;
        const defaultVal: T = {
            date: config().currentDate,
            counter: 0,
            elapsed: 0,
            cardStatsMap: {},
        };
        const typeCheck: Record<number, main.CardStats> = defaultVal.cardStatsMap;
    }

    // wait, I don't think I'm even using this anymore since
    // I persisted the state now on the db?
    namespace SerializedState {
        export const defaultState = () => ({
            date: config().currentDate,
            counter: 0,
            elapsed: 0,
            cardStatsMap: {} as CardStatsMap,
        });
        type T = ReturnType<typeof defaultState>;

        const serializer = new LocalStorageSerializer(
            defaultState(),
            "grind-study-session",
            isValidState,
        );
        function isValidState(obj: unknown): obj is T {
            if (typeof obj !== "object") return false;
            if (obj == null) return false;
            if (!hasProp(obj, "date", "number")) return false;
            if (!hasProp(obj, "counter", "number")) return false;
            if (!hasProp(obj, "cardStatsMap", "object")) return false;

            return true;
        }
        export function load() {
            const state = serializer.load();
            return state;
        }
        export function save(state: T) {
            serializer.save(state);
        }
    }
    */

    async function studyCard(counter: number, card: Card, trial: FactorTrial, recalled: boolean) {
        card = ShortAlternating.studyCard(card, trial, recalled);
        card.lastUpdate = Math.floor(Date.now() / 1000);
        card.counter = counter;
        await app.PersistCardStats(card);

        return card;
    }

    function blah(phase: number, x: number, size: number) {
        const x_ = x + Math.sin(phase / size / 2) * size * 2;
        return Math.max(x_, 1);
    }
}

export const GrindStudySession = _GrindStudySession.View;

function Reminders({ onSubmit }: { onSubmit: Action }) {
    return (
        <div>
            <div>Friendly reminders</div>
            <ul>
                <li>keep calm, and avoid being tense or anxious</li>
                <li>try to remember, but don&apos;t think too hard</li>
                <li>don&apos;t fret if you forget, the more you forget, the better</li>
                <li>stop if you feel symptoms of fatigue</li>
            </ul>

            <div>
                <button onClick={onSubmit}>got it</button>
            </div>
        </div>
    );
}

export namespace CardActions$ {
    export interface Props {
        label?: string;
        show: boolean;
        onEdit: Action;
        onRemove: Action;
        onClose: Action;
    }
    export function View({ label, show, onClose, onEdit, onRemove }: Props) {
        return (
            <Container>
                <Drawer
                    label={label ?? "card actions"}
                    open={show}
                    placement="top"
                    onSlAfterHide={onClose}
                    contained
                >
                    <Block>
                        <Button onClick={onRemove}>Remove</Button>
                        <Space />
                        Remove card from today's study. This will not delete the card.
                        <Divider />
                        <Button onClick={onEdit}>Edit</Button>
                        <Space />
                        Edit the card file.
                    </Block>
                </Drawer>
            </Container>
        );
    }
    const Container = styled.div``;
}
export const CardActions = CardActions$.View;

export namespace Notes$ {
    export interface Props {}
    export function View({}: Props) {
        const ref = useRef<TextareaRef>(null);

        useAsyncEffectUnmount(async () => {
            const textarea = ref.current;
            if (textarea) textarea.value = await app.GetNotes();

            return () => {
                if (textarea) {
                    console.log("saving");
                    app.SaveNotes(textarea.value);
                }
            };
        });

        return (
            <Container>
                <Textarea ref={ref} autofocus />
            </Container>
        );
    }
    const Container = styled.div`
        &,
        textarea {
            height: 100%;
        }
        sl-textarea {
            &,
            ::part(form-control),
            ::part(form-control-input),
            ::part(base),
            ::part(textarea) {
                height: 100%;
            }
        }
    `;
}
export const Notes = Notes$.View;

// TODO:
export namespace CardListEditor$ {
    export interface Props {}
    export function View({}: Props) {
        return <Container></Container>;
    }
    const Container = styled.div``;
}
export const CardListEditor = CardListEditor$.View;
