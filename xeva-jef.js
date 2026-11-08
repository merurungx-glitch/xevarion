/* ══════════════════════════════════════════════════════════════
   ★★ 2026-11-08 ジェフユナイテッド千葉のホームデザイン（ご指定「XEVARION ホームのデザインでジェフ千葉使用のホームデザインも選べるように。
      設定から変更ができ、既存のホームデザインとどちらにするか選べるように。ジェフのホームでは応援歌の PRIDE などが流れると嬉しい」）
   ------------------------------------------------------------
   ・設定の「ホームのデザイン」→ 標準／ジェフ千葉。保存 xeva_home_theme_v1（{ theme:"std"|"jef", bgm:"anthem"|"mine", t }・同期する）。
   ・ジェフ千葉のデザイン（body.xh-jef・見た目は xeva-jef.css）：
       夜のスタジアムの背景（jef/stadium.svg・オリジナルの絵・エンブレムは描いていない）／黄と緑の応援旗のガーランド／紙ふぶき／
       次の試合と前節の結果の札（MagiMarket と同じ自動取得のデータ market/jef.json・押すと MagiMarket のジェフのタブ）。
   ・BGM：★実在の応援歌（PRIDE など）の音源・メロディ・歌詞は、こちらで用意・再現できない（著作物のため）。
       → 既定はオリジナル曲「Yellow & Green Anthem」（music/jef-anthem.mp3・太鼓・三三七拍子・ブラス・スタンドの合唱。_jef_src/make_anthem.py で作曲・合成）。
       → 「自分の音源」：お手持ちの音源ファイル（PRIDE など）を<b>この端末の中だけ</b>（IndexedDB）に保存して、順番に流す（外には送らない）。
   ・BGM のオン／オフは今までどおり設定の「BGM」（xeva_music_v1）。曲だけ入れかえる（#xevaMusic の src）。
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const KEY = "xeva_home_theme_v1";
  const ANTHEM = "music/jef-anthem.mp3?v=1";
  const DATA = "https://raw.githubusercontent.com/merurungx-glitch/xevarion/magiscope-data/market/jef.json";
  const CK = "mm_cache_v1:jef.json";   /* MagiMarket と同じ控え（どちらで読んでも使い回す） */
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function st() {
    let s = null; try { s = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) {}
    return Object.assign({ theme: "std", bgm: "anthem" }, s && typeof s === "object" ? s : {});
  }
  function save(o) { try { localStorage.setItem(KEY, JSON.stringify(Object.assign(st(), o, { t: Date.now() }))); } catch (e) {} }
  const isJef = () => st().theme === "jef";

  /* ══ 自分の音源（この端末の IndexedDB だけ）══ */
  const DB = { db: null };
  function idb() {
    if (DB.db) return Promise.resolve(DB.db);
    return new Promise((ok, ng) => {
      try {
        const r = indexedDB.open("xeva_jef_v1", 1);
        r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains("tracks")) d.createObjectStore("tracks", { keyPath: "id" }); };
        r.onsuccess = () => { DB.db = r.result; ok(DB.db); };
        r.onerror = () => ng(r.error);
      } catch (e) { ng(e); }
    });
  }
  async function tracks() {
    try {
      const d = await idb();
      return await new Promise((ok) => { const out = []; const c = d.transaction("tracks").objectStore("tracks").openCursor(); c.onsuccess = () => { const cur = c.result; if (cur) { out.push(cur.value); cur.continue(); } else ok(out.sort((a, b) => a.at - b.at)); }; c.onerror = () => ok([]); });
    } catch (e) { return []; }
  }
  async function addTrack(file) {
    const d = await idb();
    const rec = { id: "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: String(file.name || "音源").replace(/\.[a-z0-9]+$/i, "").slice(0, 60), type: file.type || "audio/mpeg", size: file.size, blob: file, at: Date.now() };
    await new Promise((ok, ng) => { const tx = d.transaction("tracks", "readwrite"); tx.objectStore("tracks").put(rec); tx.oncomplete = ok; tx.onerror = () => ng(tx.error); });
    return rec;
  }
  async function delTrack(id) {
    const d = await idb();
    await new Promise((ok) => { const tx = d.transaction("tracks", "readwrite"); tx.objectStore("tracks").delete(id); tx.oncomplete = ok; tx.onerror = ok; });
  }

  /* ══ BGM：#xevaMusic の曲を入れかえる ══ */
  const P = { list: [], i: 0, url: "", on: false };
  const musicEl = () => document.getElementById("xevaMusic");
  const musicOn = () => { try { return localStorage.getItem("xeva_music_v1") !== "off"; } catch (e) { return true; } };
  function setSrc(src, loop) {
    const el = musicEl(); if (!el) return;
    const playing = !el.paused;
    if (P.url && P.url !== src) { try { URL.revokeObjectURL(P.url); } catch (e) {} P.url = ""; }
    if (src) { if (el.getAttribute("src") !== src) { el.src = src; } }
    else if (el.hasAttribute("src")) { el.removeAttribute("src"); el.load(); }
    el.loop = loop !== false;
    if (playing && musicOn()) { const p = el.play(); if (p && p.catch) p.catch(() => {}); }
  }
  async function applyMusic() {
    const el = musicEl(); if (!el) return;
    if (!isJef()) { P.on = false; setSrc("", true); return; }
    P.on = true;
    if (st().bgm === "mine") {
      const list = await tracks();
      if (list.length) {
        P.list = list; P.i = P.i % list.length;
        const url = URL.createObjectURL(list[P.i].blob); P.url = url;
        setSrc(url, list.length === 1);
        return;
      }
    }
    setSrc(ANTHEM, true);
  }
  /* 自分の音源が2曲以上なら、終わったら次の曲 */
  function onEnded() {
    if (!P.on || st().bgm !== "mine" || P.list.length < 2) return;
    P.i = (P.i + 1) % P.list.length;
    const el = musicEl(); if (!el) return;
    const old = P.url; const url = URL.createObjectURL(P.list[P.i].blob); P.url = url;
    el.src = url; el.loop = false;
    const p = el.play(); if (p && p.catch) p.catch(() => {});
    if (old) setTimeout(() => { try { URL.revokeObjectURL(old); } catch (e) {} }, 2000);
  }

  /* ══ 試合のデータ（MagiMarket と同じ）══ */
  const FALLBACK = { matches: [
    { id: "2026110805", date: "2026-11-08", time: "17:03", home: true, opp: "水戸", sec: "第14節", state: "game-over", gf: 1, ga: 0, stadium: "フクアリ" },
    { id: "2026112001", date: "2026-11-20", time: "19:00", home: false, opp: "柏", sec: "第15節", state: "ticket", stadium: "三協Ｆ柏" },
  ] };
  function cached() { try { const c = JSON.parse(localStorage.getItem(CK) || "null"); return c && c.data ? c.data : null; } catch (e) { return null; } }
  let fetching = null;
  function fetchData() {
    if (fetching) return fetching;
    fetching = fetch(DATA + "?t=" + Math.floor(Date.now() / 600000), { cache: "no-cache" }).then((r) => (r.ok ? r.json() : null)).then((j) => {
      if (j && j.matches) { try { localStorage.setItem(CK, JSON.stringify({ at: Date.now(), data: j })); } catch (e) {} }
      return j;
    }).catch(() => null).finally(() => { setTimeout(() => { fetching = null; }, 60000); });
    return fetching;
  }
  const JST = 9 * 3600000, WD = ["日", "月", "火", "水", "木", "金", "土"];
  function kick(m) { const d = String(m.date).split("-").map(Number), t = String(m.time || "14:00").split(":").map(Number); return Date.UTC(d[0], d[1] - 1, d[2], t[0] || 0, t[1] || 0) - JST; }
  function md(ms) { const d = new Date(ms + JST); return (d.getUTCMonth() + 1) + "/" + d.getUTCDate() + "(" + WD[d.getUTCDay()] + ")"; }
  function cardHTML(data) {
    const ms = ((data && data.matches) || []).slice();
    const over = ms.filter((m) => m.state === "game-over" && typeof m.gf === "number").sort((a, b) => kick(b) - kick(a));
    const next = ms.filter((m) => m.state !== "game-over" && kick(m) > Date.now() - 2 * 3600000).sort((a, b) => kick(a) - kick(b));
    const L = over[0], N = next[0];
    let h = '<div class="xj-c-h"><i></i>JEF UNITED</div>';
    if (L) { const r = L.gf > L.ga ? ["W", "WIN"] : L.gf === L.ga ? ["D", "DRAW"] : ["L", "LOSE"]; h += '<div class="xj-c-l"><small>前節</small><b>' + L.gf + "-" + L.ga + "</b><span>" + esc(L.opp) + '</span><em class="' + r[0] + '">' + r[1] + "</em></div>"; }
    if (N) h += '<div class="xj-c-n"><small>次節 ' + md(kick(N)) + " " + esc(N.time || "") + "</small><b>vs " + esc(N.opp) + "</b><span>" + (N.home ? "ホーム" : "アウェイ") + "</span></div>";
    h += '<div class="xj-c-go">勝敗を予想する ›</div>';
    return h;
  }
  function paintCard() {
    const left = document.querySelector("#xhLobby .xl-left");
    let c = document.getElementById("xjCard");
    if (!isJef() || !left) { if (c) c.remove(); return; }
    if (!c) {
      c = document.createElement("button"); c.type = "button"; c.id = "xjCard"; c.className = "xj-card"; c.setAttribute("aria-label", "ジェフ千葉の試合（MagiMarket）");
      c.addEventListener("click", (e) => { e.stopPropagation(); try { if (typeof xhOpenApp === "function") { xhOpenApp("magimarket", "MagiMarket/index.html#jef"); return; } } catch (e2) {} location.href = "MagiMarket/index.html#jef"; });
    }
    if (c.parentNode !== left) left.appendChild(c);
    c.innerHTML = cardHTML(cached() || FALLBACK);
  }

  /* ══ 見た目の部品 ══ */
  function deco(on) {
    const col = document.getElementById("xhCol");
    ["xjFlags", "xjFx"].forEach((id) => { const e = document.getElementById(id); if (e && !on) e.remove(); });
    if (!on || !col) return;
    if (!document.getElementById("xjFlags")) {
      const f = document.createElement("div"); f.id = "xjFlags"; f.className = "xj-flags"; f.setAttribute("aria-hidden", "true");
      let h = '<svg viewBox="0 0 400 30" preserveAspectRatio="none"><path d="M0 3 Q200 16 400 3" fill="none" stroke="#fff" stroke-width="1.6" opacity=".8"/>';
      for (let i = 0; i < 16; i++) { const x = 6 + i * 25, y = 3 + 13 * Math.sin(Math.PI * (x / 400)) * 1; h += '<path d="M' + (x - 9) + " " + (y + 0.5) + " L" + (x + 9) + " " + (y + 0.5) + " L" + x + " " + (y + 17) + ' Z" fill="' + (i % 2 ? "#00a650" : "#ffd60a") + '" stroke="#fff" stroke-width=".8"/>'; }
      f.innerHTML = h + "</svg>";
      col.appendChild(f);
    }
    placeFlags();
    if (!document.getElementById("xjFx")) {
      const fx = document.createElement("div"); fx.id = "xjFx"; fx.className = "xj-fx"; fx.setAttribute("aria-hidden", "true");
      let h = "";
      for (let i = 0; i < 18; i++) h += '<i style="left:' + (Math.random() * 100).toFixed(1) + "%;background:" + (i % 3 === 0 ? "#00a650" : i % 3 === 1 ? "#ffd60a" : "#fff") + ";animation-delay:-" + (Math.random() * 14).toFixed(1) + "s;animation-duration:" + (9 + Math.random() * 8).toFixed(1) + "s;--sx:" + ((Math.random() - 0.5) * 80).toFixed(0) + 'px"></i>';
      fx.innerHTML = h;
      const stage = document.getElementById("xhMate");
      if (stage && stage.parentNode === col) stage.insertAdjacentElement("afterend", fx); else col.appendChild(fx);
    }
  }
  /* 応援旗は上のバーのすぐ下に（バーの高さは端末で変わる・ホームが出る前は 0 なので、出てから測り直す） */
  function placeFlags() {
    const fl = document.getElementById("xjFlags"), col = document.getElementById("xhCol"), tb = col && col.querySelector(".xh-top");
    if (!fl || !tb || !tb.offsetHeight) return;
    fl.style.top = Math.round(tb.offsetTop + tb.offsetHeight + 5) + "px";
  }
  function apply() {
    const on = isJef();
    document.body.classList.toggle("xh-jef", on);
    deco(on);
    paintCard();
    applyMusic();
    if (on) fetchData().then((d) => { if (d) paintCard(); });
    const sub = document.getElementById("xhSetThemeSub"); if (sub) sub.textContent = on ? "ジェフ千葉" + (st().bgm === "mine" ? "（BGM：自分の音源）" : "（BGM：Yellow & Green Anthem）") : "標準";
  }

  /* ══ 設定の画面 ══ */
  function sheetEl() {
    let ov = document.getElementById("xjSheet");
    if (!ov) {
      ov = document.createElement("div"); ov.id = "xjSheet"; ov.className = "xj-sh";
      ov.addEventListener("click", (e) => { if (e.target === ov) close(); });
      document.body.appendChild(ov);
    }
    return ov;
  }
  function close() { const ov = document.getElementById("xjSheet"); if (ov) ov.classList.remove("on"); }
  async function open() {
    try { if (typeof xhCloseSheet === "function") xhCloseSheet("xhSetSheet"); } catch (e) {}
    const ov = sheetEl(), s = st(), list = await tracks();
    const card = (id, nm, sub, prev) => '<button class="xj-opt' + (s.theme === id ? " on" : "") + '" data-xj="theme" data-v="' + id + '"><span class="xj-pv ' + prev + '"></span><b>' + nm + "</b><small>" + sub + "</small>" + (s.theme === id ? '<i class="xj-ck">✓</i>' : "") + "</button>";
    ov.innerHTML = '<div class="xj-in" role="dialog" aria-modal="true" aria-label="ホームのデザイン">' +
      '<div class="xj-hd"><b>ホームのデザイン</b><button class="xj-x" data-xj="close" aria-label="閉じる">✕</button></div>' +
      '<div class="xj-opts">' + card("std", "標準", "いつものロビー", "std") + card("jef", "ジェフ千葉", "夜のスタジアム・黄と緑", "jef") + "</div>" +
      '<div class="xj-sec' + (s.theme === "jef" ? "" : " dim") + '"><div class="xj-st">ジェフのホームの BGM</div>' +
      '<label class="xj-r"><input type="radio" name="xjbgm" data-xj="bgm" value="anthem"' + (s.bgm !== "mine" ? " checked" : "") + '><span><b>Yellow &amp; Green Anthem</b><small>オリジナルの応援曲（太鼓・三三七拍子・ブラス・スタンドの合唱）</small></span></label>' +
      '<label class="xj-r"><input type="radio" name="xjbgm" data-xj="bgm" value="mine"' + (s.bgm === "mine" ? " checked" : "") + '><span><b>自分の音源</b><small>お手持ちの応援歌（PRIDE など）のファイルを、この端末の中に保存して流します</small></span></label>' +
      '<div class="xj-tr">' + (list.length ? list.map((t) => '<div class="xj-t"><span>♪ ' + esc(t.name) + "<small>" + (t.size / 1048576).toFixed(1) + ' MB</small></span><button data-xj="del" data-v="' + esc(t.id) + '">削除</button></div>').join("") : '<p class="xj-e">まだ音源はありません</p>') +
      '<label class="xj-add">＋ 音源ファイルを追加<input type="file" accept="audio/*" multiple data-xj="file" hidden></label></div>' +
      '<p class="xj-n">※ 実在の応援歌の音源・歌詞は XEVARION には入っていません（著作物のため）。「自分の音源」で追加したファイルは<b>この端末の中だけ</b>に保存され、ほかの人や端末には送られません。BGM のオン／オフは設定の「BGM」から。</p></div>' +
      '<button class="xj-ok" data-xj="close">とじる</button></div>';
    ov.classList.add("on");
  }
  document.addEventListener("click", async (e) => {
    const el = e.target.closest ? e.target.closest("[data-xj]") : null;
    if (!el || el.tagName === "INPUT") return;
    const k = el.dataset.xj;
    if (k === "close") { close(); return; }
    if (k === "theme") {
      save({ theme: el.dataset.v }); apply(); open();
      try { if (typeof xhToast === "function") xhToast(el.dataset.v === "jef" ? "⚽ ホームをジェフ千葉のデザインにしました" : "ホームを標準のデザインにもどしました", 2200); } catch (e2) {}
      return;
    }
    if (k === "del") { await delTrack(el.dataset.v); P.i = 0; await applyMusic(); open(); return; }
  });
  document.addEventListener("change", async (e) => {
    const el = e.target; if (!el || !el.dataset || !el.dataset.xj) return;
    if (el.dataset.xj === "bgm") { save({ bgm: el.value }); P.i = 0; await applyMusic(); apply(); }
    if (el.dataset.xj === "file") {
      const files = Array.from(el.files || []).filter((f) => /^audio\//.test(f.type) || /\.(mp3|m4a|aac|wav|ogg)$/i.test(f.name));
      let n = 0;
      for (const f of files.slice(0, 10)) { if (f.size > 40 * 1048576) continue; try { await addTrack(f); n++; } catch (e2) {} }
      if (n) { save({ bgm: "mine" }); P.i = 0; await applyMusic(); apply(); }
      try { if (typeof xhToast === "function") xhToast(n ? "♪ " + n + "曲を追加しました（この端末だけ）" : "追加できるファイルがありませんでした（40MB まで）", 2600); } catch (e2) {}
      open();
    }
  });

  /* ══ はじめ・同期のあと ══ */
  function boot() {
    const el = musicEl(); if (el && !el._xjBound) { el._xjBound = true; el.addEventListener("ended", onEnded); }
    apply();
    /* ロビーは home-mate.js があとで作るので、出てきたら札を入れる */
    let tries = 0; const iv = setInterval(() => { tries++; paintCard(); placeFlags(); if ((document.getElementById("xjCard") && tries > 12) || tries > 60 || !isJef()) clearInterval(iv); }, 500);
  }
  window.addEventListener("storage", (e) => { if (e.key === KEY) apply(); if (e.key === CK) paintCard(); });
  window.addEventListener("resize", () => { if (isJef()) deco(true); });
  window.addEventListener("xeva:synced", () => apply());
  /* ロビーが作り直されたとき（パートナーの入れかえなど）も札をもどす */
  setInterval(() => { if (!isJef()) return; if (!document.getElementById("xjCard")) paintCard(); placeFlags(); }, 4000);
  setInterval(() => { if (isJef() && !document.hidden) fetchData().then((d) => { if (d) paintCard(); }); }, 15 * 60000);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();

  window.XevaJef = { open, apply, isJef, state: st };
})();
