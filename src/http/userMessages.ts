import { Users } from '../common/users'
import { ScreepsDbUpdateResult, ScreepsResponse } from './base'

/**
 * `GET /api/user/messages/list` response
 * @see {@link ScreepsHttpClient.userMessagesList}
 * @category HTTP API - User/Messages
 */
export interface UserMessagesListResponse extends ScreepsResponse {
  messages: {
    /** ID of the message */
    _id: string
    /** ISO 8601 timestamp */
    date: string
    /** incoming or outgoing */
    type: 'in' | 'out'
    /** Message body */
    text: string
    unread: boolean
  }[]
}

/**
 * A message result from {@link UserMessagesListResponse}
 * or {@link UserMessagesIndexResponse}
 * @category HTTP API - User/Messages
 */
export interface ListMessage {
  /** ID of the message */
  _id: string
  /** ISO 8601 timestamp */
  date: string
  /** incoming or outgoing */
  type: 'in' | 'out'
  /** Message body */
  text: string
  unread: boolean
}

/**
 * `GET /api/user/messages/index` response
 * @see {@link ScreepsHttpClient.userMessagesIndex}
 * @category HTTP API - User/Messages
 */
export interface UserMessagesIndexResponse extends ScreepsResponse {
  messages: {
    _id: string
    message: Message
  }[]
  users: Users
}

/**
 * A message result from {@link UserMessagesIndexResponse}
 * @category HTTP API - User/Messages
 */
export interface Message extends ListMessage {
  /** ID of the other user */
  respondent: string
  /** ID of the current user */
  user: string
  /** ID of ??? */
  outMessage: string
}

/**
 * `GET /api/user/messages/unread-count` response
 * @see {@link ScreepsHttpClient.userMessagesUnreadCount}
 * @category HTTP API - User/Messages
 */
export interface UserMessagesUnreadCountResponse extends ScreepsResponse {
  count: number
}

/**
 * `POST /api/user/messages/mark-read` response
 * @see {@link ScreepsHttpClient.userMessagesMarkRead}
 * @category HTTP API - User/Messages
 */
export interface UserMessagesMarkReadResponse extends ScreepsResponse {
  0: number
  1: number
  2: ScreepsDbUpdateResult
}
