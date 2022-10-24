import {
    Button as Button,
    Icon as Icon,
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
    EventUtil,
    TabGroupRef,
    TabRef,
    CardBox,
} from "./shoelace";
import {
    ForwardedRef,
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from "react";
import styled from "styled-components";
import { Block, Flex } from "./layout";
import { Action, Action1, Action2, OrderedSet, shuffle, tryJSONParse } from "./lib";
import { appState } from "./state";
import { useAtom } from "jotai";
import { Space } from "./components";
import { app, main } from "./api";
import { z } from "zod";
import produce from "immer";
import { Card } from "./card";
import { SequentRecap } from "./discovery";
import { config } from "./config";

// TODO: put volume control on AudioPlayer component
//       - double click to show control
//       - show tooltip help
// TODO: reset all cards stats for testing

// TODO: overview
// TODO: modify search

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
    export interface Props {
        onSubmit: Action;
    }
    export function View({ onSubmit }: Props) {
        const [showDiscover, setShowDiscover] = useState(false);
        const [showAdded, setShowAdded] = useState(false);

        const [collapseTabs, setCollapseTabs] = useState(false);
        const [allUserCards] = useAtom(appState.allUserCards);
        const [drillCards] = useAtom(appState.drillCards);
        const [filterOptions, setFilterOptions] = useState<CardFilter$.Options | undefined>(
            undefined,
        );
        const [filteredCards, setFilteredCards] = useState<main.CardData[]>([]);
        const [discoverTab, setDiscoverTab] = useState("");
        const cardFilterRef = useRef<CardFilter$.Control>(null);

        const onLoad = useCallback((filter: CardFilter$.Options) => {
            setFilterOptions(filter);
        }, []);

        function onChangeTab(e: Event) {
            const panel = (e.target as any).activeTab.panel ?? "";
            if (panel !== "cards") {
                setDiscoverTab(panel);
            }
            setFilterOptions(cardFilterRef.current?.get());
        }

        function onStart() {
            app.CreateStudySession(
                config.defaultStudyName,
                config.studySessionTypes.normal,
                drillCards.map((c) => c.path),
            );
            onSubmit();
        }

        useEffect(() => {
            let rawCards = filterOptions
                ? CardFilter$.filterCards(allUserCards, filterOptions)
                : allUserCards;

            rawCards = shuffle(rawCards);
            setFilteredCards(rawCards);
        }, [allUserCards, filterOptions]);

        const discoverContent = (
            <>
                <TabGroup placement="start" onSlTabShow={onChangeTab} activation="manual">
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
                    <Tab slot="nav" panel="cards">
                        <Icon name="gear-wide" />
                        {!collapseTabs && (
                            <>
                                <Space />
                                Cards
                            </>
                        )}
                    </Tab>

                    <Block mb={Shoe.spacing_small_2x} className="collapse-tabs-container">
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

                    <TabPanel name="overview">{discoverTab === "overview" && "TODO"}</TabPanel>
                    <TabPanel name="pick">
                        {discoverTab === "pick" && filterOptions && (
                            <SequentRecap cardData={filteredCards} />
                        )}
                    </TabPanel>
                    <TabPanel name="search">{discoverTab === "search" && "TODO"}</TabPanel>
                    <TabPanel name="cards">
                        <CardFilter ref={cardFilterRef} onLoad={onLoad} />
                    </TabPanel>
                </TabGroup>
            </>
        );

        const addedContent = (
            <>
                <SelectedCards onSubmit={onStart} />
            </>
        );

        return (
            <Container>
                <Details
                    className="details"
                    summary={`Find cards to study ${
                        filterOptions ? `(${filteredCards.length})` : ""
                    }`}
                    onSlShow={() => setShowDiscover(true)}
                    onSlHide={() => setShowDiscover(false)}
                >
                    {discoverContent}
                </Details>
                <Details
                    className="details"
                    summary={`Cards for today (${drillCards.length})`}
                    onSlShow={() => setShowAdded(true)}
                    onSlHide={() => setShowAdded(false)}
                >
                    {addedContent}
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
                top: calc(${Shoe.spacing_large_2x} * 1);
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
                padding: ${Shoe.spacing_small_2x};
            }
            &::part(header) {
                font-size: var(--sl-font-size-large);
            }
            sl-tab-panel::part(base) {
                padding: ${Shoe.spacing_small} ${Shoe.spacing_large};
            }
        }
        > .details > .cards {
            &::part(base) {
                border: 0;
                background: inherit;
            }
        }
    `;
}
export const Playground = Playground$.View;

export namespace CardFilter$ {
    export interface Control {
        get: () => Options;
    }

    export const optionsSchema = z.object({
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

    export type Options = z.infer<typeof optionsSchema>;

    export const defaultOptions: Options = {
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
        onSubmit?: Action1<Options>;
        onLoad?: Action1<Options>;
    }

    export const View = forwardRef(function View(
        { onSubmit, onLoad }: Props,
        ref: ForwardedRef<Control>,
    ) {
        const [decks] = useAtom(appState.decks);
        const [options, setOptions] = useState<Options>(defaultOptions);

        useImperativeHandle(
            ref,
            () => ({
                get() {
                    return options;
                },
            }),
            [options],
        );

        useEffect(() => {
            const options = loadOptions();
            setOptions(options);
            onLoad?.(options);
        }, [onLoad]);

        function update(fn: (arg: Options) => void | unknown) {
            const newOptions = produce(options, (draft) => {
                fn(draft);
            });
            saveOptions(newOptions);
            setOptions(newOptions);
        }

        const indent = Shoe.spacing_medium;

        return (
            <Container>
                <form onSubmit={() => onSubmit?.(options)}>
                    <h3>Filter cards</h3>
                    <div>
                        <Checkbox
                            checked={options.decks.all}
                            indeterminate={!options.decks.all}
                            onSlChange={(e) =>
                                update((opt) => (opt.decks.all = EventUtil.isChecked(e)))
                            }
                        >
                            Include from {options.decks.all ? "all" : ""} decks:
                        </Checkbox>

                        {!options.decks.all && (
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
                                                (opt) =>
                                                    (opt.decks.data[target.value] = target.checked),
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
                            checked={options.newCards}
                            onSlChange={(e) =>
                                update((opt) => (opt.newCards = EventUtil.isChecked(e)))
                            }
                        >
                            Include new cards
                        </Checkbox>
                    </div>
                    <br />
                    <div>
                        <Checkbox
                            checked={options.reviewCards.enabled}
                            onSlChange={(e) => {
                                update((opt) => (opt.reviewCards.enabled = EventUtil.isChecked(e)));
                            }}
                        >
                            Include reviewing cards
                        </Checkbox>
                        {options.reviewCards.enabled && (
                            <Flex
                                direction="column"
                                alignItems={"start"}
                                ml={indent}
                                mt={Shoe.spacing_small}
                                cmb={Shoe.spacing_small_x}
                            >
                                <Checkbox
                                    checked={options.reviewCards.all}
                                    onSlChange={() => {
                                        const newSettings = produce(options, (s) => {
                                            const r = s.reviewCards;
                                            r.all = true;
                                            r.include.enabled = false;
                                            r.exclude.enabled = false;
                                        });
                                        // force redraw
                                        setOptions({ ...newSettings });
                                    }}
                                >
                                    all
                                </Checkbox>

                                <div>
                                    <Checkbox
                                        checked={options.reviewCards.include.enabled}
                                        onSlChange={(e) =>
                                            update((opt) => {
                                                const r = opt.reviewCards;
                                                r.include.enabled = EventUtil.isChecked(e);
                                                r.all = !(r.include.enabled || r.exclude.enabled);
                                            })
                                        }
                                    >
                                        include reviewed cards in the last
                                    </Checkbox>
                                    <Space n={2} />
                                    <TimeSpanInput
                                        disabled={!options.reviewCards.include.enabled}
                                        span={options.reviewCards.include.value}
                                        onChange={(value) =>
                                            update((opt) => (opt.reviewCards.include.value = value))
                                        }
                                    />
                                </div>
                                <div>
                                    <Checkbox
                                        checked={options.reviewCards.exclude.enabled}
                                        onSlChange={(e) =>
                                            update((opt) => {
                                                const r = opt.reviewCards;
                                                r.exclude.enabled = EventUtil.isChecked(e);
                                                r.all = !(r.include.enabled || r.exclude.enabled);
                                            })
                                        }
                                    >
                                        exclude reviewed cards in the last
                                    </Checkbox>
                                    <Space n={2} />
                                    <TimeSpanInput
                                        disabled={!options.reviewCards.exclude.enabled}
                                        span={options.reviewCards.exclude.value}
                                        onChange={(value) =>
                                            update((opt) => (opt.reviewCards.exclude.value = value))
                                        }
                                    />
                                </div>
                            </Flex>
                        )}
                    </div>
                    <br />
                    <div>
                        <Checkbox
                            checked={options.customCards.enabled}
                            onSlChange={(e) =>
                                update((opt) => (opt.customCards.enabled = EventUtil.isChecked(e)))
                            }
                        >
                            Include custom cards
                        </Checkbox>
                        {options.customCards.enabled && (
                            <>
                                <Block mt={Shoe.spacing_small} />
                                <CardListEditor
                                    items={options.customCards.data}
                                    onChange={(lines) =>
                                        update((opt) => (opt.customCards.data = lines))
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

    const lsKey = "card-filter-options";

    function loadOptions() {
        const res = optionsSchema.safeParse(tryJSONParse(localStorage.getItem(lsKey) ?? ""));
        if (!res.success) {
            console.log("failed to load options", res.error);
            return { ...defaultOptions };
        }
        const options = res.data;
        return options;
    }
    function saveOptions(options: Options) {
        localStorage.setItem(lsKey, JSON.stringify(options));
    }

    const Container = styled.div`
        .deck-entries {
            min-height: 50px;
            max-height: 15vh;
            overflow-y: auto;
        }
    `;

    export function filterCards(cards: main.CardData[], options: Options): main.CardData[] {
        const customCardSet = new Set(options.customCards.data);
        const result: main.CardData[] = [];

        const { reviewCards } = options;

        if (!options.decks.all) {
            cards = cards.filter((c) => options.decks.data[c.deckName]);
        }

        for (const card of cards) {
            const isCustom = options.customCards.enabled && customCardSet.has(card.path);
            const isNew = options.newCards && Card.isNew(card);
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
                                EventUtil.valueAsNumber(e),
                                select.current?.getValueAsArray()?.[0] as TimeSpan.Unit,
                            )
                        }
                    />
                    <Select
                        ref={select}
                        disabled={disabled}
                        value={span.unit}
                        onSlChange={(e) =>
                            onInputChange(input.current?.valueAsNumber, EventUtil.value(e))
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
        onChange?: Action2<string[], boolean>;
    }

    export interface Controls {
        validate: () => Promise<boolean>;
        getText: () => string;
        clearErrors: () => void;
    }

    export const View = forwardRef(function View(
        { onChange, items }: Props,
        ref: ForwardedRef<Controls>,
    ) {
        const [invalidFilenames, setInvalidFilenames] = useState<string[] | null>(null);
        const textareaRef = useRef<TextareaRef>();

        const onCheck = useCallback(
            async function () {
                if (!textareaRef.current) {
                    return false;
                }

                const [text, invalidPaths] = await validateAndFormat(textareaRef.current.value);
                setInvalidFilenames(invalidPaths.slice(0, 10));
                textareaRef.current.value = text;
                onChange?.(text.split("\n"), invalidPaths.length > 0);

                return invalidPaths.length > 0;
            },
            [onChange],
        );

        useImperativeHandle(
            ref,
            () => ({
                validate: onCheck,
                getText: () => textareaRef.current?.textContent ?? "",
                clearErrors: () => {
                    setInvalidFilenames(null);
                },
            }),
            [onCheck, setInvalidFilenames],
        );

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
                        {/*<textarea defaultValue={items.join("\n")} ref={onMountTextarea} />*/}
                        <Flex justifyContent="end" className="check-button">
                            <Button size="small" onClick={() => onCheck()}>
                                check
                            </Button>
                        </Flex>
                        <Textarea
                            resize="auto"
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
                                            <li key={f}>{f.slice(0, 50)}</li>
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
        .check-button {
            z-index: ${Shoe.z_index_dropdown};
            position: relative;
            height: 0;
            > sl-button {
                position: absolute;
                top: 1px;
            }
        }

        ._controls {
            font-size: 12px;
        }
        ul {
            width: 500px;
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

export namespace SelectedCards$ {
    export interface Props {
        onSubmit: Action;
    }
    export function View({ onSubmit }: Props) {
        const [allUserCards] = useAtom(appState.allUserCards);
        const [cards, setCards] = useAtom(appState.drillCards);
        const [editing, setEdit] = useState(false);
        const [lines, setLines] = useState<string[]>([]);
        const [hasError, setHasError] = useState(false);
        const listEditor = useRef<CardListEditor$.Controls | null>(null);

        useEffect(() => {
            setLines(cards.map((c) => c.path));
        }, [cards]);

        async function onAction() {
            const edit = !editing;
            if (!edit) {
                const hasErrors = await listEditor?.current?.validate();
                if (hasErrors) return;

                const set = new Set(lines);
                const cards = allUserCards.filter((c) => set.has(c.path)).map((c) => Card.parse(c));
                setCards(cards);
                setLines(lines);

                await app.CreateStudySession(
                    config.defaultStudyName,
                    config.studySessionTypes.normal,
                    cards.map((c) => c.path),
                );
            }

            setEdit(edit);
            setHasError(false);
        }
        async function onCancel() {
            setEdit(false);
            setHasError(false);
            setLines(cards.map((c) => c.path));
            listEditor.current?.clearErrors();
        }
        function onChange(lines: string[], hasError: boolean) {
            setLines(lines);
            setHasError(hasError);
        }

        return (
            <Container>
                <Block hide={!editing} className="entries">
                    <CardListEditor items={lines} ref={listEditor} onChange={onChange} />
                </Block>
                <Flex hide={editing} className="entries">
                    <ol>
                        {cards.map((c) => (
                            <li key={c.id}>{c.path}</li>
                        ))}
                    </ol>
                </Flex>
                <Flex justifyContent={"start"} cmr="5px">
                    {editing && (
                        <Button variant="default" onClick={onCancel}>
                            cancel
                        </Button>
                    )}
                    <Button variant="default" disabled={hasError} onClick={onAction}>
                        {editing ? "save" : "edit cards"}
                    </Button>
                    {!editing && (
                        <Button variant="primary" onClick={onSubmit}>
                            start
                        </Button>
                    )}
                </Flex>
            </Container>
        );
    }
    const Container = styled.div`
        ul,
        ol {
            width: 100%;
            max-height: 50vh;
            overflow-y: auto;
        }
        sl-textarea {
            ::part(textarea) {
                max-height: 50vh;
                overflow-y: auto;
            }
        }
    `;
}
export const SelectedCards = SelectedCards$.View;
