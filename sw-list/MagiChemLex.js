/* ============================================================
   MagiChemLex — Service Worker が控えるファイルの一覧（sw-list/MagiChemLex.js）
   ★★ 2026-11-12 MagiChemLex/sw.js から、版（v）と一覧（core）だけをここへ移した
   ------------------------------------------------------------
   ・v    … 置き場の名前（版）。core のファイルが1つでも変わったら、最後の数字を +1 する
             （上げ忘れは make-update.py が見つけて自動で +1 する）
   ・core … オフライン用に先に取りこむファイル。パスは MagiChemLex/sw.js から見た相対パスのまま
   ・MagiChemLex/sw.js がこのファイルを importScripts で読む（しくみは sw-list/_shared.js の説明）
   ============================================================ */
self.XEV_SW = { v: "magichemlex-sw-v28", core: [
  "./index.html",
  "./manifest.webmanifest",
  "./css/mcl.css?v=20",
  "./js/mcl-data.js?v=5",
  "./js/mcl-data2.js?v=4",
  "./js/mcl-data3.js?v=2",
  "./js/mcl-data4.js?v=2",
  "./js/mcl-data5.js?v=2",
  "./js/mcl-data6.js?v=1",
  "./js/mcl-data7.js?v=1",
  "./js/mcl-data8.js?v=2",
  "./js/mcl-data9.js?v=2",
  "./js/mcl-data10.js?v=1",
  "./js/mcl-data11.js?v=1",
  "./js/mcl-data12.js?v=1",
  "./js/mcl-core.js?v=15",
  "./js/mcl-fig.js?v=5",
  "./js/mcl-fig2.js?v=1",
  "./js/mcl-fig3.js?v=1",
  "./js/mcl-fig4.js?v=1",
  "./js/mcl-fig5.js?v=2",
  "./js/mcl-ui.js?v=22",
  "./js/mcl-flash.js?v=3",      // ★★ 2026-10-15 フラッシュカード
  "./js/mcl-book.js?v=1",       // ★★ 2026-10-27 模試の冊子
  "./js/mcl-special.js?v=1",    // ★★ 2026-10-15 特設予想問題
  "./js/mcl-bingo.js?v=3",      // ★★ 2026-10-28 ビンゴカード
  "./js/mcl-route.js?v=1",      // ★★ 2026-11-13 ケミカル・ルート（反応経路スコアアタック）
  "./js/mcl-guide.js?v=2",      // ★★ 2026-10-31 XEVA のもらい方（動きで見るガイド）
  "../xeva-tour.js?v=5",
  "../gem.png",
  "./img/icon_192.png?v=2",
  "./img/apple-touch-icon.png?v=2",
  "../thumbs/MagiChemLex.jpg?v=2",
  "../XEVA.png",
  "../events/violet_breeze_s.webp",
  "../events/midnight_pumpkin_s.webp",   // ★★ 2026-10-20 Midnight Pumpkin（予告）
  "./img/wp.webp",                        // ★★ 2026-10-20 Wisdom Point
  "./img/wp@2x.webp",
  "../img/t_Miki.webp", "../img/Miki.webp",   // ★★ 2026-10-24 WP 交換所のミキ（UR）
  /* XEVARION の共通部品 */
  "../xeva.js?v=87",
  "../xeva-loading.js?v=19",
  "../xeva-splash.js?v=22",
  "../xeva-safebottom.js?v=12",
  "../xeva-back.js?v=9",
  "../xeva-presence.js?v=9",
  "../maintenance-gate.js?v=13",
  "../xeva-cloud.js?v=51",
  "../MagiBurst/magiburst-cloud.js?v=29",
  "../app-cloud.js?v=15",
  "../xeva-keys.js?v=36",
  "../xevarion-fb.js?v=37",
] };
