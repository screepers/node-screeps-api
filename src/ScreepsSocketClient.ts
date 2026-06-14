/* eslint-disable jsdoc/require-returns */
import Debug from 'debug'
import { EventEmitter } from 'node:events'
import { setTimeout } from 'node:timers/promises'
import { URL } from 'node:url'
import utils from 'node:util'
import WebSocket from 'ws'
import zlib from 'zlib'
import { ScreepsHttpClient } from './ScreepsHttpClient'
import { MapVisualEvent, RoomEvent, RoomMap2Event, ServerAuthEvent, ServerAuthStatuses, SocketEvent, UserCodeEvent, UserConsoleEvent, UserCpuEvent, UserMemoryEvent, UserResourceEvent } from './socket'

const debug = Debug('screepsapi:socket')

const inflateAsync = utils.promisify(zlib.inflate)

/**
 * Provides access to the Screeps WebSocket API.
 *
 * To begin using this client, call {@link connect} to establish a connection
 * to {@link ScreepsHttpClient.server} and authenticate once the connection
 * is established. The {@link ScreepsSocketClient.AUTHED} event will be fired
 * when authentication is successful. {@link ScreepsSocketClient.AUTH} will be
 * fired when authentication success or fails.
 *
 * Interactions with this client are primarily event-driven. Use {@link subscribe}
 * and its derived methods to subscribe to relevant events and register listeners.
 *
 * This client's behavior can be configured via options in {@link ScreepsClientConfig}.
 *
 * To switch servers, call {@link ScreepsHttpClient.setServer}, then manually
 * reconnect and (re)subscribe to any relevant events.
 * Example:
 * {@includeCode ../examples/socket-demo.ts}
 * @see {@link ScreepsHttpClient} for the HTTP API client
 * @hideconstructor
 * @category WebSocket API
 */
export class ScreepsSocketClient extends EventEmitter {
  /**
   * Sent after a connection is established and authentication has been attempted.
   *
   * Payload:
   * @event {@link ServerAuthEvent} The response to the authentication request
   * @category Events
   */
  static readonly AUTH = 'auth'

  /**
   * Sent after successful authentication to the server.
   *
   * Payload:
   * @event undefined
   * @category Events
   */
  static readonly AUTHED = 'authed'

  /**
   * Sent after a connection is established, but before authentication.
   *
   * Payload:
   * @event undefined
   * @category Events
   */
  static readonly CONNECTED = 'connected'

  /**
   * Sent after a connection is established, but before automatic reconnection
   * is attempted.
   *
   * Payload:
   * @event undefined
   * @category Events
   */
  static readonly DISCONNECTED = 'disconnected'

  /**
   * Sent when an error is emitted by the WebSocket library.
   *
   * Payload:
   * @event unknown - An error value or object
   * @category Events
   */
  static readonly ERROR = 'error'

  /**
   * Sent when any message is received from the server.
   *
   * Payload:
   * @event {@link SocketEvent} The received message after it has been parsed
   *  into an event object
   * @category Events
   */
  static readonly MESSAGE = 'message'

  /**
   * Sent after subscribing to an event on the server.
   *
   * Payload:
   * @event string - The subscribed event type
   * @category Events
   */
  static readonly SUBSCRIBE = 'subscribe'

  /**
   * Sent when a new API authentication token has been obtained.
   *
   * Payload:
   * @event string - The API auth token
   * @category Events
   */
  static readonly TOKEN = 'token'

  /**
   * Sent after unsubscribing from an event on the server.
   *
   * Payload:
   * @event string - The unsubscribed event type
   * @category Events
   */
  static readonly UNSUBSCRIBE = 'unsubscribe'

  private __authed = false

  /**
   * If true, the client has an open WebSocket connection to the server
   * and has successfully authenticated
   */
  get authed(): boolean {
    return this.__authed
  }

  private __connected = false

  /**
   * If true, the client has an open WebSocket connection to the server
   * @see {@link authed} for authentication status
   */
  get connected(): boolean {
    return this.__connected
  }

