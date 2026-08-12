/* ============================================================
   XEVARION Portal Service Worker
   ・ホーム（index.html）と、そこから開く portal 内ページを事前キャッシュ
     → インストール後は機内モードでもホームが起動する
   ・MagiLex / MagiBurst / MagiChainParty は それぞれ自前の SW を持つので
     このSWは素通しにする（各アプリのSWがスコープ優先で処理する）
   ・オフライン中の進行は localStorage に残り、オンライン復帰時に
     xeva-cloud.js がタイムスタンプ比較でクラウドへ上書き反映する
   ============================================================ */
const VERSION = "xevarion-sw-v58";

/* ホームを成立させる最小セット（重い画像は runtime キャッシュに任せる） */
const CORE = [
  "./",
  "./index.html",
  /* ★ 2026-08-11 apps.html（アプリ紹介ページ）は廃止しました */
  "./characters.html",
  /* ★ 2026-08-10 ガチャは XEVARION に一本化。中身は MagiBurst の共有モジュールが持つ */
  "./gacha.html",
  "./gacha-ui.js?v=6",
  "./magibattle-stats.js?v=6",
  "./MagiBurst/js/mb-core.js?v=12",
  /* ★ 2026-08-10 ガチャと図鑑で共通の土台・キャラ詳細・結果演出 */
  /* ★ 2026-08-12 ポータルのガチャ・図鑑も magiburst_v1 を同期するようになった */
  "./app-cloud.js?v=4",
  "./MagiBurst/magiburst-cloud.js?v=6",
  "./mb-boot.js?v=3",
  "./mb-char-detail.js?v=2",
  "./mb-char-detail.css?v=2",
  "./mb-gacha-reveal.css?v=1",
  "./community.html",
  "./about.html",
  "./manifest.webmanifest",
  "./xeva-theme.css?v=1",
  "./xevarion.css?v=16",
  "./xevarion-home.css?v=31",
  "./xeva.js?v=27",
  "./xeva-fx.js?v=1",
  "./xeva-loading.js?v=1",
  "./xevarion.js?v=56",
  "./xevarion-home.js?v=33",
  "./maintenance-gate.js?v=5",
  "./xeva-back.js?v=1",
  "./xeva-keys.js?v=2",
  "./game-link.js?v=1",
  "Xevarion.png",
  "XEVA.png",
  "./brand-xevarion-orb.png",
  "./brand-xevarion-wordmark-dark.png",
  "./icons/xev-192.png",
  "./icons/xev-512.png",
  "./gem.png",
  "./thumbs/XEVYNAR.jpg",
  "./thumbs/MagiJackpot.jpg",
  "./thumbs/Xevarion.png",
  "./thumbs/MagiBattle.jpg",
  "./thumbs/MagiLex.jpg",
  "./thumbs/MagiBurst.jpg",
  "./thumbs/MagiArena.jpg",
  "./thumbs/MagiLink.jpg",
  "./thumbs/MagiChainParty.jpg",
  "./thumbs/MagiRanking.jpg",
  "./thumbs/MagiCraft.jpg",
  "./thumbs/MagiManor.jpg",
  "./thumbs/MagiDiamond.jpg",
  "./thumbs/MagiMusic.jpg",
  "./thumbs/MagiFocus.jpg",
  "./thumbs/MagiPortfolio.jpg",
  "./thumbs/MagiEmpire.jpg",
  "./thumbs/MagiTier.jpg",
  "./thumbs/Ordyxis.jpg",
  "./thumbs/MagicalFuture.jpg",
  "./thumbs/xevarion-home_s.jpg?v=2",
];

/* このSWが触らないパス（各アプリの自前SWに任せる／通信必須） */
const PASS_THROUGH = /\/(MagiLex|MagiBurst|MagiChainParty)\//i;

/* 事前キャッシュは同時4本まで。全部を一斉に投げると、非力なホストや
   3アプリのSWと同時インストールしたときに取りこぼす（＝オフラインで起動できない）。 */
async function precache(cache, urls, conc, scope, base, total) {
  let i = 0, done = 0;
  const worker = async () => {
    while (i < urls.length) {
      const u = urls[i++];
      try { await cache.add(u); }
      catch (err) { try { await cache.add(u); } catch (err2) { /* 1回だけ再試行して諦める */ } }
      done++;
      if (scope) await xevPost({ type: "xev-precache", scope: scope, done: (base || 0) + done, total: total || urls.length });
    }
  };
  await Promise.all(Array.from({ length: conc || 4 }, worker));
}

/* ── 事前キャッシュの進捗をページへ通知する（更新ダウンロード画面用） ── */
async function xevPost(msg) {
  try {
    const cs = await self.clients.matchAll({ includeUncontrolled: true, type: "window" });
    cs.forEach((c) => { try { c.postMessage(msg); } catch (e) {} });
  } catch (e) {}
}
async function xevPrecache(cache, list, scope) {
  let done = 0;
  await xevPost({ type: "xev-precache", scope: scope, done: 0, total: list.length });
  for (const u of list) {
    try { await cache.add(u); }
    catch (e) { try { await cache.add(u); } catch (e2) {} }
    done++;
    await xevPost({ type: "xev-precache", scope: scope, done: done, total: list.length });
  }
}

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    // ホームが起動できる最小セットを先に確実に入れる
    await xevPost({ type: "xev-precache", scope: "portal", done: 0, total: CORE.length });
    await precache(cache, CORE.slice(0, 12), 3, "portal", 0, CORE.length);
    self.skipWaiting();
    await precache(cache, CORE.slice(12), 4, "portal", 12, CORE.length);
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== VERSION && k.startsWith("xevarion-sw-")).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  let url;
  try { url = new URL(req.url); } catch (err) { return; }

  // 別オリジン（Firebase / Google Fonts など）はそのまま
  if (url.origin !== self.location.origin) return;
  // 3アプリ配下は各アプリのSWに任せる
  if (PASS_THROUGH.test(url.pathname)) return;

  // ナビゲーション：ネット優先 → 失敗したらキャッシュ → 最後にホーム
  if (req.mode === "navigate") {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(VERSION);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (err) {
        const hit = await caches.match(req, { ignoreSearch: true });
        if (hit) return hit;
        const home = await caches.match("./index.html");
        if (home) return home;
        return new Response("<h1>オフラインです</h1>", { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 503 });
      }
    })());
    return;
  }

  // その他：stale-while-revalidate
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
    if (loose) return loose;
    return new Response("", { status: 504 });
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
const XEV_SCOPE = "portal";
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
