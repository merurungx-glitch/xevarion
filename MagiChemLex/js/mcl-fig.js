/* ============================================================
   MagiChemLex — mcl-fig.js（図・マスコット）
   ・問題の図（fig）と解説の図（sfig）を SVG で描く。色は CSS（.fig の中のクラス）で決める＝ダークでも読める。
   ・マスコット「ケミィ」（丸底フラスコ）：mood = smile / happy / sad / think / wow
   ・★★ 2026-10-09 ナビゲーター：設定でケミィを XEVARION の UR キャラ（持っているキャラだけ）にかえられる
   ============================================================ */
(function () {
  "use strict";
  let uid = 0;
  const T = (x, y, s, c, a) => '<text x="' + x + '" y="' + y + '" class="' + (c || "tx") + '"' + (a ? ' text-anchor="' + a + '"' : "") + ">" + s + "</text>";
  const arrowDefs = (id) => '<defs><marker id="' + id + '" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="ah"/></marker></defs>';

  /* ── (ア)〜(カ)：log k（実線）と log k'（破線）を 1/T に対してかいたグラフ ── */
  function mini(ox, oy, lb, s, d) {
    return '<g transform="translate(' + ox + "," + oy + ')">' +
      '<rect x="0" y="0" width="150" height="112" rx="12" class="bx"/>' + T(10, 19, lb, "lb") +
      '<path d="M24 22V92H140" class="ax"/><path d="M21 27L24 22L27 27M135 89L140 92L135 95" class="ax"/>' +
      T(28, 31, "log k", "tx s") + T(112, 106, "1/T", "tx s") +
      '<line x1="' + s[0] + '" y1="' + s[1] + '" x2="' + s[2] + '" y2="' + s[3] + '" class="ls"/>' +
      '<line x1="' + d[0] + '" y1="' + d[1] + '" x2="' + d[2] + '" y2="' + d[3] + '" class="ld"/></g>';
  }
  function arr6() {
    const L = [
      ["（ア）", [30, 32, 134, 86], [30, 46, 134, 72]],
      ["（イ）", [30, 34, 134, 64], [30, 52, 134, 82]],
      ["（ウ）", [30, 46, 134, 72], [30, 32, 134, 86]],
      ["（エ）", [30, 86, 134, 32], [30, 72, 134, 46]],
      ["（オ）", [30, 64, 134, 34], [30, 82, 134, 52]],
      ["（カ）", [30, 72, 134, 46], [30, 86, 134, 32]],
    ];
    let g = "";
    L.forEach((l, i) => { g += mini((i % 3) * 160, 28 + Math.floor(i / 3) * 122, l[0], l[1], l[2]); });
    return '<svg viewBox="0 0 470 274" role="img" aria-label="(ア)から(カ)のグラフ">' +
      '<line x1="8" y1="12" x2="40" y2="12" class="ls"/>' + T(46, 16, "log k（正反応）") +
      '<line x1="200" y1="12" x2="232" y2="12" class="ld"/>' + T(238, 16, "log k′（逆反応）") + g + "</svg>";
  }
  /* ── アレニウスプロット（答えの図）── */
  function arrh() {
    const a = '<tspan baseline-shift="sub" font-size="8">a</tspan>';
    return '<svg viewBox="0 0 340 214" role="img" aria-label="アレニウスプロット">' +
      '<path d="M40 14V172H318" class="ax"/><path d="M37 19L40 14L43 19M313 169L318 172L313 175" class="ax"/>' +
      T(46, 24, "log k") + T(298, 190, "1/T") +
      /* 凡例（線の上に字を重ねない） */
      '<line x1="150" y1="22" x2="172" y2="22" class="ls"/>' + T(178, 26, "log k：傾き −E" + a + "/2.30R", "tx s c1") +
      '<line x1="150" y1="42" x2="172" y2="42" class="ld"/>' + T(178, 46, "log k′：傾き −E" + a + "′/2.30R（急）", "tx s c2") +
      '<line x1="52" y1="60" x2="300" y2="120" class="ls"/><line x1="52" y1="30" x2="300" y2="150" class="ld"/>' +
      '<circle cx="176" cy="90" r="4" class="pt"/>' + T(186, 74, "k = k′（K = 1）", "tx s") +
      T(40, 206, "E" + a + " ＜ E" + a + "′ なので、破線（k′）の方が急に下がる", "tx s") + "</svg>";
  }
  /* ── エネルギー図（発熱反応）── ★ 字は線と重ねない（矢印の外側に置く） */
  function edia() {
    const id = "mca" + (++uid), a = '<tspan baseline-shift="sub" font-size="8">a</tspan>';
    return '<svg viewBox="0 0 340 210" role="img" aria-label="エネルギー図">' + arrowDefs(id) +
      '<path d="M22 12V192H332" class="ax"/>' + T(26, 22, "エネルギー", "tx s") + T(262, 206, "反応の進行 →", "tx s") +
      '<path d="M30 92H95C125 92 140 32 170 32C200 32 215 142 245 142H326" class="ls"/>' +
      '<path d="M76 32H270M95 92H324" class="gd"/>' +
      '<line x1="82" y1="90" x2="82" y2="35" class="ar" marker-end="url(#' + id + ')"/>' + T(76, 66, "E" + a + "（正）", "tx c1", "end") +
      '<line x1="270" y1="140" x2="270" y2="35" class="ar" marker-end="url(#' + id + ')"/>' + T(276, 74, "E" + a + "′（逆）", "tx c2") +
      '<line x1="318" y1="94" x2="318" y2="139" class="ar" marker-end="url(#' + id + ')"/>' + T(312, 124, "ΔH", "tx c3", "end") +
      T(34, 84, "CO＋H₂O", "tx s") + T(250, 134, "CO₂＋H₂", "tx s") +
      T(40, 180, "ΔH ＝ E" + a + " − E" + a + "′ ＜ 0（発熱反応）", "tx s") + "</svg>";
  }
  /* ── 加熱曲線（氷 → 水蒸気）── 線の上には番号だけ、説明は右下に並べる */
  function heat() {
    const nb = (x, y, t) => '<circle cx="' + x + '" cy="' + y + '" r="8.5" class="nb"/>' + T(x, y + 3.6, t, "tx nbt", "middle");
    return '<svg viewBox="0 0 340 210" role="img" aria-label="加熱曲線">' +
      '<path d="M40 10V182H330" class="ax"/>' + T(44, 18, "温度(℃)", "tx s") + T(258, 200, "加えた熱量 →", "tx s") +
      T(34, 56, "100", "tx s", "end") + T(34, 156, "0", "tx s", "end") + T(34, 176, "−10", "tx s", "end") +
      '<path d="M40 52H147M40 152H70" class="gd"/>' +
      '<path d="M44 172L70 152H105L147 52H322" class="ls"/>' +
      nb(68, 170, "①") + nb(88, 140, "②") + nb(138, 104, "③") + nb(236, 40, "④") +
      T(160, 88, "① 氷を温める（m·c·ΔT）", "tx s") +
      T(160, 106, "② 融解：温度一定（mol × 融解熱）", "tx s c2") +
      T(160, 124, "③ 水を温める（m·c·ΔT）", "tx s") +
      T(160, 142, "④ 蒸発：温度一定（mol × 蒸発熱）", "tx s c2") +
      T(160, 160, "　→ ④ がいちばん大きい", "tx s c1") + "</svg>";
  }
  /* ── 燃料電池 ── */
  function cell() {
    const id = "mca" + (++uid);
    return '<svg viewBox="0 0 330 204" role="img" aria-label="燃料電池">' + arrowDefs(id) +
      '<path d="M70 44V18H250V44" class="wire"/><rect x="138" y="8" width="44" height="20" rx="5" class="bx2"/>' + T(160, 22, "負荷", "tx s", "middle") +
      '<line x1="86" y1="12" x2="126" y2="12" class="ar" marker-end="url(#' + id + ')"/>' + T(90, 8, "e⁻", "tx s c1") +
      '<rect x="22" y="44" width="96" height="104" rx="10" class="cA"/>' + T(70, 62, "負極", "tx b", "middle") + T(70, 84, "H₂ → 2H⁺＋2e⁻", "tx s", "middle") +
      '<rect x="136" y="44" width="48" height="104" rx="6" class="cM"/>' + T(160, 62, "高分子膜", "tx s", "middle") +
      '<line x1="142" y1="96" x2="178" y2="96" class="ar" marker-end="url(#' + id + ')"/>' + T(160, 90, "H⁺", "tx s c1", "middle") +
      '<line x1="142" y1="118" x2="178" y2="118" class="ar" marker-end="url(#' + id + ')"/>' + T(160, 112, "H⁺", "tx s c1", "middle") +
      '<rect x="202" y="44" width="96" height="104" rx="10" class="cC"/>' + T(250, 62, "正極", "tx b", "middle") + T(250, 84, "O₂＋4H⁺＋4e⁻", "tx s", "middle") + T(250, 100, "→ 2H₂O", "tx s", "middle") +
      '<line x1="44" y1="176" x2="44" y2="152" class="ar" marker-end="url(#' + id + ')"/>' + T(52, 172, "H₂", "tx s") +
      '<line x1="218" y1="176" x2="218" y2="152" class="ar" marker-end="url(#' + id + ')"/>' + T(224, 172, "O₂（空気）", "tx s") +
      '<line x1="290" y1="152" x2="290" y2="176" class="ar" marker-end="url(#' + id + ')"/>' + T(296, 174, "H₂O", "tx s") +
      T(22, 198, "H₂ 1 mol → e⁻ 2 mol → 2×9.65×10⁴ C", "tx s") + "</svg>";
  }
  /* ── 一次反応の減り方 ── */
  function decay() {
    const X = (t) => 44 + t * 1.22, Y = (v) => 20 + (1 - v) * 140;
    let d = "";
    for (let t = 0; t <= 210; t += 3) d += (t ? "L" : "M") + X(t).toFixed(1) + " " + Y(Math.exp(-0.01 * t)).toFixed(1);
    const m = [[69.3, 0.5, "t½"], [138.6, 0.25, "2t½"], [207.9, 0.125, "3t½"]];
    let g = "";
    m.forEach((p) => { g += '<path d="M44 ' + Y(p[1]).toFixed(1) + "H" + X(p[0]).toFixed(1) + "V160" + '" class="gd"/><circle cx="' + X(p[0]).toFixed(1) + '" cy="' + Y(p[1]).toFixed(1) + '" r="3.5" class="pt"/>' + T(X(p[0]).toFixed(1), 174, p[2], "tx s", "middle"); });
    return '<svg viewBox="0 0 320 200" role="img" aria-label="一次反応のグラフ">' +
      '<path d="M44 12V160H312" class="ax"/>' + T(48, 14, "[CO]/[CO]₀", "tx s") + T(278, 196, "時間 t", "tx s") +
      T(38, 24, "1", "tx s", "end") + T(38, 94, "½", "tx s", "end") + T(38, 129, "¼", "tx s", "end") + T(38, 146, "⅛", "tx s", "end") +
      '<path d="' + d + '" class="ls"/>' + g +
      T(120, 50, "半減期 t½ ごとに半分になる", "tx s c1") + T(120, 66, "t½ ＝ 2.30 log₁₀2 / k ＝ 0.693 / k", "tx s") +
      T(120, 82, "（初めの濃度に関係しない）", "tx s") + "</svg>";
  }
  /* ── オゾンの生成と体積 ── */
  function ozone() {
    const o2 = (x, y) => '<circle cx="' + x + '" cy="' + y + '" r="9" class="aO"/><circle cx="' + (x + 14) + '" cy="' + y + '" r="9" class="aO"/>';
    const o3 = (x, y) => '<circle cx="' + x + '" cy="' + (y + 6) + '" r="9" class="aZ"/><circle cx="' + (x + 13) + '" cy="' + (y - 6) + '" r="9" class="aZ"/><circle cx="' + (x + 26) + '" cy="' + (y + 6) + '" r="9" class="aZ"/>';
    const id = "mca" + (++uid);
    return '<svg viewBox="0 0 320 170" role="img" aria-label="オゾンの生成">' + arrowDefs(id) +
      o2(24, 36) + o2(24, 66) + o2(24, 96) + T(32, 126, "O₂ 3 体積", "tx s", "middle") +
      '<line x1="74" y1="66" x2="144" y2="66" class="ar" marker-end="url(#' + id + ')"/>' + T(108, 58, "紫外線", "tx s c1", "middle") +
      o3(160, 46) + o3(160, 86) + T(186, 126, "O₃ 2 体積", "tx s", "middle") +
      '<rect x="232" y="30" width="22" height="90" rx="4" class="vb1"/><rect x="262" y="60" width="22" height="60" rx="4" class="vb2"/>' +
      T(243, 24, "3", "tx s", "middle") + T(273, 54, "2", "tx s", "middle") + '<path d="M262 30H292V60" class="gd"/>' + T(296, 48, "−1", "tx s c3") +
      T(16, 150, "3O₂ → 2O₃：体積が 1 減るごとに O₃ が 2 できる", "tx s") + T(16, 166, "→ できた O₃ ＝ 減った体積 × 2", "tx s c1") + "</svg>";
  }
  /* ── 緩衝液のしくみ ── */
  function buffer() {
    const id = "mca" + (++uid);
    return '<svg viewBox="0 0 320 192" role="img" aria-label="緩衝液のしくみ">' + arrowDefs(id) +
      '<rect x="10" y="30" width="138" height="54" rx="10" class="cA"/>' + T(79, 50, "CH₃COOH（多い）", "tx b", "middle") + T(79, 70, "OH⁻ を中和する", "tx s", "middle") +
      '<rect x="172" y="30" width="138" height="54" rx="10" class="cC"/>' + T(241, 50, "CH₃COO⁻（多い）", "tx b", "middle") + T(241, 70, "H⁺ を受けとる", "tx s", "middle") +
      T(160, 18, "CH₃COOH ⇄ H⁺ ＋ CH₃COO⁻", "tx s", "middle") +
      '<line x1="79" y1="88" x2="79" y2="110" class="ar" marker-end="url(#' + id + ')"/>' + T(79, 126, "CH₃COOH＋OH⁻", "tx s", "middle") + T(79, 140, "→ CH₃COO⁻＋H₂O", "tx s", "middle") +
      '<line x1="241" y1="88" x2="241" y2="110" class="ar" marker-end="url(#' + id + ')"/>' + T(241, 126, "CH₃COO⁻＋H⁺", "tx s", "middle") + T(241, 140, "→ CH₃COOH", "tx s", "middle") +
      T(160, 168, "[H⁺] ＝ K<tspan baseline-shift=\"sub\" font-size=\"8\">a</tspan> × [CH₃COOH] / [CH₃COO⁻]", "tx c1", "middle") +
      T(160, 186, "（同じ体積なら 物質量の比 で計算できる）", "tx s", "middle") + "</svg>";
  }
  /* ── レドックスフロー電池（2026-10-06b）── */
  function vflow() {
    const id = "mca" + (++uid);
    const tank = (x, lb, sub, cls) => '<path d="M' + x + ' 70v74a40 9 0 0 0 80 0V70" class="' + cls + '"/><ellipse cx="' + (x + 40) + '" cy="70" rx="40" ry="9" class="' + cls + '"/>' +
      T(x + 40, 104, lb, "tx b", "middle") + T(x + 40, 120, sub, "tx s", "middle");
    return '<svg viewBox="0 0 340 220" role="img" aria-label="レドックスフロー電池">' + arrowDefs(id) +
      tank(6, "負極液", "V²⁺ / V³⁺", "cA") + tank(254, "正極液", "VO₂⁺ / VO²⁺", "cC") +
      '<rect x="128" y="70" width="84" height="84" rx="10" class="bx2"/>' +
      '<rect x="138" y="80" width="10" height="64" rx="2" class="el"/><rect x="192" y="80" width="10" height="64" rx="2" class="el"/>' +
      '<path d="M170 74V150" class="gd"/>' + T(170, 166, "隔膜", "tx s", "middle") +
      T(143, 178, "負極", "tx s", "middle") + T(197, 178, "正極", "tx s", "middle") +
      '<line x1="156" y1="112" x2="184" y2="112" class="ar" marker-end="url(#' + id + ')"/>' + T(170, 106, "H⁺", "tx s c1", "middle") +
      '<path d="M86 96H128M128 128H86M212 96H254M254 128H212" class="wire2"/>' +
      '<path d="M143 80V30H197V80" class="wire"/><circle cx="170" cy="30" r="11" class="bx2"/>' + T(170, 34, "負荷", "tx s", "middle") +
      '<line x1="146" y1="20" x2="158" y2="20" class="ar" marker-end="url(#' + id + ')"/>' + T(140, 16, "e⁻", "tx s c1") +
      T(10, 200, "放電：負極 V²⁺ → V³⁺ ＋ e⁻（酸化）", "tx s") + T(10, 216, "　　　正極 VO₂⁺ ＋ 2H⁺ ＋ e⁻ → VO²⁺ ＋ H₂O（還元）", "tx s") + "</svg>";
  }
  /* ── 浸透圧（2026-10-06b）── */
  function osmo() {
    const id = "mca" + (++uid);
    return '<svg viewBox="0 0 300 206" role="img" aria-label="浸透圧">' + arrowDefs(id) +
      '<path d="M60 40V150a22 22 0 0 0 22 22h136a22 22 0 0 0 22-22V40" class="ax"/><path d="M96 40V136h108V40" class="ax"/>' +
      '<path d="M62 62V150a20 20 0 0 0 20 20h68V136H96V62z" class="cA"/><path d="M150 170h68a20 20 0 0 0 20-20V92h-34v44h-54z" class="cW"/>' +
      '<path d="M150 136V172" class="mem"/>' + T(156, 192, "半透膜", "tx s") +
      T(79, 54, "溶液", "tx b", "middle") + T(221, 84, "水", "tx b", "middle") +
      '<path d="M96 62H262M204 92H262" class="gd"/>' +
      '<line x1="256" y1="90" x2="256" y2="65" class="ar" marker-end="url(#' + id + ')"/><line x1="256" y1="64" x2="256" y2="89" class="ar" marker-end="url(#' + id + ')"/>' + T(266, 82, "h", "tx b c3") +
      T(10, 22, "水が半透膜を通って溶液側へ入り、液面に差 h ができる", "tx s") +
      T(100, 118, "Π ＝ 液柱 h の圧力", "tx s c1") + T(100, 132, "ΠV ＝ nRT", "tx s") + "</svg>";
  }
  /* ── 分子の形（電子対反発則）── */
  function shape(kind, cen, lig, chg) {
    cen = cen || "C"; lig = lig || "H";
    const C = [100, 80];
    const atom = (x, y, s) => '<circle cx="' + x + '" cy="' + y + '" r="12" class="aL"/>' + T(x, y + 4, s, "tx b", "middle");
    const bond = (x, y, k) => k === "w" ? '<path d="M' + C[0] + " " + C[1] + "L" + (x - 5) + " " + (y - 3) + "L" + (x + 4) + " " + (y + 4) + 'z" class="wd"/>'
      : '<line x1="' + C[0] + '" y1="' + C[1] + '" x2="' + x + '" y2="' + y + '" class="' + (k === "d" ? "bd" : "bn") + '"/>';
    const lone = (x, y, rot) => '<g transform="rotate(' + rot + " " + C[0] + " " + C[1] + ')"><ellipse cx="' + C[0] + '" cy="' + (C[1] - 34) + '" rx="12" ry="20" class="lp"/>' +
      '<circle cx="' + (C[0] - 4) + '" cy="' + (C[1] - 40) + '" r="2.4" class="lpd"/><circle cx="' + (C[0] + 4) + '" cy="' + (C[1] - 40) + '" r="2.4" class="lpd"/></g>';
    let g = "", cap = "";
    if (kind === "tetra") {
      const P = [[100, 24, "n"], [42, 116, "n"], [128, 134, "w"], [160, 100, "d"]];
      P.forEach((p) => { g += bond(p[0], p[1], p[2]); }); P.forEach((p) => { g += atom(p[0], p[1], lig); });
      cap = "正四面体形（約109.5°）・非共有電子対 0";
    } else if (kind === "pyr") {
      g += lone(0, 0, 0);
      const P = [[44, 116, "n"], [128, 134, "w"], [160, 100, "d"]];
      P.forEach((p) => { g += bond(p[0], p[1], p[2]); }); P.forEach((p) => { g += atom(p[0], p[1], lig); });
      cap = "三角錐形・非共有電子対 1（四面体の1頂点）";
    } else if (kind === "bent") {
      g += lone(0, 0, -38) + lone(0, 0, 38);
      const P = [[46, 126, "n"], [154, 126, "n"]];
      P.forEach((p) => { g += bond(p[0], p[1], p[2]); }); P.forEach((p) => { g += atom(p[0], p[1], lig); });
      cap = "折れ線形・非共有電子対 2";
    } else if (kind === "lin") {
      g += '<line x1="40" y1="76" x2="160" y2="76" class="bn"/><line x1="40" y1="84" x2="160" y2="84" class="bn"/>';
      g += atom(34, 80, lig) + atom(166, 80, lig);
      cap = "直線形（180°）・二重結合は1組と数える";
    } else if (kind === "tri") {
      const P = [[100, 26, "n"], [53, 107, "n"], [147, 107, "n"]];
      P.forEach((p) => { g += bond(p[0], p[1], p[2]); }); P.forEach((p) => { g += atom(p[0], p[1], lig); });
      cap = "正三角形（120°）・平面";
    }
    g += '<circle cx="' + C[0] + '" cy="' + C[1] + '" r="16" class="aC"/>' + T(C[0], C[1] + 5, cen, "tx b w", "middle");
    if (chg) g += T(178, 30, chg === "+" ? "＋" : chg, "tx b c3", "middle") + '<path d="M18 14H10V146H18M182 14H190V146H182" class="ax"/>';
    return '<svg class="sm" viewBox="0 0 200 172" role="img" aria-label="分子の形">' + g + T(100, 166, cap, "tx s", "middle") + "</svg>";
  }
  function make(name) {
    if (!name) return "";
    const p = String(name).split(":");
    switch (p[0]) {
      case "arr6": return arr6();
      case "arrh": return arrh();
      case "edia": return edia();
      case "heat": return heat();
      case "cell": return cell();
      case "decay": return decay();
      case "ozone": return ozone();
      case "buffer": return buffer();
      case "vflow": return vflow();
      case "osmo": return osmo();
      case "shape": return shape(p[1], p[2], p[3], p[4]);
    }
    return "";
  }

  /* ══ ★★ 2026-10-09 ナビゲーター（マスコット）を XEVARION の UR キャラにかえられる（ご指定）══
     設定 set.nav … "" ＝ケミィ（はじめから）／"miu" など＝UR キャラ（XEVA.MB_CHARS の rarLabel "UR"）。
     ★ 使えるのは<b>持っている</b> UR だけ（XEVA.mbOwnedSet＝MagiBurst のセーブ）。持っていなければケミィにもどる。
     ★ 顔は ../img/t_*.webp（ガチャ・キャラ一覧と同じ正方形の絵）を丸く切りぬく。気持ち（mood）の飾りはケミィと同じもの。 */
  function navList() {
    let all = [], own = {};
    try { all = ((window.XEVA && XEVA.MB_CHARS) || []).filter((c) => c.rarLabel === "UR"); } catch (e) { all = []; }
    try { own = (window.XEVA && XEVA.mbOwnedSet) ? XEVA.mbOwnedSet() : {}; } catch (e) { own = {}; }
    return all.map((c) => ({ id: c.mbId, nm: c.name, img: c.file, own: !!own[c.mbId] }));
  }
  function navCur() {
    let id = "";
    try { id = (window.MCL && MCL.get().set.nav) || ""; } catch (e) { id = ""; }
    if (!id) return null;
    const c = navList().find((x) => x.id === id);
    return c && c.own ? c : null;
  }
  function navName() { const c = navCur(); return c ? c.nm : "ケミィ"; }

  /* ── マスコット「ケミィ」（opt.chemy＝ナビがだれでもケミィを描く：ナビえらびの一覧用）── */
  function mascot(mood, opt) {
    const id = "mcm" + (++uid);
    mood = mood || "smile";
    let eyes, mouth, extra = "";
    if (mood === "happy") {
      eyes = '<path d="M27 55q4-6 8 0M45 55q4-6 8 0" class="mk-l"/>';
      mouth = '<path d="M33 62q7 9 14 0z" class="mk-m"/>';
      extra = '<path d="M66 18l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" class="mk-st"/><path d="M12 26l1.5 3.5 3.5 1.5-3.5 1.5-1.5 3.5-1.5-3.5-3.5-1.5 3.5-1.5z" class="mk-st"/>';
    } else if (mood === "sad") {
      eyes = '<circle cx="31" cy="56" r="3"/><circle cx="49" cy="56" r="3"/><path d="M26 49l8 3M54 49l-8 3" class="mk-l"/>';
      mouth = '<path d="M34 67q6-6 12 0" class="mk-l"/>';
      extra = '<path d="M60 44q3 5 0 8q-3-3 0-8z" class="mk-sw"/>';
    } else if (mood === "think") {
      eyes = '<circle cx="32" cy="54" r="3"/><circle cx="50" cy="54" r="3"/>';
      mouth = '<path d="M36 65h9" class="mk-l"/>';
      extra = '<text x="62" y="26" class="mk-q">?</text>';
    } else if (mood === "wow") {
      eyes = '<circle cx="31" cy="55" r="4"/><circle cx="49" cy="55" r="4"/><circle cx="32.3" cy="53.6" r="1.4" fill="#fff"/><circle cx="50.3" cy="53.6" r="1.4" fill="#fff"/>';
      mouth = '<ellipse cx="40" cy="65" rx="4" ry="5" class="mk-m"/>';
      extra = '<path d="M66 18l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" class="mk-st"/>';
    } else {
      eyes = '<circle cx="31" cy="56" r="3.4"/><circle cx="49" cy="56" r="3.4"/><circle cx="32.2" cy="54.8" r="1.1" fill="#fff"/><circle cx="50.2" cy="54.8" r="1.1" fill="#fff"/>';
      mouth = '<path d="M35 63q5 5 10 0" class="mk-l"/>';
    }
    /* ★★ 2026-10-09 ナビが UR キャラなら、丸い顔の絵＋同じ飾り（星・汗・？） */
    const nv = opt && opt.chemy ? null : navCur();
    if (nv) {
      return '<span class="mascot nav ' + mood + '" aria-hidden="true"><span class="nv-ring"><img src="' + nv.img + '" alt="" loading="lazy" decoding="async"></span>' +
        '<b class="nv-ur">UR</b>' + (extra ? '<svg class="nv-fx" viewBox="0 0 80 84">' + extra + "</svg>" : "") + "</span>";
    }
    return '<svg class="mascot ' + mood + '" viewBox="0 0 80 84" aria-hidden="true"><defs>' +
      '<linearGradient id="' + id + 'g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5fd0ff"/><stop offset="1" stop-color="#7b5cff"/></linearGradient>' +
      '<clipPath id="' + id + 'c"><circle cx="40" cy="58" r="23"/></clipPath></defs>' +
      '<rect x="31" y="8" width="18" height="8" rx="3" class="mk-cap"/>' +
      '<path d="M33 14h14v22a24 24 0 1 1-14 0z" class="mk-gl"/>' +
      '<g clip-path="url(#' + id + 'c)"><rect x="10" y="56" width="60" height="40" fill="url(#' + id + 'g)"/><path d="M14 58q8-5 13 0t13 0 13 0 13 0" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="2"/>' +
      '<circle cx="28" cy="74" r="2.5" fill="rgba(255,255,255,.65)"/><circle cx="50" cy="70" r="1.8" fill="rgba(255,255,255,.65)"/></g>' +
      '<path d="M33 14h14v22a24 24 0 1 1-14 0z" class="mk-ol"/>' +
      '<g class="mk-face">' + eyes + mouth + '<ellipse cx="25" cy="63" rx="3.6" ry="2.2" class="mk-ch"/><ellipse cx="55" cy="63" rx="3.6" ry="2.2" class="mk-ch"/></g>' +
      extra + "</svg>";
  }

  window.MCLFig = { make, mascot, navList, navCur, navName };
})();
