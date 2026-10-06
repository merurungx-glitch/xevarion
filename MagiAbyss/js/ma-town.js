/* ============================================================
   MagiAbyss — ma-town.js
   ★★ 2026-10-05 拠点を「屋外の町の広場」に作り直し（ご指定：以前に添付した ギルド案1 の配置）
   ・まん中に星脈の石碑（＝深淵の門）。まわりに 鍛冶屋・魔導具店・酒場・ギルド本部・占いの天幕・
     依頼掲示板・協会掲示（市場の天幕）・資料室・倉庫。左下にアルパカと旗飾り・たき火と吟遊詩人。
   ・地面と建物は一度だけ描いて貼る（bg）。高さのある物（木・街灯・石碑・掲示板・アルパカ・人）は
     y の順に描く（drawProps）。建物の当たりは描いた範囲ぜんぶ＝うしろに回りこめないので重なりは起きない。
   ・動くもの（炉の火・煙突の煙・石碑の光・旗・たき火・鳥）は drawAnim。
   ============================================================ */
(function () {
  "use strict";
  const MA = (window.MA = window.MA || {});
  const TAU = Math.PI * 2;
  const TS = 16, W = 46, H = 30;
  const PW = W * TS, PH = H * TS;
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  const shade = (c, k) => MA.Pix.shade(c, k);

  /* ══ 施設（名札の位置 lab・話しかける場所 spot はタイル単位）══ */
  const FAC = [
    { id: "board", nm: "依頼掲示板", sub: "クエストをえらぶ（冒険の地図）", lab: [27.5, 7.6], spot: [27.5, 11.9], open: "stages", c: "#ffd84a", ic: "scroll" },
    { id: "gate", nm: "深淵の門（星脈の石碑）", sub: "深淵踏破（エンドコンテンツ）", lab: [23, 10.6], spot: [23, 17.4], open: "abyss", c: "#a874ff", ic: "abyss" },
    { id: "tavern", nm: "酒場", sub: "キャラクター一覧・編成", lab: [34.5, 5.0], spot: [34.5, 9.2], open: "chars", c: "#ff6a5a", ic: "person" },
    { id: "smith", nm: "鍛冶屋", sub: "強化・作成・分解", lab: [5.6, 4.6], spot: [5.5, 8.1], open: "smith", c: "#ff8a3d", ic: "hammer" },
    { id: "shop", nm: "魔導具店", sub: "装備・道具を買う", lab: [15.5, 3.6], spot: [15.5, 8.1], open: "shop", c: "#7fd0ff", ic: "shop" },
    { id: "recept", nm: "ギルド本部（受付）", sub: "ストーリー・施設強化・遊び方", lab: [43, 8.4], spot: [42.6, 20.6], open: "reception", c: "#ff8fd0", ic: "person" },
    { id: "info", nm: "占いの天幕", sub: "キャラ育成・スキルツリー", lab: [3.5, 7.9], spot: [3.6, 13.2], open: "train", c: "#c27bff", ic: "tree" },
    { id: "notice", nm: "協会掲示", sub: "ミッション・実績・タイム", lab: [37.5, 20.4], spot: [37.5, 26.2], open: "missions", c: "#4fe39a", ic: "mission" },
    { id: "lib", nm: "資料室", sub: "図鑑", lab: [30.5, 23.6], spot: [30.5, 23.4], open: "codex", c: "#e8d080", ic: "book" },
    { id: "storage", nm: "倉庫", sub: "装備管理・アイテム", lab: [4, 22.6], spot: [4.5, 22.6], open: "storage", c: "#9ab0ff", ic: "chest" },
  ];
  /* 建物（当たり＝この長方形ぜんぶ）。タイル単位 */
  const BLD = {
    smith: [1, 0, 9, 7], shop: [12, 0, 7, 7], tavern: [29, 0, 11, 8], hall: [40, 7, 6, 12], tent: [0, 8, 7, 4],
    stall: [35, 21, 5, 4], library: [27, 25, 7, 5], shed: [0, 24, 8, 6],
  };
  /* 高さのある置物（y の順に描く）。x,y はタイル単位の足もと */
  const PROPS = [
    { k: "monolith", x: 23, y: 15.6, solid: [[22, 14], [23, 14], [22, 15], [23, 15]] },
    { k: "board", x: 27.5, y: 10.9, solid: [[26, 10], [27, 10], [28, 10]] },
    { k: "tree", x: 10.6, y: 6.6, v: 0, solid: [[10, 6]] }, { k: "tree", x: 19.8, y: 6.2, v: 1, solid: [[19, 5]] }, { k: "tree", x: 43.5, y: 29.4, v: 2 },
    { k: "tree", x: 25.5, y: 29.6, v: 1 }, { k: "tree", x: 18.6, y: 29.2, v: 0 }, { k: "tree", x: 44.6, y: 5.8, v: 2, solid: [[44, 5]] },
    { k: "tree", x: 8.4, y: 18.4, v: 1, solid: [[8, 17]] },
    { k: "lamp", x: 18.6, y: 11.6, solid: [[18, 11]] }, { k: "lamp", x: 28.4, y: 18.4, solid: [[28, 18]] }, { k: "lamp", x: 18.6, y: 18.4, solid: [[18, 18]] }, { k: "lamp", x: 33.6, y: 11.6, solid: [[33, 11]] },
    { k: "barrels", x: 26.4, y: 7.9 }, { k: "crates", x: 9.6, y: 25.6 }, { k: "anvil", x: 7.4, y: 7.8 },
    { k: "fencePost", x: 9.5, y: 20.2 }, { k: "fencePost", x: 17.5, y: 20.2 }, { k: "fencePost", x: 9.5, y: 26.2 }, { k: "fencePost", x: 17.5, y: 26.2 },
    { k: "campfire", x: 13.2, y: 27.9 }, { k: "signpost", x: 37.2, y: 15.4, solid: [[37, 15]] },
  ];
  /* 旗飾り（2本の柱のあいだ） */
  const BUNTING = [[9.5, 20.2, 17.5, 20.2], [9.5, 26.2, 17.5, 26.2], [2.4, 12.4, 9.5, 20.2]];

  function buildMap() {
    const tiles = new Uint8Array(W * H).fill(1);
    const block = (x, y, w, h) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (i >= 0 && j >= 0 && i < W && j < H) tiles[j * W + i] = 2; };
    Object.keys(BLD).forEach((k) => { const b = BLD[k]; block(b[0], b[1], b[2], b[3]); });
    PROPS.forEach((p) => (p.solid || []).forEach(([x, y]) => block(x, y, 1, 1)));
    return { W, H, tiles, roomAt: new Int16Array(W * H).fill(-1) };
  }

  /* ══════════════════════════════════════════════════════════════
     描く道具（ドットらしく、座標はいつも整数に丸める）
     ══════════════════════════════════════════════════════════════ */
  let g = null;
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const P1 = (x, y, c) => R(x, y, 1, 1, c);
  const ell = (x, y, rx, ry, c) => { g.fillStyle = c; g.beginPath(); g.ellipse(Math.round(x), Math.round(y), rx, ry, 0, 0, TAU); g.fill(); };
  const poly = (pts, c) => { g.fillStyle = c; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(Math.round(x), Math.round(y)) : g.moveTo(Math.round(x), Math.round(y)))); g.closePath(); g.fill(); };
  const line = (x1, y1, x2, y2, w, c) => { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); };

  /* 地面：草・土の道・広場の石畳 */
  const GRASS = ["#5f9a3c", "#67a442", "#5a9238", "#6dab47"];
  const DIRT = ["#b98a56", "#c09060", "#b1834f", "#c79a68"];
  function ground(r) {
    for (let y = 0; y < PH; y += 4) for (let x = 0; x < PW; x += 4) R(x, y, 4, 4, GRASS[Math.floor(r() * 4)]);
    /* 道（ふちはでこぼこ） */
    const cx = 23 * TS, cy = 14.5 * TS;
    const inRoad = (x, y) => {
      const n = Math.sin(x * 0.11) * 3 + Math.sin(y * 0.13 + 1) * 3;
      if (Math.abs(y - cy) < 34 + n && x < 39 * TS) return true;                          // 横の道（右はギルド本部の前まで）
      if (Math.abs(x - cx) < 34 + n) return true;                                           // 縦の道
      if (Math.hypot(x - cx, (y - cy) * 1.08) < 108 + n) return true;                      // 広場
      if (Math.abs(x - 34.5 * TS) < 20 + n && y > 7.5 * TS && y < cy) return true;          // 酒場への道
      if (Math.abs(x - 5.5 * TS) < 16 + n && y > 6.5 * TS && y < cy) return true;           // 鍛冶屋への道
      if (Math.abs(x - 15.5 * TS) < 16 + n && y > 6.5 * TS && y < cy) return true;          // 魔導具店への道
      if (Math.abs(y - 20.4 * TS) < 18 + n && x > cx && x < 45 * TS) return true;          // ギルド本部の前
      if (Math.abs(x - 42.6 * TS) < 18 + n && y > 18 * TS && y < 21 * TS) return true;
      if (Math.abs(x - 30.5 * TS) < 16 + n && y > cy && y < 25 * TS) return true;           // 資料室への道
      if (Math.abs(x - 37.5 * TS) < 16 + n && y > 25 * TS) return true;                     // 協会掲示の前
      if (Math.abs(y - 26.8 * TS) < 14 + n && x > 33 * TS && x < 41 * TS) return true;
      if (Math.abs(x - 4.5 * TS) < 16 + n && y > cy && y < 24 * TS) return true;            // 倉庫への道
      return false;
    };
    for (let y = 0; y < PH; y += 2) for (let x = 0; x < PW; x += 2) if (inRoad(x, y)) R(x, y, 2, 2, DIRT[Math.floor(r() * 4)]);
    /* 道のふちの影・小石 */
    for (let y = 2; y < PH; y += 2) for (let x = 0; x < PW; x += 2) if (inRoad(x, y) && !inRoad(x, y - 3)) R(x, y, 2, 1, "#8a6a3a");
    for (let i = 0; i < 260; i++) { const x = r() * PW, y = r() * PH; if (inRoad(x, y)) { R(x, y, 2, 2, r() < 0.5 ? "#9a7650" : "#d8b888"); if (r() < 0.3) R(x + 1, y + 2, 2, 1, "#7a5a32"); } }
    /* 広場の石の輪と、まんなかの草の島（石碑の台） */
    const ringR = 62;
    for (let a = 0; a < TAU; a += 0.045) {
      const x = cx + Math.cos(a) * ringR, y = cy + 6 + Math.sin(a) * ringR * 0.72;
      R(x - 4, y - 3, 8, 6, a % 0.18 < 0.09 ? "#c8c0b0" : "#b0a898"); R(x - 4, y + 2, 8, 1, "#7a7468");
    }
    for (let y = -46; y <= 46; y += 2) for (let x = -60; x <= 60; x += 2) { if ((x * x) / (56 * 56) + (y * y) / (40 * 40) < 1) R(cx + x, cy + 6 + y, 2, 2, GRASS[Math.floor(r() * 4)]); }
    /* 白い花（石碑のまわり） */
    for (let i = 0; i < 90; i++) { const a = r() * TAU, d = 20 + r() * 34; const x = cx + Math.cos(a) * d, y = cy + 6 + Math.sin(a) * d * 0.7; P1(x, y, r() < 0.8 ? "#ffffff" : "#ffe86a"); P1(x + 1, y, "#e8f0ff"); }
    /* 草むら・花（道でないところ） */
    for (let i = 0; i < 420; i++) {
      const x = r() * PW, y = r() * PH; if (inRoad(x, y)) continue;
      const k = r();
      if (k < 0.55) { R(x, y, 1, 3, "#3e7a2a"); R(x + 2, y + 1, 1, 2, "#3e7a2a"); R(x + 1, y - 1, 1, 3, "#8acb5a"); }
      else if (k < 0.8) { P1(x, y, ["#ff8fd0", "#ffe86a", "#ffffff", "#9ad8ff", "#ff6a5a"][Math.floor(r() * 5)]); P1(x, y + 1, "#3e7a2a"); }
      else ell(x, y, 3, 2, "#4f8a32");
    }
    return inRoad;
  }

  /* ── 建物の部品 ── */
  /* 青い瓦屋根（手前に下がる面）。x,y,w,h は px */
  function roof(x, y, w, h, base) {
    base = base || "#4a6aa8";
    R(x, y, w, h, base);
    for (let j = 0; j < h; j += 5) {
      R(x, y + j, w, 1, shade(base, 0.72));
      for (let i = (j / 5) % 2 ? 4 : 0; i < w; i += 8) { R(x + i, y + j + 1, 1, 4, shade(base, 0.8)); R(x + i + 2, y + j + 1, 3, 1, shade(base, 1.18)); }
    }
    R(x, y, w, 2, shade(base, 1.3));                  // 棟
    R(x, y + h - 2, w, 2, shade(base, 0.55));          // 軒の影
    R(x - 1, y, 1, h, shade(base, 0.6)); R(x + w, y, 1, h, shade(base, 0.6));
  }
  /* 木組みのしっくい壁 */
  function timber(x, y, w, h, plaster) {
    plaster = plaster || "#e8d8b8";
    R(x, y, w, h, plaster);
    R(x, y, w, 2, "#6a4428"); R(x, y + h - 3, w, 3, "#6a4428");
    for (let i = 0; i <= w; i += 16) R(x + Math.min(i, w - 2), y, 2, h, "#6a4428");
    for (let i = 0; i + 16 <= w; i += 32) { line(x + i + 2, y + 2, x + i + 16, y + h - 3, 1.5, "#7a5030"); }
    R(x, y + h - 1, w, 1, "#3a2414");
  }
  function stone(x, y, w, h, c) {
    c = c || "#9a96a0";
    R(x, y, w, h, c);
    for (let j = 0; j < h; j += 6) for (let i = (j / 6) % 2 ? 5 : 0; i < w; i += 10) { R(x + i, y + j, 9, 5, shade(c, 0.9 + ((i * 7 + j * 3) % 5) * 0.05)); R(x + i, y + j + 5, 10, 1, shade(c, 0.62)); R(x + i + 9, y + j, 1, 5, shade(c, 0.62)); }
    R(x, y + h - 1, w, 1, shade(c, 0.45));
  }
  function win(x, y, w, h) {
    R(x - 1, y - 1, w + 2, h + 2, "#4a2c18"); R(x, y, w, h, "#ffe8a0"); R(x, y, w, 2, "#fff6d0");
    R(x + Math.floor(w / 2), y, 1, h, "#6a4428"); R(x, y + Math.floor(h / 2), w, 1, "#6a4428");
    R(x - 2, y + h + 1, w + 4, 2, "#7a5030");
  }
  function door(x, y, w, h, c) {
    c = c || "#7a4a2a";
    R(x - 1, y - 1, w + 2, h + 1, "#3a2414"); R(x, y, w, h, c);
    for (let i = 3; i < w; i += 4) R(x + i, y, 1, h, shade(c, 0.75));
    P1(x + w - 3, y + Math.floor(h / 2), "#ffd84a");
  }
  function chimney(x, y) { R(x, y, 8, 12, "#8a7a74"); R(x - 1, y, 10, 3, "#6a5a54"); R(x + 2, y + 4, 4, 1, "#5a4a44"); }

  /* ── 建物ごと ── */
  function drawSmith() {
    const [bx, by] = BLD.smith, x = bx * TS, y = by * TS;
    /* 木の小屋（右）と石の炉（左の丸いかま） */
    roof(x + 56, y, 88, 50, "#4a6aa8");
    timber(x + 56, y + 50, 88, 46, "#e0cca8");
    door(x + 112, y + 70, 16, 26, "#6a3a1a");
    win(x + 72, y + 64, 14, 12);
    /* 武器を壁に掛ける */
    [[x + 92, y + 58, "#c8d0e0"], [x + 98, y + 56, "#c8d0e0"]].forEach(([sx, sy, c]) => { line(sx, sy, sx, sy + 22, 2, c); R(sx - 3, sy + 18, 7, 2, "#8a6a3a"); });
    /* 炉（石のドーム） */
    for (let j = 0; j < 70; j += 2) { const hw = Math.round(Math.sqrt(Math.max(0, 1 - Math.pow((j - 70) / 70, 2))) * 30); R(x + 30 - hw, y + 20 + j, hw * 2, 2, j % 6 < 2 ? "#8a8690" : "#a8a2ac"); }
    for (let j = 22; j < 90; j += 7) for (let i = -26; i < 26; i += 9) { const ww = Math.sqrt(Math.max(0, 1 - Math.pow((j - 90) / 70, 2))) * 30; if (Math.abs(i) < ww - 4) R(x + 30 + i, y + j, 8, 1, "#6a6670"); }
    ell(x + 30, y + 78, 14, 12, "#3a1a10"); ell(x + 30, y + 80, 11, 9, "#ff7a2a"); ell(x + 30, y + 82, 7, 6, "#ffd04a");
    R(x + 14, y + 90, 32, 6, "#6a6670");
    chimney(x + 22, y + 6);
    /* 柵と道具 */
    R(x + 2, y + 100, 52, 3, "#8a5a2a"); for (let i = 0; i < 6; i++) R(x + 4 + i * 10, y + 96, 3, 12, "#6a4422");
  }
  function drawShop() {
    const [bx, by] = BLD.shop, x = bx * TS, y = by * TS, w = 7 * TS;
    roof(x, y, w, 40, "#4f6fb0");
    timber(x, y + 40, w, 40, "#e8d8b8");
    win(x + 10, y + 50, 12, 12); win(x + w - 22, y + 50, 12, 12);
    /* 盾の飾り */
    [[x + 40, "#d8283e"], [x + 56, "#3a63ea"], [x + 72, "#ffd84a"]].forEach(([sx, c]) => { poly([[sx, y + 46], [sx + 10, y + 46], [sx + 10, y + 54], [sx + 5, y + 60], [sx, y + 54]], c); R(sx + 4, y + 47, 2, 11, "#ffffff"); });
    /* 縞のひさし（黄色と黒）と売り台 */
    for (let i = 0; i < w; i += 8) poly([[x + i, y + 78], [x + i + 8, y + 78], [x + i + 9, y + 90], [x + i - 1, y + 90]], (i / 8) % 2 ? "#2a2430" : "#f0c040");
    for (let i = 0; i < w; i += 8) ell(x + i + 4, y + 90, 4, 2, (i / 8) % 2 ? "#2a2430" : "#f0c040");
    R(x + 4, y + 92, w - 8, 14, "#8a5a2a"); R(x + 4, y + 92, w - 8, 3, "#a8743f");
    /* 売り物：剣・ポーション・盾 */
    [["#ff6a8a", 12], ["#7fd0ff", 20], ["#4fe39a", 28], ["#ffd84a", 36]].forEach(([c, dx]) => { R(x + dx, y + 86, 5, 6, c); R(x + dx + 1, y + 84, 3, 2, "#e8e0d0"); });
    line(x + 60, y + 96, x + 80, y + 86, 2, "#d8e0f0"); R(x + 58, y + 95, 5, 3, "#8a6a3a");
    poly([[x + 88, y + 84], [x + 98, y + 84], [x + 98, y + 92], [x + 93, y + 96], [x + 88, y + 92]], "#c8283a");
  }
  function drawTavern() {
    const [bx, by] = BLD.tavern, x = bx * TS, y = by * TS, w = 11 * TS;
    roof(x, y, w, 50, "#4a68a6");
    /* 2階のバルコニーと1階 */
    timber(x + 6, y + 50, w - 12, 34, "#ead8b4");
    win(x + 20, y + 58, 14, 14); win(x + 52, y + 58, 14, 14); win(x + w - 66, y + 58, 14, 14); win(x + w - 34, y + 58, 14, 14);
    R(x + 4, y + 82, w - 8, 4, "#6a4428"); for (let i = 8; i < w - 8; i += 6) R(x + i, y + 76, 2, 7, "#7a5030");
    stone(x + 6, y + 86, w - 12, 42, "#a09a92");
    door(x + w / 2 - 12, y + 98, 24, 30, "#7a4a2a");
    win(x + 22, y + 98, 18, 14); win(x + w - 40, y + 98, 18, 14);
    /* たるのジョッキの看板（屋根の上・泡つき） */
    const sx = x + 38, sy = y + 4;
    R(sx, sy + 10, 26, 30, "#a8743f"); R(sx + 2, sy + 12, 22, 26, "#c8904a"); R(sx, sy + 18, 26, 2, "#6a4428"); R(sx, sy + 30, 26, 2, "#6a4428");
    g.strokeStyle = "#a8743f"; g.lineWidth = 4; g.beginPath(); g.arc(sx + 28, sy + 24, 7, -1.4, 1.4); g.stroke();
    ell(sx + 6, sy + 10, 8, 6, "#fff8e8"); ell(sx + 16, sy + 7, 9, 7, "#ffffff"); ell(sx + 24, sy + 11, 6, 5, "#f0ece0");
    /* つるし看板 */
    R(x + w - 44, y + 88, 26, 2, "#3a2414"); R(x + w - 40, y + 90, 2, 6, "#3a2414"); R(x + w - 26, y + 90, 2, 6, "#3a2414");
    R(x + w - 44, y + 96, 26, 14, "#6a4428"); R(x + w - 42, y + 98, 22, 10, "#a8743f"); R(x + w - 36, y + 100, 10, 6, "#ffd84a");
    chimney(x + w - 30, y + 2);
    /* 窓から手をふる人（2階） */
    ell(x + 59, y + 64, 3, 3, "#f8d8c4"); R(x + 56, y + 60, 7, 3, "#ff8fd0");
    /* たる */
    [[x + 6, y + 116], [x + 18, y + 118], [x + w - 16, y + 116]].forEach(([tx, ty]) => { ell(tx + 5, ty + 6, 6, 7, "#8a5a2a"); R(tx - 1, ty + 2, 12, 1, "#3a2a1a"); R(tx - 1, ty + 9, 12, 1, "#3a2a1a"); ell(tx + 5, ty, 5, 2, "#a8743f"); });
  }
  function drawHall() {
    const [bx, by] = BLD.hall, x = bx * TS, y = by * TS, w = 6 * TS, h = 12 * TS;
    /* 塔のある石造りのギルド本部 */
    roof(x + 8, y, w - 16, 44, "#5a4aa0");
    poly([[x + w / 2, y - 8], [x + w / 2 + 8, y + 6], [x + w / 2 - 8, y + 6]], "#5a4aa0");
    stone(x + 4, y + 44, w - 8, h - 44, "#b0a8a0");
    roof(x, y + 104, w, 30, "#4a6aa8");
    win(x + 18, y + 62, 10, 16); win(x + w - 28, y + 62, 10, 16);
    door(x + w / 2 - 12, y + h - 40, 24, 40, "#5a3018");
    poly([[x + w / 2 - 14, y + h - 40], [x + w / 2, y + h - 52], [x + w / 2 + 14, y + h - 40]], "#8a7a70");
    /* 旗（ギルドの紋章） */
    R(x + 10, y + 140, 14, 26, "#c8203a"); poly([[x + 10, y + 166], [x + 17, y + 160], [x + 24, y + 166]], "#c8203a"); R(x + 15, y + 146, 4, 10, "#ffd84a"); R(x + 13, y + 149, 8, 3, "#ffd84a");
    R(x + w - 24, y + 140, 14, 26, "#3a63ea"); poly([[x + w - 24, y + 166], [x + w - 17, y + 160], [x + w - 10, y + 166]], "#3a63ea"); R(x + w - 19, y + 146, 4, 10, "#ffffff");
  }
  function drawTent() {
    const [bx, by] = BLD.tent, x = bx * TS, y = by * TS, w = 7 * TS, h = 4 * TS;
    /* 紫の天幕（占い）＋水晶玉のテーブル */
    poly([[x + 4, y + 30], [x + w / 2, y + 2], [x + w - 4, y + 30]], "#6a3aa0");
    for (let i = 0; i < 6; i++) poly([[x + w / 2, y + 2], [x + 4 + i * (w - 8) / 6, y + 30], [x + 4 + (i + 0.5) * (w - 8) / 6, y + 30]], i % 2 ? "#8a5ac8" : "#5a2a90");
    R(x + 6, y + 30, w - 12, h - 32, "#3a1a5a");
    for (let i = 0; i < w - 12; i += 10) poly([[x + 6 + i, y + 30], [x + 16 + i, y + 30], [x + 11 + i, y + 37]], "#ffd84a");
    R(x + w / 2 - 14, y + 44, 28, 12, "#5a2a1a"); R(x + w / 2 - 16, y + 42, 32, 4, "#8a4a2a");
    ell(x + w / 2, y + 36, 7, 7, "#9ad8ff"); ell(x + w / 2 - 2, y + 34, 3, 3, "#ffffff");
    /* 星の旗 */
    R(x + w / 2 - 1, y - 8, 2, 12, "#c8a060"); poly([[x + w / 2 + 1, y - 8], [x + w / 2 + 12, y - 4], [x + w / 2 + 1, y]], "#ffd84a");
  }
  function drawStall() {
    const [bx, by] = BLD.stall, x = bx * TS, y = by * TS, w = 5 * TS;
    /* 緑と白の縞の天幕（協会掲示：依頼書と記録） */
    for (let i = 0; i < w; i += 10) poly([[x + i, y + 2], [x + i + 10, y + 2], [x + i + 12, y + 26], [x + i - 2, y + 26]], (i / 10) % 2 ? "#f2f2ea" : "#2a9a6a");
    poly([[x + w / 2 - 6, y - 6], [x + w / 2 + 6, y - 6], [x + w + 2, y + 4], [x - 2, y + 4]], "#2a9a6a");
    for (let i = 0; i < w; i += 10) ell(x + i + 5, y + 26, 5, 3, (i / 10) % 2 ? "#f2f2ea" : "#2a9a6a");
    R(x + 2, y + 28, w - 4, 34, "#7a5030");
    R(x + 6, y + 30, w - 12, 22, "#c8a060");
    [[x + 9, y + 32], [x + 24, y + 31], [x + 40, y + 33], [x + 56, y + 32]].forEach(([px, py], i) => { R(px, py, 12, 15, ["#f0e2b8", "#fff4d0", "#e8d8a8", "#f8f0dc"][i]); R(px + 2, py + 4, 8, 1, "#a07a4a"); R(px + 2, py + 7, 8, 1, "#a07a4a"); P1(px + 5, py + 1, "#ff4a4a"); });
    R(x + 2, y + 56, w - 4, 6, "#a8743f");
    ell(x + w / 2, y + 41, 4, 4, "#4fe39a");
  }
  function drawLibrary() {
    const [bx, by] = BLD.library, x = bx * TS, y = by * TS, w = 7 * TS;
    /* 下の家は屋根だけ見える。手前（北）に本の台 */
    R(x, y + 18, w, 62, "#3a2a1a");
    roof(x, y + 14, w, 66, "#4a6aa8");
    R(x + w / 2 - 2, y + 14, 4, 66, "#3a5288");
    chimney(x + 16, y + 20);
    /* 本の台（屋根の手前） */
    R(x + 10, y + 2, w - 20, 14, "#7a4a2a"); R(x + 10, y + 2, w - 20, 3, "#a8743f");
    for (let i = 0; i < 14; i++) R(x + 14 + i * 6, y - 4, 4, 7, ["#a0402a", "#3a6a9a", "#4a8a4a", "#c8985a", "#7a4aa0"][i % 5]);
    R(x + w - 30, y - 10, 18, 12, "#f0e2b8"); R(x + w - 28, y - 7, 14, 1, "#a07a4a");
  }
  function drawShed() {
    const [bx, by] = BLD.shed, x = bx * TS, y = by * TS, w = 8 * TS;
    /* 倉庫（屋根は下の端・手前に木箱とたる） */
    R(x, y + 14, w, 82, "#3a2a1a");
    roof(x, y + 12, w, 84, "#6a5a8a");
    R(x + 8, y + 12, w - 16, 3, "#8a7aa8");
    [[x + 8, y - 6], [x + 22, y - 4], [x + 92, y - 6], [x + 106, y - 2]].forEach(([cx2, cy2], i) => { R(cx2, cy2, 13, 12, i % 2 ? "#a0682a" : "#8a5a2a"); R(cx2, cy2 + 5, 13, 1, "#5a3a1a"); R(cx2 + 6, cy2, 1, 12, "#5a3a1a"); });
    [[x + 50, y - 4], [x + 64, y - 2]].forEach(([tx, ty]) => { ell(tx + 5, ty + 6, 6, 7, "#8a5a2a"); R(tx - 1, ty + 2, 12, 1, "#3a2a1a"); R(tx - 1, ty + 9, 12, 1, "#3a2a1a"); ell(tx + 5, ty, 5, 2, "#a8743f"); });
  }
  /* 柵（アルパカの囲い） */
  function fence(x1, y1, x2, y2) {
    const n = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1) / 10));
    for (let i = 0; i <= n; i++) { const x = x1 + (x2 - x1) * i / n, y = y1 + (y2 - y1) * i / n; R(x - 1, y - 9, 3, 10, "#7a5030"); }
    line(x1, y1 - 7, x2, y2 - 7, 2, "#a8743f"); line(x1, y1 - 3, x2, y2 - 3, 2, "#a8743f");
  }

  /* ══ 背景をまとめて描く（一度だけ）══ */
  let bgCanvas = null;
  function drawBg() {
    if (bgCanvas) return bgCanvas;
    bgCanvas = MA.Pix.mkCanvas(PW, PH);
    g = bgCanvas.getContext("2d"); g.imageSmoothingEnabled = false;
    const r = rng(20261005);
    ground(r);
    /* 干し草・たき火の石 */
    ell(12 * TS, 23 * TS, 12, 6, "#d8b860"); ell(12 * TS - 3, 22.7 * TS, 8, 4, "#e8cc78");
    /* アルパカの囲い（柵）*/
    fence(9.5 * TS, 20.2 * TS, 17.5 * TS, 20.2 * TS); fence(9.5 * TS, 26.2 * TS, 17.5 * TS, 26.2 * TS);
    fence(9.5 * TS, 20.2 * TS, 9.5 * TS, 23 * TS); fence(17.5 * TS, 20.2 * TS, 17.5 * TS, 23 * TS);
    /* 敷物と、楽器を弾く場所 */
    ell(13.2 * TS, 28.3 * TS, 18, 6, "#8a3a2a"); ell(13.2 * TS, 28.3 * TS, 14, 4, "#b8503a");
    drawShed(); drawLibrary(); drawStall(); drawTent(); drawSmith(); drawShop(); drawTavern(); drawHall();
    g = null;
    return bgCanvas;
  }

  /* ══ 置物のスプライト（キャッシュ）══ */
  const propCache = {};
  function propSprite(k, v) {
    const key = k + "|" + (v || 0);
    if (propCache[key]) return propCache[key];
    let c, ax, ay;   // ax,ay … 足もとの位置（スプライトの中）
    const mk = (w, h) => { c = MA.Pix.mkCanvas(w, h); g = c.getContext("2d"); g.imageSmoothingEnabled = false; };
    if (k === "monolith") {
      /* 星脈の石碑：2本の青い石柱と、あいだに浮かぶ星脈の玉 */
      mk(64, 84); ax = 32; ay = 80;
      ell(32, 78, 26, 6, "rgba(0,0,0,.25)");
      poly([[10, 78], [16, 12], [26, 4], [30, 78]], "#4a6ab0"); poly([[16, 12], [26, 4], [24, 78], [14, 78]], "#6a8ad0"); poly([[17, 16], [22, 10], [20, 76], [16, 76]], "#9ab8f0");
      poly([[34, 78], [38, 4], [48, 14], [54, 78]], "#3a5aa0"); poly([[38, 4], [48, 14], [50, 78], [40, 78]], "#5a7ac0"); poly([[41, 12], [45, 16], [47, 76], [42, 76]], "#8aa8e0");
      R(10, 74, 44, 6, "#7a7488"); R(10, 74, 44, 2, "#a8a2b8");
      /* 刻まれた紋 */
      [[20, 30], [20, 46], [44, 34], [44, 52]].forEach(([x, y]) => { R(x, y, 2, 6, "#c8e8ff"); R(x - 2, y + 2, 6, 2, "#c8e8ff"); });
    } else if (k === "board") {
      /* 依頼掲示板：大きな木の板に紙がたくさん */
      mk(60, 54); ax = 30; ay = 52;
      R(6, 8, 4, 44, "#6a4428"); R(50, 8, 4, 44, "#6a4428");
      R(2, 4, 56, 34, "#7a4a2a"); R(4, 6, 52, 30, "#c8a060");
      R(0, 2, 60, 4, "#5a3418"); poly([[0, 2], [30, -4], [60, 2]], "#4a6aa8");
      const pr = rng(7);
      for (let i = 0; i < 11; i++) { const x = 6 + (i % 6) * 8 + pr() * 2, y = 8 + Math.floor(i / 6) * 13 + pr() * 2; R(x, y, 7, 10, ["#f0e2b8", "#fff4d0", "#e8d8a8"][i % 3]); R(x + 1, y + 3, 5, 1, "#a07a4a"); R(x + 1, y + 5, 4, 1, "#a07a4a"); P1(x + 3, y + 1, i % 3 ? "#ff4a4a" : "#3a6aff"); }
      R(22, 38, 16, 8, "#5a3418"); R(24, 40, 12, 4, "#ffd84a");
    } else if (k === "tree") {
      mk(40, 52); ax = 20; ay = 50;
      ell(20, 49, 14, 4, "rgba(0,0,0,.25)");
      R(17, 30, 6, 20, "#6a4428"); R(17, 30, 2, 20, "#8a5a34");
      const cols = v === 1 ? ["#d88aa8", "#e8a0bc", "#c07090", "#f4c0d4"] : v === 2 ? ["#d8a838", "#e8bc48", "#c09028", "#f4d470"] : ["#3f7a30", "#4f9038", "#356a28", "#6ab048"];
      ell(20, 22, 18, 16, cols[2]); ell(13, 20, 11, 10, cols[0]); ell(27, 18, 11, 10, cols[0]); ell(20, 12, 12, 10, cols[1]); ell(16, 9, 5, 4, cols[3]); ell(26, 14, 4, 3, cols[3]);
      for (let i = 0; i < 18; i++) { const a = i * 2.4, d = 4 + (i % 5) * 3; P1(20 + Math.cos(a) * d, 18 + Math.sin(a) * d * 0.8, cols[(i % 2) ? 3 : 2]); }
    } else if (k === "lamp") {
      mk(14, 40); ax = 7; ay = 38;
      R(6, 8, 2, 30, "#3a3440"); R(4, 34, 6, 4, "#3a3440"); R(3, 4, 8, 7, "#3a3440"); R(4, 5, 6, 5, "#ffe8a0"); R(2, 2, 10, 2, "#2a2430");
    } else if (k === "barrels") {
      mk(30, 20); ax = 15; ay = 18;
      [[4, 6], [16, 6], [10, 0]].forEach(([x, y]) => { ell(x + 6, y + 7, 6, 7, "#8a5a2a"); R(x, y + 3, 12, 1, "#3a2a1a"); R(x, y + 10, 12, 1, "#3a2a1a"); ell(x + 6, y + 1, 5, 2, "#a8743f"); });
    } else if (k === "crates") {
      mk(30, 24); ax = 15; ay = 22;
      [[0, 8], [14, 8], [7, 0]].forEach(([x, y], i) => { R(x, y, 14, 13, i % 2 ? "#a0682a" : "#8a5a2a"); R(x, y + 6, 14, 1, "#5a3a1a"); R(x + 6, y, 1, 13, "#5a3a1a"); R(x, y, 14, 1, "#c88a3a"); });
    } else if (k === "anvil") {
      mk(22, 16); ax = 11; ay = 14;
      R(7, 9, 8, 5, "#4a4450"); R(2, 4, 18, 5, "#6a6470"); R(2, 4, 18, 1, "#9a94a0"); poly([[20, 4], [22, 6], [20, 8]], "#6a6470"); R(5, 13, 12, 2, "#3a3440");
    } else if (k === "fencePost") {
      mk(8, 18); ax = 4; ay = 16;
      R(2, 0, 4, 16, "#7a5030"); R(2, 0, 4, 2, "#a8743f");
    } else if (k === "campfire") {
      mk(22, 14); ax = 11; ay = 11;
      [[2, 9], [7, 11], [13, 11], [18, 9], [10, 7]].forEach(([x, y]) => ell(x, y, 3, 2, "#7a7488"));
      line(4, 10, 18, 6, 2, "#6a4428"); line(4, 6, 18, 10, 2, "#6a4428");
    } else if (k === "signpost") {
      mk(30, 34); ax = 15; ay = 32;
      R(14, 6, 3, 28, "#6a4428");
      poly([[2, 6], [24, 6], [28, 10], [24, 14], [2, 14]], "#a8743f"); R(5, 9, 16, 1, "#5a3418");
      poly([[28, 16], [6, 16], [2, 20], [6, 24], [28, 24]], "#8a5a2a"); R(9, 19, 16, 1, "#5a3418");
    } else { mk(8, 8); ax = 4; ay = 7; R(0, 0, 8, 8, "#888"); }
    g = null;
    const out = { c, ax, ay };
    propCache[key] = out;
    return out;
  }

  /* ══ 動物（アルパカ・鳥）══ */
  const animalCache = {};
  function alpaca(fr, col) {
    const key = "al" + fr + col;
    if (animalCache[key]) return animalCache[key];
    const c = MA.Pix.mkCanvas(24, 26); g = c.getContext("2d"); g.imageSmoothingEnabled = false;
    const B = col, Bd = shade(col, 0.78), Bl = shade(col, 1.15);
    ell(10, 24, 9, 2, "rgba(0,0,0,.25)");
    const leg = fr % 2;
    R(4, 17, 3, 7 - leg, Bd); R(14, 17, 3, 7, Bd); R(7, 17, 3, 7, B); R(11, 17, 3, 7 - (1 - leg), B);
    ell(10, 14, 9, 6, B); ell(9, 12, 7, 4, Bl);
    /* くら（赤い布） */
    R(6, 9, 9, 6, "#c8283a"); R(6, 9, 9, 2, "#e85a5a"); R(7, 14, 7, 1, "#ffd84a");
    /* 首と頭 */
    const hy = fr === 2 ? 1 : 0;
    R(16, 4 + hy, 5, 10, B); R(16, 4 + hy, 2, 10, Bl);
    ell(19, 4 + hy, 4, 3, B); R(21, 4 + hy, 3, 3, Bl);
    R(17, 0 + hy, 2, 3, B); R(20, 0 + hy, 2, 3, B);
    P1(20, 3 + hy, "#14111c"); P1(23, 5 + hy, "#5a3a2a");
    g = null;
    const out = MA.Pix.outlineBuf ? c : c;
    animalCache[key] = out;
    return out;
  }
  function bird(fr) {
    const key = "bd" + fr;
    if (animalCache[key]) return animalCache[key];
    const c = MA.Pix.mkCanvas(10, 9); g = c.getContext("2d"); g.imageSmoothingEnabled = false;
    ell(5, 8, 3, 1, "rgba(0,0,0,.2)");
    ell(4, 5, 4, 3, "#f2f2f2"); R(1, 4, 3, 2, "#c8c8d0"); ell(7, 3, 2.2, 2, "#ffffff"); P1(8, 2, "#14111c"); R(9, 3, 1, 1, "#ffb03a");
    if (fr) { R(5, 1, 3, 2, "#e0e0e8"); } R(3, 7, 1, 2, "#ffb03a"); R(5, 7, 1, 2, "#ffb03a");
    g = null;
    animalCache[key] = c;
    return c;
  }
  const ANIMALS = [
    { k: "alpaca", x: 12.2 * TS, y: 23.6 * TS, col: "#e8c890", face: 1, t: 0 },
    { k: "alpaca", x: 15.4 * TS, y: 25.2 * TS, col: "#a8774a", face: -1, t: 1.3 },
    { k: "bird", x: 27.5 * TS, y: 13.2 * TS, face: -1, t: 0.4 }, { k: "bird", x: 28.6 * TS, y: 14.1 * TS, face: 1, t: 2.1 }, { k: "bird", x: 18.2 * TS, y: 16.8 * TS, face: 1, t: 1.1 },
  ];
  function updateAnimals(dt) {
    ANIMALS.forEach((a) => {
      a.t += dt;
      if (a.k === "bird") {
        /* ときどき跳ねて少し動く */
        a.hop = (a.hop || 0) - dt;
        if (a.hop <= 0) { a.hop = 1.2 + Math.random() * 2.6; a.vx = (Math.random() - 0.5) * 18; a.vy = (Math.random() - 0.5) * 10; a.face = a.vx > 0 ? 1 : -1; a.jt = 0.25; }
        if (a.jt > 0) { a.jt -= dt; a.x = Math.max(16 * TS, Math.min(31 * TS, a.x + a.vx * dt * 3)); a.y = Math.max(11.5 * TS, Math.min(18 * TS, a.y + a.vy * dt * 3)); }
      } else if (a.k === "alpaca") {
        a.walk = (a.walk || 0) - dt;
        if (a.walk <= 0) { a.walk = 3 + Math.random() * 4; a.tx = (10.6 + Math.random() * 6) * TS; a.ty = (21.4 + Math.random() * 4) * TS; }
        const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy);
        if (d > 2) { a.x += dx / d * 9 * dt; a.y += dy / d * 9 * dt; a.face = dx > 0 ? 1 : -1; a.moving = true; } else a.moving = false;
      }
    });
  }
  /* y の順に描くもの（置物＋動物）を list に足す */
  function collectProps(list) {
    PROPS.forEach((p) => list.push({ y: p.y * TS, prop: p }));
    ANIMALS.forEach((a) => list.push({ y: a.y, animal: a }));
  }
  function drawProp(gg, it, cx, cy, t) {
    if (it.prop) {
      const p = it.prop, s = propSprite(p.k, p.v);
      const x = Math.round(p.x * TS - s.ax - cx), y = Math.round(p.y * TS - s.ay - cy);
      gg.drawImage(s.c, x, y);
      if (p.k === "monolith") drawOrb(gg, p.x * TS - cx, p.y * TS - cy, t);
      if (p.k === "campfire") drawFire(gg, p.x * TS - cx, p.y * TS - cy - 6, t, 1);
      if (p.k === "lamp") { gg.globalAlpha = 0.18 + 0.06 * Math.sin(t * 3 + p.x); gg.fillStyle = "#ffe8a0"; gg.beginPath(); gg.arc(Math.round(p.x * TS - cx), Math.round(p.y * TS - cy - 30), 8, 0, TAU); gg.fill(); gg.globalAlpha = 1; }
      return;
    }
    const a = it.animal;
    let f;
    if (a.k === "alpaca") f = alpaca(a.moving ? Math.floor(a.t * 4) % 2 : (Math.floor(a.t * 0.7) % 3 === 2 ? 2 : 0), a.col);
    else f = bird(a.jt > 0 ? 1 : 0);
    const x = Math.round(a.x - cx), y = Math.round(a.y - cy - f.height + 2);
    if (a.face < 0) { gg.save(); gg.translate(x + f.width / 2, 0); gg.scale(-1, 1); gg.drawImage(f, -f.width / 2, y); gg.restore(); }
    else gg.drawImage(f, x - f.width / 2, y);
  }
  /* ══ 動くもの ══ */
  function drawFire(gg, x, y, t, s) {
    for (let i = 0; i < 5; i++) {
      gg.fillStyle = ["#ff5a1a", "#ff9a2a", "#ffd84a", "#ff7a2a", "#fff0a0"][i];
      const h = (5 + Math.sin(t * 11 + i * 1.9) * 2 + (i === 2 ? 3 : 0)) * s;
      gg.fillRect(Math.round(x + (i - 2) * 2.2 * s), Math.round(y - h), Math.ceil(2 * s), Math.ceil(h));
    }
  }
  function drawOrb(gg, x, y, t) {
    const gate = !!(MA.Save.S.dun.d3 && MA.Save.S.dun.d3.clears);
    const oy = y - 50 + Math.sin(t * 2) * 2;
    const a = gate ? 0.75 : 0.45;
    gg.globalAlpha = a * (0.35 + 0.15 * Math.sin(t * 3));
    gg.fillStyle = "#7fd0ff"; gg.beginPath(); gg.arc(Math.round(x), Math.round(oy), 12, 0, TAU); gg.fill();
    gg.globalAlpha = 1;
    gg.fillStyle = gate ? "#3a6aff" : "#3a4a8a"; gg.beginPath(); gg.arc(Math.round(x), Math.round(oy), 6, 0, TAU); gg.fill();
    gg.fillStyle = gate ? "#bfe8ff" : "#8aa0c8"; gg.beginPath(); gg.arc(Math.round(x - 1), Math.round(oy - 1), 3, 0, TAU); gg.fill();
    gg.fillStyle = "#ffffff"; gg.fillRect(Math.round(x - 3), Math.round(oy - 3), 2, 2);
    /* 立ちのぼる光の粒 */
    for (let i = 0; i < 6; i++) {
      const k = (t * 0.5 + i / 6) % 1;
      gg.globalAlpha = (1 - k) * (gate ? 0.9 : 0.5);
      gg.fillStyle = i % 2 ? "#bfe8ff" : "#ffffff";
      gg.fillRect(Math.round(x + Math.sin(i * 2.3 + t) * 16), Math.round(y - 8 - k * 60), 2, 2);
    }
    gg.globalAlpha = 1;
  }
  function drawAnim(gg, cx, cy, t) {
    /* 炉の火（鍛冶屋） */
    const sx = BLD.smith[0] * TS + 30 - cx, sy = BLD.smith[1] * TS + 86 - cy;
    gg.globalAlpha = 0.5 + 0.3 * Math.sin(t * 9); gg.fillStyle = "#ffb03a"; gg.beginPath(); gg.ellipse(Math.round(sx), Math.round(sy - 4), 9, 6, 0, 0, TAU); gg.fill(); gg.globalAlpha = 1;
    drawFire(gg, sx, sy + 2, t, 1.4);
    /* 煙突の煙（鍛冶屋・酒場・資料室） */
    [[BLD.smith[0] * TS + 26, BLD.smith[1] * TS + 4], [BLD.tavern[0] * TS + 11 * TS - 26, BLD.tavern[1] * TS], [BLD.library[0] * TS + 20, BLD.library[1] * TS + 18]].forEach(([x, y], j) => {
      for (let i = 0; i < 4; i++) {
        const k = (t * 0.35 + i / 4 + j * 0.13) % 1;
        gg.globalAlpha = (1 - k) * 0.45; gg.fillStyle = "#e8e4ee";
        const r = 3 + k * 7;
        gg.beginPath(); gg.arc(Math.round(x - cx + Math.sin(k * 5 + j) * 4 + k * 10), Math.round(y - cy - k * 34), r, 0, TAU); gg.fill();
      }
    });
    gg.globalAlpha = 1;
    /* 旗飾り（ゆれる） */
    const cols = ["#ff5a6a", "#ffd84a", "#4fe39a", "#5ab8ff", "#c27bff", "#ff8fd0"];
    BUNTING.forEach(([x1, y1, x2, y2], bi) => {
      const ax = x1 * TS - cx, ay = y1 * TS - cy - 14, bx = x2 * TS - cx, by = y2 * TS - cy - 14;
      const n = Math.max(4, Math.round(Math.hypot(bx - ax, by - ay) / 9));
      gg.strokeStyle = "#5a3a1a"; gg.lineWidth = 1; gg.beginPath();
      for (let i = 0; i <= n; i++) { const k = i / n; const x = ax + (bx - ax) * k, y = ay + (by - ay) * k + Math.sin(k * Math.PI) * 6; i ? gg.lineTo(x, y) : gg.moveTo(x, y); }
      gg.stroke();
      for (let i = 0; i < n; i++) {
        const k = (i + 0.5) / n; const x = ax + (bx - ax) * k, y = ay + (by - ay) * k + Math.sin(k * Math.PI) * 6;
        const sw = Math.sin(t * 2.4 + i * 0.9 + bi) * 1.5;
        gg.fillStyle = cols[(i + bi) % cols.length]; gg.beginPath(); gg.moveTo(Math.round(x - 3), Math.round(y)); gg.lineTo(Math.round(x + 3), Math.round(y)); gg.lineTo(Math.round(x + sw), Math.round(y + 7)); gg.closePath(); gg.fill();
      }
    });
    /* ギルド本部の旗のゆれ・ふわふわ飛ぶ綿毛 */
    for (let i = 0; i < 10; i++) {
      const k = (t * 0.05 + i * 0.137) % 1;
      const x = ((i * 97 + t * 14) % PW) - cx, y = ((i * 53 + k * PH) % PH) - cy;
      gg.globalAlpha = 0.55; gg.fillStyle = "#ffffff"; gg.fillRect(Math.round(x + Math.sin(t + i) * 6), Math.round(y), 2, 2);
    }
    gg.globalAlpha = 1;
  }

  MA.Town = { W, H, TS, PW, PH, FAC, BLD, PROPS, ANIMALS, buildMap, drawBg, drawAnim, collectProps, drawProp, updateAnimals, start: [23, 20.5] };
})();
