import { Socket } from './Socket'
import { RawAPI } from './RawAPI'
import { ConfigManager } from './ConfigManager'

const DEFAULTS = {
  protocol: 'https',
  hostname: 'screeps.com',
  port: 443,
  path: '/'
}

const configManager = new ConfigManager()

export class ScreepsAPI extends RawAPI {
  static async fromConfig (server = 'main', config = false, opts = {}) {
    const data = await configManager.getConfig()

    if (data) {
      if (!data.servers[server]) {
        throw new Error(`Server '${server}' does not exist in '${configManager.path}'`)
      }

      const conf = data.servers[server]
      const api = new ScreepsAPI(
        Object.assign(
          {
            hostname: conf.host,
            port: conf.port,
            protocol: conf.secure ? 'https' : 'http',
            token: conf.token
          },
          opts
        )
      )

      api.appConfig = (data.configs && data.configs[config]) || {}

      if (!conf.token && conf.username && conf.password) {
        await api.auth(conf.username, conf.password)
      }

      return api
    }

    throw new Error('No valid config found')
  }

  constructor (opts) {
    opts = Object.assign({}, DEFAULTS, opts)
    super(opts)
    const pre = (opts.ptr === true ? '/ptr' : '')
    this.on('token', token => {
      this.token = token
      this.raw.token = token
    })
    const defaultLimit = (limit, period) => ({
      limit,
      period,
      remaining: limit,
      reset: 0,
      toReset: 0
    })
    this.rateLimits = {
      global: defaultLimit(120, 'minute'),
      GET: {
        [pre+'/api/game/room-terrain']: defaultLimit(360, 'hour'),
        [pre+'/api/user/code']: defaultLimit(60, 'hour'),
        [pre+'/api/user/memory']: defaultLimit(1440, 'day'),
        [pre+'/api/user/memory-segment']: defaultLimit(360, 'hour'),
        [pre+'/api/game/market/orders-index']: defaultLimit(60, 'hour'),
        [pre+'/api/game/market/orders']: defaultLimit(60, 'hour'),
        [pre+'/api/game/market/my-orders']: defaultLimit(60, 'hour'),
        [pre+'/api/game/market/stats']: defaultLimit(60, 'hour'),
        [pre+'/api/game/user/money-history']: defaultLimit(60, 'hour')
      },
      POST: {
        [pre+'/api/user/console']: defaultLimit(360, 'hour'),
        [pre+'/api/game/map-stats']: defaultLimit(60, 'hour'),
        [pre+'/api/user/code']: defaultLimit(240, 'day'),
        [pre+'/api/user/set-active-branch']: defaultLimit(240, 'day'),
        [pre+'/api/user/memory']: defaultLimit(240, 'day'),
        [pre+'/api/user/memory-segment']: defaultLimit(60, 'hour')
      }
    }
    this.on('rateLimit', limits => {
      const rate =
        this.rateLimits[limits.method][limits.path] || this.rateLimits.global
      const copy = Object.assign({}, limits)
      delete copy.path
      delete copy.method
      Object.assign(rate, copy)
    })
    this.socket = new Socket(this)
  }

  getRateLimit (method, path) {
    return this.rateLimits[method][path] || this.rateLimits.global
  }

  get rateLimitResetUrl () {
    return `https://screeps.com/a/#!/account/auth-tokens/noratelimit?token=${this.token.slice(
      0,
      8
    )}`
  }

  async me () {
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

  async tokenInfo () {
    if (this._tokenInfo) {
      return this._tokenInfo
    }
    if (this.opts.token) {
      const { token } = await this.raw.auth.queryToken(this.token)
      this._tokenInfo = token
    } else {
      this._tokenInfo = { full: true }
    }
    return this._tokenInfo
  }

  async userID () {
    const user = await this.me()
    return user._id
  }

  get history () {
    return this.raw.history
  }

  get authmod () {
    return this.raw.authmod
  }

  get version () {
    return this.raw.version
  }

  get time () {
    return this.raw.game.time
  }

  get leaderboard () {
    return this.raw.leaderboard
  }

  get market () {
    return this.raw.game.market
  }

  get registerUser () {
    return this.raw.register.submit
  }

  get code () {
    return this.raw.user.code
  }

  get memory () {
    return this.raw.user.memory
  }

  get segment () {
    return this.raw.user.memory.segment
  }

  get console () {
    return this.raw.user.console
  }
}
