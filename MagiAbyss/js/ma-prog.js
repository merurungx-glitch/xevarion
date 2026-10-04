/* ============================================================
   MagiAbyss — ma-prog.js
   探索の精算・実績・ミッション・ストーリーの解放
   ・倒れたとき：礼拝堂のレベルに応じて素材・ゴールドの一部だけ持ち帰る（装備は持ち帰れる）
   ・帰還（途中でやめる）：7割を持ち帰る
   ・クリア：全部＋クリアボーナス。初回クリアは XEVARION のジェム（同期しても二重にならない）
   ============================================================ */
(function () {
  "use strict";
  const MA = (window.MA = window.MA || {});
  const D = () => MA.D;
  const G = () => MA.G;
  const FIRST_GEMS = { d1: 10, d2: 12, d3: 15, d4: 18, d5: 22, d6: 30 };

  function unlock(id) {
    const S = MA.Save.S;
    if (!S || S.ach[id]) return false;
    const a = D().ACH.find((x) => x.id === id); if (!a) return false;
    S.ach[id] = Date.now();
    Object.keys(a.rw || {}).forEach((k) => MA.Save.addMat(k, a.rw[k]));
    MA.UI && MA.UI.toast && MA.UI.toast("実績「" + a.nm + "」を達成！（" + rwText(a.rw) + "）", "#ffd84a");
    MA.Audio && MA.Audio.sfx("key");
    MA.Save.saveSoon();
    return true;
  }
  function rwText(rw) { return Object.keys(rw || {}).map((k) => (k === "gold" ? rw[k] + "G" : (D().MATS[k] ? D().MATS[k].nm : k) + "×" + rw[k])).join("・"); }
  /* 数字で測れる実績はまとめて見直す（起動時・精算のあと） */
  function checkAll() {
    const S = MA.Save.S; if (!S) return;
    const k = S.stats.kills;
    if (k >= 1000) unlock("kill_1k"); if (k >= 10000) unlock("kill_10k"); if (k >= 50000) unlock("kill_50k");
    D().CHAR_ORDER.forEach((id) => { const lv = MA.Save.lvOf(id); if (lv >= 20) unlock("clv20"); if (lv >= 40) unlock("clv40"); if (lv >= 60) unlock("clv60"); });
    const b = S.abyss.best || 0; if (b >= 10) unlock("abyss10"); if (b >= 30) unlock("abyss30"); if (b >= 50) unlock("abyss50");
    D().DUNGEONS.forEach((d) => { if (S.dun[d.id] && S.dun[d.id].clears > 0) unlock("clear_" + d.id); });
    if (S.stats.goldTotal >= 50000) unlock("rich");
    const cleared = new Set(); Object.keys(S.dun).forEach((dk) => (S.dun[dk].by || []).forEach((c) => cleared.add(c)));
    if (cleared.size >= 5) unlock("allChar");
    if (Object.keys(S.codex.res).length >= 1) unlock("res1");
    if (Object.keys(S.gear).some((u) => S.gear[u].lv >= 10)) unlock("plus10");
  }

  function settle(result) {
    const g = G(), S = MA.Save.S;
    const st = g.stats;
    const isAbyss = g.mode === "abyss";
    const chapel = S.fac.chapel || 0;
    const keep = result === "clear" ? 1 : result === "retreat" ? 0.7 : (0.5 + chapel * 0.15);
    const sum = { result, mode: g.mode, dun: g.dun && g.dun.id, cid: g.cid, time: g.t, kills: st.kills, lv: g.P.lv, dmg: Math.round(st.dmg), taken: Math.round(st.taken),
      gold: 0, mats: {}, gear: [], xp: 0, lvBefore: 0, lvAfter: 0, firstClear: false, gems: 0, newRecord: false, floor: g.floor, story: null, res: st.res.slice(), evo: st.evo.slice(), keep, trial: !!g.cfg.trial };
    /* クリアボーナス */
    let gold = st.gold;
    if (result === "clear") gold += Math.round(200 + (g.dun ? g.dun.no : 1) * 180 * g.rewardMul);
    if (isAbyss) gold += Math.round((g.floor - 1) * 60);
    sum.gold = Math.round(gold * keep);
    MA.Save.addMat("gold", sum.gold);
    Object.keys(st.mats).forEach((k) => { const n = Math.round(st.mats[k] * keep); if (n > 0) { sum.mats[k] = n; MA.Save.addMat(k, n); } });
    if (result === "clear") { const k = g.dun.mats[0]; const n = Math.round((6 + g.dun.no * 2) * g.rewardMul); sum.mats[k] = (sum.mats[k] || 0) + n; MA.Save.addMat(k, n); if (g.stats.bosses) { sum.mats.crystal = (sum.mats.crystal || 0) + g.dun.no; MA.Save.addMat("crystal", g.dun.no); } }
    if (isAbyss && g.floor > 1) { const n = Math.floor((g.floor - 1) / 2); if (n) { sum.mats.abyss = (sum.mats.abyss || 0) + n; MA.Save.addMat("abyss", n); } const cr = Math.floor((g.floor - 1) / 10); if (cr) { sum.mats.crystal = (sum.mats.crystal || 0) + cr; MA.Save.addMat("crystal", cr); } }
    /* 装備（倒れても持ち帰れる） */
    st.gear.forEach((x) => { MA.Save.newGear(x.id, x.rar); sum.gear.push(x); });
    /* キャラの経験値（おためしは増えない） */
    if (!g.cfg.trial) {
      const rec = MA.Save.charRec(g.cid);
      sum.lvBefore = MA.Save.lvOf(g.cid);
      let xp = st.kills * 0.6 + g.t / 6 + g.P.lv * 8 + (result === "clear" ? 300 + (g.dun ? g.dun.no * 120 : 0) : 0) + (isAbyss ? (g.floor - 1) * 40 : 0);
      xp *= (result === "defeat" ? 0.6 : 1) * (1 + (S.fac.tavern || 0) * 0.1) * g.rewardMul;
      sum.xp = Math.round(xp);
      rec.xp += sum.xp;
      sum.lvAfter = MA.Save.lvOf(g.cid);
    }
    /* 記録 */
    S.stats.kills += st.kills; S.stats.runs++; S.stats.playSec += Math.round(g.t); S.stats.levels += st.levels;
    MA.Save.misAdd("kills", st.kills); MA.Save.misAdd("levels", st.levels);
    if (!isAbyss) {
      const dr = S.dun[g.dun.id] = S.dun[g.dun.id] || { clears: 0, best: 0, runs: 0, by: [], mutBest: 0 };
      dr.runs++;
      if (result === "clear") {
        sum.firstClear = !dr.clears;
        dr.clears++; S.stats.clears++;
        if (!dr.best || g.t < dr.best) { dr.best = Math.round(g.t); sum.newRecord = true; }
        if (dr.by.indexOf(g.cid) < 0) dr.by.push(g.cid);
        dr.mutBest = Math.max(dr.mutBest || 0, g.mutList.length);
        MA.Save.misAdd("clears", 1);
        if (g.mutList.length >= 3) unlock("mut3");
        unlock("clear_" + g.dun.id);
        if (sum.firstClear) {
          sum.gems = MA.Save.gemOnce("clear:" + g.dun.id, FIRST_GEMS[g.dun.id] || 10, "MagiAbyss 初回クリア（" + g.dun.nm + "）");
          const ch = D().STORY.find((x) => x.at === g.dun.id);
          if (ch && !S.codex.story[ch.id]) { sum.story = ch.id; }
        }
      }
    } else {
      S.abyss.runs++;
      const reached = g.floor;
      if (reached > (S.abyss.best || 0)) { S.abyss.best = reached; S.abyss.bestChar = g.cid; sum.newRecord = true; }
      S.abyss.record.unshift({ f: reached, c: g.cid, t: Math.round(g.t), at: Date.now() });
      S.abyss.record = S.abyss.record.slice(0, 10);
      /* 10階ごとの節目：はじめて届いたときジェム */
      for (let f = 10; f <= reached; f += 10) sum.gems += MA.Save.gemOnce("abyss:" + f, 5, "MagiAbyss 深淵踏破 " + f + "階 到達");
    }
    S.last = { at: Date.now(), mode: g.mode, dun: g.dun && g.dun.id, cid: g.cid, result, time: Math.round(g.t), lv: g.P.lv, kills: st.kills, floor: g.floor };
    checkAll();
    MA.Save.save();
    return sum;
  }
  /* 中断した探索を「帰還」として受けとる（再開しないとき） */
  function settleAbandoned(run) {
    const S = MA.Save.S;
    const keep = 0.5;
    const out = { gold: Math.round((run.stats.gold || 0) * keep), mats: {} };
    MA.Save.addMat("gold", out.gold);
    Object.keys(run.stats.mats || {}).forEach((k) => { const n = Math.round(run.stats.mats[k] * keep); if (n) { out.mats[k] = n; MA.Save.addMat(k, n); } });
    (run.stats.gear || []).forEach((x) => MA.Save.newGear(x.id, x.rar));
    S.stats.kills += run.stats.kills || 0;
    MA.Save.clearRun(); MA.Save.save();
    return out;
  }
  MA.Prog = { unlock, checkAll, settle, settleAbandoned, rwText, FIRST_GEMS };
})();
