import { io } from 'socket.io-client'

const socket = io('ws://127.0.0.1:4000')

export async function login(username: string) {
    socket.emit('login', username)
}

export type PlayerState =
    | 'unready'
    | 'ready'
    | 'alive'
    | 'spec'

export function on(event: 'updateUsers', fn: (data: Record<string, PlayerState>) => void) {
    socket.on(event, fn)
}

export function emit(event: 'testUpdateUsers', data: boolean) {
    socket.emit(event, data)
}
