/* ══════════════════════════════════════════════════════════════════
   XEVARION HARBOR — 大きな湖の港町（★★ 2026-09-29b ご指定「ディズニーシーのような大きな池。夜はたくさんの船と
   まわりの建物や光と連動して Chase the Light の曲と共に超豪華にパレード」）
   ------------------------------------------------------------------
   ・場所：島の北（x 62..338 / z −600..−272）。前はサーキットの東半分だった所（サーキットはドームのまわりへ）。
   ・湖（まん中 195,−435・東西 200m・南北 180m）＋石の岸と遊歩道・南の港町（妖魔の店と未来のビル）・西の桟橋・
     東の灯台と要塞・北の MOUNT XEVARION（クリスタルの山・ほら穴の船だまり＝パレードの船はここから出る＝見えない所から）。
   ・昼：蒸気船・ゴンドラが行き来する。乗れる「ハーバー・スチーマー」。
   ・夜：水上パレード「CHASE THE LIGHT」（曲の拍・盛り上がり・強い音に合わせて、船の光・建物の光・噴水・サーチライト・
     レーザー・花火・山の噴火・水の幕の映像がいっしょに動く）。
   ══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const T = THREE, X = XTex, P = XWorld.World.prototype, TAU = Math.PI * 2, XP = XPark, MOBILE = XP.MOBILE;
  const HC = { x: 195, z: -435, rx: 100, rz: 90 };
  /* 岸の形（楕円にゆるい入り江） */
  const edgeR = (a) => { const e = 1 / Math.sqrt(Math.pow(Math.cos(a) / HC.rx, 2) + Math.pow(Math.sin(a) / HC.rz, 2)); return e * (1 + 0.045 * Math.sin(3 * a + 0.4) + 0.03 * Math.sin(5 * a + 2.1)); };
  const lakePt = (a, k) => { const r = edgeR(a) * (k == null ? 1 : k); return [HC.x + Math.cos(a) * r, HC.z + Math.sin(a) * r]; };
  const angOf = (x, z) => Math.atan2(z - HC.z, x - HC.x);
  const MT = { x: 195, z: -574, r: 34, h: 58 };               /* MOUNT XEVARION */
  const PIER_A = Math.PI;                                       /* 西の桟橋 */

  /* 動く光の材質（曲で色と明るさが変わる）。まとめ描きで色が焼かれないよう vc なしで w.m に入れる */
  function showMats(w) {
    if (w.m.showA) return;
    ["showA", "showB", "showC", "showW"].forEach((k, i) => { const m = new T.MeshBasicMaterial({ color: [0xff4fb0, 0x4ff0ff, 0xffd84a, 0xffffff][i], toneMapped: false }); w.m[k] = m; });
  }

  /* ══════════════ 作る ══════════════ */
  P.buildHarbor = function () {
    const w = this;
    showMats(w);
    w.areaZone && w.areaZone("harbor");
    w.places.push(["24 HARBOR（港の遊歩道）", HC.x, HC.z + edgeR(Math.PI / 2) + 12, Math.PI]);
    const N = 160, poly = []; for (let i = 0; i < N; i++) poly.push(lakePt(i / N * TAU));
    const nrm = poly.map((p, i) => { const a = poly[(i + N - 1) % N], b = poly[(i + 1) % N]; let nx = b[1] - a[1], nz = -(b[0] - a[0]); const l = Math.hypot(nx, nz) || 1; nx /= l; nz /= l; if (nx * (p[0] - HC.x) + nz * (p[1] - HC.z) < 0) { nx = -nx; nz = -nz; } return [nx, nz]; });

    /* ── 水面（まん中ほど深い：aDepth）── */
    {
      const K = 18, pos = [], dep = [], uv = [], idx = [];
      for (let k = 0; k <= K; k++) for (let i = 0; i < N; i++) { const f = k / K, [px, pz] = poly[i], x = HC.x + (px - HC.x) * f, z = HC.z + (pz - HC.z) * f; pos.push(x - HC.x, 0, z - HC.z); uv.push(x / 8, z / 8); const r = edgeR(i / N * TAU); dep.push(Math.min(1, (1 - f) * r / 26)); }
      for (let k = 0; k < K; k++) for (let i = 0; i < N; i++) { const a = k * N + i, b = k * N + (i + 1) % N, c = (k + 1) * N + i, d = (k + 1) * N + (i + 1) % N; idx.push(a, b, c, b, d, c); }     /* 上を向く面（前は下向きで上から見えなかった） */
      const g = new T.BufferGeometry(); g.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2)); g.setAttribute("aDepth", new T.Float32BufferAttribute(dep, 1)); g.setIndex(idx); g.computeVertexNormals();
      w.harborWater = w.water(g, HC.x, 0.07, HC.z, "harbor");
    }
    /* ── 岸：石のふち（上は 0.5m）と遊歩道の帯 ── */
    const ribbon = (key, o0, o1, y0, y1, vert) => {
      const pos = [], uv = [], idx = []; let acc = 0;
      for (let i = 0; i <= N; i++) { const j = i % N, [px, pz] = poly[j], [nx, nz] = nrm[j]; if (i) acc += Math.hypot(poly[j][0] - poly[(j + N - 1) % N][0], poly[j][1] - poly[(j + N - 1) % N][1]);
        if (vert) { pos.push(px + nx * o0, y0, pz + nz * o0, px + nx * o0, y1, pz + nz * o0); uv.push(acc / 3, 0, acc / 3, (y1 - y0) / 3); }
        else { pos.push(px + nx * o0, y0, pz + nz * o0, px + nx * o1, y1, pz + nz * o1); uv.push((px + nx * o0) / 4, (pz + nz * o0) / 4, (px + nx * o1) / 4, (pz + nz * o1) / 4); } }
      for (let i = 0; i < N; i++) { const a = i * 2; if (vert) idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); else idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
      const g = new T.BufferGeometry(); g.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); w.geo(key, g, 0, 0, 0);
    };
    ribbon("stoneW", 0, 0, 0.0, 0.52, true);            /* 水ぎわの石垣（内がわの面） */
    ribbon("stoneW", 0, 1.5, 0.52, 0.52);                /* ふちの上 */
    ribbon("paverWarm", 1.5, 14, 0.03, 0.03);             /* 遊歩道 */
    ribbon("stoneGray", 14, 14.6, 0.04, 0.04);            /* 遊歩道のふち */
    /* 手すり（ふちの上・支柱と横木） */
    w.detail(() => { for (let i = 0; i < N; i += 2) { const [px, pz] = poly[i], [nx, nz] = nrm[i]; if (Math.abs(Math.atan2(Math.sin(i / N * TAU - PIER_A), Math.cos(i / N * TAU - PIER_A))) < 0.08) continue; w.geo("darkMetal", new T.CylinderGeometry(0.05, 0.05, 1.0, 6), px + nx * 0.6, 1.02, pz + nz * 0.6); }
      const rp = poly.map(([px, pz], i) => new T.Vector3(px + nrm[i][0] * 0.6, 1.45, pz + nrm[i][1] * 0.6)); w.geo("chromeB", new T.TubeGeometry(new T.CatmullRomCurve3(rp, true), 480, 0.05, 5, true), 0, 0, 0); });
    const gapPier = (x, z) => Math.abs(Math.atan2(Math.sin(angOf(x, z) - PIER_A), Math.cos(angOf(x, z) - PIER_A))) < 0.045;
    w.colPolyline(poly.concat([poly[0]]).map(([x, z], i, arr) => { const j = i % N, [nx, nz] = nrm[j]; return [x + nx * 0.5, z + nz * 0.5]; }), 0.75, gapPier);
    (w.noGrassPoly = w.noGrassPoly || []).push(poly.map(([x, z], i) => [x + nrm[i][0] * 15, z + nrm[i][1] * 15]));
    w.forestOpen.push([HC.x, HC.z, 138]);
    (w.paved = w.paved || []);
    /* 遊歩道の街灯・ベンチ・植えこみ（外がわのふち） */
    for (let i = 0; i < N; i += 5) { const [px, pz] = poly[i], [nx, nz] = nrm[i], a = i / N * TAU; if (Math.abs(Math.atan2(Math.sin(a - PIER_A), Math.cos(a - PIER_A))) < 0.12 || Math.abs(Math.atan2(Math.sin(a + Math.PI / 2), Math.cos(a + Math.PI / 2))) < 0.2) continue;
      const ox = px + nx * 13, oz = pz + nz * 13; if (i % 10 === 0) w.yomaLamp(ox, oz, Math.atan2(-nx, -nz)); else if (i % 10 === 5) { w.bench(ox - nx * 1.2, oz - nz * 1.2, Math.atan2(-nx, -nz)); } }

    /* ── 北：MOUNT XEVARION（クリスタルの山・ほら穴の船だまり）── */
    buildMountain(w);
    /* ── 船の通る水路（山のほら穴 → 湖）── */
    {
      const [ex, ez] = lakePt(-Math.PI / 2, 0.97), cz0 = MT.z + MT.r * 0.62, len = ez - cz0, wd = 13;
      const g = new T.PlaneGeometry(wd, len); g.rotateX(-Math.PI / 2); w.water(g, HC.x, 0.07, (ez + cz0) / 2, "harbor");
      [-1, 1].forEach((s) => { w.box("stoneW", HC.x + s * (wd / 2 + 0.7), 0, (ez + cz0) / 2, 1.4, 0.52, len, {}); w.colObb(HC.x + s * (wd / 2 + 0.7), (ez + cz0) / 2, 1.4, len, 0); });
      (w.noGrass = w.noGrass || []).push([HC.x - wd / 2 - 2, cz0 - 2, HC.x + wd / 2 + 2, ez + 2]);
      /* 水路をまたぐ橋（遊歩道をつなぐ） */
      const bz = ez - 6; w.box("woodDeck", HC.x, 0.5, bz, wd + 4, 0.35, 5, {}); [-1, 1].forEach((s) => { w.box("darkMetal", HC.x, 0.85, bz + s * 2.4, wd + 4, 0.9, 0.12, {}); w.colObb(HC.x, bz + s * 2.55, wd + 4, 0.3, 0); });
      (w.heightExtra = w.heightExtra || []).push({ cx: HC.x, cz: bz, ang: 0, hw: wd / 2 + 2, hl: 2.4, y: 0.7 });
    }

    /* ── 南の港町（湖を向いた妖魔の店・未来のビル・大提灯の建物）── */
    const TOWN = [
      [0.42, "bld", 22, 16, 24, { key: "gTeal", roof: "flat", crown: "neonCyan", sign: { text: "HARBOR GALLERIA", bg: "#0a3a5a", w: 14, h: 1.8, y: 17 }, inside: { type: "shop", name: "ハーバー・ガレリア", h: 5.5, door: 5 } }],
      [0.62, "yoma", 20, 14, 11, { key: "yTeal", shop: "shopD", roof: "barrel", roofKey: "kwB", eyes: { iris: "irisB" }, sign: "海鮮食堂 うみかぜ", signColor: "#0a3a6a", noren: "norB", lanterns: 3, prop: "sushi", inside: { type: "food", name: "海鮮食堂 うみかぜ", menu: "sushi" } }],
      [0.8, "lantern", 9, 0, 16, { key: "lanBig", door: "diner", name: "大提灯茶屋" }],
      [0.98, "bld", 18, 15, 30, { key: "neonB", roof: "flat", crown: "neonPink", sign: { text: "STARLIGHT HOTEL", bg: "#1a0a3a", glow: "#ff4fb0", w: 12, h: 1.8, y: 26 }, inside: { type: "lobby", name: "スターライト・ホテル", h: 6, door: 4, deskSign: "STARLIGHT HOTEL  フロント", actLabel: "ロビーのソファで休む", text: "湖の見えるホテル。夜は水上パレードが窓から見えます（空想）。" } }],
      [1.16, "yoma", 22, 14, 12, { key: "yRed", shop: "shopA", roof: "kawara", roofKey: "kwK", rh: 5, eyes: false, sign: "港の茶屋 かもめ", signColor: "#6a0a0a", noren: "norK", lanterns: 4, prop: "dango", inside: { type: "cafe", name: "港の茶屋 かもめ", menu: "dango" } }],
      [1.36, "bld", 24, 16, 20, { key: "gPurple", roof: "flat", crown: "neonYellow", sign: { text: "CHASE THE LIGHT CAFÉ", bg: "#2a0a4a", glow: "#ffd84a", w: 16, h: 1.8, y: 16 }, inside: { type: "cafe", name: "チェイス・ザ・ライト カフェ", h: 5.5, door: 5, menu: "coffee" } }],
      [1.57, "gate"],
      [1.78, "bld", 24, 16, 22, { key: "gSilver", roof: "flat", crown: "neonCyan", sign: { text: "HARBOR THEATER", bg: "#0a1a3a", glow: "#4ff0ff", w: 14, h: 1.8, y: 18 }, inside: { type: "theater", name: "ハーバー・シアター", h: 11, door: 5, video: "harbortheater", screenTitle: "HARBOR THEATER" } }],
      [1.98, "yoma", 20, 14, 10, { key: "yPink", shop: "shopC", roof: "barrel", roofKey: "kwP", eyes: { iris: "irisC", look: -0.3 }, sign: "マリン雑貨 ほし屋", signColor: "#8a2a6a", noren: "norP", lanterns: 3, inside: { type: "shop", name: "マリン雑貨 ほし屋", items: [["船のボトルシップ", 3800, "びんの中の蒸気船"], ["灯台のランプ", 2600, "夜に光る"], ["いかりのキーホルダー", 700, "金色"], ["港の絵はがき", 400, "8枚セット"]] } }],
      [2.14, "bld", 18, 15, 34, { key: "gBlue", roof: "flat", crown: "neonWhite", sign: { text: "OCEAN VIEW TOWER", bg: "#0a2a5a", w: 12, h: 1.8, y: 30 }, inside: { type: "lobby", name: "オーシャンビュー・タワー", h: 6, door: 4, deskSign: "展望ロビー", actLabel: "湖をながめて休む" } }],
      [2.30, "yoma", 18, 14, 12, { key: "yCream", shop: "shopB", roof: "kawara", roofKey: "kwB", rh: 5, eyes: { iris: "irisA" }, sign: "焼きたてパン ベイカリー", signColor: "#6a4a1a", noren: "norO", lanterns: 3, prop: "donut", inside: { type: "cafe", name: "ベイカリー・ハーバー", menu: "cake" } }],
      [2.46, "lantern", 8, 0, 14, { key: "lanBig", door: "diner", name: "月見の提灯亭" }]
    ];
    TOWN.forEach(([a, kind, bw, bd, bh, o]) => {
      const r = edgeR(a) + 16 + (bd || 16) / 2, x = HC.x + Math.cos(a) * r, z = HC.z + Math.sin(a) * r, ry = Math.atan2(-Math.cos(a), -Math.sin(a));
      if (kind === "gate") { harborGate(w, HC.x + Math.cos(a) * (edgeR(a) + 26), HC.z + Math.sin(a) * (edgeR(a) + 26), ry); return; }
      if (kind === "bld") { w.bld(x, z, bw, bd, bh, Object.assign({ ry }, o)); ledStrip(w, x, z, bw, bd, bh, ry); }
      else if (kind === "yoma") w.yomaShop(x, z, bw, bd, bh, Object.assign({ ry }, o));
      else if (kind === "lantern") { const rr = bw, lx = HC.x + Math.cos(a) * (edgeR(a) + 16 + rr), lz = HC.z + Math.sin(a) * (edgeR(a) + 16 + rr); w.lanternBldg(lx, lz, rr, bh, { key: o.key, door: o.door, doorA: Math.atan2(HC.z - lz, HC.x - lx), name: o.name }); }
    });
    /* うしろの高いビル（湖の南の空を飾る） */
    [[300, -296, 24, 96, "gPurple", "neonPink"], [150, -282, 18, 64, "gSilver", "neonYellow"], [248, -282, 18, 72, "gBlue", "neonWhite"]].forEach(([x, z, s, h, key, cr]) => { w.skyscraper(x, z, s, s, h, { key, crown: cr, steps: 3, spire: 10 }); });

    /* ── 西：桟橋（スチーマーの乗り場）── */
    const [pwx, pwz] = lakePt(PIER_A);
    {
      const x0 = pwx + 1, len = 20, wd = 6, x1 = x0 + len;
      w.box("woodDeck", (x0 + x1) / 2, 0.25, pwz, len, 0.35, wd, {});
      for (let i = 0; i <= 5; i++) [-1, 1].forEach((s) => { const px = x0 + i * len / 5; w.geo("woodDark2", new T.CylinderGeometry(0.2, 0.2, 1.4, 8), px, 0.3, pwz + s * (wd / 2 - 0.2)); w.geo("darkMetal", new T.CylinderGeometry(0.05, 0.05, 1.0, 6), px, 1.1, pwz + s * (wd / 2 - 0.15)); });
      [-1, 1].forEach((s) => { w.geo("chromeB", new T.BoxGeometry(len, 0.06, 0.06), (x0 + x1) / 2, 1.55, pwz + s * (wd / 2 - 0.15)); w.colObb((x0 + x1) / 2, pwz + s * (wd / 2), len, 0.3, 0); });
      w.colObb(x1 + 0.2, pwz, 0.3, wd, 0);
      (w.heightExtra = w.heightExtra || []).push({ cx: (x0 + x1) / 2, cz: pwz, ang: 0, hw: len / 2, hl: wd / 2, y: 0.42 });
      w.box("pNavy", x0 - 6, 0, pwz - 5, 5, 3, 3, { collide: true }); w.sign("STEAMER DOCK  スチーマー乗り場", { bg: "#0a2a5a", color: "#fff", border: "#f2c04a", px: 1024 }, 7, 1.1, x0 - 6, 4.2, pwz - 3.4, Math.PI / 2);
      w.kiosk && w.kiosk(x0 - 8, pwz + 7, Math.PI / 2, "TICKETS", "#1a5aa8", "rBlue");
    }

    /* ── 東：灯台と要塞 ── */
    lighthouse(w, HC.x + edgeR(-0.32) * Math.cos(-0.32) + 10, HC.z + edgeR(-0.32) * Math.sin(-0.32) + 3);
    citadel(w, 318, -423);

    /* ── 船（昼の行き来）── */
    const boats = [];
    const loopCurve = (k, y) => new T.CatmullRomCurve3(Array.from({ length: 48 }, (_, i) => { const [x, z] = lakePt(i / 48 * TAU, k); return new T.Vector3(x, y, z); }), true);
    const cruiseC = loopCurve(0.66, 0.1), gondC = loopCurve(0.84, 0.1), cL = cruiseC.getLength(), gL = gondC.getLength();
    const steamers = [0, 1].map(() => { const g = w.captureGroup(() => steamerModel(w)); w.scene.add(g); w.loose(g, 600); return g; });
    const gondolas = [0, 1, 2, 3, 4].map((i) => { const g = w.captureGroup(() => gondolaModel(w, i)); w.scene.add(g); w.loose(g, 400); return g; });
    /* 乗れる：ハーバー・スチーマー（桟橋から1周） */
    let rideR = null;
    if (window.XRides) {
      const F = XRides.frames(cruiseC, true, false, 700);
      let s0 = 0, bd = 1e9; for (let i = 0; i < F.n; i++) { const d = Math.hypot(F.pos[i].x - pwx, F.pos[i].z - pwz); if (d < bd) { bd = d; s0 = i / F.n * F.L; } }
      rideR = (w.rides = w.rides || {}).harborSteamer = { id: "harborSteamer", name: "ハーバー・スチーマー", kind: "float", F, boat: steamers[0], s: s0, s0, v: 5.5, busy: false, keepBoat: true, cam: 5.2 };
      w.interact(pwx + 19, pwz, 4.2, "ハーバー・スチーマーで湖を1周（E でおりる）", () => ({ rideId: "harborSteamer" }), "🛳️");
    }
    let hu = 0;
    w.anim.push((dt, t) => {
      hu = (hu + dt * 5.5 / cL) % 1;
      const p = new T.Vector3(), q = new T.Vector3();
      steamers.forEach((g, i) => { if (i === 0 && rideR && rideR.busy) return; if (w.harborShowOn) { g.visible = false; return; } g.visible = true; const u = (hu + i * 0.5) % 1; cruiseC.getPointAt(u, p); cruiseC.getPointAt((u + 0.004) % 1, q); g.position.set(p.x, 0.1 + Math.sin(t * 1.3 + i) * 0.04, p.z); g.rotation.set(0, Math.atan2(q.x - p.x, q.z - p.z), Math.sin(t * 0.9 + i) * 0.02); });
      gondolas.forEach((g, i) => { if (w.harborShowOn) { g.visible = false; return; } g.visible = true; const u = (t * 1.6 / gL + i / 5) % 1; gondC.getPointAt(u, p); gondC.getPointAt((u + 0.004) % 1, q); g.position.set(p.x, 0.12 + Math.sin(t * 1.7 + i) * 0.05, p.z); g.rotation.set(0, Math.atan2(q.x - p.x, q.z - p.z), Math.sin(t * 1.2 + i * 2) * 0.03); });
    });

    /* ── 門（西・南）と道 ── */
    w.route([[40, -176], [84, -212], [104, -262], [116, -292]], 10, "paverWarm",          /* ★★ 2026-09-30b ピットの建物の東のはしをよける */ { lamps: "modern", lampEvery: 22, trees: 20, benches: false });
    w.route([[236, -148], [236, -210], [226, -262], [214, -296]], 10, "paverWarm", { lamps: "modern", lampEvery: 22, trees: 20, benches: false });
    w.areaGate(116, -292, -0.62, "harbor", "big");
    w.areaGate(214, -296, 0.22, "harbor", "big");
    w.plazaCrowd(HC.x, HC.z + edgeR(Math.PI / 2) + 8, 40, 1.4);
    (w.crowdSpots || []).push && w.plazas.push([HC.x, HC.z + edgeR(Math.PI / 2) + 8, 30, 1.2]);

    /* ── 夜のショーの道具 ── */
    buildShow(w, poly, nrm);
    w.interact(HC.x, HC.z + edgeR(Math.PI / 2) + 6, 4, "水上パレード「CHASE THE LIGHT」を始める（夜）", () => ({ harborShow: true }), "🚢");
    w.harborInfo = { HC, lakePt, edgeR, MT };
  };

  /* 屋根のふちの光の帯（ショーで曲に合わせて光る） */
  function ledStrip(w, x, z, bw, bd, bh, ry) {
    const c = Math.cos(ry), s = Math.sin(ry), L = (a, b) => [x + a * c + b * s, z - a * s + b * c];
    const keys = ["showA", "showB", "showC"];
    [[0, bd / 2 + 0.08, bw, 0.12], [0, -bd / 2 - 0.08, bw, 0.12], [bw / 2 + 0.08, 0, 0.12, bd], [-bw / 2 - 0.08, 0, 0.12, bd]].forEach(([a, b, lw, ld], i) => { const [px, pz] = L(a, b); w.box(keys[(Math.round(x + z) + i) % 3], px, bh - 0.4, pz, lw, 0.22, ld, { ry }); });
    for (let k = 1; k < 4; k++) { const [px, pz] = L(0, bd / 2 + 0.08); w.box(keys[k % 3], px, bh * k / 4, pz, bw, 0.1, 0.1, { ry }); }
  }
  /* 港の門（アーチ） */
  function harborGate(w, x, z, ry) {
    const c = Math.cos(ry), s = Math.sin(ry), span = 16;
    [-1, 1].forEach((k) => { const px = x + k * span / 2 * c, pz = z - k * span / 2 * s; w.box("stoneW", px, 0, pz, 2.2, 12, 2.2, { collide: true, ry }); w.box("goldOrn", px, 12, pz, 2.6, 0.6, 2.6, { ry }); w.geo("glassDome", new T.OctahedronGeometry(1.2, 0), px, 14, pz); w.eyes(px + s * 1.15, pz + c * 1.15, 8.5, ry, 0.45, 1.1, "irisB", 0); });
    const arc = new T.TorusGeometry(span / 2, 0.6, 10, 40, Math.PI); arc.rotateY(ry); w.geo("stoneW", arc, x, 11, z); const arc2 = new T.TorusGeometry(span / 2 + 0.7, 0.18, 6, 40, Math.PI); arc2.rotateY(ry); w.geo("showB", arc2, x, 11, z);
    w.sign("XEVARION HARBOR", { bg: "#0a2a5a", color: "#fff", glow: "#7fd8ff", border: "#f2c04a", px: 1024, both: true }, 12, 1.8, x, 9.2, z, ry);
    w.caster(x, z, span + 2, 2.4, 14, ry);
  }
  /* 山（クリスタルの冠・ほら穴・溶岩のすじ・滝） */
  function buildMountain(w) {
    const { x, z, r, h } = MT;
    const mk = (R, H, seg, seed) => { const g = new T.ConeGeometry(R, H, 48, seg), pp = g.attributes.position; for (let i = 0; i < pp.count; i++) { const px = pp.getX(i), py = pp.getY(i), pz = pp.getZ(i), a = Math.atan2(pz, px), t = (py + H / 2) / H; const n = Math.sin(a * 5 + seed) * 0.1 + Math.sin(a * 11 + py * 0.15 + seed) * 0.06 + Math.sin(py * 0.3 + a * 3) * 0.05; const k = 1 + n * (0.5 + t); pp.setXYZ(i, px * k, py, pz * k); } g.computeVertexNormals(); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 10, uv.getY(i) * 7); return g; };
    const lm = w._landmark; w._landmark = true;
    w.geo("rock", mk(r, h, 18, 1), x, h / 2 - 1, z); w.geo("rockRed", mk(r * 0.6, h * 0.62, 12, 3), x - r * 0.62, h * 0.31 - 1, z - r * 0.1); w.geo("rock", mk(r * 0.55, h * 0.5, 10, 5), x + r * 0.66, h * 0.25 - 1, z - r * 0.2);
    /* クリスタルの冠 */
    w.geo("glassDome", new T.OctahedronGeometry(7, 0).scale(1, 1.6, 1), x, h + 7, z); w.geo("showB", new T.OctahedronGeometry(4.2, 0).scale(1, 1.6, 1), x, h + 7, z);
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; w.geo("glassDomeP", new T.OctahedronGeometry(2.4, 0).scale(1, 1.8, 1).rotateZ(Math.cos(a) * 0.4).rotateX(Math.sin(a) * 0.4), x + Math.cos(a) * 6, h + 1.5, z + Math.sin(a) * 6); }
    const ring = new T.TorusGeometry(10, 0.3, 8, 48); ring.rotateX(Math.PI / 2); w.geo("showA", ring, x, h + 2, z);
    w._landmark = lm;
    /* 溶岩のすじ（ショーで赤く光る） */
    for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.32, pts = []; for (let k = 0; k <= 8; k++) { const t = k / 8, yy = h * (0.92 - t * 0.75), rr = r * (1 - yy / h) + 0.4; pts.push(new T.Vector3(x + Math.cos(a + Math.sin(k * 1.7 + i) * 0.06) * rr, yy, z - Math.sin(-a) * 0 + Math.sin(a + Math.sin(k * 1.7 + i) * 0.06) * rr)); } w.geo("showC", new T.TubeGeometry(new T.CatmullRomCurve3(pts), 24, 0.35, 5, false), 0, 0, 0); }
    /* ほら穴（船だまり）：南の面に黒いアーチ */
    const cz = z + r * 0.7; w.geo("pBlack", new T.CylinderGeometry(7.5, 7.5, 6, 20, 1, true, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2).rotateY(0), x, 0, cz); w.geo("pBlack", new T.CircleGeometry(7.4, 20, 0, Math.PI), x, 0.05, cz - 3);
    w.geo("stoneGray", new T.TorusGeometry(7.8, 0.7, 8, 24, Math.PI), x, 0.1, cz + 2.6);
    w.colCircle(x, z, r * 0.93); w.colCircle(x - r * 0.62, z - r * 0.1, r * 0.58); w.colCircle(x + r * 0.66, z - r * 0.2, r * 0.52); w.casterCircle(x, z, r * 0.85, h * 0.7);
    /* 滝（西の肩から湖へ） */
    const fc = X.cv(64, 256), fg = fc.getContext("2d"); fg.fillStyle = "rgba(220,245,255,.4)"; fg.fillRect(0, 0, 64, 256); for (let i = 0; i < 50; i++) { fg.fillStyle = "rgba(255,255,255," + (0.3 + Math.random() * 0.6) + ")"; fg.fillRect(Math.random() * 64, 0, 2 + Math.random() * 4, 256); }
    const ft = X.tex(fc); ft.wrapT = T.RepeatWrapping;
    const fall = new T.Mesh(new T.PlaneGeometry(8, h * 0.5), new T.MeshBasicMaterial({ map: ft, color: 0xcff0ff, transparent: true, opacity: 0.85, side: T.DoubleSide, depthWrite: false }));
    fall.position.set(x - r * 0.72, h * 0.25, z + r * 0.45); fall.rotation.y = -0.6; fall.rotateX(-0.25); w.scene.add(fall); w.loose(fall, 500); w.anim.push((dt, t) => { ft.offset.y = -t * 1.3; });
    w.forestOpen.push([x, z, r + 10]);
    w.eyes(x - 3.2, z + r * 0.78, h * 0.34, 0, 2.2, 6.4, "irisE", 0);     /* 山の目（妖魔の山） */
  }
  function lighthouse(w, x, z) {
    const H = 30;
    w.geo("stoneGray", new T.CylinderGeometry(6, 7, 2.4, 24), x, 1.2, z); w.colCircle(x, z, 6.4);
    for (let i = 0; i < 6; i++) w.geo(i % 2 ? "pRed" : "pWhite", new T.CylinderGeometry(3.4 - i * 0.22, 3.6 - i * 0.22, H / 6, 20), x, 2.4 + (i + 0.5) * H / 6, z);
    w.geo("darkMetal", new T.CylinderGeometry(3.4, 3.4, 0.4, 20), x, H + 2.6, z); w.geo("glassClear", new T.CylinderGeometry(1.9, 1.9, 3, 16), x, H + 4.3, z); w.geo("showW", new T.SphereGeometry(1.1, 16, 12), x, H + 4.3, z); w.geo("rRed", new T.ConeGeometry(2.4, 2.4, 16), x, H + 7, z);
    const bm = new T.MeshBasicMaterial({ color: 0xfff2c8, transparent: true, opacity: 0.16, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false, side: T.DoubleSide });
    const piv = new T.Group(); piv.position.set(x, H + 4.3, z); const cone = new T.Mesh(new T.CylinderGeometry(0.6, 9, 140, 16, 1, true).rotateZ(Math.PI / 2).translate(70, 0, 0), bm); piv.add(cone); piv.layers.set(3); cone.layers.set(3); w.scene.add(piv);
    w.anim.push((dt, t) => { piv.rotation.y = t * 0.6; piv.visible = (window.XFX && XFX.cur && XFX.cur.night > 0.35) || !!w.harborShowOn; });     /* 夜だけ（昼は光の柱を出さない） */
    w.harborBeam = { piv, cone };
    w.sign("XEVARION LIGHTHOUSE", { bg: "#1a2a4a", color: "#fff", px: 512 }, 6, 0.9, x, 2.2, z + 6.1, 0);
  }
  function citadel(w, x, z) {
    /* 石の城壁＋四すみの塔＋ガラスのドーム（中は港の博物館） */
    w.bld(x, z, 26, 20, 12, { key: "stoneW", roof: "flat", roofKey: "stoneGray", ry: -Math.PI / 2, sign: { text: "XEVARION CITADEL", bg: "#3a2a1a", w: 12, h: 1.4, y: 9.5 }, inside: { type: "gallery", name: "港の博物館（シタデル）", h: 7, door: 4, list: [["はじまりの灯台", "港を見守ってきた灯台の古い模型。"], ["水の妖怪の伝説", "湖に住むという、光る魚の妖怪の絵巻（空想）。"], ["未来の港", "空飛ぶ船が行き来する 100 年後の港の想像図。"], ["船の羅針盤", "迷わず進むための、星の地図とコンパス。"]] } });
    [[-12, -9], [12, -9], [-12, 9], [12, 9]].forEach(([a, b]) => { w.turret(x + b, z - a, 2.6, 18, "stoneW", "rRed", false); });
    w.dome(x, z, 7, "glassDome", "goldOrn", 12, true);
  }
  /* 蒸気船・ゴンドラの形（captureGroup の中で呼ぶ・長さ方向は +z） */
  function steamerModel(w) {
    w.geo("pWhite", new T.BoxGeometry(5, 1.4, 16).translate(0, 0.5, 0)); w.geo("pNavy", new T.BoxGeometry(5.1, 0.35, 16.1).translate(0, -0.05, 0)); w.geo("pRed", new T.ConeGeometry(2.55, 3, 4).rotateX(Math.PI / 2).rotateZ(Math.PI / 4).scale(1, 0.55, 1).translate(0, 0.55, 9.3));
    w.geo("woodDeck", new T.BoxGeometry(4.6, 0.12, 15.4).translate(0, 1.25, 0)); w.geo("offWhite", new T.BoxGeometry(3.6, 2.2, 7).translate(0, 2.4, -1.5)); w.geo("windowDark", new T.BoxGeometry(3.7, 0.8, 6.6).translate(0, 2.7, -1.5)); w.geo("pNavy", new T.BoxGeometry(4, 0.2, 7.6).translate(0, 3.6, -1.5));
    w.geo("pRed", new T.CylinderGeometry(0.6, 0.7, 3.4, 12).translate(0, 5.2, -1)); w.geo("pBlack", new T.CylinderGeometry(0.64, 0.64, 0.5, 12).translate(0, 6.9, -1));
    [-1, 1].forEach((s) => { w.geo("pRed", new T.CylinderGeometry(2.1, 2.1, 0.8, 16).rotateZ(Math.PI / 2).translate(s * 2.9, 1.0, -4)); w.geo("chromeB", new T.TorusGeometry(1.3, 0.08, 4, 16).rotateY(Math.PI / 2).translate(s * 3.35, 1.0, -4)); });
    for (let i = 0; i < 8; i++) w.geo(["lanR", "lanY", "lanW"][i % 3], new T.SphereGeometry(0.22, 8, 6).translate(i < 4 ? -2.3 : 2.3, 2.1, -6 + (i % 4) * 4));
    w.sign("XEVA 号", { bg: "#0a2a5a", color: "#fff", px: 256, both: true }, 2.6, 0.6, 0, 1.0, 8.05, 0);
  }
  function gondolaModel(w, i) {
    w.geo(["pBlack", "pNavy", "woodRed", "pBlack", "pPurple"][i % 5], new T.BoxGeometry(1.4, 0.5, 8).translate(0, 0.25, 0)); w.geo("goldOrn", new T.BoxGeometry(0.3, 1.4, 0.3).rotateX(-0.4).translate(0, 0.9, 3.9)); w.geo("goldOrn", new T.BoxGeometry(0.2, 0.9, 0.2).rotateX(0.4).translate(0, 0.7, -3.9));
    w.geo("seatsRed", new T.BoxGeometry(1.1, 0.35, 1.4).translate(0, 0.62, 0.6)); w.geo("pWhite", new T.CylinderGeometry(0.22, 0.22, 1.2, 8).translate(0, 1.2, -2.6)); w.geo("pRed", new T.SphereGeometry(0.2, 8, 6).translate(0, 1.95, -2.6)); w.geo("woodDark2", new T.CylinderGeometry(0.04, 0.04, 3.4, 5).rotateX(0.5).translate(0.5, 1.4, -2.1));
    w.lantern(0, 0.9, 3.4, 0.35, ["lanR", "lanY", "lanW"][i % 3]);
  }

  /* ══════════════ 夜のショーの道具（船・噴水・サーチライト・レーザー・花火・炎・水の幕） ══════════════ */
  function buildShow(w, poly, nrm) {
    /* パレードの道：山のほら穴 → 水路 → 湖を1周 → 水路 → ほら穴（ほら穴の中から出てくる＝見えない所から始まる） */
    const pts = [[HC.x, MT.z + MT.r * 0.5], [HC.x, MT.z + MT.r * 0.95]];
    const [ex, ez] = lakePt(-Math.PI / 2, 0.97); pts.push([ex, ez + 6]);
    for (let i = 0; i <= 64; i++) { const a = -Math.PI / 2 + 0.25 + i / 64 * (TAU - 0.5), k = 0.66 + 0.06 * Math.sin(a * 2); const [x, z] = lakePt(a, k); pts.push([x, z]); }
    pts.push([ex, ez + 6], [HC.x, MT.z + MT.r * 0.95], [HC.x, MT.z + MT.r * 0.5]);
    const curve = new T.CatmullRomCurve3(pts.map(([x, z]) => new T.Vector3(x, 0.12, z)), false, "centripetal"), L = curve.getLength();
    const mk = (fn) => { const g = w.captureGroup(fn); g.visible = false; g.traverse((o) => { o.layers.set(3); }); w.scene.add(g); return g; };
    const hull = (len, key) => { w.geo(key || "pNavy", new T.BoxGeometry(6, 1.1, len).translate(0, 0.45, 0)); w.geo("showA", new T.BoxGeometry(6.1, 0.14, len + 0.1).translate(0, 0.95, 0)); w.geo("showB", new T.BoxGeometry(6.12, 0.1, len + 0.12).translate(0, 0.2, 0)); w.geo(key || "pNavy", new T.ConeGeometry(3.05, 3, 4).rotateX(Math.PI / 2).rotateZ(Math.PI / 4).scale(1, 0.4, 1).translate(0, 0.45, len / 2 + 1.4)); };
    const B = [];
    /* 1 クリスタル号（先頭） */
    B.push(mk(() => { hull(16, "pNavy"); w.geo("glassDome", new T.OctahedronGeometry(3.4, 0).scale(1, 1.6, 1).translate(0, 7, 0)); w.geo("showB", new T.OctahedronGeometry(2.2, 0).scale(1, 1.6, 1).translate(0, 7, 0)); w.geo("showA", new T.TorusGeometry(4.6, 0.18, 6, 48).rotateX(Math.PI / 2).translate(0, 7, 0)); w.geo("showC", new T.TorusGeometry(3.8, 0.14, 6, 48).rotateX(1.1).translate(0, 7, 0)); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; w.geo("goldOrn", new T.OctahedronGeometry(0.5, 0).translate(Math.cos(a) * 2.4, 2, Math.sin(a) * 5.5)); } w.sign("CHASE THE LIGHT", { bg: "#0a1a4a", color: "#fff", glow: "#7fd8ff", px: 1024, both: true }, 5.6, 0.8, 0, 1.6, 8.05, 0); }));
    /* 2 竜の提灯（オリジナル） */
    B.push(mk(() => { hull(18, "woodRed"); for (let i = 0; i < 9; i++) { const zz = -7 + i * 1.8, yy = 2.6 + Math.sin(i * 0.9) * 1.2; w.geo(i % 2 ? "lanR" : "lanY", new T.SphereGeometry(1.0 - i * 0.04, 12, 10).scale(1, 0.9, 1.2).translate(0, yy, zz)); w.geo("showC", new T.TorusGeometry(0.95 - i * 0.04, 0.06, 4, 16).translate(0, yy, zz)); } w.geo("pRed", new T.BoxGeometry(2.2, 1.6, 2.4).translate(0, 4.4, 8.2)); w.geo("goldOrn", new T.ConeGeometry(0.3, 1.6, 6).rotateX(-0.6).translate(-0.7, 5.6, 8.6)); w.geo("goldOrn", new T.ConeGeometry(0.3, 1.6, 6).rotateX(-0.6).translate(0.7, 5.6, 8.6)); w.eyes(0, 9.45, 4.7, 0, 0.35, 1.2, "irisE", 0); }));
    /* 3 くらげ */
    B.push(mk(() => { hull(14, "pPurple"); [[0, 5.2, 0, 2.6], [-2, 3.6, -3.5, 1.5], [2, 3.8, 3.5, 1.7]].forEach(([x, y, z, r]) => { w.geo("glassDomeP", new T.SphereGeometry(r, 16, 10, 0, TAU, 0, Math.PI / 2).translate(x, y, z)); w.geo("showB", new T.SphereGeometry(r * 0.6, 12, 8, 0, TAU, 0, Math.PI / 2).translate(x, y + 0.05, z)); for (let k = 0; k < 7; k++) { const a = k / 7 * TAU; w.geo("showA", new T.CylinderGeometry(0.05, 0.02, y - 1.2, 4).translate(x + Math.cos(a) * r * 0.6, (y - 1.2) / 2 + 1.1, z + Math.sin(a) * r * 0.6)); } }); }));
    /* 4 妖魔の目の塔 */
    B.push(mk(() => { hull(15, "pBlack"); w.pagodaTower(0, 0, 3.2, 2, { roofKey: "kwP" }); w.geo("propWhite", new T.SphereGeometry(1.8, 18, 14).translate(0, 8.6, 0)); w.eyes(0, 1.75, 8.6, 0, 0.9, 1.8, "irisC", 0); w.geo("showC", new T.TorusGeometry(2.3, 0.1, 5, 32).rotateX(Math.PI / 2).translate(0, 8.6, 0)); }));
    /* 5 桜の塔 */
    B.push(mk(() => { hull(15, "woodRed"); w.pagodaTower(0, 0, 3.0, 3, { roofKey: "kwG" }); for (let i = 0; i < 12; i++) w.geo("propPink", new T.IcosahedronGeometry(0.8, 1).translate(Math.cos(i) * 2.2, 3.4 + (i % 3) * 0.6, Math.sin(i) * 4.5)); for (let i = 0; i < 6; i++) w.lantern(i < 3 ? -2.6 : 2.6, 1.2, -4 + (i % 3) * 4, 0.6, "lanR"); }));
    /* 6 ロケット */
    B.push(mk(() => { hull(14, "pNavy"); w.geo("rocketW", new T.CylinderGeometry(1.0, 1.0, 7, 16).translate(0, 4.8, -1)); w.geo("rocketR", new T.ConeGeometry(1.0, 2.2, 16).translate(0, 9.4, -1)); for (let k = 0; k < 3; k++) { const a = k / 3 * TAU; w.geo("rocketR", new T.BoxGeometry(0.2, 2, 1.4).translate(Math.cos(a) * 1.1, 2.2, -1 + Math.sin(a) * 1.1)); } w.geo("showC", new T.ConeGeometry(0.9, 2.2, 12).rotateX(Math.PI).translate(0, 0.7, -1)); w.geo("propYellow", new T.SphereGeometry(1.2, 16, 12).translate(-1.6, 3.4, 4)); w.geo("goldOrn", new T.TorusGeometry(1.6, 0.08, 5, 32).rotateX(1.2).translate(-1.6, 3.4, 4)); }));
    /* 7 きつねの青い火（オリジナル） */
    B.push(mk(() => { hull(15, "pWhite"); w.geo("propWhite", new T.SphereGeometry(2.0, 18, 14).scale(1, 0.9, 1.1).translate(0, 4.6, 1)); [-1, 1].forEach((s) => w.geo("propWhite", new T.ConeGeometry(0.7, 2.0, 8).rotateZ(-s * 0.35).translate(s * 1.2, 6.6, 1))); w.geo("propWhite", new T.ConeGeometry(0.8, 1.8, 10).rotateX(Math.PI / 2).translate(0, 4.2, 3.1)); w.eyes(0, 2.95, 5.0, 0, 0.35, 1.2, "irisB", 0); for (let i = 0; i < 5; i++) w.geo("showB", new T.SphereGeometry(0.45, 10, 8).scale(1, 1.6, 1).translate(Math.cos(i * 1.26) * 2.6, 2.4 + (i % 2) * 0.8, -3.5 + Math.sin(i * 1.26) * 1.5)); for (let i = 0; i < 4; i++) w.geo("propWhite", new T.SphereGeometry(0.9 - i * 0.12, 12, 10).translate(0.3 * i, 2.6 + i * 0.6, -3 - i * 1.1)); }));
    /* 8 音楽のステージ */
    B.push(mk(() => { hull(16, "pBlack"); w.geo("stageTop", new T.BoxGeometry(5.4, 0.3, 10).translate(0, 1.2, 0)); [-1, 1].forEach((s) => { w.geo("pBlack", new T.BoxGeometry(1.6, 3.4, 1.4).translate(s * 2.2, 2.9, -4)); w.geo("showA", new T.CylinderGeometry(0.5, 0.5, 0.06, 16).rotateX(Math.PI / 2).translate(s * 2.2, 3.4, -3.26)); w.geo("showC", new T.CylinderGeometry(0.34, 0.34, 0.06, 16).rotateX(Math.PI / 2).translate(s * 2.2, 2.2, -3.26)); }); w.neonIcon("note", 0, 5.2, -4.2, 1.2, 0, "neonYellow"); for (let i = 0; i < 4; i++) w.geo("showB", new T.CylinderGeometry(0.06, 0.06, 5, 4).rotateZ((i - 1.5) * 0.3).translate((i - 1.5) * 1.2, 3.6, 3)); }));
    /* 9 星のくじら（オリジナル） */
    B.push(mk(() => { hull(18, "pNavy"); w.geo("pNavy", new T.SphereGeometry(3.0, 20, 14).scale(1, 0.8, 1.8).translate(0, 4.2, 0)); w.geo("pNavy", new T.ConeGeometry(1.6, 3, 10).rotateX(-Math.PI / 2).scale(1.8, 0.4, 1).translate(0, 5.2, -6.2)); for (let i = 0; i < 26; i++) { const a = i * 2.4, b = (i % 7) / 7 * Math.PI; w.geo("showW", new T.OctahedronGeometry(0.16, 0).translate(Math.cos(a) * Math.sin(b) * 3.05, 4.2 + Math.cos(b) * 2.4, Math.sin(a) * Math.sin(b) * 5.4)); } w.eyes(0, 5.2, 4.8, 0, 0.35, 3.6, "irisA", 0); for (let k = 0; k < 5; k++) w.geo("showB", new T.CylinderGeometry(0.08, 0.02, 3, 4).rotateZ((k - 2) * 0.25).translate((k - 2) * 0.5, 8.4, 2)); }));
    /* 10 花火の船 */
    B.push(mk(() => { hull(14, "pRed"); for (let i = 0; i < 6; i++) w.geo("darkMetal", new T.CylinderGeometry(0.35, 0.35, 2.2, 10).rotateX((i - 2.5) * 0.08).translate((i % 2 ? -1 : 1) * 1.4, 2.1, -4 + i * 1.6)); w.geo("showC", new T.TorusGeometry(2.6, 0.12, 5, 32).rotateX(Math.PI / 2).translate(0, 3.4, 0)); }));
    /* 11 提灯のカヌー3そう（ひとまとめ） */
    B.push(mk(() => { [-4, 0, 4].forEach((zz, i) => { w.geo("woodRed", new T.BoxGeometry(1.6, 0.6, 4).translate((i - 1) * 2.4, 0.3, zz)); w.lantern((i - 1) * 2.4, 0.7, zz, 0.7, ["lanR", "lanY", "lanW"][i]); w.geo("showA", new T.SphereGeometry(0.25, 8, 6).translate((i - 1) * 2.4, 2.2, zz)); }); }));
    /* 12 王冠のフィナーレ船 */
    B.push(mk(() => { hull(18, "pWhite"); w.geo("goldOrn", new T.CylinderGeometry(3.2, 3.6, 2.2, 24, 1, true).translate(0, 3.2, 0)); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; w.geo("goldOrn", new T.ConeGeometry(0.5, 1.8, 6).translate(Math.cos(a) * 3.3, 5.2, Math.sin(a) * 3.3)); w.geo(["showA", "showB", "showC"][i % 3], new T.SphereGeometry(0.34, 10, 8).translate(Math.cos(a) * 3.3, 6.3, Math.sin(a) * 3.3)); } w.geo("glassDome", new T.SphereGeometry(2.0, 18, 12).translate(0, 5.8, 0)); w.geo("showW", new T.OctahedronGeometry(1.0, 0).translate(0, 5.8, 0)); w.sign("XEVARION", { bg: "#6a4a0a", color: "#fff", glow: "#ffd84a", px: 512, both: true }, 5.4, 0.8, 0, 1.4, 9.05, 0); }));
    /* 13 提供 NGX（最後の船）★★ 2026-09-30 ご指定「パレードやショーの提供は最後の車や船などに追加して記載」 */
    { const lg = "ngxLogo"; if (!w.m[lg]) w.m[lg] = new T.MeshBasicMaterial({ map: X.imgTex("img/ngx_logo.webp"), transparent: true, toneMapped: false, side: T.DoubleSide, depthWrite: false });
      B.push(mk(() => { hull(16, "pNavy"); w.geo("white2", new T.BoxGeometry(0.5, 4.4, 10).translate(0, 3.6, 0)); w.geo("goldOrn", new T.BoxGeometry(0.6, 0.24, 10.4).translate(0, 5.9, 0)); w.geo("goldOrn", new T.BoxGeometry(0.6, 0.24, 10.4).translate(0, 1.4, 0));
        w.geo(lg, new T.PlaneGeometry(9, 3.3).rotateY(Math.PI / 2).translate(0.28, 3.7, 0)); w.geo(lg, new T.PlaneGeometry(9, 3.3).rotateY(-Math.PI / 2).translate(-0.28, 3.7, 0));
        w.sign("提供　NGX", { bg: "#0a1450", color: "#fff", glow: "#ffd86a", border: "#ffd86a", px: 512 }, 5, 0.9, 0.3, 6.7, 0, Math.PI / 2); w.sign("提供　NGX", { bg: "#0a1450", color: "#fff", glow: "#ffd86a", border: "#ffd86a", px: 512 }, 5, 0.9, -0.3, 6.7, 0, -Math.PI / 2);
        w.geo("showB", new T.BoxGeometry(0.62, 0.12, 10.5).translate(0, 6.1, 0)); })); }
    /* 船の光の輪（水にうつる光）*/
    const glowTex = (() => { const c = X.cv(128, 128), g = c.getContext("2d"), gr = g.createRadialGradient(64, 64, 0, 64, 64, 62); gr.addColorStop(0, "rgba(255,255,255,.9)"); gr.addColorStop(0.4, "rgba(255,255,255,.35)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return X.tex(c); })();
    const halos = B.map(() => { const m = new T.Mesh(new T.PlaneGeometry(26, 26).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ map: glowTex, color: 0xff4fb0, transparent: true, opacity: 0.0, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false })); m.visible = false; m.layers.set(3); w.scene.add(m); return m; });
    /* 噴水：南の岸に沿って24本＋湖のまん中の輪に24本（高さは曲で） */
    const NJ = 48, per = MOBILE ? 50 : 90, NP = NJ * per, jg = new T.BufferGeometry(), seed = new Float32Array(NP * 3), base = new Float32Array(NJ * 3);
    for (let k = 0; k < NJ; k++) { let x, z; if (k < 24) { const a = 0.35 + k / 23 * (Math.PI - 0.7); [x, z] = lakePt(a, 0.93); } else { const a = (k - 24) / 24 * TAU; x = HC.x + Math.cos(a) * 28; z = HC.z + 6 + Math.sin(a) * 24; } base[k * 3] = x; base[k * 3 + 1] = 0.3; base[k * 3 + 2] = z; }
    for (let i = 0; i < NP; i++) { seed[i * 3] = Math.floor(i / per); seed[i * 3 + 1] = Math.random(); seed[i * 3 + 2] = Math.random(); }
    jg.setAttribute("position", new T.BufferAttribute(new Float32Array(NP * 3), 3)); jg.setAttribute("aSeed", new T.BufferAttribute(seed, 3));
    const dot = X.cv(64, 64), dg = dot.getContext("2d"), gr = dg.createRadialGradient(32, 32, 0, 32, 32, 30); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.5, "rgba(230,248,255,.7)"); gr.addColorStop(1, "rgba(200,240,255,0)"); dg.fillStyle = gr; dg.fillRect(0, 0, 64, 64);
    const JU = { uT: XP.TIME, uH: { value: new Float32Array(NJ) }, uB: { value: base }, uHue: { value: 0 }, uScale: { value: 400 }, uAmp: { value: 0 }, uMap: { value: X.tex(dot) } };
    const jm = new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: JU,
      vertexShader: [
        "attribute vec3 aSeed; uniform float uT, uH[" + NJ + "], uB[" + (NJ * 3) + "], uHue, uScale, uAmp; varying vec3 vC; varying float vA;",
        "vec3 hsl(float h){ vec3 k = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); return 0.3 + 0.7 * k; }",
        "void main(){ int j = int(aSeed.x); float hh = 0.0; vec3 b = vec3(0.0); for (int k = 0; k < " + NJ + "; k++) if (k == j) { hh = uH[k]; b = vec3(uB[k * 3], uB[k * 3 + 1], uB[k * 3 + 2]); }",
        "  float t = fract(aSeed.y + uT * 0.6), lean = sin(uT * 0.8 + aSeed.x) * 0.18; vec3 dir = normalize(vec3(lean, 1.0, 0.0));",
        "  float h = hh * uAmp; vec3 p = b + dir * (t * h) + vec3(0.0, -t * t * h * 0.35, 0.0); p.xz += (aSeed.z - 0.5) * 0.5;",
        "  vec4 mv = viewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = step(0.2, h) * 0.9 * uScale / max(1.0, -mv.z);",
        "  vC = hsl(fract(uHue + aSeed.x / 48.0)) * 2.2; vA = (1.0 - t) * step(0.2, h); }"].join("\n"),
      fragmentShader: "uniform sampler2D uMap; varying vec3 vC; varying float vA; void main(){ vec4 c = texture2D(uMap, gl_PointCoord); if (c.a * vA < 0.02) discard; gl_FragColor = vec4(vC * c.rgb, c.a * vA * 0.8);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}" });
    const jets = new T.Points(jg, jm); jets.frustumCulled = false; jets.visible = false; jets.layers.set(3); w.scene.add(jets);
    /* サーチライト（山・灯台・ビル）・レーザー */
    const sm = new T.MeshBasicMaterial({ color: 0xbfd8ff, transparent: true, opacity: 0.12, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false, fog: false });
    const bm = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false });
    const searches = [], lasers = [];
    [[MT.x - 18, 16, MT.z + 10], [MT.x + 18, 16, MT.z + 10], [92, 90, -300], [300, 100, -296], [150, 68, -282], [248, 76, -282], [313, 20, -392], [HC.x - 70, 2, HC.z + 60]].forEach(([x, y, z], i) => { const piv = new T.Group(); piv.position.set(x, y, z); const cone = new T.Mesh(new T.CylinderGeometry(0.4, 8, 200, 18, 1, true).translate(0, 100, 0), sm.clone()); piv.add(cone); piv.visible = false; piv.layers.set(3); cone.layers.set(3); w.scene.add(piv); searches.push({ piv, cone, i }); });
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, [x, z] = lakePt(a, 1.02); const piv = new T.Group(); piv.position.set(x, 1.2, z); const ln = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 180, 5, 1, true).translate(0, 90, 0), bm.clone()); piv.add(ln); piv.visible = false; piv.layers.set(3); ln.layers.set(3); w.scene.add(piv); lasers.push({ piv, ln, a, i }); }
    /* 花火・炎（点の粒） */
    const mkPts = (n, size, tex) => { const fp = new Float32Array(n * 3), fc = new Float32Array(n * 3), g = new T.BufferGeometry(); for (let i = 0; i < n; i++) fp[i * 3 + 1] = -999; g.setAttribute("position", new T.BufferAttribute(fp, 3)); g.setAttribute("color", new T.BufferAttribute(fc, 3)); const pts = new T.Points(g, new T.PointsMaterial({ size, map: tex, vertexColors: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false, toneMapped: false })); pts.frustumCulled = false; pts.visible = false; pts.layers.set(3); w.scene.add(pts); const P2 = []; for (let i = 0; i < n; i++) P2.push({ x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0, life: 0, c: [1, 1, 1], g: 7 }); return { pts, fp, fc, P2, k: 0 }; };
    const fdot = X.cv(64, 64), fdg = fdot.getContext("2d"), fgr = fdg.createRadialGradient(32, 32, 0, 32, 32, 30); fgr.addColorStop(0, "rgba(255,255,255,1)"); fgr.addColorStop(1, "rgba(255,255,255,0)"); fdg.fillStyle = fgr; fdg.fillRect(0, 0, 64, 64);
    const ftex = X.tex(fdot), FW = mkPts(MOBILE ? 1800 : 4200, 2.8, ftex), FL = mkPts(MOBILE ? 600 : 1600, 3.4, ftex);
    /* 水の幕（湖のまん中・南を向く） */
    const scr = new X.Screen(1024, 512);
    const curtain = new T.Mesh(new T.CylinderGeometry(40, 40, 24, 48, 1, true, Math.PI * 0.78, Math.PI * 0.44).translate(0, 12, 0), new T.MeshBasicMaterial({ map: scr.tex, transparent: true, opacity: 0.85, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false, fog: false }));
    curtain.position.set(HC.x, 0.4, HC.z + 30); curtain.rotation.y = Math.PI; curtain.visible = false; curtain.layers.set(3); w.scene.add(curtain);
    w.harborShow = { curve, L, boats: B, halos, jets, JU, NJ, searches, lasers, FW, FL, curtain, scr };
  }

  /* ══════════════ 水上パレード「CHASE THE LIGHT」（曲に合わせて） ══════════════ */
  const PAL = [[0xff4fb0, 0x4ff0ff, 0xffd84a], [0xa86aff, 0x4ff0ff, 0xffffff], [0xffa03a, 0xff4fb0, 0xffd84a], [0x4fff9a, 0x4ff0ff, 0xa86aff], [0xff3a4a, 0xffd84a, 0xffffff], [0x6ab8ff, 0xffffff, 0xff8ad8]];
  const HARBOR = {
    on: false, t: 0, lastT: 0, cool: 45, st: {}, hue: 0, warned: false, pal: PAL[0], ca: new T.Color(), cb: new T.Color(), cc: new T.Color(),
    start(ctx) { const S = ctx.world.harborShow; if (!S || this.on) return false; this.on = true; this.t = 0; this.lastT = 0; ctx.world.harborShowOn = true; S.boats.forEach((g) => { g.visible = false; }); [S.jets, S.curtain, S.FW.pts, S.FL.pts].forEach((o) => { o.visible = true; }); S.searches.forEach((l) => { l.piv.visible = true; }); S.halos.forEach((h) => { h.visible = true; }); S.JU.uAmp.value = 0; XShows.AU.restart("chase"); return true; },
    stop(ctx) { const S = ctx.world.harborShow; this.on = false; this.cool = 600; ctx.world.harborShowOn = false; if (!S) return; S.boats.forEach((g) => { g.visible = false; }); [S.jets, S.curtain].forEach((o) => { o.visible = false; }); S.searches.forEach((l) => { l.piv.visible = false; }); S.lasers.forEach((l) => { l.piv.visible = false; }); S.halos.forEach((h) => { h.visible = false; }); this.idle(ctx); },
    /* ショーのないときの光（昼は消える・夜はゆっくり色が回る） */
    idle(ctx) { const m = ctx.world.m, n = ctx.night ? 1 : 0, h = (performance.now() / 20000) % 1; if (!m.showA) return; m.showA.color.setHSL(h, 0.8, 0.55 * n + 0.08); m.showB.color.setHSL((h + 0.33) % 1, 0.8, 0.55 * n + 0.08); m.showC.color.setHSL((h + 0.66) % 1, 0.9, 0.5 * n + 0.08); m.showW.color.setScalar(0.25 + 0.75 * n); },
    burst(F, x, y, z, big, col) { const cols = [[1, 0.35, 0.7], [0.4, 0.9, 1], [1, 0.9, 0.3], [0.6, 1, 0.5], [0.8, 0.5, 1], [1, 0.55, 0.25], [1, 1, 1]], c = col || cols[Math.floor(Math.random() * cols.length)], n = big ? 320 : 170, v0 = big ? 32 : 22; for (let i = 0; i < n; i++) { const p = F.P2[F.k % F.P2.length]; F.k++; const a = Math.random() * TAU, b = Math.acos(Math.random() * 2 - 1), v = v0 * (0.85 + Math.random() * 0.3); p.x = x; p.y = y; p.z = z; p.vx = Math.sin(b) * Math.cos(a) * v; p.vy = Math.cos(b) * v; p.vz = Math.sin(b) * Math.sin(a) * v; p.life = 2.0 + Math.random() * 0.8; p.c = c; p.g = 7; } },
    flame(F, x, y, z, n, up) { for (let i = 0; i < n; i++) { const p = F.P2[F.k % F.P2.length]; F.k++; p.x = x + (Math.random() - 0.5) * 1.2; p.y = y; p.z = z + (Math.random() - 0.5) * 1.2; p.vx = (Math.random() - 0.5) * 3; p.vy = up * (0.7 + Math.random() * 0.5); p.vz = (Math.random() - 0.5) * 3; p.life = 0.8 + Math.random() * 0.6; p.c = Math.random() < 0.5 ? [1, 0.55, 0.15] : [1, 0.85, 0.35]; p.g = -2; } },
    stepPts(F, dt) { let alive = false; for (let i = 0; i < F.P2.length; i++) { const p = F.P2[i]; if (p.life <= 0) { F.fp[i * 3 + 1] = -999; continue; } alive = true; p.life -= dt; p.vy -= p.g * dt; const d = Math.exp(-1.5 * dt); p.vx *= d; p.vy *= d; p.vz *= d; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; F.fp[i * 3] = p.x; F.fp[i * 3 + 1] = p.y; F.fp[i * 3 + 2] = p.z; const f = Math.min(1, p.life) * 2.6; F.fc[i * 3] = p.c[0] * f; F.fc[i * 3 + 1] = p.c[1] * f; F.fc[i * 3 + 2] = p.c[2] * f; } F.pts.geometry.attributes.position.needsUpdate = true; F.pts.geometry.attributes.color.needsUpdate = true; return alive; },
    update(dt, t, ctx) {
      const S = ctx.world.harborShow; if (!S) return 0;
      const pl = ctx.player, dist = Math.hypot(pl.x - HC.x, pl.z - HC.z);
      if (!this.on) {
        this.idle(ctx);
        if (ctx.night) { this.cool -= dt; if (this.cool < 25 && !this.warned && dist < 900) { this.warned = true; ctx.notice("🚢 まもなく水上パレード「CHASE THE LIGHT」！ — XEVARION HARBOR", "harbor"); } if (this.cool <= 0 && dist < 700) { this.warned = false; this.start(ctx); } }
      } else if (!ctx.night) this.stop(ctx);
      const aF = this.stepPts(S.FW, dt), aL = this.stepPts(S.FL, dt); S.FW.pts.visible = aF || this.on; S.FL.pts.visible = aL || this.on;
      if (!this.on) return 0;
      this.t += dt;
      const TR = XShows.TR.chase, AU = XShows.AU, at = AU.playing("chase") ? AU.time("chase") : this.t % TR.dur, s = TR.at(at, this.st), ev = TR.events(this.lastT, at);
      if ((at < this.lastT - 1 && this.t > 30) || this.t > TR.dur + 8) { this.lastT = at; this.stop(ctx); return 0; }
      this.lastT = at;
      const lv = s.level, pulse = s.pulse, bass = s.bass;
      this.hue = (this.hue + dt * (0.02 + lv * 0.02)) % 1;
      if (s.bar % 8 === 0 && s.inBar === 0 && s.beatPh < 0.1) this.pal = PAL[((s.bar / 8) | 0) % PAL.length];
      /* 光の材質（船・建物の帯・山の冠） */
      const m = ctx.world.m, e = 0.55 + 0.9 * pulse + lv * 0.15;
      this.ca.setHex(this.pal[0]); this.cb.setHex(this.pal[1]); this.cc.setHex(this.pal[2]);
      m.showA.color.copy(s.beat % 2 ? this.ca : this.cb).multiplyScalar(e); m.showB.color.copy(this.cb).multiplyScalar(0.7 + 0.8 * bass + pulse * 0.6); m.showC.color.copy(this.cc).multiplyScalar(0.6 + lv * 0.25 + (s.hit || 0) * 1.5); m.showW.color.setScalar(1.2 + pulse * 1.3);
      /* 船：道にそって（先頭は曲の始めにほら穴から） */
      const nB = S.boats.length, gap = 24, trainL = gap * (nB - 1), v = (S.L + trainL) / Math.max(60, TR.dur - 12), head = Math.max(0, this.t - 4) * v, p = new T.Vector3(), q = new T.Vector3();
      S.boats.forEach((g, i) => { const d = head - i * gap; const on = d > 0 && d < S.L; g.visible = on; S.halos[i].visible = on; if (!on) return; const u = d / S.L; S.curve.getPointAt(u, p); S.curve.getPointAt(Math.min(1, u + 0.002), q);
        g.position.set(p.x, 0.12 + Math.sin(t * 1.3 + i) * 0.06, p.z); g.rotation.set(Math.sin(t * 0.9 + i) * 0.015, Math.atan2(q.x - p.x, q.z - p.z), Math.sin(t * 1.1 + i * 2) * 0.02);
        const hm = S.halos[i]; hm.position.set(p.x, 0.16, p.z); hm.material.color.copy(i % 3 === 0 ? this.ca : i % 3 === 1 ? this.cb : this.cc); hm.material.opacity = 0.35 + 0.35 * pulse;
        if (i === 9 && (ev.length || (lv >= 2 && s.inBar === 0 && pulse > 0.96))) this.burst(S.FW, p.x, 60 + Math.random() * 30, p.z, lv >= 3);
        if ((i === 1 || i === 6) && pulse > 0.9 && lv >= 2) this.flame(S.FL, p.x, 3.5, p.z, 14, 9); });
      /* 噴水：拍と盛り上がりで */
      const pat = ((s.bar >> 1) + lv) % 4, H = S.JU.uH.value;
      for (let k = 0; k < S.NJ; k++) { const ring = k >= 24, idx = k % 24; let h;
        if (pat === 0) h = 5 + bass * 16 * (ring ? 1.2 : 0.8);
        else if (pat === 1) h = (idx % 2 === s.beat % 2 ? 16 : 3) * (0.5 + bass * 0.7);
        else if (pat === 2) h = 3 + 16 * Math.max(0, Math.sin((idx / 24) * TAU - (s.beat + s.beatPh) * 1.6));
        else h = 4 + 14 * (0.5 + 0.5 * Math.sin(idx * 0.8 + t * 2)) * bass;
        H[k] = h * (0.55 + 0.2 * lv) + pulse * 3; }
      S.JU.uAmp.value = Math.min(1, S.JU.uAmp.value + dt * 0.4); S.JU.uHue.value = this.hue; S.JU.uScale.value = (ctx.renderer ? ctx.renderer.domElement.height : 900) * 0.5;
      /* サーチライト・レーザー */
      S.searches.forEach((l) => { l.piv.rotation.set(Math.sin(t * 0.35 + l.i) * 0.5, 0, Math.cos(t * 0.3 + l.i * 1.7) * 0.5); l.cone.material.color.copy(l.i % 3 === 0 ? this.ca : l.i % 3 === 1 ? this.cb : this.cc).lerp(new T.Color(1, 1, 1), 0.5); l.cone.material.opacity = 0.06 + 0.06 * (lv / 3) + 0.06 * pulse; });
      S.lasers.forEach((l) => { const on2 = lv >= 2; l.piv.visible = on2; if (!on2) return; const sw = Math.sin(t * (0.7 + lv * 0.2) + l.i * 0.7); l.piv.rotation.set(Math.cos(l.a) * sw * 0.7, 0, -Math.sin(l.a) * sw * 0.7 + (s.inBar % 2 ? 0.12 : -0.12)); l.ln.material.color.setHSL((this.hue + l.i / 12) % 1, 1, 0.55).multiplyScalar(1.4 + pulse * 2.2); l.ln.material.opacity = 0.3 + 0.4 * pulse; });
      /* 山：強い音で噴火（炎）・盛り上がりで花火 */
      ev.forEach((k) => { const big = k === "rise" || lv >= 3; for (let q2 = 0; q2 < (big ? 4 : 2); q2++) this.burst(S.FW, MT.x + (Math.random() - 0.5) * 160, 90 + Math.random() * 70, MT.z + 20 + (Math.random() - 0.5) * 80, big); this.flame(S.FL, MT.x, MT.h + 4, MT.z, 60, 22); });
      if (lv >= 3 && s.inBar === 0 && pulse > 0.97) this.flame(S.FL, MT.x, MT.h + 4, MT.z, 30, 18);
      if (at > TR.dur - 26 && Math.random() < dt * (3 + lv)) this.burst(S.FW, MT.x + (Math.random() - 0.5) * 220, 80 + Math.random() * 90, MT.z + 40 + (Math.random() - 0.5) * 120, Math.random() < 0.5);
      /* 灯台の光も曲の色に */
      const hb = ctx.world.harborBeam; if (hb) hb.cone.material.color.copy(this.cb).lerp(new T.Color(1, 0.95, 0.8), 0.4);
      /* 水の幕の映像 */
      if ((this._ct = (this._ct || 0) + dt) > 0.05) { this._ct = 0; const g = S.scr.g, W2 = S.scr.w, H2 = S.scr.h; g.clearRect(0, 0, W2, H2);
        const hue = this.hue * 360; for (let i = 0; i < 16; i++) { const M75 = W2 * 0.75, r = ((((i * 64 + ((s.beat || 0) + (s.beatPh || 0)) * 32) % M75) + M75) % M75); g.strokeStyle = "hsla(" + ((hue + i * 22) % 360) + ",100%,60%," + (0.6 * (1 - r / (W2 * 0.75))) + ")"; g.lineWidth = 9; g.beginPath(); g.arc(W2 / 2, H2 * 0.55, r, 0, TAU); g.stroke(); }
        for (let i = 0; i < 24; i++) { const x = (i * 97 + at * 60) % W2, y = H2 * (0.2 + 0.6 * ((i * 37) % 100) / 100); g.fillStyle = "hsla(" + ((hue + i * 15) % 360) + ",100%,75%," + (0.5 + 0.5 * pulse) + ")"; g.beginPath(); g.arc(x, y, 3 + pulse * 4, 0, TAU); g.fill(); }
        g.fillStyle = "#fff"; g.textAlign = "center"; g.font = "900 70px 'M PLUS Rounded 1c',sans-serif"; g.shadowColor = "hsl(" + hue + ",100%,60%)"; g.shadowBlur = 26; g.shadowBlur = 0; g.textAlign = "left";
        S.scr.flush(); }
      return Math.max(0, Math.min(1, 1 - (dist - 180) / 420));
    }
  };
  window.XHarbor = HARBOR;
  P.HARBOR_INFO = { HC, lakePt, edgeR, MT };
})();
