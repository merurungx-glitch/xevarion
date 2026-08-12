/* ============================================================
   MagiManor — GAME ENGINE
   "The Manor Remembers Everything."
   ============================================================ */
(function () {
"use strict";

/* ── アカウントガード（XEVARIONアカウント必須） ── */
let ACC = null;
try { ACC = JSON.parse(localStorage.getItem("xeva_account_v1") || "null"); } catch (e) {}
if (!ACC || !ACC.setupDone) { location.replace("../index.html"); return; }

const D = window.MANOR;
const $ = (s) => document.querySelector(s);
const SAVE_KEY = "magimanor_save_v1";
const MEM_KEY  = "magimanor_mem_v1";
const X_KEY    = "magimanor_x_v1";
const VER = 1;

/* ── 難易度 ── */
const DIFFS = {
  normal:    { n: "NORMAL",    chase: 1.0,  fearUp: 1.0, fearDecay: 0.5,  saveCalm: "zero",  halMin: 12 },
  hard:      { n: "HARD",      chase: 1.22, fearUp: 1.3, fearDecay: 0.3,  saveCalm: "part",  halMin: 9 },
  nightmare: { n: "NIGHTMARE", chase: 1.45, fearUp: 1.6, fearDecay: 0.15, saveCalm: "none",  halMin: 6 },
};

/* ── 永続データ ── */
function jload(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
function jsave(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
let MEM = jload(MEM_KEY, { deaths: [], endings: {}, runs: 0, clears: 0, totalDeaths: 0 });
let XST = jload(X_KEY, {});

/* ── ラン状態 S / ランタイム G ── */
let S = null;
const G = {
  mapDef: null, grid: [], chasers: [], hallu: [], lock: 0, mode: "boot",
  cam: { x: 0, y: 0 }, tween: null, held: null, t: 0, lastStep: 0,
  auto: null, shadowT: 0, halT: 8, ghosts: {}, online: null, onlineDiff: null,
  dlgResolve: null, dlgSkip: false, deadHold: false,
};
const ABORT = { __abort: true };

function newState(gender, diff) {
  return {
    ver: VER, gender, diff, map: "hall", x: 10, y: 10, dir: "up",
    fear: 0, deaths: 0, catBond: 0, items: {}, flags: {}, vars: {},
    playT: 0, chapterMax: 1,
  };
}
const has = (id) => !!(S && S.items[id]);
const shards = () => (S && S.items.shard) || 0;
const diffC = () => DIFFS[S ? S.diff : "normal"];

/* ============================================================
   キャンバス
   ============================================================ */
const cv = $("#cv"), ctx = cv.getContext("2d");
const lcv = document.createElement("canvas"), lctx = lcv.getContext("2d");
let TS = 46, DPR = 1, VW = 0, VH = 0;
function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  VW = window.innerWidth; VH = window.innerHeight;
  cv.width = VW * DPR; cv.height = VH * DPR;
  lcv.width = cv.width; lcv.height = cv.height;
  TS = Math.max(38, Math.min(56, Math.floor(Math.min(VW / 9, VH / 8))));
}
window.addEventListener("resize", resize); resize();

/* seeded per-tile rand */
function trand(x, y, s) { let h = (x * 374761393 + y * 668265263 + (s || 0) * 1274126177) | 0; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) / 4294967295; }

/* ── テーマパレット ── */
const THEMES = {
  hall:    { f1: "#2a2028", f2: "#241b23", wall: "#171019", wtop: "#3c2f3e", cpt: "#4b1e28", acc: "#6d5340" },
  library: { f1: "#251d18", f2: "#201813", wall: "#140f0c", wtop: "#382a20", cpt: "#41301f", acc: "#7a5c33" },
  mirror:  { f1: "#1b2430", f2: "#161e28", wall: "#0c1118", wtop: "#2a3a4e", cpt: "#243444", acc: "#8fb4cf" },
  garden:  { f1: "#1e2a1c", f2: "#182417", wall: "#0f150e", wtop: "#2c4228", cpt: "#3a3226", acc: "#5c8a4a" },
  clock:   { f1: "#2b2118", f2: "#251c14", wall: "#160f0a", wtop: "#443123", cpt: "#39230f", acc: "#a98a3f" },
  theater: { f1: "#26161c", f2: "#201217", wall: "#120a0e", wtop: "#3c2029", cpt: "#4d1420", acc: "#8e1b2c" },
  lost:    { f1: "#17151d", f2: "#121017", wall: "#09080d", wtop: "#262336", cpt: "#1d1a28", acc: "#544a7d" },
  heart:   { f1: "#2a1420", f2: "#22101a", wall: "#140812", wtop: "#3f1c30", cpt: "#57152a", acc: "#c22b40" },
};
const SOLID = new Set(["#", "w", "B", "P", "S", "M", "K", "O", "=", "*", "h", "~", "!", "F", "f"]);
const DEFAULT_MSG = {
  "B": "背表紙のない本が並んでいる。", "K": "時を刻む音がずれている。", "S": "冷たい石像だ。",
  "M": "曇った鏡。あなたの輪郭がぼやけて映る。", "O": "古い鍵盤楽器だ。", "=": "埃をかぶった机。",
  "*": "燭台の焔が、風もないのに揺れた。", "F": "奇妙な花。じっとこちらを向いている。",
  "h": "手入れされた生垣。", "~": "濁った水面。", "P": "枯れかけの鉢植え。", "w": "窓の外は、白い霧だけだ。",
};

function tileAt(x, y) { const r = G.grid[y]; return r ? (r[x] || "#") : "#"; }
function setTile(x, y, ch) { const r = G.grid[y]; if (r) G.grid[y] = r.substring(0, x) + ch + r.substring(x + 1); }
function doorAt(x, y) { return G.mapDef.doors && G.mapDef.doors[x + "," + y]; }
function doorOpen(d) { return d && S.flags[d.flag]; }
function objsAt(x, y) {
  return (G.mapDef.obj || []).filter(o => o.x === x && o.y === y &&
    (!o.hideFlag || !S.flags[o.hideFlag]) && (!o.showFlag || S.flags[o.showFlag]));
}
function isSolid(x, y) {
  const ch = tileAt(x, y);
  if (ch === "+") { const d = doorAt(x, y); if (!doorOpen(d)) return true; return false; }
  if (SOLID.has(ch)) return true;
  if (objsAt(x, y).some(o => o.solid)) return true;
  return false;
}
function walkableForChaser(x, y) {
  const ch = tileAt(x, y);
  if (ch === "+") return !!doorOpen(doorAt(x, y));
  return !SOLID.has(ch) && !objsAt(x, y).some(o => o.solid);
}

/* ============================================================
   描画
   ============================================================ */
function px(v) { return Math.round(v); }

function drawTile(ch, sx, sy, wx, wy, th) {
  const T = THEMES[th], r = trand(wx, wy, 7);
  const u = TS / 16;
  if (ch === "#" || ch === "w") {
    ctx.fillStyle = T.wall; ctx.fillRect(sx, sy, TS, TS);
    ctx.fillStyle = T.wtop; ctx.fillRect(sx, sy, TS, u * 3);
    ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fillRect(sx, sy + u * 3, TS, u);
    if (r > 0.72) { ctx.fillStyle = "rgba(255,255,255,.03)"; ctx.fillRect(sx + u * 3, sy + u * 6, u * 2, u * 6); }
    if (ch === "w") { // 窓
      ctx.fillStyle = "#0e131f"; ctx.fillRect(sx + u * 4, sy + u * 4, u * 8, u * 9);
      ctx.fillStyle = "rgba(140,170,220,.10)"; ctx.fillRect(sx + u * 4, sy + u * 4, u * 8, u * 4);
      ctx.strokeStyle = "rgba(0,0,0,.6)"; ctx.strokeRect(sx + u * 4, sy + u * 4, u * 8, u * 9);
    }
    return;
  }
  if (ch === "!") { ctx.fillStyle = "#020204"; ctx.fillRect(sx, sy, TS, TS); return; }
  // 床
  const base = (wx + wy) % 2 === 0 ? T.f1 : T.f2;
  ctx.fillStyle = base; ctx.fillRect(sx, sy, TS, TS);
  if (ch === "," ) { ctx.fillStyle = T.cpt; ctx.fillRect(sx + u, sy + u, TS - u * 2, TS - u * 2); }
  if (ch === ":" ) { ctx.fillStyle = "#3d2b20"; ctx.fillRect(sx, sy, TS, TS); ctx.fillStyle = "rgba(255,200,120,.05)"; ctx.fillRect(sx, sy, TS, u * 2); }
  if (r > 0.85) { ctx.fillStyle = "rgba(0,0,0,.22)"; ctx.fillRect(sx + r * TS * 0.5, sy + r * TS * 0.4, u * 3, u); }
  ctx.fillStyle = "rgba(0,0,0,.16)"; ctx.fillRect(sx, sy, TS, u * 0.8);
  if (ch === "%") { // ひび
    ctx.strokeStyle = "rgba(0,0,0,.75)"; ctx.lineWidth = Math.max(1, u * 0.7); ctx.beginPath();
    ctx.moveTo(sx + u * 3, sy + u * 2); ctx.lineTo(sx + u * 8, sy + u * 8); ctx.lineTo(sx + u * 5, sy + u * 13);
    ctx.moveTo(sx + u * 12, sy + u * 3); ctx.lineTo(sx + u * 8, sy + u * 8); ctx.stroke();
  }
  if (ch === "x") { // 欠損
    ctx.fillStyle = "#000"; ctx.fillRect(sx + u * 2, sy + u * 2, TS - u * 4, TS - u * 4);
    const gl = Math.sin(G.t * 0.008 + wx * 3 + wy) > 0.7;
    if (gl) { ctx.fillStyle = "rgba(120,90,220,.25)"; ctx.fillRect(sx + u * 2, sy + u * (2 + trand(wx, wy, G.t | 0) * 10), TS - u * 4, u); }
  }
  if (ch === "v") { // 振り子レーン
    ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.fillRect(sx, sy, TS, TS);
    const stopped = S && S.flags.clk_stop;
    const ph = stopped ? 0.9 : Math.sin(G.t / 1100 * Math.PI * 2 + wx * 0.9);
    const bx = sx + TS / 2 + ph * TS * 0.42;
    ctx.strokeStyle = "rgba(200,200,210,.5)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(sx + TS / 2, sy - TS * 0.4); ctx.lineTo(bx, sy + TS * 0.55); ctx.stroke();
    ctx.fillStyle = "#b8bcc8"; ctx.beginPath();
    ctx.moveTo(bx - u * 3, sy + TS * 0.5); ctx.lineTo(bx + u * 3, sy + TS * 0.5); ctx.lineTo(bx, sy + TS * 0.86); ctx.closePath(); ctx.fill();
  }
  if (ch === "~") { // 水面
    ctx.fillStyle = "#0e1a22"; ctx.fillRect(sx, sy, TS, TS);
    ctx.fillStyle = "rgba(120,180,200,.12)";
    ctx.fillRect(sx + u * 2, sy + u * (4 + Math.sin(G.t / 900 + wx + wy) * 2), TS - u * 4, u);
  }
  if (ch === "F" || ch === "f") { drawFlower(sx, sy, wx, wy, ch === "f"); }
  if (ch === "h") { ctx.fillStyle = "#16240f"; ctx.fillRect(sx, sy + u * 2, TS, TS - u * 2); ctx.fillStyle = "#1f3316"; ctx.fillRect(sx + u, sy, TS - u * 2, u * 6); }
  if (ch === "B") drawShelf(sx, sy, th);
  if (ch === "P") { ctx.fillStyle = "#3a2417"; ctx.fillRect(sx + u * 5, sy + u * 9, u * 6, u * 5); ctx.fillStyle = "#28401f"; ctx.fillRect(sx + u * 4, sy + u * 3, u * 8, u * 7); }
  if (ch === "S") drawStatueTile(sx, sy);
  if (ch === "M") drawMirror(sx, sy, wx, wy);
  if (ch === "K") drawClock(sx, sy);
  if (ch === "O") drawPiano(sx, sy);
  if (ch === "=") { ctx.fillStyle = "#3a2c1c"; ctx.fillRect(sx + u, sy + u * 4, TS - u * 2, u * 8); ctx.fillStyle = "#241a10"; ctx.fillRect(sx + u * 2, sy + u * 12, u * 2, u * 3); ctx.fillRect(sx + TS - u * 4, sy + u * 12, u * 2, u * 3); }
  if (ch === "*") drawCandle(sx, sy, true);
  if (ch === "+") { const d = doorAt(wx, wy); drawDoor(sx, sy, doorOpen(d)); }
}

function drawShelf(sx, sy, th) {
  const u = TS / 16;
  ctx.fillStyle = "#2b1c10"; ctx.fillRect(sx, sy, TS, TS);
  for (let row = 0; row < 3; row++) {
    ctx.fillStyle = "#1a1009"; ctx.fillRect(sx + u, sy + u * (1 + row * 5), TS - u * 2, u * 4);
    for (let b = 0; b < 5; b++) {
      const rr = trand(sx + b, sy + row, 3);
      ctx.fillStyle = ["#4a3526", "#3c2f3e", "#33422e", "#463040"][(b + row) % 4];
      ctx.fillRect(sx + u * (1.5 + b * 2.6), sy + u * (1.3 + row * 5 + rr), u * 2, u * (3.4 - rr));
    }
  }
}
function drawStatueTile(sx, sy) {
  const u = TS / 16;
  ctx.fillStyle = "#44454e"; ctx.fillRect(sx + u * 4, sy + u * 12, u * 8, u * 3);
  ctx.fillStyle = "#5a5b66"; ctx.fillRect(sx + u * 6, sy + u * 5, u * 4, u * 7);
  ctx.beginPath(); ctx.arc(sx + u * 8, sy + u * 4, u * 2.2, 0, 7); ctx.fill();
  ctx.fillStyle = "#3a3b44"; ctx.fillRect(sx + u * 6, sy + u * 3.6, u * 4, u * 1.2);
}
function drawMirror(sx, sy, wx, wy) {
  const u = TS / 16;
  ctx.fillStyle = "#3a2c1c"; ctx.fillRect(sx + u * 2, sy + u, u * 12, u * 14);
  const g = ctx.createLinearGradient(sx, sy, sx + TS, sy + TS);
  g.addColorStop(0, "#22303e"); g.addColorStop(0.5, "#42586e"); g.addColorStop(1, "#1a2430");
  ctx.fillStyle = g; ctx.fillRect(sx + u * 3, sy + u * 2, u * 10, u * 12);
  if (Math.sin(G.t / 700 + wx) > 0.93) { ctx.fillStyle = "rgba(255,255,255,.25)"; ctx.fillRect(sx + u * 4, sy + u * 3, u * 2, u * 10); }
}
function drawClock(sx, sy) {
  const u = TS / 16;
  ctx.fillStyle = "#2e2013"; ctx.fillRect(sx + u * 3, sy, u * 10, u * 15);
  ctx.fillStyle = "#d8d2c4"; ctx.beginPath(); ctx.arc(sx + u * 8, sy + u * 4.5, u * 3.4, 0, 7); ctx.fill();
  ctx.strokeStyle = "#222"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(sx + u * 8, sy + u * 4.5); ctx.lineTo(sx + u * 8 + u * 2, sy + u * 3.4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(sx + u * 8, sy + u * 4.5); ctx.lineTo(sx + u * 8 - u * 1, sy + u * 6); ctx.stroke();
  ctx.fillStyle = "#171008"; ctx.fillRect(sx + u * 5.5, sy + u * 9, u * 5, u * 5);
  ctx.fillStyle = "#a98a3f"; ctx.beginPath(); ctx.arc(sx + u * 8, sy + u * (11 + Math.sin(G.t / 500) * 1.4), u, 0, 7); ctx.fill();
}
function drawPiano(sx, sy) {
  const u = TS / 16;
  ctx.fillStyle = "#100b0e"; ctx.fillRect(sx + u, sy + u * 3, u * 14, u * 10);
  ctx.fillStyle = "#e8e2d4"; ctx.fillRect(sx + u * 2, sy + u * 10, u * 12, u * 2.4);
  ctx.fillStyle = "#000";
  for (let k = 0; k < 7; k++) ctx.fillRect(sx + u * (2.8 + k * 1.7), sy + u * 10, u * 0.8, u * 1.4);
}
function drawCandle(sx, sy, lit) {
  const u = TS / 16;
  ctx.fillStyle = "#5c4a22"; ctx.fillRect(sx + u * 7, sy + u * 6, u * 2, u * 8);
  ctx.fillRect(sx + u * 5, sy + u * 13, u * 6, u * 1.5);
  ctx.fillStyle = "#d8d2c4"; ctx.fillRect(sx + u * 6.6, sy + u * 4, u * 2.8, u * 3);
  if (lit) {
    const fl = Math.sin(G.t / 90 + sx) * u * 0.6;
    const g = ctx.createRadialGradient(sx + u * 8, sy + u * 3, 0, sx + u * 8, sy + u * 3, u * 4);
    g.addColorStop(0, "rgba(255,190,90,.9)"); g.addColorStop(1, "rgba(255,140,40,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx + u * 8, sy + u * 3, u * 4, 0, 7); ctx.fill();
    ctx.fillStyle = "#ffd27a"; ctx.beginPath(); ctx.ellipse(sx + u * 8, sy + u * 2.6 + fl * 0.2, u * 0.9, u * 1.6 + fl * 0.3, 0, 0, 7); ctx.fill();
  }
}
function drawDoor(sx, sy, open) {
  const u = TS / 16;
  if (open) {
    ctx.fillStyle = "#060409"; ctx.fillRect(sx, sy, TS, TS);
    ctx.fillStyle = "#241a24"; ctx.fillRect(sx, sy, u * 2, TS); ctx.fillRect(sx + TS - u * 2, sy, u * 2, TS);
    return;
  }
  ctx.fillStyle = "#2b1c12"; ctx.fillRect(sx, sy, TS, TS);
  ctx.fillStyle = "#1c1109"; ctx.fillRect(sx + u * 2, sy + u, TS - u * 4, TS - u * 2);
  ctx.fillStyle = "#3c2a18"; ctx.fillRect(sx + u * 3, sy + u * 2, TS - u * 6, u * 5);
  ctx.fillRect(sx + u * 3, sy + u * 8, TS - u * 6, u * 5);
  ctx.fillStyle = "#a98a3f"; ctx.beginPath(); ctx.arc(sx + TS - u * 4.5, sy + u * 8, u * 0.9, 0, 7); ctx.fill();
}
function drawFlower(sx, sy, wx, wy, evil) {
  const u = TS / 16;
  const bloom = evil && S && S.flags.garden_bloom;
  ctx.fillStyle = "#1c2e18"; ctx.fillRect(sx + u * 2, sy + u * 10, u * 12, u * 5);
  ctx.strokeStyle = "#2e5424"; ctx.lineWidth = u;
  ctx.beginPath(); ctx.moveTo(sx + u * 8, sy + u * 12); ctx.quadraticCurveTo(sx + u * 8 + Math.sin(G.t / 600 + wx) * u * 2, sy + u * 7, sx + u * 8, sy + u * 5); ctx.stroke();
  if (bloom) {
    ctx.fillStyle = "#a01828";
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + G.t / 800; ctx.beginPath(); ctx.ellipse(sx + u * 8 + Math.cos(a) * u * 2.6, sy + u * 4 + Math.sin(a) * u * 2.6, u * 2, u * 1.2, a, 0, 7); ctx.fill(); }
    ctx.fillStyle = "#fff"; for (let i = 0; i < 4; i++) ctx.fillRect(sx + u * (6.4 + i * 1.1), sy + u * 3.6, u * 0.5, u * 1.4);
  } else if (evil) {
    ctx.fillStyle = "#5c1830"; ctx.beginPath(); ctx.ellipse(sx + u * 8, sy + u * 4, u * 2.4, u * 3, 0, 0, 7); ctx.fill();
  } else {
    ctx.fillStyle = ["#7c4a8a", "#8a4a5c", "#4a6a8a"][((wx + wy) % 3)];
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; ctx.beginPath(); ctx.arc(sx + u * 8 + Math.cos(a) * u * 1.8, sy + u * 4.5 + Math.sin(a) * u * 1.8, u * 1.3, 0, 7); ctx.fill(); }
    ctx.fillStyle = "#e8d270"; ctx.beginPath(); ctx.arc(sx + u * 8, sy + u * 4.5, u * 1.1, 0, 7); ctx.fill();
  }
}

/* ── キャラ描画 ── */
function drawPerson(x, y, opt) {
  const u = TS / 16, bob = opt.still ? 0 : Math.sin(G.t / 180 + (opt.ph || 0)) * u * 0.5;
  const cx = x + TS / 2, top = y + u * 2 + bob;
  ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.beginPath(); ctx.ellipse(cx, y + TS - u, u * 4.4, u * 1.6, 0, 0, 7); ctx.fill();
  if (opt.alpha != null) ctx.globalAlpha = opt.alpha;
  ctx.fillStyle = opt.cloak; ctx.fillRect(cx - u * 3.2, top + u * 5.5, u * 6.4, u * 7);
  ctx.fillStyle = opt.skin || "#e8cfae"; ctx.beginPath(); ctx.arc(cx, top + u * 3.4, u * 2.8, 0, 7); ctx.fill();
  ctx.fillStyle = opt.hair;
  ctx.beginPath(); ctx.arc(cx, top + u * 2.6, u * 2.9, Math.PI, 0); ctx.fill();
  if (opt.longHair) { ctx.fillRect(cx - u * 2.9, top + u * 2.6, u * 1.3, u * 6.5); ctx.fillRect(cx + u * 1.6, top + u * 2.6, u * 1.3, u * 6.5); }
  const ec = opt.eye || "#241f2e";
  if (opt.dir !== "up") {
    ctx.fillStyle = ec;
    const off = opt.dir === "left" ? -u * 0.8 : opt.dir === "right" ? u * 0.8 : 0;
    ctx.fillRect(cx - u * 1.2 + off, top + u * 3.2, u * 0.8, u * 0.9);
    ctx.fillRect(cx + u * 0.5 + off, top + u * 3.2, u * 0.8, u * 0.9);
  }
  ctx.globalAlpha = 1;
}
function drawCat(x, y) {
  const u = TS / 16, tw = Math.sin(G.t / 300) * u;
  ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.beginPath(); ctx.ellipse(x + TS / 2, y + TS - u, u * 4, u * 1.2, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#0c0b10";
  ctx.beginPath(); ctx.ellipse(x + TS / 2, y + u * 11, u * 4, u * 3, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(x + TS / 2 - u * 3, y + u * 8.5, u * 2.4, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + u * 3.4, y + u * 7); ctx.lineTo(x + u * 4.4, y + u * 4.6); ctx.lineTo(x + u * 5.6, y + u * 6.8); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + u * 6, y + u * 7); ctx.lineTo(x + u * 7, y + u * 4.8); ctx.lineTo(x + u * 8, y + u * 7); ctx.fill();
  ctx.strokeStyle = "#0c0b10"; ctx.lineWidth = u; ctx.beginPath();
  ctx.moveTo(x + TS / 2 + u * 3.6, y + u * 11); ctx.quadraticCurveTo(x + TS / 2 + u * 6, y + u * 8 + tw, x + TS / 2 + u * 5, y + u * 6); ctx.stroke();
  ctx.fillStyle = "#ffb020";
  ctx.fillRect(x + u * 4.1, y + u * 8, u * 0.9, u * 0.9); ctx.fillRect(x + u * 6.2, y + u * 8, u * 0.9, u * 0.9);
}
function drawSpr(name, x, y, o) {
  const u = TS / 16; o = o || {};
  switch (name) {
    case "cat": drawCat(x, y); break;
    case "type": {
      ctx.fillStyle = "#2e2418"; ctx.fillRect(x + u, y + u * 8, u * 14, u * 6);
      ctx.fillStyle = "#14100c"; ctx.fillRect(x + u * 3, y + u * 4, u * 10, u * 5);
      ctx.fillStyle = "#d8d2c4"; ctx.fillRect(x + u * 4, y + u * 2.6, u * 8, u * 1.6);
      ctx.fillStyle = "#3a3a42"; for (let k = 0; k < 4; k++) ctx.fillRect(x + u * (4.4 + k * 2), y + u * 6.4, u, u);
      const g = ctx.createRadialGradient(x + u * 8, y + u * 5, 0, x + u * 8, y + u * 5, u * 7);
      g.addColorStop(0, "rgba(160,200,255,.10)"); g.addColorStop(1, "transparent");
      ctx.fillStyle = g; ctx.fillRect(x - u * 2, y - u * 2, TS + u * 4, TS + u * 4);
      break;
    }
    case "cand": {
      const lit = S.map === "hall" ? !!S.flags["hall_cl_" + (o.tag || "")] : true;
      drawCandle(x, y, lit); break;
    }
    case "paint": {
      ctx.fillStyle = "#5c4622"; ctx.fillRect(x + u * 2, y + u * 3, u * 12, u * 11);
      ctx.fillStyle = "#101018"; ctx.fillRect(x + u * 3.2, y + u * 4.2, u * 9.6, u * 8.6);
      ctx.fillStyle = "#d8d2c4"; ctx.beginPath(); ctx.arc(x + u * 8, y + u * 7, u * 1.6, 0, 7); ctx.fill();
      ctx.fillStyle = "#e8e8f4"; ctx.fillRect(x + u * 6.5, y + u * 8.4, u * 3, u * 3.6); break;
    }
    case "plaque": { ctx.fillStyle = "#8a7434"; ctx.fillRect(x + u * 3, y + u * 5, u * 10, u * 6); ctx.fillStyle = "#5c4c1e"; ctx.fillRect(x + u * 4, y + u * 6, u * 8, u); ctx.fillRect(x + u * 4, y + u * 8, u * 8, u); break; }
    case "bigdoor": { ctx.fillStyle = "#241a12"; ctx.fillRect(x + u, y + u, u * 14, u * 14); ctx.fillStyle = "#171009"; ctx.fillRect(x + u * 2, y + u * 2, u * 5.5, u * 13); ctx.fillRect(x + u * 8.5, y + u * 2, u * 5.5, u * 13); break; }
    case "shard": {
      const fl = Math.sin(G.t / 260) * 0.4 + 0.6;
      const g = ctx.createRadialGradient(x + TS / 2, y + TS / 2, 0, x + TS / 2, y + TS / 2, u * 6);
      g.addColorStop(0, `rgba(190,220,255,${0.35 * fl})`); g.addColorStop(1, "transparent");
      ctx.fillStyle = g; ctx.fillRect(x - u * 2, y - u * 2, TS + u * 4, TS + u * 4);
      ctx.fillStyle = `rgba(220,235,255,${0.6 + fl * 0.4})`;
      ctx.beginPath(); ctx.moveTo(x + u * 8, y + u * 4); ctx.lineTo(x + u * 10.5, y + u * 8); ctx.lineTo(x + u * 8, y + u * 12); ctx.lineTo(x + u * 5.5, y + u * 8); ctx.closePath(); ctx.fill();
      break;
    }
    case "glint": {
      const fl = Math.sin(G.t / 200) > 0.2 ? 1 : 0.3;
      ctx.fillStyle = `rgba(255,220,140,${fl})`;
      ctx.fillRect(x + u * 7.4, y + u * 7.4, u * 1.4, u * 1.4);
      ctx.fillRect(x + u * 7.8, y + u * 5.6, u * 0.6, u * 5); ctx.fillRect(x + u * 5.8, y + u * 7.7, u * 5, u * 0.6);
      break;
    }
    case "key": {
      ctx.fillStyle = o.tint || "#a98a3f";
      ctx.beginPath(); ctx.arc(x + u * 6, y + u * 8, u * 2.2, 0, 7); ctx.fill();
      ctx.fillRect(x + u * 7.6, y + u * 7.3, u * 5, u * 1.4); ctx.fillRect(x + u * 10.6, y + u * 8.4, u, u * 1.6); ctx.fillRect(x + u * 12, y + u * 8.4, u, u * 1.6);
      break;
    }
    case "redbook": { ctx.fillStyle = "#8e1b2c"; ctx.fillRect(x + u * 6, y + u * 4, u * 3.4, u * 8); ctx.fillStyle = "#ffdfa0"; ctx.fillRect(x + u * 6.8, y + u * 5, u * 1.6, u * 0.8); break; }
    case "gapshelf": { ctx.fillStyle = "#0a0605"; ctx.fillRect(x + u * 2, y + u * 2, u * 12, u * 12); ctx.fillStyle = "rgba(200,60,80,.14)"; ctx.fillRect(x + u * 4, y + u * 4, u * 8, u * 8); break; }
    case "desk": { ctx.fillStyle = "#3a2c1c"; ctx.fillRect(x + u, y + u * 5, u * 14, u * 8); ctx.fillStyle = "#e6ddc6"; ctx.fillRect(x + u * 5, y + u * 6.4, u * 6, u * 4); break; }
    case "grim": { ctx.fillStyle = "#141018"; ctx.fillRect(x + u * 5.5, y + u * 4, u * 4.4, u * 8.6); ctx.fillStyle = "#7a5cc0"; ctx.fillRect(x + u * 6.6, y + u * 6, u * 2.2, u * 2.2); break; }
    case "gardener": {
      drawPerson(x, y, { cloak: "#3c4a2a", hair: "#9aa0a8", dir: o.dir || "down", skin: "#d8bd9a", ph: 2 });
      ctx.fillStyle = "#8a9098";
      ctx.fillRect(x + u * 12, y + u * 5, u * 1.4, u * 7); ctx.fillRect(x + u * 13.6, y + u * 5, u * 1.4, u * 7);
      break;
    }
    case "butler": drawPerson(x, y, { cloak: "#181820", hair: "#cfd0d6", dir: o.dir || "down", skin: "#e0d5c4", ph: 4 }); break;
    case "doll": {
      drawPerson(x, y, { cloak: "#e8e2e4", hair: "#f0e6c8", dir: o.dir || "down", skin: "#f4ece2", eye: "#c22b40", longHair: true, ph: 6 });
      if (!S.flags.doll_friend) { ctx.fillStyle = "#1a1418"; ctx.fillRect(x + TS / 2 - u * 1.6, y + u * 5, u * 1, u * 1.1); }
      break;
    }
    case "woman": {
      const fl = Math.sin(G.t / 700) * u * 0.8;
      ctx.fillStyle = "rgba(255,255,255,.06)"; ctx.beginPath(); ctx.arc(x + TS / 2, y + TS / 2, u * 9, 0, 7); ctx.fill();
      drawPerson(x, y - fl, { cloak: "#eceaf2", hair: "#e8e4ee", dir: "down", skin: "#f2ecea", eye: "#8a8ba0", longHair: true, still: 1 });
      break;
    }
    case "core": {
      const pu = (Math.sin(G.t / 460) + 1) / 2;
      const g = ctx.createRadialGradient(x + TS / 2, y + TS / 2, 0, x + TS / 2, y + TS / 2, TS * (1 + pu * 0.4));
      g.addColorStop(0, "rgba(255,80,110,.5)"); g.addColorStop(1, "transparent");
      ctx.fillStyle = g; ctx.fillRect(x - TS, y - TS, TS * 3, TS * 3);
      ctx.fillStyle = `rgba(194,43,64,${0.75 + pu * 0.25})`;
      ctx.beginPath(); ctx.moveTo(x + TS / 2, y - u * 2); ctx.lineTo(x + TS - u, y + TS / 2); ctx.lineTo(x + TS / 2, y + TS + u * 2); ctx.lineTo(x + u, y + TS / 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "rgba(255,220,230,.6)"; ctx.fillRect(x + TS / 2 - u, y + u * 3, u * 2, u * 4);
      break;
    }
    case "bigclock": {
      ctx.fillStyle = "#241708"; ctx.fillRect(x - u * 2, y - TS * 0.5, TS + u * 4, TS * 1.5);
      ctx.fillStyle = "#e8e2d0"; ctx.beginPath(); ctx.arc(x + TS / 2, y, u * 6, 0, 7); ctx.fill();
      ctx.strokeStyle = "#40241a"; ctx.lineWidth = u * 0.8;
      const st = S.flags.clk_stop;
      const a1 = st ? -Math.PI / 2 + (4 / 12) * Math.PI * 2 : G.t / 3000;
      const a2 = st ? -Math.PI / 2 + (44 / 60) * Math.PI * 2 : -G.t / 700;
      ctx.beginPath(); ctx.moveTo(x + TS / 2, y); ctx.lineTo(x + TS / 2 + Math.cos(a1) * u * 3, y + Math.sin(a1) * u * 3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + TS / 2, y); ctx.lineTo(x + TS / 2 + Math.cos(a2) * u * 4.6, y + Math.sin(a2) * u * 4.6); ctx.stroke();
      break;
    }
    case "chest": { ctx.fillStyle = "#4a3018"; ctx.fillRect(x + u * 2, y + u * 6, u * 12, u * 8); ctx.fillStyle = "#5e3e20"; ctx.fillRect(x + u * 2, y + u * 4, u * 12, u * 3); ctx.fillStyle = "#a98a3f"; ctx.fillRect(x + u * 7, y + u * 7, u * 2, u * 3); break; }
    case "note": { ctx.fillStyle = "#e6ddc6"; ctx.fillRect(x + u * 4, y + u * 4, u * 8, u * 9); ctx.fillStyle = "#5c5030"; for (let k = 0; k < 4; k++) ctx.fillRect(x + u * 5, y + u * (5.4 + k * 1.8), u * 6, u * 0.6); break; }
    case "gearpile": {
      ctx.fillStyle = "#5a5346"; ctx.beginPath(); ctx.arc(x + u * 6, y + u * 10, u * 4, 0, 7); ctx.fill();
      ctx.fillStyle = "#6e6858"; ctx.beginPath(); ctx.arc(x + u * 10, y + u * 8, u * 3, 0, 7); ctx.fill();
      ctx.fillStyle = "#2c2820"; ctx.beginPath(); ctx.arc(x + u * 6, y + u * 10, u * 1.4, 0, 7); ctx.fill();
      break;
    }
    case "puppet": {
      ctx.strokeStyle = "rgba(200,200,200,.25)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + TS / 2, y - TS); ctx.lineTo(x + TS / 2, y + u * 3); ctx.stroke();
      drawPerson(x, y, { cloak: "#6a4a68", hair: "#3c3244", dir: "down", skin: "#e8d8c8", still: 1 });
      break;
    }
    case "plate": case "plate2": {
      const done = S.flags.th_plate_done;
      ctx.fillStyle = done ? "#3c3226" : "#5a4c34"; ctx.fillRect(x + u * 4, y + u * 4, u * 8, u * 8);
      ctx.strokeStyle = "#241c10"; ctx.strokeRect(x + u * 4, y + u * 4, u * 8, u * 8);
      break;
    }
    case "paper": { ctx.fillStyle = "#e6ddc6"; ctx.fillRect(x + u * 5, y + u * 6, u * 6, u * 7); break; }
    case "watchitem": {
      ctx.fillStyle = "#a98a3f"; ctx.beginPath(); ctx.arc(x + u * 8, y + u * 9, u * 3, 0, 7); ctx.fill();
      ctx.fillStyle = "#e8e2d0"; ctx.beginPath(); ctx.arc(x + u * 8, y + u * 9, u * 2.2, 0, 7); ctx.fill();
      break;
    }
    case "scratch": { ctx.strokeStyle = "rgba(200,180,180,.35)"; ctx.lineWidth = 1; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(x + u * (3 + k * 2), y + u * 4); ctx.lineTo(x + u * (4 + k * 2), y + u * 12); ctx.stroke(); } break; }
    case "dirt": { ctx.fillStyle = "#2e2214"; ctx.beginPath(); ctx.ellipse(x + TS / 2, y + u * 10, u * 5, u * 3, 0, 0, 7); ctx.fill(); ctx.fillStyle = "#3c2e1c"; ctx.beginPath(); ctx.ellipse(x + TS / 2, y + u * 9, u * 3.4, u * 2, 0, 0, 7); ctx.fill(); break; }
    case "shadow": {
      const wob = Math.sin(G.t / 120) * u;
      ctx.fillStyle = "rgba(4,2,8,.88)";
      ctx.beginPath(); ctx.ellipse(x + TS / 2, y + TS / 2 + wob * 0.3, u * 5 + wob, u * 7, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.85)";
      ctx.fillRect(x + u * 6, y + u * 6, u * 1.2, u * 1.6); ctx.fillRect(x + u * 9, y + u * 6, u * 1.2, u * 1.6);
      break;
    }
    case "statuech": drawStatueTile(x, y); break;
  }
}

/* ── 血痕（Memory） ── */
function drawStains(camX, camY) {
  const stains = MEM.deaths.filter(d => d.map === S.map);
  for (const st of stains) {
    const sx = st.x * TS - camX, sy = st.y * TS - camY, u = TS / 16;
    if (sx < -TS || sy < -TS || sx > VW + TS || sy > VH + TS) continue;
    ctx.fillStyle = "rgba(90,10,20,.5)";
    const r1 = trand(st.x, st.y, 1), r2 = trand(st.x, st.y, 2);
    ctx.beginPath(); ctx.ellipse(sx + TS / 2 + (r1 - 0.5) * u * 4, sy + TS / 2, u * (3 + r1 * 3), u * (2 + r2 * 2), r1 * 3, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(sx + TS / 2 + r2 * u * 5 - u * 2, sy + TS / 2 + r1 * u * 4 - u * 2, u * 1.2, 0, 7); ctx.fill();
  }
}

/* ── ライティング ── */
function lightSources() {
  const ls = [];
  for (let y = 0; y < G.grid.length; y++) for (let x = 0; x < G.grid[y].length; x++) {
    if (tileAt(x, y) === "*") ls.push({ x, y, r: S.map === "lost" ? 2.7 : 3.4 });
  }
  for (const o of (G.mapDef.obj || [])) {
    if (o.spr === "cand" && (S.map !== "hall" || S.flags["hall_cl_" + o.tag])) ls.push({ x: o.x, y: o.y, r: 3 });
    if (o.spr === "type") ls.push({ x: o.x, y: o.y, r: 1.8 });
    if (o.spr === "core") ls.push({ x: o.x, y: o.y, r: 5 });
  }
  return ls;
}
function nearLight(rad) {
  const pxl = S.x, pyl = S.y;
  return lightSources().some(l => Math.hypot(l.x - pxl, l.y - pyl) <= (rad || l.r));
}
function renderLight(camX, camY) {
  const amb = G.mapDef.dark + Math.min(0.22, S.fear / 100 * 0.22);
  lctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  lctx.globalCompositeOperation = "source-over";
  lctx.clearRect(0, 0, VW, VH);
  lctx.fillStyle = `rgba(3,2,8,${amb})`;
  lctx.fillRect(0, 0, VW, VH);
  lctx.globalCompositeOperation = "destination-out";
  const holes = lightSources().map(l => ({ px: l.x * TS + TS / 2 - camX, py: l.y * TS + TS / 2 - camY, r: l.r * TS, a: 0.9 }));
  const prad = (3.4 - S.fear / 100 * 1.2) * TS;
  holes.push({ px: S.px + TS / 2 - camX, py: S.py + TS / 2 - camY, r: prad, a: 0.95 });
  for (const h of holes) {
    const g = lctx.createRadialGradient(h.px, h.py, 0, h.px, h.py, h.r);
    g.addColorStop(0, `rgba(0,0,0,${h.a})`); g.addColorStop(0.65, `rgba(0,0,0,${h.a * 0.5})`); g.addColorStop(1, "rgba(0,0,0,0)");
    lctx.fillStyle = g; lctx.beginPath(); lctx.arc(h.px, h.py, h.r, 0, 7); lctx.fill();
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(lcv, 0, 0);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

/* ============================================================
   メインループ
   ============================================================ */
let lastT = 0;
function loop(t) {
  requestAnimationFrame(loop);
  const dt = Math.min(50, t - lastT); lastT = t; G.t = t;
  if (G.mode !== "play") return;
  update(dt / 1000);
  render();
}
requestAnimationFrame(loop);

function update(dt) {
  S.playT += dt;
  // 移動
  if (G.tween) {
    G.tween.p += dt / 0.14;
    if (G.tween.p >= 1) {
      S.px = S.x * TS; S.py = S.y * TS; G.tween = null;
      onArrive();
    } else {
      S.px = (G.tween.fx + (S.x - G.tween.fx) * G.tween.p) * TS;
      S.py = (G.tween.fy + (S.y - G.tween.fy) * G.tween.p) * TS;
    }
  } else if (!G.lock && G.held) {
    tryStep(G.held);
  }
  // 振り子の刃
  if (S.map === "clock" && !S.flags.clk_stop && !G.lock) {
    if (tileAt(S.x, S.y) === "v") {
      const ph = Math.sin(G.t / 1100 * Math.PI * 2 + S.x * 0.9);
      if (Math.abs(ph) > 0.72) doDeath("blade");
    }
  }
  // 食虫花
  if (S.map === "garden" && S.flags.garden_bloom && !G.lock) {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (Math.abs(dx) + Math.abs(dy) !== 1) continue;
      if (tileAt(S.x + dx, S.y + dy) === "f") { doDeath("flower"); return; }
    }
  }
  // 追跡者
  for (const c of G.chasers) updateChaser(c, dt);
  // 影（忘レラレタ階）
  if (S.map === "lost" && !G.lock) {
    if (nearLight()) {
      G.shadowT = 0;
      const si = G.chasers.findIndex(c => c.spr === "shadow");
      if (si >= 0) { G.chasers.splice(si, 1); toast("影が、光に溶けて消えた"); }
    } else {
      G.shadowT += dt;
      if (G.shadowT > 2.6 && !G.chasers.some(c => c.spr === "shadow")) spawnShadow();
    }
  }
  // Fear
  updateFear(dt);
  // 幻覚
  updateHallu(dt);
  // オンライン位置送信
  if (G.online && window.ManorOnline) window.ManorOnline.tick(S);
  updateHud();
}

function updateFear(dt) {
  const dc = diffC();
  let delta = -dc.fearDecay * dt;
  for (const c of G.chasers) {
    const d = Math.hypot(c.cx - S.x, c.cy - S.y);
    if (d < 5) delta += (5 - d) * 1.6 * dt * dc.fearUp;
  }
  if (S.map === "lost" && !nearLight()) delta += 2.6 * dt * dc.fearUp;
  if (S.map === "mirrorlib") delta += 0.7 * dt * dc.fearUp;
  S.fear = Math.max(0, Math.min(100, S.fear + delta));
  AUD.setHeart(S.fear);
}

function updateHallu(dt) {
  if (S.fear < 50 || G.lock) { return; }
  G.halT -= dt;
  if (G.halT > 0) return;
  const dc = diffC();
  G.halT = dc.halMin + Math.random() * 8;
  const roll = Math.random();
  if (roll < 0.34) { AUD.play("whisper"); toast("……誰かの囁き声がする", true); }
  else if (roll < 0.6) { toast("……どこかで、扉を叩く音", true); AUD.play("knock"); }
  else {
    // 偽の影
    let tries = 20;
    while (tries--) {
      const hx = S.x + (Math.random() * 10 - 5) | 0, hy = S.y + (Math.random() * 8 - 4) | 0;
      if (!isSolid(hx, hy) && (hx !== S.x || hy !== S.y)) {
        G.hallu.push({ x: hx, y: hy, t: 0.9, doll: S.fear >= 80 });
        AUD.play("sting2"); break;
      }
    }
  }
}

function tryStep(dir) {
  S.dir = dir;
  const dd = dirD(dir), nx = S.x + dd.x, ny = S.y + dd.y;
  if (isSolid(nx, ny)) return;
  G.tween = { fx: S.x, fy: S.y, p: 0 };
  S.x = nx; S.y = ny;
  if (G.t - G.lastStep > 210) { AUD.play("step"); G.lastStep = G.t; }
}
function dirD(dir) { return dir === "up" ? { x: 0, y: -1 } : dir === "down" ? { x: 0, y: 1 } : dir === "left" ? { x: -1, y: 0 } : { x: 1, y: 0 }; }

function onArrive() {
  const key = S.x + "," + S.y;
  // メモリー既死地点
  const died = MEM.deaths.find(d => d.map === S.map && d.x === S.x && d.y === S.y);
  if (died && !G["__mem" + S.map + key]) {
    G["__mem" + S.map + key] = 1;
    toast("……ここで、死んだことがある", true); addFear(3); AUD.play("whisper");
  }
  // ひび割れ床
  if (tileAt(S.x, S.y) === "%") { AUD.play("crack"); doDeath("pit"); return; }
  // 出口
  const ex = G.mapDef.exit && G.mapDef.exit[key];
  if (ex) {
    const d = doorAt(S.x, S.y);
    if (!d || doorOpen(d)) { changeMap(ex.map, ex.x, ex.y, ex.dir); return; }
  }
  // 踏みイベントオブジェクト
  for (const o of objsAt(S.x, S.y)) { if (o.step && o.ev) { runEvent(o.ev); return; } }
  // トリガー
  const tg = G.mapDef.trg && G.mapDef.trg[key];
  if (tg) {
    if (tg.once && S.flags[tg.once]) return;
    if (tg.once) setFlagLocal(tg.once);
    runEvent(tg.ev);
  }
}

/* ── 追跡者 ── */
function spawnChaser(spr, x, y, speed, cause) {
  G.chasers.push({ spr, cx: x, cy: y, speed, cause, path: [], repath: 0 });
}
function spawnShadow() {
  let tries = 40;
  while (tries--) {
    const x = 1 + (Math.random() * (G.grid[0].length - 2)) | 0, y = 1 + (Math.random() * (G.grid.length - 2)) | 0;
    if (walkableForChaser(x, y) && Math.hypot(x - S.x, y - S.y) > 4.5) {
      spawnChaser("shadow", x, y, 1.75 * diffC().chase, "shadow");
      AUD.play("sting2"); toast("闇の中で、何かが目を開けた", true); addFear(8);
      return;
    }
  }
}
function updateChaser(c, dt) {
  if (G.lock) return;
  const dist = Math.hypot(c.cx - S.x, c.cy - S.y);
  let sp = c.speed;
  if (c.spr === "doll") sp = (1.05 + Math.max(0, (7 - dist)) * 0.30) * diffC().chase;
  c.repath -= dt;
  if (c.repath <= 0) { c.path = bfsPath(Math.round(c.cx), Math.round(c.cy), S.x, S.y); c.repath = 0.35; }
  if (c.path && c.path.length) {
    const nxt = c.path[0];
    const dx = nxt.x - c.cx, dy = nxt.y - c.cy, dd = Math.hypot(dx, dy);
    if (dd < 0.08) { c.cx = nxt.x; c.cy = nxt.y; c.path.shift(); }
    else { c.cx += dx / dd * sp * dt; c.cy += dy / dd * sp * dt; }
  }
  if (Math.hypot(c.cx - S.x, c.cy - S.y) < 0.62) doDeath(c.cause);
}
function bfsPath(sx, sy, tx, ty) {
  const W = G.grid[0].length, H = G.grid.length;
  const q = [[sx, sy]], prev = {}, seen = new Set([sx + "," + sy]);
  while (q.length) {
    const [x, y] = q.shift();
    if (x === tx && y === ty) {
      const path = []; let k = tx + "," + ty;
      while (prev[k]) { const [px2, py2] = k.split(",").map(Number); path.unshift({ x: px2, y: py2 }); k = prev[k]; }
      return path;
    }
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const nx = x + dx, ny = y + dy, kk = nx + "," + ny;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen.has(kk)) continue;
      if (!walkableForChaser(nx, ny) && !(nx === tx && ny === ty)) continue;
      seen.add(kk); prev[kk] = x + "," + y; q.push([nx, ny]);
    }
  }
  return [];
}

/* ── レンダリング ── */
function render() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = "#030204"; ctx.fillRect(0, 0, VW, VH);
  const mw = G.grid[0].length * TS, mh = G.grid.length * TS;
  let camX = S.px + TS / 2 - VW / 2, camY = S.py + TS / 2 - VH / 2;
  camX = Math.max(Math.min(camX, mw - VW), Math.min(0, (mw - VW) / 2));
  camY = Math.max(Math.min(camY, mh - VH), Math.min(0, (mh - VH) / 2));
  G.cam.x = camX; G.cam.y = camY;
  const x0 = Math.max(0, Math.floor(camX / TS)), y0 = Math.max(0, Math.floor(camY / TS));
  const x1 = Math.min(G.grid[0].length - 1, Math.ceil((camX + VW) / TS)), y1 = Math.min(G.grid.length - 1, Math.ceil((camY + VH) / TS));
  const th = G.mapDef.theme;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    drawTile(tileAt(x, y), px(x * TS - camX), px(y * TS - camY), x, y, th);
  }
  drawStains(camX, camY);
  // オブジェクト
  const drawables = [];
  for (const o of (G.mapDef.obj || [])) {
    if (o.hideFlag && S.flags[o.hideFlag]) continue;
    if (o.showFlag && !S.flags[o.showFlag]) continue;
    drawables.push({ y: o.y, fn: () => drawSpr(o.spr, px(o.x * TS - camX), px(o.y * TS - camY), o) });
  }
  // オンラインゴースト
  for (const uid in G.ghosts) {
    const g = G.ghosts[uid];
    if (g.map !== S.map || uid === (window.ManorOnline && window.ManorOnline.myUid())) continue;
    drawables.push({ y: g.y, fn: () => {
      drawPerson(px(g.x * TS - camX), px(g.y * TS - camY), { cloak: "rgba(120,200,220,.5)", hair: "rgba(160,220,240,.55)", skin: "rgba(200,240,255,.5)", dir: g.dir, alpha: 0.55 });
      ctx.fillStyle = "rgba(150,220,240,.8)"; ctx.font = "10px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(g.name || "", px(g.x * TS - camX) + TS / 2, px(g.y * TS - camY) - 4);
    }});
  }
  // 鏡の世界の反射
  if (S.map === "mirrorlib") {
    const rx = (G.grid[0].length - 1) - S.x;
    drawables.push({ y: S.y, fn: () => drawPerson(px(rx * TS - camX), px(S.py / TS * 0 + S.y * TS - camY), { cloak: "rgba(20,24,40,.55)", hair: "rgba(10,12,20,.6)", skin: "rgba(30,34,50,.55)", dir: S.dir, alpha: 0.6, still: 1 }) });
  }
  // 追跡者
  for (const c of G.chasers) drawables.push({ y: c.cy, fn: () => drawSpr(c.spr === "gardener" ? "gardener" : c.spr === "doll" ? "doll" : c.spr === "statuech" ? "statuech" : "shadow", px(c.cx * TS - camX), px(c.cy * TS - camY), { dir: "down" }) });
  // プレイヤー
  drawables.push({ y: S.py / TS, fn: () => drawPerson(px(S.px - camX), px(S.py - camY), S.gender === "f"
    ? { cloak: "#7c4a66", hair: "#4a3040", dir: S.dir, longHair: true }
    : { cloak: "#3d5a80", hair: "#2a2430", dir: S.dir }) });
  drawables.sort((a, b) => a.y - b.y);
  for (const d of drawables) d.fn();
  // 幻覚
  for (let i = G.hallu.length - 1; i >= 0; i--) {
    const h = G.hallu[i]; h.t -= 0.016;
    if (h.t <= 0) { G.hallu.splice(i, 1); continue; }
    ctx.globalAlpha = Math.min(0.7, h.t);
    drawSpr(h.doll ? "doll" : "shadow", px(h.x * TS - camX), px(h.y * TS - camY), { dir: "down" });
    ctx.globalAlpha = 1;
  }
  renderLight(camX, camY);
  // Fearビネット
  if (S.fear > 30) {
    const v = (S.fear - 30) / 70;
    const g = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.25, VW / 2, VH / 2, VH * 0.75);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, `rgba(60,4,14,${v * 0.55})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  }
}

/* ============================================================
   HUD / UI
   ============================================================ */
function updateHud() {
  $("#hudCh").innerHTML = `<b>${G.mapDef.name}</b>`;
  $("#hudInfo").innerHTML = `💀 <b>${S.deaths}</b>　✨ <b>${shards()}</b>/6`;
  const f = $("#fearWrap");
  f.querySelector("i").style.width = S.fear + "%";
  f.classList.toggle("high", S.fear >= 70);
}
function toast(txt, warn) {
  const t = document.createElement("div");
  t.className = "toast" + (warn ? " warn" : ""); t.innerHTML = txt;
  $("#toasts").appendChild(t);
  setTimeout(() => { t.style.opacity = "0"; t.style.transition = "opacity .5s"; setTimeout(() => t.remove(), 500); }, 2600);
}
function xevaToast(amt, label) {
  const t = document.createElement("div");
  t.className = "toast"; t.innerHTML = `<img src="../../XEVA.png" alt="">+${amt} XEVA — ${label}`;
  $("#toasts").appendChild(t);
  setTimeout(() => { t.style.opacity = "0"; t.style.transition = "opacity .5s"; setTimeout(() => t.remove(), 500); }, 3200);
}
function awardXeva(key, amt, label) {
  if (XST[key]) return;
  XST[key] = 1; jsave(X_KEY, XST);
  if (window.XEVA) { window.XEVA.add(amt, "MagiManor: " + label), (window.XEVA.completeMission && XEVA.completeMission("magimanor_play")); xevaToast(amt, label); }
}
function addFear(n) { S.fear = Math.max(0, Math.min(100, S.fear + n * (n > 0 ? diffC().fearUp : 1))); }

/* ── 会話 ── */
function showDlg() { $("#dlg").classList.remove("hidden"); }
function hideDlg() { $("#dlg").classList.add("hidden"); $("#dlgName").textContent = ""; $("#dlgTxt").textContent = ""; $("#dlgCh").innerHTML = ""; }
function msg(text, name) {
  return new Promise((res) => {
    showDlg();
    $("#dlgName").textContent = name || "";
    $("#dlgCh").innerHTML = "";
    const el = $("#dlgTxt"); el.textContent = "";
    $("#dlgNext").style.visibility = "hidden";
    let i = 0; G.dlgSkip = false;
    const iv = setInterval(() => {
      if (G.dlgSkip) { el.textContent = text; clearInterval(iv); done(); return; }
      el.textContent = text.slice(0, ++i);
      if (i % 2 === 0) AUD.play("blip");
      if (i >= text.length) { clearInterval(iv); done(); }
    }, 26);
    function done() {
      $("#dlgNext").style.visibility = "visible";
      G.dlgResolve = () => { G.dlgResolve = null; res(); };
    }
    G.dlgResolve = () => { G.dlgSkip = true; G.dlgResolve = null; };
  });
}
function choice(q, opts) {
  return new Promise((res) => {
    showDlg();
    $("#dlgName").textContent = "";
    $("#dlgTxt").textContent = q || "";
    $("#dlgNext").style.visibility = "hidden";
    const box = $("#dlgCh"); box.innerHTML = "";
    opts.forEach((t, i) => {
      const b = document.createElement("button");
      b.textContent = t;
      b.onclick = (e) => { e.stopPropagation(); AUD.play("blip"); box.innerHTML = ""; res(i); };
      box.appendChild(b);
    });
  });
}
$("#dlg").addEventListener("click", () => { if (G.dlgResolve) G.dlgResolve(); });

/* ============================================================
   イベントランナー
   ============================================================ */
function setFlagLocal(f) { S.flags[f] = true; }
function setFlag(f) {
  S.flags[f] = true;
  if (G.online && window.ManorOnline) window.ManorOnline.setFlag(f);
}
const API = {
  faceLeft() { S.dir = "left"; },
  setFlag, toast,
  msg, choice, addFear,
  async libGap() { await LIB_GAP(); },
  async tryDarkDoor() { await DARK_DOOR(); },
  async startDollChase() { await DOLL_CHASE(); },
};

async function runEvent(evId) {
  const list = typeof evId === "string" ? D.EV[evId] : evId;
  if (!list) return;
  G.lock++;
  try { await runSteps(list); }
  catch (e) { if (e !== ABORT) console.error(e); }
  finally { G.lock = Math.max(0, G.lock - 1); if (!G.lock) hideDlg(); }
}
async function runSteps(list) {
  for (const st of list) {
    if (typeof st === "string") { await msg(st); continue; }
    if (st.m !== undefined) { await msg(st.m, st.n); continue; }
    if (st.once) { if (S.flags[st.once]) throw ABORT; setFlagLocal(st.once); continue; }
    if (st.if !== undefined) {
      const ok = typeof st.if === "function" ? st.if(S, G) : !!S.flags[st.if];
      await runSteps(ok ? (st.then || []) : (st.else || [])); continue;
    }
    if (st.q !== undefined) {
      const idx = await choice(st.q, st.ch.map(c => c.t));
      await runSteps(st.ch[idx].ev || []); continue;
    }
    if (st.set) { setFlag(st.set); continue; }
    if (st.give) { S.items[st.give] = (S.items[st.give] || 0) + 1; continue; }
    if (st.take) { if (S.items[st.take]) { S.items[st.take]--; if (!S.items[st.take]) delete S.items[st.take]; } continue; }
    if (st.need) { if (!has(st.need)) { await runSteps(st.else || []); throw ABORT; } continue; }
    if (st.needFlag) { if (!S.flags[st.needFlag]) { await runSteps(st.else || []); throw ABORT; } continue; }
    if (st.tp) { await changeMap(st.tp.map, st.tp.x, st.tp.y, st.tp.dir || S.dir); continue; }
    if (st.death) { await doDeath(st.death); throw ABORT; }
    if (st.fear !== undefined) { addFear(st.fear); continue; }
    if (st.snd) { AUD.play(st.snd); continue; }
    if (st.fx) { doFx(st.fx); continue; }
    if (st.wait) { await sleep(st.wait); continue; }
    if (st.fn) { await st.fn(API); continue; }
    if (st.catpet) { await CAT_PET(); continue; }
    if (st.candle) { await CANDLE(st.candle); continue; }
    if (st.gardener) { await GARDENER(); continue; }
    if (st.dollmeet) { await DOLL_MEET(); continue; }
    if (st.clockmin) { await CLOCK_MIN(); continue; }
    if (st.clockfail) { await CLOCK_FAIL(); continue; }
    if (st.pianofail) { await PIANO_FAIL(); continue; }
    if (st.savemenu) { openSave(); throw ABORT; }
    if (st.finale) { await FINALE(); continue; }
  }
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function doFx(k) {
  if (k === "shake") { document.body.classList.add("shake"); setTimeout(() => document.body.classList.remove("shake"), 320); }
  if (k === "flash") { const f = $("#fxFlash"); f.style.opacity = "0.85"; setTimeout(() => f.style.opacity = "0", 140); }
  if (k === "red") { const f = $("#fxRed"); f.style.opacity = "1"; setTimeout(() => f.style.opacity = "0", 1800); }
}

/* ── カスタムイベント ── */
async function CAT_PET() {
  const flag = "cat_pet_" + S.map;
  const i = await choice("黒猫は尻尾を揺らしている。", ["撫でる", "そっとしておく"]);
  if (i === 0) {
    AUD.play("meow");
    if (!S.flags[flag]) { setFlagLocal(flag); S.catBond++; }
    await msg("猫は目を細めて、喉を鳴らした。\nほんの少しだけ、心が軽くなった。", "");
    S.fear = Math.max(0, S.fear - 8);
  } else {
    await msg("「……ふうん」", "黒猫");
  }
}
async function CANDLE(which) {
  if (S.flags.hall_cand_done) { await msg("焔は静かに揺れている。"); return; }
  const order = ["L", "R", "C"];
  const n = S.vars.cseq || 0;
  if (S.flags["hall_cl_" + which]) { await msg("この燭台には、もう焔が灯っている。"); return; }
  if (order[n] === which) {
    setFlagLocal("hall_cl_" + which); S.vars.cseq = n + 1; AUD.play("candle");
    await msg("燭台に焔を灯した。（" + (n + 1) + "/3）");
    if (S.vars.cseq >= 3) {
      setFlag("hall_cand_done"); doFx("flash"); AUD.play("chime");
      await msg("三つの焔が、同時に大きく燃え上がった。");
      await msg("天井から、何かが落ちてくる音がした。\n——中央の絨毯の上だ。");
    }
  } else {
    S.vars.cseq = 0;
    delete S.flags.hall_cl_L; delete S.flags.hall_cl_R; delete S.flags.hall_cl_C;
    AUD.play("laugh"); addFear(5);
    await msg("焔は一瞬で掻き消えた。\n\n……どこかで、小さな笑い声がした。");
  }
}
async function LIB_GAP() {
  if (!has("book1") || !has("book2") || !has("book3")) {
    await msg("本棚に、ちょうど三冊分の空きがある。\n赤い本を還してやるべきだろうか。");
    return;
  }
  const titles = ["『はじまりノ夜』", "『真夜中ノ客』", "『オワリノ朝』"];
  const i1 = await choice("一冊目に還すのは?", titles);
  const rest = titles.filter((_, i) => i !== i1);
  const i2r = await choice("二冊目に還すのは?", rest);
  const pick2 = titles.indexOf(rest[i2r]);
  const ok = (i1 === 0 && pick2 === 1);
  await msg("三冊の本を、棚に還した。");
  if (ok) {
    doFx("shake"); AUD.play("stone");
    setFlag("lib_secret");
    await msg("図書室全体が、地鳴りのように震えた。");
    await msg("奥の鏡の表面が——\n水面のように、揺らめき始めた。");
  } else {
    const n = (S.vars.libfail || 0) + 1; S.vars.libfail = n;
    S.items.book1 = 1; S.items.book2 = 1; S.items.book3 = 1;
    if (n === 1) {
      AUD.play("creak"); addFear(8);
      await msg("本棚が、軋んだ。\n\n三冊の本が、足元に吐き出される。\n\n『順番ヲ 間違エルナ』");
    } else {
      doFx("shake"); AUD.play("crash");
      await msg("頭上の本棚が、大きく傾いた——!");
      await doDeath("shelf"); throw ABORT;
    }
  }
}
async function GARDENER() {
  const n = S.vars.gard_n || 0;
  if (has("photo")) {
    const i = await choice("庭師は土いじりの手を止めない。", ["古い写真を見せる", "話しかける", "立ち去る"]);
    if (i === 0) {
      AUD.play("chime");
      await msg("「——これは。……これは、これは」", "庭師");
      await msg("庭師の濁った瞳に、ゆっくりと光が戻っていく。", "");
      await msg("「思い出した。わしは、庭師じゃ。\n　花を育て、人を喰わせるためではなく——\n　人を笑わせるために、花を植えとった」", "庭師");
      await msg("「婆様の孫か。道理で、花たちが騒ぐわけじゃ」", "庭師");
      setFlag("gar_saved");
      if (!S.flags.gar_key_given) {
        setFlag("gar_key_given");
        S.items.key_red = 1; AUD.play("key");
        await msg("【赤い鍵】を手に入れた。");
        await msg("「上の扉の鍵じゃ。……気をつけてな。\n　この館で「時間」を飼っとる部屋は、\n　わしら以上に、性格が悪い」", "庭師");
      }
      return;
    }
    if (i === 2) return;
  }
  if (has("seed") && !S.flags.gar_saved) {
    const i = await choice("庭師は何かを探しているようだ。", ["花の種を渡す", "話しかける", "立ち去る"]);
    if (i === 0) {
      await msg("「おお……おお! これじゃ、これを探しとった!」", "庭師");
      S.items.key_red = 1; delete S.items.seed; AUD.play("key");
      await msg("「礼じゃ。上の扉の鍵をやろう」\n\n【赤い鍵】を手に入れた。");
      await msg("庭師は、震える手で種を土に埋めた。");
      await sleep(600); doFx("shake"); AUD.play("sting2");
      await msg("——温室中の蕾が、一斉に開いた。");
      setFlag("garden_bloom");
      await msg("「ああ……ああ、綺麗じゃろう?\n　みんな、みんな、飢えとるんじゃ」", "庭師");
      await msg("庭師がこちらを振り向いた。\nその目は、もう人間のものではなかった。", "");
      setFlag("gar_chase_on");
      const gob = (G.mapDef.obj || []).find(o => o.ev === "gar_gardener");
      spawnChaser("gardener", gob ? gob.x : 18, gob ? gob.y : 3, 2.25 * diffC().chase, "scissors");
      addFear(20); AUD.play("sting");
      toast("逃げろ! 上の扉へ!", true);
      return;
    }
    if (i === 2) return;
  }
  // 通常会話ローテーション
  const lines = [
    "「おお、久しぶりの客人じゃ。……いや、\n　初めてかの? わしにはもう、区別がつかん」",
    "「この花たちはな、わしが名前をつけとる。\n　名前を呼ぶと、返事をするんじゃよ」",
    "「昔、あんたによう似た人がここに来た。\n　あの人は花に好かれた。……珍しいことじゃ」",
    "「花の種か、なつかしい思い出——\n　どちらかを、わしにくれんかの」",
  ];
  await msg(lines[Math.min(n, lines.length - 1)], "庭師");
  S.vars.gard_n = n + 1;
}
async function DOLL_MEET() {
  const n = S.vars.doll_n || 0;
  if (n === 0) {
    await msg("客席に、白いドレスの人形が座っている。");
    addFear(6); AUD.play("whisper");
    await msg("……いま、首がこちらを向いた。");
    await msg("「…………めが。ひだりのめが、ないの」", "人形少女");
    S.vars.doll_n = 1; return;
  }
  if (has("eye")) {
    const i = await choice("人形少女は、左目のない顔でこちらを見上げている。", ["左目を渡す", "何もしない"]);
    if (i === 0) {
      delete S.items.eye; AUD.play("chime");
      await msg("ガラスの瞳を、そっと嵌めてあげた。");
      await msg("「……みえる。……ぜんぶ、みえる」", "人形少女");
      await msg("人形少女は、初めて笑った。\nそれは、恐ろしくも、綺麗な笑顔だった。", "");
      setFlag("doll_friend");
      S.fear = Math.max(0, S.fear - 12);
      const di = G.chasers.findIndex(c => c.spr === "doll");
      if (di >= 0) { G.chasers.splice(di, 1); setFlag("th_open"); toast("人形少女は追うのをやめた"); }
      return;
    }
  }
  const lines = [
    "「かえして」\n\n——何を、とは言わなかった。",
    "「おうたが、きこえるの。\n　ピアノのなかから、きこえるの」",
    "「あのこ（舞台の人形）はね、\n　まねっこしか、できないの。かわいそう」",
  ];
  await msg(lines[Math.min(n - 1, lines.length - 1)], "人形少女");
  addFear(4);
  S.vars.doll_n = n + 1;
}
async function DOLL_CHASE() {
  if (S.flags.doll_friend) {
    setFlag("th_open"); AUD.play("door");
    await msg("客席で、小さな拍手の音がした。");
    await msg("「すてきな、えんそうだったわ」", "人形少女");
    await msg("上手の扉が、静かに開いた。");
    return;
  }
  setFlag("th_chase_on");
  await msg("客席の人形たちが、一斉に立ち上がった。");
  await msg("「———— み つ け た 」", "人形少女");
  spawnChaser("doll", 11, 9, 1.05 * diffC().chase, "doll");
  addFear(22); AUD.play("sting");
  toast("オルゴールを持って、上手の扉へ!", true);
}
async function CLOCK_MIN() {
  const i = await choice("長針を何分に合わせる?", ["15分", "44分", "30分"]);
  if (i === 1) {
    AUD.play("chime"); doFx("flash");
    setFlag("clk_stop");
    await msg("カチン、と音がして——\n\nすべての時計が、一斉に止まった。");
    await msg("振り子の刃も、空中で静止している。");
    AUD.play("stone"); doFx("shake");
    await msg("……石像が、台座から降りる音がした。", "");
    addFear(14);
    // 石像を追跡者化
    for (const pos of [[3, 7], [18, 7]]) {
      if (tileAt(pos[0], pos[1]) === "S") { setTile(pos[0], pos[1], "."); spawnChaser("statuech", pos[0], pos[1], 1.05 * diffC().chase, "statue"); }
    }
    toast("止まった時の中で、石像が動き出した", true);
  } else { await CLOCK_FAIL(); }
}
async function CLOCK_FAIL() {
  const n = (S.vars.clkfail || 0) + 1; S.vars.clkfail = n;
  if (n === 1) { AUD.play("deny"); addFear(6); await msg("大時計が、不快な音を立てた。\nゼンマイの唸りが、警告のように響く。"); }
  else if (n === 2) { AUD.play("creak"); addFear(10); doFx("shake"); await msg("時計の内部で、何かが軋んでいる。\n\n——次はない。そう直感した。"); }
  else { doFx("shake"); AUD.play("crash"); await msg("大時計の文字盤が、内側から膨らんだ——!"); await doDeath("clockboom"); throw ABORT; }
}
async function PIANO_FAIL() {
  const n = (S.vars.pnofail || 0) + 1; S.vars.pnofail = n;
  if (n === 1) { AUD.play("pianobad"); addFear(8); await msg("不協和音が劇場に響いた。\n\nピアノ線が一本、鋭い音を立てて切れた。\n頬のすぐ横を、何かが掠める。"); }
  else { AUD.play("pianobad"); doFx("shake"); await msg("残りのピアノ線が、一斉に弾けた——!"); await doDeath("wire"); throw ABORT; }
}
async function DARK_DOOR() {
  if (nearLight(2.8)) {
    await msg("扉は沈黙している。\n\n——まだ、「灯り」の中にいる。");
  } else {
    setFlag("lo_inner"); AUD.play("stone"); addFear(12);
    await msg("扉が、闇に溶けるように開いた。");
    spawnShadow();
  }
}
async function FINALE() {
  const sh = shards();
  await msg("「……いらっしゃい。ずっと、待っていたのよ」", "白い女性");
  await msg("「この館は、寂しがり屋なの。\n　訪れた人を、帰したくないくらいに」", "白い女性");
  if (sh >= 5) {
    await msg("あなたの掌で、記憶のかけらが光り出した。");
    doFx("flash"); AUD.play("shard");
    await msg("——すべてが、繋がっていく。");
    await msg("この館は、遠い昔、たったひとりの魔法使いの\n「帰る場所が欲しい」という祈りから生まれた。");
    await msg("祖母は、館を壊すために来たのではない。\n年老いていく自分の代わりに、館を看取るため——\n館の一部になることを、自分で選んだのだ。");
    await msg("「……そう。あの人は、私になったの。\n　私は、あの人になった」", "白い女性");
    await msg("白い女性の輪郭が、一瞬、\nあなたのよく知る面影に重なった。", "");
    if (S.flags.doll_friend && S.flags.butler_saved && S.flags.gar_saved) {
      await msg("「人形の瞳も、執事の時も、庭師の思い出も。\n　あなたが、みんなに返してくれたのね」", "白い女性");
    }
  } else {
    await msg("「あなたは、何も思い出せないまま。\n　……それも、優しさかもしれないわね」", "白い女性");
  }
  await msg("「選んで。\n　MagiCoreに触れる資格が、あなたにはある」", "白い女性");
  const opts = ["MagiCoreを壊す", "館に残る"];
  const canSecret = S.catBond >= 4 && S.fear <= 25;
  if (canSecret) opts.push("——共に在る");
  const i = await choice("どうする?", opts);
  if (i === 1) { await runEnding("BAD"); return; }
  if (i === 2 && canSecret) {
    AUD.play("meow");
    await msg("足元に、黒猫がすり寄ってきた。");
    await msg("「へえ。……そういうの、選ぶんだ」", "黒猫");
    await runEnding("SECRET"); return;
  }
  // 壊す
  doFx("shake"); doFx("flash"); AUD.play("crash");
  await msg("あなたはコアに手を伸ばし——\n\nそれを、砕いた。");
  const perfect = sh >= 5 && S.flags.doll_friend && S.flags.butler_saved && S.flags.gar_saved;
  if (perfect && sh >= 6 && S.deaths === 0) { await runEnding("UNKNOWN"); return; }
  if (perfect) { await runEnding("PERFECT"); return; }
  if (sh >= 5) { await runEnding("TRUE"); return; }
  await runEnding("NORMAL");
}

/* ============================================================
   死亡 / エンディング
   ============================================================ */
async function doDeath(cause) {
  if (G.deadHold) return; G.deadHold = true;
  G.lock++;
  AUD.play("sting"); doFx("red"); doFx("shake");
  MEM.deaths.push({ map: S.map, x: S.x, y: S.y, cause, t: Date.now() });
  if (MEM.deaths.length > 400) MEM.deaths = MEM.deaths.slice(-400);
  MEM.totalDeaths++; jsave(MEM_KEY, MEM);
  S.deaths++;
  if (G.online && window.ManorOnline) window.ManorOnline.sendEvent("death", { cause, map: S.map });
  await sleep(900);
  const dd = D.DEATHS[cause] || { t: "死んだ", s: "……" };
  $("#deathT").textContent = dd.t;
  $("#deathS").textContent = dd.s + "\n\n——館は、あなたの死を記憶した——";
  $("#death").classList.remove("hidden");
  G.mode = "dead";
  AUD.stopDrone();
}
$("#death").addEventListener("click", () => {
  if (G.mode !== "dead") return;
  $("#death").classList.add("hidden");
  respawn();
});
function respawn() {
  const deaths = S.deaths, catB = S.catBond;
  const onlineFlags = G.online ? Object.assign({}, S.flags) : null;
  if (G.auto) {
    S = JSON.parse(JSON.stringify(G.auto));
    S.deaths = deaths; S.catBond = Math.max(S.catBond, catB);
    if (onlineFlags) S.flags = onlineFlags; // オンラインは世界の状態を共有
  }
  S.fear = Math.min(60, S.fear + 10);
  loadMap(S.map, S.x, S.y, S.dir, true);
  G.deadHold = false;
  G.lock = 0; hideDlg();
  G.mode = "play";
}

async function runEnding(key) {
  const E = D.ENDINGS[key];
  MEM.endings[key] = (MEM.endings[key] || 0) + 1;
  MEM.clears++; jsave(MEM_KEY, MEM);
  awardXeva("end_" + key, E.xeva, "ENDING『" + E.name + "』");
  if (G.online && window.ManorOnline) window.ManorOnline.sendEvent("ending", { key, name: E.name });
  G.mode = "ending"; AUD.stopDrone(); AUD.play("chime");
  $("#endRank").textContent = E.rank;
  $("#endName").textContent = E.name;
  $("#endTxt").textContent = E.txt;
  $("#ending").classList.remove("hidden");
  $("#endCredit").innerHTML =
    `MagiManor — "The Manor Remembers Everything."<br>
     <img src="../../brand/NGX.png" alt="NGX"><img src="../../brand/MagicalFuture.png" alt="Magical Future"><img src="../../brand/ISHIDA Production.png" alt="ISHIDA Production"><br>
     PRESENTED BY NGX × MAGICAL FUTURE × ISHIDA PRODUCTION<br>XEVARION`;
  throw ABORT;
}
$("#ending").addEventListener("click", () => {
  if (G.mode !== "ending") return;
  $("#ending").classList.add("hidden");
  if (G.online && window.ManorOnline) { window.ManorOnline.leave(); G.online = null; }
  showTitle();
});

/* ============================================================
   マップ遷移 / セーブ
   ============================================================ */
async function changeMap(map, x, y, dir) {
  const f = $("#fxFlash"); f.style.background = "#000"; f.style.opacity = "1";
  await sleep(260);
  loadMap(map, x, y, dir);
  await sleep(120);
  f.style.opacity = "0";
  setTimeout(() => { f.style.background = "#fff"; }, 300);
}
function loadMap(map, x, y, dir, isRespawn) {
  S.map = map; S.x = x; S.y = y; S.dir = dir || "down";
  S.px = x * TS; S.py = y * TS;
  G.mapDef = D.MAPS[map];
  G.grid = G.mapDef.grid.slice();
  G.chasers = []; G.hallu = []; G.tween = null; G.shadowT = 0;
  // 章到達XEVA
  const ch = G.mapDef.chapter;
  if (ch && !XST["ch_" + map] && map !== "mirrorlib") awardXeva("ch_" + map, 40, G.mapDef.name);
  if (ch) S.chapterMax = Math.max(S.chapterMax, ch);
  // 追跡再配置
  if (map === "garden" && S.flags.gar_chase_on && !S.flags.gar_saved) spawnChaser("gardener", 18, 3, 2.25 * diffC().chase, "scissors");
  if (map === "theater" && S.flags.th_chase_on && !S.flags.doll_friend && !S.flags.th_open) spawnChaser("doll", 11, 9, 1.05 * diffC().chase, "doll");
  if (map === "clock" && S.flags.clk_stop) {
    for (const pos of [[3, 7], [18, 7]]) {
      if (tileAt(pos[0], pos[1]) === "S") { setTile(pos[0], pos[1], "."); spawnChaser("statuech", pos[0], pos[1], 1.0 * diffC().chase, "statue"); }
    }
  }
  // オートセーブ（リスポーン地点）
  if (!isRespawn) G.auto = JSON.parse(JSON.stringify(S));
  AUD.drone(G.mapDef.theme);
  if (G.online && window.ManorOnline) window.ManorOnline.sendEvent("chapter", { map, name: G.mapDef.name });
  updateHud();
  // 入場イベント
  if (G.mapDef.enter && !isRespawn) setTimeout(() => runEvent(G.mapDef.enter), 380);
}

/* ── セーブ/ロード ── */
function saveStore() { return jload(SAVE_KEY, { slots: {} }); }
function openSave() {
  const st = saveStore();
  const box = $("#saveSlots"); box.innerHTML = "";
  $("#saveTitle").textContent = "タイプライター — 記録を打つ";
  for (let i = 1; i <= 3; i++) {
    const s = st.slots[i];
    const el = document.createElement("div");
    el.className = "slot" + (s ? "" : " empty");
    el.innerHTML = s
      ? `<div class="s-t">記録 ${i} — ${D.MAPS[s.map] ? D.MAPS[s.map].name : s.map}</div>
         <div class="s-d">💀${s.deaths}　✨${(s.items && s.items.shard) || 0}/6　${fmtT(s.playT)}　${new Date(s.saved).toLocaleString("ja-JP")}</div>`
      : `<div class="s-t">記録 ${i} — （白紙のページ）</div><div class="s-d">ここに新しく記録する</div>`;
    el.onclick = () => {
      AUD.play("type");
      const snap = JSON.parse(JSON.stringify(S)); snap.saved = Date.now();
      st.slots[i] = snap; jsave(SAVE_KEY, st);
      G.auto = JSON.parse(JSON.stringify(S));
      const dc = diffC();
      if (dc.saveCalm === "zero") S.fear = 0;
      else if (dc.saveCalm === "part") S.fear = Math.max(0, S.fear - 40);
      closeModal("#saveModal");
      toast("🕯 記録した。恐怖が少し和らいだ");
      runEvent(["カタ、カタ、カタ……チン。\n\nあなたは今日までの出来事を、紙に打ち付けた。\n館が、それを読んでいる気配がした。"]);
    };
    box.appendChild(el);
  }
  $("#saveModal").classList.remove("hidden");
}
function openLoadTitle() {
  const st = saveStore();
  const box = $("#loadSlots"); box.innerHTML = "";
  let any = false;
  for (let i = 1; i <= 3; i++) {
    const s = st.slots[i];
    if (!s) continue;
    any = true;
    const el = document.createElement("div");
    el.className = "slot";
    el.innerHTML = `<div class="s-t">記録 ${i} — ${D.MAPS[s.map] ? D.MAPS[s.map].name : s.map}</div>
      <div class="s-d">💀${s.deaths}　✨${(s.items && s.items.shard) || 0}/6　${fmtT(s.playT)}　${new Date(s.saved).toLocaleString("ja-JP")}</div>`;
    el.onclick = () => {
      closeModal("#loadModal");
      startRun(JSON.parse(JSON.stringify(s)));
    };
    box.appendChild(el);
  }
  if (!any) box.innerHTML = `<div class="inv-empty">記録は、まだ何も打たれていない。</div>`;
  $("#loadModal").classList.remove("hidden");
}
function fmtT(sec) { sec = sec | 0; return Math.floor(sec / 60) + "分" + (sec % 60) + "秒"; }
function closeModal(sel) { $(sel).classList.add("hidden"); }

/* ============================================================
   メニュー / 記録
   ============================================================ */
function openMenu() {
  if (G.mode !== "play" || G.lock) return;
  const grid = $("#invGrid"); grid.innerHTML = "";
  let anyItem = false;
  for (const id in S.items) {
    const def = D.ITEMS[id]; if (!def) continue;
    anyItem = true;
    const el = document.createElement("div");
    el.className = "inv-it";
    el.innerHTML = `<div class="i-ic">${def.ic}</div><div class="i-nm">${def.n}${def.count && S.items[id] > 1 ? " ×" + S.items[id] : ""}</div>`;
    el.onclick = () => { $("#invDesc").textContent = def.d; };
    grid.appendChild(el);
  }
  if (!anyItem) grid.innerHTML = `<div class="inv-empty" style="grid-column:1/-1">持ち物はない。</div>`;
  $("#invDesc").textContent = "";
  $("#menuStats").innerHTML =
    `<div class="stat-line"><span>現在地</span><b>${G.mapDef.name}</b></div>
     <div class="stat-line"><span>死亡回数</span><b>${S.deaths}</b></div>
     <div class="stat-line"><span>記憶のかけら</span><b>${shards()} / 6</b></div>
     <div class="stat-line"><span>難易度</span><b>${diffC().n}</b></div>
     <div class="stat-line"><span>プレイ時間</span><b>${fmtT(S.playT)}</b></div>` +
    (G.online ? `<div class="stat-line"><span>共鳴部屋</span><b>${window.ManorOnline ? window.ManorOnline.code() : ""}</b></div>` : "");
  $("#menuLeave").classList.toggle("hidden", !G.online);
  $("#menu").classList.remove("hidden");
}
function openRecords() {
  $("#memStats").innerHTML =
    `<div class="mem-cell"><div class="v">${MEM.runs}</div><div class="k">来訪回数</div></div>
     <div class="mem-cell"><div class="v">${MEM.totalDeaths}</div><div class="k">総死亡数</div></div>
     <div class="mem-cell"><div class="v">${MEM.clears}</div><div class="k">結末到達</div></div>
     <div class="mem-cell"><div class="v">${Object.keys(MEM.endings).length} / 6</div><div class="k">エンディング</div></div>`;
  const order = ["BAD", "NORMAL", "TRUE", "PERFECT", "SECRET", "UNKNOWN"];
  $("#endList").innerHTML = order.map(k => {
    const E = D.ENDINGS[k], got = MEM.endings[k];
    return `<div class="end-row${got ? " got" : ""}"><span class="no">${E.rank}</span><span>${got ? E.name : "???????"}</span></div>`;
  }).join("");
  $("#records").classList.remove("hidden");
}

/* ============================================================
   入力
   ============================================================ */
const KEYD = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right" };
const heldKeys = new Set();
window.addEventListener("keydown", (e) => {
  if (e.repeat) return;
  const d = KEYD[e.key];
  if (d) { heldKeys.add(d); G.held = d; e.preventDefault(); return; }
  if (e.key === "z" || e.key === "Enter" || e.key === " ") { e.preventDefault(); act(); }
  if (e.key === "x" || e.key === "Escape") { e.preventDefault(); openMenu(); }
});
window.addEventListener("keyup", (e) => {
  const d = KEYD[e.key];
  if (d) { heldKeys.delete(d); G.held = heldKeys.size ? [...heldKeys][heldKeys.size - 1] : null; }
});
function act() {
  if (G.mode !== "play") return;
  if (G.lock) { if (G.dlgResolve) G.dlgResolve(); return; }
  const dd = dirD(S.dir), tx = S.x + dd.x, ty = S.y + dd.y;
  // オブジェクト
  const objs = objsAt(tx, ty).concat(objsAt(S.x, S.y).filter(o => !o.solid));
  for (const o of objs) { if (o.ev) { runEvent(o.ev === "typewriter" ? "typewriter" : o.ev); return; } }
  // 扉
  const d = doorAt(tx, ty);
  if (d && tileAt(tx, ty) === "+") {
    if (doorOpen(d)) return;
    if (d.ev) { runEvent(d.ev); return; }
    if (d.need && has(d.need)) {
      setFlag(d.flag); AUD.play("door");
      runEvent([`${D.ITEMS[d.need].n}を使った。\n\n${d.name}の錠が、重い音を立てて開いた。`]);
      return;
    }
    runEvent([d.locked || "開かない。"]);
    return;
  }
  // タイル既定
  const ch = tileAt(tx, ty);
  const tev = G.mapDef.tileEv && G.mapDef.tileEv[ch];
  if (tev) { runEvent(tev); return; }
  if (DEFAULT_MSG[ch]) { runEvent([DEFAULT_MSG[ch]]); return; }
}
// タッチ
function bindHold(el, dir) {
  const on = (e) => { e.preventDefault(); G.held = dir; };
  const off = (e) => { e.preventDefault(); if (G.held === dir) G.held = null; };
  el.addEventListener("touchstart", on, { passive: false });
  el.addEventListener("touchend", off); el.addEventListener("touchcancel", off);
  el.addEventListener("mousedown", on); el.addEventListener("mouseup", off); el.addEventListener("mouseleave", off);
}
["up", "down", "left", "right"].forEach(d => bindHold($("#pad ." + d), d));
$("#actBtn").addEventListener("click", (e) => { e.preventDefault(); act(); });
window.addEventListener("touchstart", function once() { document.body.classList.add("touch"); window.removeEventListener("touchstart", once); }, { passive: true });

$("#menuBtn").addEventListener("click", openMenu);
$("#sndBtn").addEventListener("click", () => { const m = AUD.toggle(); $("#sndBtn").textContent = m ? "🔇" : "🔊"; });
$("#menuClose").addEventListener("click", () => closeModal("#menu"));
$("#menuTitle2").addEventListener("click", () => {
  closeModal("#menu");
  if (G.online && window.ManorOnline) { window.ManorOnline.leave(); G.online = null; }
  G.mode = "title"; AUD.stopDrone(); showTitle();
});
$("#menuLeave").addEventListener("click", () => {
  if (window.ManorOnline) window.ManorOnline.leave();
  G.online = null; closeModal("#menu"); toast("共鳴を解除した");
});
$("#saveClose").addEventListener("click", () => closeModal("#saveModal"));
$("#loadClose").addEventListener("click", () => closeModal("#loadModal"));
$("#recClose").addEventListener("click", () => closeModal("#records"));

/* ============================================================
   サウンド（WebAudio 全合成）
   ============================================================ */
const AUD = (function () {
  let ac = null, master = null, muted = jload("magimanor_mute", false);
  let droneNodes = [], heartIv = null, heartOn = false, creakIv = null;
  function ctx2() {
    if (!ac) {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(ac.destination);
    }
    if (ac.state === "suspended") ac.resume();
    return ac;
  }
  function env(g, t0, a, d, peak) {
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(peak, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
  }
  function tone(freq, type, a, d, peak, when, bend) {
    const c = ctx2(), o = c.createOscillator(), g = c.createGain();
    o.type = type || "sine"; o.frequency.value = freq;
    if (bend) o.frequency.exponentialRampToValueAtTime(bend, c.currentTime + (when || 0) + a + d);
    o.connect(g); g.connect(master);
    const t0 = c.currentTime + (when || 0);
    env(g, t0, a, d, peak);
    o.start(t0); o.stop(t0 + a + d + 0.05);
  }
  function noise(dur, peak, fc, when) {
    const c = ctx2(), b = c.createBuffer(1, c.sampleRate * dur, c.sampleRate), data = b.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(); src.buffer = b;
    const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = fc || 800;
    const g = c.createGain();
    src.connect(f); f.connect(g); g.connect(master);
    const t0 = c.currentTime + (when || 0);
    env(g, t0, 0.01, dur, peak);
    src.start(t0);
  }
  const SFX = {
    step: () => noise(0.05, 0.05, 500),
    blip: () => tone(880, "square", 0.001, 0.02, 0.012),
    door: () => { noise(0.3, 0.2, 300); tone(70, "sine", 0.01, 0.4, 0.25); },
    key: () => { tone(1320, "triangle", 0.005, 0.15, 0.15); tone(1760, "triangle", 0.005, 0.2, 0.12, 0.08); },
    deny: () => tone(110, "square", 0.01, 0.25, 0.12),
    type: () => { for (let i = 0; i < 5; i++) noise(0.03, 0.09, 3000, i * 0.09); tone(1980, "triangle", 0.005, 0.3, 0.1, 0.5); },
    sting: () => { tone(220, "sawtooth", 0.01, 0.9, 0.28, 0, 55); tone(233, "sawtooth", 0.01, 0.9, 0.24, 0, 58); noise(0.7, 0.2, 900); },
    sting2: () => { tone(440, "sawtooth", 0.01, 0.4, 0.13, 0, 220); tone(466, "sawtooth", 0.01, 0.4, 0.11, 0, 233); },
    crash: () => { noise(1.0, 0.4, 500); tone(55, "sine", 0.01, 1.1, 0.3); },
    creak: () => tone(180, "sawtooth", 0.35, 0.7, 0.06, 0, 120),
    whisper: () => { noise(0.9, 0.05, 2400); noise(0.6, 0.04, 3200, 0.35); },
    shard: () => { [880, 1108, 1318, 1760].forEach((f, i) => tone(f, "sine", 0.01, 0.5, 0.1, i * 0.09)); },
    chime: () => { [660, 880, 990].forEach((f, i) => tone(f, "triangle", 0.01, 0.8, 0.12, i * 0.14)); },
    mirror: () => { tone(1200, "sine", 0.05, 0.7, 0.1, 0, 2400); noise(0.5, 0.06, 4000); },
    stone: () => { noise(0.8, 0.3, 160); tone(45, "sine", 0.02, 0.9, 0.3); },
    gear: () => { for (let i = 0; i < 6; i++) noise(0.03, 0.12, 1200, i * 0.07); },
    piano3: () => { [0, 0.35, 0.7].forEach(w => { tone(392, "triangle", 0.005, 1.1, 0.2, w); tone(784, "sine", 0.005, 0.9, 0.06, w); }); },
    pianobad: () => { tone(392, "sawtooth", 0.005, 0.8, 0.16); tone(415, "sawtooth", 0.005, 0.8, 0.16); tone(2600, "sine", 0.001, 0.3, 0.1, 0.1, 300); },
    laugh: () => { [700, 620, 540, 460].forEach((f, i) => tone(f, "square", 0.005, 0.06, 0.05, i * 0.09)); },
    meow: () => tone(620, "sawtooth", 0.04, 0.35, 0.07, 0, 380),
    candle: () => noise(0.15, 0.08, 2000),
    crack: () => { noise(0.15, 0.25, 1500); noise(0.4, 0.2, 400, 0.1); },
    knock: () => { [0, 0.25, 0.5].forEach(w => noise(0.06, 0.18, 250, w)); },
    heart: () => { tone(50, "sine", 0.01, 0.16, 0.4); tone(45, "sine", 0.01, 0.2, 0.3, 0.18); },
  };
  const DRONE_FREQ = { hall: 55, library: 49, mirror: 62, garden: 52, clock: 58, theater: 46, lost: 41, heart: 43 };
  return {
    play(k) { try { if (SFX[k]) SFX[k](); } catch (e) {} },
    drone(theme) {
      try {
        this.stopDrone();
        const c = ctx2(), f = DRONE_FREQ[theme] || 50;
        for (const det of [0, 1.7]) {
          const o = c.createOscillator(), g = c.createGain();
          o.type = "sine"; o.frequency.value = f + det;
          g.gain.value = 0.035;
          const lfo = c.createOscillator(), lg = c.createGain();
          lfo.frequency.value = 0.07 + det * 0.03; lg.gain.value = 0.02;
          lfo.connect(lg); lg.connect(g.gain);
          o.connect(g); g.connect(master); o.start(); lfo.start();
          droneNodes.push(o, lfo, g);
        }
        if (creakIv) clearInterval(creakIv);
        creakIv = setInterval(() => { if (Math.random() < 0.3) SFX.creak(); }, 14000);
      } catch (e) {}
    },
    stopDrone() {
      droneNodes.forEach(n => { try { n.stop ? n.stop() : n.disconnect(); } catch (e) {} });
      droneNodes = [];
      if (creakIv) { clearInterval(creakIv); creakIv = null; }
    },
    setHeart(fear) {
      const want = fear >= 70;
      if (want && !heartOn) { heartOn = true; heartIv = setInterval(() => SFX.heart(), 850); }
      if (!want && heartOn) { heartOn = false; clearInterval(heartIv); }
    },
    toggle() { muted = !muted; jsave("magimanor_mute", muted); if (master) master.gain.value = muted ? 0 : 0.5; return muted; },
    muted: () => muted,
  };
})();

/* ============================================================
   イントロムービー
   ============================================================ */
function playMovie(done) {
  const mv = $("#movie"); mv.classList.remove("hidden");
  const scenes = [
    { d: 4200, html: `<div class="mv-txt">その館は、丘の上に<br>ずっと昔から建っている。<br><br>誰が建てたのかは、誰も知らない。</div>` },
    { d: 4600, manor: true, html: `<div class="mv-txt" style="position:relative;z-index:2">入った者は——<b>出られない。</b></div>`, snd: "stone" },
    { d: 5200, html: `<div class="letter">もし　私が帰らなかったら、<br>館へ来て。<br><br>探さなくて　いいの。<br>ただ、来て。<br><br <br>——おばあちゃんより</div>`.replace("<br <br>", "<br><br>"), snd: "type" },
    { d: 3600, html: `<div class="mv-txt">扉は、ひとりでに開いた。</div>`, snd: "door", shake: true },
    { d: 3600, html: `<div class="mv-txt" style="letter-spacing:.5em">MagiManor<br><span style="font-size:12px;letter-spacing:.4em;color:#514c42">THE MANOR REMEMBERS EVERYTHING.</span></div>`, snd: "chime" },
  ];
  let idx = -1, timer = null, alive = true;
  const holder = document.createElement("div");
  mv.querySelectorAll(".scene").forEach(s => s.remove());
  function next() {
    if (!alive) return;
    idx++;
    if (idx >= scenes.length) return finish();
    const sc = scenes[idx];
    mv.querySelectorAll(".scene").forEach(s => s.classList.remove("in"));
    const el = document.createElement("div");
    el.className = "scene";
    el.innerHTML = sc.html;
    if (sc.manor) {
      const c = document.createElement("canvas");
      c.id = "mvManor"; c.width = 640; c.height = 360;
      drawManorArt(c);
      el.prepend(c);
    }
    mv.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("in")));
    if (sc.snd) AUD.play(sc.snd);
    if (sc.shake) { mv.classList.add("shake"); setTimeout(() => mv.classList.remove("shake"), 300); }
    setTimeout(() => { if (el.parentNode && idx < scenes.length) setTimeout(() => el.remove(), 1200); }, sc.d);
    timer = setTimeout(next, sc.d);
  }
  function finish() {
    alive = false; clearTimeout(timer);
    mv.classList.add("hidden");
    mv.querySelectorAll(".scene").forEach(s => s.remove());
    done();
  }
  mv.onclick = () => { AUD.play("blip"); clearTimeout(timer); next(); };
  $("#mvSkip").onclick = (e) => { e.stopPropagation(); finish(); };
  next();
}
function drawManorArt(c) {
  const x = c.getContext("2d");
  const g = x.createLinearGradient(0, 0, 0, 360);
  g.addColorStop(0, "#0a0714"); g.addColorStop(0.7, "#160f22"); g.addColorStop(1, "#050308");
  x.fillStyle = g; x.fillRect(0, 0, 640, 360);
  x.fillStyle = "rgba(200,200,230,.06)";
  x.beginPath(); x.arc(500, 70, 42, 0, 7); x.fill();
  x.fillStyle = "rgba(230,230,250,.5)"; x.beginPath(); x.arc(500, 70, 30, 0, 7); x.fill();
  x.fillStyle = "#0a0714"; x.beginPath(); x.arc(488, 64, 27, 0, 7); x.fill();
  // 丘
  x.fillStyle = "#0b0812"; x.beginPath();
  x.moveTo(0, 320); x.quadraticCurveTo(320, 250, 640, 320); x.lineTo(640, 360); x.lineTo(0, 360); x.fill();
  // 館
  x.fillStyle = "#08050e";
  x.fillRect(200, 150, 240, 130);
  x.fillRect(170, 180, 40, 100); x.fillRect(430, 180, 40, 100);
  x.beginPath(); x.moveTo(190, 155); x.lineTo(320, 92); x.lineTo(450, 155); x.fill();
  x.beginPath(); x.moveTo(160, 185); x.lineTo(190, 148); x.lineTo(220, 185); x.fill();
  x.beginPath(); x.moveTo(420, 185); x.lineTo(450, 148); x.lineTo(480, 185); x.fill();
  x.fillRect(310, 60, 20, 60);
  // 窓（ひとつだけ灯る）
  x.fillStyle = "rgba(60,50,90,.5)";
  for (let i = 0; i < 5; i++) x.fillRect(225 + i * 42, 185, 14, 22);
  x.fillStyle = "rgba(255,180,90,.85)";
  x.fillRect(225 + 2 * 42, 185, 14, 22);
  const gl = x.createRadialGradient(316, 196, 0, 316, 196, 40);
  gl.addColorStop(0, "rgba(255,180,90,.28)"); gl.addColorStop(1, "transparent");
  x.fillStyle = gl; x.fillRect(270, 150, 100, 90);
  // 霧
  for (let i = 0; i < 3; i++) {
    const fg = x.createLinearGradient(0, 260 + i * 30, 0, 300 + i * 30);
    fg.addColorStop(0, "rgba(140,140,170,0)"); fg.addColorStop(0.5, `rgba(140,140,170,${0.07 - i * 0.015})`); fg.addColorStop(1, "rgba(140,140,170,0)");
    x.fillStyle = fg; x.fillRect(0, 240 + i * 30, 640, 70);
  }
  // 枯れ木
  x.strokeStyle = "#060409"; x.lineWidth = 5;
  x.beginPath(); x.moveTo(90, 330); x.lineTo(95, 250); x.lineTo(70, 210);
  x.moveTo(95, 250); x.lineTo(120, 220); x.stroke();
}

/* ============================================================
   タイトル
   ============================================================ */
function showTitle() {
  G.mode = "title";
  $("#title").classList.remove("hidden");
  $("#hud").classList.add("hidden");
  $("#pad").classList.add("hidden"); $("#actWrap").classList.add("hidden");
  const st = saveStore();
  $("#tCont").classList.toggle("dis", !Object.keys(st.slots || {}).length);
  startFog();
}
function hideTitle() {
  $("#title").classList.add("hidden"); $("#hud").classList.remove("hidden");
  $("#pad").classList.remove("hidden"); $("#actWrap").classList.remove("hidden");
  stopFog();
}
let fogIv = null;
function startFog() {
  const c = $("#tFog"), x = c.getContext("2d");
  c.width = window.innerWidth; c.height = window.innerHeight;
  const blobs = Array.from({ length: 7 }, () => ({ x: Math.random() * c.width, y: c.height * 0.5 + Math.random() * c.height * 0.5, r: 130 + Math.random() * 200, v: 0.12 + Math.random() * 0.25 }));
  stopFog();
  fogIv = setInterval(() => {
    x.clearRect(0, 0, c.width, c.height);
    for (const b of blobs) {
      b.x += b.v; if (b.x - b.r > c.width) b.x = -b.r;
      const g = x.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
      g.addColorStop(0, "rgba(120,110,150,.05)"); g.addColorStop(1, "transparent");
      x.fillStyle = g; x.beginPath(); x.arc(b.x, b.y, b.r, 0, 7); x.fill();
    }
  }, 40);
}
function stopFog() { if (fogIv) { clearInterval(fogIv); fogIv = null; } }

function startRun(state) {
  S = state;
  S.px = S.x * TS; S.py = S.y * TS;
  MEM.runs++; jsave(MEM_KEY, MEM);
  hideTitle();
  G.mode = "play";
  loadMap(S.map, S.x, S.y, S.dir);
}

/* ── 新規ゲームモーダル ── */
let ngGender = "m", ngDiff = "normal";
$("#tNew").addEventListener("click", () => { $("#newModal").classList.remove("hidden"); });
$("#tCont").addEventListener("click", openLoadTitle);
$("#tRec").addEventListener("click", openRecords);
$("#tOnline").addEventListener("click", () => { openOnline(); });
document.querySelectorAll("#ngGender button").forEach(b => b.onclick = () => {
  ngGender = b.dataset.v;
  document.querySelectorAll("#ngGender button").forEach(x => x.classList.toggle("on", x === b));
});
document.querySelectorAll("#ngDiff button").forEach(b => b.onclick = () => {
  ngDiff = b.dataset.v;
  document.querySelectorAll("#ngDiff button").forEach(x => x.classList.toggle("on", x === b));
});
$("#ngStart").addEventListener("click", () => {
  closeModal("#newModal");
  const st = newState(ngGender, ngDiff);
  startRun(st);
});
$("#ngClose").addEventListener("click", () => closeModal("#newModal"));

/* ============================================================
   オンライン共鳴（マルチプレイ）
   ============================================================ */
function openOnline() {
  if (!window.ManorOnline) { toast("接続モジュールを読み込み中…もう一度お試しください", true); return; }
  $("#olHome").classList.remove("hidden");
  $("#olLobby").classList.add("hidden");
  $("#online").classList.remove("hidden");
}
function myProfile() {
  return {
    uid: (ACC && (ACC.xvUid || ACC.mlUid)) || localUid(),
    name: (ACC && ACC.name) || "名無しの来訪者",
    charFile: (ACC && ACC.charFile) || "",
  };
}
function localUid() {
  let u = localStorage.getItem("magimanor_uid");
  if (!u) { u = "mm_" + Math.random().toString(36).slice(2, 10); localStorage.setItem("magimanor_uid", u); }
  return u;
}
$("#olClose").addEventListener("click", () => { closeModal("#online"); });
$("#olCreate").addEventListener("click", async () => {
  const MO = window.ManorOnline;
  $("#olCreate").disabled = true;
  const res = await MO.create(myProfile(), ngDiff);
  $("#olCreate").disabled = false;
  if (res.error) { toast(res.error === "denied" ? "接続が拒否された（DBルール設定が必要）" : "部屋を作成できなかった", true); return; }
  enterLobby(res.code, true);
});
$("#olJoin").addEventListener("click", async () => {
  const code = ($("#olCode").value || "").trim();
  if (!/^\d{4}$/.test(code)) { toast("4桁の部屋番号を入力", true); return; }
  const MO = window.ManorOnline;
  $("#olJoin").disabled = true;
  const res = await MO.join(code, myProfile());
  $("#olJoin").disabled = false;
  if (res.error) {
    toast(res.error === "nofound" ? "その番号の館は見つからない" : res.error === "full" ? "満室（最大4人）" : "参加できなかった", true);
    return;
  }
  enterLobby(code, MO.isHost());
});
function enterLobby(code, isHost) {
  $("#olHome").classList.add("hidden");
  $("#olLobby").classList.remove("hidden");
  $("#olRoomCode").textContent = code;
  $("#olStart").classList.toggle("hidden", !isHost);
  $("#olWait").classList.toggle("hidden", isHost);
  const MO = window.ManorOnline;
  MO.watch({
    onRoom(room) {
      if (!room) { // 部屋消滅
        closeModal("#online"); toast("館との共鳴が途切れた", true);
        G.online = null; return;
      }
      const ps = room.players || {};
      $("#olPlist").innerHTML = Object.keys(ps).map(uid => {
        const p = ps[uid];
        /* 保存された charFile は移籍前の古いパスのことがあるので正規化してから使う */
        const pcf = (window.XEVA && window.XEVA.canonCharFile) ? window.XEVA.canonCharFile(p.charFile, p.charId) : p.charFile;
        const img = pcf ? `<img src="../chars/${(window.XEVA&&window.XEVA.canonCharFile)?window.XEVA.canonCharFile(pcf):pcf}" alt="">` : `<img src="../../thumbs/MagiManor.jpg" alt="">`;
        return `<div class="ol-p${p.online === false ? " off" : ""}">${img}<span class="n">${escapeHtml(p.name || "?")}</span>${uid === room.meta.host ? '<span class="tag">案内人</span>' : ""}</div>`;
      }).join("");
      if (room.meta && room.meta.status === "playing" && G.mode !== "play") {
        // 開始
        closeModal("#online");
        G.online = { code };
        const st = newState(ngGender, room.meta.diff || "normal");
        startRun(st);
        toast("👥 共鳴探索がはじまった — 進行は全員で共有される");
      }
    },
    onFlags(flags) {
      if (!S || !flags) return;
      let changed = false;
      for (const f in flags) { if (!S.flags[f]) { S.flags[f] = true; changed = true; } }
      if (changed && G.mode === "play") { /* 共有進行 */ }
    },
    onPlayers(ps) { G.ghosts = ps || {}; },
    onEvent(ev) {
      if (!ev || ev.uid === window.ManorOnline.myUid()) return;
      if (ev.type === "death") toast(`💀 ${escapeHtml(ev.name)} が${(D.DEATHS[ev.payload && ev.payload.cause] || { t: "死亡した" }).t}`, true);
      if (ev.type === "ending") toast(`🏁 ${escapeHtml(ev.name)} が結末『${escapeHtml(ev.payload.name)}』に到達`);
      if (ev.type === "chapter") toast(`👥 ${escapeHtml(ev.name)} — ${escapeHtml(ev.payload.name)} へ`);
    },
  });
}
$("#olStart").addEventListener("click", () => { window.ManorOnline.start(); });
$("#olLeave").addEventListener("click", () => {
  window.ManorOnline.leave(); G.online = null;
  $("#olLobby").classList.add("hidden"); $("#olHome").classList.remove("hidden");
});
function escapeHtml(s) { return String(s || "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

/* ============================================================
   ブート
   ============================================================ */
$("#tBack").addEventListener("click", () => { location.href = "../index.html"; });
/* デバッグ/検証用フック（読み取りのみの想定） */
window.__MM = { get S() { return S; }, get G() { return G; }, api: API, run: runEvent, tp: loadMap };
function boot() {
  $("#sndBtn").textContent = AUD.muted() ? "🔇" : "🔊";
  playMovie(() => showTitle());
}
// 起動スプラッシュ（../xeva-splash.js／全アプリ共通）が閉じてからイントロムービーへ
if (window.XevaSplash) XevaSplash.done().then(boot);
else if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();

/* 明朝フォントを非ブロッキングで注入 */
setTimeout(() => {
  try {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;600;700&display=swap";
    document.head.appendChild(l);
  } catch (e) {}
}, 1200);

})();
