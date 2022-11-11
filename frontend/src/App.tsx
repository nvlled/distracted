import { ReactNode, useState } from "react";
import * as app from "../wailsjs/go/main/App";
import * as runtime from "../wailsjs/runtime";
import { useAtom } from "jotai";
import { AppActions, AppDrawerOptions, appState, ToastOptions } from "./state";
import { Card } from "./card";
import styled from "styled-components";
import { Action, Action1, deferInvoke, MainPages, tryJSONParse } from "./lib";
import { config, setConfig } from "./config";

import "./styles/App.css";
import "./styles/style.css";
import "@shoelace-style/shoelace/dist/themes/dark.css";

import { CardSort, Playground } from "./playground";
import { GrindStudySession } from "./SessionDrill";
import { Checkbox, Drawer, EventUtil, Range, Shoe } from "./shoelace";
import { Space, ToggleKeybindInfo } from "./components";
import { useOnMount, useInterval, useSomeChanged, useChanged } from "./hooks";
import { z } from "zod";
import {
    addListener,
    getCardByID,
    load as loadAllCards,
    update as updateLoadedCard,
} from "./loadedCards";

const DrawerContainer = styled.div<{ width?: string }>`
    > sl-drawer {
        ${(props) => (props.width ? `--size: ${props.width};` : "")}
    }
`;
const AppContainer = styled.div``;

let appInitialized = false;
function App() {
    const [, setActions] = useAtom(appState.actions);
    const [, setDecks] = useAtom(appState.decks);
    const [, setUserData] = useAtom(appState.userData);
    const [drillCardIDs, setDrillCardIDs] = useAtom(appState.drillCardIDs);
    const [drillSort, setDrillSort] = useAtom(appState.drillSort);
    const [mainPage, setMainPage] = useAtom(appState.mainPage);
    const [, setLoadedCardsVersion] = useAtom(appState.loadedCardsVersion);
    const [, setInitialized] = useState(false);
    const [sortedCards, setSortedCardIDs] = useState<number[]>([]);

    const [drawerContent, setDrawerContent] = useState<ReactNode | null>(null);
    const [drawerOptions, setDrawerOptions] = useState<AppDrawerOptions | null>(null);

    useOnMount(() => {
        if (appInitialized) return;
        appInitialized = true;
        console.log("app init");

        const appActions: AppActions = {
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

            async updateCardStat(card: Card) {
                await app.PersistCardStats(card);
                updateLoadedCard(card);
            },

            addDrillCard(cardID: number) {
                setDrillCardIDs((ids) => ids.concat(cardID));
            },
            removeDrillCard(cardID: number) {
                setDrillCardIDs((ids) => ids.filter((id) => id !== cardID));
            },
            updateDrillCards(cards: Card[]) {
                setDrillCardIDs(cards.map((c) => c.id));
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
        };
        setActions(appActions);

        async function init() {
            const [userData, decks, cardIDs, _] = await Promise.all([
                app.GetUserData(),
                app.GetDecks(),
                app.GetDailyStudyCardIds(),
                loadAllCards(),
            ]);

            addListener(() => {
                setLoadedCardsVersion((v) => v + 1);
            });

            setUserData(userData);
            setDecks(decks);
            setDrillSort(CardSort.loadDrillSort());
            setDrillCardIDs(cardIDs);

            setInitialized(true);

            runtime.EventsOn("card-file-updated", async (data) => {
                if (typeof data !== "string") {
                    return;
                }
                const cardData = await app.GetCard(data);
                const card = Card.parse(cardData);
                updateLoadedCard(card);
            });

            app.ClearBreakTimeNotifiers();
        }

        init();
        window.onbeforeunload = () => {
            app.ClearWatchedFiles();
        };
    });

    if (useChanged(drillCardIDs)) {
        saveCards(drillCardIDs.map((id) => getCardByID(id)));
    }

    if (useSomeChanged(drillSort.type, drillSort.desc)) {
        CardSort.saveDrillSort(drillSort);
    }

    useInterval(30 * 60 * 1000, async () => {
        const config = await app.GetConfig();
        setConfig(config);
    });

    if (!appInitialized) {
        return <div>loading</div>;
    }

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

            {mainPage === "intro" ? (
                "TODO"
            ) : mainPage == "drill" ? (
                <GrindStudySession
                    sessionName={config().defaultStudyName}
                    initCardIDs={sortedCards}
                    onQuit={() => setMainPage("home")}
                />
            ) : mainPage == "home" ? (
                <Playground
                    onSubmit={() => {
                        const cards = drillCardIDs.map((id) => getCardByID(id));
                        const sorted = CardSort.sort(drillSort.type, drillSort.desc, cards);
                        setSortedCardIDs(sorted.map((c) => c.id));
                        setMainPage("drill");
                    }}
                />
            ) : (
                <div>unknown page</div>
            )}
        </AppContainer>
    );
}
export default App;

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

const saveCards = deferInvoke(1000, (cards: Card[]) => {
    app.CreateStudySession(
        config().defaultStudyName,
        config().studySessionTypes.normal,
        cards.map((c) => c.path),
    );
});
