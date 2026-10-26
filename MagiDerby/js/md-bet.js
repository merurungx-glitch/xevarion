/* ============================================================
   MagiDerby — 時計・馬券・払い戻し（★★ 2026-10-21 実際の GⅠ 用に作り直し）
   ------------------------------------------------------------
   ■ 時計（★ ご指定「馬券の締切は必ず出走前」）
     ・締切・発走は<b>端末の時計ではなくサーバーの時刻</b>で決める。
       同じサイトの小さなファイル（clock.txt）を no-store で聞き、返ってきた Date ヘッダー（サーバーの時刻）を基準にする。
       基準を取ったあとは performance.now()（端末の時計を変えても進み方が変わらない）で数える。
     ・購入のときは<b>その場で時刻を取り直してから</b>締切を確かめる。オフラインでは買えない（時刻を確かめられないため）。
     ・締切は実際の発走時刻の CLOSE_BEFORE 秒前（2分前）。さらに 1.5 秒の余裕を見る。
     ・万一、締切のあとの時刻で記録された馬券があれば、払い戻しのときに「返還」にする（二重の守り）。
   ■ 払い戻し：<b>実際の払戻金</b>（100円あたり）をそのまま 100 XEVA あたりの払い戻しにする（1 XEVA ＝ 1円）。
     出走取消・競走除外の馬を含む組み合わせは返還（JRA と同じ）。
   ■ 馬券は magiderby_v1（XEVARION のアカウントで同期：混ぜ方は xeva-cloud.js の mergeDerby）
   ============================================================ */
