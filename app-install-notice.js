/* ============================================================
   XEVARION — 単体インストールの案内（MagiLex / MagiBurst / MagiChainParty 用）
   ・アプリ単体の PWA 配布は廃止しました。XEVARION を1つ入れれば
     この3アプリはまとめてオフライン対応になります。
   ・すでにアプリ単体をホーム画面へ追加している人（standalone 起動）には、
     削除して XEVARION を入れ直してもらう案内を出します。
   ・各アプリの <head> で <script src="../app-install-notice.js" defer> するだけ。
   ============================================================ */
(function () {
  "use strict";

  var KEY = "xeva_solo_pwa_notice_v1";

  function standalone() {
    try {
      return window.matchMedia("(display-mode: standalone)").matches ||
             window.navigator.standalone === true;
    } catch (e) { return false; }
  }

  /* 単体PWAとして起動しているか。
     XEVARION から開いた場合はポータルのスコープなので start_url が index.html になり、
     ここ（アプリのURL）が起点ではない。判定は「standalone かつ、このページが起点」で行う。 */
  function isSoloPwa() {
    if (!standalone()) return false;
    try {
      // XEVARION 本体からの遷移なら referrer が同一オリジンのポータル配下になる
      if (document.referrer && document.referrer.indexOf(location.origin) === 0) return false;
    } catch (e) {}
    return true;
  }

  function portalUrl() {
    // このスクリプトはポータル直下にあるので、そこからの相対で index.html を解決する
    try {
      var me = document.currentScript && document.currentScript.src;
      if (me) return new URL("index.html", me).href;
    } catch (e) {}
    return "../index.html";
  }

  function hide() {
    var el = document.getElementById("xevaSoloPwa");
    if (el) el.remove();
    try { sessionStorage.setItem(KEY, "1"); } catch (e) {}
  }

  function show() {
    if (document.getElementById("xevaSoloPwa")) return;
    try { if (sessionStorage.getItem(KEY) === "1") return; } catch (e) {}

    var url = portalUrl();
    var wrap = document.createElement("div");
    wrap.id = "xevaSoloPwa";
    wrap.innerHTML =
      '<style>' +
      '#xevaSoloPwa{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;' +
      'padding:14px 14px calc(env(safe-area-inset-bottom,0px) + 14px);' +
      'font-family:"Noto Sans JP",sans-serif;pointer-events:none}' +
      '#xevaSoloPwa .card{pointer-events:auto;max-width:520px;margin:0 auto;border-radius:20px;padding:14px 15px;' +
      'background:linear-gradient(135deg,#fff6e6,#fff);border:1.5px solid rgba(255,170,60,.55);' +
      'box-shadow:0 14px 40px rgba(60,60,30,.3);color:#22345c}' +
      '#xevaSoloPwa .t1{font-size:13.5px;font-weight:900;margin-bottom:5px;display:flex;align-items:center;gap:7px}' +
      '#xevaSoloPwa .t2{font-size:11.5px;line-height:1.85;font-weight:600;color:#5d6f9b}' +
      '#xevaSoloPwa .t2 b{color:#c07a00}' +
      '#xevaSoloPwa .row{display:flex;gap:8px;margin-top:11px}' +
      '#xevaSoloPwa button,#xevaSoloPwa a{flex:1;padding:11px 10px;border-radius:13px;border:none;cursor:pointer;' +
      'font-size:12.5px;font-weight:900;font-family:inherit;text-align:center;text-decoration:none}' +
      '#xevaSoloPwa .go{background:linear-gradient(135deg,#4b8bff,#9b7bff);color:#fff;' +
      'box-shadow:0 6px 18px rgba(100,130,255,.42)}' +
      '#xevaSoloPwa .later{background:#fff;color:#6f82ad;border:1.5px solid rgba(120,160,230,.32);flex:0 0 92px}' +
      '</style>' +
      '<div class="card">' +
        '<div class="t1">📲 XEVARION にまとまりました</div>' +
        '<div class="t2">このアプリ単体のインストール配布は<b>終了</b>しました。<br>' +
        'お手数ですが、<b>ホーム画面のこのアイコンを削除</b>して、かわりに <b>XEVARION</b> をインストールしてください。' +
        'XEVARION を1つ入れるだけで <b>MagiLex ／ MagiBurst ／ MagiChainParty</b> がまとめてオフライン対応になります。' +
        '（データはアカウントに紐づいているので引き継がれます）</div>' +
        '<div class="row">' +
          '<a class="go" href="' + url + '">XEVARION を開く</a>' +
          '<button class="later" type="button">あとで</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(wrap);
    var later = wrap.querySelector(".later");
    if (later) later.addEventListener("click", hide);
  }

  function boot() { if (isSoloPwa()) setTimeout(show, 1200); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
