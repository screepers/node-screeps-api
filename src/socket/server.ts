import { SocketEvent } from './base'

/**
 * WebSocket event for authentication responses.
 * @category WebSocket API - Server
 */
export interface ServerAuthEvent extends SocketEvent {
  type: 'server'
  id: undefined
  path: 'auth'
  data: ServerAuthEventData
}

/**
 * Payload of a {@link ServerAuthEvent}
 * @category WebSocket API - Server
 */
export interface ServerAuthEventData {
  status: ServerAuthStatus
  token: string
}

/**
 * Possible outcomes of a {@link ServerAuthEvent}.
 *
 * Contained in {@link ServerAuthEventData}.
 * @enum
 * @category WebSocket API - Server
 */
export const ServerAuthStatuses = {
  Ok: 'ok',
  Failed: 'failed'
} as const

/**
 * A {@link ServerAuthStatuses} value
 * @category WebSocket API - Server
 */
export type ServerAuthStatus = typeof ServerAuthStatuses[keyof typeof ServerAuthStatuses]
