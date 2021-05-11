import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, Method } from 'axios'
import Debug from 'debug'
import { EventEmitter } from 'events'
import { promisify } from 'util'
import { gunzip } from 'zlib'
import * as APITypes from './API.types'
import { ConfigManager, ServerConfig } from './ConfigManager'
import { RateLimit, RateLimitTracker } from './RateLimitTracker'
import { Socket } from './Socket'

const configManager = new ConfigManager()

const debugHttp = Debug('screepsapi:http')

const gunzipAsync = promisify(gunzip)
const sleep = promisify<number, number>((ms, cb) => setInterval(cb, ms))

const DEFAULT_SHARD = 'shard0'
const OFFICIAL_HISTORY_INTERVAL = 100
const PRIVATE_HISTORY_INTERVAL = 20

type APIOpts = ServerConfig & {
  url?: string
  shard?: string
  appConfig?: any
}

const DEFAULT_API_OPTS = {
  host: 'screeps.com',
  port: 443,
  secure: true,
  path: '/',
  token: ''
}

export declare interface ScreepsAPI {
  on(event: 'token', listener: (token: string) => void): this
  on(event: string, listener: Function): this
}

export class ScreepsAPI extends EventEmitter {
  private _tokenInfo: Promise<APITypes.TokenInfo>
  private _user: Promise<APITypes.UserInfo>
  private _authed: boolean
  http: AxiosInstance
  shard: string = DEFAULT_SHARD
  token: string
  opts: APIOpts = DEFAULT_API_OPTS
  readonly rateLimits: RateLimitTracker
  /** Config from UCF if specified */
  readonly config: any
  readonly socket: Socket
  constructor (opts: Partial<APIOpts> = {}) {
    super()
    if (opts.shard) this.shard = opts.shard
    if (opts.appConfig) this.config = opts.appConfig
    this.rateLimits = new RateLimitTracker()
    this.on('token', token => this.token = token)
    this.socket = new Socket(this)
    this.setServer(opts)
  }
  
