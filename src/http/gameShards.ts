import { ScreepsResponse } from './base'

/**
 * `GET /api/game/shards/info` response
 * @see {@link ScreepsHttpClient.gameShardsInfo}
 * @category HTTP API - Game/Shards
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
