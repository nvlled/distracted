import { useEffect, useRef, useState } from "react";
import { app, cardEvents } from "./api";
import { Card } from "./card";

export type MainPages = "intro" | "drill" | "home" | "prepare";

export type Action = () => void;
export type Action1<A> = (a: A) => void;
export type Action2<A, B> = (a: A, b: B) => void;
export type Action3<A, B, C> = (a: A, b: B, c: C) => void;
export type Action4<A, B, C, D> = (a: A, b: B, c: C, d: D) => void;

export async function handleError<T>(
    promise: Promise<T | Error>,
): Promise<[T, undefined] | [undefined, Error]> {
    try {
        return [(await promise) as T, undefined];
    } catch (e) {
        if (typeof e === "string") {
            return [undefined, new Error(e)];
        }
        if (e instanceof Error) {
            return [undefined, e];
        }
        console.log(typeof e);
    }
    throw new Error("should not happen");
}

export function invoke(fn: () => void) {
    fn();
}
export function wrapAsyncEffect(fn: () => void) {
    return () => {
        fn();
    };
}

export function useAsyncEffect(fn: () => void) {
    useEffect(() => {
        fn();
    }, [fn]);
}

export function useAsyncEffectUnmount(fn: () => Promise<Action>) {
    useEffect(() => {
        let unmount: Action;
        (async () => {
            unmount = await fn();
        })();

        return () => {
            unmount?.();
        };
    }, [fn]);
}

export function range(n: number): number[] {
    const result: number[] = [];
    for (let i = 0; i < n; i++) {
        result.push(i);
    }
    return result;
}
export function shuffle<T>(xs: T[]): T[] {
    if (xs.length <= 1) {
        return xs;
    }
    xs = xs.slice();
    for (let i = 0; i < xs.length; i++) {
        let j = i;
        for (let n = 0; n < xs.length; n++) {
            j = Math.floor(Math.random() * xs.length);
            if (j != i) break;
        }

        [xs[i], xs[j]] = [xs[j], xs[i]];
    }
    return xs;
}

export function randomElem<T>(xs: T[]): T | undefined {
    const i = Math.floor(Math.random() * xs.length);
    return xs[i];
}

export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function formatDuration(durationInSeconds: number) {
    const f = (n: number) => n.toFixed(1);
    const second = 1;
    const minute = 60 * second;
    const hour = 60 * minute;
    const day = 24 * hour;

    const n = durationInSeconds;
    if (n < minute) {
        return `${f(n)} seconds`;
    }
    if (n < hour) {
        return `${f(n / minute)} minutes`;
    }
    if (n < day) {
        return `${f(n / hour)} hours`;
    }

    return `${f(n / day)} days`;
}

export interface Events<T> {
    listeners: Set<Action1<T>>;
}
export namespace Events {
    export function addListener<T>(events: Events<T>, fn: Action1<T>) {
        events.listeners.add(fn);
    }
    export function removeListener<T>(events: Events<T>, fn: Action1<T>) {
        events.listeners.delete(fn);
    }
    export function emit<T>(events: Events<T>, data: T) {
        console.log("num listeners ", events.listeners.size);
        for (const fn of events.listeners) {
            console.log("emitting event to ", fn);
            fn(data);
        }
    }
}

/*
export namespace MuxEvents {
    export type Event = { name: string; data: unknown };

    let commonEventName = "global";
    let initialized = false;
    const listeners = new Set<Action1<Event>>();

    export function initialize() {
        runtime.EventsOn(commonEventName, onEvent);
        initialized = true;
    }
    function onEvent(data: any) {
        for (const fn of listeners) {
            fn(data);
        }
    }
}
*/

export function between(n: number, a: number, b: number) {
    if (b < a) [a, b] = [b, a];
    return n >= a && n <= b;
}

export function sortNumbers(...xs: number[]) {
    xs.sort();
    return xs;
}

//https://stackoverflow.com/a/15289883
export function dateDiffInDays(unixTime1: number, unixTime2: number) {
    const a = new Date(unixTime1 * 1000);
    const b = new Date(unixTime2 * 1000);
    const _MS_PER_DAY = 1000 * 60 * 60 * 24;
    // Discard the time and time-zone information.
    const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());

    return Math.floor((utc1 - utc2) / _MS_PER_DAY);
}

export function yesterDate() {
    const date = new Date(new Date().setDate(new Date().getDate() - 1));
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();
    return d + m * 100 + y * 10000;
}
export function currentDate() {
    const date = new Date();
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();
    return d + m * 100 + y * 10000;
}

export const OrderedSet = {
    get: function <T extends { id: number }>(xs: T[], id: number | undefined) {
        if (id === undefined) return;

        for (const y of xs) {
            if (y.id === id) {
                return y;
            }
        }
        return null;
    },
    add: function <T>(xs: T[], x: T) {
        if (xs.includes(x)) {
            return;
        }
        xs.push(x);
    },
    remove: function <T>(xs: T[], x: T) {
        const i = xs.findIndex((y) => y === x);
        if (i >= 0) {
            xs.splice(i, 1);
        }
    },
};

