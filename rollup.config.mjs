import { defineConfig } from 'rollup'
import typescript from 'rollup-plugin-typescript2'

export default defineConfig({
  input: {
    'cli': 'bin/screeps-api.ts',
    'index': 'src/index.ts',
    'ws-browser': 'src/ws-browser.ts'
  },
  output: {
    dir: 'dist',
    format: 'esm',
    globals: {
      ws: 'WebSocket'
    },
    sourcemap: true
  },
  external: [
    'axios',
    'bluebird',
    'commander',
    'debug',
    'node:events',
    'node:fs/promises',
    'node:path',
    'node:process',
    'node:url',
    'node:timers/promises',
    'node:util',
    'ws',
    'yaml',
    'zlib'
  ],
  plugins: [
    typescript()
  ]
})
