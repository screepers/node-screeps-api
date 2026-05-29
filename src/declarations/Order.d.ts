/**
 * Represents an individual order on the in-game market
 * created by the authenticated user
 */
interface Order {
  _id: string
  user: string
  active: boolean
  type: 'buy' | 'sell'
  resourceType: MarketResourceConstant
  amount: number
  remainingAmount: number
  totalAmount: number
  price: number
  /** UNIX timestamp at which the order was created */
  createdTimestamp: number
}

/** An {@link Order} for a non-account-bound resource */
interface ShardOrder extends Order {
  resourceType: ResourceConstant
  roomName: string
  /** Game time at which the order was created */
  created: number
}

/** An active order on the in-game market */
interface OpenOrder {
  type: 'buy' | 'sell'
  resourceType: MarketResourceConstant
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

type IntershardResourceConstant =
  | 'accessKey'
  | 'cpuUnlock'
  | 'pixel'

type MarketResourceConstant = ResourceConstant | IntershardResourceConstant
