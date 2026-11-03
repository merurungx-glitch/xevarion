/* ============================================================
   XEVA-Splash — XEVARION 全アプリ共通の起動スプラッシュ
   ------------------------------------------------------------
   MagiBurst のスプラッシュを「正」として、ホームに並ぶアプリの
   ロゴ表示・ロード表示をこの1ファイルに統一する。
   （以前はアプリごとに #splash / #mlx-splash / #ordyxis-splash …と
     別実装で、背景色もタイミングもバラバラだった）

   構成（MagiBurst と同じ2段）:
     ① NGX × Magical Future × ISHIDA Production × YRA の企業ロゴ（★★ 2026-10-28 YRA が参入・縦2×横2）
     ② アプリロゴ ＋ ロードバー ＋ "Loading <App> ..."

   使い方（<head> に、defer なしで置く）:
     <script src="../xeva-splash.js?v=21"
             data-app="MagiLex"
             data-logo="../thumbs/MagiLex.jpg"></script>

   任意の属性:
     data-note="⚠️ このゲームの対象年齢は 13歳以上 です"  … バーの下に出る注意書き
     data-cap="Loading MagiLex ..."                      … キャプションの上書き
     data-base="../"                                     … ブランド画像の基準パス（既定はこのJSの場所）
     data-keep-legacy="1"                                … 旧スプラッシュを隠さない

   JS から:
     XevaSplash.wait(promise)  … 読み込みが終わるまでスプラッシュを保持する
     XevaSplash.hide()         … すぐ閉じる
     window.addEventListener("xeva:splash-done", fn)
   ============================================================ */
