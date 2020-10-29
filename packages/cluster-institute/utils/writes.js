import { MASTER, WORKER } from '@geia/enum-roles'
import { Palett }         from '@palett/cards'
import { DyeFactory }     from '@palett/dye'
import { BOLD }           from '@palett/enum-font-effects'
import { INSTA, SUBTLE }  from '@palett/presets'
import { Pigment }        from '@palett/projector'
import { says }           from '@palett/says'
import { dateTime }       from '@valjoux/timestamp-pretty'
import { HEX }            from '@palett/enum-color-space'

const pigFore = Pigment({ min: 0, max: 99 }, SUBTLE)
const pigMid = Pigment({ min: 0, max: 9 }, INSTA, [BOLD])
const pigEnd = Pigment({ min: 0, max: 99 }, INSTA, [BOLD])
const dyeFactory = DyeFactory.prep(HEX)
const dyeWorker = dyeFactory(Palett.grey.accent_2)
const dyeMaster = dyeFactory(Palett.amber.base)

export const WritesMaster = function (name) { return sub => says[dyeMaster(name) + ':' + dyePid(sub.pid)].p(dateTime()) }
export const WritesWorker = function (name) { return sub => says[dyeWorker(name) + ':' + dyePid(sub.pid)].p(dateTime()) }

export const byMaster = (sub, name) => (dyeMaster(name ?? MASTER) + ':' + dyePid(sub.pid))
export const byWorker = (sub, name) => (dyeWorker(name ?? WORKER) + ':' + dyePid((sub?.process ?? sub).pid))

export const dyePid = pid => {
  const text = String(pid).padStart(5, '0')
  const fore = text.slice(0, -3), mid = text.slice(-3, -2), after = text.slice(-2)
  return pigFore(fore) + pigMid(mid) + pigEnd(after)
}

// const testWrites = () => {
//   'hello from master' |> says[byMaster(process)].p(dateTime())
//   'hello from worker' |> says[byWorker(process)].p(dateTime())
// }
// testWrites()

// const test = () => {
//   const candidates = [
//     rand(1000),
//     rand(10000),
//     rand(100000),
//     rand(100000)
//   ]
//   for (let candidate of candidates) {
//     candidate |> writes |> logger
//   }
// }
//
// test()