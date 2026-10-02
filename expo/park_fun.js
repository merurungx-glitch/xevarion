/* ══════════════════════════════════════════════════════════════════
   XEVARION PARK — 40 XEVARION FUNLAND（遊園地・★★ 2026-09-30d ご指定「遊園地などの新エリアを作成」）
   ------------------------------------------------------------------
   大通りの東のはし（HALL のうしろ・北東）。門 → バルーンタワーの「ファンスクエア」→ まん中の「ファン通り」（旗・屋台・フードコート）→
   ぐるりと1周の遊歩道。乗れる：YOKAI JET（ジェットコースター）・FUN WHEEL（観覧車）・FUN DROP（フリーフォール）・
   メリーゴーラウンド・ゆのみカップ・スカイスイング・妖怪船・バンパーカー。妖怪やしき（お化け屋敷）・ゲームの屋台・フードコート。
   ・乗り物の仕組みは park_rides.js（コースター・観覧車・フリーフォール）／park_more.js（回る乗り物）。id は遊園地だけの名前。
   ══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const T = THREE, P = XWorld.World.prototype, TAU = Math.PI * 2, XP = XPark, G = 9.8;

  P.buildFunland = function () {
    const w = this, RX = window.XRides; if (!RX) return;
    w.areaZone("fun");
    w.places.push(["40 XEVARION FUNLAND（ファンスクエア）", 505, -226, Math.PI]);
    const lm = w._landmark;
    /* ── 道：入口の通り・ファンスクエア・まん中のファン通り・ぐるりと1周の遊歩道・乗り物への小道 ── */
    const walk = (pts, wd, key, o) => w.route(pts, wd, key || "walkY", Object.assign({ raw: true, lamps: "yoma", lampEvery: 16, trees: false, benches: false, bushes: false }, o || {}));
    walk([[505, -166], [505, -222]], 12);
    w.disk(505, -240, 18, "walkY", 0.016); w.disk(505, -240, 18.6, "walkCream", 0.015, 18);
    walk([[523, -240], [640, -240], [652, -256], [652, -372], [636, -390], [496, -390], [478, -372], [478, -262], [490, -250]], 10, "walkCream", { raw: false });
    walk([[580, -240], [580, -390]], 12, "walkY", { lampsBoth: true, lampEvery: 14, benches: 30 });
    walk([[640, -240], [668, -222], [702, -212]], 8, "walkCream");
    walk([[652, -284], [696, -289]], 8, "walkCream");
    walk([[652, -380], [684, -380]], 8, "walkCream");
    /* ── ファンスクエア：バルーンタワー（遊園地のしるし）・花 ── */
    { const bx = 505, bz = -240;
      w.geo("white2", new T.CylinderGeometry(0.5, 0.8, 16, 12), bx, 8, bz); w.geo("gold", new T.CylinderGeometry(2.4, 2.8, 1.2, 20), bx, 0.6, bz); w.colCircle(bx, bz, 2.8);
      const cols = ["pRed", "pYellow", "pBlue", "pGreen", "pPink", "pPurple", "pOrange"], bal = new T.Group(); bal.position.set(bx, 16, bz); w.scene.add(bal); w.loose(bal, 700);
      for (let i = 0; i < 14; i++) { const a = i * 2.4, r = 1.2 + (i % 3) * 1.1, y = 1.5 + (i % 5) * 1.3; const b = new T.Mesh(new T.SphereGeometry(1.25, 16, 12).scale(1, 1.2, 1), w.m[cols[i % cols.length]]); b.position.set(Math.cos(a) * r, y, Math.sin(a) * r); bal.add(b); const s = new T.Mesh(new T.CylinderGeometry(0.02, 0.02, y, 3), w.m.white2); s.position.set(Math.cos(a) * r * 0.5, y / 2, Math.sin(a) * r * 0.5); bal.add(s); }
      w.anim.push((dt, t) => { bal.rotation.y = Math.sin(t * 0.3) * 0.25; bal.position.y = 16 + Math.sin(t * 0.8) * 0.3; });
      w.sign("XEVARION FUNLAND", { grad: ["#ff7a1a", "#ff4f9a", "#a86aff"], color: "#fff", glow: "#ffe0a0", border: "#fff", px: 1024 }, 9, 1.4, bx, 5, bz + 2.9, 0);
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + 0.39; if (Math.abs(Math.sin(a)) > 0.9 || Math.abs(Math.cos(a)) > 0.9) continue; w.flowerBed(bx + Math.cos(a) * 12, bz + Math.sin(a) * 12, 6, 2, Math.PI / 2 - a, 950 + i, XP.FLOWER_PAL[i % XP.FLOWER_PAL.length]); }
      w.plazaCrowd(bx, bz, 17, 1.5); }
    /* ── ファン通り（まん中）：旗の飾り・西に回る乗り物・東にフードコート ── */
    for (let z = -252; z > -388; z -= 18) w.garlandLine(574, z, 586, z);
    w.carousel(554, -272, "funCarousel", "ファンランド メリーゴーラウンド");
    w.spinCups(552, -318, "funCups", "ファンランド ゆのみカップ");
    w.bumperCars(549, -360, "funBumper", "ファンランド バンパーカー");
    const FOOD = [["フードコート ふわふわ", "yOrange", "norO", "takoyaki", "takoyaki"], ["クレープ ゆめいろ", "yPink" in w.m ? "yPink" : "yRed", "norR", "crepe", "crepe"], ["アイス ひんやり堂", "yCream", "norB", "icecream", "icecream"], ["ラーメン 妖怪亭", "yRed", "norK", "ramen", "ramen"]];
    FOOD.forEach(([nm, key, nr, prop, menu], i) => w.yomaShop(601, -266 - i * 30, 14, 10, 7 + (i % 2) * 1.5, { ry: -Math.PI / 2, key, shop: "shopA", roof: i % 2 ? "barrel" : "kawara", roofKey: ["kwR", "kwB", "kwP", "kwK"][i], rh: 2.4, sign: nm, signColor: "#2a1010", noren: nr, lanterns: 2, prop, eyes: i % 2 ? { iris: "irisC", look: 0.3 } : false, inside: { type: "food", name: nm, menu } }));
    for (let i = 0; i < 6; i++) w.cafeTable(591, -250 - i * 22, ["fabricW", "fabricR", "fabricY"][i % 3]);
    /* ── 東の乗り物：スカイスイング・妖怪船・FUN WHEEL（観覧車）・FUN DROP（フリーフォール）・妖怪やしき ── */
    w.skySwinger(636, -272, "funSwing", "ファンランド スカイスイング");
    w.yokaiShip(630, -334, "funShip", "ファンランド 妖怪船");
    funWheel(w, RX, 700, -300);
    funDrop(w, RX, 705, -222, 58);
    w.bld(700, -380, 30, 26, 11, { key: "castleDark" in w.m ? "castleDark" : "pPurple", roof: "hip", roofKey: "kwK", rh: 6, ry: -Math.PI / 2, sign: { text: "妖怪やしき  HAUNTED HOUSE", bg: "#1a0a1a", color: "#c8ff8a", w: 13, h: 1.6, y: 8.2, glow: "#8aff6a" }, inside: { type: "haunted", name: "妖怪やしき（お化け屋敷）", h: 5.5, door: 4 } });
    w.eyes && w.eyes(700 - 13.2, -380, 8.8, -Math.PI / 2, 0.9, 2.6, "irisC", 0.4);
    /* ── ゲームの屋台（西の遊歩道ぞい）・入口の屋台 ── */
    [["射的", "norR", "donut"], ["輪投げ", "norB", null], ["ヨーヨー釣り", "norO", null], ["金魚すくい", "norB", null], ["くじ引き", "norR", "cake"]].forEach(([nm, nr, pr], i) => w.yatai(464, -276 - i * 20, Math.PI / 2, nm, nr, pr));
    [["わたあめ", "norO", "icecream"], ["たこ焼き", "norR", "takoyaki"], ["チョコバナナ", "norB", "crepe"]].forEach(([nm, nr, pr], i) => w.yatai(482, -216 - i * 9, Math.PI / 2, nm, nr, pr));
    /* ── YOKAI JET（北のジェットコースター：巻き上げ → 急降下 → らせん → 2つめの山） ── */
    { const C = [[490, 4, -410], [522, 4, -410], [556, 16, -409], [592, 30, -411], [622, 28, -419], [646, 10, -438], [668, 5, -466], [698, 13, -486], [712, 22, -458], [694, 17, -430], [664, 10, -452], [626, 14, -481], [584, 22, -490], [544, 12, -484], [508, 6, -470], [480, 5, -446], [476, 4, -424]].map(([x, y, z]) => new T.Vector3(x, y, z));
      const curve = new T.CatmullRomCurve3(C, true, "centripetal"), F = RX.frames(curve, true, false, 1000);
      RX.trackMeshes(w, F, "railRed" in w.m ? "railRed" : "gold", 1.6, 7);
      let s0 = 0, ymin = 1e9; for (let i = 0; i < F.n; i++) if (F.pos[i].y < ymin - 0.01) { ymin = F.pos[i].y; s0 = i / F.n * F.L; }
      const R = RX.rideReg(w, { id: "funJet", name: "YOKAI JET（ようかいジェット）", kind: "coaster", F, cars: RX.coasterCars(w, [0xff7a1a, 0xffd24a, 0xff4f9a, 0x5ab8ff]), s: 0, v: 8, s0, busy: false, gap: 3.1, chain: 6 });
      const st = RX.station(w, F, s0, "YOKAI JET", "#c85a10"); RX.rideAt(w, st, "YOKAI JET（遊園地のジェットコースター）に乗る", () => ({ rideId: "funJet" }), "🎢");
      const top = F.pos.reduce((m, p) => Math.max(m, p.y), 0), S1 = { p: new T.Vector3(), t: new T.Vector3(), n: new T.Vector3() }, S2 = { p: new T.Vector3(), t: new T.Vector3(), n: new T.Vector3() };
      w.anim.push((dt) => { if (R.busy) return; const Sx = RX.sample(F, R.s, S1); R.v = Math.max(8, Math.min(26, Math.sqrt(Math.max(0, 2 * G * (top + 2 - Sx.p.y))))) * 0.9; R.s = (R.s + R.v * dt) % F.L; R.cars.forEach((c, i) => RX.placeCar(c, RX.sample(F, R.s - i * R.gap, S2), 0.3)); });
    }
    /* ── スワンボートの池（乗れる）・ファンランド号（池のまわりを走る小さな汽車・乗れる） ── */
    { const px = 600, pz = -206, pr = 16;
      w.pond(px, pz, pr, "lake");
      const swan = (col) => { const g = new T.Group(), body = new T.Mesh(new T.SphereGeometry(1.1, 14, 10).scale(1.4, 0.7, 1.9), w.m.white2); body.position.y = 0.45; g.add(body);
        const neck = new T.Mesh(new T.TorusGeometry(0.7, 0.2, 8, 16, Math.PI * 1.1), w.m.white2); neck.rotation.set(0, Math.PI / 2, 0); neck.position.set(0, 1.2, 1.3); g.add(neck);
        const head = new T.Mesh(new T.SphereGeometry(0.34, 10, 8), w.m.white2); head.position.set(0, 1.85, 1.0); g.add(head); const beak = new T.Mesh(new T.ConeGeometry(0.12, 0.4, 8).rotateX(Math.PI / 2), w.m.pOrange || w.m.gold); beak.position.set(0, 1.8, 1.35); g.add(beak);
        const seat = new T.Mesh(new T.BoxGeometry(1.4, 0.3, 1.2), w.m[col]); seat.position.set(0, 0.95, -0.4); g.add(seat); w.scene.add(g); w.loose(g, 400); return g; };
      const swans = ["pPink", "pBlue", "pYellow", "pGreen", "pPurple"].map((c) => swan(c));
      w.anim.push((dt, t) => swans.forEach((g, i) => { const a = t * 0.08 + i / swans.length * TAU, rr = 10.5 + Math.sin(t * 0.3 + i) * 1.5; g.position.set(px + Math.cos(a) * rr, 0.1 + Math.sin(t * 1.3 + i) * 0.05, pz + Math.sin(a) * rr); g.rotation.y = -a; }));
      const circ = []; for (let i = 0; i < 64; i++) { const a = i / 64 * TAU; circ.push(new T.Vector3(px + Math.cos(a) * 11, 0.12, pz + Math.sin(a) * 11)); }
      const Fs = RX.frames(new T.CatmullRomCurve3(circ, true), true, false, 400), boat = swan("pRed"); boat.visible = false;
      RX.rideReg(w, { id: "funSwan", name: "スワンボート", kind: "float", F: Fs, boat, s: 0, v: 1.8, busy: false, lift: 0, cam: 1.9 });
      w.box("woodLight", px, 0, pz + pr + 1.2, 4, 0.35, 3); w.sign("スワンボート  SWAN BOATS", { bg: "#2a8ac8", color: "#fff", px: 512 }, 4.6, 0.6, px, 2.2, pz + pr + 2.8, 0);
      w.interact(px, pz + pr + 3.4, 3, "スワンボートに乗る（池をぐるりと1周・E でおりる）", () => ({ rideId: "funSwan" }), "🦢");
      /* ファンランド号：だ円の線路（石の軌道・レール）・機関車＋客車2両 */
      const oval = []; for (let i = 0; i < 96; i++) { const a = i / 96 * TAU; oval.push(new T.Vector3(px + Math.cos(a) * 31, 0.05, pz + Math.sin(a) * 23)); }
      const curve = new T.CatmullRomCurve3(oval, true), F = RX.frames(curve, true, false, 600), sp = curve.getSpacedPoints(300);
      for (let i = 0; i < 300; i++) { const a = sp[i], b = sp[(i + 1) % 300], ang = Math.atan2(b.x - a.x, b.z - a.z); w.box("woodDark2", a.x, 0.02, a.z, 1.6, 0.06, 0.26, { ry: ang, detail: true }); if (i % 3 === 0) { const c2 = sp[(i + 3) % 300]; w.roads.push([a.x, a.z, c2.x, c2.z, 2.6]); } }          /* 線路の上には何も置かない（見えない道） */
      [-0.5, 0.5].forEach((o) => { const rp = sp.map((p, i) => { const q = sp[(i + 1) % sp.length], dx = q.x - p.x, dz = q.z - p.z, l = Math.hypot(dx, dz) || 1; return new T.Vector3(p.x - dz / l * o, 0.1, p.z + dx / l * o); }); w.geo("chromeB", new T.TubeGeometry(new T.CatmullRomCurve3(rp, true), 300, 0.05, 4, true), 0, 0, 0); });
      const car = (engine, col) => { const g = new T.Group(); if (engine) { const boiler = new T.Mesh(new T.CylinderGeometry(0.55, 0.55, 2.2, 14).rotateX(Math.PI / 2), w.m.pBlack); boiler.position.set(0, 0.9, 0.4); g.add(boiler); const cab = new T.Mesh(new T.BoxGeometry(1.3, 1.3, 1.0), w.m[col]); cab.position.set(0, 1.05, -0.9); g.add(cab); const roof = new T.Mesh(new T.BoxGeometry(1.5, 0.12, 1.2), w.m.pBlack); roof.position.set(0, 1.76, -0.9); g.add(roof); const st = new T.Mesh(new T.CylinderGeometry(0.2, 0.28, 0.7, 10), w.m.pBlack); st.position.set(0, 1.7, 1.2); g.add(st); const bell = new T.Mesh(new T.SphereGeometry(0.16, 8, 6), w.m.gold); bell.position.set(0, 1.55, 0.5); g.add(bell); }
        else { const b = new T.Mesh(new T.BoxGeometry(1.3, 0.55, 2.3), w.m[col]); b.position.y = 0.7; g.add(b); [-1, 1].forEach((s) => { const p = new T.Mesh(new T.CylinderGeometry(0.04, 0.04, 1.0, 5), w.m.gold); p.position.set(s * 0.6, 1.4, 0); g.add(p); }); const cn = new T.Mesh(new T.BoxGeometry(1.5, 0.1, 2.5), w.m.awningR || w.m.pRed); cn.position.y = 1.9; g.add(cn); }
        [-0.7, 0.7].forEach((z) => [-1, 1].forEach((s) => { const wh = new T.Mesh(new T.CylinderGeometry(0.28, 0.28, 0.12, 12).rotateZ(Math.PI / 2), w.m.pRed); wh.position.set(s * 0.62, 0.3, z); g.add(wh); }));
        w.scene.add(g); w.loose(g, 400); return g; };
      const cars = [car(true, "pGreen"), car(false, "pYellow"), car(false, "pBlue")];
      const R = RX.rideReg(w, { id: "funTrain", name: "ファンランド号", kind: "loop", F, cars, s: 0, v: 3.2, busy: false, gap: 2.7, eyeY: 1.7, info: "ファンランド号 — 池のまわりをぐるりと1周（E でおりる）" });
      const S1 = { p: new T.Vector3(), t: new T.Vector3(), n: new T.Vector3() };
      w.anim.push((dt) => { R.s = (R.s + dt * R.v) % F.L; cars.forEach((c, i) => RX.placeCar(c, RX.sample(F, R.s - i * R.gap, S1), 0)); });
      { const sx = px - 33.6, sz = pz; w.box("woodLight", sx, 0, sz, 3, 0.4, 8); w.box("pRed", sx, 2.9, sz, 3.4, 0.2, 8.4); [-3.6, 3.6].forEach((b) => w.box("white2", sx, 0, sz + b, 0.2, 2.9, 0.2)); w.colObb(sx, sz, 3, 8, 0);
        w.sign("ファンランド号  えき", { bg: "#2a8a4a", color: "#fff", px: 512 }, 3.6, 0.55, sx + 1.72, 2.5, sz, Math.PI / 2);
        w.interact(sx - 3.2, sz, 3, "ファンランド号（小さな汽車）に乗る", () => ({ rideId: "funTrain" }), "🚂"); }
    }
    /* ── 木・植えこみ・ベンチ ── */
    [[470, -236], [540, -228], [620, -228], [668, -250], [668, -330], [668, -350], [520, -300], [518, -340]].forEach(([x, z], i) => w.plant(i % 3 ? "sakura" : "oak", x, z, 1.1));
    w.plazaCrowd(580, -310, 30, 1.3); w.plazaCrowd(640, -300, 20, 0.8);
    w.areaGate(505, -181, 0, "fun", "big");
    w.forestOpen.push([590, -330, 170]);
    w._landmark = lm;
  };

  /* FUN WHEEL（観覧車：半径 28m・高さ 34m のじく・ゴンドラ 18） */
  function funWheel(w, RX, x, z) {
    const Rr = 28, H = 34, NG = 18;
    [-1, 1].forEach((s) => [-1, 1].forEach((f) => { const g = new T.CylinderGeometry(0.5, 0.8, Math.hypot(H, 13), 10); const m4 = new T.Matrix4().compose(new T.Vector3(x + f * 6.5, H / 2, z + s * 3.4), new T.Quaternion().setFromEuler(new T.Euler(0, 0, -f * Math.atan2(13, H))), new T.Vector3(1, 1, 1)); w.batch.add("white2", w.m.white2, g, m4); }));
    w.box("stoneW", x, 0, z, 22, 1, 12, { collide: true }); w.caster(x, z, 16, 8, H + Rr * 0.4);
    const wheel = new T.Group(); wheel.position.set(x, H, z); w.scene.add(wheel); w.loose(wheel, 1500);
    const parts = { white2: [], neonPink: [], neonCyan: [], neonYellow: [], gold: [] }, put = (k, g, m4) => { g.applyMatrix4(m4); parts[k].push(g); };
    [-1.8, 1.8].forEach((dz) => { put("white2", new T.TorusGeometry(Rr, 0.3, 8, 112), new T.Matrix4().makeTranslation(0, 0, dz)); put("gold", new T.TorusGeometry(Rr * 0.45, 0.18, 6, 56), new T.Matrix4().makeTranslation(0, 0, dz)); });
    for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; put("white2", new T.CylinderGeometry(0.09, 0.09, Rr, 4), new T.Matrix4().compose(new T.Vector3(Math.cos(a) * Rr / 2, Math.sin(a) * Rr / 2, 0), new T.Quaternion().setFromEuler(new T.Euler(0, 0, a - Math.PI / 2)), new T.Vector3(1, 1, 1))); }
    for (let i = 0; i < 72; i++) { const a = i / 72 * TAU; put(["neonPink", "neonCyan", "neonYellow"][i % 3], new T.SphereGeometry(0.22, 6, 4), new T.Matrix4().makeTranslation(Math.cos(a) * Rr, Math.sin(a) * Rr, 2.1)); }
    put("gold", new T.CylinderGeometry(1.8, 1.8, 4.4, 20), new T.Matrix4().makeRotationX(Math.PI / 2));
    for (const k in parts) if (parts[k].length) wheel.add(new T.Mesh(XWorld.mergeGeos(parts[k]), w.m[k]));
    const cols = [0xff7a1a, 0xffd24a, 0xff4f9a, 0x5ab8ff, 0x7ce0a0, 0xc08aff];
    const cabG = XWorld.mergeGeos([new T.CylinderGeometry(1.4, 1.4, 2.2, 14).translate(0, -1.9, 0), new T.ConeGeometry(1.6, 0.7, 14).translate(0, -0.45, 0)]);
    const cabM = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, emissive: 0xffffff, emissiveIntensity: 0.05 }); w.nightMats.push({ m: cabM, day: 0.05, night: 0.45 });
    const cabs = new T.InstancedMesh(cabG, cabM, NG), c = new T.Color(); for (let i = 0; i < NG; i++) { c.setHex(cols[i % cols.length]); cabs.setColorAt(i, c); }
    cabs.frustumCulled = false; w.scene.add(cabs);
    const R = RX.rideReg(w, { id: "funWheel", name: "FUN WHEEL（観覧車）", kind: "wheel", x, z, H, R: Rr, NG, rot: 0, mul: 1, busy: false, gi: 0 }), m4 = new T.Matrix4();
    w.anim.push((dt) => { R.rot += dt * 0.05 * R.mul; wheel.rotation.z = R.rot; for (let i = 0; i < NG; i++) { const a = i / NG * TAU + R.rot; m4.makeTranslation(x + Math.cos(a) * Rr, H + Math.sin(a) * Rr, z); cabs.setMatrixAt(i, m4); } cabs.instanceMatrix.needsUpdate = true; });
    w.sign("FUN WHEEL", { grad: ["#ff7a1a", "#ff4f9a"], color: "#fff", px: 512 }, 10, 1.6, x, 2.4, z + 6.1, 0);
    w.interact(x, z + 9, 4, "FUN WHEEL（観覧車・高さ 62m）に乗る", () => ({ rideId: "funWheel" }), "🎡");
  }
  /* FUN DROP（フリーフォール） */
  function funDrop(w, RX, x, z, H) {
    w.geo("white2", new T.CylinderGeometry(1.6, 2.2, H, 12), x, H / 2, z); w.geo("railRed" in w.m ? "railRed" : "pRed", new T.CylinderGeometry(3, 3, 2.2, 16), x, H + 1.1, z); w.geo("neonPink", new T.TorusGeometry(3.1, 0.15, 6, 32).rotateX(Math.PI / 2), x, H + 2.2, z);
    for (let y = 6; y < H; y += 6) w.geo("neonYellow", new T.TorusGeometry(1.75, 0.08, 4, 24).rotateX(Math.PI / 2), x, y, z);
    w.colCircle(x, z, 3.2); w.caster(x, z, 5, 5, H);
    const ring = new T.Group(); ring.position.set(x, 4, z); w.scene.add(ring); w.loose(ring, 900);
    ring.add(new T.Mesh(new T.CylinderGeometry(4.6, 4.6, 1.6, 24, 1, true), new T.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.4, side: T.DoubleSide })));
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, s = new T.Mesh(new T.BoxGeometry(0.8, 1.0, 0.7), w.m.pYellow); s.position.set(Math.cos(a) * 5, -0.6, Math.sin(a) * 5); s.rotation.y = -a + Math.PI / 2; ring.add(s); }
    const R = RX.rideReg(w, { id: "funDrop", name: "FUN DROP（フリーフォール）", kind: "drop", x, z, H, ring, busy: false, y: 4 });
    w.anim.push((dt, t) => { if (R.busy) return; const k = (t * 0.06 + 0.4) % 1; ring.position.y = k < 0.65 ? 3 + k / 0.65 * (H - 8) : (H - 5) - Math.pow((k - 0.65) / 0.35, 2) * (H - 8); ring.rotation.y = t * 0.2; });
    w.sign("FUN DROP", { bg: "#ff7a1a", color: "#fff", px: 512 }, 6, 1.2, x, 2.4, z + 5.8, 0);
    w.interact(x, z + 8, 4, "FUN DROP（" + H + "m から落下）に乗る", () => ({ rideId: "funDrop" }), "🗼");
  }
})();
