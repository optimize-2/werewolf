import { createSignal, type Component, Show, createContext } from 'solid-js'
import * as api from './api'
import Room from './components/Room'
import './app.css'

export const PlayerNameContext = createContext<() => string>(() => '')

const App: Component = () => {
    const [username, setUsername] = createSignal('')
    const [isLoggedin, setIsLoggedin] = createSignal(false)

    const [gameState, setGameState] = createSignal<api.GameState>('idle')
    const [config, setConfig] = createSignal<api.ConfigType>({
        pass: [],
        roles: {
            hunter: 0,
            seer: 0,
            villager: 0,
            werewolf: 0,
            witch: 0,
        },
        target: 'side',
    })

    api.on('loginResult', (data) => {
        setIsLoggedin(true)
        setGameState(data.state)
        setConfig(data.config)
    })

    const login = () => {
        const name = username()
        if (name.length > 0) {
            api.emit('login', name)
        }
    }

    api.on('disconnect', () => {
        setIsLoggedin(false)
    })

    return (
        <div>
            <Show
                when={isLoggedin()}
                fallback={
                    <>
                        <div
                            class="username-container"
                        >
                            <div class="username-label">用户名: </div>
                            <input
                                class="username"
                                onInput={(e) => setUsername(e.currentTarget.value)}
                                style="width: 200px"
                            />
                        </div>

                        <button
                            type="button"
                            onClick={() => login()}>进入游戏
                        </button>
                    </>
                }
            >
                <PlayerNameContext.Provider
                    value={username}
                >
                    <div
                        class="username-container"
                    >
                        <div class="username-label">用户名: </div>
                        <div class="username">{username()}</div>
                    </div>
                    <Room
                        gameConfig={config()}
                        gameStateNow={gameState()}
                    />
                </PlayerNameContext.Provider>
            </Show>
        </div>
    )
}

export default App
