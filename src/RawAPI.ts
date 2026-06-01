/* eslint-disable @typescript-eslint/no-unsafe-return */
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import Debug from 'debug'
import { EventEmitter } from 'node:events'
import URL from 'node:url'
import utils from 'node:util'
import zlib from 'zlib'
import { FlagColor } from './Api'

const debugHttp = Debug('screepsapi:http')
const debugRateLimit = Debug('screepsapi:ratelimit')

const { format } = URL

const gunzipAsync = utils.promisify(zlib.gunzip)
const inflateAsync = utils.promisify(zlib.inflate)

const DEFAULT_SHARD = 'shard0'
const OFFICIAL_HISTORY_INTERVAL = 100
const PRIVATE_HISTORY_INTERVAL = 20

export async function sleep(ms: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms))
}

export class RawAPI extends EventEmitter {
  readonly raw = {
    /** GET /api/version */
    version: (): Promise<Api.VersionResponse> => {
      return this.req('GET', '/api/version')
    },

    /** GET /api/authmod */
    authmod: (): Promise<Api.AuthModResponse> => {
      if (this.isOfficialServer()) {
        return Promise.resolve({ ok: 1, name: 'official' })
      }
      return this.req('GET', '/api/authmod')
    },

    /**
     * Official:
     * GET /room-history/${shard}/${room}/${tick}.json
     * Private:
     * GET /room-history
     * @returns A json file with history data
     */
    history: (room: string, tick: number, shard = DEFAULT_SHARD): Promise<Api.RoomHistoryResponse> => {
      if (this.isOfficialServer()) {
        tick -= tick % OFFICIAL_HISTORY_INTERVAL
        return this.req('GET', `/room-history/${shard}/${room}/${tick}.json`)
      } else {
        tick -= tick % PRIVATE_HISTORY_INTERVAL
        return this.req('GET', '/room-history', { room, time: tick })
      }
    },

    servers: {
      /**
       * A list of curated community servers
       * POST /api/servers/list
       */
      list: (): Promise<Api.ServerListResponse> => {
        return this.req('POST', '/api/servers/list', {})
      }
    },

    auth: {
      /** POST /api/auth/signin */
      signin: (email: string, password: string): Promise<Api.AuthSigninResponse> => {
        return this.req('POST', '/api/auth/signin', { email, password })
      },

      /** POST /api/auth/steam-ticket */
      steamTicket: (ticket: unknown, useNativeAuth = false): Promise<Api.UnknownResponse> => {
        return this.req('POST', '/api/auth/steam-ticket', { ticket, useNativeAuth })
      },

      /** GET /api/auth/me */
      me: (): Promise<Api.AuthMeResponse> => {
        return this.req('GET', '/api/auth/me')
      },

      /**
       * Queries the status/permissions of an API token.
       * Raises an error if the token is invalid / not recognized.
       *
       * GET /api/auth/query-token
       */
      queryToken: (token: string): Promise<Api.AuthQueryTokenResponse> => {
        return this.req('GET', '/api/auth/query-token', { token })
      }
    },

    register: {
      /** GET /api/register/check-email */
      checkEmail: (email: string): Promise<Api.UnknownResponse> => {
        return this.req('GET', '/api/register/check-email', { email })
      },

      /** GET /api/register/check-username */
      checkUsername: (username: string): Promise<Api.UnknownResponse> => {
        return this.req('GET', '/api/register/check-username', { username })
      },

      /** POST /api/register/set-username */
      setUsername: (username: string): Promise<Api.UnknownResponse> => {
        return this.req('POST', '/api/register/set-username', { username })
      },

      /** POST /api/register/submit */
      submit: (username: string, email: string, password: string, modules: unknown): Promise<Api.UnknownResponse> => {
        return this.req('POST', '/api/register/submit', { username, email, password, modules })
      }
    },

    game: {
      /**
       * Fetches a stat for one or more rooms, along with
       * basic information like its owner and RCL
       *
       * POST /api/game/map-stats
       *
       * @param rooms An array of room names
       * @param statName the ID of the stat to fetch
       * @param shard
       */
      mapStats: async <S extends Api.MapStat>(rooms: string[], statName: S, shard = DEFAULT_SHARD): Promise<Api.GameMapStatsResponse<S>> => {
        return this.req('POST', '/api/game/map-stats', { rooms, statName, shard })
      },

      /**
       * POST /api/game/gen-unique-object-name
       * @param type the type of object for which to generate the name (ex: "flag" or "spawn")
       * @param shard
       */
      genUniqueObjectName: (type: string, shard = DEFAULT_SHARD): Promise<Api.GameGenUniqueNameResponse> => {
        return this.req('POST', '/api/game/gen-unique-object-name', { type, shard })
      },

      /** POST /api/game/check-unique-object-name */
      checkUniqueObjectName: (type: string, name: string, shard = DEFAULT_SHARD): Promise<Api.UnknownResponse> => {
        return this.req('POST', '/api/game/check-unique-object-name', { type, name, shard })
      },

      /** POST /api/game/place-spawn */
      placeSpawn: (room: string, x: number, y: number, name: string, shard: string | null = DEFAULT_SHARD): Promise<Api.UnknownResponse> => {
        return this.req('POST', '/api/game/place-spawn', { name, room, x, y, shard })
      },

      /**
       * - if the name is new, result.upserted[0]._id is the game id of the created flag
       * - if not, this moves the flag and the response does not contain the id (but the id doesn't change)
       * - `connection` looks like some internal MongoDB thing that is irrelevant to us
       *
       * POST /api/game/create-flag
       */
      createFlag: (room: string, x: number, y: number, name: string, color: FlagColor = 1, secondaryColor: FlagColor = 1, shard = DEFAULT_SHARD): Promise<Api.DbUpsertedResponse> => {
        return this.req('POST', '/api/game/create-flag', { name, room, x, y, color, secondaryColor, shard })
      },

      /** POST/api/game/gen-unique-flag-name */
      genUniqueFlagName: (shard = DEFAULT_SHARD): Promise<Api.GameGenUniqueNameResponse> => {
        return this.req('POST', '/api/game/gen-unique-flag-name', { shard })
      },

      /** POST /api/game/check-unique-flag-name */
      checkUniqueFlagName: (name: string, shard = DEFAULT_SHARD): Promise<Api.UnknownResponse> => {
        return this.req('POST', '/api/game/check-unique-flag-name', { name, shard })
      },

      /** POST /api/game/change-flag-color */
      changeFlagColor: (color: FlagColor = 1, secondaryColor: FlagColor = 1, shard = DEFAULT_SHARD): Promise<Api.DbModifiedResponse> => {
        return this.req('POST', '/api/game/change-flag-color', { color, secondaryColor, shard })
      },

      /** POST /api/game/remove-flag */
      removeFlag: (room: string, name: string, shard = DEFAULT_SHARD): Promise<Api.Response> => {
        return this.req('POST', '/api/game/remove-flag', { name, room, shard })
      },

      /**
       * This method is used for a variety of actions, depending on the `name` and `intent` parameters
       *
       * POST /api/game/add-object-intent
       *
       * @param _id the ID of the object that should perform the intent
       * @param room the name of the room the object is in
       * @param name name of the intent (ex: 'move')
       * @param intent JSON string describing the target(s) of the intent (for actions like 'heal' or 'build')
       *
       * @example remove flag: name = "remove", intent = {}
       * @example destroy structure: _id = "room", name = "destroyStructure", intent = [ {id: <structure id>, roomName, <room name>, user: <user id>} ]
can destroy multiple structures at once
        * @example suicide creep: name = "suicide", intent = {id: <creep id>}
        * @example unclaim controller: name = "unclaim", intent = {id: <controller id>}
intent can be an empty object for suicide and unclaim, but the web interface sends the id in it, as described
        * @example remove construction site: name = "remove", intent = {}
        */
      addObjectIntent: (_id: string, room: string, name: string, intent?: string, shard = DEFAULT_SHARD): Promise<Api.DbUpsertedResponse> => {
        return this.req('POST', '/api/game/add-object-intent', { _id, room, name, intent, shard })
      },

      /**
       * POST /api/game/create-construction
       * @param structureType the same value as one of the in-game STRUCTURE_* constants ('road', 'spawn', etc.)
       */
      createConstruction: (room: string, x: number, y: number, structureType: Api.BuildableStructureConstant, name: string, shard = DEFAULT_SHARD): Promise<Api.GameCreateConstructionResponse> => {
        return this.req('POST', '/api/game/create-construction', { room, x, y, structureType, name, shard })
      },

      /**
       * POST /api/game/set-notify-when-attacked
       * @param enabled is either true or false (literal values, not strings)
       */
      setNotifyWhenAttacked: (_id: string, enabled = true, shard = DEFAULT_SHARD): Promise<Api.DbModifiedResponse> => {
        return this.req('POST', '/api/game/set-notify-when-attacked', { _id, enabled, shard })
      },

      /** POST /api/game/create-invader */
      createInvader: (room: string, x: number, y: number, size: 'Melee' | 'Ranged' | 'Healer', type: 'small' | 'big', boosted = false, shard = DEFAULT_SHARD): Promise<Api.UnknownResponse> => {
        return this.req('POST', '/api/game/create-invader', { room, x, y, size, type, boosted, shard })
      },

      /** POST /api/game/remove-invader */
      removeInvader: (_id: string, shard = DEFAULT_SHARD): Promise<Api.UnknownResponse> => {
        return this.req('POST', '/api/game/remove-invader', { _id, shard })
      },

      /** GET /api/game/time */
      time: (shard = DEFAULT_SHARD): Promise<Api.GameTimeResponse> => {
        return this.req('GET', '/api/game/time', { shard })
      },

      /** GET /api/game/world-size */
      worldSize: (shard = DEFAULT_SHARD): Promise<Api.GameWorldSizeResponse> => {
        return this.req('GET', '/api/game/world-size', { shard })
      },

      /** GET /api/game/room-decorations */
      roomDecorations: (room: string, shard = DEFAULT_SHARD): Promise<Api.GameRoomDecorationsResponse> => {
        return this.req('GET', '/api/game/room-decorations', { room, shard })
      },

      /** GET /api/game/room-objects */
      roomObjects: (room: string, shard = DEFAULT_SHARD): Promise<Api.GameRoomObjectsResponse> => {
        return this.req('GET', '/api/game/room-objects', { room, shard })
      },

      /**
       * GET /api/game/room-terrain
       * Returns results in "encoded" form (see return type documentation)
       */
      roomTerrain: (room: string, shard = DEFAULT_SHARD): Promise<Api.GameRoomTerrainEncodedResponse> => {
        return this.req('GET', '/api/game/room-terrain', { room, encoded: 1, shard })
      },

      /**
       * GET /api/game/room-terrain
       * Returns results in "unencoded" form (see return type documentation)
       */
      roomTerrainUnencoded: (room: string, shard = DEFAULT_SHARD): Promise<Api.GameRoomTerrainUnencodedResponse> => {
        return this.req('GET', '/api/game/room-terrain', { room, shard })
      },

      /** GET /api/game/room-status */
      roomStatus: (room: string, shard = DEFAULT_SHARD): Promise<Api.GameRoomStatusResponse> => {
        return this.req('GET', '/api/game/room-status', { room, shard })
      },

      /**
       * Get the authenticated user's stats for a room broken down by time.
       *
       * GET /api/game/room-overview
       *
       * @param interval size of each time slot in minutes; only specific values are allowed:
       * - 8: 8 minutes each; 64 minutes total
       * - 180: 3 hours each; 24 hours total
       * - 1440: 24 hours each; 8 days total
       */
      roomOverview: (room: string, interval: Api.RoomStatInterval = 8, shard = DEFAULT_SHARD): Promise<Api.GameRoomOverviewResponse> => {
        return this.req('GET', '/api/game/room-overview', { room, interval, shard })
      },

      market: {
        /**
         * Get an overview of market data for a shard.
         * Intershard market data is always included, if available.
         *
         * GET /api/game/market/orders-index
         */
        ordersIndex: (shard = DEFAULT_SHARD): Promise<Api.GameMarketIndexResponse> => {
          return this.req('GET', '/api/game/market/orders-index', { shard })
        },

        /** GET /api/game/market/my-orders */
        myOrders: (): Promise<Api.GameMarketMyOrdersResponse> => {
          return this.req('GET', '/api/game/market/my-orders').then(this.mapToShard)
        },

        /**
         * GET /api/game/market/orders
         * @param shard if {@link resourceType} is an {@link IntershardResourceConstant}, this must be set to `undefined`
         */
        orders: (resourceType: Api.MarketResourceConstant, shard = DEFAULT_SHARD): Promise<Api.GameMarketOrdersResponse> => {
          return this.req('GET', '/api/game/market/orders', { resourceType, shard })
        },

        /** GET /api/game/market/stats */
        stats: (resourceType: Api.MarketResourceConstant, shard = DEFAULT_SHARD): Promise<Api.GameMarketStatsResponse> => {
          return this.req('GET', '/api/game/market/stats', { resourceType, shard })
        }
      },

      shards: {
        /** GET /api/game/shards/info */
        info: (): Promise<Api.GameShardsInfoResponse> => {
          return this.req('GET', '/api/game/shards/info')
        }
      }
    },

    leaderboard: {
      /**
       * GET /api/leaderboard/list
       * @param mode 'world' (control points) or 'power' (power processed)
       * @param season A date in the format `YYYY-MM`, NOT a seasonal world name/number
       */
      list: (limit = 10, mode: 'world' | 'power' = 'world', offset: number | null = 0, season?: string): Promise<Api.LeaderboardListResponse> => {
        season ??= this.currentSeason()
        return this.req('GET', '/api/leaderboard/list', { limit, mode, offset, season })
      },

      /**
       * GET /api/leaderboard/find
       * @param mode 'world' (control points) or 'power' (power processed)
       * @param season An optional date in the format YYYY-MM, if not supplied all ranks in all seasons is returned.
       */
      find: (username: string, mode: 'world' | 'power' = 'world', season?: string): Promise<Api.LeaderboardFindResponse> => {
        return this.req('GET', '/api/leaderboard/find', { season, mode, username })
      },

      /**
       * Get a list of all seasons for which leaderboard rankings exist
       * GET /api/leaderboard/seasons
       */
      seasons: (): Promise<Api.LeaderboardSeasonsResponse> => {
        return this.req('GET', '/api/leaderboard/seasons')
      }
    },

    seasons: {
      /**
       * Get data about the current season
       * GET /api/seasons/current
       */
      current: (): Promise<Api.SeasonsCurrentResponse | null> => {
        if (!this.isSeasonServer()) return Promise.resolve(null)
        return this.req('GET', '/api/seasons/current')
      }
    },

    user: {
      /**
       * PTR only: unlock CPU for one week. Does nothing on non-PTR servers.
       * POST /api/user/activate-ptr
       */
      activatePtr: (): Promise<Api.Response> => {
        // Without this check, an `{ error: 'not ptr' }` response is returned
        // on MMO/season, and a 404 error is thrown on unofficial servers
        if (!this.isPtrServer()) {
          return Promise.resolve({ ok: 1 })
        }
        return this.req('POST', '/api/user/activate-ptr')
      },

      /**
       * Update the authenticated user's {@link Badge}.
       * POST /api/user/badge
       */
      badge: (badge: Api.Badge): Promise<Api.DbModifiedResponse> => {
        return this.req('POST', '/api/user/badge', { badge })
      },

      /**
       * Update the authenticated user's shard CPU limits.
       * POST /api/user/cpu-shards
       */
      cpuShards: (cpu: Api.CpuShardLimits): Promise<Api.DbModifiedResponse> => {
        return this.req('POST', '/api/user/cpu-shards', { cpu })
      },

      /**
       * Abandon all of the authenticated user's rooms to allow them
       * to pick a new spawn room.
       * POST /api/user/respawn
       */
      respawn: (): Promise<Api.UnknownResponse> => {
        return this.req('POST', '/api/user/respawn')
      },

      /** POST /api/user/set-active-branch */
      setActiveBranch: (branch: string, activeName: string): Promise<Api.UnknownResponse> => {
        return this.req('POST', '/api/user/set-active-branch', { branch, activeName })
      },

      /** POST /api/user/clone-branch */
      cloneBranch: (branch: string, newName: string, defaultModules: unknown): Promise<Api.UnknownResponse> => {
        return this.req('POST', '/api/user/clone-branch', { branch, newName, defaultModules })
      },

      /** POST /api/user/delete-branch */
      deleteBranch: (branch: string): Promise<Api.UnknownResponse> => {
        return this.req('POST', '/api/user/delete-branch', { branch })
      },

      /**
       * Update the authenticated user's notification preferences
       * POST /api/user/notify-prefs
       */
      notifyPrefs: (prefs: Api.UserNotifyPrefsRequest): Promise<Api.DbModifiedResponse> => {
        return this.req('POST', '/api/user/notify-prefs', prefs)
      },

      /**
       * Mark tutorial as completed for the authenticated user
       * POST /api/user/tutorial-done
       */
      tutorialDone: (): Promise<Api.Response> => {
        return this.req('POST', '/api/user/tutorial-done')
      },

      /**
       * Update the authenticated user's email address
       * POST /api/user/email
       */
      email: (email: string): Promise<Api.UnknownResponse> => {
        return this.req('POST', '/api/user/email', { email })
      },

      /** GET /api/user/world-start-room */
      worldStartRoom: (shard: string): Promise<Api.UserWorldStartRoomResponse> => {
        return this.req('GET', '/api/user/world-start-room', { shard })
      },

      /**
       * Get the authenticated user's status on this server
       * GET /api/user/world-status
       */
      worldStatus: (): Promise<Api.UserWorldStatusResponse> => {
        return this.req('GET', '/api/user/world-status')
      },

      /** GET /api/user/branches */
      branches: (): Promise<Api.UserBranchesResponse> => {
        return this.req('GET', '/api/user/branches')
      },

      code: {
        /**
         * Pull the authenticated user's code for a specific branch.
         * Documentation: https://docs.screeps.com/commit.html
         * GET /api/user/code
         */
        get: (branch: string): Promise<Api.UserCodeGetResponse> => {
          return this.req('GET', '/api/user/code', { branch })
        },

        /**
         * Push code to a branch for the authenticated user.
         * Documentation: https://docs.screeps.com/commit.html
         * POST /api/user/code
         */
        set: (params: Api.UserCodeSetRequest): Promise<Api.UnknownResponse> => {
          return this.req('POST', '/api/user/code', params)
        }
      },

      decorations: {
        /** GET /api/user/decorations/inventory */
        inventory: (): Promise<Api.UserDecorationInventoryResponse> => {
          return this.req('GET', '/api/user/decorations/inventory')
        },

        /** GET /api/user/decorations/themes */
        themes: (): Promise<Api.UserDecorationThemesResponse> => {
          return this.req('GET', '/api/user/decorations/themes')
        },

        /** POST /api/user/decorations/convert */
        convert: (decorations: string[]): Promise<Api.UnknownResponse> => {
          return this.req('POST', '/api/user/decorations/convert', { decorations })
        },

        /** POST /api/user/decorations/pixelize */
        pixelize: (count: number, theme = ''): Promise<Api.UnknownResponse> => {
          return this.req('POST', '/api/user/decorations/pixelize', { count, theme })
        },

        /**
         * Applies a decoration to a creep/object/room
         * POST /api/user/decorations/activate
         * @param _id the {@link DecorationInstance} to activate
         * @param active values to assign to configurable {@link Decoration.props|properties}
         */
        activate: (_id: string, active: object): Promise<Api.UnknownResponse> => {
          return this.req('POST', '/api/user/decorations/activate', { _id, active })
        },

        /**
         * Removes one or more applied decoratoins
         * POST /api/user/decorations/deactivate
         */
        deactivate: (decorations: string[]): Promise<Api.UnknownResponse> => {
          return this.req('POST', '/api/user/decorations/deactivate', { decorations })
        }
      },

      /** GET /api/user/respawn-prohibited-rooms */
      respawnProhibitedRooms: (): Promise<Api.UserRespawnProhibitedRoomsResponse> => {
        return this.req('GET', '/api/user/respawn-prohibited-rooms')
      },

      memory: {
        /**
         * Retrieves part or all of the authenticated user's Memory object
         * GET /api/user/memory
         * @param path the portion of the Memory JSON object to retrieve (ex: 'flags.Flag1');
         *  if undefined/empty, returns the entire Memory object
         * @returns the prefix `'gz:'` followed by the base64-encoded gzipped JSON encoding of the requested memory path
         */
        get: (path?: string, shard = DEFAULT_SHARD): Promise<string> => {
          return this.req('GET', '/api/user/memory', { path, shard })
        },

        /**
         * POST /api/user/memory
         * @param path the portion of the Memory JSON object to write (ex: 'flags.Flag1');
         *  if undefined/empty, returns the entire Memory object
         * @param {string} shard
         * @returns {{ ok, result: { ok, n }, ops: [ { user, expression, hidden } ], data, insertedCount, insertedIds }}
         */
        set: (path: string | undefined, value: unknown, shard = DEFAULT_SHARD): Promise<Api.UserMemorySetResponse> => {
          return this.req('POST', '/api/user/memory', { path, value, shard })
        },

        segment: {
          /**
           * GET /api/user/memory-segment
           * @param segment A number from 0-99
           */
          get: (segment: number | string, shard = DEFAULT_SHARD): Promise<Api.UserMemorySegmentGetResponse> => {
            return this.req('GET', '/api/user/memory-segment', { segment, shard })
          },

          /**
           * POST /api/user/memory-segment
           * @param segment A number from 0-99
           */
          set: (segment: number | string, data: unknown, shard = DEFAULT_SHARD): Promise<Api.UnknownResponse> => {
            return this.req('POST', '/api/user/memory-segment', { segment, data, shard })
          }
        }
      },

      messages: {
        /**
         * GET /api/user/messages/list?respondent={userId}
         * @param respondent the long `_id` of the user, not the username
         */
        list: (respondent: string): Promise<Api.UserMessagesListResponse> => {
          return this.req('GET', '/api/user/messages/list', { respondent })
        },

        /**
         * Gets the last message from every thread this user is in
         * GET /api/user/messages/index
         */
        index: (): Promise<Api.UserMessagesIndexResponse> => {
          return this.req('GET', '/api/user/messages/index')
        },

        /** GET /api/user/messages/unread-count */
        unreadCount: (): Promise<Api.UserMessagesUnreadCountResponse> => {
          return this.req('GET', '/api/user/messages/unread-count')
        },

        /**
         * POST /api/user/messages/send
         * @param respondent the long `_id` of the user, not the username
         */
        send: (respondent: string, text: string): Promise<Api.UnknownResponse> => {
          return this.req('POST', '/api/user/messages/send', { respondent, text })
        },

        /**
         * POST /api/user/messages/mark-read
         * @param id
         */
        markRead: (id: string): Promise<Api.UserMessagesMarkReadResponse> => {
          return this.req('POST', '/api/user/messages/mark-read', { id })
        }
      },

      /** GET /api/user/find?username={username} */
      find: (username: string): Promise<Api.UserFindResponse> => {
        return this.req('GET', '/api/user/find', { username })
      },

      /** GET /api/user/find?id={userId} */
      findById: (id: string): Promise<Api.UserFindResponse> => {
        return this.req('GET', '/api/user/find', { id })
      },

      /** GET /api/user/stats */
      stats: (interval: number): Promise<Api.UnknownResponse> => {
        return this.req('GET', '/api/user/stats', { interval })
      },

      /**
       * Find all rooms claimed by the specified player.
       * GET /api/user/rooms
       */
      rooms: (id: string): Promise<Api.UserRoomsResponse> => {
        return this.req('GET', '/api/user/rooms', { id }).then(this.mapToShard)
      },

      /**
       * Get an overview of the authenticated user's stats broken down by room and time
       * GET /api/user/overview
       * @param interval size of each time slot in minutes; only specific values are allowed:
       * - 8: 8 minutes each; 64 minutes total
       * - 180: 3 hours each; 24 hours total
       * - 1440: 24 hours each; 8 days total
       * @param statName the stat to view for this user
       */
      overview: (interval: Api.RoomStatInterval = 8, statName: Api.RoomStat = 'energyControl'): Promise<Api.UserOverviewResponse> => {
        return this.req('GET', '/api/user/overview', { interval, statName })
      },

      /**
       * GET /api/user/money-history
       * @param page Used for pagination
       */
      moneyHistory: (page = 0): Promise<Api.UserMoneyHistoryResponse> => {
        return this.req('GET', '/api/user/money-history', { page })
      },

      /** POST /api/user/console */
      console: (expression: string, shard = DEFAULT_SHARD): Promise<Api.UserConsoleResponse> => {
        return this.req('POST', '/api/user/console', { expression, shard })
      },

      /** GET /api/user/name */
      name: (): Promise<Api.UserNameResponse> => {
        return this.req('GET', '/api/user/name')
      }
    },

    experimental: {
      /**
       * Find rooms where attack actions have recently occurred
       * (including combat actions against NPCs)
       * GET /api/experimental/pvp
       * @param interval minimum time (in ticks?) since last combat action
       */
      pvp: (interval = 100): Promise<Api.ExperimentalPvpResponse> => {
        return this.req('GET', '/api/experimental/pvp', { interval }).then(this.mapToShard)
      },

      /**
       * Find all active nuclear launches
       * GET /api/experimental/nukes
       */
      nukes: (): Promise<Api.ExperimentalNukesResponse> => {
        return this.req('GET', '/api/experimental/nukes').then(this.mapToShard)
      }
    },

    warpath: {
      /**
       * GET /api/warpath/battles
       * @param interval
       */
      battles: (interval = 100): Promise<Api.UnknownResponse> => {
        return this.req('GET', '/api/warpath/battles', { interval })
      }
    },

    scoreboard: {
      /** GET /api/scoreboard/list */
      list: (limit = 20, offset = 0): Promise<Api.ScoreboardListResponse> => {
        return this.req('GET', '/api/scoreboard/list', { limit, offset })
      }
    }
  }

