import typescript from 'rollup-plugin-typescript2'

export default {
  input: {
    ScreepsAPI: 'src/index.ts'
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
    typescript({
      useTsconfigDeclarationDir: true
    })
  ]
}
