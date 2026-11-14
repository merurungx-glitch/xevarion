/* ============================================================
   MagiBurst — Service Worker が控えるファイルの一覧（sw-list/MagiBurst.js）
   ★★ 2026-11-12 MagiBurst/sw.js から、版（v）と一覧（core）だけをここへ移した
   ------------------------------------------------------------
   ・v    … 置き場の名前（版）。core のファイルが1つでも変わったら、最後の数字を +1 する
             （上げ忘れは make-update.py が見つけて自動で +1 する）
   ・core … オフライン用に先に取りこむファイル。パスは MagiBurst/sw.js から見た相対パスのまま
   ・MagiBurst/sw.js がこのファイルを importScripts で読む（しくみは sw-list/_shared.js の説明）
   ============================================================ */
self.XEV_SW = { v: "magiburst-sw-v209", core: [
  "./index.html",
  "./css/mb-ui2.css?v=26",
  "./css/localplay.css?v=7",
  "./js/localplay.js?v=8",
  "./js/mb-core.js?v=147",
  /* ★★ 2026-09-13 クエスト作成（ステージエディター・MB613Create26）。
     遅延読みこみだが、オフラインでも開けるようにここには入れておく。 */
  "./js/mb-create.js?v=2",
  "./js/mb-create-ui.js?v=2",
  "./js/mb-create-test.js?v=2",
  "./css/mb-create.css?v=2",   /* ★ 2026-08-10 キャラ・ガチャの共有モジュール（XEVARION のガチャと共通） */
  /* ★★ 2026-09-06 装備（頭・腕・胸・足）。ここに載せないとオフラインで丸ごと動かない。 */
  "./js/mb-gear.js?v=8",
  /* ★★ 2026-09-01 ローカル通信マルチ。<b>オフラインで使うもの</b>なので、
     ここに載せておかないと「オフラインのときだけ動かない」ことになる。 */
  "./js/local.js?v=12",
  /* ★★ 2026-09-03 ローカル通信の QR コード（自前・外部ライブラリなし） */
  "../xeva-qr.js?v=9",
  "../xeva-i18n.js?v=8",
  "../xeva-i18n-dict.js?v=12",
  "../xeva-i18n-mb1.js?v=7",
  "../xeva-i18n-mb2.js?v=7",
  "../xeva-i18n-mb3.js?v=8",
  "../xeva-i18n-mb4.js?v=9",
  "../xeva-i18n-mb5.js?v=7",
  "../xeva-i18n-p1.js?v=7",
  "../xeva-i18n-p2.js?v=6",
  "../xeva-i18n-mb6.js?v=7",
  "../xeva-i18n-p3.js?v=7",
  "../xeva-i18n-mb7.js?v=7",
  "../xeva-i18n-p4.js?v=8",
  "../xeva-i18n-n1.js?v=23",
  "../xeva-i18n-n2.js?v=3",
  "../xeva.js?v=87",
  "../xeva-alive.js?v=9",
  "../xeva-loading.js?v=19",
  "../xeva-splash.js?v=22",
  "../app-cloud.js?v=15",
  "../xeva-keys.js?v=36",
  "./magiburst-cloud.js?v=29",
  "../maintenance-gate.js?v=13",
  "../app-install-notice.js?v=9",
  "../XEVA.png",
  "../gem.png",
  /* ★ 2026-08-24 スタミナの絵（ヘッダーの⚡札） */
  "../stamina.png",
  /* BGM は権利確認のため一時提供停止中 → 先読みしない */
  "../thumbs/MagiBurst.jpg",
  "../brand/NGX_s.webp?v=2",
  "../brand/MagicalFuture_s.webp?v=2",
  "../brand/ISHIDA_s.webp?v=2",
  "../brand/YRA_s.webp",
  "../brand/Kawagani_s.webp", "../brand/StudioDOGA_s.webp",   // ★★ 2026-11-02 運営協力に参入
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
  /* ★ 2026-08-05 プレミアム新SSR「ロゼリア」「シズカ」 */
  "../img/Roselia.webp",
  "../img/t_Roselia.webp",
  "../img/Shizuka.webp",
  "../img/t_Shizuka.webp",
  /* ★ 2026-08-05 プレミアム新SSR「ネム」 */
  "../img/Nemu.webp",
  "../img/t_Nemu.webp",
  /* ★ 2026-08-06 プレミアム新SSR「ユリア」「アルティア」「リアナ」 */
  "../img/Yuria.webp",
  "../img/t_Yuria.webp",
  "../img/Altia.webp",
  "../img/t_Altia.webp",
  "../img/Liana.webp",
  "../img/t_Liana.webp",
  /* ★ 2026-08-07 Phantom Legend Fest「野獣先輩」 */
  "../img/Yaju.webp",
  "../img/t_Yaju.webp",
  /* ★ 2026-08-07 プレミアム新SSR「イオリ」「ノエル」「ユキノ」「レイカ」 */
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
  /* ★ 2026-08-08c プレミアム新SSR「コトネ」「ラン」「セリス」 */
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
  "img/ss/AkatsukiSS.webp",   /* ★★ 2026-09-17d 花宴祭 アカツキ（治癒の祈り）用 */
  "img/ss/AyaneSS.webp",      /* ★★ 2026-09-19 花宴祭 アヤネ（治癒の祈り）用 */
  "img/ss/ChihaSS.webp",      /* ★★ 2026-09-19 花宴祭 チハ（治癒の祈り）用 */
  "img/ss/HimeriSS.webp",     /* ★★ 2026-09-19e 花宴祭 ヒメリ（治癒の祈り）用 */
  "img/ss/HonokaSS.webp",     /* ★★ 2026-09-19e 花宴祭 ホノカ（治癒の祈り）用 */
  /* ★★ 2026-09-23 CRYSTAL ACADEMY FEST（神癒の祈り）用 */
  "img/ss/KurehaSS.webp",
  "img/ss/MikotoSS.webp",
  "img/ss/MeiSS.webp",
  "img/ss/HikaruSS.webp",
  "img/ss/MidukiSS.webp",
  "img/ss/TakinaSS.webp",     /* ★★ 2026-10-03 極彩祭 タキナ（治癒の祈り）用 */
  "img/ss/HibanaSS.webp",     /* ★★ 2026-10-07 Sapphire Breeze ヒバナ（治癒の祈り）用 */
  "img/ss/FukiSS.webp",       /* ★★ 2026-10-07 Sapphire Breeze フキ（治癒の祈り）用 */
  /* ★★ 2026-10-09 Pumpkin Night の10体（治癒の祈り・ガチャの UR 演出）用 */
  "img/ss/AyanoSS.webp",
  "img/ss/SakiSS.webp",
  "img/ss/YukaSS.webp",
  "img/ss/NatsumiSS.webp",
  "img/ss/MiuSS.webp",
  "img/ss/MaiSS.webp",
  "img/ss/ChinatsuSS.webp",
  "img/ss/YuumiSS.webp",
  "img/ss/RinaSS.webp",
  "img/ss/KaoriSS.webp",
  /* ★★ 2026-10-16 超極華祭（UR・MagiAbyss 専用）の SS 絵 */
  "img/ss/ChieSS.webp", "img/ss/IchikaSS.webp", "img/ss/NonokaSS.webp", "img/ss/AinaSS.webp", "img/ss/YunaSS.webp",
  /* ★★ 2026-10-22 超極煌祭（UR・MagiAbyss 専用）の SS 絵 */
  "img/ss/KohakuSS.webp", "img/ss/SuzuSS.webp", "img/ss/ShoukoSS.webp",
  /* ★★ 2026-10-24 ヒサコ・アリス・ミキ（UR・MagiAbyss 専用）の SS 絵 */
  "img/ss/HisakoSS.webp", "img/ss/AliceSS.webp", "img/ss/MikiSS.webp",
  /* ★★ 2026-10-30 超極彩祭（UR）の SS 絵 */
  "img/ss/HaruSS.webp", "img/ss/ChikaSS.webp",
  /* ★★ 2026-11-03 超極彩祭の追加3体 */
  "img/ss/ChifuruSS.webp", "img/ss/MintSS.webp", "img/ss/PurikaSS.webp",
  "img/ss/EnaSS.webp", "img/ss/MimiSS.webp", "img/ss/MakoSS.webp", "img/ss/AkoSS.webp", "img/ss/MinaSS.webp",   /* ★★ 2026-11-10 エナ・ミミ・マコ・アコ・ミナ */
  "img/ss/YajuSS.webp",   /* ★ 2026-08-08d クロススキル「お待たせ!」用 */
  "img/ss/KokonaAlphaSS.webp",   /* ★ 2026-08-11 ココナα（治癒の祈り）用 */
  /* ★ 2026-08-08 プレミアム新SSR「カエデ」「リノン」「ココロ」「アンジェ」 */
  "../img/Kaede.webp",
  "../img/t_Kaede.webp",
  "../img/Rinon.webp",
  "../img/t_Rinon.webp",
  "../img/Kokoro.webp",
  "../img/t_Kokoro.webp",
  "../img/Ange.webp",
  "../img/t_Ange.webp",
  /* ★ 2026-08-08 プレミアム新SSR「ナナミ」「チトセ」 */
  "../img/Nanami.webp",
  "../img/t_Nanami.webp",
  "../img/Chitose.webp",
  "../img/t_Chitose.webp",
  /* ★ v16 プレミアム新SSR 6体 */
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
  /* ★ v14.5 プレミアム新SSR クロエ */
  "../img/t_Chloe.webp",
  /* ★ v15 Luminous Summer Fest */
  "img/bn_fes2_s.webp",
  "../img/t_KaguyaAlpha.webp",
  "../img/t_MionAlpha.webp",
  /* ★ 2026-08-11 Luminous Summer Fest 追加2体 */
  "../img/t_CherylAlpha.webp",
  "../img/t_KokonaAlpha.webp",
  /* ★ 2026-08-11 プレミアムSSR 3体 */
  "../img/t_Shizuku.webp",
  "../img/t_Yuunagi.webp",
  "../img/t_Izumi.webp",
  /* ★ 2026-08-12 蒼夏祭（Aoka Summer Fest）限定SSR 6体 */
  "img/bn_fes4_s.webp",
  "../img/t_Fuka.webp",
  "../img/t_Tsumugi.webp",
  "../img/t_Suzuka.webp",
  "../img/t_Karem.webp",
  "../img/t_Mayu.webp",
  "../img/t_Chizuru.webp",
  /* ★ 2026-08-16c セイラ以降のキャラのサムネ。
     ここに足し忘れると、そのキャラだけオフラインで絵が出ない
     （更新パッケージの一覧＝update.json にも載らない）。 */
  "../img/t_Seira.webp",
  "../img/t_Anna.webp",
  "../img/t_Tsukino.webp",
  "../img/t_Moeka.webp",
  "../img/t_Suzuha.webp",
  "../img/t_Violet.webp",
  "../img/t_Kanata.webp",
  "../img/t_Touka.webp",
  "../img/t_Elena.webp",
  "../img/t_Grace.webp",
  "../img/t_Youka.webp",
  "../img/t_Youhi.webp",
  /* ★ 2026-08-18 プレミアムSSR 8体（No.119〜126）＋ ロキシー（No.127） */
  "../img/t_Artemia.webp",
  "../img/t_Asuha.webp",
  "../img/t_Blair.webp",
  "../img/t_Lilith.webp",
  "../img/t_Lyra.webp",
  "../img/t_Satsuki.webp",
  "../img/t_Sayo.webp",
  "../img/t_Melty.webp",
  "../img/t_Roxy.webp",
  /* ★ 2026-08-20 GRAND DEBUT GACHA 新SSR 5体（No.128〜132）とそのバナー。
     ここに足し忘れると、そのキャラだけオフラインで絵が出ない
     （更新パッケージの一覧＝update.json にも載らない）。 */
  "img/bn_debut_s.webp",
  "../img/t_Mirelle.webp",
  "../img/t_Scarlet.webp",
  "../img/t_Koyuki.webp",
  "../img/t_Amelia.webp",
  "../img/t_Mio.webp",
  /* ★★ 2026-08-22 Starlight Academy Fest 限定SSR 5体（No.133〜137）とそのバナー。
     ここに足し忘れると、そのキャラだけオフラインで絵が出ない
     （更新パッケージの一覧＝update.json にも載らない）。 */
  "img/bn_fes5_s.webp",
  "../img/t_Otoha.webp",
  "../img/t_Sayaka.webp",
  "../img/t_Sayuri.webp",
  "../img/t_Akari.webp",
  "../img/t_Hinata.webp",
  /* ★★ 2026-08-24 GRAND DEBUT GACHA Ver.2.0 新SSR 5体（No.138〜142）。
     ここに足し忘れると、そのキャラだけオフラインで絵が出ない
     （更新パッケージの一覧＝update.json にも載らない）。 */
  "../img/t_Guren.webp",
  "../img/t_Yuuna.webp",
  "../img/t_Momo.webp",
  "../img/t_Chihaya.webp",
  "../img/t_Yui.webp",
  /* ★★ 2026-08-25 Starlight Academy Fest 2 限定SSR 5体（No.143〜147）とそのバナー。
     ここに足し忘れると、そのキャラだけオフラインで絵が出ない
     （更新パッケージの一覧＝update.json にも載らない）。 */
  "img/bn_fes6_s.webp",
  /* ★★ 2026-08-27 極彩祭・極煌祭のバナー */
  "img/bn_fes7_s.webp",
  "img/bn_fes8_s.webp",
  /* ★★ 2026-08-28 極華祭・Cozy Haven FEST・Festival Archive GACHA のバナー */
  "img/bn_fes9_s.webp",
  "img/bn_fes10_s.webp",
  "img/bn_archive_s.webp",
  /* ★★ 2026-08-29 戦姫祭のバナー */
  "img/bn_fes11_s.webp",
  "img/bn_fes12_s.webp",   /* ★★ 2026-09-01 RISING STAR FEST のバナー */
  "img/bn_fes13_s.webp",
  "img/bn_fes15_s.webp",   /* ★★ 2026-09-17d 花宴祭のバナー */
  "img/bn_fes16_s.webp",   /* ★★ 2026-09-23 CRYSTAL ACADEMY FEST のバナー */
  "img/bn_fes17_s.webp?v=2",   /* ★★ 2026-10-07 Sapphire Breeze のバナー（同日に差しかえ → ?v=2） */
  "img/bn_fes18_s.webp",   /* ★★ 2026-10-09 Pumpkin Night のバナー */
  "img/bn_fes19_s.webp?v=2",   /* ★★ 2026-10-16 超極華祭のバナー（★★ 2026-11-10 新しいバナー＝?v=2） */
  "img/bn_royal_s.webp",   /* ★★ 2026-11-10 ROYAL DEBUT GACHA のバナー */
  "img/bn_fes20_s.webp?v=2",   /* ★★ 2026-10-22 超極煌祭のバナー（★★ 2026-10-30 新しい絵に差しかえ） */
  "img/bn_fes21_s.webp",   /* ★★ 2026-10-30 超極彩祭のバナー */
  "img/bn_fes14_s.webp",   /* ★★ 2026-09-13 SOFT NIGHT FEST のバナー */   /* ★★ 2026-09-11 BUNNY GIRL FEST のバナー */
  "../img/t_Suzune.webp",
  "../img/t_Minamo.webp",
  /* ★★ 2026-08-26 GRAND DEBUT Ver.3.0 の5体 ＋ MagiLex の KP交換キャラ4体。
     ここに無いとオフラインでその子だけ絵が出ず、update.json にも載らない。 */
  "../img/t_Karin.webp",
  "../img/t_Mirei.webp",
  "../img/t_Yuuka.webp",
  "../img/t_Miyabi.webp",
  "../img/t_Sumire.webp",
  "../img/t_Kanade.webp",
  "../img/t_Homura.webp",
  "../img/t_Yoizuki.webp",
  "../img/t_Sumika.webp",
  /* ★★ 2026-08-26b GRAND DEBUT Ver.4.0 の5体 */
  "../img/t_Seina.webp",
  "../img/t_Shiduki.webp",
  "../img/t_Sayuki.webp",
  "../img/t_Sara.webp",
  "../img/t_Sakuya.webp",
  /* ★★ 2026-08-27 極彩祭・極煌祭の2体。ここに無いとオフラインで絵が出ず、
     update.json のダウンロード量にも載らない。 */
  "../img/t_Hinano.webp",
  "../img/t_Mutsumi.webp",
  /* ★★ 2026-08-28 GRAND DEBUT Ver.5.0 の5体／Cozy Haven FEST の5体／極華祭のコトリ。
     ここに無いとオフラインでその子だけ絵が出ず、update.json にも載らない。 */
  "../img/t_Yuika.webp",
  "../img/t_Misuzu.webp",
  "../img/t_Kazane.webp",
  "../img/t_Kokoa.webp",
  "../img/t_Nodoka.webp",
  "../img/t_Yua.webp",
  "../img/t_Shiori.webp",
  "../img/t_Rena.webp",
  "../img/t_Ryouka.webp",
  "../img/t_Miko.webp",
  "../img/t_Kotori.webp",
  /* ★★ 2026-08-29 極煌祭のレイナ／戦姫祭の6体。
     ★ ここに無いとオフラインでその子だけ絵が出ず、update.json にも載らない
       （セイラ以降の9体が丸ごと抜けていたのと同じ落とし穴）。
     ★ ラン／ユウカ／アンナは<b>別ファイル名</b>（RanS / YuukaS / AnnaS）。 */
  "../img/t_Reina.webp",
  "../img/t_RanS.webp",
  "../img/t_Kurenai.webp",
  "../img/t_Yuki.webp",
  "../img/t_Marika.webp",
  "../img/t_YuukaS.webp",
  "../img/t_AnnaS.webp",
  /* ★★ 2026-08-30 戦姫祭 アンナ(祭)／GRAND DEBUT Ver.6.0 の5体。
     ★ ここに無いとオフラインでその子だけ絵が出ず、update.json にも載らない。 */
  "../img/t_AnnaM.webp",
  "../img/t_Chia.webp",
  "../img/t_Risa.webp",
  "../img/t_Rin.webp",
  "../img/t_Minori.webp",
  "../img/t_Seika.webp",
  /* ★★ 2026-09-01 RISING STAR FEST の4体。
     ★ ここに無いとオフラインでその子だけ絵が出ず、update.json にも載らない。 */
  "../img/t_Riona.webp",
  "../img/t_MireiR.webp",
  "../img/t_SuzuhaR.webp",
  "../img/t_SeiraK.webp",
  "../img/t_Hanon.webp",
  /* ★★ 2026-09-03 RISING STAR FEST 第2弾 4体。
     ★ ここに無いとオフラインで<b>その子だけ絵が出ない</b>し、update.json にも載らない。 */
  "../img/t_Shizuru.webp",
  "../img/t_Yuuri.webp",
  "../img/t_Hisui.webp",
  "../img/t_Raika.webp",   /* ★★ 2026-09-01 極彩祭 ハノン */
  /* ★★ 2026-09-06 今回の14体。
     ★ ここに無いとオフラインで<b>その子だけ絵が出ない</b>し、update.json にも載らない。 */
  "../img/t_ReiS.webp",
  "../img/t_Rika.webp",
  "../img/t_AnnaRan.webp",
  "../img/t_Yoiduki.webp",
  "../img/t_Kayo.webp",
  "../img/t_Shino.webp",
  "../img/t_Maaya.webp",
  "../img/t_Asuka.webp",
  "../img/t_RenaD.webp",
  "../img/t_Kaoru.webp",
  "../img/t_Subaru.webp",
  "../img/t_Kasumi.webp",
  "../img/t_TsukinoD.webp",
  "../img/t_AstraeaC.webp",
  /* ★★ 2026-09-07 戦姫祭 第2弾（ナオ・ハルカ）。
     ★ ここに無いとオフラインで<b>その子だけ絵が出ない</b>し、update.json にも載らない。 */
  "../img/t_NaoS.webp",
  "../img/t_HarukaS.webp",
  /* ★★ 2026-09-08 戦姫祭 第3弾（レイア・ミオリ・アンナ(メイド)）。
     ★ ここに無いとオフラインで<b>その子だけ絵が出ない</b>し、update.json にも載らない。 */
  "../img/t_Reia.webp",
  "../img/t_Miori.webp",
  "../img/t_AnnaMaid.webp",
  /* ★★ 2026-09-11 BUNNY GIRL FEST 15体 ＋ 極華祭 カグラ。
     ★ ここに無いとオフラインで<b>その子だけ絵が出ない</b>し、update.json にも載らない。 */
  "../img/t_Saya.webp",
  "../img/t_AoiKuroha.webp",
  "../img/t_Narumi.webp",
  "../img/t_Ayame.webp",
  "../img/t_Misaki.webp",
  "../img/t_Kyoka.webp",
  "../img/t_Haduki.webp",
  "../img/t_Hikari.webp",
  "../img/t_Ruri.webp",
  "../img/t_Nagisa.webp",
  "../img/t_Hiyori.webp",
  "../img/t_Erika.webp",
  "../img/t_Momoka.webp",
  "../img/t_Miyuki.webp",
  "../img/t_Natsume.webp",
  "../img/t_Kagura.webp",
  /* ★★ 2026-09-13 SOFT NIGHT FEST 5体。ここに無いと
     オフラインでその子だけ絵が出ず、update.json にも載らない。 */
  "../img/t_AnnaAlpha.webp",
  "../img/t_AsuhaAlpha.webp",
  "../img/t_RanAlpha.webp",
  "../img/t_SayakaAlpha.webp",
  "../img/t_KotoriAlpha.webp",
  /* ★★ 2026-09-13 BUNNY GIRL FEST 追加2体 */
  "../img/t_Kana.webp",
  "../img/t_Maki.webp",
  /* ★★ 2026-09-13 極華祭 クミコ＆レイナ */
  "../img/t_KumikoReina.webp",
  /* ★★ 2026-09-13 GRAND DEBUT GACHA Ver.8.0 5体 */
  "../img/t_Miya.webp",
  "../img/t_Emika.webp",
  "../img/t_Uta.webp",
  "../img/t_Shiho.webp",
  "../img/t_Kiduki.webp",
  "../img/t_Kuon.webp",
  "../img/t_Asahi.webp",
  "../img/t_Sougetsu.webp",
  "../img/t_Natsune.webp",
  "../img/t_Amane.webp",
  /* ★★ 2026-09-17d 花宴祭 */
  "../img/t_Akatsuki.webp",
  /* ★★ 2026-09-19 花宴祭 追加 */
  "../img/t_Ayane.webp",
  "../img/t_Chiha.webp",
  "../img/t_Himeri.webp",
  "../img/t_Honoka.webp",
  "../img/t_Azusa.webp",
  "../img/t_Kokoha.webp",
  /* ★★ 2026-09-23 CRYSTAL ACADEMY FEST */
  "../img/t_Kureha.webp",
  "../img/t_Mikoto.webp",
  "../img/t_Mei.webp",
  "../img/t_Hikaru.webp",
  "../img/t_Miduki.webp",
  /* ★★ 2026-10-03 極彩祭 タキナ */
  "../img/t_Takina.webp",
  /* ★★ 2026-10-06 UR のキャラ詳細は横長の絵（wide）。ここに無いとオフラインで詳細の絵が出ない */
  "../img/Takina_w3.webp",
  /* ★★ 2026-10-07 Sapphire Breeze ヒバナ・フキ（UR の横長の絵も） */
  "../img/t_Hibana.webp", "../img/Hibana_w.webp",
  "../img/t_Fuki.webp", "../img/Fuki_w.webp",
  /* ★★ 2026-10-09 Pumpkin Night の10体（サムネ＋UR の横長の絵） */
  "../img/t_Ayano.webp", "../img/Ayano_w.webp",
  "../img/t_Saki.webp", "../img/Saki_w.webp",
  "../img/t_Yuka.webp", "../img/Yuka_w.webp",
  "../img/t_Natsumi.webp", "../img/Natsumi_w.webp",
  "../img/t_Miu.webp", "../img/Miu_w.webp",
  "../img/t_Mai.webp", "../img/Mai_w.webp",
  "../img/t_Chinatsu.webp", "../img/Chinatsu_w.webp",
  "../img/t_Yuumi.webp", "../img/Yuumi_w.webp",
  "../img/t_Rina.webp", "../img/Rina_w.webp",
  "../img/t_Kaori.webp", "../img/Kaori_w.webp",
  /* ★★ 2026-10-16 超極華祭 */
  "../img/t_Chie.webp", "../img/Chie_w.webp", "../img/t_Ichika.webp", "../img/Ichika_w.webp", "../img/t_Nonoka.webp", "../img/Nonoka_w.webp",
  "../img/t_Aina.webp", "../img/Aina_w.webp", "../img/t_Yuna.webp", "../img/Yuna_w.webp",
  /* ★★ 2026-10-22 超極煌祭 */
  "../img/t_Kohaku.webp", "../img/Kohaku_w.webp", "../img/t_Suzu.webp", "../img/Suzu_w.webp", "../img/t_Shouko.webp", "../img/Shouko_w.webp",
  /* ★★ 2026-10-24 ヒサコ・アリス・ミキ */
  "../img/t_Hisako.webp", "../img/Hisako_w.webp", "../img/t_Alice.webp", "../img/Alice_w.webp", "../img/t_Miki.webp", "../img/Miki_w.webp",
  /* ★★ 2026-10-30 超極彩祭 */
  "../img/t_Haru.webp", "../img/Haru_w.webp", "../img/t_Chika.webp", "../img/Chika_w.webp",
  /* ★★ 2026-11-03 超極彩祭の追加3体 */
  "../img/t_Chifuru.webp", "../img/Chifuru_w.webp", "../img/t_Mint.webp", "../img/Mint_w.webp", "../img/t_Purika.webp", "../img/Purika_w.webp",
  "../img/t_Ena.webp", "../img/Ena_w.webp", "../img/t_Mimi.webp", "../img/Mimi_w.webp", "../img/t_Mako.webp", "../img/Mako_w.webp", "../img/t_Ako.webp", "../img/Ako_w.webp", "../img/t_Mina.webp", "../img/Mina_w.webp",   /* ★★ 2026-11-10 */
  /* ★★ 2026-09-06 同期の画面に出る案内役（立ち姿とお辞儀・2人ぶん）。
     ここに無いとオフラインのときだけ絵が出ない。 */
  "../img/ld_a_stand.webp",
  "../img/ld_a_bow.webp",
  "../img/ld_b_stand.webp",
  "../img/ld_b_bow.webp",
  /* ★★ 2026-09-06 装備（頭・腕・胸・足）。天界の審判の 5WAVE ごとに落ちる。 */
  "./img/eq_head.webp",
  "./img/eq_arm.webp",
  "./img/eq_body.webp",
  "./img/eq_leg.webp",
  "./img/eq_head_s.webp",
  "./img/eq_arm_s.webp",
  "./img/eq_body_s.webp",
  "./img/eq_leg_s.webp",
  /* ★★ 2026-09-06b フルバーストの額（ご提示の絵から作った。まんなかは透明に抜いてある） */
  "./img/fbframe_v.webp",
  "./img/fbframe_h.webp",
  "./img/fullburst-logo.webp",
  /* ★★ 2026-08-30 💠結晶のアイコン（ガチャ結果・交換所で使う） */
  "../img/cryst.webp",
  "../img/t_Karen.webp",
  "../img/t_Tomoe.webp",
  "../img/t_Himari.webp",
  "./img/e_Youka.webp",
  "./img/e_Youhi.webp",
  "./img/e_Astraea.webp",
  "../img/t_Astraea.webp",
  "./img/bn_judge_s.webp",
  "./img/backjudge_s.webp",
  "./img/bn_hourai_s.webp",
  "./img/backhourai_s.webp",
  "./img/backtenkyu_s.webp",
  "img/ss/MayuSS.webp",       /* 治癒の祈りのカットイン用 */
  "img/ss/ChizuruSS.webp",
  /* ★ 2026-08-12 サマーキャンペーン（初クリア💎2倍）の専用バナー */
  "img/bn_summer_s.webp",
] };
