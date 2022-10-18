import {
    Alert,
    Button as Button,
    Icon as Icon,
    AlertRef,
    Details,
    TabGroup,
    Tab,
    TabPanel,
    Checkbox,
    Slvars as Shoe,
    Input,
    Select,
    MenuItem,
    Textarea,
    Divider,
    TextareaRef,
    InputRef,
    SelectRef,
} from "./shoelace";
import { ForwardedRef, forwardRef, useImperativeHandle, useRef, useState } from "react";
import styled from "styled-components";
import { Block, Flex } from "./layout";
import { Action1, identity, OrderedSet } from "./lib";
import { config } from "./config";
import { appState } from "./state";
import { useAtom } from "jotai";
import { SlAvatar } from "@shoelace-style/shoelace";
import { Space } from "./components";
import { ListEditor } from "./SessionPrepare";
import { app } from "./api";

export namespace Playground$ {
    export interface Props {}
    export function View({}: Props) {
        return (
            <Container>
                <Home />
            </Container>
        );
    }
    const Container = styled.div``;
}
export const Playground = Playground$.View;

export namespace Home$ {
    export interface Props {}
    export function View({}: Props) {
        const [showFind, setShowFind] = useState(false);
        const [showAdded, setShowAdded] = useState(false);
        const cardFilter = useRef<CardFilter$.Control>(null);

        function onChangeTab(e: Event) {
            console.log(cardFilter.current?.get());
        }

        return (
            <Container>
                {/*
                <Flex justifyContent={"space-between"}>
                    <h2>Find cards to study</h2>
                    <Button caret></Button>
                </Flex>

                <Flex justifyContent={"space-between"}>
                    <h2>Added cards</h2>
                    <Button caret></Button>
                </Flex>
                */}

                <h2></h2>
                <Details className="details" summary="Find cards to study">
                    <TabGroup placement="start" onSlTabShow={onChangeTab}>
                        <Tab slot="nav" panel="overview">
                            Overview
                        </Tab>
                        <Tab slot="nav" panel="pick">
                            Pick
                        </Tab>
                        <Tab slot="nav" panel="search">
                            Search
                        </Tab>
                        <Tab slot="nav" panel="settings">
                            settings
                        </Tab>

                        <TabPanel name="overview">TODO</TabPanel>
                        <TabPanel name="pick">TODO</TabPanel>
                        <TabPanel name="search">TODO</TabPanel>
                        <TabPanel name="settings">
                            <CardFilter ref={cardFilter} />
                        </TabPanel>
                    </TabGroup>
                </Details>
                <Details className="details" summary="Added cards">
                    TODO
                </Details>
            </Container>
        );
    }
    const Container = styled.div`
        > div > h2 {
            cursor: pointer;
            text-decoration: underline;
        }
        > .details {
            &::part(base) {
                background: inherit;
            }
            &::part(header) {
                font-size: var(--sl-font-size-large);
                text-decoration: underline;
            }
        }
        > .details > .settings {
            &::part(base) {
                border: 0;
                background: inherit;
            }
        }
    `;
}
export const Home = Home$.View;

export namespace CardFilter$ {
    interface TimeSpan {
        value: number;
        unit: string;
    }
    export interface Control {
        get: () => Settings;
    }
    export interface Settings {
        decks: "all" | string[];
        reviewCards: { enabled: boolean; include: number; exclude: number };
        newCards: boolean;
        customCards: null | string[];
    }

    export interface Props {
        onSubmit?: Action1<Settings>;
    }

