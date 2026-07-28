import assert from 'assert/strict'
import * as _ from 'lodash'
import { ScreepsApiError } from 'screeps-api'
import { auth } from './credentials.js'
import { createAnonymousClient, createAuthedClient, skipIfIntegrationServerUnreachable } from './helpers.js'

describe('api.auth', function () {
  this.slow(2000)
  this.timeout(5000)

  before(skipIfIntegrationServerUnreachable)

  describe('.authSignin(email, password)', function () {
    it('should send a POST request to /api/auth/signin and authenticate', async function () {
      const api = createAnonymousClient()
      const res = await api.authSignin(auth.username!, auth.password!)
      assert(_.has(res, 'token'), 'no token found in server answer')
      assert.equal(res.ok, 1, 'res.ok is incorrect')
    })
    it('should reject promise if unauthorized', async function () {
      const api = createAnonymousClient()
      await assert.rejects(
        () => api.authSignin(auth.username!, 'invalid_password'),
        (err: ScreepsApiError) => !!(err.message.match(/Not authorized/i) ?? err.message.match(/401/i)),
        'wrong error message'
      )
    })
  })

  describe('.authMe()', function () {
    it('should return user informations from `/api/auth/me` endpoint', async function () {
      const api = await createAuthedClient()
      const res = await api.authMe()
      assert(_.has(res, 'email'), 'response has no email field')
      assert(_.has(res, 'badge'), 'response has no badge field')
      assert(_.has(res, 'username'), 'response has no username field')
    })
  })
})
