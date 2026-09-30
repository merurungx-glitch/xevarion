/* ══════════════════════════════════════════════════════════════════
   XEVARION PARK — 乗り物（★★ 2026-09-29 ご指定「ジェットコースターなども乗れるように」「パーク全体を移動できる乗り物」）
   ------------------------------------------------------------------
   ・乗れるアトラクション：マウンテンコースター・スカイファルコン（宙返り）・コズミックコースター（らせん）・フリーフォール・
     ジャングルフリューム・スターホイール（観覧車）・ピープルムーバー・路面電車・スプラッシュスライダー・流れるプール・サンセットクルーズ
     （モノレールは main.js のまま）
   ・コースターは本物の物理（高い所から落ちると速くなる・上りは巻き上げ）。宙返りは「進む向きにそって回るカメラ」。
     視点は「前の席（一人称）」と「うしろから（自分も見える）」を V で切りかえ。
   ・XEVA HOVER：どこでも呼べるホバーバイク。島のどこへでも走って行ける（当たり判定・加速・ブースト・傾き）。
   ══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const T = THREE, X = XTex, P = XWorld.World.prototype, TAU = Math.PI * 2, XP = XPark, G = 9.8;
  const UP = new T.Vector3(0, 1, 0);

  /* ══════════════ 線路の「向き」（位置・進む向き・上の向き）をあらかじめ計算 ══════════════ */
  function frames(curve, closed, loop, n) {
    n = n || 900;
    const L = curve.getLength(), pos = [], tan = [], nor = [];
    for (let i = 0; i <= n; i++) { const u = closed ? (i % n) / n : i / n; pos.push(curve.getPointAt(u)); tan.push(curve.getTangentAt(u).normalize()); }
    if (loop) {
      /* 平行移動で上の向きを運ぶ（宙返りで上下がひっくり返る）。閉じた線はねじれを配る */
      let N0 = UP.clone().sub(tan[0].clone().multiplyScalar(tan[0].dot(UP))).normalize(); nor.push(N0.clone());
      for (let i = 1; i <= n; i++) { const a = tan[i - 1], b = tan[i], ax = new T.Vector3().crossVectors(a, b); let Nn = nor[i - 1].clone(); if (ax.lengthSq() > 1e-10) { ax.normalize(); const ang = Math.acos(Math.max(-1, Math.min(1, a.dot(b)))); Nn.applyAxisAngle(ax, ang); } nor.push(Nn.normalize()); }
      if (closed) { const e = nor[n], s0 = nor[0]; let tw = Math.acos(Math.max(-1, Math.min(1, e.dot(s0)))); if (new T.Vector3().crossVectors(e, s0).dot(tan[0]) < 0) tw = -tw; for (let i = 0; i <= n; i++) nor[i].applyAxisAngle(tan[i], tw * i / n).normalize(); }
    } else {
      for (let i = 0; i <= n; i++) {
        const t0 = tan[i], tp = tan[Math.max(0, i - 3)], tn = tan[Math.min(n, i + 3)];
        const h1 = Math.atan2(tp.x, tp.z), h2 = Math.atan2(tn.x, tn.z); let dh = h2 - h1; while (dh > Math.PI) dh -= TAU; while (dh < -Math.PI) dh += TAU;
        const ds = L / n * 6, bank = Math.max(-0.7, Math.min(0.7, -dh / Math.max(ds, 0.1) * 18));
        const Nb = UP.clone().sub(t0.clone().multiplyScalar(t0.dot(UP))); if (Nb.lengthSq() < 1e-6) Nb.set(1, 0, 0); Nb.normalize().applyAxisAngle(t0, bank);
        nor.push(Nb);
      }
    }
    return { L, n, pos, tan, nor, closed };
  }
  function sample(F, s, out) {
    const k = ((F.closed ? ((s % F.L) + F.L) % F.L : Math.max(0, Math.min(F.L, s))) / F.L) * F.n, i = Math.min(F.n - 1, Math.floor(k)), f = k - i;
    out.p.lerpVectors(F.pos[i], F.pos[i + 1], f); out.t.lerpVectors(F.tan[i], F.tan[i + 1], f).normalize(); out.n.lerpVectors(F.nor[i], F.nor[i + 1], f).normalize();
    return out;
  }
  const _S = { p: new T.Vector3(), t: new T.Vector3(), n: new T.Vector3() }, _S2 = { p: new T.Vector3(), t: new T.Vector3(), n: new T.Vector3() };
  const _m = new T.Matrix4(), _x = new T.Vector3(), _q = new T.Quaternion();
  function placeCar(obj, S, lift) {
    _x.crossVectors(S.n, S.t).normalize();
    _m.makeBasis(_x, S.n, S.t); obj.quaternion.setFromRotationMatrix(_m);
    obj.position.copy(S.p).addScaledVector(S.n, lift || 0);
  }

  /* ══════════════ コースター（線路・支柱・車両・駅） ══════════════ */
  function coasterCars(w, cols, sz) {
    const cars = cols.map((c, i) => {
      const g = new T.Group(), m = new T.MeshStandardMaterial({ color: c, roughness: 0.3, metalness: 0.35 }); m.envMapIntensity = 1.1;
      const b = new T.Mesh(new T.BoxGeometry(2.1, 0.8, sz || 2.8), m); b.position.y = 0.45; g.add(b);
      const f = new T.Mesh(new T.BoxGeometry(2.1, 0.42, 0.3), m); f.position.set(0, 0.92, (sz || 2.8) / 2 - 0.15); f.rotation.x = -0.35; g.add(f);
      const bar = new T.Mesh(new T.BoxGeometry(1.5, 0.06, 0.06), w.m.gold); bar.position.set(0, 1.02, 0.35); g.add(bar);
      for (let k = 0; k < 2; k++) { const r = new T.Mesh(new T.CapsuleGeometry(0.2, 0.35, 3, 6), new T.MeshLambertMaterial({ color: [0xffd0a8, 0xf0c090, 0xe0a878][(i + k) % 3] })); r.position.set(k ? 0.45 : -0.45, 1.35, -0.3); r.visible = i > 0; g.add(r); }
      w.scene.add(g); w.loose(g, 700); return g;
    });
    return cars;
  }
  function trackMeshes(w, F, key, gauge, supports, collide) {
    { const pts = []; for (let i = 0; i <= F.n; i += 4) pts.push([F.pos[i].x, F.pos[i].z, F.pos[i].y]); (w.treeKeepOut = w.treeKeepOut || []).push({ pts, r: 6 }); }
    const N = F.n, railPts = (off) => { const pts = []; for (let i = 0; i <= N; i += 2) { const b = new T.Vector3().crossVectors(F.nor[i], F.tan[i]).normalize(); pts.push(F.pos[i].clone().addScaledVector(b, off)); } return new T.CatmullRomCurve3(pts, F.closed); };
    w.geo(key, new T.TubeGeometry(railPts(gauge / 2), N * 2, 0.2, 6, F.closed), 0, 0, 0); w.geo(key, new T.TubeGeometry(railPts(-gauge / 2), N * 2, 0.2, 6, F.closed), 0, 0, 0);
    { const pts = []; for (let i = 0; i <= N; i += 2) pts.push(F.pos[i].clone().addScaledVector(F.nor[i], -0.55)); w.geo("darkMetal", new T.TubeGeometry(new T.CatmullRomCurve3(pts, F.closed), N * 2, 0.32, 6, F.closed), 0, 0, 0); }
    w.detail(() => { for (let i = 0; i < N; i += 3) { const p = F.pos[i], t = F.tan[i], n = F.nor[i], b = new T.Vector3().crossVectors(n, t).normalize(); const g = new T.BoxGeometry(gauge + 0.3, 0.14, 0.3); _m.makeBasis(b, n, t); g.applyMatrix4(_m); w.batch.add("darkMetal", w.m.darkMetal, g, new T.Matrix4().makeTranslation(p.x - n.x * 0.2, p.y - n.y * 0.2, p.z - n.z * 0.2), true); } });
    for (let i = 0; i < N; i += supports || 8) { const p = F.pos[i]; if (p.y < 3 || F.nor[i].y < 0.2) continue; w.geo("white2", new T.CylinderGeometry(0.28, 0.4, p.y - 0.6, 8), p.x, (p.y - 0.6) / 2, p.z); if (collide !== false) w.colCircle(p.x, p.z, 0.5); }
  }
  /* ★★ 2026-09-30b 乗り場（ご指定「乗り場をわかりやすくして、乗るところまでの階段などの経路をしっかり作って」）
     ホーム（線路の横の高い台・屋根・名前）＋ホームへの階段（歩いてのぼれる）＋手すり＋入口の門（のりば）。乗るのはホームの上で E */
  function station(w, F, s0, name, color) {
    const S = sample(F, s0, _S), ang = Math.atan2(S.t.x, S.t.z), c = Math.cos(ang), sn = Math.sin(ang), side = 3.4;
    const spx = S.p.x, spz = S.p.z, py = Math.max(0.3, S.p.y - 0.4), Ls = Math.max(3.2, py * 1.75), nSt = Math.max(4, Math.round(py / 0.26));
    /* ★★ 2026-09-30b ホーム・階段・入口は線路の左右で「あいている方」に作る（前はいつも同じ側で、コズミックコースターは階段が建物の壁に向かっていた） */
    const I = w.spotIndex(), TP = []; for (let i = 0; i < F.pos.length; i += 2) { const q = F.pos[i]; if (q.y < 3.3 && Math.abs(q.x - spx) < 40 && Math.abs(q.z - spz) < 40 && Math.hypot(q.x - spx, q.z - spz) > 10) TP.push(q); }          /* 下をくぐれない低い線路だけ */
    const blocked = (x, z) => !!(I.bld(x, z, 0.6) || I.col(x, z, 0.2) || w.isWater(x, z) || TP.some((q) => Math.hypot(q.x - x, q.z - z) < 2.6));
    const score = (g) => { let n = 0; for (let a = -1.5; a <= 1.7 + Ls + 4.2; a += 1) { for (const b of a < 1.8 ? [-7.5, -4, 0, 4, 7.5] : [-1.8, 0, 1.8]) { if (blocked(spx + g * c * (side + a) + b * sn, spz - g * sn * (side + a) + b * c)) n++; } } return n; };
    /* 入口はいちばん近い道の方へ（道から乗り場が見えて、階段まで歩いて行ける） */
    let rq = null, rd = 1e9; w.roads.forEach((r) => { if (r[4] < 4) return; const dx = r[2] - r[0], dz = r[3] - r[1], l2 = dx * dx + dz * dz; let t = l2 ? ((spx - r[0]) * dx + (spz - r[1]) * dz) / l2 : 0; t = Math.max(0, Math.min(1, t)); const qx = r[0] + dx * t, qz = r[1] + dz * t, d = Math.hypot(qx - spx, qz - spz); if (d < rd) { rd = d; rq = [qx, qz]; } });
    const pref = rq && rd > 4 ? Math.sign((rq[0] - spx) * c - (rq[1] - spz) * sn) : 0;
    const sg = score(1) * 3 + (pref < 0 ? 8 : 0) <= score(-1) * 3 + (pref > 0 ? 8 : 0) ? 1 : -1, out = ang + sg * Math.PI / 2, toTrk = Math.atan2(-sg * c, sg * sn);
    const px = spx + sg * c * side, pz = spz - sg * sn * side;
    const Lp = (a, b) => [px + sg * a * c + b * sn, pz - sg * a * sn + b * c];          /* a＝線路から外へ・b＝線路にそって */
    w.geo("stoneW", new T.BoxGeometry(3.4, py, 16), px, py / 2, pz, ang);
    { const n0 = w.colliders.length; w.colObb(px, pz, 3.4, 16, ang); const cc = w.colliders[n0]; cc.ya = -5; cc.yb = py - 0.9; }
    /* 屋根（線路とホームの上のアーチ）★ 前は下向きの「とい」になっていて、ホームの床を切っていた */
    { const g = new T.CylinderGeometry(5.2, 5.2, 18, 20, 1, true, -0.42 * Math.PI, 0.84 * Math.PI).rotateX(-Math.PI / 2).translate(sg * side / 2, 0, 0), f = g.clone(), ix = f.index.array;
      for (let i = 0; i < ix.length; i += 3) { const q = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = q; } f.computeVertexNormals();
      w.geo("white2", XWorld.mergeGeos([g, f]), spx, py + 1.2, spz, ang);
      w.geo(color ? "woodRed" : "gold", new T.BoxGeometry(0.3, 0.3, 18.2), ...[Lp(1.75, 0)].map(([x, z]) => [x, py + 5.02, z])[0], ang); }
    for (let k = -1; k <= 1; k += 2) { const [qx, qz] = Lp(1.4, k * 6); w.geo("white2", new T.CylinderGeometry(0.16, 0.16, 5.4, 8), qx, py + 2.7, qz, ang); }
    /* ホームの床（歩ける）・手すり（線路の側・両はし・外がわ：階段の所はあける） */
    (w.heightExtra = w.heightExtra || []).push({ lv: 1, cx: px, cz: pz, ang, hw: 1.75, hl: 8, y: py });
    const rail = (a0, b0, a1, b1) => { const [ax, az] = Lp(a0, b0), [bx, bz] = Lp(a1, b1), n0 = w.colliders.length; w.colSeg(ax, az, bx, bz, 0.12); const cc = w.colliders[n0]; cc.ya = py - 0.8; cc.yb = py + 4; const L = Math.hypot(bx - ax, bz - az); w.geo("chromeB", new T.BoxGeometry(0.06, 0.06, L), (ax + bx) / 2, py + 1.05, (az + bz) / 2, Math.atan2(bx - ax, bz - az)); for (let k = 0; k <= Math.floor(L / 1.6); k++) { const t = k / Math.max(1, Math.floor(L / 1.6)); w.geo("chromeB", new T.BoxGeometry(0.05, 1.05, 0.05), ax + (bx - ax) * t, py + 0.52, az + (bz - az) * t); } };
    rail(-1.6, -7.9, -1.6, 7.9); rail(-1.7, -7.9, 1.7, -7.9); rail(-1.7, 7.9, 1.7, 7.9); rail(1.6, -7.9, 1.6, -1.35); rail(1.6, 1.35, 1.6, 7.9);
    /* 階段（ホームの外がわ・まん中から外へ）：歩いてのぼれる坂＋段 */
    { const [rx, rz] = Lp(1.7 + Ls / 2, 0); w.heightExtra.push({ ramp: 1, cx: rx, cz: rz, ang: toTrk, hw: 1.25, hl: Ls / 2, y0: 0, y1: py }); }
    for (let i = 0; i < nSt; i++) { const yI = py * (i + 1) / nSt, [sx, sz] = Lp(1.7 + Ls - (i + 0.5) * Ls / nSt, 0); w.geo("stoneW", new T.BoxGeometry(Ls / nSt + 0.02, yI, 2.4), sx, yI / 2, sz, ang); }
    [-1.3, 1.3].forEach((b) => { const [ax, az] = Lp(1.7, b), [bx, bz] = Lp(1.7 + Ls, b); w.colSeg(ax, az, bx, bz, 0.1); const L = Math.hypot(bx - ax, bz - az), yy = py / 2 + 1.0; w.geo("chromeB", new T.BoxGeometry(0.06, 0.06, Math.hypot(L, py)).rotateX(-Math.atan2(py, L)), (ax + bx) / 2, yy, (az + bz) / 2, Math.atan2(ax - bx, az - bz)); });
    /* 入口の門（のりば）・名前 */
    const [gx, gz] = Lp(1.7 + Ls + 1.2, 0);
    [-2.5, 2.5].forEach((b) => { const [qx, qz] = Lp(1.7 + Ls + 1.2, b); w.geo(color ? "woodRed" : "white2", new T.BoxGeometry(0.3, 3.4, 0.3), qx, 1.7, qz, ang); w.colCircle(qx, qz, 0.2); });
    w.geo("gold", new T.BoxGeometry(0.4, 0.2, 5.6), gx, 3.45, gz, ang);
    w.sign("🎢 のりば  " + name, { bg: color || "#1a1a2a", color: "#fff", glow: "#ffd86a", border: "#f2c04a", px: 1024, both: true }, 4.8, 0.62, gx, 2.95, gz, out);
    w.sign(name, { bg: color || "#1a1a2a", color: "#fff", glow: "#ffd86a", border: "#f2c04a", px: 1024, both: true }, 8, 1.2, ...[Lp(1.8, 0)].map(([x, z]) => [x, py + 3.7, z])[0], out);
    const [bx2, bz2] = Lp(1.7 + Ls + 3.4, 0); (w.doors = w.doors || []).push([bx2, bz2, "ride"]);          /* "ride"＝遠くても道をつなぐ */
    return { x: bx2, z: bz2, yaw: toTrk, px, pz, py };
  }
  /* ホームの上で E（乗る）。地図のワープは階段の下へ */
  function rideAt(w, st, label, fn, icon) { const it = w.interact(st.px, st.pz, 3.8, label, fn, icon); it.y = st.py; it.warp = [st.x, st.z, st.yaw]; return it; }
  function rideReg(w, R) { (w.rides = w.rides || {})[R.id] = R; return R; }

  /* マウンテンコースター（山のまわり）：上書き */
  P.coaster = function (x, z, key, H, carCols, spd) {
    const w = this, C = [];
    for (let i = 0; i < 28; i++) { const a = i / 28 * TAU, r = 110 + Math.sin(a * 3) * 16, y = 6 + Math.max(0, Math.sin(a * 2 + 0.6)) * H * 0.42 + Math.max(0, Math.sin(a * 5)) * 10; C.push(new T.Vector3(x + Math.cos(a) * r, y, z + Math.sin(a) * r * 0.9)); }
    const curve = new T.CatmullRomCurve3(C, true, "centripetal"), F = frames(curve, true, false, 1000);
    trackMeshes(w, F, key, 1.6, 7);
    let s0 = 0, ymin = 1e9; for (let i = 0; i < F.n; i++) if (F.pos[i].y < ymin - 0.01) { ymin = F.pos[i].y; s0 = i / F.n * F.L; }
    const R = rideReg(w, { id: "mountain", name: "XEVA マウンテンコースター", kind: "coaster", F, cars: coasterCars(w, carCols), s: 0, v: 8, s0, busy: false, gap: 3.2, chain: 5.5 });
    const st = station(w, F, s0, "MOUNTAIN COASTER", "#8a2a1a"); rideAt(w, st, "マウンテンコースターに乗る（最高 60m から急降下）", () => ({ rideId: "mountain" }), "🎢");
    const top = F.pos.reduce((m, p) => Math.max(m, p.y), 0);
    w.anim.push((dt) => { if (R.busy) return; const Sx = sample(F, R.s, _S); R.v = Math.max(9, Math.min(30, Math.sqrt(Math.max(0, 2 * G * (top + 2 - Sx.p.y))))) * 0.9; R.s = (R.s + R.v * dt) % F.L; R.cars.forEach((c, i) => placeCar(c, sample(F, R.s - i * R.gap, _S2), 0.3)); });
  };
  /* 宙返りコースター SKY FALCON：上書き */
  P.loopCoaster = function (x, z) {
    const w = this, C = [];
    const addLoop = (cx, cz, Rr, n) => { for (let i = 1; i < n; i++) { const a = -Math.PI / 2 + i / n * TAU; C.push(new T.Vector3(cx + (i / n - 0.5) * 7, Rr + Math.sin(a) * Rr + 3, cz + Math.cos(a) * Rr)); } };
    C.push(new T.Vector3(x - 60, 4, z + 30), new T.Vector3(x - 44, 4, z + 30), new T.Vector3(x - 24, 22, z + 30), new T.Vector3(x - 4, 40, z + 26), new T.Vector3(x + 14, 30, z + 14), new T.Vector3(x + 26, 6, z + 2));
    C.push(new T.Vector3(x + 30, 3.2, z - 12));
    addLoop(x + 30, z - 25, 13, 14);
    C.push(new T.Vector3(x + 30, 3.2, z - 38), new T.Vector3(x + 28, 8, z - 58), new T.Vector3(x + 6, 18, z - 72), new T.Vector3(x - 24, 12, z - 62), new T.Vector3(x - 50, 7, z - 34), new T.Vector3(x - 70, 5, z), new T.Vector3(x - 70, 4, z + 20));
    const curve = new T.CatmullRomCurve3(C, true, "centripetal"), F = frames(curve, true, true, 1100);
    trackMeshes(w, F, "railYellow", 1.6, 8);
    const s0 = 0;
    const R = rideReg(w, { id: "falcon", name: "SKY FALCON（宙返り）", kind: "coaster", loop: true, F, cars: coasterCars(w, [0xff5f8f, 0x5ab8ff, 0xffd24a, 0x7ce0a0]), s: 0, v: 8, s0, busy: false, gap: 3.1, chain: 5.5 });
    const st = station(w, F, s0 + 6, "SKY FALCON", "#8a6a0a"); rideAt(w, st, "SKY FALCON（宙返りコースター）に乗る", () => ({ rideId: "falcon" }), "🎢");
    const top = F.pos.reduce((m, p) => Math.max(m, p.y), 0);
    w.anim.push((dt) => { if (R.busy) return; const Sx = sample(F, R.s, _S); R.v = Math.max(8, Math.sqrt(Math.max(0, 2 * G * (top + 1.5 - Sx.p.y)))) * 0.92; R.s = (R.s + R.v * dt) % F.L; R.cars.forEach((c, i) => placeCar(c, sample(F, R.s - i * R.gap, _S2), 0.3)); });
    w.sign("SKY FALCON", { bg: "#ffc830", color: "#1a1a2a", px: 512 }, 8, 1.4, x - 60, 3, z + 36, 0);
  };
  /* コズミックコースター（宇宙のドームのまわりをらせんに）：SPACE PORT から呼ぶ */
  P.cosmicCoaster = function (x, z) {
    const w = this, C = [];
    for (let i = 0; i <= 40; i++) { const t = i / 40, a = t * TAU * 2.2, r = 44 - t * 4, y = t < 0.25 ? 4 + t / 0.25 * 44 : 48 - (t - 0.25) / 0.75 * 44 + Math.sin(t * 30) * 2; C.push(new T.Vector3(x + Math.cos(a) * r, Math.max(3.5, y), z + Math.sin(a) * r)); }
    for (let i = 1; i < 8; i++) { const t = i / 8, a = TAU * 2.2 + t * (TAU - (TAU * 2.2) % TAU); C.push(new T.Vector3(x + Math.cos(a) * 46, 4, z + Math.sin(a) * 46)); }
    const curve = new T.CatmullRomCurve3(C, true, "centripetal"), F = frames(curve, true, false, 1000);
    trackMeshes(w, F, "railBlue", 1.6, 8);
    const R = rideReg(w, { id: "cosmic", name: "COSMIC COASTER", kind: "coaster", F, cars: coasterCars(w, [0x2a3aff, 0x9a4aff, 0x4ff0ff]), s: 0, v: 8, s0: 0, busy: false, gap: 3.1, chain: 9 });
    const st = station(w, F, 2, "COSMIC COASTER", "#101840"); rideAt(w, st, "コズミックコースター（ドームのまわりをらせんに）に乗る", () => ({ rideId: "cosmic" }), "🚀");
    const top = F.pos.reduce((m, p) => Math.max(m, p.y), 0);
    w.anim.push((dt) => { if (R.busy) return; const Sx = sample(F, R.s, _S); R.v = Math.max(8, Math.sqrt(Math.max(0, 2 * G * (top + 1.5 - Sx.p.y)))) * 0.9; R.s = (R.s + R.v * dt) % F.L; R.cars.forEach((c, i) => placeCar(c, sample(F, R.s - i * R.gap, _S2), 0.3)); });
  };
  /* フリーフォール：上書き */
  P.dropTower2 = function (x, z, H) {
    const w = this;
    w.geo("white2", new T.CylinderGeometry(1.8, 2.4, H, 12), x, H / 2, z); w.geo("railRed", new T.CylinderGeometry(3.2, 3.2, 2.4, 16), x, H + 1.2, z); w.geo("neonYellow", new T.TorusGeometry(3.3, 0.15, 6, 32).rotateX(Math.PI / 2), x, H + 2.4, z);
    w.colCircle(x, z, 3.4); w.caster(x, z, 5, 5, H);
    const ring = new T.Group(); ring.position.set(x, 4, z); w.scene.add(ring);
    ring.add(new T.Mesh(new T.CylinderGeometry(5, 5, 1.8, 24, 1, true), new T.MeshStandardMaterial({ color: 0x3a8aff, roughness: 0.4, side: T.DoubleSide })));
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, s = new T.Mesh(new T.BoxGeometry(0.8, 1.0, 0.7), w.m.pRed); s.position.set(Math.cos(a) * 5.4, -0.6, Math.sin(a) * 5.4); s.rotation.y = -a + Math.PI / 2; ring.add(s); }
    const R = rideReg(w, { id: "drop", name: "FREE FALL", kind: "drop", x, z, H, ring, busy: false, y: 4 });
    w.anim.push((dt, t) => { if (R.busy) return; const k = (t * 0.07) % 1; ring.position.y = k < 0.65 ? 3 + k / 0.65 * (H - 8) : (H - 5) - Math.pow((k - 0.65) / 0.35, 2) * (H - 8); ring.rotation.y = t * 0.2; });
    w.sign("FREE FALL", { bg: "#e0302a", color: "#fff", px: 512 }, 6, 1.2, x, 2.4, z + 6.2, 0);
    w.interact(x, z + 8, 4, "フリーフォールに乗る（" + H + "m から落下）", () => ({ rideId: "drop" }), "🗼");
  };
  /* ジャングルフリューム：上書き */
  P.flume = function (x, z) {
    const w = this, C = [];
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; C.push(new T.Vector3(x + Math.cos(a) * 34, i < 3 ? 20 - i * 6 : i > 12 ? 2 + (i - 12) * 5 : 2 + Math.sin(a * 2) * 1.5, z + Math.sin(a) * 26)); }
    const curve = new T.CatmullRomCurve3(C, true, "centripetal"), F = frames(curve, true, false, 600), pts = curve.getSpacedPoints(200);
    w.geo("woodLight", new T.TubeGeometry(curve, 400, 2.2, 8, true), 0, 0, 0);
    w.water(new T.TubeGeometry(curve, 400, 1.7, 8, true).scale(1, 1, 1), 0, -0.25, 0, "canal");
    for (let i = 0; i < 200; i += 8) { const p = pts[i]; if (p.y > 2) { w.box("woodDark", p.x, 0, p.z, 0.5, p.y - 1.5, 0.5); w.colCircle(p.x, p.z, 0.4); } }
    const mk = () => { const g = new T.Group(), l = new T.Mesh(new T.CapsuleGeometry(0.8, 2.6, 4, 8), w.m.woodDark); l.rotation.x = Math.PI / 2; g.add(l); w.scene.add(g); w.loose(g, 300); return g; };
    const logs = [mk(), mk(), mk()];
    const R = rideReg(w, { id: "flume", name: "JUNGLE FLUME", kind: "flow", F, boat: logs[0], s: 0, v: 5, busy: false, minV: 5.6, lift: 5 });
    let u = 0; w.anim.push((dt) => { u = (u + dt * 0.02) % 1; logs.forEach((g, i) => { if (i === 0 && R.busy) return; placeCar(g, sample(F, (u + i / 3) * F.L, _S), 0.4); }); });
    w.sign("JUNGLE FLUME", { bg: "#2a8a3a", color: "#fff", px: 512 }, 8, 1.4, x, 3, z + 28, 0);
    w.interact(x + 36, z, 4, "ジャングルフリューム（丸太のボート）に乗る", () => ({ rideId: "flume" }), "🛶");
  };
  /* スターホイール（観覧車）：上書き（乗ると少し速く回る） */
  P.nightWheel = function (x, z) {
    const w = this, Rr = 38, H = 44;
    [-1, 1].forEach((s) => { [-1, 1].forEach((f) => { const g = new T.CylinderGeometry(0.6, 0.9, Math.hypot(H, 16), 10); const m4 = new T.Matrix4().compose(new T.Vector3(x + f * 8, H / 2, z + s * 4), new T.Quaternion().setFromEuler(new T.Euler(0, 0, -f * Math.atan2(16, H))), new T.Vector3(1, 1, 1)); w.batch.add("white2", w.m.white2, g, m4); }); });
    w.box("stoneW", x, 0, z, 26, 1, 14, { collide: true }); w.caster(x, z, 20, 10, H + Rr * 0.4);
    const wheel = new T.Group(); wheel.position.set(x, H, z); w.scene.add(wheel);
    const parts = { white2: [], neonPink: [], neonCyan: [], neonYellow: [], neonPurple: [] };
    const put = (key, g, m4) => { g.applyMatrix4(m4); parts[key].push(g); };
    [-2, 2].forEach((dz) => { put("white2", new T.TorusGeometry(Rr, 0.35, 8, 128), new T.Matrix4().makeTranslation(0, 0, dz)); put("white2", new T.TorusGeometry(Rr * 0.5, 0.2, 6, 64), new T.Matrix4().makeTranslation(0, 0, dz)); });
    for (let i = 0; i < 32; i++) { const a = i / 32 * TAU; put("white2", new T.CylinderGeometry(0.1, 0.1, Rr, 4), new T.Matrix4().compose(new T.Vector3(Math.cos(a) * Rr / 2, Math.sin(a) * Rr / 2, 0), new T.Quaternion().setFromEuler(new T.Euler(0, 0, a - Math.PI / 2)), new T.Vector3(1, 1, 1))); }
    const leds = ["neonPink", "neonCyan", "neonYellow", "neonPurple"];
    for (let i = 0; i < 96; i++) { const a = i / 96 * TAU; put(leds[i % 4], new T.SphereGeometry(0.25, 6, 4), new T.Matrix4().makeTranslation(Math.cos(a) * Rr, Math.sin(a) * Rr, 2.4)); }
    for (let k = 0; k < 6; k++) put(["neonPink", "neonCyan", "neonPurple"][k % 3], new T.TorusGeometry(Rr * (0.6 + k * 0.07), 0.08, 4, 96), new T.Matrix4().makeTranslation(0, 0, 2.2));
    put("neonPurple", new T.CylinderGeometry(2, 2, 5, 24), new T.Matrix4().makeRotationX(Math.PI / 2));
    for (const k in parts) if (parts[k].length) wheel.add(new T.Mesh(XWorld.mergeGeos(parts[k]), w.m[k]));
    const cols = [0xff5f8f, 0xffc84a, 0x5ab8ff, 0x7ce0a0, 0xc08aff, 0xff8a3d], NG = 20;
    const cabG = XWorld.mergeGeos([new T.CylinderGeometry(1.6, 1.6, 2.4, 16).translate(0, -2, 0), new T.ConeGeometry(1.8, 0.8, 16).translate(0, -0.4, 0)]);
    const cabM = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, emissive: 0xffffff, emissiveIntensity: 0.05 });
    w.nightMats.push({ m: cabM, day: 0.05, night: 0.45 });
    const cabs = new T.InstancedMesh(cabG, cabM, NG), c = new T.Color(); for (let i = 0; i < NG; i++) { c.setHex(cols[i % cols.length]); cabs.setColorAt(i, c); }
    cabs.frustumCulled = false; w.scene.add(cabs);
    const R = rideReg(w, { id: "wheel", name: "STAR WHEEL", kind: "wheel", x, z, H, R: Rr, NG, rot: 0, mul: 1, busy: false, gi: 0 });
    const m4 = new T.Matrix4();
    w.anim.push((dt) => { R.rot += dt * 0.04 * R.mul; wheel.rotation.z = R.rot; for (let i = 0; i < NG; i++) { const a = i / NG * TAU + R.rot; m4.makeTranslation(x + Math.cos(a) * Rr, H + Math.sin(a) * Rr, z); cabs.setMatrixAt(i, m4); } cabs.instanceMatrix.needsUpdate = true; });
    w.sign("STAR WHEEL", { grad: ["#ff4fb0", "#a86aff"], color: "#fff", px: 512 }, 12, 1.8, x, 2.6, z + 7.1, 0);
    w.interact(x, z + 10, 4, "スターホイール（観覧車・高さ 80m）に乗る", () => ({ rideId: "wheel" }), "🎡");
  };
  /* ピープルムーバー（高架をまわる電車）：上書き（乗れる） */
  P.peopleMover = function (corners, y) {
    const w = this;
    const path = []; for (let i = 0; i < corners.length; i++) { const a = corners[i], b = corners[(i + 1) % corners.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.ceil(L / 8); for (let k = 0; k < n; k++) path.push(new T.Vector3(a[0] + (b[0] - a[0]) * k / n, y, a[1] + (b[1] - a[1]) * k / n)); }
    const curve = new T.CatmullRomCurve3(path, true, "catmullrom", 0.05), F = frames(curve, true, false, 800);
    w.geo("white2", new T.TubeGeometry(curve, 600, 1.0, 6, true).scale(1, 0.8, 1), 0, 0, 0);
    for (let i = 0; i < path.length; i += 3) { const p = path[i]; w.box("white2", p.x, 0, p.z, 1.1, y - 0.6, 1.1, { collide: true }); }
    const cars = [], cm = new T.MeshStandardMaterial({ color: 0xf6f8fc, roughness: 0.25, metalness: 0.5 }), wm = new T.MeshStandardMaterial({ color: 0x2a8ae8, roughness: 0.1, metalness: 0.6, emissive: 0x2a6ae8, emissiveIntensity: 0.2 });
    for (let i = 0; i < 3; i++) { const g = new T.Group(); const b = new T.Mesh(new T.CapsuleGeometry(1.3, 7, 4, 12), cm); b.rotation.x = Math.PI / 2; g.add(b); const wn = new T.Mesh(new T.BoxGeometry(2.64, 0.8, 7.2), wm); wn.position.y = 0.3; g.add(wn); w.scene.add(g); cars.push(g); }
    const R = rideReg(w, { id: "mover", name: "XEVA ピープルムーバー", kind: "loop", F, cars, s: 0, v: 11, busy: false, gap: 10, lift: 1.9 });
    w.anim.push((dt) => { R.s = (R.s + dt * R.v) % F.L; cars.forEach((c, i) => placeCar(c, sample(F, R.s - i * R.gap, _S), 1.9)); });
    const [sx, sz] = corners[0]; w.box("gTeal", sx - 6, 0, sz + 6, 6, y + 3, 6, { collide: true }); w.sign("PEOPLE MOVER", { bg: "#0a2a4a", color: "#fff", px: 512 }, 5, 1, sx - 2.9, 4, sz + 6, Math.PI / 2);
    w.interact(sx - 1.5, sz + 10, 4, "ピープルムーバー（ビルの間を高架で1周）に乗る", () => ({ rideId: "mover" }), "🚈");
  };
  /* スプラッシュスライダー（お城の上から水のすべり台）：上書き */
  P.slideCastle = function (x, z) {
    const w = this, H = 26;
    w.box("paleY", x, 0, z, 12, H, 12, { collide: true }); w.box("rOrange", x, H, z, 14, 0.8, 14);
    [[-6, -6], [6, -6], [-6, 6], [6, 6]].forEach(([a, b], i) => w.turret(x + a, z + b, 2.4, H + 4, "paleP", ["rBlue", "rRed", "rTeal", "rPurple"][i], true));
    w.turret(x, z, 3.2, H + 10, "paleB", "rPink", true);
    w.caster(x, z, 14, 14, H + 6);
    const sl = [["pRed", 0, 1, 1.7], ["pBlue", Math.PI / 2, -1, 1.3], ["pYellow", Math.PI, 1, 1.9], ["pGreen", -Math.PI / 2, -1, 1.5], ["pPurple", Math.PI / 4, 1, 1.1], ["pOrange", -Math.PI * 0.75, -1, 2.2]];
    let first = null;
    sl.forEach(([key, a0, dir, turns], k) => {
      const pts = []; const top = H - 1 - (k % 3) * 4;
      for (let i = 0; i <= 90; i++) { const t = i / 90, a = a0 + dir * t * TAU * turns, r = 9 + t * (10 + k * 3); pts.push(new T.Vector3(x + Math.cos(a) * r, top - t * (top - 1.2), z + Math.sin(a) * r)); }
      const cv = new T.CatmullRomCurve3(pts);
      w.geo(key, new T.TubeGeometry(cv, 220, 1.1, 10, false), 0, 0, 0);
      for (let i = 0; i < 90; i += 9) { const p = pts[i]; w.box("white2", p.x, 0, p.z, 0.3, p.y, 0.3); w.colCircle(p.x, p.z, 0.3); }
      const end = pts[90]; w.pond(end.x, end.z, 4, "pool", true);
      if (!first) first = cv;
    });
    const F = frames(first, false, false, 400);
    const raft = new T.Mesh(new T.TorusGeometry(0.55, 0.25, 8, 16).rotateX(Math.PI / 2), w.m.pYellow); raft.visible = false; w.scene.add(raft);
    rideReg(w, { id: "slide", name: "SPLASH CASTLE", kind: "slide", F, boat: raft, busy: false });
    w.sign("SPLASH CASTLE", { bg: "#ff5f8f", color: "#fff", px: 512 }, 9, 1.6, x, 8, z + 6.1, 0);
    w.interact(x, z + 9, 4, "スプラッシュスライダー（お城のてっぺんから）をすべる", () => ({ rideId: "slide" }), "🌊");
  };
  /* 流れるプール・サンセットクルーズ（線を作って登録するだけ） */
  P.buildRideExtras = function () {
    const w = this;
    { const cx = -512, cz = 595, pts = []; for (let i = 0; i < 96; i++) { const a = i / 96 * TAU; pts.push(new T.Vector3(cx + Math.cos(a) * 92, 0.1, cz + Math.sin(a) * 88)); }
      const F = frames(new T.CatmullRomCurve3(pts, true), true, false, 600);
      const ring = new T.Mesh(new T.TorusGeometry(0.7, 0.3, 8, 18).rotateX(Math.PI / 2), w.m.pPink); ring.visible = false; w.scene.add(ring);
      rideReg(w, { id: "river", name: "流れるプール", kind: "float", F, boat: ring, s: 0, v: 2.2, busy: false });
      w.interact(cx, cz + 96, 5, "流れるプールで浮き輪にのる（いつでも E でおりる）", () => ({ rideId: "river" }), "🛟");     /* ★ 乗り場は外の岸（前は水路の当たりの中で、近づけなかった） */
      w.detail(() => { w.box("woodLight", cx, 0, cz + 94.6, 5, 0.25, 2.6); for (let k = 0; k < 4; k++) w.geo(["pPink", "pYellow", "pBlue", "pGreen"][k], new T.TorusGeometry(0.55, 0.22, 8, 14).rotateX(Math.PI / 2), cx - 1.8 + k * 1.2, 0.5, cz + 95.4); }); }
    { const pts = []; for (let i = 0; i <= 48; i++) { const a = 1.9 + i / 48 * 0.8; pts.push(new T.Vector3(...[XP.islandPt(a, 1.14)].map(([x, z]) => [x, -0.35, z])[0])); }
      for (let i = 0; i <= 24; i++) { const a = 2.7 - i / 24 * 0.8; pts.push(new T.Vector3(...[XP.islandPt(a, 1.24)].map(([x, z]) => [x, -0.35, z])[0])); }
      const F = frames(new T.CatmullRomCurve3(pts, true, "centripetal"), true, false, 800);
      const boat = new T.Group(); const hull = new T.Mesh(new T.BoxGeometry(4.6, 1.4, 14), w.m.white2); hull.position.y = 0.5; boat.add(hull); const cab = new T.Mesh(new T.BoxGeometry(3.6, 2.0, 5), w.m.windowDark); cab.position.set(0, 2.1, -1.5); boat.add(cab); const top = new T.Mesh(new T.BoxGeometry(4.0, 0.2, 6), w.m.pNavy); top.position.set(0, 3.2, -1.5); boat.add(top);
      boat.visible = false; w.scene.add(boat);
      rideReg(w, { id: "cruise", name: "サンセットクルーズ", kind: "float", F, boat, s: 0, v: 12, busy: false, lift: 0 });
      const [bx, bz] = XP.islandPt(2.24, 1.06); w.interact(bx, bz, 5, "サンセットクルーズ（ボートで海岸をまわる）に乗る", () => ({ rideId: "cruise" }), "🛥️"); }
  };

  /* ══════════════ 乗る（カメラ・物理・終わり） ══════════════ */
  const RIDE = {
    cur: null, view: 0,
    start(id, ctx) {
      const R = ctx.world.rides && ctx.world.rides[id]; if (!R || this.cur) return false;
      this.cur = { R, t: 0, s: R.kind === "coaster" ? R.s0 : R.kind === "loop" ? R.s : 0, v: R.kind === "coaster" ? 2 : R.v || 4, phase: 0, lap: 0, done: false, y: 3, back: [ctx.player.x, ctx.player.z, ctx.player.yaw] };
      R.busy = true; if (R.boat) R.boat.visible = true;
      if (R.kind === "wheel") { let best = 0, bd = 1e9; for (let i = 0; i < R.NG; i++) { const a = ((i / R.NG * TAU + R.rot) % TAU + TAU) % TAU, d = Math.abs(a - Math.PI * 1.5); if (d < bd) { bd = d; best = i; } } this.cur.gi = best; this.cur.rot0 = R.rot; R.mul = 3; }
      if (R.kind === "shuttle") { this.cur.from = R.f; this.cur.to = R.f > 0.5 ? 0 : 1; }
      if (R.kind === "flat" && R.startRide) R.startRide();
      return true;
    },
    stop(ctx, msg) {
      const C = this.cur; if (!C) return; const R = C.R;
      R.busy = false; if (R.kind === "wheel") R.mul = 1; if (R.boat && R.kind !== "flow" && !R.keepBoat) R.boat.visible = false;
      if (R.kind === "coaster") R.s = C.s;
      const back = C.exit || C.back; ctx.player.x = back[0]; ctx.player.z = back[1]; ctx.player.yaw = back[2] || 0; ctx.player.y = 0;
      ctx.camera.up.set(0, 1, 0); this.cur = null;
      return msg;
    },
    toggleView() { this.view = 1 - this.view; return this.view; },
    /* 毎フレーム：カメラとキャラの置き場所を決める。終わったら "end" を返す */
    update(dt, ctx, skip) {
      const C = this.cur; if (!C) return null; const R = C.R, cam = ctx.camera, av = ctx.player.av; C.t += dt;
      let eye = new T.Vector3(), look = new T.Vector3(), up = new T.Vector3(0, 1, 0), seat = null, info = "";
      if (R.kind === "coaster") {
        const F = R.F, S = sample(F, C.s, _S), slope = S.t.y;
        let a = -G * slope - 0.012 * G - 0.0016 * C.v * C.v;
        C.v += a * dt; if (slope > 0.02 && C.v < (R.chain || 4.2)) C.v = R.chain || 4.2; C.v = Math.max(C.v, 1.5);     /* 巻き上げの速さ（乗り物ごと） */
        if (C.lap >= 1) { const dd = ((R.s0 + 4 - C.s) % F.L + F.L) % F.L; C.v = Math.min(C.v, Math.max(0.6, dd * 0.6)); if (dd < 0.8 || dd > F.L - 2) { C.done = true; } }
        const ns = C.s + C.v * dt * (skip ? 3 : 1); if (Math.floor((ns - R.s0) / F.L) > Math.floor((C.s - R.s0) / F.L) && C.t > 5) C.lap++; C.s = ns;
        R.cars.forEach((c, i) => placeCar(c, sample(F, C.s - i * R.gap, _S2), 0.3));
        sample(F, C.s, _S); placeCar(R.cars[0], _S, 0.3);
        seat = { p: R.cars[0].position.clone().addScaledVector(_S.n, 0.55), q: R.cars[0].quaternion.clone() };
        if (this.view === 0) { eye.copy(_S.p).addScaledVector(_S.n, 2.05).addScaledVector(_S.t, -0.5); look.copy(eye).addScaledVector(_S.t, 12).addScaledVector(_S.n, -0.9); up.copy(_S.n); }
        else { eye.copy(_S.p).addScaledVector(_S.t, -11).addScaledVector(_S.n, 3.5).addScaledVector(UP, 2); look.copy(_S.p).addScaledVector(_S.t, 5); up.copy(R.loop ? _S.n : UP); }
        info = Math.round(C.v * 3.6) + " km/h ・ 高さ " + Math.round(_S.p.y) + " m";
        if (C.done) return this.end(ctx, R.name + " — おつかれさまでした！");
      } else if (R.kind === "drop") {
        let y = C.y;
        if (C.phase === 0) { y = 3; if (C.t > 1.2) { C.phase = 1; } }
        else if (C.phase === 1) { y += dt * (skip ? 14 : 4.2); if (y >= R.H - 8) { y = R.H - 8; C.phase = 2; C.t2 = 0; } }
        else if (C.phase === 2) { C.t2 += dt; if (C.t2 > 3.2) { C.phase = 3; C.v = 0; } info = C.t2 < 3.2 ? "…" + Math.max(1, Math.ceil(3.2 - C.t2)) : ""; }
        else if (C.phase === 3) { if (y > R.H * 0.35) C.v += G * dt; else C.v = Math.max(0, C.v - G * 2.6 * dt); y -= C.v * dt; if (y <= 3.05 || (C.v < 0.2 && y < R.H * 0.35)) { y = 3; C.phase = 4; C.t3 = 0; } info = Math.round(C.v * 3.6) + " km/h"; }
        else { C.t3 += dt; if (C.t3 > 1.2) return this.end(ctx, "フリーフォール — おつかれさまでした！"); }
        C.y = y; R.ring.position.y = y; R.ring.rotation.y += dt * 0.15;
        const a = R.ring.rotation.y + Math.PI / 2, ex = R.x + Math.cos(a) * 5.6, ez = R.z + Math.sin(a) * 5.6;
        eye.set(ex, y + 0.5, ez); look.set(ex + Math.cos(a) * 10, y + (C.phase === 3 ? -6 : -1.5), ez + Math.sin(a) * 10);
        seat = { p: new T.Vector3(ex, y - 0.7, ez), yaw: Math.atan2(Math.cos(a), Math.sin(a)) };
        if (!info && C.phase <= 1) info = "高さ " + Math.round(y) + " m";
      } else if (R.kind === "wheel") {
        const a = C.gi / R.NG * TAU + R.rot, gx = R.x + Math.cos(a) * R.R, gy = R.H + Math.sin(a) * R.R - 2;
        eye.set(gx, gy + 0.6, R.z - 1.2); const yaw = -0.55 + Math.sin(C.t * 0.2) * 0.5; look.set(gx - Math.sin(yaw) * 20 - 6, gy - 4, R.z - Math.cos(yaw) * 20);
        seat = { p: new T.Vector3(gx, gy - 0.9, R.z), yaw: Math.PI };
        info = "高さ " + Math.round(gy) + " m"; if (R.rot - C.rot0 >= TAU - 0.05 || (skip && C.t > 2)) return this.end(ctx, "スターホイール — 夜景はいかがでしたか？");
      } else if (R.kind === "loop") {
        const lead = R.cars[0]; sample(R.F, R.s, _S);
        eye.copy(lead.position).addScaledVector(_S.t, 3.2).add(new T.Vector3(0, 0.6, 0)); look.copy(eye).addScaledVector(_S.t, 12).add(new T.Vector3(0, -2, 0));
        info = "高架をぐるりと1周（E でおりる）"; if (C.t > R.F.L / R.v || skip) { C.exit = [lead.position.x + 4, lead.position.z + 4, 0]; return this.end(ctx, "ピープルムーバーをおりました"); }
      } else if (R.kind === "shuttle") {
        C.from += (C.to - C.from) * 0 + (C.to > C.from ? 1 : -1) * dt / ((R.zb - R.za) / 5); const f = Math.max(0, Math.min(1, C.from)); R.f = f; R.obj.position.set(R.x, 0, R.za + f * (R.zb - R.za));
        const dir = C.to > 0.5 ? 1 : -1; eye.set(R.x, 2.9, R.obj.position.z + dir * 3.6); look.set(R.x, 2.4, R.obj.position.z + dir * 20);
        info = "路面電車"; if ((dir > 0 && f >= 1) || (dir < 0 && f <= 0) || skip) { C.exit = [R.x + (R.x < 0 ? -3 : 3), R.obj.position.z, dir > 0 ? 0 : Math.PI]; return this.end(ctx, "路面電車をおりました"); }
      } else if (R.kind === "flat") {
        /* ★★ 2026-09-30 回る乗り物（メリーゴーラウンド・カップ・スイング・妖怪船・バンパーカー）：乗り物が決めた席の位置から見る */
        const Q = R.pose(C.t, _S2);
        eye.copy(Q.p).addScaledVector(Q.up || UP, 1.12); look.copy(Q.look); up.copy(this.view === 0 && Q.up ? Q.up : UP);
        if (this.view === 1) { eye.copy(Q.p).add(new T.Vector3(Math.sin(Q.yaw + Math.PI) * 5, 3, Math.cos(Q.yaw + Math.PI) * 5)); look.copy(Q.p).add(new T.Vector3(0, 1, 0)); }
        seat = { p: Q.p.clone().add(new T.Vector3(0, -0.45, 0)), yaw: Q.yaw };
        info = Q.info || R.name;
        if (C.t > (R.dur || 45) || (skip && C.t > 1.5)) { if (R.stopRide) R.stopRide(); return this.end(ctx, R.name + " — たのしかった？"); }
      } else if (R.kind === "flow" || R.kind === "slide" || R.kind === "float") {
        const F = R.F, S = sample(F, C.s, _S);
        if (R.kind === "float") C.v = R.v; else { C.v += (-G * S.t.y - 0.25 * C.v) * dt; if (R.kind === "flow" && S.t.y > 0.02) C.v = Math.max(C.v, R.lift || 4); C.v = Math.max(C.v, R.kind === "slide" ? 3 : R.minV || 3); }
        C.s += C.v * dt * (skip && R.kind === "float" ? 4 : 1);
        placeCar(R.boat, sample(F, C.s, _S), R.kind === "slide" ? 0.2 : 0.35);
        eye.copy(_S.p).addScaledVector(UP, R.cam || (R.kind === "float" && R.id === "cruise" ? 4.5 : 1.5)).addScaledVector(_S.t, R.id === "cruise" ? 2 : 0.2); look.copy(eye).addScaledVector(_S.t, 12).addScaledVector(UP, R.kind === "slide" ? -2 : -0.5);
        seat = { p: R.boat.position.clone().add(new T.Vector3(0, R.id === "cruise" ? 1.2 : 0.1, 0)), q: R.boat.quaternion.clone() };
        info = R.kind === "float" ? R.name + "（E でおりる）" : Math.round(C.v * 3.6) + " km/h";
        const endS = R.kind === "slide" ? F.L - 0.5 : F.L;
        if ((R.F.closed ? C.s >= F.L + 1 : C.s >= endS) || (skip && R.kind === "float")) {
          if (R.kind === "slide") { const e = F.pos[F.n]; C.exit = [e.x + 5, e.z + 5, 0]; }
          if (R.kind === "flow") C.exit = [R.F.pos[0].x + 4, R.F.pos[0].z, 0];
          return this.end(ctx, R.kind === "slide" ? "ザブーン！ スライダー おつかれさまでした" : R.name + " をおりました");
        }
      }
      /* カメラ（前の席の目線は少しゆれる） */
      cam.up.copy(up); cam.position.lerp(eye, Math.min(1, dt * (this.view === 0 ? 20 : 5))); cam.lookAt(look);
      if (av) {
        av.root.visible = !!seat && this.view === 1;
        if (seat) { av.root.position.copy(seat.p); if (seat.q) av.root.quaternion.copy(seat.q); else { av.root.rotation.set(0, seat.yaw || 0, 0); } }
      }
      C.info = info;
      return C;
    },
    end(ctx, msg) { const C = this.cur; if (ctx.player.av) { ctx.player.av.root.quaternion.identity(); } this.stop(ctx); return { end: true, msg }; }
  };

  /* ══════════════ XEVA HOVER（どこでも呼べるホバーバイク） ══════════════ */
  function hoverMesh(w) {
    const g = new T.Group(), body = new T.MeshStandardMaterial({ color: 0xf4f6fb, roughness: 0.25, metalness: 0.55 }), acc = new T.MeshStandardMaterial({ color: 0x6a4ae8, roughness: 0.3, metalness: 0.5 });
    body.envMapIntensity = 1.2;
    const b = new T.Mesh(new T.CapsuleGeometry(0.42, 1.7, 6, 14).rotateX(Math.PI / 2), body); b.position.y = 0.55; b.scale.set(1, 0.7, 1); g.add(b);
    const nose = new T.Mesh(new T.ConeGeometry(0.42, 0.9, 14).rotateX(Math.PI / 2), acc); nose.position.set(0, 0.62, 1.45); nose.scale.set(1, 0.65, 1); g.add(nose);
    const seat = new T.Mesh(new T.BoxGeometry(0.5, 0.14, 0.9), new T.MeshStandardMaterial({ color: 0x1a1a24, roughness: 0.6 })); seat.position.set(0, 0.92, -0.25); g.add(seat);
    const bar = new T.Mesh(new T.CylinderGeometry(0.035, 0.035, 0.9, 6).rotateZ(Math.PI / 2), w.m.chromeB); bar.position.set(0, 1.28, 0.62); g.add(bar);
    const stem = new T.Mesh(new T.CylinderGeometry(0.04, 0.05, 0.5, 6), w.m.chromeB); stem.position.set(0, 1.05, 0.62); stem.rotation.x = -0.35; g.add(stem);
    [-1, 1].forEach((s) => { const fin = new T.Mesh(new T.BoxGeometry(0.08, 0.36, 1.0), acc); fin.position.set(s * 0.46, 0.45, -0.7); fin.rotation.z = s * 0.35; g.add(fin); });
    const ring = new T.Mesh(new T.TorusGeometry(0.62, 0.07, 8, 32).rotateX(Math.PI / 2), w.m.neonCyan); ring.position.y = 0.16; ring.scale.set(1, 1, 1.8); g.add(ring);
    const glow = new T.Mesh(new T.CircleGeometry(0.9, 24).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ color: 0x4ff0ff, transparent: true, opacity: 0.35, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false })); glow.position.y = 0.03; glow.scale.set(1, 1, 1.9); g.add(glow);
    const tail = new T.Mesh(new T.BoxGeometry(0.5, 0.08, 0.05), w.m.neonRed); tail.position.set(0, 0.62, -1.3); g.add(tail);
    g.visible = false; w.scene.add(g);
    return { g, glow };
  }
  const HOVER = {
    on: false, v: 0, yaw: 0, x: 0, z: 0, y: 0, roll: 0, pitch: 0, mesh: null,
    ensure(w) { if (!this.mesh) this.mesh = hoverMesh(w); },
    start(ctx) { const p = ctx.player; this.ensure(ctx.world); this.on = true; this.x = p.x; this.z = p.z; this.yaw = p.yaw; this.v = 0; this.y = ctx.world.heightAt(p.x, p.z) + 0.45; this.mesh.g.visible = true; },
    stop(ctx) { if (!this.on) return; this.on = false; this.mesh.g.visible = false; const p = ctx.player; p.x = this.x + Math.cos(this.yaw) * 1.1; p.z = this.z - Math.sin(this.yaw) * 1.1; p.yaw = this.yaw; ctx.world.resolve(p, 0.3); },
    /* inp: { ix, iz, boost } → true で自分が動かしている */
    update(dt, inp, ctx) {
      if (!this.on) return false;
      const w = ctx.world, thr = -inp.iz, st = inp.ix, boost = inp.boost ? 1 : 0, maxV = 22 + boost * 12;
      if (thr > 0.05) this.v += thr * (14 + boost * 10) * dt; else if (thr < -0.05) this.v += thr * (this.v > 0.5 ? 26 : 8) * dt; else this.v -= Math.sign(this.v) * Math.min(Math.abs(this.v), 6 * dt);
      this.v = Math.max(-6, Math.min(maxV, this.v - this.v * Math.abs(this.v) * 0.0012 * dt * 60 * 0.02));
      const turn = st * (1.9 - 0.9 * Math.min(1, Math.abs(this.v) / 20)) * (this.v < 0 ? -1 : 1);
      this.yaw -= turn * dt * Math.min(1, 0.35 + Math.abs(this.v) / 6);
      const ox = this.x, oz = this.z;
      /* ★★ 2026-09-30b 少しずつ動かして毎回ぶつかりを調べる（前は速いと薄い壁・柵をすり抜けた＝ご指定「ホバーに乗っていると貫通できたり」） */
      const mvx = Math.sin(this.yaw) * this.v * dt, mvz = Math.cos(this.yaw) * this.v * dt, nSub = Math.max(1, Math.ceil(Math.hypot(mvx, mvz) / 0.3));
      const pp = { x: this.x, z: this.z, y: this.y, _ok: this._ok, _pier: this._pier };
      let hit = 0; for (let k = 0; k < nSub; k++) { pp.x += mvx / nSub; pp.z += mvz / nSub; hit += w.resolve(pp, 0.9); }
      this._ok = pp._ok; this._pier = pp._pier;
      if (hit) { const moved = Math.hypot(pp.x - (ox + mvx), pp.z - (oz + mvz)); if (moved > 0.02) this.v *= Math.max(0.35, 1 - moved * 0.8); }          /* 押しもどされた分だけ減速 */
      this.x = pp.x; this.z = pp.z;
      const real = Math.hypot(this.x - ox, this.z - oz) / Math.max(dt, 1e-4); if (hit && real < Math.abs(this.v) * 0.6) this.v = Math.sign(this.v) * real;     /* 正面からぶつかったら止まる（壁にそっては すべる） */
      const gy = w.heightAt(this.x, this.z) + 0.45 + Math.sin(ctx.t * 3.1) * 0.05;
      this.y += (gy - this.y) * Math.min(1, dt * 10);
      this.roll += ((-st * Math.min(1, Math.abs(this.v) / 12) * 0.38) - this.roll) * Math.min(1, dt * 5);
      this.pitch += ((-thr * 0.06 + (boost ? -0.04 : 0)) - this.pitch) * Math.min(1, dt * 4);
      const g = this.mesh.g; g.position.set(this.x, this.y, this.z); g.rotation.set(this.pitch, this.yaw, this.roll, "YXZ");
      this.mesh.glow.material.opacity = 0.25 + Math.min(0.4, Math.abs(this.v) / 50) + boost * 0.2;
      const p = ctx.player; p.x = this.x; p.z = this.z; p.yaw = this.yaw; p.y = this.y;
      this.speed = Math.min(Math.abs(this.v), real);
      return true;
    }
  };

  window.XRides = { RIDE, HOVER, frames, sample, placeCar, rideReg, trackMeshes, coasterCars, station, rideAt };
})();
