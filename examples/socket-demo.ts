// If installed from npm, use:
// import { ScreepsHttpClient } from 'screeps-api'
import { ScreepsHttpClient, ScreepsSocketClient, ServerAuthEvent, ServerAuthStatuses, UserConsoleEvent, UserCpuEvent } from '../src'

// Instantiate client from config file and connect to the WebSocket API
const api = await ScreepsHttpClient.fromConfig('main')
console.debug('Connecting to WebSocket API')
await api.socket.connect()

api.socket.on(ScreepsSocketClient.CONNECTED, () => {
  console.info('Connected to WebSocket API')
})

api.socket.on(ScreepsSocketClient.AUTH, (event: ServerAuthEvent) => {
  if (event.data.status === ServerAuthStatuses.Ok) {
    console.info('Authenticated to WebSocket API')
  } else {
    console.error(`WebSocket API authentication failed`)
    process.exit(1)
  }
})

// Subscribe to 'cpu' event path and register a callback separately
void api.socket.subscribeUserCpu((event: UserCpuEvent) => {
  // CPU and Memory usage from the previous tick
  const { cpu, memory } = event.data
  console.log(`CPU used: ${cpu}; Memory used: ${(memory / 1024).toFixed(1)} KiB`)
})

// You can also pass a callback directly to subscribe()
void api.socket.subscribeUserConsole((event: UserConsoleEvent) => {
  const { messages, error, shard } = event.data
  const shardTag = shard ? `[${shard}]` : undefined
  if (error) console.error(shardTag, error)

  // messages is undefined if nothing was logged or evaluated
  if (!messages) return

  // `console.log()` output from the previous tick
  messages.log.forEach(console.info)

  // `POST /api/user/console` results from the previous tick
  messages.results.map(r => `< ${r}`).forEach(console.info)
})
