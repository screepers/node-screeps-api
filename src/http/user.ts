import { MarketResource } from '../common/resources'
import { RoomStat } from '../common/rooms'
import { User, UserCodeModules } from '../common/users'
import { ScreepsDbUpdateResponse, ScreepsResponse } from './base'

/**
 * `POST /api/user/notify-prefs` request
 * @see {@link ScreepsHttpClient.userNotifyPrefs}
 * @category HTTP API - User
 */
export interface UserNotifyPrefsRequest {
  disabled: boolean
  disabledOnMessages?: boolean
  sendOnline?: boolean
  interval?: number
  errorsInterval?: number
}

/**
 * `GET /api/user/world-start-room` response
 * @see {@link ScreepsHttpClient.userWorldStartRoom}
 * @category HTTP API - User
 */
export interface UserWorldStartRoomResponse extends ScreepsResponse {
  /**
   * Zero or one room names; if a shard name was not included in the request,
   * results are formatted as `${shardName}/${roomName}`
   */
  room: string[]
}

/**
 * `GET /api/user/world-status` response
 * @see {@link ScreepsHttpClient.userWorldStatus}
 * @category HTTP API - User
 */
export interface UserWorldStatusResponse extends ScreepsResponse {
  status: UserWorldStatus
}

/**
 * A user's status on the server. This is used to determine whether
 * or not they may claim a room or place a spawn directly (to spawn/respawn).
 * @enum
 * @category HTTP API - User
 */
export const UserWorldStatuses = {
  /** User has just entered the world or respawned and has yet to place a spawn */
  Empty: 'empty',
  /** User has one or more active spawns */
  Normal: 'normal',
  /**
   * User has no active spawns and may respawn immediately
   * (except in a room contained in {@link UserRespawnProhibitedRoomsResponse}).
   */
  Lost: 'lost'
} as const

/**
 * Any {@link UserWorldStatuses} value
 * @category HTTP API - User
 */
export type UserWorldStatus = typeof UserWorldStatuses[keyof typeof UserWorldStatuses]

/**
 * `GET /api/user/branches` response
 * @see {@link ScreepsHttpClient.userBranches}
 * @category HTTP API - User
 */
export interface UserBranchesResponse extends ScreepsResponse {
  list: {
    _id: string
    branch: string
    activeWorld: boolean
    activeSim: boolean
  }[]
}

/**
 * `GET /api/user/code` response
 * @see {@link ScreepsHttpClient.userCodeGet}
 * @category HTTP API - User
 */
export interface UserCodeGetResponse extends ScreepsResponse, UserCodeSetRequest {}

/**
 * `POST /api/user/code` response
 * @see {@link ScreepsHttpClient.userCodeSet}
 * @category HTTP API - User
 */
export interface UserCodeSetRequest {
  /**
   * The name of the branch
   * @see {@link ScreepsHttpClient.userBranches} to list available branches
   */
  branch: string
  /** JavaScript code and WASM binaries keyed by module name */
  modules: UserCodeModules
}

/**
 * `GET /api/user/find` response
 * @see {@link ScreepsHttpClient.userFind}
 * @see {@link ScreepsHttpClient.userFindById}
 * @category HTTP API - User
 */
export interface UserFindResponse extends ScreepsResponse {
  user: UserInfo
}

/**
 * A result from {@link UserFindResponse}
 * @category HTTP API - User
 */
export interface UserInfo extends User {
  /**
   * Total Global Control Level (GCL) progress/points earned by this user.
   *
   * Undefined if the user has no GCL progress/points.
   */
  gcl?: number
  /**
   * Total power processed by this user; used to determine the user's
   * Global Power Level (GPL).
   *
   * Undefined if the user has never processed power.
   */
  power?: number
  /** User's linked Steam account (if public) */
  steam?: {
    id: string
  }
}

/**
 * `GET /api/user/respawn-prohibited-rooms` response
 * @see {@link ScreepsHttpClient.userRespawnProhibitedRooms}
 * @category HTTP API - User
 */
export interface UserRespawnProhibitedRoomsResponse extends ScreepsResponse {
  /**
   * Zero or one room names; results are formatted as `${shardName}/${roomName}`
   */
  rooms: string[]
}

/**
 * `GET /api/user/rooms` response
 * @see {@link ScreepsHttpClient.userRooms}
 * @category HTTP API - User
 */
export interface UserRoomsResponse extends ScreepsResponse {
  /** All arrays in this object will always be empty */
  reservations: { [shardName: string]: string[] }
  /** Names of all rooms claimed by this user, keyed by shard */
  shards: { [shardName: string]: string[] }
}

/**
 * `GET /api/user/stats` response
 * @see {@link ScreepsHttpClient.userStats}
 * @category HTTP API - User
 */
