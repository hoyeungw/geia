import { MESSAGE }  from '@geia/enum-events'
import { says }     from '@spare/says'
import { dateTime } from '@valjoux/timestamp-pretty'
import cluster      from 'cluster'
import { byWorker } from '../utils/writes.js'

if (cluster.isWorker) {
  const WORKER = byWorker(process);
  `${WORKER} online, standing-by` |> says[WORKER].p(dateTime())
  process.on(MESSAGE, (msg) => {
    const reply = `I'm ${WORKER}. I received: ${msg}`
    reply |> says[WORKER].p(dateTime()).br('reply')
    process.send(reply)
  })
}