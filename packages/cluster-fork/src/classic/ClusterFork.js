import { DISCONNECT, ERROR, EXIT, UNCAUGHT_EXCEPTION }         from '@geia/enum-events'
import { says }                                                from '@palett/says'
import { INFO }                                                from '@spare/enum-loggers'
import { decoFlat }                                            from '@spare/logger'
import { nullish }                                             from '@typen/nullish'
import { dateTime }                                            from '@valjoux/timestamp-pretty'
import cluster                                                 from 'cluster'
import os                                                      from 'os'
import { DISABLE_REFORK, REACH_REFORK_LIMIT, UNEXPECTED_EXIT } from '../../resources/constants'
import { workerExitKey }                                       from '../../utils/exitKey'
import { byMaster, byWorker }                                  from '../../utils/writes'
import { forkWorker }                                          from './forkWorker'

const defer = global.setImmediate || process.nextTick

const CLUSTER_SETTINGS = Symbol.for('clusterSettings')

export class ClusterFork {
  /** @type {string} */ name = byMaster(process)
  /** @type {number} */ count
  /** @type {boolean} */ refork
  /** @type {number} */ limit
  /** @type {number} */ duration
  /** @type {Array} */ reforks = []
  /** @type {Object} */ attachedEnv
  /** @type {Object} */ disconnects = {}
  /** @type {number} */ disconnectCount = 0
  /** @type {number} */ unexpectedCount = 0 // 1 min

  /**
   * cluster fork
   *
   * @param {Object} [p]
   * @param {String} [p.exec]     exec file path
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
  constructor(p = {}) {
    if (cluster.isWorker) { return void 0 }
    this.count = p.count || (os.cpus().length - 1) || 1
    this.refork = p.refork ?? true
    this.limit = p.limit || 60
    this.duration = p.duration || 60000
    this.attachedEnv = p.env || {}

    if (p.exec) {
      const settings = { exec: p.exec }
      if (!nullish(p.execArgv)) { settings.execArgv = p.execArgv }
      if (!nullish(p.args)) { settings.args = p.args }
      if (!nullish(p.silent)) { settings.silent = p.silent }
      if (!nullish(p.windowsHide)) { settings.windowsHide = p.windowsHide }
      if (p.autoCoverage && process.env.running_under_istanbul) { // Multiple Process under istanbul
        // https://github.com/gotwarlost/istanbul#multiple-process-usage
        // use coverage for forked process
        // disabled reporting and output for child process
        // enable pid in child process coverage filename
        const args = ['cover', '--report', 'none', '--print', 'none', '--include-pid', settings.exec,]
        if (settings?.args?.length) { args.push('--', ...settings.args) }
        settings.exec = './node_modules/.bin/istanbul'
        settings.args = args
      }
      cluster.setupMaster(settings)
    }

    cluster.on(DISCONNECT, worker => {
      const saysMaster = says[this.name].level(worker[DISABLE_REFORK] ? INFO : ERROR)
      const WORKER = byWorker(worker)
      this.disconnectCount++
      `${ WORKER } disconnects (${ decoFlat(this.exceptionInfo({ worker })) })` |> saysMaster.p(dateTime())
      if (worker?.isDead()) { // worker has terminated before disconnect
        return void (`not forking, because ${ WORKER } exit event emits before disconnect` |> saysMaster.p(dateTime()))
      }
      if (worker[DISABLE_REFORK]) { // worker has terminated by master, like egg-cluster master will set disableRefork to true
        return void (`not forking, because ${ WORKER } will be killed soon` |> saysMaster.p(dateTime()))
      }
      this.disconnects[worker.process.pid] = dateTime()
      if (!this.allowRefork) {
        `not forking new worker (refork: ${ this.refork })` |> saysMaster.p(dateTime())
      } else {
        const newWorker = forkWorker({
          settings: worker[CLUSTER_SETTINGS],
          env: this.attachedEnv,
          clusterSettings: worker[CLUSTER_SETTINGS]
        });
        `${ dateTime() } new ${ byWorker(newWorker.process) } fork (state: ${ newWorker.state })` |> saysMaster
      }
    })

    cluster.on(EXIT, (worker, code, signal) => {
      const saysMaster = says[this.name].level(worker[DISABLE_REFORK] ? INFO : ERROR)
      const WORKER = byWorker(worker)
      const isExpected = !!this.disconnects[worker.process.pid]
      const info = this.exceptionInfo({ worker, code, signal });
      `${ WORKER } exit (${ decoFlat(info) }) isExpected (${ isExpected })` |> saysMaster.p(dateTime())
      if (isExpected) { return void (delete this.disconnects[worker.process.pid]) } // worker disconnect first, exit expected
      if (worker[DISABLE_REFORK]) { return void 0 }  // worker is killed by master
      this.unexpectedCount++
      if (!this.allowRefork) {
        `not forking new worker (refork: ${ this.refork })` |> saysMaster.p(dateTime())
      } else {
        const newWorker = forkWorker({
          settings: worker[CLUSTER_SETTINGS],
          env: this.attachedEnv,
          clusterSettings: worker[CLUSTER_SETTINGS]
        });
        `new ${ byWorker(newWorker.process) } fork (state: ${ newWorker.state })` |> saysMaster.p(dateTime())
      }
      cluster.emit(UNEXPECTED_EXIT, worker, code, signal)
    })

    // defer to set the listeners
    // so you can listen this by your own
    defer(() => {
      if (!process.listeners(UNCAUGHT_EXCEPTION).length) { process.on(UNCAUGHT_EXCEPTION, this.onUncaughtException.bind(this)) }
      if (!cluster.listeners(UNEXPECTED_EXIT).length) { cluster.on(UNEXPECTED_EXIT, this.onUnexpectedExit.bind(this)) }
      if (!cluster.listeners(REACH_REFORK_LIMIT).length) { cluster.on(REACH_REFORK_LIMIT, this.onReachReforkLimit.bind(this)) }
    })

    let worker
    for (let i = 0; i < this.count; i++) {
      worker = forkWorker({
        env: this.attachedEnv,
        clusterSettings: cluster.settings
      })
    }

    // fork slaves after workers are forked
    if (p.slaves) {
      const slaves = Array.isArray(p.slaves) ? p.slaves : [p.slaves]
      for (const settings of slaves.map(this.normalizeSlaveConfig))
        if (settings) {
          worker = forkWorker({
            settings: settings,
            env: this.attachedEnv,
            clusterSettings: settings
          })
        }
    }

    return cluster
  }

  /**
   *
   * @param p
   * @return {Cluster}
   */
  static build(p) { return new ClusterFork(p), cluster }

