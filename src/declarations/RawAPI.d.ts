/** Body of a API success response */
interface ApiResponse {
  /** An API success response always contains `{ ok: 1 }` */
  ok: 1
}

/**
 * Body of an API success response that has not been typed yet.
 * Please consider submitting a PR to replace this type
 * if you have a sample response body.
 */
interface UnknownApiResponse extends ApiResponse {
  [propertyName: string]: unknown
}

/**
 * Error details: either a simple error message string (ex: 'invalid'),
 * or detailed request/response data
 */
interface ErrorApiResponse {
  /** The API request that caused the error */
  config: {
    headers: { [headerName: string]: unknown }
    method: HttpMethod
    params?: { [paramName: string]: unknown }
    url: string
  }
  /**
   * The response body (usually an HTML document
   * with an error message in the body)
   */
  data: string
  /** Response headers */
  headers: { [headerName: string]: unknown }
  /** HTTP error status code */
  status: number
  statusText: string
}

/** GET /api/version response */
interface VersionApiResponse extends ApiResponse {
  /** Client version number; undefined on non-official servers */
  package?: number
  protocol: number
  serverData: {
    customObjectTypes: object
    /** Number of ticks in each complete history file/chunk */
    historyChunkSize: number
    renderer: {
      resources: object
      metadata: object
    }
    features: Array<{
      name: string
      version: number
      menuItems: Array<{
        section: number
        start?: number
        after?: string
        module?: string
        item: object
      }>
    }>
    shards: string[]
    /** socket update rate; undefined on official servers */
    socketUpdateThrottle?: number
    /** welcome message that will be displayed upon signin */
    welcomeText?: string
  }
  /**
   * Name of the current season (usually the season number as a string);
   * undefined on unofficial servers
   */
  currentSeason?: string
  /** undefined on unofficial servers */
  decorationConvertationCost?: number
  /** undefined on unofficial servers */
  decorationPixelizationCost?: number
  /** undefined on official servers */
  useNativeAuth?: boolean
  /** Sum of the number of active players on each shard */
  users: number
}

/** GET /api/authmod response */
type AuthModApiResponse = OfficialAuthModApiResponse | UnofficialAuthModApiResponse

interface OfficialAuthModApiResponse extends ApiResponse {
  name: 'official'
}

interface UnofficialAuthModApiResponse extends ApiResponse {
  allowRegistration: boolean
  github: boolean
  gitlab: boolean
  /** Name of the authmod being used (ex: 'screepsmod-auth') */
  name: string
  steam: boolean
  /** Semantic version number of the mod */
  version: string
}

/** GET /api/room-history response: a room history JSON file */
interface RoomHistoryApiResponse extends ApiResponse {
  /** UNIX timestamp (UTC) indicating the time at the start of the chunk */
  timestamp: number
  /** Room name */
  room: string
  /** Number of the first tick in this chunk */
  base: number
  ticks: { [tick: number]: HistoryTick }
}

/** Data from a single tick in a {@link RoomHistoryApiResponse} */
interface HistoryTick {
  [id: string]: RoomObject
}

/** POST /api/servers/list response: a curated list of community-run servers */
interface ServerListApiResponse extends ApiResponse {
  servers: {
    _id: string
    settings: {
      host: string
      port: string
      pass: string
    }
    name: string
    /** Usually 'active' */
    status: string
    likeCount: number
  }
}

/** POST /api/auth/signin response */
interface AuthSigninApiResponse extends ApiResponse {
  token: string
}

