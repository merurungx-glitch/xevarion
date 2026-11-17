/* ============================================================
   MagiYacht — ルール（点のつけ方）と CPU の考え方
   ★★ 2026-11-18 新作。ご指定「ルールはスイッチに実装されているもの（世界のアソビ大全51 の『ヨット』）と同じ」
   ------------------------------------------------------------
   ・1回の番：5個のサイコロを投げる → 残したいものをキープしてふり直す（1回の番で3回まで）→ 欄を1つえらんで点を書く。
   ・欄は12（全員が12の欄をうめたら終わり）。どの欄も1回だけ。役にならない欄をえらぶと 0点（捨てる）。
     上の段：エース〜シックス … その目の合計
     ボーナス … 上の段（エース〜シックス）の合計が 63 以上で +35
     下の段：チョイス … 5個の合計（いつでも）
             フォーダイス … 同じ目が4つ以上 → 5個の合計
             フルハウス … 同じ目3つ＋同じ目2つ（5つ同じでもよい）→ 5個の合計
             S.ストレート … 4つ以上の目が並ぶ → 15点
             B.ストレート … 5つの目が並ぶ → 30点
             ヨット … 5つとも同じ目 → 50点（2回目以降のおまけ点は無し）
     合計 … 小計以外の全部（上の段＋ボーナス＋下の段）
   ・CPU（よわい・ふつう・つよい）：つよいは、この番の残りのふり直しを全部数えて「どれを残すと得か」を出す。
   ============================================================ */
