/* ============================================================
   MagiBocciaRush Service Worker — オフライン対応
   ・CPU戦・練習・チュートリアル・ルールブックは<b>完全にオフライン</b>で動く。
   ・オンライン（部屋番号）は当然ネットが要る。Firebase はキャッシュしない。
   ・キャラクターの絵は XEVARION の img/ にあるので、ここでは丸ごと持たない
     （ポータル側の SW が持っている。開いたぶんだけ実行時に控える）。
   ============================================================ */
const VERSION = "boccia-sw-v16";
const RUNTIME = "boccia-rt-v1";
const CORE = [
  "./index.html",
  "./manifest.webmanifest",
  "./css/mbr.css?v=14",
  "./js/mbr-voice.js?v=2",
  "./js/mbr-core.js?v=8",
  "./js/mbr-stage.js?v=4",
  "./js/mbr-fx.js?v=4",
  "./js/mbr-ui.js?v=11",
  "../mb-newchars.js?v=28",
  "../mb-boot.js?v=17",
  "../MagiBurst/js/mb-core.js?v=120",
  "../xeva.js?v=67",
  "../xeva-loading.js?v=16",
  "../xeva-splash.js?v=12",
  "../xeva-safebottom.js?v=10",
  "../xeva-back.js?v=9",
  "../maintenance-gate.js?v=13",
  "../thumbs/MagiBocciaRush.jpg",
  "./img/mbrhome_s.webp",   /* ★★ 2026-09-17e 開始画面のキービジュアル */
  /* ★★ 2026-09-17d オフライン対応の穴うめ（ご指定）：
     ・オンライン対戦とアカウント同期のモジュール（読めないと console が赤くなるだけで遊べるが、そろえておく）
     ・英語版の辞書（オフラインで英語にしたとき、キャラ名が日本語に戻らないように） */
  "./js/mbr-online.js?v=4",
  "../xeva-cloud.js?v=33",
  "../MagiBurst/magiburst-cloud.js?v=17",
  "../app-cloud.js?v=12",
  "../xeva-keys.js?v=25",
  "../xeva-i18n.js?v=8",
  "../xeva-i18n-dict.js?v=12",
  "../xeva-i18n-mb1.js?v=7",
  "../xeva-i18n-mb2.js?v=7",
  "../xeva-i18n-mb3.js?v=8",
  "../xeva-i18n-mb4.js?v=9",
  "../xeva-i18n-mb5.js?v=7",
  "../xeva-i18n-mb6.js?v=7",
  "../xeva-i18n-mb7.js?v=7",
  "../xeva-i18n-n1.js?v=8",
  "../xeva-i18n-n2.js?v=3",
];
/* チュートリアルの音声（ずんだもん）。Range で取りに来るので CORE とは別の入れ物に置き、下の fetch で切り出して返す */
const VOICE_FILES = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => "./voice/3/tut-" + i + ".m4a");

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
    try { const rt = await caches.open(RUNTIME); await Promise.all(VOICE_FILES.map((u) => rt.add(u).catch(() => {}))); } catch (e) {}
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

  /* ★★ 2026-09-17d チュートリアルの音声（voice/*.m4a）もオフラインで鳴らす。
     Safari は Range（206）で取りに来るので、キャッシュの丸ごとの音声から<b>その範囲だけ切り出して 206 で返す</b>。
     （前は SW を通さなかったので、オフラインでは鳴らなかった） */
  if (/\/voice\/.+\.m4a$/i.test(url.pathname)) {
    e.respondWith((async () => {
      const rt = await caches.open(RUNTIME);
      const key = new URL(url.pathname, self.location.origin).href;
      let res = await rt.match(key, { ignoreSearch: true });
      if (!res) {
        try {
          const r = await fetch(key);
          if (r && r.status === 200) { await rt.put(key, r.clone()); res = r; } else return r;
        } catch (err) { return new Response("", { status: 504 }); }
      }
      const range = req.headers.get("range");
      if (!range) return res;
      const buf = await res.clone().arrayBuffer();
      const size = buf.byteLength;
      const m = /bytes=(\d*)-(\d*)/.exec(range) || [];
      const start = m[1] ? +m[1] : 0;
      const end = Math.min(m[2] ? +m[2] : size - 1, size - 1);
      return new Response(buf.slice(start, end + 1), { status: 206, headers: {
        "Content-Type": "audio/mp4", "Content-Range": "bytes " + start + "-" + end + "/" + size,
        "Content-Length": String(end - start + 1), "Accept-Ranges": "bytes" } });
    })());
    return;
  }

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
const XEV_SCOPE = "magibocciarush";
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
