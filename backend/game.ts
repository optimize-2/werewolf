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

export type GameState = 
        | 'idle'
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

export let game: GameState = 'idle'

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
    if (game !== 'idle') return
    const readyPlayers: Array<string> = []
    Object.entries(players).forEach(([player, state]) => {
        if (state === 'ready') {
            readyPlayers.push(player)
        }
    })
    if (readyPlayers.length === requiredPlayers) {
        game = 'werewolf'
        return game
    }
    return 'idle'
}

export const addPlayer = (player: string) => {
    if (game === 'idle') {
        return players[player] = 'unready'
    } else {
        return players[player] = 'spec'
    }
}

export const getGameState = () => game