/* ============================================================
   MagiAbyss — ma-data.js
   ゲームの中身（データ）だけを持つ。描画・ロジックは持たない。
   ★ 敵・武器・装備・共鳴・実績は「ここに1行足す」だけで増やせる形にしてある。
     ロジック側は kind / ai / fx の種類だけを見る（個別の名前で分岐しない）。
   ============================================================ */
(function () {
  "use strict";
  const MA = (window.MA = window.MA || {});

  /* ══ 属性 ══
     有利：水→炎→風→雷→水 ／ 光⇄影（たがいに有利） */
  const ELEM = {
    fire:    { nm: "炎", en: "FIRE",    c: "#ff6a3d", c2: "#ffd0a0", fx: "爆発・継続ダメージ（燃焼）" },
    water:   { nm: "水", en: "WATER",   c: "#3fa9ff", c2: "#c4e8ff", fx: "減速・範囲制御" },
    wind:    { nm: "風", en: "WIND",    c: "#4fe39a", c2: "#c8ffe2", fx: "連撃・移動補助" },
    thunder: { nm: "雷", en: "THUNDER", c: "#ffd84a", c2: "#fff5c0", fx: "連鎖攻撃・瞬間火力" },
    light:   { nm: "光", en: "LIGHT",   c: "#fff1a6", c2: "#ffffff", fx: "浄化・貫通" },
    shadow:  { nm: "影", en: "SHADOW",  c: "#a874ff", c2: "#e2d0ff", fx: "吸収・追撃" },
  };
  const ELEM_KEYS = Object.keys(ELEM);
  const ADV = { water: ["fire"], fire: ["wind"], wind: ["thunder"], thunder: ["water"], light: ["shadow"], shadow: ["light"] };
  function elemMul(atk, def) {
    if (!atk || !def) return 1;
    if ((ADV[atk] || []).indexOf(def) >= 0) return 1.3;
    if ((ADV[def] || []).indexOf(atk) >= 0 && !(atk === "light" || atk === "shadow")) return 0.8;
    return 1;
  }
  /* MagiBurst の属性 → MagiAbyss の属性 */
  const MB_EL = { fire: "fire", water: "water", wood: "wind", light: "light", dark: "shadow" };

  /* ══ 戦闘タイプ ══ */
  const CTYPE = {
    melee:  { nm: "近接アタッカー", c: "#ff6a5a", d: "高い攻撃力と近距離の範囲攻撃で、敵の集団を突破する。前衛の守りで受けるダメージ −15%（サブが近接のキャラも）" },
    ranged: { nm: "遠距離アタッカー", c: "#5ab8ff", d: "長い射程と貫通・追尾で、敵との距離を保って戦う" },
    magic:  { nm: "魔法特化", c: "#b07bff", d: "魔法威力と属性攻撃にすぐれ、範囲と持続で制圧する" },
    mobile: { nm: "高機動", c: "#4fe39a", d: "移動とダッシュが速く、避けながら攻撃する" },
    tank:   { nm: "防御・耐久", c: "#ffc24a", d: "HPと防御が高く、守りを攻撃に変える" },
    summon: { nm: "召喚・支援", c: "#ff8fd0", d: "使い魔や強化で、複数の攻撃ユニットを組み合わせる" },
  };

  /* ══ レベルアップの能力の分類（キャラの成長補正はこのキーに重みを付ける） ══ */
  const CAT = {
    atk: "攻撃力", aspd: "攻撃速度", crit: "会心率", hp: "最大HP", def: "防御力", spd: "移動速度",
    weapon: "武器強化", magic: "魔法強化", elem: "属性効果", exp: "経験値獲得量", heal: "回復効果", special: "特殊能力",
  };

  /* ══════════════════════════════════════════════════════════════
     キャラクター（極彩祭・極煌祭・極華祭の10体）
     ・所持と凸は XEVARION と共通。レベル・スキルツリー・装備はこのアプリだけ。
     ・base … Lv1 の値。レベル1つごとに grow 倍ずつ伸びる（専用の成長補正）。
     ・atk … 通常攻撃の型（エンジンは kind だけを見る）
     ・skill … Q（クールダウン＋MP）／ ult … R（必殺技ゲージ）／ passive … 常時
     ・bias … レベルアップの候補が出やすい分類（1 が標準）
     ・evo … キャラ専用の進化（武器の種類と属性が条件）
     ★ タキナは「最強」（ご指定）：能力の合計がいちばん高く、苦手が小さい。
     ══════════════════════════════════════════════════════════════ */
  const CHARS = {
    takina: {
      nm: "タキナ", fes: "極彩祭", el: "water", type: "ranged", sub: "mobile", rank: "UR",
      title: "蒼銃の結髪",
      base: { hp: 132, atk: 15, def: 5, spd: 80, aspd: 1.18, crit: 15, critDmg: 1.8, mag: 1.15, eva: 14 },
      grow: { hp: 1.045, atk: 1.05, def: 1.04 },
      atk: { kind: "shot", nm: "蒼銃・アクアバレット", cd: 0.30, mul: 1.2, speed: 330, range: 230, pierce: 2, every: 4, spread: 3,
        d: "ねらった方向へ蒼い弾を速く連射する（2体まで貫通）。4発ごとに3方向へ拡散" },
      skill: { kind: "ripple", nm: "キキョウ・リップル", cd: 7, mp: 15, mul: 3.2, r: 92, drops: 3, dropMul: 2.2,
        d: "足もとに水紋（半径92・攻撃力×3.2）＋近い敵3体へ桔梗の雫（×2.2・防御ダウン）＋必殺技ゲージ+8" },
      ult: { kind: "suitenka", nm: "キキョウ・スイテンカ", gauge: 100, n: 100, mul: 0.95, fin: 14,
        d: "いちばん強い敵へ蒼い雫を100連射し、最後に画面全体へ蒼い桔梗の大輪（攻撃力×14・防御ダウン）" },
      passive: { kind: "focus", nm: "結髪の集中", crits: 3, drain: 0.03,
        d: "ダッシュのあと3発は必ず会心。与えたダメージの3%でHPを回復（ドレイン）" },
      bias: { aspd: 1.6, crit: 1.6, weapon: 1.3, elem: 1.2, spd: 1.2 },
      evo: { weapon: "bow", el: "water", to: "evo_takina", nm: "蒼穹・キキョウ天穿" },
      good: "遠くからの連射・ボスの単体火力・回避しながらの戦闘", weak: "（目立った苦手はない）接近戦の範囲攻撃はやや控えめ",
    },
    hinano: {
      nm: "ヒナノ", fes: "極彩祭", el: "wind", type: "mobile", sub: "magic", rank: "SSR",
      title: "翠光のプリズム",
      base: { hp: 104, atk: 12, def: 3, spd: 88, aspd: 1.1, crit: 10, critDmg: 1.6, mag: 1.2, eva: 18 },
      grow: { hp: 1.035, atk: 1.045, def: 1.03 },
      atk: { kind: "fan", nm: "プリズム・ブレード", cd: 0.55, mul: 0.82, speed: 260, range: 150, n: 3, arc: 0.5, pierce: 1,
        d: "翠の刃を3方向へ扇状に放つ（1体貫通）" },
      skill: { kind: "paint", nm: "プリズム・ブルーム", cd: 10, mp: 20, mul: 2.4, r: 104, t: 6, vul: 0.25,
        d: "まわりの敵の属性を塗りかえて風が有利な属性にし、6秒間うけるダメージ+25%" },
      ult: { kind: "tempest", nm: "プリズム・テンペスト", gauge: 100, n: 36, mul: 1.6,
        d: "翠の刃が渦を巻いて36本ひろがり、画面の敵をすべて塗りかえる" },
      passive: { kind: "galestep", nm: "翠風", stack: 0.04, max: 5, t: 4, d: "敵を倒すたび移動速度+4%（最大5つ・4秒）" },
      bias: { spd: 1.8, elem: 1.4, magic: 1.3 },
      evo: { weapon: "tome", el: "wind", to: "evo_hinano", nm: "プリズム・テンペスト・グリモア" },
      good: "走りまわりながらの攻撃・敵の属性を有利に変える", weak: "耐久力・一撃の重さ",
    },
    hanon: {
      nm: "ハノン", fes: "極彩祭", el: "light", type: "ranged", sub: "summon", rank: "SSR",
      title: "光のブザービーター",
      base: { hp: 112, atk: 13, def: 4, spd: 74, aspd: 1.0, crit: 12, critDmg: 1.7, mag: 1.05, eva: 10 },
      grow: { hp: 1.04, atk: 1.045, def: 1.035 },
      atk: { kind: "bounce", nm: "ドリブル・ショット", cd: 0.7, mul: 1.35, speed: 220, range: 200, bounces: 3, bonus: 0.2,
        d: "敵から敵へ3回跳ねるバスケットボール（跳ねるたび+20%）。ほかに敵がいなければ同じ敵へ1回はね返る" },
      skill: { kind: "dunk", nm: "フープ・シュート", cd: 9, mp: 20, mul: 4.2, r: 72, haste: 0.3, t: 4,
        d: "ねらった場所へダンク（半径72・攻撃力×4.2）＋4秒間すべての攻撃が30%速くなる" },
      ult: { kind: "buzzer", nm: "オーロラ・ブザービーター", gauge: 100, n: 12, mul: 5, fin: 9,
        d: "光のゴールが12本降りそそぎ、最後に画面全体へブザービーター（攻撃力×9）" },
      passive: { kind: "rebound", nm: "リバウンド", d: "跳ねたボールは1回ごとに威力+20%" },
      bias: { aspd: 1.3, weapon: 1.4, crit: 1.2 },
      evo: { weapon: "staff", el: "light", to: "evo_hanon", nm: "オーロラ・アリウープ" },
      good: "敵が固まっているところへの連続攻撃", weak: "敵が少ないときの火力",
    },
    kokoha: {
      nm: "ココハ", fes: "極彩祭", el: "fire", type: "magic", sub: "summon", rank: "SSR",
      title: "椿雨の傘",
      base: { hp: 108, atk: 12, def: 3, spd: 72, aspd: 1.0, crit: 8, critDmg: 1.6, mag: 1.35, eva: 10 },
      grow: { hp: 1.035, atk: 1.045, def: 1.03 },
      atk: { kind: "petal", nm: "椿の花びら", cd: 0.6, mul: 0.62, speed: 200, range: 120, n: 5, arc: 0.8, burn: 0.35,
        d: "紅い椿の花びらを5枚、扇状に放つ（35%で燃焼）" },
      skill: { kind: "rainzone", nm: "ツバキアメ", cd: 11, mp: 25, mul: 0.7, r: 82, t: 5,
        d: "ねらった場所に5秒間 紅い雨（半径82・0.25秒ごとに攻撃力×0.7・燃焼）" },
      ult: { kind: "senka", nm: "ツバキアメ・センカ", gauge: 100, t: 4, mul: 0.6, fin: 10,
        d: "画面全体に4秒間 紅い雨が降り、最後に椿の大輪（攻撃力×10）" },
      passive: { kind: "spreadburn", nm: "椿の延焼", d: "燃えている敵が倒れると爆ぜて、まわりに燃焼が広がる" },
      bias: { magic: 1.7, elem: 1.5, heal: 1.1 },
      evo: { weapon: "tome", el: "fire", to: "evo_kokoha", nm: "椿雨・紅蓮傘" },
      good: "広い範囲を燃やし続けること", weak: "接近されたときの守り",
    },
    mutsumi: {
      nm: "ムツミ", fes: "極煌祭", el: "fire", type: "melee", sub: "mobile", rank: "SSR",
      title: "陽炎のミラージュ",
      base: { hp: 120, atk: 16, def: 5, spd: 76, aspd: 1.05, crit: 10, critDmg: 1.7, mag: 0.9, eva: 12 },
      grow: { hp: 1.04, atk: 1.05, def: 1.035 },
      atk: { kind: "slash", nm: "陽炎の爪", cd: 0.45, mul: 1.6, r: 34, arc: 2.1,
        d: "前方を炎の爪で薙ぐ（半径34）。炎を重ねるほど広くなる" },
      skill: { kind: "mirage", nm: "ミラージュ・アーク", cd: 8, mp: 15, mul: 2.6, dist: 90, t: 4,
        d: "前へ斬りぬけ、残した幻影が4秒間 通常攻撃をくり返す" },
      ult: { kind: "ignite", nm: "イグナイト・ミラージュ", gauge: 100, r: 130, mul: 7, clones: 3,
        d: "まわりに炎の環（半径130・攻撃力×7）＋幻影3体が斬りかかる" },
      passive: { kind: "heat", nm: "陽炎の加護", per: 0.06, max: 10, d: "炎で攻撃するたび熱が1つ（最大10）。熱1つで通常攻撃の範囲+6%" },
      bias: { atk: 1.6, aspd: 1.2, hp: 1.2 },
      evo: { weapon: "sword", el: "fire", to: "evo_mutsumi", nm: "炎獄剣舞・ミラージュ" },
      good: "敵の大群への近接戦闘", weak: "遠距離攻撃への対応",
    },
    reina: {
      nm: "レイナ", fes: "極煌祭", el: "shadow", type: "magic", sub: "summon", rank: "SSR",
      title: "宵闇のヴァルキュリア",
      base: { hp: 100, atk: 13, def: 3, spd: 74, aspd: 1.0, crit: 12, critDmg: 1.75, mag: 1.3, eva: 11 },
      grow: { hp: 1.033, atk: 1.048, def: 1.03 },
      atk: { kind: "orb", nm: "影の魔弾", cd: 0.5, mul: 1.55, speed: 160, range: 200, chain: 3,
        d: "ゆっくり追いかける影の魔弾。当たると近くの敵へ3回つながる" },
      skill: { kind: "clone", nm: "影の分身", cd: 12, mp: 25, t: 10, mul: 0.9, d: "10秒間たたかう影の分身を呼ぶ（通常攻撃の90%）" },
      ult: { kind: "cross", nm: "ノワール・ヴァルキュリア", gauge: 100, mul: 13, d: "画面いっぱいの大十字斬（攻撃力×13）＋分身2体" },
      passive: { kind: "chainkill", nm: "連鎖の影", t: 2, d: "敵を倒すと2秒間、攻撃が近くの敵へもう1回つながる" },
      bias: { magic: 1.5, crit: 1.3, special: 1.3 },
      evo: { weapon: "scythe", el: "shadow", to: "evo_reina", nm: "ノワール・ヴァルキュリア・サイズ" },
      good: "敵の集団への連続攻撃", weak: "防御力とHP",
    },
    azusa: {
      nm: "アズサ", fes: "極煌祭", el: "water", type: "mobile", sub: "melee", rank: "SSR",
      title: "青薔薇の円舞",
      base: { hp: 106, atk: 13, def: 4, spd: 86, aspd: 1.2, crit: 14, critDmg: 1.7, mag: 1.0, eva: 20 },
      grow: { hp: 1.035, atk: 1.047, def: 1.032 },
      atk: { kind: "thrust", nm: "ローズ・スラスト", cd: 0.26, mul: 1.1, len: 52, w: 12,
        d: "細身の剣ですばやく突く（長さ50）" },
      skill: { kind: "waltz", nm: "ブルーローズ・ワルツ", cd: 7, mp: 15, mul: 2.6, dist: 110,
        d: "くるりと回りながら駆けぬけ、ふれた敵すべてに攻撃力×2.6（無敵）。花びらが残る" },
      ult: { kind: "rondo", nm: "アオバラ・ロンドフィナーレ", gauge: 100, r: 140, n: 48, mul: 0.8, fin: 9,
        d: "まわりの敵へ青薔薇の乱舞48連、最後に大輪（攻撃力×9）" },
      passive: { kind: "afterdash", nm: "円舞の余韻", t: 2, aspd: 0.4, d: "ダッシュのあと2秒間 攻撃速度+40%" },
      bias: { spd: 1.6, aspd: 1.5, crit: 1.2 },
      evo: { weapon: "dagger", el: "water", to: "evo_azusa", nm: "ロンド・オブ・ブルーローズ" },
      good: "敵の攻撃を避けながら戦うこと", weak: "一撃の威力や耐久力",
    },
    kumireina: {
      nm: "クミコ＆レイナ", fes: "極華祭", el: "fire", el2: "light", type: "summon", sub: "magic", rank: "SSR",
      title: "双奏のファンファーレ",
      base: { hp: 116, atk: 12, def: 4, spd: 74, aspd: 1.05, crit: 10, critDmg: 1.6, mag: 1.2, eva: 10 },
      grow: { hp: 1.04, atk: 1.044, def: 1.035 },
      atk: { kind: "wave", nm: "音の波", cd: 0.8, mul: 1.1, speed: 160, range: 140, w: 26,
        d: "前へ広がる音の波（すべて貫通）。5回に1回はふたりで2重に鳴らす" },
      skill: { kind: "fanfare", nm: "ファンファーレ", cd: 15, mp: 25, t: 6, aspd: 0.3, dmg: 0.2, notes: 4,
        d: "6秒間 攻撃速度+30%・与ダメージ+20%、まわりを回る音符4つを呼ぶ" },
      ult: { kind: "duet", nm: "双奏のファンファーレ", gauge: 100, pulses: 5, mul: 3, heal: 0.2,
        d: "画面全体へ音の波を5回（各攻撃力×3）＋HPを20%回復" },
      passive: { kind: "duo", nm: "二重奏", every: 5, d: "5回に1回、通常攻撃がふたりぶん出る。音符1つがいつもまわりを回る" },
      bias: { special: 1.4, magic: 1.3, heal: 1.3, aspd: 1.2 },
      evo: { weapon: "tome", el: "light", to: "evo_kumireina", nm: "双奏・ファンファーレ・スコア" },
      good: "回復と強化で長く戦うこと", weak: "単体への瞬間火力",
    },
    kagura: {
      nm: "カグラ", fes: "極華祭", el: "fire", type: "melee", sub: "tank", rank: "SSR",
      title: "緋刃の彼岸",
      base: { hp: 124, atk: 17, def: 5, spd: 72, aspd: 0.95, crit: 12, critDmg: 1.9, mag: 0.85, eva: 9 },
      grow: { hp: 1.042, atk: 1.052, def: 1.036 },
      atk: { kind: "bigslash", nm: "緋刃・一閃", cd: 0.85, mul: 2.4, r: 44, arc: 2.6, kb: 18,
        d: "前方を大きく薙ぐ三日月の斬撃（半径44・ふっとばし）" },
      skill: { kind: "slashwave", nm: "ヒガン・ザン", cd: 8, mp: 15, mul: 4.5, speed: 240, range: 230,
        d: "前へ大きな斬撃の波を放つ（すべて貫通・攻撃力×4.5）" },
      ult: { kind: "senrin", nm: "ヒガン・センリンザン", gauge: 100, r: 130, n: 60, mul: 0.7, fin: 10,
        d: "まわりに緋刃の乱打60連、最後に彼岸花の大輪（攻撃力×10）" },
      passive: { kind: "backwater", nm: "背水の緋刃", per: 0.5, max: 0.4, d: "失ったHP2%ごとに与ダメージ+1%（最大+40%）" },
      bias: { atk: 1.7, crit: 1.3, hp: 1.1 },
      evo: { weapon: "scythe", el: "fire", to: "evo_kagura", nm: "彼岸・千輪斬" },
      good: "強い一撃での突破", weak: "攻撃の間隔が長い",
    },
    kotori: {
      nm: "コトリ", fes: "極華祭", el: "water", type: "tank", sub: "ranged", rank: "SSR",
      title: "蒼水のディフェンダー",
      base: { hp: 150, atk: 13, def: 8, spd: 70, aspd: 0.95, crit: 8, critDmg: 1.6, mag: 1.0, eva: 8 },
      grow: { hp: 1.05, atk: 1.044, def: 1.045 },
      atk: { kind: "ball", nm: "アクア・パス", cd: 0.5, mul: 1.9, speed: 250, range: 190, kb: 22, pierce: 2,
        d: "重いボールを投げる（2体まで貫通・当たった敵をふっとばす）" },
      skill: { kind: "wall", nm: "アクア・ウォール", cd: 12, mp: 20, shield: 0.4, t: 4, mul: 2.4, r: 64,
        d: "まわりに水しぶき（半径64・攻撃力×2.4・ふっとばし）＋最大HPの40%のバリア＋前方に4秒間 敵の弾を止める水の壁" },
      ult: { kind: "slam", nm: "アクア・ダンクラプソディ", gauge: 100, r: 160, mul: 10, heal: 0.3,
        d: "大きくダンク（半径160・攻撃力×10・ふっとばし）＋HP30%回復＋バリア" },
      passive: { kind: "guardian", nm: "守りのドリブル", hp: 0.4, shield: 0.3, cd: 25,
        d: "HPが40%を下回ると最大HPの30%のバリア（25秒に1回）" },
      bias: { hp: 1.6, def: 1.6, heal: 1.3 },
      evo: { weapon: "tome", el: "water", to: "evo_kotori", nm: "アクア・フープ・バリア" },
      good: "長時間の探索と安定した戦闘", weak: "移動速度と攻撃速度",
    },
  };
  const CHAR_ORDER = ["takina", "hinano", "hanon", "kokoha", "mutsumi", "reina", "azusa", "kumireina", "kagura", "kotori"];

  /* ══════════════════════════════════════════════════════════════
     探索中に手に入る武器（6種）＋進化
     ・最初に候補に出たとき属性が1つ決まる（例：炎の魔導書）。その探索のあいだは変わらない。
     ・Lv1〜7。lv[i] は Lv(i+1) の値。
     ══════════════════════════════════════════════════════════════ */
  const WEAPONS = {
    sword: { nm: "魔導剣", kind: "w_sword", d: "前方への連続斬撃", c: "#ff8a6a",
      lv: [
        { mul: 1.4, cd: 1.10, r: 36, n: 1 }, { mul: 1.6, cd: 1.05, r: 38, n: 1 }, { mul: 1.6, cd: 1.0, r: 40, n: 2 },
        { mul: 1.9, cd: 0.95, r: 42, n: 2 }, { mul: 2.1, cd: 0.9, r: 46, n: 2 }, { mul: 2.3, cd: 0.85, r: 48, n: 3 }, { mul: 2.7, cd: 0.8, r: 52, n: 3 }],
      up: ["前方を斬る", "威力+", "2連撃に", "威力+・速さ+", "範囲+", "3連撃に", "威力+・範囲+"] },
    bow: { nm: "星弓", kind: "w_bow", d: "貫通する遠距離の矢", c: "#ffe08a",
      lv: [
        { mul: 1.1, cd: 1.2, n: 1, pierce: 2, speed: 300 }, { mul: 1.25, cd: 1.15, n: 1, pierce: 3, speed: 310 }, { mul: 1.25, cd: 1.1, n: 2, pierce: 3, speed: 320 },
        { mul: 1.45, cd: 1.05, n: 2, pierce: 4, speed: 330 }, { mul: 1.45, cd: 1.0, n: 3, pierce: 4, speed: 340 }, { mul: 1.7, cd: 0.95, n: 3, pierce: 5, speed: 350 }, { mul: 1.9, cd: 0.9, n: 4, pierce: 6, speed: 360 }],
      up: ["貫通する矢", "貫通+1", "矢が2本に", "威力+・貫通+1", "矢が3本に", "威力+・貫通+1", "矢が4本に"] },
    tome: { nm: "魔導書", kind: "w_tome", d: "周囲を回る魔法弾", c: "#c49aff",
      lv: [
        { mul: 0.8, cd: 5.0, n: 2, r: 34, t: 3.0 }, { mul: 0.9, cd: 4.8, n: 2, r: 36, t: 3.4 }, { mul: 0.9, cd: 4.6, n: 3, r: 38, t: 3.6 },
        { mul: 1.05, cd: 4.4, n: 3, r: 40, t: 3.8 }, { mul: 1.05, cd: 4.2, n: 4, r: 42, t: 4.0 }, { mul: 1.2, cd: 4.0, n: 4, r: 46, t: 4.4 }, { mul: 1.35, cd: 3.8, n: 5, r: 50, t: 5.0 }],
      up: ["まわる魔法弾2つ", "長く回る", "3つに", "威力+", "4つに", "半径+・威力+", "5つに"] },
    dagger: { nm: "双短剣", kind: "w_dagger", d: "移動方向へ高速の連続攻撃", c: "#9af0ff",
      lv: [
        { mul: 0.55, cd: 0.50, n: 2, len: 30 }, { mul: 0.6, cd: 0.46, n: 2, len: 32 }, { mul: 0.6, cd: 0.44, n: 3, len: 32 },
        { mul: 0.7, cd: 0.40, n: 3, len: 34 }, { mul: 0.75, cd: 0.36, n: 4, len: 36 }, { mul: 0.85, cd: 0.33, n: 4, len: 38 }, { mul: 0.95, cd: 0.30, n: 5, len: 40 }],
      up: ["2連突き", "速さ+", "3連突き", "威力+", "4連突き", "威力+・速さ+", "5連突き"] },
    scythe: { nm: "大鎌", kind: "w_scythe", d: "広範囲の回転攻撃", c: "#b0a0ff",
      lv: [
        { mul: 1.6, cd: 2.6, r: 46, spin: 1 }, { mul: 1.8, cd: 2.5, r: 48, spin: 1 }, { mul: 1.8, cd: 2.4, r: 52, spin: 2 },
        { mul: 2.1, cd: 2.3, r: 54, spin: 2 }, { mul: 2.3, cd: 2.2, r: 58, spin: 2 }, { mul: 2.5, cd: 2.1, r: 62, spin: 3 }, { mul: 2.9, cd: 2.0, r: 68, spin: 3 }],
      up: ["まわりをなぎ払う", "威力+", "2回転に", "威力+", "範囲+", "3回転に", "威力+・範囲+"] },
    staff: { nm: "魔導杖", kind: "w_staff", d: "敵を追尾する魔弾", c: "#7fd0ff",
      lv: [
        { mul: 1.0, cd: 1.5, n: 1, speed: 170 }, { mul: 1.15, cd: 1.45, n: 1, speed: 180 }, { mul: 1.15, cd: 1.4, n: 2, speed: 190 },
        { mul: 1.3, cd: 1.35, n: 2, speed: 200 }, { mul: 1.3, cd: 1.3, n: 3, speed: 210 }, { mul: 1.5, cd: 1.25, n: 3, speed: 220 }, { mul: 1.7, cd: 1.2, n: 4, speed: 230 }],
      up: ["追尾する魔弾", "威力+", "2発に", "威力+", "3発に", "威力+・速さ+", "4発に"] },
  };
  const WEAPON_KEYS = Object.keys(WEAPONS);
  const WEAPON_MAX = 7;

  /* 進化：武器 Lv7 ＋ 能力 Lv2 以上 → 進化（だれでも） */
  const EVOS = {
    evo_sword:  { nm: "星斬りの聖剣", base: "sword", need: "power", mul: 3.4, kind: "w_sword", d: "斬るたびに星の衝撃波が前へ飛ぶ" },
    evo_bow:    { nm: "流星弓", base: "bow", need: "crit", mul: 2.4, kind: "w_bow", d: "矢が刺さった場所に流星が降る" },
    evo_tome:   { nm: "星環の大魔典", base: "tome", need: "arcana", mul: 1.7, kind: "w_tome", d: "魔法弾がずっと回り続け、ときどき弾ける" },
    evo_dagger: { nm: "瞬影双刃", base: "dagger", need: "haste", mul: 1.25, kind: "w_dagger", d: "突きのたびに影の刃が追撃する" },
    evo_scythe: { nm: "冥府の旋鎌", base: "scythe", need: "vital", mul: 3.6, kind: "w_scythe", d: "まわりに渦を残し、敵を吸い寄せる" },
    evo_staff:  { nm: "星脈の神杖", base: "staff", need: "wisdom", mul: 2.2, kind: "w_staff", d: "魔弾が当たると爆ぜて、近くの敵へ連鎖する" },
    /* キャラ専用の進化（CHARS[].evo の条件：その武器が Lv7 ＋ その属性） */
    evo_takina:    { nm: "蒼穹・キキョウ天穿", base: "bow", char: "takina", mul: 3.2, kind: "w_bow", d: "蒼い矢が桔梗の形に5本ひろがり、刺さった敵の防御を下げる（タキナ専用）" },
    evo_hinano:    { nm: "プリズム・テンペスト・グリモア", base: "tome", char: "hinano", mul: 2.2, kind: "w_tome", d: "回る弾が当たった敵の属性を塗りかえる（ヒナノ専用）" },
    evo_hanon:     { nm: "オーロラ・アリウープ", base: "staff", char: "hanon", mul: 2.8, kind: "w_staff", d: "魔弾が光のゴールになって跳ねまわる（ハノン専用）" },
    evo_kokoha:    { nm: "椿雨・紅蓮傘", base: "tome", char: "kokoha", mul: 2.2, kind: "w_tome", d: "回る弾のあとに紅い雨が降る（ココハ専用）" },
    evo_mutsumi:   { nm: "炎獄剣舞・ミラージュ", base: "sword", char: "mutsumi", mul: 4.0, kind: "w_sword", d: "斬撃の鏡写しがもう一度斬る（ムツミ専用）" },
    evo_reina:     { nm: "ノワール・ヴァルキュリア・サイズ", base: "scythe", char: "reina", mul: 4.2, kind: "w_scythe", d: "回転のあと十字の影が走る（レイナ専用）" },
    evo_azusa:     { nm: "ロンド・オブ・ブルーローズ", base: "dagger", char: "azusa", mul: 1.5, kind: "w_dagger", d: "突きが青薔薇の花びらになって舞う（アズサ専用）" },
    evo_kumireina: { nm: "双奏・ファンファーレ・スコア", base: "tome", char: "kumireina", mul: 2.0, kind: "w_tome", d: "回る音符が鳴るたび味方の攻撃が速くなる（クミコ＆レイナ専用）" },
    evo_kagura:    { nm: "彼岸・千輪斬", base: "scythe", char: "kagura", mul: 4.4, kind: "w_scythe", d: "回転のたびに彼岸花が咲いて爆ぜる（カグラ専用）" },
    evo_kotori:    { nm: "アクア・フープ・バリア", base: "tome", char: "kotori", mul: 2.0, kind: "w_tome", d: "回る弾が敵の弾を消し、当たるとバリアが増える（コトリ専用）" },
  };

  /* ══ 魔法（自動で唱える。属性は固定）══ */
  const MAGICS = {
    fireball: { nm: "火球", el: "fire", kind: "m_fireball", d: "ランダムな敵へ火の玉。着弾で爆発・燃焼",
      lv: [{ mul: 2.0, cd: 2.4, r: 26, n: 1 }, { mul: 2.3, cd: 2.3, r: 28, n: 1 }, { mul: 2.3, cd: 2.2, r: 30, n: 2 }, { mul: 2.7, cd: 2.1, r: 32, n: 2 }, { mul: 3.1, cd: 2.0, r: 36, n: 3 }] },
    frost: { nm: "氷結陣", el: "water", kind: "m_frost", d: "足もとに冷気の陣。敵を遅くして削る",
      lv: [{ mul: 0.35, cd: 6, r: 50, t: 3 }, { mul: 0.4, cd: 5.8, r: 56, t: 3.4 }, { mul: 0.45, cd: 5.6, r: 62, t: 3.8 }, { mul: 0.5, cd: 5.4, r: 68, t: 4.2 }, { mul: 0.6, cd: 5.0, r: 76, t: 4.8 }] },
    gale: { nm: "疾風刃", el: "wind", kind: "m_gale", d: "四方へ風の刃。1体に何度も当たる",
      lv: [{ mul: 0.7, cd: 2.2, n: 4 }, { mul: 0.8, cd: 2.1, n: 5 }, { mul: 0.8, cd: 2.0, n: 6 }, { mul: 0.95, cd: 1.9, n: 7 }, { mul: 1.1, cd: 1.8, n: 8 }] },
    thunder: { nm: "落雷", el: "thunder", kind: "m_thunder", d: "敵に雷が落ち、近くへ連鎖する",
      lv: [{ mul: 2.2, cd: 2.0, n: 1, chain: 2 }, { mul: 2.5, cd: 1.9, n: 1, chain: 3 }, { mul: 2.5, cd: 1.8, n: 2, chain: 3 }, { mul: 2.9, cd: 1.7, n: 2, chain: 4 }, { mul: 3.3, cd: 1.6, n: 3, chain: 4 }] },
    holy: { nm: "聖光柱", el: "light", kind: "m_holy", d: "敵の多い場所に光の柱。貫通して浄化する",
      lv: [{ mul: 2.6, cd: 3.4, r: 22, n: 1 }, { mul: 3.0, cd: 3.2, r: 24, n: 1 }, { mul: 3.0, cd: 3.0, r: 26, n: 2 }, { mul: 3.5, cd: 2.8, r: 28, n: 2 }, { mul: 4.0, cd: 2.6, r: 32, n: 3 }] },
    shadowbind: { nm: "影縫い", el: "shadow", kind: "m_shadow", d: "敵の足もとから影の棘。少しHPを吸う",
      lv: [{ mul: 1.5, cd: 2.8, n: 3 }, { mul: 1.7, cd: 2.7, n: 4 }, { mul: 1.7, cd: 2.6, n: 5 }, { mul: 2.0, cd: 2.5, n: 6 }, { mul: 2.3, cd: 2.4, n: 8 }] },
  };
  const MAGIC_KEYS = Object.keys(MAGICS);
  const MAGIC_MAX = 5;

  /* ══ 能力（パッシブ）══
     cat は CAT のキー。max はレベルの上限。v は1レベルぶんの効き目 */
  const STATS = {
    power:   { nm: "力の紋章", cat: "atk", max: 5, v: 0.10, d: (v) => "攻撃力 +" + Math.round(v * 100) + "%" },
    haste:   { nm: "疾走の歯車", cat: "aspd", max: 5, v: 0.08, d: (v) => "攻撃速度 +" + Math.round(v * 100) + "%" },
    crit:    { nm: "鷹の目", cat: "crit", max: 5, v: 5, d: (v) => "会心率 +" + v + "%・会心ダメージ +" + (v * 2) + "%" },
    vital:   { nm: "生命の樹", cat: "hp", max: 5, v: 0.15, d: (v) => "最大HP +" + Math.round(v * 100) + "%" },
    guard:   { nm: "守りの盾", cat: "def", max: 5, v: 3, d: (v) => "防御力 +" + v + "（被ダメージを減らす）" },
    swift:   { nm: "羽の靴", cat: "spd", max: 5, v: 0.08, d: (v) => "移動速度 +" + Math.round(v * 100) + "%" },
    wisdom:  { nm: "叡智の書", cat: "exp", max: 5, v: 0.12, d: (v) => "経験値 +" + Math.round(v * 100) + "%" },
    regen:   { nm: "癒しの泉", cat: "heal", max: 5, v: 0.5, d: (v) => "毎秒HP +" + v + "・回復アイテム +" + Math.round(v * 50) + "%" },
    arcana:  { nm: "魔導の心得", cat: "magic", max: 5, v: 0.12, d: (v) => "魔法・スキルの威力 +" + Math.round(v * 100) + "%・範囲 +" + Math.round(v * 60) + "%" },
    affinity:{ nm: "星脈の調律", cat: "elem", max: 5, v: 0.2, d: (v) => "属性効果 +" + Math.round(v * 100) + "%（燃焼・減速・連鎖・吸収など）" },
    magnet:  { nm: "引き寄せの石", cat: "special", max: 5, v: 0.3, d: (v) => "アイテムを拾う範囲 +" + Math.round(v * 100) + "%" },
    cooldown:{ nm: "時の砂", cat: "special", max: 5, v: 0.08, d: (v) => "スキルと魔法の再使用 -" + Math.round(v * 100) + "%" },
    dashup:  { nm: "跳躍の翼", cat: "special", max: 3, v: 1, d: (v) => "ダッシュの回数 +" + v + "・ダッシュの速さ +10%" },
    luck:    { nm: "幸運の四つ葉", cat: "special", max: 5, v: 0.1, d: (v) => "レアな候補・宝箱の中身が良くなる（+" + Math.round(v * 100) + "%）" },
    revive:  { nm: "不死鳥の羽", cat: "special", max: 1, v: 1, d: () => "一度だけ、倒れても HP50% で起き上がる" },
  };
  /* 属性の刻印（共鳴の条件にもなる） */
  ELEM_KEYS.forEach((el) => {
    STATS["seal_" + el] = { nm: ELEM[el].nm + "の刻印", cat: "elem", max: 3, v: 0.15, el,
      d: (v) => ELEM[el].nm + "属性のダメージ +" + Math.round(v * 100) + "%（" + ELEM[el].fx + "が強くなる）" };
  });
  const STAT_KEYS = Object.keys(STATS);

  /* カードのレアリティ（見た目と、能力カードの倍率） */
  const RAR = {
    N:   { nm: "N", c: "#c9c9d6", mul: 1.0 },
    R:   { nm: "R", c: "#5ab8ff", mul: 1.25 },
    SR:  { nm: "SR", c: "#c27bff", mul: 1.5 },
    SSR: { nm: "SSR", c: "#ffcc3a", mul: 1.8 },
    UR:  { nm: "UR", c: "#ff6aa8", mul: 2.2, rainbow: true },
  };
  const RAR_KEYS = ["N", "R", "SR", "SSR", "UR"];

  /* ══════════════════════════════════════════════════════════════
     星脈共鳴（本作の中心システム）
     ・req は「どれか1つを満たせばよい組」の並び。全部の組を満たすと発動。
       タグ：weapon:<種類>[:<属性>] / magic:<id> / equip:<部位>:<id> / seal:<属性> /
             el:<属性>（キャラ・武器・魔法・装備・刻印のどこかにその属性）/ char:<id> / ctype:<型>
     ・fx は汎用の効果の並び（orbit / nova / rain / chain / trail / aura / stat / onkill / summon）。
     ★ 新しい組み合わせは、ここに1つ足すだけで増える。
     ══════════════════════════════════════════════════════════════ */
  const RESONANCES = [
    { id: "rekkuu", nm: "烈風火輪", c: "#ff8a3d", req: [["weapon:tome:fire"], ["equip:charm:windcharm", "seal:wind"]],
      d: "炎の輪が風に乗って回り続け、ふれた敵を燃やす", fx: [{ t: "orbit", n: 3, r: 58, mul: 1.1, el: "fire", spin: 3.2 }, { t: "stat", spd: 0.08 }] },
    { id: "seirai", nm: "星雷連鎖", c: "#ffe44a", req: [["weapon:staff:thunder"], ["equip:ring:starring", "seal:thunder"]],
      d: "魔弾が当たるたび、星の雷がさらに3体へつながる", fx: [{ t: "chain", chance: 0.5, n: 3, mul: 0.9, el: "thunder" }, { t: "rain", cd: 2.2, n: 2, mul: 2.4, el: "thunder" }] },
    { id: "shinei", nm: "深影乱舞", c: "#a874ff", req: [["weapon:dagger:shadow"], ["equip:charm:soulcharm", "magic:shadowbind"]],
      d: "ダッシュの軌跡に影の刃が残り、与えたダメージでHPを吸う", fx: [{ t: "trail", mul: 1.4, el: "shadow" }, { t: "stat", drain: 0.04, aspd: 0.12 }] },
    { id: "souhyou", nm: "蒼氷円環", c: "#6fd0ff", req: [["weapon:tome:water", "weapon:scythe:water"], ["magic:frost", "seal:water"]],
      d: "まわりに凍える環。中の敵は遅くなり、凍りつく", fx: [{ t: "aura", r: 64, mul: 0.35, el: "water", slow: 0.45 }] },
    { id: "seikou", nm: "聖光の矢雨", c: "#fff4b0", req: [["weapon:bow:light", "weapon:bow"], ["magic:holy"]],
      d: "光の矢が空から降りそそぐ", fx: [{ t: "rain", cd: 1.4, n: 4, mul: 1.6, el: "light" }] },
    { id: "guren", nm: "紅蓮剣舞", c: "#ff5a3c", req: [["weapon:sword:fire", "weapon:sword"], ["magic:fireball", "seal:fire"]],
      d: "斬撃のあとに炎の波が走る", fx: [{ t: "nova", cd: 2.6, r: 70, mul: 1.8, el: "fire" }, { t: "stat", atk: 0.08 }] },
    { id: "jinrai", nm: "迅雷双刃", c: "#ffd84a", req: [["weapon:dagger:thunder", "weapon:dagger"], ["seal:thunder", "equip:boots:galeboots"]],
      d: "突きが雷をまとい、攻撃速度が上がる", fx: [{ t: "chain", chance: 0.3, n: 2, mul: 0.8, el: "thunder" }, { t: "stat", aspd: 0.18 }] },
    { id: "meisen", nm: "冥鎌の渦", c: "#8c6bff", req: [["weapon:scythe:shadow", "weapon:scythe"], ["stat:vital", "seal:shadow"]],
      d: "鎌の回転が渦を残し、敵を吸い寄せて削る", fx: [{ t: "nova", cd: 3.0, r: 90, mul: 1.5, el: "shadow", pull: 1 }] },
    { id: "shippuu", nm: "疾風の矢", c: "#4fe39a", req: [["weapon:bow:wind", "weapon:bow"], ["equip:boots:galeboots", "seal:wind"]],
      d: "走るほど矢が増える（移動中、矢+2）", fx: [{ t: "stat", spd: 0.12, multishot: 2 }] },
    { id: "soutenjou", nm: "霜天の杖", c: "#9ae0ff", req: [["weapon:staff:water", "weapon:staff"], ["magic:frost"]],
      d: "魔弾が冷気で敵を凍らせ、凍った敵は砕けて大きく入る", fx: [{ t: "chain", chance: 0.35, n: 1, mul: 1.6, el: "water", slow: 0.6 }] },
    { id: "kourin", nm: "光輪の書", c: "#fff7c4", req: [["weapon:tome:light", "weapon:tome"], ["equip:ring:haloring", "seal:light"]],
      d: "回る光の輪がふれた敵を浄化し、自分のHPを少しずつ戻す", fx: [{ t: "orbit", n: 2, r: 46, mul: 1.0, el: "light", spin: -2.4 }, { t: "stat", regen: 1.0 }] },
    { id: "yougan", nm: "熔岩の大鎌", c: "#ff7a2a", req: [["weapon:scythe:fire"], ["seal:fire", "magic:fireball"]],
      d: "回転のあとに溶岩が残り、踏んだ敵を焼く", fx: [{ t: "trail", mul: 1.2, el: "fire", always: 1 }, { t: "stat", atk: 0.1 }] },
    { id: "raimei", nm: "雷鳴剣", c: "#ffe066", req: [["weapon:sword:thunder"], ["magic:thunder", "seal:thunder"]],
      d: "斬るたびに雷が落ちる", fx: [{ t: "rain", cd: 1.0, n: 1, mul: 2.6, el: "thunder" }] },
    { id: "kagenui", nm: "影縫いの星弓", c: "#b48cff", req: [["weapon:bow:shadow", "weapon:bow"], ["magic:shadowbind"]],
      d: "矢が当たった敵を影で縫いとめ（止める）、少しHPを吸う", fx: [{ t: "chain", chance: 0.25, n: 1, mul: 1.2, el: "shadow", stun: 0.8 }, { t: "stat", drain: 0.02 }] },
    { id: "sanmi", nm: "三位一体", c: "#ffffff", req: [["count:weapon:3"]],
      d: "武器を3種類そろえると、攻撃力と攻撃速度が上がる", fx: [{ t: "stat", atk: 0.12, aspd: 0.08 }] },
    { id: "rokuzoku", nm: "六属の星脈", c: "#ff9ad8", req: [["count:el:6"]],
      d: "6つの属性がそろうと、すべての属性効果が強くなり、星が降る", fx: [{ t: "stat", elem: 0.5, atk: 0.15 }, { t: "rain", cd: 1.8, n: 3, mul: 2.0, el: "light" }] },
    { id: "hoshigari", nm: "星喰らいの魔導", c: "#7fd0ff", req: [["count:magic:3"]],
      d: "魔法を3つ覚えると、魔法の再使用が速くなる", fx: [{ t: "stat", cdr: 0.15, mag: 0.15 }] },
    /* キャラの共鳴 */
    { id: "aojuu", nm: "蒼銃の極意", c: "#5ab8ff", req: [["char:takina"], ["weapon:bow", "weapon:staff", "seal:water"]],
      d: "タキナの弾が1体多く貫通し、拡散が5方向になる", fx: [{ t: "stat", pierce: 1, spread: 2, crit: 5 }] },
    { id: "prism", nm: "プリズムの風", c: "#4fe39a", req: [["char:hinano"], ["seal:wind", "magic:gale"]],
      d: "ヒナノの刃が5方向になる", fx: [{ t: "stat", fan: 2, spd: 0.06 }] },
    { id: "goldenhoop", nm: "ゴールデン・フープ", c: "#ffe08a", req: [["char:hanon"], ["seal:light", "magic:holy"]],
      d: "ハノンのボールの跳ねる回数+2", fx: [{ t: "stat", bounces: 2 }] },
    { id: "tsubakiu", nm: "椿雨の加護", c: "#ff5a6e", req: [["char:kokoha"], ["seal:fire", "magic:fireball"]],
      d: "ココハの花びらが7枚になり、燃焼が強くなる", fx: [{ t: "stat", petals: 2, elem: 0.3 }] },
    { id: "kagerou", nm: "陽炎の剣舞", c: "#ff7a5a", req: [["char:mutsumi"], ["weapon:sword", "seal:fire"]],
      d: "ムツミの熱の上限+5", fx: [{ t: "stat", heat: 5, atk: 0.06 }] },
    { id: "kuroyuri", nm: "宵闇の連鎖", c: "#a874ff", req: [["char:reina"], ["seal:shadow", "magic:shadowbind"]],
      d: "レイナの魔弾のつながる回数+2", fx: [{ t: "stat", chain: 2 }] },
    { id: "bararondo", nm: "薔薇の輪舞", c: "#5a8cff", req: [["char:azusa"], ["weapon:dagger", "seal:water"]],
      d: "アズサのダッシュのあと、まわりに青薔薇が咲く", fx: [{ t: "trail", mul: 1.3, el: "water" }, { t: "stat", aspd: 0.08 }] },
    { id: "souou", nm: "響きあう双奏", c: "#ff8fd0", req: [["char:kumireina"], ["seal:light", "seal:fire"]],
      d: "クミコ＆レイナの音符が2つ増える", fx: [{ t: "summon", n: 2, mul: 0.8, el: "light" }] },
    { id: "higan", nm: "彼岸の緋刃", c: "#ff3a46", req: [["char:kagura"], ["weapon:scythe", "seal:fire"]],
      d: "カグラの斬撃がふっとばしと燃焼を持つ", fx: [{ t: "stat", atk: 0.1, burnSlash: 1 }] },
    { id: "aquadef", nm: "アクア・ディフェンス", c: "#3fa9ff", req: [["char:kotori"], ["stat:guard", "seal:water"]],
      d: "コトリのバリアが攻撃を返す（バリア中に受けたダメージの3倍で反撃）", fx: [{ t: "stat", thorns: 3, def: 3 }] },
  ];

  /* ══════════════════════════════════════════════════════════════
     敵
     ai：chase 追跡／charge 突進／ranged 遠距離／summon 召喚／guard 防御／hex 妨害／elite エリート／swarm 群体
     hp/atk は「その迷宮の Lv1 のとき」の値。迷宮の倍率・経過時間・変異で伸びる。
     ══════════════════════════════════════════════════════════════ */
  const ENEMIES = {
    /* 第一迷宮 翠緑の古代樹 */
    slime:      { nm: "スライム", art: "slime", ai: "chase", hp: 14, atk: 5, spd: 34, r: 7, el: "wind", exp: 1, col: "#5fd86a" },
    treant:     { nm: "樹木の魔物", art: "treant", ai: "guard", hp: 70, atk: 9, spd: 18, r: 10, el: "wind", exp: 4, col: "#6a8a3a", guard: 0.5, root: 1 },
    goblin:     { nm: "森の小鬼", art: "goblin", ai: "charge", hp: 24, atk: 8, spd: 44, r: 7, el: "wind", exp: 2, col: "#8ac24a" },
    goblinArcher:{ nm: "小鬼の弓兵", art: "goblinArcher", ai: "ranged", hp: 18, atk: 7, spd: 36, r: 7, el: "wind", exp: 2, col: "#a0c060", shot: { speed: 130, cd: 2.6, n: 1 } },
    mossKing:   { nm: "苔むす巨人", art: "mossGiant", ai: "elite", hp: 420, atk: 14, spd: 24, r: 14, el: "wind", exp: 30, col: "#4f7a30", elite: 1 },
    /* 第二迷宮 蒼晶の氷窟 */
    iceWolf:    { nm: "氷狼", art: "wolf", ai: "charge", hp: 30, atk: 10, spd: 58, r: 8, el: "water", exp: 2, col: "#cfe6ff", pack: 3 },
    golem:      { nm: "結晶ゴーレム", art: "golem", ai: "guard", hp: 110, atk: 14, spd: 16, r: 12, el: "water", exp: 5, col: "#7fc8ff", guard: 0.55, slam: 1 },
    frostWisp:  { nm: "氷霊", art: "wisp", ai: "ranged", hp: 22, atk: 9, spd: 34, r: 7, el: "water", exp: 2, col: "#bff0ff", shot: { speed: 120, cd: 2.4, n: 3, spread: 0.3 } },
    iceSlime:   { nm: "氷のスライム", art: "slime", ai: "chase", hp: 20, atk: 7, spd: 36, r: 7, el: "water", exp: 1, col: "#9ad8ff" },
    whiteWolf:  { nm: "白氷狼", art: "wolf", ai: "elite", hp: 520, atk: 18, spd: 64, r: 13, el: "water", exp: 32, col: "#ffffff", elite: 1, scale: 1.6 },
    /* 第三迷宮 紅蓮の熔岩城 */
    fireBeast:  { nm: "炎の魔獣", art: "hound", ai: "charge", hp: 40, atk: 13, spd: 54, r: 8, el: "fire", exp: 3, col: "#ff6a3d", burnTrail: 1 },
    lavaSoldier:{ nm: "溶岩兵", art: "soldier", ai: "ranged", hp: 60, atk: 14, spd: 26, r: 9, el: "fire", exp: 4, col: "#c84a2a", guard: 0.3, shot: { speed: 110, cd: 2.8, n: 1, big: 1 } },
    emberImp:   { nm: "火の精", art: "imp", ai: "summon", hp: 34, atk: 9, spd: 40, r: 7, el: "fire", exp: 3, col: "#ffb03a", summon: "ember" },
    ember:      { nm: "火の粉", art: "ember", ai: "swarm", hp: 8, atk: 6, spd: 70, r: 5, el: "fire", exp: 0.5, col: "#ffd86a" },
    flameKnight:{ nm: "炎獄騎兵", art: "knight", ai: "elite", hp: 680, atk: 22, spd: 40, r: 13, el: "fire", exp: 36, col: "#ff4a2a", elite: 1 },
    /* 第四迷宮 忘却の魔導書庫 */
    puppet:     { nm: "魔導人形", art: "puppet", ai: "chase", hp: 52, atk: 13, spd: 40, r: 8, el: "thunder", exp: 3, col: "#c8b48a" },
    illusionist:{ nm: "幻影術師", art: "mage", ai: "hex", hp: 46, atk: 14, spd: 32, r: 8, el: "light", exp: 4, col: "#d0a0ff", shot: { speed: 120, cd: 3.0, n: 5, spread: 0.6 }, blink: 1 },
    flyingTome: { nm: "飛翔魔書", art: "tome", ai: "ranged", hp: 30, atk: 11, spd: 46, r: 7, el: "thunder", exp: 2, col: "#a07a4a", shot: { speed: 140, cd: 2.2, n: 1 } },
    bookKeeper: { nm: "禁書の番人", art: "bookGolem", ai: "elite", hp: 820, atk: 24, spd: 30, r: 14, el: "light", exp: 40, col: "#e8d080", elite: 1 },
    /* 第五迷宮 深淵の奈落 */
    abyssKnight:{ nm: "深淵の騎士", art: "knight", ai: "guard", hp: 150, atk: 22, spd: 34, r: 10, el: "shadow", exp: 6, col: "#3a2a5a", guard: 0.6, lunge: 1 },
    shadowSwarm:{ nm: "影の群体", art: "shade", ai: "swarm", hp: 16, atk: 9, spd: 66, r: 5, el: "shadow", exp: 0.8, col: "#6a4a9a", pack: 6 },
    voidEye:    { nm: "虚ろの眼", art: "eye", ai: "hex", hp: 60, atk: 16, spd: 26, r: 9, el: "shadow", exp: 4, col: "#a874ff", beam: 1, dark: 1 },
    abyssSlime: { nm: "奈落のスライム", art: "slime", ai: "chase", hp: 40, atk: 14, spd: 40, r: 8, el: "shadow", exp: 2, col: "#7a3ad0" },
    executioner:{ nm: "奈落の処刑人", art: "reaper", ai: "elite", hp: 1100, atk: 30, spd: 38, r: 14, el: "shadow", exp: 46, col: "#2a1a40", elite: 1 },
    /* 第六迷宮 星天の神殿 */
    starSpirit: { nm: "星霊", art: "star", ai: "ranged", hp: 54, atk: 18, spd: 56, r: 7, el: "light", exp: 4, col: "#fff4b0", shot: { speed: 150, cd: 2.0, n: 4, ring: 1 } },
    guardian:   { nm: "古代守護者", art: "guardian", ai: "guard", hp: 220, atk: 26, spd: 22, r: 12, el: "light", exp: 7, col: "#d8d0ff", guard: 0.6, laser: 1 },
    stardust:   { nm: "星屑", art: "dust", ai: "swarm", hp: 20, atk: 12, spd: 72, r: 5, el: "thunder", exp: 1, col: "#ffe86a", pack: 5 },
    starKnight: { nm: "星座の騎士", art: "knight", ai: "elite", hp: 1500, atk: 34, spd: 44, r: 14, el: "thunder", exp: 52, col: "#ffe86a", elite: 1 },
  };

  /* ══ ボス（フェーズ：100〜70％ 通常／70〜40％ 範囲・突進／40〜15％ 強化・地形変化／15％以下 最終）══
     gim … 隙を作るギミック（アリーナに置く物。全部こわすと BREAK＝5秒止まって被ダメージ2倍） */
  const BOSSES = {
    treeGuardian: { nm: "古樹の守護者", art: "bTree", hp: 2600, atk: 13, spd: 22, r: 26, el: "wind", col: "#5a8a3a",
      gim: { kind: "vine", nm: "蔦の封印", n: 4, hp: 60, d: "守護者に力を送る蔦の封印。4つすべて断ち切ると守護者が崩れて動けなくなる" },
      pats: ["roots", "leafSpiral", "summon", "charge", "rootRing", "leafStorm"], lines: ["……森を荒らすのは、だれだ。", "古き樹は、まだ眠らぬ。", "星脈よ……わが根に力を……！"] },
    iceQueen: { nm: "氷晶の女王", art: "bQueen", hp: 4200, atk: 22, spd: 30, r: 22, el: "water", col: "#9ad8ff",
      gim: { kind: "mirror", nm: "氷の鏡", n: 4, hp: 90, d: "女王の分身を映す鏡。4枚すべて割ると女王が凍りつく" },
      pats: ["lances", "freezeRing", "icicles", "clones", "blizzard", "lanceRain"], lines: ["凍えて、眠りなさい。", "わたくしの城で、勝手は許さないわ。", "砕けるのは……あなたのほうよ！"] },
    lavaTitan: { nm: "熔岩の巨神", art: "bTitan", hp: 6500, atk: 30, spd: 18, r: 30, el: "fire", col: "#ff6a2a",
      gim: { kind: "cooler", nm: "冷却の水晶", n: 3, hp: 120, d: "巨神の熱を吸う水晶。3つ起動すると巨神の鎧が冷えて固まる" },
      pats: ["slam", "lavaWave", "meteor", "charge", "eruption", "magmaRing"], lines: ["ゴゴゴ……燃えよ……。", "この城は……溶けぬ……！", "すべて……熔かしてくれる！！"] },
    librarian: { nm: "禁書の司書", art: "bLibrarian", hp: 8600, atk: 36, spd: 34, r: 22, el: "light", col: "#e8d080",
      gim: { kind: "rune", nm: "封印の頁", n: 4, hp: 80, d: "床に浮かぶ封印の頁。4枚すべて踏むと司書の魔法が封じられる" },
      pats: ["tomeBarrage", "teleport", "pageStorm", "puppets", "laserGrid", "spiral"], lines: ["静かに。ここは書庫ですよ。", "その頁は、まだ読ませません。", "禁書よ、ひらけ——！"] },
    executionerBoss: { nm: "奈落の執行者", art: "bExecutioner", hp: 11500, atk: 44, spd: 40, r: 24, el: "shadow", col: "#4a2a7a",
      gim: { kind: "brazier", nm: "光の燭台", n: 4, hp: 100, d: "闇をはらう燭台。4つ灯すと執行者の影が消え、動きが止まる" },
      pats: ["sweep", "darkZones", "clones", "lunge", "darkness", "scytheStorm"], lines: ["……裁きの時だ。", "奈落に、光は届かぬ。", "すべてを、無に。"] },
    dragon: { nm: "星脈の原初竜", art: "bDragon", hp: 16000, atk: 52, spd: 34, r: 34, el: "thunder", col: "#ffe86a",
      gim: { kind: "pillar", nm: "星の柱", n: 3, hp: 140, d: "竜の星脈をつなぐ柱。3本すべて倒すと竜が地に落ちる" },
      pats: ["breath", "meteor", "gravity", "timestop", "starRain", "supernova"], lines: ["……小さき者よ。星脈に何を望む。", "我は星脈そのもの。", "ならば——星ごと、受けとめてみよ！"] },
  };

  /* ══════════════════════════════════════════════════════════════
     迷宮
     ・lvMul … 敵の強さの倍率（★ 敵の基本値がもう迷宮ごとに強いので、ここは控えめ）／ gold … ゴールドの倍率 ／ rec … 推奨レベル・推奨戦力
     ・mats … 手に入る素材 ／ gim … ギミック（エンジンの環境）
     ・layouts … マップの構成（毎回この中から選び、部屋の中身はランダム）
     ══════════════════════════════════════════════════════════════ */
  const DUNGEONS = [
    { id: "d1", no: 1, nm: "翠緑の古代樹", en: "VERDANT ANCIENT TREE", diff: "初級", stars: 1, lvMul: 0.85, gold: 1.0, rec: { lv: 1, power: 300 },
      biome: "forest", el: "wind", c: "#4fe39a",
      d: "古代遺跡を飲みこんだ巨大な樹の迷宮。自然の魔力が満ちている。",
      enemies: ["slime", "goblin", "goblinArcher", "treant"], elite: "mossKing", mid: "mossKing", boss: "treeGuardian",
      mats: ["sap", "stone"], gim: ["vine", "poison"], rules: ["蔦の封印（部屋をふさぐ蔦。こわすと通れる）", "毒沼（踏むと毒）"],
      unlock: null },
    { id: "d2", no: 2, nm: "蒼晶の氷窟", en: "AZURE CRYSTAL CAVERN", diff: "初級〜中級", stars: 2, lvMul: 1.35, gold: 1.9, rec: { lv: 8, power: 650 },
      biome: "ice", el: "water", c: "#6fd0ff",
      d: "結晶に覆われた凍てつく洞窟。足もとは氷で滑り、天井からは氷柱が落ちる。",
      enemies: ["iceSlime", "iceWolf", "frostWisp", "golem"], elite: "whiteWolf", mid: "whiteWolf", boss: "iceQueen",
      mats: ["shard", "stone"], gim: ["slip", "icicle"], rules: ["滑る床（止まりにくい）", "氷柱の落下（影が出たら避ける）"],
      unlock: "d1" },
    { id: "d3", no: 3, nm: "紅蓮の熔岩城", en: "CRIMSON LAVA CASTLE", diff: "中級", stars: 3, lvMul: 1.65, gold: 3.1, rec: { lv: 15, power: 1200 },
      biome: "lava", el: "fire", c: "#ff6a3d",
      d: "溶岩の川が流れる火山の城。噴火口があちこちで火を噴く。",
      enemies: ["ember", "fireBeast", "lavaSoldier", "emberImp"], elite: "flameKnight", mid: "flameKnight", boss: "lavaTitan",
      mats: ["core", "stone"], gim: ["erupt", "lava"], rules: ["噴火（印の出た場所が爆ぜる）", "溶岩流（踏むと燃える）"],
      unlock: "d2" },
    { id: "d4", no: 4, nm: "忘却の魔導書庫", en: "LIBRARY OF OBLIVION", diff: "中級〜上級", stars: 4, lvMul: 2.2, gold: 4.9, rec: { lv: 22, power: 2000 },
      biome: "library", el: "light", c: "#e8d080",
      d: "古代の魔法が眠る巨大な図書館。転移門と魔法の床が探索者を惑わせる。",
      enemies: ["puppet", "flyingTome", "illusionist"], elite: "bookKeeper", mid: "bookKeeper", boss: "librarian",
      mats: ["page", "stone"], gim: ["warp", "rune"], rules: ["転移門（入ると対になる門へ）", "魔法床（光ると敵が強くなる・踏むと痛い）"],
      unlock: "d3" },
    { id: "d5", no: 5, nm: "深淵の奈落", en: "ABYSSAL DEPTHS", diff: "上級", stars: 5, lvMul: 2.8, gold: 7.6, rec: { lv: 30, power: 3200 },
      biome: "abyss", el: "shadow", c: "#a874ff",
      d: "闇に包まれた異界。視界は狭く、魔力の汚染が体をむしばむ。",
      enemies: ["abyssSlime", "shadowSwarm", "voidEye", "abyssKnight"], elite: "executioner", mid: "executioner", boss: "executionerBoss",
      mats: ["abyss", "stone"], gim: ["dark", "taint"], rules: ["視界制限（明かりの範囲しか見えない）", "魔力汚染（紫の床にいると汚染がたまる）"],
      unlock: "d4" },
    { id: "d6", no: 6, nm: "星天の神殿", en: "CELESTIAL TEMPLE", diff: "最高難度", stars: 6, lvMul: 3.6, gold: 11.5, rec: { lv: 40, power: 5000 },
      biome: "sky", el: "light", c: "#ffe86a",
      d: "星々が浮かぶ天空の神殿。重力がゆがみ、時間の流れも乱れている。",
      enemies: ["stardust", "starSpirit", "guardian"], elite: "starKnight", mid: "starKnight", boss: "dragon",
      mats: ["star", "stone"], gim: ["gravity", "timed"], rules: ["重力変化（引き寄せる渦）", "時間制限区域（入ると時間内に抜ける）"],
      unlock: "d5" },
  ];
  const DUN = {}; DUNGEONS.forEach((d) => { DUN[d.id] = d; });

  /* ══ 素材 ══ */
  const MATS = {
    stone: { nm: "魔石", c: "#9ab0ff", d: "どの迷宮でも手に入る魔力の石。鍛冶と施設の強化に使う" },
    sap:   { nm: "翠樹の樹液", c: "#5fd86a", d: "古代樹から採れる樹液（第一迷宮）" },
    shard: { nm: "氷晶の欠片", c: "#9ad8ff", d: "溶けない氷の結晶（第二迷宮）" },
    core:  { nm: "熔岩核", c: "#ff7a3a", d: "熱をたくわえた核（第三迷宮）" },
    page:  { nm: "古文書の頁", c: "#e8d080", d: "魔力の宿った紙片（第四迷宮）" },
    abyss: { nm: "深淵の欠片", c: "#a874ff", d: "闇が固まったかけら（第五迷宮）" },
    star:  { nm: "星脈の星屑", c: "#ffe86a", d: "星脈から零れた光（第六迷宮）" },
    crystal: { nm: "星脈結晶", c: "#ff8fd0", d: "ボスが落とす貴重な結晶。上位の強化に使う" },
  };

  /* ══════════════════════════════════════════════════════════════
     装備（6枠・N〜UR）
     ・st … 基礎ステータス（レアリティと強化で伸びる）
     ・tag … 共鳴の条件に使う名前（equip:<部位>:<tag>）
     ・el … 属性（共鳴の el:<属性> にも数える）
     ・runWeapon … 武器枠：探索をこの武器（Lv1・この属性）を持って始める
     ══════════════════════════════════════════════════════════════ */
  const SLOTS = {
    weapon: { nm: "武器", ic: "sword" }, armor: { nm: "防具", ic: "armor" }, ring: { nm: "指輪", ic: "ring" },
    charm: { nm: "護符", ic: "charm" }, boots: { nm: "靴", ic: "boots" }, tool: { nm: "魔導具", ic: "tool" },
  };
  const SLOT_KEYS = Object.keys(SLOTS);
  const GEAR_RAR = { N: 1.0, R: 1.3, SR: 1.7, SSR: 2.2, UR: 3.0 };
  const GEAR = {
    /* 武器 */
    flameSword:  { slot: "weapon", nm: "炎の魔導剣", el: "fire", runWeapon: "sword", st: { atk: 4 }, d: "探索を「炎の魔導剣」Lv1で始める" },
    thunderSword:{ slot: "weapon", nm: "雷の魔導剣", el: "thunder", runWeapon: "sword", st: { atk: 4 }, d: "探索を「雷の魔導剣」Lv1で始める" },
    starBow:     { slot: "weapon", nm: "光の星弓", el: "light", runWeapon: "bow", st: { atk: 3, crit: 2 }, d: "探索を「光の星弓」Lv1で始める" },
    galeBow:     { slot: "weapon", nm: "風の星弓", el: "wind", runWeapon: "bow", st: { atk: 3, spd: 2 }, d: "探索を「風の星弓」Lv1で始める" },
    aquaBow:     { slot: "weapon", nm: "水の星弓", el: "water", runWeapon: "bow", st: { atk: 3, crit: 2 }, d: "探索を「水の星弓」Lv1で始める" },
    fireTome:    { slot: "weapon", nm: "炎の魔導書", el: "fire", runWeapon: "tome", st: { atk: 2, mag: 0.04 }, d: "探索を「炎の魔導書」Lv1で始める" },
    aquaTome:    { slot: "weapon", nm: "水の魔導書", el: "water", runWeapon: "tome", st: { atk: 2, mag: 0.04 }, d: "探索を「水の魔導書」Lv1で始める" },
    lightTome:   { slot: "weapon", nm: "光の魔導書", el: "light", runWeapon: "tome", st: { atk: 2, mag: 0.04 }, d: "探索を「光の魔導書」Lv1で始める" },
    shadowDagger:{ slot: "weapon", nm: "影の双短剣", el: "shadow", runWeapon: "dagger", st: { atk: 3, aspd: 0.03 }, d: "探索を「影の双短剣」Lv1で始める" },
    aquaDagger:  { slot: "weapon", nm: "水の双短剣", el: "water", runWeapon: "dagger", st: { atk: 3, aspd: 0.03 }, d: "探索を「水の双短剣」Lv1で始める" },
    shadowScythe:{ slot: "weapon", nm: "影の大鎌", el: "shadow", runWeapon: "scythe", st: { atk: 5 }, d: "探索を「影の大鎌」Lv1で始める" },
    fireScythe:  { slot: "weapon", nm: "炎の大鎌", el: "fire", runWeapon: "scythe", st: { atk: 5 }, d: "探索を「炎の大鎌」Lv1で始める" },
    thunderStaff:{ slot: "weapon", nm: "雷の魔導杖", el: "thunder", runWeapon: "staff", st: { atk: 2, mag: 0.05 }, d: "探索を「雷の魔導杖」Lv1で始める" },
    lightStaff:  { slot: "weapon", nm: "光の魔導杖", el: "light", runWeapon: "staff", st: { atk: 2, mag: 0.05 }, d: "探索を「光の魔導杖」Lv1で始める" },
    /* 防具 */
    travelCoat:  { slot: "armor", nm: "旅人の外套", st: { hp: 12, def: 1 }, d: "軽くて丈夫な外套" },
    frostPlate:  { slot: "armor", nm: "氷結の胸当て", el: "water", st: { hp: 16, def: 2 }, d: "冷気をまとう胸当て" },
    lavaMail:    { slot: "armor", nm: "熔岩の鎧", el: "fire", st: { hp: 22, def: 3, spd: -2 }, d: "重いが硬い鎧" },
    starRobe:    { slot: "armor", nm: "星織りのローブ", el: "light", st: { hp: 10, mag: 0.06 }, d: "星の糸で織られたローブ" },
    abyssCloak:  { slot: "armor", nm: "深淵の外套", el: "shadow", st: { hp: 12, eva: 3 }, d: "影に溶けこむ外套" },
    /* 指輪 */
    powerRing:   { slot: "ring", nm: "力の指輪", st: { atk: 3 }, d: "攻撃力が上がる" },
    starring:    { slot: "ring", nm: "星の指輪", tag: "starring", el: "light", st: { crit: 3 }, d: "星脈の光を宿す指輪（星雷連鎖の鍵）" },
    thunderRing: { slot: "ring", nm: "雷鳴の指輪", el: "thunder", st: { atk: 2, aspd: 0.03 }, d: "雷の力を宿す" },
    haloring:    { slot: "ring", nm: "光輪の指輪", tag: "haloring", el: "light", st: { hp: 6, regen: 0.2 }, d: "癒やしの光輪（光輪の書の鍵）" },
    critRing:    { slot: "ring", nm: "鷹の指輪", st: { crit: 4, critDmg: 0.05 }, d: "会心が出やすくなる" },
    /* 護符 */
    windcharm:   { slot: "charm", nm: "風の護符", tag: "windcharm", el: "wind", st: { spd: 3 }, d: "風の加護（烈風火輪の鍵）" },
    soulcharm:   { slot: "charm", nm: "吸魂の護符", tag: "soulcharm", el: "shadow", st: { drain: 0.01 }, d: "与えたダメージでHPを吸う（深影乱舞の鍵）" },
    fireCharm:   { slot: "charm", nm: "炎の護符", el: "fire", st: { atk: 2 }, d: "炎の加護" },
    waterCharm:  { slot: "charm", nm: "水の護符", el: "water", st: { hp: 8 }, d: "水の加護" },
    lightCharm:  { slot: "charm", nm: "光の護符", el: "light", st: { regen: 0.2 }, d: "光の加護" },
    thunderCharm:{ slot: "charm", nm: "雷の護符", el: "thunder", st: { aspd: 0.03 }, d: "雷の加護" },
    guardCharm:  { slot: "charm", nm: "守りの護符", st: { def: 2 }, d: "被ダメージを減らす" },
    /* 靴 */
    galeboots:   { slot: "boots", nm: "疾風の靴", tag: "galeboots", el: "wind", st: { spd: 5 }, d: "風のように速く走れる（迅雷双刃・疾風の矢の鍵）" },
    jumpBoots:   { slot: "boots", nm: "跳躍の靴", st: { spd: 2, dash: 1 }, d: "ダッシュの回数+1" },
    ironBoots:   { slot: "boots", nm: "鉄の靴", st: { def: 2, hp: 6 }, d: "重いが丈夫" },
    starBoots:   { slot: "boots", nm: "星歩きの靴", el: "light", st: { spd: 3, eva: 2 }, d: "星の上を歩くように軽い" },
    /* 魔導具 */
    manaCrystal: { slot: "tool", nm: "魔力の水晶", st: { mp: 0.5 }, d: "MPの回復が速くなる" },
    hourglass:   { slot: "tool", nm: "時の砂時計", st: { cdr: 0.04 }, d: "スキルと魔法の再使用が速くなる" },
    sageStone:   { slot: "tool", nm: "賢者の石", st: { exp: 0.06 }, d: "経験値が増える" },
    compass:     { slot: "tool", nm: "星脈の羅針盤", st: { magnet: 0.15, reveal: 1 }, d: "拾う範囲が広がり、ミニマップに宝箱が出る" },
    spiritBell:  { slot: "tool", nm: "精霊の鈴", el: "wind", st: { summon: 1 }, d: "小さな精霊がついてきて攻撃する" },
    lantern:     { slot: "tool", nm: "魔導ランタン", el: "light", st: { vision: 0.5 }, d: "暗い場所で見える範囲が広がる" },
  };
  const GEAR_KEYS = Object.keys(GEAR);

  /* ══ ショップ・鍛冶・施設 ══ */
  const SHOP_ITEMS = {
    potion:   { nm: "回復薬", price: 120, d: "探索の開始時に1つ持っていく（HP50%回復・1回）", max: 3 },
    elixir:   { nm: "エリクサー", price: 600, d: "探索の開始時に持っていく。倒れたとき1度だけ全回復", max: 1 },
    reroll:   { nm: "運命のダイス", price: 200, d: "探索中のレベルアップで「引き直し」+1", max: 3 },
    banish:   { nm: "忘却の砂", price: 180, d: "探索中のレベルアップで「とばす」+1", max: 3 },
    stonePack:{ nm: "魔石の袋", price: 300, d: "魔石を20個", give: { stone: 20 } },
  };
  const FACILITIES = {
    smith:   { nm: "鍛冶場", max: 5, d: (lv) => "装備を +" + (2 + lv * 2) + " まで強化できる", cost: (lv) => ({ gold: 400 * (lv + 1) * (lv + 1), stone: 20 * (lv + 1) }) },
    shop:    { nm: "魔導具店", max: 5, d: (lv) => "店にならぶ装備の質が上がる（Lv" + lv + "）", cost: (lv) => ({ gold: 500 * (lv + 1) * (lv + 1), stone: 15 * (lv + 1) }) },
    tavern:  { nm: "酒場", max: 5, d: (lv) => "キャラクターの経験値 +" + (lv * 10) + "%", cost: (lv) => ({ gold: 450 * (lv + 1) * (lv + 1), sap: 10 * (lv + 1) }) },
    train:   { nm: "訓練場", max: 5, d: (lv) => "探索開始時の「引き直し」+" + Math.ceil(lv / 2) + "・最初の候補が1つ増える(Lv3〜)", cost: (lv) => ({ gold: 600 * (lv + 1) * (lv + 1), shard: 8 * (lv + 1) }) },
    chapel:  { nm: "礼拝堂", max: 3, d: (lv) => "倒れたとき持ち帰れる素材 " + (50 + lv * 15) + "%", cost: (lv) => ({ gold: 800 * (lv + 1) * (lv + 1), core: 8 * (lv + 1) }) },
    archive: { nm: "資料室", max: 3, d: (lv) => "探索で見つかる宝箱の数 +" + lv, cost: (lv) => ({ gold: 900 * (lv + 1) * (lv + 1), page: 6 * (lv + 1) }) },
  };

  /* ══ キャラのスキルツリー（全員同じ形・数字はキャラの型で少し変わる）══ */
  const TREE = [
    { id: "a1", br: "atk", nm: "攻撃の心得", cost: 1, fx: { atk: 0.05 }, req: [] },
    { id: "a2", br: "atk", nm: "鋭い一撃", cost: 1, fx: { crit: 4 }, req: ["a1"] },
    { id: "a3", br: "atk", nm: "連撃の構え", cost: 2, fx: { aspd: 0.08 }, req: ["a2"] },
    { id: "a4", br: "atk", nm: "会心の極意", cost: 2, fx: { critDmg: 0.2 }, req: ["a3"] },
    { id: "a5", br: "atk", nm: "破壊者", cost: 3, fx: { atk: 0.12, ult: 0.15 }, req: ["a4"] },
    { id: "d1", br: "def", nm: "鍛えた体", cost: 1, fx: { hp: 0.08 }, req: [] },
    { id: "d2", br: "def", nm: "受け流し", cost: 1, fx: { def: 2 }, req: ["d1"] },
    { id: "d3", br: "def", nm: "自然治癒", cost: 2, fx: { regen: 0.4 }, req: ["d2"] },
    { id: "d4", br: "def", nm: "不屈", cost: 2, fx: { hp: 0.12, def: 2 }, req: ["d3"] },
    { id: "d5", br: "def", nm: "守護の誓い", cost: 3, fx: { shieldStart: 0.25 }, req: ["d4"] },
    { id: "u1", br: "uniq", nm: "固有スキル強化", cost: 1, fx: { skill: 0.15 }, req: [] },
    { id: "u2", br: "uniq", nm: "魔力の泉", cost: 1, fx: { mp: 0.5 }, req: ["u1"] },
    { id: "u3", br: "uniq", nm: "速い詠唱", cost: 2, fx: { cdr: 0.08 }, req: ["u2"] },
    { id: "u4", br: "uniq", nm: "パッシブ覚醒", cost: 2, fx: { passive: 1 }, req: ["u3"] },
    { id: "u5", br: "uniq", nm: "必殺技の極み", cost: 3, fx: { ult: 0.3, ultCharge: 0.2 }, req: ["u4"] },
  ];
  const TREE_BR = { atk: { nm: "攻撃", c: "#ff6a5a" }, def: { nm: "守り", c: "#5ab8ff" }, uniq: { nm: "固有", c: "#ffcc3a" } };
  const CHAR_MAX_LV = 60;
  /* 凸（XEVARION と共通・0〜4）の効果 */
  const AWK = [
    { d: "—" },
    { d: "全能力 +6%", all: 0.06 },
    { d: "全能力 +12%・スキルの再使用 -8%", all: 0.12, cdr: 0.08 },
    { d: "全能力 +18%・探索開始時に「引き直し」+1", all: 0.18, cdr: 0.08, reroll: 1 },
    { d: "全能力 +25%・必殺技ゲージ +25%でスタート（完凸）", all: 0.25, cdr: 0.08, reroll: 1, ultStart: 25 },
  ];

  /* ══ ダンジョン変異（探索開始時に選ぶ。報酬が増える）══ */
  const MUTATIONS = {
    surge:   { nm: "魔力暴走", d: "敵の出現数 +60%", reward: 0.25, spawn: 1.6 },
    dark:    { nm: "暗黒領域", d: "見える範囲が狭くなる", reward: 0.25, dark: 1 },
    elites:  { nm: "強敵集結", d: "エリート敵が3倍出る", reward: 0.3, elite: 3 },
    bounty:  { nm: "星脈豊穣", d: "経験値・素材 +50%（敵のHP +25%）", reward: 0.0, exp: 1.5, mat: 1.5, hp: 1.25 },
    warp:    { nm: "時間歪曲", d: "敵の動き・攻撃が 1.3倍速い", reward: 0.3, speed: 1.3 },
  };

  /* ══ 深淵踏破（エンドコンテンツ）の特殊ルール ══ */
  const ABYSS_RULES = [
    { id: "none", nm: "通常", d: "特別なルールはない" },
    { id: "surge", nm: "魔力暴走", d: "敵が多い", spawn: 1.5 },
    { id: "dark", nm: "暗黒", d: "視界が狭い", dark: 1 },
    { id: "elites", nm: "強敵", d: "エリートが多い", elite: 3 },
    { id: "swift", nm: "疾風", d: "敵が速い", speed: 1.3 },
    { id: "glass", nm: "硝子の体", d: "与ダメージ×1.5・被ダメージ×1.5", dmgOut: 1.5, dmgIn: 1.5 },
    { id: "famine", nm: "飢餓", d: "回復アイテムが出ない", noHeal: 1 },
    { id: "bounty", nm: "豊穣", d: "経験値×2", exp: 2 },
  ];

  /* ══ 探索イベント（精霊の祭壇・古代祭壇など）══ */
  const EVENTS = {
    altar: { nm: "古代祭壇", d: "星脈が脈打つ古い祭壇。手をかざすと、三つの道が見えた。",
      opts: [
        { k: "absorb", nm: "星脈を吸収", d: "この探索のあいだ 攻撃力+25%。かわりに敵が30%増える" },
        { k: "purify", nm: "星脈を浄化", d: "HPを全回復し、防御+4（この探索のあいだ）" },
        { k: "seal", nm: "祭壇を封印", d: "星脈の鍵を1つと、素材を多めに得る" },
      ] },
    spirit: { nm: "精霊の祭壇", d: "小さな精霊がこちらを見ている。どの加護を授かる？",
      opts: [] /* その場で属性の刻印を2つ選ばせる */ },
    circle: { nm: "魔法陣", d: "床に描かれた古い魔法陣。触れると力が満ちてくる。",
      opts: [
        { k: "trial", nm: "試練を受ける", d: "25秒間 敵の群れに耐えると、星脈の鍵と宝箱" },
        { k: "bless", nm: "祝福を受ける", d: "ランダムな能力を1つ（1段階）得る" },
      ] },
  };

  /* ══ 実績 ══ */
  const ACH = [
    { id: "clear_d1", nm: "古代樹の踏破者", d: "翠緑の古代樹をクリア", rw: { gold: 500, stone: 20 } },
    { id: "clear_d2", nm: "氷窟の踏破者", d: "蒼晶の氷窟をクリア", rw: { gold: 800, shard: 10 } },
    { id: "clear_d3", nm: "熔岩城の踏破者", d: "紅蓮の熔岩城をクリア", rw: { gold: 1200, core: 10 } },
    { id: "clear_d4", nm: "書庫の踏破者", d: "忘却の魔導書庫をクリア", rw: { gold: 1600, page: 10 } },
    { id: "clear_d5", nm: "奈落の踏破者", d: "深淵の奈落をクリア", rw: { gold: 2200, abyss: 10 } },
    { id: "clear_d6", nm: "星天の覇者", d: "星天の神殿をクリア", rw: { gold: 3000, star: 10, crystal: 3 } },
    { id: "kill_1k", nm: "千の討伐", d: "敵を合計1,000体倒す", rw: { gold: 300 } },
    { id: "kill_10k", nm: "万の討伐", d: "敵を合計10,000体倒す", rw: { gold: 1500, crystal: 1 } },
    { id: "kill_50k", nm: "深淵を払う者", d: "敵を合計50,000体倒す", rw: { gold: 5000, crystal: 3 } },
    { id: "lv30", nm: "限界の先へ", d: "1回の探索でレベル30に達する", rw: { gold: 600 } },
    { id: "lv60", nm: "星脈と一体に", d: "1回の探索でレベル60に達する", rw: { gold: 2000, crystal: 1 } },
    { id: "res1", nm: "はじめての共鳴", d: "星脈共鳴を発動する", rw: { gold: 300 } },
    { id: "res10", nm: "共鳴の探究者", d: "星脈共鳴を10種類発見する", rw: { gold: 1500, crystal: 1 } },
    { id: "resAll", nm: "星脈の調律師", d: "星脈共鳴をすべて発見する", rw: { gold: 5000, crystal: 5 } },
    { id: "evo1", nm: "はじめての進化", d: "武器を進化させる", rw: { gold: 400 } },
    { id: "evoChar", nm: "わたしだけの武器", d: "キャラ専用の進化を発動する", rw: { gold: 1000, crystal: 1 } },
    { id: "clv20", nm: "一人前の探索者", d: "キャラクターをLv20にする", rw: { gold: 800 } },
    { id: "clv40", nm: "熟練の探索者", d: "キャラクターをLv40にする", rw: { gold: 2000, crystal: 1 } },
    { id: "clv60", nm: "伝説の探索者", d: "キャラクターをLv60にする", rw: { gold: 5000, crystal: 3 } },
    { id: "abyss10", nm: "深淵10階", d: "深淵踏破で10階に到達", rw: { gold: 1000, abyss: 5 } },
    { id: "abyss30", nm: "深淵30階", d: "深淵踏破で30階に到達", rw: { gold: 3000, crystal: 2 } },
    { id: "abyss50", nm: "深淵50階", d: "深淵踏破で50階に到達", rw: { gold: 6000, crystal: 5 } },
    { id: "ssr", nm: "輝く装備", d: "SSR以上の装備を手に入れる", rw: { gold: 500 } },
    { id: "ur", nm: "伝説の装備", d: "URの装備を手に入れる", rw: { gold: 2000, crystal: 1 } },
    { id: "plus10", nm: "極限の鍛錬", d: "装備を+10まで強化する", rw: { gold: 3000, crystal: 2 } },
    { id: "nohit", nm: "無傷の勝利", d: "ボスをダメージを受けずに倒す", rw: { gold: 2000, crystal: 1 } },
    { id: "mut3", nm: "変異の克服", d: "変異を3つ付けてクリア", rw: { gold: 2500, crystal: 2 } },
    { id: "secret", nm: "隠されたもの", d: "隠し部屋を見つける", rw: { gold: 400 } },
    { id: "allChar", nm: "仲間たち", d: "5人のキャラで迷宮をクリア", rw: { gold: 1500, crystal: 1 } },
    { id: "rich", nm: "ギルドの資産家", d: "ゴールドを合計50,000集める", rw: { crystal: 2 } },
  ];
  /* ══ ミッション（毎日・毎週）══ */
  const MISSIONS = {
    daily: [
      { id: "d_kill", nm: "敵を300体倒す", key: "kills", n: 300, rw: { gold: 300, stone: 5 } },
      { id: "d_chest", nm: "宝箱を3つ開ける", key: "chests", n: 3, rw: { gold: 250 } },
      { id: "d_run", nm: "迷宮を1回クリアする", key: "clears", n: 1, rw: { gold: 500, stone: 8 } },
      { id: "d_level", nm: "探索中に合計20回レベルアップ", key: "levels", n: 20, rw: { gold: 300 } },
    ],
    weekly: [
      { id: "w_boss", nm: "ボスを5体倒す", key: "bosses", n: 5, rw: { gold: 2000, crystal: 1 } },
      { id: "w_abyss", nm: "深淵踏破で合計15階すすむ", key: "floors", n: 15, rw: { gold: 1500, abyss: 5 } },
      { id: "w_res", nm: "星脈共鳴を5回発動する", key: "resonances", n: 5, rw: { gold: 1500 } },
      { id: "w_kill", nm: "敵を3,000体倒す", key: "kills", n: 3000, rw: { gold: 2500, crystal: 1 } },
    ],
  };

  /* ══ ストーリー（迷宮をクリアするたびに開く）══ */
  const STORY = [
    { id: "prologue", nm: "序章　星脈の迷宮", at: null, lines: [
      ["ギルドマスター ラウラ", "ようこそ、冒険者ギルド《アストラ》へ。あなたが新しい探索者ね。"],
      ["ギルドマスター ラウラ", "この世界には、魔力の源「星脈」が流れているの。"],
      ["ギルドマスター ラウラ", "古代文明はそれを制御しようとして……失敗した。その結果が、各地に生まれた魔力迷宮「アビス」よ。"],
      ["ギルドマスター ラウラ", "アビスの中では魔物が増え続け、空間そのものがゆがんでいる。放っておけば、いずれ町も飲みこまれるわ。"],
      ["ギルドマスター ラウラ", "まずは近くの「翠緑の古代樹」から。依頼掲示板で出発を選んでちょうだい。"],
    ] },
    { id: "ch1", nm: "第一章　古き樹の記憶", at: "d1", lines: [
      ["ギルドマスター ラウラ", "古樹の守護者を鎮めたのね。おつかれさま。"],
      ["ギルドマスター ラウラ", "守護者が守っていたのは、古代の祭壇……そこに刻まれていた文字は「星脈を、凍れる女王に託す」。"],
      ["ギルドマスター ラウラ", "次は北の「蒼晶の氷窟」。女王、という言葉が気になるわ。"],
    ] },
    { id: "ch2", nm: "第二章　凍れる女王", at: "d2", lines: [
      ["ギルドマスター ラウラ", "氷晶の女王は、古代文明の守り手だったみたい。最後に「炎の城の巨神が、鍵を持つ」と言い残したそうね。"],
      ["ギルドマスター ラウラ", "星脈の鍵……古代文明は、星脈をいくつかに分けて封じたのかもしれない。"],
    ] },
    { id: "ch3", nm: "第三章　熔ける城", at: "d3", lines: [
      ["ギルドマスター ラウラ", "熔岩の巨神の核から、古い頁が見つかったわ。書かれていたのは……書庫の場所。"],
      ["ギルドマスター ラウラ", "「忘却の魔導書庫」。古代の魔法がすべて眠る場所よ。気をつけて。"],
      ["ギルドマスター ラウラ", "それから——ギルドの地下に、深淵へつづく門が開いたの。腕に自信があるなら「深淵踏破」に挑んでみて。"],
    ] },
    { id: "ch4", nm: "第四章　禁書", at: "d4", lines: [
      ["ギルドマスター ラウラ", "禁書の司書が守っていた本……星脈を「ひとつにもどす」方法が書かれていたわ。"],
      ["ギルドマスター ラウラ", "でも、最後の頁が破られていた。続きは深淵の奥にある、と。"],
    ] },
    { id: "ch5", nm: "第五章　奈落の裁き", at: "d5", lines: [
      ["ギルドマスター ラウラ", "奈落の執行者は、星脈を壊そうとする者を裁く存在だったのね。"],
      ["ギルドマスター ラウラ", "あなたが認められた、ということ。星天の神殿への道が、空に浮かびあがったわ。"],
    ] },
    { id: "ch6", nm: "終章　星天の原初竜", at: "d6", lines: [
      ["ギルドマスター ラウラ", "原初竜……星脈そのものだった竜が、あなたに道を示した。"],
      ["ギルドマスター ラウラ", "星脈は、ひとつにもどろうとしている。アビスは少しずつ静まっていくはずよ。"],
      ["ギルドマスター ラウラ", "でも、深淵の門はまだ開いたまま。まだ見ぬ星脈の底へ——あなたの物語は、これからも続くわ。"],
    ] },
  ];
  /* 古文書（隠し部屋・祭壇で見つかる図鑑の記録） */
  const LORE = [
    { id: "l1", nm: "星脈について", d: "星脈は大地の下を流れる魔力の川。古代の人々はそれを「世界の血」と呼んだ。" },
    { id: "l2", nm: "古代文明", d: "空に神殿を浮かべた古代文明は、星脈を一点に集めて永遠の力を得ようとした。" },
    { id: "l3", nm: "アビスの誕生", d: "集められた星脈はあふれ、世界の六か所に裂け目を作った。それが最初のアビスである。" },
    { id: "l4", nm: "守り手たち", d: "古代文明は裂け目ごとに守り手を置いた。守り手は今も、星脈の欠片を守り続けている。" },
    { id: "l5", nm: "星脈共鳴", d: "異なる力が星脈の上でかさなるとき、まったく新しい力が生まれる。これを共鳴と呼ぶ。" },
    { id: "l6", nm: "冒険者ギルド", d: "ギルド《アストラ》は、アビスから町を守るために作られた探索者の集まりである。" },
    { id: "l7", nm: "深淵の門", d: "すべてのアビスの底はつながっている。深淵の門は、その底へ降りるための唯一の道だ。" },
    { id: "l8", nm: "原初竜", d: "星脈が最初に形をとったもの。それが竜の姿だったのは、人が竜を最も強いものと信じたからだ。" },
  ];

  MA.D = {
    ELEM, ELEM_KEYS, ADV, elemMul, MB_EL, CTYPE, CAT, CHARS, CHAR_ORDER, WEAPONS, WEAPON_KEYS, WEAPON_MAX, EVOS,
    MAGICS, MAGIC_KEYS, MAGIC_MAX, STATS, STAT_KEYS, RAR, RAR_KEYS, RESONANCES, ENEMIES, BOSSES, DUNGEONS, DUN, MATS,
    SLOTS, SLOT_KEYS, GEAR, GEAR_KEYS, GEAR_RAR, SHOP_ITEMS, FACILITIES, TREE, TREE_BR, CHAR_MAX_LV, AWK, MUTATIONS,
    ABYSS_RULES, EVENTS, ACH, MISSIONS, STORY, LORE,
  };
})();
