import { Users } from '../common/users'
import { ScreepsResponse } from './base'

/**
 * `GET /api/leaderboard/list` response
 * @see {@link ScreepsHttpClient.leaderboardList}
 * @category HTTP API - Leaderboard
 */
export interface LeaderboardListResponse extends ScreepsResponse {
  list: LeaderboardResult[]
  /** Total number of results in this season */
  count: number
  users: Users
}

/**
 * `GET /api/leaderboard/find` response
 * @see {@link ScreepsHttpClient.leaderboardFind}
 * @category HTTP API - Leaderboard
 */
export interface LeaderboardFindResponse extends ScreepsResponse, LeaderboardResult {}

/**
 * A user's leaderboard result for a single season
 * @category HTTP API - Leaderboard
 */
export interface LeaderboardResult {
  _id: string
  season: string
  user: string
  score: number
  rank: number
}

/**
 * `GET /api/leaderboard/seasons` response
 * @see {@link ScreepsHttpClient.leaderboardSeasons}
 * @category HTTP API - Leaderboard
 */
export interface LeaderboardSeasonsResponse extends ScreepsResponse {
  seasons: {
    /** YYYY-MM */
    _id: string
    /** ISO 8601 season start timestamp */
    date: string
    /** <Month> <Year> */
    name: string
  }[]
}

/**
 * The types of leaderboard available via the leaderboard endpoints
 * (ex: {@link ScreepsHttpClient.leaderboardList})
 * @enum
 * @category HTTP API - Leaderboard
 */
export const LeaderboardModes = {
  /** "Power Processed" (as used to earn Global Power Level) leaderboard */
  Power: 'power',
  /** "Control Points" (as used to earn Global Control Level) leaderboard */
  World: 'world'
} as const

/**
 * A {@link LeaderboardModes} value
 * @category HTTP API - Leaderboard
 */
export type LeaderboardMode = typeof LeaderboardModes[keyof typeof LeaderboardModes]
