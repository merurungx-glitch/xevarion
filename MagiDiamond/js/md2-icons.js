/* ══════════════════════════════════════════════════════════════
   md2-icons.js — MagiDiamond のアイコンを絵文字から<b>自前のSVG</b>へ
   ------------------------------------------------------------
   ★ なぜ作ったか（2026-09-06 のご報告）
     ・下バーで開いているタブは、絵文字のうしろに黄色い板を敷いていたので
       <b>絵文字が板にまぎれて見えなくなっていた</b>。
     ・絵文字は端末ごとに絵柄が変わるうえ、白黒（filter:grayscale）にすると
       つぶれて何の絵かわからない。
   ★ どう直したか
     ・線だけの 24×24 の SVG にして、色は <b>currentColor</b> で決める。
       選んでいるタブは「金の板＋墨の線」、選んでいないタブは「灰の線」。
       どちらも<b>線と下地の明るさが必ず離れる</b>ので、つぶれようがない。
     ・使いかたは HTML に <span class="i" data-ic="home"></span> と書くだけ。
       JS からは MDIC.svg("home") で文字列としても取り出せる。
   ★ アイコンを足すときは ICONS に1行足すだけ（別表は作らない）。
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var A = 'xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" ' +
          'stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"';

  var ICONS = {
    /* 下バー */
    home:   '<path d="M3.6 10.4 12 3.4l8.4 7"/><path d="M5.6 9.6V20h12.8V9.6"/><path d="M9.7 20v-5.4h4.6V20"/>',
    match:  '<circle cx="12" cy="12" r="8.2"/><path d="M6.4 6.6c2.2 1.5 3.4 3.2 3.4 5.4s-1.2 3.9-3.4 5.4"/>' +
            '<path d="M17.6 6.6c-2.2 1.5-3.4 3.2-3.4 5.4s1.2 3.9 3.4 5.4"/>',
    team:   '<path d="M12 3.2 19 5.6v6c0 3.9-2.7 7.3-7 9.2-4.3-1.9-7-5.3-7-9.2v-6z"/><path d="M9.2 12.1l2 2.1 3.6-4"/>',
    chara:  '<circle cx="9.2" cy="8.6" r="3.1"/><path d="M3.4 19.6c0-3.1 2.6-5.2 5.8-5.2s5.8 2.1 5.8 5.2"/>' +
            '<path d="M16.1 6.2a3 3 0 0 1 0 5.9"/><path d="M17.2 14.7c2.1.6 3.4 2.3 3.4 4.9"/>',
    shop:   '<path d="M4.6 8.4h14.8l-1.2 11.2H5.8z"/><path d="M8.8 8.4V6.7a3.2 3.2 0 0 1 6.4 0v1.7"/>',
    /* ホームのメニュー */
    ranked: '<path d="M3.6 17.6 5 7.2l4 3.4L12 5l3 5.6 4-3.4 1.4 10.4z"/><path d="M4.6 20.2h14.8"/>',
    quick:  '<path d="M13.4 2.8 5.2 13.6h5.3L10 21.2l8.4-11h-5.4z"/>',
    friend: '<path d="M12 20.2C6.6 16.6 3.6 13.8 3.6 10.3a4.2 4.2 0 0 1 8.4-1.5 4.2 4.2 0 0 1 8.4 1.5c0 3.5-3 6.3-8.4 9.9z"/>',
    event:  '<path d="M5.2 20.4V4.2h1.9v16.2"/><path d="M7.1 5.2h11.2l-2.6 3.4 2.6 3.4H7.1z"/>',
    /* そのほか */
    gem:    '<path d="M7 3.6h10l4 5.4L12 20.6 3 9z"/><path d="M3 9h18"/><path d="m12 20.6-3.4-11.6L7 3.6"/>',
    coin:   '<circle cx="12" cy="12" r="8.2"/><path d="M12 7.6v8.8"/><path d="M14.6 9.6c-.7-.8-1.7-1.1-2.9-1.1-1.6 0-2.7.7-2.7 1.9 0 2.7 5.6 1.3 5.6 4 0 1.3-1.2 2.1-2.9 2.1-1.3 0-2.3-.4-3-1.2"/>',
    back:   '<path d="M14.6 5.6 8.2 12l6.4 6.4"/>',
    plus:   '<path d="M12 5.4v13.2"/><path d="M5.4 12h13.2"/>',
    bat:    '<path d="M4.4 19.6 8 16"/><path d="M7 17.2 17.4 6.8a3 3 0 1 0-4.2-4.2L2.8 13"/>',
  };

  function svg(name, cls) {
    var d = ICONS[name];
    if (!d) return "";
    return '<svg class="mdic' + (cls ? " " + cls : "") + '" ' + A + ' aria-hidden="true">' + d + "</svg>";
  }
  /* HTML の <span data-ic="home"></span> をまとめて置きかえる（描き直すたび呼んでよい） */
  function paint(root) {
    var host = root || document;
    var list = host.querySelectorAll ? host.querySelectorAll("[data-ic]") : [];
    for (var i = 0; i < list.length; i++) {
      var el = list[i], n = el.getAttribute("data-ic");
      if (el.firstElementChild && el.firstElementChild.tagName === "svg") continue;
      var s = svg(n);
      if (s) el.innerHTML = s;
    }
  }
  window.MDIC = { svg: svg, paint: paint, has: function (n) { return !!ICONS[n]; } };

  /* 画面を描き直したあとにも効くように、body の中を見張る */
  function boot() {
    paint(document);
    try {
      var mo = new MutationObserver(function () { paint(document); });
      mo.observe(document.body, { childList: true, subtree: true });
    } catch (e) {}
  }
  if (document.body) boot();
  else document.addEventListener("DOMContentLoaded", boot, { once: true });
})();
