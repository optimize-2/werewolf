import { Component, For, createMemo, onMount, useContext } from 'solid-js'
import { PlayerState } from '../api'
import { PlayerStatesContext } from './Room'
import './Players.css'
import { entries } from '@werewolf/utils'

const Players: Component<{
    className: 'alive' | 'players' | 'select-player'
    filter: (player: [string, PlayerState]) => boolean
    displayState?: boolean
    select?: {
        invoke: (target: string, isAddtion: boolean) => void
        default?: {
            nameOrID: string | number
            isAdditon: boolean
        }
    }
    addition?: Record<string, string | undefined>
}> = (props) => {
    const playerStates = useContext(PlayerStatesContext)

    const data = createMemo(() => {
        const dat: [string, string | undefined, boolean][] =
            entries(playerStates()).filter(props.filter).map((value) => [value[0], value[1], false])
        if (props.addition) {
            for (const i in props.addition) {
                dat.push([i, props.addition[i], true])
            }
        }

        return dat
    })

    const select = (name: string, msg: string | undefined, isAddition: boolean) => {
        const tags = Array.from(document.querySelectorAll(`div.${props.className}-item`))
        for (const e of tags) {
            if (e.id === name) {
                e.classList.add('selected')
            } else {
                e.classList.remove('selected')
            }
        }

        if (props.select) {
            props.select.invoke(name, isAddition)
        }
    }

    onMount(() => {
        if (typeof props.select?.default !== 'undefined') {
            const dft = props.select.default
            let name: string | undefined = undefined
            if (typeof dft.nameOrID === 'string') {
                name = dft.nameOrID
            } else if (data().length > 0) {
                name = data()[dft.nameOrID][0]
            }
            if (name) {
                select(name, undefined, dft.isAdditon)
            }
        }
    })

    return (
        <div class="player-container">
            <For
                each={data()}
            >
                {
                    ([name, msg, isAddition]) => (
                        <div
                            class={`${props.className}-item`}
                            id={name}
                            onClick={
                                props.select ? () => select(name, msg, isAddition) : () => { }
                            }
                            title={isAddition ? msg : undefined}
                        >
                            {name} {props.displayState ? msg : ''}
                        </div>
                    )
                }
            </For>
        </div>
    )
}

export default Players
