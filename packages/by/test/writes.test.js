import { AGENT, MASTER, WORKER }       from '@geia/enum-roles'
import { says }                        from '@palett/says'
import { dateTime }                    from '@valjoux/timestamp-pretty'
import { byAgent, byMaster, byWorker } from '../src/by'
import { dyePid }                      from '../src/dyePid'

export class Writes {
  static master(sub, name) { return says[byMaster(sub, name)].attach(dateTime) }
  static worker(sub, name) { return says[byWorker(sub, name)].attach(dateTime) }
  static agent(sub, name) { return says[byAgent(sub, name)].attach(dateTime) }
}

export class By {
  static agent(sub, name) { return (Dyes[AGENT](name ?? AGENT) + ':' + dyePid(sub.pid)) }
  static master(sub, name) { return (Dyes[MASTER](name ?? MASTER) + ':' + dyePid(sub.pid)) }
  static worker(sub, name) { return (Dyes[WORKER](name ?? WORKER) + ':' + dyePid((sub?.process ?? sub).pid)) }
}

const testWrites = () => {
  'hello from master' |> Writes.master(process)
  'hello from worker' |> Writes.worker(process)
  'hello from agent' |> Writes.agent(process)
}

testWrites()