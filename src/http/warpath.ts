import { ScreepsResponse } from './base'

/**
 * Response from `GET /api/warpath/battles` on a game server,
 * or any `GET * /battles.json` endpoints on
 * {@link https://voight-kampff.fly.dev/ | Voight-Kampff}
 * @see {@link ScreepsHttpClient.warpathBattles}
 * @category HTTP API - Warpath
 */
export interface WarpathBattlesResponse extends ScreepsResponse {
  /** ISO 8601 time at which the last scan was conducted */
  timestamp: string
  /** A list of conflicts indexed by shard */
  shards: { [shardName: string]: WarpathBattle[] }
}

/**
 * An individual battle from {@link WarpathBattlesResponse}
 * @category HTTP API - Warpath
 */
export interface WarpathBattle {
  /** Name of the room in which the battle is/was occurring */
  room: string
  /**
   * Numeric string value from "0" to "5", where "5" is the
   * highest-level conflict: https://screepspl.us/warpath/classifications/
   */
  classification: string
  /** ISO 8601 time at which the conflict was first observed */
  firstseen: string
  /** ISO 8601 time at which the conflict was last observed */
  lastseen: string
  /** Tick at which the conflict was first observed */
  firsttick: number
  /** Tick at which the conflict was last observed */
  lasttick: number
  /** Username(s) of the attacking player(s) */
  attackers: [string, ...string[]]
  /** Username of the defending player */
  defender: string
}
