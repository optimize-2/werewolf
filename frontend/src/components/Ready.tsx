import { Component, Show, createSignal, useContext } from 'solid-js'
import * as api from '../api'
import { PlayerNameContext } from '../app'
import { PlayerStatesContext } from './Room'
import './Ready.css'

const Ready: Component<{
    setPlayerStates: (players: Record<string, api.PlayerState>) => void
}> = (props) => {
    const playerName = useContext(PlayerNameContext)
    const [isReady, setIsReady] = createSignal(false)

    const playerStates = useContext(PlayerStatesContext)

    const ready = () => {
        api.emit('ready')
    }

    // if (import.meta.env.MODE === 'development') {
    //     ready()
    // }

    const cancelReady = () => {
        api.emit('cancelReady')
        setIsReady(false)
    }

    api.on('readyResult', (data) => {
        setIsReady(data[playerName()])

        const playersNow = { ...playerStates() }

        for (const p in data) {
            if (data[p]) {
                playersNow[p] = 'ready'
            } else {
                playersNow[p] = 'unready'
            }
        }

        props.setPlayerStates(playersNow)
    })

    return (
        <div class="ready">
            <Show
                when={isReady()}
                fallback={
                    <button
                        type="button"
                        onClick={ready}
                    >
                    准备
                    </button>
                }
            >
                <button
                    type="button"
                    onClick={cancelReady}
                >
                取消准备
                </button>
            </Show>

        </div>
    )
}

export default Ready