(function (root) {
  'use strict';
  const MY = root.MY = root.MY || {};

  const BONUS_NEED = 63, BONUS_PTS = 35;
  /* 欄（並び＝スコア表の並び）。ex＝あそび方の例のサイコロ */
  const CATS = [
    { id: 'n1', name: 'エース',   face: 1, up: true, desc: '1の目の合計', ex: [1, 1, 1, 4, 6] },
    { id: 'n2', name: 'デュース', face: 2, up: true, desc: '2の目の合計', ex: [2, 2, 3, 5, 2] },
    { id: 'n3', name: 'トレイ',   face: 3, up: true, desc: '3の目の合計', ex: [3, 3, 3, 5, 2] },
    { id: 'n4', name: 'フォー',   face: 4, up: true, desc: '4の目の合計', ex: [4, 4, 4, 2, 6] },
    { id: 'n5', name: 'ファイブ', face: 5, up: true, desc: '5の目の合計', ex: [5, 5, 1, 5, 3] },
    { id: 'n6', name: 'シックス', face: 6, up: true, desc: '6の目の合計', ex: [6, 6, 6, 6, 2] },
    { id: 'ch', name: 'チョイス',     desc: '5個の合計（いつでも書ける）',         ex: [6, 5, 5, 4, 6] },
    { id: 'fk', name: 'フォーダイス', desc: '同じ目が4つ以上で、5個の合計',        ex: [5, 5, 5, 5, 2] },
    { id: 'fh', name: 'フルハウス',   desc: '3つ＋2つ（5つ同じも可）で、5個の合計', ex: [6, 6, 6, 3, 3] },
    { id: 'ss', name: 'S.ストレート', desc: '4つの目が並ぶと 15点',                ex: [2, 3, 4, 5, 5] },
    { id: 'bs', name: 'B.ストレート', desc: '5つの目が並ぶと 30点',                ex: [2, 3, 4, 5, 6] },
    { id: 'ya', name: 'ヨット',       desc: '5つとも同じ目で 50点',                ex: [4, 4, 4, 4, 4] }
  ];
  const CAT = {}; CATS.forEach((c, i) => { c.i = i; CAT[c.id] = c; });
  const UPPER = CATS.filter((c) => c.up).map((c) => c.id);
  const LOWER = CATS.filter((c) => !c.up).map((c) => c.id);
  const ROUNDS = CATS.length;   /* 12 */

  function counts(d) { const c = [0, 0, 0, 0, 0, 0, 0]; for (let i = 0; i < d.length; i++) c[d[i]]++; return c; }
  function sum(d) { let s = 0; for (let i = 0; i < d.length; i++) s += d[i]; return s; }
  function runOf(c) { let best = 0, cur = 0; for (let v = 1; v <= 6; v++) { if (c[v]) { cur++; if (cur > best) best = cur; } else cur = 0; } return best; }

  /* その欄に書いたときの点（c＝目ごとの数 [0,n1..n6]・s＝5個の合計） */
  function scoreC(id, c, s) {
    switch (id) {
      case 'n1': return c[1];
      case 'n2': return c[2] * 2;
      case 'n3': return c[3] * 3;
      case 'n4': return c[4] * 4;
      case 'n5': return c[5] * 5;
      case 'n6': return c[6] * 6;
      case 'ch': return s;
      case 'fk': for (let v = 1; v <= 6; v++) if (c[v] >= 4) return s; return 0;
      case 'fh': {
        let three = false, two = false;
        for (let v = 1; v <= 6; v++) { if (c[v] === 5) return s; if (c[v] === 3) three = true; else if (c[v] === 2) two = true; }
        return three && two ? s : 0;
      }
      case 'ss': return runOf(c) >= 4 ? 15 : 0;
      case 'bs': return runOf(c) >= 5 ? 30 : 0;
      case 'ya': for (let v = 1; v <= 6; v++) if (c[v] === 5) return 50; return 0;
    }
    return 0;
  }
  function score(id, d) { return scoreC(id, counts(d), sum(d)); }

  /* その欄で「点になるサイコロ」（光らせる用・何個目か） */
  function usedDice(id, d) {
    const c = counts(d), out = [], cat = CAT[id];
    if (!cat || !d || d.length !== 5 || !score(id, d)) return out;
    if (cat.up) { d.forEach((v, i) => { if (v === cat.face) out.push(i); }); return out; }
    if (id === 'ss' || id === 'bs') {
      let bestA = 1, bestL = 0, cur = 0;
      for (let v = 1; v <= 6; v++) { if (c[v]) { cur++; if (cur > bestL) { bestL = cur; bestA = v - cur + 1; } } else cur = 0; }
      for (let v = bestA; v < bestA + bestL; v++) { const i = d.findIndex((x, k) => x === v && out.indexOf(k) < 0); if (i >= 0) out.push(i); }
      return out;
    }
    if (id === 'fk') { let f = 0; for (let v = 1; v <= 6; v++) if (c[v] >= 4) f = v; return d.map((v, i) => i); }
    return d.map((v, i) => i);
  }

  /* 表の数字（sc＝{欄: 点}） */
  function totals(sc) {
    sc = sc || {};
    let up = 0, low = 0, upN = 0;
    UPPER.forEach((k) => { if (sc[k] != null) { up += sc[k]; upN++; } });
    LOWER.forEach((k) => { if (sc[k] != null) low += sc[k]; });
    const bonus = up >= BONUS_NEED ? BONUS_PTS : 0;
    let maxLeft = 0; UPPER.forEach((k) => { if (sc[k] == null) maxLeft += CAT[k].face * 5; });
    /* got＝もらえた・lost＝もう届かない・open＝まだわからない */
    const bonusState = bonus ? 'got' : (upN === 6 || up + maxLeft < BONUS_NEED) ? 'lost' : 'open';
    let filled = 0; CATS.forEach((c) => { if (sc[c.id] != null) filled++; });
    return { up, low, bonus, total: up + bonus + low, filled, bonusState, need: Math.max(0, BONUS_NEED - up) };
  }
  function openCats(sc) { return CATS.filter((c) => !sc || sc[c.id] == null).map((c) => c.id); }

  /* ══════════════════════════════════════════════════════════════
     CPU
     ・5個の目の組み合わせ（252通り）と、n 個ふったときの出かたを先に数えておく。
       目ごとの数を6進数の数（キー）にすると「残したもの＋ふったもの」がキーの足し算になる（どの目も5以下なので繰り上がらない）。
     ・欄の値打ち＝点 − その欄のふつうの点（PAR）＋ボーナスへの近さ。
     ・つよい：のこり2回ぶんを全部数える。ふつう：のこり1回ぶんだけ＋ときどき迷う。よわい：いちばん多い目を残す。
     ══════════════════════════════════════════════════════════════ */
  const PAR = { n1: 2.1, n2: 5.2, n3: 8.4, n4: 11.8, n5: 15.0, n6: 18.3, ch: 22.0, fk: 12.5, fh: 15.5, ss: 12.5, bs: 19.0, ya: 16.0 };
  const keyN = (c) => c[1] + c[2] * 6 + c[3] * 36 + c[4] * 216 + c[5] * 1296 + c[6] * 7776;
  const ROLL = [];   /* ROLL[n]＝n 個ふったときの出かた [{ c, k, p }] */
  (function () {
    const fact = [1, 1, 2, 6, 24, 120];
    for (let n = 0; n <= 5; n++) {
      const list = [], c = [0, 0, 0, 0, 0, 0, 0];
      (function rec(v, left) {
        if (v === 6) { c[6] = left; let w = fact[n]; for (let k = 1; k <= 6; k++) w /= fact[c[k]]; const cc = c.slice(); list.push({ c: cc, k: keyN(cc), p: w / Math.pow(6, n) }); return; }
        for (let k = 0; k <= left; k++) { c[v] = k; rec(v + 1, left - k); }
      })(1, n);
      ROLL.push(list);
    }
  })();
  const ALL5 = ROLL[5];   /* 252 */
  /* 残し方（目ごとの数の部分集合）{ c, k, n }（n＝残す個数） */
  function keepsOf(c) {
    const out = [], k = [0, 0, 0, 0, 0, 0, 0];
    (function rec(v, n) {
      if (v === 7) { const kc = k.slice(); out.push({ c: kc, k: keyN(kc), n }); return; }
      for (let x = 0; x <= c[v]; x++) { k[v] = x; rec(v + 1, n + x); }
    })(1, 0);
    return out;
  }
  function valueFn(sc) {
    const open = openCats(sc), t = totals(sc);
    const bonusLive = t.bonusState === 'open';
    const lateK = open.length <= 3 ? 0.5 : 1;   /* 終わりが近いと PAR を軽く（残りの欄はどうせ全部うめる） */
    return function (c) {
      let s = 0; for (let v = 1; v <= 6; v++) s += c[v] * v;
      let best = -1e9, bestId = open[0];
      for (let i = 0; i < open.length; i++) {
        const id = open[i], pts = scoreC(id, c, s);
        let val = pts - PAR[id] * lateK;
        if (bonusLive && CAT[id].up) {
          const diff = pts - 3 * CAT[id].face;
          val += t.up + pts >= BONUS_NEED ? 16 + diff * 0.3 : diff * 0.85;
        }
        if (val > best) { best = val; bestId = id; }
      }
      return { val: best, id: bestId };
    };
  }

  /* その人のこの番の読み。decide(c, rollsLeft, depth)＝{ keep（目ごとの数）, ev } */
  function planner(sc) {
    const vf = valueFn(sc);
    const V0 = new Float64Array(46656);
    ALL5.forEach((r) => { V0[r.k] = vf(r.c).val; });
    let V1 = null;
    const ev = (kp, table) => { const L = ROLL[5 - kp.n]; let e = 0; for (let i = 0; i < L.length; i++) e += L[i].p * table[kp.k + L[i].k]; return e; };
    function bestKeep(c, table) {
      let best = -1e9, bk = null;
      const ks = keepsOf(c);
      for (let i = 0; i < ks.length; i++) { const e = ev(ks[i], table); if (e > best + 1e-9) { best = e; bk = ks[i]; } }
      return { keep: bk.c, n: bk.n, ev: best };
    }
    function v1() {
      if (V1) return V1;
      V1 = new Float64Array(46656);
      ALL5.forEach((r) => { V1[r.k] = bestKeep(r.c, V0).ev; });
      return V1;
    }
    return {
      now: vf,
      decide(c, rollsLeft, depth) { return bestKeep(c, rollsLeft >= 2 && depth >= 2 ? v1() : V0); }
    };
  }

  /* CPU の1手：dice（5個の目）・rollsLeft（のこりふれる回数 0〜2）・lv（1 よわい/2 ふつう/3 つよい）・pl（planner。同じ番なら使い回す）
     返り値：{ act:'roll', keep:[5個の true/false] } か { act:'score', id } */
  function cpuMove(sc, dice, rollsLeft, lv, pl) {
    if (lv <= 1) return weakMove(sc, dice, rollsLeft);
    const P = pl || planner(sc), c = counts(dice), now = P.now(c);
    if (rollsLeft <= 0) return { act: 'score', id: now.id };
    const r = P.decide(c, rollsLeft, lv >= 3 ? 2 : 1);
    if (r.n >= 5 || r.ev <= now.val + 0.05) return { act: 'score', id: now.id };
    if (lv === 2 && Math.random() < 0.12) return weakMove(sc, dice, rollsLeft);
    return { act: 'roll', keep: keepMask(dice, r.keep) };
  }
  /* 目ごとの数 → どのサイコロを残すか（同じ目なら前から） */
  function keepMask(dice, kc) {
    const left = kc.slice();
    return dice.map((v) => { if (left[v] > 0) { left[v]--; return true; } return false; });
  }
  /* よわい：いちばん多い目（同じなら大きい目）を残す。4つ並びならストレートをねらう。書く欄は、点がいちばん高いところ */
  function weakMove(sc, dice, rollsLeft) {
    const c = counts(dice), open = openCats(sc), s = sum(dice);
    const pts = (id) => scoreC(id, c, s);
    const pickBest = () => { let best = -1, bid = open[0]; open.forEach((id) => { const p = pts(id) + Math.random() * 3; if (p > best) { best = p; bid = id; } }); return { act: 'score', id: bid, p: best }; };
    if (rollsLeft <= 0) return pickBest();
    if ((open.indexOf('ya') >= 0 && pts('ya')) || (open.indexOf('bs') >= 0 && pts('bs'))) return pickBest();
    if (runOf(c) >= 4 && open.indexOf('bs') >= 0) {
      const seen = {};
      let a = 1, cur = 0, bl = 0; for (let v = 1; v <= 6; v++) { if (c[v]) { cur++; if (cur > bl) { bl = cur; a = v - cur + 1; } } else cur = 0; }
      return { act: 'roll', keep: dice.map((v) => { if (seen[v] || v < a || v >= a + bl) return false; seen[v] = 1; return true; }) };
    }
    let bv = 6, bn = 0;
    for (let v = 6; v >= 1; v--) if (c[v] > bn) { bn = c[v]; bv = v; }
    if (Math.random() < 0.15) bv = dice[(Math.random() * 5) | 0];
    const b = pickBest();
    if (b.p >= 25 && Math.random() < 0.6) return b;
    return { act: 'roll', keep: dice.map((v) => v === bv) };
  }

  MY.Rules = { CATS, CAT, UPPER, LOWER, ROUNDS, BONUS_NEED, BONUS_PTS, score, scoreC, counts, sum, runOf, usedDice, totals, openCats, planner, cpuMove, keepMask, PAR };
})(window);
