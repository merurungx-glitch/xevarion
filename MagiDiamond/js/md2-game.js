/* ══════════════════════════════════════════════════════════════
   MagiDiamond 最新版 — 本体
   ------------------------------------------------------------
   ★★ 2026-08-30 大幅リニューアル（ご指定）
     「キャラクター収集・育成」×「野球盤」×「本格野球」×「オンライン」。
     ★ このアプリに<b>キャラクターのガチャは無い</b>。
       選手は XEVARION（MagiBurst）で手に入れたキャラクターをそのまま使う。
     ★ セーブは <b>magidiamond2_v1</b>（過去版の magidiamond_setup_v1 とは別）。
       ご指定どおり、片方で遊んでももう片方の続きは消えない。

   ── 画面の並び ──
     home / match（対戦えらび）/ character（所持キャラ）/ team（編成）/ shop / mission / rank
     試合中だけ #mtWrap を全画面でかぶせる。

   ── 試合の流れ（仕様書の順番どおり）──
     投球（球種・コース）→ 打者の読み合い（コース・打ちかた）→ 同時公開 →
     打撃（タイミング）→ 打球発生 → <b>野球盤</b>（キャンバスで球が転がる）→
     守備（捕球タイミング）→ 送球先 → 走塁（進塁・ストップ）→ アウト／得点
   ══════════════════════════════════════════════════════════════ */
(function () {
"use strict";

/* ══════════ 小道具 ══════════ */
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const fmt = (n) => (Number(n) || 0).toLocaleString("ja-JP");
const pick = (a) => a[Math.floor(Math.random() * a.length)];
let _toastT = null;
function toast(msg) {
  const t = $("toast2"); if (!t) return;
  t.textContent = msg; t.classList.add("show");
  clearTimeout(_toastT); _toastT = setTimeout(() => t.classList.remove("show"), 2400);
}

/* ══════════ 効果音（WebAudio・音源ファイルを増やさない） ══════════ */
const SFX = (() => {
  let ac = null, on = true;
  function ctx() {
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } }
    if (ac && ac.state === "suspended") { try { ac.resume(); } catch (e) {} }
    return ac;
  }
  function tone(f0, f1, dur, type, vol, delay) {
    const a = ctx(); if (!a || !on) return;
    const t = a.currentTime + (delay || 0);
    const o = a.createOscillator(), g = a.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    g.gain.setValueAtTime(vol || .12, t);
    g.gain.exponentialRampToValueAtTime(.0008, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + .03);
  }
  function noise(dur, vol, delay) {
    const a = ctx(); if (!a || !on) return;
    const t = a.currentTime + (delay || 0);
    const n = Math.floor(a.sampleRate * dur), b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = a.createBufferSource(); s.buffer = b;
    const g = a.createGain(); g.gain.setValueAtTime(vol || .1, t);
    g.gain.exponentialRampToValueAtTime(.0008, t + dur);
    s.connect(g); g.connect(a.destination); s.start(t);
  }
  const T = {
    tap:   () => tone(700, 1100, .09, "triangle", .08),
    pitch: () => { noise(.05, .07); tone(320, 180, .1, "sine", .07); },
    hit:   () => { noise(.06, .16); tone(900, 260, .12, "square", .12); },
    hard:  () => { noise(.09, .22); tone(1200, 200, .18, "square", .16); tone(300, 90, .22, "sawtooth", .1, .02); },
    miss:  () => { noise(.05, .08); tone(260, 120, .12, "sine", .07); },
    catch2:() => { noise(.05, .12); tone(520, 300, .08, "triangle", .09); },
    out:   () => { tone(392, 262, .22, "square", .1); tone(262, 196, .26, "square", .09, .12); },
    safe:  () => { tone(523, 784, .18, "triangle", .12); tone(784, 1046, .2, "triangle", .1, .1); },
    run:   () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, f, .2, "triangle", .11, i * .1)); },
    win:   () => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, f, .26, "triangle", .12, i * .12)); },
    lose:  () => { [392, 330, 262, 196].forEach((f, i) => tone(f, f * .97, .3, "sine", .1, i * .16)); },
    clutch:() => { tone(180, 900, .5, "sawtooth", .12); noise(.3, .1, .1); },
  };
  ["pointerdown", "keydown", "touchstart"].forEach((e) => document.addEventListener(e, () => ctx(), { once: true, passive: true }));
  return new Proxy(T, { get: (t, k) => (typeof t[k] === "function" ? t[k] : () => {}) });
})();

/* ══════════ セーブ ══════════ */
const SAVE_KEY = "magidiamond2_v1";
function fresh() {
  return {
    v: 1, made: Date.now(),
    gold: 30000, tp: 500, coin: 0,          /* Gold / トレーニングポイント / スタジアムコイン */
    exp: 0, lv: 1,
    train: {},                               /* id → { lv, exp, pt:{...}, sk:{...}, lim, awk } */
    team: null,                              /* 編成（下の freshTeam） */
    rank: { pt: 0, w: 0, l: 0, season: seasonKey() },
    rec: { w: 0, l: 0, d: 0, hr: 0, hit: 0, k: 0, games: 0 },
    msn: {},                                 /* デイリーミッションの受取記録 */
    msnDay: "",
    shop: {},                                /* 買ったもの */
    stadium: "city",
    tutorial: false,
    updatedAt: 0,
  };
}
function seasonKey() { const d = new Date(); return d.getFullYear() + "-" + String(Math.floor(d.getMonth() / 3) + 1); }
let S = fresh();
function load() {
  try {
    const r = localStorage.getItem(SAVE_KEY);
    if (r) { const o = JSON.parse(r); if (o && typeof o === "object") S = Object.assign(fresh(), o); }
  } catch (e) {}
  if (!S.train) S.train = {};
  if (!S.rank) S.rank = { pt: 0, w: 0, l: 0, season: seasonKey() };
  if (S.rank.season !== seasonKey()) { S.rank = { pt: Math.floor(S.rank.pt * 0.4), w: 0, l: 0, season: seasonKey() }; }
  if (!S.rec) S.rec = { w: 0, l: 0, d: 0, hr: 0, hit: 0, k: 0, games: 0 };
}
function save() { S.updatedAt = Date.now(); try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }

/* ══════════ 所持キャラ ══════════
   MagiBurst のセーブ（magiburst_v1）と XEVAガチャ（xeva_gacha_v1）の両方を見る。
   ★ ここを片方だけにすると「引いたのに使えない」が起きる（MagiBurst で踏んだ穴と同じ）。 */
function ownedSet() {
  const set = new Set();
  try {
    const db = JSON.parse(localStorage.getItem("magiburst_v1") || "null");
    if (db && db.chars) Object.keys(db.chars).forEach((k) => set.add(k));
  } catch (e) {}
  try {
    const g = JSON.parse(localStorage.getItem("xeva_gacha_v1") || "null");
    if (g && g.owned) Object.keys(g.owned).forEach((k) => set.add(k));
  } catch (e) {}
  return set;
}
function awkOf(id) {
  try {
    const db = JSON.parse(localStorage.getItem("magiburst_v1") || "null");
    if (db && db.chars && db.chars[id]) return db.chars[id].awk | 0;
  } catch (e) {}
  return 0;
}

/* ══════════ 育成 ══════════
   ★ キャラ本体（MagiBurst の所持・限界突破）と、<b>野球選手としての育成</b>は分ける（ご指定）。
     こちらのセーブにしか書かないので、MagiBurst 側は一切変わらない。 */
const LV_MAX_BASE = 60;
function tr(id) {
  if (!S.train[id]) S.train[id] = { lv: 1, exp: 0, pt: {}, sk: {}, lim: 0, awk: 0 };
  const t = S.train[id];
  if (!t.pt) t.pt = {}; if (!t.sk) t.sk = {};
  return t;
}
function lvMax(id) { return LV_MAX_BASE + tr(id).lim * 10; }          /* 限界突破で +10 ずつ（最大5回） */
function needExp(lv) { return 300 + lv * lv * 12; }
const STAT_KEYS = ["meet", "power", "run", "field", "arm", "catch", "velo", "heavy", "ctrl", "stam", "brk", "mind"];
const STAT_NM = { meet: "ミート", power: "パワー", run: "走力", field: "守備", arm: "肩力", catch: "捕球",
  velo: "球速", heavy: "球威", ctrl: "制球", stam: "スタミナ", brk: "変化量", mind: "精神力" };
/* 実際に試合で使う能力（素の値 ＋ レベル ＋ 能力強化 ＋ 覚醒） */
function eff(id) {
  const base = MD2DATA.get(id); if (!base) return null;
  const t = tr(id);
  const lvUp = Math.floor((t.lv - 1) * 0.28);      /* レベル1つで平均 +0.28 */
  const awkUp = (t.awk | 0) * 3;                   /* 覚醒1段で +3 */
  const o = Object.assign({}, base);
  STAT_KEYS.forEach((k) => { o[k] = clamp(Math.round(base[k] + lvUp + awkUp + (t.pt[k] | 0)), 20, 120); });
  o.lv = t.lv; o.lim = t.lim; o.awk = t.awk;
  o.traj = clamp(base.traj + (t.sk.archist ? 1 : 0), 1, 4);
  o.ovrNow = Math.round(((o.meet + o.power + o.run + o.field + o.arm + o.catch) / 6 * (base.role === "投手" ? .25 : .75)
                        + (o.velo + o.heavy + o.ctrl + o.stam + o.brk + o.mind) / 6 * (base.role === "投手" ? .75 : .25)) * 100);
  return o;
}
/* スキルの効き目をまとめて引く */
function sk(p, key) {
  let v = 0;
  (p.skills || []).forEach((k) => {
    const d = MD2DATA.SKILLS[k]; if (!d) return;
    const g = d.bat || d.run || d.def || d.pit || {};
    if (g[key] != null) v += g[key];
  });
  return v;
}

/* ══════════ 編成 ══════════ */
const POS9 = ["投手", "捕手", "一塁手", "二塁手", "三塁手", "遊撃手", "左翼手", "中堅手", "右翼手"];
function freshTeam() { return { order: [], pos: {}, bench: [], sp: [], name: "" }; }
function team() { if (!S.team) S.team = freshTeam(); return S.team; }
function teamPlayers() { return team().order.map((id) => eff(id)).filter(Boolean); }
function teamOk() { const t = team(); return t.order.length === 9 && t.sp.length >= 1; }
/* 発動しているチームスキル */
function activeTeamSkills() {
  const ps = teamPlayers(); if (ps.length < 9) return [];
  return MD2DATA.TEAM_SKILLS.filter((s) => { try { return s.test(ps); } catch (e) { return false; } });
}
function teamEff() {
  const o = { hard: 0, run: 0, reach: 0, meet: 0, ctrl: 0, clutch: 0, stam: 0, field: 0 };
  activeTeamSkills().forEach((s) => { Object.keys(s.eff || {}).forEach((k) => { o[k] = (o[k] || 0) + s.eff[k]; }); });
  return o;
}
/* おまかせ編成：適性と総合力から自動でならべる */
function autoTeam() {
  const own = ownedSet();
  const list = MD2DATA.all().filter((p) => own.has(p.id)).map((p) => eff(p.id));
  if (list.length < 10) return false;
  const t = freshTeam();
  const used = new Set();
  /* まず投手（投手適性の高い順に3人＝先発・中継ぎ・抑え） */
  const pit = list.slice().sort((a, b) => posScore(b, "投手") - posScore(a, "投手"));
  for (let i = 0; i < 3 && i < pit.length; i++) { t.sp.push(pit[i].id); used.add(pit[i].id); }
  /* 守備位置を1つずつ埋める（適性のいちばん高い人から） */
  POS9.forEach((ps) => {
    if (ps === "投手") { const p = eff(t.sp[0]); if (p) { t.order.push(p.id); t.pos[p.id] = "投手"; used.add(p.id); } return; }
    let best = null, bs = -1;
    list.forEach((p) => { if (used.has(p.id)) return; const s = posScore(p, ps); if (s > bs) { bs = s; best = p; } });
    if (best) { t.order.push(best.id); t.pos[best.id] = ps; used.add(best.id); }
  });
  /* 打順は「走力の高い人を上位、パワーのある人を3〜5番」に並べ替える */
  const nine = t.order.map((id) => eff(id));
  const pitcher = nine.find((p) => t.pos[p.id] === "投手");
  const rest = nine.filter((p) => p !== pitcher);
  rest.sort((a, b) => (b.run + b.meet) - (a.run + a.meet));
  const lead = rest.slice(0, 2);
  const powerSort = rest.slice(2).sort((a, b) => (b.power + b.meet) - (a.power + a.meet));
  const ordered = lead.concat(powerSort.slice(0, 3)).concat(powerSort.slice(3)).concat(pitcher ? [pitcher] : []);
  t.order = ordered.map((p) => p.id);
  /* ベンチ（控え5人） */
  list.filter((p) => !used.has(p.id)).sort((a, b) => b.ovrNow - a.ovrNow).slice(0, 5).forEach((p) => t.bench.push(p.id));
  S.team = t; save();
  return true;
}
function posScore(p, ps) {
  const g = p.pos[ps] || "G";
  const gv = { S: 100, A: 86, B: 74, C: 62, D: 50, E: 40, F: 30, G: 20 }[g] || 20;
  return gv * 1.6 + p.ovrNow / 8;
}

