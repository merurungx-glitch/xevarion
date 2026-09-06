/* ══════════════════════════════════════════════════════════════
   xeva-i18n.js — XEVARION 共通の言語切りかえ（日本語 ⇄ English）
   ──────────────────────────────────────────────────────────────
   ★ なぜこの作りか（2026-09-05 のご指定）
     対象は「開始画面」「XEVARION のホームとガチャなどの全機能」「MagiBurst」。
     どれも<b>画面の中身を JavaScript が後から作る</b>ので、
     読みこんだときに1回だけ置きかえるやりかたでは、ほとんど何も訳せない。
     そこで
       ① 読みこんだときに1回まるごと訳す
       ② そのあとは <b>MutationObserver</b> で「増えた・書きかわった」ところだけ訳す
     の2段にしてある。アプリ側のコードは<b>1行も変えなくてよい</b>。

   ★ 訳すもの
     ・文字（テキストノード）
     ・属性 placeholder / aria-label / title / alt / value（ボタン）
     どちらも辞書に<b>そのままの文字列</b>があるときだけ置きかえる。
     見つからなければ日本語のまま出す（＝訳し漏れで画面が壊れない）。

   ★ 元の日本語は node.__ja に控える。日本語へ戻すときはそれを書き戻すだけ。

   ★ 使いかた
       <script src="xeva-i18n.js"></script>
       <script src="xeva-i18n-dict.js"></script>   ← 辞書（別ファイル）
     JS の中の文字列は XevaI18n.t("こんにちは") で引ける。

   ★ 言語の置き場所は localStorage の "xeva_lang_v1"。
     どのアプリからでも同じ値を見るので、1か所で決めれば全体に効く。

   関連: xevarion.js の applyLang()（ポータルのトップページ専用の古い仕組み）
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  if (window.XevaI18n) return;

  var KEY = "xeva_lang_v1";
  var DICT = {};          // ja -> en
  var lang = "ja";
  var mo = null;
  var ATTRS = ["placeholder", "aria-label", "title", "alt"];

  try { lang = localStorage.getItem(KEY) || "ja"; } catch (e) { lang = "ja"; }
  if (lang !== "en") lang = "ja";

  /* 辞書を足す（何回でも呼べる。あとから足したものが勝つ） */
  function add(map) {
    if (!map) return;
    for (var k in map) if (Object.prototype.hasOwnProperty.call(map, k)) DICT[k] = map[k];
    if (lang === "en" && document.body) sweep(document.body);
  }

  /* ★★ 2026-09-05 型（正規表現）での置きかえ。
     「Lv.50／戦力 19,872」のように<b>数字が入る文</b>は、
     1つずつ辞書に並べられない（キャラの数だけ増える）ので型で拾う。
     ★ そのままの文字（DICT）のほうが<b>先</b>。型は見つからなかったときだけ。 */
  var PATS = [];
  function addPatterns(list) {
    if (!list) return;
    for (var i = 0; i < list.length; i++) PATS.push(list[i]);
    if (lang === "en" && document.body) sweep(document.body);
  }
  function byPattern(k) {
    for (var i = 0; i < PATS.length; i++) {
      var re = PATS[i][0];
      re.lastIndex = 0;
      if (re.test(k)) { re.lastIndex = 0; return k.replace(re, PATS[i][1]); }
    }
    return undefined;
  }

  /* 1つの文字列を訳す。辞書にも型にも無ければそのまま返す。 */
  function t(s) {
    if (lang !== "en") return s;
    var k = String(s == null ? "" : s).trim();
    var v = DICT[k];
    if (v === undefined) v = byPattern(k);
    return v === undefined ? s : v;
  }

  /* ── テキストノード ── */
  function txtOK(node) {
    var p = node.parentNode;
    if (!p) return false;
    var tag = p.nodeName;
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT" || tag === "TEXTAREA") return false;
    if (!node.nodeValue || !node.nodeValue.trim()) return false;
    return true;
  }
  function doText(node) {
    if (!txtOK(node)) return;
    var raw = node.nodeValue;
    var key = raw.trim();
    var en = DICT[key];
    if (en === undefined) en = byPattern(key);
    if (en === undefined || en === key) return;
    if (node.__ja === undefined) node.__ja = raw;
    node.nodeValue = raw.replace(key, en);
  }
  function undoText(node) {
    if (node.__ja !== undefined) { node.nodeValue = node.__ja; node.__ja = undefined; }
  }

  /* ── 属性 ── */
  function doAttrs(el) {
    if (!el || el.nodeType !== 1) return;
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i];
      if (!el.hasAttribute(a)) continue;
      var raw = el.getAttribute(a);
      var key = String(raw || "").trim();
      if (!key) continue;
      var en = DICT[key];
      if (en === undefined) en = byPattern(key);
      if (en === undefined || en === key) continue;
      /* ★ dataset のキーに "-" は使えない（aria-label で例外になる）ので、
         控えは data-xvja-<属性名> という<b>属性</b>に置く。 */
      var mark = "data-xvja-" + a;
      if (!el.hasAttribute(mark)) el.setAttribute(mark, raw);
      el.setAttribute(a, en);
    }
    /* input[type=button|submit] の value */
    if (el.nodeName === "INPUT" && /^(button|submit|reset)$/i.test(el.type || "")) {
      var v = String(el.value || "").trim();
      if (v && DICT[v] !== undefined) {
        if (!el.hasAttribute("data-xvja-value")) el.setAttribute("data-xvja-value", el.value);
        el.value = DICT[v];
      }
    }
  }
  function undoAttrs(el) {
    if (!el || el.nodeType !== 1) return;
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i], mark = "data-xvja-" + a;
      if (el.hasAttribute(mark)) {
        el.setAttribute(a, el.getAttribute(mark));
        el.removeAttribute(mark);
      }
    }
    if (el.hasAttribute("data-xvja-value")) {
      el.value = el.getAttribute("data-xvja-value"); el.removeAttribute("data-xvja-value");
    }
  }

  /* ── 木をひとまわり ── */
  function walk(root, fnText, fnEl) {
    if (!root) return;
    if (root.nodeType === 3) { fnText(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    if (root.nodeType === 1) fnEl(root);
    var w;
    try {
      w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, null);
    } catch (e) { return; }
    var n;
    while ((n = w.nextNode())) {
      if (n.nodeType === 3) fnText(n); else fnEl(n);
    }
  }
  function sweep(root) { walk(root, doText, doAttrs); }
  function unsweep(root) { walk(root, undoText, undoAttrs); }

  /* ── 増えた・書きかわったところだけ訳す ── */
  var queued = null, pending = [];
  function flush() {
    queued = null;
    var list = pending; pending = [];
    for (var i = 0; i < list.length; i++) {
      try { sweep(list[i]); } catch (e) {}
    }
  }
  function onMut(recs) {
    if (lang !== "en") return;
    for (var i = 0; i < recs.length; i++) {
      var r = recs[i];
      if (r.type === "characterData") pending.push(r.target);
      else if (r.type === "attributes") pending.push(r.target);
      else for (var j = 0; j < r.addedNodes.length; j++) pending.push(r.addedNodes[j]);
    }
    if (!pending.length || queued) return;
    /* ★ すぐ訳すと、書きかえている途中の DOM を触って重くなる。
       次のフレームにまとめる（描き直しの回数ぶん走らせない）。 */
    queued = (window.requestAnimationFrame || setTimeout)(flush, 0);
  }
  function watch() {
    if (mo || typeof MutationObserver !== "function" || !document.body) return;
    mo = new MutationObserver(onMut);
    mo.observe(document.body, {
      childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ATTRS,
    });
  }
  function unwatch() { if (mo) { mo.disconnect(); mo = null; } }

  /* ── 切りかえ ── */
  function apply(next, quiet) {
    next = next === "en" ? "en" : "ja";
    var was = lang;
    lang = next;
    try { localStorage.setItem(KEY, next); } catch (e) {}
    document.documentElement.lang = next;
    document.documentElement.setAttribute("data-xvlang", next);
    if (!document.body) return;
    if (next === "en") { sweep(document.body); watch(); }
    else { unwatch(); unsweep(document.body); }
    if (!quiet && was !== next) {
      try { window.dispatchEvent(new CustomEvent("xeva:lang", { detail: { lang: next } })); } catch (e) {}
    }
  }

  function boot() {
    document.documentElement.lang = lang;
    document.documentElement.setAttribute("data-xvlang", lang);
    if (lang === "en") { sweep(document.body); watch(); }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();   /* ★ defer で読まれたときは DOMContentLoaded がもう終わっている */

  window.XevaI18n = {
    KEY: KEY,
    add: add,
    addPatterns: addPatterns,
    t: t,
    get: function () { return lang; },
    set: function (l) { apply(l); },
    toggle: function () { apply(lang === "en" ? "ja" : "en"); },
    /* いま画面にある日本語のうち、辞書に無いものを集める（訳し漏れ探し用） */
    missing: function (root) {
      var out = {}, re = /[぀-ヿ一-鿿]/;
      walk(root || document.body, function (n) {
        var k = n.nodeValue.trim();
        if (k && re.test(k) && DICT[k] === undefined && byPattern(k) === undefined) out[k] = (out[k] || 0) + 1;
      }, function () {});
      return out;
    },
  };
})();
