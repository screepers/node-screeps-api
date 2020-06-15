import URL from 'url'
import { EventEmitter } from 'events'
import zlib from 'zlib'
import axios from 'axios'
import Debug from 'debug'
import util from 'util'

const debugHttp = Debug('screepsapi:http')
const debugRateLimit = Debug('screepsapi:ratelimit')

const { format } = URL

const gunzipAsync = util.promisify(zlib.gunzip)
const inflateAsync = util.promisify(zlib.inflate)

const DEFAULT_SHARD = 'shard0'
const OFFICIAL_HISTORY_INTERVAL = 100
const PRIVATE_HISTORY_INTERVAL = 20

const sleep = ms => new Promise(resolve => setInterval(resolve, ms))

export class RawAPI extends EventEmitter {
  constructor (opts = {}) {
    super()
    this.setServer(opts)
    const self = this
    this.raw = {
      version () {
        return self.req('GET', '/api/version')
      },
      authmod () {
        if (self.isOfficialServer()) {
          return Promise.resolve({ name: 'official' })
        }
        return self.req('GET', '/api/authmod')
      },
      history (room, tick, shard = DEFAULT_SHARD) {
        if (self.isOfficialServer()) {
          tick -= tick % OFFICIAL_HISTORY_INTERVAL
          return self.req('GET', `/room-history/${shard}/${room}/${tick}.json`)
        } else {
          tick -= tick % PRIVATE_HISTORY_INTERVAL
          return self.req('GET', '/room-history', { room, time: tick })
        }
      },
      servers: {
        list () {
          return self.req('POST', '/api/servers.list', {})
        }
      },
      auth: {
        signin (email, password) {
          return self.req('POST', '/api/auth/signin', { email, password })
        },
        steamTicket (ticket, useNativeAuth = false) {
          return self.req('POST', '/api/auth/steam-ticket', { ticket, useNativeAuth })
        },
        me () {
          return self.req('GET', '/api/auth/me')
        },
        queryToken (token) {
          return self.req('GET', '/api/auth/query-token', { token })
        }
      },
      register: {
        checkEmail (email) {
          return self.req('GET', '/api/register/check-email', { email })
        },
        checkUsername (username) {
          return self.req('GET', '/api/register/check-username', { username })
        },
        setUsername (username) {
          return self.req('POST', '/api/register/set-username', { username })
        },
        submit (username, email, password, modules) {
          return self.req('POST', '/api/register/submit', { username, email, password, modules })
        }
      },
      userMessages: {
        list (respondent) {
          return self.req('GET', '/api/user/messages/list', { respondent })
        },
        index () {
          return self.req('GET', '/api/user/messages/index')
        },
        unreadCount () {
          return self.req('GET', '/api/user/messages/unread-count')
        },
        send (respondent, text) {
          return self.req('POST', '/api/user/messages/send', { respondent, text })
        },
        markRead (id) {
          return self.req('POST', '/api/user/messages/mark-read', { id })
        }
      },
      game: {
        mapStats (rooms, statName, shard = DEFAULT_SHARD) {
          return self.req('POST', '/api/game/map-stats', { rooms, statName, shard })
        },
        genUniqueObjectName (type, shard = DEFAULT_SHARD) {
          return self.req('POST', '/api/game/gen-unique-object-name', { type, shard })
        },
        checkUniqueObjectName (type, name, shard = DEFAULT_SHARD) {
          return self.req('POST', '/api/game/check-unique-object-name', { type, name, shard })
        },
        placeSpawn (room, x, y, name, shard = DEFAULT_SHARD) {
          return self.req('POST', '/api/game/place-spawn', { name, room, x, y, shard })
        },
        createFlag (room, x, y, name, color = 1, secondaryColor = 1, shard = DEFAULT_SHARD) {
          return self.req('POST', '/api/game/create-flag', { name, room, x, y, color, secondaryColor, shard })
        },
        genUniqueFlagName (shard = DEFAULT_SHARD) {
          return self.req('POST', '/api/game/gen-unique-flag-name', { shard })
        },
        checkUniqueFlagName (name, shard = DEFAULT_SHARD) {
          return self.req('POST', '/api/game/check-unique-flag-name', { name, shard })
        },
        changeFlagColor (color = 1, secondaryColor = 1, shard = DEFAULT_SHARD) {
          return self.req('POST', '/api/game/change-flag-color', { color, secondaryColor, shard })
        },
        removeFlag (room, name, shard = DEFAULT_SHARD) {
          return self.req('POST', '/api/game/remove-flag', { name, room, shard })
        },
        addObjectIntent (room, name, intent, shard = DEFAULT_SHARD) {
          return self.req('POST', '/api/game/add-object-intent', { room, name, intent, shard })
        },
        createConstruction (room, x, y, structureType, name, shard = DEFAULT_SHARD) {
          return self.req('POST', '/api/game/create-construction', { room, x, y, structureType, name, shard })
        },
        setNotifyWhenAttacked (_id, enabled = true, shard = DEFAULT_SHARD) {
          return self.req('POST', '/api/game/set-notify-when-attacked', { _id, enabled, shard })
        },
        createInvader (room, x, y, size, type, boosted = false, shard = DEFAULT_SHARD) {
          return self.req('POST', '/api/game/create-invader', { room, x, y, size, type, boosted, shard })
        },
        removeInvader (_id, shard = DEFAULT_SHARD) {
          return self.req('POST', '/api/game/remove-invader', { _id, shard })
        },
        time (shard = DEFAULT_SHARD) {
          return self.req('GET', '/api/game/time', { shard })
        },
        worldSize (shard = DEFAULT_SHARD) {
          return self.req('GET', '/api/game/world-size', { shard })
        },
        roomTerrain (room, encoded = 1, shard = DEFAULT_SHARD) {
          return self.req('GET', '/api/game/room-terrain', { room, encoded, shard })
        },
        roomStatus (room, shard = DEFAULT_SHARD) {
          return self.req('GET', '/api/game/room-status', { room, shard })
        },
        roomOverview (room, interval = 8, shard = DEFAULT_SHARD) {
          return self.req('GET', '/api/game/room-overview', { room, interval, shard })
        },
        market: {
          ordersIndex (shard = DEFAULT_SHARD) {
            return self.req('GET', '/api/game/market/orders-index', { shard })
          },
          myOrders () {
            return self.req('GET', '/api/game/market/my-orders').then(self.mapToShard)
          },
          orders (resourceType, shard = DEFAULT_SHARD) {
            return self.req('GET', '/api/game/market/orders', { resourceType, shard })
          },
          stats (resourceType, shard = DEFAULT_SHARD) {
            return self.req('GET', '/api/game/market/stats', { resourceType, shard })
          }
        },
        shards: {
          info () {
            return self.req('GET', '/api/game/shards/info')
          }
        }
      },
      leaderboard: {
        list (limit = 10, mode = 'world', offset = 0, season) {
          if (mode !== 'world' && mode !== 'power') throw new Error('incorrect mode parameter')
          if (!season) season = self.currentSeason()
          return self.req('GET', '/api/leaderboard/list', { limit, mode, offset, season })
        },
        find (username, mode = 'world', season = '') {
          return self.req('GET', '/api/leaderboard/find', { season, mode, username })
        },
        seasons () {
          return self.req('GET', '/api/leaderboard/seasons')
        }
      },
      user: {
        badge (badge) {
          return self.req('POST', '/api/user/badge', { badge })
        },
        respawn () {
          return self.req('POST', '/api/user/respawn')
        },
        setActiveBranch (branch, activeName) {
          return self.req('POST', '/api/user/set-active-branch', { branch, activeName })
        },
        cloneBranch (branch, newName, defaultModules) {
          return self.req('POST', '/api/user/clone-branch', { branch, newName, defaultModules })
        },
        deleteBranch (branch) {
          return self.req('POST', '/api/user/delete-branch', { branch })
        },
        notifyPrefs (prefs) {
          // disabled,disabledOnMessages,sendOnline,interval,errorsInterval
          return self.req('POST', '/api/user/notify-prefs', prefs)
        },
        tutorialDone () {
          return self.req('POST', '/api/user/tutorial-done')
        },
        email (email) {
          return self.req('POST', '/api/user/email', { email })
        },
        worldStartRoom (shard) {
          return self.req('GET', '/api/user/world-start-room', { shard })
        },
        worldStatus () {
          return self.req('GET', '/api/user/world-status')
        },
        branches () {
          return self.req('GET', '/api/user/branches')
        },
        code: {
          get (branch) {
            return self.req('GET', '/api/user/code', { branch })
          },
          set (branch, modules, _hash) {
            if (!_hash) _hash = Date.now()
            return self.req('POST', '/api/user/code', { branch, modules, _hash })
          }
        },
        respawnProhibitedRooms () {
          return self.req('GET', '/api/user/respawn-prohibited-rooms')
        },
        memory: {
          get (path, shard = DEFAULT_SHARD) {
            return self.req('GET', '/api/user/memory', { path, shard })
          },
          set (path, value, shard = DEFAULT_SHARD) {
            return self.req('POST', '/api/user/memory', { path, value, shard })
          },
          segment: {
            get (segment, shard = DEFAULT_SHARD) {
              return self.req('GET', '/api/user/memory-segment', { segment, shard })
            },
            set (segment, data, shard = DEFAULT_SHARD) {
              return self.req('POST', '/api/user/memory-segment', { segment, data, shard })
            }
          }
        },
        find (username) {
          return self.req('GET', '/api/user/find', { username })
        },
        findById (id) {
          return self.req('GET', '/api/user/find', { id })
        },
        stats (interval) {
          return self.req('GET', '/api/user/stats', { interval })
        },
        rooms (id) {
          return self.req('GET', '/api/user/rooms', { id }).then(self.mapToShard)
        },
        overview (interval, statName) {
          return self.req('GET', '/api/user/overview', { interval, statName })
        },
        moneyHistory (page = 0) {
          return self.req('GET', '/api/user/money-history', { page })
        },
        console (expression, shard = DEFAULT_SHARD) {
          return self.req('POST', '/api/user/console', { expression, shard })
        },
        name () {
          return self.req('GET', '/api/user/name')
        }
      },
      experimental: {
        pvp (interval = 100) {
          return self.req('GET', '/api/experimental/pvp', { interval }).then(self.mapToShard)
        },
        nukes () {
          return self.req('GET', '/api/experimental/nukes').then(self.mapToShard)
        }
      },
      warpath: {
        battles (interval = 100) {
          return self.req('GET', '/api/warpath/battles', { interval })
        }
      }
    }
  }

