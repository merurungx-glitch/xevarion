/* ============================================================
   IshidaProduction — Service Worker が控えるファイルの一覧（sw-list/IshidaProduction.js）
   ★★ 2026-11-12 IshidaProduction/sw.js から、版（v）と一覧（core）だけをここへ移した
   ------------------------------------------------------------
   ・v    … 置き場の名前（版）。core のファイルが1つでも変わったら、最後の数字を +1 する
             （上げ忘れは make-update.py が見つけて自動で +1 する）
   ・core … オフライン用に先に取りこむファイル。パスは IshidaProduction/sw.js から見た相対パスのまま
   ・IshidaProduction/sw.js がこのファイルを importScripts で読む（しくみは sw-list/_shared.js の説明）
   ============================================================ */
/* ★★ 2026-10-31 v2：ロゴがつぶれる修正（style.css?v=4） */
self.XEV_SW = { v: "ishida-site-sw-v8", core: [
  "./index.html",
  "../maintenance-gate.js?v=13",
  "../thumbs/ISHIDA.webp?v=2",
  "css/style.css?v=6",
  "../brand/ISHIDA_s.webp?v=2",
  "../thumbs/MagiLex.jpg",
  "../thumbs/MagiBattle.jpg?v=4",
  "../thumbs/MagiChemLex.jpg?v=2",
  "../thumbs/MagiAbyss.jpg?v=2",
  "../thumbs/MagiBurst.jpg",
  "../thumbs/MagiDerby.jpg",
  "../thumbs/MagiShift.jpg",
  "../thumbs/MagiChainParty.jpg?v=2",
  "../thumbs/MagiQuiz.jpg?v=2",
  "../brand/NGX_s.webp?v=2",
  "../brand/MagicalFuture_s.webp?v=2",
  "../brand/YRA_s.webp",
  "../brand/Kawagani_s.webp", "../brand/StudioDOGA_s.webp",   // ★★ 2026-11-02 運営協力に参入
  "../thumbs/Ordyxis.jpg",
  "../thumbs/XEVYNAR.jpg",
  "../thumbs/MagiFocus.jpg",
  "../thumbs/MagiBocciaRush.jpg",
  "../thumbs/MagiRail.jpg",
  "../thumbs/MagiCraft.jpg",
  "../thumbs/MagiManor.jpg",
  "../thumbs/MagiEmpire.jpg",
  "../thumbs/MagiArena.jpg",
  "../thumbs/MagiJackpot.jpg",
  "../thumbs/MagiLotto.jpg",
  "../thumbs/MagiDominionGrid.jpg",
  "../thumbs/MagiLink.jpg",
  "../thumbs/MagiRanking.jpg",
  "../thumbs/MagiScope.jpg",
  "../thumbs/MagiMusic.jpg",
  "../thumbs/MagiPortfolio.jpg",
  "../thumbs/MagiCounter.jpg",
  "../thumbs/MagiTier.jpg",
  "js/main.js?v=3",
] };
