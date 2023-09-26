import { sendDiscuss, sendHunterWait, sendHunterKilled, updateState, updateWitchState, sendGameEnd, sendWerewolfResult, sendSpecInfo } from '.'
import { loadConfig, ConfigType } from './config'
import { log } from './utils'

import _ from 'lodash'

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
        | 'all'
        | 'side'

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
const playerStates: Record<string, PlayerState> = {}
const roles: Record<string, Role> = {}

export const getPlayers = () => players
export const getPlayerStates = () => playerStates
export const getRoles = () => roles

export const canSpec = (player: string) => playerStates[player] === 'spec' && players.includes(player)

export const getLoginResultPlayers = (player: string) => canSpec(player) ? players : undefined
export const getLoginResultRoles = (player: string) => canSpec(player) ? roles : undefined
export const getLoginResultDay = (player: string) => canSpec(player) ? day : undefined

let discussWaiting: number

let config: ConfigType
let requiredPlayers = 0

export let gameState: GameState = 'idle'

export const getGameState = () => gameState

export const loadGame = () => {
    config = loadConfig()
    requiredPlayers = Object.values(config.roles).reduce((sum, e) => sum + e)
}

export const setState = (player: string, state: PlayerState) => {
    if (state !== 'leave') {playerStates[player] = state}
    else {delete playerStates[player]}
    return playerStates
}

