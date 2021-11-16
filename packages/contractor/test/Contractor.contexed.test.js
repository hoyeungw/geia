import { deco }              from '@spare/deco'
import { logger, says }      from '@spare/logger'
import { time as timestamp } from '@valjoux/timestamp-pretty'
import { Contractor }        from '../src/Contractor'

const service = function (x) {
  const { time } = this
  return new Promise((pass, veto) => {
    setTimeout(() => {
      `processing: ${ x }` |> says['agent' + time].br(timestamp())
      pass(x * 2)
    }, time)
  })
}

const test = async () => {
  const contractor = Contractor.build(service, [ { time: 500 }, { time: 300 }, { time: 200 } ])
  const jobs = [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 ]
  const results = await contractor.takeOrders(jobs)
  results |> deco |> logger
}

test()