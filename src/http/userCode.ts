import { UserCodeModules } from '../common/users'
import { ScreepsResponse } from './base'

/**
 * Used with HTTP API endpoints on the `/api/user/code` path
 * @module
 */

/**
 * `GET /api/user/code` response
 * @see {@link ScreepsHttpClient.userCodeGet}
 */
export interface UserCodeGetResponse extends ScreepsResponse, UserCodeSetRequest {}

/**
 * `POST /api/user/code` response
 * @see {@link ScreepsHttpClient.userCodeSet}
 */
export interface UserCodeSetRequest {
  /**
   * The name of the branch
   * @see {@link ScreepsHttpClient.userBranches} to list available branches
   */
  branch: string
  /** JavaScript code and WASM binaries keyed by module name */
  modules: UserCodeModules
}
