/* eslint-disable @typescript-eslint/no-unsafe-return */
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import Debug from 'debug'
import { EventEmitter } from 'node:events'
import { setTimeout } from 'node:timers/promises'
import utils from 'node:util'
import zlib from 'zlib'
import { FlagColor } from './Api'

const debugHttp = Debug('screepsapi:http')
const debugRateLimit = Debug('screepsapi:ratelimit')
const debugRateLimitExceeded = Debug('screepsapi:ratelimitexceeded')

const gunzipAsync = utils.promisify(zlib.gunzip)

const OFFICIAL_HISTORY_INTERVAL = 100
const PRIVATE_HISTORY_INTERVAL = 20

export class RawAPI extends EventEmitter {
  /**
   * This object exposes individual HTTP API endpoints as functions grouped by
   * endpoint URL path. All of these endpoint functions are asynchronous.
   *
   * Some of endpoints behave differently on official servers (i.e. any server
   * with the {@link https://screeps.com/ | screeps.com} hostname) than they do
   * on unofficial/private servers. Any such known discrepancies are documented
   * on each endpoint.
   *
   * Almost all endpoints require the user to be authenticated (see {@link auth})
   * to use. Any known exceptions to this rule are documented.
   *
   * All endpoint functions are backed by {@link req}, which provides shared
   * error handling logic, etc. If an endpoint does not have a corresponding
   * function defined here, {@link req} may be called to access that endpoint
   * directly (albeit without request parameter or response type annotations).
   * Please consider submitting a PR to add functions for any missing endpoints!
   * @example
   * // To access the `GET /api/auth/me` endpoint:
   * const me = await api.raw.auth.me()
   * @see {@link Socket} for WebSocket API functionality
   */
  readonly raw = {
    /**
     * Fetch basic information about a server, including versioning info,
     * available shards, available features, and more.
     *
     * This endpoint does not require authentication.
     *
     * Endpoint: `GET /api/version`
     */
    version: (): Promise<Api.VersionResponse> => {
      return this.req('GET', '/api/version')
    },

    /**
     * Describes the server mod used for authentication on unofficial servers.
     *
     * For official servers, the name of the mod is always `'official'`.
     *
     * This endpoint does not require authentication.
     *
     * Endpoint: `GET /api/authmod`
     */
    authmod: (): Promise<Api.AuthModResponse> => {
      if (this.isOfficialServer()) {
        return Promise.resolve({ ok: 1, name: 'official' })
      }
      return this.req('GET', '/api/authmod')
    },

    /**
     * Fetch a chunk of history data for a single room.
     *
     * Official Endpoint: `GET /room-history/${shard}/${room}/${tick}.json`
     * Unofficial Endpoint: `GET /room-history`
     * @param room Name of the room for which to fetch history
     * @param tick Tick for which history should be fetched
     * @param shard The name of the shard to use (ignored by unofficial servers).
     *  Defaults to {@link Api.ClientConfig.defaultShard} if undefined.
     * @throws {Error} if shard and {@link Api.ClientConfig.defaultShard} are undefined
     *  while using an official server
     * @throws {Api.Error} if history is unsupported or the requested chunk is missing
     * - HTTP 500: this is an unofficial server that does not record room history
     * - HTTP 404: the requested history chunk does not exist
     * @see {@link version} returns the history chunk size to expect
     */
    history: (room: string, tick: number, shard?: string): Promise<Api.RoomHistoryResponse> => {
      if (this.isOfficialServer()) {
        shard ??= this.config.client.defaultShard
        if (shard === undefined) {
          throw new Error('shard must be defined')
        }
        tick -= tick % OFFICIAL_HISTORY_INTERVAL
        return this.req('GET', `/room-history/${shard}/${room}/${tick}.json`)
      } else {
        tick -= tick % PRIVATE_HISTORY_INTERVAL
        return this.req('GET', '/room-history', { room, time: tick })
      }
    },

    /** Endpoints that provide information about other servers */
    servers: {
      /**
       * Fetch a list of curated community servers.
       *
       * This endpoint does not require authentication.
       *
       * Endpoint: `POST /api/servers/list`
       */
      list: (): Promise<Api.ServerListResponse> => {
        return this.req('POST', '/api/servers/list')
      }
    },

    /** Endpoints for authenticating to the server or checking authentication status */
    auth: {
      /**
       * Authenticate to the server using email/password credentials.
       *
       * This authentication method has not worked on official servers
       * since 2018, but it is still used for unofficial servers.
       *
       * Endpoint: `POST /api/auth/signin`
       * @param email The email address used for registration
       * @param password The password used for registration
       */
      signin: (email: string, password: string): Promise<Api.AuthSigninResponse> => {
        return this.req('POST', '/api/auth/signin', { email, password })
      },

      /**
       * Authenticate via Steam SSO.
       *
       * Steam and Github SSO are the only permitted authentication methods
       * on official servers.
       *
       * Endpoint: `POST /api/auth/steam-ticket`
       * @param ticket Do you know what this does? If so, please submit a PR!
       * @param useNativeAuth Do you know what this does? If so, please submit a PR!
       */
      steamTicket: (ticket: unknown, useNativeAuth = false): Promise<Api.UnknownResponse> => {
        return this.req('POST', '/api/auth/steam-ticket', { ticket, useNativeAuth })
      },

      /**
       * Fetch basic information about the authenticated user.
       * Endpoint: `GET /api/auth/me`
       */
      me: (): Promise<Api.AuthMeResponse> => {
        return this.req('GET', '/api/auth/me')
      },

      /**
       * Queries the status/permissions of an API token.
       * Throws an error if the token is invalid / not recognized.
       *
       * Endpoint: `GET /api/auth/query-token`
       * @param token The API token for which permissions should be queried
       * @see {@link ScreepsAPI.token} for the API token currently in use by this client
       */
      queryToken: (token: string): Promise<Api.AuthQueryTokenResponse> => {
        return this.req('GET', '/api/auth/query-token', { token })
      }
    },

    /** Endpoints for creating new user accounts */
    register: {
      /**
       * Checks the availability of an email address.
       *
       * This endpoint does not require authentication.
       *
       * Endpoint: `GET /api/register/check-email`
       * @param email The email address to check
       * @returns If the exmail is available, returns {@link Api.Response}.
       *  If the email is taken, returns {@link Api.ErrorResponse}
       *  (`{ error: 'exists' }`).
       */
      checkEmail: (email: string): Promise<Api.Response | Api.ErrorResponse> => {
        return this.req('GET', '/api/register/check-email', { email })
      },

      /**
       * Checks the availability of a username.
       *
       * This endpoint does not require authentication.
       *
       * Endpoint: `GET /api/register/check-username`
       * @param username The username to check
       * @returns If the username is available, returns {@link Api.Response}.
       *  If the username is taken, returns {@link Api.ErrorResponse}
       *  (`{ error: 'exists' }`).
       */
      checkUsername: (username: string): Promise<Api.Response | Api.ErrorResponse> => {
        return this.req('GET', '/api/register/check-username', { username })
      },

      /**
       * Endpoint: `POST /api/register/set-username`
       * @param username The username to associated with this account
       * @returns Please consider submitting a PR to document the success response.
       *  If used for an account that is already set up, returns
       *  {@link Api.ErrorResponse} (`{ error: 'username already set' }`).
       */
      setUsername: (username: string): Promise<Api.UnknownResponse | Api.ErrorResponse> => {
        return this.req('POST', '/api/register/set-username', { username })
      },

      /**
       * Create a new user account.
       *
       * Endpoint: `POST /api/register/submit`
       * @param username The username to use for this new account
       * @param email The email address to associate with this new account
       * @param password The password to use for this new account.
       *  It is unclear whether or not this is accepted or even allowed on official servers.
       * @param modules Initial bot code to deploy for this user
       */
      submit: (
        username: string,
        email: string,
        password: string,
        modules?: Api.UserCodeModules
      ): Promise<Api.UnknownResponse> => {
        return this.req('POST', '/api/register/submit', { username, email, password, modules })
      }
    },

    /** Endpoints used to read or modify game state */
    game: {
      /**
       * Fetch statistics for one or more rooms along with
       * basic information like owner and RCL.
       *
       * Endpoint: `POST /api/game/map-stats`
       * @param rooms An array of one or more room names.
       * @param statName The type of stat to fetch. See {@link Api.MapStat}.
       * @param shard The name of the shard to use (ignored by unofficial servers).
       *  Defaults to {@link Api.ClientConfig.defaultShard} if undefined.
       * @throws {Error} if shard and {@link Api.ClientConfig.defaultShard} are undefined
       *  while using an official server
       */
      mapStats: async <S extends Api.MapStat>(
        rooms: string[],
        statName: S,
        shard?: string
      ): Promise<Api.GameMapStatsResponse<S>> => {
        shard ??= this.config.client.defaultShard
        if (this.isOfficialServer() && shard === undefined) {
          throw new Error('shard must be defined')
        }
        return this.req('POST', '/api/game/map-stats', { rooms, statName, shard })
      },

      /**
       * Generate a name for a new room object.
       *
       * The generated name will be unique across all other objects of that
       * type owned by the authenticated user on the specified shard.
       *
       * Endpoint: `POST /api/game/gen-unique-object-name`
       * @param type The type of object for which to generate the name (ex: "flag" or "spawn")
       * @param shard The name of the shard to use (ignored by unofficial servers).
       *  Defaults to {@link Api.ClientConfig.defaultShard} if undefined.
       * @throws {Error} if shard and {@link Api.ClientConfig.defaultShard} are undefined
       *  while using an official server
       */
      genUniqueObjectName: (type: string, shard?: string): Promise<Api.GameGenUniqueNameResponse> => {
        shard ??= this.config.client.defaultShard
        if (this.isOfficialServer() && shard === undefined) {
          throw new Error('shard must be defined')
        }
        return this.req('POST', '/api/game/gen-unique-object-name', { type, shard })
      },

      /**
       * Check whether or not a name for a room object is in use by any
       * other room object of the same type on the specified shard.
       *
       * Endpoint: `POST /api/game/check-unique-object-name`
       * @param type The type of object for which to check the name (ex: "flag" or "spawn")
       * @param name The name to check
       * @param shard The name of the shard to use (ignored by unofficial servers).
       *  Defaults to {@link Api.ClientConfig.defaultShard} if undefined.
       * @throws {Error} if shard and {@link Api.ClientConfig.defaultShard} are undefined
       *  while using an official server
       */
      checkUniqueObjectName: (type: string, name: string, shard?: string): Promise<Api.UnknownResponse> => {
        shard ??= this.config.client.defaultShard
        if (this.isOfficialServer() && shard === undefined) {
          throw new Error('shard must be defined')
        }
        return this.req('POST', '/api/game/check-unique-object-name', { type, name, shard })
      },

      /**
       * Place the authenticated user's first {@link Api.StructureSpawn | spawn} structure.
       *
       * This operation is only permitted when the user's
       * {@link Api.UserWorldStatusResponse.status | world status}
       * is equal to `'empty'`.
       *
       * Endpoint: `POST /api/game/place-spawn`
       * @param room Name of the room in which the spawn should be placed
       * @param x X-coordinate of the spawn's room position
       * @param y Y-coordinate of the spawn's room position
       * @param name An optional name to assign to the placed spawn
       * @param shard The name of the shard to use (ignored by unofficial servers).
       *  Defaults to {@link Api.ClientConfig.defaultShard} if undefined.
       * @throws {Error} if shard and {@link Api.ClientConfig.defaultShard} are undefined
       *  while using an official server
       */
      placeSpawn: (room: string, x: number, y: number, name?: string, shard?: string): Promise<Api.UnknownResponse> => {
        shard ??= this.config.client.defaultShard
        if (this.isOfficialServer() && shard === undefined) {
          throw new Error('shard must be defined')
        }
        return this.req('POST', '/api/game/place-spawn', { name, room, x, y, shard })
      },

      /**
       * Create a new flag or move an existing one with the specified name.
       *
       * Unlike the runtime API equivalent of this endpoint, room visibility
       * is not required here.
       *
       * Endpoint: `POST /api/game/create-flag`
       * @param room Name of the room in which the flag should be placed
       * @param x X-coordinate of the flag's room position
       * @param y Y-coordinate of the flag's room position
       * @param name The name of the flag. If the name is already in use, the
       *  current flag with this name will be moved to the specified position.
       * @param color The color of the left side of the flag
       * @param secondaryColor The color of the right side of the flag
       * @param shard The name of the shard to use (ignored by unofficial servers).
       *  Defaults to {@link Api.ClientConfig.defaultShard} if undefined.
       * @returns A generic MongoDB upsert response:
       * - If the name is new, `result.upserted[0]._id` is the game id of the created flag
       * - If not, this moves the flag and the response does not contain the ID (but the ID doesn't change)
       * @throws {Error} if shard and {@link Api.ClientConfig.defaultShard} are undefined
       *  while using an official server
       */
      createFlag: (
        room: string,
        x: number,
        y: number,
        name: string,
        color: FlagColor = FlagColor.White,
        secondaryColor: FlagColor = FlagColor.White,
        shard?: string
      ): Promise<Api.DbUpsertedResponse> => {
        shard ??= this.config.client.defaultShard
        if (this.isOfficialServer() && shard === undefined) {
          throw new Error('shard must be defined')
        }
        return this.req('POST', '/api/game/create-flag', { name, room, x, y, color, secondaryColor, shard })
      },

      /**
       * Generate a name for a new flag.
       *
       * The generated name will be unique across all other flags
       * owned by the authenticated user on the specified shard.
       *
       * Endpoint: `POST /api/game/gen-unique-flag-name`
       * @param shard The name of the shard to use (ignored by unofficial servers).
       *  Defaults to {@link Api.ClientConfig.defaultShard} if undefined.
       * @throws {Error} if shard and {@link Api.ClientConfig.defaultShard} are undefined
       *  while using an official server
       */
      genUniqueFlagName: (shard?: string): Promise<Api.GameGenUniqueNameResponse> => {
        shard ??= this.config.client.defaultShard
        if (this.isOfficialServer() && shard === undefined) {
          throw new Error('shard must be defined')
        }
        return this.req('POST', '/api/game/gen-unique-flag-name', { shard })
      },

      /**
       * Check whether or not a flag name is in use.
       *
       * Checks all existing flags owned by the authenticated user on
       * the specified shard for one with the specified name.
       *
       * Endpoint: `POST /api/game/check-unique-flag-name`
       * @param name The name to check
       * @param shard The name of the shard to use (ignored by unofficial servers).
       *  Defaults to {@link Api.ClientConfig.defaultShard} if undefined.
       * @throws {Error} if shard and {@link Api.ClientConfig.defaultShard} are undefined
       *  while using an official server
       */
      checkUniqueFlagName: (name: string, shard?: string): Promise<Api.UnknownResponse> => {
        shard ??= this.config.client.defaultShard
        if (this.isOfficialServer() && shard === undefined) {
          throw new Error('shard must be defined')
        }
        return this.req('POST', '/api/game/check-unique-flag-name', { name, shard })
      },

      /**
       * Change the color of an existing flag.
       *
       * Endpoint: `POST /api/game/change-flag-color`
       * @param color The color of the left side of the flag
       * @param secondaryColor The color of the right side of the flag
       * @param shard The name of the shard to use (ignored by unofficial servers).
       *  Defaults to {@link Api.ClientConfig.defaultShard} if undefined.
       * @throws {Error} if shard and {@link Api.ClientConfig.defaultShard} are undefined
       *  while using an official server
       */
      changeFlagColor: (
        color: FlagColor = FlagColor.White,
        secondaryColor: FlagColor = FlagColor.White,
        shard?: string
      ): Promise<Api.DbModifiedResponse> => {
        shard ??= this.config.client.defaultShard
        if (this.isOfficialServer() && shard === undefined) {
          throw new Error('shard must be defined')
        }
        return this.req('POST', '/api/game/change-flag-color', { color, secondaryColor, shard })
      },

      /**
       * Delete a flag by name.
       *
       * Endpoint: `POST /api/game/remove-flag`
       * @param room The name of the room in which the flag is placed
       * @param name The name of the flag to remove
       * @param shard The name of the shard to use (ignored by unofficial servers).
       *  Defaults to {@link Api.ClientConfig.defaultShard} if undefined.
       * @throws {Error} if shard and {@link Api.ClientConfig.defaultShard} are undefined
       *  while using an official server
       */
      removeFlag: (room: string, name: string, shard?: string): Promise<Api.Response> => {
        shard ??= this.config.client.defaultShard
        if (this.isOfficialServer() && shard === undefined) {
          throw new Error('shard must be defined')
        }
        return this.req('POST', '/api/game/remove-flag', { name, room, shard })
      },

      /**
       * Trigger an action on one or more objects.
       *
       * This endpoint is used for a variety of actions, depending on the `name` and `intent` parameters.
       *
       * Endpoint: `POST /api/game/add-object-intent`
       * @param _id the ID of the object that should perform the intent
       * @param room the name of the room the object is in
       * @param name name of the intent (ex: 'move')
       * @param intent JSON string describing the target(s) of the intent (for actions like 'heal' or 'build')
       * @param shard The name of the shard to use (ignored by unofficial servers).
       *  Defaults to {@link Api.ClientConfig.defaultShard} if undefined.
       * @throws {Error} if shard and {@link Api.ClientConfig.defaultShard} are undefined
       *  while using an official server
       * @example remove flag: name = "remove", intent = {}
       * @example destroy structure: _id = "room", name = "destroyStructure", intent = [ {id: <structure id>, roomName, <room name>, user: <user id>} ]
can destroy multiple structures at once
       * @example suicide creep: name = "suicide", intent = {id: <creep id>}
       * @example unclaim controller: name = "unclaim", intent = {id: <controller id>}
intent can be an empty object for suicide and unclaim, but the web interface sends the id in it, as described
       * @example remove construction site: name = "remove", intent = {}
       */
      addObjectIntent: (
        _id: string,
        room: string,
        name: string,
        intent?: string,
        shard?: string
      ): Promise<Api.DbUpsertedResponse> => {
        shard ??= this.config.client.defaultShard
        if (this.isOfficialServer() && shard === undefined) {
          throw new Error('shard must be defined')
        }
        return this.req('POST', '/api/game/add-object-intent', { _id, room, name, intent, shard })
      },

      /**
       * Create a {@link Api.ConstructionSite | construction site} for a new
       * {@link Api.Structure | structure}.
       *
       * Unlike the runtime API equivalent of this endpoint, room visibility
       * is not required here.
       *
       * Endpoint: `POST /api/game/create-construction`
       * @param room Name of the room in which to place the site
       * @param x X-coordinate of the site's room position
       * @param y Y-coordinate of the site's room position
       * @param structureType The type of structure to build (ex: 'road', 'powerSpawn')
       * @param name An optional name to assign to the placed structure.
       *  This should be undefined unless `structureType` is 'spawn'.
       * @param shard The name of the shard to use (ignored by unofficial servers).
       *  Defaults to {@link Api.ClientConfig.defaultShard} if undefined.
       * @throws {Error} if shard and {@link Api.ClientConfig.defaultShard} are undefined
       *  while using an official server
       */
      createConstruction: (
        room: string,
        x: number,
        y: number,
        structureType: Api.BuildableStructureConstant,
        name?: string,
        shard?: string
      ): Promise<Api.GameCreateConstructionResponse> => {
        shard ??= this.config.client.defaultShard
        if (this.isOfficialServer() && shard === undefined) {
          throw new Error('shard must be defined')
        }
        return this.req('POST', '/api/game/create-construction', { room, x, y, structureType, name, shard })
      },

      /**
       * Enable or disable attack notifications on a single {@link Api.RoomObject | room object}.
       *
       * Endpoint: `POST /api/game/set-notify-when-attacked`
       * @param _id ID of the room object
       * @param enabled `true` to enable notifications, or `false` to disable notifications
       * @param shard The name of the shard to use (ignored by unofficial servers).
       *  Defaults to {@link Api.ClientConfig.defaultShard} if undefined.
       * @throws {Error} if shard and {@link Api.ClientConfig.defaultShard} are undefined
       *  while using an official server
       */
      setNotifyWhenAttacked: (_id: string, enabled = true, shard?: string): Promise<Api.DbModifiedResponse> => {
        shard ??= this.config.client.defaultShard
        if (this.isOfficialServer() && shard === undefined) {
          throw new Error('shard must be defined')
        }
        return this.req('POST', '/api/game/set-notify-when-attacked', { _id, enabled, shard })
      },

      /**
       * Create an invader creep in a room claimed by the authenticated user.
       *
       * Create a single invader to test the defenses of one of your rooms.
       * This can be called multiple times in succession to simulate a raid group.
       *
       * Invaders created by this endpoint will not drop any resources on death.
       *
       * This operation is only permitted on exit positions of rooms claimed
       * by the authenticated user.
       *
       * Endpoint: `POST /api/game/create-invader`
       * @param room Name of the room in which to spawn
       * @param x X-coordinate of the invader's room position
       * @param y Y-coordinate of the invader's room position
       * @param size The body size of the invader. In real invasions, the small size
       *  spawns in unclaimed and low-RCL rooms, while the large size spawns in
       *  high-RCL rooms.
       * @param type The role of the invader, which will determine its body
       *  part types, boost types, and behavior.
       * @param boosted If `true`, the invader will be spawned with boosted parts.
       * @param shard The name of the shard to use (ignored by unofficial servers).
       *  Defaults to {@link Api.ClientConfig.defaultShard} if undefined.
       * @throws {Error} if shard and {@link Api.ClientConfig.defaultShard} are undefined
       *  while using an official server
       */
      createInvader: (
        room: string,
        x: number,
        y: number,
        size: 'small' | 'big',
        type: 'Melee' | 'Ranged' | 'Healer',
        boosted = false,
        shard?: string
      ): Promise<Api.UnknownResponse> => {
        shard ??= this.config.client.defaultShard
        if (this.isOfficialServer() && shard === undefined) {
          throw new Error('shard must be defined')
        }
        return this.req('POST', '/api/game/create-invader', { room, x, y, size, type, boosted, shard })
      },

      /**
       * Remove an invader creep created by {@link createInvader}.
       *
       * This operation is only permitted on invaders created by
       * the authenticated user via the {@link createInvader} endpoint.
       *
       * Endpoint: `POST /api/game/remove-invader`
       * @param _id The ID of the invader creep to remove
       * @param shard The name of the shard to use (ignored by unofficial servers).
       *  Defaults to {@link Api.ClientConfig.defaultShard} if undefined.
       * @throws {Error} if shard and {@link Api.ClientConfig.defaultShard} are undefined
       *  while using an official server
       */
      removeInvader: (_id: string, shard?: string): Promise<Api.UnknownResponse> => {
        shard ??= this.config.client.defaultShard
        if (this.isOfficialServer() && shard === undefined) {
          throw new Error('shard must be defined')
        }
        return this.req('POST', '/api/game/remove-invader', { _id, shard })
      },

      /**
       * Fetch the current game time
       *
       * Endpoint: `GET /api/game/time`
       * @param shard The name of the shard to use (ignored by unofficial servers).
       *  Defaults to {@link Api.ClientConfig.defaultShard} if undefined.
       * @throws {Error} if shard and {@link Api.ClientConfig.defaultShard} are undefined
       *  while using an official server
       */
      time: (shard?: string): Promise<Api.GameTimeResponse> => {
        shard ??= this.config.client.defaultShard
        if (this.isOfficialServer() && shard === undefined) {
          throw new Error('shard must be defined')
        }
        return this.req('GET', '/api/game/time', { shard })
      },

      /**
       * Fetch the width and height (in rooms) of the specified shard's world map.
       *
       * Endpoint: `GET /api/game/world-size`
       * @param shard The name of the shard to use (ignored by unofficial servers).
       *  Defaults to {@link Api.ClientConfig.defaultShard} if undefined.
       * @throws {Error} if shard and {@link Api.ClientConfig.defaultShard} are undefined
       *  while using an official server
       */
      worldSize: (shard?: string): Promise<Api.GameWorldSizeResponse> => {
        shard ??= this.config.client.defaultShard
        if (this.isOfficialServer() && shard === undefined) {
          throw new Error('shard must be defined')
        }
        return this.req('GET', '/api/game/world-size', { shard })
      },

      /**
       * Fetch all active {@link Api.Decorations.Instance | decorations} for a specific room.
       *
       * Endpoint: `GET /api/game/room-decorations`
       * @param room The name of the room
       * @param shard The name of the shard to use (ignored by unofficial servers).
       *  Defaults to {@link Api.ClientConfig.defaultShard} if undefined.
       * @throws {Error} if shard and {@link Api.ClientConfig.defaultShard} are undefined
       *  while using an official server
       */
      roomDecorations: (room: string, shard?: string): Promise<Api.GameRoomDecorationsResponse> => {
        shard ??= this.config.client.defaultShard
        if (this.isOfficialServer() && shard === undefined) {
          throw new Error('shard must be defined')
        }
        return this.req('GET', '/api/game/room-decorations', { room, shard })
      },

      /**
       * Fetch all {@link Api.RoomObject | room objects} present in a specific room.
       *
       * Endpoint: `GET /api/game/room-objects`
       * @param room The name of the room
       * @param shard The name of the shard to use (ignored by unofficial servers).
       *  Defaults to {@link Api.ClientConfig.defaultShard} if undefined.
       * @throws {Error} if shard and {@link Api.ClientConfig.defaultShard} are undefined
       *  while using an official server
       */
      roomObjects: (room: string, shard?: string): Promise<Api.GameRoomObjectsResponse> => {
        shard ??= this.config.client.defaultShard
        if (this.isOfficialServer() && shard === undefined) {
          throw new Error('shard must be defined')
        }
        return this.req('GET', '/api/game/room-objects', { room, shard })
      },

      /**
       * Fetch terrain data for a specific room and return it in an "encoded" format.
       *
       * Endpoint: `GET /api/game/room-terrain`
       * @param room The name of the room
       * @param shard The name of the shard to use (ignored by unofficial servers).
       *  Defaults to {@link Api.ClientConfig.defaultShard} if undefined.
       * @throws {Error} if shard and {@link Api.ClientConfig.defaultShard} are undefined
       *  while using an official server
       * @see {@link roomTerrainUnencoded} for an alternative response format
       */
      roomTerrain: (room: string, shard?: string): Promise<Api.GameRoomTerrainEncodedResponse> => {
        shard ??= this.config.client.defaultShard
        if (this.isOfficialServer() && shard === undefined) {
          throw new Error('shard must be defined')
        }
        return this.req('GET', '/api/game/room-terrain', { room, encoded: 1, shard })
      },

      /**
       * Fetch terrain data for a specific room and return it in an "unencoded" format.
       *
       * Endpoint: `GET /api/game/room-terrain`
       * @param room The name of the room
       * @param shard The name of the shard to use (ignored by unofficial servers).
       *  Defaults to {@link Api.ClientConfig.defaultShard} if undefined.
       * @throws {Error} if shard and {@link Api.ClientConfig.defaultShard} are undefined
       *  while using an official server
       * @see {@link roomTerrainEncoded} for an alternative response format
       */
      roomTerrainUnencoded: (room: string, shard?: string): Promise<Api.GameRoomTerrainUnencodedResponse> => {
        shard ??= this.config.client.defaultShard
        if (this.isOfficialServer() && shard === undefined) {
          throw new Error('shard must be defined')
        }
        return this.req('GET', '/api/game/room-terrain', { room, shard })
      },

      /**
       * Look up the {@link Api.RoomStatus | status of a room}.
       *
       * Endpoint: `GET /api/game/room-status`
       * @param room The name of the room
       * @param shard The name of the shard to use (ignored by unofficial servers).
       *  Defaults to {@link Api.ClientConfig.defaultShard} if undefined.
       * @throws {Error} if shard and {@link Api.ClientConfig.defaultShard} are undefined
       *  while using an official server
       */
      roomStatus: (room: string, shard?: string): Promise<Api.GameRoomStatusResponse> => {
        shard ??= this.config.client.defaultShard
        if (this.isOfficialServer() && shard === undefined) {
          throw new Error('shard must be defined')
        }
        return this.req('GET', '/api/game/room-status', { room, shard })
      },

      /**
       * Get the authenticated user's stats for a room broken down by time.
       *
       * Endpoint: `GET /api/game/room-overview`
       * @param room The name of the room
       * @param interval Size of each time slot in minutes; only specific values are allowed:
       * - 8: 8 minutes each; 64 minutes total
       * - 180: 3 hours each; 24 hours total
       * - 1440: 24 hours each; 8 days total
       * @param shard The name of the shard to use (ignored by unofficial servers).
       *  Defaults to {@link Api.ClientConfig.defaultShard} if undefined.
       * @throws {Error} if shard and {@link Api.ClientConfig.defaultShard} are undefined
       *  while using an official server
       */
      roomOverview: (
        room: string,
        interval: Api.RoomStatInterval = 8,
        shard?: string
      ): Promise<Api.GameRoomOverviewResponse> => {
        shard ??= this.config.client.defaultShard
        if (this.isOfficialServer() && shard === undefined) {
          throw new Error('shard must be defined')
        }
        return this.req('GET', '/api/game/room-overview', { room, interval, shard })
      },

      /**
       * Endpoints for reading or modifying the state of the
       * {@link https://docs.screeps.com/market.html | in-game market}
       */
      market: {
        /**
         * Get an overview of market data for a shard.
         *
         * Intershard market data is always included, if available.
         *
         * Endpoint: `GET /api/game/market/orders-index`
         * @param shard The name of the shard to use (ignored by unofficial servers).
         *  Defaults to {@link Api.ClientConfig.defaultShard} if undefined.
         * @throws {Error} if shard and {@link Api.ClientConfig.defaultShard} are undefined
         *  while using an official server
         */
        ordersIndex: (shard?: string): Promise<Api.GameMarketIndexResponse> => {
          shard ??= this.config.client.defaultShard
          if (this.isOfficialServer() && shard === undefined) {
            throw new Error('shard must be defined')
          }
          return this.req('GET', '/api/game/market/orders-index', { shard })
        },

        /**
         * Fetch all unexpired market orders created by the authenticated user.
         *
         * Endpoint: `GET /api/game/market/my-orders`
         */
        myOrders: (): Promise<Api.GameMarketMyOrdersResponse> => {
          return this.req('GET', '/api/game/market/my-orders').then(this.mapToShard)
        },

        /**
         * Fetch all active market orders for a given resource type.
         *
         * Endpoint: `GET /api/game/market/orders`
         * @param resourceType Any {@link Api.MarketResourceConstant | resource type}
         * @param shard If {@link resourceType} is an {@link IntershardResourceConstant}, this must be set to `undefined`.
         *  {@link Api.ClientConfig.defaultShard} is ignored here for compatibility with intershard resources.
         */
        orders: (resourceType: Api.MarketResourceConstant, shard?: string): Promise<Api.GameMarketOrdersResponse> => {
          return this.req('GET', '/api/game/market/orders', { resourceType, shard })
        },

        /**
         * Fetch market history data for a given resource type.
         *
         * Endpoint: `GET /api/game/market/stats`
         * @param resourceType Any {@link Api.MarketResourceConstant | resource type}
         * @param shard The name of the shard to use (ignored by unofficial servers).
         *  Defaults to {@link Api.ClientConfig.defaultShard} if undefined.
         * @throws {Error} if shard and {@link Api.ClientConfig.defaultShard} are undefined
         *  while using an official server
         */
        stats: (resourceType: Api.MarketResourceConstant, shard?: string): Promise<Api.GameMarketStatsResponse> => {
          shard ??= this.config.client.defaultShard
          if (this.isOfficialServer() && shard === undefined) {
            throw new Error('shard must be defined')
          }
          return this.req('GET', '/api/game/market/stats', { resourceType, shard })
        }
      },

      /** Endpoints for querying information related to a server's shards */
      shards: {
        /**
         * Fetch high-level data about all available shards on this server.
         *
         * This endpoint does not require authentication.
         *
         * Endpoint: `GET /api/game/shards/info`
         */
        info: (): Promise<Api.GameShardsInfoResponse> => {
          return this.req('GET', '/api/game/shards/info')
        }
      }
    },

    leaderboard: {
      /**
       * Fetch the leaderboard rankings for a specific user.
       *
       * This endpoint does not require authentication.
       *
       * Endpoint: `GET /api/leaderboard/list`
       * @param limit The number of user results to include per response
       * @param mode 'world' (control points) or 'power' (power processed)
       * @param offset The index (starting at zero) of the first leaderboard
       *  position that should be included in the response
       * @param season A date in the format `YYYY-MM`, NOT a seasonal world name/number
       */
      list: (
        limit = 10,
        mode: Api.LeaderboardType = 'world',
        offset: number | null = 0, season?: string
      ): Promise<Api.LeaderboardListResponse> => {
        season ??= this.currentSeason()
        return this.req('GET', '/api/leaderboard/list', { limit, mode, offset, season })
      },

      /**
       * Fetch the leaderboard rankings for a specific user.
       *
       * This endpoint does not require authentication.
       *
       * Endpoint: `GET /api/leaderboard/find`
       * @param username The name of the user
       * @param mode 'world' (control points) or 'power' (power processed)
       * @param season An optional date in the format YYYY-MM.
       *  If undefined, the user's ranks for all seasons is returned.
       */
      find: (
        username: string,
        mode: Api.LeaderboardType = 'world',
        season?: string
      ): Promise<Api.LeaderboardFindResponse> => {
        return this.req('GET', '/api/leaderboard/find', { season, mode, username })
      },

      /**
       * Fetch a list of all seasons for which leaderboard rankings exist.
       * Note that the "seasons" mentioned here are distinct from the official
       * {@link https://screeps.com/season/#!/seasons/chronicle | seasonal world}
       * competitions.
       *
       * This endpoint does not require authentication.
       *
       * Endpoint: `GET /api/leaderboard/seasons`
       */
      seasons: (): Promise<Api.LeaderboardSeasonsResponse> => {
        return this.req('GET', '/api/leaderboard/seasons')
      }
    },

    /**
     * Endpoints for {@link https://screeps.com/season/#!/seasons/chronicle | seasonal world} events.
     * @see {@link scoreboard} for seasonal world scoreboard endpoints
     */
    seasons: {
      /**
       * Fetch metadata for the current season. Only works on official servers
       * when a seasonal world competition is active or about to start.
       *
       * Endpoint: `GET /api/seasons/current`
       * @throws {Api.Error} HTTP 404 if called on an unofficial server
       * @returns Metadata on the current season, or null if a seasonal world
       *  competition is not active or about to start
       */
      current: (): Promise<Api.SeasonsCurrentResponse | null> => {
        return this.req('GET', '/api/seasons/current')
      }
    },

    /**
     * Endpoints for reading or modifying state about the authenticated user,
     * or for looking up information on other users.
     */
    user: {
      /**
       * Unlock CPU on PTR for one week.
       *
       * Endpoint: `POST /api/user/activate-ptr`
       * @returns an {@link Api.Response} on PTR, or an {@link Api.ErrorResponse}
       *  (`{ error: 'not ptr' }`) on official servers that are not PTR.
       * @throws {Api.Error} HTTP 404 on unofficial servers
       */
      activatePtr: (): Promise<Api.Response | Api.ErrorResponse> => {
        return this.req('POST', '/api/user/activate-ptr')
      },

      /**
       * Update the authenticated user's {@link Badge}.
       *
       * Endpoint: `POST /api/user/badge`
       * @param badge The new user's new badge. See {@link Api.Badge}
       */
      badge: (badge: Api.Badge): Promise<Api.DbModifiedResponse> => {
        return this.req('POST', '/api/user/badge', { badge })
      },

      /**
       * Update the authenticated user's shard CPU limits.
       *
       * Endpoint: `POST /api/user/cpu-shards`
       * @param cpu The user's new shard CPU limits. See {@link Api.CpuShardLimits}
       */
      cpuShards: (cpu: Api.CpuShardLimits): Promise<Api.DbModifiedResponse> => {
        return this.req('POST', '/api/user/cpu-shards', { cpu })
      },

      /**
       * Abandon all of the authenticated user's rooms to allow them
       * to pick a new spawn room.
       *
       * Endpoint: `POST /api/user/respawn`
       */
      respawn: (): Promise<Api.UnknownResponse> => {
        return this.req('POST', '/api/user/respawn')
      },

      /**
       * Update the code branch that will be used by the server or the simulator.
       *
       * Endpoint: `POST /api/user/set-active-branch`
       * @param branch The name of the code branch to activate
       * @param activeName The environment for which this code branch should be activated:
       *  - 'activeWorld': activate branch on the server
       *  - 'activeSim': activate branch on the simulator
       * @see {@link ScreepsAPI.raw.user.branches} to list available branches
       */
      setActiveBranch: (branch: string, activeName: 'activeWorld' | 'activeSim'): Promise<Api.UnknownResponse> => {
        return this.req('POST', '/api/user/set-active-branch', { branch, activeName })
      },

      /**
       * Create a copy of a code branch.
       *
       * Endpoint: `POST /api/user/clone-branch`
       * @param branch The name of the code branch to clone
       * @param newName The name of the new code branch
       * @param defaultModules Do you know what this does? If so, please submit a PR!
       * @see {@link ScreepsAPI.raw.user.branches} to list available branches
       */
      cloneBranch: (
        branch: string,
        newName: string,
        defaultModules: unknown
      ): Promise<Api.UnknownResponse> => {
        return this.req('POST', '/api/user/clone-branch', { branch, newName, defaultModules })
      },

      /**
       * Delete a code branch.
       *
       * Endpoint: `POST /api/user/delete-branch`
       * @param branch The name of the code branch to delete
       */
      deleteBranch: (branch: string): Promise<Api.UnknownResponse> => {
        return this.req('POST', '/api/user/delete-branch', { branch })
      },

      /**
       * Update the authenticated user's notification preferences.
       *
       * Endpoint: `POST /api/user/notify-prefs`
       * @param prefs See {@link Api.UserNotifyPrefsRequest}
       */
      notifyPrefs: (prefs: Api.UserNotifyPrefsRequest): Promise<Api.DbModifiedResponse> => {
        return this.req('POST', '/api/user/notify-prefs', prefs)
      },

      /**
       * Mark tutorial as completed for the authenticated user.
       *
       * Endpoint: `POST /api/user/tutorial-done`
       */
      tutorialDone: (): Promise<Api.Response> => {
        return this.req('POST', '/api/user/tutorial-done')
      },

      /**
       * Update the authenticated user's email address.
       *
       * Endpoint: `POST /api/user/email`
       * @param email The user's new email address
       */
      email: (email: string): Promise<Api.UnknownResponse> => {
        return this.req('POST', '/api/user/email', { email })
      },

      /**
       * Get the name of a room that should be centered on the
       * authenticated user's map when opening the map view on the client
       * with no coordinates.
       *
       * Endpoint: `GET /api/user/world-start-room`
       * @param shard The name of the shard to use (ignored by unofficial servers).
       *  Defaults to {@link Api.ClientConfig.defaultShard} if undefined.
       */
      worldStartRoom: (shard?: string): Promise<Api.UserWorldStartRoomResponse> => {
        shard ??= this.config.client.defaultShard
        return this.req('GET', '/api/user/world-start-room', { shard })
      },

      /**
       * Get the authenticated user's status on the server.
       *
       * Endpoint: `GET /api/user/world-status`
       */
      worldStatus: (): Promise<Api.UserWorldStatusResponse> => {
        return this.req('GET', '/api/user/world-status')
      },

      /**
       * Fetch a list of all code branches the authenticated user has
       * on the server.
       *
       * Endpoint: `GET /api/user/branches`
       */
      branches: (): Promise<Api.UserBranchesResponse> => {
        return this.req('GET', '/api/user/branches')
      },

      /** Endpoints for downloading or uploading code */
      code: {
        /**
         * Pull the authenticated user's code and WASM binaries for a
         * specific branch.
         *
         * Endpoint: `GET /api/user/code`
         * @param branch the name of the branch from which to pull code
         * @see https://docs.screeps.com/commit.html
         * @see {@link ScreepsAPI.raw.user.branches} to list available branches
         */
        get: (branch: string): Promise<Api.UserCodeGetResponse> => {
          return this.req('GET', '/api/user/code', { branch })
        },

        /**
         * Push code and WASM binaries to a branch for the authenticated user.
         *
         * Endpoint: `POST /api/user/code`
         * @param params the code/binaries and target branch
         * @param params.branch the name of the branch for which to upload code
         * @param params.modules JavScript code and WASM binaries to upload keyed by module name
         * @see https://docs.screeps.com/commit.html
         */
        set: (params: Api.UserCodeSetRequest): Promise<Api.UnknownResponse> => {
          return this.req('POST', '/api/user/code', params)
        }
      },

      decorations: {
        /** Endpoint: `GET /api/user/decorations/inventory` */
        inventory: (): Promise<Api.UserDecorationInventoryResponse> => {
          return this.req('GET', '/api/user/decorations/inventory')
        },

        /** Endpoint: `GET /api/user/decorations/themes` */
        themes: (): Promise<Api.UserDecorationThemesResponse> => {
          return this.req('GET', '/api/user/decorations/themes')
        },

        /**
         * Destroy one or more owned {@link Api.Decorations.Instance | decorations}
         * to refund a fraction of their pixelization cost.
         *
         * Endpoint: `POST /api/user/decorations/convert`
         * @param decorations The IDs of one or more owned decorations
         */
        convert: (decorations: string[]): Promise<Api.UnknownResponse> => {
          return this.req('POST', '/api/user/decorations/convert', { decorations })
        },

        /**
         * Spend pixels to create one or more
         * {@link Api.Decorations.Instance | decorations}.
         *
         * Endpoint: `POST /api/user/decorations/pixelize`
         * @param count The number of decorations to generate.
         * @param theme The theme from which to generate decorations.
         *  Note that specifying a theme increases the pixelization cost.
         *  Set to an empty string to create decorations from any theme.
         */
        pixelize: (count: number, theme = ''): Promise<Api.UnknownResponse> => {
          return this.req('POST', '/api/user/decorations/pixelize', { count, theme })
        },

        /**
         * Apply / activate a {@link Api.Decorations.Instance | decoration} to a creep/object/room.
         *
         * Endpoint: `POST /api/user/decorations/activate`
         * @param _id the ID of the decoration to activate
         * @param active values to assign to configurable {@link Decoration.props | properties}
         */
        activate: (_id: string, active: object): Promise<Api.UnknownResponse> => {
          return this.req('POST', '/api/user/decorations/activate', { _id, active })
        },

        /**
         * Remove / deactivate one or more active {@link Api.Decorations.Instance | decorations}.
         *
         * Endpoint: `POST /api/user/decorations/deactivate`
         * @param decorations The IDs of one or more active decorations
         */
        deactivate: (decorations: string[]): Promise<Api.UnknownResponse> => {
          return this.req('POST', '/api/user/decorations/deactivate', { decorations })
        }
      },

      /**
       * Look up the name of the room in which this player may not respawn.
       *
       * Endpoint: `GET /api/user/respawn-prohibited-rooms`
       */
      respawnProhibitedRooms: (): Promise<Api.UserRespawnProhibitedRoomsResponse> => {
        return this.req('GET', '/api/user/respawn-prohibited-rooms')
      },

      /**
       * Endpoints for reading from or writing to
       * {@link https://docs.screeps.com/global-objects.html#Memory-object | Memory}.
       */
      memory: {
        /**
         * Retrieves part or all of the authenticated user's
         * {@link https://docs.screeps.com/global-objects.html#Memory-object | Memory}.
         *
         * Endpoint: `GET /api/user/memory`
         * @param path The portion of the Memory JSON object to retrieve (ex: 'flags.Flag1').
         *  If undefined/empty, returns the entire Memory object.
         * @param shard The name of the shard to use (ignored by unofficial servers).
         *  Defaults to {@link Api.ClientConfig.defaultShard} if undefined.
         * @throws {Error} if shard and {@link Api.ClientConfig.defaultShard} are undefined
         *  while using an official server
         */
        get: (path?: string, shard?: string): Promise<Api.UserMemoryGetResponse> => {
          shard ??= this.config.client.defaultShard
          if (this.isOfficialServer() && shard === undefined) {
            throw new Error('shard must be defined')
          }
          return this.req('GET', '/api/user/memory', { path, shard })
        },

        /**
         * Updates part or all of the authenticated user's
         * {@link https://docs.screeps.com/global-objects.html#Memory-object | Memory}.
         *
         * Endpoint: `POST /api/user/memory`
         * @param path The portion of the Memory JSON object to write (ex: 'flags.Flag1').
         *  **WARNING: If undefined/empty, overwrites the entire Memory object.**
         * @param value The value to write to the specified Memory path. This will
         *  completely replace the previous value.
         * @param shard The name of the shard to use (ignored by unofficial servers).
         *  Defaults to {@link Api.ClientConfig.defaultShard} if undefined.
         * @throws {Error} if shard and {@link Api.ClientConfig.defaultShard} are undefined
         *  while using an official server
         */
        set: (path: string | undefined, value: unknown, shard?: string): Promise<Api.UserMemorySetResponse> => {
          shard ??= this.config.client.defaultShard
          if (this.isOfficialServer() && shard === undefined) {
            throw new Error('shard must be defined')
          }
          return this.req('POST', '/api/user/memory', { path, value, shard })
        },

        /**
         * Endpoints for reading from or writing to
         * {@link https://docs.screeps.com/api/#RawMemory.segments | RawMemory.segments}.
         */
        segment: {
          /**
           * Fetch the contents of one or more
           * {@link https://docs.screeps.com/api/#RawMemory.segments | RawMemory.segments}.
           *
           * Endpoint: `GET /api/user/memory-segment`
           * @param segment One or more segment IDs to read. Multiple IDs can be
           *  specified in a single string by separating the IDs with commas.
           * @param shard The name of the shard to use (ignored by unofficial servers).
           *  Defaults to {@link Api.ClientConfig.defaultShard} if undefined.
           * @throws {Error} if shard and {@link Api.ClientConfig.defaultShard} are undefined
           *  while using an official server
           * @example
           * // Fetch a single segment
           * api.raw.user.memory.segment.get(7, 'shard3')
           * @example
           * // Fetch a multiple segments with an ID array
           * api.raw.user.memory.segment.get([7, '13'], 'shard3')
           * @example
           * // Fetch a multiple segments with a comma-delimited ID list
           * api.raw.user.memory.segment.get('7,13,30', 'shard3')
           */
          get: (
            segment: number | string | (number | string)[],
            shard?: string
          ): Promise<Api.UserMemorySegmentGetResponse> => {
            shard ??= this.config.client.defaultShard
            if (this.isOfficialServer() && shard === undefined) {
              throw new Error('shard must be defined')
            }

            if (Array.isArray(segment)) {
              segment = segment.map(s => s.toString()).join()
            }

            return this.req('GET', '/api/user/memory-segment', { segment, shard })
          },

          /**
           * Update the contents of a single
           * {@link https://docs.screeps.com/api/#RawMemory.segments | RawMemory.segments}.
           *
           * Endpoint: `POST /api/user/memory-segment`
           * @param segment A number from 0-99
           * @param data The data to write to the segment. Non-string values will be
           *  serialized on the server side.
           * @param shard The name of the shard to use (ignored by unofficial servers).
           *  Defaults to {@link Api.ClientConfig.defaultShard} if undefined.
           * @throws {Error} if shard and {@link Api.ClientConfig.defaultShard} are undefined
           *  while using an official server
           */
          set: (segment: number | string, data: unknown, shard?: string): Promise<Api.Response> => {
            shard ??= this.config.client.defaultShard
            if (this.isOfficialServer() && shard === undefined) {
              throw new Error('shard must be defined')
            }

            if (segment.toString().includes(',')) {
              throw new Error('Only one segment can be written per request')
            }

            return this.req('POST', '/api/user/memory-segment', { segment, data, shard })
          }
        }
      },

      /** Endpoints for reading or managing in-game messages */
      messages: {
        /**
         * Search for messages by user ID.
         *
         * Endpoint: `GET /api/user/messages/list`
         * @param respondent The long `_id` of the user, not the username
         */
        list: (respondent: string): Promise<Api.UserMessagesListResponse> => {
          return this.req('GET', '/api/user/messages/list', { respondent })
        },

        /**
         * Fetch the last message from every thread in the authenticated user's inbox.
         *
         * Endpoint: `GET /api/user/messages/index`
         */
        index: (): Promise<Api.UserMessagesIndexResponse> => {
          return this.req('GET', '/api/user/messages/index')
        },

        /**
         * Fetch the authenticated user's number of unread messages.
         *
         * Endpoint: `GET /api/user/messages/unread-count`
         */
        unreadCount: (): Promise<Api.UserMessagesUnreadCountResponse> => {
          return this.req('GET', '/api/user/messages/unread-count')
        },

        /**
         * Send a message on behalf of the authenticated user.
         *
         * Endpoint: `POST /api/user/messages/send`
         * @param respondent The long `_id` of the user, not the username
         * @param text The text of the message to send
         */
        send: (respondent: string, text: string): Promise<Api.UnknownResponse> => {
          return this.req('POST', '/api/user/messages/send', { respondent, text })
        },

        /**
         * Mark the authenticated user's copy of a message as read.
         *
         * Endpoint: `POST /api/user/messages/mark-read`
         * @param id The ID of the message to mark as read
         */
        markRead: (id: string): Promise<Api.UserMessagesMarkReadResponse> => {
          return this.req('POST', '/api/user/messages/mark-read', { id })
        }
      },

      /**
       * Find a user by name.
       *
       * Endpoint: `GET /api/user/find`
       * @param username The complete username of the user
       * @see {@link findById} to find a user by ID instead of username
       */
      find: (username: string): Promise<Api.UserFindResponse> => {
        return this.req('GET', '/api/user/find', { username })
      },

      /**
       * Find a user by ID.
       *
       * Endpoint: `GET /api/user/find`
       * @param id The ID of the user
       * @see {@link find} to find a user by username instead of ID
       */
      findById: (id: string): Promise<Api.UserFindResponse> => {
        return this.req('GET', '/api/user/find', { id })
      },

      /**
       * Look up stats for a user.
       *
       * Endpoint: `GET /api/user/stats`
       * @param id ID of the user
       * @param interval The time interval in minutes (divided by 8); only specific values are allowed:
       * - 8: Past hour (actually 64 minutes)
       * - 180: Past day
       * - 1440: Past week (actually 8 days)
       * @see {@link overview} for a more detailed version for the authenticated user
       */
      stats: (id: string, interval: Api.RoomStatInterval): Promise<Api.UserStatsResponse> => {
        return this.req('GET', '/api/user/stats', { id, interval })
      },

      /**
       * Find all rooms claimed by the specified user.
       *
       * Endpoint: `GET /api/user/rooms`
       * @param id The ID of the user
       */
      rooms: (id: string): Promise<Api.UserRoomsResponse> => {
        return this.req('GET', '/api/user/rooms', { id }).then(this.mapToShard)
      },

      /**
       * Get an overview of the authenticated user's stats broken down by room and time.
       *
       * Endpoint: `GET /api/user/overview`
       * @param interval Size of each time slot in minutes; only specific values are allowed:
       * - 8: 8 minutes each; 64 minutes total
       * - 180: 3 hours each; 24 hours total
       * - 1440: 24 hours each; 8 days total
       * @param statName The stat to view for this user
       */
      overview: (
        interval: Api.RoomStatInterval = 8,
        statName: Api.RoomStat = 'energyControl'
      ): Promise<Api.UserOverviewResponse> => {
        return this.req('GET', '/api/user/overview', { interval, statName })
      },

      /**
       * Fetch a list of the authenticated user's most recent market transactions.
       *
       * Endpoint: `GET /api/user/money-history`
       * @param page Used for pagination
       */
      moneyHistory: (page = 0): Promise<Api.UserMoneyHistoryResponse> => {
        return this.req('GET', '/api/user/money-history', { page })
      },

      /**
       * Evaluate a JavaScript expression in the context of the authenticated
       * user's bot's runtime environment.
       *
       * This expression is evaluated after the user's loop function runs.
       * CPU costs and limits apply as they would to code in the loop function.
       *
       * Endpoint: `POST /api/user/console`
       * @param expression The JavaScript expression to evaluate.
       * @param shard The name of the shard to use (ignored by unofficial servers).
       *  Defaults to {@link Api.ClientConfig.defaultShard} if undefined.
       * @throws {Error} if shard and {@link Api.ClientConfig.defaultShard} are undefined
       *  while using an official server
       */
      console: (expression: string, shard?: string): Promise<Api.UserConsoleResponse> => {
        shard ??= this.config.client.defaultShard
        if (this.isOfficialServer() && shard === undefined) {
          throw new Error('shard must be defined')
        }
        return this.req('POST', '/api/user/console', { expression, shard })
      },

      /**
       * Fetch the authenticated user's username.
       *
       * Endpoint: `GET /api/user/name`
       */
      name: (): Promise<Api.UserNameResponse> => {
        return this.req('GET', '/api/user/name')
      }
    },

    /**
     * Endpoints that are not yet considered stable. Their request parameters
     * and response formats are subject to change without warning, and they
     * may not be available on all servers.
     *
     * Currently, all endpoints in this category are used to query for
     * current/recent PVP activity.
     * @see {@link warpath} for similar endpoints
     */
    experimental: {
      /**
       * Find rooms where attack actions have recently occurred
       * (including combat actions against NPCs).
       *
       * Endpoint: `GET /api/experimental/pvp`
       * @param interval Minimum time (in ticks?) since last combat action
       */
      pvp: (interval = 100): Promise<Api.ExperimentalPvpResponse> => {
        return this.req('GET', '/api/experimental/pvp', { interval }).then(this.mapToShard)
      },

      /**
       * Find all active nuclear launches.
       *
       * Endpoint: `GET /api/experimental/nukes`
       */
      nukes: (): Promise<Api.ExperimentalNukesResponse> => {
        return this.req('GET', '/api/experimental/nukes').then(this.mapToShard)
      }
    },

    /**
     * Endpoints for querying current/recent PVP activity by room.
     *
     * These may not be implemented on all servers. Most notably, they are not
     * available on official servers, but the third-party service
     * {@link https://voight-kampff.fly.dev/ | Voight-Kampff} provides these
     * and more for official servers and popular community servers.
     * @see {@link experimental} for similar endpoints
     */
    warpath: {
      /**
       * Find active/recent battles by room and classified by conflict intensity.
       *
       * This endpoint is unavailable on official servers, but the same data
       * is available via {@link https://voight-kampff.fly.dev/ | Voight-Kampff}.
       *
       * Endpoint: `GET /api/warpath/battles`
       * @param interval Minimum time (in ticks?) since last observed PVP activity
       * @see {@link https://screepspl.us/warpath/classifications/ | Warpath Conflict Classifications} for
       *  the criteria used to assign conflict levels
       */
      battles: (interval = 100): Promise<Api.UnknownResponse> => {
        return this.req('GET', '/api/warpath/battles', { interval })
      }
    },

    /**
     * Endpoints for querying scoreboard results. This appears to only be relevant
     * to {@link https://screeps.com/season/#!/seasons/chronicle | seasonal world}
     * competitions/events.
     * @see {@link seasons} for seasonal world metadata endpoints
     * @see {@link leaderboards} for non-seasonal leaderboard endpoints
     */
    scoreboard: {
      /**
       * Query scoreboard results. This appears to only be relevant to
       * {@link https://screeps.com/season/#!/seasons/chronicle | seasonal world}
       * competitions/events.
       *
       * Endpoint: `GET /api/scoreboard/list`
       * @param offset The index (starting at zero) of the first leaderboard
       *  position that should be included in the response
       * @param limit The number of users to return per request.
       *  The maximum valid value is 20.
       */
      list: (offset = 0, limit = 20): Promise<Api.ScoreboardListResponse> => {
        return this.req('GET', '/api/scoreboard/list', { limit, offset })
      }
    }
  }

