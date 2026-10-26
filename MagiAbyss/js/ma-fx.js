/* ============================================================
   MagiAbyss — ma-fx.js（豪華な演出）★★ 2026-10-27 新規
   ------------------------------------------------------------
   ご指定「ゲームをより充実したものにするため、様々な部分で豪華なアニメーションなどを実装」
   ・クエスト開始のタイトル（questIntro）… 迷宮の名前が1文字ずつ降ってくる・英語名・推奨・ハードの札・光の帯
   ・中ボス戦（midIntro）… 警告の帯が左右から → 出入口が閉じる鉄格子 → 中ボスの名前と「n体目の鍵の守護者」
   ・鍵の入手（keyGet）… 光の輪と鍵が大きく → 3つの鍵の台座に収まる → 右上（目的の欄）へ飛んでいく
   ・ボスの扉（doorOpen）… 大きな扉が左右に開いて光があふれる
   ・クリア（clearBurst）… 結果の画面で光の輪・星のかけら・紙ふぶき
   ・ストーリーの章のはじまり（chapterCard）… ma-guild の playStory から
   どれも #fx（押せない層）に出すので、遊びのじゃまはしない。端末が「視差効果を減らす」なら短い版。
   ============================================================ */
(function () {
  "use strict";
  const MA = (window.MA = window.MA || {});
  const D = () => MA.D;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  /* 演出は専用のいちばん上の層（#fxTop・押せない）に出す：中ボスを倒した瞬間のレベルアップの画面（#modals）に隠れないように */
  const fx = () => { let el = document.getElementById("fxTop"); if (!el) { el = document.createElement("div"); el.id = "fxTop"; document.body.appendChild(el); } return el; };
  const RM = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  function put(el, ms) { const f = fx(); if (!f) return el; f.appendChild(el); setTimeout(() => el.classList.add("out"), ms); setTimeout(() => el.remove(), ms + 600); return el; }
  /* 鍵の絵（ドット）を画像に */
  let keyURL = "";
  function keyImg() {
    if (keyURL) return keyURL;
    try { const s = MA.Art.sprite("key"); keyURL = s.frames[0].toDataURL(); } catch (e) { keyURL = ""; }
    return keyURL;
  }
  function sparks(n, col) {
    let h = "";
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = 80 + Math.random() * 180;
      h += '<i style="--dx:' + (Math.cos(a) * r).toFixed(0) + "px;--dy:" + (Math.sin(a) * r).toFixed(0) + "px;--d:" + (0.5 + Math.random() * 0.7).toFixed(2) + "s;--dl:" + (Math.random() * 0.25).toFixed(2) + "s;--c:" + (col || "#ffd84a") + '"></i>';
    }
    return '<div class="fx-sp">' + h + "</div>";
  }

  /* ══ クエスト開始 ══ */
  function questIntro(g) {
    if (!g) return;
    const el = document.createElement("div");
    let nm, en, sub, col, tag = "";
    if (g.mode === "abyss") { nm = "深淵踏破"; en = "ABYSS DESCENT"; sub = g.floor + "階から"; col = "#a874ff"; }
    else {
      const d = g.dun; if (!d) return;
      nm = d.nm; en = d.en || ""; col = d.c || "#ffd84a";
      const MD = D().MODES[g.diff || "normal"];
      sub = (d.side ? "外伝・" : "") + "第" + d.no + "迷宮　推奨 Lv." + Math.min(60, d.rec.lv + (MD.recAdd || 0));
      if (g.diff === "hard") tag = '<em class="qi-hard">HARD</em>';
      if (d.side) tag += '<em class="qi-side">外伝</em>';
    }
    el.className = "fx-qi" + (RM() ? " rm" : "");
    el.style.setProperty("--c", col);
    el.innerHTML = '<div class="qi-band"></div><div class="qi-in"><small>' + esc(sub) + "</small>" +
      '<b>' + Array.from(nm).map((ch, i) => '<span style="--i:' + i + '">' + esc(ch) + "</span>").join("") + "</b>" +
      '<div class="qi-line"></div><span class="qi-en">' + esc(en) + "</span>" + (tag ? '<div class="qi-tags">' + tag + "</div>" : "") + "</div>";
    put(el, RM() ? 1200 : 2600);
  }

  /* ══ 中ボス戦 ══ */
  function midIntro(e, idx, need) {
    if (!e) return;
    const el = document.createElement("div");
    el.className = "fx-mid" + (RM() ? " rm" : "");
    el.style.setProperty("--c", (e.d && e.d.col) || "#ff8a3d");
    el.innerHTML = '<div class="mi-warn t"><span>' + "WARNING　".repeat(8) + '</span></div><div class="mi-warn b"><span>' + "WARNING　".repeat(8) + "</span></div>" +
      '<div class="mi-bars l"></div><div class="mi-bars r"></div>' +
      '<div class="mi-in"><small>MID BOSS　' + (idx + 1) + " / " + need + "</small><b>" + esc(e.d ? e.d.nm : "中ボス") + "</b>" +
      "<span>出口が封鎖された！ 倒すと星脈の鍵（" + (idx + 1) + "つ目）</span></div>";
    put(el, RM() ? 1300 : 2400);
    try { MA.Audio.sfx("warn"); } catch (x) {}
  }

  /* ══ 鍵の入手 ══ */
  function keyGet(n, need, e) {
    const el = document.createElement("div");
    el.className = "fx-key" + (RM() ? " rm" : "");
    const img = keyImg();
    let slots = "";
    for (let i = 1; i <= need; i++) slots += '<i class="' + (i < n ? "on" : i === n ? "on new" : "") + '">' + (img ? '<img src="' + img + '" alt="">' : "") + "</i>";
    el.innerHTML = '<div class="fk-rays"></div>' + sparks(26, "#ff8fd0") +
      '<div class="fk-key">' + (img ? '<img src="' + img + '" alt="">' : "") + "</div>" +
      '<div class="fk-t"><small>' + esc(e && e.d ? e.d.nm + " を倒した" : "中ボスを倒した") + "</small><b>星脈の鍵　" + n + " / " + need + "</b>" +
      '<div class="fk-slots">' + slots + "</div><span>" + (n >= need ? "鍵がそろった！ ボスの扉が開く…" : "あと " + (need - n) + " つ") + "</span></div>";
    put(el, RM() ? 1400 : 2500);
  }

  /* ══ ボスの扉 ══ */
  function doorOpen(dun) {
    const el = document.createElement("div");
    el.className = "fx-door" + (RM() ? " rm" : "");
    el.style.setProperty("--c", (dun && dun.c) || "#ff5a6a");
    el.innerHTML = '<div class="fd-light"></div><div class="fd-l"></div><div class="fd-r"></div>' +
      '<div class="fd-t"><small>BOSS GATE</small><b>ボスの扉が開いた</b><span>最深部へ向かおう</span></div>';
    put(el, RM() ? 1200 : 2300);
  }

  /* ══ クリア（結果の画面） ══ */
  function clearBurst() {
    if (RM()) return;
    const host = document.getElementById("result"); if (!host) return;
    const el = document.createElement("div");
    el.className = "fx-clear";
    let conf = "";
    const cols = ["#ffd84a", "#ff8fd0", "#7dffb0", "#7fd0ff", "#c27bff", "#ffffff"];
    for (let i = 0; i < 46; i++) conf += '<i style="left:' + (Math.random() * 100).toFixed(1) + "%;--c:" + cols[i % cols.length] + ";--d:" + (1.6 + Math.random() * 1.6).toFixed(2) + "s;--dl:" + (Math.random() * 0.9).toFixed(2) + "s;--r:" + ((Math.random() - 0.5) * 900).toFixed(0) + 'deg"></i>';
    el.innerHTML = '<div class="fc-ring"></div><div class="fc-ring b"></div>' + sparks(30, "#ffd84a") + '<div class="fc-conf">' + conf + "</div>";
    host.appendChild(el);
    setTimeout(() => el.remove(), 4200);
  }

  /* ══ ストーリーの章のはじまり（ma-guild の playStory） ══ */
  function chapterCard(host, title, col) {
    if (!host) return;
    const el = document.createElement("div");
    el.className = "fx-ch" + (RM() ? " rm" : "");
    el.style.setProperty("--c", col || "#ffd84a");
    const m = /^(\S+)\s+(.*)$/.exec(String(title || ""));
    el.innerHTML = '<div class="ch-band"></div><div class="ch-in"><small>' + esc(m ? m[1] : "") + "</small><b>" + esc(m ? m[2] : title) + "</b></div>";
    host.appendChild(el);
    setTimeout(() => el.classList.add("out"), RM() ? 700 : 1500);
    setTimeout(() => el.remove(), RM() ? 1000 : 2000);
  }

  MA.FX = { questIntro, midIntro, keyGet, doorOpen, clearBurst, chapterCard };
  /* ma-engine は MA.UI.* で呼ぶ（ma-ui.js の MA.UI に足す） */
  function hook() {
    if (!MA.UI) return setTimeout(hook, 50);
    MA.UI.midIntro = midIntro; MA.UI.keyGet = keyGet; MA.UI.doorOpen = doorOpen; MA.UI.questIntro = questIntro; MA.UI.clearBurst = clearBurst;
  }
  hook();
})();
