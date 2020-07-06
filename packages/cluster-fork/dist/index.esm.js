import { DISCONNECT, ERROR, EXIT, UNCAUGHT_EXCEPTION } from '@geia/enum-events';
import { says } from '@palett/says';
import { INFO } from '@spare/enum-loggers';
import { decoFlat } from '@spare/logger';
import { nullish } from '@typen/nullish';
import { dateTime } from '@valjoux/timestamp-pretty';
import cluster from 'cluster';
import os from 'os';
import { MASTER, WORKER } from '@geia/enum-roles';
import { Palett } from '@palett/cards';
import { HexDye } from '@palett/dye';
import { BOLD } from '@palett/enum-font-effects';
import { SUBTLE, INSTA } from '@palett/presets';
import { Pigment } from '@palett/projector';

function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
}

const UNEXPECTED_EXIT = 'unexpectedExit';
const REACH_REFORK_LIMIT = 'reachReforkLimit';
const DISABLE_REFORK = 'disableRefork';

/**
 *
 * @param {cluster.Worker} worker
 * @return {string}
 */
const workerExitKey = worker => worker.hasOwnProperty('exitedAfterDisconnect') ? 'exitedAfterDisconnect' : 'suicide';

const pigFore = Pigment({
  min: 0,
  max: 99
}, SUBTLE);
const pigMid = Pigment({
  min: 0,
  max: 9
}, INSTA, [BOLD]);
const pigEnd = Pigment({
  min: 0,
  max: 99
}, INSTA, [BOLD]);
const dyeWorker = HexDye(Palett.grey.accent_2);
const dyeMaster = HexDye(Palett.amber.base);
const byMaster = (sub, name) => dyeMaster(name !== null && name !== void 0 ? name : MASTER) + ':' + dyePid(sub.pid);
const byWorker = (sub, name) => {
  var _sub$process;

  return dyeWorker(name !== null && name !== void 0 ? name : WORKER) + ':' + dyePid(((_sub$process = sub === null || sub === void 0 ? void 0 : sub.process) !== null && _sub$process !== void 0 ? _sub$process : sub).pid);
};
const dyePid = pid => {
  const text = String(pid).padStart(5, '0');
  const fore = text.slice(0, -3),
        mid = text.slice(-3, -2),
        after = text.slice(-2);
  return pigFore(fore) + pigMid(mid) + pigEnd(after);
}; // const testWrites = () => {
//   'hello from master' |> says[byMaster(process)].p(dateTime())
//   'hello from worker' |> says[byWorker(process)].p(dateTime())
// }
// testWrites()
// const test = () => {
//   const candidates = [
//     rand(1000),
//     rand(10000),
//     rand(100000),
//     rand(100000)
//   ]
//   for (let candidate of candidates) {
//     candidate |> writes |> logger
//   }
// }
//
// test()

const CLUSTER_SETTINGS = Symbol.for('clusterSettings');
/**
 * fork worker with certain settings
 * @param {Object} [settings]
 * @param {Object} [env]
 * @param {Object} [clusterSettings]
 * @return {Worker}
 */

function forkWorker({
  settings,
  env,
  clusterSettings
} = {}) {
  if (settings) cluster.setupMaster(settings);
  const worker = cluster.fork(env);
  if (clusterSettings) worker[CLUSTER_SETTINGS] = clusterSettings;
  return worker;
}

const defer = global.setImmediate || process.nextTick;
const CLUSTER_SETTINGS$1 = Symbol.for('clusterSettings');
class ClusterFork {
  /** @type {string} */

  /** @type {number} */

  /** @type {boolean} */

  /** @type {number} */

  /** @type {number} */

  /** @type {Array} */

  /** @type {Object} */

  /** @type {Object} */

  /** @type {number} */

  /** @type {number} */
  // 1 min

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
    var _p$refork;

    _defineProperty(this, "name", byMaster(process));

    _defineProperty(this, "count", void 0);

    _defineProperty(this, "refork", void 0);

    _defineProperty(this, "limit", void 0);

    _defineProperty(this, "duration", void 0);

    _defineProperty(this, "reforks", []);

    _defineProperty(this, "attachedEnv", void 0);

    _defineProperty(this, "disconnects", {});

    _defineProperty(this, "disconnectCount", 0);

    _defineProperty(this, "unexpectedCount", 0);

