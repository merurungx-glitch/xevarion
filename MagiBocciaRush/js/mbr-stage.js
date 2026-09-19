/* ══════════════════════════════════════════════════════════════
   MagiBocciaRush — BOSS STAGE（ボスステージ）★ 2026-09-17d 新モード（ご指定）
   ──────────────────────────────────────────────────────────────
   5ステージ × 難易度3つ（HARD・NORMAL・EASY）。初回クリアでジェム 15 / 10 / 5。

   ★★ 設計の約束（ご指定の「属性の基本方針」）
     ・属性は既存の5属性のまま。新しい属性は作らない。
     ・ステージは<b>属性では攻略しない</b>——ショットの向き・強さ・止める位置・壁反射・
       ボールどうしの衝突・ジャックの位置・固有スキル・編成順・ギミックの時間・ボスの攻撃周期で攻略する。
     ・ボスにはテーマの属性があり、相性が良いと<b>×1.15 だけ</b>（ADV_MUL）。
       これ以上の優遇（特定属性だけ大ダメージ／特定属性しか解除できない）は<b>作らない</b>。
     ・キャラの型（POWER〜TRICK）で「ギミックへの対応のしかた」が変わる（TYPE_EFFECT）。属性とは無関係。
     ・難易度は HP だけで上げない——ギミックの数・頻度・攻撃周期・弱点の時間・ショット数・フェーズで上げる。

   ★ ファイルの分担
     ・物理の本体は mbr-core.js。ここは M.env（摩擦・加速・障害物・ショットの補正）だけを差し込む。
     ・予測（B.predict）は M を複製して走らせるので、<b>M.isSim のときは状態を書きかえない</b>こと。
     ・画面（ステージ一覧・HUD・結果）は mbr-ui.js。描画は MBRStage.drawUnder / drawOver。
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const B = window.MBR;
  if (!B) return;
  const C = B.COURT;
  const sqrt = Math.sqrt;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lang = () => { try { return localStorage.getItem("xeva_lang_v1") === "en" ? "en" : "ja"; } catch (e) { return "ja"; } };
  const J = (ja, en) => (lang() === "en" ? en : ja);
  const L = (o) => (typeof o === "string" ? o : o ? (lang() === "en" ? o.en : o.ja) : "");
  const T = (ja, en) => ({ ja, en });

  /* ══════════ 難易度・属性・型 ══════════ */
  /* ★★ 2026-09-17f ステージ名・ボス名は<b>日本語表示でも英語</b>（ご指定）。nm / boss の T() は両方とも英語にしてある */
  const DIFF_KEYS = ["high", "mid", "low"];
  const DIFF = {
    /* ★★ 2026-09-17e 表記は 高・中・低 → <b>HARD・NORMAL・EASY</b>（ご指定）。キーは low/mid/high のまま（進みの保存と互換） */
    low:  { ja: "EASY",   en: "EASY",   gems: 5,  c: "#35d49a" },
    mid:  { ja: "NORMAL", en: "NORMAL", gems: 10, c: "#ffc83d" },
    high: { ja: "HARD",   en: "HARD",   gems: 15, c: "#ff3b52" },
  };
  const ELEM_ADV = { fire: "wood", wood: "water", water: "fire", light: "dark", dark: "light" };
  const ADV_MUL = 1.15;
  /* ★ ダメージの物差し。奥（y=11m）に届くころの速さは 2〜3 m/s なので、速さだけに比例させると
       遠いボスに当たったときの1発が小さすぎた（実測：18投でも1割しか削れない）。土台を足してある。 */
  const DMG_BASE = 10, DMG_SPEED = 14;
  const KEEP_BALLS = 3;   /* ★ 相性が良いときだけ。これより大きくしない（ご指定） */
  /* ★ 型ごとの「ギミックへの対応のしかた」（属性に関係なく決まる） */
  const TYPE_EFFECT = {
    power:     { ja: "装甲・結晶・氷壁・部位への衝突ダメージ ×1.35（耐久も余計に削る）／弱点への精密な一撃は ×0.9",
                 en: "×1.35 vs armor, crystals, ice walls and parts (extra durability loss); ×0.9 on precise weak points" },
    technique: { ja: "弱点へのダメージ ×1.35・回路パネルの反応範囲 ×1.3／装甲への衝突は ×0.85",
                 en: "×1.35 on weak points, circuit panels trigger from 30% farther; ×0.85 vs armor" },
    bounce:    { ja: "壁や障害物に1回でも反射したあとのダメージ ×1.3",
                 en: "×1.3 damage after at least one bank off a rail or obstacle" },
    jack:      { ja: "ジャックから 1.8m 以内で当てたダメージ ×1.3・ジャック結界を2倍削る",
                 en: "×1.3 damage within 1.8m of the jack; breaks the jack barrier twice as fast" },
    defense:   { ja: "ボスの押し出し（衝撃波・突風・根）を 60% 軽減・凍結の時間 −1",
                 en: "Boss pushes (shockwave, gust, roots) reduced by 60%; freeze lasts 1 turn less" },
    support:   { ja: "止まった位置から 1.2m 以内の味方ボールを GUARD にしてボスの押し出しを半分に（本人のダメージは ×0.9）",
                 en: "Allies within 1.2m of where it stops become GUARDs (boss pushes halved); own damage ×0.9" },
    trick:     { ja: "CURVE・SPLIT で投げたボールは最初の障壁（ゲート・氷壁・根・エネルギーゲート）をすり抜ける・弱点 ×1.25",
                 en: "Balls thrown with CURVE or SPLIT phase through the first barrier (gate, ice wall, root, energy gate); ×1.25 on weak points" },
  };

  /* ══════════ 当たり判定（四則＋sqrt だけ）══════════ */
  function bounce(b, nx, ny, e) {
    const vn = b.vx * nx + b.vy * ny;
    if (vn >= 0) return { speed: 0, nx, ny };
    const k = 1 + (e == null ? 0.55 : e);
    b.vx -= k * vn * nx; b.vy -= k * vn * ny;
    return { speed: -vn, nx, ny };
  }
  function hitCircle(b, ob, r) {
    const dx = b.x - ob.x, dy = b.y - ob.y, d2 = dx * dx + dy * dy, R = r + ob.r;
    if (d2 >= R * R) return null;
    const d = sqrt(d2) || 1e-6;
    const nx = dx / d, ny = dy / d;
    b.x = ob.x + nx * (R + 1e-4); b.y = ob.y + ny * (R + 1e-4);
    return bounce(b, nx, ny, ob.e);
  }
  function hitSeg(b, ob, r) {
    const vx = ob.x2 - ob.x1, vy = ob.y2 - ob.y1;
    const L2 = vx * vx + vy * vy || 1e-9;
    let t = ((b.x - ob.x1) * vx + (b.y - ob.y1) * vy) / L2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const px = ob.x1 + vx * t, py = ob.y1 + vy * t;
    const dx = b.x - px, dy = b.y - py, d2 = dx * dx + dy * dy, R = r + (ob.w || 0.07);
    if (d2 >= R * R) return null;
    let nx, ny;
    if (d2 < 1e-12) { const l = sqrt(L2); nx = -vy / l; ny = vx / l; }
    else { const d = sqrt(d2); nx = dx / d; ny = dy / d; }
    b.x = px + nx * (R + 1e-4); b.y = py + ny * (R + 1e-4);
    return bounce(b, nx, ny, ob.e);
  }
  function inRect(b, z, pad) { const p = pad || 0; return b.x >= z.x1 - p && b.x <= z.x2 + p && b.y >= z.y1 - p && b.y <= z.y2 + p; }
  /* 線分どうしが交わるか（衝撃波の「障害物の後ろ」判定） */
  function segCross(ax, ay, bx, by, cx, cy, dx, dy) {
    const d = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
    if (d === 0) return false;
    const u = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / d;
    const v = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / d;
    return u > 0 && u < 1 && v > 0 && v < 1;
  }
  function charOfBall(b) { return b && b.charId ? B.charOf(b.charId) : null; }
  function redBalls(M) { return B.live(M).filter((b) => !b.jack && b.side === "red"); }
  function pop(M, title, sub, c) { if (!M.isSim && M.fx) M.fx.push({ t: "stagepop", title: L(title), sub: L(sub || ""), c: c || "#fff" }); }
  function log(S, tx, c) { S.log.unshift({ tx, c: c || "#fff" }); if (S.log.length > 4) S.log.length = 4; }

  /* ══════════ ダメージ ══════════
     base = (DMG_BASE ＋ DMG_SPEED × 当たった速さ) × そのボールの押し出し倍率（POWER の能力・POWER HIT・ULT が乗る）
          × 型の対応 × 角度 × 属性相性（×1.15 まで）× そのときの状態（装甲・露出・結界…）  */
  /* ★★ 2026-09-19e <b>押し出した球</b>（いま投げた球ではない、コートに置いてあった球）がボスに当たったとき。
     前は「当たった速さ 0.6m/s 以上」の決まりを投げた球と同じにしていたので、押された球はほとんど届かず
     ダメージにならなかった（ご報告）。押された球は <b>0.3m/s から</b>数え、<b>PUSH ×1.2</b> を乗せる。 */
  function isPushed(M, b) { return !!(M.cur && b !== M.cur && b.chainOf !== M.cur.id && !b.jack); }
  const PUSH_MIN_V = 0.3, PUSH_MUL = 1.2;
  function minHitV(M, b) { return isPushed(M, b) ? PUSH_MIN_V : 0.6; }
  function damage(S, M, b, ob, res, stateMul) {
    if (M.isSim || res.speed < minHitV(M, b) || b.jack) return 0;
    const ch = charOfBall(b);
    const ty = ch ? ch.type : "";
    let m = (DMG_BASE + DMG_SPEED * res.speed) * clamp(b.hitMul || 1, 0.7, 1.8) * (stateMul == null ? 1 : stateMul);
    if (isPushed(M, b)) m *= PUSH_MUL;
    const k = ob.kind;
    if (ty === "power") m *= (k === "armor" || k === "crystal" || k === "ice" || k === "part") ? 1.35 : k === "weak" ? 0.9 : 1;
    if (ty === "technique") m *= k === "weak" ? 1.35 : k === "armor" ? 0.85 : 1;
    if (ty === "bounce" && (b.banks || 0) > 0) m *= 1.3;
    if (ty === "jack") { const j = B.jackOf(M); if (j && B.dist(b, j) < 1.8) m *= 1.3; }
    if (ty === "support") m *= 0.9;
    if (ty === "trick" && k === "weak") m *= 1.25;
    /* 角度：正面（ob.front の向き）から当てるほど重い（0.65〜1.0） */
    if (ob.front) m *= 0.65 + 0.35 * Math.abs(res.nx * ob.front[0] + res.ny * ob.front[1]);
    if (ch && ELEM_ADV[ch.el] === S.def.el) m *= ADV_MUL;
    b.bossHits = (b.bossHits || 0) + 1;
    if (B._evt) B._evt(M, b, "hit", { id: "boss:" + k });
    return Math.max(1, Math.round(m));
  }
  function hurtBoss(S, M, n, x, y, label, c) {
    if (M.isSim || n <= 0) return;
    S.hp = Math.max(0, S.hp - n);
    S.dealt += n;
    M.fx.push({ t: "stagedmg", n, x, y, c: c || "#fff", label: label || "" });
    if (S.def.onHpChange) S.def.onHpChange(S, M);
  }
  function typeOfBall(b) { const c = charOfBall(b); return c ? c.type : ""; }

  /* ★ ボスのHPは<b>自動で投げるボット（スキルほぼ無し）</b>の実測から決めた（2026-09-17d）：
       高 ≒ ボットが15投で与えるダメージ ×1.1 ／ 中・低はそれ以下（高より大きくしない）。
       難しさの本体はHPではなくギミックの数・周期・弱点の時間・ショット数（ご指定）。 */
  /* ══════════════════════════════════════════════════════════════
     ステージ定義
     ★ ギミックは必ず：名称・見た目・発動条件・発動までの時間・ボールへの影響・
       キャラクターへの影響・解除条件・失敗時のペナルティ・複数の攻略方法・初心者向けのヒント（ご指定）
     ══════════════════════════════════════════════════════════════ */
  function G(o) { return o; }

  /* ─────────── ① Crimson Factory ─────────── */
  const FACTORY = {
    id: "factory", no: 1, c: "#ff5d47", el: "fire",
    nm: T("Crimson Factory", "Crimson Factory"),
    boss: T("Iron Colossus", "Iron Colossus"),
    theme: T("巨大な機械・工場設備・可動式ゲート・装甲装置が並ぶ工場。炎と鉄のテーマ。", "A factory of giant machines, moving gates and armor rigs. Theme: fire and steel."),
    bossDesc: T("正面に装甲パネルを持ち、装甲がある間はコアへのダメージが大きく下がる。装甲を壊すとコアが短い時間だけ露出する。攻撃ゲージが満タンになると衝撃波。",
      "Armored in front — the core takes little damage while the armor stands. Breaking a panel exposes the core briefly. A full attack gauge triggers a shockwave."),
    flow: [T("装甲パネルの耐久を減らす", "Wear down the armor panels"), T("ゲートの開閉タイミングを確認する", "Read the gate timing"),
      T("衝撃波を避ける（障害物の後ろに置く）", "Avoid the shockwave (hide behind obstacles)"), T("コアが露出したら攻撃する", "Strike while the core is exposed"),
      T("コアを削りきって撃破", "Grind the core down")],
    routes: [T("正面攻撃：ゲートが開いた瞬間に強く投げて装甲を壊す", "Front: throw hard through the open gate to break armor"),
      T("壁反射：左右の通路から壁で折り返し、装甲の側面やコアの横を狙う", "Rails: bank from the side lanes into the armor's flank or the core"),
      T("配置：ゲートの手前に置いて、次の投球の足場にする", "Setup: park balls before the gate as stepping stones"),
      T("連続衝突：置いたボールを押し出して装甲に当てる", "Chains: knock your parked balls into the armor")],
    gimmicks: [
      G({ nm: T("可動式ゲート", "Moving Gate"), look: T("コート中央を横切る赤い縞模様の鉄柵", "A red-striped steel bar across mid-court"),
        trigger: T("時間の経過で開閉をくり返す（投げる前も動いている）", "Opens and closes on a timer (it moves while you aim)"),
        time: T("EASY 3.4秒周期 ／ NORMAL 2.9秒 ／ HARD 2.5秒（HARD はHP50%以下でさらに速い）", "Cycle: EASY 3.4s / NORMAL 2.9s / HARD 2.5s (faster below 50% HP on HARD)"),
        ball: T("閉じている間は通過できず反射する", "Blocks and reflects balls while closed"),
        chara: T("TRICK の CURVE・SPLIT は最初の1回すり抜ける", "TRICK balls thrown with CURVE/SPLIT phase through once"),
        clear: T("開いている間に通過する／左右の通路を使う", "Pass while it's open or use the side lanes"),
        fail: T("反射して手前に戻り、1投がむだになる", "The ball bounces back and the throw is wasted"),
        ways: [T("開くタイミングを予測して投げる", "Time your throw to the opening"), T("壁反射でゲートの向こうへ送る", "Bank around it"),
          T("ゲートの手前に置いて次に備える", "Park a ball before it for later"), T("ゲートを通らず左右からボスを狙う", "Skip it and attack from the sides")],
        hint: T("点線の予測はゲートの今の状態で描かれます。開いている間に投げ終えるなら少し強めに。", "The preview uses the gate's current state — throw a bit harder so you pass while it's open.") }),
      G({ nm: T("装甲パネル", "Armor Panels"), look: T("ボスの手前に並ぶ灰色の鉄板（上の点が耐久）", "Grey plates in front of the boss (dots = durability)"),
        trigger: T("ボールが当たるたびに耐久が減る", "Loses durability on every contact"),
        time: T("露出は EASY 4投／NORMAL 3投／HARD 2投。終わると装甲は全部再生", "Core stays exposed for EASY 4 / NORMAL 3 / HARD 2 throws, then all armor rebuilds"),
        ball: T("強く反射する。側面から当てると耐久を2削る", "Reflects hard; flank hits remove 2 durability"),
        chara: T("POWER と POWER HIT は耐久をさらに1多く削る", "POWER types and POWER HIT remove 1 extra"),
        clear: T("どれか1枚を壊すと装甲が左右に開き、コアが露出", "Break any panel and the armor opens, exposing the core"),
        fail: T("装甲が残っている間はコアへのダメージ ×0.35", "Core damage ×0.35 while armor stands"),
        ways: [T("高威力ショットで正面から", "Smash it head-on"), T("壁反射で側面を狙う（2削り）", "Bank into its flank (2 durability)"),
          T("複数のボールで連続接触", "Chain several balls into it"), T("近くに置いたボールを押し込む", "Push a parked ball into it")],
        hint: T("まずは真ん中のパネルを POWER 型で強く。壊れたら次の2〜3投はコアへ。", "Start with a POWER type on the middle panel; then spend the next throws on the core.") }),
      G({ nm: T("衝撃波", "Shockwave"), look: T("ボスから広がる赤い円", "A red ring expanding from the boss"),
        trigger: T("ボスの攻撃ゲージ（投げるたび+1）が満タンになると発動", "Fires when the boss attack gauge (+1 per throw) fills"),
        time: T("EASY 5投ごと／NORMAL 4投ごと／HARD 3投ごと", "Every EASY 5 / NORMAL 4 / HARD 3 throws"),
        ball: T("範囲内のボールを外へ押し出す。装甲や閉じたゲートの後ろなら ×0.35", "Pushes balls outward; ×0.35 behind armor or a closed gate"),
        chara: T("次の1投はブレが大きく、予測線が短くなる。DEFENSE は押し出し −60%", "Your next throw has more scatter and a shorter preview. DEFENSE resists 60%"),
        clear: T("衝撃波のあとは次の攻撃までゲージがたまる時間（ボスの隙）", "After it fires, the boss needs time to recharge (your opening)"),
        fail: T("置いていたボールが崩れ、次の投球が乱れる", "Your setup scatters and your next throw is shaky"),
        ways: [T("発生前にボールを遠ざける", "Move balls away before it fires"), T("装甲やゲートの陰に置く", "Hide behind armor or the gate"),
          T("DEFENSE・SUPPORT の GUARD で軽減", "Reduce it with DEFENSE / SUPPORT guards"), T("発生直後の隙に攻める", "Attack right after it fires")],
        hint: T("HUD の「衝撃波まで」を見て、あと1投のときは攻撃より安全な配置を優先。", "Watch the ‘Shockwave in’ counter — with 1 throw left, prefer a safe placement.") }),
    ],
    diffs: {
      low:  { hp: 220, shots: 18, panelHp: 2, expose: 4, atkMax: 5, gateP: 3.4, gateOpen: 0.46, shockR: 4.2, shockV: 2.6, spreadMul: 1.8 },
      mid:  { hp: 240, shots: 16, panelHp: 3, expose: 3, atkMax: 4, gateP: 2.9, gateOpen: 0.38, shockR: 4.8, shockV: 3.0, spreadMul: 2.0 },
      high: { hp: 240, shots: 15, panelHp: 3, expose: 2, atkMax: 3, gateP: 2.5, gateOpen: 0.32, shockR: 5.4, shockV: 3.4, spreadMul: 2.3, phase2: true },
    },
    jack: { x: 5.2, y: 8.4 },
    center: { x: 3.0, y: 11.2 },
    init(S) {
      const D = S.D;
      S.panels = [[1.55, 2.45], [2.55, 3.45], [3.55, 4.45]].map((p, i) => ({ id: "p" + i, x1: p[0], x2: p[1], hp: D.panelHp, max: D.panelHp }));
      S.exposeT = 0; S.gateShift = 0; S.atk = 0; S.shocked = 0;
    },
    gateP(S) { return S.D.gateP * (S.D.phase2 && S.hp <= S.maxHp * 0.5 ? 0.75 : 1); },
    gateOpen(S, t) { const P = this.gateP(S); const ph = (((t + S.gateShift) % P) + P) % P / P; return { open: ph < S.D.gateOpen, ph, P }; },
    obstacles(S, t) {
      const o = [
        { id: "core", t: "c", x: 3.0, y: 11.2, r: 0.55, kind: "core", e: 0.5 },
        { id: "sl", t: "c", x: 1.7, y: 11.5, r: 0.42, kind: "body", e: 0.5 },
        { id: "sr", t: "c", x: 4.3, y: 11.5, r: 0.42, kind: "body", e: 0.5 },
      ];
      /* ★ 露出中は装甲が左右へ開く（当たらない）＝コアへの道ができる */
      if (S.exposeT <= 0) S.panels.forEach((p) => { if (p.hp > 0) o.push({ id: p.id, t: "s", x1: p.x1, y1: 9.9, x2: p.x2, y2: 9.9, w: 0.1, kind: "armor", e: 0.62, front: [0, -1], ref: p }); });
      if (!this.gateOpen(S, t).open) o.push({ id: "gate", t: "s", x1: 1.7, y1: 6.3, x2: 4.3, y2: 6.3, w: 0.08, kind: "gate", barrier: true, e: 0.5 });
      return o;
    },
    zones() { return []; },
    onHit(S, M, b, ob, res) {
      if (ob.kind === "core") {
        const ex = S.exposeT > 0;
        const n = damage(S, M, b, ob, res, ex ? 1 : 0.35);
        hurtBoss(S, M, n, ob.x, ob.y, ex ? "CORE" : "ARMORED", ex ? "#ffd257" : "#aab");
      } else if (ob.kind === "body") {
        hurtBoss(S, M, damage(S, M, b, ob, res, 0.15), ob.x, ob.y, "", "#aab");
      } else if (ob.kind === "armor" && !M.isSim && res.speed >= 0.6) {
        const p = ob.ref;
        const side = Math.abs(res.ny) < 0.6;
        const ty = typeOfBall(b);
        const cut = 1 + (side ? 1 : 0) + (ty === "power" || b.guardBreak ? 1 : 0);
        p.hp = Math.max(0, p.hp - cut);
        damage(S, M, b, ob, res, 0);  /* ダメージは入れないが、ヒットとして数える（ゲージ・コンボ） */
        M.fx.push({ t: "stagedmg", n: 0, x: (p.x1 + p.x2) / 2, y: 9.9, c: "#c9c9d2", label: "ARMOR −" + cut });
        if (p.hp <= 0) {
          S.exposeT = Math.max(S.exposeT, S.D.expose); S.exposeFresh = true;
          pop(M, T("CORE EXPOSED!", "CORE EXPOSED!"), T("コアが露出（" + S.exposeT + "投）", "Core open for " + S.exposeT + " throws"), "#ffd257");
          log(S, J("装甲パネルを破壊 → コア露出", "Armor broken → core exposed"), "#ffd257");
        }
      }
    },
    turnEnd(S, M) {
      S.shocked = 0;
      let anim = false;
      if (S.exposeFresh) S.exposeFresh = false;      /* 壊したその投球では減らさない */
      else if (S.exposeT > 0) {
        S.exposeT--;
        if (S.exposeT === 0 && S.panels.some((p) => p.hp <= 0)) {
          S.panels.forEach((p) => { p.hp = p.max; });
          pop(M, T("ARMOR REBUILT", "ARMOR REBUILT"), T("装甲パネルが再生した", "The armor rebuilt itself"), "#c9c9d2");
          log(S, J("装甲が再生", "Armor rebuilt"), "#c9c9d2");
        }
      }
      S.atk++;
      if (S.atk >= S.D.atkMax) {
        S.atk = 0;
        const cx = this.center.x, cy = this.center.y, R = S.D.shockR;
        const obs = this.obstacles(S, M.envT).filter((o) => o.kind === "armor" || o.kind === "gate");
        redBalls(M).forEach((b) => {
          const dx = b.x - cx, dy = b.y - cy, d = sqrt(dx * dx + dy * dy);
          if (d >= R || d < 0.01) return;
          let v = S.D.shockV * (1 - d / R) + 0.6;
          if (obs.some((o) => segCross(cx, cy, b.x, b.y, o.x1, o.y1, o.x2, o.y2))) v *= 0.35;
          v *= pushResist(b);
          b.vx += dx / d * v; b.vy += dy / d * v;
          anim = true;
        });
        S.gateShift += this.gateP(S) * 0.5;
        S.shocked = 1;
        M.fx.push({ t: "stagering", x: cx, y: cy, r: R, c: "#ff5d47" });
        pop(M, T("SHOCKWAVE!", "SHOCKWAVE!"), T("衝撃波！次の1投はブレが大きい", "Shockwave! Next throw is shaky"), "#ff5d47");
        log(S, J("衝撃波（ゲートの周期もずれた）", "Shockwave (gate timing shifted)"), "#ff5d47");
      }
      return { anim };
    },
    shot(S, M, side, ch, o) { if (S.shocked) { o.spread *= S.D.spreadMul; o.preview *= 0.6; } },
    hud(S, M) {
      const g = this.gateOpen(S, M.envT || 0);
      return [
        J("装甲 ", "Armor ") + S.panels.map((p) => (p.hp > 0 ? "■".repeat(p.hp) : "✕")).join(" ｜ "),
        S.exposeT > 0 ? "<b style='color:#ffd257'>" + J("コア露出 あと" + S.exposeT + "投", "CORE EXPOSED · " + S.exposeT + " throws") + "</b>" : J("コアは装甲に守られている（×0.35）", "Core shielded (×0.35)"),
        J("ゲート ", "Gate ") + (g.open ? "<b style='color:#35d49a'>OPEN</b>" : "CLOSED") + " ・ " + J("衝撃波まで ", "Shockwave in ") + (S.D.atkMax - S.atk) + J("投", ""),
      ];
    },
    draw(ctx, S, M, V, tsec) {
      /* ゲート */
      const g = this.gateOpen(S, M.envT || 0);
      const y = V.y(6.3);
      ctx.save();
      ctx.lineWidth = Math.max(4, 0.16 * V.px);
      ctx.setLineDash([10, 8]);
      ctx.strokeStyle = g.open ? "rgba(255,93,71,.25)" : "#ff5d47";
      const shrink = g.open ? 0.5 : 0;
      ctx.beginPath(); ctx.moveTo(V.x(1.7 + shrink), y); ctx.lineTo(V.x(4.3 - shrink), y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#ffd6cf"; ctx.font = "italic 10px Anton,Orbitron,sans-serif";
      ctx.fillText(g.open ? "GATE OPEN" : "GATE", V.x(1.7), y - 6);
      /* 装甲 */
      S.panels.forEach((p) => {
        if (p.hp <= 0 || S.exposeT > 0) return;
        ctx.lineWidth = Math.max(5, 0.2 * V.px); ctx.strokeStyle = "#8b8b98";
        ctx.beginPath(); ctx.moveTo(V.x(p.x1), V.y(9.9)); ctx.lineTo(V.x(p.x2), V.y(9.9)); ctx.stroke();
        for (let i = 0; i < p.max; i++) {
          ctx.fillStyle = i < p.hp ? "#fff" : "rgba(255,255,255,.2)";
          ctx.fillRect(V.x(p.x1) + 4 + i * 8, V.y(9.9) - 14, 6, 4);
        }
      });
      drawBoss(ctx, V, 3.0, 11.2, 0.55, "#ff5d47", S.exposeT > 0, tsec, [[1.7, 11.5, 0.42], [4.3, 11.5, 0.42]]);
      ctx.restore();
    },
  };

  /* ─────────── ② Frozen Observatory ─────────── */
  const ICE_POS = [[0.8, 5.4, 1.9, 5.4], [3.9, 6.0, 5.0, 6.0], [2.4, 7.6, 3.6, 7.6], [0.8, 9.2, 1.8, 9.6], [4.2, 9.6, 5.2, 9.2]];
  const SLIDE_Z = [{ x1: 0.4, y1: 3.2, x2: 5.6, y2: 4.8 }, { x1: 0.3, y1: 8.4, x2: 2.8, y2: 9.9 }, { x1: 3.2, y1: 8.4, x2: 5.7, y2: 9.9 }];
  const OBS = {
    id: "observatory", no: 2, c: "#38a6ff", el: "water",
    nm: T("Frozen Observatory", "Frozen Observatory"),
    boss: T("Glacial Oracle", "Glacial Oracle"),
    theme: T("氷床・観測装置・動く氷壁を備えた研究施設。氷のテーマ。", "A research station of ice floors, instruments and moving ice walls. Theme: ice."),
    bossDesc: T("氷の壁を生み、一定の周期でボールの流れる向きを変える。弱点は短い時間だけ左右どちらかに現れ、特殊攻撃でボールを凍らせる。",
      "Raises ice walls, shifts the drift of rolling balls, shows a weak point only briefly, and freezes balls with a special attack."),
    flow: [T("滑走床で遠くへ送る", "Use the slide floors to reach far"), T("氷壁の反射を使う／壊す", "Bank off or break the ice walls"),
      T("凍結攻撃の前にボールを動かす", "Move balls before the freeze"), T("弱点が出たら狙う", "Strike the weak point when it appears"), T("攻撃周期を覚えて安全な配置を作る", "Learn the rhythm and keep a safe layout")],
    routes: [T("弱点ルート：弱点が出た投球で精密に", "Weak point: a precise throw while it's open"),
      T("反射ルート：氷壁で折り返してコアの横へ", "Bank: rebound off ice walls into the core's side"),
      T("滑走ルート：弱めに投げて滑走床で伸ばす", "Slide: throw soft and let the ice carry it"),
      T("防御ルート：凍結の的をボス近くに置かない", "Defense: don't leave targets near the boss")],
    gimmicks: [
      G({ nm: T("滑走床", "Slide Floor"), look: T("水色に光る氷の床", "Glowing pale-blue ice"), trigger: T("ボールがエリアに入ると常に", "Always, while a ball is inside"),
        time: T("ずっと（EASY 1か所／NORMAL 2か所／HARD 3か所）", "Permanent (EASY 1 / NORMAL 2 / HARD 3 areas)"), ball: T("摩擦 ×0.35。長く滑り、止まるまで時間がかかる", "Friction ×0.35 — slides far and slow to stop"),
        chara: T("FRICTION の高いキャラほど止めやすい", "High-FRICTION characters stop more easily"), clear: T("解除はない（使いこなす床）", "Can't be removed — use it"),
        fail: T("強すぎると壁まで滑って位置が崩れる", "Too strong and the ball slides into the rail"),
        ways: [T("威力を抑える", "Throw softer"), T("手前で減速させてから入れる", "Slow it before the ice"), T("壁反射で避ける", "Bank around it"), T("滑走を使って遠くへ送る", "Ride it to reach far")],
        hint: T("滑走床をまたぐ投球は、ふだんの半分くらいの強さから試してみて。", "Across a slide floor, start at about half your usual power.") }),
      G({ nm: T("氷壁", "Ice Wall"), look: T("白く光る氷の板（点が耐久）", "A glowing ice slab (dots = durability)"), trigger: T("最初からあり、一定の投球ごとに別の位置へ再生成", "Present from the start; regenerates elsewhere on a timer"),
        time: T("EASY 4投／NORMAL 3投／HARD 3投ごとに移動・再生", "Moves/regrows every EASY 4 / NORMAL 3 / HARD 3 throws"), ball: T("反射する。当てると耐久が減る", "Reflects balls and loses durability"),
        chara: T("POWER は耐久を2削る。TRICK の CURVE・SPLIT は1回すり抜ける", "POWER removes 2; TRICK CURVE/SPLIT phases through once"), clear: T("耐久を0にすると壊れる（次の再生成まで無い）", "Break it at 0 durability (gone until it regrows)"),
        fail: T("直進ルートがふさがれる", "Blocks straight lines"), ways: [T("壊して直進ルートを作る", "Break it for a straight path"), T("反射して別方向へ", "Bank off it"), T("すき間を通す", "Thread the gap"), T("移動するのを待つ", "Wait for it to move")],
        hint: T("氷壁は「壁」と同じように使えます。予測線の折れ曲がりを見て狙って。", "Treat ice walls like rails — follow the bent preview line.") }),
      G({ nm: T("ボール凍結", "Freeze"), look: T("青い氷の結晶に包まれたボール", "A ball wrapped in blue crystals"), trigger: T("ボスの攻撃ゲージが満タン → ボスにいちばん近いボールに命中", "Full attack gauge → hits the ball nearest the boss"),
        time: T("EASY 5投／NORMAL 4投／HARD 3投ごと・凍結はEASY 2投／NORMAL 3投／HARD 3投", "Every EASY 5 / NORMAL 4 / HARD 3 throws; lasts EASY 2 / NORMAL 3 / HARD 3"),
        ball: T("動かない障害物になる。別のボールがぶつかると解除が1投早まる", "Becomes an immovable block; a hit from another ball thaws it 1 throw sooner"),
        chara: T("そのボールを投げたキャラは凍結中ブレ ×1.4。DEFENSE は凍結 −1投", "Its thrower has ×1.4 scatter while frozen; DEFENSE thaws 1 throw sooner"),
        clear: T("時間切れ、またはボールを当てる", "Wait it out or knock another ball into it"), fail: T("大事な位置のボールが固まり、障害物になる", "A key ball becomes an obstacle"),
        ways: [T("ボスの近くにボールを残さない", "Don't leave balls near the boss"), T("凍ったボールにぶつけて解除を早める", "Hit the frozen ball to thaw it"), T("凍っている間に別の位置を整える", "Rearrange elsewhere meanwhile"), T("凍ったボールを足場として反射に使う", "Use it as a bumper")],
        hint: T("「凍結まで」があと1投なら、ボスから遠い場所に止めるのが安全。", "With 1 throw before a freeze, stop your ball far from the boss.") }),
      G({ nm: T("弱点とボールの流れ", "Weak Point & Drift"), look: T("ボスの左右に光る青い輪／コート中央の流れる帯（矢印）", "A blue ring beside the boss / a drifting band with arrows"),
        trigger: T("弱点は数投ごとに左右交互。流れは2投ごとに向きが反転", "Weak point alternates sides; the drift flips every 2 throws"),
        time: T("弱点は EASY 4投ごと2投／NORMAL 4投ごと2投／HARD 5投ごと1投", "Weak point: EASY 2 of every 4 / NORMAL 2 of 4 / HARD 1 of 5 throws"),
        ball: T("流れの帯ではボールが横へ押される（EASY 0.6／NORMAL 1.0／HARD 1.3）", "The band pushes balls sideways (EASY 0.6 / NORMAL 1.0 / HARD 1.3)"),
        chara: T("TECHNIQUE は弱点 ×1.35、TRICK は ×1.25", "TECHNIQUE ×1.35, TRICK ×1.25 on the weak point"), clear: T("弱点に当てると ×2.2（コアは ×0.5）", "Weak point hits ×2.2 (core ×0.5)"),
        fail: T("弱点が消えるとコアしか狙えない", "Once it fades only the core is left"), ways: [T("出る投球を HUD で数えて待つ", "Count down on the HUD"), T("流れの向きを見て反対側へ投げる", "Aim against the drift"), T("氷壁で折り返して横から", "Bank in from the side")],
        hint: T("矢印の向きにボールが流されます。弱点を狙うときは少し逆側を。", "Balls drift with the arrows — aim a little against them.") }),
    ],
    diffs: {
      low:  { hp: 160, shots: 18, weakEvery: 4, weakTurns: 2, slides: 1, ices: 1, iceHp: 3, iceEvery: 4, atkMax: 5, freezeT: 2, drift: 0.6 },
      mid:  { hp: 180, shots: 16, weakEvery: 4, weakTurns: 2, slides: 2, ices: 2, iceHp: 3, iceEvery: 3, atkMax: 4, freezeT: 3, drift: 1.0 },
      high: { hp: 200, shots: 15, weakEvery: 5, weakTurns: 1, slides: 3, ices: 3, iceHp: 3, iceEvery: 3, atkMax: 3, freezeT: 3, drift: 1.3 },
    },
    jack: { x: 0.9, y: 7.6 },
    center: { x: 3.0, y: 11.3 },
    init(S) {
      const D = S.D;
      S.ices = []; for (let i = 0; i < D.ices; i++) S.ices.push({ id: "ice" + i, pos: i, hp: D.iceHp });
      S.weakT = D.weakTurns; S.weakSide = 0; S.driftSign = 1; S.atk = 0;
    },
    obstacles(S) {
      const o = [{ id: "core", t: "c", x: 3.0, y: 11.3, r: 0.6, kind: "core", e: 0.5 }];
      if (S.weakT > 0) o.push({ id: "weak", t: "c", x: S.weakSide ? 4.45 : 1.55, y: 10.4, r: 0.3, kind: "weak", e: 0.6 });
      S.ices.forEach((w) => { if (w.hp > 0) { const p = ICE_POS[w.pos % ICE_POS.length]; o.push({ id: w.id, t: "s", x1: p[0], y1: p[1], x2: p[2], y2: p[3], w: 0.1, kind: "ice", barrier: true, e: 0.7, ref: w }); } });
      return o;
    },
    zones(S) {
      const z = SLIDE_Z.slice(0, S.D.slides).map((r) => Object.assign({ kind: "slide", fric: 0.35 }, r));
      z.push({ kind: "drift", x1: 0, y1: 6.9, x2: 6, y2: 8.1, ax: S.D.drift * S.driftSign, ay: 0 });
      return z;
    },
    onHit(S, M, b, ob, res) {
      if (ob.kind === "core") hurtBoss(S, M, damage(S, M, b, ob, res, 0.5), ob.x, ob.y, "CORE", "#9ee6ff");
      else if (ob.kind === "weak") hurtBoss(S, M, damage(S, M, b, ob, res, 2.2), ob.x, ob.y, "WEAK!", "#ffd257");
      else if (ob.kind === "ice" && !M.isSim && res.speed >= 0.6) {
        const w = ob.ref; const cut = typeOfBall(b) === "power" ? 2 : 1;
        w.hp = Math.max(0, w.hp - cut);
        damage(S, M, b, ob, res, 0);
        M.fx.push({ t: "stagedmg", n: 0, x: (ob.x1 + ob.x2) / 2, y: (ob.y1 + ob.y2) / 2, c: "#bff0ff", label: w.hp > 0 ? "ICE −" + cut : "ICE BREAK" });
        if (w.hp <= 0) log(S, J("氷壁を破壊", "Ice wall broken"), "#bff0ff");
      }
    },
    turnEnd(S, M) {
      const D = S.D;
      /* 凍結の解除 */
      redBalls(M).forEach((b) => {
        if (!b.frozenT) return;
        b.frozenT -= b.thawHit ? 2 : 1; b.thawHit = 0;
        if (b.frozenT <= 0) { b.frozenT = 0; b.frozen = false; b.mass = b.baseMass || 1; log(S, J("凍結が解けた", "A ball thawed"), "#9ee6ff"); }
      });
      /* 弱点 */
      if (S.weakT > 0) S.weakT--;
      if (S.turn % D.weakEvery === 0) {
        S.weakT = D.weakTurns; S.weakSide = 1 - S.weakSide;
        pop(M, T("WEAK POINT!", "WEAK POINT!"), T("弱点が出現（" + D.weakTurns + "投）", "Weak point open for " + D.weakTurns), "#ffd257");
      }
      /* 流れの向き */
      if (S.turn % 2 === 0) S.driftSign = -S.driftSign;
      /* 氷壁の移動・再生成 */
      if (S.turn % D.iceEvery === 0) {
        S.ices.forEach((w) => { w.pos = (w.pos + 1) % ICE_POS.length; w.hp = D.iceHp; });
        log(S, J("氷壁が別の位置に再生成", "Ice walls regrew elsewhere"), "#bff0ff");
      }
      /* 凍結攻撃 */
      S.atk++;
      if (S.atk >= D.atkMax) {
        S.atk = 0;
        const cand = redBalls(M).filter((b) => !b.frozen).sort((a, b) => B.dist(a, this.center) - B.dist(b, this.center));
        const tg = cand[0];
        if (tg) {
          tg.frozen = true; tg.frozenT = Math.max(1, D.freezeT - (typeOfBall(tg) === "defense" ? 1 : 0));
          tg.baseMass = tg.baseMass || tg.mass || 1; tg.mass = 60; tg.vx = 0; tg.vy = 0;
          M.fx.push({ t: "stagebeam", x1: this.center.x, y1: this.center.y, x2: tg.x, y2: tg.y, c: "#9ee6ff" });
          pop(M, T("FREEZE!", "FREEZE!"), T("ボールが凍結（" + tg.frozenT + "投）", "A ball is frozen for " + tg.frozenT), "#9ee6ff");
          log(S, J("凍結攻撃", "Freeze attack"), "#9ee6ff");
        }
      }
      return { anim: false };
    },
    shot(S, M, side, ch, o) {
      if (ch && redBalls(M).some((b) => b.frozen && b.charId === ch.id)) o.spread *= 1.4;
    },
    hud(S) {
      return [
        S.weakT > 0 ? "<b style='color:#ffd257'>" + J("弱点 出現中（" + (S.weakSide ? "右" : "左") + "）あと" + S.weakT + "投", "WEAK POINT (" + (S.weakSide ? "right" : "left") + ") · " + S.weakT) + "</b>"
          : J("弱点まで ", "Weak point in ") + (S.D.weakEvery - (S.turn % S.D.weakEvery)) + J("投（コア ×0.5）", " (core ×0.5)"),
        J("流れ ", "Drift ") + (S.driftSign > 0 ? "→" : "←") + " ・ " + J("氷壁 ", "Ice ") + S.ices.map((w) => (w.hp > 0 ? "■".repeat(w.hp) : "✕")).join(" ｜ "),
        J("凍結まで ", "Freeze in ") + (S.D.atkMax - S.atk) + J("投", ""),
      ];
    },
    draw(ctx, S, M, V, tsec) {
      ctx.save();
      this.zones(S).forEach((z) => {
        if (z.kind === "slide") { ctx.fillStyle = "rgba(170,230,255,.16)"; ctx.fillRect(V.x(z.x1), V.y(z.y2), (z.x2 - z.x1) * V.px, (z.y2 - z.y1) * V.px); }
        else drawArrows(ctx, V, z, z.ax > 0 ? 1 : -1, 0, "rgba(158,230,255,.55)", tsec);
      });
      S.ices.forEach((w) => {
        if (w.hp <= 0) return;
        const p = ICE_POS[w.pos % ICE_POS.length];
        ctx.lineWidth = Math.max(5, 0.2 * V.px); ctx.strokeStyle = "#dff6ff"; ctx.shadowColor = "#9ee6ff"; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.moveTo(V.x(p[0]), V.y(p[1])); ctx.lineTo(V.x(p[2]), V.y(p[3])); ctx.stroke(); ctx.shadowBlur = 0;
        for (let i = 0; i < w.hp; i++) { ctx.fillStyle = "#fff"; ctx.fillRect(V.x((p[0] + p[2]) / 2) - 10 + i * 7, V.y((p[1] + p[3]) / 2) - 14, 5, 4); }
      });
      if (S.weakT > 0) drawWeak(ctx, V, S.weakSide ? 4.45 : 1.55, 10.4, 0.3, tsec);
      drawBoss(ctx, V, 3.0, 11.3, 0.6, "#38a6ff", false, tsec);
      ctx.restore();
    },
  };

  /* ─────────── ③ Circuit Arena ─────────── */
  const PANEL_POS = [[1.2, 3.9], [4.8, 4.8], [1.4, 7.2], [4.6, 8.2]];
  const CIRCUIT = {
    id: "circuit", no: 3, c: "#f0b429", el: "light",
    nm: T("Circuit Arena", "Circuit Arena"),
    boss: T("Circuit Hydra", "Circuit Hydra"),
    theme: T("電気装置・回路パネル・エネルギーゲートがあるテクニカルなアリーナ。雷光のテーマ。", "A technical arena of devices, circuit panels and energy gates. Theme: lightning."),
    bossDesc: T("左の防御装置・中央の本体コア・右の攻撃装置の3つの部位。回路がつながっている間、本体はシールドで守られる。",
      "Three parts: a left defense device, the central core and a right attack device. The core is shielded while its circuit is connected."),
    flow: [T("回路パネルを番号順に起動して回路を切断", "Trigger the panels in order to cut the circuit"), T("左部位を壊して防御を下げる", "Break the left part to lower defense"),
      T("右部位を壊して攻撃の頻度を下げる", "Break the right part to slow its attacks"), T("シールドが消えた間に中央コアを攻撃", "Hit the core while its shield is down")],
    routes: [T("回路ルート：パネルを1→2→3→4 と正確に止める・通す", "Circuit: stop or roll over panels 1→2→3→4"),
      T("部位ルート：左右の部位を先に壊して常にシールドを消す", "Parts: destroy both side parts to drop the shield for good"),
      T("反射ルート：壁で遠いパネルや部位を狙う", "Bank: reach far panels and parts off the rails"),
      T("ゲート活用ルート：エネルギーゲートの押し出しでボールを運ぶ", "Gate ride: let the energy gate carry your ball")],
    gimmicks: [
      G({ nm: T("回路パネル", "Circuit Panels"), look: T("床の番号つきの四角いパネル（光ると起動中）", "Numbered floor squares (lit = active)"),
        trigger: T("ボールがパネルに触れる／上で止まる", "A ball rolls over or stops on a panel"), time: T("起動は EASY 5投／NORMAL 4投／HARD 3投 で自然に切れる", "Activation fades after EASY 5 / NORMAL 4 / HARD 3 throws"),
        ball: T("影響なし（上を転がれる）", "None (balls roll over them)"), chara: T("TECHNIQUE は反応範囲 ×1.3", "TECHNIQUE triggers from 30% farther"),
        clear: T("1番から順に全部起動 → 回路切断でシールド解除（EASY 3投／NORMAL 2投／HARD 2投）", "Trigger all in order → circuit cut, shield down (EASY 3 / NORMAL 2 / HARD 2 throws)"),
        fail: T("順番をまちがえると全部リセット", "Wrong order resets every panel"),
        ways: [T("番号を確認してから投げる", "Check the numbers first"), T("ボールを正確に止める", "Stop balls precisely"), T("壁反射で遠いパネルへ", "Bank to far panels"), T("置いたボールを押して触れさせる", "Nudge a parked ball onto a panel")],
        hint: T("まだ起動していない次の番号が黄色く点滅しています。", "The next panel you need blinks yellow.") }),
      G({ nm: T("3つのボス部位", "Three Boss Parts"), look: T("左の盾の装置・中央のコア・右の砲台", "Left shield device / central core / right cannon"),
        trigger: T("最初から存在", "Present from the start"), time: T("壊した部位は戻らない", "Destroyed parts stay destroyed"),
        ball: T("反射する", "Reflects balls"), chara: T("POWER は部位へのダメージ ×1.35", "POWER deals ×1.35 to parts"),
        clear: T("左右の両方を壊すとシールドが常に解除", "Destroying both sides removes the shield permanently"),
        fail: T("左が生きている間はコアへのダメージ ×0.6、右が生きている間は攻撃が1投早い", "Left alive: core damage ×0.6. Right alive: attacks come 1 throw sooner"),
        ways: [T("左を先に壊して防御を下げる", "Left first to lower defense"), T("右を先に壊して攻撃を遅らせる", "Right first to slow attacks"), T("回路を切ってすぐコアへ", "Cut the circuit and rush the core"), T("壊す順番で難しさが変わる", "The order changes the difficulty")],
        hint: T("迷ったら右の砲台から。攻撃が減ると落ち着いて回路を組めます。", "When unsure, take out the right cannon first — fewer attacks make the circuit easier.") }),
      G({ nm: T("エネルギーゲート", "Energy Gate"), look: T("コート中央に出る黄色い帯（矢印が押す向き）", "A yellow band mid-court (arrows show the push)"),
        trigger: T("ボスの攻撃ゲージが満タン", "Boss attack gauge fills"), time: T("EASY 5投／NORMAL 4投／HARD 4投ごと（右部位が生きていると−1）・出現は3〜4投", "Every EASY 5 / NORMAL 4 / HARD 4 throws (−1 while the right part lives), lasts 3–4"),
        ball: T("中のボールを横へ押す。正面から入ると大きく減速、両端の柱に触れると反射", "Pushes balls sideways; entering head-on slows them hard; the end posts reflect"),
        chara: T("TRICK の CURVE・SPLIT は1回すり抜ける", "TRICK CURVE/SPLIT phases through once"), clear: T("時間で消える", "Fades with time"),
        fail: T("狙った位置からずれる", "Knocks your shot off line"), ways: [T("押す向きを利用して運ぶ", "Ride the push"), T("両端の柱で反射させて回避", "Bank off the posts"), T("消えるまで配置に回る", "Place balls until it fades"), T("強めに投げて減速を上書き", "Throw hard to punch through")],
        hint: T("矢印の向きにボールが流されます。流される分を見込んで反対側へ。", "Balls are pushed along the arrows — aim to the opposite side.") }),
    ],
    diffs: {
      low:  { hp: 130, shots: 18, partHp: 120, panelLife: 5, openT: 3, atkMax: 5, gateT: 3, panels: 3 },
      mid:  { hp: 150, shots: 16, partHp: 160, panelLife: 4, openT: 2, atkMax: 4, gateT: 3, panels: 4 },
      high: { hp: 170, shots: 15, partHp: 200, panelLife: 3, openT: 2, atkMax: 4, gateT: 4, panels: 4 },
    },
    jack: { x: 5.3, y: 3.0 },
    center: { x: 3.0, y: 11.4 },
    init(S) {
      const D = S.D;
      S.parts = { left: { hp: D.partHp, max: D.partHp }, right: { hp: D.partHp, max: D.partHp } };
      S.act = PANEL_POS.slice(0, D.panels).map(() => 0); S.next = 0; S.openT = 0; S.atk = 0; S.gateT = 0; S.gateDir = 1;
    },
    shielded(S) { return !(S.openT > 0 || (S.parts.left.hp <= 0 && S.parts.right.hp <= 0)); },
    atkMax(S) { return Math.max(2, S.D.atkMax - (S.parts.right.hp > 0 ? 1 : 0)); },
    obstacles(S) {
      const o = [{ id: "core", t: "c", x: 3.0, y: 11.4, r: 0.55, kind: "core", e: 0.5 }];
      if (S.parts.left.hp > 0) o.push({ id: "pl", t: "c", x: 1.5, y: 10.9, r: 0.5, kind: "part", e: 0.55, ref: S.parts.left });
      if (S.parts.right.hp > 0) o.push({ id: "pr", t: "c", x: 4.5, y: 10.9, r: 0.5, kind: "part", e: 0.55, ref: S.parts.right });
      if (S.gateT > 0) {
        o.push({ id: "gpl", t: "s", x1: 1.0, y1: 5.9, x2: 1.0, y2: 6.7, w: 0.08, kind: "post", e: 0.7 });
        o.push({ id: "gpr", t: "s", x1: 5.0, y1: 5.9, x2: 5.0, y2: 6.7, w: 0.08, kind: "post", e: 0.7 });
      }
      return o;
    },
    zones(S) {
      const z = [];
      if (S.gateT > 0) z.push({ kind: "egate", x1: 1.0, y1: 5.9, x2: 5.0, y2: 6.7, ax: 3.0 * S.gateDir, ay: 0, frontFric: 2.4, barrier: true });
      return z;
    },
    panelHalf(b) { return 0.38 * (typeOfBall(b) === "technique" ? 1.3 : 1); },
    touch(S, M, b) {
      if (M.isSim || b.jack) return;
      const n = S.act.length;
      for (let i = 0; i < n; i++) {
        const p = PANEL_POS[i], h = this.panelHalf(b);
        if (Math.abs(b.x - p[0]) > h || Math.abs(b.y - p[1]) > h) { if (b._pan === i) b._pan = -1; continue; }
        if (b._pan === i) return;
        b._pan = i;
        if (S.act[i] > 0) return;
        if (i === S.next) {
          S.act[i] = S.D.panelLife; S.next++;
          M.fx.push({ t: "stagedmg", n: 0, x: p[0], y: p[1], c: "#ffd257", label: "PANEL " + (i + 1) });
          if (S.next >= n) {
            S.openT = S.D.openT; S.openFresh = true; S.next = 0; S.act = S.act.map(() => 0);
            pop(M, T("CIRCUIT CUT!", "CIRCUIT CUT!"), T("シールド解除（" + S.openT + "投）", "Shield down for " + S.openT + " throws"), "#ffd257");
            log(S, J("回路を切断 → コア露出", "Circuit cut → core exposed"), "#ffd257");
          }
        } else {
          S.act = S.act.map(() => 0); S.next = 0;
          pop(M, T("RESET", "RESET"), T("順番ちがい：パネルがリセット", "Wrong order: panels reset"), "#ff3b52");
          log(S, J("回路パネルがリセット", "Circuit panels reset"), "#ff3b52");
        }
        return;
      }
    },
    onHit(S, M, b, ob, res) {
      if (ob.kind === "core") {
        const sh = this.shielded(S);
        const mul = sh ? 0.08 : (S.parts.left.hp > 0 ? 0.6 : 1);
        hurtBoss(S, M, damage(S, M, b, ob, res, mul), ob.x, ob.y, sh ? "SHIELD" : "CORE", sh ? "#8b8b98" : "#ffd257");
      } else if (ob.kind === "part" && !M.isSim) {
        const n = damage(S, M, b, ob, res, 1);
        if (!n) return;
        const p = ob.ref; p.hp = Math.max(0, p.hp - n);
        M.fx.push({ t: "stagedmg", n, x: ob.x, y: ob.y, c: "#ffb347", label: "" });
        hurtBoss(S, M, Math.round(n * 0.25), ob.x, ob.y, "", "#ffb347");
        if (p.hp <= 0) {
          const left = p === S.parts.left;
          pop(M, T(left ? "DEFENSE DOWN" : "CANNON DOWN", left ? "DEFENSE DOWN" : "CANNON DOWN"),
            T(left ? "左部位を破壊：防御が下がった" : "右部位を破壊：攻撃が遅くなった", left ? "Left part destroyed: defense lowered" : "Right part destroyed: attacks slowed"), "#ffb347");
          log(S, left ? J("左部位を破壊", "Left part destroyed") : J("右部位を破壊", "Right part destroyed"), "#ffb347");
        }
      }
    },
    turnEnd(S, M) {
      let reset = false;
      S.act = S.act.map((v) => { if (v > 0) { v--; if (v === 0) reset = true; } return v; });
      if (reset && S.next > 0) { S.act = S.act.map(() => 0); S.next = 0; log(S, J("パネルの起動が切れてリセット", "Panels timed out"), "#8b8b98"); }
      if (S.openFresh) S.openFresh = false;
      else if (S.openT > 0) { S.openT--; if (S.openT === 0 && this.shielded(S)) log(S, J("シールドが戻った", "Shield restored"), "#8b8b98"); }
      if (S.gateT > 0) S.gateT--;
      S.atk++;
      let anim = false;
      if (S.atk >= this.atkMax(S)) {
        S.atk = 0;
        S.gateT = S.D.gateT; S.gateDir = S.turn % 2 ? 1 : -1;
        pop(M, T("ENERGY GATE", "ENERGY GATE"), T("エネルギーゲート出現（" + S.gateT + "投）", "Energy gate for " + S.gateT + " throws"), "#f0b429");
        log(S, J("エネルギーゲート", "Energy gate"), "#f0b429");
        if (S.parts.right.hp > 0) {
          const tg = redBalls(M).sort((a, b) => B.dist(b, this.center) - B.dist(a, this.center))[0];
          if (tg) { const v = 1.8 * pushResist(tg); tg.vx += (tg.x < 3 ? 1 : -1) * v; tg.vy -= v * 0.4; anim = true; M.fx.push({ t: "stagebeam", x1: 4.5, y1: 10.9, x2: tg.x, y2: tg.y, c: "#ffd257" }); }
        }
      }
      return { anim };
    },
    hud(S) {
      const sh = this.shielded(S);
      return [
        (sh ? J("シールド中（コア ×0.08）", "Shielded (core ×0.08)") : "<b style='color:#ffd257'>" + J("シールド解除", "SHIELD DOWN") + (S.openT > 0 ? J(" あと" + S.openT + "投", " · " + S.openT) : "") + "</b>"),
        J("回路 ", "Circuit ") + S.act.map((v, i) => (v > 0 ? "●" : i === S.next ? "◎" : "○")).join(" ") + J("（次: " + (S.next + 1) + "）", " (next " + (S.next + 1) + ")"),
        J("左 ", "L ") + Math.ceil(S.parts.left.hp) + " ／ " + J("右 ", "R ") + Math.ceil(S.parts.right.hp) + " ・ " + J("ゲートまで ", "Gate in ") + (this.atkMax(S) - S.atk) + J("投", ""),
      ];
    },
    draw(ctx, S, M, V, tsec) {
      ctx.save();
      S.act.forEach((v, i) => {
        const p = PANEL_POS[i], h = 0.38;
        const next = i === S.next && v === 0;
        ctx.fillStyle = v > 0 ? "rgba(255,210,87,.5)" : next && Math.sin(tsec * 6) > 0 ? "rgba(255,210,87,.3)" : "rgba(255,255,255,.08)";
        ctx.strokeStyle = v > 0 ? "#ffd257" : "rgba(255,210,87,.6)"; ctx.lineWidth = 2;
        ctx.fillRect(V.x(p[0] - h), V.y(p[1] + h), 2 * h * V.px, 2 * h * V.px);
        ctx.strokeRect(V.x(p[0] - h), V.y(p[1] + h), 2 * h * V.px, 2 * h * V.px);
        ctx.fillStyle = "#fff"; ctx.font = "bold 14px Anton,Orbitron,sans-serif"; ctx.textAlign = "center";
        ctx.fillText(String(i + 1), V.x(p[0]), V.y(p[1]) + 5); ctx.textAlign = "start";
      });
      this.zones(S).forEach((z) => {
        ctx.fillStyle = "rgba(240,180,41,.22)"; ctx.fillRect(V.x(z.x1), V.y(z.y2), (z.x2 - z.x1) * V.px, (z.y2 - z.y1) * V.px);
        drawArrows(ctx, V, z, z.ax > 0 ? 1 : -1, 0, "rgba(255,230,140,.8)", tsec);
        ctx.fillStyle = "#ffd257"; [1.0, 5.0].forEach((x) => ctx.fillRect(V.x(x) - 3, V.y(6.7), 6, 0.8 * V.px));
      });
      [["left", 1.5], ["right", 4.5]].forEach(([k, x]) => {
        const p = S.parts[k]; if (p.hp <= 0) return;
        ctx.fillStyle = k === "left" ? "#6a7c9a" : "#9a6a4a"; ctx.beginPath(); ctx.arc(V.x(x), V.y(10.9), 0.5 * V.px, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.fillRect(V.x(x) - 0.45 * V.px, V.y(10.9) - 0.66 * V.px, 0.9 * V.px * (p.hp / p.max), 4);
        ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center"; ctx.fillText(k === "left" ? "🛡" : "⚡", V.x(x), V.y(10.9) + 4); ctx.textAlign = "start";
      });
      drawBoss(ctx, V, 3.0, 11.4, 0.55, "#f0b429", !this.shielded(S), tsec);
      if (this.shielded(S)) { ctx.strokeStyle = "rgba(160,220,255,.7)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(V.x(3.0), V.y(11.4), 0.8 * V.px, 0, Math.PI * 2); ctx.stroke(); }
      ctx.restore();
    },
  };

  /* ─────────── ④ Gale Labyrinth ─────────── */
  const WIND_Z = [{ x1: 0, y1: 3.4, x2: 6, y2: 5.0 }, { x1: 0, y1: 6.6, x2: 3.0, y2: 8.2 }, { x1: 3.0, y1: 8.2, x2: 6, y2: 9.8 }];
  const WIND_DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  const BLOCK_PATH = [[0.6, 5.8, 5.4, 5.8], [1.0, 8.9, 5.0, 8.9], [2.2, 10.2, 3.8, 10.2], [0.8, 2.8, 5.2, 2.8]];
  const SAFE_POS = [[1.5, 4.2], [4.5, 7.0], [3.0, 8.8], [1.2, 7.6], [4.8, 3.6]];
  const BOSS_X = [3.0, 1.7, 4.3];
  const GALE = {
    id: "gale", no: 4, c: "#a86bff", el: "dark",
    nm: T("Gale Labyrinth", "Gale Labyrinth"),
    boss: T("Tempest Marionette", "Tempest Marionette"),
    theme: T("風圧・迷路・動く障害物の迷宮。夜の嵐のテーマ。", "A maze of wind, walls and moving blocks. Theme: a night storm."),
    bossDesc: T("直接攻撃よりコートの操作を重視する。風向きを変え、止まる位置を乱し、安全地帯を動かす。本体は投げるたびに左右へ移動する。",
      "Controls the court rather than attacking: shifts the wind, scatters stopping positions and moves the safe zone. It sidesteps after every throw."),
    flow: [T("風向きと強さを確認する", "Read the wind"), T("動く障害物の周期を見る", "Watch the block patterns"),
      T("突風の前に安全地帯へ置く", "Park in the safe zone before a gust"), T("ボスの次の位置を読んで当てる", "Predict where the boss moves")],
    routes: [T("風乗りルート：風に乗せて遠くへ運ぶ", "Wind ride: let the wind carry the ball"), T("停止待ちルート：障害物が止まった瞬間に通す", "Timing: shoot when blocks pause"),
      T("反射ルート：迷路の壁や障害物の裏から", "Bank: from behind maze walls or blocks"), T("防御ルート：安全地帯にためて突風に耐える", "Defense: stack the safe zone and ride out gusts")],
    gimmicks: [
      G({ nm: T("風圧エリア", "Wind Area"), look: T("矢印が流れる紫の帯", "Purple bands with flowing arrows"), trigger: T("一定の投球ごとに風向きが切り替わる", "The wind turns on a throw timer"),
        time: T("EASY 3投／NORMAL 2投／HARD 2投ごと（EASY 1か所／NORMAL 2か所／HARD 3か所）", "Every EASY 3 / NORMAL 2 / HARD 2 throws (EASY 1 / NORMAL 2 / HARD 3 areas)"), ball: T("エリア内のボールが風の向きへ加速（EASY 1.3／NORMAL 1.7／HARD 2.1）", "Balls accelerate downwind (EASY 1.3 / NORMAL 1.7 / HARD 2.1)"),
        chara: T("POWER の速い球ほど影響を受けにくい", "Fast POWER shots are affected less"), clear: T("解除はない（エリアの外は普通の物理）", "Permanent (normal physics outside)"),
        fail: T("止めたい位置から流される", "Pushes balls off their spot"), ways: [T("風で遠くへ運ぶ", "Ride it far"), T("エリアの外に置く", "Place outside it"), T("風と壁反射を組み合わせる", "Combine wind and rails"), T("向きが変わる投球を待つ", "Wait for the wind to turn")],
        hint: T("HUD に次の風向きまでの投球数が出ます。追い風の投球を攻撃に使って。", "The HUD shows when the wind turns — attack with a tailwind.") }),
      G({ nm: T("動く障害物", "Moving Blocks"), look: T("左右に往復する紫の球体", "Purple orbs sliding back and forth"), trigger: T("時間の経過で往復し、端で少し止まる（投げる前も動いている）", "Slide on a timer and pause at the ends (they move while you aim)"),
        time: T("EASY 2個／NORMAL 3個／HARD 4個・速さ EASY 0.8／NORMAL 1.1／HARD 1.4 m/s", "EASY 2 / NORMAL 3 / HARD 4 blocks; speed 0.8 / 1.1 / 1.4 m/s"), ball: T("反射する", "Reflects balls"),
        chara: T("BOUNCE は反射のあとダメージ ×1.3", "BOUNCE deals ×1.3 after rebounding"), clear: T("解除はない。ボスの突風で位置がずれる", "Permanent; gusts shift their timing"),
        fail: T("狙ったルートをふさがれる", "Blocks your line"), ways: [T("ルートを観察する", "Learn the route"), T("止まった瞬間に投げる", "Shoot during the pause"), T("反射して裏側を狙う", "Rebound behind them"), T("別ルートを選ぶ", "Pick another line")],
        hint: T("障害物は端で一瞬止まります。そのタイミングで投げると通しやすい。", "Blocks pause at the ends — that's your window.") }),
      G({ nm: T("突風と安全地帯", "Gust & Safe Zone"), look: T("緑に光る円（安全地帯）／画面いっぱいの風", "A green ring (safe zone) / a screen-wide gust"), trigger: T("ボスの攻撃ゲージが満タンで突風。安全地帯は数投ごとに移動", "A full gauge unleashes a gust; the safe zone moves every few throws"),
        time: T("突風 EASY 5投／NORMAL 4投／HARD 3投ごと・安全地帯 EASY 3投／NORMAL 2投／HARD 2投ごとに移動", "Gust every EASY 5 / NORMAL 4 / HARD 3; safe zone moves every EASY 3 / NORMAL 2 / HARD 2"),
        ball: T("安全地帯の外のボールは手前へ吹き戻される", "Balls outside the safe zone are blown back"),
        chara: T("DEFENSE は吹き戻し −60%、SUPPORT の GUARD は半分", "DEFENSE resists 60%; SUPPORT guards halve it"), clear: T("突風のあとは次のゲージまで安全", "Safe until the next gauge fills"),
        fail: T("前に置いたボールが手前へ戻され、配置がくずれる", "Your forward balls get pushed back"), ways: [T("安全地帯に止める", "Stop balls in the safe zone"), T("突風の直後に攻める", "Attack right after a gust"), T("吹き戻しを利用して手前のボールを押し上げる", "Use the push to line up rebounds"), T("DEFENSE で配置を守る", "Protect the layout with DEFENSE")],
        hint: T("緑の円に止めたボールは突風で動きません。", "Balls resting in the green ring ignore gusts.") }),
    ],
    diffs: {
      low:  { hp: 350, shots: 18, winds: 1, windA: 1.3, windEvery: 3, blocks: 2, blockSpd: 0.8, atkMax: 5, gustV: 2.2, safeEvery: 3, safeR: 1.2 },
      mid:  { hp: 400, shots: 16, winds: 2, windA: 1.7, windEvery: 2, blocks: 3, blockSpd: 1.1, atkMax: 4, gustV: 2.8, safeEvery: 2, safeR: 1.0 },
      high: { hp: 570, shots: 15, winds: 3, windA: 2.1, windEvery: 2, blocks: 4, blockSpd: 1.4, atkMax: 3, gustV: 3.4, safeEvery: 2, safeR: 0.9 },
    },
    jack: { x: 0.8, y: 8.0 },
    center: { x: 3.0, y: 11.3 },
    init(S) { S.windIx = 0; S.blockShift = 0; S.safeIx = 0; S.bossIx = 0; S.atk = 0; },
    blockPos(S, i, t) {
      const p = BLOCK_PATH[i], len = Math.abs(p[2] - p[0]) + Math.abs(p[3] - p[1]);
      const move = len / S.D.blockSpd, pause = 0.8, cyc = 2 * (move + pause);
      let u = (((t + S.blockShift + i * 1.3) % cyc) + cyc) % cyc;
      let f;
      if (u < move) f = u / move; else if (u < move + pause) f = 1; else if (u < 2 * move + pause) f = 1 - (u - move - pause) / move; else f = 0;
      return { x: p[0] + (p[2] - p[0]) * f, y: p[1] + (p[3] - p[1]) * f, paused: (u >= move && u < move + pause) || u >= 2 * move + pause };
    },
    safe(S) { const p = SAFE_POS[S.safeIx % SAFE_POS.length]; return { x: p[0], y: p[1], r: S.D.safeR }; },
    bossX(S) { return BOSS_X[S.bossIx % BOSS_X.length]; },
    obstacles(S, t) {
      const o = [
        { id: "core", t: "c", x: this.bossX(S), y: 11.3, r: 0.62, kind: "core", e: 0.5 },
        { id: "w1", t: "s", x1: 0.0, y1: 6.3, x2: 2.2, y2: 6.3, w: 0.08, kind: "wall", e: 0.6 },
        { id: "w2", t: "s", x1: 3.8, y1: 6.3, x2: 6.0, y2: 6.3, w: 0.08, kind: "wall", e: 0.6 },
        { id: "w3", t: "s", x1: 1.2, y1: 9.9, x2: 1.2, y2: 10.9, w: 0.08, kind: "wall", e: 0.6 },
        { id: "w4", t: "s", x1: 4.8, y1: 9.9, x2: 4.8, y2: 10.9, w: 0.08, kind: "wall", e: 0.6 },
      ];
      for (let i = 0; i < S.D.blocks; i++) { const p = this.blockPos(S, i, t); o.push({ id: "b" + i, t: "c", x: p.x, y: p.y, r: 0.34, kind: "block", e: 0.65 }); }
      return o;
    },
    zones(S) {
      return WIND_Z.slice(0, S.D.winds).map((z, i) => { const d = WIND_DIRS[(S.windIx + i) % 4]; return Object.assign({ kind: "wind", ax: d[0] * S.D.windA, ay: d[1] * S.D.windA }, z); });
    },
    onHit(S, M, b, ob, res) {
      if (ob.kind === "core") hurtBoss(S, M, damage(S, M, b, ob, res, 1), ob.x, ob.y, "HIT", "#e0c8ff");
    },
    turnEnd(S, M) {
      const D = S.D;
      let anim = false;
      S.bossIx++;
      if (S.turn % D.windEvery === 0) { S.windIx++; log(S, J("風向きが変わった", "The wind changed"), "#c9a6ff"); }
      if (S.turn % D.safeEvery === 0) { S.safeIx++; log(S, J("安全地帯が移動", "The safe zone moved"), "#35d49a"); }
      S.atk++;
      if (S.atk >= D.atkMax) {
        S.atk = 0;
        const sf = this.safe(S);
        redBalls(M).forEach((b) => {
          if (B.dist(b, sf) <= sf.r || b.frozen) return;
          const v = D.gustV * pushResist(b);
          b.vy -= v; b.vx += (b.x < 3 ? -0.25 : 0.25) * v;
          anim = true;
        });
        S.blockShift += 1.3;
        pop(M, T("GUST!", "GUST!"), T("突風！安全地帯の外が吹き戻された", "Gust! Balls outside the safe zone were blown back"), "#a86bff");
        log(S, J("突風", "Gust"), "#a86bff");
        M.fx.push({ t: "stagering", x: 3.0, y: 11.3, r: 9, c: "#a86bff" });
      }
      return { anim };
    },
    hud(S) {
      const d = WIND_DIRS[S.windIx % 4]; const ar = d[0] > 0 ? "→" : d[0] < 0 ? "←" : d[1] > 0 ? "↑" : "↓";
      return [
        J("風 ", "Wind ") + ar + J("（" + (S.D.windEvery - (S.turn % S.D.windEvery)) + "投で変化）", " (turns in " + (S.D.windEvery - (S.turn % S.D.windEvery)) + ")"),
        J("突風まで ", "Gust in ") + (S.D.atkMax - S.atk) + J("投 ・ 安全地帯に止めれば吹き戻されない", " · the green ring is safe"),
        J("ボスは投げるたびに移動（次: ", "The boss moves after every throw (next: ") + [J("中央", "center"), J("左", "left"), J("右", "right")][(S.bossIx + 1) % 3] + J("）", ")"),
      ];
    },
    draw(ctx, S, M, V, tsec) {
      ctx.save();
      this.zones(S).forEach((z) => {
        ctx.fillStyle = "rgba(168,107,255,.14)"; ctx.fillRect(V.x(z.x1), V.y(z.y2), (z.x2 - z.x1) * V.px, (z.y2 - z.y1) * V.px);
        drawArrows(ctx, V, z, Math.sign(z.ax), Math.sign(z.ay), "rgba(214,190,255,.75)", tsec);
      });
      const sf = this.safe(S);
      ctx.strokeStyle = "#35d49a"; ctx.lineWidth = 3; ctx.setLineDash([6, 5]);
      ctx.beginPath(); ctx.arc(V.x(sf.x), V.y(sf.y), sf.r * V.px, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = "rgba(53,212,154,.1)"; ctx.fill();
      ctx.strokeStyle = "#c9a6ff"; ctx.lineWidth = Math.max(4, 0.16 * V.px);
      this.obstacles(S, M.envT || 0).forEach((o) => {
        if (o.kind === "wall") { ctx.beginPath(); ctx.moveTo(V.x(o.x1), V.y(o.y1)); ctx.lineTo(V.x(o.x2), V.y(o.y2)); ctx.stroke(); }
        if (o.kind === "block") {
          const g = ctx.createRadialGradient(V.x(o.x), V.y(o.y), 2, V.x(o.x), V.y(o.y), o.r * V.px);
          g.addColorStop(0, "#e0c8ff"); g.addColorStop(1, "#5a2fa0");
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(V.x(o.x), V.y(o.y), o.r * V.px, 0, Math.PI * 2); ctx.fill();
        }
      });
      drawBoss(ctx, V, this.bossX(S), 11.3, 0.62, "#a86bff", false, tsec);
      ctx.strokeStyle = "rgba(214,190,255,.5)"; ctx.lineWidth = 1;
      [-0.4, 0, 0.4].forEach((dx) => { ctx.beginPath(); ctx.moveTo(V.x(this.bossX(S) + dx), V.y(12.5)); ctx.lineTo(V.x(this.bossX(S) + dx * 0.5), V.y(11.8)); ctx.stroke(); });
      ctx.restore();
    },
  };

  /* ─────────── ⑤ Terra Sanctuary ─────────── */
  const CRYS_POS = [[1.8, 9.9], [4.2, 9.9], [3.0, 9.3]];
  const ROOT_POS = [[0.4, 5.4, 1.9, 6.0], [4.1, 6.0, 5.6, 5.4], [2.0, 8.4, 4.0, 8.4], [2.4, 3.8, 3.6, 4.2]];
  const TERRA = {
    id: "terra", no: 5, c: "#2fbf71", el: "wood",
    nm: T("Terra Sanctuary", "Terra Sanctuary"),
    boss: T("Worldroot Guardian", "Worldroot Guardian"),
    theme: T("岩・樹木・結晶・結界を備えた神殿。大地と森のテーマ。", "A temple of rock, trees, crystals and wards. Theme: earth and forest."),
    bossDesc: T("防御結晶が残っている間はコアが守られる。移動する根で配置を乱し、HPが半分を切るとジャックのまわりに結界を張る。",
      "Protected while its crystals stand. Moving roots scatter your layout, and below half HP it wards the area around the jack."),
    flow: [T("防御結晶を壊す", "Break the defense crystals"), T("根が出る前にボールを動かす", "Move balls before roots rise"),
      T("結晶を壊した直後の弱点を狙う", "Strike the weak moment after a crystal breaks"), T("HP半分からはジャック結界を解除", "Below half HP, break the jack ward")],
    routes: [T("正面ルート：結晶を順番に壊してからコアへ", "Front: crystals first, then the core"), T("反射ルート：壁から結晶の裏側を狙う", "Bank: hit crystals from behind"),
      T("ジャックルート：ジャックのそばに止めて結界を削る", "Jack: stop balls near the jack to break the ward"), T("連続衝突ルート：置いたボールを押して結晶に当てる", "Chain: push parked balls into crystals")],
    gimmicks: [
      G({ nm: T("防御結晶", "Defense Crystals"), look: T("ボスの前に浮かぶ緑の結晶（点が耐久）", "Green crystals before the boss (dots = durability)"), trigger: T("最初から存在（ボスの特殊行動で再生成）", "Present from the start (regrown by the boss)"),
        time: T("再生成 EASY なし／NORMAL 5投後／HARD 4投後", "Regrow: EASY never / NORMAL after 5 / HARD after 4 throws"), ball: T("反射する。当てると耐久が減る", "Reflects balls and loses durability"),
        chara: T("POWER は耐久を2削る", "POWER removes 2"), clear: T("全部壊すとコアへの軽減がなくなる。1つ壊すたびに2投だけコアが弱点化（×1.6）", "Break them all to remove the shield; each break opens the core (×1.6) for 2 throws"),
        fail: T("1つでも残っているとコアへのダメージ ×0.45", "Core damage ×0.45 while any crystal remains"), ways: [T("正面から連続で当てる", "Hit it head-on repeatedly"), T("壁反射で裏側を狙う", "Bank behind it"), T("順番に壊す", "Break them one by one"), T("壊した直後の弱点化を狙う", "Use the brief weak moment after a break")],
        hint: T("結晶を1つ壊したら、次の2投はコアを狙う絶好のチャンス。", "After breaking a crystal, your next 2 throws should go at the core.") }),
      G({ nm: T("移動する根", "Moving Roots"), look: T("コートを横切る茶色の太い根", "Thick brown roots across the court"), trigger: T("一定の投球ごと・ボスのHPが75%/50%/25%を切ったとき", "On a throw timer and when the boss drops below 75/50/25% HP"),
        time: T("EASY 5投／NORMAL 4投／HARD 4投ごと・EASY 2投／NORMAL 2投／HARD 3投で消える（本数 EASY 1／NORMAL 1／HARD 2）", "Every EASY 5 / NORMAL 4 / HARD 4; lasts EASY 2 / NORMAL 2 / HARD 3 throws (EASY 1 / NORMAL 1 / HARD 2 roots)"), ball: T("反射し、ぶつかると大きく減速（×0.55）", "Reflects and slows balls sharply (×0.55)"),
        chara: T("TRICK の CURVE・SPLIT は1回すり抜ける", "TRICK CURVE/SPLIT phases through once"), clear: T("時間で消える", "Fades with time"),
        fail: T("通り道がふさがれ、配置が乱れる", "Blocks lanes and disturbs your layout"), ways: [T("出る前にボールを動かす", "Move balls first"), T("根のすき間を通す", "Thread the gaps"), T("根にぶつけて減速させて止める", "Use a root as a brake"), T("消える投球を待つ", "Wait for it to fade")],
        hint: T("根は「ブレーキ」にもなります。強めに投げて根で止めると奥に置けます。", "Roots are brakes too — throw hard and let a root stop the ball deep.") }),
      G({ nm: T("ジャック結界", "Jack Ward"), look: T("ジャックを囲む緑の輪と、横の小さな発生装置", "A green ring around the jack and a small generator beside it"), trigger: T("ボスのHPが50%以下になると発生", "Appears below 50% boss HP"),
        time: T("解除するまで続く（耐久 EASY 3／NORMAL 4／HARD 5）", "Lasts until broken (durability EASY 3 / NORMAL 4 / HARD 5)"), ball: T("結界の中は摩擦 ×1.8（止まりやすい）", "Friction ×1.8 inside (balls stop sooner)"),
        chara: T("JACK 型は結界を2倍削る", "JACK types break it twice as fast"), clear: T("結界の中に止める（1個−1）／発生装置に当てる（−1）", "Stop balls inside (−1 each) or hit the generator (−1)"),
        fail: T("結界がある間はコアへのダメージ ×0.5", "Core damage ×0.5 while the ward stands"), ways: [T("結界の中にボールを止める", "Stop balls inside the ring"), T("発生装置を狙う", "Hit the generator"), T("複数のボールで耐久を減らす", "Use several balls"), T("JACK 型で一気に削る", "Break it fast with a JACK type")],
        hint: T("結界の中は止まりやすいので、弱めに転がして中に入れるだけで削れます。", "Balls stop easily inside — a gentle roll into the ring is enough.") }),
    ],
    diffs: {
      low:  { hp: 180, shots: 18, crystals: 2, crystalHp: 2, regen: 0, rootEvery: 5, rootLife: 2, roots: 1, barrierHp: 3, atkMax: 5 },
      mid:  { hp: 200, shots: 16, crystals: 3, crystalHp: 2, regen: 5, rootEvery: 4, rootLife: 2, roots: 1, barrierHp: 4, atkMax: 4 },
      high: { hp: 190, shots: 15, crystals: 3, crystalHp: 3, regen: 4, rootEvery: 4, rootLife: 3, roots: 2, barrierHp: 5, atkMax: 3 },
    },
    jack: { x: 4.8, y: 7.4 },
    center: { x: 3.0, y: 11.4 },
    init(S) {
      const D = S.D;
      S.crys = []; for (let i = 0; i < D.crystals; i++) S.crys.push({ id: "cr" + i, pos: i, hp: D.crystalHp, down: 0 });
      S.roots = []; S.rootIx = 0; S.weakT = 0; S.barrier = 0; S.barrierDone = false; S.atk = 0; S.hpMarks = {};
    },
    spawnRoots(S, M, n) {
      for (let i = 0; i < n; i++) { S.roots.push({ pos: S.rootIx % ROOT_POS.length, life: S.D.rootLife }); S.rootIx++; }
      if (S.roots.length > 4) S.roots.splice(0, S.roots.length - 4);
      pop(M, T("ROOTS!", "ROOTS!"), T("根が伸びた", "Roots burst out"), "#8a5a2b");
      log(S, J("根が出現", "Roots appeared"), "#c08a52");
    },
    onHpChange(S, M) {
      [0.75, 0.5, 0.25].forEach((th) => {
        if (S.hp <= S.maxHp * th && !S.hpMarks[th]) { S.hpMarks[th] = 1; this.spawnRoots(S, M, 1); }
      });
      if (S.hp <= S.maxHp * 0.5 && !S.barrier && !S.barrierDone) {
        S.barrier = S.D.barrierHp;
        pop(M, T("JACK WARD", "JACK WARD"), T("ジャックのまわりに結界（コア ×0.5）", "A ward around the jack (core ×0.5)"), "#2fbf71");
        log(S, J("ジャック結界が発生", "Jack ward raised"), "#2fbf71");
      }
    },
    obstacles(S, t, M) {
      const o = [{ id: "core", t: "c", x: 3.0, y: 11.4, r: 0.6, kind: "core", e: 0.5 }];
      S.crys.forEach((c) => { if (c.hp > 0) { const p = CRYS_POS[c.pos]; o.push({ id: c.id, t: "c", x: p[0], y: p[1], r: 0.32, kind: "crystal", e: 0.6, ref: c }); } });
      S.roots.forEach((r, i) => { const p = ROOT_POS[r.pos]; o.push({ id: "root" + i, t: "s", x1: p[0], y1: p[1], x2: p[2], y2: p[3], w: 0.12, kind: "root", barrier: true, e: 0.35, slow: 0.55 }); });
      if (S.barrier > 0 && M) { const j = B.jackOf(M); if (j) o.push({ id: "gen", t: "c", x: clamp(j.x + 1.5, 0.4, 5.6), y: j.y, r: 0.22, kind: "gen", e: 0.6 }); }
      return o;
    },
    zones(S, t, M) {
      const z = [];
      if (S.barrier > 0 && M) { const j = B.jackOf(M); if (j) z.push({ kind: "ward", cx: j.x, cy: j.y, r: 1.3, fric: 1.8 }); }
      return z;
    },
    onHit(S, M, b, ob, res) {
      if (ob.kind === "core") {
        let mul = S.crys.some((c) => c.hp > 0) ? 0.45 : 1;
        if (S.weakT > 0) mul = 1.6;
        if (S.barrier > 0) mul *= 0.5;
        hurtBoss(S, M, damage(S, M, b, ob, res, mul), ob.x, ob.y, S.weakT > 0 ? "WEAK!" : "CORE", S.weakT > 0 ? "#ffd257" : "#baffd9");
      } else if (ob.kind === "crystal" && !M.isSim && res.speed >= 0.6) {
        const c = ob.ref; const cut = typeOfBall(b) === "power" ? 2 : 1;
        c.hp = Math.max(0, c.hp - cut);
        damage(S, M, b, ob, res, 0);
        M.fx.push({ t: "stagedmg", n: 0, x: ob.x, y: ob.y, c: "#baffd9", label: c.hp > 0 ? "CRYSTAL −" + cut : "BREAK" });
        if (c.hp <= 0) {
          c.down = S.D.regen; S.weakT = 2; S.weakFresh = true;
          pop(M, T("CRYSTAL BREAK", "CRYSTAL BREAK"), T("コアが一時的に弱点化（2投）", "The core is briefly weak (2 throws)"), "#baffd9");
          log(S, J("防御結晶を破壊", "Crystal broken"), "#baffd9");
        }
      } else if (ob.kind === "gen" && !M.isSim && res.speed >= 0.6 && S.barrier > 0) {
        S.barrier = Math.max(0, S.barrier - (typeOfBall(b) === "jack" ? 2 : 1));
        damage(S, M, b, ob, res, 0);
        M.fx.push({ t: "stagedmg", n: 0, x: ob.x, y: ob.y, c: "#2fbf71", label: "WARD −" });
        if (S.barrier <= 0) this.breakWard(S, M);
      }
    },
    breakWard(S, M) {
      S.barrier = 0; S.barrierDone = true;
      pop(M, T("WARD BROKEN", "WARD BROKEN"), T("ジャック結界を解除", "The jack ward is broken"), "#2fbf71");
      log(S, J("結界を解除", "Ward broken"), "#2fbf71");
    },
    collideExtra(S, M, b, ob) { if (ob.slow && !b.jack) { b.vx *= ob.slow; b.vy *= ob.slow; } },
    turnEnd(S, M) {
      const D = S.D;
      let anim = false;
      if (S.weakFresh) S.weakFresh = false; else if (S.weakT > 0) S.weakT--;
      /* 結界：中に止まったボールで削る */
      if (S.barrier > 0) {
        const j = B.jackOf(M); let cut = 0;
        if (j) redBalls(M).forEach((b) => { if (!b._ward && B.dist(b, j) <= 1.3 && cut < 2) { b._ward = 1; cut += typeOfBall(b) === "jack" ? 2 : 1; } });
        if (cut) { S.barrier = Math.max(0, S.barrier - cut); log(S, J("結界を削った −" + cut, "Ward −" + cut), "#2fbf71"); if (S.barrier <= 0) this.breakWard(S, M); }
      }
      /* 結晶の再生成 */
      S.crys.forEach((c) => { if (c.hp <= 0 && c.down > 0) { c.down--; if (c.down === 0) { c.hp = D.crystalHp; log(S, J("結晶が再生成", "A crystal regrew"), "#baffd9"); } } });
      /* 根 */
      S.roots.forEach((r) => { r.life--; });
      S.roots = S.roots.filter((r) => r.life > 0);
      if (S.turn % D.rootEvery === 0) this.spawnRoots(S, M, D.roots);
      /* 攻撃：根の薙ぎ払い */
      S.atk++;
      if (S.atk >= D.atkMax) {
        S.atk = 0;
        redBalls(M).forEach((b) => {
          if (b.frozen || B.dist(b, this.center) > 4.2) return;
          const v = 2.4 * pushResist(b);
          b.vy -= v; b.vx += (b.x < 3 ? 0.6 : -0.6) * v; anim = true;
        });
        M.fx.push({ t: "stagering", x: 3.0, y: 11.4, r: 4.2, c: "#8a5a2b" });
        pop(M, T("ROOT SWEEP!", "ROOT SWEEP!"), T("根の薙ぎ払い！ボスの近くのボールが押し戻された", "Root sweep! Balls near the boss were pushed back"), "#8a5a2b");
        log(S, J("根の薙ぎ払い", "Root sweep"), "#c08a52");
      }
      return { anim };
    },
    hud(S) {
      return [
        J("結晶 ", "Crystals ") + S.crys.map((c) => (c.hp > 0 ? "◆".repeat(c.hp) : c.down > 0 ? "✕" + c.down : "✕")).join(" ｜ ")
          + (S.weakT > 0 ? " ・ <b style='color:#ffd257'>" + J("弱点化 あと" + S.weakT, "WEAK · " + S.weakT) + "</b>" : ""),
        S.barrier > 0 ? "<b style='color:#2fbf71'>" + J("ジャック結界 耐久 ", "Jack ward ") + S.barrier + J("（コア ×0.5）", " (core ×0.5)") + "</b>" : J("ジャック結界：HP50%以下で発生", "Jack ward appears below 50% HP"),
        J("根 ", "Roots ") + S.roots.length + " ・ " + J("薙ぎ払いまで ", "Sweep in ") + (S.D.atkMax - S.atk) + J("投", ""),
      ];
    },
    draw(ctx, S, M, V, tsec) {
      ctx.save();
      this.zones(S, 0, M).forEach((z) => {
        ctx.strokeStyle = "#2fbf71"; ctx.lineWidth = 3; ctx.shadowColor = "#2fbf71"; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(V.x(z.cx), V.y(z.cy), z.r * V.px, 0, Math.PI * 2); ctx.stroke(); ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(47,191,113,.12)"; ctx.fill();
      });
      this.obstacles(S, M.envT || 0, M).forEach((o) => {
        if (o.kind === "root") {
          ctx.strokeStyle = "#8a5a2b"; ctx.lineWidth = Math.max(6, 0.26 * V.px); ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(V.x(o.x1), V.y(o.y1));
          ctx.quadraticCurveTo(V.x((o.x1 + o.x2) / 2), V.y((o.y1 + o.y2) / 2) - 10, V.x(o.x2), V.y(o.y2)); ctx.stroke();
        } else if (o.kind === "crystal") {
          const x = V.x(o.x), y = V.y(o.y), r = o.r * V.px;
          ctx.fillStyle = "#6effb0"; ctx.shadowColor = "#2fbf71"; ctx.shadowBlur = 10;
          ctx.beginPath(); ctx.moveTo(x, y - r * 1.3); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r * 1.3); ctx.lineTo(x - r, y); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
          for (let i = 0; i < o.ref.hp; i++) { ctx.fillStyle = "#fff"; ctx.fillRect(x - 10 + i * 6, y - r * 1.3 - 8, 4, 4); }
        } else if (o.kind === "gen") {
          ctx.fillStyle = "#2fbf71"; ctx.beginPath(); ctx.arc(V.x(o.x), V.y(o.y), o.r * V.px, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();
        }
      });
      drawBoss(ctx, V, 3.0, 11.4, 0.6, "#2fbf71", S.weakT > 0, tsec);
      ctx.restore();
    },
  };

  const STAGES = [FACTORY, OBS, CIRCUIT, GALE, TERRA];
  const BY_ID = {}; STAGES.forEach((s) => { BY_ID[s.id] = s; });

  /* ══════════ 共通の描画 ══════════ */
  function drawBoss(ctx, V, x, y, r, col, open, tsec, extra) {
    const X = V.x(x), Y = V.y(y), R = r * V.px;
    (extra || []).forEach((e) => {
      ctx.fillStyle = "#3a3a46"; ctx.beginPath(); ctx.arc(V.x(e[0]), V.y(e[1]), e[2] * V.px, 0, Math.PI * 2); ctx.fill();
    });
    const g = ctx.createRadialGradient(X, Y - R * 0.3, R * 0.1, X, Y, R);
    g.addColorStop(0, "#ffffff"); g.addColorStop(0.35, col); g.addColorStop(1, "#140a10");
    ctx.shadowColor = col; ctx.shadowBlur = open ? 26 : 12;
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(X, Y, R, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = open ? "#ffd257" : "rgba(255,255,255,.5)"; ctx.lineWidth = open ? 4 : 2;
    ctx.beginPath(); ctx.arc(X, Y, R + 3 + (open ? Math.sin(tsec * 8) * 3 : 0), 0, Math.PI * 2); ctx.stroke();
    /* 目 */
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.ellipse(X, Y, R * 0.42, R * 0.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#140a10"; ctx.beginPath(); ctx.arc(X + Math.sin(tsec * 1.3) * R * 0.18, Y, R * 0.13, 0, Math.PI * 2); ctx.fill();
  }
  function drawWeak(ctx, V, x, y, r, tsec) {
    const X = V.x(x), Y = V.y(y), R = r * V.px * (1 + Math.sin(tsec * 7) * 0.15);
    ctx.strokeStyle = "#ffd257"; ctx.lineWidth = 3; ctx.shadowColor = "#ffd257"; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.arc(X, Y, R, 0, Math.PI * 2); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.moveTo(X - R * 0.6, Y); ctx.lineTo(X + R * 0.6, Y); ctx.moveTo(X, Y - R * 0.6); ctx.lineTo(X, Y + R * 0.6); ctx.stroke();
  }
  function drawArrows(ctx, V, z, dx, dy, col, tsec) {
    ctx.save();
    ctx.beginPath(); ctx.rect(V.x(z.x1), V.y(z.y2), (z.x2 - z.x1) * V.px, (z.y2 - z.y1) * V.px); ctx.clip();
    ctx.strokeStyle = col; ctx.lineWidth = 2;
    const step = 0.9, off = ((tsec * 0.9) % step);
    for (let gx = z.x1 - step; gx < z.x2 + step; gx += step) {
      for (let gy = z.y1 + 0.4; gy < z.y2; gy += 0.8) {
        const x = gx + dx * off, y = gy + dy * off;
        const X = V.x(x), Y = V.y(y), l = 8;
        ctx.beginPath(); ctx.moveTo(X - dx * l, Y + dy * l); ctx.lineTo(X + dx * l, Y - dy * l);
        ctx.lineTo(X + dx * l - (dx ? dx * 4 : 4), Y - dy * l + (dy ? dy * 4 : -4));
        ctx.moveTo(X + dx * l, Y - dy * l);
        ctx.lineTo(X + dx * l - (dx ? dx * 4 : -4), Y - dy * l + (dy ? dy * 4 : 4)); ctx.stroke();
      }
    }
    ctx.restore();
  }
  function pushResist(b) {
    let v = 1;
    const ty = typeOfBall(b);
    if (ty === "defense") v *= 0.4;
    if (b.guard) v *= 0.5;
    return v;
  }

  /* ══════════ M.env（mbr-core.js の step / shotMods から呼ばれる）══════════ */
  function zonesOf(S, M) { return S.def.zones(S, M.envT || 0, M) || []; }
  const ENV = {
    fric(M, b) {
      const S = M.stage; if (!S) return 1;
      let f = 1;
      zonesOf(S, M).forEach((z) => {
        if (z.kind === "ward") { if (B.dist(b, { x: z.cx, y: z.cy }) <= z.r) f *= z.fric; return; }
        if (!inRect(b, z)) return;
        if (z.fric) f *= z.fric;
        if (z.frontFric && b.vy > 0 && b._phaseId !== "egate") f *= z.frontFric;
      });
      return f;
    },
    accel(M, b, nv) {
      const S = M.stage; if (!S || b.frozen) return;
      zonesOf(S, M).forEach((z) => {
        if (z.kind === "ward" || !inRect(b, z)) return;
        if (z.barrier && trickPhase(b, "egate")) return;
        if (z.ax || z.ay) {
          /* 速い球ほど流されにくい（POWER の速球は影響が小さい）*/
          const k = nv > 5 ? 0.6 : 1;
          b.vx += z.ax * k * B.DT; b.vy += z.ay * k * B.DT;
        }
      });
      if (S.def.touch) S.def.touch(S, M, b);
    },
    collide(M, bs, r) {
      const S = M.stage; if (!S) return;
      const obs = S.def.obstacles(S, M.envT || 0, M);
      for (let i = 0; i < bs.length; i++) {
        const b = bs[i];
        if (b.dead) continue;
        for (let k = 0; k < obs.length; k++) {
          const ob = obs[k];
          if (ob.barrier && !b.jack && trickPhase(b, ob.id)) continue;
          const res = ob.t === "c" ? hitCircle(b, ob, r) : hitSeg(b, ob, r);
          if (!res) continue;
          if (b.frozen) { b.vx = 0; b.vy = 0; continue; }
          if (res.speed > 0.2) { b.banks = (b.banks || 0) + (ob.kind === "core" || ob.kind === "weak" ? 0 : 1); }
          if (S.def.collideExtra) S.def.collideExtra(S, M, b, ob);
          const key = ob.id;
          b._cd = b._cd || {};
          if (res.speed < minHitV(M, b) || (b._cd[key] || -9) > (M.envT || 0)) continue;
          b._cd[key] = (M.envT || 0) + 0.25;
          if (!M.isSim) {
            M.fx.push({ t: "tap", x: b.x, y: b.y, v: res.speed });
            if (isPushed(M, b) && (ob.kind === "core" || ob.kind === "weak")) pop(M, T("PUSH HIT!", "PUSH HIT!"), T("押し出した球がボスに命中（×" + PUSH_MUL + "）", "A pushed ball hit the boss (×" + PUSH_MUL + ")"), "#ffd257");
            S.def.onHit(S, M, b, ob, res);
          }
        }
      }
    },
    shot(M, side, ch, o) {
      const S = M.stage; if (!S || !S.def.shot) return;
      S.def.shot(S, M, side, ch, o);
    },
  };
  /* TRICK の CURVE・SPLIT で投げた球は、<b>最初に出会った障壁1つだけ</b>すり抜ける（その1投のあいだ） */
  function trickPhase(b, id) {
    if (typeOfBall(b) !== "trick" || !b.mods || !(b.mods.curve > 0 || b.mods.split)) return false;
    if (b._phaseId) return b._phaseId === id;
    b._phaseId = id;
    return true;
  }

  /* ══════════ 試合の組み立て ══════════ */
  function setup(M, stageId, diff) {
    const def = BY_ID[stageId] || STAGES[0];
    const D = def.diffs[diff] || def.diffs.low;
    const S = { def, id: def.id, diff, D, hp: D.hp, maxHp: D.hp, turn: 0, dealt: 0, log: [], shotsMax: D.shots };
    def.init(S);
    M.stage = S; M.env = ENV; M.envT = 0;
    M.left = { red: D.shots, blue: 0 };
    M.phase = "play"; M.turn = "red"; M.hints = [];
    const r = B.ballR(M);
    M.balls.push({ id: "jack", side: "", jack: true, x: def.jack.x, y: def.jack.y, vx: 0, vy: 0, mass: 1, baseMass: 1,
                   fric: 1, dead: 0, events: [], charId: "", banks: 0, roll: 0, r });
    log(S, J(L(def.boss) + " が現れた！", L(def.boss) + " appears!"), def.c);
    return S;
  }
  /* 1投が終わったあと（ボールが止まった）。{ win, lose, anim } */
  function turnEnd(M) {
    const S = M.stage; if (!S) return {};
    S.turn++;
    /* SUPPORT：止まった位置のまわりの味方を GUARD に */
    const last = M.balls.filter((b) => !b.jack && b.side === "red").slice(-1)[0];
    if (last && !last.dead && typeOfBall(last) === "support") {
      redBalls(M).forEach((o) => { if (o !== last && B.dist(o, last) <= 1.2 && !o.guard) { o.guard = 1; o.mass = Math.max(o.mass || 1, 1.25); } });
    }
    /* コートに残る自分のボールは KEEP_BALLS 個まで（古い順に片づける・凍結中は残す）
       ★ 6個にすると自分のボールで通り道がふさがり、ボスまで届かない投球が続いた（実測）ので3個にした。 */
    let reds = M.balls.filter((b) => !b.jack && b.side === "red" && !b.dead);
    while (reds.length > KEEP_BALLS) {
      const drop = reds.find((b) => !b.frozen) || reds[0];
      M.balls = M.balls.filter((b) => b !== drop);
      reds = reds.filter((b) => b !== drop);
    }
    M.balls.forEach((b) => { b._cd = {}; b._phaseId = null; b._pan = -1; b.bossHits = 0; });
    if (S.hp <= 0) return { win: true };
    const r = S.def.turnEnd(S, M) || {};
    if (S.hp <= 0) return { win: true };
    if ((M.left.red | 0) <= 0) return { lose: true, anim: false };
    return { anim: !!r.anim };
  }
  function hudHTML(M) {
    const S = M.stage; if (!S) return "";
    const def = S.def;
    const pct = Math.max(0, Math.round(S.hp / S.maxHp * 100));
    return '<div class="stghud" style="--sc:' + def.c + '">'
      + '<div class="stgtop"><span class="stgnm">' + esc(L(def.boss)) + '</span><span class="stgdf" style="background:' + DIFF[S.diff].c + '">' + L(DIFF[S.diff]) + "</span>"
      + '<span class="stgshots">' + J("残り ", "Shots ") + "<b>" + Math.max(0, M.left.red | 0) + "</b>/" + S.shotsMax + "</span></div>"
      + '<div class="stghp"><i style="width:' + pct + '%"></i><span>HP ' + Math.ceil(S.hp) + " / " + S.maxHp + "</span></div>"
      + '<div class="stglines">' + def.hud(S, M).map((l) => "<div>" + l + "</div>").join("") + "</div>"
      + (S.log.length ? '<div class="stglog" style="color:' + S.log[0].c + '">▶ ' + esc(S.log[0].tx) + "</div>" : "")
      + "</div>";
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
  function drawUnder(ctx, M, V, tsec) { const S = M.stage; if (S) S.def.draw(ctx, S, M, V, tsec); }
  function drawOver(ctx, M, V, tsec) {
    const S = M.stage; if (!S) return;
    B.live(M).forEach((b) => {
      if (!b.frozen) return;
      const X = V.x(b.x), Y = V.y(b.y), R = B.ballR(M) * V.px;
      ctx.save();
      ctx.strokeStyle = "#dff6ff"; ctx.lineWidth = 3; ctx.shadowColor = "#9ee6ff"; ctx.shadowBlur = 12;
      for (let k = 0; k < 6; k++) {
        const a = k * Math.PI / 3 + tsec * 0.4;
        ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X + Math.cos(a) * R * 1.5, Y + Math.sin(a) * R * 1.5); ctx.stroke();
      }
      ctx.fillStyle = "rgba(158,230,255,.35)"; ctx.beginPath(); ctx.arc(X, Y, R * 1.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = "bold 11px sans-serif"; ctx.fillText("❄" + b.frozenT, X + R, Y - R);
      ctx.restore();
    });
  }

  /* ══════════ 進みぐあい（mbr_v1 の stages）と報酬 ══════════ */
  function progress() { const s = B.load(); if (!s.stages || typeof s.stages !== "object") s.stages = {}; return s.stages; }
  function record(stageId, diff, win, used) {
    const P = progress(); const k = stageId + ":" + diff;
    const cur = P[k] || { clear: false, tries: 0, best: 0 };
    cur.tries = (cur.tries | 0) + 1;
    let first = false, gems = 0;
    if (win) {
      first = !cur.clear;
      cur.clear = true;
      cur.best = cur.best ? Math.min(cur.best, used) : used;
      /* ★ ジェムは<b>初回クリアだけ</b>（💎は課金通貨と同じ価値なので、周回で増えないようにする）。
         migrateOnce は同じ tag で二度と足さない＝別の端末・同期のやり直しでも二重にならない。 */
      try {
        if (window.XEVA && XEVA.gem && XEVA.gem.migrateOnce("mbr-stage:" + k, DIFF[diff].gems, "MagiBocciaRush BOSS STAGE 初回クリア（" + stageId + "・" + DIFF[diff].ja + "）")) gems = DIFF[diff].gems;
      } catch (e) {}
    }
    P[k] = cur;
    B.save();
    return { first, gems };
  }

  window.MBRStage = { STAGES, BY_ID, DIFF, DIFF_KEYS, TYPE_EFFECT, ADV_MUL, ELEM_ADV, setup, turnEnd, hudHTML, drawUnder, drawOver, progress, record };
})();
