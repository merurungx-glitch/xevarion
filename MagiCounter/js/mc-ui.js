/* ══════════════════════════════════════════════════════════════
   MagiCounter — 画面
   ・データは mc-data.js、計算は mc-core.js（window.MC）。
   ・ここは<b>描くだけ</b>。点のつけかたを変えたいときは mc-core.js を読む。
   ・画面は5つ（ホーム／検索／対策／編成／ランキング）＋ モーダル。
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const D = window.MC_DATA, C = window.MC;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ══════════ 言葉 ══════════ */
  const T = {
    home: { ja: "ホーム", en: "Home" },
    search: { ja: "検索", en: "Search" },
    counter: { ja: "対策", en: "Counter" },
    team: { ja: "編成", en: "Team" },
    rank: { ja: "ランキング", en: "Ranking" },
    tagline: { ja: "相手を分析して、最適な3体を。", en: "Analyze the foe. Pick the right three." },
    findBest: { ja: "最適な3体を見つけよう", en: "Find your best three" },
    findBestSub: { ja: "自分の編成と相手の編成を入れると、選ぶべき3体とその理由が出ます。",
                   en: "Enter both teams and get the three to bring — with the reasons." },
    goSim: { ja: "3体選出シミュレーターへ", en: "Open the pick simulator" },
    searchPh: { ja: "ポケモンの名前でさがす", en: "Search a Pokémon" },
    usageRank: { ja: "使用率ランキング", en: "Usage ranking" },
    hot: { ja: "いま注目のポケモン", en: "Trending now" },
    popTeams: { ja: "人気の編成", en: "Popular teams" },
    quick: { ja: "クイックアクセス", en: "Quick access" },
    rise: { ja: "使用率 急上昇", en: "Rising" },
    fall: { ja: "使用率 急下降", en: "Falling" },
    favs: { ja: "お気に入り", en: "Favorites" },
    recent: { ja: "よく見るポケモン", en: "Recently viewed" },
    myTeams: { ja: "マイ編成", en: "My teams" },
    typechart: { ja: "タイプ相性一覧", en: "Type chart" },
    pickSim: { ja: "3体選出", en: "3-Pick" },
    teamAn: { ja: "編成分析", en: "Team analysis" },
    oppAn: { ja: "相手編成分析", en: "Opponent analysis" },
    duel: { ja: "対面シミュレーター", en: "1v1 simulator" },
    history: { ja: "履歴", en: "History" },
    none: { ja: "まだありません", en: "Nothing here yet" },
    basic: { ja: "基本情報", en: "Basics" },
    defTable: { ja: "防御側のタイプ相性", en: "Defensive matchups" },
    offTable: { ja: "攻撃側のタイプ相性", en: "Offensive coverage" },
    weakTo: { ja: "弱点", en: "Weak to" },
    resistTo: { ja: "半減できる", en: "Resists" },
    immuneTo: { ja: "無効にできる", en: "Immune to" },
    goodVs: { ja: "有利な相手", en: "Good against" },
    badVs: { ja: "苦手な相手", en: "Struggles against" },
    howToBeat: { ja: "このポケモンへの対策", en: "How to beat it" },
    usage: { ja: "使用率", en: "Usage" },
    win: { ja: "勝率", en: "Win rate" },
    trend: { ja: "推移", en: "Trend" },
    commonMoves: { ja: "よく使われる技", en: "Common moves" },
    commonAbil: { ja: "よく使われる特性", en: "Common Abilities" },
    commonItem: { ja: "よく使われる持ち物", en: "Common items" },
    partners: { ja: "相性の良いポケモン", en: "Good partners" },
    checked: { ja: "対策されやすい相手", en: "Checked by" },
    addMine: { ja: "自分の編成に入れる", en: "Add to my team" },
    addOpp: { ja: "相手の編成に入れる", en: "Add to opponent" },
    mineTeam: { ja: "自分の編成（最大6体）", en: "My team (up to 6)" },
    oppTeam: { ja: "相手の編成（最大6体）", en: "Opponent (up to 6)" },
    run: { ja: "選出分析を実行", en: "Run pick analysis" },
    recommended: { ja: "おすすめ選出", en: "Recommended" },
    attacking: { ja: "攻撃型選出", en: "Offensive" },
    stable: { ja: "防御・安定型選出", en: "Defensive" },
    why: { ja: "なぜこの3体？", en: "Why these three?" },
    pts: { ja: "点", en: "pts" },
    resetAll: { ja: "全部消す", en: "Clear all" },
    save: { ja: "保存", en: "Save" },
    name: { ja: "編成名", en: "Team name" },
    memo: { ja: "メモ", en: "Memo" },
    newTeam: { ja: "編成を追加", en: "New team" },
    del: { ja: "削除", en: "Delete" },
    balance: { ja: "タイプバランス", en: "Type balance" },
    coverage: { ja: "攻撃範囲", en: "Coverage" },
    commonWeak: { ja: "共通する弱点", en: "Shared weaknesses" },
    roleBias: { ja: "役割の偏り", en: "Role balance" },
    suggest: { ja: "編成改善の候補", en: "Suggested additions" },
    dangerMon: { ja: "注意するべきポケモン", en: "Threats to watch" },
    effAtk: { ja: "有効な攻撃タイプ", en: "Effective attack types" },
    fastMon: { ja: "高速アタッカー", en: "Fast attackers" },
    offline: { ja: "オフラインです（保存してあるデータで動いています）", en: "Offline — running on saved data" },
    updated: { ja: "環境データを更新しました", en: "Meta data updated" },
    sampleNote: {
      ja: "※ 使用率・勝率は<b>この土台に入っているサンプル値</b>です。オンラインに戻ると自動で最新のデータを取りに行きます。",
      en: "Usage and win rates are <b>sample values bundled with the app</b>. They refresh automatically when you are back online.",
    },
    sortBy: { ja: "並び替え", en: "Sort" },
    filters: { ja: "絞りこみ", en: "Filters" },
    clear: { ja: "解除", en: "Clear" },
    result: { ja: "件", en: "results" },
    atkSide: { ja: "攻撃側", en: "Attacking" },
    defSide: { ja: "防御側", en: "Defending" },
    dual: { ja: "複合タイプで計算", en: "Dual-type calculator" },
    pick2: { ja: "タイプを2つまで選ぶ", en: "Pick up to 2 types" },
    against: { ja: "に対して", en: "vs" },
    lang: { ja: "English", en: "日本語" },
    noUpdate: { ja: "すでに最新です", en: "Already up to date" },
    lastUpdate: { ja: "環境データの最終更新", en: "Meta data last updated" },
    updateNow: { ja: "今すぐ更新", en: "Update now" },
    autoUpdate: {
      ja: "起動したとき・オンラインに戻ったとき・アプリを再び開いたときに<b>自動で最新に</b>します。",
      en: "Refreshes automatically on launch, when you come back online, and when you reopen the app.",
    },
    noUpdate: { ja: "すでに最新です", en: "Already up to date" },
    lastUpdate: { ja: "環境データの最終更新", en: "Meta data last updated" },
    updateNow: { ja: "今すぐ更新", en: "Update now" },
    autoUpdate: {
      ja: "起動したとき・オンラインに戻ったとき・アプリを再び開いたときに<b>自動で最新に</b>します。",
      en: "Refreshes automatically on launch, when you come back online, and when you reopen the app.",
    },
  };
  const t = (k) => C.L(T[k] || { ja: k, en: k });

  /* ══════════ 小さな部品 ══════════ */
  /* ══ タイプの札（自前の SVG 記号＋名前）══
     ★★ 2026-09-08 文字だけだったのを、<b>タイプの記号</b>を先頭に付けた。
     記号は mc-icons.js に自分で描いてある（端末まかせの絵文字は使わない）。 */
  function typePill(k, big) {
    const g = (window.MC_ICON ? MC_ICON.typeGlyph(k) : "");
    const sz = big ? 15 : 12;
    return '<span class="tt' + (big ? " big" : "") + '" style="background:' + C.tcolor(k) + '">'
      + (g ? '<svg viewBox="0 0 24 24" width="' + sz + '" height="' + sz + '" fill="#fff" aria-hidden="true">'
             + g + "</svg>" : "")
      + "<i>" + esc(C.tname(k)) + "</i></span>";
  }
  /* ══ ポケモンの絵 ══
     ★★ 2026-09-08 ご指定により<b>本物の絵</b>を出す。
     ★ 絵は 3段構えにしてある。
       ① フォルム専用の絵（p.form）
       ② 基本フォルムの絵（p.dex）
       ③ どちらも取れなければ<b>頭文字の丸</b>（オフライン初回など）
     ★ 一度見た絵は Service Worker が控えるので、2回目からはオフラインでも出る。 */
  const ART = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/";
  function artUrl(n) { return ART + n + ".png"; }
  function avatar(p, cls) {
    const c1 = C.tcolor(p.types[0]), c2 = C.tcolor(p.types[1] || p.types[0]);
    const nm = C.pname(p);
    const initial = nm.slice(0, 2);
    const bg = "linear-gradient(135deg," + c1 + "," + c2 + ")";
    if (!p.dex) {
      return '<span class="pav ' + (cls || "") + '" style="background:' + bg + '">' + esc(initial) + "</span>";
    }
    const first = p.form ? artUrl(p.form) : artUrl(p.dex);
    const fb = artUrl(p.dex);
    return '<span class="pav art ' + (cls || "") + '" style="background:' + bg + '">'
      + '<i class="pavi">' + esc(initial) + "</i>"
      + '<img src="' + first + '" alt="" loading="lazy" decoding="async" '
      + 'data-fb="' + fb + '" onload="this.classList.add(\'ok\')" '
      + "onerror=\"if(this.dataset.fb&&this.src!==this.dataset.fb){this.src=this.dataset.fb;}else{this.remove();}\">"
      + "</span>";
  }
  function multCls(m) {
    if (m === 0) return "m0";
    if (m <= 0.25) return "m25";
    if (m <= 0.5) return "m50";
    if (m < 2) return "m1";
    if (m < 4) return "m2";
    return "m4";
  }
  function multTx(m) { return m === 0 ? "0" : (m < 1 ? "×" + m : (m === 1 ? "1" : "×" + m)); }
  function trendTx(v) {
    const c = v > 0.05 ? "up" : v < -0.05 ? "dn" : "fl";
    const a = v > 0.05 ? "▲" : v < -0.05 ? "▼" : "―";
    return '<span class="tr ' + c + '">' + a + Math.abs(v).toFixed(1) + "</span>";
  }
  function pokeRow(p, right) {
    return '<div class="prow" onclick="MCUI.openPoke(\'' + p.id + '\')">'
      + avatar(p)
      + '<div style="min-width:0;flex:1">'
      + '<div class="pnm">' + esc(C.pname(p)) + "</div>"
      + '<div class="pmeta">' + p.types.map((x) => typePill(x)).join("") + "</div>"
      + "</div>"
      + (right || "") + "</div>";
  }
  function usageRight(p) {
    return '<div class="prank"><b>' + p.usage.toFixed(1) + "%</b><i>" + t("win") + " " + p.win.toFixed(1) + "%</i></div>";
  }

  /* ══════════ 画面のきりかえ ══════════ */
  let cur = "home";
  function go(id, silent) {
    cur = id;
    $$(".screen").forEach((s) => s.classList.toggle("on", s.id === "sc-" + id));
    $$("#nav button").forEach((b) => b.classList.toggle("on", b.dataset.go === id));
    if (!silent) window.scrollTo(0, 0);
    render(id);
  }
  function render(id) {
    if (id === "home") renderHome();
    else if (id === "search") renderSearch();
    else if (id === "counter") renderCounter();
    else if (id === "team") renderTeam();
    else if (id === "rank") renderRank();
  }

  /* ══════════════════════════════════════════════════════════════
     ① ホーム
     ══════════════════════════════════════════════════════════════ */
  function renderHome() {
    const s = C.load();
    const top = C.ranking("usage", 5);
    const hot = C.ranking("hot", 5);
    const rise = C.ranking("rise", 3), fall = C.ranking("fall", 3);
    const favs = s.favs.map((i) => D.BY_ID[i]).filter(Boolean).slice(0, 6);
    const rec = s.recent.map((i) => D.BY_ID[i]).filter(Boolean).slice(0, 6);

    $("#sc-home").innerHTML = ''
      + '<div class="card hero">'
      + '<div class="t">' + esc(t("findBest")) + "</div>"
      + '<div class="s">' + esc(t("findBestSub")) + "</div>"
      + '<div style="margin-top:11px"><button class="btn" style="background:#fff;color:var(--pri);border:0" '
      + 'onclick="MCUI.go(\'counter\');MCUI.counterTab(\'sim\')">' + icon("bolt",16) + " " + esc(t("goSim")) + "</button></div>"
      + "</div>"

      + '<div class="searchbar" onclick="MCUI.go(\'search\');setTimeout(function(){var e=document.getElementById(\'qText\');if(e)e.focus();},60)">'
      + '<span class="si">' + icon("search", 18) + '</span><input readonly placeholder="' + esc(t("searchPh")) + '"></div>'

      + '<div class="h">' + hIc('bolt') + '' + esc(t("quick")) + "</div>"
      + '<div class="quick">'
      + qa("chart", t("typechart"), "MCUI.openChart()")
      + qa("search", t("search"), "MCUI.go('search')")
      + qa("sim", t("pickSim"), "MCUI.go('counter');MCUI.counterTab('sim')")
      + qa("team", t("teamAn"), "MCUI.go('team')")
      + qa("opp", t("oppAn"), "MCUI.go('counter');MCUI.counterTab('opp')")
      + qa("duel", t("duel"), "MCUI.go('counter');MCUI.counterTab('duel')")
      + qa("rank", t("rank"), "MCUI.go('rank')")
      + qa("history", t("history"), "MCUI.openHistory()")
      + "</div>"

      + '<div class="h">' + hIc('crown') + '' + esc(t("usageRank"))
      + '<span class="more" onclick="MCUI.go(\'rank\')">' + (C.lang() === "en" ? "See all ›" : "すべて見る ›") + "</span></div>"
      + '<div class="card">' + top.map((p, i) =>
          pokeRow(p, '<div class="prank"><b>#' + (i + 1) + "</b><i>" + p.usage.toFixed(1) + "%</i></div>")).join("") + "</div>"

      + '<div class="h">' + hIc('star') + '' + esc(t("hot")) + "</div>"
      + '<div class="card">' + hot.map((p) =>
          pokeRow(p, '<div class="prank"><b>' + p.usage.toFixed(1) + "%</b><i>" + trendTx(p.trend) + "</i></div>")).join("") + "</div>"

      + '<div class="h">' + hIc('up') + '' + esc(t("rise")) + " / " + esc(t("fall")) + "</div>"
      + '<div class="card"><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
      + '<div><div class="note" style="margin-bottom:5px"><b style="color:var(--ok)">▲ ' + esc(t("rise")) + "</b></div>"
      + rise.map((p) => miniRow(p)).join("") + "</div>"
      + '<div><div class="note" style="margin-bottom:5px"><b style="color:var(--ng)">▼ ' + esc(t("fall")) + "</b></div>"
      + fall.map((p) => miniRow(p)).join("") + "</div>"
      + "</div></div>"

      + '<div class="h">' + hIc('team') + '' + esc(t("popTeams"))
      + '<span class="more" onclick="MCUI.openTeams()">' + (C.lang() === "en" ? "See all ›" : "すべて見る ›") + "</span></div>"
      + D.TEAMS.slice(0, 3).map(teamCard).join("")

      + (favs.length ? '<div class="h">' + hIc('star') + '' + esc(t("favs")) + "</div>"
          + '<div class="card">' + favs.map((p) => pokeRow(p, usageRight(p))).join("") + "</div>" : "")
      + (rec.length ? '<div class="h">' + hIc('history') + '' + esc(t("recent")) + "</div>"
          + '<div class="card">' + rec.map((p) => pokeRow(p, usageRight(p))).join("") + "</div>" : "")

      + metaCard();
  }
  /* ══ ★★ 2026-09-08 環境データの「いつ更新したか」を必ず見せる ══
     ご質問「情報の更新はいつ行っていますか」への答えを、画面の上に出してある。 */
  function metaCard() {
    const at = C.meta.at ? new Date(C.meta.at) : null;
    return '<div class="card tight">'
      + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">'
      + '<span style="color:var(--pri)">' + icon("refresh", 16) + "</span>"
      + '<b style="font-size:11.5px">' + esc(t("lastUpdate")) + "</b>"
      + '<span class="note" style="margin-left:auto">' + (at ? at.toLocaleString() : "—") + "</span></div>"
      + '<div class="note">' + t("autoUpdate") + "</div>"
      + '<div class="note" style="margin-top:5px">' + t("sampleNote") + "</div>"
      + '<button class="btn sm" style="margin-top:8px" onclick="MCUI.refreshMeta(true)">'
      + icon("refresh", 15) + " " + esc(t("updateNow")) + "</button></div>";
  }
  function qa(ic, tx, fn) {
    /* ★★ 2026-09-08 絵文字をやめ、自前の SVG（mc-icons.js）にした。 */
    return '<div class="qa" onclick="' + fn + '"><div class="qi">' + icon(ic, 21) + '</div><div class="qt">' + esc(tx) + "</div></div>";
  }
  function icon(name, size, sw) { return window.MC_ICON ? MC_ICON.ui(name, size, sw) : ""; }
  /* 見出しの丸いアイコン */
  function hIc(name) { return '<span class="ic">' + icon(name, 14, 2.1) + "</span>"; }
  function miniRow(p) {
    return '<div class="prow" style="padding:5px 0;border:0" onclick="MCUI.openPoke(\'' + p.id + '\')">'
      + avatar(p, "sm")
      + '<div style="min-width:0;flex:1"><div class="pnm" style="font-size:11.5px">' + esc(C.pname(p)) + "</div>"
      + '<div class="pmeta">' + trendTx(p.trend) + "</div></div></div>";
  }
  function teamCard(tm) {
    const mons = tm.ids.map((i) => D.BY_ID[i]).filter(Boolean);
    return '<div class="card" onclick="MCUI.openTeam(\'' + tm.id + '\')" style="cursor:pointer">'
      + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">'
      + '<b style="font-size:13.5px">' + esc(C.L({ ja: tm.ja, en: tm.en })) + "</b>"
      + '<span class="prank" style="margin-left:auto"><b>' + tm.usage.toFixed(1) + "%</b><i>" + t("win") + " " + tm.win.toFixed(1) + "%</i></span></div>"
      + '<div style="display:flex;gap:6px;flex-wrap:wrap">' + mons.map((p) => avatar(p, "sm")).join("") + "</div></div>";
  }

  /* ══════════════════════════════════════════════════════════════
     ② 検索
     ══════════════════════════════════════════════════════════════ */
  let Q = { text: "", types: [], weak: [], resist: [], ability: "", roles: [], gen: 0, usageMin: 0, sort: "usage" };
  let qMode = "types";     /* types / weak / resist */
  function renderSearch() {
    const list = C.search(Q);
    const abilKeys = [...new Set(D.DEX.reduce((a, p) => a.concat(p.abilities || []), []))]
      .filter((k) => D.ABIL[k]).sort((a, b) => C.aname(a).localeCompare(C.aname(b)));
    $("#sc-search").innerHTML = ''
      + '<div class="searchbar"><span class="si">' + icon("search", 18) + '</span>'
      + '<input id="qText" placeholder="' + esc(t("searchPh")) + '" value="' + esc(Q.text) + '" '
      + 'oninput="MCUI.qSet(\'text\',this.value)"></div>'

      + '<div class="tabs" style="margin-top:10px">'
      + ["types", "weak", "resist"].map((k) => '<button class="' + (qMode === k ? "on" : "") + '" onclick="MCUI.qMode(\'' + k + '\')">'
          + esc(k === "types" ? (C.lang() === "en" ? "Type" : "タイプ") : k === "weak" ? t("weakTo") : t("resistTo")) + "</button>").join("")
      + "</div>"
      + '<div class="chips" style="margin-bottom:10px">'
      + D.TK.map((k) => '<span class="chip ' + (Q[qMode].indexOf(k) >= 0 ? "on" : "") + '" onclick="MCUI.qType(\'' + k + '\')" '
          + 'style="' + (Q[qMode].indexOf(k) >= 0 ? "background:" + C.tcolor(k) : "") + '">' + esc(C.tname(k)) + "</span>").join("")
      + "</div>"

      + '<div class="card tight"><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
      + selBox(t("commonAbil"), "ability", [["", "—"]].concat(abilKeys.map((k) => [k, C.aname(k)])), Q.ability)
      + selBox(C.lang() === "en" ? "Role" : "役割", "role1", [["", "—"]].concat(D.ROLES.map((r) => [r.k, C.rname(r.k)])), Q.roles[0] || "")
      + selBox(C.lang() === "en" ? "Gen" : "世代", "gen", [["0", "—"]].concat([1,2,3,4,5,6,7,8,9].map((g) => [String(g), (C.lang()==="en"?"Gen ":"第")+g+(C.lang()==="en"?"":"世代")])), String(Q.gen))
      + selBox(t("sortBy"), "sort", [["usage", t("usage")], ["win", t("win")], ["trend", t("trend")],
          ["bst", C.lang()==="en"?"Base stat total":"種族値合計"], ["spe", C.lang()==="en"?"Speed":"素早さ"], ["name", C.lang()==="en"?"Name":"名前"]], Q.sort)
      + "</div>"
      + '<div class="btnrow"><button class="btn sm ghost" onclick="MCUI.qClear()">' + esc(t("clear")) + "</button>"
      + '<span class="note" style="margin-left:auto;align-self:center">' + list.length + " " + esc(t("result")) + "</span></div></div>"

      + '<div class="card">' + (list.length
          ? list.slice(0, 80).map((p) => pokeRow(p, usageRight(p))).join("")
          : '<div class="empty">' + icon("info",30) + '' + esc(t("none")) + "</div>") + "</div>";
  }
  function selBox(label, key, opts, val) {
    return '<label style="display:block"><div class="note" style="margin-bottom:3px">' + esc(label) + "</div>"
      + '<select onchange="MCUI.qSel(\'' + key + '\',this.value)" style="width:100%;min-height:36px;border-radius:10px;'
      + 'border:1.5px solid var(--line2);background:#fff;padding:0 8px;font-weight:800;font-size:12px">'
      + opts.map((o) => '<option value="' + esc(o[0]) + '" ' + (String(o[0]) === String(val) ? "selected" : "") + ">" + esc(o[1]) + "</option>").join("")
      + "</select></label>";
  }

  /* ══════════════════════════════════════════════════════════════
     ③ 対策（対策検索 ／ 3体選出 ／ 相手編成分析 ／ 対面）
     ══════════════════════════════════════════════════════════════ */
  let cTab = "counter";
  function counterTab(k) { cTab = k; renderCounter(); window.scrollTo(0, 0); }
  let cTarget = null;       /* 対策検索でえらんだ相手 */
  let duelA = null, duelB = null;
  function renderCounter() {
    const s = C.load();
    const tabs = '<div class="tabs">'
      + [["counter", t("counter")], ["sim", t("pickSim")], ["opp", t("oppAn")], ["duel", t("duel")]]
        .map((x) => '<button class="' + (cTab === x[0] ? "on" : "") + '" onclick="MCUI.counterTab(\'' + x[0] + '\')">' + esc(x[1]) + "</button>").join("")
      + "</div>";
    let body = "";
    if (cTab === "counter") body = counterBody();
    else if (cTab === "sim") body = simBody();
    else if (cTab === "opp") body = oppBody();
    else body = duelBody();
    $("#sc-counter").innerHTML = tabs + body;
  }
  function counterBody() {
    const p = cTarget ? D.BY_ID[cTarget] : null;
    let h = '<div class="card"><div class="note" style="margin-bottom:7px"><b>'
      + (C.lang() === "en" ? "Pick the Pokémon you want to beat" : "対策したいポケモンをえらぶ") + "</b></div>"
      + '<button class="btn" onclick="MCUI.pickPoke(function(id){MCUI.setTarget(id)})">'
      + (p ? esc(C.pname(p)) : (C.lang() === "en" ? "＋ Choose" : "＋ えらぶ")) + "</button></div>";
    if (!p) return h + '<div class="empty">' + icon("info",30) + ''
      + (C.lang() === "en" ? "Choose a Pokémon to see its counters." : "ポケモンをえらぶと、対策の候補がランキングで出ます。") + "</div>";
    const list = C.counters(p.id, null, 15);
    h += '<div class="card"><div class="dhead">' + avatar(p, "lg")
      + '<div><div class="nm">' + esc(C.pname(p)) + "</div>"
      + '<div style="display:flex;gap:5px;margin-top:4px">' + p.types.map((x) => typePill(x, true)).join("") + "</div></div></div>"
      + '<div class="note">' + esc(t("usage")) + " <b>" + p.usage.toFixed(1) + "%</b>　"
      + esc(t("win")) + " <b>" + p.win.toFixed(1) + "%</b>　" + trendTx(p.trend) + "</div></div>";
    h += '<div class="h">' + hIc('counter') + '' + esc(t("howToBeat")) + "</div>";
    h += list.map((x, i) => '<div class="card" onclick="MCUI.openPoke(\'' + x.p.id + '\')" style="cursor:pointer">'
      + '<div style="display:flex;align-items:center;gap:10px">'
      + '<span class="prank" style="margin:0"><b>#' + (i + 1) + "</b></span>"
      + avatar(x.p)
      + '<div style="min-width:0;flex:1"><div class="pnm">' + esc(C.pname(x.p)) + "</div>"
      + '<div class="pmeta">' + x.p.types.map((y) => typePill(y)).join("") + "</div></div>"
      + '<span class="prank"><b>' + Math.round(x.score) + "</b><i>" + esc(t("pts")) + "</i></span></div>"
      + x.reasons.slice(0, 3).map((r) => '<div class="reason"><span class="ri">✓</span><span>' + C.L(r) + "</span></div>").join("")
      + "</div>").join("");
    return h;
  }

  /* ── 3体選出シミュレーター ── */
  function slotGrid(ids, which) {
    let h = '<div class="slots6">';
    for (let i = 0; i < 6; i++) {
      const p = D.BY_ID[ids[i]];
      if (p) {
        h += '<div class="slot has"><button class="rm" onclick="event.stopPropagation();MCUI.slotDel(\'' + which + '\',' + i + ')">✕</button>'
          + '<div class="inner" onclick="MCUI.openPoke(\'' + p.id + '\')">' + avatar(p, "sm")
          + '<div class="nm">' + esc(C.pname(p)) + "</div>"
          + '<div style="display:flex;gap:2px">' + p.types.map((x) => typePill(x)).join("") + "</div></div></div>";
      } else {
        h += '<div class="slot" onclick="MCUI.slotAdd(\'' + which + '\')"><span class="plus">＋</span></div>';
      }
    }
    return h + "</div>";
  }
  function simBody() {
    const s = C.load();
    const mine = curMineIds();
    const opp = s.oppIds;
    let h = '<div class="card"><div class="h" style="margin:0 0 8px">' + hIc('team') + '' + esc(t("mineTeam"))
      + '<span class="more" onclick="MCUI.go(\'team\')">' + (C.lang() === "en" ? "Edit ›" : "編集 ›") + "</span></div>"
      + slotGrid(mine, "mine") + "</div>"
      + '<div class="card"><div class="h" style="margin:0 0 8px">' + hIc('opp') + '' + esc(t("oppTeam"))
      + '<span class="more" onclick="MCUI.clearOpp()">' + esc(t("resetAll")) + "</span></div>"
      + slotGrid(opp, "opp") + "</div>"
      + '<button class="btn pri" onclick="MCUI.runSim()">' + icon("bolt", 16) + " " + esc(t("run")) + "</button>";
    if (!mine.filter(Boolean).length || !opp.filter(Boolean).length) {
      h += '<div class="empty">' + icon("info",30) + ''
        + (C.lang() === "en" ? "Fill in both teams, then run the analysis."
                            : "両方の編成を入れて「選出分析」を押すと、最適な3体が出ます。") + "</div>";
    }
    h += '<div id="simOut"></div>';
    return h;
  }
  function curMineIds() {
    const s = C.load();
    const tm = s.curTeam ? C.getTeam(s.curTeam) : (s.myTeams[0] || null);
    return tm ? tm.ids.slice(0, 6) : [];
  }
  function runSim() {
    const s = C.load();
    const mine = curMineIds().filter(Boolean), opp = s.oppIds.filter(Boolean);
    const out = $("#simOut"); if (!out) return;
    if (!mine.length || !opp.length) return;
    const r = C.bestPicks(mine, opp);
    if (!r) return;
    /* 説明のために、どの相手だったかを控える */
    [r.balance, r.atk, r.def].forEach((ev) => { if (ev) ev.gridOpp = opp; });
    C.pushHistory(mine, opp, r.balance.ids, r.balance.score);
    out.innerHTML = '<div class="h">' + hIc('sim') + '' + esc(t("why")) + "</div>"
      + pickCard(r.balance, "recommended", "best")
      + pickCard(r.atk, "attacking", "atk")
      + pickCard(r.def, "stable", "def")
      + gridCard(r.balance, opp);
    out.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function pickCard(ev, labelKey, cls) {
    if (!ev) return "";
    const tagCls = cls === "atk" ? "atk" : cls === "def" ? "def" : "";
    const score = cls === "atk" ? ev.atkScore : cls === "def" ? ev.defScore : ev.score;
    return '<div class="pickcard ' + (cls === "best" ? "best" : "") + '">'
      + '<div class="pickhead"><span class="picktag ' + tagCls + '">' + esc(t(labelKey)) + "</span>"
      + '<span class="score" style="margin-left:auto"><b>' + score + '</b><i>/100</i></span></div>'
      + '<div class="pick3">' + ev.pick.map((p) =>
          '<div class="p3" onclick="MCUI.openPoke(\'' + p.id + '\')">' + avatar(p)
          + '<div class="nm">' + esc(C.pname(p)) + "</div>"
          + '<div style="display:flex;gap:2px;justify-content:center;margin-top:3px">' + p.types.map((x) => typePill(x)).join("") + "</div></div>").join("")
      + "</div>"
      + '<div style="display:flex;gap:10px;margin-top:9px;font-size:11px;color:var(--sub);font-weight:800">'
      + '<span>' + (C.lang() === "en" ? "Favored" : "有利") + ' <b style="color:var(--ok)">' + ev.winN + "</b></span>"
      + '<span>' + (C.lang() === "en" ? "Unfavored" : "不利") + ' <b style="color:var(--ng)">' + ev.loseN + "</b></span>"
      + '<span>' + esc(t("coverage")) + " <b>" + ev.hitN + "/" + (ev.gridOpp ? ev.gridOpp.length : 6) + "</b></span>"
      + "</div>"
      + C.pickReasons(ev).slice(0, 6).map((r) =>
          '<div class="reason ' + (r.kind === "warn" ? "warn" : r.kind === "cover" ? "cover" : "") + '">'
          + '<span class="ri">' + (r.kind === "warn" ? "!" : r.kind === "cover" ? "↔" : "✓") + "</span>"
          + "<span>" + C.L(r) + "</span></div>").join("")
      + "</div>";
  }
  function gridCard(ev, oppIds) {
    const opp = oppIds.map((i) => D.BY_ID[i]).filter(Boolean);
    let h = '<div class="h">' + hIc('duel') + ''
      + (C.lang() === "en" ? "Matchup grid" : "対面のはやみ表") + "</div>";
    h += '<div class="card"><div class="chartwrap"><table class="chart"><tr><th class="rowh"></th>'
      + opp.map((p) => '<th><div class="thh" title="' + esc(C.pname(p)) + '">' + avatar(p, "sm") + "</div></th>").join("") + "</tr>";
    ev.pick.forEach((mp, mi) => {
      h += '<tr><td class="rowlab"><div style="display:flex;align-items:center;gap:5px;padding:2px 6px 2px 2px">'
        + avatar(mp, "sm") + '<span style="font-size:10px;font-weight:900;white-space:nowrap">' + esc(C.pname(mp)) + "</span></div></td>";
      opp.forEach((op, oi) => {
        const m = ev.grid[mi][oi];
        const rk = C.RANK_TXT[m.rank];
        h += '<td><div class="cell" style="background:' + rk.c + '22;color:' + rk.c + '" '
          + 'onclick="MCUI.openDuel(\'' + mp.id + "','" + op.id + '\')" title="' + esc(C.L(rk)) + '">'
          + (m.score > 0 ? "+" : "") + m.score + "</div></td>";
      });
      h += "</tr>";
    });
    h += "</table></div>"
      + '<div class="chips" style="margin-top:8px">'
      + Object.keys(C.RANK_TXT).map((k) => '<span class="chip plain" style="color:' + C.RANK_TXT[k].c + '">'
          + esc(C.L(C.RANK_TXT[k])) + "</span>").join("")
      + "</div></div>";
    return h;
  }

  /* ── 相手編成分析 ── */
  function oppBody() {
    const s = C.load();
    const ids = s.oppIds.filter(Boolean);
    let h = '<div class="card"><div class="h" style="margin:0 0 8px">' + hIc('opp') + '' + esc(t("oppTeam"))
      + '<span class="more" onclick="MCUI.clearOpp()">' + esc(t("resetAll")) + "</span></div>"
      + slotGrid(s.oppIds, "opp") + "</div>";
    if (!ids.length) return h + '<div class="empty">' + icon("info",30) + ''
      + (C.lang() === "en" ? "Add the opponent's Pokémon to analyze their team."
                          : "相手のポケモンを入れると、チーム全体の弱点と有効な攻撃タイプが出ます。") + "</div>";
    const a = C.oppAnalysis(ids);
    const n = a.team.length;
    h += '<div class="h">' + hIc('fire') + '' + esc(t("effAtk")) + '</div><div class="card">'
      + a.hit.slice(0, 8).map((x) => '<div style="display:flex;align-items:center;gap:9px;padding:5px 0">'
          + typePill(x.t, true)
          + '<div class="bar" style="flex:1"><i style="width:' + Math.round(x.n / n * 100) + '%"></i></div>'
          + '<b style="font-family:\'Orbitron\',sans-serif;font-size:12px;min-width:42px;text-align:right">' + x.n + "/" + n + "</b></div>"
          + (x.n >= Math.ceil(n * 0.6) ? '<div class="note" style="margin:-2px 0 6px 4px">'
              + (C.lang() === "en" ? "Hits " + x.n + " of " + n + " super-effectively."
                                   : C.tname(x.t) + "タイプの攻撃が 相手" + n + "体中 " + x.n + "体に有効です。") + "</div>" : "")).join("")
      + "</div>";
    h += '<div class="h">' + hIc('info') + '' + esc(t("dangerMon")) + '</div><div class="card">'
      + a.danger.map((p) => pokeRow(p, usageRight(p))).join("") + "</div>";
    if (a.fast.length) {
      h += '<div class="h">' + hIc('bolt') + '' + esc(t("fastMon")) + '</div><div class="card">'
        + a.fast.map((p) => pokeRow(p, '<div class="prank"><b>' + p.base.spe + "</b><i>" + (C.lang() === "en" ? "Speed" : "素早さ") + "</i></div>")).join("") + "</div>";
    }
    h += '<div class="h">' + hIc('sim') + '' + (C.lang() === "en" ? "Their attacking types" : "相手の攻撃タイプの傾向") + "</div>"
      + '<div class="card"><div class="chips">'
      + a.theirOffList.slice(0, 10).map((x) => '<span class="chip plain" style="border-color:' + C.tcolor(x.t) + '">'
          + esc(C.tname(x.t)) + " ×" + x.n + "</span>").join("") + "</div></div>";
    return h;
  }

  /* ── 対面シミュレーター ── */
  function duelBody() {
    const a = duelA ? D.BY_ID[duelA] : null, b = duelB ? D.BY_ID[duelB] : null;
    let h = '<div class="card"><div style="display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:center">'
      + duelSlot(a, "A") + '<div style="font-weight:900;color:var(--sub)">VS</div>' + duelSlot(b, "B")
      + "</div></div>";
    if (!a || !b) return h + '<div class="empty">' + icon("info",30) + ''
      + (C.lang() === "en" ? "Pick one on each side." : "左右に1体ずつえらぶと、対面の評価が出ます。") + "</div>";
    const m = C.matchup(a, b), rk = C.RANK_TXT[m.rank];
    h += '<div class="card" style="text-align:center">'
      + '<div style="font-size:22px;font-weight:900;color:' + rk.c + '">' + esc(C.L(rk)) + "</div>"
      + '<div class="score" style="justify-content:center;color:' + rk.c + '"><b>' + (m.score > 0 ? "+" : "") + m.score + "</b></div>"
      + "</div>";
    h += '<div class="card"><div class="h" style="margin:0 0 8px">' + hIc('fire') + ''
      + (C.lang() === "en" ? "Reasons" : "評価の理由") + "</div>"
      + reason(m.off.mult >= 2, C.pname(a) + (C.lang() === "en"
          ? " hits with " + C.tname(m.off.type) + " for ×" + m.off.mult
          : " の " + C.tname(m.off.type) + " が ×" + m.off.mult + " で入る"))
      + reason(m.inc.mult >= 2, (C.lang() === "en"
          ? "Takes " + C.tname(m.inc.type) + " for ×" + m.inc.mult
          : "相手の " + C.tname(m.inc.type) + " を ×" + m.inc.mult + " で受ける"), true)
      + reason(m.inc.mult <= 0.5, (C.lang() === "en"
          ? "Resists " + C.tname(m.inc.type) + " (×" + m.inc.mult + ")"
          : "相手の " + C.tname(m.inc.type) + " を ×" + m.inc.mult + " に抑えられる"))
      + reason(true, (C.lang() === "en"
          ? (m.faster ? "Outspeeds" : "Is outsped") + " (" + a.base.spe + " vs " + b.base.spe + ")"
          : (m.faster ? "素早さで上をとれる" : "素早さで下をとられる") + "（" + a.base.spe + " / " + b.base.spe + "）"), !m.faster)
      + "</div>";
    /* 交代候補 */
    const s = C.load(); const mine = curMineIds().filter((x) => x && x !== a.id);
    if (mine.length) {
      const alt = mine.map((id) => ({ p: D.BY_ID[id], m: C.matchup(D.BY_ID[id], b) }))
        .filter((x) => x.p).sort((x, y) => y.m.score - x.m.score).slice(0, 3);
      h += '<div class="h">' + hIc('swap') + '' + (C.lang() === "en" ? "Switch options" : "交代候補") + '</div><div class="card">'
        + alt.map((x) => pokeRow(x.p, '<div class="prank"><b style="color:' + C.RANK_TXT[x.m.rank].c + '">'
            + (x.m.score > 0 ? "+" : "") + x.m.score + '</b><i>' + esc(C.L(C.RANK_TXT[x.m.rank])) + "</i></div>")).join("") + "</div>";
    }
    return h;
  }
  function duelSlot(p, side) {
    return '<div class="slot has" style="aspect-ratio:auto;padding:12px 6px" onclick="MCUI.pickPoke(function(id){MCUI.setDuel(\'' + side + '\',id)})">'
      + (p ? '<div class="inner">' + avatar(p) + '<div class="nm">' + esc(C.pname(p)) + "</div></div>"
           : '<span class="plus">＋</span>') + "</div>";
  }
  function reason(cond, tx, warn) {
    if (!cond) return "";
    return '<div class="reason ' + (warn ? "warn" : "") + '"><span class="ri">' + (warn ? "!" : "✓") + "</span><span>" + esc(tx) + "</span></div>";
  }

  /* ══════════════════════════════════════════════════════════════
     ④ 編成（マイ編成 ＋ 編成分析）
     ══════════════════════════════════════════════════════════════ */
  function renderTeam() {
    const s = C.load();
    if (!s.myTeams.length) C.newTeam();
    const tm = C.getTeam(s.curTeam) || s.myTeams[0];
    s.curTeam = tm.id;
    let h = '<div class="card tight"><div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:2px">'
      + s.myTeams.map((x) => '<span class="chip ' + (x.id === tm.id ? "on" : "") + '" onclick="MCUI.selTeam(\'' + x.id + '\')">'
          + (x.fav ? "⭐ " : "") + esc(x.name) + "</span>").join("")
      + '<span class="chip" onclick="MCUI.addTeam()">＋ ' + esc(t("newTeam")) + "</span></div></div>";

    h += '<div class="card">'
      + '<input value="' + esc(tm.name) + '" oninput="MCUI.teamName(this.value)" '
      + 'style="width:100%;border:0;border-bottom:2px solid var(--line);background:none;font-size:16px;font-weight:900;padding:4px 0;outline:0">'
      + '<div style="margin:10px 0">' + slotGrid(tm.ids, "team") + "</div>"
      + '<textarea placeholder="' + esc(t("memo")) + '" oninput="MCUI.teamMemo(this.value)" rows="2" '
      + 'style="width:100%;border:1.5px solid var(--line);border-radius:11px;padding:8px;font-size:12px;resize:vertical">'
      + esc(tm.memo || "") + "</textarea>"
      + '<div class="btnrow"><button class="btn sm ' + (tm.fav ? "pri" : "") + '" onclick="MCUI.teamFav()">⭐ ' + esc(t("favs")) + "</button>"
      + '<button class="btn sm ng" onclick="MCUI.delTeam()">' + esc(t("del")) + "</button></div></div>";

    const ids = tm.ids.filter(Boolean);
    if (!ids.length) return void ($("#sc-team").innerHTML = h + '<div class="empty">' + icon("info",30) + ''
      + (C.lang() === "en" ? "Add up to 6 Pokémon to analyze this team." : "6体まで入れると、チーム全体の分析が出ます。") + "</div>");

    const a = C.teamAnalysis(ids);
    /* 弱点・耐性の一覧 */
    h += '<div class="h">' + hIc('counter') + '' + esc(t("balance")) + '</div><div class="card">'
      + '<div class="chartwrap"><table class="chart" style="min-width:0;width:100%"><tr>'
      + D.TK.map((k) => '<th><div class="thh" style="background:' + C.tcolor(k) + ';color:#fff;border-radius:5px;font-size:8px;padding:0 1px">'
          + esc(C.tname(k).slice(0, 2)) + "</div></th>").join("") + "</tr><tr>"
      + D.TK.map((k) => {
          const w = a.weak[k].length, r = a.resist[k].length, im = a.immune[k].length;
          const cls = w >= 3 ? "m4" : w === 2 ? "m2" : w === 1 ? "m1" : (im ? "m0" : r ? "m50" : "m1");
          const tx = w ? "+" + w : (im ? "0" : r ? "-" + r : "・");
          return '<td><div class="cell mx ' + cls + '" style="width:auto;border-radius:5px">' + tx + "</div></td>";
        }).join("") + "</tr></table></div>"
      + '<div class="note" style="margin-top:7px">'
      + (C.lang() === "en" ? "+n = number weak to it, -n = number resisting it, 0 = immune"
                          : "＋n＝そのタイプが弱点の数／−n＝半減できる数／0＝無効") + "</div></div>";

    if (a.common.length) {
      h += '<div class="h">' + hIc('info') + '' + esc(t("commonWeak")) + '</div><div class="card">'
        + a.common.slice(0, 6).map((k) => '<div style="display:flex;align-items:center;gap:9px;padding:5px 0">'
            + typePill(k, true)
            + '<div class="bar r" style="flex:1"><i style="width:' + Math.round(a.weak[k].length / ids.length * 100) + '%"></i></div>'
            + '<b style="font-size:12px;min-width:80px;text-align:right">'
            + (C.lang() === "en" ? a.weak[k].length + " weak" : a.weak[k].length + "体が弱点") + "</b></div>"
            + '<div class="note" style="margin:-2px 0 7px 4px">' + a.weak[k].map((p) => esc(C.pname(p))).join("・") + "</div>").join("")
        + "</div>";
    }
    h += '<div class="h">' + hIc('fire') + '' + esc(t("coverage")) + '</div><div class="card">'
      + '<div class="chips" style="margin-bottom:8px">' + a.offense.map((k) => typePill(k, true)).join("") + "</div>"
      + '<div class="note">' + (C.lang() === "en"
          ? "Hits <b>" + a.coverage.covered + " / " + a.coverage.total + "</b> of the top-30 meta Pokémon super-effectively."
          : "環境上位30体のうち <b>" + a.coverage.covered + " / " + a.coverage.total + "体</b> に こうかばつぐん を出せます。") + "</div>"
      + (a.coverage.missed.length ? '<div class="note" style="margin-top:5px">'
          + (C.lang() === "en" ? "Not covered: " : "手が届かない相手：")
          + a.coverage.missed.slice(0, 8).map((p) => esc(C.pname(p))).join("・") + "</div>" : "")
      + "</div>";
    h += '<div class="h">' + hIc('team') + '' + esc(t("roleBias")) + '</div><div class="card"><div class="chips">'
      + D.ROLES.map((r) => '<span class="chip plain" style="' + (a.roleN[r.k] ? "" : "opacity:.45") + '">'
          + esc(C.rname(r.k)) + " ×" + (a.roleN[r.k] || 0) + "</span>").join("") + "</div></div>";
    const sug = C.suggestForTeam(ids, 6);
    if (sug.length) {
      h += '<div class="h">' + hIc('star') + '' + esc(t("suggest")) + "</div>"
        + sug.map((x) => '<div class="card" onclick="MCUI.openPoke(\'' + x.p.id + '\')" style="cursor:pointer">'
            + '<div style="display:flex;align-items:center;gap:10px">' + avatar(x.p)
            + '<div style="min-width:0;flex:1"><div class="pnm">' + esc(C.pname(x.p)) + "</div>"
            + '<div class="pmeta">' + x.p.types.map((y) => typePill(y)).join("") + "</div></div></div>"
            + x.why.slice(0, 3).map((w) => '<div class="reason"><span class="ri">＋</span><span>' + C.L(w) + "</span></div>").join("")
            + "</div>").join("");
    }
    $("#sc-team").innerHTML = h;
  }

  /* ══════════════════════════════════════════════════════════════
     ⑤ ランキング
     ══════════════════════════════════════════════════════════════ */
  let rKind = "usage";
  function renderRank() {
    const s = C.load();
    const kinds = [["usage", t("usage")], ["win", t("win")], ["rise", t("rise")], ["fall", t("fall")], ["hot", t("hot")]];
    const list = C.ranking(rKind, 50);
    $("#sc-rank").innerHTML = ''
      + '<div class="tabs" style="overflow-x:auto">' + kinds.map((k) =>
          '<button class="' + (rKind === k[0] ? "on" : "") + '" style="white-space:nowrap;padding:0 10px" onclick="MCUI.setRank(\'' + k[0] + '\')">'
          + esc(k[1]) + "</button>").join("") + "</div>"
      + '<div class="card tight"><div style="display:flex;gap:6px;flex-wrap:wrap">'
      + [["double", C.lang() === "en" ? "Doubles" : "ダブル"], ["single", C.lang() === "en" ? "Singles" : "シングル"]].map((r) =>
          '<span class="chip ' + (s.rule === r[0] ? "on" : "") + '" onclick="MCUI.setRule(\'' + r[0] + '\')">' + esc(r[1]) + "</span>").join("")
      + ["7d", "30d", "all"].map((p) => '<span class="chip ' + (s.period === p ? "on" : "") + '" onclick="MCUI.setPeriod(\'' + p + '\')">'
          + esc(p === "7d" ? (C.lang() === "en" ? "7 days" : "7日") : p === "30d" ? (C.lang() === "en" ? "30 days" : "30日") : (C.lang() === "en" ? "All" : "全期間")) + "</span>").join("")
      + "</div></div>"
      + '<div class="card">' + list.map((p, i) => pokeRow(p,
          '<div class="prank"><b>' + (rKind === "win" ? p.win.toFixed(1) + "%" : rKind === "rise" || rKind === "fall" ? (p.trend > 0 ? "+" : "") + p.trend.toFixed(1) : p.usage.toFixed(1) + "%")
          + '</b><i>#' + (i + 1) + "</i></div>")).join("") + "</div>"
      + metaCard();
  }

  /* ══════════════════════════════════════════════════════════════
     ⑥ モーダル（ポケモン詳細・タイプ表・選ぶ・編成一覧・履歴）
     ══════════════════════════════════════════════════════════════ */
  function openModal(html) {
    $("#modalCard").innerHTML = '<div class="mgrip"></div><button class="mclose" onclick="MCUI.closeModal()">✕</button>' + html;
    $("#modal").classList.add("on");
    $("#modalCard").scrollTop = 0;
  }
  function closeModal() { $("#modal").classList.remove("on"); pickCb = null; }

  function openPoke(id) {
    const p = D.BY_ID[id]; if (!p) return;
    C.touchRecent(id);
    const s = C.load();
    const abil = (p.abilities || [])[0];
    const tbl = C.defenseTable(p, abil);
    const groups = { 4: [], 2: [], 1: [], 0.5: [], 0.25: [], 0: [] };
    D.TK.forEach((k) => { (groups[tbl[k]] || (groups[tbl[k]] = [])).push(k); });
    const offT = C.offenseTypes(p);
    const good = C.counters(p.id, null, 5);              /* この子に強い子＝苦手な相手 */
    const partners = C.partners(p.id, 5);
    /* 有利な相手＝環境上位のうち、この子が有利をとれる子 */
    const meta = D.DEX.slice().sort((a, b) => b.usage - a.usage).slice(0, 40);
    const goodVs = meta.map((q) => ({ p: q, m: C.matchup(p, q) }))
      .filter((x) => x.p.id !== p.id && x.m.score >= 15).sort((a, b) => b.m.score - a.m.score).slice(0, 5);

    let h = '<div class="dhead">' + avatar(p, "lg")
      + '<div style="min-width:0"><div class="no">No.' + (D.DEX.indexOf(p) + 1) + " ／ "
      + (C.lang() === "en" ? "Gen " + p.gen : "第" + p.gen + "世代") + "</div>"
      + '<div class="nm">' + esc(C.pname(p)) + "</div>"
      + '<div style="display:flex;gap:5px;margin-top:5px">' + p.types.map((x) => typePill(x, true)).join("") + "</div></div>"
      + '<button class="tbtn ' + (s.favs.indexOf(id) >= 0 ? "on" : "") + '" style="margin-left:auto" onclick="MCUI.fav(\'' + id + '\')">⭐</button></div>';

    h += '<div class="card"><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center">'
      + kpi(t("usage"), p.usage.toFixed(1) + "%")
      + kpi(t("win"), p.win.toFixed(1) + "%")
      + kpi(t("trend"), trendTx(p.trend))
      + "</div>"
      + '<div style="margin-top:9px" class="stats">'
      + [["HP", "hp"], [C.lang() === "en" ? "Atk" : "こうげき", "atk"], [C.lang() === "en" ? "Def" : "ぼうぎょ", "def"],
         [C.lang() === "en" ? "Sp.Atk" : "とくこう", "spa"], [C.lang() === "en" ? "Sp.Def" : "とくぼう", "spd"],
         [C.lang() === "en" ? "Speed" : "すばやさ", "spe"]].map((x) =>
          '<span class="k">' + esc(x[0]) + '</span><span class="bar"><i style="width:' + Math.min(100, p.base[x[1]] / 200 * 100) + '%"></i></span>'
          + '<span class="v">' + p.base[x[1]] + "</span>").join("")
      + '<span class="k">' + (C.lang() === "en" ? "Total" : "合計") + '</span><span></span><span class="v">' + p.bst + "</span>"
      + "</div></div>";

    h += '<div class="btnrow"><button class="btn sm pri" onclick="MCUI.addToMine(\'' + id + '\')">＋ ' + esc(t("addMine")) + "</button>"
      + '<button class="btn sm" onclick="MCUI.addToOpp(\'' + id + '\')">＋ ' + esc(t("addOpp")) + "</button></div>";

    h += '<div class="h">' + hIc('counter') + '' + esc(t("defTable")) + '</div><div class="card">'
      + [[4, t("weakTo")], [2, t("weakTo")], [0.5, t("resistTo")], [0.25, t("resistTo")], [0, t("immuneTo")]]
        .filter((g) => (groups[g[0]] || []).length)
        .map((g) => '<div style="display:flex;gap:8px;align-items:flex-start;padding:5px 0">'
          + '<span class="mx ' + multCls(g[0]) + '">' + multTx(g[0]) + "</span>"
          + '<div class="chips" style="flex:1">' + groups[g[0]].map((k) => typePill(k)).join("") + "</div></div>").join("")
      + (abil && D.ABIL[abil] && D.ABIL[abil].eff ? '<div class="note" style="margin-top:6px">'
          + (C.lang() === "en" ? "Calculated with " : "特性 ") + "<b>" + esc(C.aname(abil)) + "</b>"
          + (C.lang() === "en" ? "" : " を考えた数字です") + "</div>" : "")
      + "</div>";

    h += '<div class="h">' + hIc('fire') + '' + esc(t("offTable")) + '</div><div class="card">'
      + '<div class="chips" style="margin-bottom:8px">' + offT.map((k) => typePill(k, true)).join("") + "</div>"
      + '<div class="note">' + (C.lang() === "en"
          ? "Super-effective against: " : "こうかばつぐんを出せる相手のタイプ：")
      + D.TK.filter((k) => offT.some((o) => C.eff(o, [k]) >= 2)).map((k) => esc(C.tname(k))).join("・") + "</div></div>";

    if (goodVs.length) {
      h += '<div class="h">' + hIc('check') + '' + esc(t("goodVs")) + '</div><div class="card">'
        + goodVs.map((x) => pokeRow(x.p, '<div class="prank"><b style="color:' + C.RANK_TXT[x.m.rank].c + '">+' + x.m.score + "</b></div>")).join("") + "</div>";
    }
    h += '<div class="h">' + hIc('info') + '' + esc(t("badVs")) + " / " + esc(t("checked")) + '</div><div class="card">'
      + good.map((x) => pokeRow(x.p, '<div class="prank"><b style="color:var(--ng)">' + Math.round(x.score) + "</b><i>" + esc(t("pts")) + "</i></div>")).join("") + "</div>";

    h += '<div class="h">' + hIc('team') + '' + esc(t("commonMoves")) + " / " + esc(t("commonAbil")) + " / " + esc(t("commonItem")) + "</div>"
      + '<div class="card"><div class="note" style="margin-bottom:4px"><b>' + esc(t("commonMoves")) + "</b></div>"
      + '<div class="chips" style="margin-bottom:9px">' + (p.moves || []).map((m) => {
          const mv = D.MOVES[m];
          return '<span class="chip plain"' + (mv ? ' style="border-color:' + C.tcolor(mv.t) + '"' : "") + ">"
            + esc(C.mname(m)) + (mv && mv.p ? " " + mv.p : "") + "</span>";
        }).join("") + "</div>"
      + '<div class="note" style="margin-bottom:4px"><b>' + esc(t("commonAbil")) + "</b></div>"
      + '<div class="chips" style="margin-bottom:9px">' + (p.abilities || []).map((k) =>
          '<span class="chip plain" title="' + esc(D.ABIL[k] ? C.L(D.ABIL[k].d) : "") + '">' + esc(C.aname(k)) + "</span>").join("") + "</div>"
      + (p.abilities || []).filter((k) => D.ABIL[k] && D.ABIL[k].d).map((k) =>
          '<div class="note" style="margin-bottom:3px">・<b>' + esc(C.aname(k)) + "</b>：" + esc(C.L(D.ABIL[k].d)) + "</div>").join("")
      + '<div class="note" style="margin:8px 0 4px"><b>' + esc(t("commonItem")) + "</b></div>"
      + '<div class="chips">' + (p.items || []).map((k) => '<span class="chip plain">' + esc(C.iname(k)) + "</span>").join("") + "</div></div>";

    if (partners.length) {
      h += '<div class="h">' + hIc('swap') + '' + esc(t("partners")) + '</div><div class="card">'
        + partners.map((x) => pokeRow(x.p, "")).join("") + "</div>";
    }
    h += '<div class="h">' + hIc('team') + '' + (C.lang() === "en" ? "Roles" : "役割") + "</div>"
      + '<div class="card"><div class="chips">' + (p.roles || []).map((r) => '<span class="chip plain">' + esc(C.rname(r)) + "</span>").join("") + "</div></div>";
    openModal(h);
  }
  function kpi(k, v) {
    return '<div><div class="note">' + esc(k) + '</div><div style="font-family:\'Orbitron\',sans-serif;font-weight:900;font-size:16px">' + v + "</div></div>";
  }

  /* ── タイプ相性一覧 ── */
  let chartSide = "atk", chartSel = [];
  function openChart() {
    let h = '<div class="h" style="margin-top:4px">' + hIc('chart') + '' + esc(t("typechart")) + "</div>"
      + '<div class="tabs">'
      + ['<button class="' + (chartSide === "atk" ? "on" : "") + '" onclick="MCUI.chartSide(\'atk\')">' + esc(t("atkSide")) + "</button>",
         '<button class="' + (chartSide === "def" ? "on" : "") + '" onclick="MCUI.chartSide(\'def\')">' + esc(t("defSide")) + "</button>"].join("")
      + "</div>"
      + '<div class="card tight"><div class="note" style="margin-bottom:6px"><b>' + esc(t("dual")) + "</b>　" + esc(t("pick2")) + "</div>"
      + '<div class="chips">' + D.TK.map((k) => '<span class="chip ' + (chartSel.indexOf(k) >= 0 ? "on" : "") + '" '
          + 'style="' + (chartSel.indexOf(k) >= 0 ? "background:" + C.tcolor(k) : "") + '" onclick="MCUI.chartPick(\'' + k + '\')">'
          + esc(C.tname(k)) + "</span>").join("") + "</div>";
    if (chartSel.length) {
      h += '<div style="margin-top:10px">';
      if (chartSide === "def") {
        h += '<div class="note" style="margin-bottom:5px">' + chartSel.map(C.tname).join(" / ") + " " + esc(t("against")) + "</div>"
          + '<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:5px">'
          + D.TK.map((k) => { const m = C.eff(k, chartSel);
              return '<div style="text-align:center"><div class="tt" style="background:' + C.tcolor(k) + ';width:100%;margin-bottom:2px">'
                + esc(C.tname(k).slice(0, 3)) + '</div><div class="mx ' + multCls(m) + '" style="width:100%">' + multTx(m) + "</div></div>";
            }).join("") + "</div>";
      } else {
        h += '<div class="note" style="margin-bottom:5px">' + chartSel.map(C.tname).join(" / ") + " " + esc(t("against")) + "</div>"
          + '<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:5px">'
          + D.TK.map((k) => { const m = Math.max.apply(null, chartSel.map((a) => C.eff(a, [k])));
              return '<div style="text-align:center"><div class="tt" style="background:' + C.tcolor(k) + ';width:100%;margin-bottom:2px">'
                + esc(C.tname(k).slice(0, 3)) + '</div><div class="mx ' + multCls(m) + '" style="width:100%">' + multTx(m) + "</div></div>";
            }).join("") + "</div>";
      }
      /* そのタイプに弱い／強いポケモンをさがす */
      const found = chartSide === "def"
        ? D.DEX.filter((p) => chartSel.every((k) => C.eff(k, p.types) >= 2)).sort((a, b) => b.usage - a.usage).slice(0, 10)
        : D.DEX.filter((p) => chartSel.some((k) => C.eff(k, p.types) >= 2)).sort((a, b) => b.usage - a.usage).slice(0, 10);
      h += '<div class="note" style="margin:10px 0 4px"><b>'
        + (C.lang() === "en" ? "Pokémon hit super-effectively" : "このタイプに弱いポケモン") + "</b></div>"
        + found.map((p) => miniRow(p)).join("");
      h += "</div>";
    }
    h += "</div>";
    /* 18×18 の表 */
    h += '<div class="card"><div class="chartwrap"><table class="chart">'
      + "<tr><th class=\"rowh\"><div class=\"thh\" style=\"font-size:8px;color:var(--sub)\">"
      + (chartSide === "atk" ? "攻\\守" : "守\\攻") + "</div></th>"
      + D.TK.map((k) => '<th><div class="thh" style="background:' + C.tcolor(k) + ';color:#fff;font-size:8px">'
          + esc(C.tname(k).slice(0, 2)) + "</div></th>").join("") + "</tr>"
      + D.TK.map((r) => '<tr><td class="rowlab"><div class="tt" style="background:' + C.tcolor(r) + ';margin:2px 4px 2px 2px;min-width:44px">'
          + esc(C.tname(r)) + "</div></td>"
          + D.TK.map((c2) => { const m = chartSide === "atk" ? D.CHART[r][c2] : D.CHART[c2][r];
              return '<td><div class="cell mx ' + multCls(m) + '" style="border-radius:0">' + (m === 1 ? "" : multTx(m)) + "</div></td>";
            }).join("") + "</tr>").join("")
      + "</table></div></div>";
    openModal(h);
  }

  /* ── ポケモンを選ぶ ── */
  let pickCb = null, pickText = "";
  function pickPoke(cb) { pickCb = cb; pickText = ""; drawPick(); }
  function drawPick() {
    const list = C.search({ text: pickText, sort: "usage" }).slice(0, 60);
    openModal('<div class="searchbar" style="margin:4px 0 10px"><span class="si">' + icon("search", 18) + '</span>'
      + '<input id="pkText" placeholder="' + esc(t("searchPh")) + '" value="' + esc(pickText) + '" oninput="MCUI.pickText(this.value)"></div>'
      + '<div class="card">' + list.map((p) =>
          '<div class="prow" onclick="MCUI.pickDone(\'' + p.id + '\')">' + avatar(p)
          + '<div style="min-width:0;flex:1"><div class="pnm">' + esc(C.pname(p)) + "</div>"
          + '<div class="pmeta">' + p.types.map((x) => typePill(x)).join("") + "</div></div>"
          + usageRight(p) + "</div>").join("") + "</div>");
    const e = $("#pkText"); if (e) { e.focus(); try { e.setSelectionRange(e.value.length, e.value.length); } catch (x) {} }
  }

  /* ── 人気編成の一覧・詳細 ── */
  function openTeams() {
    openModal('<div class="h" style="margin-top:4px">' + hIc('team') + '' + esc(t("popTeams")) + "</div>"
      + D.TEAMS.map(teamCard).join(""));
  }
  function openTeam(id) {
    const tm = D.TEAMS.find((x) => x.id === id); if (!tm) return;
    const ids = tm.ids.filter((i) => D.BY_ID[i]);
    const a = C.teamAnalysis(ids);
    openModal('<div class="h" style="margin-top:4px">' + hIc('team') + '' + esc(C.L({ ja: tm.ja, en: tm.en })) + "</div>"
      + '<div class="card"><div style="display:flex;gap:14px;margin-bottom:9px">'
      + kpi(t("usage"), tm.usage.toFixed(1) + "%") + kpi(t("win"), tm.win.toFixed(1) + "%") + "</div>"
      + ids.map((i) => pokeRow(D.BY_ID[i], usageRight(D.BY_ID[i]))).join("") + "</div>"
      + '<div class="card"><div class="reason"><span class="ri">✓</span><span>' + C.L(tm.strong) + "</span></div>"
      + '<div class="reason warn"><span class="ri">!</span><span>' + C.L(tm.weak) + "</span></div></div>"
      + '<div class="h">' + hIc('counter') + '' + esc(t("commonWeak")) + '</div><div class="card">'
      + (a.common.length ? '<div class="chips">' + a.common.map((k) => typePill(k, true)).join("") + "</div>"
                         : '<div class="note">' + (C.lang() === "en" ? "No shared weakness." : "共通の弱点はありません。") + "</div>") + "</div>"
      + '<div class="h">' + hIc('fire') + '' + esc(t("coverage")) + '</div><div class="card"><div class="chips">'
      + a.offense.map((k) => typePill(k, true)).join("") + "</div></div>"
      + '<button class="btn pri" onclick="MCUI.copyTeam(\'' + id + '\')">＋ '
      + (C.lang() === "en" ? "Copy into my teams" : "マイ編成に写す") + "</button>");
  }

  /* ── 履歴 ── */
  function openHistory() {
    const s = C.load();
    if (!s.history.length) return openModal('<div class="empty">' + icon("info",30) + '' + esc(t("none")) + "</div>");
    openModal('<div class="h" style="margin-top:4px">' + hIc('history') + '' + esc(t("history")) + "</div>"
      + s.history.map((hh) => {
          const pick = hh.pick.map((i) => D.BY_ID[i]).filter(Boolean);
          const opp = hh.opp.map((i) => D.BY_ID[i]).filter(Boolean);
          const dt = new Date(hh.at);
          return '<div class="card"><div class="note" style="margin-bottom:6px">'
            + dt.toLocaleString() + '　<b>' + hh.score + esc(t("pts")) + "</b></div>"
            + '<div class="note" style="margin-bottom:3px">' + (C.lang() === "en" ? "Picked" : "選出") + "</div>"
            + '<div style="display:flex;gap:5px;margin-bottom:7px">' + pick.map((p) => avatar(p, "sm")).join("") + "</div>"
            + '<div class="note" style="margin-bottom:3px">' + (C.lang() === "en" ? "Opponent" : "相手") + "</div>"
            + '<div style="display:flex;gap:5px;flex-wrap:wrap">' + opp.map((p) => avatar(p, "sm")).join("") + "</div>"
            + '<div class="btnrow"><button class="btn sm" onclick="MCUI.reuseOpp(' + JSON.stringify(hh.opp).replace(/"/g, "&quot;") + ')">'
            + (C.lang() === "en" ? "Load this opponent" : "この相手をもう一度") + "</button></div></div>";
        }).join(""));
  }

  /* ══════════════════════════════════════════════════════════════
     ⑦ 操作
     ══════════════════════════════════════════════════════════════ */
  let slotWhich = null;
  const API = {
    go, counterTab, closeModal, openPoke, openChart, openTeams, openTeam, openHistory, pickPoke,
    setRank(k) { rKind = k; renderRank(); },
    setRule(v) { C.load().rule = v; C.save(); renderRank(); },
    setPeriod(v) { C.load().period = v; C.save(); renderRank(); },
    qSet(k, v) { Q[k] = v; renderSearch(); const e = $("#qText"); if (e) { e.focus(); try { e.setSelectionRange(e.value.length, e.value.length); } catch (x) {} } },
    qMode(k) { qMode = k; renderSearch(); },
    qType(k) { const a = Q[qMode]; const i = a.indexOf(k); if (i >= 0) a.splice(i, 1); else a.push(k); renderSearch(); },
    qSel(k, v) {
      if (k === "role1") Q.roles = v ? [v] : [];
      else if (k === "gen") Q.gen = parseInt(v, 10) || 0;
      else Q[k] = v;
      renderSearch();
    },
    qClear() { Q = { text: "", types: [], weak: [], resist: [], ability: "", roles: [], gen: 0, usageMin: 0, sort: "usage" }; renderSearch(); },
    setTarget(id) { cTarget = id; closeModal(); renderCounter(); },
    setDuel(side, id) { if (side === "A") duelA = id; else duelB = id; closeModal(); renderCounter(); },
    openDuel(a, b) { duelA = a; duelB = b; cTab = "duel"; renderCounter(); window.scrollTo(0, 0); },
    pickText(v) { pickText = v; drawPick(); },
    pickDone(id) { const cb = pickCb; closeModal(); if (cb) cb(id); },
    slotAdd(which) { slotWhich = which; pickPoke((id) => API.slotSet(which, id)); },
    slotSet(which, id) {
      const s = C.load();
      if (which === "opp") { if (s.oppIds.length < 6 && s.oppIds.indexOf(id) < 0) s.oppIds.push(id); }
      else {
        const tm = C.getTeam(s.curTeam) || s.myTeams[0];
        if (tm && tm.ids.length < 6 && tm.ids.indexOf(id) < 0) tm.ids.push(id);
      }
      C.save(); render(cur);
    },
    slotDel(which, i) {
      const s = C.load();
      if (which === "opp") s.oppIds.splice(i, 1);
      else { const tm = C.getTeam(s.curTeam) || s.myTeams[0]; if (tm) tm.ids.splice(i, 1); }
      C.save(); render(cur);
    },
    clearOpp() { C.load().oppIds = []; C.save(); render(cur); },
    reuseOpp(ids) { C.load().oppIds = ids.slice(0, 6); C.save(); closeModal(); go("counter"); counterTab("sim"); },
    runSim,
    addToMine(id) { API.slotSet("team", id); closeModal(); go("team"); },
    addToOpp(id) { API.slotSet("opp", id); closeModal(); go("counter"); counterTab("sim"); },
    fav(id) { C.toggleFav(id); openPoke(id); },
    selTeam(id) { C.load().curTeam = id; C.save(); renderTeam(); },
    addTeam() { C.newTeam(); renderTeam(); },
    teamName(v) { const tm = C.getTeam(C.load().curTeam); if (tm) { tm.name = v; C.save(); } },
    teamMemo(v) { const tm = C.getTeam(C.load().curTeam); if (tm) { tm.memo = v; C.save(); } },
    teamFav() { const tm = C.getTeam(C.load().curTeam); if (tm) { tm.fav = !tm.fav; C.save(); renderTeam(); } },
    delTeam() {
      const s = C.load(); if (s.myTeams.length <= 1) return;
      if (!confirm(C.lang() === "en" ? "Delete this team?" : "この編成を削除しますか？")) return;
      C.delTeam(s.curTeam); renderTeam();
    },
    copyTeam(id) {
      const tm = D.TEAMS.find((x) => x.id === id); if (!tm) return;
      const nid = C.newTeam(C.L({ ja: tm.ja, en: tm.en }));
      const t2 = C.getTeam(nid); t2.ids = tm.ids.filter((i) => D.BY_ID[i]).slice(0, 6);
      C.save(); closeModal(); go("team");
    },
    chartSide(v) { chartSide = v; openChart(); },
    chartPick(k) { const i = chartSel.indexOf(k); if (i >= 0) chartSel.splice(i, 1); else { if (chartSel.length >= 2) chartSel.shift(); chartSel.push(k); } openChart(); },
    toggleLang() {
      C.setLang(C.lang() === "en" ? "ja" : "en");
      document.documentElement.lang = C.lang();
      paintTop(); render(cur);
    },
    /* ══ ★★ 2026-09-08 「情報の更新はいつ？」への答え ══
       このアプリは次の<b>4つのとき</b>に環境データを取りに行く。
         ① 起動したとき
         ② オンラインに戻ったとき（online イベント）
         ③ アプリを再び前面に出し、前回から STALE_MS を過ぎているとき
         ④ 画面上の「更新」を押したとき（手動）
       ★ 取りに行く先は data/meta.json。Service Worker で<b>ネットワーク優先</b>に
         してあるので、オンラインなら必ず新しいものが当たる。 */
    refreshMeta(manual) {
      return C.meta.refresh().then((ok) => {
        if (ok) { if (manual) toast(t("updated")); render(cur); }
        else if (manual) toast(navigator.onLine ? t("noUpdate") : t("offline"));
        return ok;
      });
    },
  };
  window.MCUI = API;

  /* ── トースト ── */
  function toast(tx) {
    let e = $("#mcToast");
    if (!e) {
      e = document.createElement("div"); e.id = "mcToast";
      e.style.cssText = "position:fixed;left:50%;transform:translateX(-50%);bottom:calc(var(--navh) + 22px);"
        + "z-index:95;background:#12233d;color:#fff;font-size:12px;font-weight:800;padding:9px 16px;border-radius:99px;"
        + "box-shadow:0 10px 26px rgba(10,26,48,.34);opacity:0;transition:opacity .2s";
      document.body.appendChild(e);
    }
    e.textContent = tx; e.style.opacity = "1";
    clearTimeout(e._t); e._t = setTimeout(() => { e.style.opacity = "0"; }, 2200);
  }

  /* ── 上のバーと下のナビ ── */
  function paintTop() {
    $("#topSub").textContent = C.L(T.tagline);
    $("#langBtn").textContent = t("lang");
    /* ★★ 2026-09-08 ナビの絵も自前の SVG（mc-icons.js）にした。 */
    const N = ["home", "search", "counter", "team", "rank"];
    $("#nav").innerHTML = N.map((k) => '<button data-go="' + k + '" onclick="MCUI.go(\'' + k + '\')">'
      + '<span class="ni">' + icon(k, 23) + '</span><span>' + esc(t(k)) + "</span></button>").join("");
    $$("#nav button").forEach((b) => b.classList.toggle("on", b.dataset.go === cur));
  }

  /* これだけ時間がたっていたら「古い」とみなして取りなおす（30分） */
  const STALE_MS = 30 * 60 * 1000;
  /* ── 起動 ── */
  function boot() {
    document.documentElement.lang = C.lang();
    C.meta.applyStored();
    paintTop();
    go("home");
    /* オンラインに戻ったら環境データを取りに行く */
    const setOff = () => $("#offbar").classList.toggle("on", !navigator.onLine);
    setOff();
    window.addEventListener("online", () => { setOff(); API.refreshMeta(); });
    window.addEventListener("offline", setOff);
    if (navigator.onLine) API.refreshMeta();
    /* ★★ 2026-09-08 アプリを再び前面に出したときも、古ければ取りに行く。
       スマホはアプリを閉じずに何日も開きっばなしにするので、
       「起動のときだけ」だといつまでも古い数字のままになる。 */
    document.addEventListener("visibilitychange", () => {
      if (document.hidden || !navigator.onLine) return;
      if (Date.now() - (C.meta.at || 0) < STALE_MS) return;
      API.refreshMeta();
    });
    /* モーダルの外側を押したら閉じる */
    $("#modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeModal(); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
