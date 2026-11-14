/* ============================================================
   MagiQuiz — Service Worker が控えるファイルの一覧（sw-list/MagiQuiz.js）
   ★★ 2026-11-12 MagiQuiz/sw.js から、版（v）と一覧（core）だけをここへ移した
   ------------------------------------------------------------
   ・v    … 置き場の名前（版）。core のファイルが1つでも変わったら、最後の数字を +1 する
             （上げ忘れは make-update.py が見つけて自動で +1 する）
   ・core … オフライン用に先に取りこむファイル。パスは MagiQuiz/sw.js から見た相対パスのまま
   ・MagiQuiz/sw.js がこのファイルを importScripts で読む（しくみは sw-list/_shared.js の説明）
   ============================================================ */
self.XEV_SW = { v: "magiquiz-sw-v15", core: [
  "./index.html",
  "./css/quiz.css?v=8",
  "./js/quiz-data.js?v=6",
  "./js/quiz-account.js?v=4",
  "./js/quiz-fx.js?v=4",
  "./js/quiz-ui.js?v=7",
  "./js/quiz-pad.js?v=1",
  "./js/quiz-play.js?v=6",
  "./js/quiz-result.js?v=5",
  "./js/quiz-host.js?v=2", "./js/quiz-online.js?v=2", "./js/quiz-net.js?v=1",   // ★★ 2026-11-08 司会キャラ・2台で対戦
  "./img/icon192.png?v=2",
  "./img/apple-touch-icon.png?v=2",
  "./manifest.webmanifest",
  /* 問題（MagiChemLex の問題データそのもの）と、書式・判定（mcl-core）・図（mcl-fig） */
  "../MagiChemLex/js/mcl-data.js?v=5", "../MagiChemLex/js/mcl-data2.js?v=4", "../MagiChemLex/js/mcl-data3.js?v=2",
  "../MagiChemLex/js/mcl-data4.js?v=2", "../MagiChemLex/js/mcl-data5.js?v=2", "../MagiChemLex/js/mcl-data6.js?v=1",
  "../MagiChemLex/js/mcl-data7.js?v=1", "../MagiChemLex/js/mcl-data8.js?v=2", "../MagiChemLex/js/mcl-data9.js?v=2",
  "../MagiChemLex/js/mcl-data10.js?v=1", "../MagiChemLex/js/mcl-data11.js?v=1", "../MagiChemLex/js/mcl-data12.js?v=1",
  "../MagiChemLex/js/mcl-core.js?v=15",
  "../MagiChemLex/js/mcl-fig.js?v=5", "../MagiChemLex/js/mcl-fig2.js?v=1", "../MagiChemLex/js/mcl-fig3.js?v=1",
  "../MagiChemLex/js/mcl-fig4.js?v=1", "../MagiChemLex/js/mcl-fig5.js?v=2",
  "../xeva-splash.js?v=22",
  "../xeva-safebottom.js?v=12",
  "../xeva-loading.js?v=19",
  "../xeva-back.js?v=9",
  "../maintenance-gate.js?v=13",
  "../xeva.js?v=87", "../xeva-cloud.js?v=51", "../xeva-keys.js?v=36",
  "../xeva-alive.js?v=9",
  "../game-link.js?v=13",
  "../xevarion-fb.js?v=37",
  "../XEVA.png",
  "../img/ld_b_stand.webp?v=5",
  "../img/ld_b_bow.webp?v=5",
  "../thumbs/MagiQuiz.jpg?v=2",
  /* 起動画面の3社ロゴは毎回出すので、オフラインでも出るように */
  "../brand/NGX_s.webp?v=2",
  "../brand/MagicalFuture_s.webp?v=2",
  "../brand/ISHIDA_s.webp?v=2",
  "../brand/YRA_s.webp",
  "../brand/Kawagani_s.webp", "../brand/StudioDOGA_s.webp",   // ★★ 2026-11-02 運営協力に参入
] };
