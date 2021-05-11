import Debug from 'debug'
import { EventEmitter, once } from 'events'
import { promisify } from 'util'
import { inflate } from 'zlib'
import { ConsoleEvent, CPUEvent, RoomMap2Event, SocketEvent } from './API.types'
import { ScreepsAPI } from './ScreepsAPI'
import WebSocket = require("isomorphic-ws")

const inflateAsync = promisify(inflate)

const debug = Debug('screepsapi:socket')

type SocketOpts = {
  reconnect: boolean
  resubscribe: boolean
  maxRetries: number
  /** Maximum delay between retries in milliseconds */
  maxRetryDelay: number
}

const SOCKET_DEFAULTS: SocketOpts = {
  reconnect: true,
  resubscribe: true,
  maxRetries: 10,
  maxRetryDelay: 60 * 1000 // in milli-seconds
}
export declare interface Socket {
  on(event: 'auth', listener: (ev: { status: string, token: string }) => void): this
  on(event: 'cpu', listener: (event: SocketEvent<CPUEvent>) => void): this
  on(event: 'console', listener: (event: SocketEvent<ConsoleEvent>) => void): this
  on(event: 'roomMap2', listener: (event: SocketEvent<RoomMap2Event>) => void): this
  on(event: string, listener: Function): this
}
export class Socket extends EventEmitter {
  readonly api: ScreepsAPI
  readonly opts: SocketOpts = SOCKET_DEFAULTS
  private sendQueue: string[] = []
  private keepAliveInterval: NodeJS.Timeout
  ws: WebSocket
  connected: boolean = false
  reconnecting: boolean = false
  authed: boolean = false
  subs: { [name: string]: number }

  constructor(api: ScreepsAPI, opts: Partial<SocketOpts> = SOCKET_DEFAULTS) {
    super()
    this.api = api
    Object.assign(this.opts, opts)
    this.on('error', () => {}) // catch to prevent unhandled-exception errors
    this.reset()
    this.on('auth', ({ status }) => {
      if (status === 'ok') {
        clearInterval(this.keepAliveInterval)
        this.keepAliveInterval = setInterval(() => this.ws && this.ws.ping(1), 10000)
      }
    })
  }

  reset () {
    this.authed = false
    this.connected = false
    this.reconnecting = false
    clearInterval(this.keepAliveInterval)
    this.keepAliveInterval = null
    this.sendQueue = []
    this.subs = {} // number of callbacks for each subscription
  }

  async connect (opts: Partial<SocketOpts> = {}) {
    if (opts) {
      Object.assign(this.opts, opts)
    }
    if (!this.api.token) {
      await this.api.auth()
    }
    return new Promise((resolve, reject) => {
      const { secure, host, port, path } = this.api.opts
      const wsurl = `${secure ? 'wss' : 'ws'}://${host}:${port}${path}socket/websocket`
      this.ws = new WebSocket(wsurl)
      this.ws.onopen = () => {
        this.connected = true
        this.reconnecting = false
        debug('connected')
        this.emit('connected')
        resolve((async () => {
          try {
            await this.auth(this.api.token)
          } catch (err) {
            if (err.message === 'socket auth failed') {
              await this.api.auth()
              await this.auth(this.api.token)
            } else {
              throw err
            }
          }
          if (this.sendQueue.length) {
            for (const cmd of this.sendQueue) {
              this.ws.send(cmd)
            }
            this.sendQueue = []
          }
          if (this.opts.resubscribe) {
            for (const sub in this.subs) {
              this.ws.send(`subscribe ${sub}`)
            }
          }
        })())
      }
      this.ws.onclose = () => {
        clearInterval(this.keepAliveInterval)
        this.authed = false
        this.connected = false
        debug('disconnected')
        this.emit('disconnected')
        if (this.opts.reconnect) {
          this.reconnect().catch(() => { /* error emitted in reconnect() */ })
        }
      }
      this.ws.onerror = err => {
        this.ws.terminate()
        this.emit('error', err)
        debug(`error ${err}`)
        if (!this.connected) {
          reject(err)
        }
      }
      this.ws.onmessage = ({ data }) => this.handleMessage(data as string)
    })
  }