/* ══════════ 画面のきりかえ ══════════ */
let view = "home";
function go(v) {
  view = v;
  ["home", "match", "character", "team", "shop", "mission", "rank"].forEach((k) => {
    const el = $("sc-" + k); if (el) el.classList.toggle("hide", k !== v);
  });
  document.querySelectorAll(".nav button").forEach((b) => b.classList.toggle("on", b.dataset.v === v));
  const s = $("sc-" + v); if (s) s.scrollTop = 0;
  paint();
}
window.mdGo = (v) => { SFX.tap(); go(v); };

/* ══════════ 描き直し ══════════ */
function paint() {
  paintWallet();
  if (view === "home") paintHome();
  if (view === "match") paintMatch();
  if (view === "character") paintChars();
  if (view === "team") paintTeam();
  if (view === "shop") paintShop();
  if (view === "mission") paintMission();
  if (view === "rank") paintRank();
}
function paintWallet() {
  const g = $("walGold"), t = $("walTp"), d = $("walCoin");
  if (g) g.textContent = fmt(S.gold);
  if (t) t.textContent = fmt(S.tp);
  if (d) d.textContent = fmt(S.coin);
  const nm = $("meName"), av = $("meAv"), lv = $("meLv");
  try {
    const a = JSON.parse(localStorage.getItem("xeva_account_v1") || "null");
    if (nm) nm.textContent = (a && a.name) || "プレイヤー";
    if (av && a && a.icon) av.src = a.icon;
  } catch (e) {}
  if (lv) lv.textContent = "Lv." + S.lv;
}

/* ══════════ ホーム ══════════ */
function paintHome() {
  const ts = activeTeamSkills();
  const ready = teamOk();
  $("homeBody").innerHTML = `
    <div class="hero2">
      <img src="img/logo.webp" alt="MagiDiamond" onerror="this.src='../thumbs/MagiDiamond.jpg'">
      <div class="cc">集めたキャラクターで、野球を極めろ。</div>
    </div>
    <button class="playball" onclick="mdQuickPlay()">PLAY BALL<small>${ready ? "CPU戦をすぐ始める" : "まずはチームを作ろう"}</small></button>
    <div class="grid2">
      <button class="mbtn rk" onclick="mdGo('match');mdSetMode('ranked')"><span class="i">👑</span><span class="t">RANKED</span><span class="s">ランク戦</span></button>
      <button class="mbtn qk" onclick="mdGo('match');mdSetMode('quick')"><span class="i">⚡</span><span class="t">QUICK</span><span class="s">クイックマッチ</span></button>
      <button class="mbtn fr" onclick="mdGo('match');mdSetMode('friend')"><span class="i">🤝</span><span class="t">FRIEND</span><span class="s">フレンドマッチ</span></button>
      <button class="mbtn ev" onclick="mdGo('match');mdSetMode('event')"><span class="i">🎪</span><span class="t">EVENT</span><span class="s">イベント</span></button>
    </div>
    <div class="grid2" style="margin-top:10px">
      <button class="mbtn" onclick="mdGo('character')"><span class="i">👥</span><span class="t">CHARACTER</span><span class="s">キャラクター</span></button>
      <button class="mbtn" onclick="mdGo('team')"><span class="i">🛡</span><span class="t">TEAM</span><span class="s">チーム編成</span></button>
    </div>
    <div class="box" style="margin-top:12px">
      <h3>🛡 いまのチーム<span class="sp">${ready ? "出場できます" : "9人＋投手が必要です"}</span></h3>
      ${ready ? `<div class="row" style="gap:6px;flex-wrap:wrap">${teamPlayers().slice(0, 9).map((p) =>
        `<span class="chip"><b>${esc(p.nm)}</b> ${esc(team().pos[p.id] || "")}</span>`).join("")}</div>
        <div style="margin-top:8px"><b style="font-size:12px">チーム総合力 ${fmt(teamPower())}</b></div>`
        : `<p>まだチームができていません。<b>おまかせ編成</b>を押すと、持っているキャラクターから自動で組みます。</p>
           <div class="row" style="margin-top:9px"><button class="btn gold" onclick="mdAutoTeam()">⚡ おまかせ編成</button>
           <button class="btn" onclick="mdGo('team')">編成画面へ</button></div>`}
      ${ts.length ? `<div style="margin-top:9px">${ts.map((s) =>
        `<span class="chip" style="color:${s.c};border-color:${s.c}55">✦ ${s.nm}</span>`).join(" ")}</div>` : ""}
    </div>
    <div class="box">
      <h3>👑 ランク<span class="sp">${S.rank.season} シーズン</span></h3>
      ${rankBar()}
    </div>
    <div class="box">
      <h3>📘 このゲームについて</h3>
      <p><b>キャラクターのガチャはここにはありません。</b>
      選手は XEVARION のガチャで手に入れたキャラクターをそのまま使います
      （SR・SSR の全キャラクターが選手になります）。<br>
      このアプリでやることは <b>育てる → 組む → 戦う</b> の3つです。</p>
      <div class="row" style="margin-top:9px">
        <button class="btn" onclick="location.href='../gacha.html'">🎰 XEVARION のガチャへ</button>
        <button class="btn" onclick="location.href='index.html'">↩ 版をえらび直す</button>
      </div>
    </div>`;
}
function teamPower() { return teamPlayers().reduce((a, p) => a + p.ovrNow, 0); }
function rankBar() {
  const r = MD2DATA.rankOf(S.rank.pt);
  const idx = MD2DATA.RANKS.indexOf(r);
  const next = MD2DATA.RANKS[idx + 1];
  const from = r.from, to = next ? next.from : r.from + 1000;
  const pct = clamp((S.rank.pt - from) / (to - from) * 100, 0, 100);
  return `<div style="display:flex;align-items:center;gap:10px">
      <div style="font-family:ui-monospace,monospace;font-size:20px;font-weight:900;color:${r.c}">${r.k}</div>
      <div style="flex:1">
        <div class="st1"><span class="b"><i style="width:${pct}%;background:${r.c}"></i></span>
          <span class="v" style="width:56px">${fmt(S.rank.pt)}</span></div>
        <div style="font-size:10px;font-weight:800;color:var(--tx3);margin-top:3px">
          ${next ? `次の ${next.k} まであと ${fmt(next.from - S.rank.pt)} pt` : "最高ランクです"}
          ／ ${S.rank.w}勝 ${S.rank.l}敗</div>
      </div>
    </div>`;
}

/* ══════════ 対戦えらび ══════════ */
let matchMode = "cpu";
window.mdSetMode = (m) => { matchMode = m; paintMatch(); };
function paintMatch() {
  const ready = teamOk();
  $("matchBody").innerHTML = `
    <div class="seg">
      ${[["cpu", "CPU戦"], ["quick", "クイック"], ["ranked", "ランク戦"], ["friend", "フレンド"], ["event", "イベント"]]
        .map(([k, n]) => `<button class="${matchMode === k ? "on" : ""}" onclick="mdSetMode('${k}')">${n}</button>`).join("")}
    </div>
    ${!ready ? `<div class="box"><h3>⚠ チームが未完成です</h3>
      <p>9人の守備位置と、先発投手が1人以上必要です。</p>
      <div class="row" style="margin-top:9px"><button class="btn gold" onclick="mdAutoTeam()">⚡ おまかせ編成</button>
      <button class="btn" onclick="mdGo('team')">編成画面へ</button></div></div>` : ""}
    <div class="box">
      <h3>⚙ 試合の設定</h3>
      <div style="font-size:11px;font-weight:800;color:var(--tx2);margin-bottom:6px">イニング数</div>
      <div class="cardsel p3">
        ${[[3, "QUICK", "3回制・約5分"], [5, "BATTLE", "5回制・約8分"], [9, "STANDARD", "9回制・本格"]]
          .map(([n, t, s]) => `<button class="psel ${cfg.inn === n ? "on" : ""}" onclick="mdCfg('inn',${n})">${t}<small>${s}</small></button>`).join("")}
      </div>
      <div style="font-size:11px;font-weight:800;color:var(--tx2);margin:11px 0 6px">球場</div>
      <div class="cardsel p3">
        ${MD2DATA.STADIUMS.map((s) => `<button class="psel ${cfg.stadium === s.k ? "on" : ""}" onclick="mdCfg('stadium','${s.k}')">${s.nm.split(" ")[0]}<small>${s.sub}</small></button>`).join("")}
      </div>
      <p style="margin-top:8px;font-size:10.5px">${esc((MD2DATA.STADIUMS.find((s) => s.k === cfg.stadium) || {}).note || "")}</p>
    </div>
    ${matchMode === "friend" || matchMode === "quick" || matchMode === "ranked" ? onlineBox() : ""}
    <div class="box">
      <h3>${matchMode === "cpu" ? "🤖 CPU戦" : matchMode === "event" ? "🎪 イベント" : "🌐 オンライン"}</h3>
      ${matchMode === "cpu" ? `
        <div style="font-size:11px;font-weight:800;color:var(--tx2);margin-bottom:6px">相手の強さ</div>
        <div class="cardsel p3">
          ${[[1, "やさしい", "はじめて向け"], [2, "ふつう", "腕だめし"], [3, "つよい", "本気の相手"]]
            .map(([n, t, s]) => `<button class="psel ${cfg.cpu === n ? "on" : ""}" onclick="mdCfg('cpu',${n})">${t}<small>${s}</small></button>`).join("")}
        </div>
        <div class="row" style="margin-top:11px"><button class="btn pri" style="flex:1" ${ready ? "" : "disabled"} onclick="mdStart('cpu')">▶ 試合開始</button></div>`
      : matchMode === "event" ? `
        <p>期間限定のイベントはまだ開催していません。<br>
        いまは <b>CPU戦</b>と<b>オンライン対戦</b>で腕をみがいてください。</p>`
      : `<p>${matchMode === "ranked" ? "勝つとランクポイントが増えます（負けると減ります）。"
            : matchMode === "quick" ? "レートは動きません。気軽に1試合。" : "部屋番号を作って、友達を招待できます。"}</p>
        <div class="row" style="margin-top:9px">
          <button class="btn grn" ${ready ? "" : "disabled"} onclick="mdOnlineCreate()">部屋を作る</button>
          <button class="btn" ${ready ? "" : "disabled"} onclick="mdOnlineJoinPrompt()">部屋に入る</button>
          <button class="btn" ${ready ? "" : "disabled"} onclick="mdStart('cpu')">CPUと練習</button>
        </div>`}
    </div>
    <div class="box">
      <h3>📊 これまでの成績</h3>
      <table class="tbl"><tr><th>試合</th><th>勝</th><th>敗</th><th>分</th><th>安打</th><th>本塁打</th><th>奪三振</th></tr>
      <tr><td>${S.rec.games}</td><td>${S.rec.w}</td><td>${S.rec.l}</td><td>${S.rec.d}</td><td>${S.rec.hit}</td><td>${S.rec.hr}</td><td>${S.rec.k}</td></tr></table>
    </div>`;
}
function onlineBox() {
  const st = window.MD2Online && MD2Online.status ? MD2Online.status() : null;
  if (!st || !st.room) return "";
  return `<div class="box"><h3>🌐 部屋 ${esc(st.room)}<span class="sp">${st.ready ? "相手が入りました" : "相手を待っています…"}</span></h3>
    <div class="row"><button class="btn" onclick="mdOnlineLeave()">退出する</button></div></div>`;
}
const cfg = { inn: 3, stadium: "city", cpu: 2 };
window.mdCfg = (k, v) => { cfg[k] = v; if (k === "stadium") { S.stadium = v; save(); } SFX.tap(); paintMatch(); };
window.mdAutoTeam = () => { if (autoTeam()) { toast("おまかせ編成をつくりました"); paint(); } else toast("キャラクターが足りません（10体以上）"); };
window.mdQuickPlay = () => { if (!teamOk()) { if (!autoTeam()) { toast("まずは XEVARION のガチャでキャラクターを集めましょう"); return; } toast("おまかせ編成でチームを作りました"); } startMatch("cpu"); };
window.mdStart = (m) => { if (!teamOk()) { toast("チームが未完成です"); return; } startMatch(m); };

