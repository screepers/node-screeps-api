import { RoomObject } from '../common/rooms'

/**
 * Parsed version of a message received from the server via the WebSocket API.
 *
 * Unless you are writing code that genuinely should be able to process any
 * Screeps WebSocket API event, this type should not be used directly.
 * Instead, extend the interface and define stricter types for these fields.
 * If you do create a sub-interface, please consider submitting a PR.
 * @category WebSocket API
 */
export interface SocketEvent {
  type: string
  /**
   * ID of the entity the event is reporting on. Undefined when {@link type} is `server`.
   *
   * Examples:
   * - User ID for `user` events
   * - Room name (`shard0/W0N0`, `W0N0`, etc) for `room` events
   */
  id?: string
  /**
   * When non-empty, indicates that the event concerns a property or aspect
   * of {@link type}.
   *
   * Examples:
   * - `/resources` for `user`-type events indicates an update to resource counts
   */
  path: string
  /**
   * The event payload. Extensions of this interface should specify a more precise type.
   */
  data: unknown
}

/**
 * WebSocket event for {@link RoomObject | room objects} and other room
 * state updates.
 *
 * When subscribed, the server will send one event per subscribed room
 * per tick with updated {@link RoomEventData}.
 * @example Raw sample events:
 * ["room:shardSeason/E15N8",{"objects":{"6a1c36afd05a7c237d18c9ae":{"reservation":{"endTime":231807}},"6a1c36afd05a7c237d18c9af":{"energy":2240,"invaderHarvested":38070},"6a1c36afd05a7c237d18c9b0":{"energy":2656,"invaderHarvested":37854},"6a2906a5a367ccd541edc2be":{"store":{"energy":560}},"6a29075abc245f3e92ad02d9":{"store":{"energy":405}},"6a2940bf8e693b5fca2fac27":{"x":28,"y":42},"6a2941332784cf33c0d3f004":{"x":31,"y":44}},"gameTime":231346,"info":{"mode":"world"},"visual":""}]
 * @category WebSocket API
 */
export interface RoomEvent extends SocketEvent {
  type: 'room'
  /**
   * The name of the shard or the name of the room.
   *
   * On official servers, this is set to the shard name.
   * On unofficial servers, this is set to the room name.
   */
  id: string
  /**
   * The name of the room or an empty string
   *
   * On official servers, this is set to the room name.
   * On unofficial servers, this is an empty string.
   */
  path: string
  data: RoomEventData
}

/**
 * Payload of a {@link RoomEvent}
 * @category WebSocket API
 */
export interface RoomEventData {
  /** The current game time (in ticks) */
  gameTime: number
  /** The current game mode (usually `'world'`) */
  info: {
    mode: 'arena' | 'world'
  }
  /**
   * Room objects indexed by ID.
   *
   * **WARNING:** only the first event returns full room object properties.
   * Subsequent events only return the modified properties.
   */
  objects: { [_id: string]: RoomObject }
  /** {@link https://docs.screeps.com/api/#RoomVisual | RoomVisual} data */
  visual: string
}

/**
 * WebSocket event for updates to the map (appears to apply to the
 * original map, alpha map, and minimap in the room view).
 * @example Raw sample events:
 * ["roomMap2:shardSeason/E16N7",{"w":[],"r":[],"pb":[],"p":[],"s":[[11,36]],"c":[[43,37]],"m":[[30,29]],"k":[]}]
 * @category WebSocket API
 */
export interface RoomMap2Event extends SocketEvent {
  type: 'roomMap2'
  /**
   * The name of the shard or the name of the room.
   *
   * On official servers, this is set to the shard name.
   * On unofficial servers, this is set to the room name.
   */
  id: string
  /**
   * The name of the room or an empty string
   *
   * On official servers, this is set to the room name.
   * On unofficial servers, this is an empty string.
   */
  path: string
  data: RoomMap2EventData
}

/**
 * Payload of a {@link RoomMap2Event}
 * @category WebSocket API
 */
export interface RoomMap2EventData {
  /** Wall positions? */
  w: PositionTuple[]
  /** Road positions? */
  r: PositionTuple[]
  pb: PositionTuple[]
  p: PositionTuple[]
  /** Source positions? */
  s: PositionTuple[]
  /** Creep positions? */
  c: PositionTuple[]
  /** Mineral positions? */
  m: PositionTuple[]
  k: PositionTuple[]
  [userId: string]: PositionTuple[]
}

/**
 * An [X, Y] tuple representing a room position
 * @category WebSocket API
 */
export type PositionTuple = [x: number, y: number]

/**
 * WebSocket event for map visuals on the alpha version of the world map.
 *
 * When subscribed, the server will send one event per tick with the
 * map visuals generated on the previous tick.
 * @example Raw sample events:
 * ["mapVisual:670e0c607317e200125d3aa2/shardSeason",null]
 * @category WebSocket API
 */
export interface MapVisualEvent {
  type: 'mapVisual'
  /** The authenticated user's ID */
  id: string
  /** The shard name (or empty if running on an unofficial server) */
  path: string
  /** The output from {@link https://docs.screeps.com/api/#Game.map-visual.export | Game.map.visual.export()} */
  data: string | null
}
