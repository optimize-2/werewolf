import { Component, For, Match, Show, Switch, createEffect, createSignal, useContext } from 'solid-js'
import * as api from '../api'
import { PlayerNameContext } from '../app'
import { CanSendContext, PlayerIDContext, PlayerStatesContext as PlayerStatesContext, PlayersContext, RoundContext } from './Room'
import Werewolf from './Werewolf'
import Witch from './Witch'
import Seer from './Seer'
import Vote from './Vote'
import { entries } from '@werewolf/utils'
import Hunter from './Hunter'
import { isDead, isWerewolfKilled } from '../utils'

const stateMessage = {
    idle: '等待开始',
    morning: '天亮了',
    werewolf: '狼人请睁眼',
    witch: '女巫请睁眼',
    seer: '预言家请睁眼',
    discuss: '等待发言',
    vote: '请投票',
    voteend: '投票结束',
}

const roleInfo = {
    villager: '平民',
    werewolf: '狼人',
    seer: '预言家',
    witch: '女巫',
    hunter: '猎人',
    spec: '旁观者',
}

const Game: Component<{
    gameData: api.GameData
    seerResults: Record<number, boolean | undefined>
    setSeerTarget: (target: number) => void
    deadPlayers: api.DeadPlayers
    role?: api.Role
}> = (props) => {
    const playerName = useContext(PlayerNameContext)
    const playerStates = useContext(PlayerStatesContext)
    const players = useContext(PlayersContext)
    const playerID = useContext(PlayerIDContext)

    const [playerState, setPlayerState] = createSignal(playerStates()[playerName()])

    createEffect(() => {
        setPlayerState(playerStates()[playerName()])
    })

    const round = useContext(RoundContext)

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
        if (hunterTarget() === playerID()) {
            alert('人生自古谁无死？不幸的，你已被击杀！')
        }
    })

    createEffect(() => {
        if (canSendDiscuss()) {
            alert('轮到你发言了')
        }
    })

    return (
        <div class="game">
            <div class="identity">
                你{props.role ? '的身份' : ''}是: {roleInfo[props.role ?? 'spec']}
            </div>
            <div class="round">第{round()}轮</div>
            <div class="game-state">
                当前: {stateMessage[props.gameData.state]}
            </div>

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

            <Show
                when={props.role === 'seer'}
            >
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
                    when={canSendDiscuss()}
                >
                    <></>
                </Match>
                <Match
                    when={props.gameData.state === 'werewolf' && props.role === 'werewolf' && playerState() === 'alive'}
                >
                    <Werewolf />
                </Match>
                <Match
                    when={props.gameData.state === 'witch' && props.role === 'witch' && playerState() === 'alive'}
                >
                    <Witch
                        witchInventory={props.gameData.witchInventory!}
                        dead={props.gameData.dead!}
                    />
                </Match>
                <Match
                    when={props.gameData.state === 'seer' && props.role === 'seer' && playerState() === 'alive'}
                >
                    <Seer
                        setSeerTarget={props.setSeerTarget}
                    />
                </Match>
                <Match
                    when={props.gameData.state === 'vote' && props.role && playerState() === 'alive'}
                >
                    <Vote/>
                </Match>
                <Match
                    when={props.gameData.state === 'voteend'}
                >
                    <div class="vote-end">
                        投票结束，{players()[props.gameData.dead![0]]}被放逐
                    </div>
                </Match>
            </Switch>

            <Show
                when={typeof props.gameData.voteResult !== 'undefined'}
            >
                投票结果：
                <div class="vote-result">
                    <For
                        each={entries(props.gameData.voteResult!)}
                    >
                        {
                            ([source, target]) => (<div>{players()[source]}: {target === -1 ? '弃票' : players()[target]}</div>)
                        }
                    </For>
                </div>
            </Show>

            <Show
                when={canSendDiscuss()}
            >
                轮到你发言了！！！
            </Show>

            <Show
                when={
                    props.role === 'hunter'
                    && isDead(props.gameData.dead, playerID())
                }
            >
                <Show
                    when={
                        isWerewolfKilled(props.gameData.dead, props.gameData.werewolfKilled, playerID())
                        || (
                            props.gameData.state === 'voteend'
                            && props.gameData.dead![0] === playerID()
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

            <Show
                when={hunterTarget() === playerID()}
                fallback={
                    <div>
                        {typeof hunterTarget() !== 'undefined' && hunterTarget() !== -1 ? `猎人击杀了: ${players()[hunterTarget()!]}` : ''}
                    </div>
                }
            >
                <div>
                    你被猎人击杀
                </div>
            </Show>
        </div>
    )
}

export default Game
