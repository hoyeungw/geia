export { ClusterFork } from './src/ClusterFork'

// /**
//  * cluster fork
//  *
//  * @param {Object} [p]
//  * @param {String} [p.exec]       exec file path
//  * @param {Array} [p.args]      exec arguments
//  * @param {Array} [p.slaves]    slave processes
//  * @param {Boolean} [p.silent]  whether or not to send output to parent's stdio, default is `false`
//  * @param {Number} [p.count]    worker num, default is `os.cpus().length - 1`
//  * @param {Boolean} [p.refork]  refork when disconnect and unexpected exit, default is `true`
//  * @param {Boolean} [p.autoCoverage] auto fork with istanbul when `running_under_istanbul` env set, default is `false`
//  * @param {Boolean} [p.windowsHide] Hide the forked processes console window that would normally be created on Windows systems. Default: false.
//  * @param {number} [p.limit]
//  * @param {number} [p.duration]
//  * @param {Object} [p.env]
//  * @param {*} [p.execArgv]
//  * @return {Cluster}
//  */
// const clusterFork = (p) => ClusterFork.build(p)
//
// export { ClusterFork } from './src/classic/ClusterFork'
// export default clusterFork