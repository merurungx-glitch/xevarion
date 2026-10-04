/* ============================================================
   MagiAbyss — ma-save.js
   セーブ（magiabyss_v1）と XEVARION との共有（所持・凸）
   ------------------------------------------------------------
   ・所持と凸は XEVARION と共通：magiburst_v1.chars と xeva_gacha_v1 を「読むだけ」。
   ・レベル・スキルツリー・装備・素材はこのアプリだけ（magiabyss_v1）。
   ・保存のたびに1つ前を magiabyss_v1_bak に残す。読めないとき（壊れた JSON・形が違う）は
     バックアップから戻し、それも読めなければ壊れた中身を magiabyss_v1_broken に退避して
     新しく始める（何が起きたかは画面に出す）。
   ・探索の途中は 10 秒ごと＋画面を離れたときに magiabyss_run_v1 へ控える（再開できる）。
   ============================================================ */
(function () {
  "use strict";
  const MA = (window.MA = window.MA || {});
  const KEY = "magiabyss_v1", BAK = "magiabyss_v1_bak", BROKEN = "magiabyss_v1_broken", RUNKEY = "magiabyss_run_v1";
  const VER = 1;
  const D = () => MA.D;

  function today() { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function weekKey() {
    const d = new Date(); const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
    const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return t.getUTCFullYear() + "-W" + String(Math.ceil(((t - y0) / 86400000 + 1) / 7)).padStart(2, "0");
  }

  function fresh() {
    const now = Date.now();
    return {
      v: VER, created: now, updated: now,
      gold: 300, mats: {}, items: { potion: 1, elixir: 0, reroll: 0, banish: 0 },
      sel: "takina", trial: null,
      chars: {}, gear: {}, eq: {}, gseq: 1,
      dun: {}, abyss: { best: 0, bestChar: "", runs: 0, record: [] },
      codex: { en: {}, boss: {}, wp: {}, mg: {}, gear: {}, res: {}, lore: {}, story: {} },
      ach: {}, mis: { day: "", d: {}, dc: {}, week: "", w: {}, wc: {} },
      fac: { smith: 0, shop: 0, tavern: 0, train: 0, chapel: 0, archive: 0 },
      shop: { day: "", stock: [] },
      set: { bgm: 0.55, se: 0.8, aim: "auto", autoAtk: true, dmgNum: true, shake: true, maxEnemies: 60, zoom: "auto", stickSide: "left", vib: true, fps: false, quality: "high", hints: true },
      stats: { kills: 0, runs: 0, clears: 0, playSec: 0, goldTotal: 0, bosses: 0, floors: 0, resonances: 0, levels: 0 },
      last: null, firstGems: {}, tut: { guild: 0, battle: 0 },
    };
  }
  /* 形を直す（足りない項目を埋める・型の違うものを捨てる） */
  function repair(s) {
    const f = fresh();
    if (!s || typeof s !== "object" || Array.isArray(s)) return null;
    const out = Object.assign({}, f, s);
    ["mats", "items", "chars", "gear", "eq", "dun", "codex", "ach", "mis", "fac", "shop", "set", "stats", "firstGems", "tut", "abyss"].forEach((k) => {
      if (!out[k] || typeof out[k] !== "object" || Array.isArray(out[k])) out[k] = JSON.parse(JSON.stringify(f[k]));
      else out[k] = Object.assign(JSON.parse(JSON.stringify(f[k])), out[k]);
    });
    ["en", "boss", "wp", "mg", "gear", "res", "lore", "story"].forEach((k) => { if (!out.codex[k] || typeof out.codex[k] !== "object") out.codex[k] = {}; });
    if (!Array.isArray(out.abyss.record)) out.abyss.record = [];
    if (!Array.isArray(out.shop.stock)) out.shop.stock = [];
    out.gold = Math.max(0, Math.floor(Number(out.gold) || 0));
    Object.keys(out.mats).forEach((k) => { out.mats[k] = Math.max(0, Math.floor(Number(out.mats[k]) || 0)); });
    Object.keys(out.items).forEach((k) => { out.items[k] = Math.max(0, Math.floor(Number(out.items[k]) || 0)); });
    /* 装備：知らない装備・壊れた行は捨てる */
    Object.keys(out.gear).forEach((uid) => { const g = out.gear[uid]; if (!g || !D().GEAR[g.id] || !D().GEAR_RAR[g.rar]) delete out.gear[uid]; else g.lv = Math.max(0, Math.min(10, g.lv | 0)); });
    Object.keys(out.eq).forEach((cid) => { const e = out.eq[cid]; if (!e || typeof e !== "object") { delete out.eq[cid]; return; } Object.keys(e).forEach((slot) => { if (!out.gear[e[slot]]) delete e[slot]; }); });
    Object.keys(out.chars).forEach((cid) => { const c = out.chars[cid]; if (!c || typeof c !== "object") delete out.chars[cid]; else { c.xp = Math.max(0, Number(c.xp) || 0); c.tree = c.tree && typeof c.tree === "object" ? c.tree : {}; } });
    out.v = VER;
    return out;
  }
  let S = null, loadNote = "";
  function load() {
    loadNote = "";
    let raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { loadNote = "端末の保存領域を読めませんでした（プライベートモード等）。この回の進みは保存されません。"; }
    if (raw == null) { S = fresh(); return S; }
    let parsed = null;
    try { parsed = repair(JSON.parse(raw)); } catch (e) { parsed = null; }
    if (parsed) { S = parsed; return S; }
    /* 壊れていた → バックアップ */
    let bak = null;
    try { bak = repair(JSON.parse(localStorage.getItem(BAK) || "null")); } catch (e) { bak = null; }
    try { localStorage.setItem(BROKEN, raw); } catch (e) {}
    if (bak) { S = bak; loadNote = "セーブデータが壊れていたので、ひとつ前のバックアップから復旧しました。"; save(); return S; }
    S = fresh(); loadNote = "セーブデータを読めなかったため、新しく始めます（壊れたデータは別の場所に退避しました）。";
    save();
    return S;
  }
  let saveT = 0;
  function save(now) {
    if (!S) return false;
    S.updated = Date.now();
    try {
      const cur = localStorage.getItem(KEY);
      if (cur) localStorage.setItem(BAK, cur);
      localStorage.setItem(KEY, JSON.stringify(S));
      return true;
    } catch (e) {
      if (!loadNote) loadNote = "保存できませんでした（容量不足など）。";
      return false;
    }
  }
  /* 書きこみの間引き（UI の連打で何度も書かない） */
  function saveSoon() { clearTimeout(saveT); saveT = setTimeout(save, 400); }

  /* ── 書き出し・読み込み ── */
  function exportText() { return JSON.stringify(Object.assign({ app: "MagiAbyss", exportedAt: new Date().toISOString() }, S)); }
  function importText(txt) {
    let o;
    try { o = JSON.parse(String(txt || "").trim()); } catch (e) { return { ok: false, msg: "読み込めませんでした（JSON の形になっていません）" }; }
    if (!o || (o.app && o.app !== "MagiAbyss")) return { ok: false, msg: "MagiAbyss のセーブデータではありません" };
    const r = repair(o);
    if (!r) return { ok: false, msg: "セーブデータの形が正しくありません" };
    delete r.app; delete r.exportedAt;
    try { const cur = localStorage.getItem(KEY); if (cur) localStorage.setItem(BAK, cur); } catch (e) {}
    S = r; save();
    return { ok: true, msg: "セーブデータを読み込みました" };
  }
  function restoreBackup() {
    let bak = null;
    try { bak = repair(JSON.parse(localStorage.getItem(BAK) || "null")); } catch (e) { bak = null; }
    if (!bak) return { ok: false, msg: "戻せるバックアップがありません" };
    S = bak; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
    return { ok: true, msg: "ひとつ前のバックアップに戻しました" };
  }
  function reset() { try { const cur = localStorage.getItem(KEY); if (cur) localStorage.setItem(BAK, cur); localStorage.removeItem(RUNKEY); } catch (e) {} S = fresh(); save(); return S; }
  function info() {
    let size = 0, bak = false;
    try { size = (localStorage.getItem(KEY) || "").length; bak = !!localStorage.getItem(BAK); } catch (e) {}
    return { size, bak, created: S && S.created, updated: S && S.updated };
  }

  /* ══ XEVARION と共有（所持・凸）══ */
  let _mb = null, _xg = null, _at = 0;
  function shared(id) {
    const now = Date.now();
    if (!_mb || now - _at > 1500) {
      try { _mb = JSON.parse(localStorage.getItem("magiburst_v1") || "null") || {}; } catch (e) { _mb = {}; }
      try { _xg = JSON.parse(localStorage.getItem("xeva_gacha_v1") || "null") || {}; } catch (e) { _xg = {}; }
      _at = now;
    }
    const m = (_mb.chars || {})[id];
    const xo = !!((_xg.owned || {})[id]);
    const xd = Math.min(4, ((_xg.dupes || {})[id]) | 0);
    return { own: !!m || xo, awk: Math.min(4, Math.max(m ? (m.awk | 0) : 0, xo ? xd : 0)) };
  }
  function owned(id) { return shared(id).own; }
  function awkOf(id) { return shared(id).awk; }
  function dropShared() { _mb = null; }

  /* ══ キャラのレベル（このアプリだけ）══ */
  function xpFor(lv) { return Math.round(40 * Math.pow(lv - 1, 1.85)); }
  function lvOf(id) {
    const c = S.chars[id]; const xp = c ? c.xp : 0;
    let lv = 1; while (lv < D().CHAR_MAX_LV && xp >= xpFor(lv + 1)) lv++;
    return lv;
  }
  function charRec(id) { if (!S.chars[id]) S.chars[id] = { xp: 0, tree: {} }; return S.chars[id]; }
  function spOf(id) { const lv = lvOf(id); const used = Object.keys(charRec(id).tree).reduce((a, k) => { const n = D().TREE.find((x) => x.id === k); return a + (n ? n.cost : 0); }, 0); return { total: lv - 1, used, left: lv - 1 - used }; }

  /* ══ 素材・お金 ══ */
  function addMat(k, n) { if (k === "gold") { S.gold += n; if (n > 0) S.stats.goldTotal += n; return; } S.mats[k] = Math.max(0, (S.mats[k] || 0) + n); }
  function hasCost(cost) { return Object.keys(cost).every((k) => (k === "gold" ? S.gold : (S.mats[k] || 0)) >= cost[k]); }
  function payCost(cost) { if (!hasCost(cost)) return false; Object.keys(cost).forEach((k) => addMat(k, -cost[k])); return true; }

  /* ══ 装備 ══ */
  function newGear(id, rar) {
    const uid = "g" + (S.gseq++) + "_" + (Date.now() % 100000);
    S.gear[uid] = { id, rar, lv: 0, at: Date.now(), nw: 1 };
    const ri = D().RAR_KEYS.indexOf(rar);
    if ((S.codex.gear[id] == null) || S.codex.gear[id] < ri) S.codex.gear[id] = ri;
    return uid;
  }
  function gearOwner(uid) { for (const cid in S.eq) for (const sl in S.eq[cid]) if (S.eq[cid][sl] === uid) return cid; return null; }
  function equip(cid, uid) {
    const g = S.gear[uid]; if (!g) return false;
    const slot = D().GEAR[g.id].slot;
    const prev = gearOwner(uid); if (prev) delete S.eq[prev][slot];
    (S.eq[cid] = S.eq[cid] || {})[slot] = uid;
    return true;
  }
  function unequip(cid, slot) { if (S.eq[cid]) delete S.eq[cid][slot]; }

  /* ══ 探索の途中の控え（再開用）══ */
  function saveRun(obj) { try { localStorage.setItem(RUNKEY, JSON.stringify(obj)); } catch (e) {} }
  function loadRun() { try { const o = JSON.parse(localStorage.getItem(RUNKEY) || "null"); return o && o.v === 1 ? o : null; } catch (e) { return null; } }
  function clearRun() { try { localStorage.removeItem(RUNKEY); } catch (e) {} }

  /* ══ ミッションの日付の切りかえ ══ */
  function rollMissions() {
    const d = today(), w = weekKey();
    if (S.mis.day !== d) { S.mis.day = d; S.mis.d = {}; S.mis.dc = {}; }
    if (S.mis.week !== w) { S.mis.week = w; S.mis.w = {}; S.mis.wc = {}; }
  }
  function misAdd(key, n) {
    rollMissions();
    S.mis.d[key] = (S.mis.d[key] || 0) + n;
    S.mis.w[key] = (S.mis.w[key] || 0) + n;
  }

  /* XEVA ジェム（初回クリアの報酬）。migrateOnce は同じ印で二度と足さない＝同期しても二重にならない */
  function gemOnce(tag, n, why) {
    try { if (window.XEVA && XEVA.gem && XEVA.gem.migrateOnce && XEVA.gem.migrateOnce("magiabyss:" + tag, n, why)) return n; } catch (e) {}
    return 0;
  }

  MA.Save = {
    KEY, load, save, saveSoon, get S() { return S; }, get note() { return loadNote; }, fresh, repair, exportText, importText, restoreBackup, reset, info,
    shared, owned, awkOf, dropShared, xpFor, lvOf, charRec, spOf, addMat, hasCost, payCost, newGear, gearOwner, equip, unequip,
    saveRun, loadRun, clearRun, rollMissions, misAdd, today, weekKey, gemOnce,
  };
})();
