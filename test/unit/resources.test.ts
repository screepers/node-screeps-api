import assert from 'node:assert/strict'
import { test } from 'node:test'
import { IntershardResources, MarketResources } from '../../src/index'

test('subscription tokens are intershard market resources', () => {
  assert.equal(IntershardResources.SubscriptionToken, 'token')
  assert.equal(MarketResources.SubscriptionToken, 'token')
})