(function () {
  "use strict";

  /* ══ 全画面の土台の高さを実測して --app-vh に流す（iPhone のアプリ表示対策） ══
     ★ ホーム画面から「アプリとして」開くと、画面の下に空白の帯ができて
       下部が詰まって見えることがある。全画面の土台を height:100dvh などで組むと、
       その高さはブラウザが決める「箱」に従うが、standalone（アプリ表示）＋
       viewport-fit=cover ではこの箱が実際に見えている画面より短くなることがあり、
       余ったぶん（ちょうどホームバーの帯）が下の空白として残るため。

     ★ 2026-08-03 の作り直し：innerHeight はあてにならない
       以前はここで window.innerHeight を流していたが、iOS の standalone では
       起動直後の innerHeight が「セーフエリアを引いた高さ」で返ることがあり、
       しかもそのあと resize が飛ばない。結果、土台がホームバーぶんだけ短いまま
       固定され、まさに直したかった空白が残っていた。
       そこで「position:fixed; top:0; bottom:0 の要素が実際に何ピクセルになるか」を
       測る。これは画面をおおうときにブラウザが本当に使う高さそのものなので、
       standalone でも Safari でもズレようがない（MagiBurst のタブバーが
       bottom:0 で正しく画面下にくっつくのと同じ理屈）。
       測れないとき（body がまだ無い等）だけ innerHeight に落ちる。
     ★ visualViewport は使わない。キーボードで縮むので、土台に使うと
       入力のたびに画面全体が縮んでしまう。
     ★ この変数を使っていないアプリには何の影響もない（値を置くだけ）。 */
  var ME = document.currentScript;
  if (!ME || window.XevaSplash) return;
  /* ★★ 2026-10-13 ご指定「アプリ開始時に企業ロゴが表示されていません」→ XEVARION 本体（index.html）にも出す。
     本体は data-home="1"。<b>XEVARION を起動したとき</b>（このタブでまだ「タップしてスタート」していない）だけ出し、
     アプリから戻ってきたとき（xeva_accessed が立っている）は出さない＝何もしない。 */
  if (ME.dataset && ME.dataset.home === "1") {
    var accessed = false;
    try { accessed = sessionStorage.getItem("xeva_accessed") === "1"; } catch (e) {}
    if (accessed) {
      window.XevaSplash = { wait: function () { return this; }, hide: function () {}, done: function () { return Promise.resolve(); }, get app() { return "XEVARION"; } };
      return;
    }
  }

  (function () {
    var root = document.documentElement;
    var probe = null;
    function getProbe() {
      var host = document.body || document.documentElement;
      if (!host) return null;
      if (probe && probe.parentNode) return probe;
      probe = document.createElement("div");
      probe.setAttribute("aria-hidden", "true");
      probe.style.cssText =
        "position:fixed;top:0;bottom:0;left:0;width:0;margin:0;padding:0;border:0;" +
        "visibility:hidden;pointer-events:none;z-index:-2147483000";
      host.appendChild(probe);
      return probe;
    }
    /* ★★ 2026-09-13 箱が画面よりどれだけ短いか（アプリ表示のときだけ）。
       これを --xv-under に入れておくと、スプラッシュを同じぶんだけ下へ伸ばせる
       ＝いちばん下に色のちがう帯が残らない。xeva-safebottom.js も同じ値を配るので、
       どちらが先に走っても結果は変わらない。 */
    function shortfall(box) {
      try {
        var standalone = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) ||
                         navigator.standalone;
        /* ★★ 2026-09-18 PC のアプリ表示を取りちがえないよう iOS だけ */
        if (!standalone || !(box > 200) || !(navigator.standalone === true || /iPhone|iPad|iPod/.test(navigator.userAgent || "") || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1))) return 0;
        var sMin = Math.min(screen.width, screen.height);
        var sMax = Math.max(screen.width, screen.height);
        var s = Math.round((window.innerWidth > window.innerHeight ? sMin : sMax) - box);
        return (s > 0 && s < 200) ? s : 0;
      } catch (e) { return 0; }
    }
    function sync() {
      var p = getProbe();
      var h = 0;
      if (p) { try { h = Math.round(p.getBoundingClientRect().height); } catch (e) { h = 0; } }
      var boxH = h;
      if (h <= 200) h = Math.round(window.innerHeight || 0);
      if (h > 200) root.style.setProperty("--app-vh", h + "px");
      if (boxH > 200) root.style.setProperty("--xv-under", shortfall(boxH) + "px");
    }
    window.addEventListener("resize", sync);
    window.addEventListener("pageshow", sync);
    window.addEventListener("orientationchange", function () { setTimeout(sync, 250); });
    document.addEventListener("DOMContentLoaded", sync);
    /* standalone はセーフエリアが確定するまでに数フレームかかる端末がある。
       起動直後だけ何度か測り直して、確定後の値でそろえる。 */
    [0, 60, 200, 600, 1200, 2500].forEach(function (ms) { setTimeout(sync, ms); });
    window.XevaAppVh = sync;
    sync();
  })();

  var D = ME.dataset || {};
  var APP = D.app || (document.title || "XEVARION").split(/[—\-|｜]/)[0].trim();
  var BASE = D.base || ME.src.slice(0, ME.src.lastIndexOf("/") + 1);
  var LOGO = D.logo || (BASE + "thumbs/" + APP + ".jpg");
  var CAP = D.cap || ("Loading " + APP + " ...");
  var NOTE = D.note || "";

  /* ★★ 2026-10-31 ご指定「アプリ開始時の企業ロゴとアプリロゴ表示時の背景は、アプリに合わせて変えて構いません」
     → アプリごとの地の色（THEMES：[上の色, 下の色, 文字の色, 小さい文字の色, ロードバーの色…, 影]）。
       企業ロゴの白い札はそのまま（ロゴの色を守る）。地・×・文字・ロードバー・影の色だけをアプリに合わせる。
       data-bg="#上の色,#下の色" で地だけ上書きもできる。ここに無いアプリと本体（data-home）はこれまでのクリーム色。 */
  var THEMES = {
    "MagiBattle":         ["#e4f3ff", "#ffe7f4", "#5a56d6", "#7d82b8", ["#20c4ff", "#8a5cff", "#ff4fa3"], "rgba(90,110,220,.2)"],
    "MagiAbyss":          ["#1d2250", "#3b1c50", "#f0cf7a", "#cbbd93", ["#ffd36b", "#ff9a3c", "#ff5d8f"], "rgba(0,0,0,.4)"],
    "MagiChemLex":        ["#e8f3ff", "#e2fbf3", "#2c74d6", "#7d97b6", ["#2f8cff", "#16c7a0"], "rgba(40,120,200,.18)"],
    "MagiLex":            ["#f2eaff", "#ffe9f6", "#7c3aed", "#9a8ab8", ["#7c3aed", "#c04dff", "#ff5fa2"], "rgba(124,58,237,.18)"],
    "MagiBurst":          ["#eee8ff", "#ffe6f3", "#7a5cf0", "#9a8ab8", ["#8e6bff", "#ff5d8f", "#ffb347"], "rgba(142,107,255,.2)"],
    "MagiQuiz":           ["#e8f0ff", "#fff0d8", "#3a64d8", "#8a93b0", ["#3a7bff", "#ff9d2e"], "rgba(58,100,216,.18)"],
    "MagiDerby":          ["#16603a", "#08281b", "#ffe08a", "#c3e8cc", ["#ffe08a", "#ffb347"], "rgba(0,0,0,.32)"],
    "MagiShift":          ["#edf3ff", "#e2e9ff", "#3d5bd8", "#8a96b8", ["#3d7bff", "#8a5cff"], "rgba(61,91,216,.17)"],
    "MagiChainParty":     ["#fff1e2", "#ecefff", "#f0602f", "#a89a8e", ["#ff6a3d", "#ffc23a", "#3aa0ff"], "rgba(255,120,60,.18)"],
    "MagiScope":          ["#0f1b40", "#190d34", "#7ff0ff", "#9eacd4", ["#5ef2ff", "#8a5cff"], "rgba(0,0,0,.4)"],
    "MagiCounter":        ["#e6efff", "#d6e5ff", "#1f6fe5", "#7f94bb", ["#1f6fe5", "#38c0ff"], "rgba(31,111,229,.18)"],
    "MagiRail":           ["#e4eeff", "#e1f6ff", "#1c5fc4", "#7f94bb", ["#1c5fc4", "#3ad0ff"], "rgba(28,95,196,.18)"],
    "MagiBocciaRush":     ["#181824", "#2a1430", "#ff7ad9", "#b8aacb", ["#ff5ad0", "#ffd36b"], "rgba(0,0,0,.4)"],
    "Magi Lotto":         ["#10173e", "#2c1254", "#ffd36b", "#b9b3d8", ["#ffd36b", "#ff7a3c"], "rgba(0,0,0,.4)"],
    "MagiJackpot":        ["#fbf3e4", "#f1dcb4", "#b07d06", "#a8957a", ["#ffcf5a", "#ff9a3c"], "rgba(180,130,40,.2)"],
    "MagiPortfolio":      ["#0e1424", "#132436", "#5df2b0", "#96a9c3", ["#2fd18a", "#38a6ff"], "rgba(0,0,0,.4)"],
    "MagiTier":           ["#f1f2fa", "#ffe9f1", "#e0447a", "#9a96b0", ["#ff5d8f", "#8e6bff"], "rgba(224,68,122,.16)"],
    "XEVYNAR":            ["#f2f4fb", "#e6edff", "#4b63ff", "#8a93b0", ["#4b63ff", "#9a62ff"], "rgba(75,99,255,.16)"],
    "MagiRanking":        ["#fff5d8", "#ffe6ed", "#c98000", "#a8957a", ["#ffc23a", "#ff6f91"], "rgba(212,138,0,.18)"],
    "Magi Dominion Grid": ["#e4eeff", "#e6f7ff", "#2f6fd0", "#7f94bb", ["#2f6fd0", "#16c7a0"], "rgba(47,111,208,.18)"],
    "MagiEmpire":         ["#f8eedd", "#eadac1", "#9a5d24", "#a08a72", ["#d4943a", "#a0632a"], "rgba(160,99,42,.18)"],
    "MagiCraft":          ["#e7f6e3", "#ddeeff", "#36923f", "#86a08a", ["#4cc35a", "#38a6ff"], "rgba(58,154,70,.18)"],
    "MagiLink":           ["#eaf2ff", "#f3eaff", "#5b6bff", "#8a93b0", ["#5b8cff", "#b06bff"], "rgba(91,107,255,.16)"],
    "MagiManor":          ["#f6ece3", "#eee3f6", "#9a5ca8", "#a0909e", ["#c77dff", "#ff9ec4"], "rgba(154,92,168,.17)"],
    "ORDYXIS":            ["#ffffff", "#ffe6e3", "#e5484d", "#a89090", ["#ff5a5a", "#ff9a3c"], "rgba(229,72,77,.16)"]
  };
  var TH = null;
  (function () {
    var t = D.home === "1" ? null : THEMES[APP];
    if (D.bg) { var cs = String(D.bg).split(","); t = (t || [null, null, "#c98a10", "#b6a596", ["#ff9d2e", "#ff5d8f", "#8e6bff"], "rgba(0,0,0,.18)"]).slice(); t[0] = cs[0]; t[1] = cs[1] || cs[0]; }
    if (!t) return;
    var g = "linear-gradient(160deg," + t[0] + "," + t[1] + ")";
    TH = { bg: g, vars: "--xs-bg:" + g + ";--xs-a:" + t[0] + ";--xs-b:" + t[1] + ";--xs-ink:" + t[2] + ";--xs-amp:" + t[2] + ";--xs-cap:" + t[3] +
      ";--xs-fill:linear-gradient(135deg," + t[4].join(",") + ");--xs-track:" + t[5].replace(/[\d.]+\)$/, ".22)") + ";--xs-sh:" + t[5] + ";--xs-appsh:" + t[5] };
  })();

  /* ── タイミング ──
     ★★ 2026-10-09b 起動を速く（ご指定「ホームやアプリの起動に時間がかかる」）。
       前は<b>毎回</b>「3社ロゴ 3.6秒 → アプリロゴ 最短1.65秒」で、読みこみが速くても約6秒かかっていた。
       ・3社ロゴは<b>そのタブで最初の1回だけ</b>（sessionStorage）。ホームとアプリを行き来するときは出さない
       ・時間を短く：3社ロゴ 1.6秒・アプリロゴ 最短0.6秒（2回目からは 0.25秒）
       ・画面をタップするとすぐ先へ進む（アプリ側の wait()＝読みこみ待ちはそのまま守る）
       ・3社ロゴは起動画面用の小さい絵（brand/*_s.webp・合計約30KB。元の png は合計2MB だった） */
  /* ★★ 2026-10-13 ご指定（企業ロゴ）：3社ロゴは<b>アプリを開くたびに毎回</b>出す。
       2回目からは短め（1.1秒）・タップで飛ばせる。アプリロゴの最短表示は 10-09b のまま（2回目から 0.25秒）。 */
  /* ★★ 2026-10-15 ご指定「XEVARION 起動時の企業ロゴ表示は、アプリロゴのロードバーを消してその下に表示して、少し長めに」
       → 本体（data-home="1"）は<b>1枚の画面</b>：XEVARION のロゴ → その下に3社ロゴ（ロードバーは出さない）。
         表示は 3.2 秒（前は 3社ロゴ 1.6 秒＋アプリロゴ 0.6 秒）。タップで飛ばせるのは同じ。
         ほかのアプリはこれまでどおりの2段（3社ロゴ → アプリロゴ＋ロードバー）。data-combo="1" を付ければ同じ1枚にできる。 */
  /* ★★ 2026-10-28 ご指定「XEVARION 起動時のロゴ表示は消して」「YRA が運営協力に参入 → 企業ロゴを縦2×横2で」
       → 本体（data-home="1"）の1枚の画面は<b>企業ロゴ 2×2 だけ</b>（XEVARION のロゴは出さない）。
         アプリの起動の①（企業ロゴ）も同じ 2×2。②（アプリのロゴ＋ロードバー）はこれまでどおり。 */
  var COMBO = D.home === "1" || D.combo === "1";
  var T_COMBO = 3200;
  /* ★★ 2026-11-03 ご指定「XEVARION 起動時の企業ロゴ表示を、NGX をはじめとする豪華な映画のロゴ風のアニメーションに」
     ＋（言い直し）「全てが平等に表示され、あまり演出が長すぎないように」
     → 本体（data-home="1"）の起動だけ、<b>映画の冒頭のような1つの場面</b>（約3.2秒）：
       黒い画面に光の線が走る → 白い光の一閃 → スポットライトの舞台・うしろに光の筋 → <b>6社の札が同じ大きさ・同じ瞬間に</b>奥から飛んでくる
       → 光の輪・そろって照り返しが走る・× ・光の粒が舞う。どの会社も同じ扱い（1社だけの場面は作らない）。
       画面をタップするといつでも飛ばせるのは同じ。アプリの起動（①企業ロゴ ②アプリのロゴ）はこれまでどおり。 */
  var CINE = D.home === "1";
  var RMO = false; try { RMO = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) {}
  var T_CINE = RMO ? 1500 : 3200;   // 場面の長さ（前の 6社同時の 3.2 秒と同じ）
  if (CINE) T_COMBO = T_CINE;
  var SEEN_KEY = "xev_splash_seen";
  var SEEN = false;
  try { SEEN = sessionStorage.getItem(SEEN_KEY) === "1"; sessionStorage.setItem(SEEN_KEY, "1"); } catch (e) {}
  var T_IN = 60;                    // 3社ロゴを出すまで
  /* ★★ 2026-10-20 ご報告「アプリ起動時に企業ロゴが表示される前に切り替わってしまう」
       真因は2つ：① 3社ロゴの時間（1.1秒）を<b>画像が届く前から</b>数えていた（届くのが遅いと白い札のまま次へ）
       ② 出てくる動き（最大1.04秒）が終わってから 0.06 秒で消えていた（2回目からの 1.1 秒）。
       → 画像が<b>描ける状態になってから</b>出して数える（最大 2.5 秒まで待つ）・出てきてから見える時間を確保（T_SHOW）。
       ③ ページの読みこみ（defer の JS）が終わるまで起動画面を作っていなかった（DOMContentLoaded 待ち）
       → body がまだ無くても &lt;html&gt; に置いてすぐ出す（中身より先に起動画面）。 */
  var T_ANIM = 1300;                // 企業ロゴが出てくる動きの長さ（★★ 2026-11-02 6社＝いちばん遅い札の .5s＋.8s）
  var T_SHOW = SEEN ? 1000 : 1400;  // 出きってから見せておく時間
  var T_HOLD = T_ANIM + T_SHOW;     // 3社ロゴの表示時間（画像がそろってから数える）
  var T_IMGWAIT = 2500;             // 画像を待つ上限
  var T_OUT = 320;                  // 3社ロゴのフェードアウト
  var T_BAR = SEEN ? 380 : 800;     // ロードバーが伸びきるまで
  var T_MAIN = SEEN ? 250 : 600;    // アプリロゴの最短表示時間（前は 1650）
  var T_FADE = 320;                 // 全体のフェードアウト
  var T_PRELOAD = 1500;             // 画像プリロードの上限
  var T_MAX = 15000;                // wait() が返ってこないときの保険

  var BRAND = [
    { src: BASE + "brand/NGX_s.webp?v=2", alt: "NGX" },
    { src: BASE + "brand/MagicalFuture_s.webp", alt: "Magical Future" },
    { src: BASE + "brand/ISHIDA_s.webp", alt: "ISHIDA Production" },
    { src: BASE + "brand/YRA_s.webp", alt: "YRA" },         /* ★★ 2026-10-28 運営協力に参入 */
    { src: BASE + "brand/Kawagani_s.webp", alt: "Kawagani" },     /* ★★ 2026-11-02 運営協力に参入 */
    { src: BASE + "brand/StudioDOGA_s.webp", alt: "STUDIO DOGA" } /* ★★ 2026-11-02 運営協力に参入 */
  ];
  /* タップで先へ（3社ロゴ・最短表示時間を飛ばす） */
  var skipRes = null, skipP = new Promise(function (r) { skipRes = r; });

  var ID = "xevaSplash";
  var holds = [];      // wait() で渡された Promise
  var closed = false;
  var el = null;

  /* ══ スタイル（MagiBurst の #splash をそのまま共通化したもの） ══ */
  var CSS =
    /* ★★ 2026-09-13 箱が画面より短いとき（アプリ表示）に下へ伸ばす。
       padding-bottom を同じぶん足すので、中の .xsph（inset:0）の位置は変わらない。 */
    "#" + ID + "{position:fixed;top:0;left:0;right:0;bottom:calc(-1 * var(--xv-under,0px));" +
    "padding-bottom:var(--xv-under,0px);z-index:2147483000;" +
    "background:var(--xs-bg,linear-gradient(160deg,#fff,#ffeede));transition:opacity .32s;" +
    "font-family:'Noto Sans JP',system-ui,-apple-system,'Segoe UI',sans-serif}" +
    "#" + ID + ".hide{opacity:0;pointer-events:none}" +
    /* ★★ 2026-09-06 「いちばん下まで色が届かない」対策（ご指定）。
       position:fixed の箱はアプリ表示だと画面より<b>短い</b>ことがあるので、
       痬似要素で<b>上下にもう 420px ずつ板を延ばす</b>。
       色はグラデーションの<b>端の色</b>にあわせる（引き伸ばさない）。
       さらに &lt;html&gt; の背景も同じ色に塗る（build の中）。 */
    "#" + ID + "::before,#" + ID + "::after{content:'';position:absolute;left:0;right:0;" +
    "height:420px;pointer-events:none}" +
    "#" + ID + "::before{bottom:100%;background:var(--xs-a,#fff)}" +
    "#" + ID + "::after{top:100%;background:var(--xs-b,#ffeede)}" +
    "#" + ID + " .xsph{position:absolute;inset:0;display:flex;flex-direction:column;" +
    "align-items:center;justify-content:center;gap:14px;opacity:0;padding:5vh 20px}" +
    "#" + ID + " .xsintro.in{opacity:1}" +
    "#" + ID + " .xsintro.out{opacity:0;transition:opacity .5s ease}" +
    "#" + ID + " .xslg{width:min(520px,86vw);border-radius:20px;overflow:hidden;background:#fff;" +
    "display:flex;align-items:center;justify-content:center;padding:10px 18px;" +
    "box-shadow:0 10px 30px var(--xs-sh,rgba(200,150,60,.14))}" +
    "#" + ID + " .xslg img{max-width:100%;max-height:14vh;object-fit:contain;display:block}" +
    "#" + ID + " .xstx{font-weight:800;letter-spacing:.1em;font-size:24px;color:var(--xs-ink,#c98a10)}" +
    "#" + ID + " .xsintro.in .xslg:nth-child(1){animation:xsUp .8s cubic-bezier(.2,.7,.3,1) both}" +
    "#" + ID + " .xsintro.in .xsamp:nth-child(2){animation:xsFade .8s ease .1s both}" +
    "#" + ID + " .xsintro.in .xslg:nth-child(3){animation:xsFade .8s cubic-bezier(.2,.7,.3,1) .12s both}" +
    "#" + ID + " .xsintro.in .xsamp:nth-child(4){animation:xsFade .8s ease .2s both}" +
    "#" + ID + " .xsintro.in .xslg:nth-child(5){animation:xsDown .8s cubic-bezier(.2,.7,.3,1) .24s both}" +
    "#" + ID + " .xsamp{color:var(--xs-amp,#d9a441);font-weight:800;font-size:24px}" +
    "#" + ID + " .xsmain{gap:22px}" +
    "#" + ID + " .xsmain.in{opacity:1;animation:xsFade .6s ease}" +
    "#" + ID + " .xsapp{width:min(200px,54vw);border-radius:30px;display:block;" +
    "box-shadow:0 16px 46px var(--xs-appsh,rgba(245,166,35,.35))}" +
    "#" + ID + " .xsbar{width:min(300px,68vw);height:8px;border-radius:99px;" +
    "background:var(--xs-track,rgba(245,166,35,.18));overflow:hidden}" +
    "#" + ID + " .xsbar i{display:block;height:100%;width:0;border-radius:99px;" +
    "background:var(--xs-fill,linear-gradient(135deg,#ff9d2e,#ff5d8f,#8e6bff))}" +
    "#" + ID + " .xscap{color:var(--xs-cap,#b6a596);font-size:13px;letter-spacing:.22em;text-align:center}" +
    "#" + ID + " .xsnote{font-size:11.5px;font-weight:800;color:var(--xs-ink,#c98a10);letter-spacing:.04em;text-align:center}" +
    /* ★★ 2026-10-15 1枚の起動画面（本体）：アプリロゴの下に3社ロゴ。広い画面は横1列、せまい画面（520px 以下）は縦に */
    "#" + ID + " .xsmain.combo{gap:20px}" +
    "#" + ID + " .xsmain.combo .xsapp{width:min(176px,44vw)}" +
    "#" + ID + " .xsmain.combo.in .xsapp{animation:xsUp .7s cubic-bezier(.2,.7,.3,1) both}" +
    "#" + ID + " .xsbrands{display:flex;align-items:center;justify-content:center;gap:8px;width:min(600px,94vw)}" +
    "#" + ID + " .xsbrands .xslg{width:auto;flex:1 1 0;min-width:0;padding:6px 8px;border-radius:16px;box-shadow:0 8px 22px var(--xs-sh,rgba(200,150,60,.13))}" +
    "#" + ID + " .xsbrands .xslg img{width:100%;max-height:13vh}" +
    "#" + ID + " .xsbrands .xsamp{font-size:17px;flex:none}" +
    "#" + ID + " .xsbrands .xstx{font-size:15px}" +
    "#" + ID + " .xsmain.combo .xscap{font-size:11.5px;letter-spacing:.2em;margin-top:-4px}" +
    "#" + ID + " .xsmain.combo.in .xsbrands>*{animation:xsFade .7s ease both}" +
    "#" + ID + " .xsmain.combo.in .xsbrands>:nth-child(1){animation:xsUp .7s cubic-bezier(.2,.7,.3,1) .25s both}" +
    "#" + ID + " .xsmain.combo.in .xsbrands>:nth-child(2){animation-delay:.38s}" +
    "#" + ID + " .xsmain.combo.in .xsbrands>:nth-child(3){animation:xsUp .7s cubic-bezier(.2,.7,.3,1) .45s both}" +
    "#" + ID + " .xsmain.combo.in .xsbrands>:nth-child(4){animation-delay:.58s}" +
    "#" + ID + " .xsmain.combo.in .xsbrands>:nth-child(5){animation:xsUp .7s cubic-bezier(.2,.7,.3,1) .65s both}" +
    "#" + ID + " .xsmain.combo.in .xscap{animation:xsFade .8s ease .9s both}" +
    "@media (max-width:520px){#" + ID + " .xsbrands{flex-direction:column;gap:5px;width:min(290px,74vw)}" +
    "#" + ID + " .xsbrands .xslg{width:100%;flex:none;padding:4px 10px}" +
    "#" + ID + " .xsbrands .xslg img{width:auto;max-width:100%;max-height:10.5vh}" +
    "#" + ID + " .xsbrands .xsamp{font-size:14px;line-height:1}}" +
    /* ★★ 2026-10-28 企業ロゴは<b>縦2×横2</b>（YRA が加わって4社）。まん中に小さな「×」。
       横向きのスマホでも2段が画面に収まるよう、幅は高さからも決める（(高さの78% − すき間) × 1.5）。 */
    /* ★★ 2026-11-02 Kawagani・STUDIO DOGA が加わって6社＝<b>縦3×横2</b>。高さ (幅−12)/2/1.5 の段が3つ＋すき間2つ ≤ 74% → 幅 ≤ 74% − 24 + 12 */
    "#" + ID + " .xsgrid{position:relative;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;" +
    "width:min(520px,90vw);width:min(520px,90vw,calc(74vh - 12px));width:min(520px,90vw,calc(74dvh - 12px))}" +
    "#" + ID + " .xsgrid .xslg{width:auto;aspect-ratio:3/2;padding:6px 10px;border-radius:18px;box-shadow:0 10px 26px var(--xs-sh,rgba(200,150,60,.14))}" +
    "#" + ID + " .xsgrid .xslg img{width:100%;height:100%;max-height:none;object-fit:contain}" +
    "#" + ID + " .xsgrid .xstx{display:flex;align-items:center;justify-content:center;aspect-ratio:3/2;background:#fff;border-radius:18px;font-size:16px}" +
    "#" + ID + " .xsx{position:absolute;left:50%;top:50%;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;background:#fff;" +
    "color:var(--xs-amp,#d9a441);font:800 16px/26px system-ui,-apple-system,sans-serif;text-align:center;font-style:normal;box-shadow:0 2px 10px var(--xs-sh,rgba(200,150,60,.28));z-index:1;pointer-events:none}" +
    /* ★★ 2026-11-02 ご指定「×は真ん中の上と下の真ん中の隙間に以前のように」→ 縦3段なので×は2つ（1・2段目の間と2・3段目の間の、まん中の縦のすき間） */
    "#" + ID + " .xsx.x1{top:calc((100% - 24px) / 3 + 6px)}#" + ID + " .xsx.x2{top:calc((100% - 24px) * 2 / 3 + 18px)}" +
    /* ★★ 2026-11-03 ご指定「始めの企業ロゴ表示は全てが一斉に演出で表示されるように」：
       前は1社ずつ 0.1 秒ずつずれて出ていた → 6社が<b>同時に</b>起き上がり（ぼかし→くっきり）、うしろに光の輪、そろって光が横切り、最後に × */
    "#" + ID + " .xsgrid{perspective:900px}" +
    "#" + ID + " .xsgrid::before{content:'';position:absolute;left:50%;top:50%;width:140%;aspect-ratio:1;transform:translate(-50%,-50%) scale(.2);border-radius:50%;pointer-events:none;opacity:0;" +
    "background:radial-gradient(circle,rgba(255,255,255,.95),var(--xs-track,rgba(245,166,35,.25)) 38%,transparent 66%)}" +
    "#" + ID + " .xsph.in .xsgrid::before{animation:xsRing 1.1s cubic-bezier(.2,.8,.3,1) both}" +
    "#" + ID + " .xsgrid .xslg,#" + ID + " .xsgrid .xstx{position:relative;overflow:hidden}" +
    "#" + ID + " .xsgrid .xslg::after{content:'';position:absolute;inset:0;pointer-events:none;transform:translateX(-120%);" +
    "background:linear-gradient(105deg,transparent 35%,rgba(255,255,255,.85) 50%,transparent 65%)}" +
    "#" + ID + " .xsph.in .xsgrid>.xslg,#" + ID + " .xsph.in .xsgrid>.xstx{animation:xsAll .85s cubic-bezier(.2,.8,.3,1.12) both}" +
    "#" + ID + " .xsph.in .xsgrid>.xslg::after{animation:xsShine .9s ease .55s both}" +
    "#" + ID + " .xsph.in .xsx{animation:xsXPop .5s cubic-bezier(.2,1.6,.4,1) .7s both}" +
    "@keyframes xsAll{0%{opacity:0;transform:rotateX(70deg) scale(.8);filter:blur(8px) brightness(1.8)}60%{opacity:1;filter:blur(0) brightness(1.15)}100%{opacity:1;transform:none;filter:none}}" +
    "@keyframes xsRing{0%{opacity:0;transform:translate(-50%,-50%) scale(.2)}35%{opacity:.9}100%{opacity:0;transform:translate(-50%,-50%) scale(1.15)}}" +
    "@keyframes xsShine{to{transform:translateX(120%)}}" +
    "@keyframes xsXPop{from{opacity:0;transform:scale(0) rotate(-90deg)}to{opacity:1;transform:none}}" +
    "#" + ID + " .xsmain.combo{gap:18px}" +
    "#" + ID + " .xsmain.combo.in .xscap{animation:xsFade .8s ease .7s both}" +
    "@keyframes xsPop{from{opacity:0;transform:translateY(14px) scale(.93)}to{opacity:1;transform:none}}" +
    "@keyframes xsUp{from{opacity:0;transform:translateY(26px)}to{opacity:1;transform:none}}" +
    "@keyframes xsDown{from{opacity:0;transform:translateY(-26px)}to{opacity:1;transform:none}}" +
    "@keyframes xsFade{from{opacity:0}to{opacity:1}}";

  /* ★★ 2026-11-03 本体の映画風の起動（CINE）。1つの場面 .xc2 に6社（下の .xsgrid をそのまま使い、動きだけ映画風に上書き）。
     時間割（.in を付けてから）：光の線 0〜1.0秒 → 白い一閃 .35秒 → 舞台・スポットライト・うしろの光の筋 → 6社が同時に飛んでくる .45〜1.45秒
     → 光の輪 .9秒 → そろって照り返し 1.35秒 → × 1.45秒 → 光の粒 → 3.2秒で閉じる。6社とも同じ大きさ・同じ動き・同じ瞬間。 */
  if (CINE) {
    var P = "#" + ID;
    CSS +=
      P + ".cine{background:#000;color:#fff}" +
      P + ".cine .xsph{padding:0}" +
      P + " .xc2{overflow:hidden;background:radial-gradient(72% 60% at 50% 40%,#28326e 0%,#10163a 50%,#05060f 100%)}" +
      P + " .xc2.in{opacity:1}" +
      /* はじめは黒（舞台は白い一閃のあとに見える） */
      P + " .xc-black{position:absolute;inset:0;background:#000;z-index:4;pointer-events:none}" +
      P + " .xc2.in .xc-black{animation:xcOff .55s ease .3s both}" +
      P + " .xc-streak{position:absolute;left:50%;top:50%;width:150vw;height:3px;margin:-1.5px 0 0 -75vw;border-radius:50%;opacity:0;transform:scaleX(0);pointer-events:none;z-index:6;" +
        "background:linear-gradient(90deg,transparent,rgba(160,190,255,0) 8%,rgba(190,214,255,.9) 42%,#fff 50%,rgba(190,214,255,.9) 58%,rgba(160,190,255,0) 92%,transparent);" +
        "box-shadow:0 0 22px 5px rgba(150,180,255,.5)}" +
      P + " .xc2.in .xc-streak{animation:xcStreak 1s cubic-bezier(.2,.8,.2,1) both}" +
      P + " .xc-flash{position:absolute;inset:0;pointer-events:none;opacity:0;z-index:5;background:radial-gradient(circle at 50% 50%,#ffffff,rgba(200,215,255,.75) 36%,rgba(200,215,255,0) 78%)}" +
      P + " .xc2.in .xc-flash{animation:xcFlash .75s ease-out .3s both}" +
      P + " .xc-rays{position:absolute;left:50%;top:48%;width:170vmax;height:170vmax;margin:-85vmax 0 0 -85vmax;opacity:0;pointer-events:none;" +
        "background:repeating-conic-gradient(from 0deg,rgba(170,195,255,.16) 0 3deg,transparent 3deg 11deg);" +
        "-webkit-mask:radial-gradient(circle,#000 0,rgba(0,0,0,.55) 16%,transparent 46%);mask:radial-gradient(circle,#000 0,rgba(0,0,0,.55) 16%,transparent 46%)}" +
      P + " .xc2.in .xc-rays{animation:xcRays 3.2s ease-out .45s both}" +
      P + " .xc-spot{position:absolute;top:-12%;width:70vw;height:140%;pointer-events:none;opacity:0;transform-origin:50% 0;" +
        "background:linear-gradient(180deg,rgba(200,216,255,.42),rgba(200,216,255,.08) 62%,transparent);clip-path:polygon(44% 0,56% 0,100% 100%,0 100%);filter:blur(5px)}" +
      P + " .xc-spot.a{left:-20vw}" + P + " .xc-spot.b{right:-20vw}" +
      P + " .xc2.in .xc-spot.a{animation:xcSpotA 2.6s ease-in-out .4s both}" +
      P + " .xc2.in .xc-spot.b{animation:xcSpotB 2.6s ease-in-out .4s both}" +
      P + " .xc-floor{position:absolute;left:50%;bottom:4%;width:130vw;height:34vh;margin-left:-65vw;pointer-events:none;background:radial-gradient(50% 50% at 50% 50%,rgba(120,140,255,.3),transparent 70%)}" +
      P + " .xc-dust{position:absolute;inset:0;pointer-events:none}" +
      P + " .xc-dust i{position:absolute;width:var(--s);height:var(--s);border-radius:50%;opacity:0;background:radial-gradient(circle,#ffffff,rgba(190,210,255,.75) 45%,transparent 70%)}" +
      P + " .xc2.in .xc-dust i{animation:xcDust var(--t) ease-in-out var(--d) both}" +
      P + ".cine .xc2 .xsgrid{perspective:1000px}" +
      P + ".cine .xsgrid::before{background:radial-gradient(circle,rgba(255,255,255,.9),rgba(140,160,255,.35) 38%,transparent 66%)}" +
      P + ".cine .xsph.xc2.in .xsgrid::before{animation:xsRing 1.1s cubic-bezier(.2,.8,.3,1) .9s both}" +
      P + ".cine .xsgrid .xslg{box-shadow:0 16px 44px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.45),0 0 34px rgba(120,150,255,.3)}" +
      P + ".cine .xsph.xc2.in .xsgrid>.xslg," + P + ".cine .xsph.xc2.in .xsgrid>.xstx{animation:xcFly 1s cubic-bezier(.16,.84,.24,1) .45s both}" +
      P + ".cine .xsph.xc2.in .xsgrid>.xslg::after{animation:xsShine .9s ease 1.35s both}" +
      P + ".cine .xsph.xc2.in .xsx{animation:xsXPop .45s cubic-bezier(.2,1.6,.4,1) 1.45s both}" +
      P + ".cine .xsx{color:#d9a441}" +
      P + ".cine .xscap{color:rgba(214,224,255,.62);margin-top:6px}" +
      P + ".cine .xc2.in .xscap{animation:xsFade .7s ease 1.5s both}" +
      P + ".cine .xsnote{color:#ffd57a}" +
      P + ".cine.rm *{animation-duration:.01s!important;animation-delay:0s!important}" +
      "@keyframes xcOff{from{opacity:1}to{opacity:0}}" +
      "@keyframes xcRays{0%{opacity:0;transform:rotate(-8deg) scale(.9)}35%{opacity:1}100%{opacity:.85;transform:rotate(10deg) scale(1.05)}}" +
      "@keyframes xcStreak{0%{opacity:0;transform:scaleX(0)}30%{opacity:1}60%{opacity:1;transform:scaleX(1)}100%{opacity:0;transform:scaleX(1.1) scaleY(.4)}}" +
      "@keyframes xcDust{0%{opacity:0;transform:translate(0,0)}20%{opacity:.95}100%{opacity:0;transform:translate(var(--dx),-24vh)}}" +
      "@keyframes xcFlash{0%{opacity:0}25%{opacity:.9}100%{opacity:0}}" +
      "@keyframes xcSpotA{0%{opacity:0;transform:rotate(-42deg)}30%{opacity:1}100%{opacity:.85;transform:rotate(-16deg)}}" +
      "@keyframes xcSpotB{0%{opacity:0;transform:rotate(42deg)}30%{opacity:1}100%{opacity:.85;transform:rotate(16deg)}}" +
      "@keyframes xcFly{0%{opacity:0;transform:translateZ(-560px) rotateX(50deg) translateY(18%);filter:blur(10px) brightness(2)}60%{opacity:1;filter:blur(0) brightness(1.25)}100%{opacity:1;transform:none;filter:none}}";
  }

  /* 旧スプラッシュが下でチラつかないように隠す（data-keep-legacy="1" で無効化） */
  var LEGACY = "#splash,#mlx-splash,#mb-splash,#mcp-splash,#me-splash,#mp-splash," +
               "#mc-splash,#ml-splash,#mm-splash,#ordyxis-splash,#mr-splash";
  if (!D.keepLegacy) CSS += LEGACY + "{display:none!important}";

  var st = document.createElement("style");
  st.id = "xevaSplashCss";
  st.textContent = CSS;
  (document.head || document.documentElement).appendChild(st);

  /* ══ DOM ══ */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  /* ロゴ画像が無い環境でも真っ白にならないよう、読み込み失敗時は社名テキストに差し替える */
  function brandCard(b) {
    return '<div class="xslg"><img src="' + esc(b.src) + '" alt="' + esc(b.alt) + '" ' +
      "onerror=\"this.parentNode.outerHTML='<div class=&quot;xstx&quot;>" + esc(b.alt) + "</div>'\"></div>";
  }
  /* ★★ 2026-10-28 企業ロゴ 4社を縦2×横2で → ★★ 2026-11-02 6社を縦3×横2で */
  function brandGrid() {
    return '<div class="xsgrid">' + BRAND.map(brandCard).join("") + '<i class="xsx x1" aria-hidden="true">×</i><i class="xsx x2" aria-hidden="true">×</i></div>';
  }

  /* ★ &lt;html&gt; の背景をスプラッシュと同じにする（箱の外はここしか塗れない） */
  var SPLASH_BG = CINE ? "#000" : TH ? TH.bg : "linear-gradient(160deg,#fff,#ffeede)";   /* ★★ 2026-10-31 アプリごとの地の色（THEMES）・★★ 2026-11-03 本体の映画風は黒 */
  /* ★★ 2026-11-03 ① NGX の場面の金の粒（位置・大きさ・時間はばらばらに） */
  function dustHTML(n) {
    var s = "";
    for (var i = 0; i < n; i++) {
      var r = function (a, b) { return a + Math.random() * (b - a); };
      s += '<i style="left:' + r(8, 92).toFixed(1) + "%;top:" + r(40, 86).toFixed(1) + "%;--s:" + r(2, 6).toFixed(1) + "px;--t:" + r(1.8, 3.2).toFixed(2) +
        "s;--d:" + r(0.5, 1.9).toFixed(2) + "s;--dx:" + r(-30, 30).toFixed(0) + 'px"></i>';
    }
    return '<div class="xc-dust">' + s + "</div>";
  }
  function paintHtml(on) {
    if (window.xvPaintHtml) { window.xvPaintHtml("xevaSplash", on ? SPLASH_BG : null); return; }
    try { document.documentElement.style.background = on ? SPLASH_BG : ""; } catch (e) {}
  }
  function build() {
    if (el || closed) return;
    paintHtml(true);
    el = document.createElement("div");
    el.id = ID;
    if (TH) el.style.cssText = TH.vars;
    if (CINE) {
      /* ★★ 2026-11-03 本体：映画風の1場面（6社が同じ大きさ・同じ瞬間に）。タップで飛ばせる */
      el.className = "cine" + (RMO ? " rm" : "");
      el.style.cssText = "--xs-bg:#000;--xs-a:#000;--xs-b:#05060f;--xs-sh:rgba(0,0,0,.55);--xs-track:rgba(140,160,255,.3)";
      el.innerHTML =
        '<div class="xsph xsmain combo xc2"><i class="xc-rays"></i><i class="xc-spot a"></i><i class="xc-spot b"></i><i class="xc-floor"></i>' + dustHTML(22) +
          brandGrid() +
          '<div class="xscap">' + esc(CAP) + "</div>" +
          (NOTE ? '<div class="xsnote">' + esc(NOTE) + "</div>" : "") +
          '<i class="xc-black"></i><i class="xc-flash"></i><i class="xc-streak"></i>' +
        "</div>";
      (document.body || document.documentElement).appendChild(el);
      el.addEventListener("pointerdown", function () { if (skipRes) skipRes(); }, { passive: true });
      runCine();
      return;
    }
    if (COMBO) {
      /* ★★ 2026-10-15 本体：XEVARION のロゴ → その下に3社ロゴ（ロードバーなし）
         ★★ 2026-10-28 ご指定で XEVARION のロゴは出さない・企業ロゴは 2×2（YRA が加わって4社） */
      el.innerHTML =
        '<div class="xsph xsmain combo">' +
          brandGrid() +
          '<div class="xscap">' + esc(CAP) + "</div>" +
          (NOTE ? '<div class="xsnote">' + esc(NOTE) + "</div>" : "") +
        "</div>";
      (document.body || document.documentElement).appendChild(el);
      el.addEventListener("pointerdown", function () { if (skipRes) skipRes(); }, { passive: true });
      runCombo();
      return;
    }
    el.innerHTML =
      '<div class="xsph xsintro">' + brandGrid() + "</div>" +
      '<div class="xsph xsmain">' +
        '<img class="xsapp" src="' + esc(LOGO) + '" alt="' + esc(APP) + '" onerror="this.style.display=\'none\'">' +
        '<div class="xsbar"><i></i></div>' +
        '<div class="xscap">' + esc(CAP) + "</div>" +
        (NOTE ? '<div class="xsnote">' + esc(NOTE) + "</div>" : "") +
      "</div>";
    (document.body || document.documentElement).appendChild(el);
    el.addEventListener("pointerdown", function () { if (skipRes) skipRes(); }, { passive: true });
    run();
  }

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* ★★ 2026-10-20 起動画面の中の画像（3社ロゴ・アプリロゴ）が<b>描ける状態</b>になるまで待つ（decode）。上限 T_IMGWAIT */
  function imgsReady(box) {
    var ims = box ? Array.prototype.slice.call(box.querySelectorAll("img")) : [];
    var one = function (im) {
      if (im.complete && im.naturalWidth) return im.decode ? im.decode().catch(function () {}) : Promise.resolve();
      return new Promise(function (r) {
        im.addEventListener("load", function () { (im.decode ? im.decode() : Promise.resolve()).catch(function () {}).then(r); }, { once: true });
        im.addEventListener("error", r, { once: true });
      });
    };
    return Promise.race([Promise.all(ims.map(one)), sleep(T_IMGWAIT), skipP]);
  }
  function preload() {
    var srcs = BRAND.map(function (b) { return b.src; }).concat(COMBO ? [] : [LOGO]);   /* ★★ 2026-10-28 本体はアプリのロゴを出さない */
    return new Promise(function (res) {
      var n = srcs.length, fin = false;
      var done = function () { if (!fin) { fin = true; res(); } };
      var t = setTimeout(done, T_PRELOAD);
      srcs.forEach(function (s) {
        var im = new Image();
        im.onload = im.onerror = function () { if (--n <= 0) { clearTimeout(t); done(); } };
        im.src = s;
      });
    });
  }

  /* ★★ 2026-10-15 本体の1枚の起動画面：ロゴを 3.2 秒（タップで飛ばせる）＋画像・アプリ側の wait() を待って閉じる */
  async function runCombo() {
    var main = el.querySelector(".xsmain");
    var pre = preload();
    /* ★★ 2026-10-20 ロゴの画像がそろってから出して、そこから 3.2 秒 */
    await imgsReady(main);
    await sleep(T_IN);
    main.classList.add("in");
    await Promise.race([
      Promise.all([Promise.race([pre, skipP]), Promise.race([sleep(T_COMBO), skipP])].concat(holds.map(function (p) {
        return Promise.resolve(p).catch(function () {});
      }))),
      sleep(T_MAX)
    ]);
    hide();
  }

  /* ★★ 2026-11-03 本体の映画風：6社の場面（T_CINE＝3.2秒・タップで飛ばせる）＋画像・アプリ側の wait() を待って閉じる */
  async function runCine() {
    var sc = el.querySelector(".xc2");
    var pre = preload();
    await imgsReady(el);
    await sleep(T_IN);
    sc.classList.add("in");
    await Promise.race([
      Promise.all([Promise.race([pre, skipP]), Promise.race([sleep(T_CINE), skipP])].concat(holds.map(function (p) {
        return Promise.resolve(p).catch(function () {});
      }))),
      sleep(T_MAX)
    ]);
    hide();
  }

  async function run() {
    var intro = el.querySelector(".xsintro");
    var main = el.querySelector(".xsmain");
    var fill = el.querySelector(".xsbar i");

    var pre = preload();
    /* ★★ 2026-10-13 3社ロゴは毎回（10-09b の「2回目からは出さない」をやめた・ご指定）
       ★★ 2026-10-20 画像がそろってから出して、出きってからも見える時間をとる（T_HOLD＝動き＋T_SHOW） */
    await imgsReady(intro);
    await sleep(T_IN);
    intro.classList.add("in");
    await Promise.race([sleep(T_HOLD), skipP]);
    intro.classList.remove("in");
    intro.classList.add("out");
    await sleep(T_OUT);
    intro.style.display = "none";

    main.classList.add("in");
    setTimeout(function () {
      fill.style.transition = "width " + T_BAR + "ms cubic-bezier(.3,.7,.3,1)";
      fill.style.width = "100%";
    }, 40);

    /* 画像プリロード・アプリ側の wait()・最短表示時間 が全部そろうまで待つ。
       どれかが返ってこなくても T_MAX で必ず先へ進める。 */
    await Promise.race([
      Promise.all([Promise.race([pre, skipP]), Promise.race([sleep(T_MAIN), skipP])].concat(holds.map(function (p) {
        return Promise.resolve(p).catch(function () {});
      }))),
      sleep(T_MAX)
    ]);
    hide();
  }

  function hide() {
    if (closed) return;
    closed = true;
    var e = el || document.getElementById(ID);
    if (e) {
      e.classList.add("hide");
      setTimeout(function () { if (e.parentNode) e.parentNode.removeChild(e); paintHtml(false); }, T_FADE);
    }
    try { window.dispatchEvent(new CustomEvent("xeva:splash-done")); } catch (err) {}
  }

  window.XevaSplash = {
    /* 起動処理が終わるまでスプラッシュを保持する（最短表示時間とは別に待つ） */
    wait: function (p) { if (p) holds.push(p); return this; },
    hide: hide,
    /* wait() したうえで「スプラッシュが閉じるまで」待つ Promise を返す。
       アプリ側は `await XevaSplash.done(preload())` の1行で済む。 */
    done: function (p) {
      this.wait(p);
      if (closed) return Promise.resolve();
      return new Promise(function (r) {
        window.addEventListener("xeva:splash-done", function () { r(); }, { once: true });
        setTimeout(r, T_MAX + (COMBO ? T_COMBO : T_HOLD));   // 保険（イベントを取り逃しても進む）
      });
    },
    get app() { return APP; }
  };

  /* ★★ 2026-10-20 body がまだ無くても（&lt;head&gt; で読まれたとき）すぐ作る＝&lt;html&gt; の直下に置く。
     前は DOMContentLoaded（defer の JS をぜんぶ読み終わったあと）まで待っていたので、
     そのあいだにホームやアプリの画面が先に見えて、あとから起動画面が出ていた。 */
  build();
})();
