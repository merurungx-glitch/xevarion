/* ============================================================
   MagiChemLex Service Worker — オフライン対応
   ・問題・解説・図はすべて JS の中にあるので、CORE をそろえれば完全にオフラインで使える。
   ・フォント（Google Fonts）は一度読めたら控える。Firebase（同期）はキャッシュしない。
   ============================================================ */
const VERSION = "magichemlex-sw-v20";
const RUNTIME = "magichemlex-rt-v1";
const CORE = [
  "./index.html",
  "./manifest.webmanifest",
  "./css/mcl.css?v=16",
  "./js/mcl-data.js?v=5",
  "./js/mcl-data2.js?v=4",
  "./js/mcl-data3.js?v=2",
  "./js/mcl-data4.js?v=2",
  "./js/mcl-data5.js?v=2",
  "./js/mcl-data6.js?v=1",
  "./js/mcl-data7.js?v=1",
  "./js/mcl-data8.js?v=2",
  "./js/mcl-data9.js?v=2",
  "./js/mcl-data10.js?v=1",
  "./js/mcl-data11.js?v=1",
  "./js/mcl-data12.js?v=1",
  "./js/mcl-core.js?v=13",
  "./js/mcl-fig.js?v=5",
  "./js/mcl-fig2.js?v=1",
  "./js/mcl-fig3.js?v=1",
  "./js/mcl-fig4.js?v=1",
  "./js/mcl-fig5.js?v=2",
  "./js/mcl-ui.js?v=18",
  "./js/mcl-flash.js?v=2",      // ★★ 2026-10-15 フラッシュカード
  "./js/mcl-book.js?v=1",       // ★★ 2026-10-27 模試の冊子
  "./js/mcl-special.js?v=1",    // ★★ 2026-10-15 特設予想問題
  "./js/mcl-bingo.js?v=2",      // ★★ 2026-10-28 ビンゴカード
  "./img/icon_192.png?v=2",
  "./img/apple-touch-icon.png?v=2",
  "../thumbs/MagiChemLex.jpg?v=2",
  "../XEVA.png",
  "../events/violet_breeze_s.webp",
  "../events/midnight_pumpkin_s.webp",   // ★★ 2026-10-20 Midnight Pumpkin（予告）
  "./img/wp.webp",                        // ★★ 2026-10-20 Wisdom Point
  "./img/wp@2x.webp",
  "../img/t_Miki.webp", "../img/Miki.webp",   // ★★ 2026-10-24 WP 交換所のミキ（UR）
  /* XEVARION の共通部品 */
  "../xeva.js?v=85",
  "../xeva-loading.js?v=19",
  "../xeva-splash.js?v=18",
  "../xeva-safebottom.js?v=12",
  "../xeva-back.js?v=9",
  "../xeva-presence.js?v=9",
  "../maintenance-gate.js?v=13",
  "../xeva-cloud.js?v=48",
  "../MagiBurst/magiburst-cloud.js?v=27",
  "../app-cloud.js?v=15",
  "../xeva-keys.js?v=34",
  "../xevarion-fb.js?v=36",
];

async function xevPost(msg) {
  try {
    const cs = await self.clients.matchAll({ includeUncontrolled: true, type: "window" });
    cs.forEach((c) => { try { c.postMessage(msg); } catch (e) {} });
  } catch (e) {}
}
async function xevPrecache(cache, list, scope) {
  let done = 0;
  await xevPost({ type: "xev-precache", scope, done: 0, total: list.length });
  for (const u of list) {
    try { await xevIrAdd(cache, u); } catch (e) {}
    done++;
    await xevPost({ type: "xev-precache", scope, done, total: list.length });
  }
}

