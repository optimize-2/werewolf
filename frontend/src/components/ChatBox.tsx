import { Component, For, createMemo, createSignal, useContext } from 'solid-js'
import './ChatBox.css'
import { CanSendContext } from './Room'

type Message = { username: string, message: string }

const ChatBox: Component<{
    type: 'discuss' | 'chat'
    recvMessage: (fn: (data: Message) => void) => void
    sendMessage: (fn: () => string) => void
}> = (props) => {
    let textarea: HTMLTextAreaElement | undefined

    const [messages, setMessages] = createSignal<Message[]>([])

    let history: HTMLDivElement | undefined

    const canSend = useContext(CanSendContext)

    props.recvMessage((data) => {
        console.log('receive', props.type, data)

        let isBottom = false
        console.log(history!.scrollTop, history!.scrollHeight)
        if (history!.scrollTop + history!.clientHeight === history!.scrollHeight) {
            isBottom = true
        }

        setMessages([...messages(), data])

        if (isBottom) {
            history!.scrollTo({
                top: history!.scrollHeight,
            })
        }
    })

    const sendMessage = () => {
        if (!canSend()) {
            return
        }
        props.sendMessage(() => {
            const msg = textarea!.value.trim()
            if (msg.length > 0) {
                textarea!.value = ''
            }
            console.log('send', props.type, msg)
            return msg
        })
    }

    const onKeyDown = (e: KeyboardEvent) => {
        if (!canSend()) {
            return
        }
        if (e.ctrlKey && e.key === 'Enter') {
            sendMessage()
        }
    }

    const processedMessages = createMemo(() => {
        const msgs = messages()
        const res: {
            username: string,
            messages: string[]
        }[] = []
        for (let i = 0; i < msgs.length; i++) {
            const now = msgs[i]
            if (i === 0 || now.username !== msgs[i - 1].username) {
                res.push({
                    username: now.username,
                    messages: [now.message],
                })
            } else {
                res.at(-1)?.messages.push(now.message)
            }
        }
        return res
    })

    return (
        <div class={`${props.type}-container`}>
            <div class={`${props.type}-history`} ref={history}>
                <For each={processedMessages()}>
                    {
                        ({username, messages}) => (
                            <div class="message-container">
                                <div class="message-sender">{username}:</div>
                                <For
                                    each={messages}
                                >
                                    {
                                        (message) => (
                                            <pre class="message">{message}</pre>
                                        )
                                    }
                                </For>

                                <hr />
                            </div>
                        )
                    }
                </For>
            </div>
            <div
                class={`${props.type}-input`}
            >
                <textarea
                    class="message-input"
                    onKeyDown={onKeyDown}
                    placeholder="Ctrl + Enter 发送消息"
                    disabled={!canSend()}
                    ref={textarea}
                />
                <button
                    class="message-button"
                    disabled={!canSend()}
                    onClick={sendMessage}
                >
                    发送
                </button>
            </div>
        </div>
    )
}

export default ChatBox
