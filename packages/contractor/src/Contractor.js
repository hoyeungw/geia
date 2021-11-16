export class Contractor {
  service
  agentPool
  #taskAgenda

  constructor(service, agentPool) {
    this.service = service
    this.agentPool = agentPool
  }

  static build(service, agentPool) { return new Contractor(service, agentPool) }

  async assignAgent() {
    if (!this.agentPool.length) await Promise.race(this.#taskAgenda)
    return this.agentPool.shift()
  }

  createTask(agent, job) {
    return Promise.resolve().then(this.service.bind(agent, job))
  }

  addAgenda(agent, taskAsPromise) {
    const agentStatusAsPromise = taskAsPromise.then(() => {
      // Xr()
      //   ['agent'](agent|> deco)
      //   ['agentPool'](this.agentPool |> deco)
      //   ['taskAsPromise'](taskAsPromise|> deco)
      //   ['#agentAgenda'](this.#taskAgenda |> deco)
      //   |> says['asyncPool']
      this.#taskAgenda.delete(agentStatusAsPromise)
      this.agentPool.push(agent)
      return agent
    })
    this.#taskAgenda.add(agentStatusAsPromise)
  }

  async takeOrders(jobs) {
    const agentDelivers = []
    this.#taskAgenda = new Set()
    for (const job of jobs) {
      const agent = await this.assignAgent()
      const toBeDelivered = this.createTask(agent, job)
      this.addAgenda(agent, toBeDelivered)
      agentDelivers.push(toBeDelivered)
    }
    return Promise.all(agentDelivers)
  }
}