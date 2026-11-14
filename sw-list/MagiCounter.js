/* ============================================================
   MagiCounter — Service Worker が控えるファイルの一覧（sw-list/MagiCounter.js）
   ★★ 2026-11-12 MagiCounter/sw.js から、版（v）と一覧（core）だけをここへ移した
   ------------------------------------------------------------
   ・v    … 置き場の名前（版）。core のファイルが1つでも変わったら、最後の数字を +1 する
             （上げ忘れは make-update.py が見つけて自動で +1 する）
   ・core … オフライン用に先に取りこむファイル。パスは MagiCounter/sw.js から見た相対パスのまま
   ・MagiCounter/sw.js がこのファイルを importScripts で読む（しくみは sw-list/_shared.js の説明）
   ============================================================ */
self.XEV_SW = { v: "magicounter-sw-v47", core: [
  "./index.html",
  "./manifest.webmanifest",
  "./css/mc.css?v=6",
  "./js/mc-icons.js?v=2",
  "./js/mc-data.js?v=5",
  "./js/mc-core.js?v=6",
  "./js/mc-ui.js?v=6",
  "./js/mc-scan.js?v=8",
  "./data/meta.json",
  "../xeva.js?v=87", "../xevarion-fb.js?v=37",   /* ★★ 2026-10-22 同期（このページでも xeva-cloud を読む） */
  "../xeva-alive.js?v=9",
  "../xeva-loading.js?v=19",
  "../xeva-splash.js?v=22",
  "../xeva-safebottom.js?v=12",
  "../xeva-back.js?v=9",
  "../maintenance-gate.js?v=13",
  "../thumbs/MagiCounter.jpg",
  /* ★★ 2026-09-13d <b>ここに無いとオフラインで開けないことがある</b>（ご指定の不具合）。
     index.html が読んでいるのに CORE から抜けていたぶん。
     ★ 実行時キャッシュに入るので<b>ふだんは動く</b>が、
       いちど開いただけで（実行時キャッシュが埋まる前に）通信が切れると、
       xeva.js が読めず<b>白い画面</b>になる。CORE に載せて install で確実に取る。
     ★ xeva-cloud.js はモジュールなので、<b>そこから読む xeva-keys.js も</b>要る。 */
  "../xeva-cloud.js?v=51",
  "../xeva-keys.js?v=36",
  /* 起動時のスプラッシュとお辞儀の絵（xeva-splash / xeva-loading が読む） */
  "../img/ld_b_stand.webp?v=5",
  "../img/ld_b_bow.webp?v=5",
  "../brand/NGX_s.webp?v=2",
  "../brand/ISHIDA_s.webp?v=2",
  "../brand/YRA_s.webp",
  "../brand/Kawagani_s.webp", "../brand/StudioDOGA_s.webp",   // ★★ 2026-11-02 運営協力に参入
  "../brand/MagicalFuture_s.webp?v=2",
] };
