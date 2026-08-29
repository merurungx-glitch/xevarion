/* ══════════════════════════════════════════════════════════════
   Magi: Arcana Rush ── コア（規則・データ）
   ★★ 2026-08-29 新作（β版）

   ── このアプリの立ち位置 ──
   MagiBurst の派生作。<b>キャラクターもガチャも XEVARION の既存のもの</b>を
   そのまま使います（ご指定）。つまり:
     ・キャラ表・ステータス・アビリティ・リンク・フルバースト
         → <b>MagiBurst/js/mb-core.js</b>（CHARS / statsOf / …）が持ち主
     ・所持キャラ・限界突破・レベル
         → <b>magiburst_v1</b>（mb-boot.js が読み込む DB）が持ち主
     ・ガチャ
         → <b>このアプリには実装しない</b>。XEVARION の gacha.html へ送る
     ・💎クリスタル＝ジェム ／ スタミナ・ランク＝ XEVA.status
         → XEVARION 共通ウォレット
   ＝ このファイルには<b>キャラの性能を1行も書かない</b>。
     書くのは「Arcana Rush だけの言いかえと、この作品だけの仕組み」だけです。

   ── この作品だけの仕組み ──
     ① 7属性（FLAME / FROST / VOLT / LUMEN / ABYSS / ASTRAL / CHAOS）
        …… 味方が持つのは前の5つ。ASTRAL と CHAOS は<b>敵だけ</b>の属性。
     ② Link Arts        …… 味方にふれると連携技。<b>ふれた順番</b>で威力が変わる
     ③ Elemental Resonance …… 1ショットの中で<b>ちがう属性のリンクを2つ</b>つなぐと発動
     ④ Arcana Skill     …… キャラ固有のアクティブ（MagiBurst のショットスキル）
     ⑤ Arcana Burst     …… ゲージをためて撃つ必殺技（MagiBurst のフルバースト）
     ⑥ レアリティ6段階（COMMON → … → ASTRAL）
   ══════════════════════════════════════════════════════════════ */
"use strict";

/* ══════════════ ① 属性 ══════════════ */
/* 味方が持つ5属性。土台は MagiBurst の el（fire/water/wood/light/dark）。
   ★ 相性そのものは mb-core.js の elemMult() をそのまま使う——
     こちらで書き直すと「図鑑の数字と実際の与ダメージが合わない」が必ず起きる。 */
const MAR_EL = {
  fire:  { k: "flame", nm: "FLAME", ja: "焔", c: "#ff5d47", g: "#ffb03a", ico: "🔥" },
  water: { k: "frost", nm: "FROST", ja: "氷", c: "#38a6ff", g: "#8ef0ff", ico: "❄️" },
  wood:  { k: "volt",  nm: "VOLT",  ja: "雷", c: "#2fbf71", g: "#c6ff5e", ico: "⚡" },
  light: { k: "lumen", nm: "LUMEN", ja: "光", c: "#ffd257", g: "#fff6c8", ico: "✦" },
  dark:  { k: "abyss", nm: "ABYSS", ja: "闇", c: "#a86bff", g: "#e6b8ff", ico: "🌑" },
};
/* 敵だけが持つ2属性。
   ・ASTRAL … どの属性でも<b>等倍</b>（有利も不利も無い＝力ずくでしか崩せない）
   ・CHAOS  … どの属性でも<b>0.7倍</b>。ただし
     <b>Elemental Resonance を発動させているあいだだけ 1.6倍</b>になる
     ＝「属性を組み合わせて崩す」というこの作品のテーマそのものを敵側に置いたもの。 */
const MAR_EL_X = {
  astral: { nm: "ASTRAL", ja: "星", c: "#8ad4ff", g: "#ffffff", ico: "✧",
            desc: "どの属性でも<b>等倍</b>。有利をとれないので、純粋な火力とリンクで押しきる" },
  chaos:  { nm: "CHAOS",  ja: "混", c: "#ff3d8a", g: "#ffb0cf", ico: "✹",
            desc: "どの属性でも<b>0.7倍</b>。ただし <b>Elemental Resonance 中は 1.6倍</b>" },
};
const MAR_EL_ORDER = ["fire", "water", "wood", "light", "dark"];
function marEl(k) { return MAR_EL[k] || MAR_EL_X[k] || MAR_EL.light; }
function marElName(k) { return marEl(k).nm; }
function marElColor(k) { return marEl(k).c; }

