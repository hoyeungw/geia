import descendantPids       from '@geia/descendant-pids'
import { EXIT }             from '@geia/enum-events'
import { SIGKILL, SIGTERM } from '@geia/enum-signals'
import awaitEvent           from 'await-event'
import sleep                from 'mz-modules/sleep'

export const terminate = function* (subProcess, timeout) {
  const { pid } = (subProcess.process ?? subProcess)
  const pids = yield descendantPids(pid)
  yield [
    killProcess(subProcess, timeout),
    killDescendants(pids, timeout),
  ]
}

// kill process, if SIGTERM not work, try SIGKILL
function* killProcess(subProcess, timeout) {
  subProcess.kill(SIGTERM)
  yield Promise.race([awaitEvent(subProcess, EXIT), sleep(timeout)])
  if (subProcess.killed) return;
  // SIGKILL: http://man7.org/linux/man-pages/man7/signal.7.html
  // worker: https://github.com/nodejs/node/blob/master/lib/internal/cluster/worker.js#L22
  // subProcess.kill is wrapped to subProcess.destroy, it will wait to disconnected.
  (subProcess.process || subProcess).kill(SIGKILL)
}

// kill all children processes, if SIGTERM not work, try SIGKILL
function* killDescendants(pids, timeout) {
  if (!pids.length) return
  kill(pids, SIGTERM)

  const start = Date.now()
  // if timeout is 1000, it will check twice.
  const checkInterval = 400
  let unterminated = []

  while (Date.now() - start < timeout - checkInterval) {
    yield sleep(checkInterval)
    unterminated = getUnterminatedProcesses(pids)
    if (!unterminated.length) return
  }
  kill(unterminated, SIGKILL)
}

function kill(pids, signal) {
  for (const pid of pids) {
    try { process.kill(pid, signal) }
    catch (_) {} // ignore
  }
}

function getUnterminatedProcesses(pids) {
  return pids.filter(pid => {
    try { return process.kill(pid, 0), true } // success means it's still alive
    catch (err) { return false } // error means it's dead
  })
}

