export {};

import { useAtom } from "jotai";
import React, { FormEvent, FormEventHandler, memo, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import YouTubePlayer from "youtube-player";
import * as yt from "youtube-player/dist/types";
import { main } from "../wailsjs/go/models";
import { app, api, runtime, wailsExt } from "./api";
import { Card } from "./card";
import { Action, formatDuration, useAsyncEffect, useAsyncEffectUnmount } from "./lib";
import { appState } from "./state";
import { lt } from "./layout";

export namespace _TabOutDistraction {
    export const Container = styled.div``;

    export function View({
        card,
        onReturn,
        seconds,
    }: {
        card: Card;
        onReturn: Action;
        seconds: number;
    }) {
        const [countdown, setCountdown] = useState(seconds);
        const [distractionMode, setDistractionMode] = useAtom(appState.distractionMode);
        const timerRef = useRef<number | undefined>();
        const notifierID = useRef<number | undefined>();
        const mounted = useRef(false);

        function stopNotifier() {
            const id = notifierID.current;
            if (id !== undefined) {
                app.StopBreakTime(id);
            }
        }
        function onTryReturn() {
            stopNotifier();
            onReturn();
        }

        useAsyncEffectUnmount(async () => {
            const unmount = () => {
                console.log("a");
                stopNotifier();
                clearInterval(timerRef.current);
            };

            if (mounted.current) {
                return unmount;
            }
            mounted.current = true;

            notifierID.current = await app.StartBreakTime(seconds);
            console.log("notifier ID", notifierID.current);
            timerRef.current = window.setInterval(() => {
                setCountdown((c) => {
                    if (c <= 0) {
                        clearInterval(timerRef.current);
                        //app.DistractionModeOff();
                        //setDistractionMode(false);
                        //onReturn();
                    }
                    return c - 1;
                });
            }, 1000);

            return unmount;
        }, []);

        return (
            <Container>
                {countdown <= 0 ? (
                    <div>
                        Break time's over.
                        <button onClick={onTryReturn}>noooooo11!!!12</button>
                    </div>
                ) : (
                    <div>Chill time. You have {formatDuration(seconds)} of break time.</div>
                )}
            </Container>
        );
    }
}

export const TabOutDistraction = memo(
    _TabOutDistraction.View,
    (prevProps, props) =>
        prevProps.card.id === props.card.id && prevProps.seconds === props.seconds,
);

//type DistractionContentType = "image" | "video" | "youtube-link" | "plaintext" | "unknown";
//
//interface MetaData {
//    type?: "reddit" | "youtube";
//}
//
//function createYoutubeDistraction(filename: string, link: string): main.Distraction {
//    return main.Distraction.createFrom({
//        filename: filename,
//        urlPath: `data:text/plain;base64,${btoa(link)}`,
//        metaData: "",
//    });
//}
//export function Distraction({
//    card,
//    onReturn,
//    seconds,
//}: {
//    card: Card;
//    onReturn: Action;
//    seconds: number;
//}) {
//    const [timeUp, setTimeUp] = useState(false);
//    const [showMinimizeInfo, setShowMinimizeInfo] = useState(false);
//
//    const minimized = useRef(false);
//    async function onTimeUp() {
//        setTimeUp(true);
//        if (minimized.current) {
//            await runtime.WindowHide();
//            await runtime.WindowShow();
//            await runtime.WindowFullscreen();
//        }
//    }
//    async function onMinimize() {
//        minimized.current = true;
//        if (!timeUp) {
//            await runtime.WindowMinimise();
//            await runtime.WindowUnfullscreen();
//        }
//    }
//
//    useEffect(() => setTimeUp(false), [card]);
//    useEffect(() => {
//        return () => {
//            if (minimized.current) {
//                wailsExt.WindowAlwaysOnTop(false);
//            }
//        };
//    }, []);
//
//    /*
//    const [distraction, setDistraction] = useState(true);
//    const playerRef = useRef<yt.YouTubePlayer | null>();
//    function onPlayerMount() {
//        console.log("onPlayerMount");
//        const player = YouTubePlayer("player", {
//            playerVars: {
//                controls: 0,
//                autoplay: 1,
//                modestbranding: 1,
//                disablekb: 1,
//                enablejsapi: 1,
//            },
//        });
//        playerRef.current = player;
//        player.loadVideoById("M7lc1UVf-VE");
//        player.on("ready", async () => {
//            setTimeout(() => {
//                player.playVideo();
//            }, 3000);
//            //(window as any).p = player;
//        });
//    }
//    */
//
//    const cms = Distraction.components;
//
//    return (
//        <div>
//            <div style={{ position: "relative", width: "100%" }}>
//                <div style={{ position: "absolute", right: -50, top: 0 }}>
//                    <CardTimer seconds={seconds} onTimeUp={onTimeUp} />
//                </div>
//                {seconds > 2.5 * 60 && (
//                    <cms.MinimizeInfo>
//                        {showMinimizeInfo ? (
//                            <div className="_info-container">
//                                <small>
//                                    <em>
//                                        <button onClick={() => setShowMinimizeInfo(false)}>
//                                            ℹ️
//                                        </button>
//                                        You still have to wait for {Math.floor(seconds / 60) + " "}{" "}
//                                        minutes before the next card is due. You can minimize the
//                                        app and do other distracting things. The app will notify you
//                                        when the time is up.
//                                    </em>
//                                </small>
//                                <lt.Row justifyContent={"end"}>
//                                    <button onClick={onMinimize}>minimize</button>
//                                </lt.Row>
//                            </div>
//                        ) : (
//                            <lt.Row justifyContent={"end"}>
//                                <button onClick={() => setShowMinimizeInfo(true)}>ℹ️</button>
//                                <button onClick={onMinimize}>minimize</button>
//                            </lt.Row>
//                        )}
//                    </cms.MinimizeInfo>
//                )}
//            </div>
//            <LocalMediaDistraction.View onReturn={timeUp ? onReturn : undefined} />
//        </div>
//    );
//}
//export namespace Distraction {
//    export const components = {
//        MinimizeInfo: styled.div`
//            ._info-container {
//                display: block;
//                background: #333;
//                padding: 30px;
//            }
//        `,
//    };
//}
//
//export namespace LocalMediaDistraction {
//    const st = {
//        Content: styled.div<{ full?: boolean }>`
//            cursor: pointer;
//            ${(props) => {
//                if (props.full) {
//                    return `
//                        z-index: 100;
//                        background: #202b38d0;
//                        top: 0;
//                        left: 0;
//                        position: absolute;
//                        width: 100vw;
//                        height: 100vh;
//                        display: flex;
//                        justify-content: center;
//                        align-items: start;
//
//                        img {width: 100%}
//                    `;
//                }
//                return `
//                `;
//            }}
//        `,
//    };
//    export function View({ onReturn }: { onReturn?: Action }) {
//        const startCountdown = 6;
//        const [youtubeQueue, setYoutubeQueue] = useAtom(appState.youtubeQueue);
//        const [distraction, setDistraction] = useState<main.Distraction | null>();
//        const [metaData, setMetaData] = useState<MetaData | null>();
//        const [rawContent, setRawContent] = useState<string | null>();
//        const [contentType, setContentType] = useState<string | null>();
//        const [countdown, setCountdown] = useState(startCountdown);
//        const [fullContent, setFullContent] = useState(false);
//
//        async function updateDistraction(distraction: main.Distraction) {
//            setDistraction(distraction);
//            if (distraction) {
//                setMetaData(null);
//                if (distraction.metaData) {
//                    try {
//                        setMetaData(JSON.parse(distraction.metaData));
//                    } catch (e) {
//                        /*ignore*/
//                    }
//                }
//
//                const type = getContentType(distraction.filename || "");
//                setContentType(type);
//                setCountdown(type === "video" || type === "youtube-link" ? 12 : startCountdown);
//
//                setRawContent(null);
//                if (type === "plaintext") {
//                    const rawContent = await (await fetch(distraction.urlPath)).text();
//                    setRawContent(rawContent);
//                } else if (type === "youtube-link") {
//                    const rawContent = await (await fetch(distraction.urlPath)).text();
//                    const links = shuffleArray(rawContent.split("\n").filter(Boolean));
//                    const newLinks: { filename: string; link: string }[] = [];
//
//                    for (const link of links.slice(1)) {
//                        if (!youtubeQueue.some((e) => e.link === link)) {
//                            newLinks.push({ filename: distraction.filename, link });
//                        }
//                    }
//                    setYoutubeQueue(youtubeQueue.concat(newLinks));
//                    setRawContent(links[0]);
//                }
//            }
//        }
//
//        useEffect(() => {
//            (async () => {
//                const distraction = await app.GetCurrentDistraction();
//                updateDistraction(distraction);
//            })();
//
//            const keyHandler = (e: KeyboardEvent) => {
//                if (e.key === "Escape") {
//                    setFullContent(false);
//                }
//            };
//            window.addEventListener("keydown", keyHandler);
//            return () => window.removeEventListener("keydown", keyHandler);
//        }, []);
//
//        useEffect(() => {
//            const timerID = window.setInterval(() => {
//                setCountdown((c) => {
//                    if (c <= 0) clearInterval(timerID);
//                    return c - 1;
//                });
//            }, 1000);
//            return () => clearInterval(timerID);
//        }, [distraction]);
//
//        async function onNextDistraction() {
//            // TODO: batch and shuffle distraction to add randomness
//            const distraction = await app.NextDistraction();
//            const youtubeEntry = Math.random() < 0.35 && youtubeQueue.shift();
//            if (youtubeEntry) {
//                updateDistraction(
//                    createYoutubeDistraction(youtubeEntry.filename, youtubeEntry.link),
//                );
//                setYoutubeQueue(youtubeQueue.slice(1));
//            } else {
//                updateDistraction(distraction);
//            }
//            if (onReturn) onReturn();
//        }
//
//        let content = <div>unknown content</div>;
//
//        switch (contentType) {
//            case "image":
//                content = <img src={distraction?.urlPath} />;
//                break;
//
//            case "video":
//                content = (
//                    <div>
//                        <video
//                            src={distraction?.urlPath}
//                            loop
//                            muted
//                            autoPlay
//                            controls
//                            style={{ width: "100%" }}
//                        />
//                    </div>
//                );
//                break;
//
//            case "youtube-link":
//                content = <YoutubeEmbed linkOrID={rawContent?.split("\n").filter(Boolean)[0]} />;
//                break;
//
//            case "plaintext":
//                content = <div style={{ whiteSpace: "pre" }}>{rawContent}</div>;
//                break;
//        }
//
//        return (
//            <div>
//                {/*youtubeQueue.map((e) => (
//                <div>{e.link}</div>
//            ))*/}
//                {distraction && (
//                    <div>
//                        {metaData && <DistractionInfo metaData={metaData} />}
//                        <st.Content full={fullContent} onClick={() => setFullContent(!fullContent)}>
//                            {content}
//                        </st.Content>
//                        <br />
//                        <small>{distraction.filename}</small>
//                    </div>
//                )}
//                <div style={{ textAlign: "center" }}>
//                    {countdown > 0 ? (
//                        "..."
//                    ) : (
//                        <button onClick={onNextDistraction}>
//                            {onReturn ? "return" : "next →"}
//                        </button>
//                    )}
//                </div>
//            </div>
//        );
//    }
//}
//
//function CardTimer({ seconds, onTimeUp }: { seconds: number; onTimeUp: Action }) {
//    const [countdown, setCountdown] = useState(0);
//    const [startSeconds, setStartSeconds] = useState(0);
//    const timerIDRef = useRef<number | undefined>(undefined);
//    function onRef(canvas: HTMLCanvasElement) {
//        if (!canvas) return;
//        const compStyle = getComputedStyle(canvas);
//        canvas.width = parseInt(compStyle.width);
//        canvas.height = parseInt(compStyle.height);
//
//        const ctx = canvas.getContext("2d");
//        if (!ctx) return;
//        const w = canvas.width;
//        const h = canvas.height;
//
//        const n = countdown / startSeconds;
//
//        ctx.fillStyle = "white";
//        ctx.lineWidth = 3;
//        ctx.strokeStyle = "red";
//        ctx.beginPath();
//        ctx.arc(w / 2, h / 2, w / 3, 0, Math.PI * 2 * n);
//        ctx.stroke();
//
//        ctx.textAlign = "center";
//        ctx.textBaseline = "middle";
//        //ctx.fillText(Math.floor(countdown) + "", w / 2, h / 2, w);
//    }
//
//    useEffect(() => {
//        setCountdown(seconds);
//        setStartSeconds(seconds);
//        clearInterval(timerIDRef.current);
//
//        const updateFreq = 128;
//        timerIDRef.current = window.setInterval(() => {
//            setCountdown((c) => {
//                c -= updateFreq / 1000;
//                if (c <= 0) {
//                    c = 0;
//                    onTimeUp();
//                    clearInterval(timerIDRef.current);
//                }
//                return c;
//            });
//        }, updateFreq);
//
//        return () => clearInterval(timerIDRef.current);
//    }, [seconds]);
//
//    return (
//        <div>
//            <canvas ref={onRef} style={{ width: 20, height: 20, display: "inline-block" }} />
//        </div>
//    );
//}
//
//function DistractionInfo({ metaData }: { metaData: MetaData }) {
//    if (metaData.type === "reddit") {
//        const redditPost = metaData as main.RedditPost;
//        return (
//            <div>
//                <strong>{redditPost.title}</strong>
//                <br />
//                <small>source: {redditPost.permalink}</small>
//            </div>
//        );
//    }
//    return null;
//}
//
//function YoutubeEmbed({ linkOrID }: { linkOrID: string | undefined }) {
//    const [id, setID] = useState<string | null>();
//
//    useEffect(() => {
//        if (!linkOrID) return;
//
//        const re =
//            /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/gi;
//        const m = re.exec(linkOrID);
//        setID(m?.[1] ?? "--");
//    }, [linkOrID]);
//
//    return (
//        <div>
//            {!id ? (
//                "loading"
//            ) : (
//                <iframe
//                    style={{ height: "70vh", width: "100%" }}
//                    src={"https://www.youtube.com/embed/" + id}
//                    title="YouTube video player"
//                    frameBorder="0"
//                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
//                    allowFullScreen
//                ></iframe>
//            )}
//        </div>
//    );
//}
//
//// render file content
//// cases:
//// - extension is image -> show image
//// - extension is video -> play video
//// - extension is txt -> render youtube if ext has yt, like yt.txt
////                       else render text contents
//// render file metadata if found
//// - only for reddit for now, mostly for attribution purposes
//// - render post title though for context
//
//function VideoSearch() {
//    const [result, setResult] = useState<main.SearchResult[] | null>();
//    const onSearch = async function (e: React.FormEvent<HTMLFormElement>) {
//        e.preventDefault();
//        const input = e.currentTarget.querySelector("input");
//        const query = input?.value;
//        if (!query) {
//            return;
//        }
//
//        console.log({ query });
//        const result = await api.SearchYoutube(query, 0);
//        setResult(result);
//    };
//    return (
//        <div>
//            <form onSubmit={onSearch}>
//                <input placeholder="search video" />
//            </form>
//            {result && (
//                <div>
//                    <div>
//                        {result.map((v) => (
//                            <div>
//                                {v.title}
//                                <img src={v.thumbnail} />
//                            </div>
//                        ))}
//                    </div>
//                </div>
//            )}
//        </div>
//    );
//}
//
//function getContentType(filename: string): DistractionContentType {
//    const index = filename.lastIndexOf(".");
//    const ext = filename.slice(index + 1).toLowerCase();
//
//    if (filename.toLowerCase().endsWith(".yt.txt")) return "youtube-link";
//    if (ext == "txt") return "plaintext";
//    if (ext == "mp4" || ext == "webm") return "video";
//    if (ext == "") return "unknown";
//
//    return "image";
//}
//
//function shuffleArray<T>(array: T[]): T[] {
//    const result = array.slice();
//    for (let i = array.length - 1; i > 0; i--) {
//        const j = Math.floor(Math.random() * (i + 1));
//        [array[i], array[j]] = [array[j], array[i]];
//    }
//    return result;
//}
//
