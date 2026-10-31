/* ============================================================
   MagiBattle 3.0 — mb3-ui.js（画面の前半：共通の部品・タイトル・ロビー・部隊・キャラ詳細（育成）・編成）
   ・画面は UI.go(名前, 引数) で切りかえる。上のバー・下のナビ・もどるボタンは画面ごとの設定（UI.S[名前]）で出し分け。
   ・後半（キャンペーン・結果・アリーナ・迎撃戦・タワー・前哨基地・研究・ミッション・ショップ・アイテム・設定・ストーリー）は mb3-ui2.js。
   ★★ 2026-10-31 ご指定（まとめて）：
     ・「全体的にデザインが暗く分かりづらい → カラフルかつ使いやすく見やすいシンプルなデザインに（重点）」→ 明るい地・白い札・色分けしたボタン（mb3.css）。
     ・「ロビー画面をカラフルに、より使いやすく」→ 左に丸い色つきボタン（任務・研究・ストーリー・アイテム・使い方・設定）、下に出撃と4つの色の札。
     ・「スペースキー（スマホは別）などで全体をハイド」→ ロビー・キャラ詳細で Space／H か 👁 ボタン。どこかを押すともどる。
     ・「下バー：ロビーを中央に、部隊を一番左に、いまの部隊の場所は編成に」→ 部隊・編成・ロビー・アリーナ・ショップ（出撃はロビーの大きなボタン）。
     ・「キャラの並び替えと絞り込みは XEVARION の図鑑のようにボタンを押して」→ 「並び替え」「絞り込み」ボタン → 下から出る板で選ぶ。
     ・「キャラの体験は無しに」→ 持っているキャラだけ（編成・出撃とも）。
     ・「アイテムをまとめて使用」→ レベル（できるだけ）・スキル（できるだけ）・装備（+5 まで）・キューブ・ギフト（数をえらんで）。
     ・完凸（凸4）のキャラは、XEVARION のほかの画面と同じ金の光（.mx）。
   ============================================================ */
