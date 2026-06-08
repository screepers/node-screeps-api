import Debug from 'debug'
import { EventEmitter } from 'node:events'
import { setTimeout } from 'node:timers/promises'
import { URL } from 'node:url'
import utils from 'node:util'
import WebSocket from 'ws'
import zlib from 'zlib'
import { ScreepsAPI } from './ScreepsAPI'

const debug = Debug('screepsapi:socket')

const inflateAsync = utils.promisify(zlib.inflate)

declare global {
  namespace Api {
    /**
     * Configuration options for {@link Socket}.
     * These are provided when calling {@link Socket.connect}.
     * @see {@link SOCKET_DEFAULTS} for default values
     */
    export interface SocketOptions {
      /**
       * If enabled, {@link Socket} will call {@link reconnect} automatically
       * when disconnected.
       */
      reconnect: boolean
      /**
       * If enabled, all previous subscriptions will be recreated
       * after successfully reconnecting.
       */
      resubscribe: boolean
      /**
       * If enabled, ping the server periodically to prevent the connection
       * from being closed.
       */
      keepAlive: boolean
      /**
       * The maximum number of connection attempts to make before
       * throwing an error in {@link Socket.reconnect}.
       */
      maxRetries: number
      /**
       * The maximum delay (in milliseconds) before a retry attempt
       * in {@link Socket.reconnect}.
       */
      maxRetryDelay: number
    }
  }
}

/** Default {@link Api.SocketOptions} used by {@link Socket.connect} */
export const SOCKET_DEFAULTS: Readonly<Api.SocketOptions> = {
  reconnect: true,
  resubscribe: true,
  keepAlive: true,
  maxRetries: 10,
  maxRetryDelay: 60 * 1000 // in milli-seconds
}

/**
 * Provides access to the Screeps WebSocket API.
 *
 * {@include ../docs/Websocket_endpoints.md}
 * @see {@link ScreepsAPI} for the HTTP API client
 */
export class Socket extends EventEmitter {
  api: ScreepsAPI
  opts: Api.SocketOptions
  ws?: WebSocket
  authed = false
  connected = false
  reconnecting = false

  private keepAliveInter?: NodeJS.Timeout
  /**
   * Pending messages to send once connected/authenticated.
   * @hidden
   */
  private __queue: (string | WebSocket.RawData)[] = []
  /**
   * Pending subscriptions to request once connected/authenticated
   * @hidden
   */
  private __subQueue: (string | WebSocket.RawData)[] = []
  /**
   * The number of subscriber callbacks by event type
   * @hidden
   */
  private __subs: { [event: string]: number } = {}

  /**
   * Initializes a new WebSocket API client. Do not call this directly.
   * Instead, use the instance from {@link ScreepsAPI.socket}.
   * @param api The HTTP client instance with which config and auth credentials
   *  should be shared
   */
  constructor(api: ScreepsAPI) {
    super()
    this.api = api
    this.opts = Object.assign({}, SOCKET_DEFAULTS)
    this.on('error', console.error)
    this.reset()
    this.on('auth', (ev: AuthEvent) => {
      if (ev.data.status === 'ok') {
        while (this.__queue.length) {
          this.emit(this.__queue.shift()! as string)
        }
        clearInterval(this.keepAliveInter)
        if (this.opts.keepAlive) {
          this.keepAliveInter = setInterval(() => this.ws?.ping(1), 10_000)
        }
      }
    })
  }

  /** Initialize (or re-initialize) all client state */
  private reset() {
    this.authed = false
    this.connected = false
    this.reconnecting = false
    clearInterval(this.keepAliveInter)
    delete this.keepAliveInter
    this.__queue = []
    this.__subQueue = []
    this.__subs = {}
  }

