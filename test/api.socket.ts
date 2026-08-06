import assert from 'assert/strict'
import { ScreepsHttpClient } from 'screeps-api'
import type { UserMemoryEvent } from '../src/socket/user.js'

describe('ScreepsSocketClient memory subscriptions', function () {
  it('supports the documented path and callback form', async function () {
    const api = new ScreepsHttpClient({ token: 'test-token' })
    api.appConfig.defaultShard = 'shard0'
    const socket = api.socket
    let eventSpec: string | undefined
    const callback = (_event: UserMemoryEvent) => {}
    ;(socket as any).subscribe = async (spec: string) => {
      eventSpec = spec
    }

    await socket.subscribeUserMemory('remoteMining', callback)

    assert.equal(eventSpec, 'memory/shard0/remoteMining')
  })

  it('supports an explicit shard without duplicating it', async function () {
    const api = new ScreepsHttpClient({ token: 'test-token' })
    const socket = api.socket
    let eventSpec: string | undefined
    const callback = (_event: UserMemoryEvent) => {}
    ;(socket as any).subscribe = async (spec: string) => {
      eventSpec = spec
    }

    await socket.subscribeUserMemory('remoteMining', 'shard2', callback)

    assert.equal(eventSpec, 'memory/shard2/remoteMining')
  })
})