(function () {
  "use strict";
  const MB3 = (window.MB3 = window.MB3 || {});
  const UI = (MB3.UI = {});
  const ST = () => window.MBStats, SV = () => MB3.Save, D = () => MB3.D;
  const IMG = "../img/", SSD = "../MagiBurst/img/ss/";
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.prototype.slice.call((el || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  const fmt = (n) => Math.round(n || 0).toLocaleString("ja-JP");
  const short = (n) => (n >= 1e9 ? (n / 1e9).toFixed(1) + "B" : n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e4 ? (n / 1e3).toFixed(0) + "K" : fmt(n));
  Object.assign(UI, { $, $$, esc, fmt, short, IMG, SSD });
  const F = (id) => (MB3.FILE && MB3.FILE[id]) || id;
  UI.th = (id) => IMG + "t_" + F(id) + ".webp";
  UI.art = (id) => IMG + F(id) + ".webp";
  UI.wide = (id) => IMG + F(id) + "_w.webp";
  UI.ss = (id) => SSD + F(id) + "SS.webp";
  const LOBBY_FULL = { haru: 1, chika: 1, hisako: 1, alice: 1, kohaku: 1, yuna: 1, aina: 1, chie: 1 };
  UI.ld = (id) => "../home-mate/lobby/" + id + ".webp";
  UI.full = (id) => (LOBBY_FULL[id] ? UI.ld(id) : UI.ss(id));
  UI.hasLD = (id) => !!LOBBY_FULL[id];
  UI.LD_IDS = Object.keys(LOBBY_FULL);
  UI.nm = (id) => ST().charNm(id);
  UI.click = () => { try { MB3.Audio.play("click"); } catch (e) {} };
  UI.isMax = (id) => SV().owned(id) && SV().awk(id) >= (ST().MAX_AWK || 4);   /* 完凸 */
  UI.CCOL = { haru: "#3aa0ff", chika: "#7b8cff", hisako: "#ff5fa8", alice: "#8ea0c4", kohaku: "#ff4d6d", suzu: "#ffb800", shouko: "#18c48c", yuna: "#a35cff", chie: "#ff7a3c", aina: "#ff5fb4", ichika: "#12b5ff", nonoka: "#d0a050" };

  /* ── 素材のアイコン ── */
  UI.itemIc = function (k) {
    if (k === "xeva") return '<img src="../XEVA.png" alt="">';
    if (k === "gem") return '<img src="../gem.png" alt="">';
    if (k === "gear") return '<i style="background:#7b8cff">⚙</i>';
    if (k === "cube") return '<i style="background:#ff8a2a">◆</i>';
    const it = D().ITEMS[k]; if (!it) return "<i>?</i>";
    return '<i style="background:' + it.c + '">' + it.ic + "</i>";
  };
  UI.costHTML = function (cost) {
    return '<div class="cost">' + Object.keys(cost || {}).map((k) => {
      const have = k === "gem" ? SV().gems() : SV().cur(k);
      const nm = k === "gem" ? "ジェム" : (D().ITEMS[k] || {}).nm || k;
      return '<span class="' + (have < cost[k] ? "ng" : "") + '" title="' + esc(nm) + '">' + UI.itemIc(k).replace("<i ", '<i class="ci" ') + fmt(cost[k]) + "</span>";
    }).join("") + "</div>";
  };
  UI.rwHTML = function (list) {
    return '<div class="rws">' + (list || []).map((x, i) => '<div class="rw" style="animation-delay:' + (i * 0.06).toFixed(2) + 's">' + UI.itemIc(x[2]) + esc(x[0]) + " <b>×" + fmt(x[1]) + "</b></div>").join("") + "</div>";
  };
  UI.burstBadge = (b) => '<span class="bu b' + b + '">' + ST().BURST[b].nm + "</span>";

  /* ── トースト・シート ── */
  let toastT = 0;
  UI.toast = function (msg) { const t = $("#toast"); t.innerHTML = msg; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 2200); };
  UI.sheet = function (html, onMount, cls) {
    const sh = $("#sheet"), inn = $("#sheetIn");
    inn.className = "m3-sheet-in" + (cls ? " " + cls : "");
    inn.innerHTML = html; sh.hidden = false;
    sh.onclick = (e) => { if (e.target === sh) UI.closeSheet(); };
    $$("[data-x]", inn).forEach((b) => (b.onclick = () => { UI.click(); UI.closeSheet(); }));
    if (onMount) onMount(inn);
  };
  UI.closeSheet = function () { const sh = $("#sheet"); sh.hidden = true; $("#sheetIn").innerHTML = ""; };
  UI.confirm = function (title, body, okText, cb, cls) {
    UI.sheet('<div class="sh-h"><b>' + title + '</b><button class="sh-x" data-x aria-label="閉じる">✕</button></div><div class="muted" style="font-size:14px">' + body + '</div><div class="sh-btns"><button class="btn ghost" data-x>やめる</button><button class="btn ' + (cls || "") + '" id="cfOk">' + okText + "</button></div>",
      (el) => { $("#cfOk", el).onclick = () => { UI.click(); UI.closeSheet(); cb(); }; });
  };
  UI.rewardSheet = function (title, list, cb) {
    UI.sheet('<div class="sh-h"><span class="sh-ic">🎁</span><b>' + title + '</b><button class="sh-x" data-x aria-label="閉じる">✕</button></div>' + UI.rwHTML(list) + '<div class="sh-btns"><button class="btn" data-x>OK</button></div>');
    if (cb) setTimeout(cb, 10);
  };
  /* 数をえらぶ（まとめて使う）。max 以下・1 以上 */
  UI.stepper = function (id, n, max) {
    return '<div class="stp" id="' + id + '"><button data-d="-10">−10</button><button data-d="-1">−</button><b class="num">' + n + '</b><button data-d="1">＋</button><button data-d="10">＋10</button><button data-d="max" class="mx">最大</button><small>/ ' + max + "</small></div>";
  };
  UI.bindStepper = function (el, id, get, set, max) {
    $$("#" + id + " button", el).forEach((b) => (b.onclick = () => { UI.click(); const d = b.dataset.d; let n = get(); n = d === "max" ? max : Math.max(1, Math.min(max, n + Number(d))); set(n); }));
  };

  /* ══════════ 画面の切りかえ ══════════ */
  UI.S = {};
  let stack = [], cur = null;
  UI.cur = () => cur;
  UI.go = function (name, p, opt) {
    const S = UI.S[name]; if (!S) return;
    opt = opt || {};
    /* ★★ 2026-10-31 ご指定「バトル結果の戻るを押すと、前の結果に戻る」→ 結果の画面は戻る先の列に積まない */
    if (cur && !opt.replace && !opt.noPush && cur.name !== name && cur.name !== "result") stack.push(cur);
    if (opt.root) stack = [];
    stack = stack.filter((x) => x.name !== "result");
    cur = { name, p: p || {} };
    render();
  };
  UI.back = function () {
    UI.click();
    const S = cur && UI.S[cur.name];
    const bk = S && (typeof S.back === "function" ? S.back(cur.p) : S.back);
    if (bk === "portal") { location.href = "../index.html"; return; }
    if (typeof bk === "string" && bk !== "history") { cur = { name: bk, p: {} }; stack = stack.filter((x) => x.name !== cur.name); render(); return; }
    let prev = stack.pop();
    while (prev && prev.name === "result") prev = stack.pop();
    cur = prev || { name: "lobby", p: {} };
    render();
  };
  UI.refresh = function () { if (cur) render(true); };
  function render(keepScroll) {
    const S = UI.S[cur.name];
    const main = $("#main");
    const old = main.firstElementChild, st = keepScroll && old ? old.scrollTop : 0;
    const el = document.createElement("section");
    el.className = "scr " + (S.cls || "") + (S.nav ? "" : " nonav");
    el.innerHTML = S.render(cur.p) || "";
    main.innerHTML = ""; main.appendChild(el);
    if (keepScroll) { el.style.animation = "none"; el.scrollTop = st; }
    const tb = $("#tb"); tb.hidden = !S.top;
    if (S.top) {
      $("#tbTitle small").textContent = S.en || ""; $("#tbTitle b").textContent = typeof S.title === "function" ? S.title(cur.p) : (S.title || "");
      $("#tbBack").style.visibility = S.noBack ? "hidden" : "";
      paintCur(S.cur || ["credit", "bdata", "gem"]);
    }
    const nav = $("#nav"); nav.hidden = !S.nav;
    if (S.nav) $$("button", nav).forEach((b) => b.classList.toggle("on", b.dataset.go === (S.navKey || cur.name)));
    document.getElementById("app").classList.remove("hideui");
    if (!keepScroll) { try { MB3.BGM && MB3.BGM.play(S.bgm || "menu"); } catch (e) {} }
    if (S.mount) S.mount(el, cur.p);
  }
  function paintCur(keys) {
    $("#tbCur").innerHTML = keys.map((k) => '<span class="m3-pill ' + (k === "bdata" ? "opt" : "") + '">' + UI.itemIc(k) + '<b class="num">' + short(k === "gem" ? SV().gems() : SV().cur(k)) + "</b></span>").join("");
  }
  UI.paintCur = () => { const S = cur && UI.S[cur.name]; if (S && S.top) paintCur(S.cur || ["credit", "bdata", "gem"]); };
  /* ★★ 2026-10-31 全体を隠す（ご指定「スペースキー（スマホは別）などで全体をハイド」）。ロビーとキャラ詳細 */
  UI.canHide = () => !!(cur && (cur.name === "lobby" || cur.name === "unit") && $("#sheet").hidden && $("#story").hidden && $("#battle").hidden);
  UI.toggleHide = function (v) {
    const app = document.getElementById("app");
    const on = v == null ? !app.classList.contains("hideui") : !!v;
    app.classList.toggle("hideui", on);
    if (on) UI.toast("どこかを押す（PC は Space・H）と もどります");
  };

  /* ══════════ タイトル ══════════ */
  UI.S.title = {
    cls: "full ttl", top: false, nav: false, bgm: "title",
    render() {
      const ids = ["chika", "haru", "hisako"];
      return '<div class="ttl-sky"></div><div class="ttl-bg">' + ids.map((id) => '<img src="' + UI.ld(id) + '" alt="" onerror="this.src=\'' + UI.ss(id) + '\'">').join("") + "</div>" +
        '<div class="ttl-logo"><img src="img/logo.webp" alt="MagiBattle"><span class="ttl-beta">β版</span></div>' +
        '<div class="ttl-sub">VANGUARD SHOOTING ・ ARENA</div><div class="ttl-tap">TAP TO START<small>（Enter）</small></div><div class="ttl-ver">Ver 3.2.0 β ・ 2026.10.31</div>';
    },
    mount(el) {
      el.onclick = () => {
        try { MB3.Audio.init(); MB3.Audio.play("ready"); MB3.BGM && MB3.BGM.kick(); } catch (e) {}
        const S = SV().S;
        if (!S.seenPro) { S.seenPro = 1; SV().save(); UI.story("prologue", () => { UI.go("lobby", {}, { root: true }); setTimeout(() => UI.guideHint && UI.guideHint(), 900); }); }
        else UI.go("lobby", {}, { root: true });
      };
    },
  };

  /* ══════════ ロビー ══════════ */
  function lobbyChar() {
    const S = SV().S, own = SV().ownedIds().filter(UI.hasLD);
    if (S.set.lobby && own.indexOf(S.set.lobby) >= 0) return S.set.lobby;
    return own[0] || "haru";
  }
  const LOBBY_LINES = ["きょうも出撃する？ 準備はできてるよ。", "前哨基地の報酬、たまってるかも。", "アリーナ、のぞいてみる？", "バーストはⅠ→Ⅱ→Ⅲの順でつなぐんだよね。", "コアを狙うと、ぜんぜんちがうよ。", "赤い円が出たら、その下の子は隠れてね。", "ストーリー、また見返したいな。"];
  const SIDE_BTNS = [
    ["ms", "任務", "#18c48c", '<path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'],
    ["story", "ストーリー", "#ff5fa8", '<path d="M5 5h6a3 3 0 0 1 3 3v11a2.5 2.5 0 0 0-2.5-2.5H5zM19 5h-3.5" fill="none" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/><path d="M14 8a3 3 0 0 1 3-3h2v11.5h-5" fill="none" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/>'],
    ["items", "アイテム", "#ff8a2a", '<rect x="4" y="8" width="16" height="12" rx="2.5" fill="none" stroke="#fff" stroke-width="2.4"/><path d="M4 12h16M12 8v12M8.5 8C7 8 6 6.8 6.6 5.6c.7-1.4 3.3-1.2 5.4 2.4 2.1-3.6 4.7-3.8 5.4-2.4.6 1.2-.4 2.4-1.9 2.4" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>'],
    ["res", "研究", "#8a5cff", '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3" fill="none" stroke="#fff" stroke-width="2.3" stroke-linejoin="round"/><path d="M7.5 15h9" stroke="#fff" stroke-width="2.3"/>'],
    ["guide", "使い方", "#12b5ff", '<circle cx="12" cy="12" r="8.6" fill="none" stroke="#fff" stroke-width="2.4"/><path d="M9.6 9.6a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.6" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round"/><circle cx="12" cy="17" r="1.3" fill="#fff"/>'],
    ["set", "設定", "#7884ab", '<circle cx="12" cy="12" r="3.2" fill="none" stroke="#fff" stroke-width="2.4"/><path d="M12 3v2.6M12 18.4V21M3 12h2.6M18.4 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>'],
  ];
  UI.S.lobby = {
    cls: "full lobby", top: true, nav: true, back: "portal", title: "ロビー", en: "LOBBY", bgm: "lobby",
    render() {
      const id = lobbyChar(), K = ST().KITS[id], Q = ST().SQUADS[K.sq];
      const pend = SV().postPending(), msN = D().DAILY.filter((m) => !SV().S.ms.dc[m.id] && SV().msProg(m) >= m.n).length + D().WEEKLY.filter((m) => !SV().S.ms.wc[m.id] && SV().msProg(m, true) >= m.n).length;
      const nx = SV().nextStage(), ch = D().CHAPTERS[nx.c - 1];
      const tries = D().ARENA_TRIES - (SV().S.arena.tries | 0), it = D().INTERCEPT_TRIES - (SV().S.icpt.tries | 0);
      const own = SV().ownedIds().length;
      const bd = { ms: msN, story: 0, items: SV().cur("gift") >= 10 ? "!" : 0 };
      return '<div class="lb-sky" style="--sq:' + Q.c + '"></div><div class="lb-art"><img src="' + UI.full(id) + '" alt="" id="lbArt" class="' + (UI.hasLD(id) ? "ld" : "ss") + '" onerror="this.src=\'' + UI.art(id) + '\'"></div>' +
        '<div class="lb-side">' + SIDE_BTNS.map((b) => '<button class="lb-sq" data-go="' + b[0] + '" style="--c:' + b[2] + '"><i><svg viewBox="0 0 24 24">' + b[3] + "</svg></i><b>" + b[1] + "</b>" + (bd[b[0]] ? '<span class="bd">' + (bd[b[0]] === "!" ? "!" : bd[b[0]]) + "</span>" : "") + "</button>").join("") + "</div>" +
        '<div class="lb-right"><button class="lb-rb" id="lbChg" aria-label="副官をかえる"><svg viewBox="0 0 24 24"><path d="M7 7h11l-3-3M17 17H6l3 3" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg><b>副官</b></button>' +
        '<button class="lb-rb" id="lbHide" aria-label="画面の文字を隠す"><svg viewBox="0 0 24 24"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg><b>隠す</b></button></div>' +
        '<div class="lb-dock"><div class="lb-say" id="lbSay"></div>' +
        '<div class="lb-name"><span class="lb-sqd" style="background:' + Q.c + '">' + esc(Q.en) + '</span><b>' + esc(UI.nm(id)) + '</b><small>副官</small></div>' +
        (own ? "" : '<div class="lb-warn">持っている超極祭系の UR がいません。<a href="../gacha.html">ガチャへ ›</a></div>') +
        '<button class="lb-main" data-go="camp"><span class="lb-mi"><svg viewBox="0 0 24 24"><path d="M8 5l11 7-11 7z" fill="currentColor"/></svg></span><span class="lb-mt"><b>出撃</b><small>キャンペーン　次は <b class="num">' + nx.c + "-" + nx.s + "</b>　" + esc(ch.nm) + '</small></span><span class="lb-mprog"><i style="width:' + Math.round(Object.keys(SV().S.camp.n).length / 48 * 100) + '%"></i></span></button>' +
        '<div class="lb-tiles">' +
        tile("arena", "アリーナ", "のこり " + Math.max(0, tries) + " 回", "#ff4fa3", tries > 0 ? tries : 0, '<path d="M5 4l7 7M19 4l-7 7M4.5 15.5l4 4M19.5 15.5l-4 4M7 13l-3 3 4 4 3-3M17 13l3 3-4 4-3-3" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>') +
        tile("icpt", "迎撃戦", D().interceptToday().nm.replace("迎撃", "") + "・のこり " + Math.max(0, it), "#ff8a2a", it > 0 ? it : 0, '<circle cx="12" cy="12" r="8" fill="none" stroke="#fff" stroke-width="2.3"/><circle cx="12" cy="12" r="3.2" fill="#fff"/><path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4" stroke="#fff" stroke-width="2.3"/>') +
        tile("tower", "タワー", SV().S.tower.floor + " 階まで", "#8a5cff", 0, '<path d="M8 21V9l4-5 4 5v12zM5 21h14M10.5 13h3M10.5 17h3" fill="none" stroke="#fff" stroke-width="2.3" stroke-linejoin="round"/>') +
        tile("post", "前哨基地", pend.h >= 1 ? Math.floor(pend.h) + " 時間ぶん" : "たまっています", "#18c48c", pend.h >= 8 ? "!" : 0, '<path d="M3 20h18M5 20v-8l7-5 7 5v8M10 20v-5h4v5" fill="none" stroke="#fff" stroke-width="2.3" stroke-linejoin="round"/>') +
        "</div></div>" +
        '<div class="lb-hidehint">タップでもどる</div>';
      function tile(go, nm, sub, c, bd2, svg) { return '<button class="lb-tile" data-go="' + go + '" style="--c:' + c + '"><i><svg viewBox="0 0 24 24">' + svg + "</svg></i><span><b>" + nm + "</b><small>" + esc(sub) + "</small></span>" + (bd2 ? '<span class="bd">' + bd2 + "</span>" : "") + "</button>"; }
    },
    mount(el) {
      $$("[data-go]", el).forEach((b) => (b.onclick = () => { UI.click(); if (b.dataset.go === "guide") { UI.guide(); return; } UI.go(b.dataset.go); }));
      const id = lobbyChar();
      const say = $("#lbSay", el);
      const line = () => { const K = ST().KITS[id]; const L = [K.quote].concat(LOBBY_LINES); say.textContent = L[Math.floor(Math.random() * L.length)]; say.classList.add("on"); clearTimeout(say._t); say._t = setTimeout(() => say.classList.remove("on"), 3400); };
      $("#lbArt", el).onclick = () => { if (document.getElementById("app").classList.contains("hideui")) return; UI.click(); line(); };
      setTimeout(line, 500);
      $("#lbHide", el).onclick = (e) => { e.stopPropagation(); UI.click(); UI.toggleHide(true); };
      $("#lbChg", el).onclick = () => {
        UI.click();
        const own = SV().ownedIds();
        UI.sheet('<div class="sh-h"><span class="sh-ic">⇄</span><b>副官をえらぶ</b><button class="sh-x" data-x aria-label="閉じる">✕</button></div>' +
          '<p class="muted" style="margin:0 0 10px">ロビーの副官にできるのは、<b>全身の立ち絵（LD）があるキャラ</b>のうち、持っている子です。</p><div class="pick ld">' +
          UI.LD_IDS.map((x) => { const ok = own.indexOf(x) >= 0; return '<button class="pk' + (x === id ? " in" : "") + (ok ? "" : " lk") + (UI.isMax(x) ? " mx" : "") + '" data-id="' + x + '"' + (ok ? "" : " disabled") + '><img src="' + UI.ss(x) + '" alt=""><b>' + (ok ? "" : "🔒 ") + esc(UI.nm(x)) + "</b></button>"; }).join("") + "</div>",
          (s) => $$(".pk:not(.lk)", s).forEach((b) => (b.onclick = () => { SV().setSetting("lobby", b.dataset.id); UI.closeSheet(); UI.refresh(); })));
      };
    },
  };

  /* ══════════ 部隊（キャラの一覧）══════════
     ★★ 2026-10-31 ご指定「並び替えと絞り込みは XEVARION の図鑑のようにボタンを押して」：「並び替え」「絞り込み」→ 下から出る板 */
  const UF_KEY = "mb3_ufil_v1";
  const SORTS = [["pw", "戦力", "強い順"], ["lv", "レベル", "高い順"], ["awk", "凸", "完凸から"], ["bond", "好感度", "高い順"], ["no", "番号", "いつもの並び"], ["burst", "バースト", "Ⅰ → Ⅱ → Ⅲ"], ["cls", "クラス", "火力・防御・支援"], ["wp", "武器", "AR・SMG・SG・SR・RL・MG"], ["nm", "名前", "あいうえお順"]];
  const FGROUPS = () => [
    ["own", "所持", [["y", "持っている"], ["n", "持っていない"]]],
    ["burst", "バースト", [["1", "Ⅰ"], ["2", "Ⅱ"], ["3", "Ⅲ"]]],
    ["cls", "クラス", Object.keys(ST().CLASSES).map((k) => [k, ST().CLASSES[k].nm])],
    ["wp", "武器", ["AR", "SMG", "SG", "SR", "RL", "MG"].map((k) => [k, k])],
    ["sq", "部隊", Object.keys(ST().SQUADS).map((k) => [k, ST().SQUADS[k].nm])],
    ["el", "属性", Object.keys(ST().ELEM).map((k) => [k, ST().ELEM[k].nm])],
  ];
  function ufLoad() { let o = null; try { o = JSON.parse(localStorage.getItem(UF_KEY) || "null"); } catch (e) {} o = o && typeof o === "object" ? o : {}; o.sort = o.sort || "pw"; o.rev = !!o.rev; o.f = o.f && typeof o.f === "object" ? o.f : {}; return o; }
  function ufSave(o) { try { localStorage.setItem(UF_KEY, JSON.stringify(o)); } catch (e) {} }
  const UF = ufLoad();
  function ufCount() { return Object.keys(UF.f).reduce((a, k) => a + (UF.f[k] || []).length, 0); }
  function ufPass(id) {
    const K = ST().KITS[id];
    const val = { own: SV().owned(id) ? "y" : "n", burst: String(K.burst), cls: K.cls, wp: K.wp, sq: K.sq, el: ST().elOf(id) };
    return Object.keys(UF.f).every((g) => { const a = UF.f[g] || []; return !a.length || a.indexOf(val[g]) >= 0; });
  }
  function ufSorted(ids) {
    const K = (id) => ST().KITS[id], ord = ST().IDS;
    const key = {
      pw: (id) => -(SV().owned(id) ? SV().power(id) : -1), lv: (id) => -(SV().owned(id) ? SV().effLv(id) : -1), awk: (id) => -(SV().owned(id) ? SV().awk(id) * 10 + 1 : -1), bond: (id) => -(SV().owned(id) ? SV().unit(id).bond : -1),
      no: (id) => ord.indexOf(id), burst: (id) => K(id).burst * 100 + ord.indexOf(id), cls: (id) => ["atk", "def", "sup"].indexOf(K(id).cls) * 100 + ord.indexOf(id),
      wp: (id) => ["AR", "SMG", "SG", "SR", "RL", "MG"].indexOf(K(id).wp) * 100 + ord.indexOf(id), nm: (id) => UI.nm(id),
    }[UF.sort] || ((id) => ord.indexOf(id));
    const a = ids.slice().sort((x, y) => { const kx = key(x), ky = key(y); const c = typeof kx === "string" ? kx.localeCompare(ky, "ja") : kx - ky; return c || ord.indexOf(x) - ord.indexOf(y); });
    if (UF.rev) a.reverse();
    /* 持っていないキャラはいつも後ろ */
    return a.filter((id) => SV().owned(id)).concat(a.filter((id) => !SV().owned(id)));
  }
  UI.unitCard = function (id, extra) {
    const K = ST().KITS[id], own = SV().owned(id), E = ST().ELEM[ST().elOf(id)];
    const awk = SV().awk(id), lv = own ? SV().effLv(id) : 1, pw = own ? SV().power(id) : 0;
    return '<button class="ucard' + (own ? "" : " lock") + (UI.isMax(id) ? " mx" : "") + (extra || "") + '" data-id="' + id + '" style="--cc:' + (UI.CCOL[id] || "#7b8cff") + '"><div class="art"><img src="' + UI.art(id) + '" alt="" loading="lazy">' +
      '<div class="tags">' + UI.burstBadge(K.burst) + '<span class="el" style="background:' + E.c + '">' + E.nm + "</span></div>" +
      '<span class="wp">' + K.wp + "</span>" + (UI.isMax(id) ? '<span class="mxb">完凸</span>' : "") + "</div>" +
      '<div class="info"><b>' + esc(UI.nm(id)) + '</b><small><i style="background:' + ST().CLASSES[K.cls].c + '"></i>' + ST().CLASSES[K.cls].nm + "・" + ST().SQUADS[K.sq].en + "</small>" +
      '<div class="pw"><span class="stars">' + [1, 2, 3, 4].map((i) => (i <= awk ? "★" : "☆")).join("") + "</span><span>Lv." + lv + " <em>" + (own ? short(pw) : "未所持") + "</em></span></div></div></button>";
  };
  UI.S.units = {
    top: true, nav: true, title: "部隊", en: "SQUAD", back: "lobby",
    render() {
      const all = ST().IDS.slice(), own = SV().ownedIds().length, sy = SV().synchroLv();
      const ids = ufSorted(all.filter(ufPass));
      const so = SORTS.find((x) => x[0] === UF.sort) || SORTS[0], fc = ufCount();
      const chips = [];
      FGROUPS().forEach((g) => (UF.f[g[0]] || []).forEach((v) => { const o = g[2].find((x) => x[0] === v); if (o) chips.push('<button class="fchip" data-g="' + g[0] + '" data-v="' + v + '">' + esc(g[1]) + "：" + esc(o[1]) + " ✕</button>"); }));
      return '<div class="wrap"><div class="pgh"><b>ヴァンガード</b><span class="pgh-c">所持 <b>' + own + "</b> / 12" + (sy ? "　シンクロ Lv." + sy : "") + "</span></div>" +
        '<div class="tools"><button class="tbtn" id="uSort"><svg viewBox="0 0 24 24"><path d="M7 4v15M3.6 15.6 7 19l3.4-3.4M17 20V5M13.6 8.4 17 5l3.4 3.4" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg><span>並び替え</span><b>' + so[1] + '</b><i>▾</i></button>' +
        '<button class="tbtn sq" id="uRev" aria-label="逆の順">' + (UF.rev ? "▼" : "▲") + "</button>" +
        '<button class="tbtn' + (fc ? " on" : "") + '" id="uFil"><svg viewBox="0 0 24 24"><path d="M4 5h16l-6 7.5V19l-4 1.5v-8z" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linejoin="round"/></svg><span>絞り込み</span>' + (fc ? "<b class=\"cnt\">" + fc + "</b>" : "") + "</button></div>" +
        (chips.length ? '<div class="fchips">' + chips.join("") + '<button class="fchip clr" id="uClr">すべて解除</button></div>' : "") +
        (ids.length ? '<div class="ugrid">' + ids.map((id) => UI.unitCard(id)).join("") + "</div>" : '<div class="empty">条件に合うキャラがいません。<button class="btn sm ghost" id="uClr2">絞り込みを解除</button></div>') +
        '<p class="muted" style="margin-top:14px">使えるのは<b>超極華祭・超極煌祭・超極彩祭の UR 12体</b>のうち、持っているキャラです。持っていないキャラは XEVARION のガチャで（凸も共通）。' +
        '<a href="../gacha.html" class="lnk">ガチャへ ›</a></p></div>';
    },
    mount(el) {
      $$(".ucard", el).forEach((b) => (b.onclick = () => { UI.click(); UI.go("unit", { id: b.dataset.id }); }));
      const re = () => { ufSave(UF); UI.refresh(); };
      $("#uRev", el).onclick = () => { UI.click(); UF.rev = !UF.rev; re(); };
      $$(".fchip[data-g]", el).forEach((b) => (b.onclick = () => { UI.click(); UF.f[b.dataset.g] = (UF.f[b.dataset.g] || []).filter((x) => x !== b.dataset.v); re(); }));
      [$("#uClr", el), $("#uClr2", el)].forEach((b) => { if (b) b.onclick = () => { UI.click(); UF.f = {}; re(); }; });
      $("#uSort", el).onclick = () => {
        UI.click();
        UI.sheet('<div class="sh-h"><span class="sh-ic">⇅</span><b>並び替え</b><button class="sh-x" data-x aria-label="閉じる">✕</button></div><div class="slist">' +
          SORTS.map((s) => '<button class="' + (UF.sort === s[0] ? "on" : "") + '" data-s="' + s[0] + '"><span>' + s[1] + "</span><small>" + s[2] + "</small></button>").join("") + "</div>" +
          '<div class="seg" style="margin-top:12px"><button class="' + (UF.rev ? "" : "on") + '" data-r="0">▲ ふつうの順</button><button class="' + (UF.rev ? "on" : "") + '" data-r="1">▼ 逆の順</button></div>',
          (s) => {
            $$("[data-s]", s).forEach((b) => (b.onclick = () => { UI.click(); UF.sort = b.dataset.s; UI.closeSheet(); re(); }));
            $$("[data-r]", s).forEach((b) => (b.onclick = () => { UI.click(); UF.rev = b.dataset.r === "1"; UI.closeSheet(); re(); }));
          });
      };
      $("#uFil", el).onclick = () => {
        UI.click();
        const tmp = JSON.parse(JSON.stringify(UF.f));
        const draw = (s) => {
          $("#fgBody", s).innerHTML = FGROUPS().map((g) => '<div class="fg"><b>' + g[1] + '</b><div class="fopts">' + g[2].map((o) => '<button class="' + ((tmp[g[0]] || []).indexOf(o[0]) >= 0 ? "on" : "") + '" data-g="' + g[0] + '" data-v="' + o[0] + '">' + esc(o[1]) + "</button>").join("") + "</div></div>").join("");
          const n = ST().IDS.filter((id) => { const K = ST().KITS[id]; const val = { own: SV().owned(id) ? "y" : "n", burst: String(K.burst), cls: K.cls, wp: K.wp, sq: K.sq, el: ST().elOf(id) }; return Object.keys(tmp).every((g) => !(tmp[g] || []).length || tmp[g].indexOf(val[g]) >= 0); }).length;
          $("#fgOk", s).textContent = "この条件で見る（" + n + "体）";
          $$("#fgBody button", s).forEach((b) => (b.onclick = () => { UI.click(); const g = b.dataset.g, v = b.dataset.v; const a = tmp[g] || (tmp[g] = []); const i = a.indexOf(v); if (i >= 0) a.splice(i, 1); else a.push(v); draw(s); }));
        };
        UI.sheet('<div class="sh-h"><span class="sh-ic">⚲</span><b>絞り込み</b><button class="sh-x" data-x aria-label="閉じる">✕</button></div><p class="muted" style="margin:0 0 8px">同じ行は「どれか」、ちがう行は「どれも」に合うキャラを出します。</p><div id="fgBody"></div>' +
          '<div class="sh-btns"><button class="btn ghost" id="fgClr">リセット</button><button class="btn" id="fgOk">この条件で見る</button></div>',
          (s) => { draw(s); $("#fgClr", s).onclick = () => { UI.click(); Object.keys(tmp).forEach((k) => delete tmp[k]); draw(s); }; $("#fgOk", s).onclick = () => { UI.click(); UF.f = tmp; UI.closeSheet(); re(); }; });
      };
    },
  };

  /* ══════════ キャラ詳細（育成）══════════ */
  const uTab = { t: "grow" };
  let giftN = 1;
  UI.S.unit = {
    cls: "full ud", top: true, nav: false, title: (p) => UI.nm(p.id), en: "PROFILE",
    render(p) {
      const id = p.id, K = ST().KITS[id], own = SV().owned(id), E = ST().ELEM[ST().elOf(id)], Q = ST().SQUADS[K.sq];
      const o = own ? SV().opt(id) : SV().trialOpt(id), st = ST().stats(id, o);
      const tg = '<span class="chip" style="background:' + E.c + '">' + E.nm + "属性</span>" +
        '<span class="chip wpc">' + ST().wpIcon(K.wp, 12) + " " + K.wp + "</span>" +
        '<span class="chip" style="background:' + ST().CLASSES[K.cls].c + '">' + ST().CLASSES[K.cls].nm + "</span>" +
        '<span class="chip bur">' + UI.burstBadge(K.burst) + "バースト</span>" +
        '<span class="chip" style="background:' + Q.c + '">' + Q.nm + "</span>";
      const tabs = [["grow", "強化", "#12b5ff"], ["skill", "スキル", "#8a5cff"], ["gear", "装備", "#ff8a2a"], ["cube", "キューブ", "#a35cff"], ["bond", "好感度", "#ff5fa8"]];
      return '<div class="ud-hero' + (UI.isMax(id) ? " mxh" : "") + '" style="--sq:' + Q.c + ";--cc:" + (UI.CCOL[id] || "#7b8cff") + '"><div class="ud-bg"></div><img class="full ' + (UI.hasLD(id) ? "ld" : "ss") + '" src="' + UI.full(id) + '" alt="" onerror="this.src=\'' + UI.art(id) + '\'">' +
        '<button class="ud-hide" id="udHide" aria-label="画面の文字を隠す"><svg viewBox="0 0 24 24"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg></button>' +
        '<div class="ud-name"><small>' + esc(K.role) + "</small><b>" + esc(UI.nm(id)) + (UI.isMax(id) ? '<span class="mxb">完凸</span>' : "") + '</b><div class="tg">' + tg + "</div></div>" +
        '<div class="ud-pow"><small>POWER</small><b class="num">' + (own ? fmt(st.power) : "—") + "</b><em>" + (own ? "Lv." + st.lv + " / " + ST().lvCap(o.awk) : "未所持") + "</em></div></div>" +
        '<div class="ud-body"><div class="tabs ud-tabs">' + tabs.map((t) => '<button class="' + (uTab.t === t[0] ? "on" : "") + '" data-t="' + t[0] + '" style="--c:' + t[2] + '">' + t[1] + "</button>").join("") + "</div>" +
        (own ? tabBody(id, uTab.t, o, st) : notOwned(id, o, st)) + "</div>";
    },
    mount(el, p) {
      $$(".ud-tabs button", el).forEach((b) => (b.onclick = () => { UI.click(); uTab.t = b.dataset.t; UI.refresh(); }));
      const hb = $("#udHide", el); if (hb) hb.onclick = () => { UI.click(); UI.toggleHide(true); };
      bindUnit(el, p.id);
    },
  };
  function notOwned(id, o, st) {
    return '<div class="pan"><b>まだ持っていません</b><p class="muted">XEVARION のガチャ（' + esc(ST().SQUADS[ST().KITS[id].sq].fes) + '）で手に入ります。持っているキャラだけが編成に入れられます。</p><a class="btn wide" href="../gacha.html">ガチャへ</a></div>' +
      '<div class="h2"><b>スキル・バースト</b><em>スキル Lv1 の値</em></div>' + ["s1", "s2", "bs"].map((k, i) => skillCard(id, k, i, 1, false)).join("");
  }
  function stat4(st) { return '<div class="stat4"><span class="s1"><i>HP</i><b>' + short(st.hp) + '</b></span><span class="s2"><i>攻撃力</i><b>' + short(st.atk) + '</b></span><span class="s3"><i>防御力</i><b>' + short(st.def) + '</b></span><span class="s4"><i>会心率</i><b>' + st.crit.toFixed(1) + "%</b></span></div>"; }
  function tabBody(id, t, o, st) {
    const u = SV().unit(id), K = ST().KITS[id];
    if (t === "grow") {
      const cap = ST().lvCap(o.awk), top5 = SV().inTop5(id), sy = SV().synchroLv();
      const c1 = SV().lvUpCost(id, 1), c10 = SV().lvUpCost(id, 10), cm = SV().lvUpCost(id, 999);
      const maxed = o.lv >= cap;
      return '<div class="pan"><div class="lvbox"><div class="lvbig num">' + o.lv + "<small>/ " + cap + '</small></div><div style="flex:1"><div class="lvcap">' +
        (sy && !top5 && SV().S.set.synchro ? "シンクロ装置：上位5人に合わせて Lv." + sy + "（このキャラを上げると上位5人に入ります）" : top5 && SV().ownedIds().length >= 5 ? "上位5人（シンクロ装置の基準）" : "持っているキャラが5人以上になるとシンクロ装置が使えます") + "</div>" +
        '<div class="awk">' + [1, 2, 3, 4].map((i) => '<i class="' + (i <= o.awk ? "on" : "") + '">★</i>').join("") + '<span class="lvcap">凸 ' + o.awk + " / 4" + (o.awk >= 4 ? "（完凸）" : "・上限 Lv." + ST().LV_CAP[Math.min(4, o.awk + 1)] + " へは凸が必要") + "</span></div></div></div>" +
        (maxed ? '<p class="muted">' + (o.awk >= 4 ? "最大レベルです。" : "レベルの上限です。ガチャで同じキャラを引くと凸が進み、上限が上がります（XEVARION 共通）。") + "</p>" :
          '<div class="lvrow"><div><small class="muted">次の Lv まで</small>' + UI.costHTML(c1.cost) + "</div>" + (cm.n > 1 ? '<div><small class="muted">できるだけ（Lv.' + Math.min(cap, o.lv + countAffordable(id)) + " まで）</small></div>" : "") + "</div>" +
          '<div class="sh-btns" style="margin-top:6px"><button class="btn ghost" id="lv1">+1</button><button class="btn ghost" id="lv10">+' + c10.n + '</button><button class="btn" id="lvMax">できるだけ上げる</button></div>') + "</div>" +
        '<div class="h2"><b>ステータス</b></div>' + stat4(st) +
        '<div class="pan" style="margin-top:10px">' + ST().detailHTML(id, o) + "</div>";
    }
    if (t === "skill") {
      const Bu = ST().BURST[K.burst];
      return '<div class="skhelp"><b class="skh-t">バーストのしくみ</b>ゲージが満タンになると、' + UI.burstBadge(1) + "→" + UI.burstBadge(2) + "→" + UI.burstBadge(3) + " の順に1人ずつ発動。Ⅲ のあと <b>10秒のフルバースト</b>（味方全員の与ダメージ ×1.5）。" +
        esc(UI.nm(id)) + " は " + UI.burstBadge(K.burst) + " の番で使えます。</div>" +
        '<div class="sh-btns" style="margin:0 0 10px"><button class="btn" id="skAll">3つのスキルをまとめて上げる</button></div>' +
        ["s1", "s2", "bs"].map((k, i) => skillCard(id, k, i, u.sk[i], true)).join("");
    }
    if (t === "gear") {
      return '<div class="gslots">' + ST().GEAR_PARTS.map((p) => {
        const g = u.gear[p] && SV().S.gear[u.gear[p]];
        if (!g) return '<button class="gslot empty" data-gp="' + p + '"><span class="gt">＋</span><small>' + ST().GEAR_PART_NM[p] + "</small></button>";
        return '<button class="gslot" data-gp="' + p + '"><span class="gt' + (g.t >= 10 ? " ol" : "") + '">' + (g.t >= 10 ? "OL" : "T" + g.t) + "</span><span class='gp'>" + ST().GEAR_PART_NM[p] + (g.e ? " +" + g.e : "") + "</span><small>" + ST().CLASSES[g.cls].nm.slice(0, 2) + "・" + ST().SQUADS[g.sq].en + "</small></button>";
      }).join("") + "</div>" +
        '<div class="sh-btns"><button class="btn ghost" id="gAuto">おまかせ装備</button><button class="btn" id="gEnhAll">4部位をまとめて強化</button></div>' +
        '<p class="muted">装備は<b>クラス</b>（火力型・防御型・支援型）と<b>部隊</b>が同じだと、それぞれ ×1.1。T9 は<b>オーバーロード</b>（オーバーロード核）で T10 になり、追加効果が3つ付きます（カスタムモジュールで付けかえ）。</p>';
    }
    if (t === "cube") {
      const cubes = Object.keys(SV().S.cubes);
      if (!cubes.length) return '<div class="pan"><b>キューブはまだありません</b><p class="muted">タワーの10階ごと・迎撃戦で手に入ります。1体に1つ装備できます。</p></div>';
      return cubes.map((k) => {
        const C = ST().CUBES[k], c = SV().S.cubes[k], on = u.cube === k, ow = SV().cubeOwner(k);
        const v = C.v[0] + (C.v[1] - C.v[0]) * (c.lv - 1) / (ST().CUBE_MAX - 1);
        return '<div class="pan cubec"><span class="cic" style="background:' + C.c + '">' + C.ic + '</span><span style="flex:1"><b>' + C.nm + "</b> <span class='num lvt'>Lv." + c.lv + "</span><br><small class='muted'>" + C.d.replace("{v}", v.toFixed(1)) + (ow && !on ? "（" + esc(UI.nm(ow)) + " が装備中）" : "") + "</small></span>" +
          '<span class="cbtns"><button class="btn sm ' + (on ? "gold" : "ghost") + '" data-cq="' + k + '">' + (on ? "装備中" : "装備") + "</button>" + (c.lv < ST().CUBE_MAX ? '<button class="btn sm" data-cu="' + k + '">強化</button><button class="btn sm ghost" data-cm="' + k + '">まとめて</button>' : "") + "</span></div>";
      }).join("") + '<p class="muted">強化には<b>キューブの欠片</b>とクレジット（Lv.n → n+1：欠片 2+2n）。</p>';
    }
    if (t === "bond") {
      const need = D().bondNeed(u.bond), canTalk = SV().canTalk(id), gifts = SV().cur("gift"), gmax = Math.max(1, Math.min(gifts, SV().giftNeed(id)));
      giftN = Math.max(1, Math.min(giftN, gmax));
      const ep2 = D().EPISODE2 && D().EPISODE2[id];
      return '<div class="pan"><div class="bond"><span class="hrt">♥</span><div style="flex:1"><b style="font-size:26px;font-weight:900">' + u.bond + '</b><span class="muted"> / ' + ST().BOND_MAX + '</span><div class="bar pink" style="margin-top:6px"><b style="width:' + (u.bond >= ST().BOND_MAX ? 100 : (u.bx / need * 100)) + '%"></b></div><small class="muted">好感度 1 につき HP+30・攻撃力+3・防御力+0.5</small></div></div>' +
        '<div class="sh-btns"><button class="btn pink" id="bTalk" ' + (canTalk ? "" : "disabled") + ">相談する" + (canTalk ? "" : "<small>（あした）</small>") + "</button></div></div>" +
        '<div class="h2"><b>ギフトをわたす</b><em>持っている ♥ ×' + gifts + "</em></div>" +
        '<div class="pan">' + (u.bond >= ST().BOND_MAX ? '<p class="muted">好感度は最大です。</p>' : gifts ? '<p class="muted" style="margin-top:0">1つで好感度の経験 +70。まとめてわたせます（最大まで あと ' + SV().giftNeed(id) + " 個）。</p>" + UI.stepper("gStp", giftN, gmax) + '<div class="sh-btns"><button class="btn pink" id="bGift">♥ ' + giftN + " 個わたす</button></div>" : '<p class="muted">好感度ギフトがありません（前哨基地・ショップ・任務で手に入ります）。</p>') + "</div>" +
        '<div class="h2"><b>エピソード</b></div><div class="pan eps">' +
        '<button class="btn wide ' + (u.bond >= 5 ? "" : "ghost") + '" id="bEp" ' + (u.bond >= 5 ? "" : "disabled") + ">第1話「" + esc(UI.nm(id)) + "のこと」" + (u.bond >= 5 ? "" : "<small>（好感度 5 で解放）</small>") + "</button>" +
        (ep2 ? '<button class="btn wide ' + (u.bond >= D().EP2_NEED ? "" : "ghost") + '" id="bEp2" ' + (u.bond >= D().EP2_NEED ? "" : "disabled") + ">第2話「" + esc(UI.nm(id)) + "と、これから」" + (u.bond >= D().EP2_NEED ? "" : "<small>（好感度 " + D().EP2_NEED + " で解放）</small>") + "</button>" : "") + "</div>";
    }
    return "";
  }
  /* いまの素材で何 Lv 上げられるか（表示用） */
  function countAffordable(id) {
    const u = SV().unit(id), cap = ST().lvCap(SV().awk(id)); let lv = Math.max(u.lv, SV().effLv(id)), cr = SV().cur("credit"), bd = SV().cur("bdata"), n = 0;
    while (lv < cap) { const c = D().lvCost(lv); if (cr < c.credit || bd < c.bdata) break; cr -= c.credit; bd -= c.bdata; lv++; n++; }
    return n;
  }
  /* ── スキル1つのカード（強化つき） ── */
  function phInfo(desc, ph) {
    const t = String(desc).replace(/<[^>]+>/g, ""), i = t.indexOf(ph); if (i < 0) return null;
    let s = t.slice(0, i); const plus = /\+\s*$/.test(s); s = s.replace(/[+\s]+$/, "");
    const cut = Math.max(s.lastIndexOf("、"), s.lastIndexOf("。"), s.lastIndexOf("・"), s.lastIndexOf("（"), s.lastIndexOf("「"));
    s = s.slice(cut + 1).trim().replace(/の$/, "");
    const after = t.charAt(i + ph.length);
    return { nm: s || "効果量", pre: plus ? "+" : "", suf: after === "%" ? "%" : after === "秒" ? "秒" : after === "回" ? "回" : "" };
  }
  function skillCard(id, k, i, lv, canUp) {
    const K = ST().KITS[id], sk = K[k], isB = k === "bs", Bu = ST().BURST[K.burst];
    const plain = String(sk.desc).replace(/<[^>]+>/g, "");
    const tags = [];
    if (isB) { tags.push('<span class="bt b' + K.burst + '">バースト ' + Bu.nm + " の番</span>"); tags.push("<span>再使用 " + K.cd + "秒</span>"); if (sk.dur) tags.push("<span>効果 " + sk.dur + "秒</span>"); }
    else {
      tags.push('<span class="ps">パッシブ（自動）</span>');
      const cond = /^([^、。]{2,16}中)、/.exec(plain); if (cond) tags.push('<span class="cd">' + esc(cond[1]) + "だけ</span>");
      if (sk.dur) tags.push("<span>効果 " + sk.dur + "秒</span>");
      if (sk.max) tags.push("<span>最大 " + sk.max + " 回</span>");
    }
    const nx = Math.min(ST().SKILL_MAX, lv + 1), mx = ST().SKILL_MAX;
    const rows = ["v", "w"].filter((q) => sk[q] && plain.indexOf("{" + q + "}") >= 0).map((q) => {
      const P = phInfo(sk.desc, "{" + q + "}") || { nm: "効果量", pre: "", suf: "" };
      const f = (L) => P.pre + ST().skillV(sk, L, q).toLocaleString("ja-JP") + P.suf;
      return "<tr><th>" + esc(P.nm) + "</th><td class=\"now\">" + f(lv) + "</td><td>" + (lv < mx ? f(nx) : "—") + "</td><td class=\"mx\">" + f(mx) + "</td></tr>";
    }).join("");
    const c = D().skillCost(lv);
    return '<div class="pan skc2' + (isB ? " bs b" + K.burst : "") + '">' +
      '<div class="skc2-hd"><span class="ty">' + (isB ? "BURST" : "SKILL " + (i + 1)) + '</span><b>' + esc(sk.nm) + '</b><span class="lv">Lv.<b class="num">' + lv + "</b>/" + mx + "</span></div>" +
      '<div class="skc2-tags">' + tags.join("") + "</div>" +
      '<p class="skc2-d">' + ST().skillText(id, k, lv) + "</p>" +
      (rows ? '<table class="skc2-v"><thead><tr><th>数値</th><th>いま</th><th>次の Lv</th><th>最大</th></tr></thead><tbody>' + rows + "</tbody></table>" : "") +
      (!canUp ? "" : lv >= mx ? '<div class="muted" style="margin-top:6px">最大レベルです</div>' : '<div class="skc2-up">' + UI.costHTML(c) + '<button class="btn sm ghost" data-skm="' + i + '">できるだけ</button><button class="btn sm" data-sk="' + i + '">Lv.' + nx + " へ</button></div>") + "</div>";
  }
  UI.skillCard = skillCard;
  function bindUnit(el, id) {
    const re = () => { UI.refresh(); UI.paintCur(); };
    const ok = () => { try { MB3.Audio.play("ready"); } catch (e) {} };
    const lv = (n) => { const d = SV().lvUp(id, n); if (d) { ok(); UI.toast("Lv が " + d + " 上がりました"); } else UI.toast("素材が足りません"); re(); };
    const b1 = $("#lv1", el), b10 = $("#lv10", el), bm = $("#lvMax", el);
    if (b1) b1.onclick = () => lv(1); if (b10) b10.onclick = () => lv(10); if (bm) bm.onclick = () => lv(999);
    $$("[data-sk]", el).forEach((b) => (b.onclick = () => { if (SV().skillUp(id, +b.dataset.sk)) { ok(); UI.toast("スキルを強化しました"); } else UI.toast("素材が足りません"); re(); }));
    $$("[data-skm]", el).forEach((b) => (b.onclick = () => { const n = SV().skillUpMax(id, +b.dataset.skm); if (n) { ok(); UI.toast("スキルが " + n + " Lv 上がりました"); } else UI.toast("素材が足りません"); re(); }));
    const sa = $("#skAll", el); if (sa) sa.onclick = () => { let n = 0; for (let r = 0; r < 30; r++) { let any = 0; [0, 1, 2].forEach((i) => { if (SV().skillUp(id, i)) { n++; any = 1; } }); if (!any) break; } if (n) { ok(); UI.toast("スキルを合計 " + n + " Lv 上げました"); } else UI.toast("素材が足りないか、すべて最大です"); re(); };
    $$("[data-gp]", el).forEach((b) => (b.onclick = () => { UI.click(); gearSheet(id, b.dataset.gp); }));
    const ga = $("#gAuto", el); if (ga) ga.onclick = () => { UI.click(); SV().autoEquip(id); UI.toast("いちばん強い装備を付けました"); re(); };
    const ge = $("#gEnhAll", el); if (ge) ge.onclick = () => { const u = SV().unit(id); let n = 0; ST().GEAR_PARTS.forEach((p) => { if (u.gear[p]) n += SV().enhanceMax(u.gear[p]); }); if (n) { ok(); UI.toast("装備を合計 +" + n + " 強化しました"); } else UI.toast("素材が足りないか、強化できる装備がありません"); re(); };
    $$("[data-cq]", el).forEach((b) => (b.onclick = () => { UI.click(); SV().cubeEquip(id, b.dataset.cq); re(); }));
    $$("[data-cu]", el).forEach((b) => (b.onclick = () => { if (SV().cubeUp(b.dataset.cu)) { ok(); UI.toast("キューブを強化しました"); } else UI.toast("素材が足りません"); re(); }));
    $$("[data-cm]", el).forEach((b) => (b.onclick = () => { const n = SV().cubeUpMax(b.dataset.cm); if (n) { ok(); UI.toast("キューブが " + n + " Lv 上がりました"); } else UI.toast("素材が足りません"); re(); }));
    const bt = $("#bTalk", el); if (bt) bt.onclick = () => { UI.click(); talkSheet(id); };
    if ($("#gStp", el)) { const gmax = Math.max(1, Math.min(SV().cur("gift"), SV().giftNeed(id))); UI.bindStepper(el, "gStp", () => giftN, (n) => { giftN = n; UI.refresh(); }, gmax); }
    const bg = $("#bGift", el); if (bg) bg.onclick = () => { const up = SV().gift(id, giftN); ok(); UI.toast(up ? "♥ 好感度が " + up + " 上がりました！" : "♥ ギフトを " + giftN + " 個わたしました"); giftN = 1; re(); };
    const be = $("#bEp", el); if (be) be.onclick = () => { UI.click(); const ep = D().EPISODE[id]; if (ep) UI.storyLines(UI.nm(id) + "のこと", ep[0], ep.slice(1).map((x) => [id, x]), null, "ep1:" + id); };
    const be2 = $("#bEp2", el); if (be2) be2.onclick = () => { UI.click(); const ep = D().EPISODE2[id]; if (ep) UI.storyLines(UI.nm(id) + "と、これから", ep[0], ep.slice(1).map((x) => [id, x]), null, "ep2:" + id); };
  }
  function talkSheet(id) {
    const L = D().TALK[id] || []; const q = L[Math.floor(Math.random() * L.length)] || ["……", ["うん", "そうだね"]];
    const ans = q[1].map((a, i) => ({ a, good: i === 0 })).sort(() => Math.random() - 0.5);
    UI.sheet('<div class="sh-h"><span class="sh-ic">💬</span><b>' + esc(UI.nm(id)) + ' と相談</b><button class="sh-x" data-x aria-label="閉じる">✕</button></div>' +
      '<div class="talk"><img src="' + UI.th(id) + '" alt=""><div class="bubble">「' + esc(q[0]) + "」</div></div>" +
      '<div class="sh-btns col">' + ans.map((x, i) => '<button class="btn ghost wide" data-a="' + i + '">' + esc(x.a) + "</button>").join("") + "</div>",
      (s) => $$("[data-a]", s).forEach((b) => (b.onclick = () => { const x = ans[+b.dataset.a]; const up = SV().talk(id, x.good); UI.closeSheet(); UI.toast((x.good ? "♥ よろこんでくれた！" : "うなずいてくれた") + (up ? "　好感度 +" + up : "")); UI.refresh(); })));
  }
  function gearLabel(g) { return (g.t >= 10 ? "OL" : "T" + g.t) + " " + ST().GEAR_PART_NM[g.p] + (g.e ? " +" + g.e : ""); }
  function gearSheet(id, p) {
    const u = SV().unit(id), curK = u.gear[p], all = Object.keys(SV().S.gear).filter((k) => SV().S.gear[k].p === p);
    all.sort((a, b) => SV().S.gear[b].t - SV().S.gear[a].t || SV().S.gear[b].e - SV().S.gear[a].e);
    const g = curK && SV().S.gear[curK];
    let html = '<div class="sh-h"><span class="sh-ic">⚙</span><b>' + ST().GEAR_PART_NM[p] + 'の装備</b><button class="sh-x" data-x aria-label="閉じる">✕</button></div>';
    if (g) {
      const m = ST().gearMain(Object.assign({ p }, g), id);
      html += '<div class="pan"><b>装備中：' + gearLabel(g) + '</b><div class="muted">' + ST().CLASSES[g.cls].nm + "用・" + ST().SQUADS[g.sq].nm + "　HP+" + fmt(m.hp) + "・攻撃+" + fmt(m.atk) + "・防御+" + fmt(m.def) + "</div>" +
        (g.ol || []).map((o, i) => '<div class="ol-line"><b>' + ST().OL_FX[o.k].nm + '</b><em>+' + o.v + '%</em><button class="' + (o.lock ? "on" : "") + '" data-lock="' + i + '">' + (o.lock ? "固定中" : "固定") + "</button></div>").join("") +
        '<div class="sh-btns wrap2">' + (g.e < 5 ? '<button class="btn sm" id="gEnh">強化 +' + (g.e + 1) + '</button><button class="btn sm ghost" id="gEnh5">+5 まで</button>' : "") + (g.t === 9 ? '<button class="btn sm gold" id="gOl">オーバーロード</button>' : "") + (g.t >= 10 ? '<button class="btn sm" id="gRe">追加効果を変える</button>' : "") + '<button class="btn sm ghost" id="gOff">はずす</button></div>' +
        (g.e < 5 ? UI.costHTML(D().gearCost(g.t, g.e)) : "") + (g.t === 9 ? UI.costHTML({ olcore: 1, credit: 100000 }) : "") + (g.t >= 10 ? UI.costHTML(SV().rerollCost(curK)) : "") + "</div>";
    }
    const loose = all.filter((k) => k !== curK && !SV().gearOwner(k) && SV().S.gear[k].t < 9);
    html += '<div class="h2" style="margin-top:12px"><b>持っている装備</b><em>' + all.length + " 個</em></div>" + (loose.length > 1 ? '<div class="sh-btns" style="margin:0 0 8px"><button class="btn sm ghost" id="gDisAll">使っていない T8 以下をまとめて分解（' + loose.length + "個）</button></div>" : "") + "<div class='glist'>" +
      (all.length ? all.map((k) => { const x = SV().S.gear[k], ow = SV().gearOwner(k), m = ST().gearMain(Object.assign({ p }, x), id); return '<div class="gitem"><b class="gt num">' + (x.t >= 10 ? "OL" : "T" + x.t) + "</b><span><b>" + gearLabel(x) + "</b><br>" + ST().CLASSES[x.cls].nm.slice(0, 2) + "・" + ST().SQUADS[x.sq].en + "　攻+" + fmt(m.atk) + " HP+" + fmt(m.hp) + (ow ? "　<i class='own'>" + esc(UI.nm(ow)) + "</i>" : "") + "</span>" + (k === curK ? '<span class="chip">装備中</span>' : '<button class="btn sm" data-eq="' + k + '">装備</button>' + (!ow ? '<button class="btn sm ghost" data-dis="' + k + '">分解</button>' : "")) + "</div>"; }).join("") : '<p class="muted">この部位の装備がありません。ステージで手に入ります。</p>') + "</div>";
    UI.sheet(html, (s) => {
      const re = () => { gearSheet(id, p); UI.refresh(); UI.paintCur(); };
      const e1 = $("#gEnh", s); if (e1) e1.onclick = () => { if (SV().enhance(curK)) UI.toast("強化しました"); else UI.toast("素材が足りません"); re(); };
      const e5 = $("#gEnh5", s); if (e5) e5.onclick = () => { const n = SV().enhanceMax(curK); UI.toast(n ? "+" + n + " 強化しました" : "素材が足りません"); re(); };
      const o1 = $("#gOl", s); if (o1) o1.onclick = () => { if (SV().overload(curK)) { UI.toast("オーバーロード！ 追加効果が3つ付きました"); try { MB3.Audio.play("fb"); } catch (e) {} } else UI.toast("素材が足りません"); re(); };
      const r1 = $("#gRe", s); if (r1) r1.onclick = () => { if (SV().reroll(curK)) UI.toast("追加効果を変えました"); else UI.toast("素材が足りないか、全部固定されています"); re(); };
      const f1 = $("#gOff", s); if (f1) f1.onclick = () => { SV().unequip(id, p); re(); };
      const da = $("#gDisAll", s); if (da) da.onclick = () => { let kit = 0, cr = 0; loose.forEach((k) => { const r = SV().dismantle(k); if (r) { kit += r.kit; cr += r.credit; } }); UI.toast("まとめて分解：装備強化キット ×" + kit + "・クレジット " + fmt(cr)); re(); };
      $$("[data-lock]", s).forEach((b) => (b.onclick = () => { const x = SV().S.gear[curK].ol[+b.dataset.lock]; x.lock = !x.lock; SV().save(); re(); }));
      $$("[data-eq]", s).forEach((b) => (b.onclick = () => { SV().equip(id, b.dataset.eq); UI.click(); re(); }));
      $$("[data-dis]", s).forEach((b) => (b.onclick = () => { const r = SV().dismantle(b.dataset.dis); if (r) UI.toast("分解：装備強化キット ×" + r.kit + "・クレジット " + fmt(r.credit)); re(); }));
    });
  }

  /* ══════════ 編成 ══════════
     squad（下のナビの「編成」）… 編成1〜3を作る画面（出撃しない）
     form … 出撃の前（p = { mode: "stage"|"tower"|"boss"|"arena"|"defense", stage, rec（推奨戦力）, title, onGo(ids) }）
     ★★ 2026-10-31 体験キャラは廃止（持っているキャラだけ） */
  function formBody(p, standalone) {
    const S = SV().S;
    if (!p.ids) {
      let ids = p.mode === "defense" ? (S.defense || []).slice() : SV().squad().slice();
      ids = ids.filter((id) => SV().owned(id));
      if (!ids.length) ids = SV().autoSquad();
      p.ids = ids;
    }
    const team = SV().teamOf(p.ids), pw = SV().teamPower(team);
    const bset = {}; p.ids.forEach((id) => { bset[ST().KITS[id].burst] = (bset[ST().KITS[id].burst] || 0) + 1; });
    const chain = [1, 2, 3].map((b) => '<span class="ck ' + (bset[b] ? "ok" : "ng") + '">' + UI.burstBadge(b) + (bset[b] ? "✓" : "✕") + "</span>").join('<i class="arw">→</i>');
    const slots = [0, 1, 2, 3, 4].map((i) => {
      const id = p.ids[i];
      if (!id) return '<button class="fslot empty" data-slot="' + i + '"><span class="fi">＋</span><small>' + (i + 1) + "</small></button>";
      const K = ST().KITS[id], o = SV().opt(id);
      return '<button class="fslot' + (UI.isMax(id) ? " mx" : "") + '" data-slot="' + i + '" style="--cc:' + (UI.CCOL[id] || "#7b8cff") + '"><img src="' + UI.ss(id) + '" alt="">' + UI.burstBadge(K.burst) +
        '<span class="fi"><b>' + esc(UI.nm(id)) + '</b><small>' + K.wp + " Lv." + o.lv + "</small></span><i class='fx'>✕</i></button>";
    }).join("");
    const cand = ST().IDS.filter((id) => SV().owned(id)).sort((a, b) => SV().power(b) - SV().power(a));
    const rec = p.rec || 0;
    const showPresets = p.mode !== "defense" && p.mode !== "arena";
    return '<div class="wrap"><div class="fbody">' + (p.title ? '<div class="pgh"><b>' + esc(p.title) + "</b></div>" : standalone ? '<div class="pgh"><b>編成</b><span class="pgh-c">出撃のときに使う5人（3つまで）</span></div>' : "") +
      (showPresets ? '<div class="seg presets">' + [0, 1, 2].map((i) => '<button class="' + (S.sqI === i ? "on" : "") + '" data-pre="' + i + '">編成 ' + (i + 1) + "</button>").join("") + "</div>" : "") +
      '<div class="form5">' + slots + "</div>" +
      '<div class="fchain"><span class="lb">バーストのつながり</span>' + chain + "</div>" +
      '<div class="tpw"><span><small class="muted">部隊の戦力</small><b class="num">' + fmt(pw) + "</b></span>" + (rec ? '<span class="rec ' + (pw < rec * 0.85 ? "ng" : "ok") + '">' + (p.mode === "arena" ? "相手 " : "推奨 ") + fmt(rec) + "</span>" : "") + "</div>" +
      '<div class="h2"><b>メンバー</b><em>押して入れる・外す（持っているキャラだけ）</em></div>' +
      (cand.length ? '<div class="pick">' + cand.map((id) => { const K = ST().KITS[id]; return '<button class="pk' + (p.ids.indexOf(id) >= 0 ? " in" : "") + (UI.isMax(id) ? " mx" : "") + '" data-id="' + id + '"><img src="' + UI.th(id) + '" alt="">' + UI.burstBadge(K.burst) + "<b>" + esc(UI.nm(id)) + "</b>" + (p.ids.indexOf(id) >= 0 ? '<span class="pin">' + (p.ids.indexOf(id) + 1) + "</span>" : "") + "</button>"; }).join("") + "</div>"
        : '<div class="empty">持っている超極祭系の UR がいません。XEVARION のガチャで手に入れると編成できます。<a class="btn sm" href="../gacha.html">ガチャへ</a></div>') +
      '</div><div class="sh-btns sticky-go"><button class="btn ghost" id="fAuto">おまかせ</button><button class="btn big" id="fGo" ' + (p.ids.length ? "" : "disabled") + ">" + (standalone ? "この編成で出撃 ›" : p.mode === "defense" ? "この編成で登録" : "出撃") + "</button></div></div>";
  }
  function formMount(el, p, standalone) {
    const save = () => { if (p.mode === "defense") { SV().S.defense = p.ids.slice(); SV().save(); } else if (p.mode !== "arena") SV().setSquad(p.ids); };
    $$("[data-pre]", el).forEach((b) => (b.onclick = () => { UI.click(); SV().S.sqI = +b.dataset.pre; SV().save(); p.ids = SV().squad().filter((id) => SV().owned(id)); if (!p.ids.length) p.ids = SV().autoSquad(); UI.refresh(); }));
    $$(".pk", el).forEach((b) => (b.onclick = () => { UI.click(); const id = b.dataset.id, i = p.ids.indexOf(id); if (i >= 0) p.ids.splice(i, 1); else if (p.ids.length < 5) p.ids.push(id); else UI.toast("5人までです（外すキャラを押してください）"); save(); UI.refresh(); }));
    $$("[data-slot]", el).forEach((b) => (b.onclick = () => { const i = +b.dataset.slot; if (p.ids[i]) { UI.click(); p.ids.splice(i, 1); save(); UI.refresh(); } }));
    $("#fAuto", el).onclick = () => { UI.click(); p.ids = SV().autoSquad(); save(); UI.refresh(); UI.toast("おまかせで編成しました（Ⅰ・Ⅱ・Ⅲ をそろえて戦力の高い順）"); };
    $("#fGo", el).onclick = () => { UI.click(); save(); if (standalone) { UI.go("camp"); return; } if (p.onGo) p.onGo(p.ids.slice()); };
  }
  UI.S.squad = {
    cls: "hasgo", top: true, nav: true, title: "編成", en: "FORMATION", back: "lobby", navKey: "squad",
    render(p) { return formBody(p, true); },
    mount(el, p) { formMount(el, p, true); },
  };
  UI.S.form = {
    cls: "hasgo", top: true, nav: false, title: (p) => (p.mode === "defense" ? "防衛編成" : "出撃の編成"), en: "FORMATION",
    render(p) { return formBody(p, false); },
    mount(el, p) { formMount(el, p, false); },
  };

  /* ══════════ 戦闘へ ══════════ */
  UI.battle = function (cfg, onDone) {
    const sec = $("#battle");
    sec.hidden = false; $("#tb").hidden = true; $("#nav").hidden = true;
    /* ★★ 2026-10-31 ご指定「バトルの AUTO のオンオフは維持」→ 前のバトルの AUTO・速さで始める（アリーナも） */
    cfg.auto = !!SV().setting("auto");
    cfg.speed = SV().setting("spd") === 2 ? 2 : 1;
    MB3.Battle.start(sec, cfg, (B) => {
      MB3.Battle.stop();
      sec.hidden = true; sec.innerHTML = "";
      const S = SV().S;
      S.st.battles++; S.st.bursts += B.side[0].bursts; S.st.kills += B.kills;
      if (B.side[0].bursts) SV().track("burst", B.side[0].bursts);
      if (B.result === "win") { S.st.wins++; SV().track("win", 1); try { window.XEVA && XEVA.completeMission && XEVA.completeMission("magibattle_win"); } catch (e) {} }
      SV().save();
      onDone(B);
    });
  };
})();