    export const View = forwardRef(function ({ onSubmit }: Props, ref: ForwardedRef<Control>) {
        const [decks] = useAtom(appState.decks);
        const [settings, setSettings] = useState<Settings>({
            decks: "all",
            reviewCards: { enabled: true, include: 0, exclude: 0 },
            newCards: false,
            customCards: [],
        });

        useImperativeHandle(
            ref,
            () => ({
                get() {
                    return settings;
                },
            }),
            [settings],
        );

        function update(args: Partial<Settings>) {
            console.log({ args });
            setSettings({
                ...settings,
                ...(args as NonNullable<Settings>),
            });
        }
        function updateReview(args: Partial<Settings["reviewCards"]>) {
            update({
                ...settings,
                reviewCards: {
                    ...settings.reviewCards,
                    ...(args as NonNullable<Settings["reviewCards"]>),
                },
            });
        }

        const allDecks = settings.decks === "all";
        const includeReview = settings.reviewCards.enabled;
        const indent = Shoe.spacing_2x_large;

        // TODO: update TimeSpan values
        // TODO: use immer
        // TODO: get all unparsed cards
        console.log({ settings });

        return (
            <Container>
                <form onSubmit={() => onSubmit?.(settings)}>
                    <h3>Filter cards</h3>
                    <div>
                        <Checkbox
                            checked={allDecks}
                            indeterminate={!allDecks}
                            onSlChange={() => update({ decks: allDecks ? [] : "all" })}
                        >
                            Include from {allDecks ? "all" : ""} decks:
                        </Checkbox>
                        {settings.decks !== "all" && (
                            <Flex
                                className="deck-entries"
                                direction="column"
                                alignItems={"start"}
                                ml={indent}
                                mt={Shoe.spacing_small}
                                cmr={Shoe.spacing_small}
                            >
                                {decks.map((d) => (
                                    <Checkbox key={d}>{d}</Checkbox>
                                ))}
                            </Flex>
                        )}
                    </div>
                    <br />
                    <div>
                        <Checkbox
                            checked={settings.newCards}
                            onSlChange={() => update({ newCards: !settings.newCards })}
                        >
                            Include new cards
                        </Checkbox>
                    </div>
                    <br />
                    <div>
                        <Checkbox
                            checked={includeReview}
                            onSlChange={() =>
                                updateReview({ enabled: !settings.reviewCards.enabled })
                            }
                        >
                            Include reviewing cards
                        </Checkbox>
                        {includeReview && (
                            <Flex
                                direction="column"
                                alignItems={"start"}
                                ml={indent}
                                mt={Shoe.spacing_small}
                                cmb={Shoe.spacing_x_small}
                            >
                                <Checkbox
                                    checked={
                                        settings.reviewCards.enabled &&
                                        settings.reviewCards.include === 0 &&
                                        settings.reviewCards.exclude === 0
                                    }
                                    onSlChange={(e) => {
                                        const checked: boolean = (e.target as any).checked;
                                        const val = checked ? 0 : 1;
                                        updateReview({
                                            include: 0,
                                            exclude: 0,
                                        });
                                    }}
                                >
                                    all
                                </Checkbox>

                                <div>
                                    <Checkbox
                                        checked={settings.reviewCards.include > 0}
                                        onSlChange={(e) =>
                                            updateReview({
                                                include: (e.target as any).checked ? 1 : 0,
                                            })
                                        }
                                    >
                                        include reviewed cards in the last
                                    </Checkbox>
                                    <Space n={2} />
                                    <TimeSpanInput
                                        disabled={settings.reviewCards.include === 0}
                                        value={settings.reviewCards.include ?? 1}
                                        onChange={(value) =>
                                            updateReview({
                                                include: value,
                                            })
                                        }
                                    />
                                </div>
                                <div>
                                    <Checkbox
                                        checked={settings.reviewCards.exclude > 0}
                                        onSlChange={(e) =>
                                            updateReview({
                                                exclude: (e.target as any).checked ? 1 : 0,
                                            })
                                        }
                                    >
                                        exclude reviewed cards in the last
                                    </Checkbox>
                                    <Space n={2} />
                                    <TimeSpanInput
                                        disabled={settings.reviewCards.exclude === 0}
                                        value={settings.reviewCards.exclude ?? 0}
                                        onChange={(value) =>
                                            updateReview({
                                                exclude: value,
                                            })
                                        }
                                    />
                                </div>
                            </Flex>
                        )}
                    </div>
                    <br />
                    <div>
                        <Checkbox
                            checked={settings.customCards !== null}
                            onSlChange={() =>
                                update({ customCards: settings.customCards !== null ? null : [] })
                            }
                        >
                            Include custom cards
                        </Checkbox>
                        {settings.customCards !== null && (
                            <>
                                <Block mt={Shoe.spacing_small} />
                                <CardListEditor
                                    items={settings.customCards}
                                    onChange={(lines) => update({ customCards: lines })}
                                />
                            </>
                        )}
                    </div>
                    {onSubmit && (
                        <>
                            <Divider />
                            <Block mt={Shoe.spacing_medium} />
                            <Button>submit</Button>
                        </>
                    )}
                </form>
            </Container>
        );
    });
    const Container = styled.div`
        .deck-entries {
            min-height: 50px;
            max-height: 15vh;
            overflow-y: auto;
        }
    `;
}
export const CardFilter = CardFilter$.View;

export namespace TimeSpanInput$ {
    export interface Props {
        value: number;
        unit?: string;
        disabled?: boolean;
        onChange: Action1<number>;
    }
    export function View({ value, unit = "days", disabled, onChange }: Props) {
        const input = useRef<InputRef>();
        const select = useRef<SelectRef>();

        function onInputChange(days?: number, unit?: string) {
            console.log({ days, unit });
            if (!days || !unit) return;
            days = getDays(days, unit);
            onChange(days);
        }

        return (
            <Container>
                <Flex>
                    <Input
                        ref={input}
                        className="num-input"
                        type="number"
                        min={1}
                        max={1024}
                        disabled={disabled}
                        valueAsNumber={Math.max(value, 0)}
                        onSlChange={(e) =>
                            onInputChange(
                                (e.target as any).valueAsNumber,
                                select.current?.getValueAsArray()?.[0],
                            )
                        }
                    />
                    <Select
                        ref={select}
                        disabled={disabled}
                        value={unit}
                        onSlChange={(e) =>
                            onInputChange(input.current?.valueAsNumber, (e.target as any).value)
                        }
                    >
                        <MenuItem value="days">days</MenuItem>
                        <MenuItem value="weeks">weeks</MenuItem>
                        <MenuItem value="months">months</MenuItem>
                    </Select>
                </Flex>
            </Container>
        );
    }
    const Container = styled.div`
        display: inline-block;
        .num-input::part(form-control) {
            width: 5em;
        }
    `;

