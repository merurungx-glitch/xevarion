/* ══════════════════════════════════════════════════════════════
   xeva-collection.js — 「コレクション」を XEVARION 全体で1本にする共通部品
   ──────────────────────────────────────────────────────────────
   ★ なぜ要るか（2026-09-05 のご報告）
     ・アカウント設定のコレクションと MagiLink のコレクションが<b>別もの</b>だった。
     ・どちらも <b>XEVAガチャのキャラ（CHAR_MASTER）しか数えていない</b>ので、
       MagiBurst で引いたキャラが1体も入らず「すべてのキャラが実装されていない」状態。
     ・コミュニティ（community.html）からは、人のコレクションを見る道が無かった。

   ★ 何をするか
     ① 持っているキャラを<b>2つの世界をまたいで</b>1つの配列で返す。
        XEVAガチャ … id はそのまま（"hina"）
        MagiBurst  … id は "mb:" 付き（"mb:shizuru"）。xeva.js の台帳と同じ決まり。
     ② 凸（重ねたぶん）も両方から集める。
        XEVAガチャ … xeva_gacha_v1.dupes（0〜4）
        MagiBurst  … magiburst_v1.chars[id].awk（0〜4）
     ③ 一覧の HTML を1本で作る（ポータル・MagiLink・コミュニティで同じ見た目）。

   ★ 画像のパス
     台帳の file は "../img/Xxx.webp" の形。表示側で "chars/"（または絶対URL＋"chars/"）
     を前に付けると "../" で打ち消されて img/ に解決される（xeva.js と同じ決まり）。
     base を渡すとその前に付く。MagiLink は絶対URLを渡すこと。

   使いかた:
     XevaCollection.ids()                     持っている id の配列
     XevaCollection.dupes()                   { id: 0〜4 }
     XevaCollection.entries(ids)              [{id,name,file,star5,no,mb}]
     XevaCollection.html(ids, dupes, {base})  一覧の HTML

   関連: xeva.js の iconCharList()／xeva-sync.js の collectionIds()
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  if (window.XevaCollection) return;

  function list() {
    try {
      if (window.XEVA && window.XEVA.iconCharList) return window.XEVA.iconCharList();
    } catch (e) {}
    return [];
  }

  /* 持っているキャラの id（XEVAガチャ＋MagiBurst） */
  function ids() {
    return list().filter(function (c) { return c.own; }).map(function (c) { return c.id; });
  }

  /* 凸（0〜4）。持っていないキャラは入れない。 */
  function dupes() {
    var out = {};
    /* XEVAガチャ */
    try {
      var g = JSON.parse(localStorage.getItem("xeva_gacha_v1") || "null");
      if (g && g.dupes) {
        Object.keys(g.dupes).forEach(function (id) {
          var lv = Math.max(0, Math.min(4, g.dupes[id] || 0));
          if (lv > 0) out[id] = lv;
        });
      }
    } catch (e) {}
    /* MagiBurst（限界突破 awk）。id は "mb:" を付けて XEVAガチャと分ける。 */
    try {
      var db = JSON.parse(localStorage.getItem("magiburst_v1") || "null");
      if (db && db.chars) {
        Object.keys(db.chars).forEach(function (id) {
          var c = db.chars[id] || {};
          var lv = Math.max(0, Math.min(4, c.awk || 0));
          if (lv > 0) out["mb:" + id] = lv;
        });
      }
    } catch (e) {}
    /* 持っていないキャラのぶんは落とす */
    var own = {};
    ids().forEach(function (id) { own[id] = true; });
    Object.keys(out).forEach(function (id) { if (!own[id]) delete out[id]; });
    return out;
  }

  /* id の配列 → 台帳の中身。知らない id は落とす。 */
  function entries(arr) {
    var by = {};
    list().forEach(function (c) { by[c.id] = c; });
    return (arr || []).map(function (id) { return by[id]; }).filter(Boolean);
  }

  /* 並び: SSR が先 → No. 順 */
  function sortEntries(es) {
    return es.slice().sort(function (a, b) {
      if (!!a.star5 !== !!b.star5) return a.star5 ? -1 : 1;
      if (!!a.mb !== !!b.mb) return a.mb ? 1 : -1;
      return (a.no || 0) - (b.no || 0);
    });
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  /* 一覧の HTML。
       opt.base  … "chars/" の前に付ける文字列（MagiLink は絶対URL）
       opt.small … サムネイル（t_ 付き）を使う。既定は true。
       opt.empty … 1体も無いときの文言 */
  function html(arr, dup, opt) {
    opt = opt || {};
    var base = opt.base == null ? "" : String(opt.base).replace(/\/?$/, "/");
    var small = opt.small !== false;
    var es = sortEntries(entries(arr));
    dup = dup || {};
    if (!es.length) {
      return '<div class="xvc-empty">' +
        esc(opt.empty || "まだキャラを集めていません。XEVARION のガチャで仲間を増やそう！") + "</div>";
    }
    var ssr = es.filter(function (c) { return c.star5; }).length;
    var cards = es.map(function (c) {
      var f = c.file;
      if (small && window.XEVA && window.XEVA.charThumbFile) f = window.XEVA.charThumbFile(f);
      var src = base + (small ? "chars_s/" : "chars/") + f;
      var lv = Math.max(0, Math.min(4, dup[c.id] || 0));
      return '<div class="xvc-card' + (c.star5 ? " ssr" : "") + '">' +
        '<img src="' + esc(src) + '" alt="' + esc(c.name) + '" loading="lazy">' +
        '<span class="xvc-rar ' + (c.star5 ? "SSR" : "SR") + '">' + (c.star5 ? "SSR" : "SR") + "</span>" +
        (lv > 0 ? '<span class="xvc-dupe">+' + lv + "凸</span>" : "") +
        (c.mb ? '<span class="xvc-mb">MB</span>' : "") +
        '<span class="xvc-nm">' + esc(c.name) + "</span></div>";
    }).join("");
    return '<div class="xvc-head">🎴 コレクション ' +
      '<span class="xvc-stat">' + es.length + " 体<i>SSR " + ssr + "</i></span></div>" +
      '<div class="xvc-grid">' + cards + "</div>";
  }

  /* 一覧の見た目。読みこんだページに1度だけ差しこむ（アプリごとに CSS を書かない）。 */
  function injectCSS() {
    if (document.getElementById("xvcCSS")) return;
    var st = document.createElement("style");
    st.id = "xvcCSS";
    st.textContent =
      ".xvc-head{display:flex;align-items:baseline;gap:8px;font-size:13px;font-weight:900;margin:0 0 9px}" +
      ".xvc-stat{margin-left:auto;font-size:11px;font-weight:800;opacity:.72}" +
      ".xvc-stat i{font-style:normal;margin-left:7px;opacity:.85}" +
      ".xvc-empty{padding:22px 10px;text-align:center;font-size:11.5px;font-weight:700;line-height:1.8;opacity:.62}" +
      ".xvc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(78px,1fr));gap:8px}" +
      ".xvc-card{position:relative;border-radius:13px;overflow:hidden;background:linear-gradient(135deg,#e7f1ff,#f6ecff);" +
        "border:2px solid rgba(120,160,230,.22);box-shadow:0 3px 10px rgba(90,130,210,.14)}" +
      ".xvc-card.ssr{border-color:#f0c040;box-shadow:0 3px 12px rgba(240,192,64,.35)}" +
      ".xvc-card img{display:block;width:100%;aspect-ratio:1;object-fit:cover}" +
      ".xvc-rar{position:absolute;top:4px;left:4px;font-size:8px;font-weight:900;letter-spacing:.04em;" +
        "padding:2px 6px;border-radius:99px;background:#8fb4ff;color:#fff}" +
      ".xvc-rar.SSR{background:#f0c040;color:#3a2a00}" +
      ".xvc-dupe{position:absolute;top:4px;right:4px;font-size:8px;font-weight:900;padding:2px 5px;border-radius:99px;" +
        "background:linear-gradient(135deg,#7cf0d0,#37e0a0);color:#0e2a20}" +
      ".xvc-mb{position:absolute;bottom:19px;right:4px;font-family:'Orbitron',sans-serif;font-size:7.5px;font-weight:900;" +
        "padding:2px 5px;border-radius:99px;background:rgba(142,107,255,.92);color:#fff;letter-spacing:.06em}" +
      ".xvc-nm{display:block;padding:4px 3px 5px;font-size:9.5px;font-weight:800;text-align:center;" +
        "background:rgba(255,255,255,.94);color:#22345c;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}";
    (document.head || document.documentElement).appendChild(st);
  }

  window.XevaCollection = {
    ids: ids, dupes: dupes, entries: entries, html: html, injectCSS: injectCSS,
    /* 保存する形（Firebase へ書くときはこれ1本） */
    mine: function () { return { ids: ids(), dupes: dupes() }; },
  };
})();
