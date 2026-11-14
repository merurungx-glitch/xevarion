/* ============================================================
   MagiBurst Service Worker — オフライン対応
   ・アプリ本体（HTML/JS/画像/BGM）を事前キャッシュ → 機内モードでも起動可
   ・進捗・ガチャ結果は localStorage 保存なのでオフラインでもそのまま動き、
     オンライン復帰後にポータル側（XEVA）へ自然に反映される
   ・オンライン対戦・XEVA換金はアプリ側でオフライン時に無効化している
   ・取得できたリソースは随時キャッシュ更新（stale-while-revalidate）
   ============================================================ */
/* ══ ★★ 2026-11-12 版（VERSION）と、控えるファイルの一覧（CORE）は ../sw-list/MagiBurst.js へ移した ══
   ご指定「更新のたびに sw のファイルをすべてアップロードするのが手間 → まとめて楽に」。
   ・更新のたびに変わるのは版と一覧だけなので、全アプリぶんを sw-list フォルダ1つに集めた。
     → これからの更新で上げるのは sw-list フォルダだけ。この sw.js は「しくみ」を直したときだけ上げる。
   ・ブラウザは importScripts で読んだファイルの中身が変わったことにも気づく（＝一覧が変われば、これまでどおり新しい版が入る）。
   ・XEV_LIST_URL＝自分の一覧の場所（xev-refresh のとき、サーバーの一覧を読み直して確かめる＝_shared.js の xevListNewer）。 */
importScripts("../sw-list/_shared.js", "../sw-list/MagiBurst.js");
const VERSION = self.XEV_SW.v;
const CORE = self.XEV_SW.core;
const XEV_LIST_URL = "../sw-list/MagiBurst.js";

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
    try { await xevIrAdd(cache, u); }
    catch (e) { try { await xevIrAdd(cache, u); } catch (e2) {} }
    done++;
    await xevPost({ type: "xev-precache", scope: scope, done: done, total: list.length });
  }
}

/* ══ ★★ 2026-10-14 「更新したファイル」を数える（ご報告「更新があったファイルが0のまま」）══
   新しい版は<b>install でまとめて取りこむ</b>ので、そのあとの「確かめ（xev-refresh）」では全部「変更なし（304）」になり、
   ホームの更新画面の「更新したファイル」がいつも 0 件だった。
   → install のときに<b>前の版の置き場とくらべて中身が変わったもの</b>（前の版に無い URL＝?v= が上がったもの、
     または ETag／Last-Modified＋大きさがちがうもの）を控えておき、確かめの件数（got・bytes）に足して返す。
   ・前の版がまったく無い（はじめて入れた）ときは数えない（更新ではないため）。
   ・控えは版に縛られない置き場（xev-instrep-v1）に、この SW の場所ごとに1件。見送った版のぶんは足しこむ（同じファイルは1件）。
   ・確かめで使ったら消す（2回数えない）。 */