    function getDays(days: number, unit: string) {
        switch (unit) {
            case "days":
                return days;
            case "weeks":
                return days * 7;
            case "months":
                return days * 30;
        }
        return 0;
    }
}
export const TimeSpanInput = TimeSpanInput$.View;

export namespace CardListEditor$ {
    export interface Props {
        listClassName?: string;
        items: string[];
        onChange?: Action1<string[]>;
    }

    export interface Controls {
        validate: () => Promise<boolean>;
        getText: () => string;
    }

    export const View = forwardRef(function (
        { listClassName, onChange, items }: Props,
        ref: ForwardedRef<Controls>,
    ) {
        const [invalidFilenames, setInvalidFilenames] = useState<string[] | null>(null);
        const textareaRef = useRef<TextareaRef>();

        useImperativeHandle(
            ref,
            () => ({
                validate: onCheck,
                getText: () => textareaRef.current?.textContent ?? "",
            }),
            [],
        );

        async function onCheck() {
            if (!textareaRef.current) {
                return false;
            }

            const [text, invalidPaths] = await validateAndFormat(textareaRef.current.value);
            setInvalidFilenames(invalidPaths.slice(0, 10));
            textareaRef.current.value = text;
            onChange?.(text.split("\n"));

            return invalidPaths.length > 0;
        }

        function onInput() {
            setInvalidFilenames(null);
        }

        // TODO: convert TimeSpanInput value to seconds

        return (
            <Container
                valid={
                    !invalidFilenames || (textareaRef.current?.value?.length ?? 0) == 0
                        ? null
                        : invalidFilenames.length == 0
                }
            >
                <div>
                    <div>
                        <Flex justifyContent="end">
                            <Button size="small" onClick={() => onCheck()}>
                                check
                            </Button>
                        </Flex>
                        {/*<textarea defaultValue={items.join("\n")} ref={onMountTextarea} />*/}
                        <Textarea
                            className="card-text-input"
                            defaultValue={items.join("\n")}
                            ref={textareaRef}
                            placeholder="example: deckname/card-filename.md"
                            onSlInput={onInput}
                            onSlChange={onCheck}
                            spellcheck={false}
                        >
                            {invalidFilenames?.length && (
                                <div slot="help-text" className="error-help-text">
                                    <Block mt={Shoe.spacing_small} />
                                    These cards do not exist:
                                    <ul>
                                        {invalidFilenames.map((f) => (
                                            <li key={f}>{f}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </Textarea>
                    </div>
                </div>
            </Container>
        );
    });

    async function validateAndFormat(text: string): Promise<[string, string[]]> {
        const lines = text
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0);

        const invalidPaths = await app.FindInvalidCardPaths(lines);
        if (invalidPaths.length > 0) {
            return [text, invalidPaths];
        }

        const newItems: string[] = [];
        for (const line of lines) {
            OrderedSet.add(newItems, line);
        }

        return [newItems.join("\n"), []];
    }

    export const Container = styled.div<{ valid?: boolean | null; dragging?: boolean }>`
        ._controls {
            font-size: 12px;
        }
        ul {
            margin: 0;
        }

        textarea {
            height: 200px;
            background: white;
            color: black;
        }
        ._error-message {
            white-space: pre;
            font-size: 18px;
            color: #f00;
        }

        ${(props) => {
            if (props.valid === null) return "";
            const color = props.valid ? Shoe.color_success_500 : Shoe.color_danger_500;
            return `
                .card-text-input {
                    .error-help-text {
                        white-space: pre;
                        color: ${color};
                        margin-left: var(--sl-spacing-medium);
                    }

                    &:not([disabled])::part(label),
                    &:not([disabled])::part(help-text) {
                        color: ${color};
                    }

                    &:not([disabled])::part(base) {
                        border-color: ${color};
                    }

                    &:focus-within::part(base) {
                        box-shadow: 0 0 0 var(--sl-focus-ring-width) ${color};
                    }
                }
            `;
        }}
    `;

    export const ButtonContainer = styled.div<{ visible?: boolean }>`
        position: relative;
        margin-top: -50px;
        display: flex;
        justify-content: end;
        ${(props) => (props.visible ? "" : "visibility: hidden")};
    `;
}

export const CardListEditor = CardListEditor$.View;
