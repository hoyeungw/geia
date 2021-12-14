import { byMaster, byWorker }                from '@geia/by/src/by'
import { DISCONNECT, EXIT, FORK, LISTENING } from '@geia/enum-events'
import { Signaler }                          from '@geia/signaler/src/Signaler'
import { says }                              from '@spare/says'
import { deco }                              from '@spare/deco'
import { decoString }                        from '@spare/logger'
import { dateTime }                          from '@valjoux/timestamp-pretty'
import cluster                               from 'cluster'
import { Institute }                         from '../src/Institute'

const test = async () => {
  const logger = says[byMaster(process)].attach(dateTime)
  decoString('================================ Institute test ================================') |> logger

  const institute = Institute
    .build({
      exec: 'packages/cluster-institute/test/worker.js',
      count: 0,
    })
  institute.graduate()
  institute.graduate()

  institute
    .getCluster()
    .on(FORK, worker => {
      worker.disableRefork = true;
      `[ ${byWorker(worker)} ] new worker start` |> says[byWorker(worker)].p(dateTime())
    })
    .on(LISTENING, worker => {
      `[${byWorker(worker)} ] new worker listening` |> says[byWorker(worker)].p(dateTime())
      worker.send('Hello worker:' + deco({ id: worker.id, pid: worker.process.pid }))
    })
    .on(DISCONNECT, worker => {`[${byWorker(worker)}] on [${DISCONNECT}] disconnected` |> logger })
    .on(EXIT, (worker, code, signal) => {
      `[${byWorker(worker)}] on [${EXIT}] exited with ${deco(
        { code, signal, exitCode: worker.process.exitCode })}` |> logger
    })
  Signaler.register({
    process: process,
    workers: cluster.workers,
    // agent: childProcess.fork('packages/cluster-institute/test/agent.js'),
    closed: false,
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
      // worker.disconnect()
    }
  }, 1500)
}

test()