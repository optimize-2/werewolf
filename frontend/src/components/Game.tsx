import { Component, For, Match, Show, Switch, createEffect, createSignal, useContext } from "solid-js"
import * as api from "../api"
import Players from "./Players"
import { PlayerNameContext } from "../app"
import { CanSendContext, PlayerStatesContext as PlayerStatesContext, PlayersContext, RoundContext } from "./Room"
import Werewolf from "./Werewolf"
import Witch from "./Witch"
import Seer from "./Seer"
import Vote from "./Vote"

const stateMessage = {
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
    role?: api.Role
}> = (props) => {
    const playerName = useContext(PlayerNameContext)

    const playerStates = useContext(PlayerStatesContext)
    const players = useContext(PlayersContext)

    const [playerState, setPlayerState] = createSignal(playerStates[playerName()])

    createEffect(() => {
        setPlayerState(playerStates[playerName()])
    })

    const round = useContext(RoundContext)

    const canSendDiscuss = useContext(CanSendContext)

    return (
        <div class="game">
            <div class="identity">
                你{props.role ? '的身份' : ''}是: {roleInfo[props.role]}
            </div>
            <div class="round">第{round()}轮</div>
            <div class="game-state">
                当前: {stateMessage[props.gameData.state]}
            </div>

            <Show
                when={canSendDiscuss()}
            >
                轮到你发言了！！！
            </Show>

            <Show
                when={props.role === 'seer'}
            >
                <div class="seer-results">
                    <For
                        each={Object.entries(props.seerResults)}
                    >
                        {
                            ([id, result]) => (
                                <div>
                                    {players[id]} : {result ? '查杀' : '金水'}
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
                    when={props.gameData.state === 'morning'}
                >
                    <div class="death-container">
                        <Show
                            when={props.gameData.dead.length > 0}
                            fallback={
                                <>昨晚是个平安夜</>
                            }
                        >
                            上一轮死亡的有:
                            <For
                                each={props.gameData.dead}
                            >
                                {
                                    (id) => (
                                        <div class="death">
                                            {players[id]}
                                        </div>
                                    )
                                }
                            </For>
                        </Show>
                    </div>
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
                        witchInventory={props.gameData.witchInventory}
                        dead={props.gameData.dead}
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
                    <Vote />
                </Match>
                <Match
                    when={props.gameData.state === 'voteend'}
                >
                    <div class="vote-end">
                        投票结束，{players[props.gameData.dead[0]]}被放逐
                    </div>
                </Match>
            </Switch>
        </div>
    )
}

export default Game
