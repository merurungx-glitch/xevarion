/* ============================================================
   MagiJackpot Service Worker
   ・1人プレイもパーティープレイも通信を使わないので、一式を事前キャッシュして
     オフラインでもまるごと遊べるようにする。
   ・XEVA・ジェムの残高だけはクラウド同期が要るが、オフライン中の増減は端末に貯まり、
     オンラインに戻った時点で xeva-cloud.js が送り直す。
   ============================================================ */
const VERSION = "magijackpot-sw-v13";
const CORE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./mj.css?v=10",
  "./mj-games.css?v=3",
  "./mj-core.js?v=11",
  "./mj-slots.js?v=10",
  "./mj-lux.js?v=4",
  "./mj-bj.js?v=8",
  "./mj-pachi.js?v=10",
  "./mj-party.js?v=7",
  "./mj-192.png",
  "./mj-512.png",
  "./mj-banner.jpg",
  /* スロットの絵柄・カットイン・台のバナー */
  "./img/sym_seven.webp",
  "./img/sym_bar.webp",
  "./img/sym_diamond.webp",
  "./img/sym_wild.webp",
  "./img/sym_scatter.webp",
  /* Magi Fortune の高配当図柄（MagiBurst のキャラ） */
  "./img/sym_aira.webp",
  "./img/sym_mao.webp",
  "./img/sym_kaguya.webp",
  /* LUXURIA の三魔女（紅薔薇・白薔薇・黒薔薇） */
  "./img/sym_rose_r.webp",
  "./img/sym_rose_w.webp",
  "./img/sym_rose_b.webp",
  /* Jackpot Rush の FINAL BATTLE 専用のボス */
  "./img/sym_boss1.webp",
  "./img/sym_boss2.webp",
  "./img/sym_boss3.webp",
  "./img/cut_lv1.webp",
  "./img/cut_lv2.webp",
  "./img/cut_lv3.webp",
  "./img/banner_fortune.webp",
  "./img/banner_luxuria.webp",
  "../maintenance-gate.js?v=5",
  "../xeva.js?v=24",
  "../xeva-splash.js?v=3",
  "../xeva-back.js?v=1",
  "../game-link.js?v=1",
  "../XEVA.png",
  "../gem.png",
  "../icons/xev-192.png",
  /* Jackpot Rush のストーリーリーチに使う MagiBurst のキャラ画像
     （FINAL BATTLE のボスは ./img/sym_boss1〜3.webp に移したので、ここには要らない） */
  "../img/t_Fiona.webp",
  "../img/t_Chloe.webp",
  "../img/t_Selene.webp",
  "../img/t_Abyss.webp",
];

/* ── 事前キャッシュの進捗をページへ通知する（更新ダウンロード画面用） ── */
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
    await post({ type: "xev-precache", scope: "magijackpot", done: 0, total: CORE.length });
    for (const u of CORE) {
      try { await cache.add(u); } catch (err) { try { await cache.add(u); } catch (e2) {} }
      done++;
      await post({ type: "xev-precache", scope: "magijackpot", done, total: CORE.length });
    }
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    /* ★ 自分のプレフィックスのキャッシュだけ消す。
       「VERSION 以外すべて」を消すと、ポータルや他アプリのオフラインキャッシュまで巻き添えになる。 */
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== VERSION && k.startsWith("magijackpot-sw")).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  let url;
  try { url = new URL(req.url); } catch (err) { return; }
  /* 外部ドメイン（フォント・同期）は触らない */
  if (url.origin !== self.location.origin) return;

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

  /* アセット：キャッシュ優先＋裏で更新 */
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


