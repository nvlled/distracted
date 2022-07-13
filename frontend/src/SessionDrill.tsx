import { marked } from "marked";
import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { main } from "../wailsjs/go/models";
import { Card, CardFaceData, Entry } from "./card";
import { Action, Action1 } from "./lib";
import * as app from "../wailsjs/go/main/App";
import { Distraction, LocalMediaDistraction } from "./distraction";
import { AudioPlayer, playAudio } from "./AudioPlayer";
import { useAtom } from "jotai";
import { appState } from "./state";

function secondsLeft(card: Card) {
    const minTimeout = 6;
    const now = Math.floor(Date.now() / 1000);
    const elapsed = now - card.lastUpdate;
    let seconds = elapsed < 0 ? 0 : card.interval - elapsed;

    return Math.max(seconds, minTimeout);
}

export function GroupCardDrill({ initCards }: { initCards: Card[] }) {
    const [remind, setRemind] = useState(false);
    const [cards, setCards] = useState<Card[]>(initCards);
    const [breakTime, setBreakTime] = useState(false);
    const [interval, setInterval] = useState(0);
    //const [currentCard, setCurrentCard] = useState<Card | null>();
    const [currentCard, setCurrentCard] = useAtom(appState.currentCard);

    function onReturn() {
        setBreakTime(false);
        setCurrentCard(nextDueCard(cards));
    }

    function nextDueCard(cards: Card[]) {
        const dueCards = cards.filter((c) => {
            const now = Math.floor(Date.now() / 1000);
            console.log(">", c.filename, now - c.lastUpdate + c.interval, now - c.lastUpdate);
            return now >= c.lastUpdate + c.interval;
        });
        return dueCards[0];
    }

    function getBreakTimeInterval(cards: Card[]) {
        return Math.min(...cards.map(secondsLeft));
    }

    async function onSubmit(recalled: boolean) {
        if (!currentCard) {
            return;
        }
        const updatedCardData = await app.StudyCard(currentCard.path, recalled);
        const updatedCard: Card = {
            ...currentCard,
            ...updatedCardData,
        };
        const updatedCards = cards.map((c) => (c.path !== updatedCard.path ? c : updatedCard));
        updatedCards.sort((a, b) => {
            const aCount = a.numRecall + a.numForget;
            const bCount = b.numRecall + b.numForget;

            if (aCount >= 1 && aCount <= 2) return -1;
            if (bCount >= 1 && bCount <= 2) return 1;

            return a.interval - b.interval;
        });

        setCards(updatedCards);
        setCurrentCard(updatedCard);
        setBreakTime(true);

        setInterval(getBreakTimeInterval(updatedCards));
    }

    useEffect(() => {
        const card = nextDueCard(initCards);
        console.log(card);
        setCurrentCard(card);
    }, [initCards]);

    let body = <div />;
    if (remind) {
        body = <Reminders onSubmit={() => setRemind(false)} />;
    } else if (currentCard) {
        body = (
            <>
                {breakTime && (
                    <Distraction card={currentCard} seconds={interval} onReturn={onReturn} />
                )}
                {!breakTime && <CardLearn.View card={currentCard} onSubmit={onSubmit} />}
            </>
        );
    }
    console.log({ currentCard });

    return <div>{body}</div>;
}

export function SingleCardDrill({ card }: { card: Card }) {
    const [remind, setRemind] = useState(false);
    const [currentCard, setCurrentCard] = useState(card);
    const [breakTime, setBreakTime] = useState(false);

    useEffect(() => setCurrentCard(card), [card]);

    function onReturn() {
        setBreakTime(false);
    }

    async function onSubmit(recalled: boolean) {
        const updatedCardData = await app.StudyCard(currentCard.path, recalled);
        const card_: Card = {
            ...card,
            ...updatedCardData,
        };
        console.log({ updatedCardData });

        setCurrentCard(card_);
        setBreakTime(true);
    }

    let body = <div />;
    if (remind) {
        body = <Reminders onSubmit={() => setRemind(false)} />;
    } else {
        body = (
            <>
                {breakTime && (
                    <Distraction
                        card={currentCard}
                        seconds={secondsLeft(currentCard)}
                        onReturn={onReturn}
                    />
                )}
                {!breakTime && <CardLearn.View card={currentCard} onSubmit={onSubmit} />}
            </>
        );
    }

    return <div>{body}</div>;
}

