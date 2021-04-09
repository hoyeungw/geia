/**
 * program.js - basic curses-like functionality for blessed.
 * Copyright (c) 2013-2015, Christopher Jeffrey and contributors (MIT License).
 * https://github.com/chjj/blessed
 */

/**
 * Modules
 */
// const Program = require('./program.prev')
const { build, Program } = require('../../tui-program/dist/index.cjs')

console.log(Program)
/**
 * Expose
 */
exports.build = build
module.exports = Program
