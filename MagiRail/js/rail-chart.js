/* ══════════════════════════════════════════════════════════════
   rail-chart.js — MagiRail の小さなグラフ（canvas・外部ライブラリなし）
   ──────────────────────────────────────────────────────────────
   ・線（2px）と棒（上だけ角丸 4px・棒のあいだに 2px のすきま）。軸と罫線は控えめ。
   ・y 軸は1本だけ（2つの尺度を1枚に重ねない）。
   ・なぞる／マウスを乗せると、その時間帯の値を全部出すツールチップ（縦の線つき）。
   ・色は系列ごとに固定（需要＝オレンジ・輸送力＝青 など、呼ぶ側が決める）。
     文字は色で塗らない（値・ラベルは墨）。凡例は呼ぶ側が HTML で出す（legend()）。
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const INK = "#1b2a44", SUB = "#5b6b85", GRID = "rgba(27,42,68,.09)";
  function niceMax(v) {
    if (!(v > 0)) return 10;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const m = v / p;
    return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
  }
  function kfmt(v) {
    const a = Math.abs(v);
    if (a >= 1e8) return (v / 1e8).toFixed(a >= 1e9 ? 0 : 1) + "億";
    if (a >= 1e4) return Math.round(v / 1e4) + "万";
    if (a >= 1000) return (v / 1000).toFixed(a >= 1e4 ? 0 : 1) + "k";
    return String(Math.round(v * 100) / 100);
  }
  function rr(ctx, x, y, w, h, r) {
    /* 上だけ角丸（負の値は下だけ角丸）。基準線に接する側はまっすぐ */
    if (h === 0) return;
    const up = h > 0; r = Math.min(r, Math.abs(h), w / 2);
    const top = up ? y - h : y, bot = up ? y : y - h;
    ctx.beginPath();
    if (up) { ctx.moveTo(x, bot); ctx.lineTo(x, top + r); ctx.quadraticCurveTo(x, top, x + r, top); ctx.lineTo(x + w - r, top); ctx.quadraticCurveTo(x + w, top, x + w, top + r); ctx.lineTo(x + w, bot); }
    else { ctx.moveTo(x, top); ctx.lineTo(x, bot - r); ctx.quadraticCurveTo(x, bot, x + r, bot); ctx.lineTo(x + w - r, bot); ctx.quadraticCurveTo(x + w, bot, x + w, bot - r); ctx.lineTo(x + w, top); }
    ctx.closePath(); ctx.fill();
  }
  function draw(cv, cfg) {
    if (!cv) return;
    cv._cfg = cfg;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = cv.clientWidth || 320, H = cfg.h || 170;
    cv.style.height = H + "px";
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const L = 40, R = 8, T = 10, B = 24;
    const n = cfg.labels.length;
    let mx = 0, mn = 0;
    cfg.series.forEach((s) => s.data.forEach((v) => { if (v > mx) mx = v; if (v < mn) mn = v; }));
    if (cfg.max) mx = Math.max(mx, cfg.max);
    mx = niceMax(mx); if (mn < 0) mn = -niceMax(-mn);
    const pw = W - L - R, ph = H - T - B;
    const y = (v) => T + ph * (1 - (v - mn) / (mx - mn || 1));
    /* 罫線と目盛り */
    ctx.font = "10px 'Noto Sans JP',sans-serif"; ctx.fillStyle = SUB; ctx.textAlign = "right"; ctx.textBaseline = "middle";
    for (let i = 0; i <= 4; i++) {
      const v = mn + (mx - mn) * i / 4, yy = y(v);
      ctx.strokeStyle = GRID; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(L, yy); ctx.lineTo(W - R, yy); ctx.stroke();
      ctx.fillText((cfg.yfmt || kfmt)(v), L - 5, yy);
    }
    if (mn < 0) { ctx.strokeStyle = "rgba(27,42,68,.35)"; ctx.beginPath(); ctx.moveTo(L, y(0)); ctx.lineTo(W - R, y(0)); ctx.stroke(); }
    const cw = pw / n;
    ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.fillStyle = SUB;
    const step = Math.max(1, Math.ceil(n / Math.max(3, Math.floor(pw / 34))));
    cfg.labels.forEach((lb, i) => { if (i % step === 0) ctx.fillText(lb, L + cw * (i + 0.5), H - B + 6); });
    /* 棒 */
    const bars = cfg.series.filter((s) => s.type === "bar");
    const gw = Math.min(cw * 0.78, 46), bw = bars.length ? Math.max(2, (gw - 2 * (bars.length - 1)) / bars.length) : 0;
    bars.forEach((s, k) => {
      ctx.fillStyle = s.c;
      s.data.forEach((v, i) => {
        const x = L + cw * i + (cw - gw) / 2 + k * (bw + 2);
        rr(ctx, x, y(0), bw, y(0) - y(v), 4);
      });
    });
    /* 線 */
    cfg.series.filter((s) => s.type !== "bar").forEach((s) => {
      ctx.strokeStyle = s.c; ctx.lineWidth = 2; ctx.lineJoin = "round"; ctx.setLineDash(s.dash ? [5, 4] : []);
      ctx.beginPath();
      s.data.forEach((v, i) => { const xx = L + cw * (i + 0.5), yy = y(v); if (i) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy); });
      ctx.stroke(); ctx.setLineDash([]);
      if (n <= 12) s.data.forEach((v, i) => { ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(L + cw * (i + 0.5), y(v), 3.5, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = s.c; ctx.lineWidth = 2; ctx.stroke(); });
    });
    /* なぞったところ */
    if (cv._hi != null && cv._hi < n) {
      const xx = L + cw * (cv._hi + 0.5);
      ctx.strokeStyle = "rgba(27,42,68,.4)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(xx, T); ctx.lineTo(xx, T + ph); ctx.stroke();
    }
    cv._geo = { L, cw, n };
    bind(cv);
  }
  function bind(cv) {
    if (cv._bound) return;
    cv._bound = 1;
    const tip = document.getElementById("tip");
    const show = (e) => {
      const g = cv._geo, cfg = cv._cfg; if (!g || !cfg) return;
      const r = cv.getBoundingClientRect();
      const p = e.touches ? e.touches[0] : e;
      const i = Math.floor((p.clientX - r.left - g.L) / g.cw);
      if (i < 0 || i >= g.n) { hide(); return; }
      if (cv._hi !== i) { cv._hi = i; draw(cv, cfg); }
      if (!tip) return;
      tip.hidden = false;
      tip.innerHTML = "<b>" + cfg.labels[i] + (cfg.sub ? " " + cfg.sub[i] : "") + "</b>" + cfg.series.map((s) => '<div><i style="background:' + s.c + '"></i>' + s.nm + "<span>" + (cfg.tfmt || cfg.yfmt || kfmt)(s.data[i]) + "</span></div>").join("");
      const tw = tip.offsetWidth, th = tip.offsetHeight;
      let x = p.clientX + 14, yy = p.clientY - th - 12;
      if (x + tw > window.innerWidth - 8) x = p.clientX - tw - 14;
      if (yy < 8) yy = p.clientY + 16;
      tip.style.left = Math.max(8, x) + "px"; tip.style.top = yy + "px";
    };
    const hide = () => { if (tip) tip.hidden = true; if (cv._hi != null) { cv._hi = null; draw(cv, cv._cfg); } };
    cv.addEventListener("mousemove", show); cv.addEventListener("mouseleave", hide);
    cv.addEventListener("touchstart", show, { passive: true }); cv.addEventListener("touchmove", show, { passive: true });
    cv.addEventListener("touchend", () => setTimeout(hide, 1600));
  }
  function legend(series) {
    return '<div class="lg">' + series.map((s) => '<span><i class="' + (s.type === "bar" ? "b" : "l") + '" style="background:' + s.c + '"></i>' + s.nm + "</span>").join("") + "</div>";
  }
  window.RChart = { draw, legend, kfmt };
})();
