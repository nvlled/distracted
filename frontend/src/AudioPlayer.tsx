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
import { DeckAudio } from "./DeckAudio";
import { Action, Action1, sleep } from "./lib";

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