const XEV_IR_CACHE = "xev-instrep-v1";
const XEV_IR_KEY = new URL("./__xev_instrep", self.location.href).href;
let xevIrChg = null;            /* install 中に見つけた「変わったファイル」 { パス: 大きさ } */
let xevIrOld = null;            /* 前の版の置き場の名前（無ければ null＝はじめて） */
async function xevIrBegin() {
  xevIrChg = {}; xevIrOld = null;
  try {
    const pre = VERSION.replace(/v\d+$/, "");
    const ks = (await caches.keys()).filter((k) => k !== VERSION && k.startsWith(pre) && /v\d+$/.test(k));
    xevIrOld = ks.length ? ks : null;
  } catch (e) { xevIrOld = null; }
}
function xevIrPath(u) { try { return new URL(u, self.location.href).pathname; } catch (e) { return String(u); } }
async function xevIrAdd(cache, u, init) {
  const res = await fetch(u, init);
  if (!res || !res.ok) throw new Error("precache " + u);
  if (xevIrOld && xevIrChg) {
    let same = false;
    try {
      for (const k of xevIrOld) {
        const old = await (await caches.open(k)).match(u);
        if (!old) continue;
        const a = res.headers, b = old.headers;
        const e1 = a.get("ETag"), e2 = b.get("ETag");
        if (e1 && e2) same = e1 === e2;
        else {
          const l1 = a.get("Last-Modified"), l2 = b.get("Last-Modified");
          same = !!(l1 && l1 === l2 && a.get("content-length") === b.get("content-length"));
        }
        break;
      }
    } catch (e) {}
    if (!same) {
      let n = Number(res.headers.get("content-length")) || 0;
      if (!n) { try { n = (await res.clone().blob()).size || 0; } catch (e) { n = 0; } }
      xevIrChg[xevIrPath(u)] = n;
    }
  }
  await cache.put(u, res);
}
async function xevIrSave() {
  if (!xevIrOld || !xevIrChg) return;
  try {
    const c = await caches.open(XEV_IR_CACHE);
    let cur = {};
    try { const r = await c.match(XEV_IR_KEY); if (r) cur = await r.json(); } catch (e) { cur = {}; }
    const files = Object.assign({}, (cur && cur.files) || {}, xevIrChg);
    await c.put(XEV_IR_KEY, new Response(JSON.stringify({ files: files, at: Date.now() }), { headers: { "Content-Type": "application/json" } }));
  } catch (e) {}
}
async function xevIrTake() {
  try {
    const r = await (await caches.open(XEV_IR_CACHE)).match(XEV_IR_KEY);
    if (!r) return {};
    const o = await r.json();
    return (o && o.files) || {};
  } catch (e) { return {}; }
}
async function xevIrDrop() { try { await (await caches.open(XEV_IR_CACHE)).delete(XEV_IR_KEY); } catch (e) {} }

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await xevIrBegin();
    await xevPrecache(cache, CORE, "magiburst");
    await xevIrSave();
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    /* ★ 自分のプレフィックスのキャッシュだけ消す。
       以前は「VERSION 以外すべて」を消していたため、XEVARION ポータルや
       他アプリ（MagiLex ⇄ MagiBurst）のオフラインキャッシュまで巻き添えで消えていた。 */
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== VERSION && k.startsWith("magiburst-sw")).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

/* ── 音声（BGM）専用ハンドラ ──
   <audio> は Range リクエスト（Range: bytes=...）を投げてくる。ここには2つ罠がある:
     ・206 Partial Content は Cache API に put できない（例外になる）
     ・cache.match は Range を解釈しないので、そのまま返すと Safari が再生を拒む
   そこで「Range 無しの GET で全体を取得してキャッシュ」し、
   Range 要求にはキャッシュした全体から 206 を組み立てて返す。 */
