import { Component, For, createMemo, useContext } from 'solid-js'
import { PlayerState } from '../api'
import { PlayerStatesContext } from './Room'
import './Players.css'
import { entries } from '@werewolf/utils'

const Players: Component<{
    className: 'alive' | 'players' | 'select-player'
    filter: (player: [string, PlayerState]) => boolean
    displayState: boolean
    select?: (target: string, isAddtion: boolean) => void
    addition?: Record<string, string | undefined>
}> = (props) => {
    const playerStates = useContext(PlayerStatesContext)

    const data = createMemo(() => {
        const dat: [string, string | undefined, boolean][] =
            entries(playerStates).filter(props.filter).map((value) => [value[0], value[1], false])
        if (props.addition) {
            for (const i in props.addition) {
                dat.push([i, props.addition[i], true])
            }
        }
        return dat
    })

    const refs: Record<string, HTMLDivElement> = {}

    return (
        <div class="player-container">
            <For
                each={data()}
            >
                {
                    ([name, msg, isAddtion]) => (
                        <div
                            class={`${props.className}-item`}
                            onClick={
                                props.select ? () => {
                                    for (const k in refs) {
                                        refs[k].classList.remove('selected')
                                    }
                                    refs[name].classList.add('selected')
                                    if (props.select) {
                                        props.select(name, isAddtion)
                                    }
                                } : () => { }
                            }
                            title={isAddtion ? msg : undefined}
                            ref={refs[name]}
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
