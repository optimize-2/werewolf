import { sendDiscuss, sendHunterWait, sendHunterKilled, updateState, updateWitchState, sendGameEnd, sendWerewolfResult } from "."
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

let players: Array<string> = []
let playerStates: Record<string, PlayerState> = {}
let roles: Record<string, Role> = {}

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
        if (state === 'ready' && player) {
            readyPlayers.push(player)
        }
    })
    log(readyPlayers.toString())
    if (readyPlayers.length === requiredPlayers) {
        players = readyPlayers
        game.assignRoles()
        game.initialize()
        game.startWerewolf()
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

let vote: Record<number, number> = {}

let werewolfSelect: Record<number, number> = {}
let werewolfConfirm: Record<number, boolean> = {}
let werewolfKill: Array<number> = []

let seerSelect: Record<number, number> = {}

let witchSaveUsed: Record<number, boolean> = {}
let witchPoisonUsed: Record<number, boolean> = {}
let witchSkipped: Record<number, boolean> = {}

let hunterKilled: Record<number, number> = {}

let witchPoisionPlayers: Array<number> = []

export const getWerewolfKill = () => werewolfKill

export interface WitchInventory {
    save: number,
    poison: number,
}

let witchInventories: Record<number, WitchInventory> = {}

const getPlayersByRole = (role: Role) => {
    const result: Array<number> = []
    Object.entries(roles).forEach(([k, v]) => {
        if (v === role && playerStates[k] === 'alive') {
            result.push(getId(k))
        }
    })
    return result
}

export const getPlayersByFilter = (filter: (role: Role) => boolean) => {
    const result: Array<number> = []
    Object.entries(roles).forEach(([k, v]) => {
        if (filter(v) && playerStates[k] === 'alive') {
            result.push(getId(k))
        }
    })
    return result
}

interface WerewolfResultType {
    select: Record<number, number>
    confirm: Record<number, boolean>
}

export const getWerewolfResult = (): WerewolfResultType => ({
    select: werewolfSelect,
    confirm: werewolfConfirm
})

export const getId = (name: string) => players.indexOf(name)

export const checkId = (id: number) => _.isInteger(id) && 0 <= id && id < requiredPlayers && playerStates[players[id]] === 'alive'

export const getSeerResult = (id: number) => {
    return roles[players[seerSelect[id]]]
}

let witchSaved = false

let day = 1

let revote = false

let dead: Array<number> = []

let pendingHunter: Array<number> = []

export const game = {
    assignRoles: () => {
        let roleArray: Array<Role> = []
        Object.entries(config.roles).forEach(([role, count]) => {
            console.log([role, count])
            roleArray.push(...(Array<Role>(count).fill(role as Role)))
        })
        players = _.shuffle(players)
        roleArray = _.shuffle(roleArray)
        roleArray.forEach((e, i) => {
            roles[players[i]] = e
        })
        log("assign roles: " + roleArray.toString() + " " + players.toString())
        console.log('roles: ', roles)
    },

    initialize: () => {
        console.log('initialize')
        day = 1
        revote = false
        witchInventories = {}
        players.forEach(e => {
            playerStates[e] = 'alive'
        })
        getPlayersByRole('witch').forEach(e => {
            witchInventories[e] = { save: 1, poison: 1 }
        })
    },

    startDiscuss: () => {
        console.log('start discuss')
        gameState = 'discuss'
        discussWaiting = 0
        while (discussWaiting < requiredPlayers && playerStates[players[discussWaiting]] !== 'alive') discussWaiting++
        updateState({
            state: gameState,
            dead: [],
            seerResult: false,
            waiting: discussWaiting,
        })
    },

    startWerewolf: () => {
        console.log('start werewolf')
        revote = false
        gameState = 'werewolf'
        werewolfSelect = {}
        werewolfConfirm = {}
        werewolfKill = []
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
        console.log('start vote')
        gameState = 'vote'
        vote = {}
        updateState({
            state: gameState,
            dead: [],
            seerResult: false,
            waiting: -1,
            voteResult: revote,
        })
    },

    startSeer: () => {
        console.log('start seer')
        witchSaved = false
        const seers = getPlayersByRole('seer')
        if (seers.length) {
            seerSelect = {}
            seers.forEach(e => {
                seerSelect[e] = -1
            })
        } else {
            setTimeout(() => { game.startWitch() }, 20000)
        }
        gameState = 'seer'
        updateState({
            state: gameState
        })
    },

    startWitch: () => {
        console.log('start witch')
        gameState = 'witch'
        updateWitchState()
        const witch = getPlayersByRole('witch')
        witchSaveUsed = {}
        witchPoisonUsed = {}
        witchPoisionPlayers = []
        witchSkipped = {}
        witchSaved = false
        if (witch.length) {

        } else {
            setTimeout(() => { game.startMorning() }, 20000)
        }
    },

    startMorning: () => {
        console.log('start morning')
        day++
        console.log('morning', werewolfKill, witchPoisionPlayers)
        dead = werewolfKill.concat(Array.from(new Set(witchPoisionPlayers)))
        const hunter = getPlayersByFilter(canHunt)
        pendingHunter = []
        dead.forEach(e => {
            if (!hunter.includes(e)) {
                playerStates[players[e]] = 'spec'
            } else {
                pendingHunter.push(e)
            }
        })
        gameState = 'morning'
        updateState({
            state: gameState,
            dead
        })
        if (game.checkEnd()) return
        if (pendingHunter.length) {
            sendHunterWait(pendingHunter[0])
        }
        if ((day === 2 && dead.length) || pendingHunter.length) {
            // hunter.forEach(e => [
            //     hunterKilled[e] = -1
            // ])
        } else {
            setTimeout(() => { game.startDiscuss() }, 2000)
        }
    },

    endVote: () => {
        const voteResult = Array(requiredPlayers).fill(0)
        const voteCount: Record<number, number> = Object.values(vote).reduce((count: Record<number, number>, num) => {
            if (num !== -1) {
                count[num] = (count[num] || 0) + 1
            }
            return count;
        }, {})

        const maxVotes = Math.max(...Object.values(voteCount))
        const maxVotePerson = _.toInteger(Object.keys(voteCount).find((key) => voteCount[_.toInteger(key)] === maxVotes))
        
        // const isTie = Object.values(voteCount).some(count => count !== maxVotes);
        const isTie = !Object.entries(voteCount).every(([k, v]) => v < maxVotes || k === maxVotePerson.toString());

        console.log('vote', vote, maxVotePerson, isTie, revote)
        if (isTie && !revote) {
            gameState = 'vote'
            revote = true
            game.startVote(voteResult)
        } else {
            gameState = 'voteend'
            if (canHunt(roles[players[maxVotePerson]])) {
                pendingHunter.push(maxVotePerson)
            } else {
                playerStates[players[maxVotePerson]] = 'spec'
                if (game.checkEnd()) return
            }
            updateState({
                state: gameState,
                dead: [ maxVotePerson ],
                voteResult
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
                    } else {
                        updateState({
                            state: 'discuss',
                            waiting: discussWaiting
                        })
                    }
                }
            }
        } else if (gameState === 'morning') {
            console.log('sendDiscuss2', day, werewolfConfirm, getId(player), witchSaved)
            if (day === 2 && werewolfKill.includes(getId(player)) && !witchSaved) {
                console.log('sendDiscuss3', player, message)
                sendDiscuss(player, message)
                if (config.pass.includes(message)) {
                    if (!pendingHunter.length) {
                        game.startDiscuss()
                    }
                }
            }
            // if (!pendingHunter.length) {
            // }
        } else if (gameState === 'voteend') {
            if (player === players[discussWaiting]) {
                sendDiscuss(player, message)
                if (config.pass.includes(message) && !pendingHunter.length) {
                    game.startWerewolf()
                }
            }
        }
    },

    handleVote: (player: string, id: number) => {
        const playerId = getId(player)
        if (playerId === -1 || vote[playerId]) return
        if (gameState !== 'vote') return
        if (playerStates[player] !== 'alive') return
        if (!checkId(id)) {
            id = -1
        }
        vote[playerId] = id
        console.log('vote', playerId, vote, players.filter(e => playerStates[e] === 'alive'), players.filter(e => playerStates[e] === 'alive').every(e => Object.keys(vote).includes(e)))
        if (players.filter(e => playerStates[e] === 'alive').every(e => Object.keys(vote).includes(getId(e).toString()))) {
            game.endVote()
        }
        // if (Object.keys(vote).length === requiredPlayers) {
        //     game.endVote()
        // }
    },

    handleWerewolfSelect: (player: string, id: number) => {
        const playerId = getId(player)
        if (playerId === -1) return
        if (roles[player] !== 'werewolf') return
        if (playerStates[player] !== 'alive') return
        if (gameState !== 'werewolf') return
        werewolfSelect[playerId] = id
        sendWerewolfResult()
    },

    handleWerewolfConfirm: (player: string) => {
        const playerId = getId(player)
        console.log(playerId === -1, roles[player] !== 'werewolf', playerStates[player] !== 'alive', gameState !== 'werewolf')
        if (playerId === -1) return
        if (roles[player] !== 'werewolf') return
        if (playerStates[player] !== 'alive') return
        if (gameState !== 'werewolf') return
        const sel = werewolfSelect[playerId]
        sendWerewolfResult()
        if (checkId(sel)) {
            werewolfConfirm[playerId] = true
            if (getPlayersByRole('werewolf').every(e => werewolfConfirm[e])) {
                werewolfKill = [ sel ]
                // if (game.checkEnd()) return
                game.startSeer()
            }
        }
    },

    handleWerewolfCancel: (player: string) => {
        const playerId = getId(player)
        if (playerId === -1) return
        if (roles[player] !== 'werewolf') return
        if (playerStates[player] !== 'alive') return
        if (gameState !== 'werewolf') return
        werewolfConfirm[playerId] = false
        sendWerewolfResult()
    },

    handleSeer: (player: string, id: number) => {
        if (!checkId(id)) return
        console.log('handle seer', player, id, getId(player), seerSelect, seerSelect[getId(player)])
        if (gameState !== 'seer') return
        console.log('seeeeeeeer', roles[player], playerStates[player])
        if (roles[player] === 'seer' && playerStates[player] === 'alive') {
            if (seerSelect[getId(player)] === -1) {
                seerSelect[getId(player)] = id
                console.log(seerSelect)
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
        if (gameState !== 'witch') return
        if (roles[player] === 'witch' && playerStates[player] === 'alive') {
            const playerId = getId(player)
            if (witchInventories[playerId].save > 0 && !witchSaveUsed[playerId] && (day === 1 || !werewolfKill.includes(playerId)) && !witchSkipped[playerId]) {
                witchSaved = true
                werewolfKill = []
                witchSaveUsed[playerId] = true
                witchInventories[playerId].save -= 1
                witchSkipped[playerId] = true
                if (getPlayersByRole('witch').every(e => witchSkipped[e])) {
                    game.startMorning()
                }
            }
        }
    },

    handleWitchPoison: (player: string, id: number) => {
        if (gameState !== 'witch') return
        if (roles[player] === 'witch' && playerStates[player] === 'alive') {
            const playerId = getId(player)
            if (witchInventories[playerId].poison > 0 && !witchPoisonUsed[playerId] && !witchSkipped[playerId]) {
                witchPoisionPlayers.push(id)
                witchPoisonUsed[playerId] = true
                witchInventories[playerId].poison -= 1
                witchSkipped[playerId] = true
                if (getPlayersByRole('witch').every(e => witchSkipped[e])) {
                    game.startMorning()
                }
            }
        }
    },

    handleWitchSkip: (player: string) => {
        if (gameState !== 'witch') return
        if (roles[player] === 'witch' && playerStates[player] === 'alive') {
            const playerId = getId(player)
            witchSkipped[playerId] = true
            if (getPlayersByRole('witch').every(e => witchSkipped[e])) {
                game.startMorning()
            }
        }
    },

    handleHunterKill: (player: string, id: number) => {
        if (gameState !== 'voteend' && gameState !== 'morning') return
        if (!canHunt(roles[player])) return
        const playerId = getId(player)
        if (pendingHunter.length && pendingHunter[0] === playerId) {
            pendingHunter.shift()
            playerStates[player] = 'spec'
            if (canHunt(roles[players[id]])) pendingHunter.push(id)
            if (pendingHunter.length) {
                sendHunterKilled(playerId, id)
                if (game.checkEnd()) return
                sendHunterWait(pendingHunter[0])
            } else {
                // if (gameState === 'voteend') {
                //     game.startWerewolf()
                // }
            }
        }
        // if (checkId(id)) {
        //     const playerId = getId(player)
        //     if (hunterKilled[playerId] === -1) {
        //         hunterKilled[playerId] = id
        //     }
        // }

    },

    checkEnd: () => {
        // console.log(config.target, players.every(e => !isGod(roles[e]) || !survive(e)), players.every(e => !isVillager(roles[e]) || !survive(e)), players.every(e => !isWerewolf(roles[e]) || playerStates[e] !== 'alive'))
        // players.forEach(e => {
        //     console.log(e, roles[e], isVillager(roles[e]), survive(e))
        // })
        if (config.target === 'gods' && players.every(e => !isGod(roles[e]) || !survive(e))) {
            game.endGame(2)
            return true
        }
        if (config.target === 'villagers' && players.every(e => !isVillager(roles[e]) || !survive(e))) {
            game.endGame(2)
            return true
        }
        if (players.every(e => !isWerewolf(roles[e]) || !survive(e))) {
            game.endGame(1)
            return true
        }
        return false
    },

    endGame: (team: number) => {
        sendGameEnd(team)
        Object.keys(playerStates).forEach(e => [
            playerStates[e] = 'unready'
        ])
        gameState = 'idle'
        updateState({
            state: gameState
        })
    },

    handleLeave: (player: string) => {
        const state = playerStates[player]
        delete playerStates[player]
        if (state === 'alive') {
            game.endGame(0)
            return true
        }
        return false
    }
}

const survive = (e: string, id = getId(e)) => playerStates[e] === 'alive' && !werewolfKill.includes(id) && !pendingHunter.includes(id)

export const isGod = (e: Role) => e === 'hunter' || e === 'seer' || e === 'witch'
export const isVillager = (e: Role) => e === 'villager'
export const isWerewolf = (e: Role) => e === 'werewolf'
export const canHunt = (e: Role) => e === 'hunter'

export const getWitchInventory = (player: string) => witchInventories[getId(player)]