/**
 *
 * @param {cluster.Worker} worker
 * @return {string}
 */
export const workerExitKey = (worker) => worker.hasOwnProperty('exitedAfterDisconnect') ? 'exitedAfterDisconnect' : 'suicide'