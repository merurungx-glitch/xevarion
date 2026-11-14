/* ============================================================
   MagiLex — Service Worker が控えるファイルの一覧（sw-list/MagiLex.js）
   ★★ 2026-11-12 MagiLex/sw.js から、版（v）と一覧（core）だけをここへ移した
   ------------------------------------------------------------
   ・v    … 置き場の名前（版）。core のファイルが1つでも変わったら、最後の数字を +1 する
             （上げ忘れは make-update.py が見つけて自動で +1 する）
   ・core … オフライン用に先に取りこむファイル。パスは MagiLex/sw.js から見た相対パスのまま
   ・MagiLex/sw.js がこのファイルを importScripts で読む（しくみは sw-list/_shared.js の説明）
   ============================================================ */
self.XEV_SW = { v: "magilex-sw-v138", core: [
  /* ★ 2026-08-19 図・グラフのエンジンは XEVYNAR と共有。
     ここに無いと、オフラインで「図で見る」が出ない。 */
  "../XEVYNAR/xevynar-figs.js?v=17",
  "./MagiLex.html",
  "./index.html",                 /* ★★ 2026-10-24 MagiLex の入口（MagiChemLex／旧MagiLex をえらぶ） */
  "../thumbs/MagiChemLex.jpg?v=2",
  "./magilex.css?v=48",
  "./magilex.js?v=96",
  "./magilex-data.js?v=10",
  "./magilex-eigo.js?v=9",
  "./magilex-rika.js?v=9",
  "./magilex-chemb.js?v=10",
  "./magilex-chemg.js?v=11",
  "./magilex-intro.js?v=9",
  "./magilex-mid.js?v=9",
  "./magilex-chemd.js?v=9",
  /* ★★ 2026-08-26 化学ε・物理γ（全範囲の標準演習。各20セット240問）。
     ここに無いとオフラインでこの2科目だけ問題が出てこない。 */
  "./magilex-cheme.js?v=11",
  /* ★★ 2026-08-30 地理。ここに無いとオフラインで開けず、update.json にも載らない。 */
  "./mlhome_s.jpg",
  /* ★★ 2026-08-26 Knowledge Point（KP）のアイコン。
     ここに無いとオフラインで KP の絵が出ない。 */
  "./kp.webp",
  "./kp@2x.webp",
  /* ★★ 2026-08-26 KP交換所のキャラの絵（交換所は一覧を必ず出すので、CORE に入れておく） */
  "../img/t_Mizuki.webp",
  "../img/t_Kanade.webp",
  "../img/t_Homura.webp",
  "../img/t_Yoizuki.webp",
  "../img/t_Sumika.webp",
  /* ★ 2026-08-24 スタミナの絵（ホームのプロフィールに出す⚡札） */
  "../stamina.png",
  "../thumbs/MagiLex.jpg",
  "../brand/NGX_s.webp?v=2",
  "../brand/MagicalFuture_s.webp?v=2",
  "../brand/ISHIDA_s.webp?v=2",
  "../brand/YRA_s.webp",
  "../brand/Kawagani_s.webp", "../brand/StudioDOGA_s.webp",   // ★★ 2026-11-02 運営協力に参入
  "../xeva.js?v=87",
  "../xeva-alive.js?v=9",
  "../xeva-loading.js?v=19",
  "../xeva-splash.js?v=22",
  "../app-cloud.js?v=15",
  "../xeva-keys.js?v=36",
  "./magilex-cloud.js?v=26",
  "../maintenance-gate.js?v=13",
  "../app-install-notice.js?v=9",
  "../XEVA.png",
] };
