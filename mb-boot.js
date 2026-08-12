/* ══════════════════════════════════════════════════════════════
   MagiBurst のドメイン層（mb-core.js）を、ポータルのページで動かすための土台

   ★ mb-core.js は MagiBurst の画面まわり（$ / DB / save / SFX …）が
     あることを前提に書かれている。そこで、<b>mb-core.js を読み込む前に</b>
     必要な最小限だけをここで用意しておく。
   ★ 規則（キャラ・アビリティ・技・ガチャの確率）はここに1行も書かない。
     全部 mb-core.js のものをそのまま使う＝MagiBurst と食いちがわない。
   ★ 使う側（gacha.html / characters.html）の並び順:
       ① このファイル → ② MagiBurst/js/mb-core.js → ③ 画面ごとの JS
   ★ 画面によっては #dlg / #dlgc が無いので、確認ダイアログは
     <b>あれば使い、無ければ素の confirm/alert に落とす</b>ようにしてある。
   ══════════════════════════════════════════════════════════════ */
"use strict";

/* 画像フォルダ。ポータルは img/ を直接見る（MagiBurst は "../img/"） */
window.MB_IMGD = "img/";
/* ★ 2026-08-12 MagiBurst のゲーム用画像（バナー・戦闘背景・敵の絵）は MagiBurst/img/ に分けた。
   ポータルの各ページは XEVARION 直下にあるので、1つ下へ降りるパスになる。 */
window.MB_GIMGD = "MagiBurst/img/";

const $ = (s) => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmt = (n) => Number(n || 0).toLocaleString();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ACC = null;
try { ACC = JSON.parse(localStorage.getItem("xeva_account_v1") || "null"); } catch (e) {}
/* ★ B はバトル中の盤面。ポータルでは戦わないので必ず null。
   mb-core の connectPartyIds() などが「バトル中なら B.balls を見る」と書いてあるので、
   宣言だけしておかないと ReferenceError になる（宣言さえあれば編成 DB.party を見てくれる）。 */
let B = null;

/* ── セーブ（magiburst_v1）。所持キャラ・限界突破・アイテムはここが持ち主 ── */
const SAVE_KEY = "magiburst_v1";
function freshDB() {
  return { gold: 3000, orbs: 15,
    /* ★ 2026-08-10 初期★4 4体は廃止。所持キャラは MagiBurst 側が持ち主なので、ここは空でよい。 */
    chars: {}, party: [],
    clears: {}, first: {}, day: "", dailyOrb: {}, pulls: 0, express: { best: 0 }, raid: null,
    fruits: {}, equip: {}, equip2: {}, equip3: {}, pickup: "kaguya", fesTicket: 0,
    soul: 0, emblem: {}, lend: {}, gwBest: {}, lastClear: {}, lastTry: {},
    items: {}, hero: {}, trans: {}, fav: {} };
}
let DB = freshDB();
try { DB = Object.assign(DB, JSON.parse(localStorage.getItem(SAVE_KEY) || "{}")); } catch (e) {}
if (DB.owner && ACC && ACC.xvUid && DB.owner !== ACC.xvUid) DB = freshDB();
["chars", "items", "hero", "trans", "fruits", "equip", "equip2", "equip3", "fav"]
  .forEach((k) => { if (!DB[k]) DB[k] = {}; });
if (typeof DB.fesTicket !== "number") DB.fesTicket = 0;
/* ★ ジェムは XEVARION 共通ウォレット（xeva_gem_v1）が持ち主。MagiBurst と同じ橋渡しを張る。
   enumerable:false なので JSON.stringify(DB) には出ない＝セーブに二重で入らない。 */
