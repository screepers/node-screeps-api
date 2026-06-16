import { IntershardResource } from '../common/resources'
import { UserCodeModules } from '../common/users'
import { SocketEvent } from './base'

/**
 * WebSocket event for code changes.
 *
 * When subscribed, the server sends an event with the full updated code base
 * every time the code is changed.
 * @category WebSocket API - User
 */
export interface UserCodeEvent extends SocketEvent {
  type: 'user'
  path: 'code'
  data: UserCodeEventData
}

/**
 * Payload of a {@link UserCodeEvent}
 * @example
 *  {
 *    "branch": "simulation",
 *    "modules": {
 *      "main": "module.exports.loop = function() { console.log('Hello, world!') }\n"
 *    },
 *    timestamp: 1500930041802,
 *    hash: 424324
 *  }
 * @category WebSocket API - User
 */
export interface UserCodeEventData extends SocketEvent {
  /** Name of the updated branch */
  branch: string
  /** The updated code */
  modules: UserCodeModules
  /** "Last modified" UNIX timestamp (in milliseconds) */
  timestamp: number
  /** A hash of the code base. The hashing algorithm is unknown. */
  hash: number
}

/**
 * WebSocket event for console output.
 *
 * When subscribed, the server sends one event per tick with console logs,
 * return values of commands, etc.
 * @category WebSocket API - User
 */
export interface UserConsoleEvent extends SocketEvent {
  type: 'user'
  path: 'console'
  data: UserConsoleEventData
}

/**
 * Payload of a {@link UserConsoleEvent}
 * @example
 *  // After calling `api.userConsole('Game.time')` on an unofficial server:
 *  {
 *    messages: {
 *      log: [],
 *      results: ["16746996"]
 *    }
 *  }
 * @example
 *  // After bot emits logs on shard2 of an official server:
 *  {
 *    messages: {
 *      log: [
 *        "I: Hello, world!",
 *        "E: Oh noes, an error occurred!"
 *      ],
 *      results: []
 *    }
 *    shard: "shard2"
 *  }
 * @category WebSocket API - User
 */
export interface UserConsoleEventData {
  /**
   * Console messages/results from the previous tick.
   * Undefined if no output was produced.
   */
  messages?: UserConsoleMessages
  error?: string
  /** The shard name (undefined on unofficial servers) */
  shard?: string
}

/**
 * Part of {@link UserConsoleEventData}
 * @category WebSocket API - User
 */
export interface UserConsoleMessages {
  /** Messages logged via `console.log()` */
  log: string[]
  /**
   * Results of console expressions sent via
   * {@link ScreepsHttpClient.userConsole}
   */
  results: string[]
}

/**
 * WebSocket event for CPU/memory usage updates.
 *
 * When subscribed, the server sends one event per tick (per shard?)
 * @category WebSocket API - User
 */
export interface UserCpuEvent extends SocketEvent {
  type: 'user'
  path: 'cpu'
  data: UserCpuEventData
}

/**
 * Payload of a {@link UserCpuEvent}
 * @example
 *  {
 *    cpu: 32,
 *    memory: 126435
 *  }
 * @category WebSocket API - User
 */
export interface UserCpuEventData {
  /** CPU used last tick (integer value) */
  cpu: number
  /** Current memory usage (in bytes) */
  memory: number
}

/**
 * WebSocket event for updates to account-bound resources.
 *
 * When subscribed, the server will send an event whenever a resource amount
 * is updated.
 * @category WebSocket API - User
 */
export interface UserResourceEvent extends SocketEvent {
  type: 'user'
  path: 'resources'
  data: UserResourceEventData
}

/**
 * Payload of a {@link UserResourceEvent}
 * @example
 *  { credits: 0 }
 * @category WebSocket API - User
 */
export type UserResourceEventData = {
  [resType in ResourceEventConstant]: number | undefined
}

/**
 * A resource type that can be included in {@link UserResourceEventData}
 * @category WebSocket API - User
 */
export type ResourceEventConstant = IntershardResource | 'credits'

/**
 * WebSocket event for updates to
 * {@link https://docs.screeps.com/global-objects.html#Memory-object | Memory}
 * @example
 *  // Parsed JSON:
 *  [
 *    "user:670e0c607317e200125d3aa2/memory/shardSeason/creeps.Scout-80965",
 *    "undefined"
 *  ]
 * @category WebSocket API - User
 */
export interface UserMemoryEvent extends SocketEvent {
  type: 'user'
  /** `memory/${shardName}/${memoryPath}` */
  path: string
  /**
   * The contents of the Memory path as a JSON string.
   *
   * If path is undefined, this will be set to `"undefined"`
   */
  data: string
}
