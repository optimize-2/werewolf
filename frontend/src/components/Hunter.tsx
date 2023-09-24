import { Component, createSignal, useContext } from 'solid-js'
import Players from './Players'
import { emit } from '../api'
import { PlayersContext } from './Room'
import { PlayerNameContext } from '../app'

const Hunter: Component<{
    hasShot: () => void,
}> = (props) => {
    const players = useContext(PlayersContext)
    const playerName = useContext(PlayerNameContext)

    const [target, setTarget] = createSignal('')
    const [isCancel, setIsCancel] = createSignal(false)

    const shoot = () => {
        props.hasShot()
        emit('sendHunter', isCancel() ? -1 : players().findIndex((name) => name === target()))
    }

    return (
        <div class="hunter">
            选择一个人开枪
            <Players
                className="select-player"
                filter={([name, state]) => state === 'alive' && name !== playerName()}
                addition={{ '不开枪': '不开枪' }}
                select={{
                    invoke: (t, isCancel) => {
                        setTarget(t)
                        setIsCancel(isCancel)
                    },
                    default: {
                        nameOrID: '不开枪',
                        isAdditon: false,
                    },
                }}
            />
            <button
                type="button"
                onClick={shoot}
            >
                确认
            </button>
        </div>
    )
}

export default Hunter