  static async fromConfig(server = 'main', config = '', opts = {}) {
    const data = await configManager.getConfig()

    if (data) {
      if (!data.servers[server]) {
        throw new Error(`Server '${server}' does not exist in '${configManager.path}'`)
      }

      const conf: APIOpts = data.servers[server]
      if (conf.ptr) conf.path = '/ptr'
      if (conf.season) conf.path = '/season'
      conf.appConfig = (data.configs && data.configs[config]) || {}
      return new ScreepsAPI(conf)
    }

    throw new Error('No valid config found')
  }

  
  /** GET /api/version */
  version() {
    return this.req<APITypes.VersionResponse>('GET', '/api/version')
  }
  /** GET /api/authmod */
  async authmod(): Promise<APITypes.AuthmodResponse> {
    if (this.isOfficialServer()) {
      return { name: 'official' }
    }
    return this.req<APITypes.AuthmodResponse>('GET', '/api/authmod')
  }
  /**
   * Official:
   * GET /room-history/${shard}/${room}/${tick}.json
   * 
   * Private:
   * GET /room-history
   * 
   * @returns A json file with history data
   */
  history (room: string, tick: number, shard = this.shard): Promise<object> {
    if (this.isOfficialServer()) {
      tick -= tick % OFFICIAL_HISTORY_INTERVAL
      return this.req('GET', `/room-history/${shard}/${room}/${tick}.json`)
    } else {
      tick -= tick % PRIVATE_HISTORY_INTERVAL
      return this.req('GET', '/room-history', { room, time: tick })
    }
  }
  /**
   * POST /api/servers/list
   * A list of community servers
   */
  serversList () {
    return this.req<APITypes.ServersListResponse>('POST', '/api/servers/list', {})
  }
  /** POST /api/auth/signin */
  authSignin (emailOrUsername: string, password: string) {
    return this.req<APITypes.AuthSigninResponse>('POST', '/api/auth/signin', { email: emailOrUsername, password })
  }
  /** POST /api/auth/steam-ticket */
  authSteamTicket (ticket: string, useNativeAuth = false) {
    return this.req<APITypes.AuthSteamTicketResponse>('POST', '/api/auth/steam-ticket', { ticket, useNativeAuth })
  }
  /** GET /api/auth/me */
  authMe () {
    return this.req<APITypes.AuthMeResponse>('GET', '/api/auth/me')
  }
  /** GET /api/auth/query-token */ 
  authQueryToken (token: string) {
    return this.req<APITypes.AuthQueryTokenResponse>('GET', '/api/auth/query-token', { token })
  }
  /** GET /api/register/check-email */
  registerCheckEmail (email: string) {
    return this.req<APITypes.RegisterCheckEmailResponse>('GET', '/api/register/check-email', { email })
  }
  /** GET /api/register/check-username */
  registerCheckUsername (username: string) {
    return this.req<APITypes.RegisterCheckUsernameResponse>('GET', '/api/register/check-username', { username })
  }
  /** POST /api/register/set-username */
  registerSetUsername (username: string) {
    return this.req<APITypes.RegisterSetUsernameResponse>('POST', '/api/register/set-username', { username })
  }
  /** POST /api/register/submit */
  registerSubmit (username: string, email: string, password: string, modules: APITypes.CodeModules) {
    return this.req<APITypes.RegisterSubmitResponse>('POST', '/api/register/submit', { username, email, password, modules })
  }
  /** GET /api/user/messages/list?respondent={userId} */
  userMessagesList (respondent: string) {
    return this.req<APITypes.UserMessagesListResponse>('GET', '/api/user/messages/list', { respondent })
  }
  /** GET /api/user/messages/index */
  userMessagesIndex () {
    return this.req<APITypes.UserMessagesIndexResponse>('GET', '/api/user/messages/index')
  }
  /** GET /api/user/messages/unread-count */
  userMessagesUnreadCount () {
    return this.req<APITypes.UserMessagesUnreadCountResponse>('GET', '/api/user/messages/unread-count')
  }
  /** POST /api/user/messages/send */
  userMessagesSend (respondent: string, text: string) {
    return this.req<APITypes.UserMessagesSendResponse>('POST', '/api/user/messages/send', { respondent, text })
  }
  /** POST /api/user/messages/mark-read */
  userMessagesMarkRead (id: string) {
    return this.req<APITypes.UserMessagesMarkReadResponse>('POST', '/api/user/messages/mark-read', { id })
  }
  /** POST /api/game/map-stats **/
  gameMapStats(rooms: string[], statName: string, shard: string = this.shard) {
    return this.req<APITypes.GameMapStatsResponse>('POST', '/api/game/map-stats', { rooms, statName, shard })
  }
  /** POST /api/game/gen-unique-object-name **/
  gameGenUniqueObjectName(type: string, shard: string = this.shard) {
    return this.req<APITypes.GameGenUniqueObjectNameResponse>('POST', '/api/game/gen-unique-object-name', { type, shard })
  }
  /** POST /api/game/check-unique-object-name **/
  gameCheckUniqueObjectName(type: string, name: string, shard: string = this.shard) {
    return this.req<APITypes.GameCheckUniqueObjectNameResponse>('POST', '/api/game/check-unique-object-name', { type, name, shard })
  }
  /** POST /api/game/place-spawn **/
  gamePlaceSpawn(name: string, room: string, x: string, y: string, shard: string = this.shard) {
    return this.req<APITypes.GamePlaceSpawnResponse>('POST', '/api/game/place-spawn', { name, room, x, y, shard })
  }
  /** POST /api/game/create-flag **/
  gameCreateFlag(name: string, room: string, x: number, y: number, color: APITypes.FlagColor, secondaryColor: APITypes.FlagColor, shard: string = this.shard) {
    return this.req<APITypes.GameCreateFlagResponse>('POST', '/api/game/create-flag', { name, room, x, y, color, secondaryColor, shard })
  }
  /** POST /api/game/gen-unique-flag-name **/
  gameGenUniqueFlagName(shard: string) {
    return this.req<APITypes.GameGenUniqueFlagNameResponse>('POST', '/api/game/gen-unique-flag-name', { shard })
  }
  /** POST /api/game/check-unique-flag-name **/
  gameCheckUniqueFlagName(name: string, shard: string = this.shard) {
    return this.req<APITypes.GameCheckUniqueFlagNameResponse>('POST', '/api/game/check-unique-flag-name', { name, shard })
  }
  /** POST /api/game/change-flag-color **/
  gameChangeFlagColor(color: APITypes.FlagColor, secondaryColor: APITypes.FlagColor, shard: string = this.shard) {
    return this.req<APITypes.GameChangeFlagColorResponse>('POST', '/api/game/change-flag-color', { color, secondaryColor, shard })
  }
  /** POST /api/game/remove-flag **/
  gameRemoveFlag(name: string, room: string, shard: string = this.shard) {
    return this.req<APITypes.GameRemoveFlagResponse>('POST', '/api/game/remove-flag', { name, room, shard })
  }
  /** POST /api/game/add-object-intent **/
  gameAddObjectIntent(room: string, name: string, intent: any, shard: string = this.shard) {
    return this.req<APITypes.GameAddObjectIntentResponse>('POST', '/api/game/add-object-intent', { room, name, intent, shard })
  }
  /** POST /api/game/create-construction **/
  gameCreateConstruction(room: string, x: number, y: number, structureType: string, name: string, shard: string = this.shard) {
    return this.req<APITypes.GameCreateConstructionResponse>('POST', '/api/game/create-construction', { room, x, y, structureType, name, shard })
  }
  /** POST /api/game/set-notify-when-attacked **/
  gameSetNotifyWhenAttacked(_id: string, enabled: string, shard: string = this.shard) {
    return this.req<APITypes.GameSetNotifyWhenAttackedResponse>('POST', '/api/game/set-notify-when-attacked', { _id, enabled, shard })
  }
  /** POST /api/game/create-invader **/
  gameCreateInvader(room: string, x: number, y: number, size: number, type: string, boosted: boolean, shard: string = this.shard) {
    return this.req<APITypes.GameCreateInvaderResponse>('POST', '/api/game/create-invader', { room, x, y, size, type, boosted, shard })
  }
  /** POST /api/game/remove-invader **/
  gameRemoveInvader(_id: string, shard: string = this.shard) {
    return this.req<APITypes.GameRemoveInvaderResponse>('POST', '/api/game/remove-invader', { _id, shard })
  }
  /** GET /api/game/time **/
  gameTime(shard: string = this.shard) {
    return this.req<APITypes.GameTimeResponse>('GET', '/api/game/time', { shard })
  }
  /** GET /api/game/world-size **/
  gameWorldSize(shard: string = this.shard) {
    return this.req<APITypes.GameWorldSizeResponse>('GET', '/api/game/world-size', { shard })
  }
  /** GET /api/game/room-decorations **/
  gameRoomDecorations(room: string, shard: string = this.shard) {
    return this.req<APITypes.GameRoomDecorationsResponse>('GET', '/api/game/room-decorations', { room, shard })
  }
  /** GET /api/game/room-objects **/
  gameRoomObjects(room: string, shard: string = this.shard) {
    return this.req<APITypes.GameRoomObjectsResponse>('GET', '/api/game/room-objects', { room, shard })
  }
  /** GET /api/game/room-terrain **/
  gameRoomTerrain(room: string, encoded, shard: string = this.shard) {
    return this.req<APITypes.GameRoomTerrainResponse>('GET', '/api/game/room-terrain', { room, encoded, shard })
  }
  /** GET /api/game/room-status **/
  gameRoomStatus(room: string, shard: string = this.shard) {
    return this.req<APITypes.GameRoomStatusResponse>('GET', '/api/game/room-status', { room, shard })
  }
  /** GET /api/game/room-overview **/
  gameRoomOverview(room: string, interval: number, shard: string = this.shard) {
    return this.req<APITypes.GameRoomOverviewResponse>('GET', '/api/game/room-overview', { room, interval, shard })
  }
  /** GET /api/game/market/orders-index **/
  gameMarketOrdersIndex(shard: string = this.shard) {
    return this.req<APITypes.GameMarketOrdersIndexResponse>('GET', '/api/game/market/orders-index', { shard })
  }
  /** GET /api/game/market/my-orders **/
  async gameMarketMyOrders() {
    const res = await this.req<APITypes.GameMarketMyOrdersResponse>('GET', '/api/game/market/my-orders')
    return this.mapToShard(res)
  }
  /** GET /api/game/market/orders **/
  gameMarketOrders(resourceType: string, shard: string = this.shard) {
    return this.req<APITypes.GameMarketOrdersResponse>('GET', '/api/game/market/orders', { resourceType, shard })
  }
  /** GET /api/game/market/stats **/
  gameMarketStats(resourceType: string, shard: string = this.shard) {
    return this.req<APITypes.GameMarketStatsResponse>('GET', '/api/game/market/stats', { resourceType, shard })
  }
  /** GET /api/game/shards/info **/
  gameShardsInfo() {
    return this.req<APITypes.GameShardsInfoResponse>('GET', '/api/game/shards/info')
  }
  /** GET /api/leaderboard/list **/
  leaderboardList(limit: number, mode: string, offset: number, season: string) {
    return this.req<APITypes.LeaderboardListResponse>('GET', '/api/leaderboard/list', { limit, mode, offset, season })
  }
  /** GET /api/leaderboard/find **/
  leaderboardFind(season: string, mode: string, username: string) {
    return this.req<APITypes.LeaderboardFindResponse>('GET', '/api/leaderboard/find', { season, mode, username })
  }
  /** GET /api/leaderboard/seasons **/
  leaderboardSeasons() {
    return this.req<APITypes.LeaderboardSeasonsResponse>('GET', '/api/leaderboard/seasons')
  }
  /** POST /api/user/badge **/
  userBadge(badge: APITypes.Badge) {
    return this.req<APITypes.UserBadgeResponse>('POST', '/api/user/badge', { badge })
  }
  /** POST /api/user/respawn **/
  userRespawn() {
    return this.req<APITypes.UserRespawnResponse>('POST', '/api/user/respawn')
  }
  /** POST /api/user/set-active-branch **/
  userSetActiveBranch(branch: string, activeName: string) {
    return this.req<APITypes.UserSetActiveBranchResponse>('POST', '/api/user/set-active-branch', { branch, activeName })
  }
  /** POST /api/user/clone-branch **/
  userCloneBranch(branch: string, newName: string, defaultModules: APITypes.CodeModules = {}) {
    return this.req<APITypes.UserCloneBranchResponse>('POST', '/api/user/clone-branch', { branch, newName, defaultModules })
  }
  /** POST /api/user/delete-branch **/
  userDeleteBranch(branch: string) {
    return this.req<APITypes.UserDeleteBranchResponse>('POST', '/api/user/delete-branch', { branch })
  }
  /** POST /api/user/notify-prefs **/
  userNotifyPrefs(prefs: APITypes.NotifyPreferences) {
    return this.req<APITypes.UserNotifyPrefsResponse>('POST', '/api/user/notify-prefs', prefs)
  }
  /** POST /api/user/tutorial-done **/
  userTutorialDone() {
    return this.req<APITypes.UserTutorialDoneResponse>('POST', '/api/user/tutorial-done')
  }
  /** POST /api/user/email **/
  userEmail(email: string) {
    return this.req<APITypes.UserEmailResponse>('POST', '/api/user/email', { email })
  }
  /** GET /api/user/world-start-room **/
  userWorldStartRoom(shard: string = this.shard) {
    return this.req<APITypes.UserWorldStartRoomResponse>('GET', '/api/user/world-start-room', { shard })
  }
  /** GET /api/user/world-status **/
  userWorldStatus() {
    return this.req<APITypes.UserWorldStatusResponse>('GET', '/api/user/world-status')
  }
  /** GET /api/user/branches **/
  userBranches() {
    return this.req<APITypes.UserBranchesResponse>('GET', '/api/user/branches')
  }
  /** GET /api/user/code **/
  userCodeGet(branch: string) {
    return this.req<APITypes.UserCodeGetResponse>('GET', '/api/user/code', { branch })
  }
  /** POST /api/user/code **/
  userCodePost(branch: string, modules: APITypes.CodeModules, _hash?: string) {
    if (!_hash) _hash = Date.now().toString()
    return this.req<APITypes.UserCodePostResponse>('POST', '/api/user/code', { branch, modules, _hash })
  }
  /** GET /api/user/decorations/inventory **/
  userDecorationsInventory() {
    return this.req<APITypes.UserDecorationsInventoryResponse>('GET', '/api/user/decorations/inventory')
  }
  /** GET /api/user/decorations/themes **/
  userDecorationsThemes() {
    return this.req<APITypes.UserDecorationsThemesResponse>('GET', '/api/user/decorations/themes')
  }
  /** POST /api/user/decorations/convert **/
  userDecorationsConvert(decorations: string[]) {
    return this.req<APITypes.UserDecorationsConvertResponse>('POST', '/api/user/decorations/convert', { decorations })
  }
  /** POST /api/user/decorations/pixelize **/
  userDecorationsPixelize(count: number, theme: string) {
    return this.req<APITypes.UserDecorationsPixelizeResponse>('POST', '/api/user/decorations/pixelize', { count, theme })
  }
  /** POST /api/user/decorations/activate **/
  userDecorationsActivate(_id: string, active: string) {
    return this.req<APITypes.UserDecorationsActivateResponse>('POST', '/api/user/decorations/activate', { _id, active })
  }
  /** POST /api/user/decorations/deactivate **/
  userDecorationsDeactivate(decorations: string[]) {
    return this.req<APITypes.UserDecorationsDeactivateResponse>('POST', '/api/user/decorations/deactivate', { decorations })
  }
  /** GET /api/user/respawn-prohibited-rooms **/
  userRespawnProhibitedRooms() {
    return this.req<APITypes.UserRespawnProhibitedRoomsResponse>('GET', '/api/user/respawn-prohibited-rooms')
  }
  /** GET /api/user/memory **/
  async userMemoryGet(path: string, shard: string = this.shard) {
    const res = await this.req<APITypes.UserMemoryGetResponse>('GET', '/api/user/memory', { path, shard })
    if (res.data.startsWith('gz:')) res.data = await this.gz(res.data)
    return res.data
  }
  /** POST /api/user/memory **/
  userMemoryPost(path: string, value: any, shard: string = this.shard) {
    return this.req<APITypes.UserMemoryPostResponse>('POST', '/api/user/memory', { path, value, shard })
  }
  /** GET /api/user/memory-segment **/
  async userMemorySegmentGet(segment: number, shard: string = this.shard) {
    const res = await this.req<APITypes.UserMemorySegmentGetResponse>('GET', '/api/user/memory-segment', { segment, shard })
    if (res.data.startsWith('gz:')) res.data = await this.gz(res.data)
    return res.data
  }
  /** POST /api/user/memory-segment **/
  userMemorySegmentPost(segment: number, data: string, shard: string = this.shard) {
    return this.req<APITypes.UserMemorySegmentPostResponse>('POST', '/api/user/memory-segment', { segment, data, shard })
  }
  /** GET /api/user/find **/
  userFind(username: string) {
    return this.req<APITypes.UserFindResponse>('GET', '/api/user/find', { username })
  }
  /** GET /api/user/find **/
  userFindById(id: string) {
    return this.req<APITypes.UserFindResponse>('GET', '/api/user/find', { id })
  }
  /** GET /api/user/stats **/
  userStats(interval: number) {
    return this.req<APITypes.UserStatsResponse>('GET', '/api/user/stats', { interval })
  }
  /** GET /api/user/rooms **/
  userRooms(id: string) {
    return this.req<APITypes.UserRoomsResponse>('GET', '/api/user/rooms', { id })
  }
  /** GET /api/user/overview **/
  userOverview(interval: number, statName: APITypes.StatName) {
    return this.req<APITypes.UserOverviewResponse>('GET', '/api/user/overview', { interval, statName })
  }
  /** GET /api/user/money-history **/
  userMoneyHistory(page: number = 0) {
    return this.req<APITypes.UserMoneyHistoryResponse>('GET', '/api/user/money-history', { page })
  }
  /** POST /api/user/console **/
  userConsole(expression: string, shard: string = this.shard) {
    return this.req<APITypes.UserConsoleResponse>('POST', '/api/user/console', { expression, shard })
  }
  /** GET /api/user/name **/
  userName() {
    return this.req<APITypes.UserNameResponse>('GET', '/api/user/name')
  }
  /** GET /api/experimental/pvp **/
  experimentalPvp(interval: number) {
    return this.req<APITypes.ExperimentalPvpResponse>('GET', '/api/experimental/pvp', { interval })
  }
  /** GET /api/experimental/nukes **/
  async experimentalNukes() {
    const res = await this.req<APITypes.ExperimentalNukesResponse>('GET', '/api/experimental/nukes')
    return this.mapToShard(res)
  }
  /** GET /api/warpath/battles **/
  warpathBattles(interval: number) {
    return this.req<APITypes.WarpathBattlesResponse>('GET', '/api/warpath/battles', { interval })
  }
  /** GET /api/scoreboard/list **/
  scoreboardList(limit: number, offset: number = 0) {
    return this.req<APITypes.ScoreboardListResponse>('GET', '/api/scoreboard/list', { limit, offset })
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

  mapToShard (res: any): any { 
    if (!res.shards) {
      res.shards = {
        privSrv: res.list || res.rooms
      }
    }
    return res
  }

  setServer (opts: Partial<APIOpts>) {
    this.opts = Object.assign({}, DEFAULT_API_OPTS, opts)
    if (opts.token) {
      this.token = opts.token
    }
    debugHttp(`setServer ${JSON.stringify(opts)}`)
    this.http = axios.create({
      baseURL: `${this.opts.secure?'https':'http'}://${this.opts.host}:${this.opts.port}${this.opts.path}`
    })
  }

  async auth (emailOrUsername?: string, password?: string) {
    if (emailOrUsername && password) {
      Object.assign(this.opts, { email: emailOrUsername, password })
    }
    const res = await this.authSignin(this.opts.username, this.opts.password)
    if (res.error) {
      throw new Error(res.error)
    }
    this.emit('token', res.token)
    this.emit('auth')
    this._authed = true
    return res
  }

  private updateRateLimits(method: string, path: string, res: AxiosResponse) {
    const {
      headers: {
        'x-ratelimit-limit': limit = '',
        'x-ratelimit-remaining': remaining = '',
        'x-ratelimit-reset': reset = ''
      } = {}
    } = res
    this.emit('rateLimit', { limit, remaining, reset })
    this.rateLimits.updateLimit(method, path, {
      limit,
      remaining,
      reset
    })
  }

  async req<T> (method: string, path: string, body = {}, retries: number = 0): Promise<T> {
    const opts: AxiosRequestConfig = {
      method: method as Method,
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
      const res = await this.http(opts) as AxiosResponse<T>
      const token = res.headers['x-token']
      if (token) {
        this.emit('token', token)
      }
      this.updateRateLimits(method, path, res.headers)
      this.emit('response', res)
      return res.data
    } catch (err) {
      const res = err.response || {}
      this.updateRateLimits(method, path, res.headers)
      if (res.status === 401) {
        if (this._authed && !this.isOfficialServer()) {
          this._authed = false
          await this.auth(this.opts.username, this.opts.password)
          return this.req<T>(method, path, body)
        } else {
          throw new Error('Not Authorized')
        }
      }
      if (res.status === 429 && !res.headers['x-ratelimit-limit']) {
        retries++
        const retryLimit = 5
        if (retries == retryLimit) throw new Error(`Exceeded retry limit (${retryLimit})`)
        const time = Math.min(5000, Math.pow(2, retries) * 100)
        await sleep(time)
        return this.req<T>(method, path, body, retries)
      }
      throw new Error(res.data || err.message)
    }
  }

  async gz(data: string): Promise<string> {
    const buf = Buffer.from(data.slice(3), 'base64')
    const ret = await gunzipAsync(buf)
    return ret.toString()
  }

  getRateLimit(method: string, path: string): RateLimit {
    return this.rateLimits[method][path] || this.rateLimits.global
  }

  get rateLimitResetUrl() {
    return `https://screeps.com/a/#!/account/auth-tokens/noratelimit?token=${this.token.slice(
      0,
      8
    )}`
  }

  async me() {
    if (this._user) return this._user
    const tokenInfo = await this.tokenInfo()
    if (tokenInfo.full) {
      this._user = this.authMe()
    } else {
      const { username } = await this.userName()
      this._user = this.userFind(username).then(u => u.user)
    }
    return this._user
  }

  async tokenInfo() {
    if (this._tokenInfo) {
      return this._tokenInfo
    }
    if (this.opts.token) {
      this._tokenInfo = this.authQueryToken(this.token).then(t => t.token)
    } else {
      this._tokenInfo = Promise.resolve({ full: true })
    }
    return this._tokenInfo
  }

  async userId() {
    const user = await this.me()
    return user._id
  }
}