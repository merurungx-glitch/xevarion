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
      for (let i = 0; i < ids.length - 600; i++) { const t = s.tk[ids[i]]; if (t.st !== "open") delete s.tk[ids[i]]; }
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
    for (const l of lines) for (const c of l.cb) if (!B.comboOk(race, l.type, c)) return { err: "invalid" };
    const ok = await B.clock.sync();
    if (!ok) return { err: "offline" };
    if (B.clock.now() + 1500 >= N.closeAt(r)) return { err: "closed" };
    if (B.clock.now() < N.saleAt(r)) return { err: "notyet" };   /* ★★ 2026-10-21 発売はレースの日の 0:00 から */
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
      s.tk[id] = tk; made.push(tk);
      s.st.bet += tk.cost; s.st.n += 1;
    });
    B.save(s);
    try { if (window.XEVA.event) window.XEVA.event.bump("derbyBet", made.length); } catch (e) {}
    return { ok: true, tickets: made, cost: cost };
  };

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
  /* 確定したレースの馬券をまとめて精算する（index と race を読む）。返す：精算した馬券 */
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
      /* ★★ 2026-10-21 精算はオンラインのときだけ：サーバーの時刻で「次の日の 0:00」を確かめ、
         ほかの端末で精算した馬券を先に取りこむ（mergeDerby で精算ずみが勝つ）＝二重に払い戻さない */
      if (!(await B.clock.sync())) return [];
      try { const XC = window.XevaCloud; if (XC && XC.pullNow && (!XC.isLoggedIn || XC.isLoggedIn())) await XC.pullNow(); } catch (e) {}
      const races = {};
      for (const tk of due) {
        if (races[tk.rid]) continue;
        try { races[tk.rid] = await N.race(tk.rid, true); } catch (e) {}
      }
      const s = B.load(), done = [], now = B.clock.now();
      Object.keys(s.tk).forEach((id) => {
        const tk = s.tk[id];
        if (tk.st !== "open") return;
        const race = races[tk.rid], r = byRid[tk.rid];
        if (!race || !race.result || !race.result.pay || !r) return;
        if (now < N.payAt(r)) return;                            /* ★★ 2026-10-21 払い戻しはレースの次の日の 0:00 */
        const nm = D.shortName(tk.nm);
        /* 締切のあとの時刻で記録された馬券は返還（ふつうは起きない・二重の守り） */
        if (tk.at >= N.closeAt(r)) {
          tk.st = "void"; tk.pay = tk.cost; tk.done = Date.now();
          s.st.bet -= tk.cost; done.push(tk);
          try { window.XEVA.add(tk.cost, "MagiDerby：返還（" + nm + "）", { noRank: true, noEarn: true }); } catch (e) {}
          return;
        }
        let win = 0, ref = 0; const hits = [];
        tk.cb.forEach((c) => {
          if (B.isRefund(race, tk.type, c)) { ref += tk.u; return; }
          const y = B.payFor(race, tk.type, c);
          if (y > 0) { hits.push([c, y]); win += Math.floor(tk.u * y / 100); }
        });
        if (win > 0 && tk.bo > 1) win = Math.floor(win * tk.bo);
        tk.hits = hits; tk.ref = ref; tk.pay = win + ref; tk.done = Date.now();
        tk.st = win > 0 ? "hit" : ref > 0 && ref === tk.cost ? "refund" : "miss";
        done.push(tk);
        if (win > 0) {
          s.st.ret += win; s.st.hit += 1;
          if (!s.st.best || win > s.st.best.pay) s.st.best = { pay: win, rid: tk.rid, nm: tk.nm, type: tk.type, date: tk.date };
          try { window.XEVA.add(win, "MagiDerby：払い戻し（" + nm + "・" + B.TYPE[tk.type].nm + "）", { noRank: true }); } catch (e) {}
          try { if (window.XEVA.event) window.XEVA.event.bump("derbyHit", 1); } catch (e) {}
        }
        if (ref > 0) {
          s.st.bet -= ref;
          try { window.XEVA.add(ref, "MagiDerby：返還（" + nm + "・取消/除外）", { noRank: true, noEarn: true }); } catch (e) {}
        }
      });
      if (done.length) { B.save(s); try { const XC = window.XevaCloud; if (XC && XC.flushPush) XC.flushPush(); } catch (e) {} }
      return done;
    } finally { settling = false; }
  };
})();
