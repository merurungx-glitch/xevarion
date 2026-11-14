/* ============================================================
   XEVARION ホーム（ルートの sw.js） — Service Worker が控えるファイルの一覧（sw-list/_root.js）
   ★★ 2026-11-12 sw.js（ルート） から、版（v）と一覧（core）だけをここへ移した
   ------------------------------------------------------------
   ・v    … 置き場の名前（版）。core のファイルが1つでも変わったら、最後の数字を +1 する
             （上げ忘れは make-update.py が見つけて自動で +1 する）
   ・core … オフライン用に先に取りこむファイル。パスは sw.js（ルート） から見た相対パスのまま
   ・sw.js（ルート） がこのファイルを importScripts で読む（しくみは sw-list/_shared.js の説明）
   ============================================================ */
self.XEV_SW = { v: "xevarion-sw-v265", core: [
  "./",
  "./index.html",
  /* ★ 2026-08-11 apps.html（アプリ紹介ページ）は廃止しました */
  "./characters.html",
  /* ★ 2026-08-10 ガチャは XEVARION に一本化。中身は MagiBurst の共有モジュールが持つ */
  "./gacha.html",
  "./gacha-ui.js?v=72",
  "./mb-newchars.js?v=44",
  "./xeva-devnotes.js?v=18",
  "./xeva-tour.js?v=5",   /* ★★ 2026-10-30 XEVARION ガイド（全機能の紹介・設定から／#guide） */
  "./xeva-favs.js?v=3",   /* ★★ 2026-11-03 お気に入りカード（図鑑・キャラ詳細の☆・ホーム・コミュニティ） */
  "./xeva-fav-traits.js?v=2",   /* ★★ 2026-11-05 好み診断の見た目の台帳（診断を開いたときだけ読む） */
  "./xeva-earn.js?v=2",   /* ★★ 2026-11-03 XEVA・ジェムの入手まとめ（アニメ） */
  "./xevion-os.js?v=13",
  "./xevion-os.css?v=15",
  "./magibattle-stats.js?v=21",
  "./MagiBurst/js/mb-core.js?v=147",
  /* ★ 2026-08-10 ガチャと図鑑で共通の土台・キャラ詳細・結果演出 */
  /* ★ 2026-08-12 ポータルのガチャ・図鑑も magiburst_v1 を同期するようになった */
  "./app-cloud.js?v=15",
  "./MagiBurst/magiburst-cloud.js?v=29",
  "./mb-boot.js?v=18",
  "./mb-char-detail.js?v=55",
  "./mb-char-detail.css?v=32",
  "./mb-gacha-reveal.css?v=11",
  /* ★★ 2026-10-09 ガチャの演出を1から作り直した（1体ずつ・確定演出・UR は縦長の絵） */
  "./xeva-summon.js?v=6",
  "./community.html",
  "./xeva-community.js?v=2",     // ★★ 2026-10-20 コミュニティ（PARK の入口・アニメTier）
  "./about.html",
  "./manifest.webmanifest",
  "./xeva-theme.css?v=9",
  "./xevarion.css?v=25",
  "./xevarion-home.css?v=89",
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
  "./xeva-i18n-n1.js?v=23",
  "./xeva-i18n-n2.js?v=3",
  "./xeva.js?v=87",
  "./xeva-alive.js?v=9",
  "./xeva-fx.js?v=9",
  "./xeva-loading.js?v=19",
  "./xeva-splash.js?v=22",          // ★★ 2026-10-13 XEVARION の起動画面（3社ロゴ）にも使う
  "./uwaki.html",                    // ★★ 2026-10-15 これって浮気？判定シート（ホームの PARK の真上のボタン）
  "./uwaki.js?v=1",
  "./uwaki.css?v=1",
  "./thumbs/Uwaki.jpg",
  "./xevarion.js?v=115",
  "./xevarion-home.js?v=184",
  /* ★★ 2026-09-24 ホームのロビーとパートナー。素材は home-mate/<id>/（?v= は home-mate.js の HM_VER）・笙古／瞳／舞香／衣織／樹愛羅／映美里（09-25 ボイス廃止・表情は webp） */
  "./gacha-live.js?v=14",
  "./home-mate.js?v=36",
  "./xeva-jef.js?v=1", "./xeva-jef.css?v=2", "./jef/stadium.svg?v=1",   /* ★★ 2026-11-08 ジェフ千葉のホームデザイン */
  /* ★★ 2026-10-26 完凸ロビー（ヒサコ・アリス）と、バナーの上のドット絵のキャラ（絵は MagiAbyss の ma-pixel.js） */
  "./home-lobby.js?v=7",
  "./home-dot.js?v=6",
  "./MagiAbyss/js/ma-pixel.js?v=12",
  "./home-mate/lobby/hisako.webp?v=1",
  "./home-mate/lobby/alice.webp?v=1",
  "./home-mate/lobby/haru.webp?v=1",    /* ★★ 2026-10-30 超極彩祭のハル・チカの完凸ロビー */
  "./home-mate/lobby/chika.webp?v=1",
  "./home-mate/lobby/chifuru.webp?v=1",  /* ★★ 2026-11-03 超極彩祭のチフル・ミント・プリカの完凸ロビー */
  "./home-mate/lobby/mint.webp?v=1",
  "./home-mate/lobby/purika.webp?v=1",
  "./home-mate/lobby/kohaku.webp?v=1",  /* ★★ 2026-10-31 完凸ロビーに コハク・ユナ・アイナ・ヨシノ */
  "./home-mate/lobby/yuna.webp?v=2",   /* ★★ 2026-11-10 ユナ・アイナの新しい立ち絵 */
  "./home-mate/lobby/aina.webp?v=2",
  "./home-mate/lobby/chie.webp?v=1",
  "./home-mate/lobby/mako.webp?v=1", "./home-mate/lobby/ako.webp?v=1", "./home-mate/lobby/mina.webp?v=1",   /* ★★ 2026-11-10 ROYAL DEBUT・超極華祭の完凸ロビー */
  "./home-mate/lobby/ena.webp?v=1", "./home-mate/lobby/mimi.webp?v=1",
  "./home-mate/lobby/park.webp?v=1",
  "./xeva-prefetch.js?v=1",     // ★★ 2026-10-24 MagiDerby・MagiScope の先読み
  "./xeva-event-ui.js?v=4",
  "./home-mate.css?v=26",
  "./xeva-pop.css?v=1",
  "./xeva-pop-pages.css?v=3",
  "./xeva-uma.css?v=2",
  "./xeva-uma2.css?v=1",   /* ★★ 2026-10-27 ウマ娘のホーム画面の配色 */
  "./xeva-tabbar.js?v=8",          // ★★ 2026-10-13 ガチャ・コミュニティ・図鑑にも下バー
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
  "./xeva-keys.js?v=36",
  /* ★★ 2026-10-01 同期のモジュールも入れる（前は実行時キャッシュだけ＝更新直後のオフラインで読めなかった） */
  "./xeva-cloud.js?v=51",
  "./xevarion-fb.js?v=37",
  "./xeva-sync.js?v=19",
  "./xeva-presence.js?v=9",
  /* ★ 2026-08-20 通信設定（Wi-Fi／モバイルデータごとの動き）。
     この SW へ設定を送る側なので、オフラインでも読めるようにここに入れておく。 */
  "./xeva-netmode.js?v=11",
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
  "./thumbs/MagiBattle.jpg?v=4",   /* ★★ 2026-10-30 新しいロゴ（ご指定） */
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
  "./thumbs/MagiQuiz.jpg?v=2",   /* ★★ 2026-10-23 新作 MagiQuiz */
  "./thumbs/MagiMarket.jpg?v=2",       /* ★★ 2026-11-08 新作 MagiMarket（XEVA 運用） */
  "./thumbs/MagiAbyss.jpg?v=2",   // ★★ 2026-10-05 新作 MagiAbyss
  "./thumbs/NGX.jpg?v=2",         // ★★ 2026-10-31 NGX のアイコン（オフラインでも出るように）
  "./thumbs/ISHIDA.webp?v=2",      // ★★ 2026-10-09b ISHIDA のアイコン（小さい正方形）
  "./MagiDerby/js/md-data.js?v=4", "./MagiDerby/js/md-intro.js?v=2",   // ★★ 2026-10-28 ホームの GⅠ 発売開始の告知（home-mate.js の derbyAnn）
  "./brand/NGX_s.webp?v=2", "./brand/MagicalFuture_s.webp?v=2", "./brand/ISHIDA_s.webp?v=2", "./brand/YRA_s.webp", "./brand/Kawagani_s.webp", "./brand/StudioDOGA_s.webp",   // ★★ 2026-10-09b 起動画面の3社ロゴ（小さい版）
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
  "./MagiAbyss/js/ma-data.js?v=14",
  "./MagiAbyss/js/ma-stats.js?v=2",
  "./thumbs/MagiMusic.jpg",
  "./thumbs/MagiFocus.jpg",
  "./thumbs/MagiPortfolio.jpg",
  "./thumbs/MagiEmpire.jpg",
  "./thumbs/MagiTier.jpg",
  "./thumbs/Ordyxis.jpg",
  "./thumbs/MagicalFuture.jpg?v=2",
  "./thumbs/xevarion-home_s.jpg?v=13",   /* ★★ 2026-10-30 新しいタイトル画面（ご指定） */
  /* ★★ 2026-09-06 同期の画面に出る案内役（立ち姿とお辞儀・2人ぶん）。 */
  "./img/ld_a_stand.webp",
  "./img/ld_a_bow.webp",
  "./img/ld_b_stand.webp",
  "./img/ld_b_bow.webp",
] };
