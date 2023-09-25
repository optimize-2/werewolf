import { createSignal, type Component, Switch, Match, createContext, useContext, createMemo, createEffect, For } from 'solid-js'
import * as api from '../api'
import Ready from './Ready'
import ChatBox from './ChatBox'
import Game from './Game'
import Players from './Players'
import { PlayerNameContext } from '../app'
import { SetStoreFunction, createStore } from 'solid-js/store'

export const PlayerStatesContext = createContext<() => api.PlayerStatesType>(() => ({}))
export const PlayersContext = createContext<() => string[]>(() => [])
export const PlayerIDContext = createContext<() => number>(() => -1)
export const RoundContext = createContext<() => number>(() => 0)
export const CanSendContext = createContext<() => boolean>(() => true)

type IsConfirmedType = {
    werewolf: boolean
    witch: boolean
    seer: boolean
    hunter: boolean
    vote: boolean
}

export const IsConfirmedContext = createContext<[IsConfirmedType, SetStoreFunction<IsConfirmedType>]>()

const targetMsg = {
    villagers: '屠民',
    gods: '屠神',
    all: '屠城',
    side: '屠边',
}

const Room: Component<{
    gameConfig: api.ConfigType
    gameStateNow: api.GameState
}> = (props) => {
    const playerName = useContext(PlayerNameContext)

    const [isConfirmed, setIsConfirmed] = createStore({
        werewolf: false,
        witch: false,
        seer: false,
        hunter: false,
        vote: false,
    })

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

    const [deadPlayers, setDeadPlayers] = createStore<api.DeadPlayers>([])

    const addDeadPlayers = (newItem: api.DeadPlayer) => {
        setDeadPlayers([...deadPlayers, newItem])
    }

    api.on('gameState', (data) => {
        if (data.state === 'werewolf') {
            setIsConfirmed('werewolf', false)

            if (typeof data.dead !== 'undefined' && data.dead.length > 0) {
                addDeadPlayers({
                    round: round(),
                    type: 'hunter',
                    deadPlayers: data.dead,
                })
            }

            setRound(round() + 1)
        } else if (data.state === 'witch') {
            setIsConfirmed('witch', false)

            if (role() === 'seer') {
                const results = {
                    ...seerResults(),
                }
                results[seerTarget()] = data.seerResult
                setSeerResults(results)
            }
        } else if (data.state === 'seer') {
            setIsConfirmed('seer', false)
        } else if (data.state === 'morning') {
            setIsConfirmed('hunter', false)
            addDeadPlayers({
                round: round(),
                type: 'night',
                deadPlayers: data.dead ?? [],
            })
        } else if (data.state === 'vote') {
            setIsConfirmed('vote', false)
        } else if (data.state === 'voteend') {
            addDeadPlayers({
                round: round(),
                type: 'vote',
                deadPlayers: data.dead ?? [],
            })
        }

        if (data.state === 'vote') {
            setIsConfirmed('vote', false)
        }
        setGameData(data)
    })

    createEffect(() => {
        const dead = gameData().dead
        if (typeof dead !== 'undefined' && dead.findIndex((id) => id === playerID()) !== -1) {
            alert('人生自古谁无死？不幸的，你已被击杀！')
        }
    })

    const canSendDiscuss = createMemo(() => {
        const data = gameData()
        return !!(
            data
            && (
                (
                    data.state === 'discuss'
                    && data.waiting === playerID()
                )
                || (
                    round() === 1
                    && data.state === 'morning'
                    && typeof data.werewolfKilled !== 'undefined'
                    && data.werewolfKilled.length > 0
                    && data.werewolfKilled.findIndex((id) => id === playerID()) !== -1
                )
                || (
                    data.state === 'voteend'
                    && typeof data.dead !== 'undefined'
                    && data.dead.findIndex((id) => id === playerID()) !== -1
                )
            )
        )
    })

    const [gameEnd, setGameEnd] = createSignal(-1)

    api.on('gameEnd', (data) => {
        setGameEnd(data)
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

                <div
                    class="config"
                >
                    <div
                        class="pass-msg"
                    >
                        发言结束关键词：
                        <For
                            each={props.gameConfig.pass}
                        >
                            {
                                (msg) => (<div>{msg}</div>)
                            }
                        </For>
                    </div>
                    <div
                        class="target"
                    >
                        游戏目标：
                        {targetMsg[props.gameConfig.target]}
                    </div>
                    <div class="发言顺序">
                        {players().toString()}
                    </div>
                </div>

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
                        <IsConfirmedContext.Provider
                            value={[isConfirmed, setIsConfirmed]}
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
                                                deadPlayers={deadPlayers}
                                            />
                                        </CanSendContext.Provider>
                                    </RoundContext.Provider>
                                </PlayerIDContext.Provider>
                            </PlayersContext.Provider>
                        </IsConfirmedContext.Provider>
                    </Match>
                </Switch>
            </PlayerStatesContext.Provider>

            <div
                class="game-end"
            >
                <Switch>
                    <Match
                        when={gameEnd() === 0}
                    >
                        游戏异常退出
                    </Match>
                    <Match
                        when={gameEnd() === 1}
                    >
                        好人获胜！
                    </Match>
                    <Match
                        when={gameEnd() === 2}
                    >
                        狼人获胜！
                    </Match>
                </Switch>
            </div>

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
