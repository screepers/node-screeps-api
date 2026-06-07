import { RoomObject } from '../common/rooms'

/**
 * Used with HTTP API endpoints on the `/api` path
 * @module
 */

/** HTTP request methods/verbs used with Screeps API endpoints */
export enum ScreepsHttpMethod {
  GET = 'GET',
  POST = 'POST'
}

/**
 * Body of a HTTP API success response.
 *
 * Almost all {@link ScreepsHttpClient} endpoint methods will return a
 * response that extends this type. Any non-conforming responses will
 * be of type {@link ScreepsErrorResponse}.
 * @see {@link ScreepsApiError} for the error type thrown by endpoint methods
 */
export interface ScreepsResponse {
  /** An API success response always contains `{ ok: 1 }` */
  ok: 1
}

/**
 * Response returned by some endpoints when an issue occurs.
 *
 * Despite the name/fields of this type, this response body is sent with
 * an HTTP 200 status, so {@link ScreepsHttpClient} processes it as a normal
 * response instead of an error.
 * @see {@link ScreepsResponse} for the standard success response
 * @see {@link ScreepsApiError} for the error type thrown by endpoint methods
 */
export interface ScreepsErrorResponse extends ScreepsResponse {
  error: string
}

/**
 * Body of an HTTP API success response that has not been typed yet.
 * Please consider submitting a PR to replace this with a defined type
 * if you have a sample response body!
 */
export interface ScreepsUnknownResponse extends ScreepsResponse {
  [propertyName: string]: unknown
}

/** Generic HTTP API response to a request to update database records */
export interface ScreepsDbUpdateResponse extends ScreepsResponse {
  result: ScreepsDbUpdateResult
}

/**
 * MongoDB result output from an update operation
 * @see {@link ScreepsDbUpdateResponse}
 */
export interface ScreepsDbUpdateResult {
  /** If an error is not raised, this will always be 1 to indicate success */
  ok: 1
  /**
   * Number of records that were modified. For a single-record update:
   * 1 if the record was updated; 0 if it was already in the target state
   */
  nModified: number
  /** Number of records matched by the request parameters */
  n: number
}

/**
 * Generic HTTP API response to a request to "upsert" (create or update)
 * database records
 */
export interface ScreepsDbUpsertResponse extends ScreepsResponse {
  result: ScreepsDbUpsertResult
}

/**
 * MongoDB result output from an upsert operation
 * @see {@link ScreepsDbUpdateResponse}
 */
export interface ScreepsDbUpsertResult extends ScreepsDbUpdateResult {
  upserted: {
    _id?: string
    index: number
  }[]
}

/**
 * `GET /api/version` response
 * @see {@link ScreepsHttpClient.version}
 */
export interface ScreepsVersionResponse extends ScreepsResponse {
  /** Client version number; undefined on non-official servers */
  package?: number
  protocol: number
  databaseVersion?: number
  serverData: {
    customObjectTypes: object
    /** Number of ticks in each complete history file/chunk */
    historyChunkSize: number
    renderer: {
      resources: object
      metadata: object
    }
    features: {
      name: string
      version: number
      menuItems: {
        section: number
        start?: number
        after?: string
        module?: string
        item: object
      }[]
    }[]
    shards: string[]
    /** socket update rate; undefined on official servers */
    socketUpdateThrottle?: number
    /** welcome message that will be displayed upon signin */
    welcomeText?: string
  }
  /**
   * Name of the current season (usually the season number as a string);
   * undefined on unofficial servers
   */
  currentSeason?: string
  /** undefined on unofficial servers */
  decorationConvertationCost?: number
  /** undefined on unofficial servers */
  decorationPixelizationCost?: number
  /** undefined on official servers */
  useNativeAuth?: boolean
  /** Sum of the number of active players on each shard */
  users: number
}

/**
 * `GET /api/authmod` response
 * @see {@link ScreepsHttpClient.authmod}
 */
export type ScreepsAuthModResponse
  = | ScreepsOfficialAuthModResponse
    | ScreepsUnofficialAuthModResponse

/**
 * Fake `GET /api/authmod` response returned by official servers
 * @see {@link ScreepsAuthModResponse}
 */
export interface ScreepsOfficialAuthModResponse extends ScreepsResponse {
  name: 'official'
}

/**
 * `GET /api/authmod` response returned by unofficial servers
 * @see {@link ScreepsAuthModResponse}
 */
export interface ScreepsUnofficialAuthModResponse extends ScreepsResponse {
  allowRegistration: boolean
  github: boolean
  gitlab: boolean
  /** Name of the authmod being used (ex: 'screepsmod-auth') */
  name: string
  steam: boolean
  /** Semantic version number of the mod */
  version: string
}

/**
 * `GET /api/room-history` / `GET /room-history/${shard}/${room}/${tick}.json` response
 * @see {@link ScreepsHttpClient.history}
 */
export interface ScreepsRoomHistoryResponse extends ScreepsResponse {
  /** UNIX timestamp (UTC) indicating the time at the start of the chunk */
  timestamp: number
  /** Room name */
  room: string
  /** Number of the first tick in this chunk */
  base: number
  /** History data indexed by tick */
  ticks: { [tick: number]: ScreepsHistoryTick }
}

/** Data from a single tick in a {@link ScreepsRoomHistoryResponse} */
export interface ScreepsHistoryTick {
  [id: string]: RoomObject
}
