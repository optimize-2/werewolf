import http from 'http'
import { readFile } from 'fs'
import { Server } from 'socket.io'
import { log } from './utils'
import {
    GameState,
    Role,
    WitchInventory,
    addPlayer,
    canSpec,
    checkId,
    checkStart,
    game,
    getConfig,
    getGameState,
    getId,
    getLoginResultDay,
    getLoginResultPlayers,
    getLoginResultRoles,
    getPlayerStates,
    getPlayers,
    getRoles,
    getSeerResult,
    getWerewolfKill,
    getWerewolfResult,
    getWitchInventory,
    hasSave,
    isWerewolf,
    loadGame,
    setState
} from './game'
import path from 'path'
import { ConfigType, getTokens } from './config'

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
                let assetType
                if (url.endsWith('.css')) {
                    assetType = 'text/css'
                } else if (url.endsWith('.js')) {
                    assetType = 'text/javascript'
                } else {
                    assetType = 'text/plain'
                }

                res.writeHead(200, {
                    'Content-Type': assetType,
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

const port = 1335
server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`)
})

const io = new Server(server)

interface LoginResultType {
    state: GameState
    config: ConfigType
    day?: number
    players?: Array<string>
    roles?: Record<string, string>
}

io.on('connection', socket => {
    socket.on('login', (token: string) => {
        if (users[socket.id]) {return}
        const username = getTokens().tokens[token]
        if (!username) {return}
        if (socketId[username]) {return}
        if (username.length >= 20) {return}
        if (['空刀', '弃票', '不开枪', '跳过'].includes(username.trim())) {return}
        users[socket.id] = username
        socketId[username] = socket.id
        log('login: ' + username)
        addPlayer(username)
        const result: LoginResultType = {
            state: getGameState(),
            config: getConfig(),
            day: getLoginResultDay(username),
            players: getLoginResultPlayers(username),
            roles: getLoginResultRoles(username),
        }
        socket.emit('loginResult', result)
        socket.join(room)
        io.to(room).emit('updateUsers', getPlayerStates())
    })

    socket.on('sendMessage', (message: string) => {
        const username = users[socket.id]
        if (!username) {return}
        if (message.trim().length === 0) {return}
        io.to(room).emit('receiveMessage', { username, message })
    })

    socket.on('disconnect', () => {
        const username = users[socket.id]
        game.handleLeave(username)
        delete users[socket.id]
        delete socketId[username]
        socket.leave(room)
        log('disconnect: ' + username)
        io.to(room).emit('updateUsers', getPlayerStates())
    })

    socket.on('ready', () => {
        const username = users[socket.id]
        if (!username) {return}
        if (getGameState() === 'idle') {
            setState(username, 'ready')
            const readyResult: Record<string, boolean> = {}
            Object.entries(getPlayerStates()).forEach(([k, v]) => {
                readyResult[k] = (v === 'ready')
            })
            io.to(room).emit('readyResult', readyResult)
            if (checkStart()) {
                sendStart(getPlayers(), getRoles())
            }
        }
    })

    socket.on('cancelReady', () => {
        const username = users[socket.id]
        if (!username) {return}
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

    socket.on('werewolfSelect', id => {
        const player = users[socket.id]
        if (!player) {return}
        console.log('werewolf select receive', id)
        game.handleWerewolfSelect(player, id)
    })

    socket.on('werewolfConfirm', () => {
        const player = users[socket.id]
        if (!player) {return}
        console.log('werewolf confirm receive')
        game.handleWerewolfConfirm(player)
    })

    socket.on('werewolfCancel', () => {
        const player = users[socket.id]
        if (!player) {return}
        game.handleWerewolfCancel(player)
    })

    socket.on('seerConfirm', id => {
        const player = users[socket.id]
        if (!player) {return}
        game.handleSeer(player, id)
    })

    socket.on('witchSave', () => {
        const player = users[socket.id]
        if (!player) {return}
        game.handleWitchSave(player)
    })

    socket.on('witchPoison', id => {
        const player = users[socket.id]
        if (!player) {return}
        game.handleWitchPoison(player, id)
    })

    socket.on('witchSkip', () => {
        const player = users[socket.id]
        if (!player) {return}
        game.handleWitchSkip(player)
    })

    socket.on('voteConfirm', id => {
        const player = users[socket.id]
        if (!player) {return}
        game.handleVote(player, id)
    })

    socket.on('sendDiscuss', message => {
        const player = users[socket.id]
        if (!player) {return}
        if (message.trim().length === 0) {return}
        console.log('sendDiscuss1', player, message)
        game.handleDiscuss(player, message)
    })

    socket.on('sendHunter', id => {
        const player = users[socket.id]
        if (!player) {return}
        game.handleHunterKill(player, id)
    })
})

export interface StateType {
    state: GameState,
    day: number
    dead?: Array<number>,
    seerResult?: boolean,
    waiting?: number,
    voteResult?: Record<number, number>,
    witchInventory?: WitchInventory,
    werewolfKilled?: Array<number>
}

const sendStart = (players: Array<string>, roles: Record<string, Role>) => {
    Object.entries(users).forEach(([id, name]) => {
        console.log('send', roles[name], name)
        io.to(id).emit('gameStart', {
            role: roles[name],
            players
        })
    })
}

export const updateState = (state: StateType, id = room) => {
    io.to(id).emit('gameState', state)
    io.to(id).emit('updateUsers', getPlayerStates())
}

export const sendDiscuss = (player: string, message: string) => io.to(room).emit('receiveDiscuss', {
    player,
    message,
})

export const updateWitchState = (day: number) => {
    Object.entries(users).forEach(([id, name]) => {
        const playerId = getId(name)
        let seerResult = false
        const role = getRoles()[name]
        if (checkId(playerId)) {
            if (role === 'seer' && getPlayerStates()[name] === 'alive') {
                seerResult = getSeerResult(playerId) === 'werewolf'
            }
        }
        updateState({
            state: 'witch',
            dead: hasSave(name) ? getWerewolfKill() : [],
            seerResult,
            witchInventory: getWitchInventory(name),
            day
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

export const sendGameEnd = (team: number) => {
    io.to(room).emit('gameEnd', { team, roles: getRoles() })
}

export const sendWerewolfResult = () => {
    const result: Array<string> = []
    Object.entries(getRoles()).forEach(([k, v]) => {
        if (isWerewolf(v) || canSpec(k)) {
            result.push(k)
        }
    })
    result.forEach(e => {
        io.to(socketId[e]).emit('werewolfResult', getWerewolfResult())
    })
}

export const sendSpecInfo = (player: string) => {
    io.to(socketId[player]).emit('specInfo', getRoles())
}