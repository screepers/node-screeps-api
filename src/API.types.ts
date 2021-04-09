
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
    status: "active" | string
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
  notifyPrefs: {
    sendOnline: any
    errorsInterval: number
    disabledOnMessages: any
    disabled: any
    interval: number
  }
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

export type AuthQueryTokenResponse = ServerResponse & {}

export type Badge = {
  color1: string;
  color2: string;
  color3: string;
  flip: boolean;
  param: number;
  type: number | { path1: string, path2: string };
}