/* 与ダメージの属性倍率。味方の属性 a が 敵の属性 d に当たるとき。
   reso ＝ そのショットで Elemental Resonance が起きているか */
function marElemMult(a, d, reso) {
  if (d === "astral") return 1;
  if (d === "chaos") return reso ? 1.6 : 0.7;
  try { return elemMult(a, d); } catch (e) { return 1; }
}

/* ══════════════ ② レアリティ（6段階）══════════════ */
/* ★ 台帳は作らない。MagiBurst 側の「どこで手に入るか」から機械的に決める。
     ASTRAL     … 常設の限定ガチャ（極彩祭・極華祭・極煌祭・戦姫祭）の限定SSR
     MYTHIC     … 期間つきフェスの限定SSR
     LEGENDARY  … プレミアム／GRAND DEBUT のSSR
     EPIC       … それ以外のSSR（降臨・クエスト・配布）
     RARE       … クロススキルを持つSR
     COMMON     … それ以外のSR
   ＝ キャラを足しても、このアプリに書き足すことはありません。 */
const MAR_RARITY = {
  COMMON:    { nm: "COMMON",    c: "#9aa6c8", g: "#cfd8ef", lv: 40, lb: 4,  awk: 2 },
  RARE:      { nm: "RARE",      c: "#4b8bff", g: "#9cc4ff", lv: 50, lb: 6,  awk: 3 },
  EPIC:      { nm: "EPIC",      c: "#a86bff", g: "#dcb8ff", lv: 60, lb: 8,  awk: 3 },
  LEGENDARY: { nm: "LEGENDARY", c: "#ffb03a", g: "#ffe6a8", lv: 80, lb: 8,  awk: 4 },
  MYTHIC:    { nm: "MYTHIC",    c: "#ff3d8a", g: "#ffb0cf", lv: 90, lb: 10, awk: 4 },
  ASTRAL:    { nm: "ASTRAL",    c: "#8ad4ff", g: "#ffffff", lv: 99, lb: 10, awk: 5 },
};
const MAR_RARITY_ORDER = ["COMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC", "ASTRAL"];

function marRarityKey(id) {
  const c = (typeof CHARS !== "undefined") ? CHARS[id] : null;
  if (!c) return "COMMON";
  /* フェス限定か（FESTS[k].chars を見る＝台帳をコピーしない） */
  let fesKey = "";
  try {
    Object.keys(FESTS).forEach((k) => {
      const f = FESTS[k];
      if (f && !f.archive && (f.chars || []).indexOf(id) >= 0) fesKey = k;
    });
  } catch (e) {}
  if (fesKey) {
    const f = FESTS[fesKey];
    /* 常設の限定ガチャ（毎月／常時開催）＝この作品でいちばん上の ASTRAL */
    if (f.monthly || f.luxGacha) return "ASTRAL";
    return "MYTHIC";
  }
  const s5 = (typeof isStar5 === "function") ? isStar5(id) : false;
  if (s5) {
    let debut = false;
    try { (DEBUT_VERSIONS || []).forEach((v) => { if ((v.chars || []).indexOf(id) >= 0) debut = true; }); } catch (e) {}
    let prem = false;
    try { prem = PREMIUM_CHARS.indexOf(id) >= 0; } catch (e) {}
    return (debut || prem) ? "LEGENDARY" : "EPIC";
  }
  let cross = false;
  try { cross = !!connectDef(id); } catch (e) {}
  return cross ? "RARE" : "COMMON";
}
function marRarity(id) { return MAR_RARITY[marRarityKey(id)]; }

/* ══════════════ ③ ロール（Role）══════════════ */
/* MagiBurst の「戦型（BATTLE_TYPES のキー）」を英語のロール名に言いかえるだけ。 */
const MAR_ROLE = {
  striker: "Striker", cannon: "Magic Attacker", support: "Supporter",
  speed: "Skirmisher", tank: "Guardian", trick: "Trickster", balance: "All-Rounder",
};
function marRole(id) {
  let k = "";
  try { k = CHAR_TYPE[id] || ""; } catch (e) {}
  return MAR_ROLE[k] || "All-Rounder";
}

