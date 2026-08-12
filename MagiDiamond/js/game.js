/* ============================================================
   MagiDiamond — 読み合い野球盤（配球×狙い打ち 同時公開バトル）
   1台で2〜6人（チーム戦・役割分担）／オンライン2台／CPU対戦
   ============================================================ */
(function () {
"use strict";

/* ══════════ ユーティリティ ══════════ */
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const deep = (o) => JSON.parse(JSON.stringify(o));
let toastTimer = null;
function toast(msg, bg) {
  const t = $("toast"); t.textContent = msg;
  t.style.background = bg || "#22344d";
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
}

/* ══════════ 効果音（WebAudio 自作） ══════════ */
const SFX = (() => {
  let ac = null, on = true;
  function ctx() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (ac && ac.state === "suspended") ac.resume(); return ac; }
  function tone(f, dur, type, vol, delay) {
    const a = ctx(); if (!a || !on) return;
    const t0 = a.currentTime + (delay || 0);
    const o = a.createOscillator(), g = a.createGain();
    o.type = type || "sine"; o.frequency.setValueAtTime(f, t0);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol || 0.16, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  function noise(dur, vol, hp, delay) {
    const a = ctx(); if (!a || !on) return;
    const t0 = a.currentTime + (delay || 0);
    const len = Math.floor(a.sampleRate * dur);
    const buf = a.createBuffer(1, len, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = a.createBufferSource(); src.buffer = buf;
    const f = a.createBiquadFilter(); f.type = "highpass"; f.frequency.value = hp || 900;
    const g = a.createGain(); g.gain.value = vol || 0.2;
    src.connect(f).connect(g).connect(a.destination); src.start(t0);
  }
  return {
    setOn(v) { on = v; }, isOn: () => on,
    tap() { tone(660, 0.06, "triangle", 0.08); },
    pitch() { noise(0.22, 0.12, 2200); },
    crack() { noise(0.1, 0.4, 500); tone(190, 0.1, "square", 0.14); },
    catchB() { noise(0.06, 0.2, 1400); },
    miss() { noise(0.16, 0.1, 3000); },
    strike() { tone(520, 0.1, "square", 0.1); tone(392, 0.14, "square", 0.1, 0.1); },
    ball() { tone(330, 0.12, "sine", 0.09); },
    out() { tone(240, 0.2, "sawtooth", 0.1); tone(180, 0.26, "sawtooth", 0.1, 0.14); },
    safe() { tone(523, 0.1, "triangle", 0.12); tone(659, 0.14, "triangle", 0.12, 0.09); },
    hit() { tone(523, 0.08, "triangle", 0.12); tone(659, 0.08, "triangle", 0.12, 0.07); tone(784, 0.16, "triangle", 0.12, 0.14); },
    hr() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.16, "triangle", 0.13, i * 0.09)); noise(0.5, 0.12, 800, 0.1); },
    cheer() { noise(0.7, 0.16, 700); },
    change() { tone(440, 0.1, "triangle", 0.1); tone(349, 0.16, "triangle", 0.1, 0.1); },
    reveal() { tone(392, 0.07, "square", 0.09); tone(523, 0.07, "square", 0.09, 0.07); },
  };
})();

/* ══════════ 定数（選択肢） ══════════ */
const PITCHES = { st: "ストレート", sl: "スライダー", cv: "カーブ", fk: "フォーク" };
const COURSES = ["内角", "真ん中", "外角"];
const HEIGHTS = ["高め", "真ん中", "低め"];
const SWINGS = { meet: "ミート", power: "強振", cut: "カット", take: "見逃す" };
const SHIFTS = { normal: "定位置", in: "内野前進", deep: "外野深め", dp: "ゲッツーシフト" };
const THROWS = { dp: "併殺ねらい", first: "一塁確実", home: "本塁優先" };
const RUNS = { safe: "慎重", norm: "ふつう", aggr: "積極的" };
const BTYPES = [
  { id: "meet", nm: "ミート型", ic: "🎯", c: 0.06, p: -0.03, s: 0 },
  { id: "power", nm: "パワー型", ic: "💪", c: -0.05, p: 0.1, s: -1 },
  { id: "speed", nm: "俊足型", ic: "💨", c: 0.02, p: -0.06, s: 2 },
];
const LINEUP = [0, 1, 1, 0, 1, 0, 2, 0, 2]; // 打順→タイプ
const TEAM_NAMES = ["レッドスターズ", "ブルーコメッツ"];
const TEAM_COLORS = ["#ff5e5e", "#3878ff"];
const SAVE_KEY = "magidiamond_setup_v1";
const PRIZE_LOCAL = { win: 150, lose: 50, draw: 80 };

/* ══════════ セットアップ状態 ══════════ */
const setup = {
  n: 2, innings: 3, cpuLv: 1, talk: 0,
  players: [], // {name,cpu,team,link:{uid,name,charFile,confirmed}}
};
function defaultPlayers(n) {
  const arr = [];
  for (let i = 0; i < n; i++) {
    const old = setup.players[i];
    arr.push(old || { name: "プレイヤー" + (i + 1), cpu: i === 1 && n === 2, team: null, link: null });
  }
  // チーム自動割当（前半A・後半B）
  const half = Math.ceil(n / 2);
  arr.forEach((p, i) => { if (p.team == null || setup.players.length !== n) p.team = i < half ? 0 : 1; });
  return arr;
}

function saveSetup() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      n: setup.n, innings: setup.innings, cpuLv: setup.cpuLv, talk: setup.talk,
      players: setup.players.map((p) => ({ name: p.name, cpu: p.cpu, team: p.team, link: p.link ? { uid: p.link.uid, name: p.link.name, charFile: p.link.charFile || "", confirmed: false } : null })),
    }));
  } catch (e) {}
}
function loadSetup() {
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
    if (!d) return;
    setup.n = d.n || 2; setup.innings = d.innings || 3; setup.cpuLv = d.cpuLv == null ? 1 : d.cpuLv; setup.talk = d.talk || 0;
    if (Array.isArray(d.players)) setup.players = d.players.map((p) => ({ name: p.name || "", cpu: !!p.cpu, team: p.team ? 1 : 0, link: p.link ? { uid: p.link.uid, name: p.link.name, charFile: p.link.charFile || "", confirmed: false } : null }));
  } catch (e) {}
}

/* ══════════ セットアップUI ══════════ */
function segWire(id, attr, cb) {
  const el = $(id);
  el.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    el.querySelectorAll("button").forEach((x) => x.classList.remove("on"));
    b.classList.add("on"); SFX.tap();
    cb(b.dataset[attr]);
  });
}
function segSet(id, attr, val) {
  $(id).querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset[attr] === String(val)));
}

function renderPlayers() {
  const list = $("players-list");
  list.innerHTML = setup.players.map((p, i) => {
    let lk;
    if (p.cpu) lk = "";
    else if (!p.link) lk = '<button class="gl-link-btn" data-i="' + i + '" title="XEVARIONアカウントを紐づけて賞金を受け取る">🔗</button>';
    else lk = p.link.confirmed
      ? '<button class="gl-link-btn on" data-i="' + i + '">✓ ' + esc(p.link.name) + "</button>"
      : '<button class="gl-link-btn pending" data-i="' + i + '">🔒 ' + esc(p.link.name) + "（要確認）</button>";
    return '<div class="pl-row">' +
      '<button class="pl-team ' + (p.team ? "B" : "A") + '" data-i="' + i + '">' + (p.team ? "B" : "A") + "</button>" +
      '<input data-i="' + i + '" maxlength="10" value="' + esc(p.name) + '" placeholder="なまえ">' +
      '<button class="pl-cpu' + (p.cpu ? " cpu" : "") + '" data-i="' + i + '">' + (p.cpu ? "🤖 CPU" : "👤 人") + "</button>" +
      lk + "</div>";
  }).join("");
  const a = setup.players.filter((p) => p.team === 0).length, b = setup.players.length - a;
  $("team-note").innerHTML = "チーム分け： <b style='color:var(--teamA)'>A " + a + "人</b> vs <b style='color:var(--teamB)'>B " + b + "人</b>" +
    (a === 0 || b === 0 ? '<br><b style="color:#e0455e">⚠ それぞれのチームに1人以上必要です</b>' :
    (Math.abs(a - b) >= 2 ? "（ハンデ戦）" : "")) +
    "<br>チーム内の役割は自動で分担：1人=ぜんぶ担当／2人=監督＋選手／3人=監督・投手(打者)・守備(走塁)";
}
$("players-list").addEventListener("click", (e) => {
  const tm = e.target.closest(".pl-team");
  if (tm) { const p = setup.players[+tm.dataset.i]; p.team = p.team ? 0 : 1; SFX.tap(); renderPlayers(); saveSetup(); return; }
  const cp = e.target.closest(".pl-cpu");
  if (cp) { const p = setup.players[+cp.dataset.i]; p.cpu = !p.cpu; if (p.cpu) p.link = null; SFX.tap(); renderPlayers(); saveSetup(); return; }
  const lk = e.target.closest(".gl-link-btn");
  if (lk) { linkPlayer(+lk.dataset.i); }
});
$("players-list").addEventListener("input", (e) => {
  const inp = e.target.closest("input"); if (!inp) return;
  setup.players[+inp.dataset.i].name = inp.value;
  saveSetup();
});
function linkPlayer(i) {
  const p = setup.players[i];
  if (!window.GameLink) { toast("紐づけ機能を準備中です…", "#8892a6"); return; }
  if (p.link && p.link.confirmed) {
    if (confirm(p.link.name + " の紐づけを解除しますか？")) { p.link = null; renderPlayers(); saveSetup(); }
    return;
  }
  if (p.link && !p.link.confirmed) {
    GameLink.confirm(p.link).then((res) => {
      if (!res) return;
      if (res.remove) { p.link = null; }
      else { p.link = { uid: res.uid, name: res.name, charFile: res.charFile || "", confirmed: true }; toast("🔗 " + res.name + " を紐づけました"); }
      renderPlayers(); saveSetup();
    });
    return;
  }
  GameLink.link(p.name).then((res) => {
    if (!res || res.remove) return;
    p.link = { uid: res.uid, name: res.name, charFile: res.charFile || "", confirmed: true };
    if (!p.name || /^プレイヤー\d+$/.test(p.name)) p.name = res.name;
    toast("🔗 " + res.name + " を紐づけました");
    renderPlayers(); saveSetup();
  });
}

/* ══════════ 画面切替 ══════════ */
function showScreen(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("active", s.id === id));
}

/* ══════════ 試合状態 ══════════ */
let G = null;         // 試合状態（JSONセーフ）
let flow = { stop: false, busy: false };
let ONLINE = null;    // {code, myUid, host, mySide, room} オンライン時のみ

function makeTeam(idx, members) {
  return {
    name: members.length === 1 ? members[0].name : TEAM_NAMES[idx],
    color: TEAM_COLORS[idx],
    members: members.map((m) => ({ name: m.name, cpu: !!m.cpu, uid: m.link && m.link.confirmed ? m.link.uid : (m.uid || null) })),
    morale: 50, stamina: 100, relief: 2, ws: 3,
    pinchH: 2, pinchR: 2,
    used: { iron: false, mark: false, gamble: false, assault: false },
    bat: 0, hits: 0, hrs: 0, steals: 0,
  };
}
function newGame(teamsMembers, innings) {
  const g = {
    innings,
    teams: [makeTeam(0, teamsMembers[0]), makeTeam(1, teamsMembers[1])],
    inning: 1, half: 0, outs: 0, balls: 0, strikes: 0,
    bases: [null, null, null], // {sp}
    score: [[], []],
    seq: 0, over: false, walkoff: false,
    abBuff: null, // 代打効果 {team,bat}
  };
  g.score[0][0] = 0; g.score[1][0] = 0;
  return g;
}
const batTeam = (g) => g.teams[g.half === 0 ? 0 : 1];
const fldTeam = (g) => g.teams[g.half === 0 ? 1 : 0];
const batIdx = (g) => (g.half === 0 ? 0 : 1);
const fldIdx = (g) => (g.half === 0 ? 1 : 0);
function batterType(g) { return BTYPES[LINEUP[batTeam(g).bat % 9]]; }
function runsOf(g, t) { return g.score[t].reduce((a, b) => a + (b || 0), 0); }

/* 役割：チームメンバー → セクション担当者名 */
function roleOf(team, role /* 'kantoku'|'pitcher'|'batter'|'field'|'run' */) {
  const m = team.members;
  if (m.length === 1) return m[0];
  if (m.length === 2) return role === "pitcher" || role === "batter" ? m[1] : m[0];
  return role === "kantoku" ? m[0] : (role === "pitcher" || role === "batter" ? m[1] : m[2]);
}
const isHumanTeam = (t) => t.members.some((m) => !m.cpu);

/* ══════════ 試合開始 ══════════ */
$("start").addEventListener("click", () => {
  const A = setup.players.filter((p) => p.team === 0), B = setup.players.filter((p) => p.team === 1);
  if (!A.length || !B.length) { toast("⚠ それぞれのチームに1人以上入れてください", "#e0455e"); return; }
  const pend = setup.players.find((p) => !p.cpu && p.link && !p.link.confirmed);
  if (pend) { toast("🔒 " + pend.link.name + " の紐づけをタップして4桁パスワードで確認してください（未確認は賞金対象外）", "#b07700"); }
  saveSetup();
  ONLINE = null;
  G = newGame([A, B], setup.innings);
  startMatch();
});
function startMatch() {
  showScreen("game");
  flow.stop = false; flow.busy = false;
  initField();
  renderScorebar();
  panelHTML('<div class="cpu-think">⚾ プレイボール！</div>');
  SFX.cheer();
  stampShow("プレイボール！", "#3ec27b");
  setTimeout(() => { stampHide(); if (!ONLINE) nextPitch(); else onlinePromptPicks(); }, 1400);
}

