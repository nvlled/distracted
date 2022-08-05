import { Factors, FactorTrial } from "./factors";
import { Assert, randomElem } from "./lib";

export namespace ShortAlternating {
    export interface Item {
        id: number;
        interval: number;
        numRecall: number;
        numForget: number;
        consecRecall: number;
        consecForget: number;
        proficiency: number;
    }

    export function nextDue<T extends Item>(
        counter: number,
        batchSize: number,
        items: T[],
    ): { item: T | undefined; nextCounter: number } {
        const defaultResult = { item: undefined, nextCounter: counter };
        if (items.length === 0) return defaultResult;

        const maxInterval = items.reduce((a, b) => (a.interval > b.interval ? a : b)).interval;

        let nextCounter = counter;
        const allDueItems: T[] = [];
        for (let i = 0; i < maxInterval + 1; i++) {
            const dueCards = getDueCards(items, nextCounter);
            allDueItems.push(...dueCards);
            nextCounter++;

            if (allDueItems.length >= batchSize) {
                break;
            }
        }

        allDueItems.sort(orderByIntervalDesc);
        console.log(items.map((c) => c.interval));
        const item = randomElem(allDueItems.slice(0, batchSize));
        //const item = allDueItems[0];
        if (item) return { item: item, nextCounter };

        return defaultResult;
    }
    export function getDueCards<T extends Item>(cards: T[], counter: number) {
        return cards.filter((c) => c.interval < 0 || Math.floor(counter % c.interval) === 0);
    }

    export function studyCard<T extends Item>(card: T, trial: FactorTrial, recalled: boolean) {
        card = { ...card };
        if (recalled) {
            card.numRecall++;
            card.consecRecall++;
            card.consecForget = 0;

            if (!trial.observation) {
                card.proficiency = Factors.incrementProficiency(card.proficiency, trial.presented);
            }
            card.proficiency = Factors.incrementProficiency(card.proficiency, trial.tested, 2);

            console.log("next proficiency", Factors.get(card.proficiency));
            console.log("prev interval", card.interval);
            card.interval += Math.floor(
                1 + Math.floor(card.consecRecall * Factors.getAverage(card.proficiency)),
            );
            console.log("next interval", card.interval);
        } else {
            card.numForget++;
            card.consecForget++;
            card.consecRecall = 0;
            card.interval -= Math.floor(1 + (card.consecForget - 1) / 2);
        }

        if (card.interval < 0) {
            card.interval = 0;
        }

        return card;
    }

    function orderByIntervalDesc<T extends Item>(card1: T, card2: Item) {
        if (card1.interval === card2.interval) {
            return card1.consecRecall - card2.consecRecall;
        }
        return card2.interval - card1.interval;
    }
}
