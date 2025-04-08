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

      /**
       * GET /api/version
       * @returns {{
       *  ok:1, package:number, protocol: number,
       *  serverData: {
       *    customObjectTypes,
       *    historyChunkSize:number,
       *    features,
       *    shards: string[]
       *  },
       *  users:number
       * }}
       */
      version () {
        return self.req('GET', '/api/version')
      },
      /**
       * GET /api/authmod
       * @returns {Object}
       */
      authmod () {
        if (self.isOfficialServer()) {
          return Promise.resolve({ name: 'official' })
        }
        return self.req('GET', '/api/authmod')
      },
      /**
       * Official:
       * GET /room-history/${shard}/${room}/${tick}.json
       * Private:
       * GET /room-history
       * @param {string} room
       * @param {number} tick
       * @param {string} shard
       * @returns {Object} A json file with history data
       */
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
        /**
         * POST /api/servers/list
         * A list of community servers
         * @returns {{
         *  ok:number,
         *  servers:{
         *   _id:string,
         *   settings:{
         *     host:string,
         *     port:string,
         *     pass:string
         *   },
         *   name:string,
         *   status:"active"|string
         *   likeCount:number
         *  }[]
         * }}
         */
        list () {
          return self.req('POST', '/api/servers/list', {})
        }
      },
      auth: {
        /**
         * POST /api/auth/signin
         * @param {string} email
         * @param {string} password
         * @returns {{ok:number, token:string}}
         */
        signin (email, password) {
          return self.req('POST', '/api/auth/signin', { email, password })
        },
        /**
         * POST /api/auth/steam-ticket
         * @param {*} ticket
         * @param {*} useNativeAuth
         * @returns {Object}
         */
        steamTicket (ticket, useNativeAuth = false) {
          return self.req('POST', '/api/auth/steam-ticket', { ticket, useNativeAuth })
        },
        /**
         * GET /api/auth/me
         * @returns {{
         *  ok: number;
         *  _id: string;
         *  email: string;
         *  username: string;
         *  cpu: number;
         *  badge: Badge;
         *  password: string;
         *  notifyPrefs: { sendOnline: any; errorsInterval: any; disabledOnMessages: any; disabled: any; interval: any };
         *  gcl: number;
         *  credits: number;
         *  lastChargeTime: any;
         *  lastTweetTime: any;
         *  github: { id: any; username: any };
         *  twitter: { username: string; followers_count: number };
         *}}
         */
        me () {
          return self.req('GET', '/api/auth/me')
        },
        /**
         * GET /api/auth/query-token
         * @param {string} token
         * @returns {Object}
         */
        queryToken (token) {
          return self.req('GET', '/api/auth/query-token', { token })
        }
      },
      register: {
        /**
         * GET /api/register/check-email
         * @param {string} email
         * @returns {Object}
         */
        checkEmail (email) {
          return self.req('GET', '/api/register/check-email', { email })
        },
        /**
         * GET /api/register/check-username
         * @param {string} username
         * @returns  {Object}
         */
        checkUsername (username) {
          return self.req('GET', '/api/register/check-username', { username })
        },
        /**
         * POST /api/register/set-username
         * @param {string} username
         * @returns {Object}
         */
        setUsername (username) {
          return self.req('POST', '/api/register/set-username', { username })
        },
        /**
         * POST /api/register/submit
         * @param {string} username
         * @param {string} email
         * @param {string} password
         * @param {*} modules
         * @returns {Object}
         */
        submit (username, email, password, modules) {
          return self.req('POST', '/api/register/submit', { username, email, password, modules })
        }
      },
      userMessages: {
        /**
         * GET /api/user/messages/list?respondent={userId}
         * @param {string} respondent the long `_id` of the user, not the username
         * @returns {{ ok, messages: [ { _id, date, type, text, unread } ] }}
         */
        list (respondent) {
          return self.req('GET', '/api/user/messages/list', { respondent })
        },
        /**
         * GET /api/user/messages/index
         * @returns {{ ok, messages: [ { _id, message: { _id, user, respondent, date, type, text, unread } } ], users: { <user's _id>: { _id, username, badge: Badge } } }}
         */
        index () {
          return self.req('GET', '/api/user/messages/index')
        },
        /**
         * GET /api/user/messages/unread-count
         * @returns {{ ok, count:number }}
         */
        unreadCount () {
          return self.req('GET', '/api/user/messages/unread-count')
        },
        /**
         * POST /api/user/messages/send
         * @param {string} respondent the long `_id` of the user, not the username
         * @param {string} text
         * @returns {{ ok }}
         */
        send (respondent, text) {
          return self.req('POST', '/api/user/messages/send', { respondent, text })
        },
        /**
         * POST /api/user/messages/mark-read
         * @param {string} id
         * @returns {Object}
         */
        markRead (id) {
          return self.req('POST', '/api/user/messages/mark-read', { id })
        }
      },
      game: {
        /**
         * @typedef {"creepsLost"|"creepsProduced"|"energyConstruction"|"energyControl"|"energyCreeps"|"energyHarvested"} stat
         * @param {string[]} rooms An array of room names
         * @param {"owner0"|"claim0"|stat} statName
         * @param {string} shard
         * @returns {{
         *  ok:number,
         *  stats: {
         *    [roomName:string]: {
         *      status,
         *      novice,
         *      own: { user, level },
         *      <stat>: [ { user, value }]
         *    }
         *  }
         * , users: { [userId:string]: { _id, username, badge: Badge } } }}
         * The return type is not mapped correctly
         */
        mapStats (rooms, statName, shard = DEFAULT_SHARD) {
          return self.req('POST', '/api/game/map-stats', { rooms, statName, shard })
        },
        /**
         * POST /api/game/gen-unique-object-name
         * @param {"flag"|"spawn"|string} type can be at least "flag" or "spawn"
         * @param {string} shard
         * @returns { ok, name:string }
         */
        genUniqueObjectName (type, shard = DEFAULT_SHARD) {
          return self.req('POST', '/api/game/gen-unique-object-name', { type, shard })
        },
        /**
         * POST /api/game/check-unique-object-name
         * @param {string} type
         * @param {string} name
         * @param {string} shard
         * @returns {Object}
         */
        checkUniqueObjectName (type, name, shard = DEFAULT_SHARD) {
          return self.req('POST', '/api/game/check-unique-object-name', { type, name, shard })
        },
        /**
         * @param {string} room
         * @param {number} x
         * @param {number} y
         * @param {string} name
         * @param {string?} shard
         */
        placeSpawn (room, x, y, name, shard = DEFAULT_SHARD) {
          return self.req('POST', '/api/game/place-spawn', { name, room, x, y, shard })
        },
        /**
         * POST /api/game/create-flag
         * @param {string} room
         * @param {number} x
         * @param {number} y
         * @param {string} name
         * @param {FlagColor} color
         * @param {FlagColor} secondaryColor
         * @param {string} shard
         * @returns {{ ok, result: { nModified, ok, upserted: [ { index, _id } ], n }, connection: { host, id, port } }}
         * - if the name is new, result.upserted[0]._id is the game id of the created flag
         * - if not, this moves the flag and the response does not contain the id (but the id doesn't change)
         * - `connection` looks like some internal MongoDB thing that is irrelevant to us
         */
        createFlag (room, x, y, name, color = 1, secondaryColor = 1, shard = DEFAULT_SHARD) {
          return self.req('POST', '/api/game/create-flag', { name, room, x, y, color, secondaryColor, shard })
        },
        /**
         * POST/api/game/gen-unique-flag-name
         * @param {string} shard
         * @returns {Object}
         */
        genUniqueFlagName (shard = DEFAULT_SHARD) {
          return self.req('POST', '/api/game/gen-unique-flag-name', { shard })
        },
        /**
         * POST /api/game/check-unique-flag-name
         * @param {string} name
         * @param {string} shard
         * @returns {Object}
         */
        checkUniqueFlagName (name, shard = DEFAULT_SHARD) {
          return self.req('POST', '/api/game/check-unique-flag-name', { name, shard })
        },
        /**
         * POST /api/game/change-flag-color
         * @param {FlagColor} color
         * @param {FlagColor} secondaryColor
         * @param {string} shard
         * @returns {{ ok, result: { nModified, ok, n }, connection: { host, id, port } }}
         */
        changeFlagColor (color = 1, secondaryColor = 1, shard = DEFAULT_SHARD) {
          return self.req('POST', '/api/game/change-flag-color', { color, secondaryColor, shard })
        },
        /**
         * POST /api/game/remove-flag
         * @param {string} room
         * @param {string} name
         * @param {string} shard
         * @returns {Object}
         */
        removeFlag (room, name, shard = DEFAULT_SHARD) {
          return self.req('POST', '/api/game/remove-flag', { name, room, shard })
        },
        /**
         * POST /api/game/add-object-intent
         * [Missing parameter] _id is the game id of the object to affect (except for destroying structures), room is the name of the room it's in
         * this method is used for a variety of actions, depending on the `name` and `intent` parameters
         * @example remove flag: name = "remove", intent = {}
         * @example destroy structure: _id = "room", name = "destroyStructure", intent = [ {id: <structure id>, roomName, <room name>, user: <user id>} ]
can destroy multiple structures at once
         * @example suicide creep: name = "suicide", intent = {id: <creep id>}
         * @example unclaim controller: name = "unclaim", intent = {id: <controller id>}
intent can be an empty object for suicide and unclaim, but the web interface sends the id in it, as described
         * @example remove construction site: name = "remove", intent = {}
         * @param {string} room
         * @param {string} name
         * @param {string} intent
         * @param {string} shard
         * @returns {{ ok, result: { nModified, ok, upserted: [ { index, _id } ], n }, connection: { host, id, port } }}
         */
        addObjectIntent (room, name, intent, shard = DEFAULT_SHARD) {
          return self.req('POST', '/api/game/add-object-intent', { room, name, intent, shard })
        },
        /**
         * POST /api/game/create-construction
         * @param {string} room
         * @param {number} x
         * @param {number} y
         * @param {string} structureType the same value as one of the in-game STRUCTURE_* constants ('road', 'spawn', etc.)
         * @param {string} name
         * @param {string} shard
         * @returns {{ ok, result: { ok, n }, ops: [ { type, room, x, y, structureType, user, progress, progressTotal, _id } ], insertedCount, insertedIds }}
         */
        createConstruction (room, x, y, structureType, name, shard = DEFAULT_SHARD) {
          return self.req('POST', '/api/game/create-construction', { room, x, y, structureType, name, shard })
        },
        /**
         * POST /api/game/set-notify-when-attacked
         * @param {string} _id
         * @param {bool} enabled is either true or false (literal values, not strings)
         * @param {string} shard
         * @returns {{ ok, result: { ok, nModified, n }, connection: { id, host, port } }}
         */
        setNotifyWhenAttacked (_id, enabled = true, shard = DEFAULT_SHARD) {
          return self.req('POST', '/api/game/set-notify-when-attacked', { _id, enabled, shard })
        },
        /**
         * POST /api/game/create-invader
         * @param {string} room
         * @param {number} x
         * @param {number} y
         * @param {*} size
         * @param {*} type
         * @param {boolean} boosted
         * @param {string} shard
         * @returns {Object}
         */
        createInvader (room, x, y, size, type, boosted = false, shard = DEFAULT_SHARD) {
          return self.req('POST', '/api/game/create-invader', { room, x, y, size, type, boosted, shard })
        },
        /**
         * POST /api/game/remove-invader
         * @param {string} _id
         * @param {string} shard
         * @returns {Object}
         */
        removeInvader (_id, shard = DEFAULT_SHARD) {
          return self.req('POST', '/api/game/remove-invader', { _id, shard })
        },
        /**
         * GET /api/game/time
         * @param {string} shard
         * @returns {{ ok:number, time:number }}
         */
        time (shard = DEFAULT_SHARD) {
          return self.req('GET', '/api/game/time', { shard })
        },
        /**
         * GET /api/game/world-size
         * @param {string} shard
         * @returns {Object}
         */
        worldSize (shard = DEFAULT_SHARD) {
          return self.req('GET', '/api/game/world-size', { shard })
        },
        /**
         * GET /api/game/room-decorations
         * @param {string} room
         * @param {string} shard
         * @returns {Object}
         */
        roomDecorations (room, shard = DEFAULT_SHARD) {
          return self.req('GET', '/api/game/room-decorations', { room, shard })
        },
        /**
         * GET /api/game/room-objects
         * @param {string} room
         * @param {string} shard
         * @returns {Object}
         */
        roomObjects (room, shard = DEFAULT_SHARD) {
          return self.req('GET', '/api/game/room-objects', { room, shard })
        },
        /**
         * @param {string} room
         * @param {*} encoded can be anything non-empty
         * @param {string} shard
         * @returns {{ ok, terrain: [ { room:string, x:number, y:number, type:"wall"|"swamp" } ] }
         * | { ok, terrain: [ { _id,room:string, terrain:string, type:"wall"|"swamp" } ] }}
         * terrain is a string of digits, giving the terrain left-to-right and top-to-bottom
         * 0: plain, 1: wall, 2: swamp, 3: also wall
         */
        roomTerrain (room, encoded = 1, shard = DEFAULT_SHARD) {
          return self.req('GET', '/api/game/room-terrain', { room, encoded, shard })
        },
        /**
         * @param {string} room
         * @param {string} shard
         * @returns {{ _id, status:"normal"|"out of borders"|string, novice:string }}
         * `status` can at least be "normal" or "out of borders"
         * if the room is in a novice area, novice will contain the Unix timestamp of the end of the protection (otherwise it is absent)
         */
        roomStatus (room, shard = DEFAULT_SHARD) {
          return self.req('GET', '/api/game/room-status', { room, shard })
        },
        /**
         * GET /api/game/room-overview
         * @param {string} room
         * @param {number} interval
         * @param {string} shard
         * @returns {Object}
         */
        roomOverview (room, interval = 8, shard = DEFAULT_SHARD) {
          return self.req('GET', '/api/game/room-overview', { room, interval, shard })
        },
        market: {
          /**
           * GET /api/game/market/orders-index
           * @param {string} shard
           * @returns {{ok:1,list:[{_id:string,count:number}]}}
           * - _id is the resource type, and there will only be one of each type.
           * - `count` is the number of orders.
           */
          ordersIndex (shard = DEFAULT_SHARD) {
            return self.req('GET', '/api/game/market/orders-index', { shard })
          },
          /**
           * GET /api/game/market/my-orders
           * @returns {{ ok:number, list: [ { _id, created, user, active, type, amount, remainingAmount, resourceType, price, totalAmount, roomName } ] }}
           * `resourceType` is one of the RESOURCE_* constants.
           */
          myOrders () {
            return self.req('GET', '/api/game/market/my-orders').then(self.mapToShard)
          },
          /**
           * GET /api/game/market/orders
           * @param {string} resourceType one of the RESOURCE_* constants.
           * @param {string} shard
           * @returns {{ ok:number, list: [ { _id, created, user, active, type, amount, remainingAmount, resourceType, price, totalAmount, roomName } ] }}
           * `resourceType` is one of the RESOURCE_* constants.
           */
          orders (resourceType, shard = DEFAULT_SHARD) {
            return self.req('GET', '/api/game/market/orders', { resourceType, shard })
          },
          /**
           * GET /api/game/market/stats
           * @param {*} resourceType
           * @param {string} shard
           * @returns {Object}
           */
          stats (resourceType, shard = DEFAULT_SHARD) {
            return self.req('GET', '/api/game/market/stats', { resourceType, shard })
          }
        },
        shards: {
          /**
           * GET /api/game/shards/info
           * @returns {{ok:number, shards:[{name:string,lastTicks:number[],cpuLimimt:number,rooms:number,users:number,tick:number}]}}
           */
          info () {
            return self.req('GET', '/api/game/shards/info')
          }
        }
      },
      leaderboard: {
        /**
         * GET /api/leaderboard/list
         * @param {number} limit
         * @param {"world"|"power"} mode
         * @param {number?} offset
         * @param {string?} season
         * @returns {{ ok, list: [ { _id, season, user, score, rank } ], count, users: { <user's _id>: { _id, username, badge: { type, color1, color2, color3, param, flip }, gcl } } }}
         */
        list (limit = 10, mode = 'world', offset = 0, season) {
          if (mode !== 'world' && mode !== 'power') throw new Error('incorrect mode parameter')
          if (!season) season = self.currentSeason()
          return self.req('GET', '/api/leaderboard/list', { limit, mode, offset, season })
        },
        /**
         * GET /api/leaderboard/find
         * @param {string} username
         * @param {"world"|string} mode
         * @param {string?} season An optional date in the format YYYY-MM, if not supplied all ranks in all seasons is returned.
         * @returns {{ ok, _id, season, user, score, rank }}
         * - `user` (not `_id`) is the user's _id, as returned by `me` and `user/find`
         * - `rank` is 0-based
         */
        find (username, mode = 'world', season = '') {
          return self.req('GET', '/api/leaderboard/find', { season, mode, username })
        },
        /**
         * GET /api/leaderboard/seasons
         * @returns {{ ok, seasons: [ { _id, name, date } ] }}
         * The _id returned here is used for the season name in the other leaderboard calls
         */
        seasons () {
          return self.req('GET', '/api/leaderboard/seasons')
        }
      },
      user: {
        /**
         * @param {Badge} badge
         * @returns {{ ok?:number,error?:string}}
         */
        badge (badge) {
          return self.req('POST', '/api/user/badge', { badge })
        },
        /**
         * POST /api/user/respawn
         * @returns {Object}
         */
        respawn () {
          return self.req('POST', '/api/user/respawn')
        },
        /**
         * POST /api/user/set-active-branch
         * @param {string} branch
         * @param {string} activeName
         * @returns {Object}
         */
        setActiveBranch (branch, activeName) {
          return self.req('POST', '/api/user/set-active-branch', { branch, activeName })
        },
        /**
         * POST /api/user/clone-branch
         * @param {string} branch
         * @param {string} newName
         * @param {*} defaultModules
         * @returns {Object}
         */
        cloneBranch (branch, newName, defaultModules) {
          return self.req('POST', '/api/user/clone-branch', { branch, newName, defaultModules })
        },
        /**
         * POST /api/user/delete-branch
         * @param {string} branch
         * @returns {Object}
         */
        deleteBranch (branch) {
          return self.req('POST', '/api/user/delete-branch', { branch })
        },
        /**
         * POST /api/user/notify-prefs
         * @param {*} prefs
         * @returns {Object}
         */
        notifyPrefs (prefs) {
          // disabled,disabledOnMessages,sendOnline,interval,errorsInterval
          return self.req('POST', '/api/user/notify-prefs', prefs)
        },
        /**
         * POST /api/user/tutorial-done
         * @returns {Object}
         */
        tutorialDone () {
          return self.req('POST', '/api/user/tutorial-done')
        },
        /**
         * POST /api/user/email
         * @param {string} email
         * @returns {Object}
         */
        email (email) {
          return self.req('POST', '/api/user/email', { email })
        },
        /**
         * GET /api/user/world-start-room
         * @param {string} shard
         * @returns {Object}
         */
        worldStartRoom (shard) {
          return self.req('GET', '/api/user/world-start-room', { shard })
        },
        /**
         * returns a world status
         * - 'normal'
         * - 'lost' when you loose all your spawns
         * - 'empty' when you have respawned and not placed your spawn yet
         * @returns {{ ok: number; status: "normal" | "lost" | "empty" }} */
        worldStatus () {
          return self.req('GET', '/api/user/world-status')
        },
        /**
         * GET /api/user/branches
         * @returns {{ ok:number, list: [{
         *   _id: string;
         *   branch: string;
         *   activeWorld: boolean;
         *   activeSim: boolean;
         * }]}
         * }
         */
        branches () {
          return self.req('GET', '/api/user/branches')
        },
        code: {
          /**
           * GET /api/user/code
           * for pushing or pulling code, as documented at https://screeps.com/forum/topic/3313/api-user-code-endpoint-with-private-servers/3
           * @param {string} branch
           * @returns code
           */
          get (branch) {
            return self.req('GET', '/api/user/code', { branch })
          },
          /**
           * POST /api/user/code
           * for pushing or pulling code, as documented at https://screeps.com/forum/topic/3313/api-user-code-endpoint-with-private-servers/3
           * @param {string} branch
           * @param {*} modules
           * @param {*} _hash
           * @returns {Object}
           */
          set (branch, modules, _hash) {
            if (!_hash) _hash = Date.now()
            return self.req('POST', '/api/user/code', { branch, modules, _hash })
          }
        },
        decorations: {
          /**
           * GET /api/user/decorations/inventory
           * @returns {Object}
           */
          inventory () {
            return self.req('GET', '/api/user/decorations/inventory')
          },
          /**
           * GET /api/user/decorations/themes
           * @returns {Object}
           */
          themes () {
            return self.req('GET', '/api/user/decorations/themes')
          },
          /**
           * POST /api/user/decorations/convert
           * @param {*} decorations decorations is a string array of ids
           * @returns {Object}
           */
          convert (decorations) {
            return self.req('POST', '/api/user/decorations/convert', { decorations })
          },
          /**
           * POST /api/user/decorations/pixelize
           * @param {number} count
           * @param {string} theme
           * @returns {Object}
           */
          pixelize (count, theme = '') {
            return self.req('POST', '/api/user/decorations/pixelize', { count, theme })
          },
          /**
           * POST /api/user/decorations/activate
           * @param {string} _id
           * @param {*} active
           * @returns {Object}
           */
          activate (_id, active) {
            return self.req('POST', '/api/user/decorations/activate', { _id, active })
          },
          /**
           * POST /api/user/decorations/deactivate
           * @param {*} decorations decorations is a string array of ids
           * @returns {Object}
           */
          deactivate (decorations) {
            return self.req('POST', '/api/user/decorations/deactivate', { decorations })
          }
        },
        /**
         * GET /api/user/respawn-prohibited-rooms
         * @returns {{ ok, rooms: [  ] }}
         * - `room` is an array, but seems to always contain only one element
         */
        respawnProhibitedRooms () {
          return self.req('GET', '/api/user/respawn-prohibited-rooms')
        },
        memory: {
          /**
           * GET /api/user/memory?path={path}
           * @param {string} path the path may be empty or absent to retrieve all of Memory, Example: flags.Flag1
           * @param {string} shard
           * @returns {string} gz: followed by base64-encoded gzipped JSON encoding of the requested memory path
           */
          get (path, shard = DEFAULT_SHARD) {
            return self.req('GET', '/api/user/memory', { path, shard })
          },
          /**
           * POST /api/user/memory
           * @param {string} path the path may be empty or absent to retrieve all of Memory, Example: flags.Flag1
           * @param {*} value
           * @param {string} shard
           * @returns {{ ok, result: { ok, n }, ops: [ { user, expression, hidden } ], data, insertedCount, insertedIds }}
           */
          set (path, value, shard = DEFAULT_SHARD) {
            return self.req('POST', '/api/user/memory', { path, value, shard })
          },
          segment: {
            /**
             * GET /api/user/memory-segment?segment=[0-99]
             * @param {number} segment A number from 0-99
             * @param {string} shard
             * @returns {{ ok, data: string }}
             */
            get (segment, shard = DEFAULT_SHARD) {
              return self.req('GET', '/api/user/memory-segment', { segment, shard })
            },
            /**
             * POST /api/user/memory-segment
             * @param {number} segment A number from 0-99
             * @param {*} data
             * @param {string} shard
             * @returns {Object}
             */
            set (segment, data, shard = DEFAULT_SHARD) {
              return self.req('POST', '/api/user/memory-segment', { segment, data, shard })
            }
          }
        },
        /**
         * GET /api/user/find?username={username}
         * @param {string} username
         * @returns {{ ok, user: { _id, username, badge: Badge, gcl } }}
         */
        find (username) {
          return self.req('GET', '/api/user/find', { username })
        },
        /**
         * GET /api/user/find?id={userId}
         * @param {string} id
         * @returns {{ ok, user: { _id, username, badge: Badge, gcl } }}
         */
        findById (id) {
          return self.req('GET', '/api/user/find', { id })
        },
        /**
         * GET /api/user/stats
         * @param {number} interval
         * @returns {Object}
         */
        stats (interval) {
          return self.req('GET', '/api/user/stats', { interval })
        },
        /**
         * GET /api/user/rooms
         * @param {string} id
         * @returns {Object}
         */
        rooms (id) {
          return self.req('GET', '/api/user/rooms', { id }).then(self.mapToShard)
        },
        /**
         * GET /api/user/overview?interval={interval}&statName={statName}
         * @param {number} interval
         * @param {string} statName energyControl
         * @returns {{{ ok, rooms: [ <room name> ], stats: { <room name>: [ { value, endTime } ] }, statsMax }}}
         */
        overview (interval, statName) {
          return self.req('GET', '/api/user/overview', { interval, statName })
        },
        /**
         * GET /api/user/money-history
         * @param {number} page Used for pagination
         * @returns {{"ok":1,"page":0,"list":[ { _id, date, tick, user, type, balance, change, market: {} } ] }}
         * - page used for pagination.
         * - hasMore is true if there are more pages to view.
         * - market
         *   - New Order- { order: { type, resourceType, price, totalAmount, roomName } }
         *   - Extended Order- { extendOrder: { orderId, addAmount } }
         *   - Fulfilled Order- { resourceType, roomName, targetRoomName, price, npc, amount }
         *   - Price Change - { changeOrderPrice: { orderId, oldPrice, newPrice } }
         */
        moneyHistory (page = 0) {
          return self.req('GET', '/api/user/money-history', { page })
        },
        /**
         * POST /api/user/console
         * @param {*} expression
         * @param {string} shard
         * @returns {{ ok, result: { ok, n }, ops: [ { user, expression, _id } ], insertedCount, insertedIds: [ <mongodb id> ] }}
         */
        console (expression, shard = DEFAULT_SHARD) {
          return self.req('POST', '/api/user/console', { expression, shard })
        },
        /**
         * GET /api/user/name
         * @returns {Object}
         */
        name () {
          return self.req('GET', '/api/user/name')
        }
      },
      experimental: {
        // https://screeps.com/api/experimental/pvp?start=14787157 seems to not be implemented in the api
        /**
         * @param {number} interval
         * @returns {{ ok, time, rooms: [ { _id, lastPvpTime } ] }}
         * time is the current server tick
         * _id contains the room name for each room, and lastPvpTime contains the last tick pvp occurred
         * if neither a valid interval nor a valid start argument is provided, the result of the call is still ok, but with an empty rooms array.
         */
        pvp (interval = 100) {
          return self.req('GET', '/api/experimental/pvp', { interval }).then(self.mapToShard)
        },
        /**
         * GET /api/experimental/nukes
         * @returns {Object}
         */
        nukes () {
          return self.req('GET', '/api/experimental/nukes').then(self.mapToShard)
        }
      },
      warpath: {
        /**
         * GET /api/warpath/battles
         * @param {number} interval
         * @returns {Object}
         */
        battles (interval = 100) {
          return self.req('GET', '/api/warpath/battles', { interval })
        }
      },
      scoreboard: {
        /**
         * GET /api/scoreboard/list
         * @param {number} limit
         * @param {number} offset
         * @returns {Object}
         */
        list (limit = 20, offset = 0) {
          return self.req('GET', '/api/scoreboard/list', { limit, offset })
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
      if (err.response) {
        throw new Error(res.data)
      }
      throw new Error(err.message)
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

/**
 * @typedef {{
 *   "color1": string;
 *   "color2": string;
 *   "color3": string;
 *   "flip": boolean;
 *   "param": number;
 *   "type": number|{ path1:string, path2:string};
 *}} Badge
 */

/**
 * @typedef {1|2|3|4|5|6|7|8|9|10} FlagColor
 * - Red = 1,
 * - Purple = 2,
 * - Blue = 3,
 * - Cyan = 4,
 * - Green = 5,
 * - Yellow = 6,
 * - Orange = 7,
 * - Brown = 8,
 * - Grey = 9,
 * - White = 10
 */
