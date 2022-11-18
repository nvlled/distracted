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
    ButtonGroup,
    FormatDate,
    IconButton,
    Switch,
    Menu,
    RelativeTime,
    DetailsRef,
} from "./shoelace";
import {
    ForwardedRef,
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
} from "react";
import styled from "styled-components";
import { Block, Flex } from "./layout";
import {
    Action,
    Action1,
    Action2,
    formatDuration,
    hasProp,
    OrderedSet,
    partition,
    randomElem,
    shuffle,
    timeToDate,
    tryJSONParse,
} from "./lib";
import { appState } from "./state";
import { useAtom } from "jotai";
import { Keybind, Space } from "./components";
import { app, main } from "./api";
import { z } from "zod";
import produce from "immer";
import { Card } from "./card";
import { SequentRecap } from "./discovery";
import { config } from "./config";
import { useChanged, useDrillCards, useSomeChanged } from "./hooks";
import { Factors } from "./factors";
import { SlFormatDate } from "@shoelace-style/shoelace/dist/react";
import { iterate as iterateLoadedCards } from "./loadedCards";

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
                return (span.value + 1) * day;
            case "weeks":
                return (span.value + 1) * 7 * day;
            case "months":
                return (span.value + 1) * 30 * day;
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
        const [actions] = useAtom(appState.actions);

        const [drillCards] = useDrillCards();

        const [filterOptions, setFilterOptions] = useState<CardFilter$.Options | undefined>(
            undefined,
        );
        const [discoverTab, setDiscoverTab] = useState("");
        const cardFilterRef = useRef<CardFilter$.Control>(null);

        const onLoad = useCallback((filter: CardFilter$.Options) => {
            setFilterOptions(filter);
        }, []);

        function onChangeTab(e: Event) {
            // eslint-disable-next-line
            const panel = (e.target as any).activeTab?.panel ?? "";
            if (panel !== "cards") {
                setDiscoverTab(panel);
            }
            setFilterOptions(cardFilterRef.current?.get());
        }

        function onStart() {
            onSubmit();
        }

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

                    <TabPanel name="overview">{discoverTab === "overview"}</TabPanel>
                    <TabPanel name="pick">
                        {discoverTab === "pick" && filterOptions && (
                            <SequentRecap filter={filterOptions} />
                        )}
                    </TabPanel>
                    <TabPanel name="search">{discoverTab === "search"}</TabPanel>
                    <TabPanel name="cards">
                        <CardFilter ref={cardFilterRef} onLoad={onLoad} />
                    </TabPanel>
                </TabGroup>
            </>
        );

        const addedContent = (
            <SelectedCards
                onSubmit={onStart}
                //onChangeOrder={onChangeSelectedSort}
                //sortType={sortType}
                //desc={desc}
            />
        );

        const test = useRef<DetailsRef | null>(null);

        return (
            <Container>
                <Details
                    className="details"
                    //onFocus={(e) => e.target.blur()}
                    summary={`Discover cards to study`}
                    onSlShow={() => setShowDiscover(true)}
                    onSlHide={() => setShowDiscover(false)}
                >
                    {discoverContent}
                </Details>
                <Details
                    //onFocus={(e) => e.target.blur()}
                    className="details"
                    summary={`Cards for today (${drillCards.length})`}
                    onSlShow={(e) => {
                        e.preventDefault();
                        setShowAdded(true);
                    }}
                    onSlHide={() => setShowAdded(false)}
                    onClick={(e) => {
                        e.preventDefault();
                        if (!test.current) return;
                        const base = test.current.querySelector("::part(base)");
                        console.log({ base });
                        test.current.onkeyup = () => {};
                        test.current.onkeydown = () => {};
                    }}
                    ref={test}
                >
                    {addedContent}
                </Details>
                <br />
                <Button variant="primary" size="large" onClick={onStart}>
                    start
                </Button>
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
            return newOptions;
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
                                        const newSettings = update((s) => {
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
                                    //onChange={(lines) =>
                                    //    update((opt) => (opt.customCards.data = lines))
                                    //}
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
            //console.log("failed to load options", res.error);
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

    export function filterCards(cards: Iterable<main.CardData>, options: Options): main.CardData[] {
        const customCardSet = new Set(options.customCards.data);
        const result: main.CardData[] = [];

        const { reviewCards } = options;

        for (const card of cards) {
            if (!options.decks.all && !options.decks.data[card.deckName]) {
                continue;
            }

            const isCustom = options.customCards.enabled && customCardSet.has(card.path);
            const isNew = options.newCards && Card.isNew(card);
            const isReview = reviewCards.enabled && reviewCards.all && Card.isReviewing(card);

            let includeCard = false;
            includeCard ||= isCustom;
            includeCard ||= isReview;
            includeCard ||= isNew;

            if (!includeCard && reviewCards.enabled && Card.isReviewing(card)) {
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
    }

    export interface Controls {
        validate: () => Promise<[boolean, string]>;
        getText: () => string;
        clearErrors: () => void;
    }

    export const View = forwardRef(function View({ items }: Props, ref: ForwardedRef<Controls>) {
        const [invalidFilenames, setInvalidFilenames] = useState<string[] | null>(null);
        const textareaRef = useRef<TextareaRef>();
        const [lines, setLines] = useState(items);

        if (useChanged(items)) {
            setLines(items);
            //if (textareaRef.current) textareaRef.current.value = items.join("\n");
        }

        async function onCheck(): Promise<[boolean, string]> {
            if (!textareaRef.current) {
                return [false, ""];
            }

            const [text, invalidPaths] = await validateAndFormat(textareaRef.current.value);
            setInvalidFilenames(invalidPaths.slice(0, 10));

            return [invalidPaths.length > 0, text];
        }

        useImperativeHandle(
            ref,
            () => ({
                validate: onCheck,
                getText: () => textareaRef.current?.textContent ?? "",
                clearErrors: () => {
                    setInvalidFilenames(null);
                },
            }),
            [],
        );

        function onInput() {
            //setInvalidFilenames(null);
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
                            value={lines.join("\n")}
                            ref={textareaRef}
                            placeholder="example: deckname/card-filename.md"
                            onSlInput={onInput}
                            //onSlChange={onCheck}
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
    const sortTypes = ["added", "proficiency", "interval", "last reviewed", "random"] as const;
    export type SortType = typeof sortTypes[number];
    export type Sort = { type: SortType; desc: boolean };

    export interface Props {
        onSubmit: Action;
        //sortType?: SortType;
        //desc?: boolean;
        //onChangeOrder?: Action2<SortType, boolean>;
    }
    export function View({ onSubmit /*sortType = "added", desc = false*/ }: Props) {
        const [actions] = useAtom(appState.actions);
        const [sort, setSort] = useAtom(appState.drillSort);
        const [editing, setEdit] = useState(false);
        const [hasError, setHasError] = useState(false);
        const listEditor = useRef<CardListEditor$.Controls | null>(null);

        const [cards, setCards] = useDrillCards();

        const sortedCards = CardSort.sort(sort.type, sort.desc, cards);
        const [lines, setLines] = useState(sortedCards.map((c) => c.path));

        if (useSomeChanged(cards, sort.type, sort.desc)) {
            const updatedLines = sortedCards.map((c) => c.path);
            setLines(updatedLines);
        }

        function onChangeSelectedSort(type: CardSort.Type, desc: boolean) {
            setSort({ type, desc });
        }

        async function onAction() {
            const edit = !editing;
            if (!edit) {
                const [hasErrors, text] = (await listEditor.current?.validate()) ?? [true, ""];
                if (hasErrors) return;

                const lines = text.split("\n").filter((l) => Boolean(l.trim()));
                const set = new Set(lines);
                const cardMap = new Map<string, Card>();

                const filtered: Card[] = [];
                for (const c of iterateLoadedCards()) {
                    if (set.has(c.path)) {
                        filtered.push(Card.parse(c));
                    }
                }

                for (const c of filtered) {
                    cardMap.set(c.path, c);
                }

                const cards = lines.map((path) => cardMap.get(path) ?? Card.createEmpty());

                setCards(cards);
                //setSort({ type: "added", desc: false });
                setLines(lines);
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

        function onReload() {
            setCards([...cards]);
        }

        return (
            <Container>
                <Block hide={!editing} className="entries">
                    <CardListEditor items={lines} ref={listEditor} />
                </Block>
                <Block></Block>
                <Flex hide={editing} className="entries">
                    <table>
                        <thead>
                            <tr>
                                <th className="num">
                                    <Button variant="default" onClick={onAction} size="small">
                                        {"edit"}
                                    </Button>
                                </th>
                                <th className="filename">
                                    <Flex height="100%">filename</Flex>
                                </th>
                                <th className="sort">
                                    <Flex cml={5}>
                                        <IconButton name="arrow-clockwise" onClick={onReload} />
                                        <Select
                                            onSlChange={(e) =>
                                                onChangeSelectedSort?.(
                                                    EventUtil.value(e) as SortType,
                                                    sort.desc,
                                                )
                                            }
                                            className="sort-types"
                                            value={sort.type}
                                            size="small"
                                        >
                                            {CardSort.types.map((s) => (
                                                <MenuItem key={s} value={s}>
                                                    {s}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                        <Switch
                                            disabled={sort.type === "random"}
                                            checked={sort.desc}
                                            onSlChange={(e) =>
                                                onChangeSelectedSort?.(
                                                    sort.type,
                                                    EventUtil.isChecked(e),
                                                )
                                            }
                                        >
                                            desc
                                        </Switch>
                                    </Flex>
                                    {/*sortType != "added" ? sortType : null*/}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedCards.map((c, i) => (
                                <tr key={c.id}>
                                    <td className="num">{i + 1}</td>
                                    <td className="filename">{c.path} </td>
                                    <td className="sort">
                                        {sort.type === "interval" ? (
                                            c.interval
                                        ) : sort.type === "last reviewed" ? (
                                            <LastUpdate timestamp={c.lastUpdate} />
                                        ) : sort.type === "proficiency" ? (
                                            Factors.getAverage(c.proficiency)
                                        ) : null}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Flex>
                {editing && (
                    <Flex justifyContent={"end"} cmr="5px">
                        <Button variant="default" onClick={onCancel}>
                            cancel
                        </Button>
                        <Button variant="default" onClick={onAction}>
                            {"save changes"}
                        </Button>
                        {/*!editing && (
                        <Button variant="primary" onClick={onSubmit}>
                            start
                        </Button>
                    )*/}
                    </Flex>
                )}
            </Container>
        );
    }
    const Container = styled.div`
        .entries {
        }
        .sort-types {
            width: 150px;
        }
        sl-switch {
            --width: 30px;
            --height: 16px;
            --thumb-size: 13px;
        }
        table {
            width: 100%;
            td {
                padding: 2px;
                display: block;
            }
            th {
                background: ${Shoe.panel_background_color};
                position: sticky;
                z-index: ${Shoe.z_index_dropdown};
                top: 0px;
            }
            tr {
                width: 100%;
                display: flex;
            }
            td {
            }
            thead {
                display: block;
            }
            tbody {
                width: 100%;
                display: block;
                position: relative;
                max-height: 50vh !important;
                overflow-y: auto;
                overflow-x: hidden;
            }
            th.num,
            td.num {
                width: 40px;
            }
            th.filename,
            td.filename {
                width: 70%;
            }
            td.sort {
                width: 30%;
                text-align: right;
            }
        }

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

    function LastUpdate({ timestamp }: { timestamp: number }) {
        const d = new Date(timestamp * 1000);
        return timestamp === 0 ? null : <RelativeTime date={d} />;
    }
}

export const SelectedCards = SelectedCards$.View;

export namespace CardSort {
    export const types = ["added", "proficiency", "interval", "last reviewed", "random"] as const;
    export type Type = typeof types[number];
    export type Sort = { type: Type; desc: boolean };

    export const defaultSort: Sort = {
        type: "added",
        desc: false,
    };

    export function sort(sortType: Type, desc: boolean, cards: Card[]) {
        cards = [...cards];
        if (sortType === "added") {
            if (desc) cards.reverse();
            return cards;
        }

        cards.sort((a, b) => {
            const sign = desc ? -1 : 1;
            if (sortType === "interval") {
                return (a.interval - b.interval) * sign;
            }
            if (sortType === "last reviewed") {
                return (a.lastUpdate - b.lastUpdate) * sign;
            }
            if (sortType === "proficiency") {
                const x = Factors.getAverage(a.proficiency);
                const y = Factors.getAverage(b.proficiency);
                return (x - y) * sign;
            }
            if (sortType === "random") {
                return randomElem([1, 0, -1]) ?? 0;
            }

            return 0;
        });
        return cards;
    }

    const lsKey = "grind-card-sort";
    export function saveDrillSort(sort: Sort) {
        localStorage.setItem(lsKey, JSON.stringify(sort));
    }
    export function loadDrillSort() {
        const obj = tryJSONParse(localStorage.getItem(lsKey) ?? "");
        const sort = { ...CardSort.defaultSort };
        if (hasProp(obj, "type", "string")) {
            const type = obj.type as CardSort.Type;
            if (CardSort.types.includes(type)) sort.type = type;
        }
        if (hasProp(obj, "desc", "boolean")) {
            sort.desc = obj.desc as boolean;
        }
        return sort;
    }
}
