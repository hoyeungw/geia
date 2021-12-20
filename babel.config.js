module.exports = function (api) {
  api.cache(false)
  const presets = [ [ '@babel/preset-env', { targets: { node: '16' } } ] ]
  const plugins = [
    [ '@babel/plugin-proposal-pipeline-operator', { proposal: 'minimal' } ],
  ]
  const ignore = [ 'node_modules/**' ]
  return {
    presets,
    plugins,
    ignore
  }
}

// export default {
//   presets: [ [ '@babel/preset-env', { targets: { node: '16' } } ] ],
//   plugins: [
//     [ '@babel/plugin-proposal-pipeline-operator', { proposal: 'minimal' } ],
//   ],
//   ignore: [ 'node_modules/**' ],
// }

// module.exports = {
//   plugins: [
//     [ '@babel/plugin-proposal-pipeline-operator', { proposal: 'minimal' } ],
//   ],
// }