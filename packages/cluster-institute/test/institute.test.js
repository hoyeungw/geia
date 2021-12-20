import { byMaster, byWorker }                from '@geia/by/src/by'
import { DISCONNECT, EXIT, FORK, LISTENING } from '@geia/enum-events'
import { Signaler }                          from '@geia/signaler/src/Signaler'
import { deco }                              from '@spare/deco'
import { decoString }                        from '@spare/logger'
import { says }                              from '@spare/says'
import { dateTime }                          from '@valjoux/timestamp-pretty'
import cluster                               from 'cluster'
import { Institute }                         from '../src/Institute.js'

const test = async () => {
  const logger = says[byMaster(process)].attach(dateTime)
  logger(decoString('================================ Institute test ================================'))

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
      worker.disableRefork = true
      says[byWorker(worker)].p(dateTime())(`[ ${byWorker(worker)} ] new worker start`)
    })
    .on(LISTENING, worker => {
      says[byWorker(worker)].p(dateTime())(`[${byWorker(worker)} ] new worker listening`)
      worker.send('Hello worker:' + deco({ id: worker.id, pid: worker.process.pid }))
    })
    .on(DISCONNECT, worker => {logger(`[${byWorker(worker)}] on [${DISCONNECT}] disconnected`) })
    .on(EXIT, (worker, code, signal) => {
      logger(`[${byWorker(worker)}] on [${EXIT}] exited with ${deco(
        { code, signal, exitCode: worker.process.exitCode })}`)
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