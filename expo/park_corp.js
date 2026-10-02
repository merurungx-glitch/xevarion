/* ══════════════════════════════════════════════════════════════════
   XEVARION PARK — 企業のエリア（★★ 2026-09-30c ご指定）
   「NGX本社まわりをより広大で大きい建物として再構築し、ロビーを含む内装も作ってください」
   「新たにPARKを拡張して MagicalFuture や ISHIDAProduction などの企業エリアを作成」
   ------------------------------------------------------------------
   28 NGX GLOBAL HQ（HALL のうしろ・パークの軸の上）… 前庭（旗・鏡の池・NGX の噴水）→ 歩いて入れるグランドロビー
      （受付・金のロゴの壁・エレベーター4基・ラウンジ・アプリのギャラリー・大画面）→ 390m の NGX タワー
      （基壇の屋上から外がわのガラスの展望エレベーターで 310m の展望フロアへ）・研究タワー・クリエイティブタワー・
      会議ホール・NGX ストア／カフェ・データセンター・和館・空に浮かぶ島と飛行船
   38 MAGICAL FUTURE CAMPUS … park_corp.js の後半
   39 ISHIDA PRODUCTION STUDIOS … park_corp.js の後半
   ・ロゴはご提供の画像（NGX は透明の webp、Magical Future / ISHIDA Production は白い背景を抜いて使う）。
   ══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const T = THREE, X = XTex, P = XWorld.World.prototype, TAU = Math.PI * 2, XP = XPark, MOBILE = XP.MOBILE;
  const APP = (id) => ((window.EXPO_DATA && EXPO_DATA.apps) || []).find((a) => a.id === id);
  const texMat = (w, key, src, o) => { if (!w.m[key]) { const m = new T.MeshBasicMaterial(Object.assign({ map: X.imgTex(src), transparent: true, toneMapped: false, side: T.DoubleSide, depthWrite: false }, o || {})); w.m[key] = m; w.nightMats.push({ m, base: new T.Color(1, 1, 1), day: 1, night: 1.35 }); } return key; };
  /* 白い背景のロゴ画像 → 背景を抜いた絵（crop＝[x, y, w, h]・もとの画像の画素） */
  function keyedLogo(w, key, src, crop, o) {
    if (w.m[key]) return key;
    const cw = crop ? crop[2] : 1024, ch = crop ? crop[3] : 683, c = X.cv(cw, ch), tex = X.tex(c);
    const im = new Image(); im.onload = () => {
      const g = c.getContext("2d"); g.clearRect(0, 0, cw, ch);
      if (crop) g.drawImage(im, crop[0], crop[1], crop[2], crop[3], 0, 0, cw, ch); else g.drawImage(im, 0, 0, cw, ch);
      const d = g.getImageData(0, 0, cw, ch), a = d.data;
      for (let i = 0; i < a.length; i += 4) {
        const r = a[i], gg = a[i + 1], b = a[i + 2], wmin = Math.min(r, gg, b), al = Math.max(0, Math.min(1, (250 - wmin) / 58));
        if (al <= 0.001) { a[i + 3] = 0; continue; }
        a[i] = Math.max(0, Math.min(255, (r - 255 * (1 - al)) / al)); a[i + 1] = Math.max(0, Math.min(255, (gg - 255 * (1 - al)) / al)); a[i + 2] = Math.max(0, Math.min(255, (b - 255 * (1 - al)) / al)); a[i + 3] = Math.round(al * 255);
      }
      g.putImageData(d, 0, 0); tex.needsUpdate = true;
    };
    im.src = src;
    const m = new T.MeshBasicMaterial(Object.assign({ map: tex, transparent: true, toneMapped: false, side: T.DoubleSide, depthWrite: false }, o || {}));
    w.m[key] = m; w.nightMats.push({ m, base: new T.Color(1, 1, 1), day: 1, night: 1.3 });
    return key;
  }
  P.keyedLogo = keyedLogo;
  /* 部屋の中の観葉植物（木の仕組みは部屋の中の木を取りのぞくので、形で置く） */
  function indoorPlant(w, x, z, s) {
    s = s || 1; w.detail(() => { w.geo("woodDark2", new T.CylinderGeometry(0.45 * s, 0.35 * s, 0.7 * s, 10), x, 0.35 * s, z); w.geo("leafDark", new T.IcosahedronGeometry(0.75 * s, 1).scale(1, 1.3, 1), x, 1.5 * s, z); w.geo("leafLight", new T.IcosahedronGeometry(0.5 * s, 1), x + 0.3 * s, 2.1 * s, z - 0.2 * s); });
    w.colCircle(x, z, 0.5 * s);
  }
  P.indoorPlant = function (x, z, s) { indoorPlant(this, x, z, s); };
  /* ソファ（すわれる）：x, z 中心・長さ L・向き ry（背もたれは ry の反対側） */
  function sofa(w, x, z, L, ry, key) {
    const c = Math.cos(ry), s = Math.sin(ry); key = key || "seatBlue";
    w.detail(() => { w.box(key, x, 0, z, L, 0.45, 0.95, { ry }); w.box(key, x - s * 0.42, 0.45, z - c * 0.42, L, 0.55, 0.22, { ry }); [-1, 1].forEach((k) => w.box(key, x + c * k * (L / 2 - 0.12), 0.45, z - s * k * (L / 2 - 0.12), 0.24, 0.3, 0.95, { ry })); });
    w.colObb(x, z, L, 0.95, ry);
    const n = Math.max(1, Math.round(L / 1.1)); for (let i = 0; i < n; i++) { const lx = (i + 0.5) / n * L - L / 2; w.seats.push({ x: x + lx * c + 0.08 * s, z: z - lx * s + 0.08 * c, yaw: ry, h: 0.47 }); }
  }
  P.sofa = function (x, z, L, ry, key) { sofa(this, x, z, L, ry, key); };
  /* 外がわのガラスの展望エレベーター（見えるシャフト・乗り場の扉）。lift＝{ x, z, ax, az, y0 } */
  P.liftShaft = function (lift, yTop, o) {
    const w = this; o = o || {};
    const x = lift.x, z = lift.z, y0 = Math.max(0, (lift.y0 || 0.2) - 0.3), h = yTop - y0 + 3.2, ry = Math.atan2(lift.ax, lift.az), c = Math.cos(ry), s = Math.sin(ry);
    w.geo("glassClear", new T.BoxGeometry(3.3, h, 3.3), x, y0 + h / 2, z, ry);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => w.geo(o.frame || "chromeB", new T.BoxGeometry(0.22, h, 0.22), x + c * a * 1.65 + s * b * 1.65, y0 + h / 2, z - s * a * 1.65 + c * b * 1.65, ry, "L"));
    for (let y = y0 + 4; y < y0 + h; y += 8) w.geo(o.band || "gold", new T.BoxGeometry(3.45, 0.18, 3.45), x, y, z, ry);
    w.geo(o.band || "gold", new T.BoxGeometry(3.7, 0.5, 3.7), x, y0 + h, z, ry); w.geo("neonCyan", new T.BoxGeometry(3.72, 0.1, 3.72), x, y0 + h - 0.35, z, ry);
    if (!o.noCol && y0 < 1) w.colObb(x, z, 3.4, 3.4, ry);
    const at = (lx, lz) => [x + c * lx + s * lz, z - s * lx + c * lz];          /* ローカル：x＝横・z＝外向き（ax, az） */
    /* ★★ 2026-09-30d 展望フロア・屋上への渡り廊下（シャフトの内がわ → 建物） */
    (o.bridges || []).forEach(([y, len]) => {
      const [bx, bz] = at(0, -1.65 - len / 2);
      w.box("white2", bx, y - 0.32, bz, 2.4, 0.32, len + 0.2, { ry }); w.box("neonCyan", bx, y - 0.36, bz, 2.44, 0.05, len + 0.2, { ry });
      [-1, 1].forEach((k) => { const [rx, rz] = at(k * 1.2, -1.65 - len / 2); w.box("glassClear", rx, y, rz, 0.05, 1.1, len, { ry }); w.box(o.band || "gold", rx, y + 1.1, rz, 0.08, 0.08, len, { ry }); });
    });
    /* 地上の入口（金の枠・ガラスの戸・ひさし・案内） */
    if (o.door && y0 < 1) {
      const [dx, dz] = at(0, 1.68);
      w.box(o.band || "gold", dx, 0, dz, 2.7, 2.9, 0.12, { ry }); w.box("glassClear", dx, 0.02, dz, 2.3, 2.6, 0.14, { ry }); w.box("chromeB", dx, 0.02, dz, 0.06, 2.6, 0.16, { ry });
      const [cx, cz] = at(0, 2.3); w.box("white2", cx, 3.0, cz, 3.8, 0.18, 1.5, { ry }); w.box("neonCyan", cx, 2.96, cz, 3.84, 0.05, 1.54, { ry });
      if (o.label) { const [sx, sz] = at(0, 3.08); w.sign(o.label, { bg: "#0a1450", color: "#fff", glow: "#7fd8ff", px: 512 }, 3.6, 0.42, sx, 3.45, sz, ry); }
    }
  };

  /* ══════════════ 28 NGX GLOBAL HQ ══════════════ */
  P.buildNGXHQ = function () {
    const w = this, A = XP.A.ngx, CX = 0, ZF = -176, TX = 0, TZ = -405;          /* ZF＝前の端（大通りのきわ） */
    w.areaZone("ngx");
    w.places.push(["28 NGX GLOBAL HQ（本社の前庭）", 0, -190, Math.PI]);
    const logo = texMat(w, "ngxLogo", "img/ngx_logo.webp"), mark = texMat(w, "ngxMark", "img/ngx_mark.webp");
    const lm = w._landmark; w._landmark = true;
    /* ── 前庭：金と紺の石だたみ・中央の参道（大理石）・鏡の池・旗・噴水 ── */
    w.rect("plaza", -140, -310, 140, -168, 0.012);
    /* 参道（大理石・幅 22m）：大通りから噴水まで・噴水からロビーまで（エリアの門はこの道の上） */
    const axis = { raw: true, y: 0.022, lamps: false, trees: false, benches: false, bushes: false, curb: false };
    w.route([[0, -166], [0, -250]], 22, "walkY", axis); w.route([[0, -290], [0, -309]], 22, "walkY", axis);
    [-1, 1].forEach((s) => { w.rect("stoneW", s * 11.6 - 0.6, -250, s * 11.6 + 0.6, -168, 0.03); w.rect("stoneW", s * 11.6 - 0.6, -309, s * 11.6 + 0.6, -290, 0.03); });
    [-1, 1].forEach((s) => {
      /* 鏡の池（細長い・噴き出す水） */
      const px = s * 30, pz = -238; w.pool(px, pz, 12, 84, 0, "fountain");
      const jets = []; for (let i = 0; i < 9; i++) { const m = new T.Mesh(new T.CylinderGeometry(0.08, 0.2, 1, 8), new T.MeshBasicMaterial({ color: 0xcff4ff, transparent: true, opacity: 0.6, depthWrite: false })); m.position.set(px, 0.5, pz - 36 + i * 9); w.scene.add(m); jets.push(m); }
      w.anim.push((dt, t) => jets.forEach((m, i) => { const h = 2.5 + 2 * Math.sin(t * 1.6 + i * 0.7 + s); m.scale.y = h; m.position.y = 0.3 + h / 2; }));
      /* 旗（NGX の金と紺）・金の街灯 */
      for (let i = 0; i < 8; i++) { const z = ZF - 12 - i * 14; w.flag(s * 16, z, i % 2 ? 0x0a1c5a : 0xe8b84a, 12); }
      /* 植えこみ（刈りこんだ生け垣と花） */
      w.hedge(s * 52, -206, 3, 28, 1.1); w.hedge(s * 52, -270, 3, 28, 1.1);          /* まん中（z −238）はあけて通れる */
      w.flowerBed(s * 64, -210, 14, 3, 0, 700 + s, XP.FLOWER_PAL[s > 0 ? 1 : 0]); w.flowerBed(s * 64, -266, 14, 3, 0, 710 + s, XP.FLOWER_PAL[s > 0 ? 3 : 4]);
      for (let i = 0; i < 4; i++) w.plant(i % 2 ? "sakura" : "oak", s * 76, ZF - 16 - i * 22, 1.15);
    });
    /* NGX の噴水（金のロゴの輪・青いオーブ）＝参道の先 */
    { const fx = 0, fz = -270; w.disk(fx, fz, 20, "marble", 0.03); w.disk(fx, fz, 20.8, "gold", 0.028, 20);
      const rim = new T.TorusGeometry(12, 0.6, 10, 72); rim.rotateX(Math.PI / 2); w.geo("stoneW", rim, fx, 0.6, fz); w.geo("stoneW", new T.CylinderGeometry(12, 12.3, 0.6, 72, 1, true), fx, 0.3, fz); w.colCircle(fx, fz, 12.8);
      w.water(new T.CircleGeometry(11.8, 72).rotateX(-Math.PI / 2), fx, 0.5, fz, "fountain");
      w.geo("stoneW", new T.CylinderGeometry(2.4, 3.2, 3.6, 16), fx, 1.8, fz); w.geo("gold", new T.TorusGeometry(3, 0.28, 8, 40).rotateX(Math.PI / 2), fx, 3.6, fz);
      const orbM = new T.MeshStandardMaterial({ color: 0x3a8aff, emissive: 0x2a6aff, emissiveIntensity: 0.9, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.92 }); w.nightMats.push({ m: orbM, day: 0.7, night: 1.8 });
      const orb = new T.Mesh(new T.SphereGeometry(3.4, 32, 20), orbM); orb.position.set(fx, 8, fz); w.scene.add(orb);
      const rings = [0, 1, 2].map((i) => { const r = new T.Mesh(new T.TorusGeometry(4.6 + i * 0.9, 0.12, 6, 64), w.m[i === 1 ? "gold" : "neonCyan"]); r.position.copy(orb.position); w.scene.add(r); return r; });
      const lg = new T.Mesh(new T.PlaneGeometry(8, 2.94), w.m[logo]); lg.position.set(fx, 14.2, fz); w.scene.add(lg);
      w.anim.push((dt, t) => { orb.position.y = 8 + Math.sin(t * 0.9) * 0.4; rings.forEach((r, i) => { r.position.y = orb.position.y; r.rotation.set(Math.PI / 2 + Math.sin(t * 0.6 + i) * 0.7, t * (0.4 + i * 0.2), Math.cos(t * 0.5 + i) * 0.5); }); lg.position.y = 14.2 + Math.sin(t * 0.7) * 0.3; lg.rotation.y = Math.sin(t * 0.25) * 0.5; });
      w.casterCircle(fx, fz, 12, 9); }
    /* ── NGX ストア（西）・NGX カフェ（東）：前庭に面した低い建物 ── */
    w.bld(-104, -210, 56, 26, 9, { key: "gGold", shop: "shopC", roof: "flat", roofKey: "rMetalW", ry: Math.PI / 2, crown: "neonYellow", sign: { text: "NGX STORE", bg: "#0a1450", color: "#ffe7a0", w: 20, h: 2.2, y: 6.6, glow: "#ffd86a" }, inside: { type: "shop", name: "NGX STORE（公式グッズ）", h: 5.5, door: 5 } });
    w.bld(104, -210, 56, 26, 9, { key: "gGold", shop: "shopD", roof: "flat", roofKey: "rMetalW", ry: -Math.PI / 2, crown: "neonCyan", sign: { text: "NGX CAFÉ", bg: "#0a1450", color: "#fff", w: 18, h: 2.2, y: 6.6, glow: "#7fd8ff" }, inside: { type: "cafe", name: "NGX CAFÉ", h: 5.5, door: 5, menu: "coffee" } });
    for (let i = 0; i < 6; i++) w.cafeTable(84 - (i % 2) * 5, -196 - Math.floor(i / 2) * 9, ["fabricW", "fabricB", "fabricY"][i % 3]);
    /* ── 研究タワー（西）・クリエイティブタワー（東）：140m ── */
    w.skyscraper(-104, -290, 40, 40, 150, { key: "gBlue", steps: 3, taper: 0.82, podium: "gSilver", shop: "shopA", crown: "neonCyan", spire: 18 });
    w.skyscraper(104, -290, 40, 40, 140, { key: "gPurple", steps: 3, taper: 0.8, podium: "gSilver", shop: "shopC", crown: "neonPurple", heli: true });
    [[-104, "NGX RESEARCH TOWER"], [104, "NGX CREATIVE TOWER"]].forEach(([x, t]) => w.sign(t, { bg: "#0a1450", color: "#fff", glow: "#7fd8ff", border: "#ffd86a", px: 1024 }, 20, 1.6, x, 5.8, -290 + 24.12, 0));          /* 基壇（48m 角・高さ 7m）の正面 */
    [[-104, 0.82, 120], [104, 0.8, 110]].forEach(([x, tp, y]) => w.geo(logo, new T.PlaneGeometry(22, 8.1), x, y, -290 + 20 * tp + 0.3));          /* 2段目（幅 40×taper）の正面 */
    /* ── グランドロビー（歩いて入れる大きなガラスのホール） ── */
    const LB = { x0: -52, x1: 52, z0: -364, z1: -310, hi: 22 };
    grandLobby(w, LB, logo);
    /* ── NGX タワー（基壇＋段々に細い塔・金の柱・光の輪・展望フロア 310m） ── */
    const podR = 38, podH = 24;
    w.geo("gBlue", new T.CylinderGeometry(podR, podR, podH, 64), TX, podH / 2, TZ); w.colCircle(TX, TZ, podR + 0.2);
    for (let i = 0; i < 64; i++) { const a = i / 64 * TAU; w.box("gold", TX + Math.cos(a) * (podR + 0.1), 0, TZ + Math.sin(a) * (podR + 0.1), 0.35, podH, 0.5, { ry: -a + Math.PI / 2 }); }
    [8, 16].forEach((y) => { w.geo("white2", new T.CylinderGeometry(podR + 0.6, podR + 0.6, 0.9, 96, 1, true), TX, y, TZ); w.geo("neonCyan", new T.TorusGeometry(podR + 0.62, 0.1, 4, 96).rotateX(Math.PI / 2), TX, y - 0.3, TZ); });
    w.geo("white2", new T.CylinderGeometry(podR + 1.2, podR + 1.2, 1, 64), TX, podH + 0.5, TZ); w.geo("gold", new T.TorusGeometry(podR + 1.25, 0.3, 6, 96).rotateX(Math.PI / 2), TX, podH + 1, TZ);
    w.casterCircle(TX, TZ, podR, podH);
    const SEG = [[26, podH + 1, 120], [22, 120, 220], [18, 220, 310], [14, 310, 360], [10, 360, 390]];
    SEG.forEach(([r, y0, y1]) => {
      const h = y1 - y0; w.geo("gBlue", new T.CylinderGeometry(r, r, h, 48, 1, false), TX, y0 + h / 2, TZ);
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + 0.13; w.box("gold", TX + Math.cos(a) * (r + 0.12), y0, TZ + Math.sin(a) * (r + 0.12), 0.6, h, 0.7, { ry: -a + Math.PI / 2 }); }
      for (let y = y0 + 6; y < y1 - 1; y += 12) w.geo("chromeB", new T.TorusGeometry(r + 0.2, 0.22, 4, 64).rotateX(Math.PI / 2), TX, y, TZ);
      w.geo("white2", new T.CylinderGeometry(r + 1.4, r + 1.4, 1.2, 48), TX, y1 - 0.6, TZ); w.geo("neonCyan", new T.TorusGeometry(r + 1.45, 0.14, 4, 64).rotateX(Math.PI / 2), TX, y1 - 0.6, TZ);
    });
    w.caster(TX, TZ, 52, 52, 390);
    /* 金の NGX ロゴ（南の正面・東西）・しるし */
    [[Math.PI / 2, 26.9, 84, 44], [0, 22.9, 170, 32], [Math.PI, 22.9, 170, 32]].forEach(([a, r, y, sw]) => w.geo(logo, new T.PlaneGeometry(sw, sw * 0.367).rotateY(-a + Math.PI / 2), TX + Math.cos(a) * r, y, TZ + Math.sin(a) * r));
    w.geo(mark, new T.PlaneGeometry(16, 12.3), TX, 336, TZ + 14.3);
    /* てっぺん：ガラスのとがり屋根・金の冠・光の針（455m） */
    w.geo("glassDome", new T.ConeGeometry(10, 30, 24), TX, 405, TZ); w.geo("gold", new T.TorusGeometry(10.2, 0.5, 6, 48).rotateX(Math.PI / 2), TX, 390.4, TZ);
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; w.geo("gold", new T.ConeGeometry(0.8, 6, 6), TX + Math.cos(a) * 9.6, 393, TZ + Math.sin(a) * 9.6); }
    w.geo("chromeB", new T.CylinderGeometry(0.35, 0.8, 34, 8), TX, 437, TZ); w.geo("neonCyan", new T.SphereGeometry(1.4, 12, 8), TX, 455, TZ);
    /* 展望フロア（310m） */
    w.geo("white2", new T.RingGeometry(14.2, 25.5, 64, 1).rotateX(-Math.PI / 2), TX, 310.75, TZ); w.geo("gold", new T.CylinderGeometry(25.6, 24.6, 1.4, 64, 1, true), TX, 310.05, TZ);
    w.geo("glassClear", new T.CylinderGeometry(25.4, 25.4, 1.3, 64, 1, true), TX, 311.45, TZ); w.geo("gold", new T.TorusGeometry(25.4, 0.1, 4, 96).rotateX(Math.PI / 2), TX, 312.1, TZ);
    /* 3つの光の輪 */
    { const hm = [new T.MeshStandardMaterial({ color: 0x9fd8ff, emissive: 0x3a8aff, emissiveIntensity: 1.0, metalness: 0.6, roughness: 0.2 }), w.m.gold, new T.MeshStandardMaterial({ color: 0xd8b8ff, emissive: 0x8a4aff, emissiveIntensity: 0.9, metalness: 0.6, roughness: 0.2 })];
      hm.forEach((m) => { if (m !== w.m.gold) w.nightMats.push({ m, day: 0.8, night: 2.0 }); });
      const halos = [[40, 1.2, 100, 0.18], [50, 1.0, 200, -0.12], [33, 1.0, 286, 0.3]].map(([r, tb, y, tilt], i) => { const g = new T.Mesh(new T.TorusGeometry(r, tb, 10, 128), hm[i]); g.position.set(TX, y, TZ); g.rotation.x = Math.PI / 2 + tilt; w.scene.add(g); w.loose(g, 2200); return { g, y, tilt, s: [0.05, -0.035, 0.07][i] }; });
      w.anim.push((dt, t) => halos.forEach((h, i) => { h.g.rotation.z = t * h.s; h.g.rotation.x = Math.PI / 2 + h.tilt + Math.sin(t * 0.2 + i) * 0.05; h.g.position.y = h.y + Math.sin(t * 0.4 + i * 2) * 1.2; })); }
    /* 基壇の屋上：展望エレベーターの乗り場（西）・屋上庭園 */
    w.geo("lawnPark", new T.CircleGeometry(podR - 1, 48).rotateX(-Math.PI / 2), TX, podH + 1.02, TZ);
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; w.geo("leafDark", new T.IcosahedronGeometry(1.4, 1), TX + Math.cos(a) * (podR - 4), podH + 2, TZ + Math.sin(a) * (podR - 4)); }
    const LIFT = { x: TX - 27.8, z: TZ, ax: -1, az: 0, y0: podH + 1.2, topF: 75 };
    w.liftShaft(LIFT, 311, { noCol: true, bridges: [[310.8, 1.6]] });
    w.box("goldOrn", LIFT.x + 1.8, podH + 1, LIFT.z, 0.3, 3.2, 3.6); w.sign("SKY ELEVATOR  展望エレベーター 310m", { bg: "#0a1450", color: "#fff", glow: "#7fd8ff", px: 1024 }, 6, 0.6, LIFT.x - 1.8, podH + 5.2, LIFT.z, -Math.PI / 2);
    /* 各階（エレベーター）：ロビーの中から */
    const apps = ((window.EXPO_DATA && EXPO_DATA.apps) || []).filter((a) => a.href && !/^[぀-ヿ]/.test(a.name)).map((a) => [a.name, (a.sub || "") + "　—　" + (a.full || a.name) + " の歩み（NGX のアプリ）"]);
    const NGXD = w.ngxTowerDef = { name: "NGX 本社タワー", x: TX, z: TZ, fx: 0, fz: LB.z1 + 4, fyaw: 0, lobby: { x: 0, z: -357, yaw: 0 },
      lift: LIFT,
      floors: [
        { label: "1F", name: "グランドロビー", here: true },
        { label: "2F", name: "NGX ギャラリア（ショップ）", type: "mall" },
        { label: "3F", name: "フードホール", type: "food", w: 26, d: 18, menu: "diner" },
        { label: "5F", name: "NGX ミュージアム（アプリの歴史）", type: "gallery", w: 26, d: 20, list: apps.length ? apps : null },
        { label: "12F", name: "開発フロア", type: "office" },
        { label: "18F", name: "デザインスタジオ", type: "studio" },
        { label: "25F", name: "研究ラボ", type: "lab" },
        { label: "33F", name: "配信・撮影スタジオ", type: "showroom" },
        { label: "40F", name: "データセンター", type: "server" },
        { label: "52F", name: "大会議室", type: "meeting", w: 20, d: 14 },
        { label: "60F", name: "役員フロア", type: "exec" },
        { label: "68F", name: "スカイラウンジ", type: "lounge" },
        { label: "75F", name: "展望フロア（310m）", deck: { x: TX, z: TZ, y: 310.8, rIn: 15, rOut: 24.6, exitR: 16.4, name: "NGX タワー 展望フロア（310m）" } }
      ] };
    lobbyLifts(w, LB, NGXD);
    /* ── 会議ホール（北西・まるい塔・巻きつく大画面） ── */
    { const cx = -108, cz = -430, r = 17, h = 58;
      w.geo("gPurple", new T.CylinderGeometry(r, r, h, 40), cx, h / 2, cz); w.colCircle(cx, cz, r + 0.2); w.casterCircle(cx, cz, r, h);
      for (let y = 8; y < h; y += 8) w.geo("chromeB", new T.TorusGeometry(r + 0.2, 0.2, 4, 48).rotateX(Math.PI / 2), cx, y, cz);
      w.geo("gold", new T.CylinderGeometry(r + 1, r + 1, 1.6, 40), cx, h, cz); w.geo("neonPink", new T.TorusGeometry(r + 1.05, 0.2, 4, 48).rotateX(Math.PI / 2), cx, h + 0.2, cz);
      const scr = new X.Screen(2048, 512), sm = new T.MeshBasicMaterial({ map: scr.tex, toneMapped: false }); w.nightMats.push({ m: sm, base: new T.Color(1, 1, 1), day: 1, night: 1.4 });
      const cyl = new T.Mesh(new T.CylinderGeometry(r + 0.5, r + 0.5, 22, 64, 1, true, Math.PI * 0.2, Math.PI * 1.6), sm); cyl.position.set(cx, 36, cz); w.scene.add(cyl); w.loose(cyl, 1500);
      w.screens.push({ scr, mesh: cyl, every: 0.08, last: -1, draw(g, W, H, t) {
        const gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, "#0a1450"); gr.addColorStop(0.5, "#2a1a7a"); gr.addColorStop(1, "#0a1450"); g.fillStyle = gr; g.fillRect(0, 0, W, H);
        const off = (t * 60) % W; g.fillStyle = "#fff"; g.font = "900 110px sans-serif"; g.textAlign = "left";
        for (let k = -1; k < 2; k++) g.fillText("つなぐ、すべてを。 広がる、未来を。", k * W + off, 180);
        g.fillStyle = "#ffd86a"; g.font = "900 150px sans-serif"; for (let k = -1; k < 2; k++) g.fillText("NGX", k * W + W * 0.62 + off, 400);
      } });
      w.enterable(cx + 24, cz + 6, 16, 12, 5.5, Math.PI / 2, { type: "theater", name: "NGX 会議ホール（上映）", key: "gPurple", video: "ngxhall", screenTitle: "NGX CONFERENCE" });
      w.sign("NGX CONFERENCE HALL  会議ホール", { bg: "#2a1a6a", color: "#fff", glow: "#d8b8ff", px: 1024 }, 16, 1.6, cx, 5.2, cz + r + 0.3, 0); }
    /* ── データセンター（北東・黒いガラス）・和館（朱の塔と NGX の大旗） ── */
    w.bld(108, -440, 58, 34, 16, { key: "gDark", roof: "flat", roofKey: "rMetal", crown: "neonCyan", sign: { text: "NGX DATA CENTER", bg: "#050a1a", w: 18, h: 1.8, y: 12, glow: "#4ff0ff" } });
    { const jx = 42, jz = -452; w.pagodaTower(jx, jz, 12, 4, { roofKey: "kwG" }); w.box("gold", jx + 8, 0, jz, 0.4, 28, 0.4); w.box("pNavy", jx + 8.3, 13, jz, 0.06, 12, 7); w.geo(logo, new T.PlaneGeometry(6.4, 2.4).rotateY(Math.PI / 2), jx + 8.36, 20, jz); w.colCircle(jx + 8, jz, 0.4); }
    w.bld(-40, -452, 34, 22, 10, { key: "yCream", roof: "hip", roofKey: "kwB", rh: 5, sign: { text: "NGX 茶寮", bg: "#1a1030", w: 10, h: 1.4, y: 6.4, glow: "#ffcf6a" }, inside: { type: "cafe", name: "NGX 茶寮（和カフェ）", h: 5, door: 4, menu: "dango" } });
    w.route([[-40, -438.5], [-40, -428], [-66, -428]], 5, "walkCream", { raw: true, lamps: false, trees: false, benches: false, bushes: false });          /* 茶寮の入口から西の道へ（石の小道） */    /* ── 空に浮かぶ島と飛行船（NGX のしるし） ── */
    { const isl = [[-90, -350, 96, 13], [95, -360, 118, 11], [0, -470, 84, 9]].map(([x, z, y, r], k) => {
        const g = w.captureGroup(() => { w.geo("rock", new T.DodecahedronGeometry(r, 1).scale(1, 0.55, 1).translate(0, -r * 0.2, 0)); w.geo("rockRed", new T.ConeGeometry(r * 0.8, r * 1.2, 7).rotateX(Math.PI).translate(0, -r * 0.8, 0)); w.geo("lawnPark", new T.CylinderGeometry(r * 0.92, r * 0.92, 0.6, 16).translate(0, r * 0.3, 0));
          for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + k; w.geo("trunk", new T.CylinderGeometry(0.4, 0.5, 4, 6).translate(Math.cos(a) * r * 0.45, r * 0.3 + 2, Math.sin(a) * r * 0.45)); w.geo("leafLight", new T.IcosahedronGeometry(2.4, 0).translate(Math.cos(a) * r * 0.45, r * 0.3 + 5, Math.sin(a) * r * 0.45)); }
          w.geo("woodRed", new T.BoxGeometry(3, 3, 3).translate(0, r * 0.3 + 1.5, 0)); w.geo("kwB", new T.ConeGeometry(2.8, 1.6, 4).rotateY(Math.PI / 4).translate(0, r * 0.3 + 3.8, 0)); });
        g.position.set(x, y, z); w.scene.add(g); w.loose(g, 2500); return { g, y, k }; });
      const ship = w.captureGroup(() => { w.geo("white2", new T.SphereGeometry(1, 20, 12).scale(5, 5, 16)); w.geo("pNavy", new T.BoxGeometry(3, 2, 6).translate(0, -5.6, 0)); [-1, 1].forEach((s) => w.geo("gold", new T.BoxGeometry(0.3, 4, 3).translate(s * 4.6, 0, -13))); w.geo("gold", new T.BoxGeometry(8, 0.3, 3).translate(0, 0, -13)); w.geo(logo, new T.PlaneGeometry(14, 5.2).rotateY(Math.PI / 2).translate(5.15, 1, 0)); w.geo(logo, new T.PlaneGeometry(14, 5.2).rotateY(-Math.PI / 2).translate(-5.15, 1, 0)); });
      w.scene.add(ship); w.loose(ship, 3000);
      w.anim.push((dt, t) => { isl.forEach((q) => { q.g.position.y = q.y + Math.sin(t * 0.3 + q.k * 2) * 2.5; q.g.rotation.y = t * 0.02 * (q.k % 2 ? 1 : -1); }); const a = t * 0.04; ship.position.set(TX + Math.cos(a) * 240, 160 + Math.sin(t * 0.3) * 4, TZ + Math.sin(a) * 240); ship.rotation.y = -a; }); }
    /* ── エリアの中の道：前庭から、ロビーとタワーの両わきを通って北の外まわりの道（z −490）へ ── */
    const inner = { raw: true, lamps: "yoma", lampEvery: 20, trees: false, benches: false, bushes: false };
    [-1, 1].forEach((s) => w.route([[s * 70, -302], [s * 70, -486]], 10, "walkCream", inner));
    w.areaGate(0, ZF - 4, 0, "ngx", "big");
    w.plazaCrowd(0, -240, 60, 1.3);
    w.forestOpen.push([0, -320, 180]);
    w._landmark = lm;
  };

  /* ── グランドロビー（NGX 本社・1階）：大理石の床・ガラスの正面・金のロゴの壁・受付・ラウンジ・アプリのギャラリー・大画面 ── */
  function grandLobby(w, LB, logo) {
    const { x0, x1, z0, z1, hi } = LB, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, t = 0.6, DW = 14, name = "NGX 本社 グランドロビー";
    /* 床・天井（光のパネル）・屋根 */
    { const g = new T.PlaneGeometry(x1 - x0 - t * 2, z1 - z0 - t * 2); g.rotateX(-Math.PI / 2); const uv = g.attributes.uv, p = g.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / 6, p.getZ(i) / 6); w.geo("marble", g, cx, 0.035, cz); }
    /* 床の飾り：入口から受付まで紺のじゅうたん（金のふち）・まん中に金と紺のメダリオン */
    { const rz0 = z0 + 17.5; w.rect("carpetNavy", cx - 3.2, rz0, cx + 3.2, z1 - 0.8, 0.045); [-1, 1].forEach((s) => w.rect("walkY", cx + s * 3.2 - 0.25, rz0, cx + s * 3.2 + 0.25, z1 - 0.8, 0.05));
      const md = cz + 4; w.disk(cx, md, 9.4, "walkY", 0.052, 8.9); w.disk(cx, md, 7, "carpetNavy", 0.055); w.disk(cx, md, 7.4, "walkY", 0.054, 7); w.disk(cx, md, 2.2, "walkY", 0.058);
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, g = new T.PlaneGeometry(0.5, 4.4); g.rotateX(-Math.PI / 2); g.rotateY(-a); w.batch.add("walkY", w.m.walkY, g, new T.Matrix4().makeTranslation(cx + Math.cos(a) * 4.6, 0.057, md + Math.sin(a) * 4.6)); } }
    /* 天井：明るい格天井（光る面＋白い梁＋金の線）。★ 下向きの面は草の緑が映りこむので、光る材質にする */
    if (!w.m.lobbyCeil) { w.m.lobbyCeil = new T.MeshStandardMaterial({ color: 0xf7f2e8, emissive: 0xcfc6b6, roughness: 1, metalness: 0, envMapIntensity: 0 }); w.m.lobbyBeam = new T.MeshStandardMaterial({ color: 0xffffff, emissive: 0x9d978d, roughness: 0.8, metalness: 0, envMapIntensity: 0 }); w.m.lobbyGold = new T.MeshStandardMaterial({ color: 0xe6bd5a, emissive: 0x6a4c10, roughness: 0.35, metalness: 0.4, envMapIntensity: 0.2 }); }
    w.box("lobbyCeil", cx, hi - 0.4, cz, x1 - x0 - t * 2, 0.4, z1 - z0 - t * 2);
    for (let x = x0 + 10; x < x1 - 1; x += 10) { w.box("lobbyBeam", x, hi - 1.3, cz, 0.7, 0.9, z1 - z0 - t * 2); w.box("lobbyGold", x, hi - 1.36, cz, 0.74, 0.08, z1 - z0 - t * 2); }
    for (let z = z0 + 9; z < z1 - 1; z += 9) { w.box("lobbyBeam", cx, hi - 1.3, z, x1 - x0 - t * 2, 0.9, 0.7); w.box("lobbyGold", cx, hi - 1.36, z, x1 - x0 - t * 2, 0.08, 0.74); }
    w.detail(() => { for (let x = x0 + 5; x < x1 - 1; x += 10) for (let z = z0 + 4.5; z < z1 - 1; z += 9) w.box("lightPanel", x, hi - 0.46, z, 5.6, 0.05, 4.6); });
    w.box("gSilver", cx, hi, cz, x1 - x0 + 1.2, 1.4, z1 - z0 + 1.2);
    w.box("gold", cx, hi + 1.4, cz, x1 - x0 + 1.6, 0.3, z1 - z0 + 1.6);
    /* 正面（南）：ガラスのカーテンウォール＋金の縦の桟・入口（幅 DW）・大きなひさし・名前 */
    const seg = (a, b) => { const L = b - a, c = (a + b) / 2; w.box("glassClear", c, 0, z1, L, hi, 0.12); for (let x = a; x <= b + 0.01; x += 4) w.box("gold", x, 0, z1 + 0.1, 0.22, hi, 0.3); w.colObb(c, z1, L, t, 0); };
    seg(x0, cx - DW / 2); seg(cx + DW / 2, x1);
    w.box("glassClear", cx, 6, z1, DW, hi - 6, 0.12); w.box("gold", cx, 5.6, z1 + 0.1, DW + 0.4, 0.5, 0.35);
    w.box("stoneW", cx, 0, z1, x1 - x0 + 0.8, 0.6, 1.2);
    w.box("white2", cx, 7.2, z1 + 6, DW + 16, 0.5, 12); w.box("neonCyan", cx, 7.1, z1 + 6, DW + 16.1, 0.08, 12.1); w.box("gold", cx, 7.7, z1 + 12, DW + 16.2, 0.4, 0.3);
    [-1, 1].forEach((s) => { w.geo("gold", new T.CylinderGeometry(0.35, 0.35, 7.2, 12), cx + s * (DW / 2 + 7.5), 3.6, z1 + 11.4); w.colCircle(cx + s * (DW / 2 + 7.5), z1 + 11.4, 0.4); });
    w.sign("NGX GLOBAL HEADQUARTERS", { bg: "#0a1450", color: "#ffe7a0", glow: "#ffd86a", border: "#ffd86a", px: 1024 }, 30, 2.6, cx, hi - 3.2, z1 + 0.35, 0);
    w.geo(logo, new T.PlaneGeometry(16, 5.9), cx, 10.6, z1 + 0.4);
    /* 横の壁（外はガラス・中は白い石）・奥の壁 */
    [x0, x1].forEach((x, i) => { const s = i ? 1 : -1; w.box("gGold", x, 0, cz, 0.3, hi, z1 - z0, { uv: 14 }); w.box("stoneW", x - s * 0.35, 0, cz, 0.3, hi, z1 - z0 - 0.8); w.colObb(x, cz, t, z1 - z0, 0); });
    w.box("gBlue", cx, 0, z0, x1 - x0, hi, 0.3, { uv: 14 }); w.box("stoneW", cx, 0, z0 + 0.35, x1 - x0 - 0.8, hi, 0.3); w.colObb(cx, z0, x1 - x0, t, 0);
    /* 奥の壁：紺の大きな板に金のロゴ・受付 */
    w.box("pNavy", cx, 6, z0 + 0.55, 44, 13, 0.2); w.box("gold", cx, 5.8, z0 + 0.6, 44.4, 0.3, 0.25); w.box("gold", cx, 19, z0 + 0.6, 44.4, 0.3, 0.25);
    w.geo(logo, new T.PlaneGeometry(34, 12.5), cx, 12.6, z0 + 0.72);
    { const rz = z0 + 14; for (let i = -4; i <= 4; i++) { const a = i / 4 * 0.5, x = cx + Math.sin(a) * 12, z = rz + (1 - Math.cos(a)) * 5; w.box("stoneW", x, 0, z, 3.2, 1.1, 1.2, { ry: -a }); w.box("lobbyGold", x, 1.1, z, 3.3, 0.07, 1.3, { ry: -a }); w.box("neonCyan", x, 0.08, z + 0.62, 3.2, 0.06, 0.03, { ry: -a }); }
      w.colObb(cx, rz + 0.5, 16, 2.6, 0);
      w.sign("RECEPTION  受付", { bg: "#0a1450", color: "#fff", border: "#ffd86a", px: 512 }, 5, 0.7, cx, 0.75, rz + 0.66, 0);
      w.interact(cx, rz + 3.4, 3.2, "受付で案内を聞く（NGX 本社）", () => ({ lobby: { name, text: "NGX 本社へようこそ。上の階（ギャラリア・フードホール・ミュージアム・開発フロア…）は奥のエレベーターで。展望フロア（310m）へは、基壇の屋上からガラスのスカイエレベーターでどうぞ。" } }), "🛎️");
      const ngx = APP("ngx"); if (ngx) w.interact(cx + 9, rz + 3.4, 2.4, "NGX 公式サイトを開く", () => ({ open: ngx.href, app: ngx }), "🌐"); }
    /* 柱（白と金）・シャンデリア（光の輪） */
    [-1, 1].forEach((s) => [z1 - 12, cz, z0 + 12].forEach((z, k) => { const x = cx + s * 26; w.geo("white2", new T.CylinderGeometry(0.9, 0.9, hi, 20), x, hi / 2, z); w.geo("gold", new T.CylinderGeometry(1.05, 1.05, 0.5, 20), x, 0.25, z); w.geo("gold", new T.CylinderGeometry(1.05, 1.05, 0.5, 20), x, hi - 0.9, z); w.colCircle(x, z, 1.0); }));
    w.detail(() => { [cx - 14, cx + 14].forEach((x) => { const y = hi - 5; w.geo("gold", new T.TorusGeometry(4, 0.12, 6, 48).rotateX(Math.PI / 2), x, y, cz + 2); for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; w.geo("lampGlow", new T.SphereGeometry(0.28, 8, 6), x + Math.cos(a) * 4, y - 0.4, cz + 2 + Math.sin(a) * 4); w.geo("chromeB", new T.CylinderGeometry(0.02, 0.02, 4.4, 3), x + Math.cos(a) * 4, y + 1.8, cz + 2 + Math.sin(a) * 4); } }); });
    /* 吹きぬけ：東西の壁の上の方に2階の回廊（ガラスの手すり・金の線・光る窓）・壁の金の柱 */
    [x0, x1].forEach((xw, i) => {
      const s = i ? 1 : -1, xi = xw - s * 0.5, bx = xi - s * 2, yb = 15.2, L = z1 - z0 - 2.4;
      w.box("lobbyBeam", bx, yb, cz, 4, 0.6, L); w.box("lobbyGold", bx - s * 2.02, yb + 0.05, cz, 0.06, 0.5, L);
      w.box("glassClear", bx - s * 1.95, yb + 0.6, cz, 0.06, 1.1, L); w.box("lobbyGold", bx - s * 1.95, yb + 1.7, cz, 0.12, 0.1, L);
      w.detail(() => { for (let z = z0 + 5; z < z1 - 3; z += 7) { w.box("lightPanel", xi - s * 0.06, yb + 1.4, z, 0.05, 3.2, 4.6); w.box("lobbyBeam", xi - s * 0.08, yb + 1.2, z + 3.5, 0.1, 3.8, 0.6); } });
      for (let z = z0 + 8; z < z1 - 2; z += 9) w.box("lobbyGold", xi - s * 0.02, 5.2, z, 0.12, yb - 5.2, 0.5);
    });
    /* ラウンジ（ソファ・すわれる）・観葉植物 */
    [-1, 1].forEach((s) => {
      const lx = cx + s * 36, lz = z1 - 12;
      w.detail(() => { w.box("carpetNavy" in w.m ? "carpetNavy" : "pNavy", lx, 0.04, lz, 16, 0.02, 12); w.box("woodDark2", lx, 0, lz, 3, 0.45, 1.6); });
      sofa(w, lx, lz - 4, 7, 0, "seatBlue"); sofa(w, lx, lz + 4, 7, Math.PI, "seatBlue"); sofa(w, lx - s * 5.2, lz, 5, s > 0 ? Math.PI / 2 : -Math.PI / 2, "seatBlue");
      indoorPlant(w, cx + s * (x1 - cx - 3), z1 - 3, 1.3); indoorPlant(w, cx + s * (x1 - cx - 3), z0 + 3, 1.3); indoorPlant(w, cx + s * 18, z1 - 3, 1.1);
    });
    /* アプリのギャラリー（西の壁：画面6面・E でアプリへ）・大画面（東の壁） */
    { const list = ((window.EXPO_DATA && EXPO_DATA.apps) || []).filter((a) => a.href && a.img && !/^[぀-ヿ]/.test(a.name)).slice(0, 6);
      list.forEach((a, i) => {
        const x = x0 + 1.2, z = z1 - 8 - i * 6.6;
        w.box("pNavy", x + 0.5, 0, z, 1.0, 1.0, 4.6); w.box("gold", x + 0.5, 1.0, z, 1.05, 0.06, 4.7);
        const im = new Image(); im.crossOrigin = "anonymous"; im.src = "../" + a.img;
        const scr = w.screen(4.2, 2.6, 512, x + 0.18, 3.1, z, Math.PI / 2, (g, W, H, t) => { g.fillStyle = "#0a1450"; g.fillRect(0, 0, W, H); if (im.complete && im.naturalWidth) { const s = Math.max(W / im.width, (H - 70) / im.height); g.drawImage(im, W / 2 - im.width * s / 2, (H - 70) / 2 - im.height * s / 2, im.width * s, im.height * s); } g.fillStyle = "rgba(10,20,80,.85)"; g.fillRect(0, H - 70, W, 70); g.fillStyle = "#fff"; g.font = "900 40px sans-serif"; g.textAlign = "center"; g.fillText(a.name, W / 2, H - 22); g.textAlign = "left"; }, { every: 1.5 });
        w.interact(x + 2.2, z, 2.4, a.name + " をひらく（NGX アプリギャラリー）", () => ({ open: a.href, app: a }), "📱");
      });
      w.sign("NGX APP GALLERY  アプリのギャラリー", { bg: "#0a1450", color: "#fff", glow: "#7fd8ff", px: 1024 }, 14, 1.0, x0 + 0.78, 7.2, z1 - 24, Math.PI / 2); }
    w.bigScreen(x1 - 0.95, 9, cz + 2, -Math.PI / 2, 22, 11, "NGX", ["つなぐ、すべてを。広がる、未来を。", "XEVARION のアプリをつくる会社", "MagiOne・MeruHub・ORDYXIS", "展望フロア 310m へどうぞ"], ["#0a1450", "#2a1a7a"]);
    /* 部屋としての登録（明かり・カメラが中にとどまる・草を生やさない・入口） */
    w.zone(name, x0, z0, x1, z1, "shop");
    (w.interiors = w.interiors || []).push({ x: cx, z: cz, c: 1, s: 0, hw: (x1 - x0) / 2 - t, hd: (z1 - z0) / 2 - t, hi: hi - 0.5, name, type: "lobby", round: false });
    (w.noGrass = w.noGrass || []).push([x0 - 1, z0 - 1, x1 + 1, z1 + 1]);
    (w.doors = w.doors || []).push([cx, z1 + 3]);
    w.caster(cx, cz, x1 - x0, z1 - z0, hi + 1.5);
    w.plazaCrowd(cx, cz + 6, 22, 1.2);
  }
  /* ロビーの奥：エレベーター4基（各階をえらぶ）・スカイエレベーターへの案内 */
  function lobbyLifts(w, LB, def) {
    const cz = LB.z0 + 0.62;
    [-21, -12, 12, 21].forEach((dx, k) => {
      const x = (LB.x0 + LB.x1) / 2 + dx;
      w.box("goldOrn", x, 0, cz, 4.2, 5.2, 0.3); w.box("chromeB", x - 0.9, 0, cz + 0.1, 1.75, 4.6, 0.12); w.box("chromeB", x + 0.9, 0, cz + 0.1, 1.75, 4.6, 0.12); w.box("pBlack", x, 0, cz + 0.17, 0.05, 4.6, 0.02);
      w.box("neonCyan", x, 5.0, cz + 0.2, 3.6, 0.12, 0.06); w.sign(k < 2 ? "1F ▲ 2F〜68F" : "1F ▲ 展望 310m", { bg: "#050a1a", color: "#7fe8ff", px: 256 }, 2.4, 0.42, x, 5.6, cz + 0.2, 0);
      w.interact(x, cz + 2.4, 2.4, k < 2 ? "エレベーター（2F〜68F の各階へ）" : "エレベーター（各階・スカイエレベーター 310m）", () => ({ roomFloors: def }), "🛗");
    });
  }

  /* ══════════════ 38 MAGICAL FUTURE CAMPUS（NGX の技術提携パートナー・ORDYXIS／MeruHub を共同開発） ══════════════
     南の大通りから：門 → 中央の「つながる広場」（2つの光の輪と光る球・宙に浮かぶ MF のロゴ・水鏡）→ 北に MF 本社タワー（ねじれたガラスの塔）
     西：MeruHub パビリオン（ドーム）・AI × XR ラボ（ガラスのキューブ）／東：ORDYXIS カフェ（店頭オーダー）・MF イノベーションホール（上映）
     「Infinite Possibilities, Connected.」 */
  P.buildMFCampus = function () {
    const w = this, CX = 297, CZ = -262;
    w.areaZone("mf");
    w.places.push(["38 MAGICAL FUTURE CAMPUS（つながる広場）", CX, CZ + 44, Math.PI]);
    const mfMark = keyedLogo(w, "mfMark", "../brand/MagicalFuture.png", [350, 145, 330, 235]), mfFull = keyedLogo(w, "mfFull", "../brand/MagicalFuture.png", [215, 140, 590, 385]);
    const lm = w._landmark; w._landmark = true;
    /* 大通りからの道・広場（青→紫→ピンクの石だたみ） */
    w.route([[CX, -166], [CX, CZ + 36]], 14, "walkY", { raw: true, lamps: "modern", lampEvery: 18, lampsBoth: true, trees: false, benches: false, bushes: false });
    w.disk(CX, CZ, 38, "plaza", 0.014); w.disk(CX, CZ, 38.6, "walkY", 0.013, 38);
    [[34, "neonCyan"], [30, "neonPurple"], [26, "neonPink"]].forEach(([r, key]) => w.disk(CX, CZ, r, key, 0.02, r - 0.4));
    /* 水鏡と「つながる」彫刻（青とピンクの輪・まん中の光る球）＋浮かぶロゴ */
    { w.pond(CX, CZ, 16, "fountain");
      const tm = [new T.MeshStandardMaterial({ color: 0x3a6aff, emissive: 0x2a4aff, emissiveIntensity: 0.7, metalness: 0.5, roughness: 0.2 }), new T.MeshStandardMaterial({ color: 0xff4f9a, emissive: 0xff2a7a, emissiveIntensity: 0.7, metalness: 0.5, roughness: 0.2 })];
      tm.forEach((m) => w.nightMats.push({ m, day: 0.7, night: 1.9 }));
      const rings = tm.map((m, i) => { const r = new T.Mesh(new T.TorusGeometry(8.5, 0.55, 14, 96), m); r.position.set(CX, 10, CZ); w.scene.add(r); w.loose(r, 900); return r; });
      const orbM = new T.MeshStandardMaterial({ color: 0xc86aff, emissive: 0xa04aff, emissiveIntensity: 1.1, roughness: 0.15, metalness: 0.2 }); w.nightMats.push({ m: orbM, day: 0.9, night: 2.2 });
      const orb = new T.Mesh(new T.SphereGeometry(2.4, 32, 20), orbM); orb.position.set(CX, 10, CZ); w.scene.add(orb);
      w.geo("chromeB", new T.CylinderGeometry(0.5, 1.2, 4, 16), CX, 2, CZ); w.geo("white2", new T.CylinderGeometry(2.6, 3, 0.8, 24), CX, 0.4, CZ);
      const lg = new T.Mesh(new T.PlaneGeometry(15, 10.7), w.m[mfMark]); lg.position.set(CX, 22, CZ); w.scene.add(lg); w.loose(lg, 900);
      const lg2 = new T.Mesh(new T.PlaneGeometry(15, 10.7), w.m[mfMark]); lg2.rotation.y = Math.PI; lg.add(lg2);
      w.anim.push((dt, t) => { rings[0].rotation.set(Math.PI / 2 + Math.sin(t * 0.4) * 0.6, t * 0.35, 0); rings[1].rotation.set(Math.PI / 2 + Math.cos(t * 0.4) * 0.6, -t * 0.35, Math.PI / 2); orb.position.y = 10 + Math.sin(t * 1.1) * 0.5; lg.position.y = 22 + Math.sin(t * 0.6) * 0.8; lg.rotation.y = t * 0.25; });
      w.casterCircle(CX, CZ, 9, 12);
      w.interact(CX, CZ + 19, 3, "Magical Future 公式サイトを開く", () => { const a = APP("magicalfuture"); return a ? { open: a.href, app: a } : null; }, "🌐"); }
    /* 広場のまわり：花・木・ベンチ・旗（MF の色） */
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + 0.26; if (Math.abs(Math.cos(a)) < 0.35 || Math.abs(Math.sin(a)) < 0.42) continue;          /* 道（南北：入口・タワー／東西：MeruHub・ORDYXIS へ）の所はあける */ const x = CX + Math.cos(a) * 43, z = CZ + Math.sin(a) * 43; w.flowerBed(x, z, 8, 2.4, Math.PI / 2 - a, 900 + i, XP.FLOWER_PAL[[3, 1, 4][i % 3]]); if (i % 2) w.plant("sakura", CX + Math.cos(a) * 48, CZ + Math.sin(a) * 48, 1.1); }
    for (let i = 0; i < 6; i++) { const z = -186 - i * 11; [-1, 1].forEach((s) => w.flag(CX + s * 10, z, [0x3a6aff, 0x8a4aff, 0xff4f9a][(i + (s > 0 ? 1 : 0)) % 3], 10)); }
    w.plazaCrowd(CX, CZ, 36, 1.2);
    /* 北：MF 本社タワー（ねじれたガラスの塔・ロゴ） */
    { const tx = CX, tz = -392, H = 128;
      w.route([[CX, CZ - 38], [CX, tz + 20]], 10, "walkY", { raw: true, lamps: "modern", lampEvery: 16, trees: false, benches: false, bushes: false });
      w.futureTower(tx, tz, 30, H, { key: "gPurple", twist: 1.1, band: "neonPink" });
      [0, 1, 2, 3].forEach((i) => { const a = i * Math.PI / 2; w.geo(mfMark, new T.PlaneGeometry(15, 10.7).rotateY(a), tx + Math.sin(a) * 11.5, H - 14, tz + Math.cos(a) * 11.5); });
      w.geo(mfFull, new T.PlaneGeometry(22, 14.3), tx, 18, tz + 13.2);
      w.floatRing(tx, H + 18, tz, 16, "neonPink");
      w.sign("MAGICAL FUTURE HQ", { grad: ["#3a6aff", "#a04aff", "#ff4f9a"], color: "#fff", glow: "#ffd0ec", px: 1024 }, 16, 1.6, tx, 6.2, tz + 13.1, 0); }
    /* 西：MeruHub パビリオン（ガラスのドーム）・AI × XR ラボ（ガラスのキューブ） */
    { const mx = 212, mz = -300;
      w.domeHall(mx, mz, 19, "glassDome", 0, { hi: 5, name: "MeruHub パビリオン", type: null });
      const mh = texMat(w, "meruHub", "../thumbs/MeruHub.png");
      /* 中：MeruHub のしるし（台の上で回る）・案内 */
      w.geo("white2", new T.CylinderGeometry(2.4, 2.8, 1.2, 24), mx, 0.6, mz); w.colCircle(mx, mz, 2.9);
      { const g = new T.Mesh(new T.PlaneGeometry(4.2, 4.2), w.m[mh]); g.position.set(mx, 3.6, mz); w.scene.add(g); w.loose(g, 300); w.anim.push((dt, t) => { g.rotation.y = t * 0.5; }); }
      w.interact(mx + 5, mz, 2.6, "MeruHub シリーズ（NGX × Magical Future）の案内", () => ({ lobby: { name: "MeruHub パビリオン", text: "MeruHub は NGX と Magical Future が共同開発するアプリのシリーズです。店頭オーダーの ORDYXIS もこの提携から生まれました。東の ORDYXIS CAFÉ で、実際の注文画面を体験できます。" } }), "💡");
      /* 外：MeruHub の看板（柱の上） */
      w.box("chromeB", mx + 24, 0, mz + 10, 0.2, 5, 0.2); w.geo(mh, new T.PlaneGeometry(3.6, 3.6), mx + 24.12, 6.4, mz + 10, Math.PI / 2); w.colCircle(mx + 24, mz + 10, 0.3);
      w.sign("MeruHub PAVILION", { bg: "#1a2a6a", color: "#fff", glow: "#7fd8ff", px: 1024 }, 11, 1.2, mx + 22.2, 6.6, mz, Math.PI / 2);
      w.route([[CX - 38, CZ - 4], [mx + 26, mz]], 8, "walkCream", { raw: true, lamps: "modern", lampEvery: 16, trees: false, benches: false, bushes: false });
      w.glassCube(212, -390, 20, { sign: "AI × XR LAB", seam: "neonPink" });
      w.enterable(240, -392, 16, 12, 5, Math.PI / 2, { type: "lab", name: "MF AI × XR ラボ", key: "gSilver" });
      w.route([[CX - 18, -392], [249, -392]], 8, "walkCream", { raw: true, lamps: "modern", lampEvery: 16, trees: false, benches: false, bushes: false }); }
    /* 東：ORDYXIS カフェ（店頭オーダー）・MF イノベーションホール */
    { const ox = 385, oz = -290;
      w.bld(ox, oz, 34, 20, 9, { key: "gRose", shop: "shopD", roof: "flat", roofKey: "rMetalW", ry: -Math.PI / 2, crown: "neonPink", sign: { text: "ORDYXIS CAFÉ", bg: "#2a0a1a", color: "#fff", w: 14, h: 1.8, y: 6.8, glow: "#ff7aa8" }, inside: { type: "cafe", name: "ORDYXIS CAFÉ（店頭オーダー）", h: 5.5, door: 5, menu: "coffee" } });
      const od = texMat(w, "ordyxisImg", "../thumbs/Ordyxis.jpg");
      w.geo(od, new T.PlaneGeometry(9, 5), ox - 10.2, 7.5, oz + 9, -Math.PI / 2);
      w.interact(ox - 14, oz + 6, 2.4, "ORDYXIS（店頭オンラインオーダー）を開く", () => { const a = APP("ordyxis"); return a ? { open: a.href, app: a } : null; }, "📲");
      for (let i = 0; i < 6; i++) w.cafeTable(ox - 16 - (i % 2) * 4.5, oz - 8 + Math.floor(i / 2) * 7, ["fabricW", "fabricB", "fabricY"][i % 3]);
      w.route([[CX + 38, CZ - 4], [ox - 18, oz]], 8, "walkCream", { raw: true, lamps: "modern", lampEvery: 16, trees: false, benches: false, bushes: false });
      w.bld(385, -392, 36, 26, 14, { key: "gBlue", roof: "flat", roofKey: "rMetal", ry: -Math.PI / 2, crown: "neonCyan", sign: { text: "MF INNOVATION HALL", bg: "#0a1450", w: 16, h: 1.6, y: 11, glow: "#7fd8ff" }, inside: { type: "theater", name: "MF イノベーションホール（上映）", h: 7, door: 6, video: "mfhall", screenTitle: "MAGICAL FUTURE" } });
      w.route([[CX + 18, -392], [367, -392]], 8, "walkCream", { raw: true, lamps: "modern", lampEvery: 16, trees: false, benches: false, bushes: false }); }
    /* 木・植えこみ（北のタワーのまわり） */
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; if (Math.abs(Math.cos(a)) < 0.3) continue; w.plant(i % 2 ? "sakura" : "poplar", CX + Math.cos(a) * 30, -392 + Math.sin(a) * 26, 1.0); }
    w.areaGate(CX, -180, 0, "mf", "big");
    w.forestOpen.push([CX, -300, 150]);
    w._landmark = lm;
  };

  /* ══════════════ 39 ISHIDA PRODUCTION STUDIOS（XEVARION の製作パートナー） ══════════════
     映画・アニメの撮影所：大通りの門 → 赤いじゅうたんの通り → ISHIDA 本社（ロゴ）／給水塔（撮影所のしるし）・撮影ステージ 3 棟・
     「昭和の商店街」の撮影セット・試写室（上映）・アニメスタジオ・作品ギャラリー・カメラのクレーン・大きなカチンコ */
  P.buildIshida = function () {
    const w = this, AX = -297;
    w.areaZone("ishida");
    w.places.push(["39 ISHIDA PRODUCTION STUDIOS（撮影所の門）", AX, -196, Math.PI]);
    const ipMark = keyedLogo(w, "ipMark", "../brand/ISHIDA Production.png", [300, 72, 470, 335]), ipFull = keyedLogo(w, "ipFull", "../brand/ISHIDA Production.png", [185, 68, 655, 545]);
    const lm = w._landmark; w._landmark = true;
    /* 門の広場・赤いじゅうたんの通り（まん中の道） */
    w.route([[AX, -166], [AX, -362]], 12, "walkCream", { raw: true, lamps: "modern", lampEvery: 18, lampsBoth: true, trees: false, benches: false, bushes: false });
    w.rect("carpetRed", AX - 2.2, -300, AX + 2.2, -170, 0.045);
    [-1, 1].forEach((s) => { for (let z = -176; z > -300; z -= 12) { w.box("gold", AX + s * 3.2, 0, z, 0.12, 1.0, 0.12); w.geo("gold", new T.SphereGeometry(0.14, 8, 6), AX + s * 3.2, 1.05, z); } w.box("carpetRed", AX + s * 3.2, 0.92, -238, 0.05, 0.05, 124); });
    /* 大きなカチンコ（撮影所のしるし）・カメラのクレーン */
    { const kx = AX - 22, kz = -196; w.box("pBlack", kx, 0.6, kz, 7, 5, 0.6); w.box("white2", kx, 0.6, kz + 0.31, 6.4, 0.08, 0.02);
      const stick = w.captureGroup(() => { for (let i = 0; i < 6; i++) w.box(i % 2 ? "pBlack" : "white2", (i + 0.5) * 7 / 6, 0, 0, 7 / 6, 0.9, 0.62); }); stick.position.set(kx - 3.5, 5.7, kz); w.scene.add(stick); w.loose(stick, 400);          /* 左はしが ちょうつがい */
      w.anim.push((dt, t) => { const k = (t * 0.25) % 1; stick.rotation.z = k < 0.1 ? 0.5 * (1 - k / 0.1) : k < 0.8 ? 0.5 * Math.min(1, (k - 0.1) / 0.1) : 0.5; });
      w.box("gold", kx, 0, kz, 1.2, 0.6, 1.2); w.colObb(kx, kz, 7.4, 1.4, 0);
      w.sign("ISHIDA PRODUCTION  TAKE 1", { bg: "#101010", color: "#fff", px: 512 }, 5.2, 0.9, kx, 3.2, kz + 0.33, 0);
      /* クレーン（カメラ） */
      const cx = AX + 22, cz = -200; w.geo("darkMetal", new T.CylinderGeometry(0.4, 0.6, 5, 10), cx, 2.5, cz); w.geo("darkMetal", new T.BoxGeometry(3, 0.6, 3), cx, 0.3, cz); w.colCircle(cx, cz, 1.6);
      const arm = w.captureGroup(() => { w.geo("railYellow" in w.m ? "railYellow" : "gold", new T.BoxGeometry(0.4, 0.4, 12).translate(0, 0, 3)); w.geo("pBlack", new T.BoxGeometry(1.2, 1.0, 1.6).translate(0, -0.6, 9)); w.geo("glassClear", new T.CylinderGeometry(0.35, 0.35, 0.5, 12).rotateX(Math.PI / 2).translate(0, -0.6, 10)); w.geo("darkMetal", new T.BoxGeometry(1.2, 1.2, 1.2).translate(0, 0, -3.5)); });
      arm.position.set(cx, 5.2, cz); w.scene.add(arm); w.loose(arm, 400);
      w.anim.push((dt, t) => { arm.rotation.y = Math.PI + Math.sin(t * 0.2) * 0.8; arm.rotation.x = -0.15 + Math.sin(t * 0.33) * 0.15; }); }
    /* 東：ISHIDA 本社（ロゴ）・試写室・アニメスタジオ・作品ギャラリー */
    { const hx = -228, hz = -226;
      w.bld(hx, hz, 44, 26, 56, { key: "gBlue", shop: "shopB" in w.m ? "shopB" : "shopA", roof: "flat", roofKey: "rMetal", crown: "neonCyan", sign: { text: "ISHIDA PRODUCTION", bg: "#0a1450", w: 18, h: 1.8, y: 5.6, glow: "#7fd8ff" } });
      w.geo(ipFull, new T.PlaneGeometry(26, 21.1), hx, 36, hz + 13.15);
      w.geo(ipMark, new T.PlaneGeometry(14, 10), hx + 22.15, 44, hz, Math.PI / 2); w.geo(ipMark, new T.PlaneGeometry(14, 10), hx - 22.15, 44, hz, -Math.PI / 2);
      w.interact(hx, hz + 16, 3, "ISHIDA Production 公式サイトを開く", () => { const a = APP("ishida"); return a ? { open: a.href, app: a } : null; }, "🌐");
      w.enterable(-222, -282, 30, 20, 7, -Math.PI / 2, { type: "theater", name: "ISHIDA 試写室（上映）", key: "gDark", video: "ishidatheater", screenTitle: "ISHIDA PRODUCTION" });
      w.box("gDark", -222, 7, -282, 20, 3, 30); w.sign("SCREENING ROOM  試写室", { bg: "#1a0a0a", color: "#ffe7a0", glow: "#ffb04a", px: 512 }, 9, 1.0, -222 - 10.2, 8.4, -282, -Math.PI / 2);
      w.enterable(-268, -318, 18, 13, 5, -Math.PI / 2, { type: "studio", name: "ISHIDA アニメスタジオ", key: "oWhite" in w.m ? "oWhite" : "white2" });
      w.bld(-218, -326, 34, 22, 9, { key: "yCream", shop: "shopC", roof: "flat", roofKey: "rMetalW", ry: -Math.PI / 2, crown: "neonYellow", sign: { text: "ISHIDA WORKS GALLERY", bg: "#1a1a2a", w: 13, h: 1.4, y: 6.6, glow: "#ffd86a" }, inside: { type: "gallery", name: "ISHIDA 作品ギャラリー", h: 6, door: 5, list: ((window.EXPO_DATA && EXPO_DATA.apps) || []).filter((a) => a.href && !/^[぀-ヿ]/.test(a.name)).slice(0, 16).map((a) => [a.name, (a.sub || "") + "　—　ISHIDA Production が製作に参加"]) } }); }
    /* 給水塔（撮影所のしるし・ロゴ） */
    { const tx = -398, tz = -202, H = 22;
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { w.geo("darkMetal", new T.CylinderGeometry(0.28, 0.36, H, 8), tx + a * 3.2, H / 2, tz + b * 3.2); w.colCircle(tx + a * 3.2, tz + b * 3.2, 0.4); });
      for (let y = 5; y < H; y += 5) w.geo("darkMetal", new T.TorusGeometry(4.5, 0.08, 4, 4).rotateX(Math.PI / 2).rotateY(Math.PI / 4), tx, y, tz);
      w.geo("gSilver", new T.CylinderGeometry(6, 6, 9, 24), tx, H + 4.5, tz); w.geo("kwB", new T.ConeGeometry(6.4, 3.6, 24), tx, H + 10.8, tz); w.geo("gold", new T.SphereGeometry(0.5, 10, 8), tx, H + 12.8, tz);
      [0, 1, 2, 3].forEach((i) => { const a = i * Math.PI / 2; w.geo(ipMark, new T.PlaneGeometry(8.4, 6), tx + Math.sin(a) * 6.05, H + 4.8, tz + Math.cos(a) * 6.05, a); });
      w.caster(tx, tz, 12, 12, H + 10); }
    /* 撮影ステージ 3 棟（かまぼこ屋根・大きな番号・ON AIR のランプ） */
    [[-386, -326, 1], [-334, -326, 2], [-226, -364, 3]].forEach(([sx, sz, no], k) => {
      const W2 = k < 2 ? 40 : 44, D2 = k < 2 ? 36 : 24, H2 = 16;
      w.bld(sx, sz, W2, D2, H2, { key: "offWhite", roof: "flat", roofKey: "rMetal", parapet: false, sign: { text: "SOUND STAGE " + no, bg: "#8a1a1a", color: "#fff", w: 12, h: 1.6, y: 12.5, glow: "#ff6a4a" } });
      w.geo("gSilver", new T.CylinderGeometry(W2 / 2, W2 / 2, D2, 32, 1, false, Math.PI / 2, Math.PI).rotateX(Math.PI / 2).scale(1, 0.3, 1), sx, H2, sz);          /* かまぼこ屋根 */
      w.sign(String(no), { bg: "#101010", color: "#ffd84a", px: 256 }, 5, 5, sx - W2 / 2 + 5, 7.5, sz + D2 / 2 + 0.06, 0);
      w.box("neonRed", sx + W2 / 2 - 5, 13.5, sz + D2 / 2 + 0.1, 3.4, 1.0, 0.1); w.sign("ON AIR", { bg: "#c8101a", color: "#fff", glow: "#ff4a4a", px: 256 }, 3.2, 0.9, sx + W2 / 2 - 5, 14.0, sz + D2 / 2 + 0.18, 0);
      w.box("darkMetal", sx, 0, sz + D2 / 2 + 0.05, 10, 7, 0.2);
    });
    /* 撮影セット「昭和の商店街」（ひさし・のれん・提灯の小さな通り） */
    { const z0 = -262, names = [["駄菓子 よろず屋", "yRed", "norR"], ["喫茶 ほしぞら", "yCream", "norB"], ["写真館 ISHIDA", "yTeal" in w.m ? "yTeal" : "yCream", "norK"], ["映画館 キネマ", "yRed", "norR"]];
      w.route([[-424, z0], [AX - 7, z0]], 8, "walkCream", { raw: true, lamps: "yoma", lampEvery: 14, trees: false, benches: false, bushes: false });
      names.forEach(([nm, key, nr], i) => { const x = -400 + i * 21; [-1, 1].forEach((s) => { if (s > 0 && i === 3) return; w.yomaShop(x, z0 + s * 11, 16, 8, 7.5 + (i % 2) * 2, { ry: s > 0 ? Math.PI : 0, key, shop: "shopA", roof: "kawara", roofKey: ["kwK", "kwB", "kwR"][i % 3], rh: 2.6, sign: s > 0 ? nm : nm.replace(/ .*/, "") + " 本店", signColor: "#2a1010", noren: nr, lanterns: 2, eyes: false }); }); });
      for (let x = -410; x < AX - 12; x += 13) w.lanternString(x, z0 - 4, x, z0 + 4, 5.5, 4, x);
      w.sign("撮影セット「昭和の商店街」  BACKLOT", { bg: "#2a1010", color: "#ffe7a0", glow: "#ffb04a", px: 1024 }, 10, 1.0, -414, 5.4, z0, Math.PI / 2); }
    /* 木・植えこみ・スポットライト（夜） */
    for (let i = 0; i < 6; i++) w.plant(i % 2 ? "sakura" : "oak", AX + (i % 2 ? 14 : -14), -206 - i * 18, 1.05);
    [-1, 1].forEach((s) => { w.spotBeam(AX + s * 30, 1, -190, 0xffe0a0, s * 0.25); w.spotBeam(AX + s * 44, 1, -196, 0xa8d0ff, s * 0.4); });
    w.plazaCrowd(AX, -230, 34, 1.1);
    w.areaGate(AX, -180, 0, "ishida", "big");
    w.forestOpen.push([AX, -275, 140]);
    w._landmark = lm;
  };

  window.XCorp = { keyedLogo, sofa, indoorPlant };
})();