/* ══════════════ ④ 戦闘力（Combat Power）══════════════ */
/* この作品だけの「1つの数字で強さを見くらべる」指標。
   ★ もとにするのは<b>いま持っている育ち具合</b>（レベル・限界突破）。
     育てると増えるので、パーティ編成のならびかえに使える。 */
function marStats(id) {
  try { return charStats(id); } catch (e) { return { hp: 0, atk: 0, spd: 0, lv: 1, awk: 0 }; }
}
function marMaxStats(id) {
  try { return statsOf(id, MAX_LV, MAX_AWK, null); } catch (e) { return marStats(id); }
}
function marAbilCount(id) {
  const c = (typeof CHARS !== "undefined") ? CHARS[id] : null;
  if (!c) return 0;
  let n = (c.abil || []).length;
  try { const d = connectDef(id); if (d) n += (d.skills || []).length; } catch (e) {}
  return n;
}
function marPowerOf(st, id) {
  const rar = marRarity(id);
  const mul = 1 + MAR_RARITY_ORDER.indexOf(marRarityKey(id)) * 0.12;
  const base = (st.hp || 0) * 1.2 + (st.atk || 0) * 9 + (st.spd || 0) * 45;
  const ab = 1 + marAbilCount(id) * 0.05;
  return Math.round(base * ab * mul * 2.7 / 10) * 10;
}
function marPower(id) { return marPowerOf(marStats(id), id); }
function marPowerMax(id) { return marPowerOf(marMaxStats(id), id); }

/* Arcana Rush だけのサブステータス（ARC / CRIT / CRIT DMG）。
   ★ 新しい数字を保存はしない——<b>持っているステータスから毎回みちびく</b>ので、
     育てれば自然に伸びるし、セーブが増えることもない。 */
function marArc(id) {
  const st = marStats(id);
  return Math.round((st.atk || 0) * 0.34 + marAbilCount(id) * 42);
}
function marCrit(id) {
  const st = marStats(id);
  const rar = MAR_RARITY_ORDER.indexOf(marRarityKey(id));
  return Math.round((8 + rar * 2.6 + (st.spd || 0) / 46) * 10) / 10;   /* % */
}
function marCritDmg(id) {
  const rar = MAR_RARITY_ORDER.indexOf(marRarityKey(id));
  return Math.round((150 + rar * 7) * 10) / 10;                        /* % */
}

/* ══════════════ ⑤ Elemental Resonance ══════════════ */
/* 1ショットの中で「ちがう属性のリンクアーツを2つ」つなぐと発動する追加効果。
   ★ 5属性の組み合わせは 10通り。<b>全部に名前と効果を用意する</b>
     （抜けがあると「同じ操作をしたのに何も起きない」が起きるため）。
   キーは属性2つを MAR_EL_ORDER の順にならべて "|" でつないだもの。 */