  private __reconnecting = false

  /**
   * If true, a {@link reconnect} attempt is currently in progress
   */
  get reconnecting(): boolean {
    return this.__reconnecting
  }

  protected ws?: WebSocket

  /**
   * Used to decode buffered message data received over the WebSocket connection
   * @hidden
   */
  protected decoder = new TextDecoder('utf-8', { fatal: true })

  /**
   * A reference to the associated HTTP API client
   * @hidden
   */
  protected http: ScreepsHttpClient

  private keepAliveInter?: NodeJS.Timeout

  /**
   * Pending messages to send once connected/authenticated
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
   * @param http The HTTP client instance with which config and auth credentials
   *  should be shared
   */
  constructor(http: ScreepsHttpClient) {
    super()
    this.http = http
    this.reset()

    this.on(ScreepsSocketClient.ERROR, console.error)
    this.on(ScreepsSocketClient.AUTH, (ev: ServerAuthEvent) => {
      if (ev.data.status !== ServerAuthStatuses.Ok) {
        return
      }

      // Send queued messages
      while (this.__queue.length) {
        this.send(this.__queue.shift()!)
      }

      clearInterval(this.keepAliveInter)
      if (this.http.appConfig.wsKeepAlive) {
        this.keepAliveInter = setInterval(
          () => this.ws?.ping(1),
          this.http.appConfig.wsKeepAliveInterval
        )
      }
    })
  }

  /** Initialize (or re-initialize) all client state */
  private reset() {
    this.__authed = false
    this.__connected = false
    this.__reconnecting = false
    clearInterval(this.keepAliveInter)
    delete this.keepAliveInter
    this.__queue = []
    this.__subQueue = []
    this.__subs = {}
  }

  /**
   * Connect to the server and immediately attempt to authenticate.
   *
   * Any queued messages will be sent as soon as authentication succeeds.
   * @throws {@link node!Error | Error} if an API token is not available due to missing auth credentials
   */
  async connect() {
    if (!this.http.token) {
      await this.http.auth(
        new Error('No token! Call api.auth() before connecting the socket!')
      )
    }
    await new Promise((resolve, reject) => {
      const baseUrl = this.http.server.url.replace('http', 'ws')
      const wsurl = new URL('socket/websocket', baseUrl)
      this.ws = new WebSocket(wsurl)
      this.ws.on('open', () => {
        this.__connected = true
        this.__reconnecting = false
        if (this.http.appConfig.wsResubscribe) {
          this.__subQueue.push(...Object.keys(this.__subs))
        }
        debug(ScreepsSocketClient.CONNECTED)
        this.emit(ScreepsSocketClient.CONNECTED)
        resolve(this.auth(this.http.token!))
      })
      this.ws.on('close', () => {
        clearInterval(this.keepAliveInter)
        this.__authed = false
        this.__connected = false
        debug(ScreepsSocketClient.DISCONNECTED)
        this.emit(ScreepsSocketClient.DISCONNECTED)
        if (this.http.appConfig.wsReconnect) {
          this.reconnect().catch(() => { /* error emitted in reconnect() */ })
        }
      })
      this.ws.on('error', (err) => {
        this.ws?.terminate()
        this.emit(ScreepsSocketClient.ERROR, err)
        debug(`${ScreepsSocketClient.ERROR} ${err}`)
        if (!this.connected) {
          reject(err)
        }
      })
      this.ws.on('unexpected-response', (_req, res) => {
        const err = new Error(`WS Unexpected Response: ${res.statusCode} ${res.statusMessage}`)
        this.emit(ScreepsSocketClient.ERROR, err)
        reject(err)
      })
      this.ws.on('message', data => void this.handleMessage(data))
    })
  }

