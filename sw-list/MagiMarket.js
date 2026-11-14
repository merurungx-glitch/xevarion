/* ============================================================
   MagiMarket — Service Worker が控えるファイルの一覧（sw-list/MagiMarket.js）
   ★★ 2026-11-12 MagiMarket/sw.js から、版（v）と一覧（core）だけをここへ移した
   ------------------------------------------------------------
   ・v    … 置き場の名前（版）。core のファイルが1つでも変わったら、最後の数字を +1 する
             （上げ忘れは make-update.py が見つけて自動で +1 する）
   ・core … オフライン用に先に取りこむファイル。パスは MagiMarket/sw.js から見た相対パスのまま
   ・MagiMarket/sw.js がこのファイルを importScripts で読む（しくみは sw-list/_shared.js の説明）
   ============================================================ */
self.XEV_SW = { v: "magimarket-sw-v4", core: [
  "./index.html",
  "./manifest.webmanifest",
  "./css/mm.css?v=3",
  "./js/mm-core.js?v=1",
  "./js/mm-chart.js?v=1",
  "./js/mm-ui.js?v=1",
  "./img/icon192.png?v=2",
  "../thumbs/MagiMarket.jpg?v=2",
  "../XEVA.png",
  "../xeva-splash.js?v=22",
  "../xeva-safebottom.js?v=12",
  "../xeva-loading.js?v=19",
  "../xeva-back.js?v=9",
  "../xeva-presence.js?v=9",
  "../maintenance-gate.js?v=13",
  "../xeva.js?v=87",
  "../xeva-alive.js?v=9",
  "../xeva-cloud.js?v=51",
  "../xeva-keys.js?v=36",
  "../xevarion-fb.js?v=37",
  "../img/ld_a_stand.webp?v=5",
  "../img/ld_a_bow.webp?v=5",
  /* 起動画面の3社ロゴは毎回出すので、オフラインでも出るように */
  "../brand/NGX_s.webp?v=2",
  "../brand/MagicalFuture_s.webp?v=2",
  "../brand/ISHIDA_s.webp?v=2",
  "../brand/YRA_s.webp",
  "../brand/Kawagani_s.webp", "../brand/StudioDOGA_s.webp",
] };
