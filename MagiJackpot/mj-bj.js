/* ============================================================
   MagiJackpot — ブラックジャック「Royal Blackjack」
   ------------------------------------------------------------
   6デッキ／ディーラーはソフト17でヒット／ブラックジャックは 3:2／
   ダブル・スプリット（最大3ハンド）・レイトサレンダー あり。

   ★ 還元率について（毎日の変動は「テーブルレート」で。下の RTP0 の節を見ること）
     ブラックジャックは<b>素の還元率が 99.38%</b>もある（＝ハウスの取り分が 0.62% しかない）ため、
     スロットのように 2% をジャックポットへ積むと「他より明らかに損な卓」になってしまう。
     そこでこの卓は
       ・ジャックポットへの積立を <b>0.25%</b> だけにする（JP_RATE_BJ）
       ・残りの余力を <b>連勝ボーナス</b>と<b>Royal Chance</b>に配る
     という配分にしてある。基本戦略どおりに打った場合の実測は <b>およそ 99.97%</b>（RTP0）、
     ジャックポットぶんを足しておよそ <b>100%</b>。
     ＝ 実測は MJBJMath.mc(1000000, true).rtp で確認できる（1.005 を超えたら配りすぎ）。
     ★ 以前ここには 99.75% と書いてあったが、150万ハンドで測ると 99.97% だった。
       表示にもこの RTP0 を使うようにして、数字が1か所で決まるようにしてある。

   ★ 基本戦略（BASIC）はヒント表示にもモンテカルロにも同じものを使う。
     「AIがすすめる手」と「還元率を測るときの打ち方」がズレていると、
     画面に出している数字が嘘になるため。
   ============================================================ */

