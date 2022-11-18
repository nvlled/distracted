import { ForwardedRef, forwardRef, useImperativeHandle, useRef, useState } from "react";
import styled from "styled-components";
import { DeckAudio, DeckAudioVolume } from "./DeckAudio";
import { Block } from "./layout";
import { Dialog, IconButton, Shoe, Tooltip } from "./shoelace";

export namespace AudioPlayer$ {
    export interface Control {
        play: () => Promise<void>;
        stop: () => Promise<void>;
        isPlaying: () => boolean;
    }
    export interface Props {
        src: string;
    }
    export const View = forwardRef(function AudioPlayer(
        { src }: Props,
        ref: ForwardedRef<Control>,
    ) {
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
                    console.log("AudioPlayer.play()");
                    if (stateRef.current.playing) return;
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
            console.log("onPlay");
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
            <Container onClick={onPlay}>
                <Dialog
                    label="sound settings"
                    open={showSettings}
                    onSlHide={() => setShowSettings(false)}
                >
                    <Block className="sound-settings-body">
                        filename: {src}
                        <br />
                        <DeckAudioVolume src={src} />
                    </Block>
                </Dialog>
                {/*
                <Tooltip open={showTip && !playing} content={"right click to open settings"}>
                </Tooltip>
                */}
                <div>
                    <IconButton
                        name={!playing ? "play-circle" : "stop-circle"}
                        onMouseOver={() => setShowTip(true)}
                        onMouseOut={() => setShowTip(false)}
                        onContextMenu={(e) => {
                            e.preventDefault();
                            setShowSettings(true);
                        }}
                    />
                </div>
            </Container>
        );
    });
    const Container = styled.div`
        display: inline-block;
        .sound-settings-body {
            font-size: ${Shoe.font_size_small};
        }
    `;
}
export const AudioPlayer = AudioPlayer$.View;
