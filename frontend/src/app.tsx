import { createSignal, type Component, createEffect, Show } from 'solid-js'
import * as api from './api'
import Room from './components/Room';

const App: Component = () => {
    const [username, setUsername] = createSignal('');
    // const [connecting, setConnecting] = createSignal(true)
    const [connected, setConnected] = createSignal(false)

    const enter = (username: string) => {
        // setConnecting(true)
        console.log(`connecting ${username}`)
        setConnected(true)
    }

    // createEffect(() => {
    //     api.isConnected()
    // })

    return (
        <div>
            <form action=''>
                <label>用户名</label>
                <input onInput={(e) => setUsername(e.currentTarget.value)} />
            </form>

            <Show
                when={connected()}
                fallback={
                    <button
                        type='button'
                        onClick={() => enter(username())}>进入游戏
                    </button>
                }
            >
                <Room />
            </Show>
        </div>
    )
}

export default App
