import { ChangeEvent, forwardRef, memo, useCallback } from "react";
import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { Card } from "./card";
import { FactorData, FactorID, Factors, FactorTrial } from "./factors";
import { DeckAudio, DeckAudioVolume } from "./DeckAudio";
import { lt } from "./layout";
import {
    Action,
    Action1,
    Action2,
    findAllIndices,
    getRelatedCharacters,
    hasProp,
    isSymbol as isPunctuation,
    isSymbol,
    LocalStorageSerializer,
    randomColor,
    randomElem,
    range,
    shuffle,
} from "./lib";
import { AudioPlayer } from "./AudioPlayer";
import { CardView } from "./CardView";

/*

AudioComponent {
    useEffect(() => {
        const handler = {
            start: () => setState("playing")
            stop: () => setState("stopped")
        }
        audioControl.register(src, handler)
        return () => audioControl.unregister(src, handler)
    }, [])
}

*/

/*

class MultiMap<K, V> {
    private map: Map<K, V[]>;
    constructor() {
        this.map = new Map<K, V[]>();
    }
    get(key: K): Iterable<V> {
        return this.map.get(key) ?? [];
    }
    add(key: K, value: V) {
        if (!this.map.has(key)) {
            this.map.set(key, [value]);
        } else {
            const items = this.map.get(key);
            if (!items?.includes(value)) {
                items?.push(value);
            }
        }
    }
    delete(key: K, value: V) {
        const items = this.map.get(key);
        if (!items) return;

        const i = items.indexOf(value);
        if (i !== undefined && i >= 0) {
            items.splice(i, 1);
        }
        if (items.length === 0) {
            this.map.delete(key);
        }
    }
}

namespace AudioController {
    const handlerMap = new MultiMap<string, Handler>();

    export interface Handler {
        play: Action;
        stop: Action;
    }
    export function play(...audioSrcs: string[]) {
        for (const src of audioSrcs) {
            const handlers = handlerMap.get(src);
            for (const h of handlers) {
                h.play();
            }
        }
    }

    export function stop(audioSrc: string) {
        const handlers = handlerMap.get(audioSrc);
        for (const h of handlers) {
            h.stop();
        }
    }
    export function register(audioSrc: string, handler: Handler) {
        handlerMap.add(audioSrc, handler);
    }
    export function unregister(audioSrc: string, handler: Handler) {
        handlerMap.delete(audioSrc, handler);
    }
}
*/

namespace Observation$ {
    export interface Props {
        card: Card;
        otherCards: Card[];
        tested: FactorID;
        presented: FactorID;
        factorData: FactorData;
        onSubmit: Action;
    }

    export function View({ card, otherCards, tested, presented, onSubmit }: Props) {
        //presented = "text";
        //tested = "meaning";
        const [completed, setCompleted] = useState(false);

        function onMouseUp() {
            DeckAudio.play(card.factorData["sound"] ?? "");
        }

        function onComplete() {
            setCompleted(true);
        }

        const otherSounds = otherCards
            .map((c) => c.factorData["sound"] ?? "")
            .filter(Boolean)
            .slice(0, 9);

        let testedContent = <>unknown factor to test: {tested}</>;
        if (tested === "meaning") {
            testedContent = (
                <ColorizeText
                    text={card.factorData["text"] ?? ""}
                    onMouseUp={onMouseUp}
                    onComplete={onComplete}
                />
            );
        } else if (tested === "text") {
            testedContent = (
                <ColorizeText
                    text={card.factorData["text"] ?? ""}
                    onMouseUp={onMouseUp}
                    onComplete={onComplete}
                />
            );
        } else if (tested === "sound") {
            testedContent = (
                <SoundSearch
                    sound={card.factorData["sound"] ?? ""}
                    noise={otherSounds}
                    onComplete={onComplete}
                />
            );
        }

        return (
            <Container>
                <div className="presented">
                    {tested !== "sound" && <AudioPlayer src={card.factorData["sound"] ?? ""} />}
                    {card.factorData[tested === "text" ? "meaning" : "text"]}
                </div>
                <hr />
                <div className="tested">{testedContent}</div>
                {completed && (
                    <>
                        <button onClick={onSubmit}>continue</button>
                    </>
                )}
            </Container>
        );
    }

