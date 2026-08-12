/* ============================================================
   MagiBurst Service Worker — オフライン対応
   ・アプリ本体（HTML/JS/画像/BGM）を事前キャッシュ → 機内モードでも起動可
   ・進捗・ガチャ結果は localStorage 保存なのでオフラインでもそのまま動き、
     オンライン復帰後にポータル側（XEVA）へ自然に反映される
   ・オンライン対戦・XEVA換金はアプリ側でオフライン時に無効化している
   ・取得できたリソースは随時キャッシュ更新（stale-while-revalidate）
   ============================================================ */
const VERSION = "magiburst-sw-v82";
const CORE = [
  "./index.html",
  "./js/mb-core.js?v=12",   /* ★ 2026-08-10 キャラ・ガチャの共有モジュール（XEVARION のガチャと共通） */
  "../xeva.js?v=27",
  "../xeva-loading.js?v=1",
  "../xeva-splash.js?v=3",
  "../app-cloud.js?v=4",
  "../xeva-keys.js?v=2",
  "./magiburst-cloud.js?v=6",
  "../maintenance-gate.js?v=5",
  "../app-install-notice.js?v=1",
  "../XEVA.png",
  "../gem.png",
  /* BGM は権利確認のため一時提供停止中 → 先読みしない */
  "../thumbs/MagiBurst.jpg",
  "../brand/NGX.png",
  "../brand/MagicalFuture.png",
  "../brand/ISHIDA Production.png",
  "img/bn_premium_s.webp",
  "img/bn_castle_s.webp",
  "img/bn_lab_s.webp",
  "img/bn_garden_s.webp",
  "img/bn_express_s.webp",
  "img/back1_s.webp",
  "img/back2_s.webp",
  "img/backlab_s.webp",
  "img/backgarden_s.webp",
  "img/maxspeed_s.webp",
  "img/mbhome_s.webp",
  "../img/t_Valga.webp",
  "../img/t_Ultra.webp",
  "../img/t_Omega.webp",
  "../img/t_Zenosu.webp",
  "img/e_Hecatia.webp",
  /* ★ 2026-08-05 プレミアム新★5「ロゼリア」「シズカ」 */
  "../img/Roselia.webp",
  "../img/t_Roselia.webp",
  "../img/Shizuka.webp",
  "../img/t_Shizuka.webp",
  /* ★ 2026-08-05 プレミアム新★5「ネム」 */
  "../img/Nemu.webp",
  "../img/t_Nemu.webp",
  /* ★ 2026-08-06 プレミアム新★5「ユリア」「アルティア」「リアナ」 */
  "../img/Yuria.webp",
  "../img/t_Yuria.webp",
  "../img/Altia.webp",
  "../img/t_Altia.webp",
  "../img/Liana.webp",
  "../img/t_Liana.webp",
  /* ★ 2026-08-07 Phantom Legend Fest「野獣先輩」 */
  "../img/Yaju.webp",
  "../img/t_Yaju.webp",
  /* ★ 2026-08-07 プレミアム新★5「イオリ」「ノエル」「ユキノ」「レイカ」 */
  "../img/Iori.webp",
  "../img/t_Iori.webp",
  "../img/Noelle.webp",
  "../img/t_Noelle.webp",
  "../img/Yukino.webp",
  "../img/t_Yukino.webp",
  "../img/Reika.webp",
  "../img/t_Reika.webp",
  /* ★ 2026-08-07 幽冥の庭園 第11〜15ノ園のボス／降臨キャラ「ドミニア」（蝕魔族）。
     e_Dominia.png は敵スプライト、t_Dominia.webp はクエスト詳細のサムネにも使う */
  "../img/Dominia.webp",
  "../img/t_Dominia.webp",
  "img/e_Dominia.webp",
  "img/bn_fes3_s.webp",
  "img/bn_fes3_soon.webp",   /* 開催前に出すシルエット版のバナー（ガチャ用） */
  "img/bn_comingsoon_s.webp",/* ★ 2026-08-08 Event に出す COMING SOON の1枚 */
  /* ★ 2026-08-08 フルバーストカットインの Full Burst ロゴ（全キャラ共通で1枚だけ）。
     ★ キャラごとの縦長イラスト（◯◯SS.png）は廃止した。
       67枚で 126MB あり、このキャッシュの大半を占めていた。 */
  "img/fullburst-logo.webp",   /* ★ 2026-08-08b 透過つきの切り抜き版（旧 fullburst.webp は下地が残っていた） */
  /* ★ 2026-08-08c プレミアム新★5「コトネ」「ラン」「セリス」 */
  "../img/Kotone.webp",
  "../img/t_Kotone.webp",
  "../img/Ran.webp",
  "../img/t_Ran.webp",
  "../img/Ceris.webp",
  "../img/t_Ceris.webp",
  /* ★ 2026-08-08c 治癒の祈りのカットインで使う「むかしのSS絵」。
     ふだんのカットインは正方形アイコンだが、治癒の祈りだけは縦長イラストを出す。
     必要な4枚だけを MagiBurst-SS-Archive から戻してある（全67枚は戻さない）。 */
  "img/ss/ArisaSS.webp",
  "img/ss/KokonaSS.webp",
  "img/ss/RezeliaSS.webp",
  "img/ss/RanSS.webp",
  "img/ss/YajuSS.webp",   /* ★ 2026-08-08d クロススキル「お待たせ!」用 */
  "img/ss/KokonaAlphaSS.webp",   /* ★ 2026-08-11 ココナα（治癒の祈り）用 */
  /* ★ 2026-08-08 プレミアム新★5「カエデ」「リノン」「ココロ」「アンジェ」 */
  "../img/Kaede.webp",
  "../img/t_Kaede.webp",
  "../img/Rinon.webp",
  "../img/t_Rinon.webp",
  "../img/Kokoro.webp",
  "../img/t_Kokoro.webp",
  "../img/Ange.webp",
  "../img/t_Ange.webp",
  /* ★ 2026-08-08 プレミアム新★5「ナナミ」「チトセ」 */
  "../img/Nanami.webp",
  "../img/t_Nanami.webp",
  "../img/Chitose.webp",
  "../img/t_Chitose.webp",
  /* ★ v16 プレミアム新★5 6体 */
  "../img/Sheril.webp",
  "../img/t_Sheril.webp",
  "../img/Fia.webp",
  "../img/t_Fia.webp",
  "../img/Lysera.webp",
  "../img/t_Lysera.webp",
  "../img/Soleria.webp",
  "../img/t_Soleria.webp",
  "../img/Beltia.webp",
  "../img/t_Beltia.webp",
  "../img/Astera.webp",
  "../img/t_Astera.webp",
  /* ★ 2026-08-04 王城・迷宮 第1〜25の間のボス5体 */
  "img/e_Dominus.webp",
  "../img/t_Dominus.webp",
  "img/e_Eclipse.webp",
  "../img/t_Eclipse.webp",
  "img/e_Inferna.webp",
  "../img/t_Inferna.webp",
  "img/e_Oblivion.webp",
  "../img/t_Oblivion.webp",
  "img/e_Umbra.webp",
  "../img/t_Umbra.webp",
  "../img/t_Hecatia.webp",
  "../img/t_Rezelia.webp",
  "../img/t_Elsia.webp",
  "../img/t_Karina.webp",
  "../img/t_Nephia.webp",
  "../img/t_Misora.webp",
  "img/e_Misora.webp",
  "../img/t_Setsuna.webp",
  "../img/t_Selene.webp",
  "../img/t_Nazuna.webp",
  "../img/t_Lilia.webp",
  "../img/t_Revia.webp",
  /* ★ v14 Nocturne Bloom Fest */
  "img/bn_fes_s.webp",
  "../img/t_Fiona.webp",
  "../img/t_Milfy.webp",
  "../img/t_Mabel.webp",
  "../img/t_Abyss.webp",
  "../img/t_Arche.webp",
  /* ★ v14.5 プレミアム新★5 クロエ */
  "../img/t_Chloe.webp",
  /* ★ v15 Luminous Summer Fest */
  "img/bn_fes2_s.webp",
  "../img/t_KaguyaAlpha.webp",
  "../img/t_MionAlpha.webp",
  /* ★ 2026-08-11 Luminous Summer Fest 追加2体 */
  "../img/t_CherylAlpha.webp",
  "../img/t_KokonaAlpha.webp",
  /* ★ 2026-08-11 プレミアム★5 3体 */
  "../img/t_Shizuku.webp",
  "../img/t_Yuunagi.webp",
  "../img/t_Izumi.webp",
  /* ★ 2026-08-12 蒼夏祭（Aoka Summer Fest）限定★5 6体 */
  "img/bn_fes4_s.webp",
  "../img/t_Fuka.webp",
  "../img/t_Tsumugi.webp",
  "../img/t_Suzuka.webp",
  "../img/t_Karem.webp",
  "../img/t_Mayu.webp",
  "../img/t_Chizuru.webp",
  "img/ss/MayuSS.webp",       /* 治癒の祈りのカットイン用 */
  "img/ss/ChizuruSS.webp",
  /* ★ 2026-08-12 サマーキャンペーン（初クリア💎2倍）の専用バナー */
  "img/bn_summer_s.webp",
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
    await xevPrecache(cache, CORE, "magiburst");
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

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Firebase など外部の同期通信はキャッシュせずネットワークへ（オフラインなら普通に失敗する）
  if (url.hostname.indexOf("firebase") >= 0 || url.hostname.indexOf("gstatic") >= 0 || url.hostname.indexOf("googleapis") >= 0) return;

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
        return (await cache.match(req)) || (await cache.match("./index.html"));
      }
    })());
    return;
  }

  // アセット（同一オリジン）：キャッシュ優先＋裏で更新
  if (url.origin !== self.location.origin) return;

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
