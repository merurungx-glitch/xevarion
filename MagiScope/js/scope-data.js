/* ============================================================
   MagiScope — データ層（2026-09-20b 実データ版）
   ------------------------------------------------------------
   ★ 画面（scope-ui.js）は <b>MS.repo だけ</b>を呼ぶ。どこからデータが来るかは知らない。
     カテゴリーごとにソースを1つずつ持ち、MS.repo.use(cat, source) で差しかえられる。

   取得元（すべて実データ・画像も本物）
     ANIME   … AniList GraphQL（鍵なし・ブラウザから直接）。日本の作品だけ。
               今日＝AniList のトレンド順、今週・今月＝日ごとのトレンド値の合計（直近25日まで）。
               国内＝Annict の視聴者数（今季・前季・今年・人気）。Annict の公開ページから自動取得。
     FANZA   … FANZA同人のコミックのランキングページ（24時間・1時間・週間・月間・累計・販売数）と作品ページ。
     KARAOKE … カラオケ DAM の公開ランキング（DAM はブラウザから直接読めないので自動取得）。
               ジャケット・発売日・ジャンル＝iTunes、ソロ/グループ・男女＝MusicBrainz。
     ★ 2026-09-20d <b>鍵なし</b>。各サイトの公開ページを自動取得（MagiScope/collector/collect.py）が1時間ごとに読み、
       GitHub の magiscope-data ブランチに JSON で置く。アプリは raw.githubusercontent.com から読むだけ。
       （GitHub Actions＝カラオケ・アニメ／FANZA は日本からしか見られないので PC の run-pc.bat）
       前回順位＝前の日までの最後の並び、推移＝日ごとの記録（hist）。

   ★★ 最重要の決まり：<b>3カテゴリーのランキングは混ぜない</b>。
     モデル（AnimeRanking / FanzaRanking / KaraokeRanking）・種類・期間・絞り込み・ソースがすべて別。
     「全カテゴリーをまとめた順位」を作る関数は1つも用意していない。
   ============================================================ */