    const Container = styled.div`
        > .presented {
            text-align: center;
            font-size: 150%;
            display: flex;
            align-items: center;
            justify-content: center;
            > * {
                margin-right: 10px;
            }
        }
        > .tested {
            display: flex;
            justify-content: center;
        }
    `;
}
export const Observation = Observation$.View;

export namespace _ProficiencyTrial {
    export type State = "test" | "prompt" | "review";
    export interface Props {
        card: Card;
        otherCards: Card[];
        onSubmit: Action2<boolean, FactorTrial>;
    }
    export function View({ card, otherCards, onSubmit }: Props) {
        const initialState: State = "test";
        const [state, setState] = useState<State>("test");
        const [audioPlaying, setAudioPlaying] = useState(false);
        const [trial, setTrial] = useState<FactorTrial>({
            tested: "text",
            presented: "meaning",
            observation: false,
        });
        const [testNoise, setTestNoise] = useState("");
        const [recalled, setRecalled] = useState(false);

        const { tested, presented } = trial;

        function onSubmitTest() {
            setState("prompt");
            DeckAudio.playFirst(card);
        }

        function onContinue() {
            onSubmit(recalled, trial);
        }

        function onSubmitObservation() {
            onSubmit(true, trial);
        }

        async function onSubmitAnswer(recalled: boolean) {
            setState("review");
            setAudioPlaying(true);
            await DeckAudio.play(card);
            setAudioPlaying(false);
            setRecalled(recalled);
        }

        const init = useCallback(
            function init(card: Card) {
                const trial = Card.getTrial(card);
                setState(initialState);

                //trial.observation = true; // !!!
                //trial.presented = "sound";
                //trial.tested = "text";

                const noise = otherCards
                    .map((c) => c.factorData[trial.tested] ?? "")
                    .filter((s) => !isPunctuation(s))
                    .join("");

                setAudioPlaying(false);
                setRecalled(false);
                setTestNoise(noise);
                setTrial(trial);

                if (trial.presented === "sound") {
                    DeckAudio.play(card.factorData.sound ?? "");
                }
            },
            [otherCards],
        );

        useEffect(() => {
            init(card);
        }, [card, init]);

        if (trial.observation) {
            return (
                <Observation
                    card={card}
                    otherCards={otherCards}
                    factorData={card.factorData}
                    tested={tested}
                    presented={presented}
                    onSubmit={onSubmitObservation}
                />
            );
        }
        /*
         */

        const actionButton =
            state === "test" ? (
                <button onClick={onSubmitTest}>show</button>
            ) : state === "prompt" ? (
                <>
                    <div>
                        <button onClick={() => onSubmitAnswer(true)}>yes</button>
                        do you remember?
                        <button onClick={() => onSubmitAnswer(false)}>no</button>
                    </div>
                </>
            ) : (
                <button onClick={onContinue}>continue</button>
            );

        let presentedContent = <></>;
        if (presented === "meaning" || presented === "text") {
            presentedContent = <>{card.factorData[presented]}</>;
        } else if (presented === "sound") {
            presentedContent = <AudioPlayer src={card.factorData["sound"] ?? ""} />;
        }

        let testedContent = <div className="recall-info">{`<recall ${tested}>`}</div>;
        if (tested === "text") {
            testedContent = (
                <WordSearch
                    text={card.factorData[tested] ?? ""}
                    noise={testNoise}
                    reveal={state != "test"}
                />
            );
        } else if (state !== "test") {
            if (tested === "meaning") {
                testedContent = <>{card.factorData[tested]}</>;
            } else if (tested === "sound") {
                testedContent = <AudioPlayer src={card.factorData["sound"] ?? ""} />;
            }
        }

        return (
            <Container>
                <pre>{JSON.stringify(Factors.get(card.proficiency))}</pre>
                {card.audios.map((src) => (
                    <DeckAudioVolume key={src} src={src} />
                ))}
                <hr />

                <div className="proficiency">
                    <div className="presented">{presentedContent}</div>
                    <div className="tested">{testedContent}</div>
                </div>
                <hr />
                {state === "review" && card && (
                    <div>
                        <CardView card={card} />
                        <br />
                    </div>
                )}
                {audioPlaying ? (
                    <div className="audio-wait">*please wait and listen*</div>
                ) : (
                    <div className="buttons">{actionButton}</div>
                )}
            </Container>
        );
    }

