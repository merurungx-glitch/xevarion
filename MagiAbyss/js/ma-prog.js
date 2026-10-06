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
  /* ★★ 2026-10-05 ハードの初回クリアは 1.5倍 */
  const FIRST_GEMS_HARD = { d1: 15, d2: 18, d3: 22, d4: 27, d5: 33, d6: 45 };

  /* ══ クリア時間のミッション（data の TIME_MIS）══
     key は "d1:normal:0"（迷宮:難易度:段）。達成は S.tmis、ジェムの受け取りは S.tmisClaim。
     ★ ジェムは gemOnce（アカウントで1回だけ・同期しても二重にならない）。受け取れなかったときは
       協会掲示の「タイム」から受け取れる（claimTime）。 */
  function timeKey(dun, diff, i) { return dun + ":" + diff + ":" + i; }
  /* ★ ミッションができる前のクリアも、ベストタイムが条件を満たしていれば達成あつかい（受け取れる） */
  function bestOf(dun, diff) { const r = MA.Save.S.dun[dun] || {}; const x = diff === "hard" ? (r.hard || {}) : r; return x.clears > 0 ? (x.best || 0) : 0; }
  function timeList(dun, diff) {
    const S = MA.Save.S, T = (D().TIME_MIS[dun] || {})[diff] || [];
    const best = bestOf(dun, diff);
    return T.map(([min, gem], i) => {
      const key = timeKey(dun, diff, i);
      const done = !!(S.tmis && S.tmis[key]) || (best > 0 && best <= min * 60);
      return { key, i, min, gem, done, claimed: !!(S.tmisClaim && S.tmisClaim[key]), at: S.tmis && S.tmis[key] };
    });
  }
  function claimTime(key) {
    const S = MA.Save.S;
    if (S.tmisClaim && S.tmisClaim[key]) return 0;
    const [dun, diff, i] = key.split(":");
    const row = ((D().TIME_MIS[dun] || {})[diff] || [])[+i]; if (!row) return 0;
    if (!(S.tmis && S.tmis[key])) { const best = bestOf(dun, diff); if (!(best > 0 && best <= row[0] * 60)) return 0; S.tmis = S.tmis || {}; S.tmis[key] = Date.now(); }
    const d = D().DUN[dun];
    const n = MA.Save.gemOnce("time:" + key, row[1], "MagiAbyss タイムミッション（" + (d ? d.nm : dun) + "・" + D().MODES[diff].nm + "・" + row[0] + "分以内）");
    S.tmisClaim = S.tmisClaim || {};
    /* gemOnce が 0 でも「もう受け取ってある」（別の端末）なら受け取りずみにする */
    if (n > 0 || (window.XEVA && XEVA.gem && XEVA.gem.isMigrated && XEVA.gem.isMigrated("magiabyss:time:" + key))) S.tmisClaim[key] = Date.now();
    MA.Save.saveSoon();
    return n;
  }

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
    const MD = g.modeDef || D().MODES.normal;
    sum.diff = g.diff || "normal";
    if (result === "clear") gold += Math.round((200 + (g.dun ? g.dun.no : 1) * 180) * g.rewardMul * MD.gold);
    if (isAbyss) gold += Math.round((g.floor - 1) * 60);
    sum.gold = Math.round(gold * keep);
    MA.Save.addMat("gold", sum.gold);
    Object.keys(st.mats).forEach((k) => { const n = Math.round(st.mats[k] * keep * MD.mat); if (n > 0) { sum.mats[k] = n; MA.Save.addMat(k, n); } });
    if (result === "clear") { const k = g.dun.mats[0]; const n = Math.round((6 + g.dun.no * 2) * g.rewardMul * MD.mat); sum.mats[k] = (sum.mats[k] || 0) + n; MA.Save.addMat(k, n); if (g.stats.bosses) { const cr = g.dun.no * (sum.diff === "hard" ? 2 : 1); sum.mats.crystal = (sum.mats.crystal || 0) + cr; MA.Save.addMat("crystal", cr); } }
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
      const dr0 = S.dun[g.dun.id] = S.dun[g.dun.id] || { clears: 0, best: 0, runs: 0, by: [], mutBest: 0 };
      /* ★★ 2026-10-05 ハードの記録は dun[id].hard に別に持つ */
      const hard = sum.diff === "hard";
      const dr = hard ? (dr0.hard = dr0.hard || { clears: 0, best: 0, runs: 0, by: [] }) : dr0;
      dr.runs++;
      sum.timeMis = [];
      if (result === "clear") {
        sum.firstClear = !dr.clears;
        dr.clears++; S.stats.clears++;
        if (!dr.best || g.t < dr.best) { dr.best = Math.round(g.t); sum.newRecord = true; }
        dr.by = dr.by || []; if (dr.by.indexOf(g.cid) < 0) dr.by.push(g.cid);
        if (!hard) dr.mutBest = Math.max(dr.mutBest || 0, g.mutList.length);
        MA.Save.misAdd("clears", 1);
        if (g.mutList.length >= 3) unlock("mut3");
        unlock("clear_" + g.dun.id);
        if (sum.firstClear) {
          sum.gems = hard ? MA.Save.gemOnce("clearHard:" + g.dun.id, FIRST_GEMS_HARD[g.dun.id] || 15, "MagiAbyss ハード初回クリア（" + g.dun.nm + "）")
                          : MA.Save.gemOnce("clear:" + g.dun.id, FIRST_GEMS[g.dun.id] || 10, "MagiAbyss 初回クリア（" + g.dun.nm + "）");
          const ch = D().STORY.find((x) => x.at === g.dun.id);
          if (!hard && ch && !S.codex.story[ch.id]) { sum.story = ch.id; }
        }
        /* クリア時間のミッション：達成した段のジェムをその場で配る */
        S.tmis = S.tmis || {}; S.tmisClaim = S.tmisClaim || {};
        timeList(g.dun.id, sum.diff).forEach((m) => {
          if (g.t > m.min * 60) return;
          if (!S.tmis[m.key]) S.tmis[m.key] = Date.now();
          const n = m.claimed ? 0 : claimTime(m.key);
          sum.timeMis.push({ min: m.min, gem: m.gem, got: n, already: m.claimed });
          sum.gems += n;
        });
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
  MA.Prog = { unlock, checkAll, settle, settleAbandoned, rwText, FIRST_GEMS, FIRST_GEMS_HARD, timeList, timeKey, claimTime };
})();
