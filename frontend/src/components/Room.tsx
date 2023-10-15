import { createSignal, type Component, createContext, useContext, createMemo, For, createEffect, Show } from 'solid-js'
import * as api from '../api'
import Ready from './Ready'
import ChatBox from './ChatBox'
import Game from './Game'
import Players from './Players'
import { PlayerNameContext } from '../app'
import { SetStoreFunction, createStore } from 'solid-js/store'
import './Room.css'

import { isDead, roleInfo } from '../utils'
import { entries } from '@werewolf/utils'
import { openAlert } from './Alert'

export const PlayerStatesContext = createContext<() => api.PlayerStatesType>(() => ({}))
export const PlayersContext = createContext<() => string[]>(() => [])
export const PlayerIDContext = createContext<() => number>(() => -1)
export const CanSendContext = createContext<() => boolean>(() => true)
export const GameDataContext = createContext<() => api.GameData>(() => ({
    state: 'idle',
    day: 0,
} as api.GameData))

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
    loginResult: () => api.LoginResult | undefined
}> = (props) => {
    // contexts
    const playerName = useContext(PlayerNameContext)

    // signals
    const [playerStates, setPlayerStates] = createSignal<api.PlayerStatesType>({})
    const [players, setPlayers] = createSignal<string[]>([])

    const [isGameStart, setIsGameStart] = createSignal(false)
    const [isGameEnd, setIsGameEnd] = createSignal(false)

    const [role, setRole] = createSignal<api.Role | undefined>(undefined)

    const [canSendDiscuss, setCanSendDiscuss] = createSignal(false)

    const [deadPlayers, setDeadPlayers] = createStore<api.DeadPlayers>([])

    const [gameData, setGameData] = createSignal<api.GameData>({
        state: props.loginResult()?.state ?? 'idle',
        day: props.loginResult()?.day ?? 1,
    })

    const [roles, setRoles] = createSignal<Record<string, api.Role> | undefined>()

    const [seerTarget, setSeerTarget] = createSignal(-1)
    const [seerResults, setSeerResults] = createSignal<Record<number, boolean | undefined>>([])

    // stores
    const [isConfirmed, setIsConfirmed] = createStore({
        werewolf: false,
        witch: false,
        seer: false,
        hunter: false,
        vote: false,
    })

    // memos
    const playerID = createMemo(() => {
        const id = players().findIndex((name) => name === playerName())
        return id === -1 ? -2 : id
    })

    const canShowRoles = createMemo(() => {
        return (
            (
                isGameEnd()
                || typeof role() === 'undefined'
                || role() === 'spec'
                || playerStates()[playerName()] === 'spec'
            )
            && !canSendDiscuss()
        )
    })

    // effects
    createEffect(() => {
        setIsGameStart(props.loginResult()?.state !== 'idle')
        setGameData({
            state: props.loginResult()?.state ?? 'idle',
            day: props.loginResult()?.day ?? 0,
        })
        setRoles(props.loginResult()?.roles)
        setPlayers(props.loginResult()?.players ?? [])
    })

    api.on('updateUsers', (data) => {
        setPlayerStates(data)
    })

    const sendDiscuss = (msg: string) => {
        console.log(props.loginResult()?.config.pass)
        if (props.loginResult()?.config.pass.includes(msg)) {
            setCanSendDiscuss(false)
        }
        api.emit('sendDiscuss', msg)
    }

    const sendMessage = (msg: string) => {
        api.emit('sendMessage', msg)
    }

    api.on('gameStart', (data) => {
        // console.log('gameStart')
        setIsGameStart(true)
        setIsGameEnd(false)
        setRole(data.role ?? 'spec')
        setPlayers(data.players)

        setDeadPlayers([])
        setVoteResults([])
        setSeerResults([])

        if (import.meta.env.MODE === 'development') {
            sendMessage(`我是${roleInfo[data.role]}`)
        }
    })

    api.on('specInfo', (data) => {
        setRoles(data)
    })

    const addDeadPlayers = (newItem: api.DeadPlayer) => {
        setDeadPlayers([...deadPlayers, newItem])
    }

    const deadAlert = (type: 'killed' | 'vote') => {
        openAlert(`人生自古谁无死？不幸的，你已被${type === 'vote' ? '放逐' : '击杀'}！`)
    }

    const [voteResults, setVoteResults] = createSignal<Record<number, number>[]>([])
    const [discussPlayers, setDiscussPlayers] = createSignal<string[] | undefined>()

    api.on('gameState', (data) => {
        if (data.state === 'werewolf') {
            setIsConfirmed('werewolf', false)
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
        } else if (data.state === 'guard') {
            setIsConfirmed('guard', false)
        } else if (data.state === 'morning') {
            setIsConfirmed('hunter', false)
            if (gameData().state !== 'morning') {
                if (isDead(data.dead, playerID())) {
                    deadAlert('killed')
                }
                addDeadPlayers({
                    round: data.day - 1,
                    type: 'night',
                    deadPlayers: data.dead ?? [],
                })
            }
        } else if (data.state === 'discuss') {
            setDiscussPlayers(data.discussPlayers)
        } else if (data.state === 'vote') {
            setIsConfirmed('vote', false)
        } else if (data.state === 'voteend') {
            if (isDead(data.dead, playerID())) {
                deadAlert('vote')
            }

            addDeadPlayers({
                round: data.day - 1,
                type: 'vote',
                deadPlayers: data.dead ?? [],
            })
        }

        setCanSendDiscuss(
            typeof data.waiting !== 'undefined'
            && data.waiting !== -1
            && (
                data.state !== 'discuss'
                    ? data.waiting === playerID()
                    : data.waiting === discussPlayers()?.indexOf(playerName())
            )
        )

        if (typeof data.voteResult !== 'undefined') {
            setVoteResults([...voteResults(), data.voteResult])
            console.log(voteResults())
        }

        setGameData(data)
    })

    api.on('gameEnd', (data) => {
        setRoles(data.roles)
        setIsGameEnd(true)
        setIsGameStart(false)
        if (data.team === 0) {
            openAlert('游戏异常退出')
        } else if (data.team === 1) {
            openAlert('好人获胜')
        } else {
            openAlert('狼人获胜')
        }
    })

    return (
        <div class="root">
            <PlayerStatesContext.Provider
                value={playerStates}
            >
                <div
                    class="panel"
                >
                    <Players
                        className="players"
                        filter={() => true}
                        displayState={true}
                    />

                    <br />

                    <div
                        class="config"
                    >
                        <div
                            class="pass-msg"
                        >
                            发言结束关键词：
                            <For
                                each={props.loginResult()?.config.pass ?? []}
                            >
                                {
                                    (msg) => (<div>{msg}</div>)
                                }
                            </For>
                        </div>

                        <br />

                        <div
                            class="game-config"
                        >
                            <For
                                each={entries(props.loginResult()?.config?.roles ?? {
                                    hunter: 0,
                                    seer: 0,
                                    spec: 0,
                                    villager: 0,
                                    werewolf: 0,
                                    witch: 0,
                                }).filter(([r]) => r !== 'spec')}
                            >
                                {
                                    ([r, num]) => (
                                        <div>
                                            {roleInfo[r]}: {num}
                                        </div>
                                    )
                                }
                            </For>
                        </div>

                        <br />

                        <div
                            class="target"
                        >
                            游戏目标：
                            {targetMsg[props.loginResult()?.config.target ?? 'side']}
                        </div>

                        <Show
                            when={gameData().state === 'discuss' && typeof discussPlayers() !== 'undefined'}
                        >
                            <br />

                            <div class="turns">
                                发言顺序：
                                <For
                                    each={discussPlayers()}
                                >
                                    {
                                        (name) => (
                                            <div>
                                                {name} {
                                                    canShowRoles() ? roleInfo[((roles() ?? {})[name]) ?? 'spec'] : ''
                                                }
                                            </div>
                                        )
                                    }
                                </For>
                            </div>
                        </Show>

                        <Show
                            when={canShowRoles()}
                        >
                            <br />

                            <div class="show-roles">
                                身份公示
                                <For
                                    each={players()}
                                >
                                    {
                                        (name) => (
                                            <div>
                                                {name} {
                                                    roleInfo[((roles() ?? {})[name]) ?? 'spec']
                                                }
                                            </div>
                                        )
                                    }
                                </For>
                            </div>
                        </Show>
                    </div>
                </div>

                <Show
                    when={!isGameStart()}
                >
                    <Ready
                        setPlayerStates={(players) => setPlayerStates(players)}
                    />
                </Show>

                <div class="panel">
                    <GameDataContext.Provider
                        value={gameData}
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
                                    <CanSendContext.Provider
                                        value={canSendDiscuss}
                                    >
                                        <Game
                                            seerResults={seerResults()}
                                            seerTarget={seerTarget}
                                            setSeerTarget={setSeerTarget}
                                            role={role()}
                                            addDeadPlayers={addDeadPlayers}
                                            deadPlayers={deadPlayers}
                                            voteResults={voteResults}
                                        />
                                    </CanSendContext.Provider>
                                </PlayerIDContext.Provider>
                            </PlayersContext.Provider>
                        </IsConfirmedContext.Provider>
                    </GameDataContext.Provider>
                </div>
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
                    sendMessage={(msg) => sendDiscuss(msg())}
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
                    sendMessage={(msg) => sendMessage(msg())}
                />
            </CanSendContext.Provider>
        </div >
    )
}

export default Room
