import { writeFileSync } from 'node:fs'
// If installed from npm, use:
// import { ScreepsHttpClient } from 'screeps-api'
import { ScreepsHttpClient } from '../src'

const api = await ScreepsHttpClient.fromConfig('main', {
  app: {
    defaultShard: 'shard0'
  }
})

const memory = await api.userMemoryGet()
writeFileSync('memory.json', JSON.stringify(memory))
