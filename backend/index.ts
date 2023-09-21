import http from 'http'
import url from 'url'
import fs from 'fs'
import { Server } from 'socket.io'
import { log } from './utils'
import { PlayerState, Role, addPlayer, checkStart, getPlayers, getRoles, inGame, loadGame, setState } from './game'

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
        socket.emit('loginResult', addPlayer(username))
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
        if (!inGame) {
            setState(username, 'ready')
            if (checkStart()) {
                sendStart(getPlayers(), getRoles())
            }
        }
    })
})

const sendStart = (players: Record<string, PlayerState>, roles: Record<string, Role>) => {
    Object.entries(users).forEach(([id, name]) => {
        io.to(id).emit('gameStart', {
            role: roles[name],
            users: players
        })
    })
}