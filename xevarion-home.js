/* ============================================================
   XEVARION HOME — 明るいカジュアル・ホームのロジック
   ・xevarion.js（ポータル本体）の後に defer 読み込みされる前提。
     runPortalBoot をラップして、アクセス画面の後にホームを出す。
   ・既存モーダル（メール／お知らせ／ミッション／設定／CDK／XEVAガイド）は
     そのまま流用し、ホームからは開くだけにする。
   ============================================================ */
"use strict";

/* ══════════════ アプリ・マスタ ══════════════ */

/* オフラインでも遊べるアプリ（それぞれ自前の Service Worker を持つ） */
const XH_OFFLINE_OK = {
  magilex:        { name: "MagiLex",        href: "MagiLex/MagiLex.html",       sw: "MagiLex/sw.js" },
  magiburst:      { name: "MagiBurst",      href: "MagiBurst/index.html",       sw: "MagiBurst/sw.js" },
  magichainparty: { name: "MagiChainParty", href: "MagiChainParty/index.html",  sw: "MagiChainParty/sw.js" },
  xevynar:        { name: "XEVYNAR",        href: "XEVYNAR/index.html",         sw: "XEVYNAR/sw.js" },
  /* MagiJackpot は1人プレイとパーティーモードが通信不要なので、オフラインでも遊べる。
     オンライン対戦だけは通信が要る（アプリ側で案内する）。 */
  magijackpot:    { name: "MagiJackpot",    href: "MagiJackpot/index.html",     sw: "MagiJackpot/sw.js" }
};

const XH_CATS = [
  { id: "all",    label: "すべて" },
  { id: "game",   label: "🎮 ゲーム" },
  { id: "learn",  label: "📚 学習" },
  { id: "social", label: "💬 つながる" },
  { id: "info",   label: "📊 情報・ツール" },
  { id: "shop",   label: "🏪 店舗・公式" }
];

/* name = ホームの短い表示名 / full = 正式名 / sub = 一言 / desc = 一覧での説明 */
const XH_APPS = [
  { id:"magibattle", name:"MagiBattle", sub:"戦略バトル", cat:"game", tone:"red",
    href:"MagiBattle/index.html", img:"thumbs/MagiBattle.jpg",
    desc:"ガチャで集めたキャラを育てて戦うキャラバトルRPG。回転ダイアル編成×手動バースト×5属性、無限の塔・スコアアタックも。" },
  { id:"magilex", name:"MagiLex", sub:"魔導書・知識", cat:"learn", tone:"blue",
    href:"MagiLex/MagiLex.html", img:"thumbs/MagiLex.jpg",
    desc:"魔法の書から問題が飛び出す学習アプリ。難関大英単語（発音つき）・物理・化学・古文をクイズ×単語帳で。オフライン学習OK。" },
  { id:"magiburst", name:"MagiBurst", sub:"爽快アクション", cat:"game", tone:"violet",
    href:"MagiBurst/index.html", img:"thumbs/MagiBurst.jpg",
    desc:"引っぱって、はなして、ぶっとばせ！最大4人マルチの引っぱりハンティング。オフラインでもソロクエストが遊べます。" },
  { id:"magiarena", name:"MagiArena", sub:"PvPアリーナ", cat:"game", tone:"teal",
    href:"MagiArena/MagiArena.html", img:"thumbs/MagiArena.jpg",
    desc:"1台でみんなと対戦する闘技場。オリジナル陣取り「TAKAGAME」に加え、オセロ・五目並べ・神経衰弱を収録。2〜6人。" },
  { id:"magilink", name:"MagiLink", sub:"つながり・交流", cat:"social", tone:"pink",
    href:"MagiLink/MagiLink.html", img:"thumbs/MagiLink.jpg",
    desc:"魔法のようなメッセージ体験。友達やグループとスタイリッシュにつながるチャットアプリ。コレクション共有にも対応。" },
  { id:"magichainparty", name:"ChainParty", full:"MagiChainParty", sub:"連鎖陣取り", cat:"game", tone:"gold",
    href:"MagiChainParty/index.html", img:"thumbs/MagiChainParty.jpg",
    desc:"2〜5人で囲む連鎖バクハツの陣取り頭脳戦。ルールは「マスをタップ」だけ・運ゼロ。CPU・部屋番号オンライン対戦つき。" },
  { id:"magiranking", name:"Ranking", full:"MagiRanking", sub:"月間ランキング", cat:"social", tone:"gold",
    href:"MagiRanking/index.html", img:"thumbs/MagiRanking.jpg",
    desc:"獲得XEVAの合計を毎月集計して順位を競う月間ランキング。月末の順位に応じて最大1,000 XEVAを配布。" },
  { id:"magicraft", name:"MagiCraft", sub:"3Dクラフト", cat:"game", tone:"teal",
    href:"MagiCraft/index.html", img:"thumbs/MagiCraft.jpg",
    desc:"本格3Dボクセルワールドで掘って・作って・育てて、次元魔神を討つ探索アドベンチャー。" },
  { id:"magijackpot", name:"Jackpot", full:"MagiJackpot", sub:"カジノ・パーティー", cat:"game", tone:"gold",
    href:"MagiJackpot/index.html", img:"thumbs/MagiJackpot.jpg",
    desc:"XEVA とジェムで遊ぶソーシャルカジノ＆パーティー。1人プレイはスロット「Magi Fortune」・ブラックジャック「Royal Blackjack」・パチンコ「Jackpot Rush」の3本。パーティーは1台を2〜6人で囲む「Jackpot Arena」「Grand Roulette Party」。還元率はどれもおよそ100%。" },
  { id:"magimanor", name:"MagiManor", sub:"探索ホラー", cat:"game", tone:"violet",
    href:"MagiManor/index.html", img:"thumbs/MagiManor.jpg",
    desc:"不気味な洋館からの脱出を目指す2D探索ホラーADV。謎解き・追跡者・恐怖ゲージ、6種類の結末。最大4人の共鳴探索も。" },
  { id:"magidiamond", name:"Diamond", full:"MagiDiamond", sub:"読み合い野球盤", cat:"game", tone:"red",
    href:"MagiDiamond/index.html", img:"thumbs/MagiDiamond.jpg",
    desc:"配球と狙いをこっそり決めて同時公開する読み合い野球盤。2〜6人の役割分担、CPU、2台オンライン対戦。" },
  { id:"xevynar", name:"XEVYNAR", sub:"学習AI", cat:"learn", tone:"violet",
    href:"XEVYNAR/index.html", img:"thumbs/XEVYNAR.jpg",
    desc:"XEVARION の学習AI。勉強のプラン・自由なタイマー・記録に加えて、わからない問題の解説、MagiLex の苦手問題づくり、MagiBurst の編成・攻略、XEVARION の各アプリの質問にも答えます。" },
  { id:"magifocus", name:"MagiFocus", sub:"学習管理", cat:"learn", tone:"blue",
    href:"MagiFocus/index.html", img:"thumbs/MagiFocus.jpg",
    desc:"手とスマホを見張るAIで勉強を守る学習管理アプリ。タイムライン・予定カレンダー・実績、XEVA報酬つき。" },
  { id:"magiempire", name:"MagiEmpire", sub:"国盗り対戦", cat:"game", tone:"gold",
    href:"MagiEmpire/MagiEmpire.html", img:"thumbs/MagiEmpire.jpg",
    desc:"1台で2〜4人の国盗り対戦。アクション版「国盗りパックマン」とじっくり陣取りの「ぐんぐん国盗り」を収録。" },
  { id:"magimusic", name:"MagiMusic", sub:"音楽プレイヤー", cat:"info", tone:"violet",
    href:"MagiMusic/MagiMusic.html", img:"thumbs/MagiMusic.jpg",
    desc:"XEVARIONの音楽をいつでもどこでも。回転ディスクとビート連動の演出、バックグラウンド再生対応。" },
  { id:"magiportfolio", name:"Portfolio", full:"MagiPortfolio", sub:"持ち株管理", cat:"info", tone:"blue",
    href:"MagiPortfolio/MagiPortfolio.html", img:"thumbs/MagiPortfolio.jpg",
    desc:"買った株を登録するだけの持ち株マネージャー。取得単価を自動逆引きし、伸び率・評価損益・資産配分を一覧。" },
  { id:"magitier", name:"MagiTier", sub:"Tier表作成", cat:"info", tone:"pink",
    href:"MagiTier/MagiTier.html", img:"thumbs/MagiTier.jpg",
    desc:"Tier表の作成からプレゼンまで。カードを魔法のように並べ替え、あなたのランキングを世界へ発信。" },
  { id:"ordyxis", name:"ORDYXIS", sub:"店頭オーダー", cat:"shop", tone:"red",
    href:"ORDYXIS/index.html", img:"thumbs/Ordyxis.jpg",
    desc:"店頭オンラインオーダーシステム。お客様の端末から注文し、店舗で受付・番号でお呼び出し。ハブ画面から各画面へ。" },
  { id:"ngx", name:"NGX", sub:"公式サイト", cat:"shop", tone:"blue",
    href:"NGX/NGX_website.html", img:"thumbs/NGX.jpg",
    desc:"XEVARION を開発・運営する NGX の公式サイト。最新情報・沿革・会社概要はこちら。" },
  { id:"ishida", name:"ISHIDA", full:"ISHIDA Production", sub:"製作パートナー", cat:"shop", tone:"gold",
    href:"IshidaProduction/index.html", img:"brand/ISHIDA Production.png",
    desc:"XEVARION の製作パートナー ISHIDA Production の公式サイト。" },
  { id:"magicalfuture", name:"M.Future", full:"Magical Future", sub:"技術提携パートナー", cat:"shop", tone:"pink",
    href:"MagicalFuture/index.html", img:"thumbs/MagicalFuture.jpg",
    desc:"NGX と提携して ORDYXIS・MeruHub シリーズを共同開発する Magical Future の公式サイト。提携アプリは起動ロゴに Magical Future が入ります。" }
];

/* ══ サービスを終了したアプリ ══
   保存済みの並び順やブックマークから復活しないよう、ここに id を残しておく。
   XH_APPS からは既に外してあるので、xhApp() は null を返し一覧にも出ない。
   （セーブデータは同期キーに残したままにしてある＝誤って消さない） */
const XH_RETIRED = {
  magiresonance: "MagiResonance",
  magisharecore: "MagiShareCore",
  magitriad: "MagiTriad",
  magimuse: "MagiMuse",
  magifinance: "MagiFinance",
  magisports: "MagiSports",
};
const XH_RETIRED_ON = "2026-07-29";

/* ホームに並ぶ既定の順番（先頭11個 + 「その他」で 4×3 のグリッド）
   ★ MagiPortfolio は「その他」へ移動し、空いた枠に MagiBattle を戻す。
     MagiJackpot は MagiRanking と MagiCraft の間に置く。 */
const XH_DEFAULT_ORDER = [
  "magilex", "magilink", "magiburst", "xevynar",
  "magichainparty", "magiempire", "magibattle", "magiranking",
  "magijackpot", "magicraft", "magimanor",
  /* 以降は「その他」の中に入る */
  "magiportfolio", "ordyxis",
  "magiarena", "magidiamond", "magifocus", "magimusic", "magitier",
  "ngx", "ishida", "magicalfuture",
];
const XH_HOME_SLOTS = 11;
const XH_ORDER_KEY = "xeva_home_order_v2";
/* 並び順の世代。上げると保存済みの並びを一度だけ既定に戻す
   （アプリの入れ替えを、既にホームを触った人にも確実に反映させるため） */
const XH_ORDER_GEN = "4";
const XH_ORDER_GEN_KEY = "xeva_home_order_gen";

/* 期間限定イベント（from/to は YYYY-MM-DD。期間内のものだけ表示）
   ★ 2026-08-12 <b>並びは書いた順ではなく「新着順」</b>にした（xhEventsLive）。
     基準は since（無ければ from）。長く続いている常設イベント（ランキング・
     Nocturne Bloom Fest など）が上に来て、始まったばかりの新しいフェスが
     ずっと後ろ、という状態を防ぐため。
     ＝ 新しいイベントを足すときは<b>この配列のどこに書いてもよい</b>。 */
const XH_EVENTS = [
  /* ★ 2026-08-12 MagiBurst「蒼夏祭（Aoka Summer Fest）」。
     排出キャラは MagiBurst/js/mb-core.js の FESTS.fes4 とそろえること。 */
  { tag:"SUMMER FES", t1:"蒼夏祭", t2:"MagiBurst に水着の限定★5 7体が参戦！ 新リンク・新クロススキル搭載",
    from:"2026-08-12", to:"2026-09-30", since:"2026-08-12",
    /* ★ 2026-08-12 正方形の書き下ろしイラストに差し替え。
       ?v= を付けてあるのは、SW が stale-while-revalidate（古いほうを先に返す）で
       画像を持っているため。付けないと1回目は前の絵のままになる。 */
    href:"MagiBurst/index.html", img:"thumbs/AokaSummerFest.jpg?v=2" },
  /* ★ 2026-08-07 MagiBurst「Phantom Legend Fest」の予告。
     8/10 0:00 の開催をまたぐと、下の xhRenderEvents が t1/t2 を「開催中」に差し替える
     （XH_FES3_OPEN と見くらべるだけなので、当日に書き直す必要はない）。
     排出キャラは MagiBurst/index.html の FESTS.fes3 とそろえること。 */
  { tag:"COMING SOON", t1:"Phantom Legend Fest（予告）",
    t2:"8/10 0:00 スタート。MagiBurst に伝説の限定★5が参戦！",
    liveTag:"LEGEND FES", liveT1:"Phantom Legend Fest",
    liveT2:"MagiBurst に伝説の限定★5「野獣先輩」参戦！ クロススキル搭載",
    openAt:"2026-08-10T00:00",
    from:"2026-08-07", to:"2026-10-31",
    /* ★ 2026-08-08 アイコンは MagiBurst のものにそろえた。
       専用の絵（thumbs/PhantomLegendFest.jpg）は限定キャラが大きく写っていて、
       開催前の予告に出すと伏せている意味がなくなるため。 */
    href:"MagiBurst/index.html", img:"thumbs/MagiBurst.jpg" },
  /* ★ MagiBurst「Luminous Summer Fest」。排出キャラは MagiBurst/index.html の FESTS.fes2 と
     そろえること。 */
  { tag:"SUMMER FES", t1:"Luminous Summer Fest", t2:"MagiBurst に夏の限定★5「カグヤα」「ミオンα」参戦！", from:"2026-07-31", to:"2026-08-31",
    href:"MagiBurst/index.html", img:"thumbs/MagiBurst.jpg" },
  /* ★ MagiJackpot「ゴールドラッシュ」。期間・内容は MagiJackpot/mj-core.js の EVENTS と
     そろえること（片方だけ直すと、ポータルには出ているのに中では終わっている、が起きる）。 */
  { tag:"GOLD RUSH", t1:"ゴールドラッシュ", t2:"MagiJackpot 積立×2！ EP で限定スキン・称号", from:"2026-07-30", to:"2026-08-24",
    href:"MagiJackpot/index.html", img:"thumbs/MagiJackpot.jpg" },
  { tag:"FES", t1:"Nocturne Bloom Fest", t2:"MagiBurst で夜の限定★5 5体が排出中！", from:"2026-01-01", to:"2026-08-31",
    href:"MagiBurst/index.html", img:"thumbs/MagiBurst.jpg" },
  { tag:"COMING SOON", t1:"MagiLex に新コンテンツ", t2:"近日追加予定。続報をお待ちください！", from:"2026-07-31", to:"2026-08-31",
    href:"MagiLex/MagiLex.html", img:"thumbs/MagiLex.jpg" },
  { tag:"CAMPAIGN", t1:"夏の学習キャンペーン", t2:"MagiLex の獲得XEVA ×2！", from:"2026-06-01", to:"2026-08-31",
    href:"MagiLex/MagiLex.html", img:"thumbs/MagiLex.jpg" },
  /* 常設（期間表示なし）: to を空にすると「開催期間」の行を出さない */
  { tag:"RANKING", t1:"月間XEVAランキング", t2:"今月の順位で最大 1,000 XEVA", from:"2026-01-01", to:"",
    perm:true, href:"MagiRanking/index.html", img:"thumbs/MagiRanking.jpg" }
];

const XH_SHOWCASE_MAX = 5;

/* ══════════════ ちいさなユーティリティ ══════════════ */
function xhEl(id) { return document.getElementById(id); }
function xhAcc() { try { return window.XEVA ? window.XEVA.account.get() : null; } catch (e) { return null; } }
function xhOnline() { return navigator.onLine !== false; }
function xhEscape(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function xhApp(id) { return XH_APPS.find((a) => a.id === id) || null; }
/* きょうの日付（YYYY-MM-DD）。
   ★ toISOString() は UTC なので、日本時間の 0:00〜9:00 は「きのう」になってしまう。
     イベントやパックの開始日がその時間帯だけ効かない（＝9時間おくれて始まる）ので、
     期間の判定は必ず端末のローカル日付で行う。sv-SE ロケールは YYYY-MM-DD 形式。 */
function xhToday() { return new Date().toLocaleDateString("sv-SE"); }
/* ★ 2026-08-07 "YYYY-MM-DDThh:mm"（ローカル時刻）で書いた開催日時の判定。
   toISOString は UTC なので使わない（日本では9時間ずれる）。 */
function xhLocalTime(s) {
  const m = String(s || "").match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/);
  if (!m) return 0;
  return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), 0, 0).getTime();
}
function xhBeforeOpen(s) { const t = xhLocalTime(s); return t > 0 && Date.now() < t; }
function xhOpenText(s) {
  const t = xhLocalTime(s); if (!t) return "";
  const d = new Date(t);
  return d.getMonth() + 1 + "月" + d.getDate() + "日 " +
    String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0") + " から開催";
}
function xhFullName(a) { return a ? (a.full || a.name) : ""; }

/* 小さい表示用のキャラ画像（256px JPEG）。無ければ onerror で原寸へ差し戻す。
   ★ 保存済みの charFile は移籍前の古いフォルダのことがあるので、必ず正規化してから組み立てる。 */
function xhCharS(file, charId) {
  const canon = (window.XEVA && window.XEVA.canonCharFile) ? window.XEVA.canonCharFile(file, charId) : String(file || "");
  /* ★ 2026-08-05: MagiBurst のキャラ（"../MagiBurst/img/..."）は、もともと軽いサムネイル。
     拡張子を .jpg に付け替えると .webp のキャラが 404 になるので、そのまま使う。 */
  /* ★ 2026-08-10 キャラ画像は img/ に集約（WebP統一）。"../img/Xxx.webp" の形なら
     "chars_s/" を前に付けても "../" で打ち消されて img/ に解決される。
     小さい表示は t_ 付き（300px）。 */
  if (/^\.\.\/(img|MagiBurst\/img)\//.test(canon)) {
    const th = (window.XEVA && window.XEVA.charThumbFile) ? window.XEVA.charThumbFile(canon)
      : canon.replace(/\/([^/]+)$/, "/t_$1");
    return "chars_s/" + xhEscape(th);
  }
  return "chars_s/" + xhEscape(canon.replace(/\.(png|jpe?g)$/i, "")) + ".jpg";
}
document.addEventListener("error", (e) => {
  const t = e.target;
  if (!t || t.tagName !== "IMG") return;
  const src = t.getAttribute("src") || "";
  if (src.indexOf("chars_s/") !== 0 || t.dataset.xhFallback) return;
  if (src.indexOf("chars_s/../") === 0) return;   // img/ に集約した絵は差し戻し先が無い
  t.dataset.xhFallback = "1";
  t.src = "chars/" + src.slice(8).replace(/\.jpg$/i, ".png");
}, true);

let _xhToastT = null;
function xhToast(msg, ms) {
  const t = xhEl("xhToast"); if (!t) return;
  t.innerHTML = msg; t.classList.add("on");
  clearTimeout(_xhToastT);
  _xhToastT = setTimeout(() => t.classList.remove("on"), ms || 2600);
}
window.xhToast = xhToast;

/* ※ EXP／レベル機能は廃止しました（プロフィールは名前とXEVAのみ）。 */

/* ══════════════ 背景のきらめき ══════════════ */
let _xhStarsRaf = 0;
function xhStartStars() {
  const cv = xhEl("xhStars"); if (!cv) return;
  const ctx = cv.getContext("2d"); if (!ctx) return;
  let W = 0, H = 0, dots = [];
  const dpr = Math.min(devicePixelRatio || 1, 2);
  function resize() {
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.max(1, W * dpr); cv.height = Math.max(1, H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(60, (W * H) / 13000));
    dots = [];
    for (let i = 0; i < n; i++) {
      dots.push({
        x: Math.random() * W, y: Math.random() * H,
        r: Math.random() * 2.6 + 1.2,
        a: Math.random() * 6.28, sp: Math.random() * .009 + .003,
        vy: -(Math.random() * .12 + .04),
        h: ["#ffffff", "#bfe6ff", "#ffd9f0", "#fff0b8"][(Math.random() * 4) | 0]
      });
    }
  }
  function frame() {
    ctx.clearRect(0, 0, W, H);
    for (const s of dots) {
      s.a += s.sp; s.y += s.vy;
      if (s.y < -6) { s.y = H + 6; s.x = Math.random() * W; }
      ctx.globalAlpha = .25 + Math.abs(Math.sin(s.a)) * .55;
      ctx.fillStyle = s.h;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.2832); ctx.fill();
    }
    ctx.globalAlpha = 1;
    _xhStarsRaf = requestAnimationFrame(frame);
  }
  resize();
  addEventListener("resize", resize, { passive: true });
  cancelAnimationFrame(_xhStarsRaf);
  frame();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") cancelAnimationFrame(_xhStarsRaf);
    else { cancelAnimationFrame(_xhStarsRaf); frame(); }
  });
}

/* ══════════════ プロフィール / 通貨 ══════════════ */
function xhRenderProfile() {
  const acc = xhAcc() || {};
  const av = xhEl("xhAv");
  if (av) {
    if (acc.charFile) av.innerHTML = '<img src="' + xhCharS(acc.charFile) + '" alt="">';
    else av.innerHTML = '<span class="xh-av-init">' + xhEscape((acc.name || "?")[0].toUpperCase()) + "</span>";
  }
  const nm = xhEl("xhUserName"); if (nm) nm.textContent = acc.name || "XEVARION";
  const ul = xhEl("xhUidLine");
  if (ul) {
    const n = xhOwnedChars().length;
    ul.textContent = n ? ("キャラクター " + n + "体 所持") : "XEVARION アカウント";
  }
}
function xhRenderXeva() {
  const v = xhEl("xhXeva");
  if (v && window.XEVA) v.textContent = window.XEVA.getBalance().toLocaleString();
  xhRenderGem();
}

/* ── 💎ジェム（XEVARION 共通のプレミアム通貨） ──
   ★ 残高は「読むたびに localStorage から取り直す」こと。
     ここで値をキャッシュすると、クラウド同期が裏で書き戻した直後に
     古い数字を出し続けてしまう（iPhone で「増えない・減らない」に見えていた症状）。 */
let _xhGemShown = null;
function xhGemBal() {
  try { return (window.XEVA && window.XEVA.gem) ? window.XEVA.gem.get() : 0; } catch (e) { return 0; }
}
function xhRenderGem() {
  const v = xhEl("xhGem"); if (!v) return;
  const n = xhGemBal();
  v.textContent = n.toLocaleString();
  if (_xhGemShown != null && _xhGemShown !== n) {
    const pill = v.closest(".xh-pill");
    if (pill) { pill.classList.remove("bump"); void pill.offsetWidth; pill.classList.add("bump"); }
  }
  _xhGemShown = n;
}
window.xhRenderGem = xhRenderGem;