(function () {
  const G = window.XEVA && window.XEVA.gem;
  delete DB.orbs;
  if (!G) { DB.orbs = 0; return; }
  Object.defineProperty(DB, "orbs", { enumerable: false, configurable: true,
    get() { return G.get(); },
    set(v) { const n = Math.max(0, Math.round(Number(v) || 0)), c = G.get();
      if (n === c) return; if (n > c) G.add(n - c, "MagiBurst"); else G.spend(c - n, "MagiBurst"); } });
})();
function save() { try { if (ACC && ACC.xvUid) DB.owner = ACC.xvUid; localStorage.setItem(SAVE_KEY, JSON.stringify(DB)); } catch (e) {} }
function saveNow() {
  save();
  try { if (window.XevaCloud && window.XevaCloud.flushPush) window.XevaCloud.flushPush(); } catch (e) {}
  /* ★ 2026-08-12 magiburst_v1（所持キャラ・限界突破）は MagiBurst 専用 Firebase の担当。
     ガチャの直後にここで送り切っておかないと、画面を閉じたぶんが取りこぼされる。 */
  try { if (window.MagiBurstCloud && window.MagiBurstCloud.flush) window.MagiBurstCloud.flush(); } catch (e) {}
}
/* ══ ★ 2026-08-12 クラウドから新しいセーブが降りてきたら、メモリの DB を読み直す ══
   これが無いと、取り込みで localStorage が新しくなっても<b>この画面の DB は起動時のまま</b>で、
   次の save() が古い内容でクラウドを上書きしてしまう（＝別端末の続きが消える）。
   MagiBurst 本体の reloadDbFromStore と同じ役割。 */
function mbReloadFromStore() {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
    if (!raw || typeof raw !== "object") return;
    /* orbs は共通ウォレット（xeva_gem_v1）が持ち主。ここで書き戻すと残高が巻き戻る */
    Object.keys(raw).forEach((k) => { if (k !== "orbs") DB[k] = raw[k]; });
    if (typeof paintWallet === "function") paintWallet();
    if (typeof renderChars === "function") renderChars();
    if (typeof paintGacha === "function") paintGacha();
  } catch (e) {}
}
window.addEventListener("appcloud:restored", mbReloadFromStore);
window.addEventListener("appcloud:ready", (e) => { if (e && e.detail && e.detail.changed) mbReloadFromStore(); });
window.addEventListener("xeva:change", mbReloadFromStore);
/* MagiBurst 側と同じ「お気に入り」判定（詳細画面が見る） */
function isFav(id) { return !!(DB.fav && DB.fav[id]); }

/* ── mb-core.js が呼ぶ画面まわりの最小実装 ── */
const today = new Date().toLocaleDateString("sv-SE");
function beforeOpen(t) { if (!t) return false; try { return new Date() < new Date(String(t).replace(" ", "T")); } catch (e) { return false; } }
/* ══════════════════════════════════════════════════════════════
   効果音（★ 2026-08-12 追加）

   これまで SFX は「なにを呼ばれても何もしない Proxy」だった。
   mb-core.js のガチャ演出（revealGacha / _revOpenIdx / 昇格演出）は
   もともと SFX.gacha() / crit() / ss() / pick() / hit() / win() を
   ちゃんと呼んでいるので、<b>ここに実体を用意するだけで</b>
   ポータルのガチャに音が付く（mb-core.js は1行も直さない）。

   ★ 音は WebAudio でその場で作る（音声ファイルを増やさない＝読み込みが遅くならない・
     オフラインでも鳴る）。音色は MagiBurst 本体の SFX とわざと同じにしてある。
   ★ ブラウザの自動再生制限があるので、AudioContext は
     <b>最初のタップ／クリックまで作らない</b>。作ってもすぐ suspended に
     なる環境があるため、鳴らすたびに resume() を試みる。
   ★ 未定義のキーを呼ばれても落ちないよう、Proxy で「無い音＝何もしない」に落とす
     （もとの Proxy 版と同じ安全性を保つ）。
   ══════════════════════════════════════════════════════════════ */