/* ══════════════════════════════════════════════════════════
   計算部（表示なし）
   ══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const R = () => (window.MJ ? window.MJ.rng() : Math.random());

  const DECKS = 6;
  const BJ_PAY = 1.5;            // ブラックジャックの配当（3:2）
  const H17 = true;              // ディーラーはソフト17でヒット

  /* ── 連勝ボーナス（勝った瞬間、ベットに対する上乗せ率）──
     ★ ここと ROYAL の数字は「使える予算」がとても小さい。
       ブラックジャックは素の還元率が 99.38% もあるので、100% までの余りは 0.6% しかない。
       連勝ボーナスと Royal Chance の2つを、その 0.6% の中で分け合っている。
       数字をいじったら必ず MJBJMath.mc(400000) で測り直すこと（1.00 を超えたら配りすぎ）。 */
  const STREAK_BONUS = [
    { at: 3, mul: 0.02 },
    { at: 5, mul: 0.05 },
    { at: 7, mul: 0.10 },
  ];
  function streakBonusMul(streak) {
    let m = 0;
    STREAK_BONUS.forEach((s) => { if (streak >= s.at) m = s.mul; });
    return m;
  }
  /* ── Royal Chance ──
     まれに発生し、そのハンドの勝ちが跳ね上がる。負けても掛け金は返る（保険つき）。 */
  const JP_RATE_BJ = 0.0025;     // この卓のジャックポット積立率（スロットは 2%）
  const ROYAL_P = 1 / 400;
  const ROYAL_MUL = 2;           // 勝ったときの配当倍率（通常の代わり）

  /* ══════════════════════════════════════════
     本日の還元率にそろえる（テーブルレート）
     ------------------------------------------
     ★ ほかの卓は「配当表を伸縮させる」だけで今日の値にできるが、
       ブラックジャックの還元率は<b>カードの規則</b>で決まっているので同じ手が使えない。
       （1:1 の勝ちを 0.96:1 にしたら、それはもうブラックジャックではない）
       そこでこの卓は、精算のいちばん最後で
         <b>その手で増えたぶん（純益）にだけ</b>本日の倍率を掛ける。
       負けたぶん・引き分け・サレンダーの返却はそのまま＝規則は1つも変えていない。

     ★ 倍率の出しかた
       純益に m を掛けると、この卓の還元率は PROFIT_RATE（＝1ベットあたりの平均純益）×(m−1) 動く。
       ほかの卓は本日の値がそのまま ±（98% との差）動くので、同じだけ動かしたい。つまり
         m = 1 + (本日の配当 − BASE_RTP) / PROFIT_RATE
       平均の日（98%）はちょうど m = 1.000 ＝ <b>ふだんの 3:2 の卓そのまま</b>。
       甘い日は勝ち分が少し増え、渋い日は少し減る——動く量は他の卓と同じ ±2%。
     ★ RTP0 / PROFIT_RATE は基本戦略での実測値（150万ハンド）。
       配当や特典をいじったら MJBJMath.mc(1000000, true) で測り直すこと
       （第2引数 true ＝ 本日の倍率を掛けない素の値）。
     ══════════════════════════════════════════ */
  const RTP0 = 0.9997;           // 平均の日のこの卓の還元率（基本戦略・実測 150万ハンド）
  const PROFIT_RATE = 0.4552;    // 1ベットあたりの平均純益（勝った手ぶんだけ・実測）
  function dayWinMul() {
    const M = window.MJ;
    if (!M || !M.dayRtp) return 1;
    const m = 1 + (M.dayRtp() - M.BASE_RTP) / PROFIT_RATE;
    return Math.max(0.5, m);     // 念のための下限（配当がマイナスになることは無い）
  }
  /* 精算の最後にこれを通す。got＝手もとに戻る総額、wag＝その手で賭けた総額。 */
  function applyDay(got, wag) {
    const net = got - wag;
    if (net <= 0) return got;                       // 負け・引き分け・サレンダーはそのまま
    return wag + net * dayWinMul();
  }

  /* ── カード ── */
  const SUITS = ["♠", "♥", "♦", "♣"];
  function newShoe() {
    const s = [];
    for (let d = 0; d < DECKS; d++)
      for (let su = 0; su < 4; su++)
        for (let r = 1; r <= 13; r++) s.push({ r, su });
    return window.MJ ? window.MJ.shuffle(s) : s.sort(() => R() - 0.5);
  }
  function cardVal(c) { return c.r === 1 ? 11 : Math.min(10, c.r); }
  function handVal(cs) {
    let t = 0, a = 0;
    cs.forEach((c) => { const v = cardVal(c); t += v; if (v === 11) a++; });
    while (t > 21 && a > 0) { t -= 10; a--; }
    return { total: t, soft: a > 0, bust: t > 21 };
  }
  function isBJ(cs) { return cs.length === 2 && handVal(cs).total === 21; }
  function rankName(r) { return r === 1 ? "A" : r === 11 ? "J" : r === 12 ? "Q" : r === 13 ? "K" : String(r); }

  /* ══════════════════════════════════════════
     基本戦略
     返り値: "H"(ヒット) "S"(スタンド) "D"(ダブル/不可ならヒット)
             "P"(スプリット) "R"(サレンダー/不可ならヒット)
     up = ディーラーのアップカードの点（A は 11）
     ══════════════════════════════════════════ */
  function basic(cards, up, opt) {
    opt = opt || {};
    const canD = !!opt.canDouble, canP = !!opt.canSplit, canR = !!opt.canSurrender;
    const v = handVal(cards);
    /* ペア */
    if (canP && cards.length === 2 && Math.min(10, cards[0].r === 1 ? 11 : cards[0].r) === Math.min(10, cards[1].r === 1 ? 11 : cards[1].r)) {
      const p = cards[0].r === 1 ? 11 : Math.min(10, cards[0].r);
      if (p === 11) return "P";                                  // A,A
      if (p === 10) return "S";                                  // 10,10
      if (p === 9)  return (up >= 2 && up <= 6) || up === 8 || up === 9 ? "P" : "S";
      if (p === 8)  return "P";
      if (p === 7)  return up >= 2 && up <= 7 ? "P" : "H";
      if (p === 6)  return up >= 2 && up <= 6 ? "P" : "H";       // DAS 前提で 2 も割る
      if (p === 5)  return canD && up >= 2 && up <= 9 ? "D" : "H";
      if (p === 4)  return up === 5 || up === 6 ? "P" : "H";
      if (p === 3 || p === 2) return up >= 2 && up <= 7 ? "P" : "H";
    }
    /* サレンダー（最初の2枚のときだけ） */
    if (canR && cards.length === 2) {
      if (v.total === 16 && !v.soft && (up === 9 || up === 10 || up === 11)) return "R";
      if (v.total === 15 && !v.soft && (up === 10 || (H17 && up === 11))) return "R";
      if (H17 && v.total === 17 && !v.soft && up === 11) return "R";
    }
    /* ソフトハンド */
    if (v.soft) {
      const t = v.total;
      if (t >= 20) return "S";
      if (t === 19) return canD && H17 && up === 6 ? "D" : "S";
      if (t === 18) {
        if (canD && up >= 2 && up <= 6) return "D";
        if (up === 7 || up === 8) return "S";
        return "H";
      }
      if (t === 17) return canD && up >= 3 && up <= 6 ? "D" : "H";
      if (t === 16 || t === 15) return canD && up >= 4 && up <= 6 ? "D" : "H";
      if (t === 14 || t === 13) return canD && up >= 5 && up <= 6 ? "D" : "H";
      return "H";
    }
    /* ハードハンド */
    const t = v.total;
    if (t >= 17) return "S";
    if (t >= 13) return up >= 2 && up <= 6 ? "S" : "H";
    if (t === 12) return up >= 4 && up <= 6 ? "S" : "H";
    if (t === 11) return canD ? "D" : "H";
    if (t === 10) return canD && up >= 2 && up <= 9 ? "D" : "H";
    if (t === 9)  return canD && up >= 3 && up <= 6 ? "D" : "H";
    return "H";
  }
  const ACT_NM = { H: "ヒット", S: "スタンド", D: "ダブル", P: "スプリット", R: "サレンダー" };

  /* ══════════════════════════════════════════
     ディーラーの手順
     ══════════════════════════════════════════ */
  function dealerPlay(cs, draw) {
    for (let i = 0; i < 20; i++) {
      const v = handVal(cs);
      if (v.total > 21) break;
      if (v.total > 17) break;
      if (v.total === 17 && !(H17 && v.soft)) break;
      cs.push(draw());
    }
    return cs;
  }

  /* ══════════════════════════════════════════
     還元率の実測（基本戦略で打った場合）
     ══════════════════════════════════════════ */
  /* ★ 引数 raw に true を渡すと「本日の倍率を掛けない素の値」を測る。
     設計値（RTP0）を出したいときはこちら。 */
  function mc(n, raw) {
    n = n || 200000;
    let shoe = newShoe(), idx = 0;
    const draw = () => { if (idx >= shoe.length - 20) { shoe = newShoe(); idx = 0; } return shoe[idx++]; };
    const bet = 100;
    let wagered = 0, ret = 0, streak = 0, profit = 0;

    for (let i = 0; i < n; i++) {
      /* ★ 賭けた総額はダブル・スプリットのぶんも足すこと。
         初期ベットだけを分母にすると、還元率が実際より大きく出てしまう。 */
      let wag = bet;
      wagered += bet;
      const royal = R() < ROYAL_P;
      const p = [draw(), draw()], d = [draw(), draw()];
      const up = cardVal(d[0]);
      let got = 0, decided = 0;   // decided: +1 勝ち / -1 負け / 0 引き分け（連勝の判定用）

      if (isBJ(p) || isBJ(d)) {
        if (isBJ(p) && isBJ(d)) { got = bet; decided = 0; }
        else if (isBJ(p)) { got = bet * (1 + BJ_PAY); decided = 1; }
        else { got = 0; decided = -1; }
      } else {
        /* プレイヤーのハンド（スプリットで最大3つ） */
        let hands = [{ cs: p, bet: bet, done: false, sur: false, dbl: false }];
        let guard = 0;
        while (guard++ < 40) {
          const h = hands.find((x) => !x.done);
          if (!h) break;
          const canSplit = h.cs.length === 2 && hands.length < 3 &&
            Math.min(10, h.cs[0].r === 1 ? 11 : h.cs[0].r) === Math.min(10, h.cs[1].r === 1 ? 11 : h.cs[1].r);
          const a = basic(h.cs, up, { canDouble: h.cs.length === 2, canSplit, canSurrender: hands.length === 1 && h.cs.length === 2 });
          if (a === "R") { h.sur = true; h.done = true; continue; }
          if (a === "P") {
            const c2 = h.cs.pop();
            const nh = { cs: [c2, draw()], bet: h.bet, done: false, sur: false, dbl: false };
            wagered += h.bet; wag += h.bet;        // 分けた手のぶんを追加で賭ける
            h.cs.push(draw());
            hands.push(nh);
            /* A のスプリットは1枚ずつで終わり */
            if (h.cs[0].r === 1) { h.done = true; nh.done = true; }
            continue;
          }
          if (a === "D") { wagered += h.bet; wag += h.bet; h.bet *= 2; h.dbl = true; h.cs.push(draw()); h.done = true; continue; }
          if (a === "H") { h.cs.push(draw()); if (handVal(h.cs).bust) h.done = true; continue; }
          h.done = true;
        }
        const alive = hands.filter((h) => !h.sur && !handVal(h.cs).bust);
        if (alive.length) dealerPlay(d, draw);
        const dv = handVal(d);
        let net = 0;
        hands.forEach((h) => {
          if (h.sur) { got += h.bet / 2; net -= h.bet / 2; return; }
          const hv = handVal(h.cs);
          if (hv.bust) { net -= h.bet; return; }
          if (dv.bust || hv.total > dv.total) { got += h.bet * 2; net += h.bet; return; }
          if (hv.total === dv.total) { got += h.bet; return; }
          net -= h.bet;
        });
        decided = net > 0 ? 1 : net < 0 ? -1 : 0;
      }

      /* Royal Chance：勝ったハンドの配当が跳ね上がる（負けたときは掛け金だけ戻る） */
      if (royal) {
        if (decided === 1) got = bet + (got - bet) * ROYAL_MUL;
        else if (decided === -1) got = Math.max(got, bet);
      }
      /* 連勝ボーナス */
      if (decided === 1) {
        streak++;
        got += bet * streakBonusMul(streak);
      } else if (decided === -1) streak = 0;

      /* ★ 本日の倍率は「その手で増えたぶん」にだけ掛ける（カードの規則は変えない） */
      if (got - wag > 0) profit += got - wag;
      if (!raw) got = applyDay(got, wag);
      ret += got;
    }
    return { n, rtp: ret / wagered, profitRate: profit / wagered };
  }
  /* PROFIT_RATE の測りかた（1ベットあたりの平均純益）。
     ここが変わると本日の倍率の出しかたもズレるので、配当や特典をいじったら測り直す。 */
  function mcProfit(n) { return mc(n || 400000, true).profitRate; }

  window.MJBJMath = {
    DECKS, BJ_PAY, H17, STREAK_BONUS, ROYAL_P, ROYAL_MUL, SUITS, JP_RATE_BJ,
    RTP0, PROFIT_RATE, dayWinMul, applyDay,
    newShoe, cardVal, handVal, isBJ, rankName, basic, ACT_NM, dealerPlay, streakBonusMul, mc, mcProfit,
  };
})();


