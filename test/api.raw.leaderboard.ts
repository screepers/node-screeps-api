import assert from 'assert/strict'
import * as _ from 'lodash-es'
import { createOfficialClient } from './helpers.js'

describe('api.raw.leaderboard', function () {
  this.slow(2000)
  this.timeout(5000)

  describe('.leaderboardList ()', function () {
    it('should call /api/leaderboard/list endpoint and return leaderboard inforamtion', async function () {
      const api = createOfficialClient()
      const res = await api.leaderboardList()
      assert.equal(res.ok, 1, 'incorrect server response: ok should be 1')
      assert(_.has(res, 'list'), 'server response should have a list field')
      assert(_.has(res, 'count'), 'server response should have a count field')
      assert(_.has(res, 'users'), 'server response should have a users field')
      if (api.isOfficialServer) {
        assert(_.size(res.list) > 0, 'leaderboard list is empty')
        assert(_.size(res.users) > 0, 'leaderboard users is empty')
        assert(res.count > 0, 'leaderboard count equals 0 (or maybe is negative)')
      }
    })
    it('should return leaderboard data based on world or power stats', async function () {
      const api = createOfficialClient()
      const res1 = await api.leaderboardList(10, 'world')
      const res2 = await api.leaderboardList(10, 'power')
      if (api.isOfficialServer) {
        assert.notEqual(_.first(res1.list), _.first(res2.list), 'same player shouldn\'t be #1')
      }
    })
    it('should return paginated data', async function () {
      const api = createOfficialClient()
      const res1 = await api.leaderboardList(5, 'world')
      const res2 = await api.leaderboardList(10, 'world')
      const res3 = await api.leaderboardList(10, 'world', 9)
      if (api.isOfficialServer) {
        assert.equal(_.size(res1.list), 5, 'requested top 5 and got a shorter or longer list')
        assert.equal(_.size(res2.list), 10, 'requested top 10 and got a shorter or longer list')
        assert.notEqual(_.first(res1.list)?.user, _.first(res3.list)?.user, 'offset is not working')
        assert.equal(_.first(res1.list)?.user, _.first(res2.list)?.user, 'player #1 is incoherent')
        assert.equal(_.last(res2.list)?.user, _.first(res3.list)?.user, 'player #9 is incoherent')
      }
    })
  })

  describe('.leaderboardFind (username, mode = \'world\', season = \'\')', function () {
    it('should do untested things (for now)')
  })

  describe('.leaderboardSeasons ()', function () {
    it('should do untested things (for now)')
  })
})
