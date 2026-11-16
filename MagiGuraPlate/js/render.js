/* MagiGura Plate — 描画（Canvas 2D に自前の 3D 投影）
 *
 *  カメラは皿の真上（高さ CAM）から見下ろす。皿は傾きに合わせて本当に回して投影するので、
 *  下がった側は小さく、上がった側は大きく見える。コマは高さのある柱として描く
 *  （凸なので「こちらを向いた面だけ描く」で正しく重なる）。
 *  座標は X=画面の右・Y=画面の下・Z=手前（カメラ側）。
 */
(function (root) {
  'use strict';
  const GP = root.GP, CFG = GP.CFG, KINDS = GP.KINDS;

  const CAM = 2.9;        // カメラの高さ（皿の半径 = 1）
  const ZT = 0.95;        // テーブルまでの深さ
  const LIGHT = (function () { const v = [0.33, 0.42, -1], l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; })();
  const LPOS = [-1.0, -1.3, 5.5];
  const SEG = 72, CSEG = 20;
  const COS = [], SIN = [];
  for (let i = 0; i < SEG; i++) { COS.push(Math.cos(i / SEG * 2 * Math.PI)); SIN.push(Math.sin(i / SEG * 2 * Math.PI)); }

  const MAT = {
    wood:   { top: '#e9bb7e', edge: '#c9975a', sideL: [200, 146, 84], sideD: [112, 72, 36], line: 'rgba(122,76,32,0.5)', pip: '#5b3713' },
    ice:    { top: '#d2f3ff', edge: '#8fd6f5', sideL: [158, 220, 248], sideD: [66, 136, 184], line: 'rgba(255,255,255,0.9)', pip: '#2a6a8e' },
    rubber: { top: '#f56c83', edge: '#d9435f', sideL: [208, 64, 92], sideD: [118, 26, 48], line: 'rgba(110,16,36,0.45)', pip: '#fff3f5' },
    iron:   { top: '#bcc7d4', edge: '#7f8c9b', sideL: [134, 146, 162], sideD: [50, 58, 72], line: 'rgba(36,44,56,0.55)', pip: '#252d38' }
  };

  /* コマの形（上から見た頂点と、各辺の外向き法線） */
  const SH = {};
  for (const id in KINDS) {
    const k = KINDS[id], s = { n: 0, x: [], y: [], nx: [], ny: [] };
    if (k.shape === 'circle') {
      s.n = CSEG;
      for (let i = 0; i < CSEG; i++) {
        const a = i / CSEG * 2 * Math.PI, am = (i + 0.5) / CSEG * 2 * Math.PI;
        s.x.push(k.r * Math.cos(a)); s.y.push(k.r * Math.sin(a)); s.nx.push(Math.cos(am)); s.ny.push(Math.sin(am));
      }
    } else { s.n = k.n; s.x = k.lx; s.y = k.ly; s.nx = k.lnx; s.ny = k.lny; }
    SH[id] = s;
  }

  let cv = null, ctx = null, W = 0, H = 0, dpr = 1;
  let cx = 0, cy = 0, Rpx = 100, F = 290, baseCx = 0, baseCy = 0;
  let bgGrad = null;

  /* 皿の傾き → 回転行列 M（皿の座標 → 世界） */
  const M = new Float64Array(9);
  let nX = 0, nY = 0, nZ = 1;
  function setTilt(sx, sy) {
    const l = Math.sqrt(1 + sx * sx + sy * sy);
    nX = sx / l; nY = sy / l; nZ = 1 / l;
    const k = 1 / (1 + nZ);
    M[0] = 1 - nX * nX * k; M[1] = -nX * nY * k;    M[2] = nX;
    M[3] = -nX * nY * k;    M[4] = 1 - nY * nY * k; M[5] = nY;
    M[6] = -nX;             M[7] = -nY;             M[8] = nZ;
  }
  function p2w(x, y, z, o) {
    const zz = z + CFG.C0;
    o[0] = M[0] * x + M[1] * y + M[2] * zz;
    o[1] = M[3] * x + M[4] * y + M[5] * zz;
    o[2] = M[6] * x + M[7] * y + M[8] * zz - CFG.C0;
  }
  const _w = [0, 0, 0], _s = [0, 0];
  function w2s(w, o) { const k = F / (CAM - w[2]); o[0] = cx + w[0] * k; o[1] = cy + w[1] * k; }
  function p2s(x, y, z, o) { p2w(x, y, z, _w); w2s(_w, o); }

  /* 画面の点 → 皿の面（高さ 0）の上の位置 */
  function screenToPlate(px, py, sx, sy) {
    setTilt(sx, sy);
    const dx = (px - baseCx) / F, dy = (py - baseCy) / F;
    p2w(0, 0, 0, _w);
    const t = (nX * _w[0] + nY * _w[1] + nZ * (_w[2] - CAM)) / (nX * dx + nY * dy - nZ);
    const wx = dx * t, wy = dy * t, wz = CAM - t + CFG.C0;
    return { x: M[0] * wx + M[3] * wy + M[6] * wz, y: M[1] * wx + M[4] * wy + M[7] * wz };
  }
  function plateToScreen(x, y, z, sx, sy) {
    setTilt(sx, sy);
    const sv = cx, sw = cy; cx = baseCx; cy = baseCy;
    p2s(x, y, z, _s); cx = sv; cy = sw;
    return [_s[0], _s[1]];
  }

  /* 姿勢（m = 向き, t = 位置）。皿の上に乗っているコマ用 */
  function poseOnPlate(x, y, a, z, o) {
    const c = Math.cos(a), s = Math.sin(a), m = o.m;
    m[0] = M[0] * c + M[1] * s; m[1] = -M[0] * s + M[1] * c; m[2] = M[2];
    m[3] = M[3] * c + M[4] * s; m[4] = -M[3] * s + M[4] * c; m[5] = M[5];
    m[6] = M[6] * c + M[7] * s; m[7] = -M[6] * s + M[7] * c; m[8] = M[8];
    p2w(x, y, z, o.t);
    return o;
  }
  function worldToScreen(w) { const k = F / (CAM - w[2]); return [baseCx + w[0] * k, baseCy + w[1] * k]; }
  function newPose() { return { m: new Float64Array(9), t: [0, 0, 0] }; }
  /* 落ちていくコマ：その瞬間の皿の傾きから姿勢と速度を作る */
  function poseForFall(body, sx, sy) {
    setTilt(sx, sy);
    const o = poseOnPlate(body.x, body.y, body.a, body.zr || 0, newPose());
    const v = [M[0] * body.vx + M[1] * body.vy, M[3] * body.vx + M[4] * body.vy, M[6] * body.vx + M[7] * body.vy];
    return { pose: o, v: v };
  }

  function mix(a, b, t) {
    return 'rgb(' + ((a[0] + (b[0] - a[0]) * t) | 0) + ',' + ((a[1] + (b[1] - a[1]) * t) | 0) + ',' + ((a[2] + (b[2] - a[2]) * t) | 0) + ')';
  }

  /* ---------- コマの上の面（コマの座標で描く。回転・投影は呼び出し側の変換にまかせる） ---------- */
  function topPath(c, k) {
    c.beginPath();
    if (k.shape === 'circle') c.arc(0, 0, k.r, 0, Math.PI * 2);
    else { c.moveTo(k.lx[0], k.ly[0]); for (let i = 1; i < k.n; i++) c.lineTo(k.lx[i], k.ly[i]); c.closePath(); }
  }
  function pips(c, n, col, sp, r) {
    c.fillStyle = col;
    let pts;
    if (n === 2) pts = [[-sp * 0.75, 0], [sp * 0.75, 0]];
    else if (n === 3) pts = [[-sp * 1.5, 0], [0, 0], [sp * 1.5, 0]];
    else if (n === 5) pts = [[-sp, -sp], [sp, -sp], [0, 0], [-sp, sp], [sp, sp]];
    else pts = [[0, 0]];
    c.beginPath();
    for (const p of pts) { c.moveTo(p[0] + r, p[1]); c.arc(p[0], p[1], r, 0, Math.PI * 2); }
    c.fill();
  }
  function drawTop(c, k) {
    const mat = MAT[k.mat];
    topPath(c, k);
    c.fillStyle = mat.top; c.fill();
    c.lineJoin = 'round';
    if (k.id === 'disc') {
      c.strokeStyle = mat.line; c.lineWidth = 0.009;
      c.beginPath(); c.arc(0, 0, k.r * 0.74, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.arc(0.012, -0.008, k.r * 0.46, 0.4, 5.2); c.stroke();
      pips(c, 2, mat.pip, 0.04, 0.019);
    } else if (k.id === 'bar') {
      c.strokeStyle = mat.line; c.lineWidth = 0.008;
      c.beginPath(); c.moveTo(-0.2, -0.032); c.bezierCurveTo(-0.08, -0.044, 0.06, -0.02, 0.2, -0.034); c.stroke();
      c.beginPath(); c.moveTo(-0.2, 0.034); c.bezierCurveTo(-0.05, 0.02, 0.1, 0.046, 0.2, 0.03); c.stroke();
      pips(c, 3, mat.pip, 0.05, 0.018);
    } else if (k.id === 'ice') {
      c.save(); c.scale(0.52, 0.52); topPath(c, k); c.restore();
      c.fillStyle = 'rgba(255,255,255,0.55)'; c.fill();
      c.strokeStyle = mat.line; c.lineWidth = 0.007; c.lineCap = 'round';
      c.beginPath(); c.moveTo(k.lx[0] * 0.9, k.ly[0] * 0.9); c.lineTo(k.lx[0] * 0.45 + 0.03, k.ly[0] * 0.45);
      c.moveTo(k.lx[1] * 0.85, k.ly[1] * 0.85); c.lineTo(k.lx[1] * 0.5, k.ly[1] * 0.5 - 0.03); c.stroke();
      pips(c, 2, mat.pip, 0.036, 0.017);
    } else if (k.id === 'rubber') {
      c.strokeStyle = mat.line; c.lineWidth = 0.012;
      const q = 0.072;
      c.beginPath(); c.rect(-q, -q, q * 2, q * 2); c.stroke();
      pips(c, 2, mat.pip, 0.04, 0.018);
    } else if (k.id === 'iron') {
      c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 0.011;
      c.beginPath(); c.arc(0, 0, k.r * 0.8, Math.PI * 0.95, Math.PI * 1.6); c.stroke();
      c.strokeStyle = mat.line; c.lineWidth = 0.011;
      c.beginPath(); c.arc(0, 0, k.r * 0.8, -0.1, Math.PI * 0.62); c.stroke();
      pips(c, 5, mat.pip, 0.046, 0.017);
    }
    topPath(c, k);
    c.strokeStyle = mat.edge; c.lineWidth = 0.014; c.stroke();
    c.strokeStyle = 'rgba(10,12,30,0.45)'; c.lineWidth = 0.005; c.stroke();
  }

  /* ---------- 柱として描く ---------- */
  const TX = new Float64Array(32), TY = new Float64Array(32), BX = new Float64Array(32), BY = new Float64Array(32);
  const PX = [0, 0, 0], PY = [0, 0, 0];
  function prj(m, t, lx, ly, lz, ax, ay, i) {
    const wz = t[2] + m[6] * lx + m[7] * ly + m[8] * lz, k = F / (CAM - wz);
    ax[i] = cx + (t[0] + m[0] * lx + m[1] * ly + m[2] * lz) * k;
    ay[i] = cy + (t[1] + m[3] * lx + m[4] * ly + m[5] * lz) * k;
  }
  function drawBody(kindId, pose, tint) {
    const k = KINDS[kindId], sh = SH[kindId], mat = MAT[k.mat], n = sh.n, m = pose.m, t = pose.t, h = k.h;
    let i, j, area = 0;
    for (i = 0; i < n; i++) { prj(m, t, sh.x[i], sh.y[i], h, TX, TY, i); prj(m, t, sh.x[i], sh.y[i], 0, BX, BY, i); }
    for (i = 0; i < n; i++) { j = (i + 1) % n; area += TX[i] * TY[j] - TX[j] * TY[i]; }
    ctx.lineJoin = 'round'; ctx.lineWidth = 0.8;
    for (i = 0; i < n; i++) {
      j = (i + 1) % n;
      const a2 = (BX[i] * BY[j] - BX[j] * BY[i]) + (BX[j] * TY[j] - TX[j] * BY[j]) + (TX[j] * TY[i] - TX[i] * TY[j]) + (TX[i] * BY[i] - BX[i] * TY[i]);
      if (a2 <= 0) continue;                           // 向こうを向いた面
      const lam = 0.5 - (m[0] * sh.nx[i] + m[1] * sh.ny[i]) * LIGHT[0] - (m[3] * sh.nx[i] + m[4] * sh.ny[i]) * LIGHT[1] - (m[6] * sh.nx[i] + m[7] * sh.ny[i]) * LIGHT[2];
      ctx.fillStyle = ctx.strokeStyle = mix(mat.sideD, mat.sideL, lam < 0 ? 0 : lam > 1 ? 1 : lam);
      ctx.beginPath(); ctx.moveTo(BX[i], BY[i]); ctx.lineTo(BX[j], BY[j]); ctx.lineTo(TX[j], TY[j]); ctx.lineTo(TX[i], TY[i]); ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
    if (area > 0) {
      prj(m, t, 0, 0, h, PX, PY, 0); prj(m, t, 0.1, 0, h, PX, PY, 1); prj(m, t, 0, 0.1, h, PX, PY, 2);
      ctx.save();
      ctx.transform((PX[1] - PX[0]) * 10, (PY[1] - PY[0]) * 10, (PX[2] - PX[0]) * 10, (PY[2] - PY[0]) * 10, PX[0], PY[0]);
      drawTop(ctx, k);
      if (tint) { topPath(ctx, k); ctx.fillStyle = tint; ctx.fill(); }
      ctx.restore();
    } else {                                           // 裏返って底が見えている
      ctx.fillStyle = mix(mat.sideD, mat.sideL, 0.15);
      ctx.beginPath(); ctx.moveTo(BX[0], BY[0]); for (i = 1; i < n; i++) ctx.lineTo(BX[i], BY[i]); ctx.closePath(); ctx.fill();
    }
  }

  /* ---------- 皿 ---------- */
  const RX = new Float64Array(SEG), RY = new Float64Array(SEG);
  function ringPath(r, z) {
    ctx.beginPath();
    for (let i = 0; i < SEG; i++) { p2s(r * COS[i], r * SIN[i], z, _s); if (i) ctx.lineTo(_s[0], _s[1]); else ctx.moveTo(_s[0], _s[1]); }
    ctx.closePath();
  }
  function platePath() {
    ctx.beginPath(); ctx.moveTo(RX[0], RY[0]);
    for (let i = 1; i < SEG; i++) ctx.lineTo(RX[i], RY[i]);
    ctx.closePath();
  }
  function shadowPt(lx, ly, o) {
    p2w(lx, ly, -0.03, _w);
    const t = (_w[2] + ZT) / (-LIGHT[2]);
    _w[0] += LIGHT[0] * t; _w[1] += LIGHT[1] * t; _w[2] = -ZT;
    w2s(_w, o);
  }
  const _a = [0, 0], _b = [0, 0], _c = [0, 0];
  const _pose = newPose();

  function drawPlate(st, smag, sdx, sdy) {
    let i;
    /* テーブルに落ちる影（円の影は楕円になる） */
    shadowPt(0, 0, _c); shadowPt(1, 0, _a); shadowPt(0, 1, _b);
    ctx.save();
    ctx.transform(_a[0] - _c[0], _a[1] - _c[1], _b[0] - _c[0], _b[1] - _c[1], _c[0], _c[1]);
    const sg = ctx.createRadialGradient(0, 0, 0.62, 0, 0, 1.14);
    sg.addColorStop(0, 'rgba(0,0,6,0.62)'); sg.addColorStop(1, 'rgba(0,0,6,0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(0, 0, 1.14, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    /* 落ちていくコマ（皿より下にあるもの） */
    drawFalling(st, false);

    /* 皿のうら（強く傾いたときだけ上がった側に見える） */
    ringPath(1, -0.05); ctx.fillStyle = '#0e1030'; ctx.fill();

    for (i = 0; i < SEG; i++) { p2s(COS[i], SIN[i], 0, _s); RX[i] = _s[0]; RY[i] = _s[1]; }
    p2s(0, 0, 0, _c);
    const pcx = _c[0], pcy = _c[1];
    platePath();
    const g = ctx.createRadialGradient(pcx, pcy, Rpx * 0.08, pcx, pcy, Rpx * 1.12);
    g.addColorStop(0, '#3f4692'); g.addColorStop(0.55, '#2c3172'); g.addColorStop(1, '#1b1e4d');
    ctx.fillStyle = g; ctx.fill();

    ctx.save(); platePath(); ctx.clip();
    /* 坂の明るさ：高い側は明るく、低い側は暗い */
    if (smag > 0.004) {
      p2s(-sdx, -sdy, 0, _a); p2s(sdx, sdy, 0, _b);
      const lg = ctx.createLinearGradient(_a[0], _a[1], _b[0], _b[1]);
      lg.addColorStop(0, 'rgba(200,215,255,' + Math.min(0.2, smag * 0.6).toFixed(3) + ')');
      lg.addColorStop(0.5, 'rgba(0,0,0,0)');
      lg.addColorStop(1, 'rgba(0,0,12,' + Math.min(0.5, smag * 1.5).toFixed(3) + ')');
      ctx.fillStyle = lg; ctx.fillRect(pcx - Rpx * 1.4, pcy - Rpx * 1.4, Rpx * 2.8, Rpx * 2.8);
    }
    /* もよう */
    ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(232,196,110,0.3)';
    ringPath(0.45, 0); ctx.stroke();
    ringPath(0.72, 0); ctx.stroke();
    ctx.strokeStyle = 'rgba(232,196,110,0.42)'; ctx.lineWidth = 1.4; ctx.beginPath();
    for (i = 0; i < 24; i++) {
      const a = i / 24 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), r0 = i % 2 ? 0.925 : 0.895;
      p2s(c * r0, s * r0, 0, _a); p2s(c * 0.955, s * 0.955, 0, _b);
      ctx.moveTo(_a[0], _a[1]); ctx.lineTo(_b[0], _b[1]);
    }
    ctx.stroke();
    /* つやの映りこみ（傾くと位置が動く） */
    p2w(0, 0, 0, _w);
    const dn = nX * (LPOS[0] - _w[0]) + nY * (LPOS[1] - _w[1]) + nZ * (LPOS[2] - _w[2]);
    const lx = LPOS[0] - 2 * nX * dn, ly = LPOS[1] - 2 * nY * dn, lz = LPOS[2] - 2 * nZ * dn;
    const den = nX * lx + nY * ly + nZ * (lz - CAM);
    if (den < -1e-6) {
      const t = (nX * _w[0] + nY * _w[1] + nZ * (_w[2] - CAM)) / den;
      _w[0] = lx * t; _w[1] = ly * t; _w[2] = CAM + (lz - CAM) * t;
      w2s(_w, _a);
      const hg = ctx.createRadialGradient(_a[0], _a[1], 0, _a[0], _a[1], Rpx * 0.62);
      hg.addColorStop(0, 'rgba(190,205,255,0.26)'); hg.addColorStop(0.5, 'rgba(160,180,255,0.09)'); hg.addColorStop(1, 'rgba(160,180,255,0)');
      ctx.fillStyle = hg; ctx.fillRect(_a[0] - Rpx * 0.62, _a[1] - Rpx * 0.62, Rpx * 1.24, Rpx * 1.24);
    }
    /* 危険：低い側のふちが赤く光る */
    if (st.danger > 0.01) {
      p2s(sdx, sdy, 0, _a);
      const dg = ctx.createRadialGradient(_a[0], _a[1], 0, _a[0], _a[1], Rpx * 1.05);
      const al = st.danger * (0.34 + 0.12 * Math.sin(st.now * 9));
      dg.addColorStop(0, 'rgba(255,70,60,' + al.toFixed(3) + ')'); dg.addColorStop(1, 'rgba(255,70,60,0)');
      ctx.fillStyle = dg; ctx.fillRect(pcx - Rpx * 1.4, pcy - Rpx * 1.4, Rpx * 2.8, Rpx * 2.8);
    }
    ctx.restore();

    /* ふち（番の人の色で光る） */
    platePath();
    ctx.save();
    ctx.shadowColor = st.accent || '#e8c46e'; ctx.shadowBlur = 18 * dpr;
    ctx.strokeStyle = st.accent || '#e8c46e'; ctx.lineWidth = Math.max(3, Rpx * 0.014); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1; ringPath(0.975, 0); ctx.stroke();
  }

  /* 中央の軸：水準器（泡は高い側＝軽い側へ動く。輪を越えるとその材質がすべる） */
  function drawHub(w) {
    const HR = CFG.HUB, hh = 0.03;
    let i;
    ctx.fillStyle = '#8a6a2a';
    ringPath(HR, 0); ctx.fill();
    ringPath(HR, hh);
    ctx.fillStyle = '#d9b862'; ctx.fill();
    poseOnPlate(0, 0, 0, hh, _pose);
    const m = _pose.m, t = _pose.t;
    prj(m, t, 0, 0, 0, PX, PY, 0); prj(m, t, 0.1, 0, 0, PX, PY, 1); prj(m, t, 0, 0.1, 0, PX, PY, 2);
    ctx.save();
    ctx.transform((PX[1] - PX[0]) * 10, (PY[1] - PY[0]) * 10, (PX[2] - PX[0]) * 10, (PY[2] - PY[0]) * 10, PX[0], PY[0]);
    const ri = HR - 0.022;
    const gg = ctx.createRadialGradient(-0.03, -0.04, 0.01, 0, 0, ri);
    gg.addColorStop(0, '#2f7f78'); gg.addColorStop(1, '#0d3a3c');
    ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(0, 0, ri, 0, Math.PI * 2); ctx.fill();
    const sc = (ri - 0.03) / CFG.SMAX;
    const rings = [[KINDS.ice.mus, 'rgba(170,232,255,0.95)'], [0.32, 'rgba(236,190,128,0.9)'], [KINDS.rubber.mus, 'rgba(250,120,140,0.9)']];
    ctx.lineWidth = 0.006;
    for (i = 0; i < rings.length; i++) { ctx.strokeStyle = rings[i][1]; ctx.beginPath(); ctx.arc(0, 0, rings[i][0] * sc, 0, Math.PI * 2); ctx.stroke(); }
    let bx = -w.sx * sc, by = -w.sy * sc;
    const bl = Math.hypot(bx, by), bm = ri - 0.03;
    if (bl > bm) { bx *= bm / bl; by *= bm / bl; }
    ctx.fillStyle = 'rgba(235,255,250,0.92)'; ctx.beginPath(); ctx.arc(bx, by, 0.026, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(bx - 0.008, by - 0.009, 0.008, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 0.008;
    ctx.beginPath(); ctx.arc(0, 0, ri - 0.012, Math.PI * 1.05, Math.PI * 1.5); ctx.stroke();
    ctx.restore();
  }

  /* 光の向きを皿の座標に直したもの（高さ 1 のものの影が、面の上でどれだけずれるか） */
  let shOx = 0, shOy = 0;
  function lightOnPlate() {
    const lx = M[0] * LIGHT[0] + M[3] * LIGHT[1] + M[6] * LIGHT[2];
    const ly = M[1] * LIGHT[0] + M[4] * LIGHT[1] + M[7] * LIGHT[2];
    const lz = M[2] * LIGHT[0] + M[5] * LIGHT[1] + M[8] * LIGHT[2];
    shOx = lx / -lz; shOy = ly / -lz;
  }
  /* コマが皿に落とす影（まとめて1回で塗る＝重なっても濃くならない）。上の段のコマは高いぶん遠くに落ちる */
  function drawShadows(bodies, ghost) {
    lightOnPlate();
    ctx.beginPath();
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      footPath(b.kind, b.x, b.y, b.a, 0.002, shOx * (b.zr + b.k.h), shOy * (b.zr + b.k.h));
    }
    ctx.fillStyle = 'rgba(6,8,30,0.42)'; ctx.fill();
    if (ghost && !ghost.off) {
      ctx.beginPath();
      footPath(ghost.kind, ghost.x, ghost.y, ghost.a, 0.002, shOx * ghost.z * 0.5, shOy * ghost.z * 0.5);
      ctx.fillStyle = 'rgba(6,8,30,0.3)'; ctx.fill();
    }
  }
  /* コマを上から見た形を、高さ z の面に（dx,dy だけずらして）なぞる。beginPath は呼び出し側 */
  function footPath(kindId, x, y, a, z, dx, dy) {
    const sh = SH[kindId], c = Math.cos(a), s = Math.sin(a);
    for (let i = 0; i < sh.n; i++) {
      p2s(x + c * sh.x[i] - s * sh.y[i] + dx, y + s * sh.x[i] + c * sh.y[i] + dy, z, _s);
      if (i) ctx.lineTo(_s[0], _s[1]); else ctx.moveTo(_s[0], _s[1]);
    }
    ctx.closePath();
  }
  /* 上の段のコマ（と、つまんでいるコマ）が、下のコマの上の面に落とす影。これで「乗っている」のが見てわかる */
  function drawStackShadows(bodies, ghost) {
    for (let j = 0; j < bodies.length; j++) {
      const b = bodies[j];
      if (b.zr > 0.001) continue;                      // 影を受けるのは下の段のコマ
      const top = b.k.h;
      let clipped = false;
      for (let i = 0; i <= bodies.length; i++) {
        const u = i < bodies.length ? bodies[i] : ghost;
        if (!u || u === b) continue;
        let uz, alpha;
        if (i < bodies.length) { if (u.zr < 0.02 || top > u.zr + 0.03) continue; uz = u.zr + u.k.h; alpha = 0.4; }
        else { if (u.off || u.z < top) continue; uz = top + (u.z - top) * 0.5 + KINDS[u.kind].h * 0.5; alpha = 0.3; }
        const dx = u.x - b.x, dy = u.y - b.y, rr = KINDS[u.kind].rad + b.rad + 0.2;
        if (dx * dx + dy * dy > rr * rr) continue;
        if (!clipped) { ctx.save(); ctx.beginPath(); footPath(b.kind, b.x, b.y, b.a, top + 0.001, 0, 0); ctx.clip(); clipped = true; }
        const dh = uz - top;
        ctx.beginPath(); footPath(u.kind, u.x, u.y, u.a, top + 0.002, shOx * dh, shOy * dh);
        ctx.fillStyle = 'rgba(6,8,30,' + alpha + ')'; ctx.fill();
      }
      if (clipped) ctx.restore();
    }
  }

  const _order = [];
  /* upper=false：皿の面にあるコマ / true：上の段のコマ（下りている途中のものも）。下の段を全部描いてから上の段を描く */
  function drawPieces(bodies, upper) {
    _order.length = 0;
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      if ((b.zr > 0.001) !== upper) continue;
      p2w(b.x, b.y, b.zr, _w);
      b._d = _w[0] * _w[0] + _w[1] * _w[1] + (CAM - _w[2]) * (CAM - _w[2]);
      _order.push(b);
    }
    _order.sort(function (p, q) { return q._d - p._d; });   // 遠いものから
    for (let i = 0; i < _order.length; i++) {
      const b = _order[i];
      drawBody(b.kind, poseOnPlate(b.x, b.y, b.a, b.zr, _pose), b.sliding ? 'rgba(255,255,255,0.14)' : null);
    }
  }

  /* 面に貼りついた絵を描くための変換（皿の座標の長さ 1 = 変換後の 1）。使ったら ctx.restore() */
  function planeAt(x, y, a, z) {
    poseOnPlate(x, y, a, z, _pose);
    const m = _pose.m, t = _pose.t;
    prj(m, t, 0, 0, 0, PX, PY, 0); prj(m, t, 0.1, 0, 0, PX, PY, 1); prj(m, t, 0, 0.1, 0, PX, PY, 2);
    ctx.save();
    ctx.transform((PX[1] - PX[0]) * 10, (PY[1] - PY[0]) * 10, (PX[2] - PX[0]) * 10, (PY[2] - PY[0]) * 10, PX[0], PY[0]);
  }

  function drawGhost(g, now) {
    if (!g.off) {
      if (g.ok && g.base) {                            // 乗せる相手のコマを光らせる
        const b = g.base, pulse = 0.75 + 0.25 * Math.sin(now * 9);
        ctx.beginPath(); footPath(b.kind, b.x, b.y, b.a, b.k.h + 0.002, 0, 0);
        ctx.save();
        ctx.fillStyle = 'rgba(255,224,110,' + (0.2 * pulse).toFixed(3) + ')'; ctx.fill();
        ctx.shadowColor = '#ffd447'; ctx.shadowBlur = 12 * dpr;
        ctx.lineWidth = 2.6; ctx.strokeStyle = 'rgba(255,226,122,' + pulse.toFixed(3) + ')'; ctx.stroke();
        ctx.restore();
      }
      /* 落ちる場所のしるし（皿の外では出さない）。コマの上なら、その上の面に出す */
      ctx.beginPath(); footPath(g.kind, g.x, g.y, g.a, g.zb + 0.003, 0, 0);
      ctx.fillStyle = g.ok ? 'rgba(255,255,255,0.2)' : 'rgba(255,60,60,0.4)'; ctx.fill();
      ctx.setLineDash([5, 4]); ctx.lineWidth = 1.6; ctx.strokeStyle = g.ok ? 'rgba(255,255,255,0.9)' : 'rgba(255,90,90,0.95)'; ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.globalAlpha = g.ok ? 0.96 : 0.7;
    drawBody(g.kind, poseOnPlate(g.x, g.y, g.a, g.z, _pose), g.ok ? null : 'rgba(255,40,40,0.5)');
    ctx.globalAlpha = 1;
    if (g.spin && !g.off) {                            // 「回せる」のしるし：コマといっしょに回る2本の矢印
      const k = KINDS[g.kind], r = k.rad + 0.055, hl = 0.045;
      planeAt(g.x, g.y, g.a, g.z + k.h);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.lineWidth = g.tw ? 0.02 : 0.013;
      ctx.strokeStyle = ctx.fillStyle = g.tw ? 'rgba(255,212,71,0.98)' : 'rgba(255,255,255,0.62)';
      for (let i = 0; i < 2; i++) {
        const a0 = i * Math.PI + 0.5, a1 = a0 + 1.25, ex = r * Math.cos(a1), ey = r * Math.sin(a1);
        ctx.beginPath(); ctx.arc(0, 0, r, a0, a1); ctx.stroke();
        const tx = -Math.sin(a1), ty = Math.cos(a1);   // 矢印の先は、時計まわりの向き
        ctx.beginPath();
        ctx.moveTo(ex + tx * hl, ey + ty * hl);
        ctx.lineTo(ex - tx * hl * 0.2 + ty * hl * 0.62, ey - ty * hl * 0.2 - tx * hl * 0.62);
        ctx.lineTo(ex - tx * hl * 0.2 - ty * hl * 0.62, ey - ty * hl * 0.2 + tx * hl * 0.62);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
  }

  /* 落ちていくコマ。above=true は落ちはじめ（まだ皿より上に描く） */
  function drawFalling(st, above) {
    const fs = st.falling;
    if (!fs) return;
    for (let i = 0; i < fs.length; i++) {
      const f = fs[i];
      if ((f.age < 0.16) !== above) continue;
      const depth = Math.max(0, -f.pose.t[2]);
      ctx.globalAlpha = Math.max(0, Math.min(1, f.alpha)) * (1 - Math.min(0.55, depth * 0.55));
      drawBody(f.kind, f.pose, depth > 0.1 ? 'rgba(8,10,40,' + Math.min(0.5, depth * 0.5).toFixed(2) + ')' : null);
    }
    ctx.globalAlpha = 1;
  }

  /* 演出：輪・火花・紙ふぶき。upper=true は、コマの上の面に出る輪だけ（下の段のコマを描いたあとに重ねる） */
  function drawFx(st, upper) {
    const fx = st.fx;
    if (!fx) return;
    for (let i = 0; i < fx.length; i++) {
      const e = fx[i], u = (st.now - e.t0) / e.dur;
      if (u < 0 || u > 1) continue;
      if ((e.type === 'ring' && e.z > 0) !== upper) continue;
      if (e.type === 'ring') {
        planeAt(e.x, e.y, 0, (e.z || 0) + 0.004);
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.7 * (1 - u)).toFixed(3) + ')';
        ctx.lineWidth = 0.012 * (1 - u) + 0.003;
        ctx.beginPath(); ctx.arc(0, 0, e.r + e.grow * (1 - (1 - u) * (1 - u)), 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      } else if (e.type === 'spark') {
        const tt = u * e.dur, x = e.sx + e.vx * tt, y = e.sy + e.vy * tt + 0.5 * (e.g || 0) * tt * tt;
        ctx.globalAlpha = 1 - u;
        ctx.fillStyle = e.color;
        if (e.rect) {
          ctx.save(); ctx.translate(x + cx - baseCx, y + cy - baseCy); ctx.rotate(e.rot + e.spin * tt);
          ctx.fillRect(-e.size, -e.size * 0.5, e.size * 2, e.size); ctx.restore();
        } else { ctx.beginPath(); ctx.arc(x + cx - baseCx, y + cy - baseCy, e.size * (1 - u * 0.5), 0, Math.PI * 2); ctx.fill(); }
        ctx.globalAlpha = 1;
      }
    }
  }

  function draw(st) {
    const w = st.world;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, W, H);
    cx = baseCx + (st.shakeX || 0); cy = baseCy + (st.shakeY || 0);
    setTilt(w.sx, w.sy);
    const smag = Math.hypot(w.sx, w.sy), sdx = smag > 1e-6 ? w.sx / smag : 1, sdy = smag > 1e-6 ? w.sy / smag : 0;
    drawPlate(st, smag, sdx, sdy);
    drawHub(w);
    drawShadows(w.bodies, st.ghost);
    drawFx(st, false);
    drawPieces(w.bodies, false);
    drawStackShadows(w.bodies, st.ghost);
    drawFx(st, true);
    drawPieces(w.bodies, true);
    if (st.ghost) drawGhost(st.ghost, st.now);
    drawFalling(st, true);
    if (st.dim) { ctx.fillStyle = 'rgba(6,8,24,' + st.dim + ')'; ctx.fillRect(0, 0, W, H); }
  }

  function resize(cssW, cssH, ratio) {
    W = cssW; H = cssH; dpr = ratio;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
  }
  function setView(x, y, r) {
    baseCx = cx = x; baseCy = cy = y; Rpx = r; F = r * CAM;
    bgGrad = ctx.createRadialGradient(x, y, r * 0.3, x, y, Math.max(W, H) * 0.75);
    bgGrad.addColorStop(0, '#232a5c'); bgGrad.addColorStop(0.5, '#141834'); bgGrad.addColorStop(1, '#090b1c');
  }
  function init(canvas) { cv = canvas; ctx = cv.getContext('2d'); }

  /* 手持ちのコマの絵（真上から見た図）。angle は画面での向き */
  function drawIcon(canvas, kindId, angle, size) {
    const k = KINDS[kindId], r = Math.min(2, window.devicePixelRatio || 1), c = canvas.getContext('2d');
    canvas.width = canvas.height = Math.round(size * r);
    canvas.style.width = canvas.style.height = size + 'px';
    const sc = size * 0.4 / k.rad * Math.pow(k.rad / 0.245, 0.5);
    c.setTransform(r, 0, 0, r, 0, 0);
    c.clearRect(0, 0, size, size);
    c.translate(size / 2, size / 2);
    c.save(); c.translate(size * 0.035, size * 0.055); c.rotate(angle); c.scale(sc, sc);
    topPath(c, k); c.fillStyle = 'rgba(0,0,0,0.45)'; c.fill(); c.restore();
    c.rotate(angle); c.scale(sc, sc);
    drawTop(c, k);
  }

  GP.Render = {
    init: init, resize: resize, setView: setView, draw: draw,
    screenToPlate: screenToPlate, plateToScreen: plateToScreen, worldToScreen: worldToScreen, poseForFall: poseForFall, drawIcon: drawIcon,
    ZT: ZT, MAT: MAT,
    get R() { return Rpx; }
  };
})(window);
