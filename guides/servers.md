---
title: Official and Unofficial Servers
category: Guides
---
Screeps servers can be loosely grouped into two categories:

- Official servers: any server hosted on `screeps.com`:
  - [Persistent World](https://screeps.com/a/) (MMO)
  - [Seasonal World](https://screeps.com/season/)
  - [Public Test Realm](https://screeps.com/ptr/) (PTR)
- "Unofficial" servers:
  - [Community servers](https://docs.screeps.com/community-servers.html)
  - Private servers (also known as "pservers")

There are several key differences between these categories.

## Authentication

As of December 29, 2017, clients can authenticate to the API on official servers using auth tokens obtained from the [account settings page](https://screeps.com/a/#!/account). On February 1, 2018, email/password authentication was disabled on official servers ([announcement](https://blog.screeps.com/2017/12/auth-tokens/)).

For unofficial servers, however, email/password credentials are the only supported method for API authentication.

## Shards

While any Screeps server could technically implement this feature, the official servers (specifically MMO and PTR) are the only known servers that split the game map into multiple interconnected [shards](https://docs.screeps.com/introduction.html#Game-world).

The API for sharded servers is slightly different from the API for shardless servers.

### Shard Request Parameters

Endpoints that expect a `room` parameter (ex: {@link ScreepsHttpClient.gameMapStats}) typically expect a `shard` parameter as well, and they will reject requests that omit it. {@link ScreepsClientConfig.defaultShard} can be used to set a default value for all endpoints that require this parameter.

Shardless servers will silently ignore `shard` parameters for those same endpoints.

### Responses

Endpoints that can return room results for multiple shards in a single response typically format the response in one of two ways:

1. Responses that contain objects indexed by room name are first indexed by shard name (ex: {@link ScreepsHttpClient.gameMapStats}). {@link ScreepsHttpClient} normalizes results from shardless servers by grouping all room results under a `privSrv` key.

```ts
const api = await ScreepsHttpClient.fromConfig('pserver')
const res = await api.gameMapStats(['W1N1', 'W9N9'], 'claim0')
console.log(res)
// => { ok: 1, gameTime: 103873, stats: { } }
```

2. Responses that contain room name strings will prefix the room names with the shard name (ex: `W0N0` becomes `shard0/W0N0`). This also applies to {@link SocketEvent | events on the WebSocket API} (ex: {@link RoomEvent}).
