import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
// If installed from npm, use:
// import { ScreepsHttpClient } from 'screeps-api'
import { ScreepsHttpClient, ServerAuthEvent, ServerAuthStatuses, UserCodeEvent } from '../src'

const api = await ScreepsHttpClient.fromConfig('main')
api.socket.connect()

api.socket.on('auth', (event: ServerAuthEvent) => {
  if (event.data.status === ServerAuthStatuses.Ok) {
    api.socket.subscribe('/code')
  } else {
    console.error(`WebSocket API authentication failed`)
  }
})

// Upload your code to trigger this event
api.on('code', async (event: UserCodeEvent) => {
  await mkdir(event.data.branch)

  for (const moduleName in event.data.modules) {
    // If module value is an object with a `binary` property, it's a WASM module
    const module = event.data.modules[moduleName]
    const [ext, encoding, contents]: [string, BufferEncoding, string] = typeof module === 'string'
      ? ['.js', 'utf-8', module]
      : ['.wasm', 'binary', module.binary]

    const modulePath = path.join(event.data.branch, `${moduleName}.${ext}`)
    void writeFile(modulePath, contents, { encoding })

    console.log(`Wrote ${modulePath} (${contents.length} bytes)`)
  }
})
