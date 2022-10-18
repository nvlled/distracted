import React, { createContext, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { LogTrace } from "../wailsjs/runtime/runtime";
import { Card } from "./card";
import { lt } from "./layout";
import { Action, clamp, isSymbol, range, shuffle } from "./lib";

const maxChar = 50;

// TODO: add buttons: clear, shuffle, change recognition trainer
// TODO: keep recon trainer opened

export function PhraseInput({
    correctPhrase: correctPhraseProp,
    otherChoices: otherChoicesProp,
}: PhraseInput.Props) {
    type State = "" | "✗" | "✓";
    const { Container, InputAnswer, CorrectAnswer, PhraseList, PhraseChoice } = PhraseInput;

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
                {otherChoices.map((c) => (
                    <PhraseChoice
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
                It's okay to peek at the answer, but if you do, consider it forgotten.
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
                {otherChoices.map((text) => (
                    <PhraseChoice
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
                It's okay to peek at the answer, but if you do, consider it forgotten.
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
        }, [correctPhraseProp]);

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
                        {otherChoices.map((text) => (
                            <PhraseChoice>{text}</PhraseChoice>
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
                    It's okay to peek at the answer, but if you do, consider it forgotten.
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
    const Status = styled.div<{ correct: string }>`
        color: ${(props) => (props.correct ? "#0f0" : "#f00")};
        font-size: 30px;
        display: inline-block;
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
