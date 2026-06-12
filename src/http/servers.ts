import { ScreepsResponse } from './base'

/**
 * `POST /api/servers/list` response: a curated list of community-run servers
 * @see {@link ScreepsHttpClient.serversList}
 * @category HTTP API - Servers
 */
export interface ServerListResponse extends ScreepsResponse {
  servers: Server[]
}

/**
 * A server from {@link ServerListResponse}
 * @category HTTP API - Servers
 */
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