  /**
   * Reconnect to the server using current client settings.
   *
   * This method will immediately exit if the client is already attempting
   * to reconnect.
   *
   * Upon success, all previous subscriptions will be reestablished
   * (if {@link ScreepsSocketConfig.resubscribe} is enabled).
   *
   * Up to {@link ScreepsSocketConfig.maxRetries} connections will be attempted
   * with exponential backoff.
   * @throws {@link node!Error | Error} if the maximum number of retry attempts is exceeded.
   *  The same error instance will also be fired as an {@link ScreepsSocketClient.ERROR}
   *  event payload.
   */
  async reconnect() {
    // Don't allow multiple concurrent reconnect attempts
    if (this.reconnecting) return
    this.__reconnecting = true

    let retries = 0
    let retry = true
    while (retry && retries < this.http.appConfig.wsReconnectMaxRetries) {
      // Wait before each attempt with exponential backoff
      const time = Math.min(
        Math.pow(2, retries) * this.http.appConfig.wsReconnectInitDelay,
        this.http.appConfig.wsReconnectMaxDelay
      )
      await setTimeout(time)

      // Abort if reset() was triggered in-between attempts
      if (!this.reconnecting) return

      try {
        await this.connect()
        retry = false
      } catch {
        retry = true
      }
      retries++
      debug(`reconnect ${retries}/${this.http.appConfig.wsReconnectMaxRetries} success=${!retry}`)
    }

    // Reconnect attempt succeeded
    if (!retry) {
      // Resume existing subscriptions on the new socket
      Object.keys(this.__subs).forEach(sub => void this.subscribe(sub))
    }

    const err = new Error(`Reconnection failed after ${this.http.appConfig.wsReconnectMaxRetries} retries`)
    this.__reconnecting = false
    debug('reconnect failed')
    this.emit(ScreepsSocketClient.ERROR, err)
    throw err
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
    this.emit(ScreepsSocketClient.DISCONNECTED)
  }

  /**
   * Subscribe to {@link MapVisualEvent}s
   * @param shardName The name of the shard to use (ignored by unofficial servers).
   *  Defaults to {@link ScreepsClientConfig.defaultShard} if undefined.
   * @param cb The callback to trigger when a relevant message is received.
   * @throws {@link node!Error | Error} if shard and {@link ScreepsClientConfig.defaultShard} are undefined
   *  while using an official server
   * @see {@link unSubscribeMapVisual}
   */
  async subscribeMapVisual(shardName?: string, cb?: (event: MapVisualEvent) => void) {
    return this.subscribe(await this.mapVisualEventSpec(shardName), cb)
  }

  /**
   * Unsuubscribe from {@link MapVisualEvent}s
   * @param shardName The name of the shard to use (ignored by unofficial servers).
   *  Defaults to {@link ScreepsClientConfig.defaultShard} if undefined.
   * @param cb The callback to unregister
   * @throws {@link node!Error | Error} if shard and {@link ScreepsClientConfig.defaultShard} are undefined
   *  while using an official server
   * @see {@link subscribeMapVisual}
   */
  async unSubscribeMapVisual(shardName?: string, cb?: (event: MapVisualEvent) => void) {
    return this.unsubscribe(await this.mapVisualEventSpec(shardName), cb)
  }

  protected async mapVisualEventSpec(shardName?: string): Promise<string> {
    const userId = (await this.http.me())._id

    if (this.http.isOfficialServer) {
      shardName ??= this.http.appConfig.defaultShard
      if (!shardName) throw new Error('shardName must be defined')
      return `mapVisual:${userId}/${shardName}`
    }

    return `mapVisual:${userId}`
  }

  /**
   * Subscribe to {@link RoomEvent}s
   * @param roomName The name of the room
   * @param shardName The name of the shard to use (ignored by unofficial servers).
   *  Defaults to {@link ScreepsClientConfig.defaultShard} if undefined.
   * @param cb The callback to trigger when a relevant message is received.
   * @throws {@link node!Error | Error} if shard and {@link ScreepsClientConfig.defaultShard} are undefined
   *  while using an official server
   * @see {@link unsubscribeRoom}
   */
  async subscribeRoom(
    roomName: string,
    shardName?: string,
    cb?: (event: RoomEvent) => void
  ) {
    return this.subscribe(this.roomEventSpec('room', roomName, shardName), cb)
  }