/* ══════════ キャラクター一覧 ══════════ */
let charFilter = { q: "", rank: "", role: "", own: true };
function paintChars() {
  const own = ownedSet();
  let list = MD2DATA.all();
  if (charFilter.own) list = list.filter((p) => own.has(p.id));
  if (charFilter.rank) list = list.filter((p) => p.rank === charFilter.rank);
  if (charFilter.role) list = list.filter((p) => p.role === charFilter.role);
  if (charFilter.q) { const q = charFilter.q; list = list.filter((p) => p.nm.indexOf(q) >= 0); }
  list = list.slice().sort((a, b) => (eff(b.id).ovrNow - eff(a.id).ovrNow));
  $("charBody").innerHTML = `
    <div class="seg">
      <button class="${charFilter.own ? "on" : ""}" onclick="mdCF('own',1)">所持 ${own.size}</button>
      <button class="${!charFilter.own ? "on" : ""}" onclick="mdCF('own',0)">すべて</button>
      <button class="${charFilter.rank === "SSR" ? "on" : ""}" onclick="mdCF('rank','SSR')">SSR</button>
      <button class="${charFilter.rank === "SR" ? "on" : ""}" onclick="mdCF('rank','SR')">SR</button>
      <button class="${charFilter.role === "投手" ? "on" : ""}" onclick="mdCF('role','投手')">投手</button>
      <button class="${charFilter.role === "野手" ? "on" : ""}" onclick="mdCF('role','野手')">野手</button>
      <button class="${!charFilter.rank && !charFilter.role ? "on" : ""}" onclick="mdCF('clear',1)">絞り込み解除</button>
    </div>
    <div style="font-size:11px;font-weight:800;color:var(--tx3);margin-bottom:8px">${list.length} 人</div>
    <div class="pgrid">${list.map((p) => pcard(p, own.has(p.id))).join("")}</div>
    ${!list.length ? `<div class="empt">まだ選手がいません。<br>XEVARION のガチャでキャラクターを手に入れると、ここに並びます。</div>` : ""}`;
}
window.mdCF = (k, v) => {
  if (k === "clear") { charFilter.rank = ""; charFilter.role = ""; charFilter.q = ""; }
  else if (k === "own") charFilter.own = !!v;
  else charFilter[k] = (charFilter[k] === v ? "" : v);
  SFX.tap(); paintChars();
};
function pcard(p, owned, opt) {
  const e = eff(p.id) || p;
  const best = bestPos(p);
  return `<div class="pc ${owned ? "" : "lock"} ${opt && opt.sel ? "sel" : ""}" onclick="mdOpenChar('${p.id}')">
    <span class="rk ${p.label === "LEGEND" ? "LEGEND" : p.rank}">${p.label}</span>
    <span class="po">${best}</span>
    <img src="${esc(p.th)}" alt="" loading="lazy">
    <span class="ovr">${e.ovrNow}</span>
    <span class="nm">${esc(p.nm)}</span>
    <span class="st">Lv.${tr(p.id).lv} ${esc(p.role)}</span>
  </div>`;
}
function bestPos(p) {
  let b = "投手", bg = 9;
  const ord = { S: 0, A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7 };
  MD2DATA.POS.forEach((ps) => { const g = ord[p.pos[ps]] ?? 9; if (g < bg) { bg = g; b = ps; } });
  return b.replace("手", "");
}

/* ══════════ キャラ詳細＋育成 ══════════ */
let detId = null, detTab = "stat";
window.mdOpenChar = (id) => { detId = id; detTab = "stat"; SFX.tap(); paintDet(); openSheet("sheetChar"); };
window.mdDetTab = (t) => { detTab = t; SFX.tap(); paintDet(); };
function paintDet() {
  const p = MD2DATA.get(detId); if (!p) return;
  const e = eff(detId), t = tr(detId), own = ownedSet().has(detId);
  const bar = (k) => `<div class="st1"><span class="k">${STAT_NM[k]}</span>
      <span class="b"><i style="width:${clamp(e[k], 0, 100)}%"></i></span><span class="v">${e[k]}</span></div>`;
  let body = "";
  if (detTab === "stat") {
    body = `
      <div class="box"><h3>打撃・走塁・守備</h3><div class="stats">
        ${["meet", "power", "run", "field", "arm", "catch"].map(bar).join("")}</div>
        <div class="row" style="margin-top:8px">
          <span class="chip">弾道 ${"★".repeat(e.traj)}</span>
          <span class="chip">${esc(p.bat)}</span>
          <span class="chip">${esc(p.el === "fire" ? "火" : p.el === "water" ? "水" : p.el === "wood" ? "木" : p.el === "light" ? "光" : "闇")}属性</span>
        </div></div>
      <div class="box"><h3>投球</h3><div class="stats">
        ${["velo", "heavy", "ctrl", "stam", "brk", "mind"].map(bar).join("")}</div>
        <div class="row" style="margin-top:8px">
          <span class="chip">${esc(p.pitchType)}</span>
          ${p.pitches.map((q) => { const d = MD2DATA.PITCH_ALL.find((x) => x.k === q.k); return `<span class="chip" style="color:${d.c}">${d.nm} ${"★".repeat(q.lv)}</span>`; }).join("")}
        </div></div>
      <div class="box"><h3>ポジション適性</h3><div class="posgrid">
        ${MD2DATA.POS.map((ps) => `<div class="p1"><span>${ps}</span><b class="g-${p.pos[ps]}">${p.pos[ps]}</b></div>`).join("")}</div></div>
      <div class="box"><h3>固有スキル</h3>
        ${p.skills.map((k) => { const d = MD2DATA.SKILLS[k]; return `<div class="skl"><span class="d" style="background:${d.c}"></span>
          <span><span class="n" style="color:${d.c}">${d.nm}</span><span class="x">${d.desc}</span></span></div>`; }).join("")}</div>`;
  } else if (detTab === "train") {
    const need = needExp(t.lv), maxLv = lvMax(detId);
    body = `
      <div class="box"><h3>レベルアップ<span class="sp">Lv.${t.lv} / ${maxLv}</span></h3>
        <div class="st1"><span class="k">EXP</span><span class="b"><i style="width:${clamp(t.exp / need * 100, 0, 100)}%"></i></span>
          <span class="v" style="width:60px">${t.exp}/${need}</span></div>
        <p style="margin-top:8px">Gold を使ってレベルを上げます（1レベル ${fmt(lvCost(t.lv))} Gold）。
        レベルが上がると全部の能力がすこしずつ伸びます。</p>
        <div class="row" style="margin-top:9px">
          <button class="btn gold" ${t.lv >= maxLv || S.gold < lvCost(t.lv) ? "disabled" : ""} onclick="mdLvUp(1)">+1</button>
          <button class="btn gold" ${t.lv >= maxLv || S.gold < lvCost(t.lv) ? "disabled" : ""} onclick="mdLvUp(10)">+10</button>
          <button class="btn" ${t.lv >= maxLv ? "disabled" : ""} onclick="mdLvUp(999)">上げられるだけ</button>
        </div></div>
      <div class="box"><h3>能力強化<span class="sp">TP ${fmt(S.tp)}</span></h3>
        <p>トレーニングポイント（TP）で、好きな能力を1つずつ伸ばせます（1ポイント = 15 TP・1つの能力につき +20 まで）。</p>
        <div class="posgrid" style="margin-top:9px;grid-template-columns:repeat(2,1fr)">
          ${STAT_KEYS.map((k) => `<div class="p1"><span>${STAT_NM[k]} <b style="color:var(--grn)">+${t.pt[k] | 0}</b></span>
            <button class="btn" style="padding:3px 9px;font-size:11px" ${(t.pt[k] | 0) >= 20 || S.tp < 15 ? "disabled" : ""} onclick="mdPt('${k}')">+1</button></div>`).join("")}
        </div></div>
      <div class="box"><h3>限界突破<span class="sp">${t.lim} / 5</span></h3>
        <p>レベルの上限が 10 ずつ上がります。必要なのは <b>${fmt(limCost(t.lim))} Gold</b> と
        <b>MagiBurst でのそのキャラの限界突破が ${t.lim + 1} 以上</b>であること。</p>
        <div class="row" style="margin-top:9px">
          <button class="btn pri" ${t.lim >= 5 || S.gold < limCost(t.lim) || awkOf(detId) < t.lim + 1 ? "disabled" : ""} onclick="mdLimit()">限界突破する</button>
        </div>
        ${awkOf(detId) < t.lim + 1 ? `<p style="margin-top:7px;color:var(--tx3)">※ いまの MagiBurst 側の限界突破は <b>${awkOf(detId)}</b> です。
        もう一度ガチャで引くか、結晶交換所で同じキャラを受け取ると進みます。</p>` : ""}</div>
      <div class="box"><h3>覚醒<span class="sp">${t.awk} / 3</span></h3>
        <p>全能力が <b>+3</b> され、カードの見た目が変わります。<b>${fmt(awkCost(t.awk))} Gold</b> と
        <b>限界突破 ${t.awk + 2} 以上</b>が必要です。</p>
        <div class="row" style="margin-top:9px">
          <button class="btn grn" ${t.awk >= 3 || S.gold < awkCost(t.awk) || t.lim < t.awk + 2 ? "disabled" : ""} onclick="mdAwake()">覚醒する</button>
        </div></div>`;
  } else {
    body = `<div class="box"><h3>この選手の使いどころ</h3>
      <p>${esc(useHint(p, e))}</p></div>
      <div class="box"><h3>チームに入れる</h3>
        <p>編成画面の「おまかせ編成」でも自動で選ばれますが、ここから直接この選手のポジションを決めることもできます。</p>
        <div class="row" style="margin-top:9px">
          <button class="btn pri" onclick="mdPutInTeam('${detId}')">スタメンに入れる</button>
          <button class="btn" onclick="mdPutBench('${detId}')">ベンチに入れる</button>
          <button class="btn" onclick="mdPutSp('${detId}')">投手陣に入れる</button>
        </div></div>`;
  }
  $("detBody").innerHTML = `
    <div style="display:flex;gap:11px;align-items:center;margin-bottom:10px">
      <img src="${esc(p.th)}" style="width:72px;height:72px;border-radius:15px;object-fit:cover;border:1.5px solid var(--line)">
      <div style="flex:1;min-width:0">
        <div style="font-size:16px;font-weight:900">${esc(p.nm)}
          <span class="chip" style="margin-left:5px">${p.label}</span></div>
        <div style="font-size:10.5px;font-weight:800;color:var(--tx2);margin-top:3px">
          No.${p.no} ／ ${esc(p.type)} ／ ${esc(p.role)}向き</div>
        <div style="font-family:ui-monospace,monospace;font-size:22px;font-weight:900;color:var(--gold);margin-top:3px">
          ${e.ovrNow}<span style="font-size:10px;color:var(--tx3);margin-left:5px">総合力</span></div>
      </div>
      ${!own ? `<span class="chip" style="color:var(--tx3)">未所持</span>` : ""}
    </div>
    <div class="seg">
      <button class="${detTab === "stat" ? "on" : ""}" onclick="mdDetTab('stat')">能力</button>
      <button class="${detTab === "train" ? "on" : ""}" onclick="mdDetTab('train')">育成</button>
      <button class="${detTab === "use" ? "on" : ""}" onclick="mdDetTab('use')">使いかた</button>
    </div>
    ${body}`;
}
function useHint(p, e) {
  const s = [];
  if (p.role === "投手") s.push("投手として使うのがいちばん強い選手です。");
  else if (p.role === "野手") s.push("野手として使うのに向いた選手です。");
  else s.push("投げても打てる二刀流タイプです。");
  if (e.power >= 82) s.push("パワーが高いので3〜5番向き。強振で長打をねらえます。");
  if (e.meet >= 82) s.push("ミートが高いので、コースを読みちがえても当てにいけます。");
  if (e.run >= 82) s.push("走力が高いので1〜2番、そして盗塁の起点になります。");
  if (e.field >= 82) s.push("守備が高いので、二遊間や中堅を任せられます。");
  if (e.ctrl >= 82) s.push("制球が高く、きわどいコースを続けても四球になりにくい投手です。");
  if (e.brk >= 82) s.push("変化量が大きく、持ち球でかわす投球が得意です。");
  return s.join(" ");
}
function lvCost(lv) { return 500 + lv * 220; }
function limCost(n) { return 20000 * (n + 1); }
function awkCost(n) { return 40000 * (n + 1); }
window.mdLvUp = (n) => {
  const t = tr(detId), mx = lvMax(detId);
  let done = 0;
  for (let i = 0; i < (n === 999 ? 999 : n); i++) {
    const c = lvCost(t.lv);
    if (t.lv >= mx || S.gold < c) break;
    S.gold -= c; t.lv++; done++;
  }
  if (!done) { toast("Gold が足りないか、レベルが上限です"); return; }
  SFX.tap(); save(); toast("Lv." + t.lv + " になりました"); paintDet(); paintWallet();
};
window.mdPt = (k) => {
  const t = tr(detId);
  if ((t.pt[k] | 0) >= 20 || S.tp < 15) return;
  S.tp -= 15; t.pt[k] = (t.pt[k] | 0) + 1;
  SFX.tap(); save(); paintDet(); paintWallet();
};
window.mdLimit = () => {
  const t = tr(detId), c = limCost(t.lim);
  if (t.lim >= 5 || S.gold < c || awkOf(detId) < t.lim + 1) return;
  S.gold -= c; t.lim++;
  SFX.run(); save(); toast("限界突破！ レベル上限が " + lvMax(detId) + " になりました"); paintDet(); paintWallet();
};
window.mdAwake = () => {
  const t = tr(detId), c = awkCost(t.awk);
  if (t.awk >= 3 || S.gold < c || t.lim < t.awk + 2) return;
  S.gold -= c; t.awk++;
  SFX.win(); save(); toast("覚醒！ 全能力が上がりました"); paintDet(); paintWallet();
};
window.mdPutInTeam = (id) => {
  const t = team();
  if (t.order.indexOf(id) >= 0) { toast("すでにスタメンです"); return; }
  if (t.order.length >= 9) { toast("スタメンがいっぱいです（編成画面で入れかえてください）"); return; }
  const p = MD2DATA.get(id);
  const free = POS9.filter((ps) => !Object.values(t.pos).includes(ps));
  const best = free.slice().sort((a, b) => posScore(eff(id), b) - posScore(eff(id), a))[0] || "左翼手";
  t.order.push(id); t.pos[id] = best; save();
  toast(p.nm + " を " + best + " に入れました"); closeSheet("sheetChar"); go("team");
};
window.mdPutBench = (id) => {
  const t = team();
  if (t.bench.indexOf(id) >= 0) { toast("すでにベンチです"); return; }
  t.bench.push(id); save(); toast("ベンチに入れました"); closeSheet("sheetChar"); go("team");
};
window.mdPutSp = (id) => {
  const t = team();
  if (t.sp.indexOf(id) >= 0) { toast("すでに投手陣です"); return; }
  t.sp.push(id); save(); toast("投手陣に入れました"); closeSheet("sheetChar"); go("team");
};

