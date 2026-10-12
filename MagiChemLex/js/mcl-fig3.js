/* ============================================================
   MagiChemLex — mcl-fig3.js（標準セット3 の図・2026-10-12c）
   ・mcl-fig.js の MCLFig.add(name, fn) で登録する（make("o2t:2") のように「名前:引数」）。
   ・色は CSS（.fig の中のクラス）で決める＝ダークでも読める。
   ・グラフの点は問題の数値から計算して描く（O₂ は 2.00×10⁻³ ×(1 − e^(−kt))・k ＝ 0.2338 /min、H₂ は Mg・Na の式から）。
   ============================================================ */
(function () {
  "use strict";
  const F = window.MCLFig;
  if (!F || !F.add) return;
  const T = (x, y, s, c, a) => '<text x="' + x + '" y="' + y + '" class="' + (c || "tx") + '"' + (a ? ' text-anchor="' + a + '"' : "") + ">" + s + "</text>";
  const f1 = (v) => (Math.round(v * 10) / 10).toString();
  const line = (x1, y1, x2, y2, c, extra) => '<line x1="' + f1(x1) + '" y1="' + f1(y1) + '" x2="' + f1(x2) + '" y2="' + f1(y2) + '" class="' + c + '"' + (extra || "") + "/>";
  let uid = 0;
  const arrowDefs = (id) => '<defs><marker id="' + id + '" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="ah"/></marker></defs>';
  /* 目盛りつきのグラフの土台 */
  function axes(o) {
    const X = (v) => o.L + (v - o.x0) / (o.x1 - o.x0) * o.W, Y = (v) => o.T + o.H - (v - o.y0) / (o.y1 - o.y0) * o.H;
    let g = "";
    const eps = 1e-9;
    if (o.xm) for (let v = o.x0; v <= o.x1 + eps; v += o.xm) g += line(X(v), o.T, X(v), o.T + o.H, "gl");
    if (o.ym) for (let v = o.y0; v <= o.y1 + eps; v += o.ym) g += line(o.L, Y(v), o.L + o.W, Y(v), "gl");
    for (let v = o.x0; v <= o.x1 + eps; v += o.xs) { g += line(X(v), o.T, X(v), o.T + o.H, "gm"); g += T(f1(X(v)), o.T + o.H + 13, (o.xf || String)(Math.round(v * 1000) / 1000), "tx s", "middle"); }
    for (let v = o.y0; v <= o.y1 + eps; v += o.ys) { g += line(o.L, Y(v), o.L + o.W, Y(v), "gm"); g += T(o.L - 5, f1(Y(v) + 3.5), (o.yf || String)(Math.round(v * 1000) / 1000), "tx s", "end"); }
    g += '<path d="M' + o.L + " " + o.T + "V" + (o.T + o.H) + "H" + (o.L + o.W) + '" class="ax"/>';
    if (o.xl) g += T(o.L + o.W / 2, o.T + o.H + 28, o.xl, "tx s", "middle");
    if (o.yl) g += T(o.L - 4, o.T - 8, o.yl, "tx s", "start");
    return { X, Y, g };
  }
  const pathOf = (pts, X, Y) => pts.map((p, i) => (i ? "L" : "M") + f1(X(p[0])) + " " + f1(Y(p[1]))).join("");

  /* ── 水蒸気をふくむ空気の圧縮（前・後） ── */
  F.add("comp", () => {
    const id = "mcg" + (++uid);
    /* ピストンの棒は容器の上まで出ている（前は棒が容器の中に浮いて見えた） */
    const cyl = (x, top, lbl, water) =>
      '<path d="M' + x + " 36V178H" + (x + 116) + 'V36" class="ax" fill="none"/>' +
      '<rect x="' + (x + 46) + '" y="8" width="24" height="' + (top - 8) + '" class="bx2"/><rect x="' + (x + 2) + '" y="' + top + '" width="112" height="12" class="bx"/>' +
      (water ? '<rect x="' + (x + 2) + '" y="170" width="112" height="7" class="cW"/>' : "") + lbl;
    return '<svg viewBox="0 0 340 222" role="img" aria-label="水蒸気をふくむ空気の圧縮">' + arrowDefs(id) +
      cyl(14, 58, T(72, 118, "全圧 1.0×10⁵ Pa", "tx s", "middle") + T(72, 134, "体積 24.9 L", "tx s", "middle"), false) +
      '<line x1="142" y1="116" x2="196" y2="116" class="ar" marker-end="url(#' + id + ')"/>' + T(169, 106, "圧縮", "tx b", "middle") + T(169, 134, "300 K のまま", "tx s", "middle") +
      cyl(210, 128, T(268, 158, "体積 8.3 L", "tx s", "middle"), true) + T(268, 194, "↑ 底に液体の水", "tx s c1", "middle") +
      T(72, 214, "圧縮前", "tx b", "middle") + T(268, 214, "圧縮後", "tx b", "middle") + "</svg>";
  });

  /* ── NaCl 型（CaS）の単位格子の面：大＝S²⁻（R）・小＝Ca²⁺（r）。":t" は大きいイオンどうしが対角線上で接する場合 ── */
  F.add("nacl2", (p) => {
    const touch = p && p[1] === "t";
    const id = "mcc" + (++uid), L = 70, Tp = 22, A = 168;
    const half = A / 2;
    const r = touch ? half / (Math.SQRT2 + 2) : half * 0.100 / 0.284, R = half - r;
    const big = [[0, 0], [A, 0], [0, A], [A, A], [half, half]], small = [[half, 0], [0, half], [A, half], [half, A]];
    let g = '<defs><clipPath id="' + id + '"><rect x="' + L + '" y="' + Tp + '" width="' + A + '" height="' + A + '"/></clipPath></defs>';
    g += '<g clip-path="url(#' + id + ')">';
    big.forEach((c) => { g += '<circle cx="' + f1(L + c[0]) + '" cy="' + f1(Tp + c[1]) + '" r="' + f1(R) + '" class="cA"/>'; });
    small.forEach((c) => { g += '<circle cx="' + f1(L + c[0]) + '" cy="' + f1(Tp + c[1]) + '" r="' + f1(r) + '" class="cC"/>'; });
    g += "</g>";
    g += '<rect x="' + L + '" y="' + Tp + '" width="' + A + '" height="' + A + '" class="ax" fill="none"/>';
    g += line(L, Tp + A, L + A, Tp, "ld");
    /* 寸法：右の辺に R・2r・R */
    const xr = L + A + 10;
    g += line(xr, Tp, xr, Tp + A, "gm") + line(xr - 3, Tp + R, xr + 3, Tp + R, "ax") + line(xr - 3, Tp + R + 2 * r, xr + 3, Tp + R + 2 * r, "ax");
    g += T(xr + 6, f1(Tp + R / 2 + 4), "R", "tx b") + T(xr + 6, f1(Tp + R + r + 4), "2r", "tx b c1") + T(xr + 6, f1(Tp + A - R / 2 + 4), "R", "tx b");
    g += T(L + half, Tp + A + 18, touch ? "対角線上で大きいイオンどうしが接する：4R ＝ √2 × 2(R ＋ r)" : "破線＝面の対角線・一辺 ＝ 2(R ＋ r)", "tx s", "middle");
    g += '<circle cx="20" cy="40" r="10" class="cA"/>' + T(34, 44, "S²⁻", "tx s") + '<circle cx="20" cy="68" r="6" class="cC"/>' + T(34, 72, "Ca²⁺", "tx s");
    return '<svg viewBox="0 0 300 220" role="img" aria-label="NaCl 型の単位格子の断面">' + g + "</svg>";
  });

  /* ── メスシリンダー：エタノール 40 mL → 結晶を沈めて 55 mL ── */
  F.add("cyl", () => {
    const id = "mcy" + (++uid);
    const Y = (v) => 190 - v * 2.4;
    const one = (x, v, xtal, lab) => {
      let g = '<path d="M' + x + " " + Y(70) + "V190H" + (x + 44) + "V" + Y(70) + '" class="ax" fill="none"/><path d="M' + (x - 8) + " 194H" + (x + 52) + '" class="ax"/>';
      g += '<rect x="' + (x + 1.5) + '" y="' + f1(Y(v)) + '" width="41" height="' + f1(190 - Y(v)) + '" class="cW"/>';
      for (let m = 10; m <= 60; m += 10) g += line(x, Y(m), x + 9, Y(m), "ax") + T(x + 12, f1(Y(m) + 3.5), String(m), "tx s");
      if (xtal) g += '<path d="M' + (x + 8) + " 189L" + (x + 14) + " 176L" + (x + 22) + " 182L" + (x + 30) + " 172L" + (x + 37) + ' 189Z" class="cC"/>';
      return g + line(x - 4, Y(v), x + 48, Y(v), "ls2") + T(x + 22, 210, lab, "tx s", "middle");
    };
    return '<svg viewBox="0 0 300 222" role="img" aria-label="メスシリンダーの液面の移動">' + arrowDefs(id) +
      one(40, 40, false, "結晶を入れる前") + '<line x1="118" y1="110" x2="170" y2="110" class="ar" marker-end="url(#' + id + ')"/>' + T(144, 100, "CaS 40 g", "tx s", "middle") +
      one(196, 55, true, "結晶を入れた後") + T(250, f1(Y(55) + 4), "55", "tx b c1") + T(94, f1(Y(40) + 4), "40", "tx b c1") + "</svg>";
  });

  /* ── 直列の電気分解：V（AgNO₃ 水溶液・白金 A/B）と W（NaCl 水溶液・炭素 C/D） ── */
  F.add("elec2s", () => {
    const bath = (x, nm, lq) => '<path d="M' + x + " 92V176Q" + x + " 186 " + (x + 10) + " 186H" + (x + 110) + "Q" + (x + 120) + " 186 " + (x + 120) + ' 176V92" class="ax" fill="none"/><rect x="' + (x + 2) + '" y="118" width="116" height="66" class="cW"/>' + T(x + 60, 176, lq, "tx s", "middle") + T(x + 60, 204, nm, "tx b", "middle");
    const elec = (x, nm) => '<rect x="' + x + '" y="70" width="18" height="90" rx="3" class="el"/>' + T(x + 9, 64, nm, "tx b", "middle");
    return '<svg viewBox="0 0 340 230" role="img" aria-label="電気分解の装置">' +
      '<rect x="140" y="10" width="60" height="22" rx="4" class="bx2"/>' + T(170, 25, "電源", "tx s", "middle") + T(130, 26, "−", "tx b", "middle") + T(210, 26, "＋", "tx b", "middle") +
      '<path d="M140 21H59V70M200 21H281V70M109 70V46H231V70" class="wire"/>' +
      bath(30, "電解槽 V", "AgNO₃ 水溶液") + bath(190, "電解槽 W", "NaCl 水溶液") +
      elec(50, "A") + elec(100, "B") + elec(222, "C") + elec(272, "D") +
      T(90, 222, "A・B は白金", "tx s c1", "middle") + T(250, 222, "C・D は炭素", "tx s c1", "middle") + "</svg>";
  });

  /* ── 過酸化水素の分解で発生した O₂（×10⁻³ mol）。表の値と、なめらかな線。":2" は速度定数 2 倍の線も（解説） ── */
  const K0 = 0.2338;
  const o2 = (t, k, a) => (a || 2.0) * (1 - Math.exp(-(k || K0) * t));
  const TAB = [0, 0.417, 0.747, 1.01, 1.22, 1.38, 1.51, 1.61, 1.69, 1.76, 1.81];
  F.add("o2t", (p) => {
    const A = axes({ L: 46, T: 24, W: 250, H: 180, x0: 0, x1: 10, y0: 0, y1: 4, xs: 2, ys: 1, xm: 1, ym: 0.5, xl: "反応開始からの時間（min）", yl: "発生した O₂（×10⁻³ mol）" });
    const cv = []; for (let t = 0; t <= 10.001; t += 0.25) cv.push([t, o2(t)]);
    let g = A.g + '<path d="' + pathOf(cv, A.X, A.Y) + '" class="ls"/>';
    TAB.forEach((v, i) => { g += '<circle cx="' + f1(A.X(i)) + '" cy="' + f1(A.Y(v)) + '" r="3.8" class="pt"/>'; });
    if (p && p[1] === "2") {
      const c2 = []; for (let t = 0; t <= 10.001; t += 0.25) c2.push([t, o2(t, 2 * K0)]);
      g += '<path d="' + pathOf(c2, A.X, A.Y) + '" class="ls2"/>' + line(A.X(0), A.Y(2), A.X(10), A.Y(2), "ld") +
        T(A.X(1.2), A.Y(o2(1.2, 2 * K0)) - 8, "k が 2 倍", "tx b c1") + T(A.X(9.8), A.Y(2) - 6, "最終 2.00", "tx s", "end");
    }
    return '<svg viewBox="0 0 320 244" role="img" aria-label="発生した酸素の物質量の時間変化">' + g + "</svg>";
  });
  /* 問題 c の選択肢の6本の線（(5) が正しい） */
  F.add("o2t6", () => {
    const A = axes({ L: 46, T: 24, W: 250, H: 180, x0: 0, x1: 10, y0: 0, y1: 4, xs: 2, ys: 1, xl: "反応開始からの時間（min）", yl: "発生した O₂（×10⁻³ mol）" });
    const C = [
      ["(1)", (t) => o2(t, 2 * K0, 4.0), "ls", 3.2],
      ["(2)", (t) => o2(t, K0, 4.0), "ld", 6.2],
      ["(3)", (t) => o2(t, 2 * K0, 3.0), "ldd", 5.0],
      ["(4)", (t) => o2(t, 4 * K0, 2.0), "ls2", 1.6],
      ["(5)", (t) => o2(t, 2 * K0, 2.0), "ls", 7.4],
      ["(6)", (t) => o2(t, K0, 2.0), "ld", 9.0],
    ];
    let g = A.g;
    C.forEach((c) => {
      const cv = []; for (let t = 0; t <= 10.001; t += 0.25) cv.push([t, c[1](t)]);
      g += '<path d="' + pathOf(cv, A.X, A.Y) + '" class="' + c[2] + '"/>';
      const x = c[3], y = c[1](x);
      g += '<circle cx="' + f1(A.X(x)) + '" cy="' + f1(A.Y(y)) + '" r="9" class="bx2"/>' + T(f1(A.X(x)), f1(A.Y(y) + 3.5), c[0].replace(/[()]/g, ""), "tx b", "middle");
    });
    return '<svg viewBox="0 0 320 244" role="img" aria-label="発生した酸素の物質量（選択肢の6本）">' + g + "</svg>";
  });

  /* ── 金属の質量と発生した H₂ の体積（0 ℃・1.013×10⁵ Pa）：X＝×、Y＝● ── */
  F.add("h2m", () => {
    const A = axes({ L: 46, T: 24, W: 250, H: 180, x0: 0, x1: 60, y0: 0, y1: 50, xs: 10, ys: 5, xl: "金属の質量（mg）", yl: "発生した H₂ の体積（mL）" });
    const vX = (m) => m / 24 * 22.4, vY = (m) => m / 23 / 2 * 22.4;
    let g = A.g;
    for (let m = 10; m <= 50; m += 5) { const x = A.X(m), y = A.Y(vX(m)); g += '<path d="M' + f1(x - 4) + " " + f1(y - 4) + "L" + f1(x + 4) + " " + f1(y + 4) + "M" + f1(x + 4) + " " + f1(y - 4) + "L" + f1(x - 4) + " " + f1(y + 4) + '" class="ls" style="stroke-width:2"/>'; }
    for (let m = 20; m <= 50; m += 5) g += '<circle cx="' + f1(A.X(m)) + '" cy="' + f1(A.Y(vY(m))) + '" r="3.8" class="pt"/>';
    g += T(A.X(28), A.Y(38), "金属 X（×）", "tx b") + T(A.X(36), A.Y(10), "金属 Y（●）", "tx b");
    return '<svg viewBox="0 0 320 244" role="img" aria-label="金属の質量と発生した水素の体積">' + g + "</svg>";
  });

  /* ── 混合物を加熱して出る気体を吸収管 B・C で捕集する装置 ── */
  F.add("absorb", () => {
    const id = "mca" + (++uid);
    return '<svg viewBox="0 0 360 132" role="img" aria-label="気体を捕集する装置">' + arrowDefs(id) +
      '<line x1="6" y1="62" x2="44" y2="62" class="ar" marker-end="url(#' + id + ')"/>' + T(6, 52, "乾燥した酸素", "tx s") +
      '<rect x="46" y="54" width="130" height="16" rx="6" class="bx"/><rect x="70" y="36" width="70" height="52" rx="8" class="bx2"/>' + T(105, 30, "電気炉", "tx s", "middle") +
      '<ellipse cx="105" cy="66" rx="16" ry="4" class="cC"/>' + T(105, 104, "混合物 A", "tx s", "middle") +
      '<path d="M176 62H196" class="wire"/><rect x="196" y="52" width="60" height="20" rx="8" class="bx"/>' + T(226, 66, "B", "tx b", "middle") + T(226, 92, "吸収管 B", "tx s", "middle") +
      '<path d="M256 62H272" class="wire"/><rect x="272" y="52" width="60" height="20" rx="8" class="bx"/>' + T(302, 66, "C", "tx b", "middle") + T(302, 92, "吸収管 C", "tx s", "middle") +
      '<line x1="332" y1="62" x2="356" y2="62" class="ar" marker-end="url(#' + id + ')"/>' + T(352, 52, "排気", "tx s", "end") + "</svg>";
  });

  /* ── SO₂ のモル濃度 c と log₁₀T（直線）。":-0.10" で log₁₀T ＝ −0.10（T ＝ 0.80）の読み取り（解説） ── */
  F.add("beer", (p) => {
    const A = axes({ L: 52, T: 24, W: 240, H: 176, x0: 0, x1: 10, y0: -0.35, y1: 0, xs: 2, ys: 0.05, xl: "SO₂ のモル濃度 c（×10⁻⁸ mol/L）", yl: "log₁₀T", yf: (v) => v.toFixed(2) });
    const D = [[0, 0], [2, -0.067], [4, -0.133], [6, -0.2], [8, -0.267], [10, -0.333]];
    let g = A.g + line(A.X(0), A.Y(0), A.X(10), A.Y(-1 / 3), "ls");
    D.forEach((d) => { g += '<circle cx="' + f1(A.X(d[0])) + '" cy="' + f1(A.Y(d[1])) + '" r="3.8" class="pt"/>'; });
    if (p && p[1]) {
      const lt = Number(p[1]), c = -lt * 30;
      g += '<path d="M' + A.X(0) + " " + f1(A.Y(lt)) + "H" + f1(A.X(c)) + "V" + f1(A.Y(-0.35)) + '" class="ld"/><circle cx="' + f1(A.X(c)) + '" cy="' + f1(A.Y(lt)) + '" r="5" class="pt"/>' +
        T(f1(A.X(c) + 8), f1(A.Y(lt) - 6), "c ＝ " + c.toFixed(1), "tx b c1");
    }
    return '<svg viewBox="0 0 320 244" role="img" aria-label="SO₂ の濃度と透過率">' + g + "</svg>";
  });
})();
