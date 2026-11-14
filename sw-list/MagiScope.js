/* ============================================================
   MagiScope — Service Worker が控えるファイルの一覧（sw-list/MagiScope.js）
   ★★ 2026-11-12 MagiScope/sw.js から、版（v）と一覧（core）だけをここへ移した
   ------------------------------------------------------------
   ・v    … 置き場の名前（版）。core のファイルが1つでも変わったら、最後の数字を +1 する
             （上げ忘れは make-update.py が見つけて自動で +1 する）
   ・core … オフライン用に先に取りこむファイル。パスは MagiScope/sw.js から見た相対パスのまま
   ・MagiScope/sw.js がこのファイルを importScripts で読む（しくみは sw-list/_shared.js の説明）
   ============================================================ */
self.XEV_SW = { v: "magiscope-sw-v47", core: [
  "./index.html",
  "./css/scope.css?v=21",
  "./js/scope-config.js?v=3",
  "./js/scope-data.js?v=21",
  "./js/scope-art.js?v=3",
  "./js/scope-ui.js?v=30",
  "./img/emblem.png",
  "./img/icon192.png",
  "./manifest.webmanifest",
  "../xeva-splash.js?v=22",
  "../xeva-safebottom.js?v=12",
  "../xeva-loading.js?v=19",
  "../xeva-back.js?v=9",
  "../maintenance-gate.js?v=13",
  "../xeva.js?v=87", "../xevarion-fb.js?v=37",   /* ★★ 2026-10-22 同期（このページでも xeva-cloud を読む） */
  "../xeva-alive.js?v=9",
  /* ★★ 2026-09-22 英語版（オフラインでも切りかえられるように） */
  "../xeva-i18n.js?v=8",
  "../xeva-i18n-dict.js?v=12",
  "../xeva-i18n-ms1.js?v=3",
  /* xeva-cloud.js はモジュールなので、そこから読む xeva-keys.js も要る */
  "../xeva-cloud.js?v=51",
  "../xeva-keys.js?v=36",
  "../img/ld_b_stand.webp?v=5",
  "../img/ld_b_bow.webp?v=5",
  "../thumbs/MagiScope.jpg",
] };
