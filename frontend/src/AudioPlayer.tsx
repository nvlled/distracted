import React, {
    ForwardedRef,
    forwardRef,
    memo,
    useCallback,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from "react";
import styled from "styled-components";
import { DeckAudio, DeckAudioVolume } from "./DeckAudio";
import { Block } from "./layout";
import { Action, Action1, sleep } from "./lib";
import {
    Alert,
    Button,
    ButtonGroup,
    CardBox,
    Dialog,
    Icon,
    IconButton,
    Range,
    Shoe,
    Tooltip,
} from "./shoelace";

export function playAudio(audio: HTMLAudioElement): Promise<void> {
    return new Promise((resolve) => {
        audio.onended = () => resolve();
        audio.play();
    });
}
export namespace AudioPlayer$ {
    export type PlayerState = "playing" | "stopped";
    export interface Control {
        play: Action;
        stop: Action;
        isPlaying: () => boolean;
        stopDuration: () => number;
    }
    export interface Props {
        src: string;
        onChange?: Action1<PlayerState>;
    }
    export const View = forwardRef(function View(
        { src, onChange: onChangeProp }: Props,
        ref: ForwardedRef<Control>,
    ) {
        const [state, setState] = useState("stopped");
        const [playingIndex, setPlayingIndex] = useState(-1);
        const [urls, setUrls] = useState<string[]>([]);
        const divRef = useRef<HTMLDivElement>(null);
        const stoppedAt = useRef(0);

        const stop = useCallback(async function () {
            const container = divRef.current;
            if (!container) return;

            DeckAudio.stop();
            setPlayingIndex(-1);
        }, []);

        const play = useCallback(
            async function (index?: number) {
                if (playingIndex >= 0) return;
                const container = divRef.current;
                if (!container) return;

                let i = 0;
                for (const audio of urls) {
                    setPlayingIndex(i);
                    if (index !== undefined) {
                        if (i === index) await DeckAudio.play(audio);
                    } else {
                        await DeckAudio.play(audio);
                        await sleep(512);
                    }
                    i++;
                }
                setPlayingIndex(-1);
                stoppedAt.current = Date.now();
            },
            [urls, playingIndex],
        );

        useImperativeHandle(
            ref,
            () => ({
                play,
                stop,
                isPlaying: () => {
                    return playingIndex >= 0;
                },
                stopDuration: () => {
                    return Date.now() - stoppedAt.current;
                },
            }),
            [playingIndex, play, stop],
        );

        function onStop() {
            setPlayingIndex(-1);
            setState("stopped");
            DeckAudio.stop();
            stoppedAt.current = Date.now();
        }
        async function onPlay(urls: string[]) {
            setState("playing");
            let i = 0;
            for (const audio of urls) {
                setPlayingIndex(i);
                await DeckAudio.play(audio);
                i++;
            }
            setPlayingIndex(-1);
            setState("stopped");
        }

        useEffect(() => {
            const urls: string[] = [];
            for (const e of src.split(",").map((s) => s.trim())) {
                if (!urls.includes(e)) {
                    urls.push(e);
                }
            }
            setUrls(urls);
            setState("stopped");
            stoppedAt.current = 0;
        }, [src]);
        /*
         */

        /*
        useAsyncEffect(async () => {
            if (state === "playing") {
                await sleep(100);
                await play();
            }
            //onChange("stopped");
            setState("stopped");
            setPlayingIndex(-1);
        }, [state, playingIndex]);
        */

        if (urls.length === 0) {
            return null;
        }

        return (
            <st.Container>
                <span ref={divRef}>
                    <button onClick={() => (state === "playing" ? onStop() : onPlay(urls))}>
                        {state === "playing" ? "️■" : "▶"}️
                    </button>
                </span>
            </st.Container>
        );
    });

    const st = {
        Container: styled.span`
            display: inline-block;
            font-size: 14px;
            line-height: 0;
            position: relative;
            margin: 0;
            padding: 0;
            margin-left: 3px;

            .filename {
                display: inline-block;
                max-width: 100px;
                background: #f00 !important;
            }

            button {
                font-size: 18px;
                margin: 0;
                padding: 10px;
            }
        `,
        Button: styled.button<{ playing: boolean }>`
            color: ${(props) => (props.playing ? "red" : "inherit")};
            margin-top: 0;
            margin-bottom: 0;
        `,
    };
}

export const AudioPlayer = memo(
    AudioPlayer$.View,
    (prevProps, props) => prevProps.src === props.src,
);

export namespace Ap2$ {
    export interface Control {
        play: () => Promise<void>;
        stop: () => Promise<void>;
        isPlaying: () => boolean;
    }
    export interface Props {
        src: string;
    }
    export const View = forwardRef(({ src }: Props, ref: ForwardedRef<Control>) => {
        const [showSettings, setShowSettings] = useState(false);
        const [playing, setPlaying] = useState(false);
        const [showTip, setShowTip] = useState(false);

        const stateRef = useRef({
            playing: false,
        });

        function updatePlaying(val: boolean) {
            setPlaying(val);
            stateRef.current.playing = val;
        }

        useImperativeHandle(
            ref,
            () => ({
                isPlaying: () => stateRef.current.playing,
                play: async () => {
                    DeckAudio.stop(src);
                    updatePlaying(true);
                    await DeckAudio.play(src);
                    updatePlaying(false);
                },
                stop: async () => {
                    DeckAudio.stop(src);
                    updatePlaying(false);
                },
            }),
            [src],
        );

        async function onPlay() {
            setShowTip(false);
            if (!playing) {
                updatePlaying(true);
                await DeckAudio.play(src);
                updatePlaying(false);
            } else {
                DeckAudio.stop(src);
                updatePlaying(false);
            }
        }

        return (
            <Container>
                <Dialog
                    label="sound settings"
                    open={showSettings}
                    onSlAfterHide={() => setShowSettings(false)}
                >
                    <Block className="sound-settings-body">
                        filename: {src}
                        <br />
                        <DeckAudioVolume src={src} />
                    </Block>
                </Dialog>
                <Tooltip open={showTip && !playing} content={"right click to open settings"}>
                    <IconButton
                        name={!playing ? "play-circle" : "stop-circle"}
                        onMouseOver={() => setShowTip(true)}
                        onMouseOut={() => setShowTip(false)}
                        onClick={onPlay}
                        onContextMenu={(e) => {
                            e.preventDefault();
                            setShowSettings(true);
                        }}
                    />
                </Tooltip>
            </Container>
        );
    });
    const Container = styled.div`
        display: inline-block;
        .sound-settings-body {
            font-size: ${Shoe.font_size_small};
        }
        sl-dialog {
            --width: 50vw;
        }
        sl-tooltip {
            font-size: ${Shoe.font_size_x_large};
            --max-width: 40vw;
            --show-delay: 1000;
        }
    `;
}
export const Ap2 = Ap2$.View;
