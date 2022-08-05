import styled from "styled-components";
import { Action } from "./lib";

export function Dialog({ show = false, children, onClose, disableClose }: Dialog.Props) {
    const { Container } = Dialog.components;
    return (
        <Container show={show} onClick={() => !disableClose && onClose?.()}>
            <div className="_content" onClick={(e) => e.stopPropagation()}>
                {children}
                <div className="_button-panel" onClick={onClose}>
                    <button>✗</button>
                </div>
            </div>
        </Container>
    );
}
export namespace Dialog {
    export interface Props {
        show?: boolean;
        children: React.ReactNode;
        onClose?: Action;
        disableClose?: boolean;
    }
    export const components = {
        Container: styled.div<{ show: boolean }>`
            position: fixed;
            top: ${(props) => (props.show ? 0 : "-150%")};
            left: 0;
            width: 100vw;
            height: 100vh;
            background: #1112;
            transition: top 0.5s;

            ._button-panel {
                position: absolute;
                right: 0;
                top: 0;
                padding: 10px;
            }
            ._content {
                position: relative;
                padding: 30px;
                margin: auto;
                max-width: 800px;
                max-height: 100vh;
                overflow-y: auto;
                height: 100%;
                border: 1px solid gray;
                background: #222;
            }
        `,
    };
}
