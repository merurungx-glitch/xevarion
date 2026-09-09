/* ============================================================
   MagiCounter Service Worker — オフライン対応
   ・相性表・ポケモンのデータ・計算はすべて端末の中にあるので、
     いちど開けば<b>電波がなくても全機能が動く</b>。
   ・環境データ（data/meta.json）だけは<b>ネットワーク優先</b>にして、
     オンラインに戻ったときに最新へ入れかわるようにする。
     取れなければキャッシュ（前回の中身）を返すので、オフラインでも壊れない。
   ・アカウント同期（Firebase）はキャッシュしない。
   ============================================================ */
const VERSION = "magicounter-sw-v6";
/* ★★ 2026-09-08 ポケモンの絵の入れ物。VERSION とは<b>別</b>にしてあるので、
   アプリを更新しても絵は残る（毎回取り直さない）。 */
const ART_CACHE = "magicounter-art-v1";
const CORE = [
  "./index.html",
  "./manifest.webmanifest",
  "./css/mc.css?v=4",
  "./js/mc-icons.js?v=1",
  "./js/mc-data.js?v=3",
  "./js/mc-core.js?v=4",
  "./js/mc-ui.js?v=4",
  "./js/mc-scan.js?v=2",
  "./data/meta.json",
  "../xeva.js?v=61",
  "../xeva-loading.js?v=13",
  "../xeva-splash.js?v=10",
  "../xeva-safebottom.js?v=8",
  "../xeva-back.js?v=8",
  "../maintenance-gate.js?v=12",
  "../thumbs/MagiCounter.jpg",
];

/* ── 事前キャッシュの進捗をページへ伝える（更新ダウンロード画面用） ── */
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
    await xevPrecache(cache, CORE, "magicounter");
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== VERSION && k.startsWith("magicounter-sw")).map((k) => caches.delete(k)));   /* ★ ART_CACHE（magicounter-art-）は消さない */
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  /* ══ ★★ 2026-09-08 ポケモンの絵（外部）は<b>一度見たら控える</b> ══
     攻略サイトのように本物の絵を出すので、
     オフラインでも 2回目からは同じように見えるようにする。
     ★ 絵だけは別の入れ物（ART_CACHE）に入れる。
       VERSION を上げても<b>消さない</b>ので、更新のたびに取り直さない。 */
  if (url.hostname.indexOf("githubusercontent.com") >= 0) {
    e.respondWith((async () => {
      const c = await caches.open(ART_CACHE);
      const hit = await c.match(req);
      if (hit) return hit;
      try {
        const r = await fetch(req);
        if (r && (r.ok || r.type === "opaque")) c.put(req, r.clone());
        return r;
      } catch (err) {
        return new Response("", { status: 504 });
      }
    })());
    return;
  }
  /* 外部（フォント・Firebase）は素通し */
  if (url.origin !== self.location.origin) return;
  if (url.hostname.indexOf("firebase") >= 0 || url.hostname.indexOf("googleapis") >= 0) return;

  /* ★ 環境データだけは「ネットワーク優先」。
     オンラインに戻ったら必ず新しいものが当たり、
     ダメならキャッシュ（前回の中身）で動きつづける。 */
  if (url.pathname.indexOf("/data/meta.json") >= 0) {
    e.respondWith((async () => {
      try {
        const r = await fetch(req, { cache: "no-store" });
        if (r && r.ok) {
          const c = await caches.open(VERSION);
          c.put(req, r.clone());
        }
        return r;
      } catch (err) {
        const hit = await caches.match(req, { ignoreSearch: true });
        return hit || new Response("{}", { headers: { "Content-Type": "application/json" } });
      }
    })());
    return;
  }

  /* ══ ★★ 2026-09-10 「直したのに反映されない」の直し（Boccia Rush と同じ）══
     前は caches.match(req, { <b>ignoreSearch: true</b> }) だった。
     これは <b>?v= を無視して</b>キャッシュを引き当てるので、
     ?v= を上げても<b>古いほうが返り続ける</b>（SW の VERSION を上げるまで直らない）。
     ★ いまは
       ① <b>?v= まで見て</b>引き当てる（＝?v= を上げれば必ず取り直す）
       ② 当たったときも<b>裏で取り直してキャッシュを新しくする</b>
          （stale-while-revalidate。次に開いたときは必ず最新）
       ③ 通信できないときだけ、最後の手として ?v= 違いを許して探す */
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
    /* 画面そのものが取れないときは index.html を返す（真っ白にしない） */
    if (req.mode === "navigate") {
      const idx = await caches.match("./index.html", { ignoreSearch: true });
      if (idx) return idx;
    }
    return new Response("", { status: 504 });
  })());
});