/* ══════════ 編成 ══════════ */
const DIA_SPOT = {
  "投手":   [50, 60], "捕手":   [50, 86],
  "一塁手": [72, 52], "二塁手": [63, 38], "三塁手": [28, 52], "遊撃手": [37, 38],
  "左翼手": [18, 20], "中堅手": [50, 12], "右翼手": [82, 20],
};
function paintTeam() {
  const t = team();
  const ts = activeTeamSkills();
  $("teamBody").innerHTML = `
    <div class="row" style="margin-bottom:10px">
      <button class="btn gold" onclick="mdAutoTeam()">⚡ おまかせ編成</button>
      <button class="btn" onclick="mdResetTeam()">リセット</button>
      <button class="btn pri" style="margin-left:auto" onclick="mdGo('match')">試合へ ›</button>
    </div>
    <div class="dia">
      <div class="inf"></div>
      ${POS9.map((ps) => {
        const id = Object.keys(t.pos).find((k) => t.pos[k] === ps);
        const p = id ? MD2DATA.get(id) : null;
        const [x, y] = DIA_SPOT[ps];
        return `<div class="slot ${p ? "" : "empty"}" style="left:${x}%;top:${y}%" onclick="mdPickSlot('${ps}')">
          <div class="im">${p ? `<img src="${esc(p.th)}" alt="">` : ps.replace("手", "")}</div>
          <div class="lb">${ps.replace("手", "")}${p ? "" : " ＋"}</div></div>`;
      }).join("")}
    </div>
    <div class="box" style="margin-top:11px">
      <h3>⚾ 打順<span class="sp">チーム総合力 ${fmt(teamPower())}</span></h3>
      ${t.order.length ? `<table class="tbl">
        <tr><th>打順</th><th class="l">選手</th><th>守備</th><th>ミート</th><th>パワー</th><th>走力</th></tr>
        ${t.order.map((id, i) => { const p = eff(id); if (!p) return ""; return `<tr>
          <td>${i + 1}</td><td class="l">${esc(p.nm)}</td><td>${(t.pos[id] || "").replace("手", "")}</td>
          <td>${p.meet}</td><td>${p.power}</td><td>${p.run}</td></tr>`; }).join("")}
      </table>
      <div class="row" style="margin-top:8px"><button class="btn" onclick="mdSortOrder()">走力・ミート順に並べ替え</button></div>`
      : `<p>まだ誰も入っていません。上の守備位置をタップして選手をえらぶか、<b>おまかせ編成</b>を押してください。</p>`}
    </div>
    <div class="box">
      <h3>🥎 投手陣<span class="sp">先発 → 中継ぎ → 抑え</span></h3>
      ${t.sp.length ? `<div class="row" style="flex-wrap:wrap">${t.sp.map((id, i) => { const p = eff(id); if (!p) return "";
        return `<span class="chip">${i === 0 ? "先発" : i === t.sp.length - 1 ? "抑え" : "中継"} <b>${esc(p.nm)}</b> 球速${p.velo}/制球${p.ctrl}/スタミナ${p.stam}
          <button class="btn" style="padding:1px 7px;font-size:10px;margin-left:5px" onclick="mdRmSp(${i})">×</button></span>`; }).join(" ")}</div>`
      : `<p>投手がいません。キャラクター一覧から「投手陣に入れる」でえらんでください。</p>`}
      <div class="row" style="margin-top:9px"><button class="btn" onclick="mdPickSlot('投手陣')">＋ 投手を足す</button></div>
    </div>
    <div class="box">
      <h3>✦ チームスキル<span class="sp">${ts.length} / ${MD2DATA.TEAM_SKILLS.length} 発動中</span></h3>
      ${MD2DATA.TEAM_SKILLS.map((s) => {
        const on = ts.indexOf(s) >= 0;
        return `<div class="skl" style="${on ? "border-color:" + s.c + "66" : "opacity:.55"}">
          <span class="d" style="background:${s.c}"></span>
          <span><span class="n" style="color:${on ? s.c : "var(--tx2)"}">${on ? "✦ " : "🔒 "}${s.nm}</span>
          <span class="x">${s.need}<br>${s.desc}</span></span></div>`;
      }).join("")}
    </div>
    <div class="box">
      <h3>🪑 ベンチ</h3>
      ${t.bench.length ? `<div class="bench">${t.bench.map((id) => { const p = MD2DATA.get(id); if (!p) return "";
        return `<div class="pc" onclick="mdOpenChar('${id}')"><img src="${esc(p.th)}"><span class="nm">${esc(p.nm)}</span></div>`; }).join("")}</div>`
      : `<p>ベンチは空です。控えがいると、試合中に選手交代ができます。</p>`}
    </div>`;
}
window.mdResetTeam = () => { S.team = freshTeam(); save(); toast("編成をリセットしました"); paintTeam(); };
window.mdRmSp = (i) => { team().sp.splice(i, 1); save(); paintTeam(); };
window.mdSortOrder = () => {
  const t = team();
  const ps = t.order.map((id) => eff(id)).filter(Boolean);
  const pitcher = ps.find((p) => t.pos[p.id] === "投手");
  const rest = ps.filter((p) => p !== pitcher).sort((a, b) => (b.run + b.meet) - (a.run + a.meet));
  const lead = rest.slice(0, 2), pw = rest.slice(2).sort((a, b) => (b.power + b.meet) - (a.power + a.meet));
  t.order = lead.concat(pw).concat(pitcher ? [pitcher] : []).map((p) => p.id);
  save(); SFX.tap(); paintTeam();
};
let slotPos = null;
window.mdPickSlot = (ps) => {
  slotPos = ps;
  const own = ownedSet();
  const t = team();
  const list = MD2DATA.all().filter((p) => own.has(p.id)).map((p) => eff(p.id))
    .sort((a, b) => (ps === "投手陣" ? posScore(b, "投手") - posScore(a, "投手") : posScore(b, ps) - posScore(a, ps)));
  $("slotBody").innerHTML = `
    <div style="font-size:11.5px;font-weight:800;color:var(--tx2);margin-bottom:9px">
      ${ps === "投手陣" ? "投手陣に入れる選手をえらんでください" : `<b>${ps}</b> をだれにしますか？ 適性の高い順に並んでいます`}</div>
    <div class="pgrid">${list.slice(0, 60).map((p) => {
      const cur = ps !== "投手陣" && t.pos[p.id] === ps;
      const base = MD2DATA.get(p.id);
      return `<div class="pc ${cur ? "sel" : ""}" onclick="mdSetSlot('${p.id}')">
        <span class="rk ${base.label === "LEGEND" ? "LEGEND" : base.rank}">${base.label}</span>
        <span class="po g-${base.pos[ps === "投手陣" ? "投手" : ps]}">${base.pos[ps === "投手陣" ? "投手" : ps]}</span>
        <img src="${esc(base.th)}" loading="lazy"><span class="ovr">${p.ovrNow}</span>
        <span class="nm">${esc(base.nm)}</span><span class="st">Lv.${tr(p.id).lv}</span></div>`;
    }).join("")}</div>
    ${!list.length ? `<div class="empt">使える選手がいません。<br>XEVARION のガチャでキャラクターを集めてください。</div>` : ""}`;
  openSheet("sheetSlot");
};
window.mdSetSlot = (id) => {
  const t = team();
  if (slotPos === "投手陣") {
    if (t.sp.indexOf(id) < 0) t.sp.push(id);
  } else {
    /* すでに他の守備位置にいたら外す */
    Object.keys(t.pos).forEach((k) => { if (t.pos[k] === slotPos) { delete t.pos[k]; t.order = t.order.filter((x) => x !== k); } });
    if (t.order.indexOf(id) < 0) t.order.push(id);
    t.pos[id] = slotPos;
  }
  save(); SFX.tap(); closeSheet("sheetSlot"); paintTeam();
};

/* ══════════ ショップ ══════════ */
const SHOP = [
  { k: "tp100",  nm: "トレーニングパック",   ic: "🧪", cost: 8000,  gold: true,  desc: "TP を 100 もらえます", give: { tp: 100 } },
  { k: "tp500",  nm: "強化トレーニングパック", ic: "💉", cost: 36000, gold: true,  desc: "TP を 500 もらえます（まとめてお得）", give: { tp: 500 } },
  { k: "coin",   nm: "スタジアムコイン束",   ic: "🪙", cost: 12000, gold: true,  desc: "コインを 300 もらえます", give: { coin: 300 } },
  { k: "sk_bat", nm: "打撃エフェクト",       ic: "✨", cost: 200,   coin: true,  desc: "打った瞬間の光が派手になります（見た目だけ）", cos: "bat" },
  { k: "sk_pit", nm: "投球エフェクト",       ic: "🌀", cost: 200,   coin: true,  desc: "投げた球に軌跡が出ます（見た目だけ）", cos: "pit" },
  { k: "sk_hr",  nm: "ホームラン演出",       ic: "🎆", cost: 400,   coin: true,  desc: "ホームランのときの花火が豪華になります（見た目だけ）", cos: "hr" },
];
function paintShop() {
  $("shopBody").innerHTML = `
    <div class="box"><h3>🛒 ショップ</h3>
      <p>ここで買えるのは<b>育成の素材と見た目だけ</b>です。
      キャラクターそのものは XEVARION のガチャで手に入れてください（このアプリでは売りません）。</p></div>
    ${SHOP.map((it) => {
      const bought = it.cos && S.shop[it.k];
      const cur = it.gold ? S.gold : S.coin;
      return `<div class="box"><h3>${it.ic} ${it.nm}<span class="sp">${bought ? "購入ずみ" : fmt(it.cost) + (it.gold ? " Gold" : " コイン")}</span></h3>
        <p>${it.desc}</p>
        <div class="row" style="margin-top:9px">
          <button class="btn ${it.gold ? "gold" : "grn"}" ${bought || cur < it.cost ? "disabled" : ""} onclick="mdBuy('${it.k}')">
            ${bought ? "購入ずみ" : cur < it.cost ? "足りません" : "買う"}</button>
        </div></div>`;
    }).join("")}`;
}
window.mdBuy = (k) => {
  const it = SHOP.find((x) => x.k === k); if (!it) return;
  const cur = it.gold ? S.gold : S.coin;
  if (cur < it.cost) return;
  if (it.gold) S.gold -= it.cost; else S.coin -= it.cost;
  if (it.give) { if (it.give.tp) S.tp += it.give.tp; if (it.give.coin) S.coin += it.give.coin; }
  if (it.cos) S.shop[it.k] = 1;
  SFX.run(); save(); toast(it.nm + " を手に入れました"); paintShop(); paintWallet();
};

/* ══════════ ミッション ══════════ */
const MSN = [
  { k: "play1", nm: "試合を1回プレイする", need: 1, key: "games", gold: 3000, tp: 30 },
  { k: "play3", nm: "試合を3回プレイする", need: 3, key: "games", gold: 8000, tp: 80 },
  { k: "hit5",  nm: "安打を5本打つ",       need: 5, key: "hit",  gold: 4000, tp: 40 },
  { k: "hr1",   nm: "ホームランを1本打つ", need: 1, key: "hr",   gold: 6000, tp: 60 },
  { k: "k3",    nm: "三振を3つ奪う",       need: 3, key: "k",    gold: 4000, tp: 40 },
  { k: "win1",  nm: "1勝する",             need: 1, key: "w",    gold: 9000, tp: 90 },
];
function today() { return new Date().toLocaleDateString("sv-SE"); }
function msnCheck() {
  if (S.msnDay !== today()) { S.msnDay = today(); S.msn = {}; S.day = { games: 0, hit: 0, hr: 0, k: 0, w: 0 }; save(); }
  if (!S.day) { S.day = { games: 0, hit: 0, hr: 0, k: 0, w: 0 }; save(); }
}
function paintMission() {
  msnCheck();
  $("msnBody").innerHTML = `
    <div class="box"><h3>🗒 デイリーミッション<span class="sp">毎日 04:00 にリセット</span></h3>
      <p>試合をすると自動で進みます。受け取ると Gold と TP がもらえます。</p></div>
    ${MSN.map((m) => {
      const now = (S.day && S.day[m.key]) | 0;
      const done = now >= m.need, got = !!S.msn[m.k];
      return `<div class="box"><h3>${got ? "✅" : done ? "🎁" : "▫"} ${m.nm}<span class="sp">${Math.min(now, m.need)} / ${m.need}</span></h3>
        <div class="st1"><span class="b"><i style="width:${clamp(now / m.need * 100, 0, 100)}%"></i></span></div>
        <div class="row" style="margin-top:9px;align-items:center">
          <span class="chip" style="color:var(--gold)">${fmt(m.gold)} Gold</span>
          <span class="chip" style="color:var(--cy)">TP ${m.tp}</span>
          <button class="btn gold" style="margin-left:auto" ${!done || got ? "disabled" : ""} onclick="mdClaim('${m.k}')">
            ${got ? "受取ずみ" : done ? "受け取る" : "未達成"}</button>
        </div></div>`;
    }).join("")}`;
}
window.mdClaim = (k) => {
  const m = MSN.find((x) => x.k === k); if (!m || S.msn[k]) return;
  const now = (S.day && S.day[m.key]) | 0; if (now < m.need) return;
  S.msn[k] = 1; S.gold += m.gold; S.tp += m.tp;
  SFX.run(); save(); toast(m.nm + " の報酬を受け取りました"); paintMission(); paintWallet();
};

