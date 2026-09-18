/* ============================================================
   MagiCounter Service Worker — オフライン対応
   ・相性表・ポケモンのデータ・計算はすべて端末の中にあるので、
     いちど開けば<b>電波がなくても全機能が動く</b>。
   ・環境データ（data/meta.json）だけは<b>ネットワーク優先</b>にして、
     オンラインに戻ったときに最新へ入れかわるようにする。
     取れなければキャッシュ（前回の中身）を返すので、オフラインでも壊れない。
   ・アカウント同期（Firebase）はキャッシュしない。
   ============================================================ */
const VERSION = "magicounter-sw-v15";
/* ★★ 2026-09-08 ポケモンの絵の入れ物。VERSION とは<b>別</b>にしてあるので、
   アプリを更新しても絵は残る（毎回取り直さない）。 */
const ART_CACHE = "magicounter-art-v1";
const CORE = [
  "./index.html",
  "./manifest.webmanifest",
  "./css/mc.css?v=6",
  "./js/mc-icons.js?v=2",
  "./js/mc-data.js?v=5",
  "./js/mc-core.js?v=6",
  "./js/mc-ui.js?v=6",
  "./js/mc-scan.js?v=8",
  "./data/meta.json",
  "../xeva.js?v=67",
  "../xeva-loading.js?v=17",
  "../xeva-splash.js?v=13",
  "../xeva-safebottom.js?v=11",
  "../xeva-back.js?v=9",
  "../maintenance-gate.js?v=13",
  "../thumbs/MagiCounter.jpg",
  /* ★★ 2026-09-13d <b>ここに無いとオフラインで開けないことがある</b>（ご指定の不具合）。
     index.html が読んでいるのに CORE から抜けていたぶん。
     ★ 実行時キャッシュに入るので<b>ふだんは動く</b>が、
       いちど開いただけで（実行時キャッシュが埋まる前に）通信が切れると、
       xeva.js が読めず<b>白い画面</b>になる。CORE に載せて install で確実に取る。
     ★ xeva-cloud.js はモジュールなので、<b>そこから読む xeva-keys.js も</b>要る。 */
  "../xeva-cloud.js?v=33",
  "../xeva-keys.js?v=25",
  /* 起動時のスプラッシュとお辞儀の絵（xeva-splash / xeva-loading が読む） */
  "../img/ld_b_stand.webp?v=5",
  "../img/ld_b_bow.webp?v=5",
  "../brand/NGX.png",
  "../brand/ISHIDA Production.png",
  "../brand/MagicalFuture.png",
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
const XEV_SCOPE = "magicounter";
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
  /* ══ ★★ 2026-09-10 「更新に時間がかかる」の直し ══
     ここは<b>キャッシュにある全ファイル</b>を1件ずつ
     「変わっていませんか？」と聞いて回るところ。落とす量は差分だけで正しいのだが、
     <b>聞くのが1本ずつ</b>だった。1往復 100ms × 400件＝それだけで40秒かかる。
     ★ 同時に <b>6本</b>まで聞くようにした。<b>取ってくる量は1バイトも変わらない</b>。
     ★ 進み具合の知らせも1件ごとに送っていたので、<b>120ms ごとに間引く</b>。
       SW → 画面の postMessage は数が多いとそれ自体が重く、
       これも「進みかたがカクつく／戻って見える」原因になっていた。 */
  const CONC = 6;
  let lastPost = 0;
  const tickPost = async (force) => {
    const now = Date.now();
    if (!force && now - lastPost < 120) return;
    lastPost = now;
    await post();
  };
  const queue = urls.slice();
  const one = async (u) => {
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
    await tickPost();
  };
  const worker = async () => { while (queue.length) await one(queue.shift()); };
  const crew = [];
  for (let ci = 0; ci < CONC; ci++) crew.push(worker());
  await Promise.all(crew);
  await tickPost(true);
  await xevRefreshPost({ type: "xev-refreshed", scope: XEV_SCOPE, total: urls.length,
    got: got, hit: hit, bytes: bytes });
}
self.addEventListener("message", (e) => {
  /* ★★ 2026-09-13 「進捗が 100% なのに終わらない」への保険。
     新しい SW は「古い SW が手を離すまで waiting」になることがあり、
     ホーム側がそれを待ってしまうと永遠に終わらない。
     この便りをもらったら<b>待たずに進む</b>。 */
  const m = e.data;
  if (!m || m.type !== "SKIP_WAITING") return;
  self.skipWaiting();
});

self.addEventListener("message", (e) => {
  const m = e.data;
  if (!m || m.type !== "xev-refresh") return;
  e.waitUntil(xevRefreshAll());
});
