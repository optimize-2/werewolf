import { Component, createSignal, useContext } from 'solid-js'
import Players from './Players'
import { emit } from '../api'
import { PlayersContext } from './Room'

const Vote: Component<{
    voteConfirmed: boolean
    setVoteConfirmed: (v: boolean) => void
}> = (props) => {
    const [target, setTarget] = createSignal('')
    const [isAddition, setIsAddtion] = createSignal(false)

    const players = useContext(PlayersContext)

    const voteConfirm = () => {
        props.setVoteConfirmed(true)
        emit('voteConfirm', isAddition() ? -1 : players().findIndex((name) => name === target()))
    }

    return (
        <div class="vote">
            <Players
                className="select-player"
                displayState={false}
                filter={([, state]) => state === 'alive'}
                addition={{'弃票': '弃票'}}
                select={{
                    invoke: (t, isAddition) => {
                        setTarget(t)
                        setIsAddtion(isAddition)
                    },
                    default: { nameOrID: '弃票', isAdditon: true },
                }}
            />
            <button
                onClick={voteConfirm}
                disabled={props.voteConfirmed}
            >
                确认
            </button>
        </div>
    )
}

export default Vote