/* ══════════ ランク ══════════ */
function paintRank() {
  const r = MD2DATA.rankOf(S.rank.pt);
  $("rankBody").innerHTML = `
    <div class="box"><h3>👑 いまのランク</h3>${rankBar()}</div>
    <div class="box"><h3>🏅 ランクのしくみ</h3>
      <p>ランク戦に勝つとポイントが増え、負けると減ります（引き分けは少し増えます）。<br>
      シーズンは<b>3か月ごと</b>で、切りかわるとポイントは 40% だけ残ります。</p>
      <table class="tbl" style="margin-top:8px">
        <tr><th class="l">ランク</th><th>必要ポイント</th></tr>
        ${MD2DATA.RANKS.map((x) => `<tr><td class="l" style="color:${x.c}">${x.k}</td><td>${fmt(x.from)}</td></tr>`).join("")}
      </table></div>
    <div class="box"><h3>🎁 シーズン報酬</h3>
      <p>シーズンの終わりに、そのときのランクに応じて Gold とコインが届きます。
      いまのままなら <b>${fmt(1000 * (MD2DATA.RANKS.indexOf(r) + 1) * 5)} Gold</b> ／
      <b>${(MD2DATA.RANKS.indexOf(r) + 1) * 50} コイン</b>です。</p></div>`;
}

/* ══════════ シート ══════════ */
function openSheet(id) { const s = $(id); if (s) s.classList.add("on"); }
function closeSheet(id) { const s = $(id); if (s) s.classList.remove("on"); }
window.mdCloseSheet = (id) => { SFX.tap(); closeSheet(id); };

/* ══════════════════════════════════════════════════════════════
   ここから 試合（野球盤）
   ══════════════════════════════════════════════════════════════ */
let M = null;                 /* 試合の状態 */
let cv = null, cx = null, raf = 0;

/* 盤面の座標系（本塁が下・センターが上）。0〜1 で持ち、描くときに実サイズへ直す。 */
const HOME = { x: 0.5, y: 0.90 };
const BASES = [{ x: 0.74, y: 0.66 }, { x: 0.5, y: 0.46 }, { x: 0.26, y: 0.66 }];  /* 1塁・2塁・3塁 */
const FPOS = {
  "投手": { x: .50, y: .66 }, "捕手": { x: .50, y: .96 },
  "一塁手": { x: .70, y: .62 }, "二塁手": { x: .62, y: .52 },
  "三塁手": { x: .30, y: .62 }, "遊撃手": { x: .38, y: .52 },
  "左翼手": { x: .24, y: .26 }, "中堅手": { x: .50, y: .18 }, "右翼手": { x: .76, y: .26 },
};

function makeCpuTeam(level) {
  /* CPU のチームは「その強さに近い総合力の選手」から組む。
     ★ 相手も本物のキャラクターにすることで、対戦の手ざわりをそろえる。 */
  const all = MD2DATA.all();
  const target = level === 1 ? 4200 : level === 2 ? 5200 : 6400;
  const sorted = all.slice().sort((a, b) => Math.abs(a.ovr - target / 9 * 1.0) - Math.abs(b.ovr - target / 9 * 1.0));
  const use = sorted.slice(0, 40);
  const t = { order: [], pos: {}, sp: [], bench: [] };
  const used = new Set();
  const pit = use.slice().sort((a, b) => posScore(b, "投手") - posScore(a, "投手"));
  for (let i = 0; i < 2 && i < pit.length; i++) { t.sp.push(pit[i].id); used.add(pit[i].id); }
  POS9.forEach((ps) => {
    if (ps === "投手") { const p = MD2DATA.get(t.sp[0]); if (p) { t.order.push(p.id); t.pos[p.id] = "投手"; used.add(p.id); } return; }
    let best = null, bs = -1;
    use.forEach((p) => { if (used.has(p.id)) return; const s = posScore(p, ps); if (s > bs) { bs = s; best = p; } });
    if (best) { t.order.push(best.id); t.pos[best.id] = ps; used.add(best.id); }
  });
  return t;
}
/* 試合で使う選手の値（味方は育成ぶんを乗せ、CPU は素の値） */
function mp(id, mine) { return mine ? (eff(id) || MD2DATA.get(id)) : MD2DATA.get(id); }

function startMatch(mode, online) {
  const t = team();
  const cpu = makeCpuTeam(cfg.cpu);
  const st = MD2DATA.STADIUMS.find((s) => s.k === cfg.stadium) || MD2DATA.STADIUMS[0];
  M = {
    mode: mode, online: online || null,
    inn: 1, innMax: cfg.inn, top: true,       /* top=表（先攻＝相手）／裏＝自分 */
    out: 0, ball: 0, strike: 0,
    score: { me: 0, cpu: 0 }, line: [],
    runners: [null, null, null],              /* 1塁・2塁・3塁の走者 id */
    myTeam: t, cpuTeam: cpu, stadium: st,
    idx: { me: 0, cpu: 0 },                   /* 打順 */
    pitcher: { me: t.sp[0], cpu: cpu.sp[0] },
    stam: { me: 100, cpu: 100 },
    clutch: { me: 0, cpu: 0 },
    boost: null,                              /* 使用中の CLUTCH */
    phase: "pitch",
    log: [],
    stat: { hit: 0, hr: 0, k: 0 },
    over: false,
  };
  $("mtWrap").classList.remove("hide");
  initCanvas();
  paintMatchHead();
  nextBatter(true);
}
function myTurnOffense() { return !M.top; }   /* 裏が自分の攻撃 */
function offTeam() { return M.top ? M.cpuTeam : M.myTeam; }
function defTeam() { return M.top ? M.myTeam : M.cpuTeam; }
function offMine() { return !M.top; }
function batterId() {
  const t = offTeam(), k = M.top ? "cpu" : "me";
  return t.order[M.idx[k] % t.order.length];
}
function pitcherId() { return M.top ? M.pitcher.me : M.pitcher.cpu; }

function paintMatchHead() {
  $("mtScoreMe").textContent = M.score.me;
  $("mtScoreCpu").textContent = M.score.cpu;
  $("mtInn").textContent = M.inn + (M.top ? "回表" : "回裏");
  const g = (n, max, cls) => Array.from({ length: max }, (_, i) => `<i class="${i < n ? "on" : ""}"></i>`).join("");
  $("mtBSO").innerHTML = `<span class="g b">B${g(M.ball, 3)}</span><span class="g s">S${g(M.strike, 2)}</span><span class="g o">O${g(M.out, 2)}</span>`;
  const c = offMine() ? M.clutch.me : M.clutch.cpu;
  const cb = $("clutchBar"); if (cb) cb.style.width = clamp(c, 0, 100) + "%";
  const cbt = $("clutchBtn"); if (cbt) cbt.disabled = !(offMine() ? M.clutch.me >= 80 : false);
}

/* ══════════ キャンバス（野球盤） ══════════ */
let _resizeHooked = false;
function initCanvas() {
  cv = $("mtCv"); cx = cv.getContext("2d");
  resizeCanvas();
  /* ★ 何度 startMatch を呼ばれても、resize の受け口とループは<b>1本だけ</b>にする。
     足し続けると同じフレームで2回描かれ、盤面が二重に見える（実際そうなっていた）。 */
  if (!_resizeHooked) { window.addEventListener("resize", resizeCanvas); _resizeHooked = true; }
  if (raf) cancelAnimationFrame(raf);
  raf = requestAnimationFrame(loop);
}
function resizeCanvas() {
  if (!cv || !cx) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(1, Math.round(cv.clientWidth * dpr));
  const h = Math.max(1, Math.round(cv.clientHeight * dpr));
  if (cv.width === w && cv.height === h) { cx.setTransform(dpr, 0, 0, dpr, 0, 0); return; }
  cv.width = w; cv.height = h;
  cx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
const B = { on: false, x: 0, y: 0, vx: 0, vy: 0, z: 0, vz: 0, kind: "", trail: [] };
const FLD = [];                 /* 野手の駒 */
const FX = [];                  /* 演出 */
function loop() {
  raf = requestAnimationFrame(loop);
  if (!cv || $("mtWrap").classList.contains("hide")) return;
  step();
  draw();
}
function step() {
  if (B.on) {
    const fast = (M && M.stadium && M.stadium.fast) || 1;
    B.x += B.vx; B.y += B.vy;
    if (B.z > 0 || B.vz > 0) { B.z += B.vz; B.vz -= 0.055; if (B.z < 0) { B.z = 0; B.vz = -B.vz * 0.42; if (Math.abs(B.vz) < .12) B.vz = 0; } }
    const fr = B.z > 0.02 ? 0.998 : (0.972 * (1 / (1 + (fast - 1) * .2)));
    B.vx *= fr; B.vy *= fr;
    B.trail.push({ x: B.x, y: B.y, z: B.z });
    if (B.trail.length > 22) B.trail.shift();
    /* フェンス */
    const d = Math.hypot(B.x - HOME.x, B.y - HOME.y);
    const lim = 0.78 * (M && M.stadium ? M.stadium.depth : 1);
    if (d > lim && B.z < 0.55 * (M && M.stadium ? M.stadium.fence : 1)) {
      const nx = (B.x - HOME.x) / d, ny = (B.y - HOME.y) / d;
      const dot = B.vx * nx + B.vy * ny;
      if (dot > 0) { B.vx -= 2 * dot * nx * 0.7; B.vy -= 2 * dot * ny * 0.7; }
    }
  }
  FLD.forEach((f) => {
    if (f.tx == null) return;
    const dx = f.tx - f.x, dy = f.ty - f.y, d = Math.hypot(dx, dy);
    if (d < 0.004) { f.x = f.tx; f.y = f.ty; return; }
    const sp = f.sp || 0.010;
    f.x += dx / d * sp; f.y += dy / d * sp;
  });
  for (let i = FX.length - 1; i >= 0; i--) { FX[i].t++; if (FX[i].t > FX[i].dur) FX.splice(i, 1); }
}
function draw() {
  resizeCanvas();                       /* ★ 大きさが変わっていたら合わせ直してから描く */
  const w = cv.clientWidth, h = cv.clientHeight;
  cx.setTransform(Math.min(2, window.devicePixelRatio || 1), 0, 0, Math.min(2, window.devicePixelRatio || 1), 0, 0);
  cx.clearRect(0, 0, w + 2, h + 2);     /* ★ 端まで確実に消す（1px 残ると前のフレームが見える） */
  const st = (M && M.stadium) || MD2DATA.STADIUMS[0];
  /* 空 */
  const g = cx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, st.sky[0]); g.addColorStop(1, st.sky[1]);
  cx.fillStyle = g; cx.fillRect(0, 0, w, h);
  /* ★ 盤面は<b>正方形の枠</b>の中に描く。
     横長の画面で x と y をべつべつに伸ばすと、ダイヤモンドがゆがみ、
     半径で描く扇形とベースの位置が合わなくなる（実際そうなっていた）。 */
  const SQ = Math.min(w, h * 1.02), OX = (w - SQ) / 2, OY = h - SQ;
  const X = (u) => OX + u * SQ, Y = (v) => OY + v * SQ, U = (u) => u * SQ;
  /* 外野の芝（扇形） */
  cx.save();
  cx.beginPath();
  cx.moveTo(X(HOME.x), Y(HOME.y));
  cx.arc(X(HOME.x), Y(HOME.y), U(0.86) * st.depth, Math.PI * 1.25, Math.PI * 1.75);
  cx.closePath();
  cx.fillStyle = st.turf; cx.fill();
  /* しま模様 */
  cx.clip();
  cx.globalAlpha = .08; cx.fillStyle = "#ffffff";
  for (let i = 0; i < 14; i++) if (i % 2 === 0) cx.fillRect(0, h - (i + 1) * h / 14, w, h / 14);
  cx.globalAlpha = 1;
  cx.restore();
  /* 内野の土 */
  cx.save();
  cx.beginPath();
  cx.moveTo(X(HOME.x), Y(HOME.y));
  cx.arc(X(HOME.x), Y(HOME.y), U(0.40), Math.PI * 1.25, Math.PI * 1.75);
  cx.closePath();
  cx.fillStyle = "#9a6b3f"; cx.globalAlpha = .95; cx.fill(); cx.globalAlpha = 1;
  cx.restore();
  /* ファウルライン */
  cx.strokeStyle = "rgba(255,255,255,.75)"; cx.lineWidth = 2;
  const R = U(0.92) * st.depth;
  [-1, 1].forEach((sx) => {
    cx.beginPath(); cx.moveTo(X(HOME.x), Y(HOME.y));
    cx.lineTo(X(HOME.x) + sx * R * .707, Y(HOME.y) - R * .707); cx.stroke();
  });
  /* ベース */
  cx.fillStyle = "#ffffff";
  const bs = Math.max(7, U(0.024));
  [HOME].concat(BASES).forEach((b, i) => {
    cx.save(); cx.translate(X(b.x), Y(b.y)); cx.rotate(Math.PI / 4);
    cx.fillRect(-bs / 2, -bs / 2, bs, bs); cx.restore();
  });
  /* 走者 */
  if (M) M.runners.forEach((id, i) => {
    if (!id) return;
    const b = BASES[i];
    cx.fillStyle = "#ffd257";
    cx.beginPath(); cx.arc(X(b.x), Y(b.y) - bs, bs * .55, 0, Math.PI * 2); cx.fill();
  });
  /* 野手 */
  FLD.forEach((f) => {
    cx.fillStyle = f.c || "#eaf0ff";
    cx.beginPath(); cx.arc(X(f.x), Y(f.y), Math.max(4, U(.016)), 0, Math.PI * 2); cx.fill();
    cx.fillStyle = "rgba(0,0,0,.55)"; cx.font = "700 9px system-ui"; cx.textAlign = "center";
    cx.fillText(f.lb || "", X(f.x), Y(f.y) + 3);
  });
  /* 打球 */
  if (B.on) {
    B.trail.forEach((t, i) => {
      const a = i / B.trail.length;
      cx.globalAlpha = a * .5; cx.fillStyle = "#ffffff";
      cx.beginPath(); cx.arc(X(t.x), Y(t.y) - t.z * SQ * .34, Math.max(2, U(.009) * a), 0, Math.PI * 2); cx.fill();
    });
    cx.globalAlpha = 1;
    /* 影 */
    cx.fillStyle = "rgba(0,0,0,.35)";
    cx.beginPath(); cx.ellipse(X(B.x), Y(B.y), U(.013), U(.007), 0, 0, Math.PI * 2); cx.fill();
    cx.fillStyle = "#ffffff";
    cx.beginPath(); cx.arc(X(B.x), Y(B.y) - B.z * SQ * .34, Math.max(3, U(.016)), 0, Math.PI * 2); cx.fill();
  }
  /* 演出 */
  FX.forEach((f) => {
    const a = 1 - f.t / f.dur;
    cx.globalAlpha = a;
    if (f.type === "ring") {
      cx.strokeStyle = f.c; cx.lineWidth = 3;
      cx.beginPath(); cx.arc(X(f.x), Y(f.y), U(((f.r || 40) / 420)) * (1 - a + .2), 0, Math.PI * 2); cx.stroke();
    } else if (f.type === "spark") {
      cx.fillStyle = f.c;
      for (let i = 0; i < 10; i++) {
        const an = (Math.PI * 2 / 10) * i + f.t * .1, d = f.t * 2.2;
        cx.beginPath(); cx.arc(X(f.x) + Math.cos(an) * d, Y(f.y) + Math.sin(an) * d, 2.4, 0, Math.PI * 2); cx.fill();
      }
    }
    cx.globalAlpha = 1;
  });
}
function setFielders() {
  FLD.length = 0;
  const t = defTeam(), mine = !offMine();
  POS9.forEach((ps) => {
    if (ps === "投手" || ps === "捕手") return;
    const id = Object.keys(t.pos).find((k) => t.pos[k] === ps);
    const p = id ? mp(id, mine) : null;
    const sp = FPOS[ps];
    FLD.push({ id: id, ps: ps, x: sp.x, y: sp.y, hx: sp.x, hy: sp.y, tx: null, ty: null,
      /* ★ 実測して広げた。せまいと打球がほとんど抜けてしまい、点が入りすぎる。 */
      sp: 0.008 + (p ? p.run / 100 : .5) * 0.013, reach: 0.055 + (p ? p.field / 100 : .5) * 0.065,
      c: "#eaf0ff", lb: ps[0] });
  });
  /* 投手・捕手も置く（送球先として使う） */
  FLD.push({ id: pitcherId(), ps: "投手", x: FPOS["投手"].x, y: FPOS["投手"].y, hx: FPOS["投手"].x, hy: FPOS["投手"].y, tx: null, ty: null, sp: .009, reach: .05, c: "#8fd0ff", lb: "P" });
  const cid = Object.keys(t.pos).find((k) => t.pos[k] === "捕手");
  FLD.push({ id: cid, ps: "捕手", x: FPOS["捕手"].x, y: FPOS["捕手"].y, hx: FPOS["捕手"].x, hy: FPOS["捕手"].y, tx: null, ty: null, sp: .008, reach: .05, c: "#ffd257", lb: "C" });
}
function bigMsg(txt, ms) {
  const el = $("bigMsg"); if (!el) return;
  el.textContent = txt; el.classList.add("on");
  setTimeout(() => el.classList.remove("on"), ms || 1100);
}

