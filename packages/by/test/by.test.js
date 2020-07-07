import { CHEF, MASTER }          from '@geia/enum-roles'
import { ros, says }             from '@palett/says'
import { dateTime }              from '@valjoux/timestamp-pretty'
import { by, byAgent, byWorker } from '../src/by'

const testWrites = () => {
  'hello from anonymous' |> says[by(process)].p(dateTime());
  `hello from ${ ros(CHEF) }` |> says[by(process, CHEF)].p(dateTime())
  'hello from master' |> says[by(process, MASTER)].p(dateTime())
  'hello from worker' |> says[byWorker(process)].p(dateTime())
  'hello from agent' |> says[byAgent(process)].p(dateTime())
}
testWrites()