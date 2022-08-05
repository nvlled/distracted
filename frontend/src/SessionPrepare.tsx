import {
    ChangeEvent,
    ForwardedRef,
    forwardRef,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from "react";
import styled from "styled-components";
import { Card } from "./card";
import { app, main, constants } from "./api";
import { Action1, Action2, formatDuration, OrderedSet, sleep, useAsyncEffect } from "./lib";
import { Dialog } from "./dialog";
import { CardView } from "./SessionDrill";
import { lt } from "./layout";
import { appState } from "./state";
import { useAtom } from "jotai";

export function SearchTable({
    onSubmit,
    studySessionName,
    initSearchName,
    initCards,
}: SearchTable.Props) {
    type Column = SearchTable.Column;
    type SortOrder = SearchTable.SortOrder;
    type SortEntry = SearchTable.SortEntry;

    const { sortCards, getSortSymbol, nextSortOrder, getShortDeckName } = SearchTable;

    const [config] = useAtom(appState.config);
    const [decks, setDecks] = useState<string[]>([]);
    const [cards, setCards] = useState<Card[]>([]);
    const [selectedCards, setSelectedCards] = useState<Card[]>(initCards ?? []);
    const [sorting, setSorting] = useState<SortEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingCards, setEditingCards] = useState(false);
    const [cardPaths, setCardPaths] = useState<string[]>([]);
    const [message, setMessage] = useState("");
    const [viewCard, setViewCard] = useState<Card | null>(null);
    const [editListText, setEditListText] = useState(false);

    const listEditorRef = useRef<ListEditor$.Controls | null>(null);

    const pageSize = 50;
    const maxPageNum = Math.floor(cards.length / pageSize);
    const [pageNum, setPageNum] = useState(0);

    const deckRef = useRef("");
    const filenameRef = useRef("");
    const contentsRef = useRef("");
    const cardSetRef = useRef(new Set<string>(initCards?.map((c) => c.path) ?? []));
    const searchIDRef = useRef("");
    const sessionNameRef = useRef<HTMLInputElement>(null);

    function selectCard(card: Card) {
        if (cardSetRef.current.has(card.path)) return;
        cardSetRef.current.add(card.path);
        setSelectedCards(selectedCards.concat(card));
        setMessage("");
    }
    function deselectCard(card: Card) {
        if (!cardSetRef.current.has(card.path)) return;
        cardSetRef.current.delete(card.path);
        setSelectedCards(selectedCards.filter((c) => c.path != card.path));
        setMessage("");
    }

    function onStartEditCards() {
        setEditingCards(true);
        setCardPaths(selectedCards.map((c) => c.path));
    }

    async function onSaveEditCards() {
        const lines = await listEditorRef.current?.save();
        if (!lines) return;

        const m = {} as Record<string, Card>;
        for (const card of selectedCards) {
            m[card.path] = card;
        }

        const editedCards = lines.map((p) => m[p]).filter(Boolean);
        cardSetRef.current = new Set(lines);
        setEditingCards(false);
        setSelectedCards(editedCards);
        setCardPaths([]);
    }

    async function onChangeSort(col: Column) {
        const nextSorting = nextSortOrder(col, sorting);

        setLoading(true);
        await sleep(512);
        const sortedCards = sortCards(cards, nextSorting) as Card[];
        setCards(sortedCards);
        setSorting(nextSorting);
        setLoading(false);
    }

    async function search() {
        setLoading(true);
        const searchID = await app.StartSearch({
            deckName: deckRef.current,
            filenameQuery: filenameRef.current,
            contentsQuery: contentsRef.current,
        });
        searchIDRef.current = searchID;

        console.log("searching ------------------------");
        const resultCards: Card[] = [];
        while (true) {
            const result = await app.NextSearchResults(searchID);
            const newCards: Card[] = [];
            for (const entry of result.data) {
                newCards.push(Card.parse(entry));
            }

            resultCards.push(...newCards);

            if (!result.hasMore) {
                break;
            }
        }
        setLoading(false);
        setCards(sortCards(resultCards, sorting) as Card[]);
        setPageNum(0);
        searchIDRef.current = "";

        console.log("search done ------------------------");
    }

    useEffect(() => {
        search();
        return () => {
            if (searchIDRef.current) {
                app.StopSearch(searchIDRef.current);
            }
        };
    }, []);

    function onStartSubmit() {
        if (selectedCards.length < 5) {
            setMessage("Select at least 5 cards");
            return;
        }
        onSubmit(studySessionName ?? sessionNameRef.current?.value ?? "", selectedCards);
    }

    const columnHeaders: Column[] = ["filename", "reviews", "forget", "sslr"];

    const table = (
        <table>
            <thead>
                <tr>
                    <th>{/* num */}</th>
                    <th />
                    <th>deck</th>
                    {columnHeaders.map((c) => (
                        <th key={c} onClick={() => onChangeSort(c)}>
                            {c === "sslr" ? "last review" : c}{" "}
                            <span className="_sort-symbol">
                                {getSortSymbol(c as Column, sorting)}
                            </span>
                        </th>
                    ))}
                    <th>{/* actions */}</th>
                </tr>
            </thead>
            <tbody>
                {cards.slice(pageNum * pageSize, pageNum * pageSize + pageSize).map((card, i) => {
                    const selected = cardSetRef.current.has(card.path);
                    const sslr = Card.getSecondsSinceLastReview(card);

                    return (
                        <tr key={card.path} className={selected ? "_selected" : ""}>
                            <td onClick={() => (selected ? deselectCard(card) : selectCard(card))}>
                                {pageNum * pageSize + i + 1}.{" "}
                            </td>
                            <td>
                                {selected ? (
                                    <button onClick={() => deselectCard(card)}>✓</button>
                                ) : (
                                    <button onClick={() => selectCard(card)}>□</button>
                                )}
                            </td>
                            <td>{getShortDeckName(card)}</td>
                            <td>{card.filename}</td>
                            <td>{Card.getReviewCount(card)}</td>
                            <td>{card.numForget}</td>
                            <td>{!sslr ? "−" : formatDuration(sslr) + " ago"} </td>
                            <td>
                                <button onClick={() => setViewCard(card)}>view</button>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );

    return (
        <SearchTable.Container>
            <lt.Row alignItems={"center"}>
                <label>
                    <select onChange={(e) => (deckRef.current = e.target.value)}>
                        <option value="">all</option>
                        {decks.map((d) => (
                            <option key="d">{d}</option>
                        ))}
                    </select>
                </label>

                <input
                    placeholder="filename"
                    onChange={(e) => (filenameRef.current = e.target.value)}
                />
                <input
                    placeholder="contents"
                    onChange={(e) => (contentsRef.current = e.target.value)}
                />
                <button onClick={search}>search</button>
            </lt.Row>
            <div className="_table-wrapper">
                <div className="_table-container">{table}</div>
                {maxPageNum > 1 && (
                    <lt.Row justifyContent={"center"}>
                        <button onClick={() => setPageNum(0)}>{"<<"}</button>
                        <button onClick={() => setPageNum(Math.max(pageNum - 1, 0))}>{"<"}</button>
                        <span className="_page-num">{pageNum + 1}</span>
                        <button onClick={() => setPageNum(Math.min(pageNum + 1, maxPageNum))}>
                            {">"}
                        </button>
                        <button onClick={() => setPageNum(maxPageNum)}>{">>"}</button>
                    </lt.Row>
                )}
                {loading && <div className="_loading">loading...</div>}
            </div>
            <br />
            {selectedCards.length > 0 ? (
                <div>
                    <div>
                        Selected cards ({selectedCards.length})
                        {editListText ? null : editingCards ? (
                            <>
                                <button onClick={() => setEditingCards(false)}>✗</button>
                                <button onClick={onSaveEditCards}>✓</button>
                            </>
                        ) : (
                            <button onClick={onStartEditCards}>edit</button>
                        )}
                    </div>
                    <div>
                        {editingCards ? (
                            <ListEditor
                                ref={(ref) => (listEditorRef.current = ref)}
                                listClassName="_list-editor"
                                items={cardPaths}
                                customAction={true}
                            />
                        ) : (
                            <div className="_selected-cards">
                                <table>
                                    <tbody>
                                        {selectedCards.map((c, i) => (
                                            <tr key={c.id}>
                                                <td>{c.path}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <lt.Row justifyContent={"center"}>
                    <em>(no added cards yet)</em>
                </lt.Row>
            )}

            <br />

            <div>
                <lt.Row>
                    {studySessionName === config.defaultStudyName ? (
                        ""
                    ) : !!studySessionName ? (
                        <div>custom study name: {initSearchName}</div>
                    ) : (
                        <input
                            placeholder="study session name (optional)"
                            ref={sessionNameRef}
                            defaultValue={initSearchName}
                        />
                    )}
                </lt.Row>
                {selectedCards.length > 0 && (
                    <lt.Row justifyContent={"center"}>
                        <button onClick={onStartSubmit} disabled={editListText || editingCards}>
                            submit
                        </button>
                    </lt.Row>
                )}
                <div className="_message">{message}</div>
            </div>

            <Dialog show={!!viewCard} onClose={() => setViewCard(null)}>
                {viewCard && <CardView card={viewCard} />}
            </Dialog>
        </SearchTable.Container>
    );
}

export namespace SearchTable {
    export interface Props {
        onSubmit: Action2<string, Card[]>;
        studySessionName?: string;
        initSearchName?: string;
        initCards?: Card[];
    }
    export const Container = styled.div`
        ._table-wrapper {
            position: relative;
        }
        ._table-container {
            height: 70vh;
            min-height: 300px;
            overflow-y: auto;
            background: #0003;
        }
        ._loading {
            top: 0;
            left: 0;
            color: white;
            background: #000c;
            width: 100%;
            height: 100%;
            position: absolute;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        table {
            position: relative;
        }
        table th {
            position: sticky;
            top: 0;
            background: black;
            border-bottom: 1px solid white;
            font-size: 0.8vw;
            user-select: none;

            :hover {
                background: red;
                cursor: pointer;
            }
        }
        tr._selected {
            border-left: 10px solid cyan;
            border-bottom: 1px solid cyan;
        }

        ._list-editor,
        ._selected-cards {
            max-height: 50vh;
            min-height: 300px;
            overflow-y: auto;
            background: #0003;
            padding: 10px;
        }

        ._sort-symbol {
            color: #0f0;
        }
        ._page-num {
            display: inline-block;
            margin: 0 20px;
        }
        ._message {
            font-size: 18px;
            color: #f00;
            text-align: right;
            display: inline-block;
        }
    `;
    export type Column = "sslr" | "forget" | "reviews" | "filename";
    export type SortOrder = "asc" | "desc" | "";
    export type SortEntry = [Column, SortOrder];

    export function getShortDeckName(card: Card) {
        return card.deckName.slice(0, 3) === "jap"
            ? "jp"
            : card.deckName.slice(0, 3) + (card.deckName.length > 3 ? "…" : "");
    }

    export function sortCards(cards: Card[], sorting: SortEntry[]) {
        if (sorting.length === 0) {
            return cards;
        }

        cards = [...cards];
        cards.sort((a, b) => {
            for (const [col, order] of sorting) {
                const sign = order === "desc" ? -1 : 1;

                switch (col) {
                    case "filename": {
                        if (a.filename != b.filename)
                            return a.filename.localeCompare(b.filename) * sign;
                        break;
                    }
                    case "reviews": {
                        const r1 = Card.getReviewCount(a);
                        const r2 = Card.getReviewCount(b);
                        if (r1 != r2) {
                            return (r1 - r2) * sign;
                        }
                        break;
                    }
                    case "sslr": {
                        const r1 = Card.getSecondsSinceLastReview(a) ?? 0;
                        const r2 = Card.getSecondsSinceLastReview(b) ?? 0;
                        if (r1 != r2) {
                            return (r1 - r2) * sign;
                        }
                        break;
                    }
                    case "forget": {
                        if (a.numForget != b.numForget) {
                            return (a.numForget - b.numForget) * sign;
                        }
                        break;
                    }
                }
                return 0;
            }
            return a.id - b.id;
        });

        return cards;
    }

    export function nextSortOrder(col: Column, sorting: SortEntry[]) {
        const result: SortEntry[] = [];
        let found = false;
        for (const [c, order] of sorting) {
            if (col !== c) {
                result.push([c, order]);
                continue;
            }

            let nextOrder: SortOrder = "";
            switch (order) {
                case undefined:
                case "":
                    nextOrder = "asc";
                    break;
                case "asc":
                    nextOrder = "desc";
                    break;
                case "desc":
                    nextOrder = "";
                    break;
            }
            console.log({ nextOrder });
            if (nextOrder) result.push([c, nextOrder]);
            found = true;
        }

        if (!found) {
            result.push([col, "asc"]);
        }

        return result;
    }

    export function getSortSymbol(col: Column, sorting: SortEntry[]) {
        const index = sorting.findIndex(([c]) => col === c);
        const entry = sorting[index];
        const [_, order] = entry ?? [];

        const num = sorting.length > 1 ? (index + 1).toString() : "";
        switch (order) {
            case "asc":
                return "△" + num;
            case "desc":
                return "▽" + num;
        }
        return "";
    }
}

function useRefEffect<T>(obj: T) {
    const ref = useRef(obj);
    useEffect(() => {
        ref.current = obj;
    });
    return ref;
}

export namespace ListEditor$ {
    export interface Props {
        listClassName?: string;
        items: string[];
        onSubmit?: Action1<string[]>;
        customAction?: boolean;
    }

    export interface Controls {
        save: () => Promise<string[] | null>;
    }

    export const View = forwardRef(function (
        { listClassName, onSubmit, items, customAction }: Props,
        ref: ForwardedRef<Controls>,
    ) {
        const [errorMessage, setErrorMessage] = useState("");
        const textareaRef = useRef<HTMLTextAreaElement>();

        useImperativeHandle(
            ref,
            () => ({
                save: () => onSaveTextChanges(true),
            }),
            [],
        );

        function onMountTextarea(elem: HTMLTextAreaElement) {
            if (!elem) {
                return;
            }
            elem.focus();
            textareaRef.current = elem;
        }

        async function onSaveTextChanges(manual?: boolean) {
            if (!textareaRef.current) {
                return null;
            }

            setErrorMessage("");
            const lines = textareaRef.current.value
                .split("\n")
                .map((line) => line.trim())
                .filter((line) => line.length > 0);

            const invalidPaths = await app.FindInvalidCardPaths(lines);
            if (invalidPaths.length > 0) {
                const text = invalidPaths
                    .slice(0, 3)
                    .map((l) => `  - ${l}`)
                    .join("\n");
                setErrorMessage(`unknown card filename: \n${text}`);
                return null;
            }

            const newItems: string[] = [];
            for (const line of lines) {
                OrderedSet.add(newItems, line);
            }

            if (!manual) {
                onSubmit?.(newItems);
            }

            textareaRef.current.value = newItems.join("\n");

            return newItems;
        }

        return (
            <Container>
                <div>
                    {!customAction && (
                        <button onClick={() => onSaveTextChanges()}>save text changes</button>
                    )}
                    <div>
                        <div className="_error-message">{errorMessage}</div>
                        <textarea defaultValue={items.join("\n")} ref={onMountTextarea} />
                    </div>
                </div>
            </Container>
        );
    });

    export const Container = styled.div<{ dragging?: boolean }>`
        ._controls {
            font-size: 12px;
        }
        ul {
            margin: 0;
        }

        textarea {
            height: 75vh;
            background: white;
            color: black;
        }
        ._error-message {
            white-space: pre;
            font-size: 18px;
            color: #f00;
        }
    `;

    export const ButtonContainer = styled.div<{ visible?: boolean }>`
        position: relative;
        margin-top: -50px;
        display: flex;
        justify-content: end;
        ${(props) => (props.visible ? "" : "visibility: hidden")};
    `;
}

export namespace SelectedCards$ {
    export interface Props {}
    export function View({}: Props) {
        const [cards, setCards] = useAtom(appState.drillCards);
        const [editing, setEdit] = useState(false);
        function onAction() {
            const edit = !editing;
            setEdit(edit);
            if (!edit) {
                // TODO: setCards
            }
        }
        return (
            <Container>
                <lt.Row>
                    Added cards ({cards.length}){" "}
                    <button onClick={onAction}>{editing ? "save" : "edit"}</button>
                </lt.Row>
                {editing ? (
                    <ListEditor items={cards.map((c) => c.path)} />
                ) : (
                    <div>
                        <ul>
                            {cards.map((c) => (
                                <li key={c.id}>{c.path}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </Container>
        );
    }
    const Container = styled.div``;
}
export const SelectedCards = SelectedCards$.View;

export const ListEditor = ListEditor$.View;

export function DailyStudySession({ onSubmit, edit: editProp }: DailyStudySession.Props) {
    const { lsKey } = DailyStudySession;

    const [session, setSession] = useState<main.StudySession | undefined>();
    const [config] = useAtom(appState.config);
    const [addCards, setAddCards] = useState(false);
    const [editCards, setEditCards] = useState(false);
    const [cards, setCards] = useState<Card[]>([]);
    const [sortBy, setSortBy] = useState<DailyStudySession.Sorting>("manual");

    const listEditorRef = useRef<ListEditor$.Controls | null>(null);

    function onSort(sorting: DailyStudySession.Sorting, cards: Card[]) {
        localStorage.setItem(lsKey, sorting);
        setSortBy(sorting);
        const updatedCards = cards.slice();
        updatedCards.sort((a, b) => {
            if (sorting === "manual") {
                return a.order - b.order;
            }
            if (sorting === "last update") {
                return a.lastUpdate - b.lastUpdate;
            }
            if (sorting === "random") {
                return Math.floor(-1 + Math.random() * 3);
            }
            return 0;
        });
        setCards(updatedCards);
    }

    function onChangeSort(e: ChangeEvent<HTMLSelectElement>) {
        const sorting = (e.target.value ?? "") as DailyStudySession.Sorting;
        onSort(sorting, cards);
    }

    function onTrySubmit(cards: Card[]) {
        console.log("try submit");
        if (cards.length > 0) {
            console.log("submit", cards.length, config.defaultStudyName);
            onSubmit?.(config.defaultStudyName, cards);
        }
    }

    async function onSubmitAddCards(sessionName: string, cards: Card[]) {
        setCards(cards);
        setAddCards(false);
        console.log("onEditCards", cards.length);

        await app.CreateStudySession(
            sessionName,
            config.studySessionTypes.normal,
            cards.map((c) => c.path),
        );

        if (editProp) {
            onTrySubmit(cards);
        }
    }
    function onEditCards() {
        setEditCards(true);
    }

    useAsyncEffect(async () => {
        const cards = (await app.GetDailyStudyCards()).map((cardData) => Card.parse(cardData));
        setCards(cards);
        setAddCards(!!editProp);

        const savedSortBy = localStorage.getItem(lsKey) as DailyStudySession.Sorting;
        if (savedSortBy && DailyStudySession.sorting.includes(savedSortBy)) {
            setSortBy(savedSortBy);
            onSort(savedSortBy, cards);
        }
        const session = await app.GetDailyStudySession();
        setSession(session);
    }, []);

    let body = <body />;

    if (addCards) {
        body = (
            <div>
                <button onClick={() => setAddCards(false)}>← back</button>
                <br />
                <SearchTable
                    onSubmit={onSubmitAddCards}
                    initCards={cards}
                    studySessionName={config.defaultStudyName}
                />
            </div>
        );
    } else {
        let learningCount = 0;
        let reviewingCount = 0;
        let remaining = 0;
        for (const c of cards) {
            const p = Card.getPhase(c);
            if (p === "learn" || p === "new") learningCount++;
            else if (p === "review") reviewingCount++;
            if (!Card.isDoneTodayDeprecated(c)) remaining++;
        }
        body = (
            <DailyStudySession.Container>
                <lt.Row justifyContent={"space-between"}>
                    <div>
                        <div>Cards for today ({cards.length})</div>
                        {session && (
                            <small>studied for {formatDuration(session?.studyDuration)}</small>
                        )}
                        <div className="_card-counts">
                            learning={learningCount}, review=
                            {reviewingCount}, remaining={remaining}
                        </div>
                    </div>

                    <div>
                        <button onClick={() => setAddCards(true)}>
                            {cards.length === 0 ? "add cards" : "add more cards"}
                        </button>
                        <button>view history</button>
                    </div>
                </lt.Row>
                {cards.length === 0 ? <em>(none added yet)</em> : <span />}
                <div className="_table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>
                                    <lt.Row justifyContent={""}>
                                        sort by
                                        <select onChange={onChangeSort} value={sortBy}>
                                            <option>manual</option>
                                            <option>last update</option>
                                            <option>random</option>
                                        </select>
                                        <button onClick={onEditCards}>edit</button>
                                    </lt.Row>
                                </th>
                                <th>phase</th>
                                <th>status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cards.map((c) => {
                                const phase = Card.getPhase(c);
                                const done = Card.isDoneTodayDeprecated(c);

                                return (
                                    <tr key={c.id} className={done ? "_done" : ""}>
                                        <td>{c.filename}</td>
                                        <td>{phase}</td>
                                        <td>{done ? "✓" : "□"}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <hr />
                <button onClick={() => onTrySubmit(cards)}>start</button>

                <Dialog
                    show={editCards}
                    disableClose={editCards}
                    onClose={() => {
                        setEditCards(false);
                    }}
                >
                    <ListEditor
                        listClassName="_list-editor"
                        items={cards.map((c) => c.path)}
                        ref={(ref) => (listEditorRef.current = ref)}
                        onSubmit={(paths) => {
                            const cardMap: Record<string, Card> = {};
                            for (const c of cards) {
                                cardMap[c.path] = c;
                            }
                            const newCards = paths.map((p) => cardMap[p]).filter(Boolean);
                            //setCards(newCards);
                            if (session?.name) onSubmitAddCards(session?.name, newCards);
                            setEditCards(false);
                        }}
                    />
                </Dialog>
            </DailyStudySession.Container>
        );
    }

    return <div>{body}</div>;
}

export namespace DailyStudySession {
    export interface Props {
        edit?: boolean;
        onSubmit: Action2<string, Card[]>;
    }
    export const Container = styled.div`
        ._table-container {
            max-height: 75vh;
            overflow-y: auto;
        }
        ._list-editor {
            max-height: 75vh;
            overflow-y: auto;
        }

        ._done {
            color: #666;
        }
        ._card-counts {
            font-size: 14px;
        }
    `;

    export const lsKey = "daily-study-session-sort";
    export const sorting = ["manual", "last update", "random"] as const;
    export type Sorting = typeof sorting[number];
}

export function CustomStudySessions() {
    return <div>TODO</div>;
}
