export type Badge = {
  color1: string;
  color2: string;
  color3: string;
  flip: boolean;
  param: number;
  type: number | { path1: string, path2: string };
}

export type UserInfo = {
  _id: string
  username: string
  badge: Badge
  gcl?: number
}

export type UserInfoMap = {
  [id: string]: UserInfo
}

export type TokenInfo = {
  _id?: string
  full: boolean
  token?: string
  noRatelimitUntil?: number
  description?: string
}

export type CodeModules = {
  [name: string]: string | { binary: string }
}

export enum FlagColor {
 Red = 1,
 Purple = 2,
 Blue = 3,
 Cyan = 4,
 Green = 5,
 Yellow = 6,
 Orange = 7,
 Brown = 8,
 Grey = 9,
 White = 10
}

export type NotifyPreferences = {
  sendOnline?: number
  errorsInterval?: number
  disabledOnMessages?: boolean
  disabled?: boolean
  interval?: number
}
export type ServerResponse = {
  ok?: number
  error?: string
}

export type VersionResponse = ServerResponse & {
  package: number
  protocol: number
  serverData: {
    historyChunkSize: number
    customObjectTypes?: { [type: string]: object }
    features?: object[]
    shards?: string[]
    renderer?: object
  }
  users: number
  currentSeason?: string
  seasonAccessCost?: string
  decorationConvertationCost?: number
  decorationPixelizationCost?: number
}

export type AuthmodResponse = ServerResponse & {
  name: string
}

export type ServersListResponse = ServerResponse & {
  servers: {
    _id: string
    settings: {
      host: string
      port: string
      pass: string
    },
    name: string
    status: 'active' | string
    likeCount: number
  }[]
}

export type AuthSigninResponse = ServerResponse & {
  token: string
}

export type AuthSteamTicketResponse = ServerResponse

export type AuthMeResponse = ServerResponse & {
  _id: string
  email: string
  username: string
  cpu: number
  badge: Badge
  /** true if a password is set, false otherwise */
  password: boolean
  notifyPrefs: NotifyPreferences
  gcl: number
  credits: number
  subscription: boolean
  lifetimeSubscription?: boolean
  power?: number
  money?: number
  subscriptionTokens?: number
  cpuShard?: { [shard: string]: number }
  cpuShardUpdatedTime?: number
  runtime?: { ivm: boolean }
  powerExperimentations?: number
  powerExperimentationTime?: number
  resources?: { cpuUnlock?: number; pixel?: number; accessKey?: number }
  playerColor?: string | null
  promoPixels?: any
  lastChargeTime?: number
  lastTweetTime?: number
  lastRespawnDate?: number
  github?: {
    id: string
    username: string
  }
  twitter?: {
    username: string
    followers_count: number
  }
  steam?: {
    id: string
    displayName: string
    ownership: number[]
  }
}

export type AuthQueryTokenResponse = ServerResponse & {
  token: TokenInfo
}
export type RegisterCheckEmailResponse = ServerResponse
export type RegisterCheckUsernameResponse = ServerResponse
export type RegisterSetUsernameResponse = ServerResponse
export type RegisterSubmitResponse = ServerResponse

export type UserMessage = {
  _id: string
  date: string
  type: string
  text: string
  unread: boolean
  respondent?: string
  outMesage?: string
}

export type UserMessagesListResponse = ServerResponse & {
  messages: UserMessage[]
}
export type UserMessagesIndexResponse = ServerResponse & {
  messages: {
    _id: string,
    message: UserMessage
  }[]
  users: UserInfoMap
}

export type UserMessagesUnreadCountResponse = ServerResponse & {
  count: number
}

export type UserMessagesSendResponse = ServerResponse
export type UserMessagesMarkReadResponse = ServerResponse

export type StatName = 'owner0' | 'claim0' | 'creepsLost' | 'creepsProduced' | 'energyConstruction' | 'energyControl' | 'energyCreeps' | 'energyHarvested'

