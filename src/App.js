import "./App.css";
import { withAuthenticator, Authenticator } from "@aws-amplify/ui-react";
import Amplify, { API, Auth } from "aws-amplify";
import config from "./aws-exports";
import "@aws-amplify/ui-react/styles.css";
import { useEffect, useRef, useState } from "react";
import { graphqlOperation } from "aws-amplify";
import { listMessages } from "./graphql/queries";
import { createMessage } from "./graphql/mutations";
import { onCreateMessage } from "./graphql/subscriptions";
import moment from "moment";

Amplify.configure(config);

function App({ signOut, user }) {
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState("");
    const messageEnd = useRef(null);

    useEffect(() => {
        const subscription = API.graphql(
            graphqlOperation(onCreateMessage)
        ).subscribe({
            next: ({ provider, value }) => {
                setMessages((stateMessages) => [
                    ...stateMessages,
                    value.data.onCreateMessage,
                ]);
            },
            error: (error) => console.warn(error),
        });
    }, []);
    useEffect(() => {
        async function getMessages() {
            try {
                const messagesReq = await API.graphql({
                    query: listMessages,
                    authMode: "AMAZON_COGNITO_USER_POOLS",
                });
                setMessages([...messagesReq.data.listMessages.items]);
            } catch (error) {
                console.error(error);
            }
        }
        getMessages();
    }, [user]);
    useEffect(() => {
        scrollToBottom();
    }, [message, messages]);
    function scrollToBottom() {
        messageEnd.current?.scrollIntoView({ behavior: "smooth" });
    }
    const handleSend = async (e) => {
        try {
            if (message.length >= 1 && e.key === "Enter") {
                const info = {
                    owner: user.username,
                    message: message,
                };
                setMessage("");
                await API.graphql({
                    authMode: "AMAZON_COGNITO_USER_POOLS",
                    query: createMessage,
                    variables: {
                        input: info,
                    },
                });
                setMessages((messages) => [...messages, info]);
                scrollToBottom();
            }
        } catch (err) {
            console.error(err);
        }
    };
    return (
        <div>
            <div className="navbar navbar-expand-lg navbar-light bg-light fixed-top">
                <header className="container-fluid">
                    <p className="navbar-brand">Chat App</p>
                    <Authenticator>
                        {({ signOut, user }) => (
                            <div className="d-flex align-items-center">
                                <h4 className="me-1">{user.username}</h4>
                                <button
                                    className="bnt btn-sm btn-warning"
                                    onClick={signOut}
                                >
                                    Sign out
                                </button>
                            </div>
                        )}
                    </Authenticator>
                </header>
            </div>
            <div
                className="chat-container container-fluid mb-5"
                style={{ paddingTop: "50px" }}
            >
                <main className="msger-chat">
                    {messages
                        .sort((a, b) => {
                            return (
                                new Date(a.createdAt) - new Date(b.createdAt)
                            );
                        })
                        .map((msg, i) => {
                            return (
                                <div
                                    className={`msg ${
                                        user.username !== msg.owner
                                            ? "left-msg"
                                            : "right-msg"
                                    }`}
                                    key={i}
                                    ref={
                                        i === messages.length - 1
                                            ? messageEnd
                                            : null
                                    }
                                >
                                    <div className="msg-img"></div>

                                    <div className="msg-bubble">
                                        <div className="msg-info">
                                            <div className="msg-info-name">
                                                {msg.owner}
                                            </div>
                                            <div className="msg-info-time">
                                                {moment(msg.createdAt).format(
                                                    "LT"
                                                )}
                                            </div>
                                        </div>

                                        <div className="msg-text">
                                            {msg.message}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                </main>
            </div>
            <div className="textfield-container fixed-bottom">
                <div className="textfield d-flex mb-1">
                    <input
                        type="text"
                        className="form-control ms-1 me-1"
                        placeholder="start typing..."
                        rows={1}
                        style={{ resize: "none", overflow: "hidden" }}
                        value={message}
                        onChange={(e) => {
                            setMessage(e.target.value);
                        }}
                        onKeyDown={handleSend}
                    />
                    <button
                        className="btn btn-primary ms-1 me-1 ps-5 pe-5"
                        onClick={handleSend}
                    >
                        SEND
                    </button>
                </div>
            </div>
        </div>
    );
}

export default withAuthenticator(App);