/* ══════════════════════════════════════════════════════════
   💎ジェム変換所 ＆ ジェムショップ（2026-07-30 新設）
   ・XEVA→ジェムの交換は、これまで MagiBurst と MagiJackpot にそれぞれ入口があった。
     ジェムが XEVARION 共通通貨になった以上、入口が散らばっていると
     「どこで交換したのか」「レートは同じなのか」が分からなくなるので、ここ1か所に集約する。
   ・変換所＝<b>実勢の為替レート</b>（ドル円）で交換する。
   ・ショップ＝ひとつにつき一生に1回だけ買える割増パック。購入履歴は
     xeva_shop_v1（クラウド同期・全端末で共有）に記録する。

   ★ 2026-08-03 レートを実際の為替に連動させた
     ジェムは「1💎 ＝ 1 米ドル」、XEVA は「1 XEVA ＝ 1 日本円」と決めた。
     したがって交換レートはそのままドル円になる（1ドル155円 → 💎1 ＝ 155 XEVA）。
     以前の 200 XEVA 固定は「なぜ200なのか」を説明できなかった。
     取得は xeva-fx.js（Yahoo Finance）。取れないときはキャッシュ→既定値と落ちるので、
     オフラインでも交換は止まらない。
     ★ レートは必ず xhGemRate() 越しに読むこと。定数として書き写すと、
       為替が動いた日に「表示は155なのに引かれるのは200」というズレが出る。
   ══════════════════════════════════════════════════════════ */
const XH_GEM_RATE_FALLBACK = 155;        // XevaFX がまだ無いときの保険
function xhGemRate() {
  try { if (window.XevaFX) return window.XevaFX.gemRate(); } catch (e) {}
  return XH_GEM_RATE_FALLBACK;
}
const XH_EX_PRESETS = [1, 5, 25, 100];
const XH_SHOP_KEY = "xeva_shop_v1";

/* お得なパック。gem は「もらえるジェム」、xeva は「支払う XEVA」。
   base（＝通常レートで買える個数）との差ぶんがお得ぶん。
   ★ ticket を持つパックは MagiBurst の 🎫フェス限定ガチャチケットが付く。
     チケットは MagiBurst のセーブの中にしか置き場所がないので、ここでは直接足せない。
     📧メールと同じ「引換券（xeva_mbgift_v1）」に積んで、次に MagiBurst を開いたときに精算させる。
   ★ to を持つパックは期間限定。期間外は一覧に出さない（買い逃しは購入上限とは別の話なので、
     売り切れ扱いにはせず、単に並べない）。

   ★ 2026-08-03 購入上限の作り直し
     ・cycle:"term" … その販売期間ぜんぶで max 回まで（サマーフェスのパック＝2回）
     ・cycle:"week" … 毎週リセット。月曜の朝に買えるようになる（常設パック＝週1回）
     どちらも記録は xeva_shop_v1（クラウド同期）に残るので、端末をまたいでも数え方は同じ。 */
const XH_TICKET_GEM = 5;                 // 🎫1枚＝ジェム5個ぶん（MagiBurst のフェスガチャ1回ぶん）

/* ★ 2026-08-03 価格改定：値段は「XEVA の固定額」ではなく <b>pay（＝支払うジェム数）</b> で持つ。
     実際の XEVA 価格は xhPackXeva() が pay × 為替レート で毎回そのつど出す。
     こうしないと、為替が動いたときにパックだけ旧レート（200固定）のまま取り残されて、
     「変換所より高い（安い）パック」が生まれてしまう。
     お得ぶん（増量率）は pay と中身の比で決まるので、為替が動いても変わらない。 */
const XH_PACKS = [
  /* ── ☀ Luminous Summer Fest 開幕記念（〜8/31・期間中2回まで）── */
  { id:"pk_lsf_starter", ic:"☀️", nm:"サマーフェス スターターパック", pay:15,  gem:5,   ticket:5,  c:"#5ce1ff",
    to:"2026-08-31", cycle:"term", max:2, desc:"Luminous Summer Fest を5回まわせる、はじめの一歩。" },
  { id:"pk_lsf_value",   ic:"🌺", nm:"サマーフェス バリューパック",   pay:75,  gem:50,  ticket:20, c:"#1d8fd8",
    to:"2026-08-31", cycle:"term", max:2, desc:"🎫20枚＋💎50。10連（★5確定）を2回ぶん、たっぷり回せる。" },
  { id:"pk_lsf_legend",  ic:"🏝", nm:"サマーフェス レジェンドパック", pay:200, gem:120, ticket:60, c:"#ffb020",
    to:"2026-08-31", cycle:"term", max:2, desc:"フェス期間中いちばんお得。カグヤα・ミオンαを本気で狙うならこれ。" },
  /* ── 常設（毎週リセット・週1回）── */
  { id:"pk_beginner", ic:"✨", nm:"ビギナーパック",   pay:5,   gem:8,   c:"#3fd9b0", cycle:"week", max:1,
    desc:"はじめての一歩に。まずはここから。" },
  { id:"pk_value",    ic:"💫", nm:"バリューパック",   pay:25,  gem:38,  c:"#4b8bff", cycle:"week", max:1,
    desc:"10連ガチャにちょうど届く、いちばん人気のパック。" },
  { id:"pk_premium",  ic:"🌟", nm:"プレミアムパック", pay:100, gem:160, c:"#9b7bff", cycle:"week", max:1,
    desc:"限定★5をねらうならこの1つ。増量率も大きい。" },
  { id:"pk_legend",   ic:"👑", nm:"レジェンドパック", pay:250, gem:430, c:"#ffb020", cycle:"week", max:1,
    desc:"XEVARION でいちばんお得な、最上位パック。" },
];

/* パックの XEVA 価格。10 XEVA 単位に丸めて値札らしくする。 */
function xhPackXeva(p) {
  return Math.max(10, Math.round(p.pay * xhGemRate() / 10) * 10);
}

/* ── 週のキー（月曜はじまり・ローカル日付）──
   ★ toISOString は UTC なので日本では9時間ずれる。必ずローカルの年月日で作る。 */
function xhWeekKey(d) {
  const t = d ? new Date(d) : new Date();
  const back = (t.getDay() + 6) % 7;                       // 月曜からの経過日数
  const mon = new Date(t.getFullYear(), t.getMonth(), t.getDate() - back);
  return mon.getFullYear() + "-" + String(mon.getMonth() + 1).padStart(2, "0") +
         "-" + String(mon.getDate()).padStart(2, "0");
}
/* 次の月曜（＝週リセットの時刻）までの日数 */
function xhWeekResetIn() { return 7 - ((new Date().getDay() + 6) % 7); }

function xhPackMax(p) { return Math.max(1, p.max || 1); }
function xhPackCycle(p) { return p.cycle === "week" ? "week" : "term"; }
/* いま数えるべき期間のキー。週パックは週ごと、期間限定パックは販売期間ごと。 */
function xhPackPeriod(p) { return xhPackCycle(p) === "week" ? "w" + xhWeekKey() : "t" + (p.to || "all"); }
/* 通常レートなら何個ぶんか＝支払うジェム数そのもの。為替が動いても増量率は変わらない。 */
function xhPackBase(p) { return p.pay; }
/* パックの中身をジェム換算した合計（チケットは XH_TICKET_GEM 個ぶんとして数える） */
function xhPackValue(p) { return p.gem + (p.ticket || 0) * XH_TICKET_GEM; }
function xhPackUp(p) { return Math.round((xhPackValue(p) / xhPackBase(p) - 1) * 100); }
/* 期間内か（to のないパックは常設） */
function xhPackOpen(p) {
  if (!p.to) return true;
  const t = xhToday();
  return (!p.from || p.from <= t) && t <= p.to;
}
function xhPacksNow() { return XH_PACKS.filter(xhPackOpen); }

/* 形: { bought:{id:"YYYY-MM-DD"（旧）}, n:{ id:{p:期間キー, c:回数} } }
   旧形式（bought だけ）のデータは、その日付の期間で1回買ったものとして数え直す。
   こうしておくと、週リセットのパックは次の月曜から普通に買えるようになる。 */
function xhShopData() {
  let d = null;
  try { const r = localStorage.getItem(XH_SHOP_KEY); if (r) d = JSON.parse(r); } catch (e) {}
  if (!d || typeof d !== "object") d = {};
  if (!d.bought || typeof d.bought !== "object") d.bought = {};
  if (!d.n || typeof d.n !== "object") d.n = {};
  /* 旧データの引き継ぎ（1回だけ） */
  XH_PACKS.forEach((p) => {
    if (d.n[p.id] || !d.bought[p.id]) return;
    const at = d.bought[p.id];
    d.n[p.id] = { p: xhPackCycle(p) === "week" ? "w" + xhWeekKey(at) : xhPackPeriod(p), c: 1 };
  });
  return d;
}
function xhShopSave(d) { try { localStorage.setItem(XH_SHOP_KEY, JSON.stringify(d)); } catch (e) {} }
/* いまの期間に何回買ったか */
function xhPackCount(p, d) {
  const rec = (d || xhShopData()).n[p.id];
  if (!rec || rec.p !== xhPackPeriod(p)) return 0;
  return Math.max(0, rec.c | 0);
}
function xhPackLeft(p, d) { return Math.max(0, xhPackMax(p) - xhPackCount(p, d)); }
function xhPackBought(id) {
  const p = XH_PACKS.find((x) => x.id === id);
  return p ? xhPackLeft(p) <= 0 : false;
}
/* まだ買えるパックの数（ホームのバッジに出す） */
function xhPacksLeft() {
  const d = xhShopData();
  return xhPacksNow().reduce((a, p) => a + (xhPackLeft(p, d) > 0 ? 1 : 0), 0);
}
/* ホームの「ジェム変換所」カードに、いまのレートを出す。
   為替が更新されたら開いているシートも描き直す（表示と請求のズレを作らない）。 */
function xhRenderGemRate() {
  const el = xhEl("xhExSub");
  if (el) {
    const live = window.XevaFX ? window.XevaFX.live() : false;
    el.textContent = xhGemRate().toLocaleString() + " XEVA ＝ 💎1" + (live ? "" : "（前回のレート）");
  }
}
window.addEventListener("xevafx:change", () => {
  xhRenderGemRate();
  // 開いているシートだけ描き直す（閉じているものに触ると開いてしまう）
  const ex = xhEl("xhExSheet"), sp = xhEl("xhShopSheet");
  if (ex && ex.classList.contains("open")) xhPaintExchange();
  if (sp && sp.classList.contains("open")) xhPaintShop();
  xhRenderShopBadge();
});

function xhRenderShopBadge() {
  const b = xhEl("xhShopBdg"); if (!b) return;
  const n = xhPacksLeft();
  b.textContent = n ? n : "";
  b.classList.toggle("show", n > 0);
  const s = xhEl("xhShopSub");
  if (s) s.textContent = n ? "毎週リセットのお得なパック" : "今週のパックは買い切りました";
}

/* ── 変換所 ── */
let _xhExQty = 5;
function xhOpenExchange() {
  _xhExQty = 5;
  xhCloseSheet("xhGemSheet");
  xhPaintExchange();
  xhOpenSheet("xhExSheet");
}
window.xhOpenExchange = xhOpenExchange;

function xhExSet(n) { _xhExQty = Math.max(1, Math.min(9999, Math.round(n) || 1)); xhPaintExchange(); }
window.xhExSet = xhExSet;

/* 為替の見出し（レート・前日比・グラフ）。変換所とショップの両方で使う。 */
function xhFxPanel() {
  const FX = window.XevaFX;
  const r = xhGemRate();
  if (!FX) {
    return '<div class="xh-fx"><div class="xh-fxrate"><b>' + r + '</b> XEVA <span>＝ 💎1</span></div></div>';
  }
  const d = FX.delta();
  const rg = FX.chartRange(90);
  const fmtD = (t) => { const x = new Date(t); return (x.getMonth() + 1) + "/" + x.getDate(); };
  const upTx = d
    ? '<span class="xh-fxdl ' + (d.up ? "up" : "dn") + '">' + (d.up ? "▲" : "▼") + " " +
      Math.abs(d.d).toFixed(2) + "（" + (d.up ? "+" : "−") + Math.abs(d.pct).toFixed(2) + "%）</span>"
    : "";
  const stamp = FX.live() && FX.updatedAt()
    ? new Date(FX.updatedAt()).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }) + " 更新"
    : "為替を取得できないため、前回のレートで交換します";
  return '<div class="xh-fx">' +
    '<div class="xh-fxhd"><span class="xh-fxsym">USD/JPY</span>' +
      '<span class="xh-fxstamp">' + stamp + "</span></div>" +
    '<div class="xh-fxrate"><b>' + r.toLocaleString() + '</b> XEVA <span>＝ 💎1</span>' + upTx + "</div>" +
    FX.chartSVG({ days: 90, w: 320, h: 92 }) +
    (rg ? '<div class="xh-fxfoot"><span>' + fmtD(rg.from) + " 〜 " + fmtD(rg.to) + "</span>" +
          "<span>高 " + rg.hi.toFixed(2) + "　安 " + rg.lo.toFixed(2) + "</span></div>" : "") +
  "</div>";
}

function xhPaintExchange() {
  const box = xhEl("xhExBody"); if (!box) return;
  const xeva = window.XEVA ? window.XEVA.getBalance() : 0;
  const gem = xhGemBal();
  const n = _xhExQty;
  const rate = xhGemRate();
  const cost = n * rate;
  const can = xeva >= cost;
  const maxN = Math.floor(xeva / rate);
  box.innerHTML =
    xhFxPanel() +
    '<div class="xh-sortnote">💎ジェムは <b>1個 ＝ 1米ドル</b>、XEVA は <b>1 ＝ 1円</b>。' +
    'だから交換レートは<b>そのときのドル円</b>です（いまは <b>' + rate.toLocaleString() + ' XEVA ＝ 💎1</b>）。' +
    'ジェムは <b>MagiBurst のガチャ</b>や <b>MagiJackpot のベット</b>など、XEVARION 全体で使えます。' +
    'レートは為替に合わせて毎日すこし動きます（もっとお得に買いたいときは、となりの<b>🛒ジェムショップ</b>へ）。</div>' +
    '<div class="xh-exbal">' +
      '<span><img src="XEVA.png" alt="XEVA">' + xeva.toLocaleString() + '</span>' +
      '<span><img src="gem.png" alt="ジェム">' + gem.toLocaleString() + '</span>' +
    '</div>' +
    '<div class="xh-expre">' + XH_EX_PRESETS.map((p) =>
      '<button class="' + (p === n ? "on" : "") + '" onclick="xhExSet(' + p + ')">💎' + p + '</button>').join("") + '</div>' +
    '<div class="xh-exstep">' +
      '<button onclick="xhExSet(' + (n - 1) + ')" ' + (n <= 1 ? "disabled" : "") + ' aria-label="1つ減らす">−</button>' +
      '<span class="xh-exqty"><b>💎' + n.toLocaleString() + '</b><small>交換するジェム</small></span>' +
      '<button onclick="xhExSet(' + (n + 1) + ')" aria-label="1つ増やす">＋</button>' +
    '</div>' +
    '<div class="xh-excost">支払い <b>' + cost.toLocaleString() + '</b> XEVA' +
      (maxN > 0 ? '　／　いまの残高では最大 💎' + maxN.toLocaleString() + ' まで' : "") + '</div>' +
    '<button class="xh-sbtn" ' + (can ? "" : "disabled") + ' onclick="xhDoExchange()">' +
      (can ? "💎 " + n.toLocaleString() + " ジェムに交換する" : "XEVA が足りません") + '</button>' +
    (maxN > n ? '<button class="xh-sbtn ghost" style="margin-top:8px" onclick="xhExSet(' + maxN + ')">上限いっぱい（💎' + maxN.toLocaleString() + '）にする</button>' : "") +
    '<div class="xh-exmsg" id="xhExMsg"></div>';
}

function xhExMsg(t, ok) {
  const m = xhEl("xhExMsg"); if (!m) return;
  m.innerHTML = t; m.style.color = ok ? "#0e8a5c" : "#e0405e";
}

function xhDoExchange() {
  /* ★ レートは「表示したとき」ではなく「押したとき」の値で計算し直す。
     シートを開いたまま為替が更新されると、表示と請求額がずれるため。 */
  const n = _xhExQty, cost = n * xhGemRate();
  if (!window.XEVA || !window.XEVA.gem) { xhExMsg("XEVA ウォレットに接続できません"); return; }
  if (window.XEVA.getBalance() < cost) { xhExMsg("XEVA が足りません（必要 " + cost.toLocaleString() + "）"); return; }
  /* spend が false を返したら残高は動いていない。ジェムは絶対に足さない。 */
  if (!window.XEVA.spend(cost, "ジェム変換所（💎" + n + "）")) { xhExMsg("交換に失敗しました"); return; }
  window.XEVA.gem.add(n, "ジェム変換所（-" + cost + " XEVA）");
  xhRenderXeva();
  xhPaintExchange();
  xhExMsg("💎" + n.toLocaleString() + " に交換しました！（-" + cost.toLocaleString() + " XEVA）", true);
  xhToast('<b>💎' + n.toLocaleString() + " ジェム</b>に交換しました");
}
window.xhDoExchange = xhDoExchange;

/* ── ジェムショップ（1回限りのパック） ── */
function xhOpenShop() { xhPaintShop(); xhOpenSheet("xhShopSheet"); }
window.xhOpenShop = xhOpenShop;

function xhPaintShop() {
  const box = xhEl("xhShopBody"); if (!box) return;
  const xeva = window.XEVA ? window.XEVA.getBalance() : 0;
  const d = xhShopData();
  const rows = xhPacksNow().map((p) => {
    const left = xhPackLeft(p, d), max = xhPackMax(p);
    const sold = left <= 0;
    const weekly = xhPackCycle(p) === "week";
    const tag = sold ? (weekly ? "今週ぶん購入済" : "購入済")
      : weekly ? ("今週あと" + left + "回")
      : ("期間中あと" + left + "/" + max + "回");
    const base = xhPackBase(p), up = xhPackUp(p);
    const price = xhPackXeva(p);
    const poor = xeva < price;
    return '<div class="xh-pack' + (sold ? " sold" : "") + '" style="--pk:' + p.c + '">' +
      '<span class="xh-pkonce">' + tag + '</span>' +
      '<div class="xh-pkic">' + p.ic + '</div>' +
      '<div class="xh-pkbody">' +
        '<div class="xh-pknm">' + xhEscape(p.nm) + '</div>' +
        '<div class="xh-pkgem">' +
          (p.ticket ? '<span class="xh-pkticket">🎫' + p.ticket.toLocaleString() + '</span>' : "") +
          '<img src="gem.png" alt="ジェム">' +
          '<span class="n">' + p.gem.toLocaleString() + '</span>' +
          '<s>通常 ' + base.toLocaleString() + '</s>' +
          '<span class="up">+' + up + '%</span></div>' +
        '<div class="xh-pkdesc">' + xhEscape(p.desc) +
          (p.ticket ? '<br>🎫は <b>MagiBurst のフェス限定ガチャチケット</b>（次に MagiBurst を開いたときに届きます）' : "") +
          (p.to ? '<br><b>' + p.to.replace(/-/g, "/") + ' まで・期間中' + max + '回まで</b>'
                : '<br><b>週' + max + '回まで</b>（毎週月曜にリセット）') + '</div>' +
      '</div>' +
      '<div class="xh-pkbuy">' +
        '<button class="xh-pkbtn" ' + (sold || poor ? "disabled" : "") + ' onclick="xhBuyPack(\'' + p.id + '\')">' +
          (sold ? (weekly ? "また来週" : "購入済") : poor ? "XEVA不足" : "買う") + '</button>' +
        '<span class="xh-pkcost">' + price.toLocaleString() + ' XEVA</span>' +
      '</div>' +
    '</div>';
  }).join("");
  box.innerHTML =
    xhFxPanel() +
    '<div class="xh-sortnote">通常より<b>ずっとお得なレート</b>で💎ジェムを買えるパックです。' +
    '値段は<b>そのときのドル円</b>から決まるので、変換所と同じように毎日すこし動きます' +
    '（お得ぶん＝増量率は為替が動いても変わりません）。<br>' +
    '購入回数はアカウント単位で数えます（買った記録は全端末で共有されます）。<br>' +
    '🗓 <b>常設パックは毎週リセット</b>：週に1回ずつ買えます（次のリセットまであと' + xhWeekResetIn() + '日）。<br>' +
    '☀ <b>Luminous Summer Fest 開幕記念パック</b>は<b>期間中2回まで</b>。' +
    'MagiBurst の🎫<b>フェス限定ガチャチケット</b>が付き、' +
    'チケットは <b>Nocturne Bloom Fest／Luminous Summer Fest のどちらでも</b>使えます。</div>' +
    '<div class="xh-exbal">' +
      '<span><img src="XEVA.png" alt="XEVA">' + xeva.toLocaleString() + '</span>' +
      '<span><img src="gem.png" alt="ジェム">' + xhGemBal().toLocaleString() + '</span>' +
    '</div>' + rows +
    '<div class="xh-exmsg" id="xhShopMsg"></div>' +
    '<button class="xh-sbtn ghost" style="margin-top:6px" onclick="xhCloseSheet(\'xhShopSheet\');xhOpenExchange()">🏪 通常レートの変換所へ</button>';
}

/* パックの中身を1行の文字列にする（確認ダイアログ・完了メッセージで使い回す） */
function xhPackGot(p) {
  const t = [];
  if (p.ticket) t.push("🎫" + p.ticket.toLocaleString() + "枚");
  if (p.gem) t.push("💎" + p.gem.toLocaleString());
  return t.join(" ＋ ");
}

async function xhBuyPack(id) {
  const p = XH_PACKS.find((x) => x.id === id); if (!p) return;
  const msg = xhEl("xhShopMsg");
  const say = (t, ok) => { if (msg) { msg.innerHTML = t; msg.style.color = ok ? "#0e8a5c" : "#e0405e"; } };
  const weekly = xhPackCycle(p) === "week";
  const soldMsg = weekly ? "今週ぶんは購入済みです（毎週月曜にリセットされます）" : "購入できる回数の上限に達しています";
  if (!xhPackOpen(p)) { say("このパックは販売期間が終了しました"); return; }
  if (xhPackLeft(p) <= 0) { say(soldMsg); return; }
  if (!window.XEVA || !window.XEVA.gem) { say("XEVA ウォレットに接続できません"); return; }
  /* ★ 値段は為替から決まるので、ここで一度だけ確定させる（price）。
     ダイアログの表示と実際の請求が食い違わないよう、以降は必ずこの値を使う。
     ダイアログを開いている間にレートが動いていたら、黙って請求せず出し直す。 */
  const price = xhPackXeva(p);
  if (window.XEVA.getBalance() < price) { say("XEVA が足りません（必要 " + price.toLocaleString() + "）"); return; }
  /* ★ 購入の許可は画面内ダイアログで取る（ブラウザの confirm は使わない） */
  const ok = await xhAsk({
    icon: "🛒", title: p.nm, ok: "この内容で購入する", cancel: "やめる",
    /* 🎫入りのパックは「→💎いくつ」だけでは中身を言い表せないので、
       アイコン付きの cost 行は出さずに本文で内訳を書く */
    cost: p.ticket ? null : { from: price.toLocaleString(), to: "×" + p.gem.toLocaleString() },
    body: xhEscape(p.desc) + "<br><br>この操作で <b>" + price.toLocaleString() +
      " XEVA</b> を支払い、<b>" + xhPackGot(p) + "</b> を受け取ります。<br>" +
      (p.ticket ? "🎫<b>フェス限定ガチャチケット</b>は MagiBurst の中でしか使えないので、"
        + "<b>次に MagiBurst を開いたとき</b>にまとめて届きます（受け取りそこねることはありません）。<br>" : "") +
      (weekly
        ? "このパックは<b>週" + xhPackMax(p) + "回まで</b>（毎週月曜にリセット・今週はあと "
          + xhPackLeft(p) + " 回）です。"
        : "このパックは<b>期間中" + xhPackMax(p) + "回まで</b>（あと " + xhPackLeft(p) + " 回）です。"),
  });
  if (!ok) { say("購入をとりやめました"); return; }
  /* もう一度確認する（ダイアログを開いている間に他の端末で買われている／使われている） */
  if (xhPackLeft(p) <= 0) { xhPaintShop(); say(soldMsg); return; }
  /* 為替が動いて値段が変わっていたら、確認した金額と違うので請求しない。
     出し直して、新しい値段で改めて確認してもらう。 */
  if (xhPackXeva(p) !== price) {
    xhPaintShop();
    say("為替が変わったため値段が更新されました。もう一度ご確認ください");
    return;
  }
  if (window.XEVA.getBalance() < price) { xhPaintShop(); say("XEVA が足りません（必要 " + price.toLocaleString() + "）"); return; }
  /* 「購入済みフラグを先に立てる」→「支払う」の順にはしない。
     支払いに失敗したのにフラグだけ残ると、二度と買えなくなってしまう。 */
  if (!window.XEVA.spend(price, "ジェムショップ：" + p.nm)) { say("購入に失敗しました"); return; }
  const d = xhShopData();
  const per = xhPackPeriod(p);
  const rec = (d.n[p.id] && d.n[p.id].p === per) ? d.n[p.id] : { p: per, c: 0 };
  rec.c = (rec.c | 0) + 1;
  d.n[p.id] = rec;
  d.bought[p.id] = xhToday();          // 旧形式も残す（古い版のホームでも「買った」ことは伝わる）
  xhShopSave(d);
  if (p.gem) window.XEVA.gem.add(p.gem, "ジェムショップ：" + p.nm);
  /* 🎫は MagiBurst のセーブにしか置き場所がないので、📧メールと同じ引換券キューに積む。
     ★ 引換券は id 単位で一度きりなので、購入回数まで含めた id にする。
       "shop_パックID" のままだと2回目のチケットが「配布済み」と見なされて消えてしまう。 */
  if (p.ticket && typeof window.pushMbGift === "function") {
    window.pushMbGift("shop_" + p.id + "_" + per + "_" + rec.c, { ticket: p.ticket });
  }
  xhRenderXeva();
  xhRenderShopBadge();
  xhPaintShop();
  const m2 = xhEl("xhShopMsg");
  if (m2) { m2.innerHTML = xhPackGot(p) + " を受け取りました！"; m2.style.color = "#0e8a5c"; }
  xhToast('<b>' + xhEscape(p.nm) + "</b><br>" + xhPackGot(p) + " を受け取りました"
    + (p.ticket ? "<br><small>🎫は次に MagiBurst を開いたときに届きます</small>" : ""));
}
window.xhBuyPack = xhBuyPack;