export function isSymbol(s: string) {
    switch (s) {
        case "`":
        case "~":
        case "!":
        case "@":
        case "#":
        case "$":
        case "%":
        case "^":
        case "&":
        case "*":
        case "(":
        case ")":
        case "-":
        case "_":
        case "=":
        case "+":
        case "{":
        case "}":
        case "[":
        case "]":
        case "\\":
        case "|":
        case ";":
        case ":":
        case '"':
        case "'":
        case "<":
        case ">":
        case ",":
        case ".":
        case "/":
        case "?":
        case "\n":
        case "\t":
        case "、":
        case "。":
        case "「":
        case "」":
        case "『":
        case "』":
        case "〜":
        case "・":
        case " ":
        case "぀":
            return true;
    }
    return false;
}

export function clamp(x: number, min: number, max: number) {
    return x < min ? min : x > max ? max : x;
}

export type TypeOf =
    | "string"
    | "number"
    | "bigint"
    | "boolean"
    | "symbol"
    | "undefined"
    | "object"
    | "function";
export function hasProp<K extends PropertyKey>(
    data: any, // eslint-disable-line
    prop: K,
    type?: TypeOf,
): data is Record<K, unknown> {
    if (type) {
        return prop in data && typeof data[prop] === type;
    }
    return prop in data;
}

export function tryJSONParse(str: string): unknown {
    try {
        return JSON.parse(str);
    } catch (e) {
        //console.log("failed to parse JSON", e);
        return null;
    }
}

export function removeTrailingSlash(s: string) {
    const n = s.length - 1;
    if (s[0] === "/") s = s.slice(1);
    if (s[n] === "/") s = s.slice(0, n);
    return s;
}

export function getPathName(url: string) {
    return new URL(url).pathname;
}

export function lastElem<T>(xs: T[]) {
    return xs[xs.length - 1] ?? undefined;
}

export function findAllIndices<T>(xs: T[], x: T) {
    const result = [];
    for (let i = 0; i < xs.length; i++) {
        if (xs[i] === x) result.push(i);
    }
    return result;
}

export const useOnce = (() => {
    const map = new Map();
    return <T>(context: unknown, fn: () => T): T => {
        let data = map.get(context) as T | undefined;
        if (!data) {
            data = fn();
            map.set(context, data);
        }
        return data;
    };
})();

type TypePredicate<T> = (x: unknown) => x is T;
// TODO: replace with zod
export class LocalStorageSerializer<T> {
    defaultState: T;
    public lastState: T;
    typePredicate: TypePredicate<T>;
    lsKey: string;

    constructor(defaultState: T, lsKey: string, typePredicate: TypePredicate<T>) {
        this.defaultState = defaultState;
        this.typePredicate = typePredicate;
        this.lsKey = lsKey;
        this.lastState = this.load();
    }

    load(): T {
        const data = tryJSONParse(localStorage.getItem(this.lsKey) ?? "");
        if (this.typePredicate(data) && data) {
            this.lastState = data;
            return data;
        }

        this.lastState = { ...this.defaultState };
        return this.lastState;
    }

    // eslint-disable-next-line
    update(fn: (x: T) => any) {
        const val = this.lastState;
        fn(this.lastState);
        localStorage.setItem(this.lsKey, JSON.stringify(val));
        this.lastState = val;
    }
    save(val?: T) {
        val = val ?? this.lastState;
        localStorage.setItem(this.lsKey, JSON.stringify(val));
        this.lastState = val;
    }
}

export function randomColor() {
    const f = () => Math.floor(Math.random() * 255).toString(16);
    return ["#", f(), f(), f()].join("");
}

export function k(obj: object) {
    for (const k of Object.keys(obj)) return k;
    return "";
}

export function getRelatedCharacters(str: string, count = 10): string[] {
    const set = new Set<string>();
    let n = Math.floor(Math.random() * 3);
    for (let i = 0; i < 100; i++) {
        if (set.size >= count) break;

        if (i % str.length === 0) n++;

        const cp = str.codePointAt(i % str.length);
        if (cp) {
            let ch = "";
            ch = String.fromCharCode(cp + n);
            if (!isSymbol(ch)) set.add(ch);

            ch = String.fromCharCode(cp - n);
            if (!isSymbol(ch)) set.add(ch);
        }
    }

    const result: string[] = [];
    for (const c of set) result.push(c);

    return result;
}

export function createPair<A, B>(a: A, b: B): [A, B] {
    return [a, b];
}
export function useCardWatch(cardInit: Card) {
    const [card, setCard] = useState(cardInit);
    useEffect(() => {
        cardEvents.addListener((card) => {
            setCard(card);
        });
        app.WatchCardFile(cardInit.path);
        return () => {
            app.UnwatchCardFile(cardInit.path);
        };
    }, [cardInit.path]);

    return createPair(card, setCard);
}

export function partition<T>(xs: T[], p: (x: T) => boolean): [T[], T[]] {
    const left: T[] = [];
    const right: T[] = [];
    for (const x of xs) {
        if (p(x)) left.push(x);
        else right.push(x);
    }
    return [left, right];
}

export function useInterval(millis: number, fn: Action, deps: unknown[]) {
    const timerRef = useRef<number | undefined>(undefined);

    useEffect(() => {
        window.clearInterval(timerRef.current);

        timerRef.current = window.setInterval(() => {
            fn();
        }, millis);

        return () => window.clearInterval(timerRef.current);

        // eslint-disable-next-line
    }, [millis, ...deps]);
}

export function nop() {
    /* do nothing */
}
export function identity<T>(x: T) {
    return x;
}

export function waitEvent(elem: HTMLElement, event: string): Promise<void> {
    return new Promise((resolve) => {
        const fn = () => {
            elem.removeEventListener(event, fn);
            resolve();
        };
        elem.addEventListener(event, fn);
    });
}
