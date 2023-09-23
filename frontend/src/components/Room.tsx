import { createSignal, type Component, createEffect, Show, For, Switch, Match, createContext, useContext, createMemo } from 'solid-js'
import { createStore } from 'solid-js/store'
import * as api from '../api'
import Ready from './Ready'
import ChatBox from './ChatBox'
import Game from './Game'
import Players from './Players'
import { PlayerNameContext } from '../app'

export const PlayerStatesContext = createContext<api.PlayerStatesType>({})
export const PlayersContext = createContext<string[]>([])
export const RoundContext = createContext<() => number>(() => 0)
export const CanSendContext = createContext<() => boolean>(() => true)

const Room: Component<{
    gameStateNow: api.GameState
}> = (props) => {
    const playerName = useContext(PlayerNameContext)
    const [playerStates, setPlayerStates] = createStore<api.PlayerStatesType>({})
    const [players, setPlayers] = createStore<string[]>([])

    api.on('updateUsers', (data) => {
        console.log('updateUsers', data)
        setPlayerStates(data)
    })

    const [isGameStart, setIsGameStart] = createSignal(false)

    const [role, setRole] = createSignal<api.Role | undefined>(undefined)

    api.on('gameStart', (data) => {
        // console.log('gameStart')
        setIsGameStart(true)
        setRole(data.role)
        setPlayers(data.players)
    })

    const [gameData, setGameData] = createSignal<api.GameData>()
    const [seerTarget, setSeerTarget] = createSignal<number>()
    const [seerResults, setSeerResults] = createSignal<Record<number, boolean | undefined>>([])

    const [round, setRound] = createSignal<number>(0)

    api.on('gameState', (data) => {
        console.log('receive event gameState')
        if (data.state === 'witch' && role() === 'seer') {
            const results = {
                ...seerResults(),
            }
            results[seerTarget()] = data.seerResult
            setSeerResults(results)
        } else if (data.state === 'werewolf') {
            setRound(round() + 1)
        }
        setGameData(data)
    })

    const canSendDiscuss = createMemo(() => (
        gameData()
        && (
            (
                gameData().state === 'discuss'
                && players[gameData().waiting] === playerName()
            )
            || (
                round() === 1
                && gameData().state === 'morning'
                && gameData().werewolfKilled
                && gameData().werewolfKilled.length > 0
                && gameData().werewolfKilled.findIndex((id) => players[id] === playerName()) !== -1
            )
            || (
                gameData().state === 'voteend'
                && gameData().dead
                && gameData().dead.findIndex((id) => players[id] === playerName()) !== -1
            )
        )
    ))

    return (
        <div>
            <PlayerStatesContext.Provider
                value={playerStates}
            >
                <Players
                    className="players"
                    filter={() => true}
                    displayState={true}
                />

                <Switch>
                    <Match
                        when={!isGameStart() && playerStates[playerName()] !== 'spec'}
                    >
                        <Ready
                            playerStates={playerStates}
                            setPlayerStates={(players) => setPlayerStates(players)}
                        />
                    </Match>

                    <Match
                        when={isGameStart()}
                    >
                        <PlayersContext.Provider
                            value={players}
                        >
                            <RoundContext.Provider
                                value={round}
                            >
                                <CanSendContext.Provider
                                    value={canSendDiscuss}
                                >
                                    <Game
                                        gameData={gameData()}
                                        seerResults={seerResults()}
                                        setSeerTarget={setSeerTarget}
                                        role={role()}
                                    />
                                </CanSendContext.Provider>
                            </RoundContext.Provider>
                        </PlayersContext.Provider>
                    </Match>
                </Switch>
            </PlayerStatesContext.Provider>

            <CanSendContext.Provider
                value={canSendDiscuss}
            >
                <ChatBox
                    type="discuss"
                    recvMessage={
                        (fn) => {
                            api.on('receiveDiscuss', (data) => fn({
                                username: data.player,
                                message: data.message,
                            }))
                        }
                    }
                    sendMessage={(fn) => {
                        api.emit('sendDiscuss', fn())
                    }}
                />
            </CanSendContext.Provider>

            <CanSendContext.Provider
                value={() => true}
            >
                <ChatBox
                    type="chat"
                    recvMessage={
                        (fn) => {
                            api.on('receiveMessage', (data) => { fn(data) })
                        }
                    }
                    sendMessage={
                        (fn) => {
                            api.emit('sendMessage', fn())
                        }
                    }
                />
            </CanSendContext.Provider>
        </div >
    )
}

export default Room
