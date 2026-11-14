/* ============================================================
   XEVARION Portal Service Worker
   ・ホーム（index.html）と、そこから開く portal 内ページを事前キャッシュ
     → インストール後は機内モードでもホームが起動する
   ・MagiLex / MagiBurst / MagiChainParty は それぞれ自前の SW を持つので
     このSWは素通しにする（各アプリのSWがスコープ優先で処理する）
   ・オフライン中の進行は localStorage に残り、オンライン復帰時に
     xeva-cloud.js がタイムスタンプ比較でクラウドへ上書き反映する
   ============================================================ */
/* ══ ★★ 2026-11-12 版（VERSION）と、控えるファイルの一覧（CORE）は ./sw-list/_root.js へ移した ══
   ご指定「更新のたびに sw のファイルをすべてアップロードするのが手間 → まとめて楽に」。
   ・更新のたびに変わるのは版と一覧だけなので、全アプリぶんを sw-list フォルダ1つに集めた。
     → これからの更新で上げるのは sw-list フォルダだけ。この sw.js は「しくみ」を直したときだけ上げる。
   ・ブラウザは importScripts で読んだファイルの中身が変わったことにも気づく（＝一覧が変われば、これまでどおり新しい版が入る）。
   ・XEV_LIST_URL＝自分の一覧の場所（xev-refresh のとき、サーバーの一覧を読み直して確かめる＝_shared.js の xevListNewer）。 */
importScripts("./sw-list/_shared.js", "./sw-list/_root.js");
const VERSION = self.XEV_SW.v;
const CORE = self.XEV_SW.core;
const XEV_LIST_URL = "./sw-list/_root.js";
/* ホームを成立させる最小セット（重い画像は runtime キャッシュに任せる） */

/* このSWが触らないパス（各アプリの自前SWに任せる／通信必須） */
const PASS_THROUGH = /\/(MagiLex|MagiBurst|MagiChainParty)\//i;

/* 事前キャッシュは同時4本まで。全部を一斉に投げると、非力なホストや
   3アプリのSWと同時インストールしたときに取りこぼす（＝オフラインで起動できない）。 */
async function precache(cache, urls, conc, scope, base, total) {
  let i = 0, done = 0;
  const worker = async () => {
    while (i < urls.length) {
      const u = urls[i++];
      try { await xevIrAdd(cache, u); }
      catch (err) { try { await xevIrAdd(cache, u); } catch (err2) { /* 1回だけ再試行して諦める */ } }
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
    // ホームが起動できる最小セットを先に確実に入れる
    await xevPost({ type: "xev-precache", scope: "portal", done: 0, total: CORE.length });
    await precache(cache, CORE.slice(0, 12), 3, "portal", 0, CORE.length);
    self.skipWaiting();
    await precache(cache, CORE.slice(12), 4, "portal", 12, CORE.length);
    await xevIrSave();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => (k !== VERSION && k.startsWith("xevarion-sw-")) || k === XEV_PARK_OLD).map((k) => caches.delete(k)));
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
/* ★★ 2026-10-01 ポータルから読む MagiBurst などの部品（素通しだったもの）。
   ふだんは通信（これまでと同じ）→ 取れなければ<b>どの置き場からでも</b>返す（各アプリの SW が入れたものも使える）。
   「このつなぎかたでは最新を取りに行かない」設定のときは、先に置き場を見る。 */
async function xevPassCache(req) {
  /* ★★ 2026-11-11 まず自分の置き場をぴったりで（速い）→ 全部をぴったりで → ? 違い（軽量モードでオフラインのときは ? 違いを全部からは探さない） */
  const fromCache = async () => {
    let h = null;
    try { h = await (await caches.open(VERSION)).match(req); } catch (e) {}
    if (!h) h = await caches.match(req, { ignoreSearch: false });
    if (!h && !xevOffLite()) h = await caches.match(req, { ignoreSearch: true });
    return h;
  };
  if (xevNetLatest() === false) { const hit = await fromCache(); if (hit) return hit; }
  try {
    const res = await fetch(req);
    if (res && (res.ok || res.status === 304)) return res;
    const hit = await fromCache(); return hit || res;
  } catch (err) {
    const hit = await fromCache();
    if (hit) return hit;
    return new Response("", { status: 504 });
  }
}
/* ★★ 2026-10-13 XEVARION PARK（expo/）は<b>オフライン対応とダウンロードを廃止</b>（ご指定）。
   ・PARK のファイルはどの置き場にも入れない（ブラウザがふつうに通信して読む）。
   ・前に入れた PARK のキャラのモデル（xev-park-v1・約21MB）は activate で消して、端末の空きを戻す。
   ・オフラインで PARK を開いたときだけ、短い案内のページを返す。 */
const XEV_PARK_OLD = "xev-park-v1";
const XEV_EXPO_RE = /\/expo\//i;
function xevParkOffline() {
  return new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>XEVARION PARK</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;font-family:sans-serif;background:#eaf8de;color:#2f5a1a;text-align:center;padding:24px">'
    + '<div><p style="font-size:42px;margin:0">📶</p><h1 style="font-size:18px">XEVARION PARK はオンラインのときに入れます</h1>'
    + '<p style="font-size:13px;line-height:1.8">PARK はオフラインでは遊べません（ダウンロードもしません）。<br>通信がつながってから、もう一度開いてください。</p>'
    + '<p><a href="../index.html" style="display:inline-block;padding:10px 22px;border-radius:99px;background:#43b324;color:#fff;font-weight:900;text-decoration:none">ホームへもどる</a></p></div></body>',
    { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } });
}
/* ★★ 2026-10-01 オフラインでもキャラの絵が出るように、<b>全キャラの小さい絵（img/t_*.webp・1枚 約35KB）</b>を XEV_IMG にためる。
   名前の一覧はキャラの台帳（mb-core.js・mb-newchars.js・gacha-live.js）から拾うので、キャラが増えても書き足さなくてよい。
   すでにあるものは取らない（2回目からは通信しない）。大きい絵が無いときは、xevImgFirst がこの小さい絵で代わりに出す。
   ★★ 2026-10-13 PARK のキャラのモデルを入れる park:true は廃止（PARK のオフライン対応をやめた・ご指定）。 */
