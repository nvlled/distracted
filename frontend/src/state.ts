import { atom } from "jotai";
import { ReactNode } from "react";
import { main } from "../wailsjs/go/models";
import { GrindSettings$ } from "./App";
import { Card } from "./card";
import { MainPages, nop } from "./lib";
import { CardSort } from "./playground";

export interface AppDrawerOptions {
    title?: string;
    keepOpen?: boolean;
    width?: string;
}

export interface ToastOptions {
    variant?: "default" | "primary" | "success" | "neutral" | "warning" | "danger" | "text";
    duration?: number;
}

const actions = {
    changePage: (name: MainPages) => {},
    toggleNotes: nop,
    setDrawer: (options: AppDrawerOptions, content: ReactNode) => {},
    showGrindSettings: (_: (options: GrindSettings$.Options.T) => void) => {},
    toastInfo: (message: string, options?: ToastOptions) => {},
    removeDrillCard: (cardID: number) => {},
    updateDrillCard: (card: Card) => {},
    saveCards: (cards: Card[]) => {},
};
export type AppActions = typeof actions;

export const appState = {
    audio: atom(new Audio()),
    youtubeQueue: atom([] as { filename: string; link: string }[]),
    userData: atom(main.UserData.createFrom()),
    mainPage: atom("home" as MainPages),

    drillCards: atom([] as Card[]),
    drillSort: atom({ type: "added", desc: false } as CardSort.Sort),

    allUserCards: atom([] as main.CardData[]),

    currentDrillCard: atom(null as Card | null),

    // TODO: remove
    deckFiles: atom({} as Record<string, main.CardFile[] | undefined>),

    decks: atom([] as string[]),

    currentCard: atom(undefined as Card | undefined),

    distractionMode: atom(false),

    actions: atom(actions as AppActions),

    showKeybindings: atom(true),
};