    const Container = styled.div`
        > .buttons {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;

            button {
                margin: 0px 20px;
                padding: 10px 30px;
            }
        }
        > .proficiency {
            min-height: 120px;
            display: flex;
            align-items: center;
            justify-content: space-around;

            .presented,
            .tested {
                color: white;
                width: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .presented {
                border-right: 2px solid gray;
                margin-right: 20px;
                font-size: 2ch;
            }
            .tested {
                font-size: 2ch;
            }
        }

        .recall-info {
            font-size: 70%;
            font-style: italic;
            color: #ddd;
        }
        .audio-wait {
            font-style: italic;
            text-align: center;
        }
    `;
}
export const ProficiencyTrial = memo(
    _ProficiencyTrial.View,
    (prev, props) => prev.card.id === props.card.id,
);

namespace CardTrial$ {
    export interface Props {
        card: Card;
    }
    export function View({ card }: Props) {
        return <div></div>;
    }
}
export const CardTrial = CardTrial$.View;

export namespace ColorizeChar$ {
    export interface Settings {
        //penSize: number;
        penScale: number;
        penColor: string;
        opacity: number;
        autoHide: boolean;
    }
    interface CanvasBuffer {
        canvas: HTMLCanvasElement;
        ctx: CanvasRenderingContext2D;
    }

    const initRefs = {
        initialized: false,
        mouseDown: false,
        canvas: null as HTMLCanvasElement | null,
        front: null as CanvasBuffer | null,
        back: null as CanvasBuffer | null,
        ctx: null as CanvasRenderingContext2D | null,
        initColorCount: { white: 0, bg: 0 } as ColorCount,
        colorCount: { white: 0, bg: 0 } as ColorCount,
        prevPoint: null as Vector | null,
        dir: { x: 0.0, y: 0.0 } as Vector,
        penSize: 20,
    };
    type Refs = typeof initRefs;

    type CanvasProps = {
        text: string;
        settings: Settings;
        fontSize?: number;
        onUpdate: Action2<ColorCount, ColorCount>;
    };
    const Canvas = memo(
        forwardRef(function ({ text, settings, fontSize, onUpdate }: CanvasProps, ref) {
            const { current: refs } = useRef({ ...initRefs });
            //function onMountBackCanvas(canvas: HTMLCanvasElement) {
            //    if (!canvas) return;
            //    refs.canvasBuffer = canvas;
            //}
            function onMountFrontCanvas(canvas: HTMLCanvasElement) {
                if (!canvas) return;
                console.log("onMountCanvas");
                refs.canvas = canvas;
                refs.ctx = canvas.getContext("2d");
            }
            function onMouseUp() {
                const { canvas, ctx } = refs;
                if (canvas && ctx) {
                    onUpdate(refs.colorCount, refs.initColorCount);
                }
            }
            useEffect(() => {
                initCanvas(text, refs, settings);
                onUpdate(refs.colorCount, refs.initColorCount);
            }, [text, fontSize, settings, onUpdate, refs]);

            return (
                <CanvasContainer fontSize={fontSize}>
                    {/*
                    <canvas
                        className="buffer"
                        ref={onMountBackCanvas}
                        onMouseDown={(e) => e.preventDefault()}
                    />
                    */}
                    <canvas
                        className="front"
                        ref={onMountFrontCanvas}
                        onMouseUp={onMouseUp}
                    ></canvas>
                </CanvasContainer>
            );
        }),
        (prev, props) => prev.text === props.text && prev.fontSize === props.fontSize,
    );
    const CanvasContainer = styled.div<{ fontSize?: number }>`
        font-size: ${(props) => props.fontSize ?? "400"}px;
        canvas.front {
            border: 1px solid gray;
            display: block;
            z-index: 100;
        }
        canvas.buffer {
            z-index: -1;
            position: absolute;
        }
    `;

    type Vector = { x: number; y: number };

