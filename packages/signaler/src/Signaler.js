import { EXIT }                     from '@geia/enum-events'
import { AGENT, APP }               from '@geia/enum-roles'
import { SIGINT, SIGQUIT, SIGTERM } from '@geia/enum-signals'
import { ros, says }                from '@palett/says'
import { logger }                   from '@spare/logger'
import { dateTime }                 from '@valjoux/timestamp-pretty'
import cluster                      from 'cluster'
import co                           from 'co'
import { terminate }                from './terminate'

const SIGNALER = 'signaler'
const TIMEOUT = 1800

export class Signaler {
  /**
   * SIGINT kill(2) Ctrl-C
   * SIGQUIT kill(3) Ctrl-\
   * SIGTERM kill(15) default
   *
   * @param {*} instance
   * @param {EventEmitter} subProcess
   * @param {*[]} [signals]
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
  `receive signal ${ ros(signal) }, closing` |> says[SIGNALER].p(dateTime())
  this.closed = true
  const context = this
  co(function* () {
    try {
      yield genCloseWorkers(cluster.workers)
      yield genCloseAgent(context.agent);
      `close done, exiting with code: ${ ros('0') }` |> says[SIGNALER].p(dateTime())
      process.exit(0)
    }
    catch (e) {
      `close with error: ${ e }` |> says[SIGNALER].p(dateTime())
      process.exit(1)
    }
  })
}

export function processOnExit(code) {
  `exit with code: ${ ros(String(code)) }`  |> says[SIGNALER].p(dateTime())
}

export function* genCloseWorkers(workers) {
  const timeout = process.env.LEA_APP_CLOSE_TIMEOUT || process.env.LEA_MASTER_CLOSE_TIMEOUT || TIMEOUT;
  `send kill ${ ros(SIGTERM) } to ${ ros(APP) } workers, will exit with code ${ ros('0') } after ${ timeout }ms` |> says[SIGNALER].p(dateTime());
  `wait ${ timeout }ms` |> says[SIGNALER].p(dateTime())
  try { yield killAppWorkers(workers, timeout) }
  catch (e) { `${ ros(APP) } workers exit error: ${ e }`  |> says[SIGNALER].p(dateTime()) }
}

export function* genCloseAgent(agent) {
  const timeout = process.env.LEA_AGENT_CLOSE_TIMEOUT || process.env.LEA_MASTER_CLOSE_TIMEOUT || TIMEOUT;
  `send kill ${ ros(SIGTERM) } to ${ ros(AGENT) } worker, will exit with code ${ ros('0') } after ${ timeout }ms` |> says[SIGNALER].p(dateTime());
  `wait ${ timeout }ms` |> says[SIGNALER].p(dateTime())
  try { yield killAgentWorker(agent, timeout) }
  catch (e) { `${ ros(AGENT) } worker exit error: ${ e }` |> says[SIGNALER].p(dateTime()) }
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

