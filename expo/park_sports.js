/* ══════════════════════════════════════════════════════════════════
   XEVARION PARK — スポーツワールド（★★ 2026-09-29d ご指定「それぞれのスポーツ会場も実際に存在する大規模な会場を参考にそれぞれ豪華に」
   「新たなスポーツエリアなどもディズニーワールドのように拡大」）
   ------------------------------------------------------------------
   13 SPORTS WORLD … XEVARION NATIONAL STADIUM（大きな陸上競技場：2層のすり鉢の客席（色のモザイク）・3段の木の軒と緑・
        白い屋根の輪・400m トラック・聖火台・大画面）、スポーツホール（体育館）。
   31 XEVARION BALLPARK（南西）… 野球場（ダイヤモンド・内野の土・外野の芝・フェンス・内野席と外野席・大きなスコアボード・照明塔）。
        入口で MagiDiamond（キャラクター野球）へ。
   ・建物のデザインはオリジナル（実在の会場の雰囲気だけ参考）。
   ══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const T = THREE, X = XTex, P = XWorld.World.prototype, TAU = Math.PI * 2, XP = XPark, MOBILE = XP.MOBILE;

  /* 陸上競技場の形（直線 L・半径 r の角の丸い長円）。t 0〜1 で1周 */
  function ovalPt(cx, cz, L, r, t) {
    const per = 2 * L + TAU * r, s = ((t % 1) + 1) % 1 * per;
    if (s < L) return [cx - L / 2 + s, cz + r, 0, 1];
    if (s < L + Math.PI * r) { const a = (s - L) / r; return [cx + L / 2 + Math.sin(a) * r, cz + Math.cos(a) * r, Math.sin(a), Math.cos(a)]; }
    if (s < 2 * L + Math.PI * r) { const u = s - L - Math.PI * r; return [cx + L / 2 - u, cz - r, 0, -1]; }
    const a = (s - 2 * L - Math.PI * r) / r; return [cx - L / 2 - Math.sin(a) * r, cz - Math.cos(a) * r, -Math.sin(a), -Math.cos(a)];
  }
  /* 長円の帯（平ら・上向き）と壁（縦・内向き/外向き）を、色つき頂点でまとめる */
  function ovalBand(cx, cz, L, r0, r1, y, n, colorAt, skip) {
    const pos = [], col = [], idx = [];
    for (let i = 0; i <= n; i++) { const t = i / n, a = ovalPt(cx, cz, L, r0, t), b = ovalPt(cx, cz, L, r1, t); pos.push(a[0], y, a[1], b[0], y, b[1]); const c = colorAt ? colorAt(t, i) : [1, 1, 1]; col.push(...c, ...c); if (i < n && !(skip && skip(t + 0.5 / n))) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); } }
    const g = new T.BufferGeometry(); g.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new T.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    /* 面を上向きにそろえる（三角形の向きも） */
    const nr = g.attributes.normal; let down = 0; for (let i = 0; i < nr.count; i++) if (nr.getY(i) < 0) down++;
    if (down > nr.count / 2) { const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const q = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = q; } g.computeVertexNormals(); }
    return g;
  }
  function ovalWall(cx, cz, L, r, y0, y1, n, inward, skip) {
    const pos = [], idx = [];
    for (let i = 0; i <= n; i++) { const t = i / n, a = ovalPt(cx, cz, L, r, t); pos.push(a[0], y0, a[1], a[0], y1, a[1]); if (i < n && !(skip && skip(t + 0.5 / n))) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } }
    const g = new T.BufferGeometry(); g.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    /* 内向き／外向き：中心（cx, cz）の方へ向いているかで三角形の向きをそろえる */
    const nr = g.attributes.normal, p = g.attributes.position; let toC = 0; for (let i = 0; i < nr.count; i += 7) { const dx = cx - p.getX(i), dz = cz - p.getZ(i); if (nr.getX(i) * dx + nr.getZ(i) * dz > 0) toC++; else toC--; }
    if ((toC > 0) !== !!inward) { const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const q = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = q; } g.computeVertexNormals(); }
    return g;
  }

  /* ══════════════ 13 SPORTS WORLD ══════════════ */
  P.buildSports = function () {
    const w = this;
    w.areaZone("sports");
    w.places.push(["13 SPORTS WORLD（国立競技場の前）", 306, 752, Math.PI / 2]);
    const cx = 430, cz = 752, L = 84, R0 = 30, NL = 8, LW = 1.22, RT = R0 + NL * LW;
    const lm = w._landmark; w._landmark = true;
    /* ── フィールド：400m トラック・芝・レーンの線 ── */
    { const oval = (r) => { const pts = []; for (let i = 0; i <= 96; i++) { const [x, z] = ovalPt(cx, cz, L, r, i / 96); pts.push([x, z]); } return pts; };
      const shape = (r) => { const s = new T.Shape(); oval(r).forEach(([x, z], i) => { if (i) s.lineTo(x - cx, -(z - cz)); else s.moveTo(x - cx, -(z - cz)); }); return s; };
      const outer = shape(RT + 3); outer.holes.push(new T.Path(oval(R0).map(([x, z]) => new T.Vector2(x - cx, -(z - cz))).reverse()));
      const tg = new T.ShapeGeometry(outer, 8); tg.rotateX(-Math.PI / 2); w.batch.add("track", w.m.track, tg, new T.Matrix4().makeTranslation(cx, 0.03, cz));
      const fg = new T.ShapeGeometry(shape(R0), 8); fg.rotateX(-Math.PI / 2); const uv = fg.attributes.uv, pp = fg.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, pp.getX(i) / 105 + 0.5, pp.getZ(i) / 68 + 0.5); w.batch.add("turf", w.m.turf, fg, new T.Matrix4().makeTranslation(cx, 0.035, cz));
      for (let k = 1; k < NL; k++) { const pts = oval(R0 + k * LW); for (let i = 0; i < pts.length - 1; i++) { const [a, b] = pts[i], [c, d] = pts[i + 1], Ls = Math.hypot(c - a, d - b), g = new T.PlaneGeometry(0.06, Ls); g.rotateX(-Math.PI / 2); g.rotateY(Math.atan2(c - a, d - b)); w.batch.add("lineW", w.m.lineW, g, new T.Matrix4().makeTranslation((a + c) / 2, 0.04, (b + d) / 2)); } }
      (w.noGrass = w.noGrass || []).push([cx - L / 2 - RT - 60, cz - RT - 50, cx + L / 2 + RT + 60, cz + RT + 50]); }
    /* ── 客席：2層のすり鉢（色のモザイク）・手すり ── */
    const EARTH = [[0.93, 0.93, 0.9], [0.55, 0.42, 0.3], [0.35, 0.5, 0.32], [0.82, 0.72, 0.45], [0.62, 0.58, 0.55], [0.25, 0.3, 0.28]];
    const rn = X.rnd(13), mosaic = () => { const c = EARTH[Math.floor(rn() * EARTH.length)], k = 0.85 + rn() * 0.2; return [c[0] * k, c[1] * k, c[2] * k]; };
    const GATE = (t) => { const d = (x) => Math.min(Math.abs(t - x), Math.abs(t - x - 1), Math.abs(t - x + 1)); const per = 2 * L + TAU * (RT + 10), q1 = (L + Math.PI * (RT + 10) / 2) / per, q2 = (2 * L + Math.PI * (RT + 10) * 1.5) / per; return d(q1) < 0.014 || d(q2) < 0.014; };          /* 両はし（東西）の入口 */
    const vcM = w.m.stadVC || (w.m.stadVC = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }));
    const tier = (rA, rows, d, y0, rise, gates) => { for (let i = 0; i < rows; i++) { const r = rA + i * d, y = y0 + i * rise; w.batch.add("stadVC", vcM, ovalBand(cx, cz, L, r, r + d, y, 240, () => mosaic(), gates ? GATE : null), new T.Matrix4()); w.batch.add("concrete", w.m.concrete, ovalWall(cx, cz, L, r, i ? y - rise : 0, y, 240, true, gates ? GATE : null), new T.Matrix4()); } };
    tier(RT + 5, 12, 0.95, 1.0, 0.52, true);
    const RM = RT + 5 + 12 * 0.95;
    w.batch.add("concrete", w.m.concrete, ovalBand(cx, cz, L, RM, RM + 3.2, 1.0 + 11 * 0.52, 200, null, GATE), new T.Matrix4());
    tier(RM + 3.2, 11, 1.0, 8.6, 0.66, false);
    const ROUT = RM + 3.2 + 11;
    w.batch.add("concrete", w.m.concrete, ovalWall(cx, cz, L, ROUT, 0, 8.6 + 10 * 0.66 + 1.4, 240, true), new T.Matrix4());
    w.batch.add("chromeB", w.m.chromeB, ovalWall(cx, cz, L, RT + 4.8, 0, 1.9, 240, true, GATE), new T.Matrix4());
    /* ★★ 2026-09-30b 東西の入口（トンネル）：客席の断面の壁と、上の段の下の天井（前は横から見ると客席の下が消えていた） */
    { const per = 2 * L + TAU * (RT + 10), q1 = (L + Math.PI * (RT + 10) / 2) / per, q2 = (2 * L + Math.PI * (RT + 10) * 1.5) / per;
      const quadGeo = (quads) => { const pos = [], idx = []; quads.forEach((q) => { let b = pos.length / 3; q.forEach((p) => pos.push(...p)); idx.push(b, b + 1, b + 2, b, b + 2, b + 3); b = pos.length / 3; q.forEach((p) => pos.push(...p)); idx.push(b, b + 2, b + 1, b, b + 3, b + 2); }); const g = new T.BufferGeometry(); g.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g; };
      const P3 = (r, y, t) => { const [x, z] = ovalPt(cx, cz, L, r, t); return [x, y, z]; };
      [q1, q2].forEach((q) => {
        [-0.0145, 0.0145].forEach((dq) => { const t = q + dq, quads = []; for (let i = 0; i < 12; i++) { const r0 = RT + 5 + i * 0.95, y = 1.0 + i * 0.52; quads.push([P3(r0, 0, t), P3(r0 + 0.95, 0, t), P3(r0 + 0.95, y, t), P3(r0, y, t)]); } quads.push([P3(RM, 0, t), P3(RM + 3.2, 0, t), P3(RM + 3.2, 8.6, t), P3(RM, 8.6, t)]); w.batch.add("concrete", w.m.concrete, quadGeo(quads), new T.Matrix4()); });
        const quads = []; for (let k = 0; k < 8; k++) { const ta = q - 0.0145 + k * 0.029 / 8, tb = ta + 0.029 / 8; quads.push([P3(RT + 5, 8.2, ta), P3(RM + 3.2, 8.2, ta), P3(RM + 3.2, 8.2, tb), P3(RT + 5, 8.2, tb)]); } w.batch.add("concrete", w.m.concrete, quadGeo(quads), new T.Matrix4());
      }); }
    /* ── 外の壁：3段の木の軒（縦の木の格子）と緑・白い柱 ── */
    const RF = ROUT + 3;
    [6.5, 13.5, 20.5].forEach((y, k) => {
      w.batch.add("woodDark2", w.m.woodDark2, ovalBand(cx, cz, L, RF - 1, RF + 4 - k * 0.6, y, 220), new T.Matrix4());
      w.batch.add("leafLight", w.m.leafLight, ovalBand(cx, cz, L, RF + 3.2 - k * 0.6, RF + 4 - k * 0.6, y + 0.35, 220), new T.Matrix4());
      for (let i = 0; i < 150; i++) { const t = i / 150, [x, z, nx, nz] = ovalPt(cx, cz, L, RF + 1.2 - k * 0.3, t); w.box(i % 2 ? "woodDark2" : "woodLight", x, y - 6.4, z, 0.28, 6.2, 0.9, { ry: Math.atan2(nx, nz) }); }
    });
    w.batch.add("woodDark2", w.m.woodDark2, ovalWall(cx, cz, L, RF - 1, 0, 20.5, 240, false), new T.Matrix4());
    for (let i = 0; i < 40; i++) { const [x, z] = ovalPt(cx, cz, L, RF + 3, i / 40); w.geo("white2", new T.CylinderGeometry(0.5, 0.7, 26, 10), x, 13, z); }
    /* 屋根の輪（白い上面・木の下面）＝ 客席の上をおおう */
    w.batch.add("white2", w.m.white2, ovalBand(cx, cz, L, RT + 16, RF + 5, 26.5, 240), new T.Matrix4());
    { const g = ovalBand(cx, cz, L, RT + 16, RF + 5, 26.1, 240); const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const q = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = q; } g.computeVertexNormals(); w.batch.add("woodLight", w.m.woodLight, g, new T.Matrix4()); }
    w.batch.add("neonWhite", w.m.neonWhite, ovalWall(cx, cz, L, RT + 16.2, 25.4, 26.1, 240, true), new T.Matrix4());
    /* 当たり（外の壁・トラックの外の手すり：入口はあける） */
    { const outPts = [], inPts = []; for (let i = 0; i <= 160; i++) { const t = i / 160; outPts.push(ovalPt(cx, cz, L, RF - 0.6, t)); inPts.push(ovalPt(cx, cz, L, RT + 4.8, t)); }
      const gapAt = (x, z) => Math.abs(z - cz) < 7 && Math.abs(x - cx) > L / 2;
      w.colPolyline(outPts.map((p) => [p[0], p[1]]), 0.6, gapAt); w.colPolyline(inPts.map((p) => [p[0], p[1]]), 0.4, gapAt);
      w.caster(cx, cz - RF + 6, L + 2 * RF, 14, 27); w.caster(cx, cz + RF - 6, L + 2 * RF, 14, 27); w.caster(cx - L / 2 - RF + 8, cz, 16, 2 * RF - 20, 27); w.caster(cx + L / 2 + RF - 8, cz, 16, 2 * RF - 20, 27); }
    /* 大画面（両はし）・聖火台（南） */
    [-1, 1].forEach((s) => w.screen(22, 8.5, 1024, cx + s * (L / 2 + RT + 13), 21, cz, s < 0 ? Math.PI / 2 : -Math.PI / 2, (g, W, H, t) => { const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, "#0a1a4a"); gr.addColorStop(1, "#3a0a4a"); g.fillStyle = gr; g.fillRect(0, 0, W, H); g.fillStyle = "#fff"; g.font = "900 72px sans-serif"; g.textAlign = "center"; g.fillText("XEVARION NATIONAL STADIUM", W / 2, H * 0.4); g.font = "800 44px sans-serif"; g.fillStyle = "#ffd86a"; g.fillText(["400m TRACK", "SPORTS WORLD", "WELCOME!", "WORLD RECORD?"][Math.floor(t / 4) % 4], W / 2, H * 0.72); g.textAlign = "left"; }, { every: 0.5 }));
    { const fx = cx, fz = cz + RF + 14; w.geo("white2", new T.CylinderGeometry(1.2, 2.6, 16, 12), fx, 8, fz); w.geo("gold", new T.CylinderGeometry(4.4, 2.2, 3, 24, 1, true), fx, 17.5, fz); w.colCircle(fx, fz, 2.8); w.caster(fx, fz, 5, 5, 19);
      const fm = new T.MeshBasicMaterial({ color: 0xffa030, transparent: true, opacity: 0.9, toneMapped: false }), fl = [0, 1, 2].map((i) => { const m = new T.Mesh(new T.ConeGeometry(2.6 - i * 0.6, 6 - i, 10), fm); m.position.set(fx, 21 + i * 0.8, fz); w.scene.add(m); w.loose(m, 1500); return m; });
      w.anim.push((dt, t) => fl.forEach((m, i) => { m.scale.set(1 + Math.sin(t * 9 + i) * 0.08, 1 + Math.sin(t * 7 + i * 2) * 0.18, 1 + Math.cos(t * 8 + i) * 0.08); m.rotation.y = t * (1 + i); }));
      w.sign("SPORTS WORLD 聖火台", { bg: "#e0402a", color: "#fff", px: 512 }, 6, 0.9, fx, 3.2, fz - 2.7, Math.PI); }
    w.sign("XEVARION NATIONAL STADIUM", { bg: "#1a3a2a", color: "#fff", glow: "#ffe7a0", px: 1024 }, 28, 2.6, cx, 23.5, cz - RF - 4.6, Math.PI);
    w.sign("XEVARION NATIONAL STADIUM", { bg: "#1a3a2a", color: "#fff", glow: "#ffe7a0", px: 1024 }, 28, 2.6, cx, 23.5, cz + RF + 4.6, 0);
    /* 入口（両はし）の門と広場 */
    [-1, 1].forEach((s) => { const x = cx + s * (L / 2 + RF + 6); w.rect("plaza", x - 10, cz - 14, x + 10, cz + 14, 0.012); w.box("white2", x, 9, cz, 3, 1.6, 26); w.sign("GATE " + (s < 0 ? "W" : "E"), { bg: "#1a3a2a", color: "#fff", px: 256, both: true }, 5, 1.2, x, 11.4, cz, Math.PI / 2); [-1, 1].forEach((k) => w.box("white2", x, 0, cz + k * 12, 1.2, 9, 1.2, { collide: true })); });
    /* スポーツホール（体育館） */
    w.bld(562, 812, 50, 26, 12, { key: "techG", roof: "gable", roofKey: "rMetalB", rh: 4, ry: Math.PI / 2, sign: { text: "SPORTS HALL", bg: "#1a5a3a", w: 18, h: 1.6, y: 9 }, inside: { type: "gym", name: "スポーツホール", h: 9, door: 4 } });
    for (let i = 0; i < 8; i++) w.flag(308 + i * 34, 846, [0xe0402a, 0xffffff, 0x3a78e8][i % 3], 9);
    w._landmark = lm;
    w.areaGate(304, 752, -Math.PI / 2, "sports", "big");
    w.plazaCrowd(cx, cz, 26, 0.6);
  };

  /* ══════════════ 31 XEVARION BALLPARK（野球場） ══════════════ */
  P.buildBallpark = function () {
    const w = this, HX = -218, HZ = 790, F = -Math.PI / 2;           /* ホームベース・センターの向き（北） */
    w.areaZone("ballpark");
    w.places.push(["31 XEVARION BALLPARK（一塁側の入口）", -150, 760, -Math.PI / 2]);
    const pol = (r, a) => [HX + Math.cos(a) * r, HZ + Math.sin(a) * r];
    const fan = (r, a0, a1, n) => { const s = new T.Shape(); s.moveTo(0, 0); for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; s.lineTo(Math.cos(a) * r, -Math.sin(a) * r); } s.lineTo(0, 0); return s; };
    const flat = (key, shape, y) => { const g = new T.ShapeGeometry(shape, 1); g.rotateX(-Math.PI / 2); const uv = g.attributes.uv, pp = g.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, pp.getX(i) / 8, pp.getZ(i) / 8); w.batch.add(key, w.m[key], g, new T.Matrix4().makeTranslation(HX, y, HZ)); };
    const lm = w._landmark; w._landmark = true;
    /* フィールド：外野の芝・内野の土・内野の芝・ファウルライン・ベース・マウンド */
    flat("turf", fan(96, F - Math.PI / 4 - 0.06, F + Math.PI / 4 + 0.06, 40), 0.03);
    flat("soilDark", fan(30, F - Math.PI / 4 - 0.05, F + Math.PI / 4 + 0.05, 24), 0.036);
    { const s = new T.Shape(), d = 27.4 / Math.SQRT2 - 1.6; s.moveTo(0, 1.6); s.lineTo(d, 1.6 + d); s.lineTo(0, 1.6 + 2 * d); s.lineTo(-d, 1.6 + d); s.lineTo(0, 1.6); const g = new T.ShapeGeometry(s); g.rotateX(-Math.PI / 2); w.batch.add("turf", w.m.turf, g, new T.Matrix4().makeTranslation(HX, 0.042, HZ)); }
    w.geo("soilDark", new T.CylinderGeometry(2.8, 2.8, 0.25, 20), HX, 0.12, HZ - 18.4);
    w.geo("soilDark", new T.CylinderGeometry(4, 4, 0.02, 20), HX, 0.05, HZ);
    [[0, 0], [19.4, -19.4], [0, -38.8], [-19.4, -19.4]].forEach(([dx, dz], i) => w.geo("pWhite", i ? new T.BoxGeometry(0.4, 0.1, 0.4).rotateY(Math.PI / 4) : new T.CylinderGeometry(0.3, 0.3, 0.06, 5), HX + dx, 0.07, HZ + dz));
    [F - Math.PI / 4, F + Math.PI / 4].forEach((a) => { const g = new T.PlaneGeometry(0.1, 95); g.rotateX(-Math.PI / 2); g.rotateY(-a + Math.PI / 2); const [x, z] = pol(47.5, a); w.batch.add("lineW", w.m.lineW, g, new T.Matrix4().makeTranslation(x, 0.05, z)); });
    (w.noGrass = w.noGrass || []).push([HX - 100, HZ - 125, HX + 100, HZ + 60]);
    /* 外野のフェンス（青いクッション・黄色い線）・ポール */
    { const a0 = F - Math.PI / 4 - 0.02, a1 = F + Math.PI / 4 + 0.02, n = 40, pts = [];
      for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n, [x, z] = pol(96, a); pts.push([x, z]); if (i < n) { const b = a0 + (a1 - a0) * (i + 1) / n, [x2, z2] = pol(96, b), sl = Math.hypot(x2 - x, z2 - z), ry = Math.atan2(x2 - x, z2 - z); w.box("pNavy", (x + x2) / 2, 0, (z + z2) / 2, 0.5, 3.6, sl + 0.05, { ry }); w.box("pYellow", (x + x2) / 2, 3.6, (z + z2) / 2, 0.55, 0.15, sl + 0.05, { ry }); } }
      w.colPolyline(pts, 0.4);
      [a0, a1].forEach((a) => { const [x, z] = pol(96.5, a); w.geo("pYellow", new T.CylinderGeometry(0.25, 0.25, 22, 8), x, 11, z); }); }
    /* 内野席（ホームのうしろ・一塁〜三塁）：すり鉢の段・手すり・屋根。RingGeometry の角度 θ は上から見て −(世界の角) */
    const SA0 = F + Math.PI / 4 + 0.22, SA1 = F - Math.PI / 4 - 0.22 + TAU, ROWS = 18, D = 1.2, RISE = 0.7, R0 = 30, n = 60;
    for (let r = 0; r < ROWS; r++) { const ra = R0 + r * D, y = 0.8 + r * RISE;
      const tread = new T.RingGeometry(ra, ra + D, n, 1, -SA1, SA1 - SA0); tread.rotateX(-Math.PI / 2); w.geo(r % 5 === 4 ? "seatsWhite" : (r < 9 ? "seatsBlue2" : "seatsRed"), tread, HX, y, HZ);
      const hh = r ? RISE : y, riser = new T.CylinderGeometry(ra, ra, hh, n, 1, true, Math.PI / 2 - SA1, SA1 - SA0); const ix = riser.index.array; for (let i = 0; i < ix.length; i += 3) { const q = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = q; } riser.computeVertexNormals(); w.geo("concrete", riser, HX, y - hh / 2, HZ); }
    const RB = R0 + ROWS * D, BH = 0.8 + ROWS * RISE + 3;
    w.geo("brickWall", new T.CylinderGeometry(RB, RB, BH, n, 1, true, Math.PI / 2 - SA1, SA1 - SA0), HX, BH / 2, HZ);          /* ★ 2026-09-30 外の壁はれんが＋紺の帯 */
    { const bd = new T.CylinderGeometry(RB + 0.06, RB + 0.06, 1.2, n, 1, true, Math.PI / 2 - SA1, SA1 - SA0); w.geo("pNavy", bd, HX, BH - 2.2, HZ); const bd2 = new T.CylinderGeometry(RB + 0.07, RB + 0.07, 0.16, n, 1, true, Math.PI / 2 - SA1, SA1 - SA0); w.geo("gold", bd2, HX, BH - 1.5, HZ); }
    { const rin = new T.CylinderGeometry(RB - 0.05, RB - 0.05, BH, n, 1, true, Math.PI / 2 - SA1, SA1 - SA0); const ix = rin.index.array; for (let i = 0; i < ix.length; i += 3) { const q = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = q; } rin.computeVertexNormals(); w.geo("concrete", rin, HX, BH / 2, HZ); }
    { const roofG = new T.RingGeometry(R0 + 13, RB + 1, n, 1, -SA1, SA1 - SA0); roofG.rotateX(-Math.PI / 2); w.geo("pNavy", roofG, HX, BH + 1.5, HZ); const roofB = new T.RingGeometry(R0 + 13, RB + 1, n, 1, -SA1, SA1 - SA0); roofB.rotateX(Math.PI / 2); w.geo("woodLight", roofB, HX, BH + 1.4, HZ);
      const edge = new T.CylinderGeometry(R0 + 13, R0 + 13, 0.5, n, 1, true, Math.PI / 2 - SA1, SA1 - SA0); const ix = edge.index.array; for (let i = 0; i < ix.length; i += 3) { const q = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = q; } edge.computeVertexNormals(); w.geo("neonCyan", edge, HX, BH + 1.2, HZ); }
    for (let i = 0; i <= 8; i++) { const a = SA0 + (SA1 - SA0) * i / 8, [x, z] = pol(RB - 0.4, a); w.geo("white2", new T.CylinderGeometry(0.3, 0.4, BH + 1.5, 8), x, (BH + 1.5) / 2, z); }
    w.colRing(HX, HZ, R0 - 0.4, RB + 0.4, [[F - Math.PI / 4 - 0.2, F + Math.PI / 4 + 0.2]]);
    /* ★★ 2026-09-30b 内野席の両はしの断面をふさぐ */
    [SA0, SA1].forEach((a) => { const sh = new T.Shape(); sh.moveTo(R0 - 0.05, 0); for (let r = 0; r < ROWS; r++) { const y = 0.8 + r * RISE; sh.lineTo(R0 + r * D, y); sh.lineTo(R0 + (r + 1) * D, y); } sh.lineTo(RB, BH); sh.lineTo(RB, 0); sh.lineTo(R0 - 0.05, 0);
      [false, true].forEach((back) => { const g = new T.ShapeGeometry(sh); g.rotateY(-a); if (back) { const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const q = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = q; } g.computeVertexNormals(); } w.geo("concrete", g, HX, 0, HZ); }); });
    { const rail = new T.TorusGeometry(R0 - 0.2, 0.06, 4, n, SA1 - SA0); rail.rotateX(Math.PI / 2); rail.rotateZ(-SA0); w.geo("chromeB", rail, HX, 1.9, HZ); }
    w.caster(HX, HZ + 30, 110, 36, 18); w.caster(HX + 36, HZ, 30, 60, 18); w.caster(HX - 36, HZ, 30, 60, 18);
    /* 外野席（センターのうしろ）・スコアボード・照明塔 */
    { const a0 = F - 0.55, a1 = F + 0.55, flip = (g) => { const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const q = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = q; } g.computeVertexNormals(); return g; };
      for (let r = 0; r < 8; r++) { const ra = 100 + r * 1.2, y = 0.6 + r * 0.7, tread = new T.RingGeometry(ra, ra + 1.2, 30, 1, -a1, a1 - a0); tread.rotateX(-Math.PI / 2); w.geo(r % 2 ? "seatsYellow" : "seatsRed", tread, HX, y, HZ);
        /* ★ 2026-09-30 段の前の面（地面から・内向き）＝前から見ても下が透けない */
        w.geo("concrete", flip(new T.CylinderGeometry(ra, ra, y, 30, 1, true, Math.PI / 2 - a1, a1 - a0)), HX, y / 2, HZ); }
      const RBo = 100 + 8 * 1.2, BHo = 0.6 + 8 * 0.7 + 1.2;
      w.geo("brickWall", new T.CylinderGeometry(RBo, RBo, BHo, 30, 1, true, Math.PI / 2 - a1, a1 - a0), HX, BHo / 2, HZ);                       /* 背の壁（外向き・れんが） */
      w.geo("concrete", flip(new T.CylinderGeometry(RBo - 0.05, RBo - 0.05, BHo, 30, 1, true, Math.PI / 2 - a1, a1 - a0)), HX, BHo / 2, HZ);
      [a0, a1].forEach((a) => { const pts = [[100, 0], [RBo, 0], [RBo, BHo], [100, 0.6]], sh = new T.Shape(); pts.forEach(([r, y], i) => i ? sh.lineTo(r, y) : sh.moveTo(r, y)); const g = new T.ShapeGeometry(sh); g.rotateY(-a); w.geo("concrete", g, HX, 0, HZ); const g2 = new T.ShapeGeometry(sh); g2.rotateY(-a); flip(g2); w.geo("concrete", g2, HX, 0, HZ); });
      w.colRing(HX, HZ, 99, 110.5, [[F + 0.6, F - 0.6 + TAU]]); }
    { const [sx, sz] = pol(116, F); w.box("pNavy", sx, 0, sz - 2, 34, 3, 3); w.box("white2", sx - 15, 0, sz - 2, 1.4, 20, 1.4); w.box("white2", sx + 15, 0, sz - 2, 1.4, 20, 1.4); w.colRot(sx, sz - 2, 34, 3, 0); w.caster(sx, sz - 2, 34, 3, 22);
      w.screen(30, 13, 1024, sx, 12.4, sz - 0.4, 0, (g, W, H, t) => { g.fillStyle = "#06121a"; g.fillRect(0, 0, W, H); g.fillStyle = "#ffd86a"; g.font = "900 56px sans-serif"; g.textAlign = "center"; g.fillText("XEVARION BALLPARK", W / 2, 70); g.font = "800 40px monospace"; g.fillStyle = "#fff"; ["1", "2", "3", "4", "5", "6", "7", "8", "9", "R"].forEach((s, i) => g.fillText(s, 250 + i * 70, 150)); const sc = [[0, 1, 0, 2, 0, 0, 1, 0, 0], [1, 0, 0, 0, 3, 0, 0, 0, 1]]; ["XEVA", "YOMA"].forEach((nm, j) => { g.textAlign = "left"; g.fillStyle = j ? "#ff8aa8" : "#8ad8ff"; g.fillText(nm, 40, 220 + j * 80); g.textAlign = "center"; g.fillStyle = "#fff"; let tot = 0; sc[j].forEach((v, i) => { const show = i <= (Math.floor(t / 6) % 9); if (show) tot += v; g.fillText(show ? String(v) : "", 250 + i * 70, 220 + j * 80); }); g.fillStyle = "#ffd86a"; g.fillText(String(tot), 250 + 9 * 70, 220 + j * 80); }); g.font = "900 44px sans-serif"; g.fillStyle = "#7fe8ff"; g.fillText("MagiDiamond STADIUM", W / 2, H - 40); g.textAlign = "left"; }, { every: 1 }); }
    [[F - 0.9, 70], [F + 0.9, 70], [F - 2.2, 58], [F + 2.2, 58], [F - 0.35, 108], [F + 0.35, 108]].forEach(([a, r]) => { const [x, z] = pol(r, a); w.geo("white2", new T.CylinderGeometry(0.5, 0.9, 38, 8), x, 19, z); w.box("darkMetal", x, 38, z, 8, 3.2, 0.8, { ry: -a + Math.PI / 2 }); for (let i = 0; i < 6; i++) w.box("neonWhite", x + Math.cos(a + Math.PI / 2) * (i - 2.5) * 1.2, 38.6, z + Math.sin(a + Math.PI / 2) * (i - 2.5) * 1.2, 0.8, 0.8, 0.15, { ry: -a + Math.PI / 2 }); w.colCircle(x, z, 1); w.caster(x, z, 3, 3, 40); });
    /* 入口（一塁側）：門・MagiDiamond へ */
    { const gx = -150, gz = 760; w.rect("plaza", gx - 12, gz - 14, gx + 8, gz + 14, 0.012); w.box("pRed", gx - 2, 0, gz - 9, 1.6, 9, 1.6, { collide: true }); w.box("pRed", gx - 2, 0, gz + 9, 1.6, 9, 1.6, { collide: true }); w.box("white2", gx - 2, 9, gz, 2.4, 2, 20);
      w.sign("XEVARION BALLPARK", { bg: "#1a3a6a", color: "#fff", glow: "#ffd86a", px: 1024, both: true }, 16, 1.6, gx - 2, 10, gz, Math.PI / 2);
      const md = ((window.EXPO_DATA && EXPO_DATA.apps) || []).find((a) => a.id === "magidiamond");
      if (md) w.interact(gx - 2, gz + 12, 3.4, "MagiDiamond（キャラクター野球）で試合をする", () => ({ open: md.href, app: md }), "⚾");
      w.route([[gx + 8, gz], [-113, 760]], 12, "walkY", { lamps: "yoma", lampEvery: 16, trees: false, benches: false, bushes: false }); }
    w._landmark = lm;
    w.plazaCrowd(HX, HZ - 30, 26, 0.5);
    w.areaGate(-146, 760, Math.PI / 2, "ballpark", "big");
    w.forestOpen.push([HX, HZ - 30, 110]);
  };
})();
