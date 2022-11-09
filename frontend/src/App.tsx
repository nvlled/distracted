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
import * as app from "../wailsjs/go/main/App";
import * as runtime from "../wailsjs/runtime";
import { useAtom } from "jotai";
import { AppDrawerOptions, appState, ToastOptions } from "./state";
import { Card } from "./card";
import styled, { keyframes } from "styled-components";
import {
    Action,
    Action1,
    deferInvoke,
    hasProp,
    MainPages,
    sleep,
    tryJSONParse,
    useInterval,
    waitEvent,
} from "./lib";
import { config, setConfig } from "./config";

import { cardEvents } from "./api";
import { Flex, lt } from "./layout";

import "./App.css";
import "./style.css";
//import "./water-dark.css";
import "@shoelace-style/shoelace/dist/themes/dark.css";

import { CardSort, Playground } from "./playground";
import { GrindStudySession } from "./SessionDrill";
import {
    AnimatedImageRef,
    Animation,
    AnimationRef,
    Button,
    ButtonGroup,
    CardBox,
    Checkbox,
    Drawer,
    EventUtil,
    Icon,
    IconButton,
    Popup,
    Range,
    Shoe,
    Tooltip,
} from "./shoelace";
import { SlAnimation } from "@shoelace-style/shoelace/dist/react";
import { Ap2 } from "./AudioPlayer";
import { Space } from "./components";
import { useOnMount, useOnUnmount, useSomeChanged, useChanged } from "./hooks";
import { z } from "zod";
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

