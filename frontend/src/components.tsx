import { useAtom } from "jotai";
import React, { ReactNode, useCallback, useRef, useState } from "react";
import styled from "styled-components";
import { main } from "./api";
import { Card } from "./card";
import { CardView } from "./CardView";
import { useFn, useKeyPress, useOnMount, useOnUnmount } from "./hooks";
import { Block, Flex } from "./layout";
import { deferInvoke, range, sleep } from "./lib";
import { iterate as iterateCards } from "./loadedCards";
import {
    EventUtil,
    Icon,
    IconButton,
    Input,
    Menu,
    MenuItem,
    Popup,
    Shoe,
    Tooltip,
} from "./shoelace";
import { appState } from "./state";

export function Space({ n = 1 }: { n?: number }) {
    return (
        <>
            {range(n).map((i) => (
                <React.Fragment key={i}>&nbsp;</React.Fragment>
            ))}
        </>
    );
}

export namespace Keybind$ {
    export interface Props {
        children: ReactNode;
        ctrl?: boolean;
        shift?: boolean;
        keyName: string;
        otherKeys?: KeyInfo[];
        placement?: KeybindPopup$.PopupPlacement;
    }
    export function View({ children, keyName, ctrl, shift, otherKeys, placement }: Props) {
        const [show, setShow] = useAtom(appState.showKeybindings);
        const childrenRef = useRef<HTMLDivElement | null>(null);

        const keys = [{ name: keyName, ctrl, shift } as KeyInfo].concat(otherKeys ?? []);

        const handler = useFn(async (e: KeyboardEvent) => {
            if (!childrenRef.current) return;

            let match = false;
            for (const k of keys) {
                if (k.name === e.key) {
                    match = true;
                    break;
                }
            }

            if (!match) {
                return;
            }
            e.preventDefault();
            e.stopPropagation();
            setShow(false);

            const node = childrenRef.current?.querySelector('[slot="anchor"]')?.children[0] as
                | HTMLElement
                | undefined;

            if (!node) {
                return;
            }
            console.log("activate", keyName);
            if (e.shiftKey) node.focus();
            else {
                node.focus();
                await sleep(100);
                node.click();
                await sleep(100);
                node.blur();
            }
        });

        const mouseHandler = useFn(() => {
            setShow(false);
        });

        useOnMount(() => {
            window.addEventListener("keydown", handler);
            window.addEventListener("mouseup", mouseHandler);
        });
        useOnUnmount(() => {
            return () => {
                window.removeEventListener("keydown", handler);
                window.removeEventListener("mousepress", mouseHandler);
            };
        });

        return (
            <Container ref={childrenRef}>
                <KeybindPopup active={show} keys={keys} placement={placement}>
                    {children}
                </KeybindPopup>
            </Container>
        );
    }
    const Container = styled.div``;
}
export const Keybind = Keybind$.View;

export interface KeyInfo {
    name: string;
    ctrl?: boolean;
    shift?: boolean;
}
export namespace KeybindPopup$ {
    export type PopupPlacement =
        | "top"
        | "top-start"
        | "top-end"
        | "bottom"
        | "bottom-start"
        | "bottom-end"
        | "right"
        | "right-start"
        | "right-end"
        | "left"
        | "left-start"
        | "left-end";

    export interface Props {
        children: ReactNode;
        active?: boolean;
        keys: KeyInfo[];
        placement?: PopupPlacement;
    }
    export function View({ children, keys, active, placement = "bottom" }: Props) {
        //const popup = useRef<HTMLDivElement | null>(null);
        //if (popup.current) console.log(getComputedStyle(popup.current).top);

        return (
            <Container>
                <Popup
                    placement={placement}
                    active={active}
                    distance={-5}
                    autoSize="both"
                    //strategy="absolute"
                >
                    <div slot="anchor">{children}</div>

                    <div className="popup-content">
                        {keys.map((k, i) => {
                            let name: string | ReactNode = k.name;

                            if (name === " ") name = "space";
                            if (name === "Enter") name = <Icon name="arrow-return-left" />;
                            if (name === "ArrowUp") name = <Icon name="arrow-up" />;
                            if (name === "ArrowDown") name = <Icon name="arrow-down" />;
                            if (name === "ArrowLeft") name = <Icon name="arrow-left" />;
                            if (name === "ArrowRight") name = <Icon name="arrow-right" />;

                            return (
                                <Flex justifyContent={"start"} key={k.name + i}>
                                    <Icon name="keyboard" />
                                    <Space />
                                    {k.ctrl && "ctrl+"}
                                    {k.shift && "shift+"}
                                    {name}
                                </Flex>
                            );
                        })}
                    </div>
                </Popup>
            </Container>
        );
    }
    const Container = styled.div`
        [slot="anchor"] {
            display: inline-block;
        }
        .popup-content {
            padding: 3px;
            font-size: ${Shoe.font_size_2x_small};
            background: ${Shoe.color_neutral_100};
            sl-icon {
                font-size: ${Shoe.font_size_2x_small};
            }
        }
    `;
}
export const KeybindPopup = KeybindPopup$.View;

