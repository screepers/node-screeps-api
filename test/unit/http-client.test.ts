import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { ScreepsHttpClient } from '../../src/index'

const client = (url: string) => new ScreepsHttpClient({
  token: 'test-token',
  url
})

describe('official server detection', () => {
  test('recognizes MMO, PTR, and Seasonal World URLs', () => {
    assert.equal(client('https://screeps.com/').isOfficialServer, true)
    assert.equal(client('https://screeps.com:443/ptr/').isPtrServer, true)
    assert.equal(client('https://screeps.com/season/').isSeasonServer, true)
  })

  test('rejects deceptive hostnames and paths', () => {
    for (const url of [
      'https://my-screeps.com/',
      'https://screeps.com.example/',
      'https://example.com/screeps.com/'
    ]) {
      assert.equal(client(url).isOfficialServer, false, url)
    }
    assert.equal(client('https://screeps.com/ptricious/').isPtrServer, false)
    assert.equal(client('https://screeps.com/rooms/ptr/').isPtrServer, false)
  })
})
