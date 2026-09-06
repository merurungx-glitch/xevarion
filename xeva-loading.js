/* ============================================================
   XEVA-Loading — XEVA を表示するページ共通のロード画面
   ・ページを開いた時点の localStorage は「前回この端末で保存した値」なので、
     別端末で使ったぶんの増減が反映されておらず、残高が古いまま見えることがある。
   ・xeva-cloud.js のクラウド取り込み完了（xeva:synced）まで薄いベールを出し、
     終わってから数字を見せることで「XEVAが変化しない」状態を防ぐ。
   ・オフライン／未ログイン／同期が長引く場合はタイムアウトで先へ進む（待たせ続けない）。

   使い方: <script src="../xeva-loading.js?v=4" defer></script>
   ============================================================ */
(function () {
  "use strict";

  var ID = "xevaLoadVeil";
  var TIMEOUT = 6500;      // これ以上は待たない
  var MIN_SHOW = 320;      // 一瞬だけチラつくのを防ぐ
  var shownAt = 0, done = false;

  function loggedIn() {
    try {
      var a = JSON.parse(localStorage.getItem("xeva_account_v1") || "null");
      if (!a || !a.setupDone) return false;
      var s = JSON.parse(localStorage.getItem("xeva_session_v1") || "null");
      return !(s && s.active === false);
    } catch (e) { return false; }
  }

  function baseUrl() {
    try {
      var me = document.currentScript && document.currentScript.src;
      if (me) return me.slice(0, me.lastIndexOf("/") + 1);
    } catch (e) {}
    return "";
  }

  function build() {
    if (document.getElementById(ID)) return;
    var b = baseUrl();
    var el = document.createElement("div");
    el.id = ID;
    el.innerHTML =
      '<style>' +
      '#' + ID + '{position:fixed;inset:0;z-index:2147482000;display:flex;flex-direction:column;' +
      'align-items:center;justify-content:center;gap:13px;font-family:"Noto Sans JP",sans-serif;' +
      'background:linear-gradient(175deg,#d9ecff 0%,#eef6ff 34%,#fdf4ff 72%,#fff7ef 100%);' +
      'transition:opacity .32s ease}' +
      '#' + ID + '.out{opacity:0;pointer-events:none}' +
      '#' + ID + ' img{width:66px;height:66px;object-fit:contain;' +
      'filter:drop-shadow(0 6px 18px rgba(90,140,240,.5));animation:xvlPop .5s cubic-bezier(.2,.9,.3,1)}' +
      '#' + ID + ' .sp{width:24px;height:24px;border-radius:50%;border:3px solid rgba(120,160,230,.28);' +
      'border-top-color:#4b8bff;animation:xvlSpin .8s linear infinite}' +
      '#' + ID + ' .tx{font-size:12px;font-weight:800;color:#6f82ad;letter-spacing:.02em}' +
      '@keyframes xvlSpin{to{transform:rotate(360deg)}}' +
      '@keyframes xvlPop{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:scale(1)}}' +
      '</style>' +
      '<img src="' + b + 'brand-xevarion-orb.png" alt="">' +
      '<div class="sp"></div>' +
      '<div class="tx">データを同期しています…</div>';
    (document.body || document.documentElement).appendChild(el);
    shownAt = Date.now();
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
      if (!el) return;
      el.classList.add("out");
      setTimeout(function () { if (el && el.parentNode) el.parentNode.removeChild(el); }, 360);
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
