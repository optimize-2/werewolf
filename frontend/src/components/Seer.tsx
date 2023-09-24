import { Component, createSignal, useContext } from 'solid-js'
import Players from './Players'
import { PlayersContext } from './Room'
import { emit } from '../api'
import { PlayerNameContext } from '../app'

const Seer: Component<{
    setSeerTarget: (target: number) => void
}> = (props) => {
    const [target, setTarget] = createSignal('')

    const players = useContext(PlayersContext)
    const playerName = useContext(PlayerNameContext)

    const select = () => {
        const t = players.findIndex((name) => name === target())
        props.setSeerTarget(t)
        emit('seerConfirm', t)
    }

    return (
        <div class="seer">
            <Players
                className="select-player"
                filter={([name, state]) => state === 'alive' && name !== playerName()}
                displayState={false}
                select={(t) => setTarget(t)}
            />

            <button onClick={() => select()}>确认</button>
        </div>
    )
}

export default Seer
