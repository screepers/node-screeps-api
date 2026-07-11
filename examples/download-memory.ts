import { writeFileSync } from 'node:fs'
import { ScreepsHttpClient } from 'screeps-api'

const api = await ScreepsHttpClient.fromConfig('main', {
  app: {
    defaultShard: 'shard0'
  }
})

const memory = await api.userMemoryGet()
writeFileSync('memory.json', JSON.stringify(memory))
