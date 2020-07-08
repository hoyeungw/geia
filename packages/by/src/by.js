import { AGENT, MAIN, MASTER, WORKER } from '@geia/enum-roles'
import { Palett }                      from '@palett/cards'
import { HexDye }                      from '@palett/dye'
import { ros }                         from '@palett/says'
import { NUM, OBJ }                    from '@typen/enum-data-types'
import { nullish }                     from '@typen/nullish'
import { dyePid, dyeThreadId }         from './dyePid'
// import cluster from 'cluster'
// import threads from 'worker_threads'
const Dyes = {}
Dyes[WORKER] = HexDye(Palett.grey.accent_2)
Dyes[MASTER] = HexDye(Palett.amber.base)
Dyes[AGENT] = HexDye(Palett.green.accent_2)
Dyes[MAIN] = HexDye(Palett.orange.base)


export const byAgent = (sub, name) => (Dyes[AGENT](name ?? AGENT) + ':' + dyePid(sub.pid))
export const byMaster = (sub, name) => (Dyes[MASTER](name ?? MASTER) + ':' + dyePid(sub.pid))
export const byWorker = (sub, name) => (Dyes[WORKER](name ?? WORKER) + ':' + dyePid((sub?.process ?? sub).pid))

export const by = (sub, name) => {
  if (nullish(name)) { name = (typeof sub === OBJ) ? (sub?.constructor?.name) : '_' }
  const prefix = name in Dyes ? (name |> Dyes[name]) : ros(name)
  function suffix(sub) {
    let id
    if (typeof sub === NUM) {
      if (sub < 100) { return dyeThreadId(~~sub) }
      if (sub < 100000) { return dyePid(~~sub) }
    }
    if (typeof sub === OBJ) {
      if (!nullish(id = sub.threadId)) return dyeThreadId(id)
      if (!nullish(id = (sub.process ?? sub).pid)) return dyePid(id)
    }
    return ros(String(sub))
  }
  return prefix + ':' + suffix(sub)
}