  config: Api.Config
  token?: string
  protected http: AxiosInstance
  private __authed = false

  constructor(config: Api.Config) {
    super()
    this.config = config
    this.token = this.config.server.token
    this.http = axios.create({ baseURL: this.config.server.url })
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
    return !!(/screeps\.com/.exec(this.config.server.url))
  }

  /** True if this client is configured for the seasonal world server */
  isSeasonServer(): boolean {
    return !!(/screeps\.com\/season/.exec(this.config.server.url))
  }

  /** True if this client is configured for the public test realm (PTR) server */
  isPtrServer(): boolean {
    return !!(/screeps\.com\/ptr/.exec(this.config.server.url))
  }

  protected mapToShard <R extends Response>(
    this: void,
    res: R & { shards?: unknown, list?: unknown, rooms?: unknown }
  ): R {
    res.shards ??= {
      privSrv: res.list ?? res.rooms
    }
    return res
  }

  /**
   * Authenticate to the server using the email and password from the provided
   * {@link ServerConfig}.
   *
   * Typically, this should not be called directly; it will be triggered
   * automatically when a request is made to an endpoint that requires
   * authentication.
   * @param cause if provided, will be attached to the error thrown when
   *  authentication credentials are missing
   */
  async auth(cause?: unknown) {
    // Skip if already authenticating via API token
    const server = this.config.server
    if (server.token) return

    if (!server.email || !server.password) {
      throw new Error('Email or password not provided', { cause })
    }

    const res = await this.raw.auth.signin(server.email, server.password)
    this.token = res.token
    this.emit('token', res.token)
    this.emit('auth')
    this.__authed = true
    return res
  }

