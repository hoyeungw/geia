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

export class Signaler {
  /**
   * SIGINT kill(2) Ctrl-C
   * SIGQUIT kill(3) Ctrl-\
   * SIGTERM kill(15) default
   *
   * @param {Object|EventEmitter} instance
   * @param {Object|EventEmitter} instance.agent
   * @param {boolean} instance.closed
   * @param {NodeJS.Process} subProcess
   * @param {string[]} [signals]
   */
  static register(instance, subProcess, signals = [SIGINT, SIGQUIT, SIGTERM]) {
    for (let signal of signals) {
      subProcess.once(signal, processOnSignal.bind(instance, signal))
    }
    subProcess.once(EXIT, processOnExit.bind(instance))
  }
}

export function processOnSignal(signal) {
  if (this.closed) return;
  `receive signal ${ ros(signal) }, closing` |> logger
  this.closed = true
  const context = this
  co(function* () {
    try {
      yield genCloseWorkers(cluster.workers)
      yield genCloseAgent(context.agent);
      `close done, exiting with code: ${ ros('0') }` |> logger
      process.exit(0)
    }
    catch (e) {
      `close with error: ${ e }` |> logger
      process.exit(1)
    }
  })
}

export function processOnExit(code) {
  `exit with code: ${ ros(String(code)) }`  |> logger
}

export function* genCloseWorkers(workers) {
  const timeout = process.env.LEA_APP_CLOSE_TIMEOUT || process.env.LEA_MASTER_CLOSE_TIMEOUT || TIMEOUT;
  `send kill ${ ros(SIGTERM) } to ${ ros(APP) } workers, will exit with code ${ ros('0') } after ${ timeout }ms` |> logger;
  `wait ${ timeout }ms` |> logger
  try { yield killAppWorkers(workers, timeout) }
  catch (e) { `${ ros(APP) } workers exit error: ${ e }`  |> logger }
}

export function* genCloseAgent(agent) {
  const timeout = process.env.LEA_AGENT_CLOSE_TIMEOUT || process.env.LEA_MASTER_CLOSE_TIMEOUT || TIMEOUT;
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