  currentSeason () {
    const now = new Date()
    const year = now.getFullYear()
    let month = (now.getUTCMonth() + 1).toString()
    if (month.length === 1) month = `0${month}`
    return `${year}-${month}`
  }

  isOfficialServer () {
    return this.opts.url.match(/screeps\.com/) !== null
  }

  mapToShard (res) {
    if (!res.shards) {
      res.shards = {
        privSrv: res.list || res.rooms
      }
    }
    return res
  }

  setServer (opts) {
    if (!this.opts) {
      this.opts = {}
    }
    Object.assign(this.opts, opts)
    if (opts.path && !opts.pathname) {
      this.opts.pathname = this.opts.path
    }
    if (!opts.url) {
      this.opts.url = format(this.opts)
      if (!this.opts.url.endsWith('/')) this.opts.url += '/'
    }
    if (opts.token) {
      this.token = opts.token
    }
    this.http = axios.create({
      baseURL: this.opts.url
    })
  }

  async auth (email, password, opts = {}) {
    this.setServer(opts)
    if (email && password) {
      Object.assign(this.opts, { email, password })
    }
    const res = await this.raw.auth.signin(this.opts.email, this.opts.password)
    this.emit('token', res.token)
    this.emit('auth')
    this.__authed = true
    return res
  }

