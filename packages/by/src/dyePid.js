import { BOLD }          from '@palett/enum-font-effects'
import { INSTA, SUBTLE } from '@palett/presets'
import { Pigment }       from '@palett/projector'

const pigShade = Pigment({ min: 0, max: 99 }, SUBTLE)
const pigE0 = Pigment({ min: 0, max: 9 }, INSTA, [BOLD])
const pigE1 = Pigment({ min: 0, max: 99 }, INSTA, [BOLD])

export const dyeThreadId = threadId => {
  const text = String(threadId).padStart(2, '0')
  if (text.length === 2) {
    const fore = text.slice(-2, -1), after = text.slice(-1)
    return (fore === '0' ? pigShade(fore) : pigE0(fore)) + pigE0(after)
  }
  return dyePid(threadId)
}

export const dyePid = pid => {
  const text = String(pid).padStart(5, '0')
  const fore = text.slice(0, -3), mid = text.slice(-3, -2), after = text.slice(-2)
  return pigShade(fore) + pigE0(mid) + pigE1(after)
}
