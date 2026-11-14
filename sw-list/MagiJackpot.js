/* ============================================================
   MagiJackpot — Service Worker が控えるファイルの一覧（sw-list/MagiJackpot.js）
   ★★ 2026-11-12 MagiJackpot/sw.js から、版（v）と一覧（core）だけをここへ移した
   ------------------------------------------------------------
   ・v    … 置き場の名前（版）。core のファイルが1つでも変わったら、最後の数字を +1 する
             （上げ忘れは make-update.py が見つけて自動で +1 する）
   ・core … オフライン用に先に取りこむファイル。パスは MagiJackpot/sw.js から見た相対パスのまま
   ・MagiJackpot/sw.js がこのファイルを importScripts で読む（しくみは sw-list/_shared.js の説明）
   ============================================================ */
self.XEV_SW = { v: "magijackpot-sw-v65", core: [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./mj.css?v=18",
  "./mj-games.css?v=11",
  "./mj-core.js?v=20",
  "./mj-slots.js?v=18",
  "./mj-lux.js?v=12",
  "./mj-bj.js?v=16",
  "./mj-pachi.js?v=19",
  "./mj-party.js?v=15",
  "./mj-192.png",
  "./mj-512.png",
  "./mj-banner.jpg",
  /* スロットの絵柄・カットイン・台のバナー */
  "./img/sym_seven.webp",
  "./img/sym_bar.webp",
  "./img/sym_diamond.webp",
  "./img/sym_wild.webp",
  "./img/sym_scatter.webp",
  /* Magi Fortune の高配当図柄（MagiBurst のキャラ） */
  "./img/sym_aira.webp",
  "./img/sym_mao.webp",
  "./img/sym_kaguya.webp",
  /* LUXURIA の三魔女（紅薔薇・白薔薇・黒薔薇） */
  "./img/sym_rose_r.webp",
  "./img/sym_rose_w.webp",
  "./img/sym_rose_b.webp",
  /* Jackpot Rush の FINAL BATTLE 専用のボス */
  "./img/sym_boss1.webp",
  "./img/sym_boss2.webp",
  "./img/sym_boss3.webp",
  "./img/cut_lv1.webp",
  "./img/cut_lv2.webp",
  "./img/cut_lv3.webp",
  "./img/banner_fortune.webp",
  "./img/banner_luxuria.webp",
  "../maintenance-gate.js?v=13",
  "../xeva.js?v=87",
  "../xeva-alive.js?v=9",
  "../xeva-splash.js?v=22",
  "../xeva-back.js?v=9",
  "../game-link.js?v=11",
  "../XEVA.png",
  "../gem.png",
  "../icons/xev-192.png",
  /* Jackpot Rush のストーリーリーチに使う MagiBurst のキャラ画像
     （FINAL BATTLE のボスは ./img/sym_boss1〜3.webp に移したので、ここには要らない） */
  "../img/t_Fiona.webp",
  "../img/t_Chloe.webp",
  "../img/t_Selene.webp",
  "../img/t_Abyss.webp",
] };
