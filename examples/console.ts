import readline from 'node:readline'
import { fileURLToPath } from 'node:url'
import util from 'node:util'
// If installed from npm, use:
// import { ... } from 'screeps-api'
import { ScreepsHttpClient, ServerAuthEvent, ServerAuthStatuses, UserConsoleEvent } from '../src'

// Run this with DEBUG=screepsapi:socket to enable debug logging

// Load server/app names from env vars
const serverName = process.env.SCREEPS_SERVER ?? 'main'
const appName = process.env.SCREEPS_APP ?? 'example'
export const api = await ScreepsHttpClient.fromConfig(serverName, { client: appName })

export const input = process.stdin
export const output = process.stdout
export const rl = readline.createInterface({
  input,
  output,
  prompt: `${api.appConfig.defaultShard ?? ''}> `
})

// Monkeypatch console to work with readline.Interface
const rlLog = function (...args: unknown[]) {
  const t = Math.ceil((rl.line.length + 3) / output.columns)
  const text = util.format.apply(console, args)
  output.write('\n\x1B[' + t + 'A\x1B[0J')
  output.write(text + '\n')
  output.write(new Array(t).join('\n\x1B[E'))
  rl.prompt(true)
}

console.log = rlLog
console.debug = rlLog
console.info = rlLog
console.warn = rlLog
console.error = rlLog

/**
 * Strip HTML tags from a string to make it more readable.
 * This is not suitable for sanitizing untrusted input.
 */
export function stripTags (text: string): string {
  return text.replaceAll(/<\s*?\/?\s*?\w+?(?:[\w\s=]+?'[^>]*'?|[\w\s=]+?"[^>]*"?|[\w\s=]+?`[^>]*`?|[\w\s]+?)*>/g, '')
}

export function quit (message = 'Bye') {
  console.log(message)
  process.exit(0)
}

function run() {
  rl.on('close', () => quit('I/O closed. Bye!'))
  rl.on('SIGINT', () => quit('Keyboard interrupt. Bye!'))

  rl.on('line', (line) => {
    line = line.trim()
    if (line == 'exit') {
      quit()
    }

    api.userConsole(line).catch(console.error)
  })

  api.socket.on('connected', () => {
    console.log('Console connected')
    rl.prompt()
  })

  api.socket.on('auth', (event: ServerAuthEvent) => {
    if (event.data.status === ServerAuthStatuses.Ok) {
      api.socket.subscribe('/console')
      console.log('Console authenticated')
    } else {
      console.error(`WebSocket API authentication failed`)
    }
  })

  api.socket.subscribe('console', (event: UserConsoleEvent) => {
    const { messages, error, shard } = event.data
    const shardTag = shard ? `[${shard}] ` : ''
    if (error) console.error(shardTag, error)

    if (!messages) return
    messages.log.forEach((msg: string) => console.log(`${shardTag}${stripTags(msg)}`))
    messages.results.forEach((msg: string) => console.log('<', msg))
  })

  console.debug('Console connecting')
  api.socket.connect()
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  run()
}
