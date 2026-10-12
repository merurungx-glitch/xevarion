/* ============================================================
   MagiChemLex — mcl-fig4.js（標準セット4 の図・2026-10-13）
   ・mcl-fig.js の MCLFig.add(name, fn) で登録する（make("wphase:b") のように「名前:引数」）。
   ・色は CSS（.fig の中のクラス）で決める＝ダークでも読める。
   ・グラフの線は問題の数値から計算して描く（弱酸の滴定は Ka ＝ 2.7×10⁻⁵・0.10 mol/L・10.0 mL、
     水の密度は 4 ℃ で最大の2次式、検量線は 5.0×10⁻⁸ g で 100）。
   ============================================================ */
(function () {
  "use strict";
  const F = window.MCLFig;
  if (!F || !F.add) return;
  const T = (x, y, s, c, a) => '<text x="' + x + '" y="' + y + '" class="' + (c || "tx") + '"' + (a ? ' text-anchor="' + a + '"' : "") + ">" + s + "</text>";
  const f1 = (v) => (Math.round(v * 10) / 10).toString();
  const line = (x1, y1, x2, y2, c, extra) => '<line x1="' + f1(x1) + '" y1="' + f1(y1) + '" x2="' + f1(x2) + '" y2="' + f1(y2) + '" class="' + c + '"' + (extra || "") + "/>";
  let uid = 0;
  const arrowDefs = (id, w) => '<defs><marker id="' + id + '" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="' + (w || 7) + '" markerHeight="' + (w || 7) + '" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="ah"/></marker></defs>';
  function axes(o) {
    const X = (v) => o.L + (v - o.x0) / (o.x1 - o.x0) * o.W, Y = (v) => o.T + o.H - (v - o.y0) / (o.y1 - o.y0) * o.H;
    let g = "";
    const eps = 1e-9;
    if (o.xm) for (let v = o.x0; v <= o.x1 + eps; v += o.xm) g += line(X(v), o.T, X(v), o.T + o.H, "gl");
    if (o.ym) for (let v = o.y0; v <= o.y1 + eps; v += o.ym) g += line(o.L, Y(v), o.L + o.W, Y(v), "gl");
    if (o.xs) for (let v = o.x0; v <= o.x1 + eps; v += o.xs) { g += line(X(v), o.T, X(v), o.T + o.H, "gm"); if (!o.noxl) g += T(f1(X(v)), o.T + o.H + 13, (o.xf || String)(Math.round(v * 10000) / 10000), "tx s", "middle"); }
    if (o.ys) for (let v = o.y0; v <= o.y1 + eps; v += o.ys) { g += line(o.L, Y(v), o.L + o.W, Y(v), "gm"); if (!o.noyl) g += T(o.L - 5, f1(Y(v) + 3.5), (o.yf || String)(Math.round(v * 10000) / 10000), "tx s", "end"); }
    g += '<path d="M' + o.L + " " + o.T + "V" + (o.T + o.H) + "H" + (o.L + o.W) + '" class="ax"/>';
    if (o.xl) g += T(o.L + o.W / 2, o.T + o.H + 28, o.xl, "tx s", "middle");
    if (o.yl) g += T(o.L - 4, o.T - 8, o.yl, "tx s", "start");
    return { X, Y, g };
  }
  const pathOf = (pts, X, Y) => pts.map((p, i) => (i ? "L" : "M") + f1(X(p[0])) + " " + f1(Y(p[1]))).join("");
  const dot = (x, y, r, c) => '<circle cx="' + f1(x) + '" cy="' + f1(y) + '" r="' + (r || 3.8) + '" class="' + (c || "pt") + '"/>';

  /* ── 水の状態図（目盛りは模式的：0 ℃と 0.01 ℃、6.10×10² と 6.11×10² Pa は見やすく広げてある）。
     ":b" は 9×10⁴ Pa の線（沸点が 100 ℃ より低いことの説明・解説） ── */
  F.add("wphase", (p) => {
    const L = 64, Tp = 16, W = 250, H = 196, Bot = Tp + H;
    const x0 = 112, x001 = 120, x100 = 214, x374 = 292;
    const y610 = 168, y611 = 157, y101 = 116, y221 = 36;
    let g = '<rect x="' + L + '" y="' + Tp + '" width="' + W + '" height="' + H + '" class="ax" fill="none"/>';
    /* 補助の破線 */
    g += '<path d="M' + L + " " + y221 + "H" + x374 + "V" + Bot + "M" + L + " " + y101 + "H" + x100 + "V" + Bot + "M" + L + " " + y611 + "H" + x001 + "V" + Bot + "M" + L + " " + y610 + "H" + x0 + "V" + Bot + '" class="gd"/>';
    /* 昇華曲線・融解曲線・蒸発曲線 */
    g += '<path d="M' + L + " " + Bot + "Q" + 98 + " " + 196 + " " + x0 + " " + y610 + "T" + x001 + " " + y611 + '" class="ls"/>';
    g += line(x001, y611, 92, Tp, "ls");
    g += '<path d="M' + x001 + " " + y611 + "Q" + 176 + " " + 136 + " " + x100 + " " + y101 + "T" + x374 + " " + y221 + '" class="ls"/>';
    g += dot(x001, y611, 4) + dot(x374, y221, 4);
    g += T(82, 86, "固体", "tx b", "middle") + T(170, 76, "液体", "tx b", "middle") + T(250, 160, "気体", "tx b", "middle");
    g += T(L - 4, y221 + 4, "2.21×10⁷", "tx s", "end") + T(L - 4, y101 + 4, "1.01×10⁵", "tx s", "end") + T(L - 4, y611 + 1, "6.11×10²", "tx s", "end") + T(L - 4, y610 + 9, "6.10×10²", "tx s", "end");
    g += T(x0 - 2, Bot + 13, "0", "tx s", "end") + T(x001 + 2, Bot + 13, "0.01", "tx s", "start") + T(x100, Bot + 13, "100", "tx s", "middle") + T(x374, Bot + 13, "374", "tx s", "middle");
    g += T(L + W / 2, Bot + 28, "温度（℃）", "tx s", "middle") + T(6, Tp + 4, "圧力（Pa）", "tx s", "start");
    g += T(x001 + 8, y611 + 14, "三重点", "tx s c1") + T(x374 - 4, y221 - 6, "臨界点", "tx s c1", "end");
    if (p && p[1] === "b") {
      const yb = 126, xb = 204;   /* 9×10⁴ Pa（1.01×10⁵ より少し低い）と蒸発曲線の交点 */
      g += line(L, yb, xb, yb, "ld") + line(xb, yb, xb, Bot, "ld") + dot(xb, yb, 4.5, "ptg") + T(xb - 4, Bot - 6, "100 ℃より低い", "tx b c2", "end") + T(xb + 14, yb + 16, "9×10⁴ Pa", "tx b c2", "start");   /* 曲線にかからない右下へ */
    }
    return '<svg viewBox="0 0 330 248" role="img" aria-label="水の状態図">' + g + "</svg>";
  });

  /* ── 1.01×10⁵ Pa での氷と水の密度（上：水 0.9990〜1.0000、下：氷 0.9165〜0.9180。破線は過冷却の水）── */
  const rhoW = (t) => t >= 4 ? 0.99997 - 7.34e-6 * (t - 4) * (t - 4) : 0.99997 - 1.047e-5 * (t - 4) * (t - 4);
  F.add("wdens", (p) => {
    const L = 62, W = 240;
    const X = (t) => L + (t + 4) / 20 * W;
    const top = { T: 20, H: 112, y0: 0.9988, y1: 1.0002 }, bot = { T: 152, H: 70, y0: 0.9164, y1: 0.9182 };
    const Yt = (v) => top.T + top.H - (v - top.y0) / (top.y1 - top.y0) * top.H, Yb = (v) => bot.T + bot.H - (v - bot.y0) / (bot.y1 - bot.y0) * bot.H;
    let g = "";
    for (let t = -4; t <= 16; t += 2) { g += line(X(t), top.T, X(t), top.T + top.H, t % 4 ? "gl" : "gm") + line(X(t), bot.T, X(t), bot.T + bot.H, t % 4 ? "gl" : "gm"); }
    for (let v = 0.9990; v <= 1.00005; v += 0.0002) g += line(L, Yt(v), L + W, Yt(v), Math.abs(v - 0.999) < 1e-6 || Math.abs(v - 1) < 1e-6 ? "gm" : "gl");
    for (let v = 0.9166; v <= 0.91805; v += 0.0002) g += line(L, Yb(v), L + W, Yb(v), Math.abs(v - 0.917) < 1e-6 || Math.abs(v - 0.918) < 1e-6 ? "gm" : "gl");
    g += '<rect x="' + L + '" y="' + top.T + '" width="' + W + '" height="' + top.H + '" class="ax" fill="none"/><rect x="' + L + '" y="' + bot.T + '" width="' + W + '" height="' + bot.H + '" class="ax" fill="none"/>';
    g += T(L - 5, f1(Yt(1) + 3.5), "1.000", "tx s", "end") + T(L - 5, f1(Yt(0.999) + 3.5), "0.999", "tx s", "end") + T(L - 5, f1(Yb(0.918) + 3.5), "0.918", "tx s", "end") + T(L - 5, f1(Yb(0.917) + 3.5), "0.917", "tx s", "end");
    g += T(L - 9, 143, "≈", "tx b", "middle");
    for (let t = -4; t <= 16; t += 4) g += T(f1(X(t)), bot.T + bot.H + 13, String(t).replace("-", "−"), "tx s", "middle");
    const sup = [], liq = [];
    for (let t = -4; t <= 0.001; t += 0.25) sup.push([t, rhoW(t)]);
    for (let t = 0; t <= 16.001; t += 0.25) liq.push([t, rhoW(t)]);
    const P = (pts) => pts.map((q, i) => (i ? "L" : "M") + f1(X(q[0])) + " " + f1(Yt(q[1]))).join("");
    g += '<path d="' + P(sup) + '" class="ld"/><path d="' + P(liq) + '" class="ls"/>';
    g += line(X(-4), Yb(0.9174), X(0), Yb(0.9170), "ls");
    g += T(X(12.6), Yt(0.99975), "水", "tx b") + T(X(-1.6), Yb(0.9176), "氷", "tx b");
    g += T(L + W / 2, 250, "温度（℃）", "tx s", "middle") + T(6, 12, "密度（g/cm³）", "tx s", "start");
    if (p && p[1] === "r") {
      /* 解説：0 ℃の氷 0.917・12 ℃と −4 ℃の水 */
      g += dot(X(0), Yb(0.917), 4.5, "ptg") + T(X(0) + 7, Yb(0.917) + 4, "0 ℃の氷 0.917", "tx b c2");
      g += dot(X(12), Yt(rhoW(12)), 4.5, "ptg") + dot(X(-4), Yt(rhoW(-4)), 4.5, "ptg") + T(X(12) - 4, Yt(rhoW(12)) + 16, "12 ℃", "tx s c2", "middle") + T(X(-4) + 6, Yt(rhoW(-4)) + 14, "−4 ℃", "tx s c2");
    }
    return '<svg viewBox="0 0 320 262" role="img" aria-label="氷と水の密度の温度変化">' + g + "</svg>";
  });

  /* ── 硝酸アンモニウムの溶解のエネルギー図（選択肢 (1)〜(4)。太い矢印＝反応の進む向き）── */
  F.add("edia4", () => {
    const id = "mce" + (++uid);
    const S = "NH₄NO₃(固)＋aq", A = "NH₄NO₃ aq";
    const one = (ox, oy, n, hi, lo, up) => {
      let g = T(ox + 4, oy + 12, "(" + n + ")", "tx b");
      g += line(ox + 24, oy + 112, ox + 24, oy + 20, "ax") + '<path d="M' + (ox + 20) + " " + (oy + 26) + "L" + (ox + 24) + " " + (oy + 18) + "L" + (ox + 28) + " " + (oy + 26) + '" class="ax"/>';
      g += T(ox + 12, oy + 34, "高", "tx s", "middle") + T(ox + 12, oy + 108, "低", "tx s", "middle");
      g += line(ox + 40, oy + 40, ox + 150, oy + 40, "ax") + line(ox + 40, oy + 100, ox + 150, oy + 100, "ax");
      g += T(ox + 104, oy + 35, hi, "tx s", "middle") + T(ox + 104, oy + 95, lo, "tx s", "middle");
      g += up ? '<line x1="' + (ox + 48) + '" y1="' + (oy + 99) + '" x2="' + (ox + 48) + '" y2="' + (oy + 44) + '" class="ar" style="stroke-width:3" marker-end="url(#' + id + ')"/>'
              : '<line x1="' + (ox + 48) + '" y1="' + (oy + 41) + '" x2="' + (ox + 48) + '" y2="' + (oy + 96) + '" class="ar" style="stroke-width:3" marker-end="url(#' + id + ')"/>';
      return g;
    };
    return '<svg viewBox="0 0 330 250" role="img" aria-label="エネルギー図の選択肢">' + arrowDefs(id, 3.4) +
      one(4, 4, 1, A, S, true) + one(170, 4, 2, A, S, false) + one(4, 126, 3, S, A, false) + one(170, 126, 4, S, A, true) + "</svg>";
  });

  /* ── 弱酸 HA の濃度 c と電離度 α（選択肢 (1)〜(5)）。(4) が α ∝ 1/√c ── */
  F.add("alpha5", () => {
    const fns = [(c) => 1, (c) => Math.sqrt(c), (c) => c, (c) => 1 / Math.sqrt(c), (c) => 1 / c];
    const one = (ox, oy, n) => {
      const L = ox + 26, Tp = oy + 20, W = 72, H = 60;
      const X = (c) => L + c / 4 * W, Y = (a) => Tp + H - Math.min(4.2, a) / 4 * H;
      let g = T(ox + 2, oy + 10, "(" + n + ")", "tx b");
      for (let k = 1; k <= 4; k++) g += line(X(k), Tp, X(k), Tp + H, "gl") + line(L, Y(k), L + W, Y(k), "gl");
      g += '<path d="M' + L + " " + Tp + "V" + (Tp + H) + "H" + (L + W) + '" class="ax"/>';
      g += T(L - 3, f1(Y(1) + 3), "α₀", "tx s", "end") + T(L - 3, f1(Y(4) + 3), "4α₀", "tx s", "end") + T(X(1), Tp + H + 11, "c₀", "tx s", "middle") + T(X(4), Tp + H + 11, "4c₀", "tx s", "middle");
      const pts = []; for (let c = n >= 4 ? 0.06 : 0.02; c <= 4.0001; c += 0.04) pts.push([c, fns[n - 1](c)]);
      const d = pts.filter((q) => q[1] <= 4.15).map((q, i) => (i ? "L" : "M") + f1(X(q[0])) + " " + f1(Y(q[1]))).join("");
      return g + '<path d="' + d + '" class="ls" style="stroke-width:2.4"/>';
    };
    return '<svg viewBox="0 0 330 224" role="img" aria-label="電離度と濃度のグラフの選択肢">' +
      one(4, 4, 1) + one(112, 4, 2) + one(220, 4, 3) + one(58, 108, 4) + one(166, 108, 5) +
      T(165, 220, "横軸：モル濃度 c（mol/L）　縦軸：電離度 α", "tx s", "middle") + "</svg>";
  });

  /* ── 0.10 mol/L の弱酸 HA 10.0 mL に 0.10 mol/L NaOH を滴下したときの [HA]・[A⁻]・[OH⁻]・[H⁺]（Ka ＝ 2.7×10⁻⁵）。
     ":2.5" で 2.5 mL の読み取り（解説） ── */
  const KA = 2.7e-5;
  function haAt(v) {
    const tot = 10 + v, na = 0.1 * v / tot, ca = 1.0 / tot;
    if (v >= 9.999) return { HA: 0, A: ca, OH: Math.max(0, na - ca), H: 1e-14 / Math.max(1e-9, na - ca) };
    /* 弱酸＋塩：[H⁺]² ＋ (na ＋ Ka)[H⁺] − Ka(ca − na) ≒ 0 */
    const b = na + KA, h = Math.max(1e-12, (-b + Math.sqrt(Math.max(0, b * b + 4 * KA * (ca - na)))) / 2);
    return { HA: ca - na - h, A: na + h, OH: 1e-14 / h, H: h };
  }
  F.add("haconc", (p) => {
    const A = axes({ L: 52, T: 28, W: 250, H: 176, x0: 0, x1: 15, y0: 0, y1: 0.07, xs: 1, ys: 0.01, ym: 0.002, xl: "NaOH 水溶液の滴下量（mL）", yl: "分子・イオンの濃度（mol/L）", yf: (v) => v.toFixed(2), xf: (v) => (v % 5 === 0 ? String(v) : "") });
    /* グラフの上（0.07 より上）にはみ出すところは描かない（[HA] は 1.7 mL あたりから上の枠に入ってくる） */
    const ser = (k) => { const pts = []; for (let v = 0; v <= 15.0001; v += 0.1) { const y = haAt(v)[k]; if (y <= 0.0702) pts.push([v, y]); } return pathOf(pts, A.X, A.Y); };
    let g = A.g + '<path d="' + ser("HA") + '" class="ldd"/><path d="' + ser("A") + '" class="ld"/><path d="' + ser("OH") + '" class="ls"/><path d="' + ser("H") + '" class="ls2"/>';
    g += T(A.X(3.3), A.Y(0.066), "[HA]", "tx b") + T(A.X(9.2), A.Y(0.054), "[A⁻]", "tx b") + T(A.X(12.6), A.Y(0.025), "[OH⁻]", "tx b") + T(A.X(3.1), A.Y(0.009), "[H⁺]（ほぼ 0）", "tx s hl");
    if (p && p[1]) {
      const v = Number(p[1]), s = haAt(v);
      g += line(A.X(v), A.Y(0), A.X(v), A.Y(s.HA), "gd") + dot(A.X(v), A.Y(s.HA), 4.5, "ptg") + dot(A.X(v), A.Y(s.A), 4.5, "ptg") +
        T(A.X(v) + 7, A.Y(s.HA) + 4, "[HA] ＝ " + s.HA.toFixed(3), "tx b c2 hl") + T(A.X(v) + 7, A.Y(s.A) + 14, "[A⁻] ＝ " + s.A.toFixed(3), "tx b c2 hl");
    }
    return '<svg viewBox="0 0 320 244" role="img" aria-label="滴下量と分子・イオンの濃度">' + g + "</svg>";
  });

  /* ── 尿 3.0 mL 中のテストステロンの質量と A⁺ の信号強度（検量線）。":10" で信号 10 の読み取り ── */
  F.add("mscal", (p) => {
    const A = axes({ L: 46, T: 20, W: 250, H: 184, x0: 0, x1: 6, y0: 0, y1: 120, xs: 1, ys: 20, xl: "尿 3.0 mL 中のテストステロンの質量（×10⁻⁸ g）", yl: "A⁺ の信号強度" });
    let g = A.g + line(A.X(0), A.Y(0), A.X(5.5), A.Y(110), "ls");
    [[0, 0], [0.1, 2], [0.2, 4], [1, 20], [2.5, 50], [5, 100]].forEach((d) => { g += dot(A.X(d[0]), A.Y(d[1])); });
    if (p && p[1]) {
      const s = Number(p[1]), m = s / 20;
      g += '<path d="M' + A.X(0) + " " + f1(A.Y(s)) + "H" + f1(A.X(m)) + "V" + A.Y(0) + '" class="ld"/>' + dot(A.X(m), A.Y(s), 5, "ptg") + T(f1(A.X(m + 0.75)), f1(A.Y(s * 0.45)), "信号 " + s + " → " + m.toFixed(1) + "×10⁻⁸ g", "tx b c2 hl");
    }
    return '<svg viewBox="0 0 320 244" role="img" aria-label="テストステロンの検量線">' + g + "</svg>";
  });

  /* ── 棒の質量スペクトル（小さい1枚）── */
  function spec(ox, oy, w, h, x0, x1, xs, bars, n, opt) {
    opt = opt || {};
    /* 番号つき（選択肢）は番号を目盛りの「100」とぶつからない位置（グラフの左上の内側の上）に置く */
    const L = ox + 28, Tp = oy + (n ? 18 : 6), W = w - 34, H = h - (n ? 36 : 24);
    const X = (m) => L + (m - x0) / (x1 - x0) * W, Y = (v) => Tp + H - v / 100 * H;
    let g = n ? T(L + 2, oy + 11, "(" + n + ")", "tx b") : "";
    for (let m = x0; m <= x1 + 1e-9; m += xs) g += line(X(m), Tp, X(m), Tp + H, "gl") + T(f1(X(m)), Tp + H + 11, opt.xf ? opt.xf(m) : String(Math.round(m * 1000) / 1000), "tx s", "middle");
    for (let v = 0; v <= 100; v += 50) g += line(L, Y(v), L + W, Y(v), "gl") + T(L - 3, f1(Y(v) + 3), String(v), "tx s", "end");
    g += '<path d="M' + L + " " + Tp + "V" + (Tp + H) + "H" + (L + W) + '" class="ax"/>';
    bars.forEach((b) => { g += line(X(b[0]), Y(0), X(b[0]), Y(b[1]), "ls", ' style="stroke-width:' + (opt.bw || 3.4) + ';stroke-linecap:butt"'); if (b[2]) g += T(f1(X(b[0]) + 5), f1(Y(b[1]) + 10), b[2], "tx b c1"); });
    return g;
  }
  /* クロロメタン CH₃Cl の相対質量 50 付近（選択肢 (1)〜(6)）。(4) が ³⁵Cl : ³⁷Cl ＝ 3 : 1 */
  F.add("msopt6", () => {
    const O = [
      [[47.5, 7], [48.5, 3], [49.5, 11], [50.5, 100], [51.5, 3]],
      [[47, 7], [48, 3], [49, 11], [50, 100], [51, 3]],
      [[49, 7], [50, 3], [51, 11], [52, 100], [53, 3]],
      [[47, 7], [48, 3], [49, 11], [50, 100], [51, 3], [52, 31]],
      [[47, 7], [48, 3], [49, 18], [50, 100], [51, 15], [52, 97], [53, 3]],
      [[47, 3], [48, 1], [49, 11], [50, 37], [51, 12], [52, 100], [53, 3]],
    ];
    let g = "";
    O.forEach((b, i) => { g += spec((i % 2) * 165, Math.floor(i / 2) * 100, 162, 98, 46, 54, 2, b, i + 1, { bw: 3.2 }); });
    return '<svg viewBox="0 0 330 316" role="img" aria-label="質量スペクトルの選択肢">' + g + T(165, 312, "横軸：相対質量　縦軸：相対強度", "tx s", "middle") + "</svg>";
  });
  /* 混合気体 X（CO・C₂H₄・N₂）の相対質量 27.98〜28.04 の精密な質量スペクトル */
  F.add("ms28", () => {
    const g = spec(10, 6, 310, 220, 27.98, 28.04, 0.01, [[27.995, 70, "ア"], [28.006, 100, "イ"], [28.031, 50, "ウ"]], 0, { bw: 4, xf: (m) => m.toFixed(2) });
    return '<svg viewBox="0 0 330 244" role="img" aria-label="混合気体の精密な質量スペクトル">' + g + T(170, 240, "相対質量", "tx s", "middle") + "</svg>";
  });
  /* メチルビニルケトン CH₃COCH＝CH₂ の質量スペクトル（選択肢 (1)〜(4)・相対強度 10 未満は省略） */
  F.add("msmvk4", () => {
    const O = [
      [[15, 10], [27, 50], [43, 85], [55, 100], [70, 58]],
      [[15, 10], [27, 50], [43, 85], [60, 100], [70, 58]],
      [[15, 10], [27, 50], [38, 85], [55, 100], [70, 58]],
      [[15, 10], [27, 50], [38, 85], [60, 100], [70, 58]],
    ];
    let g = "";
    O.forEach((b, i) => { g += spec(0, i * 84, 330, 82, 10, 80, 10, b, i + 1, { bw: 2.6 }); });
    return '<svg viewBox="0 0 330 346" role="img" aria-label="メチルビニルケトンの質量スペクトルの選択肢">' + g + T(165, 342, "横軸：相対質量　縦軸：相対強度", "tx s", "middle") + "</svg>";
  });
  /* メチルビニルケトンの切れやすい結合（破線） */
  F.add("mvk", () => {
    return '<svg viewBox="0 0 300 92" role="img" aria-label="メチルビニルケトンの構造と切れやすい結合">' +
      T(40, 58, "H₃C", "tx b", "middle") + line(64, 54, 92, 54, "ax") + T(110, 58, "C", "tx b", "middle") + line(128, 54, 156, 54, "ax") + T(196, 58, "CH＝CH₂", "tx b", "middle") +
      line(108, 46, 108, 22, "ax") + line(113, 46, 113, 22, "ax") + T(110, 16, "O", "tx b", "middle") +
      line(78, 30, 78, 72, "ld") + line(142, 30, 142, 72, "ld") + T(150, 88, "破線の位置で切れやすい", "tx s c1", "middle") + "</svg>";
  });
})();
