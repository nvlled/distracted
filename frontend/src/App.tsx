import { useEffect, useRef, useState } from "react";
import "./App.css";
import * as app from "../wailsjs/go/main/App";
import * as runtime from "../wailsjs/runtime";
import { atom, useAtom } from "jotai";
import { UserStart } from "./userstart";
import { appState } from "./state";
import { GrindStudySession } from "./SessionDrill";
import { DailyStudySession } from "./SessionPrepare";
import { Card } from "./card";
import styled from "styled-components";
import { Action, shuffle } from "./lib";
import { config as globalConfig } from "./config";

import { cardEvents, constants } from "./api";
import { Notes } from "./Notes";
import { SequentRecap } from "./discovery";
import { lt } from "./layout";

function Settings({ onSubmit }: { onSubmit: Action }) {
    const [mainPage, setMainPage] = useAtom(appState.mainPage);
    const [userData, setUserData] = useAtom(appState.userData);
    const editorRef = useRef<HTMLInputElement>(null);

    function onQuit() {
        setMainPage("home");
        onSubmit();
    }
    function onIntro() {
        setMainPage("intro");
        onSubmit();
    }

    async function onSaveEditor() {
        const editor = editorRef.current?.value.trim() ?? "";
        await app.SetTextEditor(editor);
        setUserData({ ...userData, textEditor: editor });
    }

    return (
        <Settings.Div>
            <Settings.Content>
                <lt.Row justifyContent="right">
                    <button onClick={onSubmit}>
                        <lt.Row>✗ close</lt.Row>
                    </button>
                </lt.Row>

                {mainPage !== "home" && (
                    <Settings.ContentRow>
                        <button onClick={onQuit}>go to main menu</button>
                        <br />
                        Quit any time, come back any time
                    </Settings.ContentRow>
                )}
                {mainPage !== "intro" && (
                    <Settings.ContentRow>
                        <button onClick={onIntro}>go to introduction</button>
                        <br />
                        Click this if you need to do the introduction tutorial again.
                    </Settings.ContentRow>
                )}
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
    position: fixed;
    right: 0;
    top: 0;
    margin: 10px;
    display: flex;
    flex-direction: column;
    height: 100vh;
`;

const ClearButton = styled.button`
    background: none;
`;

function App() {
    const [deckFiles, setDeckFiles] = useAtom(appState.deckFiles);
    const [userData, setUserData] = useAtom(appState.userData);
    const [config, setConfig] = useAtom(appState.config);
    const [mainPage, setMainPage] = useAtom(appState.mainPage);
    const [drillCards, setDrillCards] = useAtom(appState.drillCards);
    const [initialized, setInitialized] = useState(false);
    const [showNotes, setShowNotes] = useState(false);
    const [sessionName, setSessionName] = useState<string>(config.defaultStudyName);
    const [editDailies, setEditDailies] = useState(false);

    const [showSettings, setShowSettings] = useState(false);

    async function onStartDeckCreated(deck: string) {
        setMainPage("drill");
    }

    async function onCreateSession(sessionName: string, cards: Card[]) {
        console.log("onCreateSession", sessionName, cards);
        setEditDailies(false);
        setSessionName(sessionName);
        setDrillCards(cards);
        setMainPage("drill");
    }

    useEffect(() => {
        async function init() {
            const currentDeck = "japanese";
            const [userData, cardFiles] = await Promise.all([
                app.GetUserData(),
                app.ListCards(currentDeck),
            ]);

            setConfig(globalConfig);
            setUserData(userData);
            setDeckFiles({ ...deckFiles, [currentDeck]: cardFiles });

            setMainPage("home");
            setInitialized(true);

            runtime.EventsOn("card-file-updated", async (data) => {
                if (typeof data !== "string") {
                    return;
                }
                const cardData = await app.GetCard(data);
                const card = Card.parse(cardData);
                console.log("card-file-updated");
                cardEvents.emit(card);
            });

            app.ClearBreakTimeNotifiers();
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

    if (!initialized) {
        return <div>loading</div>;
    }

    return (
        <div id="App">
            <SequentRecap />
            <hr />

            {mainPage === "intro" ? (
                <UserStart.View onSubmit={onStartDeckCreated} />
            ) : mainPage == "drill" ? (
                sessionName ? (
                    <GrindStudySession
                        sessionName={sessionName}
                        initCards={drillCards}
                        onQuit={() => setMainPage("home")}
                        onAddMoreCards={() => {
                            setEditDailies(true);
                            setMainPage("home");
                        }}
                    />
                ) : (
                    "got a null session id"
                )
            ) : mainPage == "home" ? (
                <>
                    <DailyStudySession onSubmit={onCreateSession} edit={editDailies} />
                </>
            ) : (
                <div>unknown page</div>
            )}
            <Notes show={showNotes} onClose={() => setShowNotes(false)} />

            {!showSettings ? (
                <Settings.ButtonDiv>
                    <ClearButton onClick={() => setShowSettings(true)}>#</ClearButton>
                    <ClearButton onClick={() => setShowNotes(!showNotes)}>N</ClearButton>
                </Settings.ButtonDiv>
            ) : (
                <Settings onSubmit={() => setShowSettings(false)} />
            )}
        </div>
    );
}
export default App;