/* ══════════ スコアボード ══════════ */
function renderScorebar() {
  if (!G) return;
  const g = G, bt = batTeam(g), ft = fldTeam(g);
  const lamps = (n, cls, max) => '<span class="g ' + cls + '">' + cls + Array.from({ length: max }, (_, i) => "<i" + (i < n ? ' class="on"' : "") + "></i>").join("") + "</span>";
  const t0 = g.teams[0], t1 = g.teams[1];
  $("scorebar").innerHTML =
    '<div class="sb"><div class="sb-top">' +
    '<div class="sb-team"><span class="tm" style="background:' + t0.color + '"></span><span class="nm">' + esc(t0.name) + '</span><span class="sc">' + runsOf(g, 0) + "</span></div>" +
    '<div class="sb-mid"><div class="inn">' + g.inning + "回" + (g.half === 0 ? "表" : "裏") + '</div><div class="vs">MAGIDIAMOND</div></div>' +
    '<div class="sb-team right"><span class="tm" style="background:' + t1.color + '"></span><span class="nm">' + esc(t1.name) + '</span><span class="sc">' + runsOf(g, 1) + "</span></div>" +
    "</div><div class=\"sb-bot\">" +
    '<div class="bso">' + lamps(g.balls, "B", 3) + lamps(g.strikes, "S", 2) + lamps(g.outs, "O", 2) + "</div>" +
    '<div class="sb-bases">' + [3, 2, 1].map((b) => "<i class=\"b" + b + (g.bases[b - 1] ? " on" : "") + "\"></i>").join("") + "</div>" +
    '<div class="sb-stat">' +
    "<span>" + batterType(g).ic + " " + (bt.bat % 9 + 1) + "番 " + batterType(g).nm + "</span>" +
    '<span class="stam">⚾<b><i style="width:' + clamp(ft.stamina, 0, 100) + '%"></i></b></span>' +
    '<span class="morale">🔥<i><b style="width:' + t0.morale + '%;background:' + t0.color + '"></b></i><i><b style="width:' + t1.morale + '%;background:' + t1.color + '"></b></i></span>' +
    "</div></div></div>";
}

/* ══════════ パネル描画 ══════════ */
function panelHTML(html) { $("panel-area").innerHTML = html; }

function gateHTML(cls, ic, title, sub) {
  return '<button class="gate ' + cls + '" id="gate-btn"><span class="g-ic">' + ic + '</span><span class="g-t">' + esc(title) + '</span><span class="g-s">' + sub + "</span></button>";
}
function chipRow(lab, name, opts, cur, extraCls) {
  return '<div class="chips">' + (lab ? '<span class="lab">' + lab + "</span>" : "") +
    opts.map((o) => '<button class="chip' + (o.v === cur ? " on" : "") + (o.cls ? " " + o.cls : "") + (extraCls ? " " + extraCls : "") + '" data-g="' + name + '" data-v="' + o.v + '"' + (o.dis ? " disabled" : "") + ">" + o.t + (o.sub ? "<small>" + o.sub + "</small>" : "") + "</button>").join("") + "</div>";
}
function secHTML(icon, role, who, inner) {
  return '<div class="role-sec"><div class="rs-t"><span class="rb">' + icon + " " + role + '</span><span class="who">' + esc(who) + "</span></div>" + inner + "</div>";
}

/* ── 守備側パネル ── */
function defPanelHTML(g, d) {
  const t = fldTeam(g);
  const kk = roleOf(t, "kantoku").name, pp = roleOf(t, "pitcher").name, ff = roleOf(t, "field").name;
  const anyRunner = g.bases.some(Boolean);
  let h = '<div class="panel"><div class="p-head"><span class="tmk" style="background:' + t.color + '"></span>' +
    '<span class="tt">🧤 守備側：' + esc(t.name) + "<small>配球とシフトを決めて「決定」</small></span>" +
    '<button class="ok" id="p-ok">決定 ✔</button></div><div class="p-body">';
  h += secHTML("🎩", "監督", kk,
    chipRow("守備シフト", "shift", Object.keys(SHIFTS).map((k) => ({ v: k, t: SHIFTS[k] })), d.shift) +
    chipRow("作戦", "tactic", [
      { v: "none", t: "ふつうに勝負" },
      { v: "waste", t: "ウエスト", sub: "外して盗塁警戒" },
      { v: "walk", t: "敬遠", sub: "歩かせる" },
    ], d.tactic) +
    chipRow("スキル（1試合1回）", "skill", [
      { v: "none", t: "使わない" },
      { v: "iron", t: "🛡 鉄壁守備", sub: "この打球を抑える", cls: "gold", dis: t.used.iron },
      { v: "mark", t: "🔍 徹底マーク", sub: "打者の能力ダウン", cls: "gold", dis: t.used.mark },
    ], d.skill || "none") +
    chipRow("投手交代（残" + t.relief + "）", "change", [
      { v: "no", t: "続投" },
      { v: "yes", t: "🔄 交代", sub: "スタミナ全回復", dis: t.relief <= 0 },
    ], d.change ? "yes" : "no"));
  const dis = d.tactic !== "none";
  h += secHTML("🎽", "投手", pp,
    chipRow("球種", "ptype", Object.keys(PITCHES).map((k) => ({ v: k, t: PITCHES[k], dis })), d.pitch.type) +
    chipRow("コース", "pc", COURSES.map((c, i) => ({ v: String(i), t: c, dis })), String(d.pitch.course)) +
    chipRow("高さ", "ph", HEIGHTS.map((c, i) => ({ v: String(i), t: c, dis })), String(d.pitch.height)) +
    chipRow("力配分", "pw", [
      { v: "full", t: "🔥 全力", sub: "スタミナ↓", dis },
      { v: "norm", t: "ふつう", dis },
      { v: "soft", t: "抜く", sub: "スタミナ温存", dis },
    ], d.power) +
    chipRow("ウイニングショット（残" + t.ws + "）", "ws", [
      { v: "no", t: "使わない", dis },
      { v: "yes", t: "✨ 使う", sub: "空振りを取る決め球", cls: "warn", dis: dis || t.ws <= 0 },
    ], d.ws ? "yes" : "no"));
  h += secHTML("🧤", "守備", ff,
    chipRow("打球がきたら", "throwTo", [
      { v: "dp", t: THROWS.dp, sub: anyRunner ? "ダブルプレー!" : "ランナーなし", dis: !g.bases[0] },
      { v: "first", t: THROWS.first, sub: "確実にアウト" },
      { v: "home", t: THROWS.home, sub: g.bases[2] ? "失点を防ぐ" : "三塁走者なし", dis: !g.bases[2] },
    ], d.throwTo));
  h += "</div></div>";
  return h;
}

/* ── 攻撃側パネル ── */
function offPanelHTML(g, o) {
  const t = batTeam(g);
  const kk = roleOf(t, "kantoku").name, bb = roleOf(t, "batter").name, rr = roleOf(t, "run").name;
  const canSteal = (g.bases[0] && !g.bases[1]) || (g.bases[1] && !g.bases[2]);
  const anyRunner = g.bases.some(Boolean);
  const bt = batterType(g);
  let h = '<div class="panel"><div class="p-head"><span class="tmk" style="background:' + t.color + '"></span>' +
    '<span class="tt">⚔ 攻撃側：' + esc(t.name) + "<small>" + bt.ic + " " + (t.bat % 9 + 1) + "番・" + bt.nm + " — 狙いを決めて「決定」</small></span>" +
    '<button class="ok" id="p-ok">決定 ✔</button></div><div class="p-body">';
  h += secHTML("🎩", "監督", kk,
    chipRow("作戦", "tactic", [
      { v: "none", t: "ふつうに打つ" },
      { v: "steal", t: "🏃 盗塁", sub: canSteal ? "スタートを切る" : "できない", dis: !canSteal },
      { v: "bunt", t: "バント", sub: anyRunner ? "送りバント" : "セーフティ" },
      { v: "endrun", t: "エンドラン", sub: anyRunner ? "走者スタート+打つ" : "走者なし", dis: !anyRunner },
    ], o.tactic) +
    chipRow("スキル（1試合1回）", "skill", [
      { v: "none", t: "使わない" },
      { v: "gamble", t: "🎲 勝負師", sub: "ミート率アップ", cls: "gold", dis: t.used.gamble },
      { v: "assault", t: "💥 強攻策", sub: "長打↑ 三振も↑", cls: "gold", dis: t.used.assault },
    ], o.skill || "none") +
    chipRow("ベンチ", "bench", [
      { v: "none", t: "そのまま" },
      { v: "ph", t: "代打（残" + t.pinchH + "）", sub: "この打席 強化", dis: t.pinchH <= 0 },
      { v: "pr", t: "代走（残" + t.pinchR + "）", sub: "走者を俊足に", dis: t.pinchR <= 0 || !anyRunner },
    ], o.bench || "none"));
  h += secHTML("🎽", "打者", bb,
    chipRow("狙いコース", "aimC", [{ v: "-1", t: "ぜんたい" }].concat(COURSES.map((c, i) => ({ v: String(i), t: c }))), String(o.aimC)) +
    chipRow("狙い高さ", "aimH", [{ v: "-1", t: "ぜんたい" }].concat(HEIGHTS.map((c, i) => ({ v: String(i), t: c }))), String(o.aimH)) +
    chipRow("スイング", "swing", [
      { v: "meet", t: "🎯 ミート", sub: "当てにいく" },
      { v: "power", t: "💥 強振", sub: "一発ねらい" },
      { v: "cut", t: "カット", sub: "ファウルで粘る" },
      { v: "take", t: "見逃す", sub: "ボールを見る" },
    ], o.swing));
  h += secHTML("🏃", "走塁", rr,
    chipRow("走塁方針", "run", [
      { v: "safe", t: RUNS.safe, sub: "ムリしない" },
      { v: "norm", t: RUNS.norm },
      { v: "aggr", t: RUNS.aggr, sub: "次の塁を狙う" },
    ], o.run));
  h += "</div></div>";
  return h;
}

/* パネルの選択操作を配線し、決定で resolve する */
function wirePanel(pick, applyKey, onOk) {
  const area = $("panel-area");
  area.onclick = (e) => {
    const ok = e.target.closest("#p-ok");
    if (ok) { area.onclick = null; onOk(); return; }
    const c = e.target.closest(".chip"); if (!c || c.disabled) return;
    SFX.tap();
    applyKey(c.dataset.g, c.dataset.v, pick);
    // 再描画（値の反映）
    refreshPanel(pick);
  };
}
let panelKind = null; // 'def'|'off'
function refreshPanel(pick) {
  if (panelKind === "def") panelHTML(defPanelHTML(G, pick));
  else panelHTML(offPanelHTML(G, pick));
}
function applyDefKey(k, v, d) {
  if (k === "shift") d.shift = v;
  else if (k === "tactic") d.tactic = v;
  else if (k === "skill") d.skill = v === "none" ? null : v;
  else if (k === "change") d.change = v === "yes";
  else if (k === "ptype") d.pitch.type = v;
  else if (k === "pc") d.pitch.course = +v;
  else if (k === "ph") d.pitch.height = +v;
  else if (k === "pw") d.power = v;
  else if (k === "ws") d.ws = v === "yes";
}
function applyOffKey(k, v, o) {
  if (k === "tactic") o.tactic = v;
  else if (k === "skill") o.skill = v === "none" ? null : v;
  else if (k === "bench") o.bench = v;
  else if (k === "aimC") o.aimC = +v;
  else if (k === "aimH") o.aimH = +v;
  else if (k === "swing") o.swing = v;
  else if (k === "run") o.run = v;
}
function defDefault(g) {
  return { shift: "normal", tactic: "none", skill: null, change: false, pitch: { type: "st", course: 1, height: 1 }, power: "norm", ws: false, throwTo: g.bases[0] ? "dp" : "first" };
}
function offDefault() {
  return { tactic: "none", skill: null, bench: "none", aimC: -1, aimH: -1, swing: "meet", run: "norm" };
}

