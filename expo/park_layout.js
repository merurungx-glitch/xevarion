/* ══════════════════════════════════════════════════════════════════
   XEVARION PARK — 配置の土台（★★ 2026-09-30c ご指定「エリアと道の配置が悪いので、すべてのエリアのサイズや道を一から見直して
   綺麗に作り直す。導線は楽しむうえで最重要」）
   ------------------------------------------------------------------
   ① 取りこみ (cap)：エリアを作る関数が作った物を、ぜんぶ「そのエリアの物」としてしるしておく。
      ・まとめ描きの形（Batch の items）・シーンに足した物（エリアのグループに入れる）
      ・当たり・ゾーン・できること・すわれる所・木・道・歩く道・広場・人だまり・ワープ先・建物の影・舗装・森にしない所・
        草を生やさない所・川・入口・門の予約・街灯とベンチの予約・高さ（段・橋）・旗・目・乗り物・動画の場所・会場の人の位置…
   ② 平行移動 (relocate)：新しい配置へ、グループを動かし、形と記録を同じだけずらす（回転はしない＝向き・当たりの形・
      ゲームの向きがそのまま使える）。
      ・シーンの物はグループの中の「もとの座標」のまま → 動かす関数（アニメ）はそのまま動く。
      ・「島の座標」で読む記録（当たり・高さ・できること・ワープ先…）は、ずらした値に書きかえる。
      ・両方で使う物（ライブ会場・港のショー・乗り物）は off（ずらした分）を持たせ、島の座標で使う所で足す。
   ③ 取りこみの報告 (capReport)：エリアごとの実際の広さ（建物・当たり・道・木・形の範囲）。配置を決めるのに使う。
   ══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const T = THREE, P = XWorld.World.prototype, XP = XPark;

  /* ── 数える一覧（名前 → ずらし方）。r＝1件、dx,dz＝ずらす分 ── */
  const mapPts = (pts, dx, dz) => pts.map((p) => { const q = p.slice ? p.slice() : [p[0], p[1]]; q[0] += dx; q[1] += dz; return q; });
  const LISTS = {
    colliders: (c, dx, dz) => { c.x0 += dx; c.x1 += dx; c.z0 += dz; c.z1 += dz; if (c.t === "c" || c.t === "ring" || c.t === "ell" || c.t === "obb") { c.x += dx; c.z += dz; } else if (c.t === "seg") { c.ax += dx; c.bx += dx; c.az += dz; c.bz += dz; } },
    zones: (z, dx, dz) => { z.x0 += dx; z.x1 += dx; z.z0 += dz; z.z1 += dz; },
    inter: (it, dx, dz, w) => { it.x += dx; it.z += dz; if (it.warp) it.warp = [it.warp[0] + dx, it.warp[1] + dz, it.warp[2]]; xfAct(it, dx, dz, w); },
    seats: (s, dx, dz) => { s.x += dx; s.z += dz; },
    trees: (t, dx, dz) => { t[1] += dx; t[2] += dz; },
    roads: (r, dx, dz) => { r[0] += dx; r[2] += dx; r[1] += dz; r[3] += dz; },
    walkPaths: (p, dx, dz) => { p.pts = mapPts(p.pts, dx, dz); },
    streets: (p, dx, dz) => { p.pts = mapPts(p.pts, dx, dz); },
    rivers: (p, dx, dz) => { p.pts = mapPts(p.pts, dx, dz); },
    blockPaths: (p, dx, dz) => { p.pts = mapPts(p.pts, dx, dz); },
    plazas: (q, dx, dz) => { q[0] += dx; q[1] += dz; },
    crowdSpots: (q, dx, dz) => { q[0] += dx; q[1] += dz; },
    places: (q, dx, dz) => { q[1] += dx; q[2] += dz; },
    casters: (c, dx, dz) => { c.pts = mapPts(c.pts, dx, dz); },
    paved: (q, dx, dz) => { q[0] += dx; q[2] += dx; q[1] += dz; q[3] += dz; },
    noGrass: (q, dx, dz) => { q[0] += dx; q[2] += dx; q[1] += dz; q[3] += dz; },
    forestOpen: (q, dx, dz) => { q[0] += dx; q[1] += dz; },
    treeKeepOut: (k, dx, dz) => { k.pts = mapPts(k.pts, dx, dz); },
    riverGaps: (g, dx, dz) => { g.x += dx; g.z += dz; },
    interiors: (q, dx, dz) => { q.x += dx; q.z += dz; },
    doors: (d, dx, dz) => { d[0] += dx; d[1] += dz; },
    _doorQ: (q, dx, dz) => { q[0] += dx; q[1] += dz; if (q[7]) q[7] = Object.assign({}, q[7], { x: q[7].x + dx, z: q[7].z + dz }); },
    flagList: (f, dx, dz) => { f[0] += dx; f[2] += dz; },
    eyeList: (e, dx, dz) => { e.x += dx; e.z += dz; },
    _curbQ: (q, dx, dz) => { q.sp = mapPts(q.sp, dx, dz); },
    _anchors: (a, dx, dz) => { a[0] += dx; a[1] += dz; },
    heightExtra: (q, dx, dz) => { q.cx += dx; q.cz += dz; },
    looseList: (L, dx, dz) => { L.ox = (L.ox || 0) + dx; L.oz = (L.oz || 0) + dz; },
    farObjs: (f, dx, dz) => { f.x += dx; f.z += dz; },
    walkable: (q, dx, dz) => { q.cx += dx; q.cz += dz; },
    lamps: (q, dx, dz) => { q[0] += dx; q[1] += dz; },
    gates: (g, dx, dz) => { g.x += dx; g.z += dz; },
    _PQ: (q, dx, dz) => { q[1] += dx; q[2] += dz; },
    _GQ: (q, dx, dz) => { q[0] += dx; q[1] += dz; },
    showSpots: (q, dx, dz) => { q[1] += dx; q[2] += dz; }
  };
  /* 一覧の中の点の並び（草を生やさない多角形）は、1件＝点の配列 */
  const POLYS = { noGrassPoly: 1 };
  /* 名前つきの記録（キーごと） */
  const KEYED = {
    npcSpots: (v, dx, dz) => v.map((s) => [s[0] + dx, s[1] + dz, s[2]]),
    videoSpots: (v, dx, dz) => Object.assign({}, v, { cam: [v.cam[0] + dx, v.cam[1], v.cam[2] + dz], look: [v.look[0] + dx, v.look[1], v.look[2] + dz] }),
    rides: (R, dx, dz) => { R.off = [(R.off ? R.off[0] : 0) + dx, (R.off ? R.off[1] : 0) + dz]; return R; }
  };
  /* 1つだけの記録：新しく作られた（入れかわった）ときだけずらす */
  const SINGLE = {
    soccer: (v, dx, dz) => Object.assign({}, v, { cx: v.cx + dx, cz: v.cz + dz }),
    boccia: (v, dx, dz) => Object.assign({}, v, { cx: v.cx + dx, cz: v.cz + dz }),
    mountainAt: (v, dx, dz) => Object.assign({}, v, { x: v.x + dx, z: v.z + dz }),
    circuit: (v, dx, dz) => {
      const o = new T.Vector3(dx, 0, dz), pts = v.pts.map((p) => p.clone().add(o));
      const out = Object.assign({}, v, { pts, start: v.start ? v.start.clone().add(o) : v.start });
      if (v.curve && v.curve.points) out.curve = new T.CatmullRomCurve3(v.curve.points.map((p) => p.clone().add(o)), v.curve.closed, v.curve.curveType, v.curve.tension);
      return out;
    },
    liveArena: (v, dx, dz) => { v.off = [(v.off ? v.off[0] : 0) + dx, (v.off ? v.off[1] : 0) + dz]; return v; },
    harborInfo: (v, dx, dz) => { v.off = [(v.off ? v.off[0] : 0) + dx, (v.off ? v.off[1] : 0) + dz]; return v; },
    harborShow: (v, dx, dz) => { v.off = [(v.off ? v.off[0] : 0) + dx, (v.off ? v.off[1] : 0) + dz]; return v; }
  };

  /* できることの結果に島の座標がある物（階・展望・エレベーターの定義）：1回だけずらす */
  const _xfDone = new WeakSet();
  function xfDef(d, dx, dz) {
    if (!d || typeof d !== "object" || _xfDone.has(d)) return; _xfDone.add(d);
    ["x", "fx"].forEach((k) => { if (typeof d[k] === "number") d[k] += dx; });
    ["z", "fz"].forEach((k) => { if (typeof d[k] === "number") d[k] += dz; });
    if (d.lift) d.lift = Object.assign({}, d.lift, { x: d.lift.x + dx, z: d.lift.z + dz });
    if (d.lobby) d.lobby = Object.assign({}, d.lobby, { x: d.lobby.x + dx, z: d.lobby.z + dz });
    if (d.roof && typeof d.roof === "object") d.roof = Object.assign({}, d.roof, { x: d.roof.x + dx, z: d.roof.z + dz });
    if (Array.isArray(d.floors)) d.floors.forEach((F) => { if (F && F.deck) F.deck = Object.assign({}, F.deck, { x: F.deck.x + dx, z: F.deck.z + dz }); if (F && F.roof && typeof F.roof === "object") F.roof = Object.assign({}, F.roof, { x: F.roof.x + dx, z: F.roof.z + dz }); });
  }
  function xfAct(it, dx, dz) {
    if (typeof it.act !== "function") return;
    let r = null; try { r = it.act(); } catch (e) { r = null; }
    if (!r || typeof r !== "object") return;
    if (r.roomFloors && r.roomFloors !== true) xfDef(r.roomFloors, dx, dz);
    if (r.room) xfDef(r.room, dx, dz);
    if (r.deck) xfDef(r.deck, dx, dz);
  }

  /* ── いまの数（取りこみの前後） ── */
  function snap(w) {
    const s = { batch: w.batch.items.length, lists: {}, keyed: {}, single: {} };
    for (const k in LISTS) s.lists[k] = (w[k] || []).length;
    for (const k in POLYS) s.lists[k] = (w[k] || []).length;
    for (const k in KEYED) { const o = w[k] || {}; s.keyed[k] = new Map(Object.keys(o).map((q) => [q, o[q]])); }
    for (const k in SINGLE) s.single[k] = w[k];
    return s;
  }

  /* ══════════════ ① 取りこみ ══════════════
     ids：このエリアの AREAS の id（1つ目が代表）。fn：エリアを作る関数 */
  P.cap = function (ids, fn) {
    const w = this; ids = [].concat(ids);
    const s0 = snap(w), grp = new T.Group(); grp.name = "area:" + ids[0]; grp.userData.area = ids[0];
    const real = w.scene; real.add(grp); w.scene = grp;
    const t0 = performance.now();
    try { fn.call(w); } catch (e) { console.error("[park] area " + ids[0], e); } finally { w.scene = real; }
    const rec = { id: ids[0], ids, s0, s1: snap(w), grp, ms: Math.round(performance.now() - t0) };
    /* 形の範囲（報告用・大きすぎる物＝地面など は除く） */
    const bb = [1e9, 1e9, -1e9, -1e9], items = w.batch.items;
    for (let i = s0.batch; i < rec.s1.batch; i++) { const g = items[i].g; if (!g.boundingBox) g.computeBoundingBox(); const q = g.boundingBox; if (q.max.x - q.min.x > 500 || q.max.z - q.min.z > 500) continue; bb[0] = Math.min(bb[0], q.min.x); bb[1] = Math.min(bb[1], q.min.z); bb[2] = Math.max(bb[2], q.max.x); bb[3] = Math.max(bb[3], q.max.z); }
    rec.geoBB = bb;
    (w.caps = w.caps || []).push(rec);
    return rec;
  };

  /* ══════════════ ② 平行移動 ══════════════
     XF：{ 代表の id: [dx, dz] }。ずらさないエリアは書かない */
  P.relocate = function (XF) {
    const w = this, A = XP.A, items = w.batch.items, moved = [], tok = {};
    (w.caps || []).forEach((rec) => {
      const d = XF[rec.id]; if (!d) return;
      const dx = d[0] || 0, dz = d[1] || 0; if (!dx && !dz) return;
      rec.dx = (rec.dx || 0) + dx; rec.dz = (rec.dz || 0) + dz; moved.push(rec.id);
      rec.grp.position.x += dx; rec.grp.position.z += dz; rec.grp.updateMatrixWorld(true);
      if (rec.geoBB) { rec.geoBB[0] += dx; rec.geoBB[2] += dx; rec.geoBB[1] += dz; rec.geoBB[3] += dz; }
      for (let i = rec.s0.batch; i < rec.s1.batch; i++) items[i].g.translate(dx, 0, dz);
      for (const k in LISTS) { const arr = w[k]; if (!arr) continue; for (let i = rec.s0.lists[k]; i < rec.s1.lists[k] && i < arr.length; i++) LISTS[k](arr[i], dx, dz, w); }
      for (const k in POLYS) { const arr = w[k]; if (!arr) continue; for (let i = rec.s0.lists[k]; i < rec.s1.lists[k] && i < arr.length; i++) arr[i] = mapPts(arr[i], dx, dz); }
      for (const k in KEYED) { const o = w[k]; if (!o) continue; const before = rec.s0.keyed[k], after = rec.s1.keyed[k]; after.forEach((v, key) => { if (before.get(key) === v && before.has(key)) return; if (o[key] === v) o[key] = KEYED[k](v, dx, dz); }); }
      for (const k in SINGLE) { const v1 = rec.s1.single[k]; if (v1 && v1 !== rec.s0.single[k] && w[k] === v1) w[k] = SINGLE[k](v1, dx, dz); }
      rec.ids.forEach((id) => { const a = A[id]; if (!a || a._mv === tok) return; a._mv = tok; a.x0 += dx; a.x1 += dx; a.z0 += dz; a.z1 += dz; a.cx += dx; a.cz += dz; });
    });
    /* 作りおきの表（当たりのます目・水のます目・コースの判定）は作り直させる */
    w._grid = null; w._gridN = -1; w._wg = null; w._wgN = -1; w._cg = null; w._trk = null;
    w._relocated = moved;
    return moved;
  };

  /* ══════════════ ③ 取りこみの報告（広さ） ══════════════ */
  P.capReport = function () {
    const w = this, out = {};
    (w.caps || []).forEach((rec) => {
      const b = [1e9, 1e9, -1e9, -1e9], add = (x, z) => { if (!isFinite(x) || !isFinite(z)) return; if (x < b[0]) b[0] = x; if (z < b[1]) b[1] = z; if (x > b[2]) b[2] = x; if (z > b[3]) b[3] = z; };
      const cs = w.casters.slice(rec.s0.lists.casters, rec.s1.lists.casters); cs.forEach((c) => c.pts.forEach(([x, z]) => add(x, z)));
      w.colliders.slice(rec.s0.lists.colliders, rec.s1.lists.colliders).forEach((c) => { if (c.x1 - c.x0 < 400) { add(c.x0, c.z0); add(c.x1, c.z1); } });
      w.roads.slice(rec.s0.lists.roads, rec.s1.lists.roads).forEach((r) => { add(r[0], r[1]); add(r[2], r[3]); });
      const bb = rec.geoBB || [0, 0, 0, 0];
      out[rec.id + (out[rec.id] ? "+" : "")] ={ ids: rec.ids, bld: b.map(Math.round), geo: bb.map(Math.round), casters: cs.length, roads: rec.s1.lists.roads - rec.s0.lists.roads, ms: rec.ms, area: (() => { const a = XP.A[rec.id]; return a ? [a.x0, a.z0, a.x1, a.z1] : null; })() };
    });
    return out;
  };
})();
