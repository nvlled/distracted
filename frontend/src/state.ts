import { atom } from "jotai";
import { ReactNode } from "react";
import { main } from "../wailsjs/go/models";
import { Card } from "./card";
import { MainPages, nop } from "./lib";

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
    showGrindSettings: () => {},
    toastInfo: (message: string, options?: ToastOptions) => {},
    removeDrillCard: (cardID: number) => {},
    saveCards: (cards: Card[]) => {},
};
export type AppActions = typeof actions;

export const appState = {
    audio: atom(new Audio()),
    youtubeQueue: atom([] as { filename: string; link: string }[]),
    userData: atom(main.UserData.createFrom()),
    mainPage: atom("home" as MainPages),

    drillCards: atom([] as Card[]),

    allUserCards: atom([] as main.CardData[]),

    currentDrillCard: atom(null as Card | null),

    // TODO: remove
    deckFiles: atom({} as Record<string, main.CardFile[] | undefined>),

    decks: atom([] as string[]),

    currentCard: atom(undefined as Card | undefined),

    distractionMode: atom(false),

    actions: atom(actions as AppActions),
};
