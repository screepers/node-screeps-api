import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import utils from 'node:util'
import { parse } from 'yaml'

const readFile = utils.promisify(fs.readFile);

export class ConfigManager {
  path?: string
  private _config?: YamlConfig | null

  async refresh () {
    this._config = null
    await this.getConfig()
  }

  async getServers (): Promise<string[]> {
    const conf = await this.getConfig()
    return Object.keys(conf?.servers ?? [])
  }

  async getConfig (): Promise<YamlConfig | null> {
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
    console.debug('No valid config found; paths checked:', paths);
    return null
  }

  async loadConfig (file: string): Promise<YamlConfig | null> {
    try {
      const contents = await readFile(file, { encoding: 'utf8' })
      const data = parse(contents) as YamlConfig
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