function xhOpenGemGuide() {
  const bal = xhGemBal();
  const box = xhEl("xhGemWays");
  if (box) {
    box.innerHTML = [
      ["🏪", "ジェム変換所で交換する", "💎1 ＝ 1米ドル、XEVA 1 ＝ 1円。レートは<b>そのときのドル円</b>です（いまは " + xhGemRate().toLocaleString() + " XEVA ＝ 💎1）。ホームの「ジェム変換所」からいつでも交換できます。"],
      ["🛒", "ジェムショップのパック", "通常より 50〜70% 多く💎を受け取れます。常設パックは毎週リセット（週1回）、Luminous Summer Fest の記念パックは期間中2回まで買えて🎫フェスチケットも付きます。"],
      ["⚔️", "クエストの初クリア", "MagiBurst の各クエストは初クリアで💎（毎月1日にリセットされ、また受け取れます）。以降も1日1回のクリアで💎+1がもらえます。"],
      ["🎰", "MagiJackpot で当てる", "ジャックポット・ボーナスゲーム・デイリーミッションの報酬に💎が含まれます。"],
      ["📧", "メールボックス", "アップデート記念やお詫びの配布は、ホーム右上の📧メールから受け取れます。"],
      ["🏆", "実績・ミッション", "各アプリの実績やウィークリーミッションの達成報酬にも💎が入ります。"],
    ].map((r) =>
      '<div class="xh-row" style="cursor:default"><span class="rl"><span class="ri">' + r[0] + "</span>" +
      '<span><span class="rt">' + xhEscape(r[1]) + '</span><span class="rs">' +
      r[2].replace(/💎/g, '<img class="xv-gemico" src="gem.png" alt="ジェム">') + "</span></span></span></div>").join("")
      + '<button class="xh-sbtn" style="margin-top:12px" onclick="xhCloseSheet(\'xhGemSheet\');xhOpenExchange()">🏪 ジェム変換所をひらく</button>'
      + '<button class="xh-sbtn ghost" style="margin-top:8px" onclick="xhCloseSheet(\'xhGemSheet\');xhOpenShop()">🛒 ジェムショップを見る</button>';
  }
  const b = xhEl("xhGemBal"); if (b) b.textContent = bal.toLocaleString();
  xhCloseSheet("xhSetSheet");
  xhOpenSheet("xhGemSheet");
}
window.xhOpenGemGuide = xhOpenGemGuide;

/* ★ 2026-08-12 旧ドック（#xevaDock）を削除しました。
   以前はドックの見えないバッジを写していましたが、いまは xevarion.js が
   #xhMailBdg / #xhNewsBdg / #xhMsnBdg を<b>直接</b>書き換えます。
   写す相手がいなくなったので、この2つは呼ばれても何もしません
   （起動の流れから呼ばれているので、関数そのものは残してあります）。 */
function xhSyncBadges() {}
function xhWatchBadges() {}

/* ══════════════ イベントバナー ══════════════ */
/* 開催中のイベントを<b>新着順（新しいものが先）</b>で返す。
   ★ 並びの基準は since（無ければ from）。同じ日付のものは XH_EVENTS に
     書いた順のまま（安定ソート）。MagiBurst 側の eventsLive() と同じ考えかた。 */
function xhEventsLive() {
  const today = xhToday();
  const key = (e) => e.since || e.from || "";
  return XH_EVENTS
    .filter((e) => e.from <= today && (e.perm || (e.to && today <= e.to)))
    .map((e, i) => ({ e, i }))
    .sort((a, b) => (key(a.e) < key(b.e) ? 1 : key(a.e) > key(b.e) ? -1 : a.i - b.i))
    .map((x) => x.e);
}
let _xhEvIdx = 0, _xhEvList = [], _xhEvTimer = 0;
function xhRenderEvents() {
  _xhEvList = xhEventsLive();
  const track = xhEl("xhEvTrack"), dots = xhEl("xhEvDots");
  if (!track || !dots) return;
  if (!_xhEvList.length) {
    _xhEvList = [{ tag: "INFO", t1: "XEVARION", t2: "アプリを開いて XEVA を集めよう",
                   href: "", img: "thumbs/Xevarion.png", from: "", to: "" }];
  }
  /* ★ 2026-08-07: openAt を書いたイベントは、その日時をまたぐと
     「予告（COMING SOON）」から「開催中」の文面へ自動で切り替わる。
     当日にファイルを書き直さなくてよいようにするための仕組み。 */
  track.innerHTML = _xhEvList.map((e) => {
    const live = e.openAt ? !xhBeforeOpen(e.openAt) : true;
    const tag = live && e.liveTag ? e.liveTag : (e.tag || "EVENT");
    const t1 = live && e.liveT1 ? e.liveT1 : e.t1;
    const t2 = live && e.liveT2 ? e.liveT2 : e.t2;
    return '<div class="xh-ev">' +
      '<div class="evimg"><img src="' + xhEscape(e.img) + '" alt=""></div>' +
      '<div class="evbody">' +
        '<span class="evtag">' + xhEscape(tag) + "</span>" +
        '<div class="evt1">' + xhEscape(t1) + "</div>" +
        '<div class="evt2">' + xhEscape(t2) + "</div>" +
        (e.perm ? '<div class="evt3">開催中（常設）</div>'
                : (!live && e.openAt) ? '<div class="evt3">' + xhEscape(xhOpenText(e.openAt)) + "</div>"
                : e.to ? '<div class="evt3">開催期間 ' + xhEscape(e.from.slice(5).replace("-", "/")) + " 〜 " +
                xhEscape(e.to.slice(5).replace("-", "/")) + "</div>" : "") +
      "</div>" +
    "</div>";
  }).join("");
  dots.innerHTML = _xhEvList.map((_, i) => '<i class="' + (i === 0 ? "on" : "") + '" onclick="xhEvGo(' + i + ')"></i>').join("");
  _xhEvIdx = 0; xhEvGo(0);
  clearInterval(_xhEvTimer);
  if (_xhEvList.length > 1) _xhEvTimer = setInterval(() => xhEvGo(_xhEvIdx + 1), 5400);
}
/* ★★ 2026-08-12 「最後まで進むと先頭に戻らない」の修正。
   帯は transform:translateX(-i*100%) を .42s かけて動かしている。
   末尾（-600% など）から先頭（0%）へ戻すときだけは<b>全部の枚数ぶんを逆走</b>する
   長いアニメーションになり、途中の絵が一気に流れて「戻っていない／固まった」ように見えた。
   ＝ 回りこみ（1枚ぶんを超える移動）のときは<b>アニメーションを切って一瞬で</b>置く。
   ★ transition を外した直後にそのまま戻すと、ブラウザが1フレームにまとめてしまい
     アニメーションが復活してしまうので、必ず次のフレームで戻すこと。 */
function xhEvGo(i) {
  if (!_xhEvList.length) return;
  const prev = _xhEvIdx;
  _xhEvIdx = ((i % _xhEvList.length) + _xhEvList.length) % _xhEvList.length;
  const track = xhEl("xhEvTrack");
  if (track) {
    const wrap = Math.abs(_xhEvIdx - prev) > 1;      /* 端から端への回りこみ */
    if (wrap) track.style.transition = "none";
    track.style.transform = "translateX(" + (-_xhEvIdx * 100) + "%)";
    if (wrap) requestAnimationFrame(() => { track.style.transition = ""; });
  }
  const dots = xhEl("xhEvDots");
  if (dots) [...dots.children].forEach((d, k) => d.classList.toggle("on", k === _xhEvIdx));
}
window.xhEvGo = xhEvGo;
function xhTapEvent() {
  const e = _xhEvList[_xhEvIdx]; if (!e || !e.href) return;
  const app = XH_APPS.find((a) => a.href === e.href);
  xhOpenApp(app ? app.id : "", e.href);
}

/* ══════════════ ホームのアプリ棚 ══════════════ */
function xhOrder() {
  let saved = [];
  /* アプリ構成が変わった世代では、保存済みの並びを一度だけ捨てて既定に戻す。
     そうしないと「ホームを並び替えたことがある人」にだけ新アプリが出てこない。 */
  try {
    if (localStorage.getItem(XH_ORDER_GEN_KEY) !== XH_ORDER_GEN) {
      localStorage.removeItem(XH_ORDER_KEY);
      localStorage.setItem(XH_ORDER_GEN_KEY, XH_ORDER_GEN);
    }
  } catch (e) {}
  try { saved = JSON.parse(localStorage.getItem(XH_ORDER_KEY) || "[]"); } catch (e) {}
  if (!Array.isArray(saved)) saved = [];
  const known = saved.filter((id) => xhApp(id));
  XH_DEFAULT_ORDER.forEach((id) => { if (known.indexOf(id) < 0) known.push(id); });   // 後から増えたアプリを末尾に
  return known;
}
function xhSaveOrder(order) {
  try { localStorage.setItem(XH_ORDER_KEY, JSON.stringify(order)); } catch (e) {}
}

function xhAppTile(a) {
  return '<button class="xh-app" data-app="' + a.id + '" data-tone="' + a.tone + '" ' +
         'onclick="xhOpenApp(\'' + a.id + "','" + a.href + "')\">" +
         '<span class="xh-sq"><img src="' + xhEscape(a.img) + '" alt="" loading="lazy"></span>' +
         '<span class="nm">' + xhEscape(a.name) + "</span>" +
         '<span class="sb">' + xhEscape(a.sub) + "</span></button>";
}
function xhRenderShelf() {
  const grid = xhEl("xhAppGrid"); if (!grid) return;
  const ids = xhOrder().slice(0, XH_HOME_SLOTS);
  grid.innerHTML = ids.map((id) => xhAppTile(xhApp(id))).join("") +
    '<button class="xh-app" data-app="more" data-tone="gold" onclick="xhOpenAppGrid()">' +
      '<span class="xh-sq"><span class="glyph">•••</span></span>' +
      '<span class="nm">その他</span><span class="sb">' + (XH_APPS.length - XH_HOME_SLOTS) + '個</span></button>';
  xhApplyOfflineLocks();
}

/* ══════════════ アプリ一覧シート ══════════════ */
let _xhCat = "all";
function xhOpenAllApps() {
  xhCloseSheet("xhSetSheet");
  const cats = xhEl("xhAppCats");
  if (cats) cats.innerHTML = XH_CATS.map((c) =>
    '<button class="xh-cat' + (c.id === _xhCat ? " on" : "") + '" data-cat="' + c.id + '" ' +
    "onclick=\"xhSetCat('" + c.id + "')\">" + xhEscape(c.label) + "</button>").join("");
  xhPaintAppList();
  xhOpenSheet("xhAppsSheet");
}
window.xhOpenAllApps = xhOpenAllApps;

function xhSetCat(id) {
  _xhCat = id;
  document.querySelectorAll("#xhAppCats .xh-cat").forEach((b) => b.classList.toggle("on", b.dataset.cat === id));
  xhPaintAppList();
}
window.xhSetCat = xhSetCat;

function xhPaintAppList() {
  const box = xhEl("xhAppList"); if (!box) return;
  const q = ((xhEl("xhAppSearch") || {}).value || "").trim().toLowerCase();
  const off = !xhOnline();
  const order = xhOrder();
  let list = order.map(xhApp).filter(Boolean);
  if (_xhCat !== "all") list = list.filter((a) => a.cat === _xhCat);
  if (q) list = list.filter((a) =>
    (a.name + " " + (a.full || "") + " " + a.sub + " " + a.desc).toLowerCase().indexOf(q) >= 0);
  if (!list.length) {
    box.innerHTML = '<div class="xh-empty">該当するアプリが見つかりませんでした。<br>キーワードを変えて探してみてください。</div>';
    return;
  }
  // カテゴリ「すべて」のときは種類ごとに見出しを付ける
  let html = "";
  if (_xhCat === "all" && !q) {
    XH_CATS.filter((c) => c.id !== "all").forEach((c) => {
      const rows = list.filter((a) => a.cat === c.id);
      if (!rows.length) return;
      html += '<div class="xh-catlabel">' + xhEscape(c.label) + "</div>" + rows.map((a) => xhAppRow(a, off)).join("");
    });
  } else {
    html = list.map((a) => xhAppRow(a, off)).join("");
  }
  box.innerHTML = html;
}
window.xhPaintAppList = xhPaintAppList;

function xhAppRow(a, off) {
  const locked = off && !XH_OFFLINE_OK[a.id];
  return '<button class="xh-aitem' + (locked ? " locked" : "") + '" ' +
    'onclick="xhOpenApp(\'' + a.id + "','" + a.href + "')\">" +
    '<span class="ai-ic"><img src="' + xhEscape(a.img) + '" alt="" loading="lazy"></span>' +
    '<span class="ai-bd">' +
      '<span class="ai-nm">' + xhEscape(xhFullName(a)) + "</span>" +
      '<span class="ai-sb">' + xhEscape(a.sub) + "</span>" +
      '<span class="ai-ds">' + xhEscape(a.desc) + "</span>" +
      '<span class="ai-off">📴 オフライン中は開けません</span>' +
    "</span>" +
    '<span class="ai-go">›</span></button>';
}

/* ══════════════ 「その他」＝ホームと同じ見た目のアプリ一覧（グリッド） ══════════════ */
function xhOpenAppGrid() {
  xhCloseSheet("xhSetSheet");
  xhPaintAppGrid();
  xhOpenSheet("xhGridSheet");
}
window.xhOpenAppGrid = xhOpenAppGrid;

function xhPaintAppGrid() {
  const box = xhEl("xhGridBody"); if (!box) return;
  const order = xhOrder();
  const home = order.slice(0, XH_HOME_SLOTS);
  const rest = order.slice(XH_HOME_SLOTS);
  const sec = (label, ids) => ids.length
    ? '<div class="xh-catlabel">' + xhEscape(label) + "</div>" +
      '<div class="xh-grid sheet">' + ids.map((id) => xhAppTile(xhApp(id))).filter(Boolean).join("") + "</div>"
    : "";
  box.innerHTML = sec("ホームに表示中", home) + sec("その他のアプリ", rest);
  xhApplyOfflineLocks();
}
window.xhPaintAppGrid = xhPaintAppGrid;

/* ══════════════ 並び替えシート ══════════════ */
let _xhSortOrder = [];
function xhOpenSort() {
  xhCloseSheet("xhSetSheet");
  _xhSortOrder = xhOrder();
  xhPaintSort();
  xhOpenSheet("xhSortSheet");
}
window.xhOpenSort = xhOpenSort;

function xhPaintSort() {
  const box = xhEl("xhSortList"); if (!box) return;
  box.innerHTML = _xhSortOrder.map((id, i) => {
    const a = xhApp(id); if (!a) return "";
    return '<div class="xh-sortrow' + (i < XH_HOME_SLOTS ? " home" : "") + '" data-i="' + i + '">' +
      '<span class="sgrip" onpointerdown="xhDragStart(event,' + i + ')" aria-label="ドラッグして並べ替え">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h16M4 12h16M4 16h16" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/></svg>' +
      "</span>" +
      '<span class="sn">' + (i + 1) + "</span>" +
      '<span class="si"><img src="' + xhEscape(a.img) + '" alt="" loading="lazy"></span>' +
      '<span class="st">' + xhEscape(xhFullName(a)) + "</span>" +
      '<span class="sb2">' +
        '<button onclick="xhSortMove(' + i + ',-1)"' + (i === 0 ? " disabled" : "") + ' aria-label="上へ">▲</button>' +
        '<button onclick="xhSortMove(' + i + ',1)"' + (i === _xhSortOrder.length - 1 ? " disabled" : "") + ' aria-label="下へ">▼</button>' +
      "</span></div>";
  }).join("");
}

/* ══ ドラッグ（スライド）で並べ替え ══
   ・行そのものは作り直さず、CSS transform でずらして見せる。
     ドラッグ中に再描画すると掴んでいる要素が消えてポインタが外れるため。
   ・確定は指を離したときに1回だけ（配列を動かして再描画）。 */
let _dgFrom = -1, _dgTo = -1, _dgY0 = 0, _dgEl = null, _dgRows = [], _dgH = 0;
function xhDragStart(ev, i) {
  const box = xhEl("xhSortList"); if (!box) return;
  _dgRows = [...box.querySelectorAll(".xh-sortrow")];
  _dgEl = _dgRows[i]; if (!_dgEl) return;
  const r = _dgEl.getBoundingClientRect();
  _dgH = r.height + 7;                       // 行の高さ + gap
  _dgFrom = _dgTo = i; _dgY0 = ev.clientY;
  _dgEl.classList.add("drag");
  document.body.classList.add("xh-dragging");
  try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch (e) {}
  document.addEventListener("pointermove", xhDragMove, { passive: false });
  document.addEventListener("pointerup", xhDragEnd, { once: true });
  document.addEventListener("pointercancel", xhDragEnd, { once: true });
  ev.preventDefault();
}
window.xhDragStart = xhDragStart;

function xhDragMove(ev) {
  if (_dgFrom < 0) return;
  ev.preventDefault();
  const dy = ev.clientY - _dgY0;
  _dgEl.style.transform = "translateY(" + dy + "px)";
  let j = Math.round(_dgFrom + dy / _dgH);
  j = Math.max(0, Math.min(_dgRows.length - 1, j));
  if (j === _dgTo) return;
  _dgTo = j;
  _dgRows.forEach((row, k) => {
    if (row === _dgEl) return;
    let off = 0;
    if (_dgFrom < j && k > _dgFrom && k <= j) off = -_dgH;
    else if (_dgFrom > j && k >= j && k < _dgFrom) off = _dgH;
    row.style.transform = off ? "translateY(" + off + "px)" : "";
  });
}

function xhDragEnd() {
  document.removeEventListener("pointermove", xhDragMove);
  document.body.classList.remove("xh-dragging");
  if (_dgFrom < 0) return;
  const from = _dgFrom, to = _dgTo;
  _dgRows.forEach((r) => { r.style.transform = ""; r.classList.remove("drag"); });
  _dgFrom = _dgTo = -1; _dgEl = null; _dgRows = [];
  if (from !== to) {
    const t = _xhSortOrder.splice(from, 1)[0];
    _xhSortOrder.splice(to, 0, t);
  }
  xhPaintSort();
}
function xhSortMove(i, d) {
  const j = i + d;
  if (j < 0 || j >= _xhSortOrder.length) return;
  const t = _xhSortOrder[i]; _xhSortOrder[i] = _xhSortOrder[j]; _xhSortOrder[j] = t;
  xhPaintSort();
}
window.xhSortMove = xhSortMove;
function xhSaveSort() {
  xhSaveOrder(_xhSortOrder);
  xhRenderShelf();
  xhCloseSheet("xhSortSheet");
  xhToast("アプリの並び順を保存しました");
}
window.xhSaveSort = xhSaveSort;
function xhResetSort() {
  _xhSortOrder = XH_DEFAULT_ORDER.slice();
  xhPaintSort();
  xhToast("初期の並びに戻しました（保存で確定）");
}
window.xhResetSort = xhResetSort;

/* ══════════════ オフライン制御 ══════════════ */
function xhApplyOfflineLocks() {
  const off = !xhOnline();
  document.body.classList.toggle("xh-off", off);
  document.querySelectorAll(".xh-app").forEach((el) => {
    const id = el.dataset.app;
    el.classList.toggle("locked", off && id !== "more" && !XH_OFFLINE_OK[id]);
  });
  document.querySelectorAll(".xh-ntab").forEach((el) => {
    const t = el.dataset.tab;
    el.disabled = off && (t === "gacha" || t === "community");
  });
  const st = xhEl("xhOfflineState");
  if (st) st.textContent = off ? "オフライン中" : "›";
  if (xhEl("xhAppsSheet") && xhEl("xhAppsSheet").classList.contains("on")) xhPaintAppList();
}
function xhOpenApp(id, href) {
  if (!xhOnline() && !XH_OFFLINE_OK[id]) {
    xhToast("📴 オフライン中は開けません<br><span style='font-size:11px;font-weight:700;color:#6f82ad'>" +
            "MagiLex ／ MagiBurst ／ MagiChainParty ／ XEVYNAR ／ MagiJackpot は遊べます</span>", 3200);
    return;
  }
  location.href = href;
}
window.xhOpenApp = xhOpenApp;

/* ══════════════ タブ ══════════════ */
function xhGo(tab) {
  if (tab === "home") { const s = xhEl("xhScroll"); if (s) s.scrollTo({ top: 0, behavior: "smooth" }); return; }
  if (!xhOnline() && (tab === "gacha" || tab === "community")) {
    xhToast("📴 オフライン中は " + (tab === "gacha" ? "ガチャ" : "コミュニティ") + " を開けません", 2800);
    return;
  }
  if (tab === "settings") { xhOpenSettings(); return; }
  if (tab === "chars")     { location.href = "characters.html"; return; }
  if (tab === "gacha")     { location.href = "gacha.html"; return; }
  if (tab === "community") { location.href = "community.html"; return; }
}
window.xhGo = xhGo;

/* ══════════════ 既存モーダルへの橋渡し ══════════════ */
function xhTapMail()    { if (typeof openMail === "function") openMail(); }
function xhTapNews()    { if (typeof openNews === "function") openNews(); }
function xhTapMission() { if (typeof openMissions === "function") openMissions(); }
/* ══ XEVAの入手方法（★ 2026-08-03: ジェムと同じ「一覧シート」にそろえた）══
   以前はスライドショー（openHowto）だけで、ジェムのシートと見た目も情報量もそろっておらず、
   内容も古いままだった（廃止した機能や、いまと違う金額が載っていた）。
   ここではジェムと同じ xh-row の一覧で、いまの獲得手段をそのまま並べる。 */
