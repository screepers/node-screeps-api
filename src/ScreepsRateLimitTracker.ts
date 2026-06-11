import Debug from 'debug'
import { ScreepsHttpMethod } from './http'

const debugRateLimit = Debug('screepsapi:ratelimit')

/**
 * Rate limit state for an individual HTTP API endpoint.
 *
 * This relevant state for a given endpoint can be looked up via
 * {@link ScreepsRateLimitTracker.find}.
 */
export interface RateLimit extends RateLimitUpdate {
  /** Time period to which the {@link limit} applies. */
  period: RateLimitPeriod
  /** Time (in milliseconds) until {@link reset}. */
  toReset: number
}

/** State that is contained in response headers when a rate limit is hit. */
export interface RateLimitUpdate {
  /** Maximum number of requests that can be sent within a given time period */
  limit: number
  /** Remaining number of requests that can be sent until {@link reset} */
  remaining: number
  /**
   * UNIX timestamp (in milliseconds) indicating when the rate limit will
   * automatically reset.
   */
  reset: number
}

/** All possible time periods over which a {@link RateLimit} can apply. */
export enum RateLimitPeriod {
  MINUTE = 'minute',
  HOUR = 'hour',
  DAY = 'day'
}

/**
 * Tracks rate limit status for all HTTP API endpoints.
 *
 * Do not instantiate this class. Instead, use the instance from
 * {@link ScreepsHttpClient.rateLimits}.
 * @document ../guides/rate-limits.md
 */
export class ScreepsRateLimitTracker {
  readonly global: RateLimit
  readonly GET: { [path: string]: RateLimit }
  readonly POST: { [path: string]: RateLimit }

  constructor() {
    this.global = makeLimit(120, RateLimitPeriod.MINUTE)
    this.GET = {
      '/api/game/room-terrain': makeLimit(360, RateLimitPeriod.HOUR),
      '/api/user/code': makeLimit(60, RateLimitPeriod.HOUR),
      '/api/user/memory': makeLimit(1440, RateLimitPeriod.DAY),
      '/api/user/memory-segment': makeLimit(360, RateLimitPeriod.HOUR),
      '/api/game/market/orders-index': makeLimit(60, RateLimitPeriod.HOUR),
      '/api/game/market/orders': makeLimit(60, RateLimitPeriod.HOUR),
      '/api/game/market/my-orders': makeLimit(60, RateLimitPeriod.HOUR),
      '/api/game/market/stats': makeLimit(60, RateLimitPeriod.HOUR),
      '/api/game/user/money-history': makeLimit(60, RateLimitPeriod.HOUR)
    }
    this.POST = {
      '/api/user/console': makeLimit(360, RateLimitPeriod.HOUR),
      '/api/game/map-stats': makeLimit(60, RateLimitPeriod.HOUR),
      '/api/user/code': makeLimit(240, RateLimitPeriod.DAY),
      '/api/user/set-active-branch': makeLimit(240, RateLimitPeriod.DAY),
      '/api/user/memory': makeLimit(240, RateLimitPeriod.DAY),
      '/api/user/memory-segment': makeLimit(60, RateLimitPeriod.HOUR)
    }
  }

  find(method: ScreepsHttpMethod, path: string): RateLimit {
    return this[method][path] ?? this.global
  }

  update(method: ScreepsHttpMethod, path: string, latest: RateLimitUpdate): RateLimit {
    const limit = this.find(method, path)
    limit.remaining = latest.remaining
    limit.reset = latest.reset
    limit.toReset = latest.reset - Date.now()

    debugRateLimit(this.describe(method, path, limit))

    return limit
  }

  describe(method: ScreepsHttpMethod, path: string, limit: RateLimit): string {
    const label = limit === this.global ? 'global' : `${method} ${path}`
    return `${label} remaining=${limit.remaining}/${limit.limit} reset=${limit.toReset}ms`
  }
}

// eslint-disable-next-line jsdoc/require-jsdoc
function makeLimit(limit: number, period: RateLimitPeriod): RateLimit {
  return {
    limit,
    period,
    remaining: limit,
    reset: 0,
    toReset: 0
  }
}
