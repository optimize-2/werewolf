import { createSignal, type Component, Show, createContext } from 'solid-js'
import * as api from './api'
import Room from './components/Room'
import './app.css'
import { faker } from '@faker-js/faker'

export const PlayerNameContext = createContext<() => string>(() => '')

const App: Component = () => {
    const [username, setUsername] = createSignal('')
    const [isLoggedin, setIsLoggedin] = createSignal(false)

    const [loginResult, setLoginResult] = createSignal<api.LoginResult | undefined>()

    api.on('loginResult', (data) => {
        setIsLoggedin(true)
        setLoginResult(data)
    })

    const login = () => {
        const name = username()
        if (name.length > 0) {
            api.emit('login', name)
        }
    }

    if (import.meta.env.MODE === 'development') {
        setUsername(faker.person.firstName())
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
                            <div class="username-label">用户名: </div>
                            <input
                                class="username"
                                onInput={(e) => setUsername(e.currentTarget.value)}
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
                        <div class="username">{username()}</div>
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
