/* ============================================================
   XEVA-Loading — XEVA を表示するページ共通の「同期しています」画面
   ------------------------------------------------------------
   ・ページを開いた時点の localStorage は「前回この端末で保存した値」なので、
     別端末で使ったぶんの増減が反映されておらず、残高が古いまま見えることがある。
   ・xeva-cloud.js のクラウド取り込み完了（xeva:synced）まで画面をおおい、
     終わってから数字を見せることで「XEVAが変化しない」状態を防ぐ。
   ・オフライン／未ログイン／同期が長引く場合はタイムアウトで先へ進む（待たせ続けない）。

   ★★ 2026-09-06 刷新（ご指定）
     ・案内役の女の子が<b>立ち絵</b>と<b>お辞儀</b>を交互にくり返す。
       ★★ 2026-09-06b 出るのは<b>1人だけ</b>（ご指定）。
       絵は img/ld_a_stand.webp ／ ld_a_bow.webp。
     ・<b>いちばん下まで色が届く</b>ようにした。position:fixed の箱はアプリ表示だと
       画面より短いことがあるので、
         ① &lt;html&gt; の背景を同じ色に塗る（xvPaintHtml）
         ② 板を上下にはみ出させる（class="xv-bleed"）
       の<b>両方</b>を使う。①②は xeva-safebottom.js が持っているので、
       読まれていないページでは<b>自分で読みこむ</b>。

   使い方: <script src="../xeva-loading.js?v=10" defer></script>
   ============================================================ */
