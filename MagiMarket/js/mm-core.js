/* ============================================================
   MagiMarket — mm-core.js（データ・時計・株の注文と約定・ジェフ戦の倍率と精算）
   ★★ 2026-11-08 新作（ご指定「新たな XEVA 運用システムとして、キオクシアの株に1株から賭けられる株取引」
                        「ジェフ千葉の試合でスポーツの賭けを XEVA で行える機能」）
   ------------------------------------------------------------
   ■ 株（キオクシア 285A・東証）… 1 XEVA ＝ 1円。1株から売り買い。手数料なし。
     ・株価は Yahoo Finance（中継をはさんで直接）→ だめなら PC の自動取得（market/kioxia.json）。
     ・★ 注文は「成行」：<b>注文した時刻（サーバーの時刻）のあとに始まった最初の1分足の始値</b>で約定する。
       （表示している株価は少し遅れているので、その場の値段で売り買いさせると、先に値動きを知っている人が得をしてしまう。
         「注文のあとの値段」で決めれば、だれも得も損もしない＝本物の成行注文と同じ考え方）
       取引の時間外（夜・土日）の注文は、次の取引日の最初の値段（寄り付き）で約定。
     ・買い：注文のときに 見込みの代金×1.15 をあずかり、約定したら差額を返す（足りないときは足す・それでも足りなければ株数を減らす）。
       売り：注文のときに株をおさえ、約定したら代金を受け取る。約定前なら取り消せる（あずかりは全部返す）。
   ■ ジェフ千葉の試合 … 勝敗・スコア・合計ゴール・ジェフの得点。倍率は J1 の順位表（得点・失点）からポアソン分布で計算（買った時の倍率で確定）。
     ・締切はキックオフ（サーバーの時刻）。結果は J リーグ公式の最終スコア（PC の自動取得 market/jef.json）。中止・延期は返還。
   ■ 記録 magimarket_v1（XEVARION のアカウントで同期・混ぜ方は xeva-cloud.js の mergeMarket＝id で和・終わった記録が勝つ）
     ★ 二重に払わないよう、約定・精算は「注文した端末」がする（24時間たってもまだなら、ほかの端末でも）＋オンラインのときは先に pullNow。
   ============================================================ */
