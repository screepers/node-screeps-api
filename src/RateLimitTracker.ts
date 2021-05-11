import Debug from 'debug'

enum RateLimitPeriod {
  MINUTE = 'minute',
  HOUR = 'hour',
  DAY = 'day'
}

export type RateLimit = {
  readonly limit: number
  readonly period: RateLimitPeriod
  remaining: number
  reset: number
  readonly toReset: number
}

type RateLimitGetSet = {
  gameRoomTerrain: RateLimit
  userCode: RateLimit
  userMemory: RateLimit
  userMemorySegment: RateLimit
  gameMarketOrdersIndex: RateLimit
  gameMarketOrders: RateLimit
  gameMarketMyOrders: RateLimit
  gameMarketStats: RateLimit
  gameUserMoneyHistory: RateLimit
}
type RateLimitPostSet = {
  userConsole: RateLimit
  gameMapStats: RateLimit
  userCode: RateLimit
  userSetActiveBranch: RateLimit
  userMemory: RateLimit
  userMemorySegment: RateLimit
}

const debug = Debug('screepsapi:ratelimit')

export class RateLimitTracker {
  public readonly global: RateLimit
  public readonly GET: RateLimitGetSet
  public readonly POST: RateLimitPostSet
  constructor () {
    const limitFactory = (limit: number, period: RateLimitPeriod): RateLimit => ({
      limit,
      period,
      remaining: limit,
      reset: 0,
      get toReset() {
        return this.reset - Math.floor(Date.now() / 1000)
      }
    })
    this.global = limitFactory(120, RateLimitPeriod.MINUTE)
    this.GET = {
      gameRoomTerrain: limitFactory(360, RateLimitPeriod.HOUR),
      userCode: limitFactory(60, RateLimitPeriod.HOUR),
      userMemory: limitFactory(1440, RateLimitPeriod.DAY),
      userMemorySegment: limitFactory(360, RateLimitPeriod.HOUR),
      gameMarketOrdersIndex: limitFactory(60, RateLimitPeriod.HOUR),
      gameMarketOrders: limitFactory(60, RateLimitPeriod.HOUR),
      gameMarketMyOrders: limitFactory(60, RateLimitPeriod.HOUR),
      gameMarketStats: limitFactory(60, RateLimitPeriod.HOUR),
      gameUserMoneyHistory: limitFactory(60, RateLimitPeriod.HOUR)
    }
    this.POST = {
      userConsole: limitFactory(360, RateLimitPeriod.HOUR),
      gameMapStats: limitFactory(60, RateLimitPeriod.HOUR),
      userCode: limitFactory(240, RateLimitPeriod.DAY),
      userSetActiveBranch: limitFactory(240, RateLimitPeriod.DAY),
      userMemory: limitFactory(240, RateLimitPeriod.DAY),
      userMemorySegment: limitFactory(60, RateLimitPeriod.HOUR)
    }
  }
  updateLimit(method: string, path: string, rateLimit: Partial<RateLimit>) {
    const prop = path.replace('/api/', '').replace(/[\/-](.)/g, (_, l: string) => l.toUpperCase())
    const limit: RateLimit = this[method][prop] || this.global
    limit.reset = rateLimit.reset
    limit.remaining = rateLimit.remaining
    if (limit === this.global) {
      debug(`global ${limit.remaining}/${limit.limit} ${limit.toReset}ms`)
    } else {
      debug(`${method} ${path} ${limit.remaining}/${limit.limit} ${limit.toReset}ms`)
    }
  }
}