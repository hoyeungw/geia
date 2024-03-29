import { rand }   from '@aryth/rand'
import { logger } from '@spare/logger'
import { dyePid } from '../src/dyePid.js'

const test = () => {
  const candidates = [
    rand(1000),
    rand(10000),
    rand(100000),
    rand(100000)
  ]
  for (let candidate of candidates) {
    logger(dyePid(candidate))
  }
}

test()