function xhOpenXevaGuide() {
  const bal = window.XEVA ? window.XEVA.getBalance() : 0;
  const b = xhEl("xhXevaBal"); if (b) b.textContent = bal.toLocaleString();
  const box = xhEl("xhXevaWays");
  if (box) {
    box.innerHTML = [
      ["📅", "毎日のログインボーナス", "XEVARION を開くだけで受け取れます。1〜5日目は +50、6日目 +100、7日目 +150。連続でつづくほどお得です。"],
      ["🏅", "ログイン日数のマイルストーン", "通算10日ごとに +100（100日ごとは +500）。ホームの「ログインボーナス」から受け取れます。"],
      ["🎯", "スターターミッション", "各アプリを1回さわると達成。1件あたり +150〜200。ホームの🎯ミッションから受け取ります。"],
      ["📚", "MagiLex で学習する", "デイリー学習 +50、セクション完全習得 +600、ミックステストは90%以上で +50／100%で +150。50問で2倍・100問で3倍のボリュームボーナスもあります。"],
      ["💥", "MagiBurst のクエスト", "クリア報酬のほか、月間WAVE踏破のマイルストーンでもXEVAが入ります（WAVE踏破数は毎月1日にリセットされ、また積み直せます）。"],
      ["🎰", "MagiJackpot で増やす", "スロット・ブラックジャック・パチンコ・パーティーゲーム。還元率はおよそ100%（日替わりで 98%±2%）です。"],
      ["🔗", "MagiChainParty の賞金", "対戦の結果に応じてXEVAが賞金として届きます。ポータルを開いたときにまとめて受け取れます。"],
      ["🏆", "MagiRanking の順位賞金", "月間XEVA獲得ランキングの上位に賞金。1位 1,000／2位 500／3位 200／4位以降 100。翌月の初回起動時に届きます。"],
      ["📧", "メール・キャンペーン", "アップデート記念やお詫びの配布は、ホーム右上の📧メールから。CDK（コード）の入力もここです。"],
      ["🎂", "誕生日ボーナス", "アカウントに登録した誕生日に、その日だけの特別なXEVAが届きます。"],
    ].map((r) =>
      '<div class="xh-row" style="cursor:default"><span class="rl"><span class="ri">' + r[0] + "</span>" +
      '<span><span class="rt">' + xhEscape(r[1]) + '</span><span class="rs">' + r[2] + "</span></span></span></div>").join("")
      + '<div class="xh-sortnote" style="margin-top:12px">貯めた XEVA は <b>XEVAガチャ</b>、<b>💎ジェムへの交換</b>（' + xhGemRate().toLocaleString() + ' XEVA ＝ 💎1・ドル円連動）、'
      + '<b>🛒ジェムショップのパック</b>、各アプリのベットや強化に使えます。</div>'
      + '<button class="xh-sbtn" style="margin-top:12px" onclick="xhCloseSheet(\'xhXevaSheet\');xhTapMission()">🎯 ミッションを見る</button>'
      + '<button class="xh-sbtn ghost" style="margin-top:8px" onclick="xhCloseSheet(\'xhXevaSheet\');xhOpenExchange()">🏪 ジェム変換所をひらく</button>';
  }
  xhCloseSheet("xhSetSheet");
  xhOpenSheet("xhXevaSheet");
}
window.xhTapMail = xhTapMail; window.xhTapNews = xhTapNews;
window.xhTapMission = xhTapMission; window.xhOpenXevaGuide = xhOpenXevaGuide;

/* ══════════════ シート ══════════════ */
/* ══ シートの高さを「いま実際に見えている高さ」に合わせる（iPhone対策） ══
   iOS の 100vh は URLバーが引っ込んだ状態の高さで、実際の表示領域より大きい。
   さらにキーボードが出ると表示領域はもっと縮む。
   その状態でシート（下ぞろえ）が器より高くなると、はみ出すのは上側＝
   ✕ ボタンのあるヘッダーが画面の外に出て押せなくなる。
   visualViewport の実測値を CSS 変数 --xh-vph に流し込み、
   CSS 側の max-height:100% と組み合わせて、必ず画面内に収まるようにする。 */
function xhSyncViewportH() {
  const vv = window.visualViewport;
  if (!vv) return;                                  // 非対応環境は CSS の dvh に任せる
  /* キーボードで押し上げられた分（offsetTop）も引いて、見えている範囲だけを器にする */
  const h = Math.max(240, Math.round(vv.height));
  document.documentElement.style.setProperty("--xh-vph", h + "px");
}
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", xhSyncViewportH);
  window.visualViewport.addEventListener("scroll", xhSyncViewportH);
  window.addEventListener("orientationchange", () => setTimeout(xhSyncViewportH, 250));
  xhSyncViewportH();
}

/* ══ 全画面の土台の高さを実測して --xh-appvh に流す（iPhone のアプリ表示対策） ══
   ホーム画面から「アプリとして」開くと、下に空白の帯ができて画面の下部が
   詰まって見えることがある。

   ★ 2026-08-03 の作り直し：innerHeight はあてにならない
     iOS の standalone は起動直後の innerHeight が「セーフエリアを引いた高さ」で
     返ることがあり、しかもそのあと resize が飛ばない。その値で土台を固定すると、
     ホームバーぶんだけ短いまま＝直したかった空白がそのまま残る。
     そこで「position:fixed; top:0; bottom:0 の要素が実際に何pxになるか」を測る。
     これは画面をおおうときにブラウザが本当に使う高さそのものなので、standalone でも
     Safari でもズレない。測れないときだけ innerHeight に落ちる。
   ★ visualViewport は使わない（キーボードで縮み、入力のたびにホームが縮むため）。
   ★ さらに #xhome 自体も inset:0（top/bottom を両方 0）で組んであるので、
     この変数がうまく出せない環境でも下に空白は残らない。 */
let _xhVhProbe = null;
function xhSyncAppH() {
  const host = document.body || document.documentElement;
  if (host && !(_xhVhProbe && _xhVhProbe.parentNode)) {
    _xhVhProbe = document.createElement("div");
    _xhVhProbe.setAttribute("aria-hidden", "true");
    _xhVhProbe.style.cssText =
      "position:fixed;top:0;bottom:0;left:0;width:0;margin:0;padding:0;border:0;" +
      "visibility:hidden;pointer-events:none;z-index:-2147483000";
    host.appendChild(_xhVhProbe);
  }
  let h = 0;
  if (_xhVhProbe) { try { h = Math.round(_xhVhProbe.getBoundingClientRect().height); } catch (e) { h = 0; } }
  if (h <= 200) h = Math.round(window.innerHeight || 0);
  if (h > 200) document.documentElement.style.setProperty("--xh-appvh", h + "px");
}
window.addEventListener("resize", xhSyncAppH);
window.addEventListener("orientationchange", () => setTimeout(xhSyncAppH, 250));
window.addEventListener("pageshow", xhSyncAppH);
document.addEventListener("DOMContentLoaded", xhSyncAppH);
[0, 60, 200, 600, 1200, 2500].forEach((ms) => setTimeout(xhSyncAppH, ms));
xhSyncAppH();

/* ══════════════ 画面内の確認ダイアログ ══════════════
   ブラウザの confirm() の置き換え。await xhAsk({...}) が true / false を返す。
   ★ 購入のように「押した瞬間に XEVA が減る」操作の許可は、必ずこれで取る。
     confirm() だと PWA でURLバーが割り込むうえ、iOS で
     「追加のダイアログを表示しない」を選ばれると以降ずっと false になり、
     ユーザーは理由もわからず買えなくなってしまう。 */
function xhAsk(o) {
  o = o || {};
  return new Promise((res) => {
    const ov = xhEl("xhAsk"), card = xhEl("xhAskCard");
    if (!ov || !card) { res(false); return; }          /* ダイアログが無い版では黙って中止 */
    const cost = o.cost
      ? '<div class="xh-ask-cost">' +
          '<span class="c"><img src="' + xhEscape(o.cost.fromIc || "XEVA.png") + '" alt="">' +
            xhEscape(o.cost.from) + "</span>" +
          '<span class="ar">→</span>' +
          '<span class="c"><img src="' + xhEscape(o.cost.toIc || "gem.png") + '" alt="">' +
            xhEscape(o.cost.to) + "</span></div>"
      : "";
    card.innerHTML =
      '<div class="xh-ask-ic">' + (o.icon || "❓") + "</div>" +
      '<div class="xh-ask-t">' + xhEscape(o.title || "確認") + "</div>" +
      (o.body ? '<div class="xh-ask-b">' + o.body + "</div>" : "") +
      cost +
      '<div class="xh-ask-btns">' +
        '<button class="xh-sbtn" data-v="1">' + xhEscape(o.ok || "はい") + "</button>" +
        '<button class="xh-sbtn ghost" data-v="0">' + xhEscape(o.cancel || "やめる") + "</button>" +
      "</div>";
    const done = (v) => { ov.classList.remove("on"); ov.onclick = null; res(v); };
    card.querySelectorAll("[data-v]").forEach((b) => { b.onclick = () => done(b.dataset.v === "1"); });
    ov.onclick = (e) => { if (e.target === ov) done(false); };   /* 外側タップ＝キャンセル */
    xhSyncViewportH();
    ov.classList.add("on");
  });
}
window.xhAsk = xhAsk;

function xhOpenSheet(id) { const s = xhEl(id); if (s) { xhSyncViewportH(); s.classList.add("on"); } }
function xhCloseSheet(id) { const s = xhEl(id); if (s) s.classList.remove("on"); }
window.xhCloseSheet = xhCloseSheet;

function xhOpenSettings() {
  const acc = xhAcc() || {};
  const sub = xhEl("xhSetAccSub"); if (sub) sub.textContent = acc.name || "名前・アイコン・パスワード";
  const n = xhEl("xhSetShowN"); if (n) n.textContent = (Array.isArray(acc.showcase) ? acc.showcase.length : 0) + "体";
  const swM = xhEl("xhSwMusic");
  if (swM) swM.classList.toggle("on", localStorage.getItem("xeva_music_v1") !== "off");
  const ist = xhEl("xhInstallSub");
  if (ist) ist.textContent = xhIsInstalled() ? "インストール済み — オフラインでも起動できます"
                                             : "ホーム画面に追加してアプリとして使う";
  xhOpenSheet("xhSetSheet");
}
window.xhOpenSettings = xhOpenSettings;

function xhToggleMusic() {
  if (typeof xevaToggleMusic === "function") xevaToggleMusic();
  const sw = xhEl("xhSwMusic");
  if (sw) sw.classList.toggle("on", localStorage.getItem("xeva_music_v1") !== "off");
}
window.xhToggleMusic = xhToggleMusic;

function xhLogout() {
  if (typeof xevaLogout === "function") { xhCloseSheet("xhSetSheet"); xevaLogout(); }
}
window.xhLogout = xhLogout;

/* ── 管理画面（アクセスコード） ── */
function xhOpenAdmin() {
  xhCloseSheet("xhSetSheet");
  const inp = xhEl("xhAdminCode"), msg = xhEl("xhAdminMsg");
  if (inp) inp.value = "";
  if (msg) msg.textContent = "";
  xhOpenSheet("xhAdminSheet");
  setTimeout(() => { try { xhEl("xhAdminCode").focus(); } catch (e) {} }, 220);
}
window.xhOpenAdmin = xhOpenAdmin;
/* コードの照合は admin.html 側（SHA-256）が行う。ここでは入力を引き継ぐだけ。 */
function xhAdminEnter() {
  const inp = xhEl("xhAdminCode"), msg = xhEl("xhAdminMsg");
  const code = (inp && inp.value || "").trim();
  if (!code) { if (msg) msg.textContent = "アクセスコードを入力してください"; return; }
  try { sessionStorage.setItem("xeva_admin_code", code); } catch (e) {}
  location.href = "admin.html";
}
window.xhAdminEnter = xhAdminEnter;

/* ══════════════ 【一時】画面の測定値（下バーの位置しらべ） ══════════════
   ★ 2026-08-12c iPhone で下のタブバーが画面の下端より高い位置で止まる件の調査用。
   手元（PC・Chrome）では正しい位置に来るので、端末で実際に何ピクセルなのかを見る。
   ・数字だけでなく<b>目印の線</b>も引く。どの線が本当の画面の下端に重なっているかが
     スクリーンショット1枚で分かる。
       赤   … position:fixed; bottom:0 の下端（レイアウトビューポートの下端）
       青   … 赤から env(safe-area-inset-bottom) ぶん上（ホームバーの帯の上端＝目標）
       橙   … visualViewport の下端
       緑   … いまのタブボタンの下端
   原因が分かったら、この関数と設定タブの行ごと削除すること。 */
function xhBarInfo() {
  xhCloseSheet("xhSetSheet");
  const id = "xhBarInfoOv";
  const old = document.getElementById(id); if (old) old.remove();

  /* env(safe-area-inset-*) の実測用（CSS の env() は JS から読めない） */
  const mk = (css) => { const d = document.createElement("div"); d.style.cssText = css; document.body.appendChild(d); return d; };
  const pEnv = mk("position:fixed;left:0;bottom:0;width:0;height:0;margin:0;border:0;box-sizing:content-box;" +
    "padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px) 0;visibility:hidden;pointer-events:none");
  const pBox = mk("position:fixed;top:0;bottom:0;left:0;width:0;margin:0;padding:0;border:0;visibility:hidden;pointer-events:none");
  const rEnv = pEnv.getBoundingClientRect(), rBox = pBox.getBoundingClientRect();
  const envT = parseFloat(getComputedStyle(pEnv).paddingTop) || 0;
  const envB = parseFloat(getComputedStyle(pEnv).paddingBottom) || 0;
  const fixBottom = rEnv.bottom;           // ← position:fixed;bottom:0 が着く場所
  const box = rBox.height;
  pEnv.remove(); pBox.remove();

  const vv = window.visualViewport;
  const visBottom = vv ? (vv.offsetTop || 0) + vv.height : 0;
  const bar = document.querySelector("#xhome .xh-bar");
  const btn = document.querySelector("#xhome .xh-ntab");
  const rBtn = btn ? btn.getBoundingClientRect() : { bottom: 0, top: 0 };
  const rBar = bar ? bar.getBoundingClientRect() : { bottom: 0, top: 0 };
  const cs = getComputedStyle(document.documentElement);
  const r1 = (n) => Math.round(n * 10) / 10;

  const rows = [
    ["screen", screen.width + " × " + screen.height + "  dpr " + window.devicePixelRatio],
    ["window", window.innerWidth + " × " + window.innerHeight],
    ["箱(fixed top0/bottom0)", r1(box)],
    ["fixed bottom:0 の下端 🔴", r1(fixBottom)],
    ["visualViewport 下端 🟠", r1(visBottom) + "  (h " + r1(vv ? vv.height : 0) + " / offTop " + r1(vv ? vv.offsetTop : 0) + " / scale " + (vv ? vv.scale : "-") + ")"],
    ["env 上 / 下", r1(envT) + " / " + r1(envB)],
    ["画面 − 箱（下の死角）", r1(Math.max(screen.width, screen.height) - box)],
    ["目標 🔵", r1(fixBottom - Math.max(0, envB - Math.max(0, Math.max(screen.width, screen.height) - box)) - 4)],
    ["タブボタン下端 🟢", r1(rBtn.bottom) + "  (上 " + r1(rBtn.top) + ")"],
    ["バー 上端 / 下端", r1(rBar.top) + " / " + r1(rBar.bottom)],
    ["--xh-fixgap", (document.documentElement.style.getPropertyValue("--xh-fixgap") || "(未設定)")],
    ["--xh-barpad", (document.documentElement.style.getPropertyValue("--xh-barpad") || "(未設定)") + " / 実効 " + r1(parseFloat(getComputedStyle(bar).paddingBottom) - (parseFloat(cs.getPropertyValue("--xh-dockover")) || 0))],
    ["standalone", (matchMedia("(display-mode: standalone)").matches ? "yes" : "no") + " / navigator " + (navigator.standalone ? "yes" : "no")]
  ];

  const line = (y, color, label) =>
    '<div style="position:fixed;left:0;right:0;top:' + (y - 1) + 'px;height:2px;background:' + color + ';z-index:2">' +
    '<span style="position:absolute;right:2px;bottom:2px;font-size:9px;font-weight:900;color:' + color + '">' + label + "</span></div>";

  const ov = document.createElement("div");
  ov.id = id;
  ov.style.cssText = "position:fixed;inset:0;z-index:2147483600;background:rgba(255,255,255,.72);" +
    "font-family:'Noto Sans JP',sans-serif;-webkit-tap-highlight-color:transparent";
  const wantB = Math.max(0, envB - Math.max(0, Math.max(screen.width, screen.height) - box)) + 4;
  ov.innerHTML =
    line(fixBottom, "#e01b3c", "🔴 fixed bottom:0") +
    line(fixBottom - wantB, "#1163e8", "🔵 目標") +
    line(visBottom, "#f08800", "🟠 visualViewport") +
    line(rBtn.bottom, "#0a9e52", "🟢 タブ下端") +
    '<div style="position:absolute;left:8px;right:8px;top:calc(env(safe-area-inset-top,0px) + 46px);' +
    'background:#fff;border:2px solid #4b8bff;border-radius:14px;padding:10px 12px;font-size:11px;line-height:1.75;color:#22344d">' +
    '<div style="font-weight:900;font-size:12.5px;margin-bottom:6px">画面の測定値（この画面をスクショして送ってください）</div>' +
    rows.map((r) => '<div style="display:flex;gap:8px"><span style="flex:0 0 42%;color:#6f82ad;font-weight:800">' +
      r[0] + '</span><span style="font-weight:800;font-variant-numeric:tabular-nums">' + r[1] + "</span></div>").join("") +
    '<div style="margin-top:8px;font-size:10px;color:#6f82ad">🟢 が 🔵 に重なっていれば正しい位置です。</div>' +
    '<button style="margin-top:8px;width:100%;padding:9px;border:none;border-radius:11px;background:#4b8bff;color:#fff;' +
    'font-weight:900;font-size:12px" onclick="document.getElementById(\'' + id + '\').remove()">閉じる</button></div>';
  document.body.appendChild(ov);
}
window.xhBarInfo = xhBarInfo;

/* ── お気に入りキャラ（最大5体） ── */
function xhOwnedChars() {
  let owned = {};
  try { owned = (JSON.parse(localStorage.getItem("xeva_gacha_v1") || "{}") || {}).owned || {}; } catch (e) {}
  const master = (window.XEVA && window.XEVA.CHARS) || [];
  const acc = xhAcc() || {};
  return master.filter((c) => owned[c.id] || c.id === acc.charId);
}
let _xhPick = [];
function xhOpenShowcase() {
  xhCloseSheet("xhSetSheet");
  const acc = xhAcc() || {};
  _xhPick = (Array.isArray(acc.showcase) ? acc.showcase.slice(0, XH_SHOWCASE_MAX) : []);
  if (!_xhPick.length && acc.charId) _xhPick = [acc.charId];
  xhPaintShowGrid();
  xhOpenSheet("xhShowSheet");
}
window.xhOpenShowcase = xhOpenShowcase;

function xhPaintShowGrid() {
  const g = xhEl("xhShowGrid"); if (!g) return;
  const owned = xhOwnedChars();
  if (!owned.length) {
    g.innerHTML = '<div class="xh-empty" style="grid-column:1/-1">まだキャラクターを持っていません。<br>ガチャを引いて仲間を集めよう！</div>';
  } else {
    g.innerHTML = owned.map((c) => {
      const i = _xhPick.indexOf(c.id);
      return '<button class="xh-cpick' + (i >= 0 ? " sel" : "") + '" onclick="xhTogglePick(\'' + c.id + '\')">' +
        '<img src="' + xhCharS(c.file) + '" alt="" loading="lazy">' +
        '<span class="ord">' + (i >= 0 ? i + 1 : "") + "</span>" +
        '<span class="cn">' + xhEscape(c.name) + "</span></button>";
    }).join("");
  }
  const hint = xhEl("xhShowHint");
  if (hint) hint.textContent = _xhPick.length + " / " + XH_SHOWCASE_MAX + " 選択中";
}
function xhTogglePick(id) {
  const i = _xhPick.indexOf(id);
  if (i >= 0) _xhPick.splice(i, 1);
  else if (_xhPick.length >= XH_SHOWCASE_MAX) { xhToast("最大 " + XH_SHOWCASE_MAX + " 体までです"); return; }
  else _xhPick.push(id);
  xhPaintShowGrid();
}
window.xhTogglePick = xhTogglePick;

function xhSaveShowcase() {
  const acc = xhAcc(); if (!acc) return;
  acc.showcase = _xhPick.slice(0, XH_SHOWCASE_MAX);
  try { window.XEVA.account.save(acc); } catch (e) {}
  try { if (window.XEVASync) window.XEVASync.syncProfile(acc); } catch (e) {}
  try { if (typeof renderShowcaseSlots === "function") renderShowcaseSlots(); } catch (e) {}
  xhCloseSheet("xhShowSheet");
  xhToast(_xhPick.length ? "お気に入りキャラを設定しました" : "お気に入りキャラを解除しました");
}
window.xhSaveShowcase = xhSaveShowcase;

/* ── オフライン設定 ── */
function xhOpenOfflineInfo() {
  xhCloseSheet("xhSetSheet");
  xhPaintOfflineList();
  xhOpenSheet("xhOffSheet");
}
window.xhOpenOfflineInfo = xhOpenOfflineInfo;

function xhPaintOfflineList() {
  const box = xhEl("xhOffList"); if (!box) return;
  box.innerHTML = Object.keys(XH_OFFLINE_OK).map((id) => {
    const a = XH_OFFLINE_OK[id];
    return '<div class="xh-row" style="cursor:default"><span class="rl">' +
      '<span><span class="rt">' + xhEscape(a.name) + '</span>' +
      '<span class="rs" id="xhOffS-' + id + '">確認中…</span></span></span>' +
      '<span class="rv" id="xhOffV-' + id + '">—</span></div>';
  }).join("");
  Object.keys(XH_OFFLINE_OK).forEach(async (id) => {
    let ready = false;
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      // scope は "…/MagiLex/" のような形。id は小文字なので両方を小文字にして比較する
      ready = regs.some((r) => (r.scope || "").toLowerCase().indexOf("/" + id + "/") >= 0);
    } catch (e) {}
    const s = xhEl("xhOffS-" + id), v = xhEl("xhOffV-" + id);
    if (s) s.textContent = ready ? "オフラインで起動できます" : "未ダウンロード";
    if (v) { v.textContent = ready ? "✓ 準備完了" : "未準備"; v.style.color = ready ? "#12a97a" : "#e08a2e"; }
  });
}
async function xhPrepareOffline() {
  const msg = xhEl("xhOffMsg"), btn = xhEl("xhOffPrep");
  if (!xhOnline()) { if (msg) msg.textContent = "オンラインのときにダウンロードしてください。"; return; }
  if (btn) { btn.disabled = true; btn.textContent = "ダウンロード中…"; }
  const ok = await xhRegisterAppSWs();
  if (btn) { btn.disabled = false; btn.textContent = "オフライン用にダウンロード"; }
  if (msg) msg.textContent = ok ? "3アプリのダウンロードを開始しました。完了後は機内モードでも遊べます。"
                                : "この環境では Service Worker を利用できません。";
  setTimeout(xhPaintOfflineList, 1500);
}
window.xhPrepareOffline = xhPrepareOffline;

/* ══════════════ PWA ══════════════ */
let _xhInstallPrompt = null;
addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); _xhInstallPrompt = e; });
function xhIsInstalled() {
  try { return matchMedia("(display-mode: standalone)").matches || navigator.standalone === true; }
  catch (e) { return false; }
}
async function xhInstallApp() {
  if (xhIsInstalled()) { xhToast("すでにアプリとしてインストール済みです"); return; }
  if (_xhInstallPrompt) {
    xhCloseSheet("xhSetSheet"); xhCloseSheet("xhInstallSheet");
    _xhInstallPrompt.prompt();
    try { await _xhInstallPrompt.userChoice; } catch (e) {}
    _xhInstallPrompt = null;
    return;
  }
  xhCloseSheet("xhSetSheet");
  xhOpenInstallHint(true);   // 手順を案内シートで見せる
}
window.xhInstallApp = xhInstallApp;

/* ══════════════ 初回インストール案内 ══════════════
   単体アプリ（MagiLex／MagiBurst）の配布はやめて XEVARION 1本にまとめたので、
   初回起動時に「アプリとして入れられること」を必ず案内する。 */
const XH_INSTALL_HINT_KEY = "xeva_install_hint_v2";

function xhIsIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
         (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}
