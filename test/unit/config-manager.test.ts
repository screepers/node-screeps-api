import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  DEFAULT_CLIENT_CONFIG,
  ScreepsConfigManager
} from '../../src/index'

describe('ScreepsConfigManager', () => {
  const manager = new ScreepsConfigManager()

  test('normalizes URL and token credentials', () => {
    assert.deepEqual(
      manager.normalizeServerConfig({
        token: 'test-token',
        url: 'https://example.com/screeps'
      }),
      {
        token: 'test-token',
        url: 'https://example.com/screeps/'
      }
    )
  })

  test('normalizes server aliases and password credentials', () => {
    assert.deepEqual(
      manager.normalizeServerConfig({
        host: 'example.com',
        password: 'test-password',
        path: '/screeps',
        secure: false,
        username: 'test-user'
      }),
      {
        email: 'test-user',
        password: 'test-password',
        url: 'http://example.com/screeps/'
      }
    )
  })

  test('rejects a server without credentials', () => {
    assert.throws(
      () => manager.normalizeServerConfig({ url: 'https://example.com' }),
      /must contain either token or email\/password/
    )
  })

  test('merges client overrides with defaults', () => {
    assert.deepEqual(
      manager.normalizeClientConfig({}, { wsReconnect: false }),
      {
        ...DEFAULT_CLIENT_CONFIG,
        wsReconnect: false
      }
    )
  })
})
