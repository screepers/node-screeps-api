import { Nuke } from '../common/rooms'
import { ScreepsResponse } from './base'

/**
 * `GET /api/experimental/pvp` response
 * @see {@link ScreepsHttpClient.experimentalPvp}
 * @category HTTP API - Experimental
 */
export interface ExperimentalPvpResponse extends ScreepsResponse {
  /** Rooms with current/recent combat activity grouped by shard name */
  pvp: {
    [shardName: string]: {
      /** Rooms sorted in descending order of `lastPvpTime` */
      rooms: {
        /** Name of the room */
        _id: string
        /** Last tick at which a combat action occurred in this room */
        lastPvpTime: number
      }[]
      /** Current game time on this shard */
      time: number
    }
  }
}

/**
 * `GET /api/experimental/nukes` response
 * @see {@link ScreepsHttpClient.experimentalNukes}
 * @category HTTP API - Experimental
 */
export interface ExperimentalNukesResponse extends ScreepsResponse {
  /** {@link Nuke} objects grouped by shard name */
  nukes: { [shardName: string]: Nuke[] }
}