  /** allow refork */
  get allowRefork() {
    if (!this.refork) { return false }
    const times = this.reforks.push(Date.now())
    if (times > this.limit) { this.reforks.shift() }
    const span = this.reforks[this.reforks.length - 1] - this.reforks[0]
    const canFork = this.reforks.length < this.limit || span > this.duration
    if (!canFork) { cluster.emit(REACH_REFORK_LIMIT) }
    return canFork
  }

  onUncaughtException(err) { // uncaughtException default handler
    if (!err) { return }
    `master uncaughtException: ${ err.stack }` |> says[this.name].p(dateTime()).level(ERROR);
    `[error] ${ err }` |> says[this.name].p(dateTime());
    `(total ${ this.disconnectCount } disconnect, ${ this.unexpectedCount } unexpected exit)` |> says[this.name].p(dateTime())
  }
  onUnexpectedExit(worker, code, signal) { // unexpectedExit default handler
    const exitCode = worker.process.exitCode
    const exitKey = worker |> workerExitKey
    const err = new Error(`${ byWorker(worker) } died unexpectedly (code: ${ exitCode }, signal: ${ signal }, ${ exitKey }: ${ worker[exitKey] }, state: ${ worker.state })`)
    err.name = 'WorkerDiedUnexpectedError';
    `(total ${ this.disconnectCount } disconnect, ${ this.unexpectedCount } unexpected exit) ${ err.stack }` |> says[this.name].p(dateTime()).level(ERROR)
  }
  onReachReforkLimit() { // reachReforkLimit default handler
    `worker died too fast (total ${ this.disconnectCount } disconnect, ${ this.unexpectedCount } unexpected exit)` |> says[this.name].p(dateTime()).level(ERROR)
  }

  exceptionInfo({ worker, code, signal } = {}) {
    const exitKey = worker |> workerExitKey
    const info = {}
    if (!nullish(code)) info.code = code
    if (!nullish(signal)) info.signal = signal
    if (!nullish(exitKey)) info[exitKey] = worker[exitKey]
    Object.assign(info, {
      state: worker.state,
      isDead: worker.isDead && worker.isDead(),
      worker: { disableRefork: worker.disableRefork }
    })
    return info
  }

  normalizeSlaveConfig(opt) {  /** normalize slave config */
    if (typeof opt === 'string') { opt = { exec: opt } } // exec path
    return opt.exec ? opt : null
  }
}
