import { marked } from "marked";
import { main } from "../wailsjs/go/models";

export const directivePrefix = "@";

export type ViewID = "start" | "select" | "in-session";

export const cardDirectiveKeys = ["tags", "id"];
export const resourceDirective = ["image", "audio"];
export const allDirectives = resourceDirective.concat(cardDirectiveKeys);

export type CardDirectiveKeys = typeof cardDirectiveKeys[number];
export type SideDirectiveKeys = typeof cardDirectiveKeys[number];

export type Entry = { name: string; value: string };

export type CardFaceData = {
    card?: Card;
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
} & main.CardData;

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

            numRecall: 0,
            numForget: 0,
            consecRecall: 0,
            consecForget: 0,
            interval: 0,
            lastUpdate: 0,
        };

        card.front.card = card;
        card.back.card = card;
        card.aside.card = card;

        return card;
    },
    //_isLetter(s: string) {
    //    return new RegExp(/^\p{L}/, "u").test(s);
    //},
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
        //if (!Card._isLetter(line)) {
        //    return null;
        //}
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
    //directiveToHTML(directive: Entry) {
    //  if (directive.name === "image") {
    //    return `<img src="${directive.value}" />`;
    //  }
    //  // TODO: audio
    //  return "";
    //},

    parse(data: main.CardData): Card {
        const card = { ...Card.createEmpty(), ...data };

        const front = card.front;
        const back = card.back;
        const aside = card.aside;

        front.card = card;
        back.card = card;
        aside.card = card;

        let current = front;
        const lines: string[] = [];
        const faceLines: string[] = [];

        for (const line of data.contents.split("\n")) {
            const directive = Card.parseDirective(line);
            if (!directive || !cardDirectiveKeys.includes(directive.name)) {
                faceLines.push(line);
                continue;
            }

            if (directive.name === "tags") {
                var tags = directive.value.split(" ").map((t) => t.replace(/^#/, ""));
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
                    //let value = directive.value;
                    //if (resourceDirective.includes(value) && isRelativePath(value)) {
                    //    value = `${card.deckID}/value`;
                    //}
                    current.directives[directive.name] = directive.value;
                }
                current.contents?.push(directive ?? line);
            } else {
                current.text = lines.join("\n");
                current.html = marked.parse(current.text);
                current.contents = Card._joinContents(current.contents ?? []);

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
