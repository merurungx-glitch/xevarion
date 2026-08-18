/* ============================================================
   Magi Lotto — コア（設定・還元率・通貨・セーブ・履歴・演出の土台）
   ------------------------------------------------------------
   ★ このゲームの背骨（迷ったらここへ戻る）

   ① 5本柱しか作らない
      SCRATCH（演出を楽しむ）／NUMBERS（自分で数字を考える）／
      LOTTO（大当たりを狙う）／MAGI GRAND DRAW（半月に一度のお祭り）／
      FREE MAGI（毎日ログインする理由）。
      ミニゲームもパーティーもルーレットも足さない。役割が重なるからです。

   ② ひとりでも成立する
      「人が集まるまで待つ」「他の人と賞金を奪い合う」は<b>一切作らない</b>。
      どのコンテンツも、その人ひとりの購入だけで結果が出る。
      Magi Grand Draw も同じで、開催日が来れば必ず結果が出ます。
      共有しているのは<b>賞金プールの金額だけ</b>（増えていく楽しみのため）。

   ③ 高還元だが、当たりの差は大きく
      長い目で見た平均還元率はおよそ 90〜95%。
      ただし「小当たりをばらまいて終わり」にはしない。
      どのコンテンツも <b>×1 → ×3〜6 → ×20 → ×100 → ×500〜20000</b> のように、
      ランクが1つ上がるごとに報酬が跳ね上がる形にしてある。
      ハズレもちゃんと存在する（宝くじなので）。

   ④ 支払いは XEVA だけ。💎ジェムは「当たるもの」
      ・購入は<b>すべて XEVA</b>。💎では買えない。
        値段を💎建てにしていた頃は、ドル円が動くたびに XEVA での実売価格が上下して
        「昨日と値段がちがう」が起きた。宝くじの券面が毎日変わるのはおかしい。
        → 価格を<b>XEVA の固定額</b>にして、配当も XEVA。レートは一切からまない。
      ・💎ジェムは <b>FREE MAGI のごほうび</b>としてだけ出る（使い道は XEVARION 全体）。
        レートの表示は「当たった💎がいくらぶんか」を知るためだけに残してある。

   ⑤ 抽選はサーバーが決める（ml-draw.js）
      ここには抽選の実行は書かない。テーブル（確率と倍率）と、
      そこから期待還元率を<b>正確に計算する関数</b>だけを置く。
      管理画面はこの計算結果と、サーバーに貯まった実測値を並べて見せる。

   window.ML として公開。
   ============================================================ */