export type GameMapStatsRoomSign = {
  user: string
  text: string
  time: number
  datetime: number
}

export type GameMapStatsRoom = {
  status: string
  novice?: number
  own?: { user: string; level: number }
  sign?: GameMapStatsRoomSign
  isPowerEnabled?: boolean
  /** Stat arrays keyed by stat name, e.g. energyHarvested: [{ user, value }] */
  [statName: string]: { user: string; value: any }[] | any
}

export type GameMapStatsResponse = ServerResponse & {
  gameTime?: number
  stats: { [roomName: string]: GameMapStatsRoom }
  decorations?: object
  users: UserInfoMap
}
export type GameGenUniqueObjectNameResponse = ServerResponse & {
  name: string
}
export type GameCheckUniqueObjectNameResponse = ServerResponse
export type GamePlaceSpawnResponse = ServerResponse & {
  newbie?: boolean
}
export type GameCreateFlagResponse = ServerResponse & {
  result?: MongoWriteResult
  connection?: MongoConnection
}
export type GameGenUniqueFlagNameResponse = ServerResponse & {
  name: string
}
export type GameCheckUniqueFlagNameResponse = ServerResponse
export type GameChangeFlagColorResponse = ServerResponse & {
  result?: MongoWriteResult
  connection?: MongoConnection
}
export type GameRemoveFlagResponse = ServerResponse
export type GameAddObjectIntentResponse = ServerResponse & {
  result?: MongoWriteResult
  connection?: MongoConnection
}
export type GameCreateConstructionResponse = ServerResponse & {
  /** Construction site id (private server) */
  _id?: string
  /** Official server MongoDB insert result */
  result?: MongoWriteResult
  ops?: ConstructionSiteOp[]
  insertedCount?: number
  insertedIds?: string[]
}
export type GameSetNotifyWhenAttackedResponse = ServerResponse & {
  result?: MongoWriteResult
  connection?: MongoConnection
}
export type GameCreateInvaderResponse = ServerResponse
export type GameRemoveInvaderResponse = ServerResponse
export type GameTimeResponse = ServerResponse & {
  time: number
}
export type GameWorldSizeResponse = ServerResponse & {
  width: number
  height: number
}
export type GameRoomDecorationsResponse = ServerResponse & {
  decorations: object[]
}
export type RoomObject = {
  _id: string
  type: string
  room: string
  x: number
  y: number
  [key: string]: any
}
export type GameRoomObjectsResponse = ServerResponse & {
  objects: RoomObject[]
}
export type GameRoomTerrainResponse = ServerResponse & {
  terrain: Array<{
    _id: string
    room: string
    terrain: string
    type: string
  }>
}
export type GameRoomStatusResponse = ServerResponse & {
  room: {
    _id: string
    status: string
    novice?: number
  }
}
export type GameRoomOverviewStat = { value: number; endTime: number }
export type GameRoomOverviewResponse = ServerResponse & {
  owner?: {
    username: string
    badge: Badge
  }
  stats: { [statName: string]: GameRoomOverviewStat[] }
  statsMax: { [key: string]: number }
  totals: { [key: string]: number }
}

export type MarketOrderSummary = {
  _id: string
  count: number
  avgPrice: number
  stddevPrice: number
}
export type GameMarketOrdersIndexResponse = ServerResponse & {
  list: MarketOrderSummary[]
}

export type MarketOrder = {
  _id: string
  type: 'buy' | 'sell'
  amount: number
  remainingAmount: number
  price: number
  roomName?: string
  resourceType?: string
  totalAmount?: number
  shard?: string
}
export type GameMarketMyOrdersResponse = ServerResponse & {
  shards: { [shard: string]: MarketOrder[] }
}
export type GameMarketOrdersResponse = ServerResponse & {
  list: MarketOrder[]
}

