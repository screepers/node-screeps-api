import { ScreepsResponse } from './base'

/**
 * Used with HTTP API endpoints on the `/api/servers` path
 * @module
 */

/**
 * `POST /api/servers/list` response: a curated list of community-run servers
 * @see {@link ScreepsHttpClient.serversList}
 */
export interface ServerListResponse extends ScreepsResponse {
  servers: Server[]
}

/** A server from {@link ServerListResponse} */
export interface Server {
  _id: string
  settings: {
    host: string
    port: string
    pass: string
  }
  name: string
  /** Usually 'active' */
  status: string
  likeCount: number
}
