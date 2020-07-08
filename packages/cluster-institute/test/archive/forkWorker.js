import cluster from 'cluster'

const CLUSTER_SETTINGS = Symbol.for('clusterSettings')

/**
 * fork worker with certain settings
 * @param {Object} [settings]
 * @param {Object} [env]
 * @param {Object} [clusterSettings]
 * @return {Worker}
 */
export function forkWorker({ settings, env, clusterSettings } = {}) {
  if (settings) cluster.setupMaster(settings)
  const worker = cluster.fork(env)
  if (clusterSettings) worker[CLUSTER_SETTINGS] = clusterSettings
  return worker
}