  /**
   * Send an API request to the server.
   *
   * Typically, this should not be called directly. Instead, use the appropriate
   * function from {@link raw} to get request parameter and response body types.
   * If an endpoint you rely on is not in {@link raw}, please consider
   * submitting a PR to implement it.
   * @param method The HTTP method to use
   * @param path The URL path of the endpoint. This will be appeneded to
   *  {@link ServerConfig.url}. Request parameters should be included for
   *  `GET` requests.
   * @param body The body of the request (POST only)
   * @param retriesAttempted The number of retries already attempted due to
   *  HTTP 429 errors. This argument should not be provided by consumers.
   * @returns The parsed response body
   */
  async req(
    method: Api.HttpMethod,
    path: string,
    body = {},
    retriesAttempted = 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    debugHttp(`${method} ${path} ${JSON.stringify(body)}`)

    const req: AxiosRequestConfig = {
      method,
      url: path,
      headers: {}
    }

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
      const rateLimitDesc = `${method} ${path} remaining=${rateLimit.remaining}/${rateLimit.limit} reset=${rateLimit.toReset}s`
      debugRateLimit(rateLimitDesc)

      // Attempt to authenticate in response to "Not Authorized" errors
      if (res.status === 401) {
        const { email, password } = this.config.server
        if (this.__authed && email && password) {
          this.__authed = false
          await this.auth(err)
          return await this.req(method, path, body)
        } else {
          throw new Error('Not Authorized', { cause: err })
        }
      }

      // Retry (if enabled) in response to "Too Many Requests" errors
      if (res.status === 429) {
        // Global rate limit is indicated by the lack of rate limit headers
        const isGlobal = !res.headers['x-ratelimit-limit']
        const cfg = this.config.client

        // Handle global rate limit
        if (isGlobal && cfg.retry429Global !== false) {
          const delay = Math.floor(Math.random() * 500) + 200
          await setTimeout(delay)
          return await this.req(method, path, body, retriesAttempted + 1)
        }

        // Handle endpoint-specific rate limits
        if (!isGlobal && retriesAttempted < cfg.retry429MaxRetries) {
          const delay = Math.min(
            cfg.retry429InitDelay * (2 ** retriesAttempted),
            cfg.retry429MaxDelay
          )
          debugRateLimitExceeded(rateLimitDesc + ` retriesAttempted=${retriesAttempted} delay=${delay / 1_000}s`)
          await setTimeout(delay)
          return await this.req(method, path, body, retriesAttempted + 1)
        }
      }

      if (err instanceof AxiosError) {
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

        const message = err instanceof Error
          ? `${err.name}: ${err.message}: ${err.stack}`
          : String(err)
        const apiErr = new Error(message)
        Object.assign(apiErr as Api.Error, details)
        throw err
      }

      throw err
    }
  }

  protected async gz(data: string): Promise<unknown> {
    const buf = Buffer.from(data.slice(3), 'base64')
    const ret = await gunzipAsync(buf)
    return JSON.parse(ret.toString())
  }

  protected buildRateLimit(method: Api.HttpMethod, path: string, res: RateLimitResponse) {
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

  /**
   * Enable or disable debug logging.
   * @param opts if undefined, disables debug logs for all namespaces.
   *  Otherwise, enables the specified namespaces and disables all others.
   * @see {@link Api.DebugOptions}
   */
  debug(opts?: Api.DebugOptions): void {
    if (!opts) {
      Debug.enable('')
      return
    }

    const namespaces = Object.entries(opts)
      .filter((entry: [string, unknown]) => !!entry[1])
      .map((entry: [string, unknown]) => `screepsapi:${entry[0]}`)
      .join()
    Debug.enable(namespaces)
  }
}

type RateLimitResponse = AxiosResponse<unknown, unknown, {
  'x-ratelimit-limit': number
  'x-ratelimit-remaining': number
  'x-ratelimit-reset': number
}>

declare global {
  namespace Api {
    /** Options to use with {@link ScreepsAPI.debug} */
    interface DebugOptions {
      /** Enable debug logs for HTTP API requests */
      http?: boolean
      /** Enable debug logs for HTTP API rate limit state */
      ratelimit?: boolean
      /** Enable debug logs for HTTP API rate limit exceeded events */
      ratelimitexceeded?: boolean
      /** Enable debug logs for WebSocket API events and messages */
      socket?: boolean
    }
  }
}
