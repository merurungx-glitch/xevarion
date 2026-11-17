/* ============================================================
   MagiYacht — 3D のサイコロ（カップに入れてふって、トレイに落とす）
   ★★ 2026-11-18 ご指定
     「サイコロを振るのは Nintendo Switch などにもあるように自分で3Dで振れるように」
     「スイッチのもののようにボール？に入ったサイコロを振ってシャッフルして、トレーに自分でおとす形がよい」
   ------------------------------------------------------------
   ・番のはじめは、5個ともカップの中（カップはトレイの手前のまん中に置いてある）。
   ・カップを指で押さえる（ふり直しのときは右下のカップのボタンを押さえる）と、カップが指についてくる。
     トレイに残っているサイコロ（キープしていないもの）はカップへ飛びこむ。
   ・押さえたまま指を動かすと、カップがゆれてサイコロがシャカシャカ鳴る（速く動かすほど大きく）。
   ・指をはなすと、カップがかたむいてサイコロがトレイに落ちる（動かしていた向きへ・はなす直前の勢いも乗る）。
     ほとんどふらずにはなしたときは、自動で少しふってから落とす。「ふる」ボタン・CPU も同じカップで投げる。
   ・落ちたあとは物理で転がる（重力・床と壁・サイコロどうしの当たり・はね返り・まさつ。外の部品なし＝オフラインで動く）。
     止まったら上を向いた面の目を読む。斜めに止まった（ほかのサイコロに乗った・壁にもたれた）ときは軽くつついて落とす。
   ・キープ：止まっているサイコロをタップすると奥の棚へ。棚のサイコロをタップするとトレイへもどる。
   ・描画は WebGL（角の丸いサイコロ・1の目は赤・やわらかい影）。WebGL が使えない端末は 2D の絵で同じことをする。
   ・ゲームの決まり（何回ふれるか・だれの番か）は game.js。ここは「サイコロとカップそのもの」だけ。
   ============================================================ */
