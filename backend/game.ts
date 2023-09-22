import { sendDiscuss, updateState, updateWitchState } from "."
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

const witchSaveUsed: Record<number, boolean> = {}
const witchPoisonUsed: Record<number, boolean> = {}
const witchSkipped: Record<number, boolean> = {}

const witchPoisionPlayers: Array<number> = []

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
        if (e === name) return i
    })
    return -1
}

export const checkId = (id: number) => _.isInteger(id) && 0 <= id && id < requiredPlayers && playerStates[players[id]] === 'alive'

export const getSeerResult = (id: number) => {
    return roles[players[seerSelect[id]]]
}

let witchSaved = false

let day = 1

const dead: Array<number> = []

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
        day = 1
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

    startSeer: () => {
        witchSaved = false
        const seers = getPlayersByRole('seer')
        if (seers.length) {
            Object.assign(seerSelect, {})
            seers.forEach(e => {
                seerSelect[e] = -1
            })
        } else {
            setTimeout(() => { game.startWitch() }, 20000)
        }
        updateState({
            state: 'seer'
        })
    },

    startWitch: () => {
        updateWitchState()
        const witch = getPlayersByRole('witch')
        Object.assign(witchSaveUsed, {})
        Object.assign(witchPoisonUsed, {})
        Object.assign(witchPoisionPlayers, [])
        Object.assign(witchSkipped, {})
        witchSaved = false
        if (witch.length) {

        } else {
            setTimeout(() => { game.startMorning() }, 20000)
        }
    },

    startMorning: () => {
        day++
        Object.assign(dead, werewolfKill.concat(Array.from(new Set(witchPoisionPlayers))))
        updateState({
            state: 'morning',
            dead
        })
        const hunter = getPlayersByRole('hunter')
        if (hunter.length) {

        } else {
            setTimeout(() => { game.startVote() }, 20000)
        }
    },

    endVote: () => {
        const voteResult = Array(requiredPlayers).fill(0)
        const voteCount: Record<number, number> = {}
        let player = -1
        let same = false
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
        if (gameState === 'discuss') {
            if (player === players[discussWaiting]) {
                sendDiscuss(player, message)
                if (config.pass.includes(message)) {
                    discussWaiting++
                    while (discussWaiting < requiredPlayers && playerStates[players[discussWaiting]] !== 'alive') discussWaiting++
                    if (discussWaiting === requiredPlayers) {
                        game.startVote()
                    }
                }
            }
        } else if (gameState === 'morning') {
            if (day === 2 && dead.includes(getId(player))) {
                sendDiscuss(player, message)
            }
        } else if (gameState === 'voteend') {
            if (player === players[discussWaiting]) {
                sendDiscuss(player, message)
                if (config.pass.includes(message)) {
                    game.startWerewolf()
                }
            }
        }
    },

    handleVote: (player: string, id: number) => {
        const playerId = getId(player)
        if (playerId === -1 || vote[playerId]) return
        if (gameState !== 'vote') return
        if (!checkId(id)) {
            id = -1
        }
        vote[playerId] = id
        if (Object.keys(vote).length === requiredPlayers) {
            game.endVote()
        }
    },

    handleWerewolfSelect: (player: string, id: number) => {
        const playerId = getId(player)
        if (playerId === -1) return
        if (roles[player] !== 'werewolf') return
        if (playerStates[player] !== 'alive') return
        if (gameState !== 'werewolf') return
        werewolfSelect[playerId] = id
    },

    handleWerewolfConfirm: (player: string) => {
        const playerId = getId(player)
        if (playerId === -1) return
        if (roles[player] !== 'werewolf') return
        if (playerStates[player] !== 'alive') return
        if (gameState !== 'werewolf') return
        const sel = werewolfSelect[playerId]
        if (checkId(sel))
        werewolfConfirm[playerId] = true
        if (getPlayersByRole('werewolf').every(e => werewolfConfirm[e])) {
            Object.assign(werewolfConfirm, [ sel ])
            game.startSeer()
        }
    },

    handleSeer: (player: string, id: number) => {
        if (!checkId(id)) return
        if (gameState !== 'seer') return
        if (roles[player] === 'seer' && playerStates[player] === 'alive') {
            if (seerSelect[getId(player)] === -1) {
                seerSelect[getId(player)] = id
                if (Object.entries(seerSelect).every(
                    ([k, v], _1, _2, name: string = players[_.toInteger(k)]) =>
                        v !== -1 || roles[name] !== 'seer' || playerStates[name] !== 'alive'
                )) {
                    game.startWitch()
                }
            }
        }
    },

    handleWitchSave: (player: string) => {
        if (gameState !== 'witch')
        if (roles[player] === 'witch' && playerStates[player] === 'alive') {
            const playerId = getId(player)
            if (witchInventories[playerId].save > 0 && !witchSaveUsed[playerId]) {
                witchSaved = true
                witchSaveUsed[playerId] = true
                witchInventories[playerId].save -= 1
            }
        }
    },

    handleWitchPoison: (player: string, id: number) => {
        if (gameState !== 'witch')
        if (roles[player] === 'witch' && playerStates[player] === 'alive') {
            const playerId = getId(player)
            if (witchInventories[playerId].save > 0 && !witchPoisonUsed[playerId]) {
                witchPoisionPlayers.push(id)
                witchPoisonUsed[playerId] = true
                witchInventories[playerId].poison -= 1
            }
        }
    },

    handleWitchSkip: (player: string) => {
        if (gameState !== 'witch')
        if (roles[player] === 'witch' && playerStates[player] === 'alive') {
            const playerId = getId(player)
            witchSkipped[playerId] = true
            if (getPlayersByRole('witch').every(e => witchSkipped[e])) {
                game.startMorning()
            }
        }
    },

    handleHunterKill: (player: string) => {
        if (gameState !== 'voteend' && gameState !== 'morning') return
        
    }
}