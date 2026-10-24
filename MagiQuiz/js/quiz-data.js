/* ============================================================
   MagiQuiz — quiz-data.js（問題）
   ★★ 2026-10-23 新作（ご指定「MagiChemLex の基礎問題を、1台の iPad で、個人や団体戦で学習しつつ楽しめる」）
   ------------------------------------------------------------
   ・問題は <b>MagiChemLex の問題データそのもの</b>（../MagiChemLex/js/mcl-data*.js を同じページで読む）から、
     <b>基礎セット1〜4</b>（D.GRPK が "basic" の組）の<b>選択式</b>の問題だけを使う。
     ChemLex に問題が足されれば、ここにも自動で入る（写しは持たない）。
   ・使わない問題：図がいる問題（fig）・数を打ちこむ問題（type n）・いくつも選ぶ問題（type m）・
     選択肢が7つ以上・設定文と問題文で200字をこえる長い問題（1台を囲んで読み上げるには長すぎる）。
   ・むずかしさ lv（1〜3）は、もとの d・選択肢の数・文の長さから決める（ミリオネアのはしごに使う）。
   ★ 試験名・大学名・年度などの固有名詞は出さない（MagiChemLex と同じ決まり）。
   ============================================================ */
(function () {
  "use strict";
  const MQ = (window.MQ = window.MQ || {});
  const D = window.MCL_DATA;

  /* ══ 書式（MagiChemLex の mcl-core.js と同じ：{CH4}＝化学式・^{x} 上つき・_{x} 下つき） ══ */
  function chem(str) {
    const s = String(str);
    let out = "", i = 0;
    while (i < s.length) {
      const ch = s[i];
      if (ch === "^") {
        const m = /^\^(\{[^}]*\}|\d*[+\-−])/.exec(s.slice(i));
        if (m) { let v = m[1]; if (v[0] === "{") v = v.slice(1, -1); out += "<sup>" + v.replace(/-/g, "−") + "</sup>"; i += m[0].length; continue; }
      }
      if (/[0-9]/.test(ch) && i > 0 && /[A-Za-z)\]]/.test(s[i - 1])) {
        let j = i; while (j < s.length && /[0-9]/.test(s[j])) j++;
        out += "<sub>" + s.slice(i, j) + "</sub>"; i = j; continue;
      }
      if ((ch === "+" || ch === "-") && i > 0 && /[A-Za-z0-9)]/.test(s[i - 1]) && (i + 1 >= s.length || /[\s,、と）)]/.test(s[i + 1]))) {
        out += "<sup>" + (ch === "-" ? "−" : "+") + "</sup>"; i++; continue;
      }
      out += ch; i++;
    }
    return out;
  }
  function fmt(s) {
    return String(s == null ? "" : s)
      .replace(/\^\{([^}]*)\}/g, (m, x) => "<sup>" + x.replace(/-/g, "−") + "</sup>")
      .replace(/_\{([^}]*)\}/g, "<sub>$1</sub>")
      .replace(/\{([^{}]+)\}/g, (m, x) => chem(x));
  }
  function fmtOpt(q, s) { return q.chem ? chem(String(s)) : fmt(s); }
  const plainLen = (s) => String(s || "").replace(/<[^>]+>/g, "").replace(/[{}^_]/g, "").length;

  const SETS = [[12, "基礎セット1"], [13, "基礎セット2"], [14, "基礎セット3"], [15, "基礎セット4"]];
  const FIELDS = [["inorg", "無機"], ["org", "有機"], ["poly", "高分子"], ["theory", "理論"]];

  function grpOf(q) {
    if (q.g === "o") { const S = D.SETS[q.set]; return S ? S.grp : 0; }
    return q.sg || 0;
  }
  /* むずかしさ：1 やさしい／2 ふつう／3 むずかしい */
  function lvOf(q, len) {
    const s = (q.d || 1) + (q.o.length >= 5 ? 0.5 : 0) + (len > 110 ? 0.4 : 0) + (q.ctx ? 0.2 : 0);
    return s < 1.5 ? 1 : s < 2.2 ? 2 : 3;
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
      /* ★★ 2026-10-24 ご指定「問題は基礎の改題のみを出題し、関連問題は出題しない」→ g === "o"（改題）だけ */
      if (q.g !== "o") return;
      if (!basic[grp] || q.type !== "c" || q.fig || !Array.isArray(q.o) || q.o.length < 2 || q.o.length > 6 || typeof q.a !== "number") return;
      const len = plainLen(q.ctx) + plainLen(q.q);
      if (len > 200) return;
      ALL.push({ q, id: q.id, grp, f: q.f, len, n: q.o.length, lv: lvOf(q, len) });
    });
    return ALL;
  }
  /* 出題範囲（基礎セット・分野）で絞った問題 */
  function pool(sets, fields) {
    const S = {}, F = {};
    (sets || []).forEach((v) => { S[v] = 1; });
    (fields || []).forEach((v) => { F[v] = 1; });
    return all().filter((x) => S[x.grp] && F[x.f || "inorg"]);
  }
  function count(sets, fields) { return pool(sets, fields).length; }

  /* ══ 最近出した問題（この端末）＝つぎの試合ではできるだけ出さない ══ */
  const RECENT_KEY = "magiquiz_recent_v1";
  function recent() { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]") || []; } catch (e) { return []; } }
  function markUsed(id) {
    try { const a = recent().filter((x) => x !== id); a.unshift(id); localStorage.setItem(RECENT_KEY, JSON.stringify(a.slice(0, 260))); } catch (e) {}
  }
  /* 問題を1つえらぶ。used＝この試合で出した id の集まり／want＝{ lv:[1,2], minOpt, maxLen }（合わなければ少しずつゆるめる） */
  function pick(list, used, want) {
    want = want || {};
    const rc = recent(), rpos = {}; rc.forEach((id, i) => { rpos[id] = i; });
    const tries = [
      (x) => (!want.lv || want.lv.indexOf(x.lv) >= 0) && (!want.minOpt || x.n >= want.minOpt) && (!want.maxLen || x.len <= want.maxLen),
      (x) => (!want.minOpt || x.n >= want.minOpt) && (!want.maxLen || x.len <= want.maxLen * 1.3),
      () => true,
    ];
    for (const ok of tries) {
      const c = list.filter((x) => !used.has(x.id) && ok(x));
      if (!c.length) continue;
      /* 最近出していないものほど選ばれやすく（最近出した260問は重みを下げる） */
      const w = c.map((x) => (rpos[x.id] == null ? 6 : 1 + rpos[x.id] / 60));
      let r = Math.random() * w.reduce((a, b) => a + b, 0);
      for (let i = 0; i < c.length; i++) { r -= w[i]; if (r <= 0) return c[i]; }
      return c[c.length - 1];
    }
    return null;
  }
  /* 選択肢の並び（「正しい／誤り」の2択と q.fix はそのまま・ほかはまぜる）。もとの番号の配列を返す */
  function order(q) {
    const idx = q.o.map((_, i) => i);
    const tf = q.o.length === 2 && /^(正しい|誤り)$/.test(String(q.o[0])) && /^(正しい|誤り)$/.test(String(q.o[1]));
    if (tf || q.fix) return idx;
    for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    return idx;
  }
  const topicName = (t) => (D && D.T && D.T[t] ? D.T[t].nm : "");
  const fieldName = (f) => { const r = FIELDS.find((x) => x[0] === f); return r ? r[1] : ""; };

  MQ.Data = { ok: !!(D && D.Q), all, pool, count, pick, order, markUsed, fmt, fmtOpt, chem, SETS, FIELDS, topicName, fieldName };
})();
