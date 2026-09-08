/* ============================================================
   Magi: Boccia Rush Service Worker — オフライン対応
   ・CPU戦・練習・チュートリアル・ルールブックは<b>完全にオフライン</b>で動く。
   ・オンライン（部屋番号）は当然ネットが要る。Firebase はキャッシュしない。
   ・キャラクターの絵は XEVARION の img/ にあるので、ここでは丸ごと持たない
     （ポータル側の SW が持っている。開いたぶんだけ実行時に控える）。
   ============================================================ */
const VERSION = "boccia-sw-v3";
const RUNTIME = "boccia-rt-v1";
const CORE = [
  "./index.html",
  "./manifest.webmanifest",
  "./css/mbr.css?v=1",
  "./js/mbr-core.js?v=2",
  "./js/mbr-ui.js?v=1",
  "../mb-boot.js?v=16",
  "../MagiBurst/js/mb-core.js?v=100",
  "../xeva.js?v=61",
  "../xeva-loading.js?v=11",
  "../xeva-splash.js?v=10",
  "../xeva-safebottom.js?v=8",
  "../xeva-back.js?v=8",
  "../maintenance-gate.js?v=12",
  "../thumbs/MagiBocciaRush.jpg",
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
    await xevPrecache(cache, CORE, "magibocciarush");
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    /* ★ RUNTIME（キャラの絵）は消さない。消すと開くたびに取り直しになる。 */
    await Promise.all(keys.filter((k) => k !== VERSION && k.startsWith("boccia-sw")).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.hostname.indexOf("firebase") >= 0 || url.hostname.indexOf("googleapis") >= 0) return;

  /* キャラクターの絵は「一度見たら控える」（XEVARION の img/） */
  if (/\/img\/.+\.(webp|png|jpg)$/i.test(url.pathname)) {
    e.respondWith((async () => {
      const c = await caches.open(RUNTIME);
      const hit = await c.match(req);
      if (hit) return hit;
      try {
        const r = await fetch(req);
        if (r && r.ok) c.put(req, r.clone());
        return r;
      } catch (err) { return new Response("", { status: 504 }); }
    })());
    return;
  }

  e.respondWith((async () => {
    const hit = await caches.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const r = await fetch(req);
      if (r && r.ok && r.type === "basic") {
        const c = await caches.open(VERSION);
        c.put(req, r.clone());
      }
      return r;
    } catch (err) {
      if (req.mode === "navigate") {
        const idx = await caches.match("./index.html");
        if (idx) return idx;
      }
      return new Response("", { status: 504 });
    }
  })());
});