  /**
   * Connect to the server and immediately attempt to authenticate.
   *
   * If successful, any queued messages will be sent automatically.
   * @param opts WebSocket API client options. See {@link Api.SocketOptions}.
   * @throws {Error} if an API token is not available due to missing auth credentials
   */
  async connect(opts?: Partial<Api.SocketOptions>) {
    Object.assign(this.opts, opts ?? {})
    if (!this.api.token) {
      await this.api.auth(
        new Error('No token! Call api.auth() before connecting the socket!')
      )
    }
    await new Promise((resolve, reject) => {
      const baseURL = this.api.config.server.url.replace('http', 'ws')
      const wsurl = new URL('socket/websocket', baseURL)
      this.ws = new WebSocket(wsurl)
      this.ws.on('open', () => {
        this.connected = true
        this.reconnecting = false
        if (this.opts.resubscribe) {
          this.__subQueue.push(...Object.keys(this.__subs))
        }
        debug('connected')
        this.emit('connected')
        resolve(this.auth(this.api.token!))
      })
      this.ws.on('close', () => {
        clearInterval(this.keepAliveInter)
        this.authed = false
        this.connected = false
        debug('disconnected')
        this.emit('disconnected')
        if (this.opts.reconnect) {
          this.reconnect().catch(() => { /* error emitted in reconnect() */ })
        }
      })
      this.ws.on('error', (err) => {
        this.ws?.terminate()
        this.emit('error', err)
        debug(`error ${err}`)
        if (!this.connected) {
          reject(err)
        }
      })
      this.ws.on('unexpected-response', (req, res) => {
        const err = new Error(`WS Unexpected Response: ${res.statusCode} ${res.statusMessage}`)
        this.emit('error', err)
        reject(err)
      })
      this.ws.on('message', data => void this.handleMessage(data as unknown as string))
    })
  }

