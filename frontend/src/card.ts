import { marked } from "marked";
import { main } from "../wailsjs/go/models";
import { config } from "./config";
import { Factor, FactorData, FactorID, Factors, FactorTrial } from "./factors";
import { currentDate, getPathName, randomElem, removeTrailingSlash } from "./lib";

export const baseLearnLevel = 0;
export const baseReviewLevel = 11;

export type CardPhase = typeof CardPhase.values[number];
export namespace CardPhase {
    export const values = ["learn", "review", "new"] as const;

    export function getColor(phase: CardPhase) {
        return phase === "learn" ? "cyan" : phase === "review" ? "yellow" : "white";
    }
}

export const directivePrefix = "@";

export type ViewID = "start" | "select" | "in-session";

export const cardDirectiveKeys = ["tags", "id", "keyword"];
export const resourceDirective = ["image", "audio"]; // TODO: remove
export const allDirectives = resourceDirective.concat(cardDirectiveKeys);

export type CardDirectiveKeys = typeof cardDirectiveKeys[number];
export type SideDirectiveKeys = typeof cardDirectiveKeys[number];

export type Entry = { name: string; value: string };

export type CardFaceData = {
    text: string;
    html: string;
    contents?: (string | Entry)[];
    directives: Record<string, string>;
};
export type Card = {
    tags: Set<string>;
    front: CardFaceData;
    back: CardFaceData;
    aside: CardFaceData;
    htmlContents: string;

    warnings: string[];
    keyword: string; // TODO: remove
    audios: string[];
    examples: string[];
    contextHint: string;
    factorData: FactorData;
    availableFactors: Set<FactorID>;
} & Omit<main.CardData, "convertValues">;

export type CardIndex = Card[];

