import { UserBadge } from '../common/users'
import { ScreepsResponse } from './base'

/**
 * Used with HTTP API endpoints on the `/api/scoreboard` path
 * @module
 */

/**
 * `GET /api/scoreboard/list` response
 * @see {@link ScreepsHttpClient.scoreboardList}
 */
export interface ScoreboardListResponse extends ScreepsResponse {
  meta: {
    /** The total number of players who have spawned on this season's map */
    length: number
  }
  /** A page of player leaderboard results */
  users: ScoreboardUser[]
}

/** A user from {@link ScoreboardListResponse} */
export interface ScoreboardUser {
  /** A player's username */
  username: string
  badge: UserBadge
  /**
   * The player's current rank for this season;
   * ties appear to be broken in alphabetical order.
   */
  rank: number
  /**
   * The player's current score for this season;
   * may be undefined if the player hasn't scored anything yet.
   */
  score?: number
}