export type MarketStatEntry = {
  _id: string
  resourceType: string
  date: string
  transactions: number
  volume: number
  avgPrice: number
  stddevPrice: number
}
export type GameMarketStatsResponse = ServerResponse & {
  stats: MarketStatEntry[]
}
export type GameShardsInfoResponse = ServerResponse & {
  shards: Array<{
    name: string;
    lastTicks: number[]
    cpuLimit: number
    rooms: number
    users: number
    tick: number
  }>
}
export type LeaderboardEntry = {
  _id: string
  season: string
  user: string
  score: number
  rank: number
}
export type LeaderboardListResponse = ServerResponse & {
  list: LeaderboardEntry[]
  count: number
  users: UserInfoMap
}
export type LeaderboardFindResponse = ServerResponse & LeaderboardEntry
export type LeaderboardSeason = {
  _id: string
  name: string
  date: string
}
export type LeaderboardSeasonsResponse = ServerResponse & {
  seasons: LeaderboardSeason[]
}
export type MongoWriteResult = {
  ok: number
  n: number
  nModified?: number
  upserted?: Array<{ index: number; _id: string }>
}

export type MongoConnection = {
  host: string
  id: number
  port: number
}

export type ConsoleOp = { user: string; expression: string; _id: string }
export type MemoryOp = { user: string; expression: string; hidden: boolean }
export type ConstructionSiteOp = {
  _id: string
  type: string
  room: string
  x: number
  y: number
  structureType: string
  user: string
  progress: number
  progressTotal: number
}

export type UserBadgeResponse = ServerResponse
export type UserRespawnResponse = ServerResponse
export type UserSetActiveBranchResponse = ServerResponse
export type UserCloneBranchResponse = ServerResponse & {
  timestamp?: number
}
export type UserDeleteBranchResponse = ServerResponse & {
  timestamp?: number
}
export type UserNotifyPrefsResponse = ServerResponse
export type UserTutorialDoneResponse = ServerResponse
export type UserEmailResponse = ServerResponse
export type UserWorldStartRoomResponse = ServerResponse & {
  room: string[]
}
export type UserWorldStatusResponse = ServerResponse & {
  status: string
}
export type UserBranchesResponse = ServerResponse & {
  list: {
    _id: string
    branch: string
    activeWorld: boolean
    activeSim: boolean
  }[]
}
export type UserCodeGetResponse = ServerResponse & {
  branch: string
  modules: CodeModules
}
export type UserCodePostResponse = ServerResponse & {
  timestamp: number
}
export type DecorationGraphic = {
  url: string
  color?: string
  alpha?: string
}
export type DecorationInfo = {
  _id: string
  name: string
  type: string
  theme: string
  rarity?: number
  steamItemDefId?: number
  groupDescription?: string | null
  preview?: { original: string; [size: string]: string }
  graphics?: DecorationGraphic[]
  props?: { [key: string]: object }
}
export type UserDecorationItem = {
  _id: string
  decoration: DecorationInfo
  active?: boolean
  [key: string]: any
}
export type UserDecorationsInventoryResponse = ServerResponse & {
  list: UserDecorationItem[]
}
export type DecorationTheme = {
  _id: string
  name: string
  color?: string
  short?: string
  restricted?: boolean
  hidden?: boolean
  createdAt?: string
  updatedAt?: string
}
export type UserDecorationsThemesResponse = ServerResponse & {
  list: DecorationTheme[]
}
export type UserDecorationsConvertResponse = ServerResponse
export type UserDecorationsPixelizeResponse = ServerResponse
export type UserDecorationsActivateResponse = ServerResponse
export type UserDecorationsDeactivateResponse = ServerResponse
export type UserRespawnProhibitedRoomsResponse = ServerResponse & {
  rooms: string[]
}
export type UserMemoryGetResponse = ServerResponse & {
  data?: string
}
export type UserMemoryPostResponse = ServerResponse & {
  result?: MongoWriteResult
  ops?: MemoryOp[]
  insertedCount?: number
  insertedIds?: string[]
}
export type UserMemorySegmentGetResponse = ServerResponse & {
  data?: string
}
export type UserMemorySegmentPostResponse = ServerResponse
export type UserFindResponse = ServerResponse & {
  user: UserInfo
}
export type UserStatsResponse = ServerResponse & {
  stats: Partial<Record<StatName, { value: number; endTime: number }[]>>
}
export type UserRoomsResponse = ServerResponse & {
  shards: { [shard: string]: string[] }
  reservations?: { [shard: string]: string[] }
}
export type UserOverviewShardStats = {
  rooms: string[]
  stats: { [roomName: string]: { value: number; endTime: number }[] }
  gametimes: (number | null)[]
}
export type UserOverviewResponse = ServerResponse & {
  statsMax: number
  totals: { [statName: string]: number }
  shards: { [shard: string]: UserOverviewShardStats }
}
export type MoneyHistoryEntry = {
  _id: string
  date: string
  tick: number
  type: string
  balance: number
  change: number
  market?: object
}
export type UserMoneyHistoryResponse = ServerResponse & {
  page: number
  list: MoneyHistoryEntry[]
  hasMore: boolean
}
export type UserConsoleResponse = ServerResponse & {
  result?: MongoWriteResult
  ops?: ConsoleOp[]
  insertedCount?: number
  insertedIds?: string[]
}
export type UserNameResponse = ServerResponse & {
  username: string
}
export type PvpRoom = {
  _id: string
  lastPvpTime: number
}
export type ExperimentalPvpResponse = ServerResponse & {
  pvp: { [shard: string]: { time: number; rooms: PvpRoom[] } }
}
export type NukeInfo = {
  _id: string
  type: 'nuke'
  room: string
  x: number
  y: number
  landTime: number
  launchRoomName: string
}
export type ExperimentalNukesResponse = ServerResponse & {
  nukes: { [shard: string]: NukeInfo[] }
}
export type WarpathBattle = {
  _id: string
  room: string
  lastBattleTime: number
  [key: string]: any
}
export type WarpathBattlesResponse = ServerResponse & {
  rooms?: WarpathBattle[]
}
export type ScoreboardEntry = {
  _id: string
  rank: number
  score: number
  user: string
}
export type ScoreboardListResponse = ServerResponse & {
  list?: ScoreboardEntry[]
  count?: number
  users?: UserInfoMap
}

