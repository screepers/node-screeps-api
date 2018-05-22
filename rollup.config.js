import resolve from 'rollup-plugin-node-resolve'
import builtins from 'rollup-plugin-node-builtins'
import commonjs from 'rollup-plugin-commonjs'
import babel from 'rollup-plugin-babel'

export default {
  entry: 'src/index.js',
  // external(id){
  //   return !!require('./package.json').dependencies[id];
  // },
  globals: {
    ws: 'WebSocket',
    'node-fetch': 'fetch'
  },
  external: ['ws', 'fs', 'node-fetch'],
  moduleName: 'ScreepsAPI',
  targets: [
    { dest: 'dist/ScreepsAPI.iife.js', format: 'iife' },
    { dest: 'dist/ScreepsAPI.umd.js', format: 'umd' },
    { dest: 'dist/ScreepsAPI.cjs.js', format: 'cjs' },
    { dest: 'dist/ScreepsAPI.es.js', format: 'es' }
  ],
  plugins: [
    builtins(),
    commonjs(),
    resolve({
      module: true,
      preferBuiltins: true
    }),
    babel()
  ]
}
