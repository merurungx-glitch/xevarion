/* ============================================================
   MagiChemLex — mcl-fig5.js（基礎セットの図・2026-10-14）
   ・mcl-fig.js の MCLFig.add(name, fn) で登録する（make("kglu:s") のように「名前:引数」）。
   ・色は CSS（.fig の中のクラス）で決める＝ダークでも読める。
   ・ksep … 金属イオンの分離の流れ（Al³⁺・Ca²⁺・Fe³⁺・Pb²⁺・Zn²⁺）
     kana … 元素分析の装置（燃焼管A・反応管B・C）
     kglu … グルコースの3つの構造（A ⇄ B ⇄ C）。":s" は空欄に答えを入れた解説用
     kfru … フルクトースの鎖状構造（番号つき）と5員環・6員環
     knyl … ナイロン66 の界面重合（B液を静かに注ぐ → 界面の膜を引き上げる）
     kosep … 芳香族化合物の分離（塩酸・炭酸水素ナトリウム・水酸化ナトリウム）
     kdrib … デオキシリボース（炭素の番号つき）
   ★★ 2026-10-14b 基礎セットを番号順（201〜220）に組み直したので、下の「基礎セットn 第m問」も新しい番号にした（mcl-data10.js）。
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
  /* 角丸の箱と、その中央の文字 */
  const box = (cx, y, w, s, cls, tc) => '<rect x="' + f1(cx - w / 2) + '" y="' + y + '" width="' + w + '" height="22" rx="6" class="' + (cls || "bx2") + '"/>' + T(f1(cx), y + 15, s, tc || "tx", "middle");
  /* 分かれ道：上の点 (x, y0) から下へ、y1 で左右 (xl, xr) に分かれて y2 まで */
  const fork = (x, y0, y1, xl, xr, y2) => '<path d="M' + x + " " + y0 + "V" + y1 + "M" + xl + " " + y2 + "V" + y1 + "H" + xr + "V" + y2 + '" class="ax"/>';

  /* ── 金属イオンの分離（基礎セット1 第3問）── */
  F.add("ksep", () => {
    let g = '<rect x="64" y="4" width="272" height="26" rx="7" class="bx"/>' + T(200, 21, "Al³⁺・Ca²⁺・Fe³⁺・Pb²⁺・Zn²⁺ を含む水溶液", "tx", "middle");
    g += fork(200, 30, 48, 74, 254, 58) + T(206, 43, "← 希塩酸を加える", "tx s");
    g += box(74, 58, 64, "沈殿ア") + box(254, 58, 64, "ろ液ア");
    g += fork(254, 80, 100, 170, 336, 110) + T(260, 95, "← アンモニア水（過剰）", "tx s");
    g += box(170, 110, 64, "沈殿イ") + box(336, 110, 64, "ろ液イ");
    g += fork(170, 132, 152, 118, 222, 162) + T(176, 147, "← NaOH 水溶液（過剰）", "tx s");
    g += box(118, 162, 64, "沈殿ウ") + box(222, 162, 64, "ろ液ウ");
    g += fork(336, 132, 212, 292, 368, 222) + T(330, 196, "硫化水素を通じる →", "tx s", "end");
    g += box(292, 222, 58, "沈殿エ") + box(368, 222, 58, "ろ液エ");
    return '<svg viewBox="0 0 400 252" role="img" aria-label="金属イオンの分離の流れ">' + g + "</svg>";
  });

  /* ── 元素分析の装置（基礎セット2 第2問）── */
  F.add("kana", () => {
    const id = "mkf" + (++uid), pd = "kd" + uid, ph = "kh" + uid;
    /* ★ 模様は class の fill（CSS）に負けるので、style で塗る */
    let g = arrowDefs(id) +
      '<defs><pattern id="' + pd + '" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.15" class="wd"/></pattern>' +
      '<pattern id="' + ph + '" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" class="ax" style="stroke-width:1.5"/></pattern></defs>';
    g += T(6, 70, "酸素", "tx b") + '<path d="M34 66H54" class="ar" marker-end="url(#' + id + ')"/>';
    /* 燃焼管A：試料皿・酸化銅(II) */
    g += '<rect x="56" y="52" width="170" height="28" rx="7" class="bx2"/>' + T(100, 44, "燃焼管A", "tx b", "middle");
    g += '<path d="M76 71Q92 79 108 71" class="ax"/>' + T(92, 66, "試料", "tx s", "middle");
    g += '<rect x="148" y="55" width="72" height="22" rx="3" class="bx2" style="fill:url(#' + ph + ')"/>' + T(184, 44, "酸化銅(II)", "tx s c1", "middle");
    /* バーナー（管の下・炎は管にふれない） */
    [92, 168].forEach((x) => { g += '<path d="M' + (x - 8) + " 112L" + (x - 4) + " 98H" + (x + 4) + "L" + (x + 8) + ' 112Z" class="bx"/>' + '<path d="M' + x + " 96Q" + (x - 5) + " 91 " + x + " 84Q" + (x + 5) + " 91 " + x + ' 96Z" class="lp"/>'; });
    g += T(92, 126, "バーナー", "tx s", "middle") + T(168, 126, "バーナー", "tx s", "middle");
    /* 反応管B（点）・反応管C（斜線） */
    g += line(226, 66, 246, 66, "ax");
    g += '<rect x="246" y="52" width="54" height="28" rx="6" class="bx2" style="fill:url(#' + pd + ')"/>' + T(273, 44, "反応管B", "tx b", "middle");
    g += line(300, 66, 316, 66, "ax");
    g += '<rect x="316" y="52" width="54" height="28" rx="6" class="bx2" style="fill:url(#' + ph + ')"/>' + T(343, 44, "反応管C", "tx b", "middle");
    g += '<path d="M370 66H392" class="ar" marker-end="url(#' + id + ')"/>';
    return '<svg viewBox="0 0 400 134" role="img" aria-label="元素分析の装置">' + g + "</svg>";
  });

  /* ── グルコース（基礎セット3 第5問）A ⇄ B（1段目）・⇄ C（2段目）。sol＝空欄に答え ──
     結合の線は C の文字の手前で止める（文字と線が重ならない）。置換基は上下へ短い線 */
  function gluRing(ox, oy, kind, sol) {
    const C5 = [ox + 38, oy + 22], O = [ox + 86, oy + 22], C1 = [ox + 110, oy + 50], C2 = [ox + 86, oy + 78], C3 = [ox + 38, oy + 78], C4 = [ox + 14, oy + 50];
    const bond = (a, b, c, sa, sb) => {
      const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
      return line(a[0] + ux * sa, a[1] + uy * sa, b[0] - ux * sb, b[1] - uy * sb, c || "ax");
    };
    let g = "";
    g += bond(C4, C5, "ax", 7, 7) + bond(C3, C4, "bn", 7, 7) + bond(C2, C3, "bn", 7, 7);
    if (kind === "B") {
      g += bond(C1, C2, "bn", 4, 7);
      g += line(C5[0] + 7, C5[1], C5[0] + 22, C5[1], "ax") + T(C5[0] + 24, C5[1] + 4, "OH", "tx s");
    } else {
      g += bond(C1, C2, "bn", 7, 7) + bond(C5, O, "ax", 7, 7) + bond(O, C1, "ax", 7, 7) + T(O[0], O[1] + 4, "O", "tx", "middle");
    }
    [C5, C2, C3, C4].concat(kind === "B" ? [] : [C1]).forEach((p) => { g += T(p[0], p[1] + 4, "C", "tx", "middle"); });
    const up = (p, s, dx) => line(p[0], p[1] - 7, p[0], p[1] - 16, "ax") + T(p[0] + (dx || 0), p[1] - 19, s, "tx s", "middle");
    const dn = (p, s, dx) => line(p[0], p[1] + 7, p[0], p[1] + 16, "ax") + T(p[0] + (dx || 0), p[1] + 26, s, "tx s", "middle");
    const bx = (x, y, s, ans) => '<rect x="' + (x - 17) + '" y="' + (y - 11) + '" width="34" height="15" rx="3" class="bx2"/>' + T(x, y, sol ? ans : s, sol ? "tx s c1" : "tx b", "middle");
    if (kind === "C") g += line(C5[0], C5[1] - 7, C5[0], C5[1] - 14, "ax") + bx(C5[0], C5[1] - 18, "W", "CH₂OH");
    else g += up(C5, "CH₂OH");
    g += dn(C5, "H");
    /* C4：H は左上・HO は左下（文字は線の外側） */
    g += line(C4[0] - 5, C4[1] - 5, C4[0] - 10, C4[1] - 14, "ax") + T(C4[0] - 12, C4[1] - 17, "H", "tx s", "middle");
    g += line(C4[0] - 5, C4[1] + 5, C4[0] - 10, C4[1] + 14, "ax") + T(C4[0] - 12, C4[1] + 25, "HO", "tx s", "middle");
    g += up(C3, "OH") + dn(C3, "H") + up(C2, "H");
    if (kind === "C") g += line(C2[0], C2[1] + 7, C2[0], C2[1] + 14, "ax") + bx(C2[0], C2[1] + 26, "Z", "OH");
    else g += dn(C2, "OH");
    if (kind === "A") g += line(C1[0] + 5, C1[1] - 5, C1[0] + 10, C1[1] - 14, "ax") + T(C1[0] + 14, C1[1] - 17, "OH", "tx s", "middle") + line(C1[0] + 5, C1[1] + 5, C1[0] + 10, C1[1] + 14, "ax") + T(C1[0] + 12, C1[1] + 25, "H", "tx s", "middle");
    if (kind === "B") g += '<rect x="' + (C1[0] - 14) + '" y="' + (C1[1] - 11) + '" width="34" height="18" rx="5" class="bx2"/>' + T(C1[0] + 3, C1[1] + 3, sol ? "CHO" : "ウ", sol ? "tx s c1" : "tx b", "middle");
    if (kind === "C") g += line(C1[0] + 5, C1[1] - 5, C1[0] + 10, C1[1] - 12, "ax") + bx(C1[0] + 22, C1[1] - 16, "X", "H") + line(C1[0] + 5, C1[1] + 5, C1[0] + 10, C1[1] + 12, "ax") + bx(C1[0] + 22, C1[1] + 24, "Y", "OH");
    g += T(ox + 62, oy + 118, kind, "tx b", "middle");
    return g;
  }
  F.add("kglu", (p) => {
    const sol = !!(p && p[1] === "s");
    const g = gluRing(4, 22, "A", sol) + T(150, 76, "⇄", "tx b", "middle") + gluRing(166, 22, "B", sol) +
      T(72, 214, "⇄", "tx b", "middle") + gluRing(98, 160, "C", sol);
    return '<svg viewBox="0 0 300 290" role="img" aria-label="グルコースの3つの構造">' + g + "</svg>";
  });

  /* ── フルクトース：鎖状構造（番号つき）と、環になるときにつながる原子（基礎セット3 第5問）── */
  F.add("kfru", (p) => {
    const sol = !!(p && p[1] === "s");
    const xs = [40, 100, 160, 220, 280, 340], y = 70;
    let g = "";
    const lab = ["CH₂OH", "C", "CH", "CH", "CH", "CH₂OH"];
    for (let i = 0; i < 5; i++) g += line(xs[i] + 22, y, xs[i + 1] - 16, y, "ax");
    xs.forEach((x, i) => { g += T(x, y + 4, lab[i], "tx", "middle") + T(x, y + 30, (i + 1) + "", "tx s c1", "middle"); });
    g += line(xs[1], y - 8, xs[1], y - 22, "ax") + line(xs[1] + 4, y - 8, xs[1] + 4, y - 22, "ax") + T(xs[1] + 2, y - 26, "O", "tx", "middle");
    [2, 3, 4].forEach((i) => { g += line(xs[i], y + 8, xs[i], y + 16, "ax"); });
    g += T(xs[2], y - 12, "OH", "tx s", "middle") + T(xs[3], y - 12, "OH", "tx s", "middle") + T(xs[4], y - 12, "OH", "tx s", "middle");
    g += T(200, 18, "フルクトースの鎖状構造 E（数字は炭素の番号）", "tx s", "middle");
    if (sol) {
      g += '<path d="M' + xs[1] + " " + (y + 38) + "Q" + ((xs[1] + xs[4]) / 2) + " " + (y + 62) + " " + xs[4] + " " + (y + 38) + '" class="ld"/>' + T((xs[1] + xs[4]) / 2, y + 66, "2位の C と 5位の OH の O がつながる → 5員環（D）", "tx s c2 hl", "middle");
      g += T(200, y + 86, "（6位の OH の O とつながると 6員環＝F）", "tx s", "middle");
    }
    return '<svg viewBox="0 0 400 ' + (sol ? 164 : 110) + '" role="img" aria-label="フルクトースの鎖状構造">' + g + "</svg>";
  });

  /* ── ナイロン66 の界面重合（基礎セット4 第5問）── */
  F.add("knyl", () => {
    const id = "mkf" + (++uid);
    let g = arrowDefs(id);
    /* (a) B液を、ガラス棒を伝わらせて注ぐ */
    g += '<path d="M30 60V136a8 8 0 0 0 8 8h64a8 8 0 0 0 8-8V60" class="ax"/>' + '<rect x="32" y="112" width="74" height="30" class="cW"/>' + T(48, 132, "A液", "tx s", "middle");
    g += line(92, 40, 64, 128, "ax") + '<path d="M84 26l26 -10l8 16l-26 10z" class="bx2"/>' + T(122, 22, "B液", "tx s");
    g += T(70, 160, "(a)", "tx b", "middle");
    /* (b) 2層に分かれ、界面の膜を引き上げる */
    g += '<path d="M200 60V136a8 8 0 0 0 8 8h64a8 8 0 0 0 8-8V60" class="ax"/>';
    g += '<rect x="202" y="96" width="76" height="22" class="cM"/>' + '<rect x="202" y="118" width="76" height="24" class="cW"/>';
    g += line(202, 118, 278, 118, "ls");
    g += '<path d="M240 118C238 90 242 60 240 18" class="ld" style="stroke-dasharray:none;stroke-width:2"/>' + '<path d="M240 24V8" class="ar" marker-end="url(#' + id + ')"/>';
    g += T(286, 104, "← 上層", "tx s") + T(286, 134, "← 下層", "tx s") + T(286, 120, "← 界面", "tx s c1");
    g += T(248, 30, "膜を引き上げて巻き取る", "tx s");
    g += T(240, 160, "(b)", "tx b", "middle");
    return '<svg viewBox="0 0 400 168" role="img" aria-label="ナイロン66 の合成実験">' + g + "</svg>";
  });

  /* ── 芳香族化合物の分離（基礎セット3 第3問）。操作の説明は線の横（重ならない高さ）── */
  F.add("kosep", () => {
    let g = '<rect x="110" y="4" width="180" height="24" rx="7" class="bx"/>' + T(200, 20, "混合物のエーテル溶液", "tx b", "middle");
    g += fork(200, 28, 44, 70, 270, 54) + T(206, 40, "① 5% 塩酸と振る", "tx s");
    g += box(70, 54, 66, "水溶液") + box(270, 54, 84, "エーテル溶液");
    /* ② 水溶液 → 塩基性に */
    g += fork(70, 76, 96, 34, 112, 106) + T(76, 90, "② NaOH 水溶液で塩基性に", "tx s");
    g += box(34, 106, 52, "水層") + box(112, 106, 80, "油状物質A");
    /* ③ エーテル溶液 → NaHCO₃ */
    g += fork(270, 76, 150, 214, 330, 160) + T(276, 104, "③ 5% NaHCO₃ 水溶液", "tx s") + T(276, 116, "　と振る", "tx s");
    g += box(214, 160, 66, "水溶液") + box(330, 160, 84, "エーテル溶液");
    /* ④ */
    g += line(214, 182, 214, 214, "ax") + T(208, 202, "④ 塩酸で酸性に", "tx s", "end") + box(214, 214, 66, "物質B");
    /* ⑤ */
    g += fork(330, 182, 250, 288, 376, 260) + T(336, 206, "⑤ NaOH 水溶液", "tx s") + T(336, 218, "　と振る", "tx s");
    g += box(288, 260, 60, "水溶液") + box(376, 260, 60, "エーテル");
    /* ⑥・⑦ */
    g += line(288, 282, 288, 314, "ax") + T(282, 302, "⑥ 塩酸で酸性に", "tx s", "end") + box(288, 314, 60, "物質C");
    g += line(376, 282, 376, 314, "ax") + box(376, 314, 60, "D＋E") + T(376, 350, "⑦ 蒸留で", "tx s", "middle") + T(376, 362, "エーテルを除く", "tx s", "middle");
    return '<svg viewBox="0 0 412 368" role="img" aria-label="芳香族化合物の分離の流れ">' + g + "</svg>";
  });

  /* ── デオキシリボース（基礎セット4 第3問）── */
  F.add("kdrib", () => {
    const C4 = [70, 78], O = [110, 50], C1 = [150, 78], C2 = [134, 112], C3 = [86, 112];
    let g = line(C4[0], C4[1], O[0] - 7, O[1] + 4, "ax") + T(O[0], O[1] + 4, "O", "tx", "middle") + line(O[0] + 7, O[1] + 4, C1[0], C1[1], "ax");
    g += line(C1[0], C1[1], C2[0], C2[1], "bn") + line(C2[0], C2[1], C3[0], C3[1], "bn") + line(C3[0], C3[1], C4[0], C4[1], "bn");
    const num = (p, n, dx, dy) => T(p[0] + dx, p[1] + dy, n, "tx s c1", "middle");
    g += num(C4, "4", -12, 2) + num(C1, "1", 12, 2) + num(C2, "2", 12, 4) + num(C3, "3", -12, 4);
    /* 置換基 */
    g += line(C4[0], C4[1] - 4, C4[0], C4[1] - 26, "ax") + T(C4[0] + 6, C4[1] - 30, "⁵CH₂OH", "tx s", "middle");
    g += line(C4[0], C4[1] + 4, C4[0] - 12, C4[1] + 14, "ax") + T(C4[0] - 16, C4[1] + 22, "H", "tx s", "middle");
    g += line(C1[0], C1[1] - 4, C1[0] + 10, C1[1] - 18, "ax") + T(C1[0] + 18, C1[1] - 20, "OH", "tx s", "middle");
    g += line(C1[0], C1[1] + 4, C1[0] + 10, C1[1] + 16, "ax") + T(C1[0] + 14, C1[1] + 26, "H", "tx s", "middle");
    g += line(C2[0], C2[1] - 4, C2[0], C2[1] - 14, "ax") + T(C2[0], C2[1] - 16, "H", "tx s", "middle") + line(C2[0], C2[1] + 4, C2[0], C2[1] + 14, "ax") + T(C2[0], C2[1] + 24, "H", "tx s", "middle");
    g += line(C3[0], C3[1] - 4, C3[0], C3[1] - 14, "ax") + T(C3[0], C3[1] - 16, "H", "tx s", "middle") + line(C3[0], C3[1] + 4, C3[0], C3[1] + 14, "ax") + T(C3[0], C3[1] + 24, "OH", "tx s", "middle");
    g += T(110, 160, "デオキシリボース（数字は炭素の番号）", "tx s", "middle");
    return '<svg class="sm" viewBox="0 0 220 168" role="img" aria-label="デオキシリボースの構造">' + g + "</svg>";
  });
})();
