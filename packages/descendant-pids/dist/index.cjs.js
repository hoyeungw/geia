'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var pstree = _interopDefault(require('ps-tree'));

const descendantPids = pid => new Promise((resolve, reject) => {
  pstree(pid, (error, descendants) => {
    if (error) descendants = []; // if get children error, just ignore it

    resolve(descendants.map(processInfo => ~~processInfo.PID));
  });
});

module.exports = descendantPids;
