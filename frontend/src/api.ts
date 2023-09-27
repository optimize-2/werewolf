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
    discussPlayers?: Array<string>
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
    username: string
    state: GameState
    config: ConfigType
    day: number
    players?: string[]
    roles?: Record<string, Role>
}

export type Message = {
    message: string
}

const key = await crypto.subtle.importKey(
    'raw',
    Buffer.from('0241540e4d413fb0062de00aea0d918fe6a1820e782c5cd4340266be3ff940f0', 'hex'),
    { name: 'AES-CBC', },
    false,
    ['encrypt', 'decrypt']
)

const iv = Buffer.from('05eec64cc1716184787d03a1a46ef952', 'hex')

const decoder = new TextDecoder('utf-8', { ignoreBOM: true })
const decodeHex = (hexString: string) => new Uint8Array(hexString.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)))

const decrypt = async (data: string): Promise<string> => decoder.decode(await crypto.subtle.decrypt(
    {
        name: 'AES-CBC',
        iv,
        tagLength: 256,
    },
    key,
    decodeHex(data),
))

const encrypt = (data: string) => crypto.subtle.encrypt(
    {
        name: 'AES-CBC',
        iv,
        tagLength: 256,
    },
    key,
    Buffer.from(data),
)

export function on(event: 'login', fn: (data: string) => void): void
export function on(event: 'loginResult', fn: (data: LoginResult) => void): void
export function on(event: 'updateUsers', fn: (data: PlayerStatesType) => void): void
export function on(event: 'readyResult', fn: (data: Record<string, boolean>) => void): void
export function on(event: 'gameStart', fn: (data: { role: Role, players: Array<string> }) => void): void
export function on(event: 'gameEnd', fn: (data: { team: number, roles: Record<string, Role> }) => void): void

export function on(
    event: 'gameState',
    fn: (data: GameData) => void
): void

export function on(event: 'receiveMessage', fn: (data: { username: string } & Message) => void): void
export function on(event: 'disconnect', fn: () => void): void

export function on(
    event: 'werewolfResult',
    fn: (data: { select: Record<number, number>, confirm: Record<number, boolean> }) => void
): void

export function on(event: 'receiveDiscuss', fn: (data: { plsyer: string } & Message) => void): void

export function on(event: 'hunterWait', fn: (data: number) => void): void
export function on(event: 'hunterKilled', fn: (data: { player: number, target: number }) => void): void

export function on(event: 'specInfo', fn: (data: Record<string, Role>) => void): void

export function on<T>(event: string, fn: (data: T) => void) {
    let work: (data: T) => void

    if (event === 'receiveDiscuss') {
        work = ((data: { player: string } & Message) => {
            decrypt(data.message).then((msg) => {
                fn({
                    player: data.player,
                    message: msg,
                } as T)
            })
        }) as (data: T) => void
    } else if (event === 'receiveMessage') {
        work = ((data: { username: string } & Message) => {
            decrypt(data.message).then((msg) => {
                fn({
                    username: data.username,
                    message: msg,
                } as T)
            })
        }) as (data: T) => void
    } else {
        work = fn
    }

    io.on(event, (data) => {
        console.log(`on(${event}):`, data)
        work(data)
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

    const work = (data?: T) => io.emit(event, data)

    if (event === 'sendDiscuss') {
        const dat = data as string
        encrypt(dat).then((msg) => {
            work(
                Array.from(new Uint8Array(msg))
                    .map(byte => byte.toString(16).padStart(2, '0'))
                    .join('') as T
            )
        })
    } else if (event === 'sendMessage') {
        const dat = data as string
        encrypt(dat).then((msg) => {
            work(
                Array.from(new Uint8Array(msg))
                    .map(byte => byte.toString(16).padStart(2, '0'))
                    .join('') as T
            )
        })
    } else {
        work(data)
    }
}