const MAR_RESO = {
  "fire|water":  { nm: "STEAM VEIL",    ja: "蒸威の帳",   c: "#7fd6ff", pow: 1.55, kind: "burst",
                   desc: "灼けた蒸気が盤面を覆い、<b>ふれている敵すべて</b>に追加の一撃" },
  "fire|wood":   { nm: "OVERHEAT",      ja: "過熱",       c: "#ff8c2e", pow: 1.85, kind: "burst",
                   desc: "炎に雷が走り、<b>攻撃力アップ＋追加ダメージ</b>（この作品でいちばん重い共鳴）" },
  "fire|light":  { nm: "SOLAR FLARE",   ja: "陽炎閃",     c: "#ffb03a", pow: 1.50, kind: "ray",
                   desc: "光の柱が立ち、<b>いちばん遠い敵まで貫く</b>一条の閃光" },
  "fire|dark":   { nm: "STARLIGHT BURST", ja: "星焔爆",   c: "#ff6f91", pow: 1.60, kind: "burst",
                   desc: "焔と闇が混ざり、<b>全属性への与ダメージが上がる</b>" },
  "water|wood":  { nm: "CRYSTAL VINE",  ja: "氷蔦",       c: "#7dffb0", pow: 1.35, kind: "slow",
                   desc: "凍った蔦が絡み、<b>敵の攻撃ターンを1つ遅らせる</b>" },
  "water|light": { nm: "CRYSTAL LIGHT", ja: "晶光",       c: "#9cd8ff", pow: 1.40, kind: "heal",
                   desc: "澄んだ光が満ち、<b>チームHPを回復</b>しながら削る" },
  "water|dark":  { nm: "DARK SHOCK",    ja: "闇霜衝",     c: "#7c8cff", pow: 1.45, kind: "burst",
                   desc: "凍てついた闇が弾け、<b>まわりの敵をまとめて撃つ</b>" },
  "wood|light":  { nm: "VERDANT DAWN",  ja: "翠明",       c: "#c6ff5e", pow: 1.30, kind: "gauge",
                   desc: "芽吹きの光が走り、<b>味方全員の Arcana Burst が1ターン進む</b>" },
  "wood|dark":   { nm: "VOID SPARK",    ja: "虚雷",       c: "#a6ff8c", pow: 1.50, kind: "chain",
                   desc: "雷が敵から敵へ伝い、<b>つながった数だけ重くなる</b>" },
  "light|dark":  { nm: "VOID COLLAPSE", ja: "虚無崩落",   c: "#d9a8ff", pow: 1.95, kind: "burst",
                   desc: "光と闇が打ち消しあって<b>盤面ぜんたいが崩れる</b>——最大の共鳴" },
};
function marResoKey(a, b) {
  const ia = MAR_EL_ORDER.indexOf(a), ib = MAR_EL_ORDER.indexOf(b);
  if (ia < 0 || ib < 0 || ia === ib) return "";
  return ia < ib ? a + "|" + b : b + "|" + a;
}
function marResoOf(a, b) { return MAR_RESO[marResoKey(a, b)] || null; }

/* ══════════════ ⑥ Link Arts のならび効果 ══════════════ */
/* 1ショットの中で<b>何体目にふれたか</b>で威力が変わる（ご指定の
   「接触する順番によって攻撃内容が変化する」を数字にしたもの）。 */
const MAR_LINK_ORDER_MUL = [1.00, 1.25, 1.55, 1.90];
function marLinkMul(n) {
  return MAR_LINK_ORDER_MUL[Math.min(n, MAR_LINK_ORDER_MUL.length - 1)];
}
/* CHAIN: 1ショットのヒット数が増えるほど重くなる（10ヒットごとに +5%・最大 +50%） */
function marChainMul(hits) { return 1 + Math.min(10, Math.floor(hits / 10)) * 0.05; }

/* ══════════════ ⑦ クエスト ══════════════ */
/* 難易度は5段階。上の難易度は「1つ下をクリアすると開く」。 */
const MAR_DIFF = [
  { k: "normal",    nm: "Normal",    ja: "ノーマル",     c: "#4b8bff", hp: 1.00, atk: 1.00, lv: 60, cost: 8,  gold: 1.0 },
  { k: "hard",      nm: "Hard",      ja: "ハード",       c: "#2fbf71", hp: 1.75, atk: 1.35, lv: 70, cost: 10, gold: 1.6 },
  { k: "expert",    nm: "Expert",    ja: "エキスパート", c: "#ffb03a", hp: 2.90, atk: 1.75, lv: 80, cost: 12, gold: 2.4 },
  { k: "nightmare", nm: "Nightmare", ja: "ナイトメア",   c: "#ff3d8a", hp: 4.60, atk: 2.30, lv: 90, cost: 15, gold: 3.6 },
  { k: "abyss",     nm: "Abyss",     ja: "アビス",       c: "#a86bff", hp: 7.20, atk: 3.00, lv: 99, cost: 18, gold: 5.4 },
];
function marDiff(k) { return MAR_DIFF.find((d) => d.k === k) || MAR_DIFF[0]; }

/* 章。1章＝5ステージ。ボスの属性は<b>章ごとにひと巡り</b>させ、
   どの属性のパーティにも出番があるようにしてある。 */
