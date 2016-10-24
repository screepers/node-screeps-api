const WebSocket = require('ws')
const { EventEmitter } = require('events')
const request = require('request')

class ScreepsAPI extends EventEmitter {
  set email (v) {
    this.opts.email = v
  }
  set password (v) {
    this.opts.password = v
  }
  constructor (opts) {
    super()
    opts = opts || {}
    // if (!opts.email || !opts.password) throw new Error('Email and password REQUIRED')
    this.opts = opts
    this.prefix = opts.ptr ? 'https://screeps.com/ptr' : 'https://screeps.com'
  }
  request (...args) {
    return new Promise((resolve, reject) => {
      let req = require('request')(...args, (err, res, body) => {
        if (err) return reject(err)
        resolve({ res,body})
      })
    })
  }
  req (method, path, body, cb) {
    cb = cb || noop
    return new Promise((resolve,reject)=>{
      if (!this.token && !path.match(/auth/)) return this.getToken(() => this.req(method,path,body,cb))
      request({
        url: `${this.prefix}${path}`,
        json: true,
        method,
        headers: {
          'X-Token': this.token || undefined,
          'X-Username': this.token || undefined
        },
        body: method == 'POST' ? body : undefined || undefined,
        qs: method == 'GET' ? body : undefined || undefined
      }, (err, res, body) => {
        if (err) return cb(err)
        if (res.statusCode == 200) {
          if (res.headers['x-token'])
            this.token = res.headers['x-token']
        }
        if (res.statusCode == 401) {
          this.token = ''
          // this.getToken(()=>this.req(method,path,body,cb))
        }
        cb(null, { res, body})
        resolve({res,body})
      })
    })
  }
  connect(cb){
    cb = cb || noop
    console.log('connect')
    return this.getToken(cb)
  }
  auth (email, password, cb) {
    cb = cb || noop
    this.email = email
    this.password = password
    return this.getToken((err, token) => cb(null, token !== 'unauthorized'))
  }
  getToken (cb) {
    cb = cb || noop
    console.log('getToken')
    return new Promise((resolve,reject)=>{
      if(!cb) cb = (()=>{})
      let {email, password} = this.opts
      this.req('POST', '/api/auth/signin', { email, password}, (err, data) => {
        if (err) return cb(err)
        if (data.res.statusCode == 200) {
          this.token = data.body.token
          cb(null, data.body.token)
          resolve(data.body.token)
        }else {
          reject('unauthorized')
          cb(null, 'unauthorized')
        }
      })
    })
  }
  me (cb) {
    cb = cb || noop
    if (!this.token) return this.getToken(() => this.socket(cb))
    this.req('GET', '/api/auth/me', null, (err, data) => {
      if (err) return cb(err)
      this.user = data.body
      cb(err, data.body)
    })
  }
  console (expression) {
    this.req('POST', '/api/user/console', { expression}, (err, data) => {
    })
  }
  socket (cb) {
    cb = cb || noop
    if (!this.token) return this.getToken(() => this.socket(cb))
    if (!this.user) return this.me(() => this.socket(cb))
    let ws = new WebSocket('wss://screeps.com/socket/websocket')
    let send = (...data) => {
      ws.send(...data)
    }
    ws.on('message', msg => {
      if (msg.slice(0, 3) == 'gz:')
        msg = inflate(msg)
      if (msg[0] == '[') msg = JSON.parse(msg)
      if (msg[0].match(/console/))
        this.emit('console', msg)
      else if (msg[0].match(/memory/))
        this.emit('memory', msg)
      else if (msg[0].match(/code/))
        this.emit('code', msg)
      else if (msg[0].match(/room/))
        this.emit('room', msg)
      else
        this.emit('message', msg)
    })
    ws.on('open', () => {
      send('gzip on')
      send(`auth ${this.token}`)
      cb()
    })
    this.ws = ws
  }
  subscribe (path) {
    if (!path.match(/^([a-z]+):(.+?)$/))
      path = `user:${this.user._id}${path}`
    this.wssend(`subscribe ${path}`)
  }
  wssend (...data) {
    // console.log('ws', ...data)
    this.ws.send(...data)
  }
  get memory () {
    return {
      get: (path, def) => {
        return this.req('GET', `/api/user/memory?path=${path || ''}`, null)
          .then(data=>{
            if (data.body.error) throw data.body.error
            let ret = data.body.data || def
            if(typeof ret == 'string' && ret.slice(0,3) == 'gz:') ret = gz(ret)
            return ret
          })
      },
      set: (path, value) => {
        return this.req('POST', `/api/user/memory`, { path, value })
          .then(data=>{
            if (data.body.error) throw data.body.error
            return data.body.data
          })
      }
    }
  }
  get market () {
    return {
      index: () => {
        return this.req('GET', `/api/game/market/index`, null)
          .then(data=>{
            if (data.body.error) throw data.body.error
            let ret = data.body.list
            if(typeof ret == 'string' && ret.slice(0,3) == 'gz:') ret = gz(ret)
            return ret
          })
      },
      orders: (type) => {
        return this.req('GET', `/api/game/market/orders?resourceType=${type}`, null)
          .then(data=>{
            if (data.body.error) throw data.body.error
            let ret = data.body.list
            if(typeof ret == 'string' && ret.slice(0,3) == 'gz:') ret = gz(ret)
            return ret
          })
      },
      stats: (type) => {
        return this.req('GET', `/api/game/market/stats?resourceType=${type}`, null)
          .then(data=>{
            if (data.body.error) throw data.body.error
            let ret = data.body.stats
            if(typeof ret == 'string' && ret.slice(0,3) == 'gz:') ret = gz(ret)
            return ret
          })
      }
    }
  }
}

module.exports = ScreepsAPI

function gz (data) {
  let buf = new Buffer(data.slice(3), 'base64')
  let zlib = require('zlib')
  // let ret = zlib.inflateSync(buf).toString()
  let ret = zlib.gunzipSync(buf).toString()
  // console.log(data, ret)
  return JSON.parse(ret)
}

function inflate (data) {
  let buf = new Buffer(data.slice(3), 'base64')
  let zlib = require('zlib')
  let ret = zlib.inflateSync(buf).toString()
  // let ret = zlib.gunzipSync(buf).toString()
  // console.log(data, ret)
  return JSON.parse(ret)
}

function noop(){}