function xhInstallSteps() {
  if (_xhInstallPrompt) {
    return [["下の<b>「インストールする」</b>を押す", "確認ダイアログで<b>「インストール」</b>を選ぶ"]];
  }
  if (xhIsIOS()) {
    return [["Safari の画面下にある<b>共有ボタン</b>（□に↑）をタップ",
             "メニューから<b>「ホーム画面に追加」</b>を選ぶ",
             "右上の<b>「追加」</b>をタップして完了！"]];
  }
  return [["アドレスバー右端の<b>インストールアイコン</b>（⊕）をクリック",
           "<b>「インストール」</b>を選ぶ"]];
}
function xhPaintInstallSteps() {
  const box = xhEl("xhInstSteps"); if (!box) return;
  const steps = xhInstallSteps()[0];
  box.innerHTML = steps.map((t, i) =>
    '<div class="st"><span class="n">' + (i + 1) + '</span><span class="x">' + t + "</span></div>").join("");
  const btn = xhEl("xhInstBtn");
  if (btn) btn.style.display = _xhInstallPrompt ? "" : "none";
}
function xhOpenInstallHint(force) {
  if (!force) {
    if (xhIsInstalled()) return;
    try { if (localStorage.getItem(XH_INSTALL_HINT_KEY) === "1") return; } catch (e) {}
  }
  xhPaintInstallSteps();
  xhOpenSheet("xhInstallSheet");
}
window.xhOpenInstallHint = xhOpenInstallHint;
function xhCloseInstallHint() {
  try { localStorage.setItem(XH_INSTALL_HINT_KEY, "1"); } catch (e) {}
  xhCloseSheet("xhInstallSheet");
}
window.xhCloseInstallHint = xhCloseInstallHint;

/* ポータル自身 + 3アプリの Service Worker を登録（＝オフライン下準備） */
async function xhRegisterAppSWs() {
  if (!("serviceWorker" in navigator)) return false;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  try { await navigator.serviceWorker.register("sw.js", { scope: "./" }); } catch (e) {}
  // 4つのSWが一斉に事前キャッシュを走らせると回線を食い合って取りこぼすので、間隔を空ける
  for (const id of Object.keys(XH_OFFLINE_OK)) {
    await wait(4000);
    const sw = XH_OFFLINE_OK[id].sw;
    try { await navigator.serviceWorker.register(sw, { scope: sw.slice(0, sw.lastIndexOf("/") + 1) }); }
    catch (e) { /* 個別に失敗しても他を続ける */ }
  }
  xhWarmChars();
  return true;
}

/* アイコンに使うキャラ画像だけ SW キャッシュに温める（chars/ 原寸は100MB超あるので入れない） */
async function xhWarmChars() {
  try {
    await navigator.serviceWorker.ready;
    const acc = xhAcc() || {};
    const urls = [];
    if (acc.charFile) urls.push(xhCharS(acc.charFile));
    (Array.isArray(acc.showcase) ? acc.showcase : []).forEach((id) => {
      const c = ((window.XEVA && window.XEVA.CHARS) || []).find((x) => x.id === id);
      if (c) urls.push(xhCharS(c.file));
    });
    for (const u of [...new Set(urls)]) {
      try {
        const abs = new URL(u, location.href).href;
        if (await caches.match(abs)) continue;
        await fetch(u);
      } catch (e) {}
    }
  } catch (e) {}
}

/* ══════════════ 更新データのダウンロード ══════════════
   update.json（make-update.py が生成）に、パッケージのバージョン・
   合計サイズ・更新内容が入っている。ホームを開いたときに見に行き、
   端末に入っている版と違えば「サイズ＋更新内容」を見せてから
   ダウンロード（＝各SWの事前キャッシュ）を実行し、完了後に読み込み直す。 */
const XH_PKG_KEY = "xeva_pkg_ver_v1";
let _xhUpd = null;             // 取得した update.json
let _xhUpdProg = {};           // { scope: {done,total} }
let _xhUpdRunning = false;

function xhFmtSize(b) {
  b = Number(b) || 0;
  if (b >= 1024 * 1024) return (b / 1024 / 1024).toFixed(1) + " MB";
  if (b >= 1024) return Math.round(b / 1024) + " KB";
  return b + " B";
}

/* ══════════ ダウンロードのしくみガイド（2026-08-10） ══════════
   説明文を置くだけでは読まれないので、<b>いま実際に起きている段</b>を光らせる。
   ここを呼ぶのは 3 か所だけ:
     xhShowUpdate … 0（まだ押していない）
     xhUpdStart   … 1（くらべる）→ 進むごとに 2・3
     完了時        … 4（切り替える）
   n=0 なら全部リセット。live は右上の小さな見出し。 */
function xhDlStep(n, live) {
  const box = xhEl("xhDlSteps");
  if (box) {
    Array.prototype.forEach.call(box.children, (li) => {
      const s = Number(li.getAttribute("data-s")) || 0;
      li.classList.toggle("now", s === n);
      li.classList.toggle("done", n > s);
    });
  }
  const lv = xhEl("xhDlLive");
  if (lv) lv.textContent = live || (n ? "いま ステップ " + n + " を実行中" : "押すと①から順に進みます");
}

async function xhCheckUpdate() {
  if (!xhOnline() || !("serviceWorker" in navigator)) return false;
  let data = null;
  try {
    const r = await fetch("update.json?t=" + Date.now(), { cache: "no-store" });
    if (!r.ok) return false;
    data = await r.json();
  } catch (e) { return false; }
  if (!data || !data.version) return false;
  _xhUpd = data;

  let cur = null;
  try { cur = localStorage.getItem(XH_PKG_KEY); } catch (e) {}
  if (cur === data.version) return false;

  /* 初回（まだ一度も記録がない）は、裏で走る初期ダウンロードで揃うので黙って記録する */
  if (!cur) { try { localStorage.setItem(XH_PKG_KEY, data.version); } catch (e) {} return false; }

  xhShowUpdate(data);
  return true;
}

/* ── 見送っていた回の更新内容も全部ならべる ──
   update.json の history は「新しい順」に過去の版が入っている。
   端末に入っている版（cur）より新しいものを全部取り出せば、
   3回見送っていた人には3回ぶんの更新内容がそのまま出る。
   ★ 何をダウンロードするかは版に関係なく「全ファイル取り直し」なので、
     ここは “見せ方” の話。中身は必ず最新にそろう。 */
function xhMissedUpdates(d, cur) {
  const hist = Array.isArray(d.history) ? d.history : [];
  const head = { version: d.version, date: d.date, title: d.title, notes: d.notes || [] };
  const all = [head].concat(hist.filter((h) => h && h.version !== d.version));
  if (!cur) return [head];
  const at = all.findIndex((h) => h.version === cur);
  return at < 0 ? all : all.slice(0, at);      // cur より新しいぶんだけ
}

/* ══ ダウンロード量をほんとうの値に直す（★ ここが「表示と実際が違う」の修正） ══
   update.json の bytes は「パッケージ（＝各SWの CORE 全部）の合計サイズ」しか数えていない。
   ところが実際の更新（xev-refresh）は
     ・CORE 全部を cache:"reload" で取り直し
     ・さらに CORE に載っていない実行時キャッシュ（キャラ画像・BGM・開いたページなど）も取り直す
   ので、遊びこんだ端末ほど本当のダウンロード量は bytes より大きくなる。
   ここで「いま端末に入っていて、CORE には無いぶん」を実サイズで数え、bytes に足して出す。
   ★ 逆に「何回ぶん更新をためこんだか」では量は変わらない（毎回まるごと取り直すため）。
     版の数だけ増えると誤解されないよう、内訳の一文もあわせて出している。 */
function xhUpdKey(u) {                      // 比較用にクエリを落とし、"…/" は index.html とみなす
  let s = String(u || "").split("?")[0].split("#")[0];
  if (s.endsWith("/")) s += "index.html";
  return s;
}
async function xhUpdMeasure(d) {
  const pkgBytes = Number(d && d.bytes) || 0;
  const pkgFiles = Number(d && d.files) || 0;
  const out = { bytes: pkgBytes, files: pkgFiles, extraBytes: 0, extraFiles: 0, exact: false };
  if (!("caches" in window)) return out;
  const pkg = new Set();
  (Array.isArray(d && d.urls) ? d.urls : []).forEach((u) => {
    try { pkg.add(xhUpdKey(new URL(u, location.href).href)); } catch (e) {}
  });
  if (!pkg.size) return out;                // urls の無い古い update.json はこれまでどおり bytes のまま
  try {
    const seen = new Set();
    for (const name of await caches.keys()) {
      /* ★ 曲キャッシュ（magimusic-audio-*）は更新の対象外＝落とし直さないので数えない。
         MP3 だけで約38MBあり、ここを足すと「実際より大幅に多い量」を見せてしまう。 */
      if (/audio/i.test(name)) continue;
      const c = await caches.open(name);
      for (const req of await c.keys()) {
        if (new URL(req.url).origin !== location.origin) continue;   // 外部（フォント等）は取り直さない
        const k = xhUpdKey(req.url);
        if (seen.has(k) || pkg.has(k)) continue;   // パッケージぶんは pkgBytes に入っている
        seen.add(k);
        let n = 0;
        try {
          const res = await c.match(req);
          if (res) {
            n = Number(res.headers.get("content-length")) || 0;
            if (!n) n = (await res.clone().blob()).size || 0;
          }
        } catch (e) {}
        out.extraBytes += n; out.extraFiles++;
      }
    }
    out.bytes = pkgBytes + out.extraBytes;
    out.files = pkgFiles + out.extraFiles;
    out.exact = true;
  } catch (e) {}
  return out;
}
/* 測ったサイズをシートへ反映する（開いたあと非同期で差し替わる） */
function xhUpdPaintSize(m, many) {
  const sz = xhFmtSize(m.bytes);
  ["xhUpdSize", "xhUpdSize2"].forEach((id) => { const e = xhEl(id); if (e) e.textContent = "約 " + sz; });
  const note = xhEl("xhUpdSizeNote");
  if (!note) return;
  /* ★ 2026-08-03: 更新は差分になった（変更のないファイルは落とし直さない）。
     ここに出せるのは「確認する対象の全体量」＝最大値なので、そう書く。
     実際に落ちた量は進み具合の下に出す。 */
  const rows = ["<b>確認するデータ " + xhEscape(sz) + "</b>（" + m.files.toLocaleString() + " ファイル）"];
  if (m.extraFiles) {
    rows.push("内訳: アプリ本体 " + xhFmtSize(m.bytes - m.extraBytes) +
      " ＋ 端末に保存済みの画像など " + xhFmtSize(m.extraBytes) + "（" + m.extraFiles.toLocaleString() + " ファイル）");
  }
  rows.push("<b>ダウンロードするのは変更があったファイルだけ</b>です。すでに入っていて中身が変わっていないぶんは、"
    + "確認だけして落とし直しません（実際のダウンロード量はこれよりずっと小さくなります）。");
  if (many) rows.push("<b>何件ためこんでいても、必要なぶんだけを1回で取り込みます。</b>");
  note.innerHTML = rows.join("<br>");
}

/* latest=true は「設定から確認したが、すでに最新だった」とき。
   案内の見せ方だけ変え、再ダウンロードの導線は残す。 */
function xhShowUpdate(d, latest) {
  let cur = null;
  try { cur = localStorage.getItem(XH_PKG_KEY); } catch (e) {}
  const missed = latest ? [] : xhMissedUpdates(d, cur);
  const many = missed.length > 1;

  const t = xhEl("xhUpdTitle");
  if (t) t.textContent = latest ? "最新のデータが入っています"
    : many ? missed.length + " 件の更新をまとめて適用します" : (d.title || "XEVARION アップデート");
  const v = xhEl("xhUpdVer");
  if (v) v.textContent = many ? ("ver " + (cur || "?") + " → " + d.version) : ("ver " + d.version);
  const sz = xhFmtSize(d.bytes);
  ["xhUpdSize", "xhUpdSize2"].forEach((id) => { const e = xhEl(id); if (e) e.textContent = "約 " + sz; });
  const note0 = xhEl("xhUpdSizeNote");
  if (note0) note0.innerHTML = "ダウンロード量を確認しています…";
  /* 実サイズは端末のキャッシュを見ないと分からないので、開いたあと非同期で差し替える */
  xhUpdMeasure(d).then((m) => { if (_xhUpd === d) xhUpdPaintSize(m, many); }).catch(() => {});
  const ul = xhEl("xhUpdNotes");
  if (ul) {
    if (latest) {
      ul.innerHTML = (d.notes || []).map((n) => "<li>" + xhEscape(n) + "</li>").join("");
    } else {
      /* 複数たまっているときは、版ごとに見出しを付けて全部見せる */
      ul.innerHTML = missed.map((h) =>
        (many ? '<li class="ver">' + xhEscape(h.title || h.version) +
                '<small>' + xhEscape(h.date || h.version) + "</small></li>" : "") +
        (h.notes || []).map((n) => "<li>" + xhEscape(n) + "</li>").join("")).join("");
    }
  }
  const pg = xhEl("xhUpdProg"); if (pg) pg.classList.remove("on");
  ["xhUpdGo", "xhUpdSkip", "xhUpdX"].forEach((id) => { const e = xhEl(id); if (e) e.style.display = ""; });
  const hd = xhEl("xhUpdHead");
  if (hd) hd.textContent = latest ? "✅ データは最新です"
    : many ? "🚀 " + missed.length + " 件のアップデート" : "🚀 アップデートがあります";
  /* ★ ボタンの中には <span id="xhUpdSize2"> が入っている。textContent で書き換えると
     その span ごと消えて、次にサイズを出す時に参照できなくなるので innerHTML で組み直す。 */
  const go = xhEl("xhUpdGo");
  if (go) {
    go.innerHTML = (latest ? "⟳ 変更がないか確認する（最大 " : "⬇ 更新する（最大 ") +
      '<span id="xhUpdSize2">約 ' + xhEscape(sz) + "</span>）";
  }
  const dl0 = xhEl("xhUpdDl"); if (dl0) { dl0.style.display = "none"; dl0.innerHTML = ""; }
  const skip = xhEl("xhUpdSkip");
  if (skip) skip.textContent = latest ? "閉じる" : "あとで";
  xhDlStep(0);                               // しくみガイドをリセット
  xhOpenSheet("xhUpdSheet");
}

function xhUpdLater() {
  if (_xhUpdRunning) return;
  xhCloseSheet("xhUpdSheet");
}
window.xhUpdLater = xhUpdLater;

function xhUpdPaint() {
  let done = 0, total = 0, got = 0, hit = 0, bytes = 0;
  Object.keys(_xhUpdProg).forEach((k) => {
    const p = _xhUpdProg[k];
    done += p.done; total += p.total;
    got += p.got | 0; hit += p.hit | 0; bytes += p.bytes | 0;
  });
  const pct = total ? Math.min(100, Math.round((done / total) * 100)) : 0;
  const bar = xhEl("xhUpdBar"); if (bar) bar.style.width = pct + "%";
  const pt = xhEl("xhUpdPct");
  /* 100% に届いたあとも、遅れて動きだすSWがないか少しだけ見届ける。
     そのあいだ「ダウンロード中… 100%」のままだと止まって見えるので文言を変える。 */
  if (pt) pt.textContent = (total && done >= total)
    ? "確認完了（" + done + " ファイル）— 仕上げています…"
    : "確認中… " + pct + "%（" + done + " / " + (total || "?") + " ファイル）";
  /* ★ 差分更新になったので「実際に落としたぶん」を見せる。
     変更が無ければ 0 件・0 B のまま終わるのが正しい姿。 */
  const dl = xhEl("xhUpdDl");
  if (dl) {
    dl.style.display = "";
    dl.innerHTML = "更新したファイル <b>" + got.toLocaleString() + "</b> 件（" + xhFmtSize(bytes) + "）"
      + "　／　変更なし " + hit.toLocaleString() + " 件";
  }
  /* ★ しくみガイドを実際の動きに同期させる。
     ・まだ1件も落としていない → ①くらべる
     ・落としはじめた           → ②変わったぶんだけ落とす
     ・全件つき合わせ終わった   → ③スマホに保存する */
  if (_xhUpdRunning) {
    if (total && done >= total) {
      xhDlStep(3, "③ 保存しています");
    } else if (got > 0) {
      xhDlStep(2, "② " + got.toLocaleString() + " 件を取得中（" + xhFmtSize(bytes) + "）");
    } else {
      xhDlStep(1, "① くらべています… " + pct + "%");
    }
  }
  return { done, total, pct, got, hit, bytes };
}

/* ── 設定 →「アプリの更新」から手動で確認する ──
   起動時の自動チェックは「端末に入っている版と違うとき」しか出さないので、
   すでに最新の人には何も起きない。ここでは *必ず* 結果を見せる：
   更新があればいつもの案内シートを、無ければ「最新です」と伝えたうえで
   それでも再ダウンロードできる導線を出す。 */
async function xhOpenUpdateFromSettings() {
  const sub = xhEl("xhSetUpdSub"), rv = xhEl("xhSetUpdV");
  if (!xhOnline()) { xhToast("オンラインのときに確認してください"); return; }
  if (sub) sub.textContent = "確認しています…";
  if (rv) rv.textContent = "…";

  let data = null;
  try {
    const r = await fetch("update.json?t=" + Date.now(), { cache: "no-store" });
    if (r.ok) data = await r.json();
  } catch (e) {}
  if (rv) rv.textContent = "›";

  if (!data || !data.version) {
    if (sub) sub.textContent = "更新情報を取得できませんでした";
    xhToast("更新情報を取得できませんでした。時間をおいて試してください");
    return;
  }
  _xhUpd = data;
  let cur = null;
  try { cur = localStorage.getItem(XH_PKG_KEY); } catch (e) {}
  const latest = cur === data.version;
  if (sub) sub.textContent = latest ? ("最新です（ver " + data.version + "）") : ("新しい更新があります（ver " + data.version + "）");

  xhCloseSheet("xhSetSheet");
  xhShowUpdate(data, latest);
}
window.xhOpenUpdateFromSettings = xhOpenUpdateFromSettings;

/* ══════════════ オフライン用に「もう一度まるごと」ダウンロード ══════════════
   ★ 2026-08-06 追加。
     ・端末の空き容量が減るとブラウザがキャッシュを勝手に捨てることがある。
       そうなると「アプリとして入れてあるのに、機内モードだと開けない」状態になるが、
       版は最新のままなので「アプリの更新」からは何も起きない（＝直せない）。
     ・アプリを消して入れ直すのは、端末に保存した進行データまで巻き添えになる。
     ここでは版に関係なく xev-refresh を投げて、欠けているファイルを取り直す。
     xev-refresh は「キャッシュに無いもの＝落とす／あって変わっていないもの＝落とさない」なので、
     穴だけが埋まり、通信量は必要なぶんに収まる。
   ★ 版の記録（XH_PKG_KEY）はここでは書き換えない。更新とは別の操作なので、
     見送っている更新があるなら、そのお知らせは残しておく。 */
async function xhRedownloadOffline() {
  if (_xhUpdRunning) return;
  if (!xhOnline()) { xhToast("オンラインのときにダウンロードしてください"); return; }
  const ok = await xhAsk({
    icon: "⬇",
    title: "オフライン用に再ダウンロード",
    body: "オフラインで遊べるアプリのデータを、もう一度そろえ直します。<br>" +
          "<b>端末に無いファイルだけ</b>を落とすので、そろっていれば通信はほとんど発生しません。<br>" +
          "<b>セーブデータ（進行・所持キャラ）はそのまま</b>です。",
    ok: "ダウンロード", cancel: "やめる",
  });
  if (!ok) return;
  xhCloseSheet("xhOffSheet");
  xhCloseSheet("xhSetSheet");

  /* 更新シートの見た目を借りる（進み具合のバーが一式そろっているため） */
  const t = xhEl("xhUpdTitle"); if (t) t.textContent = "オフライン用にダウンロードします";
  const hd = xhEl("xhUpdHead"); if (hd) hd.textContent = "⬇ 再ダウンロード";
  const v = xhEl("xhUpdVer"); if (v) v.textContent = "オフライン対応アプリ " + Object.keys(XH_OFFLINE_OK).length + " 本";
  const ul = xhEl("xhUpdNotes");
  if (ul) {
    ul.innerHTML = Object.keys(XH_OFFLINE_OK)
      .map((id) => "<li>" + xhEscape(XH_OFFLINE_OK[id].name) + "</li>").join("") +
      "<li>XEVARION ホーム本体</li>";
  }
  const note = xhEl("xhUpdSizeNote");
  if (note) {
    note.innerHTML = "<b>足りないファイルだけ</b>を取り直します。" +
      "すでに端末に入っていて中身が変わっていないぶんは、確認だけして落とし直しません。";
  }
  const go = xhEl("xhUpdGo"); if (go) go.innerHTML = "⬇ ダウンロードする";
  const dl0 = xhEl("xhUpdDl"); if (dl0) { dl0.style.display = "none"; dl0.innerHTML = ""; }
  xhDlStep(0, "欠けているぶんだけ取り直します");
  /* 確認は xhAsk で取ってあるので、シートを開いたらそのまま走らせる */
  xhOpenSheet("xhUpdSheet");
  xhUpdStart(true);
}
window.xhRedownloadOffline = xhRedownloadOffline;

/* keepVer=true は「オフライン用の再ダウンロード」。版の記録は書き換えない。 */
async function xhUpdStart(keepVer) {
  if (_xhUpdRunning) return;
  if (!xhOnline()) { xhToast("オンラインのときに更新してください"); return; }
  _xhUpdRunning = true;
  _xhUpdProg = {};
  ["xhUpdGo", "xhUpdSkip", "xhUpdX"].forEach((id) => { const e = xhEl(id); if (e) e.style.display = "none"; });
  const pg = xhEl("xhUpdProg"); if (pg) pg.classList.add("on");
  xhDlStep(1, "① くらべています");
  xhUpdPaint();

  /* SW からの進捗を受け取る */
  const doneScopes = new Set();
  const onMsg = (ev) => {
    const m = ev.data;
    if (!m) return;
    if (m.type === "xev-precache") {
      _xhUpdProg[m.scope] = { done: m.done | 0, total: m.total | 0,
        got: m.got | 0, hit: m.hit | 0, bytes: m.bytes | 0 };
      xhUpdPaint();
    } else if (m.type === "xev-refreshed") {
      doneScopes.add(m.scope);
    }
  };
  navigator.serviceWorker.addEventListener("message", onMsg);

  /* ① 各SWを更新（バージョンが変わっていれば install が走る） */
  try { await xhRegisterAppSWs(); } catch (e) {}
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.update().catch(() => {})));
  } catch (e) {}

  /* ② ★ 全ファイルを取り直す（xev-refresh）
     ここが「いままで見送っていたぶんもまとめて最新にする」本体。
     install だけに任せると
       ・sw.js の中身が変わらなかった回は何も落ちてこない
       ・CORE に載っていない実行時キャッシュぶんが古いまま残る
     ので、更新のたびに必ず全URLを cache:"reload" で取り直させる。
     待ち時間は伸びるが、「更新したのに前のまま」が起きなくなる。
     ★ 投げるだけ。何台が応じたかは数えない（応じない SW を待つと固まるため。下の完了判定を参照）。 */
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    /* installing/waiting しかいない直後でも届くよう、少しだけ待ってから投げる */
    await new Promise((r) => setTimeout(r, 600));
    const regs2 = await navigator.serviceWorker.getRegistrations();
    (regs2.length ? regs2 : regs).forEach((r) => {
      const sw = r.active || r.waiting || r.installing;
      if (!sw) return;
      try { sw.postMessage({ type: "xev-refresh" }); } catch (e) {}
    });
  } catch (e) {}

  /* ══ 完了の見きわめ（★「100%から終わらない」の修正） ══
     以前は「登録されている SW の数（swCount）ぶんだけ xev-refreshed が返るまで待つ」
     という条件だった。ところが xev-refresh を知らない SW —— たとえば MagiMusic の
     ように後から登録されたものや、削除したアプリの登録が残っているもの —— は
     返事をしないので、返事の数が swCount に永久に届かない。
     進捗は「返事をした scope」だけで集計しているため 100% に見え、そこから
     5分の打ち切りまで固まって見えていた。
     ★ 直しかた：数えるのは「実際に反応した scope」だけ。その全部が終わっていれば完了。
       遅れて動きだす SW を取りこぼさないよう、静かになってから GRACE ぶんだけ見届け、
       まだ installing/waiting の SW がいるあいだは（上限つきで）待つ。 */
  const GRACE = 2500;      // 最後の動きからこれだけ静かなら「もう来ない」とみなす
  const LATE  = 60000;     // installing/waiting を待つのはここまで
  const STALL = 90000;     // 進捗が止まったきり動かない（回線が落ちた等）ときの打ち切り
  const started = Date.now();
  let lastMove = Date.now(), lastKey = "", iv = null;
  await new Promise((res) => {
    const finish = (msg) => {
      if (iv) clearInterval(iv);
      if (msg) { const p = xhEl("xhUpdPct"); if (p) p.textContent = msg; }
      res();
    };
    iv = setInterval(async () => {
      const { done, total } = xhUpdPaint();
      const scopes = Object.keys(_xhUpdProg).length;
      /* 「動きがあったか」は 進捗・返事の数 が変わったかで見る */
      const key = scopes + ":" + done + ":" + total + ":" + doneScopes.size;
      if (key !== lastKey) { lastKey = key; lastMove = Date.now(); }
      const quiet = Date.now() - lastMove, age = Date.now() - started;

      if (scopes >= 1 && total > 0 && done >= total && quiet > GRACE) {
        /* まだ install 中の SW がいるなら、そのぶんは待ってあげる（ただし LATE まで） */
        let busy = false;
        if (age < LATE) {
          try {
            const regs = await navigator.serviceWorker.getRegistrations();
            busy = regs.some((r) => r.installing || r.waiting);
          } catch (e) {}
        }
        if (!busy) { finish(); return; }
      }
      if (!scopes && age > 8000) {
        let busy = false;
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          busy = regs.some((r) => r.installing || r.waiting);
        } catch (e) {}
        if (!busy) {   // 反応が無い＝落とすものが無い
          finish("すでに最新のデータが入っています"); return;
        }
      }
      if (quiet > STALL) { finish("通信が不安定なため、ここまでを適用します"); return; }
      if (age > 300000) { finish(); }
    }, 400);
  });
  navigator.serviceWorker.removeEventListener("message", onMsg);

  const bar = xhEl("xhUpdBar"); if (bar) bar.style.width = "100%";
  const pt = xhEl("xhUpdPct");
  if (pt) pt.textContent = keepVer ? "オフライン用のデータがそろいました" : "更新を適用しています…";
  xhDlStep(4, keepVer ? "④ 完了しました" : "④ 最新版に切り替えます");
  /* ★ 再ダウンロードでは版を書き換えない（見送り中の更新の案内を消さないため） */
  if (!keepVer) { try { localStorage.setItem(XH_PKG_KEY, (_xhUpd && _xhUpd.version) || ""); } catch (e) {} }
  setTimeout(() => { try { location.reload(); } catch (e) {} }, keepVer ? 1400 : 700);
}
window.xhUpdStart = xhUpdStart;