const MAR_CHAPTERS = [
  { n: 1, nm: "暁の回廊",     sn: "暁",   en: "Dawn Corridor",         c: "#ffb03a",
    els: ["wood", "water", "fire", "light", "dark"] },
  { n: 2, nm: "氷結の聖堂",   sn: "氷結", en: "Frozen Cathedral",      c: "#38a6ff",
    els: ["fire", "wood", "dark", "water", "light"] },
  { n: 3, nm: "雷鳴の樹海",   sn: "雷鳴", en: "Thunder Woods",         c: "#2fbf71",
    els: ["water", "light", "wood", "fire", "dark"] },
  { n: 4, nm: "黄昏の楼閣",   sn: "黄昏", en: "Twilight Spire",        c: "#ff6f91",
    els: ["light", "dark", "fire", "wood", "water"] },
  { n: 5, nm: "深淵の水路",   sn: "深淵", en: "Abyssal Waterway",      c: "#a86bff",
    els: ["dark", "fire", "water", "light", "wood"] },
  { n: 6, nm: "天穹の観測所", sn: "天穹", en: "Celestial Observatory", c: "#8ad4ff",
    els: ["water", "wood", "light", "astral", "dark"] },
  { n: 7, nm: "星影の遺跡",   sn: "星影", en: "Starshadow Ruins",      c: "#c9a6ff",
    els: ["fire", "light", "dark", "astral", "chaos"] },
];
/* ステージ名（7-5「遺跡の中心」のような並び） */
const MAR_STAGE_NM = [
  ["はじまりの", "ひらけた", "崩れた", "封じられた", "最奥の"],
  ["外苑", "回廊", "広間", "祭壇", "中枢"],
];
function marStageName(ch, i) {
  /* ★ 章の短い名（sn）を使う。nm.slice(0,2) だと「暁の」で切れて
     「暁のの外苑」と<b>「の」が二重</b>になっていた。 */
  return MAR_STAGE_NM[0][i] + MAR_CHAPTERS[ch - 1].sn + "の" + MAR_STAGE_NM[1][i];
}
/* 1ステージぶんの定義（数字は章とステージ番号から機械的に決める＝表を持たない） */
function marStage(ch, i, diffKey) {
  const C = MAR_CHAPTERS[ch - 1];
  const d = marDiff(diffKey);
  const step = (ch - 1) * 5 + i;                       /* 0 から始まる通し番号 */
  const el = C.els[i];
  const waves = 2 + Math.min(2, Math.floor(i / 2));    /* 2〜4 WAVE */
  const hp = Math.round((5200 + step * 3100) * d.hp);
  const atk = Math.round((320 + step * 105) * d.atk);
  return {
    id: "s" + ch + "-" + (i + 1) + "-" + d.k,
    ch: ch, no: i + 1, key: ch + "-" + (i + 1),
    nm: marStageName(ch, i),
    chapter: C, diff: d, el: el,
    waves: waves,
    enemyLv: d.lv - 14 + step,
    bossHp: hp, mobHp: Math.round(hp * 0.16), atk: atk,
    cost: d.cost + Math.floor(step / 5),
    power: Math.round((90000 + step * 24000) * d.hp / 1.6 / 100) * 100,
    gold: Math.round((900 + step * 260) * d.gold),
    exp: Math.round((26 + step * 9) * (1 + MAR_DIFF.indexOf(d) * 0.5)),
  };
}

/* ══════════════ ⑧ セーブ（このアプリだけの進行）══════════════ */
/* ★ 所持キャラ・レベルは magiburst_v1 が持ち主なので、ここに<b>入れない</b>。
     ここが持つのは「どこまでクリアしたか」「編成」など、この作品だけのもの。 */
const MAR_KEY = "magiarcanarush_v1";
function marFresh() {
  return { clear: {}, best: {}, party: [], diff: "normal", ch: 1, seen: {}, plays: 0 };
}
let MAR = marFresh();
try { MAR = Object.assign(MAR, JSON.parse(localStorage.getItem(MAR_KEY) || "{}")); } catch (e) {}
["clear", "best", "seen"].forEach((k) => { if (!MAR[k]) MAR[k] = {}; });
if (!Array.isArray(MAR.party)) MAR.party = [];
function marSave() { try { localStorage.setItem(MAR_KEY, JSON.stringify(MAR)); } catch (e) {} }

/* その難易度が開いているか（ノーマルはいつでも開いている） */
function marDiffOpen(ch, i, diffKey) {
  const idx = MAR_DIFF.findIndex((d) => d.k === diffKey);
  if (idx <= 0) return true;
  const prev = MAR_DIFF[idx - 1];
  return !!MAR.clear["s" + ch + "-" + (i + 1) + "-" + prev.k];
}
/* その章が開いているか（前の章の最終ステージをノーマルでクリアすると開く） */
function marChapterOpen(ch) {
  if (ch <= 1) return true;
  return !!MAR.clear["s" + (ch - 1) + "-5-normal"];
}

