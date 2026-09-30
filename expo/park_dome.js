/* ══════════════════════════════════════════════════════════════════
   XEVARION DOME — 東京ドームくらいの大きなライブ会場（★★ 2026-09-29b ご指定「ライブ会場はより大きい東京ドームや
   国立競技場規模に。動画に合わせた色・豪華で動くライトアップ・スピーカーなどで演出を最大に」）
   ------------------------------------------------------------------
   ・場所：サーキットの内がわ（まん中 −125,−425・直径 200m・屋根の高さ 58m）。南のゲートから入る（サーキットは歩道橋でまたぐ）。
   ・中：アリーナ（立ち見）・すり鉢の客席（32段・歩いて上れる・すわれる）・北の大ステージ（幅 70m）・
     メイン LED（64×36m：YouTube の動画をここに重ねる）・左右の LED・客席の上の LED の輪・花道とセンターステージ・
     つり下げたスピーカー（ラインアレイ）・トラス・ムービングライト 64・レーザー 24・炎 14・紙吹雪・ペンライトの観客。
   ・演出は park_shows.js の Arena（曲・BPM・動画のサムネイルの色）。
   ══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const T = THREE, X = XTex, P = XWorld.World.prototype, TAU = Math.PI * 2, XP = XPark, MOBILE = XP.MOBILE;
  const R = 100, WH = 30, APEX = 58, FR = 52, S0 = 54, S1 = 94, ROWS = 32, STEP = (S1 - S0) / ROWS, RISE = 0.8;
  /* 入口（外のゲート＝客席の通路）：南・南東・南西・東・西。北はステージ */
  const GATES = [Math.PI / 2, Math.PI / 2 - 0.75, Math.PI / 2 + 0.75, 0.2, Math.PI - 0.2];
  const GW = 0.075, STAGE_A = -Math.PI / 2, STAGE_W = 0.78;
  function flipGeo(g) { const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } const n = g.attributes.normal; for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i)); return g; }
  const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
  /* 世界の角度 φ（atan2(z,x)）→ CylinderGeometry の θ（x = r sinθ, z = r cosθ） */
  const th = (phi) => Math.PI / 2 - phi;

  P.buildDome = function (cx, cz) {
    const w = this;
    ["domeA", "domeB", "domeC"].forEach((k, i) => { if (!w.m[k]) w.m[k] = new T.MeshBasicMaterial({ color: [0xff4fb0, 0x4ff0ff, 0xffd84a][i], toneMapped: false }); });
    const L = (a, r) => [cx + Math.cos(a) * r, cz + Math.sin(a) * r];
    const lm = w._landmark; w._landmark = true;
    /* ── 外の壁（ガラスの帯）とゲートのあき ── */
    const gaps = GATES.map((a) => [a - GW, a + GW]).sort((p, q) => p[0] - q[0]);
    const segs = []; { const norm = gaps.map(([a0, a1]) => [((a0 % TAU) + TAU) % TAU, ((a1 % TAU) + TAU) % TAU]).sort((p, q) => p[0] - q[0]); for (let i = 0; i < norm.length; i++) { const e = norm[i][1], s = norm[(i + 1) % norm.length][0] + (i === norm.length - 1 ? TAU : 0); segs.push([e, s]); } }
    segs.forEach(([p0, p1]) => { const g = new T.CylinderGeometry(R, R, WH, Math.max(4, Math.round((p1 - p0) * 20)), 1, true, th(p1), p1 - p0); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (p1 - p0) * R / 10, uv.getY(i) * WH / 10); w.geo("gSilver", g, cx, WH / 2, cz); });
    GATES.forEach((a) => { const g = new T.CylinderGeometry(R, R, WH - 9, 3, 1, true, th(a + GW), GW * 2); w.geo("gSilver", g, cx, 9 + (WH - 9) / 2, cz); });
    /* 縦のひれ・上下の帯 */
    for (let i = 0; i < 96; i++) { const a = i / 96 * TAU; if (GATES.some((g) => Math.abs(angDiff(a, g)) < GW + 0.02)) continue; const [x, z] = L(a, R + 0.5); w.geo("white2", new T.BoxGeometry(1.0, WH, 1.6).rotateY(-a + Math.PI / 2), x, WH / 2, z); }
    [[0.4, 1.2], [WH - 0.6, 1.6]].forEach(([y, h]) => { const g = new T.CylinderGeometry(R + 0.8, R + 0.8, h, 96, 1, true); w.geo("white2", g, cx, y, cz); });
    /* ── 屋根（白い膜の球の一部・放射のケーブル・光のふち） ── */
    const RS = (R * R + (APEX - WH) * (APEX - WH)) / (2 * (APEX - WH)), capA = Math.asin(R / RS), cy = APEX - RS;
    w.geo("white2", new T.SphereGeometry(RS, 72, 18, 0, TAU, 0, capA), cx, cy, cz);
    for (let i = 0; i < 24; i++) { const a = i / 24 * TAU, pts = []; for (let k = 0; k <= 16; k++) { const t = k / 16 * capA; pts.push(new T.Vector3(cx + Math.cos(a) * Math.sin(t) * (RS + 0.25), cy + Math.cos(t) * (RS + 0.25), cz + Math.sin(a) * Math.sin(t) * (RS + 0.25))); } w.geo("chromeB", new T.TubeGeometry(new T.CatmullRomCurve3(pts), 24, 0.22, 4, false), 0, 0, 0); }
    for (let k = 1; k < 5; k++) { const t = k / 5 * capA, rr = Math.sin(t) * (RS + 0.25), y = cy + Math.cos(t) * (RS + 0.25), rg = new T.TorusGeometry(rr, 0.18, 4, 96); rg.rotateX(Math.PI / 2); w.geo("chromeB", rg, cx, y, cz); }
    { const rg = new T.TorusGeometry(R + 0.9, 0.5, 6, 128); rg.rotateX(Math.PI / 2); w.geo("domeA", rg, cx, WH + 0.2, cz); const rg2 = new T.TorusGeometry(R * 0.55, 0.35, 6, 96); rg2.rotateX(Math.PI / 2); w.geo("domeB", rg2, cx, cy + Math.cos(Math.asin(0.55 * R / RS)) * RS + 0.4, cz); }
    /* 中から見る天井（内がわの面）と照明のすじ */
    w.geo("pNavy", flipGeo(new T.SphereGeometry(RS - 0.6, 64, 16, 0, TAU, 0, capA)), cx, cy, cz);
    w.caster(cx, cz, R * 1.6, R * 1.6, APEX * 0.8); w.casterCircle(cx, cz, R * 0.95, WH);
    w._landmark = lm;
    /* ── ゲート（ひさし・番号・光の枠） ── */
    GATES.forEach((a, i) => {
      const [x, z] = L(a, R + 2.2), ry = Math.atan2(Math.cos(a), Math.sin(a));
      w.geo("white2", new T.BoxGeometry(18, 0.6, 5).rotateY(ry), x, 9.2, z); w.geo("domeC", new T.BoxGeometry(18.2, 0.16, 5.2).rotateY(ry), x, 8.85, z);
      w.sign("GATE " + (i + 1), { bg: "#0a1a4a", color: "#fff", glow: "#7fd8ff", px: 512 }, 6, 1.4, x + Math.cos(a) * 2.6, 11.2, z + Math.sin(a) * 2.6, ry);
      [-1, 1].forEach((k) => { const px = x + Math.cos(a + Math.PI / 2) * k * 9, pz = z + Math.sin(a + Math.PI / 2) * k * 9; w.geo("chromeB", new T.CylinderGeometry(0.3, 0.3, 9, 10), px + Math.cos(a) * 2, 4.5, pz + Math.sin(a) * 2); });
    });
    w.colRing(cx, cz, R - 0.6, R + 1.2, GATES.map((a) => [a - GW + 0.01, a + GW - 0.01]));
    /* 南の大きな LED と名前 */
    w.bigScreen(cx, 19, cz + R + 1.4, 0, 44, 12, "XEVARION DOME", ["LIVE TONIGHT", "=LOVE などの動画を大画面で", "48,000 SEATS", "Connect Everything."], ["#1a0a4a", "#0a2a6a"]);
    w.sign("XEVARION DOME", { bg: "#0a1024", color: "#fff", glow: "#4ff0ff", border: "#ffd84a", px: 1024 }, 40, 4, cx, 28.5, cz + R + 1.6, 0);

    /* ── 中：アリーナの床・客席（すり鉢・32段）・背の壁 ── */
    { const g = new T.CircleGeometry(S0 - 0.2, 72); g.rotateX(-Math.PI / 2); const uv = g.attributes.uv, pp = g.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, pp.getX(i) / 4, pp.getZ(i) / 4); w.geo("stageTop", g, cx, 0.03, cz); }
    { const g = new T.RingGeometry(S1, R - 0.6, 96); g.rotateX(-Math.PI / 2); w.geo("expoFloor", g, cx, 0.03, cz); }
    const rakeGaps = GATES.map((a) => [a, GW + 0.01]).concat([[STAGE_A, STAGE_W]]);
    const arcs = []; { const bounds = rakeGaps.map(([a, h]) => [a - h, a + h]).map(([a0, a1]) => [((a0 % TAU) + TAU) % TAU, ((a1 % TAU) + TAU) % TAU]).sort((p, q) => p[0] - q[0]); for (let i = 0; i < bounds.length; i++) { const e = bounds[i][1], s = bounds[(i + 1) % bounds.length][0] + (i === bounds.length - 1 ? TAU : 0); if (s - e > 0.01) arcs.push([e, s]); } }
    for (let r = 0; r < ROWS; r++) {
      const r0 = S0 + r * STEP, y = 0.8 + r * RISE;
      arcs.forEach(([p0, p1]) => {
        const n = Math.max(4, Math.round((p1 - p0) * 30));
        const riser = new T.CylinderGeometry(r0, r0, y, n, 1, true, th(p1), p1 - p0); w.geo(r % 2 ? "carpetNavy" : "carpetGray", flipGeo(riser), cx, y / 2, cz);
        const tread = new T.RingGeometry(r0, r0 + STEP, n, 1, -p1, p1 - p0); tread.rotateX(-Math.PI / 2); w.geo(r % 4 < 2 ? "seatsRed" : "seatsBlue2", tread, cx, y, cz);
      });
    }
    /* ★★ 2026-09-30b 客席のはし（入口のすき間）の断面をふさぐ（ご指定「ドームなどで席を入場から横から見ると下が消えています」） */
    { const bh = 0.8 + ROWS * RISE + 2.4;
      arcs.forEach(([p0, p1]) => [p0, p1].forEach((a) => {
        const sh = new T.Shape(); sh.moveTo(S0 - 0.05, 0);
        for (let r = 0; r < ROWS; r++) { const y = 0.8 + r * RISE; sh.lineTo(S0 + r * STEP, y); sh.lineTo(S0 + (r + 1) * STEP, y); }
        sh.lineTo(S1, bh); sh.lineTo(S1, 0); sh.lineTo(S0 - 0.05, 0);
        const g1 = new T.ShapeGeometry(sh); g1.rotateY(-a); w.geo("concrete", g1, cx, 0, cz);
        const g2 = new T.ShapeGeometry(sh); g2.rotateY(-a); w.geo("concrete", flipGeo(g2), cx, 0, cz);
      })); }
    /* 客席の背の壁・通路（トンネル）の屋根・前の手すり */
    arcs.forEach(([p0, p1]) => { const n = Math.max(4, Math.round((p1 - p0) * 30)), bh = 0.8 + ROWS * RISE + 2.4; w.geo("pNavy", new T.CylinderGeometry(S1, S1, bh, n, 1, true, th(p1), p1 - p0), cx, bh / 2, cz); w.geo("pNavy", flipGeo(new T.CylinderGeometry(S1 - 0.05, S1 - 0.05, bh, n, 1, true, th(p1), p1 - p0)), cx, bh / 2, cz);          /* ★ 2026-09-29d 内がわの面（前は透けていた） */ const rail = new T.TorusGeometry(S0 - 0.1, 0.06, 4, n, p1 - p0); rail.rotateX(Math.PI / 2); rail.rotateY(-p0); w.geo("chromeB", rail, cx, 1.9, cz); });
    GATES.forEach((a) => { const n = 4; for (let k = 0; k < 3; k++) { const rr = S0 + 10 + k * 10, y = 0.8 + ((rr - S0) / STEP | 0) * RISE; w.geo("pNavy", new T.BoxGeometry(2 * rr * Math.sin(GW + 0.01) + 1, 0.6, 10).rotateY(-a + Math.PI / 2), cx + Math.cos(a) * (rr + 5), Math.max(4.4, y), cz + Math.sin(a) * (rr + 5)); } w.sign("▶ ARENA", { bg: "#0a1a4a", color: "#fff", px: 256 }, 3, 0.8, cx + Math.cos(a) * (S1 - 1.5), 4.2, cz + Math.sin(a) * (S1 - 1.5), Math.atan2(-Math.cos(a), -Math.sin(a))); });
    (w.heightExtra = w.heightExtra || []).push({ rake: 1, cx, cz, r0: S0, r1: S1, y0: 0.8, step: STEP, rise: RISE, n: ROWS, gaps: rakeGaps });
    w.colRing(cx, cz, S1 - 0.1, S1 + 0.6, GATES.map((a) => [a - GW, a + GW]));
    w.colRing(cx, cz, S0 - 0.3, S0 + 0.05, GATES.map((a) => [a - GW, a + GW]).concat([[STAGE_A - STAGE_W, STAGE_A + STAGE_W]]).concat(Array.from({ length: 12 }, (_, i) => { const a = i / 12 * TAU + 0.13; return [a - 0.025, a + 0.025]; })));
    /* 客席の階段（放射の通路の白い線） */
    for (let i = 0; i < 24; i++) { const a = i / 24 * TAU + 0.13; if (rakeGaps.some(([g, h]) => Math.abs(angDiff(a, g)) < h + 0.02)) continue; for (let r = 0; r < ROWS; r++) { const rr = S0 + (r + 0.5) * STEP, y = 0.8 + r * RISE + 0.02; w.geo("lineW", new T.BoxGeometry(1.2, 0.02, STEP * 0.9).rotateY(-a + Math.PI / 2), cx + Math.cos(a) * rr, y, cz + Math.sin(a) * rr); } }
    /* 座席（インスタンス）＋すわれる所 */
    let seatsIM = null;
    if (!MOBILE) {
      const seatG = XWorld.mergeGeos([new T.BoxGeometry(0.48, 0.08, 0.42).translate(0, 0.42, 0), new T.BoxGeometry(0.48, 0.5, 0.06).translate(0, 0.66, -0.2)]);
      const pos = [];
      for (let r = 0; r < ROWS; r++) { const rr = S0 + (r + 0.55) * STEP, y = 0.8 + r * RISE, n = Math.floor(TAU * rr / 0.62); for (let k = 0; k < n; k++) { const a = k / n * TAU; if (rakeGaps.some(([g, h]) => Math.abs(angDiff(a, g)) < h + 0.02)) continue; if (Array.from({ length: 24 }, (_, i) => i / 24 * TAU + 0.13).some((q) => Math.abs(angDiff(a, q)) < 0.6 / rr * 1.4)) continue; pos.push([a, rr, y]); } }
      seatsIM = new T.InstancedMesh(seatG, w.m.seatsRed, pos.length); const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), c = new T.Color();
      const FX0 = 0, FZ0 = -30;          /* ★ 2026-09-29d 向く先＝ステージ寄りの点（ドームの中心から北へ 30m） */
      pos.forEach(([a, rr, y], i) => { e.set(0, Math.atan2(FX0 - Math.cos(a) * rr, FZ0 - Math.sin(a) * rr), 0); q.setFromEuler(e); m4.compose(new T.Vector3(Math.cos(a) * rr, y, Math.sin(a) * rr), q, new T.Vector3(1, 1, 1)); seatsIM.setMatrixAt(i, m4); c.setHex(((i >> 5) + Math.floor(y)) % 5 === 0 ? 0xf2f2f2 : (Math.floor(y / 6) % 2 ? 0x2a4ad8 : 0xd83a4a)); seatsIM.setColorAt(i, c); });
      seatsIM.position.set(cx, 0, cz); seatsIM.computeBoundingSphere(); w.scene.add(seatsIM);
    }
    for (let i = 0; i < 24; i++) { const a = i / 24 * TAU + 0.13 + 0.03; if (rakeGaps.some(([g, h]) => Math.abs(angDiff(a, g)) < h + 0.05)) continue; for (let r = 1; r < ROWS; r += 3) { const rr = S0 + (r + 0.55) * STEP, y = 0.8 + r * RISE; w.seats.push({ x: cx + Math.cos(a) * rr, z: cz + Math.sin(a) * rr, yaw: Math.atan2(0 - Math.cos(a) * rr, -30 - Math.sin(a) * rr), h: y + 0.44 }); } }

    /* ── 北の大ステージ・LED・花道・センターステージ ── */
    const SZ = cz - 44, SW2 = 70, SD = 22, SH = 2.2, sx = cx;
    w.box("stageTop", sx, 0, SZ - SD / 2, SW2, SH, SD, { collide: true }); w.box("domeB", sx, SH - 0.1, SZ + 0.05, SW2, 0.14, 0.12);
    w.box("pBlack", sx, 0, SZ - SD - 8, SW2, 38, 2, { collide: true });
    const mainScr = w.screen(64, 36, 1280, sx, SH + 3 + 18, SZ - SD + 0.6, 0, (g, W2, H2, t) => XShows.Arena.drawMain(g, W2, H2, t), { every: 0.05 });
    const sideScr = [-1, 1].map((k) => w.screen(18, 32, 400, sx + k * 47, SH + 3 + 16, SZ - SD + 6, -k * 0.5, (g, W2, H2, t) => XShows.Arena.drawSide(g, W2, H2, t, k * 24), { every: 0.066 }));
    w.box("darkMetal", sx, SH + 3 + 36.4, SZ - SD + 0.3, 66, 1.2, 1.2); [-1, 1].forEach((k) => w.box("darkMetal", sx + k * 32.6, SH, SZ - SD + 0.3, 1.2, 39.6, 1.2));
    /* 客席の上の LED の輪（まわりを光が走る） */
    const ringScr = new X.Screen(2048, 64);
    const ring = new T.Mesh(new T.CylinderGeometry(S1 - 0.8, S1 - 0.8, 3.2, 128, 1, true), new T.MeshBasicMaterial({ map: ringScr.tex, side: T.BackSide, toneMapped: false }));
    ring.position.set(cx, 0.8 + ROWS * RISE + 4.4, cz); w.scene.add(ring); w.loose(ring, 700);
    /* 花道とセンターステージ */
    w.box("stageTop", sx, 0, (SZ + cz) / 2, 6, 1.4, SZ - cz - 0.001 < 0 ? cz - SZ : SZ - cz, { collide: false }); w.box("stageTop", sx, 0, cz, 16, 1.4, 16, {}); w.geo("domeA", new T.TorusGeometry(8.2, 0.12, 4, 48).rotateX(Math.PI / 2), sx, 1.42, cz);
    w.colObb(sx - 3.2, (SZ + cz) / 2, 0.4, Math.abs(SZ - cz), 0); w.colObb(sx + 3.2, (SZ + cz) / 2, 0.4, Math.abs(SZ - cz), 0);
    w.colRing(sx, cz, 7.8, 8.4, [[Math.PI / 2 - 0.3, Math.PI / 2 + 0.3], [-Math.PI / 2 - 0.25, -Math.PI / 2 + 0.25]]);
    w.heightExtra.push({ cx: sx, cz: (SZ + cz) / 2, ang: 0, hw: 3, hl: Math.abs(SZ - cz) / 2, y: 1.4 }, { cx: sx, cz, r: 8, y: 1.4 });
    /* 床の LED（ステージ・花道） */
    const led = new T.Mesh(new T.PlaneGeometry(SW2 - 2, SD - 2, 28, 10), new T.MeshBasicMaterial({ vertexColors: true, toneMapped: false })); led.rotation.x = -Math.PI / 2; led.position.set(sx, SH + 0.02, SZ - SD / 2);
    led.geometry.setAttribute("color", new T.BufferAttribute(new Float32Array(led.geometry.attributes.position.count * 3), 3)); w.scene.add(led); led.visible = false;
    /* トラス（ステージの上・アリーナの上の輪） */
    for (let k = 0; k < 4; k++) w.box("darkMetal", sx, 40, SZ - 2 - k * 6, SW2 + 4, 0.9, 0.9);
    [-1, 1].forEach((k) => w.box("darkMetal", sx + k * (SW2 / 2 + 2), 40, SZ - 11, 0.9, 0.9, 22));
    { const tr = new T.TorusGeometry(34, 0.5, 6, 64); tr.rotateX(Math.PI / 2); w.geo("darkMetal", tr, cx, 38, cz); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; w.geo("darkMetal", new T.CylinderGeometry(0.08, 0.08, APEX - 38 - 2, 4), cx + Math.cos(a) * 34, 38 + (APEX - 40) / 2, cz + Math.sin(a) * 34); } }
    /* つり下げたスピーカー（ラインアレイ）と足もとのスピーカー */
    [-44, -30, 30, 44].forEach((dx) => { for (let k = 0; k < 10; k++) { const tilt = k * 0.06; w.geo("pBlack", new T.BoxGeometry(2.6, 0.9, 1.8).rotateX(-tilt).translate(0, 0, 0), sx + dx, 34 - k * 0.95, SZ + 1 + k * 0.1); } w.geo("darkMetal", new T.CylinderGeometry(0.05, 0.05, 6, 4), sx + dx, 37.5, SZ + 1); });
    for (let i = 0; i < 8; i++) { const dx = -32 + i * 9.14; w.box("pBlack", sx + dx, SH, SZ + 0.6, 2.2, 1.6, 1.6); w.box("darkMetal", sx + dx, SH + 0.3, SZ + 1.42, 1.6, 1.0, 0.05); }
    [-1, 1].forEach((k) => { for (let j = 0; j < 3; j++) w.box("pBlack", sx + k * (SW2 / 2 + 3), j * 2.2, SZ - 4, 3, 2.1, 3, j === 0 ? { collide: true } : {}); });
    /* ムービングライト（64）・レーザー（24）・フォロースポット（4） */
    const beamM = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2, blending: T.AdditiveBlending, depthWrite: false, side: T.FrontSide, toneMapped: false, fog: false });
    const beams = [];
    for (let i = 0; i < 64; i++) {
      let fx, fy, fz;
      if (i < 32) { fx = sx - SW2 / 2 + 2 + (i % 16) * (SW2 - 4) / 15; fy = 39.4; fz = SZ - 2 - Math.floor(i / 16) * 12; }
      else { const a = (i - 32) / 32 * TAU; fx = cx + Math.cos(a) * 34; fy = 37.4; fz = cz + Math.sin(a) * 34; }
      const piv = new T.Group(); piv.position.set(fx, fy, fz); w.scene.add(piv);
      const cone = new T.Mesh(new T.CylinderGeometry(0.15, 3.4, 44, 16, 1, true).translate(0, -22, 0), beamM.clone()); piv.add(cone);
      const head = new T.Mesh(new T.CylinderGeometry(0.4, 0.4, 0.7, 10), w.m.darkMetal); piv.add(head);
      piv.visible = false; beams.push({ piv, cone, i, fx, fz });
    }
    const lasers = [];
    for (let i = 0; i < 24; i++) { const piv = new T.Group(); piv.position.set(sx - SW2 / 2 + 3 + i * (SW2 - 6) / 23, SH + 0.3, SZ + 0.4); w.scene.add(piv); const ln = new T.Mesh(new T.CylinderGeometry(0.04, 0.04, 140, 5, 1, true).rotateX(Math.PI / 2).translate(0, 0, 70), beamM.clone()); ln.material.opacity = 0.7; piv.add(ln); piv.visible = false; lasers.push({ piv, ln, i }); }
    const spots = [];
    [Math.PI / 2 - 0.4, Math.PI / 2 + 0.4, 0.3, Math.PI - 0.3].forEach((a, i) => { const [x, z] = L(a, S1 - 2), piv = new T.Group(); piv.position.set(x, 0.8 + ROWS * RISE + 1.5, z); const cone = new T.Mesh(new T.CylinderGeometry(0.2, 2.6, 80, 16, 1, true).translate(0, -40, 0), beamM.clone()); cone.material.opacity = 0.14; piv.add(cone); w.scene.add(piv); piv.visible = false; spots.push({ piv, cone, i }); });
    /* 炎（ステージの前 14）・紙吹雪 */
    const mkPts = (n, size, tex) => { const fp = new Float32Array(n * 3), fc = new Float32Array(n * 3), g = new T.BufferGeometry(); for (let i = 0; i < n; i++) fp[i * 3 + 1] = -999; g.setAttribute("position", new T.BufferAttribute(fp, 3)); g.setAttribute("color", new T.BufferAttribute(fc, 3)); const pts = new T.Points(g, new T.PointsMaterial({ size, map: tex, vertexColors: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false, toneMapped: false })); pts.frustumCulled = false; pts.visible = false; pts.layers.set(3); w.scene.add(pts); const P2 = []; for (let i = 0; i < n; i++) P2.push({ x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0, life: 0, c: [1, 1, 1], g: 7 }); return { pts, fp, fc, P2, k: 0 }; };
    const fdot = X.cv(64, 64), fdg = fdot.getContext("2d"), fgr = fdg.createRadialGradient(32, 32, 0, 32, 32, 30); fgr.addColorStop(0, "rgba(255,255,255,1)"); fgr.addColorStop(1, "rgba(255,255,255,0)"); fdg.fillStyle = fgr; fdg.fillRect(0, 0, 64, 64);
    const ftex = X.tex(fdot), flames = mkPts(MOBILE ? 500 : 1400, 1.8, ftex), conf = mkPts(MOBILE ? 800 : 2400, 0.7, ftex);
    conf.pts.material.blending = T.NormalBlending;
    const flameAt = Array.from({ length: 14 }, (_, i) => [sx - SW2 / 2 + 3 + i * (SW2 - 6) / 13, SH + 0.3, SZ + 0.2]);
    /* 観客（アリーナの立ち見＋客席）：ペンライトを振る・曲でとぶ */
    const r0 = X.rnd(909), spotsC = [];
    for (let x = -FR + 2; x < FR - 2; x += 1.0) for (let z = -FR + 2; z < FR - 2; z += 1.0) { const d = Math.hypot(x, z); if (d > FR - 3 || (z < -FR + SD + 8 && Math.abs(x) < SW2 / 2 + 4) || (Math.abs(x) < 4.5 && z < 2) || Math.hypot(x, z) < 10 || r0() < (MOBILE ? 0.78 : 0.22)) continue; if (GATES.some((a) => Math.abs(angDiff(Math.atan2(z, x), a)) < 0.12 && d > FR - 14)) continue; spotsC.push([cx + x + (r0() - 0.5) * 0.4, 0, cz + z + (r0() - 0.5) * 0.4, 0]); }
    for (let r = 0; r < ROWS; r += 1) { const rr = S0 + (r + 0.55) * STEP, y = 0.8 + r * RISE, n = Math.floor(TAU * rr / 0.62); for (let k = 0; k < n; k++) { if (r0() < (MOBILE ? 0.9 : 0.6)) continue; const a = k / n * TAU; if (rakeGaps.some(([g, h]) => Math.abs(angDiff(a, g)) < h + 0.02)) continue; spotsC.push([cx + Math.cos(a) * rr, y, cz + Math.sin(a) * rr, 1]); } }
    const body = XWorld.mergeGeos([new T.CylinderGeometry(0.17, 0.2, 0.9, 5).translate(0, 0.45, 0), new T.CylinderGeometry(0.2, 0.17, 0.62, 5).translate(0, 1.2, 0), new T.SphereGeometry(0.14, 6, 5).translate(0, 1.63, 0)]);
    const U = { uT: XP.TIME, uBeat: { value: 0 }, uJump: { value: 0 }, uPen: { value: new T.Color(1, 0.3, 0.7) }, uWave: { value: 0 } };
    const cm = new T.MeshLambertMaterial({ color: 0xffffff });
    cm.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, U); sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uT, uBeat, uJump;").replace("#include <begin_vertex>", "#include <begin_vertex>\n{ vec4 ip = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0); float ph = fract(sin(dot(ip.xz, vec2(12.99, 78.23))) * 437.5); transformed.y += max(0.0, sin((uBeat + ph * 0.15) * 6.2832)) * 0.22 * uJump; }"); };
    const crowd = new T.InstancedMesh(body, cm, spotsC.length), m4 = new T.Matrix4(), cc = new T.Color(), cols = [0x2a2a38, 0x3a3a52, 0xf2f2f2, 0x1a2a4a, 0x4a2a3a, 0xff8ab8, 0x8ab8ff, 0xffd84a];
    spotsC.forEach(([x, y, z, st], i) => { const face = st ? Math.atan2(cx - x, cz - z) * 0 + Math.atan2(sx - x, (SZ - 10) - z) : Math.atan2(sx - x, (SZ - 10) - z); m4.compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(0, face + (r0() - 0.5) * 0.4, 0)), new T.Vector3(1, (0.9 + r0() * 0.18) * (st ? 0.82 : 1), 1)); crowd.setMatrixAt(i, m4); cc.setHex(cols[Math.floor(r0() * cols.length)]); crowd.setColorAt(i, cc); });
    crowd.frustumCulled = false; crowd.layers.set(3); crowd.visible = false; w.scene.add(crowd);
    const penM = new T.ShaderMaterial({ uniforms: U,
      vertexShader: "uniform float uT, uBeat, uJump, uWave; varying float vGl; void main(){ vec4 ip = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0); float ph = fract(sin(dot(ip.xz, vec2(12.99, 78.23))) * 437.5); float a = sin((uBeat * (uWave > 0.5 ? 1.0 : 0.5) + ph * 0.1) * 6.2832) * 0.9; vec3 p = position; float c = cos(a), s = sin(a); p.yz = vec2(c * p.y - s * p.z, s * p.y + c * p.z); p += vec3(0.0, 1.78 + max(0.0, sin((uBeat + ph * 0.15) * 6.2832)) * 0.22 * uJump, 0.18); vGl = position.y; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(p, 1.0); }",
      fragmentShader: "uniform vec3 uPen; varying float vGl; void main(){ gl_FragColor = vec4(uPen * (1.6 + vGl * 2.0), 1.0); }" });
    const pens = new T.InstancedMesh(new T.CylinderGeometry(0.03, 0.03, 0.42, 4).translate(0, 0.21, 0), penM, spotsC.length); for (let i = 0; i < spotsC.length; i++) { crowd.getMatrixAt(i, m4); pens.setMatrixAt(i, m4); }
    pens.frustumCulled = false; pens.layers.set(3); pens.visible = false; w.scene.add(pens);
    /* ── まわり：中のあかり・ゾーン・入る部屋・動画の場所 ── */
    w.zone("XEVARION DOME（ライブ会場）", cx - 90, cz - 90, cx + 90, cz + 90, "live");
    (w.interiors = w.interiors || []).push({ x: cx, z: cz, r: R - 1, hi: 46, name: "XEVARION DOME", round: true, type: "live" });
    (w.noGrass = w.noGrass || []).push([cx - R - 2, cz - R - 2, cx + R + 2, cz + R + 2]);
    w.forestOpen.push([cx, cz, R + 30]);
    const inside = (p) => Math.hypot(p.x - cx, p.z - cz) < R - 1;
    w.liveArena = { cx, cz, R, sx, SZ, x0: cx - R, x1: cx + R, z0: cz - R, z1: cz + R, beams, lasers, spots, led, crowd, pens, seats: seatsIM, U, mainScr, sideScr, ringScr, ring, flames, flameAt, conf, inside, wash: null };
    w.videoSpots = w.videoSpots || {};
    w.videoSpots.arena = { scr: mainScr, cam: [sx, 9, cz + 18], look: [sx, SH + 3 + 18, SZ - SD + 0.6], arena: true };
    w.interact(sx, cz + 12, 6, "ドームの大画面で動画を見る（=LOVE など・YouTube）", () => ({ video: "arena" }), "🎤");
    w.interact(sx + 12, cz + 22, 4, "デモのライブを見る（パークの曲で）", () => ({ arenaDemo: true }), "✨");
    w.npcSpots.arena = [[sx - 8, cz + 22, Math.PI]];
    /* ── 外：南の広場・サーキットをまたぐ歩道橋・旗・屋台 ── */
    w.disk(cx, cz + R + 18, 26, "plaza", 0.02, 0);
    w.rect("plaza", cx - 10, cz + R + 30, cx + 10, cz + R + 58, 0.02);
    for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + (i - 4.5) * 0.12, [x, z] = L(a, R + 30); w.flag(x, z, [0xff4fb0, 0x4ff0ff, 0xffd84a, 0xa86aff, 0x4fff9a][i % 5], 10); }
    [[cx - 26, cz + R + 24, 0.4], [cx + 26, cz + R + 24, -0.4]].forEach(([x, z, r], i) => w.foodTruck ? w.foodTruck(x, z, r, ["DOME BURGER", "POP & DRINK"][i], ["#e84a4a", "#3a78e8"][i]) : null);
    w.places.push(["25 XEVARION DOME", cx, cz + R + 20, Math.PI]);
  };
})();
