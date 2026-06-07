import { ScreepsResponse } from './base'

/**
 * Used with HTTP API endpoints on the `/api/seasons` path
 * @module
 */

/**
 * `GET /api/seasons/current` response
 * @see {@link ScreepsHttpClient.seasonsCurrent}
 */
export interface SeasonsCurrentResponse extends ScreepsResponse {
  /** Name of the season (ex: "Season 8") */
  title: string
  /** Your current ranking on the seasonal leaderboard */
  rank: number
  /** The season ordinal (ex: 5 for season 5, 8 for season 8) */
  index: number
  /** Season start date/time (ISO 8601 UTC) */
  startDate: string
  /** Season end date/time (ISO 8601 UTC) */
  endDate: string
  /** Date/time at which this season was published (ISO 8601 UTC) */
  createdAt: string
  /** Date/time at which this season was last updated (ISO 8601 UTC) */
  updatedAt: string
}
