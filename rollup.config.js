export default {
  entry: 'src/index.js',
  // external(id){
  //   return !!require('./package.json').dependencies[id];
  // },
  globals: {
    ws: 'WebSocket'
  },
  external: ['ws', 'fs', 'axios', 'bluebird', 'yamljs', 'url', 'events', 'zlib', 'path','debug', 'util'],
  moduleName: 'ScreepsAPI',
  dest: 'dist/ScreepsAPI.js',
  format: 'cjs'
}
