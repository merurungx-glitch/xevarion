/* ============================================================
   MagiLotto — Service Worker が控えるファイルの一覧（sw-list/MagiLotto.js）
   ★★ 2026-11-12 MagiLotto/sw.js から、版（v）と一覧（core）だけをここへ移した
   ------------------------------------------------------------
   ・v    … 置き場の名前（版）。core のファイルが1つでも変わったら、最後の数字を +1 する
             （上げ忘れは make-update.py が見つけて自動で +1 する）
   ・core … オフライン用に先に取りこむファイル。パスは MagiLotto/sw.js から見た相対パスのまま
   ・MagiLotto/sw.js がこのファイルを importScripts で読む（しくみは sw-list/_shared.js の説明）
   ============================================================ */
self.XEV_SW = { v: "magilotto-sw-v54", core: [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./ml.css?v=11",
  "./ml-core.js?v=11",
  "./ml-draw.js?v=10",
  "./ml-games.js?v=12",
  "./ml-grand.js?v=11",
  "./ml-admin.js?v=10",
  "./ml-app.js?v=11",
  "./ml-192.png",
  "./ml-512.png",
  "./img/banner_home.webp",
  "./img/machine.webp",
  "./img/ic_scratch.webp",
  "./img/ic_numbers.webp",
  "./img/ic_lotto.webp",
  "./img/ic_grand.webp",
  "./img/ic_free.webp",
  "./img/sym_s6.webp",
  "./img/cutin_jackpot.webp",
  /* スクラッチの絵柄（s1〜s5）は XEVARION のキャラをそのまま参照している。
     コピーはせず、オフラインでも出るようにここでキャッシュだけしておく。 */
  "../img/t_Fuka.webp",
  "../img/t_Tsumugi.webp",
  "../img/t_Suzuka.webp",
  "../img/t_Karem.webp",
  "../img/t_Chizuru.webp",
  "../maintenance-gate.js?v=13",
  "../xeva.js?v=87",
  "../xeva-alive.js?v=9",
  "../xeva-fx.js?v=9",
  "../xeva-splash.js?v=22",
  "../xeva-back.js?v=9",
  "../XEVA.png",
  "../gem.png",
  "../icons/xev-192.png",
] };
