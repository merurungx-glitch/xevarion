/* ============================================================
   xeva-tabbar.js — ガチャ・コミュニティ・図鑑にもホームと同じ「下バー」を出す
   ------------------------------------------------------------
   ★★ 2026-10-13 ご指定「XEVARION ホームの下バーなどからコミュニティやガチャなどを開いた際に、下バーが消えているので常に表示」
   ・ホーム（index.html）の下バーと<b>同じ5つのタブ・同じ絵</b>（絵は index.html の .xh-bar から写したもの。
     下バーの絵を描き直したら、このファイルの ICONS も写し直すこと）
   ・いまいるページのタブが緑の札（えらんだ状態）。もう一度押すといちばん上へ
   ・ホーム／設定へ戻るときは、未送信の同期を送り切ってから移動する（xeva-back.js と同じ考え方・最大 900ms）
   ・コミュニティはオフラインでは開けない（ホームと同じ）
   ・タブの色は xeva-uma.css の .xh-ntab / .uic（どのページも読んでいる）。ここは並べかたと板だけ
   ★★ 2026-10-13 その2（ご指定「下バーのサイズや画面自体のサイズが変わるので、ホームに統一」）
   ・幅はホームの列（#xhCol）と同じ <b>600px まで</b>・まん中寄せ（ページの中身も xeva-pop-pages.css で 600px の列に）
   ・iPhone のアプリ表示（html.xv-full）では、ホームと同じく<b>本当の画面の下端</b>に置く
     （fixed の板は画面より短い箱で切られるので、文書は動かさず body の中でスクロールし、下バーは html に absolute で置く）
   ・ガチャのタブは、ホームと同じく<b>キャラの絵</b>（XH_GACHA_TAB_CHAR と同じ子・Xevion OS の設定でオフにできる）
   使い方: <script src="xeva-tabbar.js?v=5" data-tab="gacha"></script>（data-tab＝community / gacha / chars）
   ★★ 2026-10-14 ご報告「コミュニティやガチャや図鑑の下バーが、開いて少しあとに表示される」
   ・真因：このファイルを<b>ページのいちばん最後に defer</b> で読んでいたので、ガチャなら mb-core.js（約2MB）など
     重い部品を全部読み終わるまで下バーが作られなかった（＋0.3秒かけて薄く出していた）。
   → <b>body のいちばん最初</b>で（defer なしで）読んで、その場で作る。薄く出す動きもやめた。
   ・絵の色は xeva-uma.css（ページの最後で読む）が塗っていたので、下バーのぶんだけ同じ指定をここにも持つ
     （先に出た下バーが、色の付かない絵で一瞬見えないように）。
   ============================================================ */
