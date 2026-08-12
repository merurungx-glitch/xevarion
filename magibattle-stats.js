/* ============================================================
   MagiBattle-Stats — ガチャ / 図鑑向けの MagiBattle 性能計算モジュール
   ・MagiBattle/index.html と同一の決定論ロジック（hash / ロール / 属性 /
     ステータス / スキルキット / 個体差 varyDef）を再現して表示に使う。
   ・window.MBStats として公開（依存なし・非モジュール）
   ※ 計算式を変える場合は MagiBattle/index.html と両方更新すること
   ============================================================ */
(function () {
  "use strict";

  function hashN(s, salt) { let h = salt >>> 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }

  const ELEMS = ["fire", "wood", "water", "light", "dark"];
  const ELEM = {
    fire:  { nm: "火", c: "#ff5d47" },
    wood:  { nm: "木", c: "#2fbf71" },
    water: { nm: "水", c: "#38a6ff" },
    light: { nm: "光", c: "#f0b429" },
    dark:  { nm: "闇", c: "#8e6bff" },
  };
  const ROLES = {
    striker:  { nm: "アタッカー",   c: "#ff5d47", hp: 0.84, atk: 1.22, spd: 1.04, skills: ["strike", "pierce", "combo", "hex", "smite", "shatter"], bursts: ["single", "chain", "execute", "judgement", "aoe"],       d: "攻撃特化。HPは低めだが一撃が重い" },
    guardian: { nm: "ガーディアン", c: "#38a6ff", hp: 1.30, atk: 0.84, spd: 0.88, skills: ["guard", "buff", "strike", "rally", "ward", "phoenix"],  bursts: ["healbuf", "aoe", "overdrive", "sanctuary", "single"],  d: "超高HP。味方を護るタンク" },
    ranger:   { nm: "レンジャー",   c: "#2fbf71", hp: 0.90, atk: 1.02, spd: 1.26, skills: ["combo", "pierce", "drain", "siphon", "volley", "tempo"], bursts: ["chain", "single", "drainall", "tempest", "judgement"], d: "俊足。手数で押す速攻型" },
    mage:     { nm: "メイジ",       c: "#8e6bff", hp: 0.88, atk: 1.16, spd: 0.96, skills: ["aoe", "curse", "hex", "siphon", "smite", "venom"],     bursts: ["aoe", "chain", "drainall", "cataclysm", "tempest"],    d: "全体攻撃・状態異常が得意な魔導師" },
    cleric:   { nm: "クレリック",   c: "#f0b429", hp: 1.08, atk: 0.9,  spd: 1.0,  skills: ["heal", "guard", "rally", "mend", "ward", "tempo", "phoenix"], bursts: ["healbuf", "single", "overdrive", "sanctuary", "chain"], d: "回復・支援で味方を支える" },
    vampire:  { nm: "ヴァンパイア", c: "#e0157a", hp: 1.02, atk: 1.10, spd: 1.06, skills: ["drain", "curse", "siphon", "hex", "venom"],            bursts: ["single", "chain", "drainall", "cataclysm", "execute"], d: "吸収と呪いで粘り強く戦う" },
  };
  const ROLE_KEYS = Object.keys(ROLES);
  const EPRE = {
    fire:  ["紅蓮", "炎帝", "フレア"],
    water: ["蒼波", "アクア", "氷結"],
    wood:  ["翠嵐", "森羅", "リーフ"],
    light: ["聖光", "ルミナス", "天翔"],
    dark:  ["宵闇", "シャドウ", "冥界"],
  };
  const TGT = { one: "敵単体", rand: "ランダムな敵", all: "敵全体", lowAlly: "HPが低い味方", allies: "味方全体" };
  /* MagiBattle/index.html の SKILL_DEF / BURST_DEF と完全同一に保つこと（fxの数・val・turnsが varyDef の結果に影響する） */
  const SKILL_DEF = {
    strike: { suf: "断ち",     tgt: "one",     hits: 1, mult: 2.6, fx: [{ t: "defdown", val: 22, turns: 2 }, { t: "atkdown", val: 12, turns: 2 }] },
    combo:  { suf: "乱撃",     tgt: "rand",    hits: 3, mult: 1.3, fx: [{ t: "critup", val: 12, turns: 2 }, { t: "spdup", val: 10, turns: 2 }] },
    aoe:    { suf: "の嵐",     tgt: "all",     hits: 1, mult: 1.4, fx: [{ t: "burn", val: 8, turns: 2 }, { t: "defdown", val: 10, turns: 2 }] },
    heal:   { suf: "の祈り",   tgt: "lowAlly", heal: 0.36,          fx: [{ t: "regen", val: 8, turns: 2 }, { t: "shield", val: 12, turns: 99 }] },
    buff:   { suf: "の号令",   tgt: "allies",                       fx: [{ t: "atkup", val: 22, turns: 3 }, { t: "critup", val: 10, turns: 3 }, { t: "spdup", val: 10, turns: 2 }] },
    pierce: { suf: "貫き",     tgt: "one",     hits: 1, mult: 2.9,  fx: [{ t: "stun", turns: 1 }, { t: "defdown", val: 14, turns: 2 }] },
    drain:  { suf: "吸命",     tgt: "one",     hits: 1, mult: 2.1,  lifesteal: 0.45, fx: [{ t: "poison", val: 7, turns: 2 }, { t: "atkdown", val: 10, turns: 2 }] },
    guard:  { suf: "の守護",   tgt: "allies",                       fx: [{ t: "shield", val: 22, turns: 99 }, { t: "regen", val: 6, turns: 2 }, { t: "atkup", val: 8, turns: 2 }] },
    curse:  { suf: "の呪詛",   tgt: "all",     hits: 1, mult: 1.0,  fx: [{ t: "poison", val: 8, turns: 3 }, { t: "defdown", val: 16, turns: 2 }, { t: "atkdown", val: 10, turns: 2 }] },
    siphon: { suf: "吸収の渦", tgt: "all",     hits: 1, mult: 1.3,  lifesteal: 0.4, fx: [{ t: "poison", val: 6, turns: 2 }, { t: "atkdown", val: 8, turns: 2 }] },
    rally:  { suf: "の鼓舞",   tgt: "allies",                       fx: [{ t: "atkup", val: 20, turns: 3 }, { t: "spdup", val: 16, turns: 3 }, { t: "shield", val: 14, turns: 99 }] },
    mend:   { suf: "癒しの光", tgt: "lowAlly", heal: 0.42,          fx: [{ t: "regen", val: 10, turns: 3 }, { t: "atkup", val: 12, turns: 2 }, { t: "shield", val: 10, turns: 99 }] },
    hex:    { suf: "の弱体",   tgt: "all",                          fx: [{ t: "atkdown", val: 20, turns: 2 }, { t: "defdown", val: 16, turns: 2 }, { t: "poison", val: 5, turns: 2 }] },
    volley: { suf: "連射",     tgt: "rand",    hits: 2, mult: 1.7, fx: [{ t: "spdup", val: 14, turns: 2 }, { t: "critup", val: 10, turns: 2 }] },
    smite:  { suf: "の断罪",   tgt: "one",     hits: 1, mult: 2.6,  fx: [{ t: "burn", val: 9, turns: 2 }, { t: "stun", turns: 1 }] },
    venom:  { suf: "の毒牙",   tgt: "one",     hits: 1, mult: 1.6,  fx: [{ t: "poison", val: 12, turns: 3 }, { t: "atkdown", val: 8, turns: 2 }] },
    ward:   { suf: "の結界",   tgt: "lowAlly", heal: 0.24,          fx: [{ t: "shield", val: 26, turns: 99 }, { t: "regen", val: 5, turns: 2 }] },
    shatter:{ suf: "砕き",     tgt: "one",     hits: 1, mult: 2.2,  fx: [{ t: "defdown", val: 30, turns: 2 }, { t: "atkdown", val: 10, turns: 2 }] },
    tempo:  { suf: "の疾風",   tgt: "allies",                       fx: [{ t: "spdup", val: 22, turns: 2 }, { t: "critup", val: 10, turns: 2 }, { t: "regen", val: 4, turns: 2 }] },
    phoenix:{ suf: "の蘇生印", tgt: "lowAlly", heal: 0.18,          fx: [{ t: "revive", val: 35, turns: 99 }, { t: "regen", val: 5, turns: 2 }] },
  };
  const BURST_DEF = {
    single:    { suf: "・絶滅", tgt: "one",    hits: 1, mult: 3.8, fx: [{ t: "stun", turns: 1 }, { t: "defdown", val: 20, turns: 2 }, { t: "shield", val: 12, turns: 99 }] },
    aoe:       { suf: "・天変", tgt: "all",    hits: 1, mult: 2.1, fx: [{ t: "burn", val: 10, turns: 2 }, { t: "defdown", val: 18, turns: 2 }, { t: "atkdown", val: 10, turns: 2 }] },
    healbuf:   { suf: "・福音", tgt: "allies", heal: 0.46,         fx: [{ t: "shield", val: 18, turns: 99 }, { t: "atkup", val: 26, turns: 3 }, { t: "regen", val: 8, turns: 2 }] },
    chain:     { suf: "・連星", tgt: "rand",   hits: 4, mult: 1.7, fx: [{ t: "critup", val: 18, turns: 2 }, { t: "spdup", val: 14, turns: 2 }] },
    drainall:  { suf: "・吸魂", tgt: "all",    hits: 1, mult: 2.2, lifesteal: 0.5, fx: [{ t: "poison", val: 10, turns: 3 }, { t: "atkdown", val: 12, turns: 2 }] },
    overdrive: { suf: "・覚醒", tgt: "allies",                     fx: [{ t: "atkup", val: 34, turns: 3 }, { t: "critup", val: 20, turns: 3 }, { t: "spdup", val: 24, turns: 3 }, { t: "shield", val: 18, turns: 99 }] },
    execute:   { suf: "・処断", tgt: "one",    hits: 1, mult: 4.2, fx: [{ t: "defdown", val: 26, turns: 2 }, { t: "atkdown", val: 20, turns: 2 }, { t: "stun", turns: 1 }] },
    cataclysm: { suf: "・終焉", tgt: "all",    hits: 1, mult: 2.0, fx: [{ t: "burn", val: 11, turns: 2 }, { t: "atkdown", val: 16, turns: 2 }, { t: "defdown", val: 12, turns: 2 }] },
    judgement: { suf: "・裁き", tgt: "one",    hits: 2, mult: 2.2, fx: [{ t: "burn", val: 9, turns: 2 }, { t: "defdown", val: 14, turns: 2 }] },
    sanctuary: { suf: "・聖域", tgt: "allies", heal: 0.38,         fx: [{ t: "regen", val: 12, turns: 3 }, { t: "shield", val: 16, turns: 99 }, { t: "critup", val: 10, turns: 2 }] },
    tempest:   { suf: "・暴風", tgt: "rand",   hits: 5, mult: 1.4, fx: [{ t: "spdup", val: 18, turns: 2 }, { t: "critup", val: 12, turns: 2 }] },
  };
  /* 絵文字は端末差が出るためテキストのみ（バトル側は自作SVGアイコン） */
  const FX_NM = { burn: "火傷", poison: "毒", defdown: "防御DOWN", stun: "スタン", shield: "シールド", atkup: "攻撃UP", critup: "会心UP", regen: "リジェネ", atkdown: "攻撃DOWN", spdup: "速さUP", revive: "一度だけ復活HP" };

  function elemOf(ch) { return ELEMS[hashN(ch.id, 7) % 5]; }
  function roleOf(ch) { return ROLE_KEYS[hashN(ch.id, 613) % ROLE_KEYS.length]; }
  function baseStats(ch) {
    const ssr = ch.rarity === "SSR";
    const r = ROLES[roleOf(ch)];
    const h1 = hashN(ch.id, 7), h2 = hashN(ch.id, 131), h3 = hashN(ch.id, 977);
    return {
      hp:  Math.round(((ssr ? 560 : 440) + h1 % 80) * r.hp),
      atk: Math.round(((ssr ? 92 : 74) + h2 % 16) * r.atk),
      spd: Math.round(((ssr ? 90 : 84) + h3 % 25) * r.spd),
    };
  }
  function lvMult(lv) { return 1 + 0.045 * (lv - 1); }
  function statsAt(ch, lv, dupe) {
    lv = lv || 1; dupe = dupe || 0;
    const b = baseStats(ch);
    const m = (1 + 0.08 * dupe) * lvMult(lv);
    return { hp: Math.round(b.hp * m), atk: Math.round(b.atk * m), spd: b.spd, elem: elemOf(ch), role: roleOf(ch) };
  }
  function powerOf(st) { return Math.round(st.hp / 8 + st.atk * 2 + st.spd); }

  /* MagiBattle と同一の個体差 */
  function varyDef(def, seed) {
    const d = JSON.parse(JSON.stringify(def));
    const v = (salt, lo, hi) => lo + (hashN(seed, salt) % 1000) / 1000 * (hi - lo);
    if (d.mult) d.mult = Math.round(d.mult * v(11, 0.88, 1.14) * 100) / 100;
    if (d.heal) d.heal = Math.round(d.heal * v(23, 0.90, 1.15) * 100) / 100;
    if (d.lifesteal) d.lifesteal = Math.round(d.lifesteal * v(37, 0.85, 1.20) * 100) / 100;
    if (d.hits && d.hits >= 3 && hashN(seed, 53) % 5 === 0) d.hits += 1;
    (d.fx || []).forEach((fx, i) => {
      if (fx.val) fx.val = Math.max(3, Math.round(fx.val * v(41 + i * 7, 0.85, 1.20)));
      if (fx.turns && fx.turns < 90 && hashN(seed, 71 + i) % 4 === 0) fx.turns += 1;
    });
    return d;
  }
  function defBrief(def, rar, isBurst) {
    const boost = rar === "SSR" ? 1.28 : 1;
    const p = [];
    if (def.mult) p.push(TGT[def.tgt] + "に " + Math.round(def.mult * boost * 100) + "%" + (def.hits > 1 ? "×" + def.hits : "") + (isBurst ? " 超ダメージ" : " ダメージ"));
    if (def.heal) p.push(TGT[def.tgt] + "のHP " + Math.round(def.heal * boost * 100) + "% 回復");
    if (def.lifesteal) p.push("与ダメの " + Math.round(def.lifesteal * 100) + "% 吸収");
    (def.fx || []).forEach((fx) => p.push(FX_NM[fx.t] + (fx.val ? fx.val + (fx.t === "shield" || fx.t === "regen" || fx.t === "burn" || fx.t === "poison" ? "%" : "%") : "")));
    return p.join(" ／ ");
  }
  /* MagiBattle と同一の 4〜5 技セット選出 */
  function pickSet(pool, seed, count) {
    const arr = pool.slice();
    for (let i = arr.length - 1; i > 0; i--) { const j = hashN(seed + "_" + i, 91) % (i + 1); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
    return arr.slice(0, Math.min(count, arr.length));
  }
  function kitOf(ch) {
    const el = elemOf(ch), role = ROLES[roleOf(ch)];
    const h2 = hashN(ch.id, 733);
    const nSkill = 3 + (hashN(ch.id, 401) % 2);
    const skillTypes = pickSet(role.skills, ch.id + "sk", nSkill);
    const burstTypes = pickSet(role.bursts, ch.id + "bs", 1);
    const mk = (t, i, isBurst) => {
      const def = varyDef((isBurst ? BURST_DEF : SKILL_DEF)[t], ch.id + (isBurst ? "-b" : "-s") + i);
      const pre = EPRE[el][hashN(ch.id + t, isBurst ? 29 : 17) % 3];
      return { type: t, nm: pre + def.suf, brief: defBrief(def, ch.rarity, isBurst) };
    };
    const skills = skillTypes.map((t, i) => mk(t, i, false));
    const bursts = burstTypes.map((t, i) => mk(t, i, true));
    return {
      elem: el, role: roleOf(ch),
      normal: { nm: EPRE[el][h2 % 3] + "アタック" },
      skills, bursts, skill: skills[0], burst: bursts[0],
    };
  }

  /* ガチャ・図鑑の詳細に差し込むHTMLスニペット */
  function statsHTML(ch, opt) {
    opt = opt || {};
    const el = ELEM[elemOf(ch)], role = ROLES[roleOf(ch)];
    const s1 = statsAt(ch, 1, 0), s40 = statsAt(ch, 40, 4);
    const kit = kitOf(ch);
    const tag = (bg, tx) => '<span style="display:inline-block;background:' + bg + ';color:#fff;font-size:10px;font-weight:800;border-radius:99px;padding:3px 10px;margin-right:5px">' + tx + '</span>';
    return '<div style="text-align:left;margin-top:10px;border-top:1.5px dashed rgba(128,128,160,.3);padding-top:10px">' +
      '<div style="font-size:11px;font-weight:900;margin-bottom:6px;opacity:.75">⚔️ MagiBattle 性能</div>' +
      '<div style="margin-bottom:7px">' + tag(el.c, el.nm + "属性") + tag(role.c, role.nm) + '</div>' +
      '<div style="font-size:10.5px;line-height:1.9;opacity:.92">' +
      'HP <b>' + s1.hp.toLocaleString() + '</b> ／ 攻撃 <b>' + s1.atk + '</b> ／ 速さ <b>' + s1.spd + '</b> ／ 戦力 <b>' + powerOf(s1) + '</b>（Lv.1）<br>' +
      '<span style="opacity:.7">→ Lv.40 完凸時：HP <b>' + s40.hp.toLocaleString() + '</b> ／ 攻撃 <b>' + s40.atk + '</b> ／ 戦力 <b>' + powerOf(s40) + '</b></span></div>' +
      '<div style="font-size:10.5px;line-height:1.7;margin-top:6px">' +
      '<div style="font-weight:900;opacity:.8;margin-bottom:2px">⚡ スキル ' + kit.skills.length + '種（発動時ランダム）</div>' +
      kit.skills.map(function (s) { return '・<b>' + s.nm + '</b> <span style="opacity:.72">' + s.brief + '</span>'; }).join('<br>') +
      '<div style="font-weight:900;color:#e0157a;margin:5px 0 2px">✦ 必殺技</div>' +
      kit.bursts.map(function (b) { return '・<b style="color:#e0157a">' + b.nm + '</b> <span style="opacity:.72">' + b.brief + '</span>'; }).join('<br>') +
      '</div></div>';
  }

  window.MBStats = { ELEM, ROLES, elemOf, roleOf, statsAt, powerOf, kitOf, statsHTML, ready: true };
})();