export interface Props {
    cards: Card[];
}
export function SessionDrill({ cards }: Props) {
    const [remind, setRemind] = useState(true);
    const [cardIndex, setCardIndex] = useState(0);

    function onSubmit(recalled: boolean) {
        // TODO: app.StudyCard()
    }

    let body = <div />;
    if (cards.length === 0) {
        body = <div>No cards are available.</div>;
    } else if (remind) {
        body = <Reminders onSubmit={() => setRemind(false)} />;
    } else {
        body = <CardLearn.View card={cards[cardIndex]} onSubmit={onSubmit} />;
    }

    return <div>{body}</div>;
}

function Reminders({ onSubmit }: { onSubmit: Action }) {
    return (
        <div>
            <div>Friendly reminders</div>
            <ul>
                <li>keep calm, and avoid being tense or anxious</li>
                <li>try to remember, but don't think too hard</li>
                <li>don't fret if you forget, the more you forget, the better</li>
                <li>stop if you feel symptoms of fatigue</li>
            </ul>

            <div>
                <button onClick={onSubmit}>got it</button>
            </div>
        </div>
    );
}

const DeckAudio = {
    _audio: new Audio(),
    async playFirstFront(card: Card, config: main.Config): Promise<void> {
        const audio = DeckAudio._audio;
        const base = config.baseUrlDecks;
        const audioFile = card.front.contents?.filter(
            (e) => typeof e !== "string" && e.name === "audio",
        )[0] as Entry;

        if (audioFile) {
            audio.src = `${base}/${card.deckName}/${decodeURI(audioFile.value)}`;
            console.log("src", audio.src);
            audio.load();
            playAudio(audio);
        }
    },
};

export namespace CardLearn {
    export interface Props {
        card: Card;
        onSubmit: Action1<boolean>;
    }
    const st = {
        ShowAside: styled.div`
            position: absolute;
            right: 10px;
            bottom: 10px;
            z-index: 90;
        `,
        Faces: styled.div`
            position: relative;
        `,
        PromptButtons: styled.div`
            text-align: center;
        `,
        CardFilename: styled.div`
            text-align: center;
            font-size: 12px;
            text-decoration: underline;
            cursor: pointer;
        `,
    };
    export function View({ card, onSubmit }: Props) {
        const [config] = useAtom(appState.config);
        const [audio] = useAtom(appState.config);
        const [showFront, setShowFront] = useState(false);
        const [showBack, setShowBack] = useState(false);
        const [showAside, setShowAside] = useState(false);
        const [obscure, setObscure] = useState(false);

        //TODO: reload file
        async function onFilenameClick() {
            await app.OpenCardFile(card.path);
        }

        useEffect(() => {
            setShowFront(false);
            setShowBack(false);

            const minReviews = 10;
            const minConsec = 2;
            const maxConsec = 5;
            const reviewCount = card.numForget + card.numRecall;
            const obscure =
                (card.consecRecall >= minConsec && card.consecRecall <= maxConsec) ||
                (reviewCount > minReviews && card.consecForget < minConsec);

            if (card.consecRecall <= maxConsec) {
                setShowFront(true);
                setObscure(obscure);
            } else {
                setObscure(false);
                setShowBack(true);
            }
        }, [card]);

        useEffect(() => {
            if (showBack && showFront) {
                setObscure(false);
                DeckAudio.playFirstFront(card, config);
            }
        }, [showFront, showBack]);

        useEffect(() => {
            app.WatchCardFile(card.path);
            return () => {
                app.UnwatchCardFile(card.path);
            };
        }, []);

        return (
            <div>
                <st.CardFilename onClick={onFilenameClick}>{card.filename}</st.CardFilename>
                <st.Faces>
                    {showFront && (
                        <>
                            <CardFace.View face={card.front} obscure={obscure} />
                        </>
                    )}
                    {!showFront && (
                        <div>
                            <button onClick={() => setShowFront(true)}>show front</button>
                        </div>
                    )}
                    <hr />
                    {showBack && (
                        <>
                            <CardFace.View face={card.back} />
                        </>
                    )}
                    {!showBack && (
                        <div>
                            <button onClick={() => setShowBack(true)}>show back</button>
                        </div>
                    )}
                    {showBack && (
                        <st.ShowAside>
                            <button onClick={() => setShowAside(!showAside)}>?</button>
                        </st.ShowAside>
                    )}
                    {showBack && showAside && (
                        <>
                            <hr />
                            <div style={{ fontSize: "15px" }}>
                                <CardFace.View face={card.aside} />
                            </div>
                        </>
                    )}
                </st.Faces>
                <br />

                <st.PromptButtons>
                    {showFront &&
                        showBack &&
                        (card.numRecall + card.numForget === 0 ? (
                            <div>
                                <button onClick={() => onSubmit(true)}>continue →</button>
                            </div>
                        ) : (
                            <div>
                                <div>Do you remember?</div>
                                <button onClick={() => onSubmit(true)}>Yes</button>
                                <button onClick={() => onSubmit(false)}>No</button>
                            </div>
                        ))}
                </st.PromptButtons>
            </div>
        );
    }
}

