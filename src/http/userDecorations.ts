import * as Decorations from '../common/decorations'
import { ScreepsResponse } from './base'

/**
 * Used with HTTP API endpoints on the `/api/user/decorations` path
 * @module
 */

/**
 * `GET /api/user/decorations/inventory` response
 * @see {@link ScreepsHttpClient.userDecorationsInventory}
 */
export interface UserDecorationInventoryResponse extends ScreepsResponse {
  list: Decorations.DecorationInstance[]
}

/**
 * `GET /api/user/decorations/themes` response
 * @see {@link ScreepsHttpClient.userDecorationsThemes}
 */
export interface UserDecorationThemesResponse extends ScreepsResponse {
  list: {
    _id: string
    /** Web color format */
    color: string
    name: string
    /** ISO 8601 timestamp */
    createdAt: string
    /** ISO 8601 timestamp */
    updatedAt: string
    /** Appears to always be 0 */
    __v: number
  }[]
}
