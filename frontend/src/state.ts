import { atom } from "jotai";
import { main } from "../wailsjs/go/models";
import { Card } from "./card";
import { MainPages } from "./lib";

export const appState = {
    audio: atom(new Audio()),
    youtubeQueue: atom([] as { filename: string; link: string }[]),
    config: atom(main.Config.createFrom()),
    userData: atom(main.UserData.createFrom()),
    mainPage: atom("home" as MainPages),
    drillCards: atom([] as Card[]),
    currentDrillCard: atom(null as Card | null),
    deckFiles: atom({} as Record<string, main.CardFile[] | undefined>),
    currentCard: atom(undefined as Card | undefined),

    distractionMode: atom(false),
};