(function () {
  "use strict";

  const KEY = "magilotto_v1";
  const now = () => Date.now();

  /* ══════════════════════════════════════════════════════════
     既定の設定（運営が管理画面から上書きできる）
     ──────────────────────────────────────────────
     ★ ここに書いてある確率と倍率が「設計上の還元率」の全て。
       画面のどこにも数字を直書きしないこと（食いちがいの元）。
     ★ prob は「その口1つあたりの確率」、mul は「賭け金に対する倍率」。
       mul: 1 は "かけたぶんが戻る"（救済）で、0 はハズレ。
     ★ price は <b>XEVA の固定額</b>（2026-08-13 に💎建てから変更）。
       配当 ＝ price × mul なので、為替が動いても還元率も配当額も変わらない。
     ══════════════════════════════════════════════════════════ */
  const DEFAULT_CFG = {
    v: 1,

    /* ── SCRATCH：演出を楽しむ ──
       いちばん手軽で、当たる回数がいちばん多い（約41%）。
       そのぶん上のランクは重い。×1000 は 10万分の3。 */
    scratch: {
      price: 200,               // XEVA
      tiers: [
        { id: "s1", mul: 1,    prob: 0.30,    nm: "リターン",   ln: "small" },
        { id: "s2", mul: 3,    prob: 0.08,    nm: "スモール",   ln: "small" },
        { id: "s3", mul: 6,    prob: 0.025,   nm: "ミドル",     ln: "mid"   },
        { id: "s4", mul: 20,   prob: 0.006,   nm: "ビッグ",     ln: "big"   },
        { id: "s5", mul: 100,  prob: 0.0009,  nm: "メガ",       ln: "mega"  },
        { id: "s6", mul: 1000, prob: 0.00003, nm: "マギ・ジャックポット", ln: "ultra" },
      ],
    },

    /* ── NUMBERS：自分で数字を考える ──
       3桁（0〜9 を3つ）。判定は次の順で、上に当たったらそこで確定。
         ストレート（位置もぴったり）／ボックス（順不同で3つとも一致）／
         2桁一致（位置）／1桁一致（位置）
       ★ ボックスの起きやすさは「選んだ数字の並び」で変わる（ぞろ目は起きない）。
         そのまま同じ倍率にすると、選び方で還元率が 82〜92% とばらついてしまう。
         そこで<b>並びのパターンごとに倍率を変えて、どの数字を選んでも同じ還元率</b>にした。
         ・すべて違う（724 など）… ストレート×500／ボックス×20
         ・2つ同じ（772 など）  … ストレート×500／ボックス×50
         ・ぞろ目（777）        … ボックスが起きないぶん ストレート×600
         この調整のおかげで、どの数字でも期待還元率は約 92%。
         画面には「選んだ数字の期待還元率」をそのまま出す（隠さない）。
       ★ MAGI PICK（おまかせ）で選んでも確率も倍率もまったく同じ。 */
    numbers: {
      price: 200,               // XEVA
      digits: 3,
      straight: { distinct: 500, pair: 500, triple: 600 },
      box:      { distinct: 20,  pair: 50,  triple: 0   },
      pos2: 3,                  // 2桁一致（位置）
      pos1: 1,                  // 1桁一致（位置）＝かけたぶんが戻る
    },

    /* ── LOTTO：大当たりを狙う ──
       1〜36 から 6個。当たった個数でランクが決まる。
       5個 → 6個 で ×1,000 → ×20,000。ここが本作でいちばん大きい跳ね上がり。 */
    lotto: {
      price: 400,               // XEVA
      range: 36, pick: 6,
      mul: { 6: 20000, 5: 1000, 4: 80, 3: 8, 2: 1 },
      nm:  { 6: "6個一致（特大当たり）", 5: "5個一致", 4: "4個一致", 3: "3個一致", 2: "2個一致" },
    },

    /* ── MAGI GRAND DRAW：半月に一度のお祭り ──
       ・毎月 1日 と 16日 の 2回だけ結果を発表する（年24回）。
       ・1口＝💎5。1〜30 から 3個をえらぶ（MAGI PICK 可）。
         抽選では メイン3個 ＋ MAGIボール1個 が出る。
       ・1等（3個一致）は<b>賞金プール全額</b>。プールが最低保証に届いていなければ
         運営が足して払う（＝ひとりしか居なくても大型イベントとして成立する）。

       ★ 1等の確率をどう決めたか（ここは何度も間違えるところなので残しておく）
         1等は「プール全額（最低 1,000,000 XEVA）」＝1口（800 XEVA）の 1,250倍。
         これに甘い確率を付けると、それだけで還元率が 100% を軽く超える。
         実際、最初に 1/2,600 で組んだら Magi Lotto 全体が <b>119%</b> になってしまった
         （＝いくらでも増やせる状態）。
         そこで<b>最低保証のときにちょうど 93% になる確率</b>から逆算した。
           1等の取り分 …… プール ÷ (確率の逆数 × 1口の XEVA) ＝ 約 31%
           2〜5等の取り分 … 約 62%
           合計 …………… 約 93%
         1〜30 から3個 ＝ <b>1/4,060</b>。宝くじとしては<b>桁違いに甘い</b>
         （ロト6の1等は 1/6,096,454）。「人が少ないと永久に当たらない」にはならない。

       ★ プールを無限にふくらませないこと
         プールが育つほど1等の期待値が上がる＝還元率も上がる。放っておくと
         「時間が経つほど得」になって、上の 93% が意味を失う。
           ・運営の積み増し（seedPerDraw）は<b>プールが最低保証に届くまで</b>だけ入れる
             （＝保証を必ず用意する、それ以上は積まない）。
           ・購入からの積立は倍率をかけない（poolRate だけ）。
         こうすると、プールが最低保証を大きく超えるのは「たくさん遊んだぶん」だけになる。 */
    grand: {
      price: 800,               // XEVA
      range: 30, pick: 3,
      /* 2〜5等の倍率（1等はプール全額なので倍率では表せない）
         ランク間の差を大きくとってある： ×1 → ×3 → ×9 → ×200 → プール全額 */
      mul: { r2: 200, r3: 9, r4: 3, r5: 1 },
      minGuarantee: 1000000,    // 1等の最低保証（XEVA）★運営が管理画面で変更できる
      seedPerDraw: 200000,      // 抽選回ごとに運営がプールへ足す額（XEVA）
      seedCeiling: 1000000,     // ★ここまでしか積み増さない（既定＝最低保証と同じ）
      poolRate: 0.02,           // すべての購入から積む割合
      poolBoost: 1,             // 積立の倍率（1＝素のまま。上げると還元率も上がるので注意）
    },

    /* ── FREE MAGI：毎日ログインする理由 ──
       1日1回・無料。まれに大きいものが当たる（💎50 は 0.15%）。
       無料なので還元率の計算には入れない（＝丸ごと上乗せ）。 */
    free: {
      wheel: [
        { id: "f1", w: 28.0,  xeva: 100,  nm: "100 XEVA",   c: "#3d7bd6" },
        { id: "f2", w: 22.0,  xeva: 200,  nm: "200 XEVA",   c: "#2fa36b" },
        { id: "f3", w: 16.0,  xeva: 300,  nm: "300 XEVA",   c: "#8b5cd6" },
        { id: "f4", w: 11.0,  xeva: 500,  nm: "500 XEVA",   c: "#c94f7c" },
        { id: "f5", w: 12.0,  gem: 1,     nm: "💎1",        c: "#1f8fd0" },
        { id: "f6", w:  6.0,  gem: 3,     nm: "💎3",        c: "#d68a1f" },
        { id: "f7", w:  3.0,  gem: 5,     nm: "💎5",        c: "#b8452f" },
        { id: "f8", w:  1.85, xeva: 1000, nm: "1,000 XEVA", c: "#c9a227" },
        { id: "f9", w:  0.15, gem: 50,    nm: "💎50 ✦",     c: "#7b2fd6" },
      ],
    },
  };

  /* 運営設定（サーバー magilotto/cfg）。届くまでは既定値で動く。 */
  let CFG = deepClone(DEFAULT_CFG);
  function deepClone(o) { return JSON.parse(JSON.stringify(o)); }
  function cfg() { return CFG; }
  function defaults() { return deepClone(DEFAULT_CFG); }
  function applyCfg(c) {
    if (!c || typeof c !== "object") return;
    CFG = Object.assign(deepClone(DEFAULT_CFG), c);
    emit("cfg");
  }
  /* 管理画面が「保存する前の値で還元率を試算する」ために、
     画面を描き直さずに一時的な設定へ差し替える（すぐ元に戻す前提）。 */
  function applyCfgSilent(c) {
    if (!c || typeof c !== "object") return;
    CFG = Object.assign(deepClone(DEFAULT_CFG), c);
  }

  /* ══════════════════════════════════════════════════════════
     期待還元率の計算
     ──────────────────────────────────────────────
     ★ 「設定した確率と倍率から、そのまま計算する」だけ。
       画面にも管理画面にもこの関数の結果を出すので、
       表示と実際の抽選が食いちがうことがない。
     ══════════════════════════════════════════════════════════ */
  function comb(n, k) {
    if (k < 0 || k > n) return 0;
    let r = 1;
    for (let i = 1; i <= k; i++) r = r * (n - k + i) / i;
    return Math.round(r);
  }

  /* SCRATCH：テーブルをそのまま足すだけ */
  function rtpScratch() {
    const t = CFG.scratch.tiers;
    let ev = 0, hit = 0;
    t.forEach((x) => { ev += x.prob * x.mul; hit += x.prob; });
    return { rtp: ev, hit, rows: t.map((x) => ({ nm: x.nm, mul: x.mul, prob: x.prob, ev: x.prob * x.mul })) };
  }

  /* NUMBERS：選んだ数字の「並びのパターン」で場合分けする。
     pat を省略すると "distinct"（すべて違う）で計算する。 */
  function numPattern(nums) {
    if (!nums || nums.length < 3) return "distinct";
    const s = new Set(nums);
    return s.size === 1 ? "triple" : s.size === 2 ? "pair" : "distinct";
  }
  function rtpNumbers(pat) {
    pat = pat || "distinct";
    const c = CFG.numbers;
    /* 位置一致の個数の確率（選んだ数字によらず常に同じ） */
    const pStraight = 0.001;                 // 3桁とも位置一致
    const pPos2 = 3 * 0.01 * 0.9;            // ちょうど2桁一致 = 0.027
    const pPos1raw = 3 * 0.1 * 0.81;         // ちょうど1桁一致 = 0.243
    /* ボックス（順不同で3つとも一致・ストレートは除く）の確率と、
       そのうち「ちょうど1桁が位置一致」だったぶん（＝1桁一致から差し引く） */
    let pBox = 0, boxIn1 = 0;
    if (pat === "distinct") { pBox = 5 / 1000; boxIn1 = 3 / 1000; }   // 3個の並べ替え6通りのうち5通り
    else if (pat === "pair") { pBox = 2 / 1000; boxIn1 = 2 / 1000; }  // 3通りのうち2通り（どちらも1桁一致）
    else { pBox = 0; boxIn1 = 0; }                                     // ぞろ目は起きない
    const pPos1 = pPos1raw - boxIn1;
    const mS = c.straight[pat] || 0, mB = c.box[pat] || 0;
    const rows = [
      { nm: "ストレート（位置までぴったり）", mul: mS,     prob: pStraight },
      { nm: "ボックス（順不同で3つとも）",   mul: mB,     prob: pBox },
      { nm: "2桁一致（位置）",               mul: c.pos2, prob: pPos2 },
      { nm: "1桁一致（位置）",               mul: c.pos1, prob: pPos1 },
    ].filter((r) => r.prob > 0);
    let ev = 0, hit = 0;
    rows.forEach((r) => { r.ev = r.prob * r.mul; ev += r.ev; if (r.mul > 0) hit += r.prob; });
    return { rtp: ev, hit, rows, pat };
  }

  /* LOTTO：超幾何分布そのまま */
  function lottoProb(k) {
    const c = CFG.lotto, tot = comb(c.range, c.pick);
    if (!tot) return 0;
    return comb(c.pick, k) * comb(c.range - c.pick, c.pick - k) / tot;
  }
  function rtpLotto() {
    const c = CFG.lotto;
    const rows = [];
    let ev = 0, hit = 0;
    for (let k = c.pick; k >= 2; k--) {
      const mul = c.mul[k] || 0, prob = lottoProb(k);
      if (!mul) continue;
      rows.push({ nm: c.nm[k] || (k + "個一致"), mul, prob, ev: prob * mul, k });
      ev += prob * mul; hit += prob;
    }
    return { rtp: ev, hit, rows };
  }

  /* MAGI GRAND DRAW：メイン3個一致＝1等（プール）／それ以外は倍率。
     ★ 1等の「倍率」は プール ÷ 1口の値段。値段が XEVA 固定になったので素直に割れる。
     MAGIボールは「メインで外した番号 23個」から1個引くので、
     k個当たっている人が MAGIボールも当てる確率は (pick-k)/(range-pick)。 */
  function grandProb() {
    const c = CFG.grand, R = c.range, P = c.pick;
    const tot = comb(R, P);
    const p = (k) => comb(P, k) * comb(R - P, P - k) / tot;
    const pm = (k) => (P - k) / (R - P);          // MAGIボールも一致する条件付き確率
    const p3 = p(3), p2 = p(2), p1 = p(1);
    return {
      r1: p3,                       // 3個一致 → 1等（プール全額）
      r2: p2 * pm(2),               // 2個 ＋ MAGI
      r3: p2 * (1 - pm(2)),         // 2個
      r4: p1 * pm(1),               // 1個 ＋ MAGI
      r5: p1 * (1 - pm(1)),         // 1個
    };
  }
  /* poolNow を渡すと、1等ぶんも含めた「いまの」還元率が出る（プールは日々ふくらむ） */
  function rtpGrand(poolNow) {
    const c = CFG.grand, pr = grandProb();
    const stake = c.price;                                  // 1口ぶん（XEVA）
    const pool = Math.max(c.minGuarantee, Math.round(poolNow || 0));
    const rows = [
      { nm: "1等：3個一致（賞金プール全額）", mul: stake ? pool / stake : 0, prob: pr.r1, jackpot: true, amount: pool },
      { nm: "2等：2個一致 ＋ MAGIボール",     mul: c.mul.r2, prob: pr.r2 },
      { nm: "3等：2個一致",                   mul: c.mul.r3, prob: pr.r3 },
      { nm: "4等：1個一致 ＋ MAGIボール",     mul: c.mul.r4, prob: pr.r4 },
      { nm: "5等：1個一致",                   mul: c.mul.r5, prob: pr.r5 },
    ];
    let ev = 0, base = 0, hit = 0;
    rows.forEach((r) => {
      r.ev = r.prob * r.mul; ev += r.ev; hit += r.prob;
      if (!r.jackpot) base += r.ev;
    });
    return { rtp: ev, base, hit, rows, pool };
  }

  /* 5本柱ぜんぶをまとめた「設計上の還元率」（管理画面の見出しに出す）。
     ★ 各コンテンツの重みは購入額（XEVA）で見る。 */
  function rtpAll(poolNow) {
    const s = rtpScratch(), n = rtpNumbers("distinct"), l = rtpLotto(), g = rtpGrand(poolNow);
    const items = [
      { id: "scratch", nm: "SCRATCH", price: CFG.scratch.price, r: s },
      { id: "numbers", nm: "NUMBERS", price: CFG.numbers.price, r: n },
      { id: "lotto",   nm: "LOTTO",   price: CFG.lotto.price,   r: l },
      { id: "grand",   nm: "MAGI GRAND DRAW", price: CFG.grand.price, r: g },
    ];
    let w = 0, ev = 0;
    items.forEach((it) => { w += it.price; ev += it.price * it.r.rtp; });
    return { rtp: w ? ev / w : 0, items };
  }

  /* ══════════════════════════════════════════════════════════
     抽選回（毎月1日・16日）
     ★ 判定は必ずローカル日付で行う。toISOString は UTC なので日本は9時間ずれる。
     ══════════════════════════════════════════════════════════ */
  function ymd(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function today() { return ymd(new Date()); }
  /* いま受付中の回のID（"2026-08-16" のように、次の発表日で表す） */
  function nextDrawDate(from) {
    const d = from ? new Date(from) : new Date();
    const y = d.getFullYear(), m = d.getMonth(), day = d.getDate();
    if (day < 16) return new Date(y, m, 16, 0, 0, 0, 0);
    return new Date(y, m + 1, 1, 0, 0, 0, 0);
  }
  /* 直前に結果が出た回（1日 or 16日） */
  function lastDrawDate(from) {
    const d = from ? new Date(from) : new Date();
    const y = d.getFullYear(), m = d.getMonth(), day = d.getDate();
    if (day >= 16) return new Date(y, m, 16, 0, 0, 0, 0);
    return new Date(y, m, 1, 0, 0, 0, 0);
  }
  function periodId(dt) { return ymd(dt || nextDrawDate()); }
  function grandInfo() {
    const nx = nextDrawDate(), lastD = lastDrawDate();
    const ms = nx - Date.now();
    const dd = Math.floor(ms / 86400000);
    const hh = Math.floor((ms % 86400000) / 3600000);
    const mm = Math.floor((ms % 3600000) / 60000);
    const WD = ["日", "月", "火", "水", "木", "金", "土"];
    return {
      next: nx, nextId: ymd(nx), last: lastD, lastId: ymd(lastD),
      leftMs: ms, d: dd, h: hh, m: mm,
      /* 「6月16日（月）」 */
      nextText: (nx.getMonth() + 1) + "月" + nx.getDate() + "日（" + WD[nx.getDay()] + "）",
      leftText: (dd > 0 ? dd + "日 " : "") + hh + "時間 " + mm + "分",
      /* 発表日の当日かどうか（当日は「結果発表」を大きく出す） */
      isDrawDay: (new Date().getDate() === 1 || new Date().getDate() === 16),
    };
  }

  /* ══════════════════════════════════════════════════════════
     セーブ（magilotto_v1・アカウント同期）
     ══════════════════════════════════════════════════════════ */
  function fresh() {
    return {
      v: 1,
      /* 履歴（新しい順・最大200件）。1件 = 1回の購入と結果 */
      log: [],
      /* 集計（自分ぶん） */
      stats: { plays: 0, wagered: 0, won: 0, wins: 0, biggest: 0, byGame: {} },
      /* FREE MAGI：最後に引いた日（"YYYY-MM-DD"） */
      freeDay: "", freeStreak: 0, freeTotal: 0,
      /* MAGI GRAND DRAW：受付中の回に買った口（periodId → [{id,nums,at}]）と、確認済みの回 */
      entries: {}, grandSeen: {},
      /* 直前に選んだ数字（次に開いたとき同じ数字を出す） */
      lastNumbers: null, lastLotto: null, lastGrand: null,
      /* 使いかたを読んだか */
      seen: {},
      updatedAt: 0,
    };
  }
  let S = fresh();
  function deepFill(o, def) {
    if (o == null || typeof o !== "object" || Array.isArray(o)) return o == null ? def : o;
    const out = Object.assign({}, def, o);
    Object.keys(def).forEach((k) => {
      if (def[k] && typeof def[k] === "object" && !Array.isArray(def[k])) out[k] = deepFill(o[k], def[k]);
    });
    return out;
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const p = JSON.parse(raw); if (p && typeof p === "object") S = deepFill(p, fresh()); }
    } catch (e) { S = fresh(); }
    if (!Array.isArray(S.log)) S.log = [];
    return S;
  }
  function save() {
    S.updatedAt = now();
    if (S.log.length > 200) S.log.length = 200;
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
  }
  /* 取り返しのつかない変化（購入・当選）の直後はクラウドへ押し出す */
  function saveNow() {
    save();
    try { if (window.XevaCloud && window.XevaCloud.flushPush) window.XevaCloud.flushPush(); } catch (e) {}
  }
  load();
  /* クラウドから新しいセーブが降りてきたら読み直す（別端末で買ったぶんを反映） */
  function reload() { load(); emit("save"); }
  try {
    window.addEventListener("xeva:synced", reload);
    window.addEventListener("storage", (e) => { if (e.key === KEY) reload(); });
  } catch (e) {}
  function state() { return S; }

  /* ══════════════════════════════════════════════════════════
     通貨（★ 2026-08-13 XEVA 一本に変更）
     ・購入は<b>すべて XEVA</b>。💎ジェムでは買えない。
     ・💎は FREE MAGI のごほうびとしてだけ手に入る（使い道は XEVARION 全体）。
     ・レート（💎1 ＝ ◯ XEVA）は「当たった💎がいくらぶんか」の目安として出すだけで、
       値段にも配当にも一切からまない。
     ══════════════════════════════════════════════════════════ */
  function xeva() { try { return window.XEVA ? window.XEVA.getBalance() : 0; } catch (e) { return 0; } }
  function gems() { try { return (window.XEVA && window.XEVA.gem) ? window.XEVA.gem.get() : 0; } catch (e) { return 0; } }
  /* 💎1 ＝ 何 XEVA か。ドル円連動（xeva-fx.js）。取れないときは既定値。 */
  function gemRate() {
    try { if (window.XevaFX && window.XevaFX.gemRate) return window.XevaFX.gemRate(); } catch (e) {}
    return 155;
  }
  /* 賭け金。価格がそのまま XEVA なので、ここは素通し。
     ★ 旧版（💎建て）の呼び出しが残っていても壊れないよう関数は残してある。 */
  function stakeXeva(price) { return Math.round(price || 0); }
  /* 「200 XEVA」。買うボタンにそのまま出す文字列 */
  function priceText(price) { return fmt(Math.round(price || 0)) + " XEVA"; }
  function canPay(price) { return xeva() >= Math.round(price || 0); }
  /* 実際に引く。足りなければ false を返して何もしない。 */
  function pay(price, reason) {
    price = Math.max(0, Math.round(price || 0));
    if (!price) return true;
    try { return !!window.XEVA.spend(price, "Magi Lotto：" + (reason || "購入")); } catch (e) { return false; }
  }
  function winXeva(n, reason) {
    n = Math.round(n || 0);
    if (n <= 0) return 0;
    /* ★ 配布と同じで、当選金は月間XEVAランキングに載せない（noRank）。
       「遊んで稼いだ量」ではなく運の結果なので、順位で有利になってしまう。 */
    try { window.XEVA.add(n, "Magi Lotto：" + (reason || "当選"), { noRank: true }); } catch (e) {}
    emit("wallet");
    return n;
  }
  function winGem(n, reason) {
    n = Math.round(n || 0);
    if (n <= 0) return 0;
    try { window.XEVA.gem.add(n, "Magi Lotto：" + (reason || "当選")); } catch (e) {}
    emit("wallet");
    return n;
  }

  /* ══════════════════════════════════════════════════════════
     賞金プール（Magi Grand Draw の原資・全員で共有する1本）
     ★ 共有にした理由は「ひとりで遊んでいる間も数字が動く」ようにするため。
       奪い合いではない（誰かが当てても、あなたの当たりやすさは変わらない）。
     ══════════════════════════════════════════════════════════ */
  let _pool = null, _poolErr = false, _poolStop = null, _poolTimer = null;
  function fb() { try { return window.XEVARIONFB || null; } catch (e) { return null; } }
  function offline() { return typeof navigator !== "undefined" && navigator.onLine === false; }
  function poolSet(v) { _pool = v; emit("pool"); }
  function poolConnect() {
    if (_poolStop) return;
    const F = fb();
    if (!F || !F.mlPoolWatch) {
      window.addEventListener("xevarionfb:ready", poolConnect, { once: true });
      if (!_poolTimer) {
        let tries = 0;
        _poolTimer = setInterval(() => {
          if (_poolStop) { clearInterval(_poolTimer); _poolTimer = null; return; }
          if (++tries > 40) { clearInterval(_poolTimer); _poolTimer = null; return; }
          poolConnect();
        }, 500);
      }
      return;
    }
    if (_poolTimer) { clearInterval(_poolTimer); _poolTimer = null; }
    _poolStop = F.mlPoolWatch(poolSet, () => {
      _poolErr = true;
      if (_poolStop) { try { _poolStop(); } catch (e) {} }
      _poolStop = null;
      setTimeout(poolConnect, 8000);
    });
    /* 見張りが返してこないときは直接読む（回線が遅いとき用） */
    let tries = 0;
    const pull = async () => {
      if (_pool != null || !F.mlPoolGet) return;
      try { const v = await F.mlPoolGet(); if (typeof v === "number") { poolSet(v); _poolErr = false; return; } } catch (e) {}
      if (++tries < 5) setTimeout(pull, 6000);
    };
    setTimeout(pull, 4000);
  }
  /* 表示用。まだ届いていなければ最低保証を出す（0 と出るより実態に近い） */
  function pool() { return Math.floor(_pool == null ? CFG.grand.minGuarantee : Math.max(_pool, CFG.grand.minGuarantee)); }
  function poolRaw() { return _pool; }
  function poolState() { return _pool != null ? "shared" : _poolErr ? "denied" : "waiting"; }
  /* 購入のたびに積む（賭け金の XEVA 換算 × poolRate × poolBoost） */
  function poolAccrue(stake) {
    const c = CFG.grand;
    const add = Math.round((stake || 0) * c.poolRate * c.poolBoost);
    if (add <= 0) return;
    if (_pool != null) { _pool += add; emit("pool"); }
    const F = fb();
    if (F && F.mlPoolAdd) { try { F.mlPoolAdd(add); } catch (e) {} }
  }
  /* 抽選回ごとの運営上乗せ。印を取り合って1回だけ入る（端末ごとに増えない）。
     ★ 積むのは「プールが seedCeiling に届いていないとき」だけ。
       ここを無制限にすると、遊んでいなくてもプールが毎月40万ずつ育ち、
       1等の期待値だけで還元率が 100% を超えてしまう（＝設計が意味をなさなくなる）。
       運営の役目は<b>最低保証を必ず用意すること</b>であって、賞金を無限に積むことではない。 */
  let _seedTried = "";
  async function poolSeed() {
    const pid = periodId();
    if (_seedTried === pid) return;
    _seedTried = pid;
    const F = fb();
    if (!F || !F.mlPoolSeed || offline()) { _seedTried = ""; return; }
    const c = CFG.grand;
    try {
      const r = await F.mlPoolSeed(c.seedPerDraw, pid, c.seedCeiling == null ? c.minGuarantee : c.seedCeiling);
      if (r && r.seeded && _pool != null) { _pool += r.amount || c.seedPerDraw; emit("pool"); }
      else if (r && r.error) _seedTried = "";
    } catch (e) { _seedTried = ""; }
  }

  /* ══════════════════════════════════════════════════════════
     履歴（購入・当選）
     ★ サーバー側の台帳（magilotto/users/{uid}/tx）が正で、ここは表示用の写し。
     ══════════════════════════════════════════════════════════ */
  function record(o) {
    /* o = { game, txId, betGem, betXeva, pay, win, winGem, tier, tierNm, detail, at } */
    const row = Object.assign({ at: now() }, o);
    S.log.unshift(row);
    const st = S.stats;
    st.plays++;
    st.wagered += row.betXeva || 0;
    st.won += row.win || 0;
    if (row.win > 0) { st.wins++; if (row.win > st.biggest) st.biggest = row.win; }
    const g = st.byGame[row.game] || (st.byGame[row.game] = { plays: 0, wagered: 0, won: 0, best: 0 });
    g.plays++; g.wagered += row.betXeva || 0; g.won += row.win || 0;
    if ((row.win || 0) > g.best) g.best = row.win || 0;
    saveNow();
    emit("log");
    /* 運営の実測値（管理画面の「実測還元率」）にも足す */
    const F = fb();
    if (F && F.mlStatAdd) { try { F.mlStatAdd(row.game, row.betXeva || 0, row.win || 0, row.tier || "miss"); } catch (e) {} }
    return row;
  }
  function log(n) { return S.log.slice(0, n || 60); }
  function myRtp() {
    const st = S.stats;
    return st.wagered > 0 ? st.won / st.wagered : 0;
  }

  /* ══════════════════════════════════════════════════════════
     画面のための小物
     ══════════════════════════════════════════════════════════ */
  const $ = (s) => document.querySelector(s);
  const fmt = (n) => Number(n || 0).toLocaleString();
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }
  function pct(v, dp) {
    const d = dp == null ? 2 : dp;
    return (Math.round(v * Math.pow(10, d + 2)) / Math.pow(10, d)) + "%";
  }
  /* 「1/2,600」の形。小さい確率はこちらのほうが直感的 */
  function odds(p) { return p > 0 ? "1/" + fmt(Math.round(1 / p)) : "—"; }
  function emit(what) { try { window.dispatchEvent(new CustomEvent("ml:" + what)); } catch (e) {} }

  /* ── トースト ── */
  let _toastT = null;
  function toast(html, ms) {
    const el = $("#mlToast"); if (!el) return;
    el.innerHTML = html;
    el.classList.add("on");
    if (_toastT) clearTimeout(_toastT);
    _toastT = setTimeout(() => el.classList.remove("on"), ms || 2600);
  }

  /* ── ボトムシート（説明・確認・結果の受け皿）──
     ボタンは最大3つ。押した id を Promise で返す。 */
  let _sheetRes = null;
  function sheet(o) {
    const ov = $("#mlSheet"), card = $("#mlSheetCard");
    if (!ov || !card) return Promise.resolve(null);
    if (_sheetRes) { const r = _sheetRes; _sheetRes = null; r(null); }
    const btns = (o.buttons || [{ id: "ok", nm: o.ok || "とじる" }]).map((b) =>
      '<button class="ml-sbtn ' + (b.tone || "") + '" data-id="' + esc(b.id) + '">' + b.nm + "</button>").join("");
    card.innerHTML =
      '<div class="ml-sheadr"><span class="ml-sic">' + (o.icon || "✦") + "</span>" +
      '<span class="ml-stt">' + (o.title || "") + "</span>" +
      '<button class="ml-sx" data-id="' + esc(o.cancelId || "close") + '" aria-label="とじる">✕</button></div>' +
      '<div class="ml-sbody">' + (o.html || "") + "</div>" +
      '<div class="ml-sfoot">' + btns + "</div>";
    ov.classList.add("on");
    return new Promise((res) => {
      _sheetRes = res;
      card.querySelectorAll("[data-id]").forEach((b) => {
        b.onclick = () => { closeSheet(b.getAttribute("data-id")); };
      });
      ov.onclick = (e) => { if (e.target === ov) closeSheet(null); };
    });
  }
  function closeSheet(v) {
    const ov = $("#mlSheet"); if (ov) ov.classList.remove("on");
    if (_sheetRes) { const r = _sheetRes; _sheetRes = null; r(v === undefined ? null : v); }
  }

  /* ══════════════════════════════════════════════════════════
     当選演出（5段階）
     ──────────────────────────────────────────────
     ★ 「少し当たった」と「大当たりした」の体験をはっきり分ける。
       段は倍率で決める（各コンテンツで共通の物差しにする）。
         small … ×1〜2    … 短い光と音だけ
         mid   … ×3〜19   … カードが跳ねる／コインが少し舞う
         big   … ×20〜99  … 画面全体が光り、金の帯が走る
         mega  … ×100〜999… 画面が暗転してから爆発する専用演出
         ultra … ×1000〜  … Magi Lotto 最上級。虹の光柱＋賞金のカウントアップ
     ══════════════════════════════════════════════════════════ */
  function tierOf(mul) {
    if (mul >= 1000) return "ultra";
    if (mul >= 100) return "mega";
    if (mul >= 20) return "big";
    if (mul >= 3) return "mid";
    if (mul > 0) return "small";
    return "miss";
  }
  const TIER_LABEL = {
    small: { t: "リターン！",   s: "かけたぶんが戻ってきた" },
    mid:   { t: "当たり！",     s: "" },
    big:   { t: "BIG WIN!!",    s: "大当たり" },
    mega:  { t: "MEGA WIN!!!",  s: "特大当たり" },
    ultra: { t: "MAGI JACKPOT", s: "最高当選" },
  };

  /* 賞金のカウントアップ。ランクが上がるほどゆっくり見せる。 */
  function countUp(el, to, ms) {
    if (!el) return;
    const t0 = performance.now(), dur = Math.max(300, ms || 900);
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.floor(to * e));
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = fmt(to);
    };
    requestAnimationFrame(step);
  }

  /* 大当たりの全画面演出。とじるまで Promise は解決しない。
     ★ ultra（×1000以上・MAGI GRAND DRAW の1等）だけは専用のカットイン絵を出す。
       ここでしか見られない絵にすることで「最上級だ」が一目で伝わる。 */
  function celebrate(o) {
    /* o = { tier, title, sub, amount, gem, lines, mul } */
    const ov = $("#mlWin"), card = $("#mlWinCard");
    if (!ov || !card) return Promise.resolve();
    const tier = o.tier || "small";
    const L = TIER_LABEL[tier] || TIER_LABEL.small;
    ov.className = "ml-win on t-" + tier;
    card.innerHTML =
      '<div class="ml-wrays"></div>' +
      (tier === "ultra" ? '<img class="ml-wcut" src="img/cutin_jackpot.webp" alt="">' : "") +
      '<div class="ml-wtag">' + esc(o.title || L.t) + "</div>" +
      (o.mul ? '<div class="ml-wmul">×' + fmt(o.mul) + "</div>" : "") +
      '<div class="ml-wamt"><b id="mlWinN">0</b><i>' + (o.gem ? "💎" : "XEVA") + "</i></div>" +
      (o.sub || L.s ? '<div class="ml-wsub">' + esc(o.sub || L.s) + "</div>" : "") +
      (o.lines ? '<div class="ml-wlines">' + o.lines + "</div>" : "") +
      '<button class="ml-wok" id="mlWinOk">OK</button>';
    sfx(tier);
    if (tier === "big" || tier === "mega" || tier === "ultra") confetti(tier);
    countUp(card.querySelector("#mlWinN"), o.amount || 0,
      tier === "ultra" ? 2600 : tier === "mega" ? 1800 : tier === "big" ? 1200 : 700);
    return new Promise((res) => {
      const done = () => { ov.classList.remove("on"); res(); };
      card.querySelector("#mlWinOk").onclick = done;
    });
  }

  /* ── 紙吹雪（大当たり以上）。canvas を使わず軽い DOM で ── */
  function confetti(tier) {
    const box = $("#mlConfetti"); if (!box) return;
    const n = tier === "ultra" ? 120 : tier === "mega" ? 80 : 46;
    const cols = tier === "ultra"
      ? ["#ffd257", "#ff7ac0", "#7ad0ff", "#b48cff", "#8affc4", "#ffffff"]
      : ["#ffd257", "#ffb020", "#fff3c4", "#ffffff"];
    let h = "";
    for (let i = 0; i < n; i++) {
      const x = Math.random() * 100, d = (Math.random() * 0.9).toFixed(2), s = (1.4 + Math.random() * 1.4).toFixed(2);
      const c = cols[(Math.random() * cols.length) | 0], r = ((Math.random() * 360) | 0);
      h += '<i style="left:' + x + "%;background:" + c + ";animation-delay:" + d + "s;animation-duration:" + s
        + "s;transform:rotate(" + r + 'deg)"></i>';
    }
    box.innerHTML = h;
    box.classList.add("on");
    setTimeout(() => { box.classList.remove("on"); box.innerHTML = ""; }, 3400);
  }

  /* ══════════════════════════════════════════════════════════
     効果音（WebAudio でその場で作る＝音声ファイルを増やさない）
     ══════════════════════════════════════════════════════════ */
  const SFX = (function () {
    let ac = null, gesture = false, muted = false;
    function acx() {
      if (!gesture || muted) return null;
      if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } }
      if (ac && ac.state === "suspended") { try { ac.resume(); } catch (e) {} }
      return ac;
    }
    function tone(f0, f1, dur, type, vol, delay) {
      const c = acx(); if (!c) return;
      const t = c.currentTime + (delay || 0);
      const o = c.createOscillator(), g = c.createGain();
      o.type = type || "sine";
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
      g.gain.setValueAtTime(vol || 0.1, t);
      g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
    }
    function noise(dur, vol, delay) {
      const c = acx(); if (!c) return;
      const t = c.currentTime + (delay || 0);
      const n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const s = c.createBufferSource(); s.buffer = buf;
      const g = c.createGain();
      g.gain.setValueAtTime(vol || 0.09, t);
      g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
      s.connect(g); g.connect(c.destination); s.start(t);
    }
    const T = {
      tap:    () => tone(700, 1050, 0.09, "triangle", 0.07),
      scrape: () => noise(0.05, 0.05),
      reveal: () => tone(520, 880, 0.12, "triangle", 0.08),
      /* 「あと1つで揃う」のドキドキ。上がっていく音を鳴らしっぱなしにしない */
      tease:  () => { tone(420, 620, 0.16, "square", 0.06); tone(620, 900, 0.18, "square", 0.05, 0.14); },
      ball:   () => { tone(300, 900, 0.1, "sine", 0.08); noise(0.04, 0.05); },
      miss:   () => { [392, 330, 262].forEach((f, i) => tone(f, f * 0.97, 0.22, "sine", 0.07, i * 0.12)); },
      small:  () => { tone(680, 1020, 0.14, "triangle", 0.09); },
      mid:    () => { [660, 880].forEach((f, i) => tone(f, f * 1.25, 0.16, "triangle", 0.09, i * 0.1)); },
      big:    () => { [523, 659, 784].forEach((f, i) => tone(f, f, 0.22, "triangle", 0.1, i * 0.1)); noise(0.25, 0.07, 0.05); },
      mega:   () => { tone(150, 620, 0.5, "sawtooth", 0.11); [659, 784, 988, 1319].forEach((f, i) => tone(f, f, 0.26, "triangle", 0.1, 0.24 + i * 0.11)); },
      ultra:  () => {
        tone(110, 520, 0.7, "sawtooth", 0.12); noise(0.45, 0.09, 0.15);
        [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, f, 0.34, "triangle", 0.11, 0.4 + i * 0.13));
      },
    };
    ["pointerdown", "keydown", "touchstart"].forEach((ev) =>
      document.addEventListener(ev, () => { gesture = true; acx(); }, { once: true, passive: true }));
    const api = new Proxy(T, { get: (t, k) => (typeof t[k] === "function" ? t[k] : () => {}) });
    api.mute = (v) => { muted = !!v; };
    return api;
  })();
  function sfx(k) { try { SFX[k](); } catch (e) {} }

  /* ══════════════════════════════════════════════════════════
     アカウント
     ══════════════════════════════════════════════════════════ */
  function acc() {
    try { return (window.XEVA && window.XEVA.account) ? (window.XEVA.account.get() || null) : null; } catch (e) { return null; }
  }
  function uid() { const a = acc(); return (a && (a.xvUid || a.uid)) || ""; }
  function myName() { const a = acc(); return (a && a.name) || "ゲスト"; }

  /* 運営（管理画面）の解錠状態。admin.html で入力したコードの印を見る。 */
  function isAdmin() {
    try {
      if (sessionStorage.getItem("xeva_admin_unlocked_v1") === "1") return true;
      if (localStorage.getItem("xeva_admin_ok_v1") === "1") return true;
    } catch (e) {}
    return false;
  }

  /* ══ 起動時：運営設定とプールを取りにいく ══ */
  async function boot() {
    poolConnect();
    const F = fb();
    if (F && F.mlGetConfig) {
      try { const c = await F.mlGetConfig(); if (c) applyCfg(c); } catch (e) {}
    }
    poolSeed();
  }
  window.addEventListener("online", () => { poolConnect(); poolSeed(); });
  setInterval(poolSeed, 5 * 60 * 1000);   // 日付をまたいで開きっぱなしのときも拾う

  window.ML = {
    KEY, DEFAULT_CFG, cfg, defaults, applyCfg, applyCfgSilent,
    /* 還元率 */
    rtpScratch, rtpNumbers, rtpLotto, rtpGrand, rtpAll, grandProb, lottoProb, numPattern, comb,
    /* 抽選回 */
    today, ymd, periodId, nextDrawDate, lastDrawDate, grandInfo,
    /* セーブ */
    state, save, saveNow, reload, record, log, myRtp,
    /* 通貨（購入は XEVA だけ。💎は当たるもの） */
    xeva, gems, gemRate, stakeXeva, priceText, canPay, pay, winXeva, winGem,
    /* プール */
    pool, poolRaw, poolState, poolAccrue, poolSeed, poolConnect,
    /* 画面 */
    $, fmt, esc, pct, odds, toast, sheet, closeSheet, celebrate, confetti, countUp, tierOf, TIER_LABEL, sfx, SFX,
    /* アカウント */
    acc, uid, myName, isAdmin, fb, offline,
    boot,
  };
})();
