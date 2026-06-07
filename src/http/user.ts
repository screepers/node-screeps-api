import { MarketResourceConstant } from '../common/resources'
import { RoomStat } from '../common/rooms'
import { User } from '../common/users'
import { ScreepsResponse } from './base'

/**
 * Used with HTTP API endpoints on the `/api/user` path
 * @module
 */

/**
 * `POST /api/user/notify-prefs` request
 * @see {@link ScreepsHttpClient.userNotifyPrefs}
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
 */
export interface UserWorldStatusResponse extends ScreepsResponse {
  /**
   * - Normal: user has one or more active spawns
   * - Lost: user has no active spawns
   * - Empty: user has just entered the world or respawned
   *    and has yet to place a spawn
   */
  status: 'normal' | 'lost' | 'empty'
}

/**
 * `GET /api/user/branches` response
 * @see {@link ScreepsHttpClient.userBranches}
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
 * `GET /api/user/find` response
 * @see {@link ScreepsHttpClient.userFind}
 * @see {@link ScreepsHttpClient.userFindById}
 */
export interface UserFindResponse extends ScreepsResponse {
  user: UserInfo
}

/** A result from {@link UserFindResponse} */
export interface UserInfo extends User {
  /** Total control points earned by this user */
  gcl: number
  /** Total power processed by this user */
  power?: number
  /** User's linked Steam account (if public) */
  steam?: {
    id: string
  }
}

/**
 * `GET /api/user/respawn-prohibited-rooms` response
 * @see {@link ScreepsHttpClient.userRespawnProhibitedRooms}
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
 */
export interface UserMoneyHistoryResponse extends ScreepsResponse {
  list: UserMoneyHistoryTransaction[]
  page: number
  /** True if additional pages can be fetched */
  hasMore: boolean
}

/** A single record from {@link UserMoneyHistoryResponse} */
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
 */
export interface MoneyHistoryFillOrder {
  resourceType: MarketResourceConstant
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
 */
export interface MoneyHistoryNewOrder {
  order: {
    type: 'buy' | 'sell'
    resourceType: MarketResourceConstant
    price: number
    totalAmount: number
    roomName?: string
  }
}

/**
 * `POST /api/user/console` response
 * @see {@link ScreepsHttpClient.userConsole}
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
 */
export interface UserNameResponse extends ScreepsResponse {
  username: string
}
