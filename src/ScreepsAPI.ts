import { ConfigManager } from './ConfigManager'
import { RawAPI } from './RawAPI'
import { Socket } from './Socket'

interface RateLimit {
  limit: number
  period: 'minute' | 'hour' | 'day'
  remaining: number
  reset: number
  toReset: number
}

type RateLimits = {
  global: RateLimit
} & {
  [method in Api.HttpMethod]: { [path: string]: RateLimit }
}

const configManager = new ConfigManager()

export class ScreepsAPI extends RawAPI {
  /**
   * Search for a config/credential file and initializes the client from the first file found.
   * If a valid config is loaded and email/password auth is being used, authenticate automatically.
   * The client can also be initialized by passing a configuration object directly to the constructor.
   *
   * @param serverName the property name of the server object to use from the config file
   * @param opts see {@link Api.LoadConfigOptions}
   * @throws if the selected config file is invalid or if no config files are found
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
        client: {}
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

  get rateLimitResetUrl() {
    if (!this.token) throw new Error('API token not found')
    return `https://screeps.com/a/#!/account/auth-tokens/noratelimit?token=${this.token.slice(
      0,
      8
    )}`
  }

  async me(): Promise<Exclude<typeof this._user, undefined>> {
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
   * Fetch permissions and other information about the API token
   * currently being used by this client
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

  async userID() {
    const user = await this.me()
    return user._id
  }

  get history() {
    return this.raw.history
  }

  get authmod() {
    return this.raw.authmod
  }

  get version() {
    return this.raw.version
  }

  get time() {
    return this.raw.game.time
  }

  get leaderboard() {
    return this.raw.leaderboard
  }

  get market() {
    return this.raw.game.market
  }

  get registerUser() {
    return this.raw.register.submit
  }

  get code() {
    return this.raw.user.code
  }

  get memory() {
    return this.raw.user.memory
  }

  get segment() {
    return this.raw.user.memory.segment
  }

  get console() {
    return this.raw.user.console
  }
}
