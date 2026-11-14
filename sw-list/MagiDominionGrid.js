/* ============================================================
   MagiDominionGrid — Service Worker が控えるファイルの一覧（sw-list/MagiDominionGrid.js）
   ★★ 2026-11-12 MagiDominionGrid/sw.js から、版（v）と一覧（core）だけをここへ移した
   ------------------------------------------------------------
   ・v    … 置き場の名前（版）。core のファイルが1つでも変わったら、最後の数字を +1 する
             （上げ忘れは make-update.py が見つけて自動で +1 する）
   ・core … オフライン用に先に取りこむファイル。パスは MagiDominionGrid/sw.js から見た相対パスのまま
   ・MagiDominionGrid/sw.js がこのファイルを importScripts で読む（しくみは sw-list/_shared.js の説明）
   ============================================================ */
self.XEV_SW = { v: "mdgrid-sw-v42", core: [
  "./index.html",
  "./css/mdg.css?v=9",
  "./js/mdg.js?v=8",
  "../xeva.js?v=87", "../xevarion-fb.js?v=37", "../xeva-cloud.js?v=51", "../xeva-keys.js?v=36",   /* ★★ 2026-10-22 同期（このページでも xeva-cloud を読む） */
  "../xeva-alive.js?v=9",
  "../xeva-loading.js?v=19",
  "../xeva-splash.js?v=22",
  "../xeva-safebottom.js?v=12",
  "../xeva-back.js?v=9",
  "../maintenance-gate.js?v=13",
  "../thumbs/MagiDominionGrid.jpg",
] };
