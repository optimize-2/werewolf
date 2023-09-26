import { io as socketIO } from 'socket.io-client'

const io = socketIO()

export type PlayerState =
    | 'unready'
    | 'ready'
    | 'alive'
    | 'spec'

export type PlayerStatesType = Record<string, PlayerState>

export type GameState =
    | 'idle'
    | 'morning'
    | 'discuss'
    | 'vote'
    | 'voteend'
    | 'werewolf'
    | 'witch'
    | 'seer'

export type Role =
    | 'villager'
    | 'werewolf'
    | 'seer'
    | 'witch'
    | 'hunter'
    | 'spec'

export type WitchInventory = {
    save: number,
    poison: number,
}

export type GameData = {
    state: GameState
    day: number
    dead?: Array<number>
    seerResult?: boolean
    waiting?: number
    voteResult?: Record<number, number>
    witchInventory?: WitchInventory
    werewolfKilled?: Array<number>
}

export type DeadPlayer = {
    round: number,
    type: 'hunter' | 'vote' | 'night',
    deadPlayers: number[],
}
export type DeadPlayers = DeadPlayer[]

export type Target =
    | 'villagers'
    | 'gods'
    | 'all'
    | 'side'

export type ConfigType = {
    roles: Record<Role, number>
    target: Target
    pass: Array<string>
}

export type LoginResult = {
    state: GameState
    config: ConfigType
    day: number
    players?: string[]
    roles?: Record<string, Role>
}

export function on(event: 'login', fn: (data: string) => void): void
export function on(event: 'loginResult', fn: (data: LoginResult) => void): void
export function on(event: 'updateUsers', fn: (data: PlayerStatesType) => void): void
export function on(event: 'readyResult', fn: (data: Record<string, boolean>) => void): void
export function on(event: 'gameStart', fn: (data: { role: Role, players: Array<string> }) => void): void
export function on(event: 'gameEnd', fn: (data: number) => void): void

export function on(
    event: 'gameState',
    fn: (data: GameData) => void
): void

export function on(event: 'receiveMessage', fn: (data: { username: string, message: string }) => void): void
export function on(event: 'disconnect', fn: () => void): void

export function on(
    event: 'werewolfResult',
    fn: (data: { select: Record<number, number>, confirm: Record<number, boolean> }) => void
): void

export function on(event: 'receiveDiscuss', fn: (data: { player: string, message: string }) => void): void

export function on(event: 'hunterWait', fn: (data: number) => void): void
export function on(event: 'hunterKilled', fn: (data: { player: number, target: number }) => void): void

export function on(event: 'specInfo', fn: (data: Record<string, Role>) => void): void

export function on<T>(event: string, fn: (data: T) => void) {
    io.on(event, (data) => {
        console.log(`on(${event}):`, data)
        fn(data)
    })
}

export function emit(event: 'login', data: string): void
export function emit(event: 'ready'): void
export function emit(event: 'cancelReady'): void

export function emit(event: 'sendMessage', data: string): void

export function emit(event: 'disconnect'): void

export function emit(event: 'sendDiscuss', data: string): void

export function emit(event: 'werewolfSelect', data: number): void
export function emit(event: 'werewolfCancel'): void
export function emit(event: 'werewolfConfirm'): void

export function emit(event: 'witchSave'): void
export function emit(event: 'witchPoison', data: number): void
export function emit(event: 'witchSkip'): void

export function emit(event: 'seerConfirm', data: number): void

export function emit(event: 'voteConfirm', data: number): void

export function emit(event: 'sendHunter', data: number): void

export function emit<T>(event: string, data?: T) {
    console.log(`emit(${event}):`, data)
    io.emit(event, data)
}