/* ══════════════════════════════════════════════════════════
   表示部
   ══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const M = window.MJ, B = window.MJBJMath;
  const fmt = M.fmt, esc = M.esc;
  const G = "bj";
  let st = null;

  function cardHTML(c, hidden, cls) {
    if (hidden) return '<div class="mj-card back"></div>';
    const red = c.su === 1 || c.su === 2;
    return '<div class="mj-card ' + (red ? "red" : "blk") + (cls ? " " + cls : "") + '">' +
      '<span class="r">' + B.rankName(c.r) + "</span>" +
      '<span class="s">' + B.SUITS[c.su] + "</span></div>";
  }

  function mount(root) {
    st = {
      bet: 500, shoe: B.newShoe(), idx: 0, streak: 0,
      phase: "bet", hands: [], hi: 0, dealer: [], royal: false, hint: true,
      lastNet: 0,
    };
    root.innerHTML =
      '<div class="mjg">' +
        '<div class="mjg-top">' +
          '<button class="x" id="bjBack" aria-label="ロビーへ戻る">‹</button>' +
          '<div class="ttl"><b>Royal Blackjack</b><small>6 DECK / DEALER HITS SOFT 17</small></div>' +
          '<div class="bal"><img src="../XEVA.png" alt=""><span id="bjBal">0</span></div>' +
        "</div>" +
        '<div class="mjg-body" id="bjBody">' +
          '<div class="mj-felt" id="bjFelt">' +
            '<div class="mj-hand"><span class="who">DEALER <span class="sc" id="bjDS">–</span></span>' +
              '<div class="mj-cards" id="bjDC"></div></div>' +
            '<div id="bjRoyal"></div>' +
            '<div class="mj-hand"><span class="who">YOU <span class="sc" id="bjPS">–</span></span>' +
              '<div id="bjPC"></div></div>' +
            '<div class="mj-streak" id="bjStreak"></div>' +
          "</div>" +
          '<div id="bjMsg" class="mj-note" style="text-align:center;margin-top:10px;min-height:34px;font-size:12px"></div>' +
          '<div class="mjp" id="bjBetPanel">' +
            '<div class="hd"><span>ベット額</span><span id="bjBetV">500</span></div>' +
            '<div class="mj-bets" id="bjBets"></div>' +
          "</div>" +
          '<div class="mjp">' +
            '<div class="hd"><span>アシスト</span><span id="bjHintSw" style="cursor:pointer;color:#ffd257">ON</span></div>' +
            '<div class="mj-note">基本戦略にそった<b>おすすめの手</b>をボタンに ★ で示します。' +
            "慣れてきたら切って、自分の判断だけで勝負しよう。</div>" +
          "</div>" +
          '<div class="mjp"><div class="hd"><span>ルールと配当</span><span id="bjRuleT" style="cursor:pointer;color:#ffd257">ひらく ▾</span></div>' +
            '<div id="bjRules" style="display:none"></div></div>' +
          '<div id="bjTut"></div>' +
        "</div>" +
        '<div class="mjg-act" id="bjAct"></div>' +
      "</div>";

    paintBets(); paintBal(); paintStreak(); paintRules(); renderAct();
    document.getElementById("bjBack").onclick = () => { M.SFX.click(); window.mjGo("home"); };
    document.getElementById("bjHintSw").onclick = () => {
      st.hint = !st.hint;
      document.getElementById("bjHintSw").textContent = st.hint ? "ON" : "OFF";
      M.SFX.click(); renderAct();
    };
    document.getElementById("bjRuleT").onclick = () => {
      const el = document.getElementById("bjRules"), t = document.getElementById("bjRuleT");
      const open = el.style.display === "none";
      el.style.display = open ? "block" : "none"; t.textContent = open ? "とじる ▴" : "ひらく ▾"; M.SFX.click();
    };
    msg("ベット額を選んで「配る」を押そう。");
    if (!M.tutorialSeen(G)) { showTutorial(); M.tutorialMark(G); }
    window.addEventListener("mj:wallet", paintBal);
  }

  function draw() {
    if (st.idx >= st.shoe.length - 20) { st.shoe = B.newShoe(); st.idx = 0; M.toast("🃏 シューをシャッフルしました"); }
    return st.shoe[st.idx++];
  }
  function paintBal() { const b = document.getElementById("bjBal"); if (b) b.textContent = fmt(M.xeva()); }
  function msg(t, cls) {
    const el = document.getElementById("bjMsg"); if (!el) return;
    el.innerHTML = t; el.style.color = cls === "win" ? "#9be6c0" : cls === "lose" ? "#ff9db0" : "";
  }
  function paintBets() {
    const box = document.getElementById("bjBets"); if (!box) return;
    box.innerHTML = M.BETS.map((v, i) =>
      '<button class="mj-chip c' + (i + 1) + (v === st.bet ? " on" : "") + '" data-b="' + v + '"' +
      (M.xeva() < v ? " disabled" : "") + ">" + (v >= 1000 ? (v / 1000) + "K" : v) + "</button>").join("");
    box.querySelectorAll("[data-b]").forEach((b) => {
      b.onclick = () => { st.bet = +b.dataset.b; M.SFX.chip(); paintBets(); renderAct(); };
    });
    document.getElementById("bjBetV").textContent = fmt(st.bet);
  }
  function paintStreak() {
    const el = document.getElementById("bjStreak"); if (!el) return;
    const nextAt = B.STREAK_BONUS.find((s) => s.at > st.streak);
    const cur = B.streakBonusMul(st.streak);
    el.innerHTML = '<span class="f">' + Array.from({ length: 7 }, (_, i) =>
      '<i class="' + (i < Math.min(7, st.streak) ? "on" : "") + '"></i>').join("") + "</span>" +
      "<span>" + st.streak + " 連勝" + (cur ? "　ボーナス +" + Math.round(cur * 100) + "%" : "") +
      (nextAt ? "　（あと " + (nextAt.at - st.streak) + " 勝で +" + Math.round(nextAt.mul * 100) + "%）" : "") + "</span>";
  }
  function paintRules() {
    const el = document.getElementById("bjRules"); if (!el) return;
    el.innerHTML = '<div class="mj-note">' +
      "・<b>6デッキ</b>。ディーラーは<b>ソフト17でヒット</b>します。<br>" +
      "・ブラックジャック（最初の2枚で21）は <b>3:2</b>。引き分けは掛け金がもどります。<br>" +
      "・<b>ダブル</b>＝掛け金を倍にして1枚だけ引く。<b>スプリット</b>＝同じ点の2枚を2つの手に分ける（最大3ハンド）。<br>" +
      "・<b>サレンダー</b>＝最初の2枚のときだけ、掛け金の<b>半分</b>を返してもらって降りる。<br>" +
      "・<b>連勝ボーナス</b>：" + B.STREAK_BONUS.map((s) => s.at + "連勝で +" + Math.round(s.mul * 100) + "%").join("／") + "。<br>" +
      "・<b>👑 Royal Chance</b>：まれに発生。勝てば配当が <b>×" + B.ROYAL_MUL + "</b>、" +
      "負けても<b>掛け金はもどる</b>という特別なハンドです。<br>" +
      "・この卓は還元率がもともと高いため、<b>ジャックポットへの積立は 0.25% だけ</b>にして、" +
      "残りを配当・連勝ボーナス・Royal Chance にまわしています。" +
      "基本戦略で打った場合の実測は <b>" + Math.round(B.RTP0 * 10000) / 100 + "%</b>、" +
      "ジャックポットぶんを足しておよそ <b>100%</b>です。<br>" +
      "・<b>" + M.dayRtpInfo().ic + " 本日のテーブルレート ×" + B.dayWinMul().toFixed(3) + "</b>" +
      "（" + M.rtpLine() + "）。<b>勝って増えたぶんにだけ</b>掛かります——" +
      "カードの規則（1:1／3:2／引き分けは返却）はいっさい変えていません。" +
      "ほかの卓と<b>同じだけ</b>日ごとに動かすためのしくみで、平均の日はちょうど ×1.000。" +
      "毎日 0:00 に変わります。<br>" +
      "・ジャックポットは<b>この卓からも当たります</b>。</div>";
  }

  /* ══════════ 進行 ══════════ */
  function deal() {
    if (M.xeva() < st.bet) { msg("XEVA が足りません。", "lose"); return; }
    if (!M.bet(st.bet, G, B.JP_RATE_BJ)) { msg("ベットできませんでした。", "lose"); return; }
    paintBal(); paintBets();
    st.royal = M.chance(B.ROYAL_P);
    st.hands = [{ cs: [draw(), draw()], bet: st.bet, done: false, sur: false, dbl: false }];
    st.dealer = [draw(), draw()];
    st.hi = 0; st.phase = "play";
    renderTable(true);
    M.SFX.deal(); setTimeout(() => M.SFX.deal(), 130);
    document.getElementById("bjRoyal").innerHTML = st.royal
      ? '<div class="mj-royal">👑 <b>ROYAL CHANCE 発生！</b><br>このハンドは、勝てば配当 ×' + B.ROYAL_MUL +
        "・負けても掛け金がもどります</div>" : "";
    if (st.royal) { M.SFX.hot(); M.burst(50, 9); }

    const pBJ = B.isBJ(st.hands[0].cs), dBJ = B.isBJ(st.dealer);
    if (pBJ || dBJ) { setTimeout(() => finish(), 620); return; }
    msg("どう打つ？");
    renderAct();
  }

  function curHand() { return st.hands[st.hi]; }
  function canSplit() {
    const h = curHand(); if (!h || h.cs.length !== 2 || st.hands.length >= 3) return false;
    if (M.xeva() < h.bet) return false;
    return Math.min(10, h.cs[0].r === 1 ? 11 : h.cs[0].r) === Math.min(10, h.cs[1].r === 1 ? 11 : h.cs[1].r);
  }
  function canDouble() { const h = curHand(); return !!h && h.cs.length === 2 && M.xeva() >= h.bet; }
  function canSurrender() { const h = curHand(); return !!h && st.hands.length === 1 && h.cs.length === 2; }

  function renderTable(hideHole) {
    const dc = document.getElementById("bjDC"), pc = document.getElementById("bjPC");
    dc.innerHTML = st.dealer.map((c, i) => cardHTML(c, hideHole && i === 1)).join("");
    const dv = B.handVal(hideHole ? st.dealer.slice(0, 1) : st.dealer);
    document.getElementById("bjDS").textContent = st.dealer.length ? (hideHole ? dv.total + " + ?" : dv.total) : "–";

    if (st.hands.length <= 1) {
      const h = st.hands[0];
      pc.className = "mj-cards";
      pc.innerHTML = h ? h.cs.map((c) => cardHTML(c)).join("") : "";
      const pv = h ? B.handVal(h.cs) : null;
      document.getElementById("bjPS").textContent = pv ? (pv.soft && pv.total <= 21 ? "ソフト " : "") + pv.total : "–";
    } else {
      pc.className = "mj-splitrow";
      pc.innerHTML = st.hands.map((h, i) => {
        const v = B.handVal(h.cs);
        return '<div class="box' + (i === st.hi && st.phase === "play" ? " act" : "") + '">' +
          '<div style="font-size:9.5px;font-weight:900;color:rgba(255,255,255,.7);text-align:center;margin-bottom:3px">' +
          "HAND " + (i + 1) + "　" + v.total + (h.sur ? "（降）" : v.bust ? "（バースト）" : "") + "</div>" +
          '<div class="mj-cards">' + h.cs.map((c) => cardHTML(c)).join("") + "</div></div>";
      }).join("");
      document.getElementById("bjPS").textContent = "分割中";
    }
    paintStreak();
  }

  function renderAct() {
    const box = document.getElementById("bjAct"); if (!box) return;
    if (st.phase !== "play") {
      box.innerHTML = '<button class="mj-btn wide" id="bjDeal">配る　' + fmt(st.bet) + " XEVA</button>";
      const b = document.getElementById("bjDeal");
      b.disabled = M.xeva() < st.bet;
      b.onclick = () => { M.SFX.click(); deal(); };
      return;
    }
    const h = curHand();
    const up = B.cardVal(st.dealer[0]);
    const rec = B.basic(h.cs, up, { canDouble: canDouble(), canSplit: canSplit(), canSurrender: canSurrender() });
    const star = (k) => (st.hint && rec === k ? "★" : "");
    const btns = [];
    btns.push('<button class="mj-btn" data-a="H">' + star("H") + "ヒット</button>");
    btns.push('<button class="mj-btn ghost" data-a="S">' + star("S") + "スタンド</button>");
    if (canDouble()) btns.push('<button class="mj-btn neon" data-a="D">' + star("D") + "ダブル</button>");
    if (canSplit()) btns.push('<button class="mj-btn neon" data-a="P">' + star("P") + "スプリット</button>");
    if (canSurrender()) btns.push('<button class="mj-btn danger" data-a="R">' + star("R") + "降りる</button>");
    box.innerHTML = '<div style="display:grid;grid-template-columns:repeat(' + Math.min(3, btns.length) +
      ',1fr);gap:7px;width:100%">' + btns.join("") + "</div>";
    box.querySelectorAll("[data-a]").forEach((b) => { b.onclick = () => act(b.dataset.a); });
  }

  function act(a) {
    const h = curHand(); if (!h) return;
    M.SFX.click();
    if (a === "R") {
      h.sur = true; h.done = true;
      msg("降りました。掛け金の半分がもどります。");
      nextHand(); return;
    }
    if (a === "P") {
      if (!M.bet(h.bet, G, B.JP_RATE_BJ)) { msg("XEVA が足りません。", "lose"); return; }
      paintBal();
      const c2 = h.cs.pop();
      const nh = { cs: [c2, draw()], bet: h.bet, done: false, sur: false, dbl: false, fromAce: h.cs[0].r === 1 };
      h.cs.push(draw());
      st.hands.splice(st.hi + 1, 0, nh);
      M.SFX.deal();
      if (h.cs[0].r === 1) { h.done = true; nh.done = true; }   // A のスプリットは1枚ずつ
      renderTable(true);
      if (h.done) { nextHand(); return; }
      renderAct(); return;
    }
    if (a === "D") {
      if (!M.bet(h.bet, G, B.JP_RATE_BJ)) { msg("XEVA が足りません。", "lose"); return; }
      paintBal();
      h.bet *= 2; h.dbl = true; h.cs.push(draw()); h.done = true;
      M.SFX.deal(); renderTable(true);
      nextHand(); return;
    }
    if (a === "H") {
      h.cs.push(draw()); M.SFX.deal(); renderTable(true);
      if (B.handVal(h.cs).bust) { h.done = true; msg("バースト！", "lose"); nextHand(); return; }
      renderAct(); return;
    }
    h.done = true; nextHand();
  }

  function nextHand() {
    const i = st.hands.findIndex((x) => !x.done);
    if (i >= 0) { st.hi = i; renderTable(true); renderAct(); msg("HAND " + (i + 1) + " の番です。"); return; }
    finish();
  }

  async function finish() {
    st.phase = "done";
    renderAct();
    const pBJ = st.hands.length === 1 && B.isBJ(st.hands[0].cs);
    const dBJ = B.isBJ(st.dealer);
    const alive = st.hands.filter((h) => !h.sur && !B.handVal(h.cs).bust);

    /* ホールカードを開ける */
    renderTable(false);
    M.SFX.deal();
    await M.sleep(420);

    if (!pBJ && !dBJ && alive.length) {
      /* ディーラーが引く */
      let guard = 0;
      while (guard++ < 12) {
        const v = B.handVal(st.dealer);
        if (v.total > 21) break;
        if (v.total > 17) break;
        if (v.total === 17 && !(B.H17 && v.soft)) break;
        st.dealer.push(draw()); M.SFX.deal(); renderTable(false);
        await M.sleep(430);
      }
    }
    const dv = B.handVal(st.dealer);

    let got = 0, net = 0, lines = [];
    if (pBJ || dBJ) {
      const b = st.hands[0].bet;
      if (pBJ && dBJ) { got = b; net = 0; lines.push("両者ブラックジャック → 引き分け"); }
      else if (pBJ) { got = b * (1 + B.BJ_PAY); net = b * B.BJ_PAY; lines.push("<b>BLACKJACK!</b> 配当 3:2"); }
      else { got = 0; net = -b; lines.push("ディーラーがブラックジャック"); }
    } else {
      st.hands.forEach((h, i) => {
        const tag = st.hands.length > 1 ? "HAND " + (i + 1) + "：" : "";
        if (h.sur) { got += h.bet / 2; net -= h.bet / 2; lines.push(tag + "サレンダー（半分もどる）"); return; }
        const hv = B.handVal(h.cs);
        if (hv.bust) { net -= h.bet; lines.push(tag + "バースト"); return; }
        if (dv.bust) { got += h.bet * 2; net += h.bet; lines.push(tag + "ディーラーがバースト → 勝ち"); return; }
        if (hv.total > dv.total) { got += h.bet * 2; net += h.bet; lines.push(tag + hv.total + " vs " + dv.total + " → 勝ち"); return; }
        if (hv.total === dv.total) { got += h.bet; lines.push(tag + "引き分け"); return; }
        net -= h.bet; lines.push(tag + hv.total + " vs " + dv.total + " → 負け");
      });
    }
    const decided = net > 0 ? 1 : net < 0 ? -1 : 0;

    /* Royal Chance */
    if (st.royal) {
      if (decided === 1) { const extra = (got - st.bet) * (B.ROYAL_MUL - 1); got += extra; lines.push("👑 <b>ROYAL CHANCE</b> 配当 ×" + B.ROYAL_MUL); }
      else if (decided === -1) { got = Math.max(got, st.bet); lines.push("👑 <b>ROYAL CHANCE</b> 掛け金がもどりました"); }
    }
    /* 連勝ボーナス */
    if (decided === 1) {
      st.streak++;
      const m = B.streakBonusMul(st.streak);
      if (m > 0) { got += st.bet * m; lines.push("🔥 <b>" + st.streak + "連勝ボーナス</b> +" + Math.round(m * 100) + "%"); }
    } else if (decided === -1) st.streak = 0;

    /* ★ 本日のテーブルレート：増えたぶんにだけ掛ける（勝ち負けの規則は変えない）。
       ここは<b>いちばん最後</b>。Royal Chance や連勝ボーナスも今日の条件に乗せる。 */
    const totalBet = st.hands.reduce((a, h) => a + h.bet, 0);
    const dayM = B.dayWinMul();
    if (got - totalBet > 0 && Math.abs(dayM - 1) > 0.0005) {
      got = B.applyDay(got, totalBet);
      lines.push((dayM > 1 ? "🌟" : "🌫") + " 本日のテーブルレート ×" + dayM.toFixed(3));
    }

    got = Math.round(got);
    if (got > 0) M.payout(got, G, "Royal Blackjack");
    paintBal(); paintStreak();

    /* プログレッシブ・ジャックポット（この卓からも当たる） */
    const jp = await M.jackpotRoll(st.bet);   /* ★ 共有プールなので通信を待つ */
    if (jp > 0) { M.payout(jp, G, "プログレッシブ・ジャックポット"); paintBal(); await M.jackpotShow(jp); }

    /* 勝ったハンドを光らせる */
    if (decided === 1) document.querySelectorAll("#bjPC .mj-card").forEach((e) => e.classList.add("win"));

    M.round({ game: G, bet: totalBet, win: got, replay: { kind: "bj", p: st.hands.map((h) => h.cs.slice()), d: st.dealer.slice(), streak: st.streak } });

    msg(lines.join("　／　"), decided === 1 ? "win" : decided === -1 ? "lose" : "");
    if (decided === 1) { M.SFX.win(); M.burst(got >= st.bet * 4 ? 110 : 50, 9); }
    else if (decided === -1) M.SFX.lose();

    await M.sleep(700);
    const v = await M.result({
      win: decided === 1,
      head: decided === 1 ? "WIN" : decided === 0 ? "PUSH" : "LOSE",
      amount: got - totalBet,
      emoji: pBJ ? "🂡" : decided === 1 ? "🎉" : decided === 0 ? "🤝" : "💧",
      desc: lines.join("<br>") + (st.streak >= 2 ? "<br>🔥 " + st.streak + " 連勝中" : ""),
    });
    st.phase = "bet";
    renderAct();
    if (v === "again" && M.xeva() >= st.bet) deal();
    else msg("ベット額を選んで「配る」を押そう。");
  }

  function showTutorial() {
    const t = document.getElementById("bjTut");
    t.innerHTML = '<div class="mj-tut">' +
      "<b>はじめての Royal Blackjack</b><br>" +
      "① 21 に近いほうが勝ち。<b>21 を超えたら即負け</b>（バースト）。絵札は 10、A は 1 か 11。<br>" +
      "② <b>ダブル</b>は「勝てる」と踏んだときに掛け金を倍にする一手。<b>サレンダー</b>は「勝ち目が薄い」ときに半分だけ返してもらう一手。" +
      "この2つを使いこなせるかどうかで、成績がはっきり変わります。<br>" +
      "③ 迷ったら<b>アシスト（★印）</b>を見てください。基本戦略という「もっとも損しない打ち方」を教えてくれます。<br>" +
      "④ 連勝するほど<b>ボーナス</b>が上乗せ。まれに <b>👑Royal Chance</b> が発生します。" +
      '<div style="margin-top:8px"><button class="mj-btn sm ghost" id="bjTutX">わかった</button></div></div>';
    document.getElementById("bjTutX").onclick = () => { t.innerHTML = ""; M.SFX.click(); };
  }

  function unmount() { window.removeEventListener("mj:wallet", paintBal); st = null; }

  window.MJBJ = { mount, unmount, id: G, nm: "Royal Blackjack" };
})();