(function () {
  "use strict";
  const MM = (window.MM = window.MM || {});
  /* 自動取得の置き場（開発中は localStorage の mm_data_base で差しかえられる） */
  const DATA = (function () { try { const o = localStorage.getItem("mm_data_base"); if (o) return String(o).replace(/\/?$/, "/"); } catch (e) {} return "https://raw.githubusercontent.com/merurungx-glitch/xevarion/magiscope-data/market/"; })();
  MM.DATA = DATA;
  const KEY = "magimarket_v1", DEV_KEY = "magimarket_dev_v1", CK = "mm_cache_v1:";
  const SYM = "285A.T";
  MM.SYM = SYM; MM.NAME = "キオクシアホールディングス"; MM.CODE = "285A";
  MM.RESERVE = 1.15;              /* 買いのあずかり（見込みの代金の何倍） */
  MM.BET_UNIT = 100; MM.BET_MAX = 100000;
  MM.QTY_MAX = 10000;

  /* ══ 端末・保存 ══ */
  function dev() {
    try { let d = localStorage.getItem(DEV_KEY); if (!d) { d = "d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); localStorage.setItem(DEV_KEY, d); } return d; } catch (e) { return "d0"; }
  }
  MM.dev = dev;
  function load() {
    let s = null; try { s = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) {}
    if (!s || typeof s !== "object") s = {};
    s.v = 1; s.ord = s.ord || {}; s.bet = s.bet || {}; s.opt = s.opt || {};
    return s;
  }
  function save(s, urgent) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
    try { window.dispatchEvent(new CustomEvent("mm:change")); } catch (e) {}
    if (urgent) { try { if (window.XevaCloud && XevaCloud.flushPush) XevaCloud.flushPush(); } catch (e) {} }
  }
  MM.load = load; MM.save = save;
  const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  /* ══ 時計（サーバーの時刻・clock.txt の Date ヘッダー）══ */
  const CLK = { ok: false, base: 0, at: 0, busy: null };
  async function headDate(method) {
    const url = new URL("clock.txt", location.href).href + "?__mmclock=" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const t0 = performance.now();
    const res = await fetch(url, { method, cache: "no-store" });
    const t1 = performance.now();
    const ms = Date.parse(res.headers.get("Date") || "");
    if (!isFinite(ms)) throw new Error("no-date");
    return { srv: ms + 500 + (t1 - t0) / 2, at: t1 };
  }
  MM.clock = {
    sync() {
      if (CLK.busy) return CLK.busy;
      CLK.busy = (async () => {
        try { let r; try { r = await headDate("HEAD"); } catch (e) { r = await headDate("GET"); } CLK.base = r.srv; CLK.at = r.at; CLK.ok = true; try { localStorage.setItem("mm_clk_v1", String(Math.round(r.srv - Date.now()))); } catch (e) {} return true; }
        catch (e) { return false; } finally { setTimeout(() => { CLK.busy = null; }, 0); }
      })();
      return CLK.busy;
    },
    now() {
      if (CLK.ok) return CLK.base + (performance.now() - CLK.at);
      try { const fb = window.XEVARIONFB; if (fb && fb.now) return fb.now(); } catch (e) {}
      let o = 0; try { o = Number(localStorage.getItem("mm_clk_v1")) || 0; } catch (e) {}
      return Date.now() + o;
    },
    ok: () => CLK.ok,
  };
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { CLK.ok = false; MM.clock.sync(); } });

  /* ══ JST の日時 ══ */
  const JST = 9 * 3600000;
  MM.jst = (ms) => { const d = new Date(ms + JST); return { y: d.getUTCFullYear(), mo: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes(), wd: d.getUTCDay() }; };
  MM.WD = ["日", "月", "火", "水", "木", "金", "土"];
  MM.hm = (ms) => { const j = MM.jst(ms); return j.h + ":" + String(j.mi).padStart(2, "0"); };
  MM.md = (ms) => { const j = MM.jst(ms); return j.mo + "/" + j.d + "(" + MM.WD[j.wd] + ")"; };
  MM.dt = (ms) => MM.md(ms) + " " + MM.hm(ms);
  /* 取引の時間（平日 9:00〜11:30・12:30〜15:30）。祝日はデータが来ないので、約定はそのぶん先になる */
  MM.marketOpen = function (ms) {
    const j = MM.jst(ms == null ? MM.clock.now() : ms), m = j.h * 60 + j.mi;
    if (j.wd === 0 || j.wd === 6) return false;
    return (m >= 540 && m < 690) || (m >= 750 && m < 930);
  };

  /* ══ 通信：自動取得のデータ（端末に控える）══ */
  function cget(k) { try { const r = localStorage.getItem(CK + k); return r ? JSON.parse(r) : null; } catch (e) { return null; } }
  function cset(k, v) { try { localStorage.setItem(CK + k, JSON.stringify({ at: Date.now(), data: v })); } catch (e) {} }
  const mem = {};
  async function getData(name, ttl) {
    const m = mem[name];
    if (m && Date.now() - m.at < ttl) return m.data;
    try {
      const r = await fetch(DATA + name + "?t=" + Math.floor(Date.now() / 60000), { cache: "no-cache" });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const j = await r.json();
      mem[name] = { at: Date.now(), data: j }; cset(name, j); MM.online = true;
      return j;
    } catch (e) {
      MM.online = false;
      if (m) return m.data;
      const c = cget(name); if (c && c.data) { mem[name] = { at: Date.now() - ttl + 30000, data: c.data }; return c.data; }
      return null;
    }
  }
  MM.peekData = (name) => { const m = mem[name]; if (m) return m.data; const c = cget(name); return c ? c.data : null; };

  /* ══ 株価（Yahoo → 中継 → 自動取得の控え）══ */
  const PROX = [
    (u) => "https://corsproxy.io/?url=" + encodeURIComponent(u),
    (u) => "https://api.allorigins.win/raw?url=" + encodeURIComponent(u),
    (u) => "https://thingproxy.freeboard.io/fetch/" + u,
  ];
  let goodProx = -1, proxDeadAt = 0;   /* 中継が全部だめだったら10分は試さない（毎回 20 秒待たされるため） */
  async function fetchTO(url, ms) {
    const c = new AbortController(), t = setTimeout(() => c.abort(), ms || 9000);
    try { return await fetch(url, { cache: "no-store", signal: c.signal }); } finally { clearTimeout(t); }
  }
  async function yahoo(range, interval) {
    const u = "https://query1.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(SYM) + "?range=" + range + "&interval=" + interval;
    if (proxDeadAt && Date.now() - proxDeadAt < 600000) throw new Error("proxy-down");
    const order = goodProx >= 0 ? [goodProx].concat(PROX.map((_, i) => i).filter((i) => i !== goodProx)) : PROX.map((_, i) => i);
    let last = null;
    for (const i of order) {
      try {
        const r = await fetchTO(PROX[i](u), 5000);
        if (!r.ok) throw new Error("HTTP " + r.status);
        const j = await r.json();
        const res = j && j.chart && j.chart.result && j.chart.result[0];
        if (!res) throw new Error("形式");
        goodProx = i; proxDeadAt = 0;
        return parseChart(res);
      } catch (e) { last = e; }
    }
    proxDeadAt = Date.now();
    throw last || new Error("取得できませんでした");
  }
  function parseChart(res) {
    const q = (res.indicators && res.indicators.quote && res.indicators.quote[0]) || {}, ts = res.timestamp || [], bars = [];
    for (let i = 0; i < ts.length; i++) {
      const c = q.close && q.close[i]; if (c == null) continue;
      const o = q.open[i] == null ? c : q.open[i], h = q.high[i] == null ? c : q.high[i], l = q.low[i] == null ? c : q.low[i];
      bars.push([ts[i], o, h, l, c, (q.volume && q.volume[i]) || 0]);
    }
    const m = res.meta || {};
    return { meta: { price: m.regularMarketPrice, time: m.regularMarketTime, prev: m.chartPreviousClose != null ? m.chartPreviousClose : m.previousClose, hi: m.regularMarketDayHigh, lo: m.regularMarketDayLow, vol: m.regularMarketVolume, hi52: m.fiftyTwoWeekHigh, lo52: m.fiftyTwoWeekLow }, bars };
  }
  /* 前日の終値：1分足の「最後の日より前の日」の最後の値段（Yahoo の chartPreviousClose は5日前の終値になるため使わない） */
  function prevClose(m1, d1, fb) {
    const day = (t) => { const j = MM.jst(t * 1000); return j.y * 10000 + j.mo * 100 + j.d; };
    if (m1 && m1.length) {
      const last = day(m1[m1.length - 1][0]);
      if (d1 && d1.length) for (let i = d1.length - 1; i >= 0; i--) if (day(d1[i][0]) < last) return d1[i][4];   /* 日足＝公式の終値 */
      if (fb) return fb;
      for (let i = m1.length - 1; i >= 0; i--) if (day(m1[i][0]) < last) return m1[i][4];
    }
    if (d1 && d1.length >= 2) return d1[d1.length - 2][4];
    return fb;
  }
  function dayHiLo(m1) {
    if (!m1 || !m1.length) return {};
    const day = (t) => { const j = MM.jst(t * 1000); return j.y * 10000 + j.mo * 100 + j.d; }, last = day(m1[m1.length - 1][0]);
    let hi = -Infinity, lo = Infinity, v = 0;
    m1.forEach((b) => { if (day(b[0]) === last) { hi = Math.max(hi, b[2]); lo = Math.min(lo, b[3]); v += b[5] || 0; } });
    return isFinite(hi) ? { hi, lo, vol: v } : {};
  }
  /* いまの株価（1分足5日ぶん＝約定にも使う）。live＝中継から読めた */
  const Q = { at: 0, data: null, busy: null };
  MM.quote = async function (force) {
    if (!force && Q.data && Date.now() - Q.at < 45000) return Q.data;
    if (Q.busy) return Q.busy;
    Q.busy = (async () => {
      let out = null;
      try { const r = await yahoo("5d", "1m"); out = Object.assign({ live: true, m1: r.bars }, r.meta); }
      catch (e) {
        const k = await getData("kioxia.json", 60000);
        if (k) out = { live: false, m1: k.m1 || [], price: k.price, time: k.time, prev: k.prev, hi: k.hi, lo: k.lo, vol: k.vol, hi52: k.hi52, lo52: k.lo52, d1: k.d1, at: k.at };
      }
      if (out) {
        out.prev = out.live ? prevClose(out.m1, out.d1, null) : (out.prev || prevClose(out.m1, out.d1, null));
        const hl = dayHiLo(out.m1); if (hl.hi) { out.hi = hl.hi; out.lo = hl.lo; }
        Q.data = out; Q.at = Date.now(); try { localStorage.setItem(CK + "quote", JSON.stringify({ at: Date.now(), data: Object.assign({}, out, { m1: (out.m1 || []).slice(-400) }) })); } catch (e) {} }
      else { const c = cget("quote"); if (c && c.data) out = Object.assign({ stale: true }, c.data); }
      Q.busy = null;
      return out;
    })();
    return Q.busy;
  };
  MM.peekQuote = () => Q.data || (cget("quote") || {}).data || null;
  /* グラフ用（範囲ごと） */
  const RANGES = { "1d": ["1d", "5m"], "5d": ["5d", "15m"], "1mo": ["1mo", "1d"], "6mo": ["6mo", "1d"], "1y": ["1y", "1d"] };
  const CH = {};
  MM.chart = async function (rk) {
    const c = CH[rk]; if (c && Date.now() - c.at < 120000) return c.data;
    const R = RANGES[rk] || RANGES["1d"];
    try { const r = await yahoo(R[0], R[1]); CH[rk] = { at: Date.now(), data: r }; return r; }
    catch (e) {
      const k = await getData("kioxia.json", 60000); if (!k) return null;
      const now = Date.now() / 1000;
      if (rk === "1d" || rk === "5d") { const span = rk === "1d" ? 86400 * 1.2 : 86400 * 7; const bars = (k.m1 || []).filter((b) => b[0] > (k.m1.length ? k.m1[k.m1.length - 1][0] : now) - span); return { meta: { price: k.price, prev: k.prev }, bars }; }
      const span = rk === "1mo" ? 31 : rk === "6mo" ? 183 : 366;
      return { meta: { price: k.price, prev: k.prev }, bars: (k.d1 || []).filter((b) => b[0] > now - span * 86400) };
    }
  };

  /* ══ 保有（約定の記録から計算）══ */
  MM.orders = () => Object.values(load().ord).sort((a, b) => (b.at || 0) - (a.at || 0));
  MM.position = function (s) {
    s = s || load();
    const fills = Object.values(s.ord).filter((o) => o.st === "fill").sort((a, b) => (a.ft || a.at) - (b.ft || b.at) || (a.at - b.at));
    let qty = 0, cost = 0, real = 0, buyAmt = 0, sellAmt = 0;
    fills.forEach((o) => {
      if (o.side === "buy") { qty += o.qty; cost += o.cost; buyAmt += o.cost; }
      else { const avg = qty ? cost / qty : 0, q = Math.min(o.qty, qty); real += o.cost - avg * q; cost -= avg * q; qty -= q; sellAmt += o.cost; }
    });
    const lock = Object.values(s.ord).filter((o) => o.st === "pend" && o.side === "sell").reduce((a, o) => a + o.qty, 0);
    const resv = Object.values(s.ord).filter((o) => o.st === "pend" && o.side === "buy").reduce((a, o) => a + (o.res || 0), 0);
    return { qty, cost: Math.round(cost), avg: qty ? cost / qty : 0, real: Math.round(real), lock, free: Math.max(0, qty - lock), resv, buyAmt, sellAmt };
  };

  /* ══ 注文 ══ */
  const bal = () => (window.XEVA ? XEVA.getBalance() : 0);
  MM.order = async function (side, qty) {
    qty = Math.floor(Number(qty) || 0);
    if (qty < 1) return { err: "qty" };
    if (qty > MM.QTY_MAX) return { err: "max" };
    const q = await MM.quote().catch(() => null);
    const ref = q && q.price;
    if (!ref) return { err: "price" };
    await MM.clock.sync();
    const at = Math.round(MM.clock.now());
    const s = load(), id = uid("o");
    if (side === "buy") {
      const res = Math.ceil(ref * qty * MM.RESERVE);
      if (!window.XEVA || !XEVA.spend(res)) return { err: "balance", need: res, bal: bal() };
      s.ord[id] = { id, side, qty, at, dev: dev(), st: "pend", res, ref };
    } else {
      const pos = MM.position(s);
      if (pos.free < qty) return { err: "shares", free: pos.free };
      s.ord[id] = { id, side, qty, at, dev: dev(), st: "pend", ref };
    }
    save(s, true);
    return { ok: true, id, ref };
  };
  MM.cancel = function (id) {
    const s = load(), o = s.ord[id];
    if (!o || o.st !== "pend") return false;
    o.st = "cancel"; o.done = Date.now();
    if (o.side === "buy" && o.res) { try { XEVA.add(o.res, "MagiMarket：注文の取り消し（キオクシア " + o.qty + "株）", { noRank: true, noEarn: true }); } catch (e) {} }
    save(s, true);
    return true;
  };
  /* 約定（注文の時刻のあとに始まった最初の1分足の始値）。返す：約定した数 */
  let filling = false;
  MM.processOrders = async function () {
    if (filling) return 0;
    const s0 = load(), mine = Object.values(s0.ord).filter((o) => o.st === "pend" && (o.dev === dev() || MM.clock.now() - o.at > 86400000));
    if (!mine.length) return 0;
    filling = true;
    let n = 0;
    try {
      if (navigator.onLine !== false && window.XevaCloud && XevaCloud.pullNow) { try { await XevaCloud.pullNow(); } catch (e) {} }
      const q = await MM.quote(true);
      if (!q) return 0;
      const s = load();
      const m1 = q.m1 || [];
      let d1 = q.d1 || null;
      for (const o0 of mine) {
        const o = s.ord[o0.id]; if (!o || o.st !== "pend") continue;
        let bar = m1.length && o.at >= m1[0][0] * 1000 ? m1.find((b) => b[0] * 1000 >= o.at) : null, px = bar ? bar[1] : 0;
        if (!bar && m1.length && o.at < m1[0][0] * 1000) {
          /* 1分足の範囲より前の注文（何日も開かなかった）→ 日足：取引中の注文はその日の終値・時間外は次の日の始値 */
          if (!d1) { const ch = await MM.chart("1mo"); d1 = ch ? ch.bars : []; }
          const inDay = (d1 || []).find((b) => o.at >= b[0] * 1000 && o.at < b[0] * 1000 + 6.5 * 3600000);
          if (inDay) { bar = inDay; px = inDay[4]; }
          else { bar = (d1 || []).find((b) => b[0] * 1000 >= o.at); px = bar ? bar[1] : 0; }
        }
        if (!bar || !px) continue;
        px = Math.round(px * 100) / 100;
        if (o.side === "buy") {
          let qty = o.qty, cost = Math.round(px * qty);
          if (cost > o.res) {
            const extra = cost - o.res;
            if (!(window.XEVA && XEVA.spend(extra))) { qty = Math.floor(o.res / px); cost = Math.round(px * qty); }
            else o.extra = extra;
          }
          const back = o.res + (o.extra || 0) - cost;
          if (qty < 1) { o.st = "void"; o.done = Date.now(); o.px = px; try { XEVA.add(o.res, "MagiMarket：約定できず返金（キオクシア）", { noRank: true, noEarn: true }); } catch (e) {} n++; continue; }
          o.qty = qty; o.px = px; o.cost = cost; o.ft = bar[0] * 1000; o.st = "fill"; o.done = Date.now();
          if (back > 0) { try { XEVA.add(back, "MagiMarket：買い注文の差額の返金（キオクシア " + qty + "株）", { noRank: true, noEarn: true }); } catch (e) {} }
        } else {
          const cost = Math.round(px * o.qty);
          o.px = px; o.cost = cost; o.ft = bar[0] * 1000; o.st = "fill"; o.done = Date.now();
          try { XEVA.add(cost, "MagiMarket：売却（キオクシア " + o.qty + "株 × " + px.toLocaleString("ja-JP") + "）", { noRank: true, noEarn: true }); } catch (e) {}
        }
        n++;
      }
      if (n) save(s, true);
    } finally { filling = false; }
    return n;
  };

  /* ══════════ ジェフ千葉 ══════════ */
  MM.jef = (force) => getData("jef.json", force ? 0 : 120000);
  MM.peekJef = () => MM.peekData("jef.json");
  MM.kickAt = function (m) {
    const d = String(m.date || "").split("-").map(Number), t = String(m.time || "14:00").split(":").map(Number);
    return Date.UTC(d[0], d[1] - 1, d[2], t[0] || 0, t[1] || 0) - JST;
  };
  MM.isOver = (m) => m && m.state === "game-over" && typeof m.gf === "number" && typeof m.ga === "number";
  MM.isVoid = (m) => m && /cancel|postpone|中止|延期/.test(String(m.state || ""));
  MM.closed = (m) => MM.clock.now() >= MM.kickAt(m) || MM.isOver(m);

  /* 倍率：J1 の順位表の得点・失点から、両チームの平均得点（λ）を出して、ポアソン分布で各スコアの確率 */
  function teamRow(tb, nm) { return (tb || []).find((r) => r.team === nm || r.full === nm) || null; }
  MM.lambdas = function (data, m) {
    const tb = (data && data.table) || [];
    const sumG = tb.reduce((a, r) => a + (r.gf || 0), 0), sumP = tb.reduce((a, r) => a + (r.played || 0), 0);
    const G = sumP ? sumG / sumP : 1.35;
    /* K＝試合数が少ないうちは平均に寄せる・0.75 乗＝強い弱いを少しだけならす（かたよりすぎない倍率に） */
    const K = 6, E = 0.75;
    const ad = (r) => r ? { a: Math.pow(((r.gf || 0) + G * K) / ((r.played || 0) + K) / G, E), d: Math.pow(((r.ga || 0) + G * K) / ((r.played || 0) + K) / G, E) } : null;
    const me = ad(teamRow(tb, "千葉")) || { a: 0.95, d: 1.05 };
    let op = ad(teamRow(tb, m.opp));
    if (!op) op = m.league === "j1" && /節/.test(m.sec || "") ? { a: 1, d: 1 } : { a: 0.78, d: 1.28 };   /* 順位表にいない＝カップ戦の下のカテゴリーの相手 */
    const HA = 1.12, AA = 0.9;
    const lj = G * me.a * op.d * (m.home ? HA : AA), lo = G * op.a * me.d * (m.home ? AA : HA);
    return { jef: Math.max(0.25, Math.min(3.6, lj)), opp: Math.max(0.25, Math.min(3.6, lo)), G };
  };
  function pois(l, k) { let p = Math.exp(-l); for (let i = 1; i <= k; i++) p *= l / i; return p; }
  MM.grid = function (data, m) {
    const L = MM.lambdas(data, m), g = [];
    let tot = 0;
    for (let i = 0; i <= 9; i++) { g[i] = []; for (let j = 0; j <= 9; j++) { g[i][j] = pois(L.jef, i) * pois(L.opp, j); tot += g[i][j]; } }
    /* 0-0・1-1 は少しだけ多め（サッカーでよく知られた傾き） */
    g[0][0] *= 1.08; g[1][1] *= 1.05;
    let t2 = 0; g.forEach((r) => r.forEach((v) => { t2 += v; }));
    g.forEach((r, i) => r.forEach((v, j) => { g[i][j] = v / t2; }));
    return { g, L };
  };
  /* 賭け方 */
  MM.BETS = {
    res: { nm: "勝敗", d: "試合の勝ち・引き分け・負け（最終スコア）", ret: 0.92, picks: [["w", "千葉の勝ち"], ["d", "引き分け"], ["l", "千葉の負け"]] },
    tot: { nm: "合計ゴール", d: "両チームのゴールの合計", ret: 0.9, picks: [["0-1", "0〜1点"], ["2-3", "2〜3点"], ["4+", "4点以上"]] },
    jg: { nm: "千葉の得点", d: "ジェフ千葉が何点とるか", ret: 0.9, picks: [["0", "0点"], ["1", "1点"], ["2", "2点"], ["3+", "3点以上"]] },
    sc: { nm: "スコア", d: "最終スコアをぴったり当てる（千葉 − 相手）", ret: 0.82, picks: (() => { const a = []; for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) a.push([i + "-" + j, i + " − " + j]); a.push(["etc", "そのほか"]); return a; })() },
  };
  function probOf(G, type, pick) {
    const g = G.g; let p = 0;
    for (let i = 0; i <= 9; i++) for (let j = 0; j <= 9; j++) {
      const v = g[i][j]; let hit = false;
      if (type === "res") hit = pick === "w" ? i > j : pick === "d" ? i === j : i < j;
      else if (type === "tot") hit = pick === "0-1" ? i + j <= 1 : pick === "2-3" ? i + j >= 2 && i + j <= 3 : i + j >= 4;
      else if (type === "jg") hit = pick === "3+" ? i >= 3 : i === Number(pick);
      else if (type === "sc") hit = pick === "etc" ? i > 4 || j > 4 : pick === i + "-" + j;
      if (hit) p += v;
    }
    return p;
  }
  MM.odds = function (data, m, type, pick) {
    const G = MM.grid(data, m), p = probOf(G, type, pick), B = MM.BETS[type];
    if (p <= 0) return 0;
    const o = Math.floor(B.ret / p * 10) / 10;
    return Math.max(1.05, Math.min(type === "sc" ? 250 : 60, o));
  };
  MM.hit = function (m, type, pick) {
    const i = m.gf, j = m.ga;
    if (type === "res") return pick === "w" ? i > j : pick === "d" ? i === j : i < j;
    if (type === "tot") return pick === "0-1" ? i + j <= 1 : pick === "2-3" ? i + j >= 2 && i + j <= 3 : i + j >= 4;
    if (type === "jg") return pick === "3+" ? i >= 3 : i === Number(pick);
    if (type === "sc") return pick === "etc" ? i > 4 || j > 4 : pick === i + "-" + j;
    return false;
  };
  MM.pickName = (type, pick) => { const r = (MM.BETS[type].picks || []).find((x) => x[0] === pick); return r ? r[1] : pick; };
  MM.bets = () => Object.values(load().bet).sort((a, b) => (b.at || 0) - (a.at || 0));

  /* 賭ける（締切はキックオフ・サーバーの時刻で） */
  MM.placeBet = async function (m, type, pick, stake) {
    stake = Math.floor(Number(stake) || 0);
    if (stake < MM.BET_UNIT || stake % MM.BET_UNIT) return { err: "unit" };
    const data = await MM.jef();
    const live = (data && data.matches || []).find((x) => x.id === m.id) || m;
    await MM.clock.sync();
    const now = MM.clock.now();
    if (!MM.clock.ok() && navigator.onLine !== false) return { err: "clock" };
    if (now >= MM.kickAt(live) - 5000 || MM.isOver(live)) return { err: "closed" };
    const s = load();
    const used = Object.values(s.bet).filter((b) => b.mid === live.id && b.st !== "void").reduce((a, b) => a + b.stake, 0);
    if (used + stake > MM.BET_MAX) return { err: "max", left: MM.BET_MAX - used };
    const odds = MM.odds(data, live, type, pick);
    if (!odds) return { err: "odds" };
    if (!window.XEVA || !XEVA.spend(stake)) return { err: "balance", bal: bal() };
    const id = uid("b");
    s.bet[id] = { id, mid: live.id, type, pick, stake, odds, at: Math.round(now), dev: dev(), st: "open",
      m: { date: live.date, time: live.time, opp: live.opp, home: !!live.home, sec: live.sec || "", comp: live.comp || "" } };
    save(s, true);
    return { ok: true, id, odds };
  };
  /* 精算（結果が出た試合の券） */
  let settling = false;
  MM.settleBets = async function () {
    if (settling) return [];
    const s0 = load(), open = Object.values(s0.bet).filter((b) => b.st === "open" && (b.dev === dev() || MM.clock.now() - (MM.kickAt(b.m) || b.at) > 86400000));
    if (!open.length) return [];
    settling = true;
    const done = [];
    try {
      const data = await MM.jef(true); if (!data) return [];
      if (navigator.onLine !== false && window.XevaCloud && XevaCloud.pullNow) { try { await XevaCloud.pullNow(); } catch (e) {} }
      const s = load();
      open.forEach((b0) => {
        const b = s.bet[b0.id]; if (!b || b.st !== "open") return;
        const m = (data.matches || []).find((x) => x.id === b.mid); if (!m) return;
        if (MM.isVoid(m)) {
          b.st = "void"; b.done = Date.now(); b.pay = b.stake;
          try { XEVA.add(b.stake, "MagiMarket：返還（ジェフ千葉 " + (b.m.opp || "") + "戦・中止）", { noRank: true, noEarn: true }); } catch (e) {}
          done.push(b); return;
        }
        if (!MM.isOver(m)) return;
        /* 締切のあとに記録された券は返還（二重の守り） */
        if (b.at >= MM.kickAt(m)) { b.st = "void"; b.done = Date.now(); b.pay = b.stake; try { XEVA.add(b.stake, "MagiMarket：返還（締切後）", { noRank: true, noEarn: true }); } catch (e) {} done.push(b); return; }
        b.res = [m.gf, m.ga];
        if (MM.hit(m, b.type, b.pick)) {
          b.st = "won"; b.pay = Math.floor(b.stake * b.odds);
          try { XEVA.add(b.pay, "MagiMarket：的中（ジェフ千葉 " + m.gf + "-" + m.ga + " " + (m.opp || "") + "・" + MM.BETS[b.type].nm + "）", { noRank: true }); } catch (e) {}
        } else { b.st = "lost"; b.pay = 0; }
        b.done = Date.now();
        done.push(b);
      });
      if (done.length) save(s, true);
    } finally { settling = false; }
    return done;
  };

  /* 試合の並び：次の試合・最近の結果 */
  MM.nextMatches = (data) => ((data && data.matches) || []).filter((m) => !MM.isOver(m) && !MM.isVoid(m) && MM.kickAt(m) > MM.clock.now() - 3 * 3600000).sort((a, b) => MM.kickAt(a) - MM.kickAt(b));
  MM.pastMatches = (data) => ((data && data.matches) || []).filter((m) => MM.isOver(m)).sort((a, b) => MM.kickAt(b) - MM.kickAt(a));
  MM.record = function (data) {
    const ps = MM.pastMatches(data).filter((m) => /節/.test(m.sec || ""));
    return { w: ps.filter((m) => m.gf > m.ga).length, d: ps.filter((m) => m.gf === m.ga).length, l: ps.filter((m) => m.gf < m.ga).length };
  };
  /* 収支のまとめ */
  MM.summary = function () {
    const s = load(), pos = MM.position(s), bets = Object.values(s.bet);
    const settled = bets.filter((b) => b.st === "won" || b.st === "lost");
    return { pos, betStake: settled.reduce((a, b) => a + b.stake, 0), betPay: settled.reduce((a, b) => a + (b.pay || 0), 0), betOpen: bets.filter((b) => b.st === "open").reduce((a, b) => a + b.stake, 0), betN: bets.length, betWon: bets.filter((b) => b.st === "won").length };
  };
})();
