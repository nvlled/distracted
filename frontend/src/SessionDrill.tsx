import { useRef, useState } from "react";
import styled from "styled-components";
import { Card } from "./card";
import { FactorTrial } from "./factors";

import { Action, OrderedSet, parseZodFromLocalStorage, sleep } from "./lib";

import { ProficiencyTrial } from "./trials";
import * as app from "../wailsjs/go/main/App";
import { TabOutDistraction } from "./distraction";
import { config } from "./config";
import { ShortAlternating } from "./scheduler";
import {
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
import { GrindSettings$ } from "./App";
import { useChanged, useOnMount, useInterval } from "./hooks";
import { z } from "zod";
import { Keybind, Space } from "./components";
import { getCardByID } from "./loadedCards";
import { Notes } from "./Notes";
import { Flipper, Flipper$ } from "./Flipper";

namespace GrindStudySession$ {
    export interface Props {
        sessionName: string;
        initCardIDs: number[];
        onQuit: Action;
        onAddMoreCards?: Action;
    }
    export function View(props: Props) {
        const { initCardIDs, onQuit } = props;
        const [actions] = useAtom(appState.actions);
        const [loadedCardsVersion] = useAtom(appState.loadedCardsVersion);
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
            changingCard: false,

            batchSize: 10,
            studyBatchDuration: options.studyBatchDuration,
            breakTimeDuration: options.breakTimeDuration,
            numBreaks: 0,
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
            const currentCard = OrderedSet.get(cards, cardID);
            if (!currentCard) return;

            if (refs.changingCard) return;
            refs.changingCard = true;

            await flipper.current?.reset();
            await flipper.current?.flipOut();

            const elapsed = Math.min(refs.secondsElapsed, 60 * 5);
            const updatedCard = await studyCard(refs.counter, currentCard, trial, recalled);
            const updatedCards = cards.map((c: Card) =>
                c.path !== updatedCard.path ? c : updatedCard,
            );

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
                } else {
                    console.log("no next card");
                }
                refs.counter = nextCounter;
            } else {
                onBreakTime();
            }

            await sleep(50);
            await flipper.current?.flipIn();
            setLoading(false);
            refs.changingCard = false;
        }

        function onBreakTime() {
            setBreakTime(true);
            refs.cardsReviewed = 0;

            updateDurations(options);

            refs.batchNum++;
            refs.numBreaks++;
        }

        function updateDurations(options: GrindSettings$.Options.T) {
            if (options.autoAdjust) {
                const { batchNum, studyBatchDuration, breakTimeDuration, numBreaks } = refs;
                const o = options;
                refs.studyBatchDuration = blah(
                    numBreaks,
                    studyBatchDuration,
                    o.studyBatchDuration * 0.75,
                );
                refs.breakTimeDuration = blah(
                    numBreaks,
                    breakTimeDuration,
                    o.breakTimeDuration / 2,
                );
                GrindSettings$.Options.save({
                    autoAdjust: o.autoAdjust,
                    breakTimeDuration: refs.breakTimeDuration,
                    studyBatchDuration: refs.studyBatchDuration,
                });
            }
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

        function onUpdateSettings(options: GrindSettings$.Options.T) {
            setOptions(options);
            refs.breakTimeDuration = options.breakTimeDuration;
            refs.studyBatchDuration = options.studyBatchDuration;
            updateDurations(options);
        }

        const initialize = function () {
            const savedState = PersistentState.load();
            if (savedState && savedState.date == config().currentDate) {
                refs.counter = savedState.counter;
                refs.batchNum = savedState.batchNum;
            }

            const cards = initCardIDs.map((id) => getCardByID(id));
            setCards(cards);

            const { item: card, nextCounter } = ShortAlternating.nextDue(
                refs.counter,
                refs.batchSize,
                cards,
            );
            if (card) {
                console.log({ card }, config().currentDate);
                setCardID(card.id);
            }

            refs.counter = nextCounter;
            refs.batchSize = Math.min(refs.batchSize, initCardIDs.length);
        };

        useOnMount(initialize);

        useInterval(1000, () => {
            if (document.hasFocus()) {
                refs.secondsElapsed++;
            }
        });

        if (useChanged(loadedCardsVersion)) {
            setCards(cards.map((c) => getCardByID(c.id)));
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
                            key={currentCard.id}
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
                <Container isLoading={loading} ref={containerRef}>
                    <Flex>
                        <Buttons>
                            <Tooltip content="double-click to return" placement="bottom">
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
                            <Button onClick={() => actions.showGrindSettings(onUpdateSettings)}>
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

    namespace PersistentState {
        export const schema = z.object({
            date: z.number(),
            counter: z.number(),
            batchNum: z.number(),
            elapsed: z.number(),
        });
        type T = z.infer<typeof schema>;

        export const defaultVal: T = {
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

    async function studyCard(counter: number, card: Card, trial: FactorTrial, recalled: boolean) {
        card = ShortAlternating.studyCard(card, trial, recalled);
        card.lastUpdate = Math.floor(Date.now() / 1000);
        card.counter = counter;
        if (recalled) {
            card.lastRecallDate = config().currentDate;
        }

        await app.PersistCardStats(card);

        return card;
    }

    function blah(phase: number, x: number, size: number) {
        const x_ = x + Math.sin(phase / size) * size;
        return Math.max(x_, 1);
    }
}

export const GrindStudySession = GrindStudySession$.View;

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
                <Keybind keyName="Enter">
                    <Button onClick={onSubmit}>got it</Button>
                </Keybind>
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
