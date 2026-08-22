/* ============================================================
   Magi Lotto Service Worker
   ・画面と演出はすべて端末の中で動くので、一式を事前キャッシュしておけば
     オフラインでも遊べる（そのときの抽選は「ローカル抽選」として印が付く）。
   ・XEVA・💎ジェムの残高と、サーバー側の抽選台帳・賞金プールは通信が要る。
     オフライン中の増減は端末に貯まり、オンラインに戻れば同期される。
   ・作りは MagiJackpot の SW と同じ（プレフィックスの付いたキャッシュだけ掃除する／
     xev-refresh で差分更新できる）。
   ============================================================ */
const VERSION = "magilotto-sw-v6";
const CORE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./ml.css?v=3",
  "./ml-core.js?v=3",
  "./ml-draw.js?v=2",
  "./ml-games.js?v=4",
  "./ml-grand.js?v=3",
  "./ml-admin.js?v=2",
  "./ml-app.js?v=3",
  "./ml-192.png",
  "./ml-512.png",
  "./img/banner_home.webp",
  "./img/machine.webp",
  "./img/ic_scratch.webp",
  "./img/ic_numbers.webp",
  "./img/ic_lotto.webp",
  "./img/ic_grand.webp",
  "./img/ic_free.webp",
  "./img/sym_s6.webp",
  "./img/cutin_jackpot.webp",
  /* スクラッチの絵柄（s1〜s5）は XEVARION のキャラをそのまま参照している。
     コピーはせず、オフラインでも出るようにここでキャッシュだけしておく。 */
  "../img/t_Fuka.webp",
  "../img/t_Tsumugi.webp",
  "../img/t_Suzuka.webp",
  "../img/t_Karem.webp",
  "../img/t_Chizuru.webp",
  "../maintenance-gate.js?v=5",
  "../xeva.js?v=35",
  "../xeva-fx.js?v=1",
  "../xeva-splash.js?v=3",
  "../xeva-back.js?v=1",
  "../XEVA.png",
  "../gem.png",
  "../icons/xev-192.png",
];

async function post(msg) {
  try {
    const cs = await self.clients.matchAll({ includeUncontrolled: true, type: "window" });
    cs.forEach((c) => { try { c.postMessage(msg); } catch (e) {} });
  } catch (e) {}
}

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    let done = 0;
    await post({ type: "xev-precache", scope: "magilotto", done: 0, total: CORE.length });
    for (const u of CORE) {
      try { await cache.add(u); } catch (err) { try { await cache.add(u); } catch (e2) {} }
      done++;
      await post({ type: "xev-precache", scope: "magilotto", done, total: CORE.length });
    }
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    /* ★ 自分のプレフィックスのキャッシュだけ消す。
       「VERSION 以外すべて」を消すと、ポータルや他アプリのオフラインぶんまで巻き添えになる。 */
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== VERSION && k.startsWith("magilotto-sw")).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  let url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;   // 外部（フォント・Firebase）は触らない

  /* ★ 2026-08-20 通信設定（Wi-Fi／モバイルデータごとに切り替えられる）
     「このつなぎかたでは最新を取りに行かない」ときは、まずキャッシュを見て、
     あればそれを返す＝<b>ダウンロードずみのデータで動く</b>（通信量を使わない）。
     設定はページ（xeva-netmode.js）から postMessage で届く。 */
  if (xevNetLatest() === false) { e.respondWith(xevCacheFirst(req)); return; }

  if (req.mode === "navigate") {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(VERSION);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (err) {
        const hit = await caches.match(req, { ignoreSearch: true });
        return hit || (await caches.match("./index.html")) ||
          new Response("<h1>オフラインです</h1>", { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 503 });
      }
    })());
    return;
  }

  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const hit = await cache.match(req, { ignoreSearch: false });
    const net = fetch(req).then((res) => {
      if (res && res.ok && res.type === "basic") cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    if (hit) { net; return hit; }
    const res = await net;
    if (res) return res;
    const loose = await cache.match(req, { ignoreSearch: true });
    return loose || new Response("", { status: 504 });
  })());
});

/* ══ まとめて最新化（xev-refresh）。ポータルの更新画面から呼ばれる ══ */
const XEV_SCOPE = "magilotto";
async function xevRefreshAll() {
  const cache = await caches.open(VERSION);
  const urls = [], seen = new Set();
  for (const u of CORE) {
    if (/^https?:/i.test(u)) continue;
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
  /* 変更のないファイルは落とし直さない（ETag / Last-Modified の条件付きリクエスト） */
  let done = 0, got = 0, hit = 0, bytes = 0;
  const send = () => post({ type: "xev-precache", scope: XEV_SCOPE, done, total: urls.length, got, hit, bytes });
  await send();
  for (const u of urls) {
    try {
      const old = await cache.match(u);
      const h = {};
      if (old) {
        const et = old.headers.get("ETag"), lm = old.headers.get("Last-Modified");
        if (et) h["If-None-Match"] = et;
        if (lm) h["If-Modified-Since"] = lm;
      }
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
    await send();
  }
  await post({ type: "xev-refreshed", scope: XEV_SCOPE, total: urls.length, got, hit, bytes });
}
self.addEventListener("message", (e) => {
  const m = e.data;
  if (!m || m.type !== "xev-refresh") return;
  e.waitUntil(xevRefreshAll());
});

/* ══════════════════════════════════════════════════════════
   ★ 2026-08-20 通信設定（xeva-netmode.js から postMessage で届く）
   ------------------------------------------------------------
   ・latest:false … このつなぎかたでは通信せず、キャッシュにあるものを返す
   ・SW は止まると変数を忘れるので、<b>専用のキャッシュ</b>に書いておいて
     起動のたびに読み直す。このキャッシュ（xev-netpref）は
     activate の掃除で消してはいけない（VERSION の接頭辞と別名にしてある）。
   ・読み終わるまでの一瞬は null＝「これまでどおり最新を取りに行く」で動く。
     ここを false 側に倒すと、設定していない人まで古いデータになってしまう。
   ══════════════════════════════════════════════════════════ */
const XEV_NETPREF_CACHE = "xev-netpref";
const XEV_NETPREF_URL = "./__xev_netpref";
let _xevNetLatest = null;                     // null＝まだ読んでいない
function xevNetLatest() { return _xevNetLatest; }
(async function xevReadNetPref() {
  try {
    const c = await caches.open(XEV_NETPREF_CACHE);
    const r = await c.match(XEV_NETPREF_URL);
    _xevNetLatest = r ? ((await r.json()).latest !== false) : true;
  } catch (e) { _xevNetLatest = true; }
})();
self.addEventListener("message", (e) => {
  const m = e.data;
  if (!m || m.type !== "xev-netmode") return;
  _xevNetLatest = m.latest !== false;
  e.waitUntil((async () => {
    try {
      const c = await caches.open(XEV_NETPREF_CACHE);
      await c.put(XEV_NETPREF_URL, new Response(JSON.stringify({ latest: _xevNetLatest }),
        { headers: { "Content-Type": "application/json" } }));
    } catch (err) {}
  })());
});
/* キャッシュ優先で返す。無ければ通信し、それも失敗したらページだけはホームに逃がす。 */
async function xevCacheFirst(req) {
  const hit = await caches.match(req, { ignoreSearch: true });
  if (hit) return hit;
  try { return await fetch(req); } catch (e) {}
  if (req.mode === "navigate") {
    const home = await caches.match("./index.html", { ignoreSearch: true });
    if (home) return home;
  }
  return new Response("", { status: 504 });
}
