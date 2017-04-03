const zlib = require('zlib')
const url = require('url')
const { EventEmitter } = require('events')
const Socket = require('./Socket')
const RawAPI = require('./RawAPI')

const DEFAULTS = {
  protocol: 'https',
  host: 'screeps.com',
  port: 443,
  path: '/'
}

class ScreepsAPI extends RawAPI {
  constructor(opts){
    opts = Object.assign({},DEFAULTS,opts)
    if(!opts.url){
      opts.pathname = opts.pathname || opts.path
      opts.url = url.format(opts)
    }
    super(opts)
    this.opts = opts
    this.on('token',(token)=>{
      this.token = token
      this.raw.token = token
    })
    this.socket = new Socket(this)
    if((this.opts.username || this.opts.email) && this.opts.password)
      this.auth(this.opts.username || this.opts.email,this.opts.password)
  }
  me(){
    return this.raw.auth.me().then(user=>{
      this.user = user
      return user
    })
  }
  get history(){      return this.raw.history     }
  get authmod(){      return this.raw.authmod     }
  get version(){      return this.raw.version     }
  get time(){         return this.raw.game.time   }
  get leaderboard(){  return this.raw.game.leaderboard }
  get market(){       return this.raw.game.market     }
  get registerUser(){ return this.raw.register.submit }
  get code(){         return this.raw.user.code }
  get memory(){       return this.raw.user.memory }
  get segment(){      return this.raw.user.memory.segment }
  get console(){      return this.raw.user.console }
}

module.exports = ScreepsAPI

function noop () {}