  /**
   * Reconnect to the server using current client settings.
   *
   * Upon success, all previous subscriptions will be reestablished
   * (if {@link Api.SocketOptions.resubscribe} is enabled).
   *
   * Up to {@link Api.SocketOptions.maxRetries} connections will be attempted
   * with exponential backoff.
   * @throws {Error} if the maximum number of retry attempts is exceeded
   */
  async reconnect() {
    if (this.reconnecting) {
      return
    }
    this.reconnecting = true
    let retries = 0
    let retry
    do {
      let time = Math.pow(2, retries) * 100
      if (time > this.opts.maxRetryDelay) time = this.opts.maxRetryDelay
      await setTimeout(time)
      if (!this.reconnecting) return // reset() called in-between
      try {
        await this.connect()
        retry = false
      } catch {
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
    } else {
      // Resume existing subscriptions on the new socket
      Object.keys(this.__subs).forEach(sub => void this.subscribe(sub))
    }
  }

  /** Close the connection and clear all queued messages. */
  disconnect() {
    debug('disconnect')
    clearInterval(this.keepAliveInter)
    if (this.ws) {
      // Remove listeners first or we may trigger reconnection / etc
      this.ws.removeAllListeners()
      this.ws.terminate()
    }
    this.reset()
    this.emit('disconnected')
  }

  /**
   * Process an incoming message (normalize/inflate message data, etc),
   * then emit events to notify the relevant subscribers.
   * @param rawMsg The raw message content sent by the server
   */
  private async handleMessage(rawMsg: string | { data: string }) {
    let msg = typeof rawMsg === 'object' ? rawMsg.data : rawMsg // Handle ws/browser difference
    if (msg.startsWith('gz:')) {
      msg = await this.inflate(msg) as string
    }
    debug(`message ${msg}`)
    if (msg.startsWith('[')) {
      const tupleMsg = JSON.parse(msg) as [string, unknown]
      const [, type, id, channel] = /^(.+):(.+?)(?:\/(.+))?$/.exec(tupleMsg[0])!
      const event = { channel: channel ?? type, id, type, data: tupleMsg[1] }
      this.emit(tupleMsg[0], event)
      this.emit(event.channel, event)
      this.emit('message', event)
    } else {
      const [channel, ...data] = msg.split(' ')
      const event: {
        type: 'server'
        channel: string
        data: string[] | { status: string, token: string } | { [channel: string]: string }
      } = { type: 'server', channel, data }
      if (channel === 'auth') {
        event.data = { status: data[0], token: data[1] }
      }
      if (['protocol', 'time', 'package'].includes(channel)) {
        event.data = { [channel]: data[0] }
      }
      this.emit(channel, event)
      this.emit('message', event)
    }
  }

  private async inflate(data: string): Promise<unknown> {
    const buf = Buffer.from(data.slice(3), 'base64')
    const ret = await inflateAsync(buf)
    return JSON.parse(ret.toString())
  }

  /**
   * Enable/disable gzip compression/deflation of messages from the server.
   *
   * Regardless of whether this is enabled or not, {@link Socket} will
   * automatically inflate any compressed messages before notifying subscribers.
   * @param enabled `true` to enable compression; `false` to disable it
   */
  gzip(enabled: boolean) {
    this.send(`gzip ${enabled ? 'on' : 'off'}`)
  }

  /**
   * Send a message to the server.
   *
   * If the client is not currently connected, the message will be queued
   * to be sent when the connection is established.
   *
   * This should only be called directly if the desired functionality is not
   * already implemented as another method on {@link Socket}. If you have a
   * use case for calling `send` directly, please consider submitting a PR
   * to add the feature to {@link Socket}.
   * @param data the message to send
   */
  send(data: string | WebSocket.RawData) {
    if (!this.connected || !this.ws) {
      this.__queue.push(data)
    } else {
      this.ws.send(data)
    }
  }

  /**
   * Authenticate to the server. This is called automatically after a
   * connection is successfully established.
   * @param token the API token with which to authenticate
   */
  private async auth(token: string) {
    return await new Promise<void>((resolve, reject) => {
      this.send(`auth ${token}`)
      this.once('auth', (ev) => {
        const { data } = ev as AuthEvent
        if (data.status === 'ok') {
          this.authed = true
          this.emit('token', data.token)
          this.emit('authed')
          while (this.__subQueue.length) {
            this.send(this.__subQueue.shift()!)
          }
          resolve()
        } else {
          reject(new Error('socket auth failed'))
        }
      })
    })
  }

  /**
   * Subscribe to an event type.
   * @param event The name of the event (ex: 'console', 'room:ROOM_NAME')
   * @param cb The callback to trigger when a relevant message is received.
   *  This can be left undefined to resubscribe to an event using a
   *  previously-registered callback.
   */
  // TODO: Add overloads with stronger cb type restrictions for known path types
  async subscribe(event: string, cb?: (...args: unknown[]) => void) {
    if (!event) return
    const userID = await this.api.userID()
    if (!(/^(\w+):(.+?)$/.exec(event))) {
      event = `user:${userID}/${event}`
    }
    if (this.authed) {
      this.send(`subscribe ${event}`)
    } else {
      this.__subQueue.push(`subscribe ${event}`)
    }
    this.emit('subscribe', event)
    this.__subs[event] = this.__subs[event] || 0
    this.__subs[event]++
    if (cb) this.on(event, cb)
  }

  /**
   * Unsubscribe from an event type.
   * @param event The name of the event (ex: 'console', 'room:ROOM_NAME')
   * @param cb The callback to unsubscribe.
   */
  async unsubscribe(event: string, cb?: (...args: unknown[]) => void) {
    if (!event) return
    const userID = await this.api.userID()
    if (!(/^(\w+):(.+?)$/.exec(event))) {
      event = `user:${userID}/${event}`
    }
    // Unsubscribe is always sent (instead of just at `this.__subs[event] <= 0)
    // because the server handles subscriber counting already.
    this.send(`unsubscribe ${event}`)
    this.emit('unsubscribe', event)
    if (this.__subs[event]) this.__subs[event]--
    if (cb) this.off(event, cb)
  }
}

interface AuthEvent {
  data: {
    status: string
    token: string
  }
}
