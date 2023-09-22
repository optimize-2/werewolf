import http from 'http'
import { readFile } from 'fs'
import { Server } from 'socket.io'
import { log } from './utils'
import {
    GameState,
    PlayerState,
    Role,
    addPlayer,
    checkId,
    checkStart,
    getGameState,
    getId,
    getPlayerStates,
    getPlayers,
    getRoles,
    getSeerResult,
    loadGame,
    setState
} from './game'
import path from 'path'

const users: Record<string, string> = {}
const socketId: Record<string, string> = {}
const room = 'hzgang06'

const server = http.createServer((req, res) => {
    const url = req.url!

    if (url === '/') {
        readFile('index.html', (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' })
                res.end('Internal Server Error')
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' })
                res.end(data)
            }
        })
    } else if (url.startsWith('/assets')) {
        readFile(path.join('.', url), (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' })
                res.end('Internal Server Error')
            } else {
                res.writeHead(200, {
                    'Content-Type': 'text/javascript',
                })
                res.end(data)
            }
        })
    }else {
        res.writeHead(404, { 'Content-Type': 'text/plain' })
        res.end('Not found')
    }
})


loadGame()

const port = 1337
server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`)
})

const io = new Server(server)

io.on('connection', socket => {
    socket.on('login', (username: string) => {
        if (users[socket.id]) return
        if (socketId[username]) return
        users[socket.id] = username
        socketId[username] = socket.id
        log("login: " + username)
        addPlayer(username)
        socket.emit('loginResult', getGameState())
        socket.join(room)
        io.to(room).emit('updateUsers', getPlayerStates())
    })

    socket.on('sendMessage', (message: string) => {
        if (room) {
            const username = users[socket.id]
            io.to(room).emit('receiveMessage', { username, message })
        }
    })

    socket.on('disconnect', () => {
        const username = users[socket.id]
        delete users[socket.id]
        delete socketId[username]
        socket.leave(room)
        log('disconnect: ' + username)
        io.to(room).emit('updateUsers', getPlayers())
    })

    socket.on('ready', () => {
        const username = users[socket.id]
        if (getGameState() === 'idle') {
            setState(username, 'ready')
            if (checkStart()) {
                sendStart(getPlayers(), getRoles())
            }
            const readyResult: Record<string, boolean> = {}
            Object.entries(getPlayerStates()).forEach(([k, v]) => {
                readyResult[k] = (v === 'ready')
            })
            io.to(room).emit('readyResult', readyResult)
        }
    })

    socket.on('cancelReady', () => {
        const username = users[socket.id]
        if (getGameState() === 'idle') {
            setState(username, 'unready')
            if (checkStart()) {
                sendStart(getPlayers(), getRoles())
            }
            const readyResult: Record<string, boolean> = {}
            Object.entries(getPlayerStates()).forEach(([k, v]) => {
                readyResult[k] = (v === 'ready')
            })
            io.to(room).emit('readyResult', readyResult)
        }
    })
})

export interface StateType {
    state: GameState,
    dead?: Array<number>,
    seerResult?: boolean,
    waiting?: number,
    voteResult?: Array<number>
}

const sendStart = (players: Array<string>, roles: Record<string, Role>) => {
    Object.entries(users).forEach(([id, name]) => {
        io.to(id).emit('gameStart', {
            role: roles[name],
            players: players
        })
    })
}

export const updateState = (state: StateType, id = room) => io.to(id).emit('gameState', state)

export const sendDiscuss = (player: string, message: string) => io.to(room).emit('receiveDiscuss', {
    player,
    message,
})

export const updateWitchState = () => {
    Object.entries(users).forEach(([id, name]) => {
        const playerId = getId(name)
        let seerResult = false
        if (checkId(playerId)) {
            if (getRoles()[name] === 'seer' && getPlayerStates()[name] === 'alive') {
                seerResult = getSeerResult(playerId) === 'werewolf'
            }
        }
        updateState({
            state: 'witch',
            dead: [],
            seerResult
        }, id)
    })
}

export const sendHunterKilled = (player: number, target: number) => {
    io.to(room).emit('hunterKilled', {
        player,
        target
    })
}

export const sendHunterWait = (player: number) => {
    io.to(room).emit('hunterWait', player)
}