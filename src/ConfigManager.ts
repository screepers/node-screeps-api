import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import utils from 'node:util'
import { parse } from 'yaml'

const readFile = utils.promisify(fs.readFile)

export class ConfigManager {
  path?: string
  private _config?: Api.YamlConfig | null

  async refresh() {
    this._config = null
    await this.getConfig()
  }

  async getServers(): Promise<string[]> {
    const conf = await this.getConfig()
    return Object.keys(conf?.servers ?? [])
  }

  async getConfig(): Promise<Api.YamlConfig | null> {
    if (this._config) {
      return this._config
    }
    const paths = []
    if (process.env.SCREEPS_CONFIG) {
      paths.push(process.env.SCREEPS_CONFIG)
    }
    const dirs = [path.dirname(import.meta.url), '']
    for (const dir of dirs) {
      paths.push(path.join(dir, '.screeps.yaml'))
      paths.push(path.join(dir, '.screeps.yml'))
    }
    if (process.platform === 'win32' && process.env.APPDATA) {
      paths.push(path.join(process.env.APPDATA, 'screeps/config.yaml'))
      paths.push(path.join(process.env.APPDATA, 'screeps/config.yml'))
    } else {
      if (process.env.XDG_CONFIG_HOME) {
        paths.push(
          path.join(process.env.XDG_CONFIG_HOME, 'screeps/config.yaml')
        )
        paths.push(
          path.join(process.env.XDG_CONFIG_HOME, 'screeps/config.yml')
        )
      }
      if (process.env.HOME) {
        paths.push(path.join(process.env.HOME, '.config/screeps/config.yaml'))
        paths.push(path.join(process.env.HOME, '.config/screeps/config.yml'))
        paths.push(path.join(process.env.HOME, '.screeps.yaml'))
        paths.push(path.join(process.env.HOME, '.screeps.yml'))
      }
    }
    for (const path of paths) {
      const data = await this.loadConfig(path)
      if (data) {
        this._config = data
        this.path = path
        return data
      }
    }
    console.warn('No valid config found; paths checked:', paths)
    return null
  }

  async loadConfig(file: string): Promise<Api.YamlConfig | null> {
    try {
      const contents = await readFile(file, { encoding: 'utf8' })
      const data = parse(contents) as Api.YamlConfig
      if (!data.servers) {
        throw new Error(
          `Invalid config: 'servers' object does not exist in '${path}'`
        )
      }
      return data
    } catch (e) {
      if ((e as { code?: string }).code === 'ENOENT') {
        return null
      } else {
        throw e
      }
    }
  }
}

declare global {
  namespace Api {
    /**
     * Format of a screeps unified credential file:
     * https://github.com/screepers/screepers-standards/blob/3877e86f38caed9891ef6270aa9690df556e6c22/SS3-Unified_Credentials_File.md
     */
    interface YamlConfig {
      servers: { [serverName: string]: ServerConfig | undefined }
      configs?: { [appName: string]: AppConfig | undefined }
    }

    /** Format of a screeps.json credential file */
    interface JsonConfig {
      [serverName: string]: ServerConfig | undefined
    }

    /** Configuration for a single Screeps World server */
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
      /** Automatically retry requests that fail due to rate limiting */
      experimentalRetry429?: boolean
    }

    /** Application-level configuration from {@link YamlConfig} */
    interface AppConfig { [propertyName: string]: unknown }
  }
}
