/* ══════════════════════════════════════════════════════════════
   Magi: Boccia Rush — ゲームの中身（コート・物理・ルール・得点・CPU）
   ──────────────────────────────────────────────────────────────
   ★ 3つに分けてあります
       mbr-core.js … ここ。<b>計算だけ</b>。画面には一切さわらない。
       mbr-ui.js   … 画面（描画・タッチ・遷移）
       mbr-online.js … 部屋番号のオンライン対戦

   ★ 単位は<b>すべてメートルと秒</b>。画面のピクセルへの変換は mbr-ui.js だけが行う。
     こうしておくと「本物のボッチャの寸法」をそのまま書けて、
     端末の画面サイズが変わっても competition のルールが崩れない。

   ★ 本物のボッチャに合わせているところ
     ・コートは <b>12.5m × 6m</b>。Vライン 3m、クロス（センターマーク）5m。
     ・ジャックボール（白）を先攻が投げ、Vラインを越えなければ投げ直し。
     ・以後は<b>ジャックから遠いほう</b>が投げる。
     ・エンド終了時、<b>いちばん近い側</b>が、相手の最短より近いボールの数だけ得点。
     ・コートの外に出たボールは<b>デッドボール</b>（取り除かれる）。
   ★ 遊びやすさのために変えているところ（キャラクターモードのみ）
     ・ボールの<b>見た目と当たり判定</b>を実物よりひとまわり大きくしてある
       （実物は直径約8.6cm。スマホの画面では小さすぎて狙えないため）。
     ・壁（バンパー）を置いて<b>バンクショット</b>を成立させている。
       <b>競技モード</b>では壁を外し、外へ出たボールはデッドボールになる。
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  /* ══════════ ① コートと物理の定数 ══════════ */
  const COURT = {
    W: 6.0,          // 幅（m）
    L: 12.5,         // 長さ（m）
    VLINE: 3.0,      // Vライン（ジャックはここを越えないと無効）
    CROSS: 5.0,      // クロス（センターマーク）
    BOXD: 2.5,       // 投球ボックスの奥行き
    BOXES: 6,        // 投球ボックスの数
  };
  /* ボールの大きさ。REAL は本物、PLAY は遊ぶとき（見やすさのために大きい） */
  const BALL_R_REAL = 0.043;
  const BALL_R_PLAY = 0.135;
  /* 摩擦の減速（m/s²）。ボールが進む距離は v² / (2a)。
     ★★ 2026-09-09 ご指定で<b>少しだけ減速を強く</b>した（3.4 → 3.8）。
       同じ強さで転がる距離はおよそ <b>12% 短く</b>なる（8.2m/s で 9.9m → 8.8m）。
     ★ CPU の強さの見積も、画面の飛距離の目安もこの定数を見ているので、
       ここだけ直せば全部ついてくる（mbr-ui.js は B.FRICTION_A を参照）。 */
  const FRICTION_A = 3.8;
  const RESTITUTION = 0.86;   // ボールどうしの跳ね返り
  const WALL_REST = 0.62;     // 壁の跳ね返り（キャラクターモードのみ）
  const V_MAX = 9.6;          // いちばん強い投球（m/s）
  const V_MIN = 1.2;
  const STOP_V = 0.045;       // これより遅くなったら止まったとみなす
  const DT = 1 / 120;         // 物理の1ステップ（秒）。端末が変わっても同じ結果になる

  /* ══════════ ② 乱数（シードつき）══════════
     オンラインでも同じ結果になるよう、乱数は必ずこれを通す。 */
  function mkRand(seed) {
    let s = (seed >>> 0) || 88675123;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }

  /* ══════════ ③ キャラクター ══════════
     ★ ガチャもキャラも XEVARION（MagiBurst）と共通なので、ここでは<b>作らない</b>。
       mb-core.js の CHARS から<b>式で</b>ボッチャ用の能力に写す。
       こうしておくと、キャラが増えても何も足さなくてよい。 */
  const TYPES = {
    power:     { ja: "POWER",     nm: "パワー",     c: "#ff4a5c", d: { ja: "強いショットが得意。相手のボールを弾き飛ばす。", en: "Strong shots; blasts opposing balls away." } },
    technique: { ja: "TECHNIQUE", nm: "テクニック", c: "#3fa9ff", d: { ja: "精密な投球が得意。狙ったところへ届きやすい。", en: "Precise throws; lands where you aim." } },
    control:   { ja: "CONTROL",   nm: "コントロール", c: "#2fd18c", d: { ja: "狙った位置で止めやすい。ジャックのそばに置ける。", en: "Stops where you want it; hugs the jack." } },
    defense:   { ja: "DEFENSE",   nm: "ディフェンス", c: "#8e6bff", d: { ja: "味方のボールを守るのが得意。押し出しに強い。", en: "Guards your own balls; hard to push out." } },
    jack:      { ja: "JACK",      nm: "ジャック",   c: "#ffd257", d: { ja: "ジャックボールを動かす戦術に特化。", en: "Specialises in moving the jack." } },
    support:   { ja: "SUPPORT",   nm: "サポート",   c: "#ff8ab5", d: { ja: "味方全体を補助する。チーム戦で光る。", en: "Buffs the whole team; shines in team play." } },
  };
  /* 能力は 0〜100。★ 差が大きくなりすぎないよう <b>40〜92</b> の帯におさめる。
     ご指定「レアリティだけで勝敗が決まらない」を守るための帯です。 */
  function statFrom(v, lo, hi) {
    const t = Math.max(0, Math.min(1, (v - lo) / (hi - lo)));
    return Math.round(40 + t * 52);
  }
  /* mb-core の CHARS からボッチャ用の能力を作る（読めないときは無し） */
  function buildRoster() {
    const out = [];
    /* ★★ mb-core.js は <b>const</b> で CHARS を宣言しているので、
       <b>window.CHARS では取れない</b>（MagiTier でも一度つまずいたところ）。
       素の名前で受け取ること。 */
    let CH = null;
    try { CH = (typeof CHARS !== "undefined") ? CHARS : (window.CHARS || null); } catch (e) { CH = null; }
    if (!CH) return out;
    const ids = Object.keys(CH);
    ids.forEach((id) => {
      const c = CH[id];
      if (!c || !c.nm) return;
      const hp = (c.hp && c.hp[1]) || 3000;
      const atk = (c.atk && c.atk[1]) || 3000;
      const spd = (c.spd && c.spd[1]) || 300;
      /* 型はキャラの撃種・戦型からゆるく決める（同じ顔ぶれが並ばないように） */
      const kind = (c.type || "");
      let ty = "control";
      if (/砲撃|アタッカー/.test(kind)) ty = "power";
      else if (/技巧/.test(kind)) ty = "technique";
      else if (/支援/.test(kind)) ty = "support";
      else if (/バランス/.test(kind)) ty = "control";
      else if (/スピード/.test(kind)) ty = "technique";
      if (c.shot === "pierce" && ty === "control") ty = "jack";
      if (/耐久|受け/.test(kind)) ty = "defense";
      const st = {
        power:     statFrom(atk, 2000, 14500),
        control:   statFrom(hp, 700, 8200),
        friction:  statFrom(9000 - Math.min(9000, spd * 18), 3000, 8600),
        hit:       statFrom(atk * 0.7 + spd * 8, 3000, 13000),
        jack:      statFrom(spd, 240, 560),
        technique: statFrom(spd * 12 + hp * 0.3, 4000, 10500),
        support:   statFrom(hp * 0.6 + atk * 0.2, 2000, 7000),
      };
      /* 型のぶんだけ、その能力を少し伸ばす（±の合計は 0 に近づける） */
      const BOOST = { power: "power", technique: "technique", control: "control",
                      defense: "friction", jack: "jack", support: "support" };
      const k = BOOST[ty];
      st[k] = Math.min(96, st[k] + 8);
      out.push({
        id, nm: c.nm, th: c.th || "", img: c.img || "", el: c.el || "fire",
        star5: !!c.star5, type: ty, st,
        rarity: c.star5 ? "SSR" : "SR",
        skill: SKILL_OF[ty],
        ability: ABIL_OF[ty],
      });
    });
    /* 並びは MagiBurst の図鑑順（CHAR_IDS）にそろえる */
    try {
      const NO = (typeof CHAR_NO !== "undefined") ? CHAR_NO : (window.CHAR_NO || null);
      if (NO) out.sort((a, b) => (NO[a.id] || 999) - (NO[b.id] || 999));
    } catch (e) {}
    return out;
  }
  /* 型ごとのアクティブスキル（試合中に1回使える）。
     ★ 強すぎるとボッチャの読み合いが壊れるので、<b>どれも「1投だけ」</b>にしてある。 */
  const SKILLS = {
    perfectline: { nm: { ja: "パーフェクト・ライン", en: "Perfect Line" },
      d: { ja: "次の1投だけ、<b>軌道予測が最後まで</b>出る（止まる位置まで見える）。", en: "Full trajectory preview for your next throw." } },
    powerburst: { nm: { ja: "パワー・バースト", en: "Power Burst" },
      d: { ja: "次の1投だけ、<b>最大の強さが 15% 上がる</b>。", en: "+15% max power on your next throw." } },
    softlanding: { nm: { ja: "ソフト・ランディング", en: "Soft Landing" },
      d: { ja: "次の1投だけ、<b>止まりやすくなる</b>（減速 +35%）。", en: "Your next ball stops 35% sooner." } },
    jackshift: { nm: { ja: "ジャック・シフト", en: "Jack Shift" },
      d: { ja: "次の1投だけ、<b>ジャックに当てたときの押し出しが 1.5倍</b>。", en: "Your next hit moves the jack 1.5× further." } },
    guardian: { nm: { ja: "ガーディアン", en: "Guardian" },
      d: { ja: "このエンドのあいだ、<b>味方のボールが押されにくくなる</b>（受ける力 -30%）。", en: "Your balls resist being pushed for this end (-30%)." } },
    rally: { nm: { ja: "ラリー・コール", en: "Rally Call" },
      d: { ja: "このエンドのあいだ、<b>味方全員のコントロールが +8</b>。", en: "+8 Control for your whole team this end." } },
  };
  const SKILL_OF = { power: "powerburst", technique: "perfectline", control: "softlanding",
                     defense: "guardian", jack: "jackshift", support: "rally" };
  const ABILS = {
    precisionline: { nm: { ja: "プレシジョン・ライン", en: "Precision Line" },
      d: { ja: "狙いのブレが小さくなる（常時）。", en: "Reduces aim scatter (always on)." } },
    powerdrive: { nm: { ja: "パワー・ドライブ", en: "Power Drive" },
      d: { ja: "強いショットの威力が上がる（常時）。", en: "Stronger hard shots (always on)." } },
    softtouch: { nm: { ja: "ソフト・タッチ", en: "Soft Touch" },
      d: { ja: "弱い投球の止まりやすさが上がる（常時）。", en: "Weak throws stop more reliably." } },
    jackcontrol: { nm: { ja: "ジャック・コントロール", en: "Jack Control" },
      d: { ja: "ジャックに当てたときの影響が強くなる（常時）。", en: "Bigger effect when you hit the jack." } },
    guardmaster: { nm: { ja: "ガード・マスター", en: "Guard Master" },
      d: { ja: "味方のボールを押す力が上がる（常時）。", en: "Pushes your own balls further." } },
    hitmaster: { nm: { ja: "ヒット・マスター", en: "Hit Master" },
      d: { ja: "相手のボールへの当たりが強くなる（常時）。", en: "Hits opposing balls harder." } },
  };
  const ABIL_OF = { power: "powerdrive", technique: "precisionline", control: "softtouch",
                    defense: "guardmaster", jack: "jackcontrol", support: "hitmaster" };

  /* ══════════ ④ 試合の状態 ══════════ */
  /*  side: "red" / "blue"
      balls: [{ id, side, x, y, vx, vy, r, dead, jack }]
      ends:  何エンド行うか（個人・ペア 4／チーム 6）
   */
  function newMatch(cfg) {
    const c = Object.assign({
      mode: "cpu",          // cpu / local / online / practice
      ends: 6,
      perSide: 6,           // 1エンドに投げるボールの数（片側）
      players: { red: [], blue: [] },   // [{name, charId, cpu, ai}]
      competition: false,   // 競技モード（キャラ能力を弱め、壁も無し）
      walls: true,          // 壁（バンクショット）
      first: "red",
      seed: (Date.now() & 0xffffffff) >>> 0,
      difficulty: "normal",
      guide: "normal",      // full / normal / minimal / off（動的ルール説明）
    }, cfg || {});
    if (c.competition) c.walls = false;
    const M = {
      cfg: c,
      rand: mkRand(c.seed),
      end: 1,
      score: { red: 0, blue: 0 },
      endScores: [],        // [{end, side, pts, detail}]
      balls: [],
      left: { red: c.perSide, blue: c.perSide },
      turn: c.first,
      phase: "jack",        // jack → play → end → over
      first: c.first,
      log: [],              // リプレイ（投球の記録）
      hints: [],            // 動的ルール説明のキュー
      shownHints: {},       // 一度出したものは出しすぎない
      skillUsed: { red: false, blue: false },
      buffs: { red: {}, blue: {} },
      stats: { red: blankStat(), blue: blankStat() },
      idx: { red: 0, blue: 0 },   // チーム戦で「次に投げる人」
    };
    pushHint(M, "jackfirst");
    return M;
  }
  function blankStat() {
    return { throws: 0, hits: 0, jackHits: 0, sumDist: 0, nDist: 0, best: 99, dead: 0 };
  }
  const SIDES = ["red", "blue"];
  const other = (s) => (s === "red" ? "blue" : "red");

  /* ══════════ ⑤ 物理 ══════════ */
  function ballR(M) { return M.cfg.competition ? BALL_R_PLAY * 0.78 : BALL_R_PLAY; }

  /* いま盤面に生きているボール */
  function live(M) { return M.balls.filter((b) => !b.dead); }
  function jackOf(M) { return M.balls.find((b) => b.jack && !b.dead) || null; }

  /* 1ステップ進める。動いているボールが無ければ false を返す。 */
  function step(M) {
    const bs = live(M);
    let moving = false;
    /* ① 速度と位置 */
    bs.forEach((b) => {
      const v = Math.hypot(b.vx, b.vy);
      if (v <= STOP_V) { b.vx = 0; b.vy = 0; return; }
      moving = true;
      const a = FRICTION_A * (b.fric || 1);
      const nv = Math.max(0, v - a * DT);
      const k = nv / v;
      b.vx *= k; b.vy *= k;
      b.x += b.vx * DT;
      b.y += b.vy * DT;
    });
    if (!moving) return false;
    /* ② ボールどうしの衝突 */
    const r = ballR(M);
    for (let i = 0; i < bs.length; i++) {
      for (let j = i + 1; j < bs.length; j++) {
        const a = bs[i], b = bs[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        const min = r * 2;
        if (d >= min || d === 0) continue;
        const nx = dx / d, ny = dy / d;
        /* 重なりを押し出す */
        const push = (min - d) / 2 + 1e-4;
        a.x -= nx * push; a.y -= ny * push;
        b.x += nx * push; b.y += ny * push;
        /* 速度の交換（同じ重さ・反発 RESTITUTION） */
        const rvx = b.vx - a.vx, rvy = b.vy - a.vy;
        const vn = rvx * nx + rvy * ny;
        if (vn > 0) continue;                 /* 離れていくならなにもしない */
        /* キャラの効果：当てた側の HIT／ジャックへの押し出し／守り */
        let e = RESTITUTION;
        const hitter = a.moved ? a : (b.moved ? b : null);
        if (hitter) {
          const tgt = hitter === a ? b : a;
          if (tgt.jack) e *= (hitter.jackMul || 1);
          else if (tgt.side === hitter.side) e *= (hitter.guardMul || 1);
          else e *= (hitter.hitMul || 1);
          if (tgt.side && tgt.side !== hitter.side && M.buffs[tgt.side].guardian) e *= 0.70;
          if (tgt.jack) M.stats[hitter.side || "red"].jackHits++;
          else if (tgt.side !== hitter.side) M.stats[hitter.side || "red"].hits++;
        }
        const imp = -(1 + e) * vn / 2;
        a.vx -= imp * nx; a.vy -= imp * ny;
        b.vx += imp * nx; b.vy += imp * ny;
      }
    }
    /* ③ コートの外 */
    bs.forEach((b) => {
      const lo = r, hiX = COURT.W - r, hiY = COURT.L - r;
      if (M.cfg.walls) {
        if (b.x < lo) { b.x = lo; b.vx = Math.abs(b.vx) * WALL_REST; b.banked = 1; }
        if (b.x > hiX) { b.x = hiX; b.vx = -Math.abs(b.vx) * WALL_REST; b.banked = 1; }
        if (b.y < lo) { b.y = lo; b.vy = Math.abs(b.vy) * WALL_REST; b.banked = 1; }
        if (b.y > hiY) { b.y = hiY; b.vy = -Math.abs(b.vy) * WALL_REST; b.banked = 1; }
      } else if (b.x < 0 || b.x > COURT.W || b.y < 0 || b.y > COURT.L) {
        b.dead = 1; b.vx = 0; b.vy = 0;
        if (b.side) M.stats[b.side].dead++;
      }
    });
    return true;
  }
  /* 止まるまで一気に進める（CPU の読みとリプレイで使う） */
  function settle(M, maxSteps) {
    let n = 0;
    const cap = maxSteps || 3600;
    while (step(M) && n < cap) n++;
    live(M).forEach((b) => { b.moved = 0; });
    return n;
  }

  /* ══════════ ⑥ 投球 ══════════ */
  /* 投球ボックスの中央（side ごと）。ボッチャは両側とも<b>同じ側</b>の投球エリアから投げる。 */
  function throwSpot(M, side, slot) {
    const n = COURT.BOXES;
    const i = (slot == null ? (side === "red" ? 2 : 3) : slot);
    const w = COURT.W / n;
    return { x: w * (i + 0.5), y: COURT.BOXD * 0.45 };
  }
  /* キャラの能力を、その1投の物理に落としこむ */
  function shotMods(M, side, ch) {
    const comp = M.cfg.competition;
    const st = ch ? ch.st : { power: 66, control: 66, friction: 66, hit: 66, jack: 66, technique: 66, support: 66 };
    /* 競技モードでは能力の効きを 1/3 にする（ご指定：レアリティで勝敗が決まらないように） */
    const k = comp ? 0.34 : 1;
    const n = (v) => (v - 66) / 100 * k;   // -0.26 〜 +0.26 くらい
    const b = M.buffs[side] || {};
    const ctlBonus = b.rally ? 8 : 0;
    return {
      vmax: V_MAX * (1 + n(st.power) * 0.22) * (b.powerburst ? 1.15 : 1),
      spread: Math.max(0.004, 0.030 * (1 - n(st.technique + ctlBonus) * 1.7)),
      fric: 1 + n(st.friction) * 0.30 + (b.softlanding ? 0.35 : 0),
      hitMul: 1 + n(st.hit) * 0.22,
      jackMul: (1 + n(st.jack) * 0.22) * (b.jackshift ? 1.5 : 1),
      guardMul: 1 + n(st.control) * 0.16,
      preview: b.perfectline ? 1 : Math.min(1, 0.45 + n(st.technique) * 1.6),
    };
  }
  /* 投げる。angle（ラジアン・コートの奥へが -π/2 ではなく +y 方向）と power（0〜1）。 */
  function throwBall(M, opt) {
    const side = opt.side;
    const isJack = !!opt.jack;
    const ch = opt.char || null;
    const mod = shotMods(M, side, ch);
    const spot = opt.from || throwSpot(M, side, opt.slot);
    /* 狙いのブレ。CONTROL/TECHNIQUE が高いほど小さい。 */
    const jitter = (M.rand() - 0.5) * 2 * mod.spread * (opt.noJitter ? 0 : 1);
    const ang = opt.angle + jitter;
    const p = Math.max(0, Math.min(1, opt.power));
    const v = V_MIN + (mod.vmax - V_MIN) * p;
    const b = {
      id: "b" + (M.balls.length + 1) + "_" + Math.floor(M.rand() * 1e6),
      side: isJack ? null : side, jack: isJack,
      x: spot.x, y: spot.y,
      vx: Math.cos(ang) * v, vy: Math.sin(ang) * v,
      fric: mod.fric, hitMul: mod.hitMul, jackMul: mod.jackMul, guardMul: mod.guardMul,
      moved: 1, dead: 0, banked: 0,
      by: opt.playerIdx == null ? 0 : opt.playerIdx,
      charId: ch ? ch.id : "",
    };
    M.balls.push(b);
    M.log.push({ end: M.end, side, jack: isJack, angle: opt.angle, power: p,
                 slot: opt.slot == null ? null : opt.slot, charId: b.charId });
    if (!isJack) {
      M.left[side]--;
      M.stats[side].throws++;
    }
    return b;
  }

  /* ══════════ ⑦ ルールの進行 ══════════ */
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  /* いま「ジャックにいちばん近い」側 */
  function closestSide(M) {
    const j = jackOf(M); if (!j) return null;
    let best = null, bd = 1e9;
    live(M).forEach((b) => {
      if (b.jack) return;
      const d = dist(b, j);
      if (d < bd) { bd = d; best = b.side; }
    });
    return best;
  }
  /* ジャックが有効か（Vラインを越えていて、コートの中） */
  function jackValid(M) {
    const j = jackOf(M);
    if (!j) return false;
    return j.y >= COURT.VLINE && j.x > 0 && j.x < COURT.W && j.y < COURT.L;
  }
  /* 次に投げる側を決める（ボッチャの基本ルール） */
  function nextTurn(M) {
    const j = jackOf(M);
    if (!j) return M.first;
    const anyRed = live(M).some((b) => b.side === "red");
    const anyBlue = live(M).some((b) => b.side === "blue");
    /* まだ片方しか投げていないなら、投げていないほう */
    if (!anyRed && M.left.red > 0) return "red";
    if (!anyBlue && M.left.blue > 0) return "blue";
    const cs = closestSide(M);
    const far = cs ? other(cs) : M.first;
    /* 玉が無い側は投げられない */
    if (M.left[far] > 0) return far;
    if (M.left[other(far)] > 0) return other(far);
    return null;      // 両方とも投げ終わり＝エンド終了
  }
  /* エンドの得点を計算する（説明つき） */
  function scoreEnd(M) {
    const j = jackOf(M);
    const list = live(M).filter((b) => !b.jack)
      .map((b) => ({ b, d: j ? dist(b, j) : 99 }))
      .sort((a, b) => a.d - b.d);
    if (!j || !list.length) return { side: null, pts: 0, rows: list };
    const win = list[0].b.side;
    const oppBest = list.find((x) => x.b.side !== win);
    const limit = oppBest ? oppBest.d : 1e9;
    let pts = 0;
    list.forEach((x) => { if (x.b.side === win && x.d < limit) pts++; });
    return { side: win, pts, rows: list, limit: oppBest ? oppBest.d : null };
  }
  /* 得点の「読みあげ文」を作る（ご指定：点数だけ出さない） */
  function scoreText(M, res, lang) {
    const en = lang === "en";
    if (!res.side) return en ? "No balls in play — no score." : "コートに残ったボールがありません。得点なしです。";
    const mine = res.rows.filter((x) => x.b.side === res.side && (res.limit == null || x.d < res.limit));
    const nm = res.side === "red" ? "RED" : "BLUE";
    const cm = (d) => Math.round(d * 100) + "cm";
    const list = mine.map((x) => cm(x.d)).join(en ? " and " : "と");
    if (res.limit == null) {
      return en ? nm + " has the only balls in play — " + res.pts + " point(s)."
                : nm + " のボールだけがコートに残っているため、" + res.pts + "点を獲得。";
    }
    return en
      ? nm + "'s " + list + " are closer to the jack than " + cm(res.limit)
        + " (" + (res.side === "red" ? "BLUE" : "RED") + "'s nearest), so " + nm + " scores " + res.pts + "."
      : nm + "の" + list + "が、" + (res.side === "red" ? "BLUE" : "RED") + "の最短 " + cm(res.limit)
        + " よりジャックに近いため、" + nm + "が" + res.pts + "点獲得";
  }
  /* エンドを閉じて次へ */
  function closeEnd(M) {
    const res = scoreEnd(M);
    if (res.side) M.score[res.side] += res.pts;
    M.endScores.push({ end: M.end, side: res.side, pts: res.pts, res });
    /* 平均ジャック距離などの記録 */
    const j = jackOf(M);
    if (j) {
      live(M).forEach((b) => {
        if (b.jack || !b.side) return;
        const d = dist(b, j);
        M.stats[b.side].sumDist += d; M.stats[b.side].nDist++;
        if (d < M.stats[b.side].best) M.stats[b.side].best = d;
      });
    }
    if (M.end >= M.cfg.ends) {
      /* 同点ならタイブレークのエンドを足す（本物と同じ） */
      if (M.score.red === M.score.blue) {
        M.cfg.ends++;
        pushHint(M, "tiebreak");
      } else {
        M.phase = "over";
        return res;
      }
    }
    M.end++;
    /* 先攻はエンドごとに入れかわる */
    M.first = other(M.first);
    M.balls = [];
    M.left = { red: M.cfg.perSide, blue: M.cfg.perSide };
    M.turn = M.first;
    M.phase = "jack";
    M.buffs = { red: {}, blue: {} };
    M.idx = { red: 0, blue: 0 };
    pushHint(M, "endstart");
    return res;
  }

  /* ══════════ ⑧ 動的ルール説明（ご指定）══════════
     ★ 出すのは<b>いまの盤面で必要なものだけ</b>。
       同じ説明は覚えるまでのあいだだけ出し、慣れたら出さない。 */
  const HINTS = {
    jackfirst: {
      ja: "白いボールが<b>ジャックボール</b>です。これを目標に、自分のボールを近づけます。",
      en: "The white ball is the <b>jack</b>. Get your balls as close to it as you can.",
      level: 1,
    },
    jackline: {
      ja: "ジャックは<b>Vラインを越えないと無効</b>です。もう少し強く投げましょう。",
      en: "The jack must pass the <b>V line</b>. Throw a little harder.",
      level: 1,
    },
    firstcolor: {
      ja: "ジャックを投げた側が、<b>最初の色ボール</b>を投げます。",
      en: "The side that threw the jack throws the <b>first coloured ball</b>.",
      level: 1,
    },
    farthrows: {
      ja: "ここから先は、<b>ジャックから遠いほうのチーム</b>が投げます。",
      en: "From now on, the side <b>farther</b> from the jack throws.",
      level: 1,
    },
    canhit: {
      ja: "相手のボールが近いときは、<b>ぶつけて遠ざける</b>こともできます。",
      en: "You can also <b>knock the opponent's ball away</b>.",
      level: 2,
    },
    tooweak: {
      ja: "ジャックまで届いていません。<b>もう少し強く</b>引いてみましょう。",
      en: "That fell short. Try pulling <b>a little harder</b>.",
      level: 2,
    },
    toostrong: {
      ja: "行きすぎました。<b>もう少し弱く</b>投げるとジャックの近くで止まります。",
      en: "Too strong. Throw <b>a little softer</b> to stop near the jack.",
      level: 2,
    },
    guarding: {
      ja: "いまの配置は<b>ジャックを守る形</b>になっています。相手は入りにくくなります。",
      en: "Your balls are <b>guarding the jack</b> — the opponent will struggle to get in.",
      level: 3,
    },
    scoring: {
      ja: "エンドが終わりました。<b>ジャックにいちばん近いチーム</b>が、相手の最短より近いボールの数だけ得点します。",
      en: "End over. The side <b>closest to the jack</b> scores one point per ball closer than the opponent's nearest.",
      level: 1,
    },
    deadball: {
      ja: "コートの外に出たボールは<b>デッドボール</b>になり、取り除かれます。",
      en: "A ball that leaves the court is <b>dead</b> and is removed.",
      level: 2,
    },
    endstart: {
      ja: "新しいエンドです。<b>先攻が入れかわります</b>。",
      en: "New end — the <b>starting side swaps</b>.",
      level: 2,
    },
    tiebreak: {
      ja: "同点のため<b>タイブレークのエンド</b>を行います。",
      en: "Scores are level — playing a <b>tie-break end</b>.",
      level: 1,
    },
    skill: {
      ja: "キャラクターの<b>スキル</b>は1試合に1回だけ。ここぞという1投で使いましょう。",
      en: "Your character's <b>skill</b> can be used once per match. Save it for the throw that matters.",
      level: 3,
    },
  };
  const GUIDE_LEVEL = { full: 3, normal: 2, minimal: 1, off: 0 };
  function pushHint(M, key, force) {
    const lv = GUIDE_LEVEL[M.cfg.guide] == null ? 2 : GUIDE_LEVEL[M.cfg.guide];
    const h = HINTS[key];
    if (!h || !lv) return;
    if (h.level > lv) return;
    if (!force && M.shownHints[key] >= (lv >= 3 ? 3 : 1)) return;
    M.shownHints[key] = (M.shownHints[key] || 0) + 1;
    M.hints.push(key);
  }
  function takeHint(M) { return M.hints.length ? HINTS[M.hints.shift()] : null; }

  /* ══════════ ⑨ CPU ══════════
     ★ 「最適な位置へ投げるだけ」にしない（ご指定）。
       難易度ごとに<b>読む深さ</b>と<b>手ぶれ</b>を変える。
       EASY   … だいたいの方向へ。強さもばらつく。
       NORMAL … ジャックとの距離だけを見る。
       HARD   … 相手ボールへのヒットも候補に入れる。
       EXPERT … ジャック移動・防御・攻撃を混ぜて、いちばん点になる手をえらぶ。
       MASTER … 上に加えて<b>相手の返しの1手</b>まで読む。 */
  const AI_LV = {
    easy:   { samples: 18,  noise: 0.085, look: 0, greed: 0.35 },
    normal: { samples: 44,  noise: 0.045, look: 0, greed: 0.7 },
    hard:   { samples: 80,  noise: 0.026, look: 0, greed: 0.9 },
    expert: { samples: 140, noise: 0.015, look: 0, greed: 1.0 },
    master: { samples: 190, noise: 0.008, look: 1, greed: 1.0 },
  };
  /* 盤面の点（side から見て良いほど高い） */
  function evalBoard(M, side) {
    const j = jackOf(M);
    if (!j) return -999;
    const mine = [], opp = [];
    live(M).forEach((b) => {
      if (b.jack) return;
      (b.side === side ? mine : opp).push(dist(b, j));
    });
    mine.sort((a, b) => a - b); opp.sort((a, b) => a - b);
    const mb = mine.length ? mine[0] : 99;
    const ob = opp.length ? opp[0] : 99;
    /* いま終わったら何点入るか */
    let pts = 0;
    if (mb < ob) mine.forEach((d) => { if (d < ob) pts++; });
    else if (ob < mb) opp.forEach((d) => { if (d < mb) pts--; });
    /* 距離そのものも少しだけ見る（同じ点なら、より近いほうを選ぶ） */
    return pts * 10 + (ob - mb) * 3 - mb * 0.5;
  }
  /* 盤面のコピー（読みのため） */
  function cloneM(M) {
    return {
      cfg: M.cfg, rand: mkRand(1234567), end: M.end, score: M.score,
      balls: M.balls.map((b) => Object.assign({}, b)),
      left: Object.assign({}, M.left), turn: M.turn, phase: M.phase, first: M.first,
      log: [], hints: [], shownHints: {}, endScores: [],
      skillUsed: M.skillUsed, buffs: { red: {}, blue: {} },
      stats: { red: blankStat(), blue: blankStat() }, idx: M.idx,
    };
  }
  /* CPU の1手をえらぶ。{angle, power} を返す。 */
  function cpuPick(M, side, ch, level) {
    const L = AI_LV[level] || AI_LV.normal;
    const spot = throwSpot(M, side, cpuSlot(M, side));
    const j = jackOf(M);
    let best = null, bestS = -1e9;
    for (let i = 0; i < L.samples; i++) {
      let ang, pw;
      if (j) {
        /* ジャック（またはねらい目）へ向かう角度をもとに、少しずつずらして試す */
        const tgt = pickTarget(M, side, i, L);
        const dx = tgt.x - spot.x, dy = tgt.y - spot.y;
        const d = Math.hypot(dx, dy);
        ang = Math.atan2(dy, dx) + (M.rand() - 0.5) * 0.34;
        /* 距離 d を進む速度 v = sqrt(2 a d)。それを 0〜1 の強さへ写す。 */
        const v = Math.sqrt(2 * FRICTION_A * Math.max(0.4, d)) * (0.94 + M.rand() * 0.16);
        pw = (v - V_MIN) / (V_MAX - V_MIN);
      } else {
        ang = Math.PI / 2 + (M.rand() - 0.5) * 0.5;
        pw = 0.45 + M.rand() * 0.3;
      }
      pw = Math.max(0.05, Math.min(1, pw));
      const sim = cloneM(M);
      throwBall(sim, { side, angle: ang, power: pw, char: ch, noJitter: true, from: spot });
      settle(sim, 2400);
      let s = evalBoard(sim, side);
      /* MASTER は「相手の返し」まで読む */
      if (L.look > 0 && sim.left[other(side)] > 0) {
        const rep = cpuPick2(sim, other(side), null, 22);
        if (rep) {
          throwBall(sim, { side: other(side), angle: rep.angle, power: rep.power, noJitter: true });
          settle(sim, 2400);
          s = s * 0.55 + evalBoard(sim, side) * 0.45;
        }
      }
      s += (M.rand() - 0.5) * (1 - L.greed) * 12;
      if (s > bestS) { bestS = s; best = { angle: ang, power: pw }; }
    }
    if (!best) best = { angle: Math.PI / 2, power: 0.5 };
    /* 難易度に応じた手ぶれ */
    best.angle += (M.rand() - 0.5) * L.noise * 2;
    best.power = Math.max(0.05, Math.min(1, best.power + (M.rand() - 0.5) * L.noise));
    return best;
  }
  /* 読みの中で使う軽い版（相手の返し用） */
  function cpuPick2(M, side, ch, n) {
    const spot = throwSpot(M, side, 2);
    const j = jackOf(M); if (!j) return null;
    let best = null, bestS = -1e9;
    for (let i = 0; i < n; i++) {
      const dx = j.x - spot.x, dy = j.y - spot.y, d = Math.hypot(dx, dy);
      const ang = Math.atan2(dy, dx) + (M.rand() - 0.5) * 0.3;
      const v = Math.sqrt(2 * FRICTION_A * Math.max(0.4, d)) * (0.95 + M.rand() * 0.12);
      const pw = Math.max(0.05, Math.min(1, (v - V_MIN) / (V_MAX - V_MIN)));
      const sim = cloneM(M);
      throwBall(sim, { side, angle: ang, power: pw, char: ch, noJitter: true, from: spot });
      settle(sim, 2000);
      const s = evalBoard(sim, side);
      if (s > bestS) { bestS = s; best = { angle: ang, power: pw }; }
    }
    return best;
  }
  /* 何をねらうか（難易度が上がるほど選択肢が増える） */
  function pickTarget(M, side, i, L) {
    const j = jackOf(M);
    const opp = live(M).filter((b) => b.side === other(side));
    const mine = live(M).filter((b) => b.side === side);
    const r = M.rand();
    if (L.samples <= 20) return j;                       /* EASY はジャックだけ */
    if (L.samples <= 50) return j;                       /* NORMAL も基本ジャック */
    /* HARD 以上：相手のボールを弾く／ジャックを動かす／自分のボールの手前に置く */
    if (opp.length && r < 0.34) {
      const t = opp[Math.floor(M.rand() * opp.length)];
      return { x: t.x, y: t.y };
    }
    if (L.samples >= 140 && r < 0.50 && j) {
      /* ジャックを自分の陣に引きよせる（自分のボールの近くへ動かす） */
      const near = mine.length ? mine[0] : null;
      if (near) return { x: j.x + (near.x - j.x) * 0.35, y: j.y + (near.y - j.y) * 0.35 };
    }
    return j;
  }
  /* CPU が使う投球ボックス（少しずつ変えて、同じ道を通らないように） */
  function cpuSlot(M, side) {
    const base = side === "red" ? 2 : 3;
    return Math.max(0, Math.min(COURT.BOXES - 1, base + (M.rand() < 0.5 ? 0 : (M.rand() < 0.5 ? -1 : 1))));
  }

  /* ══════════ ⑩ 予測（プレイヤーの軌道ガイド）══════════
     ★ 難易度・キャラの TECHNIQUE で「どこまで見えるか」が変わる（ご指定）。 */
  function predict(M, opt) {
    const sim = cloneM(M);
    const b = throwBall(sim, Object.assign({ noJitter: true }, opt));
    const pts = [{ x: b.x, y: b.y }];
    let n = 0;
    while (step(sim) && n < 3000) {
      n++;
      if (n % 6 === 0) pts.push({ x: b.x, y: b.y });
    }
    pts.push({ x: b.x, y: b.y });
    return { path: pts, stop: { x: b.x, y: b.y }, dead: !!b.dead,
             moved: sim.balls.filter((z) => z.id !== b.id && (z.vx || z.vy)).length };
  }

  /* ══════════ ⑪ 保存（設定・戦績・ランク）══════════ */
  const KEY = "mbr_v1";
  const DEF = {
    name: "", rank: "bronze", rp: 0,
    wins: 0, matches: 0, cpuWins: 0, cpuMatches: 0, onWins: 0, onMatches: 0,
    teamWins: 0, teamMatches: 0,
    throws: 0, hits: 0, jackHits: 0, sumDist: 0, nDist: 0,
    fav: "", team: [], guide: "normal", tutorial: false,
    sound: true, vib: true, competition: false, camera: "top",
    replays: [], lastRoom: "",
  };
  let SAVE = null;
  function load() {
    if (SAVE) return SAVE;
    let o = null;
    try { o = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) {}
    SAVE = Object.assign({}, DEF, o || {});
    if (!Array.isArray(SAVE.team)) SAVE.team = [];
    if (!Array.isArray(SAVE.replays)) SAVE.replays = [];
    return SAVE;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(load())); } catch (e) {} }

  const RANKS = [
    { k: "bronze",  ja: "BRONZE",       need: 0,    c: "#c9803f" },
    { k: "silver",  ja: "SILVER",       need: 500,  c: "#9fb0c4" },
    { k: "gold",    ja: "GOLD",         need: 1100, c: "#ffd257" },
    { k: "platinum",ja: "PLATINUM",     need: 1800, c: "#7cd4ff" },
    { k: "diamond", ja: "DIAMOND",      need: 2600, c: "#8ee8ff" },
    { k: "master",  ja: "MASTER",       need: 3600, c: "#c9a6ff" },
    { k: "grand",   ja: "GRAND MASTER", need: 4800, c: "#ff5d8f" },
  ];
  function rankOf(rp) {
    let r = RANKS[0];
    RANKS.forEach((x) => { if (rp >= x.need) r = x; });
    return r;
  }
  function nextRank(rp) {
    for (let i = 0; i < RANKS.length; i++) if (rp < RANKS[i].need) return RANKS[i];
    return null;
  }
  function addRp(delta) {
    const s = load();
    s.rp = Math.max(0, s.rp + delta);
    s.rank = rankOf(s.rp).k;
    save();
    return s.rp;
  }

  /* ══════════ 公開 ══════════ */
  window.MBR = {
    COURT, BALL_R_REAL, BALL_R_PLAY, FRICTION_A, V_MAX, V_MIN, DT,
    TYPES, SKILLS, ABILS, SKILL_OF, ABIL_OF,
    buildRoster, mkRand,
    newMatch, step, settle, live, jackOf, ballR, throwBall, throwSpot, shotMods,
    dist, closestSide, jackValid, nextTurn, scoreEnd, scoreText, closeEnd,
    pushHint, takeHint, HINTS,
    cpuPick, predict, evalBoard, other,
    load, save, RANKS, rankOf, nextRank, addRp,
  };
})();
