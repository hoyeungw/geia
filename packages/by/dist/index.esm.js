import { AGENT, MASTER, WORKER } from '@geia/enum-roles';
import { Palett } from '@palett/cards';
import { HexDye } from '@palett/dye';
import { ros } from '@palett/says';
import { BOLD } from '@palett/enum-font-effects';
import { SUBTLE, INSTA } from '@palett/presets';
import { Pigment } from '@palett/projector';

const pigFore = Pigment({
  min: 0,
  max: 99
}, SUBTLE);
const pigMid = Pigment({
  min: 0,
  max: 9
}, INSTA, [BOLD]);
const pigEnd = Pigment({
  min: 0,
  max: 99
}, INSTA, [BOLD]);
const dyePid = pid => {
  const text = String(pid).padStart(5, '0');
  const fore = text.slice(0, -3),
        mid = text.slice(-3, -2),
        after = text.slice(-2);
  return pigFore(fore) + pigMid(mid) + pigEnd(after);
};

const Dyes = {};
Dyes[AGENT] = HexDye(Palett.green.accent_2);
Dyes[MASTER] = HexDye(Palett.amber.base);
Dyes[WORKER] = HexDye(Palett.grey.accent_2);
const by = (sub, name) => {
  var _sub$process2;

  return (name ? name in Dyes ? Dyes[name](name) : ros(name) : 'process') + ':' + dyePid(((_sub$process2 = sub === null || sub === void 0 ? void 0 : sub.process) !== null && _sub$process2 !== void 0 ? _sub$process2 : sub).pid);
};

export { by };
