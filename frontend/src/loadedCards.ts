import { app, main } from "./api";
import { Card } from "./card";
import { Action1 } from "./lib";

export type CardEntry = main.CardData;

const cards: CardEntry[] = [];
const indexCache = new Map<number, number>();

export type Listener = Action1<CardEntry | null>;
const listeners = new Set<Listener>();

export async function load() {
    cards.push(...(await app.ListAllCards()));

    for (const fn of listeners) {
        fn(null);
    }
}

function getIndex(card: CardEntry): number {
    let index = indexCache.get(card.id);
    if (index === undefined) {
        index = cards.findIndex((c) => c.id === card.id);
    }
    if (index === undefined) {
        index = cards.length;
        indexCache.set(card.id, index);
        cards.push(card);
    }
    return index;
}

export async function addListener(fn: Listener) {
    listeners.add(fn);
}
export async function removeListener(fn: Listener) {
    listeners.delete(fn);
}

export async function remove(cardPath: string) {
    const index = cards.findIndex((c) => c.path === cardPath);
    if (index >= 0 && index < cards.length) {
        if (cards[index]) indexCache.delete(cards[index].id);
        cards.splice(index, 1);
    }
}

export async function update(card: Card, op: "WRITE" | "CREATE" | "REMOVE" | string) {
    if (op == "REMOVE") return;

    const newEntry: main.CardData = {
        interval: card.interval,
        proficiency: card.proficiency,
        numRecall: card.numRecall,
        numForget: card.numRecall,
        consecRecall: card.consecRecall,
        consecForget: card.consecForget,
        lastUpdate: card.lastUpdate,
        counter: card.counter,
        id: card.id,
        deckName: card.deckName,
        filename: card.filename,
        path: card.path,
        contents: card.contents,
        order: card.order,
        lastRecallDate: card.lastRecallDate,
    };

    const index = getIndex(card);
    cards[index] = newEntry;

    for (const fn of listeners) {
        fn(cards[index]);
    }
}

export function getCardByID(id: number): Card {
    const emptyCard = Card.createEmpty();
    emptyCard.id = -Date.now();
    emptyCard.filename = `unknown card id: ${id}`;

    let index = indexCache.get(id);
    if (index === undefined) {
        index = cards.findIndex((c) => c.id === id);
    }
    if (!indexCache.has(id)) {
        indexCache.set(id, index);
    }

    if (index === undefined) {
        return emptyCard;
    }
    const entry = cards[index];
    if (index === undefined) {
        return emptyCard;
    }
    return Card.parse(entry);
}

export function* iterate() {
    for (const c of cards) {
        yield c;
    }
}
