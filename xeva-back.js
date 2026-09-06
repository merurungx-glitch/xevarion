/* ============================================================
   XEVA Back — 「XEVARION へもどる」ボタンの共通部品
   ------------------------------------------------------------
   ホームに並ぶ 11 本のアプリすべてに、同じ見た目・同じ挙動の
   もどる導線を用意するための小さなスクリプト。

   ★ 見た目をそろえること以上に大事なのが「もどる前に同期を送り切る」こと。
     iPhone はアプリを切り替えた瞬間にページを凍結するので、
     XEVA・ジェムの変更が送信途中のまま止まり、ホームに帰ったときに
     「使ったはずなのに残高が戻っている」ように見えることがあった。
     そこで、このボタン（と ../index.html へ向かうすべてのリンク）を押したら
     　① XevaCloud.flushPush() で未送信ぶんを送り、
     　② 送り終わるか 900ms 経つかしてから移動する
     という順番を必ず通す。押した瞬間に画面が変わらない代わりに、
     残高が食い違わなくなる。

   使い方（各アプリの <head> か </body> 直前に置く）:
     <script src="../xeva-back.js?v=4"></script>
       → 画面の左上に浮かぶボタンを出す
     <script src="../xeva-back.js?v=4" data-mode="hook"></script>
       → ボタンは出さず、既にあるもどるリンクに①②の処理だけ足す
     data-pos="tl|tr|bl|br"   ボタンの位置（既定 tl）
     data-label="ホーム"       文字（既定 XEVARION）
     data-href="../index.html" 行き先（既定 ../index.html）
   ============================================================ */
(function () {
  "use strict";

  var me = document.currentScript;
  var d = (me && me.dataset) || {};
  var MODE  = d.mode || "button";
  var POS   = d.pos || "tl";
  var LABEL = d.label || "XEVARION";
  var HREF  = d.href || "../index.html";

  /* ── 未送信の同期を送り切ってから移動する ──
     クラウドが載っていないページ（オフライン専用アプリ）でも、
     待たずにそのまま移動するだけで動く。 */
  var leaving = false;
  function leave(href) {
    if (leaving) return;
    leaving = true;
    var go = function () { try { location.href = href; } catch (e) {} };
    var done = false;
    var fire = function () { if (done) return; done = true; go(); };
    /* 何があっても 900ms で移動する（同期が詰まっても閉じ込めない） */
    setTimeout(fire, 900);
    try {
      var C = window.XevaCloud;
      if (C && C.flushPush) {
        var p = C.flushPush();
        if (p && p.then) p.then(fire, fire); else fire();
        return;
      }
    } catch (e) {}
    fire();
  }

  /* ── 既にあるもどるリンクにも同じ処理を通す ── */
  function hookLinks() {
    var base = new URL(HREF, location.href).href;
    document.addEventListener("click", function (e) {
      var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
      if (!a || a.target === "_blank") return;
      var url;
      try { url = new URL(a.getAttribute("href"), location.href).href; } catch (err) { return; }
      if (url.split("#")[0] !== base.split("#")[0]) return;
      e.preventDefault();
      leave(a.getAttribute("href"));
    }, true);
  }

  /* ── 浮かぶボタン ── */
  function addButton() {
    if (document.getElementById("xevaBackBtn")) return;
    var css = document.createElement("style");
    css.textContent =
      "#xevaBackBtn{position:fixed;z-index:2147483000;display:flex;align-items:center;gap:5px;" +
      "padding:7px 12px 7px 9px;border:none;border-radius:99px;cursor:pointer;" +
      "font-family:'Noto Sans JP',system-ui,sans-serif;font-size:11.5px;font-weight:900;letter-spacing:.02em;" +
      "color:#fff;background:linear-gradient(135deg,rgba(20,28,54,.86),rgba(38,50,92,.86));" +
      "border:1.5px solid rgba(180,210,255,.34);box-shadow:0 5px 18px rgba(0,0,0,.38);" +
      "backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px);opacity:.82;transition:opacity .16s,transform .12s}" +
      "#xevaBackBtn:hover{opacity:1}#xevaBackBtn:active{transform:scale(.94);opacity:1}" +
      "#xevaBackBtn img{width:15px;height:15px;object-fit:contain;border-radius:4px}" +
      "#xevaBackBtn.busy{opacity:1}#xevaBackBtn.busy .lb{opacity:.6}" +
      "#xevaBackBtn.tl{top:calc(env(safe-area-inset-top,0px) + 8px);left:calc(env(safe-area-inset-left,0px) + 8px)}" +
      "#xevaBackBtn.tr{top:calc(env(safe-area-inset-top,0px) + 8px);right:calc(env(safe-area-inset-right,0px) + 8px)}" +
      "#xevaBackBtn.bl{bottom:calc(env(safe-area-inset-bottom,0px) + 8px);left:calc(env(safe-area-inset-left,0px) + 8px)}" +
      "#xevaBackBtn.br{bottom:calc(env(safe-area-inset-bottom,0px) + 8px);right:calc(env(safe-area-inset-right,0px) + 8px)}";
    document.head.appendChild(css);

    var b = document.createElement("button");
    b.id = "xevaBackBtn";
    b.className = POS;
    b.type = "button";
    b.setAttribute("aria-label", LABEL + " へもどる");
    b.innerHTML = '<span style="font-size:14px;line-height:1">‹</span>' +
      '<img src="' + (HREF.replace(/index\.html.*$/, "") || "../") + 'icons/xev-192.png" alt="">' +
      '<span class="lb">' + LABEL + "</span>";
    b.onclick = function () {
      b.classList.add("busy");
      b.querySelector(".lb").textContent = "保存中…";
      leave(HREF);
    };
    document.body.appendChild(b);
  }

  function boot() {
    hookLinks();
    if (MODE !== "hook") addButton();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.XevaBack = { leave: leave };
})();