async function serveAudio(req, cache) {
  const url = new URL(req.url);
  const key = url.origin + url.pathname;                 // クエリを無視して1本に正規化
  let full = await cache.match(key);
  if (!full) {
    try {
      const net = await fetch(key);                      // Range を付けない素の GET → 200
      if (net && net.ok) { await cache.put(key, net.clone()); full = net; }
    } catch (e) { /* オフライン */ }
  }
  if (!full) return null;

  const range = req.headers.get("range");
  if (!range) return full;

  const buf = await full.arrayBuffer();
  const total = buf.byteLength;
  const m = /bytes=(\d*)-(\d*)/.exec(range);
  let start = m && m[1] ? parseInt(m[1], 10) : 0;
  let end = m && m[2] ? parseInt(m[2], 10) : total - 1;
  if (!isFinite(start) || start < 0) start = 0;
  if (!isFinite(end) || end >= total) end = total - 1;
  if (start > end) {
    return new Response(null, { status: 416, headers: { "Content-Range": "bytes */" + total } });
  }
  const slice = buf.slice(start, end + 1);
  return new Response(slice, {
    status: 206,
    statusText: "Partial Content",
    headers: {
      "Content-Type": full.headers.get("Content-Type") || "audio/mpeg",
      "Content-Length": String(slice.byteLength),
      "Content-Range": "bytes " + start + "-" + end + "/" + total,
      "Accept-Ranges": "bytes",
    },
  });
}

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
  let hit = await cache.match(req, { ignoreSearch: false });
  /* ★★ 2026-11-11 ご報告「オフラインのときだけ重い」の直し（その2）
     事前に入れた絵（CORE＝この SW の版の置き場）も、通信の前に<b>URL ぴったりで</b>探す。
     前は XEV_IMG に無いと通信を待ち、失敗してから「全部の置き場を ? を無視して」2回探していた
     （オフラインのホームでは絵の数だけこれが起き、置き場が増えるほど遅くなっていた）。
     ★ 軽量モードでオフラインのときは、通信を試さず、総なめもしない（自分の置き場と絵の置き場だけ）。 */
  let own = null;
  try { own = await caches.open(VERSION); } catch (e) {}
  if (!hit && own) hit = await own.match(req);
  const lite = xevOffLite();
  if (hit && lite) return hit;
  const net = lite ? Promise.resolve(null) : fetch(req).then((res) => {
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
    const a = (await cache.match(alt, { ignoreSearch: false })) || (own && (await own.match(alt)));
    if (a) return a;
    const a2 = lite ? await cache.match(alt, { ignoreSearch: true }) : await caches.match(alt, { ignoreSearch: true });
    if (a2) return a2;
  }
  const loose = lite ? ((await cache.match(req, { ignoreSearch: true })) || (own && (await own.match(req, { ignoreSearch: true }))))
    : await caches.match(req, { ignoreSearch: true });
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
  const url = new URL(req.url);

  // Firebase など外部の同期通信はキャッシュせずネットワークへ（オフラインなら普通に失敗する）
  if (url.hostname.indexOf("firebase") >= 0 || url.hostname.indexOf("gstatic") >= 0 || url.hostname.indexOf("googleapis") >= 0) return;

  // ページ遷移：ネット優先 → 失敗時はキャッシュ（オフライン起動）
  /* ★ 2026-08-20 通信設定（Wi-Fi／モバイルデータごとに切り替えられる）
     「このつなぎかたでは最新を取りに行かない」ときは、まずキャッシュを見て、
     あればそれを返す＝<b>ダウンロードずみのデータで動く</b>（通信量を使わない）。
     設定はページ（xeva-netmode.js）から postMessage で届く。 */
  if (xevNetLatest() === false) { e.respondWith(xevCacheFirst(req)); return; }

  if (req.mode === "navigate") {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        const cache = await caches.open(VERSION);
        cache.put(req, res.clone());
        return res;
      } catch (err) {
        const cache = await caches.open(VERSION);
        return (await cache.match(req)) || (await cache.match("./index.html"));
      }
    })());
    return;
  }

  // アセット（同一オリジン）：キャッシュ優先＋裏で更新
  if (url.origin !== self.location.origin) return;

  /* ★★ 2026-09-01 画像は<b>版に縛られない置き場</b>へ（更新しても消えない） */
  if (xevIsImg(url)) { e.respondWith(xevImgFirst(req)); return; }

  // BGM は Range 対応の専用ハンドラへ（オフラインでも再生できるようにする）
  if (/\.(mp3|m4a|ogg|wav)$/i.test(url.pathname)) {
    e.respondWith((async () => {
      const cache = await caches.open(VERSION);
      const res = await serveAudio(req, cache);
      if (res) return res;
      try { return await fetch(req); } catch (err) { return new Response("", { status: 504 }); }
    })());
    return;
  }
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const cached = await cache.match(req, { ignoreSearch: false });
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
const XEV_SCOPE = "magiburst";
async function xevRefreshPost(msg) {
  try {
    const cs = await self.clients.matchAll({ includeUncontrolled: true, type: "window" });
    cs.forEach((c) => { try { c.postMessage(msg); } catch (e) {} });
  } catch (e) {}
}
/* ══ ★★ 2026-11-11 要らなくなったファイルの掃除（ご指定「ダウンロード時に要らなくなったファイルを削除する機能」）══
   ホームの「ダウンロード」（xev-refresh）のたびに、この SW の置き場（VERSION）から<b>もう使わないもの</b>を消す。
   ・CORE（この版で使うファイル）は消さない。
   ・消すのは ① CORE と同じファイルの古い版（?v= が小さい・?v= が無い）
              ② ページ（.html）に ? の付いた写し（?room= など。ページ本体は CORE にある）
              ③ CORE に無いファイルの古い版どうし（いちばん新しい ?v= だけ残す）
              ④ サーバーにもう無いファイル（確かめで 404・410 が返ったもの。取れたものより多いときは通信の不調とみて消さない）
   ・消した件数と大きさは xev-refreshed の removed・freed でホームへ返す（ホームの更新画面に「整理した」と出る）。 */