  async req (method, path, body = {}) {
    const opts = {
      method,
      url: path,
      headers: {}
    }
    debugHttp(`${method} ${path} ${JSON.stringify(body)}`)
    if (this.token) {
      Object.assign(opts.headers, {
        'X-Token': this.token,
        'X-Username': this.token
      })
    }
    if (method === 'GET') {
      opts.params = body
    } else {
      opts.data = body
    }
    try {
      const res = await this.http(opts)
      const token = res.headers['x-token']
      if (token) {
        this.emit('token', token)
      }
      const rateLimit = this.buildRateLimit(method, path, res)
      this.emit('rateLimit', rateLimit)
      debugRateLimit(`${method} ${path} ${rateLimit.remaining}/${rateLimit.limit} ${rateLimit.toReset}s`)
      if (typeof res.data.data === 'string' && res.data.data.slice(0, 3) === 'gz:') {
        res.data.data = await this.gz(res.data.data)
      }
      this.emit('response', res)
      return res.data
    } catch (err) {
      const res = err.response || {}
      const rateLimit = this.buildRateLimit(method, path, res)
      this.emit('rateLimit', rateLimit)
      debugRateLimit(`${method} ${path} ${rateLimit.remaining}/${rateLimit.limit} ${rateLimit.toReset}s`)
      if (res.status === 401) {
        if (this.__authed && this.opts.email && this.opts.password) {
          this.__authed = false
          await this.auth(this.opts.email, this.opts.password)
          return this.req(method, path, body)
        } else {
          throw new Error('Not Authorized')
        }
      }
      if (res.status === 429 && !res.headers['x-ratelimit-limit'] && this.opts.experimentalRetry429) {
        await sleep(Math.floor(Math.random() * 500) + 200)
        return this.req(method, path, body)
      }
      throw new Error(res.data)
    }
  }

  async gz (data) {
    const buf = Buffer.from(data.slice(3), 'base64')
    const ret = await gunzipAsync(buf)
    return JSON.parse(ret.toString())
  }

  async inflate (data) { // es
    const buf = Buffer.from(data.slice(3), 'base64')
    const ret = await inflateAsync(buf)
    return JSON.parse(ret.toString())
  }

  buildRateLimit (method, path, res) {
    const {
      headers: {
        'x-ratelimit-limit': limit,
        'x-ratelimit-remaining': remaining,
        'x-ratelimit-reset': reset
      } = {}
    } = res
    return {
      method,
      path,
      limit: +limit,
      remaining: +remaining,
      reset: +reset,
      toReset: reset - Math.floor(Date.now() / 1000)
    }
  }
}