export namespace CardDrill {
    export interface Props {
        card: Card;
        onSubmit: Action;
    }
    export function View({ card, onSubmit }: Props) {
        const [showBack, setShowBack] = useState(false);
        return (
            <div>
                <CardFace.View face={card.front} />
                {showBack && (
                    <>
                        <hr />
                        <CardFace.View face={card.back} />
                    </>
                )}
                <br />
                {!showBack && (
                    <div>
                        <button onClick={() => setShowBack(true)}>lemme see</button>
                    </div>
                )}
            </div>
        );
    }
}

function createBlotCanvas(rect: Rect, copyCanvas?: HTMLCanvasElement) {
    const canvas = document.createElement("canvas");
    const color = "#990000";

    canvas.width = rect.width;
    canvas.height = rect.height;
    //canvas.style.border = "1px solid green";
    canvas.style.position = "absolute";

    canvas.style.left = rect.x + "px";
    canvas.style.top = rect.y + "px";

    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";

    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas;

    if (copyCanvas) {
        ctx.drawImage(copyCanvas, 0, 0);
        return canvas;
    }

    let marginX = rect.width * 0.25;
    let marginY = rect.height * 0.25;

    let [x, y] = [
        marginX + Math.random() * (rect.width - marginX * 2),
        marginY + Math.random() * (rect.height - marginY * 2),
    ];

    ctx.fillStyle = color;

    ctx.beginPath();
    ctx.arc(x, y, rect.width / 3.0, 0, Math.PI * 2);
    ctx.fill();

    marginX = rect.width * 0.1;
    marginY = rect.height * 0.1;
    for (let j = 0; j < 100; j++) {
        [x, y] = [
            marginX + Math.random() * (rect.width - marginX * 2),
            marginY + Math.random() * (rect.height - marginY * 2),
        ];
        ctx.beginPath();
        ctx.arc(x, y, Math.max(rect.width / (7 * (j + 1)), 0.8), 0, Math.PI * 2);
        ctx.fill();
    }

    return canvas;
}

interface Rect {
    //index: number;
    tagName: string;
    x: number;
    y: number;
    width: number;
    height: number;
    text: string;
}

function getTextBounds(node: Node) {
    if (node.nodeType != Node.TEXT_NODE) {
        return [];
    }

    const result: Rect[] = [];
    const range = document.createRange();
    const len = node.textContent?.length ?? 0;

    for (let i = 0; i < len; i++) {
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        const b = range.getBoundingClientRect();
        result.push({
            tagName: node.parentElement?.tagName?.toLowerCase() ?? "div",
            x: b.x,
            y: b.y,
            width: b.width,
            height: b.height,
            text: node.textContent?.[i] ?? "",
        });
    }
    return result;
}

function getAllLeterBounds(elem: Node): Rect[] {
    const result: Rect[] = [];

    if (elem.nodeType === Node.TEXT_NODE) {
        return getTextBounds(elem);
    }

    for (const c of elem.childNodes) {
        const bounds = getAllLeterBounds(c);
        result.push(...bounds);
    }
    return result;
}

