/* ============================================================
   MagiDerby — Service Worker が控えるファイルの一覧（sw-list/MagiDerby.js）
   ★★ 2026-11-12 MagiDerby/sw.js から、版（v）と一覧（core）だけをここへ移した
   ------------------------------------------------------------
   ・v    … 置き場の名前（版）。core のファイルが1つでも変わったら、最後の数字を +1 する
             （上げ忘れは make-update.py が見つけて自動で +1 する）
   ・core … オフライン用に先に取りこむファイル。パスは MagiDerby/sw.js から見た相対パスのまま
   ・MagiDerby/sw.js がこのファイルを importScripts で読む（しくみは sw-list/_shared.js の説明）
   ============================================================ */
self.XEV_SW = { v: "magiderby-sw-v15", core: [
  "./index.html",
  "./manifest.webmanifest",
  "./css/md.css?v=8",
  "./js/md-data.js?v=4",
  "./js/md-net.js?v=6",
  "./js/md-bet.js?v=6",
  "./js/md-race.js?v=2",
  "./js/md-ui.js?v=8",
  "./js/md-help.js?v=3",
  "./js/md-intro.js?v=2",
  "./img/icon192.png",
  "../thumbs/MagiDerby.jpg",
  "../XEVA.png",
  "../brand-xevarion-orb.png",
  "../brand-xevarion-wordmark-dark.png",
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
  "../brand/Kawagani_s.webp", "../brand/StudioDOGA_s.webp",   // ★★ 2026-11-02 運営協力に参入
] };
