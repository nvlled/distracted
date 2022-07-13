import {
    HTMLAttributes,
    KeyboardEventHandler,
    Suspense,
    SyntheticEvent,
    useEffect,
    useRef,
    useState,
} from "react";
import logo from "./assets/images/logo-universal.png";
import "./App.css";
import * as app from "../wailsjs/go/main/App";
import * as runtime from "../wailsjs/runtime";
import { atom, useAtom } from "jotai";
import { main } from "../wailsjs/go/models";
import { UserStart } from "./userstart";
import { appState } from "./state";
import {
    CardDrill,
    CardFace,
    CardLearn,
    GroupCardDrill,
    SessionDrill,
    SingleCardDrill,
} from "./SessionDrill";
import { SessionPrepare } from "./SessionPrepare";
import { Card } from "./card";
import styled from "styled-components";
import { Action, Invoke } from "./lib";

import { Distraction } from "./distraction";
import { marked } from "marked";
import { CardSearch } from "./card-search";
import { constants } from "./api";
import { lt } from "./layout";
import { Notes } from "./Notes";

/*
async function listRandomCards(deck: string, count?: number): Promise<Card[]> {
    const cardList = await app.ListCards(deck);
    cardList.sort(() => -1 + Math.random() * 2);
    return cardList.slice(0, count ?? 10).map(Card.parse);
}
*/

function Settings({ onSubmit }: { onSubmit: Action }) {
    const [mainPage, setMainPage] = useAtom(appState.mainPage);
    const [userData, setUserData] = useAtom(appState.userData);
    const numDownloadRef = useRef<HTMLInputElement>(null);
    const editorRef = useRef<HTMLInputElement>(null);

    function onIntro() {
        setMainPage("intro");
        onSubmit();
    }

    function onStartDownload() {
        const numToDownload = parseInt(numDownloadRef.current?.value ?? "") ?? 100;
        setUserData({
            ...userData,
            isDownloading: true,
        });
        app.StartCrawler(numToDownload);
    }
    function onStopDownload() {
        setUserData({
            ...userData,
            isDownloading: false,
        });
        app.StopCrawler();
    }
    async function onSaveEditor() {
        const editor = editorRef.current?.value.trim() ?? "";
        await app.SetTextEditor(editor);
        setUserData({ ...userData, textEditor: editor });
    }

    return (
        <Settings.Div>
            <Settings.Content>
                <FlexRow justify="right">
                    <button onClick={onSubmit}>
                        <FlexRow>✗ close</FlexRow>
                    </button>
                </FlexRow>

                {mainPage !== "intro" && (
                    <Settings.ContentRow>
                        <button onClick={onIntro}>go to introduction</button>
                        <br />
                        Click this if you need to do the introduction tutorial again.
                    </Settings.ContentRow>
                )}
                <Settings.ContentRow>
                    {!userData.isDownloading ? (
                        <>
                            <button onClick={onStartDownload}>download more content</button>
                            <div>
                                <input
                                    ref={numDownloadRef}
                                    defaultValue={100}
                                    style={{ display: "inline-block", width: 90 }}
                                    type="number"
                                />
                                number of items to download
                            </div>
                            Download more distractions. This will be done in the background, so you
                            can still continue to use the app while downloading.
                        </>
                    ) : (
                        <>
                            <button onClick={onStopDownload}>stop downloading</button>
                            <br />
                            Download is in progress. Click to cancel.
                        </>
                    )}
                </Settings.ContentRow>
                <Settings.ContentRow>
                    Text editor for cards
                    <input ref={editorRef} defaultValue={userData.textEditor} />
                    <button onClick={onSaveEditor}>save</button>
                </Settings.ContentRow>
            </Settings.Content>
        </Settings.Div>
    );
}

Settings.ContentRow = styled.div`
    max-width: 60vw;
    margin-bottom: 50px;
    border-left: 10px solid black;
    padding-left: 10px;
`;
Settings.Content = styled.div`
    margin: 50px;
    flex-direction: column;
    display: flex;
`;
Settings.Div = styled.div`
    background-color: #202b38f5;
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
`;
Settings.ButtonDiv = styled.div`
    position: absolute;
    right: 0;
    top: 0;
    margin: 10px;
    display: flex;
    flex-direction: column;
    height: 100vh;
`;

