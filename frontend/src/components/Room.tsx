import { createSignal, type Component, Switch, Match, createContext, useContext, createMemo } from 'solid-js'
import * as api from '../api'
import Ready from './Ready'
import ChatBox from './ChatBox'
import Game from './Game'
import Players from './Players'
import { PlayerNameContext } from '../app'

export const PlayerStatesContext = createContext<() => api.PlayerStatesType>(() => ({}))
export const PlayersContext = createContext<() => string[]>(() => [])
export const PlayerIDContext = createContext<() => number>(() => -1)
export const RoundContext = createContext<() => number>(() => 0)
export const CanSendContext = createContext<() => boolean>(() => true)

const Room: Component<{
    gameStateNow: api.GameState
}> = (props) => {
    const playerName = useContext(PlayerNameContext)
    const [playerStates, setPlayerStates] = createSignal<api.PlayerStatesType>({})
    const [players, setPlayers] = createSignal<string[]>([])

    const playerID = createMemo(() => players().findIndex((name) => name === playerName()))

    api.on('updateUsers', (data) => {
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

    const [gameData, setGameData] = createSignal<api.GameData>({
        state: props.gameStateNow,
    })
    const [seerTarget, setSeerTarget] = createSignal(-1)
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

    const canSendDiscuss = createMemo(() => {
        const data = gameData()
        return !!(
            data
            && (
                (
                    data.state === 'discuss'
                    && data.waiting
                    && data.waiting === playerID()
                )
                || (
                    round() === 1
                    && data.state === 'morning'
                    && data.werewolfKilled
                    && data.werewolfKilled.length > 0
                    && data.werewolfKilled.findIndex((id) => id === playerID()) !== -1
                )
                || (
                    data.state === 'voteend'
                    && data.dead
                    && data.dead.findIndex((id) => id === playerID()) !== -1
                )
            )
        )
    })

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
                        when={!isGameStart() && playerStates()[playerName()] !== 'spec'}
                    >
                        <Ready
                            setPlayerStates={(players) => setPlayerStates(players)}
                        />
                    </Match>

                    <Match
                        when={isGameStart()}
                    >
                        <PlayersContext.Provider
                            value={players}
                        >
                            <PlayerIDContext.Provider
                                value={playerID}
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
                            </PlayerIDContext.Provider>
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
