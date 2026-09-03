/* ============================================================
   XEVARION Portal Service Worker
   ・ホーム（index.html）と、そこから開く portal 内ページを事前キャッシュ
     → インストール後は機内モードでもホームが起動する
   ・MagiLex / MagiBurst / MagiChainParty は それぞれ自前の SW を持つので
     このSWは素通しにする（各アプリのSWがスコープ優先で処理する）
   ・オフライン中の進行は localStorage に残り、オンライン復帰時に
     xeva-cloud.js がタイムスタンプ比較でクラウドへ上書き反映する
   ============================================================ */
const VERSION = "xevarion-sw-v116";

/* ホームを成立させる最小セット（重い画像は runtime キャッシュに任せる） */
const CORE = [
  "./",
  "./index.html",
  /* ★ 2026-08-11 apps.html（アプリ紹介ページ）は廃止しました */
  "./characters.html",
  /* ★ 2026-08-10 ガチャは XEVARION に一本化。中身は MagiBurst の共有モジュールが持つ */
  "./gacha.html",
  "./gacha-ui.js?v=30",
  "./mb-newchars.js?v=14",
  "./xevion-os.js?v=7",
  "./xevion-os.css?v=9",
  "./magibattle-stats.js?v=8",
  "./MagiBurst/js/mb-core.js?v=75",
  /* ★ 2026-08-10 ガチャと図鑑で共通の土台・キャラ詳細・結果演出 */
  /* ★ 2026-08-12 ポータルのガチャ・図鑑も magiburst_v1 を同期するようになった */
  "./app-cloud.js?v=6",
  "./MagiBurst/magiburst-cloud.js?v=8",
  "./mb-boot.js?v=11",
  "./mb-char-detail.js?v=17",
  "./mb-char-detail.css?v=13",
  "./mb-gacha-reveal.css?v=5",
  "./community.html",
  "./about.html",
  "./manifest.webmanifest",
  "./xeva-theme.css?v=3",
  "./xevarion.css?v=18",
  "./xevarion-home.css?v=49",
  /* ★★ 2026-09-03 下バーを画面の下端に合わせる共通部品 */
  "./xeva-safebottom.js?v=2",
  "./xeva.js?v=54",
  "./xeva-fx.js?v=3",
  "./xeva-loading.js?v=3",
  "./xevarion.js?v=74",
  "./xevarion-home.js?v=75",
  "./maintenance-gate.js?v=7",
  "./xeva-back.js?v=3",
  "./xeva-keys.js?v=11",
  /* ★ 2026-08-20 通信設定（Wi-Fi／モバイルデータごとの動き）。
     この SW へ設定を送る側なので、オフラインでも読めるようにここに入れておく。 */
  "./xeva-netmode.js?v=4",
  "./game-link.js?v=4",
  "Xevarion.png",
  "XEVA.png",
  "./brand-xevarion-orb.png",
  "./brand-xevarion-wordmark-dark.png",
  "./icons/xev-192.png",
  "./icons/xev-512.png",
  "./gem.png",
  /* ★ 2026-08-24 スタミナの絵（ホームの⚡札とスタミナのシートで使う）。
     ここに無いとオフラインで絵が出ず、update.json にも載らない。 */
  "./stamina.png",
  "./thumbs/XEVYNAR.jpg",
  "./thumbs/MagiJackpot.jpg",
  "./thumbs/MagiLotto.jpg",
  "./thumbs/Xevarion.png",
  "./thumbs/MagiBattle.jpg",
  "./thumbs/MagiLex.jpg",
  "./thumbs/MagiBurst.jpg",
  /* ★★ 2026-08-29b 新作 Magi: Arcana Rush のタイル絵。
     ここに無いとオフラインでホームの絵が出ず、update.json にも載らない。 */
  "./thumbs/MagiArcanaRush.jpg",
  "./thumbs/MagiArena.jpg",
  "./thumbs/MagiLink.jpg",
  "./thumbs/MagiChainParty.jpg",
  /* ★★ 2026-09-03 新作 Magi Dominion Grid */
  "./thumbs/MagiDominionGrid.jpg",
  "./thumbs/MagiRanking.jpg",
  "./thumbs/MagiCraft.jpg",
  "./thumbs/MagiManor.jpg",
  "./thumbs/MagiDiamond.jpg",
  /* ★★ 2026-08-30 MagiDiamond 大幅リニューアル。
     index.html は版えらび、latest.html が最新版、classic.html が過去版。 */
  "./MagiDiamond/index.html",
  "./MagiDiamond/latest.html",
  "./MagiDiamond/classic.html",
  "./MagiDiamond/css/md2.css?v=4",
  "./MagiDiamond/js/md2-data.js?v=4",
  "./MagiDiamond/js/md2-game.js?v=9",
  "./MagiDiamond/js/md2-online.js?v=4",
  "./MagiDiamond/img/logo.webp",
  "./MagiDiamond/img/logo_s.webp",
  "./thumbs/MagiMusic.jpg",
  "./thumbs/MagiFocus.jpg",
  "./thumbs/MagiPortfolio.jpg",
  "./thumbs/MagiEmpire.jpg",
  "./thumbs/MagiTier.jpg",
  "./thumbs/Ordyxis.jpg",
  "./thumbs/MagicalFuture.jpg",
  "./thumbs/xevarion-home_s.jpg?v=5",
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

/* ══════════════════════════════════════════════════════════════
   ★★ 2026-09-01 <b>キャラクターの絵は「版に縛られない置き場」にためる</b>（ご報告への対応）
   ------------------------------------------------------------
   ご報告: 「オフラインのとき、キャラ詳細の<b>大きい画像</b>が出ないことがある」

   原因は<b>更新のたびに絵が消えていた</b>こと。
   ・大きい絵（img/Xxx.webp・1枚 250〜380KB）は数が多すぎて事前キャッシュ（CORE）に載せられない。
     そのため<b>一度見たときに実行時キャッシュへ入る</b>作りになっていた。
   ・ところがその置き場は <b>VERSION（magiburst-sw-vNNN）</b> と同じキャッシュで、
     activate で<b>古い VERSION をまるごと消す</b>ため、
     <b>更新するたびに、見て貯めた大きい絵が全部消えていた</b>。
     → 更新直後にオフラインにすると、見たことがある絵まで出なくなる。

   → 絵だけ <b>XEV_IMG（版に縛られない名前）</b> に分ける。
     ・activate は "magiburst-sw" で始まるものしか消さないので、ここは<b>残る</b>。
     ・一度でも表示した絵は、更新をまたいでもオフラインで出る。
   ★ 置き場は<b>アプリ共通の名前</b>にしてある。ポータルで見た絵は MagiBurst でも使える。
   ★ 消えては困るものではない（次にオンラインで開けばまた貯まる）ので、
     容量が足りなくなればブラウザが勝手に減らしてよい。
   ══════════════════════════════════════════════════════════════ */
const XEV_IMG = "xev-img-v1";
const XEV_IMG_RE = /\.(webp|png|jpe?g|gif|svg)$/i;
function xevIsImg(url) {
  return XEV_IMG_RE.test(url.pathname);
}
async function xevImgFirst(req) {
  const cache = await caches.open(XEV_IMG);
  const hit = await cache.match(req, { ignoreSearch: false });
  const net = fetch(req).then((res) => {
    if (res && res.ok && (res.type === "basic" || res.type === "default")) {
      cache.put(req, res.clone()).catch(() => {});
    }
    return res;
  }).catch(() => null);
  if (hit) { net; return hit; }               /* あればすぐ返し、裏で新しくする */
  const res = await net;
  if (res) return res;
  /* ★ 取れなかった＝オフラインで未取得。<b>サムネイル（t_）で代用</b>してみる。
     大きい絵より小さいが、<b>空っぽより読める</b>（ご報告の「出ない」を防ぐ）。 */
  const alt = xevThumbURL(req.url);
  if (alt) {
    const a = await cache.match(alt, { ignoreSearch: false });
    if (a) return a;
    const a2 = await caches.match(alt, { ignoreSearch: true });
    if (a2) return a2;
  }
  const loose = await caches.match(req, { ignoreSearch: true });
  if (loose) return loose;
  return new Response("", { status: 504 });
}
/* 大きい絵 → 同じ名前のサムネイル（t_ 付き）のURL。作れなければ null */
function xevThumbURL(href) {
  try {
    const u = new URL(href);
    const m = u.pathname.match(/^(.*\/)([^/]+)$/);
    if (!m) return null;
    if (/^t_/.test(m[2])) return null;                      /* もうサムネイル */
    if (!/\/img\//.test(u.pathname)) return null;             /* img/ のものだけ */
    u.pathname = m[1] + "t_" + m[2];
    return u.href;
  } catch (e) { return null; }
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  let url;
  try { url = new URL(req.url); } catch (err) { return; }

  // 別オリジン（Firebase / Google Fonts など）はそのまま
  if (url.origin !== self.location.origin) return;
  // 3アプリ配下は各アプリのSWに任せる
  if (PASS_THROUGH.test(url.pathname)) return;

  /* ★★ 2026-09-01 画像は<b>版に縛られない置き場</b>へ（更新しても消えない） */
  if (xevIsImg(url)) { e.respondWith(xevImgFirst(req)); return; }

  // ナビゲーション：ネット優先 → 失敗したらキャッシュ → 最後にホーム
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
