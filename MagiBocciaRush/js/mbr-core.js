/* ══════════════════════════════════════════════════════════════
   MagiBocciaRush — ゲームの中身（v4・2026-09-17 全面刷新）
   ──────────────────────────────────────────────────────────────
   「本格的なボッチャ × 引っぱりショット × キャラクター固有能力 × 演出」

   ★ ファイルの分担
       mbr-core.js   … ここ。<b>計算だけ</b>（キャラの性能・物理・ルール・得点・CPU・保存）。
                       画面にはさわらない。図鑑（mb-char-detail.js）やガチャの紹介アニメからも読む。
       mbr-fx.js     … 演出（カットイン・衝突の火花・コンボ表示・専用ボールの絵）
       mbr-ui.js     … 画面（ホーム・編成・試合・結果…）と引っぱり操作
       mbr-online.js … 部屋番号のオンライン対戦（相互検証つきロックステップ）

   ★ 単位は<b>メートルと秒</b>。ピクセルへの変換は mbr-ui.js だけ。

   ★★ 既存のガチャ・キャラクターデータは<b>さわらない</b>（ご指定）。
     ボッチャ用の性能は mb-core.js の CHARS から<b>式で</b>作る＝キャラが増えても
     このファイルに何も足さなくてよい。足りない情報（型・スキル・ボール・ボイス・
     ストーリー）は<b>ここで拡張データとして</b>組み立て、元のデータには書きこまない。

   ★★ バランスの優先順位（ご指定）
       1. プレイヤーの操作技術  2. 状況判断と戦略  3. 編成  4. キャラ固有能力
     そのために
       ・6つの能力の<b>合計はどのキャラも同じ（396）</b>。レアリティで合計は増えない。
         ちがうのは<b>配分</b>だけ（得意が高いぶん、苦手がはっきり低い）。
       ・特殊ショットは<b>1エンド1回</b>、アルティメットは<b>ゲージ100＋1エンド1回</b>。
       ・壁反射・押し出し・ジャック干渉・コンボの効果には<b>上限</b>がある。
       ・ルール準拠モード（ランクマッチ）は<b>能力の効き 1/3・スキルなし・壁なし</b>。

   ★★ オンラインの決定論（mbr-online.js と対）
     物理の1ステップは <b>四則演算と Math.sqrt だけ</b>で書く（sin/cos/atan2/hypot を使わない）。
     sqrt は IEEE 754 で「正しく丸める」ことが決まっているので、どの端末でも同じ値になる。
     角度は投げる側が<b>方向ベクトル（小数6桁に丸めたもの）</b>にして送る。
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  /* ══════════ ① コートと物理の定数 ══════════ */
  const COURT = { W: 6.0, L: 12.5, VLINE: 3.0, CROSS: 5.0, BOXD: 2.5, BOXES: 6 };
  const BALL_R_REAL = 0.043;
  /* ★★ 2026-09-17 0.135 → 0.23。スマホの縦画面でコートを描くと 1m ≒ 43px しかなく、
     0.135m では<b>直径12pxの粒</b>になって、キャラのエンブレムも見えなかった。
     （ルール準拠モードは ×0.78 で実物の比率に少し寄せる） */
  const BALL_R_PLAY = 0.26;   /* ★ 2026-09-17b さらに少し大きく（ご指定） */
  /* 摩擦の減速（m/s²）。転がる距離は v²/(2a)。
     ★ 2026-09-09 に 3.4 → 3.8。CPU の見積もりも UI の目安もこれを見る。 */
  const FRICTION_A = 3.8;
  const RESTITUTION = 0.86;
  const WALL_REST = 0.62;
  const V_MAX = 9.6;
  const V_MIN = 1.2;
  const STOP_V = 0.045;
  const DT = 1 / 120;
  const CURVE_A = 1.55;          /* CURVE の横向きの加速度（m/s²） */
  const GUARD_MASS = 1.65;       /* GUARD のボールは「重い」＝押されにくい */
  const CHAIN_WINDOW = 2.2;      /* コンボの次の1手までの猶予（秒） */
  const CHAIN_MAX = 4;           /* Tactical Chain の上限 */
  const GAUGE_MAX = 100;
  const GAUGE_PER_THROW_CAP = 40;/* 1投で増えるゲージの上限 */

  const sqrt = Math.sqrt;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const q6 = (v) => Math.round(v * 1e6) / 1e6;
  const q5 = (v) => Math.round(v * 1e5) / 1e5;

  /* ══════════ ② 乱数（シードつき）══════════ */
  function mkRand(seed) {
    let s = (seed >>> 0) || 88675123;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }
  /* 文字列 → 32bit（キャラごとの「くせ」を毎回同じに決めるため） */
  function fnv(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  }

  /* ══════════ ③ キャラクターの型（7つ）══════════
     main … いちばん伸びる能力 ／ sub … 次に伸びる ／ weak … はっきり低い（短所） */
  const TYPES = {
    power:     { ja: "POWER",     nm: "パワー",     c: "#ff3b52", main: "power", sub: "bounce", weak: "control",
      d: { ja: "強力な衝突が得意。相手のボールを弾き出す。代わりに精度は荒い。", en: "Big collisions — blasts opposing balls out. Less precise." } },
    technique: { ja: "TECHNIQUE", nm: "テクニック", c: "#3fa9ff", main: "control", sub: "friction", weak: "power",
      d: { ja: "狙ったところへ正確に置く。押し合いの力は弱い。", en: "Places the ball exactly where you aim. Weak in shoving matches." } },
    bounce:    { ja: "BOUNCE",    nm: "バウンス",   c: "#ff8a2a", main: "bounce", sub: "power", weak: "friction",
      d: { ja: "壁反射を使った戦術が得意。止まりにくいのが短所。", en: "Masters bank shots off the rails. Hard to stop short." } },
    jack:      { ja: "JACK",      nm: "ジャック",   c: "#ffd257", main: "jack", sub: "control", weak: "bounce",
      d: { ja: "ジャックボールへの干渉が得意。壁を使うのは苦手。", en: "Moves the jack to rewrite the end. Poor off the rails." } },
    defense:   { ja: "DEFENSE",   nm: "ディフェンス", c: "#8e6bff", main: "friction", sub: "jack", weak: "power",
      d: { ja: "味方のボールを守る配置が得意。自分から崩す力は弱い。", en: "Builds guards around your balls. Little knock-out power." } },
    support:   { ja: "SUPPORT",   nm: "サポート",   c: "#2fd18c", main: "charge", sub: "control", weak: "jack",
      d: { ja: "ゲージをためて味方を補助する。ジャックへの干渉は弱い。", en: "Builds gauge and boosts teammates. Weak on the jack." } },
    trick:     { ja: "TRICK",     nm: "トリック",   c: "#ff5dd2", main: "charge", sub: "bounce", weak: "control",
      d: { ja: "曲がる・分かれるなど変則ショットが得意。まっすぐは苦手。", en: "Curves, splits and odd angles. Unreliable on straight lines." } },
  };
  const TYPE_KEYS = Object.keys(TYPES);
  const STAT_KEYS = ["power", "control", "friction", "bounce", "jack", "charge"];
  const STAT_NM = {
    power:    { en: "POWER",        ja: "パワー",       d: { ja: "ショットの威力", en: "Shot strength" } },
    control:  { en: "CONTROL",      ja: "コントロール", d: { ja: "方向と精度の安定", en: "Aim stability" } },
    friction: { en: "FRICTION",     ja: "フリクション", d: { ja: "減速・止まりやすさ", en: "How readily it stops" } },
    bounce:   { en: "BOUNCE",       ja: "バウンス",     d: { ja: "壁反射のあとの勢い", en: "Speed kept off the rails" } },
    jack:     { en: "JACK",         ja: "ジャック",     d: { ja: "ジャックへの干渉力", en: "Influence on the jack" } },
    charge:   { en: "SKILL CHARGE", ja: "スキルチャージ", d: { ja: "スキルゲージのたまりやすさ", en: "Gauge gain rate" } },
  };
  const STAT_SUM = 396;          /* 6能力の合計（どのキャラも同じ） */

  /* ══════════ ④ ショット・スキルの台帳 ══════════
     ★ 効果は<b>ここに書いた数字だけ</b>で決まる（UI の説明もここから作る）。 */
  const SPECIALS = {
    straight: { en: "STRAIGHT", ja: "ストレート", c: "#7cd4ff", uses: 1, cost: 0,
      d: { ja: "ブレを <b>75%</b> 減らし、転がりもまっすぐ（摩擦 -8%）。", en: "Scatter -75% and a truer roll (friction -8%)." } },
    bank:     { en: "BANK",     ja: "バンク",     c: "#ff8a2a", uses: 1, cost: 0,
      d: { ja: "壁で失う勢いが小さい（反発 <b>×1.35</b>・最大0.95）。反射のたびゲージ +4。", en: "Loses less speed off rails (×1.35, max 0.95). +4 gauge per bank." } },
    curve:    { en: "CURVE",    ja: "カーブ",     c: "#ff5dd2", uses: 1, cost: 0,
      d: { ja: "投げてから <b>0.9秒</b>、コートの中央へ向かって曲がる。", en: "Bends toward the court centre for 0.9s." } },
    powerhit: { en: "POWER HIT", ja: "パワーヒット", c: "#ff3b52", uses: 1, cost: 15,
      d: { ja: "最大の強さ <b>+12%</b>、相手への押し出し <b>×1.25</b>、GUARD を解除。ゲージ15を使う。", en: "+12% max power, ×1.25 push, breaks GUARD. Costs 15 gauge." } },
    softstop: { en: "SOFT STOP", ja: "ソフトストップ", c: "#2fd18c", uses: 1, cost: 0,
      d: { ja: "遅くなるほどよく止まる（1.2m/s 以下で減速 <b>×1.7</b>）。当たりは弱い（×0.85）。", en: "Brakes hard once slow (×1.7 under 1.2m/s). Softer contact (×0.85)." } },
    jackpush: { en: "JACK PUSH", ja: "ジャックプッシュ", c: "#ffd257", uses: 1, cost: 15,
      d: { ja: "ジャックへの押し出し <b>×1.45</b>。ゲージ15を使う。", en: "×1.45 push on the jack. Costs 15 gauge." } },
    guard:    { en: "GUARD",    ja: "ガード",     c: "#8e6bff", uses: 1, cost: 0,
      d: { ja: "止まったボールが<b>GUARD</b>になり、このエンドのあいだ押されにくい（重さ ×1.65）。", en: "The ball becomes a GUARD for the end (mass ×1.65)." } },
    split:    { en: "SPLIT",    ja: "スプリット", c: "#b06bff", uses: 1, cost: 10,
      d: { ja: "最初に当てたあと、<b>横向きの勢いを35%残して</b>2つ目を狙える。ゲージ10を使う。", en: "Keeps 35% sideways speed after the first hit to reach a second ball. Costs 10." } },
  };
  /* ══ ★★ 2026-09-19 技を増やした（ご指定「キャラの強みをそれぞれ出す・それぞれ違う組み合わせに」）══ */
  Object.assign(SPECIALS, {
    pinpoint:   { en: "PINPOINT", ja: "ピンポイント", c: "#9fe7ff", uses: 1, cost: 0,
      d: { ja: "ブレ <b>-50%</b>、予測 <b>+35%</b>。そのかわり最大の強さ -6%。", en: "Scatter -50%, preview +35%, but max power -6%." } },
    heavy:      { en: "HEAVY SHOT", ja: "ヘビーショット", c: "#c0504d", uses: 1, cost: 10,
      d: { ja: "ボールが重く（<b>×1.35</b>）、押し出し ×1.10。少し止まりやすい。ゲージ10を使う。", en: "Ball mass ×1.35, push ×1.10, slightly more braking. Costs 10." } },
    longdrive:  { en: "LONG DRIVE", ja: "ロングドライブ", c: "#4fc3f7", uses: 1, cost: 0,
      d: { ja: "減速 <b>-15%</b>・最大の強さ +5%。遠くまで転がる。", en: "Braking -15%, max power +5% — rolls much farther." } },
    draw:       { en: "DRAW", ja: "ドロー", c: "#7e57c2", uses: 1, cost: 0,
      d: { ja: "最初に何かへ当たった瞬間、自分の球の勢いが <b>30%</b> に落ちる（当てた場所の近くに残る）。", en: "On first contact your ball drops to <b>30%</b> speed and stays near the impact." } },
    follow:     { en: "FOLLOW", ja: "フォロー", c: "#ef6c00", uses: 1, cost: 10,
      d: { ja: "最初に当てたあと、当たる前の勢いを <b>45%</b> 足して前へ押しこむ。ゲージ10を使う。", en: "After the first hit, adds back <b>45%</b> of the pre-impact speed. Costs 10." } },
    cushion:    { en: "CUSHION", ja: "クッション", c: "#8d6e63", uses: 1, cost: 0,
      d: { ja: "壁での跳ね返り <b>×0.55</b>。壁ぎわにぴたりと止める。", en: "Rail rebound ×0.55 — stops tight to the rail." } },
    jackkiss:   { en: "KISS SHOT", ja: "キスショット", c: "#f48fb1", uses: 1, cost: 0,
      d: { ja: "ジャックへの押し出し ×0.6・遅いほどよく止まる。ジャックに<b>そっと寄りそう</b>。", en: "Jack push ×0.6 plus soft braking — nestle up against the jack." } },
    doublebank: { en: "DOUBLE BANK", ja: "ダブルバンク", c: "#ffab40", uses: 1, cost: 15,
      d: { ja: "<b>最初の2回</b>の反射で勢いを失わない（反発 0.95）。ゲージ15を使う。", en: "The first <b>two</b> banks lose no speed (0.95). Costs 15." } },
  });
  /* ★★ 2026-09-19 型ごとの候補を増やした（特殊ショットは<b>先頭が看板＋残り5つから1つ</b>、アクティブ・パッシブは6つから1つ）。
     型あたり 5×6×6＝180 通り。<b>全キャラで同じ組み合わせにならない</b>よう buildRoster で割りあてる。 */
  const SPECIAL_POOL = {
    power:     ["powerhit", "straight", "split", "heavy", "follow", "longdrive"],
    technique: ["straight", "softstop", "curve", "pinpoint", "draw", "jackkiss"],
    bounce:    ["bank", "curve", "powerhit", "doublebank", "cushion", "longdrive"],
    jack:      ["jackpush", "softstop", "straight", "jackkiss", "pinpoint", "draw"],
    defense:   ["guard", "softstop", "straight", "heavy", "draw", "cushion"],
    support:   ["guard", "jackpush", "softstop", "pinpoint", "follow", "jackkiss"],
    trick:     ["curve", "split", "bank", "follow", "doublebank", "draw"],
  };
  const ACTIVES = {
    impactbreaker: { en: "Impact Breaker", ja: "インパクト・ブレイカー",
      d: { ja: "この1投、相手ボールへの押し出し <b>×1.20</b>（3m/s 以上で当てたとき）。", en: "This throw: ×1.20 push when hitting at 3m/s+." } },
    overdrive:     { en: "Overdrive", ja: "オーバードライブ",
      d: { ja: "この1投、最大の強さ <b>+12%</b>。", en: "This throw: +12% max power." } },
    perfectline:   { en: "Perfect Line", ja: "パーフェクト・ライン",
      d: { ja: "この1投、軌道予測が<b>止まる位置まで</b>見える。", en: "This throw: full preview to the stop point." } },
    steadyhand:    { en: "Steady Hand", ja: "ステディ・ハンド",
      d: { ja: "この1投、<b>ブレがゼロ</b>。", en: "This throw: zero scatter." } },
    crimsonrebound:{ en: "Crimson Rebound", ja: "クリムゾン・リバウンド",
      d: { ja: "この1投、壁に当たったあと <b>0.8秒</b> 減速 -25%（コントロールしやすい勢い）。", en: "This throw: -25% braking for 0.8s after a bank." } },
    mirrorrail:    { en: "Mirror Rail", ja: "ミラー・レール",
      d: { ja: "この1投、壁の反発 <b>+0.15</b>（最大0.95）＋反射まで予測が伸びる。", en: "This throw: rail rebound +0.15 (max .95) and longer preview." } },
    jackresonance: { en: "Jack Resonance", ja: "ジャック・レゾナンス",
      d: { ja: "この1投、ジャックに触れると <b>ゲージ +20</b>、押し出し ×1.15。", en: "This throw: touching the jack gives +20 gauge and ×1.15 push." } },
    jacklock:      { en: "Jack Lock", ja: "ジャック・ロック",
      d: { ja: "次に自分が投げるまで、<b>相手がジャックを動かす力が半分</b>。", en: "Until your next throw, opponents move the jack half as far." } },
    guardfield:    { en: "Guard Field", ja: "ガード・フィールド",
      d: { ja: "いまジャックから <b>1m 以内</b>にある味方ボールを GUARD にする（このエンド）。", en: "Your balls within 1m of the jack become GUARDs this end." } },
    ironwall:      { en: "Iron Wall", ja: "アイアン・ウォール",
      d: { ja: "この1投、止まったボールを GUARD にし、重さ <b>×1.9</b>。", en: "This throw's ball becomes a heavier GUARD (×1.9)." } },
    rallycall:     { en: "Rally Call", ja: "ラリー・コール",
      d: { ja: "<b>次の味方</b>のゲージ +20、ブレ -40%（次の1投）。", en: "Next teammate: +20 gauge and -40% scatter." } },
    tacticalread:  { en: "Tactical Read", ja: "タクティカル・リード",
      d: { ja: "この1投と<b>チームの次の1投</b>、止まる位置まで予測が見える。", en: "Full preview for this and the team's next throw." } },
    phantomspin:   { en: "Phantom Spin", ja: "ファントム・スピン",
      d: { ja: "この1投が<b>CURVE</b>になる（特殊ショットと重ねられる）。", en: "This throw also CURVEs (stacks with a special)." } },
    shocktap:      { en: "Shock Tap", ja: "ショック・タップ",
      d: { ja: "この1投で当てたボールは <b>1.2秒</b> 減速 ×1.6（SHOCK）。", en: "Balls you hit this throw brake ×1.6 for 1.2s (SHOCK)." } },
  };
  Object.assign(ACTIVES, {
    focusaim:   { en: "Focus Aim", ja: "フォーカス・エイム", d: { ja: "この1投、ブレ <b>-60%</b>・予測 +30%。", en: "This throw: scatter -60%, preview +30%." } },
    breakshot:  { en: "Break Shot", ja: "ブレイク・ショット", d: { ja: "この1投、押し出し <b>×1.15</b>・GUARD を解除。", en: "This throw: push ×1.15 and breaks GUARD." } },
    anchorshot: { en: "Anchor Shot", ja: "アンカー・ショット", d: { ja: "この1投のボールが重く（<b>×1.3</b>）、止まると GUARD（重さ ×1.45）。", en: "This throw's ball is heavier (×1.3) and becomes a GUARD (×1.45)." } },
    slipstream: { en: "Slipstream", ja: "スリップストリーム", d: { ja: "この1投、減速 <b>-20%</b>（奥まで届く）。", en: "This throw: braking -20% — reaches deep." } },
    brake:      { en: "Brake", ja: "ブレーキ", d: { ja: "この1投、遅くなるとよく止まり（SOFT）、減速 +10%。", en: "This throw: soft braking and +10% friction." } },
    railboost:  { en: "Rail Boost", ja: "レール・ブースト", d: { ja: "この1投、壁の反発 <b>×1.25</b>・反射のたびゲージ +4。", en: "This throw: rail rebound ×1.25 and +4 gauge per bank." } },
    chargeup:   { en: "Charge Up", ja: "チャージ・アップ", d: { ja: "この1投でたまるゲージ <b>×1.8</b>。", en: "This throw earns ×1.8 gauge." } },
    doubletap:  { en: "Double Tap", ja: "ダブル・タップ", d: { ja: "この1投、コンボの上限 +1・ゲージ +6。", en: "This throw: combo cap +1 and +6 gauge." } },
    guardsweep: { en: "Guard Sweep", ja: "ガード・スイープ", d: { ja: "この1投、GUARD を解除し、当てたボールを SHOCK（すぐ止まる）に。", en: "This throw breaks GUARD and SHOCKs balls it hits." } },
    splitburst: { en: "Split Burst", ja: "スプリット・バースト", d: { ja: "この1投が SPLIT になり、押し出し ×1.10。", en: "This throw also SPLITs, with ×1.10 push." } },
  });
  const ACTIVE_POOL = {
    power:     ["impactbreaker", "overdrive", "breakshot", "anchorshot", "guardsweep", "slipstream"],
    technique: ["perfectline", "steadyhand", "focusaim", "brake", "tacticalread", "chargeup"],
    bounce:    ["crimsonrebound", "mirrorrail", "railboost", "slipstream", "doubletap", "overdrive"],
    jack:      ["jackresonance", "jacklock", "focusaim", "brake", "chargeup", "tacticalread"],
    defense:   ["guardfield", "ironwall", "anchorshot", "brake", "focusaim", "rallycall"],
    support:   ["rallycall", "tacticalread", "chargeup", "doubletap", "focusaim", "jackresonance"],
    trick:     ["phantomspin", "shocktap", "splitburst", "guardsweep", "doubletap", "slipstream"],
  };
  const PASSIVES = {
    momentum:     { en: "Momentum", ja: "モメンタム",
      d: { ja: "4m/s 以上で相手に当てるとゲージ <b>+6</b>。", en: "+6 gauge when hitting an opponent at 4m/s+." } },
    heavyball:    { en: "Heavy Ball", ja: "ヘビーボール",
      d: { ja: "このキャラのボールは少し重い（<b>×1.10</b>）。", en: "This character's balls are slightly heavier (×1.10)." } },
    precisioncore:{ en: "Precision Core", ja: "プレシジョン・コア",
      d: { ja: "ブレが常に <b>-20%</b>。", en: "Always -20% scatter." } },
    allyfocus:    { en: "Ally Focus", ja: "アライ・フォーカス",
      d: { ja: "ジャックの 1.2m 以内に味方がいると、ブレ <b>-30%</b>。", en: "-30% scatter while an ally ball is within 1.2m of the jack." } },
    reboundcharge:{ en: "Rebound Charge", ja: "リバウンド・チャージ",
      d: { ja: "壁で反射するたびゲージ <b>+7</b>。", en: "+7 gauge on every bank." } },
    softrail:     { en: "Soft Rail", ja: "ソフト・レール",
      d: { ja: "壁に当たったあと、止まりやすくなる（減速 <b>×1.15</b>）。", en: "Brakes ×1.15 after hitting a rail." } },
    jacksense:    { en: "Jack Sense", ja: "ジャック・センス",
      d: { ja: "ジャックに触れるとゲージ <b>+10</b>。", en: "+10 gauge when touching the jack." } },
    jackgravity:  { en: "Jack Gravity", ja: "ジャック・グラビティ",
      d: { ja: "ジャックの <b>50cm 以内</b>で止まるとゲージ +8。", en: "+8 gauge when stopping within 50cm of the jack." } },
    anchor:       { en: "Anchor", ja: "アンカー",
      d: { ja: "このキャラのボールは押されにくい（重さ <b>×1.15</b>）。", en: "This character's balls resist pushes (mass ×1.15)." } },
    cover:        { en: "Cover", ja: "カバー",
      d: { ja: "このボールが触れた<b>味方のボール</b>を GUARD にする（重さ ×1.25）。", en: "Ally balls this ball touches become light GUARDs (×1.25)." } },
    teamlink:     { en: "Team Link", ja: "チーム・リンク",
      d: { ja: "ジャックの 1m 以内で止まると、<b>次の味方</b>のゲージ +8。", en: "Stopping within 1m of the jack gives the next teammate +8 gauge." } },
    morale:       { en: "Morale", ja: "モラール",
      d: { ja: "エンドで最初の1投のときゲージ <b>+10</b>。", en: "+10 gauge on your first throw of an end." } },
    comeback:     { en: "Comeback", ja: "カムバック",
      d: { ja: "相手がジャックに近いとき、<b>1エンド1回</b>ブレ -50%＋予測が最後まで。", en: "Once per end while behind: -50% scatter and a full preview." } },
    longroll:     { en: "Long Roll", ja: "ロング・ロール",
      d: { ja: "1投で <b>6m 以上</b>転がるとゲージ +8。", en: "+8 gauge when the ball rolls 6m or more." } },
    /* ★★ 2026-09-17d 花宴祭 アカツキだけのパッシブ */
    sakurabloom:  { en: "Sakura Bloom", ja: "サクラ・ブルーム",
      d: { ja: "ブレが常に <b>-25%</b>、ボールが少し重い（<b>×1.12</b>）、ボールやボスに当てるとゲージ <b>+6</b>。", en: "Always -25% scatter, slightly heavier balls (×1.12), +6 gauge when hitting a ball or boss." } },
    /* ★★ 2026-09-19 花宴祭 アヤネ・チハだけのパッシブ */
    hyoukamirror: { en: "Hyouka Mirror", ja: "ヒョウカ・ミラー",
      d: { ja: "ブレが常に <b>-30%</b>、壁の反発 <b>×1.10</b>、壁で反射するたびゲージ <b>+6</b>（3回まで）。", en: "Always -30% scatter, rail rebound ×1.10, +6 gauge per bank (up to 3)." } },
    shirahanaverse:{ en: "Shirahana Verse", ja: "シラハナ・ヴァース",
      d: { ja: "ブレが常に <b>-20%</b>、ボールが少し重い（<b>×1.10</b>）。ジャックの <b>50cm 以内</b>で止まるとゲージ <b>+10</b> ＆ GUARD になる。", en: "Always -20% scatter, heavier balls (×1.10). Stopping within 50cm of the jack gives +10 gauge and a GUARD." } },
    /* ★★ 2026-09-19e 花宴祭 ヒメリ・ホノカ／極煌祭 アズサだけのパッシブ */
    benisuzuring: { en: "Benisuzu Ring", ja: "ベニスズ・リング",
      d: { ja: "ブレが常に <b>-20%</b>。ジャックの <b>1m 以内</b>で止まると<b>次の味方</b>のゲージ <b>+12</b>、自分もゲージ <b>+6</b>。", en: "Always -20% scatter. Stopping within 1m of the jack gives the next teammate +12 gauge and yourself +6." } },
    abyssglow:    { en: "Abyss Glow", ja: "アビス・グロウ",
      d: { ja: "ブレが常に <b>-20%</b>。当てたボールは <b>SHOCK</b>（すぐ止まる）になり、当てるとゲージ <b>+5</b>。", en: "Always -20% scatter. Balls you hit become SHOCKed, and hitting gives +5 gauge." } },
    bluerosewaltz:{ en: "Blue Rose Waltz", ja: "ブルーローズ・ワルツ",
      d: { ja: "ブレが常に <b>-25%</b>、ボールが少し重い（<b>×1.08</b>）、壁の反発 <b>×1.15</b>、壁で反射するたびゲージ <b>+6</b>（3回まで）。", en: "Always -25% scatter, slightly heavier (×1.08), rail rebound ×1.15, +6 gauge per bank (up to 3)." } },
    /* ★★ 2026-09-19g 極彩祭 ココハだけのパッシブ */
    tsubakiumbrella:{ en: "Tsubaki Umbrella", ja: "ツバキ・アンブレラ",
      d: { ja: "ブレが常に <b>-25%</b>、ボールが重い（<b>×1.15</b>）。ジャックの <b>1m 以内</b>で止まるとゲージ <b>+8</b> ＆ GUARD になる。", en: "Always -25% scatter, heavier balls (×1.15). Stopping within 1m of the jack gives +8 gauge and a GUARD." } },
  };
  /* ══ ★★ 2026-09-17d <b>MagiBocciaRush でも最強</b>にするキャラ（ご指定）══
     ふつうは「能力の合計はどのキャラも同じ（STAT_SUM）」だが、<b>ここに書いたキャラだけ例外</b>。
     ★ 型・能力・スキルを式ではなく<b>この表で上書き</b>する（CHARS は触らない）。 */
  const SPECIAL_KIT = {
    akatsuki: { type: "power", grade: "UR",
      st: { power: 86, control: 82, friction: 74, bounce: 74, jack: 74, charge: 74 },
      specials: ["powerhit", "straight"], active: "steadyhand", passive: "sakurabloom" },
    /* ★★ 2026-09-19 花宴祭 追加2体（ご指定「MagiBocciaRush でも最強」）。合計 470＝アカツキ（464）より上。
       アヤネ＝ねらいと壁の技巧（technique）、チハ＝ジャックまわりの支配（jack）。3体とも役割が重ならない。 */
    ayane: { type: "technique", grade: "UR",
      st: { power: 76, control: 90, friction: 78, bounce: 80, jack: 74, charge: 72 },
      specials: ["straight", "pinpoint"], active: "focusaim", passive: "hyoukamirror" },
    chiha: { type: "jack", grade: "UR",
      st: { power: 74, control: 84, friction: 80, bounce: 72, jack: 88, charge: 72 },
      specials: ["jackpush", "jackkiss"], active: "jackresonance", passive: "shirahanaverse" },
    /* ★★ 2026-09-19e 花宴祭 ヒメリ（support）・ホノカ（trick）は合計 470、極煌祭 アズサ（bounce）は<b>476＝いちばん上</b>。 */
    himeri: { type: "support", grade: "UR",
      st: { power: 76, control: 86, friction: 76, bounce: 74, jack: 78, charge: 80 },
      specials: ["guard", "follow"], active: "rallycall", passive: "benisuzuring" },
    honoka: { type: "trick", grade: "UR",
      st: { power: 80, control: 84, friction: 76, bounce: 76, jack: 76, charge: 78 },
      specials: ["curve", "split"], active: "shocktap", passive: "abyssglow" },
    azusa: { type: "bounce", grade: "UR",
      st: { power: 80, control: 86, friction: 76, bounce: 90, jack: 72, charge: 72 },
      specials: ["bank", "doublebank"], active: "mirrorrail", passive: "bluerosewaltz" },
    /* ★★ 2026-09-19g 極彩祭 ココハ（defense）＝合計 <b>478</b>・いちばん上（ご指定「最強」） */
    kokoha: { type: "defense", grade: "UR",
      st: { power: 84, control: 86, friction: 80, bounce: 76, jack: 78, charge: 74 },
      specials: ["guard", "heavy"], active: "ironwall", passive: "tsubakiumbrella" },
  };
  Object.assign(PASSIVES, {
    steadybase: { en: "Steady Base", ja: "ステディ・ベース", d: { ja: "ブレ常に <b>-10%</b>・減速 +3%。", en: "Always -10% scatter and +3% braking." } },
    sprinter:   { en: "Sprinter", ja: "スプリンター", d: { ja: "最大の強さが常に <b>+5%</b>。", en: "Always +5% max power." } },
    grip:       { en: "Grip", ja: "グリップ", d: { ja: "減速が常に <b>+8%</b>（止めやすい）。", en: "Always +8% braking — easy to stop." } },
    glide:      { en: "Glide", ja: "グライド", d: { ja: "減速が常に <b>-7%</b>（よく転がる）。", en: "Always -7% braking — rolls farther." } },
    bumper:     { en: "Bumper", ja: "バンパー", d: { ja: "壁の反発が常に <b>×1.10</b>。", en: "Rail rebound always ×1.10." } },
    impact:     { en: "Impact", ja: "インパクト", d: { ja: "相手への押し出しが常に <b>×1.08</b>。", en: "Push on opposing balls always ×1.08." } },
    jacktouch:  { en: "Jack Touch", ja: "ジャック・タッチ", d: { ja: "ジャックへの押し出しが常に <b>×1.10</b>。", en: "Push on the jack always ×1.10." } },
    bulwark:    { en: "Bulwark", ja: "ブルワーク", d: { ja: "ボールが少し重く（×1.08）、ジャックの <b>50cm 以内</b>で止まると GUARD になる。", en: "Slightly heavier (×1.08); stopping within 50cm of the jack makes a GUARD." } },
    quickcharge:{ en: "Quick Charge", ja: "クイック・チャージ", d: { ja: "たまるゲージが常に <b>×1.15</b>。", en: "Always ×1.15 gauge." } },
    lastword:   { en: "Last Word", ja: "ラスト・ワード", d: { ja: "そのエンドで自分のチームの<b>最後の1球</b>のとき、ブレ -50%・予測が最後まで。", en: "On your team's <b>last ball</b> of the end: -50% scatter and a full preview." } },
    opener:     { en: "Opener", ja: "オープナー", d: { ja: "そのエンドで自分のチームの<b>最初の1球</b>のとき、ブレ -30%・予測が最後まで。", en: "On your team's <b>first ball</b> of the end: -30% scatter and a full preview." } },
    hunter:     { en: "Hunter", ja: "ハンター", d: { ja: "相手のボールに当てるたびゲージ <b>+5</b>（1投で2回まで）。", en: "+5 gauge per opposing ball hit (up to 2 per throw)." } },
    chainmaster:{ en: "Chain Master", ja: "チェイン・マスター", d: { ja: "コンボの上限 +1。コンボ×2 以上でゲージ <b>+6</b>。", en: "Combo cap +1; +6 gauge on a chain of 2+." } },
    railsense:  { en: "Rail Sense", ja: "レール・センス", d: { ja: "軌道の予測が常に <b>+20%</b> 長く見える。", en: "The preview is always 20% longer." } },
    calm:       { en: "Calm", ja: "カーム", d: { ja: "相手のほうがジャックに近いあいだ、ブレ <b>-20%</b>（何度でも）。", en: "While behind, -20% scatter (no limit)." } },
  });
  const PASSIVE_POOL = {
    power:     ["momentum", "heavyball", "impact", "sprinter", "hunter", "bulwark"],
    technique: ["precisioncore", "allyfocus", "steadybase", "lastword", "opener", "calm"],
    bounce:    ["reboundcharge", "softrail", "bumper", "railsense", "glide", "chainmaster"],
    jack:      ["jacksense", "jackgravity", "jacktouch", "bulwark", "opener", "lastword"],
    defense:   ["anchor", "cover", "bulwark", "grip", "steadybase", "calm"],
    support:   ["teamlink", "morale", "quickcharge", "opener", "hunter", "calm"],
    trick:     ["comeback", "longroll", "chainmaster", "glide", "railsense", "sprinter"],
  };
  /* アルティメット：効果は型で決まり、<b>技名はキャラのフルバーストの名前</b>を使う
     ＝ 同じ型でも「その子の必殺技」として出る。 */
  const ULTS = {
    power:     { en: "IMPACT NOVA",
      d: { ja: "この1投、最大の強さ <b>+18%</b>・押し出し ×1.35。最初に当てた点から <b>70cm</b> の衝撃波。", en: "+18% power, ×1.35 push, and a 70cm shockwave from the first impact." } },
    technique: { en: "ZERO LINE",
      d: { ja: "このキャラの<b>次の2投</b>、ブレゼロ＋止まる位置まで予測。", en: "This character's next 2 throws: zero scatter and a full preview." } },
    bounce:    { en: "INFINITE RAIL",
      d: { ja: "この1投、<b>最初の3回</b>の反射で勢いを失わない（反発 0.95）。反射ゲージ2倍。", en: "The first 3 banks lose no speed (0.95). Double bank gauge." } },
    jack:      { en: "JACK DOMINION",
      d: { ja: "この1投、ジャックへの押し出し <b>×1.8</b>。止まったあと、ジャックの 1.5m 以内の味方を GUARD に。", en: "×1.8 push on the jack; afterwards your balls within 1.5m of it become GUARDs." } },
    defense:   { en: "FORTRESS",
      d: { ja: "この1投のあと、<b>コート上の味方ボール全部</b>を GUARD にする（このエンド）。", en: "After this throw, every ally ball on court becomes a GUARD for the end." } },
    support:   { en: "SQUAD BOOST",
      d: { ja: "<b>チームの次の2投</b>、ゲージ +25・ブレ -40%・止まる位置まで予測。", en: "The team's next 2 throws: +25 gauge, -40% scatter, full preview." } },
    trick:     { en: "PHANTOM CHAIN",
      d: { ja: "この1投が CURVE＋SPLIT になり、当てたボールを SHOCK にする。コンボの上限 +1。", en: "CURVE + SPLIT, hits cause SHOCK, and the combo cap rises by 1." } },
  };

  /* ══════════ ⑤ キャラクターの組み立て ══════════ */
  function srcChars() {
    /* ★★ mb-core.js は <b>const</b> で CHARS を宣言しているので window.CHARS では取れない。 */
    try { return (typeof CHARS !== "undefined") ? CHARS : (window.CHARS || null); } catch (e) { return null; }
  }
  function norm(v, lo, hi) { return clamp((v - lo) / (hi - lo), 0, 1); }
  /* 型の決めかた（★ キャラが増えても<b>既存の子の型は変わらない</b>ように、
     そのキャラ自身の情報だけで決める。全体の人数で割りふる方式にはしない）
     ・MagiBurst の戦型（typeKey）ごとに<b>候補を2〜3つ</b>
     ・撃種（反射／貫通）で候補を少し寄せる
     ・最後は id の指紋（fnv）で選ぶ */
  const TYPE_BY_KEY = {
    balance: ["technique", "defense"],
    cannon:  ["power", "jack"],
    support: ["support", "defense"],
    trick:   ["trick", "technique"],
    striker: ["power", "bounce", "trick"],
    speed:   ["bounce", "jack"],
  };
  function typeOf(c, h) {
    let cand = TYPE_BY_KEY[c.typeKey];
    if (!cand) {
      const t = String(c.type || "");
      cand = /砲撃/.test(t) ? TYPE_BY_KEY.cannon : /支援/.test(t) ? TYPE_BY_KEY.support
        : /技巧/.test(t) ? TYPE_BY_KEY.trick : /スピード/.test(t) ? TYPE_BY_KEY.speed
        : /アタッカー/.test(t) ? TYPE_BY_KEY.striker : TYPE_BY_KEY.balance;
    }
    let pick = cand[h % cand.length];
    /* 反射の子は壁を使う型へ、貫通の子はまっすぐ系へ、ほんの少し寄せる */
    if (((h >>> 11) & 3) === 0) {
      if (c.shot === "reflect" && cand.indexOf("bounce") >= 0) pick = "bounce";
      if (c.shot === "pierce" && cand.indexOf("jack") >= 0) pick = "jack";
    }
    return pick;
  }
  function s5Of(id, c) {
    try { if (typeof isStar5 === "function") return !!isStar5(id); } catch (e) {}
    return !!(c && (c.gacha || c.fes || c.star5));
  }
  let ROSTER = null, ROSTER_N = -1, ROSTER_MAP = {};
  function buildRoster(force) {
    const CH = srcChars();
    if (!CH) return [];
    const ids = Object.keys(CH);
    if (!force && ROSTER && ROSTER_N === ids.length) return ROSTER;
    const out = [];
    ids.forEach((id) => {
      const c = CH[id];
      if (!c || !c.nm) return;
      const h = fnv(id);
      const raw = {
        hp: norm((c.hp && c.hp[1]) || 7800, 5300, 10600),
        atk: norm((c.atk && c.atk[1]) || 7700, 2200, 16200),
        spd: norm((c.spd && c.spd[1]) || 460, 340, 570),
      };
      const ty = typeOf(c, h);
      const T = TYPES[ty];
      /* 土台はみんな 62。MagiBurst のステータスで ±5 だけ色をつけ、型で大きく形を決める。 */
      const jig = (k) => ((((h >>> (STAT_KEYS.indexOf(k) * 4 + 1)) & 15) / 15) - 0.5) * 8;
      const ssT = clamp(c.ssTurns || 18, 8, 30);
      const st = {
        power: 62 + (raw.atk - 0.5) * 10 + jig("power"),
        control: 62 + (raw.hp - 0.5) * 10 + jig("control"),
        friction: 62 + (0.5 - raw.spd) * 10 + jig("friction"),
        bounce: 62 + (raw.spd - 0.5) * 8 + (c.shot === "reflect" ? 3 : 0) + jig("bounce"),
        jack: 62 + (raw.atk - 0.5) * 4 + (raw.spd - 0.5) * 4 + (c.shot === "pierce" ? 3 : 0) + jig("jack"),
        charge: 62 + (18 - ssT) * 0.6 + jig("charge"),
      };
      st[T.main] += 18; st[T.sub] += 8; st[T.weak] -= 18;
      /* ★ 合計を STAT_SUM にそろえる（配分だけが個性）。3回まわすと帯の端の丸めも吸収できる。 */
      for (let pass = 0; pass < 3; pass++) {
        let sum = 0; STAT_KEYS.forEach((k) => { sum += st[k]; });
        const d = (STAT_SUM - sum) / STAT_KEYS.length;
        STAT_KEYS.forEach((k) => { st[k] = clamp(st[k] + d, 40, 92); });
      }
      STAT_KEYS.forEach((k) => { st[k] = Math.round(st[k]); });
      let sum = 0; STAT_KEYS.forEach((k) => { sum += st[k]; });
      /* 丸めで残った差は main に寄せる（それでも帯を越えない範囲で） */
      if (sum !== STAT_SUM) st[T.main] = clamp(st[T.main] + (STAT_SUM - sum), 40, 92);

      /* 仮の組み合わせ（あとで assignKits が「重ならない組み合わせ」に置きなおす） */
      const sp = SPECIAL_POOL[ty];
      const specials = [sp[0], sp[1 + (h % (sp.length - 1))]];
      const active = ACTIVE_POOL[ty][(h >>> 5) % ACTIVE_POOL[ty].length];
      const passive = PASSIVE_POOL[ty][(h >>> 9) % PASSIVE_POOL[ty].length];
      const lux = !!c.shotskill;   /* 極彩祭・極煌祭・極華祭の子（ショットスキル持ち） */
      const r = {
        id, nm: c.nm, th: c.th || "", img: c.img || "", el: c.el || "fire", el2: c.el2 || "",
        /* ★★ 2026-09-19 レアリティは MagiBurst と<b>同じ判定</b>（isStar5＝ガチャ・フェス出身 or star5）。
           前は c.star5 だけを見ていたので、ガチャの SSR の多くが SR と表示されていた。 */
        star5: s5Of(id, c), rarity: s5Of(id, c) ? "SSR" : "SR",
        /* ★ ボールの見た目の格（性能には一切関係しない） */
        grade: lux ? "UR" : (s5Of(id, c) ? "SSR" : "SR"),
        type: ty, st, specials, active, passive,
        ult: { nm: c.ssName || ULTS[ty].en, kind: ty },
        h,
      };
      const SK = SPECIAL_KIT[id];
      if (SK) {
        r.type = SK.type; r.st = Object.assign({}, SK.st); r.specials = SK.specials.slice();
        r.active = SK.active; r.passive = SK.passive; r.grade = SK.grade || r.grade;
        r.ult = { nm: c.ssName || ULTS[SK.type].en, kind: SK.type };
        r.special = true;
      }
      out.push(r);
    });
    try {
      const NO = (typeof CHAR_NO !== "undefined") ? CHAR_NO : (window.CHAR_NO || null);
      if (NO) out.sort((a, b) => (NO[a.id] || 999) - (NO[b.id] || 999));
    } catch (e) {}
    assignKits(out);
    ROSTER = out; ROSTER_N = ids.length; ROSTER_MAP = {};
    out.forEach((x) => { ROSTER_MAP[x.id] = x; });
    return out;
  }
  /* ══ ★★ 2026-09-19 全キャラで「特殊ショット2つ＋アクティブ＋パッシブ」の組み合わせを重ねない ══
     ・図鑑の順（CHAR_NO）に1体ずつ、指紋 h から決まる番号を出発点にして、<b>まだ誰も使っていない組み合わせ</b>を探す。
     ・同じ型の中で「アクティブ」「パッシブ」の使われかたも均すため、使用回数の少ない候補から優先する。
     ・新しいキャラは図鑑の<b>後ろ</b>に並ぶので、既存のキャラの組み合わせは変わらない。
     ・SPECIAL_KIT（アカツキ）は専用なので先に「使用ずみ」にしておく。 */
  function assignKits(list) {
    const used = {}, cntA = {}, cntP = {}, cntS = {};
    const key = (c) => c.type + "|" + c.specials.join("+") + "|" + c.active + "|" + c.passive;
    list.forEach((c) => { if (c.special) used[key(c)] = 1; });
    list.forEach((c) => {
      if (c.special) return;
      const ty = c.type, SP = SPECIAL_POOL[ty], AP = ACTIVE_POOL[ty], PP = PASSIVE_POOL[ty];
      const nS = SP.length - 1, nA = AP.length, nP = PP.length, N = nS * nA * nP;
      const start = c.h % N;
      let best = null, bestScore = 1e9;
      for (let k = 0; k < N; k++) {
        const x = (start + k * 7) % N;              /* 7 は N（180）と互いに素＝全部をまわる */
        const s = x % nS, a = Math.floor(x / nS) % nA, p = Math.floor(x / (nS * nA)) % nP;
        const cand = { type: ty, specials: [SP[0], SP[1 + s]], active: AP[a], passive: PP[p] };
        if (used[key(cand)]) continue;
        const score = (cntA[ty + AP[a]] || 0) + (cntP[ty + PP[p]] || 0) + (cntS[ty + SP[1 + s]] || 0) * 0.5;
        if (score < bestScore) { bestScore = score; best = cand; }
        if (bestScore === 0) break;
      }
      if (!best) return;                            /* 候補を使い切った（型に180体超）ときは仮の組み合わせのまま */
      c.specials = best.specials; c.active = best.active; c.passive = best.passive;
      used[key(best)] = 1;
      cntA[ty + best.active] = (cntA[ty + best.active] || 0) + 1;
      cntP[ty + best.passive] = (cntP[ty + best.passive] || 0) + 1;
      cntS[ty + best.specials[1]] = (cntS[ty + best.specials[1]] || 0) + 1;
    });
  }
  function charOf(id) {
    if (!ROSTER) buildRoster();
    return ROSTER_MAP[id] || null;
  }
  const ELEM_C = { fire: "#ff5d47", wood: "#2fbf71", water: "#38a6ff", light: "#f0b429", dark: "#a86bff" };
  const ELEM_JA = { fire: "火", wood: "木", water: "水", light: "光", dark: "闇" };

  /* ══ ボイス（文字のせりふ。設定で読み上げもできる）══
     ★ 本物の声の素材は無いので、<b>キャラごとに毎回同じ</b>組み合わせを選ぶ。
       新キャラ告知のキャッチコピー（MB_NEW_CHARS.catch）があれば、それを看板のせりふにする。 */
  const VOICE = {
    enter: {
      power: ["全部まとめて、弾き飛ばす！", "力で道をこじ開ける。", "いっくよー、フルパワー！"],
      technique: ["狙いは、もう決まってる。", "1cm の差で勝つよ。", "ここに置けば、終わり。"],
      bounce: ["壁も、わたしの味方。", "角度は計算済み！", "跳ねて、届け。"],
      jack: ["その白いの、動かしちゃおうか。", "目標ごと、書き換える。", "ジャックはわたしが決める。"],
      defense: ["ここから先は通さない。", "守りきってみせる。", "固めていこう、落ち着いて。"],
      support: ["みんな、次はまかせたよ。", "流れを作るのがわたしの役目。", "準備はできてる、いつでも。"],
      trick: ["まっすぐ行くと思った？", "ちょっとだけ、ずるい軌道。", "見てて、面白くなるから。"],
    },
    hit: ["当たりっ！", "そこ、どいて！", "ナイスヒット！", "押し出した！"],
    jack: ["ジャック、いただき。", "近い、近い！", "ぴったり！"],
    ult: ["これが、わたしの全部！", "決めるよ――！", "見届けて。"],
    win: ["勝ったよ、みんな！", "作戦どおり。", "いい試合だったね。"],
    lose: ["次は負けない。", "……悔しい。", "もう一回、お願い。"],
  };
  function newCharCatch(id) {
    try {
      const T = window.MB_NEW_CHARS || [];
      for (let i = 0; i < T.length; i++) if (T[i].id === id) return T[i].catch || "";
    } catch (e) {}
    return "";
  }
  /* ★★ 2026-09-17d <b>キャラごとのボイスは廃止</b>（ご指定）。音声はチュートリアルのずんだもんだけ。
     voiceClip は<b>文字のせりふ</b>（カットインの吹き出し）だけを返し、src（音声）は付けない。
     ── 以下は 2026-09-17c の説明（キャラの声はもう鳴らさない）──
     ★★ 2026-09-17c 本物の声（VOICEVOX）。台本と話者の割り当ては js/mbr-voice.js（tools/make_voice.py が書き出す）。
     ・声の群＝MagiBurst の戦型（typeKey）。話者は群の候補から id の指紋で1人に決まる（キャラに合う声の性格を群ごとに選んである）。
     ・mbr-voice.js が読めないときは、これまでの文字だけのせりふに戻る。 */
  function voiceData() { const V = window.MBR_VOICE; return V && V.tutorial ? V : null; }
  function voiceGrp(c) {
    const V = voiceData(); if (!V) return "";
    if (V.charGrp && V.charGrp[c.id]) return V.charGrp[c.id];
    try { const CH = srcChars(); const k = CH && CH[c.id] && CH[c.id].typeKey; if (k && V.lines[k]) return k; } catch (e) {}
    return "balance";
  }
  function voiceSpk(c) {
    const V = voiceData(); if (!V) return 0;
    if (V.charSpk && V.charSpk[c.id]) return V.charSpk[c.id];
    const pool = V.groupSpk[voiceGrp(c)] || V.groupSpk.balance;
    return pool[fnv(c.id) % pool.length];
  }
  function voiceClip(c, kind, n) {
    if (!c) return null;
    const V = voiceData();
    if (!V || !V.lines) { const tx = voiceOfText(c, kind, n); return tx ? { tx } : null; }
    const sid = voiceSpk(c);
    if (kind === "enter" && !n && V.catch && V.catch.indexOf(c.id) >= 0) {
      const k = newCharCatch(c.id);
      if (k) return { tx: k, src: "voice/" + sid + "/c-" + c.id + ".m4a", spk: sid };
    }
    const g = voiceGrp(c);
    const pool = (V.lines[g] || V.lines.balance)[kind];
    if (!pool || !pool.length) return null;
    const i = (c.h + (n || 0) * 7 + kind.length) % pool.length;
    return { tx: pool[i], src: "voice/" + sid + "/" + g + "-" + kind + "-" + i + ".m4a", spk: sid };
  }
  function voiceOf(c, kind, n) { const v = voiceClip(c, kind, n); return v ? v.tx : ""; }
  function voiceCredit(c) {
    const V = voiceData(); if (!V || !c || !V.lines) return "";
    const nm = V.speakers[String(voiceSpk(c))];
    if (!nm) return "";
    const n2 = nm.replace(/（.*?）/g, "");
    return "VOICEVOX:" + (n2 === "もち子さん" ? "もち子(cv 明日葉よもぎ)" : n2);
  }
  function voiceCredits() { const V = voiceData(); return V ? V.credits || [] : []; }
  function tutClip(i) {
    const V = voiceData(); if (!V) return null;
    return { tx: V.tutorial[i] || "", src: "voice/" + V.tutSpk + "/tut-" + i + ".m4a", spk: V.tutSpk };
  }
  function voiceOfText(c, kind, n) {
    if (!c) return "";
    /* ★ 2026-09-17d せりふは日本語しか無いので、英語版では出さない */
    try { if (localStorage.getItem("xeva_lang_v1") === "en") return ""; } catch (e) {}
    const pool = kind === "enter" ? VOICE.enter[c.type] : VOICE[kind];
    if (!pool) return "";
    if (kind === "enter" && n === 0) { const k = newCharCatch(c.id); if (k) return k; }
    return pool[(c.h + (n || 0) * 7 + kind.length) % pool.length];
  }
  /* ══ キャラクター別ストーリー（熟練度で3話まで解放）══
     ★ 元データに物語は無いので、<b>そのキャラの属性・型・必殺技の名前</b>から組み立てる。 */
  function storyOf(c) {
    if (!c) return [];
    const el = ELEM_JA[c.el] || "";
    const ty = TYPES[c.type];
    const catchLine = newCharCatch(c.id);
    return [
      { need: 2, t: { ja: "第1話　はじめてのコート", en: "Ch.1 First Court" },
        b: { ja: c.nm + "は、" + el + "の魔力をボールに込める練習を続けていた。「" + (catchLine || voiceOf(c, "enter", 1)) + "」。"
            + ty.nm + "の型を選んだのは、自分の得意な「" + STAT_NM[ty.main].ja + "」を活かすためだった。",
             en: c.nm + " had been practising pouring " + el + " magic into a ball, choosing the " + ty.ja + " style to make the most of " + STAT_NM[ty.main].en + "." } },
      { need: 6, t: { ja: "第2話　苦手との向き合いかた", en: "Ch.2 Facing the Weak Spot" },
        b: { ja: "チームの先輩に言われた。「" + STAT_NM[ty.weak].ja + "が弱いなら、順番で補えばいい」。"
            + c.nm + "は、自分の前と後ろに立つ仲間のことを考えるようになった。",
             en: "\"If your " + STAT_NM[ty.weak].en + " is weak, cover it with the batting order,\" a senior said. " + c.nm + " began thinking about who throws before and after." } },
      { need: 12, t: { ja: "第3話　" + c.ult.nm, en: "Ch.3 " + c.ult.nm },
        b: { ja: "決勝のエンド、ゲージは満ちた。" + c.nm + "は息を整えて、必殺の「" + c.ult.nm + "」を放つ。"
            + "白いジャックの向こうに、仲間たちの声が聞こえた。",
             en: "Final end, gauge full. " + c.nm + " steadied their breath and unleashed \"" + c.ult.nm + "\"." } },
    ];
  }

  /* ══════════ ⑥ 育成（熟練度・ボール・称号）══════════
     ★ 性能差をつけすぎない（ご指定）。レベルで増えるのは<b>全能力 +1（5レベルごと・最大+3）</b>だけ。
       競技（ランク・オンライン）は<b>性能統一</b>が既定なので、この +3 も消える。 */
  const LV_MAX = 20;
  function lvOfXp(xp) { return clamp(Math.floor(sqrt(Math.max(0, xp) / 40)) + 1, 1, LV_MAX); }
  function xpForLv(lv) { return (lv - 1) * (lv - 1) * 40; }
  function lvBonus(lv) { return Math.min(3, Math.floor((lv || 1) / 5)); }
  /* ★★ 2026-09-17e <b>MagiBurst の凸（限界突破）も反映</b>（ご指定）。
     凸1つごとに全能力 +1（完凸＝4凸で +4）。レベルの +3 と同じ「育成」の扱いなので、
     性能統一（ランク・オンライン）では消え、cap では合わせて +1 まで。
     凸の数は試合を始めるときに cfg.awk へ写す（magiburst_v1 を読むのは UI 側）。 */
  const AWK_MAX = 4;
  function awkBonus(awk) { return clamp((awk | 0), 0, AWK_MAX); }
  const BALL_SKINS = [
    { k: "std",    g: "R",   need: 1,  ja: "スタンダード", en: "Standard" },
    { k: "emblem", g: "SR",  need: 3,  ja: "エンブレム",   en: "Emblem" },
    { k: "radiant",g: "SSR", need: 8,  ja: "レディアント", en: "Radiant", grade: "SSR" },
    { k: "prism",  g: "UR",  need: 14, ja: "プリズム",     en: "Prism", grade: "UR" },
  ];
  const GRADE_RANK = { SR: 1, SSR: 2, UR: 3 };
  function skinsOf(c, lv) {
    return BALL_SKINS.map((s) => {
      const gradeOk = !s.grade || (GRADE_RANK[c.grade] || 1) >= GRADE_RANK[s.grade];
      return Object.assign({}, s, { gradeOk, open: gradeOk && (lv || 1) >= s.need });
    });
  }
  const TITLES = [
    { need: 1, ja: "ROOKIE" }, { need: 5, ja: "REGULAR" }, { need: 10, ja: "ACE" },
    { need: 15, ja: "MASTER" }, { need: 20, ja: "LEGEND" },
  ];
  function titleOf(lv) { let t = TITLES[0]; TITLES.forEach((x) => { if (lv >= x.need) t = x; }); return t.ja; }

  /* ══════════ ⑦ モード ══════════
     ability … キャラクター能力モード（壁あり・スキルあり）
     rules   … ルール準拠モード（壁なし・デッドボール・スキルなし・能力の効き 1/3）
     growth  … unify（性能統一＝育成の +3 を消す）／ cap（+1 まで）／ full（+3 まで） */
  const MODES = {
    ability: { k: 1, skills: true, walls: true, ja: "キャラクター能力モード", en: "Ability mode" },
    /* ★★ 2026-09-17b <b>壁はどのモードでも反射する</b>（ご指定）。ルール準拠はスキルなし・能力の効き 1/3 だけ。 */
    rules:   { k: 0.34, skills: false, walls: true, ja: "ルール準拠モード", en: "Rules mode" },
    /* ★★ 2026-09-18 シンプルモード（ご指定）：キャラを編成せず、<b>全員が同じ能力</b>（k=0＝能力の差が0）。スキルなし。 */
    simple:  { k: 0, skills: false, walls: true, fricK: 1.12, ja: "シンプルモード", en: "Simple mode" },   /* ★ 2026-09-19 減速を少し強く（×1.12・ご指定） */
  };

  /* ══════════ ⑧ 試合の状態 ══════════ */
  const SIDES = ["red", "blue"];
  const other = (s) => (s === "red" ? "blue" : "red");
  /* ══ ★★ 2026-09-18 PARTY MATCH（1台で最大6色・ご指定）══
     ふつうの試合は M.cfg.sides が無い＝["red","blue"]。3色以上のときだけ下の一般化した分岐に入る。
     ★ 2色の試合は<b>乱数の消費順も含めて前とまったく同じ</b>（オンライン・リプレイ・中断の再開がずれない）。 */
  const PARTY_SIDES = ["red", "blue", "yellow", "green", "purple", "orange"];
  const SIDE_INFO = {
    red:    { en: "RED",    ja: "赤", c: "#ff3b52", lt: "#ff8a97" },
    blue:   { en: "BLUE",   ja: "青", c: "#2f8fff", lt: "#7cc4ff" },
    yellow: { en: "YELLOW", ja: "黄", c: "#ffd23d", lt: "#ffe68a" },
    green:  { en: "GREEN",  ja: "緑", c: "#2fd18c", lt: "#8af0c2" },
    purple: { en: "PURPLE", ja: "紫", c: "#a26bff", lt: "#cdb2ff" },
    orange: { en: "ORANGE", ja: "橙", c: "#ff8a2a", lt: "#ffbd85" },
  };
  function sidesOf(M) { const S = M && M.cfg && M.cfg.sides; return Array.isArray(S) && S.length >= 2 ? S : SIDES; }
  function isParty(M) { return sidesOf(M).length > 2; }
  function nextSideOf(M, s) { const S = sidesOf(M); return S[(S.indexOf(s) + 1) % S.length]; }
  function mapSides(S, f) { const o = {}; S.forEach((s) => { o[s] = f(s); }); return o; }
  /* 相手のだれかが JACK LOCK 中か（2色なら「相手」1人だけを見る＝前と同じ） */
  function oppLocked(M, side) { return sidesOf(M).some((s) => s !== side && M.jackLock[s]); }
  function blankStat() {
    return { throws: 0, hits: 0, jackHits: 0, banks: 0, chains: 0, bestChain: 0, sumDist: 0, nDist: 0, best: 99, dead: 0,
             specials: 0, ults: 0, perChar: {} };
  }
  function newMatch(cfg) {
    const c = Object.assign({
      mode: "cpu", kind: "quick", ends: 4, perSide: 6,
      players: { red: [], blue: [] },
      lineup: { red: [], blue: [] },
      levels: { red: {}, blue: {} },
      awk: { red: {}, blue: {} },
      rules: "ability", growth: "full",
      first: "red", seed: (Date.now() & 0xffffffff) >>> 0,
      difficulty: "normal", guide: "normal",
    }, cfg || {});
    const MD = MODES[c.rules] || MODES.ability;
    c.walls = MD.walls; c.competition = c.rules === "rules";
    const SS = Array.isArray(c.sides) && c.sides.length >= 2 ? c.sides : SIDES;
    ["players", "lineup", "levels", "awk"].forEach((k) => {
      c[k] = c[k] || {};
      SS.forEach((s) => { if (!c[k][s]) c[k][s] = k === "players" || k === "lineup" ? [] : {}; });
    });
    const M = {
      cfg: c, md: MD,
      rand: mkRand(c.seed),
      end: 1, t: 0,
      score: mapSides(SS, () => 0),
      endScores: [],
      balls: [],
      left: mapSides(SS, () => c.perSide),
      turn: c.first, phase: "jack", first: c.first,
      log: [], hints: [], shownHints: {},
      stats: mapSides(SS, blankStat),
      idx: mapSides(SS, () => 0),          /* その側が投げた数（キャラの順番） */
      gauge: mapSides(SS, () => []),       /* キャラごとのスキルゲージ */
      spUsed: mapSides(SS, () => []),      /* キャラごと・エンドごとの特殊ショット回数 */
      actUsed: mapSides(SS, () => []),     /* キャラごと・エンドごとのアクティブ */
      ultUsed: mapSides(SS, () => false),  /* 1エンド1回 */
      combackUsed: mapSides(SS, () => []),
      team: mapSides(SS, () => ({})),      /* チームの次の投球にかかる効果 */
      carry: mapSides(SS, () => []),       /* そのキャラの次の投球にかかる効果（ZERO LINE） */
      jackLock: mapSides(SS, () => false),
      cur: null,                           /* いま転がっている「投げたボール」 */
      fx: [],                              /* 演出のキュー（mbr-ui が取り出す） */
      shotNo: 0,
    };
    SS.forEach((s) => {
      const n = Math.max(1, (c.lineup[s] || []).length);
      for (let i = 0; i < n; i++) {
        M.gauge[s].push(0); M.spUsed[s].push({}); M.actUsed[s].push(false); M.combackUsed[s].push(false);
        M.carry[s].push({});
      }
    });
    pushHint(M, "jackfirst");
    return M;
  }
  function lineupOf(M, side) { return M.cfg.lineup[side] || []; }
  function charIdx(M, side) { const n = Math.max(1, lineupOf(M, side).length); return M.idx[side] % n; }
  function curCharOf(M, side) {
    const L = lineupOf(M, side);
    return L.length ? charOf(L[charIdx(M, side)]) : null;
  }
  function nextCharOf(M, side, k) {
    const L = lineupOf(M, side);
    return L.length ? charOf(L[(M.idx[side] + (k || 1)) % L.length]) : null;
  }
  function playerOf(M, side) {
    const P = M.cfg.players[side] || [];
    return P.length ? P[M.idx[side] % P.length] : null;
  }
  /* そのキャラの試合での能力（モード・育成の扱い込み） */
  function effStats(M, side, ch, i) {
    const st = {};
    const lv = (M.cfg.levels[side] || {})[ch.id] || 1;
    const aw = awkBonus(((M.cfg.awk || {})[side] || {})[ch.id]);
    const grow = lvBonus(lv) + aw;
    const bonus = M.cfg.growth === "unify" ? 0 : M.cfg.growth === "cap" ? Math.min(1, grow) : grow;
    STAT_KEYS.forEach((k) => { st[k] = clamp(ch.st[k] + bonus, 40, 95); });
    return st;
  }

  /* ══════════ ⑨ 物理 ══════════ */
  function ballR(M) { return M.cfg.competition ? BALL_R_PLAY * 0.78 : BALL_R_PLAY; }
  function live(M) { return M.balls.filter((b) => !b.dead); }
  function jackOf(M) { return M.balls.find((b) => b.jack && !b.dead) || null; }
  function dist(a, b) { const dx = a.x - b.x, dy = a.y - b.y; return sqrt(dx * dx + dy * dy); }
  function fx(M, o) { if (M.fx) M.fx.push(o); }
  function evt(M, b, kind, extra) {
    /* 「投げたボール」かその子に押されたボールの出来事だけを、投げた人の手柄にする */
    const cur = M.cur;
    if (!cur) return;
    if (b !== cur && b.chainOf !== cur.id) return;
    const last = cur.events.length ? cur.events[cur.events.length - 1] : null;
    if (last && M.t - last.t > CHAIN_WINDOW) cur.events.length = 0;   /* 間があいたら数え直し */
    cur.events.push(Object.assign({ k: kind, t: M.t }, extra || {}));
    const n = chainCount(cur.events, cur.chainCap || CHAIN_MAX);
    if (n >= 2 && n > (cur.chainShown || 1)) {
      cur.chainShown = n;
      fx(M, { t: "chain", n, x: b.x, y: b.y, side: cur.side });
    }
  }
  /* コンボの数え方：違う種類へつながるたび +1、相手ボールへの連続ヒットも +1（2つまで） */
  function chainCount(ev, cap) {
    if (!ev.length) return 0;
    let n = 1, hitRun = ev[0].k === "hit" ? 1 : 0;
    for (let i = 1; i < ev.length; i++) {
      const a = ev[i - 1].k, b = ev[i].k;
      if (a !== b) { n++; hitRun = b === "hit" ? 1 : 0; }
      else if (b === "hit" && ev[i].id !== ev[i - 1].id && hitRun < 2) { n++; hitRun++; }
    }
    return Math.min(cap, n);
  }
  function step(M) {
    const bs = live(M);
    let moving = false;
    M.t += DT;
    /* ★★ 2026-09-17d BOSS STAGE：ステージの床・風・障害物は M.env（mbr-stage.js）が差し込む。
       ふつうの試合では M.env が無いので、ここから下の動きは今までとまったく同じ。 */
    const E = M.env;
    if (E) M.envT = (M.envT || 0) + DT;
    for (let i = 0; i < bs.length; i++) {
      const b = bs[i];
      if (b.frozen) { b.vx = 0; b.vy = 0; continue; }
      const v2 = b.vx * b.vx + b.vy * b.vy;
      if (v2 <= STOP_V * STOP_V) { b.vx = 0; b.vy = 0; continue; }
      moving = true;
      const v = sqrt(v2);
      let a = FRICTION_A * (b.fric || 1);
      if (E && E.fric) a *= E.fric(M, b);
      if (b.shockT > 0) { a *= 1.6; b.shockT -= DT; }
      if (b.soft && v < 1.2) a *= 1.7;
      if (b.railT > 0) { a *= 0.75; b.railT -= DT; }
      if (b.afterRail && b.softRail) a *= 1.15;
      const nv = v - a * DT > 0 ? v - a * DT : 0;
      const k = nv / v;
      b.vx *= k; b.vy *= k;
      /* カーブ：速さはそのまま、向きだけ中央へ回す（sin/cos を使わず、垂直ベクトルで） */
      if (b.curveT > 0 && nv > 0.3) {
        b.curveT -= DT;
        const px = -b.vy / nv, py = b.vx / nv;          /* 左向きの垂直 */
        const dirToC = (COURT.W / 2 - b.x) * px;         /* 中央が左なら + */
        const s = dirToC >= 0 ? 1 : -1;
        let vx2 = b.vx + px * s * CURVE_A * DT, vy2 = b.vy + py * s * CURVE_A * DT;
        const m = sqrt(vx2 * vx2 + vy2 * vy2);
        if (m > 0) { b.vx = vx2 / m * nv; b.vy = vy2 / m * nv; }
      }
      if (E && E.accel && nv > 0) E.accel(M, b, nv);
      b.x += b.vx * DT; b.y += b.vy * DT;
      b.roll = (b.roll || 0) + nv * DT;
    }
    if (!moving) return false;
    /* ボールどうし */
    const r = ballR(M), min = r * 2, min2 = min * min;
    for (let i = 0; i < bs.length; i++) {
      for (let j = i + 1; j < bs.length; j++) {
        const A = bs[i], Bb = bs[j];
        const dx = Bb.x - A.x, dy = Bb.y - A.y;
        const d2 = dx * dx + dy * dy;
        if (d2 >= min2 || d2 === 0) continue;
        const d = sqrt(d2);
        const nx = dx / d, ny = dy / d;
        const ma = A.mass || 1, mb = Bb.mass || 1;
        const over = (min - d) + 1e-4;
        A.x -= nx * over * (mb / (ma + mb)); A.y -= ny * over * (mb / (ma + mb));
        Bb.x += nx * over * (ma / (ma + mb)); Bb.y += ny * over * (ma / (ma + mb));
        const rvx = Bb.vx - A.vx, rvy = Bb.vy - A.vy;
        const vn = rvx * nx + rvy * ny;
        if (vn > 0) continue;
        if (A.frozen || Bb.frozen) {           /* ★ 凍結したボールに当てると解除が早まる（BOSS STAGE） */
          if (A.frozen) A.thawHit = 1; if (Bb.frozen) Bb.thawHit = 1;
        }
        const sa = A.vx * A.vx + A.vy * A.vy, sb = Bb.vx * Bb.vx + Bb.vy * Bb.vy;
        const H = sa >= sb ? A : Bb, Tg = H === A ? Bb : A;
        const sgn = H === A ? 1 : -1;                 /* H→Tg の向き = n*sgn */
        const hvx = H.vx, hvy = H.vy;
        const J = -(1 + RESTITUTION) * vn / (1 / ma + 1 / mb);
        A.vx -= J / ma * nx; A.vy -= J / ma * ny;
        Bb.vx += J / mb * nx; Bb.vy += J / mb * ny;
        const speed = -vn;
        /* ── キャラの効果（投げたボールの連鎖にだけ）── */
        const mine = M.cur && (H === M.cur || H.chainOf === M.cur.id);
        if (!mine) continue;
        const kind = Tg.jack ? "jack" : Tg.side === H.side ? "ally" : "hit";
        const cx = (A.x + Bb.x) / 2, cy = (A.y + Bb.y) / 2;
        let mul = kind === "jack" ? (H.jackMul || 1) : kind === "hit" ? (H.hitMul || 1) : 1;
        if (kind === "hit" && H.breaker && speed >= 3) mul *= 1.2;
        if (kind === "jack" && Tg.jack && oppLocked(M, H.side)) mul *= 0.5;
        mul = clamp(mul, 0.5, 1.8);                   /* ★ 押し出しの上限（ご指定：一方的にしない） */
        if (mul !== 1) {
          const dv = (mul - 1) * 0.5 * speed;
          Tg.vx += nx * sgn * dv; Tg.vy += ny * sgn * dv;
        }
        if (kind === "hit" && H.guardBreak && Tg.guard) {
          Tg.guard = 0; Tg.mass = Tg.baseMass || 1;
          fx(M, { t: "guardbreak", x: Tg.x, y: Tg.y });
        }
        if (H.shock && kind !== "ally") { Tg.shockT = 1.2; fx(M, { t: "shock", x: Tg.x, y: Tg.y }); }
        if (kind === "ally" && H.cover && !Tg.guard) {
          Tg.guard = 1; Tg.mass = Math.max(Tg.mass || 1, 1.25); fx(M, { t: "guard", x: Tg.x, y: Tg.y });
        }
        /* ★★ 2026-09-19 DRAW（当たった瞬間に勢いを 30% に）／FOLLOW（当たる前の勢いを 45% 足す）。最初の1回だけ。 */
        if (H === M.cur && (H.draw || H.follow) && !H.dfDone) {
          H.dfDone = 1;
          if (H.draw) { H.vx *= 0.3; H.vy *= 0.3; fx(M, { t: "split", x: cx, y: cy }); }
          else { H.vx += hvx * 0.45; H.vy += hvy * 0.45; fx(M, { t: "shock", x: cx, y: cy }); }
        }
        if (H === M.cur && H.split && !H.splitDone && kind !== "jack") {
          H.splitDone = 1;
          const hn = hvx * nx + hvy * ny;
          const tx = hvx - hn * nx, ty = hvy - hn * ny;
          H.vx += tx * 0.35; H.vy += ty * 0.35;
          fx(M, { t: "split", x: cx, y: cy });
        }
        if (H === M.cur && H.nova && !H.novaDone) {
          H.novaDone = 1;
          fx(M, { t: "nova", x: cx, y: cy });
          for (let q = 0; q < bs.length; q++) {
            const o = bs[q];
            if (o === A || o === Bb) continue;
            const ox = o.x - cx, oy = o.y - cy, od = sqrt(ox * ox + oy * oy);
            if (od > 0.001 && od < 0.7) {
              const p = 0.9 * (1 - od / 0.7) / (o.mass || 1);
              o.vx += ox / od * p; o.vy += oy / od * p;
              o.chainOf = M.cur.id;
            }
          }
        }
        if (Tg.chainOf !== M.cur.id && Tg !== M.cur) Tg.chainOf = M.cur.id;
        if (kind === "jack") {
          M.stats[M.cur.side].jackHits++;
          fx(M, { t: "jack", x: Tg.x, y: Tg.y, v: speed, side: M.cur.side });
          evt(M, H, "jack");
        } else if (kind === "hit") {
          M.stats[M.cur.side].hits++;
          if (H === M.cur && H.momentum && speed >= 4) M.cur.gainBonus = (M.cur.gainBonus || 0) + 6;
          fx(M, { t: "hit", x: cx, y: cy, nx: nx * sgn, ny: ny * sgn, v: speed, side: M.cur.side, power: mul });
          evt(M, H, "hit", { id: Tg.id });
        } else {
          fx(M, { t: "tap", x: cx, y: cy, v: speed });
        }
      }
    }
    /* コートの外 */
    for (let i = 0; i < bs.length; i++) {
      const b = bs[i];
      const lo = r, hiX = COURT.W - r, hiY = COURT.L - r;
      if (M.cfg.walls) {
        let hit = false, wx = b.x, wy = b.y;
        const rest = () => {
          let e = WALL_REST * (b.wallMul || 1);
          if (b.infRail > 0) { e = 0.95; b.infRail--; }
          return clamp(e, 0.2, 0.95);
        };
        if (b.x < lo) { b.x = lo; b.vx = (b.vx < 0 ? -b.vx : b.vx) * rest(); hit = true; wx = 0; }
        else if (b.x > hiX) { b.x = hiX; b.vx = -(b.vx < 0 ? -b.vx : b.vx) * rest(); hit = true; wx = COURT.W; }
        if (b.y < lo) { b.y = lo; b.vy = (b.vy < 0 ? -b.vy : b.vy) * rest(); hit = true; wy = 0; }
        else if (b.y > hiY) { b.y = hiY; b.vy = -(b.vy < 0 ? -b.vy : b.vy) * rest(); hit = true; wy = COURT.L; }
        if (hit) {
          b.banks = (b.banks || 0) + 1;
          b.afterRail = 1;
          if (b.crimson) b.railT = 0.8;
          if (M.cur && (b === M.cur || b.chainOf === M.cur.id)) {
            if (b === M.cur) M.stats[b.side || "red"].banks++;
            fx(M, { t: "wall", x: wx, y: wy, bx: b.x, by: b.y, side: M.cur.side });
            evt(M, b, "wall");
          }
        }
      } else if (b.x < 0 || b.x > COURT.W || b.y < 0 || b.y > COURT.L) {
        b.dead = 1; b.vx = 0; b.vy = 0;
        if (b.side) M.stats[b.side].dead++;
        fx(M, { t: "dead", x: clamp(b.x, 0, COURT.W), y: clamp(b.y, 0, COURT.L) });
      }
    }
    if (E && E.collide) E.collide(M, bs, r);
    return true;
  }
  function settle(M, maxSteps) {
    let n = 0;
    const cap = maxSteps || 3600;
    while (step(M) && n < cap) n++;
    return n;
  }

  /* ══════════ ⑩ 投球 ══════════ */
  function throwSpot(M, side, slot) {
    const i = (slot == null ? defSlot(M, side) : slot);
    const w = COURT.W / COURT.BOXES;
    return { x: w * (i + 0.5), y: COURT.BOXD * 0.45 };
  }
  /* 色ごとのいつもの投球ボックス（2色なら赤2・青3＝前と同じ。3色以上は色の順に 0〜5） */
  function defSlot(M, side) {
    if (!isParty(M)) return side === "red" ? 2 : 3;
    const i = sidesOf(M).indexOf(side);
    return clamp(i < 0 ? 2 : i, 0, COURT.BOXES - 1);
  }
  /* 方向ベクトル（オンラインで送る形）。★ 小数6桁に丸めてから長さ1にそろえる。 */
  function dirOf(angle) {
    const dx = q6(Math.cos(angle)), dy = q6(Math.sin(angle));
    const m = sqrt(dx * dx + dy * dy) || 1;
    return { dx: dx / m, dy: dy / m };
  }
  function allyNearJack(M, side, rad) {
    const j = jackOf(M); if (!j) return false;
    return live(M).some((b) => b.side === side && !b.jack && dist(b, j) < rad);
  }
  /* そのキャラが「いま」使えるもの */
  function canSpecial(M, side, k) {
    if (!M.md.skills || M.phase !== "play") return false;
    const ch = curCharOf(M, side); if (!ch || ch.specials.indexOf(k) < 0) return false;
    const i = charIdx(M, side), sp = SPECIALS[k];
    return (M.spUsed[side][i][k] || 0) < sp.uses && M.gauge[side][i] >= sp.cost;
  }
  function canActive(M, side) {
    if (!M.md.skills || M.phase !== "play") return false;
    const ch = curCharOf(M, side); if (!ch) return false;
    return !M.actUsed[side][charIdx(M, side)];
  }
  function canUlt(M, side) {
    if (!M.md.skills || M.phase !== "play") return false;
    if (M.ultUsed[side]) return false;
    return M.gauge[side][charIdx(M, side)] >= GAUGE_MAX;
  }
  function isBehind(M, side) {
    const cs = closestSide(M);
    return !!cs && cs !== side;
  }
  /* その1投の物理パラメータを組み立てる（予測と本番で同じ関数を使う） */
  function shotMods(M, side, ch, opt) {
    opt = opt || {};
    const MD = M.md;
    const k = MD.k;
    const i = charIdx(M, side);
    const st = ch ? effStats(M, side, ch, i) : { power: 66, control: 66, friction: 66, bounce: 66, jack: 66, charge: 66 };
    const n = (v) => (v - 66) / 100 * k;
    const sk = MD.skills && ch;
    const sp = sk ? opt.special || "" : "";
    const act = sk && opt.active ? ch.active : "";
    const ult = sk && opt.ult ? ch.type : "";
    const pas = sk ? ch.passive : "";
    const team = sk ? (M.team[side] || {}) : {};
    const carry = sk ? (M.carry[side][i] || {}) : {};
    const o = {
      vmax: V_MAX * (1 + n(st.power) * 0.20),
      spread: 0.030 * (1 - n(st.control) * 1.7),
      fric: (1 + n(st.friction) * 0.30) * (MD.fricK || 1),
      wallMul: 1 + n(st.bounce) * 0.35,
      hitMul: 1 + n(st.power) * 0.18,
      jackMul: 1 + n(st.jack) * 0.30,
      charge: 1 + n(st.charge) * 0.8,
      mass: 1, preview: clamp(0.45 + n(st.control) * 1.2, 0.2, 0.85),
      curve: 0, soft: 0, split: 0, guardAfter: 0, guardMass: GUARD_MASS, guardBreak: 0,
      shock: 0, breaker: 0, crimson: 0, infRail: 0, nova: 0, cover: 0, momentum: 0, softRail: 0,
      chainCap: CHAIN_MAX, fullPreview: false,
    };
    /* 特殊ショット */
    if (sp === "straight") { o.spread *= 0.25; o.fric *= 0.92; o.preview = Math.min(1, o.preview + 0.25); }
    if (sp === "bank") { o.wallMul *= 1.35; o.bankSp = 1; }
    if (sp === "curve") o.curve = 0.9;
    if (sp === "powerhit") { o.vmax *= 1.12; o.hitMul *= 1.25; o.guardBreak = 1; }
    if (sp === "softstop") { o.soft = 1; o.fric *= 1.05; o.hitMul *= 0.85; o.jackMul *= 0.85; }
    if (sp === "jackpush") o.jackMul *= 1.45;
    if (sp === "guard") o.guardAfter = 1;
    if (sp === "split") o.split = 1;
    if (sp === "pinpoint") { o.spread *= 0.5; o.preview = Math.min(1, o.preview + 0.35); o.vmax *= 0.94; }
    if (sp === "heavy") { o.mass *= 1.35; o.fric *= 1.06; o.hitMul *= 1.10; }
    if (sp === "longdrive") { o.fric *= 0.85; o.vmax *= 1.05; }
    if (sp === "draw") o.draw = 1;
    if (sp === "follow") o.follow = 1;
    if (sp === "cushion") o.wallMul *= 0.55;
    if (sp === "jackkiss") { o.jackMul *= 0.6; o.soft = 1; }
    if (sp === "doublebank") o.infRail = Math.max(o.infRail, 2);
    /* アクティブ */
    if (act === "impactbreaker") o.breaker = 1;
    if (act === "overdrive") o.vmax *= 1.12;
    if (act === "perfectline") o.fullPreview = true;
    if (act === "steadyhand") o.spread = 0;
    if (act === "crimsonrebound") o.crimson = 1;
    if (act === "mirrorrail") { o.wallBonus = 0.15; o.preview = Math.min(1, o.preview + 0.3); }
    if (act === "jackresonance") { o.resonance = 1; o.jackMul *= 1.15; }
    if (act === "ironwall") { o.guardAfter = 1; o.guardMass = 1.9; }
    if (act === "tacticalread") o.fullPreview = true;
    if (act === "phantomspin") o.curve = Math.max(o.curve, 0.9);
    if (act === "shocktap") o.shock = 1;
    if (act === "focusaim") { o.spread *= 0.4; o.preview = Math.min(1, o.preview + 0.3); }
    if (act === "breakshot") { o.hitMul *= 1.15; o.guardBreak = 1; }
    if (act === "anchorshot") { o.mass *= 1.3; o.guardAfter = 1; o.guardMass = 1.45; }
    if (act === "slipstream") o.fric *= 0.8;
    if (act === "brake") { o.soft = 1; o.fric *= 1.1; }
    if (act === "railboost") { o.wallMul *= 1.25; o.bankSp = 1; }
    if (act === "chargeup") o.charge *= 1.8;
    if (act === "doubletap") { o.chainCap = o.chainCap + 1; o.gainPlus = (o.gainPlus || 0) + 6; }
    if (act === "guardsweep") { o.guardBreak = 1; o.shock = 1; }
    if (act === "splitburst") { o.split = 1; o.hitMul *= 1.10; }
    /* パッシブ */
    if (pas === "momentum") o.momentum = 1;
    if (pas === "heavyball") o.mass *= 1.10;
    if (pas === "precisioncore") o.spread *= 0.8;
    if (pas === "allyfocus" && allyNearJack(M, side, 1.2)) o.spread *= 0.7;
    if (pas === "softrail") o.softRail = 1;
    if (pas === "anchor") o.mass *= 1.15;
    if (pas === "cover") o.cover = 1;
    if (pas === "sakurabloom") { o.spread *= 0.75; o.mass *= 1.12; }
    if (pas === "hyoukamirror") { o.spread *= 0.70; o.wallMul *= 1.10; }
    if (pas === "shirahanaverse") { o.spread *= 0.80; o.mass *= 1.10; o.bulwark = 1; }
    if (pas === "benisuzuring") o.spread *= 0.80;
    if (pas === "abyssglow") { o.spread *= 0.80; o.shock = 1; }
    if (pas === "bluerosewaltz") { o.spread *= 0.75; o.mass *= 1.08; o.wallMul *= 1.15; }
    if (pas === "tsubakiumbrella") { o.spread *= 0.75; o.mass *= 1.15; o.umbrella = 1; }
    if (pas === "steadybase") { o.spread *= 0.9; o.fric *= 1.03; }
    if (pas === "sprinter") o.vmax *= 1.05;
    if (pas === "grip") o.fric *= 1.08;
    if (pas === "glide") o.fric *= 0.93;
    if (pas === "bumper") o.wallMul *= 1.10;
    if (pas === "impact") o.hitMul *= 1.08;
    if (pas === "jacktouch") o.jackMul *= 1.10;
    if (pas === "bulwark") { o.mass *= 1.08; o.bulwark = 1; }
    if (pas === "quickcharge") o.charge *= 1.15;
    if (pas === "lastword" && M.phase === "play" && M.left[side] === 1) { o.spread *= 0.5; o.fullPreview = true; }
    if (pas === "opener" && M.phase === "play" && M.left[side] === M.cfg.perSide) { o.spread *= 0.7; o.fullPreview = true; }
    if (pas === "chainmaster") o.chainCap = o.chainCap + 1;
    if (pas === "railsense") o.preview = Math.min(1, o.preview + 0.2);
    if (pas === "calm" && M.phase === "play" && isBehind(M, side)) o.spread *= 0.8;
    if (pas === "comeback" && M.phase === "play" && isBehind(M, side) && !M.combackUsed[side][i]) {
      o.spread *= 0.5; o.fullPreview = true; o.comeback = 1;
    }
    /* アルティメット */
    if (ult === "power") { o.vmax *= 1.18; o.hitMul *= 1.35; o.nova = 1; }
    if (ult === "technique") { o.spread = 0; o.fullPreview = true; o.zeroLine = 1; }
    if (ult === "bounce") { o.infRail = 3; o.bankUlt = 1; }
    if (ult === "jack") { o.jackMul *= 1.8; o.jackDom = 1; }
    if (ult === "defense") o.fortress = 1;
    if (ult === "support") o.squad = 1;
    if (ult === "trick") { o.curve = 0.9; o.split = 1; o.shock = 1; o.chainCap = CHAIN_MAX + 1; }
    /* チーム／キャラに残っている効果 */
    if (team.rally) o.spread *= 0.6;
    if (team.read) o.fullPreview = true;
    if (team.squad) { o.spread *= 0.6; o.fullPreview = true; }
    if (carry.zero) { o.spread = 0; o.fullPreview = true; }
    if (M.env && M.env.shot) M.env.shot(M, side, ch, o);   /* ★ BOSS STAGE（衝撃波のあとのブレ など） */
    o.spread = Math.max(0, o.spread);
    if (o.wallBonus) o.wallMul = o.wallMul + o.wallBonus / WALL_REST;
    if (o.fullPreview) o.preview = 1;
    return o;
  }
  /* 投げる。opt: { side, jack, angle | dx,dy, power, slot, special, active, ult, noJitter, playerIdx } */
  function throwBall(M, opt) {
    const side = opt.side;
    const isJack = !!opt.jack;
    const ch = isJack ? null : curCharOf(M, side);
    const i = charIdx(M, side);
    const use = {
      special: !isJack && opt.special && canSpecial(M, side, opt.special) ? opt.special : "",
      active: !isJack && opt.active && canActive(M, side),
      ult: !isJack && opt.ult && canUlt(M, side),
    };
    const mod = shotMods(M, side, ch, use);
    const spot = opt.from || throwSpot(M, side, opt.slot);
    let dx, dy;
    if (opt.dx != null && opt.dy != null) { dx = Number(opt.dx) || 0; dy = Number(opt.dy) || 0; }
    else { const d = dirOf(opt.angle); dx = d.dx; dy = d.dy; }
    /* ブレ：方向ベクトルを垂直方向へ少しずらす（sin/cos を使わない） */
    if (!opt.noJitter && mod.spread > 0) {
      const j = (M.rand() - 0.5) * 2 * mod.spread;
      const nx = dx - dy * j, ny = dy + dx * j;
      const m = sqrt(nx * nx + ny * ny); dx = nx / m; dy = ny / m;
    }
    /* ★★ 2026-09-17b <b>記録する値（小数6桁）で実際にも投げる</b>。
       丸める前の値で投げて、丸めた値を記録していたため、
       中断からの再開・オンラインの相手の端末で<b>ほんのわずかに違う球</b>になり、盤面がずれていた。 */
    dx = q6(dx); dy = q6(dy);                      /* ← これをそのまま記録・送信する */
    const um = sqrt(dx * dx + dy * dy) || 1;
    const ux = dx / um, uy = dy / um;               /* ← 速度はこの単位ベクトルから（再生でも同じ値になる） */
    const p = q6(clamp(Number(opt.power) || 0, 0, 1));
    const vmax = isJack ? V_MAX : mod.vmax;
    const v = V_MIN + (vmax - V_MIN) * p;
    M.shotNo++;
    const b = {
      id: "b" + M.shotNo,
      side: isJack ? null : side, jack: isJack,
      x: spot.x, y: spot.y, x0: spot.x, y0: spot.y,
      vx: ux * v, vy: uy * v,
      fric: isJack ? (M.md.fricK || 1) : mod.fric, mass: isJack ? 1 : mod.mass, baseMass: isJack ? 1 : mod.mass,
      wallMul: isJack ? 1 : mod.wallMul, hitMul: isJack ? 1 : mod.hitMul, jackMul: isJack ? 1 : mod.jackMul,
      curveT: isJack ? 0 : mod.curve, soft: mod.soft, split: mod.split, shock: mod.shock,
      guardBreak: mod.guardBreak, breaker: mod.breaker, crimson: mod.crimson, infRail: mod.infRail,
      nova: mod.nova, cover: mod.cover, momentum: mod.momentum, softRail: mod.softRail,
      chainCap: mod.chainCap, draw: mod.draw || 0, follow: mod.follow || 0, gainBonus: mod.gainPlus || 0,
      dead: 0, banks: 0, roll: 0, guard: 0, events: [],
      charId: ch ? ch.id : "", ci: i,
      by: opt.playerIdx == null ? 0 : opt.playerIdx,
    };
    M.balls.push(b);
    M.cur = b;
    b.mods = mod;
    b.use = use;
    M.log.push({ end: M.end, side, jack: isJack, dx: dx, dy: dy, power: p,
                 slot: opt.slot == null ? null : opt.slot,
                 special: use.special || "", active: !!use.active, ult: !!use.ult });
    if (!isJack) {
      M.left[side]--;
      M.stats[side].throws++;
      if (use.special) {
        M.spUsed[side][i][use.special] = (M.spUsed[side][i][use.special] || 0) + 1;
        M.gauge[side][i] = Math.max(0, M.gauge[side][i] - SPECIALS[use.special].cost);
        M.stats[side].specials++;
      }
      if (use.active) {
        M.actUsed[side][i] = true;
        const a = ch.active;
        if (a === "jacklock") M.jackLock[side] = true;
        if (a === "guardfield") {
          const jk = jackOf(M);
          if (jk) live(M).forEach((o) => {
            if (o.side === side && o !== b && !o.jack && dist(o, jk) < 1.0) { o.guard = 1; o.mass = Math.max(o.mass || 1, GUARD_MASS); fx(M, { t: "guard", x: o.x, y: o.y }); }
          });
        }
      } else if (M.jackLock[side]) {
        M.jackLock[side] = false;               /* 次の自分の投球で切れる */
      }
      if (use.ult) {
        M.ultUsed[side] = true;
        M.gauge[side][i] = 0;
        M.stats[side].ults++;
      }
      if (mod.comeback) M.combackUsed[side][i] = true;
    }
    return b;
  }
  /* 止まったあとの精算（ゲージ・GUARD・次へ持ちこす効果・コンボ）。1投に1回だけ呼ぶ。 */
  function finishShot(M) {
    const b = M.cur;
    M.cur = null;
    /* ★ 端末ごとの誤差の芽を摘む（止まった位置を丸める） */
    M.balls.forEach((o) => { o.x = q5(o.x); o.y = q5(o.y); o.vx = 0; o.vy = 0; o.shockT = 0; o.railT = 0; o.chainOf = ""; });
    if (!b || b.jack) return { chain: 0, gain: 0 };
    const side = b.side, i = b.ci;
    const ch = charOf(b.charId);
    const mod = b.mods || {};
    const chain = chainCount(b.events, b.chainCap || CHAIN_MAX);
    const MD = M.md;
    let gain = 0;
    if (MD.skills && ch) {
      gain += 6;
      const kinds = b.events.map((e) => e.k);
      const walls = kinds.filter((k) => k === "wall").length;
      const hits = kinds.filter((k) => k === "hit").length;
      const jacks = kinds.filter((k) => k === "jack").length;
      gain += Math.min(3, walls) * (4 + (ch.passive === "reboundcharge" ? 7 : 0) + (ch.passive === "hyoukamirror" || ch.passive === "bluerosewaltz" ? 6 : 0) + (mod.bankSp ? 4 : 0)) * (mod.bankUlt ? 2 : 1);
      gain += Math.min(2, hits) * 8;
      if (jacks) gain += 6 + (ch.passive === "jacksense" ? 10 : 0) + (mod.resonance ? 20 : 0);
      if (chain >= 2) gain += Math.min(18, (chain - 1) * 6);
      const jk = jackOf(M);
      if (jk && !b.dead) {
        const d = dist(b, jk);
        if (d < 0.5) gain += 6 + (ch.passive === "jackgravity" ? 8 : 0) + (ch.passive === "shirahanaverse" ? 10 : 0);
        if (ch.passive === "tsubakiumbrella" && d < 1.0) gain += 8;
        if (ch.passive === "benisuzuring" && d < 1.0) {
          const L = lineupOf(M, side).length || 1;
          const ni = (i + 1) % L;
          M.gauge[side][ni] = Math.min(GAUGE_MAX, M.gauge[side][ni] + 12);
          gain += 6;
        }
        if (ch.passive === "teamlink" && d < 1.0) {
          const L = lineupOf(M, side).length || 1;
          const ni = (i + 1) % L;
          M.gauge[side][ni] = Math.min(GAUGE_MAX, M.gauge[side][ni] + 8);
        }
      }
      if (ch.passive === "morale" && M.left[side] === M.cfg.perSide - 1) gain += 10;
      if (ch.passive === "longroll" && b.roll >= 6) gain += 8;
      if (ch.passive === "sakurabloom" && (hits || b.bossHits)) gain += 6;
      if (ch.passive === "abyssglow" && (hits || b.bossHits)) gain += 5;
      if (ch.passive === "hunter") gain += Math.min(2, hits) * 5;
      if (ch.passive === "chainmaster" && chain >= 2) gain += 6;
      gain += b.gainBonus || 0;
      gain = Math.min(GAUGE_PER_THROW_CAP, gain);
      gain = Math.round(gain * (mod.charge || 1));
      if (b.use && b.use.ult) gain = 0;            /* 撃った1投ではためない */
      const before = M.gauge[side][i];
      M.gauge[side][i] = Math.min(GAUGE_MAX, before + gain);
      if (before < GAUGE_MAX && M.gauge[side][i] >= GAUGE_MAX) { fx(M, { t: "ultready", side, id: ch.id }); pushHint(M, "ultready"); }
    }
    /* GUARD */
    if (!b.dead && mod.bulwark && !mod.guardAfter) { const jk = jackOf(M); if (jk && dist(b, jk) < 0.5) { b.guard = 1; b.mass = Math.max(b.mass, GUARD_MASS); fx(M, { t: "guard", x: b.x, y: b.y }); } }
    /* ★★ 2026-09-19g ツバキ・アンブレラ（ココハ）：ジャックの 1m 以内で止まれば GUARD */
    if (!b.dead && mod.umbrella && !b.guard) { const jk = jackOf(M); if (jk && dist(b, jk) < 1.0) { b.guard = 1; b.mass = Math.max(b.mass, GUARD_MASS); fx(M, { t: "guard", x: b.x, y: b.y }); } }
    if (!b.dead && mod.guardAfter) { b.guard = 1; b.mass = Math.max(b.mass, mod.guardMass || GUARD_MASS); fx(M, { t: "guard", x: b.x, y: b.y }); }
    if (mod.fortress) live(M).forEach((o) => { if (o.side === side && !o.jack) { o.guard = 1; o.mass = Math.max(o.mass || 1, GUARD_MASS); fx(M, { t: "guard", x: o.x, y: o.y }); } });
    if (mod.jackDom) {
      const jk = jackOf(M);
      if (jk) live(M).forEach((o) => { if (o.side === side && !o.jack && dist(o, jk) < 1.5) { o.guard = 1; o.mass = Math.max(o.mass || 1, GUARD_MASS); fx(M, { t: "guard", x: o.x, y: o.y }); } });
    }
    /* チームの次の投球へ持ちこす効果（使い切り） */
    const T = M.team[side];
    if (T.rally) T.rally = 0; else if (T.rallyNext) { T.rally = 1; T.rallyNext = 0; }
    if (T.read) T.read = 0; else if (T.readNext) { T.read = 1; T.readNext = 0; }
    if (T.squad) { T.squad--; }
    if (b.use && b.use.active && ch) {
      if (ch.active === "rallycall") {
        const L = lineupOf(M, side).length || 1;
        const ni = (i + 1) % L;
        M.gauge[side][ni] = Math.min(GAUGE_MAX, M.gauge[side][ni] + 20);
        T.rally = 1;
      }
      if (ch.active === "tacticalread") T.read = 1;
    }
    if (mod.squad) {
      T.squad = 2;
      const L = lineupOf(M, side).length || 1;
      for (let k = 1; k <= 2; k++) { const ni = (i + k) % L; M.gauge[side][ni] = Math.min(GAUGE_MAX, M.gauge[side][ni] + 25); }
    }
    const C = M.carry[side][i];
    if (C.zero) C.zero--;
    if (mod.zeroLine) C.zero = 2;
    /* 記録 */
    const S = M.stats[side];
    if (chain >= 2) S.chains++;
    if (chain > S.bestChain) S.bestChain = chain;
    const pc = S.perChar[b.charId] || (S.perChar[b.charId] = { throws: 0, hits: 0, jack: 0, chain: 0, banks: 0 });
    pc.throws++; pc.chain = Math.max(pc.chain, chain);
    pc.hits += b.events.filter((e) => e.k === "hit").length;
    pc.jack += b.events.filter((e) => e.k === "jack").length ? 1 : 0;
    pc.banks += b.banks || 0;
    /* ★ 投げた側の「何投目か」を進める＝次はチームの次のキャラ（順番システム） */
    M.idx[side]++;
    return { chain, gain, char: ch, special: b.use && b.use.special, ult: b.use && b.use.ult };
  }

  /* ══════════ ⑪ ルールの進行 ══════════ */
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
  function jackValid(M) {
    const j = jackOf(M);
    if (!j) return false;
    return j.y >= COURT.VLINE && j.x > 0 && j.x < COURT.W && j.y < COURT.L;
  }
  function nextTurn(M) {
    const j = jackOf(M);
    if (!j) return M.first;
    if (isParty(M)) return nextTurnParty(M, j);
    const anyRed = live(M).some((b) => b.side === "red");
    const anyBlue = live(M).some((b) => b.side === "blue");
    /* まだコートに自分のボールが無い側が、玉を持っていれば先に投げる（公式ルール） */
    if (!anyRed && M.left.red > 0) return "red";
    if (!anyBlue && M.left.blue > 0) return "blue";
    const cs = closestSide(M);
    const far = cs ? other(cs) : M.first;
    if (M.left[far] > 0) return far;
    if (M.left[other(far)] > 0) return other(far);
    return null;
  }
  /* ★★ 2026-09-18 3色以上：①まだコートに1球も無い色（先攻から順に）②いちばん遠い色（＝最短距離が最大）。
     2色のときの「ジャックから遠いほうのチームが投げる」をそのまま広げたもの。 */
  function nextTurnParty(M, j) {
    const S = sidesOf(M);
    const k0 = Math.max(0, S.indexOf(M.first));
    const order = S.slice(k0).concat(S.slice(0, k0));
    const best = {};
    live(M).forEach((b) => { if (!b.side) return; const d = dist(b, j); if (best[b.side] == null || d < best[b.side]) best[b.side] = d; });
    for (let i = 0; i < order.length; i++) { const s = order[i]; if (best[s] == null && M.left[s] > 0) return s; }
    let pick = null, far = -1;
    order.forEach((s) => { if (M.left[s] > 0 && best[s] > far) { far = best[s]; pick = s; } });
    return pick;
  }
  function sideName(s) { return (SIDE_INFO[s] || { en: String(s || "").toUpperCase() }).en; }
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
    return { side: win, pts, rows: list, limit: oppBest ? oppBest.d : null, oppSide: oppBest ? oppBest.b.side : null };
  }
  function scoreText(M, res, lang) {
    const en = lang === "en";
    if (!res.side) return en ? "No balls in play — no score." : "コートに残ったボールがありません。得点なしです。";
    const mine = res.rows.filter((x) => x.b.side === res.side && (res.limit == null || x.d < res.limit));
    const nm = sideName(res.side);
    const on = res.oppSide ? sideName(res.oppSide) : (res.side === "red" ? "BLUE" : "RED");
    const cm = (d) => Math.round(d * 100) + "cm";
    const list = mine.map((x) => cm(x.d)).join(en ? " and " : "と");
    if (res.limit == null) {
      return en ? nm + " has the only balls in play — " + res.pts + " point(s)."
                : nm + " のボールだけがコートに残っているため、" + res.pts + "点を獲得。";
    }
    return en
      ? nm + "'s " + list + " are closer to the jack than " + cm(res.limit) + " (" + on + "'s nearest), so " + nm + " scores " + res.pts + "."
      : nm + "の" + list + "が、" + on + "の最短 " + cm(res.limit) + " よりジャックに近いため、" + nm + "が" + res.pts + "点獲得";
  }
  function closeEnd(M) {
    const res = scoreEnd(M);
    if (res.side) M.score[res.side] += res.pts;
    M.endScores.push({ end: M.end, side: res.side, pts: res.pts });
    const j = jackOf(M);
    if (j) {
      live(M).forEach((b) => {
        if (b.jack || !b.side) return;
        const d = dist(b, j);
        M.stats[b.side].sumDist += d; M.stats[b.side].nDist++;
        if (d < M.stats[b.side].best) M.stats[b.side].best = d;
      });
    }
    const SS = sidesOf(M);
    if (M.end >= M.cfg.ends) {
      /* 同点（3色以上なら「首位が2色以上」）はタイブレーク */
      const top = Math.max.apply(null, SS.map((s) => M.score[s]));
      if (SS.filter((s) => M.score[s] === top).length > 1) { M.cfg.ends++; pushHint(M, "tiebreak"); }
      else { M.phase = "over"; return res; }
    }
    M.end++;
    M.first = isParty(M) ? nextSideOf(M, M.first) : other(M.first);
    M.balls = [];
    M.left = mapSides(SS, () => M.cfg.perSide);
    M.turn = M.first;
    M.phase = "jack";
    M.idx = mapSides(SS, () => 0);
    M.ultUsed = mapSides(SS, () => false);
    M.jackLock = mapSides(SS, () => false);
    M.team = mapSides(SS, () => ({}));
    SS.forEach((s) => {
      M.spUsed[s] = M.spUsed[s].map(() => ({}));
      M.actUsed[s] = M.actUsed[s].map(() => false);
      M.combackUsed[s] = M.combackUsed[s].map(() => false);
      /* ★ ゲージはエンドをまたいで持ちこす（たまるのに時間がかかる＝ご指定） */
    });
    pushHint(M, "endstart");
    return res;
  }
  /* 盤面の指紋（オンラインの相互検証） */
  function boardHash(M) {
    let h = 2166136261;
    const add = (n) => { const v = Math.round(n * 1000) | 0; h ^= v; h = Math.imul(h, 16777619) >>> 0; };
    M.balls.forEach((b) => { add(b.x); add(b.y); add(b.dead ? 1 : 0); });
    const SS = sidesOf(M);
    SS.forEach((s) => add(M.score[s])); SS.forEach((s) => add(M.left[s]));
    SS.forEach((s) => M.gauge[s].forEach(add));
    return (h >>> 0).toString(36);
  }

  /* ══════════ ⑫ 動的ルール説明と戦術ヒント ══════════ */
  const HINTS = {
    jackfirst: { level: 1, ja: "白いボールが<b>ジャックボール</b>です。これを目標に、自分のボールを近づけます。",
      en: "The white ball is the <b>jack</b>. Get your balls as close to it as you can." },
    jackline: { level: 1, ja: "ジャックは<b>Vラインを越えないと無効</b>です。もう少し強く投げましょう。",
      en: "The jack must pass the <b>V line</b>. Throw a little harder." },
    firstcolor: { level: 1, ja: "ジャックを投げた側が、<b>最初の色ボール</b>を投げます。",
      en: "The side that threw the jack throws the <b>first coloured ball</b>." },
    farthrows: { level: 1, ja: "ここから先は、<b>ジャックから遠いほうのチーム</b>が投げます。",
      en: "From now on, the side <b>farther</b> from the jack throws." },
    canhit: { level: 2, ja: "相手のボールがジャックに近いときは、<b>ぶつけて遠ざける</b>手もあります。POWER 型や POWER HIT が得意です。",
      en: "When the opponent is close, <b>knock them away</b> — POWER types and POWER HIT excel." },
    tooweak: { level: 2, ja: "ジャックまで届いていません。<b>もう少し強く</b>引いてみましょう。",
      en: "That fell short. Try pulling <b>a little harder</b>." },
    toostrong: { level: 2, ja: "行きすぎました。<b>弱めに</b>投げるか、SOFT STOP を使うと手前で止まります。",
      en: "Too strong. Throw <b>softer</b>, or use SOFT STOP." },
    guarding: { level: 3, ja: "いまの配置は<b>ジャックを守る形</b>です。GUARD を置くとさらに崩されにくくなります。",
      en: "Your balls <b>guard the jack</b>. A GUARD makes it even harder to break." },
    scoring: { level: 1, ja: "エンドの終わりに、<b>ジャックにいちばん近いチーム</b>が、相手の最短より近いボールの数だけ得点します。",
      en: "The side <b>closest to the jack</b> scores one point per ball closer than the opponent's nearest." },
    deadball: { level: 2, ja: "コートの外に出たボールは<b>デッドボール</b>になり、取り除かれます。",
      en: "A ball that leaves the court is <b>dead</b> and is removed." },
    endstart: { level: 2, ja: "新しいエンドです。<b>先攻が入れかわります</b>。スキルゲージは持ちこしです。",
      en: "New end — the <b>starting side swaps</b>. Gauges carry over." },
    tiebreak: { level: 1, ja: "同点のため<b>タイブレークのエンド</b>を行います。",
      en: "Scores are level — playing a <b>tie-break end</b>." },
    order: { level: 2, ja: "投げるたびに<b>編成の順番</b>でキャラが交代します。守り→崩し→仕上げ、のように順番も作戦です。",
      en: "Characters rotate in <b>lineup order</b> each throw — the order itself is tactics." },
    special: { level: 2, ja: "下の<b>特殊ショット</b>を選んでから投げると、そのキャラの技が乗ります（1エンド1回）。",
      en: "Pick a <b>special shot</b> before throwing to use the character's technique (once per end)." },
    ultready: { level: 1, ja: "ゲージが満タン！ <b>ULT</b> を押してから投げると、アルティメットが発動します（1エンド1回）。",
      en: "Gauge full! Tap <b>ULT</b> before throwing to unleash the ultimate (once per end)." },
    bank: { level: 3, ja: "壁に当てて角度を変える<b>バンクショット</b>。BOUNCE 型は反射後も勢いが落ちにくい。",
      en: "<b>Bank shots</b> change the angle off the rails; BOUNCE types keep their speed." },
    chain: { level: 3, ja: "<b>Tactical Chain</b>：壁→ヒット→ジャックのように続けて決めるとゲージが大きくたまります。",
      en: "<b>Tactical Chain</b>: rail → hit → jack in a row builds a lot of gauge." },
    simplemode: { level: 1, ja: "<b>シンプルモード</b>：キャラクターなし・全員が同じ能力。引っぱる長さと向きだけの勝負です。",
      en: "<b>Simple mode</b>: no characters, identical stats — just aim and power." },
    rulesmode: { level: 1, ja: "<b>ルール準拠モード</b>：スキルなし・能力の効きは1/3。腕前がそのまま出ます。",
      en: "<b>Rules mode</b>: no skills, stats at a third — pure skill." },
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

  /* ══════════ ⑬ CPU ══════════ */
  const AI_LV = {
    easy:   { samples: 16,  noise: 0.085, look: 0, greed: 0.35, skill: 0.15 },
    normal: { samples: 40,  noise: 0.045, look: 0, greed: 0.7,  skill: 0.4 },
    hard:   { samples: 70,  noise: 0.026, look: 0, greed: 0.9,  skill: 0.7 },
    expert: { samples: 110, noise: 0.015, look: 0, greed: 1.0,  skill: 0.9 },
    master: { samples: 150, noise: 0.008, look: 1, greed: 1.0,  skill: 1.0 },
  };
  function evalBoard(M, side) {
    const j = jackOf(M);
    if (!j) return -999;
    const mine = [], opp = [];
    live(M).forEach((b) => {
      if (b.jack) return;
      (b.side === side ? mine : opp).push({ d: dist(b, j), g: b.guard });
    });
    mine.sort((a, b) => a.d - b.d); opp.sort((a, b) => a.d - b.d);
    const mb = mine.length ? mine[0].d : 99;
    const ob = opp.length ? opp[0].d : 99;
    let pts = 0;
    if (mb < ob) mine.forEach((x) => { if (x.d < ob) pts++; });
    else if (ob < mb) opp.forEach((x) => { if (x.d < mb) pts--; });
    const guards = mine.filter((x) => x.g && x.d < 1.2).length;
    return pts * 10 + (ob - mb) * 3 - mb * 0.5 + guards * 0.8;
  }
  function cloneM(M) {
    const cp = (o) => JSON.parse(JSON.stringify(o));
    return {
      cfg: M.cfg, md: M.md, rand: mkRand(1234567 + M.shotNo), end: M.end, t: M.t, score: M.score,
      balls: M.balls.map((b) => { const o = Object.assign({}, b); o.events = []; return o; }),
      left: Object.assign({}, M.left), turn: M.turn, phase: M.phase, first: M.first,
      log: [], hints: [], shownHints: {}, endScores: [],
      stats: mapSides(sidesOf(M), blankStat), idx: Object.assign({}, M.idx),
      gauge: cp(M.gauge), spUsed: cp(M.spUsed), actUsed: cp(M.actUsed), ultUsed: Object.assign({}, M.ultUsed),
      combackUsed: cp(M.combackUsed), team: cp(M.team), carry: cp(M.carry),
      jackLock: Object.assign({}, M.jackLock), cur: null, fx: null, shotNo: M.shotNo,
      /* ★★ 2026-09-17d BOSS STAGE：予測にも床・風・障害物を効かせる。isSim の間はステージの状態を書きかえない */
      env: M.env, stage: M.stage, envT: M.envT, isSim: true,
    };
  }
  function cpuSlot(M, side) {
    const base = defSlot(M, side);
    return clamp(base + (M.rand() < 0.5 ? 0 : (M.rand() < 0.5 ? -1 : 1)), 0, COURT.BOXES - 1);
  }
  function pickTarget(M, side, L) {
    const j = jackOf(M);
    const opp = live(M).filter((b) => b.side && b.side !== side);
    const mine = live(M).filter((b) => b.side === side);
    const r = M.rand();
    if (L.samples <= 44) return j;
    if (opp.length && r < 0.34) {
      const t = opp[Math.floor(M.rand() * opp.length)];
      return { x: t.x, y: t.y };
    }
    if (L.samples >= 110 && r < 0.5 && mine.length) {
      const near = mine[0];
      return { x: j.x + (near.x - j.x) * 0.35, y: j.y + (near.y - j.y) * 0.35 };
    }
    return j;
  }
  /* CPU の1手。{angle, power, slot, special, active, ult} */
  function cpuPick(M, side, level) {
    const L = AI_LV[level] || AI_LV.normal;
    const slot = cpuSlot(M, side);
    const spot = throwSpot(M, side, slot);
    const j = jackOf(M);
    const ch = curCharOf(M, side);
    const opts = [{}];
    if (ch && M.md.skills && M.rand() < L.skill) {
      ch.specials.forEach((k) => { if (canSpecial(M, side, k)) opts.push({ special: k }); });
      if (canActive(M, side)) opts.push({ active: true });
      if (canUlt(M, side)) opts.push({ ult: true }, { ult: true });
    }
    let best = null, bestS = -1e9;
    for (let i = 0; i < L.samples; i++) {
      let ang, pw;
      const o = opts[i % opts.length];
      if (j) {
        const tgt = pickTarget(M, side, L) || j;
        const dx = tgt.x - spot.x, dy = tgt.y - spot.y;
        const d = sqrt(dx * dx + dy * dy);
        ang = Math.atan2(dy, dx) + (M.rand() - 0.5) * 0.34;
        const v = sqrt(2 * FRICTION_A * Math.max(0.4, d)) * (0.94 + M.rand() * 0.16);
        pw = (v - V_MIN) / (V_MAX - V_MIN);
      } else {
        ang = Math.PI / 2 + (M.rand() - 0.5) * 0.5;
        pw = 0.45 + M.rand() * 0.3;
      }
      pw = clamp(pw, 0.05, 1);
      const sim = cloneM(M);
      throwBall(sim, Object.assign({ side, angle: ang, power: pw, noJitter: true, slot }, o));
      settle(sim, 2400);
      finishShot(sim);
      let s = evalBoard(sim, side);
      /* スキルは「効くときだけ」使う：同じ点なら使わないほうを選ぶ */
      if (o.special) s -= 0.6;
      if (o.active) s -= 0.9;
      if (o.ult) s -= (M.left[side] <= 2 ? 0.2 : 1.6);
      if (L.look > 0 && !isParty(M) && sim.left[other(side)] > 0 && jackOf(sim)) {
        const rep = cpuReply(sim, other(side), 18);
        if (rep) {
          throwBall(sim, { side: other(side), angle: rep.angle, power: rep.power, noJitter: true, slot: 2 });
          settle(sim, 2400); finishShot(sim);
          s = s * 0.55 + evalBoard(sim, side) * 0.45;
        }
      }
      s += (M.rand() - 0.5) * (1 - L.greed) * 12;
      if (s > bestS) { bestS = s; best = Object.assign({ angle: ang, power: pw, slot }, o); }
    }
    if (!best) best = { angle: Math.PI / 2, power: 0.5, slot };
    best.angle += (M.rand() - 0.5) * L.noise * 2;
    best.power = clamp(best.power + (M.rand() - 0.5) * L.noise, 0.05, 1);
    return best;
  }
  function cpuReply(M, side, n) {
    const spot = throwSpot(M, side, 2);
    const j = jackOf(M); if (!j) return null;
    let best = null, bestS = -1e9;
    for (let i = 0; i < n; i++) {
      const dx = j.x - spot.x, dy = j.y - spot.y, d = sqrt(dx * dx + dy * dy);
      const ang = Math.atan2(dy, dx) + (M.rand() - 0.5) * 0.3;
      const v = sqrt(2 * FRICTION_A * Math.max(0.4, d)) * (0.95 + M.rand() * 0.12);
      const pw = clamp((v - V_MIN) / (V_MAX - V_MIN), 0.05, 1);
      const sim = cloneM(M);
      throwBall(sim, { side, angle: ang, power: pw, noJitter: true, slot: 2 });
      settle(sim, 2000); finishShot(sim);
      const s = evalBoard(sim, side);
      if (s > bestS) { bestS = s; best = { angle: ang, power: pw }; }
    }
    return best;
  }
  function cpuJack(M, side, slot) {
    const sp = throwSpot(M, side, slot);
    const ty = COURT.VLINE + 1.2 + M.rand() * 3.5;
    const tx = 1.2 + M.rand() * (COURT.W - 2.4);
    const dx = tx - sp.x, dy = ty - sp.y, d = sqrt(dx * dx + dy * dy);
    const v = sqrt(2 * FRICTION_A * d);
    return { angle: Math.atan2(dy, dx), power: clamp((v - V_MIN) / (V_MAX - V_MIN), 0.05, 1), slot };
  }

  /* ══════════ ⑬-b 予測（軌道ガイド）══════════ */
  function predict(M, opt) {
    const sim = cloneM(M);
    sim.fx = [];
    const b = throwBall(sim, Object.assign({ noJitter: true }, opt));
    const pts = [{ x: b.x, y: b.y }];
    let n = 0, firstHit = null, bounces = [];
    let lastBanks = 0;
    while (step(sim) && n < 3000) {
      n++;
      if (!firstHit && sim.fx.length) {
        const h = sim.fx.find((e) => e.t === "hit" || e.t === "jack" || e.t === "tap");
        if (h) firstHit = { x: h.x, y: h.y, t: h.t };
      }
      if (b.banks !== lastBanks) { lastBanks = b.banks; bounces.push({ x: b.x, y: b.y }); }
      sim.fx.length = 0;
      if (n % 5 === 0) pts.push({ x: b.x, y: b.y });
    }
    pts.push({ x: b.x, y: b.y });
    return { path: pts, stop: { x: b.x, y: b.y }, dead: !!b.dead, firstHit, bounces,
             preview: b.mods ? b.mods.preview : 0.5 };
  }

  /* ══════════ ⑬-c 相手の編成（CPU）══════════ */
  function rivalLineup(M_or_seed, n) {
    const all = buildRoster();
    if (!all.length) return [];
    const R = mkRand((typeof M_or_seed === "number" ? M_or_seed : Date.now()) >>> 0);
    const out = [], used = {};
    const tys = TYPE_KEYS.slice();
    while (out.length < (n || 3) && out.length < all.length) {
      const ty = tys[Math.floor(R() * tys.length)];
      const pool = all.filter((c) => c.type === ty && !used[c.id]);
      const c = pool.length ? pool[Math.floor(R() * pool.length)] : all[Math.floor(R() * all.length)];
      if (used[c.id]) continue;
      used[c.id] = 1; out.push(c.id);
    }
    return out;
  }

  /* ══════════ ⑬-d 表示用の文字 ══════════ */
  function L(o, lang) { return typeof o === "string" ? o : (o && (lang === "en" ? o.en : o.ja)) || (o && o.ja) || ""; }
  function kitText(c, lang) {
    if (!c) return null;
    const en = lang === "en";
    return {
      type: TYPES[c.type],
      specials: c.specials.map((k) => ({ k, nm: SPECIALS[k].en, sub: SPECIALS[k].ja, d: L(SPECIALS[k].d, lang), cost: SPECIALS[k].cost, c: SPECIALS[k].c })),
      active: { k: c.active, nm: ACTIVES[c.active].en, sub: ACTIVES[c.active].ja, d: L(ACTIVES[c.active].d, lang) },
      passive: { k: c.passive, nm: PASSIVES[c.passive].en, sub: PASSIVES[c.passive].ja, d: L(PASSIVES[c.passive].d, lang) },
      ult: { nm: c.ult.nm, sub: ULTS[c.type].en, d: L(ULTS[c.type].d, lang) },
      strong: en ? STAT_NM[TYPES[c.type].main].en : STAT_NM[TYPES[c.type].main].ja,
      weak: en ? STAT_NM[TYPES[c.type].weak].en : STAT_NM[TYPES[c.type].weak].ja,
    };
  }

  /* ══════════ ⑬-e 保存 ══════════ */
  const KEY = "mbr_v1";
  const DEF = {
    name: "", rank: "bronze", rp: 0,
    wins: 0, matches: 0, cpuWins: 0, cpuMatches: 0, onWins: 0, onMatches: 0,
    teamWins: 0, teamMatches: 0, rankWins: 0, rankMatches: 0,
    throws: 0, hits: 0, jackHits: 0, banks: 0, chains: 0, bestChain: 0, sumDist: 0, nDist: 0,
    fav: "", team: [], lineup: [], guide: "normal", tutorial: false,
    sound: true, vib: true, voice: true, fxLevel: "full", aimAssist: "normal",
    rules: "ability", growth: "full", camera: "top",
    chars: {},           /* { id: { xp, ball, games, wins } } */
    replays: [], lastRoom: "", history: [],
    ver: 4,
  };
  let SAVE = null;
  function load() {
    if (SAVE) return SAVE;
    let o = null;
    try { o = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) {}
    SAVE = Object.assign({}, DEF, o || {});
    if (!Array.isArray(SAVE.team)) SAVE.team = [];
    if (!Array.isArray(SAVE.lineup)) SAVE.lineup = [];
    if (!SAVE.lineup.length && SAVE.team.length) SAVE.lineup = SAVE.team.slice(0, 3);   /* 旧版の「使うキャラ」を引きつぐ */
    if (!SAVE.chars || typeof SAVE.chars !== "object") SAVE.chars = {};
    if (!Array.isArray(SAVE.replays)) SAVE.replays = [];
    if (!Array.isArray(SAVE.history)) SAVE.history = [];
    if (SAVE.competition && !o.rules) SAVE.rules = "rules";
    /* ★ 2026-09-17c 声が本物（VOICEVOX）になったので、これまでの OFF を一度だけ ON に戻す */
    if (!SAVE.voiceV) { SAVE.voice = true; SAVE.voiceV = 2; }
    SAVE.ver = 4;
    return SAVE;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(load())); } catch (e) {} }
  /* ★★ 2026-09-19 同期の取りこみ（xeva-cloud の pullNow・別タブ）で mbr_v1 が差しかわったら、
     手元の写し（SAVE）を捨てて読み直す。
     ★ これが無かったので、別の端末で上げた熟練度・編成を取りこんでも<b>画面は古い写しのまま</b>で、
       次に save() した瞬間に<b>古い写しでクラウドまで上書き</b>していた（同期されない真因）。 */
  function reload() {
    let cur = null;
    try { cur = localStorage.getItem(KEY); } catch (e) {}
    if (SAVE && cur === JSON.stringify(SAVE)) return false;     /* 変わっていない */
    SAVE = null; load();
    try { window.dispatchEvent(new CustomEvent("mbr:reloaded")); } catch (e) {}
    return true;
  }
  try {
    window.addEventListener("xeva:synced", () => { reload(); });
    window.addEventListener("storage", (e) => { if (e && e.key === KEY) reload(); });
  } catch (e) {}
  function charProg(id) {
    const s = load();
    const p = s.chars[id] || { xp: 0, ball: "std", games: 0, wins: 0 };
    return Object.assign({ lv: lvOfXp(p.xp) }, p);
  }
  /* ★★ 2026-09-17d 叡智の果実（MagiBurst と所持数を共有）で熟練度 Lv を上げる。1個で +1。
     果実を減らすのは UI 側（magiburst_v1 の items.wisdom）。ここは Lv だけ。 */
  function addCharLevels(id, n) {
    const s = load();
    const p = s.chars[id] || (s.chars[id] = { xp: 0, ball: "std", games: 0, wins: 0 });
    const before = lvOfXp(p.xp);
    const target = Math.min(LV_MAX, before + Math.max(0, n | 0));
    p.xp = Math.max(p.xp || 0, xpForLv(target));
    save();
    return { before, after: lvOfXp(p.xp) };
  }
  function statSumOf(c) { let t = 0; STAT_KEYS.forEach((k) => { t += (c && c.st && c.st[k]) || 0; }); return t; }
  function addCharXp(id, xp) {
    const s = load();
    const p = s.chars[id] || (s.chars[id] = { xp: 0, ball: "std", games: 0, wins: 0 });
    const before = lvOfXp(p.xp);
    p.xp = Math.max(0, (p.xp || 0) + Math.round(xp));
    return { before, after: lvOfXp(p.xp) };
  }
  const RANKS = [
    { k: "bronze",  ja: "BRONZE",       need: 0,    c: "#c9803f" },
    { k: "silver",  ja: "SILVER",       need: 500,  c: "#c3ccd6" },
    { k: "gold",    ja: "GOLD",         need: 1100, c: "#ffd257" },
    { k: "platinum",ja: "PLATINUM",     need: 1800, c: "#9ee6ff" },
    { k: "diamond", ja: "DIAMOND",      need: 2600, c: "#8ee8ff" },
    { k: "master",  ja: "MASTER",       need: 3600, c: "#ff8ab5" },
    { k: "grand",   ja: "GRAND MASTER", need: 4800, c: "#ff3b52" },
  ];
  function rankOf(rp) { let r = RANKS[0]; RANKS.forEach((x) => { if (rp >= x.need) r = x; }); return r; }
  function nextRank(rp) { for (let i = 0; i < RANKS.length; i++) if (rp < RANKS[i].need) return RANKS[i]; return null; }
  function addRp(delta) {
    const s = load();
    s.rp = Math.max(0, s.rp + delta);
    s.rank = rankOf(s.rp).k;
    save();
    return s.rp;
  }

  /* ══════════ 公開 ══════════ */
  window.MBR = {
    VERSION: 4, REV: "2026-09-19",
    reload,
    COURT, BALL_R_REAL, BALL_R_PLAY, FRICTION_A, V_MAX, V_MIN, DT, GAUGE_MAX, CHAIN_MAX, STAT_SUM,
    TYPES, TYPE_KEYS, STAT_KEYS, STAT_NM, SPECIALS, ACTIVES, PASSIVES, ULTS, MODES, ELEM_C, ELEM_JA,
    BALL_SKINS, LV_MAX,
    /* ★ 旧版（v3）の名前を読んでいた画面のために残す */
    SKILLS: ACTIVES, ABILS: PASSIVES,
    SPECIAL_POOL, ACTIVE_POOL, PASSIVE_POOL,
    buildRoster, charOf, kitText, voiceOf, voiceClip, voiceCredit, voiceCredits, tutClip, storyOf, addCharLevels, statSumOf, SPECIAL_KIT, skinsOf, titleOf, lvOfXp, xpForLv, lvBonus, awkBonus, AWK_MAX,
    mkRand, fnv,
    newMatch, step, settle, live, jackOf, ballR, throwBall, finishShot, throwSpot, shotMods, dirOf,
    lineupOf, charIdx, curCharOf, nextCharOf, playerOf, canSpecial, canActive, canUlt,
    dist, closestSide, jackValid, nextTurn, scoreEnd, scoreText, closeEnd, boardHash, chainCount,
    pushHint, takeHint, HINTS, _evt: evt,
    cpuPick, cpuJack, predict, evalBoard, other, rivalLineup, cloneM,
    SIDES, PARTY_SIDES, SIDE_INFO, sidesOf, isParty, nextSideOf, defSlot, sideName,
    load, save, charProg, addCharXp, RANKS, rankOf, nextRank, addRp,
  };
})();
