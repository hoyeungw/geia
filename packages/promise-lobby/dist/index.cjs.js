'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

// import { deco, says, Xr } from '@spare/logger'

/**
 * @typedef {Function|function(*,*[]):Promise<*[]>} AsyncService
 *
 * @param {AsyncService} service
 * @param {*[]} vendors
 * @param {*[]} visitors
 * @return {Promise<*[]>}
 */
async function promiseLobby(service, vendors, visitors) {
  const vec = [],
        busy = new Set();

  for (const client of visitors) {
    if (!vendors.length) await Promise.race(busy);
    const vendor = vendors.shift();
    const promisified = Promise.resolve().then(service.bind(vendor, client, visitors));
    vec.push(promisified);
    const deal = promisified.then(() => (busy.delete(deal), vendors.push(vendor), vendor));
    busy.add(deal); // Xr().vendor(vendor|> deco).vendors(vendors |> deco).busy(busy |> deco) |> says['asyncPool']
  }

  return Promise.all(vec);
}

exports.promiseLobby = promiseLobby;
