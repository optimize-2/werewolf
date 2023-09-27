import { Component, For, Show, createSignal, useContext } from 'solid-js'
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

    const [lastSend, setLastSend] = createSignal<string | undefined>()

    props.recvMessage((data) => {
        // console.log('receive', props.type, data)
        setLastSend(data.username)
        setMessages([...messages(), data])
        history!.scrollTo({
            top: history!.scrollHeight,
        })
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

    return (
        <div class={`${props.type}-container`}>
            <div class={`${props.type}-history`} ref={history}>
                <For each={messages()}>
                    {
                        ({ username, message }) => (
                            <div class="message-container">
                                <Show
                                    when={typeof lastSend() !== 'undefined' || lastSend() !== username}
                                >
                                    <div class="message-sender">{username}:</div>
                                </Show>
                                <pre class="message">{message}</pre>
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
