/**
 * Defines types/constants/enums/etc related to users and their accounts
 * @module
 */

/** High-level metadata for an individual user */
export interface User {
  _id: string
  username: string
  badge: UserBadge
}

/** A collection of user metadata keyed by user ID */
export interface Users { [userId: string]: User }

/**
 * Parameters used to render a player's SVG icon / logo / "bust"
 * (as it is referenced in the client)
 */
export interface UserBadge {
  /** Primary badge color (in a web color format) */
  color1: string
  /** Second badge color (in a web color format) */
  color2: string
  /** Tertiary badge color (in a web color format) */
  color3: string
  flip: boolean
  param: number
  /**
   * The badge image template.
   *
   * If this is a numeric value (0-30), it is the ID number of a standard/free badge.
   * If it is {@link UserBadgeSvgs}, it is a premium badge that was obtained via
   * the {@link Decoration} system
   */
  type: number | UserBadgeSvgs
  /** Decoration ID of the badge if this is not a standard one */
  decoration?: string
}

/**
 * A pair of SVG paths composing a premium {@link UserBadge}
 * @see {BadgeDecoration}
 */
export interface UserBadgeSvgs {
  path1: string
  path2: string
}

/** A collection of JavaScript/WASM modules */
export interface UserCodeModules {
  /** JavaScript code or WASM binaries keyed by module name. */
  [moduleName: string]: UserCodeModule
}

/**
 * Contents of a single module.
 *
 * If the value is a string, the module is JavaScript code.
 * If the value has a `binary` property, the module is a {@link UserCodeWasmModule}.
 * @see {@link UserCodeModules}
 */
export type UserCodeModule = string | UserCodeWasmModule

/** Binary contents of a WebAssembly (WASM) module */
export interface UserCodeWasmModule {
  binary: string
}

/**
 * A user's CPU limits for each shard indexed by name.
 *
 * `undefined` is equivalent to 0.
 */
export interface CpuShardLimits { [shardName: string]: number | undefined }

/** ID of the "{@link https://docs.screeps.com/invaders.html | Invader}" NPC */
export const INVADER_ID = '2'

/** ID of the "Source Keeper" NPC */
export const SOURCE_KEEPER_ID = '3'
