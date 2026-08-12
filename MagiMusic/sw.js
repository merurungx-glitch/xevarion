/* ============================================================
   MagiMusic Service Worker — オフライン再生
   ・アプリ本体（HTML/画像）は install 時にキャッシュ
   ・MP3 は合計約38MBあるため install では落とさない。
     アプリ側の「全曲ダウンロード」ボタン（DL_ALL メッセージ）でまとめて保存する。
     一度でも再生した曲は fetch ハンドラが自動でキャッシュする。
   ・キャッシュ済みの曲はオフライン（機内モード）でもそのまま再生できる。
   ============================================================ */
const VERSION = "magimusic-sw-v3";
const AUDIO_CACHE = "magimusic-audio-v1";   // 曲は本体と別キャッシュ（本体更新で消えないように）

const CORE = [
  "./MagiMusic.html",
  "./manifest.webmanifest",
  "../thumbs/MagiMusic.jpg",
  "../thumbs/MagiBurst.jpg",
  "../Xevarion.png",
  "../brand/NGX.png",
  "../brand/MagicalFuture.png",
  "../brand/ISHIDA Production.png",
  "../maintenance-gate.js?v=5",
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

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await Promise.allSettled(CORE.map((u) => cache.add(new Request(u, { cache: "reload" }))));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    /* 曲キャッシュ(AUDIO_CACHE)は世代管理の対象外＝本体を更新してもDL済みの曲は残す */
    await Promise.all(keys.filter((k) => k !== VERSION && k !== AUDIO_CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

function isAudio(url) { return /\/music\/.+\.mp3$/i.test(url.pathname); }

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

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
