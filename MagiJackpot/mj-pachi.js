/* ============================================================
   MagiJackpot — パチンコ「Jackpot Rush」（v2 フルリワーク）
   ------------------------------------------------------------
   コンセプト：「運だけでは終わらない。一瞬の判断が運命を変える。」

   ★ 王道の流れは崩さない
     通常 → リーチ → スーパーリーチ → ストーリーリーチ → FINAL BATTLE
       → 大当たり → RUSH（連チャン）→ ときどき SUPER JACKPOT
     ここは「知っている形」だからこそ気持ちいい。触るのは中身のほう。

   ★ プレイヤーが介入できる場所は3つ
     ① 台えらび（ライト / ノーマル / ヘビー）… 当たりの間隔 ⇄ 一撃の大きさ
     ② BOOST ゲージ                          … 溜めた力を3つの形のどれで使うか
     ③ RUSH ルート（攻める / 安定 / 逆転）   … 連チャンの荒さを自分で決める

   ★ そして本作の背骨：<b>どの選択も期待値を1ミリも動かさない</b>
     ・台えらび … 当たりやすさを k 倍にしたら出玉を 1/k 倍にする
                  （RTP = 確率 × 出玉 なので積は不変）
     ・RUSHルート… 継続率を上げると RUSH のあいだに回す回数も増えるので、
                  「1回転あたりの還元率」が3ルートで完全に一致するよう式で解いている
                  （MJPachiMath.routeEV() の ev が全部そろっていればOK。
                    rushPay はルートごとに違ってよい＝続くほど1回は軽い）
     ・BOOST    … ベットから預かったぶんを、形を変えて返すだけ

   ★ 物理は「演出」、抽選は「デジタル」——ここを混ぜない
     玉が入るかどうかで当たりが決まる作りにすると、
     釘の当たり判定のわずかなブレがそのまま還元率のブレになる。
     この台は <b>1発射 ＝ 1ベット ＝ 1回のデジタル抽選</b>で、玉は必ずヘソに入る。

   ★ 還元率の内訳（合計 98%。残り 2% はジャックポットへ）
       デジタルの出玉 … 90%（BASE_TARGET）
       BOOST ゲージ   …  8%（BOOST_RATE）
     ★ この 98% には<b>本日の倍率（MJ.dayMul）</b>が掛かる＝毎日すこし動く。
       出玉とゲージの両方に同じだけ掛かるので、内訳の比は変わらない。
   ============================================================ */