  /**
   * Unsubscribe from {@link RoomEvent}s
   * @param roomName The name of the room
   * @param shardName The name of the shard to use (ignored by unofficial servers).
   *  Defaults to {@link ScreepsClientConfig.defaultShard} if undefined.
   * @param cb The callback to unregister
   * @throws {@link node!Error | Error} if shard and {@link ScreepsClientConfig.defaultShard} are undefined
   *  while using an official server
   * @see {@link subscribeRoom}
   */
  async unsubscribeRoom(
    roomName: string,
    shardName?: string,
    cb?: (event: RoomEvent) => void
  ) {
    return this.unsubscribe(this.roomEventSpec('room', roomName, shardName), cb)
  }

  /**
   * Subscribe to {@link RoomMap2Event}s
   * @param roomName The name of the room
   * @param shardName The name of the shard to use (ignored by unofficial servers).
   *  Defaults to {@link ScreepsClientConfig.defaultShard} if undefined.
   * @param cb The callback to trigger when a relevant message is received.
   * @throws {@link node!Error | Error} if shard and {@link ScreepsClientConfig.defaultShard} are undefined
   *  while using an official server
   * @see {@link unsubscribeRoomMap2}
   */
  async subscribeRoomMap2(
    roomName: string,
    shardName?: string,
    cb?: (event: RoomMap2Event) => void
  ) {
    return this.subscribe(this.roomEventSpec('roomMap2', roomName, shardName), cb)
  }

  /**
   * Unsubscribe from {@link RoomMap2Event}s
   * @param roomName The name of the room
   * @param shardName The name of the shard to use (ignored by unofficial servers).
   *  Defaults to {@link ScreepsClientConfig.defaultShard} if undefined.
   * @param cb The callback to unregister
   * @throws {@link node!Error | Error} if shard and {@link ScreepsClientConfig.defaultShard} are undefined
   *  while using an official server
   * @see {@link subscribeRoomMap2}
   */
  async unsubscribeRoomMap2(
    roomName: string,
    shardName?: string,
    cb?: (event: RoomMap2Event) => void
  ) {
    return this.unsubscribe(this.roomEventSpec('roomMap2', roomName, shardName), cb)
  }

  protected roomEventSpec(
    eventType: string,
    roomName: string,
    shardName?: string
  ): string {
    if (this.http.isOfficialServer) {
      shardName ??= this.http.appConfig.defaultShard
      if (!shardName) throw new Error('shardName must be defined')
      return `${eventType}:${shardName}/${roomName}`
    }

    return `${eventType}:${roomName}`
  }

  /**
   * Subscribe to {@link UserCodeEvent}s
   * @param cb The callback to trigger when a relevant message is received.
   * @see {@link unsubscribeUserCode}
   */
  async subscribeUserCode(cb?: (event: UserCodeEvent) => void) {
    return this.subscribe('code', cb)
  }

  /**
   * Unsubscribe from {@link UserCodeEvent}s
   * @param cb The callback to unregister
   * @see {@link subscribeUserCode}
   */
  async unsubscribeUserCode(cb?: (event: UserCodeEvent) => void) {
    return this.unsubscribe('code', cb)
  }

  /**
   * Subscribe to {@link UserConsoleEvent}s
   * @param cb The callback to trigger when a relevant message is received.
   * @see {@link unsubscribeUserConsole}
   */
  async subscribeUserConsole(cb?: (event: UserConsoleEvent) => void) {
    return this.subscribe('console', cb)
  }

  /**
   * Unsubscribe from {@link UserConsoleEvent}s
   * @param cb The callback to unregister
   * @see {@link subscribeUserConsole}
   */
  async unsubscribeUserConsole(cb?: (event: UserConsoleEvent) => void) {
    return this.unsubscribe('console', cb)
  }

