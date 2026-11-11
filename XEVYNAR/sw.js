/* ============================================================
   XEVYNAR Service Worker
   ・XEVYNAR は「その人のデータ」で答えるアプリなので、通信がなくても
     ほとんどの機能（プラン・タイマー・記録・MagiBurst編成）が動く。
     オフラインでも開けるように一式を事前キャッシュする。
   ・オフライン中の記録は localStorage に残り、オンライン復帰時に
     xeva-cloud.js がクラウドへ反映する。
   ============================================================ */
const VERSION = "xevynar-sw-v76";
const CORE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./xevynar.css?v=20",
  "./xevynar-tf.js?v=10",
  "./xevynar-kb.js?v=25",
  "./xevynar-lex.js?v=18",
  "./xevynar-steps.js?v=14",
  "./xevynar-figs.js?v=17",
  "./xevynar-terms.js?v=11",
  "./xevynar-deep.js?v=15",
  "./xevynar-brain.js?v=20",
  "./xevynar-talk.js?v=20",
  "./xevynar-app.js?v=22",
  "./XEVYNAR.png",
  "./xevynar-mark.png",
  "./xevynar-192.png",
  "./xevynar-512.png",
  "../maintenance-gate.js?v=13",
  "../xeva.js?v=87",
  "../xeva-alive.js?v=9",
  "../xeva-splash.js?v=22",
  "../xeva-loading.js?v=19",
  "../XEVA.png",
  "../gem.png",
  /* ★ MagiLex の問題データ。オフラインでも「苦手問題の出題」「問題の解説」を
     動かすために先読みしておく（XEVYNAR の目玉機能なので通信必須にはしない）。
     ★★ 2026-08-18c 「1問ごとのくわしい解説」は 数学・物理・化学γ を読むので、
       その4本（suugaku / math3 / chemg / butsuri）も足した。
       ここに無いと、オフラインで解説が<b>1問も出ない</b>。
     ★ どれも <b>?v= を付けない</b>こと。xevynar-deep.js / xevynar-lex.js が
       ?v= 無しで読むので、付けて登録しても当たらない。 */
  "../MagiLex/magilex-data.js",
  "../MagiLex/magilex-eigo.js",
  "../MagiLex/magilex-rika.js",
  "../MagiLex/magilex-chemb.js",
  "../MagiLex/magilex-intro.js",
  "../MagiLex/magilex-mid.js",
  "../MagiLex/magilex-chemg.js",
  "../MagiLex/magilex-chemd.js",
];

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
    /* ★★ 2026-10-13 入れかえの進み具合もホームの更新画面へ知らせる（ほかのアプリの SW とそろえた）。
       知らせないと、更新画面が「ファイルの数」を決めるまで最大10秒待たされていた */
    let done = 0;
    await xevRefreshPost({ type: "xev-precache", scope: XEV_SCOPE, done: 0, total: CORE.length });
    for (const u of CORE) {
      try { await xevIrAdd(cache, u); } catch (err) { try { await xevIrAdd(cache, u); } catch (e2) {} }
      done++;
      await xevRefreshPost({ type: "xev-precache", scope: XEV_SCOPE, done: done, total: CORE.length });
    }
    await xevIrSave();
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== VERSION && k.startsWith("xevynar-sw-")).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  let url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;   // Firebase / フォントはそのまま

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
const XEV_SCOPE = "xevynar";
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
  /* ★★ 2026-11-11 要らなくなったファイルの掃除（xevPrune の説明）。ここまでの seen＝CORE */
  const coreAbs = new Set(seen), gone = [];
  const pr = await xevPrune(cache, coreAbs);
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
