import { MarketResource, Resource } from './resources'

/**
 * A buy or sell order on the in-game market created by the authenticated user.
 * @category Common - Market
 */
export interface Order {
  _id: string
  user: string
  active: boolean
  type: 'buy' | 'sell'
  resourceType: MarketResource
  amount: number
  remainingAmount: number
  totalAmount: number
  price: number
  /** UNIX timestamp at which the order was created */
  createdTimestamp: number
}

/**
 * An {@link Order} for a non-account-bound resource
 * @category Common - Market
 */
export interface ShardOrder extends Order {
  resourceType: Resource
  roomName: string
  /** Game time at which the order was created */
  created: number
}

/**
 * An active order on the in-game market
 * @category Common - Market
 */
export interface OpenOrder {
  type: 'buy' | 'sell'
  resourceType: MarketResource
  amount: number
  remainingAmount: number
  price: number
  /**
   * Name of the room that created the order.
   * This is present even for intershard orders,
   * though it is unclear which shard the room is on
   */
  roomName: string
}
