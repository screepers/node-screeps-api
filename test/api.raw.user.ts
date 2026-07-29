import assert from 'assert/strict'
import * as _ from 'lodash'
import { createAuthedClient, skipIfIntegrationServerUnreachable } from './helpers.js'

describe('api.raw.user', function () {
  this.slow(3000)
  this.timeout(5000)

  before(skipIfIntegrationServerUnreachable)

  describe('.userBadge(badge)', function () {
    it('should send a request to /api/user/badge which sets user badge', async function () {
      const api = await createAuthedClient()
      // Save previous badge
      const me = await api.authMe()
      const initialBadge = me.badge
      assert(initialBadge, 'user has no badge to restore')
      // Set new badge
      const newBadge = { type: 16, color1: '#000000', color2: '#000000', color3: '#000000', param: 100, flip: false }
      const badgeRes = await api.userBadge(newBadge)
      assert.equal(badgeRes.ok, 1, 'incorrect server response: ok should be 1')
      // Check that badge was effectively changed
      const updated = await api.authMe()
      _.each(updated.badge, (value, key) => {
        assert.equal(value, newBadge[key as keyof typeof newBadge], `badge ${key} is incorrect`)
      })
      // Reset badge
      await api.userBadge(initialBadge)
    })
  })

  describe('.userBranches()', function () {
    it('should send a request to /api/user/branches and return branches list', async function () {
      const api = await createAuthedClient()
      const res = await api.userBranches()
      assert.equal(res.ok, 1, 'incorrect server response: ok should be 1')
      assert(res.list.length > 0, 'no branch found')
    })
  })

  describe('.userCloneBranch(branch, newName, defaultModules)', function () {
    it('should send a request to /api/user/clone-branch in order to clone @branch into @newName', async function () {
      const api = await createAuthedClient()
      // Create a new branch
      const cloneRes = await api.userCloneBranch('default', 'screeps-api-testing', undefined)
      assert.equal(cloneRes.ok, 1, 'incorrect server response: ok should be 1')
      // Check if branch was indeed created
      const branches = await api.userBranches()
      const found = _.find(branches.list, { branch: 'screeps-api-testing' })
      assert(found != null, 'branch was not cloned')
    })
  })

  describe('.userSetActiveBranch(branch, activeName)', function () {
    it('should send a request to /api/user/set-active-branch in order to define @branch as active', async function () {
      const api = await createAuthedClient()
      // Find current active branch for simulator
      const initialBranches = await api.userBranches()
      const initialBranch = _.find(initialBranches.list, { activeSim: true })
      assert(initialBranch != null, 'cannot find current active branch for simulator')
      // Change active branch for simulator
      const setRes = await api.userSetActiveBranch('screeps-api-testing', 'activeSim')
      assert.equal(setRes.ok, 1, 'incorrect server response: ok should be 1')
      // Check if branch was indeed changed
      const updatedBranches = await api.userBranches()
      const found = _.find(updatedBranches.list, { activeSim: true })
      assert.equal(found?.branch, 'screeps-api-testing', 'branch was not set')
      // Reset branch back to initial state
      await api.userSetActiveBranch(initialBranch.branch, 'activeSim')
    })
  })

  describe('.userDeleteBranch(branch)', function () {
    it('should send a request to /api/user/delete-branch in order to delete @branch', async function () {
      const api = await createAuthedClient()
      // Delete 'screeps-api-testing' branch
      const deleteRes = await api.userDeleteBranch('screeps-api-testing')
      assert.equal(deleteRes.ok, 1, 'incorrect server response: ok should be 1')
      // Check if branch was indeed deleted
      const branches = await api.userBranches()
      const found = _.find(branches.list, { branch: 'screeps-api-testing' })
      assert(found == null, 'branch was not deleted')
    })
  })

  describe('.userNotifyPrefs(prefs)', function () {
    it('should send a request to /api/user/notify-prefs which sets user preferences', async function () {
      const api = await createAuthedClient()
      const defaults = { disabled: false, disabledOnMessages: false, sendOnline: true, interval: 5, errorsInterval: 30 }
      // Save previous prefs
      const me = await api.authMe()
      const initialPrefs = _.merge(defaults, me.notifyPrefs)
      // Set new preferences
      const newPrefs = { disabled: true, disabledOnMessages: true, sendOnline: false, interval: 60, errorsInterval: 60 }
      const prefsRes = await api.userNotifyPrefs(newPrefs)
      assert.equal(prefsRes.ok, 1, 'incorrect server response: ok should be 1')
      // Check that preferences were indeed changed
      const updated = await api.authMe()
      _.each(updated.notifyPrefs, (value, key) => {
        assert.equal(value, newPrefs[key as keyof typeof newPrefs], `preference ${key} is incorrect`)
      })
      // Reset preferences
      await api.userNotifyPrefs(initialPrefs)
    })
  })

  describe('.userCodeGet(branch)', function () {
    it('should send a GET request to /api/user/code and return user code from specified branch.', async function () {
      const api = await createAuthedClient()
      const res = await api.userCodeGet('default')
      assert.equal(res.ok, 1, 'incorrect server response: ok should be 1')
      assert(_.has(res, 'modules'), 'response has no modules field')
      assert(_.has(res, 'branch'), 'response has no branch field')
      assert.equal(res.branch, 'default', 'branch is incorrect')
    })
  })
})
