# Screeps API

## This is a nodejs API for the game Screeps

[![License](https://img.shields.io/npm/l/screeps-api.svg)](https://npmjs.com/package/screeps-api)
[![Version](https://img.shields.io/npm/v/screeps-api.svg)](https://npmjs.com/package/screeps-api)
[![Downloads](https://img.shields.io/npm/dw/screeps-api.svg)](https://npmjs.com/package/screeps-api)
[![Docs](https://img.shields.io/badge/API-Docs-green)](https://screepers.github.io/node-screeps-api/)
[![Test Status](https://github.com/screepers/node-screeps-api/actions/workflows/test.yml/badge.svg)](https://github.com/screepers/node-screeps-api/actions/workflows/test.yml)
[![Lint Status](https://github.com/screepers/node-screeps-api/actions/workflows/lint.yml/badge.svg)](https://github.com/screepers/node-screeps-api/actions/workflows/lint.yml)

[![npm](https://nodei.co/npm/screeps-api.png)](https://npmjs.com/package/screeps-api)

## Application Usage

As of v1.0, all endpoint methods are asynchronous.

```typescript
import { ScreepsHttpClient } from 'screeps-api'
import { writeFile } from 'node:fs/promises'

// `ScreepsHttpClient.fromConfig()` finds your configuration file and picks
// server and client configs from it.
// It supports @tedivm's Unified Credentials File format
// (https://github.com/screepers/screepers-standards/blob/master/SS3-Unified_Credentials_File.md)
// and screeps.json
// (https://github.com/screepers/screeps-typescript-starter/blob/master/screeps.sample.json)

// This example initializes the HTTP client using the `servers` section 'main'
// and the `configs` section 'nuke-announcer' from the config file.
// In a real application, consider reading the server/app names from env vars,
// or accepting `--server <serverName>` and `--app <appName>` CLI arguments.
const api = await ScreepsHttpClient.fromConfig('main', { client: 'nuke-announcer' })

// Client config can be accessed like this:
console.log(api.appConfig)

// HTTP API

// Dump entire Memory object to a file
api.userMemoryGet()
  .then(memory => {
    writeFile('memory.json', JSON.stringify(memory), { encoding: 'utf-8' })
  })
  .catch(console.error)

// Dump a subset of Memory to a file
api.userMemoryGet('rooms.W0N0')
  .then((memory) => {
    writeFile('memory.rooms.W0N0.json', JSON.stringify(memory), { encoding: 'utf-8' })
  })
  .catch(console.error)

// Get user info
api.authMe().then('My user info:', console.log).catch(console.error)

// Download code from the "default" branch and log it
api.userCodeGet('default')
  .then((data) => console.log('My code:', JSON.stringify(data, undefined, 2)))
  .catch(console.error)

// Upload code to the "apiDemo" branch
api.userCodeSet({
  branch: 'apiDemo',
  modules: {
    main: 'module.exports.loop = function() { console.log("Hello, world!") }'
  }
}).catch(console.error)

// WebSocket API

// Connect and authenticate
api.socket.connect()

// Events follow this format:
// {
//   type: 'room',
//   id: 'shard0', // Only on certain events, otherwise undefined
//   path: 'E3N3', // Only on certain events, otherwise an empty string
//   data: { ... }
// }
api.socket.on('connected', () => {
  console.log('websocket client connected')
	// Do stuff after connected
})
api.socket.on('auth', (event) => {
  // Contains either 'ok' or 'failed'
	console.log('websocket auth:', event.data.status)
	// Do stuff after auth
})

// Subscriptions can be queued even before the client connects or auths,
// although you may want to subscribe from the connected or auth callback
// to better handle reconnects
function onConsole(event) {
  const { messages, error, shard } = event.data
  const shardTag = shard ? `[${shard}]` : undefined
  if (error) console.error(shardTag, error)

  // messages is undefined if nothing was logged or evaluated
  if (!messages) return

  // `console.log()` output from the previous tick
  messages.log.forEach(console.info)

  // `POST /api/user/console` results from the previous tick
  messages.results.map(r => `< ${r}`).forEach(console.info)
}
api.socket.subscribe('console')
api.socket.on('console', onConsole)

// Starting in 1.0, you can also pass a handler straight to subscribe!
api.socket.subscribe('console', onConsole)

// Watch CPU/Memory usage
api.socket.subscribe('cpu', (event) => {
  console.log('CPU used:', event.data.cpu)
  console.log('Memory used (bytes):', event.data.memory)
})

// Watch for updates to Memory paths
api.socket.subscribe('memory/stats', (event) => {
	console.log('Memory.stats:', JSON.stringify(event.data, undefined, 2))
})
api.socket.subscribe('memory/rooms.E0N0', (event) => {
	console.log('Memory.rooms.E0N0:', JSON.stringify(event.data, undefined, 2))
})
```

## CLI Usage

As of v1.7, a small CLI program (`screeps-api`) is included.

Server/auth credentials are located using `ScreepsConfigManager.loadConfig()`. All commands aside from `help` accept a `--server <name>` option to specify the name of the server to use from your config file.

```
$ screeps-api
Usage: screeps-api [options] [command]

Options:
  -V, --version                   output the version number
  -h, --help                      display help for command

Commands:
  call [options] <cmd> [args...]  Call an API endpoint method on ScreepsHttpClient
  memory [options] [path]         Read from or write to Memory
  segment [options] <segments>    Read or write RawMemory segments
  download [options] <>           Download code and WASM binaries
  upload [options] <files...>     Upload code and WASM binaries
  help [command]                  display help for command
```

## Endpoint Documentation

Check the [docs](https://screepers.github.io/node-screeps-api/) for a detailed list of supported endpoints:
* HTTP API: [`ScreepsHttpClient`](https://screepers.github.io/node-screeps-api/docs/classes/index.ScreepsHttpClient.html)
* WebSocket API: [`ScreepsSocketClient`](https://screepers.github.io/node-screeps-api/docs/classes/index.ScreepsSocketClient.html)

Please note that the listed endpoints and WebSocket events are not exhaustive.

## Development

This project uses the [yarn package manager](https://yarnpkg.com/). To ensure you're using the correct version instead of v1.x:

```sh
# Enable corepack: https://yarnpkg.com/corepack
set corepack enable
# Install the version of yarn specified in package.json's "packageManager" field
yarn install
# You may need to re-run the command after installing Yarn for the first time
# in order to install dependencies
yarn install
```

### Configuration

The [documentation](https://screepers.github.io/node-screeps-api/documents/Configuration_and_Credential_Files.html) goes into detail on how to set up aconfiguration file, but the simplest way to get started is to copy a `screeps.yaml` or `screeps.json` file to the repo root directory.

### Running Scripts

`tsx` is used to execute TypeScript scripts without having to run `tsc` to transpile them:

```sh
# Run an example script
yarn exec tsx examples/console.ts

# Run the screeps-api CLI tool
yarn exec tsx bin/screeps-api.ts call version

# package.json defines a cli script to make testing the CLI more convenient.
# The following command is functionally identical to the previous one:
yarn cli call version
```
