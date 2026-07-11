import assert from 'assert/strict'
import * as _ from 'lodash-es'
import { createOfficialClient } from './helpers.js'

describe('api.raw', function () {
  this.slow(2000)
  this.timeout(5000)

  describe('.version()', function () {
    it('should call /api/version endpoint and return version information', async function () {
      const api = createOfficialClient()
      const res = await api.version()
      assert.equal(res.ok, 1, 'incorrect server response: ok should be 1')
      assert(_.has(res, 'protocol'), 'response has no protocol field')
      assert(_.has(res, 'serverData.historyChunkSize'), 'response has no serverData.historyChunkSize field')
      if (api.isOfficialServer) {
        assert(_.has(res, 'package'), 'response has no package field')
        assert(_.has(res, 'serverData.shards'), 'response has no serverData.shards field')
      }
    })
  })

  describe('.authmod()', function () {
    it('should return server name from /authmod for private servers with authmod', async function () {
      const api = createOfficialClient()
      const res = await api.authmod()
      if (api.isOfficialServer) {
        assert.equal(res.name, 'official', 'invalid name for official server')
      } else {
        assert.equal(res.ok, 1, 'incorrect server response: ok should be 1')
        assert(_.has(res, 'name'), 'server response should have a name field')
        assert(_.has(res, 'version'), 'server response should have a version field')
      }
    })
  })

  // This API is not implemented for private servers
  describe.skip('.history(room, tick)', function () {
    it('should return room history as a json file', async function () {
      const api = createOfficialClient()
      // Get current tick (as history is not kept forever)
      const res = await api.gameTime('shard1')
      let time = res.time - 1000 // history is not available right away
      // Make sure that time is not a multiple of 20 or 100
      time = (time % 20 === 0) ? time - 10 : time
      // Try to get history for W1N1
      const json = await api.history('W1N1', time, 'shard1')
      // Verify results
      assert(_.has(json, 'ticks'), 'result has no ticks field')
      assert(_.size(json.ticks) >= 20, 'results are incomplete ; official server usually returns 100 ticks and private servers should return at least 20 ticks')
      assert.equal(json.room, 'W1N1', 'result room is incorrect')
      assert(_.has(json, 'timestamp'), 'result has no timestamp field')
      assert(_.has(json, 'base'), 'result has no base field')
    })
  })
})
