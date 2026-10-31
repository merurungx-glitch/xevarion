/* ============================================================
   MagiBattle の性能（v3）— magibattle-stats.js
   ★★ 2026-10-30 ご指定「MagiBattle をゲームとアプリを1から作り直し」「NIKKE や NIKKE のアリーナ」
     「対応キャラは超極祭系3種の UR のキャラのみ・性能も NIKKE 風に」
   ・使えるのは<b>超極華祭・超極煌祭・超極彩祭の UR 12体</b>だけ（ミキは WP 交換なので入らない）。
   ・ここが性能の<b>ただ1つの持ち主</b>：MagiBattle 本体（MagiBattle/js/mb3-*.js）・図鑑のキャラ詳細（mb-char-detail.js）・
     ガチャの新キャラ紹介（gacha-ui.js）・characters.html が同じ数字を見る。
   ・NIKKE 風の要素：武器6種（AR/SMG/SG/SR/RL/MG）・クラス（火力/防御/支援）・バースト Ⅰ→Ⅱ→Ⅲ→フルバースト・
     スキル1／スキル2／バーストスキル（Lv1〜10）・Lv（凸で上限 80/120/160/200）・装備4部位（T1〜T9＋オーバーロード）・
     キューブ・好感度・研究。部隊（所属）は ガチャの祭ごと＝ブルーム隊（超極華祭）・ブレイズ隊（超極煌祭）・プリズム隊（超極彩祭）。
   ・前の v2（XEVARION の全キャラ・MBStats.roster）は廃止。セーブも magibattle_v1 → magibattle_v2。
   ============================================================ */