export namespace Hotbar$ {
    export interface Props {}
    export function View({}: Props) {
        const [showKeyShortcut, setShowKeyShortcut] = useAtom(appState.showKeybindings);
        const [actions] = useAtom(appState.actions);

        useKeyPress("F2", () => {
            setShowKeyShortcut(!showKeyShortcut);
        });

        return (
            <Container active={showKeyShortcut}>
                <Tooltip content="show key shortcuts (F2)" placement="bottom">
                    <IconButton
                        className="show-key-button"
                        name="keyboard"
                        onClick={(e) => {
                            (e.target as HTMLDivElement).blur();
                            setShowKeyShortcut(!showKeyShortcut);
                        }}
                    />
                </Tooltip>
                <Tooltip content="card view" placement="bottom">
                    <IconButton
                        name="card-heading"
                        onClick={() =>
                            actions.setDrawer(
                                { title: "", width: "100vw", keepOpen: true },
                                <CardSearch />,
                            )
                        }
                    />
                </Tooltip>
            </Container>
        );
    }
    const Container = styled.div<{ active: boolean }>`
        position: absolute;
        top: 0;
        left: 0;
        sl-icon-button.show-key-button::part(base) {
            color: ${(props) => (props.active ? Shoe.color_success_600 : Shoe.color_neutral_500)};
        }
    `;
}
export const Hotbar = Hotbar$.View;

export namespace CardSearch$ {
    export interface Props {}
    export function View({}: Props) {
        const [card, setCard] = useState<Card | null>();
        const [matches, setMatches] = useState([] as main.CardData[]);
        const [showMatches, setShowMatches] = useState(false);

        const onSearch = useCallback(
            deferInvoke(512, function (query: string | undefined) {
                if (!query) {
                    setShowMatches(false);
                    return;
                }

                const matches: main.CardData[] = [];
                for (const c of iterateCards()) {
                    if (c.filename.match(query)) {
                        matches.push(c);
                    }
                    if (matches.length > 100) break;
                }
                setMatches(matches);
                setShowMatches(true);
            }),
            [],
        );

        function onSelect(card: main.CardData) {
            setCard(Card.parse(card));
            setShowMatches(false);
            console.log("select", card.id, card.filename);
        }

        return (
            <Container>
                <div className="inner-container">
                    <Popup placement="bottom-start" active={showMatches} anchor="input-search">
                        <Menu>
                            {matches.map((c) => (
                                <MenuItem key={c.id} onClick={() => onSelect(c)}>
                                    {c.filename}
                                </MenuItem>
                            ))}
                        </Menu>
                    </Popup>
                    <div id="input-search">
                        <Input
                            size="small"
                            onSlInput={(e) => onSearch(EventUtil.value(e))}
                            onSlFocus={() => setShowMatches(true)}
                            onSlBlur={() => {
                                setTimeout(() => {
                                    setShowMatches(false);
                                }, 200);
                            }}
                        />
                    </div>
                    <Block className="card-container" invisible={showMatches && matches.length > 0}>
                        {card && <CardView card={card} />}
                    </Block>
                </div>
            </Container>
        );
    }
    const Container = styled.div`
        .card-container {
            z-index: 1 !important;
        }
        .inner-container {
            max-width: 800px;
            margin: 0 auto;
        }
        sl-menu {
            background: ${Shoe.input_background_color};
            z-index: 10000;
            min-width: 400px;
            max-height: 70vh;
        }
    `;
}
export const CardSearch = CardSearch$.View;
