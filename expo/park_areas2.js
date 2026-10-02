/* ══════════════════════════════════════════════════════════════════
   XEVARION PARK — エリア（その2）★★ 2026-09-28d
   LEARNING CITY・GAME WORLD・SOCCER STADIUM・MOTOR CITY・RESORT・NIGHT ZONE・PUZZLE CITY・MEDIA CITY・BOCCIA ARENA・SPORTS CITY
   ・モノレール（島をひとまわり・駅4つ・乗れる）・エリアをつなぐ道の網・組み立ての順番（buildPark）
   ══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const T = THREE, X = XTex, P = XWorld.World.prototype, TAU = Math.PI * 2;
  const XP = XPark, A = XP.A;

  /* ══════════════ 9 XEVARION LEARNING CITY ══════════════ */
  P.buildLearning = function () {
    const w = this, cx = 277, cz = -12;
    w.areaZone("learn");
    w.places.push(["9 LEARNING CITY", 240, 128, Math.PI]);
    w.rect("plaza", 205, -110, 350, -78, 0.012); w.rect("plaza", 150, 45, 205, 85, 0.012); w.rect("plaza", 360, -55, 425, -5, 0.012); w.rect("plaza", 180, 88, 360, 112, 0.012);
    w.rect("lawnPark", cx - 62, cz - 38, cx + 62, cz + 44, 0.016);
    w.route([[cx - 62, cz + 3], [cx + 62, cz + 3]], 6, "paverWarm", { lamps: "globe", lampEvery: 20, bushes: false, curb: false });
    w.route([[cx, cz - 38], [cx, cz + 44]], 6, "paverWarm", { lamps: false, bushes: false, curb: false });
    /* 学園の本館（コの字・時計塔） */
    w.bld(cx, -97, 116, 22, 18, { key: "oBlue", roof: "hip", roofKey: "rBlue", rh: 7, sign: { text: "XEVARION ACADEMY", bg: "#1a3a8a", w: 22, h: 2.2, y: 14 }, inside: { type: "classroom", name: "アカデミーの教室", h: 5, door: 4, board: "きょうの授業：星と宇宙のふしぎ", actLabel: "授業を受ける（MagiLex で学ぶ）" } });
    w.box("white2", cx, 0, -84, 18, 26, 8); w.box("white2", cx, 26, -84, 12, 12, 8, {}); w.geo("rBlue", new T.ConeGeometry(9, 10, 4).rotateY(Math.PI / 4), cx, 43, -84); w.geo("gold", new T.ConeGeometry(0.15, 3, 4), cx, 49.5, -84); w.caster(cx, -84, 18, 8, 43);
    w.clockFace(cx, 31, -79.9, 0, 4);
    w.bld(212, -52, 64, 22, 15, { key: "oWhite", roof: "hip", roofKey: "rBlue", rh: 6, ry: Math.PI / 2, inside: { type: "classroom", name: "コンピュータ室", h: 5, door: 4, pc: true, board: "プログラミングとAI", actLabel: "パソコンで学ぶ（XEVYNAR）", app: "XEVYNAR" } });
    w.bld(342, -52, 64, 22, 15, { key: "oWhite", roof: "hip", roofKey: "rBlue", rh: 6, ry: -Math.PI / 2, inside: { type: "lab", name: "理科室", h: 5, door: 4 } });
    /* 図書館（ガラス＋ドーム）・歴史博物館（柱の並ぶ正面）・プラネタリウム・科学棟・クイズドーム・プログラミング・世界の村 */
    w.bld(175, 62, 36, 30, 16, { key: "gTeal", roof: "flat", roofKey: "rGreen", sign: { text: "LIBRARY", bg: "#0a5a5a", w: 14, h: 1.8, y: 12.5 }, inside: { type: "library", name: "図書館", h: 6, door: 4 } }); w.dome(175, 62, 10, "glassDome", "white2", 16, true);
    { const x = 160, z = -14; w.bld(x, z, 24, 30, 12, { key: "stoneW", roof: "gable", roofKey: "stoneW", rh: 4, ry: Math.PI / 2, gableKey: "stoneW", inside: { type: "gallery", name: "歴史博物館", h: 7, doorX: 2, door: 3, list: XWorld.World.prototype.PARK_DATA.EXHIBIT.history } }); for (let i = -3; i <= 3; i++) w.geo("stoneW", new T.CylinderGeometry(0.8, 0.9, 11, 12), x + 13.5, 5.5, z + i * 4); w.box("stoneW", x + 13.5, 11, z, 2, 1, 28);
      w.sign("HISTORY MUSEUM", { bg: "#8a6a3a", color: "#fff", px: 1024 }, 12, 1.4, x + 14.6, 12.4, z, Math.PI / 2); }
    w.rect("plaza", 360, 76, 414, 112, 0.012); for (let i = 0; i < 3; i++) w.bench(372 + i * 16, 109, Math.PI);     /* ★ プラネタリウムの入口の前の広場（前は芝生の中に入口があった） */
    w.domeHall(388, 60, 18, "offWhite", Math.PI / 2, { type: "planet", name: "プラネタリウム", hi: 3.8 }); w.sign("PLANETARIUM", { bg: "#1a2a5a", color: "#fff", glow: "#7fd8ff", px: 512 }, 10, 1.4, 388, 5.4, 78.4, 0);
    w.bld(395, -30, 30, 44, 12, { key: "techW", roof: "flat", ry: -Math.PI / 2, sign: { text: "SCIENCE LAB", bg: "#1a6a8a", w: 12, h: 1.6, y: 9 }, inside: { type: "lab", name: "サイエンスラボ", h: 6, door: 4 } }); w.dome(395, -42, 6, "glassDome", "white2", 12, true); w.dome(395, -18, 6, "glassDome", "white2", 12, true);
    { const x = cx, z = 78; w.domeHall(x, z, 16, "glassDomeP", Math.PI / 2, { type: "quiz", name: "クイズドーム", hi: 4.2 }); w.bigScreen(x, 8.6, z + 15.4, 0, 12, 5.0, "QUIZ DOME", ["Q. 地球から月までの距離は？", "Q. 水の化学式は？", "Q. 1 + 2 + … + 10 = ?", "Q. 光の速さは秒速何km？"], ["#2a1a6a", "#6a2a8a"]); }
    w.bld(345, 92, 30, 18, 10, { key: "techG", roof: "flat", sign: { text: "CODE LAB", bg: "#0a2a2a", w: 10, h: 1.4, y: 7.6, color: "#4fff9a" }, inside: { type: "classroom", name: "コードラボ", h: 5, pc: true, board: "はじめてのプログラミング", actLabel: "プログラミングを学ぶ（XEVYNAR）", app: "XEVYNAR" } });
    w.rect("plaza", 144, 90, 180, 112, 0.012);          /* ★★ 2026-09-30b 世界の村は門の前（x 222〜258）をあけて西へ */
    [[154, 100, "sBlue"], [171, 104, "sPink"], [188, 100, "sYellow"], [205, 104, "sMint"]].forEach(([x, z, k], i) => { w.bld(x, z, 13, 10, 7, { key: k, roof: "gable", roofKey: ["rRed", "rBlue", "rTeal", "rOrange"][i], rh: 3, inside: { h: 3.8, type: ["cafe", "shop", "food", "classroom"][i], name: ["English Café", "World Souvenir", "世界のごはん", "English Room"][i], menu: ["cafe", null, "diner", null][i], board: "Let's speak English!", actLabel: "英語で話してみる（MagiLex）" } }); w.flag(x, z + 7, [0xe84a4a, 0x3a78e8, 0xffffff, 0x2fbf6a][i], 7); });
    w.sign("GLOBAL VILLAGE — English Street", { bg: "#2a5a9a", color: "#fff", px: 1024 }, 14, 1.2, 180, 5.5, 110.2, 0);
    /* 池・DNA の彫刻・日時計 */
    w.pond(240, 20, 10, "fountain");
    w.helix(318, 22, 16);
    w.geo("stoneW", new T.CylinderGeometry(3, 3.4, 0.8, 24), 318, 0.4, -40); w.geo("gold", new T.ConeGeometry(0.2, 3, 4).rotateZ(0.5), 318, 2, -40);
    for (let i = 0; i < 10; i++) { w.plant(i % 2 ? "sakura" : "oak", cx - 58 + i * 13, cz - 42, 1.0); w.plant("oak", cx - 58 + i * 13, cz + 48, 0.95); }
    for (let i = 0; i < 8; i++) w.bench(cx - 50 + i * 14, cz + 8, Math.PI);
    w.areaGate(240, 118, 0, "learn", "big");
    w.plazaCrowd(cx, cz, 60, 1.0);
  };
  P.clockFace = function (x, y, z, ry, r) {
    const w = this, c = X.cv(256, 256), g = c.getContext("2d"); g.fillStyle = "#fffaf0"; g.beginPath(); g.arc(128, 128, 122, 0, TAU); g.fill(); g.strokeStyle = "#1a2a5a"; g.lineWidth = 8; g.stroke();
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; g.fillStyle = "#1a2a5a"; g.fillRect(128 + Math.cos(a) * 100 - 6, 128 + Math.sin(a) * 100 - 6, 12, 12); }
    const f = new T.Mesh(new T.CircleGeometry(r, 40), new T.MeshStandardMaterial({ map: X.tex(c), roughness: 0.5 })); f.position.set(x, y, z); f.rotation.y = ry; w.scene.add(f);
    const hs = [[r * 0.8, r * 0.06, 0], [r * 0.55, r * 0.09, 1]].map(([len, wd, k]) => { const h = new T.Mesh(new T.BoxGeometry(wd, len, 0.05), w.m.pNavy); h.geometry.translate(0, len / 2, 0); h.position.set(x + Math.sin(ry) * 0.04, y, z + Math.cos(ry) * 0.04); h.rotation.y = ry; w.scene.add(h); return [h, k]; });
    w.anim.push(() => { const d = new Date(), mm = d.getMinutes() + d.getSeconds() / 60, hh = (d.getHours() % 12) + mm / 60; hs.forEach(([h, k]) => { h.rotation.z = -(k === 0 ? mm / 60 : hh / 12) * TAU; }); });
  };
  P.helix = function (x, z, H) {
    const w = this;
    for (let i = 0; i < 40; i++) { const t = i / 40, a = t * TAU * 2.2, y = 1 + t * H; [0, Math.PI].forEach((o, k) => w.geo(k ? "pPink" : "pBlue", new T.SphereGeometry(0.6, 12, 8), x + Math.cos(a + o) * 2.6, y, z + Math.sin(a + o) * 2.6)); if (i % 2 === 0) w.geo("white2", new T.CylinderGeometry(0.12, 0.12, 5.2, 5).rotateZ(Math.PI / 2).rotateY(-a), x, y, z); }
    w.geo("stoneW", new T.CylinderGeometry(3.5, 3.8, 1, 24), x, 0.5, z); w.colCircle(x, z, 3.9);
  };

  /* ══════════════ 8 XEVARION GAME WORLD ══════════════ */
  P.buildGameWorld = function () {
    const w = this, SZ = 265;
    w.areaZone("game");
    w.places.push(["8 GAME WORLD", 175, 265, Math.PI / 2]);
    w.rect("plazaGray", 245, 168, 340, 225, 0.012); w.rect("plazaGray", 168, 226, 408, 300, 0.012); w.rect("plazaGray", 250, 330, 405, 362, 0.012);
    w.route([[170, SZ], [406, SZ]], 16, "darkGround", { lamps: false, bushes: false, walk: true });
    /* ゲームアリーナ（正面に巨大なコントローラー型の画面） */
    { const x = 292, z = 196;
      w.bld(x, z, 86, 44, 26, { key: "neonB", roof: "flat", roofKey: "rMetalB", crown: "neonPurple", inside: { type: "theater", name: "XEVARION GAME ARENA", h: 14, door: 6, video: "esports", screenTitle: "E-SPORTS ARENA", screenSub: ["TODAY'S MATCH", "E で動画を映せます（YouTube）"] } });
      const fz = z + 22.4;
      w.geo("pNavy", new T.BoxGeometry(34, 14, 1.6), x, 14, fz); [-17, 17].forEach((o) => w.geo("pNavy", new T.CylinderGeometry(7, 7, 1.6, 32).rotateX(Math.PI / 2), x + o, 14, fz));
      [-17, 17].forEach((o) => w.geo("neonCyan", new T.TorusGeometry(7.1, 0.18, 6, 48), x + o, 14, fz + 0.85));
      w.geo("neonWhite", new T.BoxGeometry(1.6, 5, 0.3), x - 17, 14, fz + 0.9); w.geo("neonWhite", new T.BoxGeometry(5, 1.6, 0.3), x - 17, 14, fz + 0.9);
      [[0, 2.2, "neonYellow"], [2.2, 0, "neonRed"], [0, -2.2, "neonGreen"], [-2.2, 0, "neonBlue"]].forEach(([a, b, k]) => w.geo(k, new T.CylinderGeometry(0.9, 0.9, 0.4, 16).rotateX(Math.PI / 2), x + 17 + a, 14 + b, fz + 0.9));
      w.gameScreen = w.bigScreen(x, 14, fz + 0.9, 0, 20, 9.5, "GAME WORLD", ["E-SPORTS ARENA", "TODAY'S MATCH 18:00", "VR・AR・RHYTHM・RACING", "PLAY TOGETHER!"], ["#3a0a6a", "#0a3a8a"]);
      w.sign("XEVARION GAME ARENA", { bg: "#1a0a3a", color: "#fff", glow: "#a86aff", px: 1024 }, 34, 3, x, 23.5, fz + 0.1, 0);
      w.caster(x, z, 86, 44, 26); }
    /* 通りの両側のネオンの建物 */
    const N1 = [["ARCADE XEVA", "neonA", "#ff4fb0"], ["VR ZONE", "neonB", "#4ff0ff"], ["RHYTHM LAND", "neonC", "#ffe04a"]], N2 = [["RACING SIM", "neonB", "#ff8a3a"], ["BOARD GAME CAFÉ", "sPeach", "#e8a040"], ["E-SPORTS CAFÉ", "neonA", "#a86aff"], ["PIXEL MUSEUM", "neonC", "#4fff9a"]];
    [[190, 238, 30, 18, 18, 0], [376, 238, 40, 22, 20, 1], [398, 196, 18, 40, 14, 2]].forEach(([x, z, ww, dd, h, i]) => w.bld(x, z, ww, dd, h, { key: N1[i][1], roof: "flat", crown: "neonCyan", ry: Math.PI * (i === 2 ? 0 : 0), sign: { text: N1[i][0], bg: "#10081e", glow: N1[i][2], w: Math.min(ww, dd) * 0.8, h: 2.2, y: h - 4 }, inside: { type: "arcade", name: N1[i][0], h: 5.5 } }));
    [[190, 305, 34, 26, 16], [240, 310, 30, 30, 22], [300, 305, 36, 26, 14], [358, 310, 36, 32, 18]].forEach(([x, z, ww, dd, h], i) => w.bld(x, z, ww, dd, h, { key: N2[i][1], shop: i === 1 ? "shopB" : null, roof: "flat", crown: i === 1 ? null : "neonPink", ry: Math.PI, sign: { text: N2[i][0], bg: "#10081e", glow: N2[i][2], w: ww * 0.75, h: 2.2, y: h - 4 }, inside: [{ type: "arcade", name: "RACING SIM", h: 5.5 }, { type: "gacha", name: "XEVA ガチャランド", h: 5.5 }, { type: "cafe", name: "E-SPORTS CAFÉ", h: 5, menu: "coffee" }, { type: "gallery", name: "ピクセル博物館", h: 5.5, list: XWorld.World.prototype.PARK_DATA.EXHIBIT.pixel }][i] }));
    /* 大きなドット絵のロボット（オリジナル）・リズムのステージ・ゲーム機の列・ホログラム */
    /* ★ 2026-09-29 XEVA ガチャランド（屋根に大きなガチャの機械・ネオン） */
    w.gachaMachine(240, 310, 7.5, "pRed", 22);
    w.sign("XEVA ガチャランド", { bg: "#10081e", color: "#fff", glow: "#ff4fb0", border: "#ffd84a", px: 1024 }, 18, 2.2, 240, 17.5, 310 - 15.2, Math.PI);
    [[190, 238, "star", "neonPink"], [376, 238, "note", "neonCyan"], [300, 305, "heart", "neonYellow"]].forEach(([x, z, k, key]) => w.neonIcon(k, x, 9, z + (z > 280 ? -13.2 : 11.2), 1.8, z > 280 ? Math.PI : 0, key));
    w.floatRing(292, 40, 196, 14, "neonPurple");
    w.pixelBot(270, 345);
    { const x = 385, z = 345; w.box("stageTop", x, 0, z, 30, 1, 20, { collide: true }); const led = new T.Mesh(new T.PlaneGeometry(28, 18, 14, 9), new T.MeshBasicMaterial({ vertexColors: true, toneMapped: false })); led.rotation.x = -Math.PI / 2; led.position.set(x, 1.02, z); const cc = new Float32Array(led.geometry.attributes.position.count * 3); led.geometry.setAttribute("color", new T.BufferAttribute(cc, 3)); w.scene.add(led); const hc = new T.Color();
      w.anim.push((dt, t) => { if (Math.abs(x - (w._camX || 0)) > 200 || Math.abs(z - (w._camZ || 0)) > 200) return; const p = led.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const b = Math.floor(p.getX(i) / 2) + Math.floor(p.getY(i) / 2), on = (b + Math.floor(t * 4)) % 3 === 0; hc.setHSL((b * 0.07 + t * 0.1) % 1, 0.9, on ? 0.6 : 0.15); cc[i * 3] = hc.r * 1.8; cc[i * 3 + 1] = hc.g * 1.8; cc[i * 3 + 2] = hc.b * 1.8; } led.geometry.attributes.color.needsUpdate = true; });
      w.sign("RHYTHM STAGE", { bg: "#1a0a3a", color: "#fff", glow: "#ffe04a", px: 512 }, 10, 1.6, x, 4, z - 10.1, Math.PI); }
    w.detail(() => { for (let i = 0; i < 14; i++) { const x = 200 + i * 7.5, z = SZ - 11; w.box("pNavy", x, 0, z, 1.2, 1.9, 0.9, { ry: Math.PI }); w.box(["neonCyan", "neonPink", "neonYellow"][i % 3], x, 1.2, z + 0.46, 0.9, 0.6, 0.02); } });
    for (let i = 0; i < 6; i++) { const hm = new T.Mesh(new T.IcosahedronGeometry(1.6, 0), [w.m.neonCyan, w.m.neonPink, w.m.neonPurple][i % 3]); hm.position.set(190 + i * 36, 14, SZ); w.scene.add(hm); const ph = i; w.anim.push((dt, t) => { hm.rotation.set(t * 0.7 + ph, t * 0.9, 0); hm.position.y = 14 + Math.sin(t + ph) * 1.2; }); }
    for (let i = 0; i < 10; i++) w.plant("palm", 180 + i * 24, SZ + 10.5, 1.0);
    w.areaGate(167, SZ, -Math.PI / 2, "game", "big");
    w.plazaCrowd(290, SZ, 40, 1.6); w.plazaCrowd(385, 345, 16, 2);
  };
  P.pixelBot = function (x, z) {
    const w = this, s = 1.6, pix = ["..XXXX..", ".XXXXXX.", "XX.XX.XX", "XXXXXXXX", ".X.XX.X.", "..XXXX..", ".XX..XX.", "XX....XX"];
    pix.forEach((row, j) => [...row].forEach((c, i) => { if (c === "X") w.box(j === 2 && (i === 2 || i === 5) ? "neonCyan" : j < 2 ? "pPurple" : j > 5 ? "pBlue" : "pPink", x + (i - 3.5) * s, (7 - j) * s + 1, z, s, s, s); }));
    w.box("stoneGray", x, 0, z, 16, 1, 5, { collide: true }); w.caster(x, z, 13, 2, 14);
    w.sign("XEVA-BOT", { bg: "#1a0a3a", color: "#fff", px: 512 }, 6, 1, x, 0.6, z + 2.55, 0);
  };

  /* ══════════════ 15 XEVARION SOCCER STADIUM ══════════════ */
  P.buildStadium = function (cx, cz) {
    const w = this, FW = 54, FH = 34;
    w.areaZone("soccer");
    w.places.push(["15 SOCCER STADIUM", cx - 88, cz + 4, Math.PI / 2]);
    const turf = new T.PlaneGeometry(FW + 18, FH + 16); turf.rotateX(-Math.PI / 2); w.batch.add("turf", w.m.turf, turf, new T.Matrix4().makeTranslation(cx, 0.02, cz));
    const line = (x0, z0, x1, z1) => { const L = Math.hypot(x1 - x0, z1 - z0), g = new T.PlaneGeometry(0.14, L); g.rotateX(-Math.PI / 2); g.rotateY(Math.atan2(x1 - x0, z1 - z0)); w.batch.add("lineW", w.m.lineW, g, new T.Matrix4().makeTranslation((x0 + x1) / 2, 0.03, (z0 + z1) / 2)); };
    const hx = FW / 2, hz = FH / 2;
    line(cx - hx, cz - hz, cx + hx, cz - hz); line(cx - hx, cz + hz, cx + hx, cz + hz); line(cx - hx, cz - hz, cx - hx, cz + hz); line(cx + hx, cz - hz, cx + hx, cz + hz); line(cx, cz - hz, cx, cz + hz);
    for (let i = 0; i < 40; i++) { const a = i / 40 * TAU, b = (i + 1) / 40 * TAU; line(cx + Math.cos(a) * 5.5, cz + Math.sin(a) * 5.5, cx + Math.cos(b) * 5.5, cz + Math.sin(b) * 5.5); }
    [-1, 1].forEach((s) => { const gx = cx + s * hx; line(gx, cz - 8, gx - s * 7, cz - 8); line(gx, cz + 8, gx - s * 7, cz + 8); line(gx - s * 7, cz - 8, gx - s * 7, cz + 8); line(gx, cz - 4, gx - s * 2.5, cz - 4); line(gx, cz + 4, gx - s * 2.5, cz + 4); line(gx - s * 2.5, cz - 4, gx - s * 2.5, cz + 4); });
    [-1, 1].forEach((s) => {
      const gx = cx + s * (hx + 0.1);
      [-2.7, 2.7].forEach((dz) => w.box("white2", gx, 0, cz + dz, 0.14, 2.2, 0.14)); w.box("white2", gx, 2.2, cz, 0.14, 0.14, 5.54);
      const net = new T.Mesh(new T.BoxGeometry(1.4, 2.2, 5.4), new T.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.5 })); net.position.set(gx + s * 0.75, 1.1, cz); w.scene.add(net);
    });
    const bx0 = cx - hx - 3, bx1 = cx + hx + 3, bz0 = cz - hz - 3, bz1 = cz + hz + 3;
    w.box("boardBlue", cx, 0, bz0, bx1 - bx0, 0.9, 0.2, { collide: true }); w.box("boardBlue", cx, 0, bz1, bx1 - bx0, 0.9, 0.2, { collide: true });
    w.box("boardBlue", bx1, 0, cz, 0.2, 0.9, bz1 - bz0, { collide: true });
    w.box("boardBlue", bx0, 0, (bz0 + cz - 3) / 2, 0.2, 0.9, (cz - 3) - bz0, { collide: true }); w.box("boardBlue", bx0, 0, (cz + 3 + bz1) / 2, 0.2, 0.9, bz1 - (cz + 3), { collide: true });
    for (let i = 0; i < 8; i++) { w.sign(["XEVARION", "MAGIBURST", "XEVA CAFÉ", "MAGILEX", "XEVARION PARK", "MAGIBATTLE", "XEVYNAR", "MAGISCOPE"][i], { bg: ["#1a3a8a", "#e84a4a", "#2c9e7a", "#3a78e8", "#8a4ae8", "#e8a020", "#1a8ad8", "#e84a8a"][i], color: "#fff", px: 512 }, 6, 0.8, cx - hx + 4 + i * 6.8, 0.45, bz0 - 0.12, Math.PI); }
    /* スタンド（下段・上段）：西に入口のすき間 */
    const bowl = (tiers, a0, b0, y0, dy, step, gapRows, keyFn) => {
      for (let r = 0; r < tiers; r++) {
        const aa = a0 + r * step, bb = b0 + r * step, y = y0 + r * dy, key = keyFn(r), N = 128, pos = [], idx = [];
        for (let i = 0; i <= N; i++) { const a = i / N * TAU; if (r < gapRows && Math.abs(Math.atan2(Math.sin(a - Math.PI), Math.cos(a - Math.PI))) < 0.16) continue; const c = Math.cos(a), s = Math.sin(a); pos.push(cx + c * aa, y, cz + s * bb, cx + c * (aa + step), y, cz + s * (bb + step), cx + c * aa, y - dy, cz + s * bb); }
        const n = pos.length / 9; for (let i = 0; i < n - 1; i++) { const a = i * 3, b = a + 3; idx.push(a, b, a + 1, a + 1, b, b + 1, a + 2, b + 2, a, a, b + 2, b); }
        const g = new T.BufferGeometry(); g.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); w.batch.add(key, w.m[key], g, new T.Matrix4());
      }
    };
    bowl(16, 40, 28, 1.2, 0.9, 1.4, 16, (r) => r % 6 === 5 ? "seatsWhite" : "seatsBlue2");
    bowl(12, 64, 52, 17.5, 1.05, 1.4, 0, (r) => r % 5 === 4 ? "seatsWhite" : "seatsRed");
    /* ★★ 2026-09-30 スタンドの裏・下をふさぐ（ご指定「スタジアムなどの椅子の部分などが裏から見るとバグっています」）
       下段の背の壁（上段の足もとまで）・上段の下の斜めの天井・外の壁（白い格子の外装）。西の入口はあける */
    { const N = 128, gap = (q) => Math.abs(Math.atan2(Math.sin(q - Math.PI), Math.cos(q - Math.PI))) < 0.17;
      const surf = (key, fa, fb, fy, out, skipGap) => {            /* fa/fb/fy(t, u)：u=0,1 の2本の線のあいだの帯。out＝外向き（true）/ 内向き・下向き */
        const pos = [], idx = []; for (let i = 0; i <= N; i++) { const q = i / N * TAU, c = Math.cos(q), s2 = Math.sin(q); [0, 1].forEach((u) => pos.push(cx + c * fa(u), fy(u), cz + s2 * fb(u))); if (i < N && !(skipGap && gap((i + 0.5) / N * TAU))) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); } }
        const g = new T.BufferGeometry(); g.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
        const nr = g.attributes.normal, p = g.attributes.position; let sc = 0; for (let i = 0; i < nr.count; i += 5) { const dx = p.getX(i) - cx, dz = p.getZ(i) - cz; sc += (nr.getX(i) * dx + nr.getZ(i) * dz) * (out === "down" ? 0 : 1) + (out === "down" ? -nr.getY(i) : 0); }
        if ((out === true || out === "down") !== (sc > 0)) { const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const q = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = q; } g.computeVertexNormals(); }
        w.batch.add(key, w.m[key], g, new T.Matrix4());
      };
      const LA = 40 + 16 * 1.4, LB = 28 + 16 * 1.4;                /* 下段の外のふち */
      [true, false].forEach((o) => surf("concrete", () => LA, () => LB, (u) => u ? 17.5 : 0, o, true));
      surf("concrete", (u) => u ? 64 + 12 * 1.4 : 64, (u) => u ? 52 + 12 * 1.4 : 52, (u) => u ? 17.5 + 11 * 1.05 - 0.05 : 17.5 - 0.95, "down", false);
      [true, false].forEach((o) => surf(o ? "white2" : "concrete", () => 82.2, () => 70.2, (u) => u ? 30.8 : 0, o, true));
      for (let i = 0; i < 56; i++) { const q = i / 56 * TAU; if (gap(q)) continue; w.box("pNavy", cx + Math.cos(q) * 82.4, 0, cz + Math.sin(q) * 70.4, 0.5, 30, 0.35, { ry: Math.atan2(Math.cos(q) * 70.4, Math.sin(q) * 82.4) }); }
      [8, 16, 24].forEach((y) => surf("neonCyan", () => 82.35, () => 70.35, (u) => y + u * 0.18, true, true));
      /* ★★ 2026-09-30b 西の入口のすき間：下の段の断面をふさぐ */
      [Math.PI - 0.165, Math.PI + 0.165].forEach((q) => { const c2 = Math.cos(q), s2 = Math.sin(q), pos = [], idx = []; const P3 = (u, y) => [cx + c2 * (40 + u), y, cz + s2 * (28 + u)];
        for (let r = 0; r < 16; r++) { const y = 1.2 + r * 0.9, qd = [P3(r * 1.4, 0), P3((r + 1) * 1.4, 0), P3((r + 1) * 1.4, y), P3(r * 1.4, y)]; let b = pos.length / 3; qd.forEach((p) => pos.push(...p)); idx.push(b, b + 1, b + 2, b, b + 2, b + 3); b = pos.length / 3; qd.forEach((p) => pos.push(...p)); idx.push(b, b + 2, b + 1, b, b + 3, b + 2); }
        const g = new T.BufferGeometry(); g.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); w.batch.add("concrete", w.m.concrete, g, new T.Matrix4()); }); }
    const ring = (a, b, y, key, t) => { const pts = []; for (let i = 0; i < 128; i++) { const q = i / 128 * TAU; pts.push(new T.Vector3(cx + Math.cos(q) * a, y, cz + Math.sin(q) * b)); } w.geo(key, new T.TubeGeometry(new T.CatmullRomCurve3(pts, true), 256, t, 6, true), 0, 0, 0); };
    ring(62.5, 50.5, 16.6, "white2", 0.9); ring(81.5, 69.5, 30.5, "white2", 1.2); ring(66, 54, 34, "white2", 0.8);
    { const pos = [], idx = [], N = 128; for (let i = 0; i <= N; i++) { const q = i / N * TAU; pos.push(cx + Math.cos(q) * 84, 31, cz + Math.sin(q) * 72, cx + Math.cos(q) * 62, 34, cz + Math.sin(q) * 50); } for (let i = 0; i < N; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } const g = new T.BufferGeometry(); g.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); const rm = new T.MeshStandardMaterial({ color: 0xeef4fa, roughness: 0.3, metalness: 0.2, transparent: true, opacity: 0.8, side: T.DoubleSide }); w.scene.add(new T.Mesh(g, rm)); }
    for (let i = 0; i < 28; i++) { const q = i / 28 * TAU; w.box("white2", cx + Math.cos(q) * 84, 0, cz + Math.sin(q) * 72, 1.2, 31, 1.2, { collide: false }); if (i % 2 === 0) w.box("lampGlowB", cx + Math.cos(q) * 64, 33.2, cz + Math.sin(q) * 52, 3, 0.4, 3); }
    w.casterRing = true; w.caster(cx, cz - 60, 170, 24, 32); w.caster(cx, cz + 60, 170, 24, 32); w.caster(cx + 72, cz, 24, 110, 32); w.caster(cx - 72, cz - 34, 24, 44, 32); w.caster(cx - 72, cz + 34, 24, 44, 32);
    /* 大画面（南北） */
    w.bigScreen(cx, 26, cz - 66, 0, 26, 12, "XEVARION", ["SOCCER STADIUM", "3 vs 3 — PLAY NOW", "GOAL!!", "XEVARION PARK"], ["#0a3a1a", "#0a2a6a"]);
    w.bigScreen(cx, 26, cz + 66, Math.PI, 26, 12, "KICK OFF", ["BLUE vs RED", "LIVE", "XEVARION CUP"], ["#1a1a5a", "#5a1a1a"]);
    /* スタンドの観客（小さな人・インスタンス） */
    w.standCrowd(cx, cz, [[40, 28, 1.2, 0.9, 1.4, 16, 0.16], [64, 52, 17.5, 1.05, 1.4, 12, 0]]);
    /* 当たり判定（入口のすき間を残す）・入口のトンネル */
    /* ★ 2026-09-29 客席の形（だ円）どおりの当たり。前は四角い壁で、角に見えない壁・客席の角は通りぬけられた */
    w.colEll(cx, cz, 39.6, 27.6, 85.2, 73.2, [[Math.PI - 0.17, Math.PI + 0.17]]);
    w.colObb(cx - 62, cz - 6.5, 48, 1, 0); w.colObb(cx - 62, cz + 6.5, 48, 1, 0);
    w.box("stoneGray", cx - 62, 0, cz - 6.5, 48, 5, 1, {}); w.box("stoneGray", cx - 62, 0, cz + 6.5, 48, 5, 1, {}); w.box("stoneGray", cx - 62, 5, cz, 48, 1, 14, {});
    w.sign("PLAYERS' ENTRANCE", { bg: "#1a3a1a", color: "#fff", px: 1024 }, 10, 1.2, cx - 86.2, 3.8, cz, -Math.PI / 2);
    w.sign("XEVARION SOCCER STADIUM", { grad: ["#1f5ad8", "#2fbfb0"], color: "#fff", px: 1024 }, 40, 4, cx - 84.8, 24, cz, -Math.PI / 2);
    w.soccer = { cx, cz, FW, FH, goalW: 5.4 };
    w.npcSpots.soccer = [[cx - hx - 6, cz + 4, Math.PI / 2]];
    w.interact(cx - hx - 6, cz, 4, "サッカーの試合をする（3対3）", () => ({ game: "soccer" }), "⚽");
    /* スタジアム広場（西） */
    w.disk(cx - 108, cz, 34, "plaza", 0.014);
    w.geo("white2", new T.IcosahedronGeometry(3.2, 1), cx - 108, 5.2, cz); w.geo("stoneW", new T.CylinderGeometry(2.4, 3, 2, 12), cx - 108, 1, cz); w.collider(cx - 111, cz - 3, cx - 105, cz + 3);
    [-20, 20].forEach((o) => w.kiosk(cx - 118, cz + o, Math.PI / 2, o < 0 ? "STADIUM FOOD" : "FAN SHOP", o < 0 ? "#e84a4a" : "#1a5ad8", o < 0 ? "awningR" : "awningB"));
    for (let i = 0; i < 8; i++) w.flag(cx - 128 + i * 6, cz - 30, i % 2 ? 0x2a8a4a : 0xffffff, 9);
    w.areaGate(cx - 55, cz + 84, 0, "soccer", "big");
    w.plazaCrowd(cx - 108, cz, 30, 1.8);
  };
  P.standCrowd = function (cx, cz, decks) {
    const w = this, r = X.rnd(99), list = [];
    decks.forEach(([a0, b0, y0, dy, step, rows, gap]) => { for (let k = 0; k < rows; k++) { const aa = a0 + k * step + step * 0.45, bb = b0 + k * step + step * 0.45, y = y0 + k * dy, per = TAU * Math.sqrt((aa * aa + bb * bb) / 2), n = Math.floor(per / 0.75); for (let i = 0; i < n; i++) { if (r() > 0.62) continue; const q = i / n * TAU; if (gap && Math.abs(Math.atan2(Math.sin(q - Math.PI), Math.cos(q - Math.PI))) < gap) continue; list.push([cx + Math.cos(q) * aa, y, cz + Math.sin(q) * bb, Math.atan2(-Math.cos(q), -Math.sin(q))]); } } });
    const g = XWorld.mergeGeos([new T.BoxGeometry(0.42, 0.7, 0.3).translate(0, 0.35, 0), new T.BoxGeometry(0.24, 0.26, 0.24).translate(0, 0.84, 0)]);
    const m = new T.MeshLambertMaterial({ color: 0xffffff });
    m.onBeforeCompile = (sh) => { sh.uniforms.uTime = XP.TIME; sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uTime;").replace("#include <begin_vertex>", "#include <begin_vertex>\n{ vec4 ip = instanceMatrix * vec4(0.0,0.0,0.0,1.0); float ph = fract(sin(dot(ip.xz, vec2(12.9898, 78.233))) * 43758.5); transformed.y += max(0.0, sin(uTime * (3.0 + ph * 3.0) + ph * 20.0)) * 0.18 * step(0.7, ph); }"); };
    const im = new T.InstancedMesh(g, m, list.length), m4 = new T.Matrix4(), c = new T.Color(), cols = [0x2a5ad8, 0xffffff, 0xe84a4a, 0xffd24a, 0x2a8a4a, 0x1a2a5a, 0xff8ac8];
    list.forEach(([x, y, z, ry], i) => { m4.compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(0, ry, 0)), new T.Vector3(1, 1, 1)); im.setMatrixAt(i, m4); c.setHex(cols[Math.floor(r() * cols.length)]); im.setColorAt(i, c); });
    im.frustumCulled = false; w.scene.add(im); (w.farObjs = w.farObjs || []).push({ o: im, x: cx, z: cz, r: 900 });
  };

  /* ══════════════ 16 XEVARION MOTOR CITY ══════════════ */
  P.buildMotor = function () {
    const w = this;
    w.areaZone("motor");
    w.places.push(["16 MOTOR CITY（カート）", 8, -228, Math.PI]);
    /* ★★ 2026-09-29b サーキットは XEVARION DOME のまわりを1周（東半分はハーバーの湖になった） */
    /* ★★ 2026-09-29c 北の直線を 20m 南へ（モノレールの真下を走っていて、柱がコースの上に立っていた） */
    const C = [[-150, -262], [-40, -262], [34, -262], [60, -274], [70, -302], [70, -360], [62, -420], [54, -478], [38, -520], [6, -548], [-48, -562], [-118, -566], [-188, -561], [-238, -545], [-276, -515], [-298, -470], [-302, -404], [-292, -342], [-270, -296], [-230, -268]];
    const curve = new T.CatmullRomCurve3(C.map(([x, z]) => new T.Vector3(x, 0, z)), true, "centripetal");
    const N = 800, pts = curve.getSpacedPoints(N), W = 14;
    const pos = [], uvs = [], idx = []; let len = 0;
    for (let i = 0; i <= N; i++) {
      const p = pts[i % N], q = pts[(i + 1) % N], d = new T.Vector3().subVectors(q, p).normalize(), n = new T.Vector3(-d.z, 0, d.x);
      if (i > 0) len += pts[i % N].distanceTo(pts[(i - 1) % N]);
      const L = p.clone().addScaledVector(n, -W / 2), R = p.clone().addScaledVector(n, W / 2);
      pos.push(L.x, 0.035, L.z, R.x, 0.035, R.z); uvs.push(0, len / 6, 2, len / 6);
    }
    for (let i = 0; i < N; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const g = new T.BufferGeometry(); g.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new T.Float32BufferAttribute(uvs, 2)); g.setIndex(idx); g.computeVertexNormals();
    const road = new T.Mesh(g, w.m.asphalt); road.receiveShadow = true; w.scene.add(road);
    const band = (off0, off1, y, key) => { const cp = [], cu = [], ci = []; for (let i = 0; i <= N; i++) { const p = pts[i % N], q = pts[(i + 1) % N], d = new T.Vector3().subVectors(q, p).normalize(), n = new T.Vector3(-d.z, 0, d.x); const A2 = p.clone().addScaledVector(n, off0), B2 = p.clone().addScaledVector(n, off1); cp.push(A2.x, y, A2.z, B2.x, y + 0.02, B2.z); cu.push(0, i * 0.5, 1, i * 0.5); } for (let i = 0; i < N; i++) { const a = i * 2; ci.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } const cg = new T.BufferGeometry(); cg.setAttribute("position", new T.Float32BufferAttribute(cp, 3)); cg.setAttribute("uv", new T.Float32BufferAttribute(cu, 2)); cg.setIndex(ci); cg.computeVertexNormals(); w.scene.add(new T.Mesh(cg, w.m[key])); };
    band(W / 2 - 0.2, W / 2 + 1.3, 0.05, "curb"); band(-W / 2 - 1.3, -W / 2 + 0.2, 0.05, "curb");
    band(W / 2 + 1.3, W / 2 + 6, 0.03, "asphaltCity"); band(-W / 2 - 6, -W / 2 - 1.3, 0.03, "asphaltCity");
    w.m.curb.side = T.DoubleSide;
    for (let i = 0; i < N; i += 4) {
      const p = pts[i], q = pts[(i + 1) % N], d = new T.Vector3().subVectors(q, p).normalize(), n = new T.Vector3(-d.z, 0, d.x);
      [1, -1].forEach((s) => { const b = p.clone().addScaledVector(n, s * (W / 2 + 6.4)); const key = (i / 4) % 2 ? "boardBlue" : "boardRed"; const bg = new T.BoxGeometry(0.4, 1.0, 3.2); bg.rotateY(Math.atan2(d.x, d.z)); w.batch.add(key, w.m[key], bg, new T.Matrix4().makeTranslation(b.x, 0.5, b.z)); });
    }
    /* スタート・フィニッシュのゲート・大スタンド・ピット */
    const S0 = C[1], sl = X.cv(256, 64), sgc = sl.getContext("2d"); for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) { sgc.fillStyle = (i + j) % 2 ? "#111" : "#fff"; sgc.fillRect(i * 16, j * 16, 16, 16); }
    const slm = new T.Mesh(new T.PlaneGeometry(W, 2.5), new T.MeshBasicMaterial({ map: X.tex(sl) })); slm.rotation.x = -Math.PI / 2; slm.rotation.z = Math.PI / 2; slm.position.set(S0[0], 0.06, S0[1]); w.scene.add(slm);
    [-1, 1].forEach((s) => w.box("darkMetal", S0[0], 0, S0[1] + s * (W / 2 + 2), 0.8, 10, 0.8, { collide: true }));
    w.box("darkMetal", S0[0], 9, S0[1], 1, 2.4, W + 5);
    w.sign("START / FINISH", { bg: "#111", color: "#fff", glow: "#ffb020", px: 1024 }, W, 1.8, S0[0] - 0.55, 10.2, S0[1], -Math.PI / 2); w.sign("START / FINISH", { bg: "#111", color: "#fff", glow: "#ffb020", px: 1024 }, W, 1.8, S0[0] + 0.55, 10.2, S0[1], Math.PI / 2);
    for (let i = 0; i < 5; i++) w.box("neonRed", S0[0] + 0.55, 8.3, S0[1] - 4 + i * 2, 0.1, 0.7, 0.7);
    w.bld(-20, -236, 190, 16, 11, { key: "gSilver", roof: "flat", roofKey: "rMetal", crown: "neonRed" });
    for (let i = 0; i < 16; i++) w.box("darkMetal", -104 + i * 11.2, 0, -244.1, 8, 5, 0.2);
    w.sign("XEVARION MOTOR CITY — PIT", { bg: "#d8402a", color: "#fff", px: 1024 }, 40, 3, -20, 9, -244.2, Math.PI);
    w.geo("gDark", new T.CylinderGeometry(7, 5, 10, 16), 80, 16, -236); w.geo("white2", new T.CylinderGeometry(7.4, 7.4, 0.6, 16), 80, 21.3, -236); w.box("white2", 80, 0, -236, 5, 11, 5);
    for (let r = 0; r < 14; r++) w.box(r % 4 === 3 ? "seatsWhite" : "seatsRed", -30, r * 0.85, -283 - r * 1.2, 150, 0.85, 1.2, { collide: r === 0 });
    w.box("white2", -30, 16, -292, 156, 0.5, 20); for (let i = 0; i < 9; i++) w.box("white2", -100 + i * 17.5, 0, -300, 0.6, 16, 0.6);
    w.collider(-105, -300, 45, -282); w.caster(-30, -291, 156, 20, 16);
    w.standCrowd2(-30, -283, 150, 14);
    [[-318, -440, 56, Math.PI / 2], [-318, -372, 40, Math.PI / 2]].forEach(([x, z, L, ry]) => { for (let r = 0; r < 8; r++) w.box("seatsBlue2", x - (ry ? r * 1.2 : 0), r * 0.85, z - (ry ? 0 : r * 1.2), ry ? 1.2 : L, 0.85, ry ? L : 1.2, { collide: r === 0 }); w.caster(x, z - 5, ry ? 10 : L, ry ? L : 10, 7); });
    /* サーキットをまたぐ歩道橋（XEVARION の看板） */
    /* ドームへの歩道橋（スタートの直線をまたぐアーチ・歩いてわたれる） */
    { const x = -125, z0 = -238, z1 = -288, hh = 7, wd = 6, L = z0 - z1, zc = (z0 + z1) / 2, n = 24;
      for (let i = 0; i < n; i++) { const t0 = i / n, t1 = (i + 1) / n, y0 = Math.sin(Math.PI * t0) * hh, y1 = Math.sin(Math.PI * t1) * hh, za = z0 - L * t0, zb = z0 - L * t1, sl = Math.hypot(za - zb, y1 - y0); const g = new T.BoxGeometry(wd, 0.4, sl + 0.05).rotateX(Math.atan2(y1 - y0, za - zb)); w.geo("white2", g, x, (y0 + y1) / 2 + 0.2 - 0.2, (za + zb) / 2); [-1, 1].forEach((k) => w.geo("chromeB", new T.BoxGeometry(0.1, 0.08, sl).rotateX(Math.atan2(y1 - y0, za - zb)), x + k * (wd / 2 - 0.1), (y0 + y1) / 2 + 1.25, (za + zb) / 2)); }
      [-1, 1].forEach((k) => { w.colObb(x + k * (wd / 2 + 0.1), zc, 0.3, L, 0); for (let i = 1; i < n; i += 2) { const t = i / n; w.geo("darkMetal", new T.BoxGeometry(0.06, 1.1, 0.06), x + k * (wd / 2 - 0.1), Math.sin(Math.PI * t) * hh + 0.75, z0 - L * t); } });
      (w.heightExtra = w.heightExtra || []).push({ arch: 1, cx: x, cz: zc, ang: 0, hw: wd / 2, hl: L / 2, h: hh });
      w.sign("XEVARION DOME →", { grad: ["#1a4ab8", "#6a3ad8"], color: "#fff", px: 1024 }, 10, 1.6, x, hh + 2.6, zc + 0.3, 0); w.sign("← MOTOR CITY", { grad: ["#d8402a", "#6a1a1a"], color: "#fff", px: 1024 }, 10, 1.6, x, hh + 2.6, zc - 0.3, Math.PI);
      w.route([[-30, -150], [-80, -190], [-122, -226], [-125, -236]], 8, "paverWarm", { lamps: "modern", lampEvery: 20, trees: false, benches: false }); }
    w.buildDome(-125, -425);
    /* 入口の広場・カートコース・シミュレーター館・未来の EV の展示 */
    w.disk(0, -140, 34, "plazaGray", 0.014);
    w.bld(180, -170, 50, 34, 14, { key: "gDark", roof: "flat", crown: "neonCyan", sign: { text: "RACING SIMULATOR", bg: "#0a1a2a", w: 18, h: 2, y: 10, glow: "#4ff0ff" }, inside: { type: "arcade", name: "レーシングシミュレーター", h: 6, door: 4 } });
    { const x = 100, z = -130; w.bld(x, z, 44, 26, 10, { key: "gSilver", roof: "flat", roofKey: "rMetalW", ry: -Math.PI / 2, sign: { text: "FUTURE EV SHOWROOM", bg: "#1a2a4a", w: 16, h: 1.6, y: 8 }, inside: { type: "showroom", name: "未来の EV ショールーム", h: 6.5, door: 5, list: XWorld.World.prototype.PARK_DATA.EXHIBIT.ev } }); }
    w.kartTrack(-170, -165);
    for (let i = 0; i < 6; i++) w.raceCar(-92 + i * 14, -251, 0, [0xe84a4a, 0x3a78e8, 0xffd24a, 0x2a8a4a, 0xffffff, 0x8a4ae8][i]);
    w.circuit = { pts, W, curve, start: new T.Vector3(S0[0], 0, S0[1]), len };
    w.npcSpots.kart = [[8, -226, Math.PI]];
    w.interact(8, -228, 4, "妖怪スカイグランプリに出る（上空のカートレース・3周）", () => ({ game: "kart" }), "🏁");
    /* ★★ 2026-09-30 上空のコースへの入口（光の輪・看板） */
    w.floatRing(8, 5.5, -228, 3.2, "neonPink"); w.floatRing(8, 8.5, -228, 2.4, "neonCyan");
    w.sign("YOKAI SKY GRAND PRIX ↑ 上空のカートレース", { grad: ["#ff4fb0", "#a86aff"], color: "#fff", glow: "#ffd0f0", px: 1024, both: true }, 9, 1.1, 8, 3.2, -232.5, 0);
    w.ambientRacers(curve, len);
    w.areaGate(0, -100, 0, "motor", "big");
    w.plazaCrowd(0, -140, 32, 1.4); w.plazaCrowd(-30, -300, 40, 0.8);
  };
  P.standCrowd2 = function (cx, z0, L, rows) {
    const w = this, r = X.rnd(7), list = [];
    for (let k = 0; k < rows; k++) for (let x = -L / 2 + 0.5; x < L / 2; x += 0.8) if (r() < 0.6) list.push([cx + x, k * 0.85 + 0.85, z0 - k * 1.2 - 0.3]);
    const g = XWorld.mergeGeos([new T.BoxGeometry(0.42, 0.7, 0.3).translate(0, 0.35, 0), new T.BoxGeometry(0.24, 0.26, 0.24).translate(0, 0.84, 0)]);
    const im = new T.InstancedMesh(g, new T.MeshLambertMaterial({ color: 0xffffff }), list.length), m4 = new T.Matrix4(), c = new T.Color(), cols = [0xe84a4a, 0xffffff, 0x3a78e8, 0xffd24a, 0x1a1a2a];
    list.forEach(([x, y, z], i) => { m4.compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(0, 0, 0)), new T.Vector3(1, 1, 1)); im.setMatrixAt(i, m4); c.setHex(cols[Math.floor(r() * cols.length)]); im.setColorAt(i, c); });
    im.frustumCulled = false; w.scene.add(im); (w.farObjs = w.farObjs || []).push({ o: im, x: cx, z: z0, r: 800 });
  };
  P.raceCar = function (x, z, ry, color) {
    const g = new T.Group(), m = new T.MeshStandardMaterial({ color, roughness: 0.25, metalness: 0.6 }); m.envMapIntensity = 1.2;
    const b = new T.Mesh(new T.BoxGeometry(1.8, 0.5, 4.6), m); b.position.y = 0.45; g.add(b);
    const nose = new T.Mesh(new T.BoxGeometry(0.8, 0.35, 1.6), m); nose.position.set(0, 0.4, 2.8); g.add(nose);
    const wing = new T.Mesh(new T.BoxGeometry(2.2, 0.08, 0.6), this.m.darkMetal); wing.position.set(0, 1.1, -2.2); g.add(wing);
    const fw = new T.Mesh(new T.BoxGeometry(2.2, 0.06, 0.5), this.m.darkMetal); fw.position.set(0, 0.25, 3.4); g.add(fw);
    const cock = new T.Mesh(new T.BoxGeometry(0.7, 0.4, 1.0), this.m.windowDark); cock.position.set(0, 0.85, 0.2); g.add(cock);
    const wg = new T.CylinderGeometry(0.42, 0.42, 0.45, 12); wg.rotateZ(Math.PI / 2);
    [[-1.05, 1.5], [1.05, 1.5], [-1.05, -1.5], [1.05, -1.5]].forEach(([a, c]) => { const wh = new T.Mesh(wg, this.m.darkMetal); wh.position.set(a, 0.42, c); g.add(wh); });
    g.position.set(x, 0, z); g.rotation.y = ry; this.scene.add(g); this.loose(g, 320); return g;
  };
  P.ambientRacers = function (curve, L) {
    const w = this, cars = [0xe8303a, 0x2a6ae8, 0xf0c020, 0xffffff].map((c, i) => ({ g: w.raceCar(0, 0, 0, c), off: i * 0.07, spd: 38 + i * 2 }));
    w.anim.push((dt, t) => { const hide = !!w.raceActive; cars.forEach((c) => { c.g.visible = !hide; if (hide) return; const u = (c.off + t * c.spd / L) % 1, p = curve.getPointAt(u), q = curve.getPointAt((u + 0.002) % 1); c.g.position.set(p.x, 0.04, p.z); c.g.lookAt(q.x, 0.04, q.z); }); });
  };
  P.kartTrack = function (x, z) {
    const w = this, pts = [];
    for (let i = 0; i <= 64; i++) { const a = i / 64 * TAU; pts.push([x + Math.cos(a) * (40 + Math.sin(a * 2) * 10), z + Math.sin(a) * 26]); }
    w.route(pts, 8, "asphaltCity", { raw: true, lamps: false, bushes: false, walk: false, noRoad: true, curb: false });          /* ★ 2026-09-30b カートのコースは歩く道ではない（道とつながない・柵を置かない） */
    (w.blockPaths = w.blockPaths || []).push({ pts: pts.slice(0, 64), w: 11 });
    w.rect("lawnPark", x - 30, z - 14, x + 30, z + 14, 0.02);
    for (let i = 0; i < 64; i += 2) { const [px, pz] = pts[i]; const a = i / 64 * TAU; w.box(i % 4 ? "boardRed" : "white2", px + Math.cos(a) * 4.6, 0, pz + Math.sin(a) * 4.6, 0.8, 0.5, 0.8); }
    const karts = [0xff4f6a, 0x4fa8ff, 0xffd24a].map((c) => { const k = new T.Mesh(new T.BoxGeometry(1.2, 0.4, 2), new T.MeshStandardMaterial({ color: c, roughness: 0.4 })); w.scene.add(k); return k; });
    const cv = new T.CatmullRomCurve3(pts.slice(0, 64).map(([a, b]) => new T.Vector3(a, 0.3, b)), true);
    w.anim.push((dt, t) => karts.forEach((k, i) => { const u = (t * 0.04 + i * 0.15) % 1, p = cv.getPointAt(u), q = cv.getPointAt((u + 0.01) % 1); k.position.copy(p); k.lookAt(q); }));
    w.sign("KART CIRCUIT", { bg: "#d8402a", color: "#fff", px: 512 }, 8, 1.4, x, 2.5, z + 30, 0);
  };

  /* ══════════════ 20 XEVARION RESORT ══════════════ */
  P.buildResort = function () {
    const w = this;
    w.areaZone("resort");
    w.places.push(["20 RESORT", 552, 42, -Math.PI / 2]);
    w.rect("plaza", 548, 20, 600, 60, 0.012); w.rect("plazaGray", 690, -130, 725, -90, 0.012);
    /* 三日月形のグランドホテル（海の方＝東を向く）＋中央の塔 */
    const hc = [600, 40], R = 105;
    for (let i = 0; i < 9; i++) { if (i >= 3 && i <= 5) continue;     /* ★ まん中はグランドリゾートの塔（前は塔と翼の建物が重なって、ロビーの中に別の建物の壁があった） */
      const a = -0.62 + i / 8 * 1.24, x = hc[0] + Math.cos(a) * R, z = hc[1] + Math.sin(a) * R; w.bld(x, z, 26, 18, 38 + (4 - Math.abs(i - 4)) * 3.5, { key: i % 2 ? "hWhite" : "hSand", roof: "flat", roofKey: "rGreen", ry: Math.PI / 2 - a, crown: "neonWhite" }); }
    w.bld(hc[0] + R + 2, hc[1], 30, 24, 74, { key: "hSand", roof: "hip", roofKey: "rGold", rh: 10, ry: Math.PI / 2, crown: "neonYellow", sign: { text: "XEVARION GRAND RESORT", bg: "#8a6a2a", w: 20, h: 2.6, y: 66 }, inside: { type: "lobby", name: "グランドリゾートのロビー", h: 8, door: 5, deskSign: "FRONT  フロント", actLabel: "ロビーのソファでくつろぐ", text: "ようこそ XEVARION GRAND RESORT へ。海の見えるお部屋と、屋上のプール（空想）。" } });
    w.bld(705, -110, 32, 32, 96, { key: "gTeal", roof: "flat", crown: "neonCyan", sign: { text: "OCEAN TOWER", bg: "#0a4a5a", w: 16, h: 2, y: 90 }, inside: { type: "lobby", name: "オーシャンタワー", h: 7, door: 5, deskSign: "OCEAN TOWER  展望ロビー", actLabel: "海の見えるロビーで休む" } });
    /* インフィニティプール（ヤシの島・プールバー）・デッキチェア・パラソル */
    { const px = 762, pz = 40; const sh = new T.Shape(); for (let i = 0; i <= 64; i++) { const a = i / 64 * TAU, rr = 1 + 0.14 * Math.sin(a * 3) + 0.06 * Math.sin(a * 5); if (i) sh.lineTo(Math.cos(a) * 22 * rr, Math.sin(a) * 44 * rr); else sh.moveTo(Math.cos(a) * 22 * rr, Math.sin(a) * 44 * rr); }
      const g = new T.ShapeGeometry(sh, 1); g.rotateX(-Math.PI / 2); w.water(g, px, 0.09, pz, "pool"); w.colEll(px, pz, 0, 0, 22 * 1.08, 44 * 1.08);
      [[0, -20], [4, 18]].forEach(([a, b]) => { w.disk(px + a, pz + b, 5, "sandFlat", 0.12); w.palm(px + a, pz + b, 1.1); w.palm(px + a + 1.5, pz + b + 1, 0.9); });
      w.geo("woodLight", new T.CylinderGeometry(4, 4, 1.2, 16), px - 8, 0.6, pz); w.geo("fabricW", new T.ConeGeometry(5, 1.6, 12), px - 8, 3.6, pz); w.box("woodLight", px - 8, 0, pz, 0.3, 3, 0.3);
      for (let i = 0; i < 22; i++) { const a = i / 22 * TAU, x = px + Math.cos(a) * 30, z = pz + Math.sin(a) * 52; if (x < 732) continue; if (i % 2) w.umbrellaSet(x, z, a, i); else w.lounger(x, z, a + Math.PI); } }
    /* ヴィラ・スパ・庭園・海ぞいのテラス */
    for (let i = 0; i < 10; i++) { const x = 575 + (i % 5) * 26, z = 175 + Math.floor(i / 5) * 30; w.bld(x, z, 16, 12, 6, { key: "sWhite", roof: "hip", roofKey: "rRed", rh: 3.5, inside: { type: "room", name: "ヴィラ " + (i + 1), h: 4.5 } }); w.pool(x + 10, z, 5, 8, 0, "pool"); }
    w.dome(760, 200, 14, "glassDome", "gold"); w.bld(730, 200, 26, 18, 8, { key: "hMint", roof: "flat", roofKey: "rGreen", sign: { text: "OCEAN SPA", bg: "#2a8a7a", w: 10, h: 1.4, y: 6 }, inside: { type: "spa", name: "オーシャンスパ", h: 5 } });
    { const x = 600, z = -85; for (let i = -3; i <= 3; i++) { w.hedge(x + i * 9, z - 20, 7, 1, 1.1); w.hedge(x + i * 9, z + 20, 7, 1, 1.1); } for (let i = -2; i <= 2; i++) { w.hedge(x - 30, z + i * 8, 1, 6, 1.1); w.hedge(x + 30, z + i * 8, 1, 6, 1.1); } w.pond(x, z, 7, "fountain"); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; w.flowerBed(x + Math.cos(a) * 14, z + Math.sin(a) * 12, 5, 2, -a, i + 400); w.plant("poplar", x + Math.cos(a) * 24, z + Math.sin(a) * 16, 1.0); } }
    const terr = []; for (let i = 0; i <= 30; i++) { const a = -0.34 + i / 30 * 0.62; terr.push(XP.islandPt0(a, 0.93)); }
    w.route(terr, 7, "woodDeck", { lamps: "globe", lampEvery: 24, benches: 30, bushes: false });
    /* マリーナ（入り江の桟橋・ヨット）・灯台 */
    { const [mx, mz] = XP.islandPt0(-0.08, 0.99); for (let k = 0; k < 3; k++) { const z = mz - 20 + k * 20; w.geo("woodDeck", new T.BoxGeometry(46, 0.3, 3), mx + 18, 0.4, z); for (let j = 0; j < 4; j++) { const yacht = new T.Group(); const h = new T.Mesh(new T.BoxGeometry(3, 1.4, 10), w.m.white2); h.position.y = 0.4; yacht.add(h); const c2 = new T.Mesh(new T.BoxGeometry(2.4, 1.2, 4), w.m.windowDark); c2.position.set(0, 1.5, -1); yacht.add(c2); const mast = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 11, 4), w.m.white2); mast.position.set(0, 6, 1); yacht.add(mast); yacht.position.set(mx + 6 + j * 11, -0.4, z + 6); yacht.rotation.y = Math.PI / 2; w.scene.add(yacht); w.loose(yacht, 380); } }
      const [lx, lz] = XP.islandPt0(0.05, 1.0); w.geo("white2", new T.CylinderGeometry(2.2, 3.4, 22, 16), lx, 11, lz); for (let i = 0; i < 4; i++) w.geo("pRed", new T.CylinderGeometry(2.3 + (3 - i) * 0.25, 2.4 + (3 - i) * 0.25, 2.4, 16), lx, 3 + i * 5, lz); w.geo("glassDome", new T.CylinderGeometry(2, 2, 3, 12), lx, 23.5, lz); w.geo("pRed", new T.ConeGeometry(2.6, 2.4, 12), lx, 26.2, lz); w.geo("lampGlow", new T.SphereGeometry(1.1, 10, 8), lx, 23.5, lz); w.colCircle(lx, lz, 3.5); w.casterCircle(lx, lz, 3, 24); }
    for (let i = 0; i < 30; i++) { const x = 560 + (i % 6) * 40 + ((i * 7) % 9), z = -140 + Math.floor(i / 6) * 90 + ((i * 13) % 11); if (Math.hypot(x - 762, z - 40) < 58 || Math.abs(Math.hypot(x - 600, z - 40) - 105) < 24 || !w.insideIsland(x, z, 12)) continue; w.palm(x, z, 1.2); }
    w.areaGate(548, 40, -Math.PI / 2, "resort", "big");
    w.plazaCrowd(740, 40, 60, 0.9); w.plazaCrowd(600, 40, 40, 0.8);
  };

  /* ══════════════ 21 XEVARION NIGHT ZONE（ネオン街・★ 2026-09-30b 昼夜はほかのエリアと同じ） ══════════════ */
  P.buildNightZone = function () {
    const w = this;
    w.areaZone("night");          /* ★★ 2026-09-30b ほかのエリアと同じく昼夜が変わる（ご指定） */
    w.places.push(["21 NIGHT ZONE", 480, 322, Math.PI / 2]);
    w.rect("plazaGray", 474, 244, 580, 476, 0.012); w.rect("plazaGray", 580, 244, 790, 330, 0.012); w.rect("plazaGray", 580, 380, 670, 460, 0.012);
    w.castle(612, 300, 1.35, "castleDark", "rPurple", "rPurple", Math.PI);
    for (let i = 0; i < 12; i++) w.box("neonPurple", 612 - 18 + i * 3.3, 16, 286.4, 0.3, 2.4, 0.1);
    w.pond(625, 420, 34, "night");
    w.nightWheel(738, 410);
    /* ネオンの通り・謎の館・脱出ゲーム・夜のライブ */
    [[500, 360, "neonA", "NEON STREET"], [525, 395, "neonC", "KARAOKE STAR"], [505, 440, "neonB", "NIGHT BAR"]].forEach(([x, z, k, t], i) => w.bld(x, z, 26, 22, 14 + i * 3, { key: k, roof: "flat", crown: "neonPink", ry: -Math.PI / 2, sign: { text: t, bg: "#10081e", glow: ["#ff4fb0", "#ffe04a", "#4ff0ff"][i], w: 14, h: 2, y: 10 }, inside: [{ type: "arcade", name: "NEON STREET ゲームセンター", h: 5.5 }, { type: "karaoke", name: "KARAOKE STAR", h: 5.5 }, { type: "food", name: "NIGHT BAR", h: 5, menu: "bar" }][i] }));
    { const x = 700, z = 290; w.bld(x, z, 34, 24, 16, { key: "sLav", roof: "gable", roofKey: "rSlate", rh: 9, ry: Math.PI, sign: { text: "MYSTERY MANSION", bg: "#1a0a2a", glow: "#a86aff", w: 14, h: 1.8, y: 12 }, inside: { type: "haunted", name: "ミステリーマンション（お化け屋敷）", h: 6, glass: false, doorX: 12 } }); w.turret(x + 18, z - 10, 3, 22, "sLav", "rSlate"); for (let i = -3; i <= 3; i++) w.box("neonPurple", x + i * 4, 3, z - 12.2, 1, 1.6, 0.05); }
    w.bld(760, 330, 30, 26, 12, { key: "neonB", roof: "flat", ry: -Math.PI / 2, sign: { text: "ESCAPE ROOMS", bg: "#0a1a2a", glow: "#4fff9a", w: 14, h: 1.8, y: 9 }, inside: { type: "escape", name: "脱出ゲームの館", h: 5, glass: false } });
    { const x = 560, z = 262; w.box("stageTop", x, 0, z, 30, 1.2, 16, { collide: true }); w.box("darkMetal", x - 15, 0, z - 8, 0.5, 12, 0.5); w.box("darkMetal", x + 15, 0, z - 8, 0.5, 12, 0.5); w.box("darkMetal", x, 12, z - 8, 30.5, 0.5, 0.5);
      for (let i = 0; i < 5; i++) w.spotBeam(x - 12 + i * 6, 12, z - 8, [0xff4fb0, 0x4ff0ff, 0xa86aff, 0xffe04a, 0x4fff9a][i], (i - 2) * 0.2);
      w.sign("NIGHT LIVE", { bg: "#1a0a3a", color: "#fff", glow: "#ff4fb0", px: 512 }, 12, 1.8, x, 13.5, z - 8.3, Math.PI); }
    /* 光のトンネル（アーチの列） */
    for (let i = 0; i < 16; i++) { const z = 250 + i * 12; const a = new T.TorusGeometry(5, 0.2, 6, 32, Math.PI); w.geo(["neonPink", "neonCyan", "neonPurple", "neonYellow"][i % 4], a, 482, 0, z, 0); }
    for (let i = 0; i < 40; i++) { const a = i / 40 * TAU; w.box(["neonPink", "neonCyan", "neonPurple", "neonYellow"][i % 4], 625 + Math.cos(a) * 38, 0, 420 + Math.sin(a) * 38, 0.3, 4, 0.3); }
    /* ★★ 2026-09-29 アンダー横丁（れんがの高架・提灯・ネオンの店・小川と太鼓橋・大きな提灯の塔） */
    w.viaduct([[548, 345], [548, 472]], 8.5, 7, { lanterns: true });
    [["深夜食堂", "yPurple", "neonA", "norK", "ramen"], ["ネオン酒場", "yRed", "neonC", "norK", null], ["夜パフェ", "yPink", "neonB", "norP", "pudding"], ["占いの館", "yPurple", "neonA", "norP", null], ["夜市", "yTeal", "neonB", "norO", "takoyaki"]].forEach(([n, k, sh, nr, pr], i) => {
      w.yomaShop(564, 356 + i * 23, 20, 12, 7.5 + (i % 2) * 3, { ry: -Math.PI / 2, key: k, shop: sh, roof: i % 2 ? "barrel" : "kawara", roofKey: ["kwK", "kwP", "kwB"][i % 3], eyes: i % 2 ? { iris: ["irisC", "irisB"][i % 2], look: 0.3 } : false, sign: n, signColor: "#10081e", glow: ["#ff4fb0", "#4ff0ff", "#ffe04a", "#a86aff", "#4fff9a"][i], noren: nr, prop: pr, neon: { kind: ["moon", "star", "heart", "crystal", "cat"][i], key: ["neonPurple", "neonCyan", "neonPink", "neonYellow", "neonGreen"][i] },
        inside: [{ type: "food", name: "深夜食堂", menu: "ramen", light: "neon" }, { type: "food", name: "ネオン酒場", menu: "bar", light: "neon" }, { type: "cafe", name: "夜パフェ", menu: "pudding", light: "neon" },
          { type: "lobby", name: "占いの館", fortune: true, deskSign: "占いの館  FORTUNE", actLabel: "水晶玉で占ってもらう", light: "neon", inner: "pPurple", floor: "carpetPlum" }, { type: "food", name: "夜市", menu: "takoyaki", light: "neon" }][i] });
    });
    for (let z = 352; z < 470; z += 14) w.lanternString(552, z, 557, z + 7, 6.4, 4, z);
    w.river([[716, 478], [690, 463], [664, 451]], 5, { kind: "night" });
    w.taikoBridge(690, 463, -0.48, 11, 3.6, 1.3);
    [[520, 470], [770, 262], [700, 452]].forEach(([x, z]) => w.lanternBldg(x, z, 3.6, 7.5, { key: "lanR" }));
    [[500, 360, "moon", "neonPurple"], [525, 395, "star", "neonYellow"], [505, 440, "heart", "neonPink"]].forEach(([x, z, k, key]) => w.neonIcon(k, x + 11.3, 11, z - 6, 1.6, Math.PI / 2, key));
    w.floatRing(625, 30, 420, 16, "neonPurple");
    w.fireworks(640, 360);
    w.areaGate(474, 322, -Math.PI / 2, "night", "big");
    w.areaGate(640, 244, Math.PI, "night");
    w.plazaCrowd(600, 360, 60, 1.2);
  };
  P.fireworks = function (cx, cz) {
    const w = this, N = 900, geo = new T.BufferGeometry(), pos = new Float32Array(N * 3), col = new Float32Array(N * 3), P2 = [];
    for (let i = 0; i < N; i++) P2.push({ x: 0, y: -99, z: 0, vx: 0, vy: 0, vz: 0, life: 0 });
    geo.setAttribute("position", new T.BufferAttribute(pos, 3)); geo.setAttribute("color", new T.BufferAttribute(col, 3));
    const dot = X.cv(64, 64), dg = dot.getContext("2d"), gr = dg.createRadialGradient(32, 32, 0, 32, 32, 30); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)"); dg.fillStyle = gr; dg.fillRect(0, 0, 64, 64);
    const pts = new T.Points(geo, new T.PointsMaterial({ size: 2.2, map: X.tex(dot), vertexColors: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false, toneMapped: false }));
    pts.frustumCulled = false; w.scene.add(pts);
    let next = 1, k = 0;
    const cols = [[1, 0.4, 0.7], [0.4, 0.9, 1], [1, 0.9, 0.3], [0.6, 1, 0.5], [0.8, 0.5, 1]];
    w.anim.push((dt) => {
      const night = w.nightShow || 0; pts.visible = night > 0.3;
      if (!pts.visible) return;
      next -= dt;
      if (next <= 0) { next = 0.7 + Math.random() * 1.4; const bx = cx + (Math.random() - 0.5) * 120, by = 80 + Math.random() * 50, bz = cz + (Math.random() - 0.5) * 90, c = cols[Math.floor(Math.random() * cols.length)];
        for (let i = 0; i < 130; i++) { const p = P2[k % N]; k++; const a = Math.random() * TAU, b = Math.acos(Math.random() * 2 - 1), v = 18 + Math.random() * 7; p.x = bx; p.y = by; p.z = bz; p.vx = Math.sin(b) * Math.cos(a) * v; p.vy = Math.cos(b) * v; p.vz = Math.sin(b) * Math.sin(a) * v; p.life = 1.8 + Math.random() * 0.7; p.c = c; } }
      for (let i = 0; i < N; i++) {
        const p = P2[i]; if (p.life <= 0) { pos[i * 3 + 1] = -999; continue; }
        p.life -= dt; p.vy -= 6 * dt; const d = Math.exp(-1.6 * dt); p.vx *= d; p.vy *= d; p.vz *= d;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z; const f = Math.min(1, p.life) * 2.5;
        col[i * 3] = p.c[0] * f; col[i * 3 + 1] = p.c[1] * f; col[i * 3 + 2] = p.c[2] * f;
      }
      geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
    });
  };
  P.nightWheel = function (x, z) {
    const w = this, R = 38, H = 44;
    [-1, 1].forEach((s) => { [-1, 1].forEach((f) => { const g = new T.CylinderGeometry(0.6, 0.9, Math.hypot(H, 16), 10); const m4 = new T.Matrix4().compose(new T.Vector3(x + f * 8, H / 2, z + s * 4), new T.Quaternion().setFromEuler(new T.Euler(0, 0, -f * Math.atan2(16, H))), new T.Vector3(1, 1, 1)); w.batch.add("white2", w.m.white2, g, m4); }); });
    w.box("stoneW", x, 0, z, 26, 1, 14, { collide: true }); w.caster(x, z, 20, 10, H + R * 0.4);
    const wheel = new T.Group(); wheel.position.set(x, H, z); w.scene.add(wheel);
    const parts = { white2: [], neonPink: [], neonCyan: [], neonYellow: [], neonPurple: [] };
    const put = (key, g, m4) => { g.applyMatrix4(m4); parts[key].push(g); };
    [-2, 2].forEach((dz) => { put("white2", new T.TorusGeometry(R, 0.35, 8, 128), new T.Matrix4().makeTranslation(0, 0, dz)); put("white2", new T.TorusGeometry(R * 0.5, 0.2, 6, 64), new T.Matrix4().makeTranslation(0, 0, dz)); });
    for (let i = 0; i < 32; i++) { const a = i / 32 * TAU; put("white2", new T.CylinderGeometry(0.1, 0.1, R, 4), new T.Matrix4().compose(new T.Vector3(Math.cos(a) * R / 2, Math.sin(a) * R / 2, 0), new T.Quaternion().setFromEuler(new T.Euler(0, 0, a - Math.PI / 2)), new T.Vector3(1, 1, 1))); }
    const leds = ["neonPink", "neonCyan", "neonYellow", "neonPurple"];
    for (let i = 0; i < 96; i++) { const a = i / 96 * TAU; put(leds[i % 4], new T.SphereGeometry(0.25, 6, 4), new T.Matrix4().makeTranslation(Math.cos(a) * R, Math.sin(a) * R, 2.4)); }
    for (let k = 0; k < 6; k++) put(["neonPink", "neonCyan", "neonPurple"][k % 3], new T.TorusGeometry(R * (0.6 + k * 0.07), 0.08, 4, 96), new T.Matrix4().makeTranslation(0, 0, 2.2));
    put("neonPurple", new T.CylinderGeometry(2, 2, 5, 24), new T.Matrix4().makeRotationX(Math.PI / 2));
    for (const k in parts) if (parts[k].length) wheel.add(new T.Mesh(XWorld.mergeGeos(parts[k]), w.m[k]));
    /* ゴンドラ（色ごとに1つのインスタンス） */
    const cols = [0xff5f8f, 0xffc84a, 0x5ab8ff, 0x7ce0a0, 0xc08aff, 0xff8a3d], NG = 20;
    const cabG = XWorld.mergeGeos([new T.CylinderGeometry(1.6, 1.6, 2.4, 16).translate(0, -2, 0), new T.ConeGeometry(1.8, 0.8, 16).translate(0, -0.4, 0)]);
    const cabM = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, emissive: 0xffffff, emissiveIntensity: 0.05 });
    w.nightMats.push({ m: cabM, day: 0.05, night: 0.45 });
    const cabs = new T.InstancedMesh(cabG, cabM, NG), c = new T.Color(); for (let i = 0; i < NG; i++) { c.setHex(cols[i % cols.length]); cabs.setColorAt(i, c); }
    cabs.frustumCulled = false; w.scene.add(cabs);
    const m4 = new T.Matrix4();
    w.anim.push((dt, t) => { const rot = t * 0.04; wheel.rotation.z = rot; for (let i = 0; i < NG; i++) { const a = i / NG * TAU + rot; m4.makeTranslation(x + Math.cos(a) * R, H + Math.sin(a) * R, z); cabs.setMatrixAt(i, m4); } cabs.instanceMatrix.needsUpdate = true; });
    w.sign("STAR WHEEL", { grad: ["#ff4fb0", "#a86aff"], color: "#fff", px: 512 }, 12, 1.8, x, 2.6, z + 7.1, 0);
  };

  /* ══════════════ 22 XEVARION PUZZLE CITY ══════════════ */
  P.buildPuzzle = function () {
    const w = this, cx = 500, cz = 568;
    w.areaZone("puzzle");
    w.places.push(["22 PUZZLE CITY", 366, 548, Math.PI / 2]);
    w.rect("brickPave", 362, 492, 638, 643, 0.012);
    /* 中央の時計塔 */
    w.box("sYellow", cx, 0, cz, 8, 30, 8, { collide: true }); w.box("offWhite", cx, 30, cz, 9.4, 0.8, 9.4); w.box("sPink", cx, 30.8, cz, 7, 6, 7); w.geo("rPurple", new T.ConeGeometry(6.4, 12, 4).rotateY(Math.PI / 4), cx, 42.8, cz); w.geo("gold", new T.ConeGeometry(0.2, 3, 4), cx, 50.4, cz); w.caster(cx, cz, 8, 8, 44);
    [0, Math.PI / 2, Math.PI, -Math.PI / 2].forEach((r) => w.clockFace(cx + Math.sin(r) * 4.05, 25, cz + Math.cos(r) * 4.05, r, 2.8));
    w.disk(cx, cz, 18, "plaza", 0.018); w.pond(cx, cz + 13, 3, "fountain", true);
    /* カラフルな家（ぐるりと・曲がった道ぞい） */
    const r = X.rnd(222), FAC2 = ["sPink", "sYellow", "sMint", "sBlue", "sLav", "sPeach", "sTeal", "sRed", "sCream"], RF = ["rRed", "rBlue", "rPurple", "rTeal", "rOrange", "rPink", "rGold"];
    const placed = [];     /* ★ 家どうしが重ならない（前は2軒がめりこんでいた） */
    for (let i = 0; i < 34; i++) {
      const a = i / 34 * TAU, rr = 36 + (i % 3) * 16 + r() * 6, x = cx + Math.cos(a) * rr * 1.5, z = cz + Math.sin(a) * rr * 0.92;
      if (x < 368 || x > 632 || z < 498 || z > 638) continue; if (Math.hypot(x - 420, z - 600) < 34 || Math.hypot(x - 592, z - 530) < 30) continue;
      const hw = 9 + r() * 5, hd = 8 + r() * 4, hh = 7 + Math.floor(r() * 3) * 3.5, ry2 = -a + Math.PI / 2 + Math.PI;
      const hr = Math.hypot(hw, hd) * 0.45; if (placed.some(([px, pz, pr]) => Math.hypot(px - x, pz - z) < pr + hr + 0.5)) { r(); r(); if (i % 5 === 0) r(); continue; } placed.push([x, z, hr]);
      const ins = i % 6 === 0 ? { type: "escape", name: "なぞときの家", h: 3.8, glass: false } : i % 6 === 3 ? { type: "cafe", name: "パズル喫茶", h: 3.8, menu: "cake" } : i % 6 === 4 ? { type: "shop", name: "パズルのお店", h: 3.8, items: [["ジグソーパズル（1000）", 2800, "パークの空撮"], ["知恵の輪", 800, "はずせるかな"], ["立体パズル", 1800, "お城の形"], ["なぞなぞブック", 900, "100問"]] } : null;
      w.bld(x, z, hw, hd, hh, { key: FAC2[i % FAC2.length], roof: r() < 0.7 ? "gable" : "hip", roofKey: RF[i % RF.length], rh: 3.5 + r() * 2, ry: ry2, inside: ins || undefined });
      if (i % 5 === 0) w.turret(x + 4, z + 3, 1.6, 12 + r() * 6, FAC2[(i + 3) % FAC2.length], RF[(i + 2) % RF.length], true);
      if (i % 3 === 1) { w.eyes(x + Math.sin(ry2) * (hd / 2 + 0.04), z + Math.cos(ry2) * (hd / 2 + 0.04), hh * 0.62, ry2, 0.85, 2.6, ["irisA", "irisB", "irisC", "irisD", "irisE"][i % 5], (i % 4 - 1.5) * 0.4); }
      if (i % 4 === 1) w.sign(["◇◆○●", "△▲□■", "★☆♪♫", "?  !  ?"][i % 4], { bg: "#2a1a4a", color: "#ffe04a", px: 512 }, 2.6, 0.9, x, 3.6, z + 5.3, 0);
    }
    /* 迷路（生け垣） */
    w.hedgeMaze(420, 600, 11, 9, 4.2);
    /* 謎解きのお城と堀 */
    { const x = 592, z = 530; const moat = new T.RingGeometry(20, 26, 64, 1); moat.rotateX(-Math.PI / 2); w.water(moat, x, 0.07, z, "canal"); w.colRing(x, z, 19.8, 26.2, [[Math.PI / 2 - 0.13, Math.PI / 2 + 0.13]]);
      w.castle(x, z, 0.62, "castle", "rPink", "rTeal", 0); w.route([[x, z + 14], [x, z + 32]], 5, "woodDeck", { lamps: false, bushes: false, curb: false });
      /* ★★ 2026-09-30b 堀の橋（前は道が水面の下にかくれて、橋がないように見えた）：水面より上の板・手すり・歩ける高さ */
      w.box("woodDark2", x, 0.1, z + 23, 5.2, 0.28, 11); [-1, 1].forEach((s) => { w.box("woodRed", x + s * 2.5, 0.38, z + 23, 0.16, 0.85, 11); for (let k = -1; k <= 1; k++) w.box("woodRed", x + s * 2.5, 0.1, z + 23 + k * 5.2, 0.28, 1.25, 0.28); });
      (w.heightExtra = w.heightExtra || []).push({ lv: 1, cx: x, cz: z + 23, ang: 0, hw: 2.4, hl: 5.5, y: 0.38 });
      w.sign("PUZZLE CASTLE", { bg: "#e04a8a", color: "#fff", px: 512 }, 8, 1.2, x, 5, z + 8.6, 0); }
    for (let i = 0; i < 10; i++) w.garlandLine(cx - 60 + i * 12, cz - 40, cx - 60 + i * 12, cz + 40);
    w.areaGate(363, 548, -Math.PI / 2, "puzzle", "big");
    w.areaGate(540, 493, Math.PI, "puzzle");
    w.plazaCrowd(cx, cz, 50, 1.3);
  };
  P.garlandLine = function (x0, z0, x1, z1) { const w = this; w.detail(() => { const n = 12; for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t, y = 6 - Math.sin(t * Math.PI) * 0.8; const g = new T.ConeGeometry(0.3, 0.6, 3); g.rotateX(Math.PI); w.geo(["pPink", "pYellow", "pBlue", "pGreen", "pPurple", "pOrange"][i % 6], g, x, y, z); } }); };
  P.hedgeMaze = function (x, z, nx, nz, cell) {
    const w = this, r = X.rnd(314), vis = Array.from({ length: nx }, () => new Array(nz).fill(false)), wallsH = [], wallsV = [];
    for (let i = 0; i <= nx; i++) { wallsV.push(new Array(nz).fill(true)); } for (let j = 0; j <= nz; j++) wallsH.push(new Array(nx).fill(true));
    const st = [[0, 0]]; vis[0][0] = true;
    while (st.length) { const [i, j] = st[st.length - 1], nb = [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]].filter(([a, b]) => a >= 0 && b >= 0 && a < nx && b < nz && !vis[a][b]); if (!nb.length) { st.pop(); continue; } const [a, b] = nb[Math.floor(r() * nb.length)]; if (a !== i) wallsV[Math.max(a, i)][j] = false; else wallsH[Math.max(b, j)][i] = false; vis[a][b] = true; st.push([a, b]); }
    wallsV[0][0] = false; wallsV[nx][nz - 1] = false;
    const x0 = x - nx * cell / 2, z0 = z - nz * cell / 2;
    for (let i = 0; i <= nx; i++) for (let j = 0; j < nz; j++) if (wallsV[i][j]) w.hedge(x0 + i * cell, z0 + (j + 0.5) * cell, 0.9, cell + 0.9, 1.9);
    for (let j = 0; j <= nz; j++) for (let i = 0; i < nx; i++) if (wallsH[j][i]) w.hedge(x0 + (i + 0.5) * cell, z0 + j * cell, cell + 0.9, 0.9, 1.9);
    w.sign("HEDGE MAZE", { bg: "#2a6a2a", color: "#fff", px: 512 }, 6, 1.2, x0 - 2, 2.6, z0 + cell / 2, -Math.PI / 2);
    w.geo("gold", new T.OctahedronGeometry(0.8, 0), x, 1.6, z);
  };

  /* ══════════════ 23 XEVARION MEDIA CITY ══════════════ */
  P.buildMedia = function () {
    const w = this, cx = 242, cz = 488;
    w.areaZone("media");
    w.places.push(["23 MEDIA CITY", 222, 402, 0]);
    w.rect("plaza", 205, 395, 262, 470, 0.012); w.rect("plaza", 140, 530, 345, 545, 0.012); w.rect("plaza", 150, 450, 205, 470, 0.012);
    /* 大きなシアター（曲面の正面・巨大な画面） */
    { const x = 305, z = 440; w.bld(x, z, 64, 42, 26, { key: "gDark", roof: "flat", roofKey: "rMetal", crown: "neonCyan", ry: -Math.PI / 2, inside: { type: "theater", name: "XEVARION IMAX シアター", h: 16, door: 6, video: "imax", screenTitle: "XEVARION IMAX" } });
      /* ★ 2026-09-29 曲面の正面に入口（前は閉じた壁の前に金の板があるだけ）。CylinderGeometry は x = r·sinθ → 西（−x）は θ = 3π/2 */
      const g0 = 0.16, dH = 6.5, cxL = x - 21;
      w.geo("gSilver", new T.CylinderGeometry(24, 24, 26, 16, 1, true, Math.PI, Math.PI / 2 - g0), cxL, 13, z); w.geo("gSilver", new T.CylinderGeometry(24, 24, 26, 16, 1, true, Math.PI * 1.5 + g0, Math.PI / 2 - g0), cxL, 13, z);
      w.geo("gSilver", new T.CylinderGeometry(24, 24, 26 - dH, 4, 1, true, Math.PI * 1.5 - g0, g0 * 2), cxL, dH + (26 - dH) / 2, z);
      w.colRing(cxL, z, 23.6, 24.5, [[-Math.PI / 2, Math.PI / 2], [Math.PI - g0, Math.PI + g0]]);
      { const cap = new T.CircleGeometry(24, 32, Math.PI / 2, Math.PI); cap.rotateX(-Math.PI / 2); w.geo("rMetal", cap, cxL, 26.02, z);
        const ce = new T.CircleGeometry(23.5, 32, Math.PI / 2, Math.PI); ce.rotateX(Math.PI / 2); w.geo("white2", ce, cxL, 9, z, 0, true);
        w.geo("pNavy", w.innerCylGeo(23.55, 9, 24, Math.PI, Math.PI / 2 - g0).translate(0, 4.5, 0), cxL, 0, z, 0, true); w.geo("pNavy", w.innerCylGeo(23.55, 9, 24, Math.PI * 1.5 + g0, Math.PI / 2 - g0).translate(0, 4.5, 0), cxL, 0, z, 0, true);
        w.geo("pNavy", w.innerCylGeo(23.55, 9 - dH, 4, Math.PI * 1.5 - g0, g0 * 2).translate(0, dH + (9 - dH) / 2, 0), cxL, 0, z, 0, true);
        for (let i = 0; i < 5; i++) for (let j = -2; j <= 2; j++) { const px = cxL - 3 - i * 3.8, pz = z + j * 5.5; if (Math.hypot(px - cxL, pz - z) < 22) w.box("lightPanel", px, 8.84, pz, 1.4, 0.06, 1.4); }
        const ex = cxL - 24 * Math.cos(g0), ez = 24 * Math.sin(g0) + 0.2;
        [-1, 1].forEach((k) => { w.box("goldOrn", ex, 0, z + k * ez, 0.7, dH, 0.5); w.colCircle(ex, z + k * ez, 0.4); });
        w.box("goldOrn", ex, dH, z, 0.8, 0.5, ez * 2 + 0.5);
        w.box("neonCyan", ex - 0.42, dH - 0.35, z, 0.06, 0.1, ez * 2 - 0.4); }
      w.floor("marble", x - 44, z - 16, x - 21.5, z + 16, 0.03); w.zone("IMAX ロビー", x - 44, z - 16, x - 21.5, z + 16, "shop");
      (w.interiors = w.interiors || []).push({ x: cxL, z, r: 23.2, hi: 9, name: "IMAX ロビー", round: true }); w.casterCircle(cxL, z, 24, 26);
      w.detail(() => {
        /* 売店（ポップコーン）・チケットカウンター・ポスター */
        w.box("woodDark", cxL - 4, 0, z - 11, 7, 1.05, 1.2, { collide: true }); w.box("pBlack", cxL - 4, 1.05, z - 11, 7.2, 0.08, 1.4); w.box("neonYellow", cxL - 4, 1.0, z - 10.38, 7, 0.08, 0.04);
        for (let k = 0; k < 3; k++) { w.box("glassClear", cxL - 6.2 + k * 2.2, 1.13, z - 11.3, 1.2, 1.1, 0.8); w.box("propYellow", cxL - 6.2 + k * 2.2, 1.18, z - 11.3, 1.0, 0.45, 0.6); }
        w.sign("POPCORN & DRINK  売店", { bg: "#2a0a4a", color: "#fff", glow: "#ffe04a", px: 1024 }, 6, 0.9, cxL - 4, 3.2, z - 12.2, 0);
        w.box("woodDark", cxL - 4, 0, z + 11, 7, 1.05, 1.2, { collide: true }); w.box("pBlack", cxL - 4, 1.05, z + 11, 7.2, 0.08, 1.4);
        w.sign("TICKETS  チケット", { bg: "#0a1a3a", color: "#fff", glow: "#4ff0ff", px: 1024 }, 6, 0.9, cxL - 4, 3.2, z + 12.2, Math.PI);
        [[-0.95, "NOW SHOWING", ["#e84a8a", "#3a2a8a"]], [-0.55, "IMAX 3D", ["#2a8ad8", "#0a2a5a"]], [0.55, "COMING SOON", ["#ff8a3a", "#8a2a4a"]], [0.95, "LIVE VIEWING", ["#4fc07a", "#0a3a3a"]]].forEach(([da, t, gr]) => { const a = Math.PI + da, px = cxL + Math.cos(a) * 23.25, pz = z + Math.sin(a) * 23.25; w.sign(t, { grad: gr, color: "#fff", px: 512 }, 2.6, 3.8, px, 3.4, pz, Math.atan2(cxL - px, z - pz)); });
      });
      w.interact(cxL - 4, z - 9.4, 2.6, "売店で買う（IMAX ロビー）", () => ({ shop: { kind: "food", name: "IMAX 売店", items: w.PARK_DATA.MENU.cinema } }), "🍿");
      w.interact(cxL - 4, z + 9.4, 2.6, "チケットを受け取る（IMAX）", () => ({ lobby: { name: "IMAX チケット", text: "本日の上映：XEVARION IMAX スペシャル。場内の中央の通路で E を押すと、スクリーンに好きな動画（YouTube）を映せます。" } }), "🎟️");
      w.theaterScreen = w.bigScreen(x - 45.2, 15, z, -Math.PI / 2, 30, 13, "XEVARION IMAX", ["NOW SHOWING", "PREMIERE TONIGHT", "4K・3D・SURROUND", "MEDIA CITY"], ["#0a1a3a", "#3a0a5a"]);
      w.sign("XEVARION IMAX THEATER", { bg: "#0a1024", color: "#fff", glow: "#4ff0ff", px: 1024 }, 28, 2.6, x - 45.3, 24, z, -Math.PI / 2);
      w.interact(x - 62, z, 6, "シアターの画面で動画を見る（YouTube）", () => ({ video: "theater" }), "🎬");
      w.videoSpots = (w.videoSpots || {}); w.videoSpots.theater = { scr: w.theaterScreen, cam: [x - 72, 6, z], look: [x - 45.2, 15, z] }; }
    w.bld(180, 432, 44, 30, 18, { key: "gPurple", shop: "shopC", roof: "flat", crown: "neonPink", sign: { text: "CINEMA 12", bg: "#2a0a4a", w: 16, h: 2.2, y: 14.5, glow: "#ff4fb0" }, inside: { type: "theater", name: "シネマ12", h: 9, door: 4, video: "cinema12" } });
    for (let i = 0; i < 5; i++) w.sign(["NEW RELEASE", "COMING SOON", "ANIME FEST", "LIVE VIEWING", "CLASSIC"][i], { grad: [["#e84a8a", "#3a2a8a"], ["#2a8ad8", "#0a2a5a"], ["#ff8a3a", "#8a2a4a"], ["#4fc07a", "#0a3a3a"], ["#e8c04a", "#5a3a0a"]][i], color: "#fff", px: 512 }, 3, 4.2, 162 + i * 9, 7.5, 447.1, 0);
    /* 撮影スタジオ（大きな扉と番号） */
    for (let i = 0; i < 4; i++) { const x = 162 + i * 46, z = 562; w.bld(x, z, 40, 34, 16, { key: "brick", roof: "gable", roofKey: "rMetal", rh: 4, ry: Math.PI, inside: { type: "studio", name: "撮影スタジオ " + (i + 1), h: 10, door: 8, doorH: 6.5, glass: false, green: i === 1 } }); w.sign("STAGE " + (i + 1), { bg: "#1a1a1a", color: "#ffe04a", px: 512 }, 8, 2.2, x, 13, z - 17.3, Math.PI); }
    w.bld(330, 520, 30, 24, 12, { key: "techG", roof: "flat", ry: -Math.PI / 2, sign: { text: "DUBBING STUDIO", bg: "#1a2a4a", w: 12, h: 1.6, y: 9 }, inside: { type: "karaoke", name: "アフレコ・録音スタジオ", h: 5 } });
    { const x = 160, z = 500; w.bld(x, z, 30, 26, 12, { key: "techW", roof: "flat", ry: Math.PI / 2, sign: { text: "MOTION CAPTURE LAB", bg: "#0a2a3a", w: 14, h: 1.6, y: 9 }, inside: { type: "studio", name: "モーションキャプチャー", h: 6, green: true } }); const sg = new T.LineSegments(new T.EdgesGeometry(new T.IcosahedronGeometry(7, 1)), new T.LineBasicMaterial({ color: 0x4ff0ff, toneMapped: false })); sg.position.set(x, 18, z); w.scene.add(sg); w.anim.push((dt, t) => { sg.rotation.y = t * 0.2; }); }
    /* 広場（ヤシ・レッドカーペット・映画のカメラの像） */
    w.disk(cx, cz, 30, "plazaGray", 0.016);
    w.rect("fabricR", cx - 3, cz - 26, cx + 3, cz + 26, 0.022);
    { const x = cx, z = cz; w.box("stoneGray", x, 0, z, 6, 1.5, 6, { collide: true }); w.box("pBlack", x, 1.5, z, 4, 3, 7); w.geo("pBlack", new T.CylinderGeometry(1.4, 1.8, 3, 16).rotateX(Math.PI / 2), x, 3, z + 5); w.geo("pBlack", new T.CylinderGeometry(2, 2, 0.8, 16).rotateZ(Math.PI / 2), x, 5.8, z - 1); w.geo("pBlack", new T.CylinderGeometry(2, 2, 0.8, 16).rotateZ(Math.PI / 2), x, 5.8, z + 2.5); }
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; w.palm(cx + Math.cos(a) * 26, cz + Math.sin(a) * 26, 1.1); }
    w.areaGate(222, 392, 0, "media", "big");
    w.plazaCrowd(cx, cz, 34, 1.6);
  };

  /* ══════════════ 14 XEVARION BOCCIA ARENA（屋内・大きな屋根） ══════════════ */
  P.buildBoccia = function () {
    const w = this, x0 = 150, x1 = 262, z0 = 648, z1 = 732, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    w.areaZone("boccia");
    w.places.push(["14 BOCCIA ARENA", 142, 690, Math.PI / 2]);
    w.rect("plaza", 128, 640, 272, 742, 0.012);
    w.rect("courtTeal", x0 + 1, z0 + 1, x1 - 1, z1 - 1, 0.02);
    /* 壁（下はコンクリート・上はガラス）・入口（西と北） */
    const wallX = (x, za, zb, gaps) => w.wall("glassClear", x, za, x, zb, 11, 0.2, gaps, { doorH: 4.5 });
    const wallZ = (z, xa, xb, gaps) => w.wall("glassClear", xa, z, xb, z, 11, 0.2, gaps, { doorH: 4.5 });
    wallX(x0, z0, z1, [[cz - 6, cz + 6]]); wallX(x1, z0, z1, []); wallZ(z0, x0, x1, [[cx - 6, cx + 6]]); wallZ(z1, x0, x1, [[cx - 6, cx + 6]]);
    [[x0, cz, 0.6, z1 - z0], [x1, cz, 0.6, z1 - z0]].forEach(([x, z, a, b]) => w.box("stoneW", x, 0, z, a, 0.5, b));
    /* 大屋根：アーチの骨組み＋半透明の屋根 */
    for (let i = 0; i <= 8; i++) { const x = x0 + i * (x1 - x0) / 8; const arch = new T.TorusGeometry((z1 - z0) / 2, 0.5, 6, 32, Math.PI); arch.scale(1, 0.3, 1); arch.rotateY(Math.PI / 2); w.geo("white2", arch, x, 11.2, cz); w.box("white2", x, 0, z0, 0.8, 11.2, 0.8, { collide: true }); w.box("white2", x, 0, z1, 0.8, 11.2, 0.8, { collide: true }); }
    { const g = new T.CylinderGeometry((z1 - z0) / 2, (z1 - z0) / 2, x1 - x0, 32, 1, true, 0, Math.PI); g.rotateZ(Math.PI / 2); g.scale(1, 0.3, 1); const rm = new T.MeshStandardMaterial({ color: 0xe8f4ff, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.45, side: T.DoubleSide, depthWrite: false }); rm.envMapIntensity = 1.2; const roof = new T.Mesh(g, rm); roof.position.set(cx, 11.2, cz); w.scene.add(roof); w.bocciaRoof = roof; }
    w.caster(cx, cz, x1 - x0, z1 - z0, 14);
    w.sign("XEVARION BOCCIA ARENA", { grad: ["#2a7ad8", "#5ab8ff"], color: "#fff", px: 1024 }, 30, 2.8, cx, 14, z0 - 0.4, Math.PI);
    w.sign("XEVARION BOCCIA ARENA", { grad: ["#2a7ad8", "#5ab8ff"], color: "#fff", px: 1024 }, 30, 2.8, x0 - 0.4, 14, cz, -Math.PI / 2);
    /* コート（4面・1面で遊べる） */
    const court = (bx, bz, play) => {
      const line = (a, b, c, d) => { const L = Math.hypot(c - a, d - b), g = new T.PlaneGeometry(0.1, L); g.rotateX(-Math.PI / 2); g.rotateY(Math.atan2(c - a, d - b)); w.batch.add("lineW", w.m.lineW, g, new T.Matrix4().makeTranslation((a + c) / 2, 0.035, (b + d) / 2)); };
      const cg = new T.PlaneGeometry(13.5, 7); cg.rotateX(-Math.PI / 2); w.batch.add("courtBlue", w.m.courtBlue, cg, new T.Matrix4().makeTranslation(bx, 0.028, bz));
      line(bx - 6.25, bz - 3, bx + 6.25, bz - 3); line(bx - 6.25, bz + 3, bx + 6.25, bz + 3); line(bx - 6.25, bz - 3, bx - 6.25, bz + 3); line(bx + 6.25, bz - 3, bx + 6.25, bz + 3);
      line(bx - 3.75, bz - 3, bx - 3.75, bz + 3); for (let k = -2; k <= 2; k++) line(bx - 6.25, bz + k * 1.2, bx - 3.75, bz + k * 1.2);
      const cxv = bx + 0.5; line(cxv - 0.25, bz, cxv + 0.25, bz); line(cxv, bz - 0.25, cxv, bz + 0.25);
      w.box("boardBlue", bx, 0, bz - 3.5, 13.6, 0.3, 0.12); w.box("boardBlue", bx, 0, bz + 3.5, 13.6, 0.3, 0.12); w.box("boardBlue", bx + 6.8, 0, bz, 0.12, 0.3, 7);
      if (play) { w.boccia = { cx: bx, cz: bz, L: 12.5, Wd: 6 }; w.npcSpots.boccia = [[bx - 8, bz + 4.5, Math.PI / 2]]; w.interact(bx - 8, bz, 3.5, "ボッチャで勝負する", () => ({ game: "boccia" }), "🔴"); }
    };
    court(cx - 22, cz, true); court(cx + 22, cz, false); court(cx - 22, cz - 22, false); court(cx + 22, cz + 22, false);
    /* 観客席（北と南）・大画面・初心者コーナー・キッズ・休憩 */
    for (let r = 0; r < 6; r++) { w.box(r % 2 ? "seatsBlue2" : "seatsWhite", cx, r * 0.6, z0 + 3 + r * 1.1, x1 - x0 - 16, 0.6, 1.1, { collide: r === 0 }); w.box(r % 2 ? "seatsBlue2" : "seatsWhite", cx, r * 0.6, z1 - 3 - r * 1.1, x1 - x0 - 16, 0.6, 1.1, { collide: r === 0 }); }
    w.bigScreen(x1 - 0.8, 7, cz, -Math.PI / 2, 16, 8, "BOCCIA", ["RED vs BLUE", "JACK BALL", "NICE SHOT!", "誰でも参加できます"], ["#1a2a6a", "#6a1a2a"]);
    w.sign("BEGINNER CORNER", { bg: "#2a8a5a", color: "#fff", px: 512 }, 6, 1, cx + 22, 2.4, cz - 22 - 4.2, 0);
    w.detail(() => { for (let i = 0; i < 12; i++) w.box(["pRed", "pYellow", "pBlue", "pGreen"][i % 4], x0 + 8 + (i % 4) * 2.2, 0, z1 - 16 + Math.floor(i / 4) * 2.2, 1.8, 0.6 + (i % 3) * 0.3, 1.8); });
    w.sign("KIDS AREA", { bg: "#ff8a3a", color: "#fff", px: 512 }, 5, 0.9, x0 + 11, 2.2, z1 - 18, 0);
    for (let i = 0; i < 4; i++) w.bench(x1 - 10, z0 + 20 + i * 5, -Math.PI / 2);
    w.detail(() => { for (let i = 0; i < 3; i++) { w.box("pRed", x1 - 3, 0, z1 - 10 - i * 2.2, 1.2, 2, 1.8); w.box("neonWhite", x1 - 3.62, 0.8, z1 - 10 - i * 2.2, 0.02, 1, 1.4); } });
    w.areaGate(128, 690, -Math.PI / 2, "boccia", "big");
    w.plazaCrowd(cx, cz, 30, 1.2);
    w.zone("BOCCIA ARENA（屋内）", x0, z0, x1, z1, "arena");
  };

  /* ══════════════ 13 XEVARION SPORTS CITY ══════════════ */
  /* スポーツ（国立競技場ふう・体育館）は park_sports.js（★★ 2026-09-29d） */

  /* ══════════════ モノレール（島をひとまわり・駅4つ・乗れる） ══════════════ */
  /* モノレールは park_transit.js（★★ 2026-09-29c 駅・車両・乗り方を作りなおし） */

  /* ══════════════ エリアをつなぐ道 ══════════════ */
  P.buildPaths = function () {
    const w = this, R = (pts, wd, o) => w.route(pts, wd || 12, (o && o.key) || "paverWarm", Object.assign({ lamps: "modern", lampEvery: 28, trees: 22, benches: 60 }, o || {}));
    /* 噴水から各エリアへ（放射状） */
    R([[-126, 290], [-170, 276], [-204, 263]], 16, { treeKind: "poplar", lamps: "classic", trees: 16 });
    R([[126, 290], [150, 272], [166, 265]], 16, { treeKind: "poplar", lamps: "classic", trees: 16 });
    R([[89, 201], [130, 170], [200, 135], [240, 120]]);
    R([[-89, 201], [-130, 170], [-200, 120], [-250, 96]]);
    R([[89, 379], [130, 385], [200, 390], [222, 392]]);
    R([[-89, 379], [-112, 420], [-140, 478], [-150, 505]]);
    /* 会議場のまわり（前の広場の左右・裏の環状の道） */
    R([[-14, 60], [-110, 60], [-170, 80], [-245, 94]], 12, { trees: 18 });
    R([[14, 60], [110, 60], [150, 86], [226, 88], [240, 108]], 12, { trees: 18 });          /* ★★ 2026-09-30b 図書館と世界の村の間を通って門へ（前は家の上を通っていた） */
    R([[-112, 30], [-118, -50], [-80, -92], [0, -98], [80, -92], [118, -50], [112, 30]], 12, { trees: 20 });
    /* 西 */
    R([[-545, 97], [-400, 97], [-250, 97], [-130, 97]], 12, { trees: 18, treeKind: "poplar" });
    R([[-532, 225], [-548, 212], [-560, 200]], 12);
    R([[-300, 440], [-290, 450], [-280, 458]], 10);
    R([[-112, 630], [-160, 645], [-300, 645], [-386, 640]], 12, { trees: 20 });
    R([[-386, 640], [-430, 632], [-480, 615]], 8, { lamps: false, trees: 0, benches: 0 });
    R([[-365, 582], [-378, 610], [-386, 640]], 8);
    R([[-440, 700], [-470, 745], [-500, 790]], 8);
    R([[-440, -40], [-470, -100], [-470, -138]], 10);
    R([[-250, 96], [-250, -120]], 12, { key: "brickPave", lamps: false, trees: 0, benches: 0, bushes: false });
    R([[-10, -100], [-60, -125], [-110, -202], [-230, -208], [-300, -186], [-380, -155], [-470, -140]], 10);
    /* 東 */
    R([[405, 265], [440, 290], [472, 322]], 12);
    R([[410, -125], [402, -170], [395, -212]], 12);
    R([[34, -140], [120, -205], [220, -216], [300, -206], [395, -216]], 12);
    R([[425, 20], [490, 30], [546, 40]], 12, { trees: 18, treeKind: "palm" });
    R([[640, 236], [640, 242]], 12, { lamps: false, trees: 0, benches: 0 });
    R([[560, 478], [545, 490]], 10, { lamps: false, trees: 0, benches: 0 });
    R([[330, 548], [362, 548]], 10, { lamps: false, trees: 0, benches: 0 });
    R([[222, 587], [210, 610], [206, 646]], 10, { lamps: false, trees: 0, benches: 0 });
    R([[112, 630], [124, 660], [128, 690], [147, 690]], 10);
    R([[283, 700], [300, 735], [304, 760]], 10);
    /* 森の中の散歩道（外周の緑の回廊） */
    R([[-620, 380], [-560, 440], [-520, 470]], 7, { lamps: "globe", trees: 0, benches: 50 });
    R([[-640, -60], [-620, 0], [-600, 30]], 7, { lamps: "globe", trees: 0, benches: 50 });
  };

  /* ══════════════ 組み立て（world.js の build から） ══════════════ */
  P.buildPark = function () {
    const w = this;
    w.forestOpen = w.forestOpen || [];
    /* ★★ 2026-09-29d 街灯・ベンチは最後に置く（全部の道と建物がそろってから、重なる所をよける）
       ★★ 2026-09-30c 予約の一覧は w._PQ / w._GQ（エリアを動かすとき一緒にずらす＝park_layout.js） */
    const PQ = w._PQ = []; w.lamp = (x, z, kind) => PQ.push([0, x, z, kind]); w.yomaLamp = (x, z, ry) => PQ.push([2, x, z, ry]); w.bench = (x, z, ry) => PQ.push([1, x, z, ry]);
    const GQ = w._GQ = []; w.areaGate = (x, z, ry, area, style) => GQ.push([x, z, ry, area, style]);          /* ★★ 2026-09-29d 門も道がそろってから */
    w.building = true;              /* ★★ 2026-09-30 park_rooms.js：建物に入口を付ける（建物がそろってから置く） */
    w._deferCurbs = true;           /* ★★ 2026-09-30b 縁石は道がそろってから（交わる所で切る） */
    /* ★★ 2026-09-30c エリアごとに取りこむ（park_layout.js）→ 新しい配置（park_plan.js の XPark.PLAN）へ平行移動 */
    const C = (ids, f) => w.cap(ids, f);
    C("hall", () => w.buildHallExterior());
    C("fountain", () => w.buildCentral());
    C("gate", () => w.buildGate());
    C(["green", "marketW", "marketE"], () => w.buildGreenWalk());
    C(["metro", "tower"], () => w.buildMetropolis());
    C("space", () => w.buildSpacePort());
    C("lab", () => w.buildLab());
    C("aqua", () => { w.buildAqua(); if (w.buildLazyRiver) w.buildLazyRiver(); });
    C("beach", () => { w.buildBeach(); if (w.buildCruise) w.buildCruise(); });
    C("adv", () => w.buildAdventure());
    C("ent", () => w.buildEntertainment());
    C("learn", () => w.buildLearning());
    C("game", () => w.buildGameWorld());
    C("soccer", () => w.buildStadium(450, -298));
    C(["motor", "dome"], () => w.buildMotor());
    C("harbor", () => w.buildHarbor());                /* ★★ 2026-09-29b park_harbor.js：湖の港町と夜の水上パレード */
    C("resort", () => w.buildResort());
    C("night", () => w.buildNightZone());
    C("kabuki", () => w.buildKabuki());                /* ★★ 2026-09-29b park_night2.js：妖魔歌舞伎町 */
    C("yukaku", () => w.buildYukaku());                /* ★★ 2026-09-29b park_night2.js：夜桜遊郭 */
    C("puzzle", () => w.buildPuzzle());
    C("media", () => w.buildMedia());
    C("boccia", () => w.buildBoccia());
    C("sports", () => w.buildSports());
    if (!((XPark.PLAN || {}).skip || {}).ngx) C("ngx", () => w.buildNGX());          /* ★★ 2026-09-29d park_new.js：NGX 本社（★★ 2026-09-30c 作り直した park_corp.js の buildNGXHQ を使う） */
    C("apps", () => w.buildAppStreet());               /* ★★ 2026-09-29d park_new.js：アプリの建物の通り */
    C("yokai", () => w.buildYokaiStreet());            /* ★★ 2026-09-29d park_new.js：妖怪商店街 */
    C("heights", () => w.buildFutureHeights());        /* ★★ 2026-09-29d park_new.js：高層ビル街 */
    C("shrine", () => w.buildShrine());                /* ★★ 2026-09-29d park_new.js：妖怪神社の森 */
    C("ballpark", () => w.buildBallpark());            /* ★★ 2026-09-29d park_sports.js：野球場 */
    C("ngxcity", () => w.buildNGXCity());              /* ★★ 2026-09-30 park_more.js：NGX CITY（大モール・超高層） */
    C("wonder", () => w.buildWonderland());            /* ★★ 2026-09-30 park_more.js：妖怪ワンダーランド（回る乗り物） */
    C("onsen", () => w.buildOnsen());                  /* ★★ 2026-09-30 park_more.js：妖魔温泉街 */
    C("sky", () => w.buildSkyGarden());                /* ★★ 2026-09-30 park_more.js：スカイガーデン */
    C("yukaku", () => w.buildCastleHotel());           /* ★★ 2026-09-30 park_scope.js：夜桜キャッスルホテル（遊郭のとなり＝いっしょに動く） */
    /* ★★ 2026-09-30c 新しいエリア（新しい配置の場所に直接つくる：park_corp.js / park_fun.js） */
    if (w.buildNGXHQ) C("ngx", () => w.buildNGXHQ());
    if (w.buildMFCampus) C("mf", () => w.buildMFCampus());
    if (w.buildIshida) C("ishida", () => w.buildIshida());
    if (w.buildFunland) C("fun", () => w.buildFunland());
    /* ★★ 2026-10-01 モノレールの外の新しい土地（park_outer.js）：MAGIBURST LAND・MAGI BOCCIA RUSH LAND・XEVA GACHA PALACE */
    if (w.buildMagiBurstLand) C("mburst", () => w.buildMagiBurstLand());
    if (w.buildBocciaRushLand) C("mbr", () => w.buildBocciaRushLand());
    if (w.buildGachaPalace) C("gacha", () => w.buildGachaPalace());
    const PLAN = XPark.PLAN || {};
    w.relocate(PLAN.move || {});                  /* ★★ 2026-09-30c 新しい配置へ（park_layout.js） */
    w.refitAreas();                               /* エリアの範囲を中身に合わせる（park_net.js） */
    w.buildNetwork(PLAN.roads || []);             /* ★★ 2026-09-30c エリアをつなぐ道（前の buildPaths・自動の道 planRoads は使わない） */
    w.buildTram();                  /* ★★ 2026-09-29c park_transit.js：路面電車（ゲート ⇄ マーケット ⇄ 噴水公園 ⇄ HALL の1周） */
    w.buildMonorail();              /* ★★ 2026-09-29c park_transit.js：道を引いたあと（駅は道・建物をさけて置く） */
    if (w.buildMetro) w.buildMetro();          /* ★★ 2026-09-30d park_metro.js：地下鉄 ゆめ環状線（地上の出入口は道・建物をさけて置く） */
    if (w.linkOuterStations) w.linkOuterStations();          /* ★★ 2026-10-01 モノレールの駅の外がわの入口 → 新しい土地へ道（park_outer.js） */
    if (!w.buildLazyRiver) w.buildRideExtras();            /* park_rides.js：流れるプール・サンセットクルーズ */
    w.buildParade();                /* park_shows.js：昼のパレード */
    w.buildNightShow();             /* park_shows.js：夜の噴水ショー */
    (w.afterBuild || []).forEach((f) => f());          /* ★ 2026-09-29d ほかのエリアができたあとで置く物（ホールの大屋根の柱など） */
    if (w.infill) w.infill(GQ);                  /* ★★ 2026-09-30d すき間をうめる（道ぞいのお店・木のかたまり）＝ park_infill.js。入口を付ける前に */
    w.placeDoors(); w.building = false;
    delete w.areaGate; w.placeGates(GQ);          /* ★★ 2026-09-30c 門は道の上に（park_net.js） */
    w.linkDoors();                                /* ★★ 2026-09-30c 入口・乗り場の前まで道を（park_net.js） */
    if (w.closeGaps) w.closeGaps();               /* ★★ 2026-10-02 道の行き止まり・つながっていそうでつながっていない所をつなぐ（park_net.js） */
    if (w.buildSignposts) w.buildSignposts();          /* ★★ 2026-10-01 大きな交差点の道しるべ（いちばん近い駅・大きな土地への向きと距離・park_outer.js） */
    w.buildCurbs();
    if (w.buildFences2) w.buildFences2();
    delete w.lamp; delete w.yomaLamp; delete w.bench; w._eyesLate = true; w.placeProps(PQ);
    if (w.buildBorders) w.buildBorders();         /* ★★ 2026-09-30c エリアのさかいの植えこみ（道・入口はふさがない） */
    w.buildBoards();                /* ★★ 2026-09-30 park_life.js：掲示板（イベントの時間・地図） */
    w.buildEyes(); w._eyesLate = false;          /* ★★ 2026-09-30 park_life.js：動く目（見ている人の方を向く・まばたき） */
    w.animFlags();
  };
})();
