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
function saveNow() { save(); try { if (window.XevaCloud && window.XevaCloud.flushPush) window.XevaCloud.flushPush(); } catch (e) {} }
/* MagiBurst 側と同じ「お気に入り」判定（詳細画面が見る） */
function isFav(id) { return !!(DB.fav && DB.fav[id]); }

/* ── mb-core.js が呼ぶ画面まわりの最小実装 ── */
const today = new Date().toLocaleDateString("sv-SE");
function beforeOpen(t) { if (!t) return false; try { return new Date() < new Date(String(t).replace(" ", "T")); } catch (e) { return false; } }
const SFX = new Proxy({}, { get: () => () => {} });          // 効果音は鳴らさない
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
