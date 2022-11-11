import { useAtom } from "jotai";
import { memo, useRef, useState } from "react";
import styled from "styled-components";
import { app } from "./api";
import { useOnMount, useOnUnmount, useInterval } from "./hooks";
import { Action, formatDuration } from "./lib";
import { Button } from "./shoelace";
import { appState } from "./state";

export namespace TabOutDistraction$ {
    export const Container = styled.div``;

    export function View({ onReturn, seconds }: { onReturn: Action; seconds: number }) {
        const [actions] = useAtom(appState.actions);
        const [countdown, setCountdown] = useState(seconds);
        const timerRef = useRef<number | undefined>();
        const notifierID = useRef<number | undefined>();
        const initPromise = useRef<Promise<number> | null>(null);

        function stopNotifier() {
            const id = notifierID.current;
            console.log("stopping notifier", id);
            if (id !== undefined) {
                app.StopBreakTime(id);
            }
        }
        function onTryReturn() {
            stopNotifier();
            onReturn();
        }
        function onQuit() {
            actions.changePage("home");
        }

        useOnMount(async () => {
            initPromise.current = app.StartBreakTime(seconds);
            notifierID.current = await initPromise.current;
            console.log("notifier started", notifierID.current);
        });
        useOnUnmount(async () => {
            if (initPromise.current) {
                await initPromise.current;
            }
            stopNotifier();
            clearInterval(timerRef.current);
        });
        useInterval(1000, () => {
            if (countdown > 0) {
                setCountdown(countdown - 1);
            }
        });

        return (
            <Container>
                {countdown <= 0 ? (
                    <div>
                        Break time&apos;s over.
                        <Button onClick={onTryReturn} variant="primary">
                            continue
                        </Button>
                    </div>
                ) : (
                    <div>
                        Chill time. You have {formatDuration(seconds)} of break time.
                        <br />
                        Or you can stop the current session right now, and maybe come later, or
                        tomorrow.
                        <Button onClick={onQuit}>stop for now</Button>
                        <br />
                    </div>
                )}
            </Container>
        );
    }
}

export const TabOutDistraction = memo(
    TabOutDistraction$.View,
    (prevProps, props) => prevProps.seconds === props.seconds,
);