  async reconnect () {
    if (this.reconnecting) return
    this.reconnecting = true
    let retries = 0
    let retry = false
    do {
      const time = Math.min(Math.pow(2, retries) * 100, this.opts.maxRetryDelay)
      await this.sleep(time)
      if (!this.reconnecting) return // reset() called in-between
      try {
        await this.connect()
        retry = false
      } catch (err) {
        retry = true
      }
      retries++
      debug(`reconnect ${retries}/${this.opts.maxRetries}`)
    } while (retry && retries < this.opts.maxRetries)
    if (retry) {
      const err = new Error(`Reconnection failed after ${this.opts.maxRetries} retries`)
      this.reconnecting = false
      debug('reconnect failed')
      this.emit('error', err)
      throw err
    }
  }

  async disconnect () {
    debug('disconnect')
    clearInterval(this.keepAliveInterval)
    this.ws.removeAllListeners() // remove listeners first or we may trigger reconnection & Co.
    this.ws.terminate()
    this.reset()
    this.emit('disconnected')
  }

  /** @param ms Milliseconds to sleep */
  sleep (ms: number): Promise<void> {
    return new Promise((resolve, reject) => {
      setTimeout(resolve, ms)
    })
  }

  private async inflate(data: string): Promise<string> { // es
    const buf = Buffer.from(data.slice(3), 'base64')
    const ret = await inflateAsync(buf)
    return ret.toString()
  }

  private async handleMessage (msg: string) {
    if (msg.slice(0, 3) === 'gz:') {
      msg = await this.inflate(msg)
    }
    debug(`message ${msg}`)
    if (msg[0] === '[') {
      msg = JSON.parse(msg)
      let [, type, id, path = ''] = msg[0].match(/^(.+):(.+?)(?:\/(.+))?$/)
      const event = { path, id, type, data: msg[1] }
      this.emit(msg[0], event)
      this.emit(type, event)
      this.emit(event.path, event)
      this.emit('message', event)
    } else {
      const [channel, ...data] = msg.split(' ')
      const event = { type: 'server', channel, data }
      this.emit('message', event)
      if (channel === 'auth') {
        this.emit('auth', { status: data[0], token: data[1] })
        return
      }
      this.emit(channel, event)
    }
  }

  async gzip (bool: boolean) {
    this.send(`gzip ${bool ? 'on' : 'off'}`)
  }

  async send (data: string) {
    if (!this.connected) {
      this.sendQueue.push(data)
    } else {
      this.ws.send(data)
    }
    debug(`send ${data}`)
  }

  async auth (token: string) {
    this.send(`auth ${token}`)
    const [{ status, token: newToken }] = await once(this, 'auth')
    if (status === 'ok') {
      this.authed = true
      if (newToken) this.api.emit('token', newToken)
      this.emit('authed')
      const cmds = this.sendQueue.splice(0, this.sendQueue.length)
      for(const cmd of cmds) {
        this.ws.send(cmd)
      }
    } else {
      throw new Error('socket auth failed')
    }
  }

  async subscribe (path: string) {
    if (!path) return
    const userID = await this.api.userId()
    if (!path.match(/^(\w+):(.+?)$/)) { path = `user:${userID}/${path}` }
    this.send(`subscribe ${path}`)
    this.emit('subscribe', path)
    this.subs[path] = this.subs[path] || 0
    this.subs[path]++
  }

  async unsubscribe (path: string) {
    if (!path) return
    const userID = await this.api.userId()
    if (!path.match(/^(\w+):(.+?)$/)) { path = `user:${userID}/${path}` }
    this.send(`unsubscribe ${path}`)
    this.emit('unsubscribe', path)
    if (this.subs[path]) this.subs[path]--
  }
}
