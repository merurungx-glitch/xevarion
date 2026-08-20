/* ============================================================
   MagiLex Service Worker — オフライン対応
   ・アプリ本体（HTML/JS/CSS/画像）を事前キャッシュ → 機内モードでも起動可
   ・学習記録・XEVAは localStorage 保存なのでオフラインでもそのまま動き、
     オンライン復帰後にポータル側へ自然に反映される
   ・取得できたリソースは随時キャッシュ更新（stale-while-revalidate）
   ============================================================ */
const VERSION = "magilex-sw-v63";
const CORE = [
  /* ★ 2026-08-19 図・グラフのエンジンは XEVYNAR と共有。
     ここに無いと、オフラインで「図で見る」が出ない。 */
  "../XEVYNAR/xevynar-figs.js?v=9",
  "./MagiLex.html",
  "./magilex.css?v=29",
  "./magilex.js?v=48",
  "./magilex-data.js?v=2",
  "./magilex-eigo.js?v=1",
  "./magilex-rika.js?v=1",
  "./magilex-butsuri.js?v=2",
  "./magilex-chemb.js?v=2",
  "./magilex-math3.js?v=1",
  "./magilex-chemg.js?v=3",
  "./magilex-suugaku.js?v=3",
  "./magilex-intro.js?v=1",
  "./magilex-mid.js?v=1",
  "./magilex-chemd.js?v=1",
  "./magilex-physb.js?v=1",
  "./mlhome_s.jpg",
  "../thumbs/MagiLex.jpg",
  "../brand/NGX.png",
  "../brand/MagicalFuture.png",
  "../brand/ISHIDA Production.png",
  "../xeva.js?v=33",
  "../xeva-loading.js?v=1",
  "../xeva-splash.js?v=3",
  "../app-cloud.js?v=4",
  "../xeva-keys.js?v=5",
  "./magilex-cloud.js?v=5",
  "../maintenance-gate.js?v=5",
  "../app-install-notice.js?v=1",
  "../XEVA.png",
];

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
    await xevPrecache(cache, CORE, "magilex");
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    /* ★ 自分のプレフィックスのキャッシュだけ消す。
       以前は「VERSION 以外すべて」を消していたため、XEVARION ポータルや
       他アプリ（MagiLex ⇄ MagiBurst）のオフラインキャッシュまで巻き添えで消えていた。 */
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== VERSION && k.startsWith("magilex-sw")).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // ページ遷移：ネット優先 → 失敗時はキャッシュ（オフライン起動）
  if (req.mode === "navigate") {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        const cache = await caches.open(VERSION);
        cache.put(req, res.clone());
        return res;
      } catch (err) {
        const cache = await caches.open(VERSION);
        return (await cache.match(req)) || (await cache.match("./MagiLex.html"));
      }
    })());
    return;
  }

  // アセット：キャッシュ優先＋裏で更新（同一オリジン & フォントCDN）
  const cacheable = url.origin === self.location.origin ||
    url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (!cacheable) return;
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const cached = await cache.match(req);
    const fetching = fetch(req).then((res) => {
      if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    return cached || (await fetching) || new Response("", { status: 504 });
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
const XEV_SCOPE = "magilex";
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
