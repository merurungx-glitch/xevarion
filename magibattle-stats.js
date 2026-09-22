/* ============================================================
   MagiBattle-Stats v2 — MagiBattle の性能の「持ち主」（★★ 2026-09-23 全面刷新）
   ------------------------------------------------------------
   ・MagiBattle 本体（MagiBattle/js/mbt-*.js）と、ポータルの図鑑・ガチャ詳細
     （mb-char-detail.js）が<b>同じこの1本</b>を読む。計算式はここにしか書かない。
   ・性能の素は <b>MagiBurst の mb-core.js（CHARS）</b>。XEVARION の全キャラ
     （XEVA ガチャから移ってきた子も全員 CHARS に居る）に MagiBattle の性能がある。
       属性・レア度・ステータス・アビリティ・リンク名・FB名・戦型・ネクサス … を
       NIKKE 風の「クラス／バースト段階／武器／スキル1・2・バースト」に写す。
   ・凸（限界突破）は<b>共通</b>：MagiBurst の awk と XEVA ガチャの重ね（dupes）の大きいほう。
   ・mb-core.js が読まれていないページでは何もしない（MBStats.ready() が false）。
   ============================================================ */
(function () {
  "use strict";
  const VERSION = 2;
  const MAX_LV = 80;
  const MAX_AWK = 4;
  function hashN(s, salt) { let h = (salt >>> 0) || 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }
  function core() { try { return typeof CHARS !== "undefined" && typeof CHAR_IDS !== "undefined"; } catch (e) { return false; } }
  function C(id) { try { return (typeof CHARS !== "undefined" && CHARS[id]) || null; } catch (e) { return null; } }

  /* ── 属性（MagiBurst と同じ相性：火→木→水→火、光⇄闇） ── */
  const ELEMS = ["fire", "water", "wood", "light", "dark"];
  const ELEM = {
    fire:  { nm: "火", en: "IGNIS", c: "#ff5d47", l: "#ffcf6b" },
    water: { nm: "水", en: "AQUA",  c: "#38a6ff", l: "#c3e8ff" },
    wood:  { nm: "木", en: "VERDE", c: "#2fbf71", l: "#a8e6b0" },
    light: { nm: "光", en: "LUMEN", c: "#f0b429", l: "#fff1b8" },
    dark:  { nm: "闇", en: "UMBRA", c: "#a86bff", l: "#dccdff" },
  };
  const BEATS = { fire: "wood", wood: "water", water: "fire" };
  const ADV = 1.30, DIS = 0.80;
  function elemMult(a, d) {
    if (!a || !d) return 1;
    if ((a === "light" && d === "dark") || (a === "dark" && d === "light")) return ADV;
    if (BEATS[a] === d) return ADV;
    if (BEATS[d] === a) return DIS;
    return 1;
  }

  /* ── クラス（NIKKE の3クラス）とバースト段階 ── */
  const CLASSES = {
    attacker:  { nm: "火力型", en: "ATTACKER",  c: "#ff4d5a", hp: 0.88, atk: 1.18, def: 0.85, d: "攻撃に特化。HP・防御はひかえめ" },
    defender:  { nm: "防御型", en: "DEFENDER",  c: "#3f8cff", hp: 1.35, atk: 0.82, def: 1.45, d: "高いHPと防御で味方を守る。敵の攻撃を引きつけやすい" },
    supporter: { nm: "支援型", en: "SUPPORTER", c: "#2fbf71", hp: 1.05, atk: 0.92, def: 1.05, d: "回復・強化・バーストで味方を支える" },
  };
  const BURST_NM = { 1: "Ⅰ", 2: "Ⅱ", 3: "Ⅲ" };
  const BURST_CD = { 1: 20, 2: 20, 3: 40 };   // 秒（NIKKE と同じ間隔）
  /* MagiBurst の戦型 → クラス／バースト段階 */
  const TYPE_MAP = {
    support: ["supporter", 1], balance: ["defender", 1], trick: ["supporter", 2],
    speed: ["attacker", 2], striker: ["attacker", 3], cannon: ["attacker", 3],
  };

  /* ── 武器（ふだんの攻撃のしかた） ── */
  const WEAPONS = {
    AR:  { nm: "アサルトライフル", s: "AR",  itv: 1.00, mul: 1.00, tg: 1, gauge: 2.4, d: "安定した連射で敵1体を撃つ" },
    SMG: { nm: "サブマシンガン",   s: "SMG", itv: 0.45, mul: 0.43, tg: 1, gauge: 1.2, d: "とても速い連射。バーストゲージをためやすい" },
    SG:  { nm: "ショットガン",     s: "SG",  itv: 1.35, mul: 0.62, tg: 3, gauge: 3.0, d: "散弾で最大3体をまとめて撃つ" },
    SR:  { nm: "スナイパーライフル", s: "SR", itv: 2.40, mul: 2.95, tg: 1, gauge: 5.2, crit: 0.15, d: "遅いが一撃が重い。会心率が高い" },
    RL:  { nm: "ロケットランチャー", s: "RL", itv: 2.80, mul: 2.10, tg: 1, gauge: 6.0, splash: 0.45, d: "着弾点のまわりの敵にも爆風" },
    MG:  { nm: "マシンガン",       s: "MG",  itv: 0.30, mul: 0.36, tg: 1, gauge: 0.9, ramp: true, d: "撃ち続けるほど速くなる" },
  };
  function weaponOf(c) {
    const h = hashN(c.id, 411);
    const list = c.shot === "pierce" ? ["SR", "RL", "MG"] : ["AR", "SMG", "SG"];
    return list[h % list.length];
  }

  /* ── アビリティ（MagiBurst の148種）→ MagiBattle の効果 ──
     等級は名前の末尾：（なし）＝1・M＝2・L＝3・EL＝4。 */
  function gradeOf(t) { return /EL$/.test(t) ? 4 : /L$/.test(t) && !/^(?:allkill|fewfoe)$/.test(t) ? 3 : /M$/.test(t) ? 2 : 1; }
  function baseOf(t) { return String(t).replace(/(EL|L|M)$/, ""); }
  function abilFx(a) {
    const t = a.t, g = gradeOf(t), b = baseOf(t);
    if (b === "godpray") return { k: "godpray", v: 0.40 };
    if (b === "pray") return { k: "pray", v: 0.30 };
    if (b === "killer") return { k: "elkill", el: a.el, v: 0.10 * g };
    if (/^(judgekiller|houraikiller|netherkiller|eclipsekiller|eclipseslayer|bosskiller)$/.test(b)) return { k: "boss", v: (b === "bosskiller" ? 0.10 : 0.06) * g };
    if (b === "mobkiller") return { k: "mob", v: 0.10 * g };
    if (b === "firstkiller") return { k: "first", v: 0.20 * g };
    if (b === "vital") return { k: "vital", v: 0.10 * g };
    if (b === "fatalkiller") return { k: "fatal", v: 0.12 * g };
    if (b === "weakkiller") return { k: "critdmg", v: 0.10 * g };
    if (b === "poisonkiller") return { k: "poisonk", v: 0.12 * g };
    if (b === "allkill" || b === "allkiller") return { k: "all", v: 0.06 * g };
    if (b === "fewfoe") return { k: "fewfoe", v: 0.12 * g };
    if (/killer$/.test(b)) return { k: "all", v: 0.04 * g };
    if (b === "aura" || b === "waveboost") return { k: "aura", v: 0.03 * g };
    if (b === "sokojikara" || b === "konshin") return { k: "soko", v: 0.12 * g };
    if (b === "barrier") return { k: "barrier", v: 0.02 * g };
    if (b === "regen" || b === "heal") return { k: "regen", v: 0.006 * g };
    if (b === "drain" || b === "soul") return { k: "drain", v: 0.03 * g };
    if (b === "fsboost") return { k: "skill", v: 0.10 * g };
    if (b === "fsdouble") return { k: "double", v: 0.5 };
    if (/^(ssboost|fbshort|fbaccel|sscharge|fbturnboost|wallfbshort|linkcharge)$/.test(b)) return { k: "burstcd", v: 0.05 * g };
    if (/^(atkcharge|fbtouch)$/.test(b)) return { k: "gauge", v: 0.10 * g };
    if (/^(dash|speedmode|impulseboost|phantomdrive)$/.test(b)) return { k: "haste", v: 0.04 * g };
    if (b === "elemadv") return { k: "elemadv", v: 1 };
    if (/^(allres|elemres|protection|ailmentresist|pimmune)$/.test(b)) return { k: "guard", v: 0.03 * g };
    if (/^(omni|adw|superadw|aw|superaw|ms|superms|agrav|sgrav|ablock|antilock|award|aslow|superaslow)$/.test(b)) return { k: "anti", v: 0.04 };
    return { k: "crit", v: 0.02 * g };
  }
  const FX_TEXT = {
    godpray: (v) => "チームHPが35%を切ったとき<b>1回だけ</b>、チームHPを" + Math.round(v * 100) + "%回復し攻撃力+15%（10秒）",
    pray: (v) => "チームHPが35%を切ったとき<b>1回だけ</b>、チームHPを" + Math.round(v * 100) + "%回復",
    elkill: (v, a) => (ELEM[a.el] ? ELEM[a.el].nm : "") + "属性の敵へのダメージ +" + Math.round(v * 100) + "%",
    boss: (v) => "ボスへのダメージ +" + Math.round(v * 100) + "%",
    mob: (v) => "ボス以外へのダメージ +" + Math.round(v * 100) + "%",
    first: (v) => "その敵への<b>最初の一撃</b>のダメージ +" + Math.round(v * 100) + "%",
    vital: (v) => "HPが70%以上の敵へのダメージ +" + Math.round(v * 100) + "%",
    fatal: (v) => "HPが30%以下の敵へのダメージ +" + Math.round(v * 100) + "%",
    critdmg: (v) => "会心ダメージ +" + Math.round(v * 100) + "%",
    poisonk: (v) => "毒の敵へのダメージ +" + Math.round(v * 100) + "%",
    all: (v) => "与えるダメージ +" + Math.round(v * 100) + "%",
    fewfoe: (v) => "敵が2体以下のとき与えるダメージ +" + Math.round(v * 100) + "%",
    aura: (v) => "<b>味方全員</b>の攻撃力 +" + Math.round(v * 100) + "%",
    soko: (v) => "自分のHPが50%以下のとき攻撃力 +" + Math.round(v * 100) + "%",
    barrier: (v) => "バトル開始時、<b>味方全員</b>に最大HPの" + Math.round(v * 100) + "%のバリア",
    regen: (v) => "3秒ごとに<b>味方全員</b>のHPを" + (v * 100).toFixed(1) + "%回復",
    drain: (v) => "与えたダメージの" + Math.round(v * 100) + "%を自分のHPに",
    skill: (v) => "スキル2のダメージ +" + Math.round(v * 100) + "%",
    double: () => "スキル2が<b>もう1回</b>（2回目は50%）",
    burstcd: (v) => "バーストの再使用時間 -" + Math.round(v * 100) + "%",
    gauge: (v) => "バーストゲージのたまり +" + Math.round(v * 100) + "%",
    haste: (v) => "攻撃の速さ +" + Math.round(v * 100) + "%",
    elemadv: () => "<b>どの属性の敵にも有利</b>（×" + ADV + "）",
    guard: (v) => "受けるダメージ -" + Math.round(v * 100) + "%",
    anti: (v) => "ボスの大技（チャージ攻撃）のダメージ -" + Math.round(v * 100) + "%",
    crit: (v) => "会心率 +" + Math.round(v * 100) + "%",
  };

  /* ── 「上澄み」と「最強」の補正 ── */
  function tierOf(c) {
    if (c.fesKey === "crystal") return { k: "crystal", nm: "CRYSTAL", mul: 1.26 };   /* ★ MagiBattle 最強（ご指定） */
    if (c.lux && (c.nexus === "luxprism" || c.nexus === "luxblaze" || c.nexus === "luxbloom")) return { k: "lux", nm: "極祭", mul: 1.10 };
    if (c.fesKey === "kaen") return { k: "kaen", nm: "花宴", mul: 1.10 };
    if (c.fes) return { k: "fes", nm: "FES", mul: 1.05 };
    if (c.gacha || c.star5) return { k: "ssr", nm: "", mul: 1.0 };
    return { k: "sr", nm: "", mul: 0.94 };
  }

  /* ── スキル2（アクティブ）の型：リンクスキルの名前から決める ── */
  const S2_PAT = {
    burst:  { nm: "範囲", d: "敵全体に", mul: 1.55, tg: "all" },
    line:   { nm: "貫通", d: "敵2体に", mul: 2.55, tg: 2 },
    snipe:  { nm: "単体", d: "敵単体に", mul: 4.40, tg: 1 },
    chain:  { nm: "連撃", d: "ランダムな敵に5連", mul: 0.95, tg: "rand", n: 5 },
    ring:   { nm: "波動", d: "敵全体に＋防御力ダウン（8秒）", mul: 1.30, tg: "all", debuff: "def" },
  };
  const S2_KEYS = Object.keys(S2_PAT);

  /* ── バースト（FB 名）：段階ごとの形 ＋ FB の説明の言葉から効果をひろう ── */
  function burstFeat(c) {
    const t = String((c.ssPow || "") + (c.ssDesc || ""));
    return {
      heal: /回復/.test(t), barrier: /バリア/.test(t), defdown: /防御力ダウン|防御ダウン/.test(t),
      delay: /遅らせ|遅延|行動ターン/.test(t), poison: /毒/.test(t), barrage: /乱打|連」|\d+連/.test(t),
      rally: /総攻撃/.test(t), fb: /フルバーストを\d*進める|FBを/.test(t),
    };
  }

  /* ══════════ キャラ1体の MagiBattle プロフィール（凸・レベルに関係しない部分） ══════════ */
  const _prof = {};
  function unit(id) {
    if (_prof[id]) return _prof[id];
    const c = C(id); if (!c) return null;
    let typeKey = "balance";
    try { typeKey = (typeof CHAR_TYPE !== "undefined" && CHAR_TYPE[id]) || "balance"; } catch (e) {}
    let [cls, burst] = TYPE_MAP[typeKey] || TYPE_MAP.balance;
    const abil = (c.abil || []).slice();
    const has = (k) => abil.some((a) => a.t === k || baseOf(a.t) === k);
    /* 回復・祈り・バリアを持つ支援寄りの子はバーストⅠへ（Ⅰが足りなくならないように） */
    if (cls !== "defender" && burst !== 1 && (has("godpray") || has("pray")) && (has("regen") || has("barrier")) && typeKey !== "striker") { cls = "supporter"; burst = 1; }
    /* バランス型の半分はⅡへ（Ⅱの顔ぶれを増やす） */
    if (typeKey === "balance" && hashN(id, 29) % 2) burst = 2;
    const tier = tierOf(c);
    const w = weaponOf(c);
    const s2 = S2_KEYS[hashN(c.fsKind || id, 97) % S2_KEYS.length];
    const fx = abil.map((a) => Object.assign({ t: a.t, el: a.el }, abilFx(a)));
    const star5 = !!(c.gacha || c.fes || c.star5);
    const p = {
      id, nm: c.nm, img: c.img, th: c.th, el: c.el, el2: c.el2 || null,
      rar: star5 ? "SSR" : "SR", cls, burst, weapon: w, s2, tier,
      fes: c.fesKey || (c.fes ? "fes" : ""), nexus: c.nexus || "",
      base: { hp: (c.hp && c.hp[1]) || 6000, atk: (c.atk && c.atk[1]) || 6000, spd: (c.spd && c.spd[1]) || 420 },
      fx, abil,
      skill1: skill1Of(c, fx),
      skill2: { nm: c.fsName || "スキル", pat: s2, sub: c.subfs || "" },
      burstSk: { nm: c.ssName || "バースト", stage: burst, feat: burstFeat(c) },
    };
    _prof[id] = p;
    return p;
  }
  /* スキル1＝いちばん目立つアビリティの名前（祈り → キラー → オーラ → そのほか） */
  function skill1Of(c, fx) {
    const order = ["godpray", "pray", "boss", "elkill", "aura", "soko", "barrier", "regen", "first", "vital", "fatal", "all"];
    for (const k of order) {
      const i = fx.findIndex((f) => f.k === k);
      if (i >= 0) {
        let nm = "";
        try { nm = typeof abilName === "function" ? abilName(c.abil[i]) : (AB_NM[c.abil[i].t] || c.abil[i].t); } catch (e) { nm = c.abil[i].t; }
        return { nm, fx: fx[i] };
      }
    }
    return { nm: c.type || "心得", fx: null };
  }

  /* ══════════ レベル・凸・装備を入れたステータス ══════════ */
  function lvCurve(lv) { lv = Math.max(1, Math.min(MAX_LV, lv | 0)); return 0.20 + 0.80 * Math.pow((lv - 1) / (MAX_LV - 1), 0.92); }
  function statsAt(id, lv, awk, gear) {
    const p = unit(id); if (!p) return null;
    const cl = CLASSES[p.cls];
    const aw = Math.max(0, Math.min(MAX_AWK, awk | 0));
    const lvm = lvCurve(lv || 1), am = 1 + 0.07 * aw, tm = p.tier.mul;
    const g = gear || {};
    let hp = p.base.hp * 2.1 * cl.hp * lvm * am * tm;
    let atk = p.base.atk * 1.05 * cl.atk * lvm * am * tm;
    let def = (p.base.hp * 0.45 + p.base.atk * 0.12) * cl.def * lvm * (1 + 0.05 * aw) * tm;
    hp *= 1 + (g.hp || 0); atk *= 1 + (g.atk || 0); def *= 1 + (g.def || 0);
    const st = {
      hp: Math.round(hp), atk: Math.round(atk), def: Math.round(def),
      spd: p.base.spd,
      crit: 0.05 + (WEAPONS[p.weapon].crit || 0) + (g.critrate || 0) + p.fx.filter((f) => f.k === "crit").reduce((a, f) => a + f.v, 0),
      critDmg: 1.5 + (g.critdmg || 0) + p.fx.filter((f) => f.k === "critdmg").reduce((a, f) => a + f.v, 0),
    };
    st.power = powerOf(st);
    return st;
  }
  /* ★ 戦力は武器に左右されない形（武器は「戦い方」のちがいで、強さの差ではない） */
  function powerOf(st) {
    return Math.round(st.hp * 0.12 + st.atk * 0.22 + st.def * 0.14 + st.crit * 9000 + (st.critDmg - 1.5) * 6000);
  }

  /* ══════════ 装備（頭・腕・胸・足）★★ 2026-09-23 MagiBurst から移設 ══════════
     1つの装備＝部位・ティア（T1〜T9）・強化（+0〜+5）・オーバーロード（0〜3つ）。
     メインの効果は部位で決まり、オーバーロードはランダム（MagiBurst の装備の効果名をそのまま使う）。 */
  const GEAR_PARTS = ["head", "arm", "body", "leg"];
  const GEAR_PART = {
    head: { nm: "頭", full: "ヘッドギア", main: { atk: 0.030 } },
    arm:  { nm: "腕", full: "アームガード", main: { atk: 0.018, hp: 0.018 } },
    body: { nm: "胸", full: "ブレストプレート", main: { hp: 0.030, def: 0.018 } },
    leg:  { nm: "足", full: "レッグアーマー", main: { def: 0.030, hp: 0.012 } },
  };
  const GEAR_FX = {
    elemdmg:  { nm: "有利コードダメージ増加", short: "有利DMG", min: 9.54,  max: 29.16, c: "#ff8f5e" },
    hitrate:  { nm: "命中率増加",             short: "命中",    min: 4.77,  max: 14.63, c: "#7cc4ff" },
    ammo:     { nm: "最大装弾数増加",         short: "攻撃速度", min: 27.84, max: 85.37, c: "#8affc4" },
    atk:      { nm: "攻撃力増加",             short: "攻撃力",  min: 4.77,  max: 14.63, c: "#ff5d47" },
    chgdmg:   { nm: "チャージダメージ増加",   short: "バースト威力", min: 4.77, max: 14.63, c: "#ffb020" },
    chgspd:   { nm: "チャージ速度増加",       short: "スキル再使用", min: 1.98, max: 6.09, c: "#ffd257" },
    critrate: { nm: "クリティカル確率増加",   short: "会心率",  min: 2.30,  max: 7.07,  c: "#ff6f91" },
    critdmg:  { nm: "クリティカルダメージ増加", short: "会心DMG", min: 6.64, max: 20.36, c: "#ff3d6e" },
    def:      { nm: "防御力増加",             short: "防御力",  min: 4.77,  max: 14.63, c: "#9ad4ff" },
  };
  const GEAR_FX_IDS = Object.keys(GEAR_FX);
  const GEAR_FX_DESC = {
    elemdmg: "属性が有利な敵へのダメージ", hitrate: "スキル2のダメージ（命中で急所を撃ちぬく）", ammo: "ふだんの攻撃の速さ（装弾数 ÷ 8）",
    atk: "攻撃力", chgdmg: "バーストのダメージ", chgspd: "スキル2・バーストの再使用時間の短縮（×2）",
    critrate: "会心率", critdmg: "会心ダメージ", def: "防御力",
  };
  /* 1つぶんの効果（数値は %）を、ステータスへの割合（0.xx）に直して足しこむ */
  function gearSum(list) {
    const s = { hp: 0, atk: 0, def: 0, elemdmg: 0, hitrate: 0, haste: 0, chgdmg: 0, cd: 0, critrate: 0, critdmg: 0 };
    (list || []).forEach((g) => {
      if (!g || !GEAR_PART[g.p]) return;
      const t = Math.max(1, Math.min(9, g.t | 0)), lv = Math.max(0, Math.min(5, g.lv | 0));
      const m = GEAR_PART[g.p].main, scale = t * (1 + 0.20 * lv);
      Object.keys(m).forEach((k) => { s[k] += m[k] * scale; });
      (g.subs || []).forEach((x) => {
        const v = (+x.v || 0) / 100;
        if (x.e === "atk") s.atk += v; else if (x.e === "def") s.def += v;
        else if (x.e === "elemdmg") s.elemdmg += v; else if (x.e === "hitrate") s.hitrate += v;
        else if (x.e === "ammo") s.haste += v / 8; else if (x.e === "chgdmg") s.chgdmg += v;
        else if (x.e === "chgspd") s.cd += v * 2; else if (x.e === "critrate") s.critrate += v;
        else if (x.e === "critdmg") s.critdmg += v;
      });
    });
    s.cd = Math.min(0.45, s.cd);
    return s;
  }
  function gearIsHigh(x) { const f = GEAR_FX[x && x.e]; return !!f && x.v >= f.min + (f.max - f.min) * 0.7; }

  /* ══════════ 凸（共通）・所持（共通） ══════════ */
  const XEVA_ALIAS = { rinonx: "rinon", shiona: "shion" };
  const XEVA_ALIAS_R = { rinon: "rinonx", shion: "shiona" };
  function mbSave() { try { return JSON.parse(localStorage.getItem("magiburst_v1") || "null") || {}; } catch (e) { return {}; } }
  function xgSave() { try { return JSON.parse(localStorage.getItem("xeva_gacha_v1") || "null") || {}; } catch (e) { return {}; } }
  function sharedOf(id, mb, xg) {
    mb = mb || mbSave(); xg = xg || xgSave();
    const m = (mb.chars || {})[id];
    const xid = XEVA_ALIAS[id] || id;
    const xo = !!((xg.owned || {})[xid]) || (xid === "hina");
    const xd = Math.min(MAX_AWK, ((xg.dupes || {})[xid]) | 0);
    let mbLv = 0; if (m) mbLv = m.lv | 0;
    return { own: !!m || xo, awk: Math.max(m ? (m.awk | 0) : 0, xo ? xd : 0), mbLv };
  }

  /* ══════════ ダメージ ══════════ */
  function defMul(def) { return 1 - def / (def + 26000); }

  /* ══════════ 表示（ポータルの図鑑・ガチャ・MagiBattle のキャラ詳細） ══════════ */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m])); }
  function s2Text(p, st) {
    const P = S2_PAT[p.skill2.pat];
    const cd = 9 + (hashN(p.id, 5) % 5);
    return { cd, text: P.d + " 攻撃力×" + P.mul.toFixed(2) + (P.n ? "（×" + P.n + "回）" : "") + "・再使用 " + cd + "秒" };
  }
  function burstText(p) {
    const f = p.burstSk.feat, st = p.burstSk.stage, cr = p.tier.k === "crystal";
    const cd = cr ? 20 : BURST_CD[st];
    const parts = [];
    if (st === 1) {
      parts.push("<b>味方全員の攻撃力+30%</b>（10秒）");
      if (f.heal) parts.push("チームHPを25%回復"); else parts.push("味方全員に最大HPの12%のバリア");
      parts.push("敵全体に 攻撃力×3.0");
    } else if (st === 2) {
      parts.push("敵全体に 攻撃力×6.0", "<b>敵全体の防御力-25%</b>（10秒）");
      if (f.delay) parts.push("敵の大技を2秒遅らせる");
      if (f.poison) parts.push("敵全体を毒（10秒）");
      if (f.heal) parts.push("チームHPを15%回復");
    } else {
      if (f.barrage) parts.push("狙った敵に<b>12連撃</b>（1発 攻撃力×1.6）", "締めに 攻撃力×6.0");
      else parts.push("敵全体に 攻撃力×9.0", "狙った敵に追撃 攻撃力×6.0");
      if (f.defdown) parts.push("敵全体の防御力-15%（10秒）");
      if (f.rally) parts.push("味方全員が追撃");
    }
    if (f.fb) parts.push("味方全員のスキル2を即使用可能に");
    if (cr) parts.push("<b>晶学の加護</b>：どの段階のバーストとしても使え、FULL BURST 中は攻撃力+30%");
    return { cd, text: parts.join("／") };
  }
  function iconEl(el, px) {
    const e = ELEM[el]; if (!e) return "";
    return '<span class="mbx-el" style="--ec:' + e.c + ';width:' + (px || 16) + 'px;height:' + (px || 16) + 'px">' + e.nm + "</span>";
  }
  function detailHTML(id, opt) {
    opt = opt || {};
    const p = unit(id); if (!p) return "";
    const lv = opt.lv || MAX_LV, aw = opt.awk == null ? MAX_AWK : opt.awk;
    const st = statsAt(id, lv, aw, opt.gear || null);
    const st1 = statsAt(id, 1, 0, null);
    const cl = CLASSES[p.cls], w = WEAPONS[p.weapon], el = ELEM[p.el];
    const s2 = s2Text(p, st), bt = burstText(p);
    const fxRows = p.fx.map((f, i) => {
      let nm = ""; try { nm = typeof abilName === "function" ? abilName(p.abil[i]) : p.abil[i].t; } catch (e) { nm = p.abil[i].t; }
      const tx = FX_TEXT[f.k] ? FX_TEXT[f.k](f.v, f) : "";
      return '<div class="mbx-ab"><b>' + esc(nm) + "</b><span>" + tx + "</span></div>";
    }).join("");
    return '<div class="mbx">'
      + '<div class="mbx-tags">'
      + '<span class="mbx-tag" style="--tc:' + el.c + '">' + el.nm + "属性</span>"
      + (p.el2 && ELEM[p.el2] ? '<span class="mbx-tag" style="--tc:' + ELEM[p.el2].c + '">' + ELEM[p.el2].nm + "属性</span>" : "")
      + '<span class="mbx-tag" style="--tc:' + cl.c + '">' + cl.nm + "（" + cl.en + "）</span>"
      + '<span class="mbx-tag bu">BURST ' + (p.tier.k === "crystal" ? "Ⅰ・Ⅱ・Ⅲ" : BURST_NM[p.burst]) + "</span>"
      + '<span class="mbx-tag">' + w.s + "・" + w.nm + "</span>"
      + (p.tier.nm ? '<span class="mbx-tag gd">' + p.tier.nm + "</span>" : "")
      + "</div>"
      + '<div class="mbx-st"><div><small>戦力</small><b>' + st.power.toLocaleString() + "</b></div>"
      + "<div><small>HP</small><b>" + st.hp.toLocaleString() + "</b></div>"
      + "<div><small>攻撃</small><b>" + st.atk.toLocaleString() + "</b></div>"
      + "<div><small>防御</small><b>" + st.def.toLocaleString() + "</b></div>"
      + "<div><small>会心</small><b>" + Math.round(st.crit * 100) + "%</b></div></div>"
      + '<div class="mbx-cap">Lv.' + lv + (aw ? "・" + (aw >= MAX_AWK ? "完凸" : aw + "凸") : "") + " の値（Lv.1・無凸は 戦力 " + st1.power.toLocaleString() + "）</div>"
      + '<div class="mbx-sk"><div class="mbx-skh"><i>SKILL 1</i><b>' + esc(p.skill1.nm) + "</b></div><p>"
      + (p.skill1.fx && FX_TEXT[p.skill1.fx.k] ? FX_TEXT[p.skill1.fx.k](p.skill1.fx.v, p.skill1.fx) : "アビリティの効果がそのまま入ります") + "</p></div>"
      + '<div class="mbx-sk"><div class="mbx-skh"><i>SKILL 2</i><b>' + esc(p.skill2.nm) + "</b><em>" + S2_PAT[p.skill2.pat].nm + "</em></div><p>" + s2.text + "</p></div>"
      + '<div class="mbx-sk bu"><div class="mbx-skh"><i>BURST ' + BURST_NM[p.burst] + "</i><b>" + esc(p.burstSk.nm) + "</b><em>再使用 " + bt.cd + "秒</em></div><p>" + bt.text + "</p></div>"
      + '<div class="mbx-sk"><div class="mbx-skh"><i>WEAPON</i><b>' + w.nm + "</b></div><p>" + w.d + "</p></div>"
      + (fxRows && !opt.compact ? '<div class="mbx-abs"><div class="mbx-abt">アビリティ（MagiBattle での効果）</div>' + fxRows + "</div>" : "")
      + "</div>";
  }
  const CSS = ".mbx{font-size:12px;line-height:1.5}.mbx-tags{display:flex;flex-wrap:wrap;gap:4px;margin:4px 0 8px}"
    + ".mbx-tag{--tc:#8b93a8;font-size:10.5px;font-weight:900;padding:2px 8px;border-radius:999px;border:1.5px solid var(--tc);color:var(--tc);background:color-mix(in srgb,var(--tc) 10%,transparent)}"
    + ".mbx-tag.bu{--tc:#ff3b55}.mbx-tag.gd{--tc:#e2a400}"
    + ".mbx-st{display:grid;grid-template-columns:repeat(5,1fr);gap:4px}.mbx-st div{background:rgba(120,130,160,.1);border-radius:9px;padding:5px 4px;text-align:center}"
    + ".mbx-st small{display:block;font-size:9px;opacity:.7;font-weight:800}.mbx-st b{font-size:12.5px;font-weight:900}"
    + ".mbx-cap{font-size:10px;opacity:.7;margin:3px 0 8px}"
    + ".mbx-sk{border-left:3px solid #8b93a8;padding:4px 0 4px 8px;margin:6px 0}.mbx-sk.bu{border-color:#ff3b55}"
    + ".mbx-skh{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.mbx-skh i{font-style:normal;font-size:9.5px;font-weight:900;letter-spacing:.06em;background:#1d2336;color:#fff;border-radius:4px;padding:1px 6px}"
    + ".mbx-sk.bu .mbx-skh i{background:#ff3b55}.mbx-skh b{font-size:12.5px}.mbx-skh em{font-style:normal;font-size:10px;opacity:.7;margin-left:auto}"
    + ".mbx-sk p{margin:2px 0 0;font-size:11.5px}.mbx-abs{margin-top:8px}.mbx-abt{font-size:10.5px;font-weight:900;opacity:.75;margin-bottom:3px}"
    + ".mbx-ab{display:flex;gap:6px;font-size:11px;padding:2px 0;border-bottom:1px dashed rgba(120,130,160,.25)}.mbx-ab b{flex:none;min-width:88px}";
  function ensureCSS() {
    if (document.getElementById("mbxCSS")) return;
    const s = document.createElement("style"); s.id = "mbxCSS"; s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  window.MBStats = {
    VERSION, MAX_LV, MAX_AWK, ELEMS, ELEM, CLASSES, WEAPONS, BURST_NM, BURST_CD, S2_PAT,
    GEAR_PARTS, GEAR_PART, GEAR_FX, GEAR_FX_IDS, GEAR_FX_DESC, FX_TEXT, ADV, DIS,
    ready: core, hashN, elemMult, unit, statsAt, powerOf, gearSum, gearIsHigh, sharedOf, defMul, lvCurve,
    s2Text, burstText, detailHTML, ensureCSS, esc,
    roster() { try { return CHAR_IDS.filter((id) => CHARS[id]); } catch (e) { return []; } },
    /* ★ 旧 API（characters.html の古い XEVA キャラの詳細が呼ぶ）。XEVA の id を MagiBurst の id に読みかえて出す */
    statsHTML(c) {
      const id = (c && (XEVA_ALIAS_R[c.id] || c.id)) || "";
      if (!core() || !unit(id)) return "";
      ensureCSS();
      return '<div style="text-align:left;margin:8px 0">' + detailHTML(id, {}) + "</div>";
    },
  };
})();
