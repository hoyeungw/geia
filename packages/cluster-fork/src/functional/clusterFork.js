import { DISCONNECT, ERROR, EXIT, UNCAUGHT_EXCEPTION }         from '@geia/enum-events'
import { ros, says }                                           from '@palett/says'
import { INFO }                                                from '@spare/enum-loggers'
import { nullish }                                             from '@typen/nullish'
import { dateTime }                                            from '@valjoux/timestamp-pretty'
import cluster, { Cluster }                                    from 'cluster'
import os                                                      from 'os'
import { DISABLE_REFORK, REACH_REFORK_LIMIT, UNEXPECTED_EXIT } from '../../resources/constants'
import { workerExitKey }                                       from '../../utils/exitKey'

const defer = global.setImmediate || process.nextTick

export const CLUSTERMASTER = 'cluster:master:' + process.pid
/**
 * cluster fork
 *
 * @param {Object} [p]
 * @param {String} [p.exec]       exec file path
 * @param {Array} [p.args]      exec arguments
 * @param {Array} [p.slaves]    slave processes
 * @param {Boolean} [p.silent]  whether or not to send output to parent's stdio, default is `false`
 * @param {Number} [p.count]    worker num, default is `os.cpus().length - 1`
 * @param {Boolean} [p.refork]  refork when disconnect and unexpected exit, default is `true`
 * @param {Boolean} [p.autoCoverage] auto fork with istanbul when `running_under_istanbul` env set, default is `false`
 * @param {Boolean} [p.windowsHide] Hide the forked processes console window that would normally be created on Windows systems. Default: false.
 * @param {number} [p.limit]
 * @param {number} [p.duration]
 * @param {Object} [p.env]
 * @param {*} [p.execArgv]
 * @return {Cluster}
 */
