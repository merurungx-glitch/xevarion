/* ============================================================
   MagiBattle 2.0 — アプリ本体（画面・セーブ・育成・報酬）★★ 2026-09-23 全面刷新
   ------------------------------------------------------------
   ・キャラは <b>XEVARION の全キャラ</b>（mb-core.js の CHARS・No. 順）。性能は ../magibattle-stats.js。
   ・所持と<b>凸は共通</b>：MagiBurst（magiburst_v1）と XEVA ガチャ（xeva_gacha_v1）を読むだけで、ここでは書かない。
   ・レベルは MagiBattle の経験値と、<b>MagiBurst で育てたレベル</b>の高いほう（育てた子はここでも強い）。
   ・<b>装備</b>は MagiBattle の持ちもの（MagiBurst から移設。持っていた装備は1回だけ引きつぐ）。
   ・通貨の表示は XEVARION 共通の<b>ジェム</b>（gem.png・XEVA.gem）。報酬も共通ウォレットへ。
   ・セーブ（magibattle_v1）は xeva-cloud が同期する。<b>同期で書きかわったら読み直す</b>
     （前はメモリの写しで上書きしていたので、別の端末の進みが消えていた）。
   ============================================================ */
(function () {
  "use strict";
  const $ = (q, el) => (el || document).querySelector(q);
  const $$ = (q, el) => Array.from((el || document).querySelectorAll(q));
  const M = () => window.MBStats;
  const BT = () => window.MBT_BATTLE;
  const SAVE = "magibattle_v1";
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  const nf = (n) => Math.round(n || 0).toLocaleString();
  const todayKey = () => new Date().toLocaleDateString("sv-SE");

  let ACCT = null;
  try { ACCT = JSON.parse(localStorage.getItem("xeva_account_v1") || "null"); } catch (e) {}
  if (!ACCT || !ACCT.setupDone) { location.replace("../index.html"); return; }

  /* ══════════════ セーブ ══════════════ */
  const PARTY_N = 5, PRESETS = 5;
  function fresh() {
    return { ver: 2, xp: {}, parties: [[null, null, null, null, null]], pIdx: 0, gear: {}, gearOn: {},
      mats: { crystal: 0, stone: 0 }, day: "", plays: {}, wins: {}, totalWins: 0, qplays: 0,
      tower: { best: 0 }, saBest: null, icp: { day: "", n: 0, best: {} }, pref: { auto: true, speed: 1, sfx: true } };
  }
  let DB = fresh();
  function load() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(SAVE) || "null"); } catch (e) {}
    DB = Object.assign(fresh(), raw || {});
    if (raw && raw.owner && ACCT.xvUid && raw.owner !== ACCT.xvUid) DB = fresh();
    migrate();
    if (!Array.isArray(DB.parties) || !DB.parties.length) DB.parties = [[null, null, null, null, null]];
    while (DB.parties.length < PRESETS) DB.parties.push([null, null, null, null, null]);
    DB.parties = DB.parties.slice(0, PRESETS).map((p) => { const a = (Array.isArray(p) ? p : []).slice(0, PARTY_N); while (a.length < PARTY_N) a.push(null); return a.map((x) => (x && M().unit(x) ? x : null)); });
    if (!(DB.pIdx >= 0 && DB.pIdx < PRESETS)) DB.pIdx = 0;
    DB.mats = Object.assign({ crystal: 0, stone: 0 }, DB.mats || {});
    DB.tower = Object.assign({ best: 0 }, DB.tower || {});
    DB.icp = Object.assign({ day: "", n: 0, best: {} }, DB.icp || {});
    DB.pref = Object.assign({ auto: true, speed: 1, sfx: true }, DB.pref || {});
    rollDay();
  }
  function save() {
    try { DB.owner = ACCT.xvUid || DB.owner; DB.at = Date.now(); localStorage.setItem(SAVE, JSON.stringify(DB)); } catch (e) {}
  }
  /* 旧 MagiBattle（ver1）→ ver2。レベル（経験値）・素材・塔・スコアタの記録は引きつぐ。 */
  const OLD_ALIAS = { rinon: "rinonx", shion: "shiona" };
  function migrate() {
    if (DB.ver === 2 && DB.migMB) return;
    if (DB.ver !== 2) {
      const xp = {};
      Object.keys(DB.xp || {}).forEach((k) => { const id = OLD_ALIAS[k] || k; xp[id] = Math.max(xp[id] || 0, DB.xp[k] | 0); });
      DB.xp = xp;
      if (Array.isArray(DB.party) && !DB.migParty) {
        DB.parties = [DB.party.slice(0, PARTY_N).map((x) => (x ? (OLD_ALIAS[x] || x) : null))];
        DB.migParty = 1;
      }
      /* 旧装備（武器・防具・アクセ）は強化石で返す */
      let st = 0;
      const RATE = { N: 1, R: 3, SR: 6, SSR: 12 };
      Object.keys(DB.inv || {}).forEach((k) => { const r = /^wx_/.test(k) ? "SSR" : (k.split("_")[0] || "").toUpperCase(); st += (RATE[r] || 2) * (DB.inv[k] | 0); });
      DB.mats = Object.assign({ crystal: 0, stone: 0 }, DB.mats || {});
      DB.mats.stone = (DB.mats.stone | 0) + st;
      delete DB.inv; delete DB.equip; delete DB.party;
      DB.gear = DB.gear && typeof DB.gear === "object" && !Array.isArray(DB.gear) ? DB.gear : {};
      DB.gearOn = DB.gearOn || {};
      DB.ver = 2;
      if (st) DB._migNote = "旧装備を強化石 " + st + " 個に交換しました";
    }
    /* ★ MagiBurst の装備（廃止）を1回だけ引きつぐ。1つ＝オーバーロード1つを持つ T7 の装備。 */
    if (!DB.migMB) {
      DB.migMB = 1;
      try {
        const mb = JSON.parse(localStorage.getItem("magiburst_v1") || "null") || {};
        const g = mb.gear || {}, on = mb.gearOn || {};
        let n = 0;
        Object.keys(g).forEach((gid) => {
          const x = g[gid]; if (!x || !M().GEAR_PART[x.p] || !M().GEAR_FX[x.e]) return;
          const id = "mb_" + gid;
          if (DB.gear[id]) return;
          DB.gear[id] = { id, p: x.p, t: 7, lv: 0, subs: [{ e: x.e, v: +(+x.v).toFixed(2) }], at: x.t || Date.now(), from: "MagiBurst" };
          n++;
        });
        Object.keys(on).forEach((cid) => {
          const slots = on[cid] || {};
          Object.keys(slots).forEach((p) => { const id = "mb_" + slots[p]; if (DB.gear[id]) { (DB.gearOn[cid] = DB.gearOn[cid] || {})[p] = id; } });
        });
        if (n) DB._migNote = (DB._migNote ? DB._migNote + "／" : "") + "MagiBurst の装備 " + n + " 個を引きつぎました";
      } catch (e) {}
    }
  }
  function rollDay() {
    const t = todayKey();
    if (DB.day !== t) { DB.day = t; DB.plays = {}; DB.wins = {}; DB.qplays = 0; }
    if (DB.icp.day !== t) { DB.icp.day = t; DB.icp.n = 0; }
  }
  /* ★ 同期で書きかわったら読み直す（バトル中・シートを開いているあいだは、あとで） */
  let pendingReload = false;
  function reloadFromSync() {
    if ($("#battle").classList.contains("on") || $("#sheet").classList.contains("on")) { pendingReload = true; return; }
    pendingReload = false;
    load(); renderAll();
  }
  window.addEventListener("xeva:synced", reloadFromSync);
  window.addEventListener("storage", (e) => { if (e.key === SAVE || e.key === "magiburst_v1" || e.key === "xeva_gacha_v1") reloadFromSync(); });
  window.addEventListener("xeva:gem", () => paintGem());

  /* ══════════════ 所持・凸・レベル ══════════════ */
  let _mb = null, _xg = null, _at = 0;
  function shared(id) {
    const now = Date.now();
    if (!_mb || now - _at > 1500) { try { _mb = JSON.parse(localStorage.getItem("magiburst_v1") || "null") || {}; } catch (e) { _mb = {}; } try { _xg = JSON.parse(localStorage.getItem("xeva_gacha_v1") || "null") || {}; } catch (e) { _xg = {}; } _at = now; }
    return M().sharedOf(id, _mb, _xg);
  }
  const XP_K = 12;
  function lvFromXp(xp) { return Math.min(M().MAX_LV, 1 + Math.floor(Math.sqrt((xp || 0) / XP_K))); }
  function xpForLv(lv) { return (lv - 1) * (lv - 1) * XP_K; }
  function ownLv(id) { return lvFromXp(DB.xp[id] || 0); }
  function lvOf(id) { const s = shared(id); return Math.max(ownLv(id), Math.min(M().MAX_LV, Math.round((s.mbLv || 0) * M().MAX_LV / 70))); }
  function owned(id) { return shared(id).own; }
  function awkOf(id) { return shared(id).awk; }
  function gearList(id) { const o = DB.gearOn[id] || {}; return M().GEAR_PARTS.map((p) => DB.gear[o[p]]).filter(Boolean); }
  function statsOf(id) { return M().statsAt(id, lvOf(id), awkOf(id), M().gearSum(gearList(id))); }
  function party() { return DB.parties[DB.pIdx]; }
  function partyIds() { return party().filter(Boolean); }
  function ownedIds() { return M().roster().filter(owned); }
  function allyCfg(ids) { return ids.map((id) => ({ id, lv: lvOf(id), awk: awkOf(id), gear: gearList(id) })); }

  /* ══════════════ 通貨・素材 ══════════════ */
  function gemBal() { try { return window.XEVA && XEVA.gem ? XEVA.gem.get() : 0; } catch (e) { return 0; } }
  function gemAdd(n, why) { try { if (window.XEVA && XEVA.gem) XEVA.gem.add(n, why); } catch (e) {} paintGem(); }
  function xevaAdd(n, why) { try { if (window.XEVA) XEVA.add(n, why); } catch (e) {} }
  function paintGem() { const el = $("#gemBal"); if (el) el.textContent = nf(gemBal()); }
  const MAT_SVG = {
    crystal: '<svg viewBox="0 0 24 24"><path d="M12 2l6 6-6 14-6-14z" fill="#7fd4ff"/><path d="M12 2l6 6H6z" fill="#c9f0ff"/><path d="M12 22L9 8h6z" fill="#3fa7e6" opacity=".7"/></svg>',
    stone: '<svg viewBox="0 0 24 24"><path d="M5 9l5-5 9 3 1 8-6 5-8-2z" fill="#a8b1c7"/><path d="M5 9l5-5 4 7-5 4z" fill="#d8deea"/><path d="M14 11l6 4-6 5z" fill="#7d879e"/></svg>',
  };
  function matBarHTML() {
    return '<div class="matbar"><span>' + MAT_SVG.crystal + "経験の結晶 ×" + nf(DB.mats.crystal) + "</span><span>" + MAT_SVG.stone + "強化石 ×" + nf(DB.mats.stone) + "</span></div>";
  }

  /* ══════════════ 装備 ══════════════ */
  const PART_SVG = {
    head: '<path d="M5 13a7 7 0 0114 0v3H5z" fill="currentColor" opacity=".9"/><path d="M8 16h8v3H8z" fill="currentColor" opacity=".55"/>',
    arm: '<path d="M6 5h5l2 7-2 7H6z" fill="currentColor" opacity=".9"/><path d="M13 7h5v10h-5z" fill="currentColor" opacity=".55"/>',
    body: '<path d="M6 5l6-2 6 2v7c0 5-6 8-6 8s-6-3-6-8z" fill="currentColor" opacity=".9"/><path d="M12 6v12" stroke="#000" stroke-opacity=".35" stroke-width="1.6"/>',
    leg: '<path d="M8 3h4v9l2 8H7l1-8z" fill="currentColor" opacity=".9"/><path d="M13 3h3v8l2 9h-3z" fill="currentColor" opacity=".55"/>',
  };
  const TIER_C = ["#8b93a8", "#8b93a8", "#6fd08a", "#6fd08a", "#5ab8ff", "#5ab8ff", "#b58cff", "#b58cff", "#ffcc4d", "#ff7a52"];
  function gearIcon(p, t) { return '<svg viewBox="0 0 24 24" style="color:' + TIER_C[t | 0] + '">' + PART_SVG[p] + "</svg>"; }
  function newGear(t, part) {
    const G = M(); t = Math.max(1, Math.min(9, t | 0));
    const p = part || G.GEAR_PARTS[Math.floor(Math.random() * 4)];
    const nSub = t >= 7 ? 1 + Math.floor(Math.random() * 3) : t >= 4 ? Math.floor(Math.random() * 3) : Math.floor(Math.random() * 2);
    const ids = G.GEAR_FX_IDS.slice().sort(() => Math.random() - 0.5).slice(0, nSub);
    const subs = ids.map((e) => { const f = G.GEAR_FX[e]; return { e, v: +(f.min + (f.max - f.min) * Math.random()).toFixed(2) }; });
    const id = "g" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    DB.gear[id] = { id, p, t, lv: 0, subs, at: Date.now() };
    return DB.gear[id];
  }
  function wearerOf(gid) { for (const cid of Object.keys(DB.gearOn)) { const o = DB.gearOn[cid] || {}; for (const p of Object.keys(o)) if (o[p] === gid) return cid; } return null; }
  function gearName(g) { return "T" + g.t + " " + M().GEAR_PART[g.p].full + (g.lv ? " +" + g.lv : ""); }
  function gearMainText(g) {
    const m = M().GEAR_PART[g.p].main, sc = g.t * (1 + 0.2 * (g.lv | 0));
    const nm = { atk: "攻撃", hp: "HP", def: "防御" };
    return Object.keys(m).map((k) => nm[k] + "+" + (m[k] * sc * 100).toFixed(1) + "%").join("・");
  }
  function gearSubsHTML(g) {
    const G = M();
    return '<div class="gsubs">' + (g.subs || []).map((x) => '<span class="' + (G.gearIsHigh(x) ? "hi" : "") + '" style="--sc:' + G.GEAR_FX[x.e].c + '">' + G.GEAR_FX[x.e].short + " +" + x.v + "%</span>").join("") + "</div>";
  }
  function gearScore(g) { return g.t * 10 + (g.lv | 0) * 4 + (g.subs || []).reduce((a, x) => a + x.v / 3, 0); }
  function autoEquip(cid) {
    const G = M(); const on = DB.gearOn[cid] = DB.gearOn[cid] || {};
    G.GEAR_PARTS.forEach((p) => {
      const cur = DB.gear[on[p]];
      let best = cur || null;
      Object.values(DB.gear).forEach((g) => { if (g.p !== p) return; const w = wearerOf(g.id); if (w && w !== cid) return; if (!best || gearScore(g) > gearScore(best)) best = g; });
      if (best) on[p] = best.id;
    });
    save();
  }

  /* ══════════════ 画面の骨組み ══════════════ */
  const TABS = [
    { k: "party", nm: "編成", ic: '<path d="M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7z" fill="currentColor" opacity=".25"/><path d="M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7z" stroke="currentColor" stroke-width="1.8" fill="none"/><path d="M8.5 12.5l2.5 2.5 4.5-5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>' },
    { k: "chars", nm: "キャラ", ic: '<circle cx="9" cy="8" r="3.4" stroke="currentColor" stroke-width="1.8" fill="none"/><path d="M3 20a6 6 0 0112 0" stroke="currentColor" stroke-width="1.8" fill="none"/><circle cx="17" cy="9" r="2.6" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M15.5 14.5A5 5 0 0121 19" stroke="currentColor" stroke-width="1.6" fill="none"/>' },
    { k: "daily", nm: "デイリー", ic: '<rect x="3.5" y="5" width="17" height="15" rx="2" stroke="currentColor" stroke-width="1.8" fill="none"/><path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.8"/><rect x="7" y="13" width="3" height="3" fill="currentColor"/>' },
    { k: "quest", nm: "クエスト", ic: '<path d="M5 19L19 5M14 5h5v5M5 5l5 5M14 14l5 5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>' },
    { k: "icp", nm: "迎撃戦", ic: '<circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.8" fill="none"/><circle cx="12" cy="12" r="3.5" stroke="currentColor" stroke-width="1.8" fill="none"/><path d="M12 1v5M12 18v5M1 12h5M18 12h5" stroke="currentColor" stroke-width="1.8"/>' },
    { k: "tower", nm: "無限の塔", ic: '<path d="M9 21V9l3-6 3 6v12M7 21h10M9 13h6M9 17h6" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linejoin="round"/>' },
    { k: "sa", nm: "スコアタ", ic: '<path d="M7 4h10v4a5 5 0 01-10 0zM4 5h3v2a3 3 0 01-3-2zM20 5h-3v2a3 3 0 003-2zM12 13v4M8 21h8M9 17h6v4H9z" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linejoin="round"/>' },
  ];
  let tab = "party";
  function renderTabs() {
    $("#tabs").innerHTML = TABS.map((t) => '<button class="mbt-tab' + (t.k === tab ? " on" : "") + '" data-t="' + t.k + '"><svg viewBox="0 0 24 24">' + t.ic + "</svg><span>" + t.nm + "</span>"
      + (t.k === "daily" && hasDailyLeft() ? '<i class="dot"></i>' : "") + "</button>").join("");
    $$("#tabs .mbt-tab").forEach((b) => b.onclick = () => { tab = b.dataset.t; renderAll(); window.scrollTo(0, 0); });
  }
  function renderAll() {
    renderTabs(); paintGem();
    const v = $("#view");
    v.innerHTML = ({ party: viewParty, chars: viewChars, daily: viewDaily, quest: viewQuest, icp: viewIcp, tower: viewTower, sa: viewSa })[tab]();
    wire[tab] && wire[tab]();
  }
  function toast(t) { const el = $("#toast"); el.textContent = t; el.classList.add("on"); clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove("on"), 2300); }
  function openSheet(html) { $("#sheetIn").innerHTML = '<button class="x" id="shX">✕</button>' + html; $("#sheet").classList.add("on"); $("#shX").onclick = closeSheet; $("#sheetIn").scrollTop = 0; }
  function closeSheet() { $("#sheet").classList.remove("on"); if (pendingReload) reloadFromSync(); }
  $("#sheet").addEventListener("click", (e) => { if (e.target.id === "sheet") closeSheet(); });

  /* ══════════════ 編成 ══════════════ */
  const SLOT_POS = [[18, 30], [50, 18], [82, 30], [67, 79], [33, 79]];   // 前1・前2・前3・後1・後2
  const SLOT_NM = ["前1", "前2", "前3", "後1", "後2"];
  let pElem = "all", selSlot = -1;
  function viewParty() {
    const ids = party(), n = ids.filter(Boolean).length;
    const pw = ids.reduce((a, id) => a + (id ? statsOf(id).power : 0), 0);
    const bus = [1, 2, 3].map((s) => ids.some((id) => id && (M().unit(id).burst === s || M().unit(id).tier.k === "crystal")));
    const syn = BT().synergyOf(ids);
    const slots = ids.map((id, i) => {
      const [x, y] = SLOT_POS[i], back = i >= 3;
      if (!id) return '<div class="slot empty' + (back ? " back" : "") + (selSlot === i ? " sel" : "") + '" data-i="' + i + '" style="left:' + x + "%;top:" + y + '%"><div class="fr"><span class="pos">' + SLOT_NM[i] + '</span><div class="ph">＋</div><div class="nm" style="color:var(--faint)">えらぶ</div><div class="pw">&nbsp;</div></div></div>';
      const p = M().unit(id), st = statsOf(id);
      return '<div class="slot' + (back ? " back" : "") + (selSlot === i ? " sel" : "") + '" data-i="' + i + '" style="left:' + x + "%;top:" + y + '%"><div class="fr"><span class="pos">' + SLOT_NM[i] + "</span>"
        + '<div class="ph"><img src="' + esc(p.th || p.img) + '" alt="">' + BT().elIcon(p.el) + '<span class="bt">' + (p.tier.k === "crystal" ? "Ⅰ~Ⅲ" : M().BURST_NM[p.burst]) + "</span></div>"
        + '<div class="nm">' + esc(p.nm) + '</div><div class="pw">' + nf(st.power) + "</div></div></div>";
    }).join("");
    return '<div class="pnl"><div class="pnl-h"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8"><circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><path d="M2 20a6 6 0 0112 0M10 20a6 6 0 0112 0"/></svg><b>パーティ編成</b>'
      + '<span class="r"><em>' + n + "/5</em>（前衛3・後衛2）</span></div>"
      + '<div class="chips" id="presets">' + DB.parties.map((p, i) => '<button class="chip' + (i === DB.pIdx ? " on" : "") + '" data-p="' + i + '">' + String.fromCharCode(65 + i) + "</button>").join("")
      + '<button class="chip" id="autoP" style="margin-left:auto">おまかせ</button><button class="chip" id="clrP">はずす</button></div>'
      + '<div class="ring">' + slots + '<div class="ctr">上3人が前衛<br>下2人が後衛</div></div>'
      + '<div class="statrow"><div><small>総戦力</small><b>' + nf(pw) + "</b></div>"
      + "<div><small>バースト</small><b>" + [1, 2, 3].map((s, i) => '<span style="color:' + (bus[i] ? "#ffe066" : "#58607a") + '">' + M().BURST_NM[s] + "</span>").join(" ") + "</b></div>"
      + "<div><small>シナジー</small><b>" + (syn.atk ? "攻撃+" + Math.round(syn.atk * 100) + "%" : "—") + "</b></div></div>"
      + '<div class="hintbox"><div>枠をタップしてキャラを選ぶ。選んだ枠をもう一度タップすると<b>入れ替え</b>（2つの枠をタップ）。前衛は敵に狙われやすく、後衛は狙われにくい。バーストは<b>Ⅰ→Ⅱ→Ⅲ</b>の順につなぐので、3段そろえよう！</div>'
      + '<button class="tip" id="helpB">編成のコツ</button></div>'
      + (bus.every(Boolean) ? "" : '<div class="note" style="margin-top:8px;color:#ffb0b8">⚠ バースト ' + [1, 2, 3].filter((s, i) => !bus[i]).map((s) => M().BURST_NM[s]).join("・") + " のキャラがいません。FULL BURST まで届きません。</div>")
      + "</div>"
      + '<div class="pnl"><div class="pnl-h"><b>出撃</b><span class="r">デイリー・クエスト・塔・迎撃戦・スコアタ</span></div>'
      + '<button class="btn red wide" id="goDaily">⚔ デイリーバトルへ</button></div>';
  }
  const wire = {};
  wire.party = function () {
    $$("#presets [data-p]").forEach((b) => b.onclick = () => { DB.pIdx = +b.dataset.p; selSlot = -1; save(); renderAll(); });
    $("#autoP").onclick = () => {
      const list = ownedIds().map((id) => ({ id, p: statsOf(id).power, u: M().unit(id) })).sort((a, b) => b.p - a.p);
      const pick = [];
      [1, 2, 3].forEach((s) => { const c = list.find((x) => !pick.includes(x.id) && x.u.burst === s); if (c) pick.push(c.id); });
      list.forEach((x) => { if (pick.length < 5 && !pick.includes(x.id)) pick.push(x.id); });
      /* 防御型がいれば前衛へ */
      pick.sort((a, b) => (M().unit(b).cls === "defender") - (M().unit(a).cls === "defender"));
      DB.parties[DB.pIdx] = pick.concat([null, null, null, null, null]).slice(0, 5);
      save(); renderAll(); toast("戦力とバーストⅠ・Ⅱ・Ⅲがそろうように編成しました");
    };
    $("#clrP").onclick = () => { DB.parties[DB.pIdx] = [null, null, null, null, null]; save(); renderAll(); };
    $$(".ring .slot").forEach((el) => el.onclick = () => {
      const i = +el.dataset.i;
      if (selSlot >= 0 && selSlot !== i) {
        const p = party(); const t = p[i]; p[i] = p[selSlot]; p[selSlot] = t; selSlot = -1; save(); renderAll(); return;
      }
      if (selSlot === i || !party()[i]) { selSlot = -1; openPicker(i); return; }
      selSlot = i; renderAll(); toast("もう1つの枠をタップすると入れ替え。もう一度タップでキャラを選ぶ");
    });
    $("#helpB").onclick = openHelp;
    $("#goDaily").onclick = () => { tab = "daily"; renderAll(); };
  };
  /* キャラを選ぶシート（キャラ一覧とは別） */
  let pkSort = "power", pkBurst = 0, pkQ = "";
  function openPicker(slot) {
    const draw = () => {
      let ids = ownedIds();
      if (pElem !== "all") ids = ids.filter((id) => M().unit(id).el === pElem || M().unit(id).el2 === pElem);
      if (pkBurst) ids = ids.filter((id) => M().unit(id).burst === pkBurst || M().unit(id).tier.k === "crystal");
      if (pkQ) ids = ids.filter((id) => M().unit(id).nm.indexOf(pkQ) >= 0);
      ids.sort((a, b) => pkSort === "lv" ? lvOf(b) - lvOf(a) : pkSort === "no" ? M().roster().indexOf(b) - M().roster().indexOf(a) : statsOf(b).power - statsOf(a).power);
      const cur = party();
      $("#pkGrid").innerHTML = ids.map((id) => ccHTML(id, cur.includes(id))).join("") || '<div class="note">あてはまるキャラがいません</div>';
      $$("#pkGrid .cc").forEach((el) => el.onclick = () => {
        const id = el.dataset.id, p = party(), at = p.indexOf(id);
        if (at >= 0) p[at] = p[slot];
        p[slot] = id; save(); closeSheet(); renderAll();
      });
    };
    openSheet('<h3>' + SLOT_NM[slot] + " に入れるキャラ</h3>"
      + '<div class="chips" id="pkEl">' + elemChips() + "</div>"
      + '<div class="tools"><div class="chips" id="pkBu">' + ["全", "Ⅰ", "Ⅱ", "Ⅲ"].map((x, i) => '<button class="chip' + (i === pkBurst ? " on" : "") + '" data-b="' + i + '">' + (i ? "B" + x : "バースト" + x) + "</button>").join("") + "</div>"
      + '<select class="selbtn" id="pkSort"><option value="power">戦力が高い順</option><option value="lv">レベル順</option><option value="no">新しい順</option></select></div>'
      + '<input class="srch" id="pkQ" placeholder="名前でさがす" value="' + esc(pkQ) + '">'
      + (party()[slot] ? '<div class="brow"><button class="btn" id="pkRm">この枠をはずす</button></div>' : "")
      + '<div class="cgrid" id="pkGrid" style="margin-top:10px"></div>');
    $("#pkSort").value = pkSort;
    $("#pkSort").onchange = (e) => { pkSort = e.target.value; draw(); };
    $("#pkQ").oninput = (e) => { pkQ = e.target.value.trim(); draw(); };
    $$("#pkEl .chip").forEach((b) => b.onclick = () => { pElem = b.dataset.e; $$("#pkEl .chip").forEach((x) => x.classList.toggle("on", x === b)); draw(); });
    $$("#pkBu .chip").forEach((b) => b.onclick = () => { pkBurst = +b.dataset.b; $$("#pkBu .chip").forEach((x) => x.classList.toggle("on", x === b)); draw(); });
    const rm = $("#pkRm"); if (rm) rm.onclick = () => { party()[slot] = null; save(); closeSheet(); renderAll(); };
    draw();
  }
  function elemChips(cur) {
    cur = cur || pElem;
    return '<button class="chip' + (cur === "all" ? " on" : "") + '" data-e="all">全</button>' + M().ELEMS.map((e) => '<button class="chip' + (cur === e ? " on" : "") + '" data-e="' + e + '">' + BT().elIcon(e).replace('class="elb ', 'style="width:20px;height:20px" class="elb ') + "</button>").join("");
  }
  function ccHTML(id, inParty) {
    const p = M().unit(id), own = owned(id), aw = own ? awkOf(id) : 0;
    const lv = own ? lvOf(id) : 1, st = own ? statsOf(id) : M().statsAt(id, 1, 0, null);
    return '<div class="cc' + (own ? "" : " lock") + (inParty ? " inparty" : "") + (aw >= 4 && p.rar === "SSR" ? " mx" : "") + '" data-id="' + id + '" style="--cc:' + M().CLASSES[p.cls].c + '55">'
      + '<div class="ph"><img src="' + esc(p.th || p.img) + '" alt="" loading="lazy"><span class="lv">Lv.' + lv + '</span><span class="bu">' + (p.tier.k === "crystal" ? "Ⅰ~Ⅲ" : "B" + M().BURST_NM[p.burst]) + "</span>" + BT().elIcon(p.el) + "</div>"
      + '<div class="nm">' + esc(p.nm) + "</div>"
      + '<div class="ft"><span><i class="cls" style="--clc:' + M().CLASSES[p.cls].c + '"></i>' + p.rar + (aw ? ' <b class="aw">' + "★".repeat(aw) + "</b>" : "") + '</span><span class="pw">' + nf(st.power) + "</span></div></div>";
  }

  /* ══════════════ キャラ一覧（編成とは別のタブ） ══════════════ */
  let cElem = "all", cOwn = "own", cSort = "power", cCls = "all", cQ = "";
  function viewChars() {
    return '<div class="pnl"><div class="pnl-h"><b>キャラクター</b><span class="r" id="cCount"></span></div>'
      + '<div class="note">XEVARION の<b>全キャラ</b>が MagiBattle に出られます。所持と<b>凸は MagiBurst・XEVA ガチャと共通</b>、レベルは MagiBattle で育てた分と MagiBurst のレベルの高いほうです。</div>'
      + '<div class="chips" id="cEl" style="margin-top:10px">' + elemChips(cElem) + "</div>"
      + '<div class="tools"><div class="chips" id="cOw">' + [["own", "所持"], ["all", "すべて"], ["no", "未所持"]].map((x) => '<button class="chip' + (cOwn === x[0] ? " on" : "") + '" data-o="' + x[0] + '">' + x[1] + "</button>").join("") + "</div>"
      + '<select class="selbtn" id="cCls"><option value="all">全クラス</option><option value="attacker">火力型</option><option value="defender">防御型</option><option value="supporter">支援型</option><option value="b1">バーストⅠ</option><option value="b2">バーストⅡ</option><option value="b3">バーストⅢ</option></select>'
      + '<select class="selbtn" id="cSort"><option value="power">戦力が高い順</option><option value="lv">レベル順</option><option value="no">新しい順</option><option value="rar">レア度順</option></select></div>'
      + '<input class="srch" id="cQ" placeholder="名前でさがす" value="' + esc(cQ) + '">'
      + "</div>" + matBarHTML() + '<div class="cgrid" id="cGrid"></div>';
  }
  wire.chars = function () {
    const draw = () => {
      let ids = M().roster();
      if (cOwn === "own") ids = ids.filter(owned); else if (cOwn === "no") ids = ids.filter((id) => !owned(id));
      if (cElem !== "all") ids = ids.filter((id) => M().unit(id).el === cElem || M().unit(id).el2 === cElem);
      if (cCls !== "all") ids = ids.filter((id) => { const u = M().unit(id); return /^b/.test(cCls) ? (u.burst === +cCls[1] || u.tier.k === "crystal") : u.cls === cCls; });
      if (cQ) ids = ids.filter((id) => M().unit(id).nm.indexOf(cQ) >= 0);
      const R = M().roster();
      ids.sort((a, b) => cSort === "lv" ? lvOf(b) - lvOf(a) : cSort === "no" ? R.indexOf(b) - R.indexOf(a)
        : cSort === "rar" ? ((M().unit(b).rar === "SSR") - (M().unit(a).rar === "SSR")) || statsOf(b).power - statsOf(a).power
        : (owned(b) - owned(a)) || statsOf(b).power - statsOf(a).power);
      const inP = party();
      $("#cGrid").innerHTML = ids.map((id) => ccHTML(id, inP.includes(id))).join("") || '<div class="note">あてはまるキャラがいません</div>';
      $("#cCount").textContent = ids.length + "体（所持 " + ownedIds().length + " / " + R.length + "）";
      $$("#cGrid .cc").forEach((el) => el.onclick = () => openDetail(el.dataset.id));
    };
    $$("#cEl .chip").forEach((b) => b.onclick = () => { cElem = b.dataset.e; $$("#cEl .chip").forEach((x) => x.classList.toggle("on", x === b)); draw(); });
    $$("#cOw .chip").forEach((b) => b.onclick = () => { cOwn = b.dataset.o; $$("#cOw .chip").forEach((x) => x.classList.toggle("on", x === b)); draw(); });
    $("#cCls").value = cCls; $("#cCls").onchange = (e) => { cCls = e.target.value; draw(); };
    $("#cSort").value = cSort; $("#cSort").onchange = (e) => { cSort = e.target.value; draw(); };
    $("#cQ").oninput = (e) => { cQ = e.target.value.trim(); draw(); };
    draw();
  };

  /* ══════════════ キャラ詳細 ══════════════ */
  function openDetail(id) {
    const p = M().unit(id), own = owned(id), aw = own ? awkOf(id) : 0, lv = own ? lvOf(id) : 1;
    const xp = DB.xp[id] || 0, olv = ownLv(id), mbl = shared(id).mbLv;
    const nextXp = xpForLv(Math.min(M().MAX_LV, olv + 1)), curXp = xpForLv(olv);
    const pr = olv >= M().MAX_LV ? 100 : Math.max(0, Math.min(100, (xp - curXp) / Math.max(1, nextXp - curXp) * 100));
    const gear = DB.gearOn[id] || {};
    const gslots = M().GEAR_PARTS.map((pt) => {
      const g = DB.gear[gear[pt]];
      return '<div class="gs' + (g ? " on" : "") + '" data-p="' + pt + '" style="--gc:' + (g ? TIER_C[g.t] : "#fff") + '"><div class="gi">' + gearIcon(pt, g ? g.t : 0) + '</div><div class="gp">' + M().GEAR_PART[pt].nm + "</div>"
        + (g ? '<div class="gt">T' + g.t + (g.lv ? "+" + g.lv : "") + '</div><div class="gsub">' + (g.subs || []).map((x) => M().GEAR_FX[x.e].short).join("・") + "</div>" : '<div class="gsub">なし</div>') + "</div>";
    }).join("");
    openSheet('<div class="dhero"><img src="' + esc(p.img) + '" alt=""><div class="nmb"><b>' + esc(p.nm) + "</b><span>" + (own ? "Lv." + lv + (aw ? "・" + (aw >= 4 ? "完凸" : aw + "凸") : "") : "未所持") + "</span></div>"
      + '<div class="rar ' + (p.rar === "SSR" ? "ssr" : "") + '">' + p.rar + "</div></div>"
      + (own ? '<div class="lvrow"><div class="lvl"><div class="lvb">Lv.' + lv + '</div><small>育成 Lv.' + olv + (mbl ? "・MagiBurst Lv." + mbl : "") + "</small></div>"
        + '<div style="flex:1;min-width:0"><div class="xpbar"><i style="width:' + pr.toFixed(0) + '%"></i></div>'
        + '<div class="note" style="margin-top:3px">結晶 1個＝500EXP（所持 ' + nf(DB.mats.crystal) + "）" + (mbl && lv > olv ? "<br>いまは MagiBurst のレベルが使われています" : "") + "</div></div>"
        + '<div class="lvbt"><button class="btn gold" id="dUp1" ' + (DB.mats.crystal > 0 && olv < M().MAX_LV ? "" : "disabled") + '>＋1</button><button class="btn gold" id="dUpM" ' + (DB.mats.crystal > 0 && olv < M().MAX_LV ? "" : "disabled") + ">×10</button></div></div>" : "")
      + (own ? '<div class="pnl-h" style="margin-top:6px"><b style="font-size:15px">装備</b><span class="r"><button class="chip" id="dAutoG">おまかせ装備</button></span></div><div class="gslots">' + gslots + "</div>" : "")
      + '<div class="pnl" style="margin-top:12px">' + M().detailHTML(id, { lv, awk: aw, gear: M().gearSum(gearList(id)) }) + "</div>"
      + '<div class="note">凸（限界突破）は <b>MagiBurst・XEVA ガチャと共通</b>です。凸1つごとにステータス +7%。</div>');
    M().ensureCSS();
    const up = (n) => {
      let used = 0;
      while (used < n && DB.mats.crystal > 0 && ownLv(id) < M().MAX_LV) { DB.mats.crystal--; DB.xp[id] = (DB.xp[id] || 0) + 500; used++; }
      save(); openDetail(id); if (used) toast("経験の結晶を " + used + " 個使いました");
    };
    const u1 = $("#dUp1"); if (u1) u1.onclick = () => up(1);
    const um = $("#dUpM"); if (um) um.onclick = () => { const need = Math.ceil((xpForLv(Math.min(M().MAX_LV, ownLv(id) + 10)) - (DB.xp[id] || 0)) / 500); up(Math.max(1, need)); };
    const ag = $("#dAutoG"); if (ag) ag.onclick = () => { autoEquip(id); openDetail(id); toast("いちばん強い装備を着けました"); };
    $$("#sheetIn .gs").forEach((el) => el.onclick = () => openGearPick(id, el.dataset.p));
  }
  function openGearPick(cid, part) {
    const on = DB.gearOn[cid] = DB.gearOn[cid] || {};
    const list = Object.values(DB.gear).filter((g) => g.p === part).sort((a, b) => gearScore(b) - gearScore(a));
    openSheet("<h3>" + esc(M().unit(cid).nm) + " の" + M().GEAR_PART[part].full + "</h3>" + matBarHTML()
      + (on[part] ? '<div class="brow"><button class="btn" id="gOff">はずす</button><button class="btn gold" id="gUp">強化する</button></div>' : "")
      + '<div style="margin-top:10px">' + (list.map((g) => {
        const w = wearerOf(g.id);
        return '<div class="gcard' + (on[part] === g.id ? " on" : "") + '" data-g="' + g.id + '"><div class="gi">' + gearIcon(g.p, g.t) + '</div><div class="gtx"><b>' + gearName(g) + "</b>"
          + (g.from ? ' <small style="color:var(--gold)">MagiBurst から</small>' : "") + "<br>" + gearMainText(g) + gearSubsHTML(g)
          + (w ? '<small style="color:var(--sub)">' + esc((M().unit(w) || {}).nm || "") + " が装備中</small>" : "") + "</div></div>";
      }).join("") || '<div class="note">この部位の装備を持っていません。クエスト・迎撃戦・塔でもらえます。</div>') + "</div>");
    $$("#sheetIn .gcard").forEach((el) => el.onclick = () => {
      const gid = el.dataset.g, w = wearerOf(gid);
      if (w && w !== cid) delete DB.gearOn[w][part];
      on[part] = gid; save(); openDetail(cid);
    });
    const off = $("#gOff"); if (off) off.onclick = () => { delete on[part]; save(); openDetail(cid); };
    const upb = $("#gUp"); if (upb) upb.onclick = () => {
      const g = DB.gear[on[part]]; if (!g) return;
      if ((g.lv | 0) >= 5) { toast("もう最大まで強化しています（+5）"); return; }
      const cost = 4 + (g.lv | 0) * 4;
      if (DB.mats.stone < cost) { toast("強化石が足りません（" + cost + "個いります）"); return; }
      DB.mats.stone -= cost; g.lv = (g.lv | 0) + 1; save(); openGearPick(cid, part); toast(gearName(g) + " に強化しました（強化石 -" + cost + "）");
    };
  }

  /* ══════════════ 出撃の共通 ══════════════ */
  function canGo() {
    const ids = partyIds();
    if (!ids.length) { toast("まず編成でキャラを選んでください"); tab = "party"; renderAll(); return false; }
    return true;
  }
  function pickEnemies(seed, n, lvl) {
    const R = M().roster(); let s = M().hashN(seed, 71);
    const out = [];
    while (out.length < n) { s = (s * 1103515245 + 12345) >>> 0; const id = R[s % R.length]; if (!out.includes(id)) out.push(id); }
    return out;
  }
  function launch(cfg) {
    closeSheet();
    const ids = partyIds();
    const c = Object.assign({
      allies: allyCfg(ids).map((a, i) => Object.assign(a, { front: party().indexOf(a.id) < 3 })),
      auto: DB.pref.auto, speed: DB.pref.speed, sfx: DB.pref.sfx,
      onPref: (p) => { Object.assign(DB.pref, p); save(); },
      onRetry: () => launch(cfg),
    }, cfg);
    BT().start(c);
  }
  function mvpHTML(res) {
    const mx = Math.max(1, ...res.allies.map((a) => a.dmg));
    const top = res.allies.reduce((a, b) => (b.dmg > a.dmg ? b : a), res.allies[0]);
    /* ★ いちばんダメージを出した子を大きく（MVP） */
    const hero = top && top.dmg > 0 ? '<div class="mvphero"><img src="' + esc(top.img) + '" alt=""><div class="mh"><i>MVP</i><b>' + esc(top.nm) + "</b><span>" + BT().fmtN(top.dmg) + " DMG</span></div></div>" : "";
    return hero + '<div class="mvp">' + res.allies.map((a) => '<div class="r"><img src="' + esc(a.img) + '" alt=""><span class="n">' + esc(a.nm) + (a.up ? '<br><span class="up">LEVEL UP!</span>' : "") + '</span><span class="g"><i style="width:' + (a.dmg / mx * 100).toFixed(0) + '%"></i></span><span class="v">' + BT().fmtN(a.dmg) + "</span></div>").join("") + "</div>";
  }
  function giveXp(res, xp) {
    res.allies.forEach((a) => { const b = ownLv(a.id); DB.xp[a.id] = (DB.xp[a.id] || 0) + xp; a.up = ownLv(a.id) > b; });
  }
  function rewardHTML(list) {
    return list.length ? '<div class="rrw">' + list.map((r) => "<span>" + r + "</span>").join("") + "</div>" : "";
  }
  const GEM_IC = '<img src="../gem.png" alt="">', XEVA_IC = '<img src="../XEVA.png" alt="">';
  function endBack() { BT().stop(); renderAll(); if (pendingReload) reloadFromSync(); }

  /* ══════════════ デイリー（難易度1〜7・1日3回ずつ） ══════════════ */
  const DIFF = [
    { nm: "れんしゅう", lv: 5,  n: 3, hp: 2.2, atk: 0.22, xeva: 30,  c: "#3a8f5c" },
    { nm: "ふつう",     lv: 15, n: 3, hp: 2.8, atk: 0.26, xeva: 60,  c: "#3a78b8" },
    { nm: "つよい",     lv: 28, n: 4, hp: 3.4, atk: 0.30, xeva: 100, c: "#7a55c8" },
    { nm: "激つよ",     lv: 40, n: 4, hp: 4.2, atk: 0.36, xeva: 150, c: "#b8508a", boss: 1 },
    { nm: "伝説",       lv: 55, n: 5, hp: 5.2, atk: 0.43, xeva: 200, c: "#c86a2a", boss: 1 },
    { nm: "神話",       lv: 68, n: 5, hp: 6.6, atk: 0.52, xeva: 230, c: "#c83a3a", boss: 1 },
    { nm: "超越",       lv: 80, n: 5, hp: 8.4, atk: 0.64, xeva: 250, c: "#e8203d", boss: 1 },
  ];
  const PLAYS = 3;
  function playsLeft(d) { return Math.max(0, PLAYS - (DB.plays[d] | 0)); }
  function hasDailyLeft() { return DIFF.some((x, i) => !DB.wins[i + 1]); }
  function viewDaily() {
    return '<div class="pnl"><div class="pnl-h"><b>デイリーバトル</b><span class="r">各難易度 1日' + PLAYS + "回</span></div>"
      + '<div class="note">その日の<b>初勝利で XEVA</b>、勝つたびに経験値と素材。敵は日替わりです。</div></div>'
      + DIFF.map((d, i) => {
        const k = i + 1, left = playsLeft(k), done = !!DB.wins[k];
        return '<div class="mcard' + (left ? "" : " done") + '" data-d="' + k + '" style="--mc:' + d.c + '"><div class="lvn">' + k + '</div><div class="mt"><b>' + d.nm + "</b><small>敵 Lv." + d.lv + "・" + d.n + "体" + (d.boss ? "・ボスあり" : "") + "・残り " + left + "/" + PLAYS + "</small></div>"
          + '<div class="rw">' + (done ? "受取済み" : "初勝利") + "<b>" + (done ? "—" : "+" + d.xeva + " XEVA") + "</b></div></div>";
      }).join("");
  }
  wire.daily = function () {
    $$(".mcard[data-d]").forEach((el) => el.onclick = () => {
      const k = +el.dataset.d, d = DIFF[k - 1];
      if (!canGo()) return;
      if (!playsLeft(k)) { toast("今日の " + d.nm + " は3回遊びました。明日また挑戦できます"); return; }
      const ids = pickEnemies(todayKey() + "-d" + k, d.n);
      const enemies = ids.map((id, i) => ({ id, lv: d.lv, awk: Math.min(4, k - 3), hpMul: d.hp * (d.boss && i === 0 ? 2.4 : 1), atkMul: d.atk * (d.boss && i === 0 ? 1.3 : 1), boss: !!(d.boss && i === 0) }));
      const run = () => launch({
        mode: "daily", title: "デイリー " + k + "「" + d.nm + "」", time: 180, enemies, seed: M().hashN(todayKey() + k, 3),
        onRetry: run,
        onEnd: (res, show) => {
          DB.plays[k] = (DB.plays[k] | 0) + 1;
          const rw = [];
          let xp = 40 + 22 * k;
          if (res.win) {
            DB.totalWins = (DB.totalWins | 0) + 1;
            if (!DB.wins[k]) { DB.wins[k] = true; xevaAdd(d.xeva, "MagiBattle " + d.nm + " 初勝利"); rw.push(XEVA_IC + " +" + d.xeva + " XEVA"); try { XEVA.completeMission && XEVA.completeMission("magibattle_win"); } catch (e) {} }
            const cr = 1 + Math.floor(k / 2), stn = k >= 3 ? 1 + Math.floor(k / 3) : 0;
            DB.mats.crystal += cr; DB.mats.stone += stn;
            rw.push(MAT_SVG.crystal + " ×" + cr); if (stn) rw.push(MAT_SVG.stone + " ×" + stn);
            if (k >= 5 && Math.random() < 0.35) { const g = newGear(k - 1); rw.push(gearIcon(g.p, g.t) + " " + gearName(g)); }
          } else xp = Math.round(xp * 0.4);
          giveXp(res, xp); save();
          show('<div class="rtitle ' + (res.win ? "win" : "lose") + '">' + (res.win ? "VICTORY" : "DEFEAT") + "</div>"
            + '<div class="rsub">' + (res.win ? d.nm + " をクリア！" : res.timeUp ? "時間切れ… 編成・属性・装備を見直そう" : "全滅… バーストⅠ→Ⅱ→Ⅲ をつなげよう") + "</div>"
            + rewardHTML(rw) + '<div class="rsub">経験値 +' + xp + "</div>" + mvpHTML(res),
            [{ label: "もう一度", fn: () => { BT().stop(); el.click(); } }, { label: "ホームへ", cls: "red", fn: endBack }]);
        },
      });
      run();
    });
  };

  /* ══════════════ 素材クエスト（1日3回） ══════════════ */
  const QUESTS = [
    { k: "q1", nm: "結晶の洞窟", sub: "経験の結晶がたくさん", lv: 18, hp: 3.0, atk: 0.28, cr: [6, 9], st: [1, 2], gear: 0, c: "#2f8fd8" },
    { k: "q2", nm: "鋼の採掘場", sub: "強化石がたくさん", lv: 40, hp: 4.2, atk: 0.36, cr: [2, 4], st: [6, 10], gear: 0, c: "#8a94ad" },
    { k: "q3", nm: "工廠の残骸", sub: "装備（T3〜T6）が出る", lv: 60, hp: 5.6, atk: 0.46, cr: [2, 3], st: [3, 5], gear: [3, 6], c: "#c8a02a" },
  ];
  const QPLAYS = 3;
  function viewQuest() {
    const left = Math.max(0, QPLAYS - (DB.qplays | 0));
    return '<div class="pnl"><div class="pnl-h"><b>素材クエスト</b><span class="r">残り <em>' + left + "</em>/" + QPLAYS + "</span></div>"
      + '<div class="note">経験の結晶（レベル上げ）・強化石（装備の強化）・装備が手に入ります。3つ合わせて1日' + QPLAYS + "回。</div></div>"
      + matBarHTML()
      + QUESTS.map((q) => '<div class="mcard' + (left ? "" : " done") + '" data-q="' + q.k + '" style="--mc:' + q.c + '"><div class="lvn" style="font-size:15px">Lv' + q.lv + '</div><div class="mt"><b>' + q.nm + "</b><small>" + q.sub + "</small></div>"
        + '<div class="rw">結晶 ' + q.cr.join("〜") + "<br>強化石 " + q.st.join("〜") + (q.gear ? "<br>装備 T" + q.gear.join("〜") : "") + "</div></div>").join("")
      + '<div class="pnl"><div class="pnl-h"><b>装備の交換</b></div><div class="note">強化石で装備を1つ作ります（部位・オーバーロードはランダム）。</div>'
      + '<div class="brow">' + [[3, 15], [5, 40], [7, 90]].map((x) => '<button class="btn" data-ex="' + x[0] + '" data-c="' + x[1] + '">T' + x[0] + "（" + x[1] + "個）</button>").join("") + "</div></div>";
  }
  wire.quest = function () {
    $$(".mcard[data-q]").forEach((el) => el.onclick = () => {
      const q = QUESTS.find((x) => x.k === el.dataset.q);
      if (!canGo()) return;
      if ((DB.qplays | 0) >= QPLAYS) { toast("今日の素材クエストは終わりました"); return; }
      const ids = pickEnemies(todayKey() + q.k, 3);
      const run = () => launch({
        mode: "quest", title: q.nm, time: 180, enemies: ids.map((id) => ({ id, lv: q.lv, awk: 1, hpMul: q.hp, atkMul: q.atk })), onRetry: run,
        onEnd: (res, show) => {
          DB.qplays = (DB.qplays | 0) + 1;
          const rw = []; const R = (a) => a[0] + Math.floor(Math.random() * (a[1] - a[0] + 1));
          if (res.win) {
            const cr = R(q.cr), st = R(q.st); DB.mats.crystal += cr; DB.mats.stone += st;
            rw.push(MAT_SVG.crystal + " ×" + cr, MAT_SVG.stone + " ×" + st);
            if (q.gear) { const g = newGear(R(q.gear)); rw.push(gearIcon(g.p, g.t) + " " + gearName(g)); }
          }
          giveXp(res, res.win ? 90 : 30); save();
          show('<div class="rtitle ' + (res.win ? "win" : "lose") + '">' + (res.win ? "CLEAR" : "FAILED") + '</div><div class="rsub">' + q.nm + "</div>" + rewardHTML(rw) + mvpHTML(res),
            [{ label: "ホームへ", cls: "red", fn: endBack }]);
        },
      });
      run();
    });
    $$("[data-ex]").forEach((b) => b.onclick = () => {
      const t = +b.dataset.ex, c = +b.dataset.c;
      if (DB.mats.stone < c) { toast("強化石が足りません（" + c + "個）"); return; }
      DB.mats.stone -= c; const g = newGear(t); save(); renderAll(); toast(gearName(g) + " を作りました");
    });
  };

  /* ══════════════ 迎撃戦（ボスに与えたダメージで報酬） ══════════════ */
  const ICP_TIERS = [
    /* ★ 実測：Lv.20 SSR ≈ 270万／Lv.40 SSR ≈ 1,070万／Lv.60・2凸 ≈ 4,460万／Lv.80 完凸 ≈ 6,270万（装備なし） */
    { dmg: 2e6, t: 3 }, { dmg: 6e6, t: 4 }, { dmg: 1.5e7, t: 5 }, { dmg: 3e7, t: 6 }, { dmg: 5e7, t: 7 }, { dmg: 7.5e7, t: 8 }, { dmg: 1.1e8, t: 9 },
  ];
  function icpBoss() {
    const d = new Date(); const k = (d.getFullYear() * 400 + d.getMonth() * 31 + d.getDate()) % 2;
    const els = ["dark", "fire", "light", "water", "wood"];
    const key = k ? "razorwing" : "skyreaper";
    return { key, el: els[(d.getDate() + k) % 5] };
  }
  function viewIcp() {
    const b = icpBoss(), m = BT().MONSTERS[b.key], left = Math.max(0, 3 - (DB.icp.n | 0)), best = DB.icp.best[todayKey()] || 0;
    return '<div class="pnl"><div class="bossart" style="--bc:' + M().ELEM[b.el].c + '"><img src="' + m.img + '" alt=""><div class="bi"><small class="orb" style="color:#ff6b7f;font-weight:900;letter-spacing:.2em">INTERCEPTION</small><b>' + m.nm + "</b>"
      + BT().elIcon(b.el) + ' <span class="note">' + M().ELEM[b.el].nm + "属性</span></div></div>"
      + '<div class="note">120秒でボスに与えたダメージで<b>装備（T3〜T9）</b>がもらえます。ボスは<b>チャージ攻撃</b>をためてくるので、赤いコアを削って<b>BREAK</b>させよう。1日3回。</div>'
      + '<div class="statrow"><div><small>今日のベスト</small><b>' + BT().fmtN(best) + "</b></div><div><small>残り</small><b>" + left + "/3</b></div></div>"
      + '<button class="btn red wide" id="icpGo" ' + (left ? "" : "disabled") + ">⚔ 迎撃開始</button></div>"
      + '<div class="pnl"><div class="pnl-h"><b>報酬（1回ごと）</b></div>' + ICP_TIERS.map((x) => '<div class="rank"><span class="rk">T' + x.t + '</span><span class="n">' + BT().fmtN(x.dmg) + ' ダメージ以上</span><span class="s">' + gearIcon("head", x.t).replace("<svg", '<svg style="width:22px;height:22px"') + "</span></div>").join("") + "</div>";
  }
  wire.icp = function () {
    const go = $("#icpGo"); if (!go) return;
    go.onclick = () => {
      if (!canGo()) return;
      if ((DB.icp.n | 0) >= 3) return;
      const b = icpBoss();
      const run = () => launch({
        mode: "icp", title: "迎撃戦 " + BT().MONSTERS[b.key].nm, time: 120, onRetry: run,
        enemies: [{ monster: b.key, el: b.el, lv: 80, hpMul: 400, atkMul: 0.55, boss: true, chargeItv: 15 }],
        onEnd: (res, show) => {
          DB.icp.n = (DB.icp.n | 0) + 1;
          const d = res.bossDmg, tk = todayKey();
          DB.icp.best[tk] = Math.max(DB.icp.best[tk] || 0, d);
          Object.keys(DB.icp.best).forEach((k) => { if (k !== tk) delete DB.icp.best[k]; });
          const tier = ICP_TIERS.filter((x) => d >= x.dmg).pop();
          const rw = [];
          if (tier) { const g = newGear(tier.t); rw.push(gearIcon(g.p, g.t) + " " + gearName(g)); const gem = Math.min(10, tier.t - 2); gemAdd(gem, "MagiBattle 迎撃戦"); rw.push(GEM_IC + " +" + gem); }
          giveXp(res, 80); save();
          show('<div class="rtitle win">' + BT().fmtN(d) + '</div><div class="rsub">ボスに与えたダメージ</div>' + rewardHTML(rw) + mvpHTML(res),
            [{ label: "ホームへ", cls: "red", fn: endBack }]);
        },
      });
      run();
    };
  };

  /* ══════════════ 無限の塔 ══════════════ */
  function towerCfg(f) {
    const boss = f % 5 === 0;
    const ids = pickEnemies("tower-F" + f, boss ? 2 : 3);
    const lv = Math.min(80, 6 + f * 3), hp = 1.9 + f * 0.40, atk = 0.20 + f * 0.016;
    const en = ids.map((id) => ({ id, lv, awk: Math.min(4, Math.floor(f / 6)), hpMul: hp, atkMul: atk }));
    if (boss) en.unshift({ monster: f % 10 === 0 ? "razorwing" : "skyreaper", el: M().ELEMS[f % 5], lv, hpMul: hp * 2.6, atkMul: atk * 1.15, boss: true });
    return en;
  }
  function viewTower() {
    const best = DB.tower.best | 0, f = best + 1;
    return '<div class="pnl"><div class="pnl-h"><b>無限の塔</b><span class="r">最高 <em>F' + best + "</em></span></div>"
      + '<div class="note">階が上がるほど敵が強くなる。<b>初めてクリアした階でジェム</b>と素材。5階ごとにボス（装備がもらえる）。</div>'
      + '<div class="statrow"><div><small>次の階</small><b>F' + f + "</b></div><div><small>初回報酬</small><b>" + GEM_IC.replace("<img", '<img style="width:18px;height:18px;vertical-align:-3px"') + " " + towerGem(f) + "</b></div></div>"
      + '<button class="btn red wide" id="twGo">🗼 F' + f + " に挑戦</button></div>";
  }
  function towerGem(f) { return f % 5 === 0 ? 10 : 3; }
  wire.tower = function () {
    const go = $("#twGo"); if (!go) return;
    go.onclick = () => { if (canGo()) startTower((DB.tower.best | 0) + 1); };
  };
  function startTower(f) {
    const run = () => launch({
      mode: "tower", title: "無限の塔 F" + f, time: 180, enemies: towerCfg(f), onRetry: run,
      onEnd: (res, show) => {
        const rw = []; const first = res.win && f > (DB.tower.best | 0);
        if (res.win) {
          if (first) { DB.tower.best = f; const gm = towerGem(f); gemAdd(gm, "MagiBattle 無限の塔 F" + f); rw.push(GEM_IC + " +" + gm); }
          const cr = first ? 2 + Math.floor(f / 3) : 1, st = first ? 1 + Math.floor(f / 4) : 1;
          DB.mats.crystal += cr; DB.mats.stone += st; rw.push(MAT_SVG.crystal + " ×" + cr, MAT_SVG.stone + " ×" + st);
          if (first && f % 5 === 0) { const g = newGear(Math.min(9, 3 + Math.floor(f / 10))); rw.push(gearIcon(g.p, g.t) + " " + gearName(g)); }
        }
        giveXp(res, res.win ? 60 + f * 6 : 20); save();
        show('<div class="rtitle ' + (res.win ? "win" : "lose") + '">F' + f + (res.win ? " CLEAR" : " 敗北") + '</div><div class="rsub">' + (res.win ? (first ? "最高記録を更新！" : "クリア済みの階") : "育成・装備・バーストの並びを見直そう") + "</div>" + rewardHTML(rw) + mvpHTML(res),
          res.win ? [{ label: "次の階へ（F" + (f + 1) + "）", cls: "red", fn: () => { BT().stop(); startTower(f + 1); } }, { label: "ホームへ", fn: endBack }]
                  : [{ label: "もう一度", cls: "red", fn: () => { BT().stop(); startTower(f); } }, { label: "ホームへ", fn: endBack }]);
      },
    });
    run();
  }

  /* ══════════════ スコアアタック（200秒・月間ランキング） ══════════════ */
  function saYm() { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); }
  function viewSa() {
    const ym = saYm(), best = DB.saBest && DB.saBest.ym === ym ? DB.saBest.score : 0;
    return '<div class="pnl"><div class="pnl-h"><b>スコアアタック</b><span class="r">200秒</span></div>'
      + '<div class="note">倒れない敵に<b>200秒</b>でどれだけダメージを出せるか。毎月のランキングで <b>1位 1000・2位 500・3位 300・4〜10位 150 XEVA</b>。</div>'
      + '<div class="statrow"><div><small>今月のベスト</small><b>' + BT().fmtN(best) + "</b></div></div>"
      + '<div id="saClaim" class="note"></div>'
      + '<button class="btn red wide" id="saGo">⏱ スコアアタック開始</button></div>'
      + '<div class="pnl"><div class="pnl-h"><b>今月のランキング</b></div><div id="saRank" class="note">読みこんでいます…</div></div>';
  }
  wire.sa = function () {
    $("#saGo").onclick = () => { if (canGo()) startSa(); };
    paintRank(); trySaClaim();
  };
  function startSa() {
    const run = () => launch({
      mode: "sa", title: "スコアアタック", time: 200, onRetry: run,
      enemies: [{ monster: "skyreaper", lv: 60, hpMul: 12, atkMul: 0.32, immortal: true, boss: true }, { monster: "razorwing", lv: 60, hpMul: 12, atkMul: 0.30, immortal: true }, { monster: "skyreaper", name: "スカイリーパーⅡ", el: "light", lv: 60, hpMul: 12, atkMul: 0.30, immortal: true }],
      onEnd: async (res, show) => {
        const score = Math.round(res.score), ym = saYm();
        if (!DB.saBest || DB.saBest.ym !== ym || score > DB.saBest.score) DB.saBest = { ym, score };
        giveXp(res, 60); save();
        show('<div class="rtitle win">' + BT().fmtN(score) + '</div><div class="rsub" id="saSend">スコアを送っています…</div>' + mvpHTML(res),
          [{ label: "もう一度", fn: () => { BT().stop(); startSa(); } }, { label: "ホームへ", cls: "red", fn: endBack }]);
        let msg = "";
        try {
          if (window.MBFB && ACCT.xvUid) {
            const r = await MBFB.submitScore(ACCT.xvUid, ACCT.name || "?", ACCT.charFile || "", score);
            if (r && r.ok) { const rows = await MBFB.getRanking(); const i = rows.findIndex((x) => x.uid === ACCT.xvUid); msg = i >= 0 ? "送信しました！ いま " + (i + 1) + "位" : "送信しました！"; }
            else msg = "送信できませんでした（通信を確認してください）";
          } else msg = "ランキングに接続できませんでした";
        } catch (e) { msg = "送信できませんでした"; }
        const el = $("#saSend"); if (el) el.textContent = msg;
      },
    });
    run();
  }
  async function paintRank() {
    const box = $("#saRank"); if (!box) return;
    if (!window.MBFB) { setTimeout(paintRank, 800); return; }
    const rows = await MBFB.getRanking();
    if (!$("#saRank")) return;
    if (!rows.length) { box.innerHTML = "今月はまだ記録がありません。一番乗りを狙おう！"; return; }
    const me = ACCT.xvUid;
    box.innerHTML = rows.slice(0, 10).map((r, i) => '<div class="rank' + (i < 3 ? " top" : "") + (r.uid === me ? " me" : "") + '"><span class="rk">' + (i + 1) + "</span>"
      + (r.charFile ? '<img src="../chars/' + esc(window.XEVA && XEVA.canonCharFile ? XEVA.canonCharFile(r.charFile) : r.charFile) + '" alt="">' : "")
      + '<span class="n">' + esc(r.name) + '</span><span class="s">' + BT().fmtN(r.score) + "</span></div>").join("");
  }
  async function trySaClaim() {
    if (!window.MBFB || !ACCT.xvUid) return;
    if (!(window.XEVARIONFB && window.XEVARIONFB.awardXeva)) { setTimeout(trySaClaim, 2000); return; }
    try { const r = await MBFB.claimPrevReward(ACCT.xvUid); if (r && r.ok) { const el = $("#saClaim"); if (el) el.innerHTML = "🎁 先月の報酬 <b>+" + nf(r.amount) + " XEVA</b>（" + r.rank + "位）を受け取りました。ポータルを開くと反映されます。"; } } catch (e) {}
  }

  /* ══════════════ あそびかた ══════════════ */
  function openHelp() {
    openSheet('<h3>MagiBattle のあそびかた</h3><div class="note" style="font-size:13px;line-height:1.8">'
      + "<b>① 編成</b>：5体（前衛3・後衛2）。前衛は敵に狙われやすく、<b>防御型</b>は敵の攻撃を引きつけます。<br>"
      + "<b>② 自動で攻撃</b>：味方は武器（AR・SMG・SG・SR・RL・MG）ごとの間隔で撃ち、<b>スキル2</b>も時間がくると自動で撃ちます。<br>"
      + "<b>③ バースト</b>：攻撃で下のゲージがたまると <b>バーストⅠ → Ⅱ → Ⅲ</b> を順にタップ。3段つながると <b>FULL BURST</b>（10秒・攻撃力+50%）。<b>AUTO</b> なら自動でつなぎます。<br>"
      + "<b>④ 照準</b>：敵をタップするとその敵を集中攻撃。<br>"
      + "<b>⑤ チャージ攻撃</b>：ボスの「⚠ CHARGE」の赤いコアを5秒以内に削ると <b>BREAK</b>（3秒気絶）。削れないと全体に大ダメージ。<br>"
      + "<b>⑥ 属性</b>：火→木→水→火、光⇄闇 で有利なら ×1.3。<br>"
      + "<b>⑦ 育成</b>：経験の結晶でレベル（最大80）、装備（頭・腕・胸・足）と強化石で強化。凸は MagiBurst・XEVA ガチャと共通。<br>"
      + "<b>⑧ シナジー</b>：同じフェス（学園・宴など）のキャラを2体で攻撃+5%、3体で+10%、5体で+20%。"
      + "</div>");
  }

  /* ══════════════ はじめ ══════════════ */
  function boot() {
    if (!M() || !M().ready()) { setTimeout(boot, 200); return; }
    load(); save();
    $("#backB").onclick = () => { save(); try { if (window.XevaBack && XevaBack.leave) { XevaBack.leave("../index.html"); return; } } catch (e) {} location.href = "../index.html"; };
    $("#gemPill").onclick = () => { save(); try { if (window.XevaBack && XevaBack.leave) { XevaBack.leave("../index.html#shop"); return; } } catch (e) {} location.href = "../index.html#shop"; };
    renderAll();
    if (DB._migNote) { toast(DB._migNote); delete DB._migNote; save(); }
  }
  window.MBT_APP = { get DB() { return DB; }, lvOf, awkOf, owned, statsOf, renderAll };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
