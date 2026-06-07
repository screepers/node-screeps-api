import { ScreepsDbUpdateResponse, ScreepsResponse } from './base'

/**
 * Used with HTTP API endpoints on the `/api/user/memory` path
 * @module
 */

/**
 * `GET /api/user/memory` response
 * @see {@link ScreepsHttpClient.userMemoryGet}
 */
export interface UserMemoryGetResponse extends ScreepsResponse {
  /** Undefined if the specified memory path does not exist */
  data?: unknown
}

/**
 * `POST /api/user/memory` response
 * @see {@link ScreepsHttpClient.userMemorySet}
 */
export interface UserMemorySetResponse extends ScreepsResponse, ScreepsDbUpdateResponse {
  ops: {
    user: string
    expression: string
    hidden: boolean
  }[]
  data: string
  insertedCount: number
  insertedIds: string[]
}

/**
 * `GET /api/user/memory-segment` response
 * @see {@link ScreepsHttpClient.userMemorySegmentGet}
 */
export interface UserMemorySegmentGetResponse extends ScreepsResponse {
  /**
   * The contents of the requested {@link https://docs.screeps.com/api/#RawMemory.segments | RawMemory.segments}.
   *
   * If a single segment ID is specified, returns the contents of that segment as a string.
   *
   * If multiple segment IDs are specified, returns the contents of each requested segment as a string array.
   * The order of segment data in this array matches the order of the segment IDs array from the request.
   *
   * `null` will be returned instead of a string for any uninitialized segment.
   */
  data: string | null | (string | null)[]
}
