import { Component, createSignal, useContext } from 'solid-js'
import * as api from '../api'
import Players from './Players'
import { GameDataContext, IsConfirmedContext, PlayersContext } from './Room'

const Guard: Component = () => {
    const players = useContext(PlayersContext)
    const [isConfirmed, setIsConfirmed] = useContext(IsConfirmedContext)!
    const gameData = useContext(GameDataContext)

    const [target, setTarget] = createSignal<string | undefined>()

    const protect = () => {
        if (typeof target() === 'undefined') {
            return
        }
        setIsConfirmed('guard', true)
        const tar = players().findIndex((name) => name === target())

        api.emit('guardProtect', tar)
    }

    const skip = () => {
        api.emit('guardSkip')
    }

    return (
        <div class="guard">
            <Players
                className="select-player"
                filter={([name, state]) => state === 'alive' && name !== gameData().guardLastProtect}
                select={{
                    invoke: (t) => {
                        setTarget(t)
                        return !isConfirmed.guard
                    },
                    default: {
                        nameOrID: 0,
                        isAdditon: false,
                    },
                }}
            />

            <div>
                <button onClick={protect}>确认保护</button>
            </div>

            <div>
                <button onClick={skip}>跳过</button>
            </div>
        </div>
    )
}

export default Guard