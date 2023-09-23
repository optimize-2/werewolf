import { Component, createSignal, useContext } from "solid-js";
import Players from "./Players";
import { emit } from "../api";
import { PlayersContext } from "./Room";

const Vote: Component = () => {
    const [target, setTarget] = createSignal('')

    const players = useContext(PlayersContext)

    const [isConfirmed, setIsConfirmed] = createSignal(false)

    const voteConfirm = () => {
        setIsConfirmed(true)
        emit('voteConfirm', players.findIndex((name) => name === target()))
    }

    return (
        <div class="vote">
            <Players
                className="select-player"
                displayState={false}
                filter={([name, state]) => state === 'alive'}
                select={(t) => setTarget(t)}
            />
            <button
                onClick={voteConfirm}
                disabled={isConfirmed()}
            >
                确认
            </button>
        </div>
    )
}

export default Vote