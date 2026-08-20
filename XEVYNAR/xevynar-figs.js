/* ============================================================
   XEVYNAR — 図とグラフ（2026-08-18 新規）
   ------------------------------------------------------------
   ねらい
   ・「くわしい解説」に<b>その問題の絵</b>を付ける。式だけを読んでも
     何が起きているのか分からない問題（グラフの形・力の向き・回路のつなぎ方・
     滴定の曲線・平衡の表）は、1枚の図があるだけで通じかたが変わる。
   ・外部ライブラリは入れない。<b>その場で組み立てる SVG</b> だけで描く。
     色は CSS 変数（--fg / --ac / --ac2 / --mut）から受けるので、
     アプリの配色が変わっても図だけ浮くことがない。

   使いかた
     XVFigs.pick(text, n)   … 問題文から、合いそうな図の id を選ぶ
     XVFigs.make(id, o)     … 図1枚（SVG文字列）を作る
     XVFigs.info(id)        … { nm, cap }（図の名前と、読み取りかたの一言）
     XVFigs.all()           … id 一覧

   足しかた
     FIGS に { id, nm, cap, when:[拾う言葉], draw(o) } を1つ足すだけ。
     draw は <svg> の<b>中身</b>だけを返す（枠は wrap が付ける）。
   ============================================================ */
