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
    Shoe,
    Input,
    Select,
    MenuItem,
    Textarea,
    Divider,
    TextareaRef,
    InputRef,
    SelectRef,
    CheckboxRef,
} from "./shoelace";
import { ForwardedRef, forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import styled from "styled-components";
import { Block, Flex } from "./layout";
import { Action1, identity, OrderedSet, tryJSONParse } from "./lib";
import { config } from "./config";
import { appState } from "./state";
import { useAtom } from "jotai";
import { SlAvatar } from "@shoelace-style/shoelace";
import { Space } from "./components";
import { ListEditor } from "./SessionPrepare";
import { app, main } from "./api";
import { z } from "zod";
import produce from "immer";
import { Card } from "./card";
import { SequentRecap } from "./discovery";

namespace TimeSpan {
    export type Unit = z.infer<typeof unitSchema>;
    export const unitSchema = z.literal("days").or(z.literal("weeks")).or(z.literal("months"));
    export const units: Unit[] = ["days", "weeks", "months"];

    export const schema = z.object({
        value: z.number(),
        unit: unitSchema,
    });
    export type Type = z.infer<typeof schema>;

    export function withinLast(unixTimeSec: number, span: Type) {
        const now = Math.floor(Date.now() / 1000);
        const seconds = getSeconds(span);
        return unixTimeSec >= now - seconds;
    }
    export function getSeconds(span: Type) {
        const day = 84600;
        switch (span.unit) {
            case "days":
                return span.value * day;
            case "weeks":
                return span.value * 7 * day;
            case "months":
                return span.value * 30 * day;
            default: {
                console.warn(`unknown time unit: ${span.unit}`);
                return 0;
            }
        }
    }
}

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
        const [collapseTabs, setCollapseTabs] = useState(false);
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

                <Details className="details" summary="Find cards to study">
                    <TabGroup placement="start" onSlTabShow={onChangeTab}>
                        <Tab slot="nav" panel="overview">
                            <Icon name="bricks" />
                            {!collapseTabs && (
                                <>
                                    <Space />
                                    Overview
                                </>
                            )}
                        </Tab>
                        <Tab slot="nav" panel="pick">
                            <Icon name="hand-index-thumb" />
                            {!collapseTabs && (
                                <>
                                    <Space />
                                    Pick
                                </>
                            )}
                        </Tab>
                        <Tab slot="nav" panel="search">
                            <Icon name="search" />
                            {!collapseTabs && (
                                <>
                                    <Space />
                                    Search
                                </>
                            )}
                        </Tab>
                        <Tab slot="nav" panel="settings">
                            <Icon name="gear-wide" />
                            {!collapseTabs && (
                                <>
                                    <Space />
                                    Settings
                                </>
                            )}
                        </Tab>

                        <Block mb={Shoe.spacing_2x_small} className="collapse-tabs-container">
                            <Button
                                size="small"
                                className="collapse-tabs"
                                variant="default"
                                onClick={() => setCollapseTabs(!collapseTabs)}
                            >
                                {collapseTabs ? (
                                    <Icon slot="prefix" name="chevron-double-right" />
                                ) : (
                                    <Icon slot="prefix" name="chevron-double-left" />
                                )}
                            </Button>
                        </Block>

                        <TabPanel name="overview">TODO</TabPanel>
                        <TabPanel name="pick">
                            <SequentRecap />
                        </TabPanel>
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
        .collapse-tabs-container {
            position: relative;
            height: 0;
            .collapse-tabs {
                z-index: ${Shoe.z_index_toast};
                position: absolute;
                opacity: 0.5;
                top: calc(${Shoe.spacing_2x_large} * 1);
                left: calc(${Shoe.spacing_medium} * -1);
                &::part(base) {
                }
                &::part(label) {
                    font-size: ${Shoe.font_size_2x_small};
                }
                > sl-icon {
                    font-size: ${Shoe.font_size_2x_small};
                }
            }
        }

        sl-icon {
            font-size: ${Shoe.font_size_medium};
        }
        sl-tab-group::part(body) {
            overflow: visible;
        }

        > .details {
            &::part(base) {
                overflow: visible;
                background: inherit;
            }
            &::part(content) {
                overflow: visible;
                padding: ${Shoe.spacing_2x_small};
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
    export interface Control {
        get: () => Settings;
    }

    const Settings = z.object({
        decks: z.object({
            all: z.boolean(),
            data: z.record(z.string(), z.boolean()),
        }),
        newCards: z.boolean(),
        reviewCards: z.object({
            enabled: z.boolean(),
            all: z.boolean(),
            include: z.object({
                enabled: z.boolean(),
                value: TimeSpan.schema,
            }),
            exclude: z.object({
                enabled: z.boolean(),
                value: TimeSpan.schema,
            }),
        }),
        customCards: z.object({
            enabled: z.boolean(),
            data: z.array(z.string()),
        }),
    });

    type Settings = z.infer<typeof Settings>;

    const defaultSettings: Settings = {
        decks: {
            all: true,
            data: {},
        },
        newCards: false,
        reviewCards: {
            enabled: true,
            all: true,
            include: { enabled: false, value: { value: 1, unit: "days" } },
            exclude: { enabled: false, value: { value: 1, unit: "days" } },
        },
        customCards: {
            enabled: false,
            data: [],
        },
    };

    export interface Props {
        onSubmit?: Action1<Settings>;
    }

    export const View = forwardRef(function ({ onSubmit }: Props, ref: ForwardedRef<Control>) {
        const [decks] = useAtom(appState.decks);
        const [settings, setSettings] = useState<Settings>(defaultSettings);

        useImperativeHandle(
            ref,
            () => ({
                get() {
                    return settings;
                },
            }),
            [settings],
        );

        useEffect(() => {
            setSettings(loadSettings());
        }, []);

        function update(fn: (arg: Settings) => void | unknown) {
            const newSettings = produce(settings, (draft) => {
                fn(draft);
            });
            saveSettings(newSettings);
            setSettings(newSettings);
        }

        const indent = Shoe.spacing_medium;

        return (
            <Container>
                <form onSubmit={() => onSubmit?.(settings)}>
                    <h3>Filter cards</h3>
                    <div>
                        <Checkbox
                            checked={settings.decks.all}
                            indeterminate={!settings.decks.all}
                            onSlChange={(e) =>
                                update((settings) => (settings.decks.all = isChecked(e)))
                            }
                        >
                            Include from {settings.decks.all ? "all" : ""} decks:
                        </Checkbox>

                        {!settings.decks.all && (
                            <Flex
                                className="deck-entries"
                                direction="column"
                                alignItems={"start"}
                                ml={indent}
                                mt={Shoe.spacing_small}
                                cmr={Shoe.spacing_small}
                            >
                                {decks.map((d) => (
                                    <Checkbox
                                        key={d}
                                        value={d}
                                        onSlChange={(e) => {
                                            const target = e.target as CheckboxRef;
                                            update(
                                                (settings) =>
                                                    (settings.decks.data[target.value] =
                                                        target.checked),
                                            );
                                        }}
                                    >
                                        {d}
                                    </Checkbox>
                                ))}
                            </Flex>
                        )}
                    </div>
                    <br />
                    <div>
                        <Checkbox
                            checked={settings.newCards}
                            onSlChange={(e) =>
                                update((settings) => (settings.newCards = isChecked(e)))
                            }
                        >
                            Include new cards
                        </Checkbox>
                    </div>
                    <br />
                    <div>
                        <Checkbox
                            checked={settings.reviewCards.enabled}
                            onSlChange={(e) => {
                                update((settings) => (settings.reviewCards.enabled = isChecked(e)));
                            }}
                        >
                            Include reviewing cards
                        </Checkbox>
                        {settings.reviewCards.enabled && (
                            <Flex
                                direction="column"
                                alignItems={"start"}
                                ml={indent}
                                mt={Shoe.spacing_small}
                                cmb={Shoe.spacing_x_small}
                            >
                                <Checkbox
                                    checked={settings.reviewCards.all}
                                    onSlChange={(e) => {
                                        const newSettings = produce(settings, (s) => {
                                            const r = s.reviewCards;
                                            r.all = true;
                                            r.include.enabled = false;
                                            r.exclude.enabled = false;
                                        });
                                        // force redraw
                                        setSettings({ ...newSettings });
                                    }}
                                >
                                    all
                                </Checkbox>

                                <div>
                                    <Checkbox
                                        checked={settings.reviewCards.include.enabled}
                                        onSlChange={(e) =>
                                            update((settings) => {
                                                const r = settings.reviewCards;
                                                r.include.enabled = isChecked(e);
                                                r.all = !(r.include.enabled || r.exclude.enabled);
                                            })
                                        }
                                    >
                                        include reviewed cards in the last
                                    </Checkbox>
                                    <Space n={2} />
                                    <TimeSpanInput
                                        disabled={!settings.reviewCards.include.enabled}
                                        span={settings.reviewCards.include.value}
                                        onChange={(value) =>
                                            update(
                                                (settings) =>
                                                    (settings.reviewCards.include.value = value),
                                            )
                                        }
                                    />
                                </div>
                                <div>
                                    <Checkbox
                                        checked={settings.reviewCards.exclude.enabled}
                                        onSlChange={(e) =>
                                            update((settings) => {
                                                const r = settings.reviewCards;
                                                r.exclude.enabled = isChecked(e);
                                                r.all = !(r.include.enabled || r.exclude.enabled);
                                            })
                                        }
                                    >
                                        exclude reviewed cards in the last
                                    </Checkbox>
                                    <Space n={2} />
                                    <TimeSpanInput
                                        disabled={!settings.reviewCards.exclude.enabled}
                                        span={settings.reviewCards.exclude.value}
                                        onChange={(value) =>
                                            update(
                                                (settings) =>
                                                    (settings.reviewCards.exclude.value = value),
                                            )
                                        }
                                    />
                                </div>
                            </Flex>
                        )}
                    </div>
                    <br />
                    <div>
                        <Checkbox
                            checked={settings.customCards.enabled}
                            onSlChange={(e) =>
                                update((settings) => (settings.customCards.enabled = isChecked(e)))
                            }
                        >
                            Include custom cards
                        </Checkbox>
                        {settings.customCards.enabled && (
                            <>
                                <Block mt={Shoe.spacing_small} />
                                <CardListEditor
                                    items={settings.customCards.data}
                                    onChange={(lines) =>
                                        update((settings) => (settings.customCards.data = lines))
                                    }
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

    const lsKey = "card-filter-settings";

    function loadSettings() {
        const res = Settings.safeParse(tryJSONParse(localStorage.getItem(lsKey) ?? ""));
        if (!res.success) {
            console.log("failed to load settings", res.error);
            return { ...defaultSettings };
        }
        const settings = res.data;
        return settings;
    }
    function saveSettings(settings: Settings) {
        localStorage.setItem(lsKey, JSON.stringify(settings));
    }

    const Container = styled.div`
        .deck-entries {
            min-height: 50px;
            max-height: 15vh;
            overflow-y: auto;
        }
    `;

    function isChecked(e: Event): boolean {
        return !!((e.target as any).checked ?? false);
    }

    export function filterCards(cards: main.CardData[], settings: Settings): main.CardData[] {
        const customCardSet = new Set(settings.customCards.data);
        const result: main.CardData[] = [];

        const { reviewCards } = settings;

        // TODO:
        for (const card of cards) {
            const isCustom = !settings.customCards.enabled || customCardSet.has(card.path);
            const isNew = settings.newCards && Card.isNew(card);
            const isReview = reviewCards.enabled && reviewCards.all && Card.isReviewing(card);

            let includeCard = false;
            includeCard ||= isCustom;
            includeCard ||= isReview;
            includeCard ||= isNew;

            if (!includeCard && reviewCards.enabled) {
                const lastUpdate = card.lastUpdate;
                const { include, exclude } = reviewCards;
                includeCard ||= include.enabled && TimeSpan.withinLast(lastUpdate, include.value);
                includeCard ||= exclude.enabled && !TimeSpan.withinLast(lastUpdate, exclude.value);
            }

            if (includeCard) {
                result.push(card);
            }
        }
        return result;
    }
}
export const CardFilter = CardFilter$.View;

export namespace TimeSpanInput$ {
    export interface Props {
        span: TimeSpan.Type;
        disabled?: boolean;
        onChange: Action1<TimeSpan.Type>;
    }
    export function View({ span, disabled, onChange }: Props) {
        const input = useRef<InputRef>();
        const select = useRef<SelectRef>();

        function onInputChange(value?: number, unit?: TimeSpan.Unit) {
            if (!value || !unit) return;
            onChange({
                value,
                unit,
            });
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
                        valueAsNumber={Math.max(span.value, 1)}
                        onSlChange={(e) =>
                            onInputChange(
                                (e.target as any).valueAsNumber,
                                select.current?.getValueAsArray()?.[0] as TimeSpan.Unit,
                            )
                        }
                    />
                    <Select
                        ref={select}
                        disabled={disabled}
                        value={span.unit}
                        onSlChange={(e) =>
                            onInputChange(input.current?.valueAsNumber, (e.target as any).value)
                        }
                    >
                        {TimeSpan.units.map((val) => (
                            <MenuItem key={val} value={val}>
                                {val}
                            </MenuItem>
                        ))}
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
        { onChange, items }: Props,
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
                            value={items.join("\n")}
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
