/* ══════════════════════════════════════════════════════════════
   MagiQuest — Service Worker
   ・CORE を事前キャッシュして、オフラインでも遊べるようにする。
   ・問題データ（MagiLex の magilex-*.js）は<b>MagiQuest の CORE にも入れる</b>。
     MagiLex 側の SW とは別のキャッシュなので、片方だけ開いた人でも困らない。
   ★ 更新するときは VERSION を上げること（xevarion-release-checklist）。
   ══════════════════════════════════════════════════════════════ */
const VERSION = "magiquest-sw-v1";
const CORE = [
  "./",
  "./index.html",
  "./css/mq.css?v=2",
  "./js/mq-data.js?v=4",
  "./js/mq-core.js?v=3",
  "./js/mq-ui.js?v=4",
  "./img/kv.webp",
  "../xeva.js?v=62",
  "../xeva-safebottom.js?v=9",
  "../MagiBurst/js/mb-core.js?v=112",
  /* ── MagiLex の問題データ（これが MagiQuest の出題そのもの）── */
  "../MagiLex/magilex-data.js?v=10",
  "../MagiLex/magilex-rika.js?v=9",
  "../MagiLex/magilex-chemb.js?v=10",
  "../MagiLex/magilex-chemg.js?v=11",
  "../MagiLex/magilex-chemd.js?v=9",
  "../MagiLex/magilex-cheme.js?v=11",
  "../MagiLex/magilex-butsuri.js?v=10",
  "../MagiLex/magilex-physb.js?v=9",
  "../MagiLex/magilex-physg.js?v=10",
  "../MagiLex/magilex-suugaku.js?v=11",
  "../MagiLex/magilex-math3.js?v=9",
  "../MagiLex/magilex-eigo.js?v=9",
  "../MagiLex/magilex-chiri.js?v=9",
];

self.addEventListener("install", (ev) => {
  ev.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    /* 1つ落ちても install ごと失敗させない（1本ずつ入れる） */
    await Promise.all(CORE.map((u) => cache.add(u).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (ev) => {
  ev.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== VERSION && k.startsWith("magiquest-sw"))
      .map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (ev) => {
  const req = ev.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  ev.respondWith((async () => {
    const hit = await caches.match(req, { ignoreSearch: false });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res && res.ok) {
        const cache = await caches.open(VERSION);
        cache.put(req, res.clone());
      }
      return res;
    } catch (e) {
      /* オフラインでキャッシュにも無い → ?v= ちがいを探す */
      const alt = await caches.match(req, { ignoreSearch: true });
      if (alt) return alt;
      throw e;
    }
  })());
});

/* ポータルの「まとめて最新化」に応じる（ほかのアプリと同じ合図） */
self.addEventListener("message", (ev) => {
  const d = ev.data || {};
  if (d.type === "xev-refresh") {
    ev.waitUntil((async () => {
      const cache = await caches.open(VERSION);
      await Promise.all(CORE.map((u) => cache.add(u).catch(() => {})));
      if (ev.source && ev.source.postMessage) ev.source.postMessage({ type: "xev-refresh-done", app: "magiquest" });
    })());
  }
});
