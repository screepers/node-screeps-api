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
  auth(email,password){
    return this.raw.auth.signin(email,password)
      .then(res=>{
        this.emit('token',res.token)
        this.emit('auth')
        return res
      })
  }
  me(){
    return this.raw.auth.me().then(user=>{
      this.user = user
      return user
    })
  }
}

module.exports = ScreepsAPI

function noop () {}