/* ══════════ 打席の進行 ══════════ */
function nextBatter(first) {
  if (M.over) return;
  M.ball = 0; M.strike = 0;
  /* ★ 打席をまたいで持ち越さない。ここを消し忘れると、
     一度の PERFECT がその試合ずっと効き続けてしまう。 */
  M.timing = null; M.boost = null;
  B.on = false; B.trail.length = 0;
  setFielders();
  paintMatchHead();
  askPitch();
}
/* ① 投球（守備側が球種とコースをえらぶ） */
function askPitch() {
  M.phase = "pitch";
  const bat = mp(batterId(), offMine());
  const pit = mp(pitcherId(), !offMine());
  const defMine = !offMine();
  if (!defMine) {
    /* 自分は打者。相手（CPU/オンライン）の配球は隠したまま、毎球あたらしく決まる */
    M.cpuPitch = cpuChoosePitch(pit, bat);
    M.sel = null;
    askSwing();
    return;
  }
  M.cpuPitch = null;
  const stam = defMine ? M.stam.me : M.stam.cpu;
  $("mtBot").innerHTML = `
    ${clutchBar()}
    <div class="hint">🥎 <b>${esc(pit.nm)}</b> で投げます — <b>球種</b>と<b>コース</b>をえらんでください<br>
      <span style="color:var(--tx3)">スタミナ ${Math.round(stam)} / 100</span></div>
    <div class="cardsel p3" id="pitchSel">
      ${pit.pitches.map((q, i) => { const d = MD2DATA.PITCH_ALL.find((x) => x.k === q.k);
        return `<button class="psel ${i === 0 ? "on" : ""}" data-k="${q.k}" onclick="mdPickPitch('${q.k}')">${d.nm}<small>${Math.round(velOf(pit, q))} km/h</small></button>`; }).join("")}
    </div>
    <div class="zone big" id="zoneSel" style="margin-top:8px">
      ${Array.from({ length: 9 }, (_, i) => `<button class="${i === 4 ? "on" : ""}" data-z="${i}" onclick="mdPickZone(${i})"></button>`).join("")}
    </div>
    <div class="row" style="margin-top:9px"><button class="btn pri" style="flex:1" onclick="mdThrow()">投球開始</button></div>`;
  M.sel = { pitch: pit.pitches[0].k, zone: 4 };
}
function velOf(p, q) {
  const d = MD2DATA.PITCH_ALL.find((x) => x.k === q.k) || { move: 0 };
  /* ★ 実測して調整。素の球速は 20〜120 まで出るので、係数が大きいと 160km/h を超えてしまう。
     いちばん速い投手でだいたい 155km/h、ふつうの投手で 140km/h 台に収まるようにしてある。 */
  return Math.round(112 + p.velo * 0.30 - d.move * 5 + q.lv * 1.2);
}
window.mdPickPitch = (k) => {
  M.sel.pitch = k; SFX.tap();
  document.querySelectorAll("#pitchSel .psel").forEach((b) => b.classList.toggle("on", b.dataset.k === k));
};
window.mdPickZone = (i) => {
  M.sel.zone = i; SFX.tap();
  document.querySelectorAll("#zoneSel button").forEach((b) => b.classList.toggle("on", +b.dataset.z === i));
};
window.mdThrow = () => { SFX.pitch(); askSwing(); };

/* ② 打者の読み合い */
/* 配球が無いときの保険（真ん中のストレート）。ここを通ったら作りのどこかが抜けている。 */
function safePitchSel(pit) {
  const k = (pit && pit.pitches && pit.pitches[0]) ? pit.pitches[0].k : "straight";
  return { pitch: k, zone: 4 };
}
function askSwing() {
  M.phase = "swing";
  const bat = mp(batterId(), offMine());
  const pit = mp(pitcherId(), !offMine());
  /* ★ どちらの側の配球も、ここで必ず埋まっていることを確かめる */
  if (offMine()) { if (!M.cpuPitch) M.cpuPitch = cpuChoosePitch(pit, bat); }
  else { if (!M.sel) M.sel = safePitchSel(pit); }
  if (offMine()) {
    $("mtBot").innerHTML = `
      ${clutchBar()}
      <div class="hint">🏏 <b>${esc(bat.nm)}</b> の打席 — <b>コースを読んで</b>、打ちかたをえらぶ<br>
        <span style="color:var(--tx3)">ミート${bat.meet} パワー${bat.power} 走力${bat.run} ／ 弾道${"★".repeat(bat.traj)}</span></div>
      <div class="zone big" id="zoneSel2">
        ${Array.from({ length: 9 }, (_, i) => `<button class="${i === 4 ? "on" : ""}" data-z="${i}" onclick="mdReadZone(${i})"></button>`).join("")}
      </div>
      <div class="cardsel p3" style="margin-top:9px">
        <button class="psel on" data-s="meet" onclick="mdSwingType('meet')">ミート重視<small>当たりやすい</small></button>
        <button class="psel" data-s="power" onclick="mdSwingType('power')">強振<small>長打ねらい</small></button>
        <button class="psel" data-s="bunt" onclick="mdSwingType('bunt')">バント<small>送る</small></button>
      </div>
      <div class="row" style="margin-top:9px">
        <button class="btn" onclick="mdSwing('take')">見送る</button>
        <button class="btn pri" style="flex:1" onclick="mdSwing('swing')">SWING</button>
      </div>`;
    M.bsel = { zone: 4, type: "meet" };
  } else {
    /* 自分は守備。CPU（またはオンラインの相手）が読む */
    const guess = cpuGuess(bat, M.sel);
    M.bsel = guess;
    setTimeout(() => resolvePitch(guess.act), 420);
  }
}
window.mdReadZone = (i) => {
  M.bsel.zone = i; SFX.tap();
  document.querySelectorAll("#zoneSel2 button").forEach((b) => b.classList.toggle("on", +b.dataset.z === i));
};
window.mdSwingType = (t) => {
  M.bsel.type = t; SFX.tap();
  document.querySelectorAll('.psel[data-s]').forEach((b) => b.classList.toggle("on", b.dataset.s === t));
};
window.mdSwing = (act) => {
  if (act === "swing" && M.bsel.type !== "bunt") { askTiming(act); return; }
  resolvePitch(act);
};
/* ③ タイミング（スイングの精度） */
function askTiming(act) {
  M.phase = "timing";
  const bat = mp(batterId(), offMine());
  const goodW = 20 + bat.meet * 0.22;     /* ミートが高いほど帯が広い */
  const perfW = 6 + bat.meet * 0.09;
  const gL = 50 - goodW / 2, pL = 50 - perfW / 2;
  $("mtBot").innerHTML = `
    ${clutchBar()}
    <div class="hint">⏱ 白い線が<b>まん中</b>に来た瞬間にタップ！ 金の帯で <b>PERFECT</b></div>
    <div class="timing" id="tmBar">
      <div class="good" style="left:${gL}%;width:${goodW}%"></div>
      <div class="perf" style="left:${pL}%;width:${perfW}%"></div>
      <div class="cur" id="tmCur" style="left:0%"></div>
    </div>
    <div class="row"><button class="btn pri" style="flex:1" onclick="mdTimingHit()">打つ！</button></div>`;
  M.tm = { t: 0, dir: 1, sp: 1.6 + (M.top ? 0 : 0) + (cfg.cpu * .18), gL, goodW, pL, perfW, act, done: false };
  tickTiming();
}
function tickTiming() {
  if (!M.tm || M.tm.done) return;
  M.tm.t += M.tm.dir * M.tm.sp;
  if (M.tm.t > 100) { M.tm.t = 100; M.tm.dir = -1; }
  if (M.tm.t < 0) { M.tm.t = 0; M.tm.dir = 1; }
  const c = $("tmCur"); if (c) c.style.left = M.tm.t + "%";
  M.tm.raf = requestAnimationFrame(tickTiming);
}
window.mdTimingHit = () => {
  if (!M.tm || M.tm.done) return;
  M.tm.done = true; cancelAnimationFrame(M.tm.raf);
  const t = M.tm.t;
  let q = "MISS";
  if (t >= M.tm.pL && t <= M.tm.pL + M.tm.perfW) q = "PERFECT";
  else if (t >= M.tm.gL && t <= M.tm.gL + M.tm.goodW) q = "GREAT";
  else if (Math.abs(t - 50) < 26) q = "GOOD";
  M.timing = q;
  bigMsg(q, 700);
  SFX.tap();
  resolvePitch(M.tm.act);
};
function clutchBar() {
  const mine = offMine();
  const c = mine ? M.clutch.me : M.clutch.cpu;
  const opts = MD2DATA.CLUTCH.filter((x) => x.side === (mine ? "off" : "def"));
  return `<div class="clutch">
    <span class="lb">CLUTCH</span>
    <span class="bar"><i id="clutchBar" style="width:${clamp(c, 0, 100)}%"></i></span>
    <button id="clutchBtn" ${c >= 80 ? "" : "disabled"} onclick="mdClutch()">つかう</button></div>`;
}
window.mdClutch = () => {
  const mine = offMine();
  const cur = mine ? M.clutch.me : M.clutch.cpu;
  const opts = MD2DATA.CLUTCH.filter((x) => x.side === (mine ? "off" : "def") && x.cost <= cur);
  if (!opts.length) return;
  $("slotBody").innerHTML = `<div style="font-size:11.5px;font-weight:800;color:var(--tx2);margin-bottom:9px">
      CLUTCH MOMENT — ゲージを使って発動します（いま ${Math.round(cur)}）</div>
    ${opts.map((o) => `<div class="skl" onclick="mdUseClutch('${o.k}')" style="cursor:pointer">
      <span class="d" style="background:${o.c}"></span>
      <span><span class="n" style="color:${o.c}">${o.nm} <small style="color:var(--tx3)">− ${o.cost}</small></span>
      <span class="x">${o.desc}</span></span></div>`).join("")}`;
  openSheet("sheetSlot");
};
window.mdUseClutch = (k) => {
  const o = MD2DATA.CLUTCH.find((x) => x.k === k); if (!o) return;
  const mine = offMine();
  if (mine) M.clutch.me -= o.cost; else M.clutch.cpu -= o.cost;
  M.boost = k;
  SFX.clutch(); bigMsg(o.nm, 900);
  closeSheet("sheetSlot"); paintMatchHead();
};