let appInitialized = false;
function App() {
    //const [deckFiles, setDeckFiles] = useAtom(appState.deckFiles);
    const [, setActions] = useAtom(appState.actions);
    const [, setDecks] = useAtom(appState.decks);
    const [, setUserData] = useAtom(appState.userData);
    const [, setAllUserCards] = useAtom(appState.allUserCards);
    const [drillCards, setDrillCards] = useAtom(appState.drillCards);
    const [drillSort, setDrillSort] = useAtom(appState.drillSort);
    const [mainPage, setMainPage] = useAtom(appState.mainPage);
    const [initialized, setInitialized] = useState(false);
    const [sortedCards, setSortedCards] = useState<Card[]>([]);

    const [drawerContent, setDrawerContent] = useState<ReactNode | null>(null);
    const [drawerOptions, setDrawerOptions] = useState<AppDrawerOptions | null>(null);
    //const [showNotes, setShowNotes] = useState(false);
    //const [sessionName, setSessionName] = useState<string>(config.defaultStudyName);
    //const [editDailies, setEditDailies] = useState(false);

    //const [showSettings, setShowSettings] = useState(false);

    useEffect(() => {
        if (appInitialized) return;
        appInitialized = true;
        console.log("app init");

        const appActions = {
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
            updateDrillCard(card: Card) {
                setDrillCards((cards) => cards.map((c) => (c.id !== card.id ? c : card)));
            },
            showGrindSettings(onSave: (_: GrindSettings$.Options.T) => void) {
                this.setDrawer(
                    {
                        keepOpen: true,
                        title: "Study session settings",
                    },
                    <GrindSettings onSave={onSave} />,
                );
            },
            saveCards: deferInvoke(5000, (cards: Card[]) => {
                app.CreateStudySession(
                    config().defaultStudyName,
                    config().studySessionTypes.normal,
                    cards.map((c) => c.path),
                );
            }),
        };
        setActions(appActions);

        async function init() {
            const [userData, decks, allUserCards, cardIDs] = await Promise.all([
                app.GetUserData(),
                app.GetDecks(),
                app.ListAllCards(),
                app.GetDailyStudyCardIds(),
            ]);

            setUserData(userData);
            setDecks(decks);
            setAllUserCards(allUserCards);

            const idSet = new Set(cardIDs);
            setDrillCards(allUserCards.filter((c) => idSet.has(c.id)).map((c) => Card.parse(c)));
            setDrillSort(CardSort.loadDrillSort());

            setInitialized(true);

            runtime.EventsOn("card-file-updated", async (data) => {
                if (typeof data !== "string") {
                    return;
                }
                const cardData = await app.GetCard(data);
                const card = Card.parse(cardData);
                setDrillCards((cards) => cards.map((c) => (c.id !== card.id ? c : card)));
                setAllUserCards((cards) => cards.map((c) => (c.id !== card.id ? c : cardData)));
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
    }, []);

    if (useSomeChanged(drillSort.type, drillSort.desc)) {
        CardSort.saveDrillSort(drillSort);
    }

    useInterval(30 * 60 * 1000, async () => {
        const config = await app.GetConfig();
        setConfig(config);
    });

    return (
        <AppContainer id="App">
            <ToggleKeybindInfo />
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
                    sessionName={config().defaultStudyName}
                    initCards={sortedCards}
                    onQuit={() => setMainPage("home")}
                    //onAddMoreCards={() => {
                    //    setEditDailies(true);
                    //    setMainPage("home");
                    //}}
                />
            ) : mainPage == "home" ? (
                <Playground
                    onSubmit={() => {
                        setSortedCards(CardSort.sort(drillSort.type, drillSort.desc, drillCards));
                        setMainPage("drill");
                    }}
                />
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
        reset: () => Promise<void>;
        flipOut: () => Promise<void>;
        hide: () => Promise<void>;
        show: () => Promise<void>;
        flipIn: () => Promise<void>;
    }
    export interface Props {
        children: ReactNode;
        rate?: number;
        outAnimation?: string;
        inAnimation?: string;
    }
    export const View = forwardRef(function (
        { rate, children, outAnimation = "backOutLeft", inAnimation = "backInRight" }: Props,
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
                reset: async () => {
                    const anim = animRef.current;
                    if (!anim) return;
                    anim.name = "";
                },
                flipOut: async () => {
                    const anim = animRef.current;
                    if (!anim) return;
                    anim.name = outAnimation;
                    anim.play = true;
                    await waitEvent(anim, "sl-finish");
                    anim.style.visibility = "hidden";
                },
                flipIn: async () => {
                    const anim = animRef.current;
                    if (!anim) return;
                    anim.style.visibility = "visible";
                    anim.name = inAnimation;
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

export namespace ToggleKeybindInfo$ {
    export interface Props {}
    export function View({}: Props) {
        const [show, setShow] = useAtom(appState.showKeybindings);
        return (
            <Container active={show}>
                <Tooltip content="show key shortcuts" placement="right">
                    <IconButton name="keyboard" onClick={() => setShow(!show)} />
                </Tooltip>
            </Container>
        );
    }
    const Container = styled.div<{ active: boolean }>`
        position: absolute;
        top: 0;
        left: 0;
        sl-icon-button::part(base) {
            color: ${(props) => (props.active ? Shoe.color_success_600 : Shoe.color_neutral_500)};
        }
    `;
}
export const ToggleKeybindInfo = ToggleKeybindInfo$.View;

/*
export namespace TestPrevState$ {
    export interface Props {}
    export function View({}: Props) {
        const [count, setCount] = useState(0);
        const [count2, setCount2] = useState(0);
        const [square, setSquare] = useState(0);
        const [msg, setMsg] = useState(`huh`);

        const countChanged = useChanged(count);
        const countChanged2 = useChanged(count2);
        const countChanged3 = useSomeChanged(count, count2);
        if (countChanged3) {
            setSquare((count + count2) ** 2);
        }

        useOnMount(() => {
            console.log("mount", { count });
        });
        useOnUnmount(() => {
            console.log("unmount", { count });
        });

        //const updateMsg = useInterval(1000);
        //if (updateMsg) {
        //    setCount(count + 1);
        //    setMsg(`${Date.now()}`);
        //    console.log("okay, but why doesn't this work?");
        //}

        return (
            <Container>
                <div>? {msg}</div>
                <CardBox>
                    <Button onClick={() => setCount(count + 1)}>count={count}</Button>
                    <Button onClick={() => setCount2(count2 + 1)}>count2={count2}</Button>
                    <Button
                        onClick={() => {
                            setCount(count + 1);
                            setCount2(count2 + 1);
                        }}
                    >
                        both
                    </Button>
                    <Space />
                    square={square}
                </CardBox>
            </Container>
        );
    }
    const Container = styled.div``;

    //function useInterval(millis: number) {
    //    const [, setLastUpdate] = useState(0);
    //    const ref = useRef(false);

    //    useEffect(() => {
    //        let timerID = setInterval(() => {
    //            ref.current = true;
    //            setLastUpdate(Date.now());
    //        }, millis);
    //        return () => clearInterval(timerID);
    //    }, []);

    //    const shouldRun = ref.current;
    //    ref.current = false;

    //    return shouldRun;
    //}
}
export const TestPrevState = TestPrevState$.View;
*/

export namespace GrindSettings$ {
    export interface Props {
        onSave?: Action1<GrindSettings$.Options.T>;
    }
    export function View({ onSave }: Props) {
        const [options, setOptions] = useState(Options.defaultOptions);

        function update(newOptions: Options.T) {
            setOptions(newOptions);
            Options.save(newOptions);
            onSave?.(newOptions);
        }

        useOnMount(() => {
            setOptions(Options.load());
        });

        return (
            <Container>
                <label>
                    study batch duration:
                    <Space />
                    {options.studyBatchDuration}
                    <Range
                        onSlChange={(e) => {
                            const val: number = EventUtil.value(e) ?? options.studyBatchDuration;
                            update({ ...options, studyBatchDuration: val });
                        }}
                        min={Options.studyMinutes.min}
                        max={Options.studyMinutes.max}
                        value={options.studyBatchDuration}
                        tooltipFormatter={(value) => `${value} minutes`}
                    />
                </label>
                <br />
                <label>
                    break-time duration:
                    <Space />
                    {options.breakTimeDuration}
                    <Range
                        onSlChange={(e) => {
                            const val: number = EventUtil.value(e) ?? options.breakTimeDuration;
                            update({ ...options, breakTimeDuration: val });
                        }}
                        min={Options.breakMinutes.min}
                        max={Options.breakMinutes.max}
                        value={options.breakTimeDuration}
                        tooltipFormatter={(value) => `${value} minutes`}
                    />
                </label>
                <br />
                <label>
                    <Checkbox
                        checked={options.autoAdjust}
                        onSlChange={(e) => {
                            const checked = EventUtil.isChecked(e);
                            update({ ...options, autoAdjust: checked });
                        }}
                    >
                        auto-adjust duration
                    </Checkbox>
                    <br />
                    The break time and study batch time will increase or decrease automatically.
                    This is to add randomness and variation to the spacing.
                </label>
            </Container>
        );
    }
    const Container = styled.div`
        padding: ${Shoe.spacing_small};
    `;

    export namespace Options {
        export const studyMinutes = { min: 1, max: 60, default: 5 };
        export const breakMinutes = { min: 1, max: 60, default: 2 };

        const schema = z.object({
            studyBatchDuration: z.number(),
            breakTimeDuration: z.number(),
            autoAdjust: z.boolean(),
        });
        export type T = z.infer<typeof schema>;

        export const defaultOptions: T = {
            studyBatchDuration: studyMinutes.default,
            breakTimeDuration: breakMinutes.default,
            autoAdjust: true,
        };

        const lsKey = "grind-options";
        export function load() {
            const res = schema.safeParse(tryJSONParse(localStorage.getItem(lsKey) ?? ""));
            if (!res.success) {
                return { ...defaultOptions };
            }
            return res.data;
        }
        export function save(options: T) {
            localStorage.setItem(lsKey, JSON.stringify(options));
            current = options;
        }
        export let current = load();

        function onChange(fn: Action) {}
    }
}
export const GrindSettings = GrindSettings$.View;
