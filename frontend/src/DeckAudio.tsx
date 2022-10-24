import { ChangeEvent, useEffect, useState } from "react";
import styled from "styled-components";
import { Card } from "./card";
import { lt } from "./layout";
import { Action, LocalStorageSerializer, sleep } from "./lib";

const DeckAudioVolumeContainer = styled.div<{ warning: boolean }>`
    font-size: 10px;
    .volume {
        ${(props) => (!props.warning ? "" : "color: white; background: red")};
    }
`;
export function DeckAudioVolume({ src }: { src: string }) {
    const [volume, setVolume] = useState(1);
    const [filename, setFilename] = useState("");
    function onChange(e: ChangeEvent<HTMLInputElement>) {
        const volume = e.target.valueAsNumber;
        setVolume(volume);

        DeckAudio._init();
        if (volume === 1) {
            delete DeckAudio._volumes[src];
        } else {
            DeckAudio._volumes[src] = volume;
        }
        serializer.save(DeckAudio._volumes);
    }
    useEffect(() => {
        DeckAudio._init();
        const volume = DeckAudio._volumes[src];
        if (volume !== undefined) {
            setVolume(volume);
        } else {
            setVolume(1);
        }
        const fs = src.split("/");
        setFilename(fs[fs.length - 1]);
    }, [src]);

    return (
        <DeckAudioVolumeContainer warning={volume > 2}>
            <lt.Row>
                <input
                    type="range"
                    min={0.0}
                    max={5}
                    value={volume}
                    onChange={onChange}
                    step={0.25}
                />
                <div className="volume">{volume * 100}%</div>
                {filename}
            </lt.Row>
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

        //source = ctx.createMediaElementSource(audio);
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

    async stop() {
        const audio = DeckAudio._audio;
        await DeckAudio.waitEvent(audio, ["error", "pause", "end", "abort"], () => {
            audio.pause();
            audio.currentTime = 0;
            audio.src = "";
            audio.load();
        });
    },

    /*
    async playFirst(card: Card): Promise<void> {
        const audio = DeckAudio._audio;
        const base = config.baseUrlDecks;

        const audioFile = card.front.contents?.filter(
            (e) => typeof e !== "string" && e.name === "audio",
        )[0] as Entry;

        if (!audioFile) return;

        for (const f of audioFile.value?.split(",")?.map((f) => f.trim()) ?? []) {
            audio.src = `${base}/${card.deckName}/${decodeURI(f)}`;
            audio.load();
            await playAudio(audio);
        }
    },
    async playAllAudio(card: Card, config: main.Config): Promise<void> {
        const audio = DeckAudio._audio;
        const base = config.baseUrlDecks;

        const audioFiles = card.front.contents?.filter(
            (e) => typeof e !== "string" && e.name === "audio",
        ) as Entry[];

        for (const audioFile of audioFiles) {
            for (const f of audioFile.value.split(",").map((f) => f.trim())) {
                audio.src = `${base}/${card.deckName}/${decodeURI(f)}`;
                audio.load();
                await playAudio(audio);
            }
            await sleep(1.5);
        }
    },
    */
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

//DeckAudio._init();
