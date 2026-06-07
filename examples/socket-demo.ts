// If installed from npm, use:
// import { ScreepsHttpClient } from 'screeps-api'
import { ScreepsHttpClient, UserConsoleEvent, UserCpuEvent } from '../src';

try {
  // Setup
  const api = await ScreepsHttpClient.fromConfig('main')
  await api.socket.connect() // connect socket

  // Subscribe to 'cpu' event path and register a callback
  api.socket.subscribe('cpu')
  api.socket.on('cpu', (event: UserCpuEvent) => {
    // CPU used last tick
    console.log(`CPU used: ${event.data.cpu}`)
    // Memory usage as of last tick
    console.log(`Memory used: ${(event.data.memory / 1024).toFixed(1)} KiB`)
  });

  // You can also pass a callback directly to subscribe()
  api.socket.subscribe('console', (event: UserConsoleEvent) => {
    // undefined if nothing was logged or evaluated
    const messages = event.data.messages;
    if (!messages) return

    // `console.log()` output from the previous tick
    messages.log.forEach(console.info)

    // `POST /api/user/console` results from the previous tick
    messages.results.map(r => `< ${r}`).forEach(console.info)
  })
} catch(err) {
	console.log(err);
}
