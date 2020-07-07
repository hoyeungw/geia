import { DISCONNECT, EXIT, FORK, LISTENING } from '@geia/enum-events'
import { Signaler }                          from '@geia/signaler'
import { says }                              from '@palett/says'
import { deco }                              from '@spare/deco'
import { decoString }                        from '@spare/logger'
import { dateTime }                          from '@valjoux/timestamp-pretty'
import cluster                               from 'cluster'
import { ClusterFork }                       from '../src/ClusterFork'
import { byMaster, byWorker }                from '../utils/writes'

const test = async () => {
  const logger = says[byMaster(process)].attach(dateTime)
  decoString('================================ clusterFork.test ================================') |> logger
  ClusterFork
    .build({
      exec: 'packages/cluster-fork/test/worker.js',
      count: 2,
    })
    .on(FORK, worker => {
      worker.disableRefork = true;
      `[ ${ byWorker(worker) } ] new worker start` |> says[byWorker(worker)].p(dateTime())
    })
    .on(LISTENING, worker => {
      `[${ byWorker(worker) } ] new worker listening` |> says[byWorker(worker)].p(dateTime())
      worker.send('Hello worker:' + deco({ id: worker.id, pid: worker.process.pid }))
    })
    .on(DISCONNECT, worker => {`[${ byWorker(worker) }] on [${ DISCONNECT }] disconnected` |> logger })
    .on(EXIT, (worker, code, signal) => {
      `[${ byWorker(worker) }] on [${ EXIT }] exited with ${ deco(
        { code, signal, exitCode: worker.process.exitCode }) }` |> logger
    })
  Signaler.register({ agent: {}, closed: false }, process)
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