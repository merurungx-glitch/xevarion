/* ============================================================
   MagiBattle 3.0 — mb3-sprite.js（ドット絵）
   ・味方＝<b>後ろ姿</b>（ご回答「後ろから（NIKKE 式）」）。MagiAbyss のドット絵の設計図（MA.Pix.CHAR_ART）から作る：
       体（服）→ 後ろ髪を背中まで塗りつぶす → 頭（前髪＋顔の場所）を髪の色で埋める → 髪かざり・ポニーテール → 左右反転 → 輪郭 → 2倍（EPX）
   ・アリーナの相手＝MagiAbyss の正面の HD ドット（MA.Pix.charSpriteHD）をそのまま使う。
   ・敵（機械の侵略者ホロウ）・ボス・背景・遮蔽物・爆発は、ここで小さく描いてドット化（MA.Pix.pixelize）する。画像ファイルは使わない。
   ============================================================ */
(function () {
  "use strict";
  const MB3 = (window.MB3 = window.MB3 || {});
  const S = (MB3.Spr = {});
  const P = () => window.MA && window.MA.Pix;
  const BASE_PAL = { S: "#f8d8c4", s: "#e2a891", W: "#ffffff", B: "#f49aaa", M: "#c4566a", K: "#14111c" };

  /* ── 小さな道具 ── */
  function mk(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
  function hex(c) { const s = String(c || "#000").replace("#", "").slice(0, 6); const n = parseInt(s.length === 3 ? s.split("").map((x) => x + x).join("") : s, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function toHex(r, g, b) { const f = (v) => ("0" + Math.max(0, Math.min(255, Math.round(v))).toString(16)).slice(-2); return "#" + f(r) + f(g) + f(b); }
  function shade(c, k) { const [r, g, b] = hex(c); return toHex(r * k, g * k, b * k); }
  function mixc(a, b, t) { const A = hex(a), B = hex(b); return toHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); }
  function buf(w, h) { return { w, h, d: new Uint8ClampedArray(w * h * 4) }; }
  function put(b, x, y, c, a) { if (x < 0 || y < 0 || x >= b.w || y >= b.h) return; const i = (y * b.w + x) * 4, col = hex(c); b.d[i] = col[0]; b.d[i + 1] = col[1]; b.d[i + 2] = col[2]; b.d[i + 3] = a == null ? 255 : a; }
  function alpha(b, x, y) { if (x < 0 || y < 0 || x >= b.w || y >= b.h) return 0; return b.d[(y * b.w + x) * 4 + 3]; }
  function toCanvas(b) { const c = mk(b.w, b.h); const g = c.getContext("2d"); const id = g.createImageData(b.w, b.h); id.data.set(b.d); g.putImageData(id, 0, 0); return c; }
  function mirror(b) { const o = buf(b.w, b.h); for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) { const i = (y * b.w + x) * 4, j = (y * b.w + (b.w - 1 - x)) * 4; o.d[j] = b.d[i]; o.d[j + 1] = b.d[i + 1]; o.d[j + 2] = b.d[i + 2]; o.d[j + 3] = b.d[i + 3]; } return o; }
  function outline(b, col) {
    const o = { w: b.w, h: b.h, d: new Uint8ClampedArray(b.d) }, c = hex(col);
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
      if (alpha(b, x, y)) continue;
      if (alpha(b, x - 1, y) || alpha(b, x + 1, y) || alpha(b, x, y - 1) || alpha(b, x, y + 1)) { const i = (y * b.w + x) * 4; o.d[i] = c[0]; o.d[i + 1] = c[1]; o.d[i + 2] = c[2]; o.d[i + 3] = 255; }
    }
    return o;
  }
  function whiteOf(b) { const o = { w: b.w, h: b.h, d: new Uint8ClampedArray(b.d) }; for (let i = 0; i < o.d.length; i += 4) if (o.d[i + 3]) { o.d[i] = 255; o.d[i + 1] = 255; o.d[i + 2] = 255; } return o; }
  function shiftUp(b, cond, dx, dy) {
    const o = buf(b.w, b.h);
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
      const i = (y * b.w + x) * 4; if (!b.d[i + 3]) continue;
      const m = cond(x, y), nx = m ? x + dx : x, ny = m ? y + dy : y;
      if (nx < 0 || ny < 0 || nx >= b.w || ny >= b.h) continue;
      const j = (ny * b.w + nx) * 4; o.d.set(b.d.subarray(i, i + 4), j);
    }
    return o;
  }
  function px32(b, x, y) { if (x < 0 || y < 0 || x >= b.w || y >= b.h) return 0; const i = (y * b.w + x) * 4; return b.d[i + 3] ? (((b.d[i] << 24) | (b.d[i + 1] << 16) | (b.d[i + 2] << 8) | b.d[i + 3]) >>> 0) : 0; }
  /* EPX（Scale2x）：斜めをなめらかにした2倍 */
  function epx(b) {
    const o = buf(b.w * 2, b.h * 2);
    const cp = (dx, dy, sx, sy) => { if (sx < 0 || sy < 0 || sx >= b.w || sy >= b.h) return; const si = (sy * b.w + sx) * 4; if (!b.d[si + 3]) return; o.d.set(b.d.subarray(si, si + 4), (dy * o.w + dx) * 4); };
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
      const A = px32(b, x, y - 1), B = px32(b, x + 1, y), C = px32(b, x - 1, y), Dd = px32(b, x, y + 1);
      const ox = x * 2, oy = y * 2;
      if (C === A && C !== Dd && A !== B) cp(ox, oy, x, y - 1); else cp(ox, oy, x, y);
      if (A === B && A !== C && B !== Dd) cp(ox + 1, oy, x + 1, y); else cp(ox + 1, oy, x, y);
      if (Dd === C && Dd !== B && C !== A) cp(ox, oy + 1, x - 1, y); else cp(ox, oy + 1, x, y);
      if (B === Dd && B !== A && Dd !== C) cp(ox + 1, oy + 1, x, y + 1); else cp(ox + 1, oy + 1, x, y);
    }
    return o;
  }
  function drawRows(b, L, pal) {
    (L.rows || []).forEach((r, j) => { for (let i = 0; i < r.length; i++) { const ch = r[i]; if (ch === "." || ch === " ") continue; const c = pal[ch]; if (!c) continue; put(b, (L.x | 0) + i, (L.y | 0) + j, String(c).slice(0, 7), String(c).length === 9 ? parseInt(String(c).slice(7, 9), 16) : 255); } });
  }

  /* ══════════ 味方の後ろ姿 ══════════ */
  const backCache = {};
  /* ★★ 2026-10-31 ご指摘「ショウコの後ろからのドット絵の体部分が前からのものになっている」
     髪が短く背中が見える子（backBob）は、設計図の体（正面＝水着の胸・へそ／はおりの前の中の服／エプロン）がそのまま見えていた。
     → 体の上6行（x=6, y=14〜19）を背中用に差しかえる（下半身の行はそのまま）。
       ショウコ＝水着の背中のひもと結び目／ハル＝はおりの背中／ノノカ＝黒い服の背中にエプロンのひもとリボン。 */
  const BACK_BODY = {
    shouko: [".SSASSSSASS.", "SSAAAAAAAASS", "S.SSSAASSS.S", "s.SSSSSSSS.s", "S.SSSSSSSS.S", "S.SSSSSSSS.S"],
    haru:   [".CCCCCCCCCC.", "CCCCCCCCCCCC", "C.CCCCCCCC.C", "c.CcCCCCcC.c", "C.CCCCCCCC.C", "C.CCCCCCCC.C"],
    nonoka: [".CCACCCCACC.", "CCCACCCCACCC", "C.CACCCCAC.C", "c.CACCCCAC.c", "C.CAAaaAAC.C", "C.AAAAAAAA.C"],
  };
  function backBody(id, L) {
    const rows = BACK_BODY[id];
    if (!rows || !L || L.x !== 6 || L.y !== 14 || !L.rows || L.rows.length < 6) return L;
    return Object.assign({}, L, { rows: rows.concat(L.rows.slice(6)) });
  }
  function backBuf(def, id) {
    const pal = Object.assign({}, BASE_PAL, def.pal);
    const H = pal.H || "#4a3a5a", h = pal.h || shade(H, 0.7), Lc = pal.L || mixc(H, "#ffffff", 0.35);
    const W = 24, Hh = 30, b = buf(W, Hh);
    let back = null, front = null; const body = [], top = [];
    (def.layers || []).forEach((L) => {
      if (L === "FACE" || !L || typeof L !== "object") return;
      if (!back && L.x === 4 && L.y === 2) { back = L; return; }
      if (!front && L.y === 1 && (L.x === 5 || L.x === 4) && (L.rows || []).length >= 8) { front = L; return; }
      if ((L.y | 0) >= 13) body.push(backBody(id, L)); else top.push(L);
    });
    /* ① 体（服・脚・持ち物） */
    body.forEach((L) => drawRows(b, L, pal));
    /* ② 頭のかたまり＝前髪の画素＋顔の場所＋後ろ髪の上（y<14） */
    const mask = new Uint8Array(W * Hh);
    const mark = (L, yMax) => (L.rows || []).forEach((r, j) => { const y = (L.y | 0) + j; if (yMax != null && y >= yMax) return; for (let i = 0; i < r.length; i++) { const ch = r[i]; if (ch === "." || ch === " " || !pal[ch]) continue; const x = (L.x | 0) + i; if (x >= 0 && x < W && y >= 0 && y < Hh) mask[y * W + x] = 1; } });
    if (front) mark(front, 13);
    for (let y = 5; y <= 12; y++) for (let x = 7; x <= 16; x++) mask[y * W + x] = 1;
    if (back) mark(back, 14);
    /* ③ 後ろ髪の長いところ（y≥13）：左右のはしからはしまで塗って背中をかくす */
    const hairBody = [];
    if (back) {
      (back.rows || []).forEach((r, j) => {
        const y = (back.y | 0) + j; if (y < 13) return;
        let a = -1, z = -1; for (let i = 0; i < r.length; i++) { if (r[i] !== "." && r[i] !== " ") { if (a < 0) a = i; z = i; } }
        if (a < 0) return;
        const last = j >= back.rows.length - 2;
        for (let i = a; i <= z; i++) { if (last && r[i] === ".") continue; hairBody.push([(back.x | 0) + i, y, last]); }
      });
    }
    /* 頭を塗る：ふち・下は影、上の方につやの帯 */
    let minY = 99, maxY = 0, minX = 99, maxX = 0;
    for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) if (mask[y * W + x]) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); minX = Math.min(minX, x); maxX = Math.max(maxX, x); }
    for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
      if (!mask[y * W + x]) continue;
      const edge = !mask[y * W + x - 1] || !mask[y * W + x + 1] || !(y > 0 && mask[(y - 1) * W + x]);
      let c = H;
      if (edge || y >= maxY - 1) c = h;
      const cx = (minX + maxX) / 2, band = minY + 2;
      if (!edge && (y === band || y === band + 1) && Math.abs(x - cx + 1.5) <= (y === band ? 3 : 2)) c = Lc;
      if (!edge && y > band + 2 && (x - minX) % 4 === 1 && y < maxY - 1) c = mixc(H, h, 0.5);      /* 髪の筋 */
      put(b, x, y, c);
    }
    /* うなじ（首の肌）を少し見せる */
    if (!back || (back.rows || []).length < 12) { put(b, 11, 13, pal.s); put(b, 12, 13, pal.s); }
    /* 背中の髪 */
    hairBody.forEach(([x, y, last]) => { const tex = (x % 3 === 0) ? h : H; put(b, x, y, last ? h : tex); });
    /* ④ 頭の上の小物・ポニーテール */
    top.forEach((L) => drawRows(b, L, pal));
    return { b: mirror(b), pal };
  }
  S.back = function (id) {
    if (backCache[id]) return backCache[id];
    const Px = P(); const def = Px && Px.CHAR_ART && Px.CHAR_ART[id];
    let res;
    try {
      if (!def) throw new Error("noart");
      const src = def.duo ? def.front : def;
      const { b, pal } = backBuf(src, id);
      const ink = pal.K || "#14111c";
      const legY = src.legY || 23;
      const base = b;
      const breath = shiftUp(b, (x, y) => y < legY - 2, 0, 1);
      const aim = shiftUp(b, (x, y) => y < 15 && (x <= 7 || x >= 16), 0, -1);
      const hd = (x) => toCanvas(epx(outline(x, ink)));
      res = { f: [hd(base), hd(breath)], aim: hd(aim), hurt: toCanvas(epx(whiteOf(outline(base, ink)))), w: 48, h: 60, col: pal.H || "#888" };
    } catch (e) {
      /* 設計図が無いときは影絵 */
      const c = mk(48, 60), g = c.getContext("2d"); g.fillStyle = "#2a3048"; g.beginPath(); g.ellipse(24, 16, 10, 11, 0, 0, Math.PI * 2); g.fill(); g.fillRect(14, 24, 20, 30);
      res = { f: [c, c], aim: c, hurt: c, w: 48, h: 60, col: "#888" };
    }
    backCache[id] = res;
    return res;
  };
  /* アリーナの相手（正面の HD ドット） */
  const frontCache = {};
  S.front = function (id) {
    if (frontCache[id]) return frontCache[id];
    let r = null;
    try { const sp = P().charSpriteHD(id); r = { f: [sp.idle[0], sp.idle[1], sp.idle[2]], aim: sp.atk, hurt: sp.hurt, w: sp.w, h: sp.h }; } catch (e) { r = S.back(id); }
    frontCache[id] = r;
    return r;
  };

  /* ══════════ 敵（ホロウ）══════════ */
  const M = { k: "#120c18", d1: "#272c3a", d2: "#3c4357", m1: "#5b6378", m2: "#8790a8", l1: "#b8c0d4", l2: "#e6ebf6", r1: "#ff2f4f", r2: "#ff8fa0", c1: "#43e8ff", c2: "#b9fbff", o1: "#ff9a2e", o2: "#ffd36b", g1: "#3fcf6a", p1: "#a46bff", p2: "#e0c8ff" };
  const PAL_ALL = Object.values(M);
  function pix(w, h, draw, pal) {
    const Px = P();
    if (Px && Px.pixelize) { const r = Px.pixelize(w, h, draw, { thr: 96, pal: pal || PAL_ALL, outline: M.k }); return { b: r.buf, c: r.canvas }; }
    const c = mk(w, h); draw(c.getContext("2d"), w, h); return { b: null, c };
  }
  function lit(b) { return toCanvas(whiteOf(b)); }
  const R = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const E = (g, x, y, rx, ry, c) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); };
  const PL = (g, pts, c) => { g.fillStyle = c; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fill(); };
  const LN = (g, x1, y1, x2, y2, c, w) => { g.strokeStyle = c; g.lineWidth = w || 1; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); };
  /* 種類ごとの描き方（2コマ：k＝0/1 でライト・推進の明滅） */
  const ENEMY_ART = {
    drone(g, k) {
      R(g, 1, 7, 6, 2, M.m1); R(g, 17, 7, 6, 2, M.m1); LN(g, 0, 6 + k, 7, 6 - k, M.l1); LN(g, 17, 6 - k, 24, 6 + k, M.l1);
      E(g, 12, 9, 7, 5.5, M.d2); E(g, 12, 7.5, 6, 3.5, M.m2); E(g, 12, 6.5, 3.5, 1.6, M.l1);
      E(g, 12, 10.2, 2.6, 2.6, M.r1); E(g, 11.3, 9.5, 1, 1, M.r2);
      R(g, 9, 14, 6, 2, M.d2); R(g, 10, 16, 4, 1 + k, k ? M.o2 : M.o1);
    },
    walker(g, k) {
      LN(g, 10, 20, 7, 27, M.d2, 3); LN(g, 7, 27, 9, 33, M.d2, 3); LN(g, 18, 20, 21, 27, M.d2, 3); LN(g, 21, 27, 19, 33, M.d2, 3);
      R(g, 6, 32, 6, 2, M.m1); R(g, 16, 32, 6, 2, M.m1);
      PL(g, [[8, 7], [20, 7], [22, 10], [22, 19], [18, 22], [10, 22], [6, 19], [6, 10]], M.m1);
      PL(g, [[9, 8], [19, 8], [20, 11], [8, 11]], M.m2); R(g, 10, 4, 8, 4, M.d2); R(g, 11, 5, 6, 1, k ? M.c2 : M.c1);
      E(g, 14, 15, 2.6, 2.6, M.r1); E(g, 13.3, 14.3, 1, 1, M.r2);
      R(g, 22, 11, 5, 3, M.d2); R(g, 26, 12, 2, 1, M.o1); R(g, 1, 12, 5, 4, M.d2);
    },
    shielder(g, k) {
      LN(g, 12, 22, 10, 30, M.d2, 3); LN(g, 22, 22, 24, 30, M.d2, 3);
      PL(g, [[11, 4], [23, 4], [25, 9], [9, 9]], M.m1); E(g, 17, 6, 2.4, 2.2, M.r1); E(g, 16.4, 5.4, 0.8, 0.8, M.r2);
      PL(g, [[17, 8], [31, 12], [31, 24], [17, 29], [3, 24], [3, 12]], M.m2);
      PL(g, [[17, 10], [29, 13.5], [29, 23], [17, 27], [5, 23], [5, 13.5]], M.l1);
      LN(g, 17, 11, 17, 26, M.m2, 1); LN(g, 6, 18, 28, 18, M.m2, 1);
      [[8, 14], [26, 14], [8, 22], [26, 22]].forEach((p) => R(g, p[0], p[1], 1, 1, M.d2));
      R(g, 15, 17, 4, 2, k ? M.c2 : M.c1);
    },
    bomber(g, k) {
      for (let a = 0; a < 8; a++) { const t = a * Math.PI / 4; LN(g, 10 + Math.cos(t) * 6, 10 + Math.sin(t) * 6, 10 + Math.cos(t) * 9.5, 10 + Math.sin(t) * 9.5, M.m1, 2); }
      E(g, 10, 10, 7, 7, M.d1); E(g, 10, 9, 5.5, 5, M.d2);
      LN(g, 4, 10, 16, 10, k ? M.o2 : M.o1, 1); LN(g, 10, 4, 10, 16, k ? M.o2 : M.o1, 1);
      E(g, 10, 10, 2.8, 2.8, k ? M.r2 : M.r1);
    },
    sniper(g, k) {
      LN(g, 11, 22, 4, 38, M.d2, 2); LN(g, 11, 22, 18, 38, M.d2, 2); LN(g, 11, 22, 11, 38, M.d2, 2);
      PL(g, [[7, 10], [15, 10], [16, 22], [6, 22]], M.m1); R(g, 8, 11, 6, 3, M.m2);
      LN(g, 12, 13, 21, 2, M.d2, 3); LN(g, 12, 13, 21, 2, M.m1, 1);
      E(g, 11, 17, 2.4, 2.4, M.r1); E(g, 10.4, 16.4, 0.8, 0.8, M.r2);
      E(g, 6, 12, 2, 2, k ? M.r2 : M.r1);
    },
    missiler(g, k) {
      R(g, 3, 20, 26, 5, M.d1); for (let i = 0; i < 6; i++) E(g, 5 + i * 4.4, 22.5, 1.5, 1.5, M.m1);
      PL(g, [[4, 9], [28, 9], [29, 20], [3, 20]], M.m1); R(g, 5, 10, 22, 2, M.m2);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { R(g, 7 + i * 6.5, 12 + j * 3.5, 5, 3, M.d2); R(g, 8 + i * 6.5, 12.5 + j * 3.5, 3, 2, (i + j + k) % 2 ? M.r1 : M.o1); }
      E(g, 16, 6, 2.4, 2.4, M.r1); R(g, 13, 7, 6, 2, M.m1);
    },
    tank(g, k) {
      R(g, 2, 18, 38, 8, M.d1); for (let i = 0; i < 9; i++) E(g, 4.5 + i * 4.1, 22, 1.7, 1.7, k && i % 2 ? M.m2 : M.m1);
      PL(g, [[4, 12], [38, 12], [40, 18], [2, 18]], M.m1); R(g, 6, 13, 30, 2, M.m2);
      PL(g, [[13, 4], [29, 4], [32, 12], [10, 12]], M.m2); R(g, 14, 5, 14, 2, M.l1);
      E(g, 21, 9, 3.2, 3.2, M.d1); E(g, 21, 9, 1.8, 1.8, k ? M.o2 : M.o1);
      E(g, 21, 15.5, 2.2, 2, M.r1);
    },
    /* ★★ 2026-10-31 新しい敵（ご指定「敵の攻撃パターンを増やして」） */
    lancer(g, k) {   /* 突進：細い体に長い槍。k で推進の炎 */
      LN(g, 9, 20, 6, 30, M.d2, 3); LN(g, 15, 20, 18, 30, M.d2, 3); R(g, 4, 29, 5, 2, M.m1); R(g, 16, 29, 5, 2, M.m1);
      PL(g, [[7, 8], [17, 8], [19, 20], [5, 20]], M.m1); PL(g, [[8, 9], [16, 9], [17, 12], [7, 12]], M.m2);
      R(g, 9, 4, 6, 4, M.d2); R(g, 10, 5, 4, 1, k ? M.r2 : M.r1);
      LN(g, 19, 14, 27, 2, M.l1, 2); PL(g, [[26, 0], [28, 4], [24, 3]], M.l2);
      E(g, 12, 15, 2.4, 2.4, M.r1); E(g, 11.4, 14.4, 0.8, 0.8, M.r2);
      R(g, 9, 21, 6, 1 + k, k ? M.o2 : M.o1);
    },
    mortar(g, k) {   /* 曲射：ずんぐりした台座に上向きの砲身 */
      R(g, 3, 22, 30, 6, M.d1); for (let i = 0; i < 6; i++) E(g, 6 + i * 4.8, 25, 1.7, 1.7, M.m1);
      PL(g, [[6, 12], [30, 12], [32, 22], [4, 22]], M.m1); R(g, 8, 13, 20, 2, M.m2);
      PL(g, [[14, 2], [22, 2], [21, 13], [15, 13]], M.d2); R(g, 14, 1, 8, 2, M.l1);
      E(g, 18, 17, 2.6, 2.6, M.r1); E(g, 17.3, 16.3, 0.9, 0.9, M.r2);
      E(g, 9, 17, 1.4, 1.4, k ? M.o2 : M.o1); E(g, 27, 17, 1.4, 1.4, k ? M.o1 : M.o2);
    },
    healer(g, k) {   /* 回復：十字のマークの丸いドローン */
      R(g, 1, 9, 6, 2, M.m1); R(g, 19, 9, 6, 2, M.m1); LN(g, 0, 8 + k, 6, 8 - k, M.l1); LN(g, 20, 8 - k, 26, 8 + k, M.l1);
      E(g, 13, 11, 8, 7, M.l2); E(g, 13, 10, 6.5, 5, M.l1);
      R(g, 11.5, 6.5, 3, 8, M.g1); R(g, 9, 9, 8, 3, M.g1);
      E(g, 13, 16.5, 2.2, 2, M.r1);
      R(g, 10, 18, 6, 1 + k, k ? "#9ff0c8" : M.g1);
    },
    jammer(g, k) {   /* EMP：アンテナと青いコイル */
      LN(g, 9, 22, 6, 30, M.d2, 3); LN(g, 19, 22, 22, 30, M.d2, 3);
      PL(g, [[6, 10], [22, 10], [24, 22], [4, 22]], M.d2); PL(g, [[7, 11], [21, 11], [22, 14], [6, 14]], M.m1);
      LN(g, 14, 10, 14, 2, M.m2, 1.5); E(g, 14, 2, 2, 2, k ? M.c2 : M.c1);
      for (let i = 0; i < 3; i++) R(g, 8 + i * 4.5, 16, 3, 4, (i + k) % 2 ? M.c1 : M.c2);
      E(g, 14, 19, 2, 2, M.r1);
    },
    splitter(g, k) {   /* 分裂：2つの丸がくっついた形 */
      E(g, 9, 13, 7, 7, M.m1); E(g, 21, 13, 7, 7, M.m1); E(g, 9, 12, 5.5, 5, M.m2); E(g, 21, 12, 5.5, 5, M.m2);
      LN(g, 15, 6, 15, 20, k ? M.o2 : M.o1, 1.5);
      E(g, 15, 13, 3, 3, M.r1); E(g, 14.3, 12.3, 1, 1, M.r2);
      LN(g, 6, 20, 4, 26, M.d2, 2); LN(g, 24, 20, 26, 26, M.d2, 2);
    },
    mini(g, k) {
      R(g, 0, 5, 4, 1.5, M.m1); R(g, 12, 5, 4, 1.5, M.m1);
      E(g, 8, 7, 5, 4, M.m2); E(g, 8, 6, 3.6, 2.2, M.l1); E(g, 8, 8, 1.8, 1.8, M.r1);
      R(g, 7, 11, 2, 1 + k, k ? M.o2 : M.o1);
    },
    turret(g, k) {   /* 連射：三連の砲身 */
      R(g, 4, 24, 30, 6, M.d1); R(g, 7, 20, 24, 5, M.m1);
      PL(g, [[9, 9], [29, 9], [31, 20], [7, 20]], M.m2); R(g, 10, 10, 18, 2, M.l1);
      for (let i = 0; i < 3; i++) { R(g, 12 + i * 5, 2, 3, 8, M.d2); R(g, 12 + i * 5, 1, 3, 1, (i + k) % 2 ? M.o2 : M.o1); }
      E(g, 19, 15, 2.6, 2.6, M.r1); E(g, 18.3, 14.3, 0.9, 0.9, M.r2);
    },
  };
  const ENEMY_SIZE = { drone: [24, 18], walker: [28, 35], shielder: [34, 31], bomber: [20, 20], sniper: [22, 40], missiler: [32, 26], tank: [42, 27],
    lancer: [29, 32], mortar: [36, 28], healer: [26, 20], jammer: [28, 31], splitter: [30, 27], mini: [16, 13], turret: [38, 30] };
  S.ENEMY_COLS = { drone: [M.m2, M.l1, M.d2], walker: [M.m1, M.m2, M.d2], shielder: [M.l1, M.m2, M.c1], bomber: [M.d2, M.o1, M.r1], sniper: [M.m1, M.d2, M.r1], missiler: [M.m1, M.r1, M.o1],
    tank: [M.m1, M.m2, M.o1], lancer: [M.m1, M.l1, M.r1], mortar: [M.d2, M.m1, M.r1], healer: [M.l2, M.g1, M.l1], jammer: [M.d2, M.c1, M.c2], splitter: [M.m1, M.m2, M.o1], mini: [M.m2, M.l1, M.r1], turret: [M.m2, M.d2, M.o2] };
  const enCache = {};
  S.enemy = function (k) {
    if (enCache[k]) return enCache[k];
    const [w, h] = ENEMY_SIZE[k] || [24, 24];
    const draw = ENEMY_ART[k] || ENEMY_ART.walker;
    const a = pix(w, h, (g) => draw(g, 0)), b2 = pix(w, h, (g) => draw(g, 1));
    const r = { f: [a.c, b2.c], hit: a.b ? lit(a.b) : a.c, w: a.c.width, h: a.c.height };
    enCache[k] = r;
    return r;
  };
  /* ── ボス（大きめ・2コマ）── */
  const BOSS_ART = {
    golem(g, k) {
      R(g, 22, 50, 10, 18, M.d2); R(g, 44, 50, 10, 18, M.d2); R(g, 20, 66, 14, 5, M.m1); R(g, 42, 66, 14, 5, M.m1);
      PL(g, [[18, 18], [58, 18], [64, 30], [60, 52], [16, 52], [12, 30]], M.m1); PL(g, [[20, 20], [56, 20], [60, 30], [16, 30]], M.m2);
      R(g, 30, 8, 16, 11, M.d2); R(g, 32, 12, 12, 3, k ? M.c2 : M.c1);
      E(g, 38, 36, 6, 6, M.d1); E(g, 38, 36, 4.2, 4.2, M.r1); E(g, 36.8, 34.8, 1.5, 1.5, M.r2);
      PL(g, [[4, 22], [14, 20], [16, 48], [8, 54], [2, 46]], M.m2); R(g, 3, 50, 10, 6, M.d2);
      PL(g, [[72, 22], [62, 20], [60, 48], [68, 54], [74, 46]], M.m2); R(g, 63, 50, 10, 6, M.d2);
      R(g, 64, 24, 8, 3, M.o1); R(g, 4, 24, 8, 3, M.o1);
    },
    kraken(g, k) {
      for (let i = 0; i < 6; i++) { const x = 10 + i * 11, sw = (k ? 2 : -2) * (i % 2 ? 1 : -1); g.strokeStyle = M.m1; g.lineWidth = 4; g.beginPath(); g.moveTo(38, 36); g.quadraticCurveTo(x + sw, 52, x - sw, 70); g.stroke(); E(g, x - sw, 70, 2.2, 2.2, M.r1); }
      E(g, 38, 26, 22, 18, M.d2); E(g, 38, 22, 19, 13, M.m1); E(g, 38, 18, 13, 6, M.m2);
      E(g, 38, 27, 5.5, 5.5, M.d1); E(g, 38, 27, 4, 4, M.r1); E(g, 36.8, 25.8, 1.4, 1.4, M.r2);
      E(g, 26, 26, 2.2, 2.2, k ? M.c2 : M.c1); E(g, 50, 26, 2.2, 2.2, k ? M.c2 : M.c1);
    },
    scorpio(g, k) {
      g.strokeStyle = M.m1; g.lineWidth = 6; g.beginPath(); g.moveTo(38, 40); g.quadraticCurveTo(70, 30, 52, 8); g.quadraticCurveTo(44, 2, 38, 8); g.stroke();
      E(g, 38, 9, 5, 4, M.d2); R(g, 36, 3, 4, 4, k ? M.o2 : M.o1);
      for (let i = 0; i < 3; i++) { LN(g, 26, 46 + i * 5, 8, 54 + i * 6, M.d2, 2.5); LN(g, 50, 46 + i * 5, 68, 54 + i * 6, M.d2, 2.5); }
      E(g, 38, 46, 18, 11, M.m1); E(g, 38, 43, 14, 7, M.m2);
      E(g, 38, 46, 4, 4, M.r1); E(g, 37, 45, 1.3, 1.3, M.r2);
      PL(g, [[18, 40], [4, 30], [8, 40], [2, 46], [14, 48]], M.m2); PL(g, [[58, 40], [72, 30], [68, 40], [74, 46], [62, 48]], M.m2);
    },
    phoenix(g, k) {
      const f = k ? 3 : 0;
      PL(g, [[34, 30], [4, 12 + f], [10, 26], [2, 30 + f], [16, 38], [8, 46], [30, 42]], M.l1);
      PL(g, [[42, 30], [72, 12 + f], [66, 26], [74, 30 + f], [60, 38], [68, 46], [46, 42]], M.l1);
      PL(g, [[34, 30], [10, 18 + f], [18, 30], [30, 38]], M.c2); PL(g, [[42, 30], [66, 18 + f], [58, 30], [46, 38]], M.c2);
      E(g, 38, 36, 9, 13, M.m2); E(g, 38, 20, 6, 6, M.l1); PL(g, [[38, 22], [44, 26], [38, 27]], M.o1);
      E(g, 36, 19, 1.4, 1.4, M.c1); E(g, 38, 36, 3.6, 3.6, M.r1); E(g, 37, 35, 1.2, 1.2, M.r2);
      PL(g, [[32, 48], [38, 64 + f], [44, 48]], M.c1);
    },
    titan(g, k) {
      R(g, 4, 50, 68, 14, M.d1); for (let i = 0; i < 12; i++) E(g, 8 + i * 5.5, 57, 2.2, 2.2, k && i % 2 ? M.m2 : M.m1);
      PL(g, [[8, 28], [68, 28], [72, 50], [4, 50]], M.m1); R(g, 10, 30, 56, 3, M.m2);
      PL(g, [[24, 10], [52, 10], [56, 28], [20, 28]], M.m2); R(g, 26, 12, 24, 3, M.l1); R(g, 30, 18, 16, 3, k ? M.c2 : M.c1);
      R(g, 2, 32, 16, 6, M.d2); R(g, 0, 33, 3, 4, M.o1); R(g, 58, 32, 16, 6, M.d2); R(g, 73, 33, 3, 4, M.o1);
      E(g, 38, 22, 4, 4, M.r1); E(g, 37, 21, 1.3, 1.3, M.r2);
    },
    queen(g, k) {
      g.strokeStyle = k ? M.p2 : M.p1; g.lineWidth = 2; g.beginPath(); g.ellipse(38, 14, 18, 5, 0, 0, Math.PI * 2); g.stroke();
      E(g, 16, 16, 6, 6, M.p1); E(g, 16, 16, 3, 3, M.p2); E(g, 60, 16, 6, 6, M.p1); E(g, 60, 16, 3, 3, M.p2);
      PL(g, [[34, 34], [6, 22], [14, 40], [4, 52], [30, 46]], M.d2); PL(g, [[42, 34], [70, 22], [62, 40], [72, 52], [46, 46]], M.d2);
      PL(g, [[34, 34], [12, 28], [20, 40], [30, 42]], M.p1); PL(g, [[42, 34], [64, 28], [56, 40], [46, 42]], M.p1);
      PL(g, [[30, 26], [46, 26], [50, 60], [26, 60]], M.m1); PL(g, [[32, 28], [44, 28], [46, 44], [30, 44]], M.m2);
      E(g, 38, 22, 6, 6, M.l1); R(g, 34, 21, 8, 2, M.r1);
      E(g, 38, 36, 3.6, 3.6, M.r1); E(g, 37, 35, 1.2, 1.2, M.r2);
      PL(g, [[26, 60], [38, 72], [50, 60]], M.d2);
    },
  };
  const bossCache = {};
  S.boss = function (k) {
    if (bossCache[k]) return bossCache[k];
    const draw = BOSS_ART[k] || BOSS_ART.golem;
    const a = pix(76, 74, (g) => draw(g, 0)), b2 = pix(76, 74, (g) => draw(g, 1));
    const r = { f: [a.c, b2.c], hit: a.b ? lit(a.b) : a.c, w: a.c.width, h: a.c.height };
    bossCache[k] = r;
    return r;
  };

  /* ── 遮蔽物（後ろから見た形・手前に置く）。st＝0 きれい／1 ひび／2 ぼろぼろ／3 こわれた ── */
  const covCache = {};
  S.cover = function (st, front) {
    const key = st + (front ? "f" : "");
    if (covCache[key]) return covCache[key];
    /* 44×30：コンクリートの壁（上に鉄の縁）＋足もとに土のう。st で ひび → 欠け → がれき */
    const r = pix(44, 30, (g) => {
      if (st >= 3) { [[5, 25], [13, 27], [22, 26], [31, 27], [39, 25], [18, 22], [28, 22]].forEach((p, i) => E(g, p[0], p[1], 4 + (i % 2), 2.8, i % 2 ? M.m1 : M.d2)); return; }
      const wall = front ? M.m2 : M.m1, dark = front ? M.m1 : M.d2, edge = front ? M.l1 : M.m2;
      PL(g, [[3, 5], [7, 1], [37, 1], [41, 5], [41, 24], [3, 24]], wall);
      R(g, 5, 3, 34, 2, edge);
      for (let y = 8; y < 23; y += 5) for (let x = 5 + ((y / 5) % 2) * 4; x < 38; x += 9) R(g, x, y, 7, 1, dark);
      R(g, 19, 7, 6, 14, M.o1); R(g, 19, 10, 6, 2, M.d1); R(g, 19, 15, 6, 2, M.d1);
      /* 土のう */
      for (let i = 0; i < 6; i++) E(g, 4 + i * 7.2, 26.5, 4, 2.6, i % 2 ? "#8a7a5a" : "#6e6046");
      if (st >= 1) { LN(g, 11, 2, 15, 12, M.d1, 1); LN(g, 15, 12, 12, 22, M.d1, 1); LN(g, 31, 6, 34, 14, M.d1, 1); }
      if (st >= 2) { LN(g, 28, 2, 25, 11, M.d1, 1); LN(g, 25, 11, 30, 21, M.d1, 1); g.clearRect(33, 0, 11, 8); g.clearRect(0, 0, 7, 6); g.clearRect(14, 0, 6, 3); }
    });
    covCache[key] = r.c;
    return r.c;
  };

  /* ── 弾・ミサイル・爆発のコマ ── */
  const fxCache = {};
  S.missile = function () {
    if (fxCache.missile) return fxCache.missile;
    const r = pix(10, 16, (g) => { R(g, 3, 2, 4, 10, M.l1); PL(g, [[3, 2], [5, 0], [7, 2]], M.r1); R(g, 2, 10, 6, 3, M.m1); R(g, 4, 13, 2, 3, M.o2); });
    fxCache.missile = r.c; return r.c;
  };
  S.boom = function (n) {
    const k = "boom" + n; if (fxCache[k]) return fxCache[k];
    const r = pix(32, 32, (g) => {
      const t = n / 5;
      E(g, 16, 16, 4 + 11 * t, 4 + 11 * t, t < 0.5 ? M.o2 : M.o1);
      if (t < 0.8) E(g, 16, 16, 2 + 7 * t, 2 + 7 * t, t < 0.4 ? "#ffffff" : M.o2);
      if (t > 0.4) for (let i = 0; i < 6; i++) { const a = i * 1.05 + n; E(g, 16 + Math.cos(a) * 11 * t, 16 + Math.sin(a) * 11 * t, 2.6, 2.6, M.m1); }
    }, [M.o1, M.o2, "#ffffff", M.m1, M.d2, M.r1]);
    fxCache[k] = r.c; return r.c;
  };

  /* ══════════ 背景（章ごと・ドット）══════════
     w×h の低い解像度で描いて、描画側が拡大する（なめらかにしない）。hz＝地平線の高さ（0〜1） */
  const BG_THEME = {
    ruins:  { sky: ["#141c3a", "#3b4f8a", "#9fb8e8"], far: "#2a3560", mid: "#1d2647", gnd: ["#3a3f52", "#22263a"], acc: "#ffd36b", fog: "rgba(170,190,255,.18)" },
    harbor: { sky: ["#2a1840", "#a8506a", "#ffb37a"], far: "#4a2a4a", mid: "#2a1a33", gnd: ["#3c3350", "#211b30"], acc: "#ffcf8a", fog: "rgba(255,170,140,.16)", sea: "#5a3a6a" },
    desert: { sky: ["#3a2a1a", "#c88a4a", "#ffe0a0"], far: "#9a6a3a", mid: "#7a4e2a", gnd: ["#c49a62", "#8a6438"], acc: "#fff2c0", fog: "rgba(255,220,160,.20)" },
    snow:   { sky: ["#0c1430", "#2a4a7a", "#8fb8e0"], far: "#cfe0f4", mid: "#9ab8d8", gnd: ["#e8f2ff", "#a8c0dc"], acc: "#ffffff", fog: "rgba(220,235,255,.22)" },
    fort:   { sky: ["#1a0e14", "#5a2a2a", "#c8604a"], far: "#3a2026", mid: "#2a171c", gnd: ["#4a3a3a", "#261c1e"], acc: "#ff9a5a", fog: "rgba(255,140,110,.15)" },
    void:   { sky: ["#07031a", "#2a1258", "#7a3ac8"], far: "#3a1a6a", mid: "#22104a", gnd: ["#2a2050", "#120c2a"], acc: "#e0c8ff", fog: "rgba(200,160,255,.18)" },
  };
  S.bg = function (key, w, h, hz) {
    const T = BG_THEME[key] || BG_THEME.ruins;
    const c = mk(w, h), g = c.getContext("2d");
    const hy = Math.round(h * hz);
    const rnd = (MB3.D && MB3.D.rng) ? MB3.D.rng("bg:" + key) : Math.random;
    /* 空 */
    const sg = g.createLinearGradient(0, 0, 0, hy);
    sg.addColorStop(0, T.sky[0]); sg.addColorStop(0.6, T.sky[1]); sg.addColorStop(1, T.sky[2]);
    g.fillStyle = sg; g.fillRect(0, 0, w, hy + 1);
    /* 星・雲 */
    if (key === "void" || key === "snow" || key === "ruins") for (let i = 0; i < w * 0.5; i++) { g.fillStyle = "rgba(255,255,255," + (0.3 + rnd() * 0.6).toFixed(2) + ")"; g.fillRect(Math.floor(rnd() * w), Math.floor(rnd() * hy * 0.7), 1, 1); }
    if (key === "harbor" || key === "desert" || key === "fort") { g.fillStyle = T.acc; g.globalAlpha = 0.9; g.beginPath(); g.arc(w * 0.72, hy * 0.62, Math.max(4, w * 0.05), 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; }
    if (key === "void") { g.strokeStyle = "rgba(224,200,255,.5)"; g.beginPath(); g.ellipse(w * 0.5, hy * 0.35, w * 0.18, w * 0.045, 0, 0, Math.PI * 2); g.stroke(); }
    for (let i = 0; i < 5; i++) { g.fillStyle = "rgba(255,255,255,.08)"; const cx = rnd() * w, cy = rnd() * hy * 0.6; g.fillRect(Math.floor(cx), Math.floor(cy), Math.floor(10 + rnd() * 24), 2); }
    /* 遠景（シルエット） */
    const sil = (col, base, hmax, wmin, wmax, jag) => {
      g.fillStyle = col; let x = -2;
      while (x < w) {
        const bw = Math.floor(wmin + rnd() * (wmax - wmin)), bh = Math.floor(hmax * (0.35 + rnd() * 0.65));
        if (key === "desert") { g.beginPath(); g.moveTo(x, base); g.quadraticCurveTo(x + bw / 2, base - bh, x + bw * 1.3, base); g.fill(); }
        else if (key === "snow") { g.beginPath(); g.moveTo(x, base); g.lineTo(x + bw / 2, base - bh); g.lineTo(x + bw, base); g.fill(); g.fillStyle = "rgba(255,255,255,.7)"; g.beginPath(); g.moveTo(x + bw / 2 - 3, base - bh + 5); g.lineTo(x + bw / 2, base - bh); g.lineTo(x + bw / 2 + 3, base - bh + 5); g.fill(); g.fillStyle = col; }
        else {
          /* 上が欠けたビル（くずれた形）は、低い四角＋高い四角の2つで描く（空を消すと穴があく） */
          if (jag && rnd() < 0.6) { const cut = Math.floor(bh * 0.22); g.fillRect(x, base - bh + cut, bw, bh - cut + 1); g.fillRect(x, base - bh, Math.ceil(bw * 0.6), cut); }
          else g.fillRect(x, base - bh, bw, bh + 1);
          if (key !== "void") { g.fillStyle = "rgba(255,220,140,.35)"; for (let yy = base - bh + 3; yy < base - 2; yy += 4) for (let xx = x + 2; xx < x + bw - 2; xx += 3) if (rnd() < 0.25) g.fillRect(xx, yy, 1, 1); g.fillStyle = col; }
          else if (rnd() < 0.5) { g.fillStyle = "rgba(224,200,255,.45)"; g.fillRect(x + Math.floor(bw / 2), base - bh - 3, 1, 3); g.fillStyle = col; }
        }
        x += bw + Math.floor(rnd() * 3);
      }
    };
    sil(T.far, hy + 1, hy * 0.5, w * 0.04, w * 0.1, true);
    if (T.sea) { g.fillStyle = T.sea; g.fillRect(0, hy - 2, w, 3); }
    sil(T.mid, hy + 1, hy * 0.28, w * 0.06, w * 0.14, key === "ruins" || key === "fort");
    /* 地面（遠近のある床） */
    const gg = g.createLinearGradient(0, hy, 0, h);
    gg.addColorStop(0, T.gnd[0]); gg.addColorStop(1, T.gnd[1]);
    g.fillStyle = gg; g.fillRect(0, hy, w, h - hy);
    g.fillStyle = T.fog; g.fillRect(0, hy - 2, w, Math.max(3, Math.round(h * 0.03)));
    /* 床の線（手前ほど間隔が広い） */
    g.strokeStyle = "rgba(255,255,255,.07)"; g.lineWidth = 1;
    for (let i = 1; i < 9; i++) { const t = i / 9, y = hy + (h - hy) * Math.pow(t, 1.8); g.beginPath(); g.moveTo(0, Math.round(y) + 0.5); g.lineTo(w, Math.round(y) + 0.5); g.stroke(); }
    for (let i = -6; i <= 6; i++) { g.beginPath(); g.moveTo(w / 2 + i * w * 0.02, hy); g.lineTo(w / 2 + i * w * 0.17, h); g.stroke(); }
    /* がれき・小物 */
    for (let i = 0; i < 18; i++) {
      const t = rnd(), y = hy + (h - hy) * (0.08 + t * 0.6), sc = 0.4 + t * 1.2, x = rnd() * w;
      g.fillStyle = key === "snow" ? "rgba(255,255,255,.55)" : "rgba(0,0,0,.25)";
      g.fillRect(Math.floor(x), Math.floor(y), Math.ceil(3 * sc), Math.ceil(1.4 * sc));
    }
    return c;
  };
  S.THEME = BG_THEME;
  S.M = M;
})();
