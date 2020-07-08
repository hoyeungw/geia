import { WORKER, MASTER, AGENT, MAIN } from '@geia/enum-roles';
import { Palett } from '@palett/cards';
import { HexDye } from '@palett/dye';
import { ros } from '@palett/says';
import { OBJ, NUM } from '@typen/enum-data-types';
import { nullish } from '@typen/nullish';
import { BOLD } from '@palett/enum-font-effects';
import { SUBTLE, INSTA } from '@palett/presets';
import { Pigment } from '@palett/projector';

const pigShade = Pigment({
  min: 0,
  max: 99
}, SUBTLE);
const pigE0 = Pigment({
  min: 0,
  max: 9
}, INSTA, [BOLD]);
const pigE1 = Pigment({
  min: 0,
  max: 99
}, INSTA, [BOLD]);
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

const Dyes = {};
Dyes[WORKER] = HexDye(Palett.grey.accent_2);
Dyes[MASTER] = HexDye(Palett.amber.base);
Dyes[AGENT] = HexDye(Palett.green.accent_2);
Dyes[MAIN] = HexDye(Palett.orange.base);
const byAgent = (sub, name) => Dyes[AGENT](name !== null && name !== void 0 ? name : AGENT) + ':' + dyePid(sub.pid);
const byMaster = (sub, name) => Dyes[MASTER](name !== null && name !== void 0 ? name : MASTER) + ':' + dyePid(sub.pid);
const byWorker = (sub, name) => {
  var _sub$process;

  return Dyes[WORKER](name !== null && name !== void 0 ? name : WORKER) + ':' + dyePid(((_sub$process = sub === null || sub === void 0 ? void 0 : sub.process) !== null && _sub$process !== void 0 ? _sub$process : sub).pid);
};
const by = (sub, name) => {
  var _name;

  if (nullish(name)) {
    var _sub$constructor;

    name = typeof sub === OBJ ? sub === null || sub === void 0 ? void 0 : (_sub$constructor = sub.constructor) === null || _sub$constructor === void 0 ? void 0 : _sub$constructor.name : '_';
  }

  const prefix = name in Dyes ? (_name = name, Dyes[name](_name)) : ros(name);

  function suffix(sub) {
    let id;

    if (typeof sub === NUM) {
      if (sub < 100) {
        return dyeThreadId(~~sub);
      }

      if (sub < 100000) {
        return dyePid(~~sub);
      }
    }

    if (typeof sub === OBJ) {
      var _sub$process2;

      if (!nullish(id = sub.threadId)) return dyeThreadId(id);
      if (!nullish(id = ((_sub$process2 = sub.process) !== null && _sub$process2 !== void 0 ? _sub$process2 : sub).pid)) return dyePid(id);
    }

    return ros(String(sub));
  }

  return prefix + ':' + suffix(sub);
};

export { by, byAgent, byMaster, byWorker };
