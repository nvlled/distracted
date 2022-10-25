import {
    Component,
    ForwardedRef,
    forwardRef,
    ReactNode,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from "react";
import "./App.css";
import * as app from "../wailsjs/go/main/App";
import * as runtime from "../wailsjs/runtime";
import { useAtom } from "jotai";
import { AppDrawerOptions, appState, ToastOptions } from "./state";
import { Card } from "./card";
import styled from "styled-components";
import { Action, MainPages, sleep, waitEvent } from "./lib";
import { config, config as globalConfig } from "./config";

import { cardEvents } from "./api";
import { lt } from "./layout";

import "./style.css";
import "@shoelace-style/shoelace/dist/themes/dark.css";
import "./water-dark.css";

import { Playground } from "./playground";
import { GrindStudySession } from "./SessionDrill";
import { AnimatedImageRef, Animation, AnimationRef, Button, Drawer } from "./shoelace";
import { SlAnimation } from "@shoelace-style/shoelace/dist/react";
// web server path? or filesystem path?
//setBasePath("../public/");

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

const DrawerContainer = styled.div<{ width?: string }>`
    > sl-drawer {
        ${(props) => (props.width ? `--size: ${props.width};` : "")}
    }
`;
const AppContainer = styled.div``;

function App() {
    //const [deckFiles, setDeckFiles] = useAtom(appState.deckFiles);
    const [, setActions] = useAtom(appState.actions);
    const [, setDecks] = useAtom(appState.decks);
    const [, setUserData] = useAtom(appState.userData);
    const [, setConfig] = useAtom(appState.config);
    const [, setAllUserCards] = useAtom(appState.allUserCards);
    const [drillCards, setDrillCards] = useAtom(appState.drillCards);
    const [mainPage, setMainPage] = useAtom(appState.mainPage);
    const [initialized, setInitialized] = useState(false);

    const [drawerContent, setDrawerContent] = useState<ReactNode | null>(null);
    const [drawerOptions, setDrawerOptions] = useState<AppDrawerOptions | null>(null);
    //const [showNotes, setShowNotes] = useState(false);
    //const [sessionName, setSessionName] = useState<string>(config.defaultStudyName);
    //const [editDailies, setEditDailies] = useState(false);

    //const [showSettings, setShowSettings] = useState(false);

    useEffect(() => {
        setActions({
            changePage: (name: MainPages) => {
                setMainPage(name);
            },
            toggleNotes: () => {},
            setDrawer: (options: AppDrawerOptions, content: ReactNode) => {
                setDrawerContent(content);
                setDrawerOptions(options);
            },
            toastInfo(message: string, options?: ToastOptions) {
                const alert = Object.assign(document.createElement("sl-alert"), {
                    variant: options?.variant ?? "primary",
                    closable: true,
                    duration: options?.duration ?? 5000,
                    innerHTML: `
                      <sl-icon name="info-circle" slot="icon"></sl-icon>
                      ${message}
                    `,
                });

                document.body.append(alert);
                return alert.toast();
            },
            removeDrillCard(cardID: number) {
                setDrillCards((cards) => cards.filter((c) => c.id !== cardID));
            },
        });

        async function init() {
            const [userData, decks, allUserCards, cardIDs] = await Promise.all([
                app.GetUserData(),
                app.GetDecks(),
                app.ListAllCards(),
                app.GetDailyStudyCardIds(),
            ]);

            setConfig(globalConfig);
            setUserData(userData);
            setDecks(decks);
            setAllUserCards(allUserCards);

            const idSet = new Set(cardIDs);
            setDrillCards(allUserCards.filter((c) => idSet.has(c.id)).map((c) => Card.parse(c)));

            console.log(allUserCards.length);

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

        //const keyHandler = (e: KeyboardEvent) => {
        //    if (e.key === "Escape") {
        //        setShowNotes(false);
        //    }
        //};
        //window.onkeydown = keyHandler;
        //return () => {
        //    window.onkeydown = null;
        //};
    }, [setAllUserCards, setConfig, setDecks, setUserData]);

    const [x, setX] = useState(0);
    const animRef = useRef<Flipper$.Control | null>(null);

    if (!initialized) {
        return <div>loading</div>;
    }

    return (
        <AppContainer id="App">
            {drawerContent && (
                <DrawerContainer width={drawerOptions?.width}>
                    <Drawer
                        label={drawerOptions?.title}
                        open={true}
                        onSlAfterHide={() => {
                            setDrawerContent(null);
                            setDrawerOptions(null);
                        }}
                        onSlRequestClose={(e) => {
                            if ((e as any).detail.source === "overlay" && drawerOptions?.keepOpen) {
                                e.preventDefault();
                            }
                        }}
                    >
                        {drawerContent}
                    </Drawer>
                </DrawerContainer>
            )}
            {/*drillCards.length > 0 && (
                <GrindStudySession
                    sessionName={config.defaultStudyName}
                    initCards={drillCards}
                    onQuit={() => {
                        //setMainPage("home")
                    } }
                    onAddMoreCards={() => {
                        //setEditDailies(true);
                        //setMainPage("home");
                    }}
                />
            )*/}

            {mainPage === "intro" ? (
                "TODO"
            ) : //<UserStart.View onSubmit={onStartDeckCreated} />
            mainPage == "drill" ? (
                <GrindStudySession
                    sessionName={config.defaultStudyName}
                    initCards={drillCards}
                    onQuit={() => setMainPage("home")}
                    //onAddMoreCards={() => {
                    //    setEditDailies(true);
                    //    setMainPage("home");
                    //}}
                />
            ) : mainPage == "home" ? (
                <Playground onSubmit={() => setMainPage("drill")} />
            ) : (
                <div>unknown page</div>
            )}

            {/*
            <Notes show={showNotes} onClose={() => setShowNotes(false)} />

            {!showSettings ? (
                <Settings.ButtonDiv>
                    <ClearButton onClick={() => setShowSettings(true)}>#</ClearButton>
                    <ClearButton onClick={() => setShowNotes(!showNotes)}>N</ClearButton>
                </Settings.ButtonDiv>
            ) : (
                <Settings onSubmit={() => setShowSettings(false)} />
            )}
            */}
        </AppContainer>
    );
}
export default App;

export namespace Flipper$ {
    export interface Control {
        flipOut: () => Promise<void>;
        hide: () => Promise<void>;
        show: () => Promise<void>;
        flipIn: () => Promise<void>;
    }
    export interface Props {
        children: ReactNode;
        rate?: number;
        //onTransition: Action;
        //onEnd: Action;
    }
    export const View = forwardRef(function (
        { rate, children }: Props,
        ref: ForwardedRef<Control>,
    ) {
        const animRef = useRef<AnimationRef | null>(null);
        const onMount = (ref: AnimationRef) => {
            animRef.current = ref;
            if (!ref) return;
            ref.iterations = 1;
            ref.playbackRate = rate ?? 1;
        };

        useImperativeHandle(
            ref,
            () => ({
                flipOut: async () => {
                    const anim = animRef.current;
                    if (!anim) return;
                    anim.name = "backOutLeft";
                    anim.play = true;
                    await waitEvent(anim, "sl-finish");
                    anim.style.visibility = "hidden";
                },
                flipIn: async () => {
                    const anim = animRef.current;
                    if (!anim) return;
                    anim.style.visibility = "visible";
                    anim.name = "backInRight";
                    anim.play = true;
                    await waitEvent(anim, "sl-finish");
                },
                hide: async () => {
                    const anim = animRef.current;
                    if (!anim) return;
                    anim.style.visibility = "hidden";
                },
                show: async () => {
                    const anim = animRef.current;
                    if (!anim) return;
                    anim.style.visibility = "visible";
                },
            }),
            [],
        );
        return <Animation ref={onMount}>{children}</Animation>;
    });
    const Container = styled.div``;
}
export const Flipper = Flipper$.View;