/*
type FlexRowAlign = "left" | "center" | "right";
function FlexRow({
    justify = "left",
    children,
}: {
    justify?: FlexRowAlign;
} & HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: justify,
            }}
        >
            {children}
        </div>
    );
}

const FlexRow = styled.div.attrs<{ justify: FlexRowAlign }>((props) => ({
    justify: props.justify ?? ("left" as FlexRowAlign),
}))<{ justify: FlexRowAlign }>`
    display: flex;
    align-items: center;
    justify-content: ${(props) => props.justify};
`;
*/

interface FlexRowProps {
    justify?: "left" | "center" | "right";
}
const FlexRow = styled.div<FlexRowProps>`
    display: flex;
    align-items: center;
    justify-content: ${(props) => props.justify ?? "left"};
`;

interface ColoredDivProps {
    bg: string;
}
const ColoredDiv = styled.div<ColoredDivProps>`
    min-width: 90px;
    min-height: 90px;
    background-color: ${(p) => p.bg};
`;

const ClearButton = styled.button`
    background: none;
`;

function Playground() {
    enum State {
        select,
        loading,
        start,
    }
    const [startTime, setStartTime] = useState(0);
    const [cards, setCards] = useState<Card[] | null>();
    const [state, setState] = useState<State>(State.select);
    const [collections, setCollections] = useState<Record<string, string[]>>({});

    async function onSelectCards(cardFiles: main.CardFile[], collectionName: string | undefined) {
        setState(State.loading);
        setStartTime(Math.floor(Date.now() / 1000));

        const cards: Card[] = [];
        for (const c of cardFiles) {
            const data = await app.GetCard(c.path);
            const card = Card.parse(data);
            console.log({ c, data, card });
            cards.push(card);
        }

        setCards(cards);
        setState(State.start);

        collectionName = collectionName || constants.defaultCollectionName;
        app.CreateCardCollection(
            collectionName,
            cardFiles.map((c) => c.path),
        );
    }

    useEffect(() => {
        Invoke(async () => {
            const collections = await app.GetCardCollections();
            setCollections(collections);
        });
    }, []);

    return (
        <div>
            <Elapsed startTime={startTime} />
            {state === State.select ? (
                <CardSearch.View
                    deck="japanese"
                    onSubmit={onSelectCards}
                    collections={collections}
                    submitText={"start"}
                />
            ) : state === State.loading ? (
                <div>loading...</div>
            ) : cards ? (
                <GroupCardDrill initCards={cards} />
            ) : (
                <div>no cards available</div>
            )}
        </div>
    );
}

function Elapsed({ startTime }: { startTime: number }) {
    const timerIDRef = useRef<number>();
    const [seconds, setSeconds] = useState(0);
    const [minutes, setMinutes] = useState(0);

    useEffect(() => {
        if (seconds >= 60) {
            setSeconds(0);
            setMinutes(minutes + 1);
        }
    }, [seconds]);

    useEffect(() => {
        setSeconds(0);
        setMinutes(0);
        timerIDRef.current = setInterval(() => {
            if (startTime === 0) {
                return;
            }
            setSeconds((seconds) => seconds + 1);
        }, 1000);
        return () => {
            clearInterval(timerIDRef.current);
        };
    }, [startTime]);

    if (startTime === 0) {
        return null;
    }

    return (
        <div>{`${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`}</div>
    );
}

function useScreenCapture() {
    async function run() {}
    useEffect(() => {
        run();
    }, []);
}