/* ══════════════ Magi AI Assistant ══════════════ */
/* ------------------------------------------------------------------
   ・話しかけられた文章を「正規化 → スコア式のあいまい一致」で読み取る。
     ぴったりのキーワードが無くても、いちばん近い話題を選んで必ず次の一手を出す。
   ・タイマーは文章から時間をそのまま読み取る
     （25分 / 1時間30分 / 90秒 / 一時間半 / 1:30 / 21時に / ポモドーロ …）。
     同時に何本でも持て、ページを移動しても続きから動く。
   ・直前の提案を覚えているので「はい」だけでも続けられる。
   ------------------------------------------------------------------ */

/* ══ 状況を読むヘルパー（AIが「いまの自分」に合わせて答えるための材料） ══ */
function xhAiBal() { try { return window.XEVA ? window.XEVA.getBalance() : 0; } catch (e) { return 0; } }
function xhAiMailUnread() {
  try {
    const d = JSON.parse(localStorage.getItem("xeva_mail_v1") || "{}");
    return (d.items || []).filter((m) => !m.claimed).length;
  } catch (e) { return 0; }
}
function xhAiMissionOpen() {
  try {
    const ms = window.XEVA.getMissions() || [];
    return { total: ms.length, done: ms.filter((m) => m.done).length,
             claimable: ms.filter((m) => m.done && !m.claimed).length,
             next: ms.filter((m) => !m.done).slice(0, 3) };
  } catch (e) { return { total: 0, done: 0, claimable: 0, next: [] }; }
}
function xhAiEvents() { return xhEventsLive(); }
function xhAiFriends() {
  const a = xhAcc() || {};
  return Array.isArray(a.friends) ? a.friends.length : 0;
}

/* ══════════════ ことばの正規化 ══════════════ */
/* 全角/半角・大文字小文字・カタカナ/ひらがな・記号のゆれを吸収し、
   「タイマー」「たいまー」「ﾀｲﾏｰ」「Timer」をすべて同じ形にそろえる。
   長音「ー」は意味を持つので残す（"たいまー" のまま比べる）。 */