let xevWarming = null;
async function xevWarm(opt) {
  if (xevWarming) return xevWarming;
  xevWarming = (async () => {
    const urls = [];
    if (!opt || opt.imgs !== false) {
      const names = new Set();
      for (const u of CORE.filter((x) => /mb-core\.js|mb-newchars\.js|gacha-live\.js/.test(x))) {
        try {
          const r = (await caches.match(u)) || (await fetch(u));
          const txt = r ? await r.clone().text() : "";
          (txt.match(/\bt_[A-Za-z0-9_\-]+\.webp/g) || []).forEach((n) => names.add(n));
        } catch (err) {}
      }
      names.forEach((n) => urls.push([XEV_IMG, new URL("./img/" + n, self.location.href).href]));
    }
    let i = 0, done = 0, got = 0;
    const worker = async () => {
      while (i < urls.length) {
        const [cn, u] = urls[i++];
        try {
          const cache = await caches.open(cn);
          if (!(await cache.match(u))) { const r = await fetch(u); if (r && r.status === 200) { await cache.put(u, r); got++; } }
        } catch (err) {}
        done++;
        if (done % 20 === 0 || done === urls.length) await xevPost({ type: "xev-warm", done, total: urls.length, got });
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    return { total: urls.length, got };
  })();
  try { return await xevWarming; } finally { xevWarming = null; }
}
self.addEventListener("message", (e) => {
  const m = e.data;
  if (!m || m.type !== "xev-warm") return;
  e.waitUntil(xevWarm({ imgs: m.imgs !== false }));
});
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
  /* ★★ 2026-11-12 sw-list（SW の版と一覧）は置き場に入れない。ホームの更新画面が cache:"reload" で読み直して
     ブラウザの控えを新しくする（xhWarmSwLists）ので、ここで古い写しを返してはいけない。 */
  if (url.pathname.indexOf("/sw-list/") >= 0) return;
  // 3アプリ配下は各アプリのSWに任せる
  /* ★★ 2026-10-01 ただし<b>ポータルの画面（ホーム・ガチャ・図鑑）から読む部品と絵</b>はここで返す（ご報告「オフライン時キャラ画像が表示されない」）。
     SW は「読みに行く先」ではなく「読んでいる画面」の SW が受け持つので、ここで素通しにすると
     ガチャのバナー（MagiBurst/img/）や mb-core.js が<b>オフラインでは必ず失敗</b>していた（CORE に入れてあっても使われない）。
     画面そのものの移動（navigate）だけは、これまでどおり各アプリの SW に任せる。 */
  if (PASS_THROUGH.test(url.pathname)) {
    if (req.mode === "navigate") return;
    if (xevIsImg(url)) { e.respondWith(xevImgFirst(req)); return; }
    e.respondWith(xevPassCache(req));
    return;
  }

  /* ★★ 2026-10-13 XEVARION PARK（expo/）は置き場に入れない（オフライン対応とダウンロードを廃止・ご指定）。
     ふつうに通信して読む。オフラインで開いたときだけ案内のページ。 */
  if (XEV_EXPO_RE.test(url.pathname)) {
    if (req.mode === "navigate") e.respondWith(fetch(req).catch(() => xevParkOffline()));
    return;
  }
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
      if (XEV_EXPO_RE.test(new URL(req.url).pathname)) { try { await cache.delete(req); } catch (e2) {} continue; }   /* ★★ 2026-10-13 PARK は持たない */
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
