import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
// If installed from npm, use:
// import { ... } from 'screeps-api'
import { ScreepsHttpClient, ScreepsSocketClient, ServerAuthEvent, ServerAuthStatuses, UserCodeEvent } from '../src'

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

// Upload your code to trigger this event
void api.socket.subscribeUserCode(async (event: UserCodeEvent) => {
  await mkdir(event.data.branch)

  for (const moduleName in event.data.modules) {
    // If module value is an object with a `binary` property, it's a WASM module
    const module = event.data.modules[moduleName]
    const [ext, encoding, contents]: [string, BufferEncoding, string] = typeof module === 'string'
      ? ['.js', 'utf-8', module]
      : ['.wasm', 'binary', module.binary]

    const modulePath = path.join(event.data.branch, `${moduleName}.${ext}`)
    void writeFile(modulePath, contents, { encoding })

    console.info(`Wrote ${modulePath} (${contents.length} bytes)`)
  }
})
