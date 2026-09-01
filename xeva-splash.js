/* ============================================================
   XEVA-Splash — XEVARION 全アプリ共通の起動スプラッシュ
   ------------------------------------------------------------
   MagiBurst のスプラッシュを「正」として、ホームに並ぶアプリの
   ロゴ表示・ロード表示をこの1ファイルに統一する。
   （以前はアプリごとに #splash / #mlx-splash / #ordyxis-splash …と
     別実装で、背景色もタイミングもバラバラだった）

   構成（MagiBurst と同じ2段）:
     ① NGX × Magical Future × ISHIDA Production の3社ロゴ
     ② アプリロゴ ＋ ロードバー ＋ "Loading <App> ..."

   使い方（<head> に、defer なしで置く）:
     <script src="../xeva-splash.js?v=3"
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
    function sync() {
      var p = getProbe();
      var h = 0;
      if (p) { try { h = Math.round(p.getBoundingClientRect().height); } catch (e) { h = 0; } }
      if (h <= 200) h = Math.round(window.innerHeight || 0);
      if (h > 200) root.style.setProperty("--app-vh", h + "px");
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

  /* ── タイミング（MagiBurst と同一） ── */
  var T_IN = 60;        // 3社ロゴを出すまで
  var T_HOLD = 3600;    // 3社ロゴの表示時間
  var T_OUT = 520;      // 3社ロゴのフェードアウト
  var T_BAR = 1400;     // ロードバーが伸びきるまで
  var T_MAIN = 1650;    // アプリロゴの最短表示時間
  var T_FADE = 560;     // 全体のフェードアウト
  var T_PRELOAD = 2600; // 画像プリロードの上限
  var T_MAX = 15000;    // wait() が返ってこないときの保険

  var BRAND = [
    { src: BASE + "brand/NGX.png", alt: "NGX" },
    { src: BASE + "brand/MagicalFuture.png", alt: "Magical Future" },
    { src: BASE + "brand/ISHIDA Production.png", alt: "ISHIDA Production" }
  ];

  var ID = "xevaSplash";
  var holds = [];      // wait() で渡された Promise
  var closed = false;
  var el = null;

  /* ══ スタイル（MagiBurst の #splash をそのまま共通化したもの） ══ */
  var CSS =
    "#" + ID + "{position:fixed;inset:0;z-index:2147483000;" +
    "background:linear-gradient(160deg,#fff,#ffeede);transition:opacity .55s;" +
    "font-family:'Noto Sans JP',system-ui,-apple-system,'Segoe UI',sans-serif}" +
    "#" + ID + ".hide{opacity:0;pointer-events:none}" +
    "#" + ID + " .xsph{position:absolute;inset:0;display:flex;flex-direction:column;" +
    "align-items:center;justify-content:center;gap:14px;opacity:0;padding:5vh 20px}" +
    "#" + ID + " .xsintro.in{opacity:1}" +
    "#" + ID + " .xsintro.out{opacity:0;transition:opacity .5s ease}" +
    "#" + ID + " .xslg{width:min(520px,86vw);border-radius:20px;overflow:hidden;background:#fff;" +
    "display:flex;align-items:center;justify-content:center;padding:10px 18px;" +
    "box-shadow:0 10px 30px rgba(200,150,60,.14)}" +
    "#" + ID + " .xslg img{max-width:100%;max-height:14vh;object-fit:contain;display:block}" +
    "#" + ID + " .xstx{font-weight:800;letter-spacing:.1em;font-size:24px;color:#c98a10}" +
    "#" + ID + " .xsintro.in .xslg:nth-child(1){animation:xsUp .8s cubic-bezier(.2,.7,.3,1) both}" +
    "#" + ID + " .xsintro.in .xsamp:nth-child(2){animation:xsFade .8s ease .1s both}" +
    "#" + ID + " .xsintro.in .xslg:nth-child(3){animation:xsFade .8s cubic-bezier(.2,.7,.3,1) .12s both}" +
    "#" + ID + " .xsintro.in .xsamp:nth-child(4){animation:xsFade .8s ease .2s both}" +
    "#" + ID + " .xsintro.in .xslg:nth-child(5){animation:xsDown .8s cubic-bezier(.2,.7,.3,1) .24s both}" +
    "#" + ID + " .xsamp{color:#d9a441;font-weight:800;font-size:24px}" +
    "#" + ID + " .xsmain{gap:22px}" +
    "#" + ID + " .xsmain.in{opacity:1;animation:xsFade .6s ease}" +
    "#" + ID + " .xsapp{width:min(200px,54vw);border-radius:30px;display:block;" +
    "box-shadow:0 16px 46px rgba(245,166,35,.35)}" +
    "#" + ID + " .xsbar{width:min(300px,68vw);height:8px;border-radius:99px;" +
    "background:rgba(245,166,35,.18);overflow:hidden}" +
    "#" + ID + " .xsbar i{display:block;height:100%;width:0;border-radius:99px;" +
    "background:linear-gradient(135deg,#ff9d2e,#ff5d8f,#8e6bff)}" +
    "#" + ID + " .xscap{color:#b6a596;font-size:13px;letter-spacing:.22em;text-align:center}" +
    "#" + ID + " .xsnote{font-size:11.5px;font-weight:800;color:#c98a10;letter-spacing:.04em;text-align:center}" +
    "@keyframes xsUp{from{opacity:0;transform:translateY(26px)}to{opacity:1;transform:none}}" +
    "@keyframes xsDown{from{opacity:0;transform:translateY(-26px)}to{opacity:1;transform:none}}" +
    "@keyframes xsFade{from{opacity:0}to{opacity:1}}";

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

  function build() {
    if (el || closed) return;
    el = document.createElement("div");
    el.id = ID;
    el.innerHTML =
      '<div class="xsph xsintro">' +
        brandCard(BRAND[0]) + '<div class="xsamp">×</div>' +
        brandCard(BRAND[1]) + '<div class="xsamp">×</div>' +
        brandCard(BRAND[2]) +
      "</div>" +
      '<div class="xsph xsmain">' +
        '<img class="xsapp" src="' + esc(LOGO) + '" alt="' + esc(APP) + '" onerror="this.style.display=\'none\'">' +
        '<div class="xsbar"><i></i></div>' +
        '<div class="xscap">' + esc(CAP) + "</div>" +
        (NOTE ? '<div class="xsnote">' + esc(NOTE) + "</div>" : "") +
      "</div>";
    (document.body || document.documentElement).appendChild(el);
    run();
  }

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function preload() {
    var srcs = BRAND.map(function (b) { return b.src; }).concat([LOGO]);
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

  async function run() {
    var intro = el.querySelector(".xsintro");
    var main = el.querySelector(".xsmain");
    var fill = el.querySelector(".xsbar i");

    var pre = preload();
    setTimeout(function () { intro.classList.add("in"); }, T_IN);
    await sleep(T_HOLD);

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
      Promise.all([pre, sleep(T_MAIN)].concat(holds.map(function (p) {
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
      setTimeout(function () { if (e.parentNode) e.parentNode.removeChild(e); }, T_FADE);
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
        setTimeout(r, T_MAX + T_HOLD);   // 保険（イベントを取り逃しても進む）
      });
    },
    get app() { return APP; }
  };

  if (document.body) build();
  else document.addEventListener("DOMContentLoaded", build, { once: true });
})();
