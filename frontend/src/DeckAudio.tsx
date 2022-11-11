import { useState } from "react";
import styled from "styled-components";
import { Card } from "./card";
import { useChanged, useOnMount } from "./hooks";
import { Action, LocalStorageSerializer, sleep } from "./lib";
import { Range, RangeRef, Shoe } from "./shoelace";

const DeckAudioVolumeContainer = styled.div<{ warning: boolean; danger: boolean }>`
    font-size: 10px;
    sl-range {
        --track-color-inactive: ${Shoe.color_primary_400};
        --track-color-active: ${Shoe.color_primary_600};
        ${(props) =>
            !props.danger
                ? ""
                : `
                --track-color-inactive: ${Shoe.color_danger_400};
                --track-color-active: ${Shoe.color_danger_500};
        `}
        ${(props) =>
            !props.warning
                ? ""
                : `
            --track-color-inactive: ${Shoe.color_warning_400};
            --track-color-active: ${Shoe.color_warning_500};
        `}
    }
`;
export function DeckAudioVolume({ src }: { src: string }) {
    const [volume, setVolume] = useState(1);
    function onChange(e: Event) {
        const volume = (e.target as RangeRef).value;
        setVolume(volume);

        DeckAudio._init();
        if (volume === 1) {
            delete DeckAudio._volumes[src];
        } else {
            DeckAudio._volumes[src] = volume;
        }
        serializer.save(DeckAudio._volumes);
        DeckAudio.play(src);
    }

    if (useChanged(src)) {
        const volume = DeckAudio._volumes[src];
        if (volume !== undefined) {
            setVolume(volume);
        } else {
            setVolume(1);
        }
    }

    useOnMount(() => {
        DeckAudio._init();
        const volume = DeckAudio._volumes[src];
        if (volume !== undefined) {
            setVolume(volume);
        } else {
            setVolume(1);
        }
        const fs = src.split("/");
    });

    return (
        <DeckAudioVolumeContainer warning={volume > 1.2 && volume < 2} danger={volume >= 2}>
            <Range
                min={0.0}
                max={3}
                value={volume}
                onSlChange={onChange}
                step={0.1}
                tooltipFormatter={(value) => `${Math.floor(value * 100)}%`}
                invalid
            />
        </DeckAudioVolumeContainer>
    );
}

type Volumes = Record<string, number | undefined>;
const serializer = new LocalStorageSerializer({}, "audio-volumes", function (
    x: unknown,
): x is Volumes {
    return typeof x === "object";
});

export const DeckAudio = {
    _playID: 0,
    _volumes: {} as Record<string, number | undefined>,
    _gainNode: null as GainNode | null,
    _intialized: false,
    _audio: (() => {
        const audio = document.createElement("audio");
        audio.muted = true;
        audio.autoplay = true;
        return audio;
    })(),

    _toRelative(src: string) {
        const origin = location.origin + "/";
        if (src.indexOf(origin) === 0) {
            return src.slice(origin.length);
        }
        return origin;
    },

    _init() {
        if (DeckAudio._intialized) return;
        DeckAudio._audio = document.createElement("audio");

        const ctx = new window.AudioContext();
        const audio = DeckAudio._audio;
        audio.muted = true;

        const source = new MediaElementAudioSourceNode(ctx, {
            mediaElement: audio,
        });

        const gainNode = (DeckAudio._gainNode = new GainNode(ctx));
        gainNode.gain.value = 1.0; // double the volume
        source.connect(gainNode);
        gainNode.connect(ctx.destination);

        DeckAudio._volumes = serializer.load();
        DeckAudio._intialized = true;
    },

    async playAudioElem(audio: HTMLAudioElement): Promise<void> {
        DeckAudio._init();
        audio.muted = false;

        const src = decodeURIComponent(DeckAudio._toRelative(audio.src));
        const volume = DeckAudio._volumes[src] ?? 1;
        if (DeckAudio._gainNode) {
            DeckAudio._gainNode.gain.value = volume;
        }

        await DeckAudio.waitEvent(audio, ["abort", "pause", "end", "error"], () => {
            audio.load();
            audio.play();
        });
    },
    waitEvent(audio: HTMLAudioElement, types: string[], body: Action) {
        return new Promise<void>((resolve) => {
            let resolved = false;
            function done() {
                if (resolved) return;
                for (const type of types) {
                    audio.removeEventListener(type, done);
                }
                resolved = true;
                resolve();
            }
            for (const type of types) {
                audio.addEventListener(type, done);
            }
            body();
        });
    },
    async playFirst(card: Card): Promise<void> {
        await DeckAudio.stop();
        const audio = DeckAudio._audio;
        const src = card.audios[0];
        if (!src) return;

        DeckAudio._playID++;
        for (const f of src.split(",")) {
            audio.src = f;
            await DeckAudio.playAudioElem(audio);
        }
    },
    async play(arg: Card | string): Promise<void> {
        if (!canPlay) return;

        await DeckAudio.stop();
        const audio = DeckAudio._audio;
        const id = ++DeckAudio._playID;
        if (typeof arg === "string") {
            audio.src = arg;
            audio.load();
            await DeckAudio.playAudioElem(audio);
            return;
        }

        const card = arg;
        for (const src of card.audios) {
            for (const f of src.split(",")) {
                if (id !== DeckAudio._playID) return;

                audio.src = f;
                audio.load();
                await DeckAudio.playAudioElem(audio);
            }
            await sleep(100);
        }
    },

    async stop(src?: string) {
        const audio = DeckAudio._audio;
        const playingSrc = decodeURIComponent(DeckAudio._toRelative(audio.src));
        if (src !== undefined && src !== playingSrc) {
            return;
        }

        await DeckAudio.waitEvent(audio, ["error", "pause", "end", "abort"], () => {
            audio.pause();
            audio.currentTime = 0;
            audio.src = "";
            audio.load();
        });
    },
};

let canPlay = false;
export function canPlayAudio() {
    return canPlay;
}

function onWindowClick() {
    canPlay = true;
    window.removeEventListener("click", onWindowClick);
}
window.addEventListener("click", onWindowClick);