export function clusterFork(p) {
  if (cluster.isWorker) { return void 0 }
  p = p || {}
  const MASTER = process.env?.byname ?? ('master:' + process.pid + ':cluster')
  const count = p.count || (os.cpus().length - 1) || 1
  const refork = p.refork ?? true
  const limit = p.limit || 60
  const duration = p.duration || 60000 // 1 min
  const reforks = []
  const attachedEnv = p.env || {}

  if (p.exec) {
    const opts = { exec: p.exec }
    if (!nullish(p.execArgv)) { opts.execArgv = p.execArgv }
    if (!nullish(p.args)) { opts.args = p.args }
    if (!nullish(p.silent)) { opts.silent = p.silent }
    if (!nullish(p.windowsHide)) { opts.windowsHide = p.windowsHide }
    // https://github.com/gotwarlost/istanbul#multiple-process-usage
    // Multiple Process under istanbul
    if (p.autoCoverage && process.env.running_under_istanbul) {
      // use coverage for forked process
      // disabled reporting and output for child process
      // enable pid in child process coverage filename
      let args = ['cover', '--report', 'none', '--print', 'none', '--include-pid', opts.exec,]
      if (opts.args && opts.args.length > 0) {
        args.push('--')
        args = args.concat(opts.args)
      }
      opts.exec = './node_modules/.bin/istanbul'
      opts.args = args
    }
    cluster.setupMaster(opts)
  }

  const disconnects = {}
  let disconnectCount = 0
  let unexpectedCount = 0

  cluster.on(DISCONNECT, worker => {
    // const log = console[worker[DISABLE_REFORK] ? INFO : ERROR]
    const saysMaster = says[MASTER].setLogger(worker[DISABLE_REFORK] ? INFO : ERROR)
    disconnectCount++
    const isDead = worker?.isDead()
    const exitKey = worker |> workerExitKey;
    `${ dateTime() } worker:${ worker.process.pid } disconnect (${ exitKey }: ${ worker[exitKey] }, state: ${ worker.state }, isDead: ${ isDead }, worker.disableRefork: ${ worker[DISABLE_REFORK] })` |> saysMaster
    if (isDead) {
      // worker has terminated before disconnect
      `${ dateTime() } don't fork, because worker:${ worker.process.pid } exit event emit before disconnect` |> saysMaster
      return
    }
    if (worker[DISABLE_REFORK]) {
      // worker has terminated by master, like egg-cluster master will set disableRefork to true
      `${ dateTime() } don't fork, because worker:${ worker.process.pid } will be killed soon` |> saysMaster
      return
    }
    disconnects[worker.process.pid] = dateTime()
    if (allow()) {
      const newWorker = forkWorker(worker._clusterSettings)
      newWorker._clusterSettings = worker._clusterSettings;
      `${ dateTime() } new worker:${ newWorker.process.pid } fork (state: ${ newWorker.state })` |> saysMaster
    } else {
      `${ dateTime() } don't fork new work (refork: ${ refork })` |> saysMaster
    }
  })

  cluster.on(EXIT, (worker, code, signal) => {
    const saysMaster = says[MASTER].setLogger(worker[DISABLE_REFORK] ? INFO : ERROR)
    const isExpected = !!disconnects[worker.process.pid]
    const isDead = worker.isDead && worker.isDead()
    const exitKey = worker |> workerExitKey;
    `${ dateTime() } worker:${ worker.process.pid } exit (code: ${ code }, ${ exitKey }: ${ worker[exitKey] }, state: ${ worker.state }, isDead: ${ isDead }, isExpected: ${ isExpected }, worker.disableRefork: ${ worker[DISABLE_REFORK] })` |> saysMaster
    if (isExpected) {
      delete disconnects[worker.process.pid]
      return
    } // worker disconnect first, exit expected
    if (worker[DISABLE_REFORK]) { return }  // worker is killed by master
    unexpectedCount++
    if (allow()) {
      const newWorker = forkWorker(worker._clusterSettings)
      newWorker._clusterSettings = worker._clusterSettings;
      `${ dateTime() } new worker:${ newWorker.process.pid } fork (state: ${ newWorker.state })` |> saysMaster
    } else {
      `${ dateTime() } don't fork new work (refork: ${ refork })` |> saysMaster
    }
    cluster.emit(UNEXPECTED_EXIT, worker, code, signal)
  })

  // defer to set the listeners
  // so you can listen this by your own
  defer(() => {
    if (process.listeners(UNCAUGHT_EXCEPTION).length === 0) { process.on(UNCAUGHT_EXCEPTION, onerror) }
    if (cluster.listeners(UNEXPECTED_EXIT).length === 0) { cluster.on(UNEXPECTED_EXIT, onUnexpected) }
    if (cluster.listeners(REACH_REFORK_LIMIT).length === 0) { cluster.on(REACH_REFORK_LIMIT, onReachReforkLimit) }
  })

  for (let i = 0; i < count; i++) {
    const newWorker = forkWorker()
    newWorker._clusterSettings = cluster.settings
  }

  // fork slaves after workers are forked
  if (p.slaves) {
    const slaves = Array.isArray(p.slaves) ? p.slaves : [p.slaves]
    slaves.map(normalizeSlaveConfig)
      .forEach(function (settings) {
        if (settings) {
          const newWorker = forkWorker(settings)
          newWorker._clusterSettings = settings
        }
      })
  }

  return cluster

  /**
   * allow refork
   */
  function allow() {
    if (!refork) { return false }
    const times = reforks.push(Date.now())
    if (times > limit) { reforks.shift() }
    const span = reforks[reforks.length - 1] - reforks[0]
    const canFork = reforks.length < limit || span > duration
    if (!canFork) { cluster.emit(REACH_REFORK_LIMIT) }
    return canFork
  }

  /**
   * uncaughtException default handler
   */

  function onerror(err) {
    if (!err) { return }
    `[${ ros(MASTER) }] ${ dateTime() } master uncaughtException: ${ err.stack }` |> console.error
    err |> console.error;
    `(total ${ disconnectCount } disconnect, ${ unexpectedCount } unexpected exit)` |> console.error
  }

  /**
   * unexpectedExit default handler
   */
  function onUnexpected(worker, code, signal) {
    const exitCode = worker.process.exitCode
    const exitKey = worker |> workerExitKey
    const err = new Error(`worker:${ worker.process.pid } died unexpected (code: ${ exitCode }, signal: ${ signal }, ${ exitKey }: ${ worker[exitKey] }, state: ${ worker.state })`)
    err.name = 'WorkerDiedUnexpectedError';
    `[${ ros(MASTER) }] ${ dateTime() } (total ${ disconnectCount } disconnect, ${ unexpectedCount } unexpected exit) ${ err.stack }` |> console.error
  }

  /**
   * reachReforkLimit default handler
   */
  function onReachReforkLimit() {
    `${ dateTime() } worker died too fast (total ${ disconnectCount } disconnect, ${ unexpectedCount } unexpected exit)` |> console.error
  }

  /**
   * normalize slave config
   */
  function normalizeSlaveConfig(opt) {
    // exec path
    if (typeof opt === 'string') { opt = { exec: opt } }
    return opt.exec ? opt : null
  }

  /**
   * fork worker with certain settings
   */
  function forkWorker(settings) {
    if (settings) cluster.setupMaster(settings)
    return cluster.fork(attachedEnv)
  }
}
