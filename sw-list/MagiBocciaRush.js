/* ============================================================
   MagiBocciaRush — Service Worker が控えるファイルの一覧（sw-list/MagiBocciaRush.js）
   ★★ 2026-11-12 MagiBocciaRush/sw.js から、版（v）と一覧（core）だけをここへ移した
   ------------------------------------------------------------
   ・v    … 置き場の名前（版）。core のファイルが1つでも変わったら、最後の数字を +1 する
             （上げ忘れは make-update.py が見つけて自動で +1 する）
   ・core … オフライン用に先に取りこむファイル。パスは MagiBocciaRush/sw.js から見た相対パスのまま
   ・MagiBocciaRush/sw.js がこのファイルを importScripts で読む（しくみは sw-list/_shared.js の説明）
   ============================================================ */
self.XEV_SW = { v: "boccia-sw-v58", core: [
  "./index.html",
  "./manifest.webmanifest",
  "./css/mbr.css?v=24",
  "./js/mbr-voice.js?v=2",
  "./js/mbr-core.js?v=21",
  "./js/mbr-stage.js?v=5",
  "./js/mbr-fx.js?v=10",
  "./js/mbr-help.js?v=8",
  "./js/mbr-ui.js?v=23",
  "../mb-newchars.js?v=44",
  "../mb-boot.js?v=18",
  "../MagiBurst/js/mb-core.js?v=147",
  "../xeva.js?v=87",
  "../xeva-alive.js?v=9",
  "../xeva-loading.js?v=19",
  "../xeva-splash.js?v=22",
  "../xeva-safebottom.js?v=12",
  "../xeva-back.js?v=9",
  "../maintenance-gate.js?v=13",
  "../thumbs/MagiBocciaRush.jpg",
  "./img/mbrhome_s.webp",   /* ★★ 2026-09-17e 開始画面のキービジュアル */
  /* ★★ 2026-09-17d オフライン対応の穴うめ（ご指定）：
     ・オンライン対戦とアカウント同期のモジュール（読めないと console が赤くなるだけで遊べるが、そろえておく）
     ・英語版の辞書（オフラインで英語にしたとき、キャラ名が日本語に戻らないように） */
  "./js/mbr-online.js?v=6",
  "../xeva-cloud.js?v=51",
  "../MagiBurst/magiburst-cloud.js?v=29",
  "../app-cloud.js?v=15",
  "../xeva-keys.js?v=36",
  "../xeva-i18n.js?v=8",
  "../xeva-i18n-dict.js?v=12",
  "../xeva-i18n-mb1.js?v=7",
  "../xeva-i18n-mb2.js?v=7",
  "../xeva-i18n-mb3.js?v=8",
  "../xeva-i18n-mb4.js?v=9",
  "../xeva-i18n-mb5.js?v=7",
  "../xeva-i18n-mb6.js?v=7",
  "../xeva-i18n-mb7.js?v=7",
  "../xeva-i18n-n1.js?v=23",
  "../xeva-i18n-n2.js?v=3",
] };
