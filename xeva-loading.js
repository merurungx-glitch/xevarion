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
       絵は img/ld_a_stand.webp ／ ld_a_bow.webp（下の LD_SRC が持ち主）。
     ・<b>いちばん下まで色が届く</b>ようにした。position:fixed の箱はアプリ表示だと
       画面より短いことがあるので、
         ① &lt;html&gt; の背景を同じ色に塗る（xvPaintHtml）
         ② 板を上下にはみ出させる（class="xv-bleed"）
       の<b>両方</b>を使う。①②は xeva-safebottom.js が持っているので、
       読まれていないページでは<b>自分で読みこむ</b>。

   使い方: <script src="../xeva-loading.js?v=16" defer></script>
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
    s.src = baseUrl() + "xeva-safebottom.js?v=10";
    (document.head || document.documentElement).appendChild(s);
  }

  /* ★★ 2026-09-13 --xv-under（箱が画面より短いぶん）をその場で1回測る。
     xeva-safebottom.js は <script> を足して読むので<b>間に合わないことがある</b>。
     板を出す最初のフレームから帯が出ないよう、ここでも同じ計算をしておく
     （あとで xeva-safebottom.js が同じ値を書き直すだけなので、ぶつからない）。 */
  function measureUnder() {
    try {
      var standalone = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) ||
                       navigator.standalone;
      if (!standalone) return;
      var host = document.body || document.documentElement;
      if (!host) return;
      var pr = document.createElement("div");
      pr.setAttribute("aria-hidden", "true");
      pr.style.cssText =
        "position:fixed;top:0;bottom:0;left:0;width:0;margin:0;padding:0;border:0;" +
        "visibility:hidden;pointer-events:none;z-index:-2147483000";
      host.appendChild(pr);
      var box = pr.getBoundingClientRect().height;
      pr.parentNode.removeChild(pr);
      if (!(box > 200)) return;
      var sMin = Math.min(screen.width, screen.height);
      var sMax = Math.max(screen.width, screen.height);
      var s = Math.round((window.innerWidth > window.innerHeight ? sMin : sMax) - box);
      if (s > 0 && s < 200) document.documentElement.style.setProperty("--xv-under", s + "px");
    } catch (e) {}
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
     ★★ 2026-09-10 ご指定により<b>2人のどちらかがランダムで出る</b>ようにしました。
       ・a … フードの子（青と白）
       ・b … 水晶ドレスの子
       絵は img/ld_a_stand.webp・ld_a_bow.webp ／ ld_b_stand.webp・ld_b_bow.webp。
       ★ これまでの案内役の絵（メイドの子・古いフードの子）は<b>ファイルごと削除</b>しました。
         残っているのはこの4枚だけです。
       ★★ 4枚とも <b>560×560 で、足の裏が同じ y（=555）・足元の中心が同じ x（=280）</b>
         になるように切りぬいてある。立ち絵↔お辞儀で<b>足が跳ねない</b>ようにするため。
         （側は object-fit:contain の正方形なので、絵の中の位置がそのまま画面の位置になる）
       ★ 選ぶのは<b>画面を作るときに1回だけ</b>なので、
         同じロード中に人が入れかわることはありません。 */
  var CAST = ["a", "b"];
  var who = CAST[Math.floor(Math.random() * CAST.length)];
  /* ★★ 絵は<b>4本ともフルの名前で書く</b>。
     ・SW は絵を「版に縛られない置き場（xev-img-v1）」に控えるので、
       <b>?v= を上げないと古い絵がそのまま出る</b>（裏では差しかわるが1回遅れる）。
     ・分けて書くと bump-v.py が見つけられないので、<b>連結せずに並べてある</b>。 */
  var LD_SRC = {
    a: { stand: "img/ld_a_stand.webp?v=5", bow: "img/ld_a_bow.webp?v=5" },
    b: { stand: "img/ld_b_stand.webp?v=5", bow: "img/ld_b_bow.webp?v=5" },
  };
  function poseSrc(pose) { return baseUrl() + (LD_SRC[who] || LD_SRC.a)[pose]; }

  /* ★★ 2026-09-13 文字列を「1文字ずつ跳ねる span」に組み直す。
     step は隣の文字との遅れ（秒）。loop は一周の長さに合わせてある。
     ★ 組み直した文字列はそのまま HTML になるので、<b>必ずエスケープする</b>。 */
  function hopHtml(text, step) {
    step = step || 0.055;
    var out = "", i, ch, esc;
    for (i = 0; i < text.length; i++) {
      ch = text.charAt(i);
      esc = ch === "&" ? "&amp;" : ch === "<" ? "&lt;" : ch === ">" ? "&gt;" : ch;
      out += '<span class="hp' + (ch === " " ? " sp" : "") + '" style="animation-delay:'
           + (i * step).toFixed(3) + 's">' + (ch === " " ? "" : esc) + "</span>";
    }
    return out;
  }

  function build() {
    if (document.getElementById(ID)) return;
    ensureSafeBottom();
    measureUnder();
    var el = document.createElement("div");
    el.id = ID;
    el.className = "xv-bleed";
    el.style.setProperty("--xv-bleed-top", BG_TOP);
    el.style.setProperty("--xv-bleed-bottom", BG_BOT);
    el.innerHTML =
      '<style>' +
      /* ★★ 2026-09-13 下に帯が残るのを止める。
         アプリ表示では position:fixed の箱が画面より短いことがある（実測 852 / 793）。
         inset:0 のままだと箱の下端で色が切れて、下に帯が残る。
         → <b>箱の足りないぶん（--xv-under）だけ下へ伸ばし、同じぶんを padding にも足す</b>。
           中身（中央ぞろえ）の位置はまったく変わらず、色だけ本当の下端まで届く。 */
      '#' + ID + '{position:fixed;top:0;left:0;right:0;bottom:calc(-1 * var(--xv-under,0px));' +
      'z-index:2147482000;display:flex;flex-direction:column;' +
      'align-items:center;justify-content:center;gap:0;font-family:"Noto Sans JP",sans-serif;' +
      'background:' + BG + ';transition:opacity .34s ease;' +
      'padding:calc(env(safe-area-inset-top,0px) + 8px) 18px ' +
      'calc(env(safe-area-inset-bottom,0px) + 8px + var(--xv-under,0px))}' +
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
      /* ══ ★★ 2026-09-13 文字を<b>1文字ずつ跳ねさせる</b>（ご指定）══
         ・1文字を <span class="hp"> 1つに分け、<b>animation-delay を順にずらす</b>。
           左から右へ波が伝わるように見える。
         ・跳ねるのは<b>縦の移動と少しの拡大</b>だけにする。
           文字の幅（横）を動かすと、周りの文字まで押されて行がゆれる。
         ★ 半角の空白は <span> にするとつぶれるので、<b>幅を持たせる</b>（.sp）。
         ★ 「動きを減らす」設定の端末では跳ねない（prefers-reduced-motion）。 */
      '#' + ID + ' .hp{display:inline-block;white-space:pre;transform-origin:50% 100%;' +
      'animation:xvlHop 1.25s cubic-bezier(.3,.8,.35,1) infinite both}' +
      '#' + ID + ' .hp.sp{width:.34em}' +
      '@keyframes xvlHop{' +
      '0%,58%,100%{transform:translateY(0) scale(1)}' +
      '14%{transform:translateY(-26%) scale(1.06,.96)}' +
      '30%{transform:translateY(-46%) scale(.97,1.05)}' +
      '46%{transform:translateY(0) scale(1.07,.93)}' +
      '52%{transform:translateY(0) scale(1)}}' +
      '@media (prefers-reduced-motion: reduce){#' + ID + ' .hp{animation:none}}' +
      '</style>' +
      '<div class="bl b1"></div><div class="bl b2"></div><div class="bl b3"></div>' +
      '<div class="cast">' +
        '<img class="ps stand on" src="' + poseSrc("stand") + '" alt="">' +
        '<img class="ps bow" src="' + poseSrc("bow") + '" alt="">' +
      '</div>' +
      '<div class="say">' + hopHtml("データをお預かりしています", 0.055) + '</div>' +
      '<div class="bar"><i></i></div>' +
      '<div class="tx">' + hopHtml("SYNCING XEVA DATA", 0.045) + '</div>';
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
