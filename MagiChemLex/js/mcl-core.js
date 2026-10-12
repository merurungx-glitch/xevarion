/* ============================================================
   MagiChemLex — mcl-core.js（記録・復習の予定・ごほうび・書式）
   ・セーブは magichemlex_v1（XEVARION のアカウントで同期：xeva-keys.js／混ぜ方は xeva-cloud.js の mergeChem）
     { v, q:{[id]:{n,ok,ng,lv,due,last,lastOk,hint,t,at,uns}}, days:{日付:解いた数}, runs:[本番の記録],
       bm:{[id]:時刻}, dm:{[id]:外した時刻}, memo:{[id]:{t,at}}, rw:{ごほうびの印}, xp, best:{combo}, set:{設定}, at }
   ★ 書きこむときは必ず localStorage から読み直してから（クラウドの同期が裏で中身を差しかえるため）。
   ・習熟レベル lv：まちがえる→0。日をあけて正解するたびに +1。lv≥2 を「習得」とよぶ。
   ・ごほうび（XEVA）はイベント中 XEVA.event.lexMult() 倍（Violet Breeze は2倍）。理由の頭は必ず "MagiChemLex"
     （イベントミッション「MagiLex 系統で XEVA を獲得」が数える）。
   ============================================================ */
(function () {
  "use strict";
  const D = window.MCL_DATA;
  const KEY = "magichemlex_v1";
  const DAY = 86400000;
  /* 習熟レベルごとの「次の復習まで」の日数 */
  const IV = [0, 1, 3, 7, 14, 30, 60];
  /* ★★ 2026-10-06c ご指定「MagiLex にくらべて XEVA が少ない → 同じくらいに」：全体を約3.5倍に。
     MagiLex は1問あたり約120 XEVA（完全習得＋確認テスト）。こちらも問題セットの完全習得（gmaster）・確認テスト（confirm）・
     ランダム10問（mix90/mix100・何度でも＝MagiLex のミックス問題と同じ）を足して、1問あたり約140 にそろえた。 */
  const REWARD = { reg: 50, first: 15, topic: 300, set60: 150, set80: 300, set100: 600, daily: 100, streak7: 300, gmaster: 300, confirm: 500, mix90: 50, mix100: 150 };
  const TITLES = [[1, "ビーカー見習い"], [3, "試験管ルーキー"], [5, "フラスコ使い"], [8, "滴定職人"], [12, "平衡の賢者"], [16, "反応速度の覇者"], [20, "化学の探究者"], [25, "難関化学マスター"]];

  function pad(n) { return String(n).padStart(2, "0"); }
  function today(t) { const d = t != null ? new Date(t) : new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function dayStart(t) { const d = t != null ? new Date(t) : new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }
  function fresh() {
    return { v: 1, q: {}, days: {}, runs: [], bm: {}, dm: {}, memo: {}, rw: {}, xp: 0, best: {}, cf: {}, rq: {}, rr: {},
      set: { goal: 10, theme: "auto", fs: "m", sound: 1, relAuto: 1, timer: 1, vib: 1 }, at: 0 };
  }
  function load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { s = null; }
    const f = fresh();
    if (!s || typeof s !== "object" || Array.isArray(s)) s = f;
    Object.keys(f).forEach((k) => {
      const bad = s[k] == null || typeof s[k] !== typeof f[k] || Array.isArray(s[k]) !== Array.isArray(f[k]);
      if (bad) s[k] = f[k];
    });
    s.set = Object.assign({}, f.set, s.set);
    return s;
  }
  let S = null;
  function get() { return S || (S = load()); }
  function reload() { S = load(); return S; }
  function save() { const s = get(); s.at = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  /* 読み直して → 変えて → 保存 */
  function mut(fn) { S = load(); const r = fn(S); save(); return r; }

  /* ── XEVA ── */
  function mult() { try { if (window.XEVA && XEVA.event) return Math.max(1, XEVA.event.lexMult() || 1); } catch (e) {} return 1; }
  function evName() { try { const E = window.XEVA && XEVA.event && XEVA.event.cur(); return E ? E.nm : ""; } catch (e) { return ""; } }
  function balance() { try { return window.XEVA ? (XEVA.getBalance ? XEVA.getBalance() : 0) : 0; } catch (e) { return 0; } }
  /* ごほうびの印 mark が無ければ付けて XEVA を渡す。戻り値＝渡した XEVA（倍率込み） */
  function earnOnce(s, mark, base, msg) {
    if (s.rw[mark]) return 0;
    s.rw[mark] = Date.now();
    return earn(base, msg);
  }
  const _earned = [];
  function earn(base, msg) {
    const m = mult(), amt = Math.round(base * m);
    if (!(amt > 0)) return 0;
    try { if (window.XEVA) XEVA.add(amt, "MagiChemLex " + msg + (m > 1 ? "（" + (evName() || "イベント") + " " + m + "倍）" : "")); } catch (e) {}
    _earned.push({ amt, msg, m });
    return amt;
  }
  function takeEarned() { return _earned.splice(0, _earned.length); }
  function evBump(key, n) { try { if (window.XEVA && XEVA.event) XEVA.event.bump(key, n); } catch (e) {} }
  function mission() { try { if (window.XEVA && XEVA.completeMission) XEVA.completeMission("magichemlex_play"); } catch (e) {} }

  /* ── 書式：{CH4} … 化学式／^{x} … 上つき／_{x} … 下つき ── */
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
  /* 一覧などの短い文：下つき・上つきの数字は Unicode の小さい数字にして残す（CO₂・10⁻⁴） */
  const SUBD = "₀₁₂₃₄₅₆₇₈₉", SUPD = "⁰¹²³⁴⁵⁶⁷⁸⁹";
  function plain(s) {
    const h = fmt(s)
      .replace(/<sub>([0-9]+)<\/sub>/g, (m, x) => x.replace(/\d/g, (c) => SUBD[c]))
      .replace(/<sup>([0-9+\-−]+)<\/sup>/g, (m, x) => x.replace(/\d/g, (c) => SUPD[c]).replace(/\+/g, "⁺").replace(/[-−]/g, "⁻"));
    const d = document.createElement("div"); d.innerHTML = h;
    return (d.textContent || "").replace(/\s+/g, " ").trim();
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

  /* ── 数値の答え ── */
  function parseNum(str) {
    let s = String(str == null ? "" : str).trim();
    s = s.replace(/[０-９．－＋]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)).replace(/[−–—ー]/g, "-").replace(/,/g, "").replace(/\s/g, "");
    s = s.replace(/[×xX*]10\^?\(?([+\-]?\d+)\)?/, "e$1");
    if (/^[+\-]?(\d+\.?\d*|\.\d+)(e[+\-]?\d+)?$/i.test(s)) return Number(s);
    return NaN;
  }
  function judgeNum(q, v) {
    if (!isFinite(v)) return false;
    if (q.abs != null) return Math.abs(v - q.a) <= q.abs + 1e-9;
    const tol = q.tol != null ? q.tol : 0.01;
    return Math.abs(v - q.a) <= Math.abs(q.a) * tol + 1e-12;
  }
  /* ans … c：選んだ番号／m：番号の配列／n：入力した文字 */
  function judge(q, ans) {
    if (ans == null) return false;
    if (q.type === "c") return ans === q.a;
    if (q.type === "m") { const a = (ans || []).slice().sort((x, y) => x - y), b = q.a.slice().sort((x, y) => x - y); return a.length === b.length && a.every((v, i) => v === b[i]); }
    if (q.type === "n") return judgeNum(q, parseNum(ans));
    return false;
  }
  function answerText(q) {
    if (q.type === "c") return fmtOpt(q, q.o[q.a]);
    if (q.type === "m") return q.a.map((i) => fmtOpt(q, q.o[i])).join("<span class=\"sep\">・</span>");
    return fmt(q.as || String(q.a)) + (q.u ? " " + fmt(q.u) : "");
  }

  /* ── 問題の状態 ── */
  function rec(id) { return get().q[id] || null; }
  function status(id) {
    const r = rec(id);
    if (!r || !r.n) return "new";
    if ((r.lv || 0) >= 2 && r.last) return "mas";
    return r.last ? "ok" : "ng";
  }
  function isDue(r, now) { return !!r && r.n > 0 && (r.due || 0) <= (now || Date.now()); }
  function idsOf(t) { return D.Q.filter((x) => x.t === t).map((x) => x.id); }
  function topicStat(t) {
    const ids = idsOf(t), s = get();
    let seen = 0, mas = 0, ok = 0, n = 0;
    ids.forEach((id) => { const r = s.q[id]; if (r && r.n) { seen++; ok += r.ok || 0; n += r.n || 0; if ((r.lv || 0) >= 2 && r.last) mas++; } });
    return { total: ids.length, seen, mas, acc: n ? ok / n : null, n };
  }
  function fieldStat(f) {
    const s = get(); let total = 0, seen = 0, mas = 0, ok = 0, n = 0;
    D.Q.forEach((x) => { if (x.f !== f) return; total++; const r = s.q[x.id]; if (r && r.n) { seen++; ok += r.ok || 0; n += r.n || 0; if ((r.lv || 0) >= 2 && r.last) mas++; } });
    return { total, seen, mas, acc: n ? ok / n : null, n };
  }
  function totals() {
    const s = get(); let seen = 0, mas = 0, ok = 0, n = 0, t = 0;
    D.Q.forEach((x) => { const r = s.q[x.id]; if (r && r.n) { seen++; ok += r.ok || 0; n += r.n || 0; t += r.t || 0; if ((r.lv || 0) >= 2 && r.last) mas++; } });
    return { total: D.Q.length, seen, mas, ok, n, acc: n ? ok / n : null, ms: t };
  }
  function dueList() { const s = get(), now = Date.now(); return D.Q.filter((x) => isDue(s.q[x.id], now)).sort((a, b) => (s.q[a.id].due || 0) - (s.q[b.id].due || 0)).map((x) => x.id); }
  function wrongList() { const s = get(); return D.Q.filter((x) => { const r = s.q[x.id]; return r && r.n && !r.last; }).map((x) => x.id); }
  function unsureList() { const s = get(); return D.Q.filter((x) => { const r = s.q[x.id]; return r && r.uns; }).map((x) => x.id); }
  function bmList() { const s = get(); return D.Q.filter((x) => !!s.bm[x.id]).map((x) => x.id); }
  /* これから7日の復習の数 */
  function dueForecast() {
    const s = get(), base = dayStart(), out = [0, 0, 0, 0, 0, 0, 0];
    D.Q.forEach((x) => { const r = s.q[x.id]; if (!r || !r.n) return; const k = Math.max(0, Math.floor(((r.due || 0) - base) / DAY)); if (k < 7) out[k]++; });
    return out;
  }
  function streak() {
    const s = get(); let n = 0, t = dayStart();
    if (!s.days[today(t)]) t -= DAY;   // 今日まだなら昨日から数える
    while (s.days[today(t)]) { n++; t -= DAY; }
    return n;
  }
  function bestStreak() {
    const s = get(), ks = Object.keys(s.days).filter((k) => s.days[k] > 0).sort();
    let best = 0, cur = 0, prev = null;
    ks.forEach((k) => { const t = new Date(k + "T00:00:00").getTime(); cur = prev != null && Math.round((t - prev) / DAY) === 1 ? cur + 1 : 1; prev = t; best = Math.max(best, cur); });
    return best;
  }
  function todayCount() { return get().days[today()] || 0; }
  function level(xp) {
    xp = Math.max(0, xp == null ? get().xp : xp);
    let L = 1; while (50 * (L + 1) * L <= xp) L++;
    const base = 50 * L * (L - 1), next = 50 * (L + 1) * L;
    let title = TITLES[0][1]; TITLES.forEach((t) => { if (L >= t[0]) title = t[1]; });
    return { lv: L, cur: xp - base, need: next - base, title, xp };
  }

  /* ══ ★★ 2026-10-06c 問題セット（ご指定「問題や関連問題の括りで、MagiLex のように一覧で」）══
     ・改題 … 本番セットの大問ごと（SETS のうち full でないもの）
     ・関連問題 … 単元ごと（その単元の関連問題 g:"r"）
     id は "s:<セット>" / "t:<単元>"。ごほうびの印は rw["gm:<id>"]（完全習得）・rw["cf:<id>"]（確認テスト）。
     ★★ 2026-10-07 ご指定「改題の問題のセットを少し細かく」：大問に parts があれば<b>小問の番号</b>で分ける。
       id は "s:<セット>:<1〜>"。名前は「第1問 マーク (1)〜(3)」、sub は中身の単元。
       どの範囲にも入らなかった問題（あとから足した問題など）は最後のまとまりへ入れる＝取りこぼさない。 */
  /* 小問の番号：「第1問(10)A」→ 10／「第2問 問12(1)」→ 12 */
  function qNo(x) { const m = /第\d+問(?:\((\d+)\)|\s*問(\d+))/.exec((x && x.src) || ""); return m ? Number(m[1] || m[2]) : 0; }
  let GROUPS = null;
  function groups() {
    if (GROUPS) return GROUPS;
    const out = [];
    Object.keys(D.SETS).forEach((k) => {
      const S = D.SETS[k]; if (S.full || !S.ids || !S.ids.length) return;
      const base = { kind: "o", set: k, grp: S.grp };
      if (S.parts && S.parts.length) {
        const used = {}, mine = [];
        S.parts.forEach((p, i) => {
          const ids = S.ids.filter((id) => { const n = qNo(D.BY[id]); return n >= p.a && n <= p.b; });
          ids.forEach((id) => { used[id] = 1; });
          if (ids.length) mine.push(Object.assign({}, base, { id: "s:" + k + ":" + (i + 1), part: i + 1, lb: p.lb, nm: (S.nm0 || S.nm) + " " + p.lb, dai: S.nm0 || S.nm, sub: p.sub || "", ids, parentN: S.ids.length }));
        });
        const rest = S.ids.filter((id) => !used[id]);
        if (mine.length) { if (rest.length) mine[mine.length - 1].ids = mine[mine.length - 1].ids.concat(rest); mine.forEach((g) => out.push(g)); return; }
      }
      out.push(Object.assign({}, base, { id: "s:" + k, nm: S.nm0 || S.nm, sub: S.sub || "", ids: S.ids.slice() }));
    });
    /* ★★ 2026-10-12c 難関の関連問題の単元まとめ（関連問題タブの「難関レベル」）は view:1 ＝並べかえて見るだけ。
       ごほうびは難関タブの「小問の範囲ごとの関連問題」（xp:）で受け取る（標準と同じ考え方・二重にしない） */
    Object.keys(D.T).forEach((t) => { const ids = D.Q.filter((x) => x.t === t && x.g === "r" && !x.sg).map((x) => x.id); if (ids.length) out.push({ id: "t:" + t, kind: "r", lv: "o", t, f: D.T[t].f, nm: D.T[t].nm, sub: "関連問題（難関）", ids, view: 1 }); });
    /* ★★ 2026-10-12 標準セットの関連問題は単元のまとまりと別に、大問ごと（sg ＝ 組・sd ＝ 大問）。id "x:<組>:<大問>" */
    const sx = {};
    D.Q.forEach((x) => { if (x.g === "r" && x.sg) { const k = x.sg + ":" + (x.sd || 0); (sx[k] = sx[k] || []).push(x.id); } });
    Object.keys(sx).sort((a, b) => { const p = a.split(":").map(Number), q = b.split(":").map(Number); return p[0] - q[0] || p[1] - q[1]; }).forEach((k) => {
      const sg = Number(k.split(":")[0]), sd = Number(k.split(":")[1]), ids = sx[k], tn = [];
      ids.forEach((id) => { const q = D.BY[id], nm = q && D.T[q.t] ? D.T[q.t].nm : ""; if (nm && tn.indexOf(nm) < 0) tn.push(nm); });
      out.push({ id: "x:" + k, kind: "x", grp: sg, sd, nm: "第" + sd + "問の関連問題", sub: tn.slice(0, 4).join("・"), ids });
    });
    /* ★★ 2026-10-12b 難関セットの関連問題も大問ごとに（ご指定「標準問題のように、本番セットの問題もそれぞれで関連問題を」）。
       難関の関連問題（g:"r"・sg なし）を、いちばん多く「関連」にあげている難関の大問へ1問ずつ割りふる
       （どの大問からもあげられていない問題は、同じ単元の問題がいちばん多い大問へ）。
       ★★ 2026-10-12c さらに改題と同じ<b>小問の範囲（parts）</b>ごとに分け、ごほうびつきにした（ご指定「本番の関連問題も本番セットのように
       分けて表示し、標準の関連問題同様それぞれ報酬を」）。id "xp:<大問のセット>:<1〜>"・kind "x"・xo:1。
       範囲へは「その関連問題を rel にあげている改題がいちばん多い範囲」へ（無ければ同じ単元の改題がいちばん多い範囲）。4問未満の範囲はとなりとまとめる */
    const oSets = Object.keys(D.SETS).filter((k) => { const S = D.SETS[k]; return !S.full && S.ids && S.ids.length && !isStd(S.grp); });
    const sdOf = {}, nOf = {};
    oSets.forEach((k) => { const gp = D.SETS[k].grp; nOf[gp] = (nOf[gp] || 0) + 1; sdOf[k] = nOf[gp]; });
    const refs = {}, tCnt = {};
    oSets.forEach((k) => {
      const tc = tCnt[k] = {};
      D.SETS[k].ids.forEach((id) => {
        const q = D.BY[id]; if (!q) return;
        tc[q.t] = (tc[q.t] || 0) + 1;
        (q.rel || []).forEach((r) => { const x = D.BY[r]; if (x && x.g === "r" && !x.sg) { const m = refs[r] = refs[r] || {}; m[k] = (m[k] || 0) + 1; } });
      });
    });
    const xo = {};
    D.Q.forEach((x) => {
      if (x.g !== "r" || x.sg) return;
      let best = null, bn = 0;
      const m = refs[x.id];
      if (m) oSets.forEach((k) => { if ((m[k] || 0) > bn) { bn = m[k]; best = k; } });
      if (!best) oSets.forEach((k) => { if ((tCnt[k][x.t] || 0) > bn) { bn = tCnt[k][x.t]; best = k; } });
      if (best) (xo[best] = xo[best] || []).push(x.id);
    });
    const unitsOf = (ids) => { const tn = []; ids.forEach((id) => { const q = D.BY[id], nm = q && D.T[q.t] ? D.T[q.t].nm : ""; if (nm && tn.indexOf(nm) < 0) tn.push(nm); }); return tn.slice(0, 4).join("・"); };
    oSets.forEach((k) => {
      const ids = xo[k]; if (!ids || !ids.length) return;
      const S = D.SETS[k], dai = S.nm0 || S.nm;
      const parts = S.parts && S.parts.length ? S.parts : null;
      if (!parts) { out.push({ id: "xp:" + k + ":1", kind: "x", xo: 1, grp: S.grp, sd: sdOf[k], rset: k, dai, nm: dai + " の関連問題", sub: unitsOf(ids), ids }); return; }
      const pOf = {};
      S.ids.forEach((id) => { const n = qNo(D.BY[id]); let i = parts.findIndex((p) => n >= p.a && n <= p.b); if (i < 0) i = parts.length - 1; pOf[id] = i; });
      const bk = parts.map(() => []);
      ids.forEach((rid) => {
        const sc = parts.map(() => 0);
        S.ids.forEach((id) => { const q = D.BY[id]; if (q && (q.rel || []).indexOf(rid) >= 0) sc[pOf[id]]++; });
        let bi = -1, bn = 0; sc.forEach((v, i) => { if (v > bn) { bn = v; bi = i; } });
        if (bi < 0) { const t = D.BY[rid] && D.BY[rid].t; S.ids.forEach((id) => { if (D.BY[id] && D.BY[id].t === t) sc[pOf[id]]++; }); sc.forEach((v, i) => { if (v > bn) { bn = v; bi = i; } }); }
        bk[bi < 0 ? parts.length - 1 : bi].push(rid);
      });
      /* 範囲ごとのまとまり → 4問未満はとなりとまとめる（前があれば前へ） */
      let gl = []; bk.forEach((l, i) => { if (l.length) gl.push({ i0: i, i1: i, ids: l.slice() }); });
      let guard = 0;
      while (gl.length > 1 && guard++ < 20) {
        const j = gl.findIndex((g) => g.ids.length < 4); if (j < 0) break;
        const o = j > 0 ? j - 1 : j + 1, a = Math.min(j, o), b = Math.max(j, o);
        gl.splice(a, 2, { i0: gl[a].i0, i1: gl[b].i1, ids: gl[a].ids.concat(gl[b].ids) });
      }
      const lbOf = (g) => { if (g.i0 === g.i1) return parts[g.i0].lb; const p0 = parts[g.i0], p1 = parts[g.i1]; return /^問/.test(p0.lb) ? "問" + p0.a + "〜" + p1.b : "(" + p0.a + ")〜(" + p1.b + ")"; };
      gl.forEach((g, j) => {
        const lb = lbOf(g);
        out.push({ id: "xp:" + k + ":" + (j + 1), kind: "x", xo: 1, grp: S.grp, sd: sdOf[k], rset: k, part: j + 1, lb, dai, nm: dai + " " + lb + " の関連問題", sub: unitsOf(g.ids), ids: g.ids });
      });
    });
    /* ★★ 2026-10-12b 標準の関連問題も単元ごとに（関連問題タブの「標準レベル」）。id "ts:<単元>"・view:1（ごほうびは標準タブの大問ごとのセット） */
    Object.keys(D.T).forEach((t) => { const ids = D.Q.filter((x) => x.t === t && x.g === "r" && x.sg).map((x) => x.id); if (ids.length) out.push({ id: "ts:" + t, kind: "r", lv: "s", t, f: D.T[t].f, nm: D.T[t].nm, sub: "関連問題（標準）", ids, view: 1 }); });
    return (GROUPS = out);
  }
  function groupById(id) { return groups().find((g) => g.id === id) || null; }
  /* ★★ 2026-10-12 組（grp）が標準セットか */
  function isStd(grp) { return !!(D.GRPK && D.GRPK[grp] === "std"); }
  /* ★★ 2026-10-09b 計算問題か（セット一覧の控えめな印・ご指定）。問題に calc:1/0 を書けば上書きできる。
     ・数値を入れて答える問題（type n）
     ・選択肢がすべて数で、小数・×10ⁿ・20以上の数をふくむもの（「2〜6個」のような数え上げや酸化数は入れない） */
  function isCalc(q) {
    if (!q) return false;
    if (q.calc != null) return !!q.calc;
    if (q.type === "n") return true;
    if (q.type !== "c" || !Array.isArray(q.o) || q.o.length < 2) return false;
    const t = q.o.map((x) => String(x).replace(/<[^>]+>/g, "").replace(/\s/g, ""));
    const num = /^[−\-+]?\d+(\.\d+)?(×10\^\{?[−\-]?\d+\}?)?[A-Za-z%℃/()·⁻⁰¹²³⁴⁵⁶⁷⁸⁹]*$/;
    if (!t.every((x) => num.test(x))) return false;
    return t.some((x) => /\.|×10/.test(x) || Math.abs(parseFloat(x.replace("−", "-"))) >= 20);
  }
  function groupHasCalc(g) { return !!(g && g.ids && g.ids.some((id) => isCalc(D.BY[id]))); }
  function groupCalcN(g) { return g && g.ids ? g.ids.filter((id) => isCalc(D.BY[id])).length : 0; }
  function groupsOf(qid) { return groups().filter((g) => g.ids.indexOf(qid) >= 0); }
  /* 問題数が多いセットほど多く（20問以上で2倍・MagiLex のボリュームボーナスと同じ考え方） */
  function volMul(n) { return n >= 20 ? 2 : 1; }
  function isMas(s, id) { const r = s.q[id]; return !!(r && (r.lv || 0) >= 2 && r.last); }
  /* ★★ 2026-10-07 ごほうびの印。分けたセット（part）は、前の「大問まるごと」の印（gm:s:s1 など）があれば受け取りずみ
     ★★ 2026-10-12c 難関の関連問題（xp:）は、前に単元のまとまり（t:）で同じ問題ぶんのごほうびを受け取っていれば受け取りずみ（二重にしない） */
  function gotMark(s, kind, g) {
    if (s.rw[kind + ":" + g.id]) return true;
    if (g.kind === "o" && g.part && s.rw[kind + ":s:" + g.set]) return true;
    if (g.xo && g.ids.length && g.ids.every((id) => { const q = D.BY[id]; return !!(q && s.rw[kind + ":t:" + q.t]); })) return true;
    return false;
  }
  function groupStat(g) {
    const s = get(); let seen = 0, mas = 0, ok = 0, n = 0;
    g.ids.forEach((id) => { const r = s.q[id]; if (r && r.n) { seen++; ok += r.ok || 0; n += r.n || 0; } if (isMas(s, id)) mas++; });
    return { total: g.ids.length, seen, mas, acc: n ? ok / n : null, n, done: mas === g.ids.length, gm: gotMark(s, "gm", g), cfPass: gotMark(s, "cf", g), cf: (s.cf || {})[g.id] || null };
  }
  /* ★★ 2026-10-07 分けたセットは<b>大問ぶんのごほうびを問題数で分ける</b>（10円単位）。合計は分ける前と同じ */
  function groupReward(g) {
    if (g.view) return { gm: 0, cf: 0, v: 1, view: 1 };   /* ★★ 2026-10-12b 見かたのちがうまとまりは、ごほうびなし（二重にしない） */
    if (g.part && g.parentN) {
      const v = volMul(g.parentN), sh = g.ids.length / g.parentN;
      return { gm: Math.round(REWARD.gmaster * v * sh / 10) * 10, cf: Math.round(REWARD.confirm * v * sh / 10) * 10, v: 1, part: true };
    }
    const v = volMul(g.ids.length); return { gm: REWARD.gmaster * v, cf: REWARD.confirm * v, v };
  }

  /* ══ 答えを記録する ══
     opt: { hint:使ったヒントの数, ms:かかった時間, uns:あやしい, exam:本番セット, giveup:わからない } */
  function answer(id, ok, opt) {
    opt = opt || {};
    const q = D.BY[id]; if (!q) return null;
    const res = { ok, xp: 0, first: false, lvUp: false, mastered: false, topicDone: false, daily: false, streak7: false };
    const lvBefore = level().lv;
    mut((s) => {
      const now = Date.now(), td = today();
      const r = s.q[id] || (s.q[id] = { n: 0, ok: 0, ng: 0, lv: 0, due: 0, last: 0, lastOk: "", hint: 0, t: 0 });
      const wasMas = (r.lv || 0) >= 2 && r.last;
      r.n = (r.n || 0) + 1; r.t = (r.t || 0) + Math.max(0, Math.min(opt.ms || 0, 30 * 60000)); r.at = now;
      if (opt.hint) r.hint = (r.hint || 0) + opt.hint;
      if (ok) {
        r.ok = (r.ok || 0) + 1; r.last = 1;
        const clean = !opt.hint && !opt.uns;
        if (clean) {
          if (r.lastOk !== td) r.lv = Math.min(IV.length - 1, (r.lv || 0) + 1);
          r.due = dayStart(now) + IV[r.lv] * DAY;
        } else {
          if (!r.lv) r.lv = 1;
          r.due = dayStart(now) + DAY;   // ヒントを使った・あやしい → 明日もう一度
        }
        r.lastOk = td;
        r.uns = opt.uns ? 1 : 0;
        res.xp = 10 + (clean ? 5 : 0);
      } else {
        r.ng = (r.ng || 0) + 1; r.last = 0; r.lv = 0; r.due = now + 10 * 60000;   // 10分後から「今日の復習」に出る
        r.uns = 0;
        res.xp = 3;
      }
      if (!wasMas && (r.lv || 0) >= 2 && r.last) res.mastered = true;
      s.days[td] = (s.days[td] || 0) + 1;
      s.xp = (s.xp || 0) + res.xp;
      /* ── ごほうび ── */
      if (!s.rw.reg) earnOnce(s, "reg", REWARD.reg, "はじめての学習ボーナス");
      if (ok && !s.rw["first:" + id]) { earnOnce(s, "first:" + id, REWARD.first, "はじめての正解（" + (q.g === "o" ? "改題" : "関連問題") + "）"); res.first = true; s.xp += 5; }
      const ids = idsOf(q.t);
      if (ok && !s.rw["topic:" + q.t] && ids.every((x) => { const rr = s.q[x]; return rr && (rr.lv || 0) >= 2 && rr.last; })) {
        earnOnce(s, "topic:" + q.t, REWARD.topic, "単元マスター「" + D.T[q.t].nm + "」"); res.topicDone = true; s.xp += 100;
      }
      /* ★★ 2026-10-06c 問題セット（大問・単元の関連問題）をぜんぶ習得 */
      if (ok) groupsOf(id).forEach((g) => {
        if (g.view) return;
        const mk = "gm:" + g.id;
        if (!gotMark(s, "gm", g) && g.ids.every((x) => isMas(s, x))) { earnOnce(s, mk, groupReward(g).gm, "問題セット「" + g.nm + "」完全習得"); res.groupDone = (res.groupDone || []).concat([g.nm]); s.xp += 80; }
      });
      const goal = Number(s.set.goal) || 10;
      if (s.days[td] >= goal && !s.rw["daily:" + td]) { earnOnce(s, "daily:" + td, REWARD.daily, "今日の目標 " + goal + "問 達成"); res.daily = true; }
    });
    const st = streak();
    if (st > 0 && st % 7 === 0) mut((s) => { if (!s.rw["streak:" + today()]) { earnOnce(s, "streak:" + today(), REWARD.streak7, st + "日連続の学習"); res.streak7 = st; } });
    if (ok) evBump("chemOk", 1);
    mission();
    res.lvUp = level().lv > lvBefore;
    return res;
  }
  /* 本番セットをやりとげた */
  function finishSet(setId, result) {
    const out = { tiers: [], lvUp: false };
    const lvBefore = level().lv;
    mut((s) => {
      const pct = result.total ? result.score / result.total : 0;
      const run = { id: "r" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), set: setId, at: Date.now(), score: result.score, total: result.total, ms: result.ms, wrong: result.wrong || [] };
      s.runs = [run].concat(s.runs || []).slice(0, 60);
      s.xp = (s.xp || 0) + 50 + result.score * 2;
      const nm = D.SETS[setId] ? D.SETS[setId].nm : setId;
      [[0.6, "60", REWARD.set60], [0.8, "80", REWARD.set80], [1, "100", REWARD.set100]].forEach(([th, k, base]) => {
        if (pct + 1e-9 >= th && !s.rw["set:" + setId + ":" + k]) { earnOnce(s, "set:" + setId + ":" + k, base, "模試「" + nm + "」" + k + "%以上"); out.tiers.push(k); }
      });
    });
    evBump("chemSet", 1);
    out.lvUp = level().lv > lvBefore;
    return out;
  }
  /* ★★ 2026-10-06c 確認テスト（問題セットをぜんぶ習得したあとの全問テスト）。全問正解で合格・ごほうびは1回（rw["cf:<id>"]） */
  function finishConfirm(gid, score, total) {
    const g = groupById(gid), out = { pass: false, got: 0, first: false };
    if (!g) return out;
    out.pass = total >= g.ids.length && score >= total;
    mut((s) => {
      s.cf = (s.cf && typeof s.cf === "object" && !Array.isArray(s.cf)) ? s.cf : {};
      const c = s.cf[gid] = s.cf[gid] || { n: 0, best: 0, pass: 0 };
      c.n = (c.n || 0) + 1; c.best = Math.max(c.best || 0, total ? score / total : 0); c.at = Date.now();
      if (out.pass && !c.pass) c.pass = Date.now();
      s.xp = (s.xp || 0) + 20 + score * 2;
      if (out.pass && !g.view && !gotMark(s, "cf", g)) { out.got = earnOnce(s, "cf:" + gid, groupReward(g).cf, "確認テスト「" + g.nm + "」全問正解"); out.first = true; }
    });
    return out;
  }
  /* ★★ 2026-10-06c ランダム10問（MagiLex のミックス問題と同じ：90%以上・全問正解で<b>毎回</b>もらえる） */
  function finishMix(n, ok) {
    if (n < 10) return 0;
    const p = ok / n, base = p >= 1 ? REWARD.mix100 : p >= 0.9 ? REWARD.mix90 : 0;
    if (!base) return 0;
    return earn(base, "ランダム10問 " + (p >= 1 ? "全問正解" : "90%以上"));
  }
  /* ★★ 2026-10-06c 問題セットを入れる前に完全習得していたセットのぶんを渡す（起動・同期のあと）。
     ★ 渡すものが無いときは書かない（開いただけで記録が新しくなり、ほかの端末のぶんを上書きしないように） */
  function catchUpGroups() {
    const s0 = get();
    const need = groups().filter((g) => !g.view && !gotMark(s0, "gm", g) && g.ids.every((x) => isMas(s0, x)));
    if (!need.length) return [];
    const got = [];
    mut((s) => { need.forEach((g) => { const mk = "gm:" + g.id; if (!gotMark(s, "gm", g) && g.ids.every((x) => isMas(s, x))) { earnOnce(s, mk, groupReward(g).gm, "問題セット「" + g.nm + "」完全習得"); got.push(g.nm); } }); });
    return got;
  }
  function bestRun(setId) { let b = null; (get().runs || []).forEach((r) => { if (r.set === setId && (!b || r.score / r.total > b.score / b.total)) b = r; }); return b; }
  function setUns(id, v) { mut((s) => { const r = s.q[id]; if (!r) return; r.uns = v ? 1 : 0; if (v) r.due = Math.min(r.due || Infinity, dayStart() + DAY); }); }
  function toggleBm(id) { return mut((s) => { if (s.bm[id]) { delete s.bm[id]; s.dm[id] = Date.now(); return false; } s.bm[id] = Date.now(); delete s.dm[id]; return true; }); }
  function setMemo(id, t) { mut((s) => { if (t && t.trim()) s.memo[id] = { t: t.slice(0, 2000), at: Date.now() }; else if (s.memo[id]) s.memo[id] = { t: "", at: Date.now() }; }); }
  function setCombo(n) { mut((s) => { s.best = s.best || {}; if (n > (s.best.combo || 0)) s.best.combo = n; }); }
  function setSetting(k, v) { mut((s) => { s.set[k] = v; }); }
  /* ★★ 2026-10-12 全部リセットも「消した時刻」を残す（残さないと同期でクラウドの記録が混ざって元にもどる）。
     XEVA・受け取ったごほうびの印（rw）はこれまでどおり残す＝全部リセットではごほうびは再受け取りできない */
  function resetAll() {
    const old = get(), now = Date.now();
    const rr = Object.assign({}, old.rr || {}, { "run:*": now, "memo:*": now, "bm:*": now, "days:*": now });
    try { localStorage.setItem(KEY, JSON.stringify(Object.assign(fresh(), { rw: old.rw, rq: { "*": now }, rr, xp: old.xp, set: old.set, at: now }))); } catch (e) {}
    reload();
  }
  /* ══ ★★ 2026-10-12 セットごとのリセット（ご指定「それぞれでリセットして再習得と再報酬受け取りを可能に」）══
     ・問題の記録（正解数・習熟レベル・復習の予定・あやしい）を消して「未解答」へ
     ・ごほうびの印：はじめての正解（first:問題）・完全習得（gm:セット）・確認テスト（cf:セット）・関連問題のセットは単元マスター（topic:単元）
       → もう一度習得すると、またもらえる。ブックマーク・メモ・XEVA・レベルはそのまま。
     ★ 消した時刻を rq[問題] / rr[印] に残す。xeva-cloud.js の mergeChem がそれより古い記録・印を捨てる（ほかの端末から戻らない）。 */
  function tombs(s) { if (!s.rq || typeof s.rq !== "object" || Array.isArray(s.rq)) s.rq = {}; if (!s.rr || typeof s.rr !== "object" || Array.isArray(s.rr)) s.rr = {}; }
  function dropMark(s, mk, now) { delete s.rw[mk]; s.rr[mk] = now; }
  function resetGroup(gid) {
    const g = groupById(gid); if (!g) return 0;
    const now = Date.now();
    mut((s) => {
      tombs(s);
      g.ids.forEach((id) => { delete s.q[id]; s.rq[id] = now; dropMark(s, "first:" + id, now); });
      ["gm", "cf"].forEach((kind) => {
        dropMark(s, kind + ":" + g.id, now);
        /* 分ける前の「大問まるごと」の印（gm:s:s1 など）は、ほかの分けたセットの印に移してから消す */
        if (g.part) {
          const lk = kind + ":s:" + g.set, t = s.rw[lk];
          if (t) { groups().forEach((x) => { if (x.set === g.set && x.part && x.id !== g.id && !s.rw[kind + ":" + x.id]) s.rw[kind + ":" + x.id] = t; }); dropMark(s, lk, now); }
        }
      });
      if (s.cf && typeof s.cf === "object") delete s.cf[g.id];
      if (g.kind === "r") dropMark(s, "topic:" + g.t, now);
    });
    return g.ids.length;
  }
  /* 本番セット（時間を計る本番モード）の記録と、60%・80%・100% のごほうびの印をリセット */
  function resetExam(setId) {
    const now = Date.now();
    mut((s) => {
      tombs(s);
      s.runs = (s.runs || []).filter((r) => r.set !== setId); s.rr["run:" + setId] = now;
      ["60", "80", "100"].forEach((k) => dropMark(s, "set:" + setId + ":" + k, now));
    });
  }
  /* ★★ 2026-10-12 習得まで（ご指定「それぞれの問題で完全習得までの期間をコンパクトに」）
     習得＝日をあけて2回、ヒントなしで正解（同じ日のうちは1段しか上がらない）。
     → { done:習得ずみ, need:あと何回（日をかえて）正解するか, days:最短で何日後に習得できるか（0＝今日） } */
  function masterEta(id) {
    const r = rec(id);
    if (r && r.n && (r.lv || 0) >= 2 && r.last) return { done: true, need: 0, days: 0 };
    const lv = r && r.n && r.last ? (r.lv || 0) : 0;
    const need = Math.max(1, 2 - lv);
    const canToday = !(r && r.lastOk === today());
    return { done: false, need, days: canToday ? need - 1 : need };
  }

  /* ══ 出題する問題をえらぶ ══ */
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function build(mode, opt) {
    opt = opt || {};
    const s = get(), N = opt.n || 10;
    const notMas = (id) => { const r = s.q[id]; return !(r && (r.lv || 0) >= 2 && r.last); };
    /* ★★ 2026-10-12 まだ「習得中」になっていない（未解答・最後にまちがえた）＝今日すすめられる問題 */
    const notYet = (id) => { const r = s.q[id]; return !(r && r.n && r.last); };
    const only = (ids) => opt.only === "un" ? ids.filter(notMas) : opt.only === "fresh" ? ids.filter(notYet) : ids;
    if (mode === "list") { const l = (opt.ids || []).filter((id) => D.BY[id]); return opt.shuffle ? shuffle(l) : l; }
    /* ★★ 2026-10-06c 出題はシャッフル（ご指定）。本番モード（時間を計る）だけは本番どおりの順番（shuffle を渡さない） */
    if (mode === "set") { const ids = only((D.SETS[opt.set] ? D.SETS[opt.set].ids : []).slice()); return opt.shuffle ? shuffle(ids) : ids; }
    if (mode === "group") { const g = groupById(opt.g); const ids = only(g ? g.ids.slice() : []); return opt.keep ? ids : shuffle(ids); }
    if (mode === "due") return dueList().slice(0, opt.n || 30);
    if (mode === "wrong") return shuffle(wrongList()).slice(0, opt.n || 30);
    if (mode === "unsure") return shuffle(unsureList()).slice(0, opt.n || 30);
    if (mode === "bm") return bmList();
    if (mode === "topic") {
      let ids = D.Q.filter((x) => x.t === opt.t).sort((a, b) => (a.g === b.g ? 0 : a.g === "o" ? -1 : 1)).map((x) => x.id);
      ids = only(ids);
      return opt.shuffle ? shuffle(ids) : ids;
    }
    if (mode === "field") return shuffle(D.Q.filter((x) => x.f === opt.f && notMas(x.id)).map((x) => x.id)).slice(0, N);
    if (mode === "weak") {
      const seen = D.Q.filter((x) => { const r = s.q[x.id]; return r && r.n && notMas(x.id); });
      seen.sort((a, b) => (s.q[a.id].ok / s.q[a.id].n) - (s.q[b.id].ok / s.q[b.id].n));
      let ids = seen.map((x) => x.id).slice(0, N);
      if (ids.length < N) {
        const ts = Object.keys(D.T).map((t) => ({ t, st: topicStat(t) })).filter((o) => o.st.acc != null).sort((a, b) => a.st.acc - b.st.acc);
        ts.forEach((o) => { D.Q.forEach((x) => { if (ids.length < N && x.t === o.t && ids.indexOf(x.id) < 0 && notMas(x.id)) ids.push(x.id); }); });
      }
      return shuffle(ids);
    }
    if (mode === "random") return shuffle(D.Q.map((x) => x.id)).slice(0, N);
    /* おすすめ：復習（期限の来たもの）→ まだ解いていない問題（改題を先に・手をつけていない単元から）→ 苦手 */
    const due = dueList();
    const out = due.slice(0, Math.max(0, Math.min(due.length, Math.ceil(N * 0.4))));
    const fresh_ = D.Q.filter((x) => !(s.q[x.id] && s.q[x.id].n) && out.indexOf(x.id) < 0);
    const tSeen = {}; Object.keys(D.T).forEach((t) => { tSeen[t] = topicStat(t).seen; });
    fresh_.sort((a, b) => (a.g === b.g ? 0 : a.g === "o" ? -1 : 1) || tSeen[a.t] - tSeen[b.t]);
    const used = {}; out.forEach((id) => { used[D.BY[id].t] = (used[D.BY[id].t] || 0) + 1; });
    /* 同じ単元ばかりにならないよう、1単元あたり2問まで（足りなければ解禁） */
    for (let pass = 0; pass < 2 && out.length < N; pass++) {
      fresh_.forEach((x) => { if (out.length >= N || out.indexOf(x.id) >= 0) return; if (pass === 0 && (used[x.t] || 0) >= 2) return; out.push(x.id); used[x.t] = (used[x.t] || 0) + 1; });
    }
    if (out.length < N) build("weak", { n: N }).forEach((id) => { if (out.length < N && out.indexOf(id) < 0) out.push(id); });
    if (out.length < N) shuffle(D.Q.map((x) => x.id)).forEach((id) => { if (out.length < N && out.indexOf(id) < 0) out.push(id); });
    const head = out.slice(0, Math.min(due.length, out.length)), tail = shuffle(out.slice(head.length));
    return head.concat(tail);
  }
  /* まちがえたあとに出す「類題」 */
  function pickRelated(id, exclude) {
    const q = D.BY[id]; if (!q) return null;
    const s = get(), ex = exclude || [];
    const c = (q.rel || []).filter((x) => ex.indexOf(x) < 0 && D.BY[x]);
    c.sort((a, b) => { const ra = s.q[a], rb = s.q[b]; const sa = ra && ra.n ? ((ra.lv || 0) >= 2 ? 2 : 1) : 0, sb = rb && rb.n ? ((rb.lv || 0) >= 2 ? 2 : 1) : 0; return sa - sb; });
    return c[0] || null;
  }

  /* ── バッジ ── */
  function badges() {
    const s = get(), tt = totals(), st = Math.max(streak(), bestStreak());
    const topicsTried = Object.keys(D.T).filter((t) => topicStat(t).seen > 0).length;
    const masT = Object.keys(D.T).filter((t) => !!s.rw["topic:" + t]).length;
    const runs = s.runs || [];
    return [
      { id: "first", ic: "🌱", nm: "はじめの一歩", sub: "1問 正解する", ok: tt.ok >= 1 },
      { id: "n50", ic: "✏️", nm: "コツコツ50", sub: "50回 解答する", ok: tt.n >= 50 },
      { id: "n200", ic: "📚", nm: "演習の鬼", sub: "200回 解答する", ok: tt.n >= 200 },
      { id: "combo10", ic: "🔥", nm: "10連続正解", sub: "1回の演習で10問続けて正解", ok: (s.best && s.best.combo || 0) >= 10 },
      { id: "set1", ic: "📝", nm: "模試デビュー", sub: "模試をやりとげる", ok: runs.length >= 1 },
      { id: "set80", ic: "🎯", nm: "合格ライン", sub: "模試で 80% 以上", ok: runs.some((r) => r.total && r.score / r.total >= 0.8) },
      { id: "perfect", ic: "👑", nm: "パーフェクト", sub: "模試で満点", ok: runs.some((r) => r.total && r.score === r.total) },
      { id: "allT", ic: "🗺️", nm: "全単元に挑戦", sub: Object.keys(D.T).length + "単元すべてで1問以上", ok: topicsTried >= Object.keys(D.T).length },
      { id: "mas1", ic: "🏅", nm: "単元マスター", sub: "1つの単元をすべて習得", ok: masT >= 1 },
      { id: "mas5", ic: "🏆", nm: "5単元マスター", sub: "5つの単元をすべて習得", ok: masT >= 5 },
      { id: "st3", ic: "📅", nm: "3日連続", sub: "3日続けて学習", ok: st >= 3 },
      { id: "st7", ic: "🌟", nm: "1週間連続", sub: "7日続けて学習", ok: st >= 7 },
    ];
  }

  window.addEventListener("xeva:synced", () => { reload(); });
  window.addEventListener("storage", (e) => { if (e.key === KEY) reload(); });

  window.MCL = Object.assign(window.MCL || {}, {
    KEY, REWARD, IV, DAY, get, reload, save, mut, today, dayStart,
    mult, evName, balance, earn, takeEarned,
    chem, fmt, fmtOpt, plain, esc, parseNum, judge, judgeNum, answerText,
    rec, status, isDue, idsOf, topicStat, fieldStat, totals, dueList, wrongList, unsureList, bmList, dueForecast,
    streak, bestStreak, todayCount, level, answer, finishSet, bestRun, setUns, toggleBm, setMemo, setCombo, setSetting, resetAll, resetGroup, resetExam, masterEta,
    build, pickRelated, shuffle, badges,
    groups, groupById, groupsOf, groupStat, groupReward, volMul, finishConfirm, finishMix, catchUpGroups, qNo, isCalc, groupHasCalc, groupCalcN, isStd,
  });
})();