function ScreenCapture() {
    const videoRef = useRef<HTMLVideoElement>(null);
    async function stopCapture() {
        const video = videoRef.current;
        if (!video) return;
        let tracks = (video?.srcObject as MediaStream).getTracks();
        if (tracks) tracks.forEach((track) => track.stop());
    }
    async function startCapture() {
        const video = videoRef.current;
        if (!video) return;
        let captureStream: MediaStream | null = null;

        if (!captureStream) {
            try {
                captureStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                video.srcObject = captureStream;
            } catch (err) {
                console.error(`Error: ${err}`);
                return;
            }
        }
    }

    return (
        <div>
            <h1>screen</h1>
            <video ref={videoRef} autoPlay />
            <button onClick={startCapture}>start capture</button>
            <button onClick={stopCapture}>stop capture</button>
        </div>
    );
}

function App() {
    const [deckFiles, setDeckFiles] = useAtom(appState.deckFiles);
    const [currentCard, setCurrentCard] = useAtom(appState.currentCard);
    const [userData, setUserData] = useAtom(appState.userData);
    const [config, setConfig] = useAtom(appState.config);
    const [mainPage, setMainPage] = useAtom(appState.mainPage);
    const [drillCards, setDrillCards] = useAtom(appState.drillCards);
    const [initialized, setInitialized] = useState(false);
    const [showNotes, setShowNotes] = useState(false);

    //const [startingDeck, setStartingDeck] = useState<main.Deck | null>();
    const [showSettings, setShowSettings] = useState(false);
    const [modifiedCard, setModifiedCard] = useState<Card | null>();

    async function onStartDeckCreated(deck: string) {
        //setDrillCards(await listRandomCards(deck));
        setMainPage("drill");
    }
    function onSubmitPrepare(cards: main.CardData[]) {
        setDrillCards(cards.map(Card.parse));
    }

    useEffect(() => {
        async function init() {
            const currentDeck = "japanese";
            const [config, userData, cardFiles] = await Promise.all([
                app.GetConfig(),
                app.GetUserData(),
                app.ListCards(currentDeck),
            ]);

            setConfig(config);
            setUserData(userData);
            setDeckFiles({ ...deckFiles, [currentDeck]: cardFiles });

            runtime.EventsOn("on-finish-download", async () => {
                setUserData({
                    ...userData,
                    isDownloading: false,
                });
            });

            if (!userData.introCompleted) {
                if (!userData.decks?.length) {
                    setMainPage("intro");
                } else {
                    const deck = userData.decks[userData.decks.length - 1];
                    //setDrillCards(await listRandomCards(deck));
                    setMainPage("drill");
                }
            } else {
                setMainPage("prepare");
            }

            setInitialized(true);

            runtime.EventsOn("card-file-updated", async (data) => {
                if (typeof data !== "string") {
                    return;
                }
                const cardData = await app.GetCard(data);
                const card = Card.parse(cardData);
                setModifiedCard(card);
            });
        }

        init();
        window.onbeforeunload = () => {
            app.ClearWatchedFiles();
        };

        const keyHandler = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setShowNotes(false);
            }
        };

        window.onkeydown = keyHandler;
        return () => {
            window.onkeydown = null;
        };
    }, []);

    useEffect(() => {
        if (modifiedCard?.path && modifiedCard.path == currentCard?.path) {
            setCurrentCard(modifiedCard);
        }
    }, [modifiedCard]);

    if (!initialized) {
        return <div>loading</div>;
    }

    return (
        <div id="App">
            {/*<h1>{config.appName}</h1>*/}
            <Playground />
            <Notes show={showNotes} onClose={() => setShowNotes(false)} />

            {!showSettings ? (
                <Settings.ButtonDiv>
                    <ClearButton onClick={() => setShowSettings(true)}>#</ClearButton>
                    <ClearButton onClick={() => setShowNotes(!showNotes)}>N</ClearButton>
                </Settings.ButtonDiv>
            ) : (
                <Settings onSubmit={() => setShowSettings(false)} />
            )}

            {/*

            <Distraction />
            {mainPage === "intro" ? (
                <UserStart.View onSubmit={onStartDeckCreated} />
            ) : mainPage == "drill" ? (
                <SessionDrill cards={drillCards} />
            ) : mainPage == "prepare" ? (
                <SessionPrepare />
            ) : (
                <div>unknown page</div>
            )}

*/}
        </div>
    );
}
export default App;