(function () {
  "use strict";
  if (window.__xvTabBar) return;
  window.__xvTabBar = 1;
  var ME = document.currentScript;
  var CUR = (ME && ME.dataset && ME.dataset.tab) || "";
  var ICONS = {
    "home": "<svg class=\"uic\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path class=\"p k\" d=\"M15.4 3.9h2.8v5.2l-2.8-2.4Z\"/><path class=\"p k\" d=\"M5 10.6 12 4.8l7 5.8v8.6a1.8 1.8 0 0 1-1.8 1.8H6.8A1.8 1.8 0 0 1 5 19.2Z\"/><path class=\"ln\" d=\"M2.6 11.6 12 3.6l9.4 8\"/><rect class=\"s k\" x=\"9.8\" y=\"13.8\" width=\"4.4\" height=\"7\" rx=\"1.4\"/><path class=\"gl\" d=\"M7.4 11 10.6 8.3\"/></svg>",
    "community": "<svg class=\"uic\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><circle class=\"s k\" cx=\"16.4\" cy=\"8.2\" r=\"2.8\"/><path class=\"s k\" d=\"M12.6 19.8c.2-3.4 1.8-5.4 3.8-5.4s3.7 2 3.9 5.4Z\"/><circle class=\"p k\" cx=\"9\" cy=\"7.8\" r=\"3.4\"/><path class=\"p k\" d=\"M3.2 20.2c.3-4.2 2.6-6.6 5.8-6.6s5.5 2.4 5.8 6.6Z\"/><path class=\"gl\" d=\"M7.3 6.6a2 2 0 0 1 1.5-1.1\"/></svg>",
    "gacha": "<svg class=\"uic\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path class=\"w k\" d=\"M3.4 12.8a8.6 8.6 0 0 0 17.2 0Z\"/><path class=\"s k\" d=\"M3.4 12.8a8.6 8.6 0 0 1 17.2 0Z\"/><circle class=\"p k\" cx=\"12\" cy=\"12.8\" r=\"2.8\"/><path class=\"gl\" d=\"M6.6 9.4a5.8 5.8 0 0 1 3-2.7\"/><path class=\"s k\" d=\"M19.8 1.6l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8Z\"/></svg>",
    "chars": "<svg class=\"uic\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path class=\"p k\" d=\"M12 6.4C10.1 4.8 7.8 4.3 3.4 4.3v14.6c4.4 0 6.7.5 8.6 2.1Z\"/><path class=\"p k\" d=\"M12 6.4c1.9-1.6 4.2-2.1 8.6-2.1v14.6c-4.4 0-6.7.5-8.6 2.1Z\"/><path class=\"kl\" d=\"M5.8 8.6h3.6M5.8 11.6h3.6M5.8 14.6h2.6\"/><path class=\"s k\" d=\"M14.6 5.2v6.6l1.5-1.2 1.5 1.2V4.7\"/></svg>",
    "settings": "<svg class=\"uic\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path class=\"p k\" d=\"M10.0 4.4 10.5 1.7 13.5 1.7 14.0 4.4 16.0 5.2 18.2 3.6 20.4 5.8 18.8 8.1 19.6 10.0 22.3 10.5 22.3 13.5 19.6 14.0 18.8 15.9 20.4 18.2 18.2 20.4 16.0 18.8 14.0 19.6 13.5 22.3 10.5 22.3 10.0 19.6 8.1 18.8 5.8 20.4 3.6 18.2 5.2 15.9 4.4 14.0 1.7 13.5 1.7 10.5 4.4 10.0 5.2 8.0 3.6 5.8 5.8 3.6 8.0 5.2Z\"/><circle class=\"w k\" cx=\"12\" cy=\"12\" r=\"3.6\"/><path class=\"gl\" d=\"M6.4 9.2a6.2 6.2 0 0 1 2.4-2.8\"/></svg>"
  };
  /* ★★ 2026-10-20 ご指定で並びを「図鑑・ガチャ・ホーム・コミュニティ・設定」に（index.html の .xh-bar と同じ順） */
  var TABS = [["chars", "図鑑", "characters.html"], ["gacha", "ガチャ", "gacha.html"], ["home", "ホーム", "index.html"], ["community", "コミュニティ", "community.html"], ["settings", "設定", "index.html#settings"]];
  /* ガチャのタブの絵（xevarion-home.js の XH_GACHA_TAB_CHAR と同じ子にそろえる） */
  var GACHA_TAB_CHAR = "takina";

  var CSS =
    "html.xvtb{--xvtb-h:69px}" +
    "#xvTabBar{position:fixed;left:0;right:0;bottom:-240px;margin:0 auto;max-width:600px;z-index:150;display:grid;grid-template-columns:repeat(5,1fr);gap:2px;grid-auto-rows:min-content;align-content:start;" +
    "padding:5px 5px calc(var(--xv-safeb,env(safe-area-inset-bottom,0px)) + 240px);" +
    "background:linear-gradient(180deg,#ffffff 0,#f2fbea 40px,#e3f6d4 70px,#e3f6d4 100%);box-shadow:0 -3px 0 rgba(76,174,44,.28)}" +
    /* iPhone のアプリ表示：本当の画面の下端（html の中に absolute）。下の余白はホームと同じ env() */
    "html.xvtb.xv-full #xvTabBar{position:absolute;bottom:0;padding-bottom:env(safe-area-inset-bottom,0px)}" +
    "#xvTabBar::before{content:'';position:absolute;top:0;left:0;right:0;height:6px;pointer-events:none;background:linear-gradient(180deg,#5cc23a 0 3px,#b9e99c 3px 6px)}" +
    "#xvTabBar .xh-ntab{position:relative;display:flex;flex-direction:column;align-items:center;gap:3px;padding:10px 2px 7px;border:none;background:none;cursor:pointer;" +
    "color:#7a8f6c;border-radius:14px;font-family:'Noto Sans JP',sans-serif;-webkit-tap-highlight-color:transparent;touch-action:manipulation}" +
    "#xvTabBar .xh-ntab svg{width:30px;height:30px;transition:transform .14s;position:relative;z-index:1}" +
    "#xvTabBar .xh-ntab .tl{font-size:9.5px;font-weight:900;letter-spacing:-.01em;white-space:nowrap;position:relative;z-index:1;color:#6d8160}" +
    /* えらんでいるタブの緑の札。★ 中央寄せは left/right:0＋margin:auto（transform はぴょんと出る動きだけに使う） */
    "#xvTabBar .xh-ntab.on::before{content:'';position:absolute;left:0;right:0;margin:0 auto;top:6px;width:46px;height:46px;border-radius:50%;pointer-events:none;z-index:0}" +
    /* ガチャのタブのキャラの絵（ホームと同じ：角丸の正方形・ほかのタブより少しだけ大きく） */
    "#xvTabBar .xh-ntab.xh-haschar svg{display:none}" +
    "#xvTabBar .xh-ntab .xh-tabchar{position:relative;z-index:1;width:34px;height:34px;margin:-4px 0 0;box-sizing:border-box;border-radius:9px;border:2px solid #fff;" +
    "object-fit:cover;object-position:50% 18%;background:#fff}" +
    "#xvTabBar .xh-ntab.off{opacity:.45}" +
    "@media (max-width:360px){#xvTabBar .xh-ntab .tl{font-size:7.5px}}" +
    "#xvTbToast{position:fixed;left:50%;bottom:calc(var(--xvtb-h) + var(--xv-safeb,env(safe-area-inset-bottom,0px)) + 14px);transform:translateX(-50%);z-index:151;" +
    "background:#fff;color:#2f4a1f;font:800 13px 'Noto Sans JP',sans-serif;padding:10px 16px;border-radius:99px;box-shadow:0 0 0 2px #8fdc64,0 6px 16px rgba(40,80,20,.18);" +
    "white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .2s}" +
    "html.xvtb.xv-full #xvTbToast{position:absolute;bottom:calc(var(--xvtb-h) + env(safe-area-inset-bottom,0px) + 14px)}" +
    "#xvTbToast.on{opacity:1}" +
    /* ★★ 2026-10-14 絵の色（xeva-uma.css の .uic と下バーのぶんを写したもの。あちらを直したらここも） */
    "#xvTabBar .uic{overflow:visible}" +
    "#xvTabBar .uic .p{fill:var(--ua,#5cc23a)}#xvTabBar .uic .s{fill:var(--ub,#ffc83d)}#xvTabBar .uic .w{fill:#fff}" +
    "#xvTabBar .uic .k{stroke:var(--uk,#2a7a14);stroke-width:1.6;stroke-linejoin:round;stroke-linecap:round}" +
    "#xvTabBar .uic .ln{fill:none;stroke:var(--uk,#2a7a14);stroke-width:2.1;stroke-linecap:round;stroke-linejoin:round}" +
    "#xvTabBar .uic .kl{fill:none;stroke:var(--uk,#2a7a14);stroke-width:1.4;stroke-linecap:round;opacity:.55}" +
    "#xvTabBar .uic .gl{fill:none;stroke:#fff;stroke-width:1.6;stroke-linecap:round;opacity:.75}" +
    "#xvTabBar .xh-ntab .uic{--ua:#b4c3a7;--ub:#d7e1cd;--uk:#788b6a}" +
    "#xvTabBar .xh-ntab .tl{color:#7f9272;font-family:'M PLUS Rounded 1c','Noto Sans JP',sans-serif}" +
    "#xvTabBar .xh-ntab.on .uic{--ua:#fff;--ub:#ffd84a;--uk:#2a7a14;transform:translateY(-2px) scale(1.02);filter:drop-shadow(0 1.5px 0 rgba(34,100,14,.45))}" +
    "#xvTabBar .xh-ntab.on .tl{color:#2f8a1a}" +
    "#xvTabBar .xh-ntab.on::before{top:4px;width:50px;height:36px;border-radius:14px;" +
    "background:linear-gradient(180deg,rgba(255,255,255,.6) 0,rgba(255,255,255,.2) 46%,rgba(255,255,255,0) 47%),linear-gradient(180deg,#a6ec72,#43b324);" +
    "box-shadow:inset 0 0 0 2px rgba(255,255,255,.95),0 0 0 1.5px #2a8614,0 2px 0 #226f10,0 4px 8px rgba(40,80,20,.18)}" +
    "#xvTabBar .xh-ntab .xh-tabchar{box-shadow:0 0 0 1.5px #fff,0 0 0 3px #62c43e,0 2px 0 3px rgba(42,122,20,.3);border-color:#fff}";

  function toast(t) {
    var el = document.getElementById("xvTbToast");
    if (!el) { el = document.createElement("div"); el.id = "xvTbToast"; document.body.appendChild(el); }
    el.textContent = t; el.classList.add("on");
    clearTimeout(toast._t); toast._t = setTimeout(function () { el.classList.remove("on"); }, 2400);
  }
  /* 未送信の同期を送り切ってから移動（xeva-back.js があればそちらを使う） */
  var leaving = false;
  function go(href) {
    if (leaving) return;
    if (window.XevaBack && window.XevaBack.leave) { leaving = true; window.XevaBack.leave(href); return; }
    leaving = true;
    var done = false, fire = function () { if (done) return; done = true; try { location.href = href; } catch (e) {} };
    setTimeout(fire, 900);
    try {
      var C = window.XevaCloud;
      if (C && C.flushPush) { var p = C.flushPush(); if (p && p.then) { p.then(fire, fire); return; } }
    } catch (e) {}
    fire();
  }
  /* iPhone のアプリ表示では文書が動かず body の中でスクロールする（xeva-pop-pages.css）。
     ページの window.scrollTo / scrollY をそちらへつなぐ（ガチャの「いちばん上へ」「そのガチャへ」がそのまま動くように） */
  var R = document.documentElement;
  function inner() { return R.classList.contains("xv-full") && R.classList.contains("xvtb") && document.body; }
  (function shim() {
    try {
      var orig = window.scrollTo;
      window.scrollTo = function (a, b) {
        var bd = inner();
        if (bd) { try { if (a && typeof a === "object") bd.scrollTo(a); else bd.scrollTo(a || 0, b || 0); } catch (e) {} return; }
        return orig.apply(window, arguments);
      };
      var d = Object.getOwnPropertyDescriptor(window, "scrollY") || Object.getOwnPropertyDescriptor(Object.getPrototypeOf(window), "scrollY");
      if (d && d.get && d.configurable !== false) {
        Object.defineProperty(window, "scrollY", { configurable: true, get: function () { var bd = inner(); return bd ? bd.scrollTop : d.get.call(window); } });
      }
    } catch (e) {}
  })();
  function onTab(id, href) {
    try { if (window.XOS && window.XOS.haptic) window.XOS.haptic(); } catch (e) {}
    if (id === CUR) { try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch (e) { window.scrollTo(0, 0); } return; }
    if (id === "community" && navigator.onLine === false) { toast("📴 オフライン中は コミュニティ を開けません"); return; }
    go(href);
  }
  function measure() {
    var b = document.getElementById("xvTabBar"); if (!b) return;
    var r = b.getBoundingClientRect();
    /* 下へはみ出させた 240px と、下の余白（ホームバーぶん）を引いた「タブの高さ」 */
    var cs = getComputedStyle(b), pb = parseFloat(cs.paddingBottom) || 0;
    var h = Math.round(r.height - pb);
    if (h > 30 && h < 140) R.style.setProperty("--xvtb-h", h + "px");
  }
  /* ガチャのタブをキャラの絵に（xevarion-home.js の xhPaintGachaTabIcon と同じ。Xevion OS の「ガチャタブにキャラ」がオフなら絵のまま） */
  /* ★★ 2026-10-20 ご指定「下バーのガチャのアイコンをキャラではなく通常に戻して」→ キャラの絵はかぶせない（xevarion-home.js と同じ） */
  var USE_CHAR = false;
  function paintGachaChar(nav) {
    var btn = nav.querySelector('.xh-ntab[data-tab="gacha"]'); if (!btn) return;
    var allow = USE_CHAR;
    try { var os = JSON.parse(localStorage.getItem("xevion_os_v1") || "{}"); if (os && ("newCharTab" in os) && !os.newCharTab) allow = false; } catch (e) {}
    try { if (window.XOS && window.XOS.get && !window.XOS.get("newCharTab")) allow = false; } catch (e) {}
    var img = btn.querySelector(".xh-tabchar");
    if (!allow) { if (img) img.remove(); btn.classList.remove("xh-haschar"); return; }
    var c = null;
    try { var list = (window.XEVA && window.XEVA.MB_CHARS) || []; for (var i = 0; i < list.length; i++) if (list[i].mbId === GACHA_TAB_CHAR) { c = list[i]; break; } } catch (e) {}
    if (!c) c = { id: "mb:" + GACHA_TAB_CHAR, mbId: GACHA_TAB_CHAR, file: "../img/t_Takina.webp" };
    var src = "";
    try { src = (window.XEVA && window.XEVA.charSrc) ? window.XEVA.charSrc(c.file, c.id, null, "s") : ""; } catch (e) { src = ""; }
    if (!src) src = String(c.file || "").replace(/^\.\.\//, "");
    if (!img) { img = document.createElement("img"); img.className = "xh-tabchar sq"; img.alt = ""; btn.insertBefore(img, btn.firstChild); }
    if (img.getAttribute("src") !== src) img.setAttribute("src", src);
    img.onerror = function () { img.remove(); btn.classList.remove("xh-haschar"); };
    btn.classList.add("xh-haschar");
  }
  function build() {
    if (document.getElementById("xvTabBar")) return;
    /* 下の余白の補正（--xv-safeb・xv-full）は xeva-safebottom.js が配る。読まれていないページでは読みこむ */
    if (!window.__xvSafeBottom) {
      var s = document.createElement("script");
      s.src = (ME && ME.src ? ME.src.slice(0, ME.src.lastIndexOf("/") + 1) : "") + "xeva-safebottom.js?v=12";
      (document.head || document.documentElement).appendChild(s);
    }
    var st = document.createElement("style"); st.id = "xvTabBarCss"; st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
    var nav = document.createElement("nav");
    nav.id = "xvTabBar"; nav.className = "xh-bar"; nav.setAttribute("role", "tablist"); nav.setAttribute("aria-label", "XEVARION メニュー");
    nav.innerHTML = TABS.map(function (t) {
      var off = t[0] === "community" && navigator.onLine === false;
      return '<button type="button" class="xh-ntab' + (t[0] === CUR ? " on" : "") + (off ? " off" : "") + '" data-tab="' + t[0] + '" role="tab" aria-selected="' + (t[0] === CUR) + '">' +
        ICONS[t[0]] + '<span class="tl">' + t[1] + "</span></button>";
    }).join("");
    nav.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest(".xh-ntab") : null; if (!b) return;
      var t = TABS.filter(function (x) { return x[0] === b.dataset.tab; })[0]; if (t) onTab(t[0], t[2]);
    });
    document.body.appendChild(nav);
    R.classList.add("xvtb");
    paintGachaChar(nav);
    /* XEVA（キャラの台帳）があとから読まれたときのため、少しあとにもう一度 */
    setTimeout(function () { paintGachaChar(nav); }, 800);
    measure();
    [60, 300, 1000].forEach(function (ms) { setTimeout(measure, ms); });
    window.addEventListener("resize", measure);
    var upd = function () { var c = nav.querySelector('[data-tab="community"]'); if (c) c.classList.toggle("off", navigator.onLine === false); };
    window.addEventListener("online", upd); window.addEventListener("offline", upd);
  }
  if (document.body) build(); else document.addEventListener("DOMContentLoaded", build, { once: true });
  window.XevaTabBar = { go: go, tab: CUR };
})();
