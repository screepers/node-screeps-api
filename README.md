# Screeps API

## This is a Node.js API for the game Screeps

[![License](https://img.shields.io/npm/l/screeps-api.svg)](https://npmjs.com/package/screeps-api)
[![Version](https://img.shields.io/npm/v/screeps-api.svg)](https://npmjs.com/package/screeps-api)
[![Downloads](https://img.shields.io/npm/dw/screeps-api.svg)](https://npmjs.com/package/screeps-api)
[![Docs](https://img.shields.io/badge/API-Docs-green)](https://screepers.github.io/node-screeps-api/)
[![Test Status](https://github.com/screepers/node-screeps-api/actions/workflows/test.yml/badge.svg)](https://github.com/screepers/node-screeps-api/actions/workflows/test.yml)
[![Lint Status](https://github.com/screepers/node-screeps-api/actions/workflows/lint.yml/badge.svg)](https://github.com/screepers/node-screeps-api/actions/workflows/lint.yml)

[![npm](https://nodei.co/npm/screeps-api.png)](https://npmjs.com/package/screeps-api)

## Application Usage

As of v1.0, all endpoint methods are asynchronous.

```javascript
import { ScreepsHttpClient, ScreepsSocketClient } from 'screeps-api'
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
const api = await ScreepsHttpClient.fromConfig('main', { app: 'nuke-announcer' })

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
api.authMe().then(me => console.log('My user info:', me)).catch(console.error)

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
await api.socket.connect()

// Events follow this format:
// {
//   type: 'room',
//   id: 'shard0', // Only on certain events, otherwise undefined
//   path: 'E3N3', // Only on certain events, otherwise an empty string
//   data: { ... }
// }
api.socket.on(ScreepsSocketClient.CONNECTED, () => {
  console.log('WebSocket client connected')
})
api.socket.on(ScreepsSocketClient.DISCONNECTED, () => {
  console.log('WebSocket client disconnected')
})
api.socket.on(ScreepsSocketClient.AUTH, (event) => {
  // Contains either 'ok' or 'failed'
  console.log('WebSocket auth:', event.data.status)
})

// Subscriptions can be queued even before the client connects or auths
function onConsole(event) {
  const { messages, error, shard } = event.data
  const shardTag = shard ? `[${shard}] ` : ''
  if (error) console.error(shardTag + error)

  // messages is undefined if nothing was logged or evaluated
  if (!messages) return

  // `console.log()` output from the previous tick
  messages.log.map(l => shardTag + l).forEach(console.info)

  // `POST /api/user/console` results from the previous tick
  messages.results.map(r => `< ${r}`).forEach(console.info)
}
api.socket.subscribe('console')
api.socket.on('console', onConsole)

// Starting in v1.0, you can also pass a handler straight to subscribe!
api.socket.subscribe('console', onConsole)

// Starting in v2.0, you can use specialized subscribe methods for each known
// event type. These specialized versions automatically determine the correct
// event string to use and provide better type safety for callback arguments.
api.socket.subscribeUserConsole(onConsole)

// ScreepsSocketClient tracks which callbacks are registered for which events.
// By default, `subscribe` and its specialized versions will ignore duplicate
// callbacks for any given event, so after running all of the previous examples,
// `onConsole` will still only be invoked once per `UserConsoleEvent`.

// Watch CPU/Memory usage
api.socket.subscribeUserCpu((event) => {
  console.log('CPU used:', event.data.cpu)
  console.log('Memory used (bytes):', event.data.memory)
})

// Watch for updates to Memory paths
api.socket.subscribeUserMemory('stats', (event) => {
  console.log('Memory.stats:', JSON.stringify(event.data, undefined, 2))
})
api.socket.subscribeUserMemory('rooms.E0N0', (event) => {
  console.log('Memory.rooms.E0N0:', JSON.stringify(event.data, undefined, 2))
})
```

## CLI Usage

As of v1.7, a small CLI program (`screeps-api`) is included.

Server/auth credentials are located using `ScreepsConfigManager.loadConfig()`. All commands aside from `help` accept a `--server <name>` option to specify the name of the server to use from your config file.

```
> screeps-api --help
Usage: screeps-api [options] [command]

Options:
  -V, --version                   output the version number
  -h, --help                      display help for command

Commands:
  call [options] <cmd> [args...]  Call an API endpoint method on ScreepsHttpClient
  memory [options] [path]         Read from or write to Memory
  segment [options] <segments>    Read or write RawMemory segments
  download [options]              Download code and WASM binaries
  upload [options] <files...>     Upload code and WASM binaries
  help [command]                  display help for command
```

## Endpoint Documentation

Check the [docs](https://screepers.github.io/node-screeps-api/) for a detailed list of supported endpoints:
* HTTP API: [`ScreepsHttpClient`](https://screepers.github.io/node-screeps-api/docs/classes/index.ScreepsHttpClient.html)
* WebSocket API: [`ScreepsSocketClient`](https://screepers.github.io/node-screeps-api/docs/classes/index.ScreepsSocketClient.html)

Please note that the listed endpoints and WebSocket events are not exhaustive.

## Development

First, make sure you're using a compatible version of Node.js. We recommend installing a node version manager like [nvm](https://github.com/nvm-sh/nvm) or a general runtime version manager like [asdf](https://asdf-vm.com/), [mise-en-place](https://mise.jdx.dev/), etc. Once you have one of these installed and configured for node, ensure you have the target version of node installed:

```sh
# nvm example:
nvm install "$(cat .node-version)"
```

This project uses the [yarn package manager](https://yarnpkg.com/). The correct yarn version is pinned in `package.json` using [corepack](https://corepack.org/). To ensure you're using the correct version of yarn instead of the legacy v1.x:

```sh
# Enable corepack: https://yarnpkg.com/corepack
corepack enable

# If using asdf, update node shims after enabling corepack:
# https://github.com/asdf-vm/asdf-nodejs#corepack
if [[ -n "$(which asdf)" ]] ; then asdf reshim nodejs ; fi

# Install dependencies using the version of yarn from package.json's
# "packageManager" field:
yarn install
```

### Configuration

The [documentation](https://screepers.github.io/node-screeps-api/documents/Configuration_and_Credential_Files.html) goes into detail on how to set up a configuration file, but the simplest way to get started is to copy a `screeps.yaml` or `screeps.json` file to the repo root directory.

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