/* ══════════════════════════════════════════════════════════
   計算部
   ══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const R = () => (window.MJ ? window.MJ.rng() : Math.random());

  const BASE_TARGET = 0.90;   // デジタルの出玉だけで見た還元率
  const BOOST_RATE  = 0.08;   // ベットのうち BOOST ゲージへ預かる割合
  const BOOST_SPINS = 120;    // BOOST が満タンになるまでの回転数
  /* 本日の還元率ぶん（全ゲーム共通。MJ.dayMul を通す） */
  const DAY = () => (window.MJ && window.MJ.dayMul ? window.MJ.dayMul() : 1);

  /* 基準となる台（ノーマル）。出玉はすべて「ベットの何倍か」 */
  const BASE = {
    pNormal: 1 / 99,      // 通常時の大当たり確率
    pRush:   1 / 8,       // RUSH中の大当たり確率
    toRush:  0.55,        // 大当たりのうち RUSH に入る割合
    payNormal: 18,        // 通常当たり
    payEnter:  37,        // RUSH 突入時
    payCont:   30,        // RUSH 継続
    paySuper: 110,        // SUPER（継続＋大量出玉）
    payEnd:    18,        // RUSH 終了時
    /* 基準ルート（＝「安定」）の内訳 */
    contA: 0.60, contS: 0.15, end: 0.25,
  };

  /* ══════════════════════════════════════════
     台えらび（当たりやすさ ⇄ 出玉。期待値は不変）
     ══════════════════════════════════════════ */
  const MACHINES = [
    { id: "light",  nm: "ライト",   ic: "🌤", pMul: 99 / 60,  ds: "1/60。当たりやすいが1回は小さめ。長く回したい人向け" },
    { id: "normal", nm: "ノーマル", ic: "⚙️", pMul: 1,        ds: "1/99。バランス型。まずはここから" },
    { id: "heavy",  nm: "ヘビー",   ic: "🌋", pMul: 99 / 199, ds: "1/199。なかなか当たらないが、当たれば一撃が大きい" },
  ];

  /* ══════════════════════════════════════════
     RUSH ルート（★ 期待値がぴったりそろうよう式で解いてある）
     ------------------------------------------
     そろえるのは「1回転あたりの還元率」。
     継続率を上げると連チャン回数が伸びるが、そのぶん RUSH のあいだに回す
     回数（＝賭ける回数）も同じだけ伸びる。だから出玉だけを合わせると
     「よく続くルートほど1回転あたりが薄い」ことになってしまう。
     routeSpec() は回転数まで込みで解き直している。
     ・攻める … 継続率 65%・1回が重い（×35）・SUPER が出やすい
     ・安定   … 基準（継続率 75%・×27.6）
     ・逆転   … 継続率 85%・1回は軽い（×19.5）が止まらない
     ══════════════════════════════════════════ */
  const ROUTES = [
    { id: "attack", nm: "攻める", en: "HIGH RISK / HIGH RETURN", ic: "🔥", c: "#ff4d4d",
      end: 0.35, superShare: 0.30, ds: "継続率は低いが、1回の出玉が重い。SUPER も出やすい" },
    { id: "steady", nm: "安定",   en: "LOW RISK / LOW RETURN",   ic: "🛡", c: "#ffd257",
      end: 0.25, superShare: 0.20, ds: "基準のバランス。まずはここから" },
    { id: "revers", nm: "逆転",   en: "MID RISK / HIGH RETURN",  ic: "🌀", c: "#8e6bff",
      end: 0.15, superShare: 0.12, ds: "1回は軽いが、とにかく止まらない。数で殴る" },
  ];

  /* 基準ルート（安定）の「継続1回あたりの平均出玉」 */
  function baseContMix() {
    const a = BASE.contA, s = BASE.contS;
    return (a * BASE.payCont + s * BASE.paySuper) / (a + s);
  }
  /* 1周期に使う回転数。h = RUSH中の当たり回数（＝1/end）。
     ★ 台の倍率 k は 1/pNormal も h/pRush も同じ 1/k で効くので、
       spins は k に比例するだけ。出玉が k 倍になるのと打ち消し合って、
       台えらびは還元率をまったく動かさない。 */
  function cycleSpins(h) {
    return 1 / BASE.pNormal + BASE.toRush * h / BASE.pRush;
  }
  /* 基準ルート（安定）の「1回転あたりの還元率」。ここに全ルートをそろえる。 */
  function baseRTP() {
    const h0 = 1 / BASE.end;
    const rushPay0 = (h0 - 1) * baseContMix() + BASE.payEnd;
    const pay0 = (1 - BASE.toRush) * BASE.payNormal + BASE.toRush * (BASE.payEnter + rushPay0);
    return pay0 / cycleSpins(h0);
  }

  /* ルートの内訳を解く。
     ★ そろえるのは「RUSH 1回の出玉」ではなく <b>1回転あたりの還元率</b>。
       継続率を上げると RUSH のあいだに回す回数も増えるので、
       出玉だけを合わせると「よく続くルートほど1回転あたりが薄い」ことになり、
       選択がリスクではなく損得になってしまう。
       ここでは
         必要な RUSH 出玉 = (基準RTP × そのルートの周期回転数 − 通常当たりぶん) / 突入率 − 突入時出玉
       を解いて、そこから継続1回あたりの出玉を逆算する。 */
  function routeSpec(routeId) {
    const r = ROUTES.find((x) => x.id === routeId) || ROUTES[1];
    const h = 1 / r.end;                                   // RUSH中の当たり回数
    const need = baseRTP() * cycleSpins(h);                // 1周期で出すべき総量
    const rushPay = (need - (1 - BASE.toRush) * BASE.payNormal) / BASE.toRush - BASE.payEnter;
    const contMix = (rushPay - BASE.payEnd) / (h - 1);     // 継続1回あたりの平均出玉
    /* contMix を「継続」と「SUPER」に割り振る。SUPER の取り分は superShare。
       paySuper = payCont × SUPER_RATIO とおいて payCont を解く。 */
    const contProb = (1 - r.end) * (1 - r.superShare);
    const superProb = (1 - r.end) * r.superShare;
    const SUPER_RATIO = BASE.paySuper / BASE.payCont;      // ≒ 3.67
    const w = (contProb + superProb * SUPER_RATIO) / (contProb + superProb);
    const payCont = contMix / w;
    return { r, end: r.end, contA: contProb, contS: superProb,
             payCont: payCont, paySuper: payCont * SUPER_RATIO };
  }
  /* 3ルートの検算。ev（1回転あたりの還元率）がそろっていれば設計どおり。
     rushPay（RUSH1回ぶんの出玉）はルートごとに違ってよい——
     続くルートほど「1回は軽いが回数が多い」になるのが狙いだから。 */
  function routeEV() {
    return ROUTES.map((r) => {
      const s = routeSpec(r.id);
      const hits = 1 / s.end - 1;
      const mix = (s.contA * s.payCont + s.contS * s.paySuper) / (s.contA + s.contS);
      return { id: r.id, rushPay: hits * mix + BASE.payEnd,
               ev: theoryRTP("normal", r.id), cont: Math.round((1 - s.end) * 100) + "%" };
    });
  }

  /* 台 × ルート のスペック。payMul で出玉を、pMul で当たりやすさを逆向きに動かす。 */
  function spec(machineId, routeId) {
    const m = MACHINES.find((x) => x.id === machineId) || MACHINES[1];
    const rs = routeSpec(routeId);
    const payMul = 1 / m.pMul;
    /* ★ BASE_TARGET へ合わせる係数。素の設計は約 98% 相当なので 0.90/0.98 を掛ける。
       さらに<b>本日の還元率ぶん（MJ.dayMul）</b>を掛ける。出玉の計算も
       スペック表の表示もこの spec() を通るので、両方が必ずそろう。 */
    const K = BASE_TARGET / 0.98 * DAY();
    return {
      m, route: rs.r,
      pNormal: BASE.pNormal * m.pMul,
      /* ★ RUSH中の確率も同じ倍率で動かすこと。
         固定にすると「通常は当たりにくいが RUSH は同じ」＝ヘビー台だけ得、という歪みが出る。 */
      pRush:   BASE.pRush * m.pMul,
      toRush:  BASE.toRush,
      contA: rs.contA, contS: rs.contS, end: rs.end,
      payNormal: BASE.payNormal * payMul * K,
      payEnter:  BASE.payEnter  * payMul * K,
      payCont:   rs.payCont     * payMul * K,
      paySuper:  rs.paySuper    * payMul * K,
      payEnd:    BASE.payEnd    * payMul * K,
      oneIn: Math.round(1 / (BASE.pNormal * m.pMul)),
    };
  }

  /* 1周期を式で解いた還元率（デジタルぶんのみ）。mc() を回さなくても正しい値が出る。 */
  function theoryRTP(machineId, routeId) {
    const s = spec(machineId, routeId);
    const rushHits = 1 / s.end;                                    // RUSH中の当たり回数
    const contHits = rushHits - 1;
    const contMix = (s.contA * s.payCont + s.contS * s.paySuper) / (s.contA + s.contS);
    const rushPay = contHits * contMix + s.payEnd;
    const rushSpins = rushHits / s.pRush;
    const spins = 1 / s.pNormal + s.toRush * rushSpins;
    const pay = (1 - s.toRush) * s.payNormal + s.toRush * (s.payEnter + rushPay);
    return pay / spins;
  }

  /* 実際に回して確かめる */
  function mc(n, machineId, routeId) {
    n = n || 400000;
    const s = spec(machineId, routeId);
    let spins = 0, pay = 0, rush = false, guard = 0;
    while (spins < n && guard++ < n * 10) {
      spins++;
      const p = rush ? s.pRush : s.pNormal;
      if (R() >= p) continue;
      if (!rush) {
        if (R() < s.toRush) { pay += s.payEnter; rush = true; }
        else pay += s.payNormal;
      } else {
        const r = R();
        if (r < s.contA) pay += s.payCont;
        else if (r < s.contA + s.contS) pay += s.paySuper;
        else { pay += s.payEnd; rush = false; }
      }
    }
    return { n: spins, rtp: pay / spins, withBoost: pay / spins + BOOST_RATE };
  }

  /* ══════════════════════════════════════════
     1回転ぶんの抽選。UI はこの結果を「どう見せるか」だけを考える。
     ・heat  0:通常 1:リーチ 2:スーパー 3:ストーリー 4:FINAL BATTLE
     ・story はストーリーリーチの種類（演出の分岐）
     ══════════════════════════════════════════ */
  const STORIES = [
    { id: "moon",  nm: "月下の誓い",   ic: "🌙", face: "../img/t_Selene.webp",  hot: 0.42 },
    { id: "blade", nm: "紅蓮の刃",     ic: "⚔️", face: "../img/t_Chloe.webp",   hot: 0.55 },
    { id: "abyss", nm: "深淵の底から", ic: "🕳", face: "../img/t_Abyss.webp",   hot: 0.68 },
    { id: "star",  nm: "星読みの塔",   ic: "🌌", face: "../img/t_Fiona.webp",   hot: 0.36 },
  ];
  /* FINAL BATTLE のボス。強いほど期待度が高い＝勝てば大きい
     ★ この3人（sym_boss1〜3）は<b>FINAL BATTLE 専用の絵</b>。
       スロットの図柄には回さない——ここでしか出ないから「出た！」になる。 */
  const BOSSES = [
    { id: "inf",  nm: "獄炎の魔女", face: "img/sym_boss3.webp", hot: 0.72 },
    { id: "volt", nm: "紫電の魔女", face: "img/sym_boss2.webp", hot: 0.62 },
    { id: "crim", nm: "深紅の魔女", face: "img/sym_boss1.webp", hot: 0.55 },
  ];

  function spinOnce(machineId, routeId, inRush) {
    const s = spec(machineId, routeId);
    const p = inRush ? s.pRush : s.pNormal;
    const hit = R() < p;
    /* 演出の段階。当たりのときほど上の段に行きやすいが、
       はずれでも上まで行く（＝最後まで分からない）ようにしてある。 */
    let heat;
    if (hit) {
      const r = R();
      heat = r < 0.42 ? 4 : r < 0.70 ? 3 : r < 0.90 ? 2 : 1;
    } else {
      const r = R();
      heat = r < 0.012 ? 4 : r < 0.045 ? 3 : r < 0.115 ? 2 : r < 0.30 ? 1 : 0;
    }
    const story = heat >= 3 ? STORIES[Math.floor(R() * STORIES.length)] : null;
    const boss  = heat >= 4 ? BOSSES[Math.floor(R() * BOSSES.length)] : null;

    if (!hit) return { hit: false, heat, story, boss, pay: 0, rush: inRush, kind: "miss" };
    if (!inRush) {
      if (R() < s.toRush) return { hit: true, heat: Math.max(heat, 3), story, boss, pay: s.payEnter, rush: true, kind: "enter" };
      return { hit: true, heat: Math.max(heat, 2), story, boss, pay: s.payNormal, rush: false, kind: "normal" };
    }
    const r = R();
    if (r < s.contA) return { hit: true, heat: Math.max(heat, 2), story, boss, pay: s.payCont, rush: true, kind: "cont" };
    if (r < s.contA + s.contS) return { hit: true, heat: 4, story, boss: boss || BOSSES[0], pay: s.paySuper, rush: true, kind: "super" };
    return { hit: true, heat: Math.max(heat, 2), story, boss, pay: s.payEnd, rush: false, kind: "end" };
  }

  window.MJPachiMath = {
    BASE, BASE_TARGET, BOOST_RATE, BOOST_SPINS, MACHINES, ROUTES, STORIES, BOSSES,
    spec, routeSpec, routeEV, theoryRTP, mc, spinOnce,
  };
})();


