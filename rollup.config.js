import commonjs            from '@rollup/plugin-commonjs'
import json                from '@rollup/plugin-json'
import nodeResolve         from '@rollup/plugin-node-resolve'
import { decoObject, ros } from '@spare/logger'
import babel               from 'rollup-plugin-babel'
import fileInfo            from 'rollup-plugin-fileinfo'

const { name, dependencies, main, module } = require(process.cwd() + '/package.json')

console.log(ros('Executing'), name, process.cwd())
console.log(ros('Dependencies'), decoObject(dependencies || {}, { bracket: true }))

export default [
  {
    input: 'index.js',
    external: [ 'os', 'cluster', ...Object.keys(dependencies || {}) ],
    output: [
      { file: main, format: 'cjs', exports: 'auto' },  // CommonJS (for Node) build.
      { file: module, format: 'esm' }  // ES module (for bundlers) build.
    ],
    plugins: [
      nodeResolve({ preferBuiltins: true }),
      commonjs({ include: /node_modules/ }),
      babel({
        babelrc: false,
        comments: true,
        sourceMap: true,
        exclude: 'node_modules/**',
        babelHelpers: 'bundled',
        presets: [
          [ '@babel/preset-env', { targets: { node: '14' } } ]
        ],
        plugins: [
          [ '@babel/plugin-proposal-optional-chaining' ],
          [ '@babel/plugin-proposal-nullish-coalescing-operator' ],
          [ '@babel/plugin-proposal-pipeline-operator', { proposal: 'minimal' } ],
          [ '@babel/plugin-proposal-class-properties', { loose: true } ],
          [ '@babel/plugin-proposal-private-methods', { loose: true } ],
          [ '@babel/plugin-transform-runtime', { helpers: false, } ]
        ]
      }),
      json(),
      fileInfo()
    ]
  }
]
