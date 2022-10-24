import { FormEvent, useRef, useState } from "react";
import "./App.css";
import styled from "styled-components";
import * as app from "../wailsjs/go/main/App";
import { Action, Action1, handleError as catchError } from "./lib";

const TextDiv = styled.div({
    marginTop: 30,
    marginBottom: 30,
    fontSize: "125%",
});

const Ul = styled.div({
    margin: 0,
    li: {
        margin: 0,
        marginLeft: 20,
    },
});

export interface PageListProps {
    index: number;
    children: JSX.Element[];
}
export function PageList({ index, children }: PageListProps) {
    const c = children[index];
    return <div>{c}</div>;
}

namespace WelcomePage {
    export interface Props {
        onSubmit: Action;
    }
    export function View({ onSubmit }: Props) {
        return (
            <div>
                <TextDiv>Welcome</TextDiv>
                <TextDiv>Thank you taking the time to try this out.</TextDiv>
                <TextDiv>
                    In a very brief description, this is an experimental program that will
                    supposedly help you memorize words, facts or ideas. It will help you remember
                    things faster and longer.
                </TextDiv>
                <TextDiv>
                    If you are curious for additional information, please see links included in this
                    program.
                </TextDiv>
                <TextDiv>
                    But for now, please proceed to configure some things before starting.
                </TextDiv>
                <div>
                    <button onClick={onSubmit}>okay</button>
                </div>
            </div>
        );
    }
}