/* ══════════ CPU AI ══════════ */
function rnd() { return Math.random(); }
function pickW(pairs) { // [[val,weight],...]
  let s = 0; pairs.forEach((p) => (s += p[1]));
  let r = rnd() * s;
  for (const p of pairs) { r -= p[1]; if (r <= 0) return p[0]; }
  return pairs[pairs.length - 1][0];
}
function cpuDef(g) {
  const lv = setup.cpuLv, t = fldTeam(g), d = defDefault(g);
  const bt = batterType(g);
  // シフト
  if (g.bases[0] && g.outs < 2 && rnd() < 0.35 + lv * 0.15) d.shift = "dp";
  else if (g.bases[2] && g.outs < 2 && rnd() < 0.3 + lv * 0.15) d.shift = "in";
  else if (bt.id === "power" && rnd() < 0.25 + lv * 0.1) d.shift = "deep";
  // 敬遠・ウエスト
  const canSteal = (g.bases[0] && !g.bases[1]) || (g.bases[1] && !g.bases[2]);
  if (canSteal && lv >= 1 && rnd() < 0.12 + lv * 0.05) d.tactic = "waste";
  if (g.bases[1] && g.bases[2] && !g.bases[0] && bt.id === "power" && rnd() < 0.15 * lv) d.tactic = "walk";
  // 配球
  d.pitch.type = pickW([["st", 4], ["sl", 3], ["cv", 2], ["fk", g.strikes === 2 ? 4 : 1.6]]);
  if (lv === 0) { d.pitch.course = Math.floor(rnd() * 3); d.pitch.height = Math.floor(rnd() * 3); }
  else {
    d.pitch.course = pickW([[0, 3], [1, lv >= 2 ? 0.8 : 2], [2, 3.4]]);
    d.pitch.height = pickW([[0, 1.6], [1, lv >= 2 ? 0.8 : 1.6], [2, 3.4]]);
  }
  d.power = g.strikes === 2 && rnd() < 0.5 ? "full" : pickW([["full", 1.4], ["norm", 3], ["soft", 0.8]]);
  if (t.ws > 0 && g.strikes === 2 && rnd() < 0.3 + lv * 0.2) d.ws = true;
  if (t.stamina < 30 && t.relief > 0 && rnd() < 0.6) d.change = true;
  if (!t.used.mark && bt.id === "power" && g.bases.filter(Boolean).length >= 2 && rnd() < 0.3 * lv) d.skill = "mark";
  if (g.bases[2]) d.throwTo = g.outs < 2 && rnd() < 0.5 ? "home" : "first";
  else if (g.bases[0] && g.outs < 2) d.throwTo = "dp";
  return d;
}
function cpuOff(g) {
  const lv = setup.cpuLv, t = batTeam(g), o = offDefault();
  const canSteal = (g.bases[0] && !g.bases[1]) || (g.bases[1] && !g.bases[2]);
  if (canSteal && rnd() < 0.1 + lv * 0.06) o.tactic = "steal";
  else if (g.bases[0] && g.outs < 2 && rnd() < 0.1 + lv * 0.05) o.tactic = pickW([["bunt", 1], ["endrun", 1]]);
  if (lv >= 1 && rnd() < 0.55) { o.aimC = pickW([[0, 1], [1, 1], [2, 1.4], [-1, lv >= 2 ? 0.6 : 1.4]]); }
  if (lv >= 1 && rnd() < 0.45) { o.aimH = pickW([[0, 1], [1, 1], [2, 1.4], [-1, 1.2]]); }
  o.swing = pickW([["meet", 4], ["power", batterType(g).id === "power" ? 3 : 1.4], ["cut", g.strikes === 2 ? 2 : 0.6], ["take", g.strikes === 2 ? 0.4 : (g.balls >= 2 ? 2 : 1.2)]]);
  o.run = pickW([["safe", 1], ["norm", 3], ["aggr", batterType(g).id === "speed" ? 2.4 : 1]]);
  if (!t.used.gamble && g.bases.filter(Boolean).length >= 2 && g.outs === 2 && rnd() < 0.35 * lv) o.skill = "gamble";
  if (!t.used.assault && runsOf(g, batIdx(g)) + 2 < runsOf(g, fldIdx(g)) && rnd() < 0.25 * lv) o.skill = "assault";
  return o;
}

/* ══════════ 判定エンジン ══════════ */
/* g（クローン）を書き換え、演出イベント列を返す */
function resolvePitch(g, d, o) {
  const ev = [];
  const runColor = batTeam(g).color; // この打席の走者色（チェンジ後も正しく描くため確定させる）
  const bt = batTeam(g), ft = fldTeam(g);
  const bIdx = batIdx(g), fIdx = fldIdx(g);
  const btype = batterType(g);

  // 消費系の適用
  if (d.change && ft.relief > 0) { ft.relief--; ft.stamina = 100; ev.push({ t: "note", text: "🔄 " + ft.name + " 投手交代！スタミナ回復" }); }
  if (d.skill && !ft.used[d.skill]) { ft.used[d.skill] = true; ev.push({ t: "note", text: d.skill === "iron" ? "🛡 " + ft.name + "『鉄壁守備』発動！" : "🔍 " + ft.name + "『徹底マーク』発動！" }); }
  else d.skill = null;
  if (o.skill && !bt.used[o.skill]) { bt.used[o.skill] = true; ev.push({ t: "note", text: o.skill === "gamble" ? "🎲 " + bt.name + "『勝負師』発動！" : "💥 " + bt.name + "『強攻策』発動！" }); }
  else o.skill = null;
  if (o.bench === "ph" && bt.pinchH > 0) { bt.pinchH--; g.abBuff = { team: bIdx, bat: bt.bat }; ev.push({ t: "note", text: "🔁 " + bt.name + " 代打を送る！" }); }
  if (o.bench === "pr" && bt.pinchR > 0 && g.bases.some(Boolean)) {
    bt.pinchR--;
    for (let i = 2; i >= 0; i--) if (g.bases[i]) { g.bases[i].sp = 2; break; }
    ev.push({ t: "note", text: "💨 " + bt.name + " 代走を送る！" });
  }
  const phBuff = g.abBuff && g.abBuff.team === bIdx && g.abBuff.bat === bt.bat;

  const useWs = d.ws && ft.ws > 0 && d.tactic === "none";
  if (useWs) ft.ws--;

  // スタミナ消費
  ft.stamina = clamp(ft.stamina - (d.tactic !== "none" ? 1 : d.power === "full" ? 4 : d.power === "soft" ? 1 : 2) - (useWs ? 4 : 0), 0, 100);
  const tired = (100 - ft.stamina) / 100; // 0..1

  /* ── 投球位置decide ── */
  let isBall = false, zc = d.pitch.course, zr = d.pitch.height;
  if (d.tactic === "walk" || d.tactic === "waste") { isBall = true; zc = 2; zr = -1; }
  else {
    const missP = 0.08 + tired * 0.22 + (d.power === "full" ? 0.04 : 0);
    if (rnd() < missP) {
      // 制球ミス：ゾーン内ずれ or ボール
      if (rnd() < 0.5) { isBall = true; }
      else { zc = clamp(zc + (rnd() < 0.5 ? -1 : 1), 0, 2); zr = clamp(zr + (rnd() < 0.5 ? -1 : 1), 0, 2); }
    }
  }
  ev.push({ t: "pitch", type: d.tactic !== "none" ? "st" : d.pitch.type, zc, zr, ball: isBall, ws: useWs, waste: d.tactic !== "none", shift: d.shift });
  ev.push({ t: "zone", aimC: o.tactic === "bunt" ? -9 : o.aimC, aimH: o.tactic === "bunt" ? -9 : o.aimH, zc, zr, ball: isBall, label: d.tactic !== "none" ? "ボールゾーンへ外した" : PITCHES[d.pitch.type] });
  const fin = () => { ev.forEach((e) => { if (e.t === "run" && !e.color) e.color = runColor; }); return ev; };

  /* ── 盗塁・エンドランのスタート ── */
  const stealing = o.tactic === "steal" || o.tactic === "endrun";

  /* ── 敬遠（即4球） ── */
  if (d.tactic === "walk") {
    ev.push({ t: "call", text: "敬遠", color: "#8fa4c6" });
    doWalk(g, ev, "敬遠で出塁");
    return fin();
  }

  /* ── スイング判断 ── */
  let swing = o.swing;
  if (o.tactic === "bunt") swing = "bunt";
  if (o.tactic === "endrun" && swing === "take") swing = "meet"; // エンドランは必ず打ちにいく
  let offer = swing !== "take";
  if (isBall && offer && o.tactic !== "endrun" && swing !== "bunt") {
    // ボール球に手を出すか（狙いをしぼっているほど見送れる）
    let chase = swing === "power" ? 0.4 : 0.3;
    if (o.aimC >= 0) chase -= 0.1;
    if (o.aimH >= 0) chase -= 0.1;
    if (g.strikes === 2) chase += 0.15; // 追い込まれて手が出る
    offer = rnd() < chase;
  }

  /* ── 盗塁だけ先に解決（見逃し/空振り時に適用） ── */
  function resolveSteal(afterMiss) {
    if (!stealing) return null;
    let from = g.bases[1] && !g.bases[2] ? 1 : 0;
    if (!g.bases[from]) return null;
    const to = from + 1;
    const sp = g.bases[from].sp || 0;
    let p = 0.66 + sp * 0.07 + (bt.morale - 50) * 0.002;
    if (d.tactic === "waste") p -= 0.28;
    if (d.pitch.type === "st") p -= 0.07;
    if (d.pitch.type === "cv" || d.pitch.type === "fk") p += 0.06;
    if (o.tactic === "endrun" && afterMiss) p -= 0.12;
    const ok = rnd() < p;
    if (ok) {
      g.bases[to] = g.bases[from]; g.bases[from] = null; bt.steals++;
      ev.push({ t: "run", moves: [{ from: from + 1, to: to + 1, out: false, slide: true }] });
      ev.push({ t: "stamp", text: "盗塁成功！", color: "#3ec27b" });
      bt.morale = clamp(bt.morale + 5, 0, 100);
    } else {
      g.bases[from] = null;
      ev.push({ t: "throwTo", base: to });
      ev.push({ t: "run", moves: [{ from: from + 1, to: to + 1, out: true, slide: true }] });
      ev.push({ t: "stamp", text: "盗塁失敗…", color: "#ff5e5e" });
      ft.morale = clamp(ft.morale + 6, 0, 100);
      addOut(g, ev);
    }
    return ok;
  }

  if (!offer) {
    /* 見逃し */
    ev.push({ t: "swing", kind: "take" });
    if (isBall) {
      ev.push({ t: "call", text: "ボール", color: "#57b8ff" });
      g.balls++;
      resolveSteal(true);
      if (!g.over && g.balls >= 4) doWalk(g, ev, "フォアボール！");
    } else {
      ev.push({ t: "call", text: "ストライク！", color: "#ffd23e" });
      g.strikes++;
      if (g.strikes >= 3) doStrikeout(g, ev, "見逃し三振！");
      else resolveSteal(true);
    }
    return fin();
  }

  /* ── コンタクト判定 ── */
  let contact = swing === "meet" ? 0.78 : swing === "power" ? 0.56 : swing === "cut" ? 0.86 : 0.88; // bunt=0.88
  // 狙いの一致
  if (o.aimC >= 0) contact += o.aimC === zc ? 0.1 : -0.13;
  if (o.aimH >= 0) contact += o.aimH === zr ? 0.09 : -0.12;
  // 球種・力
  if (d.pitch.type === "fk" && zr === 2) contact -= 0.11;
  if (d.pitch.type === "sl") contact -= 0.04;
  if (d.pitch.type === "st") contact += 0.04;
  if (d.power === "full") contact -= 0.06;
  if (d.power === "soft") contact += 0.05;
  if (useWs) contact -= 0.24;
  if (isBall) contact -= 0.25;
  contact += btype.c + tired * 0.12;
  if (phBuff) contact += 0.08;
  if (o.skill === "gamble") contact += 0.16;
  if (o.skill === "assault") contact -= 0.08;
  if (d.skill === "mark") contact -= 0.13;
  if (g.strikes === 2 && (swing === "meet" || swing === "cut")) contact += 0.05;
  contact += (bt.morale - 50) * 0.0012 - (ft.morale - 50) * 0.0008;

  if (rnd() >= clamp(contact, 0.06, 0.96)) {
    /* 空振り */
    ev.push({ t: "swing", kind: "miss" });
    ev.push({ t: "call", text: useWs ? "✨ 空振り！" : "空振り！", color: "#ffd23e" });
    g.strikes++;
    if (useWs) ft.morale = clamp(ft.morale + 3, 0, 100);
    if (g.strikes >= 3) doStrikeout(g, ev, "空振り三振！");
    else resolveSteal(true);
    return fin();
  }

  /* ── バント ── */
  if (swing === "bunt") { resolveBunt(g, d, o, ev); return fin(); }

  /* ── ファウル ── */
  let foulP = swing === "cut" ? 0.56 : swing === "meet" ? 0.27 : 0.33;
  if (isBall) foulP += 0.15;
  if (rnd() < foulP) {
    ev.push({ t: "swing", kind: "foul" });
    ev.push({ t: "foul", side: rnd() < 0.5 ? -1 : 1 });
    ev.push({ t: "call", text: "ファウル", color: "#c9d6e8" });
    if (g.strikes < 2) g.strikes++;
    if (swing === "cut") ft.stamina = clamp(ft.stamina - 1.5, 0, 100);
    return fin();
  }

  /* ── フェアの打球 ── */
  let q = rnd() * 0.8;
  if (swing === "power") q += 0.22;
  if (o.aimC >= 0 && o.aimC === zc) q += 0.08;
  if (o.aimH >= 0 && o.aimH === zr) q += 0.07;
  q += btype.p;
  if (phBuff) q += 0.08;
  if (o.skill === "assault") q += 0.17;
  if (d.skill === "iron") q -= 0.15;
  if (useWs) q -= 0.1;
  if (d.power === "soft") q += 0.06;
  if (d.pitch.type === "cv") q += 0.04;
  if (isBall) q -= 0.1;
  q += tired * 0.1 + (bt.morale - 50) * 0.001;
  q = clamp(q, 0, 1.05);

  const grounder = zr === 2 ? rnd() < 0.62 : zr === 0 ? rnd() < 0.3 : rnd() < 0.46;
  resolveBattedBall(g, d, o, ev, q, grounder && q < 0.86, swing);
  return fin();
}

