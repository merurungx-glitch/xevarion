/* ============================================================
   MagiQuiz — quiz-data.js（問題・ルールの数字）
   ★★ 2026-11-05 全面作り直し（ご指定「デザインから仕組みまで全てを1から構想しなおし」）
   ------------------------------------------------------------
   ・問題は MagiChemLex の問題データそのもの（../MagiChemLex/js/mcl-data*.js を同じページで読む）。
     写しは持たない＝ChemLex に足せばここにも自動で入る。
   ・出題範囲は <b>基礎セット1〜4 の改題すべて</b>（ご指定）。前の版で外していた
     図つき・いくつも選ぶ問題・選択肢が7つ以上・長い問題も、ぜんぶ出す。
   ・書式・判定・計算問題かどうかは ChemLex の mcl-core.js（window.MCL）をそのまま使う（isCalc で「計算問題」＝ChemLex の指定どおり）。
   ・むずかしさ lv（1〜3）は、もとの d・選択肢の数・文の長さから決める（クイズタワーの階に使う）。
   ★ 試験名・大学名・年度などの固有名詞は出さない（MagiChemLex と同じ決まり）。
   ============================================================ */
(function () {
  "use strict";
  const MQ = (window.MQ = window.MQ || {});
  const D = window.MCL_DATA, M = window.MCL;

  const fmt = (s) => (M ? M.fmt(s) : String(s == null ? "" : s));
  const fmtOpt = (q, s) => (M ? M.fmtOpt(q, s) : String(s));
  const plain = (s) => String(s == null ? "" : s).replace(/<[^>]+>/g, "").replace(/[{}^_]/g, "");

  const SETS = [[12, "基礎セット1"], [13, "基礎セット2"], [14, "基礎セット3"], [15, "基礎セット4"]];
  const FIELDS = [["inorg", "無機"], ["org", "有機"], ["poly", "高分子"], ["theory", "理論"]];

  /* ══ ルールの数字（ここだけ見れば全部わかるように） ══ */
  const RULE = {
    /* 1回の解答時間（秒）。n＝ふつうの問題・c＝計算問題（ご指定「計算問題の制限時間は長く」）。
       長い文・図・いくつも選ぶ問題・選択肢が多い問題は limitOf で少し足す。 */
    LIMIT: { short: { n: 30, c: 90, nm: "みじかめ" }, mid: { n: 45, c: 120, nm: "ふつう" }, long: { n: 60, c: 180, nm: "ながめ" }, off: { n: 0, c: 0, nm: "なし" } },
    /* 爆弾の時間（秒・ラウンドごとに範囲の中からランダム）。ご指定「爆弾の時間をより長く」で前の 28〜45 秒から大きくのばした。
       ★★ 2026-11-05 ご指定「より少しだけ伸ばして」→ さらに少しのばした（前：90–150／150–270／270–420）。
       ★ 数えるのは<b>問題に答えている間だけ</b>（解説・手番の受けわたしのあいだは止まる） */
    FUSE: { short: { r: [110, 170], nm: "みじかめ" }, mid: { r: [180, 300], nm: "ふつう" }, long: { r: [300, 450], nm: "ながめ" } },
    /* ★★ 2026-11-05 早押しバトル。read＝問題文が出る速さ（1秒に何文字）／limit＝ブザーを押してから答えるまでの秒［ふつう, 計算］／
       last＝文が出おわってから押せる秒（計算は lastCalc）／maxQ＝ここまでで決着がつかなければ点の順で終わり */
    RUSH: { read: { fast: { cps: 50, nm: "はやい" }, mid: { cps: 30, nm: "ふつう" }, slow: { cps: 18, nm: "ゆっくり" } },
      limit: { short: [10, 40], mid: [15, 60], long: [20, 90], off: [0, 0] }, last: 12, lastCalc: 20, maxQ: 30 },
    /* クイズタワー：10階・チェックポイントは3階と7階 */
    LADDER: [100, 200, 300, 500, 1000, 2000, 4000, 8000, 16000, 32000],
    SAFE: { 3: 1, 7: 1 },
    /* スコアアタック：正解の点（難しいほど高い）＋速さのボーナス（最大100）＋連続正解（1問ごとに +20・最大 +100） */
    SCORE: { base: [0, 100, 150, 200], calc: 50, time: 100, comboStep: 20, comboMax: 100 },
    /* 賞金をもらえるのは、3問以上答えた人だけ（すぐやめて賞金だけ受け取らないように） */
    PRIZE_MIN_ANS: 3,
    /* ひとりで遊んだときのごほうび（順位の賞金のかわり）：正解1問 10 XEVA・1回 100 XEVA まで */
    SOLO_PER_OK: 10, SOLO_MAX: 100,
  };

  function grpOf(q) {
    if (q.g === "o") { const S = D.SETS[q.set]; return S ? S.grp : 0; }
    return q.sg || 0;
  }
  /* むずかしさ：1 やさしい／2 ふつう／3 むずかしい */
  function lvOf(q, len) {
    const s = (q.d || 1) + ((q.o || []).length >= 6 ? 0.5 : 0) + (len > 220 ? 0.4 : 0) + (q.type === "m" ? 0.4 : 0) + (M && M.isCalc(q) ? 0.5 : 0);
    return s < 1.5 ? 1 : s < 2.3 ? 2 : 3;
  }
  let ALL = null;
  function all() {
    if (ALL) return ALL;
    if (!D || !Array.isArray(D.Q)) return (ALL = []);
    const basic = {};
    Object.keys(D.GRPK || {}).forEach((k) => { if (D.GRPK[k] === "basic") basic[k] = 1; });
    ALL = [];
    D.Q.forEach((q) => {
      const grp = grpOf(q);
      /* ご指定「MagiChemLex の基礎セット1-4 の改題のみの全てを出題範囲」→ g === "o"（改題）で基礎の組なら、形式を問わずぜんぶ */
      if (q.g !== "o" || !basic[grp]) return;
      if (q.type !== "c" && q.type !== "m" && q.type !== "n") return;
      if (q.type !== "n" && (!Array.isArray(q.o) || q.o.length < 2)) return;
      const len = plain(q.ctx).length + plain(q.q).length;
      ALL.push({ q, id: q.id, grp, f: q.f || "inorg", len, n: (q.o || []).length, lv: lvOf(q, len), calc: !!(M && M.isCalc(q)), fig: !!q.fig });
    });
    return ALL;
  }
  /* 出題範囲で絞った問題。c＝{ sets, fields, calc:true/false } */
  function pool(c) {
    const S = {}, F = {};
    (c.sets || []).forEach((v) => { S[v] = 1; });
    (c.fields || []).forEach((v) => { F[v] = 1; });
    return all().filter((x) => S[x.grp] && F[x.f] && (c.calc !== false || !x.calc));
  }
  function count(c) { return pool(c).length; }

  /* ══ 最近出した問題（この端末）＝つぎの試合ではできるだけ出さない ══ */
  const RECENT_KEY = "magiquiz_recent_v1";
  function recent() { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]") || []; } catch (e) { return []; } }
  function markUsed(id) {
    try { const a = recent().filter((x) => x !== id); a.unshift(id); localStorage.setItem(RECENT_KEY, JSON.stringify(a.slice(0, 260))); } catch (e) {}
  }
  /* 問題を1つえらぶ。used＝この試合で出した id の集まり（Set）／want＝{ lv:[1,2], notCtx:直前の設定文 } */
  function pick(list, used, want) {
    want = want || {};
    const rc = recent(), rpos = {}; rc.forEach((id, i) => { rpos[id] = i; });
    const tries = [
      (x) => (!want.lv || want.lv.indexOf(x.lv) >= 0) && (!want.notCtx || x.q.ctx !== want.notCtx),
      (x) => !want.notCtx || x.q.ctx !== want.notCtx,
      () => true,
    ];
    for (let round = 0; round < 2; round++) {
      for (const ok of tries) {
        const c = list.filter((x) => !used.has(x.id) && ok(x));
        if (!c.length) continue;
        /* 最近出していないものほど選ばれやすく */
        const w = c.map((x) => (rpos[x.id] == null ? 6 : 1 + rpos[x.id] / 60));
        let r = Math.random() * w.reduce((a, b) => a + b, 0);
        for (let i = 0; i < c.length; i++) { r -= w[i]; if (r <= 0) return c[i]; }
        return c[c.length - 1];
      }
      /* 範囲の問題を出しきったら、もう一周 */
      used.clear();
    }
    return list[0] || null;
  }
  /* 選択肢の並び（「正しい／誤り」の2択と q.fix はそのまま・ほかはまぜる）。もとの番号の配列を返す */
  function order(q) {
    const idx = (q.o || []).map((_, i) => i);
    if (q.fix || (idx.length === 2 && /^(正しい|誤り)$/.test(String(q.o[0])) && /^(正しい|誤り)$/.test(String(q.o[1])))) return idx;
    for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    return idx;
  }
  /* 1回の解答時間（秒）。preset＝RULE.LIMIT のキー。0＝なし */
  function limitOf(x, preset) {
    const L = RULE.LIMIT[preset] || RULE.LIMIT.mid;
    if (!L.n) return 0;
    if (x.calc) return L.c;
    let t = L.n;
    if (x.len > 320) t += 20; else if (x.len > 200) t += 10;
    if (x.fig) t += 10;
    if (x.q.type === "m") t += 10;
    if (x.n >= 8) t += 10;
    return t;
  }
  /* 選択肢の札。ふだんは A・B・C…。選択肢の中身が「A」「a・b」のようなローマ字の問題は、札の文字とまぎらわしいので 1・2・3… にする */
  function labels(q) {
    const t = (q.o || []).map((s) => plain(s).trim());
    const alpha = t.some((s) => /^[A-Za-z]([\s・,、と]+[A-Za-z])*$/.test(s));
    return alpha ? ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"] : "ABCDEFGHIJKL".split("");
  }
  /* 早押し：ブザーを押してから答えるまでの秒（0＝なし） */
  function rushLimit(x, preset) {
    const L = RULE.RUSH.limit[preset] || RULE.RUSH.limit.mid;
    if (!L[0]) return 0;
    return (x.calc ? L[1] : L[0]) + (x.q.type === "m" ? 5 : 0) + (x.n >= 8 ? 5 : 0);
  }
  const topicName = (t) => (D && D.T && D.T[t] ? D.T[t].nm : "");
  const fieldName = (f) => { const r = FIELDS.find((x) => x[0] === f); return r ? r[1] : ""; };
  const judge = (q, sel) => (M ? M.judge(q, sel) : false);
  /* 正解の番号（配列でそろえる） */
  const answers = (q) => (Array.isArray(q.a) ? q.a.slice() : [q.a]);

  MQ.Data = { ok: !!(D && D.Q && M), RULE, all, pool, count, pick, order, limitOf, markUsed, recent, fmt, fmtOpt, plain, SETS, FIELDS, topicName, fieldName, judge, answers, labels, rushLimit };
})();
