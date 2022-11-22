import { useAtom } from "jotai";
import { useEffect, useRef, useState } from "react";
import { app, cardEvents } from "./api";
import { Card } from "./card";
import { Action, Action1, createPair, invoke } from "./lib";
import { getCardByID } from "./loadedCards";
import { appState } from "./state";

export function usePreviousSessionIDs() {
    const [ids, setIDs] = useState(new Set<number>());
    useOnMount(() => {
        invoke(async () => {
            setIDs(new Set(await app.PreviousSessionCardIDs()));
        });
    });
    return ids;
}

export function useOnMount(fn: () => void | Promise<void>) {
    useEffect(() => {
        fn();
        // eslint-disable-next-line
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
    const [loadedCardsVersion] = useAtom(appState.loadedCardsVersion);
    const [cards, setCards] = useState<Card[]>([]);

    function updateCards(cards: Card[]) {
        const newIDs = cards.map((c) => c.id);
        console.log("updateCards", ids, newIDs);
        setIDs(newIDs);
    }

    if (useSomeChanged(ids, loadedCardsVersion)) {
        setCards(ids.map((id) => getCardByID(id)));
    }

    useOnMount(function () {
        setCards(ids.map((id) => getCardByID(id)));
    });

    return createPair(cards, updateCards);
}

export function useCards(ids: number[]): Card[] {
    const [loadedCardsVersion] = useAtom(appState.loadedCardsVersion);
    const [cards, setCards] = useState<Card[]>([]);

    if (useSomeChanged(ids, loadedCardsVersion)) {
        setCards(ids.map((id) => getCardByID(id)));
    }
    useOnMount(function () {
        setCards(ids.map((id) => getCardByID(id)));
    });

    return cards;
}

export function useKeyPress(keyName: string | "any", fn: Action1<string>) {
    const savedCallback = useRef<Action1<string> | null>();

    const handler = useFn((e: KeyboardEvent) => {
        if (e.key === keyName || keyName === "any") {
            savedCallback.current?.(e.key);
        }
    });

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

export function useCardWatch(watchedCard: Card) {
    const [card, setCard] = useState(watchedCard);

    if (useChanged(watchedCard)) {
        setCard(watchedCard);
    }

    // this only works for props though
    // this will bite me again later if I'm not careful
    // aha, now it works with state and props
    // useFn may be less efficient than useCallback,
    // but at least it more predictable and doesn't
    // need some shitty deps
    // At this point, I'm convinced useEffect and any
    // hooks that has deps is a mistake, should
    // only be used on really rare cases.
    // There's eslint, but I've encountered
    // cases where eslint couldn't detect the problems.

    const handler = useFn((card: Card) => {
        if (card.path === watchedCard.path) {
            setCard(card);
        }
    });

    /*

    */

    // useEffect and deps sure is full of buggy landmines
    // it's very counter to my intuition on how normal
    // js code works
    // if I have to think and look really hard to
    // see the problem, even for a simple code, then I would say
    // ergonomics is pretty bad

    //useEffect(() => {
    //    cardEvents.addListener(handler.current);
    //    return () => cardEvents.removeListener(handler.current);
    //}, [handler]);

    useOnMount(() => cardEvents.addListener(handler));
    useOnUnmount(() => cardEvents.removeListener(handler));

    return createPair(card, setCard);
}

// referred from https://overreacted.io/making-setinterval-declarative-with-react-hooks/
export function useInterval(millis: number, fn: Action) {
    const savedCallback = useRef<Action | null>();

    useEffect(() => {
        savedCallback.current = fn;
    });

    useEffect(() => {
        const id = window.setInterval(() => savedCallback.current?.(), millis);
        return () => clearInterval(id);
    }, [millis]);
}

// useFn is similar to useCallback, except it doesn't
// need deps to refer to current state. Can be used for event
// listeners.

// eslint-disable-next-line @typescript-eslint/ban-types
export function useFn<T extends Function>(fn: T) {
    const innerFnRef = useRef(fn);

    useEffect(() => {
        innerFnRef.current = fn;
    });

    const outerFnRef = useRef((...args: unknown[]) => {
        return innerFnRef.current(...args);
    });
    return outerFnRef.current;
}

export function useDecks() {
    const [decks, setDecks] = useState<string[]>([]);
    useOnMount(async () => {
        const decks = await app.GetDecks();
        setDecks(decks);
    });

    return decks;
}

export function useOnClickOutside(node: Node | undefined | null, fn: Action) {
    const handler = useFn((e: MouseEvent) => {
        if (!node) return;
        let target = e.target as Node | null;
        let outside = true;
        while (target) {
            if (target === node) {
                outside = false;
                break;
            }
            target = target.parentNode;
        }
        if (outside) {
            fn();
        }
    });
    useOnMount(() => window.addEventListener("click", handler));
    useOnUnmount(() => window.removeEventListener("click", handler));
}
