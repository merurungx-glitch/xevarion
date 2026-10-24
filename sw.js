/* ============================================================
   XEVARION Portal Service Worker
   ・ホーム（index.html）と、そこから開く portal 内ページを事前キャッシュ
     → インストール後は機内モードでもホームが起動する
   ・MagiLex / MagiBurst / MagiChainParty は それぞれ自前の SW を持つので
     このSWは素通しにする（各アプリのSWがスコープ優先で処理する）
   ・オフライン中の進行は localStorage に残り、オンライン復帰時に
     xeva-cloud.js がタイムスタンプ比較でクラウドへ上書き反映する
   ============================================================ */
const VERSION = "xevarion-sw-v242";

/* ホームを成立させる最小セット（重い画像は runtime キャッシュに任せる） */
const CORE = [
  "./",
  "./index.html",
  /* ★ 2026-08-11 apps.html（アプリ紹介ページ）は廃止しました */
  "./characters.html",
  /* ★ 2026-08-10 ガチャは XEVARION に一本化。中身は MagiBurst の共有モジュールが持つ */
  "./gacha.html",
  "./gacha-ui.js?v=65",
  "./mb-newchars.js?v=38",
  "./xeva-devnotes.js?v=1",
  "./xevion-os.js?v=13",
  "./xevion-os.css?v=15",
  "./magibattle-stats.js?v=18",
  "./MagiBurst/js/mb-core.js?v=140",
  /* ★ 2026-08-10 ガチャと図鑑で共通の土台・キャラ詳細・結果演出 */
  /* ★ 2026-08-12 ポータルのガチャ・図鑑も magiburst_v1 を同期するようになった */
  "./app-cloud.js?v=15",
  "./MagiBurst/magiburst-cloud.js?v=27",
  "./mb-boot.js?v=17",
  "./mb-char-detail.js?v=49",
  "./mb-char-detail.css?v=30",
  "./mb-gacha-reveal.css?v=11",
  /* ★★ 2026-10-09 ガチャの演出を1から作り直した（1体ずつ・確定演出・UR は縦長の絵） */
  "./xeva-summon.js?v=5",
  "./community.html",
  "./xeva-community.js?v=1",     // ★★ 2026-10-20 コミュニティ（PARK の入口・アニメTier）
  "./about.html",
  "./manifest.webmanifest",
  "./xeva-theme.css?v=9",
  "./xevarion.css?v=25",
  "./xevarion-home.css?v=87",
  /* ★★ 2026-09-03 下バーを画面の下端に合わせる共通部品 */
  "./xeva-safebottom.js?v=12",
  "./xeva-qr.js?v=9",
  /* ★★ 2026-09-13 更新中の全画面で流す PR 動画（字幕は JS が出す） */
  "./xeva-collection.js?v=8",
  "./xeva-i18n.js?v=8",
  "./xeva-i18n-dict.js?v=12",
  "./xeva-i18n-mb1.js?v=7",
  "./xeva-i18n-mb2.js?v=7",
  "./xeva-i18n-mb3.js?v=8",
  "./xeva-i18n-mb4.js?v=9",
  "./xeva-i18n-mb5.js?v=7",
  "./xeva-i18n-p1.js?v=7",
  "./xeva-i18n-p2.js?v=6",
  "./xeva-i18n-mb6.js?v=7",
  "./xeva-i18n-p3.js?v=7",
  "./xeva-i18n-mb7.js?v=7",
  "./xeva-i18n-p4.js?v=8",
  "./xeva-i18n-n1.js?v=20",
  "./xeva-i18n-n2.js?v=3",
  "./xeva.js?v=82",
  "./xeva-alive.js?v=8",
  "./xeva-fx.js?v=9",
  "./xeva-loading.js?v=19",
  "./xeva-splash.js?v=17",          // ★★ 2026-10-13 XEVARION の起動画面（3社ロゴ）にも使う
  "./uwaki.html",                    // ★★ 2026-10-15 これって浮気？判定シート（ホームの PARK の真上のボタン）
  "./uwaki.js?v=1",
  "./uwaki.css?v=1",
  "./thumbs/Uwaki.jpg",
  "./xevarion.js?v=105",
  "./xevarion-home.js?v=169",
  /* ★★ 2026-09-24 ホームのロビーとパートナー。素材は home-mate/<id>/（?v= は home-mate.js の HM_VER）・笙古／瞳／舞香／衣織／樹愛羅／映美里（09-25 ボイス廃止・表情は webp） */
  "./gacha-live.js?v=8",
  "./home-mate.js?v=28",
  "./xeva-prefetch.js?v=1",     // ★★ 2026-10-24 MagiDerby・MagiScope の先読み
  "./xeva-event-ui.js?v=4",
  "./home-mate.css?v=24",
  "./xeva-pop.css?v=1",
  "./xeva-pop-pages.css?v=3",
  "./xeva-uma.css?v=2",
  "./xeva-tabbar.js?v=5",          // ★★ 2026-10-13 ガチャ・コミュニティ・図鑑にも下バー
  "./home-mate/shoko/shoko.json?v=17",
  "./home-mate/shoko/shoko.webp?v=17",
  "./home-mate/shoko/shoko_label.webp?v=17",
  "./home-mate/shoko/shoko_face.webp?v=17",
  "./home-mate/shoko/bg.webp?v=17",
  "./home-mate/hitomi/hitomi.json?v=17",
  "./home-mate/hitomi/hitomi.webp?v=17",
  "./home-mate/hitomi/hitomi_label.webp?v=17",
  "./home-mate/hitomi/hitomi_face.webp?v=17",
  "./home-mate/hitomi/bg.webp?v=17",
  "./home-mate/hana/hana.json?v=17",
  "./home-mate/hana/hana.webp?v=17",
  "./home-mate/hana/hana_label.webp?v=17",
  "./home-mate/hana/hana_face.webp?v=17",
  "./home-mate/hana/bg.webp?v=17",
  "./home-mate/lisa/lisa.json?v=17",
  "./home-mate/lisa/lisa.webp?v=17",
  "./home-mate/lisa/lisa_label.webp?v=17",
  "./home-mate/lisa/lisa_face.webp?v=17",
  "./home-mate/lisa/bg.webp?v=17",
  "./home-mate/anna/anna.json?v=17",
  "./home-mate/anna/anna.webp?v=17",
  "./home-mate/anna/anna_label.webp?v=17",
  "./home-mate/anna/anna_face.webp?v=17",
  "./home-mate/anna/bg.webp?v=17",
  "./home-mate/sana/sana.json?v=17",
  "./home-mate/sana/sana.webp?v=17",
  "./home-mate/sana/sana_label.webp?v=17",
  "./home-mate/sana/sana_face.webp?v=17",
  "./home-mate/sana/bg.webp?v=17",
  /* ★★ 2026-10-13 XEVARION PARK（expo/）は<b>オフライン対応とダウンロードを廃止</b>（ご指定）。
     ここ（CORE＝更新でダウンロードするもの）から外し、下の fetch でも置き場に入れない＝PARK はオンラインのときだけ開く。
     前に入れたぶん（版のキャッシュの expo/・キャラのモデルの xev-park-v1）は activate で消す。 */
  "./home-mate/maika/maika.json?v=17",
  "./home-mate/maika/maika.webp?v=17",
  "./home-mate/maika/maika_label.webp?v=17",
  "./home-mate/maika/maika_face.webp?v=17",
  "./home-mate/maika/bg.webp?v=17",
  "./home-mate/iori/iori.json?v=17",
  "./home-mate/iori/iori.webp?v=17",
  "./home-mate/iori/iori_label.webp?v=17",
  "./home-mate/iori/iori_face.webp?v=17",
  "./home-mate/iori/bg.webp?v=17",
  "./home-mate/kiara/kiara.json?v=17",
  "./home-mate/kiara/kiara.webp?v=17",
  "./home-mate/kiara/kiara_label.webp?v=17",
  "./home-mate/kiara/kiara_face.webp?v=17",
  "./home-mate/kiara/bg.webp?v=17",
  "./home-mate/emiri/emiri.json?v=17",
  "./home-mate/emiri/emiri.webp?v=17",
  "./home-mate/emiri/emiri_label.webp?v=17",
  "./home-mate/emiri/emiri_face.webp?v=17",
  "./home-mate/emiri/bg.webp?v=17",
  "./maintenance-gate.js?v=13",
  "./xeva-back.js?v=9",
  "./xeva-keys.js?v=34",
  /* ★★ 2026-10-01 同期のモジュールも入れる（前は実行時キャッシュだけ＝更新直後のオフラインで読めなかった） */
  "./xeva-cloud.js?v=48",
  "./xevarion-fb.js?v=36",
  "./xeva-sync.js?v=18",
  "./xeva-presence.js?v=9",
  /* ★ 2026-08-20 通信設定（Wi-Fi／モバイルデータごとの動き）。
     この SW へ設定を送る側なので、オフラインでも読めるようにここに入れておく。 */
  "./xeva-netmode.js?v=10",
  "./game-link.js?v=11",
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
  /* ★★ 2026-09-13c ★星煌印（ガチャの天井）の絵。
     ここに無いとオフラインで帯の絵が出ず、update.json にも載らない。 */
  "./img/seal.webp",
  "./img/seal_s.webp",
  "./thumbs/XEVYNAR.jpg",
  "./thumbs/MagiJackpot.jpg",
  "./thumbs/MagiLotto.jpg",
  "./thumbs/Xevarion.png",
  "./thumbs/MagiBattle.jpg",
  "./thumbs/MagiLex.jpg",
  "./thumbs/MagiBurst.jpg",
  "./thumbs/MagiArena.jpg",
  "./thumbs/MagiLink.jpg",
  "./thumbs/MagiChainParty.jpg?v=2",
  /* ★★ 2026-09-03 新作 Magi Dominion Grid */
  "./thumbs/MagiDominionGrid.jpg",
  /* ★★ 2026-09-08 新作 MagiCounter。ここに無いとオフラインでアプリ一覧の絵が出ない。 */
  "./thumbs/MagiCounter.jpg",
  "./thumbs/MagiBocciaRush.jpg",
  "./thumbs/MagiRail.jpg",
  "./thumbs/MagiScope.jpg",
  "./thumbs/MagiShift.jpg",
  "./thumbs/MagiQuiz.jpg",   /* ★★ 2026-10-23 新作 MagiQuiz */
  "./thumbs/MagiAbyss.jpg?v=2",   // ★★ 2026-10-05 新作 MagiAbyss
  "./thumbs/ISHIDA.webp",      // ★★ 2026-10-09b ISHIDA のアイコン（小さい正方形）
  "./brand/NGX_s.webp", "./brand/MagicalFuture_s.webp", "./brand/ISHIDA_s.webp",   // ★★ 2026-10-09b 起動画面の3社ロゴ（小さい版）
  "./thumbs/MagiChemLex.jpg?v=2", // ★★ 2026-10-06 新作 MagiChemLex
  "./thumbs/MagiDerby.jpg",       // ★★ 2026-10-21 新作 MagiDerby（実際の JRA GⅠ）
  /* ★★ 2026-10-06 XEVARION 共通イベント Violet Breeze（左上のバナー・イベントのページ・一覧の絵） */
  "./thumbs/VioletBreeze.jpg",
  "./events/violet_breeze.webp",
  "./events/violet_breeze_s.webp",
  /* ★★ 2026-10-20 11月の共通イベント Midnight Pumpkin（予告から） */
  "./thumbs/MidnightPumpkin.jpg",
  "./events/midnight_pumpkin.webp",
  "./events/midnight_pumpkin_s.webp",
  "./thumbs/MagiRanking.jpg",
  "./thumbs/MagiCraft.jpg",
  "./thumbs/MagiManor.jpg",
  /* ★★ 2026-10-13 MagiDiamond は廃止（ご指定）。そのファイル・アイコン・英語辞書（xeva-i18n-md1.js）を外して消した */
  /* ★★ 2026-09-10 図鑑のキャラ詳細で Magi: Boccia Rush の性能も出すので、ここでも持つ */
  "./MagiBocciaRush/js/mbr-core.js?v=21",
  /* ★★ 2026-10-09 キャラ詳細・新キャラ紹介で MagiAbyss の性能も出すので、ここでも持つ */
  "./MagiAbyss/js/ma-data.js?v=10",
  "./MagiAbyss/js/ma-stats.js?v=2",
  "./thumbs/MagiMusic.jpg",
  "./thumbs/MagiFocus.jpg",
  "./thumbs/MagiPortfolio.jpg",
  "./thumbs/MagiEmpire.jpg",
  "./thumbs/MagiTier.jpg",
  "./thumbs/Ordyxis.jpg",
  "./thumbs/MagicalFuture.jpg",
  "./thumbs/xevarion-home_s.jpg?v=12",
  /* ★★ 2026-09-06 同期の画面に出る案内役（立ち姿とお辞儀・2人ぶん）。 */
  "./img/ld_a_stand.webp",
  "./img/ld_a_bow.webp",
  "./img/ld_b_stand.webp",
  "./img/ld_b_bow.webp",
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
/* ★★ 2026-10-01 ポータルから読む MagiBurst などの部品（素通しだったもの）。
   ふだんは通信（これまでと同じ）→ 取れなければ<b>どの置き場からでも</b>返す（各アプリの SW が入れたものも使える）。
   「このつなぎかたでは最新を取りに行かない」設定のときは、先に置き場を見る。 */
async function xevPassCache(req) {
  const fromCache = async () => (await caches.match(req, { ignoreSearch: false })) || (await caches.match(req, { ignoreSearch: true }));
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
