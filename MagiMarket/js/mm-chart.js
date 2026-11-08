/* ============================================================
   MagiMarket — mm-chart.js（株価のグラフ・canvas）
   ・線＋下のぬり（前日の終値より上＝赤・下＝青。日本の株価の色）。前日終値の点線。
   ・指でなぞると、その時刻の値段を出す。
   ============================================================ */
(function () {
  "use strict";
  const MM = (window.MM = window.MM || {});
  const UP = "#ff4d5e", DN = "#3d8bff";
  function draw(cv, bars, opt) {
    opt = opt || {};
    const dpr = Math.min(3, window.devicePixelRatio || 1), W = cv.clientWidth || 320, H = cv.clientHeight || 180;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const g = cv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    if (!bars || bars.length < 2) {
      g.fillStyle = "rgba(255,255,255,.5)"; g.font = "600 13px 'Noto Sans JP',sans-serif"; g.textAlign = "center";
      g.fillText(opt.empty || "データを読みこんでいます…", W / 2, H / 2); return null;
    }
    const xs = bars.map((b) => b[0]), ys = bars.map((b) => b[4]);
    let lo = Math.min.apply(null, ys), hi = Math.max.apply(null, ys);
    const base = opt.base;
    if (base) { lo = Math.min(lo, base); hi = Math.max(hi, base); }
    const pad = (hi - lo) * 0.12 || hi * 0.01 || 1; lo -= pad; hi += pad;
    const L = 6, R = W - 50, T = 10, B = H - 22;
    /* 時間がとんでいる所（夜・休み）は詰めて、足の順番で並べる */
    const X = (i) => L + (R - L) * (i / (bars.length - 1)), Y = (v) => T + (B - T) * (1 - (v - lo) / (hi - lo));
    const last = ys[ys.length - 1], ref = base || ys[0], col = last >= ref ? UP : DN;
    /* 目盛り */
    g.strokeStyle = "rgba(255,255,255,.08)"; g.lineWidth = 1; g.fillStyle = "rgba(255,255,255,.55)"; g.font = "600 10.5px 'Barlow Condensed','Noto Sans JP',sans-serif"; g.textAlign = "left";
    for (let k = 0; k <= 3; k++) { const v = lo + (hi - lo) * (k / 3), y = Y(v); g.beginPath(); g.moveTo(L, y); g.lineTo(R, y); g.stroke(); g.fillText(Math.round(v).toLocaleString("ja-JP"), R + 5, y + 3.5); }
    /* 時刻のラベル（3〜4か所） */
    g.textAlign = "center";
    const fmt = opt.fmt || ((t) => MM.md(t * 1000));
    [0, 0.33, 0.66, 1].forEach((p) => { const i = Math.round(p * (bars.length - 1)); g.fillText(fmt(xs[i]), Math.min(R - 16, Math.max(L + 16, X(i))), H - 6); });
    /* 前日終値 */
    if (base) { g.setLineDash([4, 4]); g.strokeStyle = "rgba(255,255,255,.35)"; g.beginPath(); g.moveTo(L, Y(base)); g.lineTo(R, Y(base)); g.stroke(); g.setLineDash([]); }
    /* ぬり */
    const grd = g.createLinearGradient(0, T, 0, B); grd.addColorStop(0, col + "55"); grd.addColorStop(1, col + "00");
    g.beginPath(); g.moveTo(X(0), B); ys.forEach((v, i) => g.lineTo(X(i), Y(v))); g.lineTo(X(ys.length - 1), B); g.closePath(); g.fillStyle = grd; g.fill();
    g.beginPath(); ys.forEach((v, i) => (i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v)))); g.strokeStyle = col; g.lineWidth = 2; g.lineJoin = "round"; g.stroke();
    /* 最後の点 */
    g.beginPath(); g.arc(X(ys.length - 1), Y(last), 3.6, 0, Math.PI * 2); g.fillStyle = "#fff"; g.fill(); g.lineWidth = 2; g.strokeStyle = col; g.stroke();
    return { X, Y, L, R, T, B, bars, W, H, col };
  }
  MM.drawChart = function (cv, bars, opt) {
    const st = draw(cv, bars, opt);
    cv._st = st; cv._args = [bars, opt];
    if (!cv._bound) {
      cv._bound = true;
      const tip = document.createElement("div"); tip.className = "ch-tip"; cv.parentNode.appendChild(tip);
      const move = (e) => {
        const s = cv._st; if (!s) return;
        const r = cv.getBoundingClientRect(), x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
        const i = Math.max(0, Math.min(s.bars.length - 1, Math.round((x - s.L) / (s.R - s.L) * (s.bars.length - 1))));
        const b = s.bars[i];
        draw(cv, cv._args[0], cv._args[1]);
        const g = cv.getContext("2d"), X = s.X(i), Y = s.Y(b[4]);
        g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = 1; g.beginPath(); g.moveTo(X, s.T); g.lineTo(X, s.B); g.stroke();
        g.beginPath(); g.arc(X, Y, 4, 0, Math.PI * 2); g.fillStyle = "#fff"; g.fill();
        tip.style.display = "block";
        tip.textContent = ((cv._args[1] && cv._args[1].tipFmt) || ((t) => MM.dt(t * 1000)))(b[0]) + "　¥" + Math.round(b[4]).toLocaleString("ja-JP");
        tip.style.left = Math.max(4, Math.min(s.W - tip.offsetWidth - 4, X - tip.offsetWidth / 2)) + "px";
      };
      const end = () => { tip.style.display = "none"; if (cv._args) draw(cv, cv._args[0], cv._args[1]); };
      cv.addEventListener("pointermove", (e) => { if (e.pointerType === "mouse" || e.buttons) move(e); });
      cv.addEventListener("pointerdown", move);
      cv.addEventListener("pointerleave", end); cv.addEventListener("pointerup", () => setTimeout(end, 900));
      window.addEventListener("resize", () => { if (cv.isConnected && cv._args) draw(cv, cv._args[0], cv._args[1]); });
    }
  };
})();
