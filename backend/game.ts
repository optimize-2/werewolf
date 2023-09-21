import { loadConfig, ConfigType } from "./config"
import { log } from "./utils"

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

export type Period = 
        | 'discuss'
        | 'vote'
        | 'werewolf'
        | 'witch'
        | 'seer'

const players: Record<string, PlayerState> = {}
const roles: Record<string, Role> = {}

export const getPlayers = () => players
export const getRoles = () => roles

let config: ConfigType
let requiredPlayers = 0

export let inGame = false

export const loadGame = () => {
    config = loadConfig()
    Object.values(config.roles).forEach(e => {
        requiredPlayers += e
    })
}

export const setState = (player: string, state: PlayerState) => {
    if (state !== 'leave') players[player] = state
    else delete players[player]
    return players
}

export const checkStart = () => {
    if (inGame) return
    const readyPlayers: Array<string> = []
    Object.entries(players).forEach(([player, state]) => {
        if (state === 'ready') {
            readyPlayers.push(player)
        }
    })
    if (readyPlayers.length === requiredPlayers) {
        return inGame = true
    }
    return false
}

export const addPlayer = (player: string) => {
    if (inGame) {
        return players[player] = 'spec'
    } else {
        return players[player] = 'unready'
    }
}