/** GET /api/auth/me response */
interface AuthMeApiResponse extends ApiResponse {
  _id: string
  badge?: Badge
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

/** GET /api/auth/query-token response */
interface AuthQueryTokenApiResponse extends ApiResponse {
  _id: string
  token: TokenInfo
}

interface TokenInfo {
  /**
   * If true, this token can be used to authenticate to all API endpoints.
   * If false, {@link endpoints} and {@link websockets} will be defined.
   */
  full: boolean
  /** List of permitted REST API endpoints (ex: `GET /api/user/name`) */
  endpoints?: string[]
  /** List of permitted websocket endpoints (ex: `WebSockets (console)`) */
  websockets?: string[]
  /** The token supplied with the request */
  token: string
  /** The name/description that was provided with the key generation request */
  description?: string
}

/** POST /api/game/map-stats response */
interface GameMapStatsApiResponse<S extends MapRoomStat> extends ApiResponse {
  gameTime: number
  stats: {
    [roomName: string]: GameMapStatsRoom & {
      [P in S]: {
        user: string
        value: number
      }
    }
  }
  users: Users
}

interface GameMapStatsRoom {
  own?: {
    user: string
    level: number
  }
  status: RoomStatus
}

/**
 * POST /api/game/gen-unique-object-name and
 * POST /api/game/gen-unique-flag-name responses
 */
interface GameGenUniqueNameApiResponse extends ApiResponse {
  name: string
}

/** POST /api/game/create-construction response */
interface GameCreateConstructionApiResponse extends ApiResponse {
  result: {
    ok: 1
    n: 1
  }
  ops: Array<{
    _id: string
    type: RoomObjectConstant
    room: string
    x: number
    y: number
    structureType: BuildableStructureConstant
    user: string
    progress: number
    progressTotal: number
  }>
  insertedCount: number
  insertedIds: string[]
}

/** GET /api/game/time response */
interface GameTimeApiResponse extends ApiResponse {
  time: number
}

/** GET /api/game/world-size response */
interface GameWorldSizeApiResponse extends ApiResponse {
  /** Width of this shard's map (in rooms) */
  width: number
  /** Height of this shard's map (in rooms) */
  height: number
}

/** GET /api/game/world-size response */
interface GameWorldSizeApiResponse extends ApiResponse {
  /** Width of this shard's map (in rooms) */
  width: number
  /** Height of this shard's map (in rooms) */
  height: number
}

/** GET /api/game/room-decorations response */
interface GameRoomDecorationsApiResponse extends ApiResponse {
  decorations: DecorationInstance[]
}

/** GET /api/game/room-objects response */
interface GameRoomObjectsApiResponse extends ApiResponse {
  objects: RoomObject[]
  users: Users
}

/** GET /api/game/room-terrain response when `encoded` param is defined and non-empty */
interface GameRoomTerrainEncodedApiResponse extends ApiResponse {
  terrain: {
    0: {
      _id: string
      room: string
      /**
       * Index by y*50+x to find terrain for a position:
       * - 0: plain
       * - 1: wall
       * - 2: swamp
       */
      terrain: string
    }
  }
}

/** GET /api/game/room-terrain response when `encoded` param is undefined|null|'' */
interface GameRoomTerrainUnencodedApiResponse extends ApiResponse {
  /** Unlisted positions are of type `plain` */
  terrain: Array<{
    room: string
    x: number
    y: number
    type: 'swamp' | 'wall'
  }>
}

/** GET /api/game/room-status response */
interface GameRoomStatusApiResponse extends ApiResponse {
  /** The room name */
  _id: string
  /** UNIX timestamp of time this room stopped / will stop being a novice area */
  novice?: number
  /** UNIX timestamp of time this room stopped / will stop being a respawn area */
  respawn?: number
  /** UNIX timestamp of time this room left the 'closed' status */
  openTime?: number
  status: RoomStatus
}

/** GET /api/game/room-overview response */
interface GameRoomOverviewApiResponse extends ApiResponse {
  owner: {
    badge: Badge
    username: string
  } | null
  stats: {
    /**
     * Each stat contains an 8-element array listing stat values
     * for each time slot (least recent to most recent)
     */
    [statId in RoomStat]: Array<{
      value: number
      /**
       * Monotonically increasing integers that do not correspond
       * to game time or UNIX timestamps
       */
      endTime: number
    }>
  }
  statsMax: { [statMaxId in `${RoomStat}${RoomStatInterval}`]: number }
  /** Total values for each non-zero stat (stats with 0 totals are undefined) */
  totals: { [statId in RoomStat]: number | undefined }
}

/** GET /api/game/market/orders-index response */
interface GameMarketIndexApiResponse extends ApiResponse {
  list: Array<{
    _id: MarketResourceConstant
    /** Number of open orders */
    count: number
    avgPrice: number
    stdeevPrice: number
  }>
}

/**
 * GET /api/game/market/my-orders response
 * Intershard orders will be listed under the `'intershard'` key
 */
type GameMarketMyOrdersApiResponse = ApiResponse & {
  [shardName: string]: Order[]
}

/** GET /api/game/market/orders response */
interface GameMarketOrdersApiResponse extends ApiResponse {
  list: OpenOrder[]
}

/** GET /api/game/market/stats resonse */
interface GameMarketStatsApiResponse extends ApiResponse {
  stats: Array<{
    _id: string
    /** YYYY-MM-DD format */
    date: string
    resourceType: MarketResourceConstant
    avgPrice: number
    stddevPrice: number
    volume: number
    transactions: number
  }>
}

/** GET /api/game/shards/info response */
interface GameShardsInfoApiResponse extends ApiResponse {
  shards: Array<{
    name: string
    cpuLimit: number
    /** Durations of the most recent (30?) ticks in milliseconds */
    lastTicks: number[]
    /** Number of claimable rooms */
    rooms: number
    /** Number of active users */
    users: number
    /** Average tick duration */
    tick: number
  }>
}

/** GET /api/leaderboard/list response */
interface LeaderboardListApiResponse extends ApiResponse {
  list: LeaderboardResult[]
  /** Total number of results in this season */
  count: number
  users: Users
}

/** GET /api/leaderboard/find response */
interface LeaderboardFindApiResponse extends ApiResponse, LeaderboardResult {}

interface LeaderboardResult {
  _id: string
  season: string
  user: string
  score: number
  rank: number
}

/** GET /api/leaderboard/seasons response */
interface LeaderboardSeasonsApiResponse extends ApiResponse {
  seasons: Array<{
    /** YYYY-MM */
    _id: string
    /** ISO 8601 season start timestamp */
    date: string
    /** <Month> <Year> */
    name: string
  }>
}

/** GET /api/seasons/current response */
interface ApiSeasonsCurrentResponse extends ApiResponse {
  /** Name of the season (ex: "Season 8") */
  title: string
  /** Your current ranking on the seasonal leaderboard */
  rank: number
  /** The season ordinal (ex: 5 for season 5, 8 for season 8) */
  index: number
  /** Season start date/time (ISO 8601 UTC) */
  startDate: string
  /** Season end date/time (ISO 8601 UTC) */
  endDate: string
  /** Date/time at which this season was published (ISO 8601 UTC) */
  createdAt: string
  /** Date/time at which this season was last updated (ISO 8601 UTC) */
  updatedAt: string
}

/** POST /api/user/notify-prefs response */
interface UserNotifyPrefsApiRequest {
  disabled: boolean
  disabledOnMessages?: boolean
  sendOnline?: boolean
  interval?: number
  errorsInterval?: number
}

/** GET /api/user/world-start-room response */
interface UserWorldStartRoomApiResponse extends ApiResponse {
  /**
   * Zero or one room names; if a shard name was not included in the request,
   * results are formatted as `${shardName}/${roomName}`
   */
  room: string[]
}

/** GET /api/user/world-status response */
interface UserWorldStatusApiResponse extends ApiResponse {
  /**
   * - Normal: user has one or more active spawns
   * - Lost: user has no active spawns
   * - Empty: user has just entered the world or respawned
   *    and has yet to place a spawn
   */
  status: 'normal' | 'lost' | 'empty'
}

/** GET /api/user/branches response */
interface UserBranchesApiResponse extends ApiResponse {
  list: Array<{
    _id: string
    branch: string
    activeWorld: boolean
    activeSim: boolean
  }>
}

/** GET /api/user/code response */
interface UserCodeGetApiResponse extends ApiResponse, UserCodeSetApiRequest {}

/** POST /api/user/code response */
interface UserCodeSetApiRequest {
  branch: string
  modules: { [moduleName: string]: string | { binary: string } }
}

/** GET /api/user/decorations/inventory response */
interface UserDecorationInventoryApiResponse extends ApiResponse {
  list: DecorationInstance[]
}

/** GET /api/user/decorations/themes response */
interface UserDecorationThemesApiResponse extends ApiResponse {
  list: Array<{
    _id: string
    /** Web color format */
    color: string
    name: string
    /** ISO 8601 timestamp */
    createdAt: string
    /** ISO 8601 timestamp */
    updatedAt: string
    /** Appears to always be 0 */
    __v: number
  }>
}

/** GET /api/user/messages/list response */
interface UserMessagesListApiResponse extends ApiResponse {
  messages: Array<{
    /** ID of the message */
    _id: string
    /** ISO 8601 timestamp */
    date: string
    /** incoming or outgoing */
    type: 'in' | 'out'
    /** Message body */
    text: string
    unread: boolean
  }>
}

/**
 * Message data returned by {@link UserMessagesListApiResponse},
 * {@link UserMessagesIndexApiResponse}, etc
 */
interface ListMessage {
  /** ID of the message */
  _id: string
  /** ISO 8601 timestamp */
  date: string
  /** incoming or outgoing */
  type: 'in' | 'out'
  /** Message body */
  text: string
  unread: boolean
}

/** GET /api/user/messages/index response */
interface UserMessagesIndexApiResponse extends ApiResponse {
  messages: Array<{
    _id: string
    message: Message
  }>
  users: Users
}

/** Message data returned by {@link UserMessagesIndexApiResponse} */
interface Message extends ListMessage {
  /** ID of the other user */
  respondent: string
  /** ID of the current user */
  user: string
  /** ID of ??? */
  outMessage: string
}

/** GET /api/user/messages/unread-count response */
interface UserMessagesUnreadCountApiResponse extends ApiResponse {
  count: number
}

/** POST /api/user/messages/mark-read response */
interface UserMessagesMarkReadApiResponse extends ApiResponse {
  0: number
  1: number
  2: DbModifiedResult
}

/** POST /api/user/memory response */
interface UserMemorySetApiResponse extends ApiResponse, DbModifiedApiResponse {
  ops: Array<{
    user: string
    expression: string
    hidden: boolean
  }>
  data: string
  insertedCount: number
  insertedIds: string[]
}

/** GET /api/user/memory-segment response */
interface UserMemorySegmentGetApiResponse extends ApiResponse {
  data: string
}

/** GET /api/user/find response */
interface UserFindApiResponse extends ApiResponse {
  user: User & {
    /** Total control points earned by this user */
    gcl: number
    /** Total power processed by this user */
    power?: number
    /** User's linked Steam account (if public) */
    steam?: {
      id: string
    }
  }
}

/** GET /api/user/respawn-prohibited-rooms response */
interface UserRespawnProhibitedRoomsApiResponse extends ApiResponse {
  /**
   * Zero or one room names; results are formatted as `${shardName}/${roomName}`
   */
  rooms: string[]
}

/** GET /api/user/rooms response */
interface UserRoomsApiResponse extends ApiResponse {
  /** All arrays in this object will always be empty */
  reservations: { [shardName: string]: string[] }
  /** Names of all rooms claimed by this user, keyed by shard */
  shards: { [shardName: string]: string[] }
}

/** GET /api/user/overview response */
interface UserOverviewApiResponse extends ApiResponse {
  statsMax: number
  totals: { [statName in RoomStat]: number }
  shards: {
    [shardName: string]: {
      rooms: string[]
      stats: {
        /**
         * Each room contains an 8-element array listing stat values
         * for each time slot (least recent to most recent)
         */
        [roomName: string]: Array<{
          value: number
          /**
           * Monotonically increasing integers that do not correspond
           * to game time or UNIX timestamps
           */
          endTime: number
        }>
      }
      /** Shard game time of the beginning of the displayed stat interval */
      gameTimes: [number, undefined, undefined, undefined, undefined, undefined, undefined, undefined]
    }
  }
}

/** GET /api/user/money-history response */
interface UserMoneyHistoryApiResponse extends ApiResponse {
  list: Array<{
    _id: string
    /** ISO 8601 transaction timestamp */
    date: string
    /** Game time of transaction */
    tick?: number
    /** This user's ID */
    user: string
    type: 'market.buy' | 'market.sell' | 'market.fee'
    /** Balance after the transaction was completed */
    balance: number
    /** Credits spent for or earned by this transaction */
    change: number
    shard?: string
    market: MoneyHistoryChangeOrderPrice | MoneyHistoryExtendOrder | MoneyHistoryFillOrder | MoneyHistoryNewOrder
  }>
  page: number
  /** True if additional pages can be fetched */
  hasMore: boolean
}

interface MoneyHistoryChangeOrderPrice {
  changeOrderPrice: {
    orderId: string
    oldPrice: number
    newPrice: number
  }
}

interface MoneyHistoryExtendOrder {
  extendOrder: {
    orderId: string
    addAmount: number
  }
}

interface MoneyHistoryFillOrder {
  resourceType: MarketResourceConstant
  roomName?: string
  targetRoomName?: string
  /** ID of the user who created the order */
  owner?: string
  /** ID of the user who filled the order */
  dealer?: string
  price: number
  amount: number
  npc?: boolean
}

interface MoneyHistoryNewOrder {
  order: {
    type: 'buy' | 'sell'
    resourceType: MarketResourceConstant
    price: number
    totalAmount: number
    roomName?: string
  }
}

/** POST /api/user/console response */
interface UserConsoleApiResponse extends ApiResponse {
  result: {
    ok: 1
    n: 1
  }
  ops: [{
    _id: string
    user: string
    expression: string
    shard: string
  }]
  insertedCount: 1
  insertedIds: [string]
}

/** GET /api/user/name response */
interface UserNameApiResponse extends ApiResponse {
  username: string
}

/** GET /api/experimental/pvp response */
interface ExperimentalPvpApiResponse extends ApiResponse {
  pvp: {
    [shardName: string]: {
      /** Results sorted by {@link lastPvpTime} DESC */
      rooms: Array<{
        /** Name of the room */
        _id: string
        /** Last tick at which a combat action occurred in this room */
        lastPvpTime: number
      }>
      /** Current game time on this shard */
      time: number
    }
  }
}

/** GET /api/experimental/nukes response */
interface ExperimentalNukesApiResponse extends ApiResponse {
  nukes: { [shardName: string]: Nuke[] }
}

/** GET /api/scoreboard/list response */
interface ScoreboardListApiResponse extends ApiResponse {
  meta: {
    /** The total number of players who have spawned on this season's map */
    length: number
  }
  /** A page of player leaderboard results */
  users: Array<{
    /** A player's username */
    username: string
    /** The player's current score for this season */
    score: number
  }>
}

// Common Types

/**
 * Parameters used to render a player's SVG icon / logo / "bust"
 * (as it is referenced in the client)
 */
interface Badge {
  color1: string
  color2: string
  color3: string
  flip: boolean
  param: number
  /**
   * ID number (0-30ish) for a standard badge, or
   * two SVG path strings for premium badges (from decorations)
   */
  type: number | {
    path1: string
    path2: string
  }
  /** Decoration ID of the badge if this is not a standard one */
  decoration?: string
}

/**
 * Shard CPU limits returned by `GET /api/auth/me`
 * and accepted by `POST /api/user/cpu-shards`
 */
interface CpuShardLimits { [shardName: string]: number | undefined }

/** Generic API response to a request to update database records */
interface DbModifiedApiResponse extends ApiResponse {
  result: DbModifiedResult
}

/** MongoDB result output from an update operation */
interface DbModifiedResult {
  /** If an error is not raised, this will always be 1 to indicate success */
  ok: 1
  /**
   * Number of records that were modified. For a single-record update:
   * 1 if the record was updated; 0 if it was already in the target state
   */
  nModified: number
  /** Number of records matched by the request parameters */
  n: number
}

/** Generic API response to a request to create/update database records */
interface DbUpsertedApiResponse extends ApiResponse {
  result: DbUpsertedResult
}

/** MongoDB result output from an upsert operation */
interface DbUpsertedResult extends DbModifiedResult {
  upserted: Array<{
    _id?: string
    index: number
  }>
}

/** All HTTP methods used for Screeps API endpoints */
type HttpMethod = 'GET' | 'POST'

/** IDs of stats that can be used with the POST /api/game/map-stats endpoint */
type MapRoomStat =
  | 'owner0'
  | 'claim0'
  | RoomStat

/** IDs of room-level stats that can be viewed in a room/player overview */
type RoomStat =
  | 'creepsLost'
  | 'creepsProduced'
  | 'energyConstruction'
  | 'energyControl'
  | 'energyCreeps'
  | 'energyHarvested'
  | 'powerProcessed'

type RoomStatInterval = 8 | 180 | 1440

/** @see https://docs.screeps.com/api/#Game.map.getRoomStatus */
type RoomStatus =
  | 'closed'
  | 'normal'
  | 'novice'
  | 'respawn'

/** High-level metadata for an individual user */
interface User {
  _id: string
  username: string
  badge: Badge
}

interface Users { [userId: string]: User }
