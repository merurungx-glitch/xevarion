/* ============================================================
   XEVYNAR — Service Worker が控えるファイルの一覧（sw-list/XEVYNAR.js）
   ★★ 2026-11-12 XEVYNAR/sw.js から、版（v）と一覧（core）だけをここへ移した
   ------------------------------------------------------------
   ・v    … 置き場の名前（版）。core のファイルが1つでも変わったら、最後の数字を +1 する
             （上げ忘れは make-update.py が見つけて自動で +1 する）
   ・core … オフライン用に先に取りこむファイル。パスは XEVYNAR/sw.js から見た相対パスのまま
   ・XEVYNAR/sw.js がこのファイルを importScripts で読む（しくみは sw-list/_shared.js の説明）
   ============================================================ */
self.XEV_SW = { v: "xevynar-sw-v76", core: [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./xevynar.css?v=20",
  "./xevynar-tf.js?v=10",
  "./xevynar-kb.js?v=25",
  "./xevynar-lex.js?v=18",
  "./xevynar-steps.js?v=14",
  "./xevynar-figs.js?v=17",
  "./xevynar-terms.js?v=11",
  "./xevynar-deep.js?v=15",
  "./xevynar-brain.js?v=20",
  "./xevynar-talk.js?v=20",
  "./xevynar-app.js?v=22",
  "./XEVYNAR.png",
  "./xevynar-mark.png",
  "./xevynar-192.png",
  "./xevynar-512.png",
  "../maintenance-gate.js?v=13",
  "../xeva.js?v=87",
  "../xeva-alive.js?v=9",
  "../xeva-splash.js?v=22",
  "../xeva-loading.js?v=19",
  "../XEVA.png",
  "../gem.png",
  /* ★ MagiLex の問題データ。オフラインでも「苦手問題の出題」「問題の解説」を
     動かすために先読みしておく（XEVYNAR の目玉機能なので通信必須にはしない）。
     ★★ 2026-08-18c 「1問ごとのくわしい解説」は 数学・物理・化学γ を読むので、
       その4本（suugaku / math3 / chemg / butsuri）も足した。
       ここに無いと、オフラインで解説が<b>1問も出ない</b>。
     ★ どれも <b>?v= を付けない</b>こと。xevynar-deep.js / xevynar-lex.js が
       ?v= 無しで読むので、付けて登録しても当たらない。 */
  "../MagiLex/magilex-data.js",
  "../MagiLex/magilex-eigo.js",
  "../MagiLex/magilex-rika.js",
  "../MagiLex/magilex-chemb.js",
  "../MagiLex/magilex-intro.js",
  "../MagiLex/magilex-mid.js",
  "../MagiLex/magilex-chemg.js",
  "../MagiLex/magilex-chemd.js",
] };
