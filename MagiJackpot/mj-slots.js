/* ============================================================
   MagiJackpot — スロット「Magi Fortune」（v2 フルリワーク）
   ------------------------------------------------------------
   コンセプト：「運だけでは終わらない。一瞬の判断が運命を変える。」

   ★ この台で “判断” が生まれる場所は4つある
     ① PLAY STYLE   … 何ラインに分けて賭けるか（当たりの回数 ⇄ 一撃の大きさ）
     ② FORTUNE GAUGE… 溜まった力を「確定 / 倍率 / 爆発」のどれで受け取るか
     ③ BONUS ROUTE  … 回数を取るか、倍率を取るか、SUPER に賭けるか
     ④ DOUBLE CHANCE… 確定するか、×2 / ×5 / ×10 に挑むか

   ★ そして本作の背骨：<b>どの選択も期待値を1ミリも動かさない</b>
     動くのは「荒さ」だけ。だから
       ・最適解が1つに決まらない ＝ 毎回ほんとうに悩める
       ・上手い下手で還元率に差がつかない ＝ 誰が遊んでも公平
     という2つが同時に成り立つ。ここを崩すと、
     「正解の押し方」が生まれて選択が作業になる。

   ★ 還元率の内訳（合計 98% ＝ MJ.BASE_RTP。残り 2% はジャックポットへ）
       通常配当        … 90%（BASE_TARGET）
       FORTUNE GAUGE   …  8%（GAUGE_RATE）— ベットから預かって、使うときに返す
     ★ この 98% には<b>本日の倍率（MJ.dayMul）</b>が掛かる。毎日 ±2% の中で動き、
       通常配当とゲージの<b>両方に同じだけ</b>掛かるので内訳の比は変わらない。
       画面に出す金額も必ず ps() を通すこと（表示と払い出しがズレないため）。
     ゲージは「ハウスからのおまけ」ではなく<b>自分が預けたぶんの払い戻し</b>。
     だから何を選んでも損得はなく、受け取りかたの形だけが変わる。
     ＝ MJSlotMath.mc() は通常配当だけを測るので 0.90 前後になるのが正しい。

   ★ 計算部（MJSlotMath）は DOM に触らない。
     コンソールから MJSlotMath.mc(300000) / mcOpts() / mcLines() で検算できる。
   ============================================================ */