/* 四球 */
function doWalk(g, ev, label) {
  ev.push({ t: "stamp", text: label, color: "#57b8ff" });
  const moves = [];
  // 押し出しの連鎖
  let carry = { sp: batterType(g).s > 0 ? 2 : 0 };
  moves.push({ from: 0, to: 1, out: false });
  for (let b = 0; b < 3 && carry; b++) {
    const nx = g.bases[b];
    g.bases[b] = carry; carry = nx;
    if (carry) moves.push({ from: b + 1, to: b + 2, out: false });
  }
  if (carry) { addRun(g, ev, 1); } // 押し出し得点
  ev.push({ t: "run", moves });
  endAtBat(g);
}
/* 三振 */
function doStrikeout(g, ev, label) {
  ev.push({ t: "stamp", text: label, color: "#ff5e5e" });
  const ft = fldTeam(g);
  ft.morale = clamp(ft.morale + 4, 0, 100);
  endAtBat(g);
  addOut(g, ev);
}

/* バント */
function resolveBunt(g, d, o, ev) {
  const bt = batTeam(g), ft = fldTeam(g);
  ev.push({ t: "swing", kind: "bunt" });
  ev.push({ t: "hit", a: 90 + (rnd() * 40 - 20), dist: 70 + rnd() * 40, air: false, roll: true });
  let success = 0.84;
  if (d.shift === "in") success -= 0.22;
  const speedSafe = batterType(g).id === "speed" ? 0.22 : 0.08;
  if (rnd() < success) {
    // 走者進塁
    const moves = [];
    for (let b = 2; b >= 0; b--) {
      if (g.bases[b]) {
        if (b === 2) { addRun(g, ev, 1); moves.push({ from: 3, to: 4, out: false, slide: true }); g.bases[2] = null; }
        else { g.bases[b + 1] = g.bases[b]; g.bases[b] = null; moves.push({ from: b + 1, to: b + 2, out: false }); }
      }
    }
    if (rnd() < speedSafe && !g.bases[0]) {
      g.bases[0] = { sp: 2 };
      moves.push({ from: 0, to: 1, out: false, slide: true });
      ev.push({ t: "run", moves });
      ev.push({ t: "stamp", text: "セーフティ成功！", color: "#3ec27b" });
      bt.hits++; bt.morale = clamp(bt.morale + 5, 0, 100);
      endAtBat(g);
    } else {
      moves.push({ from: 0, to: 1, out: true });
      ev.push({ t: "throwTo", base: 1 });
      ev.push({ t: "run", moves });
      ev.push({ t: "stamp", text: "送りバント成功", color: "#8fd4a8" });
      endAtBat(g);
      addOut(g, ev);
    }
  } else {
    // バント失敗＝小フライ or 先の塁アウト
    if (rnd() < 0.5) {
      ev.push({ t: "catch", base: null });
      ev.push({ t: "stamp", text: "バント失敗…小フライ", color: "#ff5e5e" });
      endAtBat(g);
      addOut(g, ev);
    } else {
      const lead = g.bases[1] ? 2 : g.bases[0] ? 1 : -1;
      const moves = [];
      if (lead >= 0) {
        g.bases[lead] = null;
        moves.push({ from: lead + 1, to: lead + 2, out: true, slide: true });
        if (!g.bases[0]) { g.bases[0] = { sp: 0 }; moves.push({ from: 0, to: 1, out: false }); }
      } else moves.push({ from: 0, to: 1, out: true });
      ev.push({ t: "throwTo", base: lead >= 0 ? lead + 2 : 1 });
      ev.push({ t: "run", moves });
      ev.push({ t: "stamp", text: "フィルダースチョイス！", color: "#ff8a5e" });
      ft.morale = clamp(ft.morale + 4, 0, 100);
      endAtBat(g);
      addOut(g, ev);
    }
  }
  return ev;
}

/* 打球の解決 */
function resolveBattedBall(g, d, o, ev, q, grounder, swing) {
  const bt = batTeam(g), ft = fldTeam(g);
  const btype = batterType(g);
  const endrun = o.tactic === "endrun";
  const aggr = o.run === "aggr" ? 1 : o.run === "safe" ? -1 : 0;
  const spray = 40 + rnd() * 100; // 45..140°
  ev.push({ t: "swing", kind: "hit", power: swing === "power" });

  // シフト補正
  let hitBonus = 0;
  if (grounder) {
    if (d.shift === "in") hitBonus += 0.1;     // 前進守備はゴロが抜けやすい
    if (d.shift === "dp") hitBonus += 0.05;
  } else {
    if (d.shift === "deep") hitBonus -= 0.08;  // 深めは長打を抑える
    if (d.shift === "in") hitBonus += 0.12;    // 前進は頭を越される
  }
  const qq = clamp(q + hitBonus, 0, 1.1);

  /* HR */
  const hrLine = swing === "power" ? 0.93 : 0.97;
  if (!grounder && qq >= hrLine) {
    ev.push({ t: "hit", a: spray, dist: 470 + rnd() * 40, air: true, hr: true });
    const n = 1 + g.bases.filter(Boolean).length;
    const moves = [];
    for (let b = 2; b >= 0; b--) if (g.bases[b]) { moves.push({ from: b + 1, to: 4, out: false }); g.bases[b] = null; }
    moves.push({ from: 0, to: 4, out: false });
    ev.push({ t: "run", moves });
    ev.push({ t: "stamp", text: n > 1 ? n + "ランホームラン!!" : "ホームラン!!", color: "#ffd23e", big: true, hr: true });
    bt.hits++; bt.hrs++;
    addRun(g, ev, n);
    bt.morale = clamp(bt.morale + 12, 0, 100);
    endAtBat(g);
    return ev;
  }

  /* 長打・単打・凡打 */
  if (qq >= 0.84 && !grounder) {
    // 二塁打/三塁打
    const triple = qq > 0.96 || (btype.id === "speed" && aggr >= 0 && rnd() < 0.3);
    ev.push({ t: "hit", a: rnd() < 0.5 ? 48 + rnd() * 18 : 116 + rnd() * 18, dist: 395 + rnd() * 30, air: true });
    const moves = [];
    for (let b = 2; b >= 0; b--) if (g.bases[b]) {
      const adv = triple ? 4 : (b >= 1 || aggr >= 0 ? Math.min(b + 3, 4) : b + 2 + 1);
      if (adv >= 4) { addRun(g, ev, 1); moves.push({ from: b + 1, to: 4, out: false, slide: b === 2 ? false : true }); g.bases[b] = null; }
      else { g.bases[adv - 1] = g.bases[b]; g.bases[b] = null; moves.push({ from: b + 1, to: adv, out: false }); }
    }
    const to = triple ? 3 : 2;
    g.bases[to - 1] = { sp: btype.s > 0 ? 2 : 1 };
    moves.push({ from: 0, to, out: false, slide: true });
    ev.push({ t: "run", moves });
    ev.push({ t: "stamp", text: triple ? "三塁打！" : "二塁打！", color: "#3ec27b", big: true });
    bt.hits++; bt.morale = clamp(bt.morale + 7, 0, 100);
    endAtBat(g);
    return ev;
  }

  if (qq >= 0.6) {
    /* シングルヒット（＋ギャンブル走塁） */
    ev.push({ t: "hit", a: spray, dist: grounder ? 250 + rnd() * 60 : 300 + rnd() * 55, air: !grounder, roll: grounder });
    const moves = [];
    // 3塁走者は生還、2塁走者は挑戦
    if (g.bases[2]) { addRun(g, ev, 1); moves.push({ from: 3, to: 4, out: false, slide: true }); g.bases[2] = null; }
    let gambleOut = false;
    if (g.bases[1]) {
      const runner = g.bases[1];
      const tryHome = endrun || aggr > 0 || (aggr === 0 && (runner.sp || 0) >= 1);
      if (tryHome) {
        let p = 0.62 + (runner.sp || 0) * 0.09 + (aggr > 0 ? 0.03 : 0);
        if (d.throwTo === "home") p -= 0.16;
        if (d.shift === "deep") p += 0.08;
        if (rnd() < p) { addRun(g, ev, 1); moves.push({ from: 2, to: 4, out: false, slide: true }); }
        else {
          gambleOut = true;
          ev.push({ t: "throwTo", base: 4 });
          moves.push({ from: 2, to: 4, out: true, slide: true });
          fldTeam(g).morale = clamp(fldTeam(g).morale + 7, 0, 100);
        }
        g.bases[1] = null;
      } else { g.bases[2] = runner; g.bases[1] = null; moves.push({ from: 2, to: 3, out: false }); }
    }
    if (g.bases[0]) {
      const runner = g.bases[0];
      const to = endrun || aggr > 0 ? 3 : 2;
      if (to === 3 && !g.bases[2] && rnd() < 0.55 + (runner.sp || 0) * 0.08) { g.bases[2] = runner; moves.push({ from: 1, to: 3, out: false, slide: true }); }
      else { g.bases[1] = runner; moves.push({ from: 1, to: 2, out: false }); }
      g.bases[0] = null;
    }
    // 打者：積極的なら二塁を狙う
    let batTo = 1;
    if (aggr > 0 && !g.bases[1] && rnd() < 0.24 + btype.s * 0.09) batTo = 2;
    if (batTo === 2 && rnd() < 0.3) {
      ev.push({ t: "throwTo", base: 2 });
      moves.push({ from: 0, to: 2, out: true, slide: true });
      ev.push({ t: "run", moves });
      ev.push({ t: "stamp", text: "ヒット！…しかし欲張りすぎた！", color: "#ff8a5e" });
      bt.hits++;
      endAtBat(g);
      addOut(g, ev);
      return ev;
    }
    g.bases[batTo - 1] = { sp: btype.s > 0 ? 2 : 0 };
    moves.push({ from: 0, to: batTo, out: false, slide: batTo === 2 });
    ev.push({ t: "run", moves });
    ev.push({ t: "stamp", text: gambleOut ? "ヒット！（本塁タッチアウト）" : (batTo === 2 ? "うまい走塁！2塁へ" : "ヒット！"), color: "#3ec27b" });
    bt.hits++; bt.morale = clamp(bt.morale + 5, 0, 100);
    endAtBat(g);
    if (gambleOut) addOut(g, ev);
    return ev;
  }

  /* ── アウト性の打球 ── */
  if (grounder) {
    ev.push({ t: "hit", a: spray, dist: 120 + rnd() * 70, air: false, roll: true });
    // ゲッツー
    if (g.bases[0] && g.outs < 2 && (d.throwTo === "dp" || d.shift === "dp")) {
      let dpP = 0.52 + (d.shift === "dp" ? 0.18 : 0) - (batterType(g).id === "speed" ? 0.14 : 0) - (endrun ? 0.3 : 0);
      if (rnd() < dpP) {
        const moves = [{ from: 1, to: 2, out: true, slide: true }, { from: 0, to: 1, out: true }];
        g.bases[0] = null;
        // 2,3塁走者は進む
        if (g.bases[2] && g.outs === 0) { addRun(g, ev, 1); moves.push({ from: 3, to: 4, out: false }); g.bases[2] = null; }
        if (g.bases[1]) { const r = g.bases[1]; g.bases[1] = null; g.bases[2] = r; moves.push({ from: 2, to: 3, out: false }); }
        ev.push({ t: "throwTo", base: 2 });
        ev.push({ t: "throwTo", base: 1 });
        ev.push({ t: "run", moves });
        ev.push({ t: "stamp", text: "ダブルプレー!!", color: "#57b8ff", big: true });
        fldTeam(g).morale = clamp(fldTeam(g).morale + 9, 0, 100);
        endAtBat(g);
        if (addOut(g, ev)) addOut(g, ev);
        return ev;
      }
      // 崩れて1つだけ
      const moves = [{ from: 1, to: 2, out: true, slide: true }, { from: 0, to: 1, out: false }];
      g.bases[0] = { sp: btype.s > 0 ? 2 : 0 };
      ev.push({ t: "throwTo", base: 2 });
      ev.push({ t: "run", moves });
      ev.push({ t: "stamp", text: "ゲッツー崩れ", color: "#8fa4c6" });
      endAtBat(g);
      addOut(g, ev);
      return ev;
    }
    // 本塁優先（3塁走者を刺す）
    if (g.bases[2] && d.throwTo === "home") {
      const goHome = d.shift === "in" ? true : g.outs < 2;
      if (goHome) {
        const outP = d.shift === "in" ? 0.62 : 0.42;
        const moves = [];
        if (rnd() < outP) {
          g.bases[2] = null;
          moves.push({ from: 3, to: 4, out: true, slide: true });
          if (!g.bases[0]) { g.bases[0] = { sp: 0 }; moves.push({ from: 0, to: 1, out: false }); }
          ev.push({ t: "throwTo", base: 4 });
          ev.push({ t: "run", moves });
          ev.push({ t: "stamp", text: "ホームタッチアウト！", color: "#57b8ff", big: true });
          fldTeam(g).morale = clamp(fldTeam(g).morale + 8, 0, 100);
          endAtBat(g);
          addOut(g, ev);
          return ev;
        }
        addRun(g, ev, 1);
        g.bases[2] = null;
        moves.push({ from: 3, to: 4, out: false, slide: true });
        if (!g.bases[0]) { g.bases[0] = { sp: 0 }; moves.push({ from: 0, to: 1, out: false }); }
        ev.push({ t: "throwTo", base: 4 });
        ev.push({ t: "run", moves });
        ev.push({ t: "stamp", text: "本塁セーフ！内野安打", color: "#3ec27b" });
        batTeam(g).hits++;
        endAtBat(g);
        return ev;
      }
    }
    // ふつうのゴロアウト（走者は進む）
    const moves = [{ from: 0, to: 1, out: true }];
    for (let b = 2; b >= 0; b--) if (g.bases[b]) {
      if (b === 2 && g.outs < 2) { addRun(g, ev, 1); moves.push({ from: 3, to: 4, out: false }); g.bases[2] = null; }
      else if (b < 2 && !g.bases[b + 1]) { g.bases[b + 1] = g.bases[b]; g.bases[b] = null; moves.push({ from: b + 1, to: b + 2, out: false }); }
    }
    ev.push({ t: "throwTo", base: 1 });
    ev.push({ t: "run", moves });
    ev.push({ t: "stamp", text: "ゴロアウト", color: "#8fa4c6" });
    endAtBat(g);
    addOut(g, ev);
    return ev;
  }

  /* フライアウト（タッチアップ判定） */
  const deep = qq > 0.34;
  ev.push({ t: "hit", a: spray, dist: deep ? 330 + rnd() * 40 : 190 + rnd() * 60, air: true, caught: true });
  ev.push({ t: "catch" });
  const moves = [{ from: 0, to: 0, out: true }];
  let tagged = false;
  if (g.bases[2] && g.outs < 2 && deep) {
    const attempt = o.run === "aggr" || (o.run === "norm" && qq > 0.4);
    if (attempt) {
      let p = 0.52 + qq * 0.5 + (g.bases[2].sp || 0) * 0.07 - (d.throwTo === "home" ? 0.12 : 0) + (d.shift === "deep" ? 0.1 : 0);
      ev.push({ t: "throwTo", base: 4 });
      if (rnd() < p) {
        addRun(g, ev, 1); tagged = true;
        moves.push({ from: 3, to: 4, out: false, slide: true });
        g.bases[2] = null;
      } else {
        moves.push({ from: 3, to: 4, out: true, slide: true });
        g.bases[2] = null;
        ev.push({ t: "run", moves });
        ev.push({ t: "stamp", text: "タッチアップ失敗！ダブルプレー", color: "#ff5e5e" });
        fldTeam(g).morale = clamp(fldTeam(g).morale + 8, 0, 100);
        endAtBat(g);
        if (addOut(g, ev)) addOut(g, ev);
        return ev;
      }
    }
  }
  ev.push({ t: "run", moves });
  ev.push({ t: "stamp", text: tagged ? "犠牲フライ！1点" : "フライアウト", color: tagged ? "#3ec27b" : "#8fa4c6" });
  endAtBat(g);
  addOut(g, ev);
  return ev;
}

