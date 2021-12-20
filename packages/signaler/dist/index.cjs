'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var enumEvents = require('@geia/enum-events');
var enumRoles = require('@geia/enum-roles');
var enumSignals = require('@geia/enum-signals');
var says = require('@spare/says');
var timestampPretty = require('@valjoux/timestamp-pretty');
var cluster = require('cluster');
var co = require('co');
var descendantPids = require('@geia/descendant-pids');
var awaitEvent = require('await-event');
var sleep = require('ko-sleep');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var cluster__default = /*#__PURE__*/_interopDefaultLegacy(cluster);
var co__default = /*#__PURE__*/_interopDefaultLegacy(co);
var awaitEvent__default = /*#__PURE__*/_interopDefaultLegacy(awaitEvent);
var sleep__default = /*#__PURE__*/_interopDefaultLegacy(sleep);

const terminate = function* (subProcess, timeout) {
  const {
    pid
  } = subProcess.process ?? subProcess;
  const pids = yield descendantPids.descendantPids(pid);
  yield [killProcess(subProcess, timeout), killDescendants(pids, timeout)];
}; // kill process, if SIGTERM not work, try SIGKILL

function* killProcess(subProcess, timeout) {
  subProcess.kill(enumSignals.SIGTERM);
  yield Promise.race([awaitEvent__default["default"](subProcess, enumEvents.EXIT), sleep__default["default"](timeout)]);
  if (subProcess.killed) return; // SIGKILL: http://man7.org/linux/man-pages/man7/signal.7.html
  // worker: https://github.com/nodejs/node/blob/master/lib/internal/cluster/worker.js#L22
  // subProcess.kill is wrapped to subProcess.destroy, it will wait to disconnected.

  (subProcess.process || subProcess).kill(enumSignals.SIGKILL);
} // kill all children processes, if SIGTERM not work, try SIGKILL


function* killDescendants(pids, timeout) {
  if (!pids.length) return;
  kill(pids, enumSignals.SIGTERM);
  const start = Date.now(); // if timeout is 1000, it will check twice.

  const checkInterval = 400;
  let unterminated = [];

  while (Date.now() - start < timeout - checkInterval) {
    yield sleep__default["default"](checkInterval);
    unterminated = getUnterminatedProcesses(pids);
    if (!unterminated.length) return;
  }

  kill(unterminated, enumSignals.SIGKILL);
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
const logger = says.says[SIGNALER].attach(timestampPretty.dateTime);
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
    const signals = o.signals ?? [enumSignals.SIGINT, enumSignals.SIGQUIT, enumSignals.SIGTERM];
    if (!o.process) o.process = process;
    if (!o.workers) o.workers = cluster__default["default"].workers;

    for (let signal of signals) {
      o.process.once(signal, processOnSignal.bind(o, signal));
    }

    o.process.once(enumEvents.EXIT, processOnExit.bind(o));
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

  _ref = `receive signal ${says.ros(signal)}, closing`, logger(_ref);
  co__default["default"](function* () {
    try {
      var _ref2;

      yield genCloseWorkers.call(context, context.workers, proc.env.GEIA_APP_CLOSE_TIMEOUT || proc.env.GEIA_MASTER_CLOSE_TIMEOUT || TIMEOUT);
      yield genCloseAgent.call(context, context.agent, proc.env.GEIA_AGENT_CLOSE_TIMEOUT || proc.env.GEIA_MASTER_CLOSE_TIMEOUT || TIMEOUT);
      _ref2 = `close done, exiting with code: ${says.ros('0')}`, logger(_ref2);
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

  _ref4 = `exit with code: ${says.ros(String(code))}`, logger(_ref4);
}
function* genCloseWorkers(workers, timeout) {
  var _ref5, _ref6;

  if (!workers) {
    var _workersNotSetSki;

    return void (_workersNotSetSki = 'workers not set, skip closing workers', logger(_workersNotSetSki));
  }

  _ref5 = `send kill ${says.ros(enumSignals.SIGTERM)} to ${says.ros(enumRoles.APP)} workers, will exit with code ${says.ros('0')} after ${timeout}ms`, logger(_ref5);
  _ref6 = `wait ${timeout}ms`, logger(_ref6);

  try {
    yield killAppWorkers(workers, timeout);
  } catch (e) {
    var _ref7;

    _ref7 = `${says.ros(enumRoles.APP)} workers exit error: ${e}`, logger(_ref7);
  }
}
function* genCloseAgent(agent, timeout) {
  var _ref8, _ref9;

  if (!agent) {
    var _agentNotSetSkip;

    return void (_agentNotSetSkip = 'agent not set, skip closing agent', logger(_agentNotSetSkip));
  }

  _ref8 = `send kill ${says.ros(enumSignals.SIGTERM)} to ${says.ros(enumRoles.AGENT)} worker, will exit with code ${says.ros('0')} after ${timeout}ms`, logger(_ref8);
  _ref9 = `wait ${timeout}ms`, logger(_ref9);

  try {
    yield killAgentWorker(agent, timeout);
  } catch (e) {
    var _ref10;

    _ref10 = `${says.ros(enumRoles.AGENT)} worker exit error: ${e}`, logger(_ref10);
  }
}

const killAppWorkers = function (workers, timeout) {
  return co__default["default"](function* () {
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

    _ref11 = `kill ${says.ros(enumRoles.AGENT)} worker with signal ${says.ros(enumSignals.SIGTERM)}`, logger(_ref11);
    agent.removeAllListeners();
  }

  return co__default["default"](function* () {
    yield terminate(agent, timeout);
  });
};

exports.Signaler = Signaler;