  opts: Api.ServerConfig = {}
  token?: string
  protected http?: AxiosInstance
  private __authed = false

  constructor(opts?: Api.ServerConfig) {
    super()
    this.setServer(opts ?? {})
  }

  /**
   * Get the current leaderboard season (not the current seasonal world season)
   */
  currentSeason(): string {
    const now = new Date()
    const year = now.getFullYear()
    let month = (now.getUTCMonth() + 1).toString()
    if (month.length === 1) month = `0${month}`
    return `${year}-${month}`
  }

  /**
   * True if this client is configured for the official world, PTR,
   * or seasonal world servers
   */
  isOfficialServer(): boolean {
    return !!this.opts?.url?.match(/screeps\.com/)
  }

  /** True if this client is configured for the seasonal world server */
  isSeasonServer(): boolean {
    return !!this.opts?.url?.match(/screeps\.com\/season/)
  }

  /** True if this client is configured for the public test realm (PTR) server */
  isPtrServer(): boolean {
    return !!this.opts?.url?.match(/screeps\.com\/ptr/)
  }

  protected mapToShard <R extends Response>(this: void, res: R & { shards?: unknown, list?: unknown, rooms?: unknown }): R {
    res.shards ??= {
      privSrv: res.list ?? res.rooms
    }
    return res
  }

