/* ============================================================
   MagiAbyss — ma-art.js
   敵・ボス・ギミック・小物・地形・アイコンのドット絵（すべてここで描く）
   ・pixelize（ベクターで小さく描く → 減色 → 輪郭）で作る。
   ・名前（art キー）で引けるので、正式な素材に差しかえるときは
     MA.Art.sprite(key) が返す { frames:[canvas…], w, h } を画像に変えればよい。
   ============================================================ */
(function () {
  "use strict";
  const MA = (window.MA = window.MA || {});
  const P = MA.Pix;
  const TAU = Math.PI * 2;

  /* ── 描きやすい道具 ── */
  function ell(g, x, y, rx, ry, c) { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, TAU); g.fill(); }
  function circ(g, x, y, r, c) { ell(g, x, y, r, r, c); }
  function rect(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }
  function poly(g, pts, c) { g.fillStyle = c; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fill(); }
  function line(g, x1, y1, x2, y2, w, c) { g.strokeStyle = c; g.lineWidth = w; g.lineCap = "round"; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
  function px(g, x, y, c) { g.fillStyle = c; g.fillRect(x, y, 1, 1); }
  /* 決まった乱数（地形のゆらぎ用） */
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }

  /* 1枚の絵 → 2コマ（ゆれ） */
  function bob(buf, h) { return P.shiftWhere(buf, (x, y) => y < h - 2, 0, 1); }
  function make(w, h, draw, pal, outline, anim) {
    const r = P.pixelize(w, h, draw, { pal, outline: outline || "#120a18" });
    const frames = [r.canvas];
    if (anim !== false) frames.push(P.bufToCanvas(anim ? anim(r.buf) : bob(r.buf, h)));
    return { frames, w: w, h: h, white: frames.map((f) => P.bufToCanvas(P.whiteOf(bufOf(f)))) };
  }
  function bufOf(c) { const g = c.getContext("2d"); return { w: c.width, h: c.height, d: g.getImageData(0, 0, c.width, c.height).data }; }

  /* ══════════════════════════════════════════════════════════════
     敵
     ══════════════════════════════════════════════════════════════ */
  const ART = {};
  function slime(col) {
    const d = P.shade(col, 0.6), l = P.mix(col, "#ffffff", 0.5);
    return make(16, 13, (g) => {
      ell(g, 8, 8, 7, 5, col); ell(g, 8, 9.5, 7, 3.4, d); ell(g, 8, 7.5, 6, 4.2, col);
      ell(g, 5.5, 5.5, 2, 1.3, l);
      rect(g, 5, 7, 2, 2, "#ffffff"); rect(g, 9, 7, 2, 2, "#ffffff"); px(g, 6, 8, "#1a1020"); px(g, 10, 8, "#1a1020");
    }, [col, d, l, "#ffffff", "#1a1020"], null, (b) => P.shiftWhere(b, (x, y) => y < 6, 0, 1));
  }
  ART.slime = (col) => slime(col || "#5fd86a");
  ART.treant = () => make(20, 22, (g) => {
    rect(g, 7, 9, 6, 11, "#6b4a2a"); rect(g, 7, 9, 2, 11, "#4a321c");
    line(g, 7, 13, 2, 16, 2, "#6b4a2a"); line(g, 13, 13, 18, 16, 2, "#6b4a2a");
    rect(g, 6, 19, 3, 2, "#4a321c"); rect(g, 11, 19, 3, 2, "#4a321c");
    circ(g, 10, 6, 6, "#3f8a34"); circ(g, 6, 7, 4, "#3f8a34"); circ(g, 14, 7, 4, "#3f8a34"); circ(g, 9, 4, 3, "#66b04a");
    px(g, 8, 12, "#ffe06a"); px(g, 11, 12, "#ffe06a"); rect(g, 9, 15, 2, 1, "#2a1a0e");
  }, ["#6b4a2a", "#4a321c", "#3f8a34", "#66b04a", "#ffe06a", "#2a1a0e"]);
  ART.goblin = () => make(14, 16, (g) => {
    ell(g, 7, 6, 4.5, 4, "#7fb848"); poly(g, [[2, 5], [0, 3], [3, 6]], "#7fb848"); poly(g, [[12, 5], [14, 3], [11, 6]], "#7fb848");
    rect(g, 5, 5, 1, 2, "#ff3a2a"); rect(g, 8, 5, 1, 2, "#ff3a2a"); rect(g, 6, 8, 3, 1, "#3a2010");
    rect(g, 4, 10, 6, 4, "#8a5a2a"); rect(g, 4, 14, 2, 2, "#5a3a1a"); rect(g, 8, 14, 2, 2, "#5a3a1a");
    line(g, 11, 9, 13, 14, 2, "#a07040");
  }, ["#7fb848", "#ff3a2a", "#3a2010", "#8a5a2a", "#5a3a1a", "#a07040"]);
  ART.goblinArcher = () => make(14, 16, (g) => {
    ell(g, 7, 6, 4.5, 4, "#9cc85a"); poly(g, [[2, 5], [0, 3], [3, 6]], "#9cc85a"); poly(g, [[12, 5], [14, 3], [11, 6]], "#9cc85a");
    rect(g, 5, 5, 1, 2, "#ffd03a"); rect(g, 8, 5, 1, 2, "#ffd03a");
    rect(g, 4, 10, 6, 4, "#3a6a3a"); rect(g, 4, 14, 2, 2, "#2a3a1a"); rect(g, 8, 14, 2, 2, "#2a3a1a");
    g.strokeStyle = "#c8a060"; g.lineWidth = 1.2; g.beginPath(); g.arc(11, 11, 4, -1.2, 1.2); g.stroke();
  }, ["#9cc85a", "#ffd03a", "#3a6a3a", "#2a3a1a", "#c8a060"]);
  ART.mossGiant = () => make(28, 28, (g) => {
    ell(g, 14, 16, 11, 10, "#6a6a58"); ell(g, 14, 14, 10, 8, "#7a7a66");
    ell(g, 9, 9, 5, 3, "#4f8a30"); ell(g, 18, 8, 6, 3, "#4f8a30"); ell(g, 14, 6, 4, 2, "#6fb04a");
    rect(g, 2, 15, 5, 9, "#6a6a58"); rect(g, 21, 15, 5, 9, "#6a6a58");
    rect(g, 9, 13, 3, 2, "#ffe06a"); rect(g, 16, 13, 3, 2, "#ffe06a"); rect(g, 11, 19, 6, 2, "#3a3a2e");
    rect(g, 7, 25, 5, 3, "#4a4a3e"); rect(g, 16, 25, 5, 3, "#4a4a3e");
  }, ["#6a6a58", "#7a7a66", "#4f8a30", "#6fb04a", "#ffe06a", "#3a3a2e", "#4a4a3e"]);
  ART.wolf = (col) => {
    col = col || "#cfe6ff"; const d = P.shade(col, 0.7);
    return make(20, 14, (g) => {
      ell(g, 9, 8, 6, 3.5, col); circ(g, 15, 6, 3.4, col); poly(g, [[14, 3], [15, 0], [16, 3]], col); poly(g, [[16, 3], [18, 1], [17, 4]], col);
      poly(g, [[17, 6], [20, 7], [17, 8]], col); poly(g, [[3, 7], [0, 4], [2, 8]], col);
      rect(g, 4, 10, 2, 4, d); rect(g, 8, 10, 2, 4, d); rect(g, 11, 10, 2, 4, d); rect(g, 13, 10, 2, 4, d);
      px(g, 16, 5, "#2a6aff"); px(g, 19, 7, "#1a1020");
    }, [col, d, "#2a6aff", "#1a1020"], null, (b) => P.shiftWhere(b, (x, y) => y >= 10 && x % 4 < 2, 0, -1));
  };
  ART.golem = () => make(22, 24, (g) => {
    poly(g, [[4, 6], [11, 1], [18, 6], [19, 16], [11, 20], [3, 16]], "#6fb8ef"); poly(g, [[11, 1], [18, 6], [11, 9]], "#b8e6ff");
    rect(g, 0, 8, 4, 8, "#4f90cf"); rect(g, 18, 8, 4, 8, "#4f90cf");
    rect(g, 5, 19, 4, 5, "#4f90cf"); rect(g, 13, 19, 4, 5, "#4f90cf");
    rect(g, 8, 9, 2, 2, "#ffffff"); rect(g, 12, 9, 2, 2, "#ffffff"); rect(g, 10, 13, 2, 3, "#2a5a9f");
  }, ["#6fb8ef", "#b8e6ff", "#4f90cf", "#ffffff", "#2a5a9f"]);
  ART.wisp = () => make(14, 14, (g) => {
    poly(g, [[3, 9], [7, 0], [11, 9]], "#bff0ff"); circ(g, 7, 9, 4, "#bff0ff"); circ(g, 7, 9, 2.6, "#ffffff");
    px(g, 6, 9, "#2a6aff"); px(g, 8, 9, "#2a6aff");
  }, ["#bff0ff", "#ffffff", "#2a6aff"], null, (b) => P.shiftWhere(b, (x, y) => y < 6, x0(1), 0));
  function x0(v) { return v; }
  ART.hound = () => make(20, 14, (g) => {
    ell(g, 9, 8, 6.5, 3.5, "#d8452a"); circ(g, 15, 6, 3.4, "#d8452a");
    poly(g, [[5, 5], [7, 1], [9, 5]], "#ffb03a"); poly(g, [[9, 5], [11, 0], [13, 5]], "#ffd86a"); poly(g, [[2, 7], [0, 3], [4, 6]], "#ffb03a");
    rect(g, 4, 10, 2, 4, "#8a2a1a"); rect(g, 8, 10, 2, 4, "#8a2a1a"); rect(g, 11, 10, 2, 4, "#8a2a1a"); rect(g, 14, 10, 2, 4, "#8a2a1a");
    px(g, 16, 5, "#ffe86a"); px(g, 18, 7, "#1a1020");
  }, ["#d8452a", "#ffb03a", "#ffd86a", "#8a2a1a", "#ffe86a", "#1a1020"], null, (b) => P.shiftWhere(b, (x, y) => y >= 10 && x % 4 < 2, 0, -1));
  ART.soldier = () => make(16, 22, (g) => {
    rect(g, 4, 6, 8, 9, "#5a3a32"); rect(g, 5, 7, 6, 7, "#c84a2a"); circ(g, 8, 4, 3.5, "#3a2a2a");
    rect(g, 6, 3, 1, 2, "#ffb03a"); rect(g, 9, 3, 1, 2, "#ffb03a");
    rect(g, 5, 15, 2, 6, "#3a2a2a"); rect(g, 9, 15, 2, 6, "#3a2a2a");
    rect(g, 0, 7, 4, 8, "#7a5a40"); rect(g, 1, 8, 2, 6, "#ff7a2a");
    line(g, 13, 1, 14, 18, 1.4, "#c8b090");
  }, ["#5a3a32", "#c84a2a", "#3a2a2a", "#ffb03a", "#7a5a40", "#ff7a2a", "#c8b090"]);
  ART.imp = () => make(14, 14, (g) => {
    poly(g, [[0, 4], [5, 6], [3, 9]], "#ff8a2a"); poly(g, [[14, 4], [9, 6], [11, 9]], "#ff8a2a");
    circ(g, 7, 7, 4, "#ffb03a"); poly(g, [[4, 4], [5, 0], [6, 4]], "#ff6a2a"); poly(g, [[8, 4], [9, 0], [10, 4]], "#ff6a2a");
    px(g, 6, 7, "#1a1020"); px(g, 8, 7, "#1a1020"); rect(g, 6, 11, 3, 3, "#ff6a2a");
  }, ["#ff8a2a", "#ffb03a", "#ff6a2a", "#1a1020"], null, (b) => P.shiftWhere(b, (x, y) => (x < 4 || x > 9) && y < 10, 0, 1));
  ART.ember = () => make(8, 8, (g) => { circ(g, 4, 4.5, 3, "#ffb03a"); circ(g, 4, 4.5, 1.6, "#fff0a0"); poly(g, [[3, 2], [4, 0], [5, 2]], "#ff6a2a"); }, ["#ffb03a", "#fff0a0", "#ff6a2a"]);
  function knight(col, dark, eye) {
    return make(18, 24, (g) => {
      rect(g, 5, 7, 8, 9, dark); rect(g, 6, 8, 6, 7, col); circ(g, 9, 5, 4, dark); rect(g, 6, 4, 6, 2, "#0a0810");
      rect(g, 7, 4, 1, 1, eye); rect(g, 10, 4, 1, 1, eye);
      rect(g, 5, 16, 3, 7, dark); rect(g, 10, 16, 3, 7, dark);
      rect(g, 0, 8, 5, 9, col); rect(g, 1, 9, 3, 7, dark);
      line(g, 15, 2, 16, 20, 1.6, "#d8dde6"); rect(g, 13, 13, 5, 1, "#8a7a5a");
    }, [col, dark, eye, "#0a0810", "#d8dde6", "#8a7a5a"]);
  }
  ART.knight = (col) => {
    if (col === "#3a2a5a") return knight("#4a3a7a", "#1e1630", "#c070ff");
    if (col === "#ffe86a") return knight("#d8c060", "#6a5a2a", "#ffffff");
    return knight("#c8402a", "#4a1a14", "#ffd86a");
  };
  ART.puppet = () => make(14, 20, (g) => {
    circ(g, 7, 4, 3.5, "#d8c49a"); rect(g, 4, 8, 6, 7, "#8a6a4a"); rect(g, 5, 9, 4, 5, "#a0805a");
    line(g, 4, 9, 1, 14, 1.4, "#d8c49a"); line(g, 10, 9, 13, 14, 1.4, "#d8c49a");
    rect(g, 5, 15, 1, 5, "#d8c49a"); rect(g, 8, 15, 1, 5, "#d8c49a");
    px(g, 6, 4, "#3aa0ff"); px(g, 8, 4, "#3aa0ff"); line(g, 7, 0, 7, -2, 1, "#ffffff");
  }, ["#d8c49a", "#8a6a4a", "#a0805a", "#3aa0ff", "#ffffff"]);
  ART.mage = () => make(16, 22, (g) => {
    poly(g, [[8, 0], [13, 8], [3, 8]], "#6a3aa0"); poly(g, [[3, 8], [13, 8], [15, 21], [1, 21]], "#8a5ac8");
    poly(g, [[5, 9], [11, 9], [10, 20], [6, 20]], "#6a3aa0"); circ(g, 8, 8, 2.6, "#1a1020");
    px(g, 7, 8, "#ff70ff"); px(g, 9, 8, "#ff70ff"); circ(g, 14, 12, 1.6, "#ffd0ff");
  }, ["#6a3aa0", "#8a5ac8", "#1a1020", "#ff70ff", "#ffd0ff"]);
  ART.tome = () => make(14, 12, (g) => {
    poly(g, [[1, 3], [7, 5], [7, 11], [1, 9]], "#a07a4a"); poly(g, [[13, 3], [7, 5], [7, 11], [13, 9]], "#c8985a");
    poly(g, [[2, 3.5], [7, 5.4], [7, 6.4], [2, 4.6]], "#f0e8d0"); poly(g, [[12, 3.5], [7, 5.4], [7, 6.4], [12, 4.6]], "#f0e8d0");
    px(g, 4, 7, "#ffe86a"); px(g, 10, 7, "#ffe86a");
  }, ["#a07a4a", "#c8985a", "#f0e8d0", "#ffe86a"], null, (b) => P.shiftWhere(b, (x, y) => x < 3 || x > 10, 0, -2));
  ART.bookGolem = () => make(26, 28, (g) => {
    const cols = ["#a0402a", "#3a6a9a", "#4a8a4a", "#c8985a", "#7a4aa0"];
    for (let i = 0; i < 6; i++) rect(g, 5 + (i % 2), 6 + i * 3, 16, 3, cols[i % 5]);
    rect(g, 7, 2, 12, 5, "#c8985a"); rect(g, 9, 3, 2, 2, "#ffe86a"); rect(g, 15, 3, 2, 2, "#ffe86a");
    rect(g, 0, 8, 5, 10, "#3a6a9a"); rect(g, 21, 8, 5, 10, "#a0402a"); rect(g, 7, 24, 4, 4, "#5a3a2a"); rect(g, 15, 24, 4, 4, "#5a3a2a");
  }, ["#a0402a", "#3a6a9a", "#4a8a4a", "#c8985a", "#7a4aa0", "#ffe86a", "#5a3a2a"]);
  ART.shade = () => make(10, 10, (g) => {
    ell(g, 5, 6, 4.5, 3.5, "#4a2a7a"); poly(g, [[1, 6], [3, 1], [5, 5]], "#4a2a7a"); poly(g, [[5, 5], [7, 1], [9, 6]], "#4a2a7a");
    px(g, 3, 6, "#ff70ff"); px(g, 6, 6, "#ff70ff");
  }, ["#4a2a7a", "#ff70ff"]);
  ART.eye = () => make(16, 16, (g) => {
    for (let i = 0; i < 4; i++) line(g, 4 + i * 2.5, 11, 3 + i * 3, 15.5, 1.2, "#6a3aa0");
    circ(g, 8, 7, 6, "#e8e0f0"); circ(g, 8, 7, 3.4, "#a874ff"); circ(g, 8, 7, 1.6, "#1a0820"); px(g, 9, 5, "#ffffff");
  }, ["#6a3aa0", "#e8e0f0", "#a874ff", "#1a0820", "#ffffff"], null, (b) => P.shiftWhere(b, (x, y) => y > 11, 1, 0));
  ART.reaper = () => make(26, 28, (g) => {
    poly(g, [[13, 2], [20, 10], [21, 27], [5, 27], [6, 10]], "#2a1a40"); circ(g, 13, 7, 4.5, "#1a1028");
    px(g, 11, 7, "#ff3a5a"); px(g, 15, 7, "#ff3a5a");
    line(g, 22, 3, 22, 27, 1.6, "#5a4a6a"); g.strokeStyle = "#c8c8e0"; g.lineWidth = 2; g.beginPath(); g.arc(17, 4, 6, -0.3, 1.6, true); g.stroke();
  }, ["#2a1a40", "#1a1028", "#ff3a5a", "#5a4a6a", "#c8c8e0"]);
  ART.star = () => make(14, 14, (g) => {
    const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 2.8 : 6.4; pts.push([7 + Math.cos(a) * r, 7 + Math.sin(a) * r]); }
    poly(g, pts, "#fff4b0"); circ(g, 7, 7, 2.4, "#ffffff"); px(g, 6, 7, "#4a3aa0"); px(g, 8, 7, "#4a3aa0");
  }, ["#fff4b0", "#ffffff", "#4a3aa0"]);
  ART.guardian = () => make(22, 26, (g) => {
    rect(g, 5, 4, 12, 16, "#b8b0d8"); rect(g, 6, 5, 10, 14, "#d8d0ff"); circ(g, 11, 11, 3, "#7a6aff"); circ(g, 11, 11, 1.5, "#ffffff");
    rect(g, 0, 6, 5, 10, "#9890c0"); rect(g, 17, 6, 5, 10, "#9890c0"); rect(g, 6, 20, 4, 6, "#9890c0"); rect(g, 12, 20, 4, 6, "#9890c0");
    rect(g, 7, 1, 8, 3, "#9890c0"); px(g, 9, 2, "#ffe86a"); px(g, 12, 2, "#ffe86a");
  }, ["#b8b0d8", "#d8d0ff", "#7a6aff", "#ffffff", "#9890c0", "#ffe86a"]);
  ART.dust = () => make(8, 8, (g) => { poly(g, [[4, 0], [5, 3], [8, 4], [5, 5], [4, 8], [3, 5], [0, 4], [3, 3]], "#ffe86a"); px(g, 4, 4, "#ffffff"); }, ["#ffe86a", "#ffffff"]);

  /* ══════════════════════════════════════════════════════════════
     ボス
     ══════════════════════════════════════════════════════════════ */
  ART.bTree = () => make(64, 64, (g) => {
    rect(g, 24, 26, 16, 32, "#6b4a2a"); rect(g, 24, 26, 5, 32, "#4a321c");
    line(g, 24, 34, 6, 22, 5, "#6b4a2a"); line(g, 40, 34, 58, 22, 5, "#6b4a2a"); line(g, 8, 22, 2, 30, 3, "#6b4a2a"); line(g, 56, 22, 62, 30, 3, "#6b4a2a");
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; circ(g, 32 + Math.cos(a) * 16, 18 + Math.sin(a) * 9, 10, i % 2 ? "#3f8a34" : "#2f6a28"); }
    circ(g, 32, 16, 12, "#4fa040"); circ(g, 27, 10, 5, "#7fd060");
    rect(g, 27, 36, 4, 3, "#ffe06a"); rect(g, 34, 36, 4, 3, "#ffe06a"); rect(g, 28, 44, 9, 3, "#2a1a0e");
    for (let i = 0; i < 5; i++) rect(g, 20 + i * 6, 56, 4, 8, "#4a321c");
  }, ["#6b4a2a", "#4a321c", "#3f8a34", "#2f6a28", "#4fa040", "#7fd060", "#ffe06a", "#2a1a0e"]);
  ART.bQueen = () => make(46, 58, (g) => {
    poly(g, [[23, 18], [40, 56], [6, 56]], "#7fc8ff"); poly(g, [[23, 18], [33, 56], [13, 56]], "#bfe8ff");
    rect(g, 17, 16, 12, 12, "#9ad8ff"); circ(g, 23, 11, 6, "#f0f6ff"); ell(g, 23, 8, 8, 4, "#e8f6ff");
    rect(g, 20, 11, 2, 2, "#2a6aff"); rect(g, 25, 11, 2, 2, "#2a6aff");
    poly(g, [[15, 4], [18, 0], [20, 5], [23, -1], [26, 5], [28, 0], [31, 4]], "#ffffff");
    line(g, 17, 20, 8, 30, 2, "#9ad8ff"); line(g, 29, 20, 38, 30, 2, "#9ad8ff");
    poly(g, [[38, 28], [44, 22], [42, 32]], "#ffffff"); poly(g, [[8, 28], [2, 22], [4, 32]], "#ffffff");
  }, ["#7fc8ff", "#bfe8ff", "#9ad8ff", "#f0f6ff", "#e8f6ff", "#2a6aff", "#ffffff"]);
  ART.bTitan = () => make(66, 64, (g) => {
    ell(g, 33, 34, 22, 20, "#4a2a22"); ell(g, 33, 30, 19, 15, "#6a3a2a");
    circ(g, 33, 12, 10, "#5a3226"); rect(g, 27, 10, 4, 3, "#ffb03a"); rect(g, 35, 10, 4, 3, "#ffb03a");
    rect(g, 2, 24, 12, 22, "#5a3226"); rect(g, 52, 24, 12, 22, "#5a3226"); rect(g, 0, 44, 16, 8, "#4a2a22"); rect(g, 50, 44, 16, 8, "#4a2a22");
    rect(g, 18, 52, 10, 12, "#4a2a22"); rect(g, 38, 52, 10, 12, "#4a2a22");
    line(g, 24, 24, 30, 36, 2, "#ff7a2a"); line(g, 40, 22, 36, 38, 2, "#ff7a2a"); line(g, 28, 40, 40, 46, 2, "#ffd86a"); line(g, 6, 28, 10, 40, 1.5, "#ff7a2a");
  }, ["#4a2a22", "#6a3a2a", "#5a3226", "#ffb03a", "#ff7a2a", "#ffd86a"]);
  ART.bLibrarian = () => make(48, 58, (g) => {
    poly(g, [[24, 14], [40, 54], [8, 54]], "#5a3a7a"); poly(g, [[24, 14], [32, 54], [16, 54]], "#7a5aa0");
    circ(g, 24, 11, 6, "#f0d8c0"); poly(g, [[16, 10], [24, 0], [32, 10], [24, 6]], "#3a2a5a");
    rect(g, 21, 10, 2, 2, "#ffe86a"); rect(g, 26, 10, 2, 2, "#ffe86a");
    rect(g, 2, 22, 8, 6, "#a0402a"); rect(g, 38, 20, 8, 6, "#3a6a9a"); rect(g, 4, 36, 7, 5, "#c8985a"); rect(g, 37, 38, 7, 5, "#4a8a4a");
    rect(g, 19, 26, 10, 7, "#e8d080"); line(g, 24, 26, 24, 33, 1, "#a07a4a");
  }, ["#5a3a7a", "#7a5aa0", "#f0d8c0", "#3a2a5a", "#ffe86a", "#a0402a", "#3a6a9a", "#c8985a", "#4a8a4a", "#e8d080", "#a07a4a"]);
  ART.bExecutioner = () => make(52, 60, (g) => {
    poly(g, [[22, 10], [36, 22], [38, 58], [8, 58], [10, 22]], "#2a1a40"); poly(g, [[22, 14], [30, 24], [30, 56], [14, 56], [14, 24]], "#3a2a5a");
    circ(g, 22, 10, 7, "#14101e"); rect(g, 18, 9, 2, 2, "#ff3a5a"); rect(g, 24, 9, 2, 2, "#ff3a5a");
    line(g, 44, 4, 44, 58, 2.4, "#5a4a6a"); g.strokeStyle = "#d8d8f0"; g.lineWidth = 3.4; g.beginPath(); g.arc(34, 8, 12, -0.4, 1.7, true); g.stroke();
    poly(g, [[8, 22], [0, 30], [8, 34]], "#2a1a40");
  }, ["#2a1a40", "#3a2a5a", "#14101e", "#ff3a5a", "#5a4a6a", "#d8d8f0"]);
  ART.bDragon = () => make(84, 64, (g) => {
    poly(g, [[30, 30], [6, 6], [22, 34]], "#c8a830"); poly(g, [[54, 30], [78, 6], [62, 34]], "#c8a830");
    poly(g, [[30, 30], [12, 12], [24, 32]], "#ffe86a"); poly(g, [[54, 30], [72, 12], [60, 32]], "#ffe86a");
    ell(g, 42, 38, 16, 13, "#d8b840"); ell(g, 42, 40, 11, 9, "#fff0a0");
    line(g, 42, 28, 42, 14, 7, "#d8b840"); ell(g, 42, 12, 8, 6, "#d8b840"); ell(g, 42, 15, 5, 3, "#fff0a0");
    rect(g, 38, 9, 2, 2, "#ff3a5a"); rect(g, 45, 9, 2, 2, "#ff3a5a"); poly(g, [[36, 7], [34, 1], [39, 6]], "#ffffff"); poly(g, [[48, 7], [50, 1], [45, 6]], "#ffffff");
    line(g, 52, 46, 72, 56, 4, "#d8b840"); line(g, 72, 56, 82, 50, 2, "#d8b840");
    rect(g, 32, 50, 5, 10, "#a08820"); rect(g, 47, 50, 5, 10, "#a08820");
    for (let i = 0; i < 5; i++) px(g, 36 + i * 3, 34, "#ffffff");
  }, ["#c8a830", "#ffe86a", "#d8b840", "#fff0a0", "#ff3a5a", "#ffffff", "#a08820"]);

  /* ══ ボスのギミック・小物 ══ */
  ART.vine = () => make(16, 22, (g) => {
    rect(g, 5, 4, 6, 16, "#6a5a4a"); rect(g, 4, 18, 8, 4, "#4a3a2a");
    line(g, 5, 4, 11, 10, 2, "#3f8a34"); line(g, 11, 8, 4, 15, 2, "#3f8a34"); line(g, 4, 13, 11, 19, 2, "#3f8a34");
    circ(g, 8, 3, 3, "#7fe060"); circ(g, 8, 3, 1.4, "#ffffff");
  }, ["#6a5a4a", "#4a3a2a", "#3f8a34", "#7fe060", "#ffffff"]);
  ART.mirror = () => make(16, 24, (g) => {
    poly(g, [[8, 0], [15, 8], [13, 22], [3, 22], [1, 8]], "#9ad8ff"); poly(g, [[8, 3], [12, 9], [10, 19], [6, 19], [4, 9]], "#e8f8ff"); line(g, 5, 8, 9, 16, 1, "#ffffff");
  }, ["#9ad8ff", "#e8f8ff", "#ffffff"]);
  ART.cooler = () => make(14, 22, (g) => {
    poly(g, [[7, 0], [13, 8], [7, 20], [1, 8]], "#7fd0ff"); poly(g, [[7, 3], [10, 8], [7, 16], [4, 8]], "#e0f6ff"); rect(g, 3, 19, 8, 3, "#5a4a4a");
  }, ["#7fd0ff", "#e0f6ff", "#5a4a4a"]);
  ART.rune = () => make(20, 14, (g) => {
    ell(g, 10, 7, 9, 6, "#e8d080"); ell(g, 10, 7, 7, 4.4, "#fff4c0"); line(g, 6, 7, 14, 7, 1, "#a07a4a"); line(g, 10, 4, 10, 10, 1, "#a07a4a");
  }, ["#e8d080", "#fff4c0", "#a07a4a"], null, false);
  ART.brazier = () => make(14, 22, (g) => {
    rect(g, 6, 10, 2, 10, "#5a4a6a"); rect(g, 3, 19, 8, 3, "#3a2a4a"); poly(g, [[1, 8], [13, 8], [10, 12], [4, 12]], "#7a6a8a");
    poly(g, [[4, 8], [7, 0], [10, 8]], "#ffe86a"); poly(g, [[5, 8], [7, 3], [9, 8]], "#ffffff");
  }, ["#5a4a6a", "#3a2a4a", "#7a6a8a", "#ffe86a", "#ffffff"]);
  ART.brazierOff = () => make(14, 22, (g) => {
    rect(g, 6, 10, 2, 10, "#5a4a6a"); rect(g, 3, 19, 8, 3, "#3a2a4a"); poly(g, [[1, 8], [13, 8], [10, 12], [4, 12]], "#7a6a8a");
  }, ["#5a4a6a", "#3a2a4a", "#7a6a8a"], null, false);
  ART.pillar = () => make(16, 30, (g) => {
    rect(g, 4, 4, 8, 22, "#d8d0ff"); rect(g, 5, 4, 2, 22, "#ffffff"); rect(g, 2, 2, 12, 3, "#b8b0e0"); rect(g, 2, 26, 12, 4, "#b8b0e0");
    circ(g, 8, 13, 2.4, "#ffe86a");
  }, ["#d8d0ff", "#ffffff", "#b8b0e0", "#ffe86a"]);
  /* 宝箱（ふつう／レア／ボス） */
  function chest(body, trim, open) {
    return make(16, 14, (g) => {
      if (open) { rect(g, 1, 2, 14, 4, P.shade(body, 0.7)); rect(g, 2, 6, 12, 2, "#ffe86a"); }
      else { rect(g, 1, 2, 14, 5, body); rect(g, 1, 2, 14, 1, P.mix(body, "#ffffff", 0.3)); }
      rect(g, 1, 7, 14, 6, P.shade(body, 0.85)); rect(g, 1, 6, 14, 1, trim); rect(g, 7, 5, 2, 4, trim); rect(g, 1, 2, 1, 11, trim); rect(g, 14, 2, 1, 11, trim);
    }, [body, P.shade(body, 0.7), P.shade(body, 0.85), P.mix(body, "#ffffff", 0.3), trim, "#ffe86a"], null, false);
  }
  ART.chest = () => chest("#a0682a", "#e0b040", false);
  ART.chestOpen = () => chest("#a0682a", "#e0b040", true);
  ART.chestRare = () => chest("#3a5ab0", "#e8e8f0", false);
  ART.chestRareOpen = () => chest("#3a5ab0", "#e8e8f0", true);
  ART.chestBoss = () => chest("#7a2a8a", "#ffd84a", false);
  ART.chestBossOpen = () => chest("#7a2a8a", "#ffd84a", true);
  ART.fountain = () => make(24, 20, (g) => {
    ell(g, 12, 15, 11, 4.5, "#8a8aa0"); ell(g, 12, 14.5, 9, 3.2, "#5ab8ff"); rect(g, 10, 5, 4, 10, "#8a8aa0"); ell(g, 12, 5, 5, 2, "#8a8aa0");
    line(g, 12, 2, 12, 5, 1.5, "#bfe8ff"); circ(g, 12, 2, 1.5, "#ffffff");
  }, ["#8a8aa0", "#5ab8ff", "#bfe8ff", "#ffffff"]);
  ART.altar = () => make(22, 20, (g) => {
    rect(g, 3, 10, 16, 8, "#7a7090"); rect(g, 1, 17, 20, 3, "#5a5070"); rect(g, 5, 7, 12, 4, "#9a90b0");
    poly(g, [[11, 0], [14, 5], [11, 8], [8, 5]], "#ff8fd0"); poly(g, [[11, 2], [13, 5], [11, 7], [9, 5]], "#ffffff");
  }, ["#7a7090", "#5a5070", "#9a90b0", "#ff8fd0", "#ffffff"]);
  ART.spirit = () => make(18, 20, (g) => {
    rect(g, 3, 12, 12, 6, "#6a8a6a"); rect(g, 1, 17, 16, 3, "#4a6a4a"); circ(g, 9, 6, 4.5, "#c8ffe0"); circ(g, 9, 6, 2.4, "#ffffff");
    px(g, 8, 6, "#2a8a5a"); px(g, 10, 6, "#2a8a5a");
  }, ["#6a8a6a", "#4a6a4a", "#c8ffe0", "#ffffff", "#2a8a5a"]);
  ART.circle = () => make(32, 20, (g) => {
    g.strokeStyle = "#c27bff"; g.lineWidth = 1.4; g.beginPath(); g.ellipse(16, 10, 14, 8, 0, 0, TAU); g.stroke();
    g.beginPath(); g.ellipse(16, 10, 9, 5, 0, 0, TAU); g.stroke();
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; px(g, Math.round(16 + Math.cos(a) * 11.5), Math.round(10 + Math.sin(a) * 6.5), "#ffffff"); }
  }, ["#c27bff", "#ffffff"], "#2a1040", false);
  ART.door = () => make(32, 24, (g) => {
    rect(g, 0, 0, 32, 24, "#5a4a6a"); rect(g, 2, 2, 28, 22, "#3a2a4a"); rect(g, 15, 2, 2, 22, "#8a7aa0");
    circ(g, 16, 12, 4, "#ff8fd0"); circ(g, 16, 12, 2, "#ffffff"); for (let i = 0; i < 4; i++) rect(g, 4 + i * 7, 4, 2, 18, "#4a3a5a");
  }, ["#5a4a6a", "#3a2a4a", "#8a7aa0", "#ff8fd0", "#ffffff", "#4a3a5a"], null, false);
  ART.portal = () => make(24, 30, (g) => {
    ell(g, 12, 15, 10, 14, "#7a4aff"); ell(g, 12, 15, 7, 11, "#b08aff"); ell(g, 12, 15, 4, 8, "#ffffff");
  }, ["#7a4aff", "#b08aff", "#ffffff"], "#1a0a3a", (b) => P.shiftWhere(b, (x, y) => true, 0, 0));
  ART.exitPortal = () => make(24, 30, (g) => {
    ell(g, 12, 15, 10, 14, "#2ab87a"); ell(g, 12, 15, 7, 11, "#8affc4"); ell(g, 12, 15, 4, 8, "#ffffff");
  }, ["#2ab87a", "#8affc4", "#ffffff"], "#0a2a1a");
  ART.key = () => make(12, 12, (g) => {
    circ(g, 4, 4, 3.4, "#ff8fd0"); circ(g, 4, 4, 1.4, "#3a1030"); rect(g, 6, 5, 6, 2, "#ff8fd0"); rect(g, 9, 7, 1, 3, "#ff8fd0"); rect(g, 11, 7, 1, 2, "#ff8fd0");
  }, ["#ff8fd0", "#3a1030"]);
  ART.warp = () => make(20, 12, (g) => { ell(g, 10, 6, 9, 5, "#5ab8ff"); ell(g, 10, 6, 6, 3, "#ffffff"); }, ["#5ab8ff", "#ffffff"], "#0a1a3a");
  ART.vent = () => make(16, 10, (g) => { ell(g, 8, 5, 7, 4, "#3a2a22"); ell(g, 8, 5, 4, 2.4, "#ff7a2a"); }, ["#3a2a22", "#ff7a2a"], null, false);
  ART.gravity = () => make(24, 16, (g) => { ell(g, 12, 8, 11, 7, "#6a5aff"); ell(g, 12, 8, 7, 4, "#2a1a6a"); ell(g, 12, 8, 3, 2, "#ffffff"); }, ["#6a5aff", "#2a1a6a", "#ffffff"], "#100830");
  ART.secret = () => make(16, 16, (g) => { rect(g, 0, 0, 16, 16, "#5a5068"); line(g, 3, 2, 9, 10, 1, "#2a2030"); line(g, 9, 10, 7, 15, 1, "#2a2030"); line(g, 9, 10, 14, 8, 1, "#2a2030"); }, ["#5a5068", "#2a2030"], false, false);
  /* 拾うもの */
  ART.gem1 = () => make(6, 8, (g) => { poly(g, [[3, 0], [6, 3], [3, 8], [0, 3]], "#4fe39a"); px(g, 2, 2, "#ffffff"); }, ["#4fe39a", "#ffffff"], "#0a2a18", false);
  ART.gem2 = () => make(7, 9, (g) => { poly(g, [[3.5, 0], [7, 3.5], [3.5, 9], [0, 3.5]], "#5ab8ff"); px(g, 2, 2, "#ffffff"); }, ["#5ab8ff", "#ffffff"], "#0a1a3a", false);
  ART.gem3 = () => make(8, 10, (g) => { poly(g, [[4, 0], [8, 4], [4, 10], [0, 4]], "#ff8fd0"); px(g, 3, 2, "#ffffff"); px(g, 4, 3, "#ffe86a"); }, ["#ff8fd0", "#ffffff", "#ffe86a"], "#3a0a2a", false);
  ART.coin = () => make(8, 8, (g) => { circ(g, 4, 4, 3.6, "#ffd84a"); rect(g, 3, 2, 2, 4, "#c89a20"); }, ["#ffd84a", "#c89a20"], "#3a2a08", false);
  ART.heal = () => make(10, 10, (g) => { circ(g, 5, 5, 4.4, "#ff6a8a"); rect(g, 4, 2, 2, 6, "#ffffff"); rect(g, 2, 4, 6, 2, "#ffffff"); }, ["#ff6a8a", "#ffffff"], "#3a0a14", false);
  ART.magnet = () => make(10, 10, (g) => { g.strokeStyle = "#ff4a4a"; g.lineWidth = 2.4; g.beginPath(); g.arc(5, 4, 3, Math.PI, 0); g.stroke(); rect(g, 1, 4, 2, 4, "#ff4a4a"); rect(g, 7, 4, 2, 4, "#ff4a4a"); rect(g, 1, 7, 2, 2, "#ffffff"); rect(g, 7, 7, 2, 2, "#ffffff"); }, ["#ff4a4a", "#ffffff"], "#2a0808", false);
  ART.matDrop = () => make(8, 8, (g) => { poly(g, [[4, 0], [8, 4], [4, 8], [0, 4]], "#9ab0ff"); px(g, 3, 3, "#ffffff"); }, ["#9ab0ff", "#ffffff"], "#1a1a3a", false);
  ART.lorePage = () => make(10, 12, (g) => { rect(g, 1, 0, 8, 11, "#f0e2b8"); line(g, 3, 3, 7, 3, 1, "#a07a4a"); line(g, 3, 6, 7, 6, 1, "#a07a4a"); }, ["#f0e2b8", "#a07a4a"], "#3a2a10", false);

  /* ── 名前 → 絵（色ちがいはキーに色を含める） ── */
  const cache = {};
  function sprite(key, col) {
    const k = key + "|" + (col || "");
    if (cache[k]) return cache[k];
    const f = ART[key];
    const s = f ? f(col) : ART.slime(col || "#ff00ff");
    cache[k] = s;
    return s;
  }

  /* ══════════════════════════════════════════════════════════════
     地形（16×16 のタイル）— 迷宮ごとの色
     ══════════════════════════════════════════════════════════════ */
  const BIOME = {
    forest:  { floor: ["#3c6a34", "#447a3a", "#376230"], detail: "#5a9a44", wallTop: "#1f3219", wallFace: "#4a3420", wallEdge: "#0c1408", deco: "tree", bg: "#0c1408", accent: "#9ad86a" },
    ice:     { floor: ["#7fa6c8", "#88b0d2", "#7299bc"], detail: "#b8d8f0", wallTop: "#c8e4f8", wallFace: "#6a90b8", wallEdge: "#4a6a90", deco: "crystal", bg: "#0e1a2a", accent: "#e0f4ff" },
    lava:    { floor: ["#4a3230", "#523836", "#432c2a"], detail: "#6a4440", wallTop: "#6a4a44", wallFace: "#3a2422", wallEdge: "#24140f", deco: "rock", bg: "#1a0806", accent: "#ff7a2a" },
    library: { floor: ["#6a4a34", "#74523a", "#62442e"], detail: "#8a6448", wallTop: "#8a6a4a", wallFace: "#4a321e", wallEdge: "#2e1e10", deco: "shelf", bg: "#160e08", accent: "#e8d080" },
    abyss:   { floor: ["#2a2238", "#30283f", "#251e33"], detail: "#4a3a66", wallTop: "#3e3256", wallFace: "#1e1830", wallEdge: "#120e1e", deco: "void", bg: "#07050d", accent: "#a874ff" },
    sky:     { floor: ["#c8c4e8", "#d2cef0", "#bebad8"], detail: "#e8e4ff", wallTop: "#e8e6fa", wallFace: "#9a96c0", wallEdge: "#6a6690", deco: "starpillar", bg: "#0a0c24", accent: "#ffe86a" },
    guild:   { floor: ["#8a5a34", "#94623a", "#80532f"], detail: "#a8743f", wallTop: "#c8b8a0", wallFace: "#8a7a64", wallEdge: "#5a4a38", deco: "barrel", bg: "#1a120a", accent: "#ffd86a" },
  };
  const tileCache = {};
  function tiles(biome) {
    if (tileCache[biome]) return tileCache[biome];
    const B = BIOME[biome] || BIOME.forest;
    const T = {};
    /* 床 4種 */
    T.floor = [0, 1, 2, 3].map((v) => {
      const c = P.mkCanvas(16, 16), g = c.getContext("2d"), r = rng(17 + v * 31 + biome.length * 7);
      rect(g, 0, 0, 16, 16, B.floor[0]);
      if (v === 2) { rect(g, 2, 9, 5, 3, B.floor[1]); rect(g, 10, 3, 4, 2, B.floor[2]); }
      if (v === 3) { rect(g, 8, 10, 6, 3, B.floor[2]); }
      for (let i = 0; i < 10; i++) px(g, (r() * 16) | 0, (r() * 16) | 0, i % 3 ? B.detail : P.shade(B.floor[0], 0.85));
      if (biome === "forest" && v === 1) { px(g, 4, 5, "#ffe06a"); px(g, 11, 10, "#ff9ad8"); }
      if (biome === "library") { rect(g, 0, 15, 16, 1, P.shade(B.floor[0], 0.8)); if (v % 2) rect(g, 7, 0, 1, 16, P.shade(B.floor[0], 0.85)); }
      if (biome === "sky") { rect(g, 0, 0, 16, 1, "#e8e6fa"); rect(g, 0, 0, 1, 16, "#e8e6fa"); if (v === 2) px(g, 8, 8, "#ffe86a"); }
      if (biome === "abyss" && v === 3) { line(g, 3, 4, 9, 9, 1, "#5a3a8a"); }
      if (biome === "ice") { line(g, 2 + v, 3, 7 + v, 5, 1, "#c8e4f8"); }
      if (biome === "lava" && v === 2) { px(g, 6, 7, "#ff7a2a"); px(g, 7, 7, "#ff9a3a"); }
      if (biome === "guild") { rect(g, 0, 7, 16, 1, P.shade(B.floor[0], 0.75)); rect(g, 0, 15, 16, 1, P.shade(B.floor[0], 0.75)); rect(g, v * 4, 0, 1, 7, P.shade(B.floor[0], 0.8)); rect(g, (v * 4 + 8) % 16, 8, 1, 7, P.shade(B.floor[0], 0.8)); }
      return c;
    });
    /* 壁の上面・前面 */
    T.top = (() => { const c = P.mkCanvas(16, 16), g = c.getContext("2d"), r = rng(99 + biome.length);
      rect(g, 0, 0, 16, 16, B.wallTop); for (let i = 0; i < 8; i++) px(g, (r() * 16) | 0, (r() * 16) | 0, P.shade(B.wallTop, 0.88));
      if (biome === "forest") { for (let i = 0; i < 7; i++) circ(g, r() * 16, r() * 16, 3, i % 2 ? "#2a4422" : "#18281a"); px(g, 5, 4, "#3a5a2e"); px(g, 11, 10, "#3a5a2e"); }
      return c; })();
    T.face = (() => { const c = P.mkCanvas(16, 16), g = c.getContext("2d");
      rect(g, 0, 0, 16, 16, B.wallFace); rect(g, 0, 0, 16, 2, B.wallEdge); rect(g, 0, 15, 16, 1, B.wallEdge);
      if (biome !== "abyss" && biome !== "forest") { rect(g, 0, 8, 16, 1, B.wallEdge); rect(g, 7, 2, 1, 6, B.wallEdge); rect(g, 3, 9, 1, 6, B.wallEdge); rect(g, 11, 9, 1, 6, B.wallEdge); }
      if (biome === "forest") { for (let x = 0; x < 16; x += 3) rect(g, x, 2, 1, 13, P.shade(B.wallFace, 0.75)); rect(g, 0, 0, 16, 3, "#2a4422"); px(g, 4, 3, "#3a5a2e"); px(g, 12, 3, "#3a5a2e"); }
      if (biome === "library") { for (let x = 1; x < 16; x += 3) rect(g, x, 3, 2, 5, ["#a0402a", "#3a6a9a", "#4a8a4a", "#c8985a"][x % 4]); for (let x = 0; x < 16; x += 3) rect(g, x, 10, 2, 5, ["#7a4aa0", "#c8985a", "#a0402a"][x % 3]); }
      if (biome === "sky") { rect(g, 2, 2, 2, 13, "#c8c4e8"); rect(g, 12, 2, 2, 13, "#c8c4e8"); }
      return c; })();
    /* 特殊な床 */
    const special = (col, col2, fn) => { const c = P.mkCanvas(16, 16), g = c.getContext("2d"); rect(g, 0, 0, 16, 16, col); fn && fn(g, col2); return c; };
    T.poison = special("#5a3a6a", "#9a5ac8", (g, c2) => { circ(g, 5, 5, 2, c2); circ(g, 11, 10, 2.5, c2); px(g, 9, 3, "#ffffff"); });
    T.ice = special("#a8d4f4", "#e8f6ff", (g, c2) => { line(g, 1, 13, 14, 2, 1, c2); line(g, 4, 15, 15, 7, 1, c2); });
    T.lava = special("#ff6a1a", "#ffd04a", (g, c2) => { circ(g, 5, 6, 3, c2); circ(g, 12, 11, 2.5, c2); rect(g, 0, 0, 16, 1, "#c8400a"); });
    T.rune = special("#5a3a2a", "#e8d080", (g, c2) => { g.strokeStyle = c2; g.lineWidth = 1; g.strokeRect(2.5, 2.5, 11, 11); line(g, 3, 3, 13, 13, 1, c2); line(g, 13, 3, 3, 13, 1, c2); });
    T.taint = special("#3a1a4a", "#8a3aba", (g, c2) => { circ(g, 4, 11, 2.5, c2); circ(g, 11, 5, 2, c2); px(g, 7, 8, "#ff70ff"); });
    T.water = special("#2a5a9a", "#6ab0ff", (g, c2) => { line(g, 2, 5, 7, 5, 1, c2); line(g, 9, 11, 14, 11, 1, c2); });
    T.carpet = special("#8a2a3a", "#d8a040", (g, c2) => { rect(g, 0, 0, 16, 1, c2); rect(g, 0, 15, 16, 1, c2); px(g, 7, 7, c2); px(g, 8, 8, c2); });
    T.void = special("#05030a", "#2a1a4a", (g, c2) => { px(g, 4, 4, c2); px(g, 11, 9, c2); });
    tileCache[biome] = T;
    return T;
  }
  /* 置物（壁の代わりに置く当たりのある飾り） */
  const decoCache = {};
  function deco(kind, v) {
    const k = kind + v;
    if (decoCache[k]) return decoCache[k];
    let s;
    if (kind === "tree") s = make(24, 30, (g) => {
      rect(g, 10, 18, 4, 11, "#5a3a20"); circ(g, 12, 12, 10, v % 2 ? "#2f6a28" : "#367a2e"); circ(g, 8, 14, 6, "#2a5a24"); circ(g, 15, 9, 5, "#4f9a40"); circ(g, 10, 7, 3, "#6fb84f");
    }, ["#5a3a20", "#2f6a28", "#367a2e", "#2a5a24", "#4f9a40", "#6fb84f"], "#0e1a0a", false);
    else if (kind === "crystal") s = make(18, 26, (g) => {
      poly(g, [[9, 0], [13, 8], [12, 25], [6, 25], [5, 8]], "#8ad0ff"); poly(g, [[9, 2], [11, 8], [10, 23], [8, 23], [7, 8]], "#e0f6ff");
      poly(g, [[3, 12], [6, 15], [5, 25], [1, 25], [0, 15]], "#6ab0e8"); poly(g, [[15, 14], [18, 17], [17, 25], [13, 25], [12, 17]], "#6ab0e8");
    }, ["#8ad0ff", "#e0f6ff", "#6ab0e8"], "#0a1a2a", false);
    else if (kind === "rock") s = make(20, 18, (g) => {
      ell(g, 10, 11, 9, 7, "#5a3a32"); ell(g, 9, 9, 7, 5, "#6a4a40"); line(g, 6, 12, 12, 9, 1, "#ff7a2a");
    }, ["#5a3a32", "#6a4a40", "#ff7a2a"], "#1a0806", false);
    else if (kind === "shelf") s = make(16, 28, (g) => {
      rect(g, 0, 0, 16, 28, "#5a3a22"); for (let r = 0; r < 4; r++) { rect(g, 1, 2 + r * 7, 14, 5, "#2e1e10"); for (let i = 0; i < 6; i++) rect(g, 2 + i * 2, 3 + r * 7, 2, 4, ["#a0402a", "#3a6a9a", "#4a8a4a", "#c8985a", "#7a4aa0"][(i + r + v) % 5]); }
    }, ["#5a3a22", "#2e1e10", "#a0402a", "#3a6a9a", "#4a8a4a", "#c8985a", "#7a4aa0"], "#1a0e06", false);
    else if (kind === "void") s = make(20, 22, (g) => {
      poly(g, [[10, 0], [16, 8], [14, 21], [6, 21], [4, 8]], "#2a1a40"); poly(g, [[10, 4], [13, 9], [11, 18], [9, 18], [7, 9]], "#6a3aa0"); px(g, 10, 10, "#ff70ff");
    }, ["#2a1a40", "#6a3aa0", "#ff70ff"], "#05030a", false);
    else if (kind === "starpillar") s = make(16, 32, (g) => {
      rect(g, 4, 3, 8, 26, "#e8e6fa"); rect(g, 5, 3, 2, 26, "#ffffff"); rect(g, 2, 0, 12, 4, "#c8c4e8"); rect(g, 2, 28, 12, 4, "#c8c4e8"); px(g, 8, 14, "#ffe86a");
    }, ["#e8e6fa", "#ffffff", "#c8c4e8", "#ffe86a"], "#4a4670", false);
    else if (kind === "barrel") s = make(14, 16, (g) => {
      ell(g, 7, 8, 6, 7, "#8a5a2a"); rect(g, 1, 4, 12, 1, "#3a2a1a"); rect(g, 1, 11, 12, 1, "#3a2a1a"); ell(g, 7, 2, 5, 1.6, "#a8743f");
    }, ["#8a5a2a", "#3a2a1a", "#a8743f"], "#1a0e06", false);
    else if (kind === "bush") s = make(16, 12, (g) => { circ(g, 5, 7, 4.5, "#2f6a28"); circ(g, 11, 7, 4.5, "#367a2e"); circ(g, 8, 5, 4, "#4f9a40"); px(g, 6, 4, "#ff9ad8"); }, ["#2f6a28", "#367a2e", "#4f9a40", "#ff9ad8"], "#0e1a0a", false);
    else if (kind === "statue") s = make(16, 26, (g) => {
      rect(g, 2, 20, 12, 6, "#7a7488"); circ(g, 8, 6, 4, "#a8a2b8"); rect(g, 5, 9, 6, 11, "#a8a2b8"); line(g, 5, 11, 2, 16, 2, "#a8a2b8"); line(g, 11, 11, 14, 16, 2, "#a8a2b8");
    }, ["#7a7488", "#a8a2b8"], "#2a2438", false);
    else s = make(16, 16, (g) => rect(g, 2, 2, 12, 12, "#888"), ["#888"], null, false);
    decoCache[k] = s;
    return s;
  }

  /* ══════════════════════════════════════════════════════════════
     UI のアイコン（16×16 のドット絵 → data URL）
     ══════════════════════════════════════════════════════════════ */
  const ICON = {};
  ICON.sword = (c) => (g) => { line(g, 3, 13, 12, 4, 2, c || "#d8e4f0"); line(g, 3, 13, 12, 4, 0.8, "#ffffff"); line(g, 2, 10, 6, 14, 2, "#c8a040"); line(g, 1, 15, 3, 13, 2, "#6a4a2a"); };
  ICON.bow = (c) => (g) => { g.strokeStyle = c || "#c8985a"; g.lineWidth = 2; g.beginPath(); g.arc(4, 8, 8, -1.0, 1.0); g.stroke(); line(g, 8, 1, 8, 15, 1, "#ffffff"); line(g, 4, 8, 15, 8, 1.2, "#e8e8f0"); poly(g, [[15, 8], [12, 6], [12, 10]], "#ffe86a"); };
  ICON.tome = (c) => (g) => { rect(g, 3, 2, 10, 12, c || "#7a4aa0"); rect(g, 4, 3, 8, 10, P.shade(c || "#7a4aa0", 1.3)); rect(g, 3, 13, 10, 2, "#f0e8d0"); circ(g, 8, 8, 2.4, "#ffe86a"); };
  ICON.dagger = (c) => (g) => { line(g, 2, 14, 9, 7, 1.6, c || "#bfe8ff"); line(g, 7, 14, 14, 7, 1.6, c || "#bfe8ff"); line(g, 2, 12, 4, 14, 1.6, "#6a4a2a"); line(g, 7, 12, 9, 14, 1.6, "#6a4a2a"); };
  ICON.scythe = (c) => (g) => { line(g, 4, 15, 10, 2, 1.6, "#6a4a2a"); g.strokeStyle = c || "#d8d8f0"; g.lineWidth = 2.2; g.beginPath(); g.arc(4, 5, 7, -0.6, 1.0); g.stroke(); };
  ICON.staff = (c) => (g) => { line(g, 4, 15, 11, 5, 1.8, "#8a5a2a"); circ(g, 12, 4, 3, c || "#7fd0ff"); circ(g, 12, 4, 1.2, "#ffffff"); };
  ICON.fireball = () => (g) => { circ(g, 9, 9, 5, "#ff6a2a"); circ(g, 9, 9, 2.6, "#ffd86a"); poly(g, [[5, 6], [1, 1], [7, 4]], "#ff9a3a"); };
  ICON.frost = () => (g) => { for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; line(g, 8 - Math.cos(a) * 6, 8 - Math.sin(a) * 6, 8 + Math.cos(a) * 6, 8 + Math.sin(a) * 6, 1.4, "#9ae0ff"); } circ(g, 8, 8, 2, "#ffffff"); };
  ICON.gale = () => (g) => { g.strokeStyle = "#4fe39a"; g.lineWidth = 1.6; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(8, 8, 2 + i * 2.5, i, i + 3); g.stroke(); } };
  ICON.thunder = () => (g) => poly(g, [[9, 0], [3, 9], [8, 9], [6, 16], [13, 6], [8, 6]], "#ffd84a");
  ICON.holy = () => (g) => { rect(g, 6, 0, 4, 16, "#fff4b0"); rect(g, 7, 0, 2, 16, "#ffffff"); ell(g, 8, 14, 6, 2, "#ffe86a"); };
  ICON.shadowbind = () => (g) => { poly(g, [[3, 15], [5, 4], [7, 15]], "#a874ff"); poly(g, [[7, 15], [9, 1], [11, 15]], "#7a4ad0"); poly(g, [[11, 15], [13, 6], [15, 15]], "#a874ff"); };
  ICON.power = () => (g) => { poly(g, [[8, 1], [14, 5], [12, 14], [4, 14], [2, 5]], "#ff6a5a"); poly(g, [[8, 4], [11, 6], [10, 11], [6, 11], [5, 6]], "#ffd0c0"); };
  ICON.haste = () => (g) => { circ(g, 8, 8, 6, "#5ab8ff"); circ(g, 8, 8, 4, "#e0f2ff"); line(g, 8, 8, 8, 4, 1.4, "#1a2a4a"); line(g, 8, 8, 11, 9, 1.4, "#1a2a4a"); };
  ICON.crit = () => (g) => { ell(g, 8, 8, 7, 4.5, "#ffffff"); circ(g, 8, 8, 3, "#ffcc3a"); circ(g, 8, 8, 1.4, "#1a1020"); };
  ICON.vital = () => (g) => { circ(g, 5, 6, 3.6, "#ff5a7a"); circ(g, 11, 6, 3.6, "#ff5a7a"); poly(g, [[1.6, 7], [14.4, 7], [8, 14.5]], "#ff5a7a"); px(g, 4, 4, "#ffffff"); };
  ICON.guard = () => (g) => { poly(g, [[8, 1], [14, 3], [13, 10], [8, 15], [3, 10], [2, 3]], "#9ab0d0"); poly(g, [[8, 3], [12, 4.5], [11, 9.5], [8, 13], [5, 9.5], [4, 4.5]], "#d8e4f8"); };
  ICON.swift = () => (g) => { poly(g, [[2, 12], [8, 4], [14, 12], [8, 9]], "#4fe39a"); rect(g, 3, 13, 10, 2, "#2a8a5a"); };
  ICON.wisdom = () => (g) => { rect(g, 2, 3, 12, 11, "#3a6a9a"); rect(g, 3, 4, 10, 9, "#e8f0ff"); line(g, 8, 4, 8, 13, 1, "#3a6a9a"); px(g, 5, 7, "#ffcc3a"); px(g, 11, 7, "#ffcc3a"); };
  ICON.regen = () => (g) => { circ(g, 8, 9, 5.5, "#4fe39a"); rect(g, 7, 5, 2, 8, "#ffffff"); rect(g, 4, 8, 8, 2, "#ffffff"); };
  ICON.arcana = () => (g) => { poly(g, [[8, 0], [10, 6], [16, 8], [10, 10], [8, 16], [6, 10], [0, 8], [6, 6]], "#c27bff"); circ(g, 8, 8, 2, "#ffffff"); };
  ICON.affinity = () => (g) => { ["#ff5d47", "#2fbf71", "#38a6ff", "#f0b429", "#a86bff"].forEach((c, i) => { const a = -Math.PI / 2 + i / 5 * TAU; circ(g, 8 + Math.cos(a) * 5, 8 + Math.sin(a) * 5, 2.3, c); }); };
  /* ★★ 2026-10-05 属性（XEVARION と同じ5つ：火・木・水・光・闇） */
  ICON.el_fire = () => (g) => { poly(g, [[8, 1], [12, 7], [13, 11], [8, 15], [3, 11], [4, 7], [6, 9]], "#ff5d47"); poly(g, [[8, 8], [10, 11], [8, 14], [6, 11]], "#ffd0a0"); };
  ICON.el_wood = () => (g) => { poly(g, [[8, 1], [14, 7], [8, 15], [2, 7]], "#2fbf71"); line(g, 8, 4, 8, 14, 1, "#c8ffe2"); line(g, 8, 8, 11, 6, 1, "#c8ffe2"); line(g, 8, 11, 5, 9, 1, "#c8ffe2"); };
  ICON.el_water = () => (g) => { poly(g, [[8, 1], [13, 9], [12, 13], [8, 15], [4, 13], [3, 9]], "#38a6ff"); line(g, 6, 10, 7, 13, 1.2, "#c4e8ff"); };
  ICON.el_light = () => (g) => { poly(g, [[8, 0], [10, 6], [16, 8], [10, 10], [8, 16], [6, 10], [0, 8], [6, 6]], "#f0b429"); circ(g, 8, 8, 2.2, "#fff5c0"); };
  ICON.el_dark = () => (g) => { circ(g, 8, 8, 6.5, "#a86bff"); circ(g, 10.5, 6.5, 5, "#120a18"); px(g, 4, 9, "#e2d0ff"); };
  /* 技（E）のアイコン */
  ICON.meteor = () => (g) => { line(g, 2, 2, 9, 9, 2.4, "#ffb03a"); line(g, 4, 1, 10, 7, 1, "#fff0a0"); circ(g, 11, 11, 4, "#ff6a2a"); circ(g, 11, 11, 2, "#ffe86a"); };
  ICON.flash = () => (g) => { poly(g, [[1, 9], [10, 2], [8, 7], [15, 7], [6, 14], [8, 9]], "#bfe8ff"); poly(g, [[4, 9], [9, 5], [8, 8], [12, 8], [7, 12], [8, 9]], "#ffffff"); };
  ICON.magnet = () => (g) => { g.strokeStyle = "#ff4a4a"; g.lineWidth = 3; g.beginPath(); g.arc(8, 7, 4.5, Math.PI, 0); g.stroke(); rect(g, 2, 7, 3, 5, "#ff4a4a"); rect(g, 11, 7, 3, 5, "#ff4a4a"); rect(g, 2, 11, 3, 3, "#ffffff"); rect(g, 11, 11, 3, 3, "#ffffff"); };
  ICON.cooldown = () => (g) => { poly(g, [[3, 1], [13, 1], [8, 8]], "#ffe08a"); poly(g, [[3, 15], [13, 15], [8, 8]], "#c8985a"); rect(g, 2, 0, 12, 1, "#8a6a40"); rect(g, 2, 15, 12, 1, "#8a6a40"); };
  ICON.dashup = () => (g) => { poly(g, [[1, 9], [8, 2], [15, 9], [8, 6]], "#e8f4ff"); poly(g, [[3, 14], [8, 9], [13, 14], [8, 12]], "#9ad8ff"); };
  ICON.luck = () => (g) => { circ(g, 5, 5, 3.4, "#4fe39a"); circ(g, 11, 5, 3.4, "#4fe39a"); circ(g, 5, 11, 3.4, "#4fe39a"); circ(g, 11, 11, 3.4, "#4fe39a"); circ(g, 8, 8, 1.6, "#ffe86a"); };
  ICON.revive = () => (g) => { poly(g, [[8, 1], [12, 8], [15, 6], [12, 14], [4, 14], [1, 6], [4, 8]], "#ff8a3d"); poly(g, [[8, 5], [10, 10], [8, 13], [6, 10]], "#ffe86a"); };
  ICON.seal = (c) => (g) => { circ(g, 8, 8, 6.5, c); circ(g, 8, 8, 4.5, P.shade(c, 0.6)); poly(g, [[8, 4], [10, 8], [8, 12], [6, 8]], "#ffffff"); };
  ICON.armor = () => (g) => { poly(g, [[3, 2], [13, 2], [15, 6], [13, 14], [3, 14], [1, 6]], "#9ab0d0"); rect(g, 6, 2, 4, 12, "#c8d8f0"); };
  ICON.ring = (c) => (g) => { g.strokeStyle = "#ffd84a"; g.lineWidth = 2.2; g.beginPath(); g.ellipse(8, 10, 5, 4, 0, 0, TAU); g.stroke(); poly(g, [[8, 1], [11, 4], [8, 7], [5, 4]], c || "#ff8fd0"); };
  ICON.charm = (c) => (g) => { line(g, 4, 1, 8, 5, 1, "#c8985a"); line(g, 12, 1, 8, 5, 1, "#c8985a"); poly(g, [[8, 4], [13, 9], [8, 15], [3, 9]], c || "#4fe39a"); poly(g, [[8, 7], [10, 9], [8, 12], [6, 9]], "#ffffff"); };
  ICON.boots = () => (g) => { poly(g, [[3, 2], [8, 2], [8, 10], [14, 11], [14, 14], [3, 14]], "#8a5a3a"); rect(g, 3, 13, 11, 2, "#3a2a1a"); rect(g, 3, 4, 5, 1, "#c8a060"); };
  ICON.tool = (c) => (g) => { poly(g, [[8, 1], [13, 6], [8, 15], [3, 6]], c || "#7fd0ff"); poly(g, [[8, 3], [10, 6], [8, 11], [6, 6]], "#ffffff"); };
  ICON.gold = () => (g) => { circ(g, 6, 9, 5, "#ffd84a"); circ(g, 10, 7, 5, "#ffe86a"); rect(g, 9, 5, 2, 4, "#c89a20"); };
  ICON.chest = () => (g) => { rect(g, 1, 4, 14, 10, "#a0682a"); rect(g, 1, 4, 14, 3, "#c88a3a"); rect(g, 1, 8, 14, 1, "#e0b040"); rect(g, 7, 7, 2, 4, "#e0b040"); };
  ICON.key = () => (g) => { circ(g, 5, 5, 3.6, "#ff8fd0"); circ(g, 5, 5, 1.4, "#3a1030"); line(g, 7, 7, 14, 14, 2, "#ff8fd0"); rect(g, 11, 12, 1, 3, "#ff8fd0"); rect(g, 13, 10, 1, 3, "#ff8fd0"); };
  ICON.potion = () => (g) => { rect(g, 6, 1, 4, 3, "#c8985a"); poly(g, [[5, 4], [11, 4], [14, 10], [11, 15], [5, 15], [2, 10]], "#ff6a8a"); rect(g, 5, 6, 2, 3, "#ffffff"); };
  ICON.elixir = () => (g) => { rect(g, 6, 1, 4, 3, "#e8e8f0"); poly(g, [[5, 4], [11, 4], [14, 10], [11, 15], [5, 15], [2, 10]], "#ffd84a"); rect(g, 5, 6, 2, 3, "#ffffff"); };
  ICON.dice = () => (g) => { rect(g, 2, 2, 12, 12, "#f0f0f6"); [[5, 5], [11, 5], [8, 8], [5, 11], [11, 11]].forEach((p) => rect(g, p[0] - 1, p[1] - 1, 2, 2, "#3a2a5a")); };
  ICON.sand = () => (g) => { ell(g, 8, 11, 6, 3.5, "#e8d080"); circ(g, 5, 6, 1, "#ffffff"); circ(g, 11, 4, 1, "#ffffff"); circ(g, 8, 2, 1, "#ffffff"); };
  ICON.crystal = () => (g) => { poly(g, [[8, 0], [13, 5], [11, 15], [5, 15], [3, 5]], "#ff8fd0"); poly(g, [[8, 2], [11, 5], [9, 13], [7, 13], [5, 5]], "#ffd0ee"); };
  ICON.mat = (c) => (g) => { poly(g, [[8, 1], [14, 7], [8, 15], [2, 7]], c); poly(g, [[8, 4], [11, 7], [8, 12], [5, 7]], P.mix(c, "#ffffff", 0.5)); };
  ICON.skull = () => (g) => { circ(g, 8, 7, 6, "#e8e4f0"); rect(g, 5, 11, 6, 4, "#e8e4f0"); rect(g, 5, 6, 2, 2, "#1a1020"); rect(g, 9, 6, 2, 2, "#1a1020"); };
  ICON.map = () => (g) => { poly(g, [[1, 3], [6, 1], [10, 3], [15, 1], [15, 13], [10, 15], [6, 13], [1, 15]], "#e8d8a8"); line(g, 6, 1, 6, 13, 1, "#a07a4a"); line(g, 10, 3, 10, 15, 1, "#a07a4a"); circ(g, 12, 6, 1.6, "#ff4a4a"); };
  ICON.gear = () => (g) => { circ(g, 8, 8, 6, "#c8c8d8"); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; rect(g, 8 + Math.cos(a) * 6.5 - 1.5, 8 + Math.sin(a) * 6.5 - 1.5, 3, 3, "#c8c8d8"); } circ(g, 8, 8, 2.6, "#3a3a4a"); };
  ICON.star = (c) => (g) => { const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 3 : 7.4; pts.push([8 + Math.cos(a) * r, 8 + Math.sin(a) * r]); } poly(g, pts, c || "#ffd84a"); };
  ICON.flag = () => (g) => { line(g, 3, 1, 3, 15, 1.6, "#8a6a4a"); poly(g, [[4, 2], [14, 4], [4, 8]], "#ff5a6a"); };
  ICON.book = () => (g) => { rect(g, 2, 2, 12, 12, "#a0402a"); rect(g, 3, 3, 10, 10, "#c8584a"); rect(g, 4, 2, 1, 12, "#5a1a10"); circ(g, 9, 8, 2, "#ffd84a"); };
  ICON.trophy = () => (g) => { poly(g, [[3, 1], [13, 1], [12, 7], [8, 10], [4, 7]], "#ffd84a"); rect(g, 7, 10, 2, 3, "#c89a20"); rect(g, 4, 13, 8, 2, "#c89a20"); };
  ICON.scroll = () => (g) => { rect(g, 3, 2, 10, 12, "#f0e2b8"); rect(g, 2, 1, 12, 2, "#c8a060"); rect(g, 2, 13, 12, 2, "#c8a060"); line(g, 5, 6, 11, 6, 1, "#a07a4a"); line(g, 5, 9, 11, 9, 1, "#a07a4a"); };
  ICON.hammer = () => (g) => { line(g, 3, 14, 10, 7, 2, "#8a5a2a"); poly(g, [[7, 2], [13, 8], [11, 10], [5, 4]], "#9aa0b0"); };
  ICON.shop = () => (g) => { rect(g, 2, 6, 12, 9, "#a0682a"); poly(g, [[1, 6], [3, 2], [13, 2], [15, 6]], "#ff5a6a"); rect(g, 6, 9, 4, 6, "#3a2a1a"); };
  ICON.person = () => (g) => { circ(g, 8, 5, 3.4, "#f8d8c4"); poly(g, [[3, 15], [5, 9], [11, 9], [13, 15]], "#5ab8ff"); };
  ICON.door = () => (g) => { rect(g, 3, 1, 10, 14, "#7a4aff"); rect(g, 5, 3, 6, 12, "#2a1a5a"); circ(g, 9, 9, 1, "#ffd84a"); };
  ICON.save = () => (g) => { rect(g, 2, 2, 12, 12, "#5ab8ff"); rect(g, 4, 2, 8, 4, "#e8f4ff"); rect(g, 4, 9, 8, 5, "#1a2a4a"); };
  ICON.home = () => (g) => { poly(g, [[1, 8], [8, 1], [15, 8]], "#ff6a5a"); rect(g, 3, 8, 10, 7, "#e8d8b8"); rect(g, 7, 10, 3, 5, "#6a4a2a"); };
  ICON.close = () => (g) => { line(g, 3, 3, 13, 13, 2.4, "#ffffff"); line(g, 13, 3, 3, 13, 2.4, "#ffffff"); };
  ICON.back = () => (g) => { poly(g, [[2, 8], [8, 2], [8, 6], [14, 6], [14, 10], [8, 10], [8, 14]], "#ffffff"); };
  ICON.music = () => (g) => { rect(g, 6, 2, 2, 10, "#ffd84a"); rect(g, 6, 2, 7, 2, "#ffd84a"); rect(g, 11, 2, 2, 8, "#ffd84a"); circ(g, 5, 12, 2.6, "#ffd84a"); circ(g, 10, 10, 2.6, "#ffd84a"); };
  ICON.mission = () => (g) => { rect(g, 2, 2, 12, 13, "#e8d8b8"); [4, 8, 12].forEach((y) => { rect(g, 4, y - 1, 2, 2, "#4fe39a"); line(g, 7, y, 12, y, 1, "#6a5a3a"); }); };
  ICON.abyss = () => (g) => { ell(g, 8, 8, 7, 7, "#2a1a4a"); ell(g, 8, 8, 4.5, 4.5, "#7a4aff"); ell(g, 8, 8, 2, 2, "#05030a"); };
  ICON.tree = () => (g) => { line(g, 8, 15, 8, 9, 2, "#8a5a2a"); line(g, 8, 11, 4, 7, 1.4, "#8a5a2a"); line(g, 8, 11, 12, 7, 1.4, "#8a5a2a"); circ(g, 4, 5, 2.4, "#ff6a5a"); circ(g, 12, 5, 2.4, "#5ab8ff"); circ(g, 8, 3, 2.4, "#ffcc3a"); };
  ICON.dash = () => (g) => { poly(g, [[2, 8], [9, 2], [9, 6], [14, 6], [14, 10], [9, 10], [9, 14]], "#e8f4ff"); line(g, 1, 4, 5, 4, 1, "#9ad8ff"); line(g, 1, 12, 5, 12, 1, "#9ad8ff"); };
  ICON.ult = () => (g) => { poly(g, [[8, 0], [10, 6], [16, 6], [11, 10], [13, 16], [8, 12], [3, 16], [5, 10], [0, 6], [6, 6]], "#ff6aa8"); circ(g, 8, 8, 2, "#ffffff"); };
  ICON.burst = () => (g) => { for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; line(g, 8, 8, 8 + Math.cos(a) * 7, 8 + Math.sin(a) * 7, 1.6, i % 2 ? "#7fd0ff" : "#ffffff"); } circ(g, 8, 8, 3, "#7fd0ff"); };
  ICON.attack = () => (g) => { line(g, 2, 14, 13, 3, 2.4, "#ffffff"); poly(g, [[13, 3], [10, 3], [13, 6]], "#ffffff"); line(g, 3, 9, 7, 13, 2, "#c8a040"); };
  ICON.lock = () => (g) => { g.strokeStyle = "#c8c8d8"; g.lineWidth = 2; g.beginPath(); g.arc(8, 6, 3.4, Math.PI, 0); g.stroke(); rect(g, 3, 6, 10, 9, "#c8a040"); rect(g, 7, 9, 2, 3, "#3a2a1a"); };
  ICON.info = () => (g) => { circ(g, 8, 8, 7, "#5ab8ff"); rect(g, 7, 7, 2, 6, "#ffffff"); rect(g, 7, 3, 2, 2, "#ffffff"); };
  /* ★★ 2026-10-05 キャラごとのスキル（Q）のアイコン（ご指定「技などの具体的なアイコン」） */
  const ring = (g, x, y, r, w, c, a0, a1) => { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.arc(x, y, r, a0 == null ? 0 : a0, a1 == null ? TAU : a1); g.stroke(); };
  const eRing = (g, x, y, rx, ry, w, c) => { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.stroke(); };
  ICON.sk_ripple = () => (g) => { eRing(g, 8, 11, 7, 3.4, 1.2, "#38a6ff"); eRing(g, 8, 11, 4, 1.8, 1.2, "#7fd0ff"); poly(g, [[8, 1], [11, 6], [10.5, 8], [8, 9.5], [5.5, 8], [5, 6]], "#9ad8ff"); px(g, 7, 5, "#ffffff"); };
  ICON.sk_prism = () => (g) => { line(g, 1, 6, 6, 9, 1.4, "#ffffff"); poly(g, [[8, 2], [13, 12], [3, 12]], "#c8f8ff"); poly(g, [[8, 5], [11, 11], [5, 11]], "#8ae0d0"); line(g, 11, 8, 16, 5, 1.2, "#ff5d47"); line(g, 11.5, 9, 16, 8, 1.2, "#f0b429"); line(g, 12, 10, 16, 11, 1.2, "#2fbf71"); line(g, 12, 11, 16, 14, 1.2, "#38a6ff"); };
  ICON.sk_hoop = () => (g) => { rect(g, 2, 1, 12, 6, "#e8f0ff"); rect(g, 6, 3, 4, 3, "#ff6a3a"); eRing(g, 8, 8, 4, 1.2, 1.3, "#ff6a3a"); line(g, 5, 9, 6.5, 12, 0.8, "#ffffff"); line(g, 11, 9, 9.5, 12, 0.8, "#ffffff"); circ(g, 12, 13, 2.6, "#ff8a3a"); line(g, 9.6, 13, 14.4, 13, 0.6, "#5a2a10"); };
  ICON.sk_umbrella = () => (g) => { poly(g, [[1, 8], [3, 4], [8, 2], [13, 4], [15, 8], [12, 7], [10.5, 8.5], [8, 7], [5.5, 8.5], [4, 7]], "#e8203a"); poly(g, [[8, 2], [10, 7], [8, 7], [6, 7]], "#ff8a9a"); line(g, 8, 7, 8, 14, 1.2, "#c8985a"); line(g, 8, 14, 6.5, 15, 1.2, "#c8985a"); [[3, 11], [13, 11], [11, 14], [4, 15]].forEach(([x, y]) => line(g, x, y, x - 0.6, y + 1.6, 0.9, "#ff6a8a")); };
  ICON.sk_mirage = () => (g) => { [0, 1].forEach((k) => { const o = k * 3, c = k ? "#ffb03a" : "rgba(255,120,60,.45)"; for (let i = 0; i < 3; i++) line(g, 3 + i * 3 + o - 3, 3, 1 + i * 3 + o - 3 + 4, 14, 1.3, c); }); circ(g, 13, 4, 1.4, "#fff0a0"); };
  ICON.sk_clone = () => (g) => { circ(g, 5, 5, 2.6, "#5a3a8a"); poly(g, [[1.5, 15], [2.5, 8], [7.5, 8], [8.5, 15]], "#5a3a8a"); circ(g, 10.5, 5, 2.8, "#a86bff"); poly(g, [[6.5, 15], [7.5, 8], [13.5, 8], [14.5, 15]], "#a86bff"); px(g, 11, 5, "#ffffff"); };
  ICON.sk_rose = () => (g) => { line(g, 8, 9, 7, 15, 1.2, "#2f8a4a"); poly(g, [[7, 12], [4, 11], [6, 13.5]], "#2fbf71"); circ(g, 8, 6, 5, "#2a5ad0"); circ(g, 8, 6, 3.4, "#4a8aff"); ring(g, 8, 6, 2, 1, "#1a3a9a", 0.5, 5); circ(g, 8.4, 5.6, 0.9, "#c4e8ff"); };
  ICON.sk_fanfare = () => (g) => { poly(g, [[1, 9], [6, 8], [10, 5], [10, 13], [6, 10], [1, 10]], "#ffd84a"); rect(g, 3, 10, 2, 3, "#c89a20"); rect(g, 10, 5, 1, 8, "#fff0a0"); rect(g, 13, 1, 1, 5, "#ffffff"); circ(g, 12.4, 6, 1.4, "#ffffff"); rect(g, 14, 7, 1, 4, "#ff8fd0"); circ(g, 13.4, 11, 1.3, "#ff8fd0"); };
  ICON.sk_wave = () => (g) => { ring(g, 3, 8, 9, 2.6, "#ff3a4a", -1.0, 1.0); ring(g, 1, 8, 9, 1.2, "#ffd0c0", -0.8, 0.8); line(g, 0, 8, 6, 8, 1, "#ff8a6a"); };
  /* ★★ 2026-10-07 ヒバナ（勿忘草の花とバリア）・フキ（朧月と夜桜）のスキル／通常攻撃のアイコン */
  ICON.sk_forget = () => (g) => { ring(g, 8, 8, 6.6, 1.2, "#7fe8a8"); for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * TAU / 5; circ(g, 8 + Math.cos(a) * 3.2, 8 + Math.sin(a) * 3.2, 2.2, k % 2 ? "#8ab8ff" : "#5a8eff"); } circ(g, 8, 8, 1.6, "#fff3a0"); px(g, 7, 7, "#ffffff"); };
  ICON.sk_veil = () => (g) => { circ(g, 6, 6, 4.6, "#f0e8ff"); circ(g, 8, 5, 4.2, "#2a1f4a"); [[11, 9], [13, 12], [9, 13], [12, 4]].forEach(([x, y], i) => { poly(g, [[x, y - 1.6], [x + 1.4, y], [x, y + 1.6], [x - 1.4, y]], i % 2 ? "#ffc4dc" : "#b9a8ff"); }); line(g, 2, 14, 14, 14, 1, "rgba(185,168,255,.7)"); };
  ICON.at_spark = () => (g) => { [[4, 11], [8, 6], [12, 10], [7, 12], [11, 4]].forEach(([x, y], i) => { line(g, x - 1.6, y, x + 1.6, y, 1, i % 2 ? "#7fe8a8" : "#6fa8ff"); line(g, x, y - 1.6, x, y + 1.6, 1, i % 2 ? "#7fe8a8" : "#6fa8ff"); px(g, x, y, "#ffffff"); }); };
  ICON.at_yoipetal = () => (g) => { [[3, 12, "#b9a8ff"], [7, 8, "#ffc4dc"], [11, 4, "#b9a8ff"], [12, 11, "#ffc4dc"]].forEach(([x, y, c]) => { poly(g, [[x, y - 2.4], [x + 2, y], [x, y + 2.4], [x - 2, y]], c); }); line(g, 1, 15, 15, 1, 0.8, "rgba(255,255,255,.5)"); };
  ICON.sk_wall = () => (g) => { rect(g, 9, 1, 4, 14, "#38a6ff"); rect(g, 10, 1, 1, 14, "#c4e8ff"); poly(g, [[2, 4], [7, 3], [8, 8], [7, 13], [2, 12]], "#9ab0d0"); poly(g, [[3, 5], [6, 4.5], [6.8, 8], [6, 11.5], [3, 11]], "#d8e4f8"); };
  /* ★★ 2026-10-09 Pumpkin Night のアイコン（カボチャ・魔女帽・飴・四つ葉・燭台・こうもり・おばけ） */
  ICON.pn_pumpkin = () => (g) => { circ(g, 8, 9.5, 6, "#ff8a1f"); ell(g, 5.2, 9.5, 2.2, 5.6, "#ff9f3a"); ell(g, 10.8, 9.5, 2.2, 5.6, "#ff9f3a"); rect(g, 7, 2, 2, 3, "#3a7a2a"); poly(g, [[4.5, 8], [6.5, 8], [5.5, 6.4]], "#3a1a08"); poly(g, [[9.5, 8], [11.5, 8], [10.5, 6.4]], "#3a1a08"); poly(g, [[4.5, 11], [11.5, 11], [10, 13], [6, 13]], "#3a1a08"); px(g, 7, 12, "#ffd257"); px(g, 9, 12, "#ffd257"); };
  ICON.pn_hat = () => (g) => { ell(g, 8, 13, 7, 2, "#2a1a3a"); poly(g, [[4, 13], [12, 13], [10, 6], [12, 2], [7, 5]], "#3a2a5a"); rect(g, 4, 11, 8, 2, "#ff5a3c"); px(g, 11, 3, "#ffd257"); };
  ICON.pn_candy = () => (g) => { line(g, 9, 9, 14, 15, 1.4, "#f4f4f4"); circ(g, 7, 7, 5.2, "#ff8a1f"); ring(g, 7, 7, 3.2, 1.3, "#ffd257"); ring(g, 7, 7, 1.4, 1, "#ff6aa8"); px(g, 5, 5, "#ffffff"); };
  ICON.pn_clover = () => (g) => { [[5.2, 5.2], [10.8, 5.2], [5.2, 10.8], [10.8, 10.8]].forEach(([x, y]) => circ(g, x, y, 3.2, "#3dd17a")); circ(g, 8, 8, 2, "#1f8a44"); line(g, 9, 10, 13, 15, 1.2, "#1f8a44"); px(g, 4, 4, "#d8ffe8"); };
  ICON.pn_candle = () => (g) => { rect(g, 6, 7, 4, 8, "#f4ecd8"); rect(g, 6, 7, 1, 8, "#d8ccb4"); ell(g, 8, 4, 1.8, 3, "#ff8a1f"); ell(g, 8, 4.6, 0.9, 1.6, "#ffd257"); rect(g, 4, 14, 8, 1.5, "#c8a040"); };
  ICON.pn_bat = () => (g) => { poly(g, [[1, 6], [5, 8], [6, 6], [8, 9], [10, 6], [11, 8], [15, 6], [13, 11], [10, 10], [8, 12], [6, 10], [3, 11]], "#3a2a5a"); px(g, 7, 9, "#ff3a3a"); px(g, 9, 9, "#ff3a3a"); };
  ICON.pn_ghost = () => (g) => { circ(g, 8, 7, 5, "#f4f4ff"); poly(g, [[3, 7], [13, 7], [13, 14], [11, 12.5], [9.5, 14], [8, 12.5], [6.5, 14], [5, 12.5], [3, 14]], "#f4f4ff"); circ(g, 6.2, 7, 1, "#2a1a3a"); circ(g, 9.8, 7, 1, "#2a1a3a"); ell(g, 8, 9.6, 1.2, 0.8, "#c06bff"); };
  /* 通常攻撃の型のアイコン */
  ICON.at_gun = () => (g) => { rect(g, 2, 5, 11, 3, "#3a3c4c"); rect(g, 12, 5, 3, 2, "#2a2c38"); poly(g, [[3, 8], [7, 8], [6, 14], [2, 14]], "#262833"); rect(g, 7, 8, 2, 2, "#4f8fe0"); rect(g, 3, 5, 9, 1, "#d8ecff"); px(g, 15, 5, "#7fd0ff"); };
  ICON.at_fan = () => (g) => { [-0.5, 0, 0.5].forEach((a) => { const c = Math.cos(a - Math.PI / 4), s = Math.sin(a - Math.PI / 4); line(g, 3, 13, 3 + c * 12, 13 + s * 12, 1.8, "#4fe39a"); line(g, 3, 13, 3 + c * 12, 13 + s * 12, 0.7, "#e0fff0"); }); };
  ICON.at_ball = () => (g) => { circ(g, 8, 8, 6.5, "#ff8a3a"); line(g, 1.5, 8, 14.5, 8, 0.8, "#5a2a10"); line(g, 8, 1.5, 8, 14.5, 0.8, "#5a2a10"); ring(g, 2, 8, 6.5, 0.8, "#5a2a10", -0.9, 0.9); ring(g, 14, 8, 6.5, 0.8, "#5a2a10", Math.PI - 0.9, Math.PI + 0.9); px(g, 5, 4, "#ffd0a0"); };
  ICON.at_petal = () => (g) => { [[5, 6, "#e8203a"], [11, 5, "#ff5a6a"], [8, 11, "#ff8a9a"]].forEach(([x, y, c]) => { poly(g, [[x, y - 3], [x + 3, y], [x, y + 3], [x - 3, y]], c); }); circ(g, 8, 7.5, 1.4, "#ffe86a"); };
  ICON.at_claw = () => (g) => { for (let i = 0; i < 3; i++) { line(g, 3 + i * 4, 2, 1 + i * 4, 14, 1.8, "#ff6a2a"); line(g, 3 + i * 4, 2, 1 + i * 4, 14, 0.6, "#ffe0a0"); } };
  ICON.at_orb = () => (g) => { line(g, 1, 14, 7, 9, 1.6, "rgba(168,107,255,.55)"); line(g, 3, 15, 8, 11, 1, "rgba(168,107,255,.4)"); circ(g, 10, 6, 4.6, "#5a2a9a"); circ(g, 10, 6, 2.8, "#a86bff"); circ(g, 9, 5, 1, "#ffffff"); };
  ICON.at_wave = () => (g) => { for (let i = 0; i < 3; i++) ring(g, 1, 8, 4 + i * 4, 1.3, i === 1 ? "#ffd84a" : "#ff8fd0", -0.8, 0.8); circ(g, 2, 8, 1.6, "#ffffff"); };
  ICON.at_rapier = () => (g) => { line(g, 3, 13, 15, 1, 1, "#d8ecff"); ring(g, 4.5, 11.5, 2.4, 1.2, "#ffd84a", 0, TAU); line(g, 1, 15, 4, 12, 1.6, "#3a2a6a"); px(g, 15, 1, "#ffffff"); };
  ICON.at_crescent = () => (g) => { ring(g, 6, 8, 7, 3, "#ff3a4a", -1.3, 1.3); ring(g, 6, 8, 7, 1, "#ffe0d0", -1.1, 1.1); };
  ICON.ultc = (c) => (g) => { poly(g, [[8, 0], [10, 6], [16, 6], [11, 10], [13, 16], [8, 12], [3, 16], [5, 10], [0, 6], [6, 6]], c || "#ff6aa8"); poly(g, [[8, 3], [9.2, 7], [12.5, 7], [9.8, 9.4], [10.8, 13], [8, 10.6], [5.2, 13], [6.2, 9.4], [3.5, 7], [6.8, 7]], P.mix(c || "#ff6aa8", "#ffffff", 0.55)); circ(g, 8, 8.4, 1.4, "#ffffff"); };
  /* 能力のアイコン（キャラ詳細の表） */
  ICON.st_hp = () => (g) => { circ(g, 5, 6, 3.6, "#ff5a7a"); circ(g, 11, 6, 3.6, "#ff5a7a"); poly(g, [[1.6, 7], [14.4, 7], [8, 14.5]], "#ff5a7a"); px(g, 4, 4, "#ffffff"); };
  ICON.st_atk = () => (g) => { line(g, 3, 13, 13, 3, 2.2, "#e8eef8"); line(g, 3, 13, 13, 3, 0.8, "#ffffff"); line(g, 2, 10, 6, 14, 2, "#c8a040"); line(g, 1, 15, 3, 13, 2, "#6a4a2a"); };
  ICON.st_def = () => (g) => { poly(g, [[8, 1], [14, 3], [13, 10], [8, 15], [3, 10], [2, 3]], "#5a8ad0"); poly(g, [[8, 3], [12, 4.5], [11, 9.5], [8, 13], [5, 9.5], [4, 4.5]], "#a8c8f0"); };
  ICON.st_spd = () => (g) => { poly(g, [[3, 3], [8, 3], [8, 9], [14, 10], [14, 14], [3, 14]], "#4fe39a"); rect(g, 3, 13, 11, 2, "#1f6a4a"); line(g, 0, 6, 2, 6, 1, "#c8ffe2"); line(g, 0, 9, 2, 9, 1, "#c8ffe2"); };
  ICON.st_time = () => (g) => { circ(g, 8, 8, 7, "#e8e0d0"); circ(g, 8, 8, 5.6, "#2a2240"); line(g, 8, 8, 8, 4, 1.4, "#ffd84a"); line(g, 8, 8, 11, 9.5, 1.4, "#ffffff"); px(g, 8, 2, "#ffffff"); };
  ICON.gem = () => (g) => { poly(g, [[4, 2], [12, 2], [15, 6], [8, 15], [1, 6]], "#5ad8ff"); poly(g, [[4, 2], [8, 6], [12, 2]], "#c8f4ff"); poly(g, [[1, 6], [8, 6], [8, 15]], "#3aa8e8"); line(g, 1, 6, 15, 6, 0.8, "#e8fbff"); };
  ICON.hard = () => (g) => { poly(g, [[8, 1], [15, 14], [1, 14]], "#ff3a4a"); rect(g, 7, 5, 2, 5, "#ffffff"); rect(g, 7, 11, 2, 2, "#ffffff"); };
  ICON.normal = () => (g) => { circ(g, 8, 8, 7, "#4fe39a"); line(g, 4, 8, 7, 11, 2, "#ffffff"); line(g, 7, 11, 12, 5, 2, "#ffffff"); };
  ICON.check = () => (g) => { line(g, 2, 8, 6, 12, 2.4, "#4fe39a"); line(g, 6, 12, 14, 3, 2.4, "#4fe39a"); };
  const iconCache = {};
  function icon(name, col, size) {
    const k = name + "|" + (col || "") + "|" + (size || 16);
    if (iconCache[k]) return iconCache[k];
    const f = ICON[name] || ICON.info;
    const s = size || 16;
    const r = P.pixelize(s, s, (g) => { if (s !== 16) g.scale(s / 16, s / 16); f(col)(g); }, { outline: "#120a18", thr: 100 });
    const url = r.canvas.toDataURL();
    iconCache[k] = url;
    return url;
  }
  /* <img> の HTML（拡大してもぼやけない） */
  function iconHTML(name, col, cls) { return '<img class="pxi' + (cls ? " " + cls : "") + '" src="' + icon(name, col) + '" alt="">'; }

  /* ── 開発用：一覧を描く（tools/sprites.html?m=enemies 等） ── */
  function devSheet(mode, out, S, big) {
    const add = (lbl, c) => { const row = document.createElement("div"); row.className = "row"; const l = document.createElement("div"); l.className = "lbl"; l.textContent = lbl; row.appendChild(l); (Array.isArray(c) ? c : [c]).forEach((x) => row.appendChild(big(x, S))); out.appendChild(row); };
    if (mode === "enemies") Object.keys(ART).forEach((k) => { if (/^b[A-Z]/.test(k)) return; const s = sprite(k); add(k, s.frames); });
    if (mode === "bosses") Object.keys(ART).filter((k) => /^b[A-Z]/.test(k)).forEach((k) => add(k, sprite(k).frames));
    if (mode === "tiles") Object.keys(BIOME).forEach((b) => { const T = tiles(b); add(b, T.floor.concat([T.top, T.face, T.poison, T.ice, T.lava, T.rune, T.taint, T.water, T.carpet])); });
    if (mode === "deco") ["tree", "crystal", "rock", "shelf", "void", "starpillar", "barrel", "bush", "statue"].forEach((k) => add(k, deco(k, 0).frames));
    if (mode === "icons") {
      const names = Object.keys(ICON);
      for (let i = 0; i < names.length; i += 14) {
        const row = document.createElement("div"); row.className = "row";
        names.slice(i, i + 14).forEach((n) => { const im = new Image(); im.src = icon(n, n === "seal" ? "#ff6a3d" : null); im.width = 16 * S; im.style.imageRendering = "pixelated"; im.title = n; row.appendChild(im); });
        out.appendChild(row);
      }
    }
  }

  MA.Art = { sprite, tiles, deco, icon, iconHTML, BIOME, ART, ICON, devSheet, rng };
})();
