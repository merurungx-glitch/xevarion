/* ISHIDA Production — サイト用スクリプト
   ★★ 2026-10-30 作り直し：切りかわるヒーロー（6秒ごと・点・前後・一時停止・横スワイプ）／実績の札の切りかえ／メニュー／スクロールで現れる */
(function () {
  "use strict";
  var reduce = false;
  try { reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  /* ── メニュー（せまい画面） ── */
  var hd = document.getElementById("hd"), hamb = document.getElementById("hamb"), drawer = document.getElementById("drawer");
  function setMenu(on) {
    if (!hd || !drawer) return;
    hd.classList.toggle("open", on); drawer.classList.toggle("open", on);
    if (hamb) hamb.setAttribute("aria-expanded", on ? "true" : "false");
    drawer.setAttribute("aria-hidden", on ? "false" : "true");
    document.body.style.overflow = on ? "hidden" : "";
  }
  if (hamb) hamb.addEventListener("click", function () { setMenu(!hd.classList.contains("open")); });
  if (drawer) drawer.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
  window.addEventListener("resize", function () { if (window.innerWidth > 980) setMenu(false); });

  /* ── ヒーローのスライド ── */
  var kv = document.getElementById("kv");
  if (kv) {
    var slides = [].slice.call(kv.querySelectorAll(".kv-slide")), dots = document.getElementById("kvDots");
    var cur = 0, timer = 0, paused = reduce;
    slides.forEach(function (s, i) {
      var b = document.createElement("button");
      b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-label", (i + 1) + "枚目");
      b.addEventListener("click", function () { go(i, true); });
      dots.appendChild(b);
    });
    function paint() {
      slides.forEach(function (s, i) { s.classList.toggle("on", i === cur); s.setAttribute("aria-hidden", i === cur ? "false" : "true"); });
      [].slice.call(dots.children).forEach(function (b, i) { b.classList.toggle("on", i === cur); b.setAttribute("aria-selected", i === cur ? "true" : "false"); });
    }
    function go(i, user) { cur = (i + slides.length) % slides.length; paint(); if (user) restart(); }
    function restart() { clearInterval(timer); if (!paused) timer = setInterval(function () { go(cur + 1); }, 6000); }
    function setPaused(p) { paused = p; kv.classList.toggle("paused", p); var pb = document.getElementById("kvPlay"); if (pb) pb.setAttribute("aria-label", p ? "再生" : "一時停止"); restart(); }
    document.getElementById("kvPrev").addEventListener("click", function () { go(cur - 1, true); });
    document.getElementById("kvNext").addEventListener("click", function () { go(cur + 1, true); });
    document.getElementById("kvPlay").addEventListener("click", function () { setPaused(!paused); });
    /* 横にスワイプ */
    var sx = null;
    kv.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; }, { passive: true });
    kv.addEventListener("touchend", function (e) { if (sx == null) return; var dx = e.changedTouches[0].clientX - sx; sx = null; if (Math.abs(dx) > 50) go(cur + (dx < 0 ? 1 : -1), true); });
    /* 見えていないあいだは止める */
    document.addEventListener("visibilitychange", function () { if (document.hidden) clearInterval(timer); else restart(); });
    paint(); setPaused(paused);
  }

  /* ── 実績の札 ── */
  var tabs = [].slice.call(document.querySelectorAll(".tabs .tab")), cards = [].slice.call(document.querySelectorAll("#cards .card"));
  tabs.forEach(function (t) {
    t.addEventListener("click", function () {
      var f = t.getAttribute("data-f");
      tabs.forEach(function (x) { var on = x === t; x.classList.toggle("on", on); x.setAttribute("aria-selected", on ? "true" : "false"); });
      cards.forEach(function (c) { c.hidden = !(f === "all" || c.getAttribute("data-c") === f); if (!c.hidden) c.classList.add("in"); });
    });
  });

  /* ── スクロールで現れる ── */
  var els = document.querySelectorAll(".rv");
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -30px 0px" });
    els.forEach(function (el) { io.observe(el); });
  } else {
    [].forEach.call(els, function (el) { el.classList.add("in"); });
  }

  /* ── 年号 ── */
  var y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
})();