(function () {
  "use strict";
  const VERSION = 3;
  const SAVE_KEY = "magibattle_v2";

  /* ══════════ 区分 ══════════ */
  const ELEM = {
    fire: { nm: "火", en: "FIRE", c: "#ff5a4a" }, water: { nm: "水", en: "WATER", c: "#3aa0ff" }, wood: { nm: "木", en: "WOOD", c: "#3fcf6a" },
    light: { nm: "光", en: "LIGHT", c: "#ffc93a" }, dark: { nm: "闇", en: "DARK", c: "#a46bff" },
  };
  /* 有利：火→木→水→火（3すくみ）・光⇄闇（たがいに有利）。有利な相手に与ダメージ +10% */
  const ADV = { fire: "wood", wood: "water", water: "fire", light: "dark", dark: "light" };
  function elemAdv(a, d) { return !!a && !!d && ADV[a] === d; }
  const CLASSES = {
    atk: { nm: "火力型", en: "ATTACKER", c: "#ff4d6d" },
    def: { nm: "防御型", en: "DEFENDER", c: "#3aa0ff" },
    sup: { nm: "支援型", en: "SUPPORTER", c: "#2fd18a" },
  };
  const SQUADS = {
    bloom: { nm: "ブルーム隊", en: "BLOOM", fes: "超極華祭", c: "#ff8fb8" },
    blaze: { nm: "ブレイズ隊", en: "BLAZE", fes: "超極煌祭", c: "#ffb347" },
    prism: { nm: "プリズム隊", en: "PRISM", fes: "超極彩祭", c: "#9b8cff" },
  };
  const BURST = { 1: { nm: "Ⅰ", c: "#2fd18a" }, 2: { nm: "Ⅱ", c: "#3aa0ff" }, 3: { nm: "Ⅲ", c: "#ff4d6d" } };

  /* ══════════ 武器（NIKKE 風）══════════
     mag＝弾倉・rate＝1秒の発射数・mul＝1発の倍率（攻撃力×）・reload＝秒・pel＝散弾の粒・chg＝チャージ秒（SR/RL）
     gauge＝1発あてたときのバーストゲージ・opt＝得意な距離（0＝手前〜1＝奥）・splash＝爆風の半径（RL） */
  const WEAPONS = {
    AR:  { nm: "アサルトライフル", sh: "AR",  mag: 60,  rate: 10, mul: 0.13, reload: 1.5, gauge: 0.17, opt: [0.25, 0.70] },
    SMG: { nm: "サブマシンガン",   sh: "SMG", mag: 120, rate: 15, mul: 0.07, reload: 1.2, gauge: 0.11, opt: [0.00, 0.50] },
    SG:  { nm: "ショットガン",     sh: "SG",  mag: 9,   rate: 1.4, mul: 0.12, pel: 10, reload: 1.7, gauge: 0.09, opt: [0.00, 0.50] },
    SR:  { nm: "スナイパーライフル", sh: "SR", mag: 6,  rate: 0.9, mul: 1.0, chg: 1.0, chgMul: 2.0, reload: 2.0, gauge: 2.7, opt: [0.50, 1.00] },
    RL:  { nm: "ロケットランチャー", sh: "RL", mag: 6,  rate: 0.8, mul: 0.8, chg: 1.0, chgMul: 2.0, reload: 2.2, gauge: 2.8, splash: 0.12, opt: [0.45, 1.00] },
    MG:  { nm: "マシンガン",       sh: "MG",  mag: 300, rate: 20, rate0: 4, ramp: 2.4, mul: 0.065, reload: 2.8, gauge: 0.09, opt: [0.25, 0.75] },
  };

  /* ══════════ 12体のキット ══════════
     base … Lv1・凸0 の HP／攻撃／防御。tier … 強さの帯（MagiAbyss の並びに合わせる：ハル≒チカ＞ヒサコ＞ユナ≒コハク≒アリス＞ほか）
     スキルの v … [Lv1, Lv10]（あいだは直線）。desc の {v} {w} を置きかえる。fx … 本体（mb3-engine.js）が読む効果の種類 */
  const KITS = {
    /* ── プリズム隊（超極彩祭）── */
    haru: { sq: "prism", cls: "atk", burst: 3, wp: "MG", tier: 1.06, cd: 40,
      base: { hp: 2500, atk: 236, def: 18 }, role: "持続火力・マシンガン",
      quote: "雨あがりの空みたいに、ぜんぶ晴らしてあげる。",
      s1: { nm: "あじさいの雨", fx: "maxRateDmg", v: [15, 30], desc: "連射が最高速度のあいだ、自分の与ダメージ <b>+{v}%</b>。" },
      s2: { nm: "蒼海の波紋", fx: "rippleEvery", n: 100, v: [120, 200], desc: "通常攻撃が <b>100発</b> 命中するごとに、敵全体に攻撃力の <b>{v}%</b> の波紋ダメージ。" },
      bs: { nm: "ブルー・ハイドランジア", fx: "mgOverdrive", v: [60, 100], dur: 10, desc: "10秒間、自分の攻撃力 <b>+{v}%</b>・連射は立ち上がり無しで最高速度・<b>弾が減らない</b>。" } },
    chika: { sq: "prism", cls: "atk", burst: 3, wp: "SR", tier: 1.06, cd: 40,
      base: { hp: 2350, atk: 240, def: 17 }, role: "コア狙撃・会心確定の一撃",
      quote: "月の光は、いちばん弱いところだけを照らすの。",
      s1: { nm: "白花の照準", fx: "coreDmg", v: [40, 70], desc: "コアへの与ダメージ <b>+{v}%</b>。" },
      s2: { nm: "月下の静寂", fx: "coreChargeStack", v: [5, 8], max: 5, dur: 10, desc: "フルチャージ攻撃がコアに当たるたび、自分の攻撃力 <b>+{v}%</b>（最大5回・10秒）。" },
      bs: { nm: "ルナ・ホワイトリリィ", fx: "coreSnipe", v: [1200, 2000], w: [30, 30], dur: 10, desc: "敵1体に攻撃力の <b>{v}%</b>（コアに命中・会心確定）。10秒間、味方全員のコアダメージ <b>+{w}%</b>。" } },
    /* ── ブレイズ隊（超極煌祭）── */
    hisako: { sq: "blaze", cls: "atk", burst: 3, wp: "SR", tier: 1.04, cd: 40,
      base: { hp: 2380, atk: 236, def: 17 }, role: "フルバーストの貫通狙撃",
      quote: "放課後まで、待ってられないもん。",
      s1: { nm: "桜色の一頁", fx: "pierceCharge", v: [20, 40], desc: "チャージ攻撃が敵を<b>貫通</b>（うしろの敵にも50%）。チャージダメージ <b>+{v}%</b>。" },
      s2: { nm: "放課後の約束", fx: "fbChargeAtk", v: [25, 45], w: [30, 50], desc: "フルバースト中、自分の攻撃力 <b>+{v}%</b>・チャージ速度 <b>+{w}%</b>。" },
      bs: { nm: "サクラ・グラフィティ", fx: "chargeOverdrive", v: [150, 250], w: [1000, 1600], dur: 10, desc: "10秒間、チャージダメージ <b>+{v}%</b>・フルチャージまでの時間 <b>半分</b>。発動のとき敵1体に攻撃力の <b>{w}%</b>。" } },
    alice: { sq: "blaze", cls: "atk", burst: 2, wp: "RL", tier: 1.02, cd: 20,
      base: { hp: 2600, atk: 214, def: 19 }, role: "範囲攻撃・防御ダウン",
      quote: "白銀の百合は、夜にこそ咲くのよ。",
      s1: { nm: "白銀の百合", fx: "defDownOnCharge", v: [10, 20], dur: 5, desc: "チャージ攻撃が当たった敵の防御力 <b>−{v}%</b>（5秒）。" },
      s2: { nm: "リリィ・ノクターン", fx: "fbSelfAtk", v: [20, 40], desc: "フルバースト中、自分の攻撃力 <b>+{v}%</b>。" },
      bs: { nm: "シルバーリリィ・ノヴァ", fx: "aoeVuln", v: [300, 520], w: [10, 20], dur: 10, desc: "敵全体に攻撃力の <b>{v}%</b>。10秒間、敵全体の被ダメージ <b>+{w}%</b>。" } },
    kohaku: { sq: "blaze", cls: "atk", burst: 3, wp: "AR", tier: 1.02, cd: 40,
      base: { hp: 2450, atk: 228, def: 18 }, role: "会心特化のアサルト",
      quote: "優雅に、そして確実に。それが令嬢のたしなみですわ。",
      s1: { nm: "紅薔薇の気品", fx: "selfCrit", v: [15, 25], desc: "自分の会心率 <b>+{v}%</b>。" },
      s2: { nm: "令嬢の嗜み", fx: "critAtkStack", v: [2, 3], max: 10, dur: 3, desc: "会心が出るたび、自分の攻撃力 <b>+{v}%</b>（最大10回・3秒）。" },
      bs: { nm: "クリムゾン・ロンド", fx: "arOverdrive", v: [50, 80], w: [50, 50], dur: 10, desc: "10秒間、自分の攻撃力 <b>+{v}%</b>・会心ダメージ <b>+{w}%</b>・連射が<b>2倍</b>。" } },
    suzu: { sq: "blaze", cls: "def", burst: 1, wp: "SG", tier: 1.0, cd: 20,
      base: { hp: 3700, atk: 150, def: 30 }, role: "挑発・シールド・遮蔽物の修理",
      quote: "ひまわりみたいに、みんなの前に立つからね！",
      s1: { nm: "ひまわりの盾", fx: "coverHp", v: [20, 40], desc: "味方全員の遮蔽物の耐久 <b>+{v}%</b>。" },
      s2: { nm: "夏の陽だまり", fx: "selfDr", v: [10, 25], desc: "自分の被ダメージ <b>−{v}%</b>。挑発中は防御力 +30%。" },
      bs: { nm: "サンフラワー・ガード", fx: "tauntShield", v: [15, 25], dur: 10, desc: "10秒間、敵の攻撃を自分に集める（挑発）。味方全員に最大HPの <b>{v}%</b> のシールド・遮蔽物を 30% 修理。" } },
    shouko: { sq: "blaze", cls: "def", burst: 2, wp: "SMG", tier: 1.0, cd: 20,
      base: { hp: 3600, atk: 155, def: 29 }, role: "回復・被ダメージ軽減",
      quote: "日なたぼっこの続きは、勝ってからにしよっか。",
      s1: { nm: "陽だまりの波", fx: "healLowest", period: 5, v: [20, 35], desc: "5秒ごとに、HP がいちばん低い味方を攻撃力の <b>{v}%</b> 回復。" },
      s2: { nm: "渚のバリア", fx: "coverRepairOnHit", v: [1, 2], desc: "自分がダメージを受けると、自分の遮蔽物を <b>{v}%</b> 修理（1秒に1回）。" },
      bs: { nm: "サンシャイン・ショア", fx: "teamDrHeal", v: [25, 40], w: [60, 100], dur: 10, desc: "10秒間、味方全員の被ダメージ <b>−{v}%</b>。HP を攻撃力の <b>{w}%</b> 回復し、毎秒 5% ずつ回復しつづける。" } },
    /* ── ブルーム隊（超極華祭）── */
    yuna: { sq: "bloom", cls: "atk", burst: 3, wp: "SG", tier: 1.02, cd: 40,
      base: { hp: 2550, atk: 230, def: 19 }, role: "至近距離の超火力",
      quote: "宵闇のうちに、終わらせてあげる。",
      s1: { nm: "宵闇の茨", fx: "nearDmg", v: [30, 50], desc: "手前の敵（距離 1/3 以内）への与ダメージ <b>+{v}%</b>。" },
      s2: { nm: "黒薔薇の刻印", fx: "markProc", n: 10, v: [150, 240], desc: "通常攻撃が当たった敵に刻印。<b>10回</b>たまると攻撃力の <b>{v}%</b> の追加ダメージ。" },
      bs: { nm: "ノワール・ブロッサム", fx: "sgOverdrive", v: [1500, 2400], dur: 10, desc: "敵1体に攻撃力の <b>{v}%</b>。10秒間、通常攻撃の散弾が<b>2倍</b>。" } },
    chie: { sq: "bloom", cls: "atk", burst: 3, wp: "RL", tier: 1.0, cd: 40,
      base: { hp: 2500, atk: 226, def: 18 }, role: "範囲・燃焼",
      quote: "桜火よ、舞え――！",
      s1: { nm: "桜火の舞", fx: "chargeBurn", v: [20, 35], dur: 5, desc: "チャージ攻撃の爆風に燃焼（毎秒 攻撃力の <b>{v}%</b>・5秒）。" },
      s2: { nm: "緋袴の矜持", fx: "atkIfEnemies", n: 3, v: [15, 30], desc: "敵が3体以上いるとき、自分の攻撃力 <b>+{v}%</b>。" },
      bs: { nm: "緋桜・千本鳥居", fx: "aoeBurn", v: [800, 1300], w: [50, 80], dur: 10, desc: "敵全体に攻撃力の <b>{v}%</b>。10秒間、敵全体を燃焼（毎秒 <b>{w}%</b>）。" } },
    aina: { sq: "bloom", cls: "sup", burst: 2, wp: "SR", tier: 1.0, cd: 20,
      base: { hp: 2900, atk: 180, def: 22 }, role: "会心ダメージ・チャージ速度の支援",
      quote: "薔薇の棘は、守るためにあるのです。",
      s1: { nm: "月下の薔薇", fx: "chargeAtkStack", v: [5, 8], max: 5, dur: 5, desc: "チャージ攻撃が当たると、自分の攻撃力 <b>+{v}%</b>（最大5回・5秒）。" },
      s2: { nm: "ルナ・グレイス", fx: "teamCrit", v: [5, 10], desc: "味方全員の会心率 <b>+{v}%</b>。" },
      bs: { nm: "ムーンライト・ローズ", fx: "critDmgChg", v: [30, 50], w: [400, 700], dur: 10, desc: "10秒間、味方全員の会心ダメージ <b>+{v}%</b>・チャージ速度 +20%。敵1体に攻撃力の <b>{w}%</b>。" } },
    ichika: { sq: "bloom", cls: "sup", burst: 1, wp: "AR", tier: 1.0, cd: 20,
      base: { hp: 2950, atk: 176, def: 22 }, role: "攻撃力アップ・装弾",
      quote: "夏はまだ終わらないよ、いっしょに走ろ！",
      s1: { nm: "サマーウェーブ", fx: "gaugeGain", v: [20, 35], desc: "自分のバーストゲージの獲得量 <b>+{v}%</b>・最大装弾数 +20%。" },
      s2: { nm: "夏渚のエール", fx: "teamAmmo", v: [10, 20], desc: "味方全員の最大装弾数 <b>+{v}%</b>。" },
      bs: { nm: "ブルー・ラグーン", fx: "teamAtkReload", v: [20, 35], dur: 10, desc: "10秒間、味方全員の攻撃力 <b>+{v}%</b>。味方全員の弾を全回復。" } },
    nonoka: { sq: "bloom", cls: "sup", burst: 1, wp: "SMG", tier: 1.0, cd: 20,
      base: { hp: 3000, atk: 172, def: 23 }, role: "再使用短縮・回復",
      quote: "お茶の時間までに、片づけてしまいましょう。",
      s1: { nm: "おもてなしの白花", fx: "healOnHits", n: 40, v: [5, 9], desc: "通常攻撃が <b>40回</b> 当たるごとに、味方全員の HP を攻撃力の <b>{v}%</b> 回復。" },
      s2: { nm: "ティータイム", fx: "fbTeamAtk", v: [8, 15], desc: "フルバーストが始まると、10秒間 味方全員の攻撃力 <b>+{v}%</b>。" },
      bs: { nm: "ホワイトブーケ・サーヴ", fx: "cdrHeal", v: [4, 6], w: [30, 50], dur: 5, desc: "味方全員のバーストスキルの再使用時間を <b>{v}秒</b> 短縮。HP を攻撃力の <b>{w}%</b> 回復・5秒間 被ダメージ −10%。" } },
  };
  /* 並び（図鑑・編成の標準）：新しい祭が先、同じ祭はガチャの並び */
  const IDS = ["haru", "chika", "hisako", "alice", "kohaku", "suzu", "shouko", "yuna", "chie", "aina", "ichika", "nonoka"];

  /* ══════════ 成長 ══════════ */
  const MAX_LV = 200, MAX_AWK = 4, SKILL_MAX = 10, BOND_MAX = 30;
  const LV_CAP = [80, 120, 160, 200, 200];             /* 凸 0〜4 のレベル上限 */
  const AWK_BONUS = [0, 0.06, 0.12, 0.18, 0.30];       /* 凸のステータス（％）・凸4＝コア解放 */
  const GEAR_PARTS = ["head", "body", "arm", "leg"];
  const GEAR_PART_NM = { head: "頭", body: "胴", arm: "腕", leg: "脚" };
  /* 部位ごとの主ステータス（T1・強化0の値）。クラス一致で ×1.1、部隊一致で ×1.1 */
  const GEAR_MAIN = { head: { atk: 9, hp: 60 }, body: { hp: 260, def: 6 }, arm: { atk: 13, def: 2 }, leg: { hp: 120, def: 5 } };
  /* オーバーロード（T10）の追加効果：種類と幅（％） */
  const OL_FX = {
    atk: { nm: "攻撃力", min: 4.8, max: 17.8 }, ammo: { nm: "最大装弾数", min: 27, max: 71 }, crit: { nm: "会心率", min: 2.3, max: 12.2 },
    critDmg: { nm: "会心ダメージ", min: 6.6, max: 22.4 }, elem: { nm: "有利属性ダメージ", min: 9.5, max: 31.4 }, chg: { nm: "チャージ速度", min: 1.9, max: 7.4 },
    chgDmg: { nm: "チャージダメージ", min: 4.8, max: 17.8 }, hit: { nm: "命中率", min: 4.8, max: 17.8 }, def: { nm: "防御力", min: 4.8, max: 17.8 },
  };
  /* キューブ（1体に1つ）。Lv1〜15・Lv5/10/15 で効果がのびる */
  const CUBES = {
    assault:  { nm: "アサルトキューブ",  ic: "◆", c: "#ff5a6a", d: "攻撃力 +{v}%", v: [2, 8], st: "atkPct" },
    resilience: { nm: "レジストキューブ", ic: "⬢", c: "#3aa0ff", d: "被ダメージ −{v}%", v: [2, 7], st: "dr" },
    quantum:  { nm: "クアンタムキューブ", ic: "✦", c: "#b07bff", d: "チャージ速度 +{v}%", v: [2, 9], st: "chg" },
    bastion:  { nm: "バスティオンキューブ", ic: "▲", c: "#ffb347", d: "リロード速度 +{v}%", v: [4, 16], st: "reload" },
    adjutant: { nm: "アジュタントキューブ", ic: "●", c: "#2fd18a", d: "バーストゲージ獲得 +{v}%", v: [4, 14], st: "gauge" },
    destruct: { nm: "デストラクトキューブ", ic: "✚", c: "#ff8fb8", d: "コアダメージ +{v}%", v: [4, 18], st: "core" },
  };
  const CUBE_MAX = 15;
  /* 研究（クラスごと Lv0〜50）：1Lv あたり そのクラスの HP・攻撃・防御 +0.8% */
  const RESEARCH_MAX = 50, RESEARCH_PER = 0.008;

  function lerp(a, b, t) { return a + (b - a) * t; }
  function skillV(sk, lv, key) {
    const arr = sk && sk[key || "v"]; if (!arr) return 0;
    const t = (Math.max(1, Math.min(SKILL_MAX, lv || 1)) - 1) / (SKILL_MAX - 1);
    return Math.round(lerp(arr[0], arr[1], t) * 10) / 10;
  }
  function skillText(id, k, lv) {
    const K = KITS[id]; if (!K) return "";
    const sk = K[k]; if (!sk) return "";
    return String(sk.desc).replace("{v}", fmt1(skillV(sk, lv, "v"))).replace("{w}", fmt1(skillV(sk, lv, "w")));
  }
  function fmt1(x) { return (Math.round(x * 10) / 10).toLocaleString("ja-JP"); }
  function lvCap(awk) { return LV_CAP[Math.max(0, Math.min(MAX_AWK, awk | 0))]; }
  /* レベルの伸び：Lv1 ×1.0 → Lv200 ×8.96 */
  function lvMul(lv) { return 1 + 0.04 * (Math.max(1, Math.min(MAX_LV, lv | 0)) - 1); }
  /* 装備1つの主ステータス */
  function gearMain(g, id) {
    const K = KITS[id]; if (!g || !GEAR_MAIN[g.p]) return { hp: 0, atk: 0, def: 0 };
    const t = Math.max(1, Math.min(10, g.t | 0)), e = Math.max(0, Math.min(5, g.e | 0));
    const sc = Math.pow(t, 1.55) * (1 + 0.1 * e) * (g.cls && K && g.cls === K.cls ? 1.1 : 1) * (g.sq && K && g.sq === K.sq ? 1.1 : 1);
    const m = GEAR_MAIN[g.p], o = { hp: 0, atk: 0, def: 0 };
    Object.keys(m).forEach((k) => { o[k] = Math.round(m[k] * sc); });
    return o;
  }
  /* ステータス一式。opt: { lv, awk, sk:[s1,s2,bs], gear:{head,body,arm,leg}, cube:{k,lv}, bond, res }
     返す：{ hp, atk, def, crit, critDmg, ammo%, chg%, reload%, gauge%, core%, elem%, hit%, dr%, power } */
  function stats(id, opt) {
    const K = KITS[id]; if (!K) return null;
    opt = opt || {};
    const awk = Math.max(0, Math.min(MAX_AWK, opt.awk | 0));
    const lv = Math.max(1, Math.min(lvCap(awk), opt.lv || 1));
    const m = lvMul(lv) * (1 + AWK_BONUS[awk]) * (K.tier || 1);
    let hp = K.base.hp * m, atk = K.base.atk * m, def = K.base.def * m;
    const x = { crit: 15, critDmg: 50, ammo: 0, chg: 0, chgDmg: 0, reload: 0, gauge: 0, core: 0, elem: 0, hit: 0, dr: 0, atkPct: 0, defPct: 0 };
    /* 好感度：1Lv ごとに HP+30・攻撃+3・防御+0.5（30 で HP+900 ほか） */
    const bond = Math.max(0, Math.min(BOND_MAX, opt.bond | 0));
    hp += bond * 30; atk += bond * 3; def += bond * 0.5;
    /* 研究（クラス） */
    const res = Math.max(0, Math.min(RESEARCH_MAX, opt.res | 0));
    hp *= 1 + res * RESEARCH_PER; atk *= 1 + res * RESEARCH_PER; def *= 1 + res * RESEARCH_PER;
    /* 装備 */
    const G = opt.gear || {};
    GEAR_PARTS.forEach((p) => {
      const g = G[p]; if (!g) return;
      const gm = gearMain(Object.assign({ p }, g), id);
      hp += gm.hp; atk += gm.atk; def += gm.def;
      (g.ol || []).forEach((o) => { if (o && OL_FX[o.k]) { if (o.k === "atk") x.atkPct += o.v; else if (o.k === "def") x.defPct += o.v; else if (o.k === "ammo") x.ammo += o.v; else if (o.k === "crit") x.crit += o.v; else if (o.k === "critDmg") x.critDmg += o.v; else if (o.k === "elem") x.elem += o.v; else if (o.k === "chg") x.chg += o.v; else if (o.k === "chgDmg") x.chgDmg += o.v; else if (o.k === "hit") x.hit += o.v; } });
    });
    /* キューブ */
    const cb = opt.cube && CUBES[opt.cube.k];
    if (cb) { const cv = lerp(cb.v[0], cb.v[1], (Math.max(1, Math.min(CUBE_MAX, opt.cube.lv | 0)) - 1) / (CUBE_MAX - 1)); x[cb.st] = (x[cb.st] || 0) + Math.round(cv * 10) / 10; }
    atk *= 1 + x.atkPct / 100; def *= 1 + x.defPct / 100;
    const sk = opt.sk || [1, 1, 1];
    const o = { lv, awk, hp: Math.round(hp), atk: Math.round(atk), def: Math.round(def) };
    Object.assign(o, x);
    /* 戦力（NIKKE の戦闘力のような目安）：攻撃・HP・防御の重み＋スキル Lv＋凸 */
    const skB = 1 + ((sk[0] - 1) + (sk[1] - 1) + (sk[2] - 1) * 1.4) * 0.012;
    o.power = Math.round((o.atk * 18 + o.hp * 0.55 + o.def * 12) * skB * (1 + (x.crit - 15) * 0.004 + x.core * 0.001 + x.elem * 0.001));
    return o;
  }

  /* ══════════ 所持・凸（XEVARION と共通）══════════ */
  function mbSave() { try { return JSON.parse(localStorage.getItem("magiburst_v1") || "null") || {}; } catch (e) { return {}; } }
  function xgSave() { try { return JSON.parse(localStorage.getItem("xeva_gacha_v1") || "null") || {}; } catch (e) { return {}; } }
  function sharedOf(id, mb, xg) {
    mb = mb || mbSave(); xg = xg || xgSave();
    const m = (mb.chars || {})[id];
    const xo = !!((xg.owned || {})[id]);
    const xd = Math.min(MAX_AWK, ((xg.dupes || {})[id]) | 0);
    return { own: !!m || xo, awk: Math.min(MAX_AWK, Math.max(m ? (m.awk | 0) : 0, xo ? xd : 0)) };
  }
  /* MagiBattle のセーブ（magibattle_v2）からいまの育成を読む（図鑑のキャラ詳細用） */
  function growthOf(id) {
    let S = null; try { S = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); } catch (e) { S = null; }
    const u = (S && S.units && S.units[id]) || {};
    const sh = sharedOf(id);
    const gear = {};
    GEAR_PARTS.forEach((p) => { const gid = u.gear && u.gear[p]; const g = gid && S && S.gear && S.gear[gid]; if (g) gear[p] = g; });
    const cube = u.cube && S && S.cubes && S.cubes[u.cube] ? { k: u.cube, lv: S.cubes[u.cube].lv || 1 } : null;
    const res = S && S.research ? (S.research[KITS[id] ? KITS[id].cls : ""] | 0) : 0;
    return { own: sh.own, awk: sh.awk, lv: Math.min(lvCap(sh.awk), u.lv || 1), sk: u.sk || [1, 1, 1], gear, cube, bond: u.bond || 0, res };
  }

  /* ══════════ 表示（図鑑・ガチャ・MagiBattle 共通）══════════ */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m])); }
  function charNm(id) { try { if (typeof CHARS !== "undefined" && CHARS[id]) return CHARS[id].nm; } catch (e) {} return ({ haru: "ハル", chika: "チカ", hisako: "ヒサコ", alice: "アリス", kohaku: "コハク", suzu: "スズ", shouko: "ショウコ", yuna: "ユナ", chie: "ヨシノ", aina: "アイナ", ichika: "イチカ", nonoka: "ノノカ" })[id] || id; }
  function elOf(id) { try { if (typeof CHARS !== "undefined" && CHARS[id]) return CHARS[id].el; } catch (e) {} return ({ haru: "water", chika: "dark", hisako: "water", alice: "dark", kohaku: "fire", suzu: "wood", shouko: "light", yuna: "dark", chie: "fire", aina: "light", ichika: "water", nonoka: "wood" })[id]; }
  const WP_SVG = {
    AR: '<path d="M2 11h14l2-2h3v3h-2l-1 2h-3l-1 3H11l1-3H6l-1 2H3z"/>',
    SMG: '<path d="M3 10h12l2-2h3v3h-3v2h-2l-1 4h-2l1-4H8v2H6v-2H3z"/>',
    SG: '<path d="M2 10h16l3-1v3l-3 1h-6l-2 4H8l1-4H5l-1 2H2z"/>',
    SR: '<path d="M1 11h18l3-1v2l-3 1h-7l-1 3H9l1-3H6l-2 2H2v-2h2zM9 8h4v2H9z"/>',
    RL: '<path d="M2 9h15l3 1.5L17 12H2zM6 12h3v4H6z"/>',
    MG: '<path d="M2 10h15v-1h4v4h-4v-1h-4l-2 5H9l1-5H5l-1 2H2z"/>',
  };
  function wpIcon(w, sz) { return '<svg class="mbs-wp" viewBox="0 0 24 24" width="' + (sz || 18) + '" height="' + (sz || 18) + '" fill="currentColor" aria-hidden="true">' + (WP_SVG[w] || "") + "</svg>"; }
  function burstBadge(n) { const B = BURST[n] || BURST[3]; return '<i class="mbs-bu" style="--bc:' + B.c + '">' + B.nm + "</i>"; }
  /* 1体ぶんの性能カード。opt: { lv, awk, sk, gear, cube, bond, res, compact, cap } */
  function detailHTML(id, opt) {
    const K = KITS[id]; if (!K) return '<div class="mbs-none">このキャラは MagiBattle では使えません。</div>';
    opt = opt || {};
    const st = stats(id, opt), W = WEAPONS[K.wp], C = CLASSES[K.cls], Q = SQUADS[K.sq], E = ELEM[elOf(id)] || ELEM.fire;
    const sk = opt.sk || [1, 1, 1];
    const row = (k, lab) => '<div class="mbs-sk"><div class="mbs-skh"><span class="mbs-skt">' + lab + "</span><b>" + esc(K[k].nm) + "</b><em>Lv." + sk[k === "s1" ? 0 : k === "s2" ? 1 : 2] + "</em>" +
      (k === "bs" ? '<small>再使用 ' + K.cd + "秒</small>" : "") + '</div><p>' + skillText(id, k, sk[k === "s1" ? 0 : k === "s2" ? 1 : 2]) + "</p></div>";
    return '<div class="mbs-card' + (opt.compact ? " cmp" : "") + '">' +
      '<div class="mbs-tags"><span class="mbs-tag" style="--tc:' + E.c + '">' + E.nm + "属性</span>" +
      '<span class="mbs-tag wp">' + wpIcon(K.wp, 14) + W.sh + "</span>" +
      '<span class="mbs-tag" style="--tc:' + C.c + '">' + C.nm + "</span>" +
      '<span class="mbs-tag bu">バースト ' + burstBadge(K.burst) + "</span>" +
      '<span class="mbs-tag" style="--tc:' + Q.c + '">' + Q.nm + "</span></div>" +
      '<div class="mbs-role">' + esc(K.role) + "</div>" +
      '<div class="mbs-stats"><span><i>戦力</i><b>' + st.power.toLocaleString("ja-JP") + "</b></span><span><i>Lv</i><b>" + st.lv + "</b></span>" +
      "<span><i>HP</i><b>" + st.hp.toLocaleString("ja-JP") + "</b></span><span><i>攻撃力</i><b>" + st.atk.toLocaleString("ja-JP") + "</b></span><span><i>防御力</i><b>" + st.def.toLocaleString("ja-JP") + "</b></span></div>" +
      '<div class="mbs-wpn">' + wpIcon(K.wp, 16) + "<b>" + W.nm + "</b><small>装弾 " + W.mag + "・リロード " + W.reload + "秒" + (W.chg ? "・チャージ " + W.chg + "秒" : "") + (W.pel ? "・散弾 " + W.pel + "粒" : "") + "</small></div>" +
      row("s1", "スキル1") + row("s2", "スキル2") + row("bs", "バースト") +
      (opt.cap ? '<div class="mbs-cap">' + opt.cap + "</div>" : "") + "</div>";
  }
  function ensureCSS() {
    if (document.getElementById("mbsCss")) return;
    const st = document.createElement("style"); st.id = "mbsCss";
    st.textContent =
      ".mbs-card{display:flex;flex-direction:column;gap:7px;font-size:12px;color:inherit}" +
      ".mbs-tags{display:flex;flex-wrap:wrap;gap:4px}" +
      ".mbs-tag{display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:99px;font-size:10.5px;font-weight:900;color:#fff;background:var(--tc,#4a5370)}" +
      ".mbs-tag.wp{background:#2a3044}.mbs-tag.bu{background:#151a2c}" +
      ".mbs-bu{display:inline-grid;place-items:center;min-width:17px;height:17px;padding:0 3px;border-radius:4px;font-style:normal;font-size:10.5px;font-weight:900;color:#fff;background:var(--bc);margin-left:2px}" +
      ".mbs-role{font-size:11.5px;font-weight:800;opacity:.85}" +
      ".mbs-stats{display:grid;grid-template-columns:repeat(5,1fr);gap:4px}" +
      ".mbs-stats span{display:flex;flex-direction:column;align-items:center;padding:5px 2px;border-radius:9px;background:rgba(127,140,180,.14)}" +
      ".mbs-stats i{font-style:normal;font-size:9.5px;font-weight:800;opacity:.7}.mbs-stats b{font-size:12.5px;font-weight:900;font-variant-numeric:tabular-nums}" +
      ".mbs-wpn{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.mbs-wpn small{opacity:.75;font-size:10.5px}" +
      ".mbs-sk{padding:7px 9px;border-radius:10px;background:rgba(127,140,180,.10);border-left:3px solid rgba(127,140,180,.45)}" +
      ".mbs-skh{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.mbs-skh b{font-weight:900}.mbs-skh em{font-style:normal;font-size:10px;font-weight:900;opacity:.7}.mbs-skh small{margin-left:auto;font-size:10px;opacity:.7}" +
      ".mbs-skt{font-size:9.5px;font-weight:900;padding:1px 6px;border-radius:5px;background:rgba(127,140,180,.25)}" +
      ".mbs-sk p{margin:3px 0 0;line-height:1.6}.mbs-sk p b{font-weight:900}" +
      ".mbs-card.cmp .mbs-sk p{font-size:11px}.mbs-cap{font-size:10px;opacity:.7}.mbs-none{font-size:12px;opacity:.75}";
    document.head.appendChild(st);
  }
  /* characters.html の小さな詳細用（MagiBattle で使えるキャラだけ） */
  function statsHTML(c) {
    const id = c && (c.mbId || c.id); if (!KITS[id]) return "";
    ensureCSS();
    const g = growthOf(id);
    return '<div style="margin:8px 0;text-align:left">' + detailHTML(id, Object.assign({ compact: true }, g)) + "</div>";
  }
  function unit(id) { return KITS[id] ? Object.assign({ id }, KITS[id]) : null; }
  function roster() { return IDS.slice(); }

  window.MBStats = {
    VERSION, SAVE_KEY, IDS, KITS, WEAPONS, CLASSES, SQUADS, BURST, ELEM, ADV, elemAdv,
    MAX_LV, MAX_AWK, SKILL_MAX, BOND_MAX, LV_CAP, AWK_BONUS, GEAR_PARTS, GEAR_PART_NM, GEAR_MAIN, OL_FX, CUBES, CUBE_MAX, RESEARCH_MAX, RESEARCH_PER,
    unit, roster, lvCap, lvMul, stats, skillV, skillText, gearMain, sharedOf, growthOf, charNm, elOf,
    detailHTML, ensureCSS, statsHTML, wpIcon, burstBadge, esc,
  };
})();
