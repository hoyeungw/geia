import { by } from '@geia/by';
import { DISCONNECT, EXIT, UNCAUGHT_EXCEPTION, ERROR } from '@geia/enum-events';
import { MASTER, WORKER } from '@geia/enum-roles';
import { says } from '@spare/says';
import { INFO } from '@spare/enum-loggers';
import { decoFlat } from '@spare/logger';
import { nullish } from '@typen/nullish';
import { dateTime } from '@valjoux/timestamp-pretty';
import cluster from 'cluster';
import os from 'os';

const UNEXPECTED_EXIT = 'unexpectedExit';
const REACH_REFORK_LIMIT = 'reachReforkLimit';

const DISABLE_REFORK = 'disableRefork';
const GENE = 'gene';

/**
 *
 * @param {cluster.Worker} worker
 * @return {string}
 */
const workerExitKey = worker => worker.hasOwnProperty('exitedAfterDisconnect') ? 'exitedAfterDisconnect' : 'suicide';

const defer = global.setImmediate || process.nextTick;
/**
 * @typedef {Object}   ForkConfig
 * @typedef {string}   [ForkConfig.exec]     file path to worker file
 * @typedef {number}   [ForkConfig.count]    worker num, default is `os.cpus().length - 1`
 * @typedef {string[]} [ForkConfig.args]     string arguments passed to worker
 * @typedef {Object}   [ForkConfig.env]      key/value pairs to add to worker process environment
 * @typedef {string[]} [ForkConfig.execArgv] list of string arguments passed to the Node.js executable.
 * @typedef {boolean}  [ForkConfig.silent]   whether or not to send output to parent's stdio, default is `false`
 * @typedef {boolean}  [ForkConfig.refork]   refork when disconnect and unexpected exit, default is `true`
 * @typedef {boolean}  [ForkConfig.autoCoverage] auto fork with istanbul when `running_under_istanbul` env set, default is `false`
 * @typedef {boolean}  [ForkConfig.windowsHide]  hide the forked processes console window that would normally be created on Windows systems. Default: false.
 * @typedef {Array}    [ForkConfig.slaves]   slave processes
 * @typedef {number}   [ForkConfig.limit]    limit of number of reforks within duration time
 * @typedef {number}   [ForkConfig.duration] duration to apply ForkConfig.limit. if running time expires duration, ForkConfig.limit becomes invalid.
 */

/**
 * A factory to fork cluster worker, inspired by cfork
 */

class Institute {
  /** @type {string} */
  name = by(process, MASTER);
  /** @type {*} */

  logger = says[this.name].attach(dateTime);
  /** @type {number} */

  count;
  /** @type {boolean} */

  refork;
  /** @type {number} */

  limit;
  /** @type {number} */

  duration;
  /** @type {Array} */

  reforks = [];
  /** @type {Object} */

  attachedEnv;
  /** @type {Object} */

  disconnects = {};
  /** @type {number} */

  disconnectCount = 0;
  /** @type {number} */

  unexpectedCount = 0; // 1 min

  /**
   * @param {ForkConfig} [p]
   */

  constructor(p = {}) {
    if (cluster.isWorker) {
      return void 0;
    }

    this.count = p.count ?? (os.cpus().length - 1 || 1);
    this.refork = p.refork ?? true;
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

        if (settings !== null && settings !== void 0 && (_settings$args = settings.args) !== null && _settings$args !== void 0 && _settings$args.length) {
          args.push('--', ...settings.args);
        }

        settings.exec = './node_modules/.bin/istanbul';
        settings.args = args;
      }

