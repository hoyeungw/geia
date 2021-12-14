'use strict';

var pstree = require('ps-tree');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var pstree__default = /*#__PURE__*/_interopDefaultLegacy(pstree);

const descendantPids = pid => new Promise((resolve, reject) => {
  pstree__default["default"](pid, (error, descendants) => {
    if (error) descendants = []; // if get children error, just ignore it

    resolve(descendants.map(processInfo => ~~processInfo.PID));
  });
});

module.exports = descendantPids;
