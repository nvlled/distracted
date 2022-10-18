import { marked } from "marked";
import { useAtom } from "jotai";
import { memo, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { app } from "./api";
import { Card } from "./card";
import { Factor, FactorID, FactorTrial } from "./factors";
import { lt } from "./layout";
import {
    createPair,
    currentDate,
    OrderedSet,
    partition,
    randomElem,
    shuffle,
    useAsyncEffect,
    useInterval,
    yesterDate,
} from "./lib";
import { appState } from "./state";
import { AudioPlayer, AudioPlayer$ } from "./AudioPlayer";
import { DeckAudio } from "./DeckAudio";
import { SelectedCards } from "./SessionPrepare";

function useReviewingCards(deckName?: string) {
    const [allCards, setAllCards] = useState<Card[]>([]);
    const [cards, setCards] = useState<Card[]>([]);
    const [drillCards] = useAtom(appState.drillCards);

    useAsyncEffect(async () => {
        const cardData = await app.GetReviewingCards(deckName ?? "", -1);
        setAllCards(cardData.map((c) => Card.parse(c)));
    }, [deckName]);

    useEffect(() => {
        const yester = yesterDate();
        const today = currentDate();
        const idSet = new Set(drillCards.map((c) => c.id));
        let cards = allCards.filter((c) => {
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

export namespace SequentRecap$ {
    export interface Props {}
    export function View({}: Props) {
        type FactorFilter = FactorID | "auto";
        const [index, setIndex] = useState(-1);
        const [reviewingCards, setReviewingCards] = useReviewingCards();
        const [selectedCards, setSelectedCards] = useAtom(appState.drillCards);
        const [showSettings, setShowSettings] = useState(false);
        const [factorFilter, setFactorFilter] = useState<FactorFilter>("auto");
        const [factor, setFactor] = useState<FactorID | null>(null);
        const [startCountdown, setStartCountdown] = useState(defaultStartCountdown);
        const [countdown, setCountdown] = useState(startCountdown);
        const audioPlayer = useRef<AudioPlayer$.Control | null>(null);

        useEffect(() => {
            if (countdown > 0 && index >= 0) return;

            let cards = reviewingCards;
            if (index + 1 >= cards.length) cards = shuffle(cards);
            audioPlayer.current = null;

            for (let retry = 0; retry < cards.length; retry++) {
                const i = (index + 1) % cards.length;
                const card = cards[i];
                if (!card) continue;

                let factor: FactorID = "meaning";
                if (factorFilter === "auto") {
                    factor = Card.getRandomFactor(card);
                } else if (card.availableFactors.has(factorFilter)) {
                    factor = factorFilter;
                } else {
                    continue;
                }

                setIndex(i);
                setFactor(factor);
                setCountdown(startCountdown);
                setReviewingCards(cards);
                return;
            }

            setIndex(-1);
        }, [index, countdown, reviewingCards, factor]);

        useInterval(countdown > 0, 1000, () => {
            setCountdown((n) => n - 1);
            const p = audioPlayer.current;
            if (p && !p.isPlaying() && p.stopDuration() >= 2500) {
                p.play();
            }
        });

        function onChangeFilter(factor: FactorFilter) {
            setCountdown(0);
            setFactorFilter(factor);
        }

        function onHuh() {
            audioPlayer.current = null;
            setCountdown(0);
        }
        function onForgot(card: Card) {
            audioPlayer.current = null;
            if (!selectedCards.find((c) => c.id === card.id)) {
                setSelectedCards(selectedCards.concat(card));
                setCountdown(startCountdown);
            }
        }

        const card = reviewingCards[index];
        if (!card) {
            return <Container>no more cards for recap</Container>;
        }

        const randomExample = randomElem(card.examples);

        return (
            <Container>
                <lt.Row justifyContent={"end"}>
                    <button onClick={() => setShowSettings(!showSettings)}>⚙️</button>
                </lt.Row>
                <Settings show={showSettings}>
                    <Row>
                        <SettingsLabel>factor</SettingsLabel>
                        {Object.keys(Factor)
                            .concat("auto")
                            .map((f) => (
                                <label key={f}>
                                    <input
                                        type="checkbox"
                                        checked={f === factorFilter}
                                        onChange={() => onChangeFilter(f as FactorFilter)}
                                    />
                                    {f}
                                </label>
                            ))}
                    </Row>
                    <Row>
                        <SettingsLabel>duration</SettingsLabel>
                        <input
                            type="range"
                            min={defaultStartCountdown}
                            max={defaultStartCountdown * 10}
                            value={startCountdown}
                            onChange={(e) => setStartCountdown(e.target.valueAsNumber)}
                        />
                    </Row>
                </Settings>
                <lt.Row justifyContent={"center"} direction={"column"}>
                    {card.contextHint && <Hint>{card.contextHint}</Hint>}
                    {factor &&
                        (factor === "text" && randomExample?.length ? (
                            <TestedFactor
                                dangerouslySetInnerHTML={{
                                    __html: marked.parse(randomExample),
                                }}
                            />
                        ) : factor === "sound" ? (
                            <AudioPlayer
                                src={card.factorData["sound"] ?? ""}
                                ref={(ref) => (audioPlayer.current = ref)}
                            />
                        ) : (
                            <TestedFactor>{card.factorData[factor]}</TestedFactor>
                        ))}
                    <div>
                        {factor} ({countdown})
                    </div>
                    <br />
                    <lt.Row cmr={30}>
                        <ActionButton onClick={onHuh}>not sure (skip)</ActionButton>
                        <div>??</div>
                        <ActionButton
                            onClick={() => onForgot(reviewingCards[index])}
                            //ref={(ref) => ref?.focus()}
                        >
                            forgot
                        </ActionButton>
                    </lt.Row>
                </lt.Row>
                <SelectedCards />
            </Container>
        );
    }
    const defaultStartCountdown = 10;
    const Container = styled.div``;
    const Row = styled(lt.Row)`
        > * {
            margin-left: 10px;
        }
    `;
    const Settings = styled.div<{ show: boolean }>`
        ${(props) => (props.show ? "display: block; margin-bottom: 20px;" : "display: none;")}
        border: 1px solid gray;
        padding: 10px;
    `;
    const SettingsLabel = styled.div`
        &::after {
            content: ":";
        }
        text-align: right;
    `;
    const TestedFactor = styled.div`
        font-size: 180%;
        p {
            margin: 0;
        }
    `;
    const Hint = styled.div``;
    const ActionButton = styled.button``;
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
