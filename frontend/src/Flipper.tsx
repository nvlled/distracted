import { ReactNode, forwardRef, ForwardedRef, useRef, useImperativeHandle } from "react";
import styled from "styled-components";
import { waitEvent } from "./lib";
import { Animation, AnimationRef } from "./shoelace";

export namespace Flipper$ {
    export interface Control {
        reset: () => Promise<void>;
        flipOut: () => Promise<void>;
        hide: () => Promise<void>;
        show: () => Promise<void>;
        flipIn: () => Promise<void>;
    }
    export interface Props {
        children: ReactNode;
        rate?: number;
        outAnimation?: string;
        inAnimation?: string;
    }
    export const View = forwardRef(function (
        { rate, children, outAnimation = "backOutLeft", inAnimation = "backInRight" }: Props,
        ref: ForwardedRef<Control>,
    ) {
        const animRef = useRef<AnimationRef | null>(null);
        const onMount = (ref: AnimationRef) => {
            animRef.current = ref;
            if (!ref) return;
            ref.iterations = 1;
            ref.playbackRate = rate ?? 1;
        };

        useImperativeHandle(
            ref,
            () => ({
                reset: async () => {
                    const anim = animRef.current;
                    if (!anim) return;
                    anim.name = "";
                },
                flipOut: async () => {
                    const anim = animRef.current;
                    if (!anim) return;
                    anim.name = outAnimation;
                    anim.play = true;
                    await waitEvent(anim, "sl-finish");
                    anim.style.visibility = "hidden";
                },
                flipIn: async () => {
                    const anim = animRef.current;
                    if (!anim) return;
                    anim.style.visibility = "visible";
                    anim.name = inAnimation;
                    anim.play = true;
                    await waitEvent(anim, "sl-finish");
                },
                hide: async () => {
                    const anim = animRef.current;
                    if (!anim) return;
                    anim.style.visibility = "hidden";
                },
                show: async () => {
                    const anim = animRef.current;
                    if (!anim) return;
                    anim.style.visibility = "visible";
                },
            }),
            [],
        );
        return <Animation ref={onMount}>{children}</Animation>;
    });
    const Container = styled.div``;
}
export const Flipper = Flipper$.View;