(function (root) {
  'use strict';
  const MY = root.MY = root.MY || {};

  /* ══ 小さな数学 ══ */
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const len = (a) => Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
  const len2 = (a) => a[0] * a[0] + a[1] * a[1] + a[2] * a[2];
  const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  function qmul(a, b) {
    return [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
      a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
      a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
      a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
  }
  const qnorm = (q) => { const l = Math.sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]) || 1; return [q[0] / l, q[1] / l, q[2] / l, q[3] / l]; };
  const qaxis = (ax, an) => { const n = norm(ax), s = Math.sin(an / 2); return [n[0] * s, n[1] * s, n[2] * s, Math.cos(an / 2)]; };
  /* 回転の行列（行ごと：m[行*3+列]） */
  function qmat(q) {
    const x = q[0], y = q[1], z = q[2], w = q[3];
    return [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w),
      2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w),
      2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)];
  }
  const mv = (m, v) => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
  const mtv = (m, v) => [m[0] * v[0] + m[3] * v[1] + m[6] * v[2], m[1] * v[0] + m[4] * v[1] + m[7] * v[2], m[2] * v[0] + m[5] * v[1] + m[8] * v[2]];
  function qslerp(a, b, t) {
    let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3], c = b;
    if (d < 0) { d = -d; c = [-b[0], -b[1], -b[2], -b[3]]; }
    if (d > 0.9995) return qnorm([a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t, a[2] + (c[2] - a[2]) * t, a[3] + (c[3] - a[3]) * t]);
    const th = Math.acos(d), s = Math.sin(th), wa = Math.sin((1 - t) * th) / s, wb = Math.sin(t * th) / s;
    return [a[0] * wa + c[0] * wb, a[1] * wa + c[1] * wb, a[2] * wa + c[2] * wb, a[3] * wa + c[3] * wb];
  }
  function qfromTo(a, b) {
    const d = dot(a, b);
    if (d > 0.999999) return [0, 0, 0, 1];
    if (d < -0.999999) { let ax = cross([1, 0, 0], a); if (len2(ax) < 1e-6) ax = cross([0, 0, 1], a); return qaxis(ax, Math.PI); }
    const c = cross(a, b); return qnorm([c[0], c[1], c[2], 1 + d]);
  }
  /* 4×4（WebGL の並び＝列ごと） */
  function perspective(fovy, asp, n, f) { const t = 1 / Math.tan(fovy / 2); return [t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, 2 * f * n / (n - f), 0]; }
  function lookAt(e, c, up) {
    const z = norm(sub(e, c)), x = norm(cross(up, z)), y = cross(z, x);
    return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, e), -dot(y, e), -dot(z, e), 1];
  }
  function m4mul(a, b) {
    const o = new Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; }
    return o;
  }
  function m4inv(m) {
    const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3], a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7];
    const a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11], a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15];
    const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11;
    const b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12, b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30;
    const b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!det) return null;
    det = 1 / det;
    return [(a11 * b11 - a12 * b10 + a13 * b09) * det, (a02 * b10 - a01 * b11 - a03 * b09) * det, (a31 * b05 - a32 * b04 + a33 * b03) * det, (a22 * b04 - a21 * b05 - a23 * b03) * det,
      (a12 * b08 - a10 * b11 - a13 * b07) * det, (a00 * b11 - a02 * b08 + a03 * b07) * det, (a32 * b02 - a30 * b05 - a33 * b01) * det, (a20 * b05 - a22 * b02 + a23 * b01) * det,
      (a10 * b10 - a11 * b08 + a13 * b06) * det, (a01 * b08 - a00 * b10 - a03 * b06) * det, (a30 * b04 - a31 * b02 + a33 * b00) * det, (a21 * b02 - a20 * b04 - a23 * b00) * det,
      (a11 * b07 - a10 * b09 - a12 * b06) * det, (a00 * b09 - a01 * b07 + a02 * b06) * det, (a31 * b01 - a30 * b03 - a32 * b00) * det, (a20 * b03 - a21 * b01 + a22 * b00) * det];
  }
  const xf4 = (m, p) => { const x = p[0], y = p[1], z = p[2]; const w = m[3] * x + m[7] * y + m[11] * z + m[15]; return [(m[0] * x + m[4] * y + m[8] * z + m[12]) / w, (m[1] * x + m[5] * y + m[9] * z + m[13]) / w, (m[2] * x + m[6] * y + m[10] * z + m[14]) / w]; };

  /* ══ サイコロの形（1辺 1・半分 H）と面の目 ══
     向かい合う面の和は 7（1-6・2-5・3-4） */
  const H = 0.5, ROUND = 0.12;
  const FACES = [
    { n: [0, 1, 0], v: 1 }, { n: [0, -1, 0], v: 6 }, { n: [1, 0, 0], v: 2 },
    { n: [-1, 0, 0], v: 5 }, { n: [0, 0, 1], v: 3 }, { n: [0, 0, -1], v: 4 }
  ];
  const FACE_N = {}; FACES.forEach((f) => { FACE_N[f.v] = f.n; });
  const CORN = [];
  for (let i = 0; i < 8; i++) CORN.push([(i & 1) ? H : -H, (i & 2) ? H : -H, (i & 4) ? H : -H]);
  /* サイコロどうしの当たりを見る点（8つの角＋12本の辺の上の3点） */
  const SAMP = CORN.slice();
  for (let i = 0; i < 8; i++) for (let b = 0; b < 3; b++) {
    const j = i | (1 << b); if (j === i) continue;
    [0.25, 0.5, 0.75].forEach((t) => SAMP.push([CORN[i][0] + (CORN[j][0] - CORN[i][0]) * t, CORN[i][1] + (CORN[j][1] - CORN[i][1]) * t, CORN[i][2] + (CORN[j][2] - CORN[i][2]) * t]));
  }

  /* ══ 物理の数字 ══ */
  const PH = {
    g: 140, sub: 1 / 300, iters: 8,
    eFloor: 0.3, eWall: 0.42, eDie: 0.32, muFloor: 0.55, muWall: 0.22, muDie: 0.18,
    bounceMin: 1.2, slop: 0.004,
    linDamp: 0.9, angDamp: 1.7, airAng: 0.15,
    sleepV: 0.06, sleepW: 0.16, sleepT: 0.24,
    invI: 6                       /* 立方体の慣性（1/(m s²/6)）。立方体はどの向きでも同じ */
  };
  const RIM = 0.46, SHELF = 1.6, RIM2 = 0.36, RIM_H = 0.95;
  /* カップ（r0＝底の外の半径・r1＝口の外の半径・t＝壁の厚さ・h＝高さ・b＝底の厚さ・piv＝回すときの中心の高さ・hover＝持ち上げたときの底の高さ） */
  const CUP = { r0: 1.36, r1: 1.46, t: 0.1, h: 2.25, b: 0.16, piv: 1.15, hover: 1.3 };
  /* カップの中のサイコロの位置（下に3つ・上に2つ）と、外を向く面の角度 */
  const CUP_SLOTS = [[0.56, 0.66, 0], [-0.28, 0.66, 0.485], [-0.28, 0.66, -0.485], [0, 1.66, 0.5], [0, 1.66, -0.5]];

  /* ══ 状態 ══ */
  const S = {
    ok: false, mode: '', cv: null, gl: null, wrap: null,
    tw: 12, td: 7.4, ceil: 7.5, dpr: 1, cw: 1, ch: 1,
    bodies: [], throwing: false, throwT: 0, settleWait: 0,
    allow: { throw: false, keep: false }, ptr: null, raf: 0, last: 0, acc: 0,
    VP: null, iVP: null, eye: [0, 10, 10], hl: [0, 0, 0, 0, 0], hlOn: false, t: 0,
    lis: {}, lastHit: { floor: 0, wall: 0, die: 0 }, hint: false, silent: false
  };
  /* カップ：mode＝off（見えない・上の空）/ idle（トレイに置いてある）/ come（置き場所へ降りる）/ hold（指についてくる）/ pour（かたむける）/ leave（上へ去る） */
  const cup = { mode: 'off', c: [0, 14, 0], q: [0, 0, 0, 1], tgt: [0, 0, 0], vel: [0, 0, 0], I: 0, sum: 0, rattle: 0, want: false, auto: null, pour: null, anim: null, ptr: null };
  function emit(ev, a, b) { if (S.silent) return; (S.lis[ev] || []).forEach((f) => { try { f(a, b); } catch (e) { /* 呼び先のまちがいで止めない */ } }); }
  function on(ev, f) { (S.lis[ev] = S.lis[ev] || []).push(f); }

  function Body(i) {
    this.i = i; this.p = [0, H, 0]; this.q = [0, 0, 0, 1]; this.v = [0, 0, 0]; this.w = [0, 0, 0];
    this.R = qmat(this.q); this.mode = 'rest'; this.asleep = false; this.st = 0;
    this.kept = false; this.slot = -1; this.anim = null; this.nudges = 0; this.thrown = false;
    this.tray = null; this.cs = -1; this.cq = [0, 0, 0, 1]; this.jp = [rnd(0, 6), rnd(0, 6), rnd(0, 6), rnd(0, 6)]; this.ja = norm([rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)]);
  }
  function upFace(b) {
    const R = qmat(b.q);
    let best = -2, v = 1, nrm = [0, 1, 0];
    for (let k = 0; k < 6; k++) { const n = FACES[k].n, y = R[3] * n[0] + R[4] * n[1] + R[5] * n[2]; if (y > best) { best = y; v = FACES[k].v; nrm = mv(R, n); } }
    return { v, dot: best, n: nrm };
  }
  /* その目を上にした向き（yaw＝上から見た回し） */
  function qUp(v, yaw) { return qmul(qaxis([0, 1, 0], yaw || 0), qfromTo(FACE_N[v], [0, 1, 0])); }
  function values() { return S.bodies.map((b) => upFace(b).v); }

  /* ══ トレイの大きさ（画面の形に合わせる） ══ */
  function trayFor(asp) {
    if (asp >= 1.5) return [12.4, 7.0];
    if (asp >= 1.15) return [11.2, 7.4];
    if (asp >= 0.85) return [9.8, 7.8];
    if (asp >= 0.62) return [8.4, 8.4];
    return [7.4, 8.8];
  }
  const slotPos = (k) => [(k - 2) * 1.34, H, -(S.td / 2 + RIM + SHELF / 2)];
  function inTray(x, z, m) { m = m == null ? 0.62 : m; return [clamp(x, -S.tw / 2 + m, S.tw / 2 - m), clamp(z, -S.td / 2 + m, S.td / 2 - m)]; }

  /* ══════════════════════════════════════════════════════════════
     物理
     ══════════════════════════════════════════════════════════════ */
  function planes() {
    return [
      { n: [0, 1, 0], o: 0, e: PH.eFloor, mu: PH.muFloor, k: 'floor' },
      { n: [1, 0, 0], o: -S.tw / 2, e: PH.eWall, mu: PH.muWall, k: 'wall' },
      { n: [-1, 0, 0], o: -S.tw / 2, e: PH.eWall, mu: PH.muWall, k: 'wall' },
      { n: [0, 0, 1], o: -S.td / 2, e: PH.eWall, mu: PH.muWall, k: 'wall' },
      { n: [0, 0, -1], o: -S.td / 2, e: PH.eWall, mu: PH.muWall, k: 'wall' },
      { n: [0, -1, 0], o: -S.ceil, e: 0.2, mu: 0.1, k: 'wall' }
    ];
  }
  let PL = planes();
  function planeContacts(b, C) {
    for (let k = 0; k < PL.length; k++) {
      const P = PL[k], cd = dot(P.n, b.p) - P.o;
      if (cd > 0.9) continue;
      for (let i = 0; i < 8; i++) {
        const c = add(b.p, mv(b.R, CORN[i])), d = dot(P.n, c) - P.o;
        if (d < 0.004) C.push({ a: b, b: null, n: P.n, p: c, depth: -d, e: P.e, mu: P.mu, k: P.k });
      }
    }
  }
  /* A の点が B の中に入っているか（B の面から押し出す向き） */
  function ptsIn(A, B, C, only) {
    let deep = null;
    for (let i = 0; i < SAMP.length; i++) {
      const w = add(A.p, mv(A.R, SAMP[i])), l = mtv(B.R, sub(w, B.p));
      const ax = Math.abs(l[0]), ay = Math.abs(l[1]), az = Math.abs(l[2]);
      if (ax >= H || ay >= H || az >= H) continue;
      const dx = H - ax, dy = H - ay, dz = H - az;
      let nl, d;
      if (dx <= dy && dx <= dz) { nl = [l[0] > 0 ? 1 : -1, 0, 0]; d = dx; }
      else if (dy <= dz) { nl = [0, l[1] > 0 ? 1 : -1, 0]; d = dy; }
      else { nl = [0, 0, l[2] > 0 ? 1 : -1]; d = dz; }
      const n = mv(B.R, nl);
      if (only) { if (!deep || d > deep.depth) deep = { depth: d, n }; }
      else C.push({ a: A, b: B, n, p: w, depth: d, e: PH.eDie, mu: PH.muDie, k: 'die' });
    }
    return deep;
  }
  function boxContacts(A, B, C) {
    if (len2(sub(A.p, B.p)) > 3.1) return;
    ptsIn(A, B, C); ptsIn(B, A, C);
  }
  function wake(b) { if (b.asleep) { b.asleep = false; b.st = 0; } }
  function relVel(c) {
    const a = c.a, b = c.b;
    let v = add(a.v, cross(a.w, c.ra));
    if (b) v = sub(v, add(b.v, cross(b.w, c.rb)));
    return v;
  }
  function applyJ(c, J) {
    const a = c.a, b = c.b;
    if (c.ima) { a.v[0] += J[0] * c.ima; a.v[1] += J[1] * c.ima; a.v[2] += J[2] * c.ima; const t = cross(c.ra, J); a.w[0] += t[0] * c.iia; a.w[1] += t[1] * c.iia; a.w[2] += t[2] * c.iia; }
    if (b && c.imb) { b.v[0] -= J[0] * c.imb; b.v[1] -= J[1] * c.imb; b.v[2] -= J[2] * c.imb; const t = cross(c.rb, J); b.w[0] -= t[0] * c.iib; b.w[1] -= t[1] * c.iib; b.w[2] -= t[2] * c.iib; }
  }
  function prepare(c) {
    const a = c.a, b = c.b;
    /* 眠っているサイコロに強く当たったら起こす */
    if (b && a.asleep !== b.asleep) {
      const ra = sub(c.p, a.p), rb = sub(c.p, b.p);
      const vr = sub(add(a.v, cross(a.w, ra)), add(b.v, cross(b.w, rb)));
      if (Math.abs(dot(vr, c.n)) > 0.7) { wake(a); wake(b); }
    }
    c.ra = sub(c.p, a.p);
    c.ima = a.asleep ? 0 : 1; c.iia = a.asleep ? 0 : PH.invI;
    let k = c.ima + c.iia * len2(cross(c.ra, c.n));
    if (b) { c.rb = sub(c.p, b.p); c.imb = b.asleep ? 0 : 1; c.iib = b.asleep ? 0 : PH.invI; k += c.imb + c.iib * len2(cross(c.rb, c.n)); }
    else { c.imb = 0; c.iib = 0; }
    c.mN = k > 0 ? 1 / k : 0;
    const vn = dot(relVel(c), c.n);
    c.bounce = vn < -PH.bounceMin ? -c.e * vn : 0;
    c.jn = 0; c.jt = [0, 0, 0];
    if (vn < -2.2) hitSound(c.k, -vn);
  }
  function solve(c) {
    if (!c.mN) return;
    let vr = relVel(c);
    const vn = dot(vr, c.n);
    let jn = c.mN * (c.bounce - vn);
    const old = c.jn; c.jn = Math.max(old + jn, 0); jn = c.jn - old;
    if (jn) applyJ(c, mul(c.n, jn));
    vr = relVel(c);
    const vn2 = dot(vr, c.n), vt = sub(vr, mul(c.n, vn2)), sp = len(vt);
    if (sp < 1e-6) return;
    const t = mul(vt, 1 / sp);
    let kt = c.ima + c.iia * len2(cross(c.ra, t));
    if (c.b) kt += c.imb + c.iib * len2(cross(c.rb, t));
    if (kt <= 0) return;
    const jt = -sp / kt, maxF = c.mu * c.jn;
    let nx = c.jt[0] + t[0] * jt, ny = c.jt[1] + t[1] * jt, nz = c.jt[2] + t[2] * jt;
    const nl = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (nl > maxF) { const s = maxF / (nl || 1); nx *= s; ny *= s; nz *= s; }
    const d = [nx - c.jt[0], ny - c.jt[1], nz - c.jt[2]];
    c.jt = [nx, ny, nz];
    applyJ(c, d);
  }
  function integrate(b, dt) {
    b.p[0] += b.v[0] * dt; b.p[1] += b.v[1] * dt; b.p[2] += b.v[2] * dt;
    const w = b.w, q = b.q;
    const dq = qmul([w[0], w[1], w[2], 0], q);
    b.q = qnorm([q[0] + dq[0] * 0.5 * dt, q[1] + dq[1] * 0.5 * dt, q[2] + dq[2] * 0.5 * dt, q[3] + dq[3] * 0.5 * dt]);
  }
  /* めりこみを位置で直す（床・壁は角のいちばん深いところ・サイコロどうしはいちばん深い点） */
  function correct(B) {
    for (const b of B) {
      if (b.asleep) continue;
      b.R = qmat(b.q);
      for (let k = 0; k < PL.length; k++) {
        const P = PL[k];
        if (dot(P.n, b.p) - P.o > 0.9) continue;
        let md = 1e9;
        for (let i = 0; i < 8; i++) { const d = dot(P.n, add(b.p, mv(b.R, CORN[i]))) - P.o; if (d < md) md = d; }
        if (md < -PH.slop) { const s = (-md - PH.slop) * 0.9; b.p = add(b.p, mul(P.n, s)); }
      }
    }
    for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) {
      const A = B[i], Bb = B[j];
      if (A.asleep && Bb.asleep) continue;
      const dAB = sub(A.p, Bb.p), dd = len(dAB);
      if (dd > 1.77) continue;
      /* ★ 深く重なった（中心どうしが近すぎる）ときは、中心から中心の向きで押し分ける。
           点で見るやり方は、深く入りこむと押す向きをまちがえて、くっついたまま止まることがある */
      if (dd < 0.92) {
        const n = dd > 1e-4 ? mul(dAB, 1 / dd) : norm([rnd(-1, 1), 0.2, rnd(-1, 1)]), s = (0.98 - dd) * 0.5;
        wake(A); wake(Bb);
        A.p = add(A.p, mul(n, s)); Bb.p = sub(Bb.p, mul(n, s));
        continue;
      }
      A.R = qmat(A.q); Bb.R = qmat(Bb.q);
      const d1 = ptsIn(A, Bb, null, true), d2 = ptsIn(Bb, A, null, true);
      let n = null, d = 0;
      if (d1 && (!d2 || d1.depth >= d2.depth)) { n = d1.n; d = d1.depth; }
      else if (d2) { n = mul(d2.n, -1); d = d2.depth; }
      if (!n || d <= PH.slop) continue;
      const s = (d - PH.slop) * 0.8, wa = A.asleep ? 0 : Bb.asleep ? 1 : 0.5, wb = Bb.asleep ? 0 : A.asleep ? 1 : 0.5;
      A.p = add(A.p, mul(n, s * wa)); Bb.p = sub(Bb.p, mul(n, s * wb));
    }
  }
  function lowY(b) { let m = 1e9; for (let i = 0; i < 8; i++) { const y = b.p[1] + b.R[3] * CORN[i][0] + b.R[4] * CORN[i][1] + b.R[5] * CORN[i][2]; if (y < m) m = y; } return m; }
  function substep(dt) {
    const B = S.bodies.filter((b) => b.mode === 'dyn');
    if (!B.length) return;
    for (const b of B) { b.R = qmat(b.q); if (!b.asleep) b.v[1] -= PH.g * dt; }
    const C = [];
    for (const b of B) if (!b.asleep) planeContacts(b, C);
    for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) if (!(B[i].asleep && B[j].asleep)) boxContacts(B[i], B[j], C);
    for (const c of C) prepare(c);
    for (let it = 0; it < PH.iters; it++) for (const c of C) solve(c);
    for (const b of B) if (!b.asleep) integrate(b, dt);
    correct(B);
    for (const b of B) {
      if (b.asleep) continue;
      b.R = qmat(b.q);
      const ground = lowY(b) < 0.03;
      const ld = ground ? Math.max(0, 1 - PH.linDamp * dt) : 1, ad = Math.max(0, 1 - (ground ? PH.angDamp : PH.airAng) * dt);
      b.v[0] *= ld; b.v[2] *= ld; b.w = mul(b.w, ad);
      /* 2.8秒たってもまだ小さくゆれているサイコロは、しずめる（いつまでも止まらない＝待たされるのを防ぐ） */
      if (S.throwing && S.throwT > 2.8) { b.v = mul(b.v, 0.985); b.w = mul(b.w, 0.975); }
      /* 止まったら眠らせる（床の上でなくても＝ほかのサイコロの上で止まったら、あとで settleCheck がつついて落とす） */
      if (len2(b.v) < PH.sleepV && len2(b.w) < PH.sleepW) { b.st += dt; if (b.st > PH.sleepT) { b.asleep = true; b.v = [0, 0, 0]; b.w = [0, 0, 0]; } }
      else b.st = 0;
      /* 万一トレイの外へ出たら、まん中の上へもどす */
      if (b.p[1] < -1 || Math.abs(b.p[0]) > S.tw / 2 + 0.6 || Math.abs(b.p[2]) > S.td / 2 + 0.6) { b.p = [rnd(-1, 1), 3, rnd(-1, 1)]; b.v = [0, 0, 0]; b.w = [rnd(-4, 4), rnd(-4, 4), rnd(-4, 4)]; }
    }
  }

  /* ── 当たった音（ゲームの音へ）。同じ種類は少し間をあける ── */
  function hitSound(k, sp) {
    const now = performance.now();
    if (now - S.lastHit[k] < (k === 'die' ? 40 : 55)) return;
    S.lastHit[k] = now;
    emit('hit', k, Math.min(1, sp / 22));
  }

  /* ══════════════════════════════════════════════════════════════
     カップ
     ══════════════════════════════════════════════════════════════ */
  const freeDice = () => S.bodies.filter((b) => !b.kept);
  const cupHome = () => [0, CUP.piv, clamp(S.td / 2 - 2.05, -S.td / 2 + 1.7, S.td / 2 - 1.7)];
  /* 持ち上げたカップが動ける範囲（トレイの上） */
  function cupClamp(x, z) { return [clamp(x, -S.tw / 2 + 1.75, S.tw / 2 - 1.75), clamp(z, -S.td / 2 + 1.75, S.td / 2 - 1.45)]; }
  /* カップの中の点 → 世界の点 */
  function cupW(l) { return add(cup.c, mv(qmat(cup.q), [l[0], l[1] - CUP.piv, l[2]])); }
  function cupIdx() { const used = S.bodies.filter((b) => (b.mode === 'cup' || (b.anim && b.anim.toCup)) && b.cs >= 0).map((b) => b.cs); let k = 0; while (used.indexOf(k) >= 0) k++; return k; }
  /* サイコロをカップへ（飛びこむ） */
  function scoop(instant) {
    let n = 0;
    S.bodies.forEach((b) => {
      if (b.kept || b.mode === 'cup' || (b.anim && b.anim.toCup)) return;
      const k = cupIdx();
      b.cs = k; b.cq = qrand();
      b.thrown = false; b.nudges = 0;
      if (instant) { b.mode = 'cup'; b.anim = null; placeInCup(b, 0); return; }
      const delay = n++ * 0.05;
      b.anim = { p0: b.p.slice(), q0: b.q.slice(), t: -delay, dur: 0.34, arc: 1.4, then: 'cup', toCup: true };
      b.mode = 'anim'; b.asleep = false; b.v = [0, 0, 0]; b.w = [0, 0, 0];
    });
    kick();
  }
  /* カップの中：ふっている強さ I に合わせて、はねる・ころがる（ふっている間に向きがまざる＝出る目がかたよらない） */
  function placeInCup(b, I, dt) {
    const sl = CUP_SLOTS[b.cs % 5], t = S.t, j = b.jp;
    const ah = 0.03 + I * 0.07, av = 0.04 + I * 0.17;
    let lp = [sl[0] + Math.sin(t * 13 + j[0]) * ah, sl[1] + Math.abs(Math.sin(t * 17 + j[1])) * av * 1.4, sl[2] + Math.sin(t * 11 + j[2]) * ah];
    /* かたむけている間：こぼれる角度に近づくほど、口（かたむけた側のふち）のほうへすべっていく。
       ★ 行き先はサイコロごとに「いまの場所を口のほうへずらした所」（同じ1点に集めると重なって出てしまう） */
    if (cup.mode === 'pour' && cup.pour && b.relA) {
      const f = Math.pow(clamp(cup.pour.th / b.relA, 0, 1), 2), d = cup.pour.dir;
      let tx = sl[0] + d[0] * 0.5, tz = sl[2] + d[2] * 0.5;
      const r = Math.hypot(tx, tz); if (r > 0.72) { tx *= 0.72 / r; tz *= 0.72 / r; }
      const tgt = [tx, Math.min(CUP.h - 0.45, sl[1] + 0.45), tz];
      lp = [lp[0] + (tgt[0] - lp[0]) * f, lp[1] + (tgt[1] - lp[1]) * f, lp[2] + (tgt[2] - lp[2]) * f];
      if (dt) b.cq = qnorm(qmul(qaxis(cup.pour.axis, f * 4 * dt), b.cq));
    }
    b.p = cupW(lp);
    if (dt && I > 0.05) {
      b.cq = qnorm(qmul(qaxis(b.ja, I * 15 * dt), b.cq));
      if (Math.random() < dt * 6) b.ja = norm([rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)]);
    }
    const wob = qaxis(b.ja, Math.sin(t * 15 + j[3]) * 0.05);
    b.q = qmul(cup.q, qmul(wob, b.cq));
  }
  /* かたよりのない向き（四元数を一様に） */
  function qrand() {
    const u1 = Math.random(), u2 = Math.random() * Math.PI * 2, u3 = Math.random() * Math.PI * 2;
    const a = Math.sqrt(1 - u1), c = Math.sqrt(u1);
    return [a * Math.sin(u2), a * Math.cos(u2), c * Math.sin(u3), c * Math.cos(u3)];
  }
  /* 指でカップを持つ（x, z＝指の下・トレイの上の高さ） */
  function cupGrab(x, z) {
    if (!freeDice().length) { emit('noFree'); return false; }
    const [tx, tz] = cupClamp(x, z);
    if (cup.mode === 'off' || cup.mode === 'leave') { cup.c = [tx, 9, tz]; cup.q = [0, 0, 0, 1]; }
    cup.mode = 'hold'; cup.tgt = [tx, CUP.hover + CUP.piv, tz]; cup.vel = [0, 0, 0]; cup.I = 0; cup.sum = 0; cup.want = false; cup.auto = null; cup.anim = null;
    scoop(false);
    emit('grab');
    kick();
    return true;
  }
  function cupMoveTo(x, z) {
    if (cup.mode !== 'hold' || cup.auto) return;
    const [tx, tz] = cupClamp(x, z);
    cup.tgt = [tx, CUP.hover + CUP.piv, tz];
  }
  /* 指をはなした：ふって（動かして）いたら落とす。★ 2026-11-18 ご指摘「ボタンを押すと自動で展開されてしまう」
     → ふらずにはなしたときは自動で落とさず、カップをトレイに置き直す（落とすのはいつも自分で） */
  function cupRelease() {
    if (cup.mode !== 'hold' || cup.auto) return;
    if (cup.sum < 1.2) { cupSetDown(); emit('needShake'); return; }
    cup.want = true;
  }
  function cupSetDown() {
    cup.anim = { t: 0, dur: 0.3, c0: cup.c.slice(), c1: cupHome(), q0: cup.q.slice() };
    cup.mode = 'come'; cup.I = 0;
    kick();
  }
  /* 右下のカップのボタン：カップをトレイに出して、残っているサイコロを入れる（落とすのは自分で）。
     ボタンを押さえたまま指を動かしたら、そのままカップを持つ */
  function callCup(e) {
    if (S.mode === '2d') { autoThrow(); return false; }
    if (!S.allow.throw || S.throwing || cup.mode === 'pour' || cup.ptr) return false;
    if (!freeDice().length) { emit('noFree'); return false; }
    if (cup.mode !== 'idle' && cup.mode !== 'come' && cup.mode !== 'hold') cupToHome(false);
    scoop(false);
    emit('call');
    kick();
    if (e && e.pointerId != null) {
      const id = e.pointerId, x0 = e.clientX, y0 = e.clientY;
      const off = () => { root.removeEventListener('pointermove', mv2); root.removeEventListener('pointerup', up); root.removeEventListener('pointercancel', up); };
      const mv2 = (ev) => { if (ev.pointerId !== id) return; if (Math.hypot(ev.clientX - x0, ev.clientY - y0) > 14) { off(); grabAt(ev); } };
      const up = (ev) => { if (ev.pointerId === id) off(); };
      root.addEventListener('pointermove', mv2); root.addEventListener('pointerup', up); root.addEventListener('pointercancel', up);
    }
    return true;
  }
  function autoShake(dur, dir) {
    cup.auto = { t: 0, dur, base: cup.tgt.slice(), dir };
    kick();
  }
  /* かたむける向き：動かしていた向き（速さがあれば）・なければトレイのまん中へ（まん中なら奥へ） */
  function pourDir() {
    const v = [cup.vel[0], 0, cup.vel[2]], sp = len(v);
    if (sp > 3.5) return norm(v);
    const toC = [-cup.c[0], 0, -cup.c[2] - 0.6];
    if (len(toC) > 1.3) return norm(toC);
    return norm([rnd(-0.35, 0.35), 0, -1]);
  }
  /* ★ 2026-11-18 ご指摘「カップからサイコロが出る演出が急すぎる」
     → かたむけるのを 0.34秒 → 0.8秒に・口に近い上のサイコロから順に、口のほうへすべってから1個ずつこぼれる・出る勢いを弱く
       ・出しきったら少し止まってから、ゆっくり起き上がって去る */
  const POUR = { dur: 0.8, max: 2.2, hold: 0.22, leave: 0.8 };
  function startPour(dir) {
    cup.want = false; cup.auto = null;
    const axis = norm(cross([0, 1, 0], dir));
    /* こぼれる角度：上の段・かたむける側にいるサイコロが先。1個ずつ間をあける（重なって出ないように） */
    const list = S.bodies.filter((b) => b.mode === 'cup');
    list.forEach((b) => { const s = CUP_SLOTS[b.cs % 5]; b.relA = ((b.cs % 5) >= 3 ? 0.86 : 1.16) - 0.22 * (s[0] * dir[0] + s[2] * dir[2]) + rnd(0, 0.08); });
    list.sort((a, b) => a.relA - b.relA);
    for (let k = 1; k < list.length; k++) list[k].relA = Math.max(list[k].relA, list[k - 1].relA + 0.13);
    cup.pour = { t: 0, th: 0, hold: 0, axis, dir, q0: cup.q.slice(), vel: cup.vel.slice(), n: 0 };
    cup.mode = 'pour';
    emit('pour');
  }
  /* 1個こぼす（ここから物理） */
  function releaseOne(b) {
    const P = cup.pour, R = qmat(cup.q), mouth = mv(R, [0, 1, 0]), pv = P ? P.vel : [0, 0, 0];
    /* 口のふちに沿って左右に散らす（同じところに積み重ならないように） */
    const s = CUP_SLOTS[(b.cs < 0 ? 0 : b.cs) % 5], d = P ? P.dir : [0, 0, -1], perp = [-d[2], 0, d[0]];
    const side = (s[0] * perp[0] + s[2] * perp[2]) * 2.4 + rnd(-0.9, 0.9);
    b.mode = 'dyn'; b.asleep = false; b.st = 0; b.thrown = true; b.nudges = 0; b.cs = -1;
    b.v = add(add(add(mul(mouth, rnd(3.0, 4.8)), mul([pv[0], 0, pv[2]], 0.45)), mul(perp, side)), [rnd(-0.6, 0.6), rnd(-0.4, 0.3), rnd(-0.6, 0.6)]);
    b.w = add(mul(norm([rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)]), rnd(8, 15)), mul(P ? P.axis : [1, 0, 0], rnd(2.5, 6)));
    b.R = qmat(b.q);
    if (!S.throwing) { S.throwing = true; S.throwT = 0; S.settleWait = 0; emit('throw', S.bodies.filter((o) => o.mode === 'cup').length + 1); }
    if (P) P.n++;
  }
  function stepCup(dt) {
    if (cup.mode === 'off') return;
    const prev = cup.c.slice();
    if (cup.mode === 'hold') {
      if (cup.auto) {
        const a = cup.auto; a.t += dt;
        const k = a.t;
        cup.tgt = [a.base[0] + Math.sin(k * 27) * 0.5, a.base[1] + Math.abs(Math.sin(k * 19)) * 0.25, a.base[2] + Math.cos(k * 23) * 0.3];
        if (a.t >= a.dur && !S.bodies.some((b) => b.anim && b.anim.toCup)) { const d = a.dir || pourDir(); cup.auto = null; startPour(d); }
      }
      const f = 1 - Math.exp(-dt * (cup.c[1] > 5 ? 9 : 20));
      cup.c = [cup.c[0] + (cup.tgt[0] - cup.c[0]) * f, cup.c[1] + (cup.tgt[1] - cup.c[1]) * f, cup.c[2] + (cup.tgt[2] - cup.c[2]) * f];
      const v = mul(sub(cup.c, prev), 1 / Math.max(dt, 1e-3));
      cup.vel = add(mul(cup.vel, 0.7), mul(v, 0.3));
      const sp = Math.hypot(v[0], v[2]);
      if (cup.c[1] < 5) cup.sum += Math.hypot(cup.c[0] - prev[0], cup.c[2] - prev[2]);
      cup.I += (clamp(sp / 11, 0, 1) - cup.I) * Math.min(1, dt * 10);
      /* 動いている向きへ少しかたむく */
      const hv = [cup.vel[0], 0, cup.vel[2]], hs = len(hv);
      cup.q = hs > 0.3 ? qaxis(cross([0, 1, 0], norm(hv)), Math.min(0.28, hs * 0.018)) : qslerp(cup.q, [0, 0, 0, 1], Math.min(1, dt * 8));
      cup.rattle -= dt;
      if (cup.I > 0.08 && cup.rattle <= 0 && S.bodies.some((b) => b.mode === 'cup')) { cup.rattle = 0.03 + (1 - cup.I) * 0.11 + rnd(0, 0.03); emit('rattle', cup.I); }
      if (cup.want && !cup.auto && !S.bodies.some((b) => b.anim && b.anim.toCup)) startPour(pourDir());
    } else if (cup.mode === 'pour') {
      const P = cup.pour; P.t += dt;
      const k = clamp(P.t / POUR.dur, 0, 1);
      /* はじめはゆっくり・まん中で速く・おわりはゆっくり */
      P.th = POUR.max * (k * k * (3 - 2 * k));
      cup.q = qmul(qaxis(P.axis, P.th), P.q0);
      cup.c = add(cup.c, mul([P.vel[0], 0, P.vel[2]], dt * 0.1 * (1 - k)));
      cup.I = Math.max(0, cup.I - dt * 3);
      /* こぼす：先に出たサイコロが口から離れるまで待つ（重なって出ない） */
      const clear = (b) => S.bodies.every((o) => o.mode !== 'dyn' || len2(sub(o.p, b.p)) > 1.15 * 1.15);
      S.bodies.forEach((b) => { if (b.mode === 'cup' && P.th >= b.relA && clear(b)) releaseOne(b); });
      if (k >= 1) {
        P.hold += dt;
        const clear = (b) => S.bodies.every((o) => o.mode !== 'dyn' || len2(sub(o.p, b.p)) > 1.15 * 1.15);
        S.bodies.forEach((b) => { if (b.mode === 'cup' && clear(b)) releaseOne(b); });
        if (P.hold > POUR.hold + 0.45 || (P.hold > POUR.hold && !S.bodies.some((b) => b.mode === 'cup'))) {
          S.bodies.forEach((b) => { if (b.mode === 'cup') releaseOne(b); });
          cup.mode = 'leave'; cup.anim = { t: 0, dur: POUR.leave, c0: cup.c.slice(), q0: cup.q.slice(), dir: P.dir };
        }
      }
    } else if (cup.mode === 'leave') {
      const A = cup.anim; A.t += dt;
      const k = clamp(A.t / A.dur, 0, 1), e = ease(k), d = A.dir || [0, 0, -1];
      /* 起き上がりながら、少し手前へ引いて、上へ去る */
      cup.c = [A.c0[0] - d[0] * 0.8 * e, A.c0[1] + e * e * 10, A.c0[2] - d[2] * 0.8 * e];
      cup.q = qslerp(A.q0, [0, 0, 0, 1], ease(Math.min(1, k * 1.5)));
      if (k >= 1) { cup.mode = 'off'; cup.anim = null; }
    } else if (cup.mode === 'come') {
      const A = cup.anim; A.t += dt;
      const k = clamp(A.t / A.dur, 0, 1), e = 1 - Math.pow(1 - k, 3);
      cup.c = [A.c0[0] + (A.c1[0] - A.c0[0]) * e, A.c0[1] + (A.c1[1] - A.c0[1]) * e, A.c0[2] + (A.c1[2] - A.c0[2]) * e];
      cup.q = qslerp(A.q0, [0, 0, 0, 1], e);
      if (k >= 1) { cup.mode = 'idle'; cup.anim = null; emit('cupDown'); }
    } else if (cup.mode === 'idle') {
      cup.I = 0; cup.q = [0, 0, 0, 1];
    }
  }
  /* 「ふる」ボタン・CPU：カップを手前のまん中へ → 少しふる → 奥へ落とす */
  let autoP = null;
  function autoThrow(o) {
    o = o || {};
    if (S.mode === '2d') return S.throwing ? Promise.resolve(null) : flat2dThrow();
    if (S.throwing || cup.mode === 'pour' || (cup.mode === 'hold' && cup.ptr)) return Promise.resolve(null);
    if (!freeDice().length) return Promise.resolve(values());
    return new Promise((res) => {
      autoP = res;
      const hm = cupHome();
      const x = cup.mode === 'idle' ? cup.c[0] : rnd(-S.tw * 0.12, S.tw * 0.12), z = cup.mode === 'idle' ? cup.c[2] : hm[2] - rnd(0, 0.6);
      if (!cupGrab(x, z)) { autoP = null; res(values()); return; }
      const ang = rnd(-0.55, 0.55);
      autoShake(o.shake || rnd(0.55, 0.8), norm([Math.sin(ang), 0, -Math.cos(ang)]));
    });
  }
  function settleCheck(dt) {
    if (!S.throwing) return;
    S.throwT += dt;
    /* まだカップの中に残っている（こぼしている途中）なら待つ */
    if (cup.mode === 'pour' || S.bodies.some((b) => b.mode === 'cup')) { S.settleWait = 0; return; }
    const th = S.bodies.filter((b) => b.thrown && b.mode === 'dyn');
    /* ほとんど動いていない（小さくふるえているだけ）のも「止まった」とみなす（ほかのサイコロの上でふるえ続けて待たされるのを防ぐ） */
    const slow = (b) => b.asleep || (len2(b.v) < 0.16 && len2(b.w) < 0.36);
    const moving = th.filter((b) => !slow(b));
    if (moving.length && S.throwT < 7) { S.settleWait = 0; return; }
    S.settleWait += dt;
    if (S.settleWait < 0.15 && S.throwT < 7) return;
    S.settleWait = 0;
    let pending = false;
    th.forEach((b) => {
      const u = upFace(b), high = b.p[1] > H + 0.06, tilt = u.dot < 0.988;
      if (!high && !tilt) { b.asleep = true; b.st = 0; b.v = [0, 0, 0]; b.w = [0, 0, 0]; return; }
      if (b.nudges < 3 && S.throwT < 7) { nudge(b); pending = true; }
      else snapFlat(b);
    });
    if (pending) return;
    if (S.bodies.some((b) => b.mode === 'anim')) return;
    /* 全部止まった */
    S.throwing = false;
    S.bodies.forEach((b) => { if (b.mode === 'dyn') { b.mode = 'rest'; b.thrown = false; b.v = [0, 0, 0]; b.w = [0, 0, 0]; } });
    const vals = values();
    emit('settled', vals);
    if (autoP) { const f = autoP; autoP = null; f(vals); }
  }
  function nudge(b) {
    b.nudges++; wake(b);
    let away = null, best = 9;
    S.bodies.forEach((o) => { if (o === b || o.kept) return; const d = Math.hypot(o.p[0] - b.p[0], o.p[2] - b.p[2]); if (d < best) { best = d; away = [b.p[0] - o.p[0], 0, b.p[2] - o.p[2]]; } });
    if (!away || best > 1.6) {
      /* 壁にもたれている → まん中へ */
      away = [-b.p[0] + rnd(-0.5, 0.5), 0, -b.p[2] + rnd(-0.5, 0.5)];
    }
    const d = norm(away);
    b.v = [d[0] * rnd(2.2, 3.2), rnd(2.4, 3.4), d[2] * rnd(2.2, 3.2)];
    b.w = mul(norm([rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)]), rnd(4, 8));
  }
  /* どうしても平らにならない → 近くの空いている場所へ平らに置く */
  function freeSpot(x, z, skip) {
    const others = S.bodies.filter((o) => o !== skip && !o.kept && o.mode !== 'cup' && !(o.anim && o.anim.toCup));
    const ok = (px, pz) => others.every((o) => { const tp = o.anim && o.anim.p1 ? o.anim.p1 : o.p; return Math.hypot(tp[0] - px, tp[2] - pz) > 1.38; });
    let [px, pz] = inTray(x, z);
    if (ok(px, pz)) return [px, pz];
    for (let r = 0.5; r < 9; r += 0.45) for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
      const [qx, qz] = inTray(x + Math.cos(a) * r, z + Math.sin(a) * r);
      if (ok(qx, qz)) return [qx, qz];
    }
    return [px, pz];
  }
  function snapFlat(b) {
    const u = upFace(b), [x, z] = freeSpot(b.p[0], b.p[2], b);
    const q1 = qmul(qfromTo(u.n, [0, 1, 0]), b.q);
    animTo(b, [x, H, z], q1, 0.32, 0.6, 'rest');
    b.thrown = true;
  }

  /* ── 決まった場所へ動かす（キープ・カップへ・並べる） ── */
  function animTo(b, p1, q1, dur, arc, then) {
    b.anim = { p0: b.p.slice(), q0: b.q.slice(), p1, q1, t: 0, dur: dur || 0.35, arc: arc == null ? 0.8 : arc, then: then || 'rest' };
    b.mode = 'anim'; b.asleep = false; b.v = [0, 0, 0]; b.w = [0, 0, 0];
    kick();
  }
  const busyAnim = () => S.bodies.some((b) => b.mode === 'anim');
  function stepAnim(dt) {
    S.bodies.forEach((b) => {
      if (b.mode === 'anim' && b.anim) {
        const a = b.anim; a.t += dt;
        if (a.t < 0) return;
        const k = clamp(a.t / a.dur, 0, 1), e = ease(k);
        let p1 = a.p1, q1 = a.q1;
        if (a.toCup) {
          /* カップは動いているので、行き先は毎回カップの中から計算する */
          const sl = CUP_SLOTS[b.cs % 5]; p1 = cupW(sl); q1 = qmul(cup.q, b.cq);
        }
        b.p = [a.p0[0] + (p1[0] - a.p0[0]) * e, a.p0[1] + (p1[1] - a.p0[1]) * e + Math.sin(Math.PI * k) * a.arc, a.p0[2] + (p1[2] - a.p0[2]) * e];
        b.q = qslerp(a.q0, q1, e);
        if (k >= 1) { b.mode = a.then; b.anim = null; if (b.mode === 'cup') { emit('inCup'); placeInCup(b, cup.I, 0); } else { b.p = p1.slice(); b.q = q1.slice(); } }
      } else if (b.mode === 'cup') placeInCup(b, cup.mode === 'hold' ? cup.I : 0, dt);
    });
  }

  /* ══ キープ ══ */
  function setKeep(i, on2, quiet) {
    const b = S.bodies[i]; if (!b || !!b.kept === !!on2) return;
    if (b.mode === 'cup' || (b.anim && b.anim.toCup) || (b.mode === 'dyn' && !b.asleep)) return;
    const v = upFace(b).v;
    if (on2) {
      const used = S.bodies.filter((o) => o.kept).map((o) => o.slot);
      let k = 0; while (used.indexOf(k) >= 0) k++;
      b.kept = true; b.slot = k; b.tray = { p: b.p.slice(), q: b.q.slice() };
      animTo(b, slotPos(k), qUp(v, 0), 0.3, 0.9, 'keep');
    } else {
      b.kept = false; b.slot = -1;
      const back = b.tray && b.tray.p ? b.tray : null;
      const [x, z] = freeSpot(back ? back.p[0] : rnd(-2, 2), back ? back.p[2] : rnd(-1, 1.5), b);
      animTo(b, [x, H, z], back ? qmul(qfromTo(upFace({ q: back.q }).n, [0, 1, 0]), back.q) : qUp(v, rnd(-0.6, 0.6)), 0.3, 0.9, 'rest');
    }
    if (!quiet) emit('keep', i, !!on2);
  }

  /* ══ 新しい番・つづき ══ */
  function cupToHome(instant) {
    const hm = cupHome();
    cup.auto = null; cup.want = false; cup.pour = null; cup.ptr = null;
    if (instant) { cup.mode = 'idle'; cup.c = hm; cup.q = [0, 0, 0, 1]; return; }
    const c0 = cup.mode === 'off' || cup.mode === 'leave' ? [hm[0], 10, hm[2] - 1] : cup.c.slice();
    cup.anim = { t: 0, dur: 0.42, c0, c1: hm, q0: cup.q.slice() };
    cup.mode = 'come';
  }
  function newTurn() {
    S.throwing = false;
    S.bodies.forEach((b) => { b.kept = false; b.slot = -1; b.thrown = false; b.nudges = 0; if (b.mode === 'dyn') { b.mode = 'rest'; b.v = [0, 0, 0]; b.w = [0, 0, 0]; } });
    cupToHome(false);
    scoop(false);
    S.hl = [0, 0, 0, 0, 0]; S.hlOn = false;
    kick();
  }
  /* 保存から：値・キープ・ふったかどうか（ふる前ならカップの中） */
  function restore(vals, keep, rolled) {
    S.throwing = false;
    const spots = [[-2.6, 0.4], [-0.9, -0.9], [0.8, 0.6], [2.5, -0.5], [0.1, 1.9], [-2.1, 2.0], [2.2, 1.8]];
    let s = 0;
    S.bodies.forEach((b) => { b.cs = -1; b.anim = null; });
    if (!rolled) cupToHome(true); else { cup.mode = 'off'; cup.c = [0, 14, 0]; }
    S.bodies.forEach((b, k) => {
      const v = (vals && vals[k]) || 1 + ((Math.random() * 6) | 0);
      b.v = [0, 0, 0]; b.w = [0, 0, 0]; b.asleep = false; b.thrown = false;
      if (keep && keep[k]) {
        const used = S.bodies.filter((o, j) => j < k && o.kept).length;
        b.kept = true; b.slot = used; b.mode = 'keep'; b.p = slotPos(used); b.q = qUp(v, 0); b.tray = null;
      } else {
        b.kept = false; b.slot = -1; b.mode = 'rest';
        if (rolled) { const sp = spots[s++ % spots.length]; const [x, z] = inTray(sp[0] * S.tw / 12, sp[1] * S.td / 7.4); b.p = [x, H, z]; b.q = qUp(v, rnd(-0.6, 0.6)); }
      }
      b.R = qmat(b.q);
    });
    if (!rolled) scoop(true);
    kick();
    if (S.mode === '2d') { S.bodies.forEach((b, i) => { if (vals && vals[i]) b.val2 = vals[i]; }); flat2dPaint(); }
  }

  /* ══════════════════════════════════════════════════════════════
     WebGL
     ══════════════════════════════════════════════════════════════ */
  const VS_DIE = 'attribute vec3 aP;attribute vec3 aN;attribute vec2 aT;uniform mat4 uVP;uniform mat4 uM;uniform mat3 uR;varying vec3 vN;varying vec3 vW;varying vec2 vT;void main(){vec4 w=uM*vec4(aP,1.0);vW=w.xyz;vN=uR*aN;vT=aT;gl_Position=uVP*w;}';
  const FS_DIE = 'precision mediump float;uniform sampler2D uTex;uniform vec3 uL;uniform vec3 uE;uniform vec3 uG;uniform float uGk;uniform float uSp;varying vec3 vN;varying vec3 vW;varying vec2 vT;' +
    'void main(){vec3 b=texture2D(uTex,vT).rgb;vec3 N=normalize(vN);vec3 L=normalize(uL);vec3 V=normalize(uE-vW);float d=max(dot(N,L),0.0);' +
    'vec3 hemi=mix(vec3(0.36,0.38,0.55),vec3(1.0,1.0,1.06),N.y*0.5+0.5);vec3 Hh=normalize(L+V);float s=pow(max(dot(N,Hh),0.0),70.0);float fr=pow(1.0-max(dot(N,V),0.0),3.0);' +
    'vec3 c=b*(hemi*0.6+d*0.56)+vec3(s*0.6*uSp)+vec3(0.55,0.72,1.0)*fr*0.2*uSp;c+=uG*uGk*(0.28+fr*1.4);gl_FragColor=vec4(c,1.0);}';
  const VS_COL = 'attribute vec3 aP;attribute vec3 aN;attribute vec3 aC;uniform mat4 uVP;varying vec3 vN;varying vec3 vC;varying vec3 vW;void main(){vN=aN;vC=aC;vW=aP;gl_Position=uVP*vec4(aP,1.0);}';
  const FS_COL = 'precision mediump float;uniform vec3 uL;uniform vec3 uE;varying vec3 vN;varying vec3 vC;varying vec3 vW;void main(){vec3 N=normalize(vN);vec3 L=normalize(uL);float d=max(dot(N,L),0.0);vec3 V=normalize(uE-vW);float s=pow(max(dot(N,normalize(L+V)),0.0),40.0);' +
    'vec3 c=vC*(0.5+0.62*d)+vec3(s*0.35)*vC.r;gl_FragColor=vec4(c,1.0);}';
  const VS_TEX = 'attribute vec3 aP;attribute vec2 aT;uniform mat4 uVP;uniform mat4 uM;varying vec2 vT;void main(){vT=aT;gl_Position=uVP*uM*vec4(aP,1.0);}';
  const FS_TEX = 'precision mediump float;uniform sampler2D uTex;uniform float uA;uniform float uDark;varying vec2 vT;void main(){vec4 t=texture2D(uTex,vT);gl_FragColor=uDark>0.5?vec4(0.0,0.0,0.0,t.a*uA):vec4(t.rgb*uA,uA);}';

  let G = null;   /* WebGL の部品 */
  function glInit() {
    const gl = S.cv.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: false }) || S.cv.getContext('experimental-webgl');
    if (!gl) return false;
    S.gl = gl;
    const prog = (vs, fs) => {
      const p = gl.createProgram();
      [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]].forEach(([t, src]) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); gl.attachShader(p, s); });
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      const u = {}, a = {};
      const nu = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); for (let i = 0; i < nu; i++) { const inf = gl.getActiveUniform(p, i); u[inf.name] = gl.getUniformLocation(p, inf.name); }
      const na = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES); for (let i = 0; i < na; i++) { const inf = gl.getActiveAttrib(p, i); a[inf.name] = gl.getAttribLocation(p, inf.name); }
      return { p, u, a };
    };
    try {
      G = { die: prog(VS_DIE, FS_DIE), col: prog(VS_COL, FS_COL), tex: prog(VS_TEX, FS_TEX) };
    } catch (e) { G = null; return false; }
    G.dieMesh = dieMesh();
    G.dieTex = texFrom(faceAtlas(), true);
    G.cupMesh = cupMesh();
    G.cupTex = texFrom(cupCanvas(), true);
    G.blob = texFrom(blobCanvas(), true);
    G.quad = buf(new Float32Array([-0.5, 0, -0.5, 0, 0, 0.5, 0, -0.5, 1, 0, 0.5, 0, 0.5, 1, 1, -0.5, 0, 0.5, 0, 1]), new Uint16Array([0, 2, 1, 0, 3, 2]));
    gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
    return true;
  }
  function buf(vdata, idata) {
    const gl = S.gl, vb = gl.createBuffer(), ib = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, vdata, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idata, gl.STATIC_DRAW);
    return { vb, ib, n: idata.length };
  }
  function texFrom(cv, mip) {
    const gl = S.gl, t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
    const pot = (n) => (n & (n - 1)) === 0;
    if (mip && pot(cv.width) && pot(cv.height)) { gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); }
    else gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  /* 面の向きの合った三角形（外から見て左回り）を足す */
  function tri(V, I, stride, a, b, c, n) {
    const pa = [V[a * stride], V[a * stride + 1], V[a * stride + 2]], pb = [V[b * stride], V[b * stride + 1], V[b * stride + 2]], pc = [V[c * stride], V[c * stride + 1], V[c * stride + 2]];
    if (dot(cross(sub(pb, pa), sub(pc, pa)), n) >= 0) I.push(a, b, c); else I.push(a, c, b);
  }
  /* 角の丸いサイコロ（面ごとに格子 → 内側の箱から ROUND だけ外へ） */
  function dieMesh() {
    const flat = H - ROUND, R = 4, co = [];
    for (let k = R; k >= 1; k--) co.push(-(flat + ROUND * Math.tan(k * Math.PI / 4 / R)));
    co.push(-flat, 0, flat);
    for (let k = 1; k <= R; k++) co.push(flat + ROUND * Math.tan(k * Math.PI / 4 / R));
    const N = co.length, V = [], I = [];
    const AX = [
      { n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1] }, { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
      { n: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0] }, { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
      { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] }, { n: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0] }
    ];
    AX.forEach((f) => {
      const val = FACES.find((x) => x.n[0] === f.n[0] && x.n[1] === f.n[1] && x.n[2] === f.n[2]).v;
      const col = (val - 1) % 4, row = Math.floor((val - 1) / 4);
      const base = V.length / 8;
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const p = add(add(mul(f.n, H), mul(f.u, co[i])), mul(f.v, co[j]));
        const inner = [clamp(p[0], -flat, flat), clamp(p[1], -flat, flat), clamp(p[2], -flat, flat)];
        const nr = norm(sub(p, inner)), pos = add(inner, mul(nr, ROUND));
        const uu = (co[i] + H) / (2 * H), vv = 1 - (co[j] + H) / (2 * H);
        V.push(pos[0], pos[1], pos[2], nr[0], nr[1], nr[2], (col + 0.02 + uu * 0.96) / 4, (row + 0.02 + vv * 0.96) / 2);
      }
      for (let j = 0; j < N - 1; j++) for (let i = 0; i < N - 1; i++) {
        const a = base + j * N + i, b = a + 1, c = a + N + 1, d = a + N;
        tri(V, I, 8, a, b, c, f.n); tri(V, I, 8, a, c, d, f.n);
      }
    });
    return buf(new Float32Array(V), new Uint16Array(I));
  }
  /* カップ（外の壁・内の壁・口のふち・内の底・外の底）。u＝0〜0.7 外の皮／0.72〜0.84 内の布／0.86〜0.98 金のふち */
  function cupMesh() {
    const SEG = 48, ROWS = 5, V = [], I = [];
    const C = CUP, ri0 = C.r0 - C.t, ri1 = C.r1 - C.t, sl = (C.r0 - C.r1) / C.h;
    const push = (p, n, u, v) => { V.push(p[0], p[1], p[2], n[0], n[1], n[2], u, v); return V.length / 8 - 1; };
    /* 外の壁 */
    let base = V.length / 8;
    for (let j = 0; j <= ROWS; j++) for (let i = 0; i <= SEG; i++) {
      const a = (i / SEG) * Math.PI * 2, y = C.h * j / ROWS, r = C.r0 + (C.r1 - C.r0) * j / ROWS;
      push([Math.cos(a) * r, y, Math.sin(a) * r], norm([Math.cos(a), sl, Math.sin(a)]), 0.004 + 0.692 * i / SEG, 1 - y / C.h);
    }
    for (let j = 0; j < ROWS; j++) for (let i = 0; i < SEG; i++) {
      const a = base + j * (SEG + 1) + i, b = a + 1, c = a + SEG + 2, d = a + SEG + 1, am = (i + 0.5) / SEG * Math.PI * 2, n = [Math.cos(am), 0, Math.sin(am)];
      tri(V, I, 8, a, b, c, n); tri(V, I, 8, a, c, d, n);
    }
    /* 内の壁（内向き） */
    base = V.length / 8;
    for (let j = 0; j <= ROWS; j++) for (let i = 0; i <= SEG; i++) {
      const a = (i / SEG) * Math.PI * 2, y = C.b + (C.h - C.b) * j / ROWS, r = ri0 + (ri1 - ri0) * (y / C.h);
      push([Math.cos(a) * r, y, Math.sin(a) * r], norm([-Math.cos(a), -sl, -Math.sin(a)]), 0.73 + 0.1 * i / SEG, 0.15 + 0.7 * (1 - y / C.h));
    }
    for (let j = 0; j < ROWS; j++) for (let i = 0; i < SEG; i++) {
      const a = base + j * (SEG + 1) + i, b = a + 1, c = a + SEG + 2, d = a + SEG + 1, am = (i + 0.5) / SEG * Math.PI * 2, n = [-Math.cos(am), 0, -Math.sin(am)];
      tri(V, I, 8, a, b, c, n); tri(V, I, 8, a, c, d, n);
    }
    /* 口のふち（上向きの輪） */
    base = V.length / 8;
    for (let i = 0; i <= SEG; i++) {
      const a = (i / SEG) * Math.PI * 2;
      push([Math.cos(a) * ri1, C.h, Math.sin(a) * ri1], [0, 1, 0], 0.87 + 0.1 * i / SEG, 0.35);
      push([Math.cos(a) * C.r1, C.h, Math.sin(a) * C.r1], [0, 1, 0], 0.87 + 0.1 * i / SEG, 0.65);
    }
    for (let i = 0; i < SEG; i++) { const a = base + i * 2, b = a + 1, c = a + 3, d = a + 2; tri(V, I, 8, a, b, c, [0, 1, 0]); tri(V, I, 8, a, c, d, [0, 1, 0]); }
    /* 内の底・外の底 */
    [[C.b, ri0 + (ri1 - ri0) * (C.b / C.h), [0, 1, 0], 0.78], [0, C.r0, [0, -1, 0], 0.4]].forEach(([y, r, n, u]) => {
      const c0 = push([0, y, 0], n, u, 0.5);
      const b0 = V.length / 8;
      for (let i = 0; i <= SEG; i++) { const a = (i / SEG) * Math.PI * 2; push([Math.cos(a) * r, y, Math.sin(a) * r], n, u, 0.5); }
      for (let i = 0; i < SEG; i++) tri(V, I, 8, c0, b0 + i, b0 + i + 1, n);
    });
    return buf(new Float32Array(V), new Uint16Array(I));
  }
  /* 面の絵（4×2 のます・1枚 256px）。1の目は赤くて大きい */
  function faceAtlas() {
    const T = 256, cv = document.createElement('canvas'); cv.width = T * 4; cv.height = T * 2;
    const g = cv.getContext('2d');
    const PIPS = { 1: [[0.5, 0.5]], 2: [[0.28, 0.28], [0.72, 0.72]], 3: [[0.27, 0.27], [0.5, 0.5], [0.73, 0.73]], 4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
      5: [[0.27, 0.27], [0.73, 0.27], [0.5, 0.5], [0.27, 0.73], [0.73, 0.73]], 6: [[0.29, 0.25], [0.29, 0.5], [0.29, 0.75], [0.71, 0.25], [0.71, 0.5], [0.71, 0.75]] };
    for (let v = 1; v <= 6; v++) {
      const x0 = ((v - 1) % 4) * T, y0 = Math.floor((v - 1) / 4) * T;
      const bg = g.createRadialGradient(x0 + T * 0.4, y0 + T * 0.36, T * 0.05, x0 + T * 0.5, y0 + T * 0.5, T * 0.78);
      bg.addColorStop(0, '#ffffff'); bg.addColorStop(1, '#e4e8f3');
      g.fillStyle = bg; g.fillRect(x0, y0, T, T);
      const r = v === 1 ? T * 0.15 : T * 0.083;
      PIPS[v].forEach(([px, py]) => {
        const cx = x0 + px * T, cy = y0 + py * T;
        g.beginPath(); g.arc(cx + r * 0.08, cy + r * 0.1, r * 1.1, 0, Math.PI * 2); g.fillStyle = 'rgba(255,255,255,0.95)'; g.fill();
        g.beginPath(); g.arc(cx - r * 0.06, cy - r * 0.07, r * 1.06, 0, Math.PI * 2); g.fillStyle = 'rgba(70,80,110,0.28)'; g.fill();
        const pg = g.createRadialGradient(cx - r * 0.35, cy - r * 0.38, r * 0.1, cx, cy, r);
        if (v === 1) { pg.addColorStop(0, '#7d0b14'); pg.addColorStop(0.7, '#d4202c'); pg.addColorStop(1, '#ee4a52'); }
        else { pg.addColorStop(0, '#020309'); pg.addColorStop(0.7, '#141827'); pg.addColorStop(1, '#3a405a'); }
        g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fillStyle = pg; g.fill();
      });
    }
    return cv;
  }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function star(g, cx, cy, R, r, n) { g.beginPath(); for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, rr2 = i % 2 ? r : R; g.lineTo(cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2); } g.closePath(); }
  /* カップの皮（ロゴの帽子に合わせた紫がかった紺・金の帯・金の星） */
  function cupCanvas() {
    const W = 1024, Hh = 256, cv = document.createElement('canvas'); cv.width = W; cv.height = Hh;
    const g = cv.getContext('2d'), sw = W * 0.7;
    const bg = g.createLinearGradient(0, 0, 0, Hh);
    bg.addColorStop(0, '#3b35c4'); bg.addColorStop(0.45, '#2a2596'); bg.addColorStop(1, '#16125a');
    g.fillStyle = bg; g.fillRect(0, 0, sw, Hh);
    for (let i = 0; i < 2600; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,30,0.07)'; g.fillRect(Math.random() * sw, Math.random() * Hh, 2, 2); }
    const band = (y, h) => { const gd = g.createLinearGradient(0, y, 0, y + h); gd.addColorStop(0, '#fff0a6'); gd.addColorStop(0.5, '#f2c14e'); gd.addColorStop(1, '#b8801d'); g.fillStyle = gd; g.fillRect(0, y, sw, h); };
    band(Hh * 0.06, Hh * 0.075); band(Hh * 0.16, Hh * 0.025); band(Hh * 0.84, Hh * 0.025); band(Hh * 0.89, Hh * 0.07);
    /* 帽子の帯のような紫の線 */
    g.fillStyle = 'rgba(160,110,255,0.55)'; g.fillRect(0, Hh * 0.19, sw, Hh * 0.03);
    for (let k = 0; k < 6; k++) {
      const x = (k + 0.5) * sw / 6, y = Hh * (k % 2 ? 0.58 : 0.48);
      const gd = g.createRadialGradient(x, y - 6, 2, x, y, 30);
      gd.addColorStop(0, '#fff6c2'); gd.addColorStop(1, '#e8a92a');
      g.fillStyle = gd; star(g, x, y, 26, 11, 5); g.fill();
      g.fillStyle = 'rgba(255,240,180,0.7)'; star(g, x + 46, y - 34, 7, 2.6, 4); g.fill(); star(g, x - 40, y + 30, 5, 2, 4); g.fill();
    }
    /* 内の布 */
    const ig = g.createLinearGradient(0, 0, 0, Hh);
    ig.addColorStop(0, '#2a1f63'); ig.addColorStop(1, '#0e0a26');
    g.fillStyle = ig; g.fillRect(W * 0.71, 0, W * 0.14, Hh);
    for (let i = 0; i < 700; i++) { g.fillStyle = 'rgba(180,160,255,0.05)'; g.fillRect(W * 0.71 + Math.random() * W * 0.14, Math.random() * Hh, 2, 2); }
    /* 金のふち */
    const rg = g.createLinearGradient(0, 0, 0, Hh);
    rg.addColorStop(0, '#fff2b0'); rg.addColorStop(0.5, '#f4c650'); rg.addColorStop(1, '#c48a1e');
    g.fillStyle = rg; g.fillRect(W * 0.86, 0, W * 0.14, Hh);
    return cv;
  }
  function blobCanvas() {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const g = cv.getContext('2d');
    g.shadowColor = 'rgba(0,0,0,1)'; g.shadowBlur = 20; g.shadowOffsetX = 400;
    g.fillStyle = '#000';
    const s = 62, o = (128 - s) / 2 - 400, r = 14, y = (128 - s) / 2;
    g.beginPath(); g.moveTo(o + r, y); g.arcTo(o + s, y, o + s, y + s, r); g.arcTo(o + s, y + s, o, y + s, r); g.arcTo(o, y + s, o, y, r); g.arcTo(o, y, o + s, y, r); g.closePath(); g.fill();
    return cv;
  }
  /* フェルトの床（トレイ）と棚 */
  function feltCanvas(wu, du, shelf) {
    const PX = 72, cw = Math.min(2048, Math.round(wu * PX)), ch = Math.min(2048, Math.round(du * PX)), k = cw / wu;
    const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
    const g = cv.getContext('2d');
    const bg = g.createRadialGradient(cw / 2, ch * 0.45, 0, cw / 2, ch / 2, Math.max(cw, ch) * 0.72);
    if (shelf) { bg.addColorStop(0, '#16307e'); bg.addColorStop(1, '#0b1a52'); }
    else { bg.addColorStop(0, '#2364d6'); bg.addColorStop(0.65, '#164aa8'); bg.addColorStop(1, '#0d2f78'); }
    g.fillStyle = bg; g.fillRect(0, 0, cw, ch);
    const n = (cw * ch) / 26;
    for (let i = 0; i < n; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.045)' : 'rgba(0,8,40,0.08)'; g.fillRect(Math.random() * cw, Math.random() * ch, 1.6, 1.6); }
    if (shelf) {
      for (let s = 0; s < 5; s++) {
        const x = cw / 2 + (s - 2) * 1.34 * k, y = ch / 2, w = 1.12 * k;
        rr(g, x - w / 2, y - w / 2, w, w, 0.2 * k); g.strokeStyle = 'rgba(255,212,71,0.32)'; g.lineWidth = 0.045 * k; g.setLineDash([0.12 * k, 0.09 * k]); g.stroke(); g.setLineDash([]);
      }
      g.fillStyle = 'rgba(255,212,71,0.5)'; g.font = '900 ' + Math.round(0.3 * k) + 'px "M PLUS Rounded 1c", sans-serif'; g.textBaseline = 'middle';
      g.save(); g.translate(0.22 * k, ch / 2); g.rotate(-Math.PI / 2); g.textAlign = 'center'; g.fillText('KEEP', 0, 0.02 * k); g.restore();
      return cv;
    }
    rr(g, 0.32 * k, 0.32 * k, cw - 0.64 * k, ch - 0.64 * k, 0.4 * k); g.strokeStyle = 'rgba(255,212,71,0.55)'; g.lineWidth = 0.05 * k; g.stroke();
    rr(g, 0.48 * k, 0.48 * k, cw - 0.96 * k, ch - 0.96 * k, 0.3 * k); g.strokeStyle = 'rgba(255,212,71,0.22)'; g.lineWidth = 0.025 * k; g.stroke();
    g.save(); g.globalAlpha = 0.11; g.strokeStyle = '#ffe27a'; g.fillStyle = '#ffe27a'; g.lineWidth = 0.05 * k;
    g.beginPath(); g.arc(cw / 2, ch / 2, 1.75 * k, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(cw / 2, ch / 2, 1.55 * k, 0, Math.PI * 2); g.stroke();
    star(g, cw / 2, ch / 2, 1.3 * k, 0.55 * k, 5); g.fill();
    g.globalAlpha = 0.16; g.font = '800 ' + Math.round(0.42 * k) + 'px "Baloo 2", "M PLUS Rounded 1c", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('MAGI YACHT', cw / 2, ch / 2 + 2.25 * k);
    g.restore();
    g.fillStyle = 'rgba(255,226,122,0.35)';
    [[0.85, 0.85], [wu - 0.85, 0.85], [0.85, du - 0.85], [wu - 0.85, du - 0.85]].forEach(([x, y]) => { star(g, x * k, y * k, 0.16 * k, 0.07 * k, 5); g.fill(); });
    return cv;
  }
  /* トレイの床・棚・ふち（大きさが変わったら作り直す） */
  function buildBoard() {
    const gl = S.gl; if (!gl || !G) return;
    ['floorTex', 'shelfTex'].forEach((k) => { if (G[k]) gl.deleteTexture(G[k]); });
    G.floorTex = texFrom(feltCanvas(S.tw, S.td, false), false);
    G.shelfTex = texFrom(feltCanvas(S.tw, SHELF, true), false);
    const V = [], I = [];
    const box = (x0, x1, y0, y1, z0, z1, top, side) => {
      const P = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]];
      const F = [[[3, 2, 6, 7], [0, 1, 0], top], [[4, 5, 6, 7], [0, 0, 1], side], [[0, 1, 2, 3], [0, 0, -1], side], [[1, 5, 6, 2], [1, 0, 0], side], [[0, 3, 7, 4], [-1, 0, 0], side]];
      F.forEach(([ix, n, c]) => {
        const b = V.length / 9;
        ix.forEach((k) => V.push(P[k][0], P[k][1], P[k][2], n[0], n[1], n[2], c[0], c[1], c[2]));
        tri(V, I, 9, b, b + 1, b + 2, n); tri(V, I, 9, b, b + 2, b + 3, n);
      });
    };
    const gold = [0.98, 0.76, 0.27], gold2 = [0.85, 0.6, 0.16], navy = [0.07, 0.15, 0.42], navy2 = [0.05, 0.1, 0.3];
    const xL = -S.tw / 2, xR = S.tw / 2, zN = S.td / 2, zF = -S.td / 2, zS = zF - RIM - SHELF;
    box(xL - RIM, xL, 0, RIM_H, zS - RIM2, zN + RIM, gold, navy);
    box(xR, xR + RIM, 0, RIM_H, zS - RIM2, zN + RIM, gold, navy);
    box(xL, xR, 0, RIM_H, zN, zN + RIM, gold, navy);
    box(xL, xR, 0, RIM_H * 0.62, zF - RIM, zF, gold2, navy2);            /* 奥（棚との仕切り・少し低い） */
    box(xL, xR, 0, RIM_H * 0.8, zS - RIM2, zS, gold, navy);             /* 棚のいちばん奥 */
    G.rim = buf(new Float32Array(V), new Uint16Array(I));
  }

  /* カメラ：トレイ＋棚が画面に入るように */
  function camera() {
    const asp = S.cw / Math.max(1, S.ch), fov = 32 * Math.PI / 180, pitch = 62 * Math.PI / 180;
    const zMin = -(S.td / 2 + RIM + SHELF + RIM2), zMax = S.td / 2 + RIM, xMax = S.tw / 2 + RIM;
    const ctr = [0, 0, (zMin + zMax) / 2 + 0.25];
    const P = perspective(fov, asp, 0.5, 120);
    const corners = [];
    [-xMax, xMax].forEach((x) => [zMin, zMax].forEach((z) => [0, RIM_H].forEach((y) => corners.push([x, y, z]))));
    let dist = 18, VP = null, eye = null;
    for (let it = 0; it < 6; it++) {
      eye = [ctr[0], ctr[1] + Math.sin(pitch) * dist, ctr[2] + Math.cos(pitch) * dist];
      VP = m4mul(P, lookAt(eye, ctr, [0, 1, 0]));
      let m = 0;
      corners.forEach((c) => { const n = xf4(VP, c); m = Math.max(m, Math.abs(n[0]) / 0.94, Math.abs(n[1]) / 0.9); });
      dist *= m;
    }
    eye = [ctr[0], ctr[1] + Math.sin(pitch) * dist, ctr[2] + Math.cos(pitch) * dist];
    S.VP = m4mul(P, lookAt(eye, ctr, [0, 1, 0])); S.iVP = m4inv(S.VP); S.eye = eye;
  }
  /* 前の部品の頂点の読み方を消す（プログラムを替えるたび） */
  function attrsOff() { const gl = S.gl; for (let i = 0; i < 6; i++) gl.disableVertexAttribArray(i); }
  function bindQuad(T) {
    const gl = S.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, G.quad.vb); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, G.quad.ib);
    gl.enableVertexAttribArray(T.a.aP); gl.vertexAttribPointer(T.a.aP, 3, gl.FLOAT, false, 20, 0);
    gl.enableVertexAttribArray(T.a.aT); gl.vertexAttribPointer(T.a.aT, 2, gl.FLOAT, false, 20, 12);
  }
  function blobAt(T, x, z, yaw, sc, a) {
    const gl = S.gl, c = Math.cos(yaw), s = Math.sin(yaw);
    gl.uniform1f(T.u.uA, a);
    gl.uniformMatrix4fv(T.u.uM, false, [c * sc, 0, -s * sc, 0, 0, 1, 0, 0, s * sc, 0, c * sc, 0, x, 0.004, z, 1]);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  }
  function drawMesh(D, mesh, R, t, gk, gc, sp) {
    const gl = S.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vb); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.ib);
    gl.enableVertexAttribArray(D.a.aP); gl.vertexAttribPointer(D.a.aP, 3, gl.FLOAT, false, 32, 0);
    gl.enableVertexAttribArray(D.a.aN); gl.vertexAttribPointer(D.a.aN, 3, gl.FLOAT, false, 32, 12);
    gl.enableVertexAttribArray(D.a.aT); gl.vertexAttribPointer(D.a.aT, 2, gl.FLOAT, false, 32, 24);
    gl.uniformMatrix4fv(D.u.uM, false, [R[0], R[3], R[6], 0, R[1], R[4], R[7], 0, R[2], R[5], R[8], 0, t[0], t[1], t[2], 1]);
    gl.uniformMatrix3fv(D.u.uR, false, [R[0], R[3], R[6], R[1], R[4], R[7], R[2], R[5], R[8]]);
    gl.uniform3fv(D.u.uG, gc || [1, 0.82, 0.25]); gl.uniform1f(D.u.uGk, gk || 0); gl.uniform1f(D.u.uSp, sp == null ? 1 : sp);
    gl.drawElements(gl.TRIANGLES, mesh.n, gl.UNSIGNED_SHORT, 0);
  }
  function draw() {
    const gl = S.gl; if (!gl || !G) return;
    attrsOff();
    gl.viewport(0, 0, S.cv.width, S.cv.height);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const L = norm([-0.42, 1, 0.5]);
    /* トレイの下の影 */
    const T = G.tex;
    gl.useProgram(T.p);
    gl.uniformMatrix4fv(T.u.uVP, false, S.VP);
    gl.uniform1i(T.u.uTex, 0); gl.activeTexture(gl.TEXTURE0);
    bindQuad(T);
    const zMin = -(S.td / 2 + RIM + SHELF + RIM2), zMax = S.td / 2 + RIM;
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
    gl.bindTexture(gl.TEXTURE_2D, G.blob);
    gl.uniform1f(T.u.uDark, 1); gl.uniform1f(T.u.uA, 0.55);
    gl.uniformMatrix4fv(T.u.uM, false, [(S.tw + 2 * RIM) * 1.9, 0, 0, 0, 0, 1, 0, 0, 0, 0, (zMax - zMin) * 1.9, 0, 0.35, -0.02, (zMin + zMax) / 2 + 0.45, 1]);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    gl.depthMask(true); gl.disable(gl.BLEND);
    /* 床と棚 */
    gl.uniform1f(T.u.uDark, 0); gl.uniform1f(T.u.uA, 1);
    gl.bindTexture(gl.TEXTURE_2D, G.floorTex);
    gl.uniformMatrix4fv(T.u.uM, false, [S.tw, 0, 0, 0, 0, 1, 0, 0, 0, 0, S.td, 0, 0, 0, 0, 1]);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    gl.bindTexture(gl.TEXTURE_2D, G.shelfTex);
    gl.uniformMatrix4fv(T.u.uM, false, [S.tw, 0, 0, 0, 0, 1, 0, 0, 0, 0, SHELF, 0, 0, 0, -(S.td / 2 + RIM + SHELF / 2), 1]);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    /* ふち */
    const C = G.col;
    attrsOff();
    gl.useProgram(C.p);
    gl.uniformMatrix4fv(C.u.uVP, false, S.VP); gl.uniform3fv(C.u.uL, L); gl.uniform3fv(C.u.uE, S.eye);
    gl.bindBuffer(gl.ARRAY_BUFFER, G.rim.vb); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, G.rim.ib);
    gl.enableVertexAttribArray(C.a.aP); gl.vertexAttribPointer(C.a.aP, 3, gl.FLOAT, false, 36, 0);
    gl.enableVertexAttribArray(C.a.aN); gl.vertexAttribPointer(C.a.aN, 3, gl.FLOAT, false, 36, 12);
    gl.enableVertexAttribArray(C.a.aC); gl.vertexAttribPointer(C.a.aC, 3, gl.FLOAT, false, 36, 24);
    gl.drawElements(gl.TRIANGLES, G.rim.n, gl.UNSIGNED_SHORT, 0);
    attrsOff();
    /* 影（サイコロ・カップ） */
    gl.useProgram(T.p); bindQuad(T);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
    gl.bindTexture(gl.TEXTURE_2D, G.blob); gl.uniform1f(T.u.uDark, 1);
    S.bodies.forEach((b) => {
      if (b.mode === 'cup') return;
      const R = qmat(b.q), hgt = Math.max(0, b.p[1] - H);
      blobAt(T, b.p[0] + 0.12 + hgt * 0.35, b.p[2] - 0.08 - hgt * 0.3, Math.atan2(R[2], R[0]), 1.55 + hgt * 0.28, clamp(0.62 - hgt * 0.1, 0.12, 0.62));
    });
    if (cup.mode !== 'off') {
      const baseY = Math.max(0, cup.c[1] - CUP.piv);
      if (baseY < 8) blobAt(T, cup.c[0] + 0.15 + baseY * 0.3, cup.c[2] - 0.1 - baseY * 0.25, 0, 4.1 + baseY * 0.35, clamp(0.55 - baseY * 0.07, 0.1, 0.55));
    }
    gl.depthMask(true); gl.disable(gl.BLEND);
    /* サイコロ */
    const D = G.die;
    attrsOff();
    gl.useProgram(D.p);
    gl.uniformMatrix4fv(D.u.uVP, false, S.VP); gl.uniform3fv(D.u.uL, L); gl.uniform3fv(D.u.uE, S.eye);
    gl.uniform1i(D.u.uTex, 0); gl.bindTexture(gl.TEXTURE_2D, G.dieTex);
    const pulse = 0.55 + 0.45 * Math.sin(S.t * 5.5);
    S.bodies.forEach((b, i) => {
      let gk = 0, gc = [1, 0.82, 0.25];
      if (S.hlOn && S.hl[i]) gk = 0.55 + pulse * 0.5;
      else if (b.kept) { gk = 0.32; gc = [1, 0.85, 0.35]; }
      drawMesh(D, G.dieMesh, qmat(b.q), b.p, gk, gc, 1);
    });
    /* カップ */
    if (cup.mode !== 'off') {
      gl.bindTexture(gl.TEXTURE_2D, G.cupTex);
      const R = qmat(cup.q), t = sub(cup.c, mv(R, [0, CUP.piv, 0]));
      const gk = S.hint && (cup.mode === 'idle') ? 0.1 + pulse * 0.18 : 0;
      drawMesh(D, G.cupMesh, R, t, gk, [0.75, 0.9, 1], 0.55);
    }
    attrsOff();
  }

  /* ══ 画面の大きさ ══ */
  function layout() {
    if (!S.ok) return;
    const r = S.wrap.getBoundingClientRect();
    const cw = Math.max(1, r.width), ch = Math.max(1, r.height);
    S.cw = cw; S.ch = ch;
    if (S.mode === '2d') { flat2dPaint(); return; }
    S.dpr = Math.min(2, root.devicePixelRatio || 1);
    S.cv.width = Math.round(cw * S.dpr); S.cv.height = Math.round(ch * S.dpr);
    const [tw, td] = trayFor(cw / ch);
    if (tw !== S.tw || td !== S.td || !G.floorTex) {
      const ox = S.tw, oz = S.td;
      S.tw = tw; S.td = td; PL = planes();
      buildBoard();
      S.bodies.forEach((b) => {
        if (b.kept) { b.p = slotPos(b.slot); return; }
        if (b.mode === 'cup' || (b.anim && b.anim.toCup)) return;
        const [x, z] = inTray(b.p[0] * tw / ox, b.p[2] * td / oz); b.p = [x, b.p[1], z];
      });
      if (cup.mode === 'idle') cup.c = cupHome();
    }
    camera();
    kick();
  }

  /* ══ さわる ══ */
  function ray(cx, cy) {
    const r = S.cv.getBoundingClientRect();
    const nx = ((cx - r.left) / r.width) * 2 - 1, ny = 1 - ((cy - r.top) / r.height) * 2;
    const a = xf4(S.iVP, [nx, ny, -1]), b = xf4(S.iVP, [nx, ny, 1]);
    return { o: a, d: norm(sub(b, a)) };
  }
  function pickDie(rr2) {
    let best = null, bt = 1e9;
    S.bodies.forEach((b) => {
      if (b.mode !== 'rest' && b.mode !== 'keep') return;
      const R = qmat(b.q), o = mtv(R, sub(rr2.o, b.p)), d = mtv(R, rr2.d);
      let t0 = -1e9, t1 = 1e9;
      for (let k = 0; k < 3; k++) {
        const e = H * 1.18;
        if (Math.abs(d[k]) < 1e-8) { if (o[k] < -e || o[k] > e) return; continue; }
        let a = (-e - o[k]) / d[k], c = (e - o[k]) / d[k]; if (a > c) { const t = a; a = c; c = t; }
        t0 = Math.max(t0, a); t1 = Math.min(t1, c); if (t0 > t1) return;
      }
      if (t0 < bt) { bt = t0; best = b; }
    });
    return best;
  }
  /* カップに当たったか（たての円柱として見る） */
  function hitCup(rr2) {
    if (cup.mode !== 'idle' && cup.mode !== 'hold' && cup.mode !== 'come') return false;
    const base = cup.c[1] - CUP.piv;
    for (let k = 0; k <= 16; k++) {
      const y = base + (CUP.h * k) / 16, t = (y - rr2.o[1]) / (rr2.d[1] || -1e-6), p = add(rr2.o, mul(rr2.d, t));
      if (Math.hypot(p[0] - cup.c[0], p[2] - cup.c[2]) < CUP.r1 + 0.25) return true;
    }
    return false;
  }
  function onPlane(rr2, y) { const t = (y - rr2.o[1]) / (rr2.d[1] || -1e-6); return add(rr2.o, mul(rr2.d, t)); }
  function hoverAt(cx, cy) { const p = onPlane(ray(cx, cy), CUP.hover + CUP.piv); return [p[0], p[2]]; }
  function pDown(e) {
    /* ★ 指をはなした合図が届かずに残った記録は捨てる（残ると、そのあと何を押しても受けつけなくなる） */
    if (S.ptr && (S.ptr.id === e.pointerId || performance.now() - S.ptr.t > 1500)) S.ptr = null;
    if (S.ptr || cup.ptr || !S.ok) return;
    if (e.button != null && e.button > 0) return;
    const rr2 = ray(e.clientX, e.clientY);
    if (S.allow.throw && !S.throwing && hitCup(rr2)) { grabAt(e); e.preventDefault(); return; }
    if (S.throwing || busyAnim() || cup.mode === 'pour') return;
    const die = pickDie(rr2);
    S.ptr = { id: e.pointerId, x: e.clientX, y: e.clientY, die, moved: false, t: performance.now() };
    try { S.cv.setPointerCapture(e.pointerId); } catch (err) { /* 古い端末 */ }
    e.preventDefault();
  }
  function pMove(e) {
    const P = S.ptr; if (!P || P.id !== e.pointerId) return;
    if (!P.moved && Math.hypot(e.clientX - P.x, e.clientY - P.y) > 10) P.moved = true;
    e.preventDefault();
  }
  function pUp(e) {
    const P = S.ptr; if (!P || P.id !== e.pointerId) return;
    S.ptr = null;
    if (e.type === 'pointercancel') return;
    if (P.die && !P.moved) {
      if (S.allow.keep) setKeep(P.die.i, !P.die.kept);
      else emit('tapDie', P.die.i);
    } else if (!P.die && !P.moved) emit('tapEmpty');
  }
  /* カップを持つ（トレイの上のカップを押さえた・右下のカップのボタンを押さえた）。
     そのあとの指の動きは window で追う（ボタンから指がはなれてもついてくる） */
  function grabAt(e) {
    if (S.mode === '2d') return false;
    if (!S.allow.throw || S.throwing || cup.mode === 'pour' || cup.ptr) return false;
    const [x, z] = hoverAt(e.clientX, e.clientY);
    if (!cupGrab(x, z)) return false;
    cup.ptr = { id: e.pointerId };
    const mv2 = (ev) => { if (!cup.ptr || ev.pointerId !== cup.ptr.id) return; const [hx, hz] = hoverAt(ev.clientX, ev.clientY); cupMoveTo(hx, hz); ev.preventDefault(); };
    const up = (ev) => {
      if (!cup.ptr || ev.pointerId !== cup.ptr.id) return;
      cup.ptr = null;
      root.removeEventListener('pointermove', mv2); root.removeEventListener('pointerup', up); root.removeEventListener('pointercancel', up);
      cupRelease();
    };
    root.addEventListener('pointermove', mv2, { passive: false });
    root.addEventListener('pointerup', up); root.addEventListener('pointercancel', up);
    return true;
  }

  /* ══ まわす ══ */
  function kick() { if (!S.raf && S.ok) { S.last = performance.now(); S.raf = requestAnimationFrame(loop); } }
  function active() {
    return S.throwing || S.hlOn || S.hint || cup.mode === 'hold' || cup.mode === 'pour' || cup.mode === 'leave' || cup.mode === 'come' ||
      S.bodies.some((b) => b.mode === 'anim' || (b.mode === 'dyn' && !b.asleep));
  }
  function loop(now) {
    S.raf = 0;
    const dt = Math.min(0.05, Math.max(0, (now - S.last) / 1000)); S.last = now;
    S.t += dt;
    if (S.mode === '3d') {
      S.acc += dt;
      let n = 0;
      while (S.acc >= PH.sub && n < 40) { substep(PH.sub); S.acc -= PH.sub; n++; }
      if (n >= 40) S.acc = 0;
      stepCup(dt);
      stepAnim(dt);
      settleCheck(dt);
      draw();
    }
    if (active()) S.raf = requestAnimationFrame(loop);
  }

  /* ══════════════════════════════════════════════════════════════
     2D（WebGL が使えない端末）：同じ合図で、平らな絵のサイコロを使う
     ══════════════════════════════════════════════════════════════ */
  const PIP2 = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  let f2 = null;
  function flat2dInit() {
    S.mode = '2d';
    S.cv.style.display = 'none';
    f2 = document.createElement('div'); f2.className = 'd2';
    f2.innerHTML = '<div class="d2-keep"></div><div class="d2-tray"></div><p class="d2-note">この端末では 3D が使えないため、平らな絵で表示しています</p>';
    S.wrap.appendChild(f2);
    f2.addEventListener('click', (e) => {
      const el = e.target.closest('.d2-die'); if (!el) return;
      const i = +el.dataset.i;
      if (S.allow.keep && !S.throwing) { const b = S.bodies[i]; b.kept = !b.kept; flat2dPaint(); emit('keep', i, b.kept); }
    });
  }
  function flat2dPaint() {
    if (!f2) return;
    const die = (b) => '<button class="d2-die' + (b.kept ? ' kept' : '') + (S.hlOn && S.hl[b.i] ? ' hl' : '') + (S.throwing && !b.kept ? ' roll' : '') + '" data-i="' + b.i + '"><i class="f' + b.val2 + '">' + PIP2[b.val2].map((k) => '<b style="grid-area:' + (1 + ((k / 3) | 0)) + '/' + (1 + (k % 3)) + '"></b>').join('') + '</i></button>';
    f2.querySelector('.d2-keep').innerHTML = S.bodies.filter((b) => b.kept).map(die).join('') || '<span>KEEP</span>';
    f2.querySelector('.d2-tray').innerHTML = S.bodies.filter((b) => !b.kept).map(die).join('');
  }
  function flat2dThrow() {
    S.throwing = true; emit('throw', freeDice().length);
    let n = 0;
    return new Promise((res) => {
      const tick = () => {
        S.bodies.forEach((b) => { if (!b.kept) b.val2 = 1 + ((Math.random() * 6) | 0); });
        flat2dPaint(); if (n % 2 === 0) emit('hit', 'die', 0.5);
        if (++n < 9) setTimeout(tick, 70);
        else { S.throwing = false; flat2dPaint(); const v = S.bodies.map((b) => b.val2); emit('settled', v); res(v); }
      };
      tick();
    });
  }

  /* ══ 外から使う ══ */
  function init(wrap, canvas) {
    S.wrap = wrap; S.cv = canvas;
    for (let i = 0; i < 5; i++) { const b = new Body(i); b.q = qUp(1 + i, rnd(-0.3, 0.3)); b.p = [(i - 2) * 1.32, H, 0]; b.val2 = 1 + i; S.bodies.push(b); }
    let ok = false;
    try { ok = glInit(); } catch (e) { ok = false; }
    S.ok = true;
    if (ok) {
      S.mode = '3d';
      canvas.addEventListener('pointerdown', pDown);
      canvas.addEventListener('pointermove', pMove);
      canvas.addEventListener('pointerup', pUp);
      canvas.addEventListener('pointercancel', pUp);
      /* キャンバスの外ではなしても、記録を必ず片づける（先に window で受けて pUp。キャンバスの分は空振りになる） */
      root.addEventListener('pointerup', (e) => { if (S.ptr && S.ptr.id === e.pointerId) pUp(e); }, true);
      root.addEventListener('pointercancel', (e) => { if (S.ptr && S.ptr.id === e.pointerId) pUp(e); }, true);
      canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); });
      canvas.addEventListener('webglcontextrestored', () => { try { glInit(); buildBoard(); layout(); } catch (err) { /* 2D のまま */ } });
    } else flat2dInit();
    let rt = 0;
    const onR = () => { clearTimeout(rt); rt = setTimeout(layout, 60); };
    root.addEventListener('resize', onR);
    if (root.ResizeObserver) new ResizeObserver(onR).observe(wrap);
    layout();
    if (S.mode === '3d') { cupToHome(true); scoop(true); }
    return S.mode;
  }

  MY.Dice = {
    init, layout, on,
    values: () => (S.mode === '2d' ? S.bodies.map((b) => b.val2) : values()),
    keeps: () => S.bodies.map((b) => !!b.kept),
    newTurn() { if (S.mode === '2d') { S.bodies.forEach((b) => { b.kept = false; }); flat2dPaint(); return; } newTurn(); },
    restore(vals, keep, rolled) { if (S.mode === '2d') { S.bodies.forEach((b, i) => { if (vals && vals[i]) b.val2 = vals[i]; b.kept = !!(keep && keep[i]); }); flat2dPaint(); return; } restore(vals, keep, rolled); },
    autoThrow,
    /* 右下のカップのボタン：カップをトレイに出す（押さえたまま動かせばそのまま持てる）。2D ならすぐふる */
    callCup: (e) => callCup(e),
    setKeep(i, on2) { if (S.mode === '2d') { const b = S.bodies[i]; if (b) { b.kept = !!on2; flat2dPaint(); } return; } setKeep(i, on2, true); },
    allow(o) { S.allow.throw = !!o.throw; S.allow.keep = !!o.keep; },
    highlight(list) { S.hl = [0, 0, 0, 0, 0]; (list || []).forEach((i) => { S.hl[i] = 1; }); S.hlOn = !!(list && list.length); if (S.mode === '2d') flat2dPaint(); kick(); },
    hint(onH) { S.hint = !!onH; kick(); },
    busy: () => S.throwing || cup.mode === 'hold' || cup.mode === 'pour' || busyAnim(),
    cupState: () => cup.mode,
    inCup: () => S.bodies.filter((b) => b.mode === 'cup').length,
    get mode() { return S.mode; },
    /* テスト用：物理だけを速く回して、目の出かたを数える（描かない・合図も出さない） */
    _bench(n) {
      const cnt = [0, 0, 0, 0, 0, 0, 0]; let maxT = 0, sumT = 0, nud = 0;
      S.silent = true;
      for (let k = 0; k < n; k++) {
        S.bodies.forEach((b) => { b.kept = false; b.anim = null; b.mode = 'rest'; b.cs = -1; });
        cup.c = [rnd(-S.tw * 0.25, S.tw * 0.25), CUP.hover + CUP.piv, rnd(-S.td * 0.15, S.td * 0.3)]; cup.q = [0, 0, 0, 1]; cup.mode = 'hold';
        scoop(true);
        /* ふったあと（カップの中で向きがまざった）と同じにする */
        S.bodies.forEach((b) => { b.cq = qrand(); placeInCup(b, 0, 0); });
        const ang = rnd(-Math.PI, Math.PI), dir = [Math.sin(ang), 0, -Math.cos(ang)];
        cup.vel = mul(dir, rnd(0, 14)); startPour(dir);
        let t = 0;
        while ((S.throwing || cup.mode === 'pour') && t < 12) { for (let j = 0; j < 5; j++) substep(PH.sub); stepCup(PH.sub * 5); stepAnim(PH.sub * 5); settleCheck(PH.sub * 5); t += PH.sub * 5; }
        S.bodies.forEach((b) => { if (b.mode === 'anim' && b.anim) { b.p = b.anim.p1; b.q = b.anim.q1; b.mode = 'rest'; b.anim = null; } nud += b.nudges; });
        S.throwing = false; autoP = null; cup.mode = 'off'; cup.c = [0, 14, 0];
        values().forEach((v) => cnt[v]++);
        maxT = Math.max(maxT, t); sumT += t;
      }
      S.silent = false; kick();
      return { faces: cnt.slice(1), avgT: +(sumT / n).toFixed(2), maxT: +maxT.toFixed(2), nudgesPerThrow: +(nud / n).toFixed(2) };
    },
    _S: S, _PH: PH, _cup: cup,
    _dbg: { substep, stepCup, stepAnim, settleCheck, upFace, startPour, scoop, placeInCup, qrand }
  };
})(window);