/* ══════════ 判定 ══════════ */
function cpuChoosePitch(pit, bat) {
  /* 走者がいるときは低め、追い込んだら外して振らせる、という程度の読み */
  const zones = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  let z;
  if (M.strike >= 2 && Math.random() < .55) z = pick([0, 2, 6, 8]);
  else if (M.ball >= 2) z = 4;
  else z = pick(zones);
  const q = pick(pit.pitches);
  return { pitch: q.k, zone: z };
}
function cpuGuess(bat, sel) {
  /* CPU の打者。強さで読みの精度が変わる */
  const acc = cfg.cpu === 1 ? .22 : cfg.cpu === 2 ? .34 : .46;
  const zone = Math.random() < acc ? sel.zone : Math.floor(Math.random() * 9);
  const type = M.strike >= 2 ? "meet" : (bat.power > bat.meet + 6 ? "power" : pick(["meet", "meet", "power"]));
  const swing = (M.strike >= 2) || Math.random() < .68;
  return { zone, type, act: swing ? "swing" : "take" };
}
function inZone(z) { return true; }   /* 3×3 は全部ストライクゾーン。外すときは ball 判定で扱う */
function resolvePitch(act) {
  const bat = mp(batterId(), offMine());
  const pit = mp(pitcherId(), !offMine());
  const pitSel = (offMine() ? M.cpuPitch : M.sel) || safePitchSel(pit);
  if (!M.bsel) M.bsel = { zone: 4, type: "meet" };
  const defMine = !offMine();
  const stam = defMine ? M.stam.me : M.stam.cpu;
  /* 制球のブレ。スタミナが減ると外れやすい */
  const ctrl = pit.ctrl * (0.6 + stam / 250) + (defMine ? teamEff().ctrl : 0);
  const wild = Math.random() > (0.42 + ctrl / 220);
  const isBall = wild;
  /* スタミナを減らす */
  const stamCut = 1.6 * (1 - sk(pit, "stam")) * (defMine ? (1 - teamEff().stam) : 1);
  if (defMine) M.stam.me = Math.max(0, M.stam.me - stamCut); else M.stam.cpu = Math.max(0, M.stam.cpu - stamCut);

  if (act === "take") {
    if (isBall) { M.ball++; addClutch(offMine() ? "me" : "cpu", 4); note("ボール"); }
    else { M.strike++; note("見逃しストライク"); }
    return afterCount();
  }
  if (M.bsel.type === "bunt") return doBunt(bat, pit);
  /* 読みが当たったか */
  const readHit = M.bsel.zone === pitSel.zone;
  const near = Math.abs((M.bsel.zone % 3) - (pitSel.zone % 3)) + Math.abs(Math.floor(M.bsel.zone / 3) - Math.floor(pitSel.zone / 3));
  let read = readHit ? 1 : near === 1 ? .58 : near === 2 ? .3 : .12;
  read += sk(bat, "miss");                       /* WIDE HITTER */
  read = clamp(read, 0, 1);
  /* タイミング */
  const tq = M.timing || "GOOD";
  const tmul = tq === "PERFECT" ? 1.18 : tq === "GREAT" ? 1.0 : tq === "GOOD" ? .78 : .42;
  /* 当たるか */
  const te = teamEff();
  let meet = bat.meet + (offMine() ? te.meet : 0)
    + (M.runners.some(Boolean) ? sk(bat, "runnerMeet") : 0)
    + (M.boost === "perfect" && offMine() ? 22 : 0);
  const power = bat.power * (1 + sk(bat, "hard") + (offMine() ? te.hard : 0))
    + (M.inn >= Math.ceil(M.innMax * .75) ? sk(bat, "lateP") : 0);
  const stuff = pit.velo * .5 + pit.brk * .3 * (1 + sk(pit, "move")) + pit.heavy * .2
    + (M.boost === "powerp" && !offMine() ? 18 : 0)
    + (M.strike >= 2 ? pit.velo * sk(pit, "finish") : 0);
  const contact = clamp(0.16 + read * 0.42 + (meet - stuff) / 300 + (tmul - .8) * .34, 0.05, 0.88);
  const r = Math.random();
  if (r > contact) {
    /* 空振り or ファウル */
    if (M.strike >= 2 && Math.random() < .18 + sk(bat, "foul")) { note("ファウル"); SFX.miss(); return afterCount(); }
    M.strike++; SFX.miss(); note("空振り");
    return afterCount();
  }
  /* 当たった → 打球を作る */
  const quality = clamp(read * .5 + (tmul - .5) * .8 + (meet - stuff) / 400 + Math.random() * .28, 0, 1.35);
  return hitBall(bat, pit, quality, power);
}
function note(t) { M.log.unshift(t); if (M.log.length > 6) M.log.pop(); bigMsg(t, 620); }
function addClutch(side, n) {
  const te = teamEff();
  const g = n * (1 + (side === "me" ? te.clutch : 0));
  M[side === "me" ? "clutch" : "clutch"][side] = clamp((M.clutch[side] || 0) + g, 0, 100);
  paintMatchHead();
}
function afterCount() {
  paintMatchHead();
  if (M.ball >= 4) { M.ball = 0; M.strike = 0; note("フォアボール"); SFX.safe(); return walk(); }
  if (M.strike >= 3) {
    M.strike = 0; M.ball = 0; note("三振！"); SFX.out();
    if (!offMine()) { M.stat.k++; bump("k", 1); }
    addClutch(offMine() ? "cpu" : "me", 12);
    return outMade(1);
  }
  M.timing = null;
  setTimeout(askPitch, 340);
}
function walk() {
  const id = batterId();
  /* 押し出しをふくめて1つずつ進める */
  let carry = id;
  for (let i = 0; i < 3 && carry; i++) { const t = M.runners[i]; M.runners[i] = carry; carry = t; }
  if (carry) scoreRun(1);
  advanceBatter();
  setTimeout(() => nextBatter(), 500);
}
function doBunt(bat, pit) {
  const ok = Math.random() < .55 + bat.meet / 400;
  if (!ok) { M.strike++; note("バント失敗"); SFX.miss(); return afterCount(); }
  note("バント成功");
  SFX.hit();
  /* 走者を1つずつ進めて打者はアウト */
  for (let i = 2; i >= 0; i--) {
    if (!M.runners[i]) continue;
    if (i === 2) { M.runners[2] = null; scoreRun(1); }
    else { M.runners[i + 1] = M.runners[i]; M.runners[i] = null; }
  }
  advanceBatter();
  outMade(1);
}
/* ══════════ 打球（野球盤） ══════════ */
function hitBall(bat, pit, quality, power) {
  M.phase = "ball";
  const st = M.stadium;
  /* 打球の方向（左右）と角度 */
  const dirBias = (Math.random() - .5) * 1.5;
  const ang = -Math.PI / 2 + dirBias * (Math.PI / 4.2);
  const soft = 1 - sk(pit, "soft");
  const sp = (0.006 + quality * 0.019 + power / 100 * 0.010) * soft;
  const launch = clamp((bat.traj * .07) + (quality - .45) * .30 + (M.bsel.type === "power" ? .10 : -.02), -0.02, 0.42);
  B.on = true; B.x = HOME.x; B.y = HOME.y; B.trail.length = 0;
  B.vx = Math.cos(ang) * sp; B.vy = Math.sin(ang) * sp;
  B.z = 0.02; B.vz = launch * .12;
  if (quality > .85) SFX.hard(); else SFX.hit();
  FX.push({ type: "spark", x: HOME.x, y: HOME.y, c: "#ffd257", t: 0, dur: 22 });
  /* 野手をボールへ向かわせる */
  const te = teamEff();
  const reachUp = (!offMine() ? te.reach : 0) + (M.boost === "supercat" && !offMine() ? .2 : 0);
  FLD.forEach((f) => { f.tx = null; f.ty = null; f.reachNow = f.reach * (1 + reachUp + sk(mp(f.id, !offMine()) || {}, "reach")); });
  /* 判定は少し走らせてから */
  trackBall(bat, quality, power);
}
function trackBall(bat, quality, power) {
  let frames = 0;
  const st = M.stadium;
  const iv = setInterval(() => {
    frames++;
    /* 野手はボールの少し先をねらう */
    let near = null, nd = 9;
    FLD.forEach((f) => {
      const d = Math.hypot(f.hx - B.x, f.hy - B.y);
      if (d < nd) { nd = d; near = f; }
    });
    FLD.forEach((f) => { f.tx = (f === near) ? B.x + B.vx * 6 : f.hx; f.ty = (f === near) ? B.y + B.vy * 6 : f.hy; });
    const dHome = Math.hypot(B.x - HOME.x, B.y - HOME.y);
    const fenceR = 0.78 * st.depth;
    const outFoul = (B.x < 0.04 || B.x > 0.96 || B.y > 0.99);
    /* ホームラン */
    if (dHome > fenceR && B.z > 0.55 * st.fence) {
      clearInterval(iv); B.on = false;
      return doHomerun(bat);
    }
    /* ファウル */
    const fx = Math.abs(B.x - HOME.x), fy = HOME.y - B.y;
    if (fy > 0 && fx > fy * 1.02 && dHome > .1) {
      clearInterval(iv); B.on = false;
      M.strike = Math.min(2, M.strike + 1); note("ファウル"); return afterCount();
    }
    /* 捕球できたか（フライ or ゴロ） */
    if (near && Math.hypot(near.x - B.x, near.y - B.y) < (near.reachNow || near.reach)) {
      const flyBall = B.z > 0.05;
      clearInterval(iv);
      return askCatch(near, flyBall, bat, quality);
    }
    /* 止まった（抜けた） */
    if (frames > 34 && Math.hypot(B.vx, B.vy) < 0.0010) {
      clearInterval(iv);
      return askCatch(near, false, bat, quality, true);
    }
    if (frames > 150) { clearInterval(iv); return askCatch(near, false, bat, quality, true); }
  }, 45);
}
function doHomerun(bat) {
  FX.push({ type: "ring", x: B.x, y: B.y, r: 60, c: "#ffd257", t: 0, dur: 34 });
  FX.push({ type: "spark", x: B.x, y: B.y, c: "#ff9d2e", t: 0, dur: 30 });
  bigMsg("HOME RUN!!", 1600);
  SFX.run();
  const n = 1 + M.runners.filter(Boolean).length;
  M.runners = [null, null, null];
  scoreRun(n);
  if (offMine()) { M.stat.hr++; M.stat.hit++; bump("hr", 1); bump("hit", 1); }
  addClutch(offMine() ? "me" : "cpu", 30);
  advanceBatter();
  setTimeout(() => nextBatter(), 1700);
}
/* ④ 守備（捕球のタイミング）→ ⑤ 送球 */
function askCatch(f, fly, bat, quality, through) {
  M.phase = "catch";
  const defMine = !offMine();
  if (through || !f) return resolveHit(bat, quality, "抜けた", null);
  if (!defMine) {
    /* CPU の守備 */
    const p = mp(f.id, false) || { catch: 60, field: 60 };
    const ok = Math.random() < .55 + p.catch / 260 + (cfg.cpu * .04);
    return finishCatch(f, fly, bat, quality, ok ? (Math.random() < .3 ? "PERFECT" : "GREAT") : "GOOD");
  }
  const p = mp(f.id, true) || { catch: 60 };
  const goodW = 26 + p.catch * 0.24 + sk(p, "hands") * 100;
  const perfW = 8 + p.catch * 0.10;
  const gL = 50 - goodW / 2, pL = 50 - perfW / 2;
  $("mtBot").innerHTML = `
    <div class="hint">🧤 <b>${esc((mp(f.id, true) || {}).nm || f.ps)}</b>（${f.ps}）が追いついた！<br>
      白い線がまん中に来た瞬間にタップして<b>捕球</b></div>
    <div class="timing" id="tmBar">
      <div class="good" style="left:${gL}%;width:${goodW}%"></div>
      <div class="perf" style="left:${pL}%;width:${perfW}%"></div>
      <div class="cur" id="tmCur" style="left:0%"></div>
    </div>
    <div class="row"><button class="btn pri" style="flex:1" onclick="mdCatchNow()">捕る！</button></div>`;
  M.tm = { t: 0, dir: 1, sp: 2.0, gL, goodW, pL, perfW, done: false, f, fly, bat, quality };
  tickTiming();
}
window.mdCatchNow = () => {
  if (!M.tm || M.tm.done) return;
  M.tm.done = true; cancelAnimationFrame(M.tm.raf);
  const t = M.tm.t;
  let q = "MISS";
  if (t >= M.tm.pL && t <= M.tm.pL + M.tm.perfW) q = "PERFECT";
  else if (t >= M.tm.gL && t <= M.tm.gL + M.tm.goodW) q = "GREAT";
  else if (Math.abs(t - 50) < 30) q = "GOOD";
  bigMsg(q, 620);
  if (q === "MISS") SFX.miss(); else SFX.catch2();
  finishCatch(M.tm.f, M.tm.fly, M.tm.bat, M.tm.quality, q);
};
function finishCatch(f, fly, bat, quality, q) {
  B.on = false;
  if (q === "MISS") return resolveHit(bat, quality, "エラー", f);
  if (fly) {
    note("フライアウト");
    SFX.out();
    addClutch(offMine() ? "cpu" : "me", 10);
    advanceBatter();
    /* タッチアップ */
    if (M.out < 2 && M.runners[2] && Math.random() < .5) { M.runners[2] = null; scoreRun(1); note("タッチアップで生還！"); }
    return outMade(1);
  }
  /* ゴロ → 送球先をえらぶ */
  return askThrow(f, bat, quality, q);
}
function askThrow(f, bat, quality, cq) {
  M.phase = "throw";
  const defMine = !offMine();
  const opts = [];
  opts.push({ k: "1", nm: "一塁", note: "打者走者をアウトに" });
  if (M.runners[0]) opts.push({ k: "2", nm: "二塁", note: "封殺（ダブルプレーねらい）" });
  if (M.runners[1]) opts.push({ k: "3", nm: "三塁", note: "先の走者を止める" });
  if (M.runners[2]) opts.push({ k: "H", nm: "本塁", note: "得点を防ぐ" });
  if (!defMine) {
    const best = M.runners[2] ? "H" : (M.runners[0] && M.out < 2 ? "2" : "1");
    return setTimeout(() => resolveThrow(f, best, bat, quality, cq), 380);
  }
  $("mtBot").innerHTML = `
    <div class="hint">🎯 <b>送球先</b>をえらんでください（捕球 ${cq}）</div>
    <div class="cardsel p3">
      ${opts.map((o) => `<button class="psel" onclick="mdThrowTo('${o.k}')">${o.nm}<small>${o.note}</small></button>`).join("")}
    </div>`;
  M.throwCtx = { f, bat, quality, cq };
}
window.mdThrowTo = (k) => {
  const c = M.throwCtx; if (!c) return;
  SFX.tap();
  resolveThrow(c.f, k, c.bat, c.quality, c.cq);
};
function resolveThrow(f, to, bat, quality, cq) {
  const defMine = !offMine();
  const fp = mp(f.id, defMine) || { arm: 60 };
  const te = teamEff();
  const armB = fp.arm * (1 + sk(fp, "throw") + (defMine ? 0 : 0) + (M.boost === "lightning" && defMine ? .2 : 0));
  const cqB = cq === "PERFECT" ? 14 : cq === "GREAT" ? 6 : 0;
  const dist = Math.hypot(f.x - HOME.x, f.y - HOME.y);
  const runner = to === "1" ? bat : (mp(to === "2" ? M.runners[0] : to === "3" ? M.runners[1] : M.runners[2], offMine()) || bat);
  const runB = runner.run * (1 + sk(runner, "close") + (offMine() ? te.run : 0) + (M.boost === "greenlight" && offMine() ? .15 : 0));
  /* ★ 実測して上げた。もとの式だと内野ゴロがほとんどセーフになっていた。 */
  const p = clamp(0.62 + (armB + cqB - runB) / 150 - dist * 0.40 - quality * .16, 0.08, 0.95);
  const outOk = Math.random() < p;
  FX.push({ type: "ring", x: f.x, y: f.y, r: 40, c: "#7fd0ff", t: 0, dur: 22 });
  if (outOk) {
    bigMsg("OUT!", 900); SFX.out();
    addClutch(defMine ? "me" : "cpu", 10);
    /* 走者の整理 */
    if (to === "1") { advanceRunnersOnGround(false); advanceBatter(); return outMade(1); }
    if (to === "2") { M.runners[0] = null; M.runners[0] = bat.id; advanceBatter(); return outMade(1); }
    if (to === "3") { M.runners[1] = null; M.runners[0] = M.runners[0] || bat.id; advanceBatter(); return outMade(1); }
    if (to === "H") { M.runners[2] = null; advanceRunnersOnGround(true); advanceBatter(); return outMade(1); }
  }
  bigMsg("SAFE!", 900); SFX.safe();
  addClutch(offMine() ? "me" : "cpu", 8);
  return resolveHit(bat, quality, "内野安打", f);
}
function advanceRunnersOnGround(keepThird) {
  if (M.runners[2] && !keepThird) { M.runners[2] = null; scoreRun(1); }
  if (M.runners[1]) { M.runners[2] = M.runners[1]; M.runners[1] = null; }
  if (M.runners[0]) { M.runners[1] = M.runners[0]; M.runners[0] = null; }
}
/* 抜けた・安打になったとき */
function resolveHit(bat, quality, label, f) {
  B.on = false;
  const dist = Math.hypot(B.x - HOME.x, B.y - HOME.y);
  let bases = 1;
  if (dist > .70) bases = 3;
  else if (dist > .56) bases = 2;
  if (quality > 1.15 && bases < 3) bases++;
  if (sk(bat, "extra") > 0 && Math.random() < sk(bat, "extra")) bases = Math.min(3, bases + 1);
  const nm = bases === 3 ? "スリーベースヒット！" : bases === 2 ? "ツーベースヒット！" : (label === "エラー" ? "エラー出塁" : label === "内野安打" ? "内野安打！" : "ヒット！");
  bigMsg(nm, 1200); SFX.run();
  if (offMine()) { M.stat.hit++; bump("hit", 1); }
  addClutch(offMine() ? "me" : "cpu", 16);
  /* 走者を進める */
  let runs = 0;
  for (let i = 2; i >= 0; i--) {
    if (!M.runners[i]) continue;
    const to = i + bases;
    if (to >= 3) { runs++; M.runners[i] = null; }
    else { M.runners[to] = M.runners[i]; M.runners[i] = null; }
  }
  if (bases >= 3) { M.runners[2] = bat.id; }
  else if (bases === 2) { M.runners[1] = bat.id; }
  else { M.runners[0] = bat.id; }
  if (runs) scoreRun(runs);
  M.timing = null; M.boost = null;
  advanceBatter();
  setTimeout(() => nextBatter(), 1300);
}
function advanceBatter() { const k = M.top ? "cpu" : "me"; M.idx[k] = (M.idx[k] + 1) % offTeam().order.length; }
function scoreRun(n) {
  const k = offMine() ? "me" : "cpu";
  M.score[k] += n;
  bigMsg(n + " 点！", 1100);
  SFX.run();
  paintMatchHead();
}
function outMade(n) {
  M.out += n;
  M.ball = 0; M.strike = 0; M.timing = null; M.boost = null;
  paintMatchHead();
  if (M.out >= 3) { M.out = 0; return setTimeout(changeSide, 1000); }
  setTimeout(() => nextBatter(), 900);
}
function changeSide() {
  M.runners = [null, null, null];
  if (!M.top) { M.inn++; M.top = true; } else { M.top = false; }
  /* 試合終了の判定 */
  if (M.inn > M.innMax) return endMatch();
  if (M.inn === M.innMax && !M.top && M.score.me > M.score.cpu) return endMatch();   /* サヨナラ前の裏いらず */
  bigMsg(M.inn + (M.top ? "回表" : "回裏"), 1200);
  /* 投手のスタミナが尽きたら継投 */
  const t = M.top ? "me" : "cpu";
  const st = M.top ? M.stam.me : M.stam.cpu;
  if (st < 22) {
    const arr = (M.top ? M.myTeam : M.cpuTeam).sp;
    const cur = M.top ? M.pitcher.me : M.pitcher.cpu;
    const i = arr.indexOf(cur);
    if (i >= 0 && arr[i + 1]) {
      if (M.top) { M.pitcher.me = arr[i + 1]; M.stam.me = 100; } else { M.pitcher.cpu = arr[i + 1]; M.stam.cpu = 100; }
      toast("投手交代：" + ((mp(M.top ? M.pitcher.me : M.pitcher.cpu, M.top) || {}).nm || ""));
    }
  }
  setTimeout(() => { paintMatchHead(); nextBatter(); }, 1000);
}
function endMatch() {
  M.over = true;
  const win = M.score.me > M.score.cpu, draw = M.score.me === M.score.cpu;
  if (win) SFX.win(); else SFX.lose();
  S.rec.games++; bump("games", 1);
  if (win) { S.rec.w++; bump("w", 1); } else if (draw) S.rec.d++; else S.rec.l++;
  S.rec.hit += M.stat.hit; S.rec.hr += M.stat.hr; S.rec.k += M.stat.k;
  /* 報酬 */
  const base = 2500 + M.innMax * 400;
  const gold = Math.round(base * (win ? 1.8 : draw ? 1.2 : 0.8));
  const tp = Math.round((win ? 60 : 30) + M.stat.hit * 4 + M.stat.hr * 15);
  const coin = win ? 20 : 8;
  S.gold += gold; S.tp += tp; S.coin += coin;
  /* ランクポイント */
  let dpt = 0;
  if (M.mode === "ranked") {
    dpt = win ? 60 + Math.min(30, (M.score.me - M.score.cpu) * 6) : draw ? 8 : -34;
    S.rank.pt = Math.max(0, S.rank.pt + dpt);
    if (win) S.rank.w++; else if (!draw) S.rank.l++;
  }
  save();
  $("mtBot").innerHTML = `
    <div class="hint" style="font-size:16px;color:${win ? "var(--gold)" : draw ? "var(--tx2)" : "var(--tx3)"}">
      ${win ? "🏆 WIN!" : draw ? "🤝 DRAW" : "😢 LOSE"} &nbsp; ${M.score.me} − ${M.score.cpu}</div>
    <div class="row" style="justify-content:center;margin-bottom:8px">
      <span class="chip" style="color:var(--gold)">+${fmt(gold)} Gold</span>
      <span class="chip" style="color:var(--cy)">+TP ${tp}</span>
      <span class="chip" style="color:var(--pur)">+${coin} コイン</span>
      ${M.mode === "ranked" ? `<span class="chip" style="color:${dpt >= 0 ? "var(--grn)" : "var(--red)"}">${dpt >= 0 ? "+" : ""}${dpt} pt</span>` : ""}
    </div>
    <div class="row" style="justify-content:center;margin-bottom:8px">
      <span class="chip">安打 ${M.stat.hit}</span><span class="chip">本塁打 ${M.stat.hr}</span><span class="chip">奪三振 ${M.stat.k}</span>
    </div>
    <div class="row"><button class="btn pri" style="flex:1" onclick="mdEndMatch()">結果をとじる</button></div>`;
  bigMsg(win ? "WIN!" : draw ? "DRAW" : "LOSE", 2200);
}
window.mdEndMatch = () => {
  $("mtWrap").classList.add("hide");
  M = null;
  paint();
};
window.mdQuitMatch = async () => {
  if (!M) return;
  if (!confirm("試合をやめますか？（記録は残りません）")) return;
  $("mtWrap").classList.add("hide"); M = null; paint();
};
function bump(k, n) { msnCheck(); S.day[k] = (S.day[k] | 0) + n; save(); }

