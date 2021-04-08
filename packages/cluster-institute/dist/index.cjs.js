'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var by = require('@geia/by');
var enumEvents = require('@geia/enum-events');
var enumRoles = require('@geia/enum-roles');
var says = require('@palett/says');
var enumLoggers = require('@spare/enum-loggers');
var logger = require('@spare/logger');
var nullish = require('@typen/nullish');
var timestampPretty = require('@valjoux/timestamp-pretty');
var cluster = require('cluster');
var os = require('os');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var cluster__default = /*#__PURE__*/_interopDefaultLegacy(cluster);
var os__default = /*#__PURE__*/_interopDefaultLegacy(os);

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

  /** @type {*} */

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
   * @param {ForkConfig} [p]
   */
  constructor(p = {}) {
    var _p$count, _p$refork;

    _defineProperty(this, "name", by.by(process, enumRoles.MASTER));

    _defineProperty(this, "logger", says.says[this.name].attach(timestampPretty.dateTime));

    _defineProperty(this, "count", void 0);

    _defineProperty(this, "refork", void 0);

    _defineProperty(this, "limit", void 0);

    _defineProperty(this, "duration", void 0);

    _defineProperty(this, "reforks", []);

    _defineProperty(this, "attachedEnv", void 0);

    _defineProperty(this, "disconnects", {});

    _defineProperty(this, "disconnectCount", 0);

    _defineProperty(this, "unexpectedCount", 0);

    if (cluster__default['default'].isWorker) {
      return void 0;
    }

    this.count = (_p$count = p.count) !== null && _p$count !== void 0 ? _p$count : os__default['default'].cpus().length - 1 || 1;
    this.refork = (_p$refork = p.refork) !== null && _p$refork !== void 0 ? _p$refork : true;
    this.limit = p.limit || 60;
    this.duration = p.duration || 60000;
    this.attachedEnv = p.env || {};

    if (p.exec) {
      const settings = {
        exec: p.exec
      };

      if (!nullish.nullish(p.execArgv)) {
        settings.execArgv = p.execArgv;
      }

      if (!nullish.nullish(p.args)) {
        settings.args = p.args;
      }

      if (!nullish.nullish(p.silent)) {
        settings.silent = p.silent;
      }

      if (!nullish.nullish(p.windowsHide)) {
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

      cluster__default['default'].setupMaster(settings);
    }

    cluster__default['default'].on(enumEvents.DISCONNECT, this.onDisconnect.bind(this));
    cluster__default['default'].on(enumEvents.EXIT, this.onExit.bind(this)); // defer to set the listeners, so that these listeners can be customized

    defer(() => {
      if (!process.listeners(enumEvents.UNCAUGHT_EXCEPTION).length) {
        process.on(enumEvents.UNCAUGHT_EXCEPTION, this.onUncaughtException.bind(this));
      }

      if (!cluster__default['default'].listeners(UNEXPECTED_EXIT).length) {
        cluster__default['default'].on(UNEXPECTED_EXIT, this.onUnexpectedExit.bind(this));
      }

      if (!cluster__default['default'].listeners(REACH_REFORK_LIMIT).length) {
        cluster__default['default'].on(REACH_REFORK_LIMIT, this.onReachReforkLimit.bind(this));
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
    return cluster__default['default'];
  }

  graduate({
    env = this.attachedEnv,
    settings,
    gene
  } = {}) {
    var _ref;

    if (settings) cluster__default['default'].setupMaster(settings);
    const worker = cluster__default['default'].fork(env);
    worker[GENE] = (_ref = gene !== null && gene !== void 0 ? gene : settings) !== null && _ref !== void 0 ? _ref : cluster__default['default'].settings;
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

    return this.withinForkLimit || (cluster__default['default'].emit(REACH_REFORK_LIMIT), false);
  }

  get withinForkLimit() {
    const {
      reforks
    } = this,
          span = reforks[reforks.length - 1] - reforks[0];
    return reforks.length < this.limit || span > this.duration;
  }

  onDisconnect(worker) {
    var _ref2;

    const logger$1 = this.logger.level(worker[DISABLE_REFORK] ? enumLoggers.INFO : enumEvents.ERROR);
    const W = by.by(worker, enumRoles.WORKER);
    this.disconnectCount++;
    _ref2 = `${W} disconnects (${logger.decoFlat(this.exitInfo({
      worker
    }))})`, logger$1(_ref2);

    if (worker !== null && worker !== void 0 && worker.isDead()) {
      var _ref3;

      // worker has terminated before disconnect
      return void (_ref3 = `not forking, because ${W} exit event emits before disconnect`, logger$1(_ref3));
    }

    if (worker[DISABLE_REFORK]) {
      var _ref4;

      // worker has terminated by master, like egg-cluster master will set disableRefork to true
      return void (_ref4 = `not forking, because ${W} will be killed soon`, logger$1(_ref4));
    }

    this.disconnects[worker.process.pid] = timestampPretty.dateTime();

    if (!this.allowRefork) {
      var _ref5;

      _ref5 = `not forking new worker (refork: ${this.refork})`, logger$1(_ref5);
    } else {
      var _ref6;

      const newWorker = this.graduate({
        settings: worker[GENE]
      });
      _ref6 = `${timestampPretty.dateTime()} new ${by.by(newWorker, enumRoles.WORKER)} fork (state: ${newWorker.state})`, logger$1(_ref6);
    }
  }

  onExit(worker, code, signal) {
    var _ref7;

    const logger$1 = this.logger.level(worker[DISABLE_REFORK] ? enumLoggers.INFO : enumEvents.ERROR);
    const W = by.by(worker, enumRoles.WORKER);
    const isExpected = !!this.disconnects[worker.process.pid];
    const info = this.exitInfo({
      worker,
      code,
      signal
    });
    _ref7 = `${W} exit (${logger.decoFlat(info)}) isExpected (${isExpected})`, logger$1(_ref7);

    if (isExpected) {
      return void delete this.disconnects[worker.process.pid];
    } // worker disconnect first, exit expected


    if (worker[DISABLE_REFORK]) {
      return void 0;
    } // worker is killed by master


    this.unexpectedCount++;

    if (!this.allowRefork) {
      var _ref8;

      _ref8 = `not forking new worker (refork: ${this.refork})`, logger$1(_ref8);
    } else {
      var _ref9;

      const newWorker = this.graduate({
        settings: worker[GENE]
      });
      _ref9 = `new ${by.by(newWorker, enumRoles.WORKER)} fork (state: ${newWorker.state})`, logger$1(_ref9);
    }

    cluster__default['default'].emit(UNEXPECTED_EXIT, worker, code, signal);
  }

  onUncaughtException(err) {
    var _ref10, _ref11, _ref12;

    // uncaughtException default handler
    if (!err) {
      return;
    }

    _ref10 = `master uncaughtException: ${err.stack}`, this.logger.level(enumEvents.ERROR)(_ref10);
    _ref11 = `[error] ${err}`, this.logger(_ref11);
    _ref12 = `(total ${this.disconnectCount} disconnect, ${this.unexpectedCount} unexpected exit)`, this.logger(_ref12);
  }

  onUnexpectedExit(worker, code, signal) {
    var _worker, _ref13;

    // unexpectedExit default handler
    const exitCode = worker.process.exitCode;
    const exitKey = (_worker = worker, workerExitKey(_worker));
    const err = new Error(`${by.by(worker, enumRoles.WORKER)} died unexpectedly (code: ${exitCode}, signal: ${signal}, ${exitKey}: ${worker[exitKey]}, state: ${worker.state})`);
    err.name = 'WorkerDiedUnexpectedError';
    _ref13 = `(total ${this.disconnectCount} disconnect, ${this.unexpectedCount} unexpected exit) ${err.stack}`, this.logger.level(enumEvents.ERROR)(_ref13);
  }

  onReachReforkLimit() {
    var _ref14;

    // reachReforkLimit default handler
    _ref14 = `worker died too fast (total ${this.disconnectCount} disconnect, ${this.unexpectedCount} unexpected exit)`, this.logger.level(enumEvents.ERROR)(_ref14);
  }

  exitInfo({
    worker,
    code,
    signal
  } = {}) {
    var _worker2;

    const exitKey = (_worker2 = worker, workerExitKey(_worker2));
    const info = {};
    if (!nullish.nullish(code)) info.code = code;
    if (!nullish.nullish(signal)) info.signal = signal;
    if (!nullish.nullish(exitKey)) info[exitKey] = worker[exitKey];
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

exports.Institute = Institute;