/* ══════════════════════════════════════════════════════════
   計算部（表示なし）
   ══════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  /* 図柄。pay は「ライン配当（1ラインあたりのベットの何倍か）」で [3個, 4個, 5個]
     ★ 図柄コード（SP/HE/…/F2）は<b>変えていない</b>。
       保存済みのリプレイがこのコードで盤面を持っているので、
       名前と絵だけ差し替えて、コードと配当はそのままにしてある。
     ★ 高配当の3枚は <b>MagiBurst のキャラ</b>を使っている。
       魔女（sym_boss1〜3）は Jackpot Rush の <b>FINAL BATTLE 専用</b>の絵なので、
       スロットの図柄には回さない——同じ絵が「対戦相手」と「図柄」で二役になると、
       あの3人が出たときの重みが薄れてしまう。 */
  const SYM = {
    SP: { nm: "スペード", g: "♠", cls: "low", pay: [2, 6, 18] },
    HE: { nm: "ハート",   g: "♥", cls: "low", pay: [2, 6, 18] },
    DI: { nm: "ダイヤ",   g: "♦", cls: "low", pay: [2, 7, 20] },
    CL: { nm: "クラブ",   g: "♣", cls: "low", pay: [2, 7, 20] },
    BE: { nm: "BAR",         img: "img/sym_bar.webp",     cls: "mid", pay: [4, 14, 45] },
    GM: { nm: "ダイヤモンド", img: "img/sym_diamond.webp", cls: "mid", pay: [5, 18, 60] },
    CR: { nm: "ラッキーセブン", img: "img/sym_seven.webp", cls: "mid", pay: [6, 25, 90] },
    F3: { nm: "アイラ",   img: "img/sym_aira.webp",   cls: "hi", pay: [10, 40, 150] },
    F1: { nm: "マオ",     img: "img/sym_mao.webp",    cls: "hi", pay: [12, 50, 180] },
    F2: { nm: "カグヤ",   img: "img/sym_kaguya.webp", cls: "hi", pay: [16, 70, 250] },
    WD: { nm: "WILD",     img: "img/sym_wild.webp",    cls: "wild", pay: [30, 200, 900] },
    /* SCATTER は絵と絵文字の両方を持たせてある（メッセージ文では 🎰 を使う） */
    SC: { nm: "SCATTER",  img: "img/sym_scatter.webp", g: "🎰", cls: "sc", pay: [0, 0, 0] },
  };
  /* スキャッター（どこにあっても数だけで成立）。ベット総額の倍率 */
  const SCAT_PAY = { 3: 2, 4: 10, 5: 50 };

  /* リール帯。ここの構成比がそのまま出玉の性格になる。 */
  function strip(spec) {
    const out = [];
    Object.keys(spec).forEach((k) => { for (let i = 0; i < spec[k]; i++) out.push(k); });
    return out;
  }
  const REELS = [
    strip({ SP: 8, HE: 8, DI: 7, CL: 7, BE: 4, GM: 3, CR: 3, F3: 2, F1: 2, F2: 1, WD: 1, SC: 2 }),
    strip({ SP: 7, HE: 7, DI: 7, CL: 7, BE: 4, GM: 4, CR: 3, F3: 2, F1: 2, F2: 2, WD: 2, SC: 2 }),
    strip({ SP: 7, HE: 7, DI: 6, CL: 6, BE: 4, GM: 4, CR: 4, F3: 3, F1: 2, F2: 2, WD: 2, SC: 2 }),
    strip({ SP: 7, HE: 7, DI: 7, CL: 7, BE: 4, GM: 4, CR: 3, F3: 2, F1: 2, F2: 2, WD: 2, SC: 2 }),
    strip({ SP: 8, HE: 8, DI: 7, CL: 7, BE: 4, GM: 3, CR: 3, F3: 2, F1: 2, F2: 1, WD: 1, SC: 2 }),
  ];

  /* 20 ライン（各要素は左から順に「どの段か」0=上 1=中 2=下） */
  const LINES = [
    [1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],
    [0,0,1,2,2],[2,2,1,0,0],[1,0,1,2,1],[1,2,1,0,1],[0,1,1,1,0],
    [2,1,1,1,2],[1,0,0,0,1],[1,2,2,2,1],[0,1,0,1,0],[2,1,2,1,2],
    [1,1,0,1,1],[1,1,2,1,1],[0,2,0,2,0],[2,0,2,0,2],[0,0,2,0,0],
  ];
  const NLINE = LINES.length;

  /* ★ 還元率あわせの1点つまみ。
     図柄ごとの配当は「読んで気持ちのいい丸い数字」のまま置いておき、
     調整はここだけで行う。素の設計値は実測でおよそ 94.7% なので、
     通常配当の目標 90%（BASE_TARGET）にするために 0.951 倍している。
     ★ リールや配当表をいじったら、必ず
         MJSlotMath.mc(300000).rtp を数回まわして平均を取り、
       0.90 になるようここを更新すること（1回だけだと ±0.01 ほどブレる）。 */
  const BASE_TARGET = 0.90;
  const PAY_SCALE = 0.951;   // 実測 0.939 @0.992 → 0.90 に合わせるための係数

  const R = () => (window.MJ ? window.MJ.rng() : Math.random());

  /* ★ 本日の還元率（MJ.dayMul）を掛けた、実際に使う配当の倍率。
     配当表の表示もこの ps() を通すので、<b>見えている数字と払い出しが必ず一致する</b>。
     PAY_SCALE のほうは「台の設計値」なので触らない（毎日動くのはこちらだけ）。 */
  const DAY = () => (window.MJ && window.MJ.dayMul ? window.MJ.dayMul() : 1);
  function ps() { return PAY_SCALE * DAY(); }

  /* 1回ぶんの絵柄を作る。戻り値は grid[col][row]（5×3）＋停止位置 */
  function spinGrid(opt) {
    const grid = [], stops = [];
    for (let c = 0; c < 5; c++) {
      const s = REELS[c], n = s.length;
      const at = Math.floor(R() * n);
      stops.push(at);
      grid.push([s[at % n], s[(at + 1) % n], s[(at + 2) % n]]);
    }
    /* WILDBURST：中央リールがまるごと WILD になる */
    if (opt && opt.wildReel != null) grid[opt.wildReel] = ["WD", "WD", "WD"];
    /* リール固定（ゲージの演出用）：指定した列だけ前回の出目を持ち越す */
    if (opt && opt.hold) opt.hold.forEach((col, i) => { if (col) grid[i] = col.slice(); });
    return { grid, stops };
  }

  /* 出目を評価する。
     ★ 引数は「1ラインあたり」ではなく <b>総ベット額</b> と <b>使うライン数</b>。
       lineBet = totalBet / lines なので、ライン数をいくつにしても
       払い出しの期待値は totalBet に比例したまま変わらない。
       ＝「ライン数を絞る」は還元率をいっさい動かさずに、
         当たりの回数と1回の大きさだけを入れ替えるつまみになる。 */
  function evalGrid(grid, totalBet, lines, mul) {
    lines = lines || NLINE;
    mul = mul || 1;
    const lineBet = totalBet / lines;
    const sc0 = ps();                     // 本日ぶんを含んだ配当倍率（1スピンの中では動かさない）
    let win = 0;
    const hits = [];
    for (let li = 0; li < lines; li++) {
      const path = LINES[li];
      let base = null, count = 0;
      for (let c = 0; c < 5; c++) {
        const s = grid[c][path[c]];
        if (s === "SC") break;                       // スキャッターはライン成立に加わらない
        if (base === null) { base = s; count = 1; continue; }
        if (s === base || s === "WD") { count++; continue; }
        if (base === "WD") { base = s; count++; continue; }   // 左端が WILD なら本命の絵柄に置き換える
        break;
      }
      if (base === null || count < 3) continue;
      const pay = SYM[base].pay[count - 3];
      if (!pay) continue;
      const w = pay * lineBet * sc0 * mul;
      win += w;
      hits.push({ line: li, sym: base, count, win: w });
    }
    /* スキャッター（位置を問わず個数だけ） */
    let sc = 0;
    for (let c = 0; c < 5; c++) for (let r = 0; r < 3; r++) if (grid[c][r] === "SC") sc++;
    let scWin = 0;
    if (SCAT_PAY[Math.min(5, sc)]) { scWin = SCAT_PAY[Math.min(5, sc)] * totalBet * sc0 * mul; win += scWin; }
    return { win, hits, sc, scWin };
  }

  /* ══════════════════════════════════════════
     FORTUNE GAUGE — 預けたぶんを、好きな形で返してもらう
     ------------------------------------------
     ・毎ベット GAUGE_RATE を預かる（＝通常配当から抜いてある）
     ・GAUGE_SPINS 回まわすとゲージが満タン。溜まった額 pool を
       3つのうち好きな形で受け取れる。
     ★ 3つとも <b>期待値はぴったり pool</b>。違うのは荒さだけ。
         SECURE   … pool ×1 を確定で（100%）
         SURGE    … 次の1スピンの配当を ×M（当たらなければ0）
                     M = 1 + pool / (期待配当) なので、上乗せぶんの期待値＝pool
         BURST    … 次の1スピンで中央リール全 WILD ＋ 配当 ×S
                     S = (期待配当 + pool) / (全WILD時の期待配当)
                     → その1スピンの期待値が「通常＋pool」ちょうどになる
     ══════════════════════════════════════════ */
  const GAUGE_RATE  = 0.08;   // ベットのうちゲージへ預かる割合
  const GAUGE_SPINS = 30;     // 満タンまでの回転数

  /* 中央リールを全 WILD にしたときの配当が、通常の何倍になるか。
     解析で出すのは大変なので、初回だけ実測してキャッシュする（数十ms）。 */
  let _wildMul = 0;
  function wildReelMul(n) {
    if (_wildMul) return _wildMul;
    n = n || 40000;
    const bet = 1000;
    let a = 0, b = 0;
    for (let i = 0; i < n; i++) {
      a += evalGrid(spinGrid().grid, bet, NLINE, 1).win;
      b += evalGrid(spinGrid({ wildReel: 2 }).grid, bet, NLINE, 1).win;
    }
    _wildMul = (b / Math.max(1, a)) || 3.4;
    return _wildMul;
  }

  /* ゲージの3ルート。expWin = そのベットでの通常スピンの期待配当 */
  function gaugeRoutes(pool, expWin) {
    const wm = wildReelMul();
    const surge = 1 + pool / Math.max(1, expWin);
    const burst = (expWin + pool) / Math.max(1, expWin * wm);
    return [
      { id: "secure", ic: "🛡", nm: "SECURE", jp: "確定ボーナス",
        ds: "いま溜まっているぶんを、そのまま確実に受け取る。",
        tag: "100% 確定", val: Math.round(pool) },
      { id: "surge", ic: "⚡", nm: "SURGE", jp: "倍率上乗せ",
        ds: "次の1スピンの配当が跳ね上がる。ただし外せば何も残らない。",
        tag: "次の1回 ×" + surge.toFixed(2), mul: surge },
      { id: "burst", ic: "🔥", nm: "WILDBURST", jp: "ワイルド爆発",
        ds: "次の1スピンは中央リールが<b>全 WILD</b>。当たりやすく、そのうえ倍率つき。",
        tag: "全WILD ＋ ×" + burst.toFixed(2), mul: burst, wildReel: 2 },
    ];
  }

  /* ══════════════════════════════════════════
     BONUS の分岐（3つとも期待値がぴったり同じ）
     ------------------------------------------
     ★ CHANCE ZONE（フリースピン中に育つ倍率）
       倍率は base×0.5 から始まり、最後のスピンで base×1.5 まで<b>まっすぐ伸びる</b>。
       等差数列なので平均はちょうど base ＝ ルート間の期待値の釣り合いを壊さない。
       「後半になるほどアツい」という手触りだけを足せる。
     ══════════════════════════════════════════ */
  const BONUS_OPTS = [
    { id: "steady", nm: "STEADY", jp: "堅実ルート",   ic: "🛡", ds: "フリースピン 20回・倍率 ×1",
      sub: "こまかく積む。長く楽しみたいとき", fs: 20, mul: 1, wildReel: null, retrig: 0.10 },
    { id: "power",  nm: "POWER",  jp: "倍率ルート",   ic: "⚡", ds: "フリースピン 10回・倍率 ×2",
      sub: "回数を半分、そのぶん1回が重い", fs: 10, mul: 2, wildReel: null, retrig: 0.10 },
    { id: "super",  nm: "SUPER",  jp: "SUPER BONUS", ic: "🔥", ds: "フリースピン 5回・倍率 ×2・中央リール全 WILD",
      sub: "たった5回に全部を賭ける", fs: 5,  mul: 2, wildReel: 2,    retrig: 0.10 },
  ];
  /* ★ 3つの期待値を等しく保つための約束ごと
       ① 上乗せの回数は 3つとも同じ固定値（RETRIG_ADD / RETRIG_BIG）。
          fs に比例させると効果が fs の2乗で効いて、回数の多いルートだけ得をする。
       ② steady(20×1) と power(10×2) は 20 で一致。
       ③ super は中央リールが全 WILD になるぶん1回の取り分がおよそ4倍なので、
          回数を 5 にして 5×4 ≒ 20 に合わせている。
     実測は MJSlotMath.mcOpts()（3つの ev がそろっていればOK）。 */
  const RETRIG_ADD = 3;
  const RETRIG_BIG = 8;
  const ZONE_SPAN  = 1.0;   // 倍率の振れ幅（0.5倍 → 1.5倍。平均は 1.0 のまま）

  function bonusOpts() { return BONUS_OPTS.map((o) => Object.assign({}, o)); }
  /* i 回目（0 始まり）のフリースピンで使う倍率 */
  function zoneMul(baseMul, i, fs) {
    if (fs <= 1) return baseMul;
    const t = i / (fs - 1);                                    // 0 → 1
    return baseMul * (1 - ZONE_SPAN / 2 + ZONE_SPAN * t);      // 0.5 → 1.5（平均 1.0）
  }

  /* ══════════════════════════════════════════
     DOUBLE CHANCE — 確定するか、賭けるか
     ★ どの段も p × 倍率 = 1.00。つまり期待値は「確定する」とまったく同じ。
       失敗すれば全部消えるので、変わるのは荒さだけ。
     ══════════════════════════════════════════ */
  const DOUBLE_STEPS = [
    { id: "x2",  mul: 2,  p: 1 / 2,  nm: "×2",  ds: "半分の確率。まずは軽く" },
    { id: "x5",  mul: 5,  p: 1 / 5,  nm: "×5",  ds: "5回に1回。ここからが本番" },
    { id: "x10", mul: 10, p: 1 / 10, nm: "×10", ds: "10回に1回。成功すれば JACKPOT 抽選つき" },
  ];
  function doubleSteps() { return DOUBLE_STEPS.map((s) => Object.assign({}, s)); }

  /* ══════════════════════════════════════════
     還元率の実測（モンテカルロ）
     ・mc() は「通常配当だけ」を測る。FORTUNE GAUGE のぶん（8%）は
       別会計なので、ここは BASE_TARGET＝0.90 前後になるのが正しい。
     ★ 配当には<b>本日の還元率</b>が掛かっているので、設計値を検算するときは
       先に MJ.setDayRtp(0.98)（＝平均の日に固定）してから測ること。
       終わったら MJ.setDayRtp(null) で戻す。
     ══════════════════════════════════════════ */
  function retrigAdd(big) { return big ? RETRIG_BIG : RETRIG_ADD; }
  function playFreeSpins(o, totalBet, lines) {
    let left = o.fs, won = 0, guard = 0, i = 0;
    const total = o.fs;
    while (left > 0 && guard++ < 400) {
      left--;
      const { grid } = spinGrid({ wildReel: o.wildReel });
      const ev = evalGrid(grid, totalBet, lines, zoneMul(o.mul, Math.min(i, total - 1), total));
      won += ev.win;
      i++;
      if (ev.sc >= 3) left += retrigAdd(R() < o.retrig);
    }
    return won;
  }
  function mc(n, forceOpt, lines) {
    n = n || 200000;
    const bet = 200;
    lines = lines || NLINE;
    let wagered = 0, won = 0, bonuses = 0;
    for (let i = 0; i < n; i++) {
      wagered += bet;
      const { grid } = spinGrid();
      const ev = evalGrid(grid, bet, lines, 1);
      won += ev.win;
      if (ev.sc >= 3) {
        bonuses++;
        const o = forceOpt ? BONUS_OPTS.find((x) => x.id === forceOpt) : BONUS_OPTS[Math.floor(R() * BONUS_OPTS.length)];
        won += playFreeSpins(o, bet, lines);
      }
    }
    return { n, rtp: won / wagered, withGauge: won / wagered + GAUGE_RATE * DAY(), bonusRate: bonuses / n };
  }
  /* BONUS ルートごとの期待値（1回の突入あたり・総ベットの何倍か）。
     3つがそろっていれば「どれを選んでも損得なし」が保証できる。 */
  function mcOpts(n) {
    n = n || 60000;
    const bet = 200;
    return BONUS_OPTS.map((o) => {
      let w = 0;
      for (let i = 0; i < n; i++) w += playFreeSpins(o, bet, NLINE);
      return { id: o.id, ev: w / n / bet };
    });
  }
  /* ライン数を変えても還元率が動かないことの確認 */
  function mcLines(n) { return [20, 10, 5].map((L) => ({ lines: L, rtp: mc(n || 150000, null, L).rtp })); }

  window.MJSlotMath = {
    SYM, REELS, LINES, NLINE, SCAT_PAY, PAY_SCALE, BASE_TARGET, ps,
    GAUGE_RATE, GAUGE_SPINS, ZONE_SPAN,
    spinGrid, evalGrid, bonusOpts, zoneMul, gaugeRoutes, doubleSteps, wildReelMul,
    mc, mcOpts, mcLines, playFreeSpins, retrigAdd,
  };
})();