const SFX = (function () {
  let ac = null, gesture = false;
  function acx() {
    if (!gesture) return null;                 /* 最初の操作より前は鳴らさない */
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } }
    if (ac && ac.state === "suspended") { try { ac.resume(); } catch (e) {} }
    return ac;
  }
  function tone(f0, f1, dur, type, vol, delay) {
    const c = acx(); if (!c) return;
    const t = c.currentTime + (delay || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    g.gain.setValueAtTime(vol || 0.12, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, delay) {
    const c = acx(); if (!c) return;
    const t = c.currentTime + (delay || 0);
    const n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource(); s.buffer = buf;
    const g = c.createGain();
    g.gain.setValueAtTime(vol || 0.1, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(g); g.connect(c.destination); s.start(t);
  }
  /* MagiBurst 本体と同じ音色（同じ名前なら同じ音、を守る） */
  const TBL = {
    /* ガチャのボールが飛び出す音 */
    gacha: () => { tone(440, 880, 0.3, "triangle", 0.1); tone(880, 1760, 0.4, "triangle", 0.09, 0.22); },
    /* 確定演出・昇格演出の「キラッ」 */
    crit: () => { tone(420, 120, 0.14, "square", 0.11); noise(0.09, 0.1); tone(880, 1600, 0.12, "triangle", 0.07, 0.02); },
    /* ★5 のとどろき */
    ss: () => { tone(160, 640, 0.5, "sawtooth", 0.12); noise(0.3, 0.09, 0.1); tone(520, 1560, 0.42, "triangle", 0.1, 0.16); },
    /* 星のプレートが1枚ずつ出る音・ボタンを押した音 */
    pick: () => { tone(740, 1180, 0.14, "triangle", 0.1); },
    /* プレートを1枚あけた音 */
    hit: () => { tone(240, 90, 0.1, "square", 0.08); noise(0.05, 0.06); },
    /* 全部あけ終わってキャラを引けていたときのファンファーレ */
    win: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.24, "triangle", 0.11, i * 0.12)); },
    lose: () => { [392, 330, 262, 196].forEach((f, i) => tone(f, f * 0.97, 0.3, "sine", 0.1, i * 0.16)); },
    heal: () => { tone(520, 880, 0.22, "sine", 0.1); tone(660, 1100, 0.24, "sine", 0.08, 0.09); },
    launch: () => { noise(0.12, 0.1); tone(300, 900, 0.16, "sawtooth", 0.07); },
    friend: () => { tone(660, 990, 0.14, "triangle", 0.1); tone(880, 1320, 0.16, "triangle", 0.08, 0.05); },
  };
  /* 最初のタップで解禁（このとき AudioContext を作っておく＝1音目から鳴る） */
  const unlock = () => { gesture = true; acx(); };
  ["pointerdown", "keydown", "touchstart"].forEach((ev) =>
    document.addEventListener(ev, unlock, { once: true, passive: true }));
  return new Proxy(TBL, { get: (t, k) => (typeof t[k] === "function" ? t[k] : () => {}) });
})();
function toast(m) { console.log("[mb]", m); }
function toastTrain(m) { toast(m); }
function paintWallet() { if (typeof paintWal === "function") paintWal(); }
function renderChars() {}
function paintGacha() {}
function paintGachaStick() {}
function renderShopBuy() {}
function luxBurst() {}
function spawnSparks() {}
function fesTickets() { return DB.fesTicket | 0; }
function ratePct(v) { return (Math.round(v * 10000) / 100) + "%"; }
let _dlgRes = null;
function _dlgShow(o) {
  /* ★ #dlg を持たない画面（図鑑など）では素の confirm / alert に落とす */
  if (!$("#dlgc") || !$("#dlg")) {
    const tx = String(o.html || "").replace(/<[^>]*>/g, "");
    return Promise.resolve(o.kind === "alert" ? (window.alert(tx), true) : window.confirm(tx));
  }
  return new Promise((res) => {
    _dlgRes = res;
    $("#dlgc").innerHTML = `<div class="dt">${o.icon || ""} ${o.title || ""}</div><div class="db">${o.html || ""}</div>`
      + `<div class="dbt">${o.kind === "alert" ? "" : '<button class="ng" onclick="_dlgEnd(false)">' + (o.cancel || "やめる") + "</button>"}`
      + `<button class="ok" style="${o.kind === "alert" ? "grid-column:1/-1" : ""}" onclick="_dlgEnd(true)">${o.ok || "OK"}</button></div>`;
    $("#dlg").classList.add("on");
  });
}
function _dlgEnd(v) { $("#dlg").classList.remove("on"); if (_dlgRes) { const r = _dlgRes; _dlgRes = null; r(v); } }
function uiConfirm(html, o) { return _dlgShow(Object.assign({ html }, o || {})); }
function uiAlert(html, o) { return _dlgShow(Object.assign({ html, kind: "alert", ok: "OK" }, o || {})); }
window._dlgEnd = _dlgEnd;
