/* ISHIDA Production — サイト用スクリプト（ナビ / スクロール演出 / フォーム） */
(function () {
  "use strict";

  // モバイルドロワー
  var hamb = document.getElementById("hamb");
  var drawer = document.getElementById("drawer");
  if (hamb && drawer) {
    hamb.addEventListener("click", function () { drawer.classList.toggle("open"); });
    drawer.addEventListener("click", function (e) { if (e.target.tagName === "A") drawer.classList.remove("open"); });
  }

  // スクロールで出現
  var els = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { threshold: 0.14 });
    els.forEach(function (el) { io.observe(el); });
  } else {
    els.forEach(function (el) { el.classList.add("in"); });
  }

  // 年号
  var y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  // 簡易お問い合わせ（デモ）
  var form = document.getElementById("contactForm");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var note = document.getElementById("formNote");
      if (note) { note.textContent = "お問い合わせありがとうございます。担当より折り返しご連絡いたします。"; note.style.color = "#00b3a4"; }
      form.reset();
    });
  }
})();
