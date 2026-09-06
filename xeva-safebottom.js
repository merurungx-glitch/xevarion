/* ══════════════════════════════════════════════════════════════
   xeva-safebottom.js — 下バーを「本当の画面の下端」に合わせる共通部品
   ──────────────────────────────────────────────────────────────
   ★ なぜ要るか（2026-09-02 の報告「下のバーが上に来ている」）
     iPhone をホーム画面から<b>アプリとして</b>開くと、position:fixed がぶら下がる箱が
     画面よりホームバーぶん短く作られることがある（実測 screen 852 / 箱 793）。
     ところが env(safe-area-inset-bottom) は「端末の」値をそのまま返すので、
     その短い箱の中でさらに env（34pt）を余白に入れると<b>同じぶんを2回</b>引く。
     合わせて 59+34+4 ≒ 97pt の帯ができ、下バーだけが浮いて見える。

   ★ 何をするか
     :root に次の CSS 変数を入れる。CSS からは env() の代わりにこれを使う。
       --xv-safeb … 下に空けるべき量  = max(0, env下 − 箱の足りないぶん)
       --xv-safet … 上に空けるべき量  = env上（実測。env が読めない環境では 0）
       --xv-vph   … 見えている高さ（px）。100dvh が使えない環境の受け皿。
     env() は JS から読めないので、padding に env() を入れた高さ0の目印で実測する。

   ★ 使いかた（CSS）
       padding-bottom: calc(var(--xv-safeb, env(safe-area-inset-bottom,0px)) + 14px);
     下バーは「はみ出し」と併用すると隙間が原理的に出ない:
       .bar{ margin-bottom:-240px; padding-bottom:calc(var(--xv-safeb,0px) + 240px); }

   関連: xevarion.js の fitBar()（ポータルのホーム専用）と同じ考えかたを、
        どのアプリからでも読めるように切り出したもの。
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  if (window.__xvSafeBottom) return;

  var root = document.documentElement;
  var boxProbe = null, envProbe = null;
  var last = { b: -1, t: -1, h: -1, g: -99999 };

  function host() { return document.body || document.documentElement; }

  /* position:fixed がぶら下がる箱の高さ */
  function boxHeight() {
    var h = host();
    if (h && !(boxProbe && boxProbe.parentNode)) {
      boxProbe = document.createElement("div");
      boxProbe.setAttribute("aria-hidden", "true");
      boxProbe.style.cssText =
        "position:fixed;top:0;bottom:0;left:0;width:0;margin:0;padding:0;border:0;" +
        "visibility:hidden;pointer-events:none;z-index:-2147483000";
      h.appendChild(boxProbe);
    }
    var v = 0;
    if (boxProbe) { try { v = boxProbe.getBoundingClientRect().height; } catch (e) { v = 0; } }
    if (!(v > 120)) v = (root && root.clientHeight) || 0;
    return v;
  }

  /* env(safe-area-inset-top/bottom) の実測。高さ0の目印の padding を読む。 */
  function envInfo() {
    var h = host();
    if (h && !(envProbe && envProbe.parentNode)) {
      envProbe = document.createElement("div");
      envProbe.setAttribute("aria-hidden", "true");
      envProbe.style.cssText =
        "position:fixed;left:0;bottom:0;width:0;height:0;margin:0;border:0;" +
        "padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px) 0;" +
        "visibility:hidden;pointer-events:none;z-index:-2147483000";
      h.appendChild(envProbe);
    }
    if (!envProbe) return { top: 0, bottom: 0, ok: false };
    var cs, pt = 0, pb = 0;
    try {
      cs = getComputedStyle(envProbe);
      pt = parseFloat(cs.paddingTop) || 0;
      pb = parseFloat(cs.paddingBottom) || 0;
    } catch (e) { return { top: 0, bottom: 0, ok: false }; }
    /* 120 以上は測り損ね（ズームなど）とみなす */
    return { top: pt > 0 && pt < 120 ? pt : 0, bottom: pb > 0 && pb < 120 ? pb : 0, ok: true };
  }

  /* アプリ表示のとき、箱が画面よりどれだけ短いか（＝表示領域の外にある帯の厚み） */
  function shortfall(box) {
    try {
      var standalone = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) ||
                       navigator.standalone;
      if (!standalone) return 0;
      var sMin = Math.min(screen.width, screen.height);
      var sMax = Math.max(screen.width, screen.height);
      var s = (window.innerWidth > window.innerHeight ? sMin : sMax) - box;
      /* 0 < s < 200 のときだけ信じる。それ以上は測り損ね（PCのウィンドウなど） */
      return (s > 0 && s < 200) ? s : 0;
    } catch (e) { return 0; }
  }

  /* ★★ 2026-09-05 「下のバーと最下部のあいだにすきまがある」の仕上げ
     余白（--xv-safeb）だけでは足りない。箱の下端自体が「見えている下端」と
     ずれていることがあるので、MagiBurst と同じやりかたでその差も測る。
       --xv-fixgap … 見えている下端 − 箱の下端。正＝下へ伸ばす／負＝上へ戻す。
       --xv-growb  … max(0, fixgap)。下へ伸ばしたときの余白。
       --xv-safebar… 下バーが実際に使う余白 = max(safeb, growb)。
     ★ 下バーの CSS はこの3つを使って
         bottom: calc(-1 * var(--xv-fixgap,0px) - 240px);
         padding-bottom: calc(var(--xv-safebar,0px) + 240px);
       と書く。★★ 別の板（::after）を敷くのは<b>だめ</b>——
       板には backdrop-filter もグラデーションも掛からないので、
       バー本体と色が食いちがって、ずれていなくても境目が線に見える。 */
  function measure() {
    var box = boxHeight();
    if (!(box > 120)) return;
    var vv = window.visualViewport;
    /* キーボードが出ているあいだは見えている高さが極端に縮む。前の値を保つ。 */
    if (vv && !(vv.height > box * 0.72)) return;

    var ei = envInfo();
    var safeb = Math.max(0, Math.round((ei.bottom - shortfall(box)) * 10) / 10);
    var safet = Math.round(ei.top * 10) / 10;
    var vph = Math.round(vv ? vv.height : box);

    var gap = 0;
    if (vv && box > 120) {
      gap = Math.round((vv.offsetTop || 0) + vv.height - box);
      if (Math.abs(gap) > 160) gap = 0;        // 測り損ね（PCのウィンドウなど）
    }

    if (safeb !== last.b) { root.style.setProperty("--xv-safeb", safeb + "px"); last.b = safeb; }
    if (safet !== last.t) { root.style.setProperty("--xv-safet", safet + "px"); last.t = safet; }
    if (vph !== last.h) { root.style.setProperty("--xv-vph", vph + "px"); last.h = vph; }
    if (gap !== last.g) {
      root.style.setProperty("--xv-fixgap", gap + "px");
      root.style.setProperty("--xv-growb", (gap > 0 ? gap : 0) + "px");
      last.g = gap;
    }
  }

  var pending = false;
  function sync() {
    if (pending) return;
    pending = true;
    var run = function () { pending = false; measure(); };
    if (window.requestAnimationFrame) requestAnimationFrame(run); else setTimeout(run, 0);
  }
  window.xvFitSafeBottom = function () { last.b = last.t = last.h = -1; last.g = -99999; measure(); };
  window.__xvSafeBottom = true;

  /* ★ 測り直す機会をひととおり拾う（別アプリから戻った・回した・ツールバーが出入りした）。
     iOS はページを凍結するので resize が飛ばないまま復帰することがある。 */
  if (window.visualViewport) {
    visualViewport.addEventListener("resize", sync);
    visualViewport.addEventListener("scroll", sync);
  }
  window.addEventListener("resize", sync);
  window.addEventListener("pageshow", sync);
  window.addEventListener("focus", sync);
  window.addEventListener("scroll", sync, { passive: true });
  window.addEventListener("orientationchange", function () {
    setTimeout(sync, 60); setTimeout(sync, 280); setTimeout(sync, 720);
  });
  document.addEventListener("visibilitychange", function () { if (!document.hidden) sync(); });
  document.addEventListener("DOMContentLoaded", function () {
    sync(); setTimeout(sync, 120); setTimeout(sync, 500); setTimeout(sync, 1400);
  });
  if (document.readyState !== "loading") {
    /* ★ defer で読まれたときは DOMContentLoaded がもう終わっている（xevarion-defer-readystate-boot） */
    sync(); setTimeout(sync, 120); setTimeout(sync, 500); setTimeout(sync, 1400);
  }
})();