/* 得点 */
function addRun(g, ev, n) {
  const bi = batIdx(g);
  g.score[bi][g.inning - 1] = (g.score[bi][g.inning - 1] || 0) + n;
  const t = g.teams[bi];
  t.morale = clamp(t.morale + 6 * n, 0, 100);
  g.teams[1 - bi].morale = clamp(g.teams[1 - bi].morale - 2 * n, 0, 100);
  ev.push({ t: "score", team: bi, n });
  // サヨナラ
  if (g.inning >= g.innings && g.half === 1 && runsOf(g, 1) > runsOf(g, 0)) {
    g.over = true; g.walkoff = true;
    ev.push({ t: "stamp", text: "サヨナラ!!", color: "#ffd23e", big: true });
    ev.push({ t: "end" });
  }
}
/* アウト＋チェンジ/試合終了処理。イニング継続なら true を返す */
function addOut(g, ev) {
  if (g.over) return false;
  g.outs++;
  if (g.outs >= 3) {
    // チェンジ
    g.outs = 0; g.balls = 0; g.strikes = 0; g.bases = [null, null, null]; g.abBuff = null;
    if (g.half === 0) {
      g.half = 1;
      // 最終回裏、後攻リードなら試合終了
      if (g.inning >= g.innings && runsOf(g, 1) > runsOf(g, 0)) { g.over = true; ev.push({ t: "end" }); return false; }
      ev.push({ t: "change" });
      g.score[1][g.inning - 1] = g.score[1][g.inning - 1] || 0;
    } else {
      // 1イニング終了
      if (g.inning >= g.innings) {
        if (runsOf(g, 0) !== runsOf(g, 1) || g.inning >= g.innings + 2) { g.over = true; ev.push({ t: "end" }); return false; }
        // 延長
        g.inning++;
        g.half = 0;
        g.score[0][g.inning - 1] = 0; g.score[1][g.inning - 1] = 0;
        ev.push({ t: "change", extra: true });
      } else {
        g.inning++; g.half = 0;
        g.score[0][g.inning - 1] = 0; g.score[1][g.inning - 1] = 0;
        ev.push({ t: "change" });
      }
    }
    return false;
  }
  return true;
}
/* 打席終了（打順を進める。3アウトめの処理より先に呼ぶこと） */
function endAtBat(g) {
  if (g.over) return;
  batTeam(g).bat++;
  g.balls = 0; g.strikes = 0; g.abBuff = null;
}

/* ══════════ ローカルの1球フロー ══════════ */
let talkDoneForAb = null;
async function nextPitch() {
  if (!G || G.over || flow.stop || flow.busy) return;
  flow.busy = true;
  renderScorebar();
  const g = G;
  const dTeam = fldTeam(g), oTeam = batTeam(g);
  const dHuman = isHumanTeam(dTeam), oHuman = isHumanTeam(oTeam);
  const bothHuman = dHuman && oHuman;
  const abKey = g.inning + "-" + g.half + "-" + batIdx(g) + "-" + oTeam.bat;

  // 作戦タイム（新しい打席・チーム戦のみ）
  if (setup.talk > 0 && g.balls === 0 && g.strikes === 0 && talkDoneForAb !== abKey &&
      (dTeam.members.filter((m) => !m.cpu).length >= 2 || oTeam.members.filter((m) => !m.cpu).length >= 2)) {
    talkDoneForAb = abKey;
    await talkTime();
    if (flow.stop) { flow.busy = false; return; }
  }
  talkDoneForAb = abKey;

  // 守備側
  let d;
  if (dHuman) {
    if (bothHuman) await gate("def", "🧤", dTeam.name + " のばん", "相手に見えないように端末を受け取ってタップ");
    if (flow.stop) { flow.busy = false; return; }
    d = await humanPanel("def", defDefault(g));
  } else {
    panelHTML('<div class="cpu-think">🤖 ' + esc(dTeam.name) + ' が配球を考え中<span class="dots"><i></i><i></i><i></i></span></div>');
    await wait(750);
    d = cpuDef(g);
  }
  if (flow.stop) { flow.busy = false; return; }

  // 攻撃側
  let o;
  if (oHuman) {
    if (bothHuman) await gate("off", "⚔", oTeam.name + " のばん", "相手に見えないように端末を受け取ってタップ");
    if (flow.stop) { flow.busy = false; return; }
    o = await humanPanel("off", offDefault());
  } else {
    panelHTML('<div class="cpu-think">🤖 ' + esc(oTeam.name) + ' が狙いを考え中<span class="dots"><i></i><i></i><i></i></span></div>');
    await wait(750);
    o = cpuOff(g);
  }
  if (flow.stop) { flow.busy = false; return; }

  await revealAndPlay(d, o);
  flow.busy = false;
  if (!flow.stop) {
    if (G.over) endGameLocal();
    else nextPitch();
  }
}
function gate(cls, ic, title, sub) {
  return new Promise((res) => {
    panelHTML(gateHTML(cls, ic, title, sub));
    $("gate-btn").onclick = () => { SFX.tap(); res(); };
  });
}
function talkTime() {
  return new Promise((res) => {
    let n = setup.talk;
    panelHTML('<div class="gate talk"><span class="g-ic">💬</span><span class="g-t">作戦タイム</span><span class="g-s">チームで相談しよう！「ここはストレートで押そう」「盗塁を警戒しよう」…</span><div class="g-count" id="talk-n">' + n + '</div><button class="g-skip" id="talk-skip">スキップ ▶</button></div>');
    const iv = setInterval(() => {
      n--;
      const el = $("talk-n");
      if (el) el.textContent = n;
      if (n <= 0) { clearInterval(iv); res(); }
    }, 1000);
    $("talk-skip").onclick = () => { clearInterval(iv); SFX.tap(); res(); };
  });
}
function humanPanel(kind, pick) {
  return new Promise((res) => {
    panelKind = kind;
    refreshPanel(pick);
    wirePanel(pick, kind === "def" ? applyDefKey : applyOffKey, () => { SFX.tap(); res(pick); });
  });
}

/* 同時公開 → 判定 → 演出 */
async function revealAndPlay(d, o) {
  const g = G;
  showVsCard(g, d, o);
  SFX.reveal();
  await wait(1500);
  const ev = resolvePitch(g, d, o);
  await playEvents(ev);
  panelHTML("");
  renderScorebar();
  if (ONLINE) return; // オンラインは呼び出し側が管理
}
function showVsCard(g, d, o) {
  const dT = fldTeam(g), oT = batTeam(g);
  let dm, om;
  if (d.tactic === "walk") dm = "🚶 敬遠";
  else if (d.tactic === "waste") dm = "⚠ ウエスト（外す）";
  else dm = PITCHES[d.pitch.type] + "<br>" + COURSES[d.pitch.course] + "・" + HEIGHTS[d.pitch.height] +
    (d.power === "full" ? "<br>🔥全力" : d.power === "soft" ? "<br>抜き球" : "") + (d.ws ? "<br>✨ウイニングショット" : "");
  if (d.shift !== "normal") dm += "<br><small>" + SHIFTS[d.shift] + "</small>";
  om = (o.tactic !== "none" ? { steal: "🏃盗塁！", bunt: "バント！", endrun: "エンドラン！" }[o.tactic] + "<br>" : "") +
    (o.tactic === "bunt" ? "" :
      (o.aimC < 0 && o.aimH < 0 ? "ぜんたい" : (o.aimC < 0 ? "ぜんたい" : COURSES[o.aimC]) + "・" + (o.aimH < 0 ? "ぜんたい" : HEIGHTS[o.aimH])) +
      "<br>" + SWINGS[o.swing]);
  panelHTML('<div class="vs-card">' +
    '<div class="vc def"><div class="t">🧤 ' + esc(dT.name) + '</div><div class="m">' + dm + "</div></div>" +
    '<div class="vsm">VS</div>' +
    '<div class="vc off"><div class="t">⚔ ' + esc(oT.name) + '</div><div class="m">' + om + "</div></div></div>");
}

/* ══════════ フィールド描画・演出 ══════════ */
const F = { cv: null, ctx: null, W: 760, H: 800, t: 0, anim: null, ball: null, fx: [], zonetimer: null };
const HOME = { x: 380, y: 640 }, MOUND = { x: 380, y: 528 };
const BASE_POS = [{ x: 380, y: 640 }, { x: 534, y: 486 }, { x: 380, y: 332 }, { x: 226, y: 486 }, { x: 380, y: 640 }]; // 0=打席,1,2,3,4=ホーム
const FIELDERS = {
  P: MOUND, C: { x: 380, y: 688 },
  "1B": { x: 552, y: 458 }, "2B": { x: 462, y: 388 }, SS: { x: 298, y: 388 }, "3B": { x: 208, y: 458 },
  LF: { x: 186, y: 252 }, CF: { x: 380, y: 192 }, RF: { x: 574, y: 252 },
};
function shiftFielders(shift) {
  const f = deep(FIELDERS);
  if (shift === "in") { ["1B", "2B", "SS", "3B"].forEach((k) => (f[k].y += 46)); }
  if (shift === "deep") { ["LF", "CF", "RF"].forEach((k) => (f[k].y -= 42)); }
  if (shift === "dp") { f["2B"].x -= 26; f.SS.x += 26; f["2B"].y -= 8; f.SS.y -= 8; }
  return f;
}
let curFielders = deep(FIELDERS);
let visBases = [null, null, null]; // 表示用走者（アニメ位置 {x,y,color}）
let batterVis = true;

function initField() {
  F.cv = $("field"); F.ctx = F.cv.getContext("2d");
  sizeField();
  window.addEventListener("resize", sizeField);
  curFielders = deep(FIELDERS);
  syncRunners();
  if (!F.loopOn) { F.loopOn = true; requestAnimationFrame(fieldLoop); }
}
function sizeField() {
  if (!F.cv) return;
  const wrap = $("field-wrap");
  const aw = wrap.clientWidth - 8, ah = wrap.clientHeight - 4;
  const s = Math.min(aw / F.W, ah / F.H) || 0.5;
  F.cv.width = F.W * (window.devicePixelRatio || 1) * 0.9;
  F.cv.height = F.H * (window.devicePixelRatio || 1) * 0.9;
  F.cv.style.width = F.W * s + "px";
  F.cv.style.height = F.H * s + "px";
  F.scale = (F.cv.width / F.W);
}
function syncRunners() {
  visBases = [null, null, null];
  if (!G) return;
  const c = batTeam(G).color;
  for (let b = 0; b < 3; b++) if (G.bases[b]) visBases[b] = { x: BASE_POS[b + 1].x, y: BASE_POS[b + 1].y, color: c };
}

function fieldLoop(ts) {
  F.t = ts;
  drawField();
  requestAnimationFrame(fieldLoop);
}

