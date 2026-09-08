import * as Decorations from '../common/decorations'
import { ScreepsResponse } from './base'

/**
 * `GET /api/user/decorations/inventory` response
 * @see {@link ScreepsHttpClient.userDecorationsInventory}
 * @category HTTP API - User/Decorations
 */
export interface UserDecorationInventoryResponse extends ScreepsResponse {
  list: Decorations.DecorationInstance[]
}

/**
 * A theme from {@link UserDecorationThemesResponse}.
 *
 * Official servers currently use these display names: Fire, Desert, Nature,
 * Sea, Winter, Alien, Mono. {@link ScreepsHttpClient.userDecorationsPixelize}
 * takes this theme's `_id`, not the name.
 * @see {@link ScreepsHttpClient.userDecorationsThemes}
 * @category HTTP API - User/Decorations
 */
export interface UserDecorationTheme {
  _id: string
  /** Web color format */
  color: string
  /** Display name (for example `'Fire'` or `'Desert'`) */
  name: string
  /** ISO 8601 timestamp */
  createdAt: string
  /** ISO 8601 timestamp */
  updatedAt: string
  /** If true, you can't pixelize decorations from this theme */
  restricted?: boolean
  /** If true, the official client omits this theme from inventory filters */
  hidden?: boolean
  /** Appears to always be 0 */
  __v: number
}

/**
 * `GET /api/user/decorations/themes` response
 * @see {@link ScreepsHttpClient.userDecorationsThemes}
 * @category HTTP API - User/Decorations
 */
export interface UserDecorationThemesResponse extends ScreepsResponse {
  list: UserDecorationTheme[]
}

/**
 * `POST /api/user/decorations/pixelize` response
 * @see {@link ScreepsHttpClient.userDecorationsPixelize}
 * @category HTTP API - User/Decorations
 */
export interface UserDecorationPixelizeResponse extends ScreepsResponse {
  decorations: Decorations.DecorationInstance[]
}
