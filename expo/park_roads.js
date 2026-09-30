/* ══════════════════════════════════════════════════════════════════
   XEVARION PARK — 道のネットワーク（★★ 2026-09-30 ご指定「「重要」それぞれの道がズレていたり途切れていたりめり込んでいたり…
   エリアの配置も改善して全て重点的に見直して妖魔シティ風に。パーク内の道はお客さんが楽しむための導線として重要な建造物」）
   ------------------------------------------------------------------
   4m のます目で道を探す（A*）。建物・当たり・池・カートのコース・海ぎわは通れない（川は橋がかかるので高いが通れる）。
   いまある道・広場は安く通れる → すでにある道をなるべく使い、足りない所だけ新しく敷く（二重の道にならない）。
     ① つなぐ組（門・広場・通りの端）どうしを結ぶ（回り道ができるように輪にする）
     ② 門のまん中に道が通っていなければ、門をまっすぐ通る道を敷く
     ③ 道のかたまりが本線（噴水公園）とつながっていなければ、いちばん近い本線へつなぐ（島じゅうが1つの道でつながる）
     ④ 行き止まり：いちばん近い道へつなぐ。つなげない所は小さな「ひと休み広場」（石灯籠・ベンチ）で終わらせる
   結果はこの端末に保存（建物・道・当たりの数が同じなら次からは計算しない）。
   ══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const T = THREE, P = XWorld.World.prototype, XP = XPark;
  const VER = "r9";
  const CS = 4, X0 = -900, Z0 = -700, NX = 450, NZ = 440, N = NX * NZ, INF = 1e9, ROAD = 0.3;
  const segD = (x, z, x0, z0, x1, z1) => { const dx = x1 - x0, dz = z1 - z0, l2 = dx * dx + dz * dz; let t = l2 ? ((x - x0) * dx + (z - z0) * dz) / l2 : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(x - (x0 + dx * t), z - (z0 + dz * t)); };
  const inPoly = (x, z, pts) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, zi] = pts[i], [xj, zj] = pts[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
  const cx = (i) => X0 + (i % NX) * CS + CS / 2, cz = (i) => Z0 + Math.floor(i / NX) * CS + CS / 2;
  const cellOf = (x, z) => { const ix = Math.floor((x - X0) / CS), iz = Math.floor((z - Z0) / CS); return ix < 0 || iz < 0 || ix >= NX || iz >= NZ ? -1 : iz * NX + ix; };
  const fillRect = (x0, z0, x1, z1, f) => { const i0 = Math.max(0, Math.floor((x0 - X0) / CS)), i1 = Math.min(NX - 1, Math.floor((x1 - X0) / CS)), j0 = Math.max(0, Math.floor((z0 - Z0) / CS)), j1 = Math.min(NZ - 1, Math.floor((z1 - Z0) / CS)); for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) f(j * NX + i, X0 + i * CS + CS / 2, Z0 + j * CS + CS / 2); };

  /* ── 通りやすさのます目 ── */
  function buildCost(w) {
    const C = new Float32Array(N).fill(1);
    for (let i = 0; i < N; i++) { if (!w.insideIsland(cx(i), cz(i), 10)) C[i] = INF; }
    /* エリアの中は少し高く（エリアの門と道を使う） */
    XP.AREAS.forEach((a) => { const soft = /^(marketW|marketE|green|gate|fountain|apps|yokai)$/.test(a.id); fillRect(a.x0, a.z0, a.x1, a.z1, (i) => { if (C[i] < INF) C[i] = Math.max(C[i], soft ? 1.3 : 2.4); }); });
    /* 建物（2.5m ふくらませる）。門のアーチはくぐれる */
    w.casters.forEach((c) => { if (c.h < 1.5 || c.gate) return; let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; c.pts.forEach(([x, z]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); });
      fillRect(x0 - 3, z0 - 3, x1 + 3, z1 + 3, (i, x, z) => { if (inPoly(x, z, c.pts)) { C[i] = INF; return; } for (let k = 0; k < c.pts.length; k++) { const a = c.pts[k], b = c.pts[(k + 1) % c.pts.length]; if (segD(x, z, a[0], a[1], b[0], b[1]) < 2.5) { C[i] = INF; return; } } }); });
    /* 当たり（柵・壁・噴水・柱…） */
    const I = w.spotIndex();
    for (let i = 0; i < N; i++) { if (C[i] >= INF) continue; if (I.col(cx(i), cz(i), 1.2)) C[i] = INF; }
    /* 水：川は橋ができるので高いが通れる。池・湖は通れない */
    const RIV = []; (w.rivers || []).forEach((rv) => { for (let k = 0; k < rv.pts.length - 1; k++) RIV.push([rv.pts[k][0], rv.pts[k][1], rv.pts[k + 1][0], rv.pts[k + 1][1], rv.w / 2 + 2]); });
    for (let i = 0; i < N; i++) { if (C[i] >= INF) continue; const x = cx(i), z = cz(i); if (w.isWater(x, z) || w.isWater(x + 1.5, z) || w.isWater(x, z + 1.5)) { let riv = false; for (const r of RIV) { if (Math.abs(x - r[0]) > 60 && Math.abs(x - r[2]) > 60) continue; if (segD(x, z, r[0], r[1], r[2], r[3]) < r[4]) { riv = true; break; } } C[i] = riv ? 9 : INF; } }
    /* カートのコース */
    if (w.circuit) { const p = w.circuit.pts; for (let k = 0; k < p.length; k += 2) { const a = p[k], b = p[(k + 2) % p.length]; fillRect(Math.min(a.x, b.x) - 16, Math.min(a.z, b.z) - 16, Math.max(a.x, b.x) + 16, Math.max(a.z, b.z) + 16, (i, x, z) => { if (segD(x, z, a.x, a.z, b.x, b.z) < 15) C[i] = INF; }); } }
    /* カートのコースなど（道ではない）の上は通らない */
    (w.blockPaths || []).forEach((bp) => { for (let k = 0; k < bp.pts.length; k++) { const a = bp.pts[k], b = bp.pts[(k + 1) % bp.pts.length]; fillRect(Math.min(a[0], b[0]) - bp.w, Math.min(a[1], b[1]) - bp.w, Math.max(a[0], b[0]) + bp.w, Math.max(a[1], b[1]) + bp.w, (i, x, z) => { if (segD(x, z, a[0], a[1], b[0], b[1]) < bp.w / 2 + 3) C[i] = INF; }); } });
    /* いまある道・広場は安い */
    (w.paved || []).forEach((q) => fillRect(q[0], q[1], q[2], q[3], (i) => { if (C[i] < INF) C[i] = ROAD; }));
    w.roads.forEach((r) => { if (r[4] < 4) return; fillRect(Math.min(r[0], r[2]) - r[4], Math.min(r[1], r[3]) - r[4], Math.max(r[0], r[2]) + r[4], Math.max(r[1], r[3]) + r[4], (i, x, z) => { if (C[i] < INF && segD(x, z, r[0], r[1], r[2], r[3]) < r[4] / 2) C[i] = ROAD; }); });
    /* 歩道橋・太鼓橋（コースや池をまたぐ）は通れる道 */
    (w.heightExtra || []).forEach((h) => { if (!h.arch) return; const ax = Math.sin(h.ang), az = Math.cos(h.ang), R = Math.hypot(h.hw, h.hl); fillRect(h.cx - R, h.cz - R, h.cx + R, h.cz + R, (i, x, z) => { const dx = x - h.cx, dz = z - h.cz, a = dx * ax + dz * az, b = dx * az - dz * ax; if (Math.abs(a) < h.hl + 2 && Math.abs(b) < Math.max(2, h.hw)) C[i] = ROAD; }); });
    return C;
  }

  /* ── ★★ 2026-09-30b 建物までの距離（m・ます目のまん中から建物の形まで）。広い道ほど建物から離れた所だけを通す
     （前は 2.5m しか離さず、幅 12m の道は建物に 3.5m もめりこんでいた＝ご指定「道や柵や壁が建物を貫いていたり」） ── */
  let DB = null;
  function buildDist(w) {
    const D = new Float32Array(N).fill(99);
    w.casters.forEach((c) => { if (c.h < 2 || c.gate) return; let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; c.pts.forEach(([x, z]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); });
      fillRect(x0 - 12, z0 - 12, x1 + 12, z1 + 12, (i, x, z) => { if (D[i] === 0) return; if (inPoly(x, z, c.pts)) { D[i] = 0; return; } let d = 99; for (let k = 0; k < c.pts.length; k++) { const a = c.pts[k], b = c.pts[(k + 1) % c.pts.length]; const q = segD(x, z, a[0], a[1], b[0], b[1]); if (q < d) d = q; } if (d < D[i]) D[i] = d; }); });
    return D;
  }

  /* ── 探索（8方向）：goal はます目の番号か、判定の関数（いちばん近い本線など）。clr＝新しく敷くます目に要る建物までの距離 ── */
  function search(C, starts, goal, maxExp, clr) {
    const gS = new Float32Array(N).fill(INF), came = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
    const heap = [], push = (i, f) => { heap.push([f, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; const t = heap[p]; heap[p] = heap[k]; heap[k] = t; k = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = k * 2 + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; const t = heap[m]; heap[m] = heap[k]; heap[k] = t; k = m; } } return top; };
    const isG = typeof goal === "function" ? goal : (i) => i === goal;
    const gx = typeof goal === "number" ? goal % NX : 0, gz = typeof goal === "number" ? Math.floor(goal / NX) : 0;
    const H = typeof goal === "number" ? (i) => { const dx = Math.abs(i % NX - gx), dz = Math.abs(Math.floor(i / NX) - gz); return (Math.max(dx, dz) + 0.414 * Math.min(dx, dz)) * ROAD * 1.8; } : () => 0;
    starts.forEach((s) => { gS[s] = 0; came[s] = -2; push(s, H(s)); });
    const NB = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
    let exp = 0, end = -1;
    while (heap.length) {
      const [, i] = pop(); if (closed[i]) continue; closed[i] = 1;
      if (isG(i)) { end = i; break; }
      if (++exp > (maxExp || 400000)) return null;
      const ix = i % NX, iz = Math.floor(i / NX);
      for (const [dx, dz, k] of NB) { const jx = ix + dx, jz = iz + dz; if (jx < 0 || jz < 0 || jx >= NX || jz >= NZ) continue; const j = jz * NX + jx; if (C[j] >= INF || closed[j]) continue; if (dx && dz && (C[iz * NX + jx] >= INF || C[jz * NX + ix] >= INF)) continue; if (clr && DB[j] < clr && C[j] > ROAD + 1e-6 && !isG(j)) continue; const ng = gS[i] + k * (C[i] + C[j]) / 2; if (ng < gS[j]) { gS[j] = ng; came[j] = i; push(j, ng + H(j)); } }
    }
    if (end < 0) return null;
    const path = []; for (let i = end; i >= 0; i = came[i]) path.push(i);
    return path.reverse();
  }
  const nearestOpen = (C, x, z, R, clr) => { const okC = (j) => C[j] < INF && !(clr && DB && DB[j] < clr && C[j] > ROAD + 1e-6); const c0 = cellOf(x, z); if (c0 >= 0 && okC(c0)) return c0; let best = -1, bd = 1e9; const ix = Math.floor((x - X0) / CS), iz = Math.floor((z - Z0) / CS), rr = Math.ceil((R || 16) / CS); for (let dz = -rr; dz <= rr; dz++) for (let dx = -rr; dx <= rr; dx++) { const jx = ix + dx, jz = iz + dz; if (jx < 0 || jz < 0 || jx >= NX || jz >= NZ) continue; const j = jz * NX + jx; if (!okC(j)) continue; const d = dx * dx + dz * dz; if (d < bd) { bd = d; best = j; } } return best; };

  /* 新しく敷く部分だけ取り出し（道でない所の連続）、まっすぐにしてからなめらかに */
  function newRuns(C, path, minLen) {
    const runs = []; let cur = null;
    for (let k = 0; k < path.length; k++) {
      const onR = C[path[k]] <= ROAD + 1e-6;
      if (!onR) { if (!cur) { cur = []; if (k > 0) cur.push(path[k - 1]); } cur.push(path[k]); }
      else if (cur) { cur.push(path[k]); if (cur.length >= (minLen || 4)) runs.push(cur); cur = null; }
    }
    if (cur && cur.length >= (minLen || 4)) runs.push(cur);
    return runs;
  }
  function losOK(C, a, b, clr) { const ax = cx(a), az = cz(a), bx = cx(b), bz = cz(b), L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L / 1.5)); for (let k = 1; k < n; k++) { const c = cellOf(ax + (bx - ax) * k / n, az + (bz - az) * k / n); if (c < 0 || C[c] >= INF || C[c] > 2.5) return false; if (clr && DB && DB[c] < clr && C[c] > ROAD + 1e-6) return false; } return true; }
  function simplify(C, run, clr) { const out = [run[0]]; let i = 0; while (i < run.length - 1) { let j = run.length - 1; while (j > i + 1 && !losOK(C, run[i], run[j], clr)) j--; out.push(run[j]); i = j; } return out.map((c) => [cx(c), cz(c)]); }
  function chaikin(pts, it) { for (let k = 0; k < it; k++) { if (pts.length < 3) return pts; const o = [pts[0]]; for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1]; o.push([ax * 0.75 + bx * 0.25, az * 0.75 + bz * 0.25], [ax * 0.25 + bx * 0.75, az * 0.25 + bz * 0.75]); } o.push(pts[pts.length - 1]); pts = o; } return pts; }
  function markRoad(C, pts, wd) { for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1]; fillRect(Math.min(ax, bx) - wd, Math.min(az, bz) - wd, Math.max(ax, bx) + wd, Math.max(az, bz) + wd, (c, x, z) => { if (C[c] < INF && segD(x, z, ax, az, bx, bz) < wd / 2 + 1) C[c] = ROAD; }); } }
  const blockedLine = (C, pts) => pts.some(([x, z], k) => { const c = cellOf(x, z); if (c < 0 || C[c] >= INF) return true; if (k) { const [px, pz] = pts[k - 1], L = Math.hypot(x - px, z - pz), n = Math.ceil(L / 2); for (let q = 1; q < n; q++) { const cc = cellOf(px + (x - px) * q / n, pz + (z - pz) * q / n); if (cc < 0 || C[cc] >= INF) return true; } } return false; });

  /* ══════════════ 道を敷く ══════════════ */
  P.planRoads = function (gates) {
    const w = this, t0 = performance.now();
    const G = {}; (gates || []).forEach(([x, z, ry, area]) => { const id = typeof area === "string" ? area : area.id; (G[id] = G[id] || []).push([x, z, ry]); });
    const g = (id, k) => (G[id] && G[id][k || 0]) || null;
    const NODES = {
      FN: [0, 164], FS: [0, 418], FE: [126, 290], FW: [-126, 290], HALLN: [0, -98],
      MKW1: [-114, 523], MKE1: [114, 523], MKW2: [-114, 743], MKE2: [114, 743],
      APPSE: [300, 890], YOKW: [-300, 890], BEACHP: [-430, 872], YUKW: [586, 724]
    };
    const P2 = (id) => NODES[id] || g(id) || (id.endsWith("2") ? g(id.slice(0, -1), 1) : null);
    const EDGES = [
      ["FW", "metro"], ["FE", "game"], ["metro", "ent"], ["ent", "adv"], ["adv", "shrine"], ["shrine", "space"], ["space", "metro"],
      ["FS", "MKW1"], ["lab", "MKW1"], ["aqua", "lab"], ["aqua", "BEACHP"], ["ballpark", "MKW2"], ["YOKW", "BEACHP"], ["ballpark", "aqua"],
      ["APPSE", "sports"], ["sports", "boccia"], ["boccia", "MKE2"], ["media", "MKE1"], ["media", "FE"], ["media", "puzzle"], ["puzzle", "puzzle2"],
      ["game", "night"], ["night", "heights"], ["heights", "resort"], ["resort", "ngx"], ["ngx", "soccer"], ["soccer", "learn"], ["learn", "FN"],
      ["learn", "harbor2"], ["harbor", "motor"], ["harbor", "harbor2"], ["motor", "HALLN"], ["night2", "resort"], ["night2", "night"],
      ["kabuki", "puzzle2"], ["kabuki", "night2"], ["sports", "YUKW"], ["YUKW", "kabuki"], ["ent", "HALLN"], ["learn", "heights"]
    ].concat(w.roadEdges || []);
    const sig = [VER, XP.AREAS.length, w.casters.length, w.roads.length, w.colliders.length, EDGES.length, (gates || []).length, (w.paved || []).length].join(":"), key = "xeva_roadnet_" + sig;
    let saved = null; try { saved = JSON.parse(localStorage.getItem(key) || "null"); } catch (e) {}
    const lay = (pts, wd, kind) => {
      if (pts.length < 2) return;
      if (kind === "cap") { const [x, z, a] = pts[0]; capPlaza(w, x, z, a); return; }
      w.route(pts, wd, wd >= 11 ? "walkY" : "walkCream", { raw: true, lamps: "yoma", lampEvery: wd >= 11 ? 24 : 20, trees: wd >= 11 ? 22 : false, treeKind: "poplar", benches: wd >= 11 ? 64 : false, bushes: false });
    };
    if (saved && Array.isArray(saved.r) && !window.__noRoadCache) { saved.r.forEach(([wd, pts, kind]) => lay(pts, wd, kind)); w._roadPlanPts = saved.r; w._roadPlan = { cached: true, n: saved.r.length, ms: Math.round(performance.now() - t0) }; return; }
    const C = buildCost(w), out = []; DB = buildDist(w);
    /* ★★ 2026-09-30b 道のふちまで建物にかからないかを本物の形で 1m ごとに調べる（前は道のまん中の線だけ・角を丸めたとき／
       入口の点に置きかえたときに建物を横切っていた）。広い道が通れない所は幅をせまくして敷く */
    const BG = new Map(), BGS = 16;
    w.casters.forEach((c) => { if (c.h < 2.5 || c.gate) return; let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; c.pts.forEach(([x, z]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); });
      for (let gx = Math.floor((x0 - 8) / BGS); gx <= Math.floor((x1 + 8) / BGS); gx++) for (let gz = Math.floor((z0 - 8) / BGS); gz <= Math.floor((z1 + 8) / BGS); gz++) { const k = gx * 4096 + gz; let a = BG.get(k); if (!a) BG.set(k, a = []); a.push(c); } });
    const bldAt = (x, z, pad) => { const a = BG.get(Math.floor(x / BGS) * 4096 + Math.floor(z / BGS)); if (a) for (const c of a) { if (inPoly(x, z, c.pts)) return c; for (let k = 0; k < c.pts.length; k++) { const p = c.pts[k], q = c.pts[(k + 1) % c.pts.length]; if (segD(x, z, p[0], p[1], q[0], q[1]) < pad) return c; } } return null; };
    const hitB = (pts, wd, s0, s1) => { const pad = Math.max(0.3, wd / 2 - 0.2), [fx, fz] = pts[0], [lx, lz] = pts[pts.length - 1];
      for (let k = 1; k < pts.length; k++) { const [ax, az] = pts[k - 1], [bx, bz] = pts[k], L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L)); for (let q = 0; q <= n; q++) { const x = ax + (bx - ax) * q / n, z = az + (bz - az) * q / n; if (s0 && Math.hypot(x - fx, z - fz) < s0) continue; if (s1 && Math.hypot(x - lx, z - lz) < s1) continue; if (bldAt(x, z, pad)) return true; } } return false; };
    const okPts = (pts, wd, s0, s1) => !!pts && pts.length >= 2 && !blockedLine(C, s0 ? pts.slice(1) : pts) && !hitB(pts, wd, s0, s1);
    const clrOf = (wd) => wd / 2 + 0.8, J = CS * 1.6;          /* J＝前からある道とのつなぎ目は少し近くてもよい */
    const put = (pts, wd, kind) => { const q = kind === "cap" ? pts : pts.map(([x, z]) => [+x.toFixed(1), +z.toFixed(1)]); out.push(kind ? [wd, q, kind] : [wd, q]); if (kind !== "cap") markRoad(C, pts, wd); lay(q, wd, kind); };
    const runPts = (run, sm, wd, s0, s1) => { const clr = clrOf(wd) - 0.6; let pts = chaikin(simplify(C, run, clr), sm); if (okPts(pts, wd, s0, s1)) return pts; pts = simplify(C, run, clr); if (okPts(pts, wd, s0, s1)) return pts; pts = run.map((c) => [cx(c), cz(c)]); return okPts(pts, wd, s0, s1) ? pts : null; };
    const st = { made: 0, gate: 0, comp: 0, dead: 0, cap: 0, narrow: 0, fail: [] };

    /* ① つなぐ組（幅 12m → 9m → 6m） */
    EDGES.forEach(([a, b]) => {
      const pa = P2(a), pb = P2(b); if (!pa || !pb) { st.fail.push(a + "-" + b + "(no node)"); return; }
      for (const wd of [12, 9, 6]) {
        const clr = clrOf(wd), s0 = nearestOpen(C, pa[0], pa[1], 24, clr), e0 = nearestOpen(C, pb[0], pb[1], 24, clr); if (s0 < 0 || e0 < 0) continue;
        const path = search(C, [s0], e0, 0, clr); if (!path) continue;
        const L = newRuns(C, path).map((run) => runPts(run, 2, wd, J, J)); if (L.some((p) => !p)) continue;
        L.forEach((pts) => { put(pts, wd); st.made++; }); if (wd < 12) st.narrow++; return;
      }
      st.fail.push(a + "-" + b);
    });

    /* ② 門をまっすぐ通る道 */
    (gates || []).forEach(([x, z, ry, area, style]) => {
      const nx = Math.sin(ry), nz = Math.cos(ry);
      const cells = []; for (let d = -16; d <= 16; d += 2) { const c = cellOf(x + nx * d, z + nz * d); if (c >= 0 && cells[cells.length - 1] !== c) cells.push(c); }
      if (cells.every((c) => C[c] <= ROAD + 1e-6)) return;
      if (cells.some((c) => C[c] >= INF)) { const c2 = cells.filter((c, k) => k > 1 && k < cells.length - 2); if (!c2.length || c2.some((c) => C[c] >= INF)) return; }
      newRuns(C, cells, 2).forEach((run) => { const pts = [[cx(run[0]), cz(run[0])], [cx(run[run.length - 1]), cz(run[run.length - 1])]]; if (blockedLine(C, pts)) return;
        for (const wd of style === "big" ? [12, 8, 6] : [9, 6]) { if (hitB(pts, wd)) continue; put(pts, wd); st.gate++; return; }
        st.fail.push("gate@" + Math.round(x) + "," + Math.round(z)); });
    });

    /* ③ 道のかたまりを本線へ */
    const comps = () => { const L = new Int32Array(N).fill(-1), sizes = []; let n = 0; for (let i = 0; i < N; i++) { if (C[i] > ROAD + 1e-6 || L[i] >= 0) continue; const q = [i]; L[i] = n; let sz = 0; while (q.length) { const c = q.pop(); sz++; const ix = c % NX, iz = Math.floor(c / NX); for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const jx = ix + dx, jz = iz + dz; if (jx < 0 || jz < 0 || jx >= NX || jz >= NZ) continue; const j = jz * NX + jx; if (L[j] < 0 && C[j] <= ROAD + 1e-6) { L[j] = n; q.push(j); } } } sizes.push(sz); n++; } return { L, sizes }; };
    for (let pass = 0; pass < 3; pass++) {
      const { L, sizes } = comps(); let main = 0; sizes.forEach((sz, k) => { if (sz > sizes[main]) main = k; });
      const order = sizes.map((s, k) => [s, k]).filter(([s, k]) => k !== main && s >= 6).sort((a, b) => b[0] - a[0]);
      let joined = 0;
      for (const [, k] of order) {
        const starts = []; for (let i = 0; i < N; i++) if (L[i] === k) starts.push(i);
        const goal = (i) => L[i] === main || (C[i] <= ROAD + 1e-6 && L[i] !== k && L[i] >= 0 && sizes[L[i]] > 400);
        let done = false;
        for (const wd of [10, 7, 5]) {
          const path = search(C, starts, goal, 250000, clrOf(wd)); if (!path) continue;
          const Ls = newRuns(C, path, 2).map((run) => runPts(run, 1, wd, J, J)); if (Ls.some((p) => !p)) continue;
          Ls.forEach((pts) => { put(pts, wd); st.comp++; joined++; }); if (wd < 10) st.narrow++; done = true; break;
        }
        if (!done) st.fail.push("comp" + k + "@" + Math.round(cx(starts[0])) + "," + Math.round(cz(starts[0])));
      }
      if (!joined) break;
    }

    /* ④ 行き止まり */
    const I = w.spotIndex(), nearGate = (x, z) => (gates || []).some(([gx, gz]) => Math.hypot(gx - x, gz - z) < 14);
    const isDead = (p, x, z) => {
      const own = new Set(); p.pts.forEach((q) => own.add(q[0].toFixed(2) + "," + q[1].toFixed(2)));
      const other = w.roads.some((r) => r[4] >= 3 && !own.has(r[0].toFixed(2) + "," + r[1].toFixed(2)) && segD(x, z, r[0], r[1], r[2], r[3]) < r[4] / 2 + p.w / 2 + 1);
      if (other) return false;
      if ((w.paved || []).some((q) => x > q[0] - 3 && x < q[2] + 3 && z > q[1] - 3 && z < q[3] + 3)) return false;
      if (I.bld(x, z, p.w / 2 + 2.5) || nearGate(x, z)) return false;
      return w.insideIsland(x, z, 6);
    };
    w.walkPaths.slice().concat(w.streets || []).forEach((p) => {
      if (!p.pts || p.pts.length < 2 || p.w < 4) return;
      const ends = [[p.pts[0], p.pts[1]], [p.pts[p.pts.length - 1], p.pts[p.pts.length - 2]]];
      ends.forEach(([e, e2]) => {
        const [x, z] = e; if (!isDead(p, x, z)) return;
        const dx = x - e2[0], dz = z - e2[1], dl = Math.hypot(dx, dz) || 1, ux = dx / dl, uz = dz / dl;
        const own = new Set(); p.pts.forEach((q) => own.add(cellOf(q[0], q[1])));
        let ok = false;
        for (const wd of [Math.max(6, Math.min(10, p.w)), 5]) {
          const clr = clrOf(wd), s0 = nearestOpen(C, x + ux * 2, z + uz * 2, 10, clr); if (s0 < 0) continue;
          const sx = cx(s0), sz = cz(s0);
          const path = search(C, [s0], (i) => { if (C[i] > ROAD + 1e-6 || own.has(i)) return false; const px = cx(i) - x, pz = cz(i) - z, d = Math.hypot(px, pz); return d > 7 && (px * ux + pz * uz) > -d * 0.35; }, 30000, clr);
          if (!path) continue;
          let len = 0; for (let k = 1; k < path.length; k++) len += Math.hypot(cx(path[k]) - cx(path[k - 1]), cz(path[k]) - cz(path[k - 1])); const ex = cx(path[path.length - 1]), ez = cz(path[path.length - 1]);
          if (!(len < 110 && len < Math.hypot(ex - sx, ez - sz) * 2.4 + 24)) break;
          const Ls = newRuns(C, [cellOf(x, z)].concat(path), 2).map((run) => { const pts = runPts(run, 1, wd, 3, J); if (!pts) return null; pts[0] = [x, z]; return okPts(pts, wd, 3, J) ? pts : null; });
          if (!Ls.length || Ls.some((q) => !q)) continue;
          Ls.forEach((pts) => { put(pts, wd); st.dead++; }); ok = true; break;
        }
        if (!ok && !I.road(x + ux * 6, z + uz * 6, 0)) { put([[x + ux * 3, z + uz * 3, Math.atan2(ux, uz)]], 0, "cap"); st.cap++; }
      });
    });
    /* ⑤ 入口・アトラクションの前まで道を（ご指定「それぞれのアトラクションまでの道を設置」）：
       入れる建物の入口・乗り物/遊びの受付の前に道も広場もなければ、いちばん近い道へ小道をつなぐ。
       ★★ 2026-09-30b 入口の点は道の始まりに「足す」（前は最初の点を入口に置きかえ、入口から遠い点まで一直線＝建物を横切った） */
    const inRoom = (x, z) => (w.interiors || []).some((q) => { if (q.round) return Math.hypot(x - q.x, z - q.z) < q.r + 0.5; const dx = x - q.x, dz = z - q.z, a = dx * q.c - dz * q.s, b = dx * q.s + dz * q.c; return Math.abs(a) < q.hw + 0.3 && Math.abs(b) < q.hd + 0.3; });
    const targets = (w.doors || []).map(([x, z, k]) => [x, z, k === "ride" ? 6 : 5, k]).concat((w.inter || []).filter((it) => !it.y && !inRoom(it.x, it.z) && !I.bld(it.x, it.z, 0)).map((it) => [it.x, it.z, 4]));
    const roadNear = (x, z, r) => { const rr = Math.ceil(r / CS); const ix = Math.floor((x - X0) / CS), iz = Math.floor((z - Z0) / CS); for (let dz = -rr; dz <= rr; dz++) for (let dx = -rr; dx <= rr; dx++) { const jx = ix + dx, jz = iz + dz; if (jx < 0 || jz < 0 || jx >= NX || jz >= NZ) continue; if (C[jz * NX + jx] <= ROAD + 1e-6 && dx * dx + dz * dz <= rr * rr) return true; } return false; };
    st.door = 0;
    targets.forEach(([x, z, wd0, kind]) => {
      if (!w.insideIsland(x, z, 4) || roadNear(x, z, 7)) return;
      const ride = kind === "ride";          /* ★★ 2026-09-30b 乗り物の乗り場は遠くても道をつなぐ（前は 90m までで、アドベンチャーのコースターは道がなかった） */
      for (const wd of ride ? [wd0, 5, 3.5] : [wd0, 3.5]) {
        const clr = clrOf(wd), s0 = nearestOpen(C, x, z, 10, clr); if (s0 < 0) continue;
        const path = search(C, [s0], (i) => C[i] <= ROAD + 1e-6, ride ? 90000 : 20000, clr); if (!path) continue;
        let len = 0; for (let k = 1; k < path.length; k++) len += Math.hypot(cx(path[k]) - cx(path[k - 1]), cz(path[k]) - cz(path[k - 1])); if (len > (ride ? 260 : 90)) break;
        const runs = newRuns(C, path, 2); if (!runs.length) break;
        const Ls = runs.map((run, ri) => { let pts = runPts(run, 1, wd, 0, J); if (!pts) return null;
          if (ri === 0 && run[0] === path[0]) { const d0 = Math.hypot(pts[0][0] - x, pts[0][1] - z); if (d0 > 0.6 && d0 < 11) { const q = [[x, z]].concat(pts); if (okPts(q, wd, 3, J)) pts = q; } }
          return pts; });
        if (Ls.some((q) => !q)) continue;
        Ls.forEach((pts) => { put(pts, wd); st.door++; }); break;
      }
    });
    w._roadPlanPts = out;
    try { Object.keys(localStorage).forEach((k) => { if (k.startsWith("xeva_roadnet_") && k !== key) localStorage.removeItem(k); }); localStorage.setItem(key, JSON.stringify({ r: out })); } catch (e) {}
    w._roadPlan = Object.assign({ cached: false, ms: Math.round(performance.now() - t0) }, st);
  };

  /* ══════════════ 道ぞいの低い柵（★ 2026-09-30 ご指定「道にも柵を設置してください」） ══════════════
     道のふち（縁石のすぐ外）に、芝生・森との境として低い朱の柵。入口・ベンチ・受付・門・広場・交差点・建物の前はあける。 */
  P.roadFences = function () {
    const w = this, I = w.spotIndex(), gates = w.gates || [], STEP = 3.2, paved = w.paved || [];
    const PG = new Map(), near = (x, z, r) => { for (let gx = Math.floor((x - r) / 2); gx <= Math.floor((x + r) / 2); gx++) for (let gz = Math.floor((z - r) / 2); gz <= Math.floor((z + r) / 2); gz++) { const a = PG.get(gx * 4096 + gz); if (a) for (const p of a) if (Math.hypot(p[0] - x, p[1] - z) < r) return true; } return false; };
    const addP = (x, z) => { const k = Math.floor(x / 2) * 4096 + Math.floor(z / 2); let a = PG.get(k); if (!a) PG.set(k, a = []); a.push([x, z]); };
    const SG = new Map(), addS = (x, z, r) => { const k = Math.floor(x / 8) * 4096 + Math.floor(z / 8); let a = SG.get(k); if (!a) SG.set(k, a = []); a.push([x, z, r]); };
    w.seats.forEach((q) => addS(q.x, q.z, 1.4)); (w.inter || []).forEach((it) => addS(it.x, it.z, Math.min(6, (it.r || 2) + 1.5))); (w.doors || []).forEach(([x, z]) => addS(x, z, 4.2));
    const spotHit = (x, z) => { for (let gx = Math.floor(x / 8) - 1; gx <= Math.floor(x / 8) + 1; gx++) for (let gz = Math.floor(z / 8) - 1; gz <= Math.floor(z / 8) + 1; gz++) { const a = SG.get(gx * 4096 + gz); if (a) for (const p of a) if (Math.hypot(p[0] - x, p[1] - z) < p[2]) return true; } return false; };
    const ok = (x, z) => !I.road(x, z, 0.3) && !paved.some((q) => x > q[0] - 1 && x < q[2] + 1 && z > q[1] - 1 && z < q[3] + 1) && !I.bld(x, z, 2.2) && !I.col(x, z, 0.2) && !I.water(x, z) && !gates.some((g) => Math.hypot(g.x - x, g.z - z) < g.span / 2 + 3) && !spotHit(x, z) && w.insideIsland(x, z, 3) && !near(x, z, 1.5) && !w.onTrack(x, z, 1.5);
    const railBad = (px, pz, x, z) => { for (const f of [0.25, 0.5, 0.75]) { const qx = px + (x - px) * f, qz = pz + (z - pz) * f; if (I.road(qx, qz, 0.25) || I.bld(qx, qz, 0.5) || w.onTrack(qx, qz, 1)) return true; } return false; };
    let posts = 0;
    w.walkPaths.forEach((p) => {
      if (!p.pts || p.pts.length < 2 || p.w < 5 || p.noFence) return;
      const sp = p.pts, cum = [0]; for (let i = 1; i < sp.length; i++) cum.push(cum[i - 1] + Math.hypot(sp[i][0] - sp[i - 1][0], sp[i][1] - sp[i - 1][1]));
      const total = cum[cum.length - 1]; if (total < 12) return;
      const at = (d) => { let i = 1; while (i < sp.length - 1 && cum[i] < d) i++; const t = (d - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]), dx = sp[i][0] - sp[i - 1][0], dz = sp[i][1] - sp[i - 1][1], l = Math.hypot(dx, dz) || 1; return [sp[i - 1][0] + dx * t, sp[i - 1][1] + dz * t, dx / l, dz / l]; };
      [-1, 1].forEach((sd) => {
        let run = [];
        const flush = () => {
          if (run.length >= 3) {
            w.detail(() => run.forEach(([x, z], k) => {
              const ry = k ? Math.atan2(x - run[k - 1][0], z - run[k - 1][1]) : Math.atan2(run[1][0] - x, run[1][1] - z);
              w.box("woodRed", x, 0, z, 0.15, 0.82, 0.15, { ry }); if (k % 2 === 0) w.box("gold", x, 0.82, z, 0.22, 0.07, 0.22, { ry });
              if (k) { const [px, pz] = run[k - 1], mx = (px + x) / 2, mz = (pz + z) / 2, sl = Math.hypot(x - px, z - pz); w.box("woodDark2", mx, 0.66, mz, 0.08, 0.08, sl, { ry }); w.box("woodRed", mx, 0.3, mz, 0.06, 0.06, sl, { ry }); }
            }));
            for (let k = 1; k < run.length; k++) { const n0 = w.colliders.length; w.colSeg(run[k - 1][0], run[k - 1][1], run[k][0], run[k][1], 0.12); w.colliders[n0].fence = true; }
            posts += run.length; run.forEach(([x, z]) => addP(x, z));
          }
          run = [];
        };
        for (let d = 3; d <= total - 3; d += STEP) {
          const [x, z, dx, dz] = at(d), off = p.w / 2 + 0.5, fx = x - dz * sd * off, fz = z + dx * sd * off;
          if (!ok(fx, fz)) { flush(); continue; }
          if (run.length && (Math.hypot(run[run.length - 1][0] - fx, run[run.length - 1][1] - fz) > STEP * 1.6 || railBad(run[run.length - 1][0], run[run.length - 1][1], fx, fz))) flush();
          run.push([fx, fz]);
        }
        flush();
      });
    });
    w._roadFenceStat = posts;
  };

  /* ══════════════ となりのエリアが見えないように（★ 2026-09-30 ご指定「ディズニーのように工夫」） ══════════════
     エリアのさかいに、背の高い生け垣（3.2m）と木の列（外がわ）。道・門・建物・水の所はあける。
     となりどうしのエリアのさかいは、さかいの線の上に生け垣。入口の大通り・広場・噴水公園は見通しのため作らない。 */
  P.buildBerms = function () {
    const w = this, I = w.spotIndex(), gates = w.gates || [], AREAS = XP.AREAS, STEP = 4;
    const SOFT = { gate: 1, marketW: 1, marketE: 1, green: 1, tower: 1, fountain: 1, beach: 1 };
    const inArea = (x, z, self) => AREAS.find((b) => b !== self && !SOFT[b.id] && x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1);
    const inSoft = (x, z) => AREAS.some((b) => SOFT[b.id] && b.id !== "beach" && x > b.x0 - 2 && x < b.x1 + 2 && z > b.z0 - 2 && z < b.z1 + 2);
    const HG = new Set(), hk = (x, z) => Math.round(x / 3) * 8192 + Math.round(z / 3);
    const DR = w.doors || [];
    const blocked = (x, z, pad) => I.road(x, z, 2.2) || I.water(x, z) || I.bld(x, z, pad || 1.5) || I.col(x, z, 0.3) || gates.some((g) => Math.hypot(g.x - x, g.z - z) < g.span / 2 + 5) || !w.insideIsland(x, z, 4) || w.onTrack(x, z, 3) || DR.some((d) => Math.abs(d[0] - x) < 9 && Math.abs(d[1] - z) < 9 && Math.hypot(d[0] - x, d[1] - z) < (d[2] === "ride" ? 9 : 6));          /* ★★ 2026-09-30b 乗り場・入口の前はあける */
    const nested = (a, b) => b && ((b.x0 >= a.x0 && b.x1 <= a.x1 && b.z0 >= a.z0 && b.z1 <= a.z1) || (a.x0 >= b.x0 && a.x1 <= b.x1 && a.z0 >= b.z0 && a.z1 <= b.z1));
    const KINDS = ["poplar", "pine", "oak", "sakura", "poplar", "flowerTree"];
    let hedge = 0, trees = 0;
    AREAS.forEach((a, ai) => {
      if (SOFT[a.id]) return;
      const edges = [[a.x0, a.z0, a.x1, a.z0, 0, -1], [a.x1, a.z0, a.x1, a.z1, 1, 0], [a.x1, a.z1, a.x0, a.z1, 0, 1], [a.x0, a.z1, a.x0, a.z0, -1, 0]];
      edges.forEach(([x0, z0, x1, z1, ox, oz]) => {
        const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.floor(L / STEP)), ry = Math.atan2(x1 - x0, z1 - z0);
        for (let i = 0; i <= n; i++) {
          const t = (i + 0.5) / (n + 1), bx = x0 + (x1 - x0) * t, bz = z0 + (z1 - z0) * t;
          const nb = inArea(bx + ox * 3, bz + oz * 3, a);
          if (inSoft(bx + ox * 3, bz + oz * 3) || nested(a, nb)) continue;          /* ★ 2026-09-30b エリアの中のエリア（ドーム・タワー）のさかいには作らない（前はサーキットの上に生け垣があった） */
          /* 生け垣：となりがエリア→さかいの線の上、そうでなければ柵の 2m 外 */
          const hx = bx + ox * (nb ? 0 : 2.2), hz = bz + oz * (nb ? 0 : 2.2), key = hk(hx, hz);
          const ux = (x1 - x0) / L, uz = (z1 - z0) / L;
          if (!HG.has(key) && !blocked(hx, hz) && !blocked(hx + ux * 1.9, hz + uz * 1.9, 1.0) && !blocked(hx - ux * 1.9, hz - uz * 1.9, 1.0)) { HG.add(key); w.box("hedge", hx, 0, hz, 1.3, 3.2, STEP + 0.3, { ry, collide: true, uv: 2 }); w.colliders[w.colliders.length - 1].hedge = 3.2; hedge++; }
          /* 木の列（となりがエリアでない所だけ・外がわ 5〜7m） */
          if (!nb && i % 2 === 0) { const d = 5.5 + ((i * 7 + ai) % 3), tx = bx + ox * d + (x1 - x0) / L * 1.2, tz = bz + oz * d + (z1 - z0) / L * 1.2; if (!blocked(tx, tz, 2.5) && !inArea(tx, tz, null)) { w.plant(KINDS[(i + ai) % KINDS.length], tx, tz, 1.25 + ((i * 13) % 5) * 0.08); trees++; } }
        }
      });
    });
    w._bermStat = { hedge, trees };
  };

  /* 行き止まりの「ひと休み広場」：丸い石だたみ・石灯籠2基・ベンチ・花（道の先の小さな目的地にする） */
  function capPlaza(w, x, z, a) {
    const ux = Math.sin(a), uz = Math.cos(a), px = x + ux * 4.5, pz = z + uz * 4.5;
    w.disk(px, pz, 6.2, "walkCream", 0.021); w.disk(px, pz, 6.6, "stoneW", 0.019, 6.2);
    [-1, 1].forEach((k) => { const lx = px + uz * k * 4.6, lz = pz - ux * k * 4.6; w.detail(() => { w.box("stoneW", lx, 0, lz, 0.8, 0.3, 0.8); w.geo("stoneW", new T.CylinderGeometry(0.16, 0.2, 1.0, 8), lx, 0.8, lz); w.box("stoneW", lx, 1.3, lz, 0.72, 0.5, 0.72); w.geo("lampY", new T.BoxGeometry(0.4, 0.3, 0.4), lx, 1.55, lz); w.geo("stoneW", new T.ConeGeometry(0.62, 0.5, 4).rotateY(Math.PI / 4), lx, 1.95, lz); }); w.colCircle(lx, lz, 0.45); });
    w.bench(px + ux * 3.8, pz + uz * 3.8, Math.atan2(-ux, -uz));
    w.flowers(px + ux * 5.6, pz + uz * 5.6, 4, 1.2, a, 14);
  }
})();