(function () {
  "use strict";
  const D = window.MD_DATA, N = window.MD_NET;
  const B = (window.MD_BET = {});

  /* ══════════ 時計 ══════════ */
  const CLK = { ok: false, base: 0, at: 0, wall: 0, syncAt: 0, busy: null, err: "" };
  async function headDate(method) {
    const url = new URL("clock.txt", location.href).href + "?__mdclock=" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const t0 = performance.now();
    const res = await fetch(url, { method: method, cache: "no-store" });
    const t1 = performance.now();
    const dh = res.headers.get("Date");
    const ms = dh ? Date.parse(dh) : NaN;
    if (!isFinite(ms)) throw new Error("no-date");
    return { srv: ms + 500 + (t1 - t0) / 2, at: t1 };     /* Date は秒の切り捨てなので +0.5秒・往復の半分 */
  }
  B.clock = {
    sync: function () {
      if (CLK.busy) return CLK.busy;
      CLK.busy = (async () => {
        try {
          let r;
          try { r = await headDate("HEAD"); } catch (e) { r = await headDate("GET"); }
          CLK.base = r.srv; CLK.at = r.at; CLK.wall = Date.now(); CLK.ok = true; CLK.syncAt = Date.now(); CLK.err = "";
          return true;
        } catch (e) { CLK.err = "offline"; return false; }
        finally { setTimeout(() => { CLK.busy = null; }, 0); }
      })();
      return CLK.busy;
    },
    now: function () {
      if (CLK.ok) return CLK.base + (performance.now() - CLK.at);
      try { const fb = window.XEVARIONFB; if (fb && fb.now) return fb.now(); } catch (e) {}
      return Date.now();
    },
    ok: () => CLK.ok,
    check: function () {
      if (!CLK.ok) return;
      const dw = Date.now() - CLK.wall, dp = performance.now() - CLK.at;
      if (Math.abs(dw - dp) > 3000 || Date.now() - CLK.syncAt > 5 * 60000) { CLK.ok = false; B.clock.sync(); }
    },
    state: CLK,
  };
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { CLK.ok = false; B.clock.sync(); } });
  window.addEventListener("online", () => B.clock.sync());
  setInterval(() => B.clock.check(), 15000);

  /* ══════════ 券種 ══════════ */
  B.TYPES = [
    { k: "win", nm: "単勝", n: 1, ord: false, d: "1着になる馬を当てる" },
    { k: "place", nm: "複勝", n: 1, ord: false, d: "3着までに入る馬を当てる（7頭以下は2着まで）" },
    { k: "waku", nm: "枠連", n: 2, ord: false, frame: true, d: "1着と2着の枠番の組み合わせ（順不同）" },
    { k: "quin", nm: "馬連", n: 2, ord: false, d: "1着と2着の馬番の組み合わせ（順不同）" },
    { k: "wide", nm: "ワイド", n: 2, ord: false, d: "3着までに入る2頭の組み合わせ（順不同）" },
    { k: "exa", nm: "馬単", n: 2, ord: true, d: "1着と2着を着順どおりに当てる" },
    { k: "trio", nm: "3連複", n: 3, ord: false, d: "1〜3着の3頭の組み合わせ（順不同）" },
    { k: "tri", nm: "3連単", n: 3, ord: true, d: "1〜3着を着順どおりに当てる" },
  ];
  B.TYPE = {}; B.TYPES.forEach((t) => { B.TYPE[t.k] = t; });
  function sortN(c) { return c.slice().sort((x, y) => x - y); }
  B.keyOf = (type, c) => (B.TYPE[type].ord ? c.join(">") : sortN(c).join("-"));
  B.comboStr = (type, c) => c.join(B.TYPE[type].ord ? "→" : "-");

  /* ══════════ オッズ（自動取得のもの）══════════
     単勝・複勝は race.odds、ほかは odds/<race_id>.json（前日〜当日）。返す：倍率（複勝・ワイドは [下限, 上限]） */
  const exMaps = new WeakMap();
  function exMap(ex, type) {
    if (!ex || !ex[type]) return null;
    let m = exMaps.get(ex); if (!m) { m = {}; exMaps.set(ex, m); }
    if (m[type]) return m[type];
    const T = B.TYPE[type], o = {};
    ex[type].forEach((row) => {
      const n = T.n, c = row.slice(0, n);
      o[B.keyOf(type, c)] = type === "wide" ? { o: [row[n], row[n + 1]], pop: row[n + 2] } : { o: row[n], pop: row[n + 1] };
    });
    return (m[type] = o);
  }
  B.oddsOf = function (race, ex, type, c) {
    if (type === "win") { const o = race && race.odds && race.odds.kind !== "yoso" && race.odds.win && race.odds.win[String(c[0])]; return o ? o[0] : 0; }
    if (type === "place") { const o = race && race.odds && race.odds.kind !== "yoso" && race.odds.place && race.odds.place[String(c[0])]; return o ? [o[0], o[1]] : 0; }
    const m = exMap(ex, type);
    const x = m && m[B.keyOf(type, c)];
    return x ? x.o : 0;
  };
  B.popOf = function (race, ex, type, c) {
    if (type === "win" || type === "place") { const o = race && race.odds && race.odds[type] && race.odds[type][String(c[0])]; return o ? o[o.length - 1] : 0; }
    const m = exMap(ex, type); const x = m && m[B.keyOf(type, c)]; return x ? x.pop : 0;
  };

  /* ══ ★★ 2026-10-27 ご報告「単勝・複勝以外のオッズが表示されない」══
     本物の枠連〜3連単のオッズは、JRA の発売が始まってから（GⅠ はおよそ前日）しか出ない
     （netkeiba も発売の前は「単勝の予想オッズ」だけ）。水曜から買えるのに、それまで何も出ていなかった。
     → 本物が無い券種は<b>単勝オッズからの試算</b>（予想オッズ）を出す。
       ・各馬の勝つ確率 p ∝ 1/単勝オッズ（合計を 1 に直す。オッズの無い馬は、いちばん人気の無い馬の半分）
       ・2着・3着は「残った馬の中で勝つ確率」の順に決まるとして（ハービルの式）組み合わせの確率を出す
       ・倍率 ＝ 払戻率 ÷ 確率（JRA の払戻率：複勝 80%・枠連・馬連・ワイド 77.5%・馬単・3連複 75%・3連単 72.5%）。10円単位で切り捨て・1.0倍から
       ・複勝とワイドは実物と同じ「下限〜上限」（いっしょに来る馬で配当が変わるため、その幅を出す）
     返す形は odds/<id>.json と同じ（kind:"est"）＋ place（{馬番:[下限,上限,人気]}）。本物が届いた券種は本物が勝つ（B.oddsAny）。 */
  const RET = { place: 0.8, waku: 0.775, quin: 0.775, wide: 0.775, exa: 0.75, trio: 0.75, tri: 0.725 };
  const estMemo = new WeakMap();
  const odd1 = (x) => Math.max(1, Math.floor(x * 10 + 1e-9) / 10);
  function popRank(rows, at) {
    rows.sort((a, b) => a[at] - b[at]);
    rows.forEach((x, i) => x.push(i + 1));
    return rows;
  }
  B.est = function (race) {
    if (!race) return null;
    const memo = estMemo.get(race); if (memo !== undefined) return memo;
    const ents = N.runners(race).filter((e) => !e.cx && e.no);
    const n = ents.length;
    let out = null;
    if (n >= 2) {
      let q = ents.map((e) => { const o = N.winOdds(race, e); return o && Number(o[0]) > 0 ? 1 / Number(o[0]) : 0; });
      const have = q.filter((x) => x > 0);
      if (have.length) {
        const qmin = Math.min.apply(null, have);
        q = q.map((x) => x || qmin * 0.5);
        const sq = q.reduce((a, b) => a + b, 0), p = q.map((x) => x / sq), no = ents.map((e) => e.no);
        out = { kind: "est", at: (race.odds && race.odds.at) || "", base: (race.odds && race.odds.kind) || "", place: {} };
        /* 1着→2着（P2）・1→2→3着（P3） */
        const P2 = [], P3 = {};
        for (let i = 0; i < n; i++) { P2[i] = []; for (let j = 0; j < n; j++) P2[i][j] = i === j ? 0 : p[i] * p[j] / Math.max(1e-9, 1 - p[i]); }
        const exa = [], quin = [], tri = [], trio = [], wide = [];
        const Q = []; for (let i = 0; i < n; i++) { Q[i] = []; for (let j = 0; j < n; j++) Q[i][j] = P2[i][j] + P2[j][i]; }
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
          if (i === j) continue;
          exa.push([no[i], no[j], odd1(RET.exa / P2[i][j])]);
          if (i < j) quin.push([no[i], no[j], odd1(RET.quin / Q[i][j])]);
          if (n >= 3) for (let k = 0; k < n; k++) {
            if (k === i || k === j) continue;
            const v = P2[i][j] * p[k] / Math.max(1e-9, 1 - p[i] - p[j]);
            P3[i + "," + j + "," + k] = v;
            tri.push([no[i], no[j], no[k], odd1(RET.tri / v)]);
          }
        }
        out.exa = popRank(exa, 2); out.quin = popRank(quin, 2);
        if (n >= 3) {
          /* 3連複・ワイド（2頭がそろって3着まで）・3着までに入る確率 */
          const T = (a, b, c) => P3[a + "," + b + "," + c] + P3[a + "," + c + "," + b] + P3[b + "," + a + "," + c] + P3[b + "," + c + "," + a] + P3[c + "," + a + "," + b] + P3[c + "," + b + "," + a];
          const W = []; for (let i = 0; i < n; i++) W[i] = new Array(n).fill(0);
          const top3 = new Array(n).fill(0);
          for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (let k = j + 1; k < n; k++) {
            const v = T(i, j, k);
            trio.push([no[i], no[j], no[k], odd1(RET.trio / v)]);
            W[i][j] += v; W[i][k] += v; W[j][k] += v;
            top3[i] += v; top3[j] += v; top3[k] += v;
          }
          out.trio = popRank(trio, 3); out.tri = popRank(tri, 3);
          /* ワイド：買われ方＝当たる確率に比例（1組の取り分 u＝W/3）。3着の馬 k で、当たる3組の取り分が変わる → 下限〜上限 */
          const u = (a, b) => (a < b ? W[a][b] : W[b][a]) / 3;
          for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
            let lo = Infinity, hi = 0;
            for (let k = 0; k < n; k++) {
              if (k === i || k === j) continue;
              const o = 1 + (RET.wide - u(i, j) - u(i, k) - u(j, k)) / (3 * Math.max(1e-9, u(i, j)));
              lo = Math.min(lo, o); hi = Math.max(hi, o);
            }
            wide.push([no[i], no[j], odd1(lo), odd1(hi)]);
          }
          out.wide = popRank(wide, 2);
          /* 複勝：8頭以上は3着まで・5〜7頭は2着まで（4頭以下は発売なし） */
          if (n >= 5) {
            const kk = n >= 8 ? 3 : 2;
            const pp = kk === 3 ? top3 : p.map((x, i) => { let s = 0; for (let j = 0; j < n; j++) s += Q[i][j]; return s; });
            const s = pp.map((x) => x / kk);
            const rows = [];
            for (let i = 0; i < n; i++) {
              const ot = s.filter((x, j) => j !== i).sort((a, b) => b - a);
              const big = ot.slice(0, kk - 1).reduce((a, b) => a + b, 0), small = ot.slice(-(kk - 1)).reduce((a, b) => a + b, 0);
              rows.push([no[i], odd1(1 + (RET.place - s[i] - big) / (kk * s[i])), odd1(1 + (RET.place - s[i] - small) / (kk * s[i]))]);
            }
            popRank(rows, 1).forEach((x) => { out.place[String(x[0])] = [x[1], x[2], x[3]]; });
          }
        }
        /* 枠連：枠番が出ていれば（同じ枠どうし＝ゾロ目は、その枠に2頭以上いるときだけ） */
        if (ents.every((e) => e.waku)) {
          const wk = ents.map((e) => e.waku), F = {};
          for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
            const a = Math.min(wk[i], wk[j]), b = Math.max(wk[i], wk[j]), key = a + "-" + b;
            F[key] = (F[key] || 0) + Q[i][j];
          }
          out.waku = popRank(Object.keys(F).map((k) => { const ab = k.split("-").map(Number); return [ab[0], ab[1], odd1(RET.waku / F[k])]; }), 2);
        }
      }
    }
    estMemo.set(race, out);
    return out;
  };
  /* 本物があれば本物、無ければ試算。返す：{ o: 倍率（複勝・ワイドは [下限, 上限]）, est: 試算か } か null。
     ★ 単勝の「予想オッズ」（発売の前の netkeiba の予想）も est あつかい */
  B.oddsAny = function (race, ex, type, c) {
    const real = B.oddsOf(race, ex, type, c);
    if (real) return { o: real, est: false };
    if (type === "win") {
      const e = N.runners(race).find((x) => x.no === c[0] && !x.cx);
      const o = e && N.winOdds(race, e);
      return o ? { o: Number(o[0]), est: true } : null;
    }
    const E = B.est(race); if (!E) return null;
    if (type === "place") { const o = E.place[String(c[0])]; return o ? { o: [o[0], o[1]], est: true } : null; }
    const m = exMap(E, type), x = m && m[B.keyOf(type, c)];
    return x ? { o: x.o, est: true } : null;
  };

  /* ══════════ 買い目の展開（通常・ボックス・ながし・フォーメーション）══════════
     sel：
       通常 norm  … { cols: [[a],[b],[c]] }（単勝・複勝は cols[0] に何頭でも＝1頭ずつ別の買い目）
       ボックス box … { pick: [..] }
       ながし nag  … { axis: [..], part: [..], pos: "1"|"2"|"3"|"12"|"13"|"23"|"m"（馬単・3連単の軸の着順／m＝マルチ）}
       フォーメーション form … { cols: [[..],[..],[..]] } */
  function perms(arr, k) {
    const out = [];
    (function rec(cur, rest) { if (cur.length === k) { out.push(cur.slice()); return; } for (let i = 0; i < rest.length; i++) { cur.push(rest[i]); rec(cur, rest.slice(0, i).concat(rest.slice(i + 1))); cur.pop(); } })([], arr);
    return out;
  }
  function combs(arr, k) {
    const out = [], a = sortN(arr);
    (function rec(st, cur) { if (cur.length === k) { out.push(cur.slice()); return; } for (let i = st; i < a.length; i++) { cur.push(a[i]); rec(i + 1, cur); cur.pop(); } })(0, []);
    return out;
  }
  B.expand = function (type, mode, sel) {
    const T = B.TYPE[type], k = T.n;
    let out = [];
    const okC = (c) => (T.frame ? c.length === k : new Set(c).size === c.length);
    if (k === 1) { const xs = mode === "box" ? sel.pick || [] : (sel.cols && sel.cols[0]) || []; return sortN(Array.from(new Set(xs))).map((x) => [x]); }
    if (mode === "norm") { const c = (sel.cols || []).slice(0, k).map((col) => col && col[0]); if (c.length === k && c.every((x) => x) && okC(c)) out.push(T.ord ? c : sortN(c)); }
    else if (mode === "box") {
      const xs = Array.from(new Set(sel.pick || []));
      if (T.frame) { const a = sortN(xs); for (let i = 0; i < a.length; i++) for (let j = i; j < a.length; j++) out.push([a[i], a[j]]); }
      else out = T.ord ? perms(xs, k) : combs(xs, k);
    } else if (mode === "nag") {
      const ax = Array.from(new Set(sel.axis || [])), pt = Array.from(new Set(sel.part || [])).filter((x) => T.frame || ax.indexOf(x) < 0);
      const pos = sel.pos || (T.ord ? "1" : "m");
      if (k === 2 && ax.length >= 1) {
        const A = ax[0];
        pt.forEach((x) => {
          if (!T.ord) out.push(sortN([A, x]));
          else if (pos === "1") out.push([A, x]); else if (pos === "2") out.push([x, A]); else { out.push([A, x]); out.push([x, A]); }
        });
      } else if (k === 3 && ax.length === 1) {
        const A = ax[0];
        if (!T.ord) combs(pt, 2).forEach((pq) => out.push(sortN([A].concat(pq))));
        else perms(pt, 2).forEach((pq) => {
          if (pos === "1") out.push([A, pq[0], pq[1]]); else if (pos === "2") out.push([pq[0], A, pq[1]]); else if (pos === "3") out.push([pq[0], pq[1], A]);
          else { out.push([A, pq[0], pq[1]]); out.push([pq[0], A, pq[1]]); out.push([pq[0], pq[1], A]); }
        });
      } else if (k === 3 && ax.length >= 2) {
        const A = ax[0], Bx = ax[1];
        pt.forEach((x) => {
          if (!T.ord) out.push(sortN([A, Bx, x]));
          else if (pos === "12") out.push([A, Bx, x]); else if (pos === "13") out.push([A, x, Bx]); else if (pos === "23") out.push([x, A, Bx]);
          else perms([A, Bx, x], 3).forEach((p) => out.push(p));
        });
      }
    } else if (mode === "form") {
      const cols = (sel.cols || []).slice(0, k);
      if (cols.length === k && cols.every((c) => c && c.length)) {
        if (k === 2) cols[0].forEach((a) => cols[1].forEach((b) => { const c = [a, b]; if (okC(c)) out.push(T.ord ? c : sortN(c)); }));
        else cols[0].forEach((a) => cols[1].forEach((b) => cols[2].forEach((cc) => { const c = [a, b, cc]; if (okC(c)) out.push(T.ord ? c : sortN(c)); })));
      }
    }
    const seen = new Set(), res = [];
    out.forEach((c) => { if (!okC(c)) return; const kk = B.keyOf(type, c); if (seen.has(kk)) return; seen.add(kk); res.push(c); });
    return res;
  };
  B.MODES = { norm: "通常", box: "ボックス", nag: "ながし", form: "フォーメーション" };
  B.lineLabel = function (line) {
    const T = B.TYPE[line.type];
    let s = T.nm + (line.mode && line.mode !== "norm" ? " " + B.MODES[line.mode] : "");
    if (line.mode === "nag" && line.sel && T.n >= 2) {
      const p = line.sel.pos || "m";
      s += T.ord ? { "1": "（1着軸）", "2": "（2着軸）", "3": "（3着軸）", "12": "（1・2着軸）", "13": "（1・3着軸）", "23": "（2・3着軸）", "m": "（マルチ）" }[p] || "" : (line.sel.axis || []).length >= 2 ? "（軸2頭）" : "（軸1頭）";
    }
    return s;
  };
  /* 出走できる馬番・枠番（取消・除外を除く） */
  B.validSets = function (race) {
    const ents = N.runners(race), nos = new Set(), frames = {};
    ents.forEach((e) => { if (!e.cx && e.no) { nos.add(e.no); frames[e.waku] = (frames[e.waku] || 0) + 1; } });
    return { nos: nos, frames: frames };
  };
  B.comboOk = function (race, type, c) {
    const v = B.validSets(race);
    if (B.TYPE[type].frame) { if (c[0] === c[1]) return (v.frames[c[0]] || 0) >= 2; return c.every((f) => v.frames[f]); }
    return c.every((x) => v.nos.has(x));
  };

  /* ══════════ セーブ（magiderby_v1）══════════ */
  const KEY = "magiderby_v1";
  B.KEY = KEY;
  function fresh() { return { v: 2, tk: {}, st: { bet: 0, ret: 0, n: 0, hit: 0, best: null }, fav: {}, mk: {}, opt: { snd: 1 }, at: 0 }; }
  B.load = function () {
    try {
      const r = localStorage.getItem(KEY);
      if (r) { const s = JSON.parse(r); if (s && typeof s === "object") { const f = fresh(); Object.keys(f).forEach((k) => { if (s[k] == null) s[k] = f[k]; }); return s; } }
    } catch (e) {}
    return fresh();
  };
  B.save = function (s) {
    s.at = Date.now();
    const ids = Object.keys(s.tk);
    if (ids.length > 600) {
      ids.sort((a, b) => (s.tk[a].at || 0) - (s.tk[b].at || 0));
      for (let i = 0; i < ids.length - 600; i++) { const t = s.tk[ids[i]]; if (t.st !== "open" && t.st !== "ready") delete s.tk[ids[i]]; }
    }
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
    try { window.dispatchEvent(new CustomEvent("md:save")); } catch (e) {}
  };
  B.raceSpent = function (rid) { const s = B.load(); let t = 0; Object.keys(s.tk).forEach((id) => { const k = s.tk[id]; if (k.rid === rid && k.st !== "void") t += k.cost; }); return t; };

  /* ══════════ 購入 ══════════
     r：index のレース、race：race/<id>.json。lines：[{ type, mode, sel, cb:[[..]], u（1点あたり XEVA）}]
     失敗は { err: "offline" | "notyet" | "closed" | "nodraw" | "balance" | "cap" | "empty" | "invalid" } */
  B.buy = async function (r, race, lines) {
    lines = (lines || []).filter((l) => l && l.cb && l.cb.length && l.u >= D.UNIT);
    if (!lines.length) return { err: "empty" };
    if (!r || !r.rid || !race || r.st === "result") return { err: "closed" };
    if (navigator.onLine === false) return { err: "offline" };
    const ents = race.entries || [];
    if (!ents.length || !ents.every((e) => e.cx || e.no)) return { err: "nodraw" };
    /* ★★ 2026-10-24 枠順の発表前（N.betRace の仮の番号）は枠連を買えない（枠が無い） */
    if (race.pre && lines.some((l) => B.TYPE[l.type].frame)) return { err: "nodraw" };
    for (const l of lines) for (const c of l.cb) if (!B.comboOk(race, l.type, c)) return { err: "invalid" };
    const ok = await B.clock.sync();
    if (!ok) return { err: "offline" };
    if (B.clock.now() + 1500 >= N.closeAt(r)) return { err: "closed" };
    if (!N.onSale(r, B.clock.now())) return { err: "notyet" };   /* ★★ 2026-10-22 発売の時間は JRA と同じ（N.saleWins・サーバーの時刻） */
    const cost = lines.reduce((t, l) => t + l.cb.length * l.u, 0);
    if (B.raceSpent(r.rid) + cost > D.MAX_PER_RACE) return { err: "cap", cost: cost };
    const bal = window.XEVA ? window.XEVA.getBalance() : 0;
    if (bal < cost) return { err: "balance", cost: cost, bal: bal };
    if (!window.XEVA || !window.XEVA.spend(cost)) return { err: "balance", cost: cost, bal: bal };
    const at = Math.round(B.clock.now());
    let bo = 1; try { bo = window.XEVA.event ? window.XEVA.event.boost("derby") || 1 : 1; } catch (e) {}
    const s = B.load(), made = [];
    lines.forEach((l) => {
      const id = "t" + at.toString(36) + Math.random().toString(36).slice(2, 7);
      const tk = { id: id, rid: r.rid, nm: r.nm, date: r.date, post: r.post, place: r.place, surf: r.surf, dist: r.dist, at: at,
        type: l.type, mode: l.mode || "norm", sel: l.sel || {}, cb: l.cb, u: l.u, cost: l.cb.length * l.u, bo: bo, st: "open", pay: 0, hits: [], ref: 0 };
      /* ★★ 2026-10-24 枠順の発表前に買った券：仮の番号 → 馬（pm＝hid・pn＝馬名）。発表されたら B.fixPre で本当の馬番へ */
      if (race.pre) { tk.pm = {}; tk.pn = {}; (race.entries || []).forEach((e) => { if (e.pno) { tk.pm[e.pno] = e.hid; tk.pn[e.pno] = e.nm; } }); }
      /* ★★ 2026-10-26 ご報告「馬券の結果で馬の名前が出ないことがある」：出馬表の控えが無い端末（同期で届いた券など）でも名前が出るよう、
         買い目に入っている馬の名前を券に残す（nn＝馬番→馬名。枠順の発表前の券は差し替えのときに B.fixPre が作る） */
      else if (!B.TYPE[l.type].frame) { const use = {}; l.cb.forEach((c) => c.forEach((x) => { use[x] = 1; })); tk.nn = {}; (race.entries || []).forEach((e) => { if (e.no && use[e.no]) tk.nn[e.no] = e.nm; }); }
      s.tk[id] = tk; made.push(tk);
      s.st.bet += tk.cost; s.st.n += 1;
    });
    B.save(s);
    try { if (window.XEVA.event) window.XEVA.event.bump("derbyBet", made.length); } catch (e) {}
    return { ok: true, tickets: made, cost: cost };
  };

  /* ══ ★★ 2026-10-24 枠順の発表前に買った券の差し替え ══
     本当の出馬表（または結果）で、全頭の馬番が出ていれば、券の買い目（cb）と選んだ馬（sel）を仮の番号から本当の馬番へ。
     出走しなくなった馬（除外・取消・出馬表にいない）を含む組は xr（返還する組の番号）に入れ、精算で返還する。
     差し替えたら pf=1（pm・pn は記録として残す）。返す：差し替えたか */
  B.fixPre = function (tk, race) {
    if (!tk || !tk.pm || tk.pf || !race) return false;
    const ents = N.runners(race), act = ents.filter((e) => !e.cx);
    if (!act.length || act.some((e) => !e.no)) return false;          /* まだ発表前 */
    const byHid = {}; ents.forEach((e) => { if (e.hid) byHid[e.hid] = e; });
    const T = B.TYPE[tk.type];
    const to = (p) => { const e = byHid[tk.pm[p]]; return e && !e.cx && e.no ? e.no : 0; };
    tk.nn = {}; Object.keys(tk.pm).forEach((p) => { const x = to(p); if (x) tk.nn[x] = tk.pn ? tk.pn[p] : ""; });   /* 馬番 → 馬名（券の表示用） */
    const xr = [];
    tk.cb = tk.cb.map((c, i) => { let m = c.map(to); if (m.some((x) => !x)) xr.push(i); else if (!T.ord) m = sortN(m); return m; });
    const ms = (a) => (Array.isArray(a) ? a.map(to) : a);
    if (tk.sel) { const s = tk.sel; tk.sel = Object.assign({}, s, { pick: ms(s.pick), axis: ms(s.axis), part: ms(s.part), cols: Array.isArray(s.cols) ? s.cols.map(ms) : s.cols }); }
    if (xr.length) tk.xr = xr;
    tk.pf = 1; tk.pfAt = Date.now();
    return true;
  };
  /* そのレースの券をまとめて差し替える（出馬表・結果を読んだとき） */
  B.fixAll = function (rid, race) {
    const s = B.load(); let n = 0;
    Object.keys(s.tk).forEach((id) => { const tk = s.tk[id]; if (tk.rid === rid && B.fixPre(tk, race)) n++; });
    if (n) { B.save(s); try { const XC = window.XevaCloud; if (XC && XC.flushPush) XC.flushPush(); } catch (e) {} }
    return n;
  };
  /* 差し替えを待っている券のレース（index で枠順が出た／結果が出たもの）を読んで差し替える */
  B.fixPending = async function (idx) {
    const s = B.load(), want = {};
    Object.keys(s.tk).forEach((id) => { const tk = s.tk[id]; if (tk.pm && !tk.pf && (tk.st === "open" || tk.st === "ready")) want[tk.rid] = 1; });
    const byRid = {}; ((idx && idx.races) || []).forEach((r) => { if (r.rid) byRid[r.rid] = r; });
    let n = 0;
    for (const rid of Object.keys(want)) {
      const r = byRid[rid]; if (!r || r.st === "entry" || r.st === "sched") continue;
      try { const race = await N.race(rid, r.st === "result", true); n += B.fixAll(rid, race); } catch (e) {}
    }
    return n;
  };
  B.isPre = (tk) => !!(tk && tk.pm && !tk.pf);

  /* ══════════ 払い戻し ══════════
     実際の払戻金（race.result.pay の y＝100円あたりの円）→ 1点 u XEVA なら u × y / 100 XEVA。 */
  B.payFor = function (race, type, c) {
    const P = race && race.result && race.result.pay && race.result.pay[type];
    if (!P) return 0;
    const key = B.keyOf(type, c);
    for (let i = 0; i < P.length; i++) if (B.keyOf(type, P[i].c) === key) return P[i].y;
    return 0;
  };
  /* 取消・除外で返還になる組み合わせか */
  B.isRefund = function (race, type, c) {
    const rows = (race && race.result && race.result.rows) || [];
    const gone = new Set(), frames = {};
    rows.forEach((x) => { if (/取消|除外/.test(x.pos)) gone.add(x.no); else frames[x.waku] = (frames[x.waku] || 0) + 1; });
    if (B.TYPE[type].frame) { if (c[0] === c[1]) return (frames[c[0]] || 0) < 2; return c.some((f) => !frames[f]); }
    return c.some((x) => gone.has(x));
  };
  /* ══ ★★ 2026-10-24 ご指定「結果はアプリを開いたときに、券をそれぞれ押して確認できるように」══
     精算を2段にした：
       ① B.settle … 結果が確定した馬券の<b>当たり・はずれ・払戻金を計算だけ</b>して（★★ 2026-10-26 から次の日の 0:00 を待たない＝結果のデータが届きしだい）
                    st="ready"（rs＝結果）にする。XEVA はまだ動かさない。
       ② B.reveal … 券を押したとき。結果を見せて、そのとき XEVA を払い戻す（st を hit / miss / refund / void に）。
     ★ 同期（xeva-cloud の mergeDerby）は open ＜ ready ＜ 確認ずみ の順に強い＝ほかの端末で確認ずみの券は、こちらで二度払い戻さない。
       確認の前に、オンラインならクラウドの最新を取りこむ（XevaCloud.pullNow）。
     ★ 古い版の端末は st="open" の券だけを精算するので、ready の券には手を出さない。 */
  let settling = false;
  B.settle = async function () {
    if (settling) return [];
    settling = true;
    try {
      const open = Object.values(B.load().tk).filter((t) => t.st === "open");
      if (!open.length) return [];
      let idx; try { idx = await N.index(); } catch (e) { return []; }
      const byRid = {}; (idx.races || []).forEach((r) => { if (r.rid) byRid[r.rid] = r; });
      const t0 = B.clock.now();
      const due = open.filter((tk) => { const r = byRid[tk.rid]; return r && r.st === "result" && t0 >= N.payAt(r); });
      if (!due.length) return [];
      /* 計算はオンラインのときだけ：サーバーの時刻で「次の日の 0:00」を確かめ、ほかの端末の券を先に取りこむ */
      if (!(await B.clock.sync())) return [];
      try { const XC = window.XevaCloud; if (XC && XC.pullNow && (!XC.isLoggedIn || XC.isLoggedIn())) await XC.pullNow(); } catch (e) {}
      const races = {};
      for (const tk of due) {
        if (races[tk.rid]) continue;
        try { races[tk.rid] = await N.race(tk.rid, true, !!byRid[tk.rid].part); } catch (e) {}   /* ★★ 2026-10-26 途中の結果は取り直す */
      }
      const s = B.load(), done = [], now = B.clock.now();
      Object.keys(s.tk).forEach((id) => {
        const tk = s.tk[id];
        if (tk.st !== "open") return;
        const race = races[tk.rid], r = byRid[tk.rid];
        if (!race || !race.result || !race.result.pay || !r) return;
        /* ★★ 2026-10-26 結果の表が途中（速報で上位だけ）のあいだは精算しない（取消・除外の返還を見落とさないため）。全頭そろったデータが届きしだい */
        if (N.partial(race)) return;
        /* ★★ 2026-10-24 枠順の発表前に買った券は、まず本当の馬番へ（結果の並びで差し替え） */
        if (tk.pm && !tk.pf && !B.fixPre(tk, race)) return;
        if (now < N.payAt(r)) return;
        let rs;
        /* 締切のあとの時刻で記録された馬券は返還（ふつうは起きない・二重の守り） */
        if (tk.at >= N.closeAt(r)) rs = { st: "void", win: 0, ref: tk.cost, pay: tk.cost, hits: [] };
        else {
          let win = 0, ref = 0; const hits = [];
          tk.cb.forEach((c, i) => {
            if ((tk.xr && tk.xr.indexOf(i) >= 0) || B.isRefund(race, tk.type, c)) { ref += tk.u; return; }   /* ★★ 2026-10-24 xr＝出走しなくなった馬を含む組（枠順の発表前に買った券） */
            const y = B.payFor(race, tk.type, c);
            if (y > 0) { hits.push([c, y]); win += Math.floor(tk.u * y / 100); }
          });
          if (win > 0 && tk.bo > 1) win = Math.floor(win * tk.bo);
          rs = { st: win > 0 ? "hit" : ref > 0 && ref === tk.cost ? "refund" : "miss", win: win, ref: ref, pay: win + ref, hits: hits };
        }
        tk.st = "ready"; tk.rs = rs; tk.rdy = Date.now();
        done.push(tk);
      });
      if (done.length) { B.save(s); try { const XC = window.XevaCloud; if (XC && XC.flushPush) XC.flushPush(); } catch (e) {} }
      return done;
    } finally { settling = false; }
  };
  /* 結果が出て、まだ確かめていない券 */
  B.readyList = function () { return Object.values(B.load().tk).filter((t) => t.st === "ready" && t.rs).sort((a, b) => (a.at || 0) - (b.at || 0)); };
  /* 券を1枚確かめる（このとき XEVA を払い戻す）。返す：確かめたあとの券（ほかの端末で確認ずみならその券） */
  const revealing = {};
  B.reveal = async function (id, opt) {
    if (revealing[id]) return null;
    revealing[id] = 1;
    try {
      if (!(opt && opt.noPull) && navigator.onLine !== false) {
        try { const XC = window.XevaCloud; if (XC && XC.pullNow && (!XC.isLoggedIn || XC.isLoggedIn())) await XC.pullNow(); } catch (e) {}
      }
      const s = B.load(), tk = s.tk[id];
      if (!tk || tk.st !== "ready" || !tk.rs) return tk || null;
      const rs = tk.rs, nm = D.shortName(tk.nm);
      tk.st = rs.st; tk.pay = rs.pay; tk.hits = rs.hits || []; tk.ref = rs.ref || 0; tk.done = Date.now(); tk.rv = 1;
      delete tk.rs;
      if (rs.st === "void") {
        s.st.bet -= tk.cost;
        try { window.XEVA.add(tk.cost, "MagiDerby：返還（" + nm + "）", { noRank: true, noEarn: true }); } catch (e) {}
      } else {
        if (rs.win > 0) {
          s.st.ret += rs.win; s.st.hit += 1;
          if (!s.st.best || rs.win > s.st.best.pay) s.st.best = { pay: rs.win, rid: tk.rid, nm: tk.nm, type: tk.type, date: tk.date };
          try { window.XEVA.add(rs.win, "MagiDerby：払い戻し（" + nm + "・" + B.TYPE[tk.type].nm + "）", { noRank: true }); } catch (e) {}
          try { if (window.XEVA.event) window.XEVA.event.bump("derbyHit", 1); } catch (e) {}
        }
        if (rs.ref > 0) {
          s.st.bet -= rs.ref;
          try { window.XEVA.add(rs.ref, "MagiDerby：返還（" + nm + "・取消/除外）", { noRank: true, noEarn: true }); } catch (e) {}
        }
      }
      B.save(s);
      try { const XC = window.XevaCloud; if (XC && XC.flushPush) XC.flushPush(); } catch (e) {}
      return tk;
    } finally { delete revealing[id]; }
  };
})();