export const CardFace = {
    View({ face, obscure = false }: { face: CardFaceData; obscure?: boolean }) {
        const [config] = useAtom(appState.config);
        const card = face.card;
        const addedRef = useRef(false);
        const canvasesRef = useRef({} as Record<string, HTMLCanvasElement | undefined>);

        function onRef(div: HTMLDivElement | null) {
            if (!div) return;

            for (const c of div.querySelectorAll("canvas")) {
                c.remove();
            }

            if (!obscure || addedRef.current) {
                return;
            }

            const textContent = div.textContent?.trim() ?? "";

            div.style.position = "relative";

            const r = div.getBoundingClientRect();
            const bounds = getAllLeterBounds(div).map((b) => ({
                ...b,
                x: b.x - r.x,
                y: b.y - r.y,
            }));

            const keyTag = "em";
            const hasKeyTag = !!div.querySelector(keyTag);
            const indexSet = new Set();

            if (!hasKeyTag) {
                for (let i = 0; i < textContent.length * 0.75; i++) {
                    const j = Math.floor(Math.random() * textContent.length);
                    if (textContent[j] === "") {
                        continue;
                    }
                    indexSet.add(j);
                }
            }

            const filteredBounds = bounds.filter((b, i) => {
                if (obscure) {
                    if (hasKeyTag) {
                        if (b.tagName !== keyTag) return false;
                    } else if (!indexSet.has(i)) {
                        return false;
                    }
                }
                return true;
            });
            const reviewCount = face.card ? face.card.numRecall : 0;
            const j = reviewCount % filteredBounds.length;
            const k = (reviewCount + 1) % filteredBounds.length;

            let i = -1;
            for (const b of filteredBounds) {
                i++;

                if (filteredBounds.length <= 2 && i !== j) continue;
                else if (i !== j && i !== k) continue;

                const canvasCopy = canvasesRef.current[b.text];
                const canvas = createBlotCanvas(b, canvasCopy);

                if (!canvasCopy && canvasesRef.current) {
                    canvasesRef.current[b.text] = canvas;
                }

                const fadeTime = 2.0;
                let hidden = false;
                canvas.onclick = () => {
                    if (hidden) {
                        hidden = false;
                        canvas.style.cursor = "pointer";
                        canvas.style.transition = "";
                        canvas.style.opacity = "1";
                        return;
                    }

                    canvas.style.transition = `opacity ${fadeTime}s`;
                    canvas.style.cursor = "none";
                    canvas.style.opacity = "0";
                    setTimeout(() => {
                        hidden = true;
                        canvas.style.cursor = "pointer";
                        //canvas.remove();
                    }, fadeTime * 1000);
                };
                canvas.style.cursor = "pointer";

                div.appendChild(canvas);
            }
            //addedRef.current = true;
        }

        const st = CardFace;

        return (
            <CardFace.Div>
                {face.contents?.map((c, i) => {
                    let content = <div />;
                    if (typeof c === "string") {
                        content = (
                            <st.ContentContainer ref={onRef}>
                                <st.Content
                                    dangerouslySetInnerHTML={{
                                        __html: marked.parse(c),
                                    }}
                                />
                            </st.ContentContainer>
                        );
                    } else if (c.name === "image") {
                        content = (
                            <img src={`${config.baseUrlDecks}/${card?.deckName}/${c.value}`} />
                        );
                    } else if (c.name === "audio" && c.value.trim()) {
                        content = (
                            <AudioPlayer
                                baseSrc={config.baseUrlDecks}
                                src={c.value
                                    .split(",")
                                    .map((s) => `${card?.deckName}/${s}`)
                                    .join(",")}
                            />
                        );
                    }
                    return <div key={card?.path + "-" + i}>{content}</div>;
                })}
            </CardFace.Div>
        );
    },

    ContentContainer: styled.div`
        position: relative;
        font-size: 180%;

        p {
            margin: 10px 0;
        }
        em,
        strong {
            color: #ccffcc;
            font-size: 110%;
            vertical-align: middle;
        }
    `,
    Content: styled.div``,
    Noise: styled.canvas`
        width: 100%;
        height: 100%;
        position: absolute;
        top: 0;
        left: 0;
        border: 1px solid red;
    `,

    Div: styled.div`
        position: relative;
        /*text-align: center;*/
        p {
            margin-top: 15px;
            margin-bottom: 2px;
        }
        img {
            max-height: 35vh;
            margin: 10px auto;
            display: block;
        }
    `,
};
