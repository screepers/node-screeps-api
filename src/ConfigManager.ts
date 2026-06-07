import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import URL from 'node:url'
import { parse } from 'yaml'

const DEFAULT_SERVER_HOST = 'screeps.com'
const DEFAULT_SERVER_PATH = '/'
export const DEFAULT_CLIENT_CONFIG: Api.ClientConfig = {
  retry429Global: true,
  retry429InitDelay: 60_000,
  retry429MaxDelay: 10_800_000,
  retry429MaxRetries: 0
} as const

export class ConfigManager {
  path?: string
  private _config?: Api.Config | null

  async refresh(serverName: string) {
    this._config = null
    await this.getConfig(serverName)
  }

  /**
   * Search for config files and load
   * @param opts see {@link LoadConfigOptions}
   * @returns a valid {@link Api.Config} if one was found, or null
   */
  async getConfig(
    serverName: string,
    opts?: Api.LoadConfigOptions
  ): Promise<Api.Config | null> {
    if (this._config) {
      return this._config
    }
    const paths = []
    if (opts?.file) {
      paths.push(opts.file)
    }
    if (process.env.SCREEPS_CONFIG) {
      paths.push(process.env.SCREEPS_CONFIG)
    }
    const dirs = [path.dirname(import.meta.url), '']
    for (const dir of dirs) {
      paths.push(path.join(dir, '.screeps.yaml'))
      paths.push(path.join(dir, '.screeps.yml'))
      paths.push(path.join(dir, '.screeps.json'))
      paths.push(path.join(dir, 'screeps.json'))
    }
    if (process.platform === 'win32' && process.env.APPDATA) {
      paths.push(path.join(process.env.APPDATA, 'screeps/config.yaml'))
      paths.push(path.join(process.env.APPDATA, 'screeps/config.yml'))
      paths.push(path.join(process.env.APPDATA, 'screeps/screeps.json'))
    } else {
      if (process.env.XDG_CONFIG_HOME) {
        paths.push(
          path.join(process.env.XDG_CONFIG_HOME, 'screeps/config.yaml')
        )
        paths.push(
          path.join(process.env.XDG_CONFIG_HOME, 'screeps/config.yml')
        )
        paths.push(
          path.join(process.env.XDG_CONFIG_HOME, 'screeps/screeps.json')
        )
      }
      if (process.env.HOME) {
        paths.push(path.join(process.env.HOME, '.config/screeps/config.yaml'))
        paths.push(path.join(process.env.HOME, '.config/screeps/config.yml'))
        paths.push(path.join(process.env.HOME, '.screeps.yaml'))
        paths.push(path.join(process.env.HOME, '.screeps.yml'))
        paths.push(path.join(process.env.HOME, '.screeps.json'))
        paths.push(path.join(process.env.HOME, 'screeps.json'))
      }
    }
    for (const path of paths) {
      const data = await this.loadNormalizedConfig(path, serverName, opts)
      if (data) {
        this._config = data
        this.path = path
        return data
      }
    }
    console.warn('No valid config found; paths checked:', paths)
    return null
  }

  async loadNormalizedConfig(
    file: string,
    serverName: string,
    opts?: Api.LoadConfigOptions
  ): Promise<Api.Config | null> {
    const parsed = await this.loadConfig(file)
    if (!parsed) {
      return null
    }

    return {
      client: this.normalizeClientConfig(parsed, file, opts),
      server: this.normalizeServersConfig(parsed, file, serverName),
      parsed
    }
  }

  async loadConfig(file: string): Promise<Api.JsonConfig | Api.YamlConfig | null> {
    try {
      const contents = await readFile(file, { encoding: 'utf8' })
      if (!file.endsWith('.json')) {
        const data = parse(contents) as Api.YamlConfig
        if (!data.servers) {
          throw new Error(
            `Invalid config: 'servers' object does not exist in '${file}'`
          )
        }
        return data
      } else {
        const data = JSON.parse(contents) as unknown
        if (typeof data !== 'object' || Array.isArray(data)) {
          throw new Error(
            `Invalid config: found '${typeof data}' instead of a JSON object at '${file}'`
          )
        }
        return data as Api.JsonConfig
      }
    } catch (e) {
      if ((e as { code?: string }).code === 'ENOENT') {
        return null
      } else {
        throw e
      }
    }
  }

  normalizeServersConfig(
    parsed: Api.JsonConfig | Api.YamlConfig,
    file: string,
    serverName: string
  ): Api.ServerConfig {
    const servers = ('servers' in parsed) ? parsed.servers as Api.JsonConfig : parsed
    const rawServer = servers[serverName]
    if (!rawServer) {
      const list = Object.keys(servers).join(', ')
      throw new Error(
        `Invalid config: server ${serverName} not found in in ${file}; servers defined in this config: ${list}`
      )
    }

    return this.normalizeServerConfig(rawServer)
  }