export const checkStart = () => {
    log('check start')
    if (gameState !== 'idle') {return false}
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
        Object.entries(playerStates).forEach(([player, state]) => {
            if (state === 'unready' && player) {
                playerStates[player] = 'spec'
            }
        })
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
let hunterKilled: Array<number> = []

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
        log('assign roles: ' + roleArray.toString() + ' ' + players.toString())
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

    startDiscuss: (dead?: Array<number>) => {
        console.log('start discuss')
        gameState = 'discuss'
        discussWaiting = 0
        while (discussWaiting < requiredPlayers && playerStates[players[discussWaiting]] !== 'alive') {discussWaiting++}
        updateState({
            state: gameState,
            dead,
            seerResult: false,
            waiting: discussWaiting,
            day
        })
        players.forEach(e => {
            if (playerStates[e] === 'spec') {
                sendSpecInfo(e)
            }
        })
    },

    startWerewolf: (vote?: Record<number, number>, dead?: Array<number>) => {
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
            dead,
            seerResult: false,
            waiting: -1,
            voteResult: vote,
            day
        })
    },

    startVote: (revote?: Record<number, number>) => {
        console.log('start vote')
        gameState = 'vote'
        vote = {}
        updateState({
            state: gameState,
            dead: [],
            seerResult: false,
            waiting: -1,
            voteResult: revote,
            day
        })
    },

    startSeer: () => {
        if (!config.roles.seer) {
            game.startWitch()
            return
        }
        console.log('start seer')
        witchSaved = false
        const seers = getPlayersByRole('seer')
        if (seers.length) {
            seerSelect = {}
            seers.forEach(e => {
                seerSelect[e] = -1
            })
        } else {
            setTimeout(() => { game.startWitch() }, getRandom())
        }
        gameState = 'seer'
        updateState({
            state: gameState,
            day
        })
    },

    startWitch: () => {
        if (!config.roles.witch) {
            game.startMorning()
            return
        }
        console.log('start witch')
        gameState = 'witch'
        updateWitchState(day)
        const witch = getPlayersByRole('witch')
        witchSaveUsed = {}
        witchPoisonUsed = {}
        witchPoisionPlayers = []
        witchSkipped = {}
        witchSaved = false
        if (!witch.length) {
            setTimeout(() => { game.startMorning() }, getRandom())
        }
    },

    startMorning: () => {
        console.log('start morning')
        day++
        console.log('morning', werewolfKill, witchPoisionPlayers)
        dead = werewolfKill.concat(Array.from(new Set(witchPoisionPlayers)))
        pendingHunter = []
        dead.forEach(e => {
            playerStates[players[e]] = 'spec'
            if (werewolfKill.includes(e) && canHunt(roles[players[e]])) {
                pendingHunter.push(e)
            }
            if (!werewolfKill.includes(e)) {
                sendSpecInfo(players[e])
            }
        })
        gameState = 'morning'
        updateState({
            state: gameState,
            dead,
            werewolfKilled: werewolfKill,
            day
        })
        if (game.checkEnd()) {return}
        if (pendingHunter.length) {
            sendHunterWait(pendingHunter[0])
        }
        console.log('startMorning', pendingHunter)
        if (day === 2 && dead.length) {
            discussWaiting = _.min(dead)!
            updateState({
                state: gameState,
                waiting: discussWaiting,
                dead,
                werewolfKilled: werewolfKill,
                day
            })
            // hunter.forEach(e => [
            //     hunterKilled[e] = -1
            // ])
        } else {
            setTimeout(() => { game.startDiscuss() }, 2000)
        }
    },

    endVote: () => {
        const voteCount: Record<number, number> = Object.values(vote).reduce((count: Record<number, number>, num) => {
            if (num !== -1) {
                count[num] = (count[num] || 0) + 1
            }
            return count
        }, {})

        const maxVotes = Math.max(...Object.values(voteCount))
        const maxVotePerson = _.toInteger(Object.keys(voteCount).find((key) => voteCount[_.toInteger(key)] === maxVotes))

        // const isTie = Object.values(voteCount).some(count => count !== maxVotes);
        const isTie = !Object.entries(voteCount).every(([k, v]) => v < maxVotes || k === maxVotePerson.toString())

        console.log('vote', vote, voteCount, maxVotePerson, isTie, revote)
        const invalid = (isTie || !Object.values(voteCount).length)
        if (invalid) {
            if (!revote) {
                gameState = 'vote'
                revote = true
                game.startVote(vote)
            } else {
                game.startWerewolf(vote)
            }
        } else {
            gameState = 'voteend'
            playerStates[players[maxVotePerson]] = 'spec'
            if (game.checkEnd()) {return}
            discussWaiting = maxVotePerson
            updateState({
                state: gameState,
                dead: [ maxVotePerson ],
                voteResult: vote,
                waiting: maxVotePerson,
                day
            })
            if (canHunt(roles[players[maxVotePerson]])) {
                pendingHunter.push(maxVotePerson)
                sendHunterWait(pendingHunter[0])
            } else {
                
            }
        }
    },

    handleDiscuss: (player: string, message: string) => {
        if (gameState === 'discuss') {
            if (player === players[discussWaiting]) {
                sendDiscuss(player, message)
                if (config.pass.includes(message)) {
                    discussWaiting++
                    while (discussWaiting < requiredPlayers && playerStates[players[discussWaiting]] !== 'alive') {discussWaiting++}
                    if (discussWaiting === requiredPlayers) {
                        game.startVote()
                    } else {
                        updateState({
                            state: 'discuss',
                            waiting: discussWaiting,
                            day
                        })
                    }
                }
            }
        } else if (gameState === 'morning') {
            if (player === players[discussWaiting]) {
                sendDiscuss(player, message)
                if (config.pass.includes(message)) {
                    discussWaiting++
                    while (discussWaiting < requiredPlayers && !dead.includes(discussWaiting)) {discussWaiting++}
                    if (discussWaiting === requiredPlayers && !pendingHunter.length) {
                        game.startDiscuss()
                    } else {
                        updateState({
                            state: 'morning',
                            dead,
                            werewolfKilled: werewolfKill,
                            waiting: discussWaiting,
                            day
                        })
                    }
                }
            }
            // console.log('sendDiscuss2', day, werewolfConfirm, getId(player), witchSaved)
            // if (day === 2 && werewolfKill.includes(getId(player)) && !witchSaved) {
            //     console.log('sendDiscuss3', player, message)
            //     sendDiscuss(player, message)
            //     if (config.pass.includes(message) && players[pendingHunter[0]] !== player) {
            //         if (!pendingHunter.length) {
            //             game.startDiscuss()
            //         }
            //     }
            // }
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
        if (playerId === -1 || vote[playerId]) {return}
        if (gameState !== 'vote') {return}
        if (playerStates[player] !== 'alive') {return}
        vote[playerId] = checkId(id) ? id : -1
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
        if (playerId === -1) {return}
        if (roles[player] !== 'werewolf') {return}
        if (playerStates[player] !== 'alive') {return}
        if (gameState !== 'werewolf') {return}
        werewolfSelect[playerId] = checkId(id) ? id : -1
        sendWerewolfResult()
    },

    handleWerewolfConfirm: (player: string) => {
        const playerId = getId(player)
        console.log(playerId === -1, roles[player] !== 'werewolf', playerStates[player] !== 'alive', gameState !== 'werewolf')
        if (playerId === -1) {return}
        if (roles[player] !== 'werewolf') {return}
        if (playerStates[player] !== 'alive') {return}
        if (gameState !== 'werewolf') {return}
        const sel = werewolfSelect[playerId]
        if (checkId(sel) || sel === -1) {
            werewolfConfirm[playerId] = true
            sendWerewolfResult()
            if (getPlayersByRole('werewolf').every(e => werewolfConfirm[e] && sel === werewolfSelect[e])) {
                werewolfKill = sel === -1 ? [] : [ sel ]
                // if (game.checkEnd()) return
                game.startSeer()
            }
        }
    },

    handleWerewolfCancel: (player: string) => {
        const playerId = getId(player)
        if (playerId === -1) {return}
        if (roles[player] !== 'werewolf') {return}
        if (playerStates[player] !== 'alive') {return}
        if (gameState !== 'werewolf') {return}
        werewolfConfirm[playerId] = false
        sendWerewolfResult()
    },

    handleSeer: (player: string, id: number) => {
        if (!checkId(id)) {return}
        console.log('handle seer', player, id, getId(player), seerSelect, seerSelect[getId(player)])
        if (gameState !== 'seer') {return}
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
        if (gameState !== 'witch') {return}
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
        if (gameState !== 'witch') {return}
        if (roles[player] === 'witch' && playerStates[player] === 'alive') {
            const playerId = getId(player)
            if (witchInventories[playerId].poison > 0 && !witchPoisonUsed[playerId] && !witchSkipped[playerId]) {
                witchPoisionPlayers.push(id)
                werewolfKill = werewolfKill.filter(e => e !== id)
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
        if (gameState !== 'witch') {return}
        if (roles[player] === 'witch' && playerStates[player] === 'alive') {
            const playerId = getId(player)
            witchSkipped[playerId] = true
            if (getPlayersByRole('witch').every(e => witchSkipped[e])) {
                game.startMorning()
            }
        }
    },

    handleHunterKill: (player: string, id: number) => {
        console.log('handleHunterKill', pendingHunter)
        if (gameState !== 'voteend' && gameState !== 'morning') {return}
        if (!canHunt(roles[player])) {return}
        const playerId = getId(player)
        if (pendingHunter.length && pendingHunter[0] === playerId) {
            // sendSpecInfo(player)
            pendingHunter.shift()
            hunterKilled.push(id)
            if (checkId(id)) {
                playerStates[players[id]] = 'spec'
                if (canHunt(roles[players[id]])) {pendingHunter.push(id)}
                sendHunterKilled(playerId, id)
                if (game.checkEnd()) {return}
            } else {
                sendHunterKilled(playerId, -1)
            }
            if (pendingHunter.length) {
                if (game.checkEnd()) {return}
                sendHunterWait(pendingHunter[0])
            } else {
                if (gameState === 'voteend' && discussWaiting === requiredPlayers) {
                    game.startWerewolf(undefined, hunterKilled)
                } else if (gameState === 'morning' && discussWaiting === requiredPlayers) {
                    game.startDiscuss(hunterKilled)
                }
                hunterKilled = []
            }
        }
    },

    checkEnd: () => {
        // console.log(config.target, players.every(e => !isGod(roles[e]) || !survive(e)), players.every(e => !isVillager(roles[e]) || !survive(e)), players.every(e => !isWerewolf(roles[e]) || playerStates[e] !== 'alive'))
        // players.forEach(e => {
        //     console.log(e, roles[e], isVillager(roles[e]), survive(e))
        // })
        const gods = players.every(e => !isGod(roles[e]) || !survive(e))
        const villagers = players.every(e => !isVillager(roles[e]) || !survive(e))
        if (config.target === 'gods' && gods) {
            game.endGame(2)
            return true
        }
        if (config.target === 'villagers' && villagers) {
            game.endGame(2)
            return true
        }
        if (config.target === 'side' && (gods || villagers)) {
            game.endGame(2)
            return true
        }
        if (config.target === 'all' && (gods && villagers)) {
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
            state: gameState,
            day
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

export const getConfig = () => config

const getRandom = () => 3000 + Math.random() * 5000

export const hasSave = (player: string) => {
    const id = getId(player)
    if (id === -1) {return false}
    return roles[player] === 'witch' && witchInventories[id].save > 0
}