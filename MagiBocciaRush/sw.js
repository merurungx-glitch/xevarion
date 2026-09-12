/* ============================================================
   Magi: Boccia Rush Service Worker — オフライン対応
   ・CPU戦・練習・チュートリアル・ルールブックは<b>完全にオフライン</b>で動く。
   ・オンライン（部屋番号）は当然ネットが要る。Firebase はキャッシュしない。
   ・キャラクターの絵は XEVARION の img/ にあるので、ここでは丸ごと持たない
     （ポータル側の SW が持っている。開いたぶんだけ実行時に控える）。
   ============================================================ */
const VERSION = "boccia-sw-v5";
const RUNTIME = "boccia-rt-v1";
const CORE = [
  "./index.html",
  "./manifest.webmanifest",
  "./css/mbr.css?v=3",
  "./js/mbr-core.js?v=3",
  "./js/mbr-ui.js?v=3",
  "../mb-boot.js?v=17",
  "../MagiBurst/js/mb-core.js?v=112",
  "../xeva.js?v=62",
  "../xeva-loading.js?v=14",
  "../xeva-splash.js?v=11",
  "../xeva-safebottom.js?v=9",
  "../xeva-back.js?v=9",
  "../maintenance-gate.js?v=13",
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

  /* ══ ★★ 2026-09-10 「最新のキャラが反映されないことがある」の直し ══
     ------------------------------------------------------------
     前は caches.match(req, { <b>ignoreSearch: true</b> }) だった。
     これは <b>?v= を無視して</b>キャッシュを引き当てるので、
     ・index.html の ?v= を上げても
     ・mb-core.js（キャラの台帳）に新しい子を足しても
     <b>古いほうが返り続ける</b>。SW の VERSION を上げるまで直らなかった。
     ★ いまは
       ① <b>?v= まで見て</b>引き当てる（＝?v= を上げれば必ず取り直す）
       ② 当たったときも<b>裏で取り直してキャッシュを新しくする</b>
          （stale-while-revalidate。次に開いたときは必ず最新）
       ③ 通信できないときだけ、最後の手として ?v= 違いを許して探す
     ------------------------------------------------------------ */
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const hit = await cache.match(req);
    const net = fetch(req).then((r) => {
      if (r && r.ok && r.type === "basic") { try { cache.put(req, r.clone()); } catch (x) {} }
      return r;
    }).catch(() => null);
    if (hit) {
      /* 出すのはキャッシュ（速い）。取り直しは裏で終わらせる。 */
      try { e.waitUntil(net); } catch (x) {}
      return hit;
    }
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