  normalizeServerConfig(rawServer: Api.RawServerConfig): Api.ServerConfig {
    let url = rawServer.url
    if (!url) {
      rawServer.protocol ??= (rawServer.secure !== false ? 'https' : 'http')
      rawServer.hostname ??= rawServer.host ?? DEFAULT_SERVER_HOST
      rawServer.port ??= rawServer.protocol === 'https' ? 443 : 80
      rawServer.pathname ??= rawServer.path
        ?? (rawServer.ptr ? '/ptr' : undefined)
        ?? (rawServer.season ? '/season' : undefined)
        ?? DEFAULT_SERVER_PATH
      url = URL.format({
        protocol: rawServer.protocol,
        hostname: rawServer.hostname,
        port: rawServer.port,
        pathname: rawServer.pathname
      })
    }
    if (!url.endsWith('/')) url += '/'

    const server: Api.ServerConfig = { url }

    if (rawServer.token) {
      Object.assign(server, { token: rawServer.token })
    } else if (rawServer.email && rawServer.password) {
      Object.assign(
        server,
        {
          email: rawServer.email,
          password: rawServer.password
        }
      )
    } else {
      throw new Error(
        `Invalid config: server config must contain either token or email/password fields`
      )
    }

    return server
  }

  normalizeClientConfig(
    parsed: Api.JsonConfig | Api.YamlConfig,
    file: string,
    opts?: Api.LoadConfigOptions
  ): Api.ClientConfig {
    const client: Api.ClientConfig = { ...DEFAULT_CLIENT_CONFIG }
    if (!opts?.client) {
      return client
    }

    if (typeof opts.client === 'object') {
      Object.assign(client, opts.client)
      return client
    }

    if (typeof opts.client === 'string') {
      const appName = opts.client
      const appConfigs = (parsed as Api.YamlConfig).configs
      const appConfig = appConfigs?.[appName]

      if (typeof appConfig !== 'object') {
        Object.assign(client, appConfig)
      } else {
        console.warn(`Could not find config '${appName}' in '${file}'; using default client config`)
      }

      return client
    }

    console.warn(`Invalid config name '${opts.client}'; using default client config`)
    return client
  }
}

declare global {
  namespace Api {
    /** Configuration and options for a {@link ScreepsAPI} client */
    interface Config {
      /** @see {@link ClientConfig} */
      client: ClientConfig
      /**
       * Configuration for the Screeps World server to which this client
       * should connect
       */
      server: Readonly<ServerConfig>
      /**
       * The config file parsed (but not normalized) by {@link ConfigManager}.
       * Apps can use this to determine which other server names and client
       * configs are available.
       */
      parsed?: JsonConfig | YamlConfig
    }

    interface LoadConfigOptions {
      /**
       * Specifies the path of the screeps YAML or JSON credential file to use.
       * If defined, this takes precedence over the `SCREEPS_CONFIG` env var.
       */
      file?: string
      /**
       * If this is a string and a YAML credential file is used,
       * {@link ClientConfig} will be pulled from the `configs[client]` key
       * in that file.
       */
      client?: string | Partial<ClientConfig>
    }

    /** Normalized configuration for a single Screeps World server */
    interface ServerConfig {
      url: string
      token?: string
      email?: string
      password?: string
    }

    /**
     * User-configurable options for a {@link ScreepsAPI} client.
     * `ClientConfig` objects may also contain custom configuration options
     * intended for apps using {@link ScreepsAPI}.
     */
    type ClientConfig = {
      /**
       * Specifies a default shard name to use when one is not provided
       * as an argument to a {@link ScreepsAPI} endpoint function
       */
      defaultShard?: string
      /**
       * Wait for a short period of time before automatically retriing
       * requests that fail due to the global 120 requests/minute rate limit.
       * @default true
       */
      retry429Global: boolean
      /**
       * Delay (in milliseconds) before the first retry attempt.
       * Only applies to retries for endpoint-specific rate limits.
       * @default 60000 (one minute)
       */
      retry429InitDelay: number
      /**
       * Maximum delay (in milliseconds) between retry attempts.
       * Only applies to retries for endpoint-specific rate limits.
       * @default 10800000 (three hours)
       */
      retry429MaxDelay: number
      /**
       * Maximum number of retry attempts. Exponential backoff is used
       * to increase the delay between subsequent retry attempts.
       * Only applies to retries for endpoint-specific rate limits.
       * When this is enabled, `ScreepsAPI.debug('screepsapi:ratelimitexceeded')`
       * will cause the client to emit logs when delays occur due to retries.
       * @default 0
       */
      retry429MaxRetries: number
    } & { [propertyName: string]: unknown }

    /** Server configuration schema from {@link JsonConfig}/{@link YamlConfig} */
    interface RawServerConfig {
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
    }

    /**
     * Format of a screeps unified credential file:
     * https://github.com/screepers/screepers-standards/blob/3877e86f38caed9891ef6270aa9690df556e6c22/SS3-Unified_Credentials_File.md
     */
    interface YamlConfig {
      servers: { [serverName: string]: Api.RawServerConfig | undefined }
      configs?: { [appName: string]: Api.ClientConfig | undefined }
    }

    /** Format of a screeps.json credential file */
    interface JsonConfig {
      [serverName: string]: Api.RawServerConfig | undefined
    }
  }
}
