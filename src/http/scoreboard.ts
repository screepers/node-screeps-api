import { UserBadge } from '../common/users'
import { ScreepsResponse } from './base'

/**
 * `GET /api/scoreboard/list` response
 * @see {@link ScreepsHttpClient.scoreboardList}
 * @category HTTP API - Scoreboard
 */
export interface ScoreboardListResponse extends ScreepsResponse {
  meta: {
    /** The total number of players in the result set */
    length: number
  }
  /**
   * A page of player scoreboard results
   * ordered by {@link ScoreboardUser.rank} (ascending)
   */
  users: ScoreboardUser[]
}

/**
 * A user from {@link ScoreboardListResponse}
 * @category HTTP API - Scoreboard
 */
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
