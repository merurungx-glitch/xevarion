/* ============================================================
   XEVA ALIVE — 極彩祭・極煌祭・極華祭のキャラクターの「四角い絵」を、パートナーのように少しだけ動かす
   ★★ 2026-10-02 ご指定「正方形のキャラクターをキャラが少しパートナーのように動くように。
      極鍠祭（極煌祭）と極華祭と極彩祭のガチャのキャラのみを動くように」
   ★★ 2026-10-02b ご指定「正方形のキャラ絵で歪んでいるところがあるので簡単に動かす形でよい」
      → 絵をゆがめる動き（WebGL で頭・胸・髪・目を別々に動かす）はやめて、
        <b>絵の形はそのまま</b>で、呼吸のようにゆっくり少しだけ大きく・上下する動きにした（ゆがみは出ない）。
        さわる（タップ・クリック）と小さくぴょんと弾む。
   ・対象は 10 体だけ：極彩祭（ヒナノ・ハノン・ココハ・タキナ）／極煌祭（ムツミ・レイナ・アズサ）／極華祭（クミコ＆レイナ・カグラ・コトリ）。
     img/t_<名前>.webp（サムネイル）と img/<名前>.webp（原寸）のどちらにも効く。ほかのキャラは今までどおり動かない。
   ・しくみ：その <img> に class "xa-live" を付けるだけ（CSS の scale / translate。もとの transform・ホバーの動きとは別に重なる）。
     すでに別の動き（出てくる演出など）が付いている絵には付けない。いつも 1 枚ずつ少し時間をずらす（そろって動かない）。
   ・動かさないとき：OS の「視差効果を減らす」（prefers-reduced-motion）／localStorage "xeva_alive" = "off"。
   ・xeva.js が読み込みのあとにこのファイルを読む（各画面の HTML は書きかえなくてよい）。
   ============================================================ */
(function () {
  "use strict";
  if (window.XevaAlive) return;

  /* ★★ 2026-10-03 極彩祭にタキナ（Takina）を追加 */
  /* ★★ 2026-10-07 Sapphire Breeze（UR）のヒバナ・フキも（タキナは極彩祭から移ったがそのまま動かす） */
  var NAMES = ["Hinano", "Hanon", "Kokoha", "Takina", "Hibana", "Fuki", "Mutsumi", "Reina", "Azusa", "KumikoReina", "Kagura", "Kotori"];
  /* 「…/t_Reina.webp」「…/Reina.webp」は対象。「…/KumikoReina.webp」は KumikoReina として。KotoriAlpha は対象外 */
  var RE = new RegExp("(?:^|/)(?:t_)?(" + NAMES.join("|") + ")\\.webp(?:[?#]|$)");

  var reduce = false;
  try { reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
  function offByUser() { try { return localStorage.getItem("xeva_alive") === "off"; } catch (e) { return false; } }

  /* :where() でつよさ 0 → ほかの画面の動き（animation）があればそちらが勝つ */
  var CSS = [
    "@keyframes xaBreath{0%,100%{scale:1;translate:0 0}50%{scale:1.022;translate:0 -1.1%}}",
    "@keyframes xaHop{0%{translate:0 0}35%{translate:0 -5%}62%{translate:0 0}80%{translate:0 -1.4%}100%{translate:0 0}}",
    ":where(img.xa-live){animation:xaBreath 4.2s ease-in-out infinite;animation-delay:var(--xa-d,0s)}",
    ":where(img.xa-live.xa-hop){animation:xaHop .55s ease-out 1}",
  ].join("\n");

  var mo = null, pending = new Set(), pendT = 0, n = 0;
  function nameOf(img) {
    var s = img.currentSrc || img.getAttribute("src") || "";
    var m = RE.exec(s);
    return m ? m[1] : "";
  }
  function check(img) {
    var on = !!nameOf(img);
    var has = img.classList.contains("xa-live");
    if (on && !has) {
      /* ほかの動き（CSS の animation）がすでに付いている絵はそのまま */
      try { var an = getComputedStyle(img).animationName; if (an && an !== "none") return; } catch (e) {}
      img.style.setProperty("--xa-d", (-((n++ * 1.37) % 4.2)).toFixed(2) + "s");
      img.classList.add("xa-live");
    } else if (!on && has) {
      img.classList.remove("xa-live", "xa-hop");
    }
  }
  function scan(root) {
    if (!root) return;
    if (root.tagName === "IMG") { check(root); return; }
    if (!root.getElementsByTagName) return;
    var L = root.getElementsByTagName("img");
    for (var i = 0; i < L.length; i++) check(L[i]);
  }
  function flush() { pendT = 0; var list = Array.from(pending); pending.clear(); list.forEach(scan); }
  function queue(x) { pending.add(x); if (!pendT) pendT = setTimeout(flush, 80); }

  function start() {
    if (reduce || offByUser() || mo) return;
    if (!document.getElementById("xa-style")) {
      var st = document.createElement("style"); st.id = "xa-style"; st.textContent = CSS;
      (document.head || document.documentElement).appendChild(st);
    }
    try {
      mo = new MutationObserver(function (ms) {
        for (var i = 0; i < ms.length; i++) {
          var m = ms[i];
          if (m.type === "attributes") { if (m.target.tagName === "IMG") queue(m.target); continue; }
          for (var j = 0; j < m.addedNodes.length; j++) { var a = m.addedNodes[j]; if (a.nodeType === 1) queue(a); }
        }
      });
      mo.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["src", "srcset"] });
    } catch (e) {}
    scan(document.body);
    /* さわると小さく弾む（パートナーと同じ「さわると反応」） */
    document.addEventListener("pointerdown", function (e) {
      var el = e.target;
      if (!el || el.tagName !== "IMG" || !el.classList.contains("xa-live")) return;
      el.classList.remove("xa-hop"); void el.offsetWidth; el.classList.add("xa-hop");
      setTimeout(function () { el.classList.remove("xa-hop"); }, 600);
    }, true);
  }
  function stop() {
    if (mo) { mo.disconnect(); mo = null; }
    var L = document.querySelectorAll("img.xa-live");
    for (var i = 0; i < L.length; i++) L[i].classList.remove("xa-live", "xa-hop");
  }

  window.XevaAlive = {
    names: NAMES.slice(),
    /* 設定から：false で止めて元の絵に戻す／true でまた動かす */
    set: function (on) {
      try { localStorage.setItem("xeva_alive", on ? "on" : "off"); } catch (e) {}
      if (on) start(); else stop();
    },
    refresh: function () { scan(document.body); },
    get count() { return document.querySelectorAll("img.xa-live").length; },
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
