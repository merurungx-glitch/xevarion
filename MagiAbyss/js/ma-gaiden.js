/* ============================================================
   MagiAbyss — ma-gaiden.js（外伝クエスト・ストーリー）★★ 2026-10-27 新規
   ------------------------------------------------------------
   ご指定「ストーリーをより充実したものに増やして、クエストも追加。ただし、追加のクエストの敵キャラは新たなものとし、
          5属性が全体のクエストで同じくらい有利なクエストがあるように設計」
   ■ 外伝クエスト（海に浮かぶ「異界の島」）6つ：第10〜第15迷宮
       それまでの9つは、ボスの属性で数えると「有利になる属性」が 火1・木1・水2・闇2・光3 と偏っていた。
       （火→木→水→火・光⇔闇。木のボスには火が有利 … ADV を参照）
       → 木のボス2・水のボス2・火のボス1・光のボス1 を足して、<b>5属性すべて3つずつ</b>にそろえた：
           火が有利（木のボス）… 第1・第10・第14 ／ 木が有利（水のボス）… 第2・第11・第15
           水が有利（火のボス）… 第3・第8・第12 ／ 闇が有利（光のボス）… 第4・第6・第13
           光が有利（闇のボス）… 第5・第7・第9
       強さは本編のあいだに入る（解放：第2→第10・第3→第11・第4→第12・第5→第13・第7→第14・第8→第15）。
       報酬の段は tier（本編の番号の間の数）＝ ma-prog / ma-cards が no の代わりに使う。
   ■ 敵はすべて新しい（雑魚4種・エリート＝中ボス1種・ボス1体 × 6島＝絵も新しく描いた）
   ■ ストーリー：本編の章を厚くし（町の人たちの会話）、第7〜第9迷宮の章と外伝6章（旅の星読みセツナ）を足した
   ★ ma-data.js のあと・ma-art.js のあとに読む（MA.D と MA.Art.ART に足す）。
   ============================================================ */
