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

  describe('.userCloneBranch(branch, newName)', function () {
    it('should send a request to /api/user/clone-branch in order to clone @branch into @newName', async function () {
      const api = await createAuthedClient()
      // Create a new branch
      const cloneRes = await api.userCloneBranch('default', 'screeps-api-testing')
      assert.equal(cloneRes.ok, 1, 'incorrect server response: ok should be 1')
      // Check if branch was indeed created
      const branches = await api.userBranches()
      const found = _.find(branches.list, { branch: 'screeps-api-testing' })
      assert(found != null, 'branch was not cloned')
    })

    it('should return { error: \'invalid branch name\' } if the source branch name is too long', async function () {
      const api = await createAuthedClient()
      const res = await api.userCloneBranch('x'.repeat(31), 'screeps-api-too-long')
      assert.equal('error' in res ? res.error : undefined, 'invalid branch name', 'incorrect server response')
      const branches = await api.userBranches()
      assert(_.find(branches.list, { branch: 'screeps-api-too-long' }) == null, 'branch should not have been created')
    })

    it('should return { error: \'too many branches\' } if the user already has 30 branches', async function () {
      this.timeout(30_000)
      const api = await createAuthedClient()
      const existing = await api.userBranches()
      const created: string[] = []
      try {
        const toCreate = Math.max(0, 30 - existing.list.length)
        for (let i = 0; i < toCreate; i++) {
          const name = `screeps-api-cap-${i}`
          const cloneRes = await api.userCloneBranch(name, { main: '' })
          assert.equal(cloneRes.ok, 1, `failed to create ${name}`)
          created.push(name)
        }
        const res = await api.userCloneBranch('screeps-api-cap-overflow', { main: '' })
        assert.equal('error' in res ? res.error : undefined, 'too many branches', 'incorrect server response')
      } finally {
        for (const name of created) {
          await api.userDeleteBranch(name)
        }
      }
    })
  })

  describe('.userCloneBranch(newName, defaultModules)', function () {
    it('should send a request to /api/user/clone-branch in order to create @newName from @defaultModules', async function () {
      const api = await createAuthedClient()
      const defaultModules = { main: 'module.exports.loop = function () { /* screeps-api-seeded */ }' }
      // Create a new branch from modules
      const cloneRes = await api.userCloneBranch('screeps-api-seeded', defaultModules)
      assert.equal(cloneRes.ok, 1, 'incorrect server response: ok should be 1')
      // Check if branch was indeed created with the seeded modules
      const branches = await api.userBranches()
      const found = _.find(branches.list, { branch: 'screeps-api-seeded' })
      assert(found != null, 'branch was not created')
      const code = await api.userCodeGet('screeps-api-seeded')
      assert.equal(code.modules.main, defaultModules.main, 'modules were not seeded')
      // Clean up
      await api.userDeleteBranch('screeps-api-seeded')
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

    it('should return { error: \'no branch\' } if the named branch does not exist', async function () {
      const api = await createAuthedClient()
      const res = await api.userSetActiveBranch('screeps-api-missing-branch', 'activeSim')
      assert.equal('error' in res ? res.error : undefined, 'no branch', 'incorrect server response')
    })

    it('should return { error: \'invalid params\' } if activeName is not activeWorld or activeSim', async function () {
      const api = await createAuthedClient()
      const res = await api.userSetActiveBranch('default', 'nope' as 'activeSim')
      assert.equal('error' in res ? res.error : undefined, 'invalid params', 'incorrect server response')
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

    it('should succeed when the named branch does not exist', async function () {
      const api = await createAuthedClient()
      const res = await api.userDeleteBranch('screeps-api-missing-branch')
      assert.equal(res.ok, 1, 'incorrect server response: ok should be 1')
    })

    it('should succeed without deleting a currently active branch', async function () {
      const api = await createAuthedClient()
      const res = await api.userDeleteBranch('default')
      assert.equal(res.ok, 1, 'incorrect server response: ok should be 1')
      const branches = await api.userBranches()
      const found = _.find(branches.list, { branch: 'default' })
      assert(found != null, 'active branch should not have been deleted')
      assert(found.activeWorld || found.activeSim, 'default should still be active')
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

  describe('.userRespawn()', function () {
    it('should return { error: \'invalid status\' } if the user is not playing', async function () {
      const api = await createAuthedClient()
      const status = await api.userWorldStatus()
      if (status.status !== 'empty') {
        this.skip()
      }
      const res = await api.userRespawn()
      assert.equal('error' in res ? res.error : undefined, 'invalid status', 'incorrect server response')
    })
  })

  describe('.userCodeSet(params)', function () {
    it('should send a POST request to /api/user/code and upload modules to the specified branch', async function () {
      const api = await createAuthedClient()
      const branch = 'screeps-api-code-set'
      const modules = { main: 'module.exports.loop = function () { /* screeps-api-code-set */ }' }
      await api.userCloneBranch(branch, { main: '' })
      try {
        const res = await api.userCodeSet({ branch, modules })
        assert.equal(res.ok, 1, 'incorrect server response: ok should be 1')
        const code = await api.userCodeGet(branch)
        assert.equal(code.modules.main, modules.main, 'modules were not uploaded')
      } finally {
        await api.userDeleteBranch(branch)
      }
    })

    it('should return { error: \'branch does not exist\' } if the named branch is missing', async function () {
      const api = await createAuthedClient()
      const res = await api.userCodeSet({
        branch: 'screeps-api-missing-code',
        modules: { main: 'module.exports.loop = function () {}' }
      })
      assert.equal('error' in res ? res.error : undefined, 'branch does not exist', 'incorrect server response')
    })

    it('should return { error: \'code length exceeds 5 MB limit\' } if modules are too large', async function () {
      this.timeout(15_000)
      const api = await createAuthedClient()
      const res = await api.userCodeSet({
        branch: 'default',
        modules: { main: 'x'.repeat(5 * 1024 * 1024) }
      })
      assert.equal('error' in res ? res.error : undefined, 'code length exceeds 5 MB limit', 'incorrect server response')
    })
  })

  describe('.userEmail(email)', function () {
    it('should return { error: \'invalid email\' } if the address is malformed', async function () {
      const api = await createAuthedClient()
      const res = await api.userEmail('not-an-email')
      assert.equal('error' in res ? res.error : undefined, 'invalid email', 'incorrect server response')
    })

    it('should return { error: \'email already exists\' } if the address is already in use', async function () {
      const api = await createAuthedClient()
      const me = await api.authMe()
      if (!me.email) {
        this.skip()
      }
      const res = await api.userEmail(me.email)
      assert.equal('error' in res ? res.error : undefined, 'email already exists', 'incorrect server response')
    })
  })

  describe('.userMessagesSend(respondent, text)', function () {
    it('should return { error: \'invalid respondent\' } if the user id does not exist', async function () {
      const api = await createAuthedClient()
      const res = await api.userMessagesSend('000000000000000000000000', 'hi')
      assert.equal('error' in res ? res.error : undefined, 'invalid respondent', 'incorrect server response')
    })

    it('should return { error: \'text too long\' } if the message exceeds 100 KiB', async function () {
      const api = await createAuthedClient()
      const res = await api.userMessagesSend('000000000000000000000000', 'x'.repeat(100 * 1024 + 1))
      assert.equal('error' in res ? res.error : undefined, 'text too long', 'incorrect server response')
    })
  })
})