function xevPathKey(u) { let p = u.pathname; if (p.endsWith("/")) p += "index.html"; return u.origin + p; }
function xevVerOf(u) { const s = u.searchParams.get("v"); if (s == null) return 0; const n = parseFloat(s); return isFinite(n) ? n : 0.5; }
function xevAbs(u) { try { return new URL(u, self.location.href).href; } catch (e) { return String(u); } }
async function xevSizeOf(res) {
  if (!res) return 0;
  let n = Number(res.headers.get("content-length")) || 0;
  if (!n) { try { n = (await res.clone().blob()).size || 0; } catch (e) { n = 0; } }
  return n;
}
async function xevDropAll(cache, list, out) {
  for (const req of list) {
    try { const r = await cache.match(req); const n = await xevSizeOf(r); if (await cache.delete(req)) { out.n++; out.bytes += n; } } catch (e) {}
  }
}
/* ?v= 以外の ? はそのまま見分ける（?page=2 などの中身が違うものを「古い版」とまちがえて消さない） */
function xevQKey(u) {
  const ps = [];
  u.searchParams.forEach((val, key) => { if (key !== "v") ps.push(key + "=" + val); });
  ps.sort();
  return xevPathKey(u) + (ps.length ? "?" + ps.join("&") : "");
}
async function xevPrune(cache, coreAbs, sameOriginOnly) {
  const out = { n: 0, bytes: 0 };
  const core = new Map(), corePath = new Set(), best = new Map(), drop = [];
  coreAbs.forEach((abs) => {
    try { const u = new URL(abs); const q = xevQKey(u); corePath.add(xevPathKey(u)); core.set(q, Math.max(core.has(q) ? core.get(q) : -1, xevVerOf(u))); } catch (e) {}
  });
  let reqs = [];
  try { reqs = await cache.keys(); } catch (e) { return out; }
  for (const req of reqs) {
    if (coreAbs.has(req.url)) continue;
    let u; try { u = new URL(req.url); } catch (e) { continue; }
    if (sameOriginOnly !== false && u.origin !== self.location.origin) continue;
    const p = xevPathKey(u), q = xevQKey(u), v = xevVerOf(u);
    if (u.search && corePath.has(p) && /\.html?$/i.test(p)) { drop.push(req); continue; }   /* ② ページの ? 付きの写し */
    if (core.has(q)) { if (v < core.get(q)) drop.push(req); continue; }                       /* ① CORE より古い版 */
    const b = best.get(q);                                                                     /* ③ CORE に無いものは新しい版だけ残す */
    if (!b) best.set(q, { req, v });
    else if (v > b.v) { drop.push(b.req); best.set(q, { req, v }); }
    else drop.push(req);
  }
  await xevDropAll(cache, drop, out);
  return out;
}

/* ★★ 2026-11-11 絵の置き場（XEV_IMG・版に縛られない）も、同じ絵の古い版（?v= が小さい・CORE より古い）を消す。
   ポータルと MagiBurst の SW の両方から呼ばれるが、消したものは数え直さないので二重にはならない。 */
