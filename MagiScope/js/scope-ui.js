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
    danime: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9.5l5 2.5-5 2.5z"/>',
    music: '<path d="M9 18V6l11-2v12"/><circle cx="6.5" cy="18" r="2.6"/><circle cx="17.5" cy="16" r="2.6"/>',
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
    movie: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18M3 15h18M7 5v4M12 5v4M17 5v4M7 15v4M12 15v4M17 15v4"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    wifi: '<path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19" r="1"/>',
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
      set: { theme: "light", big3: true, fanza: true, dlsite: true, music: true, adult: true,
             notif: { fav: true, fresh: true, trend: true } },
      /* 履歴は押したときだけ出す（ご指定） */
      showHist: false, showRq: false,
      favQ: "", favSort: "added", favWhen: "",
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
    d.showHist = !!s.showHist; d.showRq = !!s.showRq;
    /* ★★ 2026-09-21e 新しく持つようにしたもの（読み直しで落とさないこと。落とすと同期で外したお気に入りが生き返る） */
    d.rev = s.rev || {}; d.favRev = !!s.favRev; d.allQ = s.allQ || ""; d.deal = s.deal || {};
    d.newSort = s.newSort || {}; d.newRev = s.newRev || {}; d.newQ = s.newQ || ""; d.fa = s.fa || {};
    /* ★★ 2026-09-22 セールの絞り込み（全作品と同じ項目）・おすすめタブで見ていたカテゴリー */
    d.fs = s.fs || {}; d.recCat = s.recCat || "";
    d.favDel = s.favDel || {}; d.histDel = s.histDel || {}; d.histClr = Number(s.histClr) || 0;
    d.favQ = s.favQ || ""; d.favSort = s.favSort || "added"; d.favWhen = s.favWhen || "";
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

  const isAdultCat = (c) => !!(CATS[c] && CATS[c].adult);
  /* ★★ 2026-09-21 ご指定：年齢の確認がすんだ人でも、18禁のカテゴリーをまとめて隠せるようにする。
     S.set.adult が false なら FANZA・DLsite・同人アニメをぜんぶ出さない（設定でいつでも戻せる）。
     カテゴリーごとの表示／非表示（S.set.fanza など）はそのまま残す。 */
  const adultOn = () => S.set.adult !== false;
  const catOn = (c) => {
    if (isAdultCat(c) && !adultOn()) return false;
    if (c === "fanza") return !!S.set.fanza;
    if (c === "dlsite") return S.set.dlsite !== false;
    if (c === "music") return S.set.music !== false;
    return true;
  };
  const visCats = () => MS.CAT_IDS.filter(catOn);
  const isFav = (c, id) => !!(S.fav[c] && S.fav[c][id]);
  const ITEMS = {};                     /* 描いた作品の控え（お気に入り登録のときに名前と絵を残すため） */
  const keep = (it) => { if (it) ITEMS[it.category + ":" + it.id] = it; return it; };
  /* 好みのジャンルの候補（カテゴリーごと）。前より多く出す */
  const PREF_GS = {};
  async function prefGenres(c) {
    const uniq = (a) => a.filter((x, i) => x && a.indexOf(x) === i);
    if (c === "anime") {
      /* アニメ：いつものジャンル＋AniList の全ジャンル＋国内の作品に付いているジャンル */
      const fc = await R.facets("anime").catch(() => ({ genres: [] }));
      const ix = await R.all("anime", "", {}).catch(() => ({ entries: [] }));
      const cnt = {}; ix.entries.forEach((e) => (e.item.genres || []).forEach((g) => { cnt[g] = (cnt[g] || 0) + 1; }));
      return uniq(MS.ANIME_GENRES.filter((g) => g !== "その他").concat(fc.genres || [], MS.GENRE_JA_LIST || [], Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])));
    }
    if (c === "karaoke") {
      const fc = await R.facets("karaoke").catch(() => ({ genres: [] }));
      return uniq(MS.KARA_GENRES.concat(fc.genres || []));
    }
    const fc = await R.facets(c).catch(() => ({ genres: [] }));
    return (fc.genres || []).slice(0, c === "music" ? 60 : 150);
  }
  function prefSheetHtml(c) {
    const gs = PREF_GS[c] || [], sel = S.prefs[c] || [];
    /* 選んでいるものを先に */
    const order = sel.filter((g) => gs.indexOf(g) >= 0).concat(gs.filter((g) => sel.indexOf(g) < 0));
    return "<h2>" + ic("star") + " 好みのジャンル " + catPill(c) + "</h2>" +
      '<p class="note" style="margin:0 2px 8px">' + (sel.length ? sel.length + "件えらんでいます。" : "") + "押すと入れる／もう一度押すと外れます。選んだジャンルの作品がホームやおすすめに出ます。</p>" +
      (sel.length ? '<div class="chips wrap" style="margin-bottom:8px"><button class="chip sm" data-a="prefClear" data-c="' + c + '">すべて外す</button></div>' : "") +
      '<div class="picklist">' + order.map((g) => { const on = sel.indexOf(g) >= 0;
        return '<button class="pk' + (on ? " on" : "") + '" data-a="prefPick" data-c="' + c + '" data-v="' + esc(g) + '"><span>' + esc(g) + "</span>" + (on ? ic("check") : "") + "</button>"; }).join("") + "</div>";
  }
  function toggleFav(c, id) {
    if (isFav(c, id)) {
      delete S.fav[c][id];
      /* ★ 外した時刻を残す。同期で別の端末と混ぜるとき、これより古い登録は生き返らせない。 */
      S.favDel = S.favDel || {}; S.favDel[c + ":" + id] = Date.now();
      toast("お気に入りから外しました");
    }
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
  /* ★★ 2026-09-21e ご指定：色は通常バージョンだけにする（ダークモードはやめた）。 */
  function applyTheme() { document.documentElement.dataset.theme = "light"; }
  applyTheme();

  /* ══════════ 小物 ══════════ */
  function toast(t) { const el = $("#toast"); el.textContent = t; el.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => { el.hidden = true; }, 2200); }
  /* ★★ 2026-09-21g ご指定：閉じるのは右上の✕だけにして、選ぶボタンと離す（押しまちがい防止） */
  function sheet(html) { $("#sheet").innerHTML = '<button class="shx" data-a="closeSheet" aria-label="とじる">✕</button>' + html; $("#ov").classList.add("on"); }
  function closeSheet() {
    const wasPref = !!$("#sheet [data-a=\"prefPick\"]");
    $("#ov").classList.remove("on");
    /* ★ render() の中でも closeSheet() を呼ぶので、中身を消してから描き直す（消さないと呼び合いが止まらない） */
    if (wasPref) { $("#sheet").innerHTML = ""; if (parse(location.hash || "#/").path[0] === "me") setTimeout(() => render(true), 0); }
  }
  /* confirm() は出ない環境がある（MagiLex・MagiTier で踏んだ）ので、確認は画面の中で聞く */
  function ask(title, body, okLabel) {
    return new Promise((res) => {
      sheet("<h2>" + esc(title) + "</h2><p>" + esc(body) + '</p><div class="btns"><button class="btn" data-ans="0">やめる</button><button class="btn pri" data-ans="1">' + esc(okLabel || "OK") + "</button></div>");
      const h = (e) => { const b = e.target.closest("[data-ans]"); if (!b) return; $("#sheet").removeEventListener("click", h); closeSheet(); res(b.dataset.ans === "1"); };
      $("#sheet").addEventListener("click", h);
    });
  }
  const catName = (c) => CATS[c].ja;
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
  /* ★★ 2026-09-22 ご指定「長さや話数構成やページ数なども」。一覧の小さい字にも短く入れる */
  function lenText(it) {
    if (!it) return "";
    if (it.category === "anime") return [it.episodes ? it.episodes + "話" : "", it.duration ? "1話" + it.duration : ""].filter(Boolean).join("・");
    if (it.category === "movie") return it.length || "";
    if (it.category === "karaoke" || it.category === "music") return it.length || "";
    return [it.volume, it.length].filter(Boolean).join("・");
  }
  function subText(it) {
    if (!it || !it.category) return "";
    if (it.category === "anime") return [it.special ? it.service + "・" + it.tag : "", (it.genres || []).filter((g) => g !== "特別版").slice(0, 2).join("・"), it.seasonLabel || it.seasonText, it.studio, it.format, lenText(it)].filter(Boolean).join(" · ");
    if (it.category === "movie") return [it.market === "us" && it.en ? it.en : "", it.dist, it.releaseDate && MS.fmtDate(it.releaseDate) + " 公開", lenText(it)].filter(Boolean).join(" · ");
    if (isAdultCat(it.category)) return [it.circle, it.author, it.releaseDate && MS.fmtDate(it.releaseDate), lenText(it)].filter(Boolean).join(" · ");
    return [it.artist, it.genre, it.album, lenText(it)].filter(Boolean).join(" · ");
  }
  const subOf = (it) => esc(subText(it));
  function tagsOf(it) {
    if (it.category === "movie") return (it.isNew ? '<span class="tag air">新作</span>' : "") + (it.rating ? '<span class="tag std">★' + (+it.rating).toFixed(1) + "</span>" : "");
    if (it.category === "anime" && it.special) return '<span class="tag sp">' + esc(it.tag || "特別版") + "</span>";
    if (it.category === "karaoke" || it.category === "music") return (it.isNewSong ? '<span class="tag song">新曲</span>' : "") + (it.isStandard ? '<span class="tag std">定番</span>' : "");
    if (isAdultCat(it.category)) return (it.isNew ? '<span class="tag book">' + (it.kind === "動画" || it.kind === "アニメ" ? "新作" : "新刊") + "</span>" : "") + (it.rating ? '<span class="tag std">★' + it.rating + "</span>" : "");
    return (it.airing ? '<span class="tag air">放送中</span>' : "") + (it.fmScore ? '<span class="tag std">★' + it.fmScore + "</span>" : "");
  }
  function metricOf(e) {
    const it = e.item;
    if (isAdultCat(it.category)) {
      if (e.rankingType === "popular" && it.sales) return "販売 " + nf(it.sales);
      if (e.rankingType === "rating" && it.rating) return "★" + it.rating + "（" + nf(it.votes) + "件）";
    }
    if (e.rankingType === "fm" && it.fmScore) return "★" + it.fmScore + "（Filmarks）";
    if (e.rankingType === "rating" && it.rating) return "★" + it.rating.toFixed(1);
    if (e.rankingType === "popular" && isAdultCat(it.category) && it.rating) return "★" + (+it.rating).toFixed(2) + "（" + nf(it.votes) + "件）";
    if (e.rankingType === "popular" && it.category === "anime") return nf(it.popularity) + "人が登録";
    if (e.rankingType === "jp" && it.category === "anime") return "視聴者 " + nf(it.watchers) + "人";
    if (it.category === "anime" && /^(dm_|sp_)/.test(e.rankingType || "") && it.dmmRating) return "DMM TV ★" + (+it.dmmRating).toFixed(2) + (it.dmmVotes ? "（" + nf(it.dmmVotes) + "件）" : "");
    /* 映画：興収（米ドル）・公開館数・上映週 */
    if (it.category === "movie") {
      if (e.rankingType === "boyear" && it.yearGross) return "年間の興収 " + it.yearGross;
      if (e.rankingType === "boall" && it.allGross) return "歴代 " + it.allGross + (it.releaseDate ? "・" + String(it.releaseDate).slice(0, 4) + "年" : "");
      if ((e.rankingType === "bo" || e.rankingType === "us") && it.weekendGross) return "週末 " + it.weekendGross + (it.totalGross ? "・累計 " + it.totalGross : "");
      return [it.screens ? it.screens + "館" : "", it.weeks ? it.weeks + "週目" : ""].filter(Boolean).join("・");
    }
    if (it.category === "music" && e.point) return nf(e.point) + " ポイント";
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
    /* ★ 順位が無いもの＝ランキングの外（圏外）。0位と書かないように、ここで文字を変える。 */
    if (e.offchart || e.rank == null) {
      return '<div class="row off" data-c="' + it.category + '"><a class="rk" href="' + itemHref(it) + '"><span class="n num" style="font-size:12px">—</span><span class="muted" style="font-size:9.5px">圏外</span></a>' +
        '<a class="art" href="' + itemHref(it) + '">' + img(it) + "</a>" +
        '<a class="bd" href="' + itemHref(it) + '"><div class="t">' + esc(it.title) + '</div><div class="s">' + tagsOf(it) + "<span>" + subOf(it) + "</span></div>" +
        '<div class="pv">ランキングには入っていません' + (m ? " · " + esc(m) : "") + "</div></a>" + favBtn(it) + "</div>";
    }
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
  /* ★★ 2026-09-22 タブ：「話題」「おすすめ」を新設・「セール情報」はセールのタブの中へ */
  /* ★★ 2026-09-22b ご指定「絞り込みを開くとランキングタブが光る」。
     絞り込み（filter）・人・ジャンル・話題は、<b>開いた元のタブの光をそのまま</b>にする（ここに書かない＝変えない）。
     話題のタブはやめた（画面はマイページから開ける）。 */
  const TAB_OF = { "": "home", rank: "rank", search: "all", all: "all", new: "new", sale: "sale", camp: "sale", drop: "sale", fav: "fav", me: "me", settings: "me", history: "me", compare: "rank", rec: "rec", notice: "home" };
  /* ★★ 2026-09-21d ご指定「それぞれのボタンで開きなおしたときは、最初に開く状態に戻す」。
     絞り込み・並べ替え・検索の言葉は<b>そのときだけのもの</b>なので、下のボタンを押したら消す。
     お気に入り・好みのジャンル・設定は消さない（あとに残したいもの）。 */
  function resetTab(tab) {
    if (tab === "rank") {
      MS.CAT_IDS.forEach((c) => { S.f[c] = c === "karaoke" ? { list: (S.f.karaoke || {}).list || "" } : {}; S.sort[c] = "rank"; });
      detailRange = "1m"; histRange = "1m";
    } else if (tab === "all") {
      S.allQ = ""; S.sort = {}; S.rev = {}; S.fa = {};
    } else if (tab === "sale") {
      S.deal = {}; S.fs = {};
    } else if (tab === "new") {
      S.newSort = {}; S.newRev = {}; S.newQ = "";
    } else if (tab === "fav") {
      S.favQ = ""; S.favSort = "added"; S.favWhen = "";
    } else if (tab === "me") {
      S.showHist = false; S.showRq = false;
    }
    save();
  }

  function paintTab(p0) { const t = TAB_OF[p0]; if (t) $$(".bnav button").forEach((b) => b.classList.toggle("on", b.dataset.tab === t)); }

  function head(o) {
    /* ★★ 2026-09-21j 絞り込みなどは並べ替えのシートと同じく「右上の✕」で閉じる（ご指定） */
    if (o.close) {
      return '<div class="ttl" style="padding-left:6px">' + (o.pill ? catPill(o.pill) : "") + "<span>" + esc(o.title || "") + "</span></div>" +
        '<button class="ib hx2" data-a="back" data-fb="' + esc(o.fb || "#/") + '" aria-label="とじる">✕</button>';
    }
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
    /* ★★ 2026-09-22 オフライン対応（ご指定）。つながっていないときは、最後に取ったデータで動いていることを上に出す */
    view.innerHTML = (navigator.onLine === false ? '<div class="offbar">' + ic("wifi") + "オフラインです。最後に取ったデータを表示しています</div>" : "") + out.body;
    view.classList.remove("anim"); void view.offsetWidth; if (!isBack && !early) view.classList.add("anim");
    view.scrollTop = isBack && scrolls[h] != null ? scrolls[h] : 0;
    if (out.after) try { out.after(); } catch (e) { console.error(e); }
    paintBell();
  }

  /* FANZA の入口：年齢の確認と、非表示の設定 */
  function fanzaGate(c) {
    if (!isAdultCat(c)) return null;
    if (!adultOn()) {
      return { head: head({ title: catName(c), fb: "#/" }), body: '<div class="empty">' + ic("shield") + "<br>18禁のカテゴリーは設定で隠しています。<br><br><button class=\"btn pri\" data-a=\"showAdult\">表示する</button></div>" };
    }
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
    /* ★★ 2026-09-21i ご指定：ホームでだけ 18禁のカテゴリーを隠せる（ほかのタブはそのまま） */
    const homeAdult = S.set.homeAdult !== false;
    const cs = visCats().filter((c) => homeAdult || !isAdultCat(c));
    const d = new Date();
    let body = '<div class="hero"><h1>好きなエンタメを、<br>もっと見つけよう。</h1><p>' + d.getFullYear() + "." + String(d.getMonth() + 1).padStart(2, "0") + "." + String(d.getDate()).padStart(2, "0") + " · " + cs.length + "つのランキングは別々の出典から取得</p></div>";
    body += '<div class="catcards">' + cs.map((c) =>
      '<a class="catcard" data-c="' + c + '" href="#/rank/' + c + (c === "anime" ? "?type=jp" : "") + '"><span class="ic">' + ic(c) + '</span><span class="en">' + CATS[c].en + '</span><span class="ja">' + esc(CATS[c].ja) + '</span><span class="n">' + esc(CATS[c].source) + "</span></a>").join("") + "</div>";
    /* ★★ 2026-09-22 ご指定：ホームの 18禁 の切りかえはマイページの設定画面だけに置く */
    body += '<a class="homeRun" id="homeRun" href="#/settings"><span class="dot"></span><span id="homeRunT">データの取得状況を確認しています…</span>' + ic("chev") + "</a>";
    body += '<div class="quick"><button data-go="#/rec">' + ic("spark") + "おすすめ</button><button data-go=\"#/fav\">" + ic("heart") + "お気に入り</button></div>";
    cs.forEach((c) => {
      body += '<section class="homesec" data-c="' + c + '"><div class="sec"><h2 id="homeh-' + c + '">' + catPill(c) + ({ karaoke: "今週のランキング", anime: "国内 今季の視聴者数ランキング", music: "いちばん聴かれている曲", movie: "国内 週末の映画ランキング" }[c] || "注目ランキング") + "</h2>" +
        '<a class="more" href="#/rank/' + c + '">すべて見る' + ic("chev") + '</a></div><div class="hscroll" id="home-' + c + '">' + Array.from({ length: 4 }, () => '<div class="pcard"><div class="art skel" style="height:150px;margin:0"></div></div>').join("") + "</div></section>";
    });
    body += '<div id="homePref"></div>';
    body += '<p class="note" style="margin:18px 4px 4px">出典：アニメ＝Annict（国内の視聴者数）・AniList（トレンド）／映画＝映画.com・Box Office Mojo／FANZA同人＝FANZA同人ランキング／カラオケ＝カラオケ DAM（ジャケット・発売日は iTunes）。</p>';
    return { head: head({ logo: true }), body, after() { homeFill(cs); homeRun(); } };
  };
  async function homeRun() {
    const st = await R.status().catch(() => ({ ok: false }));
    const a = $("#homeRun"), t = $("#homeRunT"); if (!a || !t) return;
    const bad = !st.ok || Date.now() - (st.at || 0) > 3 * 3600e3;
    a.classList.toggle("bad", bad);
    t.innerHTML = st.ok ? "データ更新：<b>" + esc(MS.agoLabel(st.at)) + "</b>" + (bad ? "（自動取得が止まっているかも）" : "") : "自動取得のデータが読めません";
  }
  async function homeFill(cs) {
    const seq = renderSeq;
    await Promise.all(cs.map(async (c) => {
      const box = $("#home-" + c); if (!box) return;
      if (isAdultCat(c) && !S.age) { box.outerHTML = '<div class="note" style="padding:6px 2px 12px">年齢の確認のあとで表示します。<a href="#/rank/' + c + '" style="color:var(--c);font-weight:800">確認する ›</a></div>'; return; }
      try {
        let L;
        if (c === "anime") {
          try { L = await R.list(c, { type: "jp", period: "season", offchart: false }); }
          catch (e) { L = await R.list(c, { type: "overall", period: "day", offchart: false }); const h = $("#homeh-anime"); if (h) h.innerHTML = catPill("anime") + "今日の注目ランキング"; }
          if (L.type === "jp") { const a = $('#home-anime'); if (a) a.previousElementSibling.querySelector(".more").setAttribute("href", "#/rank/anime?type=jp"); }
        } else L = await R.list(c, { type: c === "music" ? "stream" : "overall", period: CATS[c].mainPeriod, offchart: false });
        if (seq !== renderSeq || !$("#home-" + c)) return;
        $("#home-" + c).innerHTML = L.entries.slice(0, 10).map((e) => posterCard(e)).join("") || '<div class="note">データがありません</div>';
        fillArt(L.entries.slice(0, 10).map((e) => e.item));
      } catch (err) {
        if (seq !== renderSeq || !$("#home-" + c)) return;
        $("#home-" + c).outerHTML = err.code === "nodata" ? '<div class="note" style="padding:4px 2px 12px">' + esc(err.message) + '（MagiScope/collector/README.md）</div>'
          : '<div class="note" style="padding:4px 2px 12px">読み込めませんでした（' + esc(err.message) + "）</div>";
      }
    }));
    /* ★★ 2026-09-22b ご指定：ホームのおすすめ作品はやめた（おすすめのタブで見る） */
    /* 好みのジャンル（カテゴリーごとに分けて出す）… アニメは AniList のジャンル、カラオケは DAM のジャンル別ランキング */
    const box = $("#homePref"); if (!box || seq !== renderSeq) return;
    let h = "";
    for (const c of cs) {
      const pf = S.prefs[c] || [];
      if (!pf.length || (isAdultCat(c) && !S.age)) continue;
      try {
        let L;
        if (c === "karaoke") { const lk = MS.KARA_LISTS.find((x) => x[1] === pf[0]); L = await R.list(c, { type: "weekly", filters: { list: lk ? lk[0] : "" }, offchart: false }); }
        else L = await R.list(c, { type: c === "music" ? "stream" : "overall", period: CATS[c].mainPeriod, filters: { genres: isAdultCat(c) ? [pf[0]] : pf }, offchart: false });
        if (!L.entries.length) continue;
        h += '<div class="muted" style="margin:8px 2px 6px;display:flex;gap:6px;align-items:center">' + catPill(c) + esc(pf.join("・")) + '</div><div class="hscroll">' + L.entries.slice(0, 10).map((e) => posterCard(e)).join("") + "</div>";
      } catch (e) {}
    }
    if (h && seq === renderSeq && $("#homePref")) $("#homePref").innerHTML = '<div class="sec"><h2>' + ic("spark") + "あなたの好きなジャンルで注目</h2><a class=\"more\" href=\"#/me\">編集" + ic("chev") + "</a></div>" + h;
  }

  /* おすすめのもと：お気に入り・閲覧履歴・検索から、よく出るジャンルと人をかぞえる */
  /* ★★ 2026-09-21i おすすめの材料（作品の中身は data 側が一覧から引き直す） */
  function recProfile(cat) {
    const seeds = [];
    Object.keys(S.fav[cat] || {}).forEach((id) => seeds.push({ id, w: 3, it: ITEMS[cat + ":" + id] }));
    S.hist.filter((h) => h.c === cat).slice(0, 40).forEach((h, i) => { if (!seeds.some((x) => x.id === h.id)) seeds.push({ id: h.id, w: 2 * Math.max(0.3, 1 - i / 40), it: ITEMS[cat + ":" + h.id] }); });
    return { seeds, prefs: S.prefs[cat] || [], queries: (S.recentQ[cat] || []).slice(0, 8) };
  }
  /* ★★ 2026-09-22 ご指定「FANZA のおすすめ表示を本とアニメで分けて」。
     FANZA は 同人 本＋ブックス（＝本）と、同人 アニメ＋アニメ（＝アニメ）の2つに分けて出す。 */
  function recGroups(c) {
    if (c === "fanza") return [{ id: "book", label: "本", ja: "同人 本・ブックス", keys: ["fanza", "fbooks"] }, { id: "anime", label: "アニメ", ja: "同人 アニメ・アニメ", keys: ["danime", "fvideo"] }];
    return [{ id: "", label: "", keys: null }];
  }
  function recSeed(cat) {
    const gs = {}, ps = {}, seen = [];
    const add = (it, w) => {
      if (!it) return;
      (it.genres || [it.genre]).filter(Boolean).forEach((g) => { gs[g] = (gs[g] || 0) + w; });
      const names = cat === "anime" ? [it.studio, it.director].concat((it.cast || []).map((c) => c.n))
        : (cat === "karaoke" || cat === "music") ? [it.artist] : [it.circle, it.author];
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
        /* ★★ 2026-09-21d 出どころが分かれているカテゴリー（アニメ・FANZA）は、
           種類を全部ならべると同じ名前が何度も出て分かりにくい。<b>出どころの札</b>を出す。 */
        const srcs = C.sources || null;
        const nm = srcs ? srcs.map((x) => x.label).join("・") : esc(C.source);
        const chips = srcs
          ? srcs.map((x) => { const f = C.types.find((t) => t.src === x.id) || C.types[0];
              return '<a class="chip" href="#/rank/' + cc + "?type=" + f.id + '">' + esc(x.label) + "</a>"; }).join("")
          : C.types.map((t) => '<a class="chip sm" href="#/rank/' + cc + "?type=" + t.id + '">' + t.label + "</a>").join("");
        return '<div class="catrow" data-c="' + cc + '"><a class="hd" href="#/rank/' + cc + '"><span class="ic">' + ic(cc) + '</span><span style="flex:1;min-width:0"><b>' + C.title + "</b><small>" + C.en + " · " + C.types.length + "種類のランキング · 出典：" + nm + "</small></span>" + ic("chev") + "</a>" +
          '<div class="chips">' + chips + "</div></div>";
      }).join("") + "</div>";
      return { head: head({ title: "ランキング" }), body };
    }
    const gate = fanzaGate(c); if (gate) return gate;
    const ctx = rankCtx(c, q);
    const L = await R.list(c, { type: ctx.t.id, period: ctx.period, filters: ctx.F, sort: sortOf(c), rev: revOf(c) });
    let body = ctx.top + freshBar(L);
    if (!L.entries.length) {
      body += '<div class="empty">' + ic("search") + "<br>この条件に合う" + CATS[c].noun + "はありません</div>";
      return { head: ctx.head, body };
    }
    if (L.ranked != null && L.entries.length > L.ranked) {
      body += '<p class="note" style="margin:0 4px 6px">ランキング ' + nf(L.ranked) + CATS[c].unit + "／このあとに<b>圏外の" + CATS[c].noun + " " + nf(L.entries.length - L.ranked) + CATS[c].unit + "</b>も出します。</p>";
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
  /* ★★ 2026-09-21e 逆順（ご指定「MagiBurst のように逆順も」） */
  const revOf = (c) => !!(S.rev && S.rev[c]);
  /* ★★ 2026-09-21 ご指定：検索・並べ替え・絞り込みの見た目を、ランキング・検索結果・
     お気に入り・人の一覧・ジャンルの一覧で<b>すべて同じ部品</b>にした（MagiBurst と同じ考えかた）。
     ここ1か所を直せば、ぜんぶの画面の見た目がそろう。 */
  function sortBar(c, opts) {
    const sc = sortOf(c), rv = revOf(c);
    const list = (opts && opts.sorts) || MS.repo.sorts(c);
    return '<div class="chips sortrow" data-c="' + c + '">' + ic("sort") +
      '<button class="chip sm rev' + (rv ? " on" : "") + '" data-a="sortrev" data-c="' + c + '" aria-label="逆順">' + (rv ? "↑ 逆順" : "↓ ふつう") + "</button>" +
      list.map((x) => '<button class="chip sm' + (x[0] === sc ? " on" : "") + '" data-a="sortby" data-c="' + c + '" data-v="' + x[0] + '">' + x[1] + "</button>").join("") + "</div>";
  }
  /* ★★ 2026-09-21f ご指定：並べ替え・絞り込みの札を全部ならべると混みあい、画面の外にはみ出していた。
     → <b>「並び替え」「絞り込み」の2つのボタン</b>だけ出し、押すと<b>縦に並んだ一覧</b>（シート）から選ぶ。
     選んだものはボタンの中に小さく書くので、いま何で並んでいるかはひと目で分かる。
     ★ シートの中の選択肢は、どれも data-a="pick" data-s="（どこの設定か）" data-v="（値）" の1つの形。
       applyPick() 1か所で受けるので、画面がふえても同じ作りで足せる。 */
  function toolBar(c, o) {
    o = o || {};
    const sorts = o.sorts || MS.repo.sorts(c);
    const sc = o.sort != null ? o.sort : sortOf(c);
    const rv = o.rev != null ? o.rev : revOf(c);
    const sl = (sorts.find((x) => x[0] === sc) || sorts[0] || ["", ""])[1];
    const FF = o.t ? fOf(c, o.t) : (S.f[c] || {});
    const fn = o.fcount != null ? o.fcount : filterCount(c, FF);
    let h = '<div class="toolbar">' +
      '<button class="tb" data-a="sortSheet" data-scope="' + esc(o.scope || "c:" + c) + '">' + ic("sort") + '<span><small>並び替え</small><b>' + esc(sl) + (rv ? "（逆順）" : "") + "</b></span>" + ic("chev") + "</button>" +
      (o.noFilter ? "" : '<button class="tb' + (fn ? " on" : "") + '" data-a="' + (o.filterAct || "filterGo") + '" data-c="' + c + '" data-t="' + (o.t || "") + '" data-scope="' + esc(o.scope || "c:" + c) + '">' + ic("filter") + '<span><small>絞り込み</small><b>' + (fn ? fn + "件の条件" : "なし") + "</b></span>" + ic("chev") + "</button>") +
      "</div>";
    if (!o.noFilter && !o.filterAct && fn) h += '<div class="fsum">' + filterChips(c, FF, o.t) + '<button class="chip sm" data-a="fclear" data-c="' + c + '" data-t="' + (o.t || "") + '">条件をクリア</button></div>';
    return h;
  }
  /* 並べ替えのシート（縦の一覧＋逆順） */
  function sortSheetOf(scope) {
    const [kind, a, b] = scope.split(":");
    let list, cur, rv;
    if (kind === "c") { list = MS.repo.sorts(a); cur = sortOf(a); rv = revOf(a); }
    else if (kind === "fav") { list = FAV_SORTS; cur = S.favSort; rv = S.favRev; }
    else if (kind === "deal") { const st = (S.deal || {})[a] || {}; list = DEAL_SORT; cur = st.sort || "rec"; rv = !!st.rev; }
    else if (kind === "new") { list = MS.repo.sorts(a).filter((x) => x[0] !== "rank"); cur = (S.newSort || {})[a] || "new"; rv = !!(S.newRev || {})[a]; }
    else return "";
    return "<h2>" + ic("sort") + " 並び替え</h2>" +
      '<div class="picklist">' + list.map((x) => '<button class="pk' + (x[0] === cur ? " on" : "") + '" data-a="pick" data-s="' + esc(scope) + ':sort" data-v="' + esc(x[0]) + '"><span>' + esc(x[1]) + "</span>" + (x[0] === cur ? ic("check") : "") + "</button>").join("") + "</div>" +
      '<div class="picklist" style="margin-top:10px"><button class="pk' + (rv ? " on" : "") + '" data-a="pick" data-s="' + esc(scope) + ':rev" data-v="' + (rv ? "" : "1") + '"><span>逆順にする（↑ 下から）</span>' + (rv ? ic("check") : "") + "</button></div>" +
      "";
  }
  /* 絞り込みのシート（セール・お気に入り・新作など、専用画面を持たないもの） */
  function filterSheetOf(scope) {
    const [kind, a] = scope.split(":");
    const grp = (title, key, opts, cur) => '<h4 class="pkh">' + esc(title) + '</h4><div class="picklist">' + opts.map((x) =>
      '<button class="pk' + (String(cur || "") === x[0] ? " on" : "") + '" data-a="pick" data-s="' + esc(scope) + ":" + key + '" data-v="' + esc(x[0]) + '"><span>' + esc(x[1]) + "</span>" + (String(cur || "") === x[0] ? ic("check") : "") + "</button>").join("") + "</div>";
    let h = "<h2>" + ic("filter") + " 絞り込み</h2>";
    if (kind === "deal") {
      const st = (S.deal || {})[a] || {};
      h += grp("出どころ", "src", DEAL_SRC, st.src) + grp("割引率", "minOff", [["", "すべて"], ["10", "10%OFF 以上"], ["30", "30%OFF 以上"], ["50", "50%OFF 以上"], ["70", "70%OFF 以上"]], st.minOff) +
        grp("値段", "maxPrice", [["", "すべて"], ["330", "330円まで"], ["550", "550円まで"], ["1100", "1,100円まで"], ["2200", "2,200円まで"]], st.maxPrice);
    } else if (kind === "fav") {
      h += grp("登録した時期", "when", FAV_WHEN, S.favWhen || "");
    }
    return h;
  }
  function applyPick(sc, v) {
    const p = sc.split(":"), kind = p[0], a = p[1], key = p[p.length - 1];
    /* ★★ 2026-09-21g ご指定：いま選ばれているものをもう一度押したら解除（ふつうの並び・条件なしへ） */
    const DEF = { c: "rank", fav: "added", deal: "rec", new: a === "anime" ? "popular" : "new" };
    const curOf = () => kind === "c" ? (key === "sort" ? sortOf(a) : "") : kind === "fav" ? (key === "sort" ? S.favSort : key === "when" ? S.favWhen || "" : "")
      : kind === "deal" ? String(((S.deal || {})[a] || {})[key] || (key === "sort" ? "rec" : "")) : kind === "new" ? (key === "sort" ? (S.newSort || {})[a] || DEF.new : "") : "";
    if (key !== "rev" && key !== "clear" && v !== "" && String(curOf()) === String(v)) v = key === "sort" ? DEF[kind] : "";
    if (kind === "c") { if (key === "sort") S.sort[a] = v; else { S.rev = S.rev || {}; S.rev[a] = !!v; } }
    else if (kind === "fav") { if (key === "sort") S.favSort = v; else if (key === "rev") S.favRev = !!v; else if (key === "when") S.favWhen = v; }
    else if (kind === "deal") { S.deal = S.deal || {}; const st = S.deal[a] = S.deal[a] || {}; if (key === "clear") { st.src = ""; st.minOff = ""; st.maxPrice = ""; S.fs = {}; } else st[key] = key === "rev" ? !!v : v; }
    else if (kind === "new") { if (key === "sort") { S.newSort = S.newSort || {}; S.newSort[a] = v; } else { S.newRev = S.newRev || {}; S.newRev[a] = !!v; } }
    save(); closeSheet(); render();
  }
  function filterBar(c) {
    const F = S.f[c] || {}, n = filterCount(c, F);
    let h = '<div class="chips" data-c="' + c + '">' + ic("filter") +
      '<a class="chip sm' + (n ? " on" : "") + '" href="#/filter/' + c + '">絞り込み' + (n ? "（" + n + "）" : "") + "</a>";
    if (n) h += '<button class="chip sm" data-a="fclear" data-c="' + c + '">条件をクリア</button>';
    h += "</div>";
    if (n) h += '<div class="fsum">' + filterChips(c, F) + "</div>";
    return h;
  }
  /* ★★ 2026-09-21c ご指定：アニメは Annict（国内・視聴者数）／Filmarks（国内・評価）／
     AniList（海外・トレンド）を<b>ボタンで分けて、まったく別のもの</b>として扱う。
     ・出どころを選ぶと、その出どころの種類だけが2段目に出る。
     ・数えかたが違うので順位も前回比も混ぜない。どの出どころを見ているかは常に画面に出す。 */
  const srcOf = (c, t) => t.src || "";
  function srcTypes(c, srcId) {
    const ts = CATS[c].types.filter((t) => t.src === srcId);
    return ts.length ? ts : CATS[c].types;
  }
  function srcBar(c, t, q) {
    const ss = CATS[c].sources;
    if (!ss) return "";
    const cur = t.src || ss[0].id;
    const one = ss.find((x) => x.id === cur) || ss[0];
    let h = '<div class="srcseg" data-c="' + c + '" style="--n:' + ss.length + '">' + ss.map((x) => {
      const first = srcTypes(c, x.id)[0];
      return '<a class="' + (x.id === cur ? "on" : "") + '" href="#/rank/' + c + "?type=" + first.id + '">' +
        "<b>" + esc(x.label) + "</b><small>" + esc(x.ja) + "</small></a>";
    }).join("") + "</div>";
    h += '<p class="note srcnote" style="margin:0 4px 8px">' + esc(one.note) +
      ' <a href="' + esc(one.url) + '" target="_blank" rel="noopener" style="text-decoration:underline">' + esc(one.label) + " ›</a></p>";
    return h;
  }
  function rankCtx(c, q) {
    const C = CATS[c];
    const t = MS.typeOf(c, q.type || C.types[0].id);
    const pers = MS.periodsOfType(c, t.id);
    const period = pers.indexOf(q.period) >= 0 ? q.period : MS.defaultPeriod(c, t.id);
    const F = S.f[c] || {};
    const srcNm = C.sources ? (C.sources.find((x) => x.id === t.src) || {}).label : "";
    const title = catName(c) + (srcNm ? "（" + srcNm + "）" : t.id === C.types[0].id ? "" : t.label) + "ランキング";
    const fcount = filterCount(c, F);
    /* ★★ 2026-09-22 ご指定「ランキング比較のグラフは要りません」→ 比較のボタンを出さない */
    const actions = '<a class="ib" href="#/filter/' + c + '" aria-label="絞り込み">' + ic("filter") + (fcount ? '<span class="bd">' + fcount + "</span>" : "") + "</a>";
    const qs = (o) => "#/rank/" + c + "?type=" + (o.type || t.id) + (o.period ? "&period=" + o.period : "");
    let top = segCats(c, (cc) => "#/rank/" + cc);
    top += srcBar(c, t, q);
    const shown = C.sources ? srcTypes(c, t.src || C.sources[0].id) : C.types;
    top += '<div class="chips" data-c="' + c + '">' + shown.map((x) => '<a class="chip' + (x.id === t.id ? " on" : "") + '" href="' + qs({ type: x.id }) + '">' + (x.k ? "🎤" : "") + x.label + "</a>").join("") + "</div>";
    if (pers.length > 1) top += '<div class="chips" data-c="' + c + '">' + pers.map((p) => '<a class="chip sm' + (p === period ? " on" : "") + '" href="' + qs({ period: p }) + '">' + periodLabel(c, p) + "</a>").join("") + "</div>";
    if (c === "karaoke") {
      const cur = F.list || "";
      top += '<div class="chips" data-c="karaoke">' + MS.KARA_LISTS.map((l) => '<button class="chip sm' + (cur === l[0] ? " on" : "") + '" data-a="klist" data-v="' + l[0] + '">' + esc(l[1]) + "</button>").join("") + "</div>";
    }
    top += toolBar(c);
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
  /* ★★ 2026-09-21g ランキングの絞り込み（S.f）と、全作品の絞り込み（S.fa）は別に持つ。
     ジャンル・作者・声優などで探すのは「全作品」の役目（ご指定）。t="all" なら全作品のほう。 */
  const CONTENT_KEYS = ["genres", "genreAnd", "author", "circle", "series", "origin", "studio", "director", "cast", "artist", "dist"];
  /* t="all" 全作品／t="sale" セール（★★ 2026-09-22 全作品と同じ項目で絞り込めるように）／それ以外＝ランキング */
  const fOf = (c, t) => {
    if (t === "all") { S.fa = S.fa || {}; return (S.fa[c] = S.fa[c] || {}); }
    if (t === "sale") { S.fs = S.fs || {}; return (S.fs[c] = S.fs[c] || {}); }
    return (S.f[c] = S.f[c] || {});
  };
  function filterChips(c, F, t) {
    const out = [];
    const add = (k, label) => out.push('<button class="chip sm on" data-c="' + c + '" data-t="' + (t || "") + '" data-a="fdel" data-k="' + esc(k) + '">' + esc(label) + '<span class="x">✕</span></button>');
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
    if (F.minSales) add("minSales", "販売数 " + nf(F.minSales) + " 以上");
    if (F.maxPrice) add("maxPrice", nf(F.maxPrice) + "円まで");
    if (F.genreAnd) add("genreAnd", "ジャンルはすべて含む");
    if (F.series) add("series", "シリーズ：" + F.series);
    if (F.origin) add("origin", "原作：" + F.origin);
    if (F.artist) add("artist", "アーティスト：" + F.artist);
    if (F.dist) add("dist", "配給：" + F.dist);
    (F.country || []).forEach((v) => add("country:" + v, v === "日本" ? "日本の映画" : "海外の映画"));
    if (F.minOff) add("minOff", F.minOff + "%OFF 以上");
    if (F.yearFrom || F.yearTo) add("year", "発売 " + (F.yearFrom || "") + "〜" + (F.yearTo || ""));
    return out.join("");
  }

  /* 8・14・20. 絞り込み（カテゴリー専用の項目） */
  let draft = null;
  let draftT = "";
  SCREENS.filter = async function (path, q) {
    const c = path[1];
    if (!CATS[c]) return SCREENS.rank(["rank"], {});
    const gate = fanzaGate(c); if (gate) return gate;
    draftT = q && (q.t === "all" || q.t === "sale") ? q.t : "";
    draft = JSON.parse(JSON.stringify(fOf(c, draftT)));
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
      if (fc.studios && fc.studios.length) body += group("よく出る制作会社", "studio", fc.studios.slice(0, 24), "押すと絞り込みます", true);
      if (fc.casts && fc.casts.length) body += group("よく出る声優", "cast", fc.casts.slice(0, 24), "押すと絞り込みます", true);
    } else if (isAdultCat(c)) {
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
      /* ★★ 2026-09-21 ご指定：販売数でも絞り込めるように。目安が分かるよう中央値も書く。 */
      body += group("販売数", "minSales", [["100", "100 以上"], ["500", "500 以上"], ["1000", "1,000 以上"], ["5000", "5,000 以上"], ["10000", "10,000 以上"]],
        fc.medSales ? "この一覧のまん中あたりは " + nf(fc.medSales) : "", true);
      body += group("価格", "maxPrice", [["330", "330円まで"], ["550", "550円まで"], ["1100", "1,100円まで"], ["2200", "2,200円まで"]], "", true);
      body += group("新着 / 既刊", "fresh", [["new", "新着（30日以内）"], ["old", "既刊"]]);
      body += text("原作・題材", "origin", "もとになった作品の名前");
      if (draftT === "sale") body += group("割引率", "minOff", [["10", "10%OFF 以上"], ["30", "30%OFF 以上"], ["50", "50%OFF 以上"], ["70", "70%OFF 以上"]], "セールだけの項目", true);
      if (fc.circles && fc.circles.length) body += group("よく出るサークル", "circle", fc.circles.slice(0, 30), "押すと絞り込みます", true);
    } else if (c === "movie") {
      if (fc.genres.length) body += group("ジャンル", "genres", fc.genres, "複数えらべます");
      body += group("日本 / 海外", "country", [["日本", "日本の映画"], ["海外", "海外の映画"]]);
      body += group("公開時期", "when", [["week", "今週"], ["month", "今月"], ["year", "今年"], ["past", "去年まで"]]);
      body += text("監督", "director", "監督の名前を入力");
      body += text("出演", "cast", "出演者の名前を入力");
      body += text("配給", "dist", "配給会社の名前を入力");
      body += group("評価", "minRate", [["3.5", "★3.5 以上"], ["4", "★4.0 以上"]], "映画.com", true);
      if (fc.dists && fc.dists.length) body += group("よく出る配給", "dist", fc.dists.slice(0, 20), "押すと絞り込みます", true);
    } else if (c === "music") {
      if (fc.genres.length) body += group("ジャンル", "genres", fc.genres, "配信での分類");
      body += text("アーティスト", "artist", "アーティスト名を入力");
      body += group("曲のタイプ", "tags", [["new", "新曲（180日以内）"], ["chart", "ランキングに入っている曲だけ"]]);
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
    return { head: head({ title: catName(c) + (draftT === "sale" ? "セールの" : "") + "絞り込み", pill: c, fb: (draftT === "all" ? "#/all/" : draftT === "sale" ? "#/sale/" : "#/rank/") + c, close: true }), body, after() { fPreview(c); } };
  };
  let fpT = 0;
  function fPreview(c) {
    clearTimeout(fpT);
    fpT = setTimeout(async () => {
      try {
        const q = c === "karaoke" ? { type: "weekly", filters: draft } : c === "music" ? { type: "stream", filters: draft }
          : { type: "overall", period: CATS[c].mainPeriod, filters: draft };
        const L = await R.list(c, q);
        const b = $("#fapply"); if (b) b.textContent = "この条件で絞り込む（" + nf(L.total) + CATS[c].unit + "）";
      } catch (e) {}
    }, 350);
  }

  /* 9・15・21. 詳細（カテゴリーごとに中身を変える） */
  let detailRange = "1m";
  /* ★★ 2026-09-21 いま開いている作品のサンプル画像。矢印でめくるので、
     「何枚目を見ているか」を覚えておく必要がある。詳細を描くたびに入れかわる。 */
  let SAMPLES = [], sampAt = 0;
  SCREENS.item = async function (path) {
    const c = path[1], id = path[2];
    if (!CATS[c]) return SCREENS[""]();
    const gate = fanzaGate(c); if (gate) return gate;
    const it = keep(await R.item(c, id));
    if (!it) return { head: head({ title: "見つかりません" }), body: '<div class="empty">この' + CATS[c].noun + "は見つかりませんでした</div>" };
    S.hist = S.hist.filter((h) => !(h.c === c && h.id === id));
    S.hist.unshift({ c, id, t: Date.now(), title: it.title, image: it.image || "" }); if (S.hist.length > 60) S.hist.length = 60;
    S.views = (S.views | 0) + 1; save();
    /* ★ 2026-09-21g 順位推移のグラフはやめた（ご指定）ので、推移は読まない */
    const [ri, rel] = await Promise.all([R.rankInfo(c, id).catch(() => ({})), R.related(c, id).catch(() => ({ primary: [], secondary: [] }))]);
    const pt = c === "anime" ? "キービジュアル" : c === "movie" ? "ポスター" : isAdultCat(c) ? "表紙" : "ジャケット";
    let body = '<div class="dhero" data-c="' + c + '"><div class="bgart">' + img(it, c === "anime") + '</div><div class="in"><div class="cover" aria-label="' + pt + '">' + img(it) + '</div><div class="tt">' +
      "<h1>" + esc(it.title) + "</h1>" +
      (isAdultCat(c) ? '<div class="by">' + esc(it.author || it.circle) + "</div>"
        : (c === "karaoke" || c === "music") ? '<div class="by">' + esc(it.artist) + "</div>"
        : c === "movie" ? (it.en && it.en !== it.title ? '<div class="by">' + esc(it.en) + "</div>" : it.director ? '<div class="by">監督 ' + esc(it.director) + "</div>" : "")
        : (it.short && it.short !== it.title) ? '<div class="by">略称 <b>' + esc(it.short) + "</b></div>"
        : it.sub ? '<div class="by">' + esc(it.sub) + "</div>" : "") +
      /* ★★ 2026-09-22b ご指定：ジャンルは上（絵のとなり）には出さない。下の表にある */
      '<div class="gs">' + catPill(c) + tagsOf(it) + "</div></div></div></div>";
    body += '<div class="stats3" data-c="' + c + '"><div class="stat glass cur"><small>現在の順位</small><b class="num">' + (ri.rank || "–") + "<i>位</i></b></div>" +
      '<div class="stat glass"><small>過去最高</small><b class="num">' + (ri.best || "–") + "<i>位</i></b></div>" +
      '<div class="stat glass"><small>前回</small><b class="num">' + (ri.prevKnown === false ? "–" : ri.previousRank || (ri.rank ? "圏外" : "–")) + (ri.previousRank ? "<i>位</i>" : "") + "</b></div></div>";
    if (ri.label) body += '<p class="note" style="margin:-6px 4px 10px">' + esc(ri.label) + "</p>";
    /* サンプル画像（FANZA・DLsite）。★ 2026-09-21h ご指定でお気に入り登録ボタンの上へ */
    if ((it.samples || []).length) {
      /* ★★ 2026-09-21 ご指定：1枚出したあと、矢印で次の絵へめくれるようにした。
         どの絵から開いても順番が分かるよう、開いた絵の番号（data-i）も渡す。 */
      SAMPLES = it.samples.slice(0, 30);
      body += '<div class="sec"><h2>' + ic("image") + "サンプル<small>" + SAMPLES.length + "枚</small></h2></div><div class=\"miniart samples\">" +
        SAMPLES.map((u, i) => '<button class="samp" data-a="samp" data-i="' + i + '"><img src="' + esc(u) + '" alt="サンプル' + (i + 1) + '" loading="lazy" referrerpolicy="no-referrer"></button>').join("") + "</div>";
    }
    /* ★★ 2026-09-22b ご指定「あらすじはお気に入りボタンの上に・見やすく」 */
    const syn = it.synopsis || (/[ぁ-んァ-ヶ一-龠]/.test(it.description || "") ? it.description : "");
    if (syn) body += '<div class="synbox glass" data-c="' + c + '"><h3>' + ic("quote") + "あらすじ</h3><p" + (syn.length > 140 ? ' class="clamp"' : "") + ">" + esc(syn) + "</p>" +
      (syn.length > 140 ? '<button class="synmore" data-a="synmore">続きを読む</button>' : "") + "</div>";
    body += '<button class="btn full favbtn' + (isFav(c, id) ? " on" : "") + '" data-a="fav" data-c="' + c + '" data-id="' + esc(id) + '">' + ic("heart") + (isFav(c, id) ? "お気に入り登録済み" : "お気に入り登録") + "</button>";
    body += '<dl class="glass info">' + infoRows(it).map((r) => "<dt>" + r[0] + "</dt><dd>" + r[1] + "</dd>").join("") + "</dl>";
    /* 人（押すとその人の作品一覧へ） */
    const people = [];
    if (c === "anime") {
      if (it.studio) people.push(personChip(c, "studio", it.studio, "制作 " + it.studio));
      if (it.director) people.push(personChip(c, "director", it.director, "監督 " + it.director));
      (it.cast || []).slice(0, 10).forEach((x) => people.push(personChip(c, "cast", x.n, x.n + (x.c ? "（" + x.c + "）" : ""))));
      (it.staff || []).filter((x) => /脚本|シリーズ構成|音楽|キャラクターデザイン|原作/.test(x.r)).slice(0, 6).forEach((x) => people.push(personChip(c, "cast", x.n, x.r + " " + x.n)));
    } else if (c === "karaoke" || c === "music") {
      if (it.artist) people.push(personChip(c, "artist", it.artist, it.artist));
    } else if (c === "movie") {
      if (it.director) people.push(personChip(c, "director", it.director.split("・")[0], "監督 " + it.director));
      (it.cast || []).slice(0, 10).forEach((x) => people.push(personChip(c, "cast", x.n, x.n)));
      if (it.dist) people.push(personChip(c, "dist", it.dist, "配給 " + it.dist));
    } else {
      if (it.circle) people.push(personChip(c, "circle", it.circle, "サークル " + it.circle));
      if (it.author) people.push(personChip(c, "author", it.author, "作者 " + it.author));
      if (it.series) people.push(personChip(c, "series", it.series, "シリーズ " + it.series));
      if (it.origin) people.push(personChip(c, "origin", it.origin, "原作 " + it.origin));
    }
    if (people.length) body += '<div class="sec"><h2>' + ic("person") + "関係する人・サークル</h2></div><div class=\"chips wrap\" style=\"margin-bottom:6px\">" + people.join("") + "</div>";
    /* レビュー（感想） */
    const rv = (it.reviews || []).filter(Boolean);
    if (rv.length) {
      /* ★ レビューに星が付いているものは星も出す（ご指定）。文字だけのものは今までどおり。 */
      const stars = (n) => { const v = Math.round(Number(n) || 0); return v ? '<span class="rvstar">' + "★".repeat(Math.min(5, v)) + '<span class="off">' + "★".repeat(Math.max(0, 5 - v)) + "</span></span>" : ""; };
      /* ★★ 2026-09-21f ご指定「レビューをもっと」。FANZA は10件（星・見出し・書いた人・日付つき）、
         Filmarks は3ページぶん（最大12件）を自動取得で集めている。はじめは4件、残りは「もっと見る」。 */
      const one = (t) => {
        const o = typeof t === "string" ? { t: t } : t;
        const body2 = esc(o.t || "");
        return '<div class="rev">' + stars(o.star || o.rating) + (o.title ? '<b class="rvtt">' + esc(o.title) + "</b>" : "") +
          (o.spoiler ? '<details class="spoil"><summary>ネタバレを含むので隠しています（押すと表示）</summary><p>' + body2 + "</p></details>" : "<p>" + body2 + "</p>") +
          ((o.by || o.date) ? '<span class="rvby">' + esc([o.by ? o.by + " さん" : "", o.date || ""].filter(Boolean).join(" ・ ")) + "</span>" : "") + "</div>";
      };
      body += '<div class="sec"><h2>' + ic("quote") + "レビュー<small>" + rv.length + "件" + (it.rating ? "・全体 ★" + (+it.rating).toFixed(2) + (it.votes ? "（" + nf(it.votes) + "件）" : "") : "") + '</small></h2></div><div class="glass revbox">' +
        rv.slice(0, 4).map(one).join("") +
        (rv.length > 4 ? '<div class="revmore" hidden>' + rv.slice(4, 12).map(one).join("") + '</div><button class="btn full" data-a="revmore">残り ' + (Math.min(12, rv.length) - 4) + " 件を見る</button>" : "") + "</div>";
    }
    const relT = c === "anime" ? ["関連作品（シリーズ）", "この作品を見ている人が見ている作品"] : c === "movie" ? ["同じ監督・出演者の映画", "同じジャンルでいま上映中の映画"] : isAdultCat(c) ? ["同じシリーズ・サークルの作品", "よく似た作品（ジャンルが近い）"] : ["同じアーティストの楽曲", "関連楽曲（同じジャンル）"];
    /* ★★ 2026-09-21f ご指定「この作品を見たユーザーが見る作品」。どこから来た数字かを小さく書く。 */
    if (rel.also && rel.also.length) {
      body += '<div class="sec"><h2>' + ic("person") + esc(rel.alsoLabel || "この作品を見た人が見ている作品") + "</h2></div>" +
        (rel.alsoNote ? '<p class="note" style="margin:-4px 4px 6px">' + esc(rel.alsoNote) + "</p>" : "") +
        '<div class="miniart">' + rel.also.map((x) => posterCard({ item: x.item, rank: x.rank }, true)).join("") + "</div>";
    }
    [["primary", relT[0]], ["secondary", relT[1]]].forEach(([k, tl]) => {
      if (!rel[k] || !rel[k].length) return;
      body += '<div class="sec"><h2>' + tl + '</h2></div><div class="miniart">' + rel[k].map((x) => posterCard({ item: x.item, rank: x.rank, caption: x.rel }, true)).join("") + "</div>";
    });
    const links = [];
    /* ★ 2026-09-21 ボタンの名前は「そのカテゴリーの出どころ」から作る。
       直書きにしていたせいで DLsite の作品に FANZA と出ていた（ご指定の不具合）。 */
    const siteNm = it.special || /tv\.dmm\.com/.test(it.link || "") ? "DMM TVで見る" : { anime: "AniList", fanza: "FANZAで見る", dlsite: "DLsiteで見る", karaoke: "DAM", music: "Billboard JAPAN", movie: /eiga\.com/.test(it.url || "") ? "映画.com" : "Box Office Mojo" }[c] || CATS[c].source;
    if (it.boUrl && it.boUrl !== it.url) links.push('<a class="btn" style="flex:1" href="' + esc(it.boUrl) + '" target="_blank" rel="noopener">' + ic("link") + "Box Office Mojo</a>");
    if (it.fmUrl && c === "anime") links.push('<a class="btn" style="flex:1" href="' + esc(it.fmUrl) + '" target="_blank" rel="noopener">' + ic("link") + "Filmarks</a>");
    if (it.url && !(c === "anime" && it.jpOnly)) links.push('<a class="btn" style="flex:1" href="' + esc(it.url) + '" target="_blank" rel="noopener">' + ic("link") + siteNm + "</a>");
    if (it.annictUrl) links.push('<a class="btn" style="flex:1" href="' + esc(it.annictUrl) + '" target="_blank" rel="noopener">' + ic("link") + "Annict</a>");
    if (it.official) links.push('<a class="btn" style="flex:1" href="' + esc(it.official) + '" target="_blank" rel="noopener">' + ic("link") + "公式</a>");
    if (it.damUrl) links.push('<a class="btn" style="flex:1" href="' + esc(it.damUrl) + '" target="_blank" rel="noopener">' + ic("link") + "DAM</a>");
    if (it.appleUrl) links.push('<a class="btn" style="flex:1" href="' + esc(it.appleUrl) + '" target="_blank" rel="noopener">' + ic("link") + "Apple Music</a>");
    if (links.length) body += '<div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">' + links.join("") + "</div>";
    return { head: head({ title: detailTitle(c), pill: c, fb: "#/rank/" + c }), body,
      after() { $("#view").dataset.cur = c + "/" + id; fillArt([it].concat((rel.primary || []).concat(rel.secondary || [], rel.also || []).map((x) => x.item))); } };
  };
  SCREENS.item.loading = function (path) {
    const c = path[1];
    if (!CATS[c] || fanzaGate(c)) return null;
    return { head: head({ title: detailTitle(c), pill: c, fb: "#/rank/" + c }), body: '<div class="skel" style="height:220px"></div>' + skel(4) };
  };
  const detailTitle = (c) => (c === "karaoke" || c === "music") ? "楽曲詳細" : c === "movie" ? "映画詳細" : isAdultCat(c) ? catName(c) + "詳細" : "アニメ詳細";
  /* サンプルを1枚ずつ出す。左右の矢印でめくれる（端まで行ったら反対の端へ回る）。 */
  function paintSamp() {
    if (!SAMPLES.length) return;
    const u = SAMPLES[sampAt];
    const many = SAMPLES.length > 1;
    sheet('<h2>' + ic("image") + " サンプル<small>" + (sampAt + 1) + " / " + SAMPLES.length + "</small></h2>" +
      '<div class="sampview">' +
      (many ? '<button class="sarrow l" data-a="sampMove" data-v="-1" aria-label="前の絵">‹</button>' : "") +
      '<img src="' + esc(u) + '" alt="サンプル' + (sampAt + 1) + '" referrerpolicy="no-referrer">' +
      (many ? '<button class="sarrow r" data-a="sampMove" data-v="1" aria-label="次の絵">›</button>' : "") + "</div>" +
      (many ? '<div class="sdots">' + SAMPLES.map((x, i) => '<button class="sdot' + (i === sampAt ? " on" : "") + '" data-a="samp" data-i="' + i + '" aria-label="' + (i + 1) + '枚目"></button>').join("") + "</div>" : ""));
  }

  function rtabs(cur, act) {
    return '<div class="rtabs">' + [["1w", "1週間"], ["1m", "1か月"], ["3m", "3か月"], ["1y", "1年間"]].map((r) => '<button data-a="' + act + '" data-v="' + r[0] + '" class="' + (cur === r[0] ? "on" : "") + '">' + r[1] + "</button>").join("") + "</div>";
  }
  /* ★★ 2026-09-21 ご指定：表の中のジャンル・シリーズ・作者・サークルも押して一覧へ行けるようにする。
     押せるものと、ただの文字（日付や値段）をはっきり分けるため、
     押せるものは必ずこの2つのどちらかを通すこと。 */
  const lnkPerson = (c, kind, name) => !name ? "" : '<a class="ilink" href="#/person/' + c + "/" + kind + "/" + encodeURIComponent(name) + '">' + esc(name) + "</a>";
  const lnkGenres = (c, gs) => (gs || []).filter(Boolean).map((g) => '<a class="ilink" href="#/genre/' + c + "/" + encodeURIComponent(g) + '">' + esc(g) + "</a>").join("・");
  function infoRows(it) {
    const r = [];
    const c = it.category;
    if (it.category === "anime") {
      /* ★★ 2026-09-21c ご指定「略称も詳細で教えてほしい」。
         略称・よみは自動取得（しょぼいカレンダー）、別名は AniList の synonyms から。 */
      if (it.short && it.short !== it.title) r.push(["略称", "<b>" + esc(it.short) + "</b>"]);
      if (it.yomi) r.push(["よみ", esc(it.yomi)]);
      if ((it.synonyms || []).length) r.push(["別名", esc(it.synonyms.join("／"))]);
      if (it.sub) r.push(["ローマ字", esc(it.sub)]);
      if (it.special) r.push(["特別版", "<b>" + esc(it.tag) + "</b>" + '<span class="muted">（' + esc(it.service) + " で配信）</span>"]);
      r.push(["ジャンル", lnkGenres(c, (it.genres || []).filter((g) => g !== "特別版"))], ["放送時期", esc(it.seasonLabel || "") + (it.airing ? "（放送中）" : "")], ["作品形式", esc(it.format)]);
      /* ★★ 2026-09-22 ご指定「話数構成も」 */
      if (it.episodes || it.duration) r.push(["話数・長さ", [it.episodes ? "全" + it.episodes + "話" : "", it.duration ? "1話 " + esc(it.duration) : ""].filter(Boolean).join("／")]);
      if (it.studio) r.push(["制作会社", lnkPerson(c, "studio", it.studio)]);
      if (it.director) r.push(["監督", lnkPerson(c, "director", it.director)]);
      if (it.fmScore) r.push(["国内の評価", "★" + it.fmScore + '<span class="muted">（Filmarks）</span>']);
      if (it.watchers) r.push(["国内の視聴者", nf(it.watchers) + '人<span class="muted">（Annict）</span>']);
      if ((it.cast || []).length) r.push(["声優", it.cast.slice(0, 8).map((x) => lnkPerson(c, "cast", x.n)).join("・")]);
      if (it.rating) r.push(["評価", "★" + it.rating.toFixed(1) + '<span class="muted">（AniList・' + nf(it.popularity) + "人が登録）</span>"]);
      if (it.dmmRating) r.push(["DMM TV の評価", "★" + (+it.dmmRating).toFixed(2) + (it.dmmVotes ? '<span class="muted">（' + nf(it.dmmVotes) + "件）</span>" : "")]);
      const jp = it.jp || {};
      const jr = [jp.season ? "今季 " + jp.season + "位" : "", jp.year ? "今年 " + jp.year + "位" : "", jp.all ? "歴代 " + jp.all + "位" : ""].filter(Boolean);
      if (jr.length) r.push(["国内の順位", esc(jr.join("・"))]);
    } else if (isAdultCat(c)) {
      if (it.author) r.push(["作者", lnkPerson(c, "author", it.author)]);
      if (it.circle) r.push(["サークル", lnkPerson(c, "circle", it.circle)]);
      r.push(["ジャンル", (it.genres || []).length ? lnkGenres(c, it.genres) : '<span class="muted">取得待ち（1時間ごとの自動取得で順に読みこみます）</span>'],
        ["配信日", it.releaseDate ? esc(MS.fmtDate(it.releaseDate)) : '<span class="muted">取得待ち</span>']);
      if (Number(String(it.price || "").replace(/,/g, ""))) r.push(["値段", priceText(it) + (it.since ? '<br><span class="muted">' + esc(it.since) + " から記録" + (it.low ? "・過去最安 " + nf(it.low) + "円" : "") + "</span>" : "")]);
      if (it.kind) r.push(["作品の種類", esc(it.kind)]);
      /* ★★ 2026-09-21d ご指定「同人アニメ系は原作があれば表示」。
         FANZA の「原作」欄か、二次創作のもとが書かれる「題材」欄から拾っている。
         押すと同じ原作の作品を集めた画面へ行ける。 */
      /* ★ FANZA が出しているのは「原作の種別」（オリジナル／ゲーム系／アニメ系／パロディ）までで、
         もとになった作品の名前そのものは公開ページに載っていない。あるぶんだけ正直に出す。 */
      if (it.origin) r.push(["原作", lnkPerson(c, "origin", it.origin)]);
      else if (it.theme) r.push(["原作", esc(it.theme) + (it.theme.indexOf("オリジナル") >= 0 ? '<span class="muted">（二次創作ではありません）</span>' : "")]);
      if (it.voice) r.push(["声優", esc(it.voice)]);
      if (it.scenario) r.push(["シナリオ", esc(it.scenario)]);
      if (it.series) r.push(["シリーズ", lnkPerson(c, "series", it.series)]);
      /* ★★ 2026-09-22 ご指定「長さやページ数も」。本＝ページ数、動画＝本数・収録時間、どちらもファイル容量 */
      if (it.volume) r.push([/ページ/.test(it.volume) ? "ページ数" : /本/.test(it.volume) ? "動画の本数" : "ページ数・本数", esc(it.volume)]);
      if (it.length) r.push(["収録時間", esc(it.length)]);
      if (it.size) r.push(["ファイル容量", esc(it.size)]);
      if (it.illust) r.push(["イラスト", esc(it.illust)]);
      if (it.rating) r.push(["評価", "★" + (+it.rating).toFixed(2) + '<span class="muted">（' + nf(it.votes) + "件）</span>"]);
      if (it.sales) r.push(["販売数", nf(it.sales)]);
      if (it.favs) r.push(["お気に入り登録", nf(it.favs) + "人"]);
    } else if (c === "movie") {
      /* ★★ 2026-09-22 映画（ご指定）。上映時間などの長さも出す */
      if (it.en && it.en !== it.title) r.push(["原題・英題", esc(it.en)]);
      if (it.releaseDate) r.push(["公開日", esc(MS.fmtDate(it.releaseDate))]);
      if (it.length) r.push(["上映時間", esc(it.length)]);
      if ((it.genres || []).length) r.push(["ジャンル", lnkGenres(c, it.genres)]);
      if (it.year || it.country) r.push(["製作", esc([it.year ? it.year + "年" : "", it.country].filter(Boolean).join("・"))]);
      if (it.certif) r.push(["区分", esc(it.certif)]);
      if (it.dist) r.push(["配給", lnkPerson(c, "dist", it.dist)]);
      if (it.director) r.push(["監督", esc(it.director)]);
      if (it.origin) r.push(["原作", esc(it.origin)]);
      if ((it.cast || []).length) r.push(["出演", it.cast.slice(0, 8).map((x) => lnkPerson(c, "cast", x.n)).join("・")]);
      if (it.rating) r.push(["評価", "★" + (+it.rating).toFixed(1) + (it.votes ? '<span class="muted">（' + nf(it.votes) + "件・映画.com）</span>" : "")]);
      if (it.weekendGross) r.push(["週末の興収", esc(it.weekendGross) + '<span class="muted">（' + (it.market === "us" ? "全米" : "国内・米ドル換算") + "）</span>"]);
      if (it.totalGross && it.totalGross !== "-") r.push(["累計の興収", esc(it.totalGross)]);
      if (it.yearGross) r.push(["今年の興収", esc(it.yearGross) + '<span class="muted">（国内・米ドル換算）</span>']);
      if (it.allGross) r.push(["歴代の興収", "<b>" + esc(it.allGross) + '</b><span class="muted">（国内・興行通信社調べ）</span>']);
      if (it.screens) r.push(["公開館数", nf(it.screens) + "館"]);
      if (it.weeks) r.push(["上映週", it.weeks + "週目"]);
    } else {
      r.push(["アーティスト", lnkPerson(c, "artist", it.artist)]);
      const g = it.itunesGenre || it.genre;
      if (g) r.push(["ジャンル", lnkGenres(c, [g])]);
      if (it.releaseDate) r.push(["発売日", esc(MS.fmtDate(it.releaseDate))]);
      if (it.album) r.push(["収録", esc(it.album)]);
      if (it.length) r.push(["曲の長さ", esc(it.length)]);
      if (it.unit || it.vocal) r.push(["ボーカル", esc([it.vocal, it.unit].filter(Boolean).join("・"))]);
      if (c === "karaoke") r.push(["DAM 曲番号", esc(it.rn || it.id)]);
      if (c === "music" && it.offchart) r.push(["ランキング", "いまは圏外（アーティストの曲として収録）"]);
    }
    /* ★ 中身の無い行（特別版の作品のジャンルなど）は出さない */
    return r.filter((x) => x[1] != null && String(x[1]).replace(/<[^>]+>/g, "").trim() !== "");
  }

  /* 人（アーティスト・サークル・作者・制作会社・監督・声優）の作品一覧 */
  const KIND_NM = { artist: "アーティスト", circle: "サークル", author: "作者", studio: "制作会社", director: "監督", cast: "出演・スタッフ", series: "シリーズ", origin: "原作・題材", dist: "配給" };
  /* ★★ 2026-09-21g 人（作者・サークル・声優・監督…）やジャンルを押したら、全作品でその条件を絞り込んで出す（ご指定） */
  const PERSON_KEY = { artist: "artist", circle: "circle", author: "author", studio: "studio", director: "director", cast: "cast", series: "series", origin: "origin", dist: "dist" };
  function toAll(c, F, qtext) {
    S.fa = S.fa || {}; S.fa[c] = F || {};
    if (qtext != null) S.allQ = qtext;
    S.lastCat = c; save();
    location.replace("#/all/" + c);
  }
  SCREENS.person = async function (path) {
    const c = path[1], kind = path[2], name = path[3] || "";
    if (CATS[c] && PERSON_KEY[kind] && name) { toAll(c, { [PERSON_KEY[kind]]: name }, ""); return { head: head({ title: "全作品" }), body: skel(6) }; }
    if (!CATS[c]) return SCREENS[""]();
    const gate = fanzaGate(c); if (gate) return gate;
    const rows = await R.byPerson(c, kind, name);
    let body = '<div class="glass fgroup" data-c="' + c + '" style="display:flex;align-items:center;gap:12px;padding:14px">' +
      '<span class="pav">' + ic(kind === "studio" ? "db" : "person") + '</span><span style="flex:1;min-width:0">' +
      '<b style="font-size:17px;font-weight:900;display:block">' + esc(name) + "</b>" +
      '<span class="muted">' + catPill(c) + esc(KIND_NM[kind] || "") + " · " + nf(rows.length) + CATS[c].unit + "</span></span>" +
      '<a class="btn sm" href="#/search?cat=' + c + "&q=" + encodeURIComponent(name) + '">' + ic("search") + "検索</a></div>";
    body += toolBar(c);
    body += rows.length ? '<div class="list" id="rlist"></div><button class="loadmore" id="more" hidden>もっと見る</button>'
      : '<div class="empty">' + ic("person") + "<br>この人の作品はまだ取得していません</div>";
    return { head: head({ title: name || "関連作品", pill: c, fb: "#/rank/" + c }), body,
      after() { startPager(MS.sortRows(c, rows, sortOf(c), revOf(c)), (h) => simpleRow(h.item, h.rank, h.role ? '<div class="pv">' + esc(h.role) + "</div>" : ""), $("#rlist")); fillArt(rows.map((h) => h.item)); } };
  };
  SCREENS.person.loading = (path) => ({ head: head({ title: path[3] || "関連作品", pill: CATS[path[1]] ? path[1] : "anime", fb: "#/rank" }), body: skel(6) });

  /* ジャンルの画面（ジャンルの札を押したとき） */
  SCREENS.genre = async function (path) {
    const c = path[1], g = path[2] || "";
    if (CATS[c] && g) { toAll(c, { genres: [g] }, ""); return { head: head({ title: "全作品" }), body: skel(6) }; }
    if (!CATS[c]) return SCREENS[""]();
    const gate = fanzaGate(c); if (gate) return gate;
    const rows = await R.search(c, "", { genres: [g] }).catch(() => []);
    let body = '<div class="glass fgroup" data-c="' + c + '" style="display:flex;align-items:center;gap:12px;padding:14px">' + ic("tag") +
      '<span style="flex:1;min-width:0"><b style="font-size:17px;font-weight:900;display:block">' + esc(g) + '</b><span class="muted">' + catPill(c) + nf(rows.length) + CATS[c].unit + "</span></span>" +
      '<button class="btn sm" data-a="genreRank" data-c="' + c + '" data-v="' + esc(g) + '">' + ic("crown") + "ランキングで見る</button></div>";
    body += toolBar(c);
    body += rows.length ? '<div class="list" id="rlist"></div><button class="loadmore" id="more" hidden>もっと見る</button>'
      : '<div class="empty">' + ic("tag") + "<br>このジャンルの作品はまだ取得していません</div>";
    return { head: head({ title: g, pill: c, fb: "#/rank/" + c }), body,
      after() { startPager(MS.sortRows(c, rows, sortOf(c), revOf(c)), (h) => simpleRow(h.item, h.rank), $("#rlist")); fillArt(rows.map((h) => h.item)); } };
  };
  SCREENS.genre.loading = (path) => ({ head: head({ title: path[2] || "ジャンル", pill: CATS[path[1]] ? path[1] : "anime", fb: "#/rank" }), body: skel(6) });

  /* ══════════ ★★ 2026-09-21e 新しいタブ ══════════
     ・全作品 … ランキングの外もふくめて、たくさんの条件で探す一覧（ご指定）
     ・セール … いま割引中の作品。並べ替え・絞り込みつき（ご指定）
     ・値下がり … 自動取得が記録した値段より安くなった作品と、今安いおすすめ（ご指定）
     ★ 値段が取れているのは FANZA（同人 本・同人 アニメ・ブックス・アニメ）と DLsite だけ。 */
  function liveInput(id, onChange) {
    const el = $("#" + id); if (!el) return;
    const f = el.closest("form"); if (f) f.onsubmit = (e) => { e.preventDefault(); el.blur(); };
    let t = 0;
    el.oninput = () => {
      if (el._comp) return;
      clearTimeout(t);
      const v = el.value, pos = el.selectionStart;
      t = setTimeout(() => { onChange(v); const n = $("#" + id); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} } }, 350);
    };
    el.addEventListener("compositionstart", () => { el._comp = true; });
    el.addEventListener("compositionend", () => { el._comp = false; el.oninput(); });
  }
  const searchBox = (id, val, ph, clr) => '<form class="sbox">' + ic("search") + '<input id="' + id + '" type="search" enterkeyhint="search" autocomplete="off" placeholder="' + esc(ph) + '" value="' + esc(val || "") + '">' +
    '<button type="button" class="clr" data-a="' + clr + '" aria-label="入力を消す"' + (val ? "" : " hidden") + ">" + ic("x") + "</button></form>";

  /* ── 全作品 ── */
  SCREENS.all = async function (path, q) {
    const cs = visCats();
    const c = cs.indexOf(path[1]) >= 0 ? path[1] : (cs.indexOf(S.lastCat) >= 0 ? S.lastCat : cs[0]);
    const gate = fanzaGate(c); if (gate) return gate;
    S.lastCat = c;
    const C = CATS[c];
    /* ★★ 2026-09-22b ご指定：アニメの全作品にも「特別版」のボタン（DMM TV のアニメも見られる） */
    const ASRC = [{ id: "", key: "", label: "すべて", ja: "国内・海外" }, { id: "dmm", key: "dmm", label: "DMM TV", ja: "配信中" }, { id: "special", key: "special", label: "特別版", ja: "ご褒美版など" }];
    const SS = c === "anime" ? ASRC : C.sources;
    const srcId = SS ? (SS.find((x) => x.id === (q.src || "")) || SS[0]).id : "";
    const srcKey = SS ? (SS.find((x) => x.id === srcId) || {}).key : "";
    let body = segCats(c, (cc) => "#/all/" + cc);
    if (c === "anime") {
      body += '<div class="srcseg" data-c="anime" style="--n:3">' + ASRC.map((x) =>
        '<a class="' + (x.id === srcId ? "on" : "") + '" href="#/all/anime' + (x.id ? "?src=" + x.id : "") + '"><b>' + esc(x.label) + "</b><small>" + esc(x.ja) + "</small></a>").join("") + "</div>";
    }
    if (C.sources && c !== "anime") {
      body += '<div class="srcseg" data-c="' + c + '" style="--n:' + C.sources.length + '">' + C.sources.map((x) =>
        '<a class="' + (x.id === srcId ? "on" : "") + '" href="#/all/' + c + "?src=" + x.id + '"><b>' + esc(x.label) + "</b><small>" + esc(x.ja) + "</small></a>").join("") + "</div>";
    }
    body += searchBox("allq", S.allQ, "この中から探す（題名・作者・ジャンル…）", "allqclear");
    body += toolBar(c, { t: "all" });
    let L;
    try { L = await R.all(c, srcKey, { q: S.allQ || "", filters: fOf(c, "all"), sort: sortOf(c), rev: revOf(c) }); }
    catch (e) { return { head: head({ title: "全作品" }), body: body + errCard(c, e), after() { liveInput("allq", (v) => { S.allQ = v; save(); render(); }); } }; }
    body += '<div class="reshd">' + catPill(c) + "<span>" + nf(L.total) + CATS[c].unit + (L.total !== L.all ? "（全 " + nf(L.all) + CATS[c].unit + "）" : "") + "・ランキング外もふくむ</span></div>";
    body += L.entries.length ? '<div class="list" id="rlist"></div><button class="loadmore" id="more" hidden>もっと見る</button>'
      : '<div class="empty">' + ic("search") + "<br>この条件に合う" + CATS[c].noun + "はありません</div>";
    return { head: head({ title: "全作品" }), body,
      after() { startPager(L.entries, allRow, $("#rlist")); fillArt(L.entries.slice(0, 40).map((e) => e.item)); liveInput("allq", (v) => { S.allQ = v; save(); render(); }); } };
  };
  SCREENS.all.loading = (path) => ({ head: head({ title: "全作品" }), body: segCats(CATS[path[1]] ? path[1] : visCats()[0], (cc) => "#/all/" + cc) + skel(8) });
  function dealRow(e) {
    const it = keep(e.item), m = priceText(it), p = Number(String(it.price || "").replace(/,/g, ""));
    const big = Number(it.off) > 0 ? it.off + "<small>%</small>" : it.was && p < it.was ? "↓" : "—";
    return '<div class="row" data-c="' + it.category + '"><a class="rk offrk" href="' + itemHref(it) + '"><span class="n num">' + big + '</span><span class="muted" style="font-size:9.5px">' + (Number(it.off) > 0 ? "OFF" : it.was ? "値下がり" : "") + "</span></a>" +
      '<a class="art" href="' + itemHref(it) + '">' + img(it) + "</a>" +
      '<a class="bd" href="' + itemHref(it) + '"><div class="t">' + esc(it.title) + '</div><div class="s">' + tagsOf(it) + "<span>" + esc([srcName(it.srcKey), it.circle].filter(Boolean).join(" · ")) + "</span></div>" +
      (m ? '<div class="pv">' + m + "</div>" : "") + "</a>" + favBtn(it) + "</div>";
  }
  const srcName = (k) => ({ fanza: "FANZA 同人 本", danime: "FANZA 同人 アニメ", fbooks: "FANZA ブックス", fvideo: "FANZA アニメ", dlsite: "DLsite" }[k] || "");
  /* ★★ 2026-09-21f 全作品・新作：左の順位の列は出さない（ほとんどがランキング外なので「圏外」ばかりになっていた）。
     ランキングに入っている作品だけ、札で「◯位」と出す。 */
  function allRow(e) {
    const it = keep(e.item), m = priceText(it);
    return '<div class="row norank" data-c="' + it.category + '">' +
      '<a class="art" href="' + itemHref(it) + '">' + img(it) + "</a>" +
      '<a class="bd" href="' + itemHref(it) + '"><div class="t">' + esc(it.title) + '</div><div class="s">' + (e.rank ? '<span class="tag rk">' + e.rank + "位</span>" : "") + tagsOf(it) + "<span>" + subOf(it) + "</span></div>" +
      (e.why ? '<div class="pv why">' + ic("spark") + esc(e.why) + "</div>" : m ? '<div class="pv">' + m + "</div>" : "") + "</a>" + favBtn(it) + "</div>";
  }
  /* 値段の書きかた（元の値段・割引・過去最安） */
  function priceText(it) {
    const p = Number(String(it.price == null ? "" : it.price).replace(/,/g, ""));
    if (!p) return "";
    let h = '<b class="yen">' + nf(p) + "円</b>";
    if (it.listPrice && it.listPrice > p) h += ' <s class="muted">' + nf(it.listPrice) + "円</s>";
    if (Number(it.off) > 0) h += ' <span class="offtag">' + it.off + "%OFF</span>";
    if (it.was && it.was > p) h += ' <span class="droptag">↓' + nf(it.was - p) + "円</span>";
    if (it.low && p <= it.low && it.high && it.high > p) h += ' <span class="lowtag">過去最安</span>';
    return h;
  }

  /* ── セール／値下がり（同じ作りで、何を出すかだけ違う） ── */
  const DEAL_SRC = [["", "すべて"], ["fanza", "FANZA 同人 本"], ["danime", "FANZA 同人 アニメ"], ["fbooks", "FANZA ブックス"], ["fvideo", "FANZA アニメ"], ["dlsite", "DLsite 同人"]];
  const DEAL_SORT = [["rec", "おすすめ"], ["off", "割引率"], ["drop", "値下がり幅"], ["price", "安い順"], ["rating", "評価"], ["sales", "売れている"], ["new", "新しい"]];
  /* ★★ 2026-09-22 ご指定「セールのタブにセール情報とセール作品をまとめて」「絞り込みと種別分けは全作品と同じに」。
     ・上の切りかえで「セール作品」「セール情報」。どちらも前の画面の働きはそのまま残す
     ・セール作品は カテゴリー（FANZA・DLsite）→ 出どころ（FANZA は4つ）の順に分け、
       絞り込みは全作品と同じ画面（#/filter/<cat>?t=sale）＋割引率 */
  const SALE_CATS = ["fanza", "dlsite"];
  function saleTop(view, c, srcId) {
    return '<div class="saleseg"><a class="' + (view !== "info" ? "on" : "") + '" href="#/sale' + (c ? "/" + c : "") + '">' + ic("tag") + "<b>セール作品</b><small>いま割引中の作品</small></a>" +
      '<a class="' + (view === "info" ? "on" : "") + '" href="#/sale?v=info">' + ic("bell") + "<b>セール情報</b><small>開催中のキャンペーン</small></a></div>";
  }
  SCREENS.sale = async function (path, q) {
    if (q.v === "info") return campScreen([], true);
    if (!adultOn()) return { head: head({ title: "セール" }), body: saleTop("items") + '<div class="empty">' + ic("shield") + "<br>18禁のカテゴリーを隠しているため、セールは表示しません。<br><br><button class=\"btn pri\" data-a=\"showAdult\">表示する</button></div>" };
    const cs = SALE_CATS.filter((x) => catOn(x));
    if (!cs.length) return { head: head({ title: "セール" }), body: saleTop("items") + '<div class="empty">FANZA・DLsite を設定で隠しています</div>' };
    const c = cs.indexOf(path[1]) >= 0 ? path[1] : cs[0];
    if (!S.age) { const g = fanzaGate(c); if (g) return g; }
    const C = CATS[c];
    const srcId = C.sources ? (C.sources.find((x) => x.id === q.src) || C.sources[0]).id : "";
    const srcKey = C.sources ? (C.sources.find((x) => x.id === srcId) || {}).key : c;
    const st = (S.deal = S.deal || {}).sale = S.deal.sale || {};
    const F = fOf(c, "sale");
    let body = saleTop("items", c);
    body += '<div class="seg" style="--n:' + cs.length + '">' + cs.map((x) => '<button data-c="' + x + '" data-go="#/sale/' + x + '" class="' + (x === c ? "on" : "") + '">' + ic(x) + CATS[x].en + "</button>").join("") + "</div>";
    if (C.sources) body += '<div class="srcseg" data-c="' + c + '" style="--n:' + C.sources.length + '">' + C.sources.map((x) =>
      '<a class="' + (x.id === srcId ? "on" : "") + '" href="#/sale/' + c + "?src=" + x.id + '"><b>' + esc(x.label) + "</b><small>" + esc(x.ja) + "</small></a>").join("") + "</div>";
    body += searchBox("dealq", st.q, "題名・サークル・ジャンルで探す", "dealqclear");
    body += toolBar(c, { scope: "deal:sale", sorts: DEAL_SORT, sort: st.sort || "rec", rev: !!st.rev, t: "sale" });
    let L;
    try { L = await R.deals("sale", { keys: [srcKey], q: st.q || "", minOff: F.minOff || 0, maxPrice: F.maxPrice || 0, filters: F, sort: st.sort || "rec", rev: !!st.rev }); }
    catch (e) { return { head: head({ title: "セール" }), body: body + errCard(c, e) }; }
    body += '<div class="reshd">' + catPill(c) + "<span>" + esc(C.sources ? (C.sources.find((x) => x.id === srcId) || {}).label : C.ja) + "・割引中 " + nf(L.total) + "作品</span></div>";
    body += L.entries.length ? '<div class="list" id="rlist"></div><button class="loadmore" id="more" hidden>もっと見る</button>'
      : '<div class="empty">' + ic("tag") + "<br>" + (L.noPrice ? "セールの値段（元の値段・割引率）がまだ取れていません。<br><small>PC の自動取得が次に終わると表示されます（1時間ごと）。</small>" : filterCount(c, F) || st.q ? "この条件に合うセール中の作品はありません" : "いまセール中の作品はありません") + "</div>";
    return { head: head({ title: "セール" }), body,
      after() { startPager(L.entries, dealRow, $("#rlist")); fillArt(L.entries.slice(0, 40).map((e) => e.item)); liveInput("dealq", (v) => { st.q = v; save(); render(); }); } };
  };
  SCREENS.sale.loading = (path, q) => ({ head: head({ title: "セール" }), body: saleTop(q.v === "info" ? "info" : "items") + skel(6) });
  function dealScreen(mode) {
    return async function () {
      const title = mode === "sale" ? "セール" : "値下がり";
      if (!adultOn()) return { head: head({ title }), body: '<div class="empty">' + ic("shield") + "<br>18禁のカテゴリーを隠しているため、" + title + "は表示しません。<br><br><button class=\"btn pri\" data-a=\"showAdult\">表示する</button></div>" };
      if (!S.age) { const g = fanzaGate("fanza"); if (g) return g; }
      const D = S.deal = S.deal || {};
      const st = D[mode] = D[mode] || {};
      const keys = st.src ? [st.src] : [];
      let L;
      try { L = await R.deals(mode, { keys, q: st.q || "", minOff: st.minOff || 0, maxPrice: st.maxPrice || 0, sort: st.sort || "rec", rev: !!st.rev }); }
      catch (e) { return { head: head({ title }), body: errCard("fanza", e) }; }
      let body = '<p class="note" style="margin:0 4px 8px">' + (mode === "sale"
        ? "いま割引されている作品です（FANZA・DLsite）。元の値段・割引率・過去最安をいっしょに出します。"
        : "自動取得が記録してきた値段より<b>安くなった</b>作品です。記録は取得のたびにたまるので、日がたつほど見つかる数が増えます。") + "</p>";
      body += searchBox("dealq", st.q, "題名・サークル・ジャンルで探す", "dealqclear");
      const dn = (st.src ? 1 : 0) + (st.minOff ? 1 : 0) + (st.maxPrice ? 1 : 0);
      body += toolBar("fanza", { scope: "deal:" + mode, sorts: DEAL_SORT, sort: st.sort || "rec", rev: !!st.rev, fcount: dn, filterAct: "filterSheet" });
      if (dn) body += '<div class="fsum">' + [st.src ? (DEAL_SRC.find((x) => x[0] === st.src) || [])[1] : "", st.minOff ? st.minOff + "%OFF 以上" : "", st.maxPrice ? nf(st.maxPrice) + "円まで" : ""]
        .filter(Boolean).map((t) => '<span class="chip sm on">' + esc(t) + "</span>").join("") + '<button class="chip sm" data-a="pick" data-s="deal:' + mode + ':clear" data-v="">条件をクリア</button></div>';
      let cheap = [];
      if (mode === "drop") {
        /* ★ 今安いおすすめ＝割引中・値下がり中の作品を「割引率×評価×売れ行き」で並べた上位（ご指定） */
        try { cheap = (await R.deals("cheap", { keys, q: st.q || "", minOff: st.minOff || 0, maxPrice: st.maxPrice || 0, sort: "rec" })).entries.slice(0, 12); } catch (e) {}
        if (cheap.length) body += '<div class="sec"><h2>' + ic("spark") + "今安いおすすめ</h2></div><div class=\"hscroll\">" + cheap.map((e) => posterCard({ item: e.item, rank: null, caption: stripTags(priceText(e.item)) }, true)).join("") + "</div>";
        body += '<div class="sec"><h2>' + ic("chart") + "過去の値段より安くなった作品</h2></div>";
      }
      body += '<div class="reshd"><span>' + nf(L.total) + "作品</span></div>";
      body += L.entries.length ? '<div class="list" id="rlist"></div><button class="loadmore" id="more" hidden>もっと見る</button>'
        : '<div class="empty">' + ic("tag") + "<br>" + (L.noPrice ? "セールの値段（元の値段・割引率）がまだ取れていません。<br><small>PC の自動取得が次に終わると表示されます（1時間ごと）。</small>" : mode === "sale" ? "いまセール中の作品はありません" : "まだ値下がりした作品は見つかっていません。<br><small>値段の記録がたまると出てきます（1時間ごとに記録）。</small>") + "</div>";
      return { head: head({ title }), body,
        after() { startPager(L.entries, dealRow, $("#rlist")); fillArt(L.entries.slice(0, 40).concat(cheap).map((e) => e.item)); liveInput("dealq", (v) => { st.q = v; save(); render(); }); } };
    };
  }
  const stripTags = (h) => String(h || "").replace(/<[^>]+>/g, "");
  /* ★★ 2026-09-21f 値下がりのタブはやめた（ご指定）。古いリンクはセールへ */
  SCREENS.drop = async () => { go("#/sale"); return { head: head({ title: "セール" }), body: "" }; };

  /* ══ ★★ 2026-09-21f 新作タブ（ご指定）══
     アニメ＝今季・来季／音楽＝新作（発売90日以内）／カラオケ＝新曲／FANZA・DLsite＝新作（配信30日以内・出どころごと） */
  SCREENS.new = async function (path, q) {
    const cs = visCats();
    const c = cs.indexOf(path[1]) >= 0 ? path[1] : cs[0];
    const gate = fanzaGate(c); if (gate) return gate;
    const C = CATS[c];
    let body = segCats(c, (cc) => "#/new/" + cc);
    const when = q.when === "next" ? "next" : "cur";
    let srcKey = "";
    if (c === "anime") {
      body += '<div class="srcseg" data-c="anime" style="--n:2"><a class="' + (when === "cur" ? "on" : "") + '" href="#/new/anime"><b>今季</b><small>いま放送中</small></a>' +
        '<a class="' + (when === "next" ? "on" : "") + '" href="#/new/anime?when=next"><b>来季</b><small>次のクールの放送予定</small></a></div>';
    } else if (C.sources) {
      const sid = (C.sources.find((x) => x.id === q.src) || C.sources[0]).id;
      srcKey = (C.sources.find((x) => x.id === sid) || {}).key;
      body += '<div class="srcseg" data-c="' + c + '" style="--n:' + C.sources.length + '">' + C.sources.map((x) =>
        '<a class="' + (x.id === sid ? "on" : "") + '" href="#/new/' + c + "?src=" + x.id + '"><b>' + esc(x.label) + "</b><small>" + esc(x.ja) + "</small></a>").join("") + "</div>";
    }
    body += searchBox("newq", S.newQ, "新作の中から探す", "newqclear");
    body += toolBar(c, { scope: "new:" + c, sorts: MS.repo.sorts(c).filter((x) => x[0] !== "rank"), sort: (S.newSort || {})[c] || (c === "anime" ? "popular" : "new"), rev: !!(S.newRev || {})[c] });
    let L;
    try { L = await R.newItems(c, srcKey, { when, q: S.newQ || "", filters: S.f[c] || {}, sort: (S.newSort || {})[c], rev: !!(S.newRev || {})[c] }); }
    catch (e) { return { head: head({ title: "新作" }), body: body + errCard(c, e) }; }
    body += '<div class="reshd">' + catPill(c) + "<span>" + esc(L.label) + "・" + nf(L.total) + C.unit + "</span></div>";
    body += L.entries.length ? '<div class="list" id="rlist"></div><button class="loadmore" id="more" hidden>もっと見る</button>'
      : '<div class="empty">' + ic("spark") + "<br>新作はまだ見つかっていません</div>";
    return { head: head({ title: "新作" }), body,
      after() { startPager(L.entries, allRow, $("#rlist")); fillArt(L.entries.slice(0, 40).map((e) => e.item)); liveInput("newq", (v) => { S.newQ = v; save(); render(); }); } };
  };
  SCREENS.new.loading = (path) => ({ head: head({ title: "新作" }), body: segCats(CATS[path[1]] ? path[1] : visCats()[0], (cc) => "#/new/" + cc) + skel(8) });

  /* ══ ★★ 2026-09-21f セール情報タブ（ご指定「セールが行われている情報」）══
     FANZA同人のキャンペーン（名前・終わる日・対象作品）と、DLsite の割引中の作品（割引率ごと）。 */
  /* セール情報：#/camp（古いリンク）はセールのタブの「セール情報」へ。#/camp/<id> はキャンペーンの中身 */
  SCREENS.camp = async function (path) {
    if (!path[1]) { location.replace("#/sale?v=info"); return { head: head({ title: "セール" }), body: skel(4) }; }
    return campScreen(path, false);
  };
  async function campScreen(path, inSale) {
    if (!adultOn()) return { head: head({ title: "セール情報" }), body: '<div class="empty">' + ic("shield") + "<br>18禁のカテゴリーを隠しているため表示しません。<br><br><button class=\"btn pri\" data-a=\"showAdult\">表示する</button></div>" };
    if (!S.age) { const g = fanzaGate("fanza"); if (g) return g; }
    let J;
    try { J = await R.campaigns(); } catch (e) { return { head: head({ title: "セール情報" }), body: errCard("fanza", e) }; }
    const id = path[1];
    if (id) {
      const cp = J.list.find((x) => x.id === id);
      if (!cp) return { head: head({ title: "セール情報", fb: "#/sale?v=info" }), body: '<div class="empty">このセールは終わりました</div>' };
      const rows = cp.items.map((x) => ({ item: Object.assign({ category: cp.src === "dlsite" ? "dlsite" : "fanza", genres: [] }, x), rank: null }));
      let body = campCard(cp, true);
      body += '<div class="list" id="rlist"></div>';
      body += '<a class="btn full" style="margin-top:12px" href="' + esc(cp.url) + '" target="_blank" rel="noopener">' + ic("link") + (cp.src === "dlsite" ? "DLsite" : "FANZA") + "で対象作品をすべて見る（" + nf(cp.count) + "件）</a>";
      return { head: head({ title: cp.title, fb: "#/sale?v=info" }), body, after() { startPager(rows, dealRow, $("#rlist")); fillArt(rows.map((r) => r.item)); } };
    }
    let body = (inSale ? saleTop("info") : "") + '<p class="note" style="margin:0 4px 8px">いま開かれているセール・キャンペーンです。押すと対象の作品が見られます。' +
      (J.at ? "（" + esc(MS.agoLabel(J.at)) + "に確認）" : "") + "</p>";
    body += J.list.length ? J.list.map((cp) => campCard(cp)).join("") : '<div class="empty">' + ic("tag") + "<br>いま開かれているセールは見つかりませんでした</div>";
    body += '<p class="note" style="margin:14px 4px 0">※ DLsite はキャンペーンの名前を公開ページに出していないため、割引中の作品を割引率ごとにまとめています。</p>';
    return { head: head({ title: inSale ? "セール" : "セール情報" }), body, after() { fillArt(J.list.reduce((a, c) => a.concat(c.items.slice(0, 4).map((x) => Object.assign({ category: c.src === "dlsite" ? "dlsite" : "fanza" }, x))), [])); } };
  }
  SCREENS.camp.loading = () => ({ head: head({ title: "セール情報" }), body: skel(6) });
  function campCard(cp, big) {
    const left = cp.end ? Math.ceil((new Date(cp.end + "T23:59:59") - Date.now()) / 864e5) : null;
    const cat = cp.src === "dlsite" ? "dlsite" : "fanza";
    return '<a class="camp glass" data-c="' + cat + '" href="#/camp/' + esc(cp.id) + '">' +
      '<div class="ch"><span class="cp" data-c="' + cat + '">' + (cp.src === "dlsite" ? "DLSITE" : "FANZA") + "</span>" +
      (left != null ? '<span class="left' + (left <= 3 ? " soon" : "") + '">' + (left <= 0 ? "今日まで" : "あと" + left + "日") + "・" + esc(cp.end.slice(5).replace("-", "/")) + "まで</span>" : '<span class="left">開催中</span>') + "</div>" +
      "<b>" + esc(cp.title) + '</b><small class="muted">対象 ' + nf(cp.count) + "作品</small>" +
      (big ? "" : '<div class="cthumbs">' + cp.items.slice(0, 5).map((x) => { const it = keep(Object.assign({ category: cat }, x)); return '<span class="art">' + img(it) + "</span>"; }).join("") + "</div>") + "</a>";
  }

  /* 22・23. 検索 / 検索結果（検索対象のカテゴリーを必ず1つ選ぶ） */
  SCREENS.search = async function (path, q) {
    const cs = visCats();
    const c = cs.indexOf(q.cat) >= 0 ? q.cat : (cs.indexOf(S.lastCat) >= 0 ? S.lastCat : cs[0]);
    const qq = (q.q || "").trim();
    if (qq) {
      /* ★★ 2026-09-21g 検索の結果は「全作品」で出す（ご指定）。履歴には残す */
      S.recentQ[c] = [qq].concat((S.recentQ[c] || []).filter((x) => x !== qq)).slice(0, 10);
      S.searchLog = [qq].concat((S.searchLog || []).filter((x) => x !== qq)).slice(0, 30);
      S.fa = S.fa || {}; S.fa[c] = {};
      toAll(c, {}, qq);
      return { head: head({ title: "全作品" }), body: skel(6) };
    }
    const gate = fanzaGate(c); if (gate) return gate;
    let body = '<div class="muted" style="margin:0 2px 6px;font-weight:800">検索対象</div>' + segCats(c, (cc) => "#/search?cat=" + cc + (qq ? "&q=" + encodeURIComponent(qq) : ""));
    body += '<form class="sbox" data-c="' + c + '" id="sform">' + ic("search") + '<input id="sq" type="search" enterkeyhint="search" autocomplete="off" placeholder="' +
      ({ anime: "作品名（日本語・ローマ字）", karaoke: "曲名・アーティスト（DAM のランキングから）",
         music: "曲名・アーティスト（圏外の曲も出します）" }[c] || "タイトル・作者・サークル") + '" value="' + esc(qq) + '">' +
      '<button type="button" class="clr" data-a="sclear" aria-label="入力を消す"' + (qq ? "" : " hidden") + ">" + ic("x") + "</button></form>";
    if (!qq) {
      const rec = S.recentQ[c] || [];
      body += '<div class="sec"><h2>' + ic("clock") + "最近の検索<small>" + rec.length + "件</small></h2>" +
        '<button class="more" data-a="rqShow">' + (S.showRq ? "とじる" : "表示する") + "</button></div>";
      if (!S.showRq) body += '<p class="note" style="margin:-2px 2px 10px">「表示する」を押すと、打った言葉が出ます。</p>';
      else if (!rec.length) body += '<p class="note" style="margin:-2px 2px 10px">まだありません。</p>';
      else body += '<div class="kw">' + rec.map((k) => '<span class="qchip"><a class="chip sm" href="#/search?cat=' + c + "&q=" + encodeURIComponent(k) + '">' + esc(k) + '</a><button class="hx sm" data-a="rqdel" data-c="' + c + '" data-v="' + esc(k) + '" aria-label="この1件を消す">✕</button></span>').join("") +
        '<button class="chip sm" data-a="rqclear" data-c="' + c + '">すべて消す</button></div>';
      body += '<div id="skw"></div>';
      return { head: head({ title: "検索" }), body, after() { bindSearch(c); searchKeywords(c); } };
    }
    S.lastCat = c;
    if (S.recentQ[c][0] !== qq) { S.recentQ[c] = [qq].concat(S.recentQ[c].filter((x) => x !== qq)).slice(0, 10); save(); }
    if (S.searchLog[0] !== qq) { S.searchLog = [qq].concat((S.searchLog || []).filter((x) => x !== qq)).slice(0, 30); save(); }
    let hits;
    try { hits = await R.search(c, qq, S.f[c]); } catch (e) { return { head: head({ title: "検索結果", pill: c, fb: "#/search?cat=" + c }), body: body + errCard(c, e), after() { bindSearch(c); } }; }
    body += '<div class="reshd">' + catPill(c) + "<span>「" + esc(qq) + "」の検索結果 " + nf(hits.length) + "件（" + esc(catName(c)) + "のみ・圏外のものも出します）</span></div>";
    body += toolBar(c);
    body += hits.length ? '<div class="list" id="rlist"></div><button class="loadmore" id="more" hidden>もっと見る</button>' : '<div class="empty">' + ic("search") + "<br>見つかりませんでした</div>";
    return { head: head({ title: "検索結果", pill: c, fb: "#/search?cat=" + c }), body,
      after() { bindSearch(c); startPager(MS.sortRows(c, hits, sortOf(c), revOf(c)), (h) => simpleRow(h.item, h.rank), $("#rlist")); fillArt(hits.slice(0, 30).map((h) => h.item)); } };
  };
  async function searchKeywords(c) {
    const box = $("#skw"); if (!box) return;
    let h = "";
    try {
      if (!isAdultCat(c) || S.age) {
        const L = await R.list(c, { type: c === "music" ? "stream" : "rising", period: "day", offchart: false });
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
    const L = await R.list(c, { type: c === "music" ? "stream" : "overall", period: CATS[c].mainPeriod, offchart: false });
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
  /* ★★ 2026-09-22 比較の画面はやめた（ご指定）。古いリンクはランキングへ */
  SCREENS.compare = async function (path) { location.replace("#/rank" + (CATS[path[1]] ? "/" + path[1] : "")); return { head: head({ title: "ランキング" }), body: skel(4) }; };
  SCREENS.compareOld = async function (path, q) {
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
  /* ★★ 2026-09-21 ご指定：お気に入りの中でも検索・絞り込み・並べ替えができるようにした。
     並べ替えの札の見た目は MagiBurst（＝ランキング画面）とそろえてある。 */
  const FAV_SORTS = [["added", "登録が新しい順"], ["old", "登録が古い順"], ["title", "名前順"], ["sub", "作者・アーティスト順"]];
  const FAV_WHEN = [["", "すべて"], ["week", "今週 登録"], ["month", "今月 登録"]];
  function favRows(c) {
    const m = S.fav[c] || {};
    const k = MS.kanaNorm(S.favQ || "");
    const lim = S.favWhen === "week" ? 7 : S.favWhen === "month" ? 31 : 0;
    let ids = Object.keys(m).filter((id) => {
      const f = m[id];
      if (k && MS.kanaNorm((f.title || "") + " " + (f.sub || "")).indexOf(k) < 0) return false;
      if (lim && (Date.now() - (f.t || 0)) > lim * 864e5) return false;
      return true;
    });
    const cmp = {
      added: (a, b) => m[b].t - m[a].t,
      old: (a, b) => m[a].t - m[b].t,
      title: (a, b) => String(m[a].title || "").localeCompare(String(m[b].title || ""), "ja"),
      sub: (a, b) => String(m[a].sub || "").localeCompare(String(m[b].sub || ""), "ja"),
    }[S.favSort] || ((a, b) => m[b].t - m[a].t);
    ids.sort(cmp);
    if (S.favRev) ids.reverse();
    return ids;
  }
  SCREENS.fav = async function (path, q) {
    const cs = visCats();
    const sel = cs.indexOf(q.cat) >= 0 ? q.cat : "all";
    let body = segCats(sel, (cc) => cc === "all" ? "#/fav" : "#/fav?cat=" + cc, true);
    const total = cs.reduce((a, c) => a + Object.keys(S.fav[c] || {}).length, 0);
    if (total) {
      body += '<form class="sbox" id="favform">' + ic("search") +
        '<input id="favq" type="search" autocomplete="off" placeholder="お気に入りの中から探す" value="' + esc(S.favQ || "") + '">' +
        '<button type="button" class="clr" data-a="favqclear" aria-label="入力を消す"' + (S.favQ ? "" : " hidden") + ">" + ic("x") + "</button></form>";
      body += toolBar("anime", { scope: "fav", sorts: FAV_SORTS, sort: S.favSort, rev: !!S.favRev, fcount: S.favWhen ? 1 : 0, filterAct: "filterSheet" });
    }
    const show = sel === "all" ? cs : [sel];
    let any = false;
    for (const c of show) {
      const ids = favRows(c);
      if (sel === "all" && !ids.length) continue;
      any = any || ids.length > 0;
      if (isAdultCat(c) && !S.age && ids.length) { body += '<div class="favsec" data-c="' + c + '"><h3>' + catPill(c) + '<span class="n">' + ids.length + '件</span></h3><div class="note" style="padding:6px 4px 10px">年齢の確認のあとで表示します</div></div>'; continue; }
      body += '<div class="favsec" data-c="' + c + '"><h3>' + catPill(c) + esc(CATS[c].ja) + '<span class="n">' + ids.length + '件</span></h3><div id="fav-' + c + '">' +
        (ids.length ? ids.map((id) => { const f = S.fav[c][id]; return simpleRow({ id, category: c, title: f.title, image: f.image, _sub: f.sub }, null, '<div class="pv">' + esc(f.sub || "") + "</div>"); }).join("")
          : '<div class="note" style="padding:8px 4px 12px">まだありません。ランキングの ♡ から登録できます。</div>') + "</div></div>";
    }
    if (!any && sel === "all") body += '<div class="empty">' + ic("heart") + "<br>" + (total ? "この条件に合うお気に入りはありません" : "お気に入りはまだありません。<br>ランキングや詳細の ♡ から登録できます。") + "<br><br><a class=\"btn pri\" href=\"#/rank\">ランキングを見る</a></div>";
    return { head: head({ title: "お気に入り" }), body, after() { favRanks(show); bindFavSearch(); } };
  };
  /* お気に入りの検索欄。打つたびに描き直すと入力が飛ぶので、押した位置を覚えて戻す
     （MagiCounter の「1文字が2文字になる」と同じ踏み方をしないため）。 */
  function bindFavSearch() {
    const el = $("#favq"); if (!el) return;
    const f = $("#favform"); if (f) f.onsubmit = (e) => e.preventDefault();
    let t = 0;
    el.oninput = () => {
      clearTimeout(t);
      const v = el.value, pos = el.selectionStart;
      t = setTimeout(() => {
        S.favQ = v; save(); render();
        const n = $("#favq"); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} }
      }, 260);
    };
  }
  /* 描いたあとで、いまの順位を入れる */
  async function favRanks(cats) {
    const seq = renderSeq;
    for (const c of cats) {
      if (isAdultCat(c) && !S.age) continue;
      const ids = Object.keys(S.fav[c] || {}); if (!ids.length) continue;
      try {
        const L = await R.list(c, { type: c === "karaoke" ? "weekly" : c === "music" ? "stream" : "overall", period: CATS[c].mainPeriod, offchart: false });
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

  /* 27. 話題の作品（★★ 2026-09-22 下のタブにした・ご指定「話題の作品のタブ」） */
  SCREENS.trend = async function (path, q) {
    const cs = visCats();
    const c = cs.indexOf(q.cat) >= 0 ? q.cat : cs[0];
    const gate = fanzaGate(c); if (gate) return gate;
    const T = await R.trends(c);
    /* ★ 前は anime・fanza・karaoke しか書いていなかったので、DLsite・音楽を開くと止まっていた */
    const lead = { anime: ["アニメの話題", "いま話題になっているアニメ"], fanza: ["FANZA の話題", "いま注目されている作品"], dlsite: ["DLsite の話題", "いま伸びている作品"],
      karaoke: ["カラオケの話題", "いま歌われている人気曲・急上昇曲"], music: ["音楽の話題", "いま聴かれている曲"], movie: ["映画の話題", "いま映画館で伸びている映画"] }[c] || [catName(c) + "の話題", ""];
    let body = segCats(c, (cc) => "#/trend?cat=" + cc);
    body += '<div class="lead glass" data-c="' + c + '"><b>' + ic("fire") + " " + lead[0] + "</b><small>" + lead[1] + "（" + esc(T.lead || "") + "）</small></div>";
    if (T.genres.length) body += '<div class="sec"><h2>話題のジャンル</h2></div><div class="cloud glass" data-c="' + c + '">' + T.genres.map((g, i) => '<span style="font-size:' + (15 - Math.min(i, 5)) + 'px">#' + esc(g.g) + "</span>").join("") + "</div>";
    body += '<div class="list" data-c="' + c + '">' + T.list.map((x, i) => {
      keep(x.item);
      return '<a class="trow" href="' + itemHref(x.item) + '"><span class="no num">' + (i + 1) + '</span><span class="art" style="width:' + (isAdultCat(c) ? "96px" : "46px") + ';flex:none;overflow:hidden;aspect-ratio:' + (isAdultCat(c) ? "4/3" : (c === "karaoke" || c === "music") ? "1/1" : "3/4") + '">' + img(x.item) + "</span>" +
        '<span style="flex:1;min-width:0"><span class="t" style="font-size:13.5px;font-weight:800;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(x.item.title) + '</span><span class="muted" style="font-size:11px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' +
        esc([x.text, subText(x.item), x.rank ? "総合 " + x.rank + "位" : ""].filter(Boolean).join(" · ")) + '</span><span class="heat"><i style="width:' + x.heat + '%"></i></span></span>' +
        (x.spark ? '<svg class="spark" viewBox="0 0 64 26"><path d="' + sparkPath(x.spark) + '"/></svg>' : "") + "</a>";
    }).join("") + "</div>";
    return { head: head({ title: "話題の作品" }), body, after() { fillArt(T.list.map((x) => x.item)); } };
  };
  SCREENS.trend.loading = (path, q) => ({ head: head({ title: "話題の作品" }), body: segCats(visCats().indexOf(q.cat) >= 0 ? q.cat : visCats()[0], (cc) => "#/trend?cat=" + cc) + skel(8) });

  /* ══ ★★ 2026-09-22 おすすめ作品のタブ（ご指定）══
     お気に入り・閲覧履歴・好みのジャンル・検索の言葉から選ぶ（ホームの「あなたへのおすすめ」と同じ計算）。
     まだ手がかりが無いカテゴリーは、そのカテゴリーの人気作品を出して「♡ を押すと合わせていきます」と案内する。
     FANZA は「本」「アニメ」に分けて出す（ご指定）。 */
  SCREENS.rec = async function (path, q) {
    const cs = visCats();
    const c = cs.indexOf(q.cat) >= 0 ? q.cat : cs.indexOf(S.recCat) >= 0 ? S.recCat : cs[0];
    const gate = fanzaGate(c); if (gate) return gate;
    S.recCat = c;
    const prof = recProfile(c);
    const nF = Object.keys(S.fav[c] || {}).length, nH = S.hist.filter((h) => h.c === c).length;
    let body = segCats(c, (cc) => "#/rec?cat=" + cc);
    /* ★★ 2026-09-22c ご指定：おすすめ特集は下に付けず、ボタンで切りかえる（「あなたへ」＋特集ごと） */
    const FE = recFeatureList(c, (recGroups(c).find((x) => x.id === q.g) || recGroups(c)[0]));
    const fsel = FE.find((x) => x.id === q.f) || null;
    const recHref = (f) => "#/rec?cat=" + c + (q.g ? "&g=" + q.g : "") + (f ? "&f=" + f : "");
    const featBar = '<div class="featbar">' + '<a class="fb' + (!fsel ? " on" : "") + '" href="' + recHref("") + '">' + ic("heart") + "あなたへ</a>" +
      FE.map((x) => '<a class="fb' + (fsel === x ? " on" : "") + '" href="' + recHref(x.id) + '">' + esc(x.title) + "</a>").join("") + "</div>";
    body += '<div class="lead glass" data-c="' + c + '"><b>' + ic("spark") + " " + esc(catName(c)) + "のおすすめ</b><small>お気に入り " + nF + "件・閲覧履歴 " + nH + "件・好みのジャンル " + (S.prefs[c] || []).length + "件・検索 " + (S.recentQ[c] || []).length + "件から選んでいます</small></div>";
    const rows = [];
    const empty = !prof.seeds.length && !prof.prefs.length && !prof.queries.length;
    /* ★★ 2026-09-22b ご指定：FANZA の「本」「アニメ」はボタンで切りかえる（前は2つを縦に並べていた） */
    const GS = recGroups(c);
    const gsel = GS.find((x) => x.id === q.g) || GS[0];
    if (GS.length > 1) body += '<div class="srcseg" data-c="' + c + '" style="--n:' + GS.length + '">' + GS.map((x) =>
      '<a class="' + (x === gsel ? "on" : "") + '" href="#/rec?cat=' + c + "&g=" + x.id + (q.f ? "&f=" + q.f : "") + '"><b>' + esc(x.label) + "</b><small>" + esc(x.ja) + "</small></a>").join("") + "</div>";
    body += featBar;
    if (fsel) {
      /* 特集を1つ選んだとき：その特集の作品を一覧で出す */
      const es = (await fsel.fn()).slice(0, 40);
      body += '<p class="note" style="margin:0 4px 8px">' + esc(fsel.note || "") + "</p>";
      body += es.length ? '<div class="list" id="rlistF"></div>' : '<div class="empty">' + ic("spark") + "<br>この特集はデータがそろってから出ます</div>";
      return { head: head({ title: "おすすめ作品" }), body,
        after() { const box = $("#rlistF"); if (box) box.innerHTML = es.map((e) => allRow({ item: e.item, rank: e.rank || null, why: stripTags(priceText(e.item)) || metricOf(e) || "" })).join(""); fillArt(es.map((e) => e.item)); } };
    }
    for (const g of [gsel]) {
      let rec = empty ? [] : await R.recommendFrom(c, prof, g.keys).catch(() => []);
      let fallback = false;
      if (!rec.length) {
        /* 手がかりがまだ無い → いまの人気（ランキングの上から） */
        fallback = true;
        const t = g.keys ? CATS[c].types.find((x) => x.key === g.keys[0]) : null;
        const L = await R.list(c, t ? { type: t.id } : c === "anime" ? { type: "jp", period: "season" } : { type: c === "music" ? "stream" : c === "karaoke" ? "weekly" : "overall", period: CATS[c].mainPeriod }).catch(() => ({ entries: [] }));
        rec = L.entries.slice(0, 20).map((e) => ({ item: e.item, why: "いまの人気 " + e.rank + "位" }));
      }
      body += '<div class="sec"><h2>' + ic("heart") + "あなたへのおすすめ" + (g.label ? "（" + esc(g.label) + "）" : "") + "</h2></div>";
      if (fallback) body += '<p class="note" style="margin:0 4px 8px">まだ手がかりがありません。いまの人気作品を出しています。気になる作品を開いたり ♡ を押したりすると、あなた向けに変わっていきます。</p>';
      const id = "rlist" + rows.length;
      rows.push({ id, rec });
      body += '<div class="list" id="' + id + '"></div>';
    }
    return { head: head({ title: "おすすめ作品" }), body,
      after() {
        rows.forEach((r) => { const box = $("#" + r.id); if (box) box.innerHTML = r.rec.slice(0, 20).map((x) => allRow({ item: x.item, rank: null, why: x.why })).join(""); fillArt(r.rec.map((x) => x.item)); });
      } };
  };
  /* おすすめ特集の一覧（ボタンの名前・説明・中身の取りかた） */
  function recFeatureList(c, g) {
    const L = (p) => p.then((x) => (x.entries || x || [])).catch(() => []);
    const k0 = g && g.keys ? g.keys[0] : "";
    const tType = (key) => (CATS[c].types.find((t) => t.key === key) || {}).id;
    const mk = (id, title, note, fn) => ({ id, title, note, fn });
    return ({
      anime: [mk("sp", "DMM TV の特別版", "ご褒美版・解放版・湯けむり版など、DMM TV で見られる特別なバージョンのアニメ", () => L(R.list("anime", { type: "sp_dmm" }))),
        mk("dm", "DMM TV で人気", "DMM TV のアニメ 週間ランキング", () => L(R.list("anime", { type: "dm_weekly" }))),
        mk("jp", "今季いちばん見られている", "国内で今季いちばん見られているアニメ（Annict の視聴者数）", () => L(R.list("anime", { type: "jp", period: "season" }))),
        mk("new", "来季の注目作", "次のクールに放送が始まるアニメ", () => L(R.newItems("anime", "", { when: "next" })))],
      movie: [mk("new", "いま公開中の新作", "公開から30日以内の映画", () => L(R.newItems("movie", "movie", {}))),
        mk("all", "歴代の興行収入トップ", "国内の歴代興行収入ベスト100（億円）", () => L(R.list("movie", { type: "boall" }))),
        mk("us", "全米で話題", "アメリカの週末の興行収入ランキング", () => L(R.list("movie", { type: "us" })))],
      fanza: [mk("sale", "セール中の人気作品", "いま割引されている作品を、割引率・評価・売れ行きで並べました", () => L(R.deals("sale", { keys: g && g.keys ? g.keys : [], sort: "rec" }))),
        mk("new", "新作", "配信から30日以内の作品", () => L(R.newItems("fanza", k0, {}))),
        mk("rate", "評価が高い作品", "評価の高い作品", () => L(R.list("fanza", { type: g && g.id === "anime" ? "a_rating" : tType(k0), sort: "rating" })))],
      dlsite: [mk("sale", "セール中の人気作品", "いま割引されている作品", () => L(R.deals("sale", { keys: ["dlsite"], sort: "rec" }))),
        mk("new", "新作", "配信から30日以内の作品", () => L(R.newItems("dlsite", "dlsite", {}))),
        mk("rate", "評価が高い作品", "評価の高い作品", () => L(R.list("dlsite", { type: "rating" })))],
      karaoke: [mk("rise", "いま伸びている曲", "カラオケで急上昇している曲", () => L(R.list("karaoke", { type: "rising", period: "week" }))),
        mk("new", "新曲", "発売から180日以内の曲", () => L(R.list("karaoke", { type: "new", period: "week" }))),
        mk("anison", "アニソン", "カラオケで歌われているアニメの曲", () => L(R.list("karaoke", { type: "weekly", filters: { list: "anison" } })))],
      music: [mk("anime", "アニメの曲", "Billboard JAPAN のアニメチャート", () => L(R.list("music", { type: "anime" }))),
        mk("dl", "ダウンロードで人気", "有料ダウンロード数のチャート", () => L(R.list("music", { type: "download" }))),
        mk("video", "動画でよく再生", "動画サイトでの再生数のチャート", () => L(R.list("music", { type: "video" })))],
    })[c] || [];
  }
  SCREENS.rec.loading = (path, q) => ({ head: head({ title: "おすすめ作品" }), body: segCats(visCats().indexOf(q.cat) >= 0 ? q.cat : visCats()[0], (cc) => "#/rec?cat=" + cc) + skel(8) });

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
        const L = await R.list(c, { type: c === "karaoke" ? "daily" : c === "music" ? "stream" : "overall", period: CATS[c].mainPeriod, offchart: false });
        const top = L.entries[0];
        if (top && S.set.notif.trend) out.push({ id: "top:" + c + ":" + day + ":" + top.item.id, c, it: top.item, t: "「" + top.item.title + "」が" + nm + (c === "karaoke" ? "デイリー" : c === "music" ? "視聴" : "総合") + "ランキングで1位" + (top.prevKnown && top.previousRank === 1 ? "をキープ" : top.prevKnown ? "に（前回 " + (top.previousRank ? top.previousRank + "位" : "圏外") + "）" : "") });
        if (S.set.notif.fresh && c !== "music" && c !== "movie") {
          const N = await R.list(c, { type: "new", period: c === "karaoke" ? "day" : c === "anime" ? "day" : undefined });
          N.entries.slice(0, 2).forEach((e) => out.push({ id: "new:" + c + ":" + day + ":" + e.item.id, c, it: e.item, t: (c === "anime" ? "新作" : isAdultCat(c) ? "新刊" : "新曲") + "「" + e.item.title + "」が" + (c === "anime" ? "新作" : isAdultCat(c) ? "新刊" : "新曲") + "ランキング " + e.rank + "位" + (e.isNew ? "に初登場" : "") }));
        }
        if (S.set.notif.trend && c !== "music" && c !== "movie") {
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
    const cs = visCats();
    /* ★★ 2026-09-21e ご指定：アイコンは XEVARION で選んでいるものを出す。レベルの表記はやめた。 */
    let avSrc = "";
    try {
      if (acc && acc.charFile) {
        const canon = window.XEVA && XEVA.canonCharFile ? XEVA.canonCharFile(acc.charFile, acc.charId) : acc.charFile;
        const th = window.XEVA && XEVA.charThumbFile ? XEVA.charThumbFile(canon) : canon;
        avSrc = "../chars/" + th;
      }
    } catch (e) {}
    const avHtml = avSrc ? '<img src="' + esc(avSrc) + '" alt="" onerror="this.onerror=null;this.src=\'../chars/' + esc(acc.charFile || "") + '\'">' : esc(name.slice(0, 1));
    let body = '<div class="prof glass"><span class="av' + (avSrc ? " pic" : "") + '">' + avHtml + '</span><span style="flex:1;min-width:0"><b>' + esc(name) +
      '</b><small class="muted">XEVARION アカウントで同期しています</small></span></div>';
    body += '<div class="cnt3 favcnt">' + cs.map((c) => '<a class="stat glass" data-c="' + c + '" href="#/fav?cat=' + c + '"><small>' + catPill(c) + '</small><b class="num" style="color:var(--c)">' + Object.keys(S.fav[c] || {}).length + "<i>件</i></b></a>").join("") + "</div>";
    /* ★★ 2026-09-21 ご指定：履歴はボタンを押してから出し、1件ずつ消せるようにした。 */
    const hist = S.hist.filter((h) => cs.indexOf(h.c) >= 0 && (!isAdultCat(h.c) || S.age));
    body += '<div class="sec"><h2>' + ic("clock") + "閲覧履歴<small>" + hist.length + "件</small></h2>" +
      '<button class="more" data-a="histShow">' + (S.showHist ? "とじる" : "表示する") + "</button></div>";
    if (!S.showHist) {
      body += '<p class="note" style="margin:-2px 2px 10px">「表示する」を押すと、見た' + "作品・曲" + 'が出ます。</p>';
    } else if (!hist.length) {
      body += '<p class="note" style="margin:-2px 2px 10px">まだありません。</p>';
    } else {
      body += '<div class="chips" style="margin-bottom:6px"><button class="chip sm" data-a="hclear">すべて消す</button></div>';
      cs.forEach((c) => {
        const hs = hist.filter((h) => h.c === c).slice(0, 24);
        if (!hs.length) return;
        body += '<div class="muted" style="margin:4px 2px 6px">' + catPill(c) + "</div><div class=\"hist\">" + hs.map((h) => {
          const it = keep(Object.assign({ id: h.id, category: c, title: h.title, image: h.image }, ITEMS[c + ":" + h.id] || {}));
          /* ★ 名前は絵の幅からはみ出さないように2行で止める（ご指定）。全部は出さなくてよい。 */
          return '<div class="hcard' + (isAdultCat(c) ? " wide" : "") + '"><a class="pcard hp" data-c="' + c + '" href="' + itemHref(it) + '" title="' + esc(it.title) + '"><div class="art">' + img(it) +
            '</div><div class="t">' + esc(it.short || it.title) + "</div></a>" +
            '<button class="hx" data-a="hdel" data-c="' + c + '" data-id="' + esc(h.id) + '" aria-label="この1件を消す">✕</button></div>';
        }).join("") + "</div>";
      });
    }
    body += '<div class="sec"><h2>' + ic("star") + "好みのジャンル</h2></div><p class=\"note\" style=\"margin:-4px 2px 8px\">選んだジャンルの注目作品がホームに出ます（カテゴリーごと）。</p>";
    /* ★★ 2026-09-21j ご指定：好みのジャンルは項目を増やし、カテゴリーのボタンを押してから一覧を出す。
       一覧はシート（縦に並んだリスト・右上の✕で閉じる）。押すたびに入れる／外すがすぐ保存される。 */
    for (const c of cs) {
      if (isAdultCat(c) && !S.age) continue;
      if (!PREF_GS[c]) PREF_GS[c] = await prefGenres(c).catch(() => []);
      const gs = PREF_GS[c] || [];
      if (!gs.length) continue;
      const sel = (S.prefs[c] || []);
      body += '<button class="prefbtn" data-a="prefSheet" data-c="' + c + '">' + catPill(c) +
        '<span class="pb"><b>' + (sel.length ? esc(sel.slice(0, 3).join("・")) + (sel.length > 3 ? " ほか" + (sel.length - 3) : "") : "えらんでいません") + "</b>" +
        "<small>" + gs.length + "ジャンルから選べます</small></span>" + ic("chev") + "</button>";
    }
    body += '<div class="glass menu">' +
      menuLink("#/fav", "heart", "お気に入り", "カテゴリー別に保存した作品") +
      menuLink("#/trend", "fire", "話題の作品", "カテゴリー別の話題（前の「話題」タブ）") +
      menuLink("#/rec", "spark", "おすすめ作品", "お気に入り・履歴から") +
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
    /* ★★ 2026-09-22 ご指定「英語版対応」。XEVARION 全体と同じ設定（xeva_lang_v1）を切りかえる */
    const lang = window.XevaI18n ? XevaI18n.get() : "ja";
    body += '<div class="glass menu"><h4>言語 / Language</h4><div class="langrow">' +
      '<button class="chip' + (lang === "ja" ? " on" : "") + '" data-a="lang" data-v="ja">日本語</button>' +
      '<button class="chip' + (lang === "en" ? " on" : "") + '" data-a="lang" data-v="en">English</button></div>' +
      '<p class="note" style="padding:0 8px 8px">画面の文字を切りかえます。作品名・サークル名などはサイトの表記のままです。</p></div>';
    body += '<div class="glass menu"><h4>表示設定</h4>' +
      toggle("big3", "上位3件を大きく表示", "ランキングの1〜3位", S.set.big3, "crown") +
      toggle("music", "音楽 カテゴリーを表示", "Billboard JAPAN の視聴ランキング", S.set.music !== false, "eye") + "</div>";
    /* ★★ 2026-09-21 ご指定：年齢の確認がすんだあとでも、18禁をまとめて隠せるようにした。
       ここをオフにすると FANZA・DLsite・同人アニメがホームにも検索にも出なくなる。 */
    body += '<div class="glass menu"><h4>18禁（成人向け）の表示</h4>' +
      toggle("adult", "18禁のカテゴリーを表示", "オフにすると FANZA・DLsite をまとめて隠します", S.set.adult !== false, "shield") +
      toggle("homeAdult", "ホームに 18禁を表示", "オフにするとホームのタブでだけ隠します（ほかのタブでは見られます）", S.set.homeAdult !== false, "home") +
      toggle("fanza", "FANZA 同人", "オフでホーム・ランキングから隠す", S.set.fanza, "eye") +
      toggle("dlsite", "DLsite 同人", "オフでホーム・ランキングから隠す", S.set.dlsite !== false, "eye") +
      '<button data-a="ageReset"><span class="ico">' + ic("shield") + '</span><span class="lb">年齢の確認をやり直す<small>' + (S.age ? "確認ずみ" : "未確認") + '</small></span><span class="rt">' + ic("chev") + "</span></button></div>";
    body += '<div class="glass menu"><h4>データの取得</h4><div id="runBox"><div class="skel" style="height:80px"></div></div></div>';
    body += '<div class="glass menu" id="srcBox"><h4>データソース</h4>' +
      srcRow("anime", "AniList（トレンド・直接）", "stAl", "直接") +
      srcRow("anime", "Annict（国内の視聴者数）", "stAn", "…") +
      srcRow("fanza", "FANZA同人 ランキングページ", "stFz", "…") +
      srcRow("dlsite", "DLsite 同人 ランキングページ", "stDl", "…") +
      srcRow("fanza", "FANZA同人 動画（同人アニメ）", "stDa", "…") +
      srcRow("fanza", "FANZA 本・アニメ（通販ランキング）", "stFb", "…") +
      srcRow("anime", "Filmarks（国内の評価・レビュー）", "stFm", "…") +
      srcRow("karaoke", "カラオケ DAM ランキングページ", "stKa", "…") +
      srcRow("music", "Billboard JAPAN（視聴・総合）", "stBb", "…") +
      srcRow("movie", "映画.com・Box Office Mojo（映画）", "stMv", "…") +
      srcRow("anime", "dアニメストア・DMM TV（特別版）", "stSp", "…") +
      '<p class="note" style="padding:8px">どのランキングも、1時間ごとの自動取得が各サイトの<b>公開ページ</b>から集めたものです（API キーも登録も使いません）。手順は MagiScope/collector/README.md。</p></div>';
    body += '<div class="glass menu"><h4>データの管理</h4>' +
      '<button data-a="cacheClear"><span class="ico">' + ic("reload") + '</span><span class="lb">最新のランキングを取り直す<small>端末に控えたランキングを消します</small></span></button>' +
      '<button data-a="hclear"><span class="ico">' + ic("clock") + '</span><span class="lb">閲覧履歴を消す<small>' + S.hist.length + '件</small></span></button>' +
      '<button data-a="favclear"><span class="ico">' + ic("trash") + '</span><span class="lb">お気に入りをすべて消す<small>' + MS.CAT_IDS.reduce((a, c) => a + Object.keys(S.fav[c]).length, 0) + '件</small></span></button>' +
      '<button data-a="fclearAll"><span class="ico">' + ic("filter") + '</span><span class="lb">絞り込み条件をすべて戻す</span></button></div>';
    body += '<div class="glass menu"><h4>アプリ情報</h4>' +
      '<button data-a="help"><span class="ico">' + ic("help") + '</span><span class="lb">ヘルプ</span><span class="rt">' + ic("chev") + "</span></button>" +
      '<div style="display:flex;align-items:center;gap:12px;padding:13px 8px"><span class="ico" style="width:34px;height:34px;border-radius:11px;display:grid;place-items:center;background:var(--glass2)">' + ic("info") + '</span><span class="lb" style="flex:1;font-weight:800">MagiScope<small style="display:block;font-size:10.5px;color:var(--faint);font-weight:600">バージョン 1.3.0（2026-09-21）· 実データ・自動取得版 · XEVARION</small></span></div></div>';
    return { head: head({ title: "設定", fb: "#/me" }), body, after() { srcStatus(); } };
  };
  const srcRow = (c, label, id, v) => '<div style="display:flex;align-items:center;gap:10px;padding:11px 8px;border-bottom:1px solid var(--line)">' + catPill(c) +
    '<span class="lb" style="flex:1;font-size:12.5px;font-weight:700">' + label + '</span><span class="muted" id="' + id + '">' + v + "</span></div>";
  /* ★★ 2026-09-21e ご指定「より実行されたことをわかりやすく」。
     最後に取れた時刻・ここ最近の実行・止まっていそうなときの案内をまとめて出す。 */
  function runBox(st) {
    if (!st || !st.ok) return '<div class="runbox bad"><b>自動取得のデータが読めません</b><p>PC で register-task.bat を実行してください（手順は README.md）。</p></div>';
    const age = Date.now() - (st.at || 0);
    const bad = age > 3 * 3600e3;
    const runs = (st.runs || []).slice(-8).reverse();
    return '<div class="runbox' + (bad ? " bad" : " ok") + '"><div class="rb1"><span class="dot"></span><b>' +
      (bad ? "自動取得が止まっているかもしれません" : "自動取得は動いています") + "</b></div>" +
      '<p>最後に取れたのは <b>' + esc(MS.agoLabel(st.at)) + "</b>（" + esc(new Date(st.at).toLocaleString("ja-JP")) + "）</p>" +
      (bad ? '<p class="warn">1時間ごとに動くはずなので、3時間より古いときは<b>PC のタスクが登録されていない</b>か、<b>PC の電源が切れていた</b>ことが考えられます。PC で <b>check-task.bat</b> を開くと状態が分かります。</p>' : "") +
      (runs.length ? '<div class="runs">' + runs.map((r) => '<div class="run"><span>' + esc(new Date(r.at).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })) +
        "</span><span>" + (r.ng && r.ng.length ? '<em class="ng">一部失敗（' + esc(r.ng.join("・")) + "）</em>" : '<em class="okk">成功</em>') + "</span><span class=\"muted\">" + (r.sec ? Math.round(r.sec / 60) + "分" : "") + "</span></div>").join("") + "</div>" : "") +
      "</div>";
  }
  async function srcStatus() {
    const st = await R.status();
    const rb = $("#runBox"); if (rb) rb.innerHTML = runBox(st);
    const set = (id, t) => { const el = $("#" + id); if (el) el.textContent = t; };
    if (!st.ok) { const t = st.code === "nodata" ? "まだ動いていません" : "読めません"; ["stAn", "stFz", "stKa", "stDl", "stDa", "stFb", "stFm", "stBb", "stMv", "stSp"].forEach((i) => set(i, t)); return; }
    const at = (x) => (x ? MS.agoLabel(x) + "に更新" : "まだ取得していません");
    set("stAn", at(st.animeAt)); set("stFz", at(st.fanzaAt)); set("stKa", at(st.karaokeAt));
    set("stDl", at(st.dlsiteAt)); set("stDa", at(st.danimeAt)); set("stFb", at(st.fbooksAt || st.fvideoAt));
    set("stFm", at(st.animeAt)); set("stBb", at(st.musicAt)); set("stMv", at(st.movieAt)); set("stSp", at(st.specialAt));
  }

  /* ══════════ 操作（data-a ひとつで受ける） ══════════ */
  const ACT = {
    back: (b) => back(b.dataset.fb),
    retry: () => { R.clearCache(); render(); },
    fav: (b) => toggleFav(b.dataset.c, b.dataset.id),
    ageOK: () => { S.age = true; save(); render(); },
    showFanza: (b) => { S.set[b.dataset.c] = true; save(); render(); },
    showAdult: () => { S.set.adult = true; save(); render(); },
    klist: (b) => { const cur = (S.f.karaoke || {}).list || ""; S.f.karaoke = Object.assign({}, S.f.karaoke, { list: cur === b.dataset.v ? "" : b.dataset.v }); save(); render(); },
    agenre: (b) => { S.f.anime = Object.assign({}, S.f.anime, { genres: [b.dataset.v] }); save(); go("#/rank/anime"); },
    sortby: (b) => { const c = b.dataset.c; S.sort[c] = S.sort[c] === b.dataset.v ? "rank" : b.dataset.v; save(); render(); },
    sortSheet: (b) => sheet(sortSheetOf(b.dataset.scope)),
    filterSheet: (b) => sheet(filterSheetOf(b.dataset.scope)),
    filterGo: (b) => go("#/filter/" + b.dataset.c + (b.dataset.t ? "?t=" + b.dataset.t : "")),
    pick: (b) => applyPick(b.dataset.s, b.dataset.v),
    prefSheet: async (b) => { const c = b.dataset.c; if (!PREF_GS[c]) PREF_GS[c] = await prefGenres(c).catch(() => []); sheet(prefSheetHtml(c)); },
    prefPick: (b) => {
      const c = b.dataset.c, v = b.dataset.v;
      if (!Array.isArray(S.prefs[c])) S.prefs[c] = [];
      const a = S.prefs[c], i = a.indexOf(v);
      if (i >= 0) a.splice(i, 1); else a.push(v);
      save();
      const top = $("#sheet").scrollTop;
      sheet(prefSheetHtml(c)); $("#sheet").scrollTop = top;
      toast((i >= 0 ? "「" + v + "」を外しました" : "「" + v + "」を好みに入れました") + "（" + a.length + "件）");
    },
    prefClear: (b) => { S.prefs[b.dataset.c] = []; save(); sheet(prefSheetHtml(b.dataset.c)); },
    synmore: (b) => { const p = b.previousElementSibling; if (p) p.classList.remove("clamp"); b.remove(); },
    revmore: (b) => { const m = b.previousElementSibling; if (m) m.hidden = false; b.remove(); },
    sortrev: (b) => { S.rev = S.rev || {}; S.rev[b.dataset.c] = !S.rev[b.dataset.c]; save(); render(); },
    fflag: (b) => { draft[b.dataset.k] = b.dataset.v || ""; $$('[data-a="fflag"][data-k="' + b.dataset.k + '"]').forEach((x) => x.classList.toggle("on", x === b)); fPreview(curCat()); },
    genreRank: (b) => { const c = b.dataset.c; S.f[c] = Object.assign({}, S.f[c], { genres: [b.dataset.v] }); save(); go("#/rank/" + c); },
    samp: (b) => { sampAt = Number(b.dataset.i) || 0; paintSamp(); },
    sampMove: (b) => { if (!SAMPLES.length) return; sampAt = (sampAt + Number(b.dataset.v) + SAMPLES.length) % SAMPLES.length; paintSamp(); },
    fclear: (b) => {
      if (b.dataset.t === "all" || b.dataset.t === "sale") { const F = fOf(b.dataset.c, b.dataset.t); Object.keys(F).forEach((k) => delete F[k]); save(); render(); return; }
      const keepList = b.dataset.c === "karaoke" ? { list: S.f.karaoke.list || "" } : {}; S.f[b.dataset.c] = keepList; save(); render();
    },
    fdel: (b) => {
      const c = b.dataset.c, F = fOf(c, b.dataset.t), k = b.dataset.k;
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
      /* ★★ 2026-09-21g ご指定：ジャンル・作者などで絞り込んだら「全作品」で出す。
         ランキングのほうには、ジャンル・作者以外の条件（評価・販売数・時期など）だけ残す。 */
      const content = Object.keys(clean).filter((k) => CONTENT_KEYS.indexOf(k) >= 0);
      if (draftT === "sale") {
        S.fs = S.fs || {}; S.fs[c] = clean; save();
        toast(filterCount(c, clean) ? "セールを絞り込みました" : "条件をクリアしました");
        go("#/sale/" + c);
        return;
      }
      if (draftT === "all" || content.length) {
        S.fa = S.fa || {}; S.fa[c] = clean;
        if (draftT !== "all") { const rest = {}; Object.keys(clean).forEach((k) => { if (CONTENT_KEYS.indexOf(k) < 0) rest[k] = clean[k]; }); S.f[c] = rest; }
        save();
        toast(filterCount(c, clean) ? "全作品で絞り込みました" : "条件をクリアしました");
        go("#/all/" + c);
        return;
      }
      S.f[c] = clean; save();
      toast(filterCount(c, clean) ? "絞り込みました" : "条件をクリアしました");
      if (stack.length > 1 && /^#\/(rank|new)\//.test(stack[stack.length - 2])) history.back(); else go("#/rank/" + c);
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
    /* ★★ 2026-09-21d ご指定「押しても反応しない」。
       札の色は変わっていたが、何件選んだかも、選ぶと何が起きるのかも出ていなかった。
       ここで件数の表示と知らせを出し、押した手ごたえが分かるようにする。 */
    pref: (b) => {
      const c = b.dataset.c, v = b.dataset.v;
      if (!Array.isArray(S.prefs[c])) S.prefs[c] = [];
      const a = S.prefs[c], i = a.indexOf(v);
      if (i >= 0) a.splice(i, 1); else a.push(v);
      b.classList.toggle("on", i < 0);
      save();
      const n = $('.prefcat[data-c="' + c + '"] .prefn');
      if (n) n.textContent = a.length ? a.length + "件えらび中" : "えらんでいません";
      toast((i >= 0 ? "「" + v + "」を外しました" : "「" + v + "」を好みに入れました") + "（" + catName(c) + "・" + a.length + "件）");
    },
    hclear: async () => { if (!(await ask("閲覧履歴を消します", "これまでに見た作品の履歴をすべて消します。", "消す"))) return; S.hist = []; S.histClr = Date.now(); save(); render(); toast("閲覧履歴を消しました"); },
    favclear: async () => { if (!(await ask("お気に入りをすべて消します", "すべてのカテゴリーのお気に入りを外します。もとに戻せません。", "すべて消す"))) return; const now = Date.now(); S.favDel = S.favDel || {}; MS.CAT_IDS.forEach((c) => { Object.keys(S.fav[c] || {}).forEach((id) => { S.favDel[c + ":" + id] = now; }); S.fav[c] = {}; }); save(); render(); toast("お気に入りを消しました"); },
    fclearAll: () => { MS.CAT_IDS.forEach((c) => { S.f[c] = {}; }); save(); toast("絞り込み条件を戻しました"); },
    cacheClear: () => { R.clearCache(); noticeMemo = null; toast("ランキングを取り直します"); },
    ageReset: () => { S.age = false; save(); render(); toast("次に成人向けのカテゴリーを開くときに確認します"); },
    histShow: () => { S.showHist = !S.showHist; save(); render(); },
    rqShow: () => { S.showRq = !S.showRq; save(); render(); },
    hdel: (b) => {
      S.hist = S.hist.filter((h) => !(h.c === b.dataset.c && h.id === b.dataset.id));
      S.histDel = S.histDel || {}; S.histDel[b.dataset.c + ":" + b.dataset.id] = Date.now();   /* 同期で生き返らないように */
      save(); render(); toast("この1件を消しました");
    },
    rqdel: (b) => { const c = b.dataset.c; S.recentQ[c] = (S.recentQ[c] || []).filter((x) => x !== b.dataset.v); save(); render(); },
    favsort: (b) => { S.favSort = b.dataset.v; save(); render(); },
    favrev: () => { S.favRev = !S.favRev; save(); render(); },
    allqclear: () => { S.allQ = ""; save(); render(); },
    newqclear: () => { S.newQ = ""; save(); render(); },
    dealqclear: () => { if (S.deal && S.deal.sale) S.deal.sale.q = ""; save(); render(); },
    dealset: (b) => {
      const m = b.dataset.m, k = b.dataset.k, v = b.dataset.v;
      S.deal = S.deal || {}; const st = S.deal[m] = S.deal[m] || {};
      st[k] = k === "rev" ? !!v : v;
      save(); render();
    },
    favwhen: (b) => { S.favWhen = b.dataset.v; save(); render(); },
    favqclear: () => { S.favQ = ""; save(); render(); },
    help: () => sheet("<h2>" + ic("help") + " MagiScope の使いかた</h2><p><b>ANIME・FANZA同人・KARAOKE</b> の3つのランキングを、それぞれ別の出典から取得しています（カテゴリーをまたいだ順位はありません）。<br><br>" +
      "・アニメ＝「国内」は Annict の視聴者数（国内のアニメ視聴記録サービス）、「総合」などは AniList のトレンド（日本の作品）です。<br>・FANZA同人＝DMM の API（既定はコミック）。<br>・カラオケ＝カラオケ DAM の公開ランキング。ジャケット・発売日は iTunes から補っています。<br>" +
      "・カラオケ・FANZA・国内アニメは1時間ごとの自動取得で更新されます。前回順位＝前の日までの記録、推移＝日ごとの記録です。記録が無いあいだは「—」と表示されます。<br>" +
      "・お気に入り・履歴・設定は XEVARION のアカウントで同期されます。</p><div class=\"btns\"><button class=\"btn pri\" data-a=\"closeSheet\">とじる</button></div>"),
    closeSheet: () => closeSheet(),
    lang: (b) => { if (window.XevaI18n) XevaI18n.set(b.dataset.v); else { try { localStorage.setItem("xeva_lang_v1", b.dataset.v); } catch (e) {} } render(true); },
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
    if (tab) { resetTab(tab.dataset.tab); const to = { home: "#/", rank: "#/rank", new: "#/new", rec: "#/rec", all: "#/all", sale: "#/sale", fav: "#/fav", me: "#/me" }[tab.dataset.tab]; if (to) go(to); }
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
      if (k === "homeAdult" && (location.hash || "#/") === "#/") render();   /* ホームの表示をすぐ切りかえる */
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
  /* つながった・切れたら描き直す（オフラインのお知らせを出し入れする） */
  window.addEventListener("online", () => { R.clearCache(); render(true); });
  window.addEventListener("offline", () => render(true));
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
