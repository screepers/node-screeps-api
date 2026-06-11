// If installed from npm, use:
// import { ScreepsHttpClient } from 'screeps-api'
import { ScreepsHttpClient, UserConsoleEvent, UserCpuEvent } from '../src';

// Instantiate client from config file and connect to the WebSocket API
const api = await ScreepsHttpClient.fromConfig('main')
await api.socket.connect()

// Subscribe to 'cpu' event path and register a callback separately
api.socket.subscribe('cpu')
api.socket.on('cpu', (event: UserCpuEvent) => {
  // CPU and Memory usage from the previous tick
  const { cpu, memory } = event.data;
  console.log(`CPU used: ${cpu}; Memory used: ${(memory / 1024).toFixed(1)} KiB`)
});

// You can also pass a callback directly to subscribe()
api.socket.subscribe('console', (event: UserConsoleEvent) => {
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
