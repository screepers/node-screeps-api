import assert from 'assert/strict'
import * as _ from 'lodash'
import { createAuthedClient, createOfficialClient, skipIfIntegrationServerUnreachable } from './helpers.js'

describe('api.raw.game', function () {
  this.slow(2000)
  this.timeout(5000)

  describe('.gameShardsInfo()', function () {
    it('should send a request to /api/shards/info and return shard information', async function () {
      const api = createOfficialClient()
      const res = await api.gameShardsInfo()
      assert.equal(res.ok, 1, 'incorrect server response: ok should be 1')
      assert(_.has(res, 'shards'), 'response has no shards field')
      res.shards.forEach((shard, idx) => {
        assert(_.has(shard, 'name'), `shard ${idx} has no name field`)
        assert(_.has(shard, 'rooms'), `shard ${idx} has no rooms field`)
        assert(_.has(shard, 'users'), `shard ${idx} has no users field`)
        assert(_.has(shard, 'tick'), `shard ${idx} has no tick field`)
      })
    })
  })

  describe('authenticated', function () {
    before(skipIfIntegrationServerUnreachable)

    describe('.gamePlaceSpawn(room, x, y)', function () {
      it('should return { error: \'invalid params\' } if x or y are out of range', async function () {
        const api = await createAuthedClient()
        const res = await api.gamePlaceSpawn('W1N1', -1, 0)
        assert.equal('error' in res ? res.error : undefined, 'invalid params', 'incorrect server response')
      })

      it('should return { error: \'invalid params\' } if name is longer than 50 characters', async function () {
        const api = await createAuthedClient()
        const res = await api.gamePlaceSpawn('W1N1', 25, 25, 'x'.repeat(51))
        assert.equal('error' in res ? res.error : undefined, 'invalid params', 'incorrect server response')
      })
    })

    describe('.gameCreateInvader(room, x, y, size, type)', function () {
      it('should return { error: \'not owned\' } if the room is not claimed by the user', async function () {
        const api = await createAuthedClient()
        const res = await api.gameCreateInvader('W1N1', 1, 1, 'small', 'Melee')
        assert.equal('error' in res ? res.error : undefined, 'not owned', 'incorrect server response')
      })
    })

    describe('.gameRemoveInvader(_id)', function () {
      it('should return { error: \'invalid object\' } if the invader does not exist', async function () {
        const api = await createAuthedClient()
        const res = await api.gameRemoveInvader('000000000000000000000000')
        assert.equal('error' in res ? res.error : undefined, 'invalid object', 'incorrect server response')
      })
    })
  })
})
