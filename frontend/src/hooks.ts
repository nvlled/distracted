import { useAtom } from "jotai";
import { useCallback, useEffect, useRef, useState } from "react";
import { app } from "./api";
import { Card } from "./card";
import { Action, Action1, createPair, getCard, invoke } from "./lib";
import { appState } from "./state";

export function usePreviousSessionIDs() {
    const [ids, setIDs] = useState(new Set<number>());
    useEffect(() => {
        invoke(async () => {
            setIDs(new Set(await app.PreviousSessionCardIDs()));
        });
    }, []);
    return ids;
}

export function useOnMount(fn: () => void | Promise<void>) {
    // eslint-disable-next-line
    useEffect(() => {
        fn();
    }, []);
}
export function useOnUnmount(fn: Action) {
    const savedCallback = useRef<Action | null>();

    useEffect(() => {
        savedCallback.current = fn;
    });
    useEffect(() => {
        return () => savedCallback.current?.();
    }, []);
}

export function useChanged<T>(x: T) {
    const [y, setY] = useState(x);
    let changed = false;
    if (x !== y) {
        setY(x);
        changed = true;
    }
    return changed;
}

export function useAllChanged(...tuple: unknown[]) {
    const [prev, setPrev] = useState(tuple);

    let allChanged = true;
    for (let i = 0; i < tuple.length; i++) {
        if (prev[i] == tuple[i]) {
            allChanged = false;
        }
    }
    if (allChanged) {
        setPrev(tuple);
    }

    return allChanged;
}

export function useSomeChanged(...tuple: unknown[]) {
    const [prev, setPrev] = useState(tuple);

    let someChanged = false;
    for (let i = 0; i < tuple.length; i++) {
        if (prev[i] !== tuple[i]) {
            someChanged = true;
            setPrev(tuple);
            break;
        }
    }

    return someChanged;
}

export function useDrillCards() {
    const [ids, setIDs] = useAtom(appState.drillCardIDs);
    const [cardMap] = useAtom(appState.allCardMap);
    const [cards, setCards] = useState<Card[]>([]);

    function updateCards(cards: Card[]) {
        const newIDs = cards.map((c) => c.id);
        console.log("updateCards", ids, newIDs);
        setIDs(newIDs);
    }

    if (useSomeChanged(ids, cardMap)) {
        setCards(ids.map((id) => getCard(id, cardMap)));
    }

    useOnMount(function () {
        setCards(ids.map((id) => getCard(id, cardMap)));
    });

    return createPair(cards, updateCards);
}

export function useCards(ids: number[]): Card[] {
    const [cardMap] = useAtom(appState.allCardMap);
    const [cards, setCards] = useState<Card[]>([]);

    if (useSomeChanged(ids, cardMap)) {
        setCards(ids.map((id) => getCard(id, cardMap)));
    }
    useOnMount(function () {
        setCards(ids.map((id) => getCard(id, cardMap)));
    });

    return cards;
}

export function useKeyPress(keyName: string | "any", fn: Action1<string>) {
    const savedCallback = useRef<Action1<string> | null>();

    const handler = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === keyName || keyName === "any") {
                savedCallback.current?.(e.key);
            }
        },
        [keyName],
    );

    useEffect(() => {
        savedCallback.current = fn;
    });

    useOnMount(() => {
        window.addEventListener("keyup", handler);
    });
    useOnUnmount(() => {
        window.removeEventListener("keyup", handler);
    });
}
