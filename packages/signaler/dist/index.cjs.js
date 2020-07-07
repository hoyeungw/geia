'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var enumEvents = require('@geia/enum-events');
var enumRoles = require('@geia/enum-roles');
var enumSignals = require('@geia/enum-signals');
var says = require('@palett/says');
var logger = require('@spare/logger');
var timestampPretty = require('@valjoux/timestamp-pretty');
var cluster = _interopDefault(require('cluster'));
var co = _interopDefault(require('co'));
var awaitEvent = _interopDefault(require('await-event'));
var pstree = _interopDefault(require('ps-tree'));

function createCommonjsModule(fn, basedir, module) {
	return module = {
	  path: basedir,
	  exports: {},
	  require: function (path, base) {
      return commonjsRequire(path, (base === undefined || base === null) ? module.path : base);
    }
	}, fn(module, module.exports), module.exports;
}

function commonjsRequire () {
	throw new Error('Dynamic requires are not currently supported by @rollup/plugin-commonjs');
}

/**
 * Helpers.
 */
var s = 1000;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var w = d * 7;
var y = d * 365.25;
/**
 * Parse or format the given `val`.
 *
 * Options:
 *
 *  - `long` verbose formatting [false]
 *
 * @param {String|Number} val
 * @param {Object} [options]
 * @throws {Error} throw an error if val is not a non-empty string or a number
 * @return {String|Number}
 * @api public
 */

var ms = function (val, options) {
  options = options || {};
  var type = typeof val;

  if (type === 'string' && val.length > 0) {
    return parse(val);
  } else if (type === 'number' && isFinite(val)) {
    return options.long ? fmtLong(val) : fmtShort(val);
  }

  throw new Error('val is not a non-empty string or a valid number. val=' + JSON.stringify(val));
};
/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */


function parse(str) {
  str = String(str);

  if (str.length > 100) {
    return;
  }

  var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(str);

  if (!match) {
    return;
  }

  var n = parseFloat(match[1]);
  var type = (match[2] || 'ms').toLowerCase();

  switch (type) {
    case 'years':
    case 'year':
    case 'yrs':
    case 'yr':
    case 'y':
      return n * y;

    case 'weeks':
    case 'week':
    case 'w':
      return n * w;

    case 'days':
    case 'day':
    case 'd':
      return n * d;

    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
    case 'h':
      return n * h;

    case 'minutes':
    case 'minute':
    case 'mins':
    case 'min':
    case 'm':
      return n * m;

    case 'seconds':
    case 'second':
    case 'secs':
    case 'sec':
    case 's':
      return n * s;

    case 'milliseconds':
    case 'millisecond':
    case 'msecs':
    case 'msec':
    case 'ms':
      return n;

    default:
      return undefined;
  }
}
/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */


function fmtShort(ms) {
  var msAbs = Math.abs(ms);

  if (msAbs >= d) {
    return Math.round(ms / d) + 'd';
  }

  if (msAbs >= h) {
    return Math.round(ms / h) + 'h';
  }

  if (msAbs >= m) {
    return Math.round(ms / m) + 'm';
  }

  if (msAbs >= s) {
    return Math.round(ms / s) + 's';
  }

  return ms + 'ms';
}
/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */


function fmtLong(ms) {
  var msAbs = Math.abs(ms);

  if (msAbs >= d) {
    return plural(ms, msAbs, d, 'day');
  }

  if (msAbs >= h) {
    return plural(ms, msAbs, h, 'hour');
  }

  if (msAbs >= m) {
    return plural(ms, msAbs, m, 'minute');
  }

  if (msAbs >= s) {
    return plural(ms, msAbs, s, 'second');
  }

  return ms + ' ms';
}
/**
 * Pluralization helper.
 */


function plural(ms, msAbs, n, name) {
  var isPlural = msAbs >= n * 1.5;
  return Math.round(ms / n) + ' ' + name + (isPlural ? 's' : '');
}

var koSleep = createCommonjsModule(function (module, exports) {
  var sleep = function (time) {
    time = isNaN(time) ? ms(time) : time;
    return new Promise(function (resolve, reject) {
      setTimeout(function () {
        resolve();
      }, time);
    });
  };

  module.exports = exports = sleep;
});

var sleep = koSleep;

const terminate = function* (subProcess, timeout) {
  var _subProcess$process;

  const {
    pid
  } = (_subProcess$process = subProcess.process) !== null && _subProcess$process !== void 0 ? _subProcess$process : subProcess;
  const childPids = yield getChildPids(pid);
  yield [killProcess(subProcess, timeout), killChildren(childPids, timeout)];
}; // kill process, if SIGTERM not work, try SIGKILL

function* killProcess(subProcess, timeout) {
  subProcess.kill(enumSignals.SIGTERM);
  yield Promise.race([awaitEvent(subProcess, enumEvents.EXIT), sleep(timeout)]);
  if (subProcess.killed) return; // SIGKILL: http://man7.org/linux/man-pages/man7/signal.7.html
  // worker: https://github.com/nodejs/node/blob/master/lib/internal/cluster/worker.js#L22
  // subProcess.kill is wrapped to subProcess.destroy, it will wait to disconnected.

  (subProcess.process || subProcess).kill(enumSignals.SIGKILL);
} // kill all children processes, if SIGTERM not work, try SIGKILL


