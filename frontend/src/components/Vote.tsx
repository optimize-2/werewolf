import { Component, createSignal, useContext } from 'solid-js'
import Players from './Players'
import { emit } from '../api'
import { IsConfirmedContext, PlayersContext } from './Room'

const Vote: Component = () => {
    const [target, setTarget] = createSignal<string | undefined>()
    const [isAddition, setIsAddtion] = createSignal(false)

    const players = useContext(PlayersContext)
    const [isConfirmed, setIsConfirmed] = useContext(IsConfirmedContext)!

    const voteConfirm = () => {
        if (!isConfirmed.vote && typeof target() !== 'undefined') {
            setIsConfirmed('vote', true)
            emit('voteConfirm', isAddition() ? -1 : players().findIndex((name) => name === target()))
        }
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
                        if (!isConfirmed.vote) {
                            setTarget(t)
                            setIsAddtion(isAddition)
                            return true
                        }
                        return false
                    },
                    default: {
                        nameOrID: '弃票',
                        isAdditon: true,
                    },
                }}
            />
            <button
                onClick={voteConfirm}
                disabled={isConfirmed.vote}
            >
                确认
            </button>
        </div>
    )
}

export default Vote