(function () {
  "use strict";

  const W = 320, H = 200;                       /* 図の基準の大きさ */
  const esc = (s) => String(s == null ? "" : s)
    .replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ── 小道具 ───────────────────────────────────────── */
  const P = (n) => Math.round(n * 100) / 100;
  function path(d, o) {
    o = o || {};
    return '<path d="' + d + '" fill="' + (o.fill || "none") + '" stroke="' + (o.s || "var(--fg)") +
      '" stroke-width="' + (o.w || 1.6) + '"' +
      (o.dash ? ' stroke-dasharray="' + o.dash + '"' : "") +
      ' stroke-linecap="round" stroke-linejoin="round"' + (o.op ? ' opacity="' + o.op + '"' : "") + "/>";
  }
  function line(x1, y1, x2, y2, o) { return path("M" + P(x1) + " " + P(y1) + "L" + P(x2) + " " + P(y2), o); }
  function circ(cx, cy, r, o) {
    o = o || {};
    return '<circle cx="' + P(cx) + '" cy="' + P(cy) + '" r="' + P(r) + '" fill="' + (o.fill || "none") +
      '" stroke="' + (o.s || "var(--fg)") + '" stroke-width="' + (o.w || 1.6) + '"' +
      (o.dash ? ' stroke-dasharray="' + o.dash + '"' : "") + "/>";
  }
  function rect(x, y, w, h, o) {
    o = o || {};
    return '<rect x="' + P(x) + '" y="' + P(y) + '" width="' + P(w) + '" height="' + P(h) +
      '" rx="' + (o.r || 0) + '" fill="' + (o.fill || "none") + '" stroke="' + (o.s || "var(--fg)") +
      '" stroke-width="' + (o.w || 1.6) + '"' + (o.dash ? ' stroke-dasharray="' + o.dash + '"' : "") + "/>";
  }
  function txt(x, y, s, o) {
    o = o || {};
    return '<text x="' + P(x) + '" y="' + P(y) + '" font-size="' + (o.size || 10) +
      '" font-weight="' + (o.weight || 700) + '" fill="' + (o.c || "var(--fg)") +
      '" text-anchor="' + (o.anchor || "start") + '"' +
      (o.style ? ' font-style="' + o.style + '"' : "") + ">" + esc(s) + "</text>";
  }
  /* 矢印つきの線（力・速度・向き） */
  let _arrowN = 0;
  function arrow(x1, y1, x2, y2, o) {
    o = o || {};
    const id = "ah" + (++_arrowN);
    const c = o.s || "var(--ac)";
    return '<defs><marker id="' + id + '" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">' +
      '<path d="M0 0L10 5L0 10z" fill="' + c + '"/></marker></defs>' +
      '<path d="M' + P(x1) + " " + P(y1) + "L" + P(x2) + " " + P(y2) + '" fill="none" stroke="' + c +
      '" stroke-width="' + (o.w || 2) + '" marker-end="url(#' + id + ')"' +
      (o.dash ? ' stroke-dasharray="' + o.dash + '"' : "") + "/>";
  }
  /* xy 軸（原点 ox,oy／目盛りの間隔は使う側で決める） */
  function axes(ox, oy, o) {
    o = o || {};
    const x0 = o.x0 == null ? 18 : o.x0, x1 = o.x1 == null ? W - 12 : o.x1;
    const y0 = o.y0 == null ? 14 : o.y0, y1 = o.y1 == null ? H - 22 : o.y1;
    return arrow(x0, oy, x1, oy, { s: "var(--mut)", w: 1.3 }) +
      arrow(ox, y1, ox, y0, { s: "var(--mut)", w: 1.3 }) +
      txt(x1 - 2, oy - 5, o.xl || "x", { c: "var(--mut)", size: 9, anchor: "end" }) +
      txt(ox + 5, y0 + 8, o.yl || "y", { c: "var(--mut)", size: 9 });
  }
  /* 関数のグラフ（f は数学座標 → 画面座標に直して折れ線にする） */
  function plot(f, o) {
    o = o || {};
    const ox = o.ox, oy = o.oy, sx = o.sx, sy = o.sy;
    const a = o.a, b = o.b, n = o.n || 90;
    let d = "", started = false;
    for (let i = 0; i <= n; i++) {
      const x = a + (b - a) * (i / n);
      let y;
      try { y = f(x); } catch (e) { y = NaN; }
      if (!isFinite(y)) { started = false; continue; }
      const px = ox + x * sx, py = oy - y * sy;
      if (py < 4 || py > H - 6) { started = false; continue; }
      d += (started ? "L" : "M") + P(px) + " " + P(py);
      started = true;
    }
    return d ? path(d, { s: o.s || "var(--ac)", w: o.w || 2.2 }) : "";
  }

  /* ══════════════════════════════════════════════════════════
     図の台帳
     ══════════════════════════════════════════════════════════ */
  const FIGS = [
  /* ── 数学 ───────────────────────────────────── */
  {
    id: "parabola", nm: "二次関数のグラフ", cap: "頂点と軸の位置で、最大・最小がどこに出るかが決まります。定義域の端も必ず見ること。",
    when: ["二次関数", "放物線", "頂点", "最大値", "最小値", "平方完成", "判別式", "軸の方程式"],
    /* ★ 2026-08-19 その問題の a,b,c で描く。取れなければ決め打ちの形。 */
    draw(o) {
      const q = (o && o.p && o.p.quad) || null;
      const a = q ? (q.a || 1) : 1, bb = q ? (q.b || 0) : -2, cc = q ? (q.c || 0) : 2;
      const px = -bb / (2 * a), py = cc - bb * bb / (4 * a);   /* 頂点 */
      const f = (x) => a * x * x + bb * x + cc;
      /* 頂点が画面の真ん中に来るように原点をずらし、開きに合わせて縮尺を決める */
      const sx = 26, sy = Math.max(4, Math.min(26, 60 / Math.max(1, Math.abs(a) * 4)));
      const ox = Math.max(40, Math.min(W - 40, 160 - px * sx));
      const oy = Math.max(50, Math.min(H - 30, 100 + py * sy));
      const vx = ox + px * sx, vy = oy - py * sy;
      const fmtN = (v) => (Math.round(v * 100) / 100);
      const sgn = (v) => (v >= 0 ? "+" + fmtN(v) : String(fmtN(v)));
      return axes(ox, oy) +
        plot(f, { ox, oy, sx, sy, a: px - 4.2, b: px + 4.2 }) +
        circ(vx, vy, 3.2, { fill: "var(--ac2)", s: "var(--ac2)" }) +
        line(vx, 20, vx, oy, { s: "var(--mut)", dash: "3 3", w: 1.2 }) +
        txt(vx + 5, vy + (a > 0 ? 16 : -8), "頂点 (" + fmtN(px) + ", " + fmtN(py) + ")", { c: "var(--ac2)", size: 9.5 }) +
        txt(20, 26, q ? ("y=" + (a === 1 ? "" : a === -1 ? "−" : fmtN(a)) + "x²" + (bb ? sgn(bb) + "x" : "") + (cc ? sgn(cc) : ""))
                     : "y=a(x−p)²+q", { c: "var(--ac)", size: 10.5 }) +
        txt(20, 40, q ? ("＝" + (a === 1 ? "" : fmtN(a)) + "(x−" + fmtN(px) + ")²" + sgn(py)) : "", { c: "var(--mut)", size: 9.5 }) +
        txt(20, H - 6, a > 0 ? "a>0 なので頂点が<b>最小</b>".replace(/<[^>]*>/g, "") : "a<0 なので頂点が最大",
          { c: "var(--mut)", size: 9 });
    },
  },
  {
    id: "cubic", nm: "増減表とグラフ", cap: "f′(x)の符号が＋から−に変わるところが極大、−から＋が極小です。",
    when: ["三次関数", "極大", "極小", "増減", "微分", "接線", "f'", "導関数", "変曲"],
    draw() {
      const ox = 150, oy = 118, sx = 30, sy = 11;
      const f = (x) => x * x * x - 3 * x;
      return axes(ox, oy) +
        plot(f, { ox, oy, sx, sy, a: -2.3, b: 2.3 }) +
        circ(ox - 1 * sx, oy - 2 * sy, 3.2, { fill: "var(--ac2)", s: "var(--ac2)" }) +
        circ(ox + 1 * sx, oy + 2 * sy, 3.2, { fill: "var(--ac2)", s: "var(--ac2)" }) +
        txt(ox - 1 * sx - 4, oy - 2 * sy - 7, "極大", { c: "var(--ac2)", size: 9.5, anchor: "end" }) +
        txt(ox + 1 * sx + 5, oy + 2 * sy + 12, "極小", { c: "var(--ac2)", size: 9.5 }) +
        txt(20, 24, "f′(x)=0 の点をさがす", { c: "var(--ac)", size: 10 }) +
        txt(20, H - 20, "f′ ＋ → − ：極大", { c: "var(--mut)", size: 9 }) +
        txt(20, H - 8, "f′ − → ＋ ：極小", { c: "var(--mut)", size: 9 });
    },
  },
  {
    id: "trig", nm: "三角関数のグラフと合成", cap: "a sinθ+b cosθ は、振幅√(a²+b²)の1本の sin に置きかわります。",
    when: ["三角関数", "sinθ", "cosθ", "sin x", "cos x", "合成", "加法定理", "2倍角", "半角",
           "周期", "振幅", "弧度", "ラジアン"],
    /* ★ 2026-08-19 その問題の a sinθ + b cosθ をそのまま描く */
    draw(o) {
      const tp = (o && o.p && o.p.trig) || null;
      const a = tp ? tp.a : 1, b2 = tp ? tp.b : 1;
      const R = Math.sqrt(a * a + b2 * b2) || 1;
      const al = Math.atan2(b2, a);
      const ox = 26, oy = 100, sx = 40, sy = Math.max(10, Math.min(30, 46 / R));
      const f1 = (x) => a * Math.sin(x), f2 = (x) => b2 * Math.cos(x);
      const f3 = (x) => R * Math.sin(x + al);
      /* α をきれいな角で言えるときは、その形で書く */
      const NICE = [[Math.PI / 6, "π/6"], [Math.PI / 4, "π/4"], [Math.PI / 3, "π/3"], [Math.PI / 2, "π/2"],
                    [-Math.PI / 6, "−π/6"], [-Math.PI / 4, "−π/4"], [-Math.PI / 3, "−π/3"], [0, "0"]];
      const hit = NICE.find(([v]) => Math.abs(v - al) < 0.02);
      const rTx = Math.abs(R - Math.round(R)) < 0.01 ? String(Math.round(R))
        : (Math.abs(R - Math.SQRT2) < 0.01 ? "√2" : (Math.abs(R - Math.sqrt(3)) < 0.01 ? "√3" : R.toFixed(2)));
      const co = (v) => (Math.abs(v - 1) < 1e-9 ? "" : Math.abs(v + 1) < 1e-9 ? "−"
        : (Math.abs(v - Math.sqrt(3)) < 0.01 ? "√3" : (Math.abs(v - Math.SQRT2) < 0.01 ? "√2" : String(Math.round(v * 100) / 100))));
      const head = co(a) + "sinθ " + (b2 >= 0 ? "+ " : "− ") + co(Math.abs(b2)) + "cosθ = "
        + rTx + " sin(θ" + (hit ? (al >= 0 ? "+" + hit[1] : hit[1]) : "+α") + ")";
      return line(18, oy, W - 10, oy, { s: "var(--mut)", w: 1.2 }) +
        line(ox, 16, ox, H - 22, { s: "var(--mut)", w: 1.2 }) +
        plot(f1, { ox, oy, sx, sy, a: 0, b: 6.6, s: "var(--mut)", w: 1.4 }) +
        plot(f2, { ox, oy, sx, sy, a: 0, b: 6.6, s: "var(--mut)", w: 1.4 }) +
        plot(f3, { ox, oy, sx, sy, a: 0, b: 6.6, s: "var(--ac)", w: 2.4 }) +
        txt(ox + 2, 26, head, { c: "var(--ac)", size: 9.5 }) +
        txt(ox + Math.PI * sx, oy + 13, "π", { c: "var(--mut)", size: 9, anchor: "middle" }) +
        txt(ox + 2 * Math.PI * sx, oy + 13, "2π", { c: "var(--mut)", size: 9, anchor: "middle" }) +
        txt(20, H - 18, "振幅 √(a²+b²) = " + rTx + "　→ 最大 " + rTx + "／最小 −" + rTx, { c: "var(--ac2)", size: 9.5 }) +
        txt(20, H - 5, "うすい線が sin と cos、濃い線が合成したもの", { c: "var(--mut)", size: 9 });
    },
  },
  {
    id: "unitcircle", nm: "単位円", cap: "cosθが横、sinθが縦。符号は象限で決まります。",
    when: ["単位円", "象限", "sinθ", "cosθ", "tanθ", "π/", "偏角", "一般角", "弧度", "ラジアン"],
    draw(o) {
      const dg = (o && o.p && o.p.deg && o.p.deg.d) != null ? o.p.deg.d : 30;
      const cx = 100, cy = 100, r = 66, th = (dg * Math.PI) / 180;
      const px = cx + r * Math.cos(th), py = cy - r * Math.sin(th);
      return circ(cx, cy, r, { s: "var(--mut)", w: 1.5 }) +
        line(cx - r - 12, cy, cx + r + 12, cy, { s: "var(--mut)", w: 1.2 }) +
        line(cx, cy - r - 12, cx, cy + r + 12, { s: "var(--mut)", w: 1.2 }) +
        arrow(cx, cy, px, py, { s: "var(--ac)", w: 2 }) +
        line(px, py, px, cy, { s: "var(--ac2)", dash: "3 3", w: 1.4 }) +
        line(px, cy, cx, cy, { s: "var(--ac2)", w: 2.2 }) +
        path("M" + (cx + 22) + " " + cy + "A22 22 0 0 0 " + P(cx + 22 * Math.cos(th)) + " " + P(cy - 22 * Math.sin(th)),
          { s: "var(--ac)", w: 1.4 }) +
        txt(cx + 26, cy - 8, "θ=" + Math.round(dg) + "°", { c: "var(--ac)", size: 9.5 }) +
        txt((cx + px) / 2, cy + 13, "cosθ", { c: "var(--ac2)", size: 9.5, anchor: "middle" }) +
        txt(px + 5, (cy + py) / 2, "sinθ", { c: "var(--ac2)", size: 9.5 }) +
        txt(196, 40, "第1象限 ＋＋", { c: "var(--mut)", size: 9.5 }) +
        txt(196, 58, "第2象限 −＋", { c: "var(--mut)", size: 9.5 }) +
        txt(196, 76, "第3象限 −−", { c: "var(--mut)", size: 9.5 }) +
        txt(196, 94, "第4象限 ＋−", { c: "var(--mut)", size: 9.5 }) +
        txt(196, 120, "（cos, sin の順）", { c: "var(--mut)", size: 9 });
    },
  },
  {
    id: "explog", nm: "指数・対数のグラフ", cap: "y=aˣ と y=log_a x は y=x について対称。真数は必ず正です。",
    when: ["指数", "対数", "log", "e^", "aˣ", "真数", "底"],
    draw() {
      const ox = 60, oy = 140, sx = 30, sy = 22;
      return axes(ox, oy) +
        plot((x) => Math.exp(x), { ox, oy, sx, sy, a: -1.4, b: 1.9, s: "var(--ac)" }) +
        plot((x) => Math.log(x), { ox, oy, sx, sy, a: 0.05, b: 7.5, s: "var(--ac2)" }) +
        plot((x) => x, { ox, oy, sx, sy, a: -0.6, b: 4.4, s: "var(--mut)", w: 1.2 }) +
        txt(ox + 40, 34, "y=eˣ", { c: "var(--ac)", size: 10 }) +
        txt(ox + 120, oy - 34, "y=log x", { c: "var(--ac2)", size: 10 }) +
        txt(20, H - 6, "log の中身（真数）は 0 より大きい範囲だけ", { c: "var(--mut)", size: 9 });
    },
  },
  {
    id: "area", nm: "定積分と面積", cap: "上の関数から下の関数を引いて積分します。上下が入れかわる点で区間を切ること。",
    when: ["積分", "面積", "∫", "定積分", "囲まれた", "体積"],
    draw() {
      const ox = 40, oy = 150, sx = 52, sy = 26;
      const f = (x) => 3 - (x - 1.6) * (x - 1.6) * 0.9;
      let d = "M" + (ox + 0.4 * sx) + " " + oy;
      for (let i = 0; i <= 40; i++) { const x = 0.4 + (2.8 - 0.4) * (i / 40); d += "L" + P(ox + x * sx) + " " + P(oy - f(x) * sy); }
      d += "L" + P(ox + 2.8 * sx) + " " + oy + "Z";
      return axes(ox, oy) +
        path(d, { fill: "rgba(139,122,232,.18)", s: "none", w: 0 }) +
        plot(f, { ox, oy, sx, sy, a: 0, b: 3.3, s: "var(--ac)" }) +
        line(ox + 0.4 * sx, oy, ox + 0.4 * sx, oy - f(0.4) * sy, { s: "var(--ac2)", dash: "3 3", w: 1.3 }) +
        line(ox + 2.8 * sx, oy, ox + 2.8 * sx, oy - f(2.8) * sy, { s: "var(--ac2)", dash: "3 3", w: 1.3 }) +
        txt(ox + 0.4 * sx, oy + 13, "a", { c: "var(--ac2)", size: 10, anchor: "middle" }) +
        txt(ox + 2.8 * sx, oy + 13, "b", { c: "var(--ac2)", size: 10, anchor: "middle" }) +
        txt(ox + 1.5 * sx, oy - 30, "S=∫ₐᵇ f(x)dx", { c: "var(--fg)", size: 10.5, anchor: "middle" });
    },
  },
  {
    id: "rot", nm: "回転体の体積", cap: "切り口は円。半径は「軸からの距離」です。中空なら (外)²−(内)² を積分します。",
    when: ["回転体", "体積", "x軸のまわり", "y軸のまわり", "バウムクーヘン", "回転させてできる"],
    draw() {
      const ox = 40, oy = 110, sx = 62, sy = 30;
      const f = (x) => 0.6 + 0.8 * x;
      let d = "M" + (ox) + " " + oy;
      for (let i = 0; i <= 30; i++) { const x = (2.4) * (i / 30); d += "L" + P(ox + x * sx) + " " + P(oy - f(x) * sy); }
      d += "L" + P(ox + 2.4 * sx) + " " + oy + "Z";
      return line(20, oy, W - 12, oy, { s: "var(--mut)", w: 1.3 }) +
        path(d, { fill: "rgba(139,122,232,.16)", s: "none" }) +
        plot(f, { ox, oy, sx, sy, a: 0, b: 2.4, s: "var(--ac)" }) +
        plot((x) => -f(x), { ox, oy, sx, sy, a: 0, b: 2.4, s: "var(--ac)", w: 1.3 }) +
        '<ellipse cx="' + P(ox + 1.5 * sx) + '" cy="' + oy + '" rx="7" ry="' + P(f(1.5) * sy) +
          '" fill="none" stroke="var(--ac2)" stroke-width="1.6"/>' +
        line(ox + 1.5 * sx, oy, ox + 1.5 * sx, oy - f(1.5) * sy, { s: "var(--ac2)", w: 1.6 }) +
        txt(ox + 1.5 * sx + 6, oy - f(1.5) * sy / 2, "y", { c: "var(--ac2)", size: 10 }) +
        txt(20, 28, "V=π∫y²dx（切り口の円を足す）", { c: "var(--fg)", size: 10.5 }) +
        txt(20, H - 6, "軸からの距離が半径。軸がずれていれば |f−k|", { c: "var(--mut)", size: 9 });
    },
  },
  {
    id: "circleline", nm: "円と直線", cap: "中心から直線までの距離 d と半径 r をくらべるだけで、交わる／接する／離れるが決まります。",
    when: ["円の方程式", "直線", "接する", "接線", "交点", "点と直線の距離", "中心と半径", "外接", "内接"],
    draw() {
      const cx = 118, cy = 100, r = 52;
      return circ(cx, cy, r, { s: "var(--ac)", w: 2 }) +
        circ(cx, cy, 2.6, { fill: "var(--ac)", s: "var(--ac)" }) +
        line(30, 168, 300, 52, { s: "var(--fg)", w: 1.8 }) +
        line(cx, cy, cx + 30, cy - 41, { s: "var(--ac2)", dash: "4 3", w: 1.6 }) +
        txt(cx + 8, cy - 22, "d", { c: "var(--ac2)", size: 11 }) +
        txt(cx - 26, cy + 16, "r", { c: "var(--ac)", size: 11 }) +
        line(cx, cy, cx - 52, cy, { s: "var(--ac)", dash: "3 3", w: 1.3 }) +
        txt(20, 26, "d<r 交わる ／ d=r 接する ／ d>r 離れる", { c: "var(--fg)", size: 10 }) +
        txt(20, H - 6, "d=|ax₀+by₀+c|/√(a²+b²)", { c: "var(--mut)", size: 9.5 });
    },
  },
  {
    id: "vector", nm: "ベクトルの分解と内積", cap: "内積は「片方に落とした影の長さ × もう片方の長さ」。0 なら垂直です。",
    when: ["ベクトル", "内積", "垂直", "平行", "成分", "分解", "なす角", "内分", "外分", "分点", "位置ベクトル"],
    /* ★ 2026-08-19 成分が分かるときは、その向きで矢印を描く */
    draw(o) {
      const vp = (o && o.p && o.p.vec) || null;
      const ox = 90, oy = 120;
      const sc = vp ? Math.min(46, 120 / Math.max(1, Math.abs(vp.x1 || 1), Math.abs(vp.y1 || 1),
        Math.abs(vp.x2 || 1), Math.abs(vp.y2 || 1))) : 40;
      const ax = vp ? ox + (vp.x1 || 0) * sc : 210, ay = vp ? oy - (vp.y1 || 0) * sc : 60;
      const bx = (vp && vp.x2 != null) ? ox + vp.x2 * sc : 250;
      const by = (vp && vp.y2 != null) ? oy - vp.y2 * sc : 150;
      return axes(ox, oy, { xl: "", yl: "" }) +
        arrow(ox, oy, ax, ay, { s: "var(--ac)", w: 2.2 }) +
        arrow(ox, oy, bx, by, { s: "var(--ac2)", w: 2.2 }) +
        line(ax, ay, ax, oy, { s: "var(--mut)", dash: "3 3", w: 1.3 }) +
        txt(ax + 5, ay - 4, (o && o.p && o.p.vec) ? "a=(" + o.p.vec.x1 + ", " + o.p.vec.y1 + ")" : "a",
          { c: "var(--ac)", size: 9.5 }) +
        txt(bx + 4, by + 2, (o && o.p && o.p.vec && o.p.vec.x2 != null)
          ? "b=(" + o.p.vec.x2 + ", " + o.p.vec.y2 + ")" : "b", { c: "var(--ac2)", size: 9.5 }) +
        path("M" + (ox + 26) + " " + oy + "A26 26 0 0 0 " + P(ox + 26 * 0.87) + " " + P(oy - 26 * 0.5), { s: "var(--fg)", w: 1.3 }) +
        txt(ox + 30, oy - 8, "θ", { size: 10 }) +
        txt(20, 26, "a·b = |a||b|cosθ = x₁x₂+y₁y₂", { c: "var(--fg)", size: 10.5 }) +
        txt(20, H - 6, "a·b=0 ⇔ 垂直　／　b=ka ⇔ 平行", { c: "var(--mut)", size: 9.5 });
    },
  },
  {
    id: "seq", nm: "漸化式の収束", cap: "y=f(x) と y=x の交点が「動かない値」。そこへ近づくか離れるかで収束か発散かが決まります。",
    when: ["漸化式", "数列", "収束", "発散", "極限", "aₙ", "a_n", "不動点", "特性方程式"],
    draw() {
      const ox = 40, oy = 160, s = 34;
      const f = (x) => 0.55 * x + 1.4;
      let steps = "";
      let x = 0.5;
      for (let i = 0; i < 5; i++) {
        const y = f(x);
        steps += line(ox + x * s, oy - x * s, ox + x * s, oy - y * s, { s: "var(--ac2)", w: 1.4 });
        steps += line(ox + x * s, oy - y * s, ox + y * s, oy - y * s, { s: "var(--ac2)", w: 1.4 });
        x = y;
      }
      return axes(ox, oy, { xl: "aₙ", yl: "aₙ₊₁" }) +
        plot((v) => v, { ox, oy, sx: s, sy: s, a: 0, b: 4.2, s: "var(--mut)", w: 1.3 }) +
        plot(f, { ox, oy, sx: s, sy: s, a: 0, b: 4.2, s: "var(--ac)", w: 2 }) +
        steps +
        circ(ox + 3.11 * s, oy - 3.11 * s, 3.4, { fill: "var(--ac)", s: "var(--ac)" }) +
        txt(ox + 3.11 * s + 6, oy - 3.11 * s - 6, "α（不動点）", { c: "var(--ac)", size: 9.5 }) +
        txt(20, 26, "|公比|<1 なら α に収束", { c: "var(--fg)", size: 10.5 });
    },
  },
  {
    id: "numline", nm: "数直線と場合分け", cap: "境目の点で区間を切り、それぞれで符号がどうなるかを書き入れます。",
    when: ["不等式", "範囲", "場合分け", "絶対値", "解の個数", "以上", "以下", "整数解"],
    draw(o) {
      const rg = (o && o.p && o.p.range) || null;
      const y = 96;
      const loT = rg ? String(rg.lo) : "a", hiT = rg ? String(rg.hi) : "b";
      return arrow(24, y, W - 16, y, { s: "var(--mut)", w: 1.4 }) +
        circ(96, y, 4.5, { fill: "var(--bg2)", s: "var(--ac)", w: 2 }) +
        circ(216, y, 4.5, { fill: "var(--ac)", s: "var(--ac)", w: 2 }) +
        line(96, y, 216, y, { s: "var(--ac)", w: 4 }) +
        txt(96, y + 20, loT, { c: "var(--ac)", size: 10.5, anchor: "middle" }) +
        txt(216, y + 20, hiT, { c: "var(--ac)", size: 10.5, anchor: "middle" }) +
        txt(50, y - 16, "−", { c: "var(--mut)", size: 13, anchor: "middle" }) +
        txt(156, y - 16, "＋", { c: "var(--ac)", size: 13, anchor: "middle" }) +
        txt(268, y - 16, "−", { c: "var(--mut)", size: 13, anchor: "middle" }) +
        txt(20, 34, (o && o.p && o.p.range) ? (o.p.range.lo + " ≦ x ≦ " + o.p.range.hi) : "a < x ≦ b",
          { c: "var(--fg)", size: 12 }) +
        txt(20, H - 10, "白丸＝含まない（<）／黒丸＝含む（≦）", { c: "var(--mut)", size: 9 });
    },
  },
  {
    id: "tree", nm: "場合の数の樹形図", cap: "「同時に起きる」なら掛け算、「どちらか」なら足し算です。",
    when: ["場合の数", "確率", "組合せ", "順列", "何通り", "サイコロ", "硬貨", "取り出す", "並べ"],
    draw() {
      let s = circ(40, 100, 5, { fill: "var(--ac)", s: "var(--ac)" });
      const ys1 = [60, 140];
      ys1.forEach((y1, i) => {
        s += line(45, 100, 125, y1, { s: "var(--mut)", w: 1.4 });
        s += circ(130, y1, 4.5, { fill: "var(--ac2)", s: "var(--ac2)" });
        s += txt(80, (100 + y1) / 2 - 4, i === 0 ? "表" : "裏", { c: "var(--mut)", size: 9.5, anchor: "middle" });
        [-26, 26].forEach((dy, j) => {
          s += line(135, y1, 220, y1 + dy, { s: "var(--mut)", w: 1.3 });
          s += circ(224, y1 + dy, 4, { fill: "var(--fg)", s: "var(--fg)" });
          s += txt(236, y1 + dy + 4, (i === 0 ? "表" : "裏") + (j === 0 ? "表" : "裏"), { c: "var(--fg)", size: 9.5 });
        });
      });
      return s + txt(20, 26, "2 × 2 = 4 通り", { c: "var(--fg)", size: 11 }) +
        txt(20, H - 8, "枝の数を掛け算していく", { c: "var(--mut)", size: 9 });
    },
  },
  {
    id: "complexplane", nm: "複素数平面", cap: "掛け算は「大きさを掛けて、角を足す」＝回転と拡大です。",
    when: ["複素数", "偏角", "極形式", "ド・モアブル", "共役", "|z|", "複素数平面"],
    draw() {
      const ox = 90, oy = 110, s = 34;
      return axes(ox, oy, { xl: "実", yl: "虚" }) +
        arrow(ox, oy, ox + 2 * s, oy - 1 * s, { s: "var(--ac)", w: 2.2 }) +
        arrow(ox, oy, ox + 1 * s, oy - 2 * s, { s: "var(--ac2)", w: 2.2, dash: "4 3" }) +
        path("M" + (ox + 30) + " " + oy + "A30 30 0 0 0 " + P(ox + 30 * 0.894) + " " + P(oy - 30 * 0.447), { s: "var(--ac)", w: 1.3 }) +
        txt(ox + 2 * s + 5, oy - 1 * s - 4, "z", { c: "var(--ac)", size: 11 }) +
        txt(ox + 1 * s + 5, oy - 2 * s - 4, "iz（90°回転）", { c: "var(--ac2)", size: 9.5 }) +
        txt(20, 26, "z=r(cosθ+isinθ)", { c: "var(--fg)", size: 10.5 }) +
        txt(20, H - 6, "|z|=r が大きさ、arg z=θ が角", { c: "var(--mut)", size: 9.5 });
    },
  },

  /* ── 物理 ───────────────────────────────────── */
  {
    id: "incline", nm: "斜面の力の分解", cap: "重力を斜面方向 mg sinθ と垂直方向 mg cosθ に分けます。軸を斜面にとるのがコツ。",
    when: ["斜面", "傾き", "摩擦", "垂直抗力", "すべ", "斜面上", "θの斜面", "静止摩擦"],
    draw() {
      const ax = 30, ay = 160, bx = 280, by = 160, tx = 30, ty = 56;
      const px = 150, py = ay - (ay - ty) * ((bx - px) / (bx - ax));
      return path("M" + ax + " " + ay + "L" + bx + " " + by + "L" + tx + " " + ty + "Z", { s: "var(--mut)", w: 1.6, fill: "rgba(120,130,190,.08)" }) +
        rect(px - 13, py - 13, 26, 26, { r: 3, s: "var(--fg)", w: 1.8, fill: "rgba(139,122,232,.16)" }) +
        arrow(px, py, px, py + 46, { s: "var(--ac2)", w: 2 }) +
        arrow(px, py, px + 32, py - 30, { s: "var(--ac)", w: 2 }) +
        arrow(px, py, px - 26, py - 28, { s: "var(--ac)", w: 2, dash: "4 3" }) +
        txt(px + 4, py + 56, "mg", { c: "var(--ac2)", size: 10 }) +
        txt(px + 36, py - 32, "N", { c: "var(--ac)", size: 10 }) +
        txt(px - 52, py - 30, "mg sinθ", { c: "var(--ac)", size: 9.5 }) +
        path("M" + (ax + 34) + " " + ay + "A34 34 0 0 0 " + P(ax + 34 * 0.92) + " " + P(ay - 34 * 0.38), { s: "var(--fg)", w: 1.3 }) +
        txt(ax + 40, ay - 8, "θ", { size: 10 }) +
        txt(20, 26, "斜面方向：ma = mg sinθ − 摩擦", { c: "var(--fg)", size: 10 }) +
        txt(20, 40, "垂直方向：N = mg cosθ", { c: "var(--mut)", size: 9.5 });
    },
  },
  {
    id: "spring", nm: "ばねと単振動", cap: "つりあいの位置を原点にとると、力は F=−kx になり、そこから ω²=k/m が読めます。",
    when: ["ばね", "単振動", "振動", "周期", "ばね定数", "振り子", "つりあい", "復元力", "角振動数"],
    draw() {
      let coil = "M40 100";
      for (let i = 0; i < 8; i++) coil += "l7 -13l7 13";
      return line(28, 60, 28, 140, { s: "var(--mut)", w: 3 }) +
        path(coil, { s: "var(--fg)", w: 1.8 }) +
        rect(152, 82, 36, 36, { r: 4, s: "var(--fg)", w: 1.8, fill: "rgba(139,122,232,.18)" }) +
        line(170, 140, 170, 156, { s: "var(--mut)", dash: "3 3", w: 1.3 }) +
        txt(170, 170, "つりあい（x=0）", { c: "var(--mut)", size: 9, anchor: "middle" }) +
        arrow(190, 100, 246, 100, { s: "var(--ac2)", w: 2 }) +
        txt(210, 92, "x", { c: "var(--ac2)", size: 10 }) +
        arrow(150, 130, 96, 130, { s: "var(--ac)", w: 2 }) +
        txt(104, 145, "F=−kx", { c: "var(--ac)", size: 10 }) +
        txt(20, 30, "a=−(k/m)x → ω=√(k/m)", { c: "var(--fg)", size: 10.5 }) +
        txt(20, 46, "T=2π√(m/k)（振り子は 2π√(l/g)）", { c: "var(--mut)", size: 9.5 });
    },
  },
  {
    id: "collision", nm: "衝突の前後", cap: "運動量保存＋反発係数の2本で、衝突後の2つの速度が決まります。",
    when: ["衝突", "運動量", "反発係数", "はねかえり", "弾性", "合体", "力積", "近づく速さ"],
    draw() {
      return txt(20, 26, "衝突まえ", { c: "var(--mut)", size: 10 }) +
        circ(70, 62, 16, { s: "var(--ac)", w: 2, fill: "rgba(139,122,232,.16)" }) +
        circ(180, 62, 20, { s: "var(--ac2)", w: 2, fill: "rgba(46,139,255,.14)" }) +
        arrow(90, 62, 132, 62, { s: "var(--ac)", w: 2 }) +
        txt(66, 66, "m₁", { size: 9.5, anchor: "middle" }) + txt(176, 66, "m₂", { size: 9.5, anchor: "middle" }) +
        txt(106, 52, "v₁", { c: "var(--ac)", size: 9.5, anchor: "middle" }) +
        txt(20, 118, "衝突のあと", { c: "var(--mut)", size: 10 }) +
        circ(70, 152, 16, { s: "var(--ac)", w: 2, fill: "rgba(139,122,232,.16)" }) +
        circ(200, 152, 20, { s: "var(--ac2)", w: 2, fill: "rgba(46,139,255,.14)" }) +
        arrow(90, 152, 112, 152, { s: "var(--ac)", w: 2 }) +
        arrow(222, 152, 282, 152, { s: "var(--ac2)", w: 2 }) +
        txt(100, 142, "v₁′", { c: "var(--ac)", size: 9.5, anchor: "middle" }) +
        txt(252, 142, "v₂′", { c: "var(--ac2)", size: 9.5, anchor: "middle" }) +
        txt(20, H - 8, "m₁v₁+m₂v₂ = m₁v₁′+m₂v₂′ ／ e=−(v₁′−v₂′)/(v₁−v₂)", { c: "var(--fg)", size: 9 });
    },
  },
  {
    id: "circular", nm: "円運動", cap: "向心加速度は中心向きに v²/r。糸の張力や垂直抗力が向心力を作ります。",
    when: ["円運動", "向心", "遠心", "角速度", "万有引力", "衛星", "ケプラー", "等速円運動"],
    draw() {
      const cx = 150, cy = 104, r = 62;
      const th = -0.9, px = cx + r * Math.cos(th), py = cy + r * Math.sin(th);
      return circ(cx, cy, r, { s: "var(--mut)", dash: "5 4", w: 1.4 }) +
        circ(cx, cy, 3.2, { fill: "var(--mut)", s: "var(--mut)" }) +
        circ(px, py, 11, { s: "var(--fg)", w: 1.8, fill: "rgba(139,122,232,.18)" }) +
        arrow(px, py, cx + (px - cx) * 0.28, cy + (py - cy) * 0.28, { s: "var(--ac)", w: 2 }) +
        arrow(px, py, px + 44 * Math.cos(th + Math.PI / 2), py + 44 * Math.sin(th + Math.PI / 2), { s: "var(--ac2)", w: 2 }) +
        txt(cx + (px - cx) * 0.42 + 6, cy + (py - cy) * 0.42, "向心力", { c: "var(--ac)", size: 9.5 }) +
        txt(px + 26, py - 32, "v（接線）", { c: "var(--ac2)", size: 9.5 }) +
        line(cx, cy, px, py, { s: "var(--mut)", w: 1.2 }) +
        txt((cx + px) / 2 - 4, (cy + py) / 2 + 12, "r", { c: "var(--mut)", size: 10 }) +
        txt(20, 26, "F = mv²/r = mrω²", { c: "var(--fg)", size: 10.5 }) +
        txt(20, H - 8, "速度は接線向き、加速度は中心向き", { c: "var(--mut)", size: 9 });
    },
  },
  {
    id: "wave", nm: "波の干渉（経路差）", cap: "経路差が mλ なら強め合い、(m+½)λ なら弱め合い。反射での位相の飛びを数えてから決めます。",
    when: ["干渉", "波", "ヤング", "回折", "スリット", "薄膜", "経路差", "波長", "明線", "うなり", "定常波"],
    draw() {
      const s1 = { x: 46, y: 74 }, s2 = { x: 46, y: 126 }, p = { x: 268, y: 88 };
      let waves = "";
      for (let i = 1; i <= 5; i++) {
        waves += circ(s1.x, s1.y, i * 17, { s: "var(--ac)", w: 0.9, op: 0.42 });
        waves += circ(s2.x, s2.y, i * 17, { s: "var(--ac2)", w: 0.9, op: 0.42 });
      }
      return line(34, 40, 34, 160, { s: "var(--mut)", w: 3 }) +
        waves +
        circ(s1.x, s1.y, 3.4, { fill: "var(--ac)", s: "var(--ac)" }) +
        circ(s2.x, s2.y, 3.4, { fill: "var(--ac2)", s: "var(--ac2)" }) +
        line(s1.x, s1.y, p.x, p.y, { s: "var(--ac)", w: 1.5 }) +
        line(s2.x, s2.y, p.x, p.y, { s: "var(--ac2)", w: 1.5 }) +
        circ(p.x, p.y, 3.6, { fill: "var(--fg)", s: "var(--fg)" }) +
        txt(p.x - 4, p.y - 9, "P", { size: 10, anchor: "end" }) +
        txt(20, 26, "経路差 = |S₂P − S₁P|", { c: "var(--fg)", size: 10.5 }) +
        txt(20, H - 8, "= mλ 強め合い ／ =(m+½)λ 弱め合い", { c: "var(--mut)", size: 9.5 });
    },
  },
  {
    id: "lens", nm: "レンズと屈折", cap: "1/a+1/b=1/f。実像は逆向き、虚像は同じ向きです。",
    when: ["レンズ", "屈折", "焦点", "実像", "虚像", "凸レンズ", "凹レンズ", "全反射", "臨界角"],
    draw() {
      const cx = 160, cy = 100;
      return line(20, cy, 300, cy, { s: "var(--mut)", w: 1.2 }) +
        '<ellipse cx="' + cx + '" cy="' + cy + '" rx="12" ry="52" fill="rgba(46,139,255,.14)" stroke="var(--ac2)" stroke-width="1.8"/>' +
        circ(cx - 56, cy, 3, { fill: "var(--mut)", s: "var(--mut)" }) +
        circ(cx + 56, cy, 3, { fill: "var(--mut)", s: "var(--mut)" }) +
        txt(cx - 56, cy + 15, "F", { c: "var(--mut)", size: 9, anchor: "middle" }) +
        txt(cx + 56, cy + 15, "F", { c: "var(--mut)", size: 9, anchor: "middle" }) +
        arrow(74, cy, 74, cy - 40, { s: "var(--ac)", w: 2.2 }) +
        line(74, cy - 40, cx, cy - 40, { s: "var(--ac)", w: 1.4 }) +
        line(cx, cy - 40, 258, cy + 32, { s: "var(--ac)", w: 1.4 }) +
        line(74, cy - 40, cx, cy, { s: "var(--ac)", w: 1.4, dash: "3 3" }) +
        arrow(258, cy, 258, cy + 32, { s: "var(--ac2)", w: 2.2 }) +
        txt(60, cy - 44, "物体", { c: "var(--ac)", size: 9.5 }) +
        txt(264, cy + 40, "実像（逆向き）", { c: "var(--ac2)", size: 9.5 }) +
        txt(20, 26, "1/a + 1/b = 1/f", { c: "var(--fg)", size: 10.5 });
    },
  },
  {
    id: "capacitor", nm: "コンデンサー", cap: "電池につないだままなら V 一定、切り離したら Q 一定。ここを最初に決めます。",
    when: ["コンデンサー", "電気容量", "極板", "誘電体", "電池", "充電", "スイッチ", "静電"],
    draw() {
      return line(70, 56, 70, 144, { s: "var(--ac)", w: 4 }) +
        line(140, 56, 140, 144, { s: "var(--ac2)", w: 4 }) +
        txt(64, 46, "＋Q", { c: "var(--ac)", size: 10, anchor: "middle" }) +
        txt(146, 46, "−Q", { c: "var(--ac2)", size: 10, anchor: "middle" }) +
        arrow(74, 76, 136, 76, { s: "var(--mut)", w: 1.4 }) +
        arrow(74, 100, 136, 100, { s: "var(--mut)", w: 1.4 }) +
        arrow(74, 124, 136, 124, { s: "var(--mut)", w: 1.4 }) +
        txt(105, 158, "d", { c: "var(--mut)", size: 10, anchor: "middle" }) +
        line(70, 150, 140, 150, { s: "var(--mut)", dash: "3 3", w: 1.2 }) +
        txt(184, 74, "C = εS/d", { c: "var(--fg)", size: 11 }) +
        txt(184, 96, "Q = CV", { c: "var(--fg)", size: 11 }) +
        txt(184, 118, "U = ½QV", { c: "var(--fg)", size: 11 }) +
        txt(20, 26, "つないだまま→V一定 ／ 切り離す→Q一定", { c: "var(--ac)", size: 9.5 });
    },
  },
  {
    id: "circuit", nm: "直流回路", cap: "節点で電流の和が0、閉路で電圧の和が0。未知数の数だけ式を立てます。",
    when: ["回路", "抵抗", "電流", "電圧", "オーム", "キルヒホッフ", "直列", "並列", "電池", "起電力",
           "仕事率", "電力", "電力量", "発熱量", "ジュール熱", "電位差", "消費"],
    draw(o) {
      const ep = (o && o.p && o.p.elec) || {};
      const r1 = ep.R1 != null ? ep.R1 + "Ω" : "R₁";
      const r2 = ep.R2 != null ? ep.R2 + "Ω" : "R₂";
      const ev = ep.V != null ? ep.V + "V" : "E";
      return rect(50, 50, 220, 110, { s: "var(--fg)", w: 1.8 }) +
        rect(136, 42, 48, 16, { r: 2, s: "var(--ac)", w: 1.8, fill: "var(--bg2)" }) +
        txt(160, 54, r1, { c: "var(--ac)", size: 9.5, anchor: "middle" }) +
        rect(262, 92, 16, 40, { r: 2, s: "var(--ac2)", w: 1.8, fill: "var(--bg2)" }) +
        txt(286, 116, r2, { c: "var(--ac2)", size: 9.5 }) +
        line(50, 96, 50, 104, { s: "var(--bg2)", w: 6 }) +
        line(42, 96, 58, 96, { s: "var(--fg)", w: 2.6 }) +
        line(46, 104, 54, 104, { s: "var(--fg)", w: 1.6 }) +
        txt(18, 104, ev, { c: "var(--fg)", size: 10.5 }) +
        arrow(96, 50, 128, 50, { s: "var(--ac)", w: 1.8 }) +
        txt(108, 40, ep.I != null ? ep.I + "A" : "I", { c: "var(--ac)", size: 10 }) +
        txt(20, 182, "V=RI ／ 直列 R₁+R₂ ／ 並列 1/R=1/R₁+1/R₂", { c: "var(--mut)", size: 9 });
    },
  },
  {
    id: "induction", nm: "電磁誘導", cap: "磁束の変化をさまたげる向きに電流が流れます。力は必ず運動をさまたげる向き。",
    when: ["電磁誘導", "誘導起電力", "レンツ", "磁束", "コイル", "導体棒", "磁場", "磁界", "ローレンツ"],
    draw() {
      let dots = "";
      for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++)
        dots += circ(76 + i * 42, 66 + j * 32, 2.4, { fill: "var(--mut)", s: "var(--mut)" });
      return rect(56, 50, 214, 100, { s: "var(--mut)", w: 1.4, dash: "4 3" }) +
        dots +
        line(56, 50, 56, 150, { s: "var(--fg)", w: 2.4 }) +
        line(56, 50, 270, 50, { s: "var(--fg)", w: 2.4 }) +
        line(56, 150, 270, 150, { s: "var(--fg)", w: 2.4 }) +
        line(180, 50, 180, 150, { s: "var(--ac)", w: 3.4 }) +
        arrow(186, 100, 244, 100, { s: "var(--ac2)", w: 2.2 }) +
        txt(210, 92, "v", { c: "var(--ac2)", size: 10 }) +
        arrow(174, 100, 132, 100, { s: "var(--ac)", w: 2 }) +
        txt(126, 94, "F（さまたげる）", { c: "var(--ac)", size: 9, anchor: "end" }) +
        txt(20, 30, "V = vBL ／ I = vBL/R", { c: "var(--fg)", size: 10.5 }) +
        txt(20, 180, "・は紙面から手前向きの磁場", { c: "var(--mut)", size: 9 });
    },
  },
  {
    id: "pv", nm: "PV図（熱力学）", cap: "グラフの下の面積が気体のした仕事。1周まわると囲む面積が正味の仕事です。",
    when: ["熱力学", "気体", "断熱", "等温", "定圧", "定積", "サイクル", "PV", "内部エネルギー", "モル比熱"],
    draw() {
      const ox = 46, oy = 156;
      return axes(ox, oy, { xl: "V", yl: "p" }) +
        line(ox + 30, oy - 100, ox + 130, oy - 100, { s: "var(--ac)", w: 2.2 }) +
        line(ox + 130, oy - 100, ox + 130, oy - 34, { s: "var(--ac)", w: 2.2 }) +
        line(ox + 130, oy - 34, ox + 30, oy - 34, { s: "var(--ac)", w: 2.2 }) +
        line(ox + 30, oy - 34, ox + 30, oy - 100, { s: "var(--ac)", w: 2.2 }) +
        rect(ox + 30, oy - 100, 100, 66, { fill: "rgba(139,122,232,.14)", s: "none" }) +
        txt(ox + 80, oy - 62, "1周＝正味の仕事", { c: "var(--fg)", size: 9.5, anchor: "middle" }) +
        txt(ox + 80, oy - 106, "定圧", { c: "var(--ac)", size: 9, anchor: "middle" }) +
        txt(ox + 136, oy - 68, "定積", { c: "var(--ac)", size: 9 }) +
        txt(20, 26, "ΔU = Q + W（気体がされた仕事）", { c: "var(--fg)", size: 10 });
    },
  },

  /* ── 化学γ ─────────────────────────────────── */
  {
    id: "titration", nm: "滴定曲線", cap: "当量点の pH は「できた塩」で決まります。指示薬はその pH を含むものを選びます。",
    when: ["滴定", "中和", "指示薬", "当量点", "pH", "フェノールフタレイン", "メチルオレンジ", "緩衝"],
    draw(o) {
      const cp = (o && o.p && o.p.mol) || {};
      const ox = 44, oy = 164, sx = 11, sy = 10;
      const f = (v) => 2.9 + 8.6 / (1 + Math.exp(-(v - 11) * 1.15));
      return axes(ox, oy, { xl: "加えた量", yl: "pH" }) +
        line(ox, oy - 7 * sy, W - 14, oy - 7 * sy, { s: "var(--mut)", dash: "3 3", w: 1.1 }) +
        txt(ox - 6, oy - 7 * sy + 3, "7", { c: "var(--mut)", size: 9, anchor: "end" }) +
        plot(f, { ox, oy, sx, sy, a: 0, b: 23, s: "var(--ac)", w: 2.4 }) +
        circ(ox + 11 * sx, oy - f(11) * sy, 3.6, { fill: "var(--ac2)", s: "var(--ac2)" }) +
        txt(ox + 11 * sx + 6, oy - f(11) * sy - 6, "当量点", { c: "var(--ac2)", size: 9.5 }) +
        txt(ox + 4, oy - 3.6 * sy, "緩衝のはたらく平らな部分", { c: "var(--mut)", size: 8.5 }) +
        txt(20, 26, (cp.c != null ? cp.c + " mol/L の酸を滴定：" : "") + "弱酸＋強塩基 → 当量点は塩基性",
          { c: "var(--fg)", size: 9.5 });
    },
  },
  {
    id: "equil", nm: "平衡の3行表", cap: "「はじめ／変化／平衡時」を書けば、あとは K の式に入れるだけです。",
    when: ["平衡", "平衡定数", "ルシャトリエ", "電離度", "解離", "可逆", "Kp", "Kc", "平衡移動"],
    draw() {
      const x0 = 26, y0 = 46, cw = 66, rh = 34;
      let g = "";
      for (let r = 0; r < 4; r++) g += line(x0, y0 + r * rh, x0 + cw * 4, y0 + r * rh, { s: "var(--mut)", w: 1 });
      for (let c = 0; c < 5; c++) g += line(x0 + c * cw, y0, x0 + c * cw, y0 + rh * 3, { s: "var(--mut)", w: 1 });
      const cell = (c, r, s, o) => txt(x0 + c * cw + cw / 2, y0 + r * rh + rh / 2 + 4, s, Object.assign({ size: 10, anchor: "middle" }, o || {}));
      return g +
        cell(0, 0, "", {}) + cell(1, 0, "A", { c: "var(--ac)" }) + cell(2, 0, "B", { c: "var(--ac)" }) + cell(3, 0, "C", { c: "var(--ac2)" }) +
        cell(0, 1, "はじめ", { size: 9 }) + cell(1, 1, "a") + cell(2, 1, "b") + cell(3, 1, "0") +
        cell(0, 2, "変化", { size: 9 }) + cell(1, 2, "−x", { c: "var(--ac)" }) + cell(2, 2, "−x", { c: "var(--ac)" }) + cell(3, 2, "+2x", { c: "var(--ac2)" }) +
        txt(x0, y0 + rh * 3 + 22, "平衡時：a−x, b−x, 2x を K の式へ", { c: "var(--fg)", size: 10 }) +
        txt(x0, y0 + rh * 3 + 38, "★ 変化量には必ず係数を掛ける", { c: "var(--mut)", size: 9 }) +
        txt(x0, 30, "A + B ⇄ 2C", { c: "var(--fg)", size: 11 });
    },
  },
  {
    id: "moleflow", nm: "mol の道すじ", cap: "質量・体積・粒子数は、いつも mol を通ってつながります。",
    when: ["mol", "物質量", "モル", "22.4", "アボガドロ", "モル濃度", "収率", "純度", "式量", "分子量", "molar"],
    draw(o) {
      const mp = (o && o.p && o.p.mol) || {};
      const box = (x, y, w, t, c) => rect(x, y, w, 30, { r: 8, s: c, w: 1.6, fill: "var(--bg2)" }) +
        txt(x + w / 2, y + 19, t, { c: c, size: 9.5, anchor: "middle" });
      return box(18, 84, 68, mp.g != null ? mp.g + " g" : "質量 w", "var(--ac2)") +
        box(126, 84, 68, mp.n != null ? mp.n + " mol" : "mol n", "var(--ac)") +
        box(234, 30, 68, "粒子数", "var(--ac2)") +
        box(234, 138, 68, "体積 V", "var(--ac2)") +
        arrow(88, 99, 124, 99, { s: "var(--mut)", w: 1.6 }) +
        arrow(196, 92, 232, 56, { s: "var(--mut)", w: 1.6 }) +
        arrow(196, 106, 232, 146, { s: "var(--mut)", w: 1.6 }) +
        txt(106, 92, "÷M", { c: "var(--mut)", size: 9, anchor: "middle" }) +
        txt(216, 66, "×6.0×10²³", { c: "var(--mut)", size: 8.5, anchor: "middle" }) +
        txt(216, 140, "×22.4 L", { c: "var(--mut)", size: 8.5, anchor: "middle" }) +
        txt(18, 26, "計算の入口は、いつも mol", { c: "var(--fg)", size: 10.5 }) +
        txt(18, 186, "溶液なら n = c × V(L)", { c: "var(--mut)", size: 9 });
    },
  },
  {
    id: "elem", nm: "元素分析の流れ", cap: "CO₂ から C、H₂O から H を出し、O は差で求めます。O は直接は測れません。",
    when: ["元素分析", "組成式", "燃焼", "CO₂", "H₂O", "不飽和度", "分子式", "構造決定"],
    draw(o) {
      const box = (x, y, w, t, c) => rect(x, y, w, 28, { r: 7, s: c, w: 1.5, fill: "var(--bg2)" }) +
        txt(x + w / 2, y + 18, t, { c: c, size: 9.5, anchor: "middle" });
      const mp = (o && o.p && o.p.mass) || {};
      const t1 = mp.co2 != null ? "CO₂ " + mp.co2 + " mg" : "CO₂ の質量";
      const t2 = mp.h2o != null ? "H₂O " + mp.h2o + " mg" : "H₂O の質量";
      const t3 = mp.w != null ? "試料 " + mp.w + " mg" : "試料の質量";
      return box(16, 40, 74, t1, "var(--ac)") +
        box(16, 88, 74, t2, "var(--ac)") +
        box(16, 136, 74, t3, "var(--mut)") +
        box(122, 40, 60, mp.co2 != null ? "C " + (Math.round(mp.co2 * 12 / 44 * 100) / 100) + " mg" : "C の mol", "var(--ac2)") +
        box(122, 88, 60, mp.h2o != null ? "H " + (Math.round(mp.h2o * 2 / 18 * 100) / 100) + " mg" : "H の mol", "var(--ac2)") +
        box(122, 136, 60, "O は差", "var(--ac2)") +
        box(216, 88, 86, "最も簡単な整数比", "var(--fg)") +
        arrow(92, 54, 120, 54, { s: "var(--mut)", w: 1.4 }) +
        arrow(92, 102, 120, 102, { s: "var(--mut)", w: 1.4 }) +
        arrow(92, 150, 120, 150, { s: "var(--mut)", w: 1.4 }) +
        arrow(184, 54, 214, 96, { s: "var(--mut)", w: 1.4 }) +
        arrow(184, 102, 214, 102, { s: "var(--mut)", w: 1.4 }) +
        arrow(184, 150, 214, 110, { s: "var(--mut)", w: 1.4 }) +
        txt(96, 50, "×12/44", { c: "var(--mut)", size: 8 }) +
        txt(96, 98, "×2/18", { c: "var(--mut)", size: 8 }) +
        txt(16, 26, "→ 組成式 → 分子量で割って分子式", { c: "var(--fg)", size: 10 }) +
        txt(16, 182, "不飽和度 =(2C+2+N−H)/2　ベンゼン環は4", { c: "var(--mut)", size: 9 });
    },
  },
  {
    id: "organic", nm: "官能基の見分け", cap: "「反応した／しなかった」の両方が手がかりになります。",
    when: ["官能基", "ヨードホルム", "銀鏡", "フェーリング", "塩化鉄", "臭素水", "アルデヒド", "フェノール",
           "カルボン酸", "エステル", "アルコール", "アミン", "検出", "呈色", "異性体"],
    draw() {
      const row = (y, a, b, c) => txt(22, y, a, { c: "var(--ac)", size: 10 }) +
        txt(150, y, "→", { c: "var(--mut)", size: 10 }) + txt(174, y, b, { c: c || "var(--fg)", size: 10 });
      return txt(22, 30, "この反応が出たら、この基がある", { c: "var(--fg)", size: 10.5 }) +
        row(56, "ヨードホルム反応", "CH₃CO− / CH₃CH(OH)−") +
        row(80, "銀鏡・フェーリング", "アルデヒド") +
        row(104, "塩化鉄(III)で呈色", "フェノール") +
        row(128, "臭素水を脱色", "C=C ／ C≡C") +
        row(152, "NaHCO₃ で CO₂", "カルボン酸") +
        txt(22, 180, "反応しなかったことも、同じくらい強い手がかり", { c: "var(--mut)", size: 9 });
    },
  },
  {
    id: "redoxflow", nm: "電気分解の道すじ", cap: "電気量 → 電子の mol → 物質の mol。半反応式の係数で割るのを忘れずに。",
    when: ["電気分解", "ファラデー", "電気量", "陰極", "陽極", "析出", "電池", "酸化還元", "半反応式", "ダニエル", "燃料電池"],
    draw() {
      const box = (x, t, c) => rect(x, 84, 66, 30, { r: 8, s: c, w: 1.6, fill: "var(--bg2)" }) +
        txt(x + 33, 103, t, { c: c, size: 9.5, anchor: "middle" });
      return box(14, "Q = It", "var(--ac2)") +
        box(96, "e⁻ の mol", "var(--ac)") +
        box(178, "物質の mol", "var(--ac)") +
        box(252, "質量 / L", "var(--ac2)") +
        arrow(82, 99, 94, 99, { s: "var(--mut)", w: 1.5 }) +
        arrow(164, 99, 176, 99, { s: "var(--mut)", w: 1.5 }) +
        arrow(246, 99, 250, 99, { s: "var(--mut)", w: 1.5 }) +
        txt(88, 78, "÷96500", { c: "var(--mut)", size: 8, anchor: "middle" }) +
        txt(170, 78, "÷係数", { c: "var(--mut)", size: 8, anchor: "middle" }) +
        txt(14, 34, "時間は必ず「秒」に直してから", { c: "var(--fg)", size: 10.5 }) +
        txt(14, 150, "陰極＝還元（析出）／陽極＝酸化（溶解・気体）", { c: "var(--mut)", size: 9 }) +
        txt(14, 168, "96500 C ＝ 電子 1 mol", { c: "var(--ac)", size: 9.5 });
    },
  },
  {
    id: "periodic", nm: "周期表での位置", cap: "左下ほど陽性（電子を出しやすい）、右上ほど陰性（電子を受け取りやすい）。",
    when: ["周期表", "周期律", "イオン化エネルギー", "電気陰性度", "典型元素", "遷移元素", "族", "周期", "原子半径"],
    draw() {
      let g = "";
      for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++)
        g += rect(30 + c * 32, 56 + r * 26, 30, 24, { s: "var(--mut)", w: 0.9, fill: r === 0 && c > 0 && c < 7 ? "none" : "rgba(139,122,232,.06)" });
      return g +
        arrow(30, 46, 286, 46, { s: "var(--ac2)", w: 1.6 }) +
        txt(158, 38, "電気陰性度・イオン化エネルギーが大きくなる →", { c: "var(--ac2)", size: 8.5, anchor: "middle" }) +
        arrow(20, 56, 20, 158, { s: "var(--ac)", w: 1.6 }) +
        txt(14, 110, "原子半径が大きくなる", { c: "var(--ac)", size: 8.5, anchor: "middle", style: "normal" }) +
        txt(30, 178, "左下＝陽性が強い（アルカリ金属）", { c: "var(--mut)", size: 9 }) +
        txt(30, 192, "右上＝陰性が強い（ハロゲン・酸素）", { c: "var(--mut)", size: 9 });
    },
  },
  /* ── ★ 2026-08-18b 追加ぶん（図が出なかった分野を埋める） ── */
  {
    id: "triangle", nm: "三角形の計量", cap: "「向かい合う辺と角の組が2つ」なら正弦定理、「2辺とはさむ角／3辺」なら余弦定理です。",
    when: ["三角形", "正弦定理", "余弦定理", "外接円", "内接円", "∠", "AB=", "BC=", "CA=", "重心", "外心", "内心", "中線", "垂線"],
    /* ★ 2026-08-19 a,b,c（と角A）が分かるときは、その形の三角形を描く */
    draw(o) {
      const tp = (o && o.p && o.p.tri) || {};
      let A = { x: 88, y: 44 }, B = { x: 40, y: 154 }, C = { x: 268, y: 154 };
      let lab = { a: "a", b: "b", c: "c" };
      if (tp.b != null && tp.c != null && (tp.A != null || tp.a != null)) {
        /* B を左下に置き、辺 a=BC を底辺にする。A の角度から頂点を決める。 */
        const aLen = tp.a != null ? tp.a
          : Math.sqrt(tp.b * tp.b + tp.c * tp.c - 2 * tp.b * tp.c * Math.cos((tp.A * Math.PI) / 180));
        const s = Math.min(210 / Math.max(aLen, 1), 110 / Math.max(tp.b, tp.c, 1));
        B = { x: 46, y: 156 };
        C = { x: 46 + aLen * s, y: 156 };
        /* A は B から c、C から b の距離にある点（三角形の成立を確かめてから） */
        const d = aLen * s, r1 = tp.c * s, r2 = tp.b * s;
        const x = (d * d + r1 * r1 - r2 * r2) / (2 * d);
        const h2 = r1 * r1 - x * x;
        if (h2 > 0) A = { x: B.x + x, y: B.y - Math.sqrt(h2) };
        lab = { a: "a=" + aLen.toFixed(aLen % 1 ? 2 : 0), b: "b=" + tp.b, c: "c=" + tp.c };
      }
      return path("M" + A.x + " " + A.y + "L" + B.x + " " + B.y + "L" + C.x + " " + C.y + "Z",
        { s: "var(--ac)", w: 2, fill: "rgba(139,122,232,.10)" }) +
        txt(A.x - 4, A.y - 8, "A", { size: 11, anchor: "middle" }) +
        txt(B.x - 8, B.y + 12, "B", { size: 11, anchor: "middle" }) +
        txt(C.x + 8, C.y + 12, "C", { size: 11, anchor: "middle" }) +
        txt((B.x + C.x) / 2, C.y + 15, lab.a, { c: "var(--ac2)", size: 10, anchor: "middle" }) +
        txt((A.x + C.x) / 2 + 8, (A.y + C.y) / 2, lab.b, { c: "var(--ac2)", size: 10 }) +
        txt((A.x + B.x) / 2 - 14, (A.y + B.y) / 2, lab.c, { c: "var(--ac2)", size: 10 }) +
        ((o && o.p && o.p.tri && o.p.tri.A != null)
          ? txt(A.x + 4, A.y + 34, "A=" + o.p.tri.A + "°", { c: "var(--fg)", size: 10 }) : "") +
        path("M" + (A.x - 14) + " " + (A.y + 20) + "A24 24 0 0 0 " + (A.x + 18) + " " + (A.y + 18), { s: "var(--fg)", w: 1.2 }) +
        txt(20, 26, "a/sinA = b/sinB = c/sinC = 2R", { c: "var(--fg)", size: 10 }) +
        txt(20, H - 22, "a² = b²+c²−2bc cosA", { c: "var(--fg)", size: 10 }) +
        txt(20, H - 8, "S = ½bc sinA", { c: "var(--mut)", size: 9.5 });
    },
  },
  {
    id: "conic", nm: "楕円と双曲線", cap: "楕円は距離の「和」が一定、双曲線は「差」が一定。焦点は c²=a²∓b² で出ます。",
    when: ["楕円", "双曲線", "放物線", "焦点", "準線", "漸近線", "離心率", "二次曲線", "長軸", "短軸"],
    draw() {
      const cx = 160, cy = 104, a = 96, b = 56, c = Math.sqrt(a * a - b * b);
      return line(30, cy, 292, cy, { s: "var(--mut)", w: 1.2 }) +
        line(cx, 22, cx, 176, { s: "var(--mut)", w: 1.2 }) +
        '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + a + '" ry="' + b +
          '" fill="rgba(139,122,232,.10)" stroke="var(--ac)" stroke-width="2"/>' +
        circ(cx - c, cy, 3.4, { fill: "var(--ac2)", s: "var(--ac2)" }) +
        circ(cx + c, cy, 3.4, { fill: "var(--ac2)", s: "var(--ac2)" }) +
        line(cx - c, cy, cx + 40, cy - 44, { s: "var(--ac2)", w: 1.4 }) +
        line(cx + c, cy, cx + 40, cy - 44, { s: "var(--ac2)", w: 1.4 }) +
        txt(cx - c, cy + 16, "F", { c: "var(--ac2)", size: 9.5, anchor: "middle" }) +
        txt(cx + c, cy + 16, "F′", { c: "var(--ac2)", size: 9.5, anchor: "middle" }) +
        txt(20, 26, "x²/a² + y²/b² = 1", { c: "var(--fg)", size: 10.5 }) +
        txt(20, H - 20, "楕円 c²=a²−b²（引く）", { c: "var(--mut)", size: 9.5 }) +
        txt(20, H - 6, "双曲線 c²=a²+b²（足す）・漸近線 y=±(b/a)x", { c: "var(--mut)", size: 9.5 });
    },
  },
  {
    id: "scatter", nm: "散布図と相関", cap: "右上がりなら正の相関、右下がりなら負。r は −1〜1 で単位はありません。",
    when: ["データ", "相関", "散布図", "分散", "標準偏差", "平均", "中央値", "四分位", "箱ひげ", "偏差", "共分散", "回帰"],
    draw() {
      const ox = 40, oy = 158;
      const pts = [[.6,.5],[1.1,.9],[1.5,1.2],[1.9,1.5],[2.3,1.6],[2.7,2.1],[3.1,2.3],[3.5,2.9],[3.9,3.0],[4.3,3.5]];
      let d = "";
      pts.forEach((p, i) => {
        const jitter = (i % 3 - 1) * 0.16;
        d += circ(ox + p[0] * 52, oy - (p[1] + jitter) * 34, 3.4, { fill: "var(--ac)", s: "var(--ac)" });
      });
      return axes(ox, oy, { xl: "x", yl: "y" }) + d +
        plot((x) => 0.8 * x, { ox, oy, sx: 52, sy: 34, a: 0.3, b: 4.6, s: "var(--ac2)", w: 1.6 }) +
        txt(20, 26, "右上がり → 正の相関（r>0）", { c: "var(--fg)", size: 10 }) +
        txt(20, H - 6, "分散 =（2乗の平均）−（平均の2乗）", { c: "var(--mut)", size: 9.5 });
    },
  },
  {
    id: "doppler", nm: "ドップラー効果", cap: "近づくと波が詰まって高い音、遠ざかると伸びて低い音になります。",
    when: ["ドップラー", "音源", "観測者", "近づく", "遠ざかる", "振動数", "音波", "救急車", "サイレン"],
    draw() {
      const sx = 130, sy = 100;
      let w = "";
      for (let i = 1; i <= 4; i++) w += circ(sx - i * 8, sy, i * 20, { s: "var(--ac)", w: 1, op: 0.5 });
      return w +
        circ(sx, sy, 8, { fill: "var(--ac)", s: "var(--ac)" }) +
        arrow(sx + 12, sy, sx + 52, sy, { s: "var(--ac)", w: 2 }) +
        txt(sx + 30, sy - 8, "vs", { c: "var(--ac)", size: 9.5, anchor: "middle" }) +
        circ(272, sy, 7, { s: "var(--ac2)", w: 2, fill: "var(--bg2)" }) +
        txt(272, sy + 22, "観測者", { c: "var(--ac2)", size: 9, anchor: "middle" }) +
        txt(20, 26, "f′ = f(V−v_o)/(V−v_s)", { c: "var(--fg)", size: 11 }) +
        txt(20, H - 20, "音源→観測者の向きを正にして代入する", { c: "var(--mut)", size: 9.5 }) +
        txt(20, H - 6, "近づく＝高い ／ 遠ざかる＝低い（答えの確かめに使う）", { c: "var(--mut)", size: 9 });
    },
  },
  {
    id: "standwave", nm: "弦と気柱の定常波", cap: "固定端・閉口端は節、自由端・開口端は腹。閉管の基本振動は λ/4 です。",
    /* ★ 「弦」の1文字は「正弦定理」に当たるので、続く字までを見る */
    when: ["定常波", "弦を", "弦の", "気柱", "共鳴", "閉管", "開管", "基本振動", "倍振動", "共鳴管", "固定端", "自由端"],
    draw() {
      let s = "";
      /* 弦（両端固定・基本振動） */
      s += line(30, 60, 170, 60, { s: "var(--mut)", w: 1.2, dash: "3 3" });
      s += path("M30 60Q100 20 170 60", { s: "var(--ac)", w: 2 });
      s += path("M30 60Q100 100 170 60", { s: "var(--ac)", w: 2, op: 0.5 });
      s += circ(30, 60, 3.4, { fill: "var(--ac2)", s: "var(--ac2)" });
      s += circ(170, 60, 3.4, { fill: "var(--ac2)", s: "var(--ac2)" });
      s += txt(100, 112, "弦：両端が節　L=λ/2", { c: "var(--fg)", size: 9.5, anchor: "middle" });
      /* 閉管 */
      s += rect(196, 34, 96, 52, { s: "var(--mut)", w: 1.6 });
      s += line(292, 34, 292, 86, { s: "var(--fg)", w: 4 });
      s += path("M196 60Q244 34 292 60", { s: "var(--ac)", w: 2 });
      s += path("M196 60Q244 86 292 60", { s: "var(--ac)", w: 2, op: 0.5 });
      s += txt(244, 112, "閉管：閉口端が節　L=λ/4", { c: "var(--fg)", size: 9.5, anchor: "middle" });
      return s +
        txt(20, 26, "端が「節か腹か」を先に決める", { c: "var(--fg)", size: 10.5 }) +
        txt(20, 150, "節＝動かない点 ／ 腹＝いちばん大きく揺れる点", { c: "var(--mut)", size: 9.5 }) +
        txt(20, 168, "開管は L=λ/2（両端が腹）", { c: "var(--mut)", size: 9.5 }) +
        txt(20, 186, "f = v/λ。弦の速さは v=√(T/ρ)", { c: "var(--mut)", size: 9.5 });
    },
  },
  {
    id: "ionsep", nm: "金属イオンの系統分析", cap: "加える順番そのものが答えです。どこで沈むかでグループが決まります。",
    when: ["系統分析", "沈殿", "金属イオン", "硫化物", "水酸化物", "塩化銀", "分属", "ろ過", "炎色反応",
           "Ag", "Cu", "Zn", "Fe", "Al", "Pb", "Ba", "錯イオン", "両性",
           "鉄", "銅", "銀", "亜鉛", "アルミニウム", "鉛", "イオンの水溶液", "水酸化ナトリウムを加え", "アンモニア水"],
    draw() {
      const step = (y, t, r) => rect(18, y, 118, 26, { r: 7, s: "var(--ac)", w: 1.4, fill: "var(--bg2)" }) +
        txt(77, y + 17, t, { c: "var(--ac)", size: 9.5, anchor: "middle" }) +
        arrow(140, y + 13, 164, y + 13, { s: "var(--mut)", w: 1.4 }) +
        txt(170, y + 17, r, { c: "var(--fg)", size: 9.5 });
      return txt(18, 26, "上から順に加えていく", { c: "var(--fg)", size: 10.5 }) +
        step(38, "希塩酸", "Ag⁺・Pb²⁺ が沈む") +
        step(74, "酸性で H₂S", "Cu²⁺ が黒く沈む") +
        step(110, "塩基性で H₂S", "Zn²⁺・Fe²⁺ が沈む") +
        step(146, "炭酸アンモニウム", "Ca²⁺・Ba²⁺ が沈む") +
        txt(18, 192, "残ったのは Na⁺・K⁺（炎色反応で見分ける）", { c: "var(--mut)", size: 9 });
    },
  },
  {
    id: "orgmap", nm: "有機の反応のつながり", cap: "アルコールが何級かで、酸化の行き先が決まります。",
    when: ["アルコール", "アルデヒド", "ケトン", "カルボン酸", "エステル", "脱水", "アルケン",
           "第一級", "第二級", "第三級", "けん化", "エステル化", "油脂", "酸化するとケトン", "酸化するとアルデヒド"],
    draw() {
      const box = (x, y, w, t, c) => rect(x, y, w, 26, { r: 7, s: c, w: 1.5, fill: "var(--bg2)" }) +
        txt(x + w / 2, y + 17, t, { c: c, size: 9.5, anchor: "middle" });
      return txt(18, 24, "第一級アルコール", { c: "var(--mut)", size: 9 }) +
        box(18, 32, 78, "R−CH₂OH", "var(--ac)") +
        box(122, 32, 74, "アルデヒド", "var(--ac2)") +
        box(222, 32, 80, "カルボン酸", "var(--ac2)") +
        arrow(98, 45, 120, 45, { s: "var(--mut)", w: 1.4 }) +
        arrow(198, 45, 220, 45, { s: "var(--mut)", w: 1.4 }) +
        txt(18, 84, "第二級アルコール", { c: "var(--mut)", size: 9 }) +
        box(18, 92, 78, "R₂CHOH", "var(--ac)") +
        box(122, 92, 74, "ケトン", "var(--ac2)") +
        arrow(98, 105, 120, 105, { s: "var(--mut)", w: 1.4 }) +
        txt(18, 146, "第三級アルコール", { c: "var(--mut)", size: 9 }) +
        box(18, 154, 78, "R₃COH", "var(--ac)") +
        txt(122, 171, "酸化されにくい", { c: "var(--mut)", size: 9.5 }) +
        txt(206, 65, "（酸化）", { c: "var(--mut)", size: 8.5, anchor: "middle" }) +
        txt(206, 189, "カルボン酸＋アルコール ⇄ エステル＋H₂O", { c: "var(--mut)", size: 8.5, anchor: "middle" });
    },
  },
  {
    id: "vtgraph", nm: "v−t グラフ", cap: "傾きが加速度、グラフの下の面積が移動距離です。",
    when: ["等加速度", "v-t", "速度", "加速度", "自由落下", "投げ上げ", "斜方投射", "初速", "移動距離", "グラフ"],
    /* ★ 2026-08-19 初速・加速度・時間が分かるときは、その傾きで描く */
    draw(o) {
      const mp = (o && o.p && o.p.mech) || {};
      const v0 = mp.v != null && mp.a != null ? 0 : (mp.v != null ? 0 : 0);   /* 初速は問題文から取りにくいので0を既定にする */
      const acc = mp.a != null ? mp.a : 2;
      const tt = mp.t != null ? mp.t : 5;
      const vEnd = v0 + acc * tt;
      const ox = 40, oy = 156;
      const sxT = 180 / Math.max(1, tt), syV = 118 / Math.max(1, vEnd || 1);
      const y0 = oy - v0 * syV, y1 = oy - vEnd * syV;
      return axes(ox, oy, { xl: "t (s)", yl: "v (m/s)" }) +
        line(ox, y0, ox + tt * sxT, y1, { s: "var(--ac)", w: 2.4 }) +
        path("M" + ox + " " + oy + "L" + ox + " " + P(y0) + "L" + P(ox + tt * sxT) + " " + P(y1) +
             "L" + P(ox + tt * sxT) + " " + oy + "Z", { fill: "rgba(139,122,232,.16)", s: "none" }) +
        txt(ox + 90, (oy + y1) / 2 + 8, "面積＝進んだ距離", { c: "var(--fg)", size: 9.5, anchor: "middle" }) +
        txt(ox - 6, y0, v0 ? "v₀=" + v0 : "0", { c: "var(--ac2)", size: 9.5, anchor: "end" }) +
        txt(ox + tt * sxT - 4, y1 - 6, "v=" + (Math.round(vEnd * 10) / 10), { c: "var(--ac2)", size: 9.5, anchor: "end" }) +
        txt(ox + tt * sxT, oy + 13, String(tt), { c: "var(--mut)", size: 9, anchor: "middle" }) +
        txt(20, 26, "傾き＝a" + (mp.a != null ? "=" + acc + " m/s²" : ""), { c: "var(--ac)", size: 9.5 }) +
        txt(20, 40, "v=v₀+at ／ x=v₀t+½at²", { c: "var(--mut)", size: 9 });
    },
  },
  {
    id: "seqline", nm: "数列の並び", cap: "等差は「毎回同じだけ足す」、等比は「毎回同じだけ掛ける」。",
    when: ["数列", "等差", "等比", "初項", "公差", "公比", "一般項", "和", "Σ", "シグマ", "群数列", "帰納法"],
    /* ★ 2026-08-19 初項・公差・公比が分かるときは、その数で並べる */
    draw(o) {
      const sp = (o && o.p && o.p.seq) || {};
      const a0 = sp.a != null ? sp.a : 2;
      const dd = sp.d != null ? sp.d : 3;
      const rr = sp.r != null ? sp.r : 2;
      const short = (v) => (Math.abs(v) >= 10000 ? v.toExponential(0) : String(Math.round(v * 100) / 100));
      let s = "";
      for (let i = 0; i < 5; i++) {
        s += circ(50 + i * 52, 66, 15, { s: "var(--ac)", w: 1.8, fill: "rgba(139,122,232,.12)" });
        s += txt(50 + i * 52, 71, short(a0 + i * dd), { size: 10.5, anchor: "middle" });
        if (i < 4) s += txt(76 + i * 52, 44, (dd >= 0 ? "+" : "") + dd, { c: "var(--ac2)", size: 9, anchor: "middle" });
      }
      for (let i = 0; i < 5; i++) {
        s += circ(50 + i * 52, 140, 15, { s: "var(--ac)", w: 1.8, fill: "rgba(46,139,255,.12)" });
        s += txt(50 + i * 52, 145, short(a0 * Math.pow(rr, i)), { size: 10.5, anchor: "middle" });
        if (i < 4) s += txt(76 + i * 52, 118, "×" + rr, { c: "var(--ac2)", size: 9, anchor: "middle" });
      }
      return s +
        txt(18, 26, "等差 aₙ=" + a0 + (dd ? "+(n−1)×" + dd : ""), { c: "var(--fg)", size: 10 }) +
        txt(18, 102, "等比 aₙ=" + a0 + "×" + rr + "ⁿ⁻¹", { c: "var(--fg)", size: 10 }) +
        txt(18, 188, "★ n 番目は「n−1 回ぶん」進んだところ", { c: "var(--mut)", size: 9 });
    },
  },
  {
    id: "modwheel", nm: "余りで分ける", cap: "整数を余りでグループ分けすると、どのグループでも成り立つことが示せます。",
    when: ["整数", "余り", "倍数", "割り切れ", "mod", "合同", "素数", "互いに素", "n(n+1)", "連続する"],
    draw() {
      const cx = 96, cy = 104, r = 60;
      let s = circ(cx, cy, r, { s: "var(--mut)", w: 1.5 });
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + i * (Math.PI * 2 / 3);
        const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
        s += circ(x, y, 17, { fill: "rgba(139,122,232,.14)", s: "var(--ac)", w: 1.8 });
        s += txt(x, y + 5, String(i), { c: "var(--ac)", size: 12, anchor: "middle" });
        s += line(cx, cy, x, y, { s: "var(--mut)", w: 1, dash: "3 3" });
      }
      return s +
        txt(cx, cy + 5, "mod 3", { c: "var(--mut)", size: 9.5, anchor: "middle" }) +
        txt(186, 60, "n=3k", { c: "var(--fg)", size: 10 }) +
        txt(186, 82, "n=3k+1", { c: "var(--fg)", size: 10 }) +
        txt(186, 104, "n=3k+2", { c: "var(--fg)", size: 10 }) +
        txt(186, 132, "この3通りで", { c: "var(--mut)", size: 9 }) +
        txt(186, 148, "全部の整数を", { c: "var(--mut)", size: 9 }) +
        txt(186, 164, "言いつくせる", { c: "var(--mut)", size: 9 }) +
        txt(18, 26, "整数は「余りで3種類」に分けられる", { c: "var(--fg)", size: 10 });
    },
  },
  ];

  const MAP = {}; FIGS.forEach((f) => { MAP[f.id] = f; });

  /* ══════════════════════════════════════════════════════════════
     ★★ 2026-08-19 図を<b>その問題の数値で</b>描く

     これまでは図の形が決め打ちだったので、同じ分野の問題では
     まったく同じ絵が出ていた（三角関数10問がすべて同じグラフ）。
     問題がちがえば絵もちがうはずなので、
     <b>問題文から数を取り出して、その数で描く</b>ようにする。

     parseParams(text) が拾うもの（見つかったものだけ入る）
       quad {a,b,c}      … y = ax²+bx+c／x²+bx+c
       trig {a,b}        … a sinθ + b cosθ
       deg  {d}          … ◯° / ◯度
       tri  {a,b,c,A}    … 三角形の辺と角
       circle {r,d}      … 半径・距離
       vec  {x1,y1,x2,y2}… ベクトルの成分
       seq  {a,d,r}      … 初項・公差・公比
       range {lo,hi}     … ◯≦x≦◯
       mass {co2,h2o,w}  … 元素分析の質量
       elec {R1,R2,V,I}  … 抵抗・電圧・電流
       mech {m,v,a,h,t}  … 質量・速さ・加速度・高さ・時間
       wave {lam,f,v,L}  … 波長・振動数・速さ・長さ
       mol  {n,M,c,V}    … 物質量まわり
       ph   {pH,conc}    … pH・濃度
       mod  {m}          … mod の数

     ★ 取り出せなかったところは、これまでどおりの決め打ちで描く（絵が消えない）。
     ══════════════════════════════════════════════════════════════ */
  const H2 = (s) => String(s == null ? "" : s)
    .replace(/[０-９．＋－]/g, (c) => "０１２３４５６７８９．＋－".indexOf(c) < 10
      ? String("０１２３４５６７８９".indexOf(c)) : ({ "．": ".", "＋": "+", "－": "-" }[c]))
    .replace(/−/g, "-");
  const num = (s) => { const v = parseFloat(s); return isFinite(v) ? v : null; };

  function parseParams(text) {
    const t = H2(text);
    const p = {};
    let m;

    /* 二次関数 y = ax² + bx + c（a は省略可・符号つき） */
    m = /y\s*=\s*(-?\d*(?:\.\d+)?)\s*x²\s*([+-]\s*\d+(?:\.\d+)?)?\s*x?\s*([+-]\s*\d+(?:\.\d+)?)?/.exec(t)
      || /(-?\d*(?:\.\d+)?)\s*x²\s*([+-]\s*\d+(?:\.\d+)?)\s*x\s*([+-]\s*\d+(?:\.\d+)?)/.exec(t);
    if (m) {
      const a = (m[1] === "" || m[1] === "+") ? 1 : (m[1] === "-" ? -1 : num(m[1]));
      const b = m[2] ? num(m[2].replace(/\s/g, "")) : 0;
      const c = m[3] ? num(m[3].replace(/\s/g, "")) : 0;
      if (a != null) p.quad = { a, b: b || 0, c: c || 0 };
    }
    /* 三角関数の合成 a sinθ + b cosθ */
    m = /(-?\d*(?:√\(?\d+\)?)?)\s*sin\s*[θxX]\s*([+-])\s*(-?\d*(?:√\(?\d+\)?)?)\s*cos\s*[θxX]/.exec(t);
    if (m) {
      const cv = (s) => {
        s = String(s || "").trim();
        if (s === "" || s === "+") return 1;
        if (s === "-") return -1;
        const r = /√\(?(\d+)\)?/.exec(s);
        if (r) { const k = (s.replace(/√\(?\d+\)?/, "") || "1").replace("+", ""); return (k === "-" ? -1 : (num(k) || 1)) * Math.sqrt(num(r[1])); }
        return num(s);
      };
      const a = cv(m[1]), b = (m[2] === "-" ? -1 : 1) * cv(m[3]);
      if (a != null && b != null) p.trig = { a, b };
    }
    /* 角度 */
    m = /(\d+(?:\.\d+)?)\s*(?:°|度)/.exec(t);
    if (m) p.deg = { d: num(m[1]) };
    /* 三角形 a=, b=, c=, A= */
    (function () {
      const o = {};
      [["a", /\ba\s*=\s*(\d+(?:\.\d+)?)/], ["b", /\bb\s*=\s*(\d+(?:\.\d+)?)/],
       ["c", /\bc\s*=\s*(\d+(?:\.\d+)?)/], ["A", /\bA\s*=\s*(\d+(?:\.\d+)?)\s*(?:°|度)/]].forEach(([k, re]) => {
        const mm = re.exec(t); if (mm) o[k] = num(mm[1]);
      });
      if (Object.keys(o).length >= 2 && /三角形|△|正弦|余弦|面積|外接|内接/.test(t)) p.tri = o;
    })();
    /* 円：半径・距離 */
    m = /半径\s*(\d+(?:\.\d+)?)/.exec(t); if (m) p.circle = Object.assign(p.circle || {}, { r: num(m[1]) });
    m = /距離\s*(?:は\s*)?(\d+(?:\.\d+)?)/.exec(t); if (m) p.circle = Object.assign(p.circle || {}, { d: num(m[1]) });
    /* ベクトル a=(x, y), b=(x, y) */
    (function () {
      const re = /\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)/g;
      const got = []; let mm;
      while ((mm = re.exec(t)) && got.length < 2) got.push([num(mm[1]), num(mm[2])]);
      if (got.length >= 1 && /ベクトル|内積|成分|垂直|なす角|大きさ|\ba\s*=|\bb\s*=/.test(t)) {
        p.vec = { x1: got[0][0], y1: got[0][1] };
        if (got[1]) { p.vec.x2 = got[1][0]; p.vec.y2 = got[1][1]; }
      }
    })();
    /* 数列：初項・公差・公比 */
    (function () {
      const o = {};
      let mm = /初項\s*(-?\d+(?:\.\d+)?)/.exec(t); if (mm) o.a = num(mm[1]);
      mm = /公差\s*(-?\d+(?:\.\d+)?)/.exec(t); if (mm) o.d = num(mm[1]);
      mm = /公比\s*(-?\d+(?:\.\d+)?)/.exec(t); if (mm) o.r = num(mm[1]);
      if (o.a != null || o.d != null || o.r != null) p.seq = o;
    })();
    /* 範囲 lo ≦ x ≦ hi（< も拾う） */
    m = /(-?\d+(?:\.\d+)?)\s*[≦<≤]\s*[xXθt]\s*[≦<≤]\s*(-?\d+(?:\.\d+)?)/.exec(t);
    if (m) p.range = { lo: num(m[1]), hi: num(m[2]) };
    /* 元素分析 */
    (function () {
      const o = {};
      let mm = /CO₂\s*(\d+(?:\.\d+)?)\s*mg/.exec(t); if (mm) o.co2 = num(mm[1]);
      mm = /H₂O\s*(\d+(?:\.\d+)?)\s*mg/.exec(t); if (mm) o.h2o = num(mm[1]);
      mm = /(\d+(?:\.\d+)?)\s*mg\s*を(?:完全)?燃焼/.exec(t); if (mm) o.w = num(mm[1]);
      if (o.co2 != null || o.h2o != null) p.mass = o;
    })();
    /* 電気 */
    (function () {
      const o = {};
      const rs = []; const re = /(\d+(?:\.\d+)?)\s*(?:Ω|オーム)/g; let mm;
      while ((mm = re.exec(t))) rs.push(num(mm[1]));
      if (rs[0] != null) o.R1 = rs[0];
      if (rs[1] != null) o.R2 = rs[1];
      mm = /(\d+(?:\.\d+)?)\s*V\b/.exec(t); if (mm) o.V = num(mm[1]);
      mm = /(\d+(?:\.\d+)?)\s*A\b/.exec(t); if (mm) o.I = num(mm[1]);
      if (Object.keys(o).length) p.elec = o;
    })();
    /* 力学 */
    (function () {
      const o = {};
      let mm = /(\d+(?:\.\d+)?)\s*kg/.exec(t); if (mm) o.m = num(mm[1]);
      mm = /(\d+(?:\.\d+)?)\s*m\/s(?!²)/.exec(t); if (mm) o.v = num(mm[1]);
      mm = /(\d+(?:\.\d+)?)\s*m\/s²/.exec(t); if (mm) o.a = num(mm[1]);
      mm = /高さ\s*(\d+(?:\.\d+)?)\s*m/.exec(t); if (mm) o.h = num(mm[1]);
      mm = /(\d+(?:\.\d+)?)\s*(?:秒|s)\b/.exec(t); if (mm) o.t = num(mm[1]);
      mm = /ばね定数\s*([kK]?\d*(?:\.\d+)?)/.exec(t); if (mm && num(mm[1]) != null) o.k = num(mm[1]);
      if (Object.keys(o).length) p.mech = o;
    })();
    /* 波 */
    (function () {
      const o = {};
      let mm = /波長\s*(\d+(?:\.\d+)?)/.exec(t); if (mm) o.lam = num(mm[1]);
      mm = /(\d+(?:\.\d+)?)\s*Hz/.exec(t); if (mm) o.f = num(mm[1]);
      mm = /長さ\s*(\d+(?:\.\d+)?)\s*m/.exec(t); if (mm) o.L = num(mm[1]);
      if (Object.keys(o).length) p.wave = o;
    })();
    /* 化学 */
    (function () {
      const o = {};
      let mm = /(\d+(?:\.\d+)?)\s*mol\/L/.exec(t); if (mm) o.c = num(mm[1]);
      mm = /(\d+(?:\.\d+)?)\s*mL/.exec(t); if (mm) o.V = num(mm[1]);
      mm = /(\d+(?:\.\d+)?)\s*mol(?!\/)/.exec(t); if (mm) o.n = num(mm[1]);
      mm = /(\d+(?:\.\d+)?)\s*g\b/.exec(t); if (mm) o.g = num(mm[1]);
      if (Object.keys(o).length) p.mol = o;
      const m2 = /pH\s*(?:=|＝|は)?\s*(\d+(?:\.\d+)?)/.exec(t); if (m2) p.ph = { pH: num(m2[1]) };
    })();
    /* mod n */
    m = /(?:mod|を)\s*(\d+)\s*(?:で割|\))/.exec(t); if (m) p.mod = { m: num(m[1]) };
    return p;
  }

  /* その問題に合う図を、<b>その問題の数値つき</b>で返す */
  function forProblem(o, n) {
    const text = [o && o.tag, o && o.secNm, o && o.stem, o && o.reading, o && o.extra,
                  o && o.full, o && o.answer].filter(Boolean).join(" ");
    /* ★ 2026-08-20 科目を先に決める。id があればそれが正、無ければ文から当てる。 */
    const subj = subjOfId(o && (o.sid || o.id)) || guessSubj(text);
    const ids = pick(text, n || 2, subj);
    const p = parseParams(text);
    return ids.map((id) => {
      const f = MAP[id];
      return { id, nm: f.nm, cap: f.cap, p };
    });
  }

  function norm(s) {
    return String(s == null ? "" : s)
      .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)).toLowerCase();
  }
  /* 問題文から、合いそうな図を選ぶ（当たった言葉の数が多い順） */
  /* ══════════════════════════════════════════════════════════════
     ★★ 2026-08-20 図は<b>科目をまたがない</b>

     これまでは言葉が当たれば何でも候補にしていた。そのため
       ・物理の問題文にある「質量」「g」で <b>mol の道すじ</b>（化学）が出る
       ・「円運動」の「円」で <b>円と直線</b>（数学）が出る
       ・化学の「分解」で <b>電気分解</b> が出る
     といった、まったく関係のない絵が混ざっていた。

     そこで図ごとに科目を決め、<b>問題の科目と一致するものだけ</b>を候補にする。
     科目は、渡されたセットid（math_ / phys_ / cgamma_ …）から決める。
     id が無いときだけ、文中の手がかりで見当をつける。
     ★ 図を足すときは、必ず FIG_SUBJ にも1行足すこと。
       書き忘れた図は「どの科目でも出ない」ので、すぐ気づける（黙って誤爆するよりよい）。
     ══════════════════════════════════════════════════════════════ */
  const FIG_SUBJ = {
    /* 数学 */
    parabola: "数学", cubic: "数学", trig: "数学", unitcircle: "数学", explog: "数学",
    area: "数学", rot: "数学", circleline: "数学", vector: "数学", seq: "数学",
    numline: "数学", tree: "数学", complexplane: "数学", triangle: "数学", conic: "数学",
    scatter: "数学", seqline: "数学", modwheel: "数学",
    /* 物理 */
    incline: "物理", spring: "物理", collision: "物理", circular: "物理", wave: "物理",
    lens: "物理", capacitor: "物理", circuit: "物理", induction: "物理", pv: "物理",
    doppler: "物理", standwave: "物理", vtgraph: "物理",
    /* 化学 */
    titration: "化学", equil: "化学", moleflow: "化学", elem: "化学", organic: "化学",
    redoxflow: "化学", periodic: "化学", ionsep: "化学", orgmap: "化学",
  };
  /* セットid から科目を決める（MagiLex と同じ決めかたにそろえる） */
  function subjOfId(sid) {
    const id = String(sid || "");
    if (!id) return "";
    if (/^math_/.test(id)) return "数学";
    if (/^physb?_/.test(id)) return "物理";   /* ★ 2026-08-20 物理β（physb_）も物理 */
    if (/^(cgamma_|cdelta_|cbeta_|chem|fatty|carboxyl|functional|gas_|metal)/.test(id)) return "化学";
    return "";
  }
  /* id が無いときの当て推量。強い手がかりだけを見る（弱い言葉では決めない）。 */
  const SUBJ_HINT = {
    物理: ["斜面", "摩擦", "運動量", "反発係数", "向心", "電磁誘導", "コンデンサー", "起電力",
      "ドップラー", "定常波", "屈折率", "光速", "重力加速度", "単振動", "ばね定数", "熱力学",
      "内部エネルギー", "等温", "断熱", "抵抗", "電流", "電圧", "波長", "振動数", "加速度", "力積"],
    化学: ["mol", "物質量", "アボガドロ", "滴定", "電離", "酸化数", "沈殿", "触媒", "平衡定数",
      "官能基", "組成式", "分子式", "示性式", "構造式", "同素体", "同位体", "異性体", "元素",
      "水溶液", "沈殿する", "けん化", "エステル", "アルデヒド", "フェノール", "ベンゼン",
      "酸化剤", "還元剤", "半反応", "電気分解", "溶解度", "pH", "価電子"],
    数学: ["二次関数", "頂点", "平方完成", "判別式", "余弦定理", "正弦定理", "漸化式", "数列",
      "ベクトル", "内積", "複素数", "偏角", "微分", "積分", "極限", "確率", "場合の数",
      "組合せ", "順列", "整数解", "剰余", "楕円", "双曲線", "単位円"],
  };
  function guessSubj(text) {
    const t = norm(text);
    let best = "", bs = 0;
    Object.keys(SUBJ_HINT).forEach((s) => {
      let n = 0;
      SUBJ_HINT[s].forEach((w) => { if (t.indexOf(norm(w)) >= 0) n++; });
      if (n > bs) { bs = n; best = s; }
    });
    return bs > 0 ? best : "";
  }
  function pick(text, n, subj) {
    const t = norm(text);
    if (!t) return [];
    const want = subj || "";
    const sc = FIGS.map((f) => {
      /* ★ 科目がちがう図は、どれだけ言葉が当たっても候補にしない */
      if (want && FIG_SUBJ[f.id] !== want) return { f, s: 0 };
      let s = 0;
      (f.when || []).forEach((w) => { if (t.indexOf(norm(w)) >= 0) s++; });
      return { f, s };
    }).filter((x) => x.s > 0).sort((a, b) => b.s - a.s);
    if (!sc.length) return [];
    /* ★ 2026-08-18c いちばん当たったものと<b>同点</b>のものだけを出す。
       言葉が1つ当たっただけの図を並べると、関係のない絵（三角形の問題に三角関数のグラフ、
       無機の問題に周期表とグラフ）が混ざって、かえって迷わせてしまう。 */
    const top = sc[0].s;
    return sc.filter((x) => x.s >= top).slice(0, n || 2).map((x) => x.f.id);
  }
  /* 図1枚。枠と説明は呼び出し側で付ける（make は SVG だけ返す） */
  /* make(id) … 決め打ちの図
     make(id, {p}) … その問題の数値で描いた図（p は parseParams の結果） */
  function make(id, o) {
    const f = MAP[id]; if (!f) return "";
    o = o || {};
    if (!o.p) o.p = {};
    let body = "";
    try { body = f.draw(o); }
    catch (e) {
      /* 数値で描けなかったら、決め打ちの形に戻す（絵が消えないように） */
      try { body = f.draw({ p: {} }); } catch (e2) { return ""; }
    }
    return '<svg class="xv-fig" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(f.nm) + '">' + body + "</svg>";
  }
  function info(id) { const f = MAP[id]; return f ? { id: f.id, nm: f.nm, cap: f.cap } : null; }

  window.XVFigs = { pick, make, info, forProblem, parseParams,
    all: () => FIGS.map((f) => f.id), count: () => FIGS.length };
})();