    if (cluster.isWorker) {
      return void 0;
    }

    this.count = p.count || os.cpus().length - 1 || 1;
    this.refork = (_p$refork = p.refork) !== null && _p$refork !== void 0 ? _p$refork : true;
    this.limit = p.limit || 60;
    this.duration = p.duration || 60000;
    this.attachedEnv = p.env || {};

    if (p.exec) {
      const settings = {
        exec: p.exec
      };

      if (!nullish(p.execArgv)) {
        settings.execArgv = p.execArgv;
      }

      if (!nullish(p.args)) {
        settings.args = p.args;
      }

      if (!nullish(p.silent)) {
        settings.silent = p.silent;
      }

      if (!nullish(p.windowsHide)) {
        settings.windowsHide = p.windowsHide;
      }

      if (p.autoCoverage && process.env.running_under_istanbul) {
        var _settings$args;

        // Multiple Process under istanbul
        // https://github.com/gotwarlost/istanbul#multiple-process-usage
        // use coverage for forked process
        // disabled reporting and output for child process
        // enable pid in child process coverage filename
        const args = ['cover', '--report', 'none', '--print', 'none', '--include-pid', settings.exec];

        if (settings === null || settings === void 0 ? void 0 : (_settings$args = settings.args) === null || _settings$args === void 0 ? void 0 : _settings$args.length) {
          args.push('--', ...settings.args);
        }

        settings.exec = './node_modules/.bin/istanbul';
        settings.args = args;
      }

      cluster.setupMaster(settings);
    }

    cluster.on(DISCONNECT, worker => {
      var _ref;

      const saysMaster = says[this.name].level(worker[DISABLE_REFORK] ? INFO : ERROR);
      const WORKER = byWorker(worker);
      this.disconnectCount++;
      _ref = `${WORKER} disconnects (${decoFlat(this.exceptionInfo({
        worker
      }))})`, saysMaster.p(dateTime())(_ref);

      if (worker === null || worker === void 0 ? void 0 : worker.isDead()) {
        var _ref2;

        // worker has terminated before disconnect
        return void (_ref2 = `not forking, because ${WORKER} exit event emits before disconnect`, saysMaster.p(dateTime())(_ref2));
      }

      if (worker[DISABLE_REFORK]) {
        var _ref3;

        // worker has terminated by master, like egg-cluster master will set disableRefork to true
        return void (_ref3 = `not forking, because ${WORKER} will be killed soon`, saysMaster.p(dateTime())(_ref3));
      }

      this.disconnects[worker.process.pid] = dateTime();

      if (!this.allowRefork) {
        var _ref4;

        _ref4 = `not forking new worker (refork: ${this.refork})`, saysMaster.p(dateTime())(_ref4);
      } else {
        var _ref5;

        const newWorker = forkWorker({
          settings: worker[CLUSTER_SETTINGS$1],
          env: this.attachedEnv,
          clusterSettings: worker[CLUSTER_SETTINGS$1]
        });
        _ref5 = `${dateTime()} new ${byWorker(newWorker.process)} fork (state: ${newWorker.state})`, saysMaster(_ref5);
      }
    });
    cluster.on(EXIT, (worker, code, signal) => {
      var _ref6;

      const saysMaster = says[this.name].level(worker[DISABLE_REFORK] ? INFO : ERROR);
      const WORKER = byWorker(worker);
      const isExpected = !!this.disconnects[worker.process.pid];
      const info = this.exceptionInfo({
        worker,
        code,
        signal
      });
      _ref6 = `${WORKER} exit (${decoFlat(info)}) isExpected (${isExpected})`, saysMaster.p(dateTime())(_ref6);

      if (isExpected) {
        return void delete this.disconnects[worker.process.pid];
      } // worker disconnect first, exit expected


      if (worker[DISABLE_REFORK]) {
        return void 0;
      } // worker is killed by master


      this.unexpectedCount++;

      if (!this.allowRefork) {
        var _ref7;

        _ref7 = `not forking new worker (refork: ${this.refork})`, saysMaster.p(dateTime())(_ref7);
      } else {
        var _ref8;

        const newWorker = forkWorker({
          settings: worker[CLUSTER_SETTINGS$1],
          env: this.attachedEnv,
          clusterSettings: worker[CLUSTER_SETTINGS$1]
        });
        _ref8 = `new ${byWorker(newWorker.process)} fork (state: ${newWorker.state})`, saysMaster.p(dateTime())(_ref8);
      }

      cluster.emit(UNEXPECTED_EXIT, worker, code, signal);
    }); // defer to set the listeners
    // so you can listen this by your own

