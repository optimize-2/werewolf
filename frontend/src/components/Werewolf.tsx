import { Component, For, Show, createSignal, useContext } from "solid-js"
import Players from "./Players"
import * as api from '../api'
import { createStore } from "solid-js/store"
import { PlayersContext } from "./Room"

const Werewolf: Component = () => {
    const [isConfirmed, setIsConfirmed] = createSignal(false)

    const players = useContext(PlayersContext)

    const select = (target: string, isEmptyKnife: boolean) => {
        let tar = -1

        if (isEmptyKnife) {
            tar = -1
        } else {
            tar = players.findIndex((name) => name === target)
        }

        console.log(players, target, tar)

        if (!isConfirmed()) {
            api.emit('werewolfSelect', tar)
        }
    }

    const cancelComfirmation = () => {
        setIsConfirmed(false)
        api.emit('werewolfCancel')
    }

    const confirm = () => {
        if (!isConfirmed()) {
            setIsConfirmed(true)
            api.emit('werewolfConfirm')
        }
    }

    const [otherSelected, setOtherSelected] = createStore<Record<number, number>>()
    const [otherConfirmed, setOtherConfirmed] = createStore<Record<number, boolean>>()

    api.on('werewolfResult', (data) => {
        console.log('werewolfResult receive', data)
        setOtherSelected(data.select)
        setOtherConfirmed(data.confirm)
    })

    return (
        <div class="werewolf">
            <div class="werewolf-action">
                请选择你要刀的人
                <Players
                    className="select-player"
                    filter={([name, state]) => state === 'alive'}
                    displayState={false}
                    select={(t, isAddtion) => select(t, isAddtion)}
                    addition={{ '空刀': '空刀' }}
                />
                <Show
                    when={!isConfirmed()}
                    fallback={
                        <button
                            onClick={() => cancelComfirmation()}
                        >
                            取消
                        </button>
                    }
                >
                    <button
                        onClick={() => confirm()}
                    >
                        确认
                    </button>
                </Show>
            </div>
            <div class="werewolf-panel">
                <div class="werewolf-selected">
                    <For
                        each={Object.entries(otherSelected)}
                    >
                        {
                            ([id, target]) => (
                                <div>
                                    {players[id]} {otherConfirmed[id] ? '确认' : '选择'}了
                                    <span
                                        title={target === -1 ? '空刀' : undefined}
                                    >
                                        {target === -1 ? '空刀' : players[target]}
                                    </span>
                                </div>
                            )
                        }
                    </For>
                </div>
            </div>
        </div>
    )
}

export default Werewolf
