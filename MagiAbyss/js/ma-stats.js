/* ============================================================
   MagiAbyss — ma-stats.js
   能力値の計算（画面とゲームの両方がこの1本を使う＝表示と実際がずれない）
   基礎（キャラ・レベル）→ 凸 → スキルツリー → 装備 の順に重ねる。
   探索中の強化（レベルアップの能力・共鳴）は engine 側で上に重ねる。
   ============================================================ */
(function () {
  "use strict";
  const MA = (window.MA = window.MA || {});
  const D = () => MA.D;

  /* 装備1つの能力（レアリティ×強化） */
  function gearStat(g) {
    const def = D().GEAR[g.id]; if (!def) return {};
    const k = (D().GEAR_RAR[g.rar] || 1) * (1 + 0.08 * (g.lv || 0));
    const out = {};
    Object.keys(def.st).forEach((s) => {
      const v = def.st[s];
      if (s === "dash" || s === "reveal" || s === "summon") out[s] = v;          // 個数・有無はそのまま
      else out[s] = +(v * k).toFixed(s === "aspd" || s === "mag" || s === "drain" || s === "cdr" || s === "exp" || s === "magnet" || s === "critDmg" || s === "vision" || s === "mp" ? 3 : 1);
    });
    return out;
  }
  /* 装備の一覧（キャラが付けているもの） */
  function gearOf(cid, S) {
    const e = (S.eq || {})[cid] || {};
    return D().SLOT_KEYS.map((sl) => (e[sl] && S.gear[e[sl]]) ? Object.assign({ uid: e[sl] }, S.gear[e[sl]]) : null).filter(Boolean);
  }
  function treeFx(tree) {
    const fx = {};
    Object.keys(tree || {}).forEach((id) => {
      const n = D().TREE.find((x) => x.id === id); if (!n) return;
      Object.keys(n.fx).forEach((k) => { fx[k] = (fx[k] || 0) + n.fx[k]; });
    });
    return fx;
  }
  /* キャラの能力（探索の外での値） */
  function compute(cid, opt) {
    opt = opt || {};
    const C = D().CHARS[cid];
    const S = opt.S || (MA.Save && MA.Save.S);
    const lv = opt.lv != null ? opt.lv : (S ? MA.Save.lvOf(cid) : 1);
    const awk = opt.awk != null ? opt.awk : (MA.Save ? MA.Save.awkOf(cid) : 0);
    const tree = opt.tree || (S && S.chars[cid] ? S.chars[cid].tree : {});
    const gear = opt.gear || (S ? gearOf(cid, S) : []);
    const b = C.base, g = C.grow;
    const L = lv - 1;
    const st = {
      /* ★ 2026-10-05 最大HP を全員 +20%（早回しで、推奨レベル・装備なしだと待ち伏せでの接触で倒れやすかった） */
      hp: b.hp * 1.2 * Math.pow(g.hp, L), atk: b.atk * Math.pow(g.atk, L), def: b.def * Math.pow(g.def, L),
      spd: b.spd, aspd: b.aspd, crit: b.crit + L * 0.15, critDmg: b.critDmg, mag: b.mag + L * 0.004, eva: b.eva,
      regen: 0, drain: 0, cdr: 0, exp: 0, magnet: 0, mp: 0, dash: 0, vision: 0, summon: 0, reveal: 0,
      skill: 0, ult: 0, ultCharge: 0, passive: 0, shieldStart: 0,
    };
    /* 凸 */
    const A = D().AWK[awk] || D().AWK[0];
    if (A.all) { st.hp *= 1 + A.all; st.atk *= 1 + A.all; st.def *= 1 + A.all; }
    st.cdr += A.cdr || 0;
    st.awk = awk; st.awkReroll = A.reroll || 0; st.ultStart = A.ultStart || 0;
    /* スキルツリー */
    const T = treeFx(tree);
    if (T.atk) st.atk *= 1 + T.atk;
    if (T.hp) st.hp *= 1 + T.hp;
    ["crit", "def", "regen", "cdr", "skill", "ult", "ultCharge", "passive", "shieldStart", "mp"].forEach((k) => { if (T[k]) st[k] += T[k]; });
    if (T.aspd) st.aspd *= 1 + T.aspd;
    if (T.critDmg) st.critDmg += T.critDmg;
    /* 装備 */
    const els = [];
    gear.forEach((gi) => {
      const gs = gearStat(gi);
      Object.keys(gs).forEach((k) => {
        if (k === "aspd") st.aspd *= 1 + gs.aspd;
        else if (k === "mag") st.mag += gs.mag;
        else st[k] = (st[k] || 0) + gs[k];
      });
      const gd = D().GEAR[gi.id];
      if (gd.el) els.push(gd.el);
    });
    st.gearEls = els;
    st.hp = Math.round(st.hp); st.atk = +st.atk.toFixed(1); st.def = +st.def.toFixed(1);
    st.crit = Math.min(80, +st.crit.toFixed(1));
    st.lv = lv;
    return st;
  }
  /* 戦力（推奨戦力と比べる数字） */
  function power(st) {
    return Math.round(st.hp * 0.9 + st.atk * 14 + st.def * 12 + (st.spd - 60) * 2 + st.crit * 4 + (st.critDmg - 1.5) * 120
      + (st.mag - 1) * 220 + (st.aspd - 1) * 320 + st.eva * 3 + (st.regen || 0) * 40 + (st.drain || 0) * 2000 + (st.cdr || 0) * 400);
  }
  /* レベルアップに必要な経験値（探索中） */
  function expNeed(lv) { return Math.round(6 + 4 * lv + 0.9 * Math.pow(lv, 1.75)); }

  MA.Stats = { compute, power, gearStat, gearOf, treeFx, expNeed };
})();
