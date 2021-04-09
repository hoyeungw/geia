/**
 * box.js - box element for blessed
 * Copyright (c) 2013-2015, Christopher Jeffrey and contributors (MIT License).
 * https://github.com/chjj/blessed
 */

/**
 * Modules
 */
import Node    from './node'
import Element from './element'

/**
 * Box
 */

function Box(options) {
  if (!(this instanceof Node)) return new Box(options)
  options = options || {}
  Element.call(this, options)
}

Box.prototype.__proto__ = Element.prototype

Box.prototype.type = 'box'

/**
 * Expose
 */
export default Box
