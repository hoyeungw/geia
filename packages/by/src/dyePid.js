import { BOLD }          from '@palett/enum-font-effects'
import { INSTA, SUBTLE } from '@palett/presets'
import { Pigment }       from '@palett/projector'

const pigFore = Pigment({ min: 0, max: 99 }, SUBTLE)
const pigMid = Pigment({ min: 0, max: 9 }, INSTA, [BOLD])
const pigEnd = Pigment({ min: 0, max: 99 }, INSTA, [BOLD])

export const dyePid = pid => {
  const text = String(pid).padStart(5, '0')
  const fore = text.slice(0, -3), mid = text.slice(-3, -2), after = text.slice(-2)
  return pigFore(fore) + pigMid(mid) + pigEnd(after)
}
