import http from 'http'
import url from 'url'
import fs from 'fs'
import { Server } from 'socket.io'
import { log } from './utils'
import {
    GameState,
    PlayerState,
    Role,
    addPlayer,
    checkStart,
    getGameState,
    getPlayers,
    getRoles,
    loadGame,
    setState
} from './game'

const users: Record<string, string> = {}
const room = 'hzgang06'

const server = http.createServer((req, res) => {
    const { pathname } = url.parse(req.url!, true)

    if (pathname === '/') {
        fs.readFile('index.html', (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' })
                res.end('Internal Server Error')
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' })
                res.end(data)
            }
        })
    } else {
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
        users[socket.id] = username
        log("login: " + username)
        addPlayer(username)
        socket.emit('loginResult', getGameState())
        io.to(room).emit('updateUsers', getPlayers())
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
        socket.leave(room)
        io.to(room).emit('updateUsers', getPlayers())
    })

    socket.on('ready', () => {
        const username = users[socket.id]
        if (getGameState() === 'idle') {
            setState(username, 'ready')
            if (checkStart()) {
                sendStart(getPlayers(), getRoles())
            }
        }
    })

    socket.on('cancelReady', () => {
        const username = users[socket.id]
        if (getGameState() === 'idle') {
            setState(username, 'unready')
            if (checkStart()) {
                sendStart(getPlayers(), getRoles())
            }
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

export const updateState = (state: StateType) => io.to(room).emit('gameState', state)

export const sendDiscuss = (player: string, message: string) => io.to(room).emit('receiveDiscuss', {
    player,
    message,
})