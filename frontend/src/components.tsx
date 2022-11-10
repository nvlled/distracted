import { useAtom } from "jotai";
import React, { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { useChanged, useOnMount, useOnUnmount, useSomeChanged } from "./hooks";
import { Flex, lt } from "./layout";
import { Action, clamp, deferInvoke, isSymbol, range, shuffle, sleep } from "./lib";
import { Icon, MutationObserver, Popup, PopupRef, Shoe, Tooltip, TooltipRef } from "./shoelace";
import { appState } from "./state";

const maxChar = 50;

// TODO: add buttons: clear, shuffle, change recognition trainer
// TODO: keep recon trainer opened

export function PhraseInput({
    correctPhrase: correctPhraseProp,
    otherChoices: otherChoicesProp,
}: PhraseInput.Props) {
    const { Container, InputAnswer, PhraseList, PhraseChoice } = PhraseInput;

    const [correctPhrase] = useState(
        correctPhraseProp
            .split("")
            .filter((c) => !isSymbol(c))
            .join(""),
    );
    const [answer, setAnswer] = useState("");
    const [otherChoices, setOtherChoices] = useState(
        PhraseInput.getChoices(correctPhrase, otherChoicesProp),
    );

    function onSelectItem(c: string) {
        if (answer.length >= correctPhrase.length) {
            return;
        }
        setAnswer(answer + c);
    }
    function onShuffle() {
        setOtherChoices(shuffle(otherChoices));
        setAnswer("");
    }

    const state = answer.length < correctPhrase.length ? "" : answer === correctPhrase ? "✓" : "✗";

    return (
        <Container>
            <lt.Row justifyContent={"center"} className={"_" + state}>
                {state === "✓" ? <div>✓</div> : state === "✗" ? <div>✗</div> : null}
                <InputAnswer onClick={() => setAnswer("")}>
                    {answer || <span>&nbsp;</span>}
                </InputAnswer>
            </lt.Row>
            <PhraseList>
                {otherChoices.map((c, i) => (
                    <PhraseChoice
                        key={c + i}
                        onClick={() => onSelectItem(c)}
                        onMouseDown={(e) => {
                            if (e.detail > 1) {
                                e.preventDefault();
                            }
                        }}
                    >
                        {c}
                    </PhraseChoice>
                ))}
            </PhraseList>
            <lt.Row justifyContent={"center"}>
                <button
                    onClick={() => {
                        setAnswer(answer.slice(0, answer.length - 1));
                    }}
                >
                    ←
                </button>
                <button onClick={() => setAnswer("")}>clear</button>
                <button onClick={onShuffle}>shuffle</button>
            </lt.Row>
            <div className="_info">
                Input the correct keyword by clicking on the letters. <br />
                It&apos;s okay to peek at the answer, but if you do, consider it forgotten.
            </div>
        </Container>
    );
}

export namespace PhraseInput {
    export interface Props {
        correctPhrase: string;
        otherChoices: string[];
    }

    export const Container = styled.div`
        font-size: 1.5vw;
        text-align: center;
        border: 1px solid gray;
        padding: 5px;

        ._✓ {
            color: #0f0;
        }
        ._✗ {
            color: #f00;
        }

        ._info {
            font-size: 16px;
            font-style: italic;
        }
    `;
    export const InputAnswer = styled.div`
        font-size: 2.2vw;
        cursor: pointer;
        border-bottom: 2px solid white;
        min-width: 100px;
    `;
    export const CorrectAnswer = styled.div<{ show?: boolean }>`
        font-size: 2.2vw;
        display: inline-block;
        color: black;
        background-color: black;
        ${(props) => props.show && "color: cyan; background-color: #fff0"};
        :hover {
            color: white;
        }
    `;
    export const PhraseList = styled.div``;
    export const PhraseChoice = styled.div<{ selected?: boolean }>`
        cursor: pointer;
        font-size: 2vw;
        display: inline-block;
        padding: 15px;
        border-bottom: 2px solid #0000;
        :hover {
            border-bottom: 2px solid white;
        }
        :active {
            color: cyan;
        }
    `;

    export function getChoices(correct: string, items: string[]) {
        items.unshift(correct);
        const set = new Set(items.flatMap((e) => e.trim().split("")).filter(Boolean));
        const result: string[] = [];
        let chars = 0;
        for (const e of set) {
            if (!isSymbol(e)) result.push(e);
            chars++;
            if (chars > maxChar) {
                break;
            }
        }

        return shuffle(result);
    }
}

export function PhraseSearch({
    correctPhrase,
    otherChoices: otherChoicesProp,
}: PhraseSearch.Props) {
    const { Container, CorrectAnswer, PhraseList, PhraseChoice } = PhraseSearch;

    const [answer, setAnswer] = useState("");
    const [otherChoices, setOtherChoices] = useState(
        PhraseSearch.getChoices(correctPhrase, otherChoicesProp),
    );
    const correct = answer === correctPhrase;

    function onShuffle() {
        setAnswer("");
        setOtherChoices(shuffle(otherChoices));
    }

    return (
        <Container>
            <CorrectAnswer correct={correct}>
                {!answer ? "" : correct ? "✓" : "✗"}
                {answer}
            </CorrectAnswer>
            <PhraseList>
                {otherChoices.map((text, i) => (
                    <PhraseChoice
                        key={text + i}
                        onClick={() => setAnswer(text)}
                        selected={answer === text}
                        correct={text === correctPhrase}
                    >
                        {text}
                    </PhraseChoice>
                ))}
            </PhraseList>
            <div>
                <button onClick={onShuffle}>shuffle</button>
            </div>
            <div className="_info">
                Search for the correct keyword by clicking it. <br />
                It&apos;s okay to peek at the answer, but if you do, consider it forgotten.
            </div>
        </Container>
    );
}

export namespace PhraseSearch {
    export interface Props {
        correctPhrase: string;
        otherChoices: string[];
    }

    export const Container = styled.div`
        text-align: center;
        cursor: pointer;
        border: 1px solid gray;
        padding: 5px;

        ._info {
            font-size: 15px;
            font-style: italic;
        }
    `;
    export const CorrectAnswer = styled.div<{ correct?: boolean }>`
        font-size: 2.5vw;
        display: inline-block;
        ${(props) => (props.correct ? "color: #0f0" : "color: #f00")};
        :hover {
            color: white;
        }
    `;
    export const PhraseList = styled.div`
        font-size: 2.5vw;
    `;
    export const PhraseChoice = styled.div<{ selected?: boolean; correct?: boolean }>`
        display: inline-block;
        margin-right: 0vw;
        border-bottom: 2px solid #0000;
        ${(props) => {
            if (!props.selected) {
                return "";
            }
            if (props.correct) {
                return "border-color: #0f0";
            }
            return "border-color: #f00";
        }};
    `;

    export function getChoices(correct: string, items: string[]) {
        const correctLetters = correct.split("").filter((c) => !isSymbol(c));
        items.unshift(correct);

        const set = new Set(items.slice(0, maxChar));
        const result: string[] = [];

        let chars = 0;
        let i = 0;
        for (let item of set) {
            item = item
                .split("")
                .filter((c) => !isSymbol(c))
                .join("");
            if (item != correct && correct.length > 1) {
                item += correctLetters[i];
                i = (i + 1) % correctLetters.length;
            }

            result.push(item);
            chars += item.length;
            if (chars > maxChar) {
                break;
            }
        }
        return shuffle(result);
    }
}

namespace _PhraseSelect {
    export interface Props {
        correctPhrase: string;
        otherChoices: string[];
        onCorrectAnswer?: Action;
    }
    export function View({
        correctPhrase: correctPhraseProp,
        otherChoices: otherChoicesProp,
        onCorrectAnswer,
    }: Props) {
        const [answer, setAnswer] = useState("");
        const [correctPhrase, setCorrectPhrase] = useState("");
        const [otherChoices, setOtherChoices] = useState<string[]>([]);
        const timerID = useRef<number>();

        useEffect(() => {
            const correctPhrase = correctPhraseProp
                .split("")
                .filter((c) => !isSymbol(c))
                .join("");
            const otherChoices = getChoices(correctPhrase, otherChoicesProp);

            setOtherChoices(otherChoices);
            setCorrectPhrase(correctPhrase);
            setAnswer("");
        }, [correctPhraseProp, otherChoicesProp]);

        function shiftRight() {
            setOtherChoices((otherChoices) =>
                otherChoices.slice(1).concat(otherChoices.slice(0, 1)),
            );
            window.getSelection()?.removeAllRanges();
        }
        function shiftLeft() {
            setOtherChoices((otherChoices) => {
                const n = otherChoices.length - 1;
                return otherChoices.slice(n).concat(otherChoices.slice(0, n));
            });
            window.getSelection()?.removeAllRanges();
        }
        function bigShiftLeft() {
            clearInterval(timerID.current);
            shiftLeft();
            let steps = 0;
            timerID.current = window.setInterval(() => {
                if (steps++ > bigShiftStep) clearInterval(timerID.current);
                shiftLeft();
            }, shiftInterval);
        }
        function bigShiftRight() {
            clearInterval(timerID.current);
            shiftRight();
            let steps = 0;
            timerID.current = window.setInterval(() => {
                if (steps++ > bigShiftStep) clearInterval(timerID.current);
                shiftRight();
            }, shiftInterval);
        }

        function onShuffle() {
            setAnswer("");
            setOtherChoices(shuffle(otherChoices));
        }
        function onTextSelect() {
            const text = window
                .getSelection()
                ?.toString()
                ?.split("")
                ?.map((x) => x.trim())
                ?.join("");

            if (text) setAnswer(text);
            if (text === correctPhrase) {
                onCorrectAnswer?.();
            }
        }

        // ABC[DEFGHIJ]KL
        // ABCD[EFGHIJK]L
        // ABCDE[FGHIJKL]
        // A]BCDEF[GHIJKL-
        // AB]CDEFG[HIJKL-

        const correct = answer === correctPhrase;
        return (
            <Container>
                <CorrectAnswer correct={correct}>
                    {!answer ? "" : correct ? "✓" : "✗"}
                    {answer}
                </CorrectAnswer>
                <lt.Row justifyContent={""}>
                    <div>
                        <button onClick={shiftLeft}>←</button>
                        <button onClick={bigShiftLeft}>←←</button>
                    </div>
                    <PhraseList
                        onMouseUp={onTextSelect}
                        fontSize={
                            clamp(
                                fontSize.max / (correctPhrase.length * 0.7),
                                fontSize.min,
                                fontSize.max,
                            ) + "px"
                        }
                    >
                        {otherChoices.map((text, i) => (
                            <PhraseChoice key={text + i}>{text}</PhraseChoice>
                        ))}
                    </PhraseList>
                    <div>
                        <button onClick={shiftRight}>→</button>
                        <button onClick={bigShiftRight}>→→</button>
                    </div>
                </lt.Row>

                <div>
                    <button onClick={onShuffle}>shuffle</button>
                </div>
                <div className="_info">
                    Search for the correct keyword by selecting it. <br />
                    It&apos;s okay to peek at the answer, but if you do, consider it forgotten.
                </div>
            </Container>
        );
    }

    const shiftInterval = 350;
    const bigShiftStep = 5;
    const fontSize = { min: 50, max: 230 };
    const Container = styled.div`
        text-align: center;
        cursor: pointer;
        border: 1px solid gray;
        padding: 5px;

        ._info {
            font-size: 15px;
            font-style: italic;
        }
    `;
    const CorrectAnswer = styled.div<{ correct?: boolean }>`
        font-size: 2.5vw;
        display: inline-block;
        ${(props) => (props.correct ? "color: #0f0" : "color: #f00")};
        :hover {
            color: white;
        }
    `;
    const PhraseList = styled.div<{ fontSize: string }>`
        font-size: ${(props) => props.fontSize};
        display: flex;
        justify-content: center;
        overflow-x: hidden;
        width: 100%;
    `;
    const PhraseChoice = styled.span<{ selected?: boolean; correct?: boolean }>`
        margin-right: 0vw;
        border: 2px solid #0000;
        display: inline;
        ${(props) => {
            if (!props.selected) {
                return "";
            }
            if (props.correct) {
                return "border-color: #0f0";
            }
            return "border-color: #f00";
        }};
    `;
    function getChoices(correct: string, items: string[]) {
        const correctLetters = correct.split("").filter((c) => !isSymbol(c));
        items.unshift(correct);
        console.log({ correctLetters });

        const set = new Set(items.slice(0, maxChar));
        const result: string[] = [];

        let chars = 0;
        let i = 0;
        for (let item of set) {
            item = item
                .split("")
                .filter((c) => !isSymbol(c))
                .join("");
            if (item != correct && correct.length > 1) {
                if (Math.random() < 0.45) {
                    item += correctLetters[i];
                    i = (i + 1) % correctLetters.length;
                }
            }

            result.push(item);
            chars += item.length;
            if (chars > maxChar) {
                break;
            }
        }

        return shuffle(result).flatMap((e) => e.split(""));
        //return result.flatMap((e) => e.split(""));
    }
}
export const PhraseSelect = _PhraseSelect.View;

export function Space({ n = 1 }: { n?: number }) {
    return (
        <>
            {range(n).map((i) => (
                <React.Fragment key={i}>&nbsp;</React.Fragment>
            ))}
        </>
    );
}

export function Tick({ intervalMs = 1000, onTick }: { intervalMs?: number; onTick: Action }) {
    const timerID = useRef(0);
    const lastUpdate = useRef(0);

    useEffect(() => {
        const fn = () => {
            const now = Date.now() - lastUpdate.current;
            if (now >= intervalMs) {
                onTick();
                lastUpdate.current = now;
            }
        };

        timerID.current = window.setInterval(fn, intervalMs);
        return () => window.clearInterval(timerID.current);
    }, [intervalMs, onTick]);

    return <div />;
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

        const handler = useCallback(
            async (e: KeyboardEvent) => {
                e.preventDefault();
                e.stopPropagation();
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
            },
            [keyName, children],
        );

        const mouseHandler = useCallback(() => {
            setShow(false);
        }, []);

        useOnMount(() => {
            window.addEventListener("keyup", handler);
            window.addEventListener("mouseup", mouseHandler);
        });
        useOnUnmount(() => {
            return () => {
                window.removeEventListener("keyup", handler);
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
