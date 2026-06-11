import { SocketEvent } from './base'

/**
 * Defines types/constants/enums/etc for `server` {@link SocketEvent}s
 * @module
 */

/** WebSocket event for authentication responses. */
export interface ServerAuthEvent extends SocketEvent {
  type: 'server'
  id: undefined
  path: 'auth'
  data: ServerAuthEventData
}

/** Payload of a {@link ServerAuthEvent} */
export interface ServerAuthEventData {
  status: ServerAuthStatus
  token: string
}

/**
 * Possible outcomes of a {@link ServerAuthEvent}.
 *
 * Contained in {@link ServerAuthEventData}.
 * @enum
 */
export const ServerAuthStatuses = {
  Ok: 'ok',
  Failed: 'failed'
} as const

/** A {@link ServerAuthStatuses} value */
export type ServerAuthStatus = typeof ServerAuthStatuses[keyof typeof ServerAuthStatuses]
