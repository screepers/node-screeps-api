import Debug from 'debug'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import URL from 'node:url'
import { parse } from 'yaml'

/** Default value of {@link ScreepsRawServerConfig | ScreepsRawServerConfig.hostname} */
export const DEFAULT_SERVER_HOST = 'screeps.com'
/** Default value of {@link ScreepsRawServerConfig | ScreepsRawServerConfig.path} */
export const DEFAULT_SERVER_PATH = '/'

/** Defaults for {@link ScreepsClientConfig} */
export const DEFAULT_CLIENT_CONFIG = {
  retry429Global: true,
  retry429InitDelay: 60_000, // 1 minute
  retry429MaxDelay: 10_800_000, // 3 hours
  retry429MaxRetries: 0
} as const

const CONFIG_REL_PATHS = [
  path.join('screeps', 'config.yaml'),
  path.join('screeps', 'config.yml'),
  '.screeps.yaml',
  '.screeps.yml',
  '.screeps.json',
  'screeps.json'
]

const debug = Debug('screepsapi:config')

/**
 * Provides features to find and load save configuration files.
 *
 * This class supports the {@link ScreepsYamlConfig | SS3 Unified Credentials File}
 * format as well as the {@link ScreepsJsonConfig | screeps.json format}
 * used by many Screeps code upload tools.
 * @document ../guides/configuration.md
 */
export class ScreepsConfigManager {
  private _defaultPaths?: readonly string[]

  /**
   * List all paths that will be searched by default for config files.
   *
   * If the `SCREEPS_CONFIG` environment variable is defined, this path
   * defined there will always be searched first.
   */
  get defaultPaths(): readonly string[] {
    if (this._defaultPaths) return this._defaultPaths

    // Build a list of all directories to search, including the
    // current working directory
    const dirs = ['']

    const home = process.env.HOME
    if (home) dirs.push(home)

    // Add platform-specific config directories
    switch (process.platform) {
      case 'darwin':
        if (home) dirs.push(path.join(home, 'Library', 'Application Support'))
        break

      case 'freebsd':
      case 'linux':
      case 'openbsd':
        if (process.env.XDG_CONFIG_HOME) {
          dirs.push(process.env.XDG_CONFIG_HOME)
        } else if (home) {
          dirs.push(path.join(home, '.config'))
        }
        break

      case 'win32':
        if (process.env.APPDATA) dirs.push(process.env.APPDATA)
        break
    }

    const defaultPaths = dirs
      .flatMap(dir => CONFIG_REL_PATHS.map(rel => path.join(dir, rel)))
      .sort((a, b) => {
        // Check YAML files first
        const aIsYaml = -+(a.endsWith('.yaml') || a.endsWith('.yml'))
        const bIsYaml = -+(b.endsWith('.yaml') || b.endsWith('.yml'))
        return aIsYaml - bIsYaml
      })
    if (process.env.SCREEPS_CONFIG) {
      defaultPaths.unshift(process.env.SCREEPS_CONFIG)
    }

    this._defaultPaths = defaultPaths
    return this._defaultPaths
  }

  /**
   * Search for config files and load the first one found.
   *
   * If {@link LoadConfigOptions.file} is defined and non-empty, that path
   * will always be checked first. Otherwise, {@link defaultPaths} will be
   * checked in order until.
   * @param serverName the name of the server to use from the credential file
   * @param opts see {@link LoadConfigOptions}
   * @returns a valid {@link ScreepsHttpConfig} if one was found
   * @throws {@link node!Error | Error} if a file exists but the contents are invalid/malformed
   */
  async loadConfig(
    serverName: string,
    opts?: LoadConfigOptions
  ): Promise<ScreepsHttpConfig | null> {
    if (opts?.file) {
      const config = await this.loadNormalizedConfig(opts.file, serverName, opts)
      if (config) {
        return config
      }
      throw new Error(`Config file "${opts.file}" not found`)
    }

    for (const file of this.defaultPaths) {
      const config = await this.loadNormalizedConfig(file, serverName, opts)
      if (config) {
        debug(`Loaded config: ${file}`)
        return config
      }
    }

    throw new Error(`No config file found; paths checked:\npaths.join('\n')`)
  }

  async loadNormalizedConfig(
    file: string,
    serverName: string,
    opts?: LoadConfigOptions
  ): Promise<ScreepsHttpConfig | null> {
    const parsed = await this.loadFile(file)
    if (!parsed) {
      return null
    }
    debug(`Loading config: ${file}`)

    return {
      client: this.normalizeClientConfig(parsed, opts?.client),
      server: this.normalizeServersConfig(parsed, serverName),
      parsed
    }
  }

  async loadFile(file: string): Promise<ScreepsJsonConfig | ScreepsYamlConfig | null> {
    try {
      const contents = await readFile(file, { encoding: 'utf8' })
      if (!file.endsWith('.json')) {
        const data = parse(contents) as ScreepsYamlConfig
        if (!data.servers) {
          throw new Error(
            `Invalid config: "servers" object does not exist in "${file}"`
          )
        }
        return data
      }

      const data = JSON.parse(contents) as unknown
      if (typeof data !== 'object' || Array.isArray(data)) {
        throw new Error(
          `Invalid config: found ${typeof data} instead of a JSON object at "${file}"`
        )
      }
      return data as ScreepsJsonConfig
    } catch (e) {
      if ((e as { code?: string }).code === 'ENOENT') {
        return null
      } else {
        throw e
      }
    }
  }