/* ══════════════ ⑨ 所持キャラ ══════════════ */
/* ★ 「持っているか」は magiburst_v1（DB.chars）だけを見る。
     ガチャはこのアプリに無いので、増やす手段は XEVARION 側にしかない。 */
function marOwnedIds() {
  try {
    return CHAR_IDS.filter((id) => DB.chars && DB.chars[id] && !charSecret(id));
  } catch (e) { return []; }
}
function marHas(id) { try { return !!(DB.chars && DB.chars[id]); } catch (e) { return false; } }

/* 編成（4体）。足りないぶんは「戦闘力の高い順」で自動的に埋める。 */
function marParty() {
  const own = marOwnedIds();
  const out = (MAR.party || []).filter((id) => own.indexOf(id) >= 0);
  if (out.length < 4) {
    own.slice().sort((a, b) => marPower(b) - marPower(a)).forEach((id) => {
      if (out.length < 4 && out.indexOf(id) < 0) out.push(id);
    });
  }
  return out.slice(0, 4);
}
function marSetParty(ids) {
  MAR.party = (ids || []).filter(Boolean).slice(0, 4);
  marSave();
}
/* おすすめ編成: 戦闘力が高く、かつ<b>属性がばらける</b>ように選ぶ
   （Elemental Resonance はちがう属性どうしでしか起きないため） */
function marAutoParty(targetEl) {
  const own = marOwnedIds().slice();
  /* 敵の属性に有利な子を上に */
  own.sort((a, b) => {
    const adv = (id) => (targetEl ? (marElemMult(CHARS[id].el, targetEl, false) > 1 ? 1 : 0) : 0);
    return (adv(b) - adv(a)) || (marPower(b) - marPower(a));
  });
  const out = [], used = {};
  own.forEach((id) => {
    const el = CHARS[id].el;
    if (out.length < 4 && !used[el]) { out.push(id); used[el] = 1; }
  });
  own.forEach((id) => { if (out.length < 4 && out.indexOf(id) < 0) out.push(id); });
  return out.slice(0, 4);
}

/* 編成のまとめ（画面上部に出す数字） */
function marPartyInfo(ids) {
  ids = (ids || []).filter(Boolean);
  let power = 0, hp = 0;
  const els = {};
  ids.forEach((id) => {
    const st = marStats(id);
    power += marPowerOf(st, id);
    hp += st.hp || 0;
    els[CHARS[id].el] = (els[CHARS[id].el] || 0) + 1;
  });
  const kinds = Object.keys(els).length;
  /* Link Compatibility: クロススキルの条件がそろっている数 ＋ 撃種のばらつき */
  let link = 0;
  ids.forEach((id) => {
    try { if (connectDef(id) && connectOnIdIn && connectOnIdIn(ids, id)) link++; } catch (e) {}
  });
  const shots = {};
  ids.forEach((id) => { shots[CHARS[id].shot] = 1; });
  const compat = Math.min(100, kinds * 18 + link * 14 + Object.keys(shots).length * 8 + (ids.length === 4 ? 10 : 0));
  /* Resonance Level: 起こせる共鳴の組み合わせの数（最大6） */
  let reso = 0;
  for (let a = 0; a < ids.length; a++) {
    for (let b = a + 1; b < ids.length; b++) {
      if (marResoOf(CHARS[ids[a]].el, CHARS[ids[b]].el)) reso++;
    }
  }
  return { power: power, hp: hp, els: els, kinds: kinds, compat: compat, reso: reso };
}
/* mb-core の connectOnId は DB.party を見るので、こちらの編成で判定し直すための小さな包み */
function connectOnIdIn(ids, id) {
  try {
    const d = connectDef(id);
    if (!d) return false;
    return !!d.cond(ids, id);
  } catch (e) { return false; }
}

/* ══════════════ ⑩ 小さな道具 ══════════════ */
function marFmt(n) { return Number(n || 0).toLocaleString(); }
function marEsc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function marClamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
/* キャラの絵（img/ は1つ上のフォルダ） */
function marImg(id) { const c = CHARS[id]; return c ? c.img : ""; }
function marTh(id) { const c = CHARS[id]; return c ? c.th : ""; }