    function getRelativePos(canvas: HTMLCanvasElement, e: MouseEvent) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        return { x, y };
    }

    function drawTextShape(text: string, canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
        const metrics = ctx.measureText(text);
        ctx.save();
        ctx.textAlign = "left";
        ctx.textBaseline = "bottom";
        ctx.fillStyle = "white";
        ctx.fillText(text, (canvas.width - metrics.width) / 2, canvas.height);
        ctx.restore();
    }
    function drawTextOutline(
        text: string,
        canvas: HTMLCanvasElement,
        ctx: CanvasRenderingContext2D,
    ) {
        const metrics = ctx.measureText(text);
        ctx.save();
        ctx.textAlign = "left";
        ctx.textBaseline = "bottom";
        ctx.fillStyle = "white";
        ctx.strokeStyle = "black";
        ctx.lineWidth = 2;
        ctx.strokeText(text, (canvas.width - metrics.width) / 2, canvas.height);
        ctx.restore();
    }

    function createBuffer(canvas: HTMLCanvasElement) {
        const newCanvas = canvas.cloneNode(true) as HTMLCanvasElement;
        const ctx = newCanvas.getContext("2d");
        if (!ctx) return;
        newCanvas.width = canvas.width;
        newCanvas.height = canvas.height;
        ctx.font = canvas.getContext("2d")?.font ?? "";
        return {
            canvas: newCanvas,
            ctx,
        };
    }

    function clear(refs: Refs) {
        const { ctx, canvas } = refs;
        if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    function drawBuffer(ctx: CanvasRenderingContext2D, buffer: CanvasBuffer) {
        ctx.drawImage(buffer.canvas, 0, 0);
    }

    function initCanvas(text: string, refs: Refs, settings: Settings) {
        const { canvas, ctx } = refs;
        const container = canvas?.parentElement;
        if (!container || !canvas || !ctx) return;

        const cs = getComputedStyle(container);
        const metrics = ctx.measureText(text);
        const fontHeight = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;

        canvas.width = metrics.width;
        canvas.height = fontHeight;
        ctx.font = cs.font;

        const back = createBuffer(canvas);
        const front = createBuffer(canvas);
        if (!back || !front) return;

        drawTextShape(text, back.canvas, back.ctx);
        drawTextOutline(text, back.canvas, back.ctx);

        drawBuffer(ctx, back);

        refs.initColorCount = countColor(back.canvas, back.ctx);
        refs.colorCount = refs.initColorCount;
        refs.penSize = fontHeight / 30;
        refs.front = front;
        refs.back = back;

        canvas.onmousemove = (e: MouseEvent) => {
            e.preventDefault();
            if (!refs.mouseDown) return;
            refs.dir = { x: 0, y: 0 };
            clear(refs);
            drawPoint(getRelativePos(canvas, e), refs, settings);

            if (settings.penColor === "#0000" || !settings.autoHide) {
                drawBuffer(ctx, back);
            }
            drawBuffer(ctx, front);
        };
        canvas.onmouseup = (e: MouseEvent) => {
            e.preventDefault();
            refs.mouseDown = false;
            //drawPoint(getRelativePos(canvas, e), refs, settings);
            refs.prevPoint = null;

            //drawTextOutline(text, canvas, ctx);
            drawBuffer(ctx, back);
            drawBuffer(ctx, front);
            drawTextOutline(text, canvas, ctx);

            refs.colorCount = countColor(canvas, ctx);
        };
        //canvas.onmouseout = canvas.onmouseup;

        canvas.onmousedown = (e: MouseEvent) => {
            e.preventDefault();
            const pos = getRelativePos(canvas, e);
            refs.mouseDown = true;
            drawPoint(pos, refs, settings);
            drawBuffer(ctx, front);
        };
    }

    function drawPoint(pos: Vector, refs: Refs, settings: Settings) {
        const ctx = refs.front?.ctx;
        const { penScale, penColor, opacity } = settings;
        const { penSize } = refs;
        if (!ctx) return;

        const size = penSize * penScale;
        ctx.fillStyle = penColor;
        const [x, y] = [pos.x, pos.y];
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.translate(x, y);

        if (refs.prevPoint) {
            const v = vec.sub(pos, refs.prevPoint);
            refs.dir = vec.add(refs.dir, v);
        }
        const angle = Math.atan(refs.dir.y / refs.dir.x);
        ctx.rotate(angle);

        if (penColor === "#0000") {
            ctx.clearRect(-size / 2, -size / 2, size, size);
        } else {
            ctx.fillRect(-size / 2, -size / 2, size, size);

            for (let i = 0; i < 1; i++) {
                //ctx.fillStyle = "#f007";
                const a = -size + Math.random() * size * 2;
                const b = -size + Math.random() * size * 2;
                const n = 0 + (Math.random() * size) / 8;
                if (Math.random() < 0.3) {
                    ctx.beginPath();
                    ctx.arc(a, b, n, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        ctx.restore();

        //ctx.beginPath();
        //ctx.arc(pos.x, pos.y, size / 2, 0, Math.PI * 2);
        //ctx.fill();

        //ctx.lineWidth = size;
        //ctx.beginPath();
        //ctx.moveTo(pos.x, pos.y);
        //if (prevPoint) ctx.lineTo(prevPoint.x, prevPoint.y);
        //ctx.stroke();

        refs.prevPoint = pos;
    }
    const vec = {
        add(v: Vector, w: Vector) {
            return {
                x: v.x + w.x,
                y: v.y + w.y,
            };
        },
        sub(v: Vector, w: Vector) {
            return {
                x: v.x - w.x,
                y: v.y - w.y,
            };
        },
        norm(v: Vector) {
            const len = Math.sqrt(v.x * v.x * v.y * v.y);
            return {
                x: v.x / len,
                y: v.y / len,
            };
        },
        scale(v: Vector, n: number) {
            return {
                x: v.x * n,
                y: v.y * n,
            };
        },
    };

    type ColorCount = { white: number; fg: number; bg: number };
    function countColor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): ColorCount {
        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const result = { white: 0, fg: 0, bg: 0 };
        for (let i = 0; i < image.data.length; i += 4) {
            const r = image.data[i + 0];
            const g = image.data[i + 1];
            const b = image.data[i + 2];
            const a = image.data[i + 3];
            if (a === 0) {
                result.bg++;
            } else if ((r + g + b) / 3 > 250) {
                result.white++;
            } else {
                result.fg++;
            }
        }
        return result;
    }

    export interface Props {
        text: string;
        settings: Settings;
        fontSize?: number;
        onComplete?: Action;
    }
    export function View({ text, fontSize, settings, onComplete }: Props) {
        const [colorCount, setColorCount] = useState<ColorCount>({ white: 0, fg: 0, bg: 0 });
        const [initColorCount, setInitColorCount] = useState<ColorCount>({
            white: 0,
            fg: 0,
            bg: 0,
        });

        function onUpdate(colorCount: ColorCount, initColorCount: ColorCount) {
            setColorCount(colorCount);
            setInitColorCount(initColorCount);

            const completed = Math.ceil(
                ((initColorCount.white - colorCount.white) / initColorCount.white) * 100,
            );
            if (completed >= 97) {
                onComplete?.();
            }
        }

        const completed = Math.ceil(
            ((initColorCount.white - colorCount.white) / initColorCount.white) * 100,
        );

        return (
            <Container>
                <div className="progress">
                    {initColorCount.white > 0 && (
                        <>
                            ✓:
                            {completed}%
                        </>
                    )}{" "}
                    {initColorCount.bg > 0 && (
                        <>
                            ✗:
                            {Math.ceil(
                                ((initColorCount.bg - colorCount.bg) / initColorCount.bg) * 100,
                            )}
                            %
                        </>
                    )}
                </div>

                <Canvas onUpdate={onUpdate} text={text} settings={settings} fontSize={fontSize} />
            </Container>
        );
    }
    const Container = styled.div`
        .progress {
            text-align: center;
            font-size: 70%;
        }
        input[type="range"] {
            display: inline-block !important;
            max-width: 50px;
        }
    `;
}
export const ColorizeChar = memo(
    ColorizeChar$.View,
    (prev, props) => prev.text === props.text && prev.fontSize === props.fontSize,
);

export namespace ColorizeText$ {
    export interface Props {
        text: string;
        onMouseUp?: Action;
        onComplete?: Action1<number>;
    }
    export function View({ text, onComplete, onMouseUp }: Props) {
        const [penColor, setPenColor] = useState("#f00");
        const [chars, setChars] = useState<string[]>([]);
        const [fontSize, setFontSize] = useState(400);
        const [expand, setExpand] = useState(false);
        const [, setLastUpdate] = useState(Date.now());

        //const [settings, setSettings] = useState<ColorizeChar$.Settings>({
        //    opacity: 1,
        //    penColor: "red",
        //    penScale: 1,
        //    autoHide: false,
        //});

        const { current: settings } = useRef({
            opacity: 1,
            penColor: "red",
            penScale: 1,
            autoHide: false,
            lastPenColor: "red",
        } as ColorizeChar$.Settings & { lastPenColor: string });

        function onSetErase() {
            if (penColor === "#0000") {
                settings.penColor = settings.lastPenColor;
                setPenColor(settings.penColor);
            } else {
                settings.lastPenColor = settings.penColor;
                settings.penColor = "#0000";
                setPenColor(settings.penColor);
            }
        }
        function onRandomPen() {
            const color = randomColor();
            const opacity = 0.5 + Math.random() * 0.5;

            settings.penColor = color;
            settings.opacity = opacity;

            setPenColor(settings.penColor);

            controlStateSerializer.update((s) => {
                s.color = color;
                s.opacity = opacity;
            });
        }
        function onChangeColor(e: ChangeEvent<HTMLInputElement>) {
            settings.penColor = e.target.value;
            setPenColor(settings.penColor);
            controlStateSerializer.update((s) => (s.color = settings.penColor));
            setLastUpdate(Date.now());
        }
        function onChangePenSize(e: ChangeEvent<HTMLInputElement>) {
            const penScale = Math.min(parseFloat(e.target.value), 1);
            settings.penScale = penScale;
            controlStateSerializer.update((s) => (s.penScale = settings.penScale));
            setLastUpdate(Date.now());
        }
        function onChangeFontSize(size: number) {
            setFontSize(size);
            controlStateSerializer.update((s) => (s.fontSize = size));
            setLastUpdate(Date.now());
        }
        function onChangeAutoHide() {
            const val = !settings.autoHide;
            settings.autoHide = val;
            controlStateSerializer.update((s) => (s.autoHide = val));
            setLastUpdate(Date.now());
        }

        function onChangeOpacity(e: ChangeEvent<HTMLInputElement>) {
            const opacity = parseFloat(e.target.value);
            settings.opacity = opacity;
            controlStateSerializer.update((s) => (s.opacity = opacity));
            setLastUpdate(Date.now());
        }

        useEffect(() => {
            setChars(text.split(""));
        }, [text]);

        useEffect(() => {
            const state = controlStateSerializer.load();
            setPenColor(state.color);
            setFontSize(state.fontSize);
            settings.penColor = state.color;
            settings.opacity = state.opacity;
            settings.penScale = state.penScale;
            settings.autoHide = state.autoHide;
            // FIX?: refs dep
        }, [settings]);

        return (
            <st.Container expand={expand}>
                <lt.Row className="controls">
                    <lt.Row mr={20}>
                        <button
                            title="eraser"
                            onClick={onSetErase}
                            className={penColor === "#0000" ? "active" : ""}
                        >
                            ⌫
                        </button>
                        <button title="random" onClick={onRandomPen}>
                            🎲
                        </button>
                        <label>
                            <input
                                type="color"
                                onChange={onChangeColor}
                                value={penColor}
                                style={{
                                    display: "none",
                                }}
                            />
                            <st.ColorBlock scale={settings.penScale} color={penColor}>
                                <div className="block" />
                            </st.ColorBlock>
                        </label>
                    </lt.Row>
                    <label>
                        pen{" "}
                        <input
                            type={"range"}
                            min={0.2}
                            max={1}
                            step={0.01}
                            value={settings.penScale}
                            onChange={onChangePenSize}
                        />
                    </label>
                    <label>
                        opacity{" "}
                        <input
                            type={"range"}
                            min={opacityRange.min}
                            max={opacityRange.max}
                            step={0.01}
                            value={settings.opacity}
                            onChange={onChangeOpacity}
                        />
                    </label>
                    <div>
                        <button onClick={() => onChangeFontSize(fontSize + 50)}>+</button>
                        <button onClick={() => onChangeFontSize(fontSize - 50)}>-</button>
                        <button onClick={() => setExpand(!expand)}>{!expand ? "□" : "▭"}</button>
                    </div>
                    <label>
                        <input
                            type="checkbox"
                            checked={settings.autoHide}
                            onChange={onChangeAutoHide}
                        />
                        auto hide
                    </label>
                </lt.Row>

                <div className="_content-wrapper" onMouseUp={onMouseUp}>
                    <div className="_content">
                        {chars.map((c, i) => (
                            <ColorizeChar
                                key={c + i}
                                text={c}
                                settings={settings}
                                fontSize={fontSize}
                                onComplete={() => onComplete?.(1)}
                            />
                        ))}
                    </div>
                </div>
            </st.Container>
        );
    }
    const st = {
        Container: styled.div<{ expand: boolean }>`
            width: ${(props) => (props.expand ? "100vw" : "100%")};
            position: relative;
            .controls {
                width: ${(props) => (props.expand ? "100vw" : "100%")};
            }
            ._content-wrapper {
                overflow-x: scroll;
                width: 100%;
            }
            ._content {
                display: flex;
            }
            label {
                display: flex;
                align-items: center;
                margin-right: 10px;
            }
            button.active {
                background: #066;
            }
        `,
        ColorBlock: styled.div<{ scale: number; color: string }>`
            display: flex;
            align-items: center;
            justify-content: center;
            width: 20px;
            height: 20px;
            border: 1px solid white;
            .block {
                display: inline-block;
                width: ${(props) => props.scale * 20}px;
                height: ${(props) => props.scale * 20}px;
                background: ${(props) => props.color};
            }
        `,
    };

    const defaultControlState = {
        color: "#FF0000",
        opacity: 0.8,
        fontSize: 400,
        penScale: 1,
        autoHide: false,
    };

    const controlStateSerializer = new LocalStorageSerializer<typeof defaultControlState>(
        defaultControlState,
        "colorize-control-state",
        function (obj: unknown): obj is typeof defaultControlState {
            if (typeof obj !== "object") return false;
            if (obj == null) return false;
            return (
                hasProp(obj, "color", "string") &&
                hasProp(obj, "opacity", "number") &&
                hasProp(obj, "fontSize", "number") &&
                hasProp(obj, "autoHide", "boolean")
            );
        },
    );

    const opacityRange = { min: 0.01, max: 0.5 };
}
export const ColorizeText = ColorizeText$.View;

namespace SoundSearch$ {
    export interface Props {
        sound: string;
        noise: string[];
        onComplete: Action;
    }
    export function View({ sound, noise, onComplete }: Props) {
        const numSound = 5;
        const [otherSounds, setOtherSounds] = useState(noise);
        const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

        const { current: refs } = useRef({
            correctIndices: new Set<number>(),
        });

        useEffect(() => {
            new Set(new Set());
            const sounds = range(numSound).map(() => sound);
            const otherSounds = shuffle(noise.concat(...sounds));
            setOtherSounds(otherSounds);
            setSelectedIndices(new Set());
            refs.correctIndices = new Set(findAllIndices(otherSounds, sound));
            DeckAudio.play(sound);
            // FIX?: refs dep
        }, [sound, noise, refs]);

        function toggleEntry(i: number) {
            const indices = new Set(selectedIndices);
            if (indices.has(i)) indices.delete(i);
            else indices.add(i);
            setSelectedIndices(indices);
            const completed = isSameSet(refs.correctIndices, indices);
            if (completed) onComplete();
            if (indices.has(i)) {
                DeckAudio.play(otherSounds[i]);
            }
        }

        return (
            <Container>
                <div className="main">
                    <div className="left-side">
                        <AudioPlayer src={sound} />
                        <div className="info">find matches</div>
                    </div>
                    <div className="divider" />
                    <div className="other-sounds">
                        {otherSounds.map((src, i) => (
                            <Entry key={src + i} selected={selectedIndices.has(i)}>
                                <AudioPlayer src={src} />
                                <button onClick={() => toggleEntry(i)}>select</button>
                            </Entry>
                        ))}
                    </div>
                </div>
            </Container>
        );
    }
    function isSameSet<T>(xs: Set<T>, ys: Set<T>) {
        if (xs.size !== ys.size) return false;
        for (const x of xs) {
            if (!ys.has(x)) return false;
        }
        return true;
    }

    const Entry = styled.div<{ selected: boolean }>`
        display: flex;
        justify-content: center;
        align-items: center;
        flex-direction: column;
        margin: 5px;
        margin-right: 20px;

        > button {
            margin-top: 10px;
            font-size: 13px;
            background: ${(props) => (props.selected ? "teal" : "inherit")};
        }
    `;

    const Container = styled.div`
        .complete {
            margin-top: 20px;
            text-align: center;
        }
        .main {
            display: flex;
            justify-content: center;
            .left-side {
                display: flex;
                align-items: center;
                justify-content: center;
                flex-direction: column;
                .info {
                    font-size: 13px;
                    text-align: center;
                }
                button {
                    font-size: 32px;
                }
            }
            .divider {
                border: 1px solid gray;
                min-width: 0px;
                margin-left: 20px;
                margin-right: 20px;
            }
            .other-sounds {
                display: flex;
                flex-wrap: wrap;
                max-width: 50%;
            }
        }
    `;
}
export const SoundSearch = SoundSearch$.View;

namespace WordSearch$ {
    interface Props {
        text: string;
        noise: string;
        reveal?: boolean;
    }
    export function View({ text: textProp, reveal: revealProp }: Props) {
        const [reveal, setReveal] = useState(revealProp);
        const [, setTime] = useState(Date.now());

        const { current: refs } = useRef({
            text: "",
            items: [] as TextBlockItem[],
        });

        const init = useCallback(
            function init(text: string, noise: string | undefined = undefined) {
                if (!noise) {
                    noise = getRelatedCharacters(textProp, 20).join("");
                }
                text = text
                    .split("")
                    .filter((c) => !isSymbol(c))
                    .join("");

                const width = Math.floor(text.length * 2.0);
                const items = createTextBlock(width, height, text, noise);
                refs.items = items;
                refs.text = text;

                setReveal(false);
                setTime(Date.now());
            },
            // TODO: if this broke, probably because of refs dep
            [refs, textProp],
        );

        useEffect(() => setReveal(revealProp), [revealProp]);

        useEffect(() => {
            init(textProp);
        }, [textProp, init]);

        return (
            <Container reveal={reveal}>
                <div className="instructions">
                    Find at least one correct text{" "}
                    {revealProp && (
                        <>
                            <button onClick={() => init(textProp)}>shuffle</button>
                            <button disabled={reveal} onClick={() => setReveal(true)}>
                                show
                            </button>
                        </>
                    )}
                </div>
                <div className="text-block">
                    {refs.items.map((item, i) => (
                        <span
                            key={item.text + i}
                            className={item.text === textProp ? "answer" : ""}
                        >
                            {item.text}
                        </span>
                    ))}
                </div>
            </Container>
        );
    }
    const Container = styled.div<{ reveal?: boolean }>`
        > .instructions {
            font-size: 14px;
            text-align: center;
        }
        > .actions {
            font-size: 13px;
        }
        > .text-block {
            overflow-x: auto;
            white-space: pre;
            font-family: Monospace;
            font-size: 130%;

            span {
            }

            ${(props) =>
                !props.reveal
                    ? ""
                    : `
            .answer {
                color: cyan;
                font-style: italic;
            }
            span {
            }
            `};
        }
    `;

    const minWidth = 15;
    const height = 4;

    type TextBlockItem = { text: string; answer: boolean };
    function blockItem(text: string, answer = false) {
        return { text, answer };
    }
    function randomText(chars: string[], len: number) {
        const result: string[] = [];
        for (let i = 0; i < len; i++) {
            result.push(randomElem(chars) ?? "*");
        }
        return result.join("");
    }
    function shuffleString(s: string) {
        return shuffle(s.split("")).join("");
    }
    function midWeightedRandom() {
        const n = Math.random();
        if (n < 0.8) {
            return 0.2 + Math.random() * 0.7;
        }
        if (n < 0.9) {
            return 0.9 + Math.random() * 0.1;
        }
        return Math.random() * 0.1;
    }
    function createTextBlock(width: number, height: number, text: string, noise: string) {
        width = Math.max(width, minWidth, Math.floor(text.length * 1.4));
        const textSet = new Set(text.split(""));
        const charSet = new Set(noise.split("").filter((c) => !textSet.has(c)));

        const chars: string[] = [];
        for (const c of charSet) {
            if (!isPunctuation(c)) chars.push(c);
        }

        const lines: TextBlockItem[] = [];
        const lineNum = Math.floor(midWeightedRandom() * height);
        for (let n = 0; n < height; n++) {
            const colNum = Math.floor(Math.random() * (width - text.length + 1));
            const correct = n === lineNum;
            lines.push(
                blockItem(randomText(chars, colNum)),
                blockItem(correct ? text : shuffleString(text), correct),
                blockItem(randomText(chars, width - text.length - colNum)),
                blockItem("\n"),
            );
        }
        return lines;
    }
}
export const WordSearch = WordSearch$.View;