function drawField() {
  const c = F.ctx; if (!c) return;
  const s = F.scale || 1;
  c.setTransform(s, 0, 0, s, 0, 0);
  const t = F.t / 1000;
  // 背景（スタンド＆空）
  const sky = c.createLinearGradient(0, 0, 0, F.H);
  sky.addColorStop(0, "#8fd0ff"); sky.addColorStop(0.28, "#cdeaff"); sky.addColorStop(0.29, "#2e7d4f"); sky.addColorStop(1, "#39975f");
  c.fillStyle = sky; c.fillRect(0, 0, F.W, F.H);
  // 雲
  c.fillStyle = "rgba(255,255,255,.8)";
  for (let i = 0; i < 3; i++) {
    const cx = ((t * 12 + i * 260) % (F.W + 160)) - 80, cy = 42 + i * 34;
    c.beginPath(); c.ellipse(cx, cy, 46, 14, 0, 0, 7); c.ellipse(cx + 30, cy + 6, 30, 11, 0, 0, 7); c.fill();
  }
  // 観客席（きらめき）
  c.fillStyle = "#5b8bb4";
  c.fillRect(0, 176, F.W, 30);
  for (let i = 0; i < 40; i++) {
    const x = (i * 97) % F.W, ph = Math.sin(t * 2 + i * 1.7);
    c.fillStyle = ph > 0.86 ? "#ffe9a8" : "hsl(" + (i * 47) % 360 + ",42%," + (58 + ph * 6) + "%)";
    c.beginPath(); c.arc(x + 10, 186 + (i % 3) * 8, 4, 0, 7); c.fill();
  }
  // 外野フェンス
  c.strokeStyle = "#1c5637"; c.lineWidth = 14;
  c.beginPath(); c.arc(HOME.x, HOME.y, 436, Math.PI * 1.24, Math.PI * 1.76); c.stroke();
  c.strokeStyle = "#ffd23e"; c.lineWidth = 3;
  c.beginPath(); c.arc(HOME.x, HOME.y, 429, Math.PI * 1.24, Math.PI * 1.76); c.stroke();
  // 芝の模様
  c.save();
  c.beginPath(); c.arc(HOME.x, HOME.y, 430, Math.PI * 1.22, Math.PI * 1.78); c.lineTo(HOME.x, HOME.y); c.clip();
  for (let r = 430; r > 100; r -= 55) {
    c.fillStyle = (r / 55 | 0) % 2 ? "rgba(255,255,255,.045)" : "rgba(0,0,0,.03)";
    c.beginPath(); c.arc(HOME.x, HOME.y, r, Math.PI, Math.PI * 2); c.arc(HOME.x, HOME.y, r - 55, Math.PI * 2, Math.PI, true); c.fill();
  }
  c.restore();
  // 内野ダート
  c.fillStyle = "#c8945a";
  c.beginPath(); c.arc(HOME.x, HOME.y, 236, Math.PI * 1.14, Math.PI * 1.86); c.lineTo(HOME.x + 60, HOME.y + 18); c.arc(HOME.x, HOME.y + 8, 62, 0.2, Math.PI - 0.2, false); c.closePath(); c.fill();
  // ダイヤ芝
  c.fillStyle = "#3aa367";
  c.beginPath();
  c.moveTo(HOME.x, HOME.y - 34);
  c.lineTo(BASE_POS[1].x - 26, BASE_POS[1].y);
  c.lineTo(BASE_POS[2].x, BASE_POS[2].y + 30);
  c.lineTo(BASE_POS[3].x + 26, BASE_POS[3].y);
  c.closePath(); c.fill();
  // ベースパス
  c.strokeStyle = "#e8d9c2"; c.lineWidth = 10; c.lineJoin = "round";
  c.beginPath();
  c.moveTo(HOME.x, HOME.y); c.lineTo(BASE_POS[1].x, BASE_POS[1].y); c.lineTo(BASE_POS[2].x, BASE_POS[2].y); c.lineTo(BASE_POS[3].x, BASE_POS[3].y); c.closePath(); c.stroke();
  // ファウルライン
  c.strokeStyle = "#fff"; c.lineWidth = 4;
  c.beginPath(); c.moveTo(HOME.x, HOME.y);
  c.lineTo(HOME.x + 320, HOME.y - 320); c.moveTo(HOME.x, HOME.y); c.lineTo(HOME.x - 320, HOME.y - 320); c.stroke();
  // マウンド
  c.fillStyle = "#c8945a"; c.beginPath(); c.arc(MOUND.x, MOUND.y, 26, 0, 7); c.fill();
  c.fillStyle = "#fff"; c.fillRect(MOUND.x - 8, MOUND.y - 2, 16, 4);
  // ベース
  for (let b = 1; b <= 3; b++) {
    c.save(); c.translate(BASE_POS[b].x, BASE_POS[b].y); c.rotate(Math.PI / 4);
    c.fillStyle = "#fff"; c.shadowColor = "rgba(0,0,0,.25)"; c.shadowBlur = 4;
    c.fillRect(-9, -9, 18, 18); c.restore();
  }
  // ホームベース
  c.fillStyle = "#fff";
  c.beginPath(); c.moveTo(HOME.x - 10, HOME.y - 6); c.lineTo(HOME.x + 10, HOME.y - 6); c.lineTo(HOME.x + 10, HOME.y + 4); c.lineTo(HOME.x, HOME.y + 12); c.lineTo(HOME.x - 10, HOME.y + 4); c.closePath(); c.fill();
  // バッターボックス
  c.strokeStyle = "rgba(255,255,255,.7)"; c.lineWidth = 2;
  c.strokeRect(HOME.x - 40, HOME.y - 22, 24, 40); c.strokeRect(HOME.x + 16, HOME.y - 22, 24, 40);

  const fcol = G ? fldTeam(G).color : "#888";
  const bcol = G ? batTeam(G).color : "#555";
  // 野手
  for (const k in curFielders) {
    const p = curFielders[k];
    const bob = Math.sin(t * 2.2 + p.x) * 2;
    drawPlayer(c, p.x, p.y + bob, fcol, false, k === "P" ? t : 0);
  }
  // 打者
  if (batterVis) {
    const bob = Math.sin(t * 3) * 1.5;
    drawPlayer(c, HOME.x - 27, HOME.y - 4 + bob, bcol, true);
  }
  // 走者（塁上＋走塁中）
  visBases.forEach((r) => { if (r) drawPlayer(c, r.x, r.y - 4, r.color, true); });
  RUN_LAYER.forEach((r) => drawPlayer(c, r.x, r.y - 4, r.color, true));
  // エフェクト
  F.fx = F.fx.filter((p) => {
    p.x += p.vx; p.y += p.vy; p.vy += p.g || 0; p.life -= 1;
    c.globalAlpha = clamp(p.life / p.max, 0, 1);
    c.fillStyle = p.c;
    if (p.star) {
      c.save(); c.translate(p.x, p.y); c.rotate(p.life * 0.2);
      c.fillRect(-p.r, -p.r / 3, p.r * 2, p.r / 1.5); c.fillRect(-p.r / 3, -p.r, p.r / 1.5, p.r * 2); c.restore();
    } else { c.beginPath(); c.arc(p.x, p.y, p.r, 0, 7); c.fill(); }
    c.globalAlpha = 1;
    return p.life > 0;
  });
  // ボール
  if (F.ball) {
    const b = F.ball;
    // 影
    if (b.h != null) {
      c.fillStyle = "rgba(0,0,0,.22)";
      c.beginPath(); c.ellipse(b.x, b.gy != null ? b.gy : b.y + b.h, 8, 3.4, 0, 0, 7); c.fill();
    }
    // トレイル
    if (b.trail) {
      b.trail.forEach((p, i) => {
        c.globalAlpha = i / b.trail.length * 0.5;
        c.fillStyle = "#fff"; c.beginPath(); c.arc(p.x, p.y, 4.4, 0, 7); c.fill();
      });
      c.globalAlpha = 1;
    }
    c.fillStyle = "#fff";
    c.shadowColor = "rgba(0,0,0,.3)"; c.shadowBlur = 3;
    c.beginPath(); c.arc(b.x, b.y, b.r || 6, 0, 7); c.fill();
    c.shadowBlur = 0;
    c.strokeStyle = "#e0455e"; c.lineWidth = 1.2;
    c.beginPath(); c.arc(b.x, b.y, (b.r || 6) * 0.6, 0.6, 2.3); c.stroke();
    c.beginPath(); c.arc(b.x, b.y, (b.r || 6) * 0.6, 3.7, 5.4); c.stroke();
  }
}
function drawPlayer(c, x, y, col, batter, spin) {
  c.save(); c.translate(x, y);
  // 体
  c.fillStyle = col;
  c.beginPath(); c.roundRect ? c.roundRect(-7, -6, 14, 18, 6) : c.rect(-7, -6, 14, 18); c.fill();
  // 頭
  c.fillStyle = "#ffe0c2"; c.beginPath(); c.arc(0, -12, 7, 0, 7); c.fill();
  // 帽子
  c.fillStyle = col; c.beginPath(); c.arc(0, -14, 7, Math.PI, Math.PI * 2); c.fill();
  c.fillRect(-8, -14, 16, 2.4);
  if (batter) { // バット
    c.strokeStyle = "#d8a05e"; c.lineWidth = 3.4; c.lineCap = "round";
    c.beginPath(); c.moveTo(6, -8); c.lineTo(15, -20); c.stroke();
  }
  c.restore();
}
function burst(x, y, col, n, star) {
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2, v = 1 + rnd() * 3.4;
    F.fx.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, g: 0.08, r: 2 + rnd() * 3, c: col, life: 34 + rnd() * 20, max: 50, star });
  }
}

/* ── スタンプ・ゾーン ── */
function stampShow(text, color, big) {
  const el = $("stamp");
  el.textContent = text;
  el.style.color = color || "#fff";
  el.style.fontSize = big ? "clamp(40px,11vw,80px)" : "";
  el.classList.remove("hidden", "out2");
  void el.offsetWidth;
  el.classList.add("show");
}
function stampHide() {
  const el = $("stamp");
  el.classList.remove("show");
  el.classList.add("out2");
  setTimeout(() => el.classList.add("hidden"), 400);
}
function zoneShow(d, aimC, aimH, zc, zr, isBall, label) {
  const zp = $("zone-pop");
  let cells = "";
  for (let r = 0; r < 3; r++) for (let cc = 0; cc < 3; cc++) {
    const aim = (aimC === -1 || aimC === cc) && (aimH === -1 || aimH === r) && !(aimC === -1 && aimH === -1);
    const hit = !isBall && zc === cc && zr === r;
    cells += "<i class=\"" + (aim ? "aim " : "") + (hit ? "hit" : "") + "\">" + (hit ? '<span class="dot"></span>' : "") + "</i>";
  }
  zp.innerHTML = '<div class="zp-t">配球 × 狙い</div><div class="zone-grid">' + cells + "</div>" +
    '<div class="zp-b" style="color:' + (isBall ? "#57b8ff" : "#ffd977") + '">' + esc(label) + (isBall ? "（ボール球）" : "") + "</div>";
  zp.classList.remove("hidden");
  clearTimeout(F.zonetimer);
  F.zonetimer = setTimeout(() => zp.classList.add("hidden"), 2600);
}

/* ── イベント再生 ── */
function ptAtDistAngle(a, dist) {
  const rad = (a * Math.PI) / 180;
  return { x: HOME.x + Math.cos(rad) * dist, y: HOME.y - Math.sin(rad) * dist };
}
async function animBall(from, to, ms, curve, air) {
  return new Promise((res) => {
    const t0 = performance.now();
    const trail = [];
    function step(ts) {
      const p = clamp((ts - t0) / ms, 0, 1);
      const e = air ? p : p; // linear ok
      let x = from.x + (to.x - from.x) * e;
      let y = from.y + (to.y - from.y) * e;
      if (curve) x += Math.sin(p * Math.PI) * curve;
      let h = 0;
      if (air) h = -Math.sin(p * Math.PI) * (air === true ? 90 : air);
      trail.push({ x, y: y + h });
      if (trail.length > 7) trail.shift();
      F.ball = { x, y: y + h, gy: y, h: air ? -h : null, trail: trail.slice(), r: air ? 6 + Math.sin(p * Math.PI) * 3 : 5.4 };
      if (p < 1) requestAnimationFrame(step);
      else res();
    }
    requestAnimationFrame(step);
  });
}
/* 走者アニメを複数並行して回すため、visBases とは別レイヤーで管理する */
const RUN_LAYER = [];
function animRunnerLayer(mv, ms, color) {
  return new Promise((res) => {
    const t0 = performance.now();
    const path = [];
    const from = Math.max(0, mv.from), to = Math.min(4, mv.to);
    for (let b = from; b <= to; b++) path.push(BASE_POS[b]);
    if (path.length < 2) path.push(BASE_POS[to]);
    const col = color || (batTeam(G) ? batTeam(G).color : "#f55");
    const tok = { x: path[0].x, y: path[0].y, color: col };
    RUN_LAYER.push(tok);
    if (from >= 1 && from <= 3) visBases[from - 1] = null;
    function step(ts) {
      const p = clamp((ts - t0) / ms, 0, 1);
      const fseg = p * (path.length - 1);
      const seg = Math.min(path.length - 2, Math.floor(fseg));
      const lp = fseg - seg;
      tok.x = path[seg].x + (path[seg + 1].x - path[seg].x) * lp;
      tok.y = path[seg].y + (path[seg + 1].y - path[seg].y) * lp;
      if (p < 1) requestAnimationFrame(step);
      else {
        RUN_LAYER.splice(RUN_LAYER.indexOf(tok), 1);
        if (mv.out) {
          burst(tok.x, tok.y, "#dfe8f4", 12);
          SFX.out();
        } else if (to >= 1 && to <= 3) {
          visBases[to - 1] = { x: BASE_POS[to].x, y: BASE_POS[to].y, color: col };
          if (mv.slide) burst(tok.x, tok.y, "#e8d9c2", 8);
        } else if (to === 4) {
          burst(HOME.x, HOME.y, col, 16, true);
        }
        res();
      }
    }
    requestAnimationFrame(step);
  });
}

