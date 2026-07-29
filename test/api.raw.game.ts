import assert from 'assert/strict'
import * as _ from 'lodash'
import { createOfficialClient } from './helpers.js'

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
})