function* killChildren(children, timeout) {
  if (!children.length) return;
  kill(children, enumSignals.SIGTERM);
  const start = Date.now(); // if timeout is 1000, it will check twice.

  const checkInterval = 400;
  let unterminated = [];

  while (Date.now() - start < timeout - checkInterval) {
    yield sleep(checkInterval);
    unterminated = getUnterminatedProcesses(children);
    if (!unterminated.length) return;
  }

  kill(unterminated, enumSignals.SIGKILL);
}

function getChildPids(pid) {
  return new Promise(resolve => {
    pstree(pid, (err, children) => {
      // if get children error, just ignore it
      if (err) children = [];
      resolve(children.map(children => parseInt(children.PID)));
    });
  });
}

function kill(pids, signal) {
  for (const pid of pids) {
    try {
      process.kill(pid, signal);
    } catch (_) {} // ignore

  }
}

function getUnterminatedProcesses(pids) {
  return pids.filter(pid => {
    try {
      return process.kill(pid, 0), true;
    } // success means it's still alive
    catch (err) {
      return false;
    } // error means it's dead

  });
}

const SIGNALER = 'signaler';
const TIMEOUT = 1800;
class Signaler {
  /**
   * SIGINT kill(2) Ctrl-C
   * SIGQUIT kill(3) Ctrl-\
   * SIGTERM kill(15) default
   *
   * @param {*} instance
   * @param {EventEmitter} subProcess
   * @param {*[]} [signals]
   */
  static register(instance, subProcess, signals = [enumSignals.SIGINT, enumSignals.SIGQUIT, enumSignals.SIGTERM]) {
    for (let signal of signals) {
      subProcess.once(signal, processOnSignal.bind(instance, signal));
    }

    subProcess.once(enumEvents.EXIT, processOnExit.bind(instance));
  }

}
function processOnSignal(signal) {
  var _ref;

  if (this.closed) return;
  _ref = `receive signal ${says.ros(signal)}, closing`, says.says[SIGNALER].p(timestampPretty.dateTime())(_ref);
  this.closed = true;
  const context = this;
  co(function* () {
    try {
      var _ref2;

      yield genCloseWorkers(cluster.workers);
      yield genCloseAgent(context.agent);
      _ref2 = `close done, exiting with code: ${says.ros('0')}`, says.says[SIGNALER].p(timestampPretty.dateTime())(_ref2);
      process.exit(0);
    } catch (e) {
      var _ref3;

      _ref3 = `close with error: ${e}`, says.says[SIGNALER].p(timestampPretty.dateTime())(_ref3);
      process.exit(1);
    }
  });
}
function processOnExit(code) {
  var _ref4;

  _ref4 = `exit with code: ${says.ros(String(code))}`, says.says[SIGNALER].p(timestampPretty.dateTime())(_ref4);
}
function* genCloseWorkers(workers) {
  var _ref5, _ref6;

  const timeout = process.env.LEA_APP_CLOSE_TIMEOUT || process.env.LEA_MASTER_CLOSE_TIMEOUT || TIMEOUT;
  _ref5 = `send kill ${says.ros(enumSignals.SIGTERM)} to ${says.ros(enumRoles.APP)} workers, will exit with code ${says.ros('0')} after ${timeout}ms`, says.says[SIGNALER].p(timestampPretty.dateTime())(_ref5);
  _ref6 = `wait ${timeout}ms`, says.says[SIGNALER].p(timestampPretty.dateTime())(_ref6);

  try {
    yield killAppWorkers(workers, timeout);
  } catch (e) {
    var _ref7;

    _ref7 = `${says.ros(enumRoles.APP)} workers exit error: ${e}`, says.says[SIGNALER].p(timestampPretty.dateTime())(_ref7);
  }
}
function* genCloseAgent(agent) {
  var _ref8, _ref9;

  const timeout = process.env.LEA_AGENT_CLOSE_TIMEOUT || process.env.LEA_MASTER_CLOSE_TIMEOUT || TIMEOUT;
  _ref8 = `send kill ${says.ros(enumSignals.SIGTERM)} to ${says.ros(enumRoles.AGENT)} worker, will exit with code ${says.ros('0')} after ${timeout}ms`, says.says[SIGNALER].p(timestampPretty.dateTime())(_ref8);
  _ref9 = `wait ${timeout}ms`, says.says[SIGNALER].p(timestampPretty.dateTime())(_ref9);

  try {
    yield killAgentWorker(agent, timeout);
  } catch (e) {
    var _ref10;

    _ref10 = `${says.ros(enumRoles.AGENT)} worker exit error: ${e}`, says.says[SIGNALER].p(timestampPretty.dateTime())(_ref10);
  }
}

const killAppWorkers = function (workers, timeout) {
  return co(function* () {
    yield Object.keys(workers).map(id => {
      const worker = workers[id];
      worker.disableRefork = true;
      return terminate(worker, timeout);
    });
  });
};
/**
 * close agent worker, App Worker will closed by cluster
 *
 * https://www.exratione.com/2013/05/die-child-process-die/
 * make sure Agent Worker exit before master exit
 *
 * @param agent
 * @param {number} timeout - kill agent timeout
 * @return {Promise} -
 */


const killAgentWorker = function (agent, timeout) {
  if (agent) {
    var _ref11;

    _ref11 = `kill ${says.ros(enumRoles.AGENT)} worker with signal ${says.ros(enumSignals.SIGTERM)}`, logger.logger(_ref11);
    agent.removeAllListeners();
  }

  return co(function* () {
    yield terminate(agent, timeout);
  });
};

exports.Signaler = Signaler;
