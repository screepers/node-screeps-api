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
  // TODO: Check limited token and update this.
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
  }
  users: number
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

export type AuthSteamTicketResponse = ServerResponse & {}

export type AuthMeResponse = ServerResponse & {
  _id: string
  email: string
  username: string
  cpu: number
  badge: Badge
  password: string
  notifyPrefs: NotifyPreferences
  gcl: number
  credits: number
  lastChargeTime: number
  lastTweetTime: number
  github: {
    id: string
    username: string
  }
  twitter: {
    username: string
    followers_count: number
  }
}

export type AuthQueryTokenResponse = ServerResponse & {
  token: TokenInfo
}
export type RegisterCheckEmailResponse = ServerResponse & {}
export type RegisterCheckUsernameResponse = ServerResponse & {}
export type RegisterSetUsernameResponse = ServerResponse & {}
export type RegisterSubmitResponse = ServerResponse & {}

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

export type GameMapStatsResponse = ServerResponse & {
  stats: {
    [roomName:string]: {
      status: string,
      novice: number,
      own: {
        user: string
        level: number
      }
      // TODO: Figure out howto map this!
      /*<stat>: [
        { user: string, value: any }
      ]*/
    }
  }
  users: UserInfoMap
}
export type GameGenUniqueObjectNameResponse = ServerResponse & {
  name: string
}
export type GameCheckUniqueObjectNameResponse = ServerResponse
export type GamePlaceSpawnResponse = ServerResponse
export type GameCreateFlagResponse = ServerResponse & {}
export type GameGenUniqueFlagNameResponse = ServerResponse & {
  name: string
}
export type GameCheckUniqueFlagNameResponse = ServerResponse
export type GameChangeFlagColorResponse = ServerResponse & {}
export type GameRemoveFlagResponse = ServerResponse & {}
export type GameAddObjectIntentResponse = ServerResponse & {}
export type GameCreateConstructionResponse = ServerResponse & {}
export type GameSetNotifyWhenAttackedResponse = ServerResponse & {}
export type GameCreateInvaderResponse = ServerResponse & {}
export type GameRemoveInvaderResponse = ServerResponse & {}
export type GameTimeResponse = ServerResponse & {}
export type GameWorldSizeResponse = ServerResponse & {}
export type GameRoomDecorationsResponse = ServerResponse & {}
export type GameRoomObjectsResponse = ServerResponse & {}
export type GameRoomTerrainResponse = ServerResponse & {}
export type GameRoomStatusResponse = ServerResponse & {}
export type GameRoomOverviewResponse = ServerResponse & {}
export type GameMarketOrdersIndexResponse = ServerResponse & {}
export type GameMarketMyOrdersResponse = ServerResponse & {}
export type GameMarketOrdersResponse = ServerResponse & {}
export type GameMarketStatsResponse = ServerResponse & {}
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
export type LeaderboardListResponse = ServerResponse & {}
export type LeaderboardFindResponse = ServerResponse & {}
export type LeaderboardSeasonsResponse = ServerResponse & {}
export type UserBadgeResponse = ServerResponse & {}
export type UserRespawnResponse = ServerResponse & {}
export type UserSetActiveBranchResponse = ServerResponse & {}
export type UserCloneBranchResponse = ServerResponse & {}
export type UserDeleteBranchResponse = ServerResponse & {}
export type UserNotifyPrefsResponse = ServerResponse & {}
export type UserTutorialDoneResponse = ServerResponse & {}
export type UserEmailResponse = ServerResponse & {}
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
export type UserDecorationsInventoryResponse = ServerResponse & {}
export type UserDecorationsThemesResponse = ServerResponse & {}
export type UserDecorationsConvertResponse = ServerResponse & {}
export type UserDecorationsPixelizeResponse = ServerResponse & {}
export type UserDecorationsActivateResponse = ServerResponse & {}
export type UserDecorationsDeactivateResponse = ServerResponse & {}
export type UserRespawnProhibitedRoomsResponse = ServerResponse & {}
export type UserMemoryGetResponse = ServerResponse & {
  data?: string
}
export type UserMemoryPostResponse = ServerResponse
export type UserMemorySegmentGetResponse = ServerResponse & {
  data?: string
}
export type UserMemorySegmentPostResponse = ServerResponse
export type UserFindResponse = ServerResponse & {
  user: UserInfo
}
export type UserStatsResponse = ServerResponse & {}
export type UserRoomsResponse = ServerResponse & {}
export type UserOverviewResponse = ServerResponse & {}
export type UserMoneyHistoryResponse = ServerResponse & {}
export type UserConsoleResponse = ServerResponse & {}
export type UserNameResponse = ServerResponse & {
  username: string
}
export type ExperimentalPvpResponse = ServerResponse & {}
export type ExperimentalNukesResponse = ServerResponse & {}
export type WarpathBattlesResponse = ServerResponse & {}
export type ScoreboardListResponse = ServerResponse & {}

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