async function xevPruneImg(coreAbs) {
  try { return await xevPrune(await caches.open(XEV_IMG), coreAbs, false); } catch (e) { return { n: 0, bytes: 0 }; }
}
async function xevRefreshAll() {
  const cache = await caches.open(VERSION);
  const urls = [], seen = new Set();
  /* ★★ 2026-11-12 サーバーの一覧（sw-list）のほうが新しい版なら、その一覧で確かめる＝新しいファイルも取りこむ（_shared.js の xevListNewer） */
  const CORE_NOW = (await xevListNewer()) || CORE;
  for (const u of CORE_NOW) {
    if (/^https?:/i.test(u)) continue;                       // 外部（フォントなど）は触らない
    let abs; try { abs = new URL(u, self.location.href).href; } catch (e) { continue; }
    if (seen.has(abs)) continue;
    seen.add(abs); urls.push(u);
  }
  /* 実行時にキャッシュしたぶん（CORE に無いページ・画像）も一緒に取り直す */
  /* ★★ 2026-11-11 要らなくなったファイルの掃除（xevPrune の説明）。ここまでの seen＝CORE */
  const coreAbs = new Set(seen), gone = [];
  const pr = await xevPrune(cache, coreAbs);
  { const pi = await xevPruneImg(coreAbs); pr.n += pi.n; pr.bytes += pi.bytes; }
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
  const irf = await xevIrTake();   /* ★★ 2026-10-14 install で取りこんだぶん（変わったファイル）も「更新した」に数える */
  for (const ip in irf) { got++; bytes += irf[ip] | 0; }
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
        if (!(xevIrPath(u) in irf)) hit++;                                   // 変更なし→何もしない
      } else if (res && res.ok && res.type === "basic") {
        let n = Number(res.headers.get("content-length")) || 0;
        await cache.put(u, res.clone());
        if (!n) { try { n = (await res.clone().blob()).size || 0; } catch (e2) { n = 0; } }
        if (!(xevIrPath(u) in irf)) { got++; bytes += n; }
      } else if (res && (res.status === 404 || res.status === 410) && old && !coreAbs.has(xevAbs(u))) gone.push(u);   /* ★★ 2026-11-11 サーバーにもう無い */
    } catch (e) { /* 落とせなかったぶんは今のキャッシュを残す（消さない） */ }
    done++;
    await tickPost();
  };
  const worker = async () => { while (queue.length) await one(queue.shift()); };
  const crew = [];
  for (let ci = 0; ci < CONC; ci++) crew.push(worker());
  await Promise.all(crew);
  /* ★★ 2026-11-11 サーバーにもう無いファイル（404・410）を置き場から消す。取れたものより多いときは通信の不調とみて消さない */
  if (gone.length && hit + got >= gone.length) await xevDropAll(cache, gone, pr);
  await tickPost(true);
  await xevIrDrop();
  await xevRefreshPost({ type: "xev-refreshed", scope: XEV_SCOPE, total: urls.length, removed: pr.n, freed: pr.bytes, cache: VERSION,
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
/* ★★ 2026-11-11 軽量モード（ホームの設定「動作モード」）でオフラインのとき＝<b>全部の置き場の総なめと通信の試し</b>をやめる。
   lite はページ（xeva-netmode.js）が latest といっしょに送ってくる（netpref に控える）。オフラインかどうかは SW 自身の onLine で見る。 */
let _xevLite = false;
function xevOffLite() { try { return _xevLite && self.navigator && self.navigator.onLine === false; } catch (e) { return false; } }
(async function xevReadNetPref() {
  try {
    const c = await caches.open(XEV_NETPREF_CACHE);
    const r = await c.match(XEV_NETPREF_URL);
    const o = r ? await r.json() : null;
    _xevNetLatest = o ? o.latest !== false : true;
    _xevLite = !!(o && o.lite);
  } catch (e) { _xevNetLatest = true; }
})();
self.addEventListener("message", (e) => {
  const m = e.data;
  if (!m || m.type !== "xev-netmode") return;
  _xevNetLatest = m.latest !== false;
  if ("lite" in m) _xevLite = !!m.lite;
  e.waitUntil((async () => {
    try {
      const c = await caches.open(XEV_NETPREF_CACHE);
      await c.put(XEV_NETPREF_URL, new Response(JSON.stringify({ latest: _xevNetLatest, lite: _xevLite }),
        { headers: { "Content-Type": "application/json" } }));
    } catch (err) {}
  })());
});
/* キャッシュ優先で返す。無ければ通信し、それも失敗したらページだけはホームに逃がす。 */
async function xevCacheFirst(req) {
  /* ★★ 2026-11-11 ご報告「オフラインのときだけ重い」の直し
     前は毎回<b>全部の置き場（いまは 25 個ほど）を ? を無視して</b>探していた。置き場を1つずつ開いて調べるので、
     画面の部品・絵の数だけそれがくり返され、アプリが増えるほど遅くなっていた（オフラインのときはいつもこの道を通る）。
     → ① 自分の置き場を URL ぴったりで（ほとんどここで当たる・1回で済む）→ ② 全部の置き場をぴったりで
       → ③ ? 違いを許して探す → ④ 通信。
     ★ 軽量モードでオフラインのときは ③ を自分の置き場（と絵の置き場）だけにし（ページの移動は全部を探す）、④ の通信も試さない。 */
  const lite = xevOffLite();
  let hit = null;
  try { hit = await (await caches.open(VERSION)).match(req); } catch (e) {}
  if (!hit) hit = await caches.match(req);
  if (!hit && lite && req.mode !== "navigate") {
    try { hit = await (await caches.open(VERSION)).match(req, { ignoreSearch: true }); } catch (e) {}
    if (!hit && /\.(webp|png|jpe?g|gif|svg)$/i.test(new URL(req.url).pathname)) { try { hit = await (await caches.open("xev-img-v1")).match(req, { ignoreSearch: true }); } catch (e) {} }
  } else if (!hit) hit = await caches.match(req, { ignoreSearch: true });
  if (hit) return hit;
  if (!lite) { try { return await fetch(req); } catch (e) {} }
  if (req.mode === "navigate") {
    const home = await caches.match("./index.html", { ignoreSearch: true });
    if (home) return home;
  }
  return new Response("", { status: 504 });
}
