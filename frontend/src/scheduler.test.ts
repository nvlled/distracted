import { ShortAlternating } from "./scheduler";

describe("ShortAlternating", () => {
    type Item = {
        id: number;
        interval: number;
        correctChance: number;
        counter: number;
        numRecall: number;
        numForget: number;
        consecRecall: number;
        consecForget: number;
        proficiency: number;
    };
    function create(id: number, correctChance = 0.5): Item {
        return {
            id,
            interval: 0,
            correctChance,
            counter: 0,
            numForget: 0,
            numRecall: 0,
            consecForget: 0,
            consecRecall: 0,
            proficiency: 0,
        };
    }
    test("scheduling", () => {
        let counter = 0;
        const batchSize = 8;
        const cards = [
            create(101, 0.7),
            create(102, 0.7),
            create(103, 0.7),
            create(104, 0.75),
            create(105),
        ];
        for (let i = cards.length + 1; i < 40; i++) {
            cards.push(create(100 + i, 0.7));
        }
        console.log(cards.map((c) => c.id));

        // this looks fine
        // with 50 cards and 50 batches,
        // all cards gets a chance to be seen
        // and the difficult ones appear more often
        // and the easier ones appear less and less more often
        // and the algorithm still works well with few cards
        // yeah this should be fine for now

        const lines: string[] = [];
        for (let batch = 0; batch < 50; batch++) {
            const line = [`b=${batch}, c=${counter}`.padEnd(20)];
            //const s = new Set<number>();
            for (let i = 0; i < batchSize; i++) {
                const { item, nextCounter } = ShortAlternating.nextDue(counter, batchSize, cards);
                if (!item) {
                    break;
                }
                item.counter++;
                //if (!s.has(item.id)) {
                //    item.counter++;
                //    s.add(item.id);
                //}
                counter = nextCounter;

                if (Math.random() < item.correctChance) {
                    item.consecForget = 0;
                    item.consecRecall++;
                    item.interval += Math.floor(1 + (item.consecRecall - 1));
                } else if (item.interval > 0) {
                    item.interval -= 1;
                    item.consecRecall = 0;
                    item.consecForget++;
                    item.interval += Math.floor(1 + (item.consecForget - 1));
                }
                line.push(
                    `${item.id.toString().padStart(3)},${item.interval.toString().padStart(2)}`,
                );
            }
            lines.push(line.join(" | "));
        }
        console.log(lines.join("\n"));

        cards.sort((a, b) => a.interval - b.interval);
        console.log(cards.map((c) => `${c.id}, ${c.interval}, ${c.counter}`).join(" | "));
    });
});