/* ══ ★★ 2026-10-14 「更新したファイル」を数える（ご報告「更新があったファイルが0のまま」）══
   新しい版は<b>install でまとめて取りこむ</b>ので、そのあとの「確かめ（xev-refresh）」では全部「変更なし（304）」になり、
   ホームの更新画面の「更新したファイル」がいつも 0 件だった。
   → install のときに<b>前の版の置き場とくらべて中身が変わったもの</b>（前の版に無い URL＝?v= が上がったもの、
     または ETag／Last-Modified＋大きさがちがうもの）を控えておき、確かめの件数（got・bytes）に足して返す。
   ・前の版がまったく無い（はじめて入れた）ときは数えない（更新ではないため）。
   ・控えは版に縛られない置き場（xev-instrep-v1）に、この SW の場所ごとに1件。見送った版のぶんは足しこむ（同じファイルは1件）。
   ・確かめで使ったら消す（2回数えない）。 */
const XEV_IR_CACHE = "xev-instrep-v1";
const XEV_IR_KEY = new URL("./__xev_instrep", self.location.href).href;
let xevIrChg = null;            /* install 中に見つけた「変わったファイル」 { パス: 大きさ } */
let xevIrOld = null;            /* 前の版の置き場の名前（無ければ null＝はじめて） */
async function xevIrBegin() {
  xevIrChg = {}; xevIrOld = null;
  try {
    const pre = VERSION.replace(/v\d+$/, "");
    const ks = (await caches.keys()).filter((k) => k !== VERSION && k.startsWith(pre) && /v\d+$/.test(k));
    xevIrOld = ks.length ? ks : null;
  } catch (e) { xevIrOld = null; }
}
function xevIrPath(u) { try { return new URL(u, self.location.href).pathname; } catch (e) { return String(u); } }
async function xevIrAdd(cache, u, init) {
  const res = await fetch(u, init);
  if (!res || !res.ok) throw new Error("precache " + u);
  if (xevIrOld && xevIrChg) {
    let same = false;
    try {
      for (const k of xevIrOld) {
        const old = await (await caches.open(k)).match(u);
        if (!old) continue;
        const a = res.headers, b = old.headers;
        const e1 = a.get("ETag"), e2 = b.get("ETag");
        if (e1 && e2) same = e1 === e2;
        else {
          const l1 = a.get("Last-Modified"), l2 = b.get("Last-Modified");
          same = !!(l1 && l1 === l2 && a.get("content-length") === b.get("content-length"));
        }
        break;
      }
    } catch (e) {}
    if (!same) {
      let n = Number(res.headers.get("content-length")) || 0;
      if (!n) { try { n = (await res.clone().blob()).size || 0; } catch (e) { n = 0; } }
      xevIrChg[xevIrPath(u)] = n;
    }
  }
  await cache.put(u, res);
}
async function xevIrSave() {
  if (!xevIrOld || !xevIrChg) return;
  try {
    const c = await caches.open(XEV_IR_CACHE);
    let cur = {};
    try { const r = await c.match(XEV_IR_KEY); if (r) cur = await r.json(); } catch (e) { cur = {}; }
    const files = Object.assign({}, (cur && cur.files) || {}, xevIrChg);
    await c.put(XEV_IR_KEY, new Response(JSON.stringify({ files: files, at: Date.now() }), { headers: { "Content-Type": "application/json" } }));
  } catch (e) {}
}
async function xevIrTake() {
  try {
    const r = await (await caches.open(XEV_IR_CACHE)).match(XEV_IR_KEY);
    if (!r) return {};
    const o = await r.json();
    return (o && o.files) || {};
  } catch (e) { return {}; }
}
async function xevIrDrop() { try { await (await caches.open(XEV_IR_CACHE)).delete(XEV_IR_KEY); } catch (e) {} }

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await xevIrBegin();
    await xevPrecache(cache, CORE, "magichemlex");
    await xevIrSave();
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    /* ★ RUNTIME（フォント）は消さない */
    await Promise.all(keys.filter((k) => k !== VERSION && k.startsWith("magichemlex-sw")).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  /* フォント（Google Fonts）は一度読めたら控える */
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith((async () => {
      const c = await caches.open(RUNTIME);
      const hit = await c.match(req);
      if (hit) return hit;
      try { const r = await fetch(req); if (r && (r.ok || r.type === "opaque")) c.put(req, r.clone()); return r; }
      catch (err) { return new Response("", { status: 504 }); }
    })());
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (url.hostname.indexOf("firebase") >= 0) return;
  /* それ以外：?v= まで見て引き当て、裏で取り直す（stale-while-revalidate）。
     通信できないときだけ ?v= 違いを許して探す。 */
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const hit = await cache.match(req);
    const net = fetch(req).then((r) => {
      if (r && r.ok && r.type === "basic") { try { cache.put(req, r.clone()); } catch (x) {} }
      return r;
    }).catch(() => null);
    if (hit) { try { e.waitUntil(net); } catch (x) {} return hit; }
    const r = await net;
    if (r) return r;
    const loose = await caches.match(req, { ignoreSearch: true });
    if (loose) return loose;
    if (req.mode === "navigate") {
      const idx = await caches.match("./index.html", { ignoreSearch: true });
      if (idx) return idx;
    }
    return new Response("", { status: 504 });
  })());
});

