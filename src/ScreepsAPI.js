import { Socket } from './Socket'
import { RawAPI } from './RawAPI'

const DEFAULTS = {
  protocol: 'https',
  hostname: 'screeps.com',
  port: 443,
  path: '/'
}

export class ScreepsAPI extends RawAPI {
  constructor(opts){
    opts = Object.assign({},DEFAULTS,opts)
    super(opts)
    this.on('token',(token)=>{
      this.token = token
      this.raw.token = token
    })
    this.socket = new Socket(this)
    if((this.opts.username || this.opts.email) && this.opts.password)
      this.auth(this.opts.username || this.opts.email,this.opts.password)
  }
  async me(){
    this.user = await this.raw.auth.me()
    return this.user
  }
  get history(){      return this.raw.history     }
  get authmod(){      return this.raw.authmod     }
  get version(){      return this.raw.version     }
  get time(){         return this.raw.game.time   }
  get leaderboard(){  return this.raw.leaderboard }
  get market(){       return this.raw.game.market     }
  get registerUser(){ return this.raw.register.submit }
  get code(){         return this.raw.user.code }
  get memory(){       return this.raw.user.memory }
  get segment(){      return this.raw.user.memory.segment }
  get console(){      return this.raw.user.console }
}

function noop () {}