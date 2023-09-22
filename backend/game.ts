import { sendDiscuss, updateState } from "."
import { loadConfig, ConfigType } from "./config"
import { log } from "./utils"

import _, { toInteger } from 'lodash'

export type PlayerState = 
        | 'unready'
        | 'ready'
        | 'alive'
        | 'spec'
        | 'leave'

export type Role =
        | 'villager'
        | 'werewolf'
        | 'seer'
        | 'witch'
        | 'hunter'

export type Target =
        | 'villagers'
        | 'gods'

export type GameState = 
        | 'idle'
        | 'morning'
        | 'discuss'
        | 'vote'
        | 'voteend'
        | 'werewolf'
        | 'witch'
        | 'seer'

const players: Array<string> = []
const playerStates: Record<string, PlayerState> = {}
const roles: Record<string, Role> = {}

export const getPlayers = () => players
export const getPlayerStates = () => playerStates
export const getRoles = () => roles

let discussWaiting: number

let config: ConfigType
let requiredPlayers = 0

export let gameState: GameState = 'idle'

export const getGameState = () => gameState

export const loadGame = () => {
    config = loadConfig()
    Object.values(config.roles).forEach(e => {
        requiredPlayers += e
    })
}

export const setState = (player: string, state: PlayerState) => {
    if (state !== 'leave') playerStates[player] = state
    else delete playerStates[player]
    return playerStates
}

export const checkStart = () => {
    log("check start")
    if (gameState !== 'idle') return false
    const readyPlayers: Array<string> = []
    Object.entries(playerStates).forEach(([player, state]) => {
        if (state === 'ready') {
            readyPlayers.push(player)
        }
    })
    log(readyPlayers.toString())
    if (readyPlayers.length === requiredPlayers) {
        game.assignRoles()
        game.initialize()
        game.startWerewolf()
        Object.assign(players, readyPlayers)
        return true
    }
    return false
}

export const addPlayer = (player: string) => {
    if (gameState === 'idle') {
        return playerStates[player] = 'unready'
    } else {
        return playerStates[player] = 'spec'
    }
}

const vote: Record<number, number> = {}

const werewolfSelect: Record<number, number> = {}
const werewolfConfirm: Record<number, boolean> = {}
const werewolfKill: Array<number> = []

const seerSelect: Record<number, number> = {}

const witchSaveSelect: Record<number, number> = {}
const witchPoisonSelect: Record<number, number> = {}

interface WitchInventory {
    save: number,
    poison: number,
}

const witchInventories: Record<number, WitchInventory> = {}

const getPlayersByRole = (role: Role) => {
    const result: Array<number> = []
    Object.entries(roles).forEach(([k, v]) => {
        if (v === role && playerStates[k] === 'alive') {
            result.push(getId(k))
        }
    })
    return result
}

export const getId = (name: string) => {
    players.forEach((e, i) => {
        if (e === name) return i;
    })
    return -1;
}

const checkId = (id: number) => _.isInteger(id) && 0 <= id && id < requiredPlayers && playerStates[players[id]] === 'alive'

export const game = {
    assignRoles: () => {
        const roleArray: Array<Role> = []
        Object.entries(config.roles).forEach(([role, count]) => {
            console.log([role, count])
            roleArray.push(...(Array<Role>(count).fill(role as Role)))
        })
        _.shuffle(players)
        _.shuffle(roleArray)
        roleArray.forEach((e, i) => {
            roles[players[i]] = e
        })
        log("assign roles: " + roleArray.toString() + " " + players.toString())
    },

    initialize: () => {
        Object.assign(witchInventories, {})
        players.forEach(e => {
            playerStates[e] = 'alive'
        })
        getPlayersByRole('witch').forEach(e => {
            witchInventories[e] = { save: 1, poison: 1 }
        })
    },

    startDiscuss: () => {
        gameState = 'discuss'
        updateState({
            state: gameState,
            dead: [],
            seerResult: false,
            waiting: 0,
        })
    },

    startWerewolf: () => {
        gameState = 'werewolf'
        Object.assign(werewolfSelect, {})
        Object.assign(werewolfConfirm, {})
        Object.assign(werewolfKill, [])
        getPlayersByRole('werewolf').forEach(e => {
            werewolfSelect[e] = -1
            werewolfConfirm[e] = false
        })
        updateState({
            state: gameState,
            dead: [],
            seerResult: false,
            waiting: -1,
        })
    },

    startVote: (revote?: Array<number>) => {
        gameState = 'vote'
        Object.assign(vote, {})
        updateState({
            state: gameState,
            dead: [],
            seerResult: false,
            waiting: -1,
            voteResult: revote,
        })
    },

    startSeer: (dead: Array<number>) => {
        Object.assign(werewolfKill, dead)
        const seers = getPlayersByRole('seer')
        if (seers.length) {
            
        } else {
            setTimeout(() => { game.startWitch(dead) }, 20000);
        }
    },

    startWitch: (dead: Array<number>) => {
        const witch = getPlayersByRole('witch')
        if (witch.length) {

        } else {
            setTimeout(() => { game.startMorning(dead) }, 20000);
        }
    },

    startMorning: (dead: Array<number>) => {

    },

    endvote: () => {
        const voteResult = Array(requiredPlayers).fill(0)
        const voteCount: Record<number, number> = {}
        let player = -1
        let same = false;
        Object.entries(vote).forEach(([k, v]) => {
            voteResult[toInteger(k)] = v
            if (v != -1) {
                voteCount[v] += 1
                if (player === -1) {
                    player = v
                    same = false
                } else if (voteCount[player] < voteCount[v]) {
                    player = v
                    same = false
                } else if (voteCount[player] === voteCount[v]) {
                    same = true
                }
            }
        })
        if (same) {
            gameState = 'vote'
            game.startVote(voteResult)
        } else {
            gameState = 'voteend'
            updateState({
                state: gameState,
                dead: [ player ]
            })
        }
    },

    handleDiscuss: (player: string, message: string) => {
        if (player === players[discussWaiting]) {
            sendDiscuss(player, message)
            if (config.pass.includes(message)) {
                discussWaiting++
                while (discussWaiting < requiredPlayers && playerStates[players[discussWaiting]] !== 'alive') discussWaiting++
                if (discussWaiting === requiredPlayers) {
                    discussWaiting = -1;
                    if (gameState === 'morning') {
                        game.startDiscuss()
                    } else if (gameState === 'voteend') {
                        game.startWerewolf()
                    } else if (gameState === 'discuss') {
                        game.startVote()
                    }
                }
            }
        }
    },

    handleVote: (player: string, id: number) => {
        const playerId = getId(player)
        if (playerId === -1 || vote[playerId]) return
        if (!checkId(id)) {
            id = -1;
        }
        vote[playerId] = id;
        if (Object.keys(vote).length === requiredPlayers) {
            game.endvote()
        }
    },

    handleWerewolfSelect: (player: string, id: number) => {
        const playerId = getId(player)
        if (playerId === -1) return
        if (roles[player] !== 'werewolf') return
        if (playerStates[player] !== 'alive') return
        werewolfSelect[playerId] = id
    },

    handleWerewolfConfirm: (player: string) => {
        const playerId = getId(player)
        if (playerId === -1) return
        if (roles[player] !== 'werewolf') return
        if (playerStates[player] !== 'alive') return
        const sel = werewolfSelect[playerId]
        if (checkId(sel))
        werewolfConfirm[playerId] = true
        if (getPlayersByRole('werewolf').every(e => werewolfConfirm[e])) {
            // kill sel
            game.startSeer([ sel ])
        }
    }
}