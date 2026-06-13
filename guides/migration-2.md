---
title: v2 Migration Guide
category: Guides
---
This guide provides an overview of how to migrate your application to `node-screeps-api` v2 from v1.

## Compatibility

Since "Screeps: World" was [upgraded to Node.js v24](https://store.steampowered.com/news/app/464350/view/494970521254890068), `node-screeps-api` v2 also targets Node.js v24. It may work with older node versions, but this is not explicitly supported.

This package is now bundled using the [ESM format](https://nodejs.org/docs/latest-v24.x/api/esm.html#modules-ecmascript-modules). If your application is still using CJS, you will need to upgrade to ESM.

## Configuration

`ConfigManager` has been renamed to {@link ScreepsConfigManager}, and it is now publicly exported.

[screeps.json](https://github.com/screepers/screeps-typescript-starter/blob/master/screeps.sample.json) credentials files are now supported in addition to the original [SS3 (Screeps Unified Credentials File)](https://github.com/screepers/screepers-standards/blob/3877e86f38caed9891ef6270aa9690df556e6c22/SS3-Unified_Credentials_File.md) format.

## HTTP API

`ScreepsAPI` has been renamed to {@link ScreepsHttpClient | ScreepsHttpClient}.

The signature of {@link ScreepsHttpClient.fromConfig | `ScreepsHttpClient.fromConfig()`} has been changed:
```ts
// Old:
const apiEx1 = await ScreepsAPI.fromConfig() // 'main' server; no app config
const apiEx2 = await ScreepsAPI.fromConfig('main', 'myApp')

// New:
// Server name is now required to prevent accidental use of the default server
const apiEx1 = await ScreepsHttpClient.fromConfig('main')
const apiEx2 = await ScreepsHttpClient.fromConfig('main', { app: 'myApp' })
const apiEx3 = await ScreepsHttpClient.fromConfig('main', {
  // Client options can be provided directly to the factory function
  // instead of loading it from the config file
  app: {
    // The default shard can now be specified as an option. If left undefined,
    // endpoint methods will throw an error if a shard argument is not provided.
    defaultShard: 'shard0',
    // This option was named experimentalRetry429 in v1. It is now enabled by
    // default. To maintain legacy behavior:
    retry429Global: false
  }
})
```

In v1, `ScreepsAPI` grouped its endpoint methods into objects. In v2, all methods are defined directly on {@link ScreepsHttpClient}:
```ts
// Old:
const api = await ScreepsAPI.fromConfig('main', 'myApp')
const me = await api.raw.auth.me();
const terrain = await api.raw.game.roomTerrain('W0N0', 1, 'shard0');
const objects = await api.raw.game.roomObjects('W0N0', 'shard0');
const segments = await api.raw.user.memory.segment.get('1,5,10', 'shard2');
const messages = await api.raw.userMessages.index();

// New:
const api = await ScreepsHttpClient.fromConfig('main', {
  app: { defaultShard: 'shard0' }
})
const me = await api.authMe()
const terrain = await api.gameRoomTerrain('W0N0') // shard0
const terrain = await api.gameRoomObjects('W0N0') // shard0
const terrain = await api.userMemorySegmentGet('1,5,10', 'shard2')
const messages = await api.userMessagesIndex()
```

## WebSocket API

The {@link ScreepsSocketClient | WebSocket API client} is largely unchanged. Check out the Examples section of the documentation.
