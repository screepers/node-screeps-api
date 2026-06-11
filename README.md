# Screeps API

## This is a nodejs API for the game Screeps

[![License](https://img.shields.io/npm/l/screeps-api.svg)](https://npmjs.com/package/screeps-api)
[![Version](https://img.shields.io/npm/v/screeps-api.svg)](https://npmjs.com/package/screeps-api)
[![Downloads](https://img.shields.io/npm/dw/screeps-api.svg)](https://npmjs.com/package/screeps-api)
[![Docs](https://img.shields.io/badge/API-Docs-green)](https://screepers.github.io/node-screeps-api/)
[![Test Status](https://github.com/screepers/node-screeps-api/actions/workflows/test.yml/badge.svg)](https://github.com/screepers/node-screeps-api/actions/workflows/test.yml)
[![Lint Status](https://github.com/screepers/node-screeps-api/actions/workflows/lint.yml/badge.svg)](https://github.com/screepers/node-screeps-api/actions/workflows/lint.yml)

![npm](https://nodei.co/npm/screeps-api.png "NPM")

## Application Usage

As of v1.0, all endpoint methods are asynchronous.

```typescript
import { ScreepsHttpClient } from 'screeps-api'
import { writeFile } from 'node:fs/promises'

// Supports @tedivm's [Unified Credentials File format](https://github.com/screepers/screepers-standards/blob/34bd4e6e5c8250fa0794d915d9f78d3c45326076/SS3-Unified_Credentials_File.md) (Pending [screepers-standard PR #8](https://github.com/screepers/screepers-standards/pull/8))
const api = await ScreepsHttpClient.fromConfig('main', { client: 'appName' })
// This loads the server config 'main' and the configs section 'appName' if it exists
// config section can be accessed like this:
console.log(api.appConfig.myConfigVar)
// If making a CLI app, its suggested to have a `--server` argument for selection

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
api.authMe().then(console.log)

// Download and upload code
api.userCodeGet('default').then((data) => console.log('code', data))
api.userCodeSet({
  branch: 'default',
  modules: {
    main: 'module.exports.loop = function(){ ... }'
  }
})

// WebSocket API

api.socket.connect()
// Events have the structure of:
// {
//   channel: 'room',
//   id: 'E3N3', // Only on certain events
//   data: { ... }
// }
api.socket.on('connected', () => {
	// Do stuff after connected
})
api.socket.on('auth', (event) => {
	event.data.status // contains either 'ok' or 'failed'
	// Do stuff after auth
})

// Events: (Not a complete list)
// connected disconnected message auth time protocol package subscribe unsubscribe console

// Subscribtions can be queued even before the socket connects or auths,
// although you may want to subscribe from the connected or auth callback
// to better handle reconnects

api.socket.subscribe('console')
api.socket.on('console', (event) => {
	event.data.messages.log // List of console.log output for tick
})


// Starting in 1.0, you can also pass a handler straight to subscribe!
api.socket.subscribe('console', (event)=>{
	event.data.messages.log // List of console.log output for tick
})

// More common examples
api.socket.subscribe('cpu', (event) => console.log('cpu', event.data))
api.socket.subscribe('memory/stats', (event) => {
	console.log('stats', event.data)
})
api.socket.subscribe('memory/rooms.E0N0', (event) => {
	console.log('E0N0 Memory', event.data)
})
```

## CLI Usage

As of v1.7, a small CLI program (`screeps-api`) is included.

Server/auth credentials are located using `ScreepsConfigManager.loadConfig()`.

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
