import assert from 'assert/strict'
import * as _ from 'lodash-es'
import { ScreepsConfigManager, ScreepsHttpClient, ScreepsRawServerConfig } from 'screeps-api'
import {
  createAuthedClient,
  createClient,
  setServerConfig,
  skipIfIntegrationServerUnreachable
} from './helpers.js'

describe('ScreepsHttpClient', function () {
  this.slow(2000)
  this.timeout(5000)

  describe('.constructor()', function () {
    it('should save passed options', function () {
      const options: ScreepsRawServerConfig = {
        email: 'screeps@email.com',
        password: 'password',
        secure: true,
        host: 'screeps.com',
        port: 443,
        path: '/'
      }
      const api = new ScreepsHttpClient(options)
      assert.equal(api.server.url, 'https://screeps.com:443/')
      assert.equal(api.server.email, 'screeps@email.com')
      assert.equal(api.server.password, 'password')
    })
    it('should assign default options when needed', function () {
      const api = new ScreepsHttpClient({ token: 'test-token' })
      assert.equal(api.server.url, 'https://screeps.com/')
      assert.equal(api.server.token, 'test-token')
    })
  })

  describe('.me()', function () {
    before(skipIfIntegrationServerUnreachable)

    it('should return user informations from `/api/auth/me` endpoint', async function () {
      const api = await createAuthedClient()
      const infos = await api.me()
      assert(_.has(infos, 'email'), 'answer has no email field')
      assert(_.has(infos, 'badge'), 'answer has no badge field')
      assert(_.has(infos, 'username'), 'answer has no username field')
    })
  })

  describe('.mapToShard()', function () {
    it('should do things... but I\'m not sure what exactly...')
  })

  describe('.setServer()', function () {
    it('should normalize passed options', function () {
      const options: ScreepsRawServerConfig = {
        email: 'screeps@email.com',
        password: 'password',
        secure: true,
        host: 'screeps.com',
        port: 443,
        path: '/'
      }
      const server = new ScreepsConfigManager().normalizeServerConfig(options)
      assert.equal(server.url, 'https://screeps.com:443/')
      assert.equal(server.email, 'screeps@email.com')
      assert.equal(server.password, 'password')
    })
    it('should compute server.url if server.url wasn\'t provided', async function () {
      const options1: ScreepsRawServerConfig = {
        secure: false, host: 'screeps.com', port: 80
      }
      const options2: ScreepsRawServerConfig = {
        secure: true, host: 'screeps.com', port: 443, path: '/ptr/'
      }
      const options3: ScreepsRawServerConfig = {
        secure: true, host: 'screeps.com', port: 80, path: '/'
      }
      const api = createClient()
      await setServerConfig(api, options1)
      assert.equal(api.server.url, 'http://screeps.com:80/', 'invalid computed url')
      await setServerConfig(api, options2)
      assert.equal(api.server.url, 'https://screeps.com:443/ptr/', 'invalid computed url')
      await setServerConfig(api, options3)
      assert.equal(api.server.url, 'https://screeps.com:80/', 'invalid computed url')
    })
    it('should compute pathname if server.url wasn\'t provided', async function () {
      const api = createClient()
      await setServerConfig(api, { path: '/ptr/' })
      assert.equal(new URL(api.server.url).pathname, '/ptr/', 'pathname was not updated')
      await setServerConfig(api, { path: '/' })
      assert.equal(new URL(api.server.url).pathname, '/', 'pathname was not updated')
    })
  })

  describe('.auth()', function () {
    it('should save email and password', async function () {
      const api = new ScreepsHttpClient({
        host: 'screeps.com',
        email: 'screeps@email.com',
        password: 'invalid_password'
      })
      await api.auth().catch(() => { /* do nothing */ })
      assert.equal(api.server.email, 'screeps@email.com', 'invalid email option')
      assert.equal(api.server.password, 'invalid_password', 'invalid password option')
    })
    it('should update server config via setServer', async function () {
      const api = createClient()
      await setServerConfig(api, {
        protocol: 'https',
        hostname: 'screeps.com',
        port: 443
      })
      assert.equal(api.server.url, 'https://screeps.com:443/')
    })

    describe('integration', function () {
      before(skipIfIntegrationServerUnreachable)

      it('should authenticate and get token', async function () {
        let event = false
        const api = createClient()
        api.on(ScreepsHttpClient.TOKEN, () => { event = true })
        await api.auth()
        assert(event, 'token event was not emited')
        assert(api.token, 'token was not saved')
        // @ts-expect-error _authed is private
        assert.equal(api._authed, true, 'internal state has not changed (api._authed)')
      })
      it('should reject promise in case of error', async function () {
        const api = createClient({ password: 'bad password' })
        await assert.rejects(
          () => api.auth(),
          (err: Error) => !!(err.message.match(/Not authorized/i) ?? err.message.match(/401/i)),
          'wrong error message'
        )
      })
    })
  })

  describe('.req()', function () {
    it('should send request to game server and get the answer')
    it('can send GET and POST requests')
    it('should throw an error in case of 401 and if not authenticated')
    it('should read, save and emit authentication token if any')
    it('should use opts.path correctly (ie: for PTR)')
    it('should throw an error if response.ok !== 1')
  })

  describe('.gz()', function () {
    it('should unzip data and return JSON')
  })

  describe('.inflate()', function () {
    it('should inflate data')
  })
})
