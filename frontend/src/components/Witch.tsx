import { Component, For, Show, createMemo, createSignal, useContext } from 'solid-js'
import { WitchInventory, emit } from '../api'
import Players from './Players'
import { PlayersContext, RoundContext } from './Room'
import { PlayerNameContext } from '../app'

const Witch: Component<{
    witchInventory: WitchInventory
    dead: number[]
}> = (props) => {
    const players = useContext(PlayersContext)
    const [target, setTarget] = createSignal('')

    const selectPoison = () => {
        const tar = players().findIndex((name) => name === target())

        emit('witchPoison', tar)
    }

    const deadName = createMemo(() => props.dead.map((value) => players()[value]))

    const round = useContext(RoundContext)
    const playerName = useContext(PlayerNameContext)

    const skip = () => {
        emit('witchSkip')
    }

    return (
        <div class="witch">
            <Show
                when={props.witchInventory.save}
                fallback={
                    <div>
                        你已经没有解药了！
                    </div>
                }
            >
                <Show
                    when={deadName().length > 0}
                    fallback={
                        <div>今晚没有人被刀</div>
                    }
                >
                    <div>今晚被刀的人是</div>
                    <div
                        class="death-container"
                    >
                        <For
                            each={deadName()}
                        >
                            {
                                (name) => (
                                    <div class="death">
                                        {name}
                                    </div>
                                )
                            }
                        </For>
                    </div>
                    <Show
                        when={deadName().length > 0 && (round() === 1 || deadName()[0] !== playerName())}
                        fallback={
                            <div>你不能对自己使用解药了qwq</div>
                        }
                    >
                        <button
                            onClick={() => emit('witchSave')}
                        >
                            使用解药
                        </button>
                    </Show>
                </Show>
            </Show>

            <Show
                when={props.witchInventory.poison}
                fallback={
                    <div>
                        你已经没有毒药了！
                    </div>
                }
            >
                <Players
                    className="select-player"
                    filter={([name, state]) => state === 'alive' && deadName().findIndex((value) => value === name) === -1}
                    displayState={false}
                    select={{
                        invoke: (t) => setTarget(t),
                        default: {
                            nameOrID: 0,
                            isAdditon: false,
                        },
                    }}
                />
                <button
                    onClick={() => selectPoison()}
                >
                    使用毒药
                </button>
            </Show>

            <div>
                <button onClick={skip}>跳过</button>
            </div>
        </div>
    )
}

export default Witch