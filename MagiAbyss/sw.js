/* ============================================================
   MagiAbyss Service Worker — オフライン対応
   ・ゲームはすべて端末の中で動く（ドット絵・音もコードで作る）ので、CORE をそろえれば完全にオフラインで遊べる。
   ・キャラクターの絵（XEVARION の img/）は「一度見たら控える」。よく使う10体ぶんは CORE に入れてある。
   ・フォント（Google Fonts）も一度読めたら控える（オフラインでもドットの文字になる）。
   ・Firebase（同期）はキャッシュしない。
   ============================================================ */
const VERSION = "magiabyss-sw-v6";
const RUNTIME = "magiabyss-rt-v1";
const CORE = [
  "./index.html",
  "./manifest.webmanifest",
  "./css/ma.css?v=4",
  "./js/ma-data.js?v=4",
  "./js/ma-pixel.js?v=4",
  "./js/ma-art.js?v=4",
  "./js/ma-map.js?v=1",
  "./js/ma-save.js?v=2",
  "./js/ma-stats.js?v=2",
  "./js/ma-audio.js?v=1",
  "./js/ma-input.js?v=2",
  "./js/ma-engine.js?v=4",
  "./js/ma-ai.js?v=1",
  "./js/ma-weapons.js?v=4",
  "./js/ma-cards.js?v=2",
  "./js/ma-boss.js?v=1",
  "./js/ma-prog.js?v=2",
  "./js/ma-render.js?v=2",
  "./js/ma-ui.js?v=4",
  "./js/ma-town.js?v=1",
  "./js/ma-guild.js?v=4",
  "./js/ma-stages.js?v=1",
  "./js/ma-howto.js?v=3",
  "./js/ma-main.js?v=2",
  "./img/title.webp",
  "./img/title_blur.webp",
  "./img/icon_s.webp",
  "../thumbs/MagiAbyss.jpg",
  "../gem.png",
  /* XEVARION の共通部品 */
  "../mb-boot.js?v=17",
  "../MagiBurst/js/mb-core.js?v=135",
  "../xeva.js?v=76",
  "../xeva-alive.js?v=5",
  "../xeva-loading.js?v=18",
  "../xeva-splash.js?v=13",
  "../xeva-safebottom.js?v=12",
  "../xeva-back.js?v=9",
  "../xeva-presence.js?v=9",
  "../maintenance-gate.js?v=13",
  "../xeva-cloud.js?v=42",
  "../MagiBurst/magiburst-cloud.js?v=22",
  "../app-cloud.js?v=12",
  "../xeva-keys.js?v=31",
  "../xevarion-fb.js?v=33",
  /* 遊べる10体（極彩祭・極煌祭・極華祭）の絵 */
  "../img/Takina.webp", "../img/t_Takina.webp",
  /* ★★ 2026-10-09 Pumpkin Night の10体（絵）と、UR の必殺技カットインの縦長の SS 絵 */
  "../img/Ayano.webp", "../img/t_Ayano.webp", "../img/Saki.webp", "../img/t_Saki.webp", "../img/Yuka.webp", "../img/t_Yuka.webp",
  "../img/Natsumi.webp", "../img/t_Natsumi.webp", "../img/Miu.webp", "../img/t_Miu.webp", "../img/Mai.webp", "../img/t_Mai.webp",
  "../img/Chinatsu.webp", "../img/t_Chinatsu.webp", "../img/Yuumi.webp", "../img/t_Yuumi.webp", "../img/Rina.webp", "../img/t_Rina.webp",
  "../img/Kaori.webp", "../img/t_Kaori.webp",
  "../MagiBurst/img/ss/TakinaSS.webp", "../MagiBurst/img/ss/HibanaSS.webp", "../MagiBurst/img/ss/FukiSS.webp",
  "../MagiBurst/img/ss/AyanoSS.webp", "../MagiBurst/img/ss/SakiSS.webp", "../MagiBurst/img/ss/YukaSS.webp", "../MagiBurst/img/ss/NatsumiSS.webp",
  "../MagiBurst/img/ss/MiuSS.webp", "../MagiBurst/img/ss/MaiSS.webp", "../MagiBurst/img/ss/ChinatsuSS.webp", "../MagiBurst/img/ss/YuumiSS.webp",
  "../MagiBurst/img/ss/RinaSS.webp", "../MagiBurst/img/ss/KaoriSS.webp",
  /* ★★ 2026-10-07 Sapphire Breeze ヒバナ・フキ */
  "../img/Hibana.webp", "../img/t_Hibana.webp", "../img/Fuki.webp", "../img/t_Fuki.webp",
  "../img/Hinano.webp", "../img/t_Hinano.webp",
  "../img/Hanon.webp", "../img/t_Hanon.webp",
  "../img/Kokoha.webp", "../img/t_Kokoha.webp",
  "../img/Mutsumi.webp", "../img/t_Mutsumi.webp",
  "../img/Reina.webp", "../img/t_Reina.webp",
  "../img/Azusa.webp", "../img/t_Azusa.webp",
  "../img/KumikoReina.webp", "../img/t_KumikoReina.webp",
  "../img/Kagura.webp", "../img/t_Kagura.webp",
  "../img/Kotori.webp", "../img/t_Kotori.webp",
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
    try { await cache.add(u); } catch (e) {}
    done++;
    await xevPost({ type: "xev-precache", scope, done, total: list.length });
  }
}

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await xevPrecache(cache, CORE, "magiabyss");
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    /* ★ RUNTIME（キャラの絵・フォント）は消さない */
    await Promise.all(keys.filter((k) => k !== VERSION && k.startsWith("magiabyss-sw")).map((k) => caches.delete(k)));
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
  /* キャラクターの絵は「一度見たら控える」（XEVARION の img/） */
  if (/\/img\/.+\.(webp|png|jpg)$/i.test(url.pathname) && url.pathname.indexOf("/MagiAbyss/") < 0) {
    e.respondWith((async () => {
      const core = await caches.match(req);
      if (core) return core;
      const c = await caches.open(RUNTIME);
      const hit = await c.match(req);
      if (hit) return hit;
      try { const r = await fetch(req); if (r && r.ok) c.put(req, r.clone()); return r; }
      catch (err) { return new Response("", { status: 504 }); }
    })());
    return;
  }
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
const XEV_SCOPE = "magiabyss";
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
      if (res && res.status === 304 && old) hit++;
      else if (res && res.ok && res.type === "basic") {
        let n = Number(res.headers.get("content-length")) || 0;
        await cache.put(u, res.clone());
        if (!n) { try { n = (await res.clone().blob()).size || 0; } catch (e2) { n = 0; } }
        got++; bytes += n;
      }
    } catch (e) {}
    done++;
    await tickPost();
  };
  const worker = async () => { while (queue.length) await one(queue.shift()); };
  const crew = []; for (let ci = 0; ci < 6; ci++) crew.push(worker());
  await Promise.all(crew);
  await tickPost(true);
  await xevPost({ type: "xev-refreshed", scope: XEV_SCOPE, total: urls.length, got, hit, bytes });
}
self.addEventListener("message", (e) => {
  const m = e.data;
  if (!m) return;
  if (m.type === "SKIP_WAITING") self.skipWaiting();
  if (m.type === "xev-refresh") e.waitUntil(xevRefreshAll());
});
