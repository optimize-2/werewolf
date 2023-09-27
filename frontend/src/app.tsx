import { createSignal, type Component, Show, createContext } from 'solid-js'
import * as api from './api'
import Room from './components/Room'
import './app.css'
import { faker } from '@faker-js/faker'

export const PlayerNameContext = createContext<() => string>(() => '')

const App: Component = () => {
    const [token, setToken] = createSignal('')
    const [username, setUsername] = createSignal('')
    const [isLoggedin, setIsLoggedin] = createSignal(false)

    const [loginResult, setLoginResult] = createSignal<api.LoginResult | undefined>()

    api.on('loginResult', (data) => {
        setUsername(data.username)
        setIsLoggedin(true)
        setLoginResult(data)
    })

    const login = () => {
        const name = token()
        if (name.length > 0) {
            api.emit('login', name)
        }
    }

    if (import.meta.env.MODE === 'development') {
        setToken(faker.person.firstName())
        login()
    }

    api.on('disconnect', () => {
        setIsLoggedin(false)
    })

    return (
        <div
            class="app"
        >
            <Show
                when={isLoggedin()}
                fallback={
                    <>
                        <div
                            class="username-container"
                        >
                            <div class="username-label">Token: </div>
                            <input
                                class="username"
                                onInput={(e) => setToken(e.currentTarget.value)}
                                style="width: 200px"
                            />
                        </div>

                        <button
                            type="button"
                            class="enter-game"
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
                        <div class="username">{token()}</div>
                    </div>
                    <Room
                        loginResult={loginResult}
                    />
                </PlayerNameContext.Provider>
            </Show>
        </div>
    )
}

export default App