(function () {
  "use strict";

  var ID = "xevaLoadVeil";
  var TIMEOUT = 6500;      // これ以上は待たない
  /* ★★ 2026-09-07 ご報告「ロード中にお辞儀できる時間がない」。
     前は 1150ms でしたので、同期が早いと立ち絵のまま消えていました。
     ★ <b>1回めだけ FIRST_SWAP</b>（短め）で入れかえるので、出てすぐお辞儀する。 */
  var MIN_SHOW = 780;      // 一瞬だけチラつくのを防ぐ（お辞儀を1回は必ず見せる）
  var FIRST_SWAP = 220;    // 出てから「1回目のお辞儀」までの間
  var SWAP = 420;          // 立ち絵 ⇄ お辞儀 の入れかえ間隔
  var shownAt = 0, done = false, swapTimer = 0;

  /* 画面の色（下の帯にも同じ色を敷く） */
  var BG = "linear-gradient(178deg,#e6f1ff 0%,#f2f7ff 30%,#fdf3ff 68%,#fff8ef 100%)";
  var BG_TOP = "#e6f1ff", BG_BOT = "#fff8ef";

  function loggedIn() {
    try {
      var a = JSON.parse(localStorage.getItem("xeva_account_v1") || "null");
      if (!a || !a.setupDone) return false;
      var s = JSON.parse(localStorage.getItem("xeva_session_v1") || "null");
      return !(s && s.active === false);
    } catch (e) { return false; }
  }

  var MY = (function () {
    try {
      var me = document.currentScript && document.currentScript.src;
      if (me) return me;
    } catch (e) {}
    return "";
  })();
  function baseUrl() { return MY ? MY.slice(0, MY.lastIndexOf("/") + 1) : ""; }

  /* ★ はみ出し用の CSS と xvPaintHtml は xeva-safebottom.js が持っている。
     読まれていないページでも同じ見た目にしたいので、無ければここで足す。 */
  function ensureSafeBottom() {
    if (window.__xvSafeBottom) return;
    var s = document.createElement("script");
    s.src = baseUrl() + "xeva-safebottom.js?v=8";
    (document.head || document.documentElement).appendChild(s);
  }

  function paintHtml(on) {
    var f = window.xvPaintHtml;
    if (f) { f("xevaLoad", on ? BG : null); return; }
    /* まだ読めていないときは直接塗って、あとで戻す */
    try {
      document.documentElement.style.background = on ? BG : "";
    } catch (e) {}
  }

  /* ══ 案内役（立ち絵とお辞儀）══
     ★★ 2026-09-06b <b>1人だけ</b>にしました（ご指定）。
       もう1人（ld_b_*）の絵はそのまま置いてありますが、ここでは使いません。
       戻したくなったら CAST に "b" を足すだけで、また交互に出ます。 */
  var CAST = ["a"];
  var who = CAST[Math.floor(Math.random() * CAST.length)];
  function poseSrc(pose) { return baseUrl() + "img/ld_" + who + "_" + pose + ".webp"; }

  function build() {
    if (document.getElementById(ID)) return;
    ensureSafeBottom();
    var el = document.createElement("div");
    el.id = ID;
    el.className = "xv-bleed";
    el.style.setProperty("--xv-bleed-top", BG_TOP);
    el.style.setProperty("--xv-bleed-bottom", BG_BOT);
    el.innerHTML =
      '<style>' +
      '#' + ID + '{position:fixed;inset:0;z-index:2147482000;display:flex;flex-direction:column;' +
      'align-items:center;justify-content:center;gap:0;font-family:"Noto Sans JP",sans-serif;' +
      'background:' + BG + ';transition:opacity .34s ease;' +
      'padding:calc(env(safe-area-inset-top,0px) + 8px) 18px calc(env(safe-area-inset-bottom,0px) + 8px)}' +
      '#' + ID + '.out{opacity:0;pointer-events:none}' +
      /* うしろで漂う光の玉 */
      '#' + ID + ' .bl{position:absolute;border-radius:50%;filter:blur(42px);opacity:.5;pointer-events:none}' +
      '#' + ID + ' .b1{width:52vw;height:52vw;left:-16vw;top:-10vw;background:#9ad4ff}' +
      '#' + ID + ' .b2{width:44vw;height:44vw;right:-14vw;top:16vh;background:#ffbde0}' +
      '#' + ID + ' .b3{width:56vw;height:56vw;left:-10vw;bottom:-16vh;background:#cdb9ff}' +
      /* 案内役 */
      '#' + ID + ' .cast{position:relative;z-index:2;width:min(58vw,232px);height:min(58vw,232px);' +
      'display:grid;place-items:end center}' +
      '#' + ID + ' .cast::after{content:"";position:absolute;left:50%;bottom:2px;transform:translateX(-50%);' +
      'width:60%;height:16px;border-radius:50%;background:rgba(110,140,200,.20);filter:blur(7px)}' +
      '#' + ID + ' .cast img{grid-area:1/1;width:100%;height:100%;object-fit:contain;object-position:bottom center;' +
      'opacity:0;transition:opacity .16s ease,transform .16s ease;transform:translateY(3px) scale(.985);' +
      'filter:drop-shadow(0 10px 22px rgba(90,130,210,.30))}' +
      '#' + ID + ' .cast img.on{opacity:1;transform:none}' +
      /* ふきだし */
      '#' + ID + ' .say{position:relative;z-index:2;margin-top:14px;padding:9px 18px;border-radius:99px;' +
      'background:rgba(255,255,255,.86);box-shadow:0 8px 22px rgba(90,130,210,.16);' +
      'font-size:12.5px;font-weight:900;color:#4d6096;letter-spacing:.02em}' +
      /* ロードバー */
      '#' + ID + ' .bar{position:relative;z-index:2;margin-top:14px;width:min(58vw,214px);height:6px;' +
      'border-radius:99px;background:rgba(120,150,215,.20);overflow:hidden}' +
      '#' + ID + ' .bar i{position:absolute;left:-42%;top:0;bottom:0;width:42%;border-radius:99px;' +
      'background:linear-gradient(90deg,#8e6bff,#38a6ff,#22c7a9);animation:xvlSlide 1.15s ease-in-out infinite}' +
      '#' + ID + ' .tx{position:relative;z-index:2;margin-top:9px;font-size:11px;font-weight:800;' +
      'color:#7386ad;letter-spacing:.06em}' +
      '@keyframes xvlSlide{0%{left:-42%}100%{left:100%}}' +
      '</style>' +
      '<div class="bl b1"></div><div class="bl b2"></div><div class="bl b3"></div>' +
      '<div class="cast">' +
        '<img class="ps stand on" src="' + poseSrc("stand") + '" alt="">' +
        '<img class="ps bow" src="' + poseSrc("bow") + '" alt="">' +
      '</div>' +
      '<div class="say">データをお預かりしています</div>' +
      '<div class="bar"><i></i></div>' +
      '<div class="tx">SYNCING XEVA DATA</div>';
    (document.body || document.documentElement).appendChild(el);
    paintHtml(true);
    shownAt = Date.now();

    /* 立ち絵 ⇄ お辞儀 を交互に。
       ★ <b>1回めだけ早く</b>（FIRST_SWAP）入れかえて、そのあとは SWAP ごと。
         setInterval だけだと「最初の1回」が SWAP 後になるので、
         ロードが早いとお辞儀を一度も見せられない。 */
    var stand = el.querySelector(".stand"), bow = el.querySelector(".bow"), on = 0;
    var flip = function () {
      on ^= 1;
      stand.classList.toggle("on", !on);
      bow.classList.toggle("on", !!on);
    };
    swapTimer = setTimeout(function () {
      flip();
      swapTimer = setInterval(flip, SWAP);
    }, FIRST_SWAP);
  }

  function hide() {
    if (done) return;
    done = true;
    var el = document.getElementById(ID);
    var go = function () {
      /* 同期後の値で表示を描き直させる */
      try {
        if (window.XEVA && window.XEVA.reload) window.XEVA.reload();
        window.dispatchEvent(new CustomEvent("xeva:change", {
          detail: { balance: (window.XEVA && window.XEVA.getBalance && window.XEVA.getBalance()) || 0 }
        }));
      } catch (e) {}
      /* ★ 1回めは setTimeout、2回目以降は setInterval なので、両方とも止める */
      if (swapTimer) { clearTimeout(swapTimer); clearInterval(swapTimer); swapTimer = 0; }
      paintHtml(false);
      if (!el) return;
      el.classList.add("out");
      setTimeout(function () { if (el && el.parentNode) el.parentNode.removeChild(el); }, 380);
    };
    var wait = Math.max(0, MIN_SHOW - (Date.now() - shownAt));
    setTimeout(go, wait);
  }

  /* 未ログイン／オフラインなら待つ意味がないので出さない */
  if (!loggedIn() || navigator.onLine === false) return;

  if (document.body) build();
  else document.addEventListener("DOMContentLoaded", build, { once: true });

  window.addEventListener("xeva:synced", hide);
  setTimeout(hide, TIMEOUT);
  window.XevaLoading = { hide: hide };
})();
