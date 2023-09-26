import { Component, For, Show, createMemo, createSignal, useContext } from 'solid-js'
import { emit } from '../api'
import Players from './Players'
import { GameDataContext, IsConfirmedContext, PlayersContext } from './Room'
import { PlayerNameContext } from '../app'

const Witch: Component = () => {
    const players = useContext(PlayersContext)
    const [isConfirmed, setIsConfirmed] = useContext(IsConfirmedContext)!
    const gameData = useContext(GameDataContext)

    const [target, setTarget] = createSignal<string | undefined>()

    const useSave = () => {
        emit('witchSave')
    }

    const usePoison = () => {
        if (typeof target() === 'undefined') {
            return
        }
        setIsConfirmed('witch', true)
        const tar = players().findIndex((name) => name === target())

        emit('witchPoison', tar)
    }

    const deadName = createMemo(() => gameData().dead!.map((value) => players()[value]))

    const playerName = useContext(PlayerNameContext)

    const skip = () => {
        emit('witchSkip')
    }

    return (
        <div class="witch">
            <Show
                when={gameData().witchInventory?.save}
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
                        when={deadName().length > 0 && (gameData().day === 1 || deadName()[0] !== playerName())}
                        fallback={
                            <div>你不能对自己使用解药了qwq</div>
                        }
                    >
                        <button
                            onClick={useSave}
                        >
                            使用解药
                        </button>
                    </Show>
                </Show>
            </Show>

            <Show
                when={gameData().witchInventory?.poison}
                fallback={
                    <div>
                        你已经没有毒药了！
                    </div>
                }
            >
                <Players
                    className="select-player"
                    filter={([, state]) => state === 'alive'}
                    displayState={false}
                    select={{
                        invoke: (t) => {
                            setTarget(t)
                            return !isConfirmed.witch
                        },
                    }}
                />
                <button
                    onClick={usePoison}
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