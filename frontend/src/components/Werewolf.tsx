import { Component, For, Show, createSignal, useContext } from 'solid-js'
import Players from './Players'
import * as api from '../api'
import { createStore } from 'solid-js/store'
import { PlayersContext } from './Room'
import { entries } from '@werewolf/utils'

const Werewolf: Component = () => {
    const [isConfirmed, setIsConfirmed] = createSignal(false)

    const players = useContext(PlayersContext)

    const select = (target: string, isEmptyKnife: boolean) => {
        if (!isConfirmed()) {
            // console.log(players(), target, tar)

            api.emit('werewolfSelect', isEmptyKnife ? -1 : players().findIndex((name) => name === target))
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
        setOtherSelected(data.select)
        setOtherConfirmed(data.confirm)
    })

    return (
        <div class="werewolf">
            <div class="werewolf-action">
                请选择你要刀的人
                <Players
                    className="select-player"
                    filter={([, state]) => state === 'alive'}
                    displayState={false}
                    addition={{ '空刀': '空刀' }}
                    select={{
                        invoke: (t, isAddtion) => select(t, isAddtion),
                        default: {nameOrID: '空刀', isAdditon: true,},
                    }}
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
                        each={entries(otherSelected)}
                    >
                        {
                            ([id, target]) => (
                                <div>
                                    {players()[id]} {otherConfirmed[id] ? '确认' : '选择'}了
                                    <span
                                        style={target === -1 ? 'font-weight: bold;' : undefined}
                                    >
                                        {target === -1 ? '空刀' : players()[target]}
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
