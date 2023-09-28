import { Component, For, Match, Show, Switch, createEffect, createSignal, useContext } from 'solid-js'
import * as api from '../api'
import { PlayerNameContext } from '../app'
import { CanSendContext, GameDataContext, PlayerIDContext, PlayerStatesContext , PlayersContext } from './Room'
import Werewolf from './Werewolf'
import Witch from './Witch'
import Seer from './Seer'
import Vote from './Vote'
import Hunter from './Hunter'

import { entries } from '@werewolf/utils'
import { isDead, isWerewolfKilled, roleInfo, stateMessage } from '../utils'
import { openAlert } from './Alert'

const Game: Component<{
    seerResults: Record<number, boolean | undefined>
    seerTarget: () => number
    setSeerTarget: (target: number) => void
    deadPlayers: api.DeadPlayers
    addDeadPlayers: (i: api.DeadPlayer) => void
    voteResults: () => Record<number, number>[]
    role?: api.Role
}> = (props) => {
    const playerName = useContext(PlayerNameContext)
    const playerStates = useContext(PlayerStatesContext)
    const players = useContext(PlayersContext)
    const playerID = useContext(PlayerIDContext)
    const gameData = useContext(GameDataContext)

    const [playerState, setPlayerState] = createSignal(playerStates()[playerName()])

    createEffect(() => {
        setPlayerState(playerStates()[playerName()])
    })

    const canSendDiscuss = useContext(CanSendContext)

    const [waitingHunter, setWaitingHunter] = createSignal<number | undefined>()

    api.on('hunterWait', (data) => {
        setWaitingHunter(data)
    })

    const [hunterTarget, setHunterTarget] = createSignal<number | undefined>()

    api.on('hunterKilled', (data) => {
        setHunterTarget(data.target)
    })

    createEffect(() => {
        if (typeof hunterTarget() !== 'undefined') {
            props.addDeadPlayers({
                round: gameData().day - 1,
                type: 'hunter',
                deadPlayers: [hunterTarget()!],
            })

            if (hunterTarget() === playerID()) {
            // alert('人生自古谁无死？不幸的，你已被击杀！')
                openAlert('人生自古谁无死？不幸的，你已被猎人击杀！')
            }

            setHunterTarget(undefined)
        }
    })

    createEffect(() => {
        if (canSendDiscuss()) {
            // alert('轮到你发言了')
            openAlert('轮到你发言了')
        }
    })

    return (
        <div class="game">
            <div class="identity">
                你{props.role ? '的身份' : ''}是: {roleInfo[props.role ?? 'spec']}
            </div>
            <div class="round">第{gameData().day}轮</div>
            <div class="game-state">
                当前: {stateMessage[gameData().state]}
            </div>

            <Show
                when={props.deadPlayers.length > 0}
            >
                <br />
                <div class="death-container">
                    <For
                        each={props.deadPlayers}
                    >
                        {
                            ({ round, type, deadPlayers}) => (
                                <div class="death-per-round">
                                    <Switch
                                        fallback={
                                            <>这可能是个 bug !</>
                                        }
                                    >
                                        <Match
                                            when={type === 'hunter' && deadPlayers.length > 0}
                                        >
                                        第{round}轮被猎人击杀的有:
                                            <For
                                                each={deadPlayers}
                                            >
                                                {
                                                    (id) => (
                                                        <div class="death">
                                                            {players()[id]}
                                                        </div>
                                                    )
                                                }
                                            </For>
                                        </Match>
                                        <Match
                                            when={type === 'night' && deadPlayers.length > 0}
                                        >
                                            第{round}晚死亡的有:
                                            <For
                                                each={deadPlayers}
                                            >
                                                {
                                                    (id) => (
                                                        <div class="death">
                                                            {players()[id]}
                                                        </div>
                                                    )
                                                }
                                            </For>
                                        </Match>
                                        <Match
                                            when={type === 'night' && deadPlayers.length === 0}
                                        >
                                        第{round}晚是个平安夜
                                        </Match>
                                        <Match
                                            when={type === 'vote' && deadPlayers.length > 0}
                                        >
                                        第{round}轮被放逐的有
                                            <For
                                                each={deadPlayers}
                                            >
                                                {
                                                    (id) => (
                                                        <div class="death">
                                                            {players()[id]}
                                                        </div>
                                                    )
                                                }
                                            </For>
                                        </Match>
                                    </Switch>
                                </div>
                            )
                        }
                    </For>
                </div>
            </Show>

            <Show
                when={props.voteResults().length > 0}
            >
                <br />

                投票结果：
                <div class="vote-results-container">
                    <For
                        each={props.voteResults()}
                    >
                        {
                            (result) => (
                                <div class="vote-result">
                                    <For
                                        each={entries(result)}
                                    >
                                        {
                                            ([source, target]) => (
                                                <div>{players()[source]}: {target === -1 ? '弃票' : players()[target]}</div>
                                            )
                                        }
                                    </For>
                                    <br />
                                </div>
                            )
                        }
                    </For>
                </div>
            </Show>

            <Show
                when={props.role === 'seer' || playerState() === 'spec'}
            >
                <br />

                <div class="seer-results">
                    <For
                        each={entries(props.seerResults)}
                    >
                        {
                            ([id, result]) => (
                                <div>
                                    {players()[id]}: {result ? '查杀' : '金水'}
                                </div>
                            )
                        }
                    </For>
                </div>
            </Show>

            <br />

            <Switch
                fallback={
                    <div
                        class="close-eyes"
                    >
                        如泥酣眠
                        {/* 请闭眼 */}
                    </div>
                }
            >
                <Match
                    when={
                        canSendDiscuss() || (
                            (
                                isWerewolfKilled(gameData().dead, gameData().werewolfKilled, playerID())
                                || (
                                    gameData().state === 'voteend'
                                    && gameData().dead![0] === playerID()
                                )
                            ) && (
                                waitingHunter() === playerID()
                            )
                        )
                    }
                >
                    <></>
                </Match>
                <Match
                    when={
                        gameData().state === 'werewolf'
                        && (
                            (
                                props.role === 'werewolf'
                                && playerState() === 'alive'
                            )
                            || playerState() === 'spec'
                        )
                    }
                >
                    <Werewolf />
                </Match>
                <Match
                    when={
                        gameData().state === 'witch'
                        && (
                            props.role === 'witch'
                            && playerState() === 'alive'
                        )
                    }
                >
                    <Witch/>
                </Match>
                <Match
                    when={
                        gameData().state === 'seer'
                        && props.role === 'seer'
                        && playerState() === 'alive'
                    }
                >
                    <Seer
                        setSeerTarget={props.setSeerTarget}
                    />
                </Match>
                <Match
                    when={gameData().state === 'vote' && props.role && playerState() === 'alive'}
                >
                    <Vote/>
                </Match>
                <Match
                    when={gameData().state === 'voteend'}
                >
                    <div class="vote-end">
                        投票结束，{players()[gameData().dead![0]]}被放逐
                    </div>
                </Match>
            </Switch>

            <Show
                when={canSendDiscuss()}
            >
                <br />

                轮到你发言了！！！
            </Show>

            <Show
                when={
                    props.role === 'hunter'
                    && isDead(gameData().dead, playerID())
                }
            >
                <br />

                <Show
                    when={
                        isWerewolfKilled(gameData().dead, gameData().werewolfKilled, playerID())
                        || (
                            gameData().state === 'voteend'
                            && gameData().dead![0] === playerID()
                        )
                    }

                    fallback={
                        <div>
                            你不能开枪/kk
                        </div>
                    }
                >
                    <Show
                        when={waitingHunter() === playerID()}
                    >
                        <Hunter
                            hasShot={() => setWaitingHunter(undefined)}
                        />
                    </Show>
                </Show>
            </Show>

            {/* <Show
                when={hunterTarget() === playerID()}
                fallback={
                    <Show
                        when={
                            (props.gameData.state === 'voteend' || props.gameData.state === 'morning')
                            && (typeof hunterTarget() !== 'undefined' && hunterTarget() !== -1)
                        }
                    >
                        <div>
                            猎人击杀了: {players()[hunterTarget()!]}
                        </div>
                    </Show>
                }
            >
                <div>
                    你被猎人击杀
                </div>
            </Show> */}
        </div>
    )
}

export default Game