      cluster.setupMaster(settings);
    }

    cluster.on(DISCONNECT, this.onDisconnect.bind(this));
    cluster.on(EXIT, this.onExit.bind(this)); // defer to set the listeners, so that these listeners can be customized

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

    for (let i = 0; i < this.count; i++) {
      this.graduate();
    } // fork slaves after workers are forked


    if (p.slaves) {
      const slaves = Array.isArray(p.slaves) ? p.slaves : [p.slaves];

      for (const settings of slaves.map(this.normalizeSlaveConfig)) if (settings) {
        this.graduate({
          settings
        });
      }
    }
  }
  /**
   * @param {ForkConfig} p
   * @return {Institute}
   */


  static build(p) {
    return new Institute(p);
  }
  /** @return {module:cluster.Cluster} */


  getCluster() {
    return cluster;
  }

  graduate({
    env = this.attachedEnv,
    settings,
    gene
  } = {}) {
    if (settings) cluster.setupMaster(settings);
    const worker = cluster.fork(env);
    worker[GENE] = gene ?? settings ?? cluster.settings;
    return worker;
  }
  /** allow refork */


  get allowRefork() {
    if (!this.refork) {
      return false;
    }

    if (this.reforks.push(Date.now()) > this.limit) {
      this.reforks.shift();
    }

    return this.withinForkLimit || (cluster.emit(REACH_REFORK_LIMIT), false);
  }

  get withinForkLimit() {
    const {
      reforks
    } = this,
          span = reforks[reforks.length - 1] - reforks[0];
    return reforks.length < this.limit || span > this.duration;
  }

  onDisconnect(worker) {
    var _ref;

    const logger = this.logger.level(worker[DISABLE_REFORK] ? INFO : ERROR);
    const W = by(worker, WORKER);
    this.disconnectCount++;
    _ref = `${W} disconnects (${decoFlat(this.exitInfo({
      worker
    }))})`, logger(_ref);

    if (worker !== null && worker !== void 0 && worker.isDead()) {
      var _ref2;

      // worker has terminated before disconnect
      return void (_ref2 = `not forking, because ${W} exit event emits before disconnect`, logger(_ref2));
    }

    if (worker[DISABLE_REFORK]) {
      var _ref3;

      // worker has terminated by master, like egg-cluster master will set disableRefork to true
      return void (_ref3 = `not forking, because ${W} will be killed soon`, logger(_ref3));
    }

    this.disconnects[worker.process.pid] = dateTime();

    if (!this.allowRefork) {
      var _ref4;

      _ref4 = `not forking new worker (refork: ${this.refork})`, logger(_ref4);
    } else {
      var _ref5;

      const newWorker = this.graduate({
        settings: worker[GENE]
      });
      _ref5 = `${dateTime()} new ${by(newWorker, WORKER)} fork (state: ${newWorker.state})`, logger(_ref5);
    }
  }

  onExit(worker, code, signal) {
    var _ref6;

    const logger = this.logger.level(worker[DISABLE_REFORK] ? INFO : ERROR);
    const W = by(worker, WORKER);
    const isExpected = !!this.disconnects[worker.process.pid];
    const info = this.exitInfo({
      worker,
      code,
      signal
    });
    _ref6 = `${W} exit (${decoFlat(info)}) isExpected (${isExpected})`, logger(_ref6);

    if (isExpected) {
      return void delete this.disconnects[worker.process.pid];
    } // worker disconnect first, exit expected


    if (worker[DISABLE_REFORK]) {
      return void 0;
    } // worker is killed by master


    this.unexpectedCount++;

    if (!this.allowRefork) {
      var _ref7;

      _ref7 = `not forking new worker (refork: ${this.refork})`, logger(_ref7);
    } else {
      var _ref8;

      const newWorker = this.graduate({
        settings: worker[GENE]
      });
      _ref8 = `new ${by(newWorker, WORKER)} fork (state: ${newWorker.state})`, logger(_ref8);
    }

    cluster.emit(UNEXPECTED_EXIT, worker, code, signal);
  }

  onUncaughtException(err) {
    var _ref9, _ref10, _ref11;

    // uncaughtException default handler
    if (!err) {
      return;
    }

    _ref9 = `master uncaughtException: ${err.stack}`, this.logger.level(ERROR)(_ref9);
    _ref10 = `[error] ${err}`, this.logger(_ref10);
    _ref11 = `(total ${this.disconnectCount} disconnect, ${this.unexpectedCount} unexpected exit)`, this.logger(_ref11);
  }

  onUnexpectedExit(worker, code, signal) {
    var _worker, _ref12;

    // unexpectedExit default handler
    const exitCode = worker.process.exitCode;
    const exitKey = (_worker = worker, workerExitKey(_worker));
    const err = new Error(`${by(worker, WORKER)} died unexpectedly (code: ${exitCode}, signal: ${signal}, ${exitKey}: ${worker[exitKey]}, state: ${worker.state})`);
    err.name = 'WorkerDiedUnexpectedError';
    _ref12 = `(total ${this.disconnectCount} disconnect, ${this.unexpectedCount} unexpected exit) ${err.stack}`, this.logger.level(ERROR)(_ref12);
  }

  onReachReforkLimit() {
    var _ref13;

    // reachReforkLimit default handler
    _ref13 = `worker died too fast (total ${this.disconnectCount} disconnect, ${this.unexpectedCount} unexpected exit)`, this.logger.level(ERROR)(_ref13);
  }

  exitInfo({
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

export { Institute };
