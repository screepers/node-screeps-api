import { ConfigManager, DEFAULT_CLIENT_CONFIG } from './ConfigManager'
import { RawAPI } from './RawAPI'
import { Socket } from './Socket'

declare global {
  namespace Api {
    /**
     * Rate limit state for an individual HTTP API endpoint.
     * This can be read via {@link ScreepsAPI.rateLimit}
     */
    interface RateLimit {
      limit: number
      period: 'minute' | 'hour' | 'day'
      remaining: number
      reset: number
      toReset: number
    }
  }
}

type RateLimits = {
  global: Api.RateLimit
} & {
  [method in Api.HttpMethod]: {
    [path: string]: Api.RateLimit
  }
}

const configManager = new ConfigManager()

/**
 * Provides access to the Screeps HTTP API.
 *
 * Instances should typically be initialized via {@link ScreepsAPI.fromConfig},
 * but the constructor can also be called directly if you prefer to handle
 * loading the credentials and configuration options yourself.
 *
 * {@include ../docs/rate-limits.md}
 * @see {@link raw} for a list of all known/implemented endpoints.
 * @see {@link Socket} for the WebSocket API client (accessible via {@link ScreepsAPI.socket})
 */
export class ScreepsAPI extends RawAPI {
  /**
   * Search for a config/credential file and initializes the client from the first file found.
   *
   * Authentication will occur automatically if email/password credentials
   * are provided in lieu of an API token.
   *
   * Alternatively, the client can be initialized by passing a configuration
   * object directly to the constructor.
   * @param serverName The property name of the server object to use from the config file
   * @param opts See {@link Api.LoadConfigOptions}
   * @returns A configured and authenticated {@link ScreepsAPI} instance
   * @throws {Error} if the selected config file is invalid or if no config files are found
   */
  static async fromConfig(serverName: string, opts?: Api.LoadConfigOptions): Promise<ScreepsAPI> {
    const config = await configManager.getConfig(serverName, opts)
    if (!config) throw new Error('No valid config found')

    const api = new ScreepsAPI(config)

    const server = config.server
    if (!server.token) {
      await api.auth()
    }

    return api
  }

  rateLimits: RateLimits
  socket: Socket

  private _user?: Api.AuthMeResponse | Api.UserFindResponse['user']
  private _tokenInfo?: Api.TokenInfo

  constructor(config: Api.Config)
  constructor(serverConfig: Api.ServerConfig | Api.RawServerConfig)
  constructor(config: Api.Config | Api.ServerConfig | Api.RawServerConfig) {
    if (!('server' in config) || !('client' in config)) {
      config = {
        server: new ConfigManager().normalizeServerConfig(config),
        client: { ...DEFAULT_CLIENT_CONFIG }
      }
    }

    super(config)

    const defaultLimit = (limit: number, period: 'minute' | 'hour' | 'day') => ({
      limit,
      period,
      remaining: limit,
      reset: 0,
      toReset: 0
    })
    this.rateLimits = {
      global: defaultLimit(120, 'minute'),
      GET: {
        '/api/game/room-terrain': defaultLimit(360, 'hour'),
        '/api/user/code': defaultLimit(60, 'hour'),
        '/api/user/memory': defaultLimit(1440, 'day'),
        '/api/user/memory-segment': defaultLimit(360, 'hour'),
        '/api/game/market/orders-index': defaultLimit(60, 'hour'),
        '/api/game/market/orders': defaultLimit(60, 'hour'),
        '/api/game/market/my-orders': defaultLimit(60, 'hour'),
        '/api/game/market/stats': defaultLimit(60, 'hour'),
        '/api/game/user/money-history': defaultLimit(60, 'hour')
      },
      POST: {
        '/api/user/console': defaultLimit(360, 'hour'),
        '/api/game/map-stats': defaultLimit(60, 'hour'),
        '/api/user/code': defaultLimit(240, 'day'),
        '/api/user/set-active-branch': defaultLimit(240, 'day'),
        '/api/user/memory': defaultLimit(240, 'day'),
        '/api/user/memory-segment': defaultLimit(60, 'hour')
      }
    }
    this.on('rateLimit', (limits: ReturnType<RawAPI['buildRateLimit']>) => {
      const rate
        = this.rateLimits[limits.method]?.[limits.path] || this.rateLimits.global
      Object.assign(rate, {
        limit: limits.limit,
        remaining: limits.remaining,
        reset: limits.reset,
        toReset: limits.toReset
      })
    })

    this.socket = new Socket(this)
  }

  getRateLimit(method: Api.HttpMethod, path: string) {
    return this.rateLimits[method][path] || this.rateLimits.global
  }

  /**
   * Generate an URL that can be opened in a browser to reset rate limits
   * for all endpoints.
   *
   * The generated URL is specific to the API token currently in use.
   * @throws {Error} if no API token is available.
   */
  get rateLimitResetUrl() {
    if (!this.token) throw new Error('API token not found')
    return `https://screeps.com/a/#!/account/auth-tokens/noratelimit?token=${this.token.slice(
      0,
      8
    )}`
  }

  /**
   * Fetch and memoize information about the authenticated user.
   * @returns If using an API token with full permissions, this returns
   * {@link Api.AuthMeResponse}. Otherwise, it returns
   * {@link Api.UserFindResponse.user}.
   */
  async me(): Promise<Api.AuthMeResponse | Api.UserFindResponse['user']> {
    if (this._user) return this._user
    const tokenInfo = await this.tokenInfo()
    if (tokenInfo.full) {
      this._user = await this.raw.auth.me()
    } else {
      const { username } = await this.raw.user.name()
      const { user } = await this.raw.user.find(username)
      this._user = user
    }
    return this._user
  }

  /**
   * Fetch and memoize permissions and other information about the API token
   * currently being used by this client.
   * @returns The "token" field from {@link Api.AuthQueryTokenResponse}
   */
  async tokenInfo(): Promise<Api.TokenInfo> {
    if (!this.token) {
      await this.auth(new Error('Not authenticated; cannot query token info'))
    }

    if (this._tokenInfo) {
      return this._tokenInfo
    }

    if (this.config.server.token) {
      const { token } = await this.raw.auth.queryToken(this.config.server.token)
      this._tokenInfo = token
    } else {
      // Email/password auth always gets full privileges
      this._tokenInfo = { full: true, token: this.token! }
    }

    return this._tokenInfo
  }

  /**
   * Fetch and memoize the authenticated user's ID
   * @returns the current user's ID string
   */
  async userID() {
    const user = await this.me()
    return user._id
  }

  /** @inheritdoc */
  get history() {
    return this.raw.history
  }

  /** @inheritdoc */
  get authmod() {
    return this.raw.authmod
  }

  /** @inheritdoc */
  get version() {
    return this.raw.version
  }

  /** @inheritdoc */
  get time() {
    return this.raw.game.time
  }

  /** @inheritdoc */
  get leaderboard() {
    return this.raw.leaderboard
  }

  /** @inheritdoc */
  get market() {
    return this.raw.game.market
  }

  /** @inheritdoc */
  get registerUser() {
    return this.raw.register.submit
  }

  /** @inheritdoc */
  get code() {
    return this.raw.user.code
  }

  /** @inheritdoc */
  get memory() {
    return this.raw.user.memory
  }

  /** @inheritdoc */
  get segment() {
    return this.raw.user.memory.segment
  }

  /** @inheritdoc */
  get console() {
    return this.raw.user.console
  }
}