/* ══ まとめて最新化（xev-refresh：ホームの更新画面から呼ばれる）══
   CORE ＋ いまキャッシュにある URL を、ETag / Last-Modified の条件つきで取り直す（差分だけ落とす・同時6本）。 */
const XEV_SCOPE = "magichemlex";
async function xevRefreshAll() {
  const cache = await caches.open(VERSION);
  const urls = [], seen = new Set();
  for (const u of CORE) {
    let abs; try { abs = new URL(u, self.location.href).href; } catch (e) { continue; }
    if (seen.has(abs)) continue;
    seen.add(abs); urls.push(u);
  }
  try {
    for (const req of await cache.keys()) {
      if (seen.has(req.url)) continue;
      if (new URL(req.url).origin !== self.location.origin) continue;
      seen.add(req.url); urls.push(req.url);
    }
  } catch (e) {}
  let done = 0, got = 0, hit = 0, bytes = 0, lastPost = 0;
  const irf = await xevIrTake();   /* ★★ 2026-10-14 install で取りこんだぶん（変わったファイル）も「更新した」に数える */
  for (const ip in irf) { got++; bytes += irf[ip] | 0; }
  const post = () => xevPost({ type: "xev-precache", scope: XEV_SCOPE, done, total: urls.length, got, hit, bytes });
  const tickPost = async (force) => { const now = Date.now(); if (!force && now - lastPost < 120) return; lastPost = now; await post(); };
  await post();
  const queue = urls.slice();
  const one = async (u) => {
    try {
      const old = await cache.match(u);
      const h = {};
      if (old) { const et = old.headers.get("ETag"), lm = old.headers.get("Last-Modified"); if (et) h["If-None-Match"] = et; if (lm) h["If-Modified-Since"] = lm; }
      const opt = Object.keys(h).length ? { cache: "no-store", headers: h } : { cache: "no-cache" };
      const res = await fetch(u, opt);
      if (res && res.status === 304 && old) if (!(xevIrPath(u) in irf)) hit++;
      else if (res && res.ok && res.type === "basic") {
        let n = Number(res.headers.get("content-length")) || 0;
        await cache.put(u, res.clone());
        if (!n) { try { n = (await res.clone().blob()).size || 0; } catch (e2) { n = 0; } }
        if (!(xevIrPath(u) in irf)) { got++; bytes += n; }
      }
    } catch (e) {}
    done++;
    await tickPost();
  };
  const worker = async () => { while (queue.length) await one(queue.shift()); };
  const crew = []; for (let ci = 0; ci < 6; ci++) crew.push(worker());
  await Promise.all(crew);
  await tickPost(true);
  await xevIrDrop();
  await xevPost({ type: "xev-refreshed", scope: XEV_SCOPE, total: urls.length, got, hit, bytes });
}
self.addEventListener("message", (e) => {
  const m = e.data;
  if (!m) return;
  if (m.type === "SKIP_WAITING") self.skipWaiting();
  if (m.type === "xev-refresh") e.waitUntil(xevRefreshAll());
});
