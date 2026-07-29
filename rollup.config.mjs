import { defineConfig } from 'rollup'
import { dts } from 'rollup-plugin-dts'
import typescript from 'rollup-plugin-typescript2'

const external = [
  'axios',
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
]

export default defineConfig([
  {
    input: {
      'bin/cli': 'bin/screeps-api.ts',
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
    external,
    plugins: [
      typescript()
    ]
  },
  {
    input: {
      'index': 'src/index.ts',
      'ws-browser': 'src/ws-browser.ts'
    },
    output: {
      dir: 'dist',
      format: 'es'
    },
    external,
    plugins: [dts({ sourcemap: true })]
  }
])
