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

    updateCardStat: async (card: Card) => {},

    addDrillCard: (cardID: number) => {},
    removeDrillCard: (cardID: number) => {},
    updateDrillCards: (cards: Card[]) => {},
};
export type AppActions = typeof actions;

export const appState = {
    userData: atom(main.UserData.createFrom()),
    mainPage: atom("home" as MainPages),

    drillCardIDs: atom([] as number[]),
    drillPendingSave: atom(false),
    drillSort: atom({ type: "added", desc: false } as CardSort.Sort),

    loadedCardsVersion: atom(0 as number),

    decks: atom([] as string[]),

    actions: atom(actions as AppActions),

    showKeybindings: atom(false),
};
