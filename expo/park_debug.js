/* ══════════════════════════════════════════════════════════════════
   XEVARION PARK — 開発用の地図（URL に ?debug を付けたときだけ読みこむ・main.js）
   PDBG.map(x0, z0, x1, z1, opt) … 上から見た配置図（道・建物・水・門・入口・駅・エリア）を画面に重ねる
   PDBG.hide() … 閉じる　／　PDBG.tp(x, z, yaw, pitch, dist) … その場所へ移動
   ══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const PDBG = {};
  PDBG.map = function (x0, z0, x1, z1, opt) {
    opt = opt || {};
    const w = window.EXPO.world, W = innerWidth, H = innerHeight;
    let c = document.getElementById("dbgc"); if (!c) { c = document.createElement("canvas"); c.id = "dbgc"; c.style.cssText = "position:fixed;left:0;top:0;z-index:99999;background:#1e78b4"; document.body.appendChild(c); c.onclick = () => PDBG.hide(); }
    c.width = W; c.height = H; c.style.display = "block";
    const g = c.getContext("2d"), s = Math.min(W / (x1 - x0), H / (z1 - z0)), P = (x, z) => [(x - x0) * s, (z - z0) * s];
    g.fillStyle = "#1e78b4"; g.fillRect(0, 0, W, H);
    g.fillStyle = "#4f9a44"; g.beginPath(); for (let i = 0; i <= 720; i++) { const [px, pz] = XPark.islandPt(i / 720 * Math.PI * 2, 1), [a, b] = P(px, pz); if (i) g.lineTo(a, b); else g.moveTo(a, b); } g.fill();
    const st = Math.max(3, 2.5 / s); g.fillStyle = "#39b6e6";
    for (let x = x0; x < x1; x += st) for (let z = z0; z < z1; z += st) if (w.isWater(x, z)) { const [a, b] = P(x, z); g.fillRect(a, b, Math.ceil(st * s) + 1, Math.ceil(st * s) + 1); }
    XPark.AREAS.forEach((a) => { const [p0, q0] = P(a.x0, a.z0), [p1, q1] = P(a.x1, a.z1); g.strokeStyle = a.c; g.lineWidth = 1.5; g.setLineDash([5, 3]); g.strokeRect(p0, q0, p1 - p0, q1 - q0); g.setLineDash([]); });
    g.fillStyle = "rgba(230,210,170,.5)"; (w.paved || []).forEach((q) => { const [a, b] = P(q[0], q[1]), [c2, d] = P(q[2], q[3]); g.fillRect(a, b, c2 - a, d - b); });
    const own = new Set(); (w.net || []).forEach((n) => { for (let i = n.r0; i < n.r1; i++) own.add(i); });
    g.lineCap = "round"; w.roads.forEach((r, i) => { g.strokeStyle = own.has(i) ? "rgba(255,190,90,.95)" : "rgba(255,245,215,.95)"; g.lineWidth = Math.max(1, r[4] * s); const [a, b] = P(r[0], r[1]), [c2, d] = P(r[2], r[3]); g.beginPath(); g.moveTo(a, b); g.lineTo(c2, d); g.stroke(); });
    (w.junctions || []).forEach((j) => { const [a, b] = P(j.x, j.z); g.strokeStyle = "#fff"; g.lineWidth = 1.5; g.beginPath(); g.arc(a, b, Math.max(2, j.r * s), 0, 7); g.stroke(); });
    if (w.circuit) { g.strokeStyle = "#555"; g.lineWidth = Math.max(2, w.circuit.W * s); g.beginPath(); w.circuit.pts.forEach((p, i) => { const [a, b] = P(p.x, p.z); if (i) g.lineTo(a, b); else g.moveTo(a, b); }); g.closePath(); g.stroke(); }
    (w.treeKeepOut || []).forEach((k) => { g.strokeStyle = "rgba(255,80,80,.9)"; g.lineWidth = 1.5; g.beginPath(); k.pts.forEach(([x, z], i) => { const [a, b] = P(x, z); if (i) g.lineTo(a, b); else g.moveTo(a, b); }); g.stroke(); });
    g.fillStyle = "rgba(110,50,150,.9)"; w.casters.forEach((cs) => { if (cs.h < 2) return; g.beginPath(); cs.pts.forEach(([x, z], i) => { const [a, b] = P(x, z); if (i) g.lineTo(a, b); else g.moveTo(a, b); }); g.closePath(); g.fill(); });
    if (opt.col) w.colliders.forEach((cl) => { if (!cl.fence && !opt.allCol) return; g.strokeStyle = cl.fence ? "rgba(255,60,0,1)" : "rgba(255,0,0,.55)"; g.lineWidth = cl.fence ? 2 : 1; if (cl.t === "seg") { const [a, b] = P(cl.ax, cl.az), [c2, d] = P(cl.bx, cl.bz); g.beginPath(); g.moveTo(a, b); g.lineTo(c2, d); g.stroke(); } else if (cl.t === "c") { const [a, b] = P(cl.x, cl.z); g.beginPath(); g.arc(a, b, Math.max(0.5, cl.r * s), 0, 7); g.stroke(); } else if (opt.allCol) { const [a, b] = P(cl.x0, cl.z0), [c2, d] = P(cl.x1, cl.z1); g.strokeRect(a, b, c2 - a, d - b); } });
    if (opt.trees) { g.fillStyle = "rgba(20,90,20,.8)"; w.trees.forEach((t) => { if (t[0] === "flower" || t[0] === "bush" || t[1] < x0 || t[1] > x1 || t[2] < z0 || t[2] > z1) return; const [a, b] = P(t[1], t[2]); g.fillRect(a - 1, b - 1, 2, 2); }); }
    g.fillStyle = "#0f0"; (w.doors || []).forEach((d) => { const [a, b] = P(d[0], d[1]); g.fillRect(a - 2, b - 2, 4, 4); });
    if (opt.inter) { g.fillStyle = "#0ff"; (w.inter || []).forEach((it) => { if (it.y) return; const [a, b] = P(it.x, it.z); g.fillRect(a - 1.5, b - 1.5, 3, 3); }); }
    (w.gates || []).forEach((gt) => { const [a, b] = P(gt.x, gt.z); g.fillStyle = "#ff0"; g.beginPath(); g.arc(a, b, 5, 0, 7); g.fill(); g.strokeStyle = "#000"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(a, b); g.lineTo(a + Math.sin(gt.ry) * 14, b + Math.cos(gt.ry) * 14); g.stroke(); });
    (window.XTransit ? XTransit.lines : []).forEach((Ln) => { const A = Ln.A; g.strokeStyle = Ln.id === "mono" ? "#00f" : "#f00"; g.lineWidth = 2; g.beginPath(); for (let i = 0; i < A.n; i++) { const [a, b] = P(A.P[i * 3], A.P[i * 3 + 2]); if (i) g.lineTo(a, b); else g.moveTo(a, b); } g.stroke(); Ln.stops.forEach((sp) => { const i = Math.round(sp.sC / A.ds), [a, b] = P(A.P[i * 3], A.P[i * 3 + 2]); g.fillStyle = "#fff"; g.beginPath(); g.arc(a, b, 4, 0, 7); g.fill(); }); });
    if (window.EXPO.player) { const pl = window.EXPO.player, [a, b] = P(pl.x, pl.z); g.fillStyle = "#ff2a7a"; g.beginPath(); g.arc(a, b, 6, 0, 7); g.fill(); }
    g.font = "bold 12px sans-serif"; g.textAlign = "center"; g.strokeStyle = "#000"; g.lineWidth = 3; g.fillStyle = "#fff";
    XPark.AREAS.forEach((a) => { if (a.id === "marketE") return; const [px, pz] = P(a.cx, a.cz); g.strokeText(a.n + " " + a.id, px, pz); g.fillText(a.n + " " + a.id, px, pz); });
    if (opt.labels !== false && opt.netLabels) (w.net || []).forEach((n) => { const m = n.pts[Math.floor(n.pts.length / 2)], [px, pz] = P(m[0], m[1]); g.font = "10px sans-serif"; g.strokeText(n.id, px, pz); g.fillText(n.id, px, pz); });
    g.strokeStyle = "rgba(255,255,255,.15)"; g.lineWidth = 1; g.font = "10px sans-serif"; g.fillStyle = "rgba(255,255,255,.85)";
    const gs = opt.grid || 100; for (let x = Math.ceil(x0 / gs) * gs; x <= x1; x += gs) { const [a] = P(x, 0); g.beginPath(); g.moveTo(a, 0); g.lineTo(a, H); g.stroke(); g.fillText(x, a + 2, 10); } for (let z = Math.ceil(z0 / gs) * gs; z <= z1; z += gs) { const [, b] = P(0, z); g.beginPath(); g.moveTo(0, b); g.lineTo(W, b); g.stroke(); g.fillText(z, 14, b - 2); }
    return s;
  };
  PDBG.hide = () => { const c = document.getElementById("dbgc"); if (c) c.style.display = "none"; };
  PDBG.tp = (x, z, yaw, pitch, dist) => { const E = window.EXPO, p = E.player; if (E.sky.on) E.toggleSky(); p.x = x; p.z = z; p.yaw = yaw || 0; p.sit = null; p.deck = null; E.cam.yaw = p.yaw + Math.PI; E.cam.pitch = pitch == null ? 0.3 : pitch; E.cam.dist = dist || 8; E.cam.fp = false; return "ok"; };
  window.PDBG = PDBG;
})();
