import { DISCONNECT, EXIT, FORK, LISTENING } from '@geia/enum-events'
import { says }                              from '@palett/says'
import { deco }                              from '@spare/deco'
import { decoString }                        from '@spare/logger'
import { dateTime }                          from '@valjoux/timestamp-pretty'
import cluster                               from 'cluster'
import { ClusterFork }                       from '../src/classic/ClusterFork'
import { byMaster, byWorker }                from '../utils/writes'


const test = async () => {
  const MASTER = byMaster(process)
  decoString('================================ clusterFork.test ================================') |> says[MASTER].p(dateTime())
  ClusterFork.build({
    exec: 'packages/cluster-fork/test/worker.js',
    count: 2,
  })
  cluster
    .on(FORK, worker => {
      worker.disableRefork = true;
      `[${ worker.process.env?.NODE_UNIQUE_ID }] new worker start` |> says[byWorker(worker.process)].p(dateTime())
      // worker |> delogger
    })
    .on(LISTENING, worker => {
      `[${ worker.process.env?.NODE_UNIQUE_ID }] new worker listening` |> says[byWorker(worker.process)].p(dateTime())
      const info = {
        id: worker.id,
        pid: worker.process.pid
      }
      worker.send('Hello worker:' + deco(info))
    })
    .on(DISCONNECT, worker => {
      `on [${ DISCONNECT }] disconnected` |> says[MASTER].p(dateTime())
      // console.warn('[%s] [master:%s] wroker:%s disconnect, exitedAfterDisconnect: %s, state: %s.',
      //   Date(), process.pid, worker.process.pid, worker.exitedAfterDisconnect, worker.state)
    })
    .on(EXIT, (worker, code, signal) => {
      const info = { code, signal, exitCode: worker.process.exitCode };
      `on [${ EXIT }] exited with ${ deco(info) }` |> says[MASTER].p(dateTime())
      // const exitCode = worker.process.exitCode
      // const err = new Error(util.format('worker %s died (code: %s, signal: %s, exitedAfterDisconnect: %s, state: %s)',
      //   worker.process.pid, exitCode, signal, worker.exitedAfterDisconnect, worker.state))
      // err.name = 'WorkerDiedError'
      // console.error('[%s] [master:%s] wroker exit: %s', Date(), process.pid, err.stack)
    })

  setImmediate(() => {
    for (let id in cluster.workers) {
      const worker = cluster.workers[id]
      // worker.process.pid |> delogger
      const info = { id: worker.id, pid: worker.process.pid }
      worker.send('welcome aboard:' + deco(info))
    }
  })
  setTimeout(() => {
    for (let id in cluster.workers) {
      const worker = cluster.workers[id]
      // worker.process.pid |> delogger
      worker.disconnect()
    }
  }, 1500)
}

test()