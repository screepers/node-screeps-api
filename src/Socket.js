import WebSocket from 'ws'
import url from 'url'
import { EventEmitter } from 'events'

const DEFAULTS = {
  reconnect: true,
  resubscribe: true,
  keepAlive: true,
  maxRetries: 10,
  maxRetryDelay: 60 * 1000 // in milli-seconds
}

export class Socket extends EventEmitter {
  constructor (ScreepsAPI) {
    super()
    this.api = ScreepsAPI
    this.opts = Object.assign({}, DEFAULTS)
    this.on('error', () => {}) // catch to prevent unhandled-exception errors
    this.reset()
    this.on('auth', ev => {
      if (ev.data.status === 'ok') {
        while (this.__queue.length) {
          this.emit(this.__queue.shift())
        }
        clearInterval(this.keepAliveInter)
        if (this.opts.keepAlive) {
          this.keepAliveInter = setInterval(() => this.ws && this.ws.ping(1), 10000)
        }
      }
    })
  }
  reset() {
    this.authed = false
    this.connected = false
    this.reconnecting = false
    clearInterval(this.keepAliveInter)
    this.keepAliveInter = 0
    this.__queue = []    // pending messages  (to send once authenticated)
    this.__subQueue = [] // pending subscriptions (to request once authenticated)
    this.__subs = {}     // number of callbacks for each subscription
  }
  async connect (opts = {}) {
    Object.assign(this.opts, opts)
    if (!this.api.token) {
      throw new Error('No token! Call api.auth() before connecting the socket!')
    }
    return new Promise((resolve, reject) => {
      let baseURL = this.api.opts.url.replace('http', 'ws')
      let wsurl = url.resolve(baseURL, 'socket/websocket')
      this.ws = new WebSocket(wsurl)
      this.ws.on('open', () => {
        this.connected = true
        this.reconnecting = false
        if (this.opts.resubscribe) {
          this.__subQueue.push(...Object.keys(this.__subs))
        }
        this.emit('connected')
        resolve(this.auth(this.api.token))
      })
      this.ws.on('close', () => {
        clearInterval(this.keepAliveInter)
        this.authed = false
        this.connected = false
        this.emit('disconnected')
        if (this.opts.reconnect) {
          this.reconnect().catch(() => { /* error emitted in reconnect() */ });
        }
      })
      this.ws.on('error', (err) => {
        this.ws.terminate()
        this.emit('error', err)
        if (!this.connected) {
          reject(err)
        }
      })
      this.ws.on('unexpected-response', (req, res) => {
        let err = new Error(`WS Unexpected Response: ${res.statusCode} ${res.statusMessage}`)
        this.emit('error', err)
        reject(err)
      })
      this.ws.on('message', (data) => this.handleMessage(data))
    })
  }
  async reconnect () {
    Object.keys(this.__subs).forEach(sub => this.subscribe(sub))
    this.reconnecting = true
    let retries = 0
    let retry
    do {
      let time = Math.pow(2, retries) * 100
      if(time > this.opts.maxRetryDelay) time = this.opts.maxRetryDelay
      await this.sleep(time)
      if (!this.reconnecting) return; // reset() called in-between
      try {
        await this.connect()
        retry = false
      } catch (err) {
        retry = true
      }
      retries++
    } while (retry && retries < this.opts.maxRetries)
    if (retry) {
      let err = new Error(`Reconnection failed after ${this.opts.maxRetries} retries`)
      this.reconnecting = false
      this.emit('error', err)
      throw err
    }
  }
  disconnect () {
    clearInterval(this.keepAliveInter)
    this.ws.removeAllListeners() // remove listeners first or we may trigger reconnection & Co.
    this.ws.terminate()
    this.reset()
    this.emit('disconnected')
  }
  sleep (time) {
    return new Promise((resolve, reject) => {
      setTimeout(resolve, time)
    })
  }
  handleMessage (msg) {
    msg = msg.data || msg // Handle ws/browser difference
    if (msg.slice(0, 3) === 'gz:') { msg = this.api.inflate(msg) }
    if (msg[0] === '[') {
      msg = JSON.parse(msg)
      let [, type, id, channel] = msg[0].match(/^(.+):(.+?)(?:\/(.+))?$/)
      channel = channel || type
      let event = { channel, id, type, data: msg[1] }
      this.emit(msg[0], event)
      this.emit(event.channel, event)
      this.emit('message', event)
    } else {
      let [channel, ...data] = msg.split(' ')
      let event = { type: 'server', channel, data }
      if (channel === 'auth') { event.data = { status: data[0], token: data[1] } }
      if (['protocol', 'time', 'package'].includes(channel)) { event.data = { [channel]: data[0] } }
      this.emit(channel, event)
      this.emit('message', event)
    }
  }
  async gzip (bool) {
    this.send(`gzip ${bool ? 'on' : 'off'}`)
  }
  async send (data) {
    if (!this.connected) {
      this.__queue.push(data)
    } else {
      this.ws.send(data)
    }
  }
  auth (token) {
    return new Promise((resolve, reject) => {
      this.send(`auth ${token}`)
      this.once('auth', (ev) => {
        let { data } = ev
        if (data.status === 'ok') {
          this.authed = true
          this.emit('token', data.token)
          this.emit('authed')
          while (this.__subQueue.length) {
            this.send(this.__subQueue.shift())
          }
          resolve()
        } else {
          reject(new Error('socket auth failed'))
        }
      })
    })
  }
  async subscribe (path, cb) {
    if (!path) return
    if (!this.api.user) { await this.api.me() }
    if (!path.match(/^([a-z]+):(.+?)$/)) { path = `user:${this.api.user._id}/${path}` }
    if (this.authed) {
      this.send(`subscribe ${path}`)
    } else {
      this.__subQueue.push(`subscribe ${path}`)
    }
    this.emit('subscribe', path)
    this.__subs[path] = this.__subs[path] || 0
    this.__subs[path]++
    if (cb) this.on(path, cb)
  }
  async unsubscribe (path) {
    if (!path) return
    if (!this.api.user) { await this.api.me() }
    if (!path.match(/^([a-z]+):(.+?)$/)) { path = `user:${this.api.user._id}/${path}` }
    this.send(`unsubscribe ${path}`)
    this.emit('unsubscribe', path)
    if (this.__subs[path]) this.__subs[path]--
  }
}