  /**
   * Subscribe to {@link UserCpuEvent}s
   * @param cb The callback to trigger when a relevant message is received.
   * @see {@link unsubscribeUserCpu}
   */
  async subscribeUserCpu(cb?: (event: UserCpuEvent) => void) {
    return this.subscribe('cpu', cb)
  }

  /**
   * Unsubscribe from {@link UserCpuEvent}s
   * @param cb The callback to unregister
   * @see {@link subscribeUserCpu}
   */
  async unsubscribeUserCpu(cb?: (event: UserCpuEvent) => void) {
    return this.unsubscribe('cpu', cb)
  }

  /**
   * Subscribe to {@link UserResourceEvent}s
   * @param cb The callback to trigger when a relevant message is received.
   * @see {@link unsubscribeUserResource}
   */
  async subscribeUserResource(cb?: (event: UserResourceEvent) => void) {
    return this.subscribe('resource', cb)
  }

  /**
   * Unsubscribe from {@link UserResourceEvent}s
   * @param cb The callback to unregister
   * @see {@link subscribeUserResource}
   */
  async unsubscribeUserResource(cb?: (event: UserResourceEvent) => void) {
    return this.unsubscribe('resource', cb)
  }

  /**
   * Subscribe to {@link UserMemoryEvent}s for a particular memory path
   * @param memoryPath The Memory path, as it would be formatted for {@link ScreepsHttpClient.userMemory.get}
   * @param shardName The name of the shard to use (ignored by unofficial servers).
   *  Defaults to {@link ScreepsClientConfig.defaultShard} if undefined.
   * @param cb The callback to trigger when a relevant message is received.
   * @throws {@link node!Error | Error} if shard and {@link ScreepsClientConfig.defaultShard} are undefined
   *  while using an official server
   * @see {@link unsubscribeUserMemory}
   */
  async subscribeUserMemory(memoryPath: string, shardName?: string, cb?: (event: UserMemoryEvent) => void) {
    if (this.http.isOfficialServer) {
      shardName ??= this.http.appConfig.defaultShard
      if (!shardName) throw new Error('shardName must be defined')
      memoryPath = `${shardName}/${memoryPath}`
    }
    return this.subscribe(this.userMemoryEventSpec(memoryPath, shardName), cb)
  }

  /**
   * Unsubscribe from {@link UserMemoryEvent}s for a particular memory path
   * @param memoryPath The Memory path, as it would be formatted for {@link ScreepsHttpClient.userMemory.get}
   * @param shardName The name of the shard to use (ignored by unofficial servers).
   *  Defaults to {@link ScreepsClientConfig.defaultShard} if undefined.
   * @param cb The callback to unregister
   * @throws {@link node!Error | Error} if shard and {@link ScreepsClientConfig.defaultShard} are undefined
   *  while using an official server
   * @see {@link subscribeUserMemory}
   */
  async unsubscribeUserMemory(memoryPath: string, shardName?: string, cb?: (event: UserMemoryEvent) => void) {
    return this.unsubscribe(this.userMemoryEventSpec(memoryPath, shardName), cb)
  }

  protected userMemoryEventSpec(
    memoryPath: string,
    shardName?: string
  ): string {
    if (this.http.isOfficialServer) {
      shardName ??= this.http.appConfig.defaultShard
      if (!shardName) throw new Error('shardName must be defined')
      memoryPath = `${shardName}/${memoryPath}`
    }

    return `memory/${memoryPath}`
  }