(function () {
  "use strict";
  const MS = (window.MS = window.MS || {});

  /* ══════════ 日付 ══════════ */
  const NOW = new Date();
  const D0 = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate());
  const T = Math.round(D0.getTime() / 864e5);
  const pad = (n) => String(n).padStart(2, "0");
  const ymd = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const toDate = (s) => (typeof s === "string" ? new Date(s.slice(0, 10).replace(/-/g, "/")) : new Date(s));
  const fmtDate = (s) => { if (!s) return ""; const d = toDate(s); return isNaN(d) ? String(s) : d.getFullYear() + "/" + pad(d.getMonth() + 1) + "/" + pad(d.getDate()); };
  const fmtMD = (s) => { const d = toDate(s); return (d.getMonth() + 1) + "/" + d.getDate(); };
  const daysAgo = (s) => { if (!s) return 99999; return Math.floor((D0 - toDate(s)) / 864e5); };
  const SEASON_EN = ["WINTER", "SPRING", "SUMMER", "FALL"];
  const SEASON_NM = { WINTER: "冬", SPRING: "春", SUMMER: "夏", FALL: "秋" };
  const CUR = { y: D0.getFullYear(), s: Math.floor(D0.getMonth() / 3) };
  const PREV = CUR.s ? { y: CUR.y, s: CUR.s - 1 } : { y: CUR.y - 1, s: 3 };
  const agoLabel = (t) => { if (!t) return ""; const m = Math.round((Date.now() - t) / 60000); return m < 1 ? "たった今" : m < 60 ? m + "分前" : m < 1440 ? Math.round(m / 60) + "時間前" : Math.round(m / 1440) + "日前"; };

  const PERIODS = {
    day: { id: "day", label: "今日", prev: "昨日" }, week: { id: "week", label: "今週", prev: "先週" },
    month: { id: "month", label: "今月", prev: "先月" }, season: { id: "season", label: "今季", prev: "前季" },
    year: { id: "year", label: "今年", prev: "昨年" }, all: { id: "all", label: "歴代", prev: "前回" },
    prevseason: { id: "prevseason", label: "前季", prev: "前回" },
  };

  /* ══════════ カテゴリーの定義（UI もここを見る） ══════════ */
  const ANIME_GENRES = ["アクション", "ファンタジー", "恋愛", "コメディ", "SF", "ミステリー", "スポーツ", "日常", "ドラマ", "その他"];
  const ANIME_FORMATS = ["TVアニメ", "劇場版", "OVA", "配信作品", "シリーズ作品"];
  const AL_GENRE = { "アクション": ["Action"], "ファンタジー": ["Fantasy"], "恋愛": ["Romance"], "コメディ": ["Comedy"], "SF": ["Sci-Fi"],
    "ミステリー": ["Mystery"], "スポーツ": ["Sports"], "日常": ["Slice of Life"], "ドラマ": ["Drama"],
    "その他": ["Adventure", "Horror", "Mahou Shoujo", "Mecha", "Music", "Psychological", "Supernatural", "Thriller", "Ecchi"] };
  const GENRE_JA = { Action: "アクション", Adventure: "アドベンチャー", Comedy: "コメディ", Drama: "ドラマ", Ecchi: "お色気", Fantasy: "ファンタジー",
    Horror: "ホラー", "Mahou Shoujo": "魔法少女", Mecha: "ロボット", Music: "音楽", Mystery: "ミステリー", Psychological: "サイコ",
    Romance: "恋愛", "Sci-Fi": "SF", "Slice of Life": "日常", Sports: "スポーツ", Supernatural: "超常", Thriller: "サスペンス" };
  const FORMAT_JA = { TV: "TVアニメ", TV_SHORT: "TVアニメ（ショート）", MOVIE: "劇場版", OVA: "OVA", SPECIAL: "特別編", ONA: "配信作品", MUSIC: "MV" };
  const FORMAT_AL = { "TVアニメ": ["TV", "TV_SHORT"], "劇場版": ["MOVIE"], "OVA": ["OVA", "SPECIAL"], "配信作品": ["ONA"] };
  /* カラオケ：DAM のジャンル別ランキング（カテゴリー） */
  const KARA_LISTS = [["", "すべて"], ["anison", "アニメソング"], ["vocaloid", "ボーカロイド"], ["foreign", "洋楽"], ["enka", "演歌・歌謡曲"], ["vtuber", "VTuber"]];
  const KARA_GENRES = KARA_LISTS.slice(1).map((x) => x[1]);

  const CATS = {
    anime: {
      id: "anime", en: "ANIME", ja: "アニメ", unit: "作品", noun: "作品", title: "アニメランキング", mainPeriod: "day",
      source: "AniList", sourceUrl: "https://anilist.co",
      types: [
        { id: "overall", label: "総合",   periods: ["day", "week", "month", "season", "year", "all"] },
        { id: "jp",      label: "国内",   periods: ["season", "prevseason", "year", "all"], def: "season", note: "国内の視聴者数（Annict）" },
        { id: "fm",      label: "話題",   period: "day", note: "いま話題のアニメ（Filmarks・国内の評価つき）" },
        { id: "new",     label: "新作",   periods: ["day", "week", "month"], note: "放送・配信開始から120日以内" },
        { id: "season",  label: "今季",   periods: ["day", "week", "month", "season"], def: "day" },
        { id: "year",    label: "年間",   period: "year" },
        { id: "alltime", label: "歴代",   period: "all" },
        { id: "rising",  label: "急上昇", periods: ["day", "week"] },
        { id: "popular", label: "人気",   period: "season", note: "放送中の作品の人気順" },
        { id: "rating",  label: "評価",   period: "all", note: "評価の高い順（1万人以上が登録した作品）" },
      ],
      compare: [
        { id: "week", label: "今週 vs 先週", period: "week", def: true },
        { id: "day",  label: "今日 vs 昨日", period: "day" },
        { id: "jp",   label: "国内 今季 vs 前回", period: "season", type: "jp" },
      ],
    },
    fanza: {
      id: "fanza", en: "FANZA", ja: "FANZA同人", unit: "作品", noun: "作品", title: "FANZA同人ランキング", mainPeriod: "day", adult: true,
      source: "FANZA同人", sourceUrl: "https://www.dmm.co.jp/dc/doujin/-/ranking-all/",
      types: [
        { id: "overall", label: "総合",   period: "day", note: "FANZA同人 コミック 24時間ランキング" },
        { id: "new",     label: "新刊",   period: "month", note: "24時間・週間ランキングのうち配信30日以内" },
        { id: "popular", label: "人気",   period: "week", note: "販売数順（週間）" },
        { id: "rising",  label: "急上昇", period: "day", note: "1時間ランキング" },
        { id: "week",    label: "今週",   period: "week", note: "週間ランキング" },
        { id: "month",   label: "今月",   period: "month", note: "月間ランキング" },
        { id: "alltime", label: "歴代",   period: "all", note: "累計ランキング（FANZA に年間ランキングは無いため累計）" },
      ],
      compare: [
        { id: "month", label: "今月 vs 先月", period: "month", days: 30, def: true },
        { id: "week",  label: "今週 vs 先週", period: "week", days: 7 },
        { id: "last",  label: "いま vs 前回の記録", period: "all", back: 1 },
      ],
    },
    /* ★★ 2026-09-21 DLsite 同人（マンガ）。FANZA とは<b>別のカテゴリー</b>（ご指定）。 */
    dlsite: {
      id: "dlsite", en: "DLSITE", ja: "DLsite同人", unit: "作品", noun: "作品", title: "DLsite同人ランキング", mainPeriod: "day", adult: true,
      source: "DLsite 同人", sourceUrl: "https://www.dlsite.com/maniax/ranking/day?category=doujin&sub=MNG",
      types: [
        { id: "overall", label: "総合",   period: "day", note: "DLsite 同人マンガ 24時間ランキング" },
        { id: "rising",  label: "急上昇", period: "day", note: "いま伸びている作品（トレンド順）" },
        { id: "new",     label: "新着",   period: "month", note: "新しく出た作品" },
        { id: "popular", label: "人気",   period: "all", note: "販売数の多い順" },
        { id: "rating",  label: "評価",   period: "all", note: "評価の高い順" },
        { id: "week",    label: "今週",   period: "week", note: "7日間ランキング" },
        { id: "month",   label: "今月",   period: "month", note: "30日間ランキング" },
        { id: "year",    label: "年間",   period: "year", note: "年間ランキング" },
        { id: "alltime", label: "歴代",   period: "all", note: "累計ランキング" },
      ],
      compare: [
        { id: "day",   label: "今日 vs 前回", period: "day", def: true },
        { id: "week",  label: "今週 vs 先週", period: "week", days: 7 },
        { id: "month", label: "今月 vs 先月", period: "month", days: 30 },
      ],
    },
    karaoke: {
      id: "karaoke", en: "KARAOKE", ja: "カラオケ", unit: "曲", noun: "曲", title: "カラオケランキング", mainPeriod: "week",
      source: "カラオケ DAM", sourceUrl: "https://www.clubdam.com/ranking/",
      types: [
        { id: "overall", label: "総合",         periods: ["day", "week", "month", "year"] },
        { id: "daily",   label: "デイリー",     period: "day" },
        { id: "weekly",  label: "ウィークリー", period: "week" },
        { id: "monthly", label: "マンスリー",   period: "month" },
        { id: "year",    label: "年間",         period: "year" },
        { id: "rising",  label: "急上昇",       periods: ["day", "week", "month"] },
        { id: "new",     label: "新曲",         periods: ["day", "week", "month"], note: "発売から180日以内" },
        { id: "duet",    label: "デュエット",   periods: ["week", "month"], k: true },
        { id: "kensaku", label: "検索",         period: "month", k: true, note: "DAM で検索された回数の順" },
      ],
      compare: [
        { id: "day",   label: "今日 vs 昨日", period: "day", def: true },
        { id: "week",  label: "今週 vs 先週", period: "week" },
        { id: "month", label: "今月 vs 先月", period: "month" },
      ],
    },
  };
  const CAT_IDS = ["anime", "fanza", "dlsite", "karaoke"];
  /* 並べ替え（ランキング順のほかに選べるもの）。MagiBurst の並べ替えと同じ考えかた。 */
  const SORTS = {
    anime: [["rank", "ランキング順"], ["watchers", "視聴者数順"], ["fm", "国内評価順"], ["new", "新しい順"], ["title", "名前順"]],
    fanza: [["rank", "ランキング順"], ["rating", "評価順"], ["sales", "販売数順"], ["new", "新しい順"], ["price", "安い順"], ["title", "名前順"]],
    dlsite: [["rank", "ランキング順"], ["rating", "評価順"], ["sales", "販売数順"], ["new", "新しい順"], ["price", "安い順"], ["title", "名前順"]],
    karaoke: [["rank", "ランキング順"], ["new", "新しい順"], ["old", "古い順"], ["title", "曲名順"], ["artist", "アーティスト順"]],
  };
  function sortEntries(cat, entries, sort) {
    if (!sort || sort === "rank") return entries;
    const v = (e) => e.item || e;
    const n = (x) => Number(x) || 0;
    const d = (x) => (x && x.releaseDate ? x.releaseDate : "");
    const cmp = {
      watchers: (a, b) => n(v(b).watchers) - n(v(a).watchers),
      fm: (a, b) => n(v(b).fmScore) - n(v(a).fmScore),
      rating: (a, b) => n(v(b).rating) - n(v(a).rating) || n(v(b).votes) - n(v(a).votes),
      sales: (a, b) => n(v(b).sales) - n(v(a).sales),
      price: (a, b) => (n(String(v(a).price).replace(/,/g, "")) || 99999) - (n(String(v(b).price).replace(/,/g, "")) || 99999),
      new: (a, b) => (d(v(b)) > d(v(a)) ? 1 : d(v(b)) < d(v(a)) ? -1 : 0),
      old: (a, b) => (d(v(a)) > d(v(b)) ? 1 : d(v(a)) < d(v(b)) ? -1 : 0),
      title: (a, b) => String(v(a).title).localeCompare(String(v(b).title), "ja"),
      artist: (a, b) => String(v(a).artist || "").localeCompare(String(v(b).artist || ""), "ja"),
    }[sort];
    return cmp ? entries.slice().sort(cmp) : entries;
  }
  const typeOf = (cat, id) => CATS[cat].types.find((t) => t.id === id) || CATS[cat].types[0];
  const periodsOfType = (cat, typeId) => { const t = typeOf(cat, typeId); return t.period ? [t.period] : t.periods; };
  const defaultPeriod = (cat, typeId) => {
    const t = typeOf(cat, typeId);
    if (t.period) return t.period;
    if (t.def) return t.def;
    return t.periods.indexOf(CATS[cat].mainPeriod) >= 0 ? CATS[cat].mainPeriod : t.periods[0];
  };

  /* ══════════ データモデル（カテゴリーごとに別） ══════════
     1行 = rank / previousRank / rankChange / isNew / prevKnown / title / image / genre / period / category / rankingType / item
     prevKnown=false は「前回の記録がまだ無い」（NEW と区別する） */
  function baseRow(cat, raw, ctx) {
    const rank = raw.rank | 0;
    const known = raw.prevKnown !== false;
    const prev = raw.previousRank == null ? null : raw.previousRank | 0;
    return {
      category: cat, rankingType: ctx.type, period: ctx.period, rank,
      previousRank: prev, prevKnown: known,
      rankChange: prev == null ? null : prev - rank,
      isNew: known && prev == null,
      title: raw.item.title, image: raw.item.image || null, genre: raw.item.genre || "", score: raw.score || 0, item: raw.item,
    };
  }
  const Models = {
    AnimeRanking: (raw, ctx) => baseRow("anime", raw, ctx),
    FanzaRanking: (raw, ctx) => baseRow("fanza", raw, ctx),
    DlsiteRanking: (raw, ctx) => baseRow("dlsite", raw, ctx),
    KaraokeRanking: (raw, ctx) => baseRow("karaoke", raw, ctx),
  };
  const MODEL_OF = { anime: Models.AnimeRanking, fanza: Models.FanzaRanking, dlsite: Models.DlsiteRanking, karaoke: Models.KaraokeRanking };

  /* ══════════ 通信とキャッシュ ══════════
     ・同じ問い合わせは一定時間メモリから返す
     ・成功したものは localStorage にも控え、通信できないときはそれを出す（オフライン表示） */
  const CACHE_KEY = "magiscope_cache_v2";
  const mem = new Map();
  let disk = null;
  function diskLoad() { if (!disk) { try { disk = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}") || {}; } catch (e) { disk = {}; } } return disk; }
  function diskSave(k, v) {
    const d = diskLoad();
    d[k] = { at: Date.now(), v };
    const ks = Object.keys(d).sort((a, b) => d[a].at - d[b].at);
    while (ks.length > 40) delete d[ks.shift()];
    for (let i = 0; i < 8; i++) {
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(d)); return; }
      catch (e) { const k0 = Object.keys(d).sort((a, b) => d[a].at - d[b].at)[0]; if (!k0) return; delete d[k0]; }
    }
  }
  let offlineHit = false;
  async function cached(key, ttl, fn, persist) {
    const m = mem.get(key);
    if (m && m.v && Date.now() - m.at < ttl) return m.v;
    if (m && m.p) return m.p;
    const p = (async () => {
      try {
        const v = await fn();
        mem.set(key, { at: Date.now(), v });
        if (persist) diskSave(key, v);
        return v;
      } catch (e) {
        mem.delete(key);
        const d = diskLoad()[key];
        if (d) { offlineHit = true; return Array.isArray(d.v) ? d.v : Object.assign({}, d.v, { _stale: d.at }); }
        throw e;
      }
    })();
    mem.set(key, { at: 0, p });
    return p;
  }
  /* ══ 自動取得の置き場（GitHub の magiscope-data ブランチ）══
     lists/<key>.json・hist/<key>.json・index/<cat>.json・meta.json。
     アプリの中の呼び名（"lists/…" "prev/…" "hist/…" "items/<cat>/<id>" "meta"）をファイルに読みかえる。 */
  const DATA_DEFAULT = "https://raw.githubusercontent.com/merurungx-glitch/xevarion/magiscope-data/";
  const dataBase = () => String(window.MS_DATA || DATA_DEFAULT).replace(/\/?$/, "/");
  const fkey = (x) => String(x).replace(/[^\w.\-]/g, "_");
  function file(name, ttl) {
    return cached("gh:" + name, ttl || 300e3, async () => {
      const r = await fetch(dataBase() + name, { cache: "no-cache" });
      if (r.status === 404) { const e = new Error("自動取得のデータがまだありません"); e.code = "nodata"; throw e; }
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    }, true);
  }
  async function findIn(cat, id) {
    const rows = await file("index/" + cat + ".json", 1800e3);
    const x = (rows || []).find((r) => r && String(r.id) === String(id));
    if (!x) { const e = new Error("見つかりません"); e.code = "nodata"; throw e; }
    return x;
  }
  async function fb(path, ttl) {
    const p = path.split("/");
    if (p[0] === "lists") return file("lists/" + fkey(p[1]) + ".json", ttl);
    if (p[0] === "prev") { const L = await file("lists/" + fkey(p[1]) + ".json", ttl); return L.prevIds ? { d: L.prevD, ids: L.prevIds } : null; }
    if (p[0] === "hist") return file("hist/" + fkey(p[1]) + ".json", ttl);
    if (p[0] === "items") return findIn(p[1], decodeURIComponent(p.slice(2).join("/")));
    if (p[0] === "index") return file("index/" + p[1] + ".json", ttl);
    return file(path + ".json", ttl);
  }

  /* ══════════ ANIME（AniList） ══════════ */
  const AL_FIELDS = "id title{native romaji english} coverImage{extraLarge large color} bannerImage genres season seasonYear format status episodes averageScore popularity favourites trending siteUrl startDate{year month day} studios(isMain:true){nodes{name}}";
  const AL_LIST = `query($page:Int,$sort:[MediaSort],$season:MediaSeason,$year:Int,$status:MediaStatus,$minPop:Int,$genres:[String],$formats:[MediaFormat],$startAfter:FuzzyDateInt,$search:String){Page(page:$page,perPage:50){pageInfo{hasNextPage}media(type:ANIME,countryOfOrigin:"JP",isAdult:false,sort:$sort,season:$season,seasonYear:$year,status:$status,popularity_greater:$minPop,genre_in:$genres,format_in:$formats,startDate_greater:$startAfter,search:$search){${AL_FIELDS} trends(sort:DATE_DESC,perPage:25){nodes{date trending}}}}}`;
  const AL_ONE = `query($id:Int){Media(id:$id,type:ANIME){${AL_FIELDS} description(asHtml:false) trends(sort:DATE_DESC,perPage:25){nodes{date trending}} relations{edges{relationType node{${AL_FIELDS} type}}} recommendations(sort:RATING_DESC,perPage:12){nodes{mediaRecommendation{${AL_FIELDS} type}}}}}`;
  async function anilist(query, vars) {
    const r = await fetch("https://graphql.anilist.co", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ query, variables: vars }) });
    const j = await r.json();
    if (j.errors && !j.data) throw new Error("AniList: " + (j.errors[0] && j.errors[0].message));
    if (!j.data) throw new Error("AniList: HTTP " + r.status);
    return j.data;
  }
  function animeView(m) {
    if (!m) return null;
    const genres = (m.genres || []).map((g) => GENRE_JA[g] || g);
    const sd = m.startDate || {};
    const title = (m.title && (m.title.native || m.title.romaji || m.title.english)) || "";
    return {
      id: String(m.id), category: "anime", title, sub: m.title && m.title.romaji !== title ? m.title.romaji : "",
      image: (m.coverImage && (m.coverImage.extraLarge || m.coverImage.large)) || null, banner: m.bannerImage || null, color: m.coverImage && m.coverImage.color,
      genres: genres.length ? genres : ["その他"], genre: genres[0] || "その他", genresEn: m.genres || [],
      format: FORMAT_JA[m.format] || m.format || "", formatEn: m.format, year: m.seasonYear || sd.year || null,
      season: m.season || null, seasonLabel: (m.seasonYear || sd.year) ? (m.seasonYear || sd.year) + "年" + (SEASON_NM[m.season] || "") : m.status === "NOT_YET_RELEASED" ? "放送前" : "",
      airing: m.status === "RELEASING", status: m.status, episodes: m.episodes, studio: (m.studios && m.studios.nodes && m.studios.nodes[0] && m.studios.nodes[0].name) || "",
      rating: m.averageScore ? m.averageScore / 20 : null, votes: m.popularity || 0, popularity: m.popularity || 0, favourites: m.favourites || 0,
      url: m.siteUrl, releaseDate: sd.year ? sd.year + "-" + pad(sd.month || 1) + "-" + pad(sd.day || 1) : "",
      isSeries: /第\s*\d+\s*(期|シリーズ|クール)|Season\s*\d|シーズン|\b(2nd|3rd|\dth)\b|続編|[2-9]$|II$/i.test(title + " " + ((m.title && m.title.romaji) || "")),
    };
  }
  /* 日ごとのトレンド値：{ "YYYY-MM-DD": 値 } */
  function trendMap(m) {
    const o = {};
    ((m && m.trends && m.trends.nodes) || []).forEach((n) => { o[ymd(new Date(n.date * 1000))] = n.trending || 0; });
    return o;
  }
  const dayKey = (back) => ymd(new Date(D0.getFullYear(), D0.getMonth(), D0.getDate() - back));
  function sumDays(tm, from, n) { let s = 0; for (let i = from; i < from + n; i++) s += tm[dayKey(i)] || 0; return s; }

  class AniListSource {
    constructor() { this.cat = "anime"; this.label = "AniList（日本の作品・リアルタイム）＋ Annict（国内の視聴者数）"; this._byId = {}; this._jp = {}; }
    async page(vars, pages) {
      const key = "al:" + JSON.stringify(vars) + ":" + (pages || 1);
      return cached(key, 600e3, async () => {
        let media = [];
        for (let p = 1; p <= (pages || 1); p++) {
          const d = await anilist(AL_LIST, Object.assign({ page: p }, vars));
          media = media.concat(d.Page.media);
          if (!d.Page.pageInfo.hasNextPage) break;
        }
        return { media, at: Date.now() };
      }, true);
    }
    remember(ms) { (ms || []).forEach((m) => { this._byId[String(m.id)] = Object.assign({}, this._byId[String(m.id)] || {}, m); }); }
    serverVars(f) {
      const v = {};
      const gs = [];
      ((f && f.genres) || []).forEach((g) => (AL_GENRE[g] || []).forEach((x) => gs.push(x)));
      if (gs.length) v.genres = gs;
      const fm = [];
      ((f && f.formats) || []).forEach((x) => (FORMAT_AL[x] || []).forEach((y) => fm.push(y)));
      if (fm.length && (f.formats || []).indexOf("シリーズ作品") < 0) v.formats = fm;
      return v;
    }
    passes(it, f) {
      if (!f) return true;
      if (f.formats && f.formats.length) {
        const ok = f.formats.some((x) => x === "シリーズ作品" ? it.isSeries : (FORMAT_AL[x] || []).indexOf(it.formatEn) >= 0);
        if (!ok) return false;
      }
      if (f.airing && f.airing.length) {
        const si = SEASON_EN.indexOf(it.season);
        const ok = f.airing.some((x) => x === "cur" ? it.year === CUR.y && si === CUR.s : x === "prev" ? it.year === PREV.y && si === PREV.s : x === "year" ? it.year === CUR.y : (it.year || 9999) < CUR.y);
        if (!ok) return false;
      }
      return true;
    }
    /* 種類×期間 → 並び（ids と、前回の並び） */
    async ordered(typeId, period, f) {
      const sv = this.serverVars(f);
      const season = SEASON_EN[CUR.s];
      let vars, snapKey = null;
      const trendish = (typeId === "overall" && ["day", "week", "month"].indexOf(period) >= 0) || typeId === "new" || typeId === "rising" || (typeId === "season" && period !== "season");
      if (typeId === "overall") {
        if (period === "season") { vars = { sort: ["POPULARITY_DESC"], season, year: CUR.y }; snapKey = "anime_season"; }
        else if (period === "year") { vars = { sort: ["POPULARITY_DESC"], year: CUR.y }; snapKey = "anime_year"; }
        else if (period === "all") { vars = { sort: ["POPULARITY_DESC"] }; snapKey = "anime_alltime"; }
        else vars = { sort: ["TRENDING_DESC"] };
      } else if (typeId === "new") {
        const d = new Date(D0.getFullYear(), D0.getMonth(), D0.getDate() - 120);
        vars = { sort: ["TRENDING_DESC"], startAfter: d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate() };
      } else if (typeId === "season") {
        vars = period === "season" ? { sort: ["POPULARITY_DESC"], season, year: CUR.y } : { sort: ["TRENDING_DESC"], season, year: CUR.y };
        if (period === "season") snapKey = "anime_season";
      } else if (typeId === "year") { vars = { sort: ["POPULARITY_DESC"], year: CUR.y }; snapKey = "anime_year"; }
      else if (typeId === "alltime") { vars = { sort: ["POPULARITY_DESC"] }; snapKey = "anime_alltime"; }
      else if (typeId === "rising") vars = { sort: ["TRENDING_DESC"] };
      else if (typeId === "popular") { vars = { sort: ["POPULARITY_DESC"], status: "RELEASING" }; snapKey = "anime_popular"; }
      else { vars = { sort: ["SCORE_DESC"], minPop: 10000 }; snapKey = "anime_rating"; }
      const res = await this.page(Object.assign({}, vars, sv), 2);
      this.remember(res.media);
      let ms = res.media.filter((m) => this.passes(animeView(m), f));
      let cur, prev = null, prevKnown = false;
      const score = {};
      if (trendish) {
        const tm = {}; ms.forEach((m) => { tm[m.id] = trendMap(m); });
        if (typeId === "rising") {
          const n = period === "week" ? 7 : 1;
          const k = period === "week" ? 1 : 3;
          ms.forEach((m) => { const c = sumDays(tm[m.id], 0, n) + (n === 1 ? sumDays(tm[m.id], 1, 1) : 0), p = sumDays(tm[m.id], n + (n === 1 ? 1 : 0), n * k) / k + 1; score[m.id] = c > 30 ? c / p : 0; });
          ms = ms.filter((m) => score[m.id] > 0);
          cur = ms.slice().sort((x, y) => score[y.id] - score[x.id]).map((m) => String(m.id));
          const ps = {}; ms.forEach((m) => { ps[m.id] = sumDays(tm[m.id], n, n) / (sumDays(tm[m.id], 2 * n, n) + 1); });
          prev = ms.slice().sort((x, y) => ps[y.id] - ps[x.id]).map((m) => String(m.id)); prevKnown = true;
        } else {
          let a, b = null;
          if (period === "day") { a = (m) => m.trending || 0; b = (m) => tm[m.id][dayKey(1)] || 0; }
          else if (period === "week") { a = (m) => sumDays(tm[m.id], 0, 7); b = (m) => sumDays(tm[m.id], 7, 7); }
          else a = (m) => sumDays(tm[m.id], 0, 25);
          ms.forEach((m) => { score[m.id] = a(m); });
          cur = ms.slice().sort((x, y) => a(y) - a(x)).map((m) => String(m.id));
          if (b) { prev = ms.slice().sort((x, y) => b(y) - b(x)).filter((m) => b(m) > 0).map((m) => String(m.id)); prevKnown = true; }
        }
      } else {
        cur = ms.map((m) => String(m.id));
        if (snapKey) {
          try {
            const pv = await fb("prev/" + snapKey, 600e3);
            if (pv && pv.ids) { const set = {}; cur.forEach((id) => { set[id] = 1; }); prev = pv.ids.split(",").filter((id) => set[id]); prevKnown = true; }
          } catch (e) {}
        }
      }
      return { cur, prev, prevKnown, score, at: res.at, stale: res._stale };
    }
    /* 国内で話題のアニメ（Filmarks）… 国内の評価つき */
    async fmList(f, sort) {
      const j = await fb("lists/anime_fm-trend", 600e3);
      const known = !!j.prevD;
      const rows = (j.entries || []).map((x) => ({ item: jpView(x), prev: x.prev || null })).filter((r) => this.jpPasses(r.item, f));
      rows.forEach((r) => { this._jp[r.item.id] = r.item; });
      const ctx = { type: "fm", period: "day" };
      let entries = rows.map((r, i) => MODEL_OF.anime({ rank: i + 1, previousRank: known ? r.prev : null, prevKnown: known, item: r.item }, ctx));
      entries = sortEntries("anime", entries, sort);
      return { category: "anime", type: "fm", period: "day", total: entries.length, entries, rangeLabel: "いま話題のアニメ（Filmarks・国内の評価）",
        updatedAt: j.at, stale: j._stale, prevLabel: known ? String(j.prevD).replace(/-/g, "/") + " の記録" : "", source: "Filmarks", sourceUrl: "https://filmarks.com/list-anime/trend" };
    }
    jpPasses(it, f) {
      if (!f) return true;
      const g = (f && f.genres) || [], fm = (f && f.formats) || [];
      if (g.length) {
        const gs = it.genres || [];
        const ok = f.genreAnd ? g.every((x) => gs.indexOf(x) >= 0) : g.some((x) => x === "その他" ? gs.some((y) => ANIME_GENRES.indexOf(y) < 0) : gs.indexOf(x) >= 0);
        if (!ok) return false;
      }
      if (fm.length && !fm.some((x) => x === "シリーズ作品" ? it.isSeries : (FORMAT_AL[x] || []).indexOf(it.formatEn) >= 0)) return false;
      if (f.studio && kanaNorm(it.studio || "").indexOf(kanaNorm(f.studio)) < 0) return false;
      if (f.director && kanaNorm(it.director || "").indexOf(kanaNorm(f.director)) < 0) return false;
      if (f.cast && !(it.cast || []).some((c) => kanaNorm(c.n).indexOf(kanaNorm(f.cast)) >= 0)) return false;
      if (f.minRate && !(Number(it.fmScore) >= Number(f.minRate))) return false;
      return true;
    }
    /* 国内ランキング（Annict の視聴者数）… 自動取得が書いた一覧を読む */
    async jpList(period, f, sort) {
      const k = { season: "season", prevseason: "prevseason", year: "year", all: "all" }[period] || "season";
      const j = await fb("lists/anime_jp-" + k, 600e3);
      const known = !!j.prevD;
      let rows = (j.entries || []).map((x) => ({ item: jpView(x), prev: x.prev || null }));
      rows.forEach((r) => { this._jp[r.item.id] = r.item; });
      const filtered = rows.filter((r) => this.jpPasses(r.item, f));
      const rerank = filtered.length !== rows.length;
      const pr = new Map();
      if (rerank) filtered.filter((r) => r.prev).sort((a, b) => a.prev - b.prev).forEach((r, i) => pr.set(r, i + 1));
      const ctx = { type: "jp", period };
      let entries = filtered.map((r, i) => MODEL_OF.anime({ rank: i + 1, previousRank: known ? (rerank ? pr.get(r) || null : r.prev) : null, prevKnown: known, item: r.item }, ctx));
      entries = sortEntries("anime", entries, sort);
      const lab = { season: MS.CUR_SEASON_LABEL, prevseason: "前季のアニメ", year: CUR.y + "年のアニメ", all: "全期間" }[period] || "";
      return { category: "anime", type: "jp", period, total: entries.length, entries, rangeLabel: "国内の視聴者数（Annict）・" + lab, updatedAt: j.at, stale: j._stale,
        prevLabel: known ? String(j.prevD).replace(/-/g, "/") + " の記録" : "", source: "Annict", sourceUrl: "https://annict.com" };
    }
    async list(q) {
      const type = typeOf("anime", q.type);
      const period = type.period || q.period || defaultPeriod("anime", type.id);
      if (type.id === "jp") return this.jpList(period, q.filters, q.sort);
      if (type.id === "fm") return this.fmList(q.filters, q.sort);
      const o = await this.ordered(type.id, period, q.filters);
      const pr = {}; (o.prev || []).forEach((id, i) => { pr[id] = i + 1; });
      const ctx = { type: type.id, period };
      const entries = o.cur.map((id, i) => MODEL_OF.anime({ rank: i + 1, previousRank: o.prevKnown ? (pr[id] || null) : null, prevKnown: o.prevKnown, score: o.score[id], item: animeView(this._byId[id]) }, ctx));
      const lab = { day: "今日のトレンド順（AniList）", week: "直近7日のトレンド合計", month: "直近25日のトレンド合計", season: MS.CUR_SEASON_LABEL + "の人気順", year: CUR.y + "年の作品の人気順", all: "全期間の人気順" }[period];
      return { category: "anime", type: type.id, period, total: entries.length, entries, rangeLabel: type.note || lab, updatedAt: o.at, stale: o.stale,
        prevLabel: o.prevKnown ? (period === "day" ? "昨日" : period === "week" ? "先週" : "前回の記録") : "", source: "AniList" };
    }
    async item(id) {
      /* AniList に無い作品（Annict だけにある作品）は自動取得が控えたものを出す */
      if (/^an/.test(id)) {
        const x = this._jp[id] || jpView(await fb("items/anime/" + id, 900e3));
        x._raw = { relations: { edges: [] }, recommendations: { nodes: [] } };
        await this.addJp(x);
        return x;
      }
      const d = await cached("al1:" + id, 900e3, () => anilist(AL_ONE, { id: +id }), true);
      const m = d.Media; if (!m) return null;
      this._byId[String(m.id)] = Object.assign({}, this._byId[String(m.id)] || {}, m);
      const v = animeView(m);
      v.description = String(m.description || "").replace(/<[^>]+>/g, "").replace(/\s*\n\s*/g, "\n").slice(0, 600);
      v._raw = m;
      await this.addJp(v);
      return v;
    }
    /* 国内（Annict）での順位と視聴者数を足す */
    /* 国内側から詳細へ写す項目 */
    async addJp(v) {
      v.jp = {};
      for (const k of ["season", "year", "all"]) {
        try {
          const L = await this.jpList(k);
          const e = L.entries.find((x) => x.item.id === v.id);
          if (e) {
            v.jp[k] = e.rank; v.watchers = e.item.watchers; v.annictUrl = e.item.annictUrl; if (!v.official) v.official = e.item.official;
            /* ★ 国内（Annict・Filmarks）でしか取れない中身（制作会社・監督・声優・スタッフ・
               国内の評価・あらすじ・レビュー）は、AniList から作った view には入っていない。
               ここで写さないと、詳細で声優も監督も出ない。 */
            JP_FIELDS.forEach((f) => {
              const x = e.item[f];
              if (x == null || x === "" || (Array.isArray(x) && !x.length)) return;
              const cur = v[f];
              if (cur == null || cur === "" || (Array.isArray(cur) && !cur.length)) v[f] = x;
            });
          }
        } catch (e) { break; }
      }
    }
    async rankInfo(id) {
      if (/^an/.test(id)) {
        const L = await this.jpList("season").catch(() => ({ entries: [] }));
        const e = L.entries.find((x) => x.item.id === id);
        const h = await fbHistory("anime_jp-season", id, 365, "");
        const all = h.points.map((p) => p.rank).filter(Boolean); if (e) all.push(e.rank);
        return { rank: e ? e.rank : null, previousRank: e ? e.previousRank : null, prevKnown: e ? e.prevKnown : false, best: all.length ? Math.min.apply(null, all) : null, label: "国内（Annict）今季の視聴者数ランキング" };
      }
      const L = await this.list({ type: "overall", period: "day" });
      const e = L.entries.find((x) => x.item.id === id);
      const h = await this.history(id, "1m");
      const all = h.points.map((p) => p.rank).filter(Boolean);
      if (e) all.push(e.rank);
      return { rank: e ? e.rank : null, previousRank: e ? e.previousRank : null, prevKnown: true, best: all.length ? Math.min.apply(null, all) : null, label: "今日のトレンド順位（日本の作品）" };
    }
    /* 1週間・1か月＝トレンド上位100作品の中での日ごとの順位。3か月・1年＝自動取得の記録 */
    async history(id, range) {
      if (/^an/.test(id)) return fbHistory("anime_jp-season", id, { "1w": 7, "1m": 31, "3m": 92, "1y": 365 }[range] || 31, "国内（Annict）今季の視聴者数ランキングの順位");
      if (range === "1w" || range === "1m") {
        const res = await this.page({ sort: ["TRENDING_DESC"] }, 2);
        this.remember(res.media);
        const tms = res.media.map((m) => ({ id: String(m.id), tm: trendMap(m) }));
        const n = range === "1w" ? 7 : 25, pts = [];
        for (let back = n; back >= 1; back--) {
          const k = dayKey(back);
          const order = tms.filter((x) => x.tm[k]).sort((a, b) => b.tm[k] - a.tm[k]);
          const i = order.findIndex((x) => x.id === id);
          pts.push({ label: fmtMD(k), date: k.replace(/-/g, "/"), rank: i >= 0 ? i + 1 : null });
        }
        return { points: pts, note: "AniList のトレンド上位100作品の中での日ごとの順位" };
      }
      return fbHistory("anime_overall", id, range === "3m" ? 92 : 365, "自動取得が記録したトレンド順位（記録が始まった日から）");
    }
    async search(q, f) {
      /* 自動取得の一覧（国内）からも探す。順位が無いもの（圏外）も出す（ご指定） */
      const ix = (await fb("index/anime", 1800e3).catch(() => [])) || [];
      const k = kanaNorm(q);
      const local = ix.filter((x) => kanaNorm([x.title, x.studio, x.director].concat((x.cast || []).map((c) => c.n), (x.staff || []).map((c) => c.n), x.genres || []).join(" ")).indexOf(k) >= 0)
        .map((x) => jpView(x)).filter((it) => this.jpPasses(it, f));
      const res = await this.page({ search: q, sort: ["SEARCH_MATCH"] }, 1).catch(() => ({ media: [] }));
      this.remember(res.media);
      const L = await this.list({ type: "overall", period: "day" }).catch(() => ({ entries: [] }));
      const rk = {}; L.entries.forEach((e) => { rk[e.item.id] = e.rank; });
      const out = local.map((it) => ({ item: it, rank: rk[it.id] || null }));
      res.media.forEach((m) => { const v = animeView(m); if (!out.some((o) => o.item.id === v.id)) out.push({ item: v, rank: rk[v.id] || null }); });
      return out.sort((a, b) => (a.rank || 9999) - (b.rank || 9999));
    }
    async trends() {
      const L = await this.list({ type: "rising", period: "day" });
      const O = await this.list({ type: "overall", period: "day" });
      const rk = {}; O.entries.forEach((e) => { rk[e.item.id] = e.rank; });
      const top = L.entries.slice(0, 30);
      const mx = top.length ? top[0].score : 1;
      const list = top.map((e) => {
        const tm = trendMap(this._byId[e.item.id]);
        return { item: e.item, heat: Math.max(8, Math.round(100 * Math.sqrt(e.score / mx))), rank: rk[e.item.id] || null,
          spark: [7, 6, 5, 4, 3, 2, 1].map((b) => tm[dayKey(b)] || 0), text: e.score >= 10 ? "急浮上" : "注目度 " + (Math.round(e.score * 10) / 10) + " 倍" };
      });
      return { list, genres: genreHeat(list), lead: "AniList のトレンド値が直近で伸びている作品" };
    }
    async related(id) {
      const v = await this.item(id);
      const m = v._raw;
      const REL = { SEQUEL: "続編", PREQUEL: "前作", SIDE_STORY: "外伝", SPIN_OFF: "スピンオフ", ALTERNATIVE: "別版", PARENT: "本編", SUMMARY: "総集編", OTHER: "関連", CHARACTER: "共演", COMPILATION: "総集編", SOURCE: "原作", ADAPTATION: "映像化" };
      const p = ((m.relations && m.relations.edges) || []).filter((e) => e.node && e.node.type === "ANIME").map((e) => ({ item: animeView(e.node), rel: REL[e.relationType] || "" }));
      const s = ((m.recommendations && m.recommendations.nodes) || []).map((n) => n.mediaRecommendation).filter((x) => x && x.type === "ANIME").map((x) => ({ item: animeView(x) }));
      const O = await this.list({ type: "overall", period: "day" }).catch(() => ({ entries: [] }));
      const rk = {}; O.entries.forEach((e) => { rk[e.item.id] = e.rank; });
      const add = (x) => Object.assign(x, { rank: rk[x.item.id] || null });
      return { primary: p.map(add), secondary: s.map(add) };
    }
    async compare(pair, typeId) {
      if (pair.type === "jp") {
        const cur = await this.jpList("season");
        const pv = await fbPrevIds("anime_jp-season", 0);
        if (!pv) return { cur, prevTop: [], available: false, curLabel: "いま", prevLabel: "前回" };
        const byId = {}; cur.entries.forEach((e) => { byId[e.item.id] = e.item; });
        return { cur, prevTop: pv.ids.slice(0, 10).map((id) => byId[id] || { id, category: "anime", title: id, genres: [] }), available: true, curLabel: "いま", prevLabel: pv.d.replace(/-/g, "/") };
      }
      const cur = await this.list({ type: typeId || "overall", period: pair.period });
      const prevTop = cur.entries.filter((e) => e.previousRank).sort((a, b) => a.previousRank - b.previousRank).slice(0, 10).map((e) => e.item);
      return { cur, prevTop, curLabel: PERIODS[pair.period].label, prevLabel: PERIODS[pair.period].prev, available: cur.entries.some((e) => e.prevKnown) };
    }
    async facets() {
      const ix = await fb("index/anime", 1800e3).catch(() => []);
      const st = {}, dir = {}, cast = {};
      (ix || []).forEach((x) => {
        if (x.studio) st[x.studio] = (st[x.studio] || 0) + 1;
        if (x.director) dir[x.director] = (dir[x.director] || 0) + 1;
        (x.cast || []).forEach((c) => { if (c.n) cast[c.n] = (cast[c.n] || 0) + 1; });
      });
      const top = (m, n) => Object.keys(m).sort((a, b) => m[b] - m[a]).slice(0, n);
      return { genres: ANIME_GENRES.slice(), formats: ANIME_FORMATS.slice(), studios: top(st, 60), directors: top(dir, 60), casts: top(cast, 80) };
    }
    /* 声優・監督・制作会社から作品を引く（名前を押したとき） */
    async byPerson(kind, name) {
      const ix = (await fb("index/anime", 1800e3).catch(() => [])) || [];
      const k = kanaNorm(name);
      const hit = ix.filter((x) => kind === "studio" ? kanaNorm(x.studio) === k
        : kind === "director" ? kanaNorm(x.director) === k
        : (x.cast || []).some((c) => kanaNorm(c.n) === k) || (x.staff || []).some((c) => kanaNorm(c.n) === k));
      const L = await this.jpList("season").catch(() => ({ entries: [] }));
      const rk = {}; L.entries.forEach((e) => { rk[e.item.id] = e.rank; });
      return hit.map((x) => ({ item: jpView(x), rank: rk[String(x.id)] || null, role: kind === "cast" ? ((x.cast || []).find((c) => kanaNorm(c.n) === k) || {}).c : "" }))
        .sort((a, b) => (b.item.watchers || 0) - (a.item.watchers || 0));
    }
  }

  const JP_FIELDS = ["studio", "director", "cast", "staff", "fmScore", "fmUrl", "synopsis", "reviews", "banner", "seasonLabel"];
  function jpView(x) {
    const genres = (x.genres && x.genres.length) ? x.genres : ["その他"];
    const title = x.title || "";
    return { id: String(x.id), category: "anime", title, image: x.image || null, banner: x.banner || null, genres, genre: genres[0],
      studio: x.studio || "", director: x.director || "", cast: x.cast || [], staff: x.staff || [], fmScore: x.fmScore || null, fmUrl: x.fmUrl || "",
      synopsis: x.synopsis || "", reviews: x.reviews || [],
      format: FORMAT_JA[x.format] || x.media || "", formatEn: x.format || "", seasonLabel: x.seasonText || "", airing: x.status === "RELEASING",
      watchers: x.watchers || 0, annictUrl: x.annictUrl, official: x.official || "", episodes: x.episodes || null,
      url: x.anilist ? "https://anilist.co/anime/" + x.id : x.annictUrl, jpOnly: !x.anilist, releaseDate: x.startedOn || "",
      isSeries: /第\s*\d+\s*(期|シリーズ|クール)|Season\s*\d|シーズン|続編|[2-9]$|II$/i.test(title) };
  }
  function genreHeat(list) {
    const gh = {};
    list.forEach((x) => { (x.item.genres || [x.item.genre]).filter(Boolean).forEach((g, i) => { gh[g] = (gh[g] || 0) + x.heat / (i + 1); }); });
    return Object.keys(gh).map((g) => ({ g, v: gh[g] })).sort((a, b) => b.v - a.v).slice(0, 10);
  }
  /* 自動取得の記録（hist/<key>.json ＝ { 日付: "id,id,…" }）から順位の推移 */
  async function fbHistory(key, id, days, note) {
    const from = ymd(new Date(D0.getFullYear(), D0.getMonth(), D0.getDate() - days));
    let h = {};
    try { h = await fb("hist/" + key, 600e3); } catch (e) { if (e.code !== "nodata") throw e; }
    const pts = Object.keys(h).filter((d) => d >= from).sort().map((d) => { const i = String(h[d]).split(",").indexOf(String(id)); return { label: fmtMD(d), date: d.replace(/-/g, "/"), rank: i >= 0 ? i + 1 : null }; });
    return { points: pts, note: note + (pts.length < 2 ? "。記録がたまると線になります" : "") };
  }
  /* 前回（前の日まで）の並び、または n日前の並び */
  async function fbPrevIds(key, days) {
    if (!days) { const p = await fb("prev/" + key, 600e3).catch(() => null); return p && p.ids ? { d: p.d, ids: String(p.ids).split(",") } : null; }
    const lim = ymd(new Date(D0.getFullYear(), D0.getMonth(), D0.getDate() - days));
    const h = await fb("hist/" + key, 600e3).catch(() => null);
    const d = h && Object.keys(h).filter((x) => x <= lim).sort().pop();
    return d ? { d, ids: String(h[d]).split(",") } : null;
  }

  /* ══════════ 同人（FANZA / DLsite・自動取得 → GitHub のデータ） ══════════
     2つは<b>別のカテゴリー</b>だが、作りは同じなので1つのクラスを使い回す（prefix がちがうだけ）。 */
  function doujinItem(cat, x) {
    const it = Object.assign({}, x, { category: cat, id: String(x.id || x.cid), genres: x.genres || [],
      image: x.image || x.thumb || null, isNew: daysAgo(x.releaseDate) <= 30 });
    it.author = x.author || "";
    it.circle = x.circle || "";
    it.genre = it.genres[0] || "";
    it.maker = it.circle || it.author;
    return it;
  }
  class DoujinSource {
    constructor(cat) { this.cat = cat; this.label = cat === "fanza" ? "FANZA同人（ランキングページ・自動取得）" : "DLsite 同人（ランキングページ・自動取得）"; }
    index() { return fb("index/" + this.cat, 1800e3).then((rows) => (rows || []).filter(Boolean).map((r) => doujinItem(this.cat, r))); }
    passes(it, f) {
      if (!f) return true;
      const has = (a, fn) => !a || !a.length || a.some(fn);
      /* ジャンルは<b>複数選べる</b>。「すべて含む」を選んだときは and で見る（ご指定） */
      if (f.genres && f.genres.length) {
        const g = it.genres || [];
        const ok = f.genreAnd ? f.genres.every((x) => g.indexOf(x) >= 0) : f.genres.some((x) => g.indexOf(x) >= 0);
        if (!ok) return false;
      }
      if (!has(f.kinds, (k) => (it.kind || "").indexOf(k.replace("集", "")) >= 0)) return false;
      const age = daysAgo(it.releaseDate), y = +String(it.releaseDate).slice(0, 4);
      if (!has(f.when, (w) => w === "week" ? age < 7 : w === "month" ? age < 31 : w === "year" ? y === CUR.y : y < CUR.y)) return false;
      if (!has(f.fresh, (w) => w === "new" ? age <= 30 : age > 30)) return false;
      if (f.author && kanaNorm((it.author || "") + (it.circle || "")).indexOf(kanaNorm(f.author)) < 0) return false;
      if (f.circle && kanaNorm(it.circle || "").indexOf(kanaNorm(f.circle)) < 0) return false;
      if (f.series && kanaNorm(it.series || "").indexOf(kanaNorm(f.series)) < 0) return false;
      if (f.minRate && !(Number(it.rating) >= Number(f.minRate))) return false;
      return true;
    }
    async list(q) {
      const type = typeOf(this.cat, q.type);
      const j = await fb("lists/" + this.cat + "_" + type.id, 600e3);
      const known = !!j.prevD;
      let rows = (j.entries || []).map((x) => ({ item: doujinItem(this.cat, x), previousRank: x.prev || null }));
      const all = rows.length;
      rows = rows.filter((r) => this.passes(r.item, q.filters));
      const rerank = rows.length !== all;
      const pr = new Map();
      if (rerank) rows.filter((r) => r.previousRank).sort((a, b) => a.previousRank - b.previousRank).forEach((r, i) => pr.set(r, i + 1));
      const ctx = { type: type.id, period: type.period };
      let entries = rows.map((r, i) => MODEL_OF[this.cat]({ rank: i + 1, previousRank: !known ? null : rerank ? pr.get(r) || null : r.previousRank,
        prevKnown: known, item: r.item }, ctx));
      entries = sortEntries(this.cat, entries, q.sort);
      return { category: this.cat, type: type.id, period: type.period, total: entries.length, entries, rangeLabel: type.note, updatedAt: j.at, stale: j._stale,
        prevLabel: known ? String(j.prevD).replace(/-/g, "/") + " の記録" : "", source: CATS[this.cat].source, sourceUrl: j.source || CATS[this.cat].sourceUrl };
    }
    async item(id) {
      try { return doujinItem(this.cat, await fb("items/" + this.cat + "/" + id, 900e3)); } catch (e) { if (e.code === "nodata") return null; throw e; }
    }
    async rankInfo(id) {
      const L = await this.list({ type: "overall" });
      const e = L.entries.find((x) => x.item.id === id);
      const h = await fbHistory(this.cat + "_overall", id, 365, "");
      const all = h.points.map((p) => p.rank).filter(Boolean); if (e) all.push(e.rank);
      return { rank: e ? e.rank : null, previousRank: e ? e.previousRank : null, prevKnown: e ? e.prevKnown : false, best: all.length ? Math.min.apply(null, all) : null,
        label: CATS[this.cat].source + " 総合（マンガ）の順位" };
    }
    history(id, range) { return fbHistory(this.cat + "_overall", id, { "1w": 7, "1m": 31, "3m": 92, "1y": 365 }[range] || 31, "自動取得が記録した総合順位（記録が始まった日から）"); }
    async search(q, f) {
      const k = kanaNorm(q);
      const [ix, L] = await Promise.all([this.index(), this.list({ type: "overall" }).catch(() => ({ entries: [] }))]);
      const rk = {}; L.entries.forEach((e) => { rk[e.item.id] = e.rank; });
      return ix.filter((it) => (!k || kanaNorm([it.title, it.circle, it.author, it.series].concat(it.genres || []).join(" ")).indexOf(k) >= 0) && this.passes(it, f))
        .map((it) => ({ item: it, rank: rk[it.id] || null })).sort((a, b) => (a.rank || 9999) - (b.rank || 9999)).slice(0, 300);
    }
    async trends() {
      const L = await this.list({ type: "rising" });
      const list = L.entries.slice(0, 30).map((e, i) => ({ item: e.item, heat: Math.max(8, 100 - i * 3), rank: null,
        text: e.item.sales ? "販売数 " + Number(e.item.sales).toLocaleString("ja-JP") : e.item.rating ? "★" + e.item.rating : "" }));
      return { list, genres: genreHeat(list), lead: CATS[this.cat].source + " の急上昇" };
    }
    async related(id) {
      const it = await this.item(id);
      const [ix, L] = await Promise.all([this.index(), this.list({ type: "overall" }).catch(() => ({ entries: [] }))]);
      const rk = {}; L.entries.forEach((e) => { rk[e.item.id] = e.rank; });
      const p = it ? ix.filter((x) => x.id !== id && ((it.seriesId && x.seriesId === it.seriesId) || (it.circleId && x.circleId === it.circleId) || (it.circle && x.circle === it.circle))) : [];
      /* よく似た作品＝ジャンルの重なりが多い順（この作品を見ている人がよく見るもの） */
      const s = it ? ix.filter((x) => x.id !== id && !p.some((y) => y.id === x.id))
        .map((x) => ({ x, n: (x.genres || []).filter((g) => (it.genres || []).indexOf(g) >= 0).length }))
        .filter((o) => o.n >= 2).sort((a, b) => b.n - a.n || (rk[a.x.id] || 9999) - (rk[b.x.id] || 9999)).map((o) => o.x) : [];
      const v = (x) => ({ item: x, rank: rk[x.id] || null });
      return { primary: p.slice(0, 12).map(v), secondary: s.slice(0, 12).map(v) };
    }
    async compare(pair) {
      const cur = await this.list({ type: "overall" });
      const pv = await fbPrevIds(this.cat + "_overall", pair.days || 0);
      if (!pv) return { cur, prevTop: [], available: false, curLabel: "いま", prevLabel: pair.days ? pair.days + "日前" : "前回" };
      const pr = {}; pv.ids.forEach((id, i) => { pr[id] = i + 1; });
      cur.entries.forEach((e) => { e.previousRank = pr[e.item.id] || null; e.prevKnown = true; e.rankChange = e.previousRank ? e.previousRank - e.rank : null; e.isNew = !e.previousRank; });
      const ix = await this.index();
      const byId = {}; ix.forEach((x) => { byId[x.id] = x; }); cur.entries.forEach((e) => { byId[e.item.id] = e.item; });
      return { cur, prevTop: pv.ids.slice(0, 10).map((id) => byId[id] || doujinItem(this.cat, { id, title: id })), available: true, curLabel: "いま", prevLabel: pv.d.replace(/-/g, "/") };
    }
    async facets() {
      const ix = await this.index().catch(() => []);
      const m = {}, circles = {};
      ix.forEach((x) => { (x.genres || []).forEach((g) => { m[g] = (m[g] || 0) + 1; }); if (x.circle) circles[x.circle] = (circles[x.circle] || 0) + 1; });
      const skip = /^(コミック|CG|ボイス|ゲーム|動画|音楽|アニメ|その他|ツール|写真|男性向け|女性向け|成人向け|専売|独占|新作|準新作|旧作)$/;
      return { genres: Object.keys(m).filter((g) => !skip.test(g)).sort((a, b) => m[b] - m[a]).slice(0, 120),
        circles: Object.keys(circles).sort((a, b) => circles[b] - circles[a]).slice(0, 60),
        kinds: this.cat === "fanza" ? ["コミック", "CG集", "ボイス"] : ["マンガ", "CG集"] };
    }
    /* 人（サークル・作者）でまとめる */
    async byPerson(kind, name) {
      const ix = await this.index();
      const k = kanaNorm(name);
      return ix.filter((x) => kanaNorm(kind === "circle" ? x.circle : x.author) === k).map((x) => ({ item: x, rank: null }));
    }
  }
  const FanzaSource = DoujinSource;

  /* ══════════ KARAOKE（自動取得 → GitHub のデータ） ══════════ */
  const LIST_GENRE = { anison: "アニメソング", vocaloid: "ボーカロイド", foreign: "洋楽", enka: "演歌・歌謡曲", vtuber: "VTuber" };
  const LIST_NAME = { total: "総合", burst: "急上昇", duet: "デュエット", kensaku: "検索", year: "年間" };
  const DAM = "https://www.clubdam.com";
  function karaItem(x, list) {
    const it = Object.assign({}, x, { category: "karaoke", id: String(x.id || x.rn) });
    it.rn = it.id;
    it.year = x.releaseDate ? +String(x.releaseDate).slice(0, 4) : null;
    it.itunesGenre = x.genre || "";
    it.genre = LIST_GENRE[list] || x.genre || "";
    it.isNewSong = !!x.releaseDate && daysAgo(x.releaseDate) <= 180;
    it.isStandard = !!x.releaseDate && daysAgo(x.releaseDate) > 365 * 3;
    it.anime = list === "anison" || /アニメ|Anime/.test(x.genre || "");
    it.game = /ゲーム|Video Game/.test(x.genre || "");
    it.damUrl = DAM + "/karaokesearch/songleaf.html?requestNo=" + it.id;
    return it;
  }
  const TERM = { day: "daily", week: "weekly", month: "monthly", year: "year" };
  class DamSource {
    constructor() { this.cat = "karaoke"; this.label = "カラオケ DAM（ランキングページ・自動取得）"; }
    index() { return fb("index/karaoke", 1800e3).then((rows) => (rows || []).filter(Boolean).map((r) => karaItem(r))); }
    listKey(type, period, f) {
      const g = (f && f.list) || "";
      if (type === "rising") return ["burst", TERM[period] || "daily"];
      if (type === "duet") return ["duet", TERM[period] === "monthly" ? "monthly" : "weekly"];
      if (type === "kensaku") return ["kensaku", "monthly"];
      if (type === "year") return ["year", "year"];
      const p = type === "daily" ? "day" : type === "weekly" ? "week" : type === "monthly" ? "month" : period;
      if (g) return [g, p === "month" || p === "year" ? "monthly" : "weekly"];
      if (p === "year") return ["year", "year"];
      return ["total", TERM[p] || "weekly"];
    }
    passes(it, f) {
      if (!f) return true;
      if (f.artist && kanaNorm(it.artist).indexOf(kanaNorm(f.artist)) < 0) return false;
      if (f.genres && f.genres.length && f.genres.indexOf(it.itunesGenre) < 0) return false;
      if (f.yearFrom && (!it.year || it.year < f.yearFrom)) return false;
      if (f.yearTo && (!it.year || it.year > f.yearTo)) return false;
      if (f.tags && f.tags.length && !f.tags.some((x) => x === "new" ? it.isNewSong : x === "standard" ? it.isStandard : x === "anime" ? it.anime : x === "game" ? it.game : true)) return false;
      if (f.vocal && f.vocal.length && f.vocal.indexOf(it.vocal) < 0) return false;
      if (f.unit && f.unit.length && f.unit.indexOf(it.unit) < 0) return false;
      return true;
    }
    async list(q) {
      const type = typeOf("karaoke", q.type);
      const period = type.period || q.period || defaultPeriod("karaoke", type.id);
      const [list, term] = this.listKey(type.id, period, q.filters);
      const j = await fb("lists/karaoke_" + list + "-" + term, 300e3);
      const known = !!j.prevD;
      let rows = (j.entries || []).map((x) => ({ item: karaItem(x, list), previousRank: x.prev || null }));
      const all = rows.length;
      if (type.id === "new") rows = rows.filter((r) => r.item.isNewSong);
      const filtered = rows.filter((r) => this.passes(r.item, q.filters));
      const rerank = filtered.length !== all;
      const pr = new Map();
      if (rerank) filtered.filter((r) => r.previousRank).sort((a, b) => a.previousRank - b.previousRank).forEach((r, i) => pr.set(r, i + 1));
      const ctx = { type: type.id, period };
      let entries = filtered.map((r, i) => MODEL_OF.karaoke({ rank: i + 1, previousRank: known ? (rerank ? (pr.get(r) || null) : r.previousRank) : null, prevKnown: known, item: r.item }, ctx));
      entries = sortEntries("karaoke", entries, q.sort);
      const lname = LIST_GENRE[list] || LIST_NAME[list] || "総合";
      return { category: "karaoke", type: type.id, period, total: entries.length, entries, list, term,
        rangeLabel: "DAM " + lname + "・" + { daily: "デイリー", weekly: "週間", monthly: "月間", year: "年間" }[term] + (type.note ? "（" + type.note + "）" : ""),
        updatedAt: j.at, stale: j._stale, prevLabel: known ? String(j.prevD).replace(/-/g, "/") + " の記録" : "", source: "カラオケ DAM", sourceUrl: j.source || DAM + "/ranking/" };
    }
    async item(id) {
      try { return karaItem(await fb("items/karaoke/" + id, 900e3)); } catch (e) { if (e.code === "nodata") return null; throw e; }
    }
    async rankInfo(id) {
      const L = await this.list({ type: "weekly" });
      const e = L.entries.find((x) => x.item.id === id);
      const [h, d] = await Promise.all([fbHistory("karaoke_total-weekly", id, 365, ""), fbHistory("karaoke_total-daily", id, 365, "")]);
      const all = h.points.concat(d.points).map((p) => p.rank).filter(Boolean); if (e) all.push(e.rank);
      return { rank: e ? e.rank : null, previousRank: e ? e.previousRank : null, prevKnown: e ? e.prevKnown : false, best: all.length ? Math.min.apply(null, all) : null, label: "DAM 総合（週間）の順位" };
    }
    history(id, range) {
      if (range === "1w") return fbHistory("karaoke_total-daily", id, 7, "DAM デイリーランキングの順位");
      if (range === "1m") return fbHistory("karaoke_total-daily", id, 31, "DAM デイリーランキングの順位");
      if (range === "3m") return fbHistory("karaoke_total-weekly", id, 92, "DAM 週間ランキングの順位");
      return fbHistory("karaoke_total-monthly", id, 365, "DAM 月間ランキングの順位");
    }
    async search(q, f) {
      const k = kanaNorm(q);
      const [ix, L] = await Promise.all([this.index(), this.list({ type: "monthly" }).catch(() => ({ entries: [] }))]);
      const rk = {}; L.entries.forEach((e) => { rk[e.item.id] = e.rank; });
      return ix.filter((it) => (!k || kanaNorm(it.title + " " + it.artist + " " + (it.itunesGenre || "")).indexOf(k) >= 0) && this.passes(it, f))
        .map((it) => ({ item: it, rank: rk[it.id] || null })).sort((a, b) => (a.rank || 9999) - (b.rank || 9999)).slice(0, 300);
    }
    /* アーティストでまとめる（アーティスト名を押したとき） */
    async byPerson(kind, name) {
      const ix = await this.index();
      const k = kanaNorm(name);
      const L = await this.list({ type: "weekly" }).catch(() => ({ entries: [] }));
      const rk = {}; L.entries.forEach((e) => { rk[e.item.id] = e.rank; });
      return ix.filter((x) => kanaNorm(x.artist) === k || (x.ac && x.ac === name)).map((x) => ({ item: x, rank: rk[x.id] || null }))
        .sort((a, b) => (a.rank || 9999) - (b.rank || 9999));
    }
    /* アーティストの一覧（検索の候補） */
    async artists() {
      const ix = await this.index();
      const m = {};
      ix.forEach((x) => { if (x.artist) m[x.artist] = (m[x.artist] || 0) + 1; });
      return Object.keys(m).sort((a, b) => m[b] - m[a]);
    }
    async trends() {
      const L = await this.list({ type: "rising", period: "day" });
      const list = L.entries.slice(0, 30).map((e, i) => ({ item: e.item, heat: Math.max(8, 100 - i * 3), rank: null, text: e.prevKnown ? (e.previousRank ? "前回 " + e.previousRank + "位" : "初登場") : "" }));
      const gh = {};
      list.forEach((x) => { const g = x.item.itunesGenre || "その他"; gh[g] = (gh[g] || 0) + x.heat; });
      return { list, genres: Object.keys(gh).map((g) => ({ g, v: gh[g] })).sort((a, b) => b.v - a.v).slice(0, 8), lead: "DAM 急上昇ランキング（デイリー）＝いま歌われはじめている曲" };
    }
    async related(id) {
      const it = await this.item(id);
      const [ix, L] = await Promise.all([this.index(), this.list({ type: "weekly" }).catch(() => ({ entries: [] }))]);
      const rk = {}; L.entries.forEach((e) => { rk[e.item.id] = e.rank; });
      const p = it && it.ac ? ix.filter((x) => x.id !== id && x.ac === it.ac).map((x) => ({ item: x, rank: rk[x.id] || null })) : [];
      const sec = L.entries.filter((e) => e.item.id !== id && it && it.genre && e.item.itunesGenre === it.genre && !p.some((x) => x.item.id === e.item.id)).slice(0, 12).map((e) => ({ item: e.item, rank: e.rank }));
      return { primary: p.slice(0, 12), secondary: sec };
    }
    async compare(pair) {
      const cur = await this.list({ type: "overall", period: pair.period });
      const pv = await fbPrevIds("karaoke_total-" + TERM[pair.period], 0);
      if (!pv || !cur.entries.some((e) => e.prevKnown)) return { cur, prevTop: [], available: false, curLabel: PERIODS[pair.period].label, prevLabel: PERIODS[pair.period].prev };
      const ix = await this.index();
      const byId = {}; ix.forEach((x) => { byId[x.id] = x; }); cur.entries.forEach((e) => { byId[e.item.id] = e.item; });
      return { cur, prevTop: pv.ids.slice(0, 10).map((id) => byId[id] || karaItem({ id, title: id })), available: true, curLabel: PERIODS[pair.period].label, prevLabel: pv.d.replace(/-/g, "/") };
    }
    async facets() {
      let gs = [];
      try { const L = await this.list({ type: "monthly" }); const m = {}; L.entries.forEach((e) => { if (e.item.itunesGenre) m[e.item.itunesGenre] = (m[e.item.itunesGenre] || 0) + 1; }); gs = Object.keys(m).sort((a, b) => m[b] - m[a]); } catch (e) {}
      return { lists: KARA_LISTS.slice(), genres: gs, yearMin: 1960, yearMax: CUR.y };
    }
  }

  /* ジャケットがまだ無い曲だけ、iTunes から直接さがす（自動取得の補足が追いつくまでのつなぎ）。
     iTunes は1分に20回までなので、1回の表示で最大10曲。結果は端末に控える。 */
  const ART_KEY = "magiscope_art_v1";
  let artDisk = null, artBusy = false;
  function artLoad() { if (!artDisk) { try { artDisk = JSON.parse(localStorage.getItem(ART_KEY) || "{}") || {}; } catch (e) { artDisk = {}; } } return artDisk; }
  async function fillKaraokeArt(items, onEach) {
    const d = artLoad();
    items.forEach((it) => { const a = d[it.id]; if (!it.image && a && a.img) { it.image = a.img; if (!it.releaseDate) it.releaseDate = a.rel; } });
    if (artBusy) return;
    artBusy = true;
    let n = 0;
    try {
      for (const it of items) {
        if (it.image || d[it.id] || n >= 10) continue;
        n++;
        const clean = (s) => String(s || "").replace(/[（(\[［【].*?[）)\]］】]/g, "").trim();
        const r = await fetch("https://itunes.apple.com/search?country=JP&lang=ja_jp&entity=song&limit=5&term=" + encodeURIComponent(clean(it.title) + " " + clean(it.artist)));
        if (!r.ok) break;
        const j = await r.json();
        const nt = kanaNorm(clean(it.title));
        const best = (j.results || []).find((x) => kanaNorm(x.trackName).indexOf(nt) === 0);
        d[it.id] = best ? { img: String(best.artworkUrl100 || "").replace("100x100bb", "600x600bb"), rel: (best.releaseDate || "").slice(0, 10) } : { none: 1 };
        if (best) { it.image = d[it.id].img; if (onEach) onEach(it); }
      }
    } catch (e) {} finally {
      artBusy = false;
      const ks = Object.keys(d); if (ks.length > 800) ks.slice(0, ks.length - 800).forEach((k) => delete d[k]);
      try { localStorage.setItem(ART_KEY, JSON.stringify(d)); } catch (e) {}
    }
  }

  function kanaNorm(s) {
    return String(s || "").normalize("NFKC").toLowerCase()
      .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
      .replace(/[\s・\-_.,。、!！?？~〜「」『』【】()（）☆★]/g, "");
  }
  function fnv(str) { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; }

  /* ══════════ リポジトリ（画面が呼ぶのはここだけ） ══════════ */
  const sources = { anime: new AniListSource(), fanza: new DoujinSource("fanza"), dlsite: new DoujinSource("dlsite"), karaoke: new DamSource() };
  const src = (cat) => { const s = sources[cat]; if (!s) throw new Error("unknown category " + cat); return s; };
  const repo = {
    use(cat, source) { if (CATS[cat]) sources[cat] = source; },
    sourceLabel: (cat) => src(cat).label,
    list: (cat, q) => src(cat).list(q || {}),
    item: (cat, id) => src(cat).item(id),
    rankInfo: (cat, id) => src(cat).rankInfo(id),
    history: (cat, id, range) => src(cat).history(id, range),
    search: (cat, q, f) => src(cat).search(q, f),
    /* 人（アーティスト・サークル・作者・制作会社・監督・声優）から作品を引く */
    byPerson: (cat, kind, name) => (src(cat).byPerson ? src(cat).byPerson(kind, name) : Promise.resolve([])),
    artists: (cat) => (src(cat).artists ? src(cat).artists() : Promise.resolve([])),
    sorts: (cat) => (SORTS[cat] || SORTS.anime).slice(),
    /* おすすめ：よく見ているジャンル・人から選ぶ（閲覧・お気に入り・検索の記録をもとに） */
    async recommend(cat, seed, exclude) {
      const want = {};
      (seed.genres || []).forEach((g, i) => { want[g] = (want[g] || 0) + (10 - Math.min(i, 8)); });
      const peo = (seed.people || []).map((p) => kanaNorm(p));
      const ix = cat === "anime" ? ((await fb("index/anime", 1800e3).catch(() => [])) || []).map(jpView)
        : await src(cat).index().catch(() => []);
      const skip = {}; (exclude || []).forEach((id) => { skip[id] = 1; });
      const scored = ix.filter((x) => !skip[x.id]).map((x) => {
        let sc = 0;
        (x.genres || []).forEach((g) => { sc += want[g] || 0; });
        const names = cat === "anime" ? [x.studio, x.director].concat((x.cast || []).map((c) => c.n))
          : cat === "karaoke" ? [x.artist] : [x.circle, x.author];
        names.filter(Boolean).forEach((n) => { if (peo.indexOf(kanaNorm(n)) >= 0) sc += 14; });
        sc += Math.min(6, (Number(x.watchers) || 0) / 2000) + (Number(x.fmScore) || 0) + (Number(x.rating) || 0);
        return { item: x, sc };
      }).filter((o) => o.sc > 3).sort((a, b) => b.sc - a.sc).slice(0, 20);
      return scored.map((o) => ({ item: o.item, rank: null }));
    },
    trends: (cat) => src(cat).trends(),
    related: (cat, id) => src(cat).related(id),
    compare: (cat, pair, typeId) => src(cat).compare(pair, typeId),
    facets: (cat) => src(cat).facets(),
    /* 自動取得の状態（最後に取った時刻・記録） */
    status: async () => { try { const m = await fb("meta", 60e3); return Object.assign({ ok: true }, m); } catch (e) { return { ok: false, error: e.message, code: e.code }; } },
    clearCache: () => { mem.clear(); disk = {}; try { localStorage.removeItem(CACHE_KEY); } catch (e) {} },
    fillKaraokeArt,
    wasOffline: () => offlineHit,
  };

  Object.assign(MS, {
    CATS, CAT_IDS, PERIODS, Models, repo, AniListSource, DoujinSource, DamSource, SORTS,
    typeOf, periodsOfType, defaultPeriod, fmtDate, fmtMD, agoLabel, T, daysAgo,
    CUR_SEASON: CUR, CUR_SEASON_LABEL: CUR.y + "年" + SEASON_NM[SEASON_EN[CUR.s]] + "アニメ",
    ANIME_GENRES, ANIME_FORMATS, KARA_GENRES, KARA_LISTS, kanaNorm, fnv,
  });
})();