export const Card = {
    createFace(text = ""): CardFaceData {
        return {
            html: "",
            text,
            directives: {},
            contents: [],
        };
    },
    createEmpty(): Card {
        const card: Card = {
            filename: "",
            path: "",
            deckName: "",
            tags: new Set(),
            front: Card.createFace(),
            back: Card.createFace(),
            aside: Card.createFace(),
            htmlContents: "",
            contents: "",
            keyword: "",
            warnings: [],
            audios: [],
            examples: [],
            contextHint: "",
            factorData: {
                text: null,
                meaning: null,
                sound: null,
            },
            availableFactors: new Set(),

            id: -1,
            order: 0,
            proficiency: 0,
            numRecall: 0,
            numForget: 0,
            consecRecall: 0,
            consecForget: 0,
            lastUpdate: 0,
            lastRecallDate: 0,
            counter: 0,
            interval: 0,
        };

        return card;
    },
    _isSeparator(s: string) {
        const sep = "=";
        let count = 0;
        for (const c of s.split("")) {
            if (c !== sep) {
                return false;
            }
            count++;
        }
        return count >= 3;
    },
    parseDirective(line: string): Entry | null {
        line = line.trim();
        if (line.length === 0) {
            return null;
        }
        if (line[0] !== directivePrefix) {
            return null;
        }

        const index = line.indexOf(":");
        if (index < 0) {
            return null;
        }
        const d = {
            name: line.slice(1, index).trim(),
            value: line.slice(index + 1).trim(),
        };

        if (!allDirectives.includes(d.name)) {
            return null;
        }

        return d;
    },

    getKeywordText(side: CardFaceData) {
        for (const entry of side.contents ?? []) {
            if (typeof entry !== "string") {
                continue;
            }
            const html = marked.parse(entry);
            const elem = document.createElement("div");
            elem.innerHTML = html;
            for (const em of elem.querySelectorAll("em")) {
                const text = em.textContent?.trim();
                return text;
            }
        }
        return "";
    },

    getReviewCount(card: main.CardData) {
        return card.numForget + card.numRecall;
    },

    getSecondsSinceLastReview(card: main.CardData): number | undefined {
        if (card.numRecall + card.numForget === 0) {
            return undefined;
        }
        const now = Math.floor(Date.now() / 1000);
        const duration = now - card.lastUpdate;
        return Math.max(duration, 0);
    },

    getPhase(card: main.CardData): CardPhase {
        const reviews = Card.getReviewCount(card);
        if (reviews === 0) return "new";
        if (card.proficiency <= config().maxLearnLevel) return "learn";
        return "review";
    },
    isNew(card: main.CardData) {
        return Card.getReviewCount(card) === 0;
    },
    isReviewing(card: main.CardData) {
        return Card.getReviewCount(card) > 0;
        //return Card.getPhase(card) === "review";
    },
    isRecalledTodayDeprecated(card: Card) {
        return card.lastRecallDate === currentDate();
    },

    isDoneTodayDeprecated(card: Card) {
        const date = currentDate();
        const phase = Card.getPhase(card);
        return (
            (phase === "review" && card.lastRecallDate === date) ||
            card.numRecall > config().maxLearnLevel / 2 ||
            card.numForget > config().maxLearnLevel
        );
    },

    isObservationMode(card: Card, factorID: FactorID): boolean {
        const neglectedFactor = Factors.getNeglectedFactor(card.proficiency);
        return neglectedFactor === factorID;
    },
    getTestedFactor(card: Card): FactorID {
        const factors = Factors.get(card.proficiency, card.availableFactors);
        const factorID = Factors.getNeglectedFactor(factors);
        if (factorID) {
            return factorID;
        }

        if (card.consecForget > 0 && card.consecForget < 3) {
            const mid = Factors.getMidFactor(factors);
            if (mid) return mid;
        }
        if (card.consecRecall > 0) {
            return Factors.getWeakestFactor(factors);
        }
        if (card.consecForget > 0) {
            return Factors.getStrongestFactor(factors);
        }

        return Factors.getRandom(factors);
    },

    getRandomFactor(card: Card): FactorID {
        const factors = Factors.get(card.proficiency, card.availableFactors);
        return (randomElem(Object.keys(factors)) ?? "meaning") as FactorID;
    },

    getPresentedFactor(card: Card, testedFactor: FactorID): FactorID {
        const factors = Factors.get(card.proficiency, card.availableFactors);
        factors[testedFactor] = null;
        return Factors.getWeakestFactor(factors);
    },

    getTrial(card: Card): FactorTrial {
        const tested = Card.getTestedFactor(card);
        const presented = Card.getPresentedFactor(card, tested);
        const observation = Card.isObservationMode(card, tested);
        return {
            tested,
            presented,
            observation,
        };
    },

    parse(data: main.CardData): Card {
        const card = { ...Card.createEmpty(), ...data };

        const front = card.front;
        const back = card.back;
        const aside = card.aside;

        let current = front;
        let keywordFound = false;
        const lines: string[] = [];
        const faceLines: string[] = [];

        for (const line of data.contents.split("\n")) {
            const directive = Card.parseDirective(line);
            if (!directive || !cardDirectiveKeys.includes(directive.name)) {
                faceLines.push(line);
                continue;
            }

            if (directive.name === "tags") {
                const tags = directive.value.split(" ").map((t) => t.replace(/^#/, ""));
                for (const t of tags) {
                    card.tags.add(t);
                }
            }
        }

        for (const line of faceLines) {
            if (!Card._isSeparator(line)) {
                lines.push(line);
                const directive = Card.parseDirective(line);
                if (directive) {
                    current.directives[directive.name] = directive.value;
                }
                current.contents?.push(directive ?? line);
            } else {
                current.text = lines.join("\n");
                current.html = marked.parse(current.text);
                current.contents = Card._joinContents(current.contents ?? []);

                if (!keywordFound) {
                    keywordFound = true;
                    card.keyword = Card.getKeywordText(current) ?? "";
                }

                lines.splice(0);
                const nextFace = current == front ? back : aside;
                if (nextFace == current) {
                    break;
                }

                current = nextFace;
            }
        }

        const html = marked.parse(data.contents);
        const audios = Card.parseAudios(card.deckName, html);
        const { data: factorData, warnings } = Card.parseFactorData(card.deckName, html);
        const availableFactors = new Set(
            Object.entries(factorData)
                .filter(([k, v]) => !!v && Factors.isFactorID(k))
                .map(([k]) => k as FactorID),
        );

        card.audios = audios;
        card.warnings = warnings;
        card.availableFactors = availableFactors;
        card.factorData = factorData;
        card.contextHint = Card.parseHint(html);
        card.examples = Card.parseExamples(html);

        aside.text = lines.join("\n");
        aside.html = marked.parse(aside.text);

        return card;
    },

    getUrlPath(deckName: string, filename: string) {
        if (filename.startsWith(`${config().baseUrlDecks}/`)) {
            return filename;
        }
        return `${config().baseUrlDecks}/${deckName}/${decodeURI(filename)}`;
    },

    parseAudios(deckName: string, html: string) {
        const elem = document.createElement("div");
        elem.innerHTML = html;

        const result: string[] = [];

        const audios = elem.querySelectorAll("audio");
        for (const elem of audios) {
            result.push(Card.getUrlPath(deckName, elem.src));
        }

        const links = elem.querySelectorAll("a");
        for (const elem of links) {
            const filename = elem.textContent?.trim();
            const href = elem.href.trim();
            const factorID = removeTrailingSlash(getPathName(href));
            if (filename && (factorID === "sound" || factorID === "audio")) {
                const filenames = filename.split(",").map((s) => s.trim());
                for (const f of filenames) {
                    result.push(Card.getUrlPath(deckName, f));
                }
            }
        }

        return result;
    },

    parseHint(html: string) {
        const elem = document.createElement("div");
        elem.innerHTML = html;
        const node = elem.querySelector("code");
        return node?.textContent ?? "";
    },

    parseExamples(html: string) {
        const elem = document.createElement("div");
        elem.innerHTML = html;

        let node: Element | null = elem.querySelectorAll("hr")?.[1];
        while (node) {
            const next: Element | null = node.nextElementSibling;
            node.remove();
            node = next;
        }

        const result: string[] = [];
        for (const item of elem.querySelectorAll("li")) {
            const keyword = item.querySelector("strong");
            if (!keyword) {
                continue;
            }

            const factorNames = Object.keys(Factor);
            for (const a of item.querySelectorAll("a")) {
                const factor = removeTrailingSlash(getPathName(a.href.trim())) as FactorID;
                if (factorNames.includes(factor) || (factor as string) === "audio") {
                    a.remove();
                }
            }

            keyword.outerText = `**${keyword.textContent ?? ""}**`;
            if (item.textContent) result.push(item.textContent);
        }
        return result;
    },

    parseFactorData(deckName: string, html: string) {
        const warnings: string[] = [];
        const elem = document.createElement("div");
        elem.innerHTML = html;

        const result: FactorData = {
            meaning: null,
            sound: null,
            text: null,
        };

        const factorNames = Object.keys(Factor);
        const links = elem.querySelectorAll("a");
        for (const elem of links) {
            const href = elem.href.trim();
            const factor = removeTrailingSlash(getPathName(href)) as FactorID;
            if (!factorNames.includes(factor)) {
                continue;
            }

            let data = elem.textContent?.trim() ?? "";
            if (factor === "sound" && data) {
                data = Card.getUrlPath(deckName, data);
            }

            if (result[factor] && result[factor] !== data) {
                warnings.push(`${factor} is specified more than once`);
            }
            result[factor] = data.length === 0 ? null : data;
        }

        if (result.text) {
            result.text = result.text.replace(/\[\d+\]/g, "");
        }

        return { data: result, warnings };
    },

    parseDeprecated(data: main.CardData): Card {
        const card = { ...Card.createEmpty(), ...data };

        const front = card.front;
        const back = card.back;
        const aside = card.aside;
        const audios: string[] = [];

        let current = front;
        let keywordFound = false;
        const lines: string[] = [];
        const faceLines: string[] = [];

        for (const line of data.contents.split("\n")) {
            const directive = Card.parseDirective(line);
            if (!directive || !cardDirectiveKeys.includes(directive.name)) {
                faceLines.push(line);
                continue;
            }
            if (directive.name === "keyword") {
                card.keyword = directive.value;
            }
            if (directive.name === "audio") {
                audios.push(directive.value);
            }

            if (directive.name === "tags") {
                const tags = directive.value.split(" ").map((t) => t.replace(/^#/, ""));
                for (const t of tags) {
                    card.tags.add(t);
                }
            }
        }

        for (const line of faceLines) {
            if (!Card._isSeparator(line)) {
                lines.push(line);
                const directive = Card.parseDirective(line);
                if (directive) {
                    current.directives[directive.name] = directive.value;
                }
                current.contents?.push(directive ?? line);
            } else {
                current.text = lines.join("\n");
                current.html = marked.parse(current.text);
                current.contents = Card._joinContents(current.contents ?? []);

                if (!keywordFound) {
                    keywordFound = true;
                    card.keyword = Card.getKeywordText(current) ?? "";
                }

                lines.splice(0);
                const nextFace = current == front ? back : aside;
                if (nextFace == current) {
                    break;
                }

                current = nextFace;
            }
        }

        aside.text = lines.join("\n");
        aside.html = marked.parse(aside.text);

        return card;
    },

    _joinContents(contents: (string | Entry)[]) {
        const result: (string | Entry)[] = [];
        for (let i = 0; i < contents.length; i++) {
            let j = i;
            let directiveFound = false;
            for (; j < contents.length; j++) {
                const item = contents[j];
                if (typeof item !== "string") {
                    const text = contents.slice(i, j).join("\n").trim();
                    if (text) {
                        result.push(text);
                    }
                    result.push(item);
                    directiveFound = true;
                    break;
                }
            }
            if (!directiveFound) {
                const text = contents.slice(i, j).join("\n").trim();
                if (text) {
                    result.push(text);
                }
            }

            i = j;
        }
        return result;
    },
};
