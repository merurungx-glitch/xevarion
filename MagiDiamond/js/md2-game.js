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
/* ★★ 2026-09-06 ご指定「限界突破は XEVARION のものをそのまま使う」。
   MagiDiamond の中に<b>もう1本</b>持つのをやめ、MagiBurst の限界突破（awk）を直接見る。
   ★ ここが<b>唯一の出どころ</b>。レベル上限も能力も弾道も、すべてこの数から出す。
   ★ 上限は MagiBurst と同じ 4（mb-core の MAX_AWK）。 */
const LIM_MAX = 4;
function limOf(id) { return Math.max(0, Math.min(LIM_MAX, awkOf(id) | 0)); }
function lvMax(id) { return LV_MAX_BASE + limOf(id) * 10; }          /* 限界突破1つで +10 */
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
  /* ★★ 2026-09-06 限界突破は<b>XEVARION（MagiBurst）のもの</b>をそのまま使う（ご指定）。
     1つにつき全能力 +2、3つ以上で弾道 +1、レベル上限 +10。
     ★ MagiDiamond の中では上げられない。ガチャや結晶交換所で進めば、そのままここに効く。 */
  const limUp = limOf(id) * 2;
  const o = Object.assign({}, base);
  STAT_KEYS.forEach((k) => { o[k] = clamp(Math.round(base[k] + lvUp + awkUp + limUp + (t.pt[k] | 0)), 20, 120); });
  o.lv = t.lv; o.lim = limOf(id); o.awk = t.awk;
  o.traj = clamp(base.traj + (t.sk.archist ? 1 : 0) + (limOf(id) >= 3 ? 1 : 0), 1, 4);
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
        <button class="btn" onclick="location.href='../index.html'">↩ XEVARION へもどる</button>
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
      ${[["cpu", "CPU戦"], ["local", "近くの人と"], ["quick", "クイック"], ["ranked", "ランク戦"], ["friend", "フレンド"], ["event", "イベント"]]
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
      <h3>${matchMode === "cpu" ? "🤖 CPU戦" : matchMode === "local" ? "📶 LOCAL PLAY（近くの人と）"
            : matchMode === "event" ? "🎪 イベント" : "🌐 オンライン"}</h3>
      ${matchMode === "local" ? `
        <p>★ <b>ゲームサーバーを使いません</b>。近くにいる人と、その場でつながって遊べます。<br>
        MagiBurst の <b>LOCAL PLAY とまったく同じしくみ</b>です——
        <b>ROOM CODE</b> か <b>QRコード</b> を相手に見せるだけ。最大4人。</p>
        <div class="row" style="margin-top:11px">
          <button class="btn pri" style="flex:1" ${ready ? "" : "disabled"} onclick="LocalPlay.open()">📶 LOCAL PLAY をひらく</button>
        </div>
        <p style="margin-top:9px;font-size:10.5px;color:var(--tx3)">
        ★ インターネット回線はいりません。2台が<b>同じ Wi-Fi</b>（テザリングでも可）にいれば直接つながります。</p>`
      : matchMode === "cpu" ? `
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
/* ★★ 2026-09-06 一覧の並び替え・検索・絞り込み（ご指定）。
   ★ <b>はじめは「番号の新しい順」</b>＝あとから来たキャラが左上に来る。
     no は MD_TIER の通し番号（MagiBurst の No. と同じ）。 */
let charFilter = { q: "", rank: "", role: "", pos: "", hand: "", own: true, sort: "new" };
const CH_SORTS = {
  new:  { nm: "番号の新しい順", f: (a, b) => (b.no || 0) - (a.no || 0) },
  old:  { nm: "番号の古い順",   f: (a, b) => (a.no || 0) - (b.no || 0) },
  ovr:  { nm: "総合力の高い順", f: (a, b) => eff(b.id).ovrNow - eff(a.id).ovrNow },
  lv:   { nm: "レベルの高い順", f: (a, b) => tr(b.id).lv - tr(a.id).lv },
  meet: { nm: "ミートの高い順", f: (a, b) => eff(b.id).meet - eff(a.id).meet },
  power:{ nm: "パワーの高い順", f: (a, b) => eff(b.id).power - eff(a.id).power },
  run:  { nm: "走力の高い順",   f: (a, b) => eff(b.id).run - eff(a.id).run },
  velo: { nm: "球速の速い順",   f: (a, b) => eff(b.id).velo - eff(a.id).velo },
  nm:   { nm: "名前順",         f: (a, b) => String(a.nm).localeCompare(String(b.nm), "ja") },
};
function paintChars() {
  const own = ownedSet();
  let list = MD2DATA.all();
  if (charFilter.own) list = list.filter((p) => own.has(p.id));
  if (charFilter.rank) list = list.filter((p) => p.rank === charFilter.rank);
  if (charFilter.role) list = list.filter((p) => p.role === charFilter.role);
  if (charFilter.pos) list = list.filter((p) => bestPos(p) === charFilter.pos);
  if (charFilter.hand) list = list.filter((p) => p.bats === charFilter.hand || p.throws === charFilter.hand);
  if (charFilter.q) {
    /* ★ 名前だけでなく<b>ポジション・打撃タイプ・投手タイプ・左右</b>でも当たる */
    const q = charFilter.q.toLowerCase();
    list = list.filter((p) => [p.nm, p.role, p.bat, p.pitchType, p.bats, p.throws, bestPos(p), p.label]
      .some((s) => String(s || "").toLowerCase().indexOf(q) >= 0));
  }
  const srt = CH_SORTS[charFilter.sort] || CH_SORTS.new;
  list = list.slice().sort(srt.f);
  const chip = (k, v, nm) => `<button class="${charFilter[k] === v ? "on" : ""}" onclick="mdCF('${k}','${v}')">${nm}</button>`;
  $("charBody").innerHTML = `
    <div class="csrch">
      <span class="mg">🔍</span>
      <input id="chQ" type="search" placeholder="名前・ポジション・左右でさがす" value="${esc(charFilter.q)}"
        oninput="mdCFq(this.value)" autocomplete="off" spellcheck="false">
      ${charFilter.q ? `<button class="cl" onclick="mdCFq('')">✕</button>` : ""}
    </div>
    <div class="csort">
      <span class="lb">↕ 並び替え</span>
      <select onchange="mdCF('sort',this.value)">
        ${Object.keys(CH_SORTS).map((k) => `<option value="${k}" ${charFilter.sort === k ? "selected" : ""}>${CH_SORTS[k].nm}</option>`).join("")}
      </select>
    </div>
    <div class="seg">
      <button class="${charFilter.own ? "on" : ""}" onclick="mdCF('own',1)">所持 ${own.size}</button>
      <button class="${!charFilter.own ? "on" : ""}" onclick="mdCF('own',0)">すべて</button>
      ${chip("rank", "SSR", "SSR")}${chip("rank", "SR", "SR")}
      ${chip("role", "投手", "投手")}${chip("role", "野手", "野手")}
    </div>
    <div class="seg">
      ${["捕", "一塁", "二塁", "三塁", "遊撃", "左翼", "中堅", "右翼"].map((ps) => chip("pos", ps, ps)).join("")}
    </div>
    <div class="seg">
      ${chip("hand", "右打", "右打")}${chip("hand", "左打", "左打")}${chip("hand", "両打", "両打")}
      ${chip("hand", "右投", "右投")}${chip("hand", "左投", "左投")}
      <button class="cl" onclick="mdCF('clear',1)">絞り込み解除</button>
    </div>
    <div style="font-size:11px;font-weight:800;color:var(--tx3);margin:6px 0 8px">${list.length} 人 ／ ${srt.nm}</div>
    <div class="pgrid">${list.map((p) => pcard(p, own.has(p.id))).join("")}</div>
    ${!list.length ? `<div class="empt">見つかりませんでした。<br>絞り込みを解除するか、XEVARION のガチャでキャラクターを増やしてください。</div>` : ""}`;
}
window.mdCF = (k, v) => {
  if (k === "clear") { charFilter.rank = ""; charFilter.role = ""; charFilter.pos = ""; charFilter.hand = ""; charFilter.q = ""; }
  else if (k === "own") charFilter.own = !!v;
  else if (k === "sort") charFilter.sort = v;
  else charFilter[k] = (charFilter[k] === v ? "" : v);
  SFX.tap(); paintChars();
};
/* ★ 検索は打つたびに描き直すので、<b>入力欄にカーソルを戻す</b>こと。
   戻さないと1文字ごとにキーボードが閉じてしまう。 */
let _chQT = null;
window.mdCFq = (v) => {
  charFilter.q = v;
  clearTimeout(_chQT);
  _chQT = setTimeout(() => {
    paintChars();
    const el = $("chQ");
    if (el) { el.focus(); try { el.setSelectionRange(v.length, v.length); } catch (e) {} }
  }, 160);
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
    <span class="st">Lv.${tr(p.id).lv} ${esc(p.role === "投手" ? p.throws || "" : p.bats || "")}</span>
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
          <span class="chip hand">${esc(p.bats || "右打")}</span>
          <span class="chip hand">${esc(p.throws || "右投")}</span>
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
      <div class="box"><h3>能力を伸ばす<span class="sp">TP ${fmt(S.tp)}</span></h3>
        <p>トレーニングポイント（TP）で、好きな能力を1つずつ伸ばせます（1ポイント = 15 TP・1つの能力につき +20 まで）。</p>
        <div class="posgrid" style="margin-top:9px;grid-template-columns:repeat(2,1fr)">
          ${STAT_KEYS.map((k) => `<div class="p1"><span>${STAT_NM[k]} <b style="color:var(--grn)">+${t.pt[k] | 0}</b></span>
            <button class="btn" style="padding:3px 9px;font-size:11px" ${(t.pt[k] | 0) >= 20 || S.tp < 15 ? "disabled" : ""} onclick="mdPt('${k}')">+1</button></div>`).join("")}
        </div></div>
      <div class="box"><h3>限界突破<span class="sp">${limOf(detId)} / ${LIM_MAX}</span></h3>
        ${/* ★★ 2026-09-06 ご指定により、ここは<b>XEVARION の限界突破をそのまま出すだけ</b>。
              MagiDiamond の中で Gold を払って上げるやりかたは廃止した
              （同じ言葉の限界突破が2つあって、食いちがっていたため）。 */""}
        <p>この選手の限界突破は XEVARION（MagiBurst）のものをそのまま使います。</p>
        <p>MagiDiamond の中で上げることはできません。</p>
        <div class="posgrid" style="margin-top:9px;grid-template-columns:1fr">
          <div class="p1"><span>レベル上限</span><b>${lvMax(detId)}</b></div>
          <div class="p1"><span>全能力への上乗せ</span><b>+${limOf(detId) * 2}</b></div>
          <div class="p1"><span>弾道</span><b>${limOf(detId) >= 3 ? "+1" : "±0"}</b></div>
        </div>
        ${limOf(detId) >= LIM_MAX
          ? `<p style="margin-top:7px;color:var(--gold)">👑 限界突破MAX です。</p>`
          : `<p style="margin-top:7px;color:var(--tx3)">※ 進めるには <b>XEVARION のガチャで同じキャラを引く</b>か、
        <b>結晶交換所で受け取る</b>と、こちらにもそのまま反映されます。</p>`}</div>
      <div class="box"><h3>覚醒<span class="sp">${t.awk} / 3</span></h3>
        <p>全能力が +3 され、カードの見た目が変わります。</p>
        <p>${fmt(awkCost(t.awk))} Gold と、XEVARION の限界突破 ${t.awk + 2} 以上が必要です。</p>
        <div class="row" style="margin-top:9px">
          <button class="btn grn" ${t.awk >= 3 || S.gold < awkCost(t.awk) || limOf(detId) < t.awk + 2 ? "disabled" : ""} onclick="mdAwake()">覚醒する</button>
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
/* ★ 2026-09-06 限界突破を XEVARION のものに一本化したので<b>もう使っていない</b>。
   古いセーブや外部から呼ばれても落ちないように残してある。 */
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
/* ★★ 2026-09-06 限界突破は XEVARION のものを使うので、ここで上げる操作は廃止。
   古い画面から呼ばれても落ちないように、案内だけ出す入口を残しておく。 */
window.mdLimit = () => {
  toast("限界突破は XEVARION（MagiBurst）のものをそのまま使います");
};
window.mdAwake = () => {
  const t = tr(detId), c = awkCost(t.awk);
  if (t.awk >= 3 || S.gold < c || limOf(detId) < t.awk + 2) return;
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
/* ══ ★★ 2026-09-06 守備配置（ご指定「守備配置の指示も」）══
   ・y が大きいほどホーム寄り（HOME.y = .90）。前進は y を<b>足す</b>。
   ・ここで動かした位置が、そのまま<b>捕球のむずかしさ</b>（走る距離）に効く。
     前に出れば内野ゴロは取りやすいが、頭を越されると外野まで抜ける——という形になる。
   ★ 新しい配置を足すときは、この表に1行足すだけでよい。 */
const SHIFTS = {
  normal: { nm: "定位置", ic: "◎", desc: "ふつうの守り", off: {} },
  in:     { nm: "前進守備", ic: "▲", desc: "内野を前に。ゴロは取りやすいが、抜かれると長打",
            off: { "一塁手": [0, .06], "二塁手": [0, .06], "三塁手": [0, .06], "遊撃手": [0, .06] } },
  deep:   { nm: "深めの守備", ic: "▼", desc: "外野を下げる。長打は防げるが、前に落ちる",
            off: { "左翼手": [0, -.06], "中堅手": [0, -.05], "右翼手": [0, -.06] } },
  left:   { nm: "左へ寄せる", ic: "◀", desc: "引っぱる右打者・流す左打者に",
            off: { "一塁手": [-.05, 0], "二塁手": [-.06, 0], "三塁手": [-.04, 0], "遊撃手": [-.05, 0],
                   "左翼手": [-.06, 0], "中堅手": [-.07, 0], "右翼手": [-.07, 0] } },
  right:  { nm: "右へ寄せる", ic: "▶", desc: "引っぱる左打者・流す右打者に",
            off: { "一塁手": [.04, 0], "二塁手": [.06, 0], "三塁手": [.05, 0], "遊撃手": [.05, 0],
                   "左翼手": [.07, 0], "中堅手": [.07, 0], "右翼手": [.06, 0] } },
  dp:     { nm: "ゲッツーシフト", ic: "⇄", desc: "二遊間を二塁へ寄せる。併殺は取りやすい",
            off: { "二塁手": [-.04, -.02], "遊撃手": [.04, -.02] } },
  bunt:   { nm: "バント警戒", ic: "⚑", desc: "一三塁を思い切り前へ。強い打球は抜ける",
            off: { "一塁手": [-.03, .10], "三塁手": [.03, .10], "投手": [0, .04] } },
};
function shiftKey() { const t = team(); return SHIFTS[t.shift] ? t.shift : "normal"; }
window.mdShift = (k) => {
  const t = team(); t.shift = SHIFTS[k] ? k : "normal"; save(); SFX.tap();
  if (M && M.phase) { setFielders(); paintMatchHead(); }
  toast("守備配置：" + SHIFTS[shiftKey()].nm);
  if (view === "team") paintTeam();
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
    tactic: "",                               /* いま出している作戦（1球かぎり） */
    lastPitch: null,                          /* 直前の1球（球種と実測の球速） */
    shiftNow: "normal",                       /* いま守っている側の守備配置 */
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
  /* ★★ 2026-09-06 走者のダイヤ図（ご指定）。走者のいる塁だけ黄色。 */
  const dm2 = $("mtDiam");
  if (dm2) {
    const cls = ["b1", "b2", "b3"];
    cls.forEach((c, i) => {
      const el = dm2.querySelector("." + c);
      if (el) el.classList.toggle("on", !!M.runners[i]);
    });
    dm2.title = "走者：" + (M.runners.some(Boolean)
      ? M.runners.map((r, i) => r ? ["一塁", "二塁", "三塁"][i] : null).filter(Boolean).join("・")
      : "なし");
  }
  /* ★★ 2026-09-06 いまの球速と守備配置（ご指定「球速を毎度計測し表示」） */
  const kb = $("mtKmh");
  if (kb) kb.innerHTML = M.lastPitch
    ? `<b>${M.lastPitch.kmh}</b><small>km/h</small><span>${esc(M.lastPitch.nm)}</span>` : "";
  const sb = $("mtShift");
  if (sb) {
    const s = SHIFTS[M.shiftNow || shiftKey()] || SHIFTS.normal;
    sb.innerHTML = `<i>${s.ic}</i>${esc(s.nm)}`;
    sb.style.display = offMine() ? "none" : "";
  }
}

/* ══════════ キャンバス（野球盤） ══════════ */
let _resizeHooked = false;
function initCanvas() {
  cv = $("mtCv"); cx = cv.getContext("2d");
  resizeCanvas();
  /* ★ 何度 startMatch を呼ばれても、resize の受け口とループは<b>1本だけ</b>にする。
     足し続けると同じフレームで2回描かれ、盤面が二重に見える（実際そうなっていた）。 */
  if (!_resizeHooked) { window.addEventListener("resize", resizeCanvas); _resizeHooked = true; }
  hookBatInput();                       /* ★★ 2026-09-03 リアルタイム打撃の指の受け口 */
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
/* ══════════════════════════════════════════════════════════════
   ★★ 2026-09-01 打席の「3D風（2D）」画面（ご指定・画面案1〜3）
   ------------------------------------------------------------
   イメージは<b>パワプロ＋野球盤</b>。
   ・投球・読み合い・タイミングのあいだは<b>キャッチャーのうしろから見た絵</b>にする。
     マウンドの投手・打席の打者は<b>キャラクターの絵</b>をそのまま立たせる。
   ・打球が飛んだら（M.phase が "ball" 以降）これまでの<b>真上から見た盤面</b>に戻す。
     守備の駒も丸ではなく<b>キャラクターの絵</b>にする。
   ★ 描く場所は1枚のキャンバス（#mtCv）のまま。
     2枚重ねると「どちらが上か」で事故が起きるので、<b>描き分ける</b>だけにしてある。
   ★ 絵は読み込みに時間がかかるので、間に合わないあいだは<b>丸</b>で描く
     （読み込めたフレームから自然に絵へ変わる）。
   ══════════════════════════════════════════════════════════════ */
const IMGC = Object.create(null);
function imgOf(src) {
  if (!src) return null;
  let im = IMGC[src];
  if (im === undefined) {
    im = new Image();
    im.decoding = "async";
    im.src = src;
    IMGC[src] = im;
  }
  return (im && im.complete && im.naturalWidth > 0) ? im : null;
}
/* 丸の中にキャラの絵を描く。
   ★★ 2026-09-03 ご報告:「キャラの画像は正方形なので正方形で出して」。
     切り出しを side × side*0.92 にしていたので、縦に 8% 伸びていた。
     元の絵は正方形なので、<b>正方形のまま</b>入れればゆがまない。 */
function drawFace(g, src, cxp, cyp, r, ring) {
  const im = imgOf(src);
  g.save();
  g.beginPath(); g.arc(cxp, cyp, r, 0, Math.PI * 2); g.closePath();
  if (im) {
    g.clip();
    /* 縦横の短いほうで正方形に切り出す（中央寄せ・上寄り） */
    const s = Math.min(im.naturalWidth, im.naturalHeight);
    const sx = (im.naturalWidth - s) / 2, sy = 0;
    g.drawImage(im, sx, sy, s, s, cxp - r, cyp - r, r * 2, r * 2);
  } else {
    g.fillStyle = "#2a3352"; g.fill();
  }
  g.restore();
  if (ring) {
    g.strokeStyle = ring; g.lineWidth = Math.max(1.5, r * 0.14);
    g.beginPath(); g.arc(cxp, cyp, r, 0, Math.PI * 2); g.stroke();
  }
}
/* ══ ★★ 2026-09-03 マウンド・打席のキャラは<b>正方形</b>で出す（ご指定）══
   これまでは縦長（幅＝高さ×0.62）の枠に入れ、絵を引き伸ばしていたので
   顔が縦にゆがんで見えていた。元の絵は正方形なので、
   <b>正方形のパネル</b>にそのまま入れる（ゆがまない）。
   引数の hh は「一辺の長さ」として使う。 */
function drawStand(g, src, cxp, byp, hh, flip) {
  const im = imgOf(src);
  const sz = hh;                       /* 一辺（正方形） */
  g.save();
  g.translate(cxp, byp);
  if (flip) g.scale(-1, 1);
  /* 足もとの影 */
  g.fillStyle = "rgba(0,0,0,.35)";
  g.beginPath(); g.ellipse(0, 0, sz * 0.40, sz * 0.10, 0, 0, Math.PI * 2); g.fill();
  const rr = sz * 0.14;
  const x0 = -sz / 2, y0 = -sz;
  g.beginPath();
  g.moveTo(x0 + rr, y0);
  g.arcTo(x0 + sz, y0, x0 + sz, y0 + sz, rr);
  g.arcTo(x0 + sz, y0 + sz, x0, y0 + sz, rr);
  g.arcTo(x0, y0 + sz, x0, y0, rr);
  g.arcTo(x0, y0, x0 + sz, y0, rr);
  g.closePath();
  if (im) {
    g.save(); g.clip();
    const s = Math.min(im.naturalWidth, im.naturalHeight);
    const sx = (im.naturalWidth - s) / 2, sy = (im.naturalHeight - s) / 2;
    g.drawImage(im, sx, sy, s, s, x0, y0, sz, sz);
    g.restore();
  } else {
    g.fillStyle = "#28304e"; g.fill();
  }
  g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = Math.max(1, sz * 0.012); g.stroke();
  g.restore();
}

/* ════════════════════════════════════════════════════════════
   ★★ 2026-09-03 <b>リアルタイム打撃</b>（ご指定・プロスピ式）
   ────────────────────────────────────────────────────────────
   ご指定:「同期で球が飛んできて、バットの焦点をリアルタイムで合わせて打てるように」

   ■ これまで
     打つ側は「コースを読む（3×3のどこかをえらぶ）」→「左右に往復する帯をタップ」の2段。
     球は演出として飛んでいるだけで、<b>球を見て打ってはいなかった</b>。

   ■ これから
     ① 打ちかた（ミート／強振／バント）をえらんで「構える」。
     ② 投手が投げ、<b>球が本当のコースへ飛んでくる</b>（変化球は手元で曲がる）。
     ③ 画面を<b>なぞってミートカーソルを動かし</b>、<b>指を離した瞬間に振る</b>。
     ④ さわらなければ<b>見送り</b>（take）。

   ■ 当たりはずれを 2つ で見る
     ・<b>タイミング</b> … 振った瞬間の u（1.0 でホームベース）とのだけ
     ・<b>ミート位置</b> … カーソルの中心と球の距離
     この2つから read（0〜1）と M.timing（PERFECT/GREAT/GOOD/MISS）を作り、
     <b>これまでの resolvePitch の式にそのまま流しこむ</b>（強さの基準を変えない）。

   ★ CPU の打席はこれまでどおり（cpuGuess → resolvePitch）。
   ★ カーソルの大きさはミート力と打ちかたで決まる。強振は小さく、ミート重視は大きい。
   ════════════════════════════════════════════════════════════ */

/* 球のいまの位置（ゾーンを 0〜1 とした座標）。u は進み具合。 */
function livePitchPos(T, u) {
  const zc = ((T.zone % 3) + .5) / 3;
  const zr = (((T.zone / 3) | 0) + .5) / 3;
  /* 変化は手元ほど大きく出る（uの2乗）。早く決めると騙される。 */
  const b = T.move * 0.16 * (u * u);
  return { x: zc + T.bx * b, y: zr + T.by * b };
}
/* リアルタイム打撃の絵（球・ミートカーソル・進み具合） */
function drawLiveBat(w, h, zx, zy, zw, zh) {
  const T = M.tm; if (!T) return;
  const u = clamp(T.t / T.dur, 0, 1.4);
  const P = livePitchPos(T, Math.min(u, 1.2));
  const px = zx + zw * P.x, py = zy + zh * P.y;
  const mx0 = w / 2, my0 = h * 0.430;
  /* マウンド→ホームの途中を補間（奇数乗で手元で伸びて見える） */
  const bx = mx0 + (px - mx0) * u;
  const by = my0 + (py - my0) * (u * u * 0.55 + u * 0.45);
  const br = Math.max(3, h * (0.007 + 0.030 * Math.min(u, 1.1)));
  /* ══ ★★ 2026-09-06 ミートカーソルを<b>バットの形</b>に（ご指定）══
     ・マルだと「どこで当てるか」が上下左右おなじに見えてしまう。
       バットは<b>横に長い</b>ので、左右のズレには強く、上下のズレには弱い——
       という<b>本当の野球の手ざわり</b>がそのまま絵になる。
     ・当たる範囲は<b>だ円</b>（横 mr×1.75 ／ 縦 mr×0.72）。判定（mdLiveSwing）も同じ式。
     ・向きは<b>打席の左右</b>で変える。右打はバットが右上から、左打は左上から出る。
     ★ 絵と判定がずれると「当たったのに当たらない」になるので、
       角度も半径も<b>T に入れた1組の値</b>だけを使うこと。 */
  if (T.mine) {
    const cxp = zx + zw * T.cx, cyp = zy + zh * T.cy;
    const rx = zw * T.mr * 1.75, ry = zw * T.mr * 0.72;
    const ang = T.leftBat ? -0.30 : 0.30;          /* バットの傾き（左打は逆向き） */
    const col = T.swung ? "#ffd257" : (T.plat > 0 ? "#8cffc8" : "#ff9d6b");
    cx.save();
    cx.translate(cxp, cyp); cx.rotate(ang);
    /* 当たる範囲（だ円） */
    cx.globalAlpha = .16; cx.fillStyle = col;
    cx.beginPath(); cx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); cx.fill();
    cx.globalAlpha = 1; cx.strokeStyle = col; cx.lineWidth = 2.4;
    cx.beginPath(); cx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); cx.stroke();
    /* バット本体（グリップ → 芯）。左打は左側から出す */
    const dir = T.leftBat ? -1 : 1;
    const gx = dir * rx * 1.62, tx2 = -dir * rx * 0.98;
    cx.lineCap = "round";
    cx.strokeStyle = "#3a2a18"; cx.lineWidth = Math.max(3, ry * 0.42);
    cx.beginPath(); cx.moveTo(gx, 0); cx.lineTo(dir * rx * 0.55, 0); cx.stroke();
    cx.strokeStyle = "#c89b5a"; cx.lineWidth = Math.max(5, ry * 0.95);
    cx.beginPath(); cx.moveTo(dir * rx * 0.62, 0); cx.lineTo(tx2, 0); cx.stroke();
    cx.strokeStyle = "#efd7a8"; cx.lineWidth = Math.max(2, ry * 0.34);
    cx.beginPath(); cx.moveTo(dir * rx * 0.35, -ry * 0.18); cx.lineTo(tx2 + dir * rx * 0.1, -ry * 0.18); cx.stroke();
    /* 芯（いちばん飛ぶところ） */
    cx.fillStyle = T.swung ? "#fff" : col;
    cx.beginPath(); cx.arc(0, 0, Math.max(2.4, ry * 0.30), 0, Math.PI * 2); cx.fill();
    cx.restore();
  }
  /* 球 */
  cx.globalAlpha = .30; cx.strokeStyle = "#ffffff"; cx.lineWidth = 2;
  cx.beginPath(); cx.moveTo(mx0, my0); cx.lineTo(bx, by); cx.stroke();
  cx.globalAlpha = 1;
  cx.fillStyle = "#ffffff";
  cx.beginPath(); cx.arc(bx, by, br, 0, Math.PI * 2); cx.fill();
  cx.strokeStyle = "#e2464f"; cx.lineWidth = Math.max(1, br * 0.22);
  cx.beginPath(); cx.arc(bx, by, br * 0.62, Math.PI * .2, Math.PI * 1.1); cx.stroke();
  /* 振った瞬間のひらめき */
  if (T.flash > 0) {
    cx.save();
    cx.globalAlpha = clamp(T.flash / 12, 0, 1);
    cx.strokeStyle = "#ffd257"; cx.lineWidth = 4;
    cx.beginPath(); cx.arc(T.fx, T.fy, zw * (0.10 + 0.20 * (1 - T.flash / 12)), 0, Math.PI * 2); cx.stroke();
    cx.restore();
  }
  /* あとどれくらいで届くかの目安（打つ側だけ） */
  if (T.mine) {
    const gy = h * 0.578, gx = zx - zw * 0.18, gw = zw * 1.36;
    cx.fillStyle = "rgba(255,255,255,.14)"; cx.fillRect(gx, gy, gw, 4);
    cx.fillStyle = (u >= 0.93 && u <= 1.07) ? "#ffd257" : "#8cffc8";
    cx.fillRect(gx, gy, gw * clamp(u, 0, 1), 4);
    /* 打ちごろの印 */
    cx.fillStyle = "rgba(255,210,87,.85)";
    cx.fillRect(gx + gw * 0.93 - 1, gy - 4, Math.max(2, gw * 0.14), 12);
  }
}

/* キャンバスへの指の入力（ミートカーソル）。受け口は<b>1本だけ</b>。 */
let _batInputHooked = false;
function hookBatInput() {
  if (_batInputHooked || !cv) return;
  _batInputHooked = true;
  const live = () => (M && M.phase === "timing" && M.tm && M.tm.mine && !M.tm.swung && !M.tm.done);
  const put = (ev) => {
    const T = M.tm, z = M.zrect;
    if (!T || !z) return;
    const r = cv.getBoundingClientRect();
    const x = (ev.clientX - r.left - z.x) / z.w;
    const y = (ev.clientY - r.top - z.y) / z.h;
    /* ゾーンの少し外までは出せる（ボール球を追いかけられる） */
    T.cx = clamp(x, -0.35, 1.35);
    T.cy = clamp(y, -0.35, 1.35);
  };
  cv.addEventListener("pointerdown", (ev) => {
    if (!live()) return;
    ev.preventDefault();
    try { cv.setPointerCapture(ev.pointerId); } catch (e) {}
    M.tm.holding = true; put(ev);
  });
  cv.addEventListener("pointermove", (ev) => { if (live() && M.tm.holding) { ev.preventDefault(); put(ev); } });
  const up = (ev) => {
    if (!live() || !M.tm.holding) return;
    ev.preventDefault();
    M.tm.holding = false;
    mdLiveSwing();
  };
  cv.addEventListener("pointerup", up);
  cv.addEventListener("pointercancel", (ev) => { if (M && M.tm) M.tm.holding = false; });
  cv.style.touchAction = "none";
}

/* 振る（指を離した瞬間 または SWING ボタン） */
function mdLiveSwing() {
  const T = M.tm;
  if (!T || T.swung || T.done) return;
  T.swung = true;
  T.swingU = T.t / T.dur;
  const P = livePitchPos(T, Math.min(T.swingU, 1.2));
  T.fx = M.zrect.x + M.zrect.w * P.x;
  T.fy = M.zrect.y + M.zrect.h * P.y;
  T.flash = 12;
  SFX.tap();
  /* ズレを測る ── ①タイミング ②ミート位置 */
  const dt = Math.abs(T.swingU - 1) * T.dur;          /* フレームでのだけ */
  let q = "MISS";
  if (dt <= T.perfF) q = "PERFECT";
  else if (dt <= T.goodF) q = "GREAT";
  else if (dt <= T.goodF * 2) q = "GOOD";
  M.timing = q;
  /* ★★ 2026-09-06 バット（だ円）に合わせて測る。
     絵と同じ角度に回してから、横 1.75・縦 0.72 で割る＝<b>だ円の内なら 1 未満</b>。
     ★ 絵（drawLiveBat）と<b>同じ数字</b>を使うこと。片方だけ直すと当たらなくなる。 */
  const _a = T.leftBat ? 0.30 : -0.30;                /* 絵の逆に回して、だ円を軸にそろえる */
  const _dx = P.x - T.cx, _dy = P.y - T.cy;
  const _rx = Math.cos(_a) * _dx - Math.sin(_a) * _dy;
  const _ry = Math.sin(_a) * _dx + Math.cos(_a) * _dy;
  const dist = Math.hypot(_rx / 1.75, _ry / 0.72);
  M.meetRead = clamp(1 - dist / Math.max(0.02, T.mr * 2.1), 0, 1);
  /* カーソルが乗っているマスを、これまでの「読み」としても揃えておく */
  const cc = clamp(Math.floor(T.cx * 3), 0, 2), cr2 = clamp(Math.floor(T.cy * 3), 0, 2);
  if (M.bsel) M.bsel.zone = cr2 * 3 + cc;
  bigMsg(q, 620);
  finishLive("swing");
}
window.mdLiveSwing = mdLiveSwing;

/* 見送る（さわないまま球が通りすぎた） */
function finishLive(act) {
  const T = M.tm; if (!T || T.done) return;
  T.done = true;
  if (T.raf) cancelAnimationFrame(T.raf);
  setTimeout(() => resolvePitch(act), act === "swing" ? 240 : 120);
}

/* 毎フレーム、球を進める */
function tickLive() {
  const T = M.tm;
  if (!T || T.done) return;
  T.raf = requestAnimationFrame(tickLive);
  if (T.flash > 0) T.flash--;
  if (T.swung) return;                 /* 振ったあとは進めない（結果待ち） */
  /* ★★ 2026-09-03 進み具合は<b>実時間</b>で測る。
     T.t++ だと 120Hz の端末では球が<b>2倍速く届いてしまう</b>し、
     タブを隠すと rAF が止まって球がとまる。
     dur は「60fps で何フレーム相当か」のままにしてある。 */
  if (T.t0 == null) T.t0 = performance.now();
  T.t = (performance.now() - T.t0) / 16.6667;
  /* ★★ 2026-09-06 守備側（mine:false）もここを通るようになった。
     そのときは<b>相手が振ったかどうか（T.act）</b>で結果へ渡す。
     "take" 固定のままだと、CPU が振っても必ず見送り扱いになってしまう。 */
  if (T.t > T.dur * 1.22) {
    if (T.mine) { M.timing = null; finishLive("take"); }
    else { M.timing = (T.act === "swing") ? "GOOD" : null; finishLive(T.act || "take"); }
  }
}
/* いま「打席の絵」を出す場面か */
function inBatView() {
  return !!(M && (M.phase === "pitch" || M.phase === "swing" || M.phase === "timing"));
}
/* 打席の絵（キャッチャーのうしろから） */
function drawBatView(w, h) {
  const st = (M && M.stadium) || MD2DATA.STADIUMS[0];
  const HZ = h * 0.30;                       /* 地平線 */
  /* ── 空 ── */
  let g = cx.createLinearGradient(0, 0, 0, HZ);
  g.addColorStop(0, st.sky[0]); g.addColorStop(1, st.sky[1]);
  cx.fillStyle = g; cx.fillRect(0, 0, w, HZ);
  /* ── スタンド（観客） ── */
  cx.fillStyle = "rgba(255,255,255,.06)";
  cx.fillRect(0, HZ - h * 0.13, w, h * 0.13);
  cx.globalAlpha = .5;
  for (let i = 0; i < 90; i++) {
    const px = (i * 97 % 1000) / 1000 * w;
    const py = HZ - h * 0.13 + ((i * 53) % 100) / 100 * h * 0.12;
    cx.fillStyle = ["#ffd257", "#7cc4ff", "#ff8ab5", "#8affc4", "#ffffff"][i % 5];
    cx.fillRect(px, py, 2.4, 2.4);
  }
  cx.globalAlpha = 1;
  /* ── 外野の芝（手前ほど広がる） ── */
  g = cx.createLinearGradient(0, HZ, 0, h);
  g.addColorStop(0, st.turf);
  g.addColorStop(1, "#0f4a2c");
  cx.fillStyle = g; cx.fillRect(0, HZ, w, h - HZ);
  /* 刈り込みのしま（消失点へ集まる線） */
  cx.save();
  cx.beginPath(); cx.rect(0, HZ, w, h - HZ); cx.clip();
  cx.globalAlpha = .07; cx.fillStyle = "#ffffff";
  for (let i = -8; i <= 8; i++) {
    if (i % 2) continue;
    cx.beginPath();
    cx.moveTo(w / 2 + i * w * 0.03, HZ);
    cx.lineTo(w / 2 + (i + 1) * w * 0.03, HZ);
    cx.lineTo(w / 2 + (i + 1) * w * 0.34, h);
    cx.lineTo(w / 2 + i * w * 0.34, h);
    cx.closePath(); cx.fill();
  }
  cx.globalAlpha = 1;
  cx.restore();
  /* ── 内野の土（手前・ホームまわり） ── */
  cx.fillStyle = "#9a6b3f";
  cx.beginPath(); cx.ellipse(w / 2, h * 1.02, w * 0.62, h * 0.26, 0, 0, Math.PI * 2); cx.fill();
  /* ── マウンド ── */
  cx.fillStyle = "#a97545";
  cx.beginPath(); cx.ellipse(w / 2, h * 0.470, w * 0.115, h * 0.028, 0, 0, Math.PI * 2); cx.fill();
  cx.fillStyle = "rgba(255,255,255,.75)";
  cx.fillRect(w / 2 - w * 0.030, h * 0.466, w * 0.06, Math.max(2, h * 0.006));
  /* ── 打席の枠（バッターボックス） ── */
  cx.strokeStyle = "rgba(255,255,255,.55)"; cx.lineWidth = 2;
  [-1, 1].forEach((sx) => {
    cx.save();
    cx.translate(w / 2 + sx * w * 0.145, h * 0.905);
    cx.beginPath();
    cx.moveTo(-w * 0.075, -h * 0.030); cx.lineTo(w * 0.075, -h * 0.030);
    cx.lineTo(w * 0.098, h * 0.045); cx.lineTo(-w * 0.098, h * 0.045);
    cx.closePath(); cx.stroke();
    cx.restore();
  });
  /* ── ホームベース ── */
  cx.fillStyle = "#ffffff";
  cx.beginPath();
  cx.moveTo(w / 2 - w * 0.048, h * 0.880);
  cx.lineTo(w / 2 + w * 0.048, h * 0.880);
  cx.lineTo(w / 2 + w * 0.038, h * 0.910);
  cx.lineTo(w / 2, h * 0.925);
  cx.lineTo(w / 2 - w * 0.038, h * 0.910);
  cx.closePath(); cx.fill();
  /* ── 捕手（手前・シルエット。打者より奥に描く） ── */
  cx.fillStyle = "rgba(8,10,22,.82)";
  cx.beginPath(); cx.ellipse(w / 2, h * 1.06, w * 0.115, h * 0.115, 0, 0, Math.PI * 2); cx.fill();
  cx.beginPath(); cx.arc(w / 2, h * 0.968, w * 0.036, 0, Math.PI * 2); cx.fill();
  /* ── 投手（キャラの絵） ── */
  /* ★★ 2026-09-03 正方形にしたぶん、大きさと位置を組み直した。
     縦長のときと同じ高さのままだと、幅が1.6倍になってゾーンにかぶさる。
     ★ 幅の狭い画面でもはみ出さないよう、w でも頭打ちにする。 */
  const pitS = mp(pitcherId(), !offMine());
  if (pitS) drawStand(cx, pitS.th, w / 2, h * 0.470, Math.min(h * 0.165, w * 0.21), false);
  /* ── 打者（キャラの絵）──
     ★★ 2026-09-06 ご指定「バッターの画像の位置も右左に合わせて」。
       右打ちは<b>捕手から見て左</b>（画面の左）、左打ちは<b>画面の右</b>の打席に立つ。
       ★ 立つ側の決めかたは打席の判定（askTiming の leftBat）と<b>同じ式</b>にすること。 */
  const batS = mp(batterId(), offMine());
  const pitS2 = mp(pitcherId(), !offMine());
  const _bats = (batS && batS.bats) || "右打";
  const _thr = (pitS2 && pitS2.throws) || "右投";
  const _leftBox = (_bats === "左打") || (_bats === "両打" && _thr === "右投");
  const _bx = w / 2 + (_leftBox ? 1 : -1) * w * 0.300;
  if (batS) drawStand(cx, batS.th, _bx, h * 0.960, Math.min(h * 0.225, w * 0.27), _leftBox);
  /* ── ストライクゾーン（3×3） ── */
  /* ★★ 2026-09-03 ゾーンは<b>操作の中心</b>になったので少し大きくする。 */
  const zx = w / 2 - w * 0.145, zy = h * 0.600, zw = w * 0.29, zh = h * 0.235;
  /* ★★ 2026-09-03 リアルタイム打撃の入力はこの枠の中で測るので、
     描いた位置を覚えておく（画面の大きさは変わるので毎フレーム）。 */
  M.zrect = { x: zx, y: zy, w: zw, h: zh, mx: w / 2, my: h * 0.430 };
  /* 守備側（自分が投げる）はえらんだコースを光らせる。
     ★★ 2026-09-03 攻撃側は<b>何も光らせない</b>（コースは飛んでくる球を見て判断する）。 */
  const selZ = offMine() ? -1 : (M.sel && M.sel.zone);
  cx.lineWidth = 1.4;
  for (let i = 0; i < 9; i++) {
    const c0 = i % 3, r0 = (i / 3) | 0;
    const x0 = zx + zw / 3 * c0, y0 = zy + zh / 3 * r0;
    if (i === selZ) {
      cx.fillStyle = "rgba(255,210,87,.30)";
      cx.fillRect(x0, y0, zw / 3, zh / 3);
      cx.strokeStyle = "#ffd257"; cx.lineWidth = 2.4;
    } else {
      cx.strokeStyle = "rgba(255,255,255,.42)"; cx.lineWidth = 1.4;
    }
    cx.strokeRect(x0, y0, zw / 3, zh / 3);
  }
  /* ── ボール（タイミングのあいだ、マウンド → ホームへ近づく） ── */
  if (M.phase === "timing" && M.tm) drawLiveBat(w, h, zx, zy, zw, zh);
  /* ── 打者・投手の名札 ── */
  cx.font = "800 12px system-ui"; cx.textAlign = "left";
  const tag = (txt, x0, y0, col) => {
    const pad = 6, tw = cx.measureText(txt).width + pad * 2;
    cx.fillStyle = "rgba(8,10,22,.72)";
    cx.beginPath(); cx.roundRect ? cx.roundRect(x0, y0 - 13, tw, 18, 9) : cx.rect(x0, y0 - 13, tw, 18);
    cx.fill();
    cx.fillStyle = col; cx.fillText(txt, x0 + pad, y0);
  };
  if (pitS) tag("P  " + pitS.nm, w * 0.5 + w * 0.075, h * 0.405, "#7cc4ff");
  if (batS) tag("B  " + batS.nm, _bx - w * 0.015 - (_leftBox ? w * 0.10 : 0), h * 0.612, "#ffd257");
}
function draw() {
  resizeCanvas();                       /* ★ 大きさが変わっていたら合わせ直してから描く */
  const w = cv.clientWidth, h = cv.clientHeight;
  cx.setTransform(Math.min(2, window.devicePixelRatio || 1), 0, 0, Math.min(2, window.devicePixelRatio || 1), 0, 0);
  cx.clearRect(0, 0, w + 2, h + 2);     /* ★ 端まで確実に消す（1px 残ると前のフレームが見える） */
  /* ★★ 2026-09-01 投球・読み合い・タイミングのあいだは<b>打席の絵</b>（3D風）にする（ご指定）。
     打球が飛んだら（phase が "ball" 以降）これまでの真上からの盤面にもどる。 */
  if (inBatView()) { drawBatView(w, h); return; }
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
  /* 走者（★★ 2026-09-01 こちらもキャラクターの絵） */
  if (M) M.runners.forEach((id, i) => {
    if (!id) return;
    const b = BASES[i];
    const rp = mp(id, offMine());
    drawFace(cx, rp && rp.th, X(b.x), Y(b.y) - bs * 1.6, Math.max(6, U(.024)), "#ffd257");
  });
  /* 野手（★★ 2026-09-01 丸ではなく<b>キャラクターの絵</b>で描く。ご指定） */
  FLD.forEach((f) => {
    const r = Math.max(7, U(.028));
    drawFace(cx, f.th, X(f.x), Y(f.y), r, f.c || "#eaf0ff");
    cx.fillStyle = "rgba(255,255,255,.92)"; cx.font = "800 9px system-ui"; cx.textAlign = "center";
    cx.strokeStyle = "rgba(0,0,0,.75)"; cx.lineWidth = 2.4;
    cx.strokeText(f.lb || "", X(f.x), Y(f.y) + r + 9);
    cx.fillText(f.lb || "", X(f.x), Y(f.y) + r + 9);
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
  /* ★★ 2026-09-06 守備配置。<b>自分が守っているときだけ</b>自分の指示を使う。
     CPU が守るときは「走者と打者に合わせた素直な配置」を自動でえらぶ。 */
  const shK = mine ? shiftKey() : cpuShift();
  const OFF = (SHIFTS[shK] || SHIFTS.normal).off || {};
  const spOf = (ps) => {
    const b = FPOS[ps], o = OFF[ps];
    return o ? { x: clamp(b.x + o[0], .06, .94), y: clamp(b.y + o[1], .12, .96) } : b;
  };
  M.shiftNow = shK;
  POS9.forEach((ps) => {
    if (ps === "投手" || ps === "捕手") return;
    const id = Object.keys(t.pos).find((k) => t.pos[k] === ps);
    const p = id ? mp(id, mine) : null;
    const sp = spOf(ps);
    FLD.push({ id: id, ps: ps, x: sp.x, y: sp.y, hx: sp.x, hy: sp.y, tx: null, ty: null,
      /* ★ 実測して広げた。せまいと打球がほとんど抜けてしまい、点が入りすぎる。 */
      sp: 0.008 + (p ? p.run / 100 : .5) * 0.013, reach: 0.055 + (p ? p.field / 100 : .5) * 0.065,
      /* ★★ 2026-09-01 駒はキャラクターの絵で描くので、サムネイルも持たせる（ご指定） */
      th: p ? p.th : "", c: "#eaf0ff", lb: ps[0] });
  });
  /* 投手・捕手も置く（送球先として使う） */
  const pp = mp(pitcherId(), mine);
  FLD.push({ id: pitcherId(), ps: "投手", x: FPOS["投手"].x, y: FPOS["投手"].y, hx: FPOS["投手"].x, hy: FPOS["投手"].y, tx: null, ty: null, sp: .009, reach: .05, th: pp ? pp.th : "", c: "#8fd0ff", lb: "P" });
  const cid = Object.keys(t.pos).find((k) => t.pos[k] === "捕手");
  const cp = cid ? mp(cid, mine) : null;
  FLD.push({ id: cid, ps: "捕手", x: FPOS["捕手"].x, y: FPOS["捕手"].y, hx: FPOS["捕手"].x, hy: FPOS["捕手"].y, tx: null, ty: null, sp: .008, reach: .05, th: cp ? cp.th : "", c: "#ffd257", lb: "C" });
}
/* CPU が守るときの配置。走者と点差から素直にえらぶ。 */
function cpuShift() {
  if (M.runners[2] && M.out < 2) return "in";           /* 三塁に走者＝前進で本塁を守る */
  if (M.runners[0] && M.out < 2) return "dp";           /* 一塁に走者＝ゲッツーねらい */
  const lead = (M.top ? M.score.cpu - M.score.me : M.score.me - M.score.cpu);
  if (M.inn >= cfg.inn && lead > 0) return "deep";      /* 逃げ切りたい終盤は深め */
  return "normal";
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
  M.timing = null; M.meetRead = null; M.boost = null;
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
    ${shiftRowHTML()}
    <div class="row" style="margin-top:9px"><button class="btn pri" style="flex:1" onclick="mdThrow()">投球開始</button></div>`;
  M.sel = { pitch: pit.pitches[0].k, zone: 4 };
}
/* ★★ 2026-09-06 1球ごとの実測球速。<b>投げるたびに必ずここを通す</b>。
   素の球速（velOf）＝その投手の平均。実際の1球は
     ・そのときのスタミナ（減るほど落ちる）
     ・毎球のばらつき（±3km/h）
   でぶれる。表示も、届くまでの速さ（dur）も、この<b>同じ値</b>から作る。 */
function measurePitch(pit, q, stam) {
  const d = MD2DATA.PITCH_ALL.find((x) => x.k === q.k) || { nm: "ストレート", move: 0 };
  const kmh = Math.max(95, Math.round(velOf(pit, q) - (100 - clamp(stam, 0, 100)) * 0.06
                                      + (Math.random() * 2 - 1) * 3));
  M.lastPitch = { nm: d.nm, kmh: kmh, k: q.k, t: Date.now() };
  paintMatchHead();
  /* ★★ 2026-09-06 ご報告「次の投球まで出ていて分かりづらい」。
     <b>2.6秒で消す</b>。前の球のタイマーは必ず止める（消し忘れると新しい球まで消える）。 */
  if (M._kmhT) clearTimeout(M._kmhT);
  M._kmhT = setTimeout(() => {
    if (!M) return;
    M.lastPitch = null; M._kmhT = null;
    try { paintMatchHead(); } catch (e) {}
  }, 2600);
  return kmh;
}
/* ★★ 2026-09-06 いちばん最近の1球の球速（画面に大きく出す） */
function lastKmhHTML() {
  const L = M && M.lastPitch;
  if (!L) return "";
  return `<div class="kmh"><b>${L.kmh}</b><small>km/h</small><span>${esc(L.nm)}</span></div>`;
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
    /* ★★ 2026-09-03 リアルタイム打撃（ご指定）。
       「3×3 のコースをえらぶ」のはやめ、<b>飛んでくる球を見てカーソルを合わせる</b>。
       ここでは<b>打ちかただけ</b>をえらんで、「構える」で投球が始まる。 */
    $("mtBot").innerHTML = `
      ${clutchBar()}
      <div class="hint">🏏 <b>${esc(bat.nm)}</b> の打席 — 打ちかたをえらんで<b>構える</b><br>
        <span style="color:var(--tx3)">ミート${bat.meet} パワー${bat.power} 走力${bat.run} ／ 弾道${"★".repeat(bat.traj)}</span></div>
      <div class="cardsel p3">
        <button class="psel on" data-s="meet" onclick="mdSwingType('meet')">ミート重視<small>焦点が広い</small></button>
        <button class="psel" data-s="power" onclick="mdSwingType('power')">強振<small>焦点は狭いが飛ぶ</small></button>
        <button class="psel" data-s="bunt" onclick="mdSwingType('bunt')">バント<small>送る</small></button>
      </div>
      ${tacticRowHTML()}
      <div class="hint" style="margin-top:8px;color:var(--tx3)">
        画面を<b>なぞってバットを合わせ</b>、<b>指を離した瞬間に振ります</b>。振らなければ見送りです。</div>
      <div class="row" style="margin-top:9px">
        <button class="btn pri" style="flex:1" onclick="mdReady()">構える</button>
      </div>`;
    M.bsel = { zone: 4, type: "meet" };
  } else {
    /* 自分は守備。CPU（またはオンラインの相手）が読む */
    /* ★ ここでも1球ごとに球速を測る（この道は askTiming を通らないため） */
    const _q = (pit.pitches || []).find((x) => x.k === (M.sel && M.sel.pitch)) || (pit.pitches || [{ k: "straight", lv: 1 }])[0];
    const _kmh = measurePitch(pit, _q, M.stam.me);
    const guess = cpuGuess(bat, M.sel);
    M.bsel = guess;
    /* ★★ 2026-09-06 ご指定「守備側も球を投げたときラインの演出を出す」。
       前は 420ms 待って結果だけ出していたので、<b>投げた実感がまったく無かった</b>。
       打つときと同じ道具（M.tm ＋ tickLive ＋ drawLiveBat）を使い、
       <b>カーソルだけ出さない</b>（mine:false）ことで、球の軌跡だけを見せる。 */
    watchPitch(pit, _q, _kmh, guess.act);
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
/* ★★ 2026-09-03 「構える」→ 投球が始まり、リアルタイムで振る。
   バントだけはこれまでどおり即決（焦点を合わせる操作がないため）。 */
window.mdReady = () => {
  if (!M.bsel) M.bsel = { zone: 4, type: "meet" };
  /* ★ 作戦は「投げる前」に効くものと「結果と一緒」に効くものがある。
     ・盗塁 … 投球の前に走る（結果を待たない）
     ・スクイズ … バントに固定する
     ・待球 … 見送りに固定する
     ・エンドラン … 結果のところ（resolvePitch）で精算する */
  if (M.tactic === "steal") { trySteal(); paintMatchHead(); if (M.out >= 3) return; }
  if (M.tactic === "squeeze") M.bsel.type = "bunt";
  if (M.tactic === "wait") { M.tactic = ""; M.timing = null; M.meetRead = null; resolvePitch("take"); return; }
  if (M.bsel.type === "bunt") { M.timing = "GOOD"; resolvePitch("swing"); return; }
  SFX.pitch();
  askTiming("swing");
};
/* 古い呼びかたも残しておく（オンラインの古い画面から呼ばれても落ちないように） */
window.mdSwing = (act) => {
  if (act === "swing" && M.bsel && M.bsel.type !== "bunt") { askTiming(act); return; }
  resolvePitch(act);
};
/* ③ ★★ 2026-09-03 <b>リアルタイム打撃</b>（ご指定）。
   球が飛んでくるあいだに焦点を合わせ、指を離して振る。
   ★ 届くまでの長さ（dur）は<b>本当の球速</b>から作るので、
     速い投手ほど判断の時間が短い。
   ★ カーソルの大きさ（mr）はミート力と打ちかたで決まる。 */
function askTiming(act) {
  M.phase = "timing";
  const bat = mp(batterId(), offMine());
  const pit = mp(pitcherId(), !offMine());
  const pitSel = (offMine() ? M.cpuPitch : M.sel) || safePitchSel(pit);
  const q = (pit.pitches || []).find((x) => x.k === pitSel.pitch) || { k: "straight", lv: 1 };
  const d = MD2DATA.PITCH_ALL.find((x) => x.k === q.k) || { move: 0 };
  /* ══ ★★ 2026-09-06 球速は<b>1球ごとに測る</b>（ご指定）══
     素の球速（velOf）は「その投手の平均」。実際の1球は
       ・そのときのスタミナ（減るほど落ちる）
       ・球種（変化球は遅い＝velOf にすでに入っている）
       ・毎球のばらつき（±3km/h）
     で決まる。表示している数字と<b>実際に届くまでの速さ（dur）は同じ値</b>から作る。 */
  const kmh = measurePitch(pit, q, (!offMine() ? M.stam.me : M.stam.cpu));
  /* 届くまでのフレーム数。140km/h でおよそ 62フレーム（約1秒）。 */
  const dur = clamp(Math.round(9000 / Math.max(90, kmh)), 38, 100);
  /* ミートが高いほど、ずれを許す幅が広い */
  const goodF = 4 + bat.meet * 0.055;
  const perfF = 1.4 + bat.meet * 0.020;
  const type = (M.bsel && M.bsel.type) || "meet";
  /* ══ ★★ 2026-09-06 左右の相性（ご指定）══
     打者と投手の手が<b>逆</b>なら球筋が見やすい（バットが長くなる）、
     <b>同じ</b>なら見づらい（短くなる）。両打はいつでも逆に立てるので、つねに有利。
     ★ ここは<b>倍率1か所</b>にしてある。強さをいじるときはこの数字だけ動かすこと。 */
  const bats = bat.bats || "右打", thr = pit.throws || "右投";
  const plat = (bats === "両打") ? 1 : (((bats === "左打") === (thr === "左投")) ? -1 : 1);
  const platMul = plat > 0 ? 1.14 : 0.88;
  /* 焦点（ゾーンの幅を 1 とした半径） */
  const mr = clamp(((type === "power" ? 0.115 : 0.165) + bat.meet * 0.00085) * platMul, 0.08, 0.32);
  $("mtBot").innerHTML = `
    ${clutchBar()}
    <div class="hint">⏱ <b>${d.nm}・${kmh}km/h</b> — 画面を<b>なぞってバットを合わせ</b>、
      <b>指を離して振る</b>！<br>
      <span style="color:${plat > 0 ? "#8cffc8" : "#ff9d6b"}">${esc(bats)} × ${esc(thr)} ${plat > 0 ? "（相性◎ バットが長い）" : "（相性△ バットが短い）"}</span>
      <span style="color:var(--tx3)">／ 振らなければ見送り</span></div>
    <div class="row" style="margin-top:9px">
      <button class="btn pri" style="flex:1" onclick="mdLiveSwing()">SWING</button>
      <button class="btn" onclick="mdLiveTake()">見送る</button>
    </div>`;
  M.tm = {
    t: 0, dur, act, done: false, swung: false, holding: false, flash: 0,
    mine: true, zone: pitSel.zone, move: d.move,
    /* 変化の向き（球種でだいたい決まるが、少しだけゆらす） */
    bx: (d.k === "curve" ? -0.8 : d.k === "slider" ? -1 : d.k === "sinker" ? 1 : 0) + (Math.random() - .5) * .4,
    by: (d.k === "fork" ? 1 : d.k === "curve" ? 1 : d.k === "change" ? .6 : 0) + (Math.random() - .5) * .3,
    cx: 0.5, cy: 0.5, mr, goodF, perfF,
    /* ★ 2026-09-06 バットの向きと相性（絵と判定の両方がこれを見る） */
    leftBat: (bats === "左打") || (bats === "両打" && thr === "右投"),
    plat, bats, thr, kmh,
  };
  M.meetRead = null;
  tickLive();
}
/* 見送る（ボタン） */
window.mdLiveTake = () => { M.timing = null; finishLive("take"); };

/* ★★ 2026-09-06 守備側の「投げる演出」。
   打席のしくみをそのまま借りて、<b>ミートカーソルだけ出さない</b>。
   ★ 進みかた（dur）は打席とまったく同じ式にする。ここがずれると、
     自分が投げたときだけ球が速く／遅く見えて気持ちが悪い。 */
function watchPitch(pit, q, kmh, act) {
  const d = MD2DATA.PITCH_ALL.find((x) => x.k === q.k) || { move: 0 };
  const pitSel = M.sel || safePitchSel(pit);
  M.phase = "timing";
  $("mtBot").innerHTML = `
    ${clutchBar()}
    <div class="hint">🥎 <b>${esc(d.nm)}・${kmh}km/h</b> — 投げました！</div>`;
  M.tm = {
    t: 0, dur: clamp(Math.round(9000 / Math.max(90, kmh)), 38, 100),
    act: act, done: false, swung: false, holding: false, flash: 0,
    mine: false, zone: pitSel.zone, move: d.move,
    bx: (d.k === "curve" ? -0.8 : d.k === "slider" ? -1 : d.k === "sinker" ? 1 : 0) + (Math.random() - .5) * .4,
    by: (d.k === "fork" ? 1 : d.k === "curve" ? 1 : d.k === "change" ? .6 : 0) + (Math.random() - .5) * .3,
    cx: 0.5, cy: 0.5, mr: 0.14, goodF: 4, perfF: 1.4, kmh: kmh,
  };
  M.meetRead = null;
  tickLive();
}

/* ══════════ ★★ 2026-09-06 作戦コマンド（旧版から移植）══════════
   ・攻撃 … 盗塁／エンドラン／スクイズ／待球
   ・守備 … 守備配置（SHIFTS）
   ★ 作戦は<b>その1球かぎり</b>。投球の結果と一緒に精算して必ず消す（M.tactic）。
     消し忘れると次の打席にも効いてしまう（旧版で実際にあった不具合）。 */
const TACTICS = {
  steal:  { nm: "盗塁", ic: "🏃", desc: "走者が次の塁をねらう（走力 × 捕手の肩）",
            ok: () => (M.runners[0] || M.runners[1]) && M.out < 3 },
  hitrun: { nm: "エンドラン", ic: "⚡", desc: "走者はスタート。ゴロなら余分に進めるが、三振だと刺される",
            ok: () => M.runners[0] && M.out < 2 },
  squeeze:{ nm: "スクイズ", ic: "🎯", desc: "三塁走者が本塁へ。バントで送る（失敗するとアウト）",
            ok: () => M.runners[2] && M.out < 2 },
  wait:   { nm: "待球", ic: "🕒", desc: "この球は見送る。四球をねらい、相手のスタミナを削る",
            ok: () => true },
};
function tacticRowHTML() {
  const list = Object.keys(TACTICS).filter((k) => { try { return TACTICS[k].ok(); } catch (e) { return false; } });
  if (!list.length) return "";
  const cur = M.tactic || "";
  return `<div class="tact">
    <span class="lb">作戦</span>
    ${list.map((k) => `<button class="${cur === k ? "on" : ""}" onclick="mdTactic('${k}')"
      title="${esc(TACTICS[k].desc)}"><i>${TACTICS[k].ic}</i>${TACTICS[k].nm}</button>`).join("")}
    ${cur ? `<button class="cl" onclick="mdTactic('')">やめる</button>` : ""}
  </div>${cur ? `<div class="hint" style="color:var(--tx3);margin-top:4px">${esc(TACTICS[cur].desc)}</div>` : ""}`;
}
window.mdTactic = (k) => {
  M.tactic = (M.tactic === k || !k) ? "" : k;
  SFX.tap();
  if (M.phase === "swing") askSwing();
};
/* 守備配置をえらぶ列（守っているときだけ出す） */
function shiftRowHTML() {
  const cur = shiftKey();
  return `<div class="tact">
    <span class="lb">守備</span>
    ${Object.keys(SHIFTS).map((k) => `<button class="${cur === k ? "on" : ""}" onclick="mdShift('${k}')"
      title="${esc(SHIFTS[k].desc)}"><i>${SHIFTS[k].ic}</i>${SHIFTS[k].nm}</button>`).join("")}
  </div><div class="hint" style="color:var(--tx3);margin-top:4px">${esc(SHIFTS[cur].desc)}</div>`;
}

/* 盗塁の精算。★ 攻撃側・守備側どちらの走者でも同じ式を使う。 */
function trySteal() {
  const from = M.runners[0] ? 0 : (M.runners[1] ? 1 : -1);
  if (from < 0) return;
  const rid = M.runners[from];
  const r = mp(rid, offMine()) || { run: 60 };
  const t = defTeam();
  const cid = Object.keys(t.pos).find((k) => t.pos[k] === "捕手");
  const c = cid ? (mp(cid, !offMine()) || { arm: 60 }) : { arm: 60 };
  const pr = clamp(0.46 + (r.run - c.arm) / 150 + sk(r, "steal"), 0.10, 0.94);
  if (Math.random() < pr) {
    M.runners[from] = null; M.runners[from + 1] = rid;
    note("盗塁成功！"); SFX.safe(); addClutch(offMine() ? "me" : "cpu", 8);
  } else {
    M.runners[from] = null;
    note("盗塁失敗…"); SFX.out(); outMade(1);
  }
}
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
    M.tactic = "";
    return afterCount();
  }
  if (M.bsel.type === "bunt") return doBunt(bat, pit);
  /* 読みが当たったか */
  /* ★★ 2026-09-03 リアルタイム打撃では、「読み」の代わりに
     <b>焦点と球の距離</b>（M.meetRead）0〜1 を使う。
     CPU の打席はこれまでどおりコースの読みで決めるので、
     meetRead が無いときは旧来の式に落とす。 */
  let read;
  if (M.meetRead != null) {
    read = M.meetRead;
  } else {
    const readHit = M.bsel.zone === pitSel.zone;
    const near = Math.abs((M.bsel.zone % 3) - (pitSel.zone % 3)) + Math.abs(Math.floor(M.bsel.zone / 3) - Math.floor(pitSel.zone / 3));
    read = readHit ? 1 : near === 1 ? .58 : near === 2 ? .3 : .12;
  }
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
  if (M.ball >= 4) { M.ball = 0; M.strike = 0; note("フォアボール"); SFX.safe(); M.tactic = ""; return walk(); }
  if (M.strike >= 3) {
    M.strike = 0; M.ball = 0; note("三振！"); SFX.out();
    if (!offMine()) { M.stat.k++; bump("k", 1); }
    addClutch(offMine() ? "cpu" : "me", 12);
    /* ★ エンドランで走っていたら、三振と一緒に刺される（旧版と同じ） */
    let extra = 0;
    if (M.tactic === "hitrun" && M.runners[0]) { M.runners[0] = null; note("走者も刺された（ダブルプレー）"); extra = 1; }
    M.tactic = "";
    return outMade(1 + extra);
  }
  M.timing = null; M.meetRead = null;
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
  const squeeze = (M.tactic === "squeeze");
  /* ★ スクイズは「三塁走者が走り出したあと」なので、失敗すると走者が刺される（旧版と同じ） */
  const ok = Math.random() < (squeeze ? .50 : .55) + bat.meet / 400;
  if (!ok) {
    M.tactic = "";
    if (squeeze && M.runners[2]) {
      M.runners[2] = null;
      note("スクイズ失敗！ 三塁走者が刺された"); SFX.out();
      advanceBatter();
      return outMade(1);
    }
    M.strike++; note("バント失敗"); SFX.miss(); return afterCount();
  }
  note(squeeze ? "スクイズ成功！" : "バント成功");
  SFX.hit();
  /* 走者を1つずつ進めて打者はアウト */
  for (let i = 2; i >= 0; i--) {
    if (!M.runners[i]) continue;
    if (i === 2) { M.runners[2] = null; scoreRun(1); }
    else { M.runners[i + 1] = M.runners[i]; M.runners[i] = null; }
  }
  M.tactic = "";
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
    /* CPU の守備。★ 自分のときと<b>同じ式</b>で出す（強さの差は cfg.cpu のぶんだけ） */
    const res = catchChance(f, fly, quality, false);
    const q = rollCatch(clamp(res.p + (cfg.cpu - 2) * 0.05, 0.12, 0.985));
    return finishCatch(f, fly, bat, quality, q);
  }
  /* ══ ★★ 2026-09-06 ご指定により<b>ゲージをやめた</b>ここが要点 ══
     これまでは「白い線が真ん中に来た瞬間にタップ」＝<b>選手の守備力が結果に出ない</b>
     （反射神経のゲームになっていた）。
     いまは
       ① 選手の<b>捕球・守備</b>（と GUARDIAN/IRON WALL などのスキル）
       ② <b>守備配置</b>から打球までの<b>走った距離</b>（配置の指示がそのまま効く）
       ③ 打球の<b>強さ</b>（quality）とフライかゴロか
     の3つで成功率を出し、その率で判定する。
     ★ 出した数字は<b>画面に必ず見せる</b>（なぜ捕れた／こぼしたのかが分かるように）。 */
  const res = catchChance(f, fly, quality, true);
  $("mtBot").innerHTML = `
    <div class="hint">🧤 <b>${esc(res.nm)}</b>（${f.ps}）が追いついた！</div>
    <div class="calc">
      <span>守備力 <b>${res.skill}</b></span>
      <span>走った距離 <b>${res.travel}</b>m</span>
      <span>打球 <b>${res.hard}</b></span>
      <span class="big">成功率 <b>${Math.round(res.p * 100)}%</b></span>
    </div>
    <div class="hint" style="color:var(--tx3);margin-top:6px">守備配置：<b>${SHIFTS[M.shiftNow || "normal"].nm}</b> — ${SHIFTS[M.shiftNow || "normal"].desc}</div>`;
  const q = rollCatch(res.p);
  bigMsg(q, 640);
  if (q === "MISS") SFX.miss(); else SFX.catch2();
  M.tm = null;
  setTimeout(() => finishCatch(f, fly, bat, quality, q), 620);
}
/* 捕球の成功率。★ CPU と自分で<b>同じ式</b>を使う（片方だけ有利にしない）。 */
function catchChance(f, fly, quality, mine) {
  const p = mp(f.id, mine) || { catch: 60, field: 60, run: 60, nm: f.ps };
  /* ① 守備力（捕球6：守備4）＋ スキル */
  const skill = Math.round(p.catch * 0.6 + p.field * 0.4 + sk(p, "hands") * 60 + sk(p, "reach") * 40);
  /* ② 定位置から打球までの距離（盤面の 1.0 ＝ およそ 60m として m に直す） */
  const travelU = Math.hypot(f.hx - B.x, f.hy - B.y);
  const travel = Math.round(travelU * 60);
  const far = clamp((travelU - (f.reach || .08)) / 0.34, 0, 1);
  /* ③ 打球の強さ */
  const hard = quality > .82 ? "強烈" : quality > .58 ? "速い" : quality > .34 ? "ふつう" : "弱い";
  let pr = 0.60 + (skill - 60) / 130 - far * 0.55 - (quality - 0.5) * 0.24 + (fly ? 0.08 : 0);
  if (M.boost === "supercat" && mine) pr += 0.12;
  pr = clamp(pr, 0.12, 0.985);
  return { p: pr, skill, travel, hard, nm: p.nm || f.ps };
}
/* 成功率から結果を出す。うまくいったときは、どれくらいきれいに捕れたかも決める。 */
function rollCatch(pr) {
  if (Math.random() >= pr) return "MISS";
  const r = Math.random();
  return r < 0.22 + (pr - 0.5) * 0.4 ? "PERFECT" : r < 0.70 ? "GREAT" : "GOOD";
}
/* ★★ 2026-09-03 左右に往復する帯（捕球のタイミング）。
   打席のほうはリアルタイム打撃にしたので使わなくなったが、
   <b>守備の捕球</b>はこの式のままなのでここに残してある。 */
