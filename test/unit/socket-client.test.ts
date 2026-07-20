import assert from 'node:assert/strict'
import { EventEmitter, once } from 'node:events'
import { AddressInfo } from 'node:net'
import { after, before, test } from 'node:test'
import { WebSocket, WebSocketServer } from 'ws'
import {
  DEFAULT_CLIENT_CONFIG,
  ScreepsHttpClient,
  ScreepsSocketClient
} from '../../src/index'

let server: WebSocketServer
let socket: ScreepsSocketClient
const connections: WebSocket[] = []
const messages: string[][] = []
const received = new EventEmitter()

before(async () => {
  server = new WebSocketServer({ port: 0, path: '/socket/websocket' })
  await once(server, 'listening')
  server.on('connection', ws => {
    const connectionMessages: string[] = []
    connections.push(ws)
    messages.push(connectionMessages)
    ws.on('message', data => {
      const message = data.toString()
      connectionMessages.push(message)
      received.emit('message')
      if (message.startsWith('auth ')) ws.send('auth ok test-token')
    })
  })

  const { port } = server.address() as AddressInfo
  const http = new ScreepsHttpClient({
    app: {
      ...DEFAULT_CLIENT_CONFIG,
      wsKeepAlive: false,
      wsReconnect: false,
      wsReconnectInitDelay: 0,
      wsReconnectMaxDelay: 0,
      wsReconnectMaxRetries: 1
    },
    server: {
      url: `http://127.0.0.1:${port}/`,
      token: 'test-token'
    }
  })
  socket = http.socket
})

after(async () => {
  socket.disconnect()
  await new Promise<void>(resolve => server.close(() => resolve()))
})

test('successful reconnect resolves and restores each subscription once', { timeout: 1000 }, async () => {
  await socket.connect()
  await socket.subscribe('room:shard0/W1N1')

  const disconnected = once(socket, ScreepsSocketClient.DISCONNECTED)
  connections[0].close()
  await disconnected

  await socket.reconnect()
  while (messages[1].length < 2) await once(received, 'message')

  assert.equal(socket.reconnecting, false)
  assert.deepEqual(messages[1], [
    'auth test-token',
    'subscribe room:shard0/W1N1'
  ])
})
