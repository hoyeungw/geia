'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var enumRoles = require('@geia/enum-roles');
var cards = require('@palett/cards');
var dyeFactory$1 = require('@palett/dye-factory');
var enumColorSpace = require('@palett/enum-color-space');
var says = require('@spare/says');
var enumDataTypes = require('@typen/enum-data-types');
var nullish = require('@typen/nullish');
var enumFontEffects = require('@palett/enum-font-effects');
var presets = require('@palett/presets');
var projector = require('@palett/projector');

/**
 * @function
 * @param {string} text
 * @returns {string}
 */

dyeFactory$1.DyeFab.prototype.render;

const pigShade = projector.Pigment({
  min: 0,
  max: 99
}, presets.SUBTLE);
const pigE0 = projector.Pigment({
  min: 0,
  max: 9
}, presets.INSTA, [enumFontEffects.BOLD]);
const pigE1 = projector.Pigment({
  min: 0,
  max: 99
}, presets.INSTA, [enumFontEffects.BOLD]);
const dyeThreadId = threadId => {
  const text = String(threadId).padStart(2, '0');

  if (text.length === 2) {
    const fore = text.slice(-2, -1),
          after = text.slice(-1);
    return (fore === '0' ? pigShade(fore) : pigE0(fore)) + pigE0(after);
  }

  return dyePid(threadId);
};
const dyePid = pid => {
  const text = String(pid).padStart(5, '0');
  const fore = text.slice(0, -3),
        mid = text.slice(-3, -2),
        after = text.slice(-2);
  return pigShade(fore) + pigE0(mid) + pigE1(after);
};

// import threads from 'worker_threads'

const dyeFactory = dyeFactory$1.DyeFactory.prep(enumColorSpace.HEX);
const Dyes = {};
Dyes[enumRoles.WORKER] = dyeFactory(cards.Palett.grey.accent_2);
Dyes[enumRoles.MASTER] = dyeFactory(cards.Palett.amber.base);
Dyes[enumRoles.AGENT] = dyeFactory(cards.Palett.green.accent_2);
Dyes[enumRoles.MAIN] = dyeFactory(cards.Palett.orange.base);
const byAgent = (sub, name) => Dyes[enumRoles.AGENT](name ?? enumRoles.AGENT) + ':' + dyePid(sub.pid);
const byMaster = (sub, name) => Dyes[enumRoles.MASTER](name ?? enumRoles.MASTER) + ':' + dyePid(sub.pid);
const byWorker = (sub, name) => Dyes[enumRoles.WORKER](name ?? enumRoles.WORKER) + ':' + dyePid(((sub === null || sub === void 0 ? void 0 : sub.process) ?? sub).pid);
const by = (sub, name) => {
  var _name;

  if (nullish.nullish(name)) {
    var _sub$constructor;

    name = typeof sub === enumDataTypes.OBJ ? sub === null || sub === void 0 ? void 0 : (_sub$constructor = sub.constructor) === null || _sub$constructor === void 0 ? void 0 : _sub$constructor.name : '_';
  }

  const prefix = name in Dyes ? (_name = name, Dyes[name](_name)) : says.ros(name);

  function suffix(sub) {
    let id;

    if (typeof sub === enumDataTypes.NUM) {
      if (sub < 100) {
        return dyeThreadId(~~sub);
      }

      if (sub < 100000) {
        return dyePid(~~sub);
      }
    }

    if (typeof sub === enumDataTypes.OBJ) {
      if (!nullish.nullish(id = sub.threadId)) return dyeThreadId(id);
      if (!nullish.nullish(id = (sub.process ?? sub).pid)) return dyePid(id);
    }

    return says.ros(String(sub));
  }

  return prefix + ':' + suffix(sub);
};

exports.by = by;
exports.byAgent = byAgent;
exports.byMaster = byMaster;
exports.byWorker = byWorker;