  /**
   * Subscribe to an event type.
   *
   * If not authenticated, the subscribe message will be queued to be sent
   * once authentication is completed.
   *
   * Use of one of the more specific `subscribe___()` methods is recommended
   * to enforce better type checking on `cb`.
   * @param eventSpec The name of the event (ex: `console`, `room:${roomName}`).
   *  Non-colon-delimited strings will be prefixed with `user:${yourUserId}/`.
   * @param cb The callback to trigger when a relevant message is received.
   *
   *  This argument is ignored if `cb` is already registered as a listener for
   *  this event, unless `force` is set to true. For this reason, registering
   *  a callback via `subscribe()` is recommended over registering it separately
   *  via {@link on}.
   *
   *  This can be left undefined to resubscribe to an event using a
   *  previously-registered callback.
   * @param force See `cb` param documentation
   * @see {@link unsubscribe} to unsubscribe from events
   */
  async subscribe<E extends SocketEvent>(
    eventSpec: string,
    cb?: (event: E) => void,
    force = false
  ) {
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

    this.emit(ScreepsSocketClient.SUBSCRIBE, eventSpec)
    this.__subs[eventSpec] ||= 0
    this.__subs[eventSpec]++
    if (cb && (force || !this.listeners(eventSpec).includes(cb))) {
      this.on(eventSpec, cb)
    }
  }

  /**
   * Unsubscribe from an event type.
   *
   * If not authenticated, the unsubscribe message will be queued to be sent
   * once authentication is completed.
   *
   * Use of one of the more specific `unsubscribe___()` methods is recommended
   * to enforce better type checking on `cb`.
   * @param eventSpec The type of event to unsubscribe from (ex: 'console', 'room:ROOM_NAME').
   *  Non-colon-delimited strings will be prefixed with `user:${yourUserId}/`.
   * @param cb The callback to unregister.
   * @see {@link unsubscribe} to subscribe to events
   */
  async unsubscribe<E extends SocketEvent>(eventSpec: string, cb?: (event: E) => void) {
    if (!eventSpec) {
      debug('unsubscribe() called with no event')
      return
    }
    eventSpec = await this.normalizeEvent(eventSpec)

    if (this.authed) {
      this.send(`unsubscribe ${eventSpec}`)
    } else {
      this.__subQueue.push(`unsubscribe ${eventSpec}`)
    }

    this.emit(ScreepsSocketClient.UNSUBSCRIBE, eventSpec)
    if (+this.__subs[eventSpec] > 0) this.__subs[eventSpec]--
    if (!this.__subs[eventSpec]) delete this.__subs[eventSpec]
    if (cb) this.off(eventSpec, cb)
  }

  private async normalizeEvent(eventSpec: string): Promise<string> {
    // If event string looks like a fully-formed event type/ID spec, do nothing
    if (/^(\w+):(.+?)$/.exec(eventSpec)) {
      return eventSpec
    }

    // Otherwise, prepend user and user ID
    const userId = (await this.http.me())._id
    return `user:${userId}/${eventSpec}`
  }

  /**
   * Authenticate to the server. This is called automatically after a
   * connection is successfully established.
   * @param token The API token with which to authenticate
   */
  private async auth(token: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.send(`auth ${token}`)
      this.once(ScreepsSocketClient.AUTH, (event: ServerAuthEvent) => {
        const { data } = event
        if (data.status === ServerAuthStatuses.Ok) {
          this.__authed = true
          this.emit(ScreepsSocketClient.TOKEN, data.token)
          this.emit(ScreepsSocketClient.AUTHED)
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
   * Process an incoming message (normalize/inflate message data, etc),
   * then emit events to notify the relevant subscribers.
   * @param rawMsg The raw message content sent by the server
   */
  protected async handleMessage(rawMsg: WebSocket.Data | { data: string }) {
    // Decode buffers to UTF-8 strings
    const decodedMsg = ((rawMsg instanceof ArrayBuffer || rawMsg instanceof Buffer)
      ? this.decoder.decode(rawMsg)
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
      this.emit(ScreepsSocketClient.MESSAGE, event)
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
    this.emit(ScreepsSocketClient.MESSAGE, event)
  }

  private async inflate(data: string): Promise<unknown> {
    const buf = Buffer.from(data.slice(3), 'base64')
    const ret = await inflateAsync(buf)
    return JSON.parse(ret.toString())
  }
}
