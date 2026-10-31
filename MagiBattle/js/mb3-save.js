/* ============================================================
   MagiBattle 3.0 — mb3-save.js（セーブ・育成・素材・ミッション）
   ・セーブは localStorage の magibattle_v2（xeva-cloud が同期・混ぜ方は xeva-cloud.js の mergeBattle2）。前の magibattle_v1 は使わない。
   ・所持と凸は XEVARION と共通（MBStats.sharedOf＝magiburst_v1 と xeva_gacha_v1）。ここでは育成（Lv・スキル・装備…）だけを持つ。
   ・シンクロ装置：持っているキャラのうち上位5人のいちばん低いレベルに、ほかのキャラが自動で合わさる（NIKKE と同じ考え方）。
   ・スタミナは使わない（XEVARION のレベル・スタミナは廃止ずみ）。
   ★★ 2026-10-31 ご指定「キャラの体験は無しに」→ 編成・戦闘は持っているキャラだけ（teamOf／autoSquad の allowTrial は使わない）。
   ★★ 2026-10-31 ご指定「アイテムをまとめて使用」→ gift(n)・skillUpMax・enhanceMax・cubeUpMax・resUpMax・buy(n)。
   ★★ 2026-10-31 設定：bgm・bgmVol・sfxVol・spd（速さも次のバトルへ）・auto（ご指定「AUTO のオンオフは維持」）。ストーリーの記録 seen（アーカイブ）。
   ============================================================ */
