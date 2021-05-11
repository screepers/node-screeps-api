import * as fs from 'fs'
import * as path from 'path'
import * as YAML from 'yamljs'

const readFileAsync = fs.promises.readFile


export type ServerConfig = {
  host: string
  port: number
  path?: string
  secure?: boolean
  token?: string
  username?: string
  password?: string
  /** @deprecated Please use `path` instead */
  ptr?: boolean
  /** @deprecated Please use `path` instead */
  season?: boolean
}


export interface Config {
  servers: {
    [name: string]: ServerConfig
  }
  configs?: {
    [name: string]: any
  }
}

export class ConfigManager {
  private _config: Config
  public path: string
  async refresh () {
    this._config = null
    await this.getConfig()
  }

  async getServers () {
    const conf = await this.getConfig()
    return Object.keys(conf.servers)
  }

  async getConfig () {
    if (this._config) {
      return this._config
    }
    const paths = []
    if (process.env.SCREEPS_CONFIG) {
      paths.push(process.env.SCREEPS_CONFIG)
    }
    const dirs = [__dirname, '']
    for (const dir of dirs) {
      paths.push(path.join(dir, '.screeps.yaml'))
      paths.push(path.join(dir, '.screeps.yml'))
    }
    if (process.platform === 'win32') {
      paths.push(path.join(process.env.APPDATA, 'screeps/config.yaml'))
      paths.push(path.join(process.env.APPDATA, 'screeps/config.yml'))
    } else {
      if (process.env.XDG_CONFIG_PATH) {
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
        if (!data.servers) {
          throw new Error(
            `Invalid config: 'servers' object does not exist in '${path}'`
          )
        }
        this._config = data
        this.path = path
        return data
      }
    }
    return null
  }

  async loadConfig (file: string): Promise<Config> {
    try {
      const contents = await readFileAsync(file, 'utf8')
      return YAML.parse(contents)
    } catch (e) {
      if (e.code === 'ENOENT') {
        return null
      } else {
        throw e
      }
    }
  }
}