function tickTiming() {
  if (!M.tm || M.tm.done) return;
  M.tm.t += M.tm.dir * M.tm.sp;
  if (M.tm.t > 100) { M.tm.t = 100; M.tm.dir = -1; }
  if (M.tm.t < 0) { M.tm.t = 0; M.tm.dir = 1; }
  const c = $("tmCur"); if (c) c.style.left = M.tm.t + "%";
  M.tm.raf = requestAnimationFrame(tickTiming);
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
/* ★★ 2026-09-06 エンドラン。走者は投球と同時に走っているので、
   打球が前に飛んだら<b>もう1つ先まで</b>行ける。 */
function hitrunBonus() {
  if (M.tactic !== "hitrun") return;
  if (M.runners[1] && !M.runners[2]) { M.runners[2] = M.runners[1]; M.runners[1] = null; note("エンドラン！ 走者が三塁へ"); }
  else if (M.runners[0] && !M.runners[1]) { M.runners[1] = M.runners[0]; M.runners[0] = null; note("エンドラン！ 走者が二塁へ"); }
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
  hitrunBonus();
  M.tactic = "";
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
  /* ★★ 2026-09-06 confirm() は<b>この環境では出ない</b>ので、押しても何も起きなかった（ご報告）。
     MagiLex・MagiTier で踏んだのと同じ。<b>画面の中で聞く</b>形にする。 */
  $("slotBody").innerHTML = `
    <div style="font-size:13px;font-weight:900;margin-bottom:6px">試合を中断しますか？</div>
    <div style="font-size:11.5px;font-weight:700;color:var(--tx2);line-height:1.8;margin-bottom:12px">
      とちゅうでやめると<b>記録は残りません</b>（ミッションの数も増えません）。<br>
      同じ相手ともう一度はじめからやり直せます。</div>
    <div class="row">
      <button class="btn" style="flex:1" onclick="mdCloseSheet('sheetSlot')">つづける</button>
      <!-- ★ md2-ui.css の .btn.pri が !important で黄色にするので、
           打ち消せるよう<b>専用のクラス</b>にする（style 属性では勝てない） -->
      <button class="btn danger" style="flex:1" onclick="mdQuitMatchYes()">中断する</button>
    </div>`;
  openSheet("sheetSlot");
};
window.mdQuitMatchYes = () => {
  closeSheet("sheetSlot");
  if (M && M.tm && M.tm.raf) { try { cancelAnimationFrame(M.tm.raf); } catch (e) {} }
  $("mtWrap").classList.add("hide"); M = null; paint();
  toast("試合を中断しました");
};
function bump(k, n) { msnCheck(); S.day[k] = (S.day[k] | 0) + n; save(); }

/* ══════════ ★★ 2026-09-06 LOCAL PLAY（MagiBurst と同じ仕組み）══════════
   ../MagiBurst/js/local.js（BurstLocal）と ../MagiBurst/js/localplay.js（LocalPlay）を
   そのまま借りている。あちらが外から使うのは<b>この2つだけ</b>なので、ここで用意する。
     ・window.onProfile() … 自分の名札（相手の画面の PLAYER 01〜04 に出る）
     ・window.onStart()   … 全員そろって「ゲーム開始」を押したとき
   ★ ここを消すと、部屋は作れても<b>名前が出ない／始められない</b>。 */
window.onProfile = function () {
  const t = team();
  let nm = "";
  try { nm = (JSON.parse(localStorage.getItem("xeva_account_v1") || "{}").name) || ""; } catch (e) {}
  const ids = (t.order || []).slice(0, 2);
  return {
    name: nm || t.name || "Player",
    th: (MD2DATA.get(ids[0]) || {}).th || "img/icon192.png",
    power: teamPower(),
    chars: ids.map((id) => { const e = eff(id) || {}; return { id: id, nm: e.nm, lv: e.lv, ovr: e.ovrNow }; }),
  };
};
window.onStart = function () {
  /* ★ つながった相手との対戦は、<b>ホストの端末が試合を進める</b>。
     いまはまず「同じ部屋で同時に始める」ところまで。 */
  if (!teamOk()) { toast("チームが未完成です（9人＋先発投手）"); return; }
  matchMode = "local";
  startMatch("local", { local: true });
};

/* QR をカメラで読んで開いたとき（#mbjoin=コード）＝ MagiBurst と同じ受けかた */
(function mdJoinBoot() {
  try {
    const m = /#mbjoin=([^&]+)/.exec(location.hash || "");
    if (!m) return;
    const code = decodeURIComponent(m[1]);
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
    const go = () => {
      if (!window.LocalPlay) { setTimeout(go, 200); return; }
      try { LocalPlay.open("guest"); LocalPlay.joinURL(code); } catch (e) {}
    };
    setTimeout(go, 1200);
  } catch (e) {}
})();

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
      + '<a href="../index.html" style="color:#ffd257">← XEVARION へもどる</a></div>';
  });
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();

/* 外から使うもの */
window.MD2 = { get state() { return S; }, save, paint, go, team, eff, teamPlayers, teamEff, autoTeam };
})();
