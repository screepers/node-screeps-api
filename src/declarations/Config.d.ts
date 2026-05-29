interface YamlConfig {
  servers: { [serverName: string]: ServerConfig | undefined }
  configs?: { [appName: string]: unknown }
}

interface JsonConfig {
  [serverName: string]: ServerConfig | undefined
}

interface ServerConfig {
  token?: string
  email?: string
  username?: string
  password?: string
  protocol?: string
  secure?: boolean
  host?: string
  hostname?: string
  port?: number
  path?: string
  pathname?: string
  url?: string
  ptr?: boolean
  season?: boolean
  experimentalRetry429?: boolean
}

type AppConfig = object
