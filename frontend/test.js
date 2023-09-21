const { Server } = require('socket.io')

const server = new Server({
    cors: {
        origin: 'http://localhost:3000',
    },
})

console.log('start fake server')

server.listen(4000)

server.on('connection', () => {
    console.log('client connected')
})

server.on('testUpdateUsers', () => {
    console.log('testUpdateUsers')

    server.emit('updateUsers', () => {
        return {
            '123': 'unready',
            'abc': 'ready',
        }
    })
})
