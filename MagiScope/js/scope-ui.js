/* ============================================================
   MagiScope — 画面（2026-09-20b 実データ版）
   ------------------------------------------------------------
   ・画面はすべて #view に描く1ページのアプリ。行き先は location.hash（戻るボタン・端末の戻るが効く）。
   ・データは MS.repo からだけ取る（scope-data.js）。<b>カテゴリーを混ぜた一覧は作らない</b>。
     「すべて」のタブがある画面（お気に入り・通知）も、中はカテゴリーごとの見出しで分けて描く。
   ・保存は magiscope_v1（お気に入り・閲覧履歴・好みのジャンル・設定・絞り込み・既読）。
     XEVARION のアカウントで同期する（xeva-keys.js の PORTAL_SYNC_KEYS）。
     ★ クラウドから書き戻されたら S を読み直す（メモリの写しで上書きしない＝Boccia で踏んだ罠）。
   ・通信は非同期。読みこみ中はスケルトン、失敗したら理由とやり直しボタン。
     ★ 2026-09-20d カラオケ・FANZA・国内アニメは、鍵なしの自動取得（公開ページを読む）が GitHub に置いた JSON を読む。
       まだ一度も動いていない／ルールが未公開のときは、その案内を出す（アニメの AniList は直接読むので常に動く）。

   行き先（ご指定の30画面）
     #/ ホーム  #/rank カテゴリー選択  #/rank/<cat>?type=&period= 各ランキング  #/filter/<cat> 絞り込み
     #/item/<cat>/<id> 詳細  #/search 検索  #/search?cat=&q= 検索結果  #/history/<cat>/<id> 推移
     #/compare/<cat> 比較  #/fav お気に入り  #/trend トレンド  #/notice 通知  #/me マイページ  #/settings 設定
   ============================================================ */
