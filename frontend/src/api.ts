import { Card } from "./card";
import { Action1, Events } from "./lib";

export const constants = {
    defaultCollectionName: "<no-name autosave>",
};

export namespace cardEvents {
    const _events: Events<Card> = { listeners: new Set() };
    export function addListener(fn: Action1<Card>) {
        Events.addListener(_events, fn);
    }
    export function removeListener(fn: Action1<Card>) {
        Events.removeListener(_events, fn);
    }
    export function emit(data: Card) {
        Events.emit(_events, data);
    }
}

export { main } from "../wailsjs/go/models";

export * as api from "../wailsjs/go/main/App";

export * as app from "../wailsjs/go/main/App";

export * as runtime from "../wailsjs/runtime";

export * as wailsExt from "../wailsjs/go/main/WailsExt";
