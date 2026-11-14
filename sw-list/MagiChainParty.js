/* ============================================================
   MagiChainParty — Service Worker が控えるファイルの一覧（sw-list/MagiChainParty.js）
   ★★ 2026-11-12 MagiChainParty/sw.js から、版（v）と一覧（core）だけをここへ移した
   ------------------------------------------------------------
   ・v    … 置き場の名前（版）。core のファイルが1つでも変わったら、最後の数字を +1 する
             （上げ忘れは make-update.py が見つけて自動で +1 する）
   ・core … オフライン用に先に取りこむファイル。パスは MagiChainParty/sw.js から見た相対パスのまま
   ・MagiChainParty/sw.js がこのファイルを importScripts で読む（しくみは sw-list/_shared.js の説明）
   ============================================================ */
self.XEV_SW = { v: "chainparty-sw-v69", core: [
  "./index.html",
  "./css/style.css?v=22",
  "./js/game.js?v=21",
  /* ★★ 2026-10-13 新しいロゴ（タイトルの絵・小さいアイコン） */
  "./img/logo_hero.webp",
  "./img/icon192.png",
  /* ★★ 2026-09-03 下バーを画面の下端に合わせる共通部品 */
  "../xeva-safebottom.js?v=12",
  "../xeva.js?v=87",
  "../xeva-alive.js?v=9",
  "../xeva-loading.js?v=19",
  "../xeva-splash.js?v=22",
  "../game-link.js?v=13",
  "../maintenance-gate.js?v=13",
  "../app-install-notice.js?v=9",
  "../thumbs/MagiChainParty.jpg?v=2",
  "../brand/NGX_s.webp?v=2",
  "../brand/MagicalFuture_s.webp?v=2",
  "../brand/ISHIDA_s.webp?v=2",
  "../brand/YRA_s.webp",
  "../brand/Kawagani_s.webp", "../brand/StudioDOGA_s.webp",   // ★★ 2026-11-02 運営協力に参入
] };