/* ══════════════════════════════════════════════════════════
   まとめて最新化（xev-refresh）
   ------------------------------------------------------------
   ★ 「更新を何回か見送っていた人」も、1回の更新で全部そろうようにするための入口。
     install の事前キャッシュだけだと
       ・sw.js の中身が変わっていない回は install が走らない
       ・CORE に載っていない実行時キャッシュぶんは古いまま
     という取りこぼしが出て、「更新したのに前のまま」が起きる。
     ここでは CORE ＋ いまキャッシュに入っている全URL を
     cache:"reload"（＝ブラウザのHTTPキャッシュも無視）で取り直して入れ替える。
     つまり、何世代とばしていても1回で最新にそろう。
   ══════════════════════════════════════════════════════════ */
const XEV_SCOPE = "magijackpot";
async function xevRefreshPost(msg) {
  try {
    const cs = await self.clients.matchAll({ includeUncontrolled: true, type: "window" });
    cs.forEach((c) => { try { c.postMessage(msg); } catch (e) {} });
  } catch (e) {}
}
async function xevRefreshAll() {
  const cache = await caches.open(VERSION);
  const urls = [], seen = new Set();
  for (const u of CORE) {
    if (/^https?:/i.test(u)) continue;                       // 外部（フォントなど）は触らない
    let abs; try { abs = new URL(u, self.location.href).href; } catch (e) { continue; }
    if (seen.has(abs)) continue;
    seen.add(abs); urls.push(u);
  }
  /* 実行時にキャッシュしたぶん（CORE に無いページ・画像）も一緒に取り直す */
  try {
    for (const req of await cache.keys()) {
      if (seen.has(req.url)) continue;
      if (new URL(req.url).origin !== self.location.origin) continue;
      seen.add(req.url); urls.push(req.url);
    }
  } catch (e) {}
  /* ★ 2026-08-03: 変更のないファイルは落とし直さない（差分更新）
     旧実装は全 URL を cache:"reload" で取り直していたため、中身が何も変わっていない
     画像や音の分まで毎回数十MB落ちていた。
     ここではいま持っているキャッシュの ETag / Last-Modified を条件付きリクエストで送り、
     サーバーが 304（変更なし）を返したら中身を受け取らずにキャッシュをそのまま使う。
     ・条件ヘッダを自分で付けるので cache:"no-store"（ブラウザのHTTPキャッシュを通さない）。
       こうすると 304 がそのまま返り、「本当に落としたか」を数えられる。
     ・目印が無い（ETag も Last-Modified も無い）ときは cache:"no-cache" で再検証する。
       reload と違って、変わっていなければブラウザが本体を落とさずに済ませてくれる。 */
  let done = 0, got = 0, hit = 0, bytes = 0;
  const post = () => xevRefreshPost({ type: "xev-precache", scope: XEV_SCOPE,
    done: done, total: urls.length, got: got, hit: hit, bytes: bytes });
  await post();
  for (const u of urls) {
    try {
      const old = await cache.match(u);
      const h = {};
      if (old) {
        const et = old.headers.get("ETag");
        const lm = old.headers.get("Last-Modified");
        if (et) h["If-None-Match"] = et;
        if (lm) h["If-Modified-Since"] = lm;
      }
      const opt = Object.keys(h).length ? { cache: "no-store", headers: h } : { cache: "no-cache" };
      const res = await fetch(u, opt);
      if (res && res.status === 304 && old) {
        hit++;                                   // 変更なし→何もしない
      } else if (res && res.ok && res.type === "basic") {
        let n = Number(res.headers.get("content-length")) || 0;
        await cache.put(u, res.clone());
        if (!n) { try { n = (await res.clone().blob()).size || 0; } catch (e2) { n = 0; } }
        got++; bytes += n;
      }
    } catch (e) { /* 落とせなかったぶんは今のキャッシュを残す（消さない） */ }
    done++;
    await post();
  }
  await xevRefreshPost({ type: "xev-refreshed", scope: XEV_SCOPE, total: urls.length,
    got: got, hit: hit, bytes: bytes });
}
self.addEventListener("message", (e) => {
  const m = e.data;
  if (!m || m.type !== "xev-refresh") return;
  e.waitUntil(xevRefreshAll());
});
