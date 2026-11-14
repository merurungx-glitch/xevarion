/* ============================================================
   NGX — Service Worker が控えるファイルの一覧（sw-list/NGX.js）
   ★★ 2026-11-12 NGX/sw.js から、版（v）と一覧（core）だけをここへ移した
   ------------------------------------------------------------
   ・v    … 置き場の名前（版）。core のファイルが1つでも変わったら、最後の数字を +1 する
             （上げ忘れは make-update.py が見つけて自動で +1 する）
   ・core … オフライン用に先に取りこむファイル。パスは NGX/sw.js から見た相対パスのまま
   ・NGX/sw.js がこのファイルを importScripts で読む（しくみは sw-list/_shared.js の説明）
   ============================================================ */
self.XEV_SW = { v: "ngx-site-sw-v7", core: [
  "./NGX_website.html",
  "../maintenance-gate.js?v=13",
  "../thumbs/NGX.jpg?v=2",
  "../MagiBurst/img/ss/HaruSS.webp",
  "../thumbs/xevarion-home_s.jpg?v=13",
  "../MagiBurst/img/ss/ChikaSS.webp",
  "../MagiBurst/img/bn_fes21_s.webp",
  "../thumbs/Xevarion.png",
  "../thumbs/MagiBurst.jpg",
  "../thumbs/MagiAbyss.jpg?v=2",
  "../thumbs/MagiChemLex.jpg?v=2",
  "../thumbs/MagiDerby.jpg",
  "../thumbs/MagiQuiz.jpg?v=2",
  "../thumbs/MagiShift.jpg",
  "../thumbs/MagiScope.jpg",
  "../thumbs/MagiChainParty.jpg?v=2",
  "../thumbs/Ordyxis.jpg",
  "../thumbs/XEVYNAR.jpg",
  "../thumbs/MagiLex.jpg",
  "../thumbs/MagiBattle.jpg?v=4",
  "../thumbs/MagiBocciaRush.jpg",
  "../thumbs/MagiDominionGrid.jpg",
  "../thumbs/MagiLink.jpg",
  "../thumbs/MagiRail.jpg",
  "../thumbs/MagiJackpot.jpg",
  "../thumbs/MagiLotto.jpg",
  "../thumbs/MagiFocus.jpg",
  "../thumbs/MagiTier.jpg",
  "../thumbs/MagiCounter.jpg",
  "../thumbs/MagiRanking.jpg",
  "../brand/MagicalFuture_s.webp?v=2",
  "../brand/ISHIDA_s.webp?v=2",
  "../brand/YRA_s.webp",
  "../brand/Kawagani_s.webp", "../brand/StudioDOGA_s.webp",   // ★★ 2026-11-02 運営協力に参入
  "../brand/NGX_s.webp?v=2",
] };
