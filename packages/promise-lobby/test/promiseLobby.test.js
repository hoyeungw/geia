import { says }         from '@palett/says'
import { delogger }     from '@spare/deco'
import { linger }       from '@valjoux/linger'
import { promiseLobby } from '../src/promiseLobby'

class Guest {
  constructor(id) {this.id = id}
  async goto(i) {
    `calling Delayer.linger: ${ i }` |> says['delayedSatisfy'].br(this.id)
    return await linger(i, i => i, i)
  }
  static build(id) {return new Guest(id)}
}

const test = async () => {
  const result = await promiseLobby.call(
    Guest.prototype.goto,
    [Guest.build(1), Guest.build(2)],
    [500, 2500, 1500, 1000, 200, 200]
  )
  result |> delogger
}

test()