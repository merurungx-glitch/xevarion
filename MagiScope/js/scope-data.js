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
      /* ★★ 2026-09-21c ご指定：アニメは「国内 Annict」「海外 AniList」「国内 Filmarks」の
         <b>3つをボタンで分けて、まったく別のもの</b>として扱う。
         ・どの出どころかは types の src で決める。画面は src でタブを出し分ける。
         ・数えかたが違うので、順位も前回比も混ぜない（同じ作品でも別々の順位になる）。 */
      sources: [
        { id: "annict",   label: "Annict",   ja: "国内・視聴者数", note: "国内のアニメ視聴記録サービス Annict。「見た・見ている」と登録した人の数の順です。", url: "https://annict.com" },
        { id: "anilist",  label: "AniList",  ja: "海外・トレンド", note: "海外のアニメデータベース AniList。世界中の利用者の動き（トレンド・登録数）の順です。", url: "https://anilist.co" },
        /* ★★ 2026-09-22b ご指定「アニメのランキングに DMM TV も」。DMM TV（アニメ）の日間・週間・月間ランキング */
        { id: "dmm",      label: "DMM TV",   ja: "国内・配信",     note: "動画配信サービス DMM TV のアニメランキングです（DMM TV の公開データ）。", url: "https://tv.dmm.com/vod/" },
        /* ★★ 2026-09-22 ご指定「ご褒美バージョンなどがあるアニメの特集」→ 22b「特別版は DMM TV だけ」 */
        { id: "special",  label: "特別版",   ja: "DMM TV",        note: "「ご褒美版」「解放版」「湯けむり版」「無修正版」「完全版」など、DMM TV で見られる特別なバージョンのアニメの特集です（アニメだけ）。", url: "https://tv.dmm.com/vod/" },
      ],
      types: [
        /* ── 国内：Annict（視聴者数） ── */
        { id: "jp",      src: "annict",   label: "視聴者数", periods: ["season", "prevseason", "year", "all"], def: "season", note: "国内で「見た・見ている」と登録した人の数（Annict）" },
        /* ★★ 2026-09-22c Filmarks のランキングはやめた（ご指定「表示される画像が違うことが多い」） */
        /* ── 海外：AniList（トレンド） ── */
        { id: "overall", src: "anilist",  label: "トレンド", periods: ["day", "week", "month", "season", "year", "all"], note: "海外の視聴者の動き（AniList トレンド）" },
        { id: "rising",  src: "anilist",  label: "急上昇",   periods: ["day", "week"] },
        { id: "new",     src: "anilist",  label: "新作",     periods: ["day", "week", "month"], note: "放送・配信開始から120日以内" },
        { id: "season",  src: "anilist",  label: "今季",     periods: ["day", "week", "month", "season"], def: "day" },
        { id: "year",    src: "anilist",  label: "年間",     period: "year" },
        { id: "alltime", src: "anilist",  label: "歴代",     period: "all" },
        { id: "popular", src: "anilist",  label: "人気",     period: "season", note: "放送中の作品の人気順（AniList の登録数）" },
        { id: "rating",  src: "anilist",  label: "点数",     period: "all", note: "AniList の平均点が高い順（1万人以上が登録した作品）" },
        /* ── DMM TV（アニメのランキング）── */
        { id: "dm_daily",   src: "dmm", lk: "dmm-daily",   label: "日間", period: "day",   note: "DMM TV アニメ 日間ランキング" },
        { id: "dm_weekly",  src: "dmm", lk: "dmm-weekly",  label: "週間", period: "week",  note: "DMM TV アニメ 週間ランキング" },
        { id: "dm_monthly", src: "dmm", lk: "dmm-monthly", label: "月間", period: "month", note: "DMM TV アニメ 月間ランキング" },
        /* ── 特別版（ご褒美版など・DMM TV だけ）── */
        { id: "sp_dmm",    src: "special", lk: "sp-dmm",    label: "特別版", period: "all", note: "DMM TV の特別版アニメ（配信の新しい順）" },
      ],
      compare: [
        { id: "jp",   label: "国内 今季 vs 前回", period: "season", type: "jp", def: true },
        { id: "week", label: "海外 今週 vs 先週", period: "week" },
        { id: "day",  label: "海外 今日 vs 昨日", period: "day" },
      ],
    },
    fanza: {
      id: "fanza", en: "FANZA", ja: "FANZA", unit: "作品", noun: "作品", title: "FANZAランキング", mainPeriod: "day", adult: true,
      source: "FANZA", sourceUrl: "https://www.dmm.co.jp/dc/doujin/-/ranking-all/",
      /* ★★ 2026-09-21d ご指定：FANZA の中を<b>4つのボタン</b>に分ける（アニメの3分割と同じ作り）。
         ・key … 自動取得が書き出すファイルの名前の頭（lists/<key>_<lk>.json と index/<key>.json）
         ・lk  … その種類のファイル名のうしろ
         ★ 4つはまったく別のランキングなので、順位も前回比も混ぜない。 */
      keys: ["fanza", "danime", "fbooks", "fvideo"],
      sources: [
        { id: "doujin", key: "fanza",  label: "同人 本",   ja: "コミック",   note: "FANZA同人のコミック（本）のランキングです。個人・サークルが出している作品です。", url: "https://www.dmm.co.jp/dc/doujin/-/ranking-all/=/submedia=comic/sort=popular/term=h24/" },
        { id: "danime", key: "danime", label: "同人 アニメ", ja: "動画",     note: "FANZA同人の動画（同人アニメ）のランキングです。個人・サークルが作った映像作品です。", url: "https://www.dmm.co.jp/dc/doujin/-/list/=/article=keyword/id=156004/sort=ranking/" },
        { id: "books",  key: "fbooks", label: "ブックス", ja: "本・コミック", note: "FANZA の本（コミック・エロ本）のランキングです。出版社から出ている商業作品です。", url: "https://www.dmm.co.jp/mono/book/-/ranking/" },
        { id: "video",  key: "fvideo", label: "アニメ",   ja: "商業アニメ", note: "FANZA のアニメ（商業のアダルトアニメ）のランキングです。", url: "https://www.dmm.co.jp/mono/anime/-/ranking/" },
      ],
      types: [
        /* ── 同人 本（コミック） ── */
        { id: "overall", src: "doujin", key: "fanza", lk: "overall", label: "総合",   period: "day", note: "FANZA同人 コミック 24時間ランキング" },
        { id: "new",     src: "doujin", key: "fanza", lk: "new",     label: "新刊",   period: "month", note: "24時間・週間ランキングのうち配信30日以内" },
        { id: "popular", src: "doujin", key: "fanza", lk: "popular", label: "人気",   period: "week", note: "販売数順（週間）" },
        { id: "rising",  src: "doujin", key: "fanza", lk: "rising",  label: "急上昇", period: "day", note: "1時間ランキング" },
        { id: "week",    src: "doujin", key: "fanza", lk: "week",    label: "今週",   period: "week", note: "週間ランキング" },
        { id: "month",   src: "doujin", key: "fanza", lk: "month",   label: "今月",   period: "month", note: "月間ランキング" },
        { id: "alltime", src: "doujin", key: "fanza", lk: "alltime", label: "歴代",   period: "all", note: "累計ランキング（FANZA に年間ランキングは無いため累計）" },
        /* ── 同人 アニメ（動画） ── */
        { id: "a_overall", src: "danime", key: "danime", lk: "overall", label: "総合", period: "day", note: "FANZA同人 動画の人気順" },
        { id: "a_rising",  src: "danime", key: "danime", lk: "rising",  label: "注目", period: "day", note: "いま注目されている作品" },
        { id: "a_new",     src: "danime", key: "danime", lk: "new",     label: "新着", period: "month", note: "新しく出た作品" },
        { id: "a_popular", src: "danime", key: "danime", lk: "popular", label: "人気", period: "all", note: "売れている順" },
        { id: "a_alltime", src: "danime", key: "danime", lk: "alltime", label: "歴代", period: "all", note: "累計の販売数順" },
        { id: "a_rating",  src: "danime", key: "danime", lk: "rating",  label: "評価", period: "all", note: "評価の高い順" },
        { id: "a_week",    src: "danime", key: "danime", lk: "week",    label: "お気に入り", period: "week", note: "お気に入り登録が多い順" },
        /* ── ブックス（商業の本） ── */
        { id: "b_overall", src: "books", key: "fbooks", lk: "overall",       label: "月間コミック", period: "month", note: "FANZA 本（コミック）月間ランキング" },
        { id: "b_week",    src: "books", key: "fbooks", lk: "week",          label: "週間コミック", period: "week",  note: "FANZA 本（コミック）週間ランキング" },
        { id: "b_rising",  src: "books", key: "fbooks", lk: "rising",        label: "日間コミック", period: "day",   note: "FANZA 本（コミック）日間ランキング" },
        { id: "b_adult",   src: "books", key: "fbooks", lk: "overall-adult", label: "エロ本",       period: "month", note: "FANZA 本（エロ本）月間ランキング" },
        /* ── アニメ（商業） ── */
        { id: "v_overall", src: "video", key: "fvideo", lk: "overall", label: "月間", period: "month", note: "FANZA アニメ 月間ランキング" },
        { id: "v_week",    src: "video", key: "fvideo", lk: "week",    label: "週間", period: "week",  note: "FANZA アニメ 週間ランキング" },
        { id: "v_rising",  src: "video", key: "fvideo", lk: "rising",  label: "日間", period: "day",   note: "FANZA アニメ 日間ランキング" },
      ],
      compare: [
        { id: "month", label: "今月 vs 先月", period: "month", days: 30, def: true },
        { id: "week",  label: "今週 vs 先週", period: "week", days: 7 },
        { id: "last",  label: "いま vs 前回の記録", period: "all", back: 1 },
      ],
    },
    /* ★★ 2026-09-22 映画（ご指定「映画の興行収入ランキング。メインは国内」）。
       ・国内 … 映画.com の国内映画ランキング（週末の観客動員。先週の順位・公開館数・上映週つき）
       ・国内の興収 … Box Office Mojo の日本の週末・年間（金額は米ドル換算で公開されている）
       ・全米 … 映画.com の全米映画ランキング（週末・累計の興収つき）
       ★ 3つは数えかたが違うので<b>ボタンで分けて別のもの</b>として扱う（アニメの出どころと同じ作り）。 */
    movie: {
      id: "movie", en: "MOVIE", ja: "映画", unit: "作品", noun: "映画", title: "映画ランキング", mainPeriod: "week",
      source: "映画.com", sourceUrl: "https://eiga.com/ranking/",
      keys: ["movie"],
      sources: [
        { id: "jp",   key: "movie", label: "国内",       ja: "週末の動員",   note: "国内の映画館の週末ランキング（観客動員・興行通信社調べ／映画.com）。", url: "https://eiga.com/ranking/jp/" },
        { id: "jpbo", key: "movie", label: "国内の興収", ja: "興行収入",     note: "国内の興行収入（Box Office Mojo）。金額は米ドル換算で公開されています。映画.com の作品と結びつけられたものは日本語の題名で出します。", url: "https://www.boxofficemojo.com/intl/?area=JP" },
        /* ★★ 2026-09-22c ご指定「歴代の興行収入は新たな枠で分けて」 */
        { id: "alltime", key: "movie", label: "歴代",     ja: "興行収入",     note: "国内の歴代興行収入ベスト100（億円・興行通信社調べ）。いま上映中の作品も入ります。", url: "https://www.kogyotsushin.com/archives/alltime/" },
        { id: "us",   key: "movie", label: "全米",       ja: "週末の興収",   note: "アメリカの週末の興行収入（映画.com の全米映画ランキング）。", url: "https://eiga.com/ranking/us/" },
      ],
      types: [
        { id: "jp",      src: "jp",   key: "movie", lk: "jp-weekend", label: "週末ランキング", period: "week", note: "国内 週末の観客動員ランキング" },
        { id: "bo",      src: "jpbo", key: "movie", lk: "bo-weekend", label: "週末の興収",     period: "week", note: "国内 週末の興行収入（米ドル換算）" },
        { id: "boyear",  src: "jpbo", key: "movie", lk: "bo-year",    label: "年間の興収",     period: "year", note: "今年公開の映画の国内興行収入（米ドル換算）" },
        /* ★★ 2026-09-22b ご指定「興行収入は歴代ランキングも」。興行通信社の歴代興収ベスト100（億円） */
        { id: "boall",   src: "alltime", key: "movie", lk: "bo-all",  label: "歴代ベスト100",  period: "all",  note: "歴代の国内興行収入ベスト100（億円・興行通信社調べ）" },
        { id: "us",      src: "us",   key: "movie", lk: "us-weekend", label: "週末の興収",     period: "week", note: "全米 週末の興行収入" },
      ],
      compare: [{ id: "last", label: "いま vs 前回の記録", period: "week", back: 1, def: true }],
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
    /* ★★ 2026-09-21 音楽（ご指定の「視聴されている曲」）。カラオケ＝歌われた回数、
       こちら＝聴かれた回数で、出どころも数えかたも別なので<b>別のカテゴリー</b>にした。 */
    music: {
      id: "music", en: "MUSIC", ja: "音楽", unit: "曲", noun: "曲", title: "音楽ランキング", mainPeriod: "week",
      source: "Billboard JAPAN", sourceUrl: "https://www.billboard-japan.com/charts/",
      types: [
        { id: "stream",   label: "視聴",         period: "week", note: "ストリーミングで聴かれた回数（Billboard JAPAN）" },
        { id: "overall",  label: "総合",         period: "week", note: "Billboard JAPAN Hot 100" },
        { id: "video",    label: "動画再生",     period: "week", note: "動画サイトでの再生数" },
        { id: "download", label: "ダウンロード", period: "week", note: "有料ダウンロード数" },
        { id: "anime",    label: "アニメ",       period: "week", note: "アニメの曲だけの順位" },
        { id: "niconico", label: "ニコニコ",     period: "week", note: "ニコニコ動画での再生数" },
        { id: "sales",    label: "CD売上",       period: "week", note: "CD の売上枚数" },
      ],
      compare: [
        { id: "week", label: "今週 vs 先週", period: "week", days: 7, def: true },
        { id: "last", label: "いま vs 前回の記録", period: "week", back: 1 },
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
  /* ★★ 2026-09-21d 同人アニメは FANZA の中のボタンになったので、独立のカテゴリーはやめた。 */
  const CAT_IDS = ["anime", "movie", "fanza", "dlsite", "karaoke", "music"];
  /* 並べ替え（ランキング順のほかに選べるもの）。MagiBurst の並べ替えと同じ考えかた。 */
  const SORTS = {
    anime: [["rank", "ランキング順"], ["watchers", "視聴者数順"], ["rating", "AniList点数順"], ["popular", "人気順"], ["new", "新しい順"], ["title", "名前順"]],
    fanza: [["rank", "ランキング順"], ["rating", "評価順"], ["sales", "販売数順"], ["new", "新しい順"], ["price", "安い順"], ["off", "割引率順"], ["title", "名前順"], ["circle", "サークル順"]],
    dlsite: [["rank", "ランキング順"], ["rating", "評価順"], ["sales", "販売数順"], ["new", "新しい順"], ["price", "安い順"], ["off", "割引率順"], ["title", "名前順"], ["circle", "サークル順"]],
    karaoke: [["rank", "ランキング順"], ["new", "新しい順"], ["old", "古い順"], ["title", "曲名順"], ["artist", "アーティスト順"]],
    music: [["rank", "ランキング順"], ["new", "新しい順"], ["old", "古い順"], ["title", "曲名順"], ["artist", "アーティスト順"]],
    movie: [["rank", "ランキング順"], ["gross", "興行収入順"], ["screens", "公開館数順"], ["rating", "評価順"], ["new", "公開が新しい順"], ["length", "上映時間が長い順"], ["title", "名前順"]],
  };
  /* ★★ 2026-09-21e 並べ替えを作り直した（ご指定「並び替えできないボタンがある」「逆順も」）。
     ・どの並べ替えも「値を取り出す関数」と「ふつうの向き（大きい順か小さい順か）」の組で書く
     ・rev=true で逆順（MagiBurst と同じ）。ランキング順の逆＝下位から
     ・値が無い作品（販売数が出ていない など）は、向きにかかわらず<b>いちばん最後</b>
       → 前は値が無い作品がまざって「押しても変わらない」ように見えていた */
  const SORT_KEYS = {
    rank:     [(e) => (e.rank == null ? null : e.rank), 1],
    watchers: [(e, v) => num0(v.watchers), -1],
    fm:       [(e, v) => num0(v.fmScore), -1],
    rating:   [(e, v) => num0(v.rating) != null ? num0(v.rating) * 100000 + (num0(v.votes) || 0) : null, -1],
    sales:    [(e, v) => num0(v.sales), -1],
    price:    [(e, v) => num0(String(v.price == null ? "" : v.price).replace(/,/g, "")), 1],
    off:      [(e, v) => (num0(v.off) || null), -1],
    drop:     [(e, v) => (v.was && num0(String(v.price).replace(/,/g, "")) != null ? v.was - num0(String(v.price).replace(/,/g, "")) : null), -1],
    new:      [(e, v) => (v.releaseDate || null), -1],
    old:      [(e, v) => (v.releaseDate || null), 1],
    title:    [(e, v) => String(v.title || "") || null, 1],
    artist:   [(e, v) => String(v.artist || v.circle || "") || null, 1],
    circle:   [(e, v) => String(v.circle || v.author || "") || null, 1],
    popular:  [(e, v) => num0(v.popularity || v.favs || v.watchers), -1],
    /* 映画：興行収入（年間 → 累計 → 週末の順に、ある値で比べる）・公開館数・上映時間 */
    gross:    [(e, v) => moneyOf(v.allGross || v.yearGross || v.totalGross || v.weekendGross), -1],
    screens:  [(e, v) => num0(v.screens), -1],
    length:   [(e, v) => minutesOf(v.length || v.duration), -1],
  };
  function moneyOf(x) { const n = Number(String(x == null ? "" : x).replace(/[^\d.]/g, "")); return isFinite(n) && n > 0 ? n : null; }
  function minutesOf(x) { const m = String(x || "").match(/(\d+)\s*分/); if (m) return +m[1]; const t = String(x || "").match(/^(\d+):(\d\d)$/); return t ? +t[1] + t[2] / 60 : null; }
  function num0(x) { if (x == null || x === "") return null; const n = Number(x); return isFinite(n) ? n : null; }
  function sortEntries(cat, entries, sort, rev) {
    if (!sort || (sort === "rank" && !rev)) return entries;
    const def = SORT_KEYS[sort];
    if (!def) return rev ? entries.slice().reverse() : entries;
    const [key, dir0] = def;
    const dir = rev ? -dir0 : dir0;
    const rows = entries.map((e, i) => ({ e, i, k: key(e, e.item || e) }));
    rows.sort((a, b) => {
      const an = a.k == null, bn = b.k == null;
      if (an || bn) return an && bn ? a.i - b.i : an ? 1 : -1;
      if (typeof a.k === "string") return dir * a.k.localeCompare(b.k, "ja") || a.i - b.i;
      return dir * (a.k - b.k) || a.i - b.i;
    });
    return rows.map((r) => r.e);
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
    /* ★ rank が null のときは「圏外」。0 にしてしまうと 0位 と書いてしまうので、
       null のまま通して画面側で「圏外」と出す。 */
    const rank = raw.rank == null ? null : raw.rank | 0;
    const known = raw.prevKnown !== false;
    const prev = raw.previousRank == null ? null : raw.previousRank | 0;
    return {
      category: cat, rankingType: ctx.type, period: ctx.period, rank,
      previousRank: prev, prevKnown: known,
      rankChange: prev == null || rank == null ? null : prev - rank,
      isNew: known && prev == null && rank != null,
      offchart: rank == null,
      title: raw.item.title, image: raw.item.image || null, genre: raw.item.genre || "", score: raw.score || 0, item: raw.item,
    };
  }
  const Models = {
    AnimeRanking: (raw, ctx) => baseRow("anime", raw, ctx),
    FanzaRanking: (raw, ctx) => baseRow("fanza", raw, ctx),
    DlsiteRanking: (raw, ctx) => baseRow("dlsite", raw, ctx),
    KaraokeRanking: (raw, ctx) => baseRow("karaoke", raw, ctx),
    MusicRanking: (raw, ctx) => baseRow("music", raw, ctx),
    MovieRanking: (raw, ctx) => baseRow("movie", raw, ctx),
  };
  const MODEL_OF = { anime: Models.AnimeRanking, fanza: Models.FanzaRanking, dlsite: Models.DlsiteRanking,
    karaoke: Models.KaraokeRanking, music: Models.MusicRanking, movie: Models.MovieRanking };

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
  const AL_FIELDS = "id title{native romaji english} synonyms coverImage{extraLarge large color} bannerImage genres season seasonYear format status episodes duration averageScore popularity favourites trending siteUrl startDate{year month day} studios(isMain:true){nodes{name}}";
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
      /* ★ AniList の synonyms には「ReZero」のような短い呼びかたも入っている。
         日本語と短いアルファベットだけを残して「別名」として出す（長い外国語の題名は落とす）。 */
      synonyms: (m.synonyms || []).filter((x) => (/[ぁ-んァ-ヶ一-龠]/.test(x) ? x.length <= 24 : /^[A-Za-z0-9 :!?.'\-]{2,18}$/.test(x))).slice(0, 6),
      image: (m.coverImage && (m.coverImage.extraLarge || m.coverImage.large)) || null, banner: m.bannerImage || null, color: m.coverImage && m.coverImage.color,
      genres: genres.length ? genres : ["その他"], genre: genres[0] || "その他", genresEn: m.genres || [],
      format: FORMAT_JA[m.format] || m.format || "", formatEn: m.format, year: m.seasonYear || sd.year || null,
      season: m.season || null, seasonLabel: (m.seasonYear || sd.year) ? (m.seasonYear || sd.year) + "年" + (SEASON_NM[m.season] || "") : m.status === "NOT_YET_RELEASED" ? "放送前" : "",
      airing: m.status === "RELEASING", status: m.status, episodes: m.episodes, duration: m.duration ? m.duration + "分" : "", studio: (m.studios && m.studios.nodes && m.studios.nodes[0] && m.studios.nodes[0].name) || "",
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
      entries = sortEntries("anime", entries, sort, this._rev);
      return { category: "anime", type: "fm", period: "day", total: entries.length, entries, rangeLabel: "いま話題のアニメ（Filmarks・国内の評価）",
        updatedAt: j.at, stale: j._stale, prevLabel: known ? String(j.prevD).replace(/-/g, "/") + " の記録" : "", source: "Filmarks", sourceUrl: "https://filmarks.com/list-anime/trend" };
    }
    /* Filmarks の「評価が高い順」。自動取得がためた作品の中から、点が付いているものを並べる。 */
    async fmRate(f, sort) {
      const rows = ((await fb("index/anime", 1800e3)) || []).map(jpView).filter((x) => Number(x.fmScore) > 0);
      rows.forEach((x) => { this._jp[x.id] = x; });
      const list = rows.filter((x) => this.jpPasses(x, f)).sort((a, b) => Number(b.fmScore) - Number(a.fmScore));
      const ctx = { type: "fmrate", period: "all" };
      let entries = list.map((x, i) => MODEL_OF.anime({ rank: i + 1, previousRank: null, prevKnown: false, item: x }, ctx));
      entries = sortEntries("anime", entries, sort, this._rev);
      return { category: "anime", type: "fmrate", period: "all", total: entries.length, entries,
        rangeLabel: "国内の評価が高い順（Filmarks）", updatedAt: MS.T, prevLabel: "", source: "Filmarks", sourceUrl: "https://filmarks.com" };
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
      entries = sortEntries("anime", entries, sort, this._rev);
      const lab = { season: MS.CUR_SEASON_LABEL, prevseason: "前季のアニメ", year: CUR.y + "年のアニメ", all: "全期間" }[period] || "";
      return { category: "anime", type: "jp", period, total: entries.length, entries, rangeLabel: "国内の視聴者数（Annict）・" + lab, updatedAt: j.at, stale: j._stale,
        prevLabel: known ? String(j.prevD).replace(/-/g, "/") + " の記録" : "", source: "Annict", sourceUrl: "https://annict.com" };
    }
    /* ★★ 2026-09-22 特別版（ご褒美版など）。サービスごとの一覧（dアニメストア／DMM TV） */
    async spList(type, f, sort) {
      const j = await fb("lists/anime_" + type.lk, 600e3);
      const known = !!j.prevD;
      const rows = (j.entries || []).map((x) => ({ item: jpView(x), prev: x.prev || null })).filter((r) => this.jpPasses(r.item, f));
      rows.forEach((r) => { this._jp[r.item.id] = r.item; });
      let entries = rows.map((r, i) => MODEL_OF.anime({ rank: i + 1, previousRank: known ? r.prev : null, prevKnown: known, item: r.item }, { type: type.id, period: "all" }));
      entries = sortEntries("anime", entries, sort, this._rev);
      return { category: "anime", type: type.id, period: "all", total: entries.length, entries, rangeLabel: type.note, updatedAt: j.at, stale: j._stale,
        prevLabel: known ? String(j.prevD).replace(/-/g, "/") + " の記録" : "", source: type.label, sourceUrl: j.source || "" };
    }
    async list(q) {
      const type = typeOf("anime", q.type);
      const period = type.period || q.period || defaultPeriod("anime", type.id);
      this._rev = !!q.rev;
      if (type.src === "special" || type.src === "dmm") return this.spList(type, q.filters, q.sort);
      if (type.id === "jp") return this.jpList(period, q.filters, q.sort);
      if (type.id === "fm") return this.fmList(q.filters, q.sort);
      if (type.id === "fmrate") return this.fmRate(q.filters, q.sort);
      const o = await this.ordered(type.id, period, q.filters);
      const pr = {}; (o.prev || []).forEach((id, i) => { pr[id] = i + 1; });
      const ctx = { type: type.id, period };
      let entries = o.cur.map((id, i) => MODEL_OF.anime({ rank: i + 1, previousRank: o.prevKnown ? (pr[id] || null) : null, prevKnown: o.prevKnown, score: o.score[id], item: animeView(this._byId[id]) }, ctx));
      entries = sortEntries("anime", entries, q.sort, q.rev);
      const lab = { day: "今日のトレンド順（AniList）", week: "直近7日のトレンド合計", month: "直近25日のトレンド合計", season: MS.CUR_SEASON_LABEL + "の人気順", year: CUR.y + "年の作品の人気順", all: "全期間の人気順" }[period];
      return { category: "anime", type: type.id, period, total: entries.length, entries, rangeLabel: type.note || lab, updatedAt: o.at, stale: o.stale,
        prevLabel: o.prevKnown ? (period === "day" ? "昨日" : period === "week" ? "先週" : "前回の記録") : "", source: "AniList" };
    }
    async item(id) {
      /* AniList に無い作品（Annict だけにある作品・Filmarks の作品・特別版）は自動取得が控えたものを出す。
         ★ 前は an… だけ見ていたので、Filmarks の作品（fm…）を開くと AniList に数字でない id を聞いて失敗していた */
      if (!/^\d+$/.test(id)) {
        const x = this._jp[id] || jpView(await fb("items/" + (/^sp/.test(id) ? "animesp" : /^dm/.test(id) ? "animedmm" : "anime") + "/" + id, 900e3));
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
      if (/^(sp|dm)/.test(id)) {
        const t = CATS.anime.types.find((x) => x.id === (/^sp/.test(id) ? "sp_dmm" : "dm_weekly"));
        const L = await this.spList(t).catch(() => ({ entries: [] }));
        const e = L.entries.find((x) => x.item.id === id);
        return { rank: e ? e.rank : null, previousRank: e ? e.previousRank : null, prevKnown: e ? e.prevKnown : false, best: e ? e.rank : null,
          label: /^sp/.test(id) ? "DMM TV の特別版の中での順位" : "DMM TV アニメ 週間ランキングの順位" };
      }
      if (!/^\d+$/.test(id)) {
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
      if (!/^\d+$/.test(id)) return fbHistory("anime_jp-season", id, { "1w": 7, "1m": 31, "3m": 92, "1y": 365 }[range] || 31, "国内（Annict）今季の視聴者数ランキングの順位");
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
      /* ★ 略称・よみでも見つかるように（「リゼロ」「むしょくてんせい」など） */
      const local = ix.filter((x) => kanaNorm([x.title, x.short, x.yomi, x.studio, x.director].concat((x.cast || []).map((c) => c.n), (x.staff || []).map((c) => c.n), x.genres || []).join(" ")).indexOf(k) >= 0)
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

  const JP_FIELDS = ["studio", "director", "cast", "staff", "fmScore", "fmUrl", "synopsis", "reviews", "banner", "seasonLabel", "short", "yomi", "episodes", "duration"];
  function jpView(x) {
    const genres = (x.genres && x.genres.length) ? x.genres : ["その他"];
    const title = x.title || "";
    return { id: String(x.id), category: "anime", title, image: x.image || null, banner: x.banner || null, genres, genre: genres[0],
      studio: x.studio || "", director: x.director || "", cast: x.cast || [], staff: x.staff || [], fmScore: x.fmScore || null, fmUrl: x.fmUrl || "",
      synopsis: x.synopsis || "", reviews: x.reviews || [],
      /* ★★ 2026-09-21c 略称・よみ（しょぼいカレンダーから自動取得が付ける） */
      short: x.short || "", yomi: x.yomi || "",
      format: FORMAT_JA[x.format] || x.media || "", formatEn: x.format || "", seasonLabel: x.seasonText || "", airing: x.status === "RELEASING",
      watchers: x.watchers || 0, annictUrl: x.annictUrl, official: x.official || "", episodes: x.episodes || null, duration: x.duration || "",
      /* ★★ 2026-09-22 特別版（ご褒美版など）の作品：どのサービスの・どの版か */
      service: x.service || "", tag: x.tag || "", special: !!(x.special || (x.tag && x.service)),
      /* ★★ 2026-09-22b DMM TV の評価（5点満点）・リンク */
      dmmRating: x.dmmRating || null, dmmVotes: x.dmmVotes || 0, link: x.link || "",
      url: x.link || (x.service ? x.url : null) || (x.anilist ? "https://anilist.co/anime/" + x.id : (x.annictUrl || x.fmUrl)), jpOnly: !x.anilist && !x.service && !x.link, releaseDate: x.startedOn || x.releaseDate || "",
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
  /* ★★ 2026-09-21 ご指定：ランキングに入っていない作品・曲（＝圏外）も一覧に出す。
     ・ランキングぶんを先に、そのうしろに圏外を付ける（順位は null ＝画面では「圏外」）
     ・並べ替えを選んでいるときは、圏外もその順に並べる（選んでいなければ新しい順）
     ・絞り込みは圏外にも同じように効く
     ★ 一覧そのものを作り直すのではなく「うしろに足す」だけにすること。
       ランキングの順位を圏外のせいでずらしてしまうと、前回との比較が狂う。 */
  async function withOffChart(src, cat, entries, q, ctx) {
    /* ★★ 2026-09-21e ご指定：ランキングの画面は<b>ランキング内の作品だけ</b>を出す。
       圏外もふくめた一覧は「全作品」タブ（repo.all）で出すので、ここは頼まれたときだけ動く。 */
    if (!q || q.offchart !== true) return entries;
    let ix;
    try { ix = await src.index(); } catch (e) { return entries; }
    if (!ix || !ix.length) return entries;
    const have = {};
    entries.forEach((e) => { have[e.item.id] = 1; });
    let rest = ix.filter((it) => !have[it.id] && src.passes(it, q && q.filters));
    if (!rest.length) return entries;
    let tail = rest.map((it) => MODEL_OF[cat]({ rank: null, previousRank: null, prevKnown: false, item: it }, ctx));
    tail = sortEntries(cat, tail, (q && q.sort && q.sort !== "rank") ? q.sort : "new");
    return entries.concat(tail);
  }

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
    constructor(cat) {
      this.cat = cat;
      this.label = { fanza: "FANZA（ランキングページ・自動取得）", dlsite: "DLsite 同人（ランキングページ・自動取得）" }[cat] || cat;
      /* ★★ 2026-09-21d このカテゴリーが持つ「出どころ」ごとのファイル名。
         FANZA は4つ（fanza／danime／fbooks／fvideo）、DLsite は1つ。
         curKey ＝ いま見ている出どころ。検索・絞り込み・関連はこれを見る。 */
      this.keys = (CATS[cat] && CATS[cat].keys) || [cat];
      this.curKey = this.keys[0];
      this._where = {};      /* 作品の id → どの出どころのものか */
    }
    keyOf(t) { return (t && t.key) || this.curKey; }
    mk(x) { return doujinItem(this.cat, x); }
    index(key) {
      const k = key || this.curKey;
      return fb("index/" + k, 1800e3).then((rows) => {
        const out = (rows || []).filter(Boolean).map((r) => this.mk(r));
        out.forEach((x) => { this._where[x.id] = k; });
        return out;
      });
    }
    /* その作品がどの出どころのものかを覚えておく（詳細・関連で使う） */
    async whereOf(id) {
      if (this._where[id]) return this._where[id];
      for (const k of this.keys) {
        try {
          const ix = await this.index(k);
          if (ix.some((x) => x.id === id)) return k;
        } catch (e) {}
      }
      return this.curKey;
    }
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
      if (f.origin && kanaNorm(it.origin || it.theme || "").indexOf(kanaNorm(f.origin)) < 0) return false;
      if (f.minRate && !(Number(it.rating) >= Number(f.minRate))) return false;
      /* ★ 2026-09-21 販売数でも絞り込めるように（ご指定）。販売数が出ていない作品は外す。 */
      if (f.minSales && !(Number(it.sales) >= Number(f.minSales))) return false;
      if (f.maxPrice && !(Number(String(it.price).replace(/,/g, "")) <= Number(f.maxPrice))) return false;
      return true;
    }
    async list(q) {
      const type = typeOf(this.cat, q.type);
      const key = this.keyOf(type);
      this.curKey = key;
      const j = await fb("lists/" + key + "_" + (type.lk || type.id), 600e3);
      const known = !!j.prevD;
      /* ★ 映画は「先週の順位」をサイトが出している（lw）。あればそれを前回とする */
      const siteLw = (j.entries || []).some((x) => "lw" in x);
      const known2 = known || siteLw;
      let rows = (j.entries || []).map((x) => ({ item: this.mk(x), previousRank: siteLw ? (x.lw || null) : (x.prev || null) }));
      const all = rows.length;
      rows = rows.filter((r) => this.passes(r.item, q.filters));
      const rerank = rows.length !== all;
      const pr = new Map();
      if (rerank) rows.filter((r) => r.previousRank).sort((a, b) => a.previousRank - b.previousRank).forEach((r, i) => pr.set(r, i + 1));
      const ctx = { type: type.id, period: type.period };
      let entries = rows.map((r, i) => MODEL_OF[this.cat]({ rank: i + 1, previousRank: !known2 ? null : rerank ? pr.get(r) || null : r.previousRank,
        prevKnown: known2, item: r.item }, ctx));
      entries = sortEntries(this.cat, entries, q.sort, q.rev);
      const ranked = entries.length;
      entries = await withOffChart(this, this.cat, entries, q, ctx);
      const sc = (CATS[this.cat].sources || []).find((x) => x.id === type.src);
      return { category: this.cat, type: type.id, period: type.period, total: entries.length, ranked, entries, rangeLabel: type.note, updatedAt: j.at, stale: j._stale,
        prevLabel: siteLw ? "先週（サイトの発表）" : known ? String(j.prevD).replace(/-/g, "/") + " の記録" : "", source: sc ? CATS[this.cat].ja + " " + sc.label : CATS[this.cat].source,
        sourceUrl: j.source || (sc && sc.url) || CATS[this.cat].sourceUrl };
    }
    async item(id) {
      const k = await this.whereOf(id);
      try { return this.mk(await fb("items/" + k + "/" + id, 900e3)); } catch (e) { if (e.code === "nodata") return null; throw e; }
    }
    /* その出どころの「いちばん基本の種類」（順位推移・比較のもとにする） */
    mainType(key) {
      return CATS[this.cat].types.find((t) => (t.key || this.keys[0]) === (key || this.curKey)) || CATS[this.cat].types[0];
    }
    async rankInfo(id) {
      const k = await this.whereOf(id);
      const mt = this.mainType(k);
      const L = await this.list({ type: mt.id, offchart: false });
      const e = L.entries.find((x) => x.item.id === id);
      const h = await fbHistory(k + "_" + (mt.lk || mt.id), id, 365, "");
      const all = h.points.map((p) => p.rank).filter(Boolean); if (e) all.push(e.rank);
      const sc = (CATS[this.cat].sources || []).find((x) => x.key === k);
      return { rank: e ? e.rank : null, previousRank: e ? e.previousRank : null, prevKnown: e ? e.prevKnown : false, best: all.length ? Math.min.apply(null, all) : null,
        label: CATS[this.cat].ja + (sc ? " " + sc.label : "") + " " + mt.label + "の順位" };
    }
    async history(id, range) {
      const k = await this.whereOf(id);
      const mt = this.mainType(k);
      return fbHistory(k + "_" + (mt.lk || mt.id), id, { "1w": 7, "1m": 31, "3m": 92, "1y": 365 }[range] || 31, "自動取得が記録した順位（記録が始まった日から）");
    }
    async search(q, f) {
      const k = kanaNorm(q);
      const [ix, L] = await Promise.all([this.index(), this.list({ type: this.mainType().id, offchart: false }).catch(() => ({ entries: [] }))]);
      const rk = {}; L.entries.forEach((e) => { rk[e.item.id] = e.rank; });
      return ix.filter((it) => (!k || kanaNorm([it.title, it.circle, it.author, it.series, it.origin].concat(it.genres || []).join(" ")).indexOf(k) >= 0) && this.passes(it, f))
        .map((it) => ({ item: it, rank: rk[it.id] || null })).sort((a, b) => (a.rank || 9999) - (b.rank || 9999)).slice(0, 300);
    }
    async trends() {
      const rt = CATS[this.cat].types.find((t) => (t.key || this.keys[0]) === this.curKey && /rising/.test(t.id)) || this.mainType();
      const L = await this.list({ type: rt.id, offchart: false });
      const list = L.entries.slice(0, 30).map((e, i) => ({ item: e.item, heat: Math.max(8, 100 - i * 3), rank: null,
        text: e.item.sales ? "販売数 " + Number(e.item.sales).toLocaleString("ja-JP") : e.item.rating ? "★" + e.item.rating : "" }));
      return { list, genres: genreHeat(list), lead: CATS[this.cat].source + " の急上昇" };
    }
    async related(id) {
      const it = await this.item(id);
      const k = await this.whereOf(id);
      const [ix, L] = await Promise.all([this.index(k), this.list({ type: this.mainType(k).id, offchart: false }).catch(() => ({ entries: [] }))]);
      const rk = {}; L.entries.forEach((e) => { rk[e.item.id] = e.rank; });
      const p = it ? ix.filter((x) => x.id !== id && ((it.seriesId && x.seriesId === it.seriesId) || (it.circleId && x.circleId === it.circleId) || (it.circle && x.circle === it.circle))) : [];
      /* よく似た作品＝ジャンルの重なりが多い順（この作品を見ている人がよく見るもの） */
      const s = it ? ix.filter((x) => x.id !== id && !p.some((y) => y.id === x.id))
        .map((x) => ({ x, n: (x.genres || []).filter((g) => (it.genres || []).indexOf(g) >= 0).length }))
        .filter((o) => o.n >= 2).sort((a, b) => b.n - a.n || (rk[a.x.id] || 9999) - (rk[b.x.id] || 9999)).map((o) => o.x) : [];
      const v = (x) => ({ item: x, rank: rk[x.id] || null });
      /* ★★ 2026-09-21f この作品を見た人が見る作品（ご指定）。
         FANZA＝この作品のレビューを書いた人たちが、ほかに見た作品（多い順）
         DLsite＝公式の「この作品を買った人はこんな作品も買っています」 */
      let also = [];
      if (it && (it.also || []).length) {
        const byId = {};
        for (const kk of this.keys) {
          try { (await this.index(kk)).forEach((x) => { if (!byId[x.id]) byId[x.id] = x; }); } catch (e) {}
        }
        also = it.also.map((i2) => byId[i2]).filter(Boolean).slice(0, 16).map(v);
      }
      const alsoLabel = this.cat === "dlsite" ? "この作品を買った人はこんな作品も買っています" : "この作品を見た人がよく見ている作品";
      const alsoNote = this.cat === "dlsite" ? "DLsite の「この作品を買った人は…」より" : "この作品のレビューを書いた人が、ほかに見た作品を多い順に";
      return { primary: p.slice(0, 12).map(v), secondary: s.slice(0, 12).map(v), also, alsoLabel, alsoNote };
    }
    async compare(pair) {
      const mt = this.mainType();
      const cur = await this.list({ type: mt.id, offchart: false });
      const pv = await fbPrevIds(this.curKey + "_" + (mt.lk || mt.id), pair.days || 0);
      if (!pv) return { cur, prevTop: [], available: false, curLabel: "いま", prevLabel: pair.days ? pair.days + "日前" : "前回" };
      const pr = {}; pv.ids.forEach((id, i) => { pr[id] = i + 1; });
      cur.entries.forEach((e) => { e.previousRank = pr[e.item.id] || null; e.prevKnown = true; e.rankChange = e.previousRank ? e.previousRank - e.rank : null; e.isNew = !e.previousRank; });
      const ix = await this.index();
      const byId = {}; ix.forEach((x) => { byId[x.id] = x; }); cur.entries.forEach((e) => { byId[e.item.id] = e.item; });
      return { cur, prevTop: pv.ids.slice(0, 10).map((id) => byId[id] || this.mk({ id, title: id })), available: true, curLabel: "いま", prevLabel: pv.d.replace(/-/g, "/") };
    }
    async facets() {
      const ix = await this.index().catch(() => []);
      const m = {}, circles = {};
      ix.forEach((x) => { (x.genres || []).forEach((g) => { m[g] = (m[g] || 0) + 1; }); if (x.circle) circles[x.circle] = (circles[x.circle] || 0) + 1; });
      const skip = /^(コミック|CG|ボイス|ゲーム|動画|音楽|アニメ|その他|ツール|写真|男性向け|女性向け|成人向け|専売|独占|新作|準新作|旧作)$/;
      const sales = ix.map((x) => Number(x.sales) || 0).filter(Boolean).sort((a, b) => b - a);
      return { genres: Object.keys(m).filter((g) => !skip.test(g)).sort((a, b) => m[b] - m[a]).slice(0, 120),
        circles: Object.keys(circles).sort((a, b) => circles[b] - circles[a]).slice(0, 60),
        maxSales: sales[0] || 0, medSales: sales[Math.floor(sales.length / 2)] || 0,
        kinds: this.cat === "fanza" ? ["コミック", "動画", "本", "アニメ"] : ["マンガ", "CG集"] };
    }
    /* 人（サークル・作者）でまとめる */
    async byPerson(kind, name) {
      const ix = await this.index();
      const k = kanaNorm(name);
      const pick = (x) => kind === "circle" ? x.circle : kind === "series" ? x.series : kind === "origin" ? (x.origin || x.theme) : x.author;
      const L = await this.list({ type: "overall", offchart: false }).catch(() => ({ entries: [] }));
      const rk = {}; L.entries.forEach((e) => { rk[e.item.id] = e.rank; });
      return ix.filter((x) => kanaNorm(pick(x) || "") === k).map((x) => ({ item: x, rank: rk[x.id] || null }))
        .sort((a, b) => (a.rank || 9999) - (b.rank || 9999));
    }
  }
  const FanzaSource = DoujinSource;

  /* ══════════ 映画（自動取得 → GitHub のデータ） ══════════
     ★★ 2026-09-22 作りは同人と同じ（出どころ＝ボタン、種類＝lk）。作品の形と絞り込みだけ映画用にする。 */
  function movieItem(x) {
    const it = Object.assign({}, x, { category: "movie", id: String(x.id), genres: x.genres || [] });
    it.genre = it.genres[0] || "";
    it.cast = x.cast || [];
    it.isNew = daysAgo(x.releaseDate) <= 14 && daysAgo(x.releaseDate) >= -7;
    it.year = x.year || (x.releaseDate ? +String(x.releaseDate).slice(0, 4) : null);
    return it;
  }
  class MovieSource extends DoujinSource {
    constructor() { super("movie"); this.label = "映画.com・Box Office Mojo（ランキングページ・自動取得）"; }
    mk(x) { return movieItem(x); }
    passes(it, f) {
      if (!f) return true;
      if (f.genres && f.genres.length) {
        const g = it.genres || [];
        if (!(f.genreAnd ? f.genres.every((x) => g.indexOf(x) >= 0) : f.genres.some((x) => g.indexOf(x) >= 0))) return false;
      }
      if (f.country && f.country.length && !f.country.some((c) => c === "日本" ? /日本/.test(it.country || "") : c === "海外" ? it.country && !/^日本$/.test(it.country) : true)) return false;
      if (f.dist && kanaNorm(it.dist || "").indexOf(kanaNorm(f.dist)) < 0) return false;
      if (f.director && kanaNorm(it.director || "").indexOf(kanaNorm(f.director)) < 0) return false;
      if (f.cast && !(it.cast || []).some((c) => kanaNorm(c.n).indexOf(kanaNorm(f.cast)) >= 0)) return false;
      if (f.minRate && !(Number(it.rating) >= Number(f.minRate))) return false;
      const age = daysAgo(it.releaseDate);
      if (f.when && f.when.length && !f.when.some((w) => w === "week" ? age < 7 && age >= 0 : w === "month" ? age < 31 && age >= 0 : w === "year" ? it.year === CUR.y : (it.year || 9999) < CUR.y)) return false;
      if (f.market && f.market.length && f.market.indexOf(it.market || "jp") < 0) return false;
      return true;
    }
    async search(q, f) {
      const k = kanaNorm(q);
      const [ix, L] = await Promise.all([this.index(), this.list({ type: "jp" }).catch(() => ({ entries: [] }))]);
      const rk = {}; L.entries.forEach((e) => { rk[e.item.id] = e.rank; });
      return ix.filter((it) => (!k || kanaNorm([it.title, it.en, it.director, it.dist, it.origin].concat(it.genres || [], (it.cast || []).map((c) => c.n)).join(" ")).indexOf(k) >= 0) && this.passes(it, f))
        .map((it) => ({ item: it, rank: rk[it.id] || null })).sort((a, b) => (a.rank || 9999) - (b.rank || 9999)).slice(0, 300);
    }
    async trends() {
      const L = await this.list({ type: "jp" });
      const list = L.entries.slice(0, 20).map((e) => ({ item: e.item, rank: e.rank,
        heat: Math.max(8, 100 - (e.rank - 1) * 5 + (e.item.isNew ? 10 : 0) + (e.rankChange > 0 ? e.rankChange * 4 : 0)),
        text: e.prevKnown ? (e.previousRank ? (e.rankChange > 0 ? "先週 " + e.previousRank + "位から上昇" : "先週 " + e.previousRank + "位") : "初登場") : "" }))
        .sort((a, b) => b.heat - a.heat);
      return { list, genres: genreHeat(list), lead: "国内の週末ランキング（映画.com）で伸びている映画" };
    }
    async related(id) {
      const it = await this.item(id);
      const ix = await this.index();
      const L = await this.list({ type: "jp" }).catch(() => ({ entries: [] }));
      const rk = {}; L.entries.forEach((e) => { rk[e.item.id] = e.rank; });
      const v = (x) => ({ item: x, rank: rk[x.id] || null });
      const kd = it ? kanaNorm(it.director || "") : "";
      const cast = it ? (it.cast || []).slice(0, 5).map((c) => kanaNorm(c.n)) : [];
      const p = it ? ix.filter((x) => x.id !== id && ((kd && kanaNorm(x.director || "") === kd) || (x.cast || []).some((c) => cast.indexOf(kanaNorm(c.n)) >= 0))) : [];
      const s2 = it ? L.entries.map((e) => e.item).filter((x) => x.id !== id && !p.some((y) => y.id === x.id) && (x.genres || []).some((g) => (it.genres || []).indexOf(g) >= 0)) : [];
      return { primary: p.slice(0, 12).map(v), secondary: s2.slice(0, 12).map(v) };
    }
    async facets() {
      const ix = await this.index().catch(() => []);
      const m = {}, d = {};
      ix.forEach((x) => { (x.genres || []).forEach((g) => { m[g] = (m[g] || 0) + 1; }); if (x.dist) d[x.dist] = (d[x.dist] || 0) + 1; });
      return { genres: Object.keys(m).sort((a, b) => m[b] - m[a]).slice(0, 40), dists: Object.keys(d).sort((a, b) => d[b] - d[a]).slice(0, 30), kinds: [] };
    }
    async byPerson(kind, name) {
      const ix = await this.index();
      const k = kanaNorm(name);
      const L = await this.list({ type: "jp" }).catch(() => ({ entries: [] }));
      const rk = {}; L.entries.forEach((e) => { rk[e.item.id] = e.rank; });
      return ix.filter((x) => kind === "director" ? kanaNorm(x.director || "").indexOf(k) >= 0 : kind === "dist" ? kanaNorm(x.dist || "") === k
        : (x.cast || []).some((c) => kanaNorm(c.n) === k)).map((x) => ({ item: x, rank: rk[x.id] || null })).sort((a, b) => (a.rank || 9999) - (b.rank || 9999));
    }
  }

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
  /* ★★ 2026-09-21f カラオケ・音楽には「この曲を聴いた人が聴く曲」の公開データが無い。
     いちばん近いものとして、<b>同じランキングにいっしょに並んでいる回数</b>が多い曲を出す
     （アニソン・ボカロなどジャンル別の表どうしで重なるほど、同じ人たちに歌われ・聴かれている）。 */
  async function coOccur(keys, id, toItem) {
    const cnt = {}, best = {};
    for (const k of keys) {
      let j; try { j = await fb("lists/" + k, 600e3); } catch (e) { continue; }
      const es = j.entries || [];
      const me = es.findIndex((x) => String(x.id || x.rn) === String(id));
      if (me < 0) continue;
      es.forEach((x, i) => {
        const xid = String(x.id || x.rn);
        if (xid === String(id)) return;
        const w = 1 / (1 + Math.abs(i - me) / 10);           /* 順位が近いほど重く */
        cnt[xid] = (cnt[xid] || 0) + w;
        if (!best[xid]) best[xid] = x;
      });
    }
    return Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a]).slice(0, 16).map((xid) => ({ item: toItem(best[xid]), rank: null }));
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
      entries = sortEntries("karaoke", entries, q.sort, q.rev);
      const ranked = entries.length;
      entries = await withOffChart(this, "karaoke", entries, q, ctx);
      const lname = LIST_GENRE[list] || LIST_NAME[list] || "総合";
      return { category: "karaoke", type: type.id, period, total: entries.length, ranked, entries, list, term,
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
      const also = await coOccur(["karaoke_total-weekly", "karaoke_total-monthly", "karaoke_total-daily", "karaoke_burst-weekly", "karaoke_anison-weekly", "karaoke_vocaloid-weekly",
        "karaoke_foreign-weekly", "karaoke_enka-weekly", "karaoke_vtuber-weekly", "karaoke_duet-weekly", "karaoke_year-year"], id, (x) => karaItem(x)).catch(() => []);
      return { primary: p.slice(0, 12), secondary: sec, also: also.filter((x) => !p.some((y) => y.item.id === x.item.id)),
        alsoLabel: "この曲といっしょに歌われている曲", alsoNote: "DAM のジャンル別ランキングで、同じ表に近い順位で並んでいる曲" };
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
  /* ══════════ MUSIC（Billboard JAPAN → 自動取得 → GitHub のデータ） ══════════
     ★★ 2026-09-21 ご指定の「視聴されている曲」のランキング。
        カラオケ（歌われた回数）とは数えかたも出どころも別なので、DamSource とは分けてある。
        アーティストの曲は、ランキング圏外のぶんも index/music.json に入っている。 */
  const BB = "https://www.billboard-japan.com";
  function musicItem(x) {
    const it = Object.assign({}, x, { category: "music", id: String(x.id) });
    it.year = x.releaseDate ? +String(x.releaseDate).slice(0, 4) : null;
    it.genre = x.genre || "";
    it.isNewSong = !!x.releaseDate && daysAgo(x.releaseDate) <= 180;
    it.url = x.appleUrl || x.url || BB + "/charts/";
    return it;
  }
  class BillboardSource {
    constructor() { this.cat = "music"; this.label = "Billboard JAPAN（チャートのページ・自動取得）"; }
    index() { return fb("index/music", 1800e3).then((rows) => (rows || []).filter(Boolean).map(musicItem)); }
    passes(it, f) {
      if (!f) return true;
      if (f.artist && kanaNorm(it.artist || "").indexOf(kanaNorm(f.artist)) < 0) return false;
      if (f.genres && f.genres.length && f.genres.indexOf(it.genre) < 0) return false;
      if (f.yearFrom && (!it.year || it.year < f.yearFrom)) return false;
      if (f.yearTo && (!it.year || it.year > f.yearTo)) return false;
      if (f.tags && f.tags.length && !f.tags.some((x) => x === "new" ? it.isNewSong : x === "chart" ? !it.offchart : true)) return false;
      return true;
    }
    async list(q) {
      const type = typeOf("music", q.type);
      const j = await fb("lists/music_" + type.id, 600e3);
      const known = !!j.prevD;
      let rows = (j.entries || []).map((x) => ({ item: musicItem(x), previousRank: x.prev || null }));
      const all = rows.length;
      rows = rows.filter((r) => this.passes(r.item, q.filters));
      const rerank = rows.length !== all;
      const pr = new Map();
      if (rerank) rows.filter((r) => r.previousRank).sort((a, b) => a.previousRank - b.previousRank).forEach((r, i) => pr.set(r, i + 1));
      const ctx = { type: type.id, period: type.period };
      let entries = rows.map((r, i) => MODEL_OF.music({ rank: i + 1, previousRank: !known ? null : rerank ? pr.get(r) || null : r.previousRank,
        prevKnown: known, item: r.item }, ctx));
      entries = sortEntries("music", entries, q.sort, q.rev);
      const ranked = entries.length;
      entries = await withOffChart(this, "music", entries, q, ctx);
      return { category: "music", type: type.id, period: type.period, total: entries.length, ranked, entries,
        rangeLabel: j.note || type.note, updatedAt: j.at, stale: j._stale,
        prevLabel: known ? String(j.prevD).replace(/-/g, "/") + " の記録" : "", source: "Billboard JAPAN", sourceUrl: j.source || BB + "/charts/" };
    }
    async item(id) {
      try { return musicItem(await fb("items/music/" + id, 900e3)); } catch (e) { if (e.code === "nodata") return null; throw e; }
    }
    async rankInfo(id) {
      const L = await this.list({ type: "stream", offchart: false });
      const e = L.entries.find((x) => x.item.id === id);
      const h = await fbHistory("music_stream", id, 365, "");
      const all = h.points.map((p) => p.rank).filter(Boolean); if (e) all.push(e.rank);
      return { rank: e ? e.rank : null, previousRank: e ? e.previousRank : null, prevKnown: e ? e.prevKnown : false,
        best: all.length ? Math.min.apply(null, all) : null, label: "Billboard JAPAN 視聴（ストリーミング）の順位" };
    }
    history(id, range) { return fbHistory("music_stream", id, { "1w": 7, "1m": 31, "3m": 92, "1y": 365 }[range] || 31, "Billboard JAPAN 視聴ランキングの順位"); }
    async search(q, f) {
      const k = kanaNorm(q);
      const [ix, L] = await Promise.all([this.index(), this.list({ type: "stream", offchart: false }).catch(() => ({ entries: [] }))]);
      const rk = {}; L.entries.forEach((e) => { rk[e.item.id] = e.rank; });
      return ix.filter((it) => (!k || kanaNorm(it.title + " " + it.artist + " " + (it.genre || "")).indexOf(k) >= 0) && this.passes(it, f))
        .map((it) => ({ item: it, rank: rk[it.id] || null })).sort((a, b) => (a.rank || 9999) - (b.rank || 9999)).slice(0, 300);
    }
    async byPerson(kind, name) {
      const ix = await this.index();
      const k = kanaNorm(name);
      const L = await this.list({ type: "stream", offchart: false }).catch(() => ({ entries: [] }));
      const rk = {}; L.entries.forEach((e) => { rk[e.item.id] = e.rank; });
      return ix.filter((x) => kanaNorm(x.artist || "") === k).map((x) => ({ item: x, rank: rk[x.id] || null }))
        .sort((a, b) => (a.rank || 9999) - (b.rank || 9999));
    }
    async artists() {
      const ix = await this.index();
      const m = {};
      ix.forEach((x) => { if (x.artist) m[x.artist] = (m[x.artist] || 0) + 1; });
      return Object.keys(m).sort((a, b) => m[b] - m[a]);
    }
    async facets() {
      const ix = await this.index().catch(() => []);
      const m = {};
      ix.forEach((x) => { if (x.genre) m[x.genre] = (m[x.genre] || 0) + 1; });
      return { genres: Object.keys(m).sort((a, b) => m[b] - m[a]).slice(0, 40) };
    }
    async trends() {
      const L = await this.list({ type: "stream", offchart: false });
      const list = L.entries.slice(0, 30).map((e, i) => ({ item: e.item, heat: Math.max(8, 100 - i * 3), rank: e.rank,
        text: e.prevKnown ? (e.previousRank ? "前回 " + e.previousRank + "位" : "初登場") : "" }));
      const gh = {};
      list.forEach((x) => { const g = x.item.genre || "その他"; gh[g] = (gh[g] || 0) + x.heat; });
      return { list, genres: Object.keys(gh).map((g) => ({ g, v: gh[g] })).sort((a, b) => b.v - a.v).slice(0, 8),
        lead: "Billboard JAPAN の視聴（ストリーミング）ランキング＝いちばん聴かれている曲" };
    }
    async related(id) {
      const it = await this.item(id);
      const [ix, L] = await Promise.all([this.index(), this.list({ type: "stream", offchart: false }).catch(() => ({ entries: [] }))]);
      const rk = {}; L.entries.forEach((e) => { rk[e.item.id] = e.rank; });
      const k = it ? kanaNorm(it.artist || "") : "";
      const p = it ? ix.filter((x) => x.id !== id && k && kanaNorm(x.artist || "") === k).map((x) => ({ item: x, rank: rk[x.id] || null })) : [];
      const sec = it ? L.entries.filter((e) => e.item.id !== id && it.genre && e.item.genre === it.genre && !p.some((y) => y.item.id === e.item.id))
        .slice(0, 12).map((e) => ({ item: e.item, rank: e.rank })) : [];
      const also = await coOccur(["music_stream", "music_overall", "music_video", "music_download", "music_anime", "music_niconico", "music_sales"], id, (x) => musicItem(x)).catch(() => []);
      return { primary: p.slice(0, 12), secondary: sec, also: also.filter((x) => !p.some((y) => y.item.id === x.item.id)),
        alsoLabel: "この曲といっしょに聴かれている曲", alsoNote: "Billboard JAPAN の各チャートで、同じ表に近い順位で並んでいる曲" };
    }
    async compare(pair) {
      const cur = await this.list({ type: "stream", offchart: false });
      const pv = await fbPrevIds("music_stream", pair.days || 0);
      if (!pv) return { cur, prevTop: [], available: false, curLabel: "いま", prevLabel: pair.days ? pair.days + "日前" : "前回" };
      const pr = {}; pv.ids.forEach((id, i) => { pr[id] = i + 1; });
      cur.entries.forEach((e) => { e.previousRank = pr[e.item.id] || null; e.prevKnown = true; e.rankChange = e.previousRank ? e.previousRank - e.rank : null; e.isNew = !e.previousRank; });
      const ix = await this.index();
      const byId = {}; ix.forEach((x) => { byId[x.id] = x; }); cur.entries.forEach((e) => { byId[e.item.id] = e.item; });
      return { cur, prevTop: pv.ids.slice(0, 10).map((id) => byId[id] || musicItem({ id, title: id })), available: true, curLabel: "いま", prevLabel: pv.d.replace(/-/g, "/") };
    }
  }

  const sources = { anime: new AniListSource(), fanza: new DoujinSource("fanza"), dlsite: new DoujinSource("dlsite"),
    karaoke: new DamSource(), music: new BillboardSource(), movie: new MovieSource() };
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
    /* ★★ 2026-09-21f 新作（ご指定）。
       アニメ＝AniList の今季・来季（来季は放送前の作品）／音楽＝発売から90日以内
       カラオケ＝発売から180日以内の曲／FANZA・DLsite＝配信から30日以内（出どころごと） */
    async newItems(cat, srcKey, q) {
      q = q || {};
      const S0 = src(cat);
      let rows;
      if (cat === "anime") {
        const nxt = CUR.s === 3 ? { y: CUR.y + 1, s: 0 } : { y: CUR.y, s: CUR.s + 1 };
        const t = q.when === "next" ? nxt : CUR;
        const res = await S0.page({ season: SEASON_EN[t.s], year: t.y, sort: ["POPULARITY_DESC"] }, 2);
        S0.remember(res.media);
        rows = res.media.map(animeView).filter(Boolean);
        const jp = ((await fb("index/anime", 1800e3).catch(() => [])) || []).map(jpView);
        const k = (x) => kanaNorm(x.title || "").slice(0, 8);
        const seen = {}; rows.forEach((x) => { seen[k(x)] = 1; });
        if (q.when !== "next") jp.filter((x) => /今季|放送中/.test(x.seasonLabel || "") && !seen[k(x)]).forEach((x) => rows.push(x));
        rows = rows.filter((it) => S0.jpPasses(it, q.filters));
      } else {
        const ix = cat === "karaoke" || cat === "music" ? await S0.index() : await (S0.keys ? S0.index(srcKey || S0.keys[0]) : S0.index());
        const lim = cat === "music" ? 90 : cat === "karaoke" ? 180 : 30;
        rows = ix.filter((it) => it.releaseDate && daysAgo(it.releaseDate) <= lim && daysAgo(it.releaseDate) >= -60 && (!S0.passes || S0.passes(it, q.filters)));
      }
      const k2 = kanaNorm(q.q || "");
      if (k2) rows = rows.filter((it) => kanaNorm([it.title, it.circle, it.author, it.artist, it.studio].concat(it.genres || []).join(" ")).indexOf(k2) >= 0);
      let entries = rows.map((it) => MODEL_OF[cat]({ rank: null, previousRank: null, prevKnown: false, item: it }, { type: "new", period: "all" }));
      entries = sortEntries(cat, entries, q.sort && q.sort !== "rank" ? q.sort : (cat === "anime" ? null : "new"), q.rev);
      return { total: entries.length, entries,
        label: cat === "anime" ? (q.when === "next" ? "来季（" + (CUR.s === 3 ? CUR.y + 1 : CUR.y) + "年" + SEASON_NM[SEASON_EN[(CUR.s + 1) % 4]] + "）の放送予定" : MS.CUR_SEASON_LABEL + "の作品")
          : cat === "music" ? "発売から90日以内の曲" : cat === "karaoke" ? "発売から180日以内の曲" : cat === "movie" ? "公開から30日以内の映画" : "配信から30日以内の作品" };
    },
    /* ★★ 2026-09-21f セール情報（開催中のキャンペーン）。自動取得の campaigns.json を読む */
    async campaigns() {
      const j = await fb("campaigns", 600e3);
      const today = ymd(D0);
      const list = (j.list || []).filter((c) => !c.end || c.end >= today);   /* 終わったキャンペーンは出さない */
      return { at: j.at, list };
    },
    /* ★★ 2026-09-21e 全作品（圏外もふくむ）。出どころ（FANZA の4つ）ごと。
       ランキングに入っている作品には順位も付ける。 */
    async all(cat, srcKey, q) {
      q = q || {};
      const S0 = src(cat);
      let ix;
      if (cat === "anime") ix = ((await fb("index/" + (srcKey === "dmm" ? "animedmm" : srcKey === "special" ? "animesp" : "anime"), 1800e3).catch(() => [])) || []).filter((x) => x && !/^fm/.test(String(x.id))).map(jpView);
      else ix = await (S0.keys ? S0.index(srcKey || S0.keys[0]) : S0.index());
      const pass = S0.passes ? (it) => S0.passes(it, q.filters) : S0.jpPasses ? (it) => S0.jpPasses(it, q.filters) : () => true;
      const k = kanaNorm(q.q || "");
      const hit = (it) => !k || kanaNorm([it.title, it.short, it.yomi, it.circle, it.author, it.artist, it.series, it.origin, it.studio]
        .concat(it.genres || []).join(" ")).indexOf(k) >= 0;
      let rows = ix.filter((it) => hit(it) && pass(it));
      const rk = {};
      try {
        const mt = S0.mainType ? S0.mainType(srcKey || (S0.keys && S0.keys[0])) : null;
        const L0 = await S0.list(mt ? { type: mt.id } : cat === "karaoke" ? { type: "weekly" } : cat === "music" ? { type: "stream" }
          : srcKey === "dmm" ? { type: "dm_weekly" } : srcKey === "special" ? { type: "sp_dmm" } : { type: "jp", period: "season" });
        L0.entries.forEach((e) => { rk[e.item.id] = e.rank; });
      } catch (e) {}
      let entries = rows.map((it) => MODEL_OF[cat]({ rank: rk[it.id] || null, previousRank: null, prevKnown: false, item: it }, { type: "all", period: "all" }));
      /* ★★ 2026-09-21g 「ランキング順」はランキングの順位どおり（1位から）、そのあとにランキング外を新しい順。
         sortEntries は rank を「そのまま」と扱うので、ここで並べる（前は新しい順になっていた）。 */
      if (!q.sort || q.sort === "rank") {
        entries = sortEntries(cat, entries, "new");
        const ranked = entries.filter((e) => e.rank).sort((a, b) => a.rank - b.rank), rest = entries.filter((e) => !e.rank);
        entries = ranked.concat(rest);
        if (q.rev) entries = ranked.slice().reverse().concat(rest);
      } else entries = sortEntries(cat, entries, q.sort, q.rev);
      return { category: cat, total: entries.length, all: ix.length, entries };
    },
    /* ★★ 2026-09-21e セール・値下がり。値段が取れている出どころ（FANZA の4つ・DLsite）をまとめて見る。
       mode="sale" … いま割引中（off>0 か、元の値段より安い）
       mode="drop" … これまでに記録した値段より下がった（was>いま・過去最安 など） */
    async deals(mode, q) {
      q = q || {};
      const want = q.keys && q.keys.length ? q.keys : ["fanza", "danime", "fbooks", "fvideo", "dlsite"];
      const catOf = (k) => (k === "dlsite" ? "dlsite" : "fanza");
      const out = [];
      let seenPrice = false;
      for (const k of want) {
        const S0 = src(catOf(k));
        let ix = [];
        try { ix = await (S0.keys ? S0.index(k) : S0.index()); } catch (e) { continue; }
        ix.forEach((it) => {
          if (it.listPrice != null || it.off != null || it.low != null) seenPrice = true;
          const p = num0(String(it.price == null ? "" : it.price).replace(/,/g, ""));
          if (p == null) return;
          const on = mode === "sale" ? (Number(it.off) > 0 || (it.listPrice && p < it.listPrice))
            : mode === "cheap" ? (Number(it.off) > 0 || (it.listPrice && p < it.listPrice) || (it.was && p < it.was))
            : (it.was && p < it.was) || (it.high && p < it.high);      /* 値下がり＝記録してきた値段より下がった */
          if (!on) return;
          if (S0.passes && !S0.passes(it, q.filters)) return;
          it.srcKey = k;
          out.push(it);
        });
      }
      const k = kanaNorm(q.q || "");
      let rows = k ? out.filter((it) => kanaNorm([it.title, it.circle, it.author].concat(it.genres || []).join(" ")).indexOf(k) >= 0) : out;
      if (q.minOff) rows = rows.filter((it) => Number(it.off) >= Number(q.minOff));
      if (q.maxPrice) rows = rows.filter((it) => num0(String(it.price).replace(/,/g, "")) <= Number(q.maxPrice));
      let entries = rows.map((it) => MODEL_OF[it.category]({ rank: null, previousRank: null, prevKnown: false, item: it }, { type: mode, period: "all" }));
      /* 「今安いおすすめ」の並び：割引率 × 評価 × 売れ行き */
      if (!q.sort || q.sort === "rec") {
        const sc = (e) => { const v = e.item; return (Number(v.off) || 0) * 1.0 + (Number(v.rating) || 3) * 8 + Math.log10((Number(v.sales) || 1) + 1) * 10 + (v.dropAt ? 15 : 0); };
        entries.sort((a, b) => sc(b) - sc(a));
        if (q.rev) entries.reverse();
      } else entries = sortEntries("fanza", entries, q.sort, q.rev);
      /* ★ 値段の中身（元の値段・割引率）がまだ取れていない＝古い取得のデータだけ */
      return { total: entries.length, entries, noPrice: !seenPrice };
    },
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
          : (cat === "karaoke" || cat === "music") ? [x.artist] : [x.circle, x.author];
        names.filter(Boolean).forEach((n) => { if (peo.indexOf(kanaNorm(n)) >= 0) sc += 14; });
        sc += Math.min(6, (Number(x.watchers) || 0) / 2000) + (Number(x.fmScore) || 0) + (Number(x.rating) || 0);
        return { item: x, sc };
      }).filter((o) => o.sc > 3).sort((a, b) => b.sc - a.sc).slice(0, 20);
      return scored.map((o) => ({ item: o.item, rank: null }));
    },
    /* ★★ 2026-09-21i ご指定「おすすめは複数の項目・履歴・お気に入りから推測」。
       前は「この画面で表示した作品」しか材料にならず、開き直すとお気に入りも履歴もほぼ空だった。
       いまは次の手がかりを全部足して点をつける（一覧＝index から作品の中身を引き直す）：
         ・お気に入り（重み3）・閲覧履歴（重み2→古いほど軽く）
         ・その作品のジャンル／作者・サークル・アーティスト・制作会社・監督・声優／シリーズ・原作
         ・その作品を「見た人がよく見る作品」（also）… いちばん強い手がかり
         ・好みのジャンル（マイページ）・最近の検索の言葉
       点がいちばん大きかった理由を「〜だから」として返す。 */
    async recommendFrom(cat, P, onlyKeys) {
      const S0 = src(cat);
      let ix;
      /* ★★ 2026-09-22 ご指定「FANZA のおすすめ表示を本とアニメで分けて」。
         onlyKeys を渡すと、その出どころの作品だけから選ぶ（材料＝お気に入り・履歴は全部使う）。 */
      let pool = null;
      if (cat === "anime") ix = ((await fb("index/anime", 1800e3).catch(() => [])) || []).map(jpView);
      else if (S0.keys) {
        ix = []; pool = {};
        for (const k of S0.keys) {
          try { const rows = await S0.index(k); ix = ix.concat(rows); if (!onlyKeys || onlyKeys.indexOf(k) >= 0) rows.forEach((x) => { pool[x.id] = 1; }); } catch (e) {}
        }
      }
      else ix = await S0.index().catch(() => []);
      const byId = {}; ix.forEach((x) => { if (!byId[x.id]) byId[x.id] = x; });
      const peopleOf = (x) => (cat === "anime" ? [x.studio, x.director].concat((x.cast || []).slice(0, 6).map((c) => c.n))
        : cat === "movie" ? [x.director, x.dist].concat((x.cast || []).slice(0, 6).map((c) => c.n))
        : (cat === "karaoke" || cat === "music") ? [x.artist] : [x.circle, x.author, x.series, x.origin]).filter(Boolean);
      const G = {}, Pp = {}, A = {}, why = {};
      const seen = {};
      (P.seeds || []).forEach((sd) => {
        seen[sd.id] = 1;
        const x = byId[sd.id] || sd.it; if (!x) return;
        (x.genres || []).forEach((g) => { G[g] = (G[g] || 0) + sd.w; });
        peopleOf(x).forEach((n) => { const k = kanaNorm(n); Pp[k] = (Pp[k] || 0) + sd.w; why["p:" + k] = n; });
        (x.also || []).forEach((a2, i) => { A[a2] = (A[a2] || 0) + sd.w * (1 - i / 20); if (!why["a:" + a2]) why["a:" + a2] = x.title; });
      });
      (P.prefs || []).forEach((g) => { G[g] = (G[g] || 0) + 4; });
      const Q = (P.queries || []).map(kanaNorm).filter((q) => q.length >= 2);
      const out = [];
      ix.forEach((x) => {
        if (seen[x.id] || (pool && !pool[x.id])) return;
        const parts = [];
        let gs = 0, bestG = "";
        (x.genres || []).forEach((g) => { const v = G[g] || 0; gs += v; if (v > (G[bestG] || 0)) bestG = g; });
        if (gs) parts.push([gs * 1.0, bestG ? ((P.prefs || []).indexOf(bestG) >= 0 ? "好きなジャンル「" : "よく見るジャンル「") + bestG + "」" : ""]);
        let ps = 0, bestP = "";
        peopleOf(x).forEach((n) => { const k = kanaNorm(n); const v = Pp[k] || 0; if (v) { ps += v * 6; if (!bestP) bestP = why["p:" + k]; } });
        if (ps) parts.push([ps, "よく見る「" + bestP + "」"]);
        if (A[x.id]) parts.push([A[x.id] * 9, "「" + String(why["a:" + x.id] || "").slice(0, 16) + "」を見た人がよく見る"]);
        if (Q.length) {
          const hay = kanaNorm([x.title, x.short].concat(x.genres || [], peopleOf(x)).join(" "));
          const hit = Q.find((q) => hay.indexOf(q) >= 0);
          if (hit) parts.push([8, "検索した「" + (P.queries.find((q) => kanaNorm(q) === hit) || hit) + "」"]);
        }
        if (!parts.length) return;
        const sc = parts.reduce((a, p) => a + p[0], 0) + Math.min(4, (Number(x.watchers) || 0) / 3000) + (Number(x.fmScore) || 0) * 0.6 + (Number(x.rating) || 0) * 0.6 + Math.log10((Number(x.sales) || 0) + 1) * 0.6;
        parts.sort((a, b) => b[0] - a[0]);
        out.push({ item: x, rank: null, sc, why: parts[0][1], n: parts.length });
      });
      out.sort((a, b) => b.sc - a.sc);
      /* 同じ作者ばかりにならないよう、同じ理由は4件まで */
      const cnt = {}, res = [];
      for (const o of out) { cnt[o.why] = (cnt[o.why] || 0) + 1; if (cnt[o.why] <= 4) res.push(o); if (res.length >= 20) break; }
      return res;
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
    CATS, CAT_IDS, PERIODS, Models, repo, AniListSource, DoujinSource, DamSource, BillboardSource, MovieSource, SORTS, moneyOf, minutesOf,
    typeOf, periodsOfType, defaultPeriod, fmtDate, fmtMD, agoLabel, T, daysAgo,
    /* 人・ジャンル・検索の一覧（{item, rank} の並び）も、ランキングと同じ並べ替えを使う */
    sortRows: (cat, rows, sort, rev) => sortEntries(cat, rows, sort, rev),
    CUR_SEASON: CUR, CUR_SEASON_LABEL: CUR.y + "年" + SEASON_NM[SEASON_EN[CUR.s]] + "アニメ",
    ANIME_GENRES, ANIME_FORMATS, KARA_GENRES, KARA_LISTS, kanaNorm, fnv,
    GENRE_JA_LIST: Object.keys(GENRE_JA).map((k) => GENRE_JA[k]),   /* 好みのジャンルの候補に使う */
  });
})();
