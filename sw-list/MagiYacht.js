/* ============================================================
   MagiYacht — Service Worker が控えるファイルの一覧（sw-list/MagiYacht.js）
   ★★ 2026-11-18 新作（ご指定）
   ------------------------------------------------------------
   ・v    … 置き場の名前（版）。core のファイルが1つでも変わったら、最後の数字を +1 する
             （上げ忘れは make-update.py が見つけて自動で +1 する）
   ・core … オフライン用に先に取りこむファイル。パスは MagiYacht/sw.js から見た相対パスのまま
   ・MagiYacht/sw.js がこのファイルを importScripts で読む（しくみは sw-list/_shared.js の説明）
   ============================================================ */
self.XEV_SW = { v: "magiyacht-sw-v1", core: [
  "./index.html",
  "./manifest.webmanifest",
  "./css/yacht.css?v=1",
  "./js/rules.js?v=1", "./js/audio.js?v=1", "./js/bgm.js?v=1", "./js/account.js?v=1",
  "./js/dice3d.js?v=1", "./js/howto.js?v=1", "./js/setup.js?v=1", "./js/game.js?v=1",
  "./img/logo.webp", "./img/icon-192.png", "./img/apple-touch-icon.png",
  "../thumbs/MagiYacht.jpg",
  /* XEVARION の共通の部品（同期・財布・連携・起動画面・もどる） */
  "../maintenance-gate.js?v=13",
  "../xeva-splash.js?v=22", "../xeva-loading.js?v=19", "../xeva-safebottom.js?v=12", "../xeva-back.js?v=9",
  "../xeva.js?v=87", "../xeva-alive.js?v=9", "../xeva-cloud.js?v=51", "../xeva-keys.js?v=36", "../xevarion-fb.js?v=37",
  "../game-link.js?v=13",
  "../XEVA.png",
  "../img/ld_b_stand.webp?v=5", "../img/ld_b_bow.webp?v=5",
  /* 起動画面の会社のロゴは毎回出すので、オフラインでも出るように */
  "../brand/NGX_s.webp?v=2", "../brand/MagicalFuture_s.webp?v=2", "../brand/ISHIDA_s.webp?v=2",
  "../brand/YRA_s.webp", "../brand/Kawagani_s.webp", "../brand/StudioDOGA_s.webp",
] };
