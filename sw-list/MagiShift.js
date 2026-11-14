/* ============================================================
   MagiShift — Service Worker が控えるファイルの一覧（sw-list/MagiShift.js）
   ★★ 2026-11-12 MagiShift/sw.js から、版（v）と一覧（core）だけをここへ移した
   ------------------------------------------------------------
   ・v    … 置き場の名前（版）。core のファイルが1つでも変わったら、最後の数字を +1 する
             （上げ忘れは make-update.py が見つけて自動で +1 する）
   ・core … オフライン用に先に取りこむファイル。パスは MagiShift/sw.js から見た相対パスのまま
   ・MagiShift/sw.js がこのファイルを importScripts で読む（しくみは sw-list/_shared.js の説明）
   ============================================================ */
self.XEV_SW = { v: "magishift-sw-v34", core: [
  "./index.html",
  "./css/shift.css?v=13",
  "./js/shift-core.js?v=9",
  "./js/shift-ai.js?v=3",          /* ★★ 2026-10-13 CPU */
  "./js/shift-account.js?v=4",
  "./js/shift-ui.js?v=13",
  "./img/icon192.png",
  "./manifest.webmanifest",
  "../xeva-splash.js?v=22",
  "../xeva-safebottom.js?v=12",
  "../xeva-loading.js?v=19",
  "../xeva-back.js?v=9",
  "../maintenance-gate.js?v=13",
  "../xeva.js?v=87", "../xeva-cloud.js?v=51", "../xeva-keys.js?v=36",   /* ★★ 2026-10-22 同期（このページでも xeva-cloud を読む） */
  "../xeva-alive.js?v=9",
  "../game-link.js?v=13",
  "../xevarion-fb.js?v=37",
  "../img/ld_b_stand.webp?v=5",
  "../img/ld_b_bow.webp?v=5",
  "../thumbs/MagiShift.jpg",
  /* ★★ 2026-10-13 起動画面の3社ロゴは毎回出すので、オフラインでも出るように */
  "../brand/NGX_s.webp?v=2",
  "../brand/MagicalFuture_s.webp?v=2",
  "../brand/ISHIDA_s.webp?v=2",
  "../brand/YRA_s.webp",
  "../brand/Kawagani_s.webp", "../brand/StudioDOGA_s.webp",   // ★★ 2026-11-02 運営協力に参入
] };