async function playEvents(ev) {
  batterVis = true;
  for (const e of ev) {
    if (flow.stop) return;
    if (e.t === "note") { toast(e.text, "#22344d"); await wait(700); }
    else if (e.t === "zone") {
      if (e.aimC !== -9) zoneShow(null, e.aimC, e.aimH, e.zc, e.zr, e.ball, e.label);
    }
    else if (e.t === "pitch") {
      // シフト反映
      curFielders = shiftFielders(e.shift || "normal");
      renderScorebar();
      const zx = HOME.x + (e.ball ? (rnd() < 0.5 ? -1 : 1) * 44 : (e.zc - 1) * 20);
      const zy = HOME.y - 8 + (e.ball ? (rnd() < 0.5 ? -1 : 1) * 26 : (e.zr - 1) * 14);
      SFX.pitch();
      const curve = e.type === "sl" ? 26 : e.type === "cv" ? -30 : e.type === "fk" ? 8 : 0;
      await animBall(MOUND, { x: zx, y: zy }, e.type === "cv" ? 640 : e.type === "st" ? 380 : 500, curve, false);
      SFX.catchB();
    }
    else if (e.t === "swing") {
      if (e.kind === "take") { /* 何もしない */ }
      else if (e.kind === "miss") { SFX.miss(); burst(HOME.x - 16, HOME.y - 10, "#cfe3ff", 6); }
      else { SFX.crack(); burst(HOME.x - 10, HOME.y - 12, "#ffd23e", e.kind === "foul" ? 8 : 14, e.power); }
      await wait(160);
    }
    else if (e.t === "call") {
      if (/ストライク|空振り/.test(e.text)) SFX.strike(); else if (/ボール|敬遠/.test(e.text)) SFX.ball();
      stampShow(e.text, e.color);
      await wait(700);
      stampHide();
    }
    else if (e.t === "foul") {
      const to = { x: HOME.x + e.side * (200 + rnd() * 120), y: HOME.y - 140 - rnd() * 120 };
      await animBall(HOME, to, 620, 0, 70);
      F.ball = null;
      await wait(150);
    }
    else if (e.t === "hit") {
      const to = ptAtDistAngle(e.a, e.dist);
      const dur = e.air ? clamp(e.dist * 2.1, 500, 1150) : clamp(e.dist * 2.4, 420, 800);
      await animBall(HOME, to, dur, 0, e.air ? clamp(e.dist * 0.28, 40, 130) : 0);
      if (e.hr) {
        SFX.hr();
        burst(to.x, to.y, "#ffd23e", 30, true);
        burst(to.x, to.y, "#ff8ab8", 20, true);
        F.ball = null;
      } else if (e.roll) {
        // ころがる
        const to2 = ptAtDistAngle(e.a, e.dist + 46);
        await animBall(to, to2, 300, 0, false);
      }
    }
    else if (e.t === "catch") { SFX.catchB(); if (F.ball) burst(F.ball.x, F.ball.y, "#fff", 8); await wait(180); }
    else if (e.t === "throwTo") {
      const from = F.ball ? { x: F.ball.x, y: F.ball.y } : MOUND;
      const to = BASE_POS[e.base === 4 ? 4 : e.base];
      SFX.pitch();
      await animBall(from, to, 360, 0, 26);
      SFX.catchB();
    }
    else if (e.t === "run") {
      batterVis = false;
      const jobs = (e.moves || []).map((mv) => animRunnerLayer(mv, 520 + Math.abs(mv.to - mv.from) * 200, e.color));
      await Promise.all(jobs);
      await wait(120);
    }
    else if (e.t === "stamp") {
      stampShow(e.text, e.color, e.big);
      if (/ヒット|成功|セーフ|犠牲/.test(e.text)) SFX.hit();
      if (/ホームラン|サヨナラ/.test(e.text)) SFX.cheer();
      if (/アウト|三振|失敗|ゲッツー|ダブル/.test(e.text)) SFX.out();
      await wait(e.big ? 1350 : 950);
      stampHide();
    }
    else if (e.t === "score") {
      SFX.cheer();
      renderScorebar();
      await wait(250);
    }
    else if (e.t === "change") {
      SFX.change();
      stampShow(e.extra ? "延長戦へ！" : "チェンジ！", "#8fd4ff");
      await wait(1100);
      stampHide();
      F.ball = null;
      syncRunners();
      renderScorebar();
    }
    else if (e.t === "end") { /* 呼び出し側が処理 */ }
  }
  F.ball = null;
  batterVis = true;
  syncRunners();
  renderScorebar();
}

/* ══════════ 試合終了 ══════════ */
function lineTable(g) {
  const inns = Math.max(g.score[0].length, g.score[1].length);
  let h = "<table><tr><th></th>";
  for (let i = 0; i < inns; i++) h += "<th>" + (i + 1) + "</th>";
  h += "<th>R</th><th>H</th></tr>";
  for (let t = 0; t < 2; t++) {
    h += '<tr><td class="tn" style="color:' + g.teams[t].color + '">' + esc(g.teams[t].name) + "</td>";
    for (let i = 0; i < inns; i++) {
      const v = g.score[t][i];
      h += "<td>" + (v == null ? "-" : v) + "</td>";
    }
    h += '<td class="tot">' + runsOf(g, t) + "</td><td>" + g.teams[t].hits + "</td></tr>";
  }
  return h + "</table>";
}
function endGameLocal() {
  const g = G;
  const r0 = runsOf(g, 0), r1 = runsOf(g, 1);
  const winner = r0 > r1 ? 0 : r1 > r0 ? 1 : -1;
  showResult(g, winner, null);
  // 賞金（紐づけ済みプレイヤー）
  if (!g.rewarded) {
    g.rewarded = true;
    awardLocalPrizes(g, winner);
  }
}
function awardLocalPrizes(g, winner) {
  if (!window.GameLink || !window.GameLink.whenFB) return;
  const rows = [];
  g.teams.forEach((t, ti) => {
    t.members.forEach((m) => {
      if (!m.uid) return;
      const amt = winner === -1 ? PRIZE_LOCAL.draw : ti === winner ? PRIZE_LOCAL.win : PRIZE_LOCAL.lose;
      rows.push({ uid: m.uid, name: m.name, amount: amt, label: winner === -1 ? "引き分け" : ti === winner ? "勝利" : "敢闘" });
    });
  });
  if (!rows.length) return;
  /* XEVARION スターターミッション（試合を1回終えたら達成） */
  try { if (window.XEVA && XEVA.completeMission) XEVA.completeMission("magidiamond_play"); } catch (e) {}
  GameLink.whenFB().then((FB) => {
    if (!FB || !FB.awardXeva) return;
    Promise.all(rows.map((r) => FB.awardXeva(r.uid, r.amount, r.label + " 賞金（MagiDiamond）"))).then(() => {
      $("res-prize").innerHTML = "💰 XEVA賞金（ポータルで受取）<br>" + rows.map((r) => esc(r.name) + "：<b>+" + r.amount + " XEVA</b>（" + r.label + "）").join("<br>");
    });
  });
}
function showResult(g, winner, prizes) {
  const r0 = runsOf(g, 0), r1 = runsOf(g, 1);
  $("res-emoji").textContent = winner === -1 ? "🤝" : "🏆";
  $("res-title").textContent = winner === -1 ? "引き分け！" : g.teams[winner].name + " の勝利！";
  $("res-sub").innerHTML = (g.walkoff ? "劇的サヨナラ勝ち！<br>" : "") + esc(g.teams[0].name) + " " + r0 + " - " + r1 + " " + esc(g.teams[1].name);
  $("res-line").innerHTML = lineTable(g);
  $("res-stats").innerHTML = g.teams.map((t) =>
    '<span style="color:' + t.color + '">' + esc(t.name) + "</span><span>安打" + t.hits + "・HR" + t.hrs + "・盗塁" + t.steals + "</span>"
  ).join("");
  $("res-prize").innerHTML = prizes || "";
  $("result").classList.remove("hidden");
  SFX.cheer();
}
$("play-again").addEventListener("click", () => {
  $("result").classList.add("hidden");
  if (ONLINE) { backToSetupFromOnline(); return; }
  const A = setup.players.filter((p) => p.team === 0), B = setup.players.filter((p) => p.team === 1);
  G = newGame([A, B], setup.innings);
  talkDoneForAb = null;
  startMatch();
});
$("back-setup").addEventListener("click", () => {
  $("result").classList.add("hidden");
  if (ONLINE) { backToSetupFromOnline(); return; }
  G = null; flow.stop = true;
  showScreen("setup");
});

/* ══════════ メニュー ══════════ */
$("menu-btn").addEventListener("click", () => { $("menu-modal").classList.remove("hidden"); });
$("mn-resume").addEventListener("click", () => $("menu-modal").classList.add("hidden"));
$("mn-rules").addEventListener("click", () => { $("menu-modal").classList.add("hidden"); openRules(); });
$("mn-quit").addEventListener("click", () => {
  if (!confirm("試合をやめて設定にもどりますか？")) return;
  $("menu-modal").classList.add("hidden");
  if (ONLINE) { if (ONLINE.host && window.MDOnline) MDOnline.abort(); backToSetupFromOnline(); return; }
  flow.stop = true; G = null;
  showScreen("setup");
});
$("sfx-btn").addEventListener("click", () => {
  SFX.setOn(!SFX.isOn());
  $("sfx-btn").textContent = SFX.isOn() ? "🔊" : "🔇";
});

/* ══════════ あそびかた ══════════ */
const TUT = [
  { cap: "MagiDiamondは<b>「読み合い」で勝つ野球盤</b>。<br>守備側は<b>配球</b>、攻撃側は<b>狙い</b>をこっそり決めて<b>同時公開</b>！", stage: '<span style="font-size:42px"><span class="tut-ball">⚾</span> 🆚 🏏</span>' },
  { cap: "守備側は <b>球種・コース・高さ・力配分</b> を選ぶ。<br>決め球<b>✨ウイニングショット</b>は1試合3回だけ！", stage: '<span style="font-size:30px">🧤 スライダー・外角・低め</span>' },
  { cap: "攻撃側は <b>狙いコース・高さ</b> と <b>スイング</b> を選ぶ。<br>狙いが当たれば打率も飛距離も大幅アップ！<br>ハズレると空振りしやすい…", stage: '<span style="font-size:30px">🎯 外角・低めを強振！</span>' },
  { cap: "<b>監督</b>はシフト・敬遠・盗塁・バント・代打などの采配と、<br>1試合1回の<b>チームスキル</b>（勝負師・鉄壁守備など）を使える！", stage: '<span style="font-size:36px">🎩 「ここは勝負だ！」</span>' },
  { cap: "<b>守備担当</b>は打球がきたときの送球先（併殺・一塁・本塁）、<br><b>走塁担当</b>は走塁方針（慎重〜積極的）を決める。<br>全員が毎球なにかを決める！", stage: '<span style="font-size:34px">🧤→②→① ／ 🏃💨</span>' },
  { cap: "2人なら1人ずつ全役割を担当。3〜6人なら<b>チーム戦</b>で役割分担！<br>打席前の<b>作戦タイム</b>でチーム相談しよう。", stage: '<span style="font-size:32px">👥 vs 👥👥<br>💬「盗塁を警戒しよう」</span>' },
  { cap: "得点や好プレーで<b>チーム士気🔥</b>が上がり能力アップ。<br>イニング終了時に得点が多いチームの勝ち！<br>XEVARIONアカウントを紐づけると<b>XEVA賞金</b>も！", stage: '<span style="font-size:38px">🔥🏆💰</span>' },
];
let tutIdx = 0;
function openRules() { tutIdx = 0; renderTut(); $("rules").classList.remove("hidden"); }
function renderTut() {
  $("tut-n").textContent = tutIdx + 1;
  $("tut-total").textContent = TUT.length;
  $("tut-stage").innerHTML = TUT[tutIdx].stage;
  $("tut-cap").innerHTML = TUT[tutIdx].cap;
  $("tut-prev").disabled = tutIdx === 0;
  $("tut-next").textContent = tutIdx === TUT.length - 1 ? "とじる ✔" : "つぎへ ▶";
}
$("show-rules").addEventListener("click", openRules);
$("tut-x").addEventListener("click", () => $("rules").classList.add("hidden"));
$("tut-prev").addEventListener("click", () => { if (tutIdx > 0) { tutIdx--; renderTut(); } });
$("tut-next").addEventListener("click", () => {
  if (tutIdx >= TUT.length - 1) { $("rules").classList.add("hidden"); return; }
  tutIdx++; renderTut();
});