(function () {
  "use strict";
  const MA = (window.MA = window.MA || {});
  const D = MA.D, P = MA.Pix, ART = MA.Art && MA.Art.ART;
  if (!D || !P || !ART) return;
  const TAU = Math.PI * 2;

  /* ══ 描く道具（ma-art.js と同じ） ══ */
  function ell(g, x, y, rx, ry, c) { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, TAU); g.fill(); }
  function circ(g, x, y, r, c) { ell(g, x, y, r, r, c); }
  function rect(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }
  function poly(g, pts, c) { g.fillStyle = c; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fill(); }
  function line(g, x1, y1, x2, y2, w, c) { g.strokeStyle = c; g.lineWidth = w; g.lineCap = "round"; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
  function px(g, x, y, c) { g.fillStyle = c; g.fillRect(x, y, 1, 1); }
  function bufOf(c) { const g = c.getContext("2d"); return { w: c.width, h: c.height, d: g.getImageData(0, 0, c.width, c.height).data }; }
  function bob(buf, h) { return P.shiftWhere(buf, (x, y) => y < h - 2, 0, 1); }
  function make(w, h, draw, pal, outline, anim) {
    const r = P.pixelize(w, h, draw, { pal, outline: outline || "#120a18" });
    const frames = [r.canvas];
    if (anim !== false) frames.push(P.bufToCanvas(anim ? anim(r.buf) : bob(r.buf, h)));
    return { frames, w, h, white: frames.map((f) => P.bufToCanvas(P.whiteOf(bufOf(f)))) };
  }
  const legs = (b) => P.shiftWhere(b, (x, y) => y >= b.h - 4 && x % 4 < 2, 0, -1);
  const wingBeat = (b) => P.shiftWhere(b, (x, y) => y < b.h / 2, 0, -1);

  /* ══════════════════════════════════════════════════════════════
     敵の絵（すべて新しい）
     ══════════════════════════════════════════════════════════════ */
  /* ── 第10迷宮 胞子舞う茸の島（木）── */
  ART.mushling = () => make(14, 16, (g) => {
    ell(g, 7, 6, 6.5, 4.6, "#e84a4a"); ell(g, 7, 8, 6, 2, "#b8302e");
    circ(g, 4, 4.6, 1.3, "#fff4e0"); circ(g, 9.6, 3.8, 1.5, "#fff4e0"); circ(g, 7.2, 6.6, 0.9, "#fff4e0");
    rect(g, 4.5, 9, 5, 5, "#f2e2c0"); rect(g, 4.5, 12.6, 5, 1.4, "#d8c49a");
    px(g, 5, 10, "#1a1020"); px(g, 8, 10, "#1a1020"); px(g, 4, 11, "#ff9a9a"); px(g, 9, 11, "#ff9a9a");
    rect(g, 3.6, 14, 2.4, 2, "#8a6a4a"); rect(g, 8, 14, 2.4, 2, "#8a6a4a");
  }, ["#e84a4a", "#b8302e", "#fff4e0", "#f2e2c0", "#d8c49a", "#1a1020", "#ff9a9a", "#8a6a4a"], null, legs);
  ART.sporePuff = () => make(12, 12, (g) => {
    circ(g, 6, 6.5, 5, "#9ad860"); circ(g, 6, 7.5, 4, "#78b844"); circ(g, 4.5, 4.5, 1.6, "#d8f8a0");
    px(g, 3, 7, "#e8ff9a"); px(g, 8, 5, "#e8ff9a"); px(g, 7, 9, "#e8ff9a");
    px(g, 4.5, 6.5, "#1a2010"); px(g, 7.5, 6.5, "#1a2010");
  }, ["#9ad860", "#78b844", "#d8f8a0", "#e8ff9a", "#1a2010"], null, (b) => P.shiftWhere(b, () => true, 0, -1));
  ART.vineSnake = () => make(20, 11, (g) => {
    line(g, 2, 8, 6, 5, 3, "#4f9a3a"); line(g, 6, 5, 10, 8, 3, "#4f9a3a"); line(g, 10, 8, 14, 5, 3, "#4f9a3a");
    circ(g, 16, 4.5, 3, "#5fb048"); poly(g, [[14, 2], [15, 0], [17, 2]], "#9ae060"); poly(g, [[16, 2], [19, 0], [18, 3]], "#9ae060");
    px(g, 17, 4, "#ffe04a"); line(g, 18.5, 5.5, 20, 6, 0.8, "#ff4a6a");
    px(g, 5, 4, "#b8f080"); px(g, 9, 7, "#b8f080"); px(g, 13, 4, "#b8f080");
  }, ["#4f9a3a", "#5fb048", "#9ae060", "#ffe04a", "#ff4a6a", "#b8f080"], null, (b) => P.shiftWhere(b, (x) => x < 12, 0, 1));
  ART.beeKnight = () => make(16, 15, (g) => {
    ell(g, 4, 4, 3.4, 2.2, "rgba(230,250,255,0.9)"); ell(g, 10, 3.6, 3.4, 2.2, "rgba(230,250,255,0.9)");
    ell(g, 8, 9, 5, 4, "#ffd23a"); rect(g, 5, 8, 6, 1.4, "#2a1e10"); rect(g, 5.5, 10.4, 5, 1.4, "#2a1e10");
    circ(g, 12, 6.4, 2.8, "#ffd23a"); px(g, 12.6, 6, "#1a1020"); line(g, 12, 3.6, 11, 1.4, 0.8, "#2a1e10");
    poly(g, [[3, 10], [0, 12], [3.6, 11.6]], "#c8c8d8"); line(g, 14, 9, 16, 14, 1.2, "#c8a040");
  }, ["#e6faff", "#ffd23a", "#2a1e10", "#1a1020", "#c8c8d8", "#c8a040"], null, wingBeat);
  ART.queenBee = () => make(28, 26, (g) => {
    ell(g, 7, 8, 7, 4, "rgba(230,250,255,0.9)"); ell(g, 21, 8, 7, 4, "rgba(230,250,255,0.9)");
    ell(g, 14, 17, 8, 7, "#ffcc2a"); rect(g, 7, 14, 14, 2, "#2a1e10"); rect(g, 8, 18, 12, 2, "#2a1e10"); poly(g, [[12, 23], [14, 27], [16, 23]], "#2a1e10");
    circ(g, 14, 8, 5, "#ffd84a"); rect(g, 11, 7, 2, 2, "#1a1020"); rect(g, 15, 7, 2, 2, "#1a1020"); px(g, 11, 7, "#ffffff"); px(g, 15, 7, "#ffffff");
    poly(g, [[9, 4], [10, 0], [12, 3], [14, 0], [16, 3], [18, 0], [19, 4]], "#ff6ab0"); px(g, 14, 2, "#ffffff");
    line(g, 24, 13, 27, 24, 1.6, "#e8c060"); circ(g, 27, 12, 1.6, "#ff6ab0");
  }, ["#e6faff", "#ffcc2a", "#2a1e10", "#ffd84a", "#1a1020", "#ffffff", "#ff6ab0", "#e8c060"], null, wingBeat);

  /* ── 第11迷宮 凍てつく潮の島（水）── */
  ART.frostCrab = () => make(20, 13, (g) => {
    ell(g, 10, 8, 7, 4.4, "#5ab0e8"); ell(g, 10, 6.6, 5.6, 2.6, "#b8e8ff"); poly(g, [[7, 5], [9, 2], [11, 5]], "#e8f8ff"); poly(g, [[10, 5], [12, 1.6], [13.4, 5]], "#e8f8ff");
    circ(g, 2.6, 5, 2.4, "#3a8ad0"); circ(g, 17.4, 5, 2.4, "#3a8ad0"); rect(g, 1, 3, 2, 1.4, "#e8f8ff"); rect(g, 17, 3, 2, 1.4, "#e8f8ff");
    px(g, 8, 6, "#1a1020"); px(g, 12, 6, "#1a1020");
    rect(g, 4, 11, 2, 2, "#2a6aa8"); rect(g, 8, 11.6, 2, 1.4, "#2a6aa8"); rect(g, 11, 11.6, 2, 1.4, "#2a6aa8"); rect(g, 15, 11, 2, 2, "#2a6aa8");
  }, ["#5ab0e8", "#b8e8ff", "#e8f8ff", "#3a8ad0", "#1a1020", "#2a6aa8"], null, legs);
  ART.snowJelly = () => make(14, 17, (g) => {
    ell(g, 7, 6, 6, 5, "rgba(170,236,255,0.92)"); ell(g, 7, 5, 4.4, 3.2, "#e0f8ff"); px(g, 5, 4, "#ffffff");
    for (let i = 0; i < 4; i++) line(g, 3.6 + i * 2.2, 10, 3 + i * 2.6, 16, 1, "#8ad8f8");
    px(g, 5, 7, "#2a4a8a"); px(g, 9, 7, "#2a4a8a"); px(g, 4, 8, "#ffb0c8"); px(g, 10, 8, "#ffb0c8");
  }, ["#aaecff", "#e0f8ff", "#ffffff", "#8ad8f8", "#2a4a8a", "#ffb0c8"], null, (b) => P.shiftWhere(b, (x, y) => y > 9, 1, 0));
  ART.penguin = () => make(14, 17, (g) => {
    ell(g, 7, 10, 5, 6, "#2a3448"); ell(g, 7, 11, 3.4, 4.6, "#f2f6ff"); circ(g, 7, 4.6, 3.8, "#2a3448");
    px(g, 5.5, 4, "#ffffff"); px(g, 8.5, 4, "#ffffff"); poly(g, [[6, 5.6], [8, 5.6], [7, 7]], "#ffb03a");
    rect(g, 4, 0.4, 6, 2, "#5a8ad0"); px(g, 7, 0, "#ffe04a");
    line(g, 12, 3, 12.4, 15, 1.2, "#c8a060"); poly(g, [[11, 3], [12.2, 0], [13.4, 3]], "#e8f0ff");
    rect(g, 4, 15.6, 2.4, 1.4, "#ffb03a"); rect(g, 7.6, 15.6, 2.4, 1.4, "#ffb03a");
  }, ["#2a3448", "#f2f6ff", "#ffffff", "#ffb03a", "#5a8ad0", "#ffe04a", "#c8a060", "#e8f0ff"], null, legs);
  ART.iceFish = () => make(16, 10, (g) => {
    ell(g, 8, 5, 6, 3.6, "#7fd8ff"); ell(g, 8, 6, 5, 2, "#c8f0ff"); poly(g, [[2, 5], [0, 1.6], [0, 8.4]], "#4ab0e8");
    poly(g, [[7, 2], [9, 0], [10, 2]], "#e8f8ff"); px(g, 12, 4, "#1a1020"); px(g, 13, 6, "#2a6aa8");
  }, ["#7fd8ff", "#c8f0ff", "#4ab0e8", "#e8f8ff", "#1a1020", "#2a6aa8"], null, (b) => P.shiftWhere(b, (x) => x < 4, 0, 1));
  ART.orcaKnight = () => make(26, 26, (g) => {
    ell(g, 13, 15, 8, 9, "#1e2436"); ell(g, 13, 17, 5.4, 6.6, "#f2f6ff"); circ(g, 13, 7, 6, "#1e2436");
    ell(g, 10, 6, 1.8, 1.2, "#ffffff"); ell(g, 16, 6, 1.8, 1.2, "#ffffff"); px(g, 10, 6, "#1a1020"); px(g, 16, 6, "#1a1020");
    poly(g, [[11, 1], [13, -2], [15, 1]], "#1e2436"); rect(g, 7, 1.6, 12, 2, "#c8d8f0"); px(g, 13, 2, "#7fd0ff");
    rect(g, 1, 11, 5, 10, "#3a6ac8"); rect(g, 2, 12, 3, 8, "#7fb8ff"); line(g, 22, 3, 24, 24, 1.8, "#d8e4f0"); poly(g, [[21, 4], [23, -1], [25, 4]], "#e8f8ff");
    rect(g, 8, 23, 4, 3, "#1e2436"); rect(g, 14, 23, 4, 3, "#1e2436");
  }, ["#1e2436", "#f2f6ff", "#ffffff", "#1a1020", "#c8d8f0", "#7fd0ff", "#3a6ac8", "#7fb8ff", "#d8e4f0", "#e8f8ff"], null, legs);

  /* ── 第12迷宮 焔の祭壇島（火）── */
  ART.salamander = () => make(20, 12, (g) => {
    ell(g, 9, 7, 6.4, 3, "#ff6a2a"); circ(g, 15.6, 5.4, 3, "#ff7a3a"); line(g, 3, 7, 0, 4, 2.4, "#ff6a2a");
    poly(g, [[5, 4], [6, 1], [8, 4]], "#ffd04a"); poly(g, [[8, 4], [9.6, 0.6], [11, 4]], "#ffe86a"); poly(g, [[0, 4], [0, 0.6], [2, 3]], "#ffd04a");
    px(g, 16.6, 4.6, "#1a1020"); px(g, 18, 6, "#c82a1a");
    rect(g, 5, 9.6, 2, 2.4, "#c84a1a"); rect(g, 10, 9.6, 2, 2.4, "#c84a1a"); rect(g, 13, 9, 2, 2.4, "#c84a1a");
  }, ["#ff6a2a", "#ff7a3a", "#ffd04a", "#ffe86a", "#1a1020", "#c82a1a", "#c84a1a"], null, legs);
  ART.fireBat = () => make(18, 11, (g) => {
    poly(g, [[9, 5], [1, 1], [3, 5], [0, 8], [5, 7]], "#c8302a"); poly(g, [[9, 5], [17, 1], [15, 5], [18, 8], [13, 7]], "#c8302a");
    circ(g, 9, 6, 3, "#5a1a1a"); poly(g, [[7, 4], [7.4, 1.6], [8.4, 3.6]], "#5a1a1a"); poly(g, [[11, 4], [10.6, 1.6], [9.6, 3.6]], "#5a1a1a");
    px(g, 8, 6, "#ffe04a"); px(g, 10, 6, "#ffe04a"); circ(g, 9, 9.6, 1.2, "#ffb03a");
  }, ["#c8302a", "#5a1a1a", "#ffe04a", "#ffb03a"], null, wingBeat);
  ART.magmaDoll = () => make(20, 22, (g) => {
    rect(g, 5, 7, 10, 10, "#4a2a22"); rect(g, 6, 8, 8, 8, "#6a3a2a"); line(g, 7, 9, 12, 14, 1, "#ff8a2a"); line(g, 12, 9, 8, 15, 1, "#ffb03a");
    circ(g, 10, 4.6, 4, "#4a2a22"); rect(g, 8, 4, 1.4, 1.4, "#ffe04a"); rect(g, 11, 4, 1.4, 1.4, "#ffe04a"); line(g, 8, 6.4, 12, 6.4, 0.8, "#ff6a2a");
    rect(g, 0.6, 8, 4, 9, "#5a3226"); rect(g, 15.4, 8, 4, 9, "#5a3226"); rect(g, 1, 15, 3, 2, "#ff8a2a"); rect(g, 16, 15, 3, 2, "#ff8a2a");
    rect(g, 6, 17, 3, 5, "#4a2a22"); rect(g, 11, 17, 3, 5, "#4a2a22");
  }, ["#4a2a22", "#6a3a2a", "#ff8a2a", "#ffb03a", "#ffe04a", "#ff6a2a", "#5a3226"], null, legs);
  ART.flamePriest = () => make(16, 22, (g) => {
    poly(g, [[8, 2], [14, 21], [2, 21]], "#c8402a"); poly(g, [[8, 6], [11, 21], [5, 21]], "#ffd04a");
    circ(g, 8, 6, 3, "#f2d0b0"); poly(g, [[4, 5], [8, -1], [12, 5]], "#a02a1a"); px(g, 7, 6, "#1a1020"); px(g, 9, 6, "#1a1020");
    line(g, 13, 6, 14, 20, 1.2, "#a07040"); circ(g, 13.4, 5, 1.8, "#ff8a2a"); px(g, 13, 4, "#ffe86a");
  }, ["#c8402a", "#ffd04a", "#f2d0b0", "#a02a1a", "#1a1020", "#a07040", "#ff8a2a", "#ffe86a"]);
  ART.efreet = () => make(28, 30, (g) => {
    poly(g, [[14, 16], [9, 30], [14, 26], [19, 30]], "#ff8a2a"); ell(g, 14, 17, 9, 6, "#c8402a"); ell(g, 14, 16, 7, 4, "#ff6a2a");
    circ(g, 14, 8, 6, "#d84a2a"); rect(g, 10.6, 7, 2.4, 2, "#ffe86a"); rect(g, 15, 7, 2.4, 2, "#ffe86a"); line(g, 11, 11, 17, 11, 1, "#5a1a10");
    poly(g, [[8, 4], [9, -1], [11, 3]], "#ffd04a"); poly(g, [[20, 4], [19, -1], [17, 3]], "#ffd04a"); poly(g, [[12, 2], [14, -2], [16, 2]], "#ffe86a");
    circ(g, 3, 14, 3.4, "#d84a2a"); circ(g, 25, 14, 3.4, "#d84a2a"); circ(g, 3, 14, 1.6, "#ffe86a"); circ(g, 25, 14, 1.6, "#ffe86a");
    rect(g, 11, 13, 6, 2, "#ffd04a");
  }, ["#ff8a2a", "#c8402a", "#ff6a2a", "#d84a2a", "#ffe86a", "#5a1a10", "#ffd04a"], null, (b) => P.shiftWhere(b, (x, y) => y > 20, 1, 0));

  /* ── 第13迷宮 白亜の天文台（光）── */
  ART.cherub = () => make(16, 16, (g) => {
    ell(g, 3.6, 8, 3.4, 2.4, "#ffffff"); ell(g, 12.4, 8, 3.4, 2.4, "#ffffff");
    ell(g, 8, 10.6, 3.4, 4, "#fff2e0"); circ(g, 8, 6, 3.4, "#ffe0c8"); rect(g, 4.8, 3, 6.4, 2, "#ffe86a");
    ell(g, 8, 1.4, 3, 1, "#fff6a0"); px(g, 7, 6, "#3a6aff"); px(g, 9, 6, "#3a6aff"); px(g, 6, 7, "#ffb0b0"); px(g, 10, 7, "#ffb0b0");
    g.strokeStyle = "#e8c060"; g.lineWidth = 1; g.beginPath(); g.arc(13, 12, 3, -1.4, 1.4); g.stroke();
  }, ["#ffffff", "#fff2e0", "#ffe0c8", "#ffe86a", "#fff6a0", "#3a6aff", "#ffb0b0", "#e8c060"], null, wingBeat);
  ART.lampSprite = () => make(10, 13, (g) => {
    rect(g, 2, 4, 6, 6, "#e8c060"); rect(g, 3, 5, 4, 4, "#fff8c0"); circ(g, 5, 7, 1.4, "#ffb03a");
    poly(g, [[2, 4], [5, 1.4], [8, 4]], "#c89a3a"); rect(g, 4.4, 0, 1.2, 1.6, "#c89a3a"); rect(g, 2, 10, 6, 1.4, "#c89a3a");
    px(g, 4, 6, "#3a2a10"); px(g, 6, 6, "#3a2a10");
  }, ["#e8c060", "#fff8c0", "#ffb03a", "#c89a3a", "#3a2a10"], null, (b) => P.shiftWhere(b, () => true, 0, -1));
  ART.clockwork = () => make(18, 22, (g) => {
    rect(g, 4, 8, 10, 9, "#b8904a"); rect(g, 5, 9, 8, 7, "#d8b060"); circ(g, 9, 4.6, 4.4, "#c8a050"); circ(g, 9, 4.6, 3.2, "#fff6e0");
    line(g, 9, 4.6, 9, 2.4, 0.8, "#2a2010"); line(g, 9, 4.6, 10.8, 5.4, 0.8, "#2a2010"); circ(g, 9, 12.4, 1.8, "#8a6a2a"); circ(g, 9, 12.4, 0.8, "#fff6e0");
    rect(g, 0.6, 9, 3.4, 7, "#9a7a3a"); rect(g, 14, 9, 3.4, 7, "#9a7a3a"); rect(g, 5, 17, 3, 5, "#8a6a2a"); rect(g, 10, 17, 3, 5, "#8a6a2a");
  }, ["#b8904a", "#d8b060", "#c8a050", "#fff6e0", "#2a2010", "#8a6a2a", "#9a7a3a"], null, legs);
  ART.prismBeast = () => make(20, 14, (g) => {
    poly(g, [[3, 9], [8, 3], [14, 3], [18, 8], [13, 11], [6, 11]], "#c8e8ff"); poly(g, [[8, 3], [11, 7], [14, 3]], "#ffffff"); poly(g, [[3, 9], [8, 3], [11, 7]], "#a8c8ff");
    poly(g, [[15, 4], [17, 0], [18, 5]], "#ffd0ff"); px(g, 15, 6, "#3a3aa0");
    rect(g, 5, 11, 2, 3, "#8aa8e0"); rect(g, 9, 11, 2, 3, "#8aa8e0"); rect(g, 13, 10.6, 2, 3, "#8aa8e0");
  }, ["#c8e8ff", "#ffffff", "#a8c8ff", "#ffd0ff", "#3a3aa0", "#8aa8e0"], null, legs);
  ART.seraph = () => make(30, 30, (g) => {
    ell(g, 6, 9, 6, 3.4, "#ffffff"); ell(g, 24, 9, 6, 3.4, "#ffffff"); ell(g, 6, 15, 5, 2.6, "#f0f0ff"); ell(g, 24, 15, 5, 2.6, "#f0f0ff");
    poly(g, [[10, 12], [20, 12], [22, 28], [8, 28]], "#e8e0c8"); rect(g, 11, 13, 8, 8, "#c8c0e8"); circ(g, 15, 17, 2, "#ffe86a");
    circ(g, 15, 8, 4.4, "#ffe0c8"); rect(g, 10.6, 4, 8.8, 2.4, "#e8c060"); ell(g, 15, 1.6, 4, 1.2, "#fff6a0");
    px(g, 13.6, 8, "#3a6aff"); px(g, 16.4, 8, "#3a6aff");
    line(g, 25, 4, 26, 28, 1.6, "#d8dde6"); poly(g, [[24, 5], [25.6, 0], [27.2, 5]], "#ffe86a");
  }, ["#ffffff", "#f0f0ff", "#e8e0c8", "#c8c0e8", "#ffe86a", "#ffe0c8", "#e8c060", "#fff6a0", "#3a6aff", "#d8dde6"], null, wingBeat);

  /* ── 第14迷宮 千年桜の霊域（木）── */
  ART.foxfire = () => make(20, 14, (g) => {
    ell(g, 9, 8, 6, 3.4, "#fff4ec"); circ(g, 15, 6, 3.4, "#fff4ec"); poly(g, [[13, 3.4], [14, -0.4], [15.6, 3]], "#fff4ec"); poly(g, [[16, 3], [18.4, 0], [17.6, 4]], "#fff4ec");
    px(g, 14.4, 2, "#ff8ab0"); px(g, 17.4, 2, "#ff8ab0"); rect(g, 15, 5, 1.6, 1, "#c02a4a"); px(g, 18.6, 7, "#1a1020");
    poly(g, [[3, 7], [0, 2], [1.6, 8]], "#fff4ec"); circ(g, 1, 2, 2, "#7aff9a"); circ(g, 1, 2, 1, "#e8ffe8");
    rect(g, 4, 10.6, 2, 3.4, "#e8d8d0"); rect(g, 8, 10.6, 2, 3.4, "#e8d8d0"); rect(g, 11, 10.6, 2, 3.4, "#e8d8d0");
  }, ["#fff4ec", "#ff8ab0", "#c02a4a", "#1a1020", "#7aff9a", "#e8ffe8", "#e8d8d0"], null, legs);
  ART.petalSprite = () => make(11, 11, (g) => {
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU - Math.PI / 2; ell(g, 5.5 + Math.cos(a) * 3, 5.5 + Math.sin(a) * 3, 2.2, 2.2, i % 2 ? "#ffb0d0" : "#ffc8e0"); }
    circ(g, 5.5, 5.5, 1.8, "#ffe86a"); px(g, 4.6, 5.4, "#7a2a4a"); px(g, 6.4, 5.4, "#7a2a4a");
  }, ["#ffb0d0", "#ffc8e0", "#ffe86a", "#7a2a4a"], null, (b) => P.shiftWhere(b, (x) => x < 6, 0, 1));
  ART.kodamaOni = () => make(18, 22, (g) => {
    rect(g, 4, 8, 10, 9, "#5a9a4a"); rect(g, 5, 9, 8, 7, "#7aba5a"); rect(g, 5, 12, 8, 2, "#c8a050");
    circ(g, 9, 5, 4.4, "#7aba5a"); poly(g, [[7, 1.6], [8, -1.4], [9.4, 1.6]], "#fff0d0"); px(g, 7.4, 5, "#ffe86a"); px(g, 10.6, 5, "#ffe86a"); rect(g, 7.6, 7, 3, 1, "#2a3a1a");
    rect(g, 0.6, 9, 3.4, 7, "#5a9a4a"); line(g, 15, 3, 16.6, 19, 2.4, "#8a5a2a"); circ(g, 15.4, 3.4, 2, "#8a5a2a");
    rect(g, 5, 17, 3, 5, "#3a6a2a"); rect(g, 10, 17, 3, 5, "#3a6a2a");
  }, ["#5a9a4a", "#7aba5a", "#c8a050", "#fff0d0", "#ffe86a", "#2a3a1a", "#8a5a2a", "#3a6a2a"], null, legs);
  ART.tengu = () => make(18, 20, (g) => {
    poly(g, [[2, 6], [8, 9], [3, 13]], "#2a2a3a"); poly(g, [[16, 6], [10, 9], [15, 13]], "#2a2a3a");
    rect(g, 5, 9, 8, 8, "#e8e0d0"); rect(g, 5, 12, 8, 1.6, "#c83a4a"); circ(g, 9, 5.4, 3.6, "#d84a3a"); line(g, 10, 5.6, 14, 6.6, 1.6, "#d84a3a");
    rect(g, 6, 2, 6, 1.6, "#2a2a3a"); px(g, 8, 5, "#ffe86a"); rect(g, 6, 17, 2.4, 3, "#5a4a3a"); rect(g, 9.6, 17, 2.4, 3, "#5a4a3a");
    poly(g, [[13, 12], [17, 10], [16, 14]], "#7aba5a");
  }, ["#2a2a3a", "#e8e0d0", "#c83a4a", "#d84a3a", "#ffe86a", "#5a4a3a", "#7aba5a"], null, wingBeat);
  ART.oniGeneral = () => make(30, 30, (g) => {
    rect(g, 8, 11, 14, 12, "#c8402a"); rect(g, 9, 12, 12, 10, "#e8603a"); rect(g, 8, 14, 14, 3, "#3a3a4a"); rect(g, 13, 13, 4, 5, "#ffd04a");
    circ(g, 15, 7, 5.6, "#e8603a"); poly(g, [[10, 3], [9.6, -2], [12.6, 2]], "#fff0d0"); poly(g, [[20, 3], [20.4, -2], [17.4, 2]], "#fff0d0");
    rect(g, 11.6, 6, 2.4, 2, "#ffe86a"); rect(g, 16, 6, 2.4, 2, "#ffe86a"); rect(g, 12, 9.6, 6, 1.4, "#ffffff");
    rect(g, 2, 12, 6, 10, "#c8402a"); rect(g, 22, 12, 6, 10, "#c8402a"); line(g, 27, 2, 28, 26, 3, "#4a3a3a"); circ(g, 27, 4, 2.6, "#5a4a4a");
    rect(g, 9, 23, 5, 7, "#3a3a4a"); rect(g, 16, 23, 5, 7, "#3a3a4a");
  }, ["#c8402a", "#e8603a", "#3a3a4a", "#ffd04a", "#fff0d0", "#ffe86a", "#ffffff", "#4a3a3a", "#5a4a4a"], null, legs);

  /* ── 第15迷宮 深海の沈没都市（水）── */
  ART.angler = () => make(20, 15, (g) => {
    ell(g, 9, 9, 7.6, 5, "#2a3a6a"); ell(g, 9, 11, 6, 3, "#3a5a8a"); poly(g, [[2, 9], [-0.4, 5], [-0.4, 13]], "#1e2a52");
    line(g, 12, 5, 15, 0.6, 1, "#5a6a9a"); circ(g, 16, 1.6, 1.8, "#9affea"); px(g, 16, 1, "#ffffff");
    circ(g, 13, 7, 1.6, "#ffffff"); px(g, 13.4, 7, "#1a1020");
    poly(g, [[13, 11], [18, 10], [17, 12.6]], "#e8e8f0"); px(g, 15, 10.6, "#1e2a52"); px(g, 16.6, 10.6, "#1e2a52");
  }, ["#2a3a6a", "#3a5a8a", "#1e2a52", "#5a6a9a", "#9affea", "#ffffff", "#1a1020", "#e8e8f0"], null, (b) => P.shiftWhere(b, (x) => x < 4, 0, 1));
  ART.merman = () => make(16, 22, (g) => {
    rect(g, 4, 8, 8, 8, "#3a9a8a"); rect(g, 5, 9, 6, 6, "#5ac0a8"); circ(g, 8, 5, 3.8, "#3a9a8a");
    poly(g, [[4, 3], [2, 1], [4.6, 5]], "#7ae0c8"); poly(g, [[12, 3], [14, 1], [11.4, 5]], "#7ae0c8");
    px(g, 6.6, 5, "#ffe86a"); px(g, 9.4, 5, "#ffe86a"); rect(g, 7, 7, 2, 1, "#1a3a3a");
    line(g, 13.4, 2, 13.4, 20, 1.2, "#c8a050"); poly(g, [[12, 3], [12.4, 0], [13.4, 2], [14.4, 0], [14.8, 3]], "#e8e8f0");
    poly(g, [[5, 16], [11, 16], [10, 22], [8, 19], [6, 22]], "#2a7a6a");
  }, ["#3a9a8a", "#5ac0a8", "#7ae0c8", "#ffe86a", "#1a3a3a", "#c8a050", "#e8e8f0", "#2a7a6a"]);
  ART.bubbleSlime = () => make(15, 13, (g) => {
    circ(g, 5, 8, 4, "rgba(140,220,255,0.9)"); circ(g, 10, 8.4, 3.6, "rgba(140,220,255,0.9)"); circ(g, 7.6, 4.6, 3.4, "rgba(160,232,255,0.9)");
    circ(g, 6.4, 3.4, 1, "#ffffff"); circ(g, 3.6, 6.6, 0.8, "#ffffff"); px(g, 6.4, 8, "#1a2a5a"); px(g, 9, 8, "#1a2a5a");
  }, ["#8cdcff", "#a0e8ff", "#ffffff", "#1a2a5a"], null, (b) => P.shiftWhere(b, (x, y) => y < 6, 0, 1));
  ART.tentacle = () => make(14, 22, (g) => {
    line(g, 7, 21, 8, 14, 4, "#8a3aa0"); line(g, 8, 14, 5, 8, 3.4, "#9a4ab0"); line(g, 5, 8, 7, 2, 2.4, "#aa5ac0");
    circ(g, 9, 17, 1, "#f0c8ff"); circ(g, 6.6, 11, 0.9, "#f0c8ff"); circ(g, 6.4, 5, 0.8, "#f0c8ff");
    ell(g, 7, 21, 6, 1.6, "#4a2a5a");
  }, ["#8a3aa0", "#9a4ab0", "#aa5ac0", "#f0c8ff", "#4a2a5a"], null, (b) => P.shiftWhere(b, (x, y) => y < 12, 1, 0));
  ART.siren = () => make(24, 30, (g) => {
    poly(g, [[8, 16], [16, 16], [17, 26], [12, 29], [7, 26]], "#2a9ab8"); poly(g, [[12, 29], [7, 30], [9, 27]], "#5ad0e8"); poly(g, [[12, 29], [17, 30], [15, 27]], "#5ad0e8");
    rect(g, 9, 11, 6, 6, "#ffe0d0"); rect(g, 9, 13, 6, 2, "#e85a9a"); circ(g, 12, 7, 4, "#ffe0d0");
    ell(g, 12, 6, 5.4, 4.6, "#7a5ad8"); rect(g, 8.6, 6.4, 6.8, 4, "#ffe0d0"); poly(g, [[7, 7], [5.4, 15], [8.4, 11]], "#7a5ad8"); poly(g, [[17, 7], [18.6, 15], [15.6, 11]], "#7a5ad8");
    px(g, 10.6, 8, "#3a2a8a"); px(g, 13.4, 8, "#3a2a8a"); px(g, 12, 10, "#e85a9a");
    g.strokeStyle = "#e8c060"; g.lineWidth = 1.4; g.beginPath(); g.arc(20, 15, 4, -1.6, 1.6); g.stroke(); line(g, 20, 11, 20, 19, 0.8, "#fff6c0");
    circ(g, 12, 1.6, 1.4, "#fff0a0");
  }, ["#2a9ab8", "#5ad0e8", "#ffe0d0", "#e85a9a", "#7a5ad8", "#3a2a8a", "#e8c060", "#fff6c0", "#fff0a0"]);

  /* ══ ボスの絵 ══ */
  ART.bMyco = () => make(62, 62, (g) => {
    ell(g, 31, 22, 29, 18, "#d83a3a"); ell(g, 31, 30, 26, 8, "#a82a2a");
    [[16, 14, 4.4], [30, 9, 5], [44, 15, 4.4], [22, 24, 3], [40, 25, 3.4], [52, 22, 2.4], [10, 24, 2.4]].forEach(([x, y, r]) => circ(g, x, y, r, "#fff2dc"));
    rect(g, 19, 34, 24, 24, "#f2dfb8"); rect(g, 19, 34, 6, 24, "#d8c094"); ell(g, 31, 58, 16, 4, "#b89a6a");
    rect(g, 24, 40, 4, 4, "#1a1020"); rect(g, 35, 40, 4, 4, "#1a1020"); px(g, 25, 40, "#ffffff"); px(g, 36, 40, "#ffffff");
    ell(g, 31, 50, 9, 6, "#7ab84a"); ell(g, 31, 52, 6, 4, "#5a9a3a");
    poly(g, [[22, 4], [24, -2], [27, 3], [31, -3], [35, 3], [38, -2], [40, 4]], "#ffd84a"); circ(g, 31, 1, 1.6, "#4ae0ff");
    line(g, 54, 24, 58, 60, 2.4, "#8a6a3a"); circ(g, 55, 22, 4, "#ffb0d0"); circ(g, 55, 22, 2, "#fff4e0");
  }, ["#d83a3a", "#a82a2a", "#fff2dc", "#f2dfb8", "#d8c094", "#b89a6a", "#1a1020", "#ffffff", "#7ab84a", "#5a9a3a", "#ffd84a", "#4ae0ff", "#8a6a3a", "#ffb0d0", "#fff4e0"]);
  ART.bLevia = () => make(76, 62, (g) => {
    ell(g, 38, 52, 30, 9, "#1e5a9a"); ell(g, 22, 44, 14, 9, "#2a72b8"); ell(g, 52, 42, 14, 10, "#2a72b8"); ell(g, 38, 50, 22, 5, "#7fd0ff");
    line(g, 46, 40, 44, 18, 13, "#2a80c8"); line(g, 44, 26, 42, 14, 9, "#7fd8ff");
    ell(g, 40, 13, 13, 9, "#3a90d8"); poly(g, [[48, 13], [62, 16], [48, 19]], "#3a90d8"); ell(g, 40, 15, 10, 4, "#a8e8ff");
    poly(g, [[30, 6], [26, -2], [34, 6]], "#e8f8ff"); poly(g, [[38, 4], [36, -4], [42, 4]], "#e8f8ff"); poly(g, [[46, 6], [48, -1], [50, 7]], "#e8f8ff");
    circ(g, 46, 11, 2.4, "#ffe86a"); px(g, 46, 11, "#1a1020"); poly(g, [[50, 18], [60, 18], [56, 20]], "#ffffff");
    poly(g, [[8, 44], [0, 34], [4, 48]], "#4ab0f0"); poly(g, [[66, 42], [76, 30], [72, 46]], "#4ab0f0"); poly(g, [[30, 30], [24, 20], [34, 26]], "#4ab0f0");
  }, ["#1e5a9a", "#2a72b8", "#7fd0ff", "#2a80c8", "#7fd8ff", "#3a90d8", "#a8e8ff", "#e8f8ff", "#ffe86a", "#1a1020", "#ffffff", "#4ab0f0"]);
  ART.bPhoenix = () => make(80, 62, (g) => {
    poly(g, [[40, 30], [2, 6], [12, 24], [0, 28], [14, 36], [6, 44], [28, 40]], "#ff6a1a"); poly(g, [[40, 30], [78, 6], [68, 24], [80, 28], [66, 36], [74, 44], [52, 40]], "#ff6a1a");
    poly(g, [[40, 30], [10, 14], [20, 28], [12, 34], [30, 36]], "#ffb02a"); poly(g, [[40, 30], [70, 14], [60, 28], [68, 34], [50, 36]], "#ffb02a");
    ell(g, 40, 34, 9, 12, "#ff8a2a"); ell(g, 40, 36, 6, 8, "#ffe06a");
    poly(g, [[34, 44], [28, 62], [40, 50], [52, 62], [46, 44]], "#ff4a1a"); poly(g, [[37, 46], [40, 60], [43, 46]], "#ffe06a");
    circ(g, 40, 18, 7, "#ff7a2a"); poly(g, [[44, 18], [52, 21], [44, 22]], "#ffd84a"); circ(g, 42, 16, 1.8, "#ffffff"); px(g, 42, 16, "#1a1020");
    poly(g, [[36, 12], [34, 0], [39, 10]], "#ffe86a"); poly(g, [[40, 11], [41, -2], [43, 11]], "#ffe86a"); poly(g, [[44, 12], [48, 2], [46, 13]], "#ffe86a");
  }, ["#ff6a1a", "#ffb02a", "#ff8a2a", "#ffe06a", "#ff4a1a", "#ff7a2a", "#ffd84a", "#ffffff", "#1a1020", "#ffe86a"]);
  ART.bAstro = () => make(66, 66, (g) => {
    g.strokeStyle = "#e8c060"; g.lineWidth = 3; g.beginPath(); g.ellipse(33, 33, 30, 30, 0, 0, TAU); g.stroke();
    g.strokeStyle = "#fff2a8"; g.lineWidth = 2; g.beginPath(); g.ellipse(33, 33, 28, 12, 0.5, 0, TAU); g.stroke(); g.beginPath(); g.ellipse(33, 33, 12, 28, 0.5, 0, TAU); g.stroke();
    g.strokeStyle = "#c8a050"; g.lineWidth = 1.6; g.beginPath(); g.ellipse(33, 33, 22, 22, 0, 0, TAU); g.stroke();
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; rect(g, 33 + Math.cos(a) * 30 - 1, 33 + Math.sin(a) * 30 - 1, 2.4, 2.4, "#fff6c0"); }
    circ(g, 33, 33, 11, "#f2ecd8"); circ(g, 33, 33, 8, "#7a6aff"); circ(g, 33, 33, 4, "#1a1040"); circ(g, 31, 31, 1.6, "#ffffff");
    [[10, 10], [56, 12], [8, 54], [58, 56]].forEach(([x, y]) => { poly(g, [[x, y - 4], [x + 1.4, y - 1.4], [x + 4, y], [x + 1.4, y + 1.4], [x, y + 4], [x - 1.4, y + 1.4], [x - 4, y], [x - 1.4, y - 1.4]], "#fff6a0"); });
  }, ["#e8c060", "#fff2a8", "#c8a050", "#fff6c0", "#f2ecd8", "#7a6aff", "#1a1040", "#ffffff", "#fff6a0"]);
  ART.bSakura = () => make(66, 64, (g) => {
    rect(g, 27, 30, 12, 30, "#6a3a3a"); rect(g, 27, 30, 4, 30, "#4a2828"); line(g, 30, 36, 12, 24, 4, "#6a3a3a"); line(g, 36, 36, 54, 22, 4, "#6a3a3a");
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; circ(g, 33 + Math.cos(a) * 20, 20 + Math.sin(a) * 11, 9, i % 2 ? "#ffb0d0" : "#ff98c0"); }
    circ(g, 33, 18, 12, "#ffc8e0"); circ(g, 27, 12, 4, "#ffe0ee");
    ell(g, 33, 42, 7, 8, "#fff2f2"); rect(g, 29, 40, 3, 1.6, "#c02a4a"); rect(g, 34.4, 40, 3, 1.6, "#c02a4a"); poly(g, [[31, 46], [35, 46], [33, 48]], "#c02a4a");
    poly(g, [[26, 36], [24, 32], [29, 35]], "#c02a4a"); poly(g, [[40, 36], [42, 32], [37, 35]], "#c02a4a");
    for (let i = 0; i < 6; i++) rect(g, 18 + i * 6, 58, 4, 6, "#4a2828");
    [[8, 40], [58, 40], [14, 52], [52, 54]].forEach(([x, y]) => { ell(g, x, y, 2.4, 1.6, "#ffb0d0"); });
  }, ["#6a3a3a", "#4a2828", "#ffb0d0", "#ff98c0", "#ffc8e0", "#ffe0ee", "#fff2f2", "#c02a4a"]);
  ART.bKraken = () => make(76, 66, (g) => {
    for (let i = 0; i < 8; i++) { const a = Math.PI * (0.1 + i * 0.115); const x2 = 38 + Math.cos(a) * 36, y2 = 40 + Math.sin(a) * 26; line(g, 38, 36, x2, y2, 6 - i % 2, i % 2 ? "#7a2a9a" : "#8a3aaa"); circ(g, x2, y2, 2.4, "#9a4aba"); }
    ell(g, 38, 24, 20, 22, "#8a3aaa"); ell(g, 38, 16, 16, 13, "#a04ac0"); ell(g, 32, 10, 5, 3, "#c87ae0");
    ell(g, 30, 30, 5, 4, "#ffe86a"); ell(g, 46, 30, 5, 4, "#ffe86a"); rect(g, 29, 28, 2, 5, "#1a1020"); rect(g, 45, 28, 2, 5, "#1a1020");
    for (let i = 0; i < 5; i++) circ(g, 28 + i * 5, 40, 1.4, "#f0c8ff");
    ell(g, 38, 62, 30, 4, "rgba(40,20,60,0.6)");
  }, ["#7a2a9a", "#8a3aaa", "#9a4aba", "#a04ac0", "#c87ae0", "#ffe86a", "#1a1020", "#f0c8ff", "#28143c"]);

  /* ══════════════════════════════════════════════════════════════
     敵のデータ（強さは同じ段の本編の迷宮の雑魚の平均に合わせた。体力・攻撃の本当の値は ma-data の scaleOf が推奨戦力から決める）
     ══════════════════════════════════════════════════════════════ */
  Object.assign(D.ENEMIES, {
    /* 第10迷宮（木） */
    mushling:    { nm: "茸ぼうや", art: "mushling", ai: "chase", hp: 22, atk: 8, spd: 40, r: 7, el: "wood", exp: 1, col: "#e84a4a", pack: 3 },
    sporePuff:   { nm: "胞子玉", art: "sporePuff", ai: "ranged", hp: 20, atk: 8, spd: 30, r: 6, el: "wood", exp: 2, col: "#9ad860", shot: { speed: 110, cd: 2.6, n: 3, spread: 0.45 } },
    vineSnake:   { nm: "蔓蛇", art: "vineSnake", ai: "charge", hp: 34, atk: 11, spd: 56, r: 7, el: "wood", exp: 2, col: "#5fb048" },
    beeKnight:   { nm: "蜂の騎士", art: "beeKnight", ai: "charge", hp: 70, atk: 13, spd: 62, r: 8, el: "wood", exp: 4, col: "#ffd23a", lunge: 1 },
    queenBee:    { nm: "女王蜂ヴェスパ", art: "queenBee", ai: "elite", hp: 600, atk: 17, spd: 46, r: 13, el: "wood", exp: 34, col: "#ffcc2a", elite: 1 },
    /* 第11迷宮（水） */
    snowJelly:   { nm: "雪くらげ", art: "snowJelly", ai: "swarm", hp: 16, atk: 8, spd: 46, r: 6, el: "water", exp: 1, col: "#aaecff", pack: 4 },
    iceFish:     { nm: "氷ヒレ魚", art: "iceFish", ai: "charge", hp: 26, atk: 10, spd: 66, r: 7, el: "water", exp: 2, col: "#7fd8ff" },
    penguin:     { nm: "ペンギン槍兵", art: "penguin", ai: "ranged", hp: 40, atk: 12, spd: 38, r: 7, el: "water", exp: 3, col: "#2a3448", shot: { speed: 140, cd: 2.4, n: 1 } },
    frostCrab:   { nm: "氷殻ガニ", art: "frostCrab", ai: "guard", hp: 80, atk: 14, spd: 22, r: 10, el: "water", exp: 4, col: "#5ab0e8", guard: 0.55, slam: 1 },
    orcaKnight:  { nm: "シャチの騎士オルカ", art: "orcaKnight", ai: "elite", hp: 640, atk: 19, spd: 50, r: 13, el: "water", exp: 38, col: "#1e2436", elite: 1 },
    /* 第12迷宮（火） */
    fireBat:     { nm: "炎コウモリ", art: "fireBat", ai: "swarm", hp: 20, atk: 10, spd: 74, r: 6, el: "fire", exp: 1, col: "#c8302a", pack: 4 },
    salamander:  { nm: "火トカゲ", art: "salamander", ai: "charge", hp: 46, atk: 14, spd: 58, r: 8, el: "fire", exp: 3, col: "#ff6a2a", burnTrail: 1 },
    flamePriest: { nm: "炎の神官", art: "flamePriest", ai: "ranged", hp: 50, atk: 15, spd: 30, r: 8, el: "fire", exp: 4, col: "#c8402a", shot: { speed: 120, cd: 2.8, n: 5, spread: 0.7 } },
    magmaDoll:   { nm: "熔岩人形", art: "magmaDoll", ai: "guard", hp: 110, atk: 18, spd: 20, r: 10, el: "fire", exp: 5, col: "#6a3a2a", guard: 0.5, slam: 1 },
    efreet:      { nm: "魔神イフリート", art: "efreet", ai: "elite", hp: 900, atk: 25, spd: 40, r: 14, el: "fire", exp: 42, col: "#d84a2a", elite: 1 },
    /* 第13迷宮（光） */
    lampSprite:  { nm: "灯火の精", art: "lampSprite", ai: "swarm", hp: 26, atk: 12, spd: 70, r: 5, el: "light", exp: 1, col: "#e8c060", pack: 5 },
    cherub:      { nm: "見習い天使", art: "cherub", ai: "ranged", hp: 58, atk: 16, spd: 50, r: 7, el: "light", exp: 4, col: "#fff2e0", shot: { speed: 150, cd: 2.2, n: 3, spread: 0.3 } },
    prismBeast:  { nm: "プリズム獣", art: "prismBeast", ai: "charge", hp: 84, atk: 18, spd: 56, r: 9, el: "light", exp: 4, col: "#c8e8ff" },
    clockwork:   { nm: "時計仕掛けの兵", art: "clockwork", ai: "guard", hp: 160, atk: 22, spd: 24, r: 10, el: "light", exp: 6, col: "#b8904a", guard: 0.6, laser: 1 },
    seraph:      { nm: "熾天の衛士セラフ", art: "seraph", ai: "elite", hp: 1300, atk: 30, spd: 44, r: 14, el: "light", exp: 48, col: "#ffe86a", elite: 1 },
    /* 第14迷宮（木） */
    petalSprite: { nm: "花びらの精", art: "petalSprite", ai: "swarm", hp: 18, atk: 9, spd: 72, r: 5, el: "wood", exp: 1, col: "#ffb0d0", pack: 6 },
    foxfire:     { nm: "狐火の子", art: "foxfire", ai: "charge", hp: 44, atk: 12, spd: 64, r: 8, el: "wood", exp: 3, col: "#fff4ec" },
    tengu:       { nm: "烏天狗", art: "tengu", ai: "hex", hp: 52, atk: 13, spd: 48, r: 8, el: "wood", exp: 4, col: "#d84a3a", shot: { speed: 130, cd: 2.6, n: 4, spread: 0.5 }, blink: 1 },
    kodamaOni:   { nm: "木霊の鬼", art: "kodamaOni", ai: "guard", hp: 130, atk: 17, spd: 26, r: 10, el: "wood", exp: 6, col: "#5a9a4a", guard: 0.55, lunge: 1 },
    oniGeneral:  { nm: "大鬼将ゴウエン", art: "oniGeneral", ai: "elite", hp: 1100, atk: 22, spd: 42, r: 14, el: "wood", exp: 50, col: "#c8402a", elite: 1 },
    /* 第15迷宮（水） */
    bubbleSlime: { nm: "泡スライム", art: "bubbleSlime", ai: "chase", hp: 36, atk: 12, spd: 42, r: 7, el: "water", exp: 2, col: "#8cdcff", pack: 3 },
    angler:      { nm: "提灯アンコウ", art: "angler", ai: "hex", hp: 70, atk: 15, spd: 30, r: 9, el: "water", exp: 4, col: "#2a3a6a", beam: 1 },
    merman:      { nm: "半魚人の衛兵", art: "merman", ai: "ranged", hp: 64, atk: 15, spd: 40, r: 8, el: "water", exp: 4, col: "#3a9a8a", shot: { speed: 140, cd: 2.4, n: 3, spread: 0.25 } },
    tentacle:    { nm: "深淵の触手", art: "tentacle", ai: "guard", hp: 130, atk: 18, spd: 16, r: 9, el: "water", exp: 6, col: "#8a3aa0", guard: 0.6, root: 1 },
    siren:       { nm: "歌姫セイレーン", art: "siren", ai: "elite", hp: 1150, atk: 24, spd: 46, r: 13, el: "water", exp: 52, col: "#7a5ad8", elite: 1 },
  });

  /* ══ ボス（技は本編の技の組みあわせ＋ summonOwn＝その島の雑魚を呼ぶ）══ */
  Object.assign(D.BOSSES, {
    mycoKing: { nm: "茸王マイコニド", art: "bMyco", hp: 5300, atk: 26, spd: 22, r: 26, el: "wood", col: "#e84a4a",
      gim: { kind: "vine", nm: "菌糸の封印", n: 4, hp: 70, d: "茸王に胞子を送る菌糸。4つすべて断ち切ると茸王がしおれて動けなくなる" },
      pats: ["leafSpiral", "seedBomb", "summonOwn", "roots", "charge", "thornWall", "rootRing", "leafStorm", "rootCross"], lines: ["ポコポコ……だれだ、わが島を踏むのは。", "胞子よ、舞え！ 森よ、育て！", "茸の王は……倒れても、また生える……！"] },
    leviathan: { nm: "深海竜レヴィア", art: "bLevia", hp: 7500, atk: 33, spd: 30, r: 28, el: "water", col: "#3a90d8",
      gim: { kind: "mirror", nm: "潮の鏡", n: 4, hp: 100, d: "竜の水の力を映す鏡。4枚すべて割ると竜が凍りついて動けなくなる" },
      pats: ["lances", "freezeRing", "summonOwn", "icicles", "frostNova", "mirrorLance", "iceRain", "blizzard", "lanceRain"], lines: ["……女王の歌が、聞こえなくなった。", "潮よ、凍れ。すべてを海の底へ。", "わたしは……さみしかっただけ……！"] },
    phoenix: { nm: "不死鳥フレア", art: "bPhoenix", hp: 10000, atk: 40, spd: 38, r: 30, el: "fire", col: "#ff8a2a",
      gim: { kind: "cooler", nm: "雨の水晶", n: 3, hp: 130, d: "雨雲を呼ぶ水晶。3つ起動すると不死鳥の炎がしずまり、地に落ちる" },
      pats: ["flameRing", "magmaBomb", "summonOwn", "meteor", "wingGust", "eruption", "lavaWave", "magmaRing", "breath"], lines: ["何度でも……何度でも、よみがえる。", "灰の中から、また炎を！", "終われない……それが、わたしの呪い……！"] },
    astrolabe: { nm: "星図の機神アストロラーベ", art: "bAstro", hp: 13500, atk: 48, spd: 32, r: 30, el: "light", col: "#e8c060",
      gim: { kind: "rune", nm: "星図の盤", n: 4, hp: 90, d: "床に浮かぶ星図の盤。4枚すべて踏むと機神の計算が止まる" },
      pats: ["starBurst", "laserGrid", "summonOwn", "teleport", "spiral", "laserSweep", "timestop", "starRain", "starfallX"], lines: ["観測ヲ、開始スル。", "星ノ軌道ヲ……修正スル。", "記録……完了……星図ハ、ヒトツニ……。"] },
    sakuya: { nm: "千年桜の大妖サクヤ", art: "bSakura", hp: 19000, atk: 58, spd: 30, r: 28, el: "wood", col: "#ff98c0",
      gim: { kind: "vine", nm: "千年の枝", n: 4, hp: 170, d: "桜に力を送る古い枝。4つすべて断ち切ると大妖の結界がとける" },
      pats: ["leafStorm", "rootRing", "summonOwn", "seedBomb", "shadowStep", "thornWall", "leafSpiral", "rootCross", "starRain"], lines: ["千年……この春を守ってきました。", "散りなさい、花のように。", "春を……どうか、町の人にも……。"] },
    kraken: { nm: "大海魔クラーケン", art: "bKraken", hp: 22000, atk: 63, spd: 26, r: 32, el: "water", col: "#9a4aba",
      gim: { kind: "brazier", nm: "海底の灯籠", n: 4, hp: 190, d: "深海の闇をはらう灯籠。4つ灯すと大海魔の影が消え、動きが止まる" },
      pats: ["sweep", "freezeRing", "summonOwn", "darkZones", "soulChain", "lanceRain", "darkness", "iceRain", "scytheStorm"], lines: ["……沈んだ都に、光はいらぬ。", "海の底へ、ともに沈め。", "守り手は……最後まで、守る……！"] },
  });

  /* ══ 迷宮（外伝）══
     tier … 報酬の段（本編の番号の間の数。no の代わりに ma-prog・ma-cards が使う） */
  const SIDE = [
    { id: "d10", no: 10, side: 1, tier: 2.5, nm: "胞子舞う茸の島", en: "SPOREBLOOM ISLE", diff: "初級〜中級", stars: 2, lvMul: 1.5, gold: 2.5, rec: { lv: 15, power: 1400, hard: 2900 },
      biome: "forest", el: "wood", c: "#9be36a",
      d: "海に浮かんだ異界の島。巨大な茸が森をおおい、胞子がきらきらと舞っている。",
      enemies: ["mushling", "sporePuff", "vineSnake", "beeKnight"], elite: "queenBee", mid: "queenBee", boss: "mycoKing",
      mats: ["sap", "stone"], gim: ["vine", "poison"], rules: ["菌糸の封印・毒の胞子だまり（古代樹と同じ）", "敵はすべてこの島だけの魔物"], unlock: "d2" },
    { id: "d11", no: 11, side: 1, tier: 3.5, nm: "凍てつく潮の島", en: "FROZEN TIDE ISLE", diff: "中級", stars: 3, lvMul: 1.9, gold: 4.0, rec: { lv: 25, power: 2400, hard: 4300 },
      biome: "ice", el: "water", c: "#7fe0ff",
      d: "潮ごと凍りついた異界の島。氷の下を、見たことのない魚たちが泳いでいる。",
      enemies: ["snowJelly", "iceFish", "penguin", "frostCrab"], elite: "orcaKnight", mid: "orcaKnight", boss: "leviathan",
      mats: ["shard", "stone"], gim: ["slip", "icicle"], rules: ["滑る床・氷柱の落下（氷窟と同じ）", "敵はすべてこの島だけの魔物"], unlock: "d3" },
    { id: "d12", no: 12, side: 1, tier: 4.5, nm: "焔の祭壇島", en: "ALTAR OF EMBERS", diff: "中級〜上級", stars: 4, lvMul: 2.5, gold: 6.2, rec: { lv: 34, power: 3700, hard: 6000 },
      biome: "lava", el: "fire", c: "#ff9a4a",
      d: "燃えつづける祭壇がそびえる異界の島。不死の炎をあがめる神官たちが住む。",
      enemies: ["fireBat", "salamander", "flamePriest", "magmaDoll"], elite: "efreet", mid: "efreet", boss: "phoenix",
      mats: ["core", "stone"], gim: ["erupt", "lava"], rules: ["噴火・溶岩流（熔岩城と同じ）", "敵はすべてこの島だけの魔物"], unlock: "d4" },
    { id: "d13", no: 13, side: 1, tier: 5.5, nm: "白亜の天文台", en: "WHITE OBSERVATORY", diff: "上級", stars: 5, lvMul: 3.2, gold: 9.5, rec: { lv: 42, power: 5500, hard: 8200 },
      biome: "library", el: "light", c: "#fff2a0",
      d: "星を測る古代の塔が建つ異界の島。歯車と天使が、いまも星図を書き続けている。",
      enemies: ["lampSprite", "cherub", "prismBeast", "clockwork"], elite: "seraph", mid: "seraph", boss: "astrolabe",
      mats: ["page", "star"], gim: ["warp", "rune"], rules: ["転移門・魔法床（書庫と同じ）", "敵はすべてこの島だけの魔物"], unlock: "d5" },
    { id: "d14", no: 14, side: 1, tier: 7.5, nm: "千年桜の霊域", en: "GROVE OF A THOUSAND SPRINGS", diff: "超級", stars: 7, lvMul: 4.5, gold: 15.5, rec: { lv: 53, power: 9500, hard: 13200 },
      biome: "forest", el: "wood", c: "#ffb0d8",
      d: "千年散らない桜が咲く異界の島。鬼と狐と天狗が、桜の大妖を守っている。",
      enemies: ["petalSprite", "foxfire", "tengu", "kodamaOni"], elite: "oniGeneral", mid: "oniGeneral", boss: "sakuya",
      mats: ["sap", "star"], gim: ["vine", "poison"], rules: ["枝の封印・毒だまり（古代樹と同じ）", "敵はすべてこの島だけの魔物"], unlock: "d7" },
    { id: "d15", no: 15, side: 1, tier: 8.5, nm: "深海の沈没都市", en: "DROWNED CITY OF THE DEEP", diff: "超級", stars: 8, lvMul: 5.2, gold: 19, rec: { lv: 57, power: 11800, hard: 15800 },
      biome: "abyss", el: "water", c: "#3ab0ff",
      d: "光の届かない海の底に沈んだ古代の都。歌姫の声だけが、暗い水の中に響く。",
      enemies: ["bubbleSlime", "angler", "merman", "tentacle"], elite: "siren", mid: "siren", boss: "kraken",
      mats: ["shard", "abyss"], gim: ["dark", "taint"], rules: ["視界制限・魔力汚染（奈落と同じ＝深い海の暗さ）", "敵はすべてこの島だけの魔物"], unlock: "d8" },
  ];
  SIDE.forEach((d) => { if (!D.DUN[d.id]) { D.DUNGEONS.push(d); D.DUN[d.id] = d; } });

  /* クリア時間のミッション（本編の段の間の数） */
  Object.assign(D.TIME_MIS, {
    d10: { normal: [[20, 4], [14, 7], [10, 10]], hard: [[22, 7], [16, 10], [12, 15]] },
    d11: { normal: [[22, 5], [15, 9], [11, 13]], hard: [[24, 9], [17, 13], [13, 18]] },
    d12: { normal: [[22, 7], [15, 11], [11, 15]], hard: [[24, 11], [17, 16], [13, 22]] },
    d13: { normal: [[24, 9], [16, 14], [12, 18]], hard: [[26, 14], [18, 20], [14, 27]] },
    d14: { normal: [[26, 13], [18, 19], [13, 26]], hard: [[28, 19], [20, 28], [15, 38]] },
    d15: { normal: [[28, 15], [19, 22], [14, 30]], hard: [[30, 22], [21, 33], [15, 45]] },
  });
  /* 実績 */
  [["d10", "茸の島の踏破者", { gold: 1000, sap: 10 }], ["d11", "潮の島の踏破者", { gold: 1400, shard: 10 }], ["d12", "祭壇島の踏破者", { gold: 1900, core: 10 }],
    ["d13", "天文台の踏破者", { gold: 2600, page: 10, crystal: 2 }], ["d14", "千年桜を鎮めし者", { gold: 3800, star: 12, crystal: 3 }], ["d15", "沈没都市の守り手", { gold: 4500, shard: 12, abyss: 12, crystal: 4 }]]
    .forEach(([id, nm, rw]) => { if (!D.ACH.some((a) => a.id === "clear_" + id)) D.ACH.push({ id: "clear_" + id, nm, d: D.DUN[id].nm + "をクリア", rw }); });

  /* 古文書（外伝） */
  [["l9", "異界の島", "星脈がひとつにもどろうとするとき、こぼれ落ちた欠片は海に浮かぶ島になる。島は、そばにある想いの形を借りて育つ。"],
    ["l10", "星読みの一族", "六つの島がひとつの大陸だったころ、星を読んで潮と季節を占う一族がいた。大陸が沈んだ夜、一族は海へ散った。"],
    ["l11", "六つの残響", "茸・潮・焔・星図・桜・深海。六つの島の主は、沈んだ大陸の六つの記憶の残響である。"]]
    .forEach(([id, nm, d]) => { if (!D.LORE.some((l) => l.id === id)) D.LORE.push({ id, nm, d }); });

  /* ══════════════════════════════════════════════════════════════
     ストーリー（ご指定「より充実したものに」）
     ・本編の章を厚くした（町の人たちの会話を足した。id はそのまま＝読んだ印は消えない）
     ・第7〜第9迷宮の章（本編のつづき・最終章）と、外伝6章（旅の星読み セツナ）を足した
     ・行の形：[話す人, ことば]。話す人の名前で ma-guild の playStory が立ち絵（町の人のドット絵）を出す
     ══════════════════════════════════════════════════════════════ */
  const L = "ギルドマスター ラウラ", MI = "魔導具店のミント", GA = "鍛冶屋のガルド", RO = "酒場のローザ", SI = "占い師のシエル", RY = "吟遊詩人のリュート", SE = "旅の星読み セツナ";
  const STORY = [
    { id: "prologue", nm: "序章　星脈の迷宮", at: null, c: "#ffd84a", lines: [
      [L, "ようこそ、冒険者ギルド《アストラ》へ。あなたが新しい探索者ね。"],
      [L, "この世界には、魔力の源「星脈」が流れているの。大地の下を、川のように。"],
      [L, "古代文明はそれを制御しようとして……失敗した。その結果が、各地に生まれた魔力迷宮「アビス」よ。"],
      [L, "アビスの中では魔物が増え続け、空間そのものがゆがんでいる。放っておけば、いずれ町も飲みこまれるわ。"],
      [RO, "あら、新顔？ ギルドの向かいの酒場のローザよ。おなかが空いたら、いつでもいらっしゃい。"],
      [MI, "魔導具店のミントでーす！ 回復薬・エリクサー・ダイスに砂。冒険のおともは、うちでそろえてね！"],
      [GA, "鍛冶屋のガルドだ。迷宮で拾った装備は持ってこい。叩いて、もっと強くしてやる。"],
      [L, "まずは近くの「翠緑の古代樹」から。広場の依頼掲示板で、冒険の地図をひらいてちょうだい。"],
    ] },
    { id: "ch1", nm: "第一章　古き樹の記憶", at: "d1", c: "#4fe39a", lines: [
      [L, "古樹の守護者を鎮めたのね。おつかれさま。"],
      [GA, "おう、帰ったか！ 守護者の根っこにやられた傷か、それ。装備ごと見せてみろ。"],
      [L, "守護者が守っていたのは、古代の祭壇。刻まれていた文字は「星脈を、凍れる女王に託す」。"],
      [SI, "……星が、北でまたたいています。氷の奥で、だれかが長い眠りについている。"],
      [L, "次は北の「蒼晶の氷窟」。女王、という言葉が気になるわ。"],
      [MI, "氷窟は足もとがつるつるだよ！ 回復薬は多めにね。いまなら一本おまけ！"],
    ] },
    { id: "ch2", nm: "第二章　凍れる女王", at: "d2", c: "#6fd0ff", lines: [
      [L, "氷晶の女王は、古代文明の守り手だったみたい。最後に「炎の城の巨神が、鍵を持つ」と言い残したそうね。"],
      [RY, "女王の歌なら知ってるよ。「六つに分かれし星の川、ひとつは氷に、ひとつは炎に」……古い子守唄さ。"],
      [L, "星脈の鍵……古代文明は、星脈をいくつかに分けて封じたのかもしれない。"],
      [RO, "ねえ、聞いた？ 港の漁師たちが、海の上に見たこともない島を見たって。夜になると、ぼうっと光るんだって。"],
      [L, "海に島……？ 冒険の地図に印をつけておくわ（外伝「胞子舞う茸の島」）。行くかどうかは、あなたに任せる。"],
      [L, "本命は南の「紅蓮の熔岩城」。巨神の持つ鍵を、たしかめてきて。"],
    ] },
    { id: "ch3", nm: "第三章　熔ける城", at: "d3", c: "#ff6a3d", lines: [
      [L, "熔岩の巨神の核から、古い頁が見つかったわ。書かれていたのは……書庫の場所。"],
      [GA, "巨神の核か……鍛冶屋の血がさわぐぜ。まだ熱が残ってやがる。"],
      [L, "「忘却の魔導書庫」。古代の魔法がすべて眠る場所よ。気をつけて。"],
      [SI, "書庫には、読んではいけない頁がある。……あなたなら、きっと大丈夫。"],
      [RO, "漁師たちがまた騒いでたわ。こんどは北の海に、凍った島が浮かんだって。"],
      [L, "それから——ギルドの地下に、深淵へつづく門が開いたの。腕に自信があるなら「深淵踏破」に挑んでみて。"],
    ] },
    { id: "ch4", nm: "第四章　禁書", at: "d4", c: "#e8d080", lines: [
      [L, "禁書の司書が守っていた本……星脈を「ひとつにもどす」方法が書かれていたわ。"],
      [RY, "ひとつにもどす、か。分けたのが古代の人なら、もどすのはぼくらってわけだ。"],
      [L, "でも、最後の頁が破られていた。続きは深淵の奥にある、と。"],
      [MI, "深淵って、灯りも届かないんでしょ？ 明かりの魔導具、たくさん仕入れておくね。"],
      [SI, "南の海で、炎の鳥が鳴いています。……島の数が、また増えたみたい。"],
    ] },
    { id: "ch5", nm: "第五章　奈落の裁き", at: "d5", c: "#a874ff", lines: [
      [L, "奈落の執行者は、星脈を壊そうとする者を裁く存在だったのね。"],
      [SI, "裁きの刃は、あなたを選ばなかった。……いいえ、あなたを見とどけた、と言うべきかしら。"],
      [L, "あなたが認められた、ということ。星天の神殿への道が、空に浮かびあがったわ。"],
      [RO, "今夜は店のおごりよ。……生きて帰ってきてくれて、ありがとう。"],
      [RY, "白い塔の島の話、知ってるかい？ 星を測る機械が、ひとりで星図を書いてるんだってさ。"],
    ] },
    { id: "ch6", nm: "第六章　星天の原初竜", at: "d6", c: "#ffe86a", lines: [
      [L, "原初竜……星脈そのものだった竜が、あなたに道を示した。"],
      [RY, "竜が最後に鳴いた声、町まで聞こえたよ。悲しい歌じゃなかった。……ほっとしたような声だった。"],
      [L, "星脈は、ひとつにもどろうとしている。アビスは少しずつ静まっていくはずよ。"],
      [SI, "でも……星の海の向こうに、まだ紅い月が昇っています。"],
      [L, "東の海に、異界への裂け目が開いたわ。紅い月の光が、そこからもれている。"],
      [L, "まだ見ぬ星脈の底へ——あなたの物語は、これからも続くわ。"],
    ] },
    { id: "ch7", nm: "第七章　紅き月の根", at: "d7", c: "#ff4f7a", lines: [
      [L, "紅月の守護者……古樹の守護者と同じ根を持っていたのね。"],
      [SI, "紅い月は、星脈がひとつにもどるのを嫌う者の目。……深淵の底から、だれかがこちらを見ています。"],
      [GA, "禁域の根っこ、とんでもなく硬かったぞ。そいつで槌を打ち直したら、いい音がしやがった。"],
      [L, "熔岩城の地下で、氷と炎がぶつかりあっているという知らせが届いたわ。"],
      [RO, "桜の島の話も聞いたわ。千年散らない桜ですって。……ちょっと見てみたいわね。"],
    ] },
    { id: "ch8", nm: "第八章　氷と炎の調停", at: "d8", c: "#ff9a3a", lines: [
      [L, "氷と炎の巨神……女王と巨神の力を、だれかがむりやりひとつに混ぜたものだった。"],
      [RY, "「六つに分かれし星の川」……分けられた星脈を、勝手につなぎ直そうとしている者がいるんだ。"],
      [SI, "星を喰らう影。神殿の最深部で、竜がふたたび目をさまそうとしています。"],
      [MI, "最後の準備は、うちで！ ……ねえ、ちゃんと帰ってきてね。約束だよ。"],
      [L, "星喰いの深淵神殿。……ここまで来たあなたなら、行ける。行って、帰ってきなさい。"],
    ] },
    { id: "ch9", nm: "終章　星を喰らう竜", at: "d9", c: "#b06aff", lines: [
      [L, "星喰いの竜を……本当に、倒したのね。"],
      [SI, "星が、きれいに並んでいます。こんな夜空は、生まれてはじめて。"],
      [GA, "がっはっは！ 町じゅうの鍛冶場で鐘を鳴らしてやる！"],
      [MI, "今日は店じまい！ 全部おまけ……は、さすがにむりだけど、半分くらいなら！"],
      [RO, "乾杯しましょう。星脈と、あなたに。"],
      [RY, "この冒険は、ぼくが歌にして残すよ。「九つの迷宮を渡った探索者の歌」ってね。"],
      [L, "ありがとう。……でも、深淵の門はまだ静かに息をしている。それに、海の島々も。あなたの物語は、まだ終わらない。"],
    ] },
    /* ── 外伝：海の異界と六つの残響 ── */
    { id: "g1", nm: "外伝一　島に降りた星読み", at: "d10", c: "#9be36a", lines: [
      [SE, "……あなたが、島の主を眠らせてくれたのね。わたしはセツナ。星を読んで、海を渡ってきた旅人よ。"],
      [SE, "この海に浮かぶ島は「異界の島」。星脈がひとつにもどろうとするとき、こぼれ落ちた欠片が形になったもの。"],
      [L, "こぼれ落ちた欠片……放っておけば、どうなるの？"],
      [SE, "欠片はさみしがり屋なの。まわりのものを呼びよせて、どんどん大きくなる。……あの茸の王みたいにね。"],
      [MI, "茸の島のおみやげ、ちゃんと胞子をはらってから持ってきてね！？"],
      [SE, "島は全部で六つ。ひとつずつ、静かに眠らせてあげて。……この町、しばらく見ていてもいい？"],
    ] },
    { id: "g2", nm: "外伝二　潮の子守唄", at: "d11", c: "#7fe0ff", lines: [
      [SE, "深海竜レヴィア……あの子は、海の底で女王の歌を聞いていたの。"],
      [RY, "女王の子守唄を？ じゃあ、あの竜は……女王の友だちだったのかな。"],
      [SE, "かもしれないわ。欠片は、そばにある想いの形を借りるから。"],
      [L, "残りは四つ。火の島、白い塔の島、桜の島、そして深い海の底……。"],
      [SE, "次の島は熱いわよ。……ふふ、ガルドさんの出番かも。"],
    ] },
    { id: "g3", nm: "外伝三　終われない炎", at: "d12", c: "#ff9a4a", lines: [
      [GA, "不死鳥の羽根だと！？ こいつは……炉の火が二度と消えなくなるぞ。"],
      [SE, "不死鳥は何度でもよみがえる。でも、それはさみしいことでもあるの。……終われないから。"],
      [SE, "あなたが鎮めてくれたから、あの子はやっと眠れる。ありがとう。"],
      [L, "セツナ。あなたはどうして、島の欠片をそこまで気にかけるの？"],
      [SE, "……わたしも、むかし海にこぼれたもののひとつだから。次は白い塔。星を測る機械が待っているわ。"],
    ] },
    { id: "g4", nm: "外伝四　沈んだ大陸の星図", at: "d13", c: "#fff2a0", lines: [
      [SI, "星図の機神……古代の人が、星の動きを記録するために作ったもの。わたしの占いの、ずっと昔のご先祖さまね。"],
      [SE, "機神は、星脈が分かれる前の星図を覚えていた。……見て。ここに描かれているのは、六つの島がひとつの大陸だったころの地図。"],
      [L, "六つの島は、もともとひとつの……。"],
      [SE, "そう。わたしの故郷も、そこにあった。"],
      [SE, "残りは二つ。どちらも、とても強い想いに包まれている。……気をつけて。"],
    ] },
    { id: "g5", nm: "外伝五　千年の春", at: "d14", c: "#ffb0d8", lines: [
      [SE, "千年桜の大妖、サクヤ……あの子は、この島の春を千年守ってきたの。"],
      [RO, "桜の花びら、店に飾ってもいいかしら。……ふしぎ、ぜんぜん散らないのね。"],
      [SE, "サクヤの最後の願いよ。「春を、町の人にも」って。"],
      [RY, "いい話だ。……ちょっと、泣けてくるね。"],
      [SE, "最後の島は、深い海の底。光も届かない場所に、いちばん大きな欠片が眠っている。……わたしも一緒に行けたらいいのに。"],
    ] },
    { id: "g6", nm: "外伝終章　ひとつにそろう歌", at: "d15", c: "#3ab0ff", lines: [
      [SE, "クラーケンを……鎮めてくれたのね。"],
      [SE, "あの子は、沈んだ都の最後の守り手だった。……わたしの、故郷の。"],
      [L, "セツナ……あなた、もしかして。"],
      [SE, "ええ。わたしは六つの島がひとつだったころの、星読みの一族の最後のひとり。……欠片たちと同じ、さみしがり屋の残響よ。"],
      [SE, "でも、もうさみしくない。あなたが六つの欠片を眠らせてくれたから、星脈の歌がひとつにそろった。"],
      [RY, "その歌、ぼくに教えてくれないか。町じゅうに聞かせたいんだ。"],
      [SE, "ふふ……いいわ。それじゃあ、この町にいてもいい？ 星読みなら、シエルさんに負けないわよ。"],
      [SI, "あら、それは楽しみ。"],
      [L, "ようこそ、ギルド《アストラ》へ。……あなたたちの冒険も、これからね。"],
    ] },
  ];
  D.STORY.length = 0;
  STORY.forEach((s) => D.STORY.push(s));
  D.STORY_NPC = { [L]: "laura", [MI]: "shopkeep", [GA]: "smith", [RO]: "barkeep", [SI]: "teller", [RY]: "bard", [SE]: "setsuna" };
})();
