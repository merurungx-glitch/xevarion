/* ══════════════════════════════════════════════════════════════════
   XEVARION PARK — 道のネットワーク（★★ 2026-09-30c 一から作り直し）
   ------------------------------------------------------------------
   前の道（手で引いた道＋自動で探した道）は、うねって建物・広場に重なり、交わる所で帯が重なっていた
   （ご指定「道や道の接続部分が建物や広場などに干渉している」「導線は楽しむうえで最重要」）。
   ・park_plan.js の配置図の道だけを敷く（まっすぐ・角は丸く）。道の格：大通り（ave）・通り（st）・小道（lane）
   ・交わる所（T 字・十字・エリアの中の道とのつなぎ目）は、丸い石だたみの広場でおおう＝帯の重なり・縁石のはみ出しが見えない
   ・エリアの門は道の上にだけ置く（道の向きにそろえ、門の幅は道より広く）。道のない門は、近くの道へまっすぐの道でつなぐ
   ・建物の入口・乗り場の前に道も広場もないときは、近くの道へまっすぐの小道（建物・水・当たりを通らない所だけ）
   ・エリアの範囲（AREAS）は中身に合わせて取り直す（地図・エリア名・柵に使う）
   ・調べる (netReport)：道が建物・当たり・水を通っていないか、門・入口に道があるか
   ══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const T = THREE, P = XWorld.World.prototype, XP = XPark, TAU = Math.PI * 2;
  const segD = (x, z, x0, z0, x1, z1) => { const dx = x1 - x0, dz = z1 - z0, l2 = dx * dx + dz * dz; let t = l2 ? ((x - x0) * dx + (z - z0) * dz) / l2 : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(x - (x0 + dx * t), z - (z0 + dz * t)); };
  const segT = (x, z, x0, z0, x1, z1) => { const dx = x1 - x0, dz = z1 - z0, l2 = dx * dx + dz * dz; let t = l2 ? ((x - x0) * dx + (z - z0) * dz) / l2 : 0; return Math.max(0, Math.min(1, t)); };

  /* 折れ線の角を丸める（半径 R）。まっすぐの所はそのまま */
  function fillet(pts, R) {
    if (pts.length < 3) return pts.map((p) => [p[0], p[1]]);
    const out = [[pts[0][0], pts[0][1]]];
    for (let i = 1; i < pts.length - 1; i++) {
      const [ax, az] = pts[i - 1], [bx, bz] = pts[i], [cx, cz] = pts[i + 1];
      const l1 = Math.hypot(bx - ax, bz - az), l2 = Math.hypot(cx - bx, cz - bz);
      if (l1 < 0.01 || l2 < 0.01) continue;
      const u1x = (bx - ax) / l1, u1z = (bz - az) / l1, u2x = (cx - bx) / l2, u2z = (cz - bz) / l2;
      const turn = Math.acos(Math.max(-1, Math.min(1, u1x * u2x + u1z * u2z)));
      if (turn < 0.04) { out.push([bx, bz]); continue; }
      const t = Math.min(R * Math.tan(turn / 2), l1 * 0.45, l2 * 0.45), p1x = bx - u1x * t, p1z = bz - u1z * t, p2x = bx + u2x * t, p2z = bz + u2z * t;
      const n = Math.max(3, Math.ceil(turn / 0.12));
      for (let k = 0; k <= n; k++) { const s = k / n; out.push([(1 - s) * (1 - s) * p1x + 2 * (1 - s) * s * bx + s * s * p2x, (1 - s) * (1 - s) * p1z + 2 * (1 - s) * s * bz + s * s * p2z]); }
    }
    out.push([pts[pts.length - 1][0], pts[pts.length - 1][1]]);
    return out;
  }
  P.fillet = fillet;

  /* 道の格ごとの見た目（妖魔シティ風：大通りはオレンジのタイル・通りはクリーム・小道はクリームの細い道） */
  const STYLE = {
    ave: { key: "walkY", o: { lamps: "yoma", lampEvery: 24, lampsBoth: false, trees: 18, treeKind: "poplar", benches: 56, bushes: false } },
    st: { key: "walkCream", o: { lamps: "yoma", lampEvery: 22, trees: 26, benches: 80, bushes: false } },
    lane: { key: "walkCream", o: { lamps: "yoma", lampEvery: 20, trees: false, benches: false, bushes: false } }
  };

  /* ══════════════ 道を敷く ══════════════ */
  P.buildNetwork = function (roads) {
    const w = this; w.net = [];
    roads.forEach(([id, pts, wd, cls]) => {
      const S = STYLE[cls] || STYLE.st, sp = fillet(pts, Math.max(8, wd * 1.1));
      const r0 = w.roads.length;
      w.route(sp, wd, S.key, Object.assign({ raw: true }, S.o));
      w.net.push({ id, pts: sp, w: wd, cls, r0, r1: w.roads.length });
    });
    w.buildJunctions();
  };

  /* ══════════════ 交わる所の丸い広場 ══════════════ */
  P.buildJunctions = function () {
    const w = this, net = w.net || [], J = [];
    const add = (x, z, r, key) => { for (const j of J) if (Math.hypot(j.x - x, j.z - z) < Math.max(j.r, r) * 0.8) { j.r = Math.max(j.r, r); if (key === "walkY") j.key = key; return; } J.push({ x, z, r, key }); };
    const own = new Set(); net.forEach((n) => { for (let i = n.r0; i < n.r1; i++) own.add(i); });
    /* ① 道の端が、ほかの道（ネットワーク・エリアの中の道）にかかる所 */
    net.forEach((n) => {
      [n.pts[0], n.pts[n.pts.length - 1]].forEach(([x, z]) => {
        let best = null, bd = 1e9;
        w.roads.forEach((r, i) => { if (i >= n.r0 && i < n.r1) return; if (r[4] < 4) return; const d = segD(x, z, r[0], r[1], r[2], r[3]); if (d < r[4] / 2 + 3 && d < bd) { bd = d; best = r; } });
        if (best) add(x, z, Math.max(n.w, Math.min(best[4], 18)) * 0.62 + 1.2, n.cls === "ave" ? "walkY" : "walkCream");
      });
    });
    /* ② ネットワークの道どうしが途中で交わる所（十字） */
    for (let a = 0; a < net.length; a++) for (let b = a + 1; b < net.length; b++) {
      const A = net[a], B = net[b];
      for (let i = 0; i < A.pts.length - 1; i++) for (let k = 0; k < B.pts.length - 1; k++) {
        const [ax, az] = A.pts[i], [bx, bz] = A.pts[i + 1], [cx, cz] = B.pts[k], [dx, dz] = B.pts[k + 1];
        const d1x = bx - ax, d1z = bz - az, d2x = dx - cx, d2z = dz - cz, den = d1x * d2z - d1z * d2x; if (Math.abs(den) < 1e-6) continue;
        const t = ((cx - ax) * d2z - (cz - az) * d2x) / den, u = ((cx - ax) * d1z - (cz - az) * d1x) / den;
        if (t < 0 || t > 1 || u < 0 || u > 1) continue;
        add(ax + d1x * t, az + d1z * t, Math.max(A.w, B.w) * 0.62 + 1.2, A.cls === "ave" || B.cls === "ave" ? "walkY" : "walkCream");
      }
    }
    /* ③ ネットワークの道がエリアの中の道と途中で交わる所 */
    net.forEach((A) => {
      w.roads.forEach((r, ri) => {
        if (own.has(ri) || r[4] < 5) return;
        for (let i = 0; i < A.pts.length - 1; i++) {
          const [ax, az] = A.pts[i], [bx, bz] = A.pts[i + 1], d1x = bx - ax, d1z = bz - az, d2x = r[2] - r[0], d2z = r[3] - r[1], den = d1x * d2z - d1z * d2x; if (Math.abs(den) < 1e-6) continue;
          const t = ((r[0] - ax) * d2z - (r[1] - az) * d2x) / den, u = ((r[0] - ax) * d1z - (r[1] - az) * d1x) / den;
          if (t < 0 || t > 1 || u < 0 || u > 1) continue;
          add(ax + d1x * t, az + d1z * t, Math.max(A.w, Math.min(r[4], 16)) * 0.62 + 1.2, A.cls === "ave" ? "walkY" : "walkCream");
        }
      });
    });
    const I = w.spotIndex();
    J.forEach((j) => {
      /* 建物にかかる広場は小さく */
      let r = j.r; while (r > 4 && (I.bld(j.x + r, j.z, 0) || I.bld(j.x - r, j.z, 0) || I.bld(j.x, j.z + r, 0) || I.bld(j.x, j.z - r, 0))) r -= 1;
      w.disk(j.x, j.z, r, j.key, 0.047);
      w.disk(j.x, j.z, r + 0.7, "stoneW", 0.045, r);
      if (r >= 10) w.disk(j.x, j.z, r * 0.42, j.key === "walkY" ? "walkCream" : "walkY", 0.049);          /* 大きな交差点は二重の輪（石だたみの模様） */
    });
    w.junctions = J;
  };

  /* ══════════════ エリアの門は道の上に ══════════════ */
  P.placeGates = function (Q) {
    const w = this, I = w.spotIndex(); w.gateFix = []; w.gateLinks = [];
    Q.forEach(([x, z, ry, area, style]) => {
      const a = typeof area === "string" ? XP.A[area] : area; if (!a) return;
      /* 門をくぐる向き（ry）にそって走る道だけを選ぶ（横切る道に置くと、門が道をふさぐ向きになる） */
      let best = null, bd = 1e9, bt = 0; const fx0 = Math.sin(ry), fz0 = Math.cos(ry);
      w.roads.forEach((r) => {
        if (r[4] < 5 || r[4] > 24) return; const d = segD(x, z, r[0], r[1], r[2], r[3]); if (d > 14) return;
        const L = Math.hypot(r[2] - r[0], r[3] - r[1]) || 1, al = Math.abs(((r[2] - r[0]) * fx0 + (r[3] - r[1]) * fz0) / L); if (al < 0.8) return;
        const sc = d + (1 - al) * 20; if (sc < bd) { bd = sc; best = r; bt = segT(x, z, r[0], r[1], r[2], r[3]); }
      });
      let gx = x, gz = z, gry = ry, span = style === "big" ? 20 : 15;
      if (best) {
        const dx = best[2] - best[0], dz = best[3] - best[1]; gx = best[0] + dx * bt; gz = best[1] + dz * bt; gry = Math.atan2(dx, dz); if (Math.cos(gry - ry) < 0) gry += Math.PI;
        span = Math.max(span, best[4] + 5);
      } else {
        /* ★★ 2026-09-30d 柱が道の上に立つ門は、門の向きにそって道からはなす（エリアの中の方へ）＝前はリゾートの門の柱が東の通りをふさいでいた */
        { const fx = Math.sin(ry), fz = Math.cos(ry), px = Math.cos(ry), pz = -Math.sin(ry), hs = span / 2;
          const bad = (cx, cz) => !!(I.road(cx + px * hs, cz + pz * hs, 1.0) || I.road(cx - px * hs, cz - pz * hs, 1.0));
          if (bad(x, z)) { const tw = Math.sign((a.cx - x) * fx + (a.cz - z) * fz) || 1; let best = null; for (const sg of [tw, -tw]) for (let d = 2; d <= 24 && !best; d += 2) { const cx = x + fx * sg * d, cz = z + fz * sg * d; if (bad(cx, cz) || I.bld(cx, cz, 1) || I.road(cx, cz, 0.5)) continue; best = { cx, cz }; } if (best) { x = best.cx; z = best.cz; gx = x; gz = z; } } }          /* エリアのまん中の方を先にさがす */
        /* 道がない門：門の前（向き）の方の近い道へ、まっすぐの道をつなぐ */
        const fx = Math.sin(ry), fz = Math.cos(ry); let tgt = null, td = 70;
        [-1, 1].forEach((sg) => { for (let d = 6; d < 70; d += 2) { const px = x + fx * sg * d, pz = z + fz * sg * d; if (I.bld(px, pz, 1) || I.water(px, pz)) break; const r = I.road(px, pz, 0); if (r && r[4] >= 4) { if (d < td) { td = d; tgt = [px, pz]; } break; } } });
        if (tgt) { w.route([[x, z], tgt], 10, "walkCream", { raw: true, lamps: "yoma", lampEvery: 20, trees: false, benches: false, bushes: false }); w.gateLinks.push([a.id, Math.round(td)]); span = Math.max(span, 14); }
        else if (I.road(x, z, 2)) { const r = I.road(x, z, 2); span = Math.max(span, Math.min(24, r[4] + 5)); }          /* 門の所が道・広場の上（エリアの中の道）：そのまま */
      }
      w.gateFix.push([a.id, Math.round(gx), Math.round(gz), +Math.hypot(gx - x, gz - z).toFixed(1)]);
      P.areaGate.call(w, gx, gz, gry, area, style, span);
    });
  };

  /* ══════════════ 入口・乗り場の前まで道を ══════════════ */
  P.linkDoors = function () {
    const w = this, I = w.spotIndex(), paved = w.paved || []; let made = 0, skip = 0;
    const onWay = (x, z, pad) => I.road(x, z, pad) || paved.some((q) => x > q[0] - pad && x < q[2] + pad && z > q[1] - pad && z < q[3] + pad);
    const clear = (x0, z0, x1, z1, wd) => { const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.ceil(L / 1.2)), nx = -(z1 - z0) / (L || 1), nz = (x1 - x0) / (L || 1); for (let k = 2; k <= n; k++) for (const o of [-wd / 2, 0, wd / 2]) { const x = x0 + (x1 - x0) * k / n + nx * o, z = z0 + (z1 - z0) * k / n + nz * o; if (I.bld(x, z, 0.3) || I.water(x, z) || !w.insideIsland(x, z, 4)) return false; const c = I.col(x, z, 0.1); if (c && !c.fence) return false; } return true; };
    (w.doors || []).forEach(([x, z, kind]) => {
      if (onWay(x, z, 5)) return;
      const ride = kind === "ride", wd = ride ? 5 : 4;
      /* いちばん近い道の点（直線で行ける所） */
      let best = null, bd = ride ? 120 : 60;
      w.roads.forEach((r) => { if (r[4] < 4) return; const t = segT(x, z, r[0], r[1], r[2], r[3]), px = r[0] + (r[2] - r[0]) * t, pz = r[1] + (r[3] - r[1]) * t, d = Math.hypot(px - x, pz - z); if (d < bd && clear(x, z, px, pz, wd)) { bd = d; best = [px, pz]; } });
      if (!best) { skip++; return; }
      w.route([[x, z], best], wd, "walkCream", { raw: true, lamps: bd > 30 ? "yoma" : false, lampEvery: 18, trees: false, benches: false, bushes: false, curb: false });
      w.disk(x, z, wd * 0.7 + 1, "walkCream", 0.05);
      made++;
    });
    w._doorLinks = { made, skip };
  };

  /* ══════════════ 道の行き止まり（つながっていそうで、つながっていない所）をつなぐ ══════════════
     ★★ 2026-10-02 ご指定「エリアの配置と道がつながっているようでつながっていない部分」の仕上げ。
     配置図の道（w.net）の両はしを調べて、ほかの道・広場・床の上にない端は：
       ① 道の向きの先 48m 以内に道・広場があれば、そこまでまっすぐのばす（同じ幅・同じ色の道）
       ② だめなら、いちばん近い道・広場へ（150m 以内・建物・水・当たり・コースを通らない所）まっすぐの小道でつなぐ
       ③ それもだめなら、端に小さな「ひと休み広場」（丸い石だたみ・ベンチ・街灯・花）＝目的地のある終わり方にする
     門・建物の入口が目の前（12m 以内）の端は、そのままでよい（そこが目的地）。 */
  P.closeGaps = function () {
    const w = this, net = w.net || []; if (!net.length) return;
    const I = w.spotIndex(), paved = w.paved || [], shapes = w.groundShapes || [], doors = w.doors || [];
    const GS = 16, G = new Map(), R = w.roads;
    const gAdd = (r, i) => { const x0 = Math.min(r[0], r[2]) - r[4], x1 = Math.max(r[0], r[2]) + r[4], z0 = Math.min(r[1], r[3]) - r[4], z1 = Math.max(r[1], r[3]) + r[4]; for (let gx = Math.floor(x0 / GS); gx <= Math.floor(x1 / GS); gx++) for (let gz = Math.floor(z0 / GS); gz <= Math.floor(z1 / GS); gz++) { const k = gx * 4096 + gz; if (!G.has(k)) G.set(k, []); G.get(k).push(i); } };
    R.forEach(gAdd);
    /* (x, z) がほかの道の上か（自分の道 r0..r1 はのぞく） */
    const onRoad = (x, z, n, pad) => { const a = G.get(Math.floor(x / GS) * 4096 + Math.floor(z / GS)); if (!a) return null; for (const i of a) { if (n && i >= n.r0 && i < n.r1) continue; const r = R[i]; if (r[4] < 3) continue; if (segD(x, z, r[0], r[1], r[2], r[3]) < r[4] / 2 + pad) return r; } return null; };
    const onPaved = (x, z, pad) => paved.some((q) => x > q[0] - pad && x < q[2] + pad && z > q[1] - pad && z < q[3] + pad) ||
      shapes.some((s) => s.c ? Math.hypot(x - s.c[0], z - s.c[1]) < s.c[2] + pad : s.e ? ((x - s.e[0]) / (s.e[2] + pad)) ** 2 + ((z - s.e[1]) / (s.e[3] + pad)) ** 2 < 1 : x > s.r[0] - pad && x < s.r[2] + pad && z > s.r[1] - pad && z < s.r[3] + pad);
    const blocked = (x, z) => {
      if (!w.insideIsland(x, z, 4) || I.water(x, z) || I.bld(x, z, 0.8)) return true;
      const c = I.col(x, z, 0.2); if (c && !(c.t === "c" && c.r < 0.7)) return true;
      if (w.onTrack && w.onTrack(x, z, 1)) return true;
      return false;
    };
    const clear = (x0, z0, x1, z1, wd) => {
      const L = Math.hypot(x1 - x0, z1 - z0), m = Math.max(1, Math.ceil(L / 1.2)), nx = -(z1 - z0) / (L || 1), nz = (x1 - x0) / (L || 1);
      for (let k = 1; k <= m; k++) for (const o of [-wd / 2 + 0.4, 0, wd / 2 - 0.4]) { const x = x0 + (x1 - x0) * k / m + nx * o, z = z0 + (z1 - z0) * k / m + nz * o; if (blocked(x, z)) return false; }
      return true;
    };
    const stat = { ext: 0, link: 0, cap: 0, ok: 0, list: [] };
    const join = (x, z, wd, key) => { w.disk(x, z, wd * 0.62 + 1.2, key, 0.047); w.disk(x, z, wd * 0.62 + 1.9, "stoneW", 0.045, wd * 0.62 + 1.2); };
    net.forEach((n) => {
      const S = STYLE[n.cls] || STYLE.st, key = S.key;
      [0, 1].forEach((e) => {
        const P0 = e ? n.pts[n.pts.length - 1] : n.pts[0];
        /* 端の向き（3m 手前から端へ） */
        let Q = null; for (let i = 1; i < n.pts.length; i++) { const q = e ? n.pts[n.pts.length - 1 - i] : n.pts[i]; if (Math.hypot(q[0] - P0[0], q[1] - P0[1]) > 2.5) { Q = q; break; } }
        if (!Q) return;
        const [x, z] = P0, L0 = Math.hypot(x - Q[0], z - Q[1]), ux = (x - Q[0]) / L0, uz = (z - Q[1]) / L0;
        if (onRoad(x, z, n, 0.5) || onPaved(x, z, 0.3)) { stat.ok++; return; }
        /* 門・建物の入口が目の前 */
        if (doors.some(([dx, dz]) => Math.hypot(dx - x, dz - z) < 12)) { stat.ok++; return; }
        /* ① まっすぐのばす */
        for (let s = 1; s <= 48; s += 1) {
          const px = x + ux * s, pz = z + uz * s;
          if (blocked(px, pz)) break;
          if (onRoad(px, pz, n, -0.6) || onPaved(px, pz, -0.4)) {
            if (!clear(x, z, px, pz, n.w * 0.9)) break;
            const ex = px + ux * 1.6, ez = pz + uz * 1.6;
            w.route([[x - ux * 0.5, z - uz * 0.5], [ex, ez]], n.w, key, { raw: true, lamps: s > 18 ? "yoma" : false, lampEvery: 20, trees: false, benches: false, bushes: false });
            join(px, pz, n.w, key);
            stat.ext++; stat.list.push(n.id + ":" + e + " +" + s + "m"); return;
          }
        }
        /* ② いちばん近い道・広場へ（後ろ向きにはもどらない） */
        const cands = [];
        const seen = new Set();
        for (let gx = Math.floor((x - 150) / GS); gx <= Math.floor((x + 150) / GS); gx++) for (let gz = Math.floor((z - 150) / GS); gz <= Math.floor((z + 150) / GS); gz++) {
          const a = G.get(gx * 4096 + gz); if (!a) continue;
          for (const i of a) {
            if (seen.has(i) || (i >= n.r0 && i < n.r1)) continue; seen.add(i);
            const r = R[i]; if (r[4] < 4) continue;
            const t = segT(x, z, r[0], r[1], r[2], r[3]), qx = r[0] + (r[2] - r[0]) * t, qz = r[1] + (r[3] - r[1]) * t, d = Math.hypot(qx - x, qz - z);
            if (d > 150 || d < 2) continue;
            if (((qx - x) * ux + (qz - z) * uz) / d < -0.2) continue;
            cands.push([d, qx, qz]);
          }
        }
        paved.forEach((q) => { const qx = Math.max(q[0], Math.min(q[2], x)), qz = Math.max(q[1], Math.min(q[3], z)), d = Math.hypot(qx - x, qz - z); if (d > 2 && d < 150 && ((qx - x) * ux + (qz - z) * uz) / d > -0.2) cands.push([d + 4, qx, qz]); });
        cands.sort((a, b) => a[0] - b[0]);
        const wd = Math.min(n.w, 8);
        for (let k = 0; k < cands.length && k < 40; k++) {
          const [d, qx, qz] = cands[k], vx = (qx - x) / d, vz = (qz - z) / d, tx = qx + vx * 1.5, tz = qz + vz * 1.5;
          if (!clear(x, z, qx - vx * 1.2, qz - vz * 1.2, wd)) continue;
          w.route([[x - ux * 0.5, z - uz * 0.5], [tx, tz]], wd, "walkCream", { raw: true, lamps: d > 26 ? "yoma" : false, lampEvery: 22, trees: false, benches: false, bushes: false });
          join(x, z, wd, "walkCream"); join(qx, qz, wd, "walkCream");
          stat.link++; stat.list.push(n.id + ":" + e + " link " + Math.round(d) + "m"); return;
        }
        /* ③ ひと休み広場（道の先の小さな目的地） */
        const cx = x + ux * 4.2, cz = z + uz * 4.2;
        if (!blocked(cx, cz)) {
          w.disk(cx, cz, 6.4, "walkCream", 0.046); w.disk(cx, cz, 7.1, "stoneW", 0.044, 6.4);
          w.disk(cx, cz, 2.2, "walkY", 0.048);
          const px = -uz, pz = ux;
          [-1, 1].forEach((sd) => { if (w.bench) w.bench(cx + px * sd * 4.6 + ux * 1.2, cz + pz * sd * 4.6 + uz * 1.2, Math.atan2(-px * sd, -pz * sd)); if (w.lamp) w.lamp(cx + px * sd * 5.6 - ux * 2.4, cz + pz * sd * 5.6 - uz * 2.4, "yoma"); });
          if (w.flowers) w.flowers(cx + ux * 5.4, cz + uz * 5.4, 4.2, 1.2, Math.atan2(px, pz), 14);
          stat.cap++; stat.list.push(n.id + ":" + e + " plaza");
        }
      });
    });
    w._gapStat = stat;
  };

  /* ══════════════ エリアの範囲を中身に合わせる ══════════════ */
  P.refitAreas = function () {
    const w = this, A = XP.A, KEEP = { marketW: 1, marketE: 1, green: 1, tower: 1, dome: 1, gate: 1, fountain: 1, beach: 1, resort: 1, ngx: 1, mf: 1, ishida: 1, fun: 1, mburst: 1, mbr: 1, gacha: 1 };          /* ★★ 2026-09-30d 新しい地区は計画した範囲のまま（入口の広場まで） */
    (w.caps || []).forEach((rec) => {
      const id = rec.ids[0], a = A[id]; if (!a || KEEP[id] || rec.ids.length > 1 && id !== "motor" && id !== "metro") return;
      const b = [1e9, 1e9, -1e9, -1e9], add = (x, z) => { if (x < b[0]) b[0] = x; if (z < b[1]) b[1] = z; if (x > b[2]) b[2] = x; if (z > b[3]) b[3] = z; };
      w.casters.slice(rec.s0.lists.casters, rec.s1.lists.casters).forEach((c) => c.pts.forEach(([x, z]) => add(x, z)));
      w.colliders.slice(rec.s0.lists.colliders, rec.s1.lists.colliders).forEach((c) => { if (c.x1 - c.x0 < 300 && c.z1 - c.z0 < 300) { add(c.x0, c.z0); add(c.x1, c.z1); } });
      (w.paved || []).slice(rec.s0.lists.paved, rec.s1.lists.paved).forEach((q) => { add(q[0], q[1]); add(q[2], q[3]); });
      if (b[0] > 1e8) return;
      const old = [a.x0, a.z0, a.x1, a.z1], zn = w.zones.find((z) => z.name === a.n + " " + a.name);
      a.x0 = Math.round(b[0] - 6); a.z0 = Math.round(b[1] - 6); a.x1 = Math.round(b[2] + 6); a.z1 = Math.round(b[3] + 6); a.cx = (a.x0 + a.x1) / 2; a.cz = (a.z0 + a.z1) / 2;
      if (zn && zn.x0 === old[0] && zn.z0 === old[1]) { zn.x0 = a.x0; zn.z0 = a.z0; zn.x1 = a.x1; zn.z1 = a.z1; }
    });
  };

  /* ══════════════ 調べる（道と建物・当たり・水） ══════════════ */
  P.netReport = function () {
    const w = this, I = w.spotIndex(), out = { bld: [], col: [], water: [], gatesOff: (w.gateFix || []).filter((g) => g[3] > 3), gateLinks: w.gateLinks || [], doors: w._doorLinks || null, junctions: (w.junctions || []).length };
    (w.net || []).forEach((n) => {
      for (let i = 0; i < n.pts.length - 1; i++) {
        const [ax, az] = n.pts[i], [bx, bz] = n.pts[i + 1], L = Math.hypot(bx - ax, bz - az), m = Math.max(1, Math.ceil(L / 2)), nx = -(bz - az) / (L || 1), nz = (bx - ax) / (L || 1);
        for (let k = 0; k <= m; k++) for (const o of [-(n.w / 2 - 0.6), 0, n.w / 2 - 0.6]) {
          const x = ax + (bx - ax) * k / m + nx * o, z = az + (bz - az) * k / m + nz * o;
          if (I.bld(x, z, 0)) { out.bld.push([n.id, Math.round(x), Math.round(z)]); k = m + 1; break; }
          const c = I.col(x, z, 0); if (c && !c.fence && !(c.t === "c" && c.r < 0.6)) { out.col.push([n.id, Math.round(x), Math.round(z), c.t || "box"]); k = m + 1; break; }
          if (o === 0 && I.water(x, z) && !(w.heightExtra || []).some((q) => Math.hypot(q.cx - x, q.cz - z) < 30)) { out.water.push([n.id, Math.round(x), Math.round(z)]); k = m + 1; break; }
        }
      }
    });
    return out;
  };
})();
