import { memo, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { Action, Action1, randomElem } from "./lib";

export function createSpoilerCanvas(rect: Rect, copyCanvas?: HTMLCanvasElement) {
    const canvas = document.createElement("canvas");
    const color = "#990000";

    canvas.width = rect.width;
    canvas.height = rect.height;
    //canvas.style.border = "1px solid green";
    canvas.style.position = "absolute";

    canvas.style.left = rect.x + "px";
    canvas.style.top = rect.y + "px";

    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";

    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas;

    if (copyCanvas) {
        ctx.drawImage(copyCanvas, 0, 0);
        return canvas;
    }

    // sides
    // -----
    // 1 | 2
    // -----
    // 3 | 4
    // -----

    const side1 = 1 << 0;
    const side2 = 1 << 1;
    const side3 = 1 << 2;
    const side4 = 1 << 3;

    let n = 1;
    switch (Math.floor(Math.random() * 6)) {
        case 0:
            n = side1 | side2;
            break;
        case 1:
            n = side1 | side3;
            break;
        case 2:
            n = side1 | side4;
            break;
        case 3:
            n = side2 | side3;
            break;
        case 4:
            n = side2 | side4;
            break;
        case 5:
            n = side3 | side4;
            break;
    }

    const p = 3;
    const [w, h] = [rect.width / 2 - p, rect.height / 2 - p];
    ctx.fillStyle = color;
    ctx.strokeStyle = "gray";
    if (n & side1) {
        ctx.fillRect(p, p, w, h);
        ctx.strokeRect(p, p, w, h);
        // draw top left
    }
    if (n & side2) {
        ctx.fillRect(p + w, p, w, h);
        ctx.strokeRect(p + w, p, w, h);
        // draw top right
    }
    if (n & side3) {
        ctx.fillRect(p, p + h, w, h);
        ctx.strokeRect(p, p + h, w, h);
        // draw bottom left
    }
    if (n & side4) {
        ctx.fillRect(p + w, p + h, w, h);
        ctx.strokeRect(p + w, p + h, w, h);
        // draw bottom right
    }

    return canvas;
}

export function createBlotCanvas(rect: Rect, copyCanvas?: HTMLCanvasElement) {
    const canvas = document.createElement("canvas");
    const color = "#990000";

    canvas.width = rect.width;
    canvas.height = rect.height;
    //canvas.style.border = "1px solid green";
    canvas.style.position = "absolute";

    canvas.style.left = rect.x + "px";
    canvas.style.top = rect.y + "px";

    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";

    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas;

    if (copyCanvas) {
        ctx.drawImage(copyCanvas, 0, 0);
        return canvas;
    }

    let marginX = rect.width * 0.25;
    let marginY = rect.height * 0.25;

    let [x, y] = [
        marginX + Math.random() * (rect.width - marginX * 2),
        marginY + Math.random() * (rect.height - marginY * 2),
    ];

    ctx.fillStyle = color;

    ctx.beginPath();
    ctx.arc(x, y, rect.width / 3.0, 0, Math.PI * 2);
    ctx.fill();

    marginX = rect.width * 0.1;
    marginY = rect.height * 0.1;
    for (let j = 0; j < 100; j++) {
        [x, y] = [
            marginX + Math.random() * (rect.width - marginX * 2),
            marginY + Math.random() * (rect.height - marginY * 2),
        ];
        ctx.beginPath();
        ctx.arc(x, y, Math.max(rect.width / (7 * (j + 1)), 0.8), 0, Math.PI * 2);
        ctx.fill();
    }

    return canvas;
}

interface Rect {
    //index: number;
    tagName: string;
    x: number;
    y: number;
    width: number;
    height: number;
    text: string;
}

export function getTextBounds(node: Node) {
    if (node.nodeType != Node.TEXT_NODE) {
        return [];
    }

    const result: Rect[] = [];
    const range = document.createRange();
    const len = node.textContent?.length ?? 0;

    for (let i = 0; i < len; i++) {
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        const b = range.getBoundingClientRect();
        result.push({
            tagName: node.parentElement?.tagName?.toLowerCase() ?? "div",
            x: b.x,
            y: b.y,
            width: b.width,
            height: b.height,
            text: node.textContent?.[i] ?? "",
        });
    }
    return result;
}

export function getAllLeterBounds(elem: Node): Rect[] {
    const result: Rect[] = [];

    if (elem.nodeType === Node.TEXT_NODE) {
        return getTextBounds(elem);
    }

    for (const c of elem.childNodes) {
        const bounds = getAllLeterBounds(c);
        result.push(...bounds);
    }
    return result;
}

export function CharacterJumbler({ ch, onSolve, fontSize }: CharacterJumbler.Props) {
    const self = useRef({
        initialized: false,
        indices: [] as number[],
        correctIndex: 0,
    });
    useEffect(() => {
        self.current.initialized = false;
    }, [ch]);

    function onCanvasRef(canvas: HTMLCanvasElement) {
        const ctx = canvas?.getContext("2d");
        const container = canvas?.parentElement?.querySelector("._char");
        if (!container) return;
        if (!ctx) return;

        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;

        ctx.font = getComputedStyle(container).font;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "white";
        ctx.fillText(ch, canvas.width / 2, canvas.height / 2);

        const numCols = 3;
        const [w, h] = [canvas.width / numCols, canvas.height / numCols];

        const sides: ImageData[] = [];
        if (!self.current.initialized) {
            const indices = [];
            for (let n = 0; n < numCols * numCols; n++) {
                indices.push(n);
            }
            const correctIndex = randomElem(indices) ?? 0;
            self.current = {
                initialized: true,
                indices,
                correctIndex,
            };

            jumble();
        }

        for (let n = 0; n < numCols * numCols; n++) {
            const [a, b] = fromIndex(n);
            const imageData = ctx.getImageData(a * w, b * h, w, h);
            if (imageData) sides.push(imageData);
        }

        let hoveredIndex: number | null = null;
        let selectedIndex: number | null = null;
        function redraw() {
            const { indices, correctIndex } = self.current;
            if (!ctx) return;

            ctx.fillStyle = "black";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            let j = 0;
            const solved = isSolved();
            for (const i of indices) {
                const imageData = sides[i];
                if (imageData) {
                    const [x, y] = fromIndex(j);
                    ctx.putImageData(imageData, x * w, y * h);
                    if (!solved) {
                        ctx.strokeStyle = "yellow";
                        ctx.lineWidth = 1;
                        ctx.strokeRect(x * w, y * h, w, h);
                    }
                }
                j++;
            }
            if (correctIndex != -1 && !solved) {
                const [j, i] = fromIndex(correctIndex);
                ctx.strokeStyle = "gray";
                ctx.lineWidth = 1;
                ctx.strokeRect(j * w, i * h, w, h);
                ctx.fillStyle = "#f001";
                ctx.fillRect(j * w, i * h, w, h);
            }
            if (hoveredIndex != null) {
                const [j, i] = fromIndex(hoveredIndex);
                ctx.strokeStyle = "#0f0";
                ctx.lineWidth = 3;
                ctx.strokeRect(j * w, i * h, w, h);
            }
            if (selectedIndex != null) {
                const [j, i] = fromIndex(selectedIndex);
                ctx.strokeStyle = "#0aa";
                ctx.lineWidth = 4;
                ctx.strokeRect(j * w, i * h, w, h);
            }
        }

        function fromIndex(i: number) {
            const [x, y] = [i % numCols, Math.floor(i / numCols)];
            return [x, y];
        }
        function getIndex(x: number, y: number) {
            const [j, i] = [Math.floor(x / w), Math.floor(y / h)];
            return i * numCols + j;
        }
        function isSolved() {
            const { indices } = self.current;
            for (let n = 1; n < indices.length; n++) {
                if (indices[n] < indices[n - 1]) {
                    return false;
                }
            }
            return true;
        }
        function jumble() {
            const { indices, correctIndex } = self.current;
            for (let i = 0; i < indices.length * 2.0; i++) {
                const a = Math.floor(Math.random() * indices.length);
                const b = Math.floor(Math.random() * indices.length);
                if (a !== correctIndex && b !== correctIndex)
                    [indices[a], indices[b]] = [indices[b], indices[a]];
            }
        }

        canvas.onmousemove = (e: MouseEvent) => {
            const { correctIndex } = self.current;
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            hoveredIndex = getIndex(x, y);
            canvas.style.cursor = "pointer";
            if (hoveredIndex === correctIndex) {
                canvas.style.cursor = "not-allowed";
                hoveredIndex = null;
            }
            redraw();
        };
        canvas.onmouseout = (e: MouseEvent) => {
            canvas.style.cursor = "pointer";
            hoveredIndex = null;
            redraw();
        };
        canvas.onmouseup = (e: MouseEvent) => {
            const { indices, correctIndex } = self.current;
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            if (selectedIndex != null) {
                const index = getIndex(x, y);
                if (index !== correctIndex && index >= 0 && index < indices.length) {
                    [indices[selectedIndex], indices[index]] = [
                        indices[index],
                        indices[selectedIndex],
                    ];
                    selectedIndex = null;
                }
                if (isSolved()) {
                    onSolve?.();
                }
                redraw();

                return;
            }

            selectedIndex = getIndex(x, y);
            if (selectedIndex === correctIndex) {
                selectedIndex = null;
            }
            redraw();
        };

        redraw();
    }

    if (!ch.trim()) {
        return <CharacterJumbler.Space fontSize={fontSize}>&nbsp;</CharacterJumbler.Space>;
    }

    return (
        <CharacterJumbler.Wrapper>
            <div>
                <CharacterJumbler.Container fontSize={fontSize}>
                    <div className="_char">{ch}</div>
                    <canvas ref={onCanvasRef} />
                </CharacterJumbler.Container>
            </div>
        </CharacterJumbler.Wrapper>
    );
}
export namespace CharacterJumbler {
    export interface Props {
        ch: string;
        onSolve?: Action;
        fontSize?: string;
    }
    export const Space = styled.div<{ fontSize?: string }>`
        display: inline-block;
        font-size: ${(props) => props.fontSize};
    `;
    export const Wrapper = styled.div`
        display: inline-block;
        margin-right: 10px;
        button {
            font-size: 12px;
        }
        > div {
            display: flex;
            flex-direction: column;
        }
    `;
    export const Container = styled.div<{ fontSize?: string }>`
        display: inline-block;
        font-size: ${(props) => props.fontSize ?? "10vw"};
        width: ${(props) => props.fontSize ?? "10vw"};
        position: relative;

        ._char {
            white-space: nowrap;
            width: fit-width;
            height: ${(props) => props.fontSize ?? "10vw"};
            display: flex;
            align-items: center;
            visibility: hidden;
        }

        canvas {
            top: 0;
            left: 0;
            position: absolute;
        }
    `;
}

export const TextJumbler = memo(
    function TextJumbler({ text, onItemSolve, fontSize: fontSizeProp }: _TextJumbler.Props) {
        const [fontSize, setFontSize] = useState(fontSizeProp ?? 15);
        return (
            <_TextJumbler.Container>
                <div className="_info">
                    ℹ️ Try to solve only the ones you don&apos;t quite remember. Feel free to peek
                    at the answer while answering it, but if you do, you should answer {'"no"'}as
                    the answer.
                    <br />
                    <button onClick={() => setFontSize(Math.max(fontSize - 1, 5))}>-</button>
                    <button onClick={() => setFontSize(Math.min(fontSize + 1, 25))}>+</button>
                </div>
                {text.split("").map((c, i) => (
                    <CharacterJumbler
                        key={c + i}
                        ch={c}
                        fontSize={`${fontSize}vw`}
                        onSolve={() => onItemSolve?.(c)}
                    />
                ))}
            </_TextJumbler.Container>
        );
    },
    (prevProps, props) => {
        return prevProps.text === props.text;
    },
);
export namespace _TextJumbler {
    export interface Props {
        text: string;
        fontSize?: number;
        onItemSolve?: Action1<string>;
    }
    export const Container = styled.div`
        ._info {
            padding: 0 20px;
            font-size: 13px;
        }
    `;
}
