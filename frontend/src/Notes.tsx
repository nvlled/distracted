import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { app } from "./api";
import { lt } from "./layout";
import { invoke } from "./lib";
import { Action, Action1 } from "./lib";

interface ContainerProps {
    show: boolean;
}
const st = {
    Container: styled.div<ContainerProps>`
        position: absolute;
        top: 0;
        left: ${(props) => (props.show ? 0 : "-1000px")};
        border: 2px solid #333;
        width: 50vw;
        min-width: 500px;
        max-width: 700px;
        height: 100vh;
        background: #222b;
        transition: left 0.5s;

        ._text {
            height: 100%;
            background: #222b;
        }
    `,
};

export function Notes({ show, onClose }: { show: boolean; onClose: Action }) {
    const [init, setInit] = useState(true);
    const [notes, setNotes] = useState("");
    const textRef = useRef<HTMLTextAreaElement>(null);
    useEffect(() => {
        invoke(async () => {
            if (show) {
                console.log("getting notes");
                const notes = await app.GetNotes();
                setInit(false);
                setNotes(notes);
            } else if (notes) {
                const updatedNotes = textRef.current?.value;
                if (updatedNotes && updatedNotes != notes) {
                    console.log("saving notes");
                    app.SaveNotes(updatedNotes);
                }
            }
        });
    }, [show]);

    useEffect(() => {}, []);

    return (
        <st.Container show={show}>
            <lt.Row justifyContent={"space-between"}>
                <i>quick notes.txt</i>
                <button onClick={onClose}>✗</button>
            </lt.Row>
            {init ? (
                "loading..."
            ) : (
                <textarea ref={textRef} className="_text" defaultValue={notes} />
            )}
        </st.Container>
    );
}
