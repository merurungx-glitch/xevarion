/* ============================================================
   XEVARION Portal Service Worker
   ・ホーム（index.html）と、そこから開く portal 内ページを事前キャッシュ
     → インストール後は機内モードでもホームが起動する
   ・MagiLex / MagiBurst / MagiChainParty は それぞれ自前の SW を持つので
     このSWは素通しにする（各アプリのSWがスコープ優先で処理する）
   ・オフライン中の進行は localStorage に残り、オンライン復帰時に
     xeva-cloud.js がタイムスタンプ比較でクラウドへ上書き反映する
   ============================================================ */
const VERSION = "xevarion-sw-v224";

/* ホームを成立させる最小セット（重い画像は runtime キャッシュに任せる） */
const CORE = [
  "./",
  "./index.html",
  /* ★ 2026-08-11 apps.html（アプリ紹介ページ）は廃止しました */
  "./characters.html",
  /* ★ 2026-08-10 ガチャは XEVARION に一本化。中身は MagiBurst の共有モジュールが持つ */
  "./gacha.html",
  "./gacha-ui.js?v=59",
  "./mb-newchars.js?v=34",
  "./xevion-os.js?v=13",
  "./xevion-os.css?v=15",
  "./magibattle-stats.js?v=16",
  "./MagiBurst/js/mb-core.js?v=134",
  /* ★ 2026-08-10 ガチャと図鑑で共通の土台・キャラ詳細・結果演出 */
  /* ★ 2026-08-12 ポータルのガチャ・図鑑も magiburst_v1 を同期するようになった */
  "./app-cloud.js?v=12",
  "./MagiBurst/magiburst-cloud.js?v=22",
  "./mb-boot.js?v=17",
  "./mb-char-detail.js?v=41",
  "./mb-char-detail.css?v=26",
  "./mb-gacha-reveal.css?v=11",
  "./community.html",
  "./about.html",
  "./manifest.webmanifest",
  "./xeva-theme.css?v=9",
  "./xevarion.css?v=25",
  "./xevarion-home.css?v=84",
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
  "./xeva-i18n-p1.js?v=6",
  "./xeva-i18n-p2.js?v=6",
  "./xeva-i18n-mb6.js?v=7",
  "./xeva-i18n-p3.js?v=7",
  "./xeva-i18n-mb7.js?v=7",
  "./xeva-i18n-p4.js?v=7",
  "./xeva-i18n-n1.js?v=14",
  "./xeva-i18n-n2.js?v=3",
  "./xeva.js?v=75",
  "./xeva-alive.js?v=4",
  "./xeva-fx.js?v=9",
  "./xeva-loading.js?v=18",
  "./xevarion.js?v=98",
  "./xevarion-home.js?v=157",
  /* ★★ 2026-09-24 ホームのロビーとパートナー。素材は home-mate/<id>/（?v= は home-mate.js の HM_VER）・笙古／瞳／舞香／衣織／樹愛羅／映美里（09-25 ボイス廃止・表情は webp） */
  "./gacha-live.js?v=5",
  "./home-mate.js?v=20",
  "./xeva-event-ui.js?v=2",
  "./home-mate.css?v=19",
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
  /* ★★ 2026-09-28 3D 会場（XEVARION WORLD CONFERENCE）。expo-data.js は make-expo-data.py が作る */
  "./expo/index.html",
  "./expo/expo.css?v=7",
  "./expo/three.min.js?v=160",
  "./expo/expo-data.js?v=12",
  "./expo/tex.js?v=2",
  "./expo/vrm.js?v=3",
  "./expo/world.js?v=7",
  "./expo/park.js?v=5",
  "./expo/park_style.js?v=2",
  "./expo/park_interiors.js?v=4",
  "./expo/park_areas.js?v=5",
  "./expo/park_areas2.js?v=5",
  "./expo/park_harbor.js?v=4",
  "./expo/park_dome.js?v=4",
  "./expo/park_night2.js?v=3",
  "./expo/park_new.js?v=2",
  "./expo/park_sports.js?v=3",
  "./expo/park_more.js?v=3",
  "./expo/park_life.js?v=2",
  "./expo/park_scope.js?v=2",
  "./expo/park_adult.js?v=1",
  "./expo/park_roads.js?v=3",
  "./expo/gfx.js?v=3",
  "./expo/fx.js?v=4",
  "./expo/people.js?v=3",
  "./expo/games.js?v=4",
  "./expo/games_burst.js?v=1",
  "./expo/park_gacha3d.js?v=2",
  "./expo/park_kart.js?v=1",
  "./expo/audio/park_music.js?v=2",
  "./expo/park_rides.js?v=4",
  "./expo/park_transit.js?v=4",
  "./expo/park_shows.js?v=4",
  "./expo/park_ui.js?v=4",
  "./expo/park_rooms.js?v=3",
  "./expo/park_layout.js?v=1",
  "./expo/park_plan.js?v=2",
  "./expo/park_net.js?v=2",
  "./expo/park_corp.js?v=2",
  "./expo/park_fun.js?v=2",
  "./expo/park_outer.js?v=2",
  "./expo/park_metro.js?v=2",
  "./expo/park_infill.js?v=2",
  "./expo/park_fantasy.js?v=1",
  "./expo/park_spec.js?v=3",
  "./expo/main.js?v=8",
  "./expo/chara/chara01.glb?v=1",
  "./expo/img/park_logo.webp",
  "./expo/img/park_wordmark.webp",
  "./expo/img/park_emblem.webp",
  "./expo/img/ngx_logo.webp",
  "./expo/img/ngx_mark.webp",
  /* ★ パークの音楽（mp3・3曲で 約18MB）は CORE に入れない＝パークで鳴らしたときだけ読む */
  /* ★ 会場のキャラ（VRoid のサンプル A/C/M/O/P・計 約18MB）は CORE に入れない＝パークに入ったときだけ読む（SW が読んだものを保存する） */
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
  "./xeva-keys.js?v=31",
  /* ★★ 2026-10-01 同期のモジュールも入れる（前は実行時キャッシュだけ＝更新直後のオフラインで読めなかった） */
  "./xeva-cloud.js?v=42",
  "./xevarion-fb.js?v=33",
  "./xeva-sync.js?v=18",
  "./xeva-presence.js?v=9",
  /* ★ 2026-08-20 通信設定（Wi-Fi／モバイルデータごとの動き）。
     この SW へ設定を送る側なので、オフラインでも読めるようにここに入れておく。 */
  "./xeva-netmode.js?v=10",
  "./game-link.js?v=10",
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
  "./thumbs/MagiChainParty.jpg",
  /* ★★ 2026-09-03 新作 Magi Dominion Grid */
  "./thumbs/MagiDominionGrid.jpg",
  /* ★★ 2026-09-08 新作 MagiCounter。ここに無いとオフラインでアプリ一覧の絵が出ない。 */
  "./thumbs/MagiCounter.jpg",
  "./thumbs/MagiBocciaRush.jpg",
  "./thumbs/MagiRail.jpg",
  "./thumbs/MagiScope.jpg",
  "./thumbs/MagiShift.jpg",
  "./thumbs/MagiAbyss.jpg",   // ★★ 2026-10-05 新作 MagiAbyss
  "./thumbs/MagiChemLex.jpg", // ★★ 2026-10-06 新作 MagiChemLex
  /* ★★ 2026-10-06 XEVARION 共通イベント Violet Breeze（左上のバナー・イベントのページ・一覧の絵） */
  "./thumbs/VioletBreeze.jpg",
  "./events/violet_breeze.webp",
  "./events/violet_breeze_s.webp",
  "./thumbs/MagiRanking.jpg",
  "./thumbs/MagiCraft.jpg",
  "./thumbs/MagiManor.jpg",
  "./thumbs/MagiDiamond.jpg",
  /* ★★ 2026-08-30 MagiDiamond 大幅リニューアル。
     index.html は版えらび、latest.html が最新版、classic.html が過去版。 */
  /* ★★ 2026-09-06b 本体は index.html。latest.html は転送だけ（古いリンク用に残す）。 */
  "./MagiDiamond/index.html",
  "./MagiDiamond/latest.html",
  "./MagiDiamond/classic.html",
  "./MagiDiamond/css/md2.css?v=10",
  "./MagiDiamond/css/md2-ui.css?v=12",
  "./xeva-i18n-md1.js?v=11",
  "./MagiDiamond/img/icon.png?v=6",
  "./MagiDiamond/img/icon192.png?v=6",
  "./MagiDiamond/img/favicon32.png?v=6",
  "./MagiDiamond/img/icon.webp?v=6",
  "./MagiDiamond/img/icon192.webp?v=6",
  /* ★★ 2026-09-06 MagiDiamond の自前アイコン（絵文字をやめた） */
  "./MagiDiamond/js/md2-icons.js?v=6",
  "./MagiDiamond/js/md2-data.js?v=17",
  /* ★★ 2026-09-10 図鑑のキャラ詳細で Magi: Boccia Rush の性能も出すので、ここでも持つ */
  "./MagiBocciaRush/js/mbr-core.js?v=19",
  "./MagiDiamond/js/md2-game.js?v=22",
  "./MagiDiamond/js/md2-online.js?v=10",
  "./MagiDiamond/img/logo.webp",
  "./MagiDiamond/img/logo_s.webp",
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
/* ★★ 2026-10-01 XEVARION PARK（expo/）のキャラのモデル（.glb・計 約21MB）。
   これまでは版ごとのキャッシュ（VERSION）に入っていたので、<b>更新のたびに消えて</b>、
   更新直後にオフラインでパークを開くと「キャラクターを読みこめませんでした」になっていた。
   → 版に縛られない置き場（xev-park-v1）に置く。?v= 付きなので、置き場にあれば通信しない。
   ★ 音楽（mp3）は &lt;audio&gt; が範囲指定（Range）で読むので、ここでは扱わない（これまでどおり）。 */
const XEV_PARK = "xev-park-v1";
const XEV_PARK_RE = /\/expo\/.*\.(glb|vrm)$/i;
async function xevParkFirst(req) {
  const cache = await caches.open(XEV_PARK);
  const hit = await cache.match(req, { ignoreSearch: false });
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res && res.status === 200 && (res.type === "basic" || res.type === "default")) cache.put(req, res.clone()).catch(() => {});
    return res;
  } catch (err) {
    const loose = await caches.match(req, { ignoreSearch: true });
    if (loose) return loose;
    return new Response("", { status: 504 });
  }
}
/* ★★ 2026-10-01 オフラインでもキャラの絵が出るように、<b>全キャラの小さい絵（img/t_*.webp・1枚 約35KB）</b>を XEV_IMG にためる。
   名前の一覧はキャラの台帳（mb-core.js・mb-newchars.js・gacha-live.js）から拾うので、キャラが増えても書き足さなくてよい。
   すでにあるものは取らない（2回目からは通信しない）。大きい絵が無いときは、xevImgFirst がこの小さい絵で代わりに出す。
   park:true のときは XEVARION PARK のキャラのモデル（約21MB）も入れる（オフライン用のダウンロードのときだけ）。 */
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
    if (opt && opt.park) {
      ["sample_A", "sample_C", "sample_M", "sample_O", "sample_P", "chara01"].forEach((n) => urls.push([XEV_PARK, new URL("./expo/chara/" + n + ".glb?v=1", self.location.href).href]));
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
  e.waitUntil(xevWarm({ imgs: m.imgs !== false, park: !!m.park }));
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

  /* ★★ 2026-09-01 画像は<b>版に縛られない置き場</b>へ（更新しても消えない） */
  if (xevIsImg(url)) { e.respondWith(xevImgFirst(req)); return; }
  /* ★★ 2026-10-01 XEVARION PARK のキャラのモデルも、版に縛られない置き場へ（オフラインでもパークに入れる） */
  if (XEV_PARK_RE.test(url.pathname)) { e.respondWith(xevParkFirst(req)); return; }

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