/* ══════════ オンライン（xevarion-online の Firebase を使う） ══════════
   ★ 対戦のしくみそのものは<b>過去版と同じ部屋番号方式</b>。
     ここでは「部屋を作る／入る」までを用意し、実際の同期は md2-online.js が行う。 */
window.mdOnlineCreate = () => {
  if (!window.MD2Online) { toast("オンラインの準備ができていません"); return; }
  MD2Online.create(cfg, team()).then((room) => {
    toast("部屋番号 " + room + " を作りました。相手を待っています…");
    paintMatch();
  }).catch(() => toast("部屋を作れませんでした（通信を確かめてください）"));
};
window.mdOnlineJoinPrompt = () => {
  const r = prompt("部屋番号（4桁）を入れてください");
  if (!r) return;
  if (!window.MD2Online) { toast("オンラインの準備ができていません"); return; }
  MD2Online.join(String(r).trim(), cfg, team()).then(() => { toast("部屋に入りました"); paintMatch(); })
    .catch(() => toast("その部屋には入れませんでした"));
};
window.mdOnlineLeave = () => { if (window.MD2Online) MD2Online.leave(); paintMatch(); };
window.addEventListener("md2online:start", (e) => {
  const d = (e && e.detail) || {};
  if (d.cfg) { cfg.inn = d.cfg.inn; cfg.stadium = d.cfg.stadium; }
  startMatch(matchMode === "ranked" ? "ranked" : "quick", d);
});

/* ══════════ 起動 ══════════ */
function boot() {
  load(); msnCheck();
  const sp = $("mdSplashBar");
  MD2DATA.loadMbCore().then(() => {
    MD2DATA.build();
    /* はじめて開いたときはチームを自動で作る（すぐ遊べるように） */
    if (!S.team || !teamOk()) { try { autoTeam(); } catch (e) {} }
    save();
    document.body.classList.remove("loading");
    const s = $("md2Splash"); if (s) { s.style.opacity = "0"; setTimeout(() => s.remove(), 600); }
    go("home");
  }).catch(() => {
    const s = $("md2Splash");
    if (s) s.innerHTML = '<div style="color:#ff8a8a;font-weight:900;font-size:13px;text-align:center;padding:20px;line-height:1.9">'
      + 'キャラクターのデータを読み込めませんでした。<br>通信を確かめて、もう一度開いてください。<br>'
      + '<a href="index.html" style="color:#ffd257">← 版えらびへもどる</a></div>';
  });
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();

/* 外から使うもの */
window.MD2 = { get state() { return S; }, save, paint, go, team, eff, teamPlayers, teamEff, autoTeam };
})();
