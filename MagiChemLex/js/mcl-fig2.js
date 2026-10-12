/* ============================================================
   MagiChemLex — mcl-fig2.js（標準セット1・2 の図・2026-10-12）
   ・mcl-fig.js の MCLFig.add(name, fn) で登録する（make("etvp:0.2") のように「名前:引数」）。
   ・色は CSS（.fig の中のクラス）で決める＝ダークでも読める。グラフの目盛りは .gl（細）・.gm（太）。
   ・エタノールの蒸気圧はアントワン式（log₁₀P[mmHg] ＝ 8.20417 − 1642.89/(230.3 ＋ t)）で描く＝問題の答え（約42 ℃ など）と合う。
   ============================================================ */
(function () {
  "use strict";
  const F = window.MCLFig;
  if (!F || !F.add) return;
  const T = (x, y, s, c, a) => '<text x="' + x + '" y="' + y + '" class="' + (c || "tx") + '"' + (a ? ' text-anchor="' + a + '"' : "") + ">" + s + "</text>";
  let uid = 0;
  const arrowDefs = (id) => '<defs><marker id="' + id + '" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="ah"/></marker></defs>';
  const f1 = (v) => (Math.round(v * 10) / 10).toString();
  const line = (x1, y1, x2, y2, c, extra) => '<line x1="' + f1(x1) + '" y1="' + f1(y1) + '" x2="' + f1(x2) + '" y2="' + f1(y2) + '" class="' + c + '"' + (extra || "") + "/>";
  /* 目盛りつきのグラフの土台：o = { L, T, W, H, x0, x1, y0, y1, xs: 太線の間隔, ys, xm: 細線の間隔, ym, xl, yl, xf, yf（目盛りの書式）} */
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
  /* なめらかな線（Catmull-Rom → 3次ベジェ） */
  function smooth(pts, X, Y) {
    const P = pts.map((p) => [X(p[0]), Y(p[1])]);
    let d = "M" + f1(P[0][0]) + " " + f1(P[0][1]);
    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += "C" + f1(c1[0]) + " " + f1(c1[1]) + " " + f1(c2[0]) + " " + f1(c2[1]) + " " + f1(p2[0]) + " " + f1(p2[1]);
    }
    return d;
  }

  /* ── エタノールの蒸気圧（×10⁵ Pa）── */
  const vpE = (t) => Math.pow(10, 8.20417 - 1642.89 / (230.3 + t)) * 133.322 / 1e5;
  const tOfP = (p) => 1642.89 / (8.20417 - Math.log10(p * 1e5 / 133.322)) - 230.3;
  function vpCurve(X, Y) { const pts = []; for (let t = 0; t <= 78.6; t += 1.2) pts.push([t, vpE(t)]); pts.push([tOfP(1.0), 1.0]); return pathOf(pts, X, Y); }
  /* 問題の図：蒸気圧曲線（方眼）。引数があれば、その圧力の線と温度の目印（解説用） */
  F.add("etvp", (p) => {
    const A = axes({ L: 46, T: 24, W: 262, H: 200, x0: 0, x1: 100, y0: 0, y1: 1.0, xs: 10, ys: 0.1, xm: 2, ym: 0.02, xl: "温度（℃）", yl: "蒸気圧（×10⁵ Pa）", yf: (v) => v.toFixed(1) });
    let g = A.g + '<path d="' + vpCurve(A.X, A.Y) + '" class="ls"/>';
    const pr = p && p[1] ? Number(p[1]) : 0;
    if (pr > 0 && pr < 1) {
      const t = tOfP(pr);
      g += '<path d="M' + A.X(0) + " " + f1(A.Y(pr)) + "H" + f1(A.X(t)) + "V" + A.Y(0) + '" class="ld"/><circle cx="' + f1(A.X(t)) + '" cy="' + f1(A.Y(pr)) + '" r="4.5" class="pt"/>' +
        T(f1(A.X(t) + 6), f1(A.Y(pr) - 8), "約 " + Math.round(t) + " ℃", "tx b c1");
    }
    return '<svg viewBox="0 0 320 262" role="img" aria-label="エタノールの蒸気圧曲線">' + g + T(308, 14, "エタノールの蒸気圧曲線", "tx s", "end") + "</svg>";
  });
  /* 問題の図：蒸気圧曲線と点 A〜G（1.0 L の容器・0.024 mol と 0.012 mol の直線） */
  F.add("etvp2", () => {
    const A = axes({ L: 46, T: 22, W: 262, H: 196, x0: 0, x1: 100, y0: 0, y1: 1.0, xs: 10, ys: 0.1, xl: "温度（℃）", yl: "気体の圧力（×10⁵ Pa）", yf: (v) => v.toFixed(1) });
    const lin = (n) => (t) => n * 8300 * (t + 273) / 1e5;
    const cross = (n) => { let lo = 0, hi = 100; for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (vpE(m) < lin(n)(m)) lo = m; else hi = m; } return lo; };
    const tC = cross(0.024), tB = cross(0.012);
    let g = A.g + '<path d="' + vpCurve(A.X, A.Y) + '" class="ls"/>';
    g += line(A.X(0), A.Y(lin(0.024)(0)), A.X(100), A.Y(lin(0.024)(100)), "ld") + line(A.X(0), A.Y(lin(0.012)(0)), A.X(100), A.Y(lin(0.012)(100)), "ld");
    const P = [["A", 0, vpE(0), 8, -6], ["B", tB, vpE(tB), -4, -10], ["C", tC, vpE(tC), -12, -9], ["D", 0, lin(0.012)(0), 8, -7], ["E", 100, lin(0.012)(100), -12, -8], ["F", 0, lin(0.024)(0), 8, -7], ["G", 100, lin(0.024)(100), -12, -8]];
    P.forEach((q) => { g += '<circle cx="' + f1(A.X(q[1])) + '" cy="' + f1(A.Y(q[2])) + '" r="4.5" class="pt"/>' + T(f1(A.X(q[1]) + q[3]), f1(A.Y(q[2]) + q[4]), q[0], "tx b"); });
    return '<svg viewBox="0 0 320 258" role="img" aria-label="気体の圧力と温度の関係">' + g + T(308, 12, "実線＝エタノールの蒸気圧曲線", "tx s", "end") + "</svg>";
  });
  /* 解説の図：水の状態図（三重点より低温・低圧の氷を昇華させる） */
  F.add("pdw", () => {
    const id = "mcf" + (++uid);
    return '<svg viewBox="0 0 320 224" role="img" aria-label="水の状態図">' + arrowDefs(id) +
      '<path d="M40 14V196H306" class="ax"/>' + T(44, 14, "圧力", "tx s") + T(300, 214, "温度", "tx s", "end") +
      '<path d="M48 186Q110 175 150 112" class="ls"/><path d="M150 112Q215 70 290 40" class="ls"/><path d="M150 112L138 20" class="ls"/>' +
      '<circle cx="150" cy="112" r="4.5" class="pt"/>' + T(158, 124, "三重点", "tx s c1") +
      T(78, 70, "固体（氷）", "tx b", "middle") + T(214, 46, "液体", "tx b", "middle") + T(252, 160, "気体", "tx b", "middle") +
      '<path d="M40 112H150" class="gd"/>' +
      '<circle cx="100" cy="140" r="5" class="aC"/>' + T(84, 138, "氷", "tx s", "end") +
      '<line x1="100" y1="146" x2="100" y2="186" class="ar" marker-end="url(#' + id + ')"/>' + T(106, 182, "ア 減圧", "tx b c1") +
      '<line x1="106" y1="140" x2="186" y2="140" class="ar" marker-end="url(#' + id + ')"/>' + T(150, 156, "ウ 加熱", "tx b c1") +
      T(170, 206, "三重点より低い圧力：固体 ⇄ 気体（昇華）", "tx s", "middle") + "</svg>";
  });
  /* 解説の図：0 ℃ の氷の昇華熱をまわり道で求める */
  F.add("subl", () => {
    const id = "mcf" + (++uid);
    const lvL = (y, s) => '<path d="M118 ' + y + 'h80" class="ls"/>' + T(112, y + 4, s, "tx b", "end");
    const lvR = (y, s) => '<path d="M246 ' + y + 'h80" class="ls"/>' + T(286, y - 6, s, "tx b", "middle");
    const ar = (x1, y1, x2, y2) => '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" class="ar" marker-end="url(#' + id + ')"/>';
    return '<svg viewBox="0 0 340 244" role="img" aria-label="昇華熱の求め方">' + arrowDefs(id) +
      lvL(212, "H₂O（固）0 ℃") + lvL(172, "H₂O（液）0 ℃") + lvL(62, "H₂O（気）0 ℃") + lvR(158, "H₂O（液）25 ℃") + lvR(46, "H₂O（気）25 ℃") +
      ar(136, 209, 136, 176) + T(142, 197, "＋6", "tx s c1") +
      ar(200, 170, 244, 160) + T(222, 180, "＋2.0", "tx s c1") +
      ar(304, 154, 304, 50) + T(298, 106, "蒸発熱 ＋44", "tx s c1", "end") +
      ar(244, 48, 200, 60) + T(222, 44, "−1.0", "tx s c3", "middle") +
      ar(180, 209, 180, 66) + T(186, 130, "Q", "tx b c2") +
      T(170, 238, "Q ＝ 6 ＋ 2.0 ＋ 44 − 1.0 ＝ 51 kJ/mol", "tx b c1", "middle") + "</svg>";
  });
  /* α-グルコースの物質量の変化（表の点）。glcb は β と「平衡の50 %」の目印つき（解説） */
  const GL = [[0, 0.1], [0.5, 0.079], [1.5, 0.055], [3, 0.04], [5, 0.034], [7, 0.032], [10, 0.032]];
  const alpha = (t) => 0.032 + 0.068 * Math.exp(-0.739 * t);
  function glc(sol) {
    const A = axes({ L: 52, T: 24, W: 254, H: 180, x0: 0, x1: 10, y0: 0, y1: 0.1, xs: 1, ys: 0.02, xm: 0.5, ym: 0.005, xl: "時間（h）", yl: "物質量（mol）", yf: (v) => v.toFixed(3) });
    const cv = []; for (let t = 0; t <= 10.001; t += 0.1) cv.push([t, alpha(t)]);
    let g = A.g + '<path d="' + pathOf(cv, A.X, A.Y) + '" class="' + (sol ? "ls" : "gd") + '"/>';
    GL.forEach((p) => { g += '<circle cx="' + f1(A.X(p[0])) + '" cy="' + f1(A.Y(p[1])) + '" r="4" class="pt"/>'; });
    g += T(A.X(7.4), A.Y(0.032) - 8, "α", "tx b");
    if (sol) {
      const bv = cv.map((p) => [p[0], 0.1 - p[1]]);
      g += '<path d="' + pathOf(bv, A.X, A.Y) + '" class="ld"/>' + T(A.X(7.4), A.Y(0.068) - 8, "β", "tx b c2");
      const t = Math.log(0.5) / -0.739;
      g += '<path d="M' + A.X(0) + " " + f1(A.Y(0.066)) + "H" + f1(A.X(t)) + "V" + A.Y(0) + '" class="gd"/><circle cx="' + f1(A.X(t)) + '" cy="' + f1(A.Y(0.066)) + '" r="4.5" class="pt"/>' +
        T(f1(A.X(1.6)), f1(A.Y(0.093)), "β ＝ 0.034 ⇔ α ＝ 0.066 → 約 1.0 h", "tx s c1");
    }
    return '<svg viewBox="0 0 320 240" role="img" aria-label="α-グルコースの物質量の変化">' + g + "</svg>";
  }
  F.add("glca", () => glc(false));
  F.add("glcb", () => glc(true));
  /* 1.0×10⁵ Pa の N₂・O₂ の溶解度と温度 */
  F.add("gsolT", () => {
    const A = axes({ L: 46, T: 22, W: 262, H: 196, x0: 0, x1: 80, y0: 0, y1: 2.5, xs: 10, ys: 0.5, ym: 0.1, xl: "温度（℃）", yl: "溶解度（×10⁻³ mol / 水 1 L）", yf: (v) => v.toFixed(1) });
    const O2 = [[0, 2.21], [10, 1.75], [20, 1.40], [30, 1.17], [40, 1.03], [50, 0.93], [60, 0.86], [70, 0.82], [80, 0.80]];
    const N2 = [[0, 1.07], [10, 0.87], [20, 0.70], [30, 0.60], [40, 0.53], [50, 0.48], [60, 0.45], [70, 0.43], [80, 0.42]];
    const g = A.g + '<path d="' + smooth(O2, A.X, A.Y) + '" class="ls"/><path d="' + smooth(N2, A.X, A.Y) + '" class="ls2"/>' +
      T(A.X(34), A.Y(1.17) - 8, "O₂", "tx b c1") + T(A.X(34), A.Y(0.6) - 8, "N₂", "tx b c2");
    return '<svg viewBox="0 0 320 256" role="img" aria-label="窒素と酸素の溶解度の温度変化">' + g + T(306, 40, "1.0×10⁵ Pa", "tx s", "end") + "</svg>";
  });
  /* リン酸型燃料電池（電子は左の電極から外部回路へ） */
  F.add("pafc", () => {
    const id = "mcf" + (++uid);
    return '<svg viewBox="0 0 340 236" role="img" aria-label="リン酸型燃料電池">' + arrowDefs(id) +
      '<rect x="130" y="70" width="80" height="116" class="cW"/>' + T(170, 132, "リン酸", "tx s", "middle") + T(170, 146, "水溶液", "tx s", "middle") +
      '<rect x="112" y="70" width="18" height="116" rx="3" class="el"/><rect x="210" y="70" width="18" height="116" rx="3" class="el"/>' +
      '<path d="M121 70V30H157M183 30H219V70" class="wire"/><circle cx="170" cy="30" r="13" class="bx2"/>' + T(170, 34, "負荷", "tx s", "middle") +
      '<line x1="108" y1="62" x2="108" y2="38" class="ar" marker-end="url(#' + id + ')"/>' + T(96, 52, "e⁻", "tx b c1", "end") +
      '<line x1="232" y1="38" x2="232" y2="62" class="ar" marker-end="url(#' + id + ')"/>' + T(244, 52, "e⁻", "tx b c1") +
      '<path d="M30 84H106M30 172H106M234 84H310M234 172H310" class="wire2"/>' +
      '<line x1="42" y1="96" x2="100" y2="96" class="ar" marker-end="url(#' + id + ')"/>' + T(26, 100, "ア", "tx b", "middle") +
      '<line x1="100" y1="160" x2="42" y2="160" class="ar" marker-end="url(#' + id + ')"/>' + T(26, 164, "ウ", "tx b", "middle") +
      '<line x1="298" y1="96" x2="240" y2="96" class="ar" marker-end="url(#' + id + ')"/>' + T(316, 100, "イ", "tx b", "middle") +
      '<line x1="240" y1="160" x2="298" y2="160" class="ar" marker-end="url(#' + id + ')"/>' + T(316, 164, "エ", "tx b", "middle") +
      T(170, 206, "白金触媒をつけた多孔質の電極（左右）", "tx s", "middle") + T(170, 224, "電子は左の電極から外部回路へ流れ出る", "tx s c1", "middle") + "</svg>";
  });
  /* M の物質量と酸化物の質量（相対値）。M と O₂ の物質量の和は 3.00×10⁻² mol */
  F.add("mxoy", () => {
    const Y = (v) => 192 - v * 170;
    const A = { Y };
    const xs = []; for (let i = 0; i <= 12; i++) xs.push(i * 0.25);
    const bw = 13, step = 270 / 13;
    let g = '<path d="M44 22V192H314" class="ax"/>';
    [0.25, 0.5, 0.75, 1.0].forEach((v) => { g += line(44, A.Y(v), 314, A.Y(v), "gd") + T(39, f1(A.Y(v) + 3.5), v.toFixed(2), "tx s", "end"); });
    g += T(39, 195, "0", "tx s", "end") + T(48, 16, "酸化物の質量（相対値）", "tx s");
    xs.forEach((x, i) => {
      const h = x <= 2.0 ? x / 2.0 : (3.0 - x) / 1.0, cx = 44 + step * (i + 0.5);
      if (h > 0) g += '<rect x="' + f1(cx - bw / 2) + '" y="' + f1(A.Y(h)) + '" width="' + bw + '" height="' + f1(192 - A.Y(h)) + '" class="bar"/>';
      g += line(cx, 192, cx, 196, "ax") + (i % 2 === 0 ? T(f1(cx), 207, x.toFixed(2), "tx s", "middle") : "");
    });
    return '<svg viewBox="0 0 330 236" role="img" aria-label="M の物質量と酸化物の質量">' + g + T(179, 228, "M の物質量（×10⁻² mol）", "tx s", "middle") + "</svg>";
  });
  /* アンモニアソーダ法の流れ */
  F.add("solvay", () => {
    const id = "mcf" + (++uid);
    const B = (x, y, w, s) => '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="22" rx="6" class="bx2"/>' + T(x + w / 2, y + 15, s, "tx s", "middle");
    const A2 = (d) => '<path d="' + d + '" class="ar" fill="none" marker-end="url(#' + id + ')"/>';
    const Dsh = (d) => '<path d="' + d + '" class="gd" marker-end="url(#' + id + ')"/>';
    return '<svg viewBox="0 0 400 256" role="img" aria-label="アンモニアソーダ法の流れ">' + arrowDefs(id) + '<g transform="translate(0,12)">' +
      B(76, 16, 44, "H₂O") + B(8, 50, 50, "NaCl") + B(70, 50, 66, "飽和水溶液") + B(150, 16, 44, "NH₃") +
      B(234, 50, 64, "NaHCO₃") + B(334, 18, 60, "Na₂CO₃") + B(334, 82, 50, "CO₂") +
      B(168, 104, 44, "CO₂") + B(234, 108, 58, "NH₄Cl") +
      B(8, 152, 56, "CaCO₃") + B(150, 196, 44, "CaO") + B(234, 196, 66, "Ca(OH)₂") +
      B(334, 140, 50, "NH₃") + B(334, 196, 56, "CaCl₂") +
      A2("M98 38V48") + A2("M58 61H68") + A2("M136 61H232") + A2("M172 38V57") + A2("M190 104V64") +
      A2("M214 61V119H232") +
      '<path d="M298 61H316M316 29V93" class="ar" fill="none"/>' + A2("M316 29H332") + A2("M316 93H332") + T(312, 50, "熱分解", "tx s c1", "end") +
      '<path d="M64 163H90M90 115V207" class="ar" fill="none"/>' + A2("M90 115H166") + A2("M90 207H148") + T(70, 182, "熱分解", "tx s c1") +
      A2("M194 207H232") + T(213, 200, "＋H₂O", "tx s", "middle") +
      '<path d="M292 119H316M300 207H316M316 119V207" class="ar" fill="none"/>' + A2("M316 151H332") + A2("M316 207H332") +
      Dsh("M359 104V136H224V115H214") + T(290, 150, "再利用（CO₂）", "tx s c2", "middle") +
      Dsh("M384 151H396V6H172V14") + T(286, 0, "再利用（NH₃）", "tx s c2", "middle") +
      "</g></svg>";
  });
  /* ジカルボン酸の還元：A・B・C の割合の時間変化 */
  F.add("redux", () => {
    const A = axes({ L: 44, T: 20, W: 220, H: 170, x0: 0, x1: 96, y0: 0, y1: 100, xs: 24, ys: 20, xl: "反応時間（h）", yl: "化合物の割合（%）" });
    const SA = [[0, 100], [4, 86], [24, 51], [48, 0], [96, 0]], SB = [[0, 0], [4, 2], [24, 19], [48, 53], [96, 92]], SC = [[0, 0], [4, 12], [24, 30], [48, 47], [96, 8]];
    let g = A.g + '<path d="' + pathOf(SA, A.X, A.Y) + '" class="ls"/><path d="' + pathOf(SB, A.X, A.Y) + '" class="ldd"/><path d="' + pathOf(SC, A.X, A.Y) + '" class="ld"/>';
    SA.forEach((p) => { g += '<circle cx="' + f1(A.X(p[0])) + '" cy="' + f1(A.Y(p[1])) + '" r="4" class="pt"/>'; });
    SB.forEach((p) => { const x = A.X(p[0]), y = A.Y(p[1]); g += '<path d="M' + f1(x) + " " + f1(y - 5) + "L" + f1(x + 5) + " " + f1(y + 4) + "L" + f1(x - 5) + " " + f1(y + 4) + 'z" class="ptg"/>'; });
    SC.forEach((p) => { g += '<rect x="' + f1(A.X(p[0]) - 4) + '" y="' + f1(A.Y(p[1]) - 4) + '" width="8" height="8" class="ptw"/>'; });
    g += T(A.X(6), A.Y(86) - 6, "A", "tx b") + T(A.X(80), A.Y(80) - 4, "B", "tx b") + T(A.X(70), A.Y(30) - 4, "C", "tx b");
    g += '<circle cx="282" cy="40" r="4" class="pt"/>' + T(292, 44, "A") + '<path d="M282 63L287 72L277 72z" class="ptg"/>' + T(292, 72, "B") + '<rect x="278" y="88" width="8" height="8" class="ptw"/>' + T(292, 96, "C");
    return '<svg viewBox="0 0 320 228" role="img" aria-label="還元反応の時間変化">' + g + "</svg>";
  });
  /* アルケン A のモル濃度の時間変化（[A]₀ ＝ [O₃]₀ ＝ 5.0×10⁻⁷ mol/L・v ＝ k[A][O₃]、k ＝ 2.5×10⁵） */
  F.add("alkconc", () => {
    const A = axes({ L: 46, T: 24, W: 262, H: 190, x0: 0, x1: 20, y0: 0, y1: 6, xs: 2, ys: 1, xm: 1, ym: 0.2, xl: "時間（s）", yl: "A のモル濃度（×10⁻⁷ mol/L）", yf: (v) => v.toFixed(1) });
    const cv = []; for (let t = 0; t <= 20.001; t += 0.25) cv.push([t, 10 / (2 + 0.25 * t)]);
    return '<svg viewBox="0 0 320 252" role="img" aria-label="アルケン A のモル濃度の時間変化">' + A.g + '<path d="' + pathOf(cv, A.X, A.Y) + '" class="ls"/>' +
      "</svg>";
  });
})();
