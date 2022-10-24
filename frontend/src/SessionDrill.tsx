export {};

import { memo, useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { main } from "../wailsjs/go/models";
import { Card } from "./card";
import { FactorTrial } from "./factors";

import {
    Action,
    currentDate,
    hasProp,
    LocalStorageSerializer,
    OrderedSet,
    sleep,
    useCardWatch,
} from "./lib";

import { ProficiencyTrial } from "./trials";
import * as app from "../wailsjs/go/main/App";
import { TabOutDistraction } from "./distraction";
import { AudioPlayer } from "./AudioPlayer";
import { config } from "./config";
import { ShortAlternating } from "./scheduler";
import ReactMarkdown from "react-markdown";

const distractionSeconds = 1.0 * 60;
const batchSize = 7;
//

namespace _GrindStudySession {
    export interface Props {
        sessionName: string;
        initCards: Card[];
        onQuit: Action;
        onAddMoreCards?: Action;
    }
    export function View(props: Props) {
        const { initCards, onQuit } = props;
        const [remind, setRemind] = useState(true);
        const [cards, setCards] = useState<Card[]>([]);
        const [breakTime, setBreakTime] = useState(false);
        const [cardID, setCardID] = useState<number | undefined>();
        const [loading, setLoading] = useState(false);

        const containerRef = useRef<HTMLDivElement>(null);

        const { current: refs } = useRef({
            state: SerializedState.defaultState(),
            cardsReviewed: 0,
            initialized: false,
            secondsElapsed: 0,

            timer: 0 as number | undefined,
            batchSize: batchSize,
            breakTimeDuration: distractionSeconds,
        });

        function onReturn() {
            setBreakTime(false);
            const { item: card, nextCounter } = ShortAlternating.nextDue(
                refs.state.counter,
                refs.batchSize,
                cards,
            );
            if (card) setCardID(card.id);
            refs.secondsElapsed = 0;
            refs.state.counter = nextCounter;
        }
        function waitAnimation(body: Action) {
            return new Promise<void>((resolve) => {
                const div = containerRef.current;
                if (!div) {
                    return resolve();
                }
                const f = () => {
                    div.removeEventListener("transitionend", f);
                    div.removeEventListener("transitioncancel", f);
                    sleep(256).then(resolve);
                };
                div.addEventListener("transitionend", f);
                div.addEventListener("transitioncancel", f);
                body();
            });
        }

        async function onSubmit(recalled: boolean, trial: FactorTrial) {
            await waitAnimation(() => setLoading(true));

            const currentCard = OrderedSet.get(cards, cardID);
            if (!currentCard) return;

            const elapsed = Math.min(refs.secondsElapsed, 60 * 5);
            const updatedCard = await studyCard(currentCard, trial, recalled);
            const updatedCards = cards.map((c: Card) =>
                c.path !== updatedCard.path ? c : updatedCard,
            );

            console.log({ updatedCard });
            refs.state.elapsed = elapsed;
            refs.state.cardStatsMap = getCardStats(updatedCards);

            SerializedState.save(refs.state);
            setCards(updatedCards);

            if (refs.cardsReviewed++ < Math.min(refs.batchSize, cards.length)) {
                const { item: card, nextCounter } = ShortAlternating.nextDue(
                    refs.state.counter,
                    refs.batchSize,
                    updatedCards,
                );
                console.log("next card", card?.id);
                if (card) setCardID(card.id);
                refs.state.counter = nextCounter;
            } else {
                setCardID(updatedCard.id);
                setBreakTime(true);
                refs.cardsReviewed = 0;

                if (refs.batchSize < 20) {
                    refs.batchSize += 0.3;
                }
                refs.breakTimeDuration += 5;
            }

            setLoading(false);
        }

        const init = useCallback(
            function (cards: Card[]) {
                const state = (refs.state = SerializedState.load());

                cards = cards.map((c) => {
                    const stats = state.cardStatsMap[c.id];
                    if (stats) c = { ...c, ...stats };
                    return c;
                });

                setCards(cards);

                const { item: card, nextCounter } = ShortAlternating.nextDue(
                    state.counter,
                    refs.batchSize,
                    cards,
                );
                console.log("current card>", card);
                if (card) {
                    setCardID(card.id);
                }

                refs.state.counter = nextCounter;
                refs.batchSize = Math.min(refs.batchSize, cards.length);
            },
            [refs],
        );

        useEffect(() => {
            if (refs.initialized) {
                return;
            }

            init(initCards);
            refs.initialized = true;
        }, [init, initCards, refs]);

        useEffect(() => {
            function onFocus() {
                refs.timer = window.setInterval(() => {
                    refs.secondsElapsed++;
                }, 1000);
            }
            function onBlur() {
                clearInterval(refs.timer);
            }

            onFocus();
            window.addEventListener("focus", onFocus);
            window.addEventListener("blur", onBlur);
            return () => {
                window.removeEventListener("focus", onFocus);
                window.removeEventListener("blur", onBlur);
            };
        }, [refs]);

        const currentCard = OrderedSet.get(cards, cardID);
        let body = <div />;
        if (remind) {
            body = <Reminders onSubmit={() => setRemind(false)} />;
        } else if (currentCard) {
            body = (
                <>
                    {breakTime && (
                        <TabOutDistraction
                            card={currentCard}
                            seconds={refs.breakTimeDuration}
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

        // TODO:
        if (config.currentDate !== currentDate()) {
            throw "nope";
        }

        return (
            <div>
                <Container isLoading={loading} ref={containerRef}>
                    {body}
                </Container>
            </div>
        );
    }

    export const Container = styled.div<{ isLoading: boolean }>`
        position: relative;
        transition: top 0.3s;
        top: ${(props) => (props.isLoading ? "-100vh" : "0")};
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

    namespace SerializedState {
        export const defaultState = () => ({
            date: config.currentDate,
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

    async function studyCard(card: Card, trial: FactorTrial, recalled: boolean) {
        card = ShortAlternating.studyCard(card, trial, recalled);
        card.lastUpdate = Math.floor(Date.now() / 1000);
        await app.PersistCardStats(card);

        return card;
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
