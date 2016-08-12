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
    request({
      url: `${this.prefix}${path}`,
      json: true,
      method,
      headers: {
        'X-Token': this.token || undefined,
        'X-Username': this.token || undefined
      },
      body: body || undefined
    }, (err, res, body) => {
      if (err) return cb(err)
      if (res.statusCode == 200) {
        if (res.headers['x-token'])
          this.token = res.headers['x-token']
      }
      cb(null, { res, body})
    })
  }
  auth (email, password, cb) {
    this.email = email
    this.password = password
    this.getToken((err, token) => cb(null, token !== 'unauthorized'))
  }
  getToken (cb) {
    let {email, password} = this.opts
    this.req('POST', '/api/auth/signin', { email, password}, (err, data) => {
      if (err) return cb(err)
      if (data.res.statusCode == 200) {
        this.token = data.body.token
        cb(null, data.body.token)
      }else {
        cb(null, 'unauthorized')
      }
    })
  }
  me (cb) {
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
    if (!this.token) return this.getToken(() => this.socket(cb))
    if (!this.user) return this.me(() => this.socket(cb))
    let ws = new WebSocket('wss://screeps.com/socket/websocket')
    let send = (...data) => {
      ws.send(...data)
    }
    ws.on('message', msg => {
      if (msg.slice(0, 3) == 'gz:')
        msg = gz(msg)
      if (msg[0] == '[') msg = JSON.parse(msg)
      if (msg[0].match(/console/))
        this.emit('console', msg)
      else if (msg[0].match(/memory/))
        this.emit('memory', msg)
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
    this.wssend(`subscribe user:${this.user._id}${path}`)
  }
  wssend (...data) {
    // console.log('ws', ...data)
    this.ws.send(...data)
  }
}

module.exports = { ScreepsAPI}

function gz (data) {
  let buf = new Buffer(data.slice(3), 'base64')
  let zlib = require('zlib')
  let ret = zlib.inflateSync(buf).toString()
  // let ret = zlib.gunzipSync(buf).toString()
  // console.log(data, ret)
  return JSON.parse(ret)
}
