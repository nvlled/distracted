import { useAtom } from "jotai";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { main } from "../wailsjs/go/models";
import { app, constants } from "./api";
import { lt } from "./layout";
import { Action1, Action2 } from "./lib";
import { appState } from "./state";

export namespace CardSearch {
    type CardEntry = main.CardFile & {
        checked: boolean;
    };
    export interface Props {
        deck: string;
        submitText?: string;
        onSubmit: Action2<main.CardFile[], string | undefined>;
        collections?: { [key: string]: string[] };
    }
    export function View({ deck, submitText, collections, onSubmit }: Props) {
        const [deckFiles] = useAtom(appState.deckFiles);
        const [cardFiles, setCardFiles] = useState<CardEntry[]>([]);
        const [showSelectedOnly, setShowSelectedOnly] = useState(false);
        const [filter, setFilter] = useState("");
        const colNameRef = useRef<HTMLInputElement>(null);

        function onSelect(file: CardEntry, checked?: boolean) {
            console.log({ file });
            setCardFiles(
                cardFiles.map((e) =>
                    e.path !== file.path ? e : { ...file, checked: checked ?? !file.checked },
                ),
            );
        }

        function onSelectCollection(e: ChangeEvent<HTMLSelectElement>) {
            if (!collections) return;

            const i = e.target.selectedIndex;
            const opt = e.target.querySelectorAll("option")[i];
            const collectionName = opt.value ?? "";
            const cards = collections[collectionName];
            if (!cards) {
                return;
            }
            const pathSet = new Set(cards);
            if (colNameRef.current && collectionName != constants.defaultCollectionName) {
                colNameRef.current.value = collectionName;
            }

            setShowSelectedOnly(true);
            setCardFiles(cardFiles.map((c) => ({ ...c, checked: pathSet.has(c.path) })));
        }

        function onSelectRandom() {
            const indices: Record<number, true> = {};
            for (let i = 0; i < 5; i++) {
                const i = Math.floor(cardFiles.length * Math.random());
                indices[i] = true;
            }
            setCardFiles(cardFiles.map((c, i) => (!indices[i] ? c : { ...c, checked: true })));
        }

        function onSubmitCards() {
            onSubmit(
                cardFiles
                    .filter((c) => c.checked)
                    .map((c) => ({
                        deckName: c.deckName,
                        filename: c.filename,
                        path: c.path,
                    })),
                colNameRef?.current?.value,
            );
        }

        useEffect(() => {
            const cardFiles = deckFiles[deck];
            if (cardFiles?.length) {
                const entries = cardFiles.map((c) => ({ ...c, checked: false }));
                setCardFiles(entries);
                return;
            }
            getCards(deck).then((cards) => {
                const entries = cards.map((c) => ({ ...c, checked: false }));
                setCardFiles(entries);
            });
        }, [deck]);

        return (
            <st.Container>
                <div>Cards on @{deck}</div>
                <br />

                <input
                    placeholder="search filename"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                />
                <label>
                    <input
                        type="checkbox"
                        checked={showSelectedOnly}
                        onChange={() => setShowSelectedOnly(!showSelectedOnly)}
                    />{" "}
                    show selected only
                </label>
                <st.CardList>
                    {cardFiles.map((file) =>
                        showSelectedOnly && !file.checked ? null : filter != "" &&
                          !file.filename.includes(filter) ? null : (
                            <st.Row key={file.path} justifyContent={"space-between"}>
                                <label onClick={() => onSelect(file, true)}>
                                    <span style={{ cursor: "pointer" }}>
                                        {file.checked ? "✓" : "□"}
                                    </span>{" "}
                                    {file.filename}
                                </label>
                                {file.checked && (
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            onSelect(file);
                                        }}
                                    >
                                        ✗
                                    </button>
                                )}
                            </st.Row>
                        ),
                    )}
                </st.CardList>
                <div>{cardFiles.filter((c) => c.checked).length} card selected</div>
                <lt.Row justifyContent={"space-between"}>
                    <button onClick={onSelectRandom}>add random</button>
                    <lt.Row justifyContent={"space-evenly"}>
                        {collections && (
                            <>
                                <lt.Block mr={10}>collections </lt.Block>
                                <select onChange={onSelectCollection} defaultValue={"−"}>
                                    <option disabled>−</option>
                                    {Object.keys(collections).map((name) => (
                                        <option key={name}>{name}</option>
                                    ))}
                                </select>
                            </>
                        )}
                    </lt.Row>
                </lt.Row>
                <hr />
                <lt.Row justifyContent={"space-between"}>
                    <input
                        style={{ width: "50%" }}
                        placeholder="collection name (optional)"
                        ref={colNameRef}
                    />
                    <button onClick={onSubmitCards}>{submitText || "submit"}</button>
                </lt.Row>
            </st.Container>
        );
    }

    const st = {
        Row: styled(lt.Row)<lt.RowProps>`
            &: hover {
                background: #333;
            }
        `,

        Container: styled.div`
            input {
                display: inline-block !important;
            }
        `,
        CardList: styled.div`
            min-height: 300px;
            max-height: 40vh;
            overflow-y: scroll;

            label {
                /*user-select: none;*/
                display: block;

                &:hover {
                    background-color: #333;
                }
            }
        `,
    };

    async function getCards(deck: string) {
        return await app.ListCards(deck);
    }
}
