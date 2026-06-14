import { DecorationInstance } from '../common/decorations'
import { BuildableStructureType, RoomObject, RoomObjectType, RoomStat, RoomStatInterval, RoomStats, RoomStatus } from '../common/rooms'
import { UserBadge, Users } from '../common/users'
import { ScreepsResponse } from './base'

/**
 * Stats that can be used with the `POST /api/game/map-stats` endpoint
 * @enum
 * @category HTTP API - Game
 */
export const MapStats = {
  /** Owner's username and Room Control Level (RCL) */
  Owner: 'owner0',
  /** Whether or not a room can be claimed */
  Claim: 'claim0',
  ...RoomStats
} as const

/**
 * A {@link MapStats} value
 * @category HTTP API - Game
 */
export type MapStat = typeof MapStats[keyof typeof MapStats]

/**
 * `POST /api/game/map-stats` response
 * @see {@link ScreepsHttpClient.gameMapStats}
 * @category HTTP API - Game
 */
export interface GameMapStatsResponse<S extends MapStat = 'owner0'> extends ScreepsResponse {
  gameTime: number
  stats: {
    [roomName: string]: GameMapStatsRoom & {
      [P in S]: {
        /** ID of the user to which this stat applies */
        user: string
        value: number
      }
    }
  }
  users: Users
}

/**
 * A single room result from {@link GameMapStatsResponse}
 * @category HTTP API - Game
 */
export interface GameMapStatsRoom {
  own?: {
    user: string
    level: number
  }
  sign?: Sign
  hardSign?: SystemSign
  status: RoomStatus
}

/**
 * A player signature on a room controller
 * @see {@link GameMapStatsRoom}
 * @category HTTP API - Game
 */
export interface Sign {
  user: string
  text: string
  time: number
  datetime: number
}

/**
 * A system signature on a room / room controller
 * @see {@link GameMapStatsRoom}
 * @category HTTP API - Game
 */
export interface SystemSign {
  text: string
  time: number
  datetime: number
  endDatetime: number
}

/**
 * `POST /api/game/gen-unique-flag-name` and
 * `POST /api/game/gen-unique-object-name` responses
 * @see {@link ScreepsHttpClient.gameGenUniqueFlagName}
 * @see {@link ScreepsHttpClient.gameGenUniqueObjectName}
 * @category HTTP API - Game
 */
export interface GameGenUniqueNameResponse extends ScreepsResponse {
  name: string
}

/**
 * `POST /api/game/create-construction` response
 * @see {@link ScreepsHttpClient.gameCreateConstruction}
 * @category HTTP API - Game
 */
export interface GameCreateConstructionResponse extends ScreepsResponse {
  result: {
    ok: 1
    n: 1
  }
  ops: {
    _id: string
    type: RoomObjectType
    room: string
    x: number
    y: number
    structureType: BuildableStructureType
    user: string
    progress: number
    progressTotal: number
  }[]
  insertedCount: number
  insertedIds: string[]
}

/**
 * `GET /api/game/time` response
 * @see {@link ScreepsHttpClient.gameTime}
 * @category HTTP API - Game
 */
export interface GameTimeResponse extends ScreepsResponse {
  time: number
}

/**
 * `GET /api/game/world-size` response
 * @see {@link ScreepsHttpClient.gameWorldSize}
 * @category HTTP API - Game
 */
export interface GameWorldSizeResponse extends ScreepsResponse {
  /** Width of this shard's map (in rooms) */
  width: number
  /** Height of this shard's map (in rooms) */
  height: number
}

/**
 * `GET /api/game/room-decorations` response
 * @see {@link ScreepsHttpClient.gameRoomDecorations}
 * @category HTTP API - Game
 */
export interface GameRoomDecorationsResponse extends ScreepsResponse {
  decorations: DecorationInstance[]
}

/**
 * `GET /api/game/room-objects` response
 * @see {@link ScreepsHttpClient.gameRoomObjects}
 * @category HTTP API - Game
 */
export interface GameRoomObjectsResponse extends ScreepsResponse {
  objects: RoomObject[]
  users: Users
}

/**
 * `GET /api/game/room-terrain` response when `encoded` param is
 * defined and non-empty
 * @see {@link ScreepsHttpClient.gameRoomTerrain}
 * @category HTTP API - Game
 */
export interface GameRoomTerrainEncodedResponse extends ScreepsResponse {
  terrain: {
    0: {
      _id: string
      room: string
      /**
       * Index by y*50+x to find terrain for a position:
       * - 0: plain
       * - 1: wall
       * - 2: swamp
       */
      terrain: string
    }
  }
}

/**
 * `GET /api/game/room-terrain` response when the `encoded` param is
 * undefined or empty (`undefined`, `null`, `''`, etc)
 * @see {@link ScreepsHttpClient.gameRoomTerrainUnencoded}
 * @category HTTP API - Game
 */
export interface GameRoomTerrainUnencodedResponse extends ScreepsResponse {
  /** Omitted positions are of type `plain` */
  terrain: UnencodedRoomTerrain[]
}

/**
 * Non-plain terrain data for a single room position
 * @see {@link GameRoomTerrainUnencodedResponse}
 * @category HTTP API - Game
 */
export interface UnencodedRoomTerrain {
  room: string
  x: number
  y: number
  /** Plain terrain is represented as an omission */
  type: Exclude<RoomTerrain, 'plain'>
}

/**
 * Room terrain types in a human-readable format
 * @see {@link UnencodedRoomTerrain} and {@link GameRoomTerrainUnencodedResponse}
 * @enum
 * @category HTTP API - Game
 */
export const RoomTerrainTypes = {
  Plain: 'plain',
  Swamp: 'swamp',
  Wall: 'wall'
} as const

/**
 * A {@link RoomTerrainTypes} value
 * @category HTTP API - Game
 */
export type RoomTerrain = typeof RoomTerrainTypes[keyof typeof RoomTerrainTypes]

/**
 * `GET /api/game/room-status` response
 * @see {@link ScreepsHttpClient.gameRoomStatus}
 * @category HTTP API - Game
 */
export interface GameRoomStatusResponse extends ScreepsResponse {
  /** The room name */
  _id: string
  /** UNIX timestamp of time this room stopped / will stop being a novice area */
  novice?: number
  /** UNIX timestamp of time this room stopped / will stop being a respawn area */
  respawn?: number
  /** UNIX timestamp of time this room left the 'closed' status */
  openTime?: number
  status: RoomStatus
}

/**
 * `GET /api/game/room-overview` response
 * @see {@link ScreepsHttpClient.gameRoomOverview}
 * @category HTTP API - Game
 */
export interface GameRoomOverviewResponse extends ScreepsResponse {
  owner: {
    badge: UserBadge
    username: string
  } | null
  stats: {
    /**
     * Each stat contains an 8-element array listing stat values
     * for each time slot (least recent to most recent)
     */
    [statId in RoomStat]: {
      value: number
      /**
       * Monotonically increasing integers that do not correspond
       * to game time or UNIX timestamps
       */
      endTime: number
    }[]
  }
  statsMax: { [statMaxId in `${RoomStat}${RoomStatInterval}`]: number }
  /** Total values for each non-zero stat (stats with 0 totals are undefined) */
  totals: { [statId in RoomStat]: number | undefined }
}