export interface UserStatsResponse extends ScreepsResponse {
  stats: {
    /** The value of each stat over the requested {@link RoomStatInterval} */
    [statId in RoomStat]: number
  }
}

/**
 * `GET /api/user/overview` response
 * @see {@link ScreepsHttpClient.userOverview}
 * @category HTTP API - User
 */
export interface UserOverviewResponse extends ScreepsResponse {
  statsMax: number
  totals: { [statName in RoomStat]: number }
  shards: {
    [shardName: string]: {
      rooms: string[]
      stats: {
        /**
         * Each room contains an 8-element array listing stat values
         * for each time slot (least recent to most recent)
         */
        [roomName: string]: {
          value: number
          /**
           * Monotonically increasing integers that do not correspond
           * to game time or UNIX timestamps
           */
          endTime: number
        }[]
      }
      /** Shard game time of the beginning of the displayed stat interval */
      gameTimes: [number, undefined, undefined, undefined, undefined, undefined, undefined, undefined]
    }
  }
}

/**
 * `GET /api/user/money-history` response
 * @see {@link ScreepsHttpClient.userMoneyHistory}
 * @category HTTP API - User
 */
export interface UserMoneyHistoryResponse extends ScreepsResponse {
  list: UserMoneyHistoryTransaction[]
  page: number
  /** True if additional pages can be fetched */
  hasMore: boolean
}

/**
 * A single record from {@link UserMoneyHistoryResponse}
 * @category HTTP API - User
 */
export interface UserMoneyHistoryTransaction {
  _id: string
  /** ISO 8601 transaction timestamp */
  date: string
  /** Game time of transaction */
  tick?: number
  /** This user's ID */
  user: string
  type: 'market.buy' | 'market.sell' | 'market.fee'
  /** Balance after the transaction was completed */
  balance: number
  /** Credits spent for or earned by this transaction */
  change: number
  shard?: string
  /** Transaction type -specific details */
  market: MoneyHistoryChangeOrderPrice | MoneyHistoryExtendOrder | MoneyHistoryFillOrder | MoneyHistoryNewOrder
}

/**
 * {@link UserMoneyHistoryTransaction.market} information about
 * an order update triggered via
 * {@link https://docs.screeps.com/api/#Game.market.changeOrderPrice | Game.market.changeOrderPrice()}.
 * @category HTTP API - User
 */
export interface MoneyHistoryChangeOrderPrice {
  changeOrderPrice: {
    orderId: string
    oldPrice: number
    newPrice: number
  }
}

/**
 * {@link UserMoneyHistoryTransaction.market} information about
 * an order update triggered via
 * {@link https://docs.screeps.com/api/#Game.market.extendOrder | Game.market.extendOrder()}.
 * @category HTTP API - User
 */
export interface MoneyHistoryExtendOrder {
  extendOrder: {
    orderId: string
    addAmount: number
  }
}

/**
 * {@link UserMoneyHistoryTransaction.market} details of
 * a market transaction executed via
 * {@link https://docs.screeps.com/api/#Game.market.deal | Game.market.deal()}.
 * @category HTTP API - User
 */
export interface MoneyHistoryFillOrder {
  resourceType: MarketResource
  roomName?: string
  targetRoomName?: string
  /** ID of the user who created the order */
  owner?: string
  /** ID of the user who filled the order */
  dealer?: string
  price: number
  amount: number
  npc?: boolean
}

/**
 * {@link UserMoneyHistoryTransaction.market} information about
 * a market {@link Order} created via
 * {@link https://docs.screeps.com/api/#Game.market.createOrder | Game.market.createOrder()}.
 * @category HTTP API - User
 */
export interface MoneyHistoryNewOrder {
  order: {
    type: 'buy' | 'sell'
    resourceType: MarketResource
    price: number
    totalAmount: number
    roomName?: string
  }
}

/**
 * `POST /api/user/console` response
 * @see {@link ScreepsHttpClient.userConsole}
 * @category HTTP API - User
 */
export interface UserConsoleResponse extends ScreepsResponse {
  result: {
    ok: 1
    n: 1
  }
  ops: [{
    _id: string
    user: string
    expression: string
    shard: string
  }]
  insertedCount: 1
  insertedIds: [string]
}

/**
 * `GET /api/user/name` response
 * @see {@link ScreepsHttpClient.userName}
 * @category HTTP API - User
 */
export interface UserNameResponse extends ScreepsResponse {
  username: string
}

/**
 * `GET /api/user/memory` response
 * @see {@link ScreepsHttpClient.userMemoryGet}
 * @category HTTP API - User
 */
export interface UserMemoryGetResponse extends ScreepsResponse {
  /** Undefined if the specified memory path does not exist */
  data?: unknown
}

/**
 * `POST /api/user/memory` response
 * @see {@link ScreepsHttpClient.userMemorySet}
 * @category HTTP API - User
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
 * @category HTTP API - User
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
