/**
 * screen.js - screen node for blessed
 * Copyright (c) 2013-2015, Christopher Jeffrey and contributors (MIT License).
 * https://github.com/chjj/blessed
 */

/**
 * Modules
 */
import { Program } from '@geia/tui-program'
import Node        from './node'

const nextTick = global.setImmediate || process.nextTick.bind(process)

class Screen extends Node {
  constructor(options) {
    super(options)
    const self = this

    if (!(this instanceof Node)) {
      super()
      return new Screen(options)
    }

    Screen.bind(this)

    options = options || {}
    if (options.rsety && options.listen) {
      options = { program: options }
    }

    this.program = options.program

    if (!this.program) {
      this.program = Program.build({
        input: options.input,
        output: options.output,
        log: options.log,
        debug: options.debug,
        dump: options.dump,
        terminal: options.terminal || options.term,
        resizeTimeout: options.resizeTimeout,
        forceUnicode: options.forceUnicode,
        tput: true,
        buffer: true,
        zero: true
      })
    } else {
      this.program.setupTput()
      this.program.useBuffer = true
      this.program.zero = true
      this.program.options.resizeTimeout = options.resizeTimeout
      if (options.forceUnicode != null) {
        this.program.tput.features.unicode = options.forceUnicode
        this.program.tput.unicode = options.forceUnicode
      }
    }

    this.tput = this.program.tput

    super(options)

    this.autoPadding = options.autoPadding !== false
    this.tabc = Array((options.tabSize || 4) + 1).join(' ')
    this.dockBorders = options.dockBorders

    this.ignoreLocked = options.ignoreLocked || []

    this._unicode = this.tput.unicode || this.tput.numbers.U8 === 1
    this.fullUnicode = this.options.fullUnicode && this._unicode

    this.dattr = ((0 << 18) | (0x1ff << 9)) | 0x1ff

    this.renders = 0
    this.position = {
      left: this.left = this.aleft = this.rleft = 0,
      right: this.right = this.aright = this.rright = 0,
      top: this.top = this.atop = this.rtop = 0,
      bottom: this.bottom = this.abottom = this.rbottom = 0,
      get height() { return self.height },
      get width() { return self.width }
    }

    this.ileft = 0
    this.itop = 0
    this.iright = 0
    this.ibottom = 0
    this.iheight = 0
    this.iwidth = 0

    this.padding = {
      left: 0,
      top: 0,
      right: 0,
      bottom: 0
    }

    this.hover = null
    this.history = []
    this.clickable = []
    this.keyable = []
    this.grabKeys = false
    this.lockKeys = false
    this.focused
    this._buf = ''

    this._ci = -1

    if (options.title) {
      this.title = options.title
    }

    options.cursor = options.cursor || {
      artificial: options.artificialCursor,
      shape: options.cursorShape,
      blink: options.cursorBlink,
      color: options.cursorColor
    }

    this.cursor = {
      artificial: options.cursor.artificial || false,
      shape: options.cursor.shape || 'block',
      blink: options.cursor.blink || false,
      color: options.cursor.color || null,
      _set: false,
      _state: 1,
      _hidden: true
    }

    this.program.on('resize', function () {
      self.alloc()
      self.render();
      (function emit(el) {
        el.emit('resize')
        el.children.forEach(emit)
      })(self)
    })

    this.program.on('focus', function () {
      self.emit('focus')
    })

    this.program.on('blur', function () {
      self.emit('blur')
    })

    this.program.on('warning', function (text) {
      self.emit('warning', text)
    })

    this.on('newListener', function fn(type) {
      if (type === 'keypress' || type.indexOf('key ') === 0 || type === 'mouse') {
        if (type === 'keypress' || type.indexOf('key ') === 0) self._listenKeys()
        if (type === 'mouse') self._listenMouse()
      }
      if (type === 'mouse'
        || type === 'click'
        || type === 'mouseover'
        || type === 'mouseout'
        || type === 'mousedown'
        || type === 'mouseup'
        || type === 'mousewheel'
        || type === 'wheeldown'
        || type === 'wheelup'
        || type === 'mousemove') {
        self._listenMouse()
      }
    })

    this.setMaxListeners(Infinity)

    this.enter()

    this.postEnter()
  }
}

