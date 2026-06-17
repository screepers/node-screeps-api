import { ScreepsResponse } from './base'

/**
 * `GET /api/seasons` response
 * @see {@link ScreepsHttpClient.seasonsList}
 * @category HTTP API - Seasons
 */
export interface SeasonsListResponse extends ScreepsResponse {
  /**
   * A list of all past, current, and upcoming Seasonal World competitions,
   * ordered by {@link SeasonalWorldCompetition.index} (ascending).
   */
  list: SeasonalWorldCompetition[]
}

/**
 * `GET /api/seasons/current` response
 * @see {@link ScreepsHttpClient.seasonsCurrent}
 * @category HTTP API - Seasons
 */
export interface SeasonsCurrentResponse extends ScreepsResponse, SeasonalWorldCompetition {
  /** The authenticated user's current ranking on the seasonal leaderboard */
  rank: number
}

/**
 * Metadata for a
 * {@link https://screeps.com/season/#!/seasons/chronicle | Seasonal World} competition.
 * @category HTTP API - Seasons
 */
export interface SeasonalWorldCompetition {
  _id: string
  /** Name of the season (ex: "Season 8") */
  title: string
  /** The season ordinal (ex: 5 for season 5, 8 for season 8, etc) */
  index: number
  /**
   * Ostensibly reports the number of participants in the season, but instead,
   * this is almost always 0
   *
   * The only known exception is Season 1, which reports 2121 players.
   * @see {@link ScoreboardListResponse.meta.length} for an actual player count
   */
  players: number
  /** Season start date/time (ISO 8601 UTC) */
  startDate: string
  /** Season end date/time (ISO 8601 UTC) */
  endDate: string
  /** Date/time at which this season was published (ISO 8601 UTC) */
  createdAt: string
  /** Date/time at which this season was last updated (ISO 8601 UTC) */
  updatedAt: string
}
