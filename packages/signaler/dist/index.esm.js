import { EXIT } from '@geia/enum-events';
import { APP, AGENT } from '@geia/enum-roles';
import { SIGTERM, SIGKILL, SIGINT, SIGQUIT } from '@geia/enum-signals';
import { says, ros } from '@palett/says';
import { dateTime } from '@valjoux/timestamp-pretty';
import cluster from 'cluster';
import co from 'co';
import descendantPids from '@geia/descendant-pids';
import awaitEvent from 'await-event';

function createCommonjsModule(fn) {
  var module = { exports: {} };
	return fn(module, module.exports), module.exports;
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

  module.exports = sleep;
});

var sleep = koSleep;

const terminate = function* (subProcess, timeout) {
  var _subProcess$process;

  const {
    pid
  } = (_subProcess$process = subProcess.process) !== null && _subProcess$process !== void 0 ? _subProcess$process : subProcess;
  const pids = yield descendantPids(pid);
  yield [killProcess(subProcess, timeout), killDescendants(pids, timeout)];
}; // kill process, if SIGTERM not work, try SIGKILL

function* killProcess(subProcess, timeout) {
  subProcess.kill(SIGTERM);
  yield Promise.race([awaitEvent(subProcess, EXIT), sleep(timeout)]);
  if (subProcess.killed) return; // SIGKILL: http://man7.org/linux/man-pages/man7/signal.7.html
  // worker: https://github.com/nodejs/node/blob/master/lib/internal/cluster/worker.js#L22
  // subProcess.kill is wrapped to subProcess.destroy, it will wait to disconnected.

  (subProcess.process || subProcess).kill(SIGKILL);
} // kill all children processes, if SIGTERM not work, try SIGKILL


function* killDescendants(pids, timeout) {
  if (!pids.length) return;
  kill(pids, SIGTERM);
  const start = Date.now(); // if timeout is 1000, it will check twice.

  const checkInterval = 400;
  let unterminated = [];

  while (Date.now() - start < timeout - checkInterval) {
    yield sleep(checkInterval);
    unterminated = getUnterminatedProcesses(pids);
    if (!unterminated.length) return;
  }

  kill(unterminated, SIGKILL);
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
const logger = says[SIGNALER].attach(dateTime);
/**
 * @typedef {NodeJS.Process} Process
 * @typedef {module:child_process.ChildProcess} ChildProcess
 * @typedef {Array|NodeJS.Dict<Worker>} WorkerHashTable
 *
 * @typedef {Object} SignalerConfig
 * @typedef {boolean}         [SignalerConfig.closed]
 * @typedef {Process}         [SignalerConfig.process]
 * @typedef {WorkerHashTable} [SignalerConfig.workers]
 * @typedef {ChildProcess}    [SignalerConfig.agent]
 * @typedef {string[]}        [SignalerConfig.signals]
 */

class Signaler {
  /**
   * SIGINT kill(2) Ctrl-C
   * SIGQUIT kill(3) Ctrl-\
   * SIGTERM kill(15) default
   *
   * @param {SignalerConfig} o
   */
  static register(o) {
    var _o$signals;

    const signals = (_o$signals = o.signals) !== null && _o$signals !== void 0 ? _o$signals : [SIGINT, SIGQUIT, SIGTERM];
    if (!o.process) o.process = process;
    if (!o.workers) o.workers = cluster.workers;

    for (let signal of signals) {
      o.process.once(signal, processOnSignal.bind(o, signal));
    }

    o.process.once(EXIT, processOnExit.bind(o));
  }

}
function processOnSignal(signal) {
  var _ref;

  /** @type {Signaler}  */
  const context = this;
  /** @type {Process}  */

  const proc = context.process;

  if (context.closed) {
    return void 0;
  } else {
    context.closed = true;
  }

  _ref = `receive signal ${ros(signal)}, closing`, logger(_ref);
  co(function* () {
    try {
      var _ref2;

      yield genCloseWorkers.call(context, context.workers, proc.env.LEA_APP_CLOSE_TIMEOUT || proc.env.LEA_MASTER_CLOSE_TIMEOUT || TIMEOUT);
      yield genCloseAgent.call(context, context.agent, proc.env.LEA_AGENT_CLOSE_TIMEOUT || proc.env.LEA_MASTER_CLOSE_TIMEOUT || TIMEOUT);
      _ref2 = `close done, exiting with code: ${ros('0')}`, logger(_ref2);
      proc.exit(0);
    } catch (e) {
      var _ref3;

      _ref3 = `close with error: ${e}`, logger(_ref3);
      proc.exit(1);
    }
  });
}
function processOnExit(code) {
  var _ref4;

  _ref4 = `exit with code: ${ros(String(code))}`, logger(_ref4);
}
function* genCloseWorkers(workers, timeout) {
  var _ref5, _ref6;

  if (!workers) {
    var _workersNotSetSki;

    return void (_workersNotSetSki = 'workers not set, skip closing workers', logger(_workersNotSetSki));
  }

  _ref5 = `send kill ${ros(SIGTERM)} to ${ros(APP)} workers, will exit with code ${ros('0')} after ${timeout}ms`, logger(_ref5);
  _ref6 = `wait ${timeout}ms`, logger(_ref6);

  try {
    yield killAppWorkers(workers, timeout);
  } catch (e) {
    var _ref7;

    _ref7 = `${ros(APP)} workers exit error: ${e}`, logger(_ref7);
  }
}
function* genCloseAgent(agent, timeout) {
  var _ref8, _ref9;

  if (!agent) {
    var _agentNotSetSkip;

    return void (_agentNotSetSkip = 'agent not set, skip closing agent', logger(_agentNotSetSkip));
  }

  _ref8 = `send kill ${ros(SIGTERM)} to ${ros(AGENT)} worker, will exit with code ${ros('0')} after ${timeout}ms`, logger(_ref8);
  _ref9 = `wait ${timeout}ms`, logger(_ref9);

  try {
    yield killAgentWorker(agent, timeout);
  } catch (e) {
    var _ref10;

    _ref10 = `${ros(AGENT)} worker exit error: ${e}`, logger(_ref10);
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

    _ref11 = `kill ${ros(AGENT)} worker with signal ${ros(SIGTERM)}`, logger(_ref11);
    agent.removeAllListeners();
  }

  return co(function* () {
    yield terminate(agent, timeout);
  });
};

export { Signaler };
