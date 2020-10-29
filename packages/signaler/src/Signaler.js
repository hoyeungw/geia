import { EXIT }                     from '@geia/enum-events'
import { AGENT, APP }               from '@geia/enum-roles'
import { SIGINT, SIGQUIT, SIGTERM } from '@geia/enum-signals'
import { ros, says }                from '@palett/says'
import { dateTime }                 from '@valjoux/timestamp-pretty'
import cluster                      from 'cluster'
import co                           from 'co'
import { terminate }                from './terminate'

const SIGNALER = 'signaler'
const TIMEOUT = 1800
const logger = says[SIGNALER].attach(dateTime)


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

export class Signaler {
  /**
   * SIGINT kill(2) Ctrl-C
   * SIGQUIT kill(3) Ctrl-\
   * SIGTERM kill(15) default
   *
   * @param {SignalerConfig} o
   */
  static register(o) {
    const signals = o.signals ?? [SIGINT, SIGQUIT, SIGTERM]
    if (!o.process) o.process = process
    if (!o.workers) o.workers = cluster.workers
    for (let signal of signals) {
      o.process.once(signal, processOnSignal.bind(o, signal))
    }
    o.process.once(EXIT, processOnExit.bind(o))
  }
}

export function processOnSignal(signal) {
  /** @type {Signaler}  */ const context = this
  /** @type {Process}  */ const proc = context.process
  if (context.closed) { return void 0 } else { context.closed = true }
  `receive signal ${ ros(signal) }, closing` |> logger
  co(function* () {
    try {
      yield genCloseWorkers.call(context, context.workers, proc.env.LEA_APP_CLOSE_TIMEOUT || proc.env.LEA_MASTER_CLOSE_TIMEOUT || TIMEOUT)
      yield genCloseAgent.call(context, context.agent, proc.env.LEA_AGENT_CLOSE_TIMEOUT || proc.env.LEA_MASTER_CLOSE_TIMEOUT || TIMEOUT);
      `close done, exiting with code: ${ ros('0') }` |> logger
      proc.exit(0)
    }
    catch (e) {
      `close with error: ${ e }` |> logger
      proc.exit(1)
    }
  })
}

export function processOnExit(code) { `exit with code: ${ ros(String(code)) }`  |> logger }

export function* genCloseWorkers(workers, timeout) {
  if (!workers) { return void ('workers not set, skip closing workers' |> logger) }
  `send kill ${ ros(SIGTERM) } to ${ ros(APP) } workers, will exit with code ${ ros('0') } after ${ timeout }ms` |> logger;
  `wait ${ timeout }ms` |> logger
  try { yield killAppWorkers(workers, timeout) }
  catch (e) { `${ ros(APP) } workers exit error: ${ e }`  |> logger }
}

export function* genCloseAgent(agent, timeout) {
  if (!agent) { return void ('agent not set, skip closing agent' |> logger) }
  `send kill ${ ros(SIGTERM) } to ${ ros(AGENT) } worker, will exit with code ${ ros('0') } after ${ timeout }ms` |> logger;
  `wait ${ timeout }ms` |> logger
  try { yield killAgentWorker(agent, timeout) }
  catch (e) { `${ ros(AGENT) } worker exit error: ${ e }` |> logger }
}

const killAppWorkers = function (workers, timeout) {
  return co(function* () {
    yield Object.keys(workers).map(id => {
      const worker = workers[id]
      worker.disableRefork = true
      return terminate(worker, timeout)
    })
  })
}

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
    `kill ${ ros(AGENT) } worker with signal ${ ros(SIGTERM) }` |> logger
    agent.removeAllListeners()
  }
  return co(function* () { yield terminate(agent, timeout) })
}

