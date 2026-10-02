/* ══════════════════════════════════════════════════════════════════
   XEVARION PARK — モノレールの外の新しい土地（★★ 2026-10-01）
   ------------------------------------------------------------------
   ご指定「最終的に超巨大な PARK」「モノレールの外側の開発をして乗り口も対応」
         「MagiBurst のエリアと MagiBocciaRush のエリアを超巨大エリアとして構築」
         「実際の XEVA を用いてできるリアルなガチャ施設を超巨大に配置」
   島を外へ広げた所（park.js の EXP）に、3つの大きな土地：
     41 MAGIBURST LAND（西・南北 940m）… 黄昏の王城・バーストゲート広場・ボスコロシアム・ギルドホール・魔導研究所・天空庭園・召喚ゲート
     42 MAGI BOCCIA RUSH LAND（南東）… 巨大アリーナ（中のコートで CPU と勝負）・ラッシュ広場・ラッシュ通り・練習コート・紅い月の塔
     43 XEVA GACHA PALACE（北東）… 金の宮殿（中のガチャ台で本物のガチャ＝ XEVA を使う）・巨大ガチャマシン・XEVA の残高の大画面
   ・道は XEVARION BOULEVARD をモノレールの下までのばしてつなぐ（西＝MAGIBURST、東＝ガチャパレス）。
   ・モノレールの駅は「外がわの入口」（park_transit.js）から各土地へ道をつなぐ（linkOuterStations）。
   ══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const T = THREE, P = XWorld.World.prototype, TAU = Math.PI * 2, XP = XPark, X = XTex;

  /* ══════════════ 新しいエリア ══════════════ */
  const NEW = [
    { id: "mburst", n: 41, name: "MAGIBURST LAND", x0: -1165, z0: -472, x1: -860, z1: 478, c: "#9a4cff" },
    { id: "mbr", n: 42, name: "MAGI BOCCIA RUSH LAND", x0: 440, z0: 948, x1: 915, z1: 1292, c: "#ff3a5a" },
    { id: "gacha", n: 43, name: "XEVA GACHA PALACE", x0: 838, z0: -800, x1: 1112, z1: -318, c: "#ffb020" }
  ];
  NEW.forEach((a) => { if (XP.A[a.id]) return; a.cx = (a.x0 + a.x1) / 2; a.cz = (a.z0 + a.z1) / 2; XP.AREAS.push(a); XP.A[a.id] = a; });

  /* ══════════════ 道（配置図に足す・park_net.js の buildNetwork が敷く） ══════════════ */
  const MB = { ax: -1010 }, BR = { cx: 690, cz: 1125, rx: 88, rz: 68 }, GC = { cx: 975, pz: -470, hz: -585 };
  const ring = (cx, cz, rx, rz, n) => { const p = []; for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + i / n * TAU; p.push([cx + Math.cos(a) * rx, cz + Math.sin(a) * rz]); } return p; };
  const ROADS = [
    /* MAGIBURST LAND：大通りを西へ（モノレールの下をくぐる）・南北の MAGIBURST AVENUE・東西の通り3本 */
    ["mbBlvd", [[-742, -160], [-994, -160]], 16, "ave"],
    ["mbAve", [[MB.ax, -296], [MB.ax, 416]], 16, "ave"],
    ["mbX1", [[-1138, -40], [-882, -40]], 10, "st"],
    ["mbX2", [[-1138, 150], [-882, 150]], 10, "st"],
    ["mbX3", [[-1138, 300], [-882, 300]], 10, "st"],
    /* XEVA GACHA PALACE：大通りを東へ（モノレールの下）→ カプセル通り → ガチャ広場 */
    ["gcBlvd", [[557, -160], [815, -160], [900, -240], [GC.cx, -330], [GC.cx, -436]], 16, "ave"],
    /* MAGI BOCCIA RUSH LAND：アリーナをぐるりと1周・ラッシュ広場から北の入口・西のラッシュ通り・東の練習コート・南の紅い月の塔 */
    ["mbrRing", ring(BR.cx, BR.cz, BR.rx, BR.rz, 40), 12, "st"],
    ["mbrNorth", [[BR.cx, 1018], [BR.cx, BR.cz - BR.rz]], 14, "ave"],
    ["mbrStreet", [[466, BR.cz], [BR.cx - BR.rx, BR.cz]], 12, "st"],
    ["mbrEast", [[BR.cx + BR.rx, BR.cz], [884, BR.cz]], 10, "st"],
    ["mbrSouth", [[BR.cx, BR.cz + BR.rz], [BR.cx, 1236], [602, 1236]], 10, "st"],
    /* アプリの通り（ゲートの東）→ モノレールの下 → ラッシュ通りの西のはし */
    ["mbrWest", [[306, 900], [338, 948], [400, 1040], [466, BR.cz]], 12, "st"]
  ];
  if (XP.PLAN && XP.PLAN.roads) ROADS.forEach((r) => XP.PLAN.roads.push(r));

  /* ══════════════ 小道具 ══════════════ */
  const has = (w, k, fb) => (w.m[k] ? k : fb);
  const texMat = (w, key, src, o) => { if (!w.m[key]) { const m = new T.MeshBasicMaterial(Object.assign({ map: X.imgTex(src), toneMapped: false, side: T.DoubleSide }, o || {})); w.m[key] = m; w.nightMats.push({ m, base: new T.Color(1, 1, 1), day: 1, night: 1.2 }); } return key; };
  const glowMat = (w, key, hex, day, night) => { if (!w.m[key]) { const m = new T.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: day, roughness: 0.25, metalness: 0.1 }); w.m[key] = m; w.nightMats.push({ m, day, night }); } return key; };
  const stdMat = (w, key, o) => { if (!w.m[key]) w.m[key] = new T.MeshStandardMaterial(o); return key; };
  /* 絵の板（両面） */
  const imgPlane = (w, key, pw, ph, x, y, z, ry) => w.geo(key, new T.PlaneGeometry(pw, ph), x, y, z, ry || 0);
  /* キャラの旗（ポールに縦長の布＝キャラの絵） */
  function charBanner(w, x, z, name, h, ry) {
    h = h || 9; const key = texMat(w, "chT_" + name, "../img/t_" + name + ".webp");
    w.detail(() => { w.geo("darkMetal", new T.CylinderGeometry(0.1, 0.12, h, 6), x, h / 2, z); w.geo("gold", new T.SphereGeometry(0.2, 8, 6), x, h + 0.15, z); w.geo("gold", new T.BoxGeometry(2.3, 0.1, 0.1), x, h - 0.3, z, ry || 0); });
    imgPlane(w, key, 2.2, 2.2, x, h - 1.55, z, ry || 0);
    w.colCircle(x, z, 0.25);
  }
  /* 4面の看板の塔（上に絵） */
  function signTower(w, x, z, s, h, key, baseKey, trim) {
    w.geo(baseKey || "white2", new T.BoxGeometry(s, h, s), x, h / 2, z); w.colObb(x, z, s, s, 0); w.caster(x, z, s, s, h + s);
    w.geo(trim || "gold", new T.BoxGeometry(s + 0.6, 0.6, s + 0.6), x, h, z); w.geo(trim || "gold", new T.BoxGeometry(s + 0.4, 0.5, s + 0.4), x, 0.25, z);
    [0, Math.PI / 2, Math.PI, -Math.PI / 2].forEach((r) => imgPlane(w, key, s * 0.92, s * 0.92, x + Math.sin(r) * (s / 2 + 0.05), h + s * 0.5 + 0.3, z + Math.cos(r) * (s / 2 + 0.05), r));
    w.geo(baseKey || "white2", new T.BoxGeometry(s, s, s).translate(0, 0, 0), x, h + s * 0.5 + 0.3, z);
    w.geo(trim || "gold", new T.BoxGeometry(s + 0.4, 0.4, s + 0.4), x, h + s + 0.5, z);
  }
  /* だ円の壁（当たりは線分・すき間＝入口） */
  function ellipseWall(w, cx, cz, rx, rz, h, th, key, gaps, n) {
    n = n || 64; const inGap = (a) => (gaps || []).some(([c, hw]) => Math.abs(Math.atan2(Math.sin(a - c), Math.cos(a - c))) < hw);
    for (let i = 0; i < n; i++) {
      const a0 = i / n * TAU, a1 = (i + 1) / n * TAU, am = (a0 + a1) / 2; if (inGap(am)) continue;
      const x0 = cx + Math.cos(a0) * rx, z0 = cz + Math.sin(a0) * rz, x1 = cx + Math.cos(a1) * rx, z1 = cz + Math.sin(a1) * rz, L = Math.hypot(x1 - x0, z1 - z0) + 0.15;
      w.geo(key, new T.BoxGeometry(th, h, L), (x0 + x1) / 2, h / 2, (z0 + z1) / 2, Math.atan2(x1 - x0, z1 - z0));
      w.colSeg(x0, z0, x1, z1, th / 2 + 0.1);
    }
  }
  /* 段の客席（だ円・内がわを向く・見るだけ） */
  function tierRing(w, cx, cz, rx, rz, rows, key, gaps) {
    const inGap = (a) => (gaps || []).some(([c, hw]) => Math.abs(Math.atan2(Math.sin(a - c), Math.cos(a - c))) < hw);
    for (let r = 0; r < rows; r++) { const n = 56, ex = rx + r * 1.6, ez = rz + r * 1.6, y = 0.6 + r * 0.8;
      for (let i = 0; i < n; i++) { const a = (i + 0.5) / n * TAU; if (inGap(a)) continue; const x = cx + Math.cos(a) * ex, z = cz + Math.sin(a) * ez, L = TAU * Math.max(ex, ez) / n * 1.05;
        w.geo(r % 2 ? key : has(w, "seatsWhite", key), new T.BoxGeometry(1.5, 0.8, L), x, y, z, Math.atan2(-Math.sin(a) * ex, Math.cos(a) * ez) + Math.PI / 2); } }
  }

  /* ══════════════════════════════════════════════════════════════
     41 MAGIBURST LAND（西）
     ══════════════════════════════════════════════════════════════ */
  P.buildMagiBurstLand = function () {
    const w = this, AX = MB.ax;
    w.areaZone("mburst");
    w.places.push(["41 MAGIBURST LAND（バーストゲート広場）", AX + 20, -160, -Math.PI / 2]);
    w.places.push(["41 MAGIBURST LAND（黄昏の王城）", AX, -300, Math.PI]);
    const lm = w._landmark; w._landmark = true;
    const crys = glowMat(w, "mbCrystal", 0xb36bff, 0.9, 2.2), crysO = glowMat(w, "mbCrystalO", 0xff8a2a, 0.9, 2.2), crysB = glowMat(w, "mbCrystalB", 0x4ab8ff, 0.9, 2.2);
    const stone = has(w, "castleDark", "pPurple"), stone2 = has(w, "castleD2", "pNavy"), roofP = has(w, "rPurple", "pPurple");
    const logo = texMat(w, "mbLogo", "../thumbs/MagiBurst.jpg"), castleArt = texMat(w, "mbCastleArt", "../MagiBurst/img/bn_castle_s.webp"), fb = texMat(w, "mbFullBurst", "../MagiBurst/img/fullburst-logo.webp", { transparent: true, depthWrite: false });
    const walk = (pts, wd, key, o) => w.route(pts, wd, key || "walkY", Object.assign({ raw: true, lamps: "yoma", lampEvery: 18, trees: false, benches: false, bushes: false }, o || {}));
    const plaza = (x, z, r, key) => { w.disk(x, z, r, key || "walkY", 0.026); w.disk(x, z, r + 0.7, "stoneW", 0.024, r); w.plazaCrowd(x, z, r * 0.8, 1.2); };

    /* ── 黄昏の王城（北のはし）：城壁・4つの塔・中庭・本丸（中は「玉座の間」）・大尖塔（約 90m）・頂上の紫の水晶 ── */
    { const cx = AX, cz = -392, hw = 46, hd = 34, H = 15, th = 5;
      plaza(cx, -318, 28);
      /* 城壁（正面は門のすき間） */
      const wall = (x, z, lx, lz) => { w.box(stone, x, 0, z, lx, H, lz, { uv: 6 }); w.colObb(x, z, lx, lz, 0); w.caster(x, z, lx, lz, H); w.box(stone2, x, H, z, lx + 0.6, 1.2, lz + 0.6); for (let k = -Math.floor(Math.max(lx, lz) / 8); k <= Math.floor(Math.max(lx, lz) / 8); k++) { if (lx > lz) w.box(stone, x + k * 4, H + 1.2, z, 2, 1.4, lz + 0.6); else w.box(stone, x, H + 1.2, z + k * 4, lx + 0.6, 1.4, 2); } };
      wall(cx, cz - hd + th / 2, hw * 2, th);
      wall(cx - hw + th / 2, cz, th, hd * 2); wall(cx + hw - th / 2, cz, th, hd * 2);
      const gw = 14; wall(cx - (hw + gw / 2) / 2, cz + hd - th / 2, hw - gw / 2, th); wall(cx + (hw + gw / 2) / 2, cz + hd - th / 2, hw - gw / 2, th);
      /* 門（アーチ・落とし格子・旗） */
      w.box(stone, cx, 10, cz + hd - th / 2, gw + 1, H - 10 + 1.2, th);
      w.geo(stone2, new T.TorusGeometry(gw / 2, 0.9, 8, 24, Math.PI).translate(0, 0, 0), cx, 10, cz + hd + 0.2);
      w.geo("gold", new T.TorusGeometry(gw / 2 + 0.4, 0.25, 6, 24, Math.PI), cx, 10, cz + hd + 0.6);
      w.sign("黄昏の王城  TWILIGHT CASTLE", { bg: "#2a0a3a", color: "#ffd86a", glow: "#c07aff", border: "#ffd86a", px: 1024 }, 13, 1.6, cx, 13.4, cz + hd + 0.7, 0);
      [-1, 1].forEach((k) => { w.flag(cx + k * 10, cz + hd + 3, 0x8a3aff, 12); });
      /* 4つの角の塔 */
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => w.turret(cx + sx * (hw - 2), cz + sz * (hd - 2), 6.5, 26, stone, roofP));
      /* 中庭：石だたみ・水晶の泉 */
      w.rect(has(w, "marble", "plazaGray"), cx - hw + th, cz - hd + th + 22, cx + hw - th, cz + hd - th, 0.02);
      { const fx = cx, fz = cz + 12; w.geo(stone2, new T.CylinderGeometry(7, 7.6, 0.9, 32), fx, 0.45, fz); w.pond(fx, fz, 6.2, "pool", true); w.colCircle(fx, fz, 7.4);
        w.geo(crys, new T.OctahedronGeometry(1.8, 0).scale(1, 1.9, 1), fx, 4.2, fz); w.geo("gold", new T.CylinderGeometry(0.9, 1.3, 2.2, 12), fx, 1.4, fz);
        const sp = new T.Group(); sp.position.set(fx, 4.2, fz); w.scene.add(sp); w.loose(sp, 600); for (let i = 0; i < 6; i++) { const m = new T.Mesh(new T.OctahedronGeometry(0.45, 0), w.m[[crys, crysO, crysB][i % 3]]); const a = i / 6 * TAU; m.position.set(Math.cos(a) * 3.2, Math.sin(i) * 0.6, Math.sin(a) * 3.2); sp.add(m); }
        w.anim.push((dt, t) => { sp.rotation.y = t * 0.5; sp.position.y = 4.2 + Math.sin(t * 1.2) * 0.3; }); }
      /* 本丸（1階は中に入れる「玉座の間」）・上の階・大尖塔 */
      const kz = cz - 14, KW = 54, KD = 24, KH = 30;
      w.bld(cx, kz, KW, KD, KH, { key: stone, roof: "flat", roofKey: stone2, parapet: false, sign: { text: "玉座の間  THRONE HALL", bg: "#2a0a3a", color: "#ffd86a", glow: "#c07aff", w: 12, h: 1.4, y: 10.6 },
        inside: { type: "gallery", name: "黄昏の王城 玉座の間", h: 10, door: 6, list: [["黄昏の王城", "MagiBurst のクエスト「黄昏の王城」の舞台。紫の空に浮かぶ、闇の王が待つ城。"], ["FULL BURST", "仲間の力をためて一気に放つ、MagiBurst の必殺の一撃。"], ["召喚のしくみ", "XEVA と 💎 で仲間を呼ぶ。新しい仲間は「XEVA GACHA PALACE」で（北東の外がわ）。"], ["五つの属性", "火・水・風・光・闇。相性で与えるダメージが変わる。"], ["ボスの間", "城の最上階には、まだ誰も勝ったことのないボスがいる……という伝説。"]] } });
      for (let i = -5; i <= 5; i++) { if (Math.abs(i) < 1) continue; w.box("windowDark", cx + i * 4.4, 15, kz + KD / 2 + 0.06, 1.6, 4.2, 0.08); w.box(has(w, "neonPurple", "neonPink"), cx + i * 4.4, 14.6, kz + KD / 2 + 0.1, 1.7, 0.12, 0.08); }
      w.geo(has(w, "glassDomeP", "glassDome"), new T.CircleGeometry(4.2, 32), cx, 22, kz + KD / 2 + 0.12);
      w.geo("gold", new T.TorusGeometry(4.4, 0.3, 8, 40), cx, 22, kz + KD / 2 + 0.14);
      imgPlane(w, castleArt, 14, 7.9, cx, 25.4, kz + KD / 2 + 0.16, 0);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => w.turret(cx + sx * (KW / 2 - 3), kz + sz * (KD / 2 - 3), 3.6, KH + 16, stone, roofP, true));
      { const ty = KH, tr = 9; w.geo(stone, new T.CylinderGeometry(tr, tr + 1, 30, 24), cx, ty + 15, kz); w.geo(stone2, new T.CylinderGeometry(tr + 1.4, tr + 1.4, 1.4, 24), cx, ty + 30, kz);
        for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; w.geo("windowDark", new T.BoxGeometry(1.2, 3.6, 0.3), cx + Math.cos(a) * (tr + 0.4), ty + 20, kz + Math.sin(a) * (tr + 0.4), -a + Math.PI / 2); w.geo(has(w, "neonPurple", "neonPink"), new T.BoxGeometry(1.3, 0.14, 0.3), cx + Math.cos(a) * (tr + 0.45), ty + 18, kz + Math.sin(a) * (tr + 0.45), -a + Math.PI / 2); }
        w.geo(roofP, new T.ConeGeometry(tr + 2, 26, 24), cx, ty + 43, kz); w.geo("gold", new T.CylinderGeometry(0.25, 0.4, 8, 8), cx, ty + 60, kz);
        w.geo(crys, new T.OctahedronGeometry(2.6, 0).scale(1, 1.7, 1), cx, ty + 67, kz);
        [[-1, 0], [1, 0], [0, -1]].forEach(([sx, sz]) => { const px = cx + sx * 13, pz = kz + sz * 9; w.geo(stone, new T.CylinderGeometry(3, 3.2, 22, 16), px, ty + 11, pz); w.geo(roofP, new T.ConeGeometry(4.2, 16, 16), px, ty + 30, pz); w.geo("gold", new T.ConeGeometry(0.15, 3, 4), px, ty + 39, pz); });
        w.caster(cx, kz, 22, 22, ty + 56); }
      /* 城のまわりの紫の灯り（夜） */
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; w.geo(crys, new T.OctahedronGeometry(0.7, 0).scale(1, 1.6, 1), cx + Math.cos(a) * 60, 3.6, cz + Math.sin(a) * 46); w.geo(stone2, new T.CylinderGeometry(0.5, 0.7, 2.6, 8), cx + Math.cos(a) * 60, 1.3, cz + Math.sin(a) * 46); w.colCircle(cx + Math.cos(a) * 60, cz + Math.sin(a) * 46, 0.8); }
      w.interact(cx, cz + hd + 6, 5, "MagiBurst をプレイする（クエスト「黄昏の王城」へ・アプリを開く）", () => ({ open: "MagiBurst/index.html", app: { name: "MagiBurst" } }), "⚔️");
      w.forestOpen.push([cx, cz, 90]);
    }

    /* ── バーストゲート広場（大通りの入口）：MagiBurst のロゴの塔・FULL BURST の門・キャラの旗 ── */
    { const px = AX, pz = -160;
      plaza(px, pz, 32, "walkY"); w.disk(px, pz, 12, "walkCream", 0.028);
      signTower(w, px - 47, pz, 12, 22, logo, stone, "gold");
      w.geo(crysO, new T.OctahedronGeometry(3.2, 0).scale(1, 2.2, 1), px - 47, 44, pz);
      /* FULL BURST の門（大通りの入口・東） */
      const gx = -900; [-1, 1].forEach((k) => { w.geo(stone, new T.BoxGeometry(3.2, 16, 3.2), gx, 8, pz + k * 13, 0, "L"); w.geo("gold", new T.BoxGeometry(3.6, 0.8, 3.6), gx, 16, pz + k * 13); w.geo(crys, new T.OctahedronGeometry(1.6, 0).scale(1, 1.6, 1), gx, 19, pz + k * 13); w.colObb(gx, pz + k * 13, 3.2, 3.2, 0); });
      w.geo(stone2, new T.BoxGeometry(2.2, 3.2, 29.6), gx, 15.2, pz);
      imgPlane(w, fb, 24, 3.5, gx + 1.2, 15.2, pz, Math.PI / 2); imgPlane(w, fb, 24, 3.5, gx - 1.2, 15.2, pz, -Math.PI / 2);
      w.sign("MAGIBURST LAND", { grad: ["#6a2aff", "#ff4f9a", "#ff9a2a"], color: "#fff", glow: "#ffd86a", border: "#fff", px: 1024, both: true }, 18, 2.2, gx, 12.4, pz, Math.PI / 2);
      /* キャラの旗（広場のまわり） */
      ["Roselia", "Shizuka", "Nemu", "Yuria", "Altia", "Liana", "Yaju", "Kureha", "Akatsuki", "Hikaru"].forEach((n, i) => { const a = (i + 0.5) / 10 * TAU; if (Math.abs(Math.cos(a)) > 0.86 || Math.abs(Math.sin(a)) > 0.86) return; charBanner(w, px + Math.cos(a) * 30, pz + Math.sin(a) * 30, n, 9, -a - Math.PI / 2); });
      /* 門は FULL BURST の門（エリアの標準の門は置かない） */
    }

    /* ── MAGIBURST AVENUE のお店（東西どちらも）・キャラの旗 ── */
    { const SH = [["MagiBurst SHOP", "shop", "pPurple", "kwP", null, [["MagiBurst T シャツ", 3500, "FULL BURST のロゴ"], ["アクリルスタンド", 1500, "推しを机に"], ["召喚石のキーホルダー", 900, "光る石"], ["ポスター（黄昏の王城）", 1200, "部屋に城を"]]],
        ["ジェムショップ 💎", "shop", "pBlue", "kwB", null, [["💎 のかけら（飾り）", 800, "本物のジェムではありません"], ["宝石箱", 2400, "きらきら"], ["指輪（水晶）", 3200, "紫の光"], ["ペンダント", 2800, "五つの属性"]]],
        ["装備屋 ARMS", "shop", "pRed", "kwR", null, [["木の剣（おもちゃ）", 1200, "勇者の第一歩"], ["魔法の杖", 1800, "光る先っぽ"], ["盾のクッション", 2200, "ふかふか"], ["マント", 3000, "なびく"]]],
        ["クエスト酒場", "food", "yOrange", "kwK", "bar", null], ["ポーション屋", "food", "pGreen", "kwB", "cafe", null], ["召喚カフェ", "food", "pPink", "kwP", "cafe", null], ["ギルドの食堂", "food", "yRed", "kwR", "diner", null], ["魔導書店", "shop", "pNavy", "kwK", null, [["魔導書（ノート）", 900, "白紙の呪文"], ["属性の図鑑", 1600, "相性の表つき"], ["地図（MAGIBURST LAND）", 500, "この土地の地図"], ["しおり", 300, "紫の水晶"]]]];
      w._mbShopDefs = SH;          /* ★★ 2026-10-02 お店は最後に大きく・ぎっしり並べ直す（mbLandExtra：ほかの建物ができてから、空いている所だけ） */
      for (let z = -280; z <= 400; z += 34) { if (Math.abs(z + 160) < 40 || Math.abs(z - 150) < 14 || Math.abs(z - 300) < 14 || Math.abs(z + 40) < 14) continue; const n = ["Roselia", "Shizuka", "Nemu", "Yuria", "Altia", "Liana", "Yaju", "Kureha", "Amane", "Asahi", "Ayane", "Azusa", "Chiha", "Emika", "Himeri", "Honoka", "Kana", "Kokoha", "Kuon", "Maki", "Mei", "Mikoto"][((z + 280) / 34 | 0) % 22]; charBanner(w, AX - 9.6, z, n, 8, Math.PI / 2); charBanner(w, AX + 9.6, z + 17, ["Miya", "Natsune", "Shiho", "Sougetsu", "Uta", "Aira", "Shion", "Viola", "Kiduki", "Miduki", "AnnaAlpha"][((z + 280) / 34 | 0) % 11], 8, -Math.PI / 2); }
    }

    /* ── ボスコロシアム（西）：だ円の闘技場・ボスの肖像・まん中の像（中に入れる） ── */
    { const cx = -1086, cz = 50, rx = 46, rz = 37, gaps = [[0, 0.17], [Math.PI, 0.13]];
      w.ellipsePlaza(cx, cz, rx - 3, rz - 3, has(w, "sand2", "sand"), 0.02);
      ellipseWall(w, cx, cz, rx, rz, 18, 3.2, stone, gaps, 72);
      ellipseWall(w, cx, cz, rx + 3.6, rz + 3.6, 9, 1.2, stone2, gaps, 72);
      for (let i = 0; i < 36; i++) { const a = (i + 0.5) / 36 * TAU; if (gaps.some(([c, hw]) => Math.abs(Math.atan2(Math.sin(a - c), Math.cos(a - c))) < hw + 0.05)) continue; const x = cx + Math.cos(a) * (rx + 1.75), z = cz + Math.sin(a) * (rz + 1.75), ry = Math.atan2(Math.cos(a) * rz, -Math.sin(a) * rx); w.geo("windowDark", new T.BoxGeometry(2.6, 6.5, 0.4), x, 9.5, z, ry); w.geo("gold", new T.TorusGeometry(1.3, 0.16, 6, 16, Math.PI), x, 12.7, z, ry); }
      tierRing(w, cx, cz, rx - 9, rz - 9, 4, has(w, "seatsRed", "pRed"), gaps.map(([c, hw]) => [c, hw + 0.08]));
      ellipseWall(w, cx, cz, rx - 10.2, rz - 10.2, 1.2, 0.6, stone2, gaps.map(([c, hw]) => [c, hw + 0.12]), 48);
      /* ボスの肖像（外がわの8枚・内がわの大きな4枚） */
      const BOSS = ["Hecatia", "Dominus", "Eclipse", "Inferna", "Oblivion", "Umbra", "Astraea", "Dominia", "Misora", "Youhi", "Youka"];
      for (let i = 0; i < 8; i++) { const a = (i + 0.5) / 8 * TAU + 0.2, key = texMat(w, "mbBoss_" + BOSS[i], "../MagiBurst/img/e_" + BOSS[i] + ".webp"); const x = cx + Math.cos(a) * (rx + 0.05 + 1.6), z = cz + Math.sin(a) * (rz + 0.05 + 1.6), ry = Math.atan2(Math.cos(a) * rz, Math.sin(a) * rx); imgPlane(w, key, 7, 7, x + Math.cos(a) * 0.2, 13.2, z + Math.sin(a) * 0.2, Math.atan2(Math.cos(a), Math.sin(a))); }
      /* まん中：魔王の像（台座・水晶の剣）と光の輪 */
      w.geo(stone2, new T.CylinderGeometry(5, 6, 2.4, 24), cx, 1.2, cz); w.colCircle(cx, cz, 6.2);
      w.geo(stone, new T.CylinderGeometry(1.4, 2.2, 8, 12), cx, 6.4, cz); w.geo(stone, new T.SphereGeometry(1.6, 16, 12), cx, 11.2, cz); w.geo(stone2, new T.ConeGeometry(4.2, 7, 4).rotateY(Math.PI / 4), cx, 6.2, cz);
      [-1, 1].forEach((k) => w.geo(stone, new T.ConeGeometry(0.35, 2.2, 6).rotateZ(k * 0.5), cx + k * 0.9, 12.6, cz));
      w.geo(crys, new T.OctahedronGeometry(1, 0).scale(0.5, 4.5, 0.5), cx + 3, 7, cz); w.geo(has(w, "neonPurple", "neonPink"), new T.TorusGeometry(8.5, 0.18, 6, 64).rotateX(Math.PI / 2), cx, 0.12, cz);
      w.sign("BOSS COLOSSEUM  ボスコロシアム", { bg: "#1a0a2a", color: "#ff9ad8", glow: "#c07aff", px: 1024 }, 12, 1.6, cx + rx + 0.6, 16.8, cz, Math.PI / 2);
      w.interact(cx + rx + 6, cz, 5, "MagiBurst でボスに挑む（アプリを開く）", () => ({ open: "MagiBurst/index.html", app: { name: "MagiBurst" } }), "👹");
      w.interact(cx - 8, cz, 4, "ボスの肖像を見る（ボスコロシアム）", () => ({ gallery: { name: "ボスコロシアムの肖像", list: BOSS.slice(0, 8).map((b) => [b, "MagiBurst に登場する強敵「" + b + "」。挑むにはアプリの MagiBurst で。"]) } }), "🖼️");
      w.rect("walkY", -1040, cz - 9, -1018, cz + 9, 0.022);
      w.casters.push({ pts: ring(cx, cz, rx + 3.6, rz + 3.6, 32).slice(0, 32), h: 18 }); w.forestOpen.push([cx, cz, 60]);
    }

    /* ── ギルドホール（東）：中は案内・クエストの掲示板・アプリへ ── */
    { const gx = -950, gz = 50;
      w.bld(gx, gz, 46, 30, 16, { key: has(w, "castleW2", "offWhite"), roof: "hip", roofKey: roofP, rh: 8, ry: -Math.PI / 2, crown: has(w, "neonPurple", "neonPink"),
        sign: { text: "MagiBurst ギルドホール  GUILD HALL", bg: "#2a0a3a", color: "#ffd86a", glow: "#c07aff", w: 16, h: 1.6, y: 12.6 },
        inside: { type: "lobby", name: "MagiBurst ギルドホール", h: 7, door: 5, text: "ようこそ冒険者！ クエストはアプリの MagiBurst で。新しい仲間は北東の XEVA GACHA PALACE で召喚できます。", actLabel: "受付で冒険の案内を聞く" } });
      w.interact(gx - 22, gz + 12, 3.5, "MagiBurst をプレイする（アプリを開く）", () => ({ open: "MagiBurst/index.html", app: { name: "MagiBurst" } }), "⚔️");
      [-1, 1].forEach((k) => w.flag(gx - 18, gz + k * 18, 0x8a3aff, 11));
    }

    /* ── 魔導研究所（南の西）：ガラスのドーム・テスラの塔・研究室 ── */
    { const lx = -1092, lz = 226;
      w.bld(lx, lz, 44, 34, 16, { key: has(w, "techW", "white2"), roof: "dome", roofKey: has(w, "glassDomeP", "glassDome"), ry: Math.PI / 2, sign: { text: "魔導研究所  MAGIC LAB", bg: "#0a1a3a", color: "#7fe8ff", glow: "#4ab8ff", w: 14, h: 1.5, y: 12 }, inside: { type: "lab", name: "魔導研究所", h: 7, door: 5 } });
      [[-1052, 186], [-1052, 266], [-1124, 272]].forEach(([tx, tz], i) => { w.geo("darkMetal", new T.CylinderGeometry(0.8, 1.4, 22, 10), tx, 11, tz); for (let y = 4; y < 22; y += 3) w.geo("copper" in w.m ? "copper" : "gold", new T.TorusGeometry(1.4 - y * 0.02, 0.16, 6, 20).rotateX(Math.PI / 2), tx, y, tz); w.geo([crysB, crys, crysO][i], new T.SphereGeometry(2.2, 18, 14), tx, 24, tz); w.colCircle(tx, tz, 1.6); w.caster(tx, tz, 3, 3, 26); });
      const arcs = new T.Group(); w.scene.add(arcs); w.loose(arcs, 500);
      const am = new T.MeshBasicMaterial({ color: 0x9adfff, transparent: true, opacity: 0.85, toneMapped: false });
      for (let i = 0; i < 3; i++) { const m = new T.Mesh(new T.CylinderGeometry(0.08, 0.08, 1, 4), am); arcs.add(m); }
      const A = [[-1052, 24, 186], [-1052, 24, 266], [-1124, 24, 272]];
      w.anim.push((dt, t) => { arcs.children.forEach((m, i) => { const a = A[i], b = A[(i + 1) % 3], on = Math.sin(t * 7 + i * 2.1) > 0.4; m.visible = on; if (!on) return; const dx = b[0] - a[0], dz = b[2] - a[2], L = Math.hypot(dx, dz); m.position.set((a[0] + b[0]) / 2, 24 + Math.sin(t * 31 + i) * 1.2, (a[2] + b[2]) / 2); m.scale.set(1, L, 1); m.rotation.set(Math.PI / 2, 0, -Math.atan2(dx, dz)); m.rotation.order = "YXZ"; m.rotation.y = Math.atan2(dx, dz); m.rotation.x = Math.PI / 2; m.rotation.z = 0; }); });
      w.bld(-940, 232, 30, 22, 12, { key: has(w, "techW", "white2"), roof: "flat", ry: -Math.PI / 2, crown: has(w, "neonCyan", "neonPink"), sign: { text: "錬金工房  ALCHEMY", bg: "#0a2a2a", color: "#7fffd8", w: 10, h: 1.3, y: 9 }, inside: { type: "lab", name: "錬金工房", h: 6, door: 4 } });
    }

    /* ── 天空庭園（南）：浮かぶ島・花畑・池・蓬莱の塔 ── */
    { const gx = AX, gz = 370;
      w.pond(-1086, 372, 22, "lake");
      for (let i = 0; i < 5; i++) { const a = i / 5 * TAU, x = -1086 + Math.cos(a) * 11, z = 372 + Math.sin(a) * 9, y = 9 + (i % 2) * 5;
        const isl = new T.Group(); isl.position.set(x, y, z); w.scene.add(isl); w.loose(isl, 700);
        const rock = new T.Mesh(new T.ConeGeometry(3.6, 6, 7).rotateX(Math.PI), w.m[has(w, "rock", "stoneGray")]); rock.position.y = -3; isl.add(rock);
        const top = new T.Mesh(new T.CylinderGeometry(3.7, 3.6, 0.6, 14), w.m[has(w, "lawn", "pGreen")]); isl.add(top);
        const tr = new T.Mesh(new T.IcosahedronGeometry(1.7, 1), w.m[has(w, "leafDark", "pGreen")]); tr.position.y = 2.2; isl.add(tr);
        const ph = i; w.anim.push((dt, t) => { isl.position.y = y + Math.sin(t * 0.5 + ph) * 0.8; isl.rotation.y = t * 0.05 + ph; }); }
      for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; w.flowerBed(-955 + Math.cos(a) * 22, 372 + Math.sin(a) * 26, 7, 2.4, -a, 4100 + i, XP.FLOWER_PAL[i % XP.FLOWER_PAL.length]); }
      if (w.pagodaTower) w.pagodaTower(-904, 372, 9, 4, { roofKey: has(w, "kwP", "kwK") });
      w.sign("天空庭園  SKY GARDEN", { bg: "#0a3a2a", color: "#fff", glow: "#7fffd8", px: 1024 }, 9, 1.2, -1040, 3.4, 352, Math.PI / 2);
      ["sakura", "sakura", "oak", "sakura"].forEach((k, i) => { w.plant(k, -1130 + i * 14, 420, 1.2); w.plant(k, -950 + i * 9, 330 - i * 4, 1.1); });
    }

    /* ── 南の召喚広場：召喚ゲート（大きな輪・光の渦） ── */
    { const px = AX, pz = 440;
      plaza(px, pz, 26, "walkY");
      const gz = pz + 16, R0 = 11;
      [-1, 1].forEach((k) => { w.geo(stone, new T.BoxGeometry(3, 4, 3), px + k * (R0 + 1.5), 2, gz); w.colObb(px + k * (R0 + 1.5), gz, 3, 3, 0); });
      w.geo(stone2, new T.TorusGeometry(R0, 1.1, 10, 64), px, R0 + 2.4, gz); w.geo("gold", new T.TorusGeometry(R0 + 1.2, 0.3, 6, 64), px, R0 + 2.4, gz);
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; w.geo([crys, crysO, crysB][i % 3], new T.OctahedronGeometry(0.8, 0), px + Math.cos(a) * R0, R0 + 2.4 + Math.sin(a) * R0, gz + 0.6); }
      const vt = (() => { const c = X.cv(256, 256), g = c.getContext("2d"), gr = g.createRadialGradient(128, 128, 4, 128, 128, 126); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.3, "rgba(200,140,255,.85)"); gr.addColorStop(0.7, "rgba(110,60,255,.5)"); gr.addColorStop(1, "rgba(60,20,160,0)"); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = 6; for (let i = 0; i < 5; i++) { g.beginPath(); for (let k = 0; k < 120; k++) { const a = k / 120 * 5 + i * 1.26, r = k; g.lineTo(128 + Math.cos(a) * r, 128 + Math.sin(a) * r); } g.stroke(); } return X.tex(c); })();
      const vortex = new T.Mesh(new T.CircleGeometry(R0 - 0.6, 48), new T.MeshBasicMaterial({ map: vt, transparent: true, depthWrite: false, toneMapped: false, side: T.DoubleSide, blending: T.AdditiveBlending }));
      vortex.position.set(px, R0 + 2.4, gz); w.scene.add(vortex); w.loose(vortex, 600); w.anim.push((dt, t) => { vortex.rotation.z = -t * 0.8; });
      w.sign("召喚ゲート  SUMMON GATE", { bg: "#1a0a3a", color: "#ffd86a", glow: "#c07aff", px: 1024, both: true }, 10, 1.3, px, 1.6, gz - 2.2, 0);
      w.interact(px, gz - 5, 5, "召喚ゲートにふれる（XEVA GACHA PALACE で本物のガチャが引けます）", () => ({ lobby: { text: "仲間の召喚（ガチャ）は、北東の外がわの XEVA GACHA PALACE で。地図（M）からワープ、またはモノレールの M09 ガチャパレス駅へ。", tips: "MagiBurst のキャラは XEVA ガチャで仲間になります" } }), "🌀");
      w.forestOpen.push([px, pz, 50]);
    }
    /* 西のはしの小道（コロシアム・庭園のうしろ）・木 */
    w.route([[-1138, -40], [-1146, 150], [-1138, 300]], 6, "walkCream", { raw: true, lamps: "yoma", lampEvery: 22, trees: false, benches: 40, bushes: false });
    w.forestOpen.push([AX, 0, 160], [AX, 260, 140]);
    if (w.mbLandExtra) w.mbLandExtra();          /* ★★ 2026-10-02 3D ボスバトル・ミュージアム・英雄の丘・フェス・大きなお店 */
    w._landmark = lm;
  };

  /* ══════════════════════════════════════════════════════════════
     42 MAGI BOCCIA RUSH LAND（南東）
     ══════════════════════════════════════════════════════════════ */
  P.buildBocciaRushLand = function () {
    const w = this, cx = BR.cx, cz = BR.cz;
    w.areaZone("mbr");
    w.places.push(["42 MAGI BOCCIA RUSH LAND（ラッシュ広場）", cx, 990, Math.PI]);
    const lm = w._landmark; w._landmark = true;
    const red = glowMat(w, "mbrRed", 0xff2a4a, 0.9, 2.4), blue = glowMat(w, "mbrBlue", 0x3a6aff, 0.8, 2.2), white = glowMat(w, "mbrWhite", 0xf4f6ff, 0.35, 1.2);
    const blk = has(w, "pBlack", "darkMetal"), crim = stdMat(w, "mbrCrimson", { color: 0x7a0a1e, roughness: 0.55, metalness: 0.15 });
    const logo = texMat(w, "mbrLogo", "../thumbs/MagiBocciaRush.jpg"), art = texMat(w, "mbrArt", "../MagiBocciaRush/img/mbrhome_s.webp");
    const plaza = (x, z, r, key) => { w.disk(x, z, r, key || "walkY", 0.026); w.disk(x, z, r + 0.7, "stoneW", 0.024, r); w.plazaCrowd(x, z, r * 0.8, 1.3); };
    const ball = (x, y, z, r, key) => { w.geo(key, new T.SphereGeometry(r, 28, 18), x, y, z); w.geo(blk, new T.TorusGeometry(r * 1.002, r * 0.03, 6, 40).rotateX(Math.PI / 2), x, y, z); w.geo(blk, new T.TorusGeometry(r * 1.002, r * 0.03, 6, 40).rotateY(0.6), x, y, z); };

    /* ── ラッシュ広場（北の入口）：ロゴの門・3つの大きな玉の噴水 ── */
    { const px = cx, pz = 990;
      plaza(px, pz, 28, "walkY"); w.disk(px, pz, 10, "walkCream", 0.028);
      w.pond(px, pz, 9, "pool", true); w.colCircle(px, pz, 9.4);
      ball(px - 3.4, 3.1, pz + 1.6, 2.6, red); ball(px + 3.4, 3.1, pz + 1.6, 2.6, blue); ball(px, 2.2, pz - 3.0, 1.7, white);
      const gz = pz - 30; [-1, 1].forEach((k) => { w.geo(crim, new T.BoxGeometry(3, 15, 3), px + k * 12, 7.5, gz, 0, "L"); w.geo(red, new T.OctahedronGeometry(1.4, 0).scale(1, 1.8, 1), px + k * 12, 17.6, gz); w.colObb(px + k * 12, gz, 3, 3, 0); });
      w.geo(blk, new T.BoxGeometry(27, 3.2, 1.6), px, 13.4, gz); imgPlane(w, logo, 9, 9, px, 20, gz, 0); w.geo(blk, new T.BoxGeometry(9.6, 9.6, 0.5), px, 20, gz - 0.3);
      w.sign("MAGI BOCCIA RUSH LAND", { grad: ["#ff2a4a", "#7a0a1e", "#2a3aff"], color: "#fff", glow: "#ffb0c0", border: "#fff", px: 1024, both: true }, 24, 2.4, px, 13.4, gz + 0.85, 0);

      [["Kureha", -30], ["Akatsuki", -22], ["Shion", 22], ["Viola", 30]].forEach(([n, dx]) => charBanner(w, px + dx, pz + 2, n, 8, 0));
    }

    /* ── BOCCIA RUSH ARENA（巨大アリーナ）：紅い壁・赤い水晶の柱・屋根の光の輪・大画面・中のコート（CPU と勝負） ── */
    { const rx = 66, rz = 48, H = 26, gaps = [[-Math.PI / 2, 0.13], [Math.PI / 2, 0.13]];
      w.ellipsePlaza(cx, cz, rx - 2, rz - 2, has(w, "courtBlue", "plazaGray"), 0.02);
      ellipseWall(w, cx, cz, rx, rz, H, 3, crim, gaps, 80);
      ellipseWall(w, cx, cz, rx + 4, rz + 4, 6, 1, blk, gaps, 80);
      for (let i = 0; i < 24; i++) { const a = (i + 0.5) / 24 * TAU; if (gaps.some(([c, hw]) => Math.abs(Math.atan2(Math.sin(a - c), Math.cos(a - c))) < hw + 0.06)) continue; const x = cx + Math.cos(a) * (rx + 2), z = cz + Math.sin(a) * (rz + 2); w.geo(red, new T.BoxGeometry(1, H + 4, 1), x, (H + 4) / 2, z, Math.atan2(Math.cos(a) * rz, -Math.sin(a) * rx)); }
      w.geo(blk, new T.TorusGeometry(1, 0.05, 6, 96).scale(rx + 1, rz + 1, 6).rotateX(Math.PI / 2), cx, H + 0.4, cz);
      w.geo(red, new T.TorusGeometry(1, 0.012, 6, 96).scale(rx + 1.4, rz + 1.4, 30).rotateX(Math.PI / 2), cx, H + 1.4, cz);
      /* 屋根（まわりだけの庇）*/
      { const sh = new T.Shape(); for (let i = 0; i <= 96; i++) { const a = i / 96 * TAU; const px = Math.cos(a) * (rx + 1), pz = Math.sin(a) * (rz + 1); if (i) sh.lineTo(px, pz); else sh.moveTo(px, pz); } const hole = new T.Path(); for (let i = 0; i <= 96; i++) { const a = -i / 96 * TAU; const px = Math.cos(a) * (rx - 16), pz = Math.sin(a) * (rz - 16); if (i) hole.lineTo(px, pz); else hole.moveTo(px, pz); } sh.holes.push(hole);
        const g = new T.ShapeGeometry(sh, 2); g.rotateX(Math.PI / 2); w.geo(has(w, "glassDome", "white2"), g, cx, H, cz); }
      tierRing(w, cx, cz, rx - 14, rz - 14, 6, has(w, "seatsRed", "pRed"), gaps.map(([c, hw]) => [c, hw + 0.1]));
      ellipseWall(w, cx, cz, rx - 15.2, rz - 15.2, 1.2, 0.6, blk, gaps.map(([c, hw]) => [c, hw + 0.14]), 56);
      /* 大画面（外の4面：ロゴ・キービジュアル） */
      [[0, logo, 18, 18], [Math.PI, logo, 18, 18], [Math.PI / 2, art, 12, 21.4], [-Math.PI / 2, art, 12, 21.4]].forEach(([a, key, sw, sh2]) => { const x = cx + Math.cos(a) * (rx + 4.4), z = cz + Math.sin(a) * (rz + 4.4), ry = Math.atan2(Math.cos(a), Math.sin(a)); if (Math.abs(Math.sin(a)) > 0.9) { w.geo(blk, new T.BoxGeometry(sw + 1, sh2 + 1, 0.6), x, 14 + sh2 / 2, z + Math.sin(a) * 0.4, ry); imgPlane(w, key, sw, sh2, x + Math.cos(a) * 0.05, 14 + sh2 / 2, z + Math.sin(a) * 0.75, ry); } else { w.geo(blk, new T.BoxGeometry(0.6, sh2 + 1, sw + 1), x + Math.cos(a) * 0.4, 6 + sh2 / 2, z, 0); imgPlane(w, key, sw, sh2, x + Math.cos(a) * 0.75, 6 + sh2 / 2, z, ry); } });
      w.sign("BOCCIA RUSH ARENA", { bg: "#1a0408", color: "#fff", glow: "#ff4a6a", border: "#ff4a6a", px: 1024 }, 26, 2.6, cx, H - 3.4, cz - rz - 0.4, Math.PI);
      w.sign("BOCCIA RUSH ARENA", { bg: "#1a0408", color: "#fff", glow: "#ff4a6a", border: "#ff4a6a", px: 1024 }, 26, 2.6, cx, H - 3.4, cz + rz + 0.4, 0);
      /* 中のコート：線・ジャック・紅白青の玉の像・CPU と勝負 */
      const ccx = cx, ccz = cz; w.box("white2", ccx, 0.03, ccz, 26, 0.02, 0.2); w.box("white2", ccx, 0.03, ccz - 6, 26, 0.02, 0.2); w.box("white2", ccx, 0.03, ccz + 6, 26, 0.02, 0.2); w.box("white2", ccx - 13, 0.03, ccz, 0.2, 0.02, 12); w.box("white2", ccx + 13, 0.03, ccz, 0.2, 0.02, 12); w.box("white2", ccx - 6.25, 0.03, ccz, 0.16, 0.02, 12);
      w.geo(has(w, "neonRed", "neonPink"), new T.RingGeometry(1.4, 1.6, 40).rotateX(-Math.PI / 2), ccx + 4, 0.04, ccz);
      ball(cx - 26, 1.2, cz - 14, 1.2, red); ball(cx - 23, 1.2, cz - 16, 1.2, blue); ball(cx + 26, 0.8, cz + 14, 0.8, white);
      const court = { cx: ccx, cz: ccz, L: 12.5, Wd: 6, rush: true };          /* ★★ 2026-10-02 ラッシュルール（3 投ごとに RUSH SHOT） */
      w.interact(ccx - 9, ccz + 4.5, 4, "アリーナのコートでボッチャ（CPU と勝負）", () => { w.boccia = court; return { game: "boccia" }; }, "🔴");
      w.interact(cx, cz - rz - 6, 6, "Magi: Boccia Rush をプレイする（アプリを開く）", () => ({ open: "MagiBocciaRush/index.html", app: { name: "Magi: Boccia Rush" } }), "🔴");
      w.zone("BOCCIA RUSH ARENA", cx - rx, cz - rz, cx + rx, cz + rz, "outdoor");
      w.casters.push({ pts: ring(cx, cz, rx + 4.5, rz + 4.5, 40).slice(0, 40), h: H }); w.forestOpen.push([cx, cz, 110]);
      w.plazaCrowd(cx, cz - rz - 12, 16, 1.4); w.plazaCrowd(cx, cz + 4, 18, 0.8);
    }

    /* ── ラッシュ通り（西）：チームのお店・カフェ ── */
    { const SH = [["RUSH STORE", "shop", [["公式ユニフォーム", 6800, "チームの色"], ["ボッチャボール（赤・青）", 4800, "大会と同じ大きさ"], ["タオル", 1800, "MAGI BOCCIA RUSH"], ["キャップ", 2600, "赤い月のマーク"]]], ["ジャックボール カフェ", "food", "cafe"], ["RED MOON 食堂", "food", "diner"], ["TEAM BLUE ショップ", "shop", [["青のユニフォーム", 6800, "TEAM BLUE"], ["応援うちわ", 600, "ダブルピース"], ["メガホン", 900, "声をとどけろ"], ["リストバンド", 800, "青く光る"]]], ["ラッシュ屋台村", "food", "takoyaki"], ["トロフィーの店", "shop", [["ミニトロフィー", 1500, "金色"], ["メダル", 900, "チャンピオン"], ["盾", 2400, "名前を彫れる"], ["フォトフレーム", 1200, "勝利の1枚に"]]]];
      SH.forEach((d, i) => { const side = i % 2 ? -1 : 1, x = 500 + Math.floor(i / 2) * 32, z = cz + side * 24;          /* ★★ 2026-10-02 お店を大きく（24×16・高さ 13） */
        w.yomaShop(x, z, 24, 16, 13, { ry: side > 0 ? Math.PI : 0, key: side > 0 ? "yRed" in w.m ? "yRed" : "pRed" : "pBlue", shop: "shopA", roof: i % 2 ? "barrel" : "kawara", roofKey: side > 0 ? has(w, "kwR", "kwK") : has(w, "kwB", "kwK"), rh: 2.4, sign: d[0], signColor: "#2a0a10", lanterns: 2, inside: d[1] === "food" ? { type: "food", name: d[0], menu: d[2] } : { type: "shop", name: d[0], items: d[2] } }); });
      for (let x = 486; x < 600; x += 22) w.garlandLine(x, cz - 7, x, cz + 7);
    }

    /* ── 練習コート（東・3面）：ここでも CPU と勝負 ── */
    { [[842, 1068], [842, 1182]].forEach(([x, z], i) => {
        w.rect(has(w, "courtTeal", "plazaGray"), x - 17, z - 9, x + 17, z + 9, 0.02);
        [[0, -6], [0, 6]].forEach(([, dz]) => w.box("white2", x, 0.03, z + dz, 26, 0.02, 0.18)); w.box("white2", x - 13, 0.03, z, 0.18, 0.02, 12); w.box("white2", x + 13, 0.03, z, 0.18, 0.02, 12);
        [-1, 1].forEach((k) => { w.box(blk, x, 0, z + k * 9.5, 34, 1.1, 0.2); w.colObb(x - 8, z + k * 9.5, 18, 0.3, 0); });
        const court = { cx: x, cz: z, L: 12.5, Wd: 6, rush: true };
        w.interact(x - 9, z + 4.4, 3.5, "練習コートでボッチャ（CPU と勝負）", () => { w.boccia = court; return { game: "boccia" }; }, "🔴");
        w.sign("PRACTICE COURT " + (i + 1), { bg: "#0a2a4a", color: "#fff", px: 512 }, 6, 0.8, x + 18, 2.4, z, -Math.PI / 2);
        w.geo("darkMetal", new T.CylinderGeometry(0.1, 0.1, 2.4, 6), x + 18, 1.2, z); });
    }

    /* ── 紅い月の塔（南西）・チャンピオンの塔（南東） ── */
    { const tx = 586, tz = 1236;
      w.disk(tx, tz, 14, "walkY", 0.026);
      w.geo(crim, new T.CylinderGeometry(4.2, 6, 46, 16), tx, 23, tz, 0, "L"); w.colCircle(tx, tz, 6.2); w.caster(tx, tz, 10, 10, 60);
      for (let y = 6; y < 46; y += 8) w.geo(red, new T.TorusGeometry(5.2 - y * 0.02, 0.22, 6, 32).rotateX(Math.PI / 2), tx, y, tz);
      const moon = glowMat(w, "mbrMoon", 0xff3a3a, 1.2, 3.0); w.geo(moon, new T.SphereGeometry(7, 32, 20), tx, 54, tz, 0, "L");
      w.sign("紅い月の塔  RED MOON TOWER", { bg: "#1a0408", color: "#ff9aa8", glow: "#ff4a6a", px: 1024, both: true }, 10, 1.2, tx, 3, tz + 6.5, 0);
      const ch = [820, 1236]; w.disk(ch[0], ch[1], 12, "walkCream", 0.026);
      w.bld(ch[0], ch[1], 18, 18, 28, { key: blk, roof: "flat", crown: red, sign: { text: "CHAMPION HALL  ランキング", bg: "#1a0408", color: "#ffd86a", w: 12, h: 1.4, y: 6 }, inside: { type: "gallery", name: "チャンピオンホール", h: 6, door: 4, list: [["MAGI BOCCIA RUSH", "ジャックボールに、自分の玉をいちばん近づけたチームの勝ち。"], ["RANK と RP", "勝つと RP が上がり、ランクが上がる（アプリの Magi: Boccia Rush で）。"], ["BOSS STAGE", "ボスとの特別な試合。熟練度を上げて挑もう。"], ["紅い月", "アリーナの上に昇る紅い月——ラッシュの夜の合図。"]] } });
      w.geo("gold", new T.CylinderGeometry(1.6, 2.2, 3, 12), ch[0], 29.5, ch[1]); w.geo("gold", new T.SphereGeometry(2, 16, 12), ch[0], 32.4, ch[1]);
      w.mbrMoon = moon;
    }
    ["sakura", "oak", "sakura", "oak"].forEach((k, i) => { w.plant(k, 520 + i * 40, 1020, 1.1); w.plant(k, 790 + i * 10, 990 - i * 6, 1.0); });
    w.forestOpen.push([cx, 1080, 170]);
    if (w.mbrLandExtra) w.mbrLandExtra();          /* ★★ 2026-10-02 ラッシュルール・名誉の殿堂・ラッシュフェス・大きなお店 */
    w._landmark = lm;
  };

  /* ══════════════════════════════════════════════════════════════
     43 XEVA GACHA PALACE（北東）：本物のガチャ（XEVA を使う）
     ══════════════════════════════════════════════════════════════ */
  /* 開催中のガチャ（ホームのロビーのバナーと同じ決め方＝ home-mate.js の liveGachas）。新しい順・PREMIUM SELECT・アーカイブは最後 */
  const ymd = (d) => d.toLocaleDateString("sv-SE"), addDays = (s, n) => { const d = new Date(String(s) + "T00:00:00"); d.setDate(d.getDate() + n); return ymd(d); };
  const DEFS = () => {
    const D = window.XH_GACHA_DEFS; if (!D) return [];
    const today = ymd(new Date()), now = Date.now(), day = new Date().getDate(), out = [];
    (D.fests || []).forEach((f) => {
      if (!f.banner) return;
      if (f.openAt && now < Date.parse(f.openAt)) return;
      if (f.monthly && !(day >= f.monthly[0] && day <= f.monthly[1])) return;
      const timed = !f.monthly && !f.lux && !f.perm && f.since;
      if (timed && today >= (f.until ? addDays(f.until, 1) : addDays(f.since, D.fesDays || 20))) return;
      if (f.since && today < f.since) return;
      const t = f.key === "archive" ? "0000" : f.monthly ? today.slice(0, 8) + String(f.monthly[0]).padStart(2, "0") : (f.since || "0001");
      out.push({ key: f.key, banner: f.banner, t, nm: f.nm });
    });
    const dv = ((D.debut && D.debut.vers) || []).filter((v) => today >= v.date && today < (v.movedAt || addDays(v.date, D.debut.days || 20)));
    if (dv.length) out.push({ key: "debut", banner: D.debut.banner, t: dv[0].date, nm: "GRAND DEBUT" });
    out.sort((a, b) => String(b.t).localeCompare(String(a.t)));
    out.push({ key: "premium", banner: (D.premium && D.premium.banner) || "MagiBurst/img/bn_premium_s.webp", t: "", nm: "PREMIUM SELECT" });
    const ai = out.findIndex((g) => g.key === "archive"); if (ai >= 0) out.push(out.splice(ai, 1)[0]);
    return out;
  };
  function walletBal() { try { const o = JSON.parse(localStorage.getItem("xeva_wallet_v1") || "null"); return o && typeof o.balance === "number" ? o.balance : null; } catch (e) { return null; } }
  P.buildGachaPalace = function () {
    const w = this, cx = GC.cx, pz = GC.pz, hz = GC.hz;
    w.areaZone("gacha");
    w.places.push(["43 XEVA GACHA PALACE（ガチャ広場）", cx, pz + 30, Math.PI]);
    const lm = w._landmark; w._landmark = true;
    const gold = has(w, "gGold", "gold"), gold2 = has(w, "rGold", "gold"), wht = has(w, "white2", "offWhite");
    const capK = ["pRed", "pBlue", "pYellow", "pGreen", "pPink", "pPurple", "pOrange"].map((k) => has(w, k, "pRed"));
    const xeva = texMat(w, "gcXeva", "../XEVA.png", { transparent: true, depthWrite: false });
    const glowG = glowMat(w, "gcGlow", 0xffd24a, 0.8, 2.2);
    const plaza = (x, z, r, key) => { w.disk(x, z, r, key || "walkY", 0.026); w.disk(x, z, r + 0.7, "stoneW", 0.024, r); w.plazaCrowd(x, z, r * 0.8, 1.4); };

    /* ── ガチャ広場：巨大ガチャマシン（高さ約 30m・カプセルが回る・ときどき出てくる） ── */
    { plaza(cx, pz, 36, "walkY"); w.disk(cx, pz, 14, "walkCream", 0.028);
      const mz = pz; w.geo(capK[0], new T.BoxGeometry(14, 10, 14), cx, 5, mz); w.colObb(cx, mz, 14.4, 14.4, 0); w.caster(cx, mz, 14, 14, 30);
      w.geo(gold, new T.BoxGeometry(14.6, 0.8, 14.6), cx, 10.2, mz); w.geo(gold, new T.BoxGeometry(14.6, 0.6, 14.6), cx, 0.3, mz);
      w.geo(wht, new T.CylinderGeometry(2.2, 2.2, 0.8, 24).rotateX(Math.PI / 2), cx, 5.4, mz + 7.2); w.geo(gold, new T.BoxGeometry(3.6, 0.7, 0.7), cx, 5.4, mz + 7.7);
      w.geo(blkOr(w), new T.BoxGeometry(3.4, 2.6, 0.4), cx, 2.0, mz + 7.1); w.sign("XEVA", { bg: "#2a1a00", color: "#ffd86a", px: 256 }, 2.8, 0.7, cx, 8.6, mz + 7.06, 0);
      const dome = new T.Mesh(new T.SphereGeometry(9, 40, 24), w.m[has(w, "glassDome", "glassClear")]); dome.position.set(cx, 18.6, mz); w.scene.add(dome); w.loose(dome, 1600);
      w.geo(gold, new T.TorusGeometry(9.05, 0.35, 8, 64).rotateX(Math.PI / 2), cx, 18.6, mz); w.geo(gold, new T.CylinderGeometry(1.2, 1.6, 1.6, 16), cx, 28.2, mz);
      imgPlane(w, xeva, 6, 6, cx, 31.6, mz, 0); imgPlane(w, xeva, 6, 6, cx, 31.6, mz, Math.PI);
      /* 中のカプセル（インスタンス・ゆっくり回る） */
      const NC = 90, cg = new T.SphereGeometry(1.15, 14, 10), cm = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25, metalness: 0.05 }), caps = new T.InstancedMesh(cg, cm, NC), c = new T.Color(), m4 = new T.Matrix4(), seeds = [];
      const cols = [0xff4a5a, 0x4a8aff, 0xffd84a, 0x5ae08a, 0xff8ad8, 0xa86aff, 0xff9a3a];
      for (let i = 0; i < NC; i++) { c.setHex(cols[i % cols.length]); caps.setColorAt(i, c); seeds.push([Math.random() * TAU, Math.random() * 6.5, (Math.random() - 0.5) * 7]); }
      caps.position.set(cx, 18.6, mz); w.scene.add(caps); w.loose(caps, 1200);
      w.anim.push((dt, t) => { for (let i = 0; i < NC; i++) { const [a, r, y] = seeds[i], aa = a + t * 0.25 * (i % 2 ? 1 : -0.7), rr = Math.min(7.6, r), yy = Math.max(-8.2, Math.min(7.8, y - 7.6 + 0.0)); m4.makeTranslation(Math.cos(aa) * rr, -7.2 + (i % 8) * 0.95 + Math.sin(t + i) * 0.1, Math.sin(aa) * rr); caps.setMatrixAt(i, m4); } caps.instanceMatrix.needsUpdate = true; });
      /* ときどき出てくるカプセル */
      const out = new T.Mesh(new T.SphereGeometry(1.0, 16, 12), w.m[capK[2]]); w.scene.add(out); w.loose(out, 600);
      w.anim.push((dt, t) => { const k = (t * 0.12) % 1; out.visible = k < 0.4; if (!out.visible) return; const s = k / 0.4; out.position.set(cx + Math.sin(s * 9) * 0.3, 1.0 + Math.abs(Math.sin(s * 12)) * (1 - s) * 2.4, mz + 8 + s * 10); });
      w.sign("GIANT GACHA  巨大ガチャ", { grad: ["#ff4a5a", "#ffb020", "#4a8aff"], color: "#fff", glow: "#fff2a0", px: 1024 }, 12, 1.4, cx, 11.4, mz + 7.35, 0);
      for (let i = 0; i < 8; i++) { const a = (i + 0.5) / 8 * TAU, r = 26; const x = cx + Math.cos(a) * r, z = mz + Math.sin(a) * r; if (Math.abs(Math.cos(a)) > 0.85 && Math.sin(a) > -0.2 || Math.sin(a) < -0.9) continue; w.gachaMachine ? w.gachaMachine(x, z, 1.3, capK[i % capK.length]) : null; }
      w.forestOpen.push([cx, pz, 60]);
    }

    /* ── 宮殿（XEVA GACHA PALACE）：白と金・大ドーム・2本の塔・正面の大画面（開催中のガチャ） ── */
    { const W2 = 120, D2 = 112, H = 26, fz = hz + D2 / 2;
      /* 1階の大広間（中に入れる・ガチャ台を自分で並べる）＋上の階 */
      const room = w.enterable(cx, hz, W2, D2, 12, 0, { type: "lobby", name: "XEVA GACHA PALACE 大広間", key: wht, inner: has(w, "creamW", "offWhite"), floor: has(w, "marble", "plazaGray"), door: 14, doorH: 8, glass: true, text: "ようこそ XEVA GACHA PALACE へ！ ガチャ台では、本物のガチャ（XEVA・💎・🎫 を使う）が引けます。", actLabel: "受付でガチャパレスの案内を聞く" });
      w.box(wht, cx, 12, hz, W2 + 0.4, H - 12, D2 + 0.4, { uv: 10 }); w.caster(cx, hz, W2, D2, H);
      w.box(gold, cx, H, hz, W2 + 1.2, 1.2, D2 + 1.2);
      for (let i = -6; i <= 6; i++) { w.box("windowDark", cx + i * 8.6, 15, fz + 0.24, 3.2, 7, 0.1); w.box(gold, cx + i * 8.6, 18.8, fz + 0.3, 3.6, 0.4, 0.2); }
      /* 正面のアーチ・柱 */
      w.geo(gold, new T.TorusGeometry(8.5, 0.7, 10, 32, Math.PI), cx, 12, fz + 0.6); w.box(gold, cx, 12, fz + 0.5, 18, 0.9, 1.2);
      for (let i = -3; i <= 3; i++) { if (i === 0) continue; const x = cx + i * 9.5; w.geo(wht, new T.CylinderGeometry(1.1, 1.3, 12, 16), x, 6, fz + 2.6); w.geo(gold, new T.CylinderGeometry(1.5, 1.5, 0.8, 16), x, 12.2, fz + 2.6); w.colCircle(x, fz + 2.6, 1.3); }
      w.box(wht, cx, 12.6, fz + 2.6, 62, 1.2, 6);
      w.sign("XEVA GACHA PALACE", { grad: ["#ffb020", "#ff4a8a", "#6a4aff"], color: "#fff", glow: "#fff2a0", border: "#fff", px: 1024 }, 34, 3.4, cx, 21.6, fz + 0.32, 0);
      /* 大ドーム・頂上の XEVA */
      w.geo(wht, new T.CylinderGeometry(30, 30, 6, 48), cx, H + 4, hz); w.geo(gold, new T.CylinderGeometry(30.6, 30.6, 0.8, 48), cx, H + 7.2, hz);
      w.geo(has(w, "glassDome", "glassClear"), new T.SphereGeometry(30, 48, 20, 0, TAU, 0, Math.PI / 2), cx, H + 7, hz);
      for (let i = 0; i < 16; i++) { const t = new T.TorusGeometry(30.1, 0.3, 4, 48, Math.PI); t.rotateY(i / 16 * Math.PI); w.geo(gold, t, cx, H + 7, hz); }
      w.geo(gold, new T.CylinderGeometry(2, 3, 5, 16), cx, H + 39, hz); w.geo(glowG, new T.SphereGeometry(3.2, 24, 16), cx, H + 44, hz);
      imgPlane(w, xeva, 9, 9, cx, H + 52, hz, 0); imgPlane(w, xeva, 9, 9, cx, H + 52, hz, Math.PI / 2);
      w.caster(cx, hz, 56, 56, H + 40);
      /* 2本の塔 */
      [-1, 1].forEach((k) => { const tx = cx + k * (W2 / 2 + 6), tz = fz - 10; w.geo(wht, new T.CylinderGeometry(6, 6.6, 50, 24), tx, 25, tz); w.colCircle(tx, tz, 6.6); w.caster(tx, tz, 12, 12, 64);
        for (let y = 10; y < 50; y += 10) w.geo(gold, new T.TorusGeometry(6.4, 0.3, 6, 32).rotateX(Math.PI / 2), tx, y, tz);
        w.geo(gold2, new T.ConeGeometry(7.2, 16, 24), tx, 58, tz); w.geo(capK[k > 0 ? 1 : 0], new T.SphereGeometry(2.4, 16, 12), tx, 68, tz); });
      /* 正面の大画面：開催中のガチャのバナーを順番に（絵は MagiBurst/img/bn_*） */
      const list = DEFS(), imgs = list.map((d) => { const im = new Image(); im.src = "../" + d.banner; return im; });
      [-1, 1].forEach((k) => { w.screen(24, 13.5, 768, cx + k * 44, 13.6, fz + 1.2, 0, (g, W3, H3, t) => {
        g.fillStyle = "#0a0614"; g.fillRect(0, 0, W3, H3);
        if (!imgs.length) return; const i = (Math.floor(t / 4) + (k > 0 ? 1 : 0)) % imgs.length, im = imgs[i];
        if (im.complete && im.naturalWidth) { const s = Math.min(W3 / im.naturalWidth, (H3 - 60) / im.naturalHeight), iw = im.naturalWidth * s, ih = im.naturalHeight * s; g.drawImage(im, (W3 - iw) / 2, 6, iw, ih); }
        g.fillStyle = "rgba(0,0,0,.6)"; g.fillRect(0, H3 - 52, W3, 52); g.fillStyle = "#ffd86a"; g.font = "900 30px sans-serif"; g.textAlign = "center"; g.fillText("開催中： " + list[i].nm, W3 / 2, H3 - 16); g.textAlign = "left";
      }, { every: 0.5 }); });
      /* XEVA の残高（本物の残高・数秒ごと）：大広間の奥の壁・広場の案内板 */
      const balScreen = (x, y, z, ry, sw, sh) => w.screen(sw, sh, 768, x, y, z, ry, (g, W3, H3, t) => {
        const gr = g.createLinearGradient(0, 0, W3, 0); gr.addColorStop(0, "#2a1a00"); gr.addColorStop(1, "#4a2a00"); g.fillStyle = gr; g.fillRect(0, 0, W3, H3);
        const b = walletBal(); g.fillStyle = "#ffd86a"; g.font = "900 " + Math.round(H3 * 0.36) + "px sans-serif"; g.textAlign = "center";
        g.fillText(b == null ? "XEVA でガチャが引けます" : "あなたの XEVA： " + b.toLocaleString("ja-JP"), W3 / 2, H3 * 0.58); g.font = "700 " + Math.round(H3 * 0.16) + "px sans-serif"; g.fillStyle = "#fff"; g.fillText("ガチャ台で、本物のガチャを引こう（XEVA・💎・🎫）", W3 / 2, H3 * 0.86); g.textAlign = "left";
      }, { every: 3 });
      { const [bx, bz] = room.L(0, -room.id / 2 + 0.7); balScreen(bx, 8.4, bz, 0, 18, 4.5); }
      w.route([[cx, pz - 34], [cx, fz + 7]], 14, "walkY", { raw: true, lamps: "yoma", lampEvery: 12, lampsBoth: true, trees: false, benches: false, bushes: false });
      balScreen(cx + 22, 4.2, pz - 6, -Math.PI / 4, 8, 2.2); w.box(blkOr(w), cx + 22, 0, pz - 6, 0.4, 3.0, 0.4); w.colCircle(cx + 22, pz - 6, 0.5);
      /* ── 大広間の中：ガチャ台（バナーの絵・光る枠）× 開催中のガチャの数 ── */
      { const n = Math.max(1, list.length), perRow = Math.min(8, n), rows = Math.ceil(n / perRow), iw = room.iw, id = room.id;
        list.forEach((d, i) => { const r = Math.floor(i / perRow), q = i % perRow, nn = Math.min(perRow, n - r * perRow);
          const a = -iw / 2 + 8 + (q + 0.5) * (iw - 16) / nn, b = -id / 2 + 10 + r * 16;
          const [x, z] = room.L(a, b), key = texMat(w, "gcBn_" + d.key, "../" + d.banner);
          w.box(has(w, "pNavy", "darkMetal"), x, 0, z, 9.6, 6.4, 2.2); w.colObb(x, z, 9.8, 2.4, 0);
          w.box(gold, x, 6.4, z, 10, 0.5, 2.6); w.box(glowG, x, 0.9, z + 1.12, 9, 0.12, 0.06);
          imgPlane(w, key, 8.8, 4.95, x, 3.7, z + 1.13, 0);
          w.sign(d.nm, { bg: "#1a1030", color: "#ffd86a", px: 512 }, 8.8, 0.7, x, 7.1, z + 1.32, 0);
          /* ★★ 2026-10-02 3D で引く（本物のガチャ・park_gacha3d.js）。2D の画面は奥の台から */
          w.interact(x, z + 3.6, 3.4, "「" + d.nm + "」を 3D で引く（本物のガチャ・💎🎫を使う）", () => { w.gacha3dSel = { key: d.key, nm: d.nm, banner: d.banner }; return w.g3dMachine ? { game: "gacha3d" } : { realGacha: { key: d.key, nm: d.nm } }; }, "🎰"); });
        /* まん中：プレミアムガチャ・ガチャの一覧・図鑑 */
        const [mx, mz2] = room.L(0, id / 2 - 18);
        w.geo(gold, new T.CylinderGeometry(4, 4.6, 1.2, 32), mx, 0.6, mz2); w.geo(has(w, "glassDome", "glassClear"), new T.SphereGeometry(3.4, 24, 16), mx, 4.4, mz2); w.colCircle(mx, mz2, 4.7);
        w.interact(mx, mz2 + 5.5, 4, "ガチャの画面を開く（2D・本物のガチャ・XEVA を使う）", () => ({ realGacha: { key: "", nm: "ガチャ" } }), "🎰");
        /* ★★ 2026-10-02 大広間のまん中の 3D ガチャマシン（ハンドルが回り、カプセルが出てくる） */
        if (window.XGacha3D) { const [gx, gz] = room.L(0, 4); XGacha3D.buildMachine(w, gx, gz, 0); w.interact(gx, gz + 7.5, 4.5, "3D ガチャマシンで引く（本物のガチャ）", () => { w.gacha3dSel = list[0] ? { key: list[0].key, nm: list[0].nm, banner: list[0].banner } : { key: "premium", nm: "PREMIUM SELECT" }; return { game: "gacha3d" }; }, "🎰"); w.sign("3D GACHA MACHINE  ハンドルを回そう！", { bg: "#7a5418", px: 1024, both: true }, 8, 0.9, gx - 9.5, 1.2, gz + 3, Math.PI / 4); }
        const [kx, kz] = room.L(-iw / 2 + 6, id / 2 - 8); w.interact(kx, kz, 3, "キャラクター図鑑を開く（集めたキャラ）", () => ({ open: "characters.html", app: { name: "キャラクター図鑑" } }), "📖");
        w.box(has(w, "pPurple", "pBlue"), kx, 0, kz - 2, 3, 2.4, 1.2); w.sign("📖 図鑑", { bg: "#2a1a4a", color: "#fff", px: 256 }, 2.4, 0.6, kx, 2.8, kz - 1.36, 0); }
      w.forestOpen.push([cx, hz, 120]);
    }
    /* ── カプセル通り（広場の南）・両わきのお店 ── */
    { const SH = [["XEVA 両替所", "shop", [["XEVA コインの置物", 1200, "金色"], ["ガチャカプセル（空）", 300, "なんでも入れられる"], ["ジェムのかけら（飾り）", 800, "本物ではありません"], ["XEVA の財布", 2800, "きらきら"]]], ["カプセルカフェ", "food", "cafe"], ["ラッキー屋", "shop", [["招き猫", 1600, "当たりますように"], ["四つ葉のお守り", 700, "SSR 祈願"], ["ラッキーブレス", 1500, "虹色"], ["くじの本", 900, "確率のはなし"]]], ["10連ベーカリー", "food", "crepe"]];
      SH.forEach((d, i) => { const side = i % 2 ? -1 : 1, z = -372 - Math.floor(i / 2) * 26, x = cx + side * 26;
        w.yomaShop(x, z, 16, 11, 8, { ry: side > 0 ? -Math.PI / 2 : Math.PI / 2, key: side > 0 ? "yOrange" in w.m ? "yOrange" : "pOrange" : "pYellow", shop: "shopA", roof: i % 2 ? "barrel" : "kawara", roofKey: has(w, i % 2 ? "kwB" : "kwR", "kwK"), rh: 2.2, sign: d[0], signColor: "#2a1a00", lanterns: 2, inside: d[1] === "food" ? { type: "food", name: d[0], menu: d[2] } : { type: "shop", name: d[0], items: d[2] } }); });
      for (let z = -350; z > -430; z -= 18) { w.geo(capK[(z / 18 | 0) & 3], new T.SphereGeometry(1.2, 16, 10), cx - 11.5, 1.2, z); w.geo(capK[((z / 18 | 0) + 2) & 3], new T.SphereGeometry(1.2, 16, 10), cx + 11.5, 1.2, z); w.colCircle(cx - 11.5, z, 1.3); w.colCircle(cx + 11.5, z, 1.3); }
      w.areaGate(cx, -350, 0, "gacha", "big");
    }
    w._landmark = lm;
  };
  function blkOr(w) { return w.m.pBlack ? "pBlack" : "darkMetal"; }

  /* ══════════════ モノレールの駅（外がわの入口）→ 各土地へ道 ══════════════ */
  const STN_LINK = {
    M03: [[-905, 470], [-984, 446]],
    M04: [[-870, 150]],
    M05: [[-880, -214], [-880, -169]],
    M09: [[820, -600], [880, -540], [940, -478]],
    M12: [[650, 920], [BR.cx, 935], [BR.cx, 958]]
  };
  P.linkOuterStations = function () {
    const w = this, L = w.monorail; if (!L) return; const I = w.spotIndex(); let made = 0;
    L.stops.forEach((st) => {
      const tg = STN_LINK[st.no]; if (!tg || !st.outer) return;
      const pts = [st.outer].concat(st.outer2 ? [st.outer2] : [], tg), sp = w.fillet ? w.fillet(pts, 14) : pts;          /* まず線路から外へまっすぐ（入口の門の柱をよける） */
      w.route(sp, 10, "walkY", { raw: true, lamps: "yoma", lampEvery: 20, trees: false, benches: 60, bushes: false });
      const e = tg[tg.length - 1]; w.disk(e[0], e[1], 8, "walkY", 0.03);
      (w.net = w.net || []).push({ id: "outer" + st.no, pts: sp, w: 10, cls: "st", r0: w.roads.length, r1: w.roads.length });
      made++;
    });
    /* ボッチャの元のコート：始めるときに元のコートにもどす（新しい土地のコートと切りかえ） */
    const home = w.boccia; if (home) w.inter.forEach((it) => { if (it.label === "ボッチャで勝負する") it.act = () => { w.boccia = home; return { game: "boccia" }; }; });
    w._outerLinks = made;
  };
  P.realGachaBalance = walletBal;
  XP.gachaDefs = DEFS;          /* ★★ 2026-10-02 3D ガチャ（park_gacha3d.js）の「ガチャを変える」で使う */

  /* ══════════════ 道しるべ（大きな交差点）：いちばん近いモノレールの駅・地下鉄の駅・大きな土地への向きと距離 ══════════════
     ★★ 2026-10-01 ご指定「今の配置だとわかりづらい」「駅の場所がわかりづらい」。板の先が行き先の方を向く（表と裏で矢印が逆にならないよう、表裏は別の板）。 */
  const LANDS = ["mburst", "mbr", "gacha", "ngx", "fountain", "gate", "fun", "mf", "ishida", "harbor", "dome", "resort", "metro"];
  P.buildSignposts = function () {
    const w = this, J = (w.junctions || []).filter((j) => j.r >= 8.5).sort((a, b) => b.r - a.r).slice(0, 34), I = w.spotIndex();
    const p = { x: 0, y: 0, z: 0 }, mono = [], metro = [];
    if (w.monorail && window.XTransit && XTransit.lib) w.monorail.stops.forEach((st) => { XTransit.lib.pAt(w.monorail.A, st.sC, p); mono.push({ x: p.x, z: p.z, t: "🚝 " + st.no + " " + st.name + "駅", bg: "#1a5ab8" }); });
    if (window.XMetro) XMetro.kiosks.forEach((k) => { const S = XMetro.stations[k.si]; if (S) metro.push({ x: k.x, z: k.z, t: "🚇 " + S.no + " " + S.name + "駅", bg: "#c81a6a" }); });
    const UI = window.XParkUI || {}, JP = UI.AJP || {}, IC = UI.AICON || {};
    const lands = LANDS.map((id) => XP.A[id]).filter(Boolean).map((a) => ({ x: a.cx, z: a.cz, t: (IC[a.id] || "📍") + " " + (JP[a.id] || a.name), bg: a.c || "#2a3a6a", id: a.id }));
    const near = (L, x, z, skip) => { let b = null, bd = 1e9; L.forEach((q) => { if (skip && skip(q)) return; const d = Math.hypot(q.x - x, q.z - z); if (d < bd) { bd = d; b = q; } }); return b ? { q: b, d: bd } : null; };
    const dist = (d) => d < 1000 ? Math.round(d / 10) * 10 + "m" : (d / 1000).toFixed(1) + "km";
    let n = 0;
    J.forEach((j) => {
      /* 交差点の「角」（つながる道のあいだのいちばん広いすき間）に立てる */
      const angs = []; w.roads.forEach((r) => { if (r[4] < 4) return; for (const t of [0, 0.5, 1]) { const x = r[0] + (r[2] - r[0]) * t, z = r[1] + (r[3] - r[1]) * t, d = Math.hypot(x - j.x, z - j.z); if (d > j.r + 1 && d < j.r + 14) angs.push(Math.atan2(z - j.z, x - j.x)); } });
      if (!angs.length) return; angs.sort((a, b) => a - b); let ga = 0, gm = -1; for (let i = 0; i < angs.length; i++) { const a0 = angs[i], a1 = i + 1 < angs.length ? angs[i + 1] : angs[0] + Math.PI * 2; if (a1 - a0 > gm) { gm = a1 - a0; ga = (a0 + a1) / 2; } }
      if (gm < 0.6) return;
      const px = j.x + Math.cos(ga) * (j.r - 1.2), pz = j.z + Math.sin(ga) * (j.r - 1.2);
      if (I.bld(px, pz, 1) || I.col(px, pz, 0.6)) return;
      const ar = w.areaName ? w.areaName(px, pz) : null;
      const boards = [near(mono, px, pz), near(metro, px, pz), near(lands, px, pz, (q) => (ar && q.id === ar.id) || Math.hypot(q.x - px, q.z - pz) < 120)].filter(Boolean).filter((b) => b.d > 30 && b.d < 2400);
      if (!boards.length) return;
      w.detail(() => { w.geo("darkMetal", new T.CylinderGeometry(0.09, 0.11, 3.3, 8), px, 1.65, pz); w.geo("gold", new T.SphereGeometry(0.15, 8, 6), px, 3.36, pz); });
      w.colCircle(px, pz, 0.25);
      boards.forEach((b, i) => {
        const bx = b.q.x - px, bz = b.q.z - pz, br = Math.atan2(bx, bz), ry = br - Math.PI / 2, ux = Math.sin(br), uz = Math.cos(br), y = 3.0 - i * 0.56, Lb = 2.9;
        const cx = px + ux * (Lb / 2 + 0.12), cz = pz + uz * (Lb / 2 + 0.12);
        w.geo("white2", new T.BoxGeometry(Lb, 0.46, 0.06), cx, y, cz, ry);
        w.geo("white2", new T.ConeGeometry(0.26, 0.36, 3).rotateZ(-Math.PI / 2).scale(1, 1, 0.25), cx + ux * (Lb / 2 + 0.17), y, cz + uz * (Lb / 2 + 0.17), ry);
        const st = { bg: b.q.bg, color: "#fff", px: 512 };
        const nx = Math.cos(ry), nz = -Math.sin(ry), fx2 = Math.sin(ry), fz2 = Math.cos(ry);
        w.sign(b.q.t + "  " + dist(b.d) + " ▶", st, Lb - 0.08, 0.4, cx + fx2 * 0.035, y, cz + fz2 * 0.035, ry);
        w.sign("◀ " + b.q.t + "  " + dist(b.d), st, Lb - 0.08, 0.4, cx - fx2 * 0.035, y, cz - fz2 * 0.035, ry + Math.PI);
        void nx; void nz;
      });
      n++;
    });
    w._signposts = n;
  };

  /* ══════════════════════════════════════════════════════════════
     ★★ 2026-10-02 ご指定「MagiBurst や MagiBocciaRush のエリアは実際に 3D 環境でゲームができたり、
       ゲームについての展示やフェスのような形にして、建物のサイズを大きくし密度もより高めてください」
     ・どちらも：大きなお店をぎっしり（空いている所だけ・ほかの建物ができてから）・展示の館・フェス（屋台・旗・ステージ・人）
     ・MAGIBURST：ボスコロシアムで 3D ボスバトル（games_burst.js）・英雄の丘（キャラの大きな立て板）
     ・MAGI BOCCIA RUSH：コートはラッシュルール（games.js）・名誉の殿堂・応援席とステージ
     ══════════════════════════════════════════════════════════════ */
  const HEROES = ["Roselia", "Shizuka", "Nemu", "Yuria", "Altia", "Liana", "Yaju", "Kureha", "Akatsuki", "Hikaru", "Amane", "Asahi", "Ayane", "Azusa", "Chiha", "Emika", "Himeri", "Honoka", "Kana", "Kokoha", "Kuon", "Maki", "Mei", "Mikoto", "Miya", "Natsune", "Shiho", "Uta", "Aira", "Shion", "Viola"];
  const BOSSES = ["Hecatia", "Dominus", "Eclipse", "Inferna", "Oblivion", "Umbra", "Astraea", "Dominia"];
  /* 空いているか（四角・向きつき）：建物・当たり・道・水の上には置かない */
  function freeRect(w, I, cx, cz, bw, bd, ry, gap) {
    const c = Math.cos(ry), s = Math.sin(ry);
    for (let u = -bw / 2 - gap; u <= bw / 2 + gap + 0.01; u += 2) for (let v = -bd / 2 - gap; v <= bd / 2 + gap + 0.01; v += 2) {
      const x = cx + u * c + v * s, z = cz - u * s + v * c;
      if (!w.insideIsland(x, z, 6) || I.water(x, z) || I.bld(x, z, 1.2) || I.road(x, z, 0.5) || I.col(x, z, 0.4)) return false;
    }
    return true;
  }
  /* キャラの大きな立て板（木の枠・両面の絵・名前の板・台） */
  function standee(w, x, z, name, s, ry) {
    const key = texMat(w, "chF_" + name, "../img/" + name + ".webp");
    w.box(has(w, "fStone", "stoneW"), x, 0, z, 5.0 * s, 0.6, 1.0, { ry, collide: true });
    [-1, 1].forEach((k) => { const c = Math.cos(ry), sn = Math.sin(ry); w.geo(has(w, "fWood", "woodDark"), new T.BoxGeometry(0.22, 5.2 * s, 0.22), x + c * k * 2.35 * s, 0.6 + 2.6 * s, z - sn * k * 2.35 * s); });
    w.geo(has(w, "fWood", "woodDark"), new T.BoxGeometry(4.95 * s, 0.24, 0.24), x, 0.6 + 5.1 * s, z, ry);
    w.geo(has(w, "fGold", "gold"), new T.BoxGeometry(4.6 * s, 4.6 * s, 0.12), x, 0.6 + 2.75 * s, z, ry);
    imgPlane(w, key, 4.4 * s, 4.4 * s, x + Math.sin(ry) * 0.07, 0.6 + 2.75 * s, z + Math.cos(ry) * 0.07, ry);
    imgPlane(w, key, 4.4 * s, 4.4 * s, x - Math.sin(ry) * 0.07, 0.6 + 2.75 * s, z - Math.cos(ry) * 0.07, ry + Math.PI);
    w.sign(name, { bg: "#5a3a22", px: 256, both: true }, 2.6 * s, 0.5 * s, x + Math.sin(ry) * 0.55, 0.35 + 0.3, z + Math.cos(ry) * 0.55, ry);
    w.caster(x, z, 4.8 * s, 0.6, 5.8 * s, ry);
  }
  /* フェスの屋台の輪・旗・人 */
  function festRing(w, I, cx, cz, r, n, names) {
    let k = 0;
    for (let i = 0; i < n; i++) {
      const a = (i + 0.5) / n * TAU, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r, ry = Math.atan2(cx - x, cz - z);
      if (!freeRect(w, I, x, z, 4.4, 2.8, ry, 0.6)) continue;
      w.yatai(x, z, ry, names[k % names.length], null, ["sword", "potion", "shield", "chest", "crown", "hat"][k % 6]); k++;
    }
    for (let i = 0; i < 6; i++) { const a0 = i / 6 * TAU, a1 = (i + 3) / 6 * TAU; w.lanternString(cx + Math.cos(a0) * (r - 4), cz + Math.sin(a0) * (r - 4), cx + Math.cos(a1) * (r - 4), cz + Math.sin(a1) * (r - 4), 6.4, 20, i); }
    if (w.plazaCrowd) w.plazaCrowd(cx, cz, r * 0.7, 1.6);
    return k;
  }
  /* フェスのステージ（木の舞台・幕・大きな旗・照明） */
  function festStage(w, x, z, ry, title, sub, art) {
    const c = Math.cos(ry), s = Math.sin(ry), L = (a, b) => [x + a * c + b * s, z - a * s + b * c];
    w.box(has(w, "fWood", "woodDark"), x, 0, z, 16, 1.3, 9, { ry, collide: true });
    const [bx, bz] = L(0, -4.2); w.box(has(w, "fStoneDark", "darkMetal"), bx, 1.3, bz, 16, 7, 0.6, { ry });
    if (art) { const [ax, az] = L(0, -3.85); imgPlane(w, art, 10, 5.6, ax, 4.9, az, ry); }
    [-1, 1].forEach((k) => { const [px, pz] = L(k * 7.6, -3.6); w.geo(has(w, "F_R", "pRed"), new T.PlaneGeometry(2.2, 7), px, 4.8, pz, ry); const [tx, tz] = L(k * 8.6, 0); w.geo(has(w, "fIron", "darkMetal"), new T.CylinderGeometry(0.12, 0.14, 9, 8), tx, 4.5, tz); w.geo("lampY", new T.SphereGeometry(0.35, 10, 8), tx, 9, tz); });
    const [sx, sz] = L(0, -3.8); w.sign(title, { bg: "#7a1a2a", px: 1024 }, 12, 1.4, sx, 9.6, sz, ry);
    if (sub) { const [ux, uz] = L(0, 4.6); w.sign(sub, { bg: "#5a3a22", px: 512 }, 7, 0.6, ux, 0.9, uz, ry); }
    w.caster(x, z, 16, 9, 9, ry);
    if (w.plazaCrowd) w.plazaCrowd(...L(0, 12), 9, 1.8);
  }
  /* 大きなお店を道ぞいに（空いている所だけ） */
  function bigShops(w, I, lots, defs, o) {
    let n = 0;
    lots.forEach(([x, z, ry], i) => {
      const bw = o.bw + (i % 3) * 2, bd = o.bd, h = o.h + (i % 4) * 2;
      if (!freeRect(w, I, x, z, bw, bd, ry, 1.0)) return;
      const d = defs[n % defs.length];
      const opt = { ry, sign: d[0], inside: d[1] === "food" ? { type: "food", name: d[0], menu: d[4] || d[2] } : { type: "shop", name: d[0], items: d[5] || d[2] } };
      if (w.fantasyHouse) w.fantasyHouse(x, z, bw, bd, h, Object.assign(opt, { key: o.keys ? o.keys[n % o.keys.length] : undefined, roofKey: o.roofs ? o.roofs[n % o.roofs.length] : undefined }));
      else w.yomaShop(x, z, bw, bd, h, Object.assign(opt, { key: "yCream", shop: "shopA", roof: "kawara", roofKey: "kwP", rh: 3 }));
      n++;
    });
    return n;
  }

  P.mbLandExtra = function () {
    const w = this, AX = MB.ax, I = w.spotIndex(), rep = { shops: 0, stalls: 0 };
    /* ── ボスコロシアムの中：3D ボスバトルの闘技場（像の東がわ） ── */
    { const cx = -1086, cz = 50, fx = cx + 21, fz = cz;
      w.geo(has(w, "neonPurple", "neonPink"), new T.TorusGeometry(1, 0.012, 6, 96).scale(12.5, 10, 30).rotateX(Math.PI / 2), fx, 0.1, fz);
      w.geo(has(w, "neonPurple", "neonPink"), new T.TorusGeometry(1, 0.008, 6, 96).scale(11.6, 8.6, 30).rotateX(Math.PI / 2), fx, 0.1, fz);
      w.sign("3D BOSS BATTLE  ボスバトル", { bg: "#3a1050", px: 1024, both: true }, 10, 1.2, fx, 3.2, fz + 12.4, 0);
      w.geo(has(w, "fIron", "darkMetal"), new T.CylinderGeometry(0.1, 0.1, 3, 6), fx - 4.6, 1.5, fz + 12.4); w.geo(has(w, "fIron", "darkMetal"), new T.CylinderGeometry(0.1, 0.1, 3, 6), fx + 4.6, 1.5, fz + 12.4);
      w.interact(fx, fz + 14.5, 4.2, "MAGIBURST 3D ボスバトル（ここで遊べる・引っぱって放つ）", () => { w.burstArena = { cx: fx, cz: fz, rx: 12.5, rz: 10 }; return { game: "burst" }; }, "⚔️");
      w.interact(-900 - 8, -160 + 8, 4, "3D ボスバトルはボスコロシアムの中で遊べます（西へ）", () => ({ lobby: { text: "ボスコロシアム（この土地の西）の中の円い闘技場で、MagiBurst の 3D ボスバトルが遊べます。仲間 3 人を引っぱって放ち、ボスをたおそう！", tips: "向き＝A/D・ためて離す＝E" } }), "⚔️");
    }
    /* ── MagiBurst ミュージアム（展示の館）：キャラクター・ボス・世界の展示（本物の絵） ── */
    { const x = -1096, z = -86, bw = 52, bd = 30;
      if (freeRect(w, I, x, z, bw, bd, 0, 1)) {
        const list = [["MagiBurst の世界", "仲間を引っぱって放ち、はね返って敵に当てる「引っぱりハンティング」。仲間の力をためて一気に放つ FULL BURST が決め手。", "../thumbs/MagiBurst.jpg"]]
          .concat(HEROES.slice(0, 16).map((n) => [n, "MagiBurst の仲間「" + n + "」。新しい仲間は XEVA GACHA PALACE（北東の外がわ）で召喚できる。", "../img/" + n + ".webp"]))
          .concat(BOSSES.map((n) => [n, "MagiBurst の強敵「" + n + "」。ボスコロシアムの 3D ボスバトルでも戦える。", "../MagiBurst/img/e_" + n + ".webp"]));
        const room = w.enterable(x, z, bw, bd, 9, 0, { type: "gallery", name: "MagiBurst ミュージアム", key: has(w, "fStone", "white2"), inner: has(w, "creamW", "offWhite"), floor: has(w, "marble", "plazaGray"), door: 8, doorH: 6, list });
        w.box(has(w, "fStone", "white2"), x, 9, z, bw + 0.4, 7, bd + 0.4, { uv: 6 }); w.caster(x, z, bw, bd, 16);
        if (w.fantasyRoof) w.fantasyRoof(x, z, bw, bd, 16, 0, "kwP", { chimney: false, rh: 9, wall: has(w, "fStone", "white2") });
        w.sign("MagiBurst ミュージアム  MUSEUM", { bg: "#3a1050", px: 1024 }, 18, 1.8, x, 11.5, z + bd / 2 + 0.3, 0);
        /* 中の壁にキャラの大きな絵 */
        if (room && room.L) { const n = 8; for (let i = 0; i < n; i++) { const a = -room.iw / 2 + 3 + i * (room.iw - 6) / (n - 1), [px, pz] = room.L(a, -room.id / 2 + 0.3), key = texMat(w, "chF_" + HEROES[i], "../img/" + HEROES[i] + ".webp"); w.geo(has(w, "fGold", "gold"), new T.BoxGeometry(4.3, 4.3, 0.1), px, 4.2, pz - 0.0, 0); imgPlane(w, key, 4, 4, px, 4.2, pz + 0.07, 0); } }
        [-1, 1].forEach((k) => w.turret(x + k * (bw / 2 + 2), z + bd / 2 - 2, 3, 20, has(w, "fStone", "white2"), "kwP", false));
      }
    }
    /* ── 英雄の丘：キャラの大きな立て板（円く並ぶ）・まん中に剣の碑 ── */
    { const cx = -932, cz = -86, R = 17;
      if (freeRect(w, I, cx, cz, 30, 30, 0, 0)) {
        w.disk(cx, cz, R + 5, "walkCream", 0.03); w.disk(cx, cz, R + 5.7, "stoneW", 0.028, R + 5);
        HEROES.slice(10, 22).forEach((n, i) => { const a = i / 12 * TAU, x = cx + Math.cos(a) * R, z = cz + Math.sin(a) * R; standee(w, x, z, n, 0.9, Math.atan2(cx - x, cz - z)); });
        w.geo(has(w, "fStone", "stoneW"), new T.CylinderGeometry(2.4, 2.8, 1.4, 16), cx, 0.7, cz); w.colCircle(cx, cz, 2.9);
        w.giantProp("sword", cx, 1.4, cz, 1.3, 0.4);
        w.sign("英雄の丘  HEROES' HILL", { bg: "#3a1050", px: 1024, both: true }, 8, 1.0, cx, 0.9, cz + 3.05, 0);
        w.interact(cx, cz + 5, 4, "英雄の丘の展示を見る（MagiBurst の仲間たち）", () => ({ gallery: { name: "英雄の丘", list: HEROES.slice(10, 22).map((n) => [n, "MagiBurst の仲間「" + n + "」。", "../img/" + n + ".webp"]) } }), "🖼️");
        if (w.plazaCrowd) w.plazaCrowd(cx, cz, 12, 1.2);
      }
    }
    /* ── MAGIBURST フェス（バーストゲート広場のまわり）：屋台の輪・旗・ステージ ── */
    { const px = AX, pz = -160;
      rep.stalls += festRing(w, I, px, pz, 40, 14, ["ポーション", "勇者のパン", "竜の串焼き", "魔法の飴", "宝石クッキー", "冒険者のスープ", "星の果実", "妖精のジュース"]);
      const sx = px + 2, sz = pz - 58; if (freeRect(w, I, sx, sz, 18, 14, 0, 1)) festStage(w, sx, sz, 0, "MAGIBURST FES  STAGE", "毎日 ライブとショー", texMat(w, "mbCastleArt", "../MagiBurst/img/bn_castle_s.webp"));
      w.sign("MAGIBURST FES 開催中！", { bg: "#7a1a2a", px: 1024, both: true }, 12, 1.4, px, 9.5, pz + 36, 0);
    }
    /* ── 大きなお店を大通りの両がわ・東西の通りぞいに（ぎっしり） ── */
    { const defs = w._mbShopDefs || [["MagiBurst SHOP", "shop", null, null, null, [["グッズ", 1200, "公式"]]]], lots = [];
      for (let z = -292; z <= 412; z += 25) { if (Math.abs(z + 160) < 50 || Math.abs(z + 40) < 18 || Math.abs(z - 150) < 18 || Math.abs(z - 300) < 18) continue; lots.push([AX + 25, z, -Math.PI / 2], [AX - 25, z, Math.PI / 2]); }
      [-40, 150, 300].forEach((zs) => { for (let x = -1120; x <= -900; x += 26) { if (Math.abs(x - AX) < 34) continue; lots.push([x, zs - 19, 0], [x, zs + 19, Math.PI]); } });
      rep.shops += bigShops(w, I, lots, defs, { bw: 20, bd: 14, h: 11, keys: ["yPurple", "yCream", "yBlue", "yPink", "yYellow"], roofs: ["kwP", "kwB", "kwR", "kwP", "kwT"] });
    }
    w._mbExtra = rep;
  };

  P.mbrLandExtra = function () {
    const w = this, cx = BR.cx, cz = BR.cz, I = w.spotIndex(), rep = { shops: 0, stalls: 0 };
    /* ── 名誉の殿堂（展示の館）：ボッチャラッシュの歴史・ルール・チャンピオン ── */
    { const x = 512, z = 1236, bw = 46, bd = 28;
      if (freeRect(w, I, x, z, bw, bd, 0, 1)) {
        const list = [["MAGI BOCCIA RUSH", "ジャックボール（白）に、自分の玉をいちばん近づけたチームの勝ち。キャラクターの能力で玉が変わる。", "../thumbs/MagiBocciaRush.jpg"],
          ["RUSH SHOT", "このランドのコートでは 3 投ごとに光る玉＝ RUSH SHOT。ほかの玉を強くはじく。"], ["ADDITIONAL MATCH", "同点なら延長戦。ジャックはコートのまん中の × に置かれる。"],
          ["ペルソナのような演出", "試合の開始・ターン・勝ち負けを、赤と黒の大きな文字で。"]].concat(HEROES.slice(4, 14).map((n) => [n, "MAGI BOCCIA RUSH でも活躍する「" + n + "」。", "../img/" + n + ".webp"]));
        w.enterable(x, z, bw, bd, 9, Math.PI, { type: "gallery", name: "ボッチャラッシュ名誉の殿堂", key: has(w, "fStoneDark", "pBlack"), inner: has(w, "creamW", "offWhite"), floor: has(w, "marble", "plazaGray"), door: 8, doorH: 6, list });
        w.box(has(w, "fStoneDark", "pBlack"), x, 9, z, bw + 0.4, 6, bd + 0.4, { uv: 6 }); w.caster(x, z, bw, bd, 15);
        if (w.fantasyRoof) w.fantasyRoof(x, z, bw, bd, 15, Math.PI, "kwR", { chimney: false, rh: 8, wall: has(w, "fStoneDark", "pBlack") });
        w.sign("名誉の殿堂  HALL OF FAME", { bg: "#7a0a1e", px: 1024 }, 16, 1.7, x, 10.8, z - bd / 2 - 0.3, Math.PI);
        w.giantProp("crown", x, 15 + 8 * 0.9, z, 1.8, 0);
      }
    }
    /* ── 金の大トロフィー（ラッシュ広場の東） ── */
    { const tx = cx + 52, tz = 992;
      if (freeRect(w, I, tx, tz, 12, 12, 0, 0)) {
        w.geo(has(w, "fStoneDark", "pBlack"), new T.CylinderGeometry(4, 4.6, 2, 18), tx, 1, tz); w.colCircle(tx, tz, 4.7);
        const gk = has(w, "fGold", "gold"), prof = [new T.Vector2(0, 0), new T.Vector2(2.2, 0), new T.Vector2(1.4, 0.6), new T.Vector2(0.6, 1.4), new T.Vector2(0.5, 3.6), new T.Vector2(1.0, 4.4), new T.Vector2(3.0, 6.6), new T.Vector2(3.4, 9.4), new T.Vector2(3.2, 9.6), new T.Vector2(0, 9.6)];
        w.geo(gk, new T.LatheGeometry(prof, 28), tx, 2, tz); [-1, 1].forEach((k) => w.geo(gk, new T.TorusGeometry(1.5, 0.28, 8, 20, Math.PI * 1.3).rotateZ(k > 0 ? -1.2 : Math.PI + 1.2), tx + k * 3.5, 9, tz));
        w.sign("RUSH CHAMPIONSHIP", { bg: "#7a0a1e", px: 512, both: true }, 7, 0.8, tx, 1.2, tz + 4.7, 0);
      }
    }
    /* ── ラッシュフェス（北の広場のまわり）：屋台の輪・応援の旗・DJ ステージ ── */
    { const px = cx, pz = 990;
      rep.stalls += festRing(w, I, px, pz, 38, 12, ["ラッシュバーガー", "ジャックボールの飴", "赤い月のかき氷", "勝利のからあげ", "TEAM BLUE ソーダ", "応援ポップコーン"]);
      const sx = cx - 64, sz = 1000; if (freeRect(w, I, sx, sz, 18, 14, Math.PI / 2, 1)) festStage(w, sx, sz, Math.PI / 2, "RUSH FES  DJ STAGE", "毎晩 ライトショー", texMat(w, "mbrArt", "../MagiBocciaRush/img/mbrhome_s.webp"));
      w.sign("MAGI BOCCIA RUSH FES 開催中！", { bg: "#7a0a1e", px: 1024, both: true }, 12, 1.4, px, 9.5, pz + 34, 0);
    }
    /* ── 応援席（アリーナの外・北の両がわ）── */
    [-1, 1].forEach((k) => { const bx = cx + k * 46, bz = cz - 82; if (!freeRect(w, I, bx, bz, 24, 10, 0, 0.5)) return; for (let r = 0; r < 4; r++) w.box(r % 2 ? has(w, "seatsRed", "pRed") : has(w, "fStoneDark", "pBlack"), bx, r * 0.7, bz - r * 1.4, 24, 0.7, 1.4, { collide: r === 0 }); w.sign(k > 0 ? "TEAM RED 応援席" : "TEAM BLUE 応援席", { bg: k > 0 ? "#7a0a1e" : "#1a2a6a", px: 512 }, 8, 0.8, bx, 3.6, bz - 6.2, 0); if (w.plazaCrowd) w.plazaCrowd(bx, bz - 3, 9, 1.4); });
    /* ── 大きなお店（ラッシュ通りのうしろの列・まわりの通り） ── */
    { const defs = [["RUSH GEAR", "shop", [["ユニフォーム", 6800, "チームの色"], ["ボール", 4800, "大会と同じ"], ["タオル", 1800, "応援に"], ["キャップ", 2600, "赤い月"]]], ["ジャック食堂", "food", "diner"], ["紅い月の酒場", "food", "bar"], ["TEAM BLUE STORE", "shop", [["青のユニフォーム", 6800, "TEAM BLUE"], ["うちわ", 600, "応援"], ["メガホン", 900, "声をとどけろ"], ["リストバンド", 800, "青く光る"]]], ["勝利のパン屋", "food", "cafe"], ["トロフィー工房", "shop", [["ミニトロフィー", 1500, "金色"], ["メダル", 900, "チャンピオン"], ["盾", 2400, "名前入り"], ["写真立て", 1200, "勝利の1枚"]]]], lots = [];
      for (let x = 488; x <= 590; x += 28) { lots.push([x, cz - 50, 0], [x, cz + 50, Math.PI]); }
      for (let z = 1000; z <= 1270; z += 28) { lots.push([470, z, Math.PI / 2], [900, z, -Math.PI / 2]); }
      rep.shops += bigShops(w, I, lots, defs, { bw: 20, bd: 14, h: 12, keys: ["yRed", "yCream", "yBlue", "yBrown"], roofs: ["kwR", "kwK", "kwB", "kwR"] });
    }
    w._mbrExtra = rep;
  };
})();
