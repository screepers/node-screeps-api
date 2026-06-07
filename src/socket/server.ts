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

export enum ServerAuthStatus {
  OK = 'ok',
  FAILED = 'failed'
}
