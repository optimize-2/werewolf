import { Component, createSignal, useContext } from 'solid-js'
import Players from './Players'
import { IsConfirmedContext, PlayersContext } from './Room'
import { emit } from '../api'
import { PlayerNameContext } from '../app'

const Seer: Component<{
    setSeerTarget: (target: number) => void
}> = (props) => {
    const [target, setTarget] = createSignal('')

    const players = useContext(PlayersContext)
    const playerName = useContext(PlayerNameContext)

    const [isConfirmed, setIsConfirmed] = useContext(IsConfirmedContext)!

    const confirm = () => {
        const t = players().findIndex((name) => name === target())
        props.setSeerTarget(t)
        setIsConfirmed('seer', true)
        emit('seerConfirm', t)
    }

    return (
        <div class="seer">
            <Players
                className="select-player"
                filter={([name, state]) => state === 'alive' && name !== playerName()}
                select={{
                    invoke: (t) => {
                        if (!isConfirmed.seer) {
                            setTarget(t)
                            return true
                        }
                        return false
                    },
                    default: {
                        nameOrID: 0,
                        isAdditon: false,
                    },
                }}
            />

            <button onClick={() => confirm()}>确认</button>
        </div>
    )
}

export default Seer