Screen.global = null

Screen.total = 0

Screen.instances = []


Screen.prototype.__defineGetter__('title', function () {
  return this.program.title
})

Screen.prototype.__defineSetter__('title', function (title) {
  return this.program.title = title
})

Screen.prototype.__defineGetter__('terminal', function () {
  return this.program.terminal
})

Screen.prototype.__defineSetter__('terminal', function (terminal) {
  this.setTerminal(terminal)
  return this.program.terminal
})

Screen.prototype.__defineGetter__('cols', function () {
  return this.program.cols
})

Screen.prototype.__defineGetter__('rows', function () {
  return this.program.rows
})

Screen.prototype.__defineGetter__('width', function () {
  return this.program.cols
})

Screen.prototype.__defineGetter__('height', function () {
  return this.program.rows
})

Screen.prototype.__defineGetter__('focused', function () {
  return this.history[this.history.length - 1]
})

Screen.prototype.__defineSetter__('focused', function (el) {
  return this.focusPush(el)
})

/**
 * Angle Table
 */

var angles = {
  '\u2518': true, // '┘'
  '\u2510': true, // '┐'
  '\u250c': true, // '┌'
  '\u2514': true, // '└'
  '\u253c': true, // '┼'
  '\u251c': true, // '├'
  '\u2524': true, // '┤'
  '\u2534': true, // '┴'
  '\u252c': true, // '┬'
  '\u2502': true, // '│'
  '\u2500': true  // '─'
}

var langles = {
  '\u250c': true, // '┌'
  '\u2514': true, // '└'
  '\u253c': true, // '┼'
  '\u251c': true, // '├'
  '\u2534': true, // '┴'
  '\u252c': true, // '┬'
  '\u2500': true  // '─'
}

var uangles = {
  '\u2510': true, // '┐'
  '\u250c': true, // '┌'
  '\u253c': true, // '┼'
  '\u251c': true, // '├'
  '\u2524': true, // '┤'
  '\u252c': true, // '┬'
  '\u2502': true  // '│'
}

var rangles = {
  '\u2518': true, // '┘'
  '\u2510': true, // '┐'
  '\u253c': true, // '┼'
  '\u2524': true, // '┤'
  '\u2534': true, // '┴'
  '\u252c': true, // '┬'
  '\u2500': true  // '─'
}

var dangles = {
  '\u2518': true, // '┘'
  '\u2514': true, // '└'
  '\u253c': true, // '┼'
  '\u251c': true, // '├'
  '\u2524': true, // '┤'
  '\u2534': true, // '┴'
  '\u2502': true  // '│'
}

// var cdangles = {
//   '\u250c': true  // '┌'
// };

// Every ACS angle character can be
// represented by 4 bits ordered like this:
// [langle][uangle][rangle][dangle]
var angleTable = {
  '0000': '', // ?
  '0001': '\u2502', // '│' // ?
  '0010': '\u2500', // '─' // ??
  '0011': '\u250c', // '┌'
  '0100': '\u2502', // '│' // ?
  '0101': '\u2502', // '│'
  '0110': '\u2514', // '└'
  '0111': '\u251c', // '├'
  '1000': '\u2500', // '─' // ??
  '1001': '\u2510', // '┐'
  '1010': '\u2500', // '─' // ??
  '1011': '\u252c', // '┬'
  '1100': '\u2518', // '┘'
  '1101': '\u2524', // '┤'
  '1110': '\u2534', // '┴'
  '1111': '\u253c'  // '┼'
}

Object.keys(angleTable).forEach(function (key) {
  angleTable[parseInt(key, 2)] = angleTable[key]
  delete angleTable[key]
})

/**
 * Expose
 */
export default Screen
