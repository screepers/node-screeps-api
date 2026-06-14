/**
 * @module
 * @categoryDescription Common - Decorations
 * Related to {@link https://screeps.com/forum/topic/3007/decorations-update | decorations}:
 * cosmetic effects that can be applied to rooms and room objects.
 * @categoryDescription Common - Market
 * Related to the {@link https://docs.screeps.com/market.html | in-game market}
 * @categoryDescription Common - Resources
 * Related to {@link https://docs.screeps.com/resources.html | in-game resources}
 * and {@link https://docs.screeps.com/api/#Game.resources | account-bound resources}
 * @categoryDescription Common - Rooms
 * Related to rooms and {@link RoomObject}s
 * @categoryDescription Common - Users
 * Related to users and their accounts
 * @categoryDescription HTTP API
 * {@link ScreepsHttpClient} and other entities related to the HTTP API
 * @categoryDescription HTTP API - Auth
 * Used with {@link ScreepsHttpClient} endpoint methods on the `/api/auth` path
 * @categoryDescription HTTP API - Experimental
 * Used with {@link ScreepsHttpClient} endpoint methods on the `/api/experimental` path
 * @categoryDescription HTTP API - Game
 * Used with {@link ScreepsHttpClient} endpoint methods on the `/api/game` path
 * @categoryDescription HTTP API - Game/Market
 * Used with {@link ScreepsHttpClient} endpoint methods on the `/api/game/market` path
 * @categoryDescription HTTP API - Game/Shards
 * Used with {@link ScreepsHttpClient} endpoint methods on the `/api/game/shards` path
 * @categoryDescription HTTP API - Leaderboard
 * Used with {@link ScreepsHttpClient} endpoint methods on the `/api/leaderboard` path
 * @categoryDescription HTTP API - Scoreboard
 * Used with {@link ScreepsHttpClient} endpoint methods on the `/api/scoreboard` path
 * @categoryDescription HTTP API - Seasons
 * Used with {@link ScreepsHttpClient} endpoint methods on the `/api/seasons` path
 * @categoryDescription HTTP API - Servers
 * Used with {@link ScreepsHttpClient} endpoint methods on the `/api/servers` path
 * @categoryDescription HTTP API - User
 * Used with {@link ScreepsHttpClient} endpoint methods on the `/api/user` path
 * @categoryDescription HTTP API - User/Decorations
 * Used with {@link ScreepsHttpClient} endpoint methods on the `/api/user/decorations` path
 * @categoryDescription HTTP API - User/Messages
 * Used with {@link ScreepsHttpClient} endpoint methods on the `/api/user/messages` path
 * @categoryDescription HTTP API - Warpath
 * Used with {@link ScreepsHttpClient} endpoint methods on the `/api/warpath` path
 * @categoryDescription WebSocket API
 * {@link ScreepsSocketClient} and other entities related to the WebSocket API
 * @categoryDescription WebSocket API - Server
 * {@link SocketEvent}s of `type: 'server'`
 * @categoryDescription WebSocket API - User
 * {@link SocketEvent}s of `type: 'user'`
 */

export * from './common'
export * from './http'
export * from './ScreepsConfigManager'
export * from './ScreepsHttpClient'
export * from './ScreepsRateLimitTracker'
export * from './ScreepsSocketClient'
export * from './socket'
