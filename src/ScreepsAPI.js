import fs from 'fs'
import YAML from 'yamljs'
import { Socket } from './Socket'
import { RawAPI } from './RawAPI'
import { join } from 'path'
import Promise from 'bluebird'

Promise.promisifyAll(fs)

const DEFAULTS = {
  protocol: 'https',
  hostname: 'screeps.com',
  port: 443,
  path: '/'
}

export class ScreepsAPI extends RawAPI {
  static async fromConfig (server = 'main', config = false, opts = {}) {
    const paths = [
      join(__dirname, '.screeps.yaml'),
      join(__dirname, '.screeps.yml'),
      './.screeps.yaml',
      './.screeps.yml'
    ]
    if (process.env.HOME) {
      paths.push(join(process.env.HOME, '.screeps.yaml'))
      paths.push(join(process.env.HOME, '.screeps.yml'))
    }
    for (const path of paths) {
      const data = await loadConfig(path)
      if (data) {
        if (!data.servers) {
          throw new Error(`Invalid .screeps.yml: servers doesn't exist in ${path}`)
        }
        if (!data.servers[server]) {
          throw new Error(`Server '${server}' does not exist in '${path}'`)
        }
        const conf = data.servers[server]
        const api = new ScreepsAPI(Object.assign({
          hostname: conf.host,
          port: conf.port,
          protocol: conf.secure ? 'https' : 'http',
          token: conf.token
        }, opts))
        api.appConfig = (data.configs && data.configs[config]) || {}
        if (!conf.token && conf.username && conf.password) {
          await api.auth(conf.username, conf.password)
        }
        return api
      }
    }
    throw new Error('No valid .screeps.yaml found')
  }
  constructor (opts) {
    opts = Object.assign({}, DEFAULTS, opts)
    super(opts)
    this.on('token', (token) => {
      this.token = token
      this.raw.token = token
    })
    this.socket = new Socket(this)
  }
  async me () {
    this.user = await this.raw.auth.me()
    return this.user
  }
  get history () { return this.raw.history }
  get authmod () { return this.raw.authmod }
  get version () { return this.raw.version }
  get time () { return this.raw.game.time }
  get leaderboard () { return this.raw.leaderboard }
  get market () { return this.raw.game.market }
  get registerUser () { return this.raw.register.submit }
  get code () { return this.raw.user.code }
  get memory () { return this.raw.user.memory }
  get segment () { return this.raw.user.memory.segment }
  get console () { return this.raw.user.console }
}

async function loadConfig (file) {
  try {
    const contents = await fs.readFileAsync(file, 'utf8')
    return YAML.parse(contents)
  } catch (e) {
    if (e.code === 'ENOENT') {
      return false
    } else {
      throw e
    }
  }
}
