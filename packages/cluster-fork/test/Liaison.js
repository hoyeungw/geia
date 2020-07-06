import { LoggerLegacy }               from '@dekor/logger'
import { DISCONNECT, MESSAGE }        from '@geia/enum-events'
import { AGENT, APP, MASTER, PARENT } from '@geia/enum-roles'
import { ros, says }                  from '@palett/says'
import { deco }                       from '@spare/deco'
import cluster                        from 'cluster'
import sendMessage                    from 'sendmessage'

// const debug = require('debug')('egg-cluster:messenger')
const LIAISON = 'liaison'
says[LIAISON].asc
const logger = LoggerLegacy(LIAISON)

/**
 * master messenger,provide communication between parent, master, agent and app.
 *
 *             ┌────────┐
 *             │ parent │
 *            /└────────┘\
 *           /     |      \
 *          /  ┌────────┐  \
 *         /   │ master │   \
 *        /    └────────┘    \
 *       /     /         \    \
 *     ┌───────┐         ┌───────┐
 *     │ agent │ ------- │  app  │
 *     └───────┘         └───────┘
 *
 *
 * in app worker
 *
 * ```js
 * process.send({
 *   action: 'xxx',
 *   data: '',
 *   to: 'agent/master/parent', // default to app
 * });
 * ```
 *
 * in agent worker
 *
 * ```js
 * process.send({
 *   action: 'xxx',
 *   data: '',
 *   to: 'app/master/parent', // default to agent
 * });
 * ```
 *
 * in parent
 *
 * ```js
 * process.send({
 *   action: 'xxx',
 *   data: '',
 *   to: 'app/agent/master', // default to be ignore
 * });
 * ```
 */
export class Liaison {
  constructor(master) {
    this.master = master
    this.hasParent = !!process.send
    process.on(MESSAGE, (msg) => { msg.from = PARENT, this.send(msg) })
    process.once(DISCONNECT, () => { this.hasParent = false })
  }

  /**
   * send message
   * @param {Object} m message body
   * @param {string} [m.receiverPid] receiver process id
   * @param {String} [m.from] from who
   * @param {String} [m.to] to who
   * @param {*} [m.action] to who
   * @param {*} [m.data] to who
   */
  // @logger
  send(m) {
    if (!m.from) { m.from = MASTER }
    if (m.receiverPid) switch (m.receiverPid) { // recognize to whom the receiverPid orients
      case String(process.pid):
        m.to = MASTER
        break
      case String(this.master.agent.pid):
        m.to = AGENT
        break
      default:
        m.to = APP
    }
    if (!m.to) { // default from -> to rules
      if (m.from === AGENT) m.to = APP
      if (m.from === APP) m.to = AGENT
      if (m.from === PARENT) m.to = MASTER
    }
    {
      const { from, to, data, action } = m;
      `(${ ros(from) })->(${ ros(to) }) [${ deco(action) }] (${ deco(data ?? '') })` |> says[LIAISON]
    }
    if (m.to === MASTER) { return void this.sendToMaster(m) } // app/agent -> master
    if (m.to === PARENT) { return void this.sendToParent(m) } // master/app/agent -> parent
    if (m.to === AGENT) { return void this.sendToAgentWorker(m) } // parent/app(可能不指定 to) -> master -> agent
    if (m.to === APP) { return void this.sendToAppWorker(m) } // parent/agent -> master -> app
  }

  /**
   * send message to master self
   * @param {Object} data message body
   */
  @logger
  sendToMaster(data) {
    this.master.emit(data.action, data.data)
  }
  /**
   * send message to parent process
   * @param {Object} data message body
   */
  @logger
  sendToParent(data) {
    if (!this.hasParent) { return }
    process.send(data)
  }
  /**
   * send message to agent worker
   * @param {Object} data message body
   */
  @logger
  sendToAgentWorker(data) {
    if (this.master.agent) { sendMessage(this.master.agent, data) }
  }
  /**
   * send message to app worker
   * @param {Object} data message body
   */
  @logger
  sendToAppWorker(data) {
    for (const id in cluster.workers) {
      const worker = cluster.workers[id]
      if (worker.state === 'disconnected') { continue }
      if (data?.receiverPid !== String(worker.process.pid)) { continue } // check receiverPid
      sendMessage(worker, data)
    }
  }
}
