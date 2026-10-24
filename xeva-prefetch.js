/* ============================================================
   XEVARION — アプリを開いていないあいだのデータの先読み（★★ 2026-10-24 新規）
   ------------------------------------------------------------
   ご指定「MagiDerby と MagiScope ではオフラインでも開けるように、アプリを開いていなくても情報を取得しておいて」
   ・ホーム（このページ）を開いているあいだ、ひまなときに MagiDerby と MagiScope の自動取得のデータを読み、
     それぞれのアプリが自分で控えるのと<b>同じ置き場・同じ形</b>（localStorage）に入れておく。
       MagiDerby … md_cache_v1:index.json ／ md_cache_v1:race/<race_id>.json（{ at, data }）
                    ＝ MagiDerby/js/md-net.js の cget / cset と同じ
       MagiScope … magiscope_cache_v2 の "gh:<ファイル>"（{ at, v }）
                    ＝ MagiScope/js/scope-data.js の diskLoad / diskSave と同じ（最大40件）
     → アプリを開いたときに通信できなくても、さっき取った出馬表・オッズ・結果・ランキングが出る。
   ・取りに行くのは20分に1回まで（xeva_prefetch_v1 に時刻）。データ節約モード（saveData）のときはしない。
   ★ iPhone のホーム画面アプリは、閉じているあいだは何も動かせない（OS の決まり）。
     そのため XEVARION のホームを開いたとき・開いているあいだに取っておく。
   ============================================================ */
(function () {
  "use strict";
  var KEY = "xeva_prefetch_v1", GAP = 20 * 60000;
  var GH = "https://raw.githubusercontent.com/merurungx-glitch/xevarion/magiscope-data/";
  var MD_CK = "md_cache_v1:", MS_CK = "magiscope_cache_v2";
  var busy = false;

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function jget(k) { try { var r = lsGet(k); return r ? JSON.parse(r) : null; } catch (e) { return null; } }
  function due() { var t = Number(lsGet(KEY) || 0); return !(t > 0) || Date.now() - t > GAP; }
  function canNet() {
    if (navigator.onLine === false) return false;
    try { var c = navigator.connection; if (c && c.saveData) return false; } catch (e) {}
    return true;
  }
  async function getJ(url) {
    var r = await fetch(url, { cache: "no-cache" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  }

  /* ── MagiDerby ── */
  function mdBase() { var o = lsGet("md_data_base"); return o ? String(o).replace(/\/?$/, "/") : GH + "derby/"; }
  /* 置けないとき（容量）は、確定していない古いレースの控えから消す（md-net.js の cset と同じ考え方） */
  function mdPut(name, data) {
    var s = JSON.stringify({ at: Date.now(), data: data });
    if (lsSet(MD_CK + name, s)) return;
    try {
      var ks = [];
      for (var i = 0; i < localStorage.length; i++) { var x = localStorage.key(i); if (x && x.indexOf(MD_CK + "race/") === 0) ks.push(x); }
      ks.sort(function (a, b) { return ((jget(a) || {}).at || 0) - ((jget(b) || {}).at || 0); });
      for (var j = 0; j < Math.min(6, ks.length); j++) localStorage.removeItem(ks[j]);
    } catch (e) {}
    lsSet(MD_CK + name, s);
  }
  function postAt(r) {
    var d = String(r.date || "").split("-").map(Number), t = String(r.post || "15:40").split(":").map(Number);
    return Date.UTC(d[0], d[1] - 1, d[2], t[0] || 15, t[1] || 40) - 9 * 3600000;
  }
  async function derby() {
    var base = mdBase();
    var idx = await getJ(base + "index.json?t=" + Math.floor(Date.now() / 60000));
    if (!idx || !idx.races) return;
    mdPut("index.json", idx);
    var races = idx.races.filter(function (r) { return r && r.rid; }), now = Date.now(), want = [], seen = {};
    function add(r) { if (r && r.rid && !seen[r.rid]) { seen[r.rid] = 1; want.push(r); } }
    /* これから走る2レース・直近に確定した2レース・自分の馬券があるレース */
    races.filter(function (r) { return postAt(r) > now - 6 * 3600000; }).slice(0, 2).forEach(add);
    races.filter(function (r) { return r.st === "result"; }).slice(-2).forEach(add);
    var sv = jget("magiderby_v1"), byRid = {};
    races.forEach(function (r) { byRid[r.rid] = r; });
    if (sv && sv.tk) Object.keys(sv.tk).forEach(function (id) { var t = sv.tk[id]; if (t && (t.st === "open" || t.st === "ready")) add(byRid[t.rid]); });
    for (var i = 0; i < want.length; i++) {
      var r = want[i];
      /* 確定して結果まで控えてあるレースは取り直さない */
      var c = jget(MD_CK + "race/" + r.rid + ".json");
      if (r.st === "result" && c && c.data && c.data.result) continue;
      try { mdPut("race/" + r.rid + ".json", await getJ(base + "race/" + r.rid + ".json?t=" + Math.floor(Date.now() / 60000))); } catch (e) {}
    }
  }

  /* ── MagiScope：これまでに開いたランキング（控えにあるもの）を新しくする ── */
  var MS_DEFAULT = ["lists/anime_jp-season.json", "lists/anime_fm-trend.json"];
  async function scope() {
    var base = String(window.MS_DATA || GH).replace(/\/?$/, "/");
    var d = jget(MS_CK) || {};
    var ks = Object.keys(d).filter(function (k) { return k.indexOf("gh:") === 0; })
      .sort(function (a, b) { return ((d[b] || {}).at || 0) - ((d[a] || {}).at || 0); }).slice(0, 12);
    if (!ks.length) ks = MS_DEFAULT.map(function (f) { return "gh:" + f; });
    var got = 0;
    for (var i = 0; i < ks.length; i++) {
      var f = ks[i].slice(3);
      try { d[ks[i]] = { at: Date.now(), v: await getJ(base + f) }; got++; } catch (e) {}
    }
    if (!got) return;
    var order = Object.keys(d).sort(function (a, b) { return (d[a].at || 0) - (d[b].at || 0); });
    while (order.length > 40) delete d[order.shift()];
    for (var n = 0; n < 8; n++) {
      if (lsSet(MS_CK, JSON.stringify(d))) return;
      var k0 = Object.keys(d).sort(function (a, b) { return (d[a].at || 0) - (d[b].at || 0); })[0];
      if (!k0) return; delete d[k0];
    }
  }

  async function run(force) {
    if (busy || !canNet() || document.hidden) return;
    if (!force && !due()) return;
    busy = true;
    lsSet(KEY, String(Date.now()));
    try { await derby(); } catch (e) {}
    try { await scope(); } catch (e) {}
    busy = false;
    try { window.dispatchEvent(new CustomEvent("xeva:prefetched")); } catch (e) {}
  }
  function idle(fn) { if (window.requestIdleCallback) requestIdleCallback(fn, { timeout: 4000 }); else setTimeout(fn, 600); }
  setTimeout(function () { idle(function () { run(false); }); }, 8000);
  setInterval(function () { run(false); }, 5 * 60000);
  window.addEventListener("online", function () { setTimeout(function () { run(true); }, 3000); });
  document.addEventListener("visibilitychange", function () { if (!document.hidden) setTimeout(function () { run(false); }, 2500); });
  window.XevaPrefetch = { run: run };
})();
