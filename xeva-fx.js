/* ============================================================
   XEVA ⇄ ジェムの為替（USD/JPY 連動）
   ------------------------------------------------------------
   ★ 考え方
     ジェムは「1💎 ＝ 1 米ドル」、XEVA は「1 XEVA ＝ 1 日本円」。
     だから変換レートは、そのまま <b>ドル円の実勢レート</b> になる。
       1ドル155円 → 💎1 ＝ 155 XEVA
     以前は 200 XEVA 固定だったが、固定だと「なぜ200なのか」が説明できない。
     現実の為替に結びつけると、レートの意味が誰にでも分かるうえ、
     日々わずかに動くので「今日は買い時か」という手ざわりも生まれる。

   ★ どこから取るか
     Yahoo Finance（USDJPY=X）を MagiFinance と同じ公開CORSプロキシ経由で叩く。
     ブラウザから直接叩くと CORS で弾かれるため、プロキシを順に試す。

   ★ 取れなかったときの決めごと（ここが大事）
     為替が取れないからといって交換を止めてしまうと、
     オフラインのときに何もできなくなる。そこで必ずこの順に落ちる：
       ① さっき取れた値（localStorage のキャッシュ）
       ② FALLBACK（固定値）
     キャッシュは古くても使う。「多少ずれたレートで交換できる」ほうが
     「交換できない」よりずっとまし、という判断。

   ★ レートは必ず rate() 越しに読む
     取得中・失敗中でも必ず数値が返る。呼び出し側で null を気にしなくてよい。

   window.XevaFX として公開。値が変わると "xevafx:change" を投げる。
   ============================================================ */