(function () {
  "use strict";
  const MB3 = (window.MB3 = window.MB3 || {});
  const ST = () => window.MBStats, D = () => MB3.D;
  const KEY = "magibattle_v2";
  const SV = (MB3.Save = {});
  let S = null;

  function today(d) { d = d || new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function month(d) { d = d || new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); }
  function week(d) { d = d || new Date(); const t = new Date(d.getFullYear(), d.getMonth(), d.getDate()); const day = (t.getDay() + 6) % 7; t.setDate(t.getDate() - day); return today(t); }
  SV.today = today; SV.month = month;
  function fresh() {
    return {
      v: 1, at: Date.now(), created: Date.now(),
      cur: { credit: 60000, bdata: 12000, manual1: 10, manual2: 0, manual3: 0, kit: 6, olcore: 0, module: 0, shard: 4, gift: 3, acoin: 0 },
      units: {}, gear: {}, cubes: {},
      squads: [[], [], []], sqI: 0, defense: [],
      camp: { n: {}, h: {}, story: {} },
      tower: { floor: 0 },
      icpt: { day: "", tries: 0, best: 0, bestYm: "", dayBest: 0 },
      arena: { season: month(), pts: 1000, w: 0, l: 0, day: "", tries: 0, buy: 0, opps: [], oppDay: "", logAt: 0, claimed: {}, dayClaim: "", hist: [] },
      post: { at: Date.now() - 2 * 3600000, wipeDay: "", wipeN: 0 },
      res: { atk: 0, def: 0, sup: 0 },
      ms: { day: "", d: {}, dc: {}, dAll: 0, week: "", w: {}, wc: {} },
      shop: { day: "", b: {} },
      set: { sfx: true, auto: false, synchro: true, lobby: "", bgm: true, bgmVol: 0.55, sfxVol: 1, spd: 1 },
      seen: {},
      st: { wins: 0, battles: 0, bursts: 0, kills: 0 },
      seenPro: 0,
    };
  }
  SV.load = function () {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { raw = null; }
    const F = fresh();
    S = raw && typeof raw === "object" ? raw : F;
    /* 足りない項目を補う（古い版のセーブでも落ちないように） */
    Object.keys(F).forEach((k) => { if (S[k] == null) S[k] = F[k]; else if (typeof F[k] === "object" && !Array.isArray(F[k])) Object.keys(F[k]).forEach((kk) => { if (S[k][kk] == null) S[k][kk] = F[k][kk]; }); });
    SV.daily();
    return S;
  };
  SV.save = function () { if (!S) return; S.at = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
  /* ★★ 2026-10-31 データをリセット（設定）。rst＝リセットした時刻 → 同期の混ぜ方（xeva-cloud.js mergeBattle2）は rst が新しいほうだけを残す
     （古い端末の育成が混ざって復活しないように）。所持・凸・ジェムは XEVARION 共通なので消えない */
  SV.reset = function () { S = fresh(); S.rst = Date.now(); SV.save(); return S; };
  Object.defineProperty(SV, "S", { get: () => S || SV.load() });
  SV.setting = (k) => (S || SV.load()).set[k];
  SV.setSetting = (k, v) => { SV.S.set[k] = v; SV.save(); };

  /* ══════════ 所持・凸・レベル ══════════ */
  let shCache = null, shAt = 0;
  function shared() {
    if (shCache && Date.now() - shAt < 1500) return shCache;
    const mb = (() => { try { return JSON.parse(localStorage.getItem("magiburst_v1") || "null") || {}; } catch (e) { return {}; } })();
    const xg = (() => { try { return JSON.parse(localStorage.getItem("xeva_gacha_v1") || "null") || {}; } catch (e) { return {}; } })();
    shCache = {}; ST().IDS.forEach((id) => { shCache[id] = ST().sharedOf(id, mb, xg); }); shAt = Date.now();
    return shCache;
  }
  SV.refreshOwned = () => { shCache = null; };
  SV.owned = (id) => !!(shared()[id] && shared()[id].own);
  SV.awk = (id) => (shared()[id] ? shared()[id].awk : 0);
  SV.ownedIds = () => ST().IDS.filter((id) => SV.owned(id));
  SV.unit = function (id) {
    const U = SV.S.units;
    if (!U[id]) U[id] = { lv: 1, sk: [1, 1, 1], gear: {}, cube: "", bond: 0, bx: 0, talk: "", ep: 0 };
    return U[id];
  };
  /* シンクロ装置のレベル（持っているキャラが5人以上いるときだけ） */
  SV.synchroLv = function () {
    if (!SV.S.set.synchro) return 0;
    const lvs = SV.ownedIds().map((id) => SV.unit(id).lv).sort((a, b) => b - a);
    return lvs.length >= 5 ? lvs[4] : 0;
  };
  SV.inTop5 = function (id) {
    const lvs = SV.ownedIds().map((x) => [x, SV.unit(x).lv]).sort((a, b) => b[1] - a[1]).slice(0, 5).map((x) => x[0]);
    return lvs.indexOf(id) >= 0;
  };
  SV.effLv = function (id) {
    const u = SV.unit(id), cap = ST().lvCap(SV.awk(id));
    const sy = SV.inTop5(id) ? 0 : SV.synchroLv();
    return Math.min(cap, Math.max(u.lv, sy));
  };
  SV.opt = function (id) {
    const u = SV.unit(id), G = {};
    ST().GEAR_PARTS.forEach((p) => { const g = u.gear[p] && SV.S.gear[u.gear[p]]; if (g) G[p] = g; });
    const cube = u.cube && SV.S.cubes[u.cube] ? { k: u.cube, lv: SV.S.cubes[u.cube].lv } : null;
    return { id, lv: SV.effLv(id), awk: SV.awk(id), sk: u.sk.slice(), gear: G, cube, bond: u.bond, res: SV.S.res[ST().KITS[id].cls] || 0 };
  };
  /* 体験キャラ（持っていないキャラの代わり）：凸なし・スキル3・装備なし・レベルは手持ちの上位の平均ほど */
  /* ★ 体験キャラは持っているキャラより強くならないように：手持ちの上位の平均の9割か、次のステージに足りるくらいの低いほう寄り（上限 80） */
  SV.trialOpt = function (id) {
    const own = SV.ownedIds().map((x) => SV.effLv(x)).sort((a, b) => b - a).slice(0, 5);
    const avg = own.length ? own.reduce((a, b) => a + b, 0) / own.length : 0;
    const nx = SV.nextStage(), L = D().stageLevel(nx.c, nx.s, false), rec = Math.max(1, L * 2.4 - 3);
    const lv = Math.round(Math.min(80, Math.max(rec * 0.95, avg * 0.9), Math.max(1, avg ? avg : rec)));
    return { id, lv: Math.max(1, lv), awk: 0, sk: [2, 2, 2], gear: {}, cube: null, bond: 0, res: SV.S.res[ST().KITS[id].cls] || 0, trial: true };
  };
  SV.power = (id) => ST().stats(id, SV.opt(id)).power;
  SV.teamPower = (list) => (list || []).reduce((a, m) => a + (m ? ST().stats(m.id, m).power : 0), 0);

  /* ══════════ 素材 ══════════ */
  SV.cur = (k) => SV.S.cur[k] | 0;
  SV.add = (k, n) => { SV.S.cur[k] = Math.max(0, (SV.S.cur[k] | 0) + Math.round(n)); };
  function gemBal() { try { return window.XEVA && XEVA.gem ? XEVA.gem.get() : 0; } catch (e) { return 0; } }
  SV.gems = gemBal;
  SV.can = function (cost) { return Object.keys(cost || {}).every((k) => (k === "gem" ? gemBal() : SV.cur(k)) >= cost[k]); };
  SV.spend = function (cost, why) {
    if (!SV.can(cost)) return false;
    Object.keys(cost).forEach((k) => { if (k === "gem") { try { XEVA.gem.add(-cost[k], "MagiBattle：" + (why || "購入")); } catch (e) {} } else SV.add(k, -cost[k]); });
    return true;
  };
  /* ごほうびを受け取る。rw = { credit, bdata, …, gear: T, cube: 1, xeva, gem }。返す：表示用の [ [名前, 数] ] */
  SV.give = function (rw, why) {
    const out = [];
    Object.keys(rw || {}).forEach((k) => {
      const n = rw[k]; if (!n) return;
      if (k === "xeva") { try { XEVA.add(n, "MagiBattle：" + (why || "ごほうび")); } catch (e) {} out.push(["XEVA", n, "xeva"]); }
      else if (k === "gem") { try { XEVA.gem.add(n, "MagiBattle：" + (why || "ごほうび")); } catch (e) {} out.push(["ジェム", n, "gem"]); }
      else if (k === "gear") { const g = SV.addGear(n); out.push(["装備 T" + g.t + "（" + ST().GEAR_PART_NM[g.p] + "）", 1, "gear"]); }
      else if (k === "cube") { const c = SV.addCube(); out.push([c ? ST().CUBES[c].nm : "キューブの欠片 ×10", c ? 1 : 10, "cube"]); if (!c) SV.add("shard", 10); }
      else if (D().ITEMS[k]) { SV.add(k, n); out.push([D().ITEMS[k].nm, n, k]); }
    });
    return out;
  };

  /* ══════════ レベル・スキル ══════════ */
  SV.lvUp = function (id, n) {
    const u = SV.unit(id), cap = ST().lvCap(SV.awk(id));
    let done = 0;
    if (!SV.owned(id)) return 0;
    if (u.lv < SV.effLv(id)) u.lv = SV.effLv(id);        /* シンクロのレベルから上げはじめる */
    while (done < n && u.lv < cap) { const c = D().lvCost(u.lv); if (!SV.spend(c)) break; u.lv++; done++; }
    if (done) SV.save();
    return done;
  };
  SV.lvUpCost = function (id, n) {
    const u = SV.unit(id), cap = ST().lvCap(SV.awk(id)); let lv = Math.max(u.lv, SV.effLv(id)), c = { credit: 0, bdata: 0 }, k = 0;
    while (k < n && lv < cap) { const x = D().lvCost(lv); c.credit += x.credit; c.bdata += x.bdata; lv++; k++; }
    return { cost: c, n: k, to: lv };
  };
  /* ★★ 2026-10-31 まとめて：素材が続くかぎり（最大 Lv まで）上げる。上がった数を返す */
  SV.skillUpMax = function (id, i, max) { let n = 0; while (n < (max || 99) && SV.skillUp(id, i)) n++; return n; };
  SV.skillUp = function (id, i) {
    const u = SV.unit(id); const lv = u.sk[i];
    if (!SV.owned(id) || lv >= ST().SKILL_MAX) return false;
    if (!SV.spend(D().skillCost(lv), "スキル強化")) return false;
    u.sk[i] = lv + 1; SV.save(); return true;
  };

  /* ══════════ 装備 ══════════ */
  function gid() { return "g" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36); }
  SV.addGear = function (t, p, cls, sq) {
    const parts = ST().GEAR_PARTS, cl = ["atk", "def", "sup"], sqs = ["bloom", "blaze", "prism"];
    const g = { p: p || parts[Math.floor(Math.random() * 4)], t: Math.max(1, Math.min(9, t | 0)), e: 0, cls: cls || cl[Math.floor(Math.random() * 3)], sq: sq || sqs[Math.floor(Math.random() * 3)], ol: [] };
    const k = gid(); SV.S.gear[k] = g; return Object.assign({ id: k }, g);
  };
  SV.gearOwner = function (k) { const U = SV.S.units; for (const id in U) { const u = U[id]; for (const p in u.gear) if (u.gear[p] === k) return id; } return ""; };
  SV.equip = function (id, k) {
    const g = SV.S.gear[k]; if (!g) return false;
    const old = SV.gearOwner(k); if (old) delete SV.unit(old).gear[g.p];
    SV.unit(id).gear[g.p] = k; SV.save(); return true;
  };
  SV.unequip = function (id, p) { delete SV.unit(id).gear[p]; SV.save(); };
  SV.bestGearFor = function (id, p) {
    let best = null, bv = -1; const K = ST().KITS[id];
    Object.keys(SV.S.gear).forEach((k) => { const g = SV.S.gear[k]; if (g.p !== p) return; const o = SV.gearOwner(k); if (o && o !== id) return; const m = ST().gearMain(Object.assign({ p }, g), id); const v = m.atk * 18 + m.hp * 0.55 + m.def * 12 + (g.ol || []).length * 400 + (K && g.cls === K.cls ? 1 : 0); if (v > bv) { bv = v; best = k; } });
    return best;
  };
  SV.autoEquip = function (id) { ST().GEAR_PARTS.forEach((p) => { const k = SV.bestGearFor(id, p); if (k) SV.unit(id).gear[p] = k; }); SV.save(); };
  SV.enhanceMax = function (k) { let n = 0; while (n < 5 && SV.enhance(k)) n++; return n; };
  SV.enhance = function (k) { const g = SV.S.gear[k]; if (!g || g.e >= 5) return false; if (!SV.spend(D().gearCost(g.t, g.e), "装備強化")) return false; g.e++; SV.save(); return true; };
  function rollOl(exclude) { const keys = Object.keys(ST().OL_FX).filter((x) => (exclude || []).indexOf(x) < 0); const k = keys[Math.floor(Math.random() * keys.length)]; const f = ST().OL_FX[k]; return { k, v: Math.round((f.min + Math.random() * (f.max - f.min)) * 10) / 10, lock: false }; }
  SV.overload = function (k) {
    const g = SV.S.gear[k]; if (!g || g.t !== 9) return false;
    if (!SV.spend({ olcore: 1, credit: 100000 }, "オーバーロード")) return false;
    g.t = 10; g.ol = []; for (let i = 0; i < 3; i++) g.ol.push(rollOl(g.ol.map((x) => x.k)));
    SV.save(); return true;
  };
  SV.rerollCost = (k) => { const g = SV.S.gear[k]; const n = g ? (g.ol || []).filter((x) => x.lock).length : 0; return { module: 1 + n, credit: 20000 }; };
  SV.reroll = function (k) {
    const g = SV.S.gear[k]; if (!g || g.t !== 10) return false;
    if ((g.ol || []).every((x) => x.lock)) return false;
    if (!SV.spend(SV.rerollCost(k), "オーバーロードの再設定")) return false;
    const keep = g.ol.filter((x) => x.lock).map((x) => x.k);
    g.ol = g.ol.map((x) => (x.lock ? x : rollOl(keep.concat(g.ol.filter((y) => y !== x).map((y) => y.k)))));
    SV.save(); return true;
  };
  SV.dismantle = function (k) { const g = SV.S.gear[k]; if (!g || SV.gearOwner(k)) return null; delete SV.S.gear[k]; const rw = { kit: Math.max(1, Math.floor(g.t / 2)), credit: 800 * g.t }; SV.give(rw); SV.save(); return rw; };

  /* ══════════ キューブ ══════════ */
  SV.addCube = function () { const all = Object.keys(ST().CUBES).filter((k) => !SV.S.cubes[k]); if (!all.length) return ""; const k = all[Math.floor(Math.random() * all.length)]; SV.S.cubes[k] = { lv: 1 }; return k; };
  SV.cubeUpMax = function (k) { let n = 0; while (n < 99 && SV.cubeUp(k)) n++; return n; };
  SV.cubeUp = function (k) { const c = SV.S.cubes[k]; if (!c || c.lv >= ST().CUBE_MAX) return false; if (!SV.spend(D().cubeCost(c.lv), "キューブ強化")) return false; c.lv++; SV.save(); return true; };
  SV.cubeOwner = function (k) { const U = SV.S.units; for (const id in U) if (U[id].cube === k) return id; return ""; };
  SV.cubeEquip = function (id, k) { const o = SV.cubeOwner(k); if (o) SV.unit(o).cube = ""; SV.unit(id).cube = k; SV.save(); };

  /* ══════════ 好感度 ══════════ */
  SV.bondAdd = function (id, x) {
    const u = SV.unit(id); u.bx = (u.bx | 0) + x; let up = 0;
    while (u.bond < ST().BOND_MAX && u.bx >= D().bondNeed(u.bond)) { u.bx -= D().bondNeed(u.bond); u.bond++; up++; }
    if (u.bond >= ST().BOND_MAX) u.bx = 0;
    SV.save(); return up;
  };
  SV.canTalk = (id) => SV.owned(id) && SV.unit(id).talk !== today();
  SV.talk = function (id, good) { if (!SV.canTalk(id)) return 0; SV.unit(id).talk = today(); SV.track("talk", 1); return SV.bondAdd(id, good ? 120 : 60); };
  SV.gift = function (id, n) { n = Math.min(n || 1, SV.cur("gift")); if (n <= 0 || !SV.owned(id)) return 0; SV.add("gift", -n); return SV.bondAdd(id, 70 * n); };
  /* ★★ 2026-10-31 まとめて：好感度が最大になるまでに要るギフトの数 */
  SV.giftNeed = function (id) { const u = SV.unit(id); let need = 0, lv = u.bond, bx = u.bx | 0; while (lv < ST().BOND_MAX) { need += D().bondNeed(lv) - bx; bx = 0; lv++; } return Math.ceil(need / 70); };

  /* ══════════ 研究 ══════════ */
  SV.resUpMax = function (cls) { let n = 0; while (n < 99 && SV.resUp(cls)) n++; return n; };
  SV.resUp = function (cls) { const lv = SV.S.res[cls] | 0; if (lv >= ST().RESEARCH_MAX) return false; if (!SV.spend(D().resCost(lv), "研究")) return false; SV.S.res[cls] = lv + 1; SV.save(); return true; };

  /* ══════════ キャンペーンの進み ══════════ */
  SV.cleared = (id, hard) => (hard ? SV.S.camp.h : SV.S.camp.n)[id] | 0;
  SV.setClear = function (id, hard, stars) { const m = hard ? SV.S.camp.h : SV.S.camp.n; const first = !m[id]; m[id] = Math.max(m[id] | 0, stars | 0); SV.save(); return first; };
  SV.progress = function () { const n = Object.keys(SV.S.camp.n).length, h = Object.keys(SV.S.camp.h).length; return n + h * 1.5; };
  SV.unlocked = function (c, s, hard) {
    if (hard) { if (!SV.cleared(c + "-8", false)) return false; if (s === 1) return c === 1 || !!SV.cleared((c - 1) + "-8", true); return !!SV.cleared(c + "-" + (s - 1), true); }
    if (c === 1 && s === 1) return true;
    if (s === 1) return !!SV.cleared((c - 1) + "-8", false);
    return !!SV.cleared(c + "-" + (s - 1), false);
  };
  SV.nextStage = function () { for (let c = 1; c <= 6; c++) for (let s = 1; s <= 8; s++) if (!SV.cleared(c + "-" + s, false)) return { c, s }; return { c: 6, s: 8 }; };

  /* ══════════ 前哨基地 ══════════ */
  SV.postPending = function () {
    const P = SV.progress(), r = D().outpostRate(P);
    const h = Math.min(D().OUTPOST_MAX_H, Math.max(0, (Date.now() - SV.S.post.at) / 3600000));
    const out = {}; Object.keys(r).forEach((k) => { const v = r[k] * h; out[k] = k === "credit" || k === "bdata" ? Math.floor(v) : Math.floor(v); });
    return { h, items: out, rate: r };
  };
  SV.postClaim = function () { const p = SV.postPending(); const rw = {}; Object.keys(p.items).forEach((k) => { if (p.items[k] > 0) rw[k] = p.items[k]; }); SV.S.post.at = Date.now(); const got = SV.give(rw, "前哨基地"); SV.track("outpost", 1); SV.save(); return got; };
  SV.wipeCost = function () { if (SV.S.post.wipeDay !== today()) return 0; const n = SV.S.post.wipeN | 0; return n >= D().WIPE_GEMS.length ? -1 : D().WIPE_GEMS[n]; };
  SV.wipe = function () {
    if (SV.S.post.wipeDay !== today()) { SV.S.post.wipeDay = today(); SV.S.post.wipeN = 0; }
    const n = SV.S.post.wipeN | 0; if (n >= D().WIPE_GEMS.length) return null;
    const g = D().WIPE_GEMS[n]; if (g && !SV.spend({ gem: g }, "前哨基地の殲滅")) return null;
    const r = D().outpostRate(SV.progress()), rw = {}; Object.keys(r).forEach((k) => { const v = Math.floor(r[k] * 2); if (v > 0) rw[k] = v; });
    SV.S.post.wipeN = n + 1; const got = SV.give(rw, "殲滅"); SV.save(); return got;
  };

  /* ══════════ ミッション ══════════ */
  SV.daily = function () {
    if (!S) return;
    const t = today(), w = week();
    if (S.ms.day !== t) { S.ms.day = t; S.ms.d = {}; S.ms.dc = {}; S.ms.dAll = 0; S.ms.d.login = 1; }
    if (S.ms.week !== w) { S.ms.week = w; S.ms.w = {}; S.ms.wc = {}; }
    if (S.shop.day !== t) { S.shop.day = t; S.shop.b = {}; }
    if (S.icpt.day !== t) { S.icpt.day = t; S.icpt.tries = 0; S.icpt.dayBest = 0; }
    if (S.arena.day !== t) { S.arena.day = t; S.arena.tries = 0; S.arena.buy = 0; }
  };
  SV.track = function (key, n) { SV.daily(); S.ms.d[key] = (S.ms.d[key] | 0) + (n || 1); S.ms.w[key] = (S.ms.w[key] | 0) + (n || 1); SV.save(); };
  SV.msProg = (m, weekly) => Math.min(m.n, ((weekly ? SV.S.ms.w : SV.S.ms.d)[m.key] | 0));
  SV.msClaim = function (m, weekly) {
    const c = weekly ? SV.S.ms.wc : SV.S.ms.dc;
    if (c[m.id] || SV.msProg(m, weekly) < m.n) return null;
    c[m.id] = 1; const got = SV.give(m.rw, weekly ? "ウィークリーミッション" : "デイリーミッション"); SV.save(); return got;
  };
  SV.msAllDone = () => D().DAILY.every((m) => SV.S.ms.dc[m.id]);
  SV.msClaimAll = function () { if (SV.S.ms.dAll || !SV.msAllDone()) return null; SV.S.ms.dAll = 1; const got = SV.give(D().DAILY_ALL, "デイリーミッションのコンプリート"); SV.save(); return got; };

  /* ══════════ ショップ ══════════ */
  SV.shopLeft = (it) => it.lim - (SV.S.shop.b[it.id] | 0);
  SV.buy = function (it, n) {
    n = Math.max(1, Math.min(n || 1, SV.shopLeft(it)));
    if (SV.shopLeft(it) <= 0) return null;
    const cost = {}; Object.keys(it.cost).forEach((k) => { cost[k] = it.cost[k] * n; });
    if (!SV.spend(cost, it.nm + (n > 1 ? " ×" + n : ""))) return null;
    SV.S.shop.b[it.id] = (SV.S.shop.b[it.id] | 0) + n;
    const get = {}; Object.keys(it.get).forEach((k) => { get[k] = k === "gear" ? it.get[k] : it.get[k] * n; });
    let got = SV.give(get, "ショップ");
    if (it.get.gear && n > 1) for (let i = 1; i < n; i++) got = got.concat(SV.give({ gear: it.get.gear }, "ショップ"));
    SV.save(); return got;
  };
  /* 何回ぶん買えるか（回数と素材の両方） */
  SV.buyMax = function (it) { let n = 0; const left = SV.shopLeft(it); while (n < left) { const c = {}; Object.keys(it.cost).forEach((k) => { c[k] = it.cost[k] * (n + 1); }); if (!SV.can(c)) break; n++; } return n; };
  /* ストーリーを見た記録（アーカイブ） */
  /* ★ 同期で混ざるのは camp.story（xeva-cloud の mergeBattle2 が和をとる）なので、そちらにも付ける */
  SV.seen = (k) => !!((SV.S.seen && SV.S.seen[k]) || (SV.S.camp.story && SV.S.camp.story[k]) || (k === "prologue" && SV.S.seenPro));
  SV.markSeen = (k) => { if (!SV.S.seen) SV.S.seen = {}; if (!SV.S.camp.story) SV.S.camp.story = {}; if (!SV.S.seen[k] || !SV.S.camp.story[k]) { SV.S.seen[k] = 1; SV.S.camp.story[k] = 1; SV.save(); } };

  /* ══════════ 編成 ══════════ */
  SV.squad = (i) => { const q = (SV.S.squads[i == null ? SV.S.sqI : i] || []).filter((id) => SV.owned(id)); return q.length ? q.slice(0, 5) : SV.autoSquad(); };
  SV.setSquad = (list, i) => { SV.S.squads[i == null ? SV.S.sqI : i] = (list || []).slice(0, 5); SV.save(); };
  /* おまかせ編成：Ⅰ・Ⅱ・Ⅲ・Ⅲ・自由（戦力の高い順）。持っているキャラだけ（足りなければ allowTrial のとき体験キャラ） */
  /* ★ 持っているキャラを先に（Ⅰ・Ⅱ・Ⅲ・Ⅲ・自由）。体験は足りない枠だけ（足りないバーストの段を優先） */
  SV.autoSquad = function (allowTrial) {
    const own = ST().IDS.filter((id) => SV.owned(id));
    const pw = (id) => SV.power(id);
    const pick = [], take = (arr, n) => { arr.forEach((id) => { if (n > 0 && pick.indexOf(id) < 0 && pick.length < 5) { pick.push(id); n--; } }); };
    const byOwn = (b) => own.filter((id) => ST().KITS[id].burst === b).sort((a, c) => pw(c) - pw(a));
    take(byOwn(1), 1); take(byOwn(2), 1); take(byOwn(3), 2);
    take(own.slice().sort((a, c) => pw(c) - pw(a)), 5);
    return pick.slice(0, 5);
  };
  /* 戦闘に出す5人の能力（体験を含む） */
  SV.teamOf = function (ids) {
    return (ids || []).filter(Boolean).map((id) => (SV.owned(id) ? SV.opt(id) : null)).filter(Boolean);
  };
})();
