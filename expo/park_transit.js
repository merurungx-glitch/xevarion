/* ══════════════════════════════════════════════════════════════════
   XEVARION PARK — モノレールと路面電車（★★ 2026-09-29c ご指定「モノレールの動きがカクカク・レールに物が重なる・
   向きを変えられない・路線図と案内を」「駅は乗る部分まで細部まで」「路面電車のレールが見えない・乗れない・線路を広げて実用的に」）
   ------------------------------------------------------------------
   ・線は「一定の間隔（1m／0.5m）の点」にしてから動かす。前は getPointAt の粗い表で速さがゆれていたうえに、
     位置を2か所（main.js と world.anim）で書きかえ、カメラは1フレーム前の位置を見ていた＝カクカクの真因。
     → 電車の位置はこのファイルだけが決め、カメラはそのあと同じフレームの位置から置く（XTransit.update → XTransit.camera）。
   ・モノレール（1周 約5.4km・12駅・外回り）：地上の改札ホール → 階段・エスカレーター・エレベーター → 高架のホーム（ホームドア）。
     ホームで「乗る」→ 行き先をえらぶ → 電車が入ってきて止まり、ドアが開く → いちばん前の席から前を見る。
     ドラッグ・矢印・スティックで見回す／V で外から／E で早送り。着いた駅のホームにおりる。
   ・路面電車（ゲート → マーケット → 噴水公園 → XEVARION HALL 前 → 噴水公園 → マーケット → ゲートの1周・8停留所）：
     線路（石だたみ・芝生の軌道）・地面から電気をとる光る線（未来の架線なし＝パレードの山車も通れる）・停留所（屋根・ベンチ・路線図・電光表示）。停留所で乗れる。パレード中は運転を見合わせる。
   ・路線図：駅の案内板・乗る前の画面・車内の表示（つぎの駅）・パークの地図にも線を描く。
   ・★ 2026-09-29d 車内放送（日本語のあとに英語・JR 東日本ふう）：発車したら「次は〇〇」、近づくと「まもなく〇〇。お出口は右側です」・乗り換え案内。
     乗れるのはホームの上だけ（改札ホールからは乗れない＝エレベーター・階段でホームへ）。
   ・高さの決まり（world.js）：ホームと階段は「いまの高さに近いときだけ」上に立てる（下を歩く人は地面のまま）。
     手すりなどの当たりも高さの範囲つき（ya〜yb）。
   ══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const T = THREE, X = XTex, P = XWorld.World.prototype, TAU = Math.PI * 2, XP = XPark, MOBILE = XP.MOBILE;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const LINES = [];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ══════════════ 一定の間隔の線 ══════════════ */
  function mkPath(pts, closed, ds) {
    ds = ds || 1;
    const src = pts.slice(); if (closed) src.push(pts[0]);
    const cum = [0]; for (let i = 1; i < src.length; i++) cum.push(cum[i - 1] + Math.hypot(src[i].x - src[i - 1].x, src[i].y - src[i - 1].y, src[i].z - src[i - 1].z));
    const L = cum[cum.length - 1], n = Math.max(2, Math.round(L / ds)), step = L / n, A = new Float32Array((n + 1) * 3);
    let j = 1;
    for (let i = 0; i <= n; i++) {
      const s = i * step; while (j < src.length - 1 && cum[j] < s) j++;
      const a = src[j - 1], b = src[j], t = clamp((s - cum[j - 1]) / Math.max(1e-9, cum[j] - cum[j - 1]), 0, 1);
      A[i * 3] = a.x + (b.x - a.x) * t; A[i * 3 + 1] = a.y + (b.y - a.y) * t; A[i * 3 + 2] = a.z + (b.z - a.z) * t;
    }
    return { P: A, n, L, ds: step, closed: !!closed };
  }
  function pAt(A, s, o) {
    s = A.closed ? ((s % A.L) + A.L) % A.L : clamp(s, 0, A.L);
    const k = s / A.ds, i = Math.min(A.n - 1, Math.floor(k)), f = k - i, Q = A.P, a = i * 3, b = a + 3;
    o.x = Q[a] + (Q[b] - Q[a]) * f; o.y = Q[a + 1] + (Q[b + 1] - Q[a + 1]) * f; o.z = Q[a + 2] + (Q[b + 2] - Q[a + 2]) * f;
    return o;
  }
  const _a = { x: 0, y: 0, z: 0 }, _b = { x: 0, y: 0, z: 0 };
  function pDir(A, s, o) { pAt(A, s - 1.5, _a); pAt(A, s + 1.5, _b); const dx = _b.x - _a.x, dz = _b.z - _a.z, l = Math.hypot(dx, dz) || 1; o.x = dx / l; o.z = dz / l; return o; }
  function nearestS(A, x, z) { let best = 0, bd = 1e18; for (let i = 0; i <= A.n; i++) { const dx = A.P[i * 3] - x, dz = A.P[i * 3 + 2] - z, d = dx * dx + dz * dz; if (d < bd) { bd = d; best = i; } } return best * A.ds; }
  const fwd = (A, s0, s1) => A.closed ? (((s1 - s0) % A.L) + A.L) % A.L : s1 - s0;
  const sgnD = (A, s0, s1) => { let d = fwd(A, s0, s1); if (A.closed && d > A.L / 2) d -= A.L; return d; };

  /* 線にそった「箱の筒」（面ごとに外向きをそろえる）。faces: [[l0, y0, l1, y1, nl, ny], …]（l＝右向きの横位置） */
  function sweep(A, s0, s1, step, faces, yAbs) {
    const pos = [], nor = [], uv = [], idx = [], n = Math.max(1, Math.ceil((s1 - s0) / step));
    const p = { x: 0, y: 0, z: 0 }, d = { x: 0, z: 0 };
    faces.forEach(([l0, y0, l1, y1, nl, ny]) => {
      const base = pos.length / 3;
      for (let i = 0; i <= n; i++) {
        const s = s0 + (s1 - s0) * i / n; pAt(A, s, p); pDir(A, s, d); const rx = -d.z, rz = d.x, yb = yAbs ? 0 : p.y;
        pos.push(p.x + rx * l0, yb + y0, p.z + rz * l0, p.x + rx * l1, yb + y1, p.z + rz * l1);
        const wx = rx * nl, wz = rz * nl; nor.push(wx, ny, wz, wx, ny, wz); uv.push(0, s * 0.25, 1, s * 0.25);
      }
      /* 最初の三角の向きで、面が外を向いているか確かめる */
      const q = (k) => [pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]], A0 = q(base), B0 = q(base + 1), C0 = q(base + 2);
      const u = [B0[0] - A0[0], B0[1] - A0[1], B0[2] - A0[2]], v = [C0[0] - A0[0], C0[1] - A0[1], C0[2] - A0[2]];
      const cr = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]], N0 = [nor[base * 3], nor[base * 3 + 1], nor[base * 3 + 2]];
      const flip = cr[0] * N0[0] + cr[1] * N0[1] + cr[2] * N0[2] < 0;
      for (let i = 0; i < n; i++) { const k = base + i * 2; if (!flip) idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); else idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
    });
    const g = new T.BufferGeometry(); g.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new T.Float32BufferAttribute(nor, 3)); g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    return g;
  }
  const BOXF = (l0, l1, y0, y1) => [[l0, y1, l1, y1, 0, 1], [l0, y0, l1, y0, 0, -1], [l1, y0, l1, y1, 1, 0], [l0, y0, l0, y1, -1, 0]];
  /* 長い線は 120m ずつに分けて置く（遠い所は描かない仕組みに乗る） */
  function sweepChunks(w, key, A, faces, o) {
    o = o || {}; const CH = o.chunk || 120, s0 = o.s0 || 0, s1 = o.s1 != null ? o.s1 : A.L;
    for (let s = s0; s < s1 - 0.01; s += CH) w.batch.add(key, w.m[key], sweep(A, s, Math.min(s1, s + CH), o.step || 2, faces, o.yAbs), new T.Matrix4(), o.detail || "L");
  }

  /* 高さの範囲つきの当たり・高さの追加 */
  const HX = (w) => (w.heightExtra = w.heightExtra || []);
  function withY(w, ya, yb, fn) { const n0 = w.colliders.length; fn(); for (let i = n0; i < w.colliders.length; i++) { w.colliders[i].ya = ya; w.colliders[i].yb = yb; } }
  /* 駅の座標（a＝線にそって前、b＝駅の側へ横） */
  function SF(w, px, pz, fx, fz, nx, nz) {
    const ry = Math.atan2(fx, fz), sg = (nx * fz - nz * fx) > 0 ? 1 : -1;
    const at = (a, b) => [px + fx * a + nx * b, pz + fz * a + nz * b];
    const S = {
      ry, sg, at, px, pz, fx, fz, nx, nz,
      faceN: Math.atan2(nx, nz), faceIn: Math.atan2(-nx, -nz), faceF: ry, faceB: ry + Math.PI,
      box(key, a, b, y, la, lb, h, o) { const [x, z] = at(a, b); w.box(key, x, y, z, lb, h, la, Object.assign({ ry }, o || {})); },
      geo(key, g, a, y, b, det) { const [x, z] = at(a, b); w.geo(key, g, x, y, z, ry, det); },
      col(a, b, la, lb, ya, yb) { const [x, z] = at(a, b); if (ya == null) { w.colObb(x, z, lb, la, ry); return; } withY(w, ya, yb, () => w.colObb(x, z, lb, la, ry)); },
      colC(a, b, r, ya, yb) { const [x, z] = at(a, b); if (ya == null) { w.colCircle(x, z, r); return; } withY(w, ya, yb, () => w.colCircle(x, z, r)); },
      rect(a, b, la, lb, y, lv) { const [x, z] = at(a, b); HX(w).push({ lv: lv ? 1 : 0, cx: x, cz: z, ang: ry, hw: lb / 2, hl: la / 2, y }); },
      ramp(a, b, la, lb, y0, y1) { const [x, z] = at(a, b); HX(w).push({ ramp: 1, cx: x, cz: z, ang: ry, hw: lb / 2, hl: la / 2, y0, y1 }); },
      sign(text, st, sw, sh, a, y, b, face) { const [x, z] = at(a, b); w.sign(text, st, sw, sh, x, y, z, face); },
      noGrass(a0, a1, b0, b1) { (w.noGrassPoly = w.noGrassPoly || []).push([at(a0, b0), at(a1, b0), at(a1, b1), at(a0, b1)]); },
      /* 横向き（線と直角）の板：plane は +z 向き → 駅の側（+n）または線の側（−n）へ向ける */
      planeN(key, pw, ph, a, y, b, toTrack) { const g = new T.PlaneGeometry(pw, ph).rotateY((toTrack ? -1 : 1) * sg * Math.PI / 2); S.geo(key, g, a, y, b); }
    };
    return S;
  }
  const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

  /* ══════════════ 車両の形（captureGroup の中で作る・前は +z・床が y=0） ══════════════ */
  function sidePoly(pts, x) {
    const pos = [];
    for (let i = 1; i < pts.length - 1; i++) { const a = pts[0], b = pts[i], c = pts[i + 1]; pos.push(x, a[1], a[0], x, b[1], b[0], x, c[1], c[0], x, a[1], a[0], x, c[1], c[0], x, b[1], b[0]); }
    const g = new T.BufferGeometry(); g.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g;
  }
  function carModel(w, o) {
    const L = o.len, W = o.wid, H = o.hgt, hw = W / 2, dw = o.doorW, wy0 = o.winY0, wy1 = o.winY1, body = o.body, ds = o.doorZ.slice().sort((a, b) => a - b);
    const segs = []; { let z0 = -L / 2; ds.forEach((d) => { segs.push([z0, d - dw / 2]); z0 = d + dw / 2; }); segs.push([z0, L / 2]); }
    const g = w.captureGroup(() => {
      /* 床・床下 */
      w.box("darkMetal", 0, -0.34, 0, W - 0.08, 0.34, L);
      w.box(o.floor || "carpetGray", 0, 0, 0, W - 0.26, 0.03, L - 0.12);
      if (o.skirt) { [-1, 1].forEach((sd) => w.box(body, sd * (hw - 0.3), o.skirt[0], 0, 0.12, o.skirt[1] - o.skirt[0], L - 0.6)); [-1, 1].forEach((e) => w.box("darkMetal", 0, o.skirt[0] + 0.1, e * (L / 2 - 2.4), W - 0.8, o.skirt[1] - o.skirt[0] - 0.1, 2.2)); }
      if (o.wheels) [-1, 1].forEach((e) => [-1, 1].forEach((sd) => w.geo("darkMetal", new T.CylinderGeometry(0.36, 0.36, 0.2, 12).rotateZ(Math.PI / 2), sd * (hw - 0.45), -0.3, e * (L / 2 - 1.6))));
      /* 側面（ドアの所はあける）・窓・細い柱 */
      [-1, 1].forEach((sd) => {
        const x = sd * (hw - 0.06);
        segs.forEach(([a, b]) => {
          const l = b - a; if (l < 0.05) return; const c = (a + b) / 2;
          w.box(body, x, 0, c, 0.12, wy0, l);
          w.box("glassClear", x, wy0, c, 0.04, wy1 - wy0, l);
          const nm = Math.max(1, Math.round(l / 1.6)); for (let i = 0; i <= nm; i++) w.box(o.frame || body, x, wy0, a + l * i / nm, 0.13, wy1 - wy0, 0.09);
          w.box(o.frame || body, x, wy0 - 0.06, c, 0.14, 0.07, l);
        });
        w.box(body, x, wy1, 0, 0.12, H - wy1, L);
        w.box(o.trim, x + sd * 0.03, o.trimY || 0.3, 0, 0.08, o.trimH || 0.26, L);
        if (o.trim2) w.box(o.trim2, x + sd * 0.03, wy1 + 0.09, 0, 0.08, 0.08, L);
        ds.forEach((d) => { [-1, 1].forEach((e) => w.box("chromeB", x, 0, d + e * (dw / 2 + 0.03), 0.15, wy1 + 0.12, 0.06)); w.box("chromeB", x, wy1 + 0.01, d, 0.15, 0.1, dw + 0.12); });
      });
      /* 屋根・天井・明かり */
      w.box(body, 0, H, 0, W, 0.1, L);
      w.geo(o.roof || body, new T.CylinderGeometry(hw, hw, L, 16, 1, false, Math.PI / 2, Math.PI).rotateX(Math.PI / 2).scale(1, 0.24, 1), 0, H + 0.1, 0);
      w.box("white", 0, H - 0.05, 0, W - 0.26, 0.04, L - 0.1);
      [-0.55, 0.55].forEach((x) => w.box("neonWhite", x, H - 0.09, 0, 0.24, 0.03, L - 1.4));
      /* 座席（ドアのあいだ・横向き）。先頭の車両は前向きの2人がけ（いちばん前の席） */
      segs.forEach(([a, b]) => {
        let a2 = a + 0.28, b2 = b - 0.28; if (o.front) b2 = Math.min(b2, L / 2 - 1.8); if (o.rear) a2 = Math.max(a2, -L / 2 + 1.8);
        const l = b2 - a2; if (l < 0.8) return; const c = (a2 + b2) / 2;
        [-1, 1].forEach((sd) => { w.box("darkMetal", sd * (hw - 0.44), 0, c, 0.46, 0.4, l); w.box(o.seat, sd * (hw - 0.44), 0.4, c, 0.52, 0.12, l); w.box(o.seat, sd * (hw - 0.2), 0.52, c, 0.1, 0.55, l); });
      });
      [o.front ? 1 : 0, o.rear ? -1 : 0].forEach((e) => { if (!e) return; const z = e * (L / 2 - 1.05); [-1, 1].forEach((sd) => { w.box("darkMetal", sd * 0.62, 0, z, 0.9, 0.4, 0.5); w.box(o.seat, sd * 0.62, 0.4, z, 0.94, 0.12, 0.54); w.box(o.seat, sd * 0.62, 0.5, z - e * 0.3, 0.94, 0.6, 0.1); }); });
      /* 手すり・つり革のバー・ドアの上の表示 */
      ds.forEach((d) => [-1, 1].forEach((sd) => [-1, 1].forEach((e) => w.geo("chromeB", new T.CylinderGeometry(0.025, 0.025, H - 0.05, 6), sd * (hw - 0.62), (H - 0.05) / 2, d + e * (dw / 2 + 0.18)))));
      [-1, 1].forEach((sd) => w.geo("chromeB", new T.CylinderGeometry(0.02, 0.02, L - 0.8, 6).rotateX(Math.PI / 2), sd * (hw - 0.62), 1.95, 0));
      ds.forEach((d) => [-1, 1].forEach((sd) => w.box("neonBlue", sd * (hw - 0.15), wy1 + 0.12, d, 0.04, 0.14, 0.7)));
      /* 車両のはし（先頭・最後尾は顔、つなぎ目はほろ） */
      const endWall = (e) => { const z = e * (L / 2 - 0.05); w.box(body, -(hw + 0.62) / 2, 0, z, hw - 0.62, H, 0.1); w.box(body, (hw + 0.62) / 2, 0, z, hw - 0.62, H, 0.1); w.box(body, 0, 2.02, z, 1.24, H - 2.02, 0.1); };
      const bellows = (e) => { const z = e * (L / 2 + o.gap / 2); w.box("darkMetal", -0.7, 0, z, 0.08, 2.1, o.gap + 0.1); w.box("darkMetal", 0.7, 0, z, 0.08, 2.1, o.gap + 0.1); w.box("darkMetal", 0, 2.02, z, 1.48, 0.08, o.gap + 0.1); w.box("darkMetal", 0, -0.08, z, 1.48, 0.1, o.gap + 0.1); };
      const nose = (e) => {
        const z0 = e * L / 2, nl = o.nose, hy = o.noseH, lo = o.noseLo != null ? o.noseLo : -0.34;
        w.box(body, 0, lo, z0 + e * nl / 2, W, hy - lo, nl);
        w.geo(body, new T.CylinderGeometry(hw, hw, hy - lo, 18, 1, false, e > 0 ? -Math.PI / 2 : Math.PI / 2, Math.PI).scale(1, 1, 0.42), 0, (hy + lo) / 2, z0 + e * nl);
        w.box(o.trim, 0, (o.trimY || 0.3), z0 + e * (nl + 0.02), W + 0.02, o.trimH || 0.26, 0.05);
        const dzw = nl - 0.35, dyw = H - hy, len = Math.hypot(dzw, dyw), ang = Math.atan2(dyw, dzw);
        w.geo("glassClear", new T.BoxGeometry(W - 0.14, 0.05, len).rotateX(e * ang), 0, hy + dyw / 2, z0 + e * (0.35 + dzw / 2));
        [-1, 1].forEach((sd) => { w.geo(o.frame || body, new T.BoxGeometry(0.1, 0.08, len).rotateX(e * ang), sd * (hw - 0.05), hy + dyw / 2, z0 + e * (0.35 + dzw / 2)); w.geo(body, sidePoly([[z0, hy], [z0 + e * nl, hy], [z0 + e * 0.35, H], [z0, H]], sd * (hw - 0.02)), 0, 0, 0); });
        w.box(body, 0, H, z0 + e * 0.18, W, 0.1, 0.36);
        w.box("darkMetal", 0, hy - 0.02, z0 + e * nl * 0.45, W - 0.5, 0.06, nl * 0.7);
        [-0.5, 0.5].forEach((x) => w.box("neonCyan", x, hy + 0.04, z0 + e * nl * 0.5, 0.18, 0.02, 0.12));
        /* 顔：まんまるの目（妖魔シティの電車）とライト */
        [-1, 1].forEach((sd) => {
          const ex = sd * hw * 0.5, ez = z0 + e * (nl + hw * 0.42 * Math.sqrt(1 - 0.25) - 0.02), ey = (hy + lo) / 2 + 0.12, ry = sd * e * 0.5 + (e < 0 ? Math.PI : 0);
          w.geo("eyeW", new T.CylinderGeometry(0.3, 0.3, 0.05, 20).rotateX(Math.PI / 2), ex, ey, ez, ry);
          w.geo(o.iris || "irisA", new T.CylinderGeometry(0.17, 0.17, 0.05, 16).rotateX(Math.PI / 2).translate(0, 0, 0.02), ex, ey, ez, ry);
          w.geo("eyeB", new T.CylinderGeometry(0.08, 0.08, 0.05, 12).rotateX(Math.PI / 2).translate(0, 0.01, 0.04), ex, ey, ez, ry);
          w.geo("neonWhite", new T.CylinderGeometry(0.04, 0.04, 0.05, 8).rotateX(Math.PI / 2).translate(0.06, 0.07, 0.06), ex, ey, ez, ry);
          w.geo(e > 0 ? "neonWhite" : "neonRed", new T.BoxGeometry(0.34, 0.1, 0.05), sd * hw * 0.62, lo + 0.22, z0 + e * (nl + 0.3), ry);
        });
      };
      if (o.front) nose(1); else endWall(1);
      if (o.rear) nose(-1); else { endWall(-1); bellows(-1); }
      if (o.pant) { const y = H + 0.34; w.box("darkMetal", 0, y, 0, 1.2, 0.12, 1.6); [-1, 1].forEach((e) => w.geo("darkMetal", new T.BoxGeometry(0.06, 0.06, 1.6).rotateX(e * 0.9), 0, y + 0.6, e * 0.35)); w.box("chromeB", 0, o.pant - 0.05, 0, 1.7, 0.06, 0.12); w.geo("darkMetal", new T.BoxGeometry(0.05, 0.05, 1.2).rotateX(-0.9), 0, y + 1.25, 0.1); }
      if (o.logo) w.box(o.logo, 0, H + 0.36, 0, 0.9, 0.04, L * 0.5);
      if (o.pod) { w.box("white2", 0, H + 0.3, 0, 1.3, 0.34, L * 0.46); w.box("neonCyan", 0, H + 0.64, 0, 0.9, 0.04, L * 0.4); w.box("gold", 0, H + 0.3, 0, 1.34, 0.06, L * 0.47); }
    });
    /* ドア（左右それぞれ：前へ開く板・うしろへ開く板）。前後に動かす */
    const doors = { L: [], R: [] }, mats = [w.m[body], w.m.glassClear];
    [[-1, "R"], [1, "L"]].forEach(([sd, k]) => [-1, 1].forEach((e) => {
      const gb = [], gg = [];
      ds.forEach((d) => { const zc = d + e * dw / 4; gb.push(new T.BoxGeometry(0.06, wy1 + 0.02, dw / 2 - 0.03).translate(sd * (hw - 0.04), (wy1 + 0.02) / 2, zc)); gg.push(new T.BoxGeometry(0.07, 0.95, dw / 2 - 0.26).translate(sd * (hw - 0.04), 1.55, zc)); });
      const mb = new T.Mesh(XWorld.mergeGeos(gb), mats[0]), mg = new T.Mesh(XWorld.mergeGeos(gg), mats[1]); mb.castShadow = true; g.add(mb); g.add(mg);
      doors[k].push({ e, ms: [mb, mg], sd });
    }));
    return { g, doors };
  }
  function setDoors(car, side, k, dw) {
    ["L", "R"].forEach((key) => car.doors[key].forEach((d) => { const open = (key === "L" ? 1 : -1) === side ? k : 0; d.ms.forEach((m) => { m.position.z = d.e * open * dw * 0.48; m.position.x = d.sd * open * 0.09; }); }));
  }

  /* ══════════════ 線（モノレール・路面電車）の登録と動き ══════════════ */
  function mkLine(spec) { const L = Object.assign({ trains: [], stops: [] }, spec); LINES.push(L); return L; }
  function mkTrains(w, L, n) {
    for (let t = 0; t < n; t++) {
      const cars = [];
      for (let i = 0; i < L.nCars; i++) {
        const c = carModel(w, Object.assign({}, L.car, { front: i === 0, rear: i === L.nCars - 1, pant: L.car.pant && i === Math.floor(L.nCars / 2) ? L.car.pant : 0, pod: L.car.pod && i === Math.floor(L.nCars / 2) }));
        c.g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
        w.scene.add(c.g); w.loose(c.g, L.id === "mono" ? 900 : 420); cars.push(c);
      }
      const k = Math.floor(t * L.stops.length / n) % L.stops.length, st = L.stops[k];
      L.trains.push({ id: t, cars, s: st.s, v: 0, st: "dwell", dw: 2 + t * 3, next: k, door: 0, doorSide: st.doorX, rider: false, hold: false });
    }
  }
  function stepTrain(L, tr, dt) {
    if (tr.st === "dwell") {
      tr.dw -= dt;
      if (L.pause && !tr.rider && !tr.pick && L.pause()) tr.dw = Math.max(tr.dw, 2.2);          /* パレード中は駅で待つ */
      const opening = tr.hold || tr.dw > 1.3;
      tr.door = clamp(tr.door + (opening ? dt : -dt) / 1.1, 0, 1);
      if (!tr.hold && tr.dw <= 0 && tr.door <= 0) { tr.st = "run"; tr.next = (tr.next + 1) % L.stops.length; }
      return;
    }
    const stop = L.stops[tr.next], d = fwd(L.A, tr.s, stop.s);
    const vStop = Math.sqrt(2 * L.dec * Math.max(0, d - 0.15)) + 0.25;
    tr.v = Math.min(tr.v + L.acc * dt, L.vmax, vStop);
    const ds = tr.v * dt;
    if (ds >= d || d < 0.08) { tr.s = stop.s; tr.v = 0; tr.st = "dwell"; tr.dw = L.dwell; tr.door = 0; tr.doorSide = stop.doorX; if (XT.onStop) XT.onStop(L, tr, tr.next); }
    else tr.s = (tr.s + ds) % L.A.L;
  }
  const _f = { x: 0, y: 0, z: 0 }, _r = { x: 0, y: 0, z: 0 };
  function placeTrain(L, tr) {
    for (let i = 0; i < tr.cars.length; i++) {
      const c = tr.cars[i], sc = tr.s - i * L.pitch;
      pAt(L.A, sc + L.bogie, _f); pAt(L.A, sc - L.bogie, _r);
      c.g.position.set((_f.x + _r.x) / 2, (_f.y + _r.y) / 2 + L.lift, (_f.z + _r.z) / 2);
      c.g.rotation.set(0, Math.atan2(_f.x - _r.x, _f.z - _r.z), 0);
      if (c._door !== tr.door || c._ds !== tr.doorSide) { c._door = tr.door; c._ds = tr.doorSide; setDoors(c, tr.doorSide, smooth(tr.door), L.car.doorW); }
    }
  }
  function travelTime(L, k, j) {
    let t = 0, i = k;
    while (i !== j) { const n = (i + 1) % L.stops.length, d = fwd(L.A, L.stops[i].s, L.stops[n].s), ta = L.vmax / L.acc, da = L.vmax * L.vmax / (2 * L.acc) + L.vmax * L.vmax / (2 * L.dec); t += d > da ? (d - da) / L.vmax + ta + L.vmax / L.dec : 2 * Math.sqrt(d / L.acc); if (n !== j) t += L.dwell; i = n; }
    return t;
  }

  /* ══════════════ 場所えらび（駅の足もとがあいている所） ══════════════ */
  function makeProbe(w) {
    const GS = 20, grid = new Map(), add = (x0, z0, x1, z1, it) => { for (let gx = Math.floor(x0 / GS); gx <= Math.floor(x1 / GS); gx++) for (let gz = Math.floor(z0 / GS); gz <= Math.floor(z1 / GS); gz++) { const k = gx + "," + gz; if (!grid.has(k)) grid.set(k, []); grid.get(k).push(it); } };
    w.casters.forEach((c) => { let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; c.pts.forEach(([x, z]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }); add(x0, z0, x1, z1, { k: "cast", c }); });
    w.colliders.forEach((c) => add(c.x0, c.z0, c.x1, c.z1, { k: "col", c }));
    w.roads.forEach((r) => add(Math.min(r[0], r[2]) - r[4] / 2, Math.min(r[1], r[3]) - r[4] / 2, Math.max(r[0], r[2]) + r[4] / 2, Math.max(r[1], r[3]) + r[4] / 2, { k: "road", r }));
    (w.rivers || []).forEach((rv) => { for (let i = 0; i < rv.pts.length - 1; i++) { const r = [rv.pts[i][0], rv.pts[i][1], rv.pts[i + 1][0], rv.pts[i + 1][1], rv.w + 2]; add(Math.min(r[0], r[2]) - r[4], Math.min(r[1], r[3]) - r[4], Math.max(r[0], r[2]) + r[4], Math.max(r[1], r[3]) + r[4], { k: "water", r }); } });
    if (w.circuit) { const p = w.circuit.pts; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length], r = [a.x, a.z, b.x, b.z, 28]; add(Math.min(a.x, b.x) - 14, Math.min(a.z, b.z) - 14, Math.max(a.x, b.x) + 14, Math.max(a.z, b.z) + 14, { k: "circ", r }); } }
    (w.interiors || []).forEach((q) => { const R = q.round ? q.r : Math.hypot(q.hw, q.hd); add(q.x - R, q.z - R, q.x + R, q.z + R, { k: "room", q }); });
    const inPoly = (x, z, pts) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, zi] = pts[i], [xj, zj] = pts[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
    const segD = (x, z, r) => { const [x0, z0, x1, z1] = r, dx = x1 - x0, dz = z1 - z0, l2 = dx * dx + dz * dz; let t = l2 ? ((x - x0) * dx + (z - z0) * dz) / l2 : 0; t = clamp(t, 0, 1); return Math.hypot(x - (x0 + dx * t), z - (z0 + dz * t)); };
    const polys = (w.noGrassPoly || []).slice();
    /* ある点に何があるか：{ cast: 高さ, col, road, water, circ, room } */
    return function probe(x, z, minH) {
      const out = { cast: 0, col: 0, road: 0, water: 0, circ: 0, room: 0 };
      const a = grid.get(Math.floor(x / GS) + "," + Math.floor(z / GS));
      if (a) for (const it of a) {
        if (it.k === "cast") { if (it.c.h >= (minH || 0) && inPoly(x, z, it.c.pts)) out.cast = Math.max(out.cast, it.c.h); }
        else if (it.k === "col") { const c = it.c; if (x > c.x0 - 0.5 && x < c.x1 + 0.5 && z > c.z0 - 0.5 && z < c.z1 + 0.5) { if (c.t === "c" ? Math.hypot(x - c.x, z - c.z) < c.r + 0.6 : true) out.col++; } }
        else if (it.k === "road") { if (segD(x, z, it.r) < it.r[4] / 2) out.road++; }
        else if (it.k === "water") { if (segD(x, z, it.r) < it.r[4] / 2) out.water++; }
        else if (it.k === "circ") { if (segD(x, z, it.r) < 14) out.circ++; }
        else if (it.k === "room") { const q = it.q; if (q.round ? Math.hypot(x - q.x, z - q.z) < q.r + 1 : (() => { const dx = x - q.x, dz = z - q.z, aa = dx * q.c - dz * q.s, bb = dx * q.s + dz * q.c; return Math.abs(aa) < q.hw + 1 && Math.abs(bb) < q.hd + 1; })()) out.room++; }
      }
      for (const pl of polys) if (inPoly(x, z, pl)) { out.water++; break; }
      if (XP.coastDist(x, z) < 5) out.water += 2;
      return out;
    };
  }

  /* ══════════════ モノレール ══════════════ */
  /* 英語の放送の読み（"DOME / MOTOR CITY" → "Dome, Motor City"） */
  const enSay = (en) => String(en).toLowerCase().split(" / ").map((p) => p.replace(/\b[a-z]/g, (c) => c.toUpperCase())).join(", ");
  const TRANSFER = { M01: ["路面電車は、お乗り換えです。", "Please change here for the XEVARION Streetcar."], T01: ["モノレールは、お乗り換えです。", "Please change here for the XEVARION Monorail."] };
  const MONO_Y = 14.2;                      /* 車両の床（＝ホームの高さ） */
  const MONO_ST = [
    ["M01", "ゲート駅", "GATE", 0.245, "入口・チケット・マーケット"],
    ["M02", "ビーチ駅", "BEACH", 0.335, "砂浜・桟橋・海の家"],
    ["M03", "アクア駅", "AQUA", 0.43, "プール・スライダー"],
    ["M04", "スペースポート駅", "SPACE PORT", 0.515, "ロケット・コズミックコースター"],
    ["M05", "アドベンチャー駅", "ADVENTURE", 0.608, "マウンテンコースター・ジャングル"],
    ["M06", "ドーム駅", "DOME / MOTOR CITY", 0.753, "巨大ライブ会場・サーキット"],
    ["M07", "ハーバー駅", "HARBOR", 0.806, "湖の港町・水上パレード"],
    ["M08", "NGX本社・スタジアム駅", "NGX HQ / STADIUM", 0.882, "NGX 本社・サッカースタジアム"],
    ["M09", "リゾート駅", "RESORT", 0.948, "ホテル・スパ・ヴィラ"],
    ["M10", "ナイトゾーン駅", "NIGHT ZONE", 0.046, "ネオン街・お化け屋敷"],
    ["M11", "妖魔歌舞伎町駅", "KABUKI / YUKAKU", 0.092, "看板のビル街・夜桜遊郭"],
    ["M12", "スポーツシティ駅", "SPORTS CITY", 0.172, "競技場・ボッチャ"]
  ];
  P.buildMonorail = function () {
    const w = this;
    /* ── 線：島のふちにそって（ハーバーの山・歌舞伎町の南は少し海側へ） ── */
    const bump = (a, c, wd) => { const d = Math.abs((((a - c + Math.PI) % TAU) + TAU) % TAU - Math.PI); return d < wd ? 0.5 + 0.5 * Math.cos(d / wd * Math.PI) : 0; };
    const base = [];
    for (let i = 0; i < 480; i++) { const a = i / 480 * TAU, K = 0.955 + 0.022 * bump(a, 0.68, 0.36) + 0.02 * bump(a, -1.33, 0.16); const [x, z] = XP.islandPt(a, K); base.push(new T.Vector3(x, MONO_Y, z)); }
    const cr = new T.CatmullRomCurve3(base, true, "centripetal"), A0 = mkPath(cr.getPoints(16000), true, 1);
    /* ── 駅の場所：目安の位置のまわりで、足もと（改札ホール・階段）があいている所・向き（島の内側／海側）をえらぶ ── */
    const probe = makeProbe(w), picks = [];
    const d0 = { x: 0, z: 0 }, p0 = { x: 0, y: 0, z: 0 };
    MONO_ST.forEach((def) => {
      let best = null;
      for (let du = -0.014; du <= 0.0141; du += 0.002) for (const side of [1, -1]) {
        const s = (((def[3] + du) % 1 + 1) % 1) * A0.L; pAt(A0, s, p0); pDir(A0, s, d0);
        const rx = -d0.z, rz = d0.x, inlR = rx * (XP.ISL.cx - p0.x) + rz * (XP.ISL.cz - p0.z) > 0, right = (side > 0) === inlR, nx = right ? rx : -rx, nz = right ? rz : -rz;
        let sc = Math.abs(du) * 500 + (side > 0 ? 0 : 5);
        for (let a = -34; a <= 34; a += 3) for (let b = -4; b <= 23; b += 2.5) {
          const inHall = a < -8 && b > 8, inStair = a > -12 && b > 8 && b < 17, deck = b > -4 && b < 10;
          if (!inHall && !inStair && !deck) continue;
          const x = p0.x + d0.x * a + nx * b, z = p0.z + d0.z * a + nz * b, q = probe(x, z, deck && !inHall && !inStair ? 11 : 1.5);
          if (inHall || inStair) sc += (q.cast ? 5 : 0) + q.col * 1.6 + q.road * 0.5 + q.water * 6 + q.circ * 8 + q.room * 8;
          else sc += (q.cast ? 5 : 0) + q.circ * 3;
        }
        if (!best || sc < best.sc) best = { sc, s, right, def };
      }
      picks.push(best);
    });
    /* ── 駅の前後はまっすぐに（ホームに車両がぴったり沿う） ── */
    const pts = [];
    for (let i = 0; i < A0.n; i++) pts.push(new T.Vector3(A0.P[i * 3], A0.P[i * 3 + 1], A0.P[i * 3 + 2]));
    picks.forEach((pk) => {
      pAt(A0, pk.s, p0); pDir(A0, pk.s, d0); const cx = p0.x, cz = p0.z, fx = d0.x, fz = d0.z;
      for (let i = 0; i < pts.length; i++) { const a = sgnD(A0, pk.s, i * A0.ds); if (Math.abs(a) > 70) continue; const k = Math.abs(a) <= 44 ? 1 : smooth((70 - Math.abs(a)) / 26); pts[i].x += (cx + fx * a - pts[i].x) * k; pts[i].z += (cz + fz * a - pts[i].z) * k; }
    });
    const A = mkPath(pts, true, 1);
    const car = { len: 12.4, wid: 3.0, hgt: 2.5, doorZ: [-3.1, 3.1], doorW: 1.3, winY0: 0.95, winY1: 2.1, nose: 1.9, noseH: 0.78, gap: 0.8, body: "white2", frame: "white2", trim: "pBlue", trim2: "neonCyan", seat: "seatBlue", floor: "carpetGray", skirt: [-1.3, -0.3], iris: "irisA", logo: "neonCyan" };
    const L = mkLine({ id: "mono", name: "XEVARION MONORAIL", jp: "XEVARION モノレール", icon: "🚝", color: "#1a8ad8", color2: "#4ff0ff", A, nCars: 4, pitch: 13.2, bogie: 4.4, lift: 0, car, vmax: 22, acc: 1.0, dec: 1.1, dwell: 9, lead: 170, seat: [0, 1.58, car.len / 2 + 0.15], dir: "外回り", floorY: MONO_Y });
    w.monorail = L;
    /* ── 軌道のはり（コンクリート）・走る面・夜に光る線 ── */
    sweepChunks(w, "white2", A, BOXF(-0.45, 0.45, -2.1, -0.3), { step: 2 });
    sweepChunks(w, "darkMetal", A, [[-0.47, -0.27, 0.47, -0.27, 0, 1]], { step: 2 });
    sweepChunks(w, "neonCyan", A, [[0.46, -1.95, 0.46, -1.85, 1, 0], [-0.46, -1.95, -0.46, -1.85, -1, 0]], { step: 3 });
    /* ── 木はレールのそばに植えない ── */
    { const kp = []; for (let s = 0; s < A.L; s += 4) { pAt(A, s, p0); kp.push([p0.x, p0.z, 0]); } (w.treeKeepOut = w.treeKeepOut || []).push({ pts: kp, r: 7 }); }
    /* ── 駅 ── */
    picks.forEach((pk, k) => {
      const def = pk.def, sC = nearestS(A, (pAt(A0, pk.s, p0), p0.x), p0.z);
      const st = { k, no: def[0], name: def[1], en: def[2], hint: def[4], sC, s: (sC + (L.nCars - 1) * L.pitch / 2) % A.L, right: pk.right };
      L.stops.push(st);
    });
    L.stops.forEach((st) => monoStation(w, L, st));
    /* ── 柱（30m ごと・道や川・サーキット・建物の上はさける） ── */
    for (let s = 12; s < A.L; s += 30) {
      let ok = null;
      for (const off of [0, 5, -5, 10, -10]) {
        const ss = s + off; pAt(A, ss, p0);
        const q = probe(p0.x, p0.z, 2); if (q.cast || q.water || q.circ || q.room) continue;
        if (q.road && Math.abs(off) < 10) continue;
        ok = ss; break;
      }
      if (ok == null) continue;
      pAt(A, ok, p0); pDir(A, ok, d0); const ry = Math.atan2(d0.x, d0.z), h = MONO_Y - 2.1;
      w.geo("white2", new T.CylinderGeometry(0.62, 0.82, h - 0.8, 14).scale(1, 1, 1.35), p0.x, (h - 0.8) / 2, p0.z, ry, "L");
      w.geo("white2", new T.BoxGeometry(1.9, 0.9, 1.7), p0.x, h - 0.45, p0.z, ry, "L");
      w.geo("neonCyan", new T.BoxGeometry(1.94, 0.08, 1.74), p0.x, h - 0.95, p0.z, ry);
      w.geo("stoneGray", new T.BoxGeometry(2.4, 0.3, 2.6), p0.x, 0.15, p0.z, ry);
      w.colCircle(p0.x, p0.z, 0.95); w.caster(p0.x, p0.z, 1.4, 2, h, ry);
    }
    mkTrains(w, L, 3);
  };

  /* 路線図の板の材質（線ごとに1枚・現在地は板の上の小さな丸） */
  function mapMat(w, L) {
    const key = "trMap_" + L.id; if (w.m[key]) return key;
    const cv = X.cv(1024, 640), g = cv.getContext("2d");
    L.mapProj = drawRouteMap(g, 1024, 640, L, { board: true });
    const m = new T.MeshBasicMaterial({ map: X.tex(cv), toneMapped: false }); m.map.anisotropy = 4; w.m[key] = m;
    return key;
  }
  /* 路線図の板：toTrack＝線路の方を向く（−n）。板の「見る人の右」は、+n 向きなら −sg·a、−n 向きなら +sg·a */
  function boardWithMap(w, S, L, st, a, y, b, toTrack, pw) {
    pw = pw || 5.2; const ph = pw * 0.625, key = mapMat(w, L), f = toTrack ? -1 : 1;
    S.box("darkMetal", a, b - f * 0.06, y - ph / 2 - 0.12, pw + 0.24, 0.08, ph + 0.24);
    S.planeN(key, pw, ph, a, y, b, toTrack);
    const pr = L.mapProj(st), u = (pr[0] / 1024 - 0.5) * pw, v = (0.5 - pr[1] / 640) * ph, am = a + (toTrack ? S.sg : -S.sg) * u;
    const k = pw / 5.2;
    S.geo("neonRed", new T.CylinderGeometry(0.12 * k, 0.12 * k, 0.03, 16).rotateZ(Math.PI / 2), am, y + v, b + f * 0.03);
    S.sign("現在地", { bg: "#e8286a", color: "#fff", px: 256 }, 0.7 * k, 0.22 * k, am, y + v + 0.28 * k, b + f * 0.04, toTrack ? S.faceIn : S.faceN);
  }

  function monoStation(w, L, st) {
    const A = L.A, H = MONO_Y, p = pAt(A, st.sC, { x: 0, y: 0, z: 0 }), d = pDir(A, st.sC, { x: 0, z: 0 });
    const rx = -d.z, rz = d.x, nx = st.right ? rx : -rx, nz = st.right ? rz : -rz;
    st.doorX = st.right ? -1 : 1;
    const S = SF(w, p.x, p.z, d.x, d.z, nx, nz), LA = 64, col = L.color;
    const title = st.no + "  " + st.name, sub = st.en + " STATION";
    /* ── ホーム（高さ 14.2m）──
       b: 1.8〜8.7 ホーム ／ 9.45 屋根の柱 ／ 10〜15 階段とエスカレーター（a −10〜22）／ 22〜32 階段の上の広場 ／
       改札ホール a −32〜−10・b 9.8〜21.5 ／ エレベーター a −22〜−19・b 9.6〜12.6 */
    S.box("concrete", 0, 5.25, H - 0.6, LA, 7.0, 0.6);
    S.box("plazaGray", 0, 5.25, H - 0.02, LA - 0.2, 6.9, 0.03);
    S.box("pYellow", 0, 2.4, H + 0.01, LA - 0.6, 0.42, 0.02);
    S.box("neonCyan", 0, 1.78, H - 0.2, LA, 0.06, 0.12);
    S.box("white2", 0, 5.25, H - 1.5, LA, 1.4, 0.9);
    for (const a of [-24, -8, 8, 24]) { S.geo("white2", new T.CylinderGeometry(0.5, 0.62, H - 1.5, 12), a, (H - 1.5) / 2, 5.25); S.colC(a, 5.25, 0.72, -5, 10); }
    S.rect(0, 5.25, LA, 7.1, H, true);
    /* ホームドア（車両のドアの位置だけあく） */
    const doorsA = []; for (let i = 0; i < L.nCars; i++) { const ac = (L.nCars - 1) * L.pitch / 2 - i * L.pitch; L.car.doorZ.forEach((dz) => doorsA.push(ac + dz)); }
    doorsA.sort((a, b) => a - b);
    { let a0 = -LA / 2 + 0.3; const gapW = L.car.doorW + 0.4;
      doorsA.concat([LA / 2 - 0.3 + gapW / 2]).forEach((dc, i) => { const a1 = Math.min(LA / 2 - 0.3, dc - gapW / 2); if (a1 - a0 > 0.2) { S.box("glassClear", (a0 + a1) / 2, 1.95, H, a1 - a0, 0.05, 1.45); S.box("chromeB", (a0 + a1) / 2, 1.95, H + 1.45, a1 - a0, 0.12, 0.08); S.box(i % 2 ? "pBlue" : "neonCyan", (a0 + a1) / 2, 1.95, H + 1.2, a1 - a0, 0.07, 0.05); }
        if (i < doorsA.length) { [-1, 1].forEach((e) => { S.box("chromeB", dc + e * gapW / 2, 1.95, H, 0.16, 0.22, 1.55); S.box("neonCyan", dc + e * gapW / 2, 1.95, H + 1.3, 0.17, 0.23, 0.12); }); S.box("pBlue", dc, 2.9, H + 0.012, L.car.doorW, 0.7, 0.02); S.box("white2", dc, 2.9, H + 0.02, 0.5, 0.18, 0.02); }
        a0 = dc + gapW / 2; }); }
    S.col(0, 1.95, LA, 0.3, 11, 99);
    /* 手すり（ホームの外がわ・両はし） */
    const rail = (a0, a1, b) => { const l = a1 - a0; if (l <= 0.1) return; S.box("glassClear", (a0 + a1) / 2, b, H, l, 0.05, 1.1); S.box("chromeB", (a0 + a1) / 2, b, H + 1.1, l, 0.1, 0.08); for (let a = a0; a <= a1 + 0.01; a += Math.max(1.5, l / Math.round(l / 2.2))) S.box("chromeB", a, b, H, 0.08, 0.08, 1.15); S.col((a0 + a1) / 2, b, l, 0.3, 11, 99); };
    const railB = (b0, b1, a) => { const l = b1 - b0; S.box("glassClear", a, (b0 + b1) / 2, H, 0.05, l, 1.1); S.box("chromeB", a, (b0 + b1) / 2, H + 1.1, 0.08, l, 0.08); S.col(a, (b0 + b1) / 2, 0.3, l, 11, 99); };
    rail(-LA / 2, -22.2, 8.75); rail(-18.8, 22, 8.75);
    railB(1.8, 8.75, -LA / 2); railB(1.8, 15.5, LA / 2);
    rail(22, 32, 15.45); railB(8.75, 10, 22);
    /* 屋根：鉄のアーチとガラス（線路の上までおおう） */
    { const R = 6.6, dl = 0.3, yc = H + 3.4 - R * Math.sin(dl), bc = 3.2;
      const gl = new T.CylinderGeometry(R, R, LA + 2, 28, 1, true, Math.PI / 2 + dl, Math.PI - 2 * dl).rotateX(Math.PI / 2); S.geo("glassDome", gl, 0, yc, bc);
      for (let a = -LA / 2; a <= LA / 2 + 0.01; a += 8) { S.geo("white2", new T.TorusGeometry(R, 0.16, 6, 22, Math.PI - 2 * dl).rotateZ(dl), a, yc, bc); }
      [-1, 1].forEach((e) => S.geo("white2", new T.CylinderGeometry(0.14, 0.14, LA + 2, 8).rotateX(Math.PI / 2), 0, yc + R * Math.sin(dl), bc + e * R * Math.cos(dl)));
      S.geo("white2", new T.CylinderGeometry(0.2, 0.2, LA + 2, 8).rotateX(Math.PI / 2), 0, yc + R, bc);
      for (let a = -LA / 2; a <= LA / 2 + 0.01; a += 16) { [bc - R * Math.cos(dl), bc + R * Math.cos(dl) + 0.05].forEach((b, i) => { const hh = H + 3.4; S.geo("white2", new T.CylinderGeometry(0.26, 0.32, hh, 10), a, hh / 2, b); if (i === 0) S.colC(a, b, 0.4, -5, 11); else S.colC(a, b, 0.4); }); }
      for (let a = -LA / 2 + 4; a < LA / 2; a += 8) S.box("neonWhite", a, bc, yc + R - 0.35, 0.3, 3.2, 0.06);
    }
    /* ── 階段・エスカレーター（地上 → ホーム） ── */
    { const a0 = -10, a1 = 22, run = a1 - a0, n = 57, rise = H / n, stp = run / n, slope = Math.atan2(H, run), hyp = Math.hypot(run, H);
      for (let i = 0; i < n; i++) S.box("stoneW", a0 + (i + 0.5) * stp, 11.6, (i + 1) * rise - 0.28, stp + 0.02, 3.2, 0.28);
      for (let i = 0; i < n; i += 4) S.box("pYellow", a0 + (i + 0.97) * stp, 11.6, (i + 1) * rise, 0.06, 3.1, 0.012);
      const inc = (key, b, lb, dy, th) => S.geo(key, new T.BoxGeometry(lb, th, hyp).rotateX(-slope), (a0 + a1) / 2, H / 2 + dy, b);
      inc("white2", 11.6, 3.4, -0.45, 0.35); inc("white2", 9.95, 0.2, 0.2, 0.9); inc("white2", 13.3, 0.2, 0.2, 0.9); inc("white2", 15.1, 0.2, 0.2, 0.9);
      inc("darkMetal", 14.2, 1.6, -0.02, 0.1); inc("chromeB", 14.2, 1.1, 0.06, 0.02);
      for (let i = 0; i < n; i += 1) S.box("darkMetal", a0 + (i + 0.5) * stp, 14.2, (i + 1) * rise - 0.05 - 0.06, 0.05, 1.0, 0.03);
      [13.45, 14.95].forEach((b) => { inc("glassClear", b, 0.04, 0.95, 0.9); inc("black", b, 0.1, 1.45, 0.08); });
      [10.05, 13.2].forEach((b) => inc("chromeB", b, 0.06, 1.0, 0.06));
      [9.95, 15.1].forEach((b) => inc("glassClear", b, 0.04, 1.6, 2.4));
      inc("glassDome", 12.5, 5.6, 3.0, 0.06); inc("white2", 9.85, 0.12, 2.95, 0.14); inc("white2", 15.2, 0.12, 2.95, 0.14);
      S.ramp((a0 + a1) / 2, 12.5, run, 5.0, 0, H);
      S.col((a0 + a1) / 2, 9.9, run, 0.25); S.col((a0 + a1) / 2, 15.15, run, 0.25);
      for (const a of [-2, 6, 14]) { const hh = (a - a0) / run * H - 0.5; [10.1, 15.0].forEach((b) => { S.geo("white2", new T.CylinderGeometry(0.22, 0.26, hh, 8), a, hh / 2, b); }); }
      S.sign("↑ のりば  Platform", { bg: col, color: "#fff", px: 512 }, 3.2, 0.5, a0 + 1.5, 4.6, 11.6, S.faceB);
      S.sign("エスカレーター", { bg: "#0a2a4a", color: "#fff", px: 256 }, 1.6, 0.36, a0 + 1.5, 4.6, 14.2, S.faceB);
    }
    /* 階段の上の広場 */
    S.box("concrete", 27, 12.1, H - 0.6, 10, 6.7, 0.6); S.box("plazaGray", 27, 12.1, H - 0.02, 10, 6.6, 0.03); S.rect(27, 12.1, 10.2, 6.8, H, true);
    for (const a of [23, 31]) S.geo("white2", new T.CylinderGeometry(0.34, 0.4, H - 0.6, 10), a, (H - 0.6) / 2, 14.6);
    S.colC(23, 14.6, 0.5, -5, 11); S.colC(31, 14.6, 0.5, -5, 11);
    /* ── エレベーター（ガラスの塔・かごが上下） ── */
    { const ea = -20.5, eb = 11.1, top = H + 3.2;
      [[-1.5, 0], [1.5, 0]].forEach(([da]) => S.box("glassClear", ea + da, eb, 0, 0.05, 3.0, top));
      S.box("glassClear", ea, eb - 1.5, 0, 3.0, 0.05, top); S.box("glassClear", ea, eb + 1.5, 0, 3.0, 0.05, top);
      [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]].forEach(([da, db]) => S.box("chromeB", ea + da, eb + db, 0, 0.14, 0.14, top));
      S.box("white2", ea, eb, top, 3.3, 3.3, 0.4); S.box("neonCyan", ea, eb, top - 0.1, 3.34, 3.34, 0.08);
      S.box("concrete", ea, 9.15, H - 0.6, 3, 0.95, 0.6); S.box("plazaGray", ea, 9.15, H - 0.02, 3, 0.9, 0.03); S.rect(ea, 9.15, 3, 1.0, H, true);
      S.col(ea, eb, 3.1, 3.1);
      S.sign("エレベーター  EV", { bg: "#1a3a6a", color: "#fff", px: 256 }, 1.8, 0.4, ea, 3.2, eb + 1.56, S.faceN);
      const cab = w.captureGroup(() => { w.box("white2", 0, 0, 0, 2.6, 0.12, 2.6); w.box("white2", 0, 2.5, 0, 2.6, 0.1, 2.6); w.box("neonWhite", 0, 2.44, 0, 1.6, 0.04, 1.6); [[-1.25, 0], [1.25, 0]].forEach(([x]) => w.box("chromeB", x, 0, 0, 0.08, 2.5, 2.4)); w.box("glassClear", 0, 0, -1.25, 2.4, 2.5, 0.04); });
      const [cx, cz] = S.at(ea, eb); cab.position.set(cx, 0.02, cz); cab.rotation.y = S.ry + (S.sg > 0 ? Math.PI / 2 : -Math.PI / 2); w.scene.add(cab); w.loose(cab, 300);
      st.lift = { cab, x: cx, z: cz, top: H, down: S.at(ea, eb + 2.6), up: S.at(ea, 8.3), faceDown: S.faceN, faceUp: S.faceIn };
      const iu = w.interact(...S.at(ea, eb + 2.4), 2.2, "エレベーターでホームへ上がる", () => ({ transit: { line: L.id, stop: st.k, lift: "up" } }), "🛗"); iu.y = 0;
      const id2 = w.interact(...S.at(ea, 8.0), 2.2, "エレベーターで改札へおりる", () => ({ transit: { line: L.id, stop: st.k, lift: "down" } }), "🛗"); id2.y = H;
    }
    /* ── 改札ホール（地上） ── */
    { const a0 = -32, a1 = -10, b0 = 9.8, b1 = 21.5, hh = 5.6, ac = (a0 + a1) / 2, bc = (b0 + b1) / 2, la = a1 - a0, lb = b1 - b0;
      S.box("marble", ac, bc, 0, la, lb, 0.06); S.noGrass(a0 - 1, a1 + 1, b0 - 1, b1 + 4);
      { const [hx, hz] = S.at(ac, bc), [sx2, sz2] = S.at((-10 + 32) / 2, 12.6); w.caster(hx, hz, lb, la, hh + 0.7, S.ry); w.caster(sx2, sz2, 5.6, 44, H, S.ry); }          /* 改札ホール・階段（ほかの物がここに置かれないように） */
      S.box("white2", ac, bc, hh, la + 0.6, lb + 0.6, 0.45); S.box(col === "#1a8ad8" ? "pBlue" : "pRed", ac, bc, hh + 0.45, la + 0.64, lb + 0.64, 0.25); S.box("neonCyan", ac, b1 + 0.33, hh + 0.2, la + 0.6, 0.06, 0.08);
      S.box("white", ac, bc, hh - 0.08, la - 0.2, lb - 0.2, 0.06);
      for (let a = a0 + 2.5; a < a1 - 1; a += 4) S.box("neonWhite", a, bc, hh - 0.12, 0.3, lb - 3, 0.04);
      const wall = (a, b, l, isA, key) => { if (isA) S.box(key || "white2", a, b, 0, 0.3, l, hh); else S.box(key || "white2", a, b, 0, l, 0.3, hh); };
      /* 奥の壁（線路がわ）・左右・表（ガラス＋入口） */
      wall(ac, b0, la, false); S.col(ac, b0, la, 0.35, -5, 6.5);
      wall(a0, bc, lb, true); S.col(a0, bc, 0.35, lb, -5, 6.5);
      wall(a1, (15.3 + b1) / 2, b1 - 15.3, true); S.col(a1, (15.3 + b1) / 2, 0.35, b1 - 15.3, -5, 6.5);
      S.box("white2", a1, 12.6, 3.6, 0.3, 5.6, hh - 3.6);
      const ent0 = -25, ent1 = -17;
      [[a0, ent0], [ent1, a1]].forEach(([p0, p1]) => { S.box("glassClear", (p0 + p1) / 2, b1, 0, p1 - p0, 0.06, hh - 0.4); for (let a = p0; a <= p1 + 0.01; a += (p1 - p0) / Math.max(1, Math.round((p1 - p0) / 2.2))) S.box("chromeB", a, b1, 0, 0.1, 0.12, hh); S.col((p0 + p1) / 2, b1, p1 - p0, 0.35, -5, 6.5); });
      S.box("glassClear", (ent0 + ent1) / 2, b1, 3.3, ent1 - ent0, 0.06, hh - 3.3 - 0.4);
      S.box("white2", (ent0 + ent1) / 2, b1 + 1.8, 3.6, ent1 - ent0 + 3, 3.6, 0.25); S.box("neonCyan", (ent0 + ent1) / 2, b1 + 3.6, 3.56, ent1 - ent0 + 3, 0.06, 0.06);
      [ent0 - 1.2, ent1 + 1.2].forEach((a) => S.geo("chromeB", new T.CylinderGeometry(0.1, 0.1, 3.6, 8), a, 1.8, b1 + 3.4));
      S.sign(title + "  ｜  " + sub, { grad: [col, "#1a2a6a"], color: "#fff", glow: "#7fe8ff", px: 1024 }, 13, 1.3, ac, hh - 0.95, b1 + 0.2, S.faceN);
      /* 改札（すき間を通る）＋ガラスの柵 */
      const gb = 15.3;
      for (let i = 0; i < 7; i++) { const a = -30.4 + i * 2.0; S.box("chromeB", a, gb, 0, 0.36, 1.7, 1.05); S.box("neonCyan", a, gb + 0.86, 0.9, 0.38, 0.06, 0.12); S.box("neonGreen", a, gb - 0.86, 0.9, 0.38, 0.06, 0.12); S.col(a, gb, 0.42, 1.7, -5, 3); }
      S.box("glassClear", (-17.2 + a1) / 2, gb, 0, a1 - 17.2 - 0.4, 0.05, 1.1); S.col((-17.2 + a1 - 0.4) / 2, gb, a1 - 17.2 - 0.4, 0.3, -5, 3);
      S.sign("自動改札  ICカード OK", { bg: "#0a2a4a", color: "#7fe8ff", px: 512 }, 4.8, 0.5, -24.4, 3.6, gb + 0.05, S.faceN);
      S.sign("つぎの電車  " + L.dir + "  まもなく", { bg: "#050810", color: "#ffb030", glow: "#ffb030", px: 512 }, 5.6, 0.7, -24.4, 4.4, gb + 0.06, S.faceN);
      /* 券売機・路線図・ベンチ */
      for (let i = 0; i < 3; i++) { const a = -30.8 + 0.2, b = 17.2 + i * 1.3; S.box("gSilver", a, b, 0, 0.8, 1.1, 1.8); S.box("neonBlue", a + 0.41, b, 1.0, 0.02, 0.8, 0.5); }
      S.col(-30.6, 18.5, 1.0, 4.0, -5, 3);
      boardWithMap(w, S, L, st, -21, 2.9, b0 + 0.2, false, 4.4);
      S.box("woodLight", -13.8, 19.6, 0.42, 3.2, 0.5, 0.08); S.box("darkMetal", -13.8, 19.6, 0, 3.0, 0.4, 0.42);
      (w.interiors = w.interiors || []).push({ x: S.at(ac, (b0 + 0.3 + b1) / 2)[0], z: S.at(ac, (b0 + 0.3 + b1) / 2)[1], c: Math.cos(S.ry), s: Math.sin(S.ry), hw: (b1 - b0 - 0.3) / 2, hd: la / 2, hi: hh - 0.1, yMax: 6, name: st.name + " 改札", type: "station", round: false });
      S.sign("🚝 乗車はホームで  ↑ 階段・エスカレーター・エレベーター", { bg: "#0a2a4a", color: "#fff", glow: "#7fe8ff", px: 1024 }, 7.2, 0.62, -21, 4.3, b1 - 0.35, S.faceIn);
      /* 入口の前の広場と、いちばん近い道へ */
      const [ex, ez] = S.at(-21, b1 + 6);
      w.disk ? w.disk(ex, ez, 7, "walkCream", 0.02) : null;
      linkRoad(w, ex, ez, nx, nz);
      w.forestOpen.push([S.at(0, 10)[0], S.at(0, 10)[1], 44]);
      /* 大きな看板の塔（遠くからも駅とわかる） */
      const [tx, tz] = S.at(-34.5, 23); w.geo("white2", new T.BoxGeometry(1.4, 12, 1.4), tx, 6, tz, S.ry, "L"); w.geo(col === "#1a8ad8" ? "pBlue" : "pRed", new T.BoxGeometry(1.46, 3.2, 1.46), tx, 10.2, tz, S.ry, "L"); w.colCircle(tx, tz, 0.9);
      [S.faceN, S.faceIn, S.faceF, S.faceB].forEach((f) => { const ox = Math.sin(f) * 0.75, oz = Math.cos(f) * 0.75; w.sign("🚝 " + st.no, { bg: col, color: "#fff", px: 256 }, 1.3, 0.9, tx + ox, 10.2, tz + oz, f); });
    }
    /* ── ホームの案内：駅名板・路線図・電光表示・ベンチ・自販機 ── */
    [-14, 14].forEach((a) => { S.box("darkMetal", a, 8.6, H, 0.1, 0.1, 2.9); S.sign(st.name + "　" + st.en, { bg: "#ffffff", color: "#10204a", border: col, px: 1024 }, 4.8, 0.9, a, H + 2.4, 8.5, S.faceIn); S.sign(st.no, { bg: col, color: "#fff", px: 256 }, 0.8, 0.8, a - S.sg * 2.95, H + 2.4, 8.5, S.faceIn); });
    [-26, 26].forEach((a) => { S.box("chromeB", a, 5.25, H + 3.4, 0.06, 0.06, 1.2); w.sign(st.no + "  " + st.name, { bg: col, color: "#fff", both: true, px: 512 }, 3.6, 0.6, ...(() => { const [x, z] = S.at(a, 5.25); return [x, H + 3.1, z]; })(), S.faceF); });
    boardWithMap(w, S, L, st, 0, H + 1.9, 8.55, true, 5.2);
    { const [x, z] = S.at(-6, 5.25); w.sign("つぎの電車  " + L.dir + "  まもなく到着", { bg: "#050810", color: "#ffb030", glow: "#ffb030", both: true, px: 512 }, 4.2, 0.55, x, H + 3.0, z, S.faceF); }
    [-20, -2, 10].forEach((a) => { S.box("darkMetal", a, 7.7, H, 2.6, 0.5, 0.42); S.box("woodLight", a, 7.7, H + 0.42, 2.8, 0.55, 0.07); S.box("woodLight", a, 8.0, H + 0.49, 2.8, 0.07, 0.5); });
    [[-29, "gTeal"], [-27.6, "rOrange"]].forEach(([a, key]) => { S.box(key || "gTeal", a, 7.9, H, 1.1, 0.8, 1.85); S.box("neonWhite", a, 7.48, H + 1.0, 0.8, 0.02, 0.6); });
    S.col(-28.3, 7.9, 2.6, 0.9, 11, 99);
    for (let i = 0; i < 3; i++) { const a = -14 + i * 14; const it = w.interact(...S.at(a, 4.2), 5.5, "モノレールに乗る（行き先をえらぶ）", () => ({ transit: { line: L.id, stop: st.k, mode: "platform" } }), "🚝"); it.y = H; }
    const [ax, az] = S.at(L.car.doorZ[1] + (L.nCars - 1) * L.pitch / 2, 3.4);
    st.alight = { x: ax, z: az, y: H, yaw: S.faceF };            /* おりたら進む向き（階段・出口のある前）を向く＝カメラが車両に重ならない */
    st.board = S.at((L.nCars - 1) * L.pitch / 2 + L.car.doorZ[1], 3.2);
    st.wait = { x: S.at(0, 5.5)[0], z: S.at(0, 5.5)[1], y: H, yaw: S.faceIn };
  }
  /* 道の点の検索（駅の入口 → いちばん近い道） */
  function probe2(w) { return w._trProbe || (w._trProbe = makeProbe(w)); }
  function linkRoad(w, x, z, nx, nz) {
    /* ★★ 2026-09-30b 表はそのたびに作る（前は最初の駅で作った表を使い回し、あとの駅は自分の改札ホールを横切っていた）。
       道の幅（6m）ぶん左右も 1m ごとに調べ、なめらかにしない（曲げると調べた線からはみ出して建物にかかった） */
    const probe = makeProbe(w), cand = [];
    w.roads.forEach((r) => { if (r[4] < 5.5) return; const dx = r[2] - r[0], dz = r[3] - r[1], l2 = dx * dx + dz * dz; let t = l2 ? ((x - r[0]) * dx + (z - r[1]) * dz) / l2 : 0; t = clamp(t, 0, 1); const px = r[0] + dx * t, pz = r[1] + dz * t, d = Math.hypot(px - x, pz - z); if (d < 160) cand.push([d, px, pz]); });
    cand.sort((p, q) => p[0] - q[0]);
    const sx = x + nx * 6, sz = z + nz * 6;
    const lineBad = (ax, az, bx, bz, tail) => { const L = Math.hypot(bx - ax, bz - az) || 1, n = Math.max(1, Math.ceil(L)), ux = (bx - ax) / L, uz = (bz - az) / L;
      for (let k = 0; k <= n - (tail || 0); k++) { const t = k / n; for (const o of [-2.8, 0, 2.8]) { const q = probe(ax + (bx - ax) * t - uz * o, az + (bz - az) * t + ux * o, 2); if (q.cast || q.water || q.circ || q.room) return true; } } return false; };
    for (let i = 0; i < Math.min(14, cand.length); i++) {
      const [d, px, pz] = cand[i]; if (d < 4) return;
      if (lineBad(sx, sz, px, pz, 4)) continue;
      w.route([[x, z], [sx, sz], [px, pz]], 6, "walkCream", { raw: true, lamps: "modern", lampEvery: 24, trees: false, benches: false, bushes: false });
      return;
    }
    w.route([[x, z], [sx, sz]], 6, "walkCream", { raw: true, lamps: false, trees: false, benches: false, bushes: false });
  }

  /* ══════════════ 路面電車（ゲート → マーケット → 噴水公園 → HALL → 噴水公園 → マーケット → ゲート） ══════════════ */
  const TRAM_ST = [
    ["T01", "ゲート前", "GATE", [15, 812], "入口・チケット"],
    ["T02", "マーケット広場", "MARKET SQUARE", [15, 688], "時計の噴水・屋台"],
    ["T03", "グリーンウォーク", "GREEN WALK", [15, 470], "花の小道・メディアシティ"],
    ["T04", "噴水公園 東", "FOUNTAIN EAST", [100 * Math.cos(0.349), 290 + 100 * Math.sin(0.349)], "ゲームワールド"],
    ["T05", "XEVARION HALL 前", "HALL", [0, 190], "ホール・会議場"],
    ["T06", "噴水公園 西", "FOUNTAIN WEST", [100 * Math.cos(2.793), 290 + 100 * Math.sin(2.793)], "メトロポリス・タワー"],
    ["T07", "マーケット北", "MARKET NORTH", [-15, 545], "ラボ・アクア方面"],
    ["T08", "マーケット南", "MARKET SOUTH", [-15, 765], "まんぷく横丁"]
  ];
  P.buildTram = function () {
    const w = this, D = (d) => d * Math.PI / 180, pts = [];
    const add = (x, z) => pts.push(new T.Vector3(x, 0, z));
    const line = (x0, z0, x1, z1) => { const n = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / 1)); for (let i = 0; i < n; i++) add(x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n); };
    const arc = (cx, cz, r, a0, a1) => { const n = Math.max(2, Math.round(Math.abs(a1 - a0) * r / 0.8)); for (let i = 0; i < n; i++) { const a = a0 + (a1 - a0) * i / n; add(cx + Math.cos(a) * r, cz + Math.sin(a) * r); } };
    /* 東の歩道を北へ → 右へ曲がって噴水公園の輪（北回り）→ 西の歩道を南へ → ゲートの前で U ターン。
       曲がる円（半径20）は輪（半径100）に外から接する：中心どうしの距離 120 */
    const zc = 290 + Math.sqrt(120 * 120 - 35 * 35), ta = Math.atan2(zc - 290, 35);
    line(15, 836, 15, zc);
    arc(35, zc, 20, Math.PI, Math.PI + ta);
    arc(0, 290, 100, ta, ta - (TAU - (Math.PI - 2 * ta)));
    arc(-35, zc, 20, -ta, 0);
    line(-15, zc, -15, 836);
    arc(0, 836, 15, Math.PI, 0);
    const A = mkPath(pts, true, 0.5);
    const car = { len: 7.4, wid: 2.6, hgt: 2.35, doorZ: [0], doorW: 1.3, winY0: 0.9, winY1: 2.0, nose: 1.5, noseH: 0.72, noseLo: -0.3, gap: 0.6, body: "creamW", frame: "creamW", trim: "pRed", trimY: 0.1, trimH: 0.55, trim2: "gold", seat: "seatsRed", floor: "woodLight", wheels: true, iris: "irisC" };
    const L = mkLine({ id: "tram", name: "XEVARION STREETCAR", jp: "XEVARION 路面電車", icon: "🚋", color: "#e8503a", color2: "#ffc830", A, nCars: 3, pitch: 8.0, bogie: 2.5, lift: 0.35, car, vmax: 9, acc: 1.1, dec: 1.3, dwell: 7, lead: 60, seat: [0, 1.5, car.len / 2 + 0.1], dir: "マーケット・噴水公園まわり", floorY: 0.35 });
    L.car.pod = true;
    w.tramLine = L;
    /* ── 線路：石だたみ（公園の中は芝生）の軌道・2本のレール ── */
    const inPark = (s) => { pAt(A, s, _a); return Math.hypot(_a.x, _a.z - 290) < 112 && _a.z < 400; };
    for (let s = 0; s < A.L; s += 60) { const s1 = Math.min(A.L, s + 60); w.batch.add("plazaGray", w.m.plazaGray, sweep(A, s, s1, 1, [[-1.3, 0.052, 1.3, 0.052, 0, 1]], true), new T.Matrix4(), false); w.batch.add("stoneW", w.m.stoneW, sweep(A, s, s1, 1, [[-1.45, 0.058, -1.3, 0.058, 0, 1], [1.3, 0.058, 1.45, 0.058, 0, 1]], true), new T.Matrix4(), false); }
    /* ★ 2026-09-30 レールが見えない所があった（公園の中は芝生の軌道で、細いレールが芝にまぎれていた）→ どこでも石の軌道・太く光るレール・まくら木 */
    { const q = { x: 0, y: 0, z: 0 }, e = { x: 0, z: 0 }; w.detail(() => { for (let s = 0; s < A.L; s += 1.4) { pAt(A, s, q); pDir(A, s, e); w.box("woodDark2", q.x, 0.05, q.z, 2.0, 0.035, 0.24, { ry: Math.atan2(e.x, e.z) + Math.PI / 2 }); } }); }
    sweepChunks(w, "chromeB", A, [[-0.8, 0.095, -0.66, 0.095, 0, 1], [0.66, 0.095, 0.8, 0.095, 0, 1], [-0.8, 0.055, -0.8, 0.095, -1, 0], [0.8, 0.095, 0.8, 0.055, 1, 0]], { step: 1, yAbs: true, chunk: 60, detail: false });
    sweepChunks(w, "darkMetal", A, [[-0.66, 0.08, -0.58, 0.08, 0, 1], [0.58, 0.08, 0.66, 0.08, 0, 1]], { step: 1, yAbs: true, chunk: 60, detail: false });
    /* 線路の上には木・街灯・ベンチを置かない（見えない「道」として登録） */
    for (let s = 0; s < A.L; s += 4) { pAt(A, s, _a); pAt(A, s + 4, _b); w.roads.push([_a.x, _a.z, _b.x, _b.z, 3.4]); }
    /* 芝生の上の草は生やさない（軌道にそって）・木も植えない */
    { const polyL = [], polyR = []; for (let s = 0; s <= A.L; s += 3) { pAt(A, s, _a); pDir(A, s, _b); polyL.push([_a.x + _b.z * 1.4, _a.z - _b.x * 1.4]); polyR.push([_a.x - _b.z * 1.4, _a.z + _b.x * 1.4]); }
      for (let i = 0; i < polyL.length - 1; i += 20) { const j = Math.min(polyL.length - 1, i + 21); (w.noGrassPoly = w.noGrassPoly || []).push(polyL.slice(i, j + 1).concat(polyR.slice(i, j + 1).reverse())); }
      const kp = []; for (let s = 0; s < A.L; s += 2) { pAt(A, s, _a); kp.push([_a.x, _a.z, 0]); } (w.treeKeepOut = w.treeKeepOut || []).push({ pts: kp, r: 3.4 }); }
    /* ── 架線はなし（★ 2026-09-29d 未来の路面電車：レールのあいだの光る線から電気をとる＝パレードの山車が線にふれない）── */
    sweepChunks(w, "neonCyan", A, [[-0.07, 0.066, 0.07, 0.066, 0, 1]], { step: 1, yAbs: true, chunk: 60, detail: false });
    L.stops = TRAM_ST.map((def, k) => { const s = nearestS(A, def[3][0], def[3][1]); return { k, no: def[0], name: def[1], en: def[2], hint: def[4], sC: s, s: (s + (3 - 1) * 8.0 / 2) % A.L, right: true }; });
    L.pause = () => !!(window.XShows && XShows.PARADE && XShows.PARADE.on);          /* パレード中は止まる（山車と同じ道） */
    /* ── 停留所 ── */
    L.stops.forEach((st) => tramStop(w, L, st));
    mkTrains(w, L, 2);
  };
  function tramStop(w, L, st) {
    const A = L.A, p = pAt(A, st.sC, { x: 0, y: 0, z: 0 }), d = pDir(A, st.sC, { x: 0, z: 0 }), rx = -d.z, rz = d.x;
    st.doorX = -1;
    const S = SF(w, p.x, p.z, d.x, d.z, rx, rz), col = L.color, PH = 0.3, LA = 26;
    /* ホーム（線にそって少しずつ：輪の上でもぴったり） */
    const q = { x: 0, y: 0, z: 0 }, e = { x: 0, z: 0 };
    for (let a = -LA / 2; a < LA / 2 - 0.01; a += 2) {
      const s = st.sC + a + 1; pAt(A, s, q); pDir(A, s, e); const ry = Math.atan2(e.x, e.z), ox = -e.z, oz = e.x;
      w.box("stoneW", q.x + ox * 3.15, 0, q.z + oz * 3.15, 3.1, PH, 2.04, { ry });
      w.box("pYellow", q.x + ox * 1.95, PH, q.z + oz * 1.95, 0.4, 0.015, 2.02, { ry });
      w.box("chromeB", q.x + ox * 1.62, 0, q.z + oz * 1.62, 0.1, PH + 0.02, 2.04, { ry });
      HX(w).push({ lv: 0, cx: q.x + ox * 3.15, cz: q.z + oz * 3.15, ang: ry, hw: 1.6, hl: 1.05, y: PH });
    }
    /* 屋根つきの待合（ガラスの背中・ベンチ・路線図） */
    const bb = 4.45;
    S.box("glassClear", 0, bb, PH, 7, 0.05, 2.4); S.box("darkMetal", 0, bb, PH + 2.4, 7.2, 0.12, 0.1);
    [-3.5, 3.5].forEach((a) => { S.box("darkMetal", a, bb, PH, 0.14, 0.14, 2.9); S.col(a, bb, 0.3, 0.3); });
    S.box(col === "#e8503a" ? "pRed" : "pBlue", 0, 3.3, PH + 2.9, 7.6, 2.8, 0.16); S.box("gold", 0, 1.92, PH + 2.9, 7.6, 0.08, 0.2); S.box("neonWhite", 0, 3.3, PH + 2.86, 6, 0.3, 0.04);
    S.box("darkMetal", 1.2, 4.1, PH, 3.2, 0.42, 0.42); S.box("woodLight", 1.2, 4.1, PH + 0.42, 3.4, 0.5, 0.07);
    S.col(0, bb, 7.2, 0.3);
    boardWithMap(w, S, L, st, -1.8, PH + 1.55, bb - 0.05, true, 2.4);
    /* 停留所の丸い看板（目つき）・電光表示・きっぷの機械 */
    { const a = LA / 2 - 1.5, b = 3.8; S.geo("darkMetal", new T.CylinderGeometry(0.07, 0.07, 3.4, 8), a, PH + 1.7, b); S.col(a, b, 0.25, 0.25);
      S.geo(col === "#e8503a" ? "pRed" : "pBlue", new T.CylinderGeometry(0.62, 0.62, 0.08, 24).rotateZ(Math.PI / 2), a, PH + 3.2, b);
      [-1, 1].forEach((sd) => { const [x, z] = S.at(a, b + sd * 0.05); w.sign(st.no, { bg: "#ffffff", color: "#1a1a2a", px: 256 }, 0.62, 0.36, x + S.nx * sd * 0.02, PH + 3.28, z + S.nz * sd * 0.02, sd > 0 ? S.faceN : S.faceIn); });
      S.sign(st.name, { bg: col, color: "#fff", px: 512, both: true }, 2.2, 0.42, a, PH + 2.5, b, S.faceF);
      S.box("darkMetal", -LA / 2 + 2, 3.9, PH, 0.6, 0.5, 1.5); S.box("neonBlue", -LA / 2 + 2, 3.62, PH + 0.9, 0.4, 0.02, 0.4); S.col(-LA / 2 + 2, 3.9, 0.7, 0.6);
      const [x, z] = S.at(-3.4, 3.1); w.sign("つぎの電車　まもなく", { bg: "#050810", color: "#ffb030", glow: "#ffb030", px: 512, both: true }, 2.4, 0.36, x, PH + 2.62, z, S.faceF);
    }
    const it = w.interact(...S.at(0, 3.1), 6, "路面電車に乗る（" + st.name + "・行き先をえらぶ）", () => ({ transit: { line: L.id, stop: st.k, mode: "stop" } }), "🚋"); it.y = PH;
    const [ax, az] = S.at(L.car.doorZ[0] + (L.nCars - 1) * L.pitch / 2, 2.6);
    st.alight = { x: ax, z: az, y: PH, yaw: S.faceF };
    st.wait = { x: S.at(0, 3.0)[0], z: S.at(0, 3.0)[1], y: PH, yaw: S.faceIn };
  }

  /* ══════════════ 路線図を描く（板・乗る前の画面） ══════════════ */
  function drawRouteMap(g, W, H, L, o) {
    o = o || {};
    const A = L.A, pts = []; for (let s = 0; s < A.L; s += A.L / 400) { pAt(A, s, _a); pts.push([_a.x, _a.z]); }
    let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9;
    if (L.id === "mono") { x0 = -1240; x1 = 1240; z0 = -720; z1 = 1100; }
    else { pts.forEach(([x, z]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }); x0 -= 150; x1 += 150; z0 -= 40; z1 += 70; }
    const head = o.board ? 78 : 0, pad = 24, sc = Math.min((W - pad * 2) / (x1 - x0), (H - head - pad * 2) / (z1 - z0));
    const ox = (W - (x1 - x0) * sc) / 2, oz = head + (H - head - (z1 - z0) * sc) / 2;
    const Pj = (x, z) => [ox + (x - x0) * sc, oz + (z - z0) * sc];
    g.fillStyle = "#f4f7ff"; g.fillRect(0, 0, W, H);
    if (o.board) {
      const gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, L.color); gr.addColorStop(1, "#1a2a6a"); g.fillStyle = gr; g.fillRect(0, 0, W, head);
      g.fillStyle = "#fff"; g.font = "900 38px sans-serif"; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText((L.id === "mono" ? "🚝 " : "🚋 ") + L.jp + "　路線図", 24, head / 2 + 2);
      g.font = "800 22px sans-serif"; g.textAlign = "right"; g.fillText(L.id === "mono" ? "外回り（1方向）・12駅・1周 約" + (A.L / 1000).toFixed(1) + "km" : "1周 " + L.stops.length + "停留所・約" + Math.round(A.L / 100) / 10 + "km", W - 24, head / 2 + 2);
    }
    /* 島・エリア */
    g.save();
    if (L.id === "mono") { g.fillStyle = "#d4ecc8"; g.strokeStyle = "#9cc890"; g.lineWidth = 3; g.beginPath(); for (let i = 0; i <= 240; i++) { const [x, z] = XP.islandPt(i / 240 * TAU, 1), [px, pz] = Pj(x, z); if (i) g.lineTo(px, pz); else g.moveTo(px, pz); } g.fill(); g.stroke(); }
    else { g.fillStyle = "#e4f0dc"; g.fillRect(0, head, W, H - head); }
    XP.AREAS.forEach((a) => { const [p0, q0] = Pj(a.x0, a.z0), [p1, q1] = Pj(a.x1, a.z1); if (p1 < 0 || q1 < head || p0 > W || q0 > H) return; g.fillStyle = a.c + "22"; g.strokeStyle = a.c + "66"; g.lineWidth = 1.5; g.fillRect(p0, q0, p1 - p0, q1 - q0); g.strokeRect(p0, q0, p1 - p0, q1 - q0);
      if (L.id === "mono" && a.id !== "marketE" && (p1 - p0) > 26) { g.fillStyle = a.c; g.font = "800 " + Math.round(W / 64) + "px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(a.n, (p0 + p1) / 2, (q0 + q1) / 2); } });
    if (L.id !== "mono") {
      const lab = (t, x, z) => { const [px, pz] = Pj(x, z); g.fillStyle = "#3a4a7a"; g.font = "800 " + Math.round(W / 50) + "px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(t, px, pz); };
      { const [cx, cz] = Pj(0, 290); g.fillStyle = "#9ad8f0"; g.beginPath(); g.arc(cx, cz, 27 * sc, 0, TAU); g.fill(); g.strokeStyle = "#9ad8f0"; g.lineWidth = 10 * sc; g.beginPath(); g.arc(cx, cz, 69 * sc, 0, TAU); g.stroke(); }
      lab("噴水公園", 0, 290); lab("マーケット", -78, 560); lab("マーケット", 78, 740); lab("ゲート（入口）", 0, 900); lab("↑ XEVARION HALL", 0, 162);
    }
    g.restore();
    /* 線（太い色＋白い芯）と向きの矢印 */
    const lw = L.id === "mono" ? W / 90 : W / 70;
    g.lineJoin = "round"; g.lineCap = "round";
    g.strokeStyle = L.color; g.lineWidth = lw; g.beginPath(); pts.forEach(([x, z], i) => { const [px, pz] = Pj(x, z); if (i) g.lineTo(px, pz); else g.moveTo(px, pz); }); g.closePath(); g.stroke();
    g.strokeStyle = "#ffffff"; g.lineWidth = lw * 0.28; g.stroke();
    g.fillStyle = L.color;
    for (let k = 0; k < 12; k++) { const s = (k + 0.5) / 12 * A.L; pAt(A, s, _a); pDir(A, s, _b); const [px, pz] = Pj(_a.x, _a.z), an = Math.atan2(_b.z, _b.x); g.save(); g.translate(px, pz); g.rotate(an); g.beginPath(); g.moveTo(lw * 1.1, 0); g.lineTo(-lw * 0.6, -lw * 0.8); g.lineTo(-lw * 0.6, lw * 0.8); g.closePath(); g.fill(); g.restore(); }
    /* 駅 */
    const proj = (st) => { pAt(A, st.sC, _a); return Pj(_a.x, _a.z); };
    L.stops.forEach((st) => {
      const [px, pz] = proj(st), here = o.here === st.k, sel = o.sel === st.k, r = (L.id === "mono" ? W / 60 : W / 52) * (here || sel ? 1.25 : 1);
      g.fillStyle = sel ? "#ffd84a" : "#ffffff"; g.strokeStyle = here ? "#e8286a" : L.color; g.lineWidth = r * 0.3; g.beginPath(); g.arc(px, pz, r, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = "#10204a"; g.font = "900 " + Math.round(r * 0.78) + "px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(st.no.slice(1), px, pz + 1);
      /* 名前は外がわへ（モノレール＝島のまん中から外、路面電車＝歩道の駅は左右・輪の駅は噴水から外） */
      pAt(A, st.sC, _a); let dx, dz;
      if (L.id === "mono") { dx = _a.x - 0; dz = _a.z - 190; }
      else if (_a.z > 395) { dx = _a.x > 0 ? 1 : -1; dz = 0; }
      else { dx = _a.x; dz = _a.z - 290; }
      { const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl; }
      const tx = px + dx * r * 2.3, tz = pz + dz * r * 2.3, fs = Math.round(L.id === "mono" ? W / 46 : W / 40);
      g.font = "900 " + fs + "px sans-serif"; g.textAlign = dx > 0.35 ? "left" : dx < -0.35 ? "right" : "center"; g.textBaseline = dz > 0.35 ? "top" : dz < -0.35 ? "bottom" : "middle";
      g.lineWidth = fs * 0.28; g.strokeStyle = "rgba(255,255,255,.95)"; g.strokeText(st.name, tx, tz); g.fillStyle = here ? "#e8286a" : sel ? "#b8860b" : "#10204a"; g.fillText(st.name, tx, tz);
      if (here) { g.font = "900 " + Math.round(fs * 0.8) + "px sans-serif"; g.fillStyle = "#e8286a"; g.textBaseline = "bottom"; g.textAlign = "center"; g.fillText("現在地", px, pz - r * 1.35); }
    });
    return proj;
  }

  /* ══════════════ 乗る・見回す・案内（main.js から呼ぶ） ══════════════ */
  const XT = window.XTransit = {
    lines: LINES, cur: null, wait: null, lifting: null, ctx: null, keysLook: { x: 0, y: 0 },
    init(ctx) {
      this.ctx = ctx;
      const hud = document.createElement("div"); hud.id = "trHud";
      hud.innerHTML = '<div class="trTop"><i class="trIc"></i><div class="trTx"><b class="trLine"></b><span class="trNext"></span></div><em class="trEta"></em></div><div class="trStrip"></div><div class="trBtns"><button data-a="fast">⏩ 早送り<kbd>E</kbd></button><button data-a="view">🎥 視点<kbd>V</kbd></button><button data-a="off">🚪 つぎでおりる</button><button data-a="cancel">✕ 乗るのをやめる</button></div><div class="trAnn"></div>';
      document.body.appendChild(hud); this.hud = hud;
      hud.querySelectorAll("button").forEach((b) => b.onclick = (e) => { e.stopPropagation(); const a = b.dataset.a; if (a === "fast") this.skip(); else if (a === "view") this.toggleView(); else if (a === "off") this.getOffNext(); else if (a === "cancel") this.cancelWait(); });
      ["pointerdown", "pointerup", "click"].forEach((ev) => hud.addEventListener(ev, (e) => e.stopPropagation()));
    },
    busy() { return !!(this.cur || this.lifting); },
    line(id) { return LINES.find((q) => q.id === id); },
    /* 駅・停留所の「乗る」 */
    act(r) {
      const L = this.line(r.line); if (!L) return;
      if (r.lift) return this.lift(L, r.stop, r.lift);
      this.openStop(L, r.stop, r.mode);
    },
    openStop(L, k, mode) {
      const ui = window.XParkUI, st = L.stops[k];
      if (this.wait) this.cancelWait(true);
      const b = ui.panel(L.icon, L.jp + "　" + st.no + " " + st.name, "transit");
      b.innerHTML = '<div class="trp"><div class="trpm"><canvas></canvas><small>' + esc(L.name) + "　" + esc(L.dir) + "　ピンの駅をえらぶと、その駅まで乗れます</small></div><div class=\"trpl\"></div></div>" +
        '<p class="pfoot">' + (L.id === "mono" ? "ホームで待つと電車が入ってきます。車内では ドラッグ（スマホはスティック）で見回す・V で外から見る・E で早送り。" : "停留所で待つと路面電車が来ます。車内では ドラッグで見回す・V で外から・E で早送り。") + "</p>";
      const cv = b.querySelector("canvas"), kk = Math.min(2, devicePixelRatio || 1), CW = 640, CH = L.id === "mono" ? 600 : 560;
      cv.width = CW * kk; cv.height = CH * kk; cv.style.aspectRatio = CW + " / " + CH;
      const g = cv.getContext("2d"); g.setTransform(kk, 0, 0, kk, 0, 0);
      let sel = null;
      const draw = () => { g.clearRect(0, 0, CW, CH); this._proj = drawRouteMap(g, CW, CH, L, { here: k, sel }); };
      draw();
      const list = b.querySelector(".trpl"), n = L.stops.length;
      let html = '<div class="trpH">' + esc(st.name) + " から</div>";
      for (let i = 1; i < n; i++) { const j = (k + i) % n, s2 = L.stops[j], t = Math.max(30, Math.round(travelTime(L, k, j) / 10) * 10), m = Math.floor(t / 60), sec = t % 60; html += '<button data-j="' + j + '" style="--c:' + L.color + '"><em>' + s2.no + "</em><b>" + esc(s2.name) + "</b><small>" + esc(s2.hint) + "</small><i>" + (i) + (L.id === "mono" ? "駅目" : "つ目") + "・約" + (m ? m + "分" : "") + (sec ? sec + "秒" : "") + "</i></button>"; }
      list.innerHTML = html;
      const go = (j) => { ui.close(); this.board(L, k, j, mode); };
      list.querySelectorAll("button").forEach((x) => { x.onclick = () => go(+x.dataset.j); x.onmouseenter = () => { sel = +x.dataset.j; draw(); }; });
      cv.addEventListener("click", (e) => { const r = cv.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * CW, py = (e.clientY - r.top) / r.height * CH; let best = -1, bd = 26; L.stops.forEach((s2, j) => { if (j === k) return; const [qx, qy] = this._proj(s2), dd = Math.hypot(qx - px, qy - py); if (dd < bd) { bd = dd; best = j; } }); if (best >= 0) { if (sel === best) go(best); else { sel = best; draw(); const bt = list.querySelector('[data-j="' + best + '"]'); if (bt) { bt.scrollIntoView({ block: "nearest" }); list.querySelectorAll("button").forEach((q) => q.classList.toggle("on", q === bt)); } } } });
    },
    /* 乗る：（ホールからはエレベーターでホームへ）→ 電車を呼ぶ → 待つ */
    board(L, k, j, mode) {
      const C = this.ctx, st = L.stops[k];
      if (L.pause && L.pause()) { C.toast("🎉 パレード中のため、路面電車は運転を見合わせています（パレードのあと再開します）"); return; }
      if (mode === "hall" && st.wait) C.teleport(st.wait.x, st.wait.z, st.wait.y, st.wait.yaw, "エレベーターでホームへ");
      /* いちばん近くを走っている電車（なければ手前に呼ぶ）。ほかの電車はじゃまにならない所へ */
      let tr = null, bd = 1e9;
      L.trains.forEach((t) => { if (t.rider) return; const dd = fwd(L.A, t.s, st.s); const atSt = t.st === "dwell" && dd < 0.5; if (atSt) { tr = t; bd = 0; } else if (dd < bd && dd < L.lead + 1 && t.st === "run") { bd = dd; tr = t; } });
      if (!tr) { tr = L.trains[0]; tr.s = ((st.s - L.lead) % L.A.L + L.A.L) % L.A.L; tr.v = Math.min(L.vmax, Math.sqrt(2 * L.dec * L.lead) * 0.95); tr.st = "run"; tr.door = 0; }
      tr.next = k; tr.pick = true;
      L.trains.forEach((o) => { if (o === tr) return; const behind = fwd(L.A, o.s, tr.s), ahead = fwd(L.A, tr.s, o.s); if (behind < 80 || ahead < L.lead + 90) { o.s = (tr.s + L.A.L / 2) % L.A.L; o.v = L.vmax * 0.6; o.st = "run"; o.door = 0; o.next = nextStopAfter(L, o.s); } });
      if (tr.st === "dwell" && fwd(L.A, tr.s, st.s) < 0.5) { tr.hold = true; }
      this.wait = { L, tr, k, j, t: 0 };
      this.showHud(true, "wait");
      C.toast(L.icon + " " + (tr.st === "dwell" ? "電車が止まっています。乗ります！" : "まもなく電車がまいります（黄色い線の内側でお待ちください）"));
    },
    cancelWait(silent) { if (!this.wait) return; const tr = this.wait.tr; tr.pick = false; tr.hold = false; if (tr.st === "dwell") tr.dw = Math.max(tr.dw, 1.5); this.wait = null; this.showHud(false); if (!silent) this.ctx.toast("乗るのをやめました"); },
    getOffNext() { const R = this.cur; if (!R || R.phase !== "ride") return; const n = R.tr.st === "dwell" ? (R.tr.next + 1) % R.L.stops.length : R.tr.next; R.dest = n; this.ctx.toast("🚪 つぎの " + R.L.stops[n].name + " でおります"); },
    skip() { const R = this.cur; if (!R) return; R.fast = !R.fast; this.ctx.toast(R.fast ? "⏩ 早送り中（もう一度で ふつうの速さ）" : "▶ ふつうの速さ"); },
    toggleView() { const R = this.cur; if (!R) return; R.view = R.view ? 0 : 1; R.yaw = 0; R.pitch = R.view ? 0.28 : 0; this.ctx.toast(R.view ? "🎥 外から見る（ドラッグで回す）" : "🎥 車内（いちばん前の席）から見る"); },
    look(dx, dy) { const R = this.cur; if (!R) return; R.yaw -= dx * 0.005; R.pitch = clamp(R.pitch - dy * 0.004, R.view ? -0.2 : -0.75, R.view ? 1.2 : 0.6); if (!R.view) { while (R.yaw > Math.PI) R.yaw -= TAU; while (R.yaw < -Math.PI) R.yaw += TAU; } },
    lookRate(dt, ix, iy) { if (!this.cur || (!ix && !iy)) return; this.look(ix * dt * 420, iy * dt * 300); },
    /* エレベーター（かごに乗って上下・5秒） */
    lift(L, k, dir) {
      const st = L.stops[k], lf = st.lift, C = this.ctx; if (!lf || this.lifting) return;
      const up = dir === "up";
      C.player.x = lf.x; C.player.z = lf.z; C.player.y = up ? 0 : lf.top; C.player.yaw = up ? lf.faceUp : lf.faceDown;
      this.lifting = { st, lf, up, t: 0, dur: 5 };
      C.toast("🛗 エレベーター：" + (up ? "ホームへ上がります" : "改札階へおります"));
    },
    showHud(on, mode) { const h = this.hud; if (!h) return; h.classList.toggle("on", !!on); h.dataset.mode = mode || ""; if (!on) return; const L = (this.cur || this.wait).L; h.style.setProperty("--c", L.color); h.querySelector(".trIc").textContent = L.icon; h.querySelector(".trLine").textContent = L.jp + "　" + L.dir; this._hudT = 0; },
    onStop(L, tr, k) {
      const W = this.wait;
      if (W && W.tr === tr && k === W.k) { tr.hold = true; return; }
      const R = this.cur; if (!R || R.tr !== tr) return;
      if (k === R.dest) { tr.hold = true; R.phase = "alight"; R.t = 0; this.ctx.toast("🚉 " + L.stops[k].name + " です。おりましょう"); this.chime(); this.announce(L.stops[k].name + "、" + L.stops[k].name + "です。ご乗車、ありがとうございました。", enSay(L.stops[k].en) + ". Thank you for riding the XEVARION " + (L.id === "mono" ? "Monorail" : "Streetcar") + "."); return; }
      tr.dw = R.fast ? 2.4 : 4.5; this.ctx.toast("🚉 " + L.stops[k].no + " " + L.stops[k].name + "　（つぎは " + L.stops[(k + 1) % L.stops.length].name + "）"); this.chime();
    },
    /* ★ 2026-09-29d 車内放送：日本語のあとに英語（JR 東日本ふう）。字幕も出す */
    annOn: (() => { try { return localStorage.getItem("xeva_park_ann") !== "0"; } catch (e) { return true; } })(),
    setAnn(v) { this.annOn = !!v; try { localStorage.setItem("xeva_park_ann", v ? "1" : "0"); } catch (e) {} if (!v && window.speechSynthesis) speechSynthesis.cancel(); },
    voice(lang) { const S = window.speechSynthesis; if (!S) return null; const vs = S.getVoices() || []; const pref = lang === "ja-JP" ? [/Nanami|Haruka|Kyoko|Google 日本語|O-ren|Ayumi/i] : [/Jenny|Aria|Samantha|Google US English|Google UK English Female|Zira|Libby/i]; for (const re of pref) { const v = vs.find((q) => re.test(q.name) && q.lang && q.lang.replace("_", "-").startsWith(lang.slice(0, 2))); if (v) return v; } return vs.find((q) => q.lang && q.lang.replace("_", "-").startsWith(lang)) || vs.find((q) => q.lang && q.lang.startsWith(lang.slice(0, 2))) || null; },
    announce(ja, en) {
      const h = this.hud; if (h) { const el = h.querySelector(".trAnn"); el.innerHTML = "📢 " + esc(ja) + '<i>' + esc(en) + "</i>"; el.classList.add("on"); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove("on"), 9000); }
      const S = window.speechSynthesis; if (!S || !this.annOn) return;
      try { S.cancel(); [["ja-JP", ja, 1.05], ["en-US", en, 0.95]].forEach(([lang, text, rate]) => { if (!text) return; const u = new SpeechSynthesisUtterance(text); u.lang = lang; const v = this.voice(lang); if (v) u.voice = v; u.rate = rate; u.pitch = 1.04; u.volume = 0.95; S.speak(u); }); } catch (e) {}
    },
    annNext(R, welcome) {
      const L = R.L, st = L.stops[R.tr.next], nm = L.id === "mono" ? "モノレール" : "路面電車";
      const ja = (welcome ? "本日も、XEVARION " + nm + "をご利用いただきまして、ありがとうございます。この電車は、" + L.dir + "です。" : "") + "次は、" + st.name + "、" + st.name + "です。";
      const en = (welcome ? "Welcome to the XEVARION " + (L.id === "mono" ? "Monorail" : "Streetcar") + ". " : "") + "The next station is " + enSay(st.en) + ", " + st.no + ".";
      this.announce(ja, en);
    },
    annSoon(R) {
      const L = R.L, st = L.stops[R.tr.next], side = st.doorX === -1 ? ["右側", "right"] : ["左側", "left"], tf = TRANSFER[st.no];
      const ja = "まもなく、" + st.name + "です。お出口は、" + side[0] + "です。" + (tf ? tf[0] : "") + (R.tr.next === R.dest ? "お忘れ物のないよう、ご注意ください。" : "");
      const en = "We will soon make a brief stop at " + enSay(st.en) + ". The doors on the " + side[1] + " side will open." + (tf ? " " + tf[1] : "");
      this.announce(ja, en);
    },
    chime() { try { const ac = this._ac || (this._ac = new (window.AudioContext || window.webkitAudioContext)()); if (ac.state === "suspended") return; const t0 = ac.currentTime; [[659, 0], [523, 0.32]].forEach(([f, d]) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = "sine"; o.frequency.value = f; g.gain.setValueAtTime(0, t0 + d); g.gain.linearRampToValueAtTime(0.12, t0 + d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.9); o.connect(g).connect(ac.destination); o.start(t0 + d); o.stop(t0 + d + 1); }); } catch (e) {} },
    /* 毎フレーム：電車を動かす（カメラより先） */
    update(dt) {
      const R = this.cur, C = this.ctx;
      for (const L of LINES) for (const tr of L.trains) stepTrain(L, tr, dt * (R && R.tr === tr && R.fast && R.phase === "ride" ? 6 : 1));
      for (const L of LINES) for (const tr of L.trains) placeTrain(L, tr);
      /* 待っている：電車が着いてドアが開いたら乗る。遠くへ歩いたらやめる */
      const W = this.wait;
      if (W) {
        W.t += dt; const st = W.L.stops[W.k], d = Math.hypot(C.player.x - (st.alight ? st.alight.x : 0), C.player.z - (st.alight ? st.alight.z : 0));
        if (d > 40 && W.t > 1) { this.cancelWait(); }
        else if (W.tr.st === "dwell" && fwd(W.L.A, W.tr.s, st.s) < 0.5 && W.tr.door > 0.9 && !(Math.abs(C.player.y - st.alight.y) < 1.6 && d < 36)) {
          /* ホームの上にいない（階段・改札へ行った）：少し待って、もどらなければ発車 */
          W.away = (W.away || 0) + dt; if (W.away > 12) { this.ctx.toast("🚉 ホームにいなかったので、電車は発車しました"); this.cancelWait(true); }
        }
        else if (W.tr.st === "dwell" && fwd(W.L.A, W.tr.s, st.s) < 0.5 && W.tr.door > 0.9) {
          this.wait = null; W.tr.pick = false;
          this.cur = { L: W.L, tr: W.tr, from: W.k, dest: W.j, phase: "board", t: 0, view: 0, yaw: 0, pitch: -0.05, fast: false, p0: C.camera.position.clone(), q0: C.camera.quaternion.clone() };
          W.tr.rider = true; C.onBoard(); this.showHud(true, "ride");
          C.toast(W.L.icon + " 乗りました！ " + W.L.stops[W.j].name + " まで（ドラッグで見回す・V で外から・E で早送り）");
        }
      }
      /* エレベーター */
      const LF = this.lifting;
      if (LF) {
        LF.t += dt; const k = smooth(LF.t / LF.dur), y = LF.up ? k * LF.lf.top : (1 - k) * LF.lf.top;
        C.player.x = LF.lf.x; C.player.z = LF.lf.z; C.player.y = y; LF.lf.cab.position.y = y + 0.02;
        if (LF.t >= LF.dur) { const tp = LF.up ? LF.lf.up : LF.lf.down; C.player.x = tp[0]; C.player.z = tp[1]; C.player.y = LF.up ? LF.lf.top : 0; C.player.yaw = LF.up ? LF.lf.faceUp : LF.lf.faceDown; C.cam.yaw = C.player.yaw + Math.PI; this.lifting = null; C.toast(LF.up ? "ホームに着きました（" + LF.st.name + "）" : "改札階に着きました"); }
      }
      /* 乗っている：プレイヤーの位置は車両といっしょ（地図の「いまここ」・エリア名・明るさが追いかける） */
      if (R) {
        /* 早送りで前の電車に追いつかない：近づいたら前の電車は先へ（見えないくらい遠くで） */
        R.L.trains.forEach((o) => { if (o === R.tr) return; const ahead = fwd(R.L.A, R.tr.s, o.s), behind = fwd(R.L.A, o.s, R.tr.s); if ((ahead < 480 && ahead > 200) || behind < 120) { o.s = (o.s + R.L.A.L / 3) % R.L.A.L; o.st = "run"; o.door = 0; o.v = Math.max(o.v, R.L.vmax * 0.5); o.next = nextStopAfter(R.L, o.s); } });
        const c0 = R.tr.cars[0].g; C.player.x = c0.position.x; C.player.z = c0.position.z; C.player.y = c0.position.y;
        if (R.phase === "board") { R.t += dt; if (R.t > 1.1) { R.phase = "ride"; R.tr.hold = false; R.tr.dw = 1.6; } }
        if (R.phase === "ride" && R.tr.st === "run") {
          if (R.annN !== R.tr.next) { R.annN = R.tr.next; R.annS = false; this.annNext(R, !R.welcomed); R.welcomed = true; }
          const dN = fwd(R.L.A, R.tr.s, R.L.stops[R.tr.next].s); if (!R.annS && dN < (R.L.id === "mono" ? 230 : 60) && dN > 5) { R.annS = true; this.annSoon(R); }
        }
        if (R.phase === "alight") { R.t += dt; if (R.t > 1.2) this.finish(); }
      }
      this.updHud(dt);
    },
    finish() {
      const R = this.cur, C = this.ctx, st = R.L.stops[R.dest], a = st.alight;
      R.tr.rider = false; R.tr.hold = false; R.tr.dw = 2.6; this.cur = null; this.showHud(false);
      C.onArrive(a.x, a.z, a.y, a.yaw, st);
    },
    /* カメラ（電車の位置を決めたあとに呼ぶ＝同じフレーム・ゆれない） */
    _v: new T.Vector3(), _v2: new T.Vector3(), _q: new T.Quaternion(), _e: new T.Euler(0, 0, 0, "YXZ"),
    camera(dt, camera) {
      const R = this.cur; if (!R) return false;
      const L = R.L, cars = R.tr.cars, c0 = cars[0].g, cl = cars[cars.length - 1].g;
      c0.updateMatrixWorld(true);
      const seat = this._v.set(L.seat[0], L.seat[1], L.seat[2]).applyMatrix4(c0.matrixWorld), hd = c0.rotation.y;
      const fovTo = (f) => { if (Math.abs(camera.fov - f) > 0.2) { camera.fov += (f - camera.fov) * Math.min(1, dt * 3); camera.updateProjectionMatrix(); } };
      /* 乗る：いまのカメラから、いちばん前の席へ */
      if (R.phase === "board") { const k = smooth(R.t / 1.1); this._e.set(R.pitch, hd + Math.PI + R.yaw, 0, "YXZ"); this._q.setFromEuler(this._e); camera.position.lerpVectors(R.p0, seat, k); camera.quaternion.copy(R.q0).slerp(this._q, k); fovTo(70); return true; }
      /* おりる：ホームのドアの前へ */
      if (R.phase === "alight") {
        if (!R.a0) { R.a0 = camera.position.clone(); R.aq = camera.quaternion.clone(); }
        const a = L.stops[R.dest].alight, k = smooth(R.t / 1.2); this._v2.set(a.x - Math.sin(a.yaw) * 3.2, a.y + 2.2, a.z - Math.cos(a.yaw) * 3.2);
        this._e.set(-0.18, a.yaw + Math.PI, 0, "YXZ"); this._q.setFromEuler(this._e);
        camera.position.lerpVectors(R.a0, this._v2, k); camera.quaternion.copy(R.aq).slerp(this._q, k); return true;
      }
      if (R.view === 0) {
        /* 車内：席の位置は車両といっしょ（同じフレームで決めた位置）＝ゆれない。向きは車両の向き＋見回し */
        this._e.set(R.pitch, hd + Math.PI + R.yaw, 0, "YXZ"); camera.position.copy(seat); camera.quaternion.setFromEuler(this._e); R._op = null; fovTo(70);
      } else {
        const cx = (c0.position.x + cl.position.x) / 2, cz = (c0.position.z + cl.position.z) / 2, cy = c0.position.y + 1.4, dist = L.id === "mono" ? 34 : 22, an = hd + Math.PI + R.yaw;
        const tgt = this._v2.set(cx + Math.sin(an) * Math.cos(R.pitch) * dist, cy + Math.sin(R.pitch) * dist + 2, cz + Math.cos(an) * Math.cos(R.pitch) * dist);
        const g2 = this.ctx.world.heightAt(tgt.x, tgt.z) + 1.2; if (tgt.y < g2) tgt.y = g2;
        if (!R._op) R._op = tgt.clone(); else R._op.lerp(tgt, Math.min(1, dt * 6));
        camera.position.copy(R._op); camera.lookAt(cx, cy, cz); fovTo(60);
      }
      return true;
    },
    updHud(dt) {
      const h = this.hud; if (!h || !h.classList.contains("on")) return;
      this._hudT -= dt; if (this._hudT > 0) return; this._hudT = 0.25;
      const R = this.cur, W = this.wait;
      if (W) {
        const st = W.L.stops[W.k], tr = W.tr, d = fwd(W.L.A, tr.s, st.s);
        h.querySelector(".trNext").textContent = "行き先：" + W.L.stops[W.j].name + "　｜　" + (tr.st === "dwell" && d < 0.5 ? "ドアが開きます…" : "電車がまいります");
        h.querySelector(".trEta").textContent = tr.st === "dwell" && d < 0.5 ? "到着" : "あと " + Math.max(1, Math.round(d / Math.max(4, tr.v) + 2)) + " 秒";
        this.strip(W.L, W.k, W.j, -1); return;
      }
      if (!R) return;
      const L = R.L, tr = R.tr, n = tr.st === "dwell" ? tr.next : tr.next, stN = L.stops[n], d = fwd(L.A, tr.s, stN.s);
      const dwell = tr.st === "dwell";
      h.querySelector(".trNext").textContent = (dwell ? "ただいま " + stN.name : "つぎは " + stN.no + " " + stN.name) + "　｜　行き先：" + L.stops[R.dest].name;
      const kmh = Math.round(tr.v * 3.6 * (R.fast ? 6 : 1));
      h.querySelector(".trEta").textContent = dwell ? "停車中" : (R.fast ? "⏩ " : "") + kmh + " km/h";
      this.strip(L, R.from, R.dest, dwell ? n : (n - 1 + L.stops.length) % L.stops.length, dwell ? 1 : 1 - d / Math.max(1, fwd(L.A, L.stops[(n - 1 + L.stops.length) % L.stops.length].s, stN.s)));
    },
    strip(L, from, dest, at, frac) {
      const el = this.hud.querySelector(".trStrip"), n = L.stops.length, seq = []; let i = from; seq.push(i); while (i !== dest && seq.length < n) { i = (i + 1) % n; seq.push(i); }
      const key = from + ":" + dest + ":" + at + ":" + (frac != null ? Math.round(frac * 20) : -1); if (el._k === key) return; el._k = key;
      const pos = at < 0 ? -1 : seq.indexOf(at);
      el.innerHTML = seq.map((j, q) => '<span class="' + (q < pos ? "done" : q === pos ? "at" : "") + (j === dest ? " dest" : "") + '"><i></i><b>' + esc(L.stops[j].name.replace(/駅$/, "")) + "</b></span>").join("") + (pos >= 0 && frac != null && pos < seq.length - 1 ? '<u style="left:' + ((pos + clamp(frac, 0, 1) + 0.5) / seq.length * 100).toFixed(2) + '%"></u>' : "");
      el.style.setProperty("--n", seq.length);
    }
  };
  /* 駅の中の位置（a＝線にそって前・b＝駅の側へ横）→ 世界の x, z（確かめる用） */
  XT.stAt = (L, st, a, b) => { const p = pAt(L.A, st.sC, { x: 0, y: 0, z: 0 }), d = pDir(L.A, st.sC, { x: 0, z: 0 }), rx = -d.z, rz = d.x, s = st.right ? 1 : -1; return [p.x + d.x * a + rx * s * b, p.z + d.z * a + rz * s * b, Math.atan2(rx * s, rz * s)]; };
  function nextStopAfter(L, s) { let best = 0, bd = 1e18; L.stops.forEach((st, k) => { const d = fwd(L.A, s, st.s); if (d > 0.5 && d < bd) { bd = d; best = k; } }); return best; }
  XT.drawRouteMap = drawRouteMap;
})();
