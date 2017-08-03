import Promise from 'bluebird'
import URL from 'url'
import querystring from 'querystring'
import { EventEmitter } from 'events'
import zlib from 'zlib'
import fetch from 'node-fetch'

const { format } = URL

Promise.promisifyAll(zlib)

const DEFAULT_SHARD = 'shard0'

export class RawAPI extends EventEmitter {
  constructor (opts = {}) {
    super()
    this.setServer(opts)
    let self = this
    this.raw = {
      version () {
        return self.req('GET', '/api/version')
      },
      authmod () {
        if (self.opts.url.match(/screeps\.com/)) {
          return Promise.resolve({ name: 'official' })
        }
        return self.req('GET', '/authmod')
      },
      history (room, tick) {
        tick = Math.round(tick / 20) * 20
        return self.req('GET', `/room-history/${room}/${tick}.json`)
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
          return self.req('GET', '/api/user-messages/list', { respondent })
        },
        index () {
          return self.req('GET', '/api/user-messages/index')
        },
        unreadCount () {
          return self.req('GET', '/api/user-messages/unread-count')
        },
        send (respondent, text) {
          return self.req('POST', '/api/user-messages/send', { respondent, text })
        },
        markRead (id) {
          return self.req('POST', '/api/user-messages/mark-read', { id })
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
            return self.req('GET', '/api/game/market/my-orders').then(this.mapToShard)
          },
          orders (resourceType, shard = DEFAULT_SHARD) {
            return self.req('GET', '/api/game/market/orders', { resourceType, shard })
          },
          stats (resourceType, shard = DEFAULT_SHARD) {
            return self.req('GET', '/api/game/market/stats', { resourceType, shard })
          }
        }
      },
      leaderboard: {
        list () {
          return self.req('GET', '/api/leaderboard/list')
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
          return self.req('GET', '/api/user/rooms', { id }).then(this.mapToShard)
        },
        overview (interval, statName) {
          return self.req('GET', '/api/user/overview', { interval, statName })
        },
        moneyHistory (page = 0) {
          return self.req('GET', '/api/user/money-history', { page })
        },
        console (expression, shard = DEFAULT_SHARD) {
          return self.req('POST', '/api/user/console', { expression, shard })
        }
      },
      shards: {
        info () {
          return self.req('GET', '/api/shards/info')
        }
      }
    }
  }
  mapToShard (res) {
    if (!res.shards) {
      res.shards = {
        [DEFAULT_SHARD]: res.list || res.rooms
      }
    }
    return res
  }
  setServer (opts) {
    if (!this.opts) {
      this.opts = {}
    }
    Object.assign(this.opts, opts)
    if (!opts.url) {
      this.opts.pathname = this.opts.pathname || this.opts.path
      this.opts.url = format(this.opts)
    }
  }
  async auth (email, password, opts = {}) {
    this.setServer(opts)
    if (email && password) {
      Object.assign(this.opts, { email, password })
    }
    let res = await this.raw.auth.signin(email, password)
    this.emit('token', res.token)
    this.emit('auth')
    this.__authed = true
    return res
  }
  async req (method, path, body = {}) {
    let opts = {
      method,
      headers: {
        'X-Token': this.token,
        'X-Username': this.token
      }
    }
    let url = URL.resolve(this.opts.url, path)
    if (method === 'GET') {
      url += '?' + querystring.stringify(body)
    }
    if (method === 'POST') {
      opts.headers['content-type'] = 'application/json'
      opts.body = JSON.stringify(body)
    }
    let res = await fetch(url, opts)
    if (res.status === 401) {
      if (this.__authed) {
        this.__authed = false
        await this.auth(this.opts.email, this.opts.password)
      } else {
        throw new Error('Not Authorized')
      }
    }
    let token = res.headers.get('x-token')
    if (token) {
      this.emit('token', token)
    }
    this.emit('response', res)
    if (!res.ok) {
      throw new Error(await res.text())
    }
    res = await res.json()
    if (typeof res.data === 'string' && res.data.slice(0, 3) === 'gz:') {
      if (this.opts.url.match(/screeps\.com/)) { res.data = await this.gz(res.data) } else { res.data = await this.inflate(res.data) }
    }
    return res
  }
  async gz (data) {
    let buf = Buffer.from(data.slice(3), 'base64')
    let ret = await zlib.gunzipAsync(buf)
    return JSON.parse(ret.toString())
  }
  async inflate (data) { // es
    let buf = Buffer.from(data.slice(3), 'base64')
    let ret = await zlib.inflateAsync(buf)
    return JSON.parse(ret.toString())
  }
}
