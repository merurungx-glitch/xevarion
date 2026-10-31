/* ============================================================
   MagiMusic Service Worker — オフライン再生
   ・アプリ本体（HTML/画像）は install 時にキャッシュ
   ・MP3 は合計約38MBあるため install では落とさない。
     アプリ側の「全曲ダウンロード」ボタン（DL_ALL メッセージ）でまとめて保存する。
     一度でも再生した曲は fetch ハンドラが自動でキャッシュする。
   ・キャッシュ済みの曲はオフライン（機内モード）でもそのまま再生できる。
   ============================================================ */
const VERSION = "magimusic-sw-v38";
const AUDIO_CACHE = "magimusic-audio-v1";   // 曲は本体と別キャッシュ（本体更新で消えないように）

const CORE = [
  "./MagiMusic.html",
  "./manifest.webmanifest",
  "../thumbs/MagiMusic.jpg",
  "../thumbs/MagiBurst.jpg",
  "../Xevarion.png",
  "../brand/NGX_s.webp",
  "../brand/MagicalFuture_s.webp",
  "../brand/ISHIDA_s.webp",
  "../brand/YRA_s.webp",
  "../maintenance-gate.js?v=13",
];

/* プレイヤーが扱う全曲（アプリ側の DEFAULT_TRACKS と揃えること） */
const TRACKS = [
  "flagship-arrival.mp3",
  "paper-sun-hat.mp3",
  "gilded-war-march.mp3",
  "iron-war-march.mp3",
  "forbidden-labyrinth.mp3",
  "moonlit-fault.mp3",
  "midnight-roulette.mp3",
  "panic-in-brass.mp3",
];
const trackUrl = (f) => new URL("../music/" + encodeURIComponent(f), self.location.href).href;

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
    await Promise.allSettled(CORE.map(async (u) => {
      try { await xevIrAdd(cache, u, { cache: "reload" }); } catch (err) {}
      done++;
      await xevRefreshPost({ type: "xev-precache", scope: XEV_SCOPE, done: done, total: CORE.length });
    }));
    await xevIrSave();
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    /* 曲キャッシュ(AUDIO_CACHE)は世代管理の対象外＝本体を更新してもDL済みの曲は残す */
    /* ★ 2026-08-20 <b>自分のプレフィックスのキャッシュだけ</b>消す（ほかのSWと同じ作法にそろえた）。
       これまでは「VERSION と曲キャッシュ以外すべて」を消していたので、
       ポータル・MagiLex・MagiBurst のオフラインぶんや、通信設定（xev-netpref）まで
       巻き添えで消えていた。 */
    await Promise.all(keys.filter((k) => k !== VERSION && k !== AUDIO_CACHE && k.startsWith("magimusic-sw")).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

function isAudio(url) { return /\/music\/.+\.mp3$/i.test(url.pathname); }

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  /* ★ 2026-08-20 通信設定（Wi-Fi／モバイルデータごとに切り替えられる）
     「このつなぎかたでは最新を取りに行かない」ときは、まずキャッシュを見て、
     あればそれを返す＝<b>ダウンロードずみのデータで動く</b>（通信量を使わない）。
     設定はページ（xeva-netmode.js）から postMessage で届く。 */
  if (xevNetLatest() === false) { e.respondWith(xevCacheFirst(req)); return; }


  /* ── 曲: キャッシュ優先。無ければ取得してそのままキャッシュに残す ──
     audio 要素は Range リクエストを投げることがある。Range 付きは
     キャッシュから部分応答を組み立てられないので、フルの応答を取り出して切り出す。 */
  if (isAudio(url)) {
    e.respondWith((async () => {
      const cache = await caches.open(AUDIO_CACHE);
      const key = new Request(url.href);
      let res = await cache.match(key);
      if (!res) {
        /* 未保存 → 取得してついでに保存。保存に失敗してもネットワークから素直に返せば再生はできる。
           オフラインで未保存なら 504（アプリ側が「ダウンロードしてね」と案内する）。 */
        try {
          const ok = await cacheTrack(cache, decodeURIComponent(url.pathname.split("/").pop()));
          res = ok ? await cache.match(key) : null;
          if (!res) return await fetch(req);
        } catch (err) {
          return new Response("", { status: 504, statusText: "offline (not downloaded)" });
        }
      }
      const range = req.headers.get("range");
      if (!range) return res;
      const buf = await res.arrayBuffer();
      const m = /bytes=(\d+)-(\d*)/.exec(range);
      const start = m ? Number(m[1]) : 0;
      const end = m && m[2] ? Number(m[2]) : buf.byteLength - 1;
      return new Response(buf.slice(start, end + 1), {
        status: 206,
        headers: {
          "Content-Type": "audio/mpeg",
          "Content-Range": `bytes ${start}-${end}/${buf.byteLength}`,
          "Content-Length": String(end - start + 1),
          "Accept-Ranges": "bytes",
        },
      });
    })());
    return;
  }

  /* ── 本体: stale-while-revalidate（オフラインでも起動できる） ── */
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const hit = await cache.match(req, { ignoreSearch: true });
    const net = fetch(req).then((r) => { if (r && r.ok) cache.put(req, r.clone()); return r; }).catch(() => null);
    return hit || (await net) || new Response("offline", { status: 504 });
  })());
});

