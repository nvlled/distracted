import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";

export function playAudio(audio: HTMLAudioElement): Promise<void> {
    return new Promise((resolve) => {
        audio.onended = () => resolve();
        audio.play();
    });
}
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

const st = {
    Container: styled.div`
        display: inline-block;
        font-size: 11px;
        line-height: 0;
        position: relative;
        top: -10px;
        margin: 0;
        padding: 0;
        margin-left: 3px;
    `,
    Button: styled.button<{ playing: boolean }>`
        color: ${(props) => (props.playing ? "red" : "inherit")};
        margin-top: 0;
        margin-bottom: 0;
    `,
};

export function AudioPlayer({ src, baseSrc = "" }: { src: string; baseSrc?: string }) {
    const [basePath, setBasePath] = useState("");
    const [playingIndex, setPlayingIndex] = useState(-1);
    const [urls, setUrls] = useState<string[]>([]);
    const divRef = useRef<HTMLDivElement>(null);
    const audiosRef = useRef<HTMLAudioElement[]>();

    function getAudios(container: HTMLDivElement) {
        let audios: HTMLAudioElement[] | undefined = audiosRef.current;
        if (!audios) {
            audios = [];
            for (const elem of container.querySelectorAll("audio")) {
                audios.push(elem);
            }
            audiosRef.current = audios;
        }
        return audios;
    }

    async function stop() {
        const container = divRef.current;
        if (!container) return;

        const audios = getAudios(container);
        for (const audio of audios) {
            audio.load();
        }
        setPlayingIndex(-1);
    }

    async function play(index?: number) {
        const container = divRef.current;
        if (!container) return;

        const audios = getAudios(container);
        for (const audio of audios) {
            audio.load();
        }
        let i = 0;
        for (const audio of audios) {
            setPlayingIndex(i);
            if (index !== undefined) {
                if (i === index) await playAudio(audio);
            } else {
                await playAudio(audio);
                await sleep(512);
            }
            i++;
        }
        setPlayingIndex(-1);
    }

    useEffect(() => {
        const urls: string[] = [];
        setBasePath(baseSrc + (baseSrc[baseSrc.length - 1] !== "/" ? "/" : ""));
        for (const e of src.split(",").map((s) => s.trim())) {
            if (!urls.includes(e)) {
                urls.push(e);
            }
        }
        setUrls(urls);
    }, [src]);

    if (urls.length === 0) {
        return null;
    }
    const isPlaying = playingIndex >= 0;

    return (
        <st.Container>
            <div ref={divRef}>
                <button onClick={() => (isPlaying ? stop() : play())}>
                    {isPlaying ? "️■" : "▶"}️
                </button>
                {urls.map((u, i) => (
                    <React.Fragment key={u}>
                        <audio key={u} controls src={basePath + u} style={{ display: "none" }} />
                        {urls.length > 1 && (
                            <st.Button playing={i === playingIndex} onClick={() => play(i)}>
                                {i + 1}
                            </st.Button>
                        )}
                    </React.Fragment>
                ))}
                {urls.length === 1 ? urls[0] : urls[playingIndex]}
            </div>
        </st.Container>
    );
}