/* ══════════ オンライン（2台対戦） ══════════ */
let olInnings = 3;
function myAccount() {
  try {
    const a = JSON.parse(localStorage.getItem("xeva_account_v1") || "null");
    if (!a || !a.xvUid) return null;
    return { uid: a.xvUid, name: a.name || "プレイヤー", charFile: a.charFile || "" };
  } catch (e) { return null; }
}
$("open-online").addEventListener("click", () => {
  showScreen("online");
  $("ol-msg").textContent = "";
});
$("ol-back").addEventListener("click", () => { leaveOnline(); showScreen("setup"); });
segWire("ol-inning-seg", "i", (v) => { olInnings = +v; });

function whenOnline() {
  return new Promise((res) => {
    if (window.MDOnline) return res(window.MDOnline);
    window.addEventListener("mdonline:ready", () => res(window.MDOnline), { once: true });
    setTimeout(() => res(window.MDOnline || null), 7000);
  });
}
$("ol-create").addEventListener("click", async () => {
  const acc = myAccount();
  if (!acc) { $("ol-msg").textContent = "ポータルでアカウント登録（4桁パスワード設定）が必要です。"; return; }
  $("ol-msg").textContent = "";
  $("ol-create").disabled = true;
  const OL = await whenOnline();
  if (!OL) { $("ol-msg").textContent = "オンライン機能を読み込めませんでした。"; $("ol-create").disabled = false; return; }
  const res = await OL.createRoom(acc, { innings: olInnings });
  $("ol-create").disabled = false;
  if (res.error) { $("ol-msg").textContent = res.error === "denied" ? "サーバー設定が必要です（DBルール）。" : "部屋を作れませんでした。通信環境を確認してください。"; return; }
  enterLobby(res.code, acc, true);
});
$("ol-join-btn").addEventListener("click", async () => {
  const acc = myAccount();
  if (!acc) { $("ol-msg").textContent = "ポータルでアカウント登録（4桁パスワード設定）が必要です。"; return; }
  const code = ($("ol-code").value || "").trim();
  if (!/^\d{4}$/.test(code)) { $("ol-msg").textContent = "4桁の部屋番号を入力してください。"; return; }
  $("ol-msg").textContent = "";
  $("ol-join-btn").disabled = true;
  const OL = await whenOnline();
  if (!OL) { $("ol-msg").textContent = "オンライン機能を読み込めませんでした。"; $("ol-join-btn").disabled = false; return; }
  const res = await OL.joinRoom(code, acc);
  $("ol-join-btn").disabled = false;
  if (res.error) {
    $("ol-msg").textContent = res.error === "nofound" ? "その部屋番号は見つかりません。" : res.error === "full" ? "その部屋は満員です。" : res.error === "started" ? "その部屋はすでに開始しています。" : res.error === "denied" ? "サーバー設定が必要です（DBルール）。" : "参加できませんでした。";
    return;
  }
  enterLobby(code, acc, false);
});
let olRoom = null, olStarted = false;
function enterLobby(code, acc, host) {
  ONLINE = { code, myUid: acc.uid, host, mySide: host ? 0 : 1 };
  olStarted = false;
  $("ol-home").classList.add("hidden");
  $("ol-lobby").classList.remove("hidden");
  $("ol-sticky").classList.remove("hidden");
  $("ol-roomnum").textContent = code;
  $("ol-start").classList.toggle("hidden", !host);
  $("ol-wait").classList.toggle("hidden", host);
  const OL = window.MDOnline;
  OL.watchRoom((room) => {
    olRoom = room;
    if (!room) {
      if (!olStarted) { toast("部屋が解散されました", "#e0455e"); leaveOnline(); showScreen("online"); }
      return;
    }
    if (room.meta && room.meta.status === "aborted") {
      toast("ホストが対戦を中断しました", "#e0455e");
      backToSetupFromOnline();
      return;
    }
    renderLobby(room);
    // ゲーム中の相手切断表示
    if (olStarted && G) {
      const others = Object.keys(room.players || {}).filter((u) => u !== ONLINE.myUid);
      const off = others.some((u) => room.players[u].online === false);
      $("conn-bar").classList.toggle("hidden", !off);
      $("conn-bar").textContent = off ? "📡 相手の接続が切れました…復帰を待っています" : "";
    }
  });
  OL.watchState(onOnlineState);
  OL.watchConnected((ok) => {
    if (!olStarted) return;
    if (!ok) { $("conn-bar").classList.remove("hidden"); $("conn-bar").textContent = "📡 通信が切れています…再接続中"; }
    else $("conn-bar").classList.add("hidden");
  });
  if (host) OL.watchPicks(onHostPicks);
}
function renderLobby(room) {
  const ps = Object.entries(room.players || {}).sort((a, b) => (a[1].side || 0) - (b[1].side || 0));
  $("ol-players").innerHTML = ps.map(([uid, p]) =>
    '<div class="ol-row">' +
    /* 保存された charFile は移籍前の古いパスのことがあるので正規化してから使う */
    (p.charFile ? '<img src="../chars/' + esc((window.XEVA && window.XEVA.canonCharFile) ? window.XEVA.canonCharFile(p.charFile, p.charId) : p.charFile) + '" onerror="this.style.visibility=\'hidden\'">' : "<img style='visibility:hidden'>") +
    '<span class="n">' + esc(p.name) + "</span>" +
    (uid === room.meta.host ? '<span class="hb">ホスト</span>' : "") +
    (p.online === false ? '<span class="off">切断中</span>' : "") +
    "</div>"
  ).join("") || '<p class="seg-note">参加を待っています…</p>';
  if (ONLINE && ONLINE.host) $("ol-start").disabled = ps.length < 2;
}
$("ol-start").addEventListener("click", async () => {
  if (!olRoom || Object.keys(olRoom.players || {}).length < 2) { toast("2人そろってから開始できます"); return; }
  const OL = window.MDOnline;
  // チーム編成：先攻=ゲスト / 後攻=ホスト（部屋主のホームゲーム）
  const ps = Object.entries(olRoom.players).sort((a, b) => (a[1].side || 0) - (b[1].side || 0));
  const host = ps.find(([u]) => u === olRoom.meta.host), guest = ps.find(([u]) => u !== olRoom.meta.host);
  const mk = ([uid, p]) => [{ name: p.name, cpu: false, uid, link: null }];
  const g = newGame([mk(guest), mk(host)], olRoom.meta.innings || 3);
  g.teams[0].name = guest[1].name + "チーム"; g.teams[0].uid = guest[0];
  g.teams[1].name = host[1].name + "チーム"; g.teams[1].uid = host[0];
  g.teams[0].members[0].uid = guest[0];
  g.teams[1].members[0].uid = host[0];
  await OL.startGame({ seq: 0, g, ev: null, ts: Date.now() });
});
let olSeq = -1, olPickSubmitted = -1;
function myTeamIdx() { return G && ONLINE ? (G.teams[0].uid === ONLINE.myUid ? 0 : 1) : 0; }
/* Firebase は null / 空配列を保存しないため、受信した試合状態を復元する */
function fbArr(v) {
  if (Array.isArray(v)) return v;
  const out = [];
  if (v && typeof v === "object") for (const k in v) out[+k] = v[k];
  return out;
}
function normalizeG(g) {
  if (!g) return g;
  const b = g.bases || {};
  g.bases = [b[0] || null, b[1] || null, b[2] || null];
  g.score = fbArr(g.score);
  g.score[0] = fbArr(g.score[0]); g.score[1] = fbArr(g.score[1]);
  if (g.abBuff == null) g.abBuff = null;
  g.teams = fbArr(g.teams);
  g.teams.forEach((t) => { t.members = fbArr(t.members); t.used = t.used || {}; });
  return g;
}
function normalizeDef(d) {
  const base = defDefault(G);
  const out = Object.assign(base, d || {});
  out.pitch = Object.assign({ type: "st", course: 1, height: 1 }, (d && d.pitch) || {});
  if (out.skill === undefined) out.skill = null;
  return out;
}
function normalizeOff(o) {
  const out = Object.assign(offDefault(), o || {});
  if (out.skill === undefined) out.skill = null;
  return out;
}
function onOnlineState(st) {
  if (!st || !ONLINE) return;
  if (st.prizes && $("result") && !$("result").classList.contains("hidden")) {
    $("res-prize").innerHTML = "💰 XEVA賞金（ポータルで受取）<br>" + st.prizes.map((r) => esc(r.name) + "：<b>+" + r.amount + " XEVA</b>（" + r.label + "）").join("<br>");
    return;
  }
  if (st.seq <= olSeq) return;
  const first = olSeq < 0;
  olSeq = st.seq;
  if (first) {
    // ゲーム開始
    olStarted = true;
    G = normalizeG(st.g);
    startMatch();
    return;
  }
  // 演出 → 状態確定 → 次の選択へ
  playOnlineStep(st);
}
async function playOnlineStep(st) {
  if (flow.busy) { pendingOnline = st; return; }
  flow.busy = true;
  panelHTML("");
  if (st.reveal) showVsCard(G, normalizeDef(st.reveal.d), normalizeOff(st.reveal.o));
  SFX.reveal();
  await wait(1500);
  if (st.ev) await playEvents(fbArr(st.ev));
  G = normalizeG(st.g);
  syncRunners();
  renderScorebar();
  flow.busy = false;
  if (G.over) { endGameOnline(); return; }
  onlinePromptPicks();
}
let pendingOnline = null;
async function onlinePromptPicks() {
  if (!G || !ONLINE || G.over) return;
  renderScorebar();
  const mySide = myTeamIdx();
  const amBatting = batIdx(G) === mySide;
  const role = amBatting ? "off" : "def";
  const pick = amBatting ? offDefault() : defDefault(G);
  panelKind = role;
  const p = await humanPanel(role, pick);
  if (!ONLINE || !G || G.over) return;
  olPickSubmitted = G.seq;
  panelHTML('<div class="cpu-think">📡 相手の作戦を待っています<span class="dots"><i></i><i></i><i></i></span></div>');
  window.MDOnline.submitPick(G.seq, role, p);
}
function onHostPicks(picks) {
  if (!ONLINE || !ONLINE.host || !G || G.over || !olStarted) return;
  if (!picks) return;
  const p = picks[G.seq];
  if (!p || !p.def || !p.off) return;
  if (hostResolving) return;
  hostResolving = true;
  const g2 = normalizeG(deep(G));
  g2.seq = G.seq + 1;
  const ev = resolvePitch(g2, normalizeDef(deep(p.def)), normalizeOff(deep(p.off)));
  window.MDOnline.pushState({ seq: g2.seq, g: g2, ev, reveal: { d: p.def, o: p.off }, ts: Date.now() }, G.seq)
    .finally(() => { hostResolving = false; });
}
let hostResolving = false;
function endGameOnline() {
  const g = G;
  const r0 = runsOf(g, 0), r1 = runsOf(g, 1);
  const winner = r0 > r1 ? 0 : r1 > r0 ? 1 : -1;
  showResult(g, winner, '<span style="color:#8a97ad">賞金を確認中…</span>');
  if (ONLINE && ONLINE.host && window.MDOnline) {
    const players = g.teams.map((t) => ({ uid: t.uid, name: t.members[0].name }));
    const winnerUid = winner === -1 ? null : g.teams[winner].uid;
    window.MDOnline.awardOnce(players, winnerUid).then((list) => {
      if (list && list.length) {
        window.MDOnline.pushState({ seq: olSeq, keep: true, prizes: list, g, ts: Date.now() });
        $("res-prize").innerHTML = "💰 XEVA賞金（ポータルで受取）<br>" + list.map((r) => esc(r.name) + "：<b>+" + r.amount + " XEVA</b>（" + r.label + "）").join("<br>");
      }
    });
  }
}
function leaveOnline() {
  if (window.MDOnline && MDOnline.inRoom()) MDOnline.leaveRoom();
  ONLINE = null; olRoom = null; olStarted = false; olSeq = -1;
  $("ol-home").classList.remove("hidden");
  $("ol-lobby").classList.add("hidden");
  $("ol-sticky").classList.add("hidden");
  $("conn-bar").classList.add("hidden");
}
function backToSetupFromOnline() {
  $("result").classList.add("hidden");
  flow.stop = true; G = null;
  leaveOnline();
  showScreen("setup");
}
$("ol-leave").addEventListener("click", () => { leaveOnline(); showScreen("online"); });

/* ══════════ 起動 ══════════ */
segWire("player-seg", "n", (v) => { setup.n = +v; setup.players = defaultPlayers(setup.n); renderPlayers(); saveSetup(); });
segWire("inning-seg", "i", (v) => { setup.innings = +v; saveSetup(); });
segWire("cpu-seg", "l", (v) => { setup.cpuLv = +v; saveSetup(); });
segWire("talk-seg", "t", (v) => { setup.talk = +v; saveSetup(); });

loadSetup();
if (!setup.players.length) setup.players = defaultPlayers(setup.n);
else setup.players = defaultPlayers(setup.players.length ? setup.players.length : setup.n);
setup.n = setup.players.length;
segSet("player-seg", "n", setup.n);
segSet("inning-seg", "i", setup.innings);
segSet("cpu-seg", "l", setup.cpuLv);
segSet("talk-seg", "t", setup.talk);
renderPlayers();

// 検証フック
window.__MD = { get G() { return G; }, setup, resolvePitch: (...a) => resolvePitch(...a), newGame, cpuDef, cpuOff, nextPitch, get ONLINE() { return ONLINE; } };

})();
