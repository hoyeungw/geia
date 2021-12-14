import { FUN } from '@typen/enum-data-types'

/**
 * @typedef {Function|function(*,*[]):Promise<*[]>} AsyncService
 *
 * @param {*[]} freeAgentPool - array of functions or array of objects/classes. if latter case, a function must be provided as 'this'
 * @param {*[]} clients
 * @return {Promise<*[]>}
 */
export async function promiseLobby(freeAgentPool, clients) {
  /** @type {?AsyncService} */
  const service = typeof this === FUN ? this : null
  const operationPool     = [],
        postOperationPool = new Set()
  for (const client of clients) {
    if (!freeAgentPool.length) await Promise.race(postOperationPool)
    const busyAgent = freeAgentPool.shift()
    const operation = Promise
      .resolve()
      .then(service ? service.bind(busyAgent, client) : ( async () => await busyAgent(client) ))
    operationPool.push(operation)
    const postOperation = operation.then(() => {
      postOperationPool.delete(postOperation)
      freeAgentPool.push(busyAgent)
      return busyAgent
    })
    postOperationPool.add(postOperation)
    // Xr()
    //   ['freeAgent'](busyAgent|> deco)
    //   ['agentPool'](agentPool |> deco)
    //   ['busyAgent'](busyOperation|> deco)
    //   ['busyAgentPool'](busyOperationPool |> deco)
    //   |> says['asyncPool']
  }
  return Promise.all(operationPool)
}