  setServer(opts?: Api.ServerConfig) {
    Object.assign(this.opts, opts ?? {})
    if (this.opts.path && !this.opts.pathname) {
      this.opts.pathname = this.opts.path
    }
    if (!this.opts.url) {
      this.opts.url = format(this.opts)
      if (!this.opts.url.endsWith('/')) this.opts.url += '/'
    }
    if (this.opts.token) {
      this.token = this.opts.token
    }
    this.http = axios.create({
      baseURL: this.opts.url
    })
  }

  async auth(email: string, password: string, opts?: Api.ServerConfig) {
    this.setServer(opts)
    if (email && password) {
      Object.assign(this.opts, { email, password })
    }
    if (!this.opts?.email || !this.opts?.password) {
      throw new Error('email or password not provided')
    }
    const res = await this.raw.auth.signin(this.opts.email, this.opts.password)
    this.emit('token', res.token)
    this.emit('auth')
    this.__authed = true
    return res
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async req(method: Api.HttpMethod, path: string, body = {}): Promise<any> {
    if (!this.http) {
      throw new Error('http client not configured')
    }
    const req: AxiosRequestConfig = {
      method,
      url: path,
      headers: {}
    }
    debugHttp(`${method} ${path} ${JSON.stringify(body)}`)
    if (this.token) {
      Object.assign((req.headers as object), {
        'X-Token': this.token,
        'X-Username': this.token
      })
    }
    if (method === 'GET') {
      req.params = body
    } else {
      req.data = body
    }
    try {
      const res = await this.http(req)
      const token = res.headers['x-token'] as string
      if (token) {
        this.emit('token', token)
      }
      const rateLimit = this.buildRateLimit(method, path, res as RateLimitResponse)
      this.emit('rateLimit', rateLimit)
      debugRateLimit(`${method} ${path} ${rateLimit.remaining}/${rateLimit.limit} ${rateLimit.toReset}s`)
      const data = res.data as { data?: unknown }
      if (typeof data.data === 'string' && data.data.startsWith('gz:')) {
        data.data = await this.gz(data.data)
      }
      this.emit('response', res)
      return res.data
    } catch (err) {
      const res = ((err as { response?: AxiosResponse }).response ?? {}) as RateLimitResponse
      const rateLimit = this.buildRateLimit(method, path, res)
      this.emit('rateLimit', rateLimit)
      debugRateLimit(`${method} ${path} ${rateLimit.remaining}/${rateLimit.limit} ${rateLimit.toReset}s`)
      if (res.status === 401) {
        if (this.__authed && this.opts.email && this.opts.password) {
          this.__authed = false
          await this.auth(this.opts.email, this.opts.password)
          return await this.req(method, path, body)
        } else {
          throw new Error('Not Authorized', { cause: err })
        }
      }
      if (res.status === 429 && !res.headers['x-ratelimit-limit'] && this.opts.experimentalRetry429) {
        await sleep(Math.floor(Math.random() * 500) + 200)
        return await this.req(method, path, body)
      }
      if ((err as { response?: AxiosResponse }).response) {
        const details = {
          params: {},
          data: res.data as string,
          headers: res.headers,
          status: res.status,
          statusText: res.statusText
        }
        if (!path.startsWith('/api/auth')) {
          Object.assign(details.params, res.config?.params as object ?? {})
        }
        throw new Error(JSON.stringify(details, undefined, 2), { cause: err })
      }
      throw err
    }
  }

  async gz(data: string): Promise<unknown> {
    const buf = Buffer.from(data.slice(3), 'base64')
    const ret = await gunzipAsync(buf)
    return JSON.parse(ret.toString())
  }

  async inflate(data: string): Promise<unknown> {
    const buf = Buffer.from(data.slice(3), 'base64')
    const ret = await inflateAsync(buf)
    return JSON.parse(ret.toString())
  }

  buildRateLimit(method: Api.HttpMethod, path: string, res: RateLimitResponse) {
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

type RateLimitResponse = AxiosResponse<unknown, unknown, {
  'x-ratelimit-limit': number
  'x-ratelimit-remaining': number
  'x-ratelimit-reset': number
}>
