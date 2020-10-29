'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var enumDataTypes = require('@typen/enum-data-types');

// import { deco, says, Xr } from '@spare/logger'
/**
 * @typedef {Function|function(*,*[]):Promise<*[]>} AsyncService
 *
 * @param {*[]} vendors - array of functions or array of objects/classes. if latter case, a function must be provided as 'this'
 * @param {*[]} visitors
 * @return {Promise<*[]>}
 */

async function promiseLobby(vendors, visitors) {
  /** @type {?AsyncService} */
  const service = typeof this === enumDataTypes.FUN ? this : null;
  const vec = [],
        busy = new Set();

  for (const client of visitors) {
    if (!vendors.length) await Promise.race(busy);
    const vendor = vendors.shift();
    const promisified = Promise.resolve().then(service ? service.bind(vendor, client) : () => vendor(client));
    vec.push(promisified);
    const deal = promisified.then(() => (busy.delete(deal), vendors.push(vendor), vendor));
    busy.add(deal); // Xr().vendor(vendor|> deco).vendors(vendors |> deco).busy(busy |> deco) |> says['asyncPool']
  }

  return Promise.all(vec);
}

exports.promiseLobby = promiseLobby;