function xhAiNorm(s) {
  s = String(s == null ? "" : s);
  try { s = s.normalize("NFKC"); } catch (e) {}
  s = s.toLowerCase();
  s = s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60)); // カタカナ→ひらがな
  s = s.replace(/[\s　]/g, "");
  s = s.replace(/[!-\/:-@\[-`{-~、。，．！？「」『』…・]/g, "");
  return s;
}

/* 漢数字も読める数値パーサ（三十五 → 35） */
function xhAiNum(s) {
  s = String(s == null ? "" : s);
  if (/^[0-9]+(\.[0-9]+)?$/.test(s)) return parseFloat(s);
  const D = { "〇": 0, "零": 0, "一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9 };
  const U = { "十": 10, "百": 100, "千": 1000 };
  let total = 0, cur = 0, ok = false;
  for (const ch of s) {
    if (D[ch] !== undefined) { cur = D[ch]; ok = true; }
    else if (U[ch]) { total += (cur || 1) * U[ch]; cur = 0; ok = true; }
    else return NaN;
  }
  return ok ? total + cur : NaN;
}

const XH_NUMPAT = "[0-9]+(?:\\.[0-9]+)?|[〇零一二三四五六七八九十百千]+";

/* ══════════════ 時間の読み取り ══════════════ */
/* 「25分」「1時間30分」「90秒」「一時間半」「1:30」「2h」「pomodoro」…
   書いてある通りの秒数を返す。読めなければ 0。 */
function xhAiParseDuration(text) {
  let s = String(text == null ? "" : text);
  try { s = s.normalize("NFKC"); } catch (e) {}
  s = s.replace(/[\s　,]/g, "").toLowerCase();
  s = s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

  let sec = 0, hit = false;
  const take = (re, mul) => {
    const m = s.match(re);
    if (!m) return;
    const v = xhAiNum(m[1]);
    if (isNaN(v) || v <= 0) return;
    sec += v * mul; hit = true;
  };
  take(new RegExp("(" + XH_NUMPAT + ")(?:時間|じかん|hours?|hrs?|h(?![a-z]))"), 3600);
  take(new RegExp("(" + XH_NUMPAT + ")(?:分間|分|ふん|ぷん|minutes?|mins?|min|m(?![a-z0-9]))"), 60);
  take(new RegExp("(" + XH_NUMPAT + ")(?:秒間|秒|びょう|seconds?|secs?|sec|s(?![a-z0-9]))"), 1);

  /* 「1時間半」の“半” */
  if (/時間半|じかんはん/.test(s)) { sec += 1800; hit = true; }
  else if (!hit && /半/.test(s)) { sec = 1800; hit = true; }

  /* 「1:30」＝1時間30分（時刻として使われていない場合のみ） */
  if (!hit) {
    const c = s.match(/([0-9]{1,2}):([0-9]{2})(?::([0-9]{2}))?/);
    if (c && !/に|まで/.test(s)) {
      sec = (+c[1]) * 3600 + (+c[2]) * 60 + (c[3] ? +c[3] : 0);
      hit = sec > 0;
    }
  }
  if (!hit && /ぽもどーろ|pomodoro/.test(s)) { sec = 25 * 60; hit = true; }

  if (!hit) return 0;
  return Math.max(10, Math.min(12 * 3600, Math.round(sec)));
}

/* 「21時に」「9時半に」「午後3時」「7:30に起こして」→ そこまでの秒数 */
function xhAiParseClockIn(text) {
  let s = String(text == null ? "" : text);
  try { s = s.normalize("NFKC"); } catch (e) {}
  s = s.replace(/[\s　]/g, "").toLowerCase();
  let h = null, mi = 0;

  let m = s.match(new RegExp("(" + XH_NUMPAT + ")時(半|(" + XH_NUMPAT + ")分)?"));
  if (m) {
    h = xhAiNum(m[1]);
    if (m[2] === "半") mi = 30;
    else if (m[3]) mi = xhAiNum(m[3]) || 0;
  } else {
    m = s.match(/([0-9]{1,2}):([0-9]{2})/);
    if (m && /に|まで/.test(s)) { h = +m[1]; mi = +m[2]; }
  }
  if (h === null || isNaN(h)) return 0;

  if (/午後|ごご|夕方|夜|pm/.test(s) && h < 12) h += 12;
  if (/午前|ごぜん|朝|am/.test(s) && h === 12) h = 0;
  if (h > 23 || mi > 59) return 0;

  const now = new Date();
  const at = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, mi, 0, 0);
  if (at <= now) at.setDate(at.getDate() + 1);   // すぎていたら翌日
  return Math.round((at - now) / 1000);
}

/* 「25分」「1時間30分」だけの、時間しか書いていないメッセージか？ */
function xhAiIsBareTime(raw) {
  let s = xhAiNorm(raw);
  s = s.replace(/[0-9〇零一二三四五六七八九十百千]/g, "");
  s = s.replace(/時間|じかん|分間|分|ふん|ぷん|秒間|秒|びょう|半|hours?|hrs?|minutes?|mins?|min|seconds?|secs?|sec|[hms]/g, "");
  s = s.replace(/だけ|ちょうだい|ください|お願い|おねがい|して|で|に|の|を|ね|よ/g, "");
  return s.length <= 2;
}

function xhAiFmtDur(sec) {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (h) return m ? h + "時間" + m + "分" : h + "時間";
  if (m) return s ? m + "分" + s + "秒" : m + "分";
  return s + "秒";
}
function xhAiClock(sec) {
  sec = Math.max(0, Math.ceil(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const p = (n) => String(n).padStart(2, "0");
  return h ? h + ":" + p(m) + ":" + p(s) : p(m) + ":" + p(s);
}

/* onclick 属性に文字列を埋めるための簡易クオート */
function xhAiQuote(s) { return String(s == null ? "" : s).replace(/['"\\<>]/g, ""); }

/* ══════════════ タイマー（何本でも同時に持てる） ══════════════ */
const XH_TIMER_KEY = "xeva_ai_timers_v2";
let _xhTimers = [];       // {id, label, end, dur, left(一時停止中の残りms)}
let _xhTimerIv = null;

function xhTimerSave() {
  try { localStorage.setItem(XH_TIMER_KEY, JSON.stringify(_xhTimers)); } catch (e) {}
}
function xhTimerLoad() {
  try {
    const v = JSON.parse(localStorage.getItem(XH_TIMER_KEY) || "[]");
    if (Array.isArray(v)) _xhTimers = v.filter((t) => t && (t.left > 0 || t.end > Date.now()));
  } catch (e) { _xhTimers = []; }
  if (_xhTimers.length) xhTimerLoop();
  xhTimerChip();
}
function xhTimerLeft(t) { return t.left != null ? t.left : Math.max(0, t.end - Date.now()); }
function xhTimerFind(id) { return _xhTimers.find((t) => t.id === id) || null; }

/* 完了音（権限のいらない WebAudio の小さなチャイム） */
function xhAiChime() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ac = new AC();
    [880, 1174.7, 1568].forEach((f, i) => {
      const o = ac.createOscillator(), g = ac.createGain();
      const t0 = ac.currentTime + i * 0.16;
      o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.22, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.55);
      o.connect(g); g.connect(ac.destination);
      o.start(t0); o.stop(t0 + 0.6);
    });
    setTimeout(() => { try { ac.close(); } catch (e) {} }, 1600);
  } catch (e) {}
}

function xhTimerAdd(sec, label) {
  sec = Math.max(5, Math.min(12 * 3600, Math.round(sec)));
  const t = { id: "t" + Date.now().toString(36) + Math.floor(Math.random() * 1e3),
              label: label || "", dur: sec, end: Date.now() + sec * 1000, left: null };
  _xhTimers.push(t);
  xhTimerSave(); xhTimerLoop(); xhTimerChip();
  return t;
}

function xhTimerLoop() {
  if (_xhTimerIv) return;
  _xhTimerIv = setInterval(() => {
    const done = [];
    _xhTimers.forEach((t) => {
      const left = xhTimerLeft(t);
      const v = xhEl("xhTv_" + t.id);
      if (v) v.textContent = (t.left != null ? "‖ " : "") + xhAiClock(left / 1000);
      const b = xhEl("xhTb_" + t.id);
      if (b) b.style.width = Math.max(0, Math.min(100, 100 - (left / 1000) / t.dur * 100)) + "%";
      if (t.left == null && left <= 0) done.push(t);
    });
    done.forEach(xhTimerFire);
    xhTimerChip();
    if (!_xhTimers.length) { clearInterval(_xhTimerIv); _xhTimerIv = null; }
  }, 250);
}

function xhTimerFire(t) {
  _xhTimers = _xhTimers.filter((x) => x.id !== t.id);
  xhTimerSave();
  const nm = t.label ? "「" + t.label + "」" : "";
  xhAiChime();
  try { if (navigator.vibrate) navigator.vibrate([180, 90, 180, 90, 260]); } catch (e) {}
  xhToast("⏱ " + xhAiFmtDur(t.dur) + nm + " 終了！おつかれさま", 4600);
  xhAiPush("ai", "⏱ <b>" + xhAiFmtDur(t.dur) + "</b>" + xhEscape(nm) + " が終わりました。おつかれさまです！",
    [["もう1回", "xhAiTimer(" + t.dur + ",'" + xhAiQuote(t.label) + "')"],
     ["5分だけ休憩", "xhAiTimer(300,'休憩')"],
     ["MagiFocus に記録", "xhOpenApp('magifocus','MagiFocus/index.html')"]]);
  const card = document.querySelector('[data-tid="' + t.id + '"]');
  if (card) card.classList.add("done");
}

function xhTimerStop(id) {
  const t = xhTimerFind(id);
  _xhTimers = _xhTimers.filter((x) => x.id !== id);
  xhTimerSave(); xhTimerChip();
  const card = document.querySelector('[data-tid="' + id + '"]');
  if (card) card.classList.add("done");
  xhAiPush("ai", t ? "⏹ " + xhEscape(t.label ? "「" + t.label + "」の" : "") + "タイマーを止めました。"
                   : "そのタイマーはもう動いていません。");
}
window.xhTimerStop = xhTimerStop;

function xhTimerStopAll() {
  const n = _xhTimers.length;
  _xhTimers = []; xhTimerSave(); xhTimerChip();
  document.querySelectorAll(".xh-tcard").forEach((c) => c.classList.add("done"));
  xhAiPush("ai", n ? "⏹ タイマー <b>" + n + "件</b> をすべて止めました。" : "動いているタイマーはありません。");
}
window.xhTimerStopAll = xhTimerStopAll;

function xhTimerAddMin(id, min) {
  const t = xhTimerFind(id);
  if (!t) { xhAiPush("ai", "そのタイマーはもう動いていません。"); return; }
  const add = min * 60000;
  if (t.left != null) t.left += add; else t.end += add;
  t.dur += min * 60;
  xhTimerSave();
  xhAiPush("ai", "⏱ <b>" + min + "分</b> 追加しました（残り " + xhAiFmtDur(xhTimerLeft(t) / 1000) + "）。");
}
window.xhTimerAddMin = xhTimerAddMin;

function xhTimerPause(id) {
  const t = xhTimerFind(id);
  if (!t) return;
  if (t.left != null) { t.end = Date.now() + t.left; t.left = null; xhAiPush("ai", "▶ 再開しました。"); }
  else { t.left = Math.max(0, t.end - Date.now()); xhAiPush("ai", "⏸ 一時停止しました。もう一度押すと再開します。"); }
  xhTimerSave(); xhTimerLoop();
}
window.xhTimerPause = xhTimerPause;

/* 画面の右下に出す、残り時間の小さなチップ（AIを閉じていても見える） */
function xhTimerChip() {
  let chip = xhEl("xhTimerChip");
  if (!_xhTimers.length) { if (chip) chip.classList.remove("on"); return; }
  if (!chip) {
    if (!document.body) return;
    chip = document.createElement("button");
    chip.id = "xhTimerChip";
    chip.type = "button";
    chip.onclick = () => xhOpenAi();
    document.body.appendChild(chip);
  }
  const soonest = _xhTimers.slice().sort((a, b) => xhTimerLeft(a) - xhTimerLeft(b))[0];
  chip.innerHTML = '<span class="ic">⏱</span><span class="v">' + xhAiClock(xhTimerLeft(soonest) / 1000) + "</span>" +
    (_xhTimers.length > 1 ? '<span class="n">' + _xhTimers.length + "</span>" : "");
  chip.classList.add("on");
}

/* タイマー開始（メッセージから読み取った秒数をそのまま使う） */
function xhAiTimer(sec, label) {
  sec = Math.round(Number(sec) || 0);
  if (sec < 5) { xhAiPush("ai", "時間が短すぎます。「25分」のように教えてください。"); return; }
  const t = xhTimerAdd(sec, label || "");
  const nm = label ? "（" + xhEscape(label) + "）" : "";
  xhAiPush("ai",
    "⏱ <b>" + xhAiFmtDur(sec) + "</b>" + nm + " のタイマーをセットしました。集中していきましょう！" +
    '<div class="xh-tcard" data-tid="' + t.id + '">' +
      '<div class="tt">' + (label ? xhEscape(label) : "タイマー") + "</div>" +
      '<div class="tv" id="xhTv_' + t.id + '">' + xhAiClock(sec) + "</div>" +
      '<div class="tbar"><i id="xhTb_' + t.id + '"></i></div>' +
    "</div>",
    [["＋5分", "xhTimerAddMin('" + t.id + "',5)"],
     ["一時停止 / 再開", "xhTimerPause('" + t.id + "')"],
     ["やめる", "xhTimerStop('" + t.id + "')"]]);
}
window.xhAiTimer = xhAiTimer;

function xhAiTimerList() {
  if (!_xhTimers.length) {
    return { html: "いま動いているタイマーはありません。<br>「25分はかって」「1時間30分タイマー」のように話しかけてください。",
      chips: [["25分", "xhAiTimer(1500)"], ["50分", "xhAiTimer(3000)"], ["ポモドーロ", "xhAiTimer(1500,'ポモドーロ')"]] };
  }
  const rows = _xhTimers.map((t) =>
    "⏱ " + (t.label ? "<b>" + xhEscape(t.label) + "</b> " : "") + "残り <b>" + xhAiFmtDur(xhTimerLeft(t) / 1000) + "</b>" +
    (t.left != null ? "（一時停止中）" : ""));
  return { html: "動いているタイマーは <b>" + _xhTimers.length + "件</b> です。<br>" + rows.join("<br>"),
    chips: _xhTimers.slice(0, 3).map((t) => ["やめる" + (t.label ? "：" + t.label : ""), "xhTimerStop('" + t.id + "')"])
      .concat([["すべて止める", "xhTimerStopAll()"]]) };
}

/* 「英語を25分」→ ラベル「英語」 のように、時間以外の言葉から名前を拾う。
   ★ 以前は学習プラン用の科目辞書（xhAiPickSubject）を使っていたが、
     勉強の相談を XEVYNAR へ移したときに辞書ごと削除した。
     ここは案内役に残る機能なので、必要な語だけを自前で持つ。 */
const XH_TIMER_WORDS = /(英単語|英語|数学|物理|化学|生物|地学|国語|古文|漢文|日本史|世界史|地理|社会|情報|勉強|宿題|復習|暗記|演習|読書|音読|作業|休憩|仮眠|昼寝|筋トレ|運動|片付け|お風呂|料理|ゲーム|ポモドーロ)/;
function xhAiTimerLabel(raw) {
  const m = String(raw).match(XH_TIMER_WORDS);
  return m ? m[1] : "";
}

/* 「タイマー」系のことばを総合的に処理する */
function xhAiTimerIntent(raw) {
  const q = xhAiNorm(raw);

  if (/(全部|すべて|ぜんぶ|all).{0,4}(止|停|やめ|きゃんせる|cancel)|(止|停|やめ|きゃんせる|cancel).{0,4}(全部|すべて|ぜんぶ)/.test(q))
    return { html: "すべてのタイマーを止めますね。", act: "xhTimerStopAll()", silent: true };
  if (/(止め|停止|やめ|きゃんせる|cancel|すとっぷ|stop|解除)/.test(q)) {
    if (_xhTimers.length === 1) return { html: "止めますね。", act: "xhTimerStop('" + _xhTimers[0].id + "')", silent: true };
    if (!_xhTimers.length) return { html: "動いているタイマーはありません。" };
    return xhAiTimerList();
  }
  if (/(一覧|りすと|list|いくつ|残り|あと何|あとどれ|なんぷん|何分|確認|どうなって)/.test(q)) return xhAiTimerList();

  /* 時間の読み取り：まず「◯分/◯時間/◯秒」、次に「◯時に」 */
  let sec = xhAiParseDuration(raw);
  let isClock = false;
  if (!sec) { sec = xhAiParseClockIn(raw); isClock = sec > 0; }

  /* 数字だけ言われたとき（「45」→ 45分） */
  if (!sec) {
    const only = String(raw).trim().match(/^([0-9]{1,3})$/);
    if (only) sec = Math.min(240, parseInt(only[1], 10)) * 60;
  }
  if (!sec) {
    return { html: "何分にしますか？ 「25分」「1時間30分」「90秒」「21時に」のように、そのまま書いてもらえれば大丈夫です。",
      chips: [["5分", "xhAiTimer(300)"], ["15分", "xhAiTimer(900)"], ["25分", "xhAiTimer(1500)"],
              ["50分", "xhAiTimer(3000)"], ["60分", "xhAiTimer(3600)"]] };
  }

  const label = xhAiTimerLabel(raw);
  const act = "xhAiTimer(" + sec + ",'" + xhAiQuote(label) + "')";
  if (isClock) return { html: "その時刻まで <b>" + xhAiFmtDur(sec) + "</b> です。タイマーをセットしますね。", act: act };
  return { html: "", act: act, silent: true };
}

/* ══════════════ 状況まとめ・おすすめ ══════════════ */
function xhAiStatus() {
  const acc = xhAcc() || {};
  const m = xhAiMissionOpen();
  const mail = xhAiMailUnread();
  const rows = [
    ["🪙 所持 XEVA", xhAiBal().toLocaleString() + " XEVA"],
    ['<img class="xv-gemico" src="gem.png" alt="ジェム"> 所持ジェム', xhGemBal().toLocaleString() + " ジェム"],
    ["🎴 キャラクター", xhOwnedChars().length + " 体"],
    ["🎯 ミッション", m.done + " / " + m.total + " 達成" + (m.claimable ? "（受け取れる報酬 " + m.claimable + " 件）" : "")],
    ["📬 未受取メール", mail + " 件"],
    ["👥 フレンド", xhAiFriends() + " 人"],
    ["📶 通信", xhOnline() ? "オンライン" : "オフライン（対応アプリのみ）"],
  ];
  if (_xhTimers.length) rows.push(["⏱ タイマー", _xhTimers.length + " 件（最短 " + xhAiFmtDur(xhTimerLeft(_xhTimers[0]) / 1000) + "）"]);
  const chips = [];
  if (m.claimable) chips.push(["報酬を受け取る", "xhTapMission()"]);
  if (mail) chips.push(["メールを開く", "xhTapMail()"]);
  chips.push(["今日のおすすめ", "xhAiAsk('今日なにする')"]);
  chips.push(["ジェムの入手方法", "xhOpenGemGuide()"]);
  return {
    html: "<b>" + xhEscape(acc.name || "XEVARION") + "</b> さんの現在の状況です。<br>" +
      rows.map(([k, v]) => "・" + k + "：<b>" + v + "</b>").join("<br>"),
    chips
  };
}

function xhAiToday() {
  const m = xhAiMissionOpen();
  const mail = xhAiMailUnread();
  const ev = xhAiEvents();
  const todo = [];
  const chips = [];
  if (mail) { todo.push("📬 未受取のメールが <b>" + mail + "件</b> あります"); chips.push(["まとめて受け取る", "xhTapMail()"]); }
  if (m.claimable) { todo.push("🎯 受け取れるミッション報酬が <b>" + m.claimable + "件</b>"); chips.push(["ミッション", "xhTapMission()"]); }
  m.next.slice(0, 2).forEach((x) => {
    const meta = (typeof MISSION_META !== "undefined" && MISSION_META[x.id]) || {};
    todo.push("▶ " + xhEscape(x.title) + "（+" + x.reward + " XEVA）");
    if (meta.href) chips.push([x.title.split(" ")[0], "location.href='" + meta.href + "'"]);
  });
  if (ev[0]) {
    todo.push("🎉 " + xhEscape(ev[0].t1) + " 開催中 — " + xhEscape(ev[0].t2));
    chips.push(["イベントへ", "xhOpenApp('','" + ev[0].href + "')"]);
  }
  todo.push("📚 5分でもいいので MagiLex を1セット");
  chips.push(["⏱ 5分だけやる", "xhAiTimer(300,'MagiLex')"]);
  return { html: "今日のおすすめはこちらです。<br>" + todo.join("<br>"), chips: chips.slice(0, 5) };
}

/* ══════════════ XEVYNAR への引き継ぎ ══════════════
   Magi AI Assistant の役目は「XEVARION の案内役」＝どこに何があるかを教え、
   目的のアプリまで連れて行くこと。
   勉強そのもの（プラン・問題の解説・苦手対策）や、アプリの中身に踏み込んだ話
   （MagiBurst の編成やギミック対策、MagiLex の出題内容など）は、
   その人のデータを持っている <b>XEVYNAR</b> の担当。
   ここで中途半端に答えると、XEVYNAR の答えと食い違って混乱のもとになるので、
   要点だけ伝えて必ず XEVYNAR へ渡す。 */
function xhAiToXevynar(question, why) {
  const q = String(question || "").trim().slice(0, 120);
  const href = "XEVYNAR/index.html" + (q ? "#ask=" + encodeURIComponent(q) : "");
  const act = "xhOpenApp('xevynar','" + href.replace(/'/g, "%27") + "')";
  return {
    html: (why || "それは <b>XEVYNAR</b>（XEVARION の学習AI）の担当です。") + "<br>" +
      "XEVYNAR はあなたの学習記録・MagiLex の習得状況・MagiBurst の所持キャラを見て答えるので、" +
      "ここで答えるよりずっと正確です。" +
      (q ? "<br>この質問をそのまま渡しますね。" : ""),
    chips: [["XEVYNAR にきく", act], ["XEVYNAR を開く", "xhOpenApp('xevynar','XEVYNAR/index.html')"]],
    ctx: { follow: act },
  };
}

/* 学習・アプリ攻略の相談は XEVYNAR へ */
function xhAiStudyPlan(q) {
  return xhAiToXevynar(q,
    "勉強の相談は <b>XEVYNAR</b> にお任せください。<br>" +
    "プランづくり・自由なタイマー・わからない問題の解説・苦手問題の出題まで、まとめて面倒を見てくれます。");
}
function xhAiAppDeep(q, appName) {
  return xhAiToXevynar(q,
    "<b>" + xhEscape(appName || "そのアプリ") + "</b> の中身の相談は <b>XEVYNAR</b> の担当です。<br>" +
    "編成・ギミック対策・勝てないときのコツ・入手すべきキャラまで、具体的に教えてくれます。");
}

/* ══════════════ 計算・ちょっとした道具 ══════════════ */
function xhAiCalc(raw) {
  let s = String(raw);
  try { s = s.normalize("NFKC"); } catch (e) {}
  s = s.replace(/[×✕]/g, "*").replace(/[÷]/g, "/")
       .replace(/計算|けいさん/g, " ")
       .replace(/[はをのって？?＝=]/g, " ").trim();
  if (!/[0-9]/.test(s) || !/[+\-*/]/.test(s)) return null;
  /* 使える文字を数字と演算子だけに絞ったうえで評価する */
  if (!/^[0-9+\-*/().\s]+$/.test(s)) return null;
  try {
    const v = Function('"use strict";return (' + s + ")")();
    if (typeof v !== "number" || !isFinite(v)) return null;
    return { html: "🧮 <b>" + xhEscape(s.replace(/\s+/g, " ")) + " = " + (Math.round(v * 1e6) / 1e6).toLocaleString() + "</b>" };
  } catch (e) { return null; }
}

function xhAiDice(raw) {
  const q = xhAiNorm(raw);
  if (/こいん|coin|表か裏/.test(q))
    return { html: "🪙 <b>" + (Math.random() < 0.5 ? "表" : "裏") + "</b> が出ました！",
      chips: [["もう一度", "xhAiAsk('コイン')"]] };
  const rng = String(raw).match(/([0-9]+)\s*(?:から|〜|~|-|:)\s*([0-9]+)/);
  if (rng) {
    const a = Math.min(+rng[1], +rng[2]), b = Math.max(+rng[1], +rng[2]);
    return { html: "🎲 <b>" + (a + Math.floor(Math.random() * (b - a + 1))) + "</b>（" + a + "〜" + b + "）" };
  }
  if (/どれ|どっち|なにしよう|何しよう|迷/.test(q)) {
    const a = XH_APPS[Math.floor(Math.random() * XH_APPS.length)];
    return { html: "迷ったときは、これ！<br>▶ <b>" + xhEscape(xhFullName(a)) + "</b> — " + xhEscape(a.sub),
      chips: [["開く", "xhOpenApp('" + a.id + "','" + a.href + "')"], ["ほかのを引く", "xhAiAsk('どれにしよう')"]] };
  }
  const n = 1 + Math.floor(Math.random() * 6);
  return { html: "🎲 サイコロは <b>" + n + "</b> でした！",
    chips: [["もう一度", "xhAiAsk('サイコロ')"], ["コイン", "xhAiAsk('コイン')"]] };
}

function xhAiNow() {
  const d = new Date();
  const w = "日月火水木金土"[d.getDay()];
  return { html: "🕐 いまは <b>" + d.getHours() + ":" + String(d.getMinutes()).padStart(2, "0") + "</b>、" +
    "<b>" + d.getFullYear() + "年" + (d.getMonth() + 1) + "月" + d.getDate() + "日（" + w + "）</b> です。",
    chips: [["25分はかる", "xhAiTimer(1500)"], ["今日のおすすめ", "xhAiAsk('今日なにする')"]] };
}

/* ══════════════ 状況からアプリを勧める ══════════════ */
function xhAiPickApps(raw) {
  const q = xhAiNorm(raw);
  const want = [];
  if (/2人|ふたり|二人|3人|さんにん|三人|4人|よにん|四人|5人|6人|みんな|複数|ぱーてぃ|party|囲ん|大人数/.test(q))
    want.push("magijackpot", "magichainparty", "magiarena", "magiempire", "magidiamond");
  if (/一人|ひとり|1人|そろ|solo|暇|ひま|退屈|時間つぶし/.test(q))
    want.push("magiburst", "magijackpot", "magicraft", "magimanor", "magibattle");
  if (/短|さくっ|すぐ|軽く|5分|10分|すきま/.test(q)) want.push("magiburst", "magilex", "magijackpot", "magichainparty");
  if (/頭|考え|戦略|読み合い|よみあい|ぱずる|puzzle|将棋|囲碁/.test(q)) want.push("magichainparty", "magidiamond", "magiarena");
  if (/こわ|怖|ほらー|horror|恐/.test(q)) want.push("magimanor");
  if (/rpg|冒険|物語|すとーりー|story|育成/.test(q)) want.push("magibattle", "magicraft", "magiburst");
  if (/かじの|casino|すろっと|slot|ぽーかー|poker|るーれっと|roulette|びんご|bingo|ばから|かーど|とらんぷ|ちっぷ|かけ|ばくち|じゃっくぽっと/.test(q))
    want.push("magijackpot");
  if (/勉強|学習|べんきょう|覚え|暗記|試験|受験|宿題/.test(q)) want.push("xevynar", "magilex", "magifocus");
  if (/ai|えーあい|相談|そうだん|質問|しつもん|プラン|計画|管理|タイマー/.test(q)) want.push("xevynar", "magifocus");
  if (/株|投資|相場|銘柄|資産/.test(q)) want.push("magiportfolio");
  if (/音楽|bgm|曲|おんがく/.test(q)) want.push("magimusic");
  if (/やきゅう|野球|よみあい/.test(q)) want.push("magidiamond");
  if (/作る|つくる|建て|くらふと|creative/.test(q)) want.push("magicraft", "magitier");

  const ids = [...new Set(want)].filter((id) => xhApp(id));
  if (!ids.length) return null;
  const picks = ids.slice(0, 4).map(xhApp);
  return {
    html: "こんなアプリはいかがでしょう。<br>" +
      picks.map((a) => "▶ <b>" + xhEscape(xhFullName(a)) + "</b> — " + xhEscape(a.sub)).join("<br>"),
    chips: picks.map((a) => [xhFullName(a), "xhOpenApp('" + a.id + "','" + a.href + "')"])
      .concat([["すべてのアプリ", "xhOpenAllApps()"]])
  };
}

/* アプリ名の直接ヒット（略称・ひらがな表記にも対応） */
const XH_APP_ALIAS = {
  xevynar: ["ぜびなー", "ぜヴぃなー", "xevynar", "えーあい", "あい", "ai", "あしすたんと", "そうだん", "相談"],
  magilex: ["まじれっくす", "れっくす", "lex", "単語帳", "たんごちょう"],
  magiburst: ["まじばーすと", "ばーすと", "burst", "ひっぱり", "引っぱり"],
  magibattle: ["まじばとる", "ばとる", "battle"],
  magichainparty: ["ちぇいんぱーてぃ", "ちぇいん", "chainparty", "れんさ", "連鎖"],
  magiempire: ["えんぱいあ", "empire", "くにとり", "国盗り", "ぱっくまん"],
  magiportfolio: ["ぽーとふぉりお", "portfolio", "もちかぶ", "持ち株"],
  magiranking: ["らんきんぐ", "ranking", "じゅんい", "順位"],
  magicraft: ["くらふと", "craft", "ぼくせる", "まいくら"],
  magimanor: ["まなー", "manor", "ようかん", "洋館"],
  ordyxis: ["おるでぃくしす", "ordyxis", "ちゅうもん", "注文", "おーだー"],
  magiarena: ["ありーな", "arena", "おせろ", "ごもくならべ"],
  magidiamond: ["だいやもんど", "diamond", "やきゅうばん", "野球盤"],
  magijackpot: ["じゃっくぽっと", "jackpot", "かじの", "casino", "すろっと", "slot", "るーれっと", "ぽーかー", "びんご", "ぶらっくじゃっく"],
  magifocus: ["ふぉーかす", "focus"],
  magimusic: ["みゅーじっく", "music", "おんがくぷれいやー"],
  magitier: ["てぃあ", "tier", "てぃあひょう"],
  magilink: ["まじりんく", "link", "ちゃっと", "chat", "めっせーじ"],
  ngx: ["ngx"],
  ishida: ["いしだ", "ishida"],
  magicalfuture: ["まじかるふゅーちゃー", "magicalfuture", "ふゅーちゃー", "まじかる"],
};
/* サービスを終了したアプリ名が文中にあれば、その正式名を返す。
   ★ 英字表記だけでは「ファイナンスは？」のようなカタカナの呼び方に当たらないので、
     日本語での呼ばれ方も持っておく。 */
const XH_RETIRED_ALIAS = {
  MagiResonance: ["レゾナンス", "resonance"],
  MagiShareCore: ["シェアコア", "sharecore"],
  MagiTriad: ["トライアド", "triad"],
  MagiMuse: ["ミューズ", "muse"],
  MagiFinance: ["ファイナンス", "finance", "株価", "かぶか"],
  MagiSports: ["スポーツ", "sports"],
};
function xhAiRetired(raw) {
  const q = xhAiNorm(raw);
  return Object.keys(XH_RETIRED).map((id) => XH_RETIRED[id])
    .find((nm) => {
      const cands = [nm, nm.replace(/^Magi/, "")].concat(XH_RETIRED_ALIAS[nm] || []);
      return cands.some((c) => { const n = xhAiNorm(c); return n.length >= 4 && q.indexOf(n) >= 0; });
    }) || null;
}

function xhAiMatchApp(raw) {
  const q = xhAiNorm(raw);
  let best = null, bestLen = 0;
  for (const a of XH_APPS) {
    const cands = [xhFullName(a), a.name].concat(XH_APP_ALIAS[a.id] || []);
    for (const c of cands) {
      const n = xhAiNorm(c);
      if (n.length >= 3 && q.indexOf(n) >= 0 && n.length > bestLen) { best = a; bestLen = n.length; }
    }
  }
  return best;
}

/* ══════════════ 話題のルール（スコア式のあいまい一致） ══════════════ */
const XH_AI_RULES = [
  { id: "greet", k: ["こんにちは", "こんばんは", "おはよう", "やあ", "hello", "hi", "はじめまして", "ただいま", "おつかれ"],
    f: () => xhAiGreet() },
  { id: "bye", k: ["おやすみ", "またね", "ばいばい", "さようなら", "bye"], f: () => ({
      html: "おやすみなさい！ 今日もおつかれさまでした。<br>また明日、ログインボーナスでお待ちしています 🌙",
      chips: [["明日の計画を立てる", "xhAiAsk('60分 勉強のプラン')"]] }) },
  { id: "status", k: ["状況", "ステータス", "いまの", "今の", "残高", "どれくらい持って", "確認", "所持"],
    f: () => xhAiStatus() },
  { id: "today", k: ["今日", "きょう", "なにする", "何する", "おすすめ", "やること", "暇", "ひま", "退屈"],
    f: () => xhAiToday() },
  /* 勉強の相談は XEVYNAR へ引き継ぐ（案内役は中身に立ち入らない） */
  { id: "study", k: ["勉強", "学習", "べんきょう", "復習", "テスト", "受験", "英単語", "英語", "物理", "化学", "古文", "数学",
                     "歴史", "生物", "計画", "プラン", "暗記", "演習", "宿題"], f: (q) => xhAiStudyPlan(q) },
  { id: "timer", k: ["タイマー", "timer", "アラーム", "alarm", "ポモドーロ", "はかって", "測って", "計って",
                     "カウントダウン", "起こして", "知らせて", "セット", "何分"], f: (q) => xhAiTimerIntent(q) },
  { id: "xeva", k: ["xeva", "ゼヴァ", "入手", "稼", "増やし", "貯め", "お金", "通貨", "無料"], f: () => ({
      html: "XEVA の増やし方はこの4つが基本です。<br>" +
        "① <b>毎日ログイン</b>（+50、7日連続でボーナスアップ）<br>" +
        "② <b>ミッション</b>（スターター・ログイン・期間限定・コレクション）<br>" +
        "③ <b>各アプリのプレイ</b>（MagiLex の学習、MagiBurst のクエストなど）<br>" +
        "④ <b>MagiRanking の月間順位</b>（最大 1,000 XEVA）<br>" +
        "いまの残高は <b>" + xhAiBal().toLocaleString() + " XEVA</b>。" +
        (xhAiMissionOpen().claimable ? "<br>受け取れる報酬が <b>" + xhAiMissionOpen().claimable + "件</b> あります！" : ""),
      chips: [["入手方法ガイド", "xhOpenXevaGuide()"], ["ミッション", "xhTapMission()"], ["メール", "xhTapMail()"]] }) },
  { id: "gem", k: ["ジェム", "じぇむ", "gem", "ダイヤ", "だいや", "宝石"], f: () => ({
      html: '<img class="xv-gemico" src="gem.png" alt="ジェム"> <b>ジェム</b>は XEVARION 共通のプレミアム通貨です。' +
        "MagiBurst のガチャ、MagiJackpot のベット、各アプリの特別なアイテムに使えます。<br>" +
        "いまの所持は <b>" + xhGemBal().toLocaleString() + " ジェム</b>。<br>" +
        "おもな入手先は <b>XEVA からの交換（" + xhGemRate().toLocaleString() + " XEVA ＝ 1・ドル円連動）</b>・クエストの初クリア・ミッション・メールです。",
      chips: [["入手方法をくわしく", "xhOpenGemGuide()"], ["MagiBurst で交換", "xhOpenApp('magiburst','MagiBurst/index.html')"],
              ["MagiJackpot", "xhOpenApp('magijackpot','MagiJackpot/index.html')"]] }) },
  { id: "mission", k: ["ミッション", "任務", "デイリー", "報酬"], f: () => {
      const m = xhAiMissionOpen();
      return { html: "ミッションは <b>" + m.done + " / " + m.total + "</b> 達成。" +
        (m.claimable ? "受け取れる報酬が <b>" + m.claimable + "件</b> あります。" : "") +
        (m.next.length ? "<br>次のおすすめ：<br>" + m.next.map((x) => "▶ " + xhEscape(x.title) + "（+" + x.reward + "）").join("<br>") : ""),
        chips: [["ミッションを開く", "xhTapMission()"]] }; } },
  { id: "mail", k: ["メール", "プレゼント", "受け取", "ギフト", "配布"], f: () => {
      const n = xhAiMailUnread();
      return { html: n ? "未受取のメールが <b>" + n + "件</b> あります。「すべて受け取る」でまとめて受け取れます。"
                       : "未受取のメールはありません。",
        chips: [["メールを開く", "xhTapMail()"]] }; } },
  { id: "friend", k: ["フレンド", "友達", "ともだち", "招待", "合流", "一緒に", "部屋番号"], f: () => ({
      html: "フレンドは <b>XEVARION アカウント</b> に紐づきます（端末を変えても残ります）。" +
            "オンラインのフレンドが部屋を開いていれば、<b>部屋番号を聞かずに「参加」</b>で合流できます。" +
            "いまのフレンドは <b>" + xhAiFriends() + "人</b>。",
      chips: [["コミュニティへ", "xhGo('community')"], ["みんなで遊べるアプリ", "xhAiAsk('みんなで遊べるゲーム')"]] }) },
  { id: "gacha", k: ["ガチャ", "召喚", "gacha", "確定", "天井", "排出", "10連"], f: () => ({
      html: "ガチャで新しいキャラクターを仲間にできます。いまの残高は <b>" + xhAiBal().toLocaleString() + " XEVA</b>。" +
            "<br>まずはミッション報酬とログインボーナスで回数を貯めるのが近道です。",
      chips: [["ガチャへ", "xhGo('gacha')"], ["図鑑を見る", "xhGo('chars')"], ["XEVAを増やす", "xhAiAsk('XEVAの増やし方')"]] }) },
  { id: "chars", k: ["図鑑", "キャラ", "コレクション", "推し", "アイコン"], f: () => ({
      html: "いま <b>" + xhOwnedChars().length + "体</b> のキャラクターを持っています。" +
            "お気に入りはホームのショーケースに並べられます。",
      chips: [["図鑑へ", "xhGo('chars')"], ["お気に入りを選ぶ", "xhOpenShowcase()"]] }) },
  { id: "ranking", k: ["ランキング", "順位", "ranking", "1位", "月間"], f: () => ({
      html: "月間 XEVA 獲得ランキングは <b>MagiRanking</b>。月末の順位に応じて賞金 XEVA がもらえます。",
      chips: [["MagiRanking", "xhOpenApp('magiranking','MagiRanking/index.html')"], ["コミュニティ", "xhGo('community')"]] }) },
  { id: "event", k: ["イベント", "開催", "フェス", "キャンペーン", "期間限定"], f: () => {
      const ev = xhAiEvents();
      if (!ev.length) return { html: "いま開催中のイベントはありません。" };
      return { html: "開催中のイベントは <b>" + ev.length + "件</b>：<br>" +
        ev.map((e) => "🎉 <b>" + xhEscape(e.t1) + "</b> — " + xhEscape(e.t2) + (e.perm ? "（常設）" : "（〜" + e.to.slice(5).replace("-", "/") + "）")).join("<br>"),
        chips: ev.slice(0, 3).map((e) => [e.t1, "xhOpenApp('','" + e.href + "')"]) }; } },
  { id: "sort", k: ["並び", "順番", "並べ替", "整理", "カスタ", "ホーム画面"], f: () => ({
      html: "ホームに並ぶアプリの順番は、☰ をつまんでスライドで自由に変えられます。上から11個がホームに並びます。",
      chips: [["並び替えを開く", "xhOpenSort()"]] }) },
  { id: "offline", k: ["オフライン", "機内", "電波", "圏外", "インストール", "ダウンロード", "アプリ化", "ホームに追加"], f: () => ({
      html: "XEVARION をインストールすると、<b>MagiLex ／ MagiBurst ／ MagiChainParty ／ XEVYNAR ／ MagiJackpot</b> は機内モードでも遊べます。" +
            "オフライン中の記録は、オンライン復帰時にクラウドへ反映されます。",
      chips: [["インストール方法", "xhInstallApp()"], ["オフライン設定", "xhOpenOfflineInfo()"]] }) },
  { id: "company", k: ["会社", "運営", "概要", "問い合わせ", "提携", "だれが作", "誰が作"], f: () => ({
      html: "XEVARION は <b>NGX</b> が開発・運営し、<b>Magical Future</b> 社と技術提携、" +
            "<b>ISHIDA Production</b> と製作パートナー契約を結んでいます。",
      chips: [["会社概要", "location.href='about.html'"], ["NGX公式", "xhOpenApp('ngx','NGX/NGX_website.html')"],
              ["Magical Future", "xhOpenApp('magicalfuture','MagicalFuture/index.html')"]] }) },
  { id: "settings", k: ["設定", "名前を変え", "アイコンを変え", "パスワード", "ログアウト", "アカウント"],
    f: () => ({ html: "設定を開きますね。", act: "xhOpenSettings()" }) },
  { id: "news", k: ["お知らせ", "ニュース", "更新", "アップデート", "新機能", "バージョン"],
    f: () => ({ html: "お知らせを開きますね。", act: "xhTapNews()" }) },
  { id: "trouble", k: ["開かない", "動かない", "重い", "バグ", "エラー", "消えた", "できない", "同期", "落ちる"], f: () => ({
      html: "うまく動かないときは、この順で試してみてください。<br>" +
        "① <b>お知らせ</b>に不具合情報が出ていないか確認<br>" +
        "② いったんホームに戻って開き直す（データはアカウントに残ります）<br>" +
        "③ <b>設定 → 更新</b> で最新データを取り込む<br>" +
        "④ オフラインなら電波の良いところで開き直す（記録は復帰時に反映）",
      chips: [["お知らせを見る", "xhTapNews()"], ["設定を開く", "xhOpenSettings()"], ["オフライン設定", "xhOpenOfflineInfo()"]] }) },
  { id: "cheer", k: ["疲れ", "つかれ", "しんどい", "つらい", "やる気", "眠い", "ねむい", "無理", "だるい", "集中できない", "さぼり"], f: () => ({
      html: "よく頑張っています。ここは <b>5分だけ</b> にしましょう。<br>" +
            "短くても「やった」という事実が残れば、明日のハードルが下がります。",
      chips: [["⏱ 5分だけやる", "xhAiTimer(300,'5分だけ')"], ["⏱ 10分休憩する", "xhAiTimer(600,'休憩')"],
              ["軽いゲームで気分転換", "xhAiAsk('短時間で遊べるゲーム')"]] }) },
  { id: "thanks", k: ["ありがと", "thanks", "助かった", "すごい", "うれしい", "感謝"], f: () => ({
      html: "どういたしまして！ またいつでも呼んでください。",
      chips: [["今日のおすすめ", "xhAiAsk('今日なにする')"]] }) },
  { id: "who", k: ["だれ", "誰", "あなたは", "自己紹介", "きみは"], f: () => ({
      html: "わたしは <b>Magi AI Assistant</b>。XEVARION の<b>案内役</b>です。<br>" +
            "「どのアプリで遊べばいい？」「XEVA はどう増やす？」「あれはどこにある？」に答えて、目的の場所までお連れします。<br>" +
            "勉強の中身や、アプリの攻略・編成といった<b>くわしい話は <b>XEVYNAR</b> の担当</b>なので、そちらへおつなぎしますね。",
      chips: [["できること", "xhAiAsk('できること')"], ["XEVYNAR を開く", "xhOpenApp('xevynar','XEVYNAR/index.html')"]] }) },
  { id: "xevynar", k: ["ぜびなー", "xevynar", "学習ai", "がくしゅうai"], f: () => ({
      html: "<b>XEVYNAR</b> は XEVARION の学習AIです。<br>" +
        "・勉強のプラン／自由に設定できるタイマー（科目の入力は不要）<br>" +
        "・わからない問題の解説、MagiLex の<b>苦手問題づくり</b><br>" +
        "・MagiBurst の編成・ギミック対策・勝てないときのコツ<br>" +
        "・XEVARION の各アプリについての質問<br>" +
        "わたしよりずっとくわしいので、中身の相談はぜひこちらへ。",
      chips: [["XEVYNAR を開く", "xhOpenApp('xevynar','XEVYNAR/index.html')"]] }) },
  { id: "help", k: ["できること", "なにができ", "何ができ", "使い方", "ヘルプ", "help", "つかいかた"], f: () => ({
      html: "わたしは<b>案内役</b>です。できることの一例：<br>" +
        "・<b>状況を確認</b>（XEVA・ジェム・キャラ・ミッション・メール・フレンド）<br>" +
        "・<b>今日のおすすめ</b>を出す<br>" +
        "・<b>アプリを探す／開く</b>（例「3人で遊べるゲーム」「MagiBurst 開いて」）<br>" +
        "・<b>タイマー</b>（例「1時間30分はかって」「21時に起こして」）— 何本でも同時にOK<br>" +
        "・<b>計算</b>（例「128*7」）、サイコロ、いまの時刻<br>" +
        "・イベント・並び替え・オフライン・不具合の相談<br>" +
        "勉強の中身や、アプリの攻略・編成は <b>XEVYNAR</b> におつなぎします。",
      chips: [["状況を見る", "xhAiAsk('状況')"], ["3人で遊べるゲーム", "xhAiAsk('3人で遊べるゲーム')"],
              ["1時間30分はかって", "xhAiAsk('1時間30分はかって')"], ["XEVYNAR を開く", "xhOpenApp('xevynar','XEVYNAR/index.html')"]] }) },
  { id: "applist", k: ["全部のアプリ", "アプリ一覧", "どんなアプリ", "なにがある", "何がある", "ほかのアプリ"], f: () => ({
      html: "XEVARION には <b>" + XH_APPS.length + "個</b> のアプリがあります。カテゴリで絞り込めます。",
      chips: [["すべてのアプリ", "xhOpenAllApps()"]] }) },
];

function xhAiGreet() {
  const acc = xhAcc() || {};
  const h = new Date().getHours();
  const g = h < 5 ? "こんばんは" : h < 11 ? "おはようございます" : h < 18 ? "こんにちは" : "こんばんは";
  const m = xhAiMissionOpen(), mail = xhAiMailUnread();
  const extra = (m.claimable || mail)
    ? "<br>受け取れるものが <b>" + (m.claimable + mail) + "件</b> あります！"
    : "";
  const tm = _xhTimers.length ? "<br>⏱ タイマーが <b>" + _xhTimers.length + "件</b> 動いています。" : "";
  return {
    html: g + "、<b>" + xhEscape(acc.name || "XEVARION") + "</b> さん！" + extra + tm +
          "<br>今日は何をお手伝いしましょうか？",
    chips: [["今日のおすすめ", "xhAiAsk('今日なにする')"], ["いまの状況", "xhAiAsk('状況')"],
            ["勉強プランを作る", "xhAiAsk('30分 勉強')"], ["できること", "xhAiAsk('できること')"]]
  };
}

/* ══ 返事を組み立てる ══ */
let _xhAiCtx = { follow: null, topic: null };

function xhAiRespond(text) {
  const raw = String(text || "");
  const q = xhAiNorm(raw);
  if (!q) return { html: "なんでも話しかけてください。「25分はかって」「3人で遊べるゲーム」など。" };

  /* ① 「はい」「おねがい」など、直前の提案への返事 */
  if (/^(はい|うん|ok|おねがい|お願い|やって|そうする|それで|よろしく|いいよ|うい)$/.test(q) && _xhAiCtx.follow)
    return { html: "承知しました。", act: _xhAiCtx.follow, silent: true };
  if (/^(いいえ|いらない|やめる|大丈夫|だいじょうぶ|no)$/.test(q))
    return { html: "わかりました。ほかに何かあれば言ってください。" };

  /* ② タイマー系は最優先（「25分」だけでも拾えるように） */
  const wantsTimer = /たいまー|timer|あらーむ|alarm|ぽもどーろ|pomodoro|はかっ|測っ|計っ|かうんとだうん|起こし|知らせ|通知して/.test(q);
  const studyish = /勉強|学習|べんきょう|復習|計画|ぷらん|plan|えいご|英語|英単語|物理|化学|古文|国語|数学|歴史|生物|暗記|演習|宿題|受験|てすと/.test(q);
  if (wantsTimer || (!studyish && xhAiParseDuration(raw) && xhAiIsBareTime(raw)))
    return xhAiTimerIntent(raw);
  if (/^(あと(なんぷん|どれくらい|どのくらい)|のこりじかん|残り時間)/.test(q)) return xhAiTimerList();

  /* ③ 計算・ちょっとした道具 */
  const calc = xhAiCalc(raw);
  if (calc) return calc;
  if (/さいころ|だいす|dice|こいん|coin|らんだむ|random|どっちがいい|どれがいい|どれにしよう|なにしよう/.test(q)) return xhAiDice(raw);
  if (/^(いま|今)?(なんじ|何時(?!間)|時刻|ひづけ|日付|何日)/.test(q)) return xhAiNow();

  /* ④ アプリ名の直接ヒット。
     「開いて」なら案内役の仕事。「編成は？」「勝てない」のように中身へ踏み込む質問は
     XEVYNAR の担当なので、ここで生半可に答えず引き継ぐ。 */
  const app = xhAiMatchApp(raw);
  const DEEP = /へんせい|編成|ぱーてぃ編成|こうりゃく|攻略|かてな|勝てな|かちかた|勝ち方|ぎみっく|あんち|たいさく|対策|くりあ|clear|おすすめきゃら|どのきゃら|つよい|強い|よわてん|弱点|しゅうとく|習得|にがて|苦手|もんだい|問題|かいせつ|解説|とき方|解き方|しかた|やりかた|やり方|こつ|コツ|るーる|遊び方|あそびかた/;
  if (app) {
    const open = /ひらい|開い|起動|やりた|やる|いきた|行きた|ひらく|開く|すたーと|start|遊びた|遊ぶ/.test(q);
    if (DEEP.test(q) && !open) return xhAiAppDeep(raw, xhFullName(app));
    if (open) return { html: "<b>" + xhEscape(xhFullName(app)) + "</b> を開きますね。",
      act: "xhOpenApp('" + app.id + "','" + app.href + "')" };
    return { html: "<b>" + xhEscape(xhFullName(app)) + "</b>（" + xhEscape(app.sub) + "）ですね。<br>" + xhEscape(app.desc),
      chips: [["開く", "xhOpenApp('" + app.id + "','" + app.href + "')"],
              ["くわしくは XEVYNAR に", "xhAiAsk('" + xhAiQuote(xhFullName(app)) + " のコツ')"]],
      ctx: { follow: "xhOpenApp('" + app.id + "','" + app.href + "')" } };
  }
  /* ④-a サービスを終了したアプリを聞かれたら、そのことをはっきり答える。
     一覧から消しただけだと「無くなった？」に何も答えられなくなる。 */
  const dead = xhAiRetired(raw);
  if (dead) {
    return {
      html: "<b>" + xhEscape(dead) + "</b> は <b>" + XH_RETIRED_ON.replace(/-/g, "/") + "</b> をもって<b>サービスを終了</b>しました。<br>" +
        "獲得済みの XEVA・ジェム・キャラクターはそのまま残っていて、ほかのアプリで使えます。",
      chips: [["いま遊べるアプリ", "xhOpenAllApps()"], ["お知らせを見る", "xhTapNews()"]],
    };
  }

  /* ④-b アプリ名が出ていなくても、明らかに「中身」の相談なら XEVYNAR へ。
     ただし XEVA・ジェム・ミッションなど *ポータルの案内* は自分の担当なので、
     「教えて」が付いていても横取りしない。 */
  const PORTAL_TOPIC = /xeva|ぜゔぁ|ゼヴァ|じぇむ|ジェム|gem|みっしょん|ミッション|めーる|メール|がちゃ|ガチャ|らんきんぐ|ふれんど|いべんと|せってい|設定|なみ|並び|おふらいん|いんすとーる|かいしゃ|会社|おしらせ|お知らせ|あぷり/;
  /* MagiBurst のクエスト・編成の話は、アプリ名が出ていなくても XEVYNAR の担当 */
  /* ★ xhAiNorm はカタカナだけをひらがなに直す（漢字はそのまま）。
     「重力バリア」は "重力ばりあ" になるので、<b>漢字混じりの形</b>も書いておかないと当たらない。 */
  const BURST_TOPIC = /だい\d+のま|第\d+の間|のその|ノ園|おうじょう|王城|めいきゅう|迷宮|ていえん|庭園|へんせい|編成|ぎみっく|ぎみつく|あんち|くえすと|こうりん|降臨|だめーじうぉーる|じらい|地雷|わーぷ|重力ばりあ|じゅうりょくばりあ|ろっくぞーん|ますいーぱー|ふるばーすと|りんくすきる|るーん|えーてる|弱点こあ|じゃくてんこあ/;
  if (BURST_TOPIC.test(q) || BURST_TOPIC.test(raw)) return xhAiAppDeep(raw, "MagiBurst");
  if (!PORTAL_TOPIC.test(q) &&
      (studyish || /わからな|分からな|なぜ|なんで|どうして|解説|かいせつ|問題を|出題|克服|とき方|解き方/.test(q)))
    return xhAiToXevynar(raw);

  /* ⑤ 話題ルールをスコアで比べて、いちばん近いものを選ぶ */
  let best = null, bestScore = 0;
  for (const r of XH_AI_RULES) {
    let sc = 0;
    for (const k of r.k) {
      const n = xhAiNorm(k);
      if (n && q.indexOf(n) >= 0) sc += n.length + (q === n ? 5 : 0);
    }
    if (sc > bestScore) { bestScore = sc; best = r; }
  }

  /* ⑥ 状況からアプリを勧める。
     ただし「勉強」「タイマー」など、答えがはっきりしている話題はルールを優先する。 */
  const picks = xhAiPickApps(raw);
  const STRONG = ["study", "timer", "help", "xeva", "gem", "xevynar", "mission", "mail", "status", "today",
                  "cheer", "trouble", "settings", "news", "gacha", "ranking", "event", "friend"];
  if (picks && (!best || (bestScore < 5 && STRONG.indexOf(best.id) < 0))) return picks;
  if (best) { const res = best.f(raw) || {}; res.topic = best.id; return res; }
  if (picks) return picks;

  /* ⑦ 分からないときも、必ず次の一手を出す */
  return {
    html: "うまく聞き取れませんでした。こんな言い方だと確実です：<br>" +
      "・「<b>25分はかって</b>」「<b>1時間30分タイマー</b>」<br>" +
      "・「<b>30分 英語</b>」「<b>3人で遊べるゲーム</b>」<br>" +
      "・「<b>XEVAの増やし方</b>」「<b>いまの状況</b>」",
    chips: [["できること", "xhAiAsk('できること')"], ["今日のおすすめ", "xhAiAsk('今日なにする')"],
            ["いまの状況", "xhAiAsk('状況')"], ["すべてのアプリ", "xhOpenAllApps()"]]
  };
}

function xhAiPush(who, html, chips) {
  const log = xhEl("xhAiLog"); if (!log) return;
  const row = document.createElement("div");
  row.className = "xh-msgrow " + who;
  row.innerHTML = '<div class="xh-bub">' + (html || "") +
    (chips && chips.length ? '<div class="xh-chips">' + chips.map(([lb, act]) =>
      '<button onclick="' + xhEscape(act).replace(/&#39;/g, "'") + '">' + xhEscape(lb) + "</button>").join("") + "</div>" : "") +
    "</div>";
  log.appendChild(row);
  const body = log.parentElement;
  if (body) setTimeout(() => { body.scrollTop = body.scrollHeight; }, 30);
}

/* 「入力中…」の吹き出し */
function xhAiTyping(on) {
  const log = xhEl("xhAiLog"); if (!log) return;
  const old = xhEl("xhAiTypingRow");
  if (!on) { if (old) old.remove(); return; }
  if (old) return;
  const row = document.createElement("div");
  row.id = "xhAiTypingRow";
  row.className = "xh-msgrow ai";
  row.innerHTML = '<div class="xh-bub xh-typing"><i></i><i></i><i></i></div>';
  log.appendChild(row);
  const body = log.parentElement;
  if (body) setTimeout(() => { body.scrollTop = body.scrollHeight; }, 20);
}

/* 入力欄の上に出す、その場に合わせたおすすめの言い方 */
function xhAiQuickChips() {
  const box = xhEl("xhAiQuick"); if (!box) return;
  const c = [];
  if (_xhTimers.length) c.push(["⏱ タイマー確認", "xhAiAsk('タイマー一覧')"]);
  const m = xhAiMissionOpen();
  if (m.claimable) c.push(["🎯 報酬を受け取る", "xhTapMission()"]);
  if (xhAiMailUnread()) c.push(["📬 メール", "xhTapMail()"]);
  c.push(["3人で遊べるゲーム", "xhAiAsk('3人で遊べるゲーム')"]);
  c.push(["XEVAの増やし方", "xhAiAsk('XEVAの増やし方')"]);
  c.push(["ジェムって何？", "xhAiAsk('ジェム')"]);
  c.push(["25分はかって", "xhAiAsk('25分はかって')"]);
  c.push(["いまの状況", "xhAiAsk('状況')"]);
  c.push(["勉強の相談（XEVYNAR）", "xhOpenApp('xevynar','XEVYNAR/index.html')"]);
  box.innerHTML = c.map(([lb, act]) =>
    '<button onclick="' + xhEscape(act).replace(/&#39;/g, "'") + '">' + xhEscape(lb) + "</button>").join("");
}

function xhOpenAi() {
  const log = xhEl("xhAiLog");
  if (log && !log.children.length) { const g = xhAiGreet(); xhAiPush("ai", g.html, g.chips); }
  xhAiQuickChips();
  xhOpenSheet("xhAiSheet");
  setTimeout(() => { try { xhEl("xhAiInp").focus(); } catch (e) {} }, 260);
}
window.xhOpenAi = xhOpenAi;

/* 画面を移すアクションは、シートを閉じてから実行する */
const XH_AI_LEAVE = /xhOpenApp|xhGo\(|location\.href|xhOpenSettings|xhTapNews|xhTapMail|xhTapMission|xhOpenAllApps|xhOpenSort|xhOpenShowcase|xhOpenOfflineInfo|xhInstallApp|xhOpenXevaGuide/;

function xhAiAsk(text) {
  xhAiPush("me", xhEscape(text));
  const res = xhAiRespond(text) || {};
  _xhAiCtx.topic = res.topic || _xhAiCtx.topic;
  _xhAiCtx.follow = (res.ctx && res.ctx.follow) || null;
  xhAiTyping(true);
  setTimeout(() => {
    xhAiTyping(false);
    if (!(res.silent && res.act)) xhAiPush("ai", res.html, res.chips);
    if (res.act) {
      const run = () => { try { eval(res.act); } catch (e) {} };
      if (XH_AI_LEAVE.test(res.act)) setTimeout(() => { xhCloseSheet("xhAiSheet"); run(); }, 620);
      else run();
    }
    xhAiQuickChips();
  }, 340);
}
window.xhAiAsk = xhAiAsk;

function xhAiSend() {
  const inp = xhEl("xhAiInp"); if (!inp) return;
  const v = inp.value.trim();
  if (!v) return;
  inp.value = "";
  xhAiAsk(v);
}
window.xhAiSend = xhAiSend;

/* 音声入力（対応端末のみ） */
let _xhRec = null;
function xhAiMic() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const btn = xhEl("xhMic");
  if (!SR) { xhAiPush("ai", "この端末は音声入力に対応していません。キーボードで話しかけてください。"); return; }
  if (_xhRec) { try { _xhRec.stop(); } catch (e) {} _xhRec = null; if (btn) btn.classList.remove("rec"); return; }
  const r = new SR();
  r.lang = "ja-JP"; r.interimResults = false; r.maxAlternatives = 1;
  r.onresult = (e) => { xhAiAsk(e.results[0][0].transcript); };
  r.onerror = () => xhToast("音声を聞き取れませんでした");
  r.onend = () => { _xhRec = null; if (btn) btn.classList.remove("rec"); };
  try { r.start(); _xhRec = r; if (btn) btn.classList.add("rec"); }
  catch (e) { xhToast("マイクを利用できません"); }
}
window.xhAiMic = xhAiMic;

/* ページを開き直しても、動いているタイマーは続きから表示する */
if (document.body) xhTimerLoad();
else document.addEventListener("DOMContentLoaded", xhTimerLoad, { once: true });

/* ══════════════ スワイプ（イベントバナー） ══════════════ */
function xhBindSwipe() {
  const ev = xhEl("xhEvent"); if (!ev) return;
  let x0 = 0, y0 = 0, on = false, moved = false;
  ev.addEventListener("touchstart", (e) => { const t = e.touches[0]; x0 = t.clientX; y0 = t.clientY; on = true; moved = false; }, { passive: true });
  ev.addEventListener("touchmove", () => { moved = true; }, { passive: true });
  ev.addEventListener("touchend", (e) => {
    if (!on) return; on = false;
    const t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0;
    if (moved && Math.abs(dx) > 36 && Math.abs(dx) > Math.abs(dy)) xhEvGo(_xhEvIdx + (dx < 0 ? 1 : -1));
    else if (Math.abs(dx) < 12 && Math.abs(dy) < 12) xhTapEvent();
  }, { passive: true });
  ev.addEventListener("click", (e) => { if (!("ontouchstart" in window)) xhTapEvent(); });
}

/* ══════════════ 画面のちらつき防止 ══════════════
   アプリへ移動して戻ってくると、ブラウザが bfcache から「離れる直前の古い画面」を
   一瞬表示してしまう（xeva-cloud.js はその直後に reload する）。
   離脱時にスプラッシュで覆っておき、bfcache 復帰時は覆ったままにすることで、
   古い XEVARION が一瞬見えるのを防ぐ。 */
(function xhCoverOnLeave() {
  const cover = document.createElement("div");
  cover.id = "xhCover";
  cover.innerHTML =
    '<img src="brand-xevarion-orb.png" alt="">' +
    '<span class="w">XEVARION</span>' +
    '<i class="sp"></i>';
  const put = () => { if (document.body && !document.getElementById("xhCover")) document.body.appendChild(cover); };
  if (document.body) put(); else document.addEventListener("DOMContentLoaded", put, { once: true });

  const on = () => { put(); cover.classList.add("on"); };
  const off = () => cover.classList.remove("on");

  /* 離脱（アプリへ移動 / タブを閉じる）時に覆う */
  window.addEventListener("pagehide", on);
  window.addEventListener("beforeunload", on);
  /* bfcache から戻ったときは覆ったまま（この直後に reload が走る）。
     通常の表示や、reload されなかった場合は少し待って外す。 */
  window.addEventListener("pageshow", (e) => {
    if (e && e.persisted) { on(); setTimeout(off, 2600); }
    else off();
  });
})();

/* ══════════════ 起動 ══════════════ */
let _xhShown = false;
function xhShow() {
  const home = xhEl("xhome"); if (!home) return;
  document.body.classList.add("xh-mode");
  home.classList.add("on");
  if (!_xhShown) {
    _xhShown = true;
    xhStartStars();
    xhRenderEvents();
    xhBindSwipe();
    xhWatchBadges();
    /* 初回だけ「アプリとして入れられます」を案内（インストール済みなら出さない） */
    setTimeout(() => { try { xhOpenInstallHint(false); } catch (e) {} }, 1800);
    /* ★ 更新の確認が先。保留の更新があるときは自動ダウンロードせず、
       「サイズと更新内容を見せて → 同意 → ダウンロード」の順にする。 */
    setTimeout(() => {
      xhCheckUpdate().then((pending) => {
        if (!pending && xhOnline()) xhRegisterAppSWs();
      }).catch(() => { if (xhOnline()) xhRegisterAppSWs(); });
    }, 1200);
  }
  xhRenderShelf();
  xhRenderProfile();
  xhRenderXeva();
  xhRenderShopBadge();
  xhRenderGemRate();
  xhApplyOfflineLocks();
  xhSyncBadges();
  xhConsumeHash();
  /* ★ 2026-08-12b 下バーの中身を実測で画面の下端に合わせる（xevarion.js の fitBar）。
     ホームは表示されて初めて測れるので、開いた直後に何回か測り直す。 */
  try { window.xhFitBar && window.xhFitBar(); } catch (e) {}
  [60, 220, 600, 1400].forEach((ms) => setTimeout(() => { try { window.xhFitBar && window.xhFitBar(); } catch (e) {} }, ms));
}
window.xhShow = xhShow;

/* 他アプリから #exchange / #shop 付きで戻ってきたら、その画面を開いてあげる。
   （MagiBurst・MagiJackpot の「変換所はホームへ移動しました」からの導線） */
function xhConsumeHash() {
  const h = (location.hash || "").replace("#", "").toLowerCase();
  if (h !== "exchange" && h !== "shop") return;
  try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
  setTimeout(() => { if (h === "shop") xhOpenShop(); else xhOpenExchange(); }, 420);
}
function xhHide() {
  const home = xhEl("xhome"); if (home) home.classList.remove("on");
  document.body.classList.remove("xh-mode");
}
window.xhHide = xhHide;

/* runPortalBoot（アクセス画面タップ後）をラップしてホームを表示 */
(function hookBoot() {
  const orig = window.runPortalBoot;
  window.runPortalBoot = function () {
    try { if (typeof orig === "function") orig.apply(this, arguments); } catch (e) {}
    xhShow();
  };
  const origHide = window.hideXevaHome;
  window.hideXevaHome = function () {
    try { if (typeof origHide === "function") origHide.apply(this, arguments); } catch (e) {}
    if (_xhShown) xhShow();
  };
  // 新規登録ウィザードを閉じたあと（＝アカウント作成直後）もホームへ入る。
  const origCloseWz = window.closeAccWizard;
  window.closeAccWizard = function () {
    try { if (typeof origCloseWz === "function") origCloseWz.apply(this, arguments); } catch (e) {}
    try { sessionStorage.setItem("xeva_accessed", "1"); } catch (e) {}
    if (typeof enterPortal === "function") enterPortal(); else xhShow();
  };
  /* ★ 2026-08-12c 保険。runPortalBoot が「包む前」に呼ばれていた場合は
     _portalEntered が立っているだけでホームが出ていない（＝白い画面が残る）。
     このファイルは defer なので、ここまで来れば DOM は出来上がっている。 */
  if (window.__xevPortalEntered) { try { xhShow(); } catch (e) {} }
})();

/* データ変化に追従 */
addEventListener("xeva:change", () => { xhRenderXeva(); });
/* 💎ジェムは XEVA とは別イベント。
   クラウド同期が値を書き戻したときも必ず描き直す（xeva:synced / storage の両方から届く）。 */
addEventListener("xeva:gem", () => { xhRenderGem(); });
addEventListener("xeva:synced", () => { xhRenderXeva(); });
addEventListener("xevacloud:ready", () => { xhRenderXeva(); });
addEventListener("storage", (e) => {
  if (!e.key || (e.key !== "xeva_gem_v1" && e.key !== "xeva_wallet_v1")) return;
  xhRenderXeva();
});
addEventListener("online",  () => { xhApplyOfflineLocks(); xhToast("🌐 オンラインに復帰しました。データをクラウドへ反映します"); });
addEventListener("offline", () => { xhApplyOfflineLocks(); xhToast("📴 オフラインになりました<br><span style='font-size:11px;font-weight:700;color:#6f82ad'>MagiLex ／ MagiBurst ／ MagiChainParty ／ XEVYNAR ／ MagiJackpot は遊べます</span>", 3400); });

addEventListener("focus", () => { if (_xhShown) { xhRenderProfile(); xhRenderXeva(); } });
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && _xhShown) { xhRenderProfile(); xhRenderXeva(); xhSyncBadges(); }
});
