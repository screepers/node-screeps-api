const clean = require('rollup-plugin-clean');
const typescript = require('rollup-plugin-typescript2')

module.exports = {
  input: {
    ScreepsAPI: 'src/index.js'
  },
  output: {
    dir: 'dist',
    format: 'cjs',
    exports: 'named',
    globals: {
      ws: 'WebSocket'
    },
  },
  // external(id){
  //   return !!require('./package.json').dependencies[id];
  // },
  external: ['ws', 'fs', 'axios', 'bluebird', 'yamljs', 'url', 'events', 'zlib', 'path','debug', 'util'],
  plugins: [
    clean({ targets: ["dist"] }),
    typescript()
  ]
}