export type SocketEvent<T> = {
  type: string
  id: string
  path: string
  data: T
}

type ArrayPos = [x: number, y: number]

export type ConsoleMessages = {
  log: string[]
  results: string[]
}

export type ConsoleEvent = {
  messages?: ConsoleMessages
  error?: string
}

export type CPUEvent = {
  cpu: number
  memory: number
}

export type RoomMap2Event = {
  w: ArrayPos[]
  r: ArrayPos[]
  pb: ArrayPos[]
  p: ArrayPos[]
  s: ArrayPos[]
  c: ArrayPos[]
  m: ArrayPos[]
  k: ArrayPos[]
  [userId: string]: ArrayPos[]
}

export type CodeEvent = {
  branch: string
  modules: CodeModules
  timestamp: number
  /** Opaque hash string; computation is server-internal */
  hash: string
}

export type RoomFlag = {
  name: string
  color: FlagColor
  secondaryColor: FlagColor
  room: string
  x: number
  y: number
}

/**
 * Emitted on `room:ROOM_NAME` (or `room:shard/ROOM_NAME`) subscriptions.
 * The first event contains full object data; subsequent events send only
 * changed/deleted properties (null value = object was removed).
 */
export type RoomEvent = {
  objects: { [id: string]: Partial<RoomObject> | null }
  flags?: RoomFlag[]
  gameTime?: number
  /** Raw visual data string from previous tick */
  visual?: string
  info?: { mode: string }
  users?: UserInfoMap
}

/** Emitted on `user:{id}/resources` — user resource counts plus credits */
export type ResourcesEvent = {
  credits?: number
  [resource: string]: number | undefined
}

/** Emitted on `user:{id}/memory/{path}` — serialized value at the memory path */
export type MemoryPathEvent = string