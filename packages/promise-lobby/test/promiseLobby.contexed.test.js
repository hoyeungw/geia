import { delogger }          from '@spare/deco'
import { says }              from '@spare/logger'
import { time as timestamp } from '@valjoux/timestamp-pretty'
import { promiseLobby }      from '../src/promiseLobby'

const agent = function (x) {
  const { time } = this
  return new Promise((pass, veto) => {
    setTimeout(() => {
      `processing: ${ x }` |> says['agent' + time].br(timestamp())
      pass(x * 2)
    }, time)
  })
}

const test = async () => {
  const result = await promiseLobby.call(agent, [{ time: 500 }, { time: 200 }], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  result |> delogger
}

test()