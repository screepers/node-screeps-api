import Debug from 'debug'
import { ScreepsHttpMethod } from './http'

const debugRateLimit = Debug('screepsapi:ratelimit')

/**
 * Rate limit state for an individual HTTP API endpoint.
 *
 * This relevant state for a given endpoint can be looked up via
 * {@link ScreepsRateLimitTracker.find}.
 * @category HTTP API
 */
export interface RateLimit extends RateLimitUpdate {
  /** Time period to which the {@link limit} applies. */
  period: RateLimitPeriod
  /** Time (in milliseconds) until {@link reset}. */
  toReset: number
}

/**
 * State that is included in response headers when a rate limit is hit.
 * @category HTTP API
 */
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

/**
 * All possible time periods over which a {@link RateLimit} can apply.
 * @enum
 * @category HTTP API
 */
export const RateLimitPeriods = {
  Minute: 'minute',
  Hour: 'hour',
  Day: 'day'
} as const

/**
 * A {@link RateLimitPeriods} value
 * @category HTTP API
 */
export type RateLimitPeriod = typeof RateLimitPeriods[keyof typeof RateLimitPeriods]

/**
 * Tracks rate limit status for all HTTP API endpoints.
 *
 * Do not instantiate this class. Instead, use the instance from
 * {@link ScreepsHttpClient.rateLimits}.
 * @document ../guides/rate-limits.md
 * @category HTTP API
 */
export class ScreepsRateLimitTracker {
  readonly global: RateLimit
  readonly GET: { [path: string]: RateLimit }
  readonly POST: { [path: string]: RateLimit }

  constructor() {
    this.global = makeLimit(120, RateLimitPeriods.Minute)
    this.GET = {
      '/api/game/room-terrain': makeLimit(360, RateLimitPeriods.Hour),
      '/api/user/code': makeLimit(60, RateLimitPeriods.Hour),
      '/api/user/memory': makeLimit(1440, RateLimitPeriods.Day),
      '/api/user/memory-segment': makeLimit(360, RateLimitPeriods.Hour),
      '/api/game/market/orders-index': makeLimit(60, RateLimitPeriods.Hour),
      '/api/game/market/orders': makeLimit(60, RateLimitPeriods.Hour),
      '/api/game/market/my-orders': makeLimit(60, RateLimitPeriods.Hour),
      '/api/game/market/stats': makeLimit(60, RateLimitPeriods.Hour),
      '/api/game/user/money-history': makeLimit(60, RateLimitPeriods.Hour)
    }
    this.POST = {
      '/api/user/console': makeLimit(360, RateLimitPeriods.Hour),
      '/api/game/map-stats': makeLimit(60, RateLimitPeriods.Hour),
      '/api/user/code': makeLimit(240, RateLimitPeriods.Day),
      '/api/user/set-active-branch': makeLimit(240, RateLimitPeriods.Day),
      '/api/user/memory': makeLimit(240, RateLimitPeriods.Day),
      '/api/user/memory-segment': makeLimit(60, RateLimitPeriods.Hour)
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
