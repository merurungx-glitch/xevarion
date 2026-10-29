/* ============================================================
   MagiAbyss — ma-skills.js
   ★★ 2026-10-12 キャラの「発動スキル」と「秘技」（ご指定：ウマ娘のように条件つきのスキルを増やし、
      自動で発動するスキルと、手動で撃つ技をそれぞれ実装）
   ・発動スキル … 1人4つ（虹1・金1・白2）。条件がそろうと自動で発動し、画面に名前が出る。
       虹＝そのキャラだけのスキル（UNIQUE）／金・白＝共通のスキル（AUTO）から3つ（KIT）。
   ・秘技 … 1人1つ（キー T・スマホの「秘技」ボタン）。条件（敵を倒す・よける・会心…）でゲージがたまり、
       満タンのときに押すと出る（TECH）。
   ・数字を変えるときは AUTO / UNIQUE / KIT / TECH だけでよい（ギルドの説明も同じデータから作る）。
   ============================================================ */
(function () {
  "use strict";
  const MA = (window.MA = window.MA || {});
  const D = () => MA.D, E = () => MA.E, G = () => MA.G, W = () => MA.W, A = () => MA.Audio;
  const TAU = Math.PI * 2;
  const ec = (el) => (D().ELEM[el] || D().ELEM.water).c;
  const pc = (v) => Math.round(v * 100) + "%";

  /* ══ 共通の発動スキル（金・白）══
     cond … 条件 ／ cd … もう一度発動できるまでの秒数 ／ fx … 効果（t 秒のあいだの強化と、その場の効果） */
  const AUTO = {
    /* ── 白 ── */
    sente:      { nm: "先手必勝", rar: "W", ic: "flash", cond: { k: "room" }, cd: 20, fx: { atk: 0.12, t: 8 } },
    gyakkyo:    { nm: "逆境の灯火", rar: "W", ic: "vital", cond: { k: "hpLow", v: 0.5 }, cd: 60, fx: { def: 0.2, t: 10, heal: 0.08 } },
    shinkokyu:  { nm: "深呼吸", rar: "W", ic: "regen", cond: { k: "noHit", s: 8 }, cd: 25, fx: { heal: 0.06 } },
    ikioi:      { nm: "勢いづく", rar: "W", ic: "haste", cond: { k: "kills", n: 10, s: 8 }, cd: 20, fx: { aspd: 0.15, t: 8 } },
    mikiri:     { nm: "見切りの勘", rar: "W", ic: "crit", cond: { k: "dodge" }, cd: 8, fx: { crit: 15, t: 4 } },
    takara:     { nm: "宝探し上手", rar: "W", ic: "chest", cond: { k: "chest" }, cd: 0, fx: { mp: 999, heal: 0.1 } },
    seicho:     { nm: "成長の喜び", rar: "W", ic: "wisdom", cond: { k: "lv" }, cd: 15, fx: { heal: 0.1, techG: 0.05 } },
    kakomare:   { nm: "囲まれ上手", rar: "W", ic: "guard", cond: { k: "crowd", n: 10 }, cd: 20, fx: { def: 0.15, t: 6 } },
    oikaze:     { nm: "追い風", rar: "W", ic: "swift", cond: { k: "art" }, cd: 6, fx: { spd: 0.2, t: 3 } },
    omono:      { nm: "大物食い", rar: "W", ic: "skull", cond: { k: "mid" }, cd: 0, fx: { atk: 0.12, t: 1.2 }, quiet: 1 },
    shuchu:     { nm: "集中力", rar: "W", ic: "arcana", cond: { k: "art" }, cd: 10, fx: { techG: 0.1 } },
    /* ── 金 ── */
    zenshin:    { nm: "全身全霊", rar: "G", ic: "power", cond: { k: "hpLow", v: 0.3 }, cd: 90, fx: { atk: 0.3, crit: 20, t: 10, shield: 0.2 } },
    bosskill:   { nm: "ボスキラー", rar: "G", ic: "skull", cond: { k: "boss" }, cd: 0, fx: { atk: 0.25, t: 20, gauge: 20 } },
    shippu:     { nm: "疾風怒濤", rar: "G", ic: "gale", cond: { k: "kills", n: 25, s: 10 }, cd: 30, fx: { aspd: 0.3, spd: 0.15, t: 10 } },
    teppeki:    { nm: "鉄壁の構え", rar: "G", ic: "guard", cond: { k: "hurtBig", v: 0.15 }, cd: 30, fx: { shield: 0.3, def: 0.3, t: 6 } },
    kaishin:    { nm: "会心の連鎖", rar: "G", ic: "crit", cond: { k: "crit", n: 8, s: 3 }, cd: 20, fx: { critDmg: 0.4, t: 6 } },
    yoin:       { nm: "必殺の余韻", rar: "G", ic: "ult", cond: { k: "ult" }, cd: 0, fx: { atk: 0.2, t: 10, techG: 0.3 } },
    fudo:       { nm: "不動の心", rar: "G", ic: "holy", cond: { k: "noHit", s: 15 }, cd: 30, fx: { atk: 0.15, crit: 20, t: 12 } },
    renkei:     { nm: "連携の妙", rar: "G", ic: "burst", cond: { k: "combo", s: 4 }, cd: 12, fx: { nova: { r: 90, mul: 4 } } },
  };
  /* ══ そのキャラだけの発動スキル（虹）══ */
  const UNIQUE = {
    takina:    { nm: "結髪の狙撃眼", ic: "crit", cond: { k: "dodge" }, cd: 10, fx: { crit: 30, atk: 0.2, t: 5, gauge: 5 } },
    hibana:    { nm: "勿忘草の誓い", ic: "regen", cond: { k: "hpLow", v: 0.5 }, cd: 45, fx: { heal: 0.25, shield: 0.35, def: 0.3, t: 8 } },
    fuki:      { nm: "宵桜の幕引き", ic: "shadowbind", cond: { k: "kills", n: 15, s: 8 }, cd: 25, fx: { atk: 0.25, t: 8, defDown: 6 } },
    ayano:     { nm: "緋色の魔女の夜", ic: "fireball", cond: { k: "crowd", n: 8 }, cd: 18, fx: { nova: { r: 100, mul: 5, burn: 1 }, atk: 0.2, t: 6 } },
    saki:      { nm: "とっておきのキャンディ", ic: "pn_candy", cond: { k: "hurtBig", v: 0.12 }, cd: 35, fx: { heal: 0.2, shield: 0.4, mp: 999 } },
    yuka:      { nm: "星降る夜の鈴", ic: "meteor", cond: { k: "skill" }, cd: 8, fx: { stars: { n: 5, mul: 3 } } },
    natsumi:   { nm: "黒猫は九度跳ぶ", ic: "dashup", cond: { k: "skill" }, cd: 6, fx: { aspd: 0.4, crit: 15, t: 3 } },
    miu:       { nm: "収穫祭の大行進", ic: "pn_pumpkin", cond: { k: "kills", n: 20, s: 10 }, cd: 30, fx: { atk: 0.3, spd: 0.15, t: 10 } },
    mai:       { nm: "四つ葉の幸運", ic: "pn_clover", cond: { k: "every", s: 40 }, cd: 0, fx: { crit: 35, t: 8, heal: 0.1 } },
    chinatsu:  { nm: "燭光のヴェール", ic: "pn_candle", cond: { k: "boss" }, cd: 0, fx: { atk: 0.3, def: 0.2, t: 20 } },
    yuumi:     { nm: "ランタンの道しるべ", ic: "pn_hat", cond: { k: "room" }, cd: 15, fx: { spd: 0.3, atk: 0.2, t: 8 } },
    rina:      { nm: "解けない呪縛", ic: "vital", cond: { k: "hpLow", v: 0.4 }, cd: 50, fx: { atk: 0.4, def: 0.2, t: 10 } },
    kaori:     { nm: "ゴースト・パーティー", ic: "pn_ghost", cond: { k: "ult" }, cd: 0, fx: { atk: 0.25, t: 10, techG: 0.4 } },
    /* ★★ 2026-10-16 超極華祭 */
    chie:      { nm: "桜吹雪の型", ic: "cy_sakura", cond: { k: "skill" }, cd: 6, fx: { atk: 0.25, crit: 15, t: 4 } },
    ichika:    { nm: "真夏のビッグウェーブ", ic: "cy_shell", cond: { k: "kills", n: 15, s: 8 }, cd: 20, fx: { aspd: 0.35, spd: 0.15, t: 8 } },
    nonoka:    { nm: "おかえりなさいませ", ic: "cy_teacup", cond: { k: "hpLow", v: 0.5 }, cd: 45, fx: { heal: 0.25, shield: 0.35, def: 0.25, t: 8 } },
    aina:      { nm: "月下の誓い", ic: "sk_rose", cond: { k: "boss" }, cd: 0, fx: { atk: 0.3, def: 0.2, t: 20 } },
    yuna:      { nm: "宵闇の独占欲", ic: "sk_rose", cond: { k: "ult" }, cd: 0, fx: { atk: 0.3, crit: 20, t: 10, techG: 0.4 } },
    /* ★★ 2026-10-22 超極煌祭（ユナ・アイナ・イチカと同じ効果） */
    kohaku:    { nm: "紅薔薇の独占", ic: "sk_rose", cond: { k: "ult" }, cd: 0, fx: { atk: 0.3, crit: 20, t: 10, techG: 0.4 } },
    suzu:      { nm: "夏の日の約束", ic: "cy_hat", cond: { k: "boss" }, cd: 0, fx: { atk: 0.3, def: 0.2, t: 20 } },
    shouko:    { nm: "真夏のサンシャイン", ic: "cy_sun", cond: { k: "kills", n: 15, s: 8 }, cd: 20, fx: { aspd: 0.35, spd: 0.15, t: 8 } },
    /* ★★ 2026-10-24 ヒサコ（コハクより少し上）・アリス（コハクと同じ）・ミキ（ショウコと同じ） */
    hisako:    { nm: "ふたりだけの特別授業", ic: "cy_book", cond: { k: "ult" }, cd: 0, fx: { atk: 0.33, crit: 22, t: 10, techG: 0.4 } },
    alice:     { nm: "白百合の独占", ic: "cy_lily", cond: { k: "ult" }, cd: 0, fx: { atk: 0.3, crit: 20, t: 10, techG: 0.4 } },
    miki:      { nm: "青い花の約束", ic: "cy_bloom", cond: { k: "kills", n: 15, s: 8 }, cd: 20, fx: { aspd: 0.35, spd: 0.15, t: 8 } },
    /* ★★ 2026-10-30 超極彩祭（ヒサコより少し上） */
    haru:      { nm: "あじさいの海風", ic: "cy_hydra", cond: { k: "ult" }, cd: 0, fx: { atk: 0.35, crit: 23, t: 10, techG: 0.4 } },
    chika:     { nm: "月夜だけの素顔", ic: "cy_moon", cond: { k: "ult" }, cd: 0, fx: { atk: 0.35, crit: 23, t: 10, techG: 0.4 } },
    hinano:    { nm: "翠光の追い風", ic: "gale", cond: { k: "kills", n: 12, s: 6 }, cd: 18, fx: { aspd: 0.35, spd: 0.2, t: 6 } },
    hanon:     { nm: "ブザービーター", ic: "at_ball", cond: { k: "foeLow", v: 0.3 }, cd: 30, fx: { atk: 0.4, t: 10 } },
    kokoha:    { nm: "椿雨の帳", ic: "sk_umbrella", cond: { k: "noHit", s: 10 }, cd: 25, fx: { atk: 0.25, crit: 15, t: 10 } },
    mutsumi:   { nm: "陽炎の逆襲", ic: "sk_mirage", cond: { k: "hurtBig", v: 0.12 }, cd: 30, fx: { inv: 3, atk: 0.35, t: 6 } },
    reina:     { nm: "宵闇の号令", ic: "sk_clone", cond: { k: "skill" }, cd: 9, fx: { atk: 0.2, critDmg: 0.3, t: 6 } },
    azusa:     { nm: "青薔薇は散らず", ic: "sk_rose", cond: { k: "dodge" }, cd: 8, fx: { atk: 0.3, t: 4, heal: 0.04 } },
    kumireina: { nm: "アンコール！", ic: "sk_fanfare", cond: { k: "art" }, cd: 6, fx: { cdr: 3, mp: 15, aspd: 0.2, t: 5 } },
    kagura:    { nm: "彼岸の一閃", ic: "sk_wave", cond: { k: "hpLow", v: 0.5 }, cd: 45, fx: { crit: 40, atk: 0.25, t: 8 } },
    kotori:    { nm: "ラストディフェンス", ic: "sk_wall", cond: { k: "crowd", n: 10 }, cd: 20, fx: { shield: 0.3, nova: { r: 90, mul: 3, kb: 1 } } },
  };
  const UNIQUE_DEF = { nm: "星脈の目覚め", ic: "star", cond: { k: "boss" }, cd: 0, fx: { atk: 0.2, t: 15 } };
  /* キャラごとの 金1・白2 */
  const KIT = {
    takina: ["kaishin", "mikiri", "oikaze"], hibana: ["teppeki", "shinkokyu", "takara"], fuki: ["kaishin", "ikioi", "mikiri"],
    ayano: ["renkei", "kakomare", "shuchu"], saki: ["teppeki", "gyakkyo", "takara"], yuka: ["renkei", "mikiri", "shuchu"],
    natsumi: ["shippu", "oikaze", "mikiri"], miu: ["shippu", "kakomare", "ikioi"], mai: ["yoin", "seicho", "shinkokyu"],
    chinatsu: ["fudo", "omono", "sente"], yuumi: ["shippu", "oikaze", "takara"], rina: ["zenshin", "kakomare", "gyakkyo"],
    kaori: ["yoin", "ikioi", "shuchu"], hinano: ["shippu", "oikaze", "sente"], hanon: ["bosskill", "omono", "seicho"],
    kokoha: ["renkei", "shinkokyu", "kakomare"], mutsumi: ["zenshin", "ikioi", "oikaze"], reina: ["yoin", "shuchu", "omono"],
    azusa: ["kaishin", "mikiri", "oikaze"], kumireina: ["renkei", "seicho", "takara"], kagura: ["zenshin", "kakomare", "gyakkyo"],
    kotori: ["teppeki", "gyakkyo", "kakomare"],
    /* ★★ 2026-10-16 超極華祭 */
    chie: ["kaishin", "ikioi", "oikaze"], ichika: ["shippu", "oikaze", "mikiri"], nonoka: ["teppeki", "shinkokyu", "takara"],
    aina: ["fudo", "omono", "shuchu"], yuna: ["yoin", "mikiri", "shuchu"],
    /* ★★ 2026-10-22 超極煌祭 */
    kohaku: ["yoin", "mikiri", "shuchu"], suzu: ["fudo", "omono", "shuchu"], shouko: ["shippu", "oikaze", "mikiri"],
    /* ★★ 2026-10-24 */
    hisako: ["yoin", "mikiri", "shuchu"], alice: ["yoin", "mikiri", "shuchu"], miki: ["shippu", "oikaze", "mikiri"],
    /* ★★ 2026-10-30 */
    haru: ["yoin", "mikiri", "shuchu"], chika: ["yoin", "mikiri", "shuchu"],
  };
  const KIT_DEF = ["fudo", "mikiri", "shinkokyu"];

  /* ══ 秘技（手動）══
     cond … ゲージのたまり方（k の行動を n 回で満タン）／ mul … 攻撃力の何倍か */
  const TECH = {
    takina:    { nm: "蒼閃・アクアストライク", ic: "at_gun", kind: "beam", cond: { k: "dodge", n: 4 }, mul: 9, w: 30, len: 320 },
    hibana:    { nm: "ワスレナ・サンクチュアリ", ic: "sk_forget", kind: "barrier", cond: { k: "hurt", n: 6 }, shield: 0.45, heal: 0.15, mul: 3, r: 110 },
    fuki:      { nm: "朧・一輪", ic: "sk_veil", kind: "mark", cond: { k: "crit", n: 30 }, mul: 11, vul: 0.3, t: 8 },
    ayano:     { nm: "スカーレット・バースト", ic: "fireball", kind: "nova", cond: { k: "kill", n: 30 }, mul: 6, r: 125, burn: 1 },
    saki:      { nm: "キャンディ・ドーム", ic: "pn_candy", kind: "barrier", cond: { k: "hurt", n: 6 }, shield: 0.5, heal: 0.12, mul: 2.5, r: 100 },
    yuka:      { nm: "スターダスト・ベル", ic: "meteor", kind: "starfall", cond: { k: "crit", n: 30 }, mul: 5, n: 7 },
    natsumi:   { nm: "ミッドナイト・クロー", ic: "at_claw", kind: "dashcut", cond: { k: "dodge", n: 4 }, mul: 7.5, dist: 150 },
    miu:       { nm: "パンプキン・トルネード", ic: "pn_pumpkin", kind: "whirl", cond: { k: "kill", n: 30 }, mul: 3.2, r: 90, n: 3 },
    mai:       { nm: "クローバー・シャワー", ic: "pn_clover", kind: "rain", cond: { k: "time", n: 25 }, mul: 0.9, r: 95, t: 3 },
    chinatsu:  { nm: "キャンドル・ジャッジ", ic: "pn_candle", kind: "beam", cond: { k: "crit", n: 30 }, mul: 9, w: 30, len: 320 },
    yuumi:     { nm: "ランタン・ファン", ic: "at_fan", kind: "fan", cond: { k: "dodge", n: 5 }, mul: 2.3, n: 14 },
    rina:      { nm: "バンデージ・ストーム", ic: "shadowbind", kind: "whirl", cond: { k: "hurt", n: 6 }, mul: 3.4, r: 90, n: 3 },
    kaori:     { nm: "ポルターガイスト", ic: "pn_ghost", kind: "starfall", cond: { k: "kill", n: 30 }, mul: 5, n: 7 },
    /* ★★ 2026-10-16 超極華祭 */
    chie:      { nm: "桜花・千刃", ic: "cy_sakura", kind: "dashcut", cond: { k: "dodge", n: 4 }, mul: 7.5, dist: 150 },
    ichika:    { nm: "スプラッシュ・ファン", ic: "cy_shell", kind: "fan", cond: { k: "dodge", n: 5 }, mul: 2.3, n: 14 },
    nonoka:    { nm: "ティーパーティー・ドーム", ic: "cy_teacup", kind: "barrier", cond: { k: "hurt", n: 6 }, shield: 0.5, heal: 0.15, mul: 2.8, r: 105 },
    aina:      { nm: "ムーンライト・ジャッジ", ic: "sk_rose", kind: "beam", cond: { k: "crit", n: 30 }, mul: 9, w: 30, len: 320 },
    yuna:      { nm: "朔夜・ブルーローズ", ic: "sk_rose", kind: "mark", cond: { k: "crit", n: 30 }, mul: 9, vul: 0.3, t: 8 },
    /* ★★ 2026-10-22 超極煌祭 */
    kohaku:    { nm: "紅煌・クリムゾンムーン", ic: "sk_rose", kind: "mark", cond: { k: "crit", n: 30 }, mul: 9, vul: 0.3, t: 8 },
    suzu:      { nm: "サンセット・レイ", ic: "cy_hat", kind: "beam", cond: { k: "crit", n: 30 }, mul: 9, w: 30, len: 320 },
    shouko:    { nm: "サンシャイン・ファン", ic: "cy_sun", kind: "fan", cond: { k: "dodge", n: 5 }, mul: 2.3, n: 14 },
    /* ★★ 2026-10-24 */
    hisako:    { nm: "桜色・ハナミズキ", ic: "cy_book", kind: "mark", cond: { k: "crit", n: 30 }, mul: 9.9, vul: 0.3, t: 8 },
    alice:     { nm: "白銀・ホワイトムーン", ic: "cy_lily", kind: "mark", cond: { k: "crit", n: 30 }, mul: 9, vul: 0.3, t: 8 },
    miki:      { nm: "ブルーベル・ファン", ic: "cy_bloom", kind: "fan", cond: { k: "dodge", n: 5 }, mul: 2.3, n: 14 },
    /* ★★ 2026-10-30 */
    haru:      { nm: "蒼海・ブルーティアーズ", ic: "cy_hydra", kind: "mark", cond: { k: "crit", n: 30 }, mul: 10.4, vul: 0.3, t: 8 },
    chika:     { nm: "月下・フルムーンメモリー", ic: "cy_moon", kind: "mark", cond: { k: "crit", n: 30 }, mul: 10.4, vul: 0.3, t: 8 },
    hinano:    { nm: "プリズム・スプラッシュ", ic: "sk_prism", kind: "fan", cond: { k: "dodge", n: 5 }, mul: 2.2, n: 14 },
    hanon:     { nm: "ゴールデン・ブザー", ic: "sk_hoop", kind: "mark", cond: { k: "skill", n: 4 }, mul: 11, vul: 0.3, t: 8 },
    kokoha:    { nm: "ツバキ・シグレ", ic: "sk_umbrella", kind: "rain", cond: { k: "time", n: 25 }, mul: 0.95, r: 95, t: 3, burn: 1 },
    mutsumi:   { nm: "カゲロウ・トッシン", ic: "sk_mirage", kind: "dashcut", cond: { k: "hurt", n: 5 }, mul: 7.5, dist: 150 },
    reina:     { nm: "シャドウ・レイン", ic: "sk_clone", kind: "starfall", cond: { k: "skill", n: 4 }, mul: 5, n: 7 },
    azusa:     { nm: "ローズ・ピルエット", ic: "sk_rose", kind: "whirl", cond: { k: "dodge", n: 4 }, mul: 3.2, r: 85, n: 3 },
    kumireina: { nm: "ハーモニー・ブラスト", ic: "music", kind: "nova", cond: { k: "skill", n: 4 }, mul: 6, r: 125 },
    kagura:    { nm: "緋刃・天斬", ic: "sk_wave", kind: "beam", cond: { k: "kill", n: 30 }, mul: 9.5, w: 40, len: 300 },
    kotori:    { nm: "アクア・フォートレス", ic: "sk_wall", kind: "barrier", cond: { k: "hurt", n: 5 }, shield: 0.5, heal: 0.1, mul: 3, r: 110 },
  };
  const TECH_DEF = { nm: "星脈の一撃", ic: "star", kind: "nova", cond: { k: "kill", n: 30 }, mul: 5, r: 110 };

  /* ══ 説明の文（ギルド・探索中の両方で使う）══ */
  function condText(c) {
    switch (c.k) {
      case "hpLow": return "HPが" + pc(c.v) + "以下になったとき";
      case "crowd": return "まわりに敵が" + c.n + "体以上いるとき";
      case "kills": return c.s + "秒以内に敵を" + c.n + "体倒したとき";
      case "dodge": return "攻撃をよけたとき（赤い予告の外へ出る・弾をかすめる・MISS）";
      case "crit": return c.s + "秒以内に会心を" + c.n + "回出したとき";
      case "noHit": return "戦闘中に" + c.s + "秒間ダメージを受けなかったとき";
      case "every": return "戦闘中 " + c.s + "秒ごと";
      case "skill": return "固有技を使ったとき";
      case "art": return "技（E）を使ったとき";
      case "combo": return "固有技と技を" + c.s + "秒以内に続けて使ったとき";
      case "ult": return "必殺技を使ったとき";
      case "chest": return "宝箱を開けたとき";
      case "lv": return "レベルが上がったとき";
      case "boss": return "ボス戦が始まったとき";
      case "mid": return "中ボスと戦っているあいだ";
      case "foeLow": return "近くのボス・中ボスのHPが" + pc(c.v) + "以下のとき";
      case "room": return "新しい部屋に入ったとき";
      case "hurtBig": return "一度に最大HPの" + pc(c.v) + "以上のダメージを受けたとき";
    }
    return "";
  }
  function fxText(f) {
    const out = [], b = [];
    if (f.atk) b.push("与えるダメージ+" + pc(f.atk));
    if (f.aspd) b.push("攻撃速度+" + pc(f.aspd));
    if (f.crit) b.push("会心率+" + f.crit + "%");
    if (f.critDmg) b.push("会心ダメージ+" + pc(f.critDmg));
    if (f.def) b.push("受けるダメージ-" + pc(f.def));
    if (f.spd) b.push("移動速度+" + pc(f.spd));
    if (b.length) out.push((f.t && f.t < 2 ? "" : f.t + "秒 ") + b.join("・"));
    if (f.heal) out.push("HPを" + pc(f.heal) + "回復");
    if (f.shield) out.push("最大HPの" + pc(f.shield) + "のバリア");
    if (f.mp) out.push(f.mp >= 999 ? "MPを全回復" : "MP+" + f.mp);
    if (f.gauge) out.push("必殺技ゲージ+" + f.gauge);
    if (f.techG) out.push("秘技ゲージ+" + pc(f.techG));
    if (f.inv) out.push(f.inv + "秒 無敵");
    if (f.cdr) out.push("固有技と技の再使用まで-" + f.cdr + "秒");
    if (f.nova) out.push("まわりに衝撃（半径" + f.nova.r + "・攻撃力×" + f.nova.mul + (f.nova.burn ? "・燃焼" : "") + "）");
    if (f.stars) out.push("近くの敵" + f.stars.n + "体へ星を落とす（1つ 攻撃力×" + f.stars.mul + "）");
    if (f.defDown) out.push("まわりの敵の防御ダウン（" + f.defDown + "秒）");
    return out.join("・");
  }
  function techCondText(c) {
    return { kill: "敵を" + c.n + "体倒す", dodge: "攻撃を" + c.n + "回よける（予告の外へ出る・弾をかすめる）", crit: "会心を" + c.n + "回出す", hurt: "ダメージを" + c.n + "回受ける", skill: "固有技・技を" + c.n + "回使う", time: "戦闘中 " + c.n + "秒" }[c.k] + "で満タン";
  }
  function techText(T) {
    const m = T.mul;
    switch (T.kind) {
      case "beam": return "ねらった方向へ極太の光線（長さ" + T.len + "・攻撃力×" + m + "・ふっとばし）";
      case "nova": return "自分のまわりに大爆発（半径" + T.r + "・攻撃力×" + m + "・0.6秒気絶" + (T.burn ? "・燃焼" : "") + "）";
      case "whirl": return "回転斬りを" + T.n + "回（半径" + T.r + "・1回 攻撃力×" + m + "）";
      case "dashcut": return "前へ" + T.dist + "踏みこんで通った敵を斬る（攻撃力×" + m + "・その間は無敵）";
      case "fan": return "扇状に" + T.n + "発（4体まで貫通・1発 攻撃力×" + m + "）";
      case "starfall": return "近くの敵" + T.n + "体へ星を落とす（1つ 攻撃力×" + m + "）";
      case "mark": return "いちばん強い敵に大きな一撃（攻撃力×" + m + "）＋" + T.t + "秒 受けるダメージ+" + pc(T.vul);
      case "barrier": return "最大HPの" + pc(T.shield) + "のバリア＋HP" + pc(T.heal) + "回復＋近くの敵の弾を消す＋まわりをふっとばす（攻撃力×" + m + "）";
      case "rain": return "敵の多い所に" + T.t + "秒間の" + (T.burn ? "火の" : "") + "雨（半径" + T.r + "・0.25秒ごとに攻撃力×" + m + "）";
    }
    return "";
  }
  /* キャラの4つの発動スキル（虹→金→白→白） */
  function list(cid) {
    const u = Object.assign({ rar: "U", id: "u_" + cid }, UNIQUE[cid] || UNIQUE_DEF);
    return [u].concat((KIT[cid] || KIT_DEF).map((k) => Object.assign({ id: k }, AUTO[k])));
  }
  function techOf(cid) { return TECH[cid] || TECH_DEF; }

  /* ══════════════════════════════════════════════════════════════
     探索中
     ══════════════════════════════════════════════════════════════ */
  let R = null;   // この探索の状態
  function start() {
    const g = G(), P = g.P;
    R = { sk: list(P.cid).map((s) => ({ s, cd: 0 })), kills: [], crits: [], noHitT: 0, everyT: 0, lastSkill: -9, lastArt: -9, dodgeT: 0, rooms: new Set(), lastRoom: -1, chkT: 0, combat: false };
    P.techG = P.techG || 0; P.skAct = []; P.skB = null;
    P.tech = techOf(P.cid);
  }
  function S(k) { return R && R.sk.find((x) => x.s.cond.k === k); }
  /* いまかかっている強化の合計（毎コマ・少ないので軽い） */
  function sumBuffs(P) {
    const b = { atk: 0, aspd: 0, crit: 0, critDmg: 0, def: 0, spd: 0 };
    let any = false;
    for (const a of P.skAct) { const f = a.fx; ["atk", "aspd", "crit", "critDmg", "def", "spd"].forEach((k) => { if (f[k]) { b[k] += f[k]; any = true; } }); }
    P.skB = any ? b : null;
  }
  function fire(x, why) {
    const g = G(), P = g.P; if (!P || !P.alive) return;
    const s = x.s, f = s.fx;
    x.cd = s.cd || 0.1;
    /* 時間で切れる強化（同じスキルは上書き） */
    if (f.t && (f.atk || f.aspd || f.crit || f.critDmg || f.def || f.spd)) {
      P.skAct = P.skAct.filter((a) => a.id !== s.id);
      P.skAct.push({ id: s.id, nm: s.nm, rar: s.rar, ic: s.ic, t: f.t, max: f.t, fx: f });
      sumBuffs(P);
    }
    if (f.heal) E().heal(P.st.hp * f.heal, true);
    if (f.shield) P.shield = Math.max(P.shield, Math.round(P.st.hp * f.shield));
    if (f.mp) P.mp = Math.min(P.st.mmp, P.mp + (f.mp >= 999 ? P.st.mmp : f.mp));
    if (f.gauge) P.ultG = Math.min(100, P.ultG + f.gauge);
    if (f.techG) P.techG = Math.min(1, (P.techG || 0) + f.techG);
    if (f.inv) P.iT = Math.max(P.iT, f.inv);
    if (f.cdr) { P.skillCd = Math.max(0, P.skillCd - f.cdr); P.burstCd = Math.max(0, P.burstCd - f.cdr); }
    const el = P.C.el;
    if (f.nova) {
      W().circleHit(P.x, P.y, f.nova.r, P.st.atk * f.nova.mul, el, { src: "skill2", burn: f.nova.burn ? 1 : 0, kb: f.nova.kb ? 30 : 0 });
      E().fx({ type: "shock", x: P.x, y: P.y, t: 0, dur: 0.5, r: f.nova.r, col: ec(el) });
      g.shake = Math.max(g.shake, 6);
    }
    if (f.stars) {
      const tg = E().nearestN(P.x, P.y, 280, f.stars.n);
      tg.forEach((e, i) => g.queue.push({ at: g.t + 0.15 + i * 0.07, f: () => { if (e.dead) return; W().circleHit(e.x, e.y, 26, G().P.st.atk * f.stars.mul, el, { src: "skill2" }); E().fx({ type: "meteor", x: e.x, y: e.y, t: 0, dur: 0.35, col: ec(el) }); } }));
    }
    if (f.defDown) E().enemiesIn(P.x, P.y, 160).forEach((e) => { e.defDownT = Math.max(e.defDownT || 0, f.defDown); });
    if (!s.quiet || !x.shown) { x.shown = 1; MA.UI && MA.UI.skillBanner && MA.UI.skillBanner(s); A().sfx(s.rar === "U" ? "levelup" : "skill"); }
    g.stats.skills = (g.stats.skills || 0) + 1;
  }
  function tryFire(k, test) {
    if (!R) return;
    for (const x of R.sk) { if (x.s.cond.k !== k || x.cd > 0) continue; if (test && !test(x.s.cond)) continue; fire(x); }
  }
  /* 出来事（engine・weapons から呼ぶ） */
  function ev(k, v) {
    if (!R) return;
    const g = G(), P = g.P; if (!P || !P.alive) return;
    const t = g.t, T = P.tech;
    switch (k) {
      case "kill":
        R.kills.push(t);
        if (R.kills.length > 60) R.kills.splice(0, R.kills.length - 60);
        tryFire("kills", (c) => R.kills.filter((x) => x > t - c.s).length >= c.n);
        if (T.cond.k === "kill") addTech(1 / T.cond.n);
        break;
      case "crit":
        R.crits.push(t);
        if (R.crits.length > 40) R.crits.splice(0, R.crits.length - 40);
        tryFire("crit", (c) => R.crits.filter((x) => x > t - c.s).length >= c.n);
        if (T.cond.k === "crit") addTech(1 / T.cond.n);
        break;
      case "dodge":
        /* 続けて何度も数えない（弾をかすめたのは 2.5 秒に1回まで） */
        if (t - R.dodgeT < (v === "graze" ? 2.5 : 0.4)) return;
        R.dodgeT = t;
        tryFire("dodge");
        if (T.cond.k === "dodge") addTech(1 / T.cond.n);
        break;
      case "hurt":
        R.noHitT = 0;
        if (v >= P.st.hp * 0.05) tryFire("hurtBig", (c) => v >= P.st.hp * c.v);
        if (T.cond.k === "hurt") addTech(1 / T.cond.n);
        break;
      case "skill":
        R.lastSkill = t; tryFire("skill");
        if (t - R.lastArt <= 4) tryFire("combo", (c) => t - R.lastArt <= c.s);
        if (T.cond.k === "skill") addTech(1 / T.cond.n);
        break;
      case "art":
        R.lastArt = t; tryFire("art");
        if (t - R.lastSkill <= 4) tryFire("combo", (c) => t - R.lastSkill <= c.s);
        if (T.cond.k === "skill") addTech(1 / T.cond.n);
        break;
      case "ult": tryFire("ult"); break;
      case "chest": tryFire("chest"); break;
      case "lv": tryFire("lv"); break;
      case "boss": tryFire("boss"); break;
    }
  }
  function addTech(v) {
    const P = G().P; if (!P) return;
    const was = P.techG || 0;
    P.techG = Math.min(1, was + v);
    if (was < 1 && P.techG >= 1) { E().pop(P.x, P.y - 30, "秘技 READY!", "#ffd84a"); A().sfx("key"); }
  }
  /* 毎コマ（engine の tick から） */
  function update(dt) {
    if (!R) return;
    const g = G(), P = g.P; if (!P || !P.alive) return;
    R.sk.forEach((x) => { if (x.cd > 0) x.cd -= dt; });
    if (P.skAct.length) { let ch = false; P.skAct = P.skAct.filter((a) => { a.t -= dt; if (a.t <= 0) { ch = true; return false; } return true; }); if (ch) sumBuffs(P); }
    R.combat = !!g.ultNear;
    if (R.combat) {
      R.noHitT += dt; R.everyT += dt;
      if (P.tech.cond.k === "time") addTech(dt / P.tech.cond.n);
    }
    R.chkT -= dt;
    if (R.chkT > 0) return;
    R.chkT = 0.2;
    /* 状態の条件（0.2秒ごと） */
    tryFire("hpLow", (c) => P.hp <= P.st.hp * c.v);
    tryFire("crowd", (c) => E().enemiesIn(P.x, P.y, 90).length >= c.n);
    if (R.combat) {
      tryFire("noHit", (c) => R.noHitT >= c.s);
      tryFire("every", (c) => { if (R.everyT >= c.s) { R.everyT = 0; return true; } return false; });
    }
    tryFire("mid", () => g.E.some((e) => e.mid && !e.dead && E().dist2(e.x, e.y, P.x, P.y) < 220 * 220));
    tryFire("foeLow", (c) => g.E.some((e) => (e.mid || e.boss) && !e.dead && !e.isGim && e.hp <= e.mhp * c.v && E().dist2(e.x, e.y, P.x, P.y) < 240 * 240));
    /* 新しい部屋に入ったとき */
    const rid = MA.Map.roomOf(g.map, P.x, P.y);
    if (rid >= 0 && rid !== R.lastRoom) {
      R.lastRoom = rid;
      if (!R.rooms.has(rid)) { R.rooms.add(rid); const ty = g.map.rooms[rid].type; if (ty !== "start") tryFire("room"); }
    }
  }
  /* 秘技を撃つ（キー T・スマホのボタン） */
  const TK = {
    beam(P, T, el, dmg) {
      const a = P.aimA, x = P.x, y = P.y - 4;
      W().lineHit(x, y, a, T.len, T.w, dmg, el, { src: "tech", kb: 20 });
      E().fx({ type: "beam", x, y, a, len: T.len, w: T.w, t: 0, dur: 0.5, col: ec(el) });
      G().shake = 8; A().sfx("boom");
    },
    nova(P, T, el, dmg) {
      W().circleHit(P.x, P.y, T.r, dmg, el, { src: "tech", kb: 30, burn: T.burn ? 1 : 0, stun: 0.6 });
      E().fx({ type: "shock", x: P.x, y: P.y, t: 0, dur: 0.6, r: T.r, col: ec(el) });
      G().shake = 10; A().sfx("boom");
    },
    whirl(P, T, el, dmg) {
      for (let i = 0; i < T.n; i++) G().queue.push({ at: G().t + i * 0.18, f: () => {
        const P2 = G().P; if (!P2.alive) return;
        W().circleHit(P2.x, P2.y, T.r, dmg, el, { src: "tech", kb: 18 });
        E().fx({ type: "slash", x: P2.x, y: P2.y, a: i * 2.1, r: T.r, arc: TAU, t: 0, dur: 0.2, col: ec(el), col2: "#ffffff" });
        A().sfx("slash");
      } });
    },
    dashcut(P, T, el, dmg) {
      const a = P.aimA, x0 = P.x, y0 = P.y;
      P.iT = Math.max(P.iT, 0.6);
      E().moveCircle(P, Math.cos(a) * T.dist, Math.sin(a) * T.dist, true);
      W().lineHit(x0, y0, a, T.dist + 16, 36, dmg, el, { src: "tech", kb: 24 });
      E().fx({ type: "beam", x: x0, y: y0, a, len: T.dist, w: 18, t: 0, dur: 0.35, col: ec(el) });
      A().sfx("slash");
    },
    fan(P, T, el, dmg) {
      const a0 = P.aimA;
      for (let i = 0; i < T.n; i++) { const a = a0 + (i - (T.n - 1) / 2) * (1.6 / T.n); W().shoot({ x: P.x, y: P.y - 4, a, speed: 300, dmg, el, pierce: 4, life: 0.9, r: 4, kind: "petal", col: ec(el), src: "tech" }); }
      A().sfx("shot");
    },
    starfall(P, T, el, dmg) {
      const tg = E().nearestN(P.x, P.y, 300, T.n);
      tg.forEach((e, i) => G().queue.push({ at: G().t + 0.18 + i * 0.07, f: () => { const x = e.x, y = e.y; W().circleHit(x, y, 30, dmg, el, { src: "tech" }); E().fx({ type: "meteor", x, y, t: 0, dur: 0.35, col: ec(el) }); if (i % 2 === 0) A().sfx("boom"); } }));
    },
    mark(P, T, el, dmg) {
      const e = E().strongest(P.x, P.y, 300) || E().nearest(P.x, P.y, 300); if (!e) return;
      e.vulT = Math.max(e.vulT || 0, T.t); e.vulK = Math.max(e.vulK || 0, T.vul);
      E().damageEnemy(e, dmg, { el, src: "tech" });
      E().fx({ type: "burst", x: e.x, y: e.y, t: 0, dur: 0.6, col: ec(el) });
      A().sfx("boom");
    },
    barrier(P, T, el, dmg) {
      P.shield = Math.max(P.shield, Math.round(P.st.hp * T.shield));
      E().heal(P.st.hp * T.heal);
      G().EB = G().EB.filter((b) => E().dist2(b.x, b.y, P.x, P.y) > 140 * 140);
      W().circleHit(P.x, P.y, T.r, dmg, el, { src: "tech", kb: 30 });
      E().fx({ type: "ring", x: P.x, y: P.y, t: 0, dur: 0.6, r: T.r, col: ec(el) });
      A().sfx("heal");
    },
    rain(P, T, el, dmg) {
      const near = G().E.filter((e) => !e.dead && !e.isGim && E().dist2(e.x, e.y, P.x, P.y) < 260 * 260);
      let x = P.x + Math.cos(P.aimA) * 60, y = P.y + Math.sin(P.aimA) * 60;
      if (near.length) { x = near.reduce((s, e) => s + e.x, 0) / near.length; y = near.reduce((s, e) => s + e.y, 0) / near.length; }
      E().zone({ x, y, r: T.r, dur: T.t, dmg, el, tick: 0.25, quiet: 1, burn: T.burn ? 1 : 0, col: ec(el), kind: "bigrain", src: "tech" });
    },
  };
  function tech() {
    const g = G(), P = g.P;
    if (!P || !P.alive || !R) return;
    const T = P.tech;
    if ((P.techG || 0) < 1) { E().pop(P.x, P.y - 24, "秘技 " + Math.floor((P.techG || 0) * 100) + "%", "#ffd84a"); return; }
    P.techG = 0;
    const dmg = P.st.atk * T.mul * P.st.mag;
    (TK[T.kind] || TK.nova)(P, T, P.C.el, dmg);
    E().pop(P.x, P.y - 28, T.nm, "#ffd84a");
    if (MA.W && MA.W.onDash) MA.W.onDash();
    MA.UI && MA.UI.skillBanner && MA.UI.skillBanner({ nm: T.nm, rar: "T", ic: T.ic });
    g.stats.techs = (g.stats.techs || 0) + 1;
  }
  function stop() { R = null; }

  MA.Skills = { AUTO, UNIQUE, KIT, TECH, list, techOf, condText, fxText, techCondText, techText, start, stop, update, ev, tech, addTech };
})();