/* ══════════════════════════════════════════════════════════
   表示部（v3 レイアウト刷新）
   ------------------------------------------------------------
   ★ 1画面で完結させる
     盤面が縦に伸び（.mf-reels は flex:1）、設定と説明は
       ・よく使うもの（スタイル・ベット）→ 下の操作バーに常設
       ・ときどき見るもの（配当表・あそびかた・図鑑・設定）→ MENU のボトムシート
       ・その場の選択（ゲージ・BONUS ルート・DOUBLE CHANCE）→ 盤面中央のオーバーレイ
     に振り分けた。遊んでいるあいだスクロールは一度も要らない。
   ══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const M = window.MJ, X = window.MJSlotMath;
  const fmt = M.fmt, esc = M.esc;

  const G = "slot";
  let st = null, ro = null;

  /* ── プレイスタイル：総ベットは変えずに「何本に分けるか」だけを変える。
     どのラインも統計的に等価なので期待値は完全に同じ。純粋なリスク選択。 ── */
  const STYLES = [
    { id: "safe",   nm: "SAFE",   jp: "安定", lines: 20, ic: "🛡",
      ds: "こまかく当たる。じっくり長く回したいとき" },
    { id: "normal", nm: "NORMAL", jp: "標準", lines: 10, ic: "⚖",
      ds: "当たりの回数と大きさのバランス型" },
    { id: "risk",   nm: "RISK",   jp: "挑戦", lines: 5,  ic: "🐉",
      ds: "当たりにくいが1回が4倍大きい。一発勝負" },
  ];

  /* 演出図鑑（見た演出を覚えておいて、期待度を後から確認できる） */
  const FX_BOOK = [
    { id: "reach",  ic: "🎯", nm: "スキャッターリーチ", ds: "4列目までに 🎰 が2つ。最後の1列がゆっくり止まる", rate: "BONUS 期待度 やや高" },
    { id: "lock",   ic: "🔒", nm: "リールロック",       ds: "止まったリールが逆再生で押し戻される",             rate: "BONUS 期待度 高" },
    { id: "zoom",   ic: "🔍", nm: "カメラズーム",       ds: "盤面に寄って時間が止まる",                         rate: "BIG WIN 以上が濃厚" },
    { id: "cutin",  ic: "💥", nm: "キャラカットイン",   ds: "キャラが画面を横切る（3段階）",                    rate: "出るほどアツい" },
    { id: "gold",   ic: "👑", nm: "ゴールドフレーム",   ds: "リール枠が黄金に変わる",                           rate: "BONUS 確定" },
    { id: "zone",   ic: "🌟", nm: "CHANCE ZONE",        ds: "フリースピン中に倍率がぐんぐん伸びる",             rate: "後半ほど倍率が大きい" },
  ];

  function symHTML(id, h) {
    const s = X.SYM[id];
    const inner = s.img
      ? '<img src="' + s.img + '" alt="' + esc(s.nm) + '" loading="lazy">'
      : '<span class="g">' + s.g + "</span>";
    return '<div class="mj-sym ' + s.cls + '" data-s="' + id + '" style="height:' + h + 'px">' + inner + "</div>";
  }

  /* ══════════════════════════════════════════
     卓を組み立てる
     ══════════════════════════════════════════ */
  function mount(root) {
    st = {
      bet: 500, style: "normal", lines: 10,
      mode: "normal", mul: 1, wildReel: null,
      fsLeft: 0, fsTotal: 0, fsIdx: 0, fsWon: 0, opt: null,
      spinning: false, lastWin: 0, auto: false, autoLeft: 0,
      charge: M.S.slotCharge || 0, pool: M.S.slotPool || 0,
      pending: null, dbl: 0,
      lastGrid: null, fxSeen: M.S.slotFx || {},
      rowh: 52, needBuild: false,
    };
    root.innerHTML =
      '<div class="mjs g-mf">' +
        '<div class="mjs-top">' +
          '<button class="x" id="mfBack" aria-label="ロビーへ戻る">‹</button>' +
          '<div class="ttl"><b>Magi</b><i>FORTUNE</i><u>5 REEL</u></div>' +
          '<div class="bal"><img src="../XEVA.png" alt=""><span id="mfBal">0</span></div>' +
        "</div>" +

        '<div class="mjs-main">' +
          /* ── うすい帯：ジャックポット＋2つのメーター ── */
          '<div class="mjs-bar">' +
            '<div class="mjs-jp"><div class="k">JACKPOT' +
              '<span class="live" id="mfJpLive">SHARED</span></div>' +
              '<div class="v" id="mfJp">0</div></div>' +
            '<div class="mjs-meter" id="mfGaugeBox"><span class="k">FORTUNE</span>' +
              '<span class="v" id="mfGaugeV">0%</span>' +
              '<span class="bar"><i id="mfGaugeBar"></i></span></div>' +
            '<div class="mjs-meter" id="mfZoneBox"><span class="k">ZONE</span>' +
              '<span class="v" id="mfZone">×1.00</span></div>' +
          "</div>" +

          /* ── リール（台座が伸び、筐体は中身の高さに沿う） ── */
          '<div class="mf-stage" id="mfStage">' +
            '<div class="mf-machine" id="mfMachine">' +
              '<div class="mf-mode" id="mfMode">NORMAL</div>' +
              '<div class="mf-reels" id="mfReels"></div>' +
              '<div class="mf-lines" id="mfLines">10 LINES</div>' +
            "</div>" +
          "</div>" +

          /* ── 勝ち表示 ── */
          '<div class="mf-foot">' +
            '<div class="w1"><span class="k">FREE SPIN</span><span class="v" id="mfFs">—</span></div>' +
            '<div class="w2"><span class="k">TOTAL WIN</span><span class="v" id="mfWin">0</span></div>' +
            '<div class="w3"><span class="k">MULTIPLIER</span><span class="v" id="mfMul">×1</span></div>' +
          "</div>" +
          /* ★ 台に入った第一声で「今日の条件」を言ってしまう。
             メニューの奥にしまうと、いちばん知りたい人がいちばん見つけられない。 */
          '<div class="mjs-msg" id="mfMsg">' + M.rtpLine() + " — SPIN を押して、運命をまわそう</div>" +

          /* ── その場の選択（中央に出す） ── */
          '<div class="mjs-ov" id="mfOv"></div>' +
          '<div class="mjs-burst" id="mfBurst"><div class="t" id="mfBurstT"></div><div class="s" id="mfBurstS"></div></div>' +
        "</div>" +

        /* ── 下の操作バー ── */
        '<div class="mjs-act">' +
          '<div class="r">' +
            '<div class="mjs-seg" id="mfStyles"></div>' +
            '<div class="mjs-bet"><span class="k">BET</span><span class="v" id="mfBetV">500</span>' +
              '<button id="mfBetD" aria-label="ベットを下げる">−</button>' +
              '<button id="mfBetU" aria-label="ベットを上げる">＋</button></div>' +
          "</div>" +
          '<div class="r">' +
            '<button class="mjs-ic" id="mfMenu">☰<br><i>MENU</i></button>' +
            '<button class="mjs-go" id="mfSpin"><b>SPIN</b><small>長押しでオート</small></button>' +
            '<button class="mjs-ic wide" id="mfMax">MAX<br><i>BET</i></button>' +
            '<button class="mjs-ic wide" id="mfAuto">AUTO<br><i>OFF</i></button>' +
          "</div>" +
        "</div>" +
      "</div>";

    paintStyles(); paintBetV(); paintBal(); paintGauge(); paintZone(); paintJp();
    document.getElementById("mfBack").onclick = () => { M.SFX.click(); window.mjGo("home"); };
    document.getElementById("mfMenu").onclick = openMenu;
    document.getElementById("mfMax").onclick = () => { st.bet = M.BETS[M.BETS.length - 1]; M.SFX.chip(); paintBetV(); };
    document.getElementById("mfBetU").onclick = () => stepBet(1);
    document.getElementById("mfBetD").onclick = () => stepBet(-1);
    document.getElementById("mfAuto").onclick = toggleAuto;
    wireSpin();

    /* ★ リールの高さは「残った空間」から決めるので、レイアウトが確定してから組む。
       向きが変わったときも組み直す（回転中はフラグにして、止まってから）。 */
    requestAnimationFrame(buildReels);
    /* ★ 見張るのは筐体。窓は自分で高さを入れるので、窓を見張ると自分の変更で鳴き続ける。 */
    const box = document.getElementById("mfStage");
    if (window.ResizeObserver && box) {
      ro = new ResizeObserver(() => {
        if (!st) return;
        if (st.spinning) { st.needBuild = true; return; }
        buildReels();
      });
      ro.observe(box);
    }

    if (!M.tutorialSeen(G)) { showTutorial(); M.tutorialMark(G); }
    window.addEventListener("mj:wallet", paintBal);
    window.addEventListener("mj:jackpot", paintJp);
    st.jpTimer = setInterval(paintJp, 2000);
  }

  /* SPIN は「押す＝1回」「長押し＝オート」。
     ★ pointerdown/up でやると、押した瞬間にスクロールが起きた端末で
       up が来ずに押しっぱなし判定になる。click と長押しタイマーを分けて持つ。 */
  function wireSpin() {
    const b = document.getElementById("mfSpin");
    let holdT = 0, held = false;
    const down = () => {
      held = false;
      clearTimeout(holdT);
      holdT = setTimeout(() => { held = true; toggleAuto(); }, 620);
    };
    const up = () => { clearTimeout(holdT); };
    b.addEventListener("pointerdown", down);
    b.addEventListener("pointerup", up);
    b.addEventListener("pointercancel", up);
    b.addEventListener("pointerleave", up);
    b.onclick = () => { if (held) { held = false; return; } if (!st.spinning) spin(); };
  }

  function stepBet(d) {
    const i = M.BETS.indexOf(st.bet);
    const n = Math.max(0, Math.min(M.BETS.length - 1, (i < 0 ? 1 : i) + d));
    st.bet = M.BETS[n]; M.SFX.chip(); paintBetV();
  }

  /* ══════════════════════════════════════════
     描画
     ══════════════════════════════════════════ */
  /* 1コマの高さ。
     ★ 基準にするのは「窓（.mf-reels）」ではなく「筐体（.mf-machine）」の高さ。
       窓には下で明示的に高さを入れるので、窓を測ると自分が入れた値を測り返して
       伸び縮みしなくなる（＝向きを変えても直らない）。
     コマが細長くなりすぎないよう、横幅でも頭打ちにする。 */
  function rowH() {
    const mc = document.getElementById("mfStage");
    const box = document.getElementById("mfReels");
    if (!mc || !box) return 52;
    const avail = mc.clientHeight - 40;                  // モード名とライン表示のぶん
    const colw = (box.clientWidth - 14) / 5;
    if (avail < 90 || colw < 12) return 52;              // まだレイアウトが決まっていないとき
    return Math.max(30, Math.floor(Math.min(avail / 3, colw * 1.7)));
  }
  function buildReels() {
    const box = document.getElementById("mfReels"); if (!box || !st) return;
    const h = rowH();
    st.rowh = h;
    st.needBuild = false;
    /* 絵柄の大きさ（画像も絵文字も）を1つの数字から起こす。
       ここを別々に決めると、絵文字の図柄だけ小さく見えてしまう。 */
    const colw = (box.clientWidth - 14) / 5;
    box.style.setProperty("--cell", Math.round(Math.min(h, colw) * 0.94) + "px");
    /* ★ 窓の高さは「3コマぶん」をきっちり指定する。
       ここを高さ自動にすると、帯（18コマ）の高さがそのまま窓になり、
       止まったあとに図柄が上に3つだけ並んで下がごっそり空く。 */
    box.style.height = (h * 3 + 8) + "px";
    box.innerHTML = "";
    for (let c = 0; c < 5; c++) {
      const reel = document.createElement("div");
      reel.className = "mf-reel";
      reel.style.height = h * 3 + "px";
      const strip = document.createElement("div");
      strip.className = "mf-strip";
      strip.innerHTML = Array.from({ length: 18 }, () => symHTML(randSym(c), h)).join("");
      reel.appendChild(strip);
      box.appendChild(reel);
    }
    /* 前回の出目が残っているなら、それを見せておく（戻ってきたときに白紙にならない） */
    if (st.lastGrid) showGrid(st.lastGrid, h);
  }
  function showGrid(grid, h) {
    const strips = [...document.querySelectorAll("#mfReels .mf-strip")];
    strips.forEach((s, c) => {
      s.style.transition = "none";
      s.innerHTML = grid[c].map((id) => symHTML(id, h)).join("");
      s.style.transform = "translateY(0)";
    });
  }
  function randSym(c) { const s = X.REELS[c]; return s[Math.floor(M.rng() * s.length)]; }

  function paintBal() { const b = document.getElementById("mfBal"); if (b) b.textContent = fmt(M.xeva()); }
  function paintJp() {
    const v = document.getElementById("mfJp"); if (!v) return;
    v.textContent = fmt(M.jackpot());
    const l = document.getElementById("mfJpLive");
    /* ★ 2026-08-12 「なぜ共有できていないのか」を札に出す。
       waiting＝まだ届いていない（起動直後・回線が遅い）／denied＝読めない（DBのルール） */
    if (l) {
      const s = M.jackpotState ? M.jackpotState() : (M.jackpotShared() ? "shared" : "denied");
      l.textContent = s === "shared" ? "SHARED" : s === "waiting" ? "同期中…" : "OFFLINE";
      l.className = "live" + (s === "shared" ? "" : " off");
      l.title = s === "shared" ? "みんなで共有しているプールです"
        : s === "waiting" ? "共有プールの残高を読み込んでいます"
        : "共有プールに接続できません（この端末のプールで遊んでいます）";
    }
  }
  function paintStyles() {
    const box = document.getElementById("mfStyles"); if (!box) return;
    box.innerHTML = STYLES.map((s) =>
      '<button class="' + (s.id === st.style ? "on" : "") + '" data-s="' + s.id + '">' +
        s.ic + " " + esc(s.jp) + "<small>" + s.lines + " LINE</small></button>").join("");
    box.querySelectorAll("[data-s]").forEach((b) => {
      b.onclick = () => {
        if (st.fsLeft > 0) { M.toast("フリースピン中はスタイルを変えられません"); return; }
        const s = STYLES.find((x) => x.id === b.dataset.s);
        st.style = s.id; st.lines = s.lines;
        M.SFX.click(); paintStyles();
        const el = document.getElementById("mfLines"); if (el) el.textContent = s.lines + " LINES";
      };
    });
    const el = document.getElementById("mfLines");
    if (el) el.textContent = st.lines + " LINES";
  }
  function paintBetV() {
    const e = document.getElementById("mfBetV"); if (e) e.textContent = fmt(st.bet);
    const chips = document.getElementById("mfBets");
    if (chips) paintChips(chips);
  }
  /* ベット額のチップ（MENU シートの中） */
  function paintChips(box) {
    box.innerHTML = M.BETS.map((v, i) =>
      '<button class="mj-chip c' + (i + 1) + (v === st.bet ? " on" : "") + '" data-b="' + v + '"' +
      (M.xeva() < v ? " disabled" : "") + ">" + (v >= 1000 ? (v / 1000) + "K" : v) + "</button>").join("");
    box.querySelectorAll("[data-b]").forEach((b) => {
      b.onclick = () => { st.bet = +b.dataset.b; M.SFX.chip(); paintBetV(); };
    });
  }
  function paintGauge() {
    const v = document.getElementById("mfGaugeV"), bar = document.getElementById("mfGaugeBar");
    if (!v || !bar) return;
    const pct = Math.min(100, Math.round(st.charge / X.GAUGE_SPINS * 100));
    v.textContent = pct + "%";
    bar.style.width = pct + "%";
    const boxEl = document.getElementById("mfGaugeBox");
    if (boxEl) boxEl.classList.toggle("full", pct >= 100);
  }
  function paintZone() {
    const z = document.getElementById("mfZone"); if (!z) return;
    z.textContent = "×" + st.mul.toFixed(2);
    const zb = document.getElementById("mfZoneBox");
    if (zb) zb.classList.toggle("hot", st.mul >= 1.8);
    const fs = document.getElementById("mfFs");
    if (fs) fs.textContent = st.fsTotal ? (st.fsTotal - st.fsLeft) + " / " + st.fsTotal : "—";
    const mu = document.getElementById("mfMul");
    if (mu) mu.textContent = "×" + (Math.round(st.mul * 100) / 100);
  }
  function msg(html, cls) {
    const f = document.getElementById("mfMsg"); if (!f) return;
    f.innerHTML = html; f.className = "mjs-msg" + (cls ? " " + cls : "");
  }
  function setMode(m) {
    st.mode = m;
    const w = document.getElementById("mfMachine");
    if (w) w.className = "mf-machine" + (m === "normal" ? "" : " m-" + m);
    const e = document.getElementById("mfMode");
    if (e) e.textContent = m === "free" ? "FREE SPIN" : m === "super" ? "SUPER BONUS" : m === "bonus" ? "BONUS" : "NORMAL";
  }

  /* ══════════════════════════════════════════
     中央のオーバーレイ
     ══════════════════════════════════════════ */
  function ovOpen(html, cls) {
    const el = document.getElementById("mfOv"); if (!el) return null;
    el.innerHTML = '<div class="mjs-card' + (cls ? " " + cls : "") + '">' + html + "</div>";
    el.classList.add("on");
    return el;
  }
  function ovClose() {
    const el = document.getElementById("mfOv"); if (!el) return;
    el.classList.remove("on"); el.innerHTML = "";
  }

  /* ══════════════════════════════════════════
     演出パーツ
     ══════════════════════════════════════════ */
  function seeFx(id) { st.fxSeen[id] = 1; M.S.slotFx = st.fxSeen; }
  /* キャラクターのカットイン。level 1=熱 2=激熱 3=確定（絵は MJ.cutIn が持つ） */
  function cutIn(level) {
    seeFx("cutin");
    const word = level >= 3 ? "運命を、掴み取れ" : level >= 2 ? "まだ終わらない" : "……来る";
    return M.cutIn({ level: level, word: word });
  }
  function zoom(on) {
    const el = document.getElementById("mfMachine"); if (!el) return;
    el.classList.toggle("zoom", !!on);
    if (on) seeFx("zoom");
  }
  function goldFrame(on) {
    const el = document.getElementById("mfMachine"); if (!el) return;
    el.classList.toggle("gold", !!on);
    if (on) seeFx("gold");
  }
  /* 大きい勝ちの全画面バナー */
  async function bigBanner(title, sub, cls, ms) {
    const box = document.getElementById("mfBurst"); if (!box) return;
    document.getElementById("mfBurstT").textContent = title;
    document.getElementById("mfBurstS").textContent = sub;
    box.className = "mjs-burst on" + (cls ? " " + cls : "");
    await M.sleep(ms || 1500);
    box.className = "mjs-burst";
  }

  /* ══════════════════════════════════════════
     1スピン
     ══════════════════════════════════════════ */
  async function spin() {
    if (!st || st.spinning) return;
    /* ★ 選択のオーバーレイが出ているあいだは回さない。
       ここを許すと、オートの予約が生きたまま裏で回ってしまい、
       「選んでいる最中に残高だけ減っていく」という最悪の体験になる。 */
    if (st.choosing) return;
    const free = st.fsLeft > 0;
    if (!free) {
      if (M.xeva() < st.bet) { msg("XEVA が足りません", "bad"); stopAuto(); return; }
      if (!M.bet(st.bet, G)) { msg("ベットできませんでした", "bad"); stopAuto(); return; }
      /* ★ ゲージへ預かる。ここで抜いたぶんが、あとで丸ごと返る。
         預かる割合にも本日の倍率を掛ける＝甘い日はゲージも同じだけ厚くなる
         （通常配当だけ動かすと、内訳の比率が日によってズレてしまう）。 */
      st.pool += st.bet * X.GAUGE_RATE * M.dayMul();
      st.charge = Math.min(X.GAUGE_SPINS, st.charge + 1);
      M.S.slotPool = st.pool; M.S.slotCharge = st.charge;
      paintGauge();
    }
    st.spinning = true;
    document.getElementById("mfSpin").classList.add("busy");
    paintBal(); paintBetV();

    /* 保留していたゲージ効果を、この1回に乗せる */
    const boost = st.pending; st.pending = null;
    const wildReel = boost && boost.wildReel != null ? boost.wildReel : st.wildReel;
    const baseMul = free ? X.zoneMul(st.opt.mul, st.fsIdx, st.fsTotal) : 1;
    const mul = baseMul * (boost && boost.mul ? boost.mul : 1);
    st.mul = mul; paintZone();

    const { grid } = X.spinGrid({ wildReel: wildReel });
    const ev = X.evalGrid(grid, st.bet, st.lines, mul);
    const win = Math.round(ev.win);

    await animateReels(grid, ev, boost);
    /* ★ 演出の途中でロビーに戻られていたら、ここから先は触らない。
       unmount 後は st も DOM も無いので、続けると必ず落ちる。 */
    if (!st) return;
    if (ev.hits.length) highlight(ev.hits);
    st.lastGrid = grid;
    st.lastWin = win;
    document.getElementById("mfWin").textContent = fmt(win);

    /* ジャックポット抽選（フリースピン中は賭けていないので回さない） */
    const jp = free ? 0 : await M.jackpotRoll(st.bet);
    if (!st) return;

    if (win > 0) {
      M.payout(win, G, "Magi Fortune");
      paintBal();
      const r = win / Math.max(1, st.bet);
      if (r >= 50) {
        zoom(true); await cutIn(3); zoom(false);
        M.SFX.bigwin(); M.shake(true); M.burst(220, 14);
        await bigBanner("MEGA WIN!!", "+" + fmt(win) + " XEVA", "", 1700);
        msg("👑 <b>MEGA WIN!</b>　+" + fmt(win), "win");
      } else if (r >= 20) {
        await cutIn(2);
        M.SFX.bigwin(); M.shake(true); M.burst(150, 12);
        await bigBanner("BIG WIN!!", "+" + fmt(win) + " XEVA", "", 1250);
        msg("💥 <b>BIG WIN!</b>　+" + fmt(win), "win");
      } else if (r >= 5) { M.SFX.win(); M.burst(60, 9); msg("✨ ナイスヒット　+" + fmt(win)); }
      else              { M.SFX.chip(); msg("+" + fmt(win) + " XEVA"); }
    } else {
      msg(free ? "つぎのフリースピンへ…" : boost ? "……今回は届かなかった" : "はずれ。次で取り返そう");
    }
    if (!st) return;

    if (free) { st.fsWon += win; st.fsLeft--; st.fsIdx++; }
    paintZone();
    M.round({ game: G, bet: free ? 0 : st.bet, win: win,
      replay: { kind: "slot", grid: grid.map((c) => c.slice()), mul: Math.round(mul * 100) / 100, mode: st.mode } });

    st.spinning = false;
    const sb2 = document.getElementById("mfSpin"); if (sb2) sb2.classList.remove("busy");
    if (st.needBuild) buildReels();

    if (jp > 0) { M.payout(jp, G, "プログレッシブ・ジャックポット"); paintBal(); await M.jackpotShow(jp); }
    if (!st) return;

    /* BONUS 突入 */
    if (ev.sc >= 3 && st.fsLeft <= 0 && st.fsTotal <= 0) { stopAuto(); await enterBonus(); return; }
    /* フリースピン中の上乗せ */
    if (ev.sc >= 3 && st.fsLeft > 0 && st.opt) {
      const add = X.retrigAdd(M.chance(st.opt.retrig));
      st.fsLeft += add; st.fsTotal += add;
      M.SFX.hot(); M.toast("🔁 <b>+" + add + " 回</b> 上乗せ！");
      paintZone();
    }
    /* フリースピン終了 → ダブルチャンスへ */
    if (st.fsTotal > 0 && st.fsLeft <= 0) { await endFree(); return; }

    /* ゲージが満タンになったら、使うかどうかを聞く（オートは止める） */
    if (!free && st.charge >= X.GAUGE_SPINS && !st.pending) { stopAuto(); openGauge(); return; }

    if (st.auto) {
      if (st.autoLeft > 0) st.autoLeft--;
      if (M.xeva() < st.bet) { stopAuto(); M.toast("XEVA が足りなくなったのでオートを止めました"); return; }
      if (st.autoLeft === 0) { stopAuto(); return; }
      st.timer = setTimeout(() => { if (st && st.auto && !st.spinning) spin(); }, M.S.set.fast ? 200 : 460);
    } else if (st.fsLeft > 0) {
      st.timer = setTimeout(() => { if (st && !st.spinning) spin(); }, M.S.set.fast ? 240 : 560);
    }
  }

  /* ── リールを回して1本ずつ止める（じらし込み） ── */
  async function animateReels(grid, ev, boost) {
    const h = st.rowh;
    const reels = [...document.querySelectorAll("#mfReels .mf-reel")];
    if (!reels.length) { buildReels(); return; }
    const strips = reels.map((r) => r.querySelector(".mf-strip"));
    goldFrame(false);
    if (boost && boost.wildReel != null) goldFrame(true);

    strips.forEach((s, i) => {
      s.innerHTML = Array.from({ length: 18 }, () => symHTML(randSym(i), h)).join("");
      s.style.transition = "none";
      s.style.transform = "translateY(0)";
    });
    await M.sleep(24);
    strips.forEach((s, i) => {
      s.style.transition = "transform " + (0.85 + i * 0.16) + "s cubic-bezier(.16,.62,.2,1)";
      s.style.transform = "translateY(" + (-(15 - 3) * h) + "px)";
    });
    let ticks = 0;
    const iv = setInterval(() => { M.SFX.reel(); if (++ticks > 26) clearInterval(iv); }, 55);

    /* 最終的にそろう「高配当の絵柄」を先に知っておくと、リーチのじらしを作れる */
    const bigHit = ev.hits.find((x) => x.count >= 4 && X.SYM[x.sym].cls === "hi");

    for (let c = 0; c < 5; c++) {
      await M.sleep(c === 0 ? 560 : 190);
      if (!st) { clearInterval(iv); return; }
      const s = strips[c];
      s.style.transition = "none";
      s.innerHTML = Array.from({ length: 15 }, () => symHTML(randSym(c), h)).join("") +
        grid[c].map((id) => symHTML(id, h)).join("");
      s.style.transform = "translateY(" + (-(15 - 0) * h) + "px)";
      requestAnimationFrame(() => { s.style.transform = "translateY(" + (-15 * h) + "px)"; });
      reels[c].classList.remove("stopping"); void reels[c].offsetWidth; reels[c].classList.add("stopping");
      M.SFX.stop();

      /* ── 4列目で、期待できるならじらす ── */
      if (c === 3) {
        let sc = 0;
        for (let k = 0; k <= 3; k++) for (let rr = 0; rr < 3; rr++) if (grid[k][rr] === "SC") sc++;
        if (sc >= 2) {
          seeFx("reach");
          M.slow(true); M.SFX.hot();
          msg("🔥 <b>スキャッターリーチ！</b>", "hot");
          reels[4].classList.add("locked"); seeFx("lock");
          await M.sleep(900);
          if (!st) { clearInterval(iv); return; }
          if (ev.sc >= 3 || bigHit) await cutIn(ev.sc >= 3 ? 3 : 2);
          if (!st) { clearInterval(iv); return; }
          reels[4].classList.remove("locked");
          M.slow(false);
        } else if (bigHit) {
          M.slow(true); msg("🎯 <b>リーチ！</b>", "hot");
          await M.sleep(560);
          M.slow(false);
        }
      }
    }
    clearInterval(iv);
    goldFrame(ev.sc >= 3);
    await M.sleep(50);
  }

  function highlight(hits) {
    const reels = [...document.querySelectorAll("#mfReels .mf-reel")];
    hits.forEach((hit) => {
      const path = X.LINES[hit.line];
      for (let c = 0; c < hit.count; c++) {
        if (!reels[c]) continue;
        const syms = reels[c].querySelectorAll(".mj-sym");
        const el = syms[syms.length - 3 + path[c]];
        if (el) el.classList.add("hit");
      }
    });
    setTimeout(() => document.querySelectorAll("#mfReels .mj-sym.hit").forEach((e) => e.classList.remove("hit")), 2400);
  }

  /* ══════════════════════════════════════════
     FORTUNE GAUGE — 使いかたを選ぶ
     ══════════════════════════════════════════ */
  function openGauge() {
    st.choosing = true;
    const pool = Math.round(st.pool);
    /* ★ 期待配当も本日ぶんを込みで見る。ここを設計値のままにすると、
       甘い日は SURGE / BURST の倍率が実際より高く計算されて EV がズレる。 */
    const expWin = st.bet * X.BASE_TARGET * M.dayMul();
    const routes = X.gaugeRoutes(pool, expWin);
    const el = ovOpen(
      '<div class="ch-hd"><span class="t">FORTUNE GAUGE</span>' +
        '<span class="s">預かっていた <b>' + fmt(pool) + " XEVA</b> を、どう受け取る？</span></div>" +
      '<div class="ch-note">3つとも<b>期待値はまったく同じ</b>。変わるのは荒さだけです。</div>' +
      '<div class="ch-list">' + routes.map((r) =>
        '<button class="ch-op ' + r.id + '" data-o="' + r.id + '">' +
          '<span class="ic">' + r.ic + "</span>" +
          '<span class="bd"><span class="t1">' + r.nm + "<i>" + esc(r.jp) + "</i></span>" +
          '<span class="t2">' + r.ds + "</span>" +
          '<span class="tag">' + esc(r.tag) + "</span></span></button>").join("") +
      "</div>" +
      '<button class="ch-later" id="mfGaugeLater">あとで使う</button>');
    if (!el) { st.choosing = false; return; }
    M.SFX.hot();
    el.querySelectorAll("[data-o]").forEach((b) => {
      b.onclick = async () => {
        const r = routes.find((x) => x.id === b.dataset.o);
        M.SFX.click();
        ovClose();
        st.choosing = false;
        st.charge = 0; st.pool = 0;
        M.S.slotCharge = 0; M.S.slotPool = 0;
        paintGauge(); M.saveNow();
        if (r.id === "secure") {
          M.payout(r.val, G, "FORTUNE GAUGE（確定）");
          paintBal(); M.SFX.win(); M.burst(70, 9);
          msg("🛡 <b>確定ボーナス</b>　+" + fmt(r.val), "win");
          return;
        }
        st.pending = { mul: r.mul, wildReel: r.wildReel != null ? r.wildReel : null, id: r.id };
        msg((r.id === "burst" ? "🔥 <b>WILDBURST</b>：次の1回は中央リール全WILD ＋ ×"
                              : "⚡ <b>SURGE</b>：次の1回は配当 ×") + r.mul.toFixed(2), "hot");
        await M.sleep(500);
        if (st && !st.spinning) spin();
      };
    });
    document.getElementById("mfGaugeLater").onclick = () => { M.SFX.click(); ovClose(); st.choosing = false; };
  }

  /* ══════════════════════════════════════════
     BONUS
     ══════════════════════════════════════════ */
  async function enterBonus() {
    st.choosing = true;
    setMode("bonus");
    goldFrame(true);
    zoom(true); await cutIn(3); zoom(false);
    if (!st) return;
    M.SFX.bigwin(); M.shake(true); M.burst(180, 13);
    await bigBanner("BONUS!!", "ルートを選ぼう", "", 1200);
    if (!st) return;
    const opts = X.bonusOpts();
    const el = ovOpen(
      '<div class="ch-hd"><span class="t">BONUS ROUTE</span><span class="s">どう攻める？</span></div>' +
      '<div class="ch-note">3つとも<b>期待値はまったく同じ</b>。選ぶのは「どれくらい荒れる勝負をするか」だけ。<br>' +
      "フリースピン中は <b>CHANCE ZONE</b> が働き、<b>後半になるほど倍率が伸びます</b>（平均は表示どおり）。</div>" +
      '<div class="ch-list">' + opts.map((o) =>
        '<button class="ch-op ' + o.id + '" data-o="' + o.id + '">' +
          '<span class="ic">' + o.ic + "</span>" +
          '<span class="bd"><span class="t1">' + o.nm + "<i>" + esc(o.jp) + "</i></span>" +
          '<span class="t2">' + esc(o.ds) + "</span>" +
          '<span class="tag">' + esc(o.sub) + "</span></span></button>").join("") + "</div>");
    if (!el) { st.choosing = false; return; }

    const pickId = await new Promise((res) => {
      el.querySelectorAll("[data-o]").forEach((b) => { b.onclick = () => { M.SFX.click(); res(b.dataset.o); }; });
    });
    if (!st) return;
    const o = opts.find((x) => x.id === pickId);
    ovClose();
    st.choosing = false;
    st.opt = o; st.fsLeft = o.fs; st.fsTotal = o.fs; st.fsIdx = 0; st.fsWon = 0; st.wildReel = o.wildReel;
    setMode(o.id === "super" ? "super" : "free");
    seeFx("zone");
    M.SFX.hot(); M.burst(90, 11);
    msg("▶ " + esc(o.jp) + "　フリースピン " + o.fs + " 回 スタート！", "win");
    paintZone();
    await M.sleep(800);
    if (st && !st.spinning) spin();
  }

  async function endFree() {
    const won = st.fsWon, total = st.fsTotal;
    st.fsLeft = 0; st.fsTotal = 0; st.fsIdx = 0; st.mul = 1; st.wildReel = null; st.opt = null;
    setMode("normal"); goldFrame(false); paintZone();
    stopAuto();
    if (won <= 0) {
      await M.result({ win: false, head: "BONUS 終了", amount: 0, emoji: "😢",
        desc: total + " 回のフリースピンでしたが、今回は伸びませんでした。" });
      return;
    }
    await doubleChance(won, total);
  }

  /* ══════════════════════════════════════════
     DOUBLE CHANCE — 確定するか、賭けるか
     ★ どの段も p × 倍率 = 1.00 ＝ 期待値は「確定する」と同じ。
     ══════════════════════════════════════════ */
  function doubleChance(amount, totalSpins) {
    st.choosing = true;
    return new Promise((resolve) => {
      let cur = Math.round(amount), step = 0;

      const paint = () => {
        const steps = X.doubleSteps();
        const el = ovOpen(
          '<div class="ch-hd"><span class="t">DOUBLE CHANCE</span>' +
            '<span class="s">' + (step ? step + " 回連続で成功中！" : (totalSpins ? totalSpins + " 回のフリースピンの成果" : "獲得したチップ")) + "</span></div>" +
          '<div class="dbl-amt">' + fmt(cur) + ' <small>XEVA</small></div>' +
          '<div class="ch-note">挑戦して<b>失敗すると 0</b> になります。' +
          "どの倍率も<b>成功率 × 倍率 = 1.00</b>——期待値はどれも同じで、変わるのは荒さだけです。</div>" +
          '<div class="dbl-list">' + steps.map((s) =>
            '<button class="dbl-op" data-d="' + s.id + '">' +
              '<span class="mu">' + s.nm + "</span>" +
              '<span class="pc">' + Math.round(s.p * 100) + "%</span>" +
              '<span class="to">→ ' + fmt(Math.round(cur * s.mul)) + "</span>" +
              '<span class="ds">' + esc(s.ds) + "</span></button>").join("") +
          "</div>" +
          '<button class="dbl-take" id="mfTake">💰 確定する（' + fmt(cur) + " XEVA を受け取る）</button>");
        if (!el) { st.choosing = false; resolve(); return; }

        document.getElementById("mfTake").onclick = () => {
          M.payout(cur, G, "Magi Fortune（BONUS 確定）");
          paintBal(); M.SFX.win(); M.burst(110, 11);
          msg("💰 <b>+" + fmt(cur) + " XEVA</b> を確定しました", "win");
          ovClose();
          st.choosing = false;
          resolve();
        };
        el.querySelectorAll("[data-d]").forEach((b) => {
          b.onclick = async () => {
            const s = steps.find((x) => x.id === b.dataset.d);
            el.querySelectorAll("button").forEach((x) => { x.disabled = true; });
            M.SFX.click(); M.slow(true);
            await cutIn(s.mul >= 10 ? 3 : s.mul >= 5 ? 2 : 1);
            if (!st) { resolve(); return; }
            const ok = M.chance(s.p);
            M.slow(false);
            if (!ok) {
              M.SFX.lose(); M.shake();
              ovOpen('<div class="dbl-amt">0</div>' +
                '<div class="ch-note">…… <b>' + fmt(cur) + " XEVA</b> は消えました。<br>" +
                "でも、挑まなければ届かない景色もあります。</div>", "fail");
              M.round({ game: G, bet: 0, win: 0, replay: null });
              await M.sleep(1800);
              ovClose();
              if (st) st.choosing = false;
              msg("😢 DOUBLE CHANCE 失敗……次で取り返そう");
              resolve();
              return;
            }
            cur = Math.round(cur * s.mul); step++;
            M.SFX.bigwin(); M.shake(true); M.burst(160, 12);
            /* ×10 を通したら、そのままジャックポット抽選つき */
            if (s.mul >= 10) {
              const jp = await M.jackpotRoll(cur);
              if (jp > 0) { M.payout(jp, G, "プログレッシブ・ジャックポット"); paintBal(); await M.jackpotShow(jp); }
            }
            if (!st) { resolve(); return; }
            paint();
          };
        });
      };
      paint();
    });
  }

  /* ══════════════════════════════════════════
     オート
     ══════════════════════════════════════════ */
  function toggleAuto() {
    if (!st) return;
    if (st.auto) { stopAuto(); return; }
    st.auto = true; st.autoLeft = -1;
    const b = document.getElementById("mfAuto");
    b.classList.add("on"); b.innerHTML = "AUTO<br><i>ON</i>";
    M.SFX.click();
    if (!st.spinning) spin();
  }
  function stopAuto() {
    if (!st) return;
    st.auto = false; st.autoLeft = 0;
    /* ★ 予約済みの次回転も消す。フラグだけ折っても、
       すでに入っている setTimeout が1回ぶん走ってしまう。 */
    clearTimeout(st.timer); st.timer = 0;
    const b = document.getElementById("mfAuto");
    if (b) { b.classList.remove("on"); b.innerHTML = "AUTO<br><i>OFF</i>"; }
  }

  /* ══════════════════════════════════════════
     MENU（ボトムシート）
     ══════════════════════════════════════════ */
  function openMenu() {
    M.SFX.click();
    const ov = M.sheet({
      icon: "☰", title: "Magi Fortune", ok: "とじる",
      html:
        '<div class="sh-hd2">ベット額（1回転）</div>' +
        '<div class="mj-bets" id="mfBets"></div>' +
        '<div class="sh-hd2">見る</div>' +
        '<button class="sh-sw" data-m="pay"><span class="bd"><span class="t1">📋 配当表</span>' +
          '<span class="t2">図柄ごとの配当と、いまのライン数での金額</span></span><span class="rt">›</span></button>' +
        '<button class="sh-sw" data-m="how"><span class="bd"><span class="t1">📖 あそびかた</span>' +
          '<span class="t2">4つの選択と、期待値が動かない理由</span></span><span class="rt">›</span></button>' +
        '<button class="sh-sw" data-m="book"><span class="bd"><span class="t1">🎬 演出図鑑</span>' +
          '<span class="t2">見たことのある演出の期待度</span></span><span class="rt">›</span></button>' +
        '<button class="sh-sw" data-m="rtp"><span class="bd"><span class="t1">' + M.dayRtpInfo().ic +
          ' 本日の還元率</span><span class="t2">' + M.dayRtpInfo().nm + "・毎日 0:00 に変わります</span></span>" +
          '<span class="rt">' + M.dayRtpInfo().pct + "%</span></button>" +
        '<div class="sh-hd2">設定</div>' +
        '<button class="sh-sw' + (M.S.set.sound ? " on" : "") + '" data-m="sound"><span class="bd">' +
          '<span class="t1">🔊 効果音</span><span class="t2">スピンと配当の音</span></span>' +
          '<span class="rt">' + (M.S.set.sound ? "ON" : "OFF") + "</span></button>" +
        '<button class="sh-sw' + (M.S.set.fast ? " on" : "") + '" data-m="fast"><span class="bd">' +
          '<span class="t1">⚡ 演出を早くする</span><span class="t2">回転と抽選のアニメを短縮</span></span>' +
          '<span class="rt">' + (M.S.set.fast ? "ON" : "OFF") + "</span></button>",
    });
    if (!ov) return;
    paintChips(ov.querySelector("#mfBets"));
    ov.querySelectorAll("[data-m]").forEach((b) => {
      b.onclick = () => {
        const k = b.dataset.m;
        if (k === "sound") { M.S.set.sound = !M.S.set.sound; M.save(); M.SFX.click(); openMenu(); return; }
        if (k === "fast")  { M.S.set.fast  = !M.S.set.fast;  M.save(); M.SFX.click(); openMenu(); return; }
        if (k === "pay")  { showPay();  return; }
        if (k === "how")  { showTutorial(); return; }
        if (k === "book") { openBook(); return; }
        if (k === "rtp")  { M.SFX.click(); M.rtpSheet(); return; }
      };
    });
  }

  function showPay() {
    M.SFX.click();
    /* ★ 表示も払い出しと同じ X.ps()（本日ぶん込み）を使う。
       ここだけ設計値にすると「配当表と実際の入金が違う」になる。 */
    const lineBet = (st.bet / st.lines) * X.ps();
    const day = M.dayRtpInfo();
    const base = Math.round(X.BASE_TARGET * day.mul * 1000) / 10;   // 通常配当ぶん（本日）
    const gau = Math.round(X.GAUGE_RATE * day.mul * 1000) / 10;     // ゲージぶん（本日）
    const rows = Object.keys(X.SYM).filter((k) => k !== "SC").map((k) => {
      const s = X.SYM[k];
      const ic = s.img ? '<img src="' + s.img + '" alt="">' : '<span class="g">' + s.g + "</span>";
      return '<div class="sh-row"><span class="ic">' + ic + "</span>" +
        '<span class="nm">' + esc(s.nm) + "<small>3個 / 4個 / 5個</small></span>" +
        '<span class="pv">' + s.pay.map((p) => fmt(p * lineBet)).join("<br>") + "</span></div>";
    }).join("");
    M.sheet({
      icon: "📋", title: "配当表", ok: "とじる",
      html: rows +
        '<div class="sh-row"><span class="ic"><img src="' + X.SYM.SC.img + '" alt=""></span>' +
          '<span class="nm">SCATTER<small>位置は自由・3個以上で BONUS</small></span>' +
          '<span class="pv">' + fmt(2 * st.bet * X.ps()) + "<br>" + fmt(10 * st.bet * X.ps()) +
          "<br>" + fmt(50 * st.bet * X.ps()) + "</span></div>" +
        '<div class="mj-note" style="margin-top:10px">配当は<b>左のリールから連続</b>で成立します' +
        "（いま <b>" + st.lines + " ライン</b>・ベット " + fmt(st.bet) + "）。<br>" +
        "<b>" + day.ic + " " + M.rtpLine() + "</b><br>" +
        "今日の内訳は<b>通常配当 " + base + "%</b> ＋ <b>FORTUNE GAUGE " + gau + "%</b>" +
        "（ベットから預かって、使うときに返します）＝ <b>" + day.pct + "%</b>。<br>" +
        "さらにベットの <b>" + Math.round(M.JP_RATE * 100) + "%</b> がプログレッシブへ積まれます" +
        "（合計 <b>" + day.total + "%</b>）。<br>" +
        "上の配当は<b>今日の金額</b>です。還元率は毎日 0:00 に変わります（あと " + M.dayLeftText() + "）。</div>",
    });
  }

  function showTutorial() {
    M.SFX.click();
    M.sheet({
      icon: "🎰", title: "Magi Fortune のあそびかた", ok: "はじめる",
      html:
        '<div class="mj-note">' +
        "<b>運だけでは終わらない。一瞬の判断が運命を変える。</b><br><br>" +
        "① <b>SPIN</b>（長押しでオート）。左のリールから同じ絵柄が3つ以上つながれば配当です。<br>" +
        "② 下の <b>スタイル</b>：20 / 10 / 5 ライン。総ベットは変わらず、" +
        "<b>当たりの回数と一撃の大きさが入れ替わる</b>だけです。<br>" +
        "③ <b>FORTUNE GAUGE</b>：ベットのたびに少しずつ預かり、満タンで返します。" +
        "受け取りかたは<b>確定 / 倍率 / 全WILD爆発</b>の3つ。<br>" +
        "④ 🎰 が3個以上で <b>BONUS</b>。<b>回数か倍率か</b>を選び、" +
        "フリースピン中は <b>CHANCE ZONE</b> で倍率が伸びていきます。<br>" +
        "⑤ BONUS のあとは <b>DOUBLE CHANCE</b>。確定するか、×2 / ×5 / ×10 に挑むか。<br><br>" +
        "★ <b>ここが大事</b>：②③④⑤の選択は、<b>どれを選んでも期待値は同じ</b>です。" +
        "変わるのは荒さだけ。だから「正解の押し方」はなく、" +
        "そのときの自分の気分と残高で決めていい——それがこの台の遊びかたです。<br><br>" +
        "★ <b>還元率は毎日変わります</b>（" + M.dayRtpInfo().ic + " 本日 <b>" + M.dayRtpInfo().pct +
        "%</b>・" + esc(M.dayRtpInfo().nm) + "）。全ゲーム共通で、日付だけから決まります。" +
        "MENU の<b>「本日の還元率」</b>でいつでも確認できます。" +
        "</div>",
    });
  }
  function openBook() {
    M.SFX.click();
    M.sheet({
      icon: "🎬", title: "演出図鑑", ok: "とじる",
      html: '<div class="mj-note" style="margin-bottom:9px">見たことのある演出だけ、期待度が開きます。</div>' +
        FX_BOOK.map((f) => {
          const got = !!st.fxSeen[f.id];
          return '<div class="sh-row' + (got ? "" : " lock") + '"><span class="ic"><span class="g">' +
            (got ? f.ic : "❓") + "</span></span>" +
            '<span class="nm">' + (got ? esc(f.nm) : "？？？") +
            "<small>" + (got ? esc(f.ds) : "まだ見ていません") + "</small></span>" +
            '<span class="pv">' + (got ? esc(f.rate) : "—") + "</span></div>";
        }).join(""),
    });
  }

  function unmount() {
    window.removeEventListener("mj:wallet", paintBal);
    window.removeEventListener("mj:jackpot", paintJp);
    if (ro) { try { ro.disconnect(); } catch (e) {} ro = null; }
    if (st && st.jpTimer) clearInterval(st.jpTimer);
    if (st) { clearTimeout(st.timer); M.S.slotPool = st.pool; M.S.slotCharge = st.charge; M.S.slotFx = st.fxSeen; M.save(); }
    M.slow(false);
    st = null;
  }

  window.MJSlot = { mount, unmount, id: G, nm: "Magi Fortune" };
})();
