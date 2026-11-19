/* ============================================================
   MagiMusic — Service Worker が控えるファイルの一覧（sw-list/MagiMusic.js）
   ★★ 2026-11-12 MagiMusic/sw.js から、版（v）と一覧（core）だけをここへ移した
   ------------------------------------------------------------
   ・v    … 置き場の名前（版）。core のファイルが1つでも変わったら、最後の数字を +1 する
             （上げ忘れは make-update.py が見つけて自動で +1 する）
   ・core … オフライン用に先に取りこむファイル。パスは MagiMusic/sw.js から見た相対パスのまま
   ・MagiMusic/sw.js がこのファイルを importScripts で読む（しくみは sw-list/shared.js の説明）
   ============================================================ */
self.XEV_SW = { v: "magimusic-sw-v44", core: [
  "./MagiMusic.html",
  "./manifest.webmanifest",
  "../thumbs/MagiMusic.jpg",
  "../thumbs/MagiBurst.jpg",
  "../Xevarion.png",
  "../brand/NGX_s.webp?v=2",
  "../brand/MagicalFuture_s.webp?v=2",
  "../brand/ISHIDA_s.webp?v=2",
  "../brand/YRA_s.webp",
  "../brand/Kawagani_s.webp", "../brand/StudioDOGA_s.webp",   // ★★ 2026-11-02 運営協力に参入
  "../maintenance-gate.js?v=14",
  /* ★★ 2026-11-17 オフラインで足りなかったもの（ご報告「XEVARION でオフラインでできないことがある」）：ページが読むのに一覧に無かった共通の部品・起動画面のロゴ。ほかのアプリの置き場にあっても、このアプリの SW は自分の置き場しか見ていなかった */
  "../xeva-alive.js?v=9", "../xeva-cloud.js?v=51", "../xeva-keys.js?v=36", "../xeva.js?v=87", "../xevarion-fb.js?v=37",
] };
