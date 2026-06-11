import { OpenOrder, Order } from '../common/market'
import { MarketResource } from '../common/resources'
import { ScreepsResponse } from './base'

/**
 * Used with HTTP API endpoints on the `/api/game/market` path
 * @module
 */

/**
 * `GET /api/game/market/orders-index` response
 * @see {@link ScreepsHttpClient.gameMarketOrdersIndex}
 */
export interface GameMarketIndexResponse extends ScreepsResponse {
  list: {
    _id: MarketResource
    /** Number of open orders */
    count: number
    avgPrice: number
    stdeevPrice: number
  }[]
}

/**
 * `GET /api/game/market/my-orders` response
 *
 * Intershard orders will be listed under the `intershard` key
 * @see {@link ScreepsHttpClient.gameMarketMyOrders}
 */
export type GameMarketMyOrdersResponse = ScreepsResponse & {
  [shardName: string]: Order[]
}

/**
 * `GET /api/game/market/orders` response
 * @see {@link ScreepsHttpClient.gameMarketOrders}
 */
export interface GameMarketOrdersResponse extends ScreepsResponse {
  list: OpenOrder[]
}

/**
 * `GET /api/game/market/stats` resonse
 * @see {@link ScreepsHttpClient.gameMarketStats}
 */
export interface GameMarketStatsResponse extends ScreepsResponse {
  stats: {
    _id: string
    /** Date to which this stats entry corresponds in YYYY-MM-DD format */
    date: string
    resourceType: MarketResource
    avgPrice: number
    stddevPrice: number
    volume: number
    transactions: number
  }[]
}
