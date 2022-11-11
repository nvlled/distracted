import { useRef } from "react";
import styled from "styled-components";
import { app } from "./api";
import { useOnMount, useOnUnmount } from "./hooks";
import { TextareaRef, Textarea } from "./shoelace";

export namespace Notes$ {
    export interface Props {}
    export function View({}: Props) {
        const ref = useRef<TextareaRef>(null);

        useOnMount(async () => {
            const textarea = ref.current;
            if (textarea) {
                textarea.value = await app.GetNotes();
            }
        });
        useOnUnmount(() => {
            const textarea = ref.current;
            if (textarea) {
                app.SaveNotes(textarea.value);
            }
        });

        return (
            <Container>
                <Textarea ref={ref} autofocus />
            </Container>
        );
    }
    const Container = styled.div`
        &,
        textarea {
            height: 100%;
        }
        sl-textarea {
            &,
            ::part(form-control),
            ::part(form-control-input),
            ::part(base),
            ::part(textarea) {
                height: 100%;
            }
        }
    `;
}
export const Notes = Notes$.View;