  normalizeServersConfig(
    parsed: ScreepsJsonConfig | ScreepsYamlConfig,
    serverName: string
  ): ScreepsServerConfig {
    const servers = ('servers' in parsed) ? parsed.servers as ScreepsJsonConfig : parsed
    const rawServer = servers[serverName]
    if (!rawServer) {
      const list = Object.keys(servers).join(', ')
      throw new Error(
        `Invalid config: server "${serverName}" not found; servers defined in this config: ${list}`
      )
    }

    debug(`Using server: ${serverName}`)
    return this.normalizeServerConfig(rawServer)
  }

  normalizeServerConfig(rawServer: ScreepsRawServerConfig): ScreepsServerConfig {
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

    const server: ScreepsServerConfig = { url }

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
    parsed: ScreepsJsonConfig | ScreepsYamlConfig,
    clientOpts?: string | Partial<ScreepsClientConfig>
  ): ScreepsAppConfig {
    const client: ScreepsAppConfig = { ...DEFAULT_CLIENT_CONFIG }
    if (!clientOpts) {
      return client
    }

    if (typeof clientOpts === 'object') {
      Object.assign(client, clientOpts)
      return client
    }

    if (typeof clientOpts === 'string') {
      const appName = clientOpts
      const appConfigs = (parsed as ScreepsYamlConfig).configs
      const appConfig = appConfigs?.[appName]

      if (typeof appConfig === 'object') {
        Object.assign(client, appConfig)
      } else {
        const appNames = Object.keys(appConfigs ?? {}).join(', ')
        debug(`Could not find client config "${appName}"; using defaults; clients defined in this config: ${appNames}`)
      }

      return client
    }

    debug(`Invalid client config name "${clientOpts}"; using defaults`)
    return client
  }
}

/** Configuration and options for {@link ScreepsHttpClient} */
export interface ScreepsHttpConfig {
  /** @see {@link ScreepsAppConfig} */
  client: ScreepsAppConfig
  /**
   * Configuration for the Screeps World server to which this client
   * should connect
   */
  server: Readonly<ScreepsServerConfig>
  /**
   * The config file parsed (but not normalized) by {@link ScreepsConfigManager}.
   * Apps can use this to determine which other server names and client
   * configs are available.
   */
  parsed?: ScreepsJsonConfig | ScreepsYamlConfig
}

/** Options used by {@link ScreepsConfigManager.loadConfig} */
export interface LoadConfigOptions {
  /**
   * Specifies the path of the screeps YAML or JSON credential file to use.
   * If defined, this takes precedence over the `SCREEPS_CONFIG` env var.
   */
  file?: string
  /**
   * If this is a string and a YAML credential file is used,
   * {@link ScreepsClientConfig} will be pulled from the `configs[client]` key
   * in that file.
   */
  client?: string | Partial<ScreepsAppConfig>
}

/**
 * Normalized configuration for a single Screeps World server
 * @see {@link ScreepsRawServerConfig} for the pre-normalized schema
 */
export interface ScreepsServerConfig {
  url: string
  token?: string
  email?: string
  password?: string
}

/**
 * User-configurable options for {@link ScreepsHttpClient}
 * @see {@link DEFAULT_CLIENT_CONFIG} for default values
 */
export interface ScreepsClientConfig {
  /**
   * Specifies a default shard name to use when one is not provided
   * as an argument to a {@link ScreepsHttpClient} endpoint function.
   */
  defaultShard?: string
  /**
   * Wait for a short period of time before automatically retriing
   * requests that fail due to the global 120 requests/minute rate limit.
   */
  retry429Global: boolean
  /**
   * Delay (in milliseconds) before the first retry attempt.
   * Only applies to retries for endpoint-specific rate limits.
   */
  retry429InitDelay: number
  /**
   * Maximum delay (in milliseconds) between retry attempts.
   * Only applies to retries for endpoint-specific rate limits.
   */
  retry429MaxDelay: number
  /**
   * Maximum number of retry attempts. Exponential backoff is used
   * to increase the delay between subsequent retry attempts.
   * Only applies to retries for endpoint-specific rate limits.
   */
  retry429MaxRetries: number
}

/**
 * An extension of {@link ScreepsClientConfig} that may contain properties
 * intended for the app using {@link ScreepsHttpClient}.
 */
export type ScreepsAppConfig = ScreepsClientConfig & { [propertyName: string]: unknown }

/** Server configuration schema from {@link ScreepsJsonConfig}/{@link ScreepsYamlConfig} */
export interface ScreepsRawServerConfig {
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
 * Format of a Screeps Unified Credentials File:
 * https://github.com/screepers/screepers-standards/blob/3877e86f38caed9891ef6270aa9690df556e6c22/SS3-Unified_Credentials_File.md
 */
export interface ScreepsYamlConfig {
  servers: { [serverName: string]: ScreepsRawServerConfig | undefined }
  configs?: { [appName: string]: ScreepsClientConfig | undefined }
}

/**
 * Format of a Screeps JSON credentials file:
 * https://github.com/screepers/screeps-typescript-starter/blob/master/screeps.sample.json
 */
export interface ScreepsJsonConfig {
  [serverName: string]: ScreepsRawServerConfig | undefined
}