namespace InterestFormPage {
    const InputList = styled.div({
        maxWidth: "50vw",
        "& > div": {
            marginBottom: 20,
        },
    });
    export interface Props {
        onSubmit: Action1<string[]>;
    }
    export function View({ onSubmit }: Props) {
        const [invalid, setInvalid] = useState(false);
        const [randomizing, setRandomizing] = useState(false);
        const inputContainerRef = useRef<HTMLDivElement>(null);

        function onTrySubmit(e: FormEvent) {
            e.preventDefault();
            const data: string[] = [];
            const nodes = inputContainerRef.current?.querySelectorAll("input");
            if (!nodes) {
                return;
            }
            for (const node of nodes) {
                const entry = node.value.trim();
                if (entry) {
                    data.push(entry);
                }
            }

            if (data.length === 0) {
                setInvalid(true);
                return;
            }

            onSubmit(data);
        }
        function onRandomSubmit(e: FormEvent) {
            e.preventDefault();
            const data: string[] = [];
            for (let n = 0; n < defaultUserInterests.length; n++) {
                const i = Math.floor(Math.random() * defaultUserInterests.length);
                const text = defaultUserInterests[i];
                if (!data.includes(text)) {
                    data.push(text);
                }
            }
            const nodes = inputContainerRef.current?.querySelectorAll("input");
            if (nodes) {
                let i = 0;
                for (const node of nodes) {
                    node.value = data[i++];
                }
            }

            setRandomizing(true);
            setTimeout(() => onSubmit(data), 3000);
        }

        return (
            <div>
                <form>
                    <TextDiv>
                        Alrighty then. Please enter one or more interests that you feel strongly
                        about.
                    </TextDiv>
                    <InputList ref={inputContainerRef}>
                        <div>
                            <input />
                        </div>
                        <div>
                            <input />
                        </div>
                        <div>
                            <input />
                        </div>
                        <div>
                            <input />
                        </div>
                        <div>
                            <input />
                        </div>
                    </InputList>

                    {randomizing ? (
                        <div>Okay then...</div>
                    ) : (
                        <>
                            <div>
                                <button onClick={onTrySubmit}>here you go</button>
                            </div>
                            {invalid && (
                                <div>
                                    <div>
                                        Please at least give one interest. Or do you want to roll
                                        the dice?
                                        <button onClick={onRandomSubmit}>any will do</button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </form>
            </div>
        );
    }
    const defaultUserInterests = [
        "cats",
        "dogs",
        "goats",
        "cows",
        "birds",
        "rabbits",
        "reading",
        "travelling",
        "cooking",
        "fishing",
        "movies",
        "collecting",
        "music",
        "gardens",
        "games",
        "cars",
        "martial arts",
        "sports",
        "walking",
        "running",
        "escaping",
        "dancing",
        "feet",
    ];
}

namespace InitialDeckPage {
    export interface Props {
        onSubmit(deck: string): void;
    }
    export function View({ onSubmit }: Props) {
        const [error, setError] = useState("");
        const [deckName, setDeckName] = useState<string | null>();
        const [submitted, setSubmitted] = useState(false);
        const onSelect: React.ChangeEventHandler<HTMLInputElement> = (event) => {
            setSubmitted(false);
            setDeckName(event.target.value);
        };
        async function onSubmitData() {
            if (!deckName) {
                return;
            }

            setSubmitted(true);
            const [, err] = await catchError(app.CreateStartingDeck(deckName, true));
            if (!err) {
                onSubmit(deckName);
            } else {
                setError(err.message);
            }
        }

        return (
            <div>
                <TextDiv>
                    Great, now please select one of the decks to start with. You can create and edit
                    decks later on.
                </TextDiv>
                <div>
                    {startingDecks.map((deck) => (
                        <p key={deck.name}>
                            <label>
                                <input
                                    type="radio"
                                    name="deck"
                                    value={deck.name}
                                    onChange={onSelect}
                                />{" "}
                                {deck.title}
                            </label>
                        </p>
                    ))}
                </div>

                {submitted && !deckName && (
                    <>
                        <div>Hold on, you still need to </div>
                        <Ul>
                            {submitted && (
                                <>
                                    {error && <li>make sure everything is ok</li>}
                                    {!deckName && <li>select a starting deck</li>}
                                </>
                            )}
                        </Ul>
                    </>
                )}

                {error && <div>{error}</div>}

                <br />
                <div>
                    <button onClick={onSubmitData}>I am ready!</button>
                </div>
            </div>
        );
    }
    const startingDecks = [
        { name: "swedish", title: "Swedish words" },
        { name: "japanese", title: "Japanese words" },
        { name: "trivias", title: "Random trivias" },
    ];
}

namespace ReadyPage {
    export interface Props {
        deck: string | null;
        onSubmit(): void;
    }
    export function View({ deck, onSubmit }: Props) {
        if (!deck) {
            return null;
        }
        return (
            <div>
                <TextDiv>Great! You are good to go.</TextDiv>

                <div>
                    <button onClick={onSubmit}>{"let's go"}</button>
                </div>
            </div>
        );
    }
}

export namespace UserStart {
    export interface Props {
        onSubmit: Action1<string>;
    }

    export function View({ onSubmit }: Props) {
        const [pageNum, setPageNum] = useState(0);
        const [deck, setDeck] = useState<string | null>(null);

        async function onSubmitWelcomePage() {
            setPageNum(pageNum + 1);
        }
        function onSubmitInterests(interests: string[]) {
            setPageNum(pageNum + 1);
        }
        function onSubmitDeck(deck: string) {
            setPageNum(pageNum + 1);
            setDeck(deck);
        }
        function onSubmitReady() {
            setPageNum(pageNum + 1);
            if (deck) {
                onSubmit(deck);
            }
        }

        return (
            <Container>
                <PageList index={pageNum}>
                    <WelcomePage.View onSubmit={onSubmitWelcomePage} />
                    <InterestFormPage.View onSubmit={onSubmitInterests} />
                    <InitialDeckPage.View onSubmit={onSubmitDeck} />
                    <ReadyPage.View deck={deck} onSubmit={onSubmitReady} />
                    <div>
                        <TextDiv>{"Huh, you shouldn't see this message."}</TextDiv>
                        <TextDiv>This is a glitch, reality is a glitch</TextDiv>
                        <TextDiv>You should, uh, restart the application.</TextDiv>
                    </div>
                </PageList>
            </Container>
        );
    }

    const Container = styled.div({
        margin: 25,
        padding: 10,
        border: "1px solid gray",
        textAlign: "justify",
        //fontSize: "120%",

        "h1,h2,h3": {
            fontWeight: "bolder",
        },
    });
}
