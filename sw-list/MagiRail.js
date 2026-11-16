/* ============================================================
   MagiRail — Service Worker が控えるファイルの一覧（sw-list/MagiRail.js）
   ★★ 2026-11-12 MagiRail/sw.js から、版（v）と一覧（core）だけをここへ移した
   ------------------------------------------------------------
   ・v    … 置き場の名前（版）。core のファイルが1つでも変わったら、最後の数字を +1 する
             （上げ忘れは make-update.py が見つけて自動で +1 する）
   ・core … オフライン用に先に取りこむファイル。パスは MagiRail/sw.js から見た相対パスのまま
   ・MagiRail/sw.js がこのファイルを importScripts で読む（しくみは sw-list/_shared.js の説明）
   ============================================================ */
self.XEV_SW = { v: "magirail-sw-v19", core: [
  "./index.html",
  "./css/rail.css?v=3",
  "./js/rail-core.js?v=2",
  "./js/rail-chart.js?v=1",
  "./js/rail-ui.js?v=3",
  "./img/title.jpg",
  "./img/icon192.png",
  "./manifest.webmanifest",
  "../xeva-splash.js?v=22",
  "../xeva-safebottom.js?v=12",
  "../maintenance-gate.js?v=13",
  "../thumbs/MagiRail.jpg",
  /* ★★ 2026-11-17 オフラインで足りなかったもの（ご報告「XEVARION でオフラインでできないことがある」）：ページが読むのに一覧に無かった共通の部品・起動画面のロゴ。ほかのアプリの置き場にあっても、このアプリの SW は自分の置き場しか見ていなかった */
  "../brand/ISHIDA_s.webp?v=2", "../brand/Kawagani_s.webp", "../brand/MagicalFuture_s.webp?v=2", "../brand/NGX_s.webp?v=2", "../brand/StudioDOGA_s.webp", "../brand/YRA_s.webp",
] };
