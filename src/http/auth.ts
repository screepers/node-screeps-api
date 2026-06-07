import { IntershardResourceConstant } from '../common/resources'
import { UserBadge, CpuShardLimits } from '../common/users'
import { ScreepsResponse } from './base'

/**
 * Used with HTTP API endpoints on the `/api/auth` path
 * @module
 */

/**
 * `POST /api/auth/signin` response
 * @see {@link ScreepsHttpClient.authSignin}
 */
export interface AuthSigninResponse extends ScreepsResponse {
  token: string
}

/**
 * `GET /api/auth/me` response
 * @see {@link ScreepsHttpClient.authMe}
 */
export interface AuthMeResponse extends ScreepsResponse {
  _id: string
  badge?: UserBadge
  /** Total available CPU per tick */
  cpu?: number
  /** Result of `Game.cpu.shardLimits` */
  cpuShard?: CpuShardLimits
  /** UNIX timestamp of last successful call to `Game.cpu.setShardLimits()` */
  cpuShardUpdatedTime?: number
  /** @deprecated this appears to always be 0; use {@link money} instead */
  credits: string
  email: string
  /** Lifetime control points earned by this player */
  gcl?: number
  /** Github SSO account data */
  github?: {
    id: string
    username: string
  }
  /** UNIX timestamp of the player's last (re)spawn */
  lastRespawnDate?: number
  lastTweetTime?: number
  /** Player's current credit balance; use this instead of {@link credits} */
  money: number
  notifyPrefs: {
    sendOnline?: boolean
    errorsInterval?: boolean
    disabledOnMessages?: boolean
    disabled?: boolean
    interval?: unknown
  }
  /** True if password authentication is configured */
  password?: boolean
  /** Lifetime power processed by this player */
  power?: number
  /**
   * Number of remaining power creep experimentation periods:
   * https://docs.screeps.com/power.html#Power-Creeps
   */
  powerExperimentations: number
  /**
   * UNIX timestamp of the start of player's most recently used power creep
   * experimentation period: https://docs.screeps.com/power.html#Power-Creeps
   */
  powerExperimentationTime?: number
  /** Intrashard / account-bound resource types and amounts owned */
  resources: { [resType in IntershardResourceConstant]: number | undefined; }
  restrictedAccessUntil: unknown
  /** Steam SSO account data */
  steam?: {
    id: string
    displayName: string
    steamProfileLinkHidden?: 0 | 1
  }
  /** Twitter SSO account data */
  twitter?: {
    username: string
    followers_count: number
  }
  username: string
}

/**
 * `GET /api/auth/query-token` response
 * @see {@link ScreepsHttpClient.authQueryToken}
 */
export interface AuthQueryTokenResponse extends ScreepsResponse {
  _id: string
  token: AuthQueryTokenResult
}

/** Information about an API auth token from a {@link AuthQueryTokenResponse} */
export interface AuthQueryTokenResult {
  /**
   * If true, this token can be used to authenticate to all API endpoints.
   * If false, {@link endpoints} and {@link websockets} will be defined.
   */
  full: boolean
  /** List of permitted REST API endpoints (ex: `GET /api/user/name`) */
  endpoints?: string[]
  /** List of permitted WebSocket API event paths (ex: `WebSockets (console)`) */
  websockets?: string[]
  /** The API auth token supplied with the request */
  token: string
  /** The name/description that was provided with the key generation request */
  description?: string
}
