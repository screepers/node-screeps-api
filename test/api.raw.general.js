const assert = require('assert');
const _ = require('lodash');
const { ScreepsAPI } = require('../');
const auth = require('../credentials')

describe('api.raw', function() {

  this.slow(2000);

  describe('.version()', function() {
    it('should call /api/version endpoint and return version information', async function() {
      let opts = _.omit(auth, ['email', 'password'])
      let api = new ScreepsAPI(opts)
      let res = await api.raw.version()
      assert.equal(res.ok, 1, 'incorrect server response: ok should be 1')
      assert(_.has(res, 'protocol'), 'response has no protocol field')
      assert(_.has(res, 'serverData.historyChunkSize'), 'response has no serverData.historyChunkSize field')
      if (api.opts.hostname === 'screeps.com') {
        assert(_.has(res, 'package'), 'response has no package field')
        assert(_.has(res, 'serverData.shards'), 'response has no serverData.shards field')
      }
    })
  })

  describe('.authmod()', function() {
    it('should return server name from /authmod for private servers with authmod', async function() {
      let opts = _.omit(auth, ['email', 'password'])
      let api = new ScreepsAPI(opts)
      let res = await api.raw.authmod()
      if (api.opts.hostname === 'screeps.com') {
        assert.equal(res.name, 'official', 'invalid name for official server')
      } else {
        assert.equal(res.ok, 1, 'incorrect server response: ok should be 1')
        assert(_.has(res, 'name'), 'server response should have a name field')
        assert(_.has(res, 'version'), 'server response should have a version field')
      }
    })
  })

  // This API is broken in node-screeps-api
  describe.skip('.history(room, tick)', function() {
    it('should return room history as a json file', async function() {
      let opts = _.omit(auth, ['email', 'password'])
      let api = new ScreepsAPI(opts)
      await api.auth(auth.email, auth.password)
      let res = await api.raw.history('W1N1',  858839)
      console.log(res)
    })
  })

})
