/* ══════════════════════════════════════════════════════════════
   MagiCounter — 計算の中身（相性・対策・編成分析・3体選出）
   ──────────────────────────────────────────────────────────────
   ★ ここには<b>画面を触るコードを1行も書かない</b>。
     画面は mc-ui.js、データは mc-data.js。
     こう分けておくと「点のつけかたを変えたい」ときに
     このファイルだけを読めばよい。
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const D = window.MC_DATA;

  /* ══════════ 保存（端末）══════════ */
  const KEY = "magicounter_v1";
  const LANG_KEY = "xeva_lang_v1";           /* ★ XEVARION 共通の言語キー */
  const DEFAULT_SAVE = {
    myTeams: [],          /* [{id,name,ids:[],memo,fav}] */
    curTeam: null,        /* いま編成画面で開いている id */
    oppIds: [],           /* 相手の6体（最後に入れたもの） */
    favs: [],             /* お気に入りポケモン id */
    recent: [],           /* よく見たポケモン（新しい順） */
    history: [],          /* 過去の選出分析 [{at, mine, opp, pick}] */
    seenOpp: [],          /* 過去に分析した相手編成 */
    rule: "double",       /* double / single */
    period: "30d",        /* 7d / 30d / all */
  };
  let SAVE = null;

  function load() {
    if (SAVE) return SAVE;
    let o = null;
    try { o = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { o = null; }
    SAVE = Object.assign({}, DEFAULT_SAVE, o || {});
    /* 配列が壊れていても落ちないようにそろえる */
    ["myTeams", "oppIds", "favs", "recent", "history", "seenOpp"].forEach((k) => {
      if (!Array.isArray(SAVE[k])) SAVE[k] = [];
    });
    return SAVE;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(load())); } catch (e) {}
    try { if (window.MagiCounterCloud && window.MagiCounterCloud.push) window.MagiCounterCloud.push(); } catch (e) {}
  }

  /* ══════════ 言語 ══════════ */
  function lang() {
    try { return localStorage.getItem(LANG_KEY) === "en" ? "en" : "ja"; } catch (e) { return "ja"; }
  }
  function setLang(v) {
    try { localStorage.setItem(LANG_KEY, v === "en" ? "en" : "ja"); } catch (e) {}
  }
  /* {ja,en} の形のものを今の言語で取り出す */
  function L(o) {
    if (o == null) return "";
    if (typeof o === "string") return o;
    return o[lang()] != null ? o[lang()] : (o.ja || "");
  }
  function pname(p) { return p ? (lang() === "en" ? p.en : p.ja) : ""; }
  function tname(k) { const t = D.TYPES.find((x) => x.k === k); return t ? (lang() === "en" ? t.en : t.ja) : k; }
  function tcolor(k) { const t = D.TYPES.find((x) => x.k === k); return t ? t.c : "#888"; }
  function aname(k) { const a = D.ABIL[k]; return a ? (lang() === "en" ? a.en : a.ja) : k; }
  function mname(k) { const m = D.MOVES[k]; return m ? (lang() === "en" ? m.en : m.ja) : k; }
  function iname(k) { const i = D.ITEMS[k]; return i ? (lang() === "en" ? i.en : i.ja) : k; }
  function rname(k) { const r = D.ROLES.find((x) => x.k === k); return r ? (lang() === "en" ? r.en : r.ja) : k; }

  /* ══════════════════════════════════════════════════════════════
     ① タイプ相性
     ══════════════════════════════════════════════════════════════ */
  /* 攻撃タイプ atk が、防御タイプの組 defTypes に何倍で入るか */
  function eff(atk, defTypes) {
    let m = 1;
    (defTypes || []).forEach((d) => { m *= D.CHART[atk][d]; });
    return m;
  }
  /* 特性を考えたうえでの倍率（ふゆう・もらいび・あついしぼう・ハードロック…） */
  function effWithAbility(atk, defTypes, abilityKey) {
    let m = eff(atk, defTypes);
    const a = D.ABIL[abilityKey];
    if (!a || !a.eff) return m;
    const [kind, arg] = a.eff.split(":");
    if (kind === "immune" && arg === atk) return 0;
    if (kind === "half" && String(arg).split(",").indexOf(atk) >= 0) return m * 0.5;
    if (kind === "weakhalf" && m > 1) return m * 0.75;
    return m;
  }
  /* そのポケモンの「受け」の一覧 { type: 倍率 } */
  function defenseTable(p, abilityKey) {
    const out = {};
    D.TK.forEach((t) => { out[t] = abilityKey ? effWithAbility(t, p.types, abilityKey) : eff(t, p.types); });
    return out;
  }
  /* そのポケモンが持つ攻撃タイプ（技から拾う。自分のタイプも「使える見込み」として足す） */
  function offenseTypes(p) {
    const set = new Set();
    (p.moves || []).forEach((mk) => {
      const m = D.MOVES[mk];
      if (m && m.c !== "status") set.add(m.t);
    });
    return [...set];
  }
  /* 攻撃側の一覧 { type: そのタイプの技で相手に何倍出せるか } は
     「相手のタイプ」が要るので、ここでは<b>技のタイプの集合</b>だけを返す */

  /* ══════════════════════════════════════════════════════════════
     ② 対面（1体 vs 1体）の評価
     ──────────────────────────────────────────────────────────────
     ★ 単純なタイプ相性だけでは足りないので、次の4つを合わせて点にする。
       ・攻め   … 自分の技で相手に出せる<b>いちばん高い倍率</b>
       ・受け   … 相手の技で自分が受ける<b>いちばん高い倍率</b>
       ・速さ   … 素早さ種族値の差（先に動けるか）
       ・地力   … 種族値合計の差（ごくわずかに効かせる）
     ★ 返す score は <b>-100 〜 +100</b>。プラスなら自分が有利。
     ══════════════════════════════════════════════════════════════ */
  const MULT_SCORE = { 0: -2, 0.25: -1.4, 0.5: -0.8, 1: 0, 2: 1.2, 4: 2.0 };
  function multScore(m) {
    if (m === 0) return -2;
    if (m <= 0.25) return -1.4;
    if (m <= 0.5) return -0.8;
    if (m < 2) return 0;
    if (m < 4) return 1.2;
    return 2.0;
  }
  function bestOffense(atkPoke, defPoke) {
    let best = 0, bestType = null;
    offenseTypes(atkPoke).forEach((t) => {
      const m = effWithAbility(t, defPoke.types, (defPoke.abilities || [])[0]);
      if (m > best) { best = m; bestType = t; }
    });
    /* 技を1つも持っていないときは、自分のタイプで殴れると仮定する */
    if (bestType == null) {
      atkPoke.types.forEach((t) => {
        const m = effWithAbility(t, defPoke.types, (defPoke.abilities || [])[0]);
        if (m > best) { best = m; bestType = t; }
      });
    }
    return { mult: best, type: bestType };
  }
  function matchup(mine, opp) {
    const off = bestOffense(mine, opp);
    const inc = bestOffense(opp, mine);
    const spd = mine.base.spe - opp.base.spe;
    const bst = mine.bst - opp.bst;
    /* 点の重み。攻めと受けがいちばん重い。 */
    let s = multScore(off.mult) * 26 - multScore(inc.mult) * 26;
    s += Math.max(-14, Math.min(14, spd * 0.22));
    s += Math.max(-8, Math.min(8, bst * 0.03));
    s = Math.max(-100, Math.min(100, Math.round(s)));
    let rank = "even";
    if (s >= 45) rank = "greatwin";
    else if (s >= 15) rank = "win";
    else if (s <= -45) rank = "greatlose";
    else if (s <= -15) rank = "lose";
    return { score: s, rank, off, inc, faster: spd > 0, spd };
  }
  const RANK_TXT = {
    greatwin:  { ja: "非常に有利", en: "Strongly favored", c: "#12a06a" },
    win:       { ja: "有利",       en: "Favored",          c: "#3fb27f" },
    even:      { ja: "五分",       en: "Even",             c: "#8b93a8" },
    lose:      { ja: "不利",       en: "Unfavored",        c: "#e08a3f" },
    greatlose: { ja: "非常に不利", en: "Strongly unfavored", c: "#e0405e" },
  };

  /* ══════════════════════════════════════════════════════════════
     ③ 対策（このポケモンに強いのは誰か）
     ══════════════════════════════════════════════════════════════ */
  function counters(targetId, pool, limit) {
    const target = D.BY_ID[targetId];
    if (!target) return [];
    const list = (pool && pool.length ? pool : D.DEX.map((p) => p.id))
      .map((id) => D.BY_ID[id]).filter(Boolean)
      .filter((p) => p.id !== targetId);
    const out = list.map((p) => {
      const m = matchup(p, target);
      /* 環境で実際に使われているかも少しだけ足す（机上だけの答えにしないため） */
      const envBonus = Math.min(10, (p.usage || 0) * 0.5);
      return { p, m, score: m.score + envBonus, reasons: reasonsFor(p, target, m) };
    });
    out.sort((a, b) => b.score - a.score);
    return out.slice(0, limit || 12);
  }
  function reasonsFor(p, target, m) {
    const r = [];
    if (m.off.mult >= 2) {
      r.push({ ja: tname(m.off.type) + "タイプの技が ×" + m.off.mult + " で入る",
               en: tname(m.off.type) + " hits for ×" + m.off.mult });
    }
    if (m.inc.mult <= 0.5) {
      r.push({ ja: "相手の主な攻撃（" + tname(m.inc.type) + "）を ×" + m.inc.mult + " に抑えられる",
               en: "Resists its main attack (" + tname(m.inc.type) + ") at ×" + m.inc.mult });
    }
    if (m.inc.mult === 0) {
      r.push({ ja: "相手の主な攻撃（" + tname(m.inc.type) + "）が<b>通らない</b>",
               en: "Completely immune to " + tname(m.inc.type) });
    }
    if (m.faster && m.spd >= 15) {
      r.push({ ja: "素早さで上をとれる（+" + m.spd + "）", en: "Outspeeds it (+" + m.spd + ")" });
    }
    if ((p.usage || 0) >= 8) {
      r.push({ ja: "環境で実際によく使われている（使用率 " + p.usage + "%）",
               en: "Common in the current meta (" + p.usage + "% usage)" });
    }
    if (!r.length) {
      r.push({ ja: "総合的な地力で押し切れる", en: "Wins on raw stats" });
    }
    return r;
  }

  /* ══════════════════════════════════════════════════════════════
     ④ 編成の分析（自分の6体）
     ══════════════════════════════════════════════════════════════ */
  function teamAnalysis(ids) {
    const team = ids.map((id) => D.BY_ID[id]).filter(Boolean);
    const weak = {}, resist = {}, immune = {};
    D.TK.forEach((t) => { weak[t] = []; resist[t] = []; immune[t] = []; });
    team.forEach((p) => {
      const tbl = defenseTable(p, (p.abilities || [])[0]);
      D.TK.forEach((t) => {
        if (tbl[t] === 0) immune[t].push(p);
        else if (tbl[t] > 1) weak[t].push(p);
        else if (tbl[t] < 1) resist[t].push(p);
      });
    });
    /* 共通弱点＝2体以上が弱点にしているタイプ */
    const common = D.TK.filter((t) => weak[t].length >= 2)
      .sort((a, b) => weak[b].length - weak[a].length);
    /* 攻撃範囲 */
    const offSet = new Set();
    team.forEach((p) => offenseTypes(p).forEach((t) => offSet.add(t)));
    const offense = [...offSet];
    /* その攻撃範囲で、環境上位のどれだけに ×2 以上を出せるか */
    const meta = D.DEX.slice().sort((a, b) => b.usage - a.usage).slice(0, 30);
    const covered = meta.filter((mp) => offense.some((t) => eff(t, mp.types) >= 2));
    /* 役割の偏り */
    const roleN = {};
    D.ROLES.forEach((r) => { roleN[r.k] = 0; });
    team.forEach((p) => (p.roles || []).forEach((r) => { roleN[r] = (roleN[r] || 0) + 1; }));
    const missingRoles = D.ROLES.filter((r) => !roleN[r.k]).map((r) => r.k);
    /* タイプバランス */
    const typeN = {};
    team.forEach((p) => p.types.forEach((t) => { typeN[t] = (typeN[t] || 0) + 1; }));
    /* 速さの分布 */
    const speeds = team.map((p) => p.base.spe).sort((a, b) => b - a);
    return {
      team, weak, resist, immune, common, offense,
      coverage: { covered: covered.length, total: meta.length, missed: meta.filter((mp) => !covered.includes(mp)) },
      roleN, missingRoles, typeN, speeds,
      avgSpe: team.length ? Math.round(speeds.reduce((a, b) => a + b, 0) / team.length) : 0,
    };
  }
  /* 共通弱点を埋められるポケモンを提案する */
  function suggestForTeam(ids, limit) {
    const a = teamAnalysis(ids);
    if (!a.common.length && !a.missingRoles.length) return [];
    const have = new Set(ids);
    const scored = D.DEX.filter((p) => !have.has(p.id)).map((p) => {
      const tbl = defenseTable(p, (p.abilities || [])[0]);
      let s = 0;
      const why = [];
      a.common.forEach((t) => {
        if (tbl[t] === 0) { s += 22; why.push({ ja: tname(t) + "を<b>無効</b>にできる", en: "Immune to " + tname(t) }); }
        else if (tbl[t] < 1) { s += 14; why.push({ ja: tname(t) + "を半減できる", en: "Resists " + tname(t) }); }
      });
      a.missingRoles.forEach((r) => {
        if ((p.roles || []).indexOf(r) >= 0) { s += 8; why.push({ ja: rname(r) + "の役割を埋められる", en: "Fills the " + rname(r) + " role" }); }
      });
      /* 足りない攻撃タイプ */
      const newT = offenseTypes(p).filter((t) => a.offense.indexOf(t) < 0);
      if (newT.length) { s += newT.length * 4; why.push({ ja: "攻撃範囲に " + newT.map(tname).join("・") + " が加わる", en: "Adds " + newT.map(tname).join(", ") + " coverage" }); }
      s += Math.min(10, (p.usage || 0) * 0.4);
      return { p, score: s, why };
    }).filter((x) => x.score > 0);
    scored.sort((a2, b2) => b2.score - a2.score);
    return scored.slice(0, limit || 8);
  }

  /* ══════════════════════════════════════════════════════════════
     ⑤ 相手編成の分析
     ══════════════════════════════════════════════════════════════ */
  function oppAnalysis(ids) {
    const team = ids.map((id) => D.BY_ID[id]).filter(Boolean);
    /* 何タイプの技が何体に刺さるか */
    const hit = D.TK.map((t) => {
      const n = team.filter((p) => effWithAbility(t, p.types, (p.abilities || [])[0]) >= 2).length;
      const blocked = team.filter((p) => effWithAbility(t, p.types, (p.abilities || [])[0]) === 0).length;
      return { t, n, blocked };
    }).sort((a, b) => b.n - a.n || a.blocked - b.blocked);
    /* 相手が撃ってくる攻撃タイプの傾向 */
    const theirOff = {};
    team.forEach((p) => offenseTypes(p).forEach((t) => { theirOff[t] = (theirOff[t] || 0) + 1; }));
    const theirOffList = Object.keys(theirOff).map((t) => ({ t, n: theirOff[t] })).sort((a, b) => b.n - a.n);
    /* 注意するポケモン＝使用率・勝率・素早さから */
    const danger = team.slice().sort((a, b) =>
      (b.usage * 1.2 + (b.win - 50) * 2 + b.base.spe * 0.08) -
      (a.usage * 1.2 + (a.win - 50) * 2 + a.base.spe * 0.08)).slice(0, 3);
    const fast = team.filter((p) => p.base.spe >= 100);
    return { team, hit, theirOffList, danger, fast };
  }

  /* ══════════════════════════════════════════════════════════════
     ⑥ 3体選出シミュレーター（このアプリのいちばんの機能）
     ──────────────────────────────────────────────────────────────
     自分の最大6体から3体を選ぶ組み合わせは最大 20 通りしかないので、
     <b>ぜんぶ数えて</b>いちばん良い並びを出す（探索の工夫はいらない）。

     1つの組の点は次の合計:
       A 対面の合計       … 3体 × 相手6体の matchup を平均（いちばん重い）
       B 有利な対面の数   … +2 点／不利な対面の数 -2 点
       C 相手の主要攻撃への耐性 … 相手がよく撃つタイプを半減・無効にできる数
       D 攻撃範囲         … 相手6体のうち ×2 以上を出せる相手の数
       E 3体の補完        … 3体の弱点が<b>重なっていない</b>ほど高い
       F 交代の対応力     … 誰かが不利なとき、ほかの2体が受けられるか
       G 環境データ       … 使用率・勝率をごく軽く
     ══════════════════════════════════════════════════════════════ */
  function combos3(ids) {
    const out = [];
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++)
        for (let k = j + 1; k < ids.length; k++) out.push([ids[i], ids[j], ids[k]]);
    return out;
  }
  function evaluatePick(pickIds, oppIds, mode) {
    const pick = pickIds.map((id) => D.BY_ID[id]).filter(Boolean);
    const opp = oppIds.map((id) => D.BY_ID[id]).filter(Boolean);
    if (!pick.length || !opp.length) return null;

    /* A/B 対面 */
    let sum = 0, winN = 0, loseN = 0;
    const grid = [];
    pick.forEach((mp) => {
      const row = [];
      opp.forEach((op) => {
        const m = matchup(mp, op);
        row.push(m);
        sum += m.score;
        if (m.score >= 15) winN++;
        if (m.score <= -15) loseN++;
      });
      grid.push(row);
    });
    const avg = sum / (pick.length * opp.length);

    /* C 相手の主要攻撃タイプへの耐性 */
    const theirOff = {};
    opp.forEach((p) => offenseTypes(p).forEach((t) => { theirOff[t] = (theirOff[t] || 0) + 1; }));
    const mainTypes = Object.keys(theirOff).sort((a, b) => theirOff[b] - theirOff[a]).slice(0, 5);
    let resistPts = 0;
    mainTypes.forEach((t) => {
      pick.forEach((p) => {
        const m = effWithAbility(t, p.types, (p.abilities || [])[0]);
        if (m === 0) resistPts += 3;
        else if (m < 1) resistPts += 1.6;
        else if (m > 1) resistPts -= 1.4;
      });
    });

    /* D 攻撃範囲 */
    const offSet = new Set();
    pick.forEach((p) => offenseTypes(p).forEach((t) => offSet.add(t)));
    const offArr = [...offSet];
    const hitN = opp.filter((op) => offArr.some((t) => effWithAbility(t, op.types, (op.abilities || [])[0]) >= 2)).length;

    /* E 補完（弱点の重なり） */
    let overlap = 0;
    D.TK.forEach((t) => {
      const n = pick.filter((p) => effWithAbility(t, p.types, (p.abilities || [])[0]) > 1).length;
      if (n >= 2) overlap += (n - 1);
    });

    /* F 交代の対応力：不利な対面ごとに、ほかの2体が「有利」で受けられるか */
    let cover = 0, uncovered = [];
    opp.forEach((op, oi) => {
      const scores = pick.map((mp, mi) => grid[mi][oi].score);
      const best = Math.max.apply(null, scores);
      if (best >= 15) cover++;
      else if (best <= -15) uncovered.push(op);
    });

    /* G 環境 */
    const env = pick.reduce((a, p) => a + (p.usage || 0) * 0.12 + ((p.win || 50) - 50) * 0.5, 0);

    /* 合計（100点満点に丸める） */
    let raw = avg * 0.85 + (winN - loseN) * 2.0 + resistPts * 1.5
      + hitN * 3.2 - overlap * 3.0 + cover * 4.0 + env;
    /* ★ 実測すると raw はおよそ <b>-20～+80</b>になる。
       0.75 だと 20通りのうち半分が 100 点にはりついて<b>差が見えなくなる</b>ので、
       0.55 にして、ひとつだけ抜けて良い組が上に来るようにしてある。 */
    const score = Math.max(0, Math.min(100, Math.round(50 + raw * 0.55)));

    /* 型ごとの点（攻撃型・安定型） */
    const atkScore = Math.max(0, Math.min(100, Math.round(
      50 + (avg * 0.5 + winN * 3.6 + hitN * 5.0 + pick.reduce((a, p) => a + p.base.spe, 0) * 0.06 - 18) * 0.55)));
    const defScore = Math.max(0, Math.min(100, Math.round(
      50 + (avg * 0.5 + resistPts * 3.0 + cover * 6.0 - overlap * 4.0
        + pick.reduce((a, p) => a + p.base.hp + p.base.def + p.base.spd, 0) * 0.02 - 20) * 0.55)));

    return {
      ids: pickIds, pick, grid, score, atkScore, defScore,
      avg: Math.round(avg), winN, loseN, hitN, cover, overlap,
      uncovered, mainTypes, offense: offArr,
      mode: mode || "balance",
    };
  }
  /* おすすめ選出（総合／攻撃型／安定型） */
  function bestPicks(myIds, oppIds) {
    const combos = combos3(myIds.filter(Boolean));
    if (!combos.length || !oppIds.filter(Boolean).length) return null;
    const evals = combos.map((c) => evaluatePick(c, oppIds)).filter(Boolean);
    if (!evals.length) return null;
    const byBalance = evals.slice().sort((a, b) => b.score - a.score);
    const byAtk = evals.slice().sort((a, b) => b.atkScore - a.atkScore);
    const byDef = evals.slice().sort((a, b) => b.defScore - a.defScore);
    return {
      balance: byBalance[0], atk: byAtk[0], def: byDef[0],
      all: byBalance.slice(0, 10),
    };
  }
  /* 「なぜこの3体か」の説明カード */
  function pickReasons(ev) {
    if (!ev) return [];
    const out = [];
    ev.pick.forEach((mp, mi) => {
      const wins = ev.grid[mi].map((m, oi) => ({ m, op: D.BY_ID[ev.gridOpp ? ev.gridOpp[oi] : null] }));
      const n = ev.grid[mi].filter((m) => m.score >= 15).length;
      const bad = ev.grid[mi].filter((m) => m.score <= -15).length;
      if (n) out.push({
        p: mp, kind: "good",
        ja: pname(mp) + " は相手の <b>" + n + "体</b>に対して有利です",
        en: pname(mp) + " is favored into <b>" + n + "</b> of their Pokémon",
      });
      if (bad) {
        /* その苦手を、ほかの2体がカバーできているか */
        const covered = ev.grid[mi].every((m, oi) =>
          m.score > -15 || ev.grid.some((row, mj) => mj !== mi && row[oi].score >= 15));
        out.push({
          p: mp, kind: covered ? "cover" : "warn",
          ja: covered
            ? pname(mp) + " が苦手な相手は、<b>ほかの2体でカバーできています</b>"
            : pname(mp) + " が苦手な相手を<b>カバーしきれていません</b>（交代先に注意）",
          en: covered
            ? "What " + pname(mp) + " struggles with is <b>covered by the other two</b>"
            : "What " + pname(mp) + " struggles with is <b>not covered</b>",
        });
      }
    });
    if (ev.mainTypes && ev.mainTypes.length) {
      const t = ev.mainTypes[0];
      const n = ev.pick.filter((p) => effWithAbility(t, p.types, (p.abilities || [])[0]) < 1).length;
      if (n) out.push({
        kind: "good",
        ja: "相手の主な攻撃タイプ <b>" + tname(t) + "</b> を <b>" + n + "体</b>が半減以下に抑えられます",
        en: "<b>" + n + "</b> of them resist their main attacking type <b>" + tname(t) + "</b>",
      });
    }
    if (ev.hitN) out.push({
      kind: "good",
      ja: "この3体の攻撃範囲は、相手 <b>" + ev.hitN + "体</b>に こうかばつぐん を出せます",
      en: "Their coverage hits <b>" + ev.hitN + "</b> of the opposing team super-effectively",
    });
    if (ev.overlap >= 2) out.push({
      kind: "warn",
      ja: "3体の弱点が <b>" + ev.overlap + "か所</b>重なっています（同じタイプでまとめて崩されやすい）",
      en: "Their weaknesses overlap in <b>" + ev.overlap + "</b> places",
    });
    if (ev.uncovered && ev.uncovered.length) out.push({
      kind: "warn",
      ja: "<b>" + ev.uncovered.map(pname).join("・") + "</b> に対して有利をとれる子がいません",
      en: "No favorable matchup against <b>" + ev.uncovered.map(pname).join(", ") + "</b>",
    });
    return out;
  }

  /* ══════════════════════════════════════════════════════════════
     ⑦ 検索
     ══════════════════════════════════════════════════════════════ */
  function search(q) {
    const f = Object.assign({ text: "", types: [], weak: [], resist: [], ability: "", roles: [], gen: 0,
      usageMin: 0, sort: "usage" }, q || {});
    const txt = String(f.text || "").trim().toLowerCase();
    let list = D.DEX.slice();
    if (txt) list = list.filter((p) =>
      p.ja.toLowerCase().indexOf(txt) >= 0 || p.en.toLowerCase().indexOf(txt) >= 0 || p.id.indexOf(txt) >= 0);
    if (f.types.length) list = list.filter((p) => f.types.every((t) => p.types.indexOf(t) >= 0));
    if (f.weak.length) list = list.filter((p) => f.weak.every((t) => eff(t, p.types) > 1));
    if (f.resist.length) list = list.filter((p) => f.resist.every((t) => eff(t, p.types) < 1));
    if (f.ability) list = list.filter((p) => (p.abilities || []).indexOf(f.ability) >= 0);
    if (f.roles.length) list = list.filter((p) => f.roles.every((r) => (p.roles || []).indexOf(r) >= 0));
    if (f.gen) list = list.filter((p) => p.gen === f.gen);
    if (f.usageMin) list = list.filter((p) => (p.usage || 0) >= f.usageMin);
    const S = {
      usage: (a, b) => b.usage - a.usage,
      win:   (a, b) => b.win - a.win,
      trend: (a, b) => b.trend - a.trend,
      bst:   (a, b) => b.bst - a.bst,
      spe:   (a, b) => b.base.spe - a.base.spe,
      name:  (a, b) => (lang() === "en" ? a.en.localeCompare(b.en) : a.ja.localeCompare(b.ja)),
    };
    list.sort(S[f.sort] || S.usage);
    return list;
  }

  /* ランキング */
  function ranking(kind, limit) {
    const l = D.DEX.slice();
    if (kind === "win") l.sort((a, b) => b.win - a.win);
    else if (kind === "rise") l.sort((a, b) => b.trend - a.trend);
    else if (kind === "fall") l.sort((a, b) => a.trend - b.trend);
    else if (kind === "hot") l.sort((a, b) => (b.trend * 3 + b.usage * 0.4) - (a.trend * 3 + a.usage * 0.4));
    else l.sort((a, b) => b.usage - a.usage);
    return l.slice(0, limit || 30);
  }

  /* 相性の良い相棒（弱点を補い合う） */
  function partners(id, limit) {
    const p = D.BY_ID[id]; if (!p) return [];
    const mine = defenseTable(p, (p.abilities || [])[0]);
    const myWeak = D.TK.filter((t) => mine[t] > 1);
    const myOff = offenseTypes(p);
    const out = D.DEX.filter((q) => q.id !== id).map((q) => {
      const tbl = defenseTable(q, (q.abilities || [])[0]);
      let s = 0;
      myWeak.forEach((t) => { if (tbl[t] === 0) s += 8; else if (tbl[t] < 1) s += 5; });
      const qOff = offenseTypes(q);
      s += qOff.filter((t) => myOff.indexOf(t) < 0).length * 2;
      s += Math.min(8, (q.usage || 0) * 0.4);
      return { p: q, score: s };
    });
    out.sort((a, b) => b.score - a.score);
    return out.slice(0, limit || 6);
  }
  /* この子が苦手にしている相手（＝対策されやすい相手） */
  function checkedBy(id, limit) {
    return counters(id, null, limit || 6);
  }

  /* ══════════════════════════════════════════════════════════════
     ⑧ 環境データの取り込み（オンラインに戻ったとき）
     ══════════════════════════════════════════════════════════════ */
  const META_KEY = "magicounter_meta_v1";
  const meta = {
    at: 0, source: "built-in",
    /* 端末に保存してある環境データを、起動時に当てる */
    applyStored() {
      let o = null;
      try { o = JSON.parse(localStorage.getItem(META_KEY) || "null"); } catch (e) { o = null; }
      if (!o || !o.mons) return false;
      this.apply(o);
      return true;
    },
    apply(o) {
      if (!o) return;
      if (o.mons) {
        Object.keys(o.mons).forEach((id) => {
          const p = D.BY_ID[id]; if (!p) return;
          const v = o.mons[id];
          D.META_FIELDS.forEach((f) => { if (v[f] != null) p[f] = v[f]; });
        });
      }
      if (Array.isArray(o.teams) && o.teams.length) {
        D.TEAMS.length = 0;
        o.teams.forEach((t) => D.TEAMS.push(t));
      }
      this.at = o.at || Date.now();
      this.updated = o.updated || "";        /* データそのものの日付 */
      this.source = o.source || "meta.json";
    },
    /* オンラインなら取りに行く。取れなければ何もしない（オフラインでも壊れない）。 */
    refresh() {
      if (!navigator.onLine) return Promise.resolve(false);
      return fetch("data/meta.json", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((o) => {
          if (!o) return false;
          o.at = Date.now();
          try { localStorage.setItem(META_KEY, JSON.stringify(o)); } catch (e) {}
          this.apply(o);
          return true;
        })
        .catch(() => false);
    },
  };

  /* ══════════════════════════════════════════════════════════════
     ⑨ マイ編成
     ══════════════════════════════════════════════════════════════ */
  function newTeam(name) {
    const s = load();
    const id = "tm" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    s.myTeams.unshift({ id, name: name || (lang() === "en" ? "New team" : "新しい編成"), ids: [], memo: "", fav: false });
    s.curTeam = id;
    save();
    return id;
  }
  function getTeam(id) { return load().myTeams.find((t) => t.id === id) || null; }
  function delTeam(id) {
    const s = load();
    s.myTeams = s.myTeams.filter((t) => t.id !== id);
    if (s.curTeam === id) s.curTeam = s.myTeams.length ? s.myTeams[0].id : null;
    save();
  }
  function toggleFav(id) {
    const s = load();
    const i = s.favs.indexOf(id);
    if (i >= 0) s.favs.splice(i, 1); else s.favs.push(id);
    save();
    return i < 0;
  }
  function touchRecent(id) {
    const s = load();
    const i = s.recent.indexOf(id);
    if (i >= 0) s.recent.splice(i, 1);
    s.recent.unshift(id);
    s.recent = s.recent.slice(0, 24);
    save();
  }
  function pushHistory(mine, opp, pickIds, score) {
    const s = load();
    s.history.unshift({ at: Date.now(), mine: mine.slice(), opp: opp.slice(), pick: pickIds.slice(), score });
    s.history = s.history.slice(0, 40);
    /* 過去に分析した相手編成 */
    const key = opp.slice().sort().join(",");
    if (key && !s.seenOpp.some((o) => o.key === key)) {
      s.seenOpp.unshift({ key, ids: opp.slice(), at: Date.now() });
      s.seenOpp = s.seenOpp.slice(0, 30);
    }
    save();
  }

  /* ══════════ 公開 ══════════ */
  window.MC = {
    D, load, save, lang, setLang, L,
    pname, tname, tcolor, aname, mname, iname, rname,
    eff, effWithAbility, defenseTable, offenseTypes,
    matchup, RANK_TXT, bestOffense,
    counters, teamAnalysis, suggestForTeam, oppAnalysis,
    combos3, evaluatePick, bestPicks, pickReasons,
    search, ranking, partners, checkedBy,
    meta,
    newTeam, getTeam, delTeam, toggleFav, touchRecent, pushHistory,
  };
})();
