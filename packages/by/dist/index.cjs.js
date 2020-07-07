'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var enumRoles = require('@geia/enum-roles');
var cards = require('@palett/cards');
var dye = require('@palett/dye');
var says = require('@palett/says');
var enumFontEffects = require('@palett/enum-font-effects');
var presets = require('@palett/presets');
var projector = require('@palett/projector');

const pigFore = projector.Pigment({
  min: 0,
  max: 99
}, presets.SUBTLE);
const pigMid = projector.Pigment({
  min: 0,
  max: 9
}, presets.INSTA, [enumFontEffects.BOLD]);
const pigEnd = projector.Pigment({
  min: 0,
  max: 99
}, presets.INSTA, [enumFontEffects.BOLD]);
const dyePid = pid => {
  const text = String(pid).padStart(5, '0');
  const fore = text.slice(0, -3),
        mid = text.slice(-3, -2),
        after = text.slice(-2);
  return pigFore(fore) + pigMid(mid) + pigEnd(after);
};

const Dyes = {};
Dyes[enumRoles.AGENT] = dye.HexDye(cards.Palett.green.accent_2);
Dyes[enumRoles.MASTER] = dye.HexDye(cards.Palett.amber.base);
Dyes[enumRoles.WORKER] = dye.HexDye(cards.Palett.grey.accent_2);
const by = (sub, name) => {
  var _sub$process2;

  return (name ? name in Dyes ? Dyes[name](name) : says.ros(name) : 'process') + ':' + dyePid(((_sub$process2 = sub === null || sub === void 0 ? void 0 : sub.process) !== null && _sub$process2 !== void 0 ? _sub$process2 : sub).pid);
};

exports.by = by;
