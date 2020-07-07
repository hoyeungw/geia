import { AGENT, MASTER, WORKER } from '@geia/enum-roles'
import { Palett }                from '@palett/cards'
import { HexDye }                from '@palett/dye'
import { ros }                   from '@palett/says'
import { dyePid }                from './dyePid'

const Dyes = {}
Dyes[AGENT] = HexDye(Palett.green.accent_2)
Dyes[MASTER] = HexDye(Palett.amber.base)
Dyes[WORKER] = HexDye(Palett.grey.accent_2)

export const byAgent = (sub, name) => (Dyes[AGENT](name ?? AGENT) + ':' + dyePid(sub.pid))
export const byMaster = (sub, name) => (Dyes[MASTER](name ?? MASTER) + ':' + dyePid(sub.pid))
export const byWorker = (sub, name) => (Dyes[WORKER](name ?? WORKER) + ':' + dyePid((sub?.process ?? sub).pid))

export const by = (sub, name) => (name ? (name in Dyes ? Dyes[name](name) : ros(name)) : 'process') + ':' + dyePid((sub?.process ?? sub).pid)


