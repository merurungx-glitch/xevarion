/* ══════════════════════════════════════════════════════════════
   MagiQuest — Service Worker
   ・CORE を事前キャッシュして、オフラインでも遊べるようにする。
   ・問題データ（MagiLex の magilex-*.js）は<b>MagiQuest の CORE にも入れる</b>。
     MagiLex 側の SW とは別のキャッシュなので、片方だけ開いた人でも困らない。
   ★ 更新するときは VERSION を上げること（xevarion-release-checklist）。
   ══════════════════════════════════════════════════════════════ */
const VERSION = "magiquest-sw-v3";
const CORE = [
  "./",
  "./index.html",
  "./css/mq.css?v=2",
  "./js/mq-data.js?v=4",
  "./js/mq-core.js?v=3",
  "./js/mq-ui.js?v=4",
  "./img/kv.webp",
  "../xeva.js?v=65",
  "../xeva-safebottom.js?v=9",
  "../MagiBurst/js/mb-core.js?v=115",
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
const XEV_SCOPE = "magiquest";
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
