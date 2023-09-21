import { createSignal, type Component, createEffect, Show, For } from 'solid-js'
import * as api from '../api'

const Room: Component = () => {
    const [players, setPlayers] = createSignal<Record<string, api.PlayerState>>({})

    api.on('updateUsers', (data) => {
        setPlayers(data)
    })

    return (
        <div>
            <button type='button' onClick={() => api.emit('testUpdateUsers', true)}>test updateUsers</button>
            <ul>
                <For each={Object.entries(players())}>
                    {
                        (player) => (
                            <li>{player[0]} state {player[1]}</li>
                        )
                    }
                </For>
            </ul>
        </div>
    )
}

export default Room
