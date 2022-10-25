import { memo } from "react";
import ReactMarkdown from "react-markdown";
import styled from "styled-components";
import { app } from "./api";
import { AudioPlayer } from "./AudioPlayer";
import { Card } from "./card";
import { useCardWatch } from "./lib";
import { Divider } from "./shoelace";

export namespace CardView$ {
    export interface Props {
        card: Card;
    }
    export function View({ card: cardProp }: Props) {
        const [card] = useCardWatch(cardProp);
        async function onFilenameClick() {
            await app.OpenCardFile(card.path);
        }
        return (
            <Container>
                <CardFilename onClick={onFilenameClick}>{card.filename}</CardFilename>
                <ReactMarkdown
                    components={{
                        hr({ node, ...props }) {
                            return <Divider />;
                        },
                        a({ node, ...props }) {
                            const href = props.href;
                            const lines = [];
                            for (const c of node.children) {
                                if (c.type === "text") {
                                    lines.push(c.value);
                                }
                            }
                            const content = lines.join(" ");

                            if (href === "sound" || href == "audio") {
                                const a = (
                                    <AudioPlayer src={Card.getUrlPath(card.deckName, content)} />
                                );
                                return a;
                            }
                            return <a href="#">{content}</a>;
                        },
                    }}
                >
                    {card.contents}
                </ReactMarkdown>
            </Container>
        );
    }
    const Container = styled.div``;
    const CardFilename = styled.div`
        text-align: center;
        font-size: 12px;
        text-decoration: underline;
        cursor: pointer;
    `;
}

export const CardView = memo(
    CardView$.View,
    (prev, props) => prev.card.contents === props.card.contents,
);
