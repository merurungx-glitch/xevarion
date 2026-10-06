/* ============================================================
   MagiAbyss — ma-cards.js
   レベルアップの能力カード（3枚＋引き直し・とばす）と宝箱の中身
   ・候補はキャラの成長補正（CHARS[].bias）で出やすさが変わる。得意分野以外も必ず出る。
   ・武器は最大4種・魔法は最大3種・能力は（刻印以外）最大7種。
   ・武器 Lv7 ＋ 条件の能力 Lv2 → 進化（UR）。キャラ専用の進化（属性つき）は優先。
   ============================================================ */
(function () {
  "use strict";
  const MA = (window.MA = window.MA || {});
  const D = () => MA.D;
  const G = () => MA.G;
  const MAX_W = 4, MAX_M = 3, MAX_S = 7;

  function weaponEl(k) {
    /* その探索で最初に候補に出たときの属性を覚えておく（キャラの属性が出やすい） */
    const g = G();
    g.wEl = g.wEl || {};
    if (!g.wEl[k]) { const P = g.P; g.wEl[k] = g.rnd() < 0.35 ? P.C.el : D().ELEM_KEYS[Math.floor(g.rnd() * D().ELEM_KEYS.length)]; }
    return g.wEl[k];
  }
  function rollRar(luck) {
    const r = Math.random();
    const l = luck || 0;
    if (r < 0.01 + l * 0.02) return "UR";
    if (r < 0.06 + l * 0.06) return "SSR";
    if (r < 0.2 + l * 0.1) return "SR";
    if (r < 0.5 + l * 0.1) return "R";
    return "N";
  }
  function bias(cat) { const P = G().P; return (P.C.bias && P.C.bias[cat]) || 1; }
  function evoFor(w) {
    const P = G().P;
    if (w.lv < D().WEAPON_MAX || w.evo) return null;
    const ce = P.C.evo;
    if (ce && ce.weapon === w.k && ce.el === w.el) return { id: ce.to, char: true };
    const gen = Object.keys(D().EVOS).find((id) => { const e = D().EVOS[id]; return !e.char && e.base === w.k; });
    if (gen && (P.passives[D().EVOS[gen].need] || 0) >= 2) return { id: gen, char: false };
    return null;
  }
  function pool() {
    const P = G().P;
    const out = [];
    /* 進化 */
    P.weapons.forEach((w) => { const ev = evoFor(w); if (ev) out.push({ type: ev.char ? "cevo" : "evo", k: w.k, evo: ev.id, rar: "UR", w: 8 }); });
    /* 武器 */
    D().WEAPON_KEYS.forEach((k) => {
      const w = P.weapons.find((x) => x.k === k);
      if (!w && P.weapons.length < MAX_W) out.push({ type: "weapon", k, el: weaponEl(k), rar: "R", w: 1.1 * bias("weapon") });
      else if (w && w.lv < D().WEAPON_MAX) out.push({ type: "wup", k, rar: "N", w: 1.4 * bias("weapon") });
    });
    /* 魔法 */
    D().MAGIC_KEYS.forEach((k) => {
      const m = P.magics.find((x) => x.k === k);
      if (!m && P.magics.length < MAX_M) out.push({ type: "magic", k, rar: "SR", w: 0.9 * bias("magic") });
      else if (m && m.lv < D().MAGIC_MAX) out.push({ type: "mup", k, rar: "N", w: 1.2 * bias("magic") });
    });
    /* 能力 */
    const distinct = Object.keys(P.passives).filter((k) => !/^seal_/.test(k)).length;
    const seals = Object.keys(P.passives).filter((k) => /^seal_/.test(k)).length;
    D().STAT_KEYS.forEach((k) => {
      const s = D().STATS[k], lv = P.passives[k] || 0;
      if (lv >= s.max) return;
      const isSeal = /^seal_/.test(k);
      if (!lv && !isSeal && distinct >= MAX_S) return;
      if (!lv && isSeal && seals >= 3) return;
      let w = bias(s.cat) * (isSeal ? 0.35 : 1);
      if (isSeal && s.el === P.C.el) w *= 2;
      out.push({ type: "stat", k, rar: null, w });
    });
    return out;
  }
  function pickWeighted(list, n) {
    const res = [], a = list.slice();
    while (res.length < n && a.length) {
      const tot = a.reduce((s, x) => s + x.w, 0);
      let r = Math.random() * tot, i = 0;
      for (; i < a.length; i++) { r -= a[i].w; if (r <= 0) break; }
      const c = a.splice(Math.min(i, a.length - 1), 1)[0];
      res.push(c);
      /* 同じ武器の「新規」と「強化」は並べない */
      for (let j = a.length - 1; j >= 0; j--) if (a[j].k === c.k) a.splice(j, 1);
    }
    return res;
  }
  /* カードに表示用の情報を足す */
  function decorate(c) {
    const P = G().P;
    if (c.type === "stat" && !c.rar) c.rar = rollRar(P.st.luck);
    const R = D().RAR[c.rar];
    if (c.type === "weapon") { const W = D().WEAPONS[c.k]; c.nm = D().ELEM[c.el].nm + "の" + W.nm; c.d = W.d + "（" + D().ELEM[c.el].nm + "属性・" + D().ELEM[c.el].fx + "）"; c.lvFrom = 0; c.lvTo = 1; c.icon = c.k; c.col = D().ELEM[c.el].c; c.tag = "NEW"; }
    if (c.type === "wup") { const w = P.weapons.find((x) => x.k === c.k), W = D().WEAPONS[c.k]; c.nm = D().ELEM[w.el].nm + "の" + W.nm; c.d = W.up[w.lv]; c.lvFrom = w.lv; c.lvTo = w.lv + 1; c.icon = c.k; c.col = D().ELEM[w.el].c; }
    if (c.type === "evo" || c.type === "cevo") { const ev = D().EVOS[c.evo]; c.nm = ev.nm; c.d = "進化：" + ev.d; c.lvFrom = 7; c.lvTo = "EVO"; c.icon = c.k; c.col = "#ff6aa8"; c.tag = c.type === "cevo" ? "専用進化" : "進化"; }
    if (c.type === "magic") { const M = D().MAGICS[c.k]; c.nm = M.nm; c.d = M.d; c.lvFrom = 0; c.lvTo = 1; c.icon = c.k; c.col = D().ELEM[M.el].c; c.tag = "NEW"; }
    if (c.type === "mup") { const m = P.magics.find((x) => x.k === c.k), M = D().MAGICS[c.k]; c.nm = M.nm; c.d = M.d + "（Lv" + (m.lv + 1) + "）"; c.lvFrom = m.lv; c.lvTo = m.lv + 1; c.icon = c.k; c.col = D().ELEM[M.el].c; }
    if (c.type === "stat") {
      const s = D().STATS[c.k], lv = P.passives[c.k] || 0;
      const v = s.v * R.mul;
      const val = s.v >= 1 ? Math.round(v * 10) / 10 : Math.round(v * 1000) / 1000;
      c.nm = s.nm; c.d = s.d(val);
      c.lvFrom = lv; c.lvTo = lv + 1; c.icon = /^seal_/.test(c.k) ? "seal" : c.k; c.col = s.el ? D().ELEM[s.el].c : D().RAR[c.rar].c;
      c.cat = D().CAT[s.cat];
    }
    if (c.type === "gold") { c.nm = "ゴールド"; c.d = "ゴールドを " + c.v + " 得る"; c.icon = "gold"; c.col = "#ffd84a"; }
    if (c.type === "heal") { c.nm = "回復の実"; c.d = "HPを30%回復する"; c.icon = "regen"; c.col = "#7dffb0"; }
    c.rarC = D().RAR[c.rar || "N"].c;
    return c;
  }
  function roll(n) {
    const P = G().P;
    n = n || P.cardsN || 3;
    let list = pickWeighted(pool(), n);
    /* 進化があれば必ず1枚目に */
    if (list.length < n) {
      list.push({ type: "gold", v: Math.round(40 + (G().goldMul || G().levelMul) * 30), rar: "N", w: 1 });
      if (list.length < n) list.push({ type: "heal", rar: "N", w: 1 });
    }
    list.sort((a, b) => (b.type === "cevo" || b.type === "evo" ? 1 : 0) - (a.type === "cevo" || a.type === "evo" ? 1 : 0));
    return list.map(decorate);
  }
  function apply(c) {
    const P = G().P, S = MA.Save.S;
    P.passiveMul = P.passiveMul || {};
    if (c.type === "weapon") { P.weapons.push({ k: c.k, lv: 1, el: c.el, t: 0.3 }); S.codex.wp[c.k] = 1; }
    else if (c.type === "wup") { const w = P.weapons.find((x) => x.k === c.k); if (w) w.lv++; }
    else if (c.type === "evo" || c.type === "cevo") {
      const w = P.weapons.find((x) => x.k === c.k); if (w) { w.evo = c.evo; w.orbs && w.orbs.forEach((o) => { o.life = 0; }); w.orbs = []; w.t = 0; }
      S.codex.wp[c.evo] = 1; G().stats.evo.push(c.evo);
      MA.E.ach("evo1"); if (c.type === "cevo") MA.E.ach("evoChar");
      MA.E.toast("進化：「" + D().EVOS[c.evo].nm + "」", "#ff6aa8");
    }
    else if (c.type === "magic") { P.magics.push({ k: c.k, lv: 1, t: 0.4 }); S.codex.mg[c.k] = 1; }
    else if (c.type === "mup") { const m = P.magics.find((x) => x.k === c.k); if (m) m.lv++; }
    else if (c.type === "stat") {
      const s = D().STATS[c.k];
      P.passives[c.k] = (P.passives[c.k] || 0) + 1;
      P.passiveMul[c.k] = (P.passiveMul[c.k] || 0) + s.v * D().RAR[c.rar || "N"].mul;
      if (c.k === "revive") P.revUsed = false;
    }
    else if (c.type === "gold") { G().stats.gold += c.v; }
    else if (c.type === "heal") { MA.E.heal(P.st.hp * 0.3); }
  }
  function randomStat() { const list = pool().filter((x) => x.type === "stat"); const c = list[Math.floor(Math.random() * list.length)] || { type: "heal", rar: "N" }; return decorate(c); }

  /* ══ 宝箱 ══ */
  const GEAR_TABLE = [
    /* N, R, SR, SSR, UR の重み（迷宮の番号ごと） */
    [50, 35, 13, 2, 0], [35, 40, 20, 5, 0], [20, 40, 30, 9, 1], [10, 35, 38, 15, 2], [4, 28, 42, 22, 4], [0, 20, 44, 30, 6],
  ];
  function gearRar(tier) {
    const g = G();
    const no = g.mode === "abyss" ? Math.min(5, Math.floor(g.floor / 6)) : g.dun.no - 1;
    const t = GEAR_TABLE[Math.max(0, Math.min(5, no + (tier >= 3 ? 1 : 0) + ((g.modeDef && g.modeDef.gearUp) || 0)))].slice();
    if (tier >= 3) { t[0] = 0; t[1] = Math.round(t[1] * 0.4); }
    const luck = g.P.st.luck || 0;
    t[3] *= 1 + luck * 2; t[4] *= 1 + luck * 3;
    const tot = t.reduce((a, b) => a + b, 0);
    let r = Math.random() * tot;
    for (let i = 0; i < 5; i++) { r -= t[i]; if (r <= 0) return D().RAR_KEYS[i]; }
    return "R";
  }
  function randomGearId() {
    const g = G();
    const keys = D().GEAR_KEYS;
    /* 迷宮の属性の装備が少し出やすい */
    const el = g.dun ? g.dun.el : null;
    const w = keys.map((k) => (D().GEAR[k].el && D().GEAR[k].el === el ? 2.5 : 1));
    const tot = w.reduce((a, b) => a + b, 0);
    let r = Math.random() * tot;
    for (let i = 0; i < keys.length; i++) { r -= w[i]; if (r <= 0) return keys[i]; }
    return keys[0];
  }
  function chest(tier) {
    const P = G().P;
    const n = tier >= 3 ? 5 : tier === 2 ? 3 : 1;
    const out = [];
    /* 進化できる武器があれば、宝箱からも進化する（ボス・レアの箱） */
    if (tier >= 2) P.weapons.forEach((w) => { const ev = evoFor(w); if (ev && out.length < n) out.push(decorate({ type: ev.char ? "cevo" : "evo", k: w.k, evo: ev.id, rar: "UR" })); });
    let guard = 0;
    while (out.length < n && guard++ < 30) {
      const r = Math.random();
      const gearCh = tier >= 3 ? (out.some((x) => x.type === "gear") ? 0.25 : 1) : tier === 2 ? 0.3 : 0.05;
      if (r < gearCh) { const rar = gearRar(tier); const id = randomGearId(); out.push({ type: "gear", id, rar, nm: D().GEAR[id].nm, d: D().SLOTS[D().GEAR[id].slot].nm + "・" + D().GEAR[id].d, icon: D().SLOTS[D().GEAR[id].slot].ic, col: D().RAR[rar].c, rarC: D().RAR[rar].c }); continue; }
      const up = P.weapons.filter((w) => w.lv < D().WEAPON_MAX);
      if (r < 0.55 && up.length) { const w = up[Math.floor(Math.random() * up.length)]; if (out.some((x) => x.type === "wup" && x.k === w.k)) continue; out.push(decorate({ type: "wup", k: w.k, rar: "N" })); continue; }
      if (r < 0.75) { const s = randomStat(); if (s.type === "stat" && !out.some((x) => x.k === s.k)) { out.push(s); continue; } }
      if (r < 0.88) { const v = Math.round((30 + (G().goldMul || G().levelMul) * 25) * (tier >= 2 ? 3 : 1)); out.push(decorate({ type: "gold", v, rar: "N" })); continue; }
      if (r < 0.95) { out.push({ type: "mat", v: tier >= 2 ? 4 : 2, nm: "素材", d: "迷宮の素材", icon: "mat", col: "#9ab0ff", rarC: "#9ab0ff" }); continue; }
      out.push(decorate({ type: "heal", rar: "N" }));
    }
    return out;
  }
  function applyChest(list) {
    const g = G();
    list.forEach((c) => {
      if (c.type === "gear") { g.stats.gear.push({ id: c.id, rar: c.rar }); if (c.rar === "SSR" || c.rar === "UR") MA.E.ach("ssr"); if (c.rar === "UR") MA.E.ach("ur"); }
      else if (c.type === "mat") { const mats = g.mode === "abyss" ? ["abyss", "stone"] : g.dun.mats; const k = mats[0]; g.stats.mats[k] = (g.stats.mats[k] || 0) + Math.round(c.v * g.rewardMul); }
      else apply(c);
    });
  }
  MA.Cards = { roll, apply, chest, applyChest, randomStat, decorate, evoFor };
})();