/* ── アプリからの指示 ──
   ★ 曲のダウンロード自体はページ側（MagiMusic.html）が行う。
     Service Worker の中から数MBのファイルを fetch すると、環境によっては
     応答が返らずタイムアウトすることがあるため、SWは「配信」に専念させる。
     ページが caches.open(AUDIO_CACHE) に直接保存し、SWはそれを読んで返す。 */
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
  const d = e.data || {};
  if (d.type === "CLEAR_AUDIO") { e.waitUntil(caches.delete(AUDIO_CACHE)); return; }
  if (d.type === "xev-refresh") { e.waitUntil(xevRefreshAll()); return; }
});

/* ══════════════════════════════════════════════════════════
   まとめて最新化（xev-refresh）
   ------------------------------------------------------------
   ★ ホームの「アプリの更新」は、登録されている全SWに xev-refresh を投げて
     取り直しを頼む。これに応じない SW があると、ホーム側が完了を見きわめ
     られず「100%から進まない」ように見えていた（＝ここが無かった）。
   ★ 曲（AUDIO_CACHE）は対象外。MP3は差し替わらないうえ合計38MBあるので、
     更新のたびに落とし直すのは無駄でしかない。取り直すのは本体だけ。
   ══════════════════════════════════════════════════════════ */
const XEV_SCOPE = "magimusic";
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
    if (/^https?:/i.test(u)) continue;                       // 外部は触らない
    let abs; try { abs = new URL(u, self.location.href).href; } catch (e) { continue; }
    if (seen.has(abs)) continue;
    seen.add(abs); urls.push(u);
  }
  /* 実行時にキャッシュしたぶん（本体キャッシュのみ。曲は別キャッシュなので入らない） */
  try {
    for (const req of await cache.keys()) {
      if (seen.has(req.url)) continue;
      if (new URL(req.url).origin !== self.location.origin) continue;
      if (isAudio(new URL(req.url))) continue;               // 念のため
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
  await xevIrDrop();
  await xevRefreshPost({ type: "xev-refreshed", scope: XEV_SCOPE, total: urls.length,
    got: got, hit: hit, bytes: bytes });
}

/* 1曲ぶん保存（fetch ハンドラが未保存の曲に出会ったときの保険）。
   ストリームをそのまま cache.put へ渡すと転送が途中で切れたときに保存ごと壊れるので、
   arrayBuffer に読み切って「完全に受け取れた」ことを確かめてから保存する。 */
async function cacheTrack(cache, f) {
  const key = new Request(trackUrl(f));
  if (await cache.match(key)) return true;
  try {
    const res = await fetch(key);
    if (!res || !res.ok) return false;
    const len = Number(res.headers.get("content-length") || 0);
    const buf = await res.arrayBuffer();
    if (!buf.byteLength || (len && buf.byteLength !== len)) return false;
    await cache.put(key, new Response(buf, {
      headers: { "Content-Type": "audio/mpeg", "Content-Length": String(buf.byteLength), "Accept-Ranges": "bytes" },
    }));
    return !!(await cache.match(key));
  } catch (err) { return false; }
}

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
