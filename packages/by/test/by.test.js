import { CHEF, MAIN, MASTER }    from '@geia/enum-roles'
import { ros, says }             from '@spare/says'
import { dateTime }              from '@valjoux/timestamp-pretty'
import cluster                   from 'cluster'
import threads                   from 'worker_threads'
import { by, byAgent, byWorker } from '../src/by'

const { TOURNANT } = require('@geia/enum-roles')

const testGeneric = () => {
  'hello from anonymous' |> says[by(process)].p(dateTime());
  `hello from ${ ros(CHEF) }` |> says[by(process, CHEF)].p(dateTime())
  'hello from worker' |> says[byWorker(process)].p(dateTime())
  'hello from agent' |> says[byAgent(process)].p(dateTime())
}
testGeneric()

if (cluster.isMaster) {
  const test = () => {
    'hello from master' |> says[by(process, MASTER)].p(dateTime())
    const clusterWorker = cluster.fork({ exec: __filename })
    const pseudoClusterWorker = { process: { pid: process.pid } }
    'hello from clusterWorker' |> says[by(clusterWorker)].p(dateTime())
    'hello from clusterWorker in nickname' |> says[by(clusterWorker, TOURNANT)].p(dateTime())
    'hello from pseudoClusterWorker' |> says[by(pseudoClusterWorker)].p(dateTime())
    clusterWorker.kill()
  }
  test()
}

if (threads.isMainThread) {
  const test = () => {
    'hello from main' |> says[by(0, MAIN)].p(dateTime())
    const threadWorker = new threads.Worker(__filename)
    const pseudoThreadWorker = { threadId: 8 }
    'hello from threadWorker' |> says[by(threadWorker)].p(dateTime())
    'hello from threadWorker in nickname' |> says[by(threadWorker, TOURNANT)].p(dateTime())
    'hello from pseudoThreadWorker' |> says[by(pseudoThreadWorker)].p(dateTime())
    threadWorker.terminate()
  }
  test()
}