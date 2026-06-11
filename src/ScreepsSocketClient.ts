import Debug from 'debug'
import { EventEmitter } from 'node:events'
import { setTimeout } from 'node:timers/promises'
import { URL } from 'node:url'
import utils from 'node:util'
import WebSocket from 'ws'
import zlib from 'zlib'
import { ScreepsHttpClient } from './ScreepsHttpClient'
import { ServerAuthEvent, ServerAuthStatus, SocketEvent } from './socket'

const debug = Debug('screepsapi:socket')

const inflateAsync = utils.promisify(zlib.inflate)

const decoder = new TextDecoder('utf-8', { fatal: true })

/**
 * Configuration options for {@link ScreepsSocketClient}.
 * These are provided when calling {@link ScreepsSocketClient.connect}.
 * @see {@link DEFAULT_SOCKET_CONFIG} for default values
 */
export interface ScreepsSocketConfig {
  /**
   * If enabled, {@link ScreepsSocketClient} will call {@link reconnect} automatically
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
  /** Time (in milliseconds) between keep-alive pings */
  keepAliveInterval: number
  /**
   * The maximum number of connection attempts to make before
   * throwing an error in {@link ScreepsSocketClient.reconnect}.
   */
  maxRetries: number
  /**
   * The maximum delay (in milliseconds) before a retry attempt
   * in {@link ScreepsSocketClient.reconnect}.
   */
  maxRetryDelay: number
}

/** Default {@link ScreepsSocketConfig} used by {@link ScreepsSocketClient.connect} */
export const DEFAULT_SOCKET_CONFIG = {
  reconnect: true,
  resubscribe: true,
  keepAlive: true,
  keepAliveInterval: 10_000, // 10 seconds
  maxRetries: 10,
  maxRetryDelay: 60_000 // 1 minute
} as const

/**
 * Provides access to the Screeps WebSocket API.
 * @document ../guides/websocket.md
 * @see {@link ScreepsHttpClient} for the HTTP API client
 */