/* ══════════════════════════════════════════════════════════
   表示部（v3 レイアウト刷新＋左右打ち）
   ------------------------------------------------------------
   ★ 1画面で完結
     盤面が縦に伸び、台えらび・ルート・演出の濃さ・スペックは MENU のシートへ。
     RUSH の情報は盤面に重ねる帯にして、パネルで縦を食わないようにした。

   ★ 左打ち／右打ち
     実機と同じで「通常は左、RUSH に入ったら右」。
     盤面の左右どちらをタップしても、その側から打ち出せる。
     ★ ただし <b>結果は打ち出す向きに影響されない</b>。
       玉が入るかどうかで当たりを決めると、釘の当たり判定のブレが
       そのまま還元率のブレになる。この台は
       「1発射 ＝ 1ベット ＝ 1回のデジタル抽選」で、玉は必ず入賞口へ吸い込まれる。
       向きは<b>演出と手触りのため</b>にある。
   ══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const M = window.MJ, X = window.MJPachiMath;
  const fmt = M.fmt, esc = M.esc;
  const G = "pachi";
  let st = null, cv = null, ctx = null, raf = 0, balls = [], pegs = [], ro = null;

  /* BOOST の使いかた（★ 3つとも期待値は預かり額とぴったり同じ） */
  function boostRoutes(pool) {
    return [
      { id: "secure", ic: "🛡", nm: "確定", en: "SECURE",
        ds: "溜まったぶんを、そのまま確実に受け取る", tag: "100%", p: 1, mul: 1 },
      { id: "double", ic: "⚡", nm: "倍賭け", en: "SURGE",
        ds: "2回に1回で2倍。外せば0", tag: "50% → ×2", p: 0.5, mul: 2 },
      { id: "allin",  ic: "🔥", nm: "一撃", en: "OVERDRIVE",
        ds: "10回に1回で10倍。決まればそのままジャックポット抽選つき", tag: "10% → ×10", p: 0.1, mul: 10 },
    ].map((r) => Object.assign({}, r, { val: Math.round(pool * r.mul) }));
  }

  /* 演出図鑑 */
  const FX_BOOK = [
    { id: "reach",   ic: "🎯", nm: "リーチ",           ds: "左右の数字がそろって止まる",             rate: "ここから全部が始まる" },
    { id: "super",   ic: "🔥", nm: "スーパーリーチ",   ds: "背景が変わり、盤面に寄る",               rate: "期待度 中" },
    { id: "story",   ic: "📖", nm: "ストーリーリーチ", ds: "4種類の物語。タイトルで期待度が変わる", rate: "期待度 高（種類による）" },
    { id: "final",   ic: "⚔️", nm: "FINAL BATTLE",     ds: "ボスとの一騎打ち。ここまで来れば大勝負", rate: "期待度 最高" },
    { id: "boostfx", ic: "⚡", nm: "BOOST 発動",       ds: "ゲージを使った瞬間の閃光",               rate: "結果には影響しません" },
    { id: "rush",    ic: "🌀", nm: "RUSH BREAK",       ds: "盤面が割れて RUSH に突入",               rate: "大当たりの 55%" },
    { id: "sjp",     ic: "👑", nm: "SUPER JACKPOT",    ds: "画面全体が黄金に染まる",                 rate: "RUSH 中のごく一部" },
    { id: "migi",    ic: "▶", nm: "右打ちランプ",      ds: "RUSH 中に「右打ち！」が点滅する",        rate: "向きは結果に影響しません" },
  ];

  /* ══════════════════════════════════════════
     組み立て
     ══════════════════════════════════════════ */
  function mount(root) {
    st = {
      bet: 500, machine: "normal", route: "steady",
      rush: false, rushHits: 0, rushWon: 0, spinning: false, auto: false,
      drama: "std", side: "l",
      boost: M.S.pachiBoost || 0, pool: M.S.pachiPool || 0, pending: null,
      fxSeen: M.S.pachiFx || {},
      lastHeat: 0,
    };
    root.innerHTML =
      '<div class="mjs g-jr">' +
        '<div class="mjs-top">' +
          '<button class="x" id="jrBack" aria-label="ロビーへ戻る">‹</button>' +
          '<div class="ttl"><b>Magi</b><i>JACKPOT</i><u>RUSH</u></div>' +
          '<div class="bal"><img src="../XEVA.png" alt=""><span id="jrBal">0</span></div>' +
        "</div>" +

        '<div class="mjs-main">' +
          '<div class="mjs-bar">' +
            '<div class="mjs-jp"><div class="k">JACKPOT' +
              '<span class="live" id="jrJpLive">SHARED</span></div>' +
              '<div class="v" id="jrJp">0</div></div>' +
            '<div class="mjs-meter" id="jrBoostBox"><span class="k">BOOST</span>' +
              '<span class="v" id="jrBoostV">0%</span>' +
              '<span class="bar"><i id="jrBoostBar"></i></span></div>' +
            '<div class="mjs-meter" id="jrChanceBox"><span class="k">CHANCE</span>' +
              '<span class="v" id="jrChance">—</span></div>' +
          "</div>" +

          /* ── 盤面 ── */
          '<div class="jr-board" id="jrBoard">' +
            '<canvas id="jrCv"></canvas>' +
            '<div class="jr-side l" id="jrSideL"><em>LEFT</em></div>' +
            '<div class="jr-side r" id="jrSideR"><em>RIGHT</em></div>' +
            '<div class="jr-hint" id="jrHint">▶ 右打ち！</div>' +
            '<div class="jr-digits" id="jrDigits"></div>' +
            '<div class="jr-lamp" id="jrLamp"></div>' +
            '<div class="jr-rush" id="jrRush"></div>' +
            '<div class="jr-msg" id="jrMsg">' + M.rtpLine() + " — 左右どちらかをタップ、または PUSH で打ち出そう</div>" +
            '<div class="jr-stage" id="jrStage"></div>' +
            '<div class="mjs-burst" id="jrBurst"><div class="t" id="jrBurstT"></div>' +
              '<div class="s" id="jrBurstS"></div></div>' +
          "</div>" +

          '<div class="mjs-ov" id="jrOv"></div>' +
        "</div>" +

        '<div class="mjs-act">' +
          '<div class="r">' +
            '<div class="mjs-seg hot" id="jrSideSeg"></div>' +
            '<div class="mjs-bet"><span class="k">BET</span><span class="v" id="jrBetV">500</span>' +
              '<button id="jrBetD" aria-label="ベットを下げる">−</button>' +
              '<button id="jrBetU" aria-label="ベットを上げる">＋</button></div>' +
          "</div>" +
          '<div class="r">' +
            '<button class="mjs-ic" id="jrMenu">☰<br><i>MENU</i></button>' +
            '<button class="mjs-go" id="jrFire"><b>PUSH</b><small id="jrFireS">500</small></button>' +
            '<button class="mjs-ic wide" id="jrAuto">AUTO<br><i>OFF</i></button>' +
          "</div>" +
        "</div>" +
      "</div>";

    cv = document.getElementById("jrCv");
    ctx = cv.getContext("2d");
    paintSideSeg(); paintBetV(); paintBal();
    paintDigits([7, 3, 1]); paintLamp(0); paintBoost(); paintHud(); paintJp();
    document.getElementById("jrBack").onclick = () => { M.SFX.click(); window.mjGo("home"); };
    document.getElementById("jrFire").onclick = () => { if (!st.spinning) fire(); };
    document.getElementById("jrAuto").onclick = toggleAuto;
    document.getElementById("jrMenu").onclick = openMenu;
    document.getElementById("jrBetU").onclick = () => stepBet(1);
    document.getElementById("jrBetD").onclick = () => stepBet(-1);
    /* ★ 盤面の左半分／右半分をタップ＝その側から打ち出す。
       ハンドルを左右に握りかえる感覚をそのまま指に置きかえたかった。 */
    document.getElementById("jrBoard").onclick = (e) => {
      if (!st || st.spinning || st.choosing) return;
      const r = cv.getBoundingClientRect();
      setSide(e.clientX - r.left < r.width / 2 ? "l" : "r", true);
      fire();
    };

    if (!M.tutorialSeen(G)) { showTutorial(); M.tutorialMark(G); }
    window.addEventListener("mj:wallet", paintBal);
    window.addEventListener("mj:jackpot", paintJp);
    st.jpTimer = setInterval(paintJp, 2000);
    requestAnimationFrame(() => { fitCanvas(); startLoop(); });
    const bd = document.getElementById("jrBoard");
    if (window.ResizeObserver && bd) { ro = new ResizeObserver(fitCanvas); ro.observe(bd); }
    else addEventListener("resize", fitCanvas);
  }

  /* ══════════════════════════════════════════
     盤面（演出用の物理。結果には関わらない）
     ══════════════════════════════════════════ */
  function fitCanvas() {
    if (!cv || !ctx) return;
    const w = cv.clientWidth || 340, h = cv.clientHeight || 210;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.max(1, Math.round(w * dpr));
    cv.height = Math.max(1, Math.round(h * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildPegs();
  }
  function W() { return cv ? cv.clientWidth || 340 : 340; }
  function H() { return cv ? cv.clientHeight || 210 : 210; }

  /* 釘。左右に「打ち出しの道」を残し、中央のヘソと右の電チューへ落ちるようにする。 */
  function buildPegs() {
    pegs = [];
    const w = W(), h = H(), rows = 9, cols = 9;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const off = (r % 2) * (w / cols / 2);
        const x = (c + 0.5) * (w / cols) + off;
        /* ★ 釘は入賞口の少し上まで敷く。ここを浅くすると盤面の下半分が
           まっさらな空き地になり、玉が「落ちるだけ」に見えてしまう。 */
        const y = h * 0.18 + r * (h * 0.68 / rows);
        if (x > w - 26 || x < 26) continue;                                  // 左右のレールは空けておく
        if (r >= rows - 3 && Math.abs(x - w / 2) < w * 0.09) continue;        // ヘソへの導線
        if (r >= rows - 4 && Math.abs(x - w * 0.82) < w * 0.07) continue;     // 電チューへの導線
        pegs.push({ x, y, r: 3.2 });
      }
    }
  }
  function startLoop() {
    const step = () => { raf = requestAnimationFrame(step); draw(); };
    if (!raf) raf = requestAnimationFrame(step);
  }
  function stopLoop() { if (raf) cancelAnimationFrame(raf); raf = 0; }

  /* いま玉が向かう入賞口。左打ち＝中央のヘソ、右打ち＝右の電チュー。 */
  function pocket() {
    const w = W(), h = H();
    return st && st.side === "r"
      ? { x: w * 0.82, y: h - 38, wide: 17, nm: "電チュー" }
      : { x: w / 2,    y: h - 38, wide: 22, nm: "ヘソ" };
  }

  function draw() {
    if (!ctx || !st) return;
    const w = W(), h = H();
    ctx.clearRect(0, 0, w, h);
    const hot = st.rush || st.lastHeat >= 3;

    /* 打ち出しレール（いま使っている側を光らせる） */
    ctx.fillStyle = st.side === "l" ? "rgba(255,210,87,.16)" : "rgba(255,255,255,.04)";
    ctx.fillRect(0, 0, 22, h);
    ctx.fillStyle = st.side === "r" ? "rgba(255,210,87,.16)" : "rgba(255,255,255,.04)";
    ctx.fillRect(w - 22, 0, 22, h);

    /* 入賞口（2つ描いて、使っている側を強く） */
    const drawHole = (px, py, wide, on) => {
      ctx.fillStyle = on ? (hot ? "#ff4d4d" : "#ffd257") : "rgba(255,255,255,.22)";
      ctx.beginPath(); ctx.ellipse(px, py, wide, wide * 0.45, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,.6)";
      ctx.beginPath(); ctx.ellipse(px, py, wide * 0.68, wide * 0.27, 0, 0, 6.283); ctx.fill();
    };
    drawHole(w / 2, h - 38, 22, st.side === "l");
    drawHole(w * 0.82, h - 38, 17, st.side === "r");

    /* 釘 */
    pegs.forEach((p) => {
      ctx.fillStyle = "#e6d8a8";
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.55)";
      ctx.beginPath(); ctx.arc(p.x - 1, p.y - 1, p.r * 0.45, 0, 6.283); ctx.fill();
    });

    /* 玉 */
    for (let i = balls.length - 1; i >= 0; i--) {
      const b = balls[i];
      b.vy += 0.34; b.x += b.vx; b.y += b.vy;
      pegs.forEach((p) => {
        const dx = b.x - p.x, dy = b.y - p.y, d = Math.hypot(dx, dy);
        if (d < p.r + 5 && d > 0.01) {
          const nx = dx / d, ny = dy / d;
          b.x = p.x + nx * (p.r + 5); b.y = p.y + ny * (p.r + 5);
          const dot = b.vx * nx + b.vy * ny;
          b.vx = (b.vx - 2 * dot * nx) * 0.62; b.vy = (b.vy - 2 * dot * ny) * 0.62;
          b.vx += (M.rng() - 0.5) * 0.7;
        }
      });
      if (b.x < 6) { b.x = 6; b.vx = Math.abs(b.vx) * 0.6; }
      if (b.x > w - 6) { b.x = w - 6; b.vx = -Math.abs(b.vx) * 0.6; }
      /* 結果はもう決まっているので、見た目としてかならず入賞口へ吸い込む */
      if (b.y > h * 0.80) b.vx += (b.px - b.x) * 0.022;
      if (b.y > b.py - 6) { balls.splice(i, 1); continue; }
      const gr = ctx.createRadialGradient(b.x - 2, b.y - 2, 1, b.x, b.y, 6);
      gr.addColorStop(0, "#ffffff"); gr.addColorStop(1, "#9aa6c8");
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, 6.283); ctx.fill();
    }
  }
  /* 玉を打ち出す。side を渡さなければ、いま選んでいる側から。 */
  function shootBall(side) {
    const s = side || st.side, p = pocket();
    const sp = 2.4 + M.rng() * 1.7;
    balls.push(s === "r"
      ? { x: W() - 12, y: H() * 0.08, vx: -sp,  vy: 0.4, px: p.x, py: p.y }
      : { x: 12,       y: H() * 0.08, vx:  sp,  vy: 0.4, px: p.x, py: p.y });
    if (balls.length > 14) balls.shift();
  }

  /* ══════════════════════════════════════════
     UI 描画
     ══════════════════════════════════════════ */
  function paintBal() { const b = document.getElementById("jrBal"); if (b) b.textContent = fmt(M.xeva()); }
  function paintJp() {
    const v = document.getElementById("jrJp"); if (!v) return;
    v.textContent = fmt(M.jackpot());
    const l = document.getElementById("jrJpLive");
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
  function paintBetV() {
    const v = document.getElementById("jrBetV"); if (v) v.textContent = fmt(st.bet);
    const f = document.getElementById("jrFireS"); if (f) f.textContent = fmt(st.bet);
    const chips = document.getElementById("jrBets"); if (chips) paintChips(chips);
  }
  function paintChips(box) {
    box.innerHTML = M.BETS.map((v, i) =>
      '<button class="mj-chip c' + (i + 1) + (v === st.bet ? " on" : "") + '" data-b="' + v + '"' +
      (M.xeva() < v ? " disabled" : "") + ">" + (v >= 1000 ? (v / 1000) + "K" : v) + "</button>").join("");
    box.querySelectorAll("[data-b]").forEach((b) => {
      b.onclick = () => { st.bet = +b.dataset.b; M.SFX.chip(); paintBetV(); };
    });
  }
  function stepBet(d) {
    const i = M.BETS.indexOf(st.bet);
    const n = Math.max(0, Math.min(M.BETS.length - 1, (i < 0 ? 1 : i) + d));
    st.bet = M.BETS[n]; M.SFX.chip(); paintBetV();
  }
  function paintSideSeg() {
    const box = document.getElementById("jrSideSeg"); if (!box) return;
    box.innerHTML =
      '<button class="' + (st.side === "l" ? "on" : "") + '" data-s="l">◀ 左打ち<small>通常</small></button>' +
      '<button class="' + (st.side === "r" ? "on" : "") + '" data-s="r">右打ち ▶<small>RUSH</small></button>';
    box.querySelectorAll("[data-s]").forEach((b) => {
      b.onclick = () => setSide(b.dataset.s, true);
    });
    const l = document.getElementById("jrSideL"), r = document.getElementById("jrSideR");
    if (l) l.className = "jr-side l" + (st.side === "l" ? " on" : "");
    if (r) r.className = "jr-side r" + (st.side === "r" ? " on" : "");
    paintHint();
  }
  function setSide(s, quiet) {
    if (!st || st.side === s) { if (!quiet) M.SFX.click(); return; }
    st.side = s;
    M.SFX.click();
    paintSideSeg();
    if (!quiet) pmsg(s === "r" ? "▶ <b>右打ち</b>にしました" : "◀ <b>左打ち</b>にしました");
  }
  /* 「いまはこっちを打つ台」を教える。守らなくても出玉は変わらない。 */
  function paintHint() {
    const h = document.getElementById("jrHint"); if (!h) return;
    const want = st.rush ? "r" : "l";
    const need = st.side !== want;
    h.className = "jr-hint" + (need ? " on" : "") + (want === "l" ? " left" : "");
    h.innerHTML = want === "r" ? "▶ 右打ち！" : "◀ 左打ち！";
    if (st.rush) seeFx("migi");
  }
  function paintBoost() {
    const bar = document.getElementById("jrBoostBar"), v = document.getElementById("jrBoostV");
    if (!bar || !v) return;
    const pct = Math.min(100, Math.round(st.boost / X.BOOST_SPINS * 100));
    bar.style.width = pct + "%"; v.textContent = pct + "%";
    const box = document.getElementById("jrBoostBox");
    if (box) box.classList.toggle("full", pct >= 100);
  }
  function paintHud() {
    const bd = document.getElementById("jrBoard");
    if (bd) bd.classList.toggle("rush", st.rush);
    const el = document.getElementById("jrRush");
    if (el) {
      if (!st.rush) { el.className = "jr-rush"; el.innerHTML = ""; }
      else {
        const s = X.spec(st.machine, st.route);
        el.className = "jr-rush on";
        el.innerHTML = '<span class="t1">🔥 RUSH</span>' +
          '<span class="t2">' + esc(s.route.nm) + "・継続 " + Math.round((1 - s.end) * 100) + "%・1/" + Math.round(1 / s.pRush) + "</span>" +
          '<span class="t3">' + st.rushHits + "連 " + fmt(st.rushWon) + "</span>";
      }
    }
    paintHint();
  }
  function paintChance(heat) {
    const v = document.getElementById("jrChance"); if (!v) return;
    const pc = [0, 12, 30, 55, 80][Math.max(0, Math.min(4, heat))];
    v.textContent = heat ? pc + "%" : "—";
    const box = document.getElementById("jrChanceBox");
    if (box) box.className = "mjs-meter" + (heat >= 3 ? " hot" : heat >= 2 ? " full" : "");
  }
  function paintDigits(d, spinning, hot, locked) {
    const box = document.getElementById("jrDigits"); if (!box) return;
    box.innerHTML = d.map((n, i) =>
      '<div class="jr-d' + (spinning && spinning[i] ? " spin" : "") + (hot ? " hot" : "") +
      (locked && locked[i] ? " locked" : "") + '"><span class="n">' + n + "</span></div>").join("");
  }
  function paintLamp(level) {
    const box = document.getElementById("jrLamp"); if (!box) return;
    box.innerHTML = Array.from({ length: 5 }, (_, i) =>
      '<i class="' + (i < level ? (level >= 4 ? "red" : "on") : "") + '"></i>').join("");
  }
  function pmsg(t, cls) {
    const el = document.getElementById("jrMsg"); if (!el) return;
    el.innerHTML = t; el.className = "jr-msg" + (cls ? " " + cls : "");
  }
  function stage(html, cls) {
    const el = document.getElementById("jrStage"); if (!el) return;
    el.innerHTML = html || "";
    el.className = "jr-stage" + (cls ? " " + cls : "") + (html ? " on" : "");
  }
  function seeFx(id) { if (st) { st.fxSeen[id] = 1; M.S.pachiFx = st.fxSeen; } }

  /* 中央のオーバーレイ */
  function ovOpen(html, cls) {
    const el = document.getElementById("jrOv"); if (!el) return null;
    el.innerHTML = '<div class="mjs-card' + (cls ? " " + cls : "") + '">' + html + "</div>";
    el.classList.add("on");
    return el;
  }
  function ovClose() {
    const el = document.getElementById("jrOv"); if (!el) return;
    el.classList.remove("on"); el.innerHTML = "";
  }

  /* ══════════════════════════════════════════
     1回転
     ══════════════════════════════════════════ */
  async function fire() {
    if (!st || st.spinning) return;
    /* ★ 選択のオーバーレイが出ているあいだは打たない。
       ここを許すと、選んでいる最中にオートが裏で回って残高だけ減る。 */
    if (st.choosing) return;
    if (M.xeva() < st.bet) { pmsg("XEVA が足りません", "bad"); stopAuto(); return; }
    if (!M.bet(st.bet, G)) { pmsg("ベットできませんでした", "bad"); stopAuto(); return; }
    /* ★ BOOST へ預かる。ここで抜いたぶんが、あとで丸ごと返る。
       預かる割合にも本日の倍率を掛ける（出玉だけ動かすと内訳の比がズレる）。 */
    st.pool += st.bet * X.BOOST_RATE * M.dayMul();
    st.boost = Math.min(X.BOOST_SPINS, st.boost + 1);
    M.S.pachiPool = st.pool; M.S.pachiBoost = st.boost;
    paintBoost();

    st.spinning = true;
    document.getElementById("jrFire").classList.add("busy");
    paintBal(); paintBetV();

    shootBall(); M.SFX.chip();
    const res = X.spinOnce(st.machine, st.route, st.rush);
    st.lastHeat = res.heat;
    const jp = await M.jackpotRoll(st.bet);
    if (!st) return;

    await runDigits(res);
    /* ★ 演出の途中でロビーに戻られていたら、ここから先は触らない（unmount 後は st も DOM も無い） */
    if (!st) return;

    if (res.hit) {
      const pay = Math.round(res.pay * st.bet);
      M.payout(pay, G, "Jackpot Rush");
      paintBal();
      await bigHit(res, pay);
      if (!st) return;
      const wasRush = st.rush;
      st.rush = res.rush;
      if (res.rush) { st.rushHits++; st.rushWon += pay; }
      /* RUSH に入る瞬間だけルートを選び直せる（そこが一番おいしい判断ポイント） */
      if (!wasRush && res.kind === "enter") {
        stopAuto();
        await pickRoute();
        if (!st) return;
        /* 実機と同じで、RUSH に入ったら右打ちへ */
        setSide("r", true);
        M.toast("▶ <b>右打ち</b>に切りかえました（向きは出玉に影響しません）");
      }
      if (!res.rush && st.rushHits > 0) { await endRush(); if (!st) return; setSide("l", true); }
      paintHud();
      M.round({ game: G, bet: st.bet, win: pay,
        replay: { kind: "pachi", k: res.kind, machine: st.machine, route: st.route, side: st.side } });
    } else {
      M.round({ game: G, bet: st.bet, win: 0, replay: null });
    }

    st.spinning = false;
    const fb2 = document.getElementById("jrFire"); if (fb2) fb2.classList.remove("busy");

    if (jp > 0) { M.payout(jp, G, "プログレッシブ・ジャックポット"); paintBal(); await M.jackpotShow(jp); }
    if (!st) return;

    /* BOOST 満タン → 使いかたを聞く */
    if (st.boost >= X.BOOST_SPINS) { stopAuto(); openBoost(); return; }

    if (st.auto) {
      if (M.xeva() < st.bet) { stopAuto(); M.toast("XEVA が足りなくなったのでオートを止めました"); return; }
      st.timer = setTimeout(() => { if (st && st.auto && !st.spinning) fire(); }, M.S.set.fast ? 110 : 240);
    }
  }

  /* ══════════════════════════════════════════
     デジタルを回して止める（王道の発展フロー）
     通常 → リーチ → スーパー → ストーリー → FINAL BATTLE
     ══════════════════════════════════════════ */
  async function runDigits(res) {
    const dm = st.drama === "lite" ? 0.45 : st.drama === "max" ? 1.35 : 1;
    stage("");
    const target = res.hit
      ? (() => { const n = M.ri(9) + 1; return [n, n, n]; })()
      : (() => {
        if (res.heat >= 1) { const n = M.ri(9) + 1; let o = n; while (o === n) o = M.ri(9) + 1; return [n, o, n]; }
        return [M.ri(10), M.ri(10), M.ri(10)];
      })();

    let cur = [0, 0, 0]; const spinning = [1, 1, 1], locked = [0, 0, 0];
    const iv = setInterval(() => {
      cur = cur.map((v, i) => (spinning[i] ? M.ri(10) : v));
      paintDigits(cur, spinning, false, locked);
    }, 60);

    await M.sleep(400 * dm);
    if (!st) { clearInterval(iv); return; }
    cur[0] = target[0]; spinning[0] = 0; locked[0] = 1; M.SFX.stop(); paintDigits(cur, spinning, false, locked);
    await M.sleep(260 * dm);
    if (!st) { clearInterval(iv); return; }
    cur[2] = target[2]; spinning[2] = 0; locked[2] = 1; M.SFX.stop(); paintDigits(cur, spinning, false, locked);
    await M.sleep(200 * dm);
    if (!st) { clearInterval(iv); return; }

    const reach = target[0] === target[2];
    if (!reach) {
      clearInterval(iv);
      cur[1] = target[1]; spinning[1] = 0;
      paintDigits(cur, [0, 0, 0], false, [1, 1, 1]);
      M.SFX.stop(); paintLamp(0); paintChance(0);
      pmsg(st.rush ? "RUSH 継続中…" : "…はずれ");
      return;
    }

    /* ── ① リーチ ── */
    seeFx("reach");
    M.SFX.hot(); paintLamp(1); paintChance(1);
    pmsg("🎯 <b>リーチ！</b>", "hot");
    paintDigits(cur, spinning, true, locked);
    await M.sleep(620 * dm);
    if (!st) { clearInterval(iv); return; }

    /* ── ② スーパーリーチ ── */
    if (res.heat >= 2) {
      seeFx("super");
      paintLamp(res.heat >= 4 ? 5 : res.heat >= 3 ? 4 : 3);
      paintChance(2);
      const bd1 = document.getElementById("jrBoard"); if (bd1) bd1.classList.add("super");
      M.slow(true); M.shake();
      pmsg("🔥 <b>スーパーリーチ！</b>", "hot");
      await M.sleep(800 * dm);
      if (!st) { clearInterval(iv); return; }
    }

    /* ── ③ ストーリーリーチ ── */
    if (res.heat >= 3 && res.story) {
      seeFx("story");
      paintChance(3);
      stage('<div class="jr-story">' +
        '<img src="' + res.story.face + '" alt="">' +
        '<div class="tx"><span class="ic">' + res.story.ic + "</span>" +
        "<b>" + esc(res.story.nm) + "</b><i>STORY REACH</i></div></div>", "story");
      M.SFX.hot();
      pmsg("📖 <b>ストーリーリーチ</b>　" + esc(res.story.nm), "hot");
      await M.sleep(1200 * dm);
      if (!st) { clearInterval(iv); return; }
    }

    /* ── ④ FINAL BATTLE ── */
    if (res.heat >= 4 && res.boss) {
      seeFx("final");
      paintChance(4);
      await M.cutIn({ level: 3, word: "運命を、掴み取れ" });
      if (!st) { clearInterval(iv); return; }
      stage('<div class="jr-final">' +
        '<div class="vs">FINAL BATTLE</div>' +
        '<img src="' + res.boss.face + '" alt="">' +
        '<div class="nm">VS ' + esc(res.boss.nm) + "</div>" +
        '<div class="hp"><i id="jrHp"></i></div></div>', "final");
      M.SFX.bigwin(); M.shake(true); M.slow(true);
      pmsg("⚔️ <b>FINAL BATTLE</b>　VS " + esc(res.boss.nm), "hot");
      /* HP を削る演出。勝てば0まで、負ければ途中で止まる */
      const hp = document.getElementById("jrHp");
      const to = res.hit ? 0 : 0.18 + M.rng() * 0.3;
      for (let t = 1; t >= to; t -= 0.08) {
        if (!st) { clearInterval(iv); return; }
        if (hp) hp.style.width = Math.max(0, t * 100) + "%";
        M.SFX.tick();
        await M.sleep(70 * dm);
      }
      await M.sleep(500 * dm);
      if (!st) { clearInterval(iv); return; }
    }

    /* ── 最後のじらし ── */
    if (res.heat >= 2 || res.hit) {
      for (let i = 0; i < (res.heat >= 3 ? 3 : 2); i++) {
        cur[1] = (target[1] + (i % 2 ? 1 : 9)) % 10;
        paintDigits(cur, spinning, true, locked); M.SFX.tick();
        await M.sleep(240 * dm);
        if (!st) { clearInterval(iv); return; }
      }
    }
    M.slow(false);
    const bd2 = document.getElementById("jrBoard"); if (bd2) bd2.classList.remove("super");
    clearInterval(iv);
    cur[1] = target[1]; spinning[1] = 0;
    paintDigits(cur, [0, 0, 0], res.hit, [1, 1, 1]);
    M.SFX.stop();
    if (!res.hit) {
      stage("");
      paintLamp(0); paintChance(0);
      pmsg(st.rush ? "RUSH 継続中…" : "…惜しい。次だ");
    }
  }

  /* 大当たりの演出 */
  async function bigHit(res, pay) {
    const box = document.getElementById("jrBurst");
    const t = document.getElementById("jrBurstT"), s2 = document.getElementById("jrBurstS");
    const label = res.kind === "enter" ? "RUSH BREAK!!" : res.kind === "super" ? "SUPER JACKPOT!!"
      : res.kind === "cont" ? "RUSH 継続!!" : res.kind === "end" ? "FINAL HIT!!" : "大当たり!!";
    if (res.kind === "enter") seeFx("rush");
    if (res.kind === "super") seeFx("sjp");
    t.textContent = label;
    s2.innerHTML = "+" + fmt(pay) + " XEVA";
    box.className = "mjs-burst on" + (res.kind === "super" ? " sjp" : res.kind === "enter" ? " brk" : "");
    M.SFX.bigwin(); M.shake(res.kind === "super" || res.kind === "enter");
    M.burst(res.kind === "super" ? 240 : 130, 12);
    if (res.kind === "super") M.rain(200, 1900);
    pmsg("🎉 <b>" + label + "</b>　+" + fmt(pay), "win");
    await M.sleep(res.kind === "super" ? 2400 : 1500);
    if (!st) return;
    box.className = "mjs-burst";
    stage("");
    paintLamp(0); paintChance(0);
  }

  /* ══════════════════════════════════════════
     RUSH ルートの選び直し（突入の瞬間だけ）
     ══════════════════════════════════════════ */
  function pickRoute() {
    st.choosing = true;
    return new Promise((resolve) => {
      const el = ovOpen(
        '<div class="ch-hd"><span class="t">CHOOSE YOUR PATH</span>' +
          '<span class="s">RUSH をどう走る？</span></div>' +
        '<div class="ch-note">3つとも<b>1回の RUSH で出る量の期待値はぴったり同じ</b>です。' +
        "変わるのは「何連チャンするか」と「1回がどれだけ重いか」だけ。</div>" +
        '<div class="ch-list">' + X.ROUTES.map((r) => {
          const s = X.spec(st.machine, r.id);
          return '<button class="ch-op ' + r.id + '" data-r="' + r.id + '">' +
            '<span class="ic">' + r.ic + "</span>" +
            '<span class="bd"><span class="t1">' + esc(r.nm) + "<i>" + r.en + "</i></span>" +
            '<span class="t2">' + esc(r.ds) + "</span>" +
            '<span class="tag">継続 ' + Math.round((1 - s.end) * 100) + "%　1回 ×" + s.payCont.toFixed(1) + "</span>" +
            "</span></button>";
        }).join("") + "</div>");
      if (!el) { st.choosing = false; resolve(); return; }
      M.SFX.hot();
      el.querySelectorAll("[data-r]").forEach((b) => {
        b.onclick = () => {
          st.route = b.dataset.r;
          st.choosing = false;
          M.SFX.click(); ovClose();
          const r = X.ROUTES.find((x) => x.id === st.route);
          pmsg("▶ <b>" + esc(r.nm) + "</b> ルートで RUSH 開始！", "win");
          resolve();
        };
      });
    });
  }

  /* ══════════════════════════════════════════
     BOOST ゲージ
     ══════════════════════════════════════════ */
  function openBoost() {
    st.choosing = true;
    const pool = Math.round(st.pool);
    const routes = boostRoutes(pool);
    const el = ovOpen(
      '<div class="ch-hd"><span class="t">BOOST GAUGE 満タン</span>' +
        '<span class="s">預かっていた <b>' + fmt(pool) + " XEVA</b> を、どう使う？</span></div>" +
      '<div class="ch-note">3つとも<b>期待値はまったく同じ</b>（成功率 × 倍率 = 1.00）。荒さだけが違います。</div>' +
      '<div class="ch-list">' + routes.map((r) =>
        '<button class="ch-op ' + r.id + '" data-b="' + r.id + '">' +
          '<span class="ic">' + r.ic + "</span>" +
          '<span class="bd"><span class="t1">' + esc(r.nm) + "<i>" + r.en + "</i></span>" +
          '<span class="t2">' + esc(r.ds) + "</span>" +
          '<span class="tag">' + r.tag + "　→ " + fmt(r.val) + " XEVA</span></span></button>").join("") +
      "</div>" +
      '<button class="ch-later" id="jrBoostLater">あとで使う</button>');
    if (!el) { st.choosing = false; return; }
    M.SFX.hot();
    el.querySelectorAll("[data-b]").forEach((b) => {
      b.onclick = async () => {
        const r = routes.find((x) => x.id === b.dataset.b);
        M.SFX.click(); seeFx("boostfx");
        st.choosing = false;
        el.querySelectorAll("button").forEach((x) => { x.disabled = true; });
        st.boost = 0; st.pool = 0;
        M.S.pachiBoost = 0; M.S.pachiPool = 0;
        paintBoost(); M.saveNow();
        if (r.p < 1) {
          M.slow(true);
          await M.cutIn({ level: r.mul >= 10 ? 3 : 2, word: r.mul >= 10 ? "すべてを、賭けろ" : "ここで決める" });
          M.slow(false);
        }
        if (!st) return;
        ovClose();
        if (!M.chance(r.p)) {
          M.SFX.lose(); M.shake();
          pmsg("💧 BOOST 失敗……<b>" + fmt(pool) + "</b> は消えました", "bad");
          return;
        }
        M.payout(r.val, G, "BOOST GAUGE（" + r.nm + "）");
        paintBal();
        M.SFX.bigwin(); M.burst(r.mul >= 10 ? 200 : 90, 11); if (r.mul >= 10) M.shake(true);
        pmsg("⚡ <b>BOOST " + esc(r.nm) + "</b>　+" + fmt(r.val) + " XEVA", "win");
        if (r.mul >= 10) {
          const jp = await M.jackpotRoll(r.val);
          if (jp > 0) { M.payout(jp, G, "プログレッシブ・ジャックポット"); paintBal(); await M.jackpotShow(jp); }
        }
      };
    });
    document.getElementById("jrBoostLater").onclick = () => { M.SFX.click(); ovClose(); st.choosing = false; };
  }

  async function endRush() {
    const hits = st.rushHits, won = st.rushWon;
    st.rushHits = 0; st.rushWon = 0;
    stopAuto(); paintHud();
    const v = await M.result({
      win: won > 0, head: "RUSH 終了", amount: won,
      emoji: hits >= 8 ? "👑" : hits >= 4 ? "🎉" : "🔔",
      desc: "<b>" + hits + " 連チャン</b>で <b>" + fmt(won) + " XEVA</b> を獲得しました。",
    });
    if (v === "again" && st && M.xeva() >= st.bet) fire();
  }

  function toggleAuto() {
    if (!st) return;
    if (st.auto) { stopAuto(); return; }
    st.auto = true;
    const b = document.getElementById("jrAuto");
    b.classList.add("on"); b.innerHTML = "AUTO<br><i>ON</i>";
    M.SFX.click();
    if (!st.spinning) fire();
  }
  function stopAuto() {
    if (!st) return;
    st.auto = false;
    /* ★ 予約済みの次回転も消す。フラグだけ折っても1回ぶん走ってしまう。 */
    clearTimeout(st.timer); st.timer = 0;
    const b = document.getElementById("jrAuto");
    if (b) { b.classList.remove("on"); b.innerHTML = "AUTO<br><i>OFF</i>"; }
  }

  /* ══════════════════════════════════════════
     MENU（ボトムシート）
     ══════════════════════════════════════════ */
  function openMenu() {
    M.SFX.click();
    const m = X.MACHINES.find((x) => x.id === st.machine);
    const s = X.spec(st.machine, st.route);
    const ov = M.sheet({
      icon: "☰", title: "Jackpot Rush", ok: "とじる",
      html:
        '<div class="sh-hd2">ベット額（1回転）</div>' +
        '<div class="mj-bets" id="jrBets"></div>' +

        '<div class="sh-hd2">台えらび（いま 1/' + s.oneIn + "）</div>" +
        X.MACHINES.map((x) =>
          '<button class="sh-sw' + (x.id === st.machine ? " on" : "") + '" data-mc="' + x.id + '">' +
          '<span class="bd"><span class="t1">' + x.ic + " " + esc(x.nm) + "</span>" +
          '<span class="t2">' + esc(x.ds) + "</span></span>" +
          '<span class="rt">' + (x.id === st.machine ? "使用中" : "えらぶ") + "</span></button>").join("") +
        '<div class="mj-note" style="margin-top:8px">※ <b>当たりやすさを上げると出玉が同じ比率で下がります</b>。' +
        "どの台でも還元率は同じで、変わるのは「当たりの間隔」と「一撃の大きさ」だけです。</div>" +

        '<div class="sh-hd2">RUSH ルート（いま ' + esc(s.route.nm) + "）</div>" +
        X.ROUTES.map((r) => {
          const sp = X.spec(st.machine, r.id);
          return '<button class="sh-sw' + (r.id === st.route ? " on" : "") + '" data-rt="' + r.id + '">' +
            '<span class="bd"><span class="t1">' + r.ic + " " + esc(r.nm) + "</span>" +
            '<span class="t2">' + esc(r.ds) + "（継続 " + Math.round((1 - sp.end) * 100) + "%）</span></span>" +
            '<span class="rt">' + (r.id === st.route ? "使用中" : "えらぶ") + "</span></button>";
        }).join("") +

        '<div class="sh-hd2">見る</div>' +
        '<button class="sh-sw" data-m="spec"><span class="bd"><span class="t1">📋 スペックと出玉</span>' +
          '<span class="t2">確率・出玉・理論還元率</span></span><span class="rt">›</span></button>' +
        '<button class="sh-sw" data-m="how"><span class="bd"><span class="t1">📖 あそびかた</span>' +
          '<span class="t2">左打ち・右打ちと RUSH のしくみ</span></span><span class="rt">›</span></button>' +
        '<button class="sh-sw" data-m="book"><span class="bd"><span class="t1">🎬 演出図鑑</span>' +
          '<span class="t2">見たことのある演出の期待度</span></span><span class="rt">›</span></button>' +
        '<button class="sh-sw" data-m="rtp"><span class="bd"><span class="t1">' + M.dayRtpInfo().ic +
          ' 本日の還元率</span><span class="t2">' + M.dayRtpInfo().nm + "・毎日 0:00 に変わります</span></span>" +
          '<span class="rt">' + M.dayRtpInfo().pct + "%</span></button>" +

        '<div class="sh-hd2">設定</div>' +
        [["lite", "控えめ"], ["std", "標準"], ["max", "劇場"]].map((d) =>
          '<button class="sh-sw' + (d[0] === st.drama ? " on" : "") + '" data-dr="' + d[0] + '">' +
          '<span class="bd"><span class="t1">🎭 演出の濃さ：' + d[1] + "</span>" +
          '<span class="t2">見た目だけの設定。<b>当たりやすさ・出玉には影響しません</b></span></span>' +
          '<span class="rt">' + (d[0] === st.drama ? "使用中" : "えらぶ") + "</span></button>").join("") +
        '<button class="sh-sw' + (M.S.set.sound ? " on" : "") + '" data-m="sound"><span class="bd">' +
          '<span class="t1">🔊 効果音</span><span class="t2">玉とデジタルの音</span></span>' +
          '<span class="rt">' + (M.S.set.sound ? "ON" : "OFF") + "</span></button>",
    });
    if (!ov) return;
    paintChips(ov.querySelector("#jrBets"));
    ov.querySelectorAll("[data-mc]").forEach((b) => {
      b.onclick = () => {
        if (st.rush) { M.toast("RUSH 中は台を変えられません"); return; }
        st.machine = b.dataset.mc; M.SFX.click(); paintHud(); openMenu();
      };
    });
    ov.querySelectorAll("[data-rt]").forEach((b) => {
      b.onclick = () => {
        if (st.rush) { M.toast("RUSH 中はルートを変えられません"); return; }
        st.route = b.dataset.rt; M.SFX.click(); paintHud(); openMenu();
      };
    });
    ov.querySelectorAll("[data-dr]").forEach((b) => {
      b.onclick = () => { st.drama = b.dataset.dr; M.SFX.click(); openMenu(); };
    });
    ov.querySelectorAll("[data-m]").forEach((b) => {
      b.onclick = () => {
        const k = b.dataset.m;
        if (k === "sound") { M.S.set.sound = !M.S.set.sound; M.save(); M.SFX.click(); openMenu(); return; }
        if (k === "spec") { showSpec(); return; }
        if (k === "how")  { showTutorial(); return; }
        if (k === "book") { openBook(); return; }
        if (k === "rtp")  { M.SFX.click(); M.rtpSheet(); return; }
      };
    });
  }

  function showSpec() {
    M.SFX.click();
    const s = X.spec(st.machine, st.route);
    const rtp = X.theoryRTP(st.machine, st.route);
    const kv = (k, v) => '<div class="sh-kv"><span>' + k + "</span><span>" + v + "</span></div>";
    M.sheet({
      icon: "📋", title: "スペックと出玉", ok: "とじる",
      html:
        kv("通常時の大当たり確率", "1/" + s.oneIn) +
        kv("RUSH中の大当たり確率", "1/" + Math.round(1 / s.pRush)) +
        kv("RUSH突入率", Math.round(s.toRush * 100) + "%") +
        kv("RUSH継続率（" + s.route.nm + "）", Math.round((1 - s.end) * 100) + "%") +
        kv("通常当たりの出玉", fmt(s.payNormal * st.bet) + "（×" + s.payNormal.toFixed(1) + "）") +
        kv("RUSH突入時の出玉", fmt(s.payEnter * st.bet) + "（×" + s.payEnter.toFixed(1) + "）") +
        kv("RUSH継続の出玉", fmt(s.payCont * st.bet) + "（×" + s.payCont.toFixed(1) + "）") +
        kv("SUPER の出玉", fmt(s.paySuper * st.bet) + "（×" + s.paySuper.toFixed(1) + "）") +
        kv("理論還元率（デジタル・本日）", Math.round(rtp * 1000) / 10 + "%") +
        kv("BOOST ゲージぶん（本日）", Math.round(X.BOOST_RATE * M.dayMul() * 1000) / 10 + "%") +
        kv("本日のコンディション", M.dayRtpInfo().ic + " " + M.dayRtpInfo().nm + "（" + M.dayRtpInfo().sign + "）") +
        '<div class="mj-note" style="margin-top:9px">デジタルの出玉 <b>' + Math.round(rtp * 1000) / 10 + "%</b> ＋ " +
        "BOOST <b>" + Math.round(X.BOOST_RATE * M.dayMul() * 1000) / 10 + "%</b> ＝ <b>" +
        M.dayRtpInfo().pct + "%</b>（<b>本日の値</b>。毎日 0:00 に変わります／あと " + M.dayLeftText() + "）。" +
        "これに加えてベットの <b>" + Math.round(M.JP_RATE * 100) + "%</b> がプログレッシブへ積まれます" +
        "（合計 <b>" + M.dayRtpInfo().total + "%</b>・長い目で見た平均は 100%）。<br>" +
        "RUSH は<b>継続率 " + Math.round((1 - s.end) * 100) + "%</b>、平均で <b>" +
        (1 / s.end).toFixed(1) + " 回</b>続きます。<br>" +
        "★ <b>3つのルートは期待出玉がぴったり同じ</b>です（コンソールで MJPachiMath.routeEV() を叩くと確認できます）。<br>" +
        "★ <b>打ち出す向き（左／右）も出玉に影響しません。</b>玉は必ず入賞口へ吸い込まれ、" +
        "当たりはデジタルの抽選だけで決まります。</div>",
    });
  }

  function showTutorial() {
    M.SFX.click();
    M.sheet({
      icon: "🔔", title: "Jackpot Rush のあそびかた", ok: "はじめる",
      html: '<div class="mj-note">' +
        "<b>運だけでは終わらない。一瞬の判断が運命を変える。</b><br><br>" +
        "① <b>PUSH</b>、または<b>盤面の左半分／右半分をタップ</b>すると、その側から玉を打ち出します（1回転）。" +
        "3つの数字がそろえば大当たりです。<br>" +
        "② 通常は <b>◀ 左打ち</b>、RUSH に入ったら <b>右打ち ▶</b>——実機と同じ流れです。" +
        "指示ランプも出ますが、<b>向きは出玉に影響しません</b>（当たりはデジタルの抽選だけで決まります）。<br>" +
        "③ 左右が同じ数字で止まると <b>リーチ</b>。そこから" +
        "<b>スーパー → ストーリー → FINAL BATTLE</b> と発展します。" +
        "上へ行くほどアツいですが、<b>最後まで分かりません</b>。<br>" +
        "④ 大当たりの <b>" + Math.round(X.BASE.toRush * 100) + "%</b> が <b>RUSH</b> へ。" +
        "突入の瞬間だけ <b>ルート（攻める / 安定 / 逆転）</b>を選べます。<br>" +
        "⑤ <b>BOOST ゲージ</b>はベットのたびに少しずつ溜まり、満タンで" +
        "<b>確定 / 倍賭け / 一撃</b>のどれかで受け取れます。<br>" +
        "⑥ <b>台えらび</b>（MENU）で当たりやすさと一撃の大きさを入れ替えられます。<br><br>" +
        "★ <b>ここが大事</b>：④⑤⑥の選択は、<b>どれを選んでも期待値は同じ</b>です。" +
        "変わるのは荒さだけ。だから「正解の押し方」はありません。<br><br>" +
        "★ <b>還元率は毎日変わります</b>（" + M.dayRtpInfo().ic + " 本日 <b>" + M.dayRtpInfo().pct +
        "%</b>・" + esc(M.dayRtpInfo().nm) + "）。全ゲーム共通で、日付だけから決まります。" +
        "MENU の<b>「本日の還元率」</b>で確認できます。" +
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
    stopLoop(); stopAuto(); balls = [];
    window.removeEventListener("mj:wallet", paintBal);
    window.removeEventListener("mj:jackpot", paintJp);
    if (ro) { try { ro.disconnect(); } catch (e) {} ro = null; }
    removeEventListener("resize", fitCanvas);
    if (st) { clearInterval(st.jpTimer); clearTimeout(st.timer);
      M.S.pachiBoost = st.boost; M.S.pachiPool = st.pool; M.S.pachiFx = st.fxSeen; M.save(); }
    M.slow(false);
    st = null; cv = null; ctx = null;
  }

  window.MJPachi = { mount, unmount, id: G, nm: "Jackpot Rush" };
})();
