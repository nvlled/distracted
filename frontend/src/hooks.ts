import { useEffect, useRef, useState } from "react";
import { app } from "./api";
import { Action, invoke } from "./lib";

export function usePreviousSessionIDs() {
    const [ids, setIDs] = useState(new Set<number>());
    useEffect(() => {
        invoke(async () => {
            setIDs(new Set(await app.PreviousSessionCardIDs()));
        });
    }, []);
    return ids;
}

export function useOnMount(fn: Action) {
    // eslint-disable-next-line
    useEffect(() => fn(), []);
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