export class ScreepsSocketClient extends EventEmitter {
  api: ScreepsHttpClient
  opts: ScreepsSocketConfig
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
   * Instead, use the instance from {@link ScreepsHttpClient.socket}.
   * @param api The HTTP client instance with which config and auth credentials
   *  should be shared
   */
  constructor(api: ScreepsHttpClient) {
    super()
    this.api = api
    this.opts = Object.assign({}, DEFAULT_SOCKET_CONFIG)
    this.on('error', console.error)
    this.reset()
    this.on('auth', (ev: ServerAuthEvent) => {
      if (ev.data.status === ServerAuthStatus.OK) {
        while (this.__queue.length) {
          this.emit(this.__queue.shift()! as string)
        }
        clearInterval(this.keepAliveInter)
        if (this.opts.keepAlive) {
          this.keepAliveInter = setInterval(() => this.ws?.ping(1), this.opts.keepAliveInterval)
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
   * @param opts WebSocket API client options. See {@link ScreepsSocketConfig}.
   * @throws {@link node!Error | Error} if an API token is not available due to missing auth credentials
   */
  async connect(opts?: Partial<ScreepsSocketConfig>) {
    Object.assign(this.opts, opts ?? {})
    if (!this.api.token) {
      await this.api.auth(
        new Error('No token! Call api.auth() before connecting the socket!')
      )
    }
    await new Promise((resolve, reject) => {
      const baseUrl = this.api.server.url.replace('http', 'ws')
      const wsurl = new URL('socket/websocket', baseUrl)
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
      this.ws.on('message', data => void this.handleMessage(data))
    })
  }

  /**
   * Reconnect to the server using current client settings.
   *
   * Upon success, all previous subscriptions will be reestablished
   * (if {@link ScreepsSocketConfig.resubscribe} is enabled).
   *
   * Up to {@link ScreepsSocketConfig.maxRetries} connections will be attempted
   * with exponential backoff.
   * @throws {@link node!Error | Error} if the maximum number of retry attempts is exceeded
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
  private async handleMessage(rawMsg: WebSocket.Data | { data: string }) {
    // Decode buffers to UTF-8 strings
    const decodedMsg = ((rawMsg instanceof ArrayBuffer || rawMsg instanceof Buffer)
      ? decoder.decode(rawMsg)
      : rawMsg) as string | { data: string }

    // Normalize message contents across ws/browser APIs
    let msg = typeof decodedMsg === 'object' && ('data' in decodedMsg)
      ? decodedMsg.data
      : decodedMsg

    // Decompress message if gzipped
    if (msg.startsWith('gz:')) {
      msg = await this.inflate(msg) as string
    }
    debug(`message ${msg}`)

    if (msg.startsWith('[')) {
      const msgData = JSON.parse(msg) as [string, unknown]
      const [, type, id, path = ''] = /^(.+):(.+?)(?:\/(.+))?$/.exec(msgData[0])!
      const event = {
        type,
        id,
        path,
        data: msgData[1]
      }
      this.emit(msgData[0], event)
      this.emit(path, event)
      this.emit('message', event)
      return
    }

    const [path, ...data] = msg.split(' ')
    const event: {
      type: 'server'
      path: string
      data: string[] | { status: string, token: string } | { [path: string]: string }
    } = { type: 'server', path, data }
    if (path === 'auth') {
      event.data = { status: data[0], token: data[1] }
    }
    if (['protocol', 'time', 'package'].includes(path)) {
      event.data = { [path]: data[0] }
    }
    this.emit(path, event)
    this.emit('message', event)
  }

  private async inflate(data: string): Promise<unknown> {
    const buf = Buffer.from(data.slice(3), 'base64')
    const ret = await inflateAsync(buf)
    return JSON.parse(ret.toString())
  }

  /**
   * Enable/disable gzip compression/deflation of messages from the server.
   *
   * Regardless of whether this is enabled or not, {@link ScreepsSocketClient} will
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
   * already implemented as another method on {@link ScreepsSocketClient}.
   * If you have a use case for calling `send` directly, please consider
   * submitting a PR to add the feature to {@link ScreepsSocketClient}.
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
   * @param token The API token with which to authenticate
   */
  private async auth(token: string) {
    return await new Promise<void>((resolve, reject) => {
      this.send(`auth ${token}`)
      this.once('auth', (event: ServerAuthEvent) => {
        const { data } = event
        if (data.status === ServerAuthStatus.OK) {
          this.authed = true
          this.emit('token', data.token)
          this.emit('authed')
          while (this.__subQueue.length) {
            this.send(this.__subQueue.shift()!)
          }
          resolve()
        } else {
          reject(new Error('WebSocket API authentication failed'))
        }
      })
    })
  }

  /**
   * Subscribe to an event type.
   * @param eventSpec The name of the event (ex: `console`, `room:${roomName}`).
   *  Non-colon-delimited strings will be prefixed with `user:${yourUserId}`.
   * @param cb The callback to trigger when a relevant message is received.
   *  This can be left undefined to resubscribe to an event using a
   *  previously-registered callback.
   */
  // TODO: Add overloads with stronger cb type restrictions for known event type/path combos
  async subscribe<E extends SocketEvent>(eventSpec: string, cb?: (event: E) => void) {
    if (!eventSpec) {
      debug('subscribe() called with no event')
      return
    }
    eventSpec = await this.normalizeEvent(eventSpec)

    if (this.authed) {
      this.send(`subscribe ${eventSpec}`)
    } else {
      this.__subQueue.push(`subscribe ${eventSpec}`)
    }
    this.emit('subscribe', eventSpec)
    this.__subs[eventSpec] ||= 0
    this.__subs[eventSpec]++
    if (cb) this.on(eventSpec, cb)
  }

  /**
   * Unsubscribe from an event type.
   * @param eventSpec The type of event to subscribe to (ex: 'console', 'room:ROOM_NAME').
   *  Non-colon-delimited strings will be prefixed with `user:${yourUserId}`.
   * @param cb The callback to unregister. Regardless of whether or not a callback
   *  is provided, the `unsubscribe` message will be sent.
   */
  // TODO: Add overloads with stronger cb type restrictions for known event type/path combos
  async unsubscribe<E extends SocketEvent>(eventSpec: string, cb?: (event: E) => void) {
    if (!eventSpec) {
      debug('unsubscribe() called with no event')
      return
    }
    eventSpec = await this.normalizeEvent(eventSpec)

    // Unsubscribe is always sent (instead of just at `this.__subs[event] <= 0)
    // because the server handles subscriber counting already.
    this.send(`unsubscribe ${eventSpec}`)
    this.emit('unsubscribe', eventSpec)
    if (+this.__subs[eventSpec] > 0) this.__subs[eventSpec]--
    if (cb) this.off(eventSpec, cb)
  }

  private async normalizeEvent(eventSpec: string): Promise<string> {
    // If event string looks like a fully-formed event type/ID spec, do nothing
    if (/^(\w+):(.+?)$/.exec(eventSpec)) {
      return eventSpec
    }

    // Otherwise, prepend user and user ID
    const userId = (await this.api.me())._id
    return `user:${userId}/${eventSpec}`
  }
}
