---
title: Configuration and Credential Files
category: Guides
---
This guide provides an overview of how to load credentials and configuration options for {@link ScreepsHttpClient} and {@link ScreepsSocketClient}.

## Supported File Formats

We recommend using the [SS3 Screeps Unified Credential File](https://github.com/screepers/screepers-standards/blob/3877e86f38caed9891ef6270aa9690df556e6c22/SS3-Unified_Credentials_File.md) format for your applications and tools. If you only have a [`screeps.json` file](https://github.com/screepers/screeps-typescript-starter/blob/master/screeps.sample.json), that format is also supported since v2.0.

## Config File Paths

{@link ScreepsConfigManager.loadConfig} is used to find and load config files.  searches for config files in a number of places.

If the `SCREEPS_CONFIG` environment variable is defined, the path it defines
will be searched first.

If `SCREEPS_CONFIG` is undefined or does not point to a file, the config manager searches the following directories:

1. The current working directory
1. The user's HOME directory
1. Windows only: `%APPDATA%`
1. Linux/FreeBSD/OpenBSD only: `${XDG_CONFIG_HOME:-"${HOME}/.config"}`
1. macOS only: `~/Library/Application Support`

In each directory, it checks each of the following paths:

1. `screeps/config.yaml`
1. `screeps/config.yml`
1. `.screeps.yaml`
1. `.screeps.yml`
1. `.screeps.json`
1. `screeps.json`

If a YAML file exists at any of the default paths, the config manager will try to load it before attempting to load any JSON files.

The paths mentioned above may be outdated. You can get a complete, ordered list of the paths that will be searched by checking {@link ScreepsConfigManager.defaultPaths}:

```ts
import { ScreepsConfigManager } from 'screeps-api'

const manager = new ScreepsConfigManager()
console.log(manager.defaultPaths)
```

If your credential file is not located at any of the default locations and you'd prefer not to move it, you can also specify the correct path in {@link LoadConfigOptions}:

```ts
manager.loadConfig('main', { file: '/home/me/projects/myScreepsConfig.yaml' })
```

## Configuring a Client

Let's suppose we have the following SS3 credential file in a place where `ScreepsConfigManager` can find it:

```yaml
servers:
  main:
    host: screeps.com
    secure: true
    token: "35a345b9-bc6b-4855-8566-66b341913f9b"
  ptr:
    host: screeps.com
    secure: true
    token: "17f70980-eceb-46ba-a4c3-9677a1570f06"
    ptr: true
  screepsplus:
    host: screepspl.us
    secure: true
    port: 443
    username: bob
    password: password123
  myserv:
    host: 127.0.0.1
    secure: false
    username: bob
    password: password123
configs:
  screepsconsole:
    maxHistory: 20000
    maxScroll: 20000
  screepsplus-agent:
    token: screepsPlusToken
    checkForUpdates: false
  nuke-announcer:
    slack:
      webhook: "https://..."
      channel: "#thewarpath"
  nuke-announcer-sp:
    slack:
      webhook: "https://..."
      channel: "#screepsplus-warpath"
```

Configuration data can be passed to the client in a number of different ways.

One approach is {@link ScreepsHttpClient | `new ScreepsHttpClient()`}:

```ts
import { ScreepsConfigManager, ScreepsHttpClient } from 'screeps-api'

const manager = new ScreepsConfigManager()
const config = await manager.loadConfig('screepsplus', { client: 'nuke-announcer' })
const api = new ScreepsHttpClient(config)

console.log(api.server.url) // => https://screepspl.us/

// appConfig properties not used by node-screeps-api are typed as unknown,
// so type narrowing or type assertions are necessary to use them in TypeScript.
interface SlackWebhookConfig {
  slack: {
    webhook: string
    channel: string
  }
}

const appConfig = api.appConfig as SlackWebhookConfig
console.log(api.appConfig.slack.channel) // => #thewarpath
```

You can also pass configuration objects you create yourself:

```ts
const api = new ScreepsHttpClient({
  server: {
    token: 'Your Token from Account/Auth Tokens'
    protocol: 'https',
    hostname: 'screeps.com',
    port: 443,
    path: '/' // Do no include '/api', it will be added automatically
  }
});
```

If you are loading your credentials and server config directly from a file, it's more convenient to use {@link ScreepsHttpClient.fromConfig | `ScreepsHttpClient.fromConfig()`}:

```ts
import { ScreepsHttpClient } from 'screeps-api'

const api = await ScreepsHttpClient.fromConfig('screepsplus', { client: 'nuke-announcer' })
```

If you want to use a client configuration that is not available in your config file, you can pass those options directly instead of using an app name:

```ts
const api = await ScreepsHttpClient.fromConfig('screepsplus', { client: {
  defaultShard: 'shard2',
  retry429MaxRetries: 6
} })
```

The HTTP client can also be reconfigured after initialization:

```ts
import { ScreepsConfigManager, ScreepsHttpClient } from 'screeps-api'

const manager = new ScreepsConfigManager()
const config = await manager.loadConfig('screepsplus', { client: 'nuke-announcer' })
const api = new ScreepsHttpClient(config)

// ... operations on the screepsplus server ...

// Switch to MMO server (Config.parsed contains the full contents
// of the loaded credential file)
api.setServer(config.parsed.main)

// Keep previous nuke-announcer config, set a default shard,
// and enable automatic retries on HTTP 429 errors:
api.appConfig = {
  ...api.appConfig,
  defaultShard: 'shard2',
  retry429MaxRetries: 6
}
```

## WebSocket API Config

{@link ScreepsSocketClient} leverages the HTTP client for auth credentials, but WebSocket-specific client params can be provided via {@link ScreepsSocketClient.connect | `ScreepsSocketClient.connect()`}:
```ts
await api.socket.connect({
  // Don't automatically reconnect
  reconnect: false,
  // Don't ping the server to keep the connection open
  keepAlive: false
})
```

See {@link ScreepsSocketConfig} for a full list of options.