(function () {
  "use strict";
  const MS = window.MS, R = MS.repo, CATS = MS.CATS;
  const $ = (q, el) => (el || document).querySelector(q);
  const $$ = (q, el) => Array.from((el || document).querySelectorAll(q));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const nf = (n) => (Number(n) || 0).toLocaleString("ja-JP");

  /* ══════════ アイコン ══════════ */
  const ICON = {
    home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    crown: '<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/><path d="M6 19h12"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    heart: '<path d="M12 20s-7-4.5-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.5-9 9-9 9z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    chev: '<path d="M9 5l7 7-7 7"/>',
    filter: '<path d="M4 5h16l-6 8v6l-4-2v-4z"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    anime: '<rect x="3" y="5" width="18" height="13" rx="3"/><path d="M10 9l5 2.5-5 2.5z"/><path d="M8 21h8"/>',
    fanza: '<path d="M3 5c3-1 6-1 9 1 3-2 6-2 9-1v14c-3-1-6-1-9 1-3-2-6-2-9-1z"/><path d="M12 6v14"/>',
    dlsite: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/>',
    person: '<circle cx="12" cy="8" r="3.4"/><path d="M5 20a7 7 0 0 1 14 0"/>',
    tag: '<path d="M3 12l9-9h8v8l-9 9z"/><circle cx="16.5" cy="7.5" r="1.4"/>',
    sort: '<path d="M7 4v16M7 20l-3-3M7 4l3 3"/><path d="M17 20V4M17 4l3 3M17 20l-3-3"/>',
    image: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M6 16l4-4 3 3 3-3 2 2"/><circle cx="9" cy="9" r="1.2"/>',
    quote: '<path d="M8 6c-2.5 1.5-4 4-4 7 0 3 2 5 4 5s3.5-1.5 3.5-3.5S10 11 8.5 11H8c0-2 .8-3.6 2.5-4.6z"/><path d="M18 6c-2.5 1.5-4 4-4 7 0 3 2 5 4 5s3.5-1.5 3.5-3.5S20 11 18.5 11H18c0-2 .8-3.6 2.5-4.6z"/>',
    karaoke: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/>',
    fire: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z"/>',
    compare: '<path d="M7 4v16M17 4v16"/><path d="M3 8l4-4 4 4M13 16l4 4 4-4"/>',
    chart: '<path d="M4 19h16"/><path d="M5 15l4-5 4 3 6-7"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    moon: '<path d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 .5c0 2-2.5 2-2.5 4M12 17v.5"/>',
    db: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
    exit: '<path d="M14 4h5v16h-5"/><path d="M10 8l-4 4 4 4M6 12h10"/>',
    check: '<path d="M5 12l5 5 9-10"/>',
    spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    reload: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
    plug: '<path d="M9 7V3M15 7V3"/><path d="M6 7h12v4a6 6 0 0 1-12 0z"/><path d="M12 17v4"/>',
  };
  const ic = (n) => '<svg class="i" viewBox="0 0 24 24" aria-hidden="true">' + (ICON[n] || "") + "</svg>";

  /* ══════════ 保存 ══════════
     v2（実データ版）… お気に入りは { t, title, image, sub } を持つ（一覧を開かなくても描けるように）。
     v1（サンプル版）のお気に入り・履歴・絞り込みは id が実在しないので捨てる。 */
  const KEY = "magiscope_v1";
  function fresh() {
    return {
      v: 2, fav: { anime: {}, fanza: {}, karaoke: {} }, hist: [], prefs: { anime: [], fanza: [], karaoke: [] },
      f: { anime: {}, fanza: {}, karaoke: {} }, recentQ: { anime: [], fanza: [], karaoke: [] }, read: {}, views: 0, age: false,
      set: { theme: "light", big3: true, fanza: true, dlsite: true, notif: { fav: true, fresh: true, trend: true } },
      sort: {}, searchLog: [],
    };
  }
  function load() {
    const d = fresh();
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) {}
    if (!s || typeof s !== "object") return d;
    d.set = Object.assign(d.set, s.set || {}); d.set.notif = Object.assign(fresh().set.notif, (s.set && s.set.notif) || {});
    d.read = s.read || {}; d.views = s.views | 0; d.age = !!s.age; d.lastCat = s.lastCat;
    d.sort = s.sort || {}; d.searchLog = Array.isArray(s.searchLog) ? s.searchLog : [];
    ["prefs", "recentQ"].forEach((k) => { d[k] = Object.assign(d[k], s[k] || {}); });
    if ((s.v | 0) >= 2) {
      ["fav", "f"].forEach((k) => { d[k] = Object.assign(d[k], s[k] || {}); });
      d.hist = Array.isArray(s.hist) ? s.hist : [];
    }
    MS.CAT_IDS.forEach((c) => {
      if (!d.fav[c] || typeof d.fav[c] !== "object") d.fav[c] = {};
      if (!d.f[c]) d.f[c] = {};
      if (!d.prefs[c]) d.prefs[c] = [];
      if (!d.recentQ[c]) d.recentQ[c] = [];
      Object.keys(d.fav[c]).forEach((id) => { if (typeof d.fav[c][id] !== "object") delete d.fav[c][id]; });
      if (!Array.isArray(d.prefs[c])) d.prefs[c] = [];
      if (!d.f[c]) d.f[c] = {};
      if (!Array.isArray(d.recentQ[c])) d.recentQ[c] = [];
    });
    if (!Array.isArray(d.prefs.karaoke)) d.prefs.karaoke = [];
    return d;
  }
  let S = load();
  function save() { S.at = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  const visCats = () => MS.CAT_IDS.filter((c) => (c !== "fanza" || S.set.fanza) && (c !== "dlsite" || S.set.dlsite !== false));
  const isAdultCat = (c) => !!(CATS[c] && CATS[c].adult);
  const isFav = (c, id) => !!(S.fav[c] && S.fav[c][id]);
  const ITEMS = {};                     /* 描いた作品の控え（お気に入り登録のときに名前と絵を残すため） */
  const keep = (it) => { if (it) ITEMS[it.category + ":" + it.id] = it; return it; };
  function toggleFav(c, id) {
    if (isFav(c, id)) { delete S.fav[c][id]; toast("お気に入りから外しました"); }
    else {
      const it = ITEMS[c + ":" + id] || {};
      S.fav[c][id] = { t: Date.now(), title: it.title || "", image: it.image || "", sub: subText(it) };
      toast("お気に入りに登録しました");
    }
    save();
    $$('[data-a="fav"][data-c="' + c + '"][data-id="' + cssq(id) + '"]').forEach((b) => paintFav(b));
  }
  const cssq = (s) => String(s).replace(/["\\]/g, "\\$&");
  function paintFav(b) {
    const on = isFav(b.dataset.c, b.dataset.id);
    b.classList.toggle("on", on);
    if (b.classList.contains("btn")) b.innerHTML = ic("heart") + (on ? "お気に入り登録済み" : "お気に入り登録");
  }
  function applyTheme() { document.documentElement.dataset.theme = S.set.theme === "light" ? "light" : "dark"; }
  applyTheme();

  /* ══════════ 小物 ══════════ */
  function toast(t) { const el = $("#toast"); el.textContent = t; el.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => { el.hidden = true; }, 2200); }
  function sheet(html) { $("#sheet").innerHTML = html; $("#ov").classList.add("on"); }
  function closeSheet() { $("#ov").classList.remove("on"); }
  /* confirm() は出ない環境がある（MagiLex・MagiTier で踏んだ）ので、確認は画面の中で聞く */
  function ask(title, body, okLabel) {
    return new Promise((res) => {
      sheet("<h2>" + esc(title) + "</h2><p>" + esc(body) + '</p><div class="btns"><button class="btn" data-ans="0">やめる</button><button class="btn pri" data-ans="1">' + esc(okLabel || "OK") + "</button></div>");
      const h = (e) => { const b = e.target.closest("[data-ans]"); if (!b) return; $("#sheet").removeEventListener("click", h); closeSheet(); res(b.dataset.ans === "1"); };
      $("#sheet").addEventListener("click", h);
    });
  }
  const catName = (c) => (c === "fanza" ? "FANZA同人" : CATS[c].ja);
  const catPill = (c) => '<span class="cp" data-c="' + c + '">' + ic(c) + CATS[c].en + "</span>";
  function mv(e) {
    if (!e.prevKnown) return '<span class="mv flat" title="前回の記録がまだありません">—</span>';
    if (e.isNew || e.previousRank == null) return '<span class="mv new">NEW</span>';
    const d = e.rankChange;
    if (d > 0) return '<span class="mv up">↑' + d + "</span>";
    if (d < 0) return '<span class="mv down">↓' + -d + "</span>";
    return '<span class="mv flat">→</span>';
  }
  const prevText = (e) => !e.prevKnown ? "前回 —（記録待ち）" : e.previousRank ? "前回 " + e.previousRank + "位" : "前回 圏外";
  function subText(it) {
    if (!it || !it.category) return "";
    if (it.category === "anime") return [(it.genres || []).slice(0, 2).join("・"), it.seasonLabel || it.seasonText, it.studio, it.format].filter(Boolean).join(" · ");
    if (it.category === "fanza" || it.category === "dlsite") return [it.circle, it.author, it.releaseDate && MS.fmtDate(it.releaseDate)].filter(Boolean).join(" · ");
    return [it.artist, it.genre].filter(Boolean).join(" · ");
  }
  const subOf = (it) => esc(subText(it));
  function tagsOf(it) {
    if (it.category === "karaoke") return (it.isNewSong ? '<span class="tag song">新曲</span>' : "") + (it.isStandard ? '<span class="tag std">定番</span>' : "");
    if (it.category === "fanza" || it.category === "dlsite") return (it.isNew ? '<span class="tag book">新刊</span>' : "") + (it.rating ? '<span class="tag std">★' + it.rating + "</span>" : "");
    return (it.airing ? '<span class="tag air">放送中</span>' : "") + (it.fmScore ? '<span class="tag std">★' + it.fmScore + "</span>" : "");
  }
  function metricOf(e) {
    const it = e.item;
    if (it.category === "dlsite" || it.category === "fanza") {
      if (e.rankingType === "popular" && it.sales) return "販売 " + nf(it.sales);
      if (e.rankingType === "rating" && it.rating) return "★" + it.rating + "（" + nf(it.votes) + "件）";
    }
    if (e.rankingType === "fm" && it.fmScore) return "★" + it.fmScore + "（Filmarks）";
    if (e.rankingType === "rating" && it.rating) return "★" + it.rating.toFixed(1);
    if (e.rankingType === "popular" && isAdultCat(it.category) && it.rating) return "★" + (+it.rating).toFixed(2) + "（" + nf(it.votes) + "件）";
    if (e.rankingType === "popular" && it.category === "anime") return nf(it.popularity) + "人が登録";
    if (e.rankingType === "jp") return "視聴者 " + nf(it.watchers) + "人";
    return "";
  }
  /* 絵：API の実画像。読めないときはアプリで描いた絵に差しかえる */
  function img(it, wide) {
    const src = MS.artSrc(it, wide);
    return '<img src="' + esc(src) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-art="' + esc(it.category + ":" + it.id) + '" onerror="MS.imgFail(this)" onload="MS.imgFit(this)">';
  }
  /* ★★ 2026-09-20e 絵の縦横は作品ごとにちがう。枠と 18% 以上ちがうときは切らずに全体を出す（ご指定） */
  MS.imgFit = function (el) {
    const nw = el.naturalWidth, nh = el.naturalHeight, w = el.clientWidth, h = el.clientHeight;
    if (!nw || !nh || !w || !h) return;
    const r = (nw / nh) / (w / h);
    el.classList.toggle("fitc", r < 0.82 || r > 1.22);
  };
  MS.imgFail = function (el) { el.onerror = null; const k = el.dataset.art || ""; const it = ITEMS[k]; if (it) el.src = MS.artSrc(Object.assign({}, it, { image: null, banner: null })); };
  /* 人（アーティスト・サークル・作者・制作会社・監督・声優）とジャンルの札。押すと一覧へ */
  const personChip = (cat, kind, name, label) => !name ? "" :
    '<a class="pchip2" href="#/person/' + cat + "/" + kind + "/" + encodeURIComponent(name) + '">' + ic(kind === "studio" ? "db" : "person") + esc(label || name) + "</a>";
  const genreChip = (cat, g) => '<a class="gchip2" href="#/genre/' + cat + "/" + encodeURIComponent(g) + '">' + ic("tag") + esc(g) + "</a>";
  const favBtn = (it) => '<button class="fav' + (isFav(it.category, it.id) ? " on" : "") + '" data-a="fav" data-c="' + it.category + '" data-id="' + esc(it.id) + '" aria-label="お気に入り">' + ic("heart") + "</button>";
  const itemHref = (it) => "#/item/" + it.category + "/" + encodeURIComponent(it.id);

  function bigCard(e) {
    const it = keep(e.item), m = metricOf(e);
    return '<div class="big r' + e.rank + '" data-c="' + it.category + '"><a class="art" href="' + itemHref(it) + '">' + img(it) + "</a>" +
      '<a class="bd" href="' + itemHref(it) + '"><div class="medal"><span class="n num">' + e.rank + '</span><span class="u">位</span>' + mv(e) + tagsOf(it) + "</div>" +
      '<div class="t">' + esc(it.title) + '</div><div class="s">' + subOf(it) + "</div>" +
      '<div class="meta">' + prevText(e) + (m ? " · " + esc(m) : "") + "</div></a>" + favBtn(it) + "</div>";
  }
  function rowCard(e) {
    const it = keep(e.item), m = metricOf(e);
    return '<div class="row" data-c="' + it.category + '"><a class="rk" href="' + itemHref(it) + '"><span class="n num">' + e.rank + "</span>" + mv(e) + "</a>" +
      '<a class="art" href="' + itemHref(it) + '">' + img(it) + "</a>" +
      '<a class="bd" href="' + itemHref(it) + '"><div class="t">' + esc(it.title) + '</div><div class="s">' + tagsOf(it) + "<span>" + subOf(it) + "</span></div>" +
      '<div class="pv">' + prevText(e) + (m ? " · " + esc(m) : "") + "</div></a>" + favBtn(it) + "</div>";
  }
  function simpleRow(it, rank, extra) {
    keep(it);
    return '<div class="row" data-c="' + it.category + '"><a class="rk" href="' + itemHref(it) + '"><span class="n num" style="font-size:16px">' + (rank ? rank : "–") + '</span><span class="muted" style="font-size:9.5px">' + (rank ? "位" : "圏外") + "</span></a>" +
      '<a class="art" href="' + itemHref(it) + '">' + img(it) + "</a>" +
      '<a class="bd" href="' + itemHref(it) + '"><div class="t">' + esc(it.title) + '</div><div class="s">' + tagsOf(it) + "<span>" + subOf(it) + "</span></div>" + (extra || "") + "</a>" + favBtn(it) + "</div>";
  }
  function posterCard(e, noMv) {
    const it = keep(e.item);
    return '<a class="pcard" data-c="' + it.category + '" href="' + itemHref(it) + '"><div class="art">' + img(it) +
      (e.rank ? '<span class="rk num' + (e.rank <= 3 ? " r" + e.rank : "") + '">' + e.rank + "</span>" : "") + (noMv ? "" : mv(e)) + "</div>" +
      '<div class="t">' + esc(it.title) + '</div><div class="s">' + esc(e.caption || (isAdultCat(it.category) ? it.circle : it.category === "karaoke" ? it.artist : it.genre)) + "</div></a>";
  }
  function segCats(cur, hrefOf, withAll) {
    const cs = visCats();
    return '<div class="seg" style="--n:' + (cs.length + (withAll ? 1 : 0)) + '">' + (withAll ? '<button data-go="' + hrefOf("all") + '" class="' + (cur === "all" ? "on" : "") + '">すべて</button>' : "") +
      cs.map((c) => '<button data-c="' + c + '" data-go="' + hrefOf(c) + '" class="' + (cur === c ? "on" : "") + '">' + ic(c) + CATS[c].en + "</button>").join("") + "</div>";
  }
  const skel = (n) => Array.from({ length: n || 6 }, () => '<div class="skel"></div>').join("");

  /* 読めなかったときの画面 */
  function errCard(c, err) {
    if (err && (err.code === "nodata")) {
      return '<div class="glass fgroup" data-c="' + c + '" style="text-align:center;padding:22px 16px;margin-top:8px"><div style="opacity:.7">' + ic("plug") + "</div>" +
        '<h3 style="justify-content:center;font-size:15px;margin:6px 0 8px">自動取得がまだ動いていません</h3>' +
        '<p class="muted" style="line-height:1.8">' + esc(catName(c)) + "の実ランキングは、1時間ごとの自動取得が各サイトの公開ページから集めたものを表示します（鍵は使いません）。<br>" +
        "設定の手順は <b>MagiScope/collector/README.md</b> にあります。" + (c === "fanza" ? "<br>FANZA は日本からしか見られないため、PC の register-task.bat で取得します。" : "") + "</p></div>";
    }
    return '<div class="empty">' + ic("info") + "<br>読み込めませんでした<br><small>" + esc(err && err.message) + '</small><br><br><button class="btn" data-a="retry">' + ic("reload") + "もう一度</button></div>";
  }
  function freshBar(L) {
    const parts = [];
    if (L.rangeLabel) parts.push(esc(L.rangeLabel));
    if (L.updatedAt) parts.push("更新 " + MS.agoLabel(L.updatedAt));
    if (L.prevLabel) parts.push("前回＝" + esc(L.prevLabel));
    return '<div class="rangebar">' + ic("clock") + "<span>" + parts.join(" · ") + "</span></div>" +
      (L.stale ? '<div class="note" style="margin:-6px 2px 8px;color:var(--down)">オフラインのため ' + MS.agoLabel(L.stale) + " に取得したデータを表示しています</div>" : "");
  }
  /* カラオケのジャケットがまだ無い曲は iTunes から直接さがして、見つかりしだい差しかえる */
  function fillArt(items) {
    const need = items.filter((it) => it && it.category === "karaoke" && !it.image);
    if (!need.length) return;
    R.fillKaraokeArt(need, (it) => {
      keep(it);
      $$('img[data-art="karaoke:' + cssq(it.id) + '"]').forEach((el) => { el.src = it.image; });
    });
  }

  /* ══════════ 折れ線（順位は上が1位） ══════════ */
  function lineChart(pts, opt) {
    opt = opt || {};
    const W = 340, H = opt.h || 170, L = 34, Rr = 14, Tp = 14, B = 24;
    const ranks = pts.map((p) => p.rank).filter((x) => x);
    if (!ranks.length) return '<div class="empty" style="padding:24px">' + (pts.length ? "この期間はランキング圏外でした" : "まだ記録がありません") + "</div>";
    let lo = Math.min.apply(null, ranks), hi = Math.max.apply(null, ranks);
    lo = Math.max(1, lo - Math.max(1, Math.round((hi - lo) * 0.15)));
    hi = hi + Math.max(2, Math.round((hi - lo) * 0.15));
    const y = (r) => Tp + (H - Tp - B) * (r - lo) / Math.max(1, hi - lo);
    const xs = (i) => L + (W - L - Rr) * (pts.length === 1 ? 0.5 : i / (pts.length - 1));
    let s = '<svg class="chart" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="順位推移">';
    for (let k = 0; k <= 4; k++) {
      const r = Math.round(lo + (hi - lo) * k / 4), yy = y(r);
      s += '<line class="gl" x1="' + L + '" x2="' + (W - Rr) + '" y1="' + yy.toFixed(1) + '" y2="' + yy.toFixed(1) + '"/><text x="' + (L - 6) + '" y="' + (yy + 3).toFixed(1) + '" text-anchor="end">' + r + "位</text>";
    }
    const step = Math.max(1, Math.ceil(pts.length / 6));
    pts.forEach((p, i) => { if (i % step === 0 || i === pts.length - 1) s += '<text x="' + xs(i).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(p.label) + "</text>"; });
    let d = "", pen = false;
    pts.forEach((p, i) => { if (!p.rank) { pen = false; return; } d += (pen ? " L" : " M") + xs(i).toFixed(1) + " " + y(p.rank).toFixed(1); pen = true; });
    s += '<path class="ln" d="' + d + '"/>';
    pts.forEach((p, i) => { if (p.rank && pts.length <= 40) s += '<circle class="dot" cx="' + xs(i).toFixed(1) + '" cy="' + y(p.rank).toFixed(1) + '" r="2.6"/>'; });
    const li = pts.map((p) => !!p.rank).lastIndexOf(true);
    if (li >= 0) {
      const lx = xs(li), ly = y(pts[li].rank);
      s += '<circle class="last" cx="' + lx.toFixed(1) + '" cy="' + ly.toFixed(1) + '" r="4.5"/><text class="lbl" x="' + Math.min(W - 16, lx).toFixed(1) + '" y="' + (ly - 9).toFixed(1) + '" text-anchor="' + (lx > W - 40 ? "end" : "middle") + '">' + pts[li].rank + "位</text>";
    }
    return s + "</svg>";
  }
  function sparkPath(vals) {
    const mx = Math.max.apply(null, vals.concat([0.0001])), mn = Math.min.apply(null, vals);
    return vals.map((v, i) => (i ? "L" : "M") + (i * 64 / Math.max(1, vals.length - 1)).toFixed(1) + " " + (24 - 20 * (v - mn) / Math.max(0.0001, mx - mn)).toFixed(1)).join(" ");
  }

  /* ══════════ ルーター ══════════ */
  const stack = [];
  const scrolls = {};
  let curHash = "", renderSeq = 0;
  function parse(h) {
    h = (h || "").replace(/^#/, "") || "/";
    const qi = h.indexOf("?");
    const path = (qi >= 0 ? h.slice(0, qi) : h).split("/").filter(Boolean).map((x) => decodeURIComponent(x));
    const q = {};
    if (qi >= 0) h.slice(qi + 1).split("&").forEach((kv) => { if (!kv) return; const p = kv.split("="); q[decodeURIComponent(p[0])] = decodeURIComponent((p[1] || "").replace(/\+/g, " ")); });
    return { path, q };
  }
  function go(h) { if (location.hash === h) render(); else location.hash = h; }
  function back(fallback) { if (stack.length > 1) history.back(); else go(fallback || "#/"); }
  window.addEventListener("hashchange", () => {
    const h = location.hash || "#/";
    const view = $("#view");
    if (curHash) scrolls[curHash] = view.scrollTop;
    let isBack = false;
    if (stack.length > 1 && stack[stack.length - 2] === h) { stack.pop(); isBack = true; } else stack.push(h);
    if (stack.length > 60) stack.shift();
    render(isBack);
  });
  const TAB_OF = { "": "home", rank: "rank", filter: "rank", search: "search", fav: "fav", me: "me", settings: "me", history: "me", compare: "rank", trend: "home", notice: "home", person: "rank", genre: "rank" };
  function paintTab(p0) { const t = TAB_OF[p0]; if (t) $$(".bnav button").forEach((b) => b.classList.toggle("on", b.dataset.tab === t)); }

  function head(o) {
    if (o.logo) {
      return '<div class="logo"><img src="img/emblem.png" alt=""><b>MagiScope</b></div>' +
        '<a class="ib" href="#/search" aria-label="検索">' + ic("search") + "</a>" +
        '<a class="ib" href="#/notice" aria-label="通知">' + ic("bell") + '<span class="bd" id="bellBd" hidden></span></a>' +
        '<a class="ib" href="../index.html" aria-label="XEVARION へもどる">' + ic("exit") + "</a>";
    }
    return '<button class="ib" data-a="back" data-fb="' + esc(o.fb || "#/") + '" aria-label="戻る">' + ic("back") + "</button>" +
      '<div class="ttl">' + (o.pill ? catPill(o.pill) : "") + "<span>" + esc(o.title || "") + "</span></div>" + (o.actions || "");
  }

  async function render(isBack) {
    const seq = ++renderSeq;
    const h = location.hash || "#/";
    curHash = h;
    const { path, q } = parse(h);
    const p0 = path[0] || "";
    paintTab(p0);
    closeSheet();
    const view = $("#view");
    const fn = SCREENS[p0] || SCREENS[""];
    /* 通信を待つあいだは見出しとスケルトンを先に出す */
    const early = fn.loading ? fn.loading(path, q) : null;
    if (early) { $("#top").innerHTML = early.head; view.innerHTML = early.body || skel(); if (!isBack) view.scrollTop = 0; }
    let out;
    try { out = await fn(path, q); }
    catch (err) {
      console.error(err);
      const c = CATS[path[1]] ? path[1] : CATS[q.cat] ? q.cat : "anime";
      out = { head: early ? early.head : head({ title: "MagiScope" }), body: errCard(c, err) };
    }
    if (seq !== renderSeq) return;
    $("#top").innerHTML = out.head;
    view.innerHTML = out.body;
    view.classList.remove("anim"); void view.offsetWidth; if (!isBack && !early) view.classList.add("anim");
    view.scrollTop = isBack && scrolls[h] != null ? scrolls[h] : 0;
    if (out.after) try { out.after(); } catch (e) { console.error(e); }
    paintBell();
  }

  /* FANZA の入口：年齢の確認と、非表示の設定 */
  function fanzaGate(c) {
    if (!isAdultCat(c)) return null;
    const on = c === "fanza" ? S.set.fanza : S.set.dlsite !== false;
    if (!on) return { head: head({ title: catName(c), fb: "#/" }), body: '<div class="empty">' + ic("eye") + "<br>" + esc(catName(c)) + 'は設定で非表示にしています。<br><br><button class="btn pri" data-a="showFanza" data-c="' + c + '">表示する</button></div>' };
    if (!S.age) {
      return { head: head({ title: catName(c), pill: c, fb: "#/" }), body: '<div class="glass fgroup" data-c="' + c + '" style="margin-top:20px;text-align:center;padding:24px 16px">' +
        '<div style="font-size:40px;margin-bottom:6px">🔞</div><h2 style="font-size:17px;font-weight:900;margin-bottom:8px">年齢の確認</h2>' +
        '<p class="muted" style="font-size:13px;line-height:1.8;margin-bottom:16px">' + esc(catName(c)) + 'には成人向け作品（表紙画像を含む）が表示されます。<br>あなたは18歳以上ですか？</p>' +
        '<div style="display:flex;gap:8px"><button class="btn" data-go="#/" style="flex:1">いいえ</button><button class="btn pri" data-a="ageOK" data-c="' + c + '" style="flex:1">はい（18歳以上）</button></div>' +
        '<p class="note" style="margin-top:12px">設定からいつでも非表示にできます。</p></div>' };
    }
    return null;
  }

  /* ══════════ 画面 ══════════ */
  const SCREENS = {};

  /* 1. ホーム */
  SCREENS[""] = async function () {
    const cs = visCats();
    const d = new Date();
    let body = '<div class="hero"><h1>好きなエンタメを、<br>もっと見つけよう。</h1><p>' + d.getFullYear() + "." + String(d.getMonth() + 1).padStart(2, "0") + "." + String(d.getDate()).padStart(2, "0") + " · " + cs.length + "つのランキングは別々の出典から取得</p></div>";
    body += '<div class="catcards">' + cs.map((c) =>
      '<a class="catcard" data-c="' + c + '" href="#/rank/' + c + (c === "anime" ? "?type=jp" : "") + '"><span class="ic">' + ic(c) + '</span><span class="en">' + CATS[c].en + '</span><span class="ja">' + esc(c === "fanza" ? "FANZA同人" : c === "dlsite" ? "DLsite同人" : c === "anime" ? "アニメ" : "カラオケ") + '</span><span class="n">' + esc(CATS[c].source) + "</span></a>").join("") + "</div>";
    body += '<div class="quick"><button data-go="#/trend">' + ic("fire") + "トレンド</button><button data-go=\"#/compare\">" + ic("compare") + "比較</button><button data-go=\"#/history\">" + ic("chart") + "推移</button><button data-go=\"#/fav\">" + ic("heart") + "お気に入り</button></div>";
    cs.forEach((c) => {
      body += '<section class="homesec" data-c="' + c + '"><div class="sec"><h2 id="homeh-' + c + '">' + catPill(c) + (c === "karaoke" ? "今週のランキング" : c === "anime" ? "国内 今季の視聴者数ランキング" : "注目ランキング") + "</h2>" +
        '<a class="more" href="#/rank/' + c + '">すべて見る' + ic("chev") + '</a></div><div class="hscroll" id="home-' + c + '">' + Array.from({ length: 4 }, () => '<div class="pcard"><div class="art skel" style="height:150px;margin:0"></div></div>').join("") + "</div></section>";
    });
    body += '<div id="homeRec"></div><div id="homePref"></div>';
    body += '<p class="note" style="margin:18px 4px 4px">出典：アニメ＝Annict（国内の視聴者数）・AniList（トレンド）／FANZA同人＝FANZA同人ランキング／カラオケ＝カラオケ DAM（ジャケット・発売日は iTunes）。</p>';
    return { head: head({ logo: true }), body, after() { homeFill(cs); } };
  };
  async function homeFill(cs) {
    const seq = renderSeq;
    await Promise.all(cs.map(async (c) => {
      const box = $("#home-" + c); if (!box) return;
      if (isAdultCat(c) && !S.age) { box.outerHTML = '<div class="note" style="padding:6px 2px 12px">年齢の確認のあとで表示します。<a href="#/rank/' + c + '" style="color:var(--c);font-weight:800">確認する ›</a></div>'; return; }
      try {
        let L;
        if (c === "anime") {
          try { L = await R.list(c, { type: "jp", period: "season" }); }
          catch (e) { L = await R.list(c, { type: "overall", period: "day" }); const h = $("#homeh-anime"); if (h) h.innerHTML = catPill("anime") + "今日の注目ランキング"; }
          if (L.type === "jp") { const a = $('#home-anime'); if (a) a.previousElementSibling.querySelector(".more").setAttribute("href", "#/rank/anime?type=jp"); }
        } else L = await R.list(c, { type: "overall", period: CATS[c].mainPeriod });
        if (seq !== renderSeq || !$("#home-" + c)) return;
        $("#home-" + c).innerHTML = L.entries.slice(0, 10).map((e) => posterCard(e)).join("") || '<div class="note">データがありません</div>';
        fillArt(L.entries.slice(0, 10).map((e) => e.item));
      } catch (err) {
        if (seq !== renderSeq || !$("#home-" + c)) return;
        $("#home-" + c).outerHTML = err.code === "nodata" ? '<div class="note" style="padding:4px 2px 12px">' + esc(err.message) + '（MagiScope/collector/README.md）</div>'
          : '<div class="note" style="padding:4px 2px 12px">読み込めませんでした（' + esc(err.message) + "）</div>";
      }
    }));
    /* おすすめ（ふだん見ているもの・お気に入り・検索から） */
    try {
      const box2 = $("#homeRec");
      if (box2) {
        let h2 = "";
        for (const c of cs) {
          if (isAdultCat(c) && !S.age) continue;
          const seed = recSeed(c);
          if (!seed.genres.length && !seed.people.length) continue;
          const rec = await R.recommend(c, seed, seed.seen).catch(() => []);
          if (!rec.length) continue;
          h2 += '<div class="muted" style="margin:8px 2px 6px;display:flex;gap:6px;align-items:center">' + catPill(c) + "あなたの好みに近い" + (seed.why ? "（" + esc(seed.why) + "）" : "") + '</div><div class="hscroll">' +
            rec.slice(0, 12).map((x) => posterCard({ item: x.item, rank: null }, true)).join("") + "</div>";
          fillArt(rec.map((x) => x.item));
        }
        if (h2 && seq === renderSeq && $("#homeRec")) $("#homeRec").innerHTML = '<div class="sec"><h2>' + ic("spark") + "あなたへのおすすめ</h2></div>" + h2;
      }
    } catch (e) {}
    /* 好みのジャンル（カテゴリーごとに分けて出す）… アニメは AniList のジャンル、カラオケは DAM のジャンル別ランキング */
    const box = $("#homePref"); if (!box || seq !== renderSeq) return;
    let h = "";
    for (const c of cs) {
      const pf = S.prefs[c] || [];
      if (!pf.length || (isAdultCat(c) && !S.age)) continue;
      try {
        let L;
        if (c === "karaoke") { const lk = MS.KARA_LISTS.find((x) => x[1] === pf[0]); L = await R.list(c, { type: "weekly", filters: { list: lk ? lk[0] : "" } }); }
        else L = await R.list(c, { type: "overall", period: CATS[c].mainPeriod, filters: { genres: isAdultCat(c) ? [pf[0]] : pf } });
        if (!L.entries.length) continue;
        h += '<div class="muted" style="margin:8px 2px 6px;display:flex;gap:6px;align-items:center">' + catPill(c) + esc(pf.join("・")) + '</div><div class="hscroll">' + L.entries.slice(0, 10).map((e) => posterCard(e)).join("") + "</div>";
      } catch (e) {}
    }
    if (h && seq === renderSeq && $("#homePref")) $("#homePref").innerHTML = '<div class="sec"><h2>' + ic("spark") + "あなたの好きなジャンルで注目</h2><a class=\"more\" href=\"#/me\">編集" + ic("chev") + "</a></div>" + h;
  }

  /* おすすめのもと：お気に入り・閲覧履歴・検索から、よく出るジャンルと人をかぞえる */
  function recSeed(cat) {
    const gs = {}, ps = {}, seen = [];
    const add = (it, w) => {
      if (!it) return;
      (it.genres || [it.genre]).filter(Boolean).forEach((g) => { gs[g] = (gs[g] || 0) + w; });
      const names = cat === "anime" ? [it.studio, it.director].concat((it.cast || []).map((c) => c.n))
        : cat === "karaoke" ? [it.artist] : [it.circle, it.author];
      names.filter(Boolean).forEach((n) => { ps[n] = (ps[n] || 0) + w; });
    };
    Object.keys(S.fav[cat] || {}).forEach((id) => { seen.push(id); add(ITEMS[cat + ":" + id], 3); });
    S.hist.filter((h) => h.c === cat).slice(0, 25).forEach((h) => { seen.push(h.id); add(ITEMS[cat + ":" + h.id], 2); });
    (S.prefs[cat] || []).forEach((g) => { gs[g] = (gs[g] || 0) + 4; });
    (S.recentQ[cat] || []).slice(0, 6).forEach((q) => { ps[q] = (ps[q] || 0) + 1; gs[q] = (gs[q] || 0) + 1; });
    const top = (m) => Object.keys(m).sort((a, b) => m[b] - m[a]).slice(0, 8);
    const g = top(gs), p = top(ps);
    return { genres: g, people: p, seen, why: [g[0], p[0]].filter(Boolean).slice(0, 2).join("・") };
  }

  /* 2. ランキングカテゴリー選択 ／ 3〜7・10〜13・16〜19. 各カテゴリーのランキング */
  SCREENS.rank = async function (path, q) {
    const c = path[1];
    if (!c || !CATS[c]) {
      const body = '<p class="muted" style="margin:2px 2px 4px">カテゴリーを選んでください。ランキングはカテゴリーごとに独立しています。</p><div class="catrows">' + visCats().map((cc) => {
        const C = CATS[cc];
        return '<div class="catrow" data-c="' + cc + '"><a class="hd" href="#/rank/' + cc + '"><span class="ic">' + ic(cc) + '</span><span style="flex:1;min-width:0"><b>' + C.title + "</b><small>" + C.en + " · " + C.types.length + "種類のランキング · 出典：" + esc(C.source) + "</small></span>" + ic("chev") + "</a>" +
          '<div class="chips">' + C.types.map((t) => '<a class="chip sm" href="#/rank/' + cc + "?type=" + t.id + '">' + t.label + "</a>").join("") + "</div></div>";
      }).join("") + "</div>";
      return { head: head({ title: "ランキング" }), body };
    }
    const gate = fanzaGate(c); if (gate) return gate;
    const ctx = rankCtx(c, q);
    const L = await R.list(c, { type: ctx.t.id, period: ctx.period, filters: ctx.F, sort: sortOf(c) });
    let body = ctx.top + freshBar(L);
    if (!L.entries.length) {
      body += '<div class="empty">' + ic("search") + "<br>この条件に合う" + CATS[c].noun + "はありません</div>";
      return { head: ctx.head, body };
    }
    const big = S.set.big3 ? L.entries.slice(0, 3) : [];
    body += big.length ? '<div class="top3">' + big.map(bigCard).join("") + "</div>" : "";
    body += '<div class="list" id="rlist"></div><button class="loadmore" id="more" hidden>もっと見る</button>';
    if (L.sourceUrl || CATS[c].sourceUrl) body += '<p class="note" style="margin:12px 4px 0">出典：<a href="' + esc(L.sourceUrl || CATS[c].sourceUrl) + '" target="_blank" rel="noopener" style="text-decoration:underline">' + esc(L.source || CATS[c].source) + "</a></p>";
    return { head: ctx.head, body, after() { startPager(L.entries.slice(big.length), rowCard, $("#rlist")); fillArt(L.entries.slice(0, 40).map((e) => e.item)); } };
  };
  SCREENS.rank.loading = function (path, q) {
    const c = path[1];
    if (!c || !CATS[c] || fanzaGate(c)) return null;
    const ctx = rankCtx(c, q);
    return { head: ctx.head, body: ctx.top + skel(8) };
  };
  const sortOf = (c) => S.sort[c] || "rank";
  function rankCtx(c, q) {
    const C = CATS[c];
    const t = MS.typeOf(c, q.type || "overall");
    const pers = MS.periodsOfType(c, t.id);
    const period = pers.indexOf(q.period) >= 0 ? q.period : MS.defaultPeriod(c, t.id);
    const F = S.f[c] || {};
    const title = catName(c) + (t.id === "overall" ? "" : t.label) + "ランキング";
    const fcount = filterCount(c, F);
    const actions = '<a class="ib" href="#/compare/' + c + '" aria-label="比較">' + ic("compare") + "</a>" +
      '<a class="ib" href="#/filter/' + c + '" aria-label="絞り込み">' + ic("filter") + (fcount ? '<span class="bd">' + fcount + "</span>" : "") + "</a>";
    const qs = (o) => "#/rank/" + c + "?type=" + (o.type || t.id) + (o.period ? "&period=" + o.period : "");
    let top = segCats(c, (cc) => "#/rank/" + cc);
    top += '<div class="chips" data-c="' + c + '">' + C.types.map((x) => '<a class="chip' + (x.id === t.id ? " on" : "") + '" href="' + qs({ type: x.id }) + '">' + (x.k ? "🎤" : "") + x.label + "</a>").join("") + "</div>";
    if (pers.length > 1) top += '<div class="chips" data-c="' + c + '">' + pers.map((p) => '<a class="chip sm' + (p === period ? " on" : "") + '" href="' + qs({ period: p }) + '">' + periodLabel(c, p) + "</a>").join("") + "</div>";
    if (c === "karaoke") {
      const cur = F.list || "";
      top += '<div class="chips" data-c="karaoke">' + MS.KARA_LISTS.map((l) => '<button class="chip sm' + (cur === l[0] ? " on" : "") + '" data-a="klist" data-v="' + l[0] + '">' + esc(l[1]) + "</button>").join("") + "</div>";
    }
    /* 並べ替え（MagiBurst と同じく「絞り込み」と並べて出す） */
    const sc = sortOf(c);
    top += '<div class="chips" data-c="' + c + '">' + ic("sort") + MS.repo.sorts(c).map((x) => '<button class="chip sm' + (x[0] === sc ? " on" : "") + '" data-a="sortby" data-c="' + c + '" data-v="' + x[0] + '">' + x[1] + "</button>").join("") + "</div>";
    if (fcount) top += '<div class="fsum">' + filterChips(c, F) + '<button class="chip sm" data-a="fclear" data-c="' + c + '">条件をクリア</button></div>';
    return { t, period, F, top, head: head({ title, actions, fb: "#/rank" }) };
  }
  function periodLabel(c, p) {
    if (c === "karaoke") return { day: "デイリー", week: "ウィークリー", month: "マンスリー", year: "年間", all: "歴代" }[p] || MS.PERIODS[p].label;
    return MS.PERIODS[p].label;
  }
  /* 一度に全部は描かない：50件ずつ（見えてきたら次の50件） */
  function startPager(entries, draw, box) {
    if (!box) return;
    let shown = 0;
    const more = $("#more");
    const step = () => {
      const next = entries.slice(shown, shown + 50);
      box.insertAdjacentHTML("beforeend", next.map(draw).join(""));
      shown += next.length;
      if (more) { more.hidden = shown >= entries.length; more.textContent = "もっと見る（残り " + nf(entries.length - shown) + "）"; }
    };
    step();
    if (!more) return;
    more.onclick = step;
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting) && shown < entries.length) step(); }, { root: $("#view"), rootMargin: "400px" });
      io.observe(more);
    }
  }

  /* 絞り込みの中身 → 表示用の札 */
  function filterCount(c, F) {
    let n = 0;
    Object.keys(F || {}).forEach((k) => { if (k === "list") return; const v = F[k]; if (Array.isArray(v) ? v.length : v) n++; });
    return n;
  }
  const AIR_NM = { cur: "今季", prev: "前季", year: "今年", past: "過去作品" };
  const WHEN_NM = { week: "今週", month: "今月", year: "今年", past: "過去" };
  const FRESH_NM = { new: "新刊", old: "既刊" };
  const KTAG_NM = { new: "新曲", standard: "定番曲", anime: "アニメ関連", game: "ゲーム関連" };
  function filterChips(c, F) {
    const out = [];
    const add = (k, label) => out.push('<button class="chip sm on" data-c="' + c + '" data-a="fdel" data-k="' + esc(k) + '">' + esc(label) + '<span class="x">✕</span></button>');
    (F.genres || []).forEach((g) => add("genres:" + g, g));
    (F.airing || []).forEach((v) => add("airing:" + v, AIR_NM[v]));
    (F.formats || []).forEach((v) => add("formats:" + v, v));
    (F.when || []).forEach((v) => add("when:" + v, "配信 " + WHEN_NM[v]));
    (F.kinds || []).forEach((v) => add("kinds:" + v, v));
    (F.fresh || []).forEach((v) => add("fresh:" + v, FRESH_NM[v]));
    (F.tags || []).forEach((v) => add("tags:" + v, KTAG_NM[v]));
    (F.vocal || []).forEach((v) => add("vocal:" + v, v + "ボーカル"));
    (F.unit || []).forEach((v) => add("unit:" + v, v));
    if (F.author) add("author", "作者：" + F.author);
    if (F.circle) add("circle", "サークル：" + F.circle);
    if (F.studio) add("studio", "制作：" + F.studio);
    if (F.director) add("director", "監督：" + F.director);
    if (F.cast) add("cast", "声優：" + F.cast);
    if (F.minRate) add("minRate", "★" + F.minRate + " 以上");
    if (F.genreAnd) add("genreAnd", "ジャンルはすべて含む");
    if (F.series) add("series", "シリーズ：" + F.series);
    if (F.artist) add("artist", "アーティスト：" + F.artist);
    if (F.yearFrom || F.yearTo) add("year", "発売 " + (F.yearFrom || "") + "〜" + (F.yearTo || ""));
    return out.join("");
  }

  /* 8・14・20. 絞り込み（カテゴリー専用の項目） */
  let draft = null;
  SCREENS.filter = async function (path) {
    const c = path[1];
    if (!CATS[c]) return SCREENS.rank(["rank"], {});
    const gate = fanzaGate(c); if (gate) return gate;
    draft = JSON.parse(JSON.stringify(S.f[c] || {}));
    const fc = await R.facets(c);
    const group = (title, k, opts, sub, single) => '<div class="glass fgroup" data-c="' + c + '"><h3>' + title + (sub ? "<small>" + sub + "</small>" : "") + '</h3><div class="chips wrap">' +
      opts.map((o) => { const v = Array.isArray(o) ? o[0] : o, lb = Array.isArray(o) ? o[1] : o;
        const on = single ? (draft[k] || "") === v : (draft[k] || []).indexOf(v) >= 0;
        return '<button class="chip sm' + (on ? " on" : "") + '" data-a="' + (single ? "fone" : "ftog") + '" data-k="' + k + '" data-v="' + esc(v) + '">' + esc(lb) + "</button>"; }).join("") + "</div></div>";
    const text = (title, k, ph, sub) => '<div class="glass fgroup" data-c="' + c + '"><h3>' + title + (sub ? "<small>" + sub + "</small>" : "") + '</h3><input class="inp" data-a="ftext" data-k="' + k + '" placeholder="' + esc(ph) + '" value="' + esc(draft[k] || "") + '"></div>';
    let body = '<p class="muted" style="margin:0 2px 10px">' + catPill(c) + " 専用の絞り込み。同じ項目の中は「どれか」、項目どうしは「すべて」に合うものを出します。</p>";
    if (c === "anime") {
      body += group("ジャンル", "genres", fc.genres, "複数えらべます");
      body += '<div class="glass fgroup" data-c="anime"><h3>ジャンルの合わせかた</h3><div class="chips wrap">' +
        '<button class="chip sm' + (!draft.genreAnd ? " on" : "") + '" data-a="fflag" data-k="genreAnd" data-v="">どれか1つ</button>' +
        '<button class="chip sm' + (draft.genreAnd ? " on" : "") + '" data-a="fflag" data-k="genreAnd" data-v="1">すべて含む</button></div></div>';
      body += group("放送・公開時期", "airing", [["cur", "今季"], ["prev", "前季"], ["year", "今年"], ["past", "過去作品"]]);
      body += group("作品形式", "formats", fc.formats);
      body += text("制作会社", "studio", "制作会社名を入力");
      body += text("監督", "director", "監督名を入力");
      body += text("声優", "cast", "声優名を入力");
      body += group("国内の評価（Filmarks）", "minRate", [["3.5", "★3.5 以上"], ["4", "★4.0 以上"], ["4.5", "★4.5 以上"]], "", true);
      if (fc.studios && fc.studios.length) body += group("よく出る制作会社", "studio", fc.studios.slice(0, 24), "押すと絞り込みます", true);
      if (fc.casts && fc.casts.length) body += group("よく出る声優", "cast", fc.casts.slice(0, 24), "押すと絞り込みます", true);
    } else if (c === "fanza" || c === "dlsite") {
      body += fc.genres.length ? group("ジャンル", "genres", fc.genres, "複数えらべます") : '<div class="glass fgroup"><h3>ジャンル</h3><p class="note">ジャンルの一覧を読み込めませんでした</p></div>';
      body += '<div class="glass fgroup" data-c="' + c + '"><h3>ジャンルの合わせかた</h3><div class="chips wrap">' +
        '<button class="chip sm' + (!draft.genreAnd ? " on" : "") + '" data-a="fflag" data-k="genreAnd" data-v="">どれか1つ</button>' +
        '<button class="chip sm' + (draft.genreAnd ? " on" : "") + '" data-a="fflag" data-k="genreAnd" data-v="1">すべて含む</button></div></div>';
      body += group("作品の形式", "kinds", fc.kinds);
      body += group("配信時期", "when", [["week", "今週"], ["month", "今月"], ["year", "今年"], ["past", "過去"]]);
      body += text("サークル", "circle", "サークル名を入力");
      body += text("作者", "author", "作者名を入力");
      body += text("シリーズ", "series", "シリーズ名を入力");
      body += group("評価", "minRate", [["4", "★4.0 以上"], ["4.5", "★4.5 以上"], ["5", "★5.0"]], "", true);
      body += group("新刊 / 既刊", "fresh", [["new", "新刊（30日以内）"], ["old", "既刊"]]);
      if (fc.circles && fc.circles.length) body += group("よく出るサークル", "circle", fc.circles.slice(0, 30), "押すと絞り込みます", true);
    } else {
      body += group("カテゴリー", "list", fc.lists, "DAM のジャンル別ランキング", true);
      if (fc.genres.length) body += group("ジャンル", "genres", fc.genres, "配信での分類（iTunes）");
      body += text("アーティスト", "artist", "アーティスト名を入力");
      const yrs = []; for (let y = fc.yearMax; y >= fc.yearMin; y--) yrs.push(y);
      const sel = (k) => '<select data-a="fyear" data-k="' + k + '"><option value="">指定なし</option>' + yrs.map((y) => '<option value="' + y + '"' + (Number(draft[k]) === y ? " selected" : "") + ">" + y + "年</option>").join("") + "</select>";
      body += '<div class="glass fgroup" data-c="karaoke"><h3>発売年</h3><div class="yr">' + sel("yearFrom") + "<span>〜</span>" + sel("yearTo") + "</div></div>";
      body += group("曲のタイプ", "tags", [["new", "新曲"], ["standard", "定番曲"], ["anime", "アニメ関連"], ["game", "ゲーム関連"]]);
      body += group("男女ボーカル", "vocal", ["男性", "女性"], "ソロ歌手のみ判定");
      body += group("ソロ / グループ", "unit", ["ソロ", "グループ"]);
    }
    body += '<div class="sticky" data-c="' + c + '"><button class="btn" data-a="freset">リセット</button><button class="btn pri" data-a="fapply" data-c="' + c + '" id="fapply">この条件で絞り込む</button></div>';
    return { head: head({ title: catName(c) + "絞り込み", pill: c, fb: "#/rank/" + c }), body, after() { fPreview(c); } };
  };
  let fpT = 0;
  function fPreview(c) {
    clearTimeout(fpT);
    fpT = setTimeout(async () => {
      try {
        const q = c === "karaoke" ? { type: "weekly", filters: draft } : { type: "overall", period: CATS[c].mainPeriod, filters: draft };
        const L = await R.list(c, q);
        const b = $("#fapply"); if (b) b.textContent = "この条件で絞り込む（" + nf(L.total) + CATS[c].unit + "）";
      } catch (e) {}
    }, 350);
  }

  /* 9・15・21. 詳細（カテゴリーごとに中身を変える） */
  let detailRange = "1m";
  SCREENS.item = async function (path) {
    const c = path[1], id = path[2];
    if (!CATS[c]) return SCREENS[""]();
    const gate = fanzaGate(c); if (gate) return gate;
    const it = keep(await R.item(c, id));
    if (!it) return { head: head({ title: "見つかりません" }), body: '<div class="empty">この' + CATS[c].noun + "は見つかりませんでした</div>" };
    S.hist = S.hist.filter((h) => !(h.c === c && h.id === id));
    S.hist.unshift({ c, id, t: Date.now(), title: it.title, image: it.image || "" }); if (S.hist.length > 60) S.hist.length = 60;
    S.views = (S.views | 0) + 1; save();
    const [ri, rel, hist] = await Promise.all([R.rankInfo(c, id).catch(() => ({})), R.related(c, id).catch(() => ({ primary: [], secondary: [] })), R.history(c, id, detailRange).catch(() => ({ points: [] }))]);
    const pt = c === "anime" ? "キービジュアル" : isAdultCat(c) ? "表紙" : "ジャケット";
    let body = '<div class="dhero" data-c="' + c + '"><div class="bgart">' + img(it, c === "anime") + '</div><div class="in"><div class="cover" aria-label="' + pt + '">' + img(it) + '</div><div class="tt">' +
      "<h1>" + esc(it.title) + "</h1>" +
      (isAdultCat(c) ? '<div class="by">' + esc(it.author || it.circle) + "</div>" : c === "karaoke" ? '<div class="by">' + esc(it.artist) + "</div>" : it.sub ? '<div class="by">' + esc(it.sub) + "</div>" : "") +
      '<div class="gs">' + catPill(c) + (it.genres || [it.genre]).filter(Boolean).slice(0, 8).map((g) => '<a class="gchip" href="#/genre/' + c + "/" + encodeURIComponent(g) + '">' + esc(g) + "</a>").join("") + tagsOf(it) + "</div></div></div></div>";
    body += '<div class="stats3" data-c="' + c + '"><div class="stat glass cur"><small>現在の順位</small><b class="num">' + (ri.rank || "–") + "<i>位</i></b></div>" +
      '<div class="stat glass"><small>過去最高</small><b class="num">' + (ri.best || "–") + "<i>位</i></b></div>" +
      '<div class="stat glass"><small>前回</small><b class="num">' + (ri.prevKnown === false ? "–" : ri.previousRank || (ri.rank ? "圏外" : "–")) + (ri.previousRank ? "<i>位</i>" : "") + "</b></div></div>";
    if (ri.label) body += '<p class="note" style="margin:-6px 4px 10px">' + esc(ri.label) + "</p>";
    body += '<button class="btn full favbtn' + (isFav(c, id) ? " on" : "") + '" data-a="fav" data-c="' + c + '" data-id="' + esc(id) + '">' + ic("heart") + (isFav(c, id) ? "お気に入り登録済み" : "お気に入り登録") + "</button>";
    body += '<div class="glass chartbox" data-c="' + c + '"><div class="hd"><b>順位推移</b><a class="more muted" href="#/history/' + c + "/" + encodeURIComponent(id) + '" style="font-size:12px;font-weight:800">くわしく ›</a></div>' + rtabs(detailRange, "drange") +
      '<div id="dchart">' + lineChart(hist.points || []) + '</div><div class="note" id="dnote" style="margin:4px 4px 0">' + esc(hist.note || "") + "</div></div>";
    body += '<dl class="glass info">' + infoRows(it).map((r) => "<dt>" + r[0] + "</dt><dd>" + r[1] + "</dd>").join("") + "</dl>";
    /* あらすじ（国内・日本語） */
    if (it.synopsis) body += '<p class="muted" style="margin:-4px 4px 12px;line-height:1.8">' + esc(it.synopsis) + "</p>";
    /* 人（押すとその人の作品一覧へ） */
    const people = [];
    if (c === "anime") {
      if (it.studio) people.push(personChip(c, "studio", it.studio, "制作 " + it.studio));
      if (it.director) people.push(personChip(c, "director", it.director, "監督 " + it.director));
      (it.cast || []).slice(0, 10).forEach((x) => people.push(personChip(c, "cast", x.n, x.n + (x.c ? "（" + x.c + "）" : ""))));
      (it.staff || []).filter((x) => /脚本|シリーズ構成|音楽|キャラクターデザイン|原作/.test(x.r)).slice(0, 6).forEach((x) => people.push(personChip(c, "cast", x.n, x.r + " " + x.n)));
    } else if (c === "karaoke") {
      if (it.artist) people.push(personChip(c, "artist", it.artist, it.artist));
    } else {
      if (it.circle) people.push(personChip(c, "circle", it.circle, "サークル " + it.circle));
      if (it.author) people.push(personChip(c, "author", it.author, "作者 " + it.author));
    }
    if (people.length) body += '<div class="sec"><h2>' + ic("person") + "関係する人・サークル</h2></div><div class=\"chips wrap\" style=\"margin-bottom:6px\">" + people.join("") + "</div>";
    /* サンプル画像（FANZA・DLsite） */
    if ((it.samples || []).length) {
      body += '<div class="sec"><h2>' + ic("image") + "サンプル</h2></div><div class=\"miniart samples\">" +
        it.samples.slice(0, 8).map((u, i) => '<button class="samp" data-a="samp" data-u="' + esc(u) + '"><img src="' + esc(u) + '" alt="サンプル' + (i + 1) + '" loading="lazy" referrerpolicy="no-referrer"></button>').join("") + "</div>";
    }
    /* レビュー（感想） */
    const rv = (it.reviews || []).filter(Boolean);
    if (rv.length) {
      body += '<div class="sec"><h2>' + ic("quote") + "レビュー</h2></div><div class=\"glass revbox\">" +
        rv.slice(0, 4).map((t) => '<p class="rev">' + esc(typeof t === "string" ? t : t.t || "") + "</p>").join("") + "</div>";
    }
    const relT = c === "anime" ? ["関連作品（シリーズ）", "この作品を見ている人が見ている作品"] : (c === "fanza" || c === "dlsite") ? ["同じシリーズ・サークルの作品", "よく似た作品（ジャンルが近い）"] : ["同じアーティストの楽曲", "関連楽曲（同じジャンル）"];
    [["primary", relT[0]], ["secondary", relT[1]]].forEach(([k, tl]) => {
      if (!rel[k] || !rel[k].length) return;
      body += '<div class="sec"><h2>' + tl + '</h2></div><div class="miniart">' + rel[k].map((x) => posterCard({ item: x.item, rank: x.rank, caption: x.rel }, true)).join("") + "</div>";
    });
    const links = [];
    if (it.url && !(c === "anime" && it.jpOnly)) links.push('<a class="btn" style="flex:1" href="' + esc(it.url) + '" target="_blank" rel="noopener">' + ic("link") + (c === "anime" ? "AniList" : c === "dlsite" ? "DLsiteで見る" : "FANZAで見る") + "</a>");
    if (it.annictUrl) links.push('<a class="btn" style="flex:1" href="' + esc(it.annictUrl) + '" target="_blank" rel="noopener">' + ic("link") + "Annict</a>");
    if (it.official) links.push('<a class="btn" style="flex:1" href="' + esc(it.official) + '" target="_blank" rel="noopener">' + ic("link") + "公式</a>");
    if (it.damUrl) links.push('<a class="btn" style="flex:1" href="' + esc(it.damUrl) + '" target="_blank" rel="noopener">' + ic("link") + "DAM</a>");
    if (it.appleUrl) links.push('<a class="btn" style="flex:1" href="' + esc(it.appleUrl) + '" target="_blank" rel="noopener">' + ic("link") + "Apple Music</a>");
    if (links.length) body += '<div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">' + links.join("") + "</div>";
    body += '<div style="display:flex;gap:8px;margin-top:8px"><a class="btn" style="flex:1" href="#/history/' + c + "/" + encodeURIComponent(id) + '">' + ic("chart") + "ランキング推移</a><a class=\"btn\" style=\"flex:1\" href=\"#/compare/" + c + '">' + ic("compare") + "ランキング比較</a></div>";
    return { head: head({ title: c === "karaoke" ? "楽曲詳細" : isAdultCat(c) ? catName(c) + "詳細" : "アニメ詳細", pill: c, fb: "#/rank/" + c }), body,
      after() { $("#view").dataset.cur = c + "/" + id; fillArt([it].concat((rel.primary || []).concat(rel.secondary || []).map((x) => x.item))); } };
  };
  SCREENS.item.loading = function (path) {
    const c = path[1];
    if (!CATS[c] || fanzaGate(c)) return null;
    return { head: head({ title: c === "karaoke" ? "楽曲詳細" : isAdultCat(c) ? catName(c) + "詳細" : "アニメ詳細", pill: c, fb: "#/rank/" + c }), body: '<div class="skel" style="height:220px"></div>' + skel(4) };
  };
  function rtabs(cur, act) {
    return '<div class="rtabs">' + [["1w", "1週間"], ["1m", "1か月"], ["3m", "3か月"], ["1y", "1年間"]].map((r) => '<button data-a="' + act + '" data-v="' + r[0] + '" class="' + (cur === r[0] ? "on" : "") + '">' + r[1] + "</button>").join("") + "</div>";
  }
  function infoRows(it) {
    const r = [];
    if (it.category === "anime") {
      r.push(["ジャンル", esc((it.genres || []).join("・"))], ["放送時期", esc(it.seasonLabel) + (it.airing ? "（放送中）" : "")], ["作品形式", esc(it.format)]);
      if (it.episodes) r.push(["話数", it.episodes + "話"]);
      if (it.studio) r.push(["制作会社", esc(it.studio)]);
      if (it.director) r.push(["監督", esc(it.director)]);
      if (it.fmScore) r.push(["国内の評価", "★" + it.fmScore + '<span class="muted">（Filmarks）</span>']);
      if (it.watchers) r.push(["国内の視聴者", nf(it.watchers) + '人<span class="muted">（Annict）</span>']);
      if ((it.cast || []).length) r.push(["声優", esc(it.cast.slice(0, 6).map((x) => x.n).join("・"))]);
      if (it.rating) r.push(["評価", "★" + it.rating.toFixed(1) + '<span class="muted">（AniList・' + nf(it.popularity) + "人が登録）</span>"]);
      const jp = it.jp || {};
      const jr = [jp.season ? "今季 " + jp.season + "位" : "", jp.year ? "今年 " + jp.year + "位" : "", jp.all ? "歴代 " + jp.all + "位" : ""].filter(Boolean);
      if (jr.length) r.push(["国内の順位", esc(jr.join("・"))]);
    } else if (it.category === "fanza" || it.category === "dlsite") {
      if (it.author) r.push(["作者", esc(it.author)]);
      if (it.circle) r.push(["サークル", esc(it.circle)]);
      r.push(["ジャンル", esc((it.genres || []).join("・"))], ["配信日", esc(MS.fmtDate(it.releaseDate))]);
      if (it.series) r.push(["シリーズ", esc(it.series)]);
      if (it.volume) r.push(["ページ数など", esc(it.volume)]);
      if (it.rating) r.push(["評価", "★" + (+it.rating).toFixed(2) + '<span class="muted">（' + nf(it.votes) + "件）</span>"]);
      if (it.sales) r.push(["販売数", nf(it.sales)]);
      if (it.favs) r.push(["お気に入り登録", nf(it.favs) + "人"]);
      if (it.theme) r.push(["題材", esc(it.theme)]);
      if (it.price) r.push(["価格", esc(it.price) + "円"]);
    } else {
      r.push(["アーティスト", esc(it.artist)]);
      if (it.itunesGenre) r.push(["ジャンル", esc(it.itunesGenre)]);
      if (it.releaseDate) r.push(["発売日", esc(MS.fmtDate(it.releaseDate))]);
      if (it.album) r.push(["収録", esc(it.album)]);
      if (it.unit || it.vocal) r.push(["ボーカル", esc([it.vocal, it.unit].filter(Boolean).join("・"))]);
      r.push(["DAM 曲番号", esc(it.rn || it.id)]);
    }
    return r;
  }

  /* 人（アーティスト・サークル・作者・制作会社・監督・声優）の作品一覧 */
  const KIND_NM = { artist: "アーティスト", circle: "サークル", author: "作者", studio: "制作会社", director: "監督", cast: "出演・スタッフ" };
  SCREENS.person = async function (path) {
    const c = path[1], kind = path[2], name = path[3] || "";
    if (!CATS[c]) return SCREENS[""]();
    const gate = fanzaGate(c); if (gate) return gate;
    const rows = await R.byPerson(c, kind, name);
    let body = '<div class="glass fgroup" data-c="' + c + '" style="display:flex;align-items:center;gap:12px;padding:14px">' +
      '<span class="pav">' + ic(kind === "studio" ? "db" : "person") + '</span><span style="flex:1;min-width:0">' +
      '<b style="font-size:17px;font-weight:900;display:block">' + esc(name) + "</b>" +
      '<span class="muted">' + catPill(c) + esc(KIND_NM[kind] || "") + " · " + nf(rows.length) + CATS[c].unit + "</span></span>" +
      '<a class="btn sm" href="#/search?cat=' + c + "&q=" + encodeURIComponent(name) + '">' + ic("search") + "検索</a></div>";
    body += rows.length ? '<div class="list" id="rlist"></div><button class="loadmore" id="more" hidden>もっと見る</button>'
      : '<div class="empty">' + ic("person") + "<br>この人の作品はまだ取得していません</div>";
    return { head: head({ title: name || "関連作品", pill: c, fb: "#/rank/" + c }), body,
      after() { startPager(rows, (h) => simpleRow(h.item, h.rank, h.role ? '<div class="pv">' + esc(h.role) + "</div>" : ""), $("#rlist")); fillArt(rows.map((h) => h.item)); } };
  };
  SCREENS.person.loading = (path) => ({ head: head({ title: path[3] || "関連作品", pill: CATS[path[1]] ? path[1] : "anime", fb: "#/rank" }), body: skel(6) });

  /* ジャンルの画面（ジャンルの札を押したとき） */
  SCREENS.genre = async function (path) {
    const c = path[1], g = path[2] || "";
    if (!CATS[c]) return SCREENS[""]();
    const gate = fanzaGate(c); if (gate) return gate;
    const rows = await R.search(c, "", { genres: [g] }).catch(() => []);
    let body = '<div class="glass fgroup" data-c="' + c + '" style="display:flex;align-items:center;gap:12px;padding:14px">' + ic("tag") +
      '<span style="flex:1;min-width:0"><b style="font-size:17px;font-weight:900;display:block">' + esc(g) + '</b><span class="muted">' + catPill(c) + nf(rows.length) + CATS[c].unit + "</span></span>" +
      '<button class="btn sm" data-a="genreRank" data-c="' + c + '" data-v="' + esc(g) + '">' + ic("crown") + "ランキングで見る</button></div>";
    body += rows.length ? '<div class="list" id="rlist"></div><button class="loadmore" id="more" hidden>もっと見る</button>'
      : '<div class="empty">' + ic("tag") + "<br>このジャンルの作品はまだ取得していません</div>";
    return { head: head({ title: g, pill: c, fb: "#/rank/" + c }), body,
      after() { startPager(rows, (h) => simpleRow(h.item, h.rank), $("#rlist")); fillArt(rows.map((h) => h.item)); } };
  };
  SCREENS.genre.loading = (path) => ({ head: head({ title: path[2] || "ジャンル", pill: CATS[path[1]] ? path[1] : "anime", fb: "#/rank" }), body: skel(6) });

  /* 22・23. 検索 / 検索結果（検索対象のカテゴリーを必ず1つ選ぶ） */
  SCREENS.search = async function (path, q) {
    const cs = visCats();
    const c = cs.indexOf(q.cat) >= 0 ? q.cat : (cs.indexOf(S.lastCat) >= 0 ? S.lastCat : cs[0]);
    const qq = (q.q || "").trim();
    const gate = fanzaGate(c); if (gate) return gate;
    let body = '<div class="muted" style="margin:0 2px 6px;font-weight:800">検索対象</div>' + segCats(c, (cc) => "#/search?cat=" + cc + (qq ? "&q=" + encodeURIComponent(qq) : ""));
    body += '<form class="sbox" data-c="' + c + '" id="sform">' + ic("search") + '<input id="sq" type="search" enterkeyhint="search" autocomplete="off" placeholder="' +
      (c === "anime" ? "作品名（日本語・ローマ字）" : isAdultCat(c) ? "タイトル・作者・サークル" : "曲名・アーティスト（DAM のランキングから）") + '" value="' + esc(qq) + '">' +
      '<button type="button" class="clr" data-a="sclear" aria-label="入力を消す"' + (qq ? "" : " hidden") + ">" + ic("x") + "</button></form>";
    if (!qq) {
      const rec = S.recentQ[c] || [];
      if (rec.length) body += '<div class="sec"><h2>' + ic("clock") + "最近の検索</h2><button class=\"more\" data-a=\"rqclear\" data-c=\"" + c + '">消す</button></div><div class="kw">' + rec.map((k) => '<a class="chip sm" href="#/search?cat=' + c + "&q=" + encodeURIComponent(k) + '">' + esc(k) + "</a>").join("") + "</div>";
      body += '<div id="skw"></div>';
      return { head: head({ title: "検索" }), body, after() { bindSearch(c); searchKeywords(c); } };
    }
    S.lastCat = c;
    if (S.recentQ[c][0] !== qq) { S.recentQ[c] = [qq].concat(S.recentQ[c].filter((x) => x !== qq)).slice(0, 10); save(); }
    if (S.searchLog[0] !== qq) { S.searchLog = [qq].concat((S.searchLog || []).filter((x) => x !== qq)).slice(0, 30); save(); }
    let hits;
    try { hits = await R.search(c, qq, S.f[c]); } catch (e) { return { head: head({ title: "検索結果", pill: c, fb: "#/search?cat=" + c }), body: body + errCard(c, e), after() { bindSearch(c); } }; }
    const sc = sortOf(c);
    if (sc && sc !== "rank") hits = hits.slice().sort((a, b) => 0);
    body += '<div class="reshd">' + catPill(c) + "<span>「" + esc(qq) + "」の検索結果 " + nf(hits.length) + "件（" + esc(catName(c)) + "のみ・順位が無いものも出します）</span>" +
      '<a class="chip sm" href="#/filter/' + c + '">' + ic("filter") + "絞り込み</a></div>";
    body += hits.length ? '<div class="list" id="rlist"></div><button class="loadmore" id="more" hidden>もっと見る</button>' : '<div class="empty">' + ic("search") + "<br>見つかりませんでした</div>";
    return { head: head({ title: "検索結果", pill: c, fb: "#/search?cat=" + c }), body,
      after() { bindSearch(c); startPager(hits, (h) => simpleRow(h.item, h.rank), $("#rlist")); fillArt(hits.slice(0, 30).map((h) => h.item)); } };
  };
  async function searchKeywords(c) {
    const box = $("#skw"); if (!box) return;
    let h = "";
    try {
      if (!isAdultCat(c) || S.age) {
        const L = await R.list(c, c === "karaoke" ? { type: "rising", period: "day" } : { type: "rising", period: "day" });
        h += '<div class="sec"><h2>' + ic("fire") + catPill(c) + "注目のキーワード</h2></div><div class=\"kw\">" + L.entries.slice(0, 10).map((e) => '<a class="chip sm" href="#/search?cat=' + c + "&q=" + encodeURIComponent(c === "karaoke" ? e.item.title : e.item.title) + '">' + esc(e.item.title) + "</a>").join("") + "</div>";
      }
    } catch (e) {}
    const fc = isAdultCat(c) ? await R.facets(c).catch(() => ({ genres: [] })) : null;
    const gs = c === "anime" ? MS.ANIME_GENRES.slice(0, 9) : isAdultCat(c) ? fc.genres.slice(0, 24) : ["アニメ", "J-Pop", "ロック", "ボカロ", "アイドル", "演歌", "洋楽"];
    if (c !== "anime" && gs.length) h += '<div class="sec"><h2>' + (isAdultCat(c) ? "ジャンルから探す" : "キーワードの例") + '</h2></div><div class="kw">' + gs.map((g) => '<a class="chip sm" href="#/search?cat=' + c + "&q=" + encodeURIComponent(g) + '">' + esc(g) + "</a>").join("") + "</div>";
    if (c === "anime") h += '<div class="sec"><h2>ジャンルでランキングを見る</h2></div><div class="kw">' + gs.map((g) => '<button class="chip sm" data-a="agenre" data-v="' + esc(g) + '">' + esc(g) + "</button>").join("") + "</div>";
    if ($("#skw")) $("#skw").innerHTML = h;
  }
  function bindSearch(cat) {
    const f = $("#sform"), i = $("#sq");
    if (!f) return;
    f.onsubmit = (e) => { e.preventDefault(); const v = i.value.trim(); if (!v) return; i.blur(); go("#/search?cat=" + cat + "&q=" + encodeURIComponent(v)); };
    i.oninput = () => { const x = $(".sbox .clr"); if (x) x.hidden = !i.value; };
  }

  /* 24. ランキング推移 */
  let histRange = "1m";
  SCREENS.history = async function (path, q) {
    const cs = visCats();
    const c = cs.indexOf(path[1]) >= 0 ? path[1] : cs[0];
    const gate = fanzaGate(c); if (gate) return gate;
    const range = ["1w", "1m", "3m", "1y"].indexOf(q.range) >= 0 ? q.range : histRange;
    histRange = range;
    const L = await R.list(c, { type: "overall", period: CATS[c].mainPeriod });
    const favIds = Object.keys(S.fav[c] || {});
    const id = path[2] || favIds[0] || (L.entries[0] && L.entries[0].item.id);
    const picks = [];
    favIds.forEach((f) => picks.push({ id: f, title: S.fav[c][f].title, fav: 1 }));
    L.entries.slice(0, 10).forEach((e) => { keep(e.item); if (!picks.some((p) => p.id === e.item.id)) picks.push({ id: e.item.id, title: e.item.title }); });
    if (id && !picks.some((p) => p.id === id)) picks.unshift({ id, title: (ITEMS[c + ":" + id] || {}).title || id });
    const cur = picks.find((p) => p.id === id) || {};
    const h = id ? await R.history(c, id, range) : { points: [] };
    let body = segCats(c, (cc) => "#/history/" + cc);
    body += '<div class="chips" data-c="' + c + '">' + picks.slice(0, 18).map((p) => '<a class="chip sm' + (p.id === id ? " on" : "") + '" href="#/history/' + c + "/" + encodeURIComponent(p.id) + "?range=" + range + '">' + (p.fav ? "♥ " : "") + esc(String(p.title).length > 14 ? String(p.title).slice(0, 13) + "…" : p.title) + "</a>").join("") + "</div>";
    body += '<div class="glass chartbox" data-c="' + c + '" style="margin-top:6px"><div class="hd"><b>' + esc(cur.title || "") + "</b></div>" + rtabs(range, "hrange") + lineChart(h.points, { h: 210 }) + '<div class="note" style="margin:4px 4px 0">' + esc(h.note || "") + "</div></div>";
    const rows = h.points.slice().reverse();
    if (rows.length) body += '<div class="list">' + rows.map((p, i) => {
      const prev = rows[i + 1];
      const d = prev && prev.rank && p.rank ? prev.rank - p.rank : null;
      const mvh = !p.rank ? '<span class="mv flat">圏外</span>' : d == null ? '<span class="mv flat">—</span>' : d > 0 ? '<span class="mv up">↑' + d + "</span>" : d < 0 ? '<span class="mv down">↓' + -d + "</span>" : '<span class="mv flat">→</span>';
      return '<div class="row" style="padding:10px 8px"><div class="bd"><div class="t" style="font-size:13px">' + esc(p.date) + '</div></div><b class="num" style="font-size:18px">' + (p.rank ? p.rank + "位" : "—") + "</b>" + mvh + "</div>";
    }).join("") + "</div>";
    if (id) body += '<a class="btn full" style="margin-top:12px" href="#/item/' + c + "/" + encodeURIComponent(id) + '">詳細を見る</a>';
    return { head: head({ title: "ランキング推移", fb: "#/me" }), body };
  };
  SCREENS.history.loading = (path) => ({ head: head({ title: "ランキング推移", fb: "#/me" }), body: segCats(CATS[path[1]] ? path[1] : visCats()[0], (cc) => "#/history/" + cc) + '<div class="skel" style="height:260px"></div>' });

  /* 25. ランキング比較（同じカテゴリーの中だけ） */
  SCREENS.compare = async function (path, q) {
    const cs = visCats();
    const c = cs.indexOf(path[1]) >= 0 ? path[1] : cs[0];
    const gate = fanzaGate(c); if (gate) return gate;
    const C = CATS[c];
    const pair = C.compare.find((p) => p.id === q.pair) || C.compare.find((p) => p.def);
    const types = c === "anime" && !pair.type ? C.types.filter((t) => ["overall", "new", "season"].indexOf(t.id) >= 0) : [];
    const type = types.find((t) => t.id === q.type) || types[0] || null;
    const qs = (o) => "#/compare/" + c + "?pair=" + (o.pair || pair.id) + (type ? "&type=" + (o.type || type.id) : "");
    let body = segCats(c, (cc) => "#/compare/" + cc);
    body += '<div class="chips" data-c="' + c + '">' + C.compare.map((p) => '<a class="chip' + (p.id === pair.id ? " on" : "") + '" href="' + qs({ pair: p.id }) + '">' + p.label + "</a>").join("") + "</div>";
    if (types.length > 1) body += '<div class="chips" data-c="' + c + '">' + types.map((t) => '<a class="chip sm' + (t.id === type.id ? " on" : "") + '" href="' + qs({ type: t.id }) + '">' + t.label + "</a>").join("") + "</div>";
    const r = await R.compare(c, pair, type && type.id);
    const cur = r.cur;
    if (!r.available) {
      body += '<div class="glass fgroup" data-c="' + c + '" style="text-align:center;padding:18px 14px"><h3 style="justify-content:center">まだ比べる記録がありません</h3><p class="note" style="line-height:1.8">「' + esc(pair.label) + "」は、自動取得が" + (pair.days ? pair.days + "日前の" : "前の日の") + "記録を残してから比べられます（毎日少しずつたまります）。いまの順位は下のとおりです。</p></div>";
      body += '<div class="list">' + cur.entries.slice(0, 30).map(rowCard).join("") + "</div>";
      return { head: head({ title: "ランキング比較", fb: "#/rank/" + c }), body, after() { fillArt(cur.entries.slice(0, 30).map((e) => e.item)); } };
    }
    const top10 = cur.entries.slice(0, 10);
    const pset = {}; r.prevTop.forEach((it) => { pset[it.id] = 1; });
    const inN = top10.filter((e) => !pset[e.item.id]).length;
    const top50 = cur.entries.slice(0, 50);
    const best = top50.filter((e) => e.rankChange != null).sort((a, b) => b.rankChange - a.rankChange)[0];
    const newc = top50.filter((e) => e.isNew).length;
    body += '<div class="cmpsum" data-c="' + c + '"><div class="stat glass cur"><small>TOP10入れかわり</small><b class="num">' + inN + "<i>" + C.unit + '</i></b></div><div class="stat glass"><small>TOP50 初登場</small><b class="num">' + newc + "<i>" + C.unit + '</i></b></div><div class="stat glass"><small>最大上昇</small><b class="num" style="color:var(--up)">' + (best && best.rankChange > 0 ? "↑" + best.rankChange : "–") + "</b></div></div>";
    body += '<div class="glass chartbox" data-c="' + c + '"><div class="hd"><b>' + esc(r.prevLabel) + " → " + esc(r.curLabel) + "（TOP10）</b></div>" + slope(r.prevTop, top10) + "</div>";
    body += '<div class="sec"><h2>順位変動（TOP30）</h2></div><div class="list">' + cur.entries.slice(0, 30).map(rowCard).join("") + "</div>";
    return { head: head({ title: "ランキング比較", fb: "#/rank/" + c }), body, after() { fillArt(cur.entries.slice(0, 30).map((e) => e.item)); } };
  };
  SCREENS.compare.loading = (path) => ({ head: head({ title: "ランキング比較", fb: "#/rank" }), body: segCats(CATS[path[1]] ? path[1] : visCats()[0], (cc) => "#/compare/" + cc) + '<div class="skel" style="height:330px"></div>' });
  function slope(prevTop, curTop) {
    const W = 340, rowH = 30, H = rowH * 10 + 20, lx = 150, rx = 190;
    const cut = (t) => { t = String(t || ""); return t.length > 9 ? t.slice(0, 8) + "…" : t; };
    const curRank = {}; curTop.forEach((e) => { curRank[e.item.id] = e.rank; });
    const prevRank = {}; prevTop.forEach((it, i) => { prevRank[it.id] = i + 1; });
    const y = (r) => 16 + (r - 1) * rowH;
    let s = '<svg class="slope" viewBox="0 0 ' + W + " " + H + '">';
    prevTop.forEach((it, i) => {
      const pr = i + 1, cr = curRank[it.id];
      const col = !cr ? "var(--down)" : cr < pr ? "var(--up)" : cr > pr ? "var(--down)" : "var(--flat)";
      s += '<line class="s" x1="' + lx + '" y1="' + y(pr) + '" x2="' + rx + '" y2="' + (cr ? y(cr) : H - 4) + '" stroke="' + col + '" opacity="' + (cr ? 0.9 : 0.35) + '"/>';
      s += '<text class="rn" x="4" y="' + (y(pr) + 4) + '">' + pr + '</text><text x="22" y="' + (y(pr) + 4) + '">' + esc(cut(it.title)) + "</text>";
      s += '<circle cx="' + lx + '" cy="' + y(pr) + '" r="3.5" fill="' + col + '"/>';
    });
    curTop.forEach((e) => {
      const was = prevRank[e.item.id];
      if (!was) s += '<line class="s" x1="' + (lx + 8) + '" y1="' + (H - 4) + '" x2="' + rx + '" y2="' + y(e.rank) + '" stroke="var(--newc)" stroke-dasharray="3 3" opacity=".8"/>';
      s += '<circle cx="' + rx + '" cy="' + y(e.rank) + '" r="3.5" fill="' + (was ? "var(--c)" : "var(--newc)") + '"/><text class="rn" x="' + (rx + 8) + '" y="' + (y(e.rank) + 4) + '">' + e.rank + '</text><text x="' + (rx + 26) + '" y="' + (y(e.rank) + 4) + '">' + esc(cut(e.item.title)) + "</text>";
    });
    return s + "</svg>";
  }

  /* 26. お気に入り（カテゴリーごとに分けて表示） */
  SCREENS.fav = async function (path, q) {
    const cs = visCats();
    const sel = cs.indexOf(q.cat) >= 0 ? q.cat : "all";
    let body = segCats(sel, (cc) => cc === "all" ? "#/fav" : "#/fav?cat=" + cc, true);
    const show = sel === "all" ? cs : [sel];
    let any = false;
    for (const c of show) {
      const ids = Object.keys(S.fav[c] || {}).sort((a, b) => S.fav[c][b].t - S.fav[c][a].t);
      if (sel === "all" && !ids.length) continue;
      any = any || ids.length > 0;
      if (isAdultCat(c) && !S.age && ids.length) { body += '<div class="favsec" data-c="' + c + '"><h3>' + catPill(c) + '<span class="n">' + ids.length + '件</span></h3><div class="note" style="padding:6px 4px 10px">年齢の確認のあとで表示します</div></div>'; continue; }
      body += '<div class="favsec" data-c="' + c + '"><h3>' + catPill(c) + esc(isAdultCat(c) ? "同人" : CATS[c].ja) + '<span class="n">' + ids.length + '件</span></h3><div id="fav-' + c + '">' +
        (ids.length ? ids.map((id) => { const f = S.fav[c][id]; return simpleRow({ id, category: c, title: f.title, image: f.image, _sub: f.sub }, null, '<div class="pv">' + esc(f.sub || "") + "</div>"); }).join("")
          : '<div class="note" style="padding:8px 4px 12px">まだありません。ランキングの ♡ から登録できます。</div>') + "</div></div>";
    }
    if (!any && sel === "all") body += '<div class="empty">' + ic("heart") + "<br>お気に入りはまだありません。<br>ランキングや詳細の ♡ から登録できます。<br><br><a class=\"btn pri\" href=\"#/rank\">ランキングを見る</a></div>";
    return { head: head({ title: "お気に入り" }), body, after() { favRanks(show); } };
  };
  /* 描いたあとで、いまの順位を入れる */
  async function favRanks(cats) {
    const seq = renderSeq;
    for (const c of cats) {
      if (isAdultCat(c) && !S.age) continue;
      const ids = Object.keys(S.fav[c] || {}); if (!ids.length) continue;
      try {
        const L = await R.list(c, { type: c === "karaoke" ? "weekly" : "overall", period: CATS[c].mainPeriod });
        if (seq !== renderSeq) return;
        const byId = {}; L.entries.forEach((e) => { byId[e.item.id] = e; });
        ids.forEach((id) => {
          const row = $('#fav-' + c + ' [data-id="' + cssq(id) + '"]'); if (!row) return;
          const e = byId[id], rk = row.closest(".row").querySelector(".rk");
          if (e) { rk.innerHTML = '<span class="n num" style="font-size:16px">' + e.rank + "</span>" + mv(e); }
        });
      } catch (e) {}
    }
  }

  /* 27. トレンド（カテゴリー別） */
  SCREENS.trend = async function (path, q) {
    const cs = visCats();
    const c = cs.indexOf(q.cat) >= 0 ? q.cat : cs[0];
    const gate = fanzaGate(c); if (gate) return gate;
    const T = await R.trends(c);
    const lead = { anime: ["アニメトレンド", "今話題になっているアニメ"], fanza: ["FANZA同人トレンド", "現在注目されている本"], karaoke: ["カラオケトレンド", "いま歌われている人気曲・急上昇曲"] }[c];
    let body = segCats(c, (cc) => "#/trend?cat=" + cc);
    body += '<div class="lead glass" data-c="' + c + '"><b>' + ic("fire") + " " + lead[0] + "</b><small>" + lead[1] + "（" + esc(T.lead || "") + "）</small></div>";
    if (T.genres.length) body += '<div class="sec"><h2>話題のジャンル</h2></div><div class="cloud glass" data-c="' + c + '">' + T.genres.map((g, i) => '<span style="font-size:' + (15 - Math.min(i, 5)) + 'px">#' + esc(g.g) + "</span>").join("") + "</div>";
    body += '<div class="list" data-c="' + c + '">' + T.list.map((x, i) => {
      keep(x.item);
      return '<a class="trow" href="' + itemHref(x.item) + '"><span class="no num">' + (i + 1) + '</span><span class="art" style="width:46px;flex:none;border-radius:10px;overflow:hidden;aspect-ratio:' + (c === "karaoke" ? "1/1" : "3/4") + '">' + img(x.item) + "</span>" +
        '<span style="flex:1;min-width:0"><span class="t" style="font-size:13.5px;font-weight:800;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(x.item.title) + '</span><span class="muted" style="font-size:11px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' +
        esc([x.text, subText(x.item), x.rank ? "総合 " + x.rank + "位" : ""].filter(Boolean).join(" · ")) + '</span><span class="heat"><i style="width:' + x.heat + '%"></i></span></span>' +
        (x.spark ? '<svg class="spark" viewBox="0 0 64 26"><path d="' + sparkPath(x.spark) + '"/></svg>' : "") + "</a>";
    }).join("") + "</div>";
    return { head: head({ title: "トレンド", fb: "#/" }), body, after() { fillArt(T.list.map((x) => x.item)); } };
  };
  SCREENS.trend.loading = (path, q) => ({ head: head({ title: "トレンド", fb: "#/" }), body: segCats(visCats().indexOf(q.cat) >= 0 ? q.cat : visCats()[0], (cc) => "#/trend?cat=" + cc) + skel(8) });

  /* 28. 通知（カテゴリーの札つき・絞りこみ可） */
  let noticeMemo = null;
  async function buildNotices() {
    if (noticeMemo && Date.now() - noticeMemo.at < 120e3) return noticeMemo.v;
    const out = [];
    const day = MS.T;
    await Promise.all(visCats().map(async (c) => {
      if (isAdultCat(c) && !S.age) return;
      const nm = catName(c);
      try {
        const L = await R.list(c, { type: c === "karaoke" ? "daily" : "overall", period: CATS[c].mainPeriod });
        const top = L.entries[0];
        if (top && S.set.notif.trend) out.push({ id: "top:" + c + ":" + day + ":" + top.item.id, c, it: top.item, t: "「" + top.item.title + "」が" + nm + (c === "karaoke" ? "デイリー" : "総合") + "ランキングで1位" + (top.prevKnown && top.previousRank === 1 ? "をキープ" : top.prevKnown ? "に（前回 " + (top.previousRank ? top.previousRank + "位" : "圏外") + "）" : "") });
        if (S.set.notif.fresh) {
          const N = await R.list(c, { type: "new", period: c === "karaoke" ? "day" : c === "anime" ? "day" : undefined });
          N.entries.slice(0, 2).forEach((e) => out.push({ id: "new:" + c + ":" + day + ":" + e.item.id, c, it: e.item, t: (c === "anime" ? "新作" : isAdultCat(c) ? "新刊" : "新曲") + "「" + e.item.title + "」が" + (c === "anime" ? "新作" : isAdultCat(c) ? "新刊" : "新曲") + "ランキング " + e.rank + "位" + (e.isNew ? "に初登場" : "") }));
        }
        if (S.set.notif.trend) {
          const Rr = await R.list(c, { type: "rising", period: "day" });
          Rr.entries.slice(0, 1).forEach((e) => out.push({ id: "rise:" + c + ":" + day + ":" + e.item.id, c, it: e.item, t: "「" + e.item.title + "」が急上昇中（" + nm + "急上昇ランキング1位）" }));
        }
        if (S.set.notif.fav) {
          const byId = {}; L.entries.forEach((e) => { byId[e.item.id] = e; });
          Object.keys(S.fav[c] || {}).forEach((id) => {
            const e = byId[id]; if (!e || !e.prevKnown || e.rankChange == null || Math.abs(e.rankChange) < 3) return;
            out.push({ id: "fav:" + c + ":" + day + ":" + id, c, it: e.item, fav: 1, t: "お気に入りの「" + e.item.title + "」が " + e.rank + "位に" + (e.rankChange > 0 ? "ランクアップ" : "ダウン") + "（前回 " + e.previousRank + "位）" });
          });
        }
      } catch (e) {}
    }));
    out.sort((a, b) => (b.fav || 0) - (a.fav || 0) || MS.CAT_IDS.indexOf(a.c) - MS.CAT_IDS.indexOf(b.c));
    noticeMemo = { at: Date.now(), v: out };
    return out;
  }
  SCREENS.notice = async function (path, q) {
    const cs = visCats();
    const sel = cs.indexOf(q.cat) >= 0 ? q.cat : "all";
    const all = await buildNotices();
    const list = sel === "all" ? all : all.filter((n) => n.c === sel);
    let body = segCats(sel, (cc) => cc === "all" ? "#/notice" : "#/notice?cat=" + cc, true);
    body += list.length ? '<div class="list">' + list.map((n) => { keep(n.it); return '<a class="nrow' + (S.read[n.id] ? " read" : "") + '" data-c="' + n.c + '" data-nid="' + esc(n.id) + '" href="' + itemHref(n.it) + '"><span class="dot"></span><span class="bd"><span class="t">' + esc(n.t) + '</span><span class="s">' + catPill(n.c) + "今日" + (n.fav ? " · お気に入り" : "") + "</span></span></a>"; }).join("") + "</div>"
      : '<div class="empty">' + ic("bell") + "<br>お知らせはありません</div>";
    const actions = '<button class="ib" data-a="readall" aria-label="すべて既読">' + ic("check") + "</button>";
    return { head: head({ title: "通知", actions, fb: "#/" }), body };
  };
  SCREENS.notice.loading = () => ({ head: head({ title: "通知", fb: "#/" }), body: skel(6) });
  async function paintBell() {
    const b = $("#bellBd"); if (!b) return;
    const all = await buildNotices().catch(() => []);
    const n = all.filter((x) => !S.read[x.id]).length;
    const b2 = $("#bellBd"); if (!b2) return;
    b2.hidden = !n; b2.textContent = n > 9 ? "9+" : n;
  }

  /* 29. マイページ */
  SCREENS.me = async function () {
    let acc = null; try { acc = JSON.parse(localStorage.getItem("xeva_account_v1") || "null"); } catch (e) {}
    const name = (acc && acc.name) || "MagiScope ユーザー";
    const v = S.views | 0, lv = 1 + Math.floor(Math.sqrt(v / 2)), base = 2 * (lv - 1) * (lv - 1), nxt = 2 * lv * lv;
    const pct = Math.round(100 * (v - base) / Math.max(1, nxt - base));
    const cs = visCats();
    let body = '<div class="prof glass"><span class="av">' + esc(name.slice(0, 1)) + '</span><span style="flex:1;min-width:0"><b>' + esc(name) + '</b><span class="lv"><span class="num">Lv.' + lv + '</span><span class="bar"><i style="width:' + pct + '%"></i></span><span class="num">' + v + "/" + nxt + "</span></span></span></div>";
    body += '<div class="cnt3" style="grid-template-columns:repeat(' + cs.length + ',1fr)">' + cs.map((c) => '<a class="stat glass" data-c="' + c + '" href="#/fav?cat=' + c + '"><small>' + catPill(c) + '</small><b class="num" style="color:var(--c)">' + Object.keys(S.fav[c] || {}).length + "<i>件</i></b></a>").join("") + "</div>";
    const hist = S.hist.filter((h) => cs.indexOf(h.c) >= 0 && (!isAdultCat(h.c) || S.age));
    if (hist.length) {
      body += '<div class="sec"><h2>' + ic("clock") + "閲覧履歴</h2><button class=\"more\" data-a=\"hclear\">消す</button></div>";
      cs.forEach((c) => {
        const hs = hist.filter((h) => h.c === c).slice(0, 12);
        if (!hs.length) return;
        body += '<div class="muted" style="margin:4px 2px 6px">' + catPill(c) + '</div><div class="hist">' + hs.map((h) => { const it = keep(Object.assign({ id: h.id, category: c, title: h.title, image: h.image }, ITEMS[c + ":" + h.id] || {})); return '<a class="pcard" data-c="' + c + '" href="' + itemHref(it) + '" style="width:84px"><div class="art" style="width:84px">' + img(it) + '</div><div class="t" style="font-size:11px">' + esc(it.title) + "</div></a>"; }).join("") + "</div>";
      });
    }
    body += '<div class="sec"><h2>' + ic("star") + "好みのジャンル</h2></div><p class=\"note\" style=\"margin:-4px 2px 8px\">選んだジャンルの注目作品がホームに出ます（カテゴリーごと）。</p>";
    const fzg = {};
    for (const c of ["fanza", "dlsite"]) {
      if (cs.indexOf(c) >= 0 && S.age) fzg[c] = ((await R.facets(c).catch(() => ({ genres: [] }))).genres || []).slice(0, 30);
    }
    cs.forEach((c) => {
      const gs = c === "anime" ? MS.ANIME_GENRES : (c === "fanza" || c === "dlsite") ? fzg[c] || [] : MS.KARA_GENRES;
      if (!gs.length) return;
      body += '<div class="prefcat" data-c="' + c + '"><h3>' + catPill(c) + '</h3><div class="chips wrap">' + gs.map((g) => '<button class="chip sm' + (S.prefs[c].indexOf(g) >= 0 ? " on" : "") + '" data-a="pref" data-c="' + c + '" data-v="' + esc(g) + '">' + esc(g) + "</button>").join("") + "</div></div>";
    });
    body += '<div class="glass menu">' +
      menuLink("#/fav", "heart", "お気に入り", "カテゴリー別に保存した作品") +
      menuLink("#/history", "chart", "ランキング推移", "1週間 / 1か月 / 3か月 / 1年間") +
      menuLink("#/compare", "compare", "ランキング比較", "同じカテゴリーの中で比べる") +
      menuLink("#/trend", "fire", "トレンド", "カテゴリー別の話題") +
      menuLink("#/notice", "bell", "通知", "") +
      menuLink("#/settings", "gear", "設定", "通知・表示・データソース") +
      '<a href="../index.html"><span class="ico">' + ic("exit") + '</span><span class="lb">XEVARION へもどる</span><span class="rt">' + ic("chev") + "</span></a></div>";
    return { head: head({ title: "マイページ", fb: "#/" }), body };
  };
  const menuLink = (href, icon, label, sub) => '<a href="' + href + '"><span class="ico">' + ic(icon) + '</span><span class="lb">' + label + (sub ? "<small>" + sub + "</small>" : "") + '</span><span class="rt">' + ic("chev") + "</span></a>";
  const toggle = (k, label, sub, on, icon) => '<label><span class="ico">' + ic(icon) + '</span><span class="lb">' + label + (sub ? "<small>" + sub + "</small>" : "") + '</span><span class="tg"><input type="checkbox" data-a="set" data-k="' + k + '"' + (on ? " checked" : "") + "><span></span></span></label>";

  /* 30. 設定 */
  SCREENS.settings = async function () {
    const nfv = S.set.notif;
    let body = '<div class="glass menu"><h4>通知設定</h4>' +
      toggle("notif.fav", "お気に入りの順位変動", "3位以上動いたとき", nfv.fav, "heart") +
      toggle("notif.fresh", "新作・新刊・新曲", "各ランキングの上位", nfv.fresh, "spark") +
      toggle("notif.trend", "トレンド・1位", "急上昇と1位", nfv.trend, "fire") + "</div>";
    body += '<div class="glass menu"><h4>表示設定</h4>' +
      toggle("theme", "ダークモード", "オフで明るい表示", S.set.theme !== "light", "moon") +
      toggle("big3", "上位3件を大きく表示", "ランキングの1〜3位", S.set.big3, "crown") +
      toggle("fanza", "FANZA カテゴリーを表示", "オフでホーム・ランキングから隠す", S.set.fanza, "eye") +
      toggle("dlsite", "DLsite カテゴリーを表示", "オフでホーム・ランキングから隠す", S.set.dlsite !== false, "eye") +
      '<button data-a="ageReset"><span class="ico">' + ic("shield") + '</span><span class="lb">年齢の確認をやり直す<small>' + (S.age ? "確認ずみ" : "未確認") + '</small></span><span class="rt">' + ic("chev") + "</span></button></div>";
    body += '<div class="glass menu" id="srcBox"><h4>データソース</h4>' +
      srcRow("anime", "AniList（トレンド・直接）", "stAl", "直接") +
      srcRow("anime", "Annict（国内の視聴者数）", "stAn", "…") +
      srcRow("fanza", "FANZA同人 ランキングページ", "stFz", "…") +
      srcRow("dlsite", "DLsite 同人 ランキングページ", "stDl", "…") +
      srcRow("anime", "Filmarks（国内の評価・レビュー）", "stFm", "…") +
      srcRow("karaoke", "カラオケ DAM ランキングページ", "stKa", "…") +
      '<p class="note" style="padding:8px">カラオケ・FANZA・国内アニメは、1時間ごとの自動取得が各サイトの公開ページから集めたものです（API キーは使いません）。手順は MagiScope/collector/README.md。</p></div>';
    body += '<div class="glass menu"><h4>データの管理</h4>' +
      '<button data-a="cacheClear"><span class="ico">' + ic("reload") + '</span><span class="lb">最新のランキングを取り直す<small>端末に控えたランキングを消します</small></span></button>' +
      '<button data-a="hclear"><span class="ico">' + ic("clock") + '</span><span class="lb">閲覧履歴を消す<small>' + S.hist.length + '件</small></span></button>' +
      '<button data-a="favclear"><span class="ico">' + ic("trash") + '</span><span class="lb">お気に入りをすべて消す<small>' + MS.CAT_IDS.reduce((a, c) => a + Object.keys(S.fav[c]).length, 0) + '件</small></span></button>' +
      '<button data-a="fclearAll"><span class="ico">' + ic("filter") + '</span><span class="lb">絞り込み条件をすべて戻す</span></button></div>';
    body += '<div class="glass menu"><h4>アプリ情報</h4>' +
      '<button data-a="help"><span class="ico">' + ic("help") + '</span><span class="lb">ヘルプ</span><span class="rt">' + ic("chev") + "</span></button>" +
      '<div style="display:flex;align-items:center;gap:12px;padding:13px 8px"><span class="ico" style="width:34px;height:34px;border-radius:11px;display:grid;place-items:center;background:var(--glass2)">' + ic("info") + '</span><span class="lb" style="flex:1;font-weight:800">MagiScope<small style="display:block;font-size:10.5px;color:var(--faint);font-weight:600">バージョン 1.2.0（2026-09-20）· 実データ・自動取得版 · XEVARION</small></span></div></div>';
    return { head: head({ title: "設定", fb: "#/me" }), body, after() { srcStatus(); } };
  };
  const srcRow = (c, label, id, v) => '<div style="display:flex;align-items:center;gap:10px;padding:11px 8px;border-bottom:1px solid var(--line)">' + catPill(c) +
    '<span class="lb" style="flex:1;font-size:12.5px;font-weight:700">' + label + '</span><span class="muted" id="' + id + '">' + v + "</span></div>";
  async function srcStatus() {
    const st = await R.status();
    const set = (id, t) => { const el = $("#" + id); if (el) el.textContent = t; };
    if (!st.ok) { const t = st.code === "nodata" ? "まだ動いていません" : "読めません"; ["stAn", "stFz", "stKa", "stDl", "stFm"].forEach((i) => set(i, t)); return; }
    const at = (x) => (x ? MS.agoLabel(x) + "に更新" : "まだ取得していません");
    set("stAn", at(st.animeAt)); set("stFz", at(st.fanzaAt)); set("stKa", at(st.karaokeAt));
    set("stDl", at(st.dlsiteAt)); set("stFm", at(st.animeAt));
  }

  /* ══════════ 操作（data-a ひとつで受ける） ══════════ */
  const ACT = {
    back: (b) => back(b.dataset.fb),
    retry: () => { R.clearCache(); render(); },
    fav: (b) => toggleFav(b.dataset.c, b.dataset.id),
    ageOK: () => { S.age = true; save(); render(); },
    showFanza: () => { S.set.fanza = true; save(); render(); },
    klist: (b) => { S.f.karaoke = Object.assign({}, S.f.karaoke, { list: b.dataset.v }); save(); render(); },
    agenre: (b) => { S.f.anime = Object.assign({}, S.f.anime, { genres: [b.dataset.v] }); save(); go("#/rank/anime"); },
    sortby: (b) => { S.sort[b.dataset.c] = b.dataset.v; save(); render(); },
    fflag: (b) => { draft[b.dataset.k] = b.dataset.v || ""; $$('[data-a="fflag"][data-k="' + b.dataset.k + '"]').forEach((x) => x.classList.toggle("on", x === b)); fPreview(curCat()); },
    genreRank: (b) => { const c = b.dataset.c; S.f[c] = Object.assign({}, S.f[c], { genres: [b.dataset.v] }); save(); go("#/rank/" + c); },
    samp: (b) => sheet('<h2>' + ic("image") + ' サンプル</h2><img src="' + esc(b.dataset.u) + '" alt="" referrerpolicy="no-referrer" style="width:100%;border-radius:12px;display:block">' +
      '<div class="btns" style="margin-top:12px"><button class="btn pri" data-a="closeSheet">とじる</button></div>'),
    fclear: (b) => { const keepList = b.dataset.c === "karaoke" ? { list: S.f.karaoke.list || "" } : {}; S.f[b.dataset.c] = keepList; save(); render(); },
    fdel: (b) => {
      const c = b.dataset.c, F = S.f[c], k = b.dataset.k;
      if (k === "year") { delete F.yearFrom; delete F.yearTo; }
      else if (k.indexOf(":") > 0) { const kk = k.slice(0, k.indexOf(":")), v = k.slice(k.indexOf(":") + 1); F[kk] = (F[kk] || []).filter((x) => x !== v); }
      else delete F[k];
      save(); render();
    },
    ftog: (b) => {
      const k = b.dataset.k, v = b.dataset.v;
      const a = draft[k] = draft[k] || [];
      const i = a.indexOf(v);
      if (i >= 0) a.splice(i, 1); else a.push(v);
      b.classList.toggle("on", i < 0);
      fPreview(curCat());
    },
    fone: (b) => {
      const same = draft[b.dataset.k] === b.dataset.v;
      draft[b.dataset.k] = same ? "" : b.dataset.v;      /* もう一度押すと外れる */
      $$('[data-a="fone"][data-k="' + b.dataset.k + '"]').forEach((x) => x.classList.toggle("on", !same && x === b));
      const inp = $('[data-a="ftext"][data-k="' + b.dataset.k + '"]'); if (inp) inp.value = draft[b.dataset.k] || "";
      fPreview(curCat());
    },
    freset: () => { draft = {}; $$("#view .chip.on").forEach((x) => x.classList.remove("on")); $$("#view .inp").forEach((x) => { x.value = ""; }); $$("#view select").forEach((x) => { x.value = ""; }); fPreview(curCat()); },
    fapply: (b) => {
      const c = b.dataset.c;
      const clean = {};
      Object.keys(draft || {}).forEach((k) => { const v = draft[k]; if (Array.isArray(v) ? v.length : v) clean[k] = v; });
      S.f[c] = clean; save();
      toast(filterCount(c, clean) ? "絞り込みました" : "条件をクリアしました");
      if (stack.length > 1 && /^#\/rank\//.test(stack[stack.length - 2])) history.back(); else go("#/rank/" + c);
    },
    drange: (b) => {
      detailRange = b.dataset.v;
      const cur = ($("#view").dataset.cur || "/"), c = cur.slice(0, cur.indexOf("/")), id = cur.slice(cur.indexOf("/") + 1);
      $$(".rtabs button").forEach((x) => x.classList.toggle("on", x === b));
      $("#dchart").innerHTML = '<div class="skel" style="height:150px"></div>';
      R.history(c, id, detailRange).then((h) => { const el = $("#dchart"); if (el) el.innerHTML = lineChart(h.points); const n = $("#dnote"); if (n) n.textContent = h.note || ""; })
        .catch((e) => { const el = $("#dchart"); if (el) el.innerHTML = '<div class="empty" style="padding:20px">' + esc(e.code === "nodata" ? "この期間の推移は自動取得の記録から出します（まだありません）" : e.message) + "</div>"; });
    },
    hrange: (b) => { const p = parse(location.hash); go("#/" + p.path.map(encodeURIComponent).join("/") + "?range=" + b.dataset.v); },
    sclear: () => { const i = $("#sq"); if (i) { i.value = ""; i.focus(); } const x = $(".sbox .clr"); if (x) x.hidden = true; },
    rqclear: (b) => { S.recentQ[b.dataset.c] = []; save(); render(); },
    readall: async () => { (await buildNotices()).forEach((n) => { S.read[n.id] = 1; }); trimRead(); save(); render(); },
    pref: (b) => { const c = b.dataset.c, v = b.dataset.v, a = S.prefs[c]; const i = a.indexOf(v); if (i >= 0) a.splice(i, 1); else a.push(v); b.classList.toggle("on", i < 0); save(); },
    hclear: async () => { if (!(await ask("閲覧履歴を消します", "これまでに見た作品の履歴をすべて消します。", "消す"))) return; S.hist = []; save(); render(); toast("閲覧履歴を消しました"); },
    favclear: async () => { if (!(await ask("お気に入りをすべて消します", "3つのカテゴリーのお気に入りをすべて外します。もとに戻せません。", "すべて消す"))) return; MS.CAT_IDS.forEach((c) => { S.fav[c] = {}; }); save(); render(); toast("お気に入りを消しました"); },
    fclearAll: () => { MS.CAT_IDS.forEach((c) => { S.f[c] = {}; }); save(); toast("絞り込み条件を戻しました"); },
    cacheClear: () => { R.clearCache(); noticeMemo = null; toast("ランキングを取り直します"); },
    ageReset: () => { S.age = false; save(); render(); toast("次に FANZA を開くときに確認します"); },
    help: () => sheet("<h2>" + ic("help") + " MagiScope の使いかた</h2><p><b>ANIME・FANZA同人・KARAOKE</b> の3つのランキングを、それぞれ別の出典から取得しています（カテゴリーをまたいだ順位はありません）。<br><br>" +
      "・アニメ＝「国内」は Annict の視聴者数（国内のアニメ視聴記録サービス）、「総合」などは AniList のトレンド（日本の作品）です。<br>・FANZA同人＝DMM の API（既定はコミック）。<br>・カラオケ＝カラオケ DAM の公開ランキング。ジャケット・発売日は iTunes から補っています。<br>" +
      "・カラオケ・FANZA・国内アニメは1時間ごとの自動取得で更新されます。前回順位＝前の日までの記録、推移＝日ごとの記録です。記録が無いあいだは「—」と表示されます。<br>" +
      "・お気に入り・履歴・設定は XEVARION のアカウントで同期されます。</p><div class=\"btns\"><button class=\"btn pri\" data-a=\"closeSheet\">とじる</button></div>"),
    closeSheet: () => closeSheet(),
  };
  function curCat() { return parse(location.hash).path[1]; }
  function trimRead() { const ks = Object.keys(S.read); if (ks.length > 400) ks.slice(0, ks.length - 400).forEach((k) => delete S.read[k]); }

  document.addEventListener("click", (e) => {
    const g = e.target.closest("[data-go]");
    if (g && !e.target.closest("[data-a]")) { e.preventDefault(); go(g.dataset.go); return; }
    const b = e.target.closest("[data-a]");
    if (b && ACT[b.dataset.a] && b.tagName !== "INPUT" && b.tagName !== "SELECT") { e.preventDefault(); ACT[b.dataset.a](b); return; }
    const n = e.target.closest("[data-nid]");
    if (n) { S.read[n.dataset.nid] = 1; trimRead(); save(); }
    const tab = e.target.closest(".bnav button");
    if (tab) { const to = { home: "#/", rank: "#/rank", search: "#/search", fav: "#/fav", me: "#/me" }[tab.dataset.tab]; if (to) go(to); }
  });
  document.addEventListener("input", (e) => {
    const t = e.target;
    if (t.dataset && t.dataset.a === "ftext") { draft[t.dataset.k] = t.value.trim(); fPreview(curCat()); }
  });
  document.addEventListener("change", (e) => {
    const t = e.target;
    if (!t.dataset) return;
    if (t.dataset.a === "fyear") { draft[t.dataset.k] = t.value ? Number(t.value) : ""; fPreview(curCat()); }
    if (t.dataset.a === "set") {
      const k = t.dataset.k;
      if (k === "theme") { S.set.theme = t.checked ? "dark" : "light"; applyTheme(); }
      else if (k.indexOf("notif.") === 0) { S.set.notif[k.slice(6)] = t.checked; noticeMemo = null; }
      else S.set[k] = t.checked;
      save();
    }
  });
  $("#ov").addEventListener("click", (e) => { if (e.target.id === "ov") closeSheet(); });

  /* ★ クラウドから書き戻されたら読み直す（絞り込み・設定の入力中は描き直さない） */
  function reloadFromStore() {
    S = load(); applyTheme();
    const p0 = parse(location.hash).path[0];
    if (p0 !== "filter" && p0 !== "settings") render(true);
  }
  window.addEventListener("xeva:synced", reloadFromStore);
  window.addEventListener("storage", (e) => { if (e.key === KEY) reloadFromStore(); });

  /* ★★ 2026-09-20e PC はマウスの縦ホイールしか無いので、横に並ぶ列はホイールで横に流す（ご指定） */
  document.addEventListener("wheel", (e) => {
    if (e.deltaX) return;
    const box = e.target.closest && e.target.closest(".hscroll,.chips,.miniart,.hist");
    if (!box || box.scrollWidth <= box.clientWidth + 4) return;
    const d = e.deltaY || 0;
    if (!d) return;
    const at = d < 0 ? box.scrollLeft <= 0 : box.scrollLeft >= box.scrollWidth - box.clientWidth - 1;
    if (at) return;                       /* 端まで来たら、ふつうの縦スクロールに返す */
    box.scrollLeft += d;
    e.preventDefault();
  }, { passive: false });

  /* iPhone のアプリ表示（html.xv-full）では文書のスクロールを 0 に留める（中身は #view がスクロールする） */
  window.addEventListener("scroll", () => { if (window.scrollY && document.documentElement.classList.contains("xv-full")) window.scrollTo(0, 0); }, { passive: true });

  stack.push(location.hash || "#/");
  render();
  MS.ui = { go, render, state: () => S };
})();
