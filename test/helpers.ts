import type { Context } from 'mocha'
import * as _ from 'lodash'
import { ScreepsHttpClient, ScreepsRawServerConfig } from 'screeps-api'
import { auth } from './credentials.js'

export const DUMMY_TOKEN = '00000000-0000-0000-0000-000000000000'

let integrationServerReachable: boolean | undefined

/** Build the integration server's base URL from raw connection fields. */
function integrationServerBaseUrl(
  config: ScreepsRawServerConfig
): URL {
  if (config.url) {
    return new URL(config.url.endsWith('/') ? config.url : `${config.url}/`)
  }

  const protocol = config.protocol ?? (config.secure !== false ? 'https' : 'http')
  const hostname = config.hostname ?? config.host ?? 'screeps.com'
  const pathname = config.pathname
    ?? config.path
    ?? (config.ptr ? '/ptr' : undefined)
    ?? (config.season ? '/season' : undefined)
    ?? '/'

  const origin = config.port === undefined || config.port === ''
    ? `${protocol}://${hostname}`
    : `${protocol}://${hostname}:${config.port}`

  const url = new URL(pathname, origin)
  if (!url.pathname.endsWith('/')) {
    url.pathname += '/'
  }
  return url
}

/** Server connection options without credentials. */
export function serverOpts(): ScreepsRawServerConfig {
  return _.omit(auth, ['username', 'password']) as ScreepsRawServerConfig
}

/** Create a client for endpoints that do not require valid authentication. */
export function createAnonymousClient(
  opts: Partial<ScreepsRawServerConfig> = {}
): ScreepsHttpClient {
  return new ScreepsHttpClient({
    ...serverOpts(),
    token: DUMMY_TOKEN,
    ...opts
  })
}

/** Create a client pointed at the official server (for unauthenticated endpoints). */
export function createOfficialClient(): ScreepsHttpClient {
  return createAnonymousClient({
    host: 'screeps.com',
    secure: true,
    port: 443
  })
}

/** Create a client with test server credentials. */
export function createClient(
  opts: Partial<ScreepsRawServerConfig> = {}
): ScreepsHttpClient {
  return new ScreepsHttpClient({ ...auth, ...opts })
}

/** Create a client and authenticate with the test account. */
export async function createAuthedClient(
  opts: Partial<ScreepsRawServerConfig> = {}
): Promise<ScreepsHttpClient> {
  const api = createClient(opts)
  await api.auth()
  return api
}

/** Skip the current test when the configured integration server is unreachable. */
export async function skipIfIntegrationServerUnreachable(this: Context): Promise<void> {
  this.timeout(5_000)
  if (integrationServerReachable === undefined) {
    const versionUrl = new URL('api/version', integrationServerBaseUrl(auth))

    try {
      const res = await fetch(versionUrl, {
        signal: AbortSignal.timeout(3_000)
      })
      integrationServerReachable = res.ok
      if (!integrationServerReachable) {
        const body = await res.text()
        console.error('[integration] server returned non-OK response', {
          url: versionUrl.href,
          status: res.status,
          body: body.slice(0, 200)
        })
      }
    } catch (err) {
      integrationServerReachable = false
      const error = err instanceof Error ? err : new Error(String(err))
      console.error('[integration] server probe failed', {
        url: versionUrl.href,
        error: error.message,
        cause: error.cause instanceof Error ? error.cause.message : error.cause
      })
    }
  }
  if (!integrationServerReachable) {
    this.skip()
  }
}

/** Apply setServer without triggering a live authentication attempt. */
export async function setServerConfig(
  api: ScreepsHttpClient,
  config: ScreepsRawServerConfig
): Promise<void> {
  await api.setServer({ token: DUMMY_TOKEN, ...config })
}