(function () {
  "use strict";

  const KEY      = "xeva_fx_v1";
  const SYMBOL   = "USDJPY=X";
  const FALLBACK = 155;              // 一度も取れたことがない端末むけの既定値
  const MIN_RATE = 80, MAX_RATE = 400;   // 明らかにおかしい値をはじく範囲
  const FRESH_MS = 30 * 60 * 1000;   // これより新しければ取り直さない
  const HIST_MAX = 180;              // グラフ用に持っておく日数

  const PROXIES = [
    (u) => "https://corsproxy.io/?url=" + encodeURIComponent(u),
    (u) => "https://api.allorigins.win/raw?url=" + encodeURIComponent(u),
    (u) => "https://thingproxy.freeboard.io/fetch/" + u,
  ];

  /* ── 保存 ──
     { rate, at, prev, series:[{t,v}...] }
     prev＝前営業日の終値。「前日比」を出すのに使う。 */
  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || "null");
      if (d && typeof d.rate === "number" && ok(d.rate)) return d;
    } catch (e) {}
    return { rate: 0, at: 0, prev: 0, series: [] };
  }
  function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }
  function ok(v) { return typeof v === "number" && isFinite(v) && v >= MIN_RATE && v <= MAX_RATE; }

  let S = load();

  /* いまのレート。取れていなければキャッシュ、それも無ければ既定値。 */
  function rate() { return ok(S.rate) ? S.rate : FALLBACK; }
  /* 1ジェムあたりの XEVA（整数）。交換の計算は必ずこれを使う。 */
  function gemRate() { return Math.max(1, Math.round(rate())); }
  /* 実勢が取れているか（＝既定値で代用していないか） */
  function live() { return ok(S.rate); }
  function updatedAt() { return S.at || 0; }
  /* 前日比 { d, pct, up } */
  function delta() {
    if (!ok(S.rate) || !ok(S.prev)) return null;
    const d = S.rate - S.prev;
    return { d: d, pct: (d / S.prev) * 100, up: d >= 0 };
  }
  /* グラフ用の系列（古い順）。[{t: ms, v: rate}] */
  function series() { return Array.isArray(S.series) ? S.series.slice() : []; }

  function emit() {
    try { window.dispatchEvent(new CustomEvent("xevafx:change", { detail: { rate: rate() } })); } catch (e) {}
  }

  async function fetchTO(url, ms) {
    const c = new AbortController();
    const id = setTimeout(() => c.abort(), ms || 9000);
    try { return await fetch(url, { cache: "no-store", signal: c.signal }); }
    finally { clearTimeout(id); }
  }
  async function viaProxy(url) {
    let last;
    for (const p of PROXIES) {
      try {
        const r = await fetchTO(p(url), 9000);
        if (!r.ok) throw new Error("HTTP " + r.status);
        return await r.json();
      } catch (e) { last = e; }
    }
    throw last || new Error("為替の取得に失敗");
  }

  /* 6か月ぶんの日足を1回で取る。最新値・前日終値・グラフ用の系列がまとめて作れる。 */
  let _busy = null;
  async function refresh(force) {
    if (_busy) return _busy;
    if (!force && ok(S.rate) && Date.now() - (S.at || 0) < FRESH_MS) return S;
    if (navigator.onLine === false) return S;
    _busy = (async () => {
      try {
        const url = "https://query1.finance.yahoo.com/v8/finance/chart/" +
                    encodeURIComponent(SYMBOL) + "?range=6mo&interval=1d";
        const j = await viaProxy(url);
        const r = j && j.chart && j.chart.result && j.chart.result[0];
        if (!r) throw new Error("形式が違う");
        const ts = r.timestamp || [];
        const cl = (r.indicators && r.indicators.quote && r.indicators.quote[0] &&
                    r.indicators.quote[0].close) || [];
        /* 休場日は null が混ざる。落としてから使う。 */
        const pts = [];
        for (let i = 0; i < ts.length; i++) {
          const v = cl[i];
          if (ok(v)) pts.push({ t: ts[i] * 1000, v: Math.round(v * 1000) / 1000 });
        }
        /* いまの値は meta の現在値を優先（日中の動きが出る）。無ければ最後の終値。 */
        const meta = r.meta || {};
        const nowV = ok(meta.regularMarketPrice) ? meta.regularMarketPrice
                   : (pts.length ? pts[pts.length - 1].v : 0);
        if (!ok(nowV)) throw new Error("値がおかしい");

        const next = {
          rate: Math.round(nowV * 1000) / 1000,
          at: Date.now(),
          /* 前日終値。meta にあればそれ、無ければ系列の1つ前。 */
          prev: ok(meta.chartPreviousClose) ? meta.chartPreviousClose
              : (pts.length > 1 ? pts[pts.length - 2].v : 0),
          series: pts.slice(-HIST_MAX),
        };
        const changed = next.rate !== S.rate;
        S = next; save(S);
        if (changed) emit();
        return S;
      } catch (e) {
        /* 取れなくてもキャッシュで動き続ける。ここで例外を投げない。 */
        return S;
      } finally { _busy = null; }
    })();
    return _busy;
  }

  /* 起動時に一度、そのあとはオンライン復帰と30分おきに取り直す。 */
  refresh();
  window.addEventListener("online", () => refresh(true));
  setInterval(() => refresh(), FRESH_MS);

  /* ── グラフ（軽い SVG のラインチャート）──
     外部ライブラリを入れずに済ませたいので、点を polyline にするだけの素朴な実装。
     days を渡すと直近その日数だけを描く。 */
  function chartSVG(opt) {
    opt = opt || {};
    const days = opt.days || 90;
    const w = opt.w || 320, h = opt.h || 96, pad = 4;
    let pts = series();
    if (pts.length > days) pts = pts.slice(-days);
    if (pts.length < 2) {
      return '<div class="xh-fxempty">為替データを取得できませんでした</div>';
    }
    const vs = pts.map((p) => p.v);
    let lo = Math.min.apply(null, vs), hi = Math.max.apply(null, vs);
    if (hi - lo < 0.01) { hi += 0.5; lo -= 0.5; }      // まっすぐなときも線が見えるように
    const pad2 = (hi - lo) * 0.12; lo -= pad2; hi += pad2;
    const x = (i) => pad + (i / (pts.length - 1)) * (w - pad * 2);
    const y = (v) => pad + (1 - (v - lo) / (hi - lo)) * (h - pad * 2);
    const line = pts.map((p, i) => x(i).toFixed(1) + "," + y(p.v).toFixed(1)).join(" ");
    const area = "M" + x(0).toFixed(1) + "," + (h - pad).toFixed(1) + " L" +
                 pts.map((p, i) => x(i).toFixed(1) + "," + y(p.v).toFixed(1)).join(" L") +
                 " L" + x(pts.length - 1).toFixed(1) + "," + (h - pad).toFixed(1) + " Z";
    const up = pts[pts.length - 1].v >= pts[0].v;
    const c = up ? "#e0405e" : "#1d8fd8";     // 円安（上）を赤、円高（下）を青
    const gid = "fxg" + Math.random().toString(36).slice(2, 8);
    const last = pts[pts.length - 1];
    return '<svg class="xh-fxsvg" viewBox="0 0 ' + w + " " + h + '" preserveAspectRatio="none" role="img" aria-label="ドル円の推移">' +
      '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="' + c + '" stop-opacity=".28"/>' +
        '<stop offset="100%" stop-color="' + c + '" stop-opacity="0"/></linearGradient></defs>' +
      '<path d="' + area + '" fill="url(#' + gid + ')"/>' +
      '<polyline points="' + line + '" fill="none" stroke="' + c + '" stroke-width="2" ' +
        'stroke-linejoin="round" stroke-linecap="round"/>' +
      '<circle cx="' + x(pts.length - 1).toFixed(1) + '" cy="' + y(last.v).toFixed(1) + '" r="3" fill="' + c + '"/>' +
    "</svg>";
  }
  /* グラフの下に出す「期間・高値・安値」 */
  function chartRange(days) {
    let pts = series();
    if (pts.length > (days || 90)) pts = pts.slice(-(days || 90));
    if (!pts.length) return null;
    const vs = pts.map((p) => p.v);
    return {
      from: pts[0].t, to: pts[pts.length - 1].t,
      lo: Math.min.apply(null, vs), hi: Math.max.apply(null, vs),
      n: pts.length,
    };
  }

  window.XevaFX = {
    SYMBOL, FALLBACK,
    rate, gemRate, live, updatedAt, delta, series, refresh,
    chartSVG, chartRange,
  };
})();
