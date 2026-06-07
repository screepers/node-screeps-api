import { ScreepsResponse } from './base'

/**
 * Used with HTTP API endpoints on the `/api/game/shards` path
 * @module
 */

/**
 * `GET /api/game/shards/info` response
 * @see {@link ScreepsHttpClient.gameShardsInfo}
 */
export interface GameShardsInfoResponse extends ScreepsResponse {
  shards: {
    name: string
    cpuLimit: number
    /** Durations of the most recent (30?) ticks in milliseconds */
    lastTicks: number[]
    /** Number of claimable rooms */
    rooms: number
    /** Number of active users */
    users: number
    /** Average tick duration */
    tick: number
  }[]
}
