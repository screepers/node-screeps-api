import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'

export default {
  entry: 'src/node.js',
  dest: 'dist/screepsAPI.js',
  format: 'cjs',
  external(id){
    return !!require('./package.json').dependencies[id];
  },
  plugins:[
    resolve({
      module:true,
      preferBuiltins: true
    }),
    commonjs()
  ]
}