    defer(() => {
      if (!process.listeners(UNCAUGHT_EXCEPTION).length) {
        process.on(UNCAUGHT_EXCEPTION, this.onUncaughtException.bind(this));
      }

      if (!cluster.listeners(UNEXPECTED_EXIT).length) {
        cluster.on(UNEXPECTED_EXIT, this.onUnexpectedExit.bind(this));
      }

      if (!cluster.listeners(REACH_REFORK_LIMIT).length) {
        cluster.on(REACH_REFORK_LIMIT, this.onReachReforkLimit.bind(this));
      }
    });
    let worker;

    for (let i = 0; i < this.count; i++) {
      worker = forkWorker({
        env: this.attachedEnv,
        clusterSettings: cluster.settings
      });
    } // fork slaves after workers are forked


    if (p.slaves) {
      const slaves = Array.isArray(p.slaves) ? p.slaves : [p.slaves];

      for (const settings of slaves.map(this.normalizeSlaveConfig)) if (settings) {
        worker = forkWorker({
          settings: settings,
          env: this.attachedEnv,
          clusterSettings: settings
        });
      }
    }

    return cluster;
  }
  /**
   *
   * @param p
   * @return {Cluster}
   */


  static build(p) {
    return new ClusterFork(p), cluster;
  }
  /** allow refork */


  get allowRefork() {
    if (!this.refork) {
      return false;
    }

    const times = this.reforks.push(Date.now());

    if (times > this.limit) {
      this.reforks.shift();
    }

    const span = this.reforks[this.reforks.length - 1] - this.reforks[0];
    const canFork = this.reforks.length < this.limit || span > this.duration;

    if (!canFork) {
      cluster.emit(REACH_REFORK_LIMIT);
    }

    return canFork;
  }

  onUncaughtException(err) {
    var _ref9, _ref10, _ref11;

    // uncaughtException default handler
    if (!err) {
      return;
    }

    _ref9 = `master uncaughtException: ${err.stack}`, says[this.name].p(dateTime()).level(ERROR)(_ref9);
    _ref10 = `[error] ${err}`, says[this.name].p(dateTime())(_ref10);
    _ref11 = `(total ${this.disconnectCount} disconnect, ${this.unexpectedCount} unexpected exit)`, says[this.name].p(dateTime())(_ref11);
  }

  onUnexpectedExit(worker, code, signal) {
    var _worker, _ref12;

    // unexpectedExit default handler
    const exitCode = worker.process.exitCode;
    const exitKey = (_worker = worker, workerExitKey(_worker));
    const err = new Error(`${byWorker(worker)} died unexpectedly (code: ${exitCode}, signal: ${signal}, ${exitKey}: ${worker[exitKey]}, state: ${worker.state})`);
    err.name = 'WorkerDiedUnexpectedError';
    _ref12 = `(total ${this.disconnectCount} disconnect, ${this.unexpectedCount} unexpected exit) ${err.stack}`, says[this.name].p(dateTime()).level(ERROR)(_ref12);
  }

  onReachReforkLimit() {
    var _ref13;

    // reachReforkLimit default handler
    _ref13 = `worker died too fast (total ${this.disconnectCount} disconnect, ${this.unexpectedCount} unexpected exit)`, says[this.name].p(dateTime()).level(ERROR)(_ref13);
  }

  exceptionInfo({
    worker,
    code,
    signal
  } = {}) {
    var _worker2;

    const exitKey = (_worker2 = worker, workerExitKey(_worker2));
    const info = {};
    if (!nullish(code)) info.code = code;
    if (!nullish(signal)) info.signal = signal;
    if (!nullish(exitKey)) info[exitKey] = worker[exitKey];
    Object.assign(info, {
      state: worker.state,
      isDead: worker.isDead && worker.isDead(),
      worker: {
        disableRefork: worker.disableRefork
      }
    });
    return info;
  }

  normalizeSlaveConfig(opt) {
    /** normalize slave config */
    if (typeof opt === 'string') {
      opt = {
        exec: opt
      };
    } // exec path


    return opt.exec ? opt : null;
  }

}

export { ClusterFork };
