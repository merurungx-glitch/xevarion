/* ============================================================
   MagiAbyss — ma-render25.js
   ★★ 2026-10-22 2.5D の描画（ご指定「2.5D 対応化し、超絶きれいなグラフィックに。これは重点的に」）
   ------------------------------------------------------------
   HD-2D の考え方で、いままでの真上からの絵（ma-render.js）を土台に重ねる：
   ① 地面（床・壁の上・床の模様・範囲の予告・地面のエフェクト）は真上から描いた絵を、
      遠近をつけて<b>傾けて</b>貼る（奥ほど小さく・手前ほど大きい）＝輪や範囲は自然な楕円になる。
   ② キャラ・敵・置物・宝箱・拾うもの・弾・壁の前面は<b>立てて</b>描く（遠近で位置と大きさだけ変える）。
      手前から奥へ（y の順）に重ねるので、壁の向こうにいる敵は壁にかくれる。自分は壁の向こうでも うすく見える。
   ③ 光：まわりを少し暗くして、ランプ・溶岩・魔法・宝石・弾・自分のまわりを照らす（光のにじみも）。
      奥の霧・四すみの暗がり・迷宮ごとのただよう粒子（ほたる・雪・火の粉・ほこり・魔素・星くず）・手前のぼけ。
   ④ キャラは HD ドット（ma-pixel.js の charSpriteHD：2倍の細かさ・顔と横顔を描き直したもの）。
   ・設定「グラフィック」：2.5D 高画質（hd）／2.5D 軽め（lite：光・粒子を少なく）／2D（いままでの描画）。
   ・遊びの計算（当たり・移動・弾）は今までと同じ真上の座標のまま。見え方だけを変える。
     マウスでねらうときは screenToWorld で画面の点を地面の点に戻す。
   ============================================================ */
(function () {
  "use strict";
  const MA = (window.MA = window.MA || {});
  const L = MA.RenderLib, R2 = MA.Render2D;
  if (!L || !R2) return;
  const TAU = Math.PI * 2;
  const G = () => MA.G;
  const TS = 16, CH = 32;
  const RD = 2;                   /* 内部の画素：1 マス 16 → 32。HD ドットの1画素＝内部の1画素 */
  const WALL_H = 26;              /* 壁の前面の高さ（ワールドの画素） */
  let cv = null, ctx = null;
  let W = 0, H = 0;               /* 内部の大きさ */
  const P3 = { cx: 0, cy: 0, D: 1, sin: 0, cos: 1, vTop: 0, vBot: 0, halfTop: 0 };
  let camX = 0, camY = 0, oX = 0, oY = 0;   /* oX/oY＝立てて描く物の「見えている広さの左上」（ma-render.js の描きかたは左上からの位置で描く） */
  let gcv = null, gctx = null, GW = 0, GH = 0, gx0 = 0, gy0 = 0;
  let lm = null, lmx = null, LMQ = 3, aoGrad = null;
  let lastMode = "";

  function S() { return MA.Save && MA.Save.S; }
  function mode() { const s = S(); const v = s && s.set && s.set.gfx; return v === "2d" || v === "lite" ? v : "hd"; }
  function is25() { return mode() !== "2d"; }

  /* ══ 投影 ══ */
  function setupProj() {
    const th = 30 * Math.PI / 180;
    P3.sin = Math.sin(th); P3.cos = Math.cos(th);
    P3.D = H * 1.65; P3.cx = W / 2; P3.cy = H / 2;
    P3.vTop = invV(-P3.cy); P3.vBot = invV(H - P3.cy);
    const sTop = P3.D / (P3.D - P3.vTop * P3.sin);
    P3.halfTop = (W / 2) / sTop;
  }
  /* 画面の縦（中心からの Y）→ 地面の奥行き v（内部の画素） */
  function invV(Y) { return Y * P3.D / (P3.cos * P3.D + Y * P3.sin); }
  function proj(wx, wy) {
    const u = (wx - camX) * RD, v = (wy - camY) * RD;
    const s = P3.D / (P3.D - v * P3.sin);
    return { x: P3.cx + u * s, y: P3.cy + v * P3.cos * s, s };
  }
  function unproj(sx, sy) {
    const v = invV(sy - P3.cy), s = P3.D / (P3.D - v * P3.sin);
    return { x: camX + (sx - P3.cx) / s / RD, y: camY + v / RD };
  }

  /* ══ 大きさ ══ */
  function init(canvas) {
    R2.init(canvas);
    cv = canvas; ctx = cv.getContext("2d", { alpha: false });
    resize();
  }
  function resize() {
    if (!cv) return;
    if (!is25()) { R2.resize(); const g0 = G(); if (g0) { delete g0.camVW; delete g0.camVH; } lastMode = mode(); return; }
    const v = MA.vp ? MA.vp() : { w: window.innerWidth, h: window.innerHeight };
    const w = v.w, h = v.h;
    const s0 = S(), z = (s0 && s0.set.zoom) || "auto", port = h > w;
    /* いままでと同じ「見える広さ」（真ん中の行）＝ 遊びやすさは同じ。奥は遠近のぶん広く見える */
    const target = (z === "near" ? 0.8 : z === "far" ? 1.22 : 1) * (port ? 240 : (MA.isPhone && MA.isPhone() ? 250 : 300));
    let scale = Math.max(1, Math.min(w, h) / target);
    const vw = Math.ceil(w / scale), vh = Math.ceil(h / scale);
    W = vw * RD; H = vh * RD;
    cv.width = W; cv.height = H;
    cv.style.width = w + "px"; cv.style.height = h + "px";
    ctx.imageSmoothingEnabled = false;
    setupProj();
    /* 地面の絵の大きさ（見えている地面の四角＋ふち） */
    const pad = 24;
    GW = Math.ceil(P3.halfTop * 2 + pad * 2 * RD); GH = Math.ceil(P3.vBot - P3.vTop + pad * 2 * RD);
    if (!gcv) { gcv = MA.Pix.mkCanvas(GW, GH); gctx = gcv.getContext("2d"); } else { gcv.width = GW; gcv.height = GH; }
    gctx.imageSmoothingEnabled = false;
    LMQ = mode() === "lite" ? 5 : 3;
    lm = MA.Pix.mkCanvas(Math.ceil(W / LMQ), Math.ceil(H / LMQ)); lmx = lm.getContext("2d");
    /* 遊びの計算に使う「見えている広さ」（ワールドの画素）：奥のいちばん広いところ・上下は広いほう×2 */
    const g = G();
    if (g) { g.vw = Math.ceil(P3.halfTop * 2 / RD); g.vh = Math.ceil(Math.max(-P3.vTop, P3.vBot) * 2 / RD); g.camVW = vw; g.camVH = vh; g.scale = scale / RD; }
    lastMode = mode();
  }
  function onStart() { R2.onStart(); faceTex = {}; parts = []; resize(); }
  function onMap() { R2.onMap(); faceTex = {}; parts = []; }
  function dirtyMap() { R2.dirtyMap(); }

  /* ══ 壁の前面の絵（迷宮ごとに1枚：上に明るいふち・下に陰） ══ */
  let faceTex = {};
  function wallFace(biome) {
    if (faceTex[biome]) return faceTex[biome];
    const tl = MA.Art.tiles(biome), B = MA.Art.BIOME[biome] || MA.Art.BIOME.forest;
    const c = MA.Pix.mkCanvas(TS, WALL_H), g = c.getContext("2d");
    g.imageSmoothingEnabled = false;
    g.drawImage(tl.face, 0, WALL_H - TS);
    g.drawImage(tl.face, 0, 0, TS, WALL_H - TS, 0, 0, TS, WALL_H - TS);
    /* 上のふち（光）と下の陰（床とのさかい目） */
    g.fillStyle = MA.Pix.rgba(B.wallTop, 0.95); g.fillRect(0, 0, TS, 2);
    g.fillStyle = "rgba(255,255,255,.18)"; g.fillRect(0, 2, TS, 1);
    const gr = g.createLinearGradient(0, 0, 0, WALL_H);
    gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(0.6, "rgba(0,0,0,.08)"); gr.addColorStop(1, "rgba(0,0,0,.42)");
    g.fillStyle = gr; g.fillRect(0, 0, TS, WALL_H);
    faceTex[biome] = c;
    return c;
  }

  /* ══ 光の玉（色ごとに1枚） ══ */
  const glowCache = {};
  function glow(col) {
    if (glowCache[col]) return glowCache[col];
    const c = MA.Pix.mkCanvas(64, 64), g = c.getContext("2d");
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, MA.Pix.rgba(col, 1)); gr.addColorStop(0.35, MA.Pix.rgba(col, 0.55)); gr.addColorStop(1, MA.Pix.rgba(col, 0));
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    if (Object.keys(glowCache).length > 80) for (const k in glowCache) delete glowCache[k];
    glowCache[col] = c;
    return c;
  }
  /* 迷宮ごとの まわりの明るさ・奥の霧・粒子 */
  const MOOD = {
    forest:  { amb: "#dceadb", fog: "#2a5a34", fogA: 0.45, part: "firefly", pool: "#fff2c8" },
    ice:     { amb: "#e2ecfa", fog: "#c4dcf4", fogA: 0.4, part: "snow", pool: "#e8f6ff" },
    lava:    { amb: "#e0b4a4", fog: "#6a2008", fogA: 0.5, part: "ember", pool: "#ffcf8a" },
    library: { amb: "#ead8bc", fog: "#4a2e14", fogA: 0.45, part: "dust", pool: "#ffe2a8" },
    abyss:   { amb: "#b0a2d8", fog: "#22103e", fogA: 0.55, part: "wisp", pool: "#d8c4ff" },
    sky:     { amb: "#f6f4ff", fog: "#e0d8ff", fogA: 0.35, part: "spark", pool: "#fff6d0" },
    guild:   { amb: "#f4e8d4", fog: "#3a2a14", fogA: 0.35, part: "dust", pool: "#ffe8b8" },
  };
  function mood(b) { return MOOD[b] || MOOD.forest; }

  /* ══ エフェクトの置き場所 ══ */
  const FX_UP = { pillar: 1, spikes: 1, meteor: 1, icicle: 1, lightning: 1, burst: 1, spark: 1, petalburst: 1, poof: 1, muzzle: 1, notes: 1, charge: 1 };
  const FX_SCREEN = { flashring: 1, bellflower: 1 };
  const FLAT_OBJ = { warp: 1, circle: 1, vent: 1, gravity: 1, retreat: 1 };

  /* ══ 1フレーム ══ */
  let lastT = 0;
  function draw(dt) {
    const g = G(); if (!g || !g.map || !cv) return;
    if (mode() !== lastMode) resize();
    if (!is25()) { L.setHD(false); R2.draw(dt); return; }
    L.setHD(true);
    const map = g.map, P = g.P, B = MA.Art.BIOME[map.biome] || MA.Art.BIOME.forest, M = mood(map.biome);
    camX = g.cam.x; camY = g.cam.y;
    if (g.shake > 0 && S().set.shake) { camX += (Math.random() - 0.5) * g.shake; camY += (Math.random() - 0.5) * g.shake; }
    camX = Math.round(camX * RD) / RD; camY = Math.round(camY * RD) / RD;
    oX = camX - g.vw / 2; oY = camY - g.vh / 2;
    const lite = mode() === "lite";

    /* ── ① 地面：真上の絵を作る ── */
    const pad = 24;
    gx0 = camX - P3.halfTop / RD - pad; gy0 = camY + P3.vTop / RD - pad;
    const gW = GW / RD, gH = GH / RD;
    gx0 = Math.floor(gx0 * RD) / RD; gy0 = Math.floor(gy0 * RD) / RD;
    gctx.setTransform(1, 0, 0, 1, 0, 0); gctx.globalAlpha = 1; gctx.globalCompositeOperation = "source-over";
    gctx.clearRect(0, 0, GW, GH);
    gctx.setTransform(RD, 0, 0, RD, 0, 0);
    const prev = L.useCtx(gctx);
    try {
      const c0 = Math.floor(gx0 / (CH * TS)), c1 = Math.floor((gx0 + gW) / (CH * TS)), r0 = Math.floor(gy0 / (CH * TS)), r1 = Math.floor((gy0 + gH) / (CH * TS));
      for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) { if (cx < 0 || cy < 0) continue; gctx.drawImage(L.chunk(cx, cy), cx * CH * TS - gx0, cy * CH * TS - gy0); }
      L.animTiles(gx0, gy0, gW, gH);
      g.ZN.forEach((z) => L.drawZone(z, gx0, gy0));
      g.TG.forEach((o) => L.drawTelegraph(o, gx0, gy0));
      map.objects.forEach((o) => { if (FLAT_OBJ[o.kind]) L.drawObject(o, gx0, gy0); });
      (g.gims || []).forEach((x) => { if (x.kind === "rune") { const s = MA.Art.sprite("rune"); gctx.globalAlpha = x.on ? 0.35 : 0.6 + 0.4 * Math.sin(g.t * 5); gctx.drawImage(s.frames[0], Math.round(x.x - gx0 - 10), Math.round(x.y - gy0 - 7)); gctx.globalAlpha = 1; } });
      /* 壁のねもとの陰（床に落ちる・やわらかく） */
      if (map.biome !== "sky") {
        const T = MA.Map.T, tx0 = Math.max(0, Math.floor(gx0 / TS)), tx1 = Math.min(map.W - 1, Math.floor((gx0 + gW) / TS)), ty0 = Math.max(0, Math.floor(gy0 / TS)), ty1 = Math.min(map.H - 2, Math.floor((gy0 + gH) / TS));
        if (!aoGrad) { aoGrad = MA.Pix.mkCanvas(1, 16); const ag = aoGrad.getContext("2d"), gr = ag.createLinearGradient(0, 0, 0, 16); gr.addColorStop(0, "rgba(0,0,0,.42)"); gr.addColorStop(0.5, "rgba(0,0,0,.14)"); gr.addColorStop(1, "rgba(0,0,0,0)"); ag.fillStyle = gr; ag.fillRect(0, 0, 1, 16); }
        for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
          if (map.tiles[ty * map.W + tx] !== T.WALL) continue;
          const below = map.tiles[(ty + 1) * map.W + tx];
          if (below === T.WALL || below === T.PIT) continue;
          gctx.drawImage(aoGrad, tx * TS - gx0, (ty + 1) * TS - gy0, TS, 16);
        }
      }
      /* 置物・弾・拾うものの影（地面に落ちる） */
      gctx.fillStyle = "rgba(0,0,0,.26)";
      const shade = (x, y, r) => { gctx.beginPath(); gctx.ellipse(x - gx0, y - gy0, r, r * 0.55, 0, 0, TAU); gctx.fill(); };
      map.decos.forEach((d) => { const x = d.x * TS + 8, y = d.y * TS + 14; if (x > gx0 - 20 && x < gx0 + gW + 20 && y > gy0 - 20 && y < gy0 + gH + 20) shade(x, y, 7); });
      g.PB.forEach((b) => shade(b.x, b.y + 1, 2.5));
      g.EB.forEach((b) => shade(b.x, b.y + 1, Math.max(2, (b.r || 3) * 0.8)));
      g.PK.forEach((p) => shade(p.x, p.y, 3));
      /* 地面のエフェクト */
      g.FX.forEach((f) => { if (f.t >= 0 && !FX_UP[f.type] && !FX_SCREEN[f.type]) L.drawFx(f, gx0, gy0); });
      P && P.notes.forEach((n) => { if (n.x == null) return; gctx.fillStyle = "#ffd84a"; gctx.fillRect(Math.round(n.x - gx0), Math.round(n.y - gy0 - 3), 2, 5); gctx.fillRect(Math.round(n.x - gx0) - 2, Math.round(n.y - gy0 + 1), 3, 2); });
      if (P && P.wall) { gctx.save(); gctx.translate(Math.round(P.wall.x - gx0), Math.round(P.wall.y - gy0)); gctx.rotate(P.wall.a); gctx.fillStyle = "rgba(127,208,255,.55)"; gctx.fillRect(-3, -P.wall.len / 2, 6, P.wall.len); gctx.fillStyle = "#e0f6ff"; gctx.fillRect(-1, -P.wall.len / 2, 2, P.wall.len); gctx.restore(); }
    } finally { L.useCtx(prev); }

    /* ── ② 背景（空・星）と、地面を傾けて貼る ── */
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = B.bg; ctx.fillRect(0, 0, W, H);
    if (map.biome === "sky" || map.biome === "abyss") { ctx.setTransform(RD, 0, 0, RD, 0, 0); L.useCtx(ctx); L.drawStars(camX, camY, W / RD, H / RD, map.biome); ctx.setTransform(1, 0, 0, 1, 0, 0); }
    warpGround();

    /* ── ③ 立てて描くもの（y の順） ── */
    const list = [];
    const wx0 = gx0, wx1 = gx0 + gW, wy0 = gy0, wy1 = gy0 + gH;
    const inView = (x, y, m) => x > wx0 - m && x < wx1 + m && y > wy0 - m && y < wy1 + m;
    /* 壁の前面（下が床の壁）。空の迷宮は崖なので立てない */
    if (map.biome !== "sky") {
      const T = MA.Map.T;
      const tx0 = Math.max(0, Math.floor(wx0 / TS)), tx1 = Math.min(map.W - 1, Math.floor(wx1 / TS)), ty0 = Math.max(0, Math.floor(wy0 / TS)), ty1 = Math.min(map.H - 2, Math.floor(wy1 / TS) + 2);
      for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
        if (map.tiles[ty * map.W + tx] !== T.WALL) continue;
        const below = map.tiles[(ty + 1) * map.W + tx];
        if (below === T.WALL || below === T.PIT) continue;
        list.push({ y: (ty + 1) * TS - 0.01, k: 9, tx, ty });
      }
      for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
        if (map.tiles[ty * map.W + tx] !== T.WALL) continue;
        const ex = (tx + 1) * TS, wxx = tx * TS;
        if (ex < camX && tx + 1 < map.W) { const n = map.tiles[ty * map.W + tx + 1]; if (n !== T.WALL && n !== T.PIT) list.push({ y: (ty + 1) * TS - 0.02, k: 11, tx, ty, side: 1 }); }
        if (wxx > camX && tx > 0) { const n = map.tiles[ty * map.W + tx - 1]; if (n !== T.WALL && n !== T.PIT) list.push({ y: (ty + 1) * TS - 0.02, k: 11, tx, ty, side: -1 }); }
      }
    }
    map.decos.forEach((d) => { const x = d.x * TS + 8, y = d.y * TS + 14; if (inView(x, y, 30)) list.push({ y, k: 0, o: d, x }); });
    map.objects.forEach((o) => { if (o.kind === "chest" && o.done) return; if (!FLAT_OBJ[o.kind] && inView(o.x, o.y, 30)) list.push({ y: o.y, k: 1, o }); });
    for (let i = 0; i < g.E.length; i++) { const e = g.E[i]; if (!e.dead && inView(e.x, e.y, 60)) list.push({ y: e.y, k: 2, o: e }); }
    if (P) list.push({ y: P.y, k: 3, o: P });
    P && P.clones.forEach((c) => list.push({ y: c.y, k: 4, o: c }));
    P && P.mirage.forEach((m) => list.push({ y: m.y, k: 5, o: m }));
    g.PK.forEach((p) => { if (inView(p.x, p.y, 10)) list.push({ y: p.y, k: 6, o: p }); });
    g.PB.forEach((b) => { if (inView(b.x, b.y, 40)) list.push({ y: b.y, k: 7, o: b }); });
    g.EB.forEach((b) => { if (inView(b.x, b.y, 20)) list.push({ y: b.y, k: 8, o: b }); });
    g.FX.forEach((f) => { if (f.t >= 0 && FX_UP[f.type]) list.push({ y: f.y, k: 10, o: f }); });
    list.sort((a, b) => a.y - b.y);
    L.useCtx(ctx);
    const wf = wallFace(map.biome);
    for (const it of list) {
      if (it.k === 9) { drawWall(it, wf); continue; }
      if (it.k === 11) { drawSide(it, B); continue; }
      const o = it.o;
      if (it.k === 0) { up(it.x, it.y, 0); L.drawDeco(o, oX, oY); }
      else if (it.k === 1) { up(o.x, o.y, 0); L.drawObject(o, oX, oY); }
      else if (it.k === 2) { up(o.x, o.y, 0); L.drawEnemy(o, oX, oY); }
      else if (it.k === 3) { up(o.x, o.y, 0); L.drawPlayer(o, oX, oY); }
      else if (it.k === 4) { up(o.x, o.y, 0); L.drawGhost(o, oX, oY, "#a874ff"); }
      else if (it.k === 5) { up(o.x, o.y, 0); L.drawGhost(o, oX, oY, "#ff6a3d"); }
      else if (it.k === 6) { up(o.x, o.y, 0); L.drawPickup(o, oX, oY); }
      else if (it.k === 7) { up(o.x, o.y, 7); L.drawPB(o, oX, oY); }
      else if (it.k === 8) { up(o.x, o.y, 6); L.drawEB(o, oX, oY); }
      else if (it.k === 10) { up(o.x, o.y, o.type === "pillar" || o.type === "lightning" || o.type === "meteor" || o.type === "icicle" || o.type === "spikes" ? 0 : 8); L.drawFx(o, oX, oY); }
      ctx.globalAlpha = 1;
    }
    /* 自分が壁の向こうにいるときも見えるように（うすく重ねる） */
    if (P && P.alive !== false) { up(P.x, P.y, 0); ctx.globalAlpha = 0.28; L.drawPlayer(P, oX, oY, 1, true); ctx.globalAlpha = 1; }
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    /* ── ④ 光・霧・粒子 ── */
    lights(g, map, P, M, lite);
    fog(M);
    particles(g, map, M, lite, dt);

    /* ── ⑤ 画面のもの（暗さ・雨・画面いっぱいの技・数字・光） ── */
    if (g.vision > 0 && P) dark(P, g.vision);
    if (g.ZN.some((z) => z.kind === "bigrain")) { ctx.setTransform(RD, 0, 0, RD, 0, 0); L.bigRain(W / RD, H / RD); ctx.setTransform(1, 0, 0, 1, 0, 0); }
    g.FX.forEach((f) => { if (f.t >= 0 && FX_SCREEN[f.type]) screenFx(f); });
    if (S().set.dmgNum) g.NUM.forEach((n) => {
      const a = n.t < 0.6 ? 1 : 1 - (n.t - 0.6) / 0.15;
      ctx.globalAlpha = Math.max(0, a);
      const p = proj(n.x, n.y);
      if (n.txt != null) { ctx.setTransform(RD, 0, 0, RD, 0, 0); L.drawLabel(n.txt, p.x / RD, p.y / RD, n.col, n.big); ctx.setTransform(1, 0, 0, 1, 0, 0); }
      else L.drawNum(ctx, MA.Pix.shortNum(n.v), p.x, p.y - (n.crit ? 2 : 0) * RD, n.col, (n.crit ? 2 : 1) * RD);
      ctx.globalAlpha = 1;
    });
    if (g.flash > 0) { ctx.globalAlpha = Math.min(0.55, g.flash * 0.5); ctx.fillStyle = g.flashCol || "#fff"; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    if (P && P.hp < P.st.hp * 0.3 && P.alive) { const a = 0.18 + 0.12 * Math.sin(g.t * 6); const gr = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.7); gr.addColorStop(0, "rgba(255,0,40,0)"); gr.addColorStop(1, "rgba(255,0,40," + a + ")"); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); }
    if (g.timeStopT > 0) { ctx.fillStyle = "rgba(255,244,176,.08)"; ctx.fillRect(0, 0, W, H); }
  }

  /* 立てて描く：その物の足もと（wx, wy）が投影の点に来るように変形をおく */
  function up(wx, wy, lift) {
    const p = proj(wx, wy), k = RD * p.s;
    ctx.setTransform(k, 0, 0, k, p.x - (wx - oX) * k, p.y - (wy - oY) * k - (lift || 0) * k);
    return p;
  }
  /* 壁の前面：下のふちの両はしを投影して、立てた四角に貼る */
  function drawWall(it, wf) {
    const yb = (it.ty + 1) * TS, a = proj(it.tx * TS, yb), b = proj((it.tx + 1) * TS, yb);
    const hh = WALL_H * RD * a.s;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const x0 = Math.floor(a.x), x1 = Math.ceil(b.x);
    ctx.drawImage(wf, x0, Math.round(a.y - hh), x1 - x0, Math.round(hh));
  }
  /* 壁の横の面（奥へのびる面）：タイルの東（または西）のふちを投影して、立てた四角形をぬる */
  function drawSide(it, B) {
    const x = it.side > 0 ? (it.tx + 1) * TS : it.tx * TS, ys = (it.ty + 1) * TS, yn = it.ty * TS;
    const a = proj(x, ys), b = proj(x, yn), ha = WALL_H * RD * a.s, hb = WALL_H * RD * b.s;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const gr = ctx.createLinearGradient(0, a.y - ha, 0, a.y);
    gr.addColorStop(0, MA.Pix.mix(B.wallFace, "#ffffff", 0.08)); gr.addColorStop(1, MA.Pix.shade(B.wallFace, 0.5));
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.moveTo(a.x, a.y + 0.5); ctx.lineTo(b.x, b.y); ctx.lineTo(b.x, b.y - hb); ctx.lineTo(a.x, a.y - ha); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = MA.Pix.rgba(B.wallTop, 0.75); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(a.x, a.y - ha); ctx.lineTo(b.x, b.y - hb); ctx.stroke();
  }
  /* 地面を傾けて貼る（横の帯ごとに、その奥行きの大きさで） */
  function warpGround() {
    const step = 2;
    ctx.imageSmoothingEnabled = true;
    for (let sy = 0; sy < H; sy += step) {
      const va = invV(sy - P3.cy), vb = invV(Math.min(H, sy + step) - P3.cy);
      const vm = (va + vb) / 2, s = P3.D / (P3.D - vm * P3.sin);
      const srcW = W / s, srcX = (camX - gx0) * RD - (W / 2) / s;
      const srcY = (camY - gy0) * RD + va, srcH = Math.max(0.5, vb - va);
      if (srcY < 0 || srcY + srcH > GH) continue;
      ctx.drawImage(gcv, srcX, srcY, srcW, srcH, 0, sy, W, Math.min(step, H - sy) + 0.5);
    }
    ctx.imageSmoothingEnabled = false;
  }
  /* 画面いっぱいの技（タキナの桔梗・光の輪） */
  function screenFx(f) {
    const k = f.t / f.dur, c = f.col || "#ffffff";
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (f.type === "flashring") { ctx.globalAlpha = 1 - k; ctx.strokeStyle = c; ctx.lineWidth = 4 * RD; ctx.beginPath(); ctx.arc(W / 2, H / 2, Math.max(W, H) * k, 0, TAU); ctx.stroke(); }
    else if (f.type === "bellflower") {
      ctx.globalAlpha = 1 - k * k;
      const R = Math.max(W, H) * (0.2 + k * 0.6), cx = W / 2, cy = H / 2;
      for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i / 5 * TAU + k; ctx.fillStyle = i % 2 ? "#a9a4ff" : "#6f6cff"; ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * R * 0.45, cy + Math.sin(a) * R * 0.45, R * 0.32, R * 0.18, a, 0, TAU); ctx.fill(); }
      ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(cx, cy, R * 0.12, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  /* ══ 光 ══ */
  function lights(g, map, P, M, lite) {
    const lw = lm.width, lh = lm.height, q = 1 / LMQ;
    lmx.setTransform(1, 0, 0, 1, 0, 0); lmx.globalCompositeOperation = "source-over"; lmx.globalAlpha = 1;
    lmx.fillStyle = M.amb; lmx.fillRect(0, 0, lw, lh);
    lmx.globalCompositeOperation = "lighter";
    const L2 = [];
    const add = (x, y, r, col, a) => { L2.push([x, y, r, col, a]); };
    if (P) { add(P.x, P.y - 6, 96, "#fff0d8", 0.5); add(P.x, P.y + 2, 46, M.pool || "#fff0d8", 0.35); }
    const T = MA.Map.T;
    map.objects.forEach((o) => {
      if (o.kind === "purifier" && !o.done) add(o.x, o.y - 8, 80, "#ffb060", 0.85);
      else if (o.kind === "exit") add(o.x, o.y, 70, "#7dffc0", 0.75);
      else if (o.kind === "fountain") add(o.x, o.y, 56, "#7fd8ff", 0.6);
      else if (o.kind === "chest" && !o.done && o.tier >= 2) add(o.x, o.y, 40, "#ffd84a", 0.55);
      else if (o.kind === "warp" || o.kind === "circle") add(o.x, o.y, 44, "#a874ff", 0.5);
      else if (o.kind === "altar" || o.kind === "spirit") add(o.x, o.y, 46, "#8affc4", 0.45);
    });
    /* 溶岩・魔法の床（見えているところだけ・数は上限つき） */
    let nl = 0;
    const tx0 = Math.max(0, Math.floor(gx0 / TS)), ty0 = Math.max(0, Math.floor(gy0 / TS)), tx1 = Math.min(map.W - 1, Math.floor((gx0 + GW / RD) / TS)), ty1 = Math.min(map.H - 1, Math.floor((gy0 + GH / RD) / TS));
    for (let ty = ty0; ty <= ty1 && nl < 70; ty++) for (let tx = tx0; tx <= tx1 && nl < 70; tx++) {
      const t = map.tiles[ty * map.W + tx];
      if (t === T.LAVA && (tx + ty) % 2 === 0) { add(tx * TS + 8, ty * TS + 8, 30, "#ff7a2a", 0.5); nl++; }
      else if (t === T.RUNE && (tx * 3 + ty) % 3 === 0) { add(tx * TS + 8, ty * TS + 8, 20, "#ffe86a", 0.35); nl++; }
      else if (t === T.TAINT && (tx + ty * 2) % 3 === 0) { add(tx * TS + 8, ty * TS + 8, 22, "#c070ff", 0.35); nl++; }
    }
    if (!lite) {
      g.PB.forEach((b) => add(b.x, b.y - 7, 20, b.col || "#ffffff", 0.5));
      g.EB.forEach((b) => add(b.x, b.y - 6, 18, b.col || "#ff5a6a", 0.55));
      g.PK.forEach((p) => { if (p.k === "gem") add(p.x, p.y - 4, 14, "#7affd0", 0.45); });
      g.FX.forEach((f) => { if (f.t < 0) return; const k = f.t / f.dur; if (k > 1) return; const r = (f.r || 24) * 1.4; if (r > 6) add(f.x, f.y, Math.min(r, 220), f.col || "#ffffff", 0.55 * (1 - k)); });
      g.ZN.forEach((z) => { if (z.kind !== "bigrain") add(z.x, z.y, z.r * 1.1, z.col || "#ffffff", 0.3); });
      g.E.forEach((e) => { if (!e.dead && (e.elite || e.boss)) add(e.x, e.y - 8, e.boss ? 90 : 34, e.boss ? "#ff6a8a" : "#ffcc3a", e.boss ? 0.4 : 0.3); });
    }
    L2.forEach(([x, y, r, col, a]) => {
      const p = proj(x, y), rr = r * RD * p.s * q;
      if (p.x + rr < 0 || p.x * q - rr > lw || p.y * q + rr < 0 || p.y * q - rr > lh) return;
      lmx.globalAlpha = a; lmx.drawImage(glow(col), p.x * q - rr, p.y * q - rr * P3.cos, rr * 2, rr * 2 * P3.cos);
    });
    lmx.globalAlpha = 1; lmx.globalCompositeOperation = "source-over";
    /* 暗くする（かけ算）→ 光のにじみ（足し算） */
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.globalCompositeOperation = "multiply"; ctx.drawImage(lm, 0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";
    L2.forEach(([x, y, r, col, a], i) => {
      if (i === 0) return;   /* 自分のまわりの光は にじませない（キャラが白っぽくなるため） */
      const p = proj(x, y), rr = r * RD * p.s * 0.55;
      if (p.x + rr < 0 || p.x - rr > W || p.y + rr < 0 || p.y - rr > H) return;
      ctx.globalAlpha = a * (lite ? 0.18 : 0.26); ctx.drawImage(glow(col), p.x - rr, p.y - rr * P3.cos, rr * 2, rr * 2 * P3.cos);
    });
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    ctx.imageSmoothingEnabled = false;
  }
  /* 奥の霧・すみの暗がり */
  let fogCache = { k: "" };
  function fog(M) {
    const k = M.fog + "|" + W + "x" + H;
    if (fogCache.k !== k) {
      const c = MA.Pix.mkCanvas(W, H), g = c.getContext("2d");
      const gr = g.createLinearGradient(0, 0, 0, H * 0.42);
      gr.addColorStop(0, MA.Pix.rgba(M.fog, M.fogA)); gr.addColorStop(0.55, MA.Pix.rgba(M.fog, M.fogA * 0.35)); gr.addColorStop(1, MA.Pix.rgba(M.fog, 0));
      g.fillStyle = gr; g.fillRect(0, 0, W, H * 0.42);
      const vg = g.createRadialGradient(W / 2, H * 0.52, Math.min(W, H) * 0.42, W / 2, H * 0.52, Math.hypot(W, H) * 0.62);
      vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(4,2,12,.5)");
      g.fillStyle = vg; g.fillRect(0, 0, W, H);
      const bt = g.createLinearGradient(0, H * 0.86, 0, H);
      bt.addColorStop(0, "rgba(0,0,0,0)"); bt.addColorStop(1, "rgba(0,0,0,.28)");
      g.fillStyle = bt; g.fillRect(0, H * 0.86, W, H * 0.14);
      fogCache = { k, c };
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(fogCache.c, 0, 0);
  }

  /* ══ ただよう粒子（迷宮ごと）＋手前のぼけ ══ */
  let parts = [], bokeh = [];
  const PART = {
    firefly: { n: 34, col: ["#d8ff7a", "#fff6a0"], up: -4, drift: 10, size: 1.6, life: [3, 6], z: [4, 34], blink: 1 },
    snow:    { n: 60, col: ["#ffffff", "#e0f0ff"], up: 16, drift: 10, size: 1.3, life: [4, 8], z: [0, 60], fall: 1 },
    ember:   { n: 48, col: ["#ffb04a", "#ff6a2a", "#ffe08a"], up: -22, drift: 8, size: 1.3, life: [1.6, 3.4], z: [0, 20] },
    dust:    { n: 34, col: ["#ffe8b0", "#fff4d8"], up: -3, drift: 5, size: 1.1, life: [4, 8], z: [6, 40] },
    wisp:    { n: 36, col: ["#c09aff", "#7ab0ff", "#ff9ad8"], up: -8, drift: 9, size: 1.7, life: [3, 6], z: [4, 40], blink: 1 },
    spark:   { n: 40, col: ["#fff1a0", "#ffffff", "#ffd0f0"], up: -5, drift: 6, size: 1.2, life: [2, 4], z: [4, 50], blink: 1 },
  };
  function particles(g, map, M, lite, dt) {
    const D = PART[M.part] || PART.dust, n = lite ? Math.round(D.n * 0.4) : D.n;
    const span = Math.max(W, H) / RD * 0.62, r = Math.random;
    while (parts.length < n) {
      parts.push({ x: camX + (r() - 0.5) * span * 2, y: camY + (r() - 0.5) * span * 2.2, z: D.z[0] + r() * (D.z[1] - D.z[0]),
        vx: (r() - 0.5) * D.drift, vz: D.fall ? -D.up * (0.6 + r() * 0.8) : -D.up * (0.6 + r() * 0.8), t: 0, life: D.life[0] + r() * (D.life[1] - D.life[0]),
        col: D.col[Math.floor(r() * D.col.length)], ph: r() * 9 });
    }
    if (parts.length > n) parts.length = n;
    const step = Math.min(0.05, dt || 0.016);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "lighter"; ctx.imageSmoothingEnabled = true;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      p.t += step; p.x += p.vx * step + Math.sin(g.t * 0.7 + p.ph) * 4 * step; p.z += p.vz * step;
      if (p.t > p.life || p.z < -2 || Math.abs(p.x - camX) > span * 1.2 || Math.abs(p.y - camY) > span * 1.3) { parts.splice(i, 1); i--; continue; }
      const k = p.t / p.life, a = Math.sin(Math.PI * k) * (D.blink ? 0.55 + 0.45 * Math.sin(g.t * 5 + p.ph) : 1);
      const q = proj(p.x, p.y), sz = D.size * RD * q.s * (1 + p.z / 80);
      const yy = q.y - p.z * RD * q.s;
      if (q.x < -10 || q.x > W + 10 || yy < -10 || yy > H + 10) continue;
      ctx.globalAlpha = Math.max(0, a) * 0.9;
      ctx.drawImage(glow(p.col), q.x - sz * 3, yy - sz * 3, sz * 6, sz * 6);
    }
    /* 手前のぼけ（大きく・うすく・ゆっくり） */
    if (!lite) {
      while (bokeh.length < 7) bokeh.push({ x: r() * W, y: r() * H, rr: (18 + r() * 34) * RD, vx: (r() - 0.5) * 6 * RD, vy: (r() - 0.5) * 4 * RD, col: (PART[M.part] || PART.dust).col[0], a: 0.05 + r() * 0.07 });
      bokeh.forEach((b) => {
        b.x += b.vx * step; b.y += b.vy * step;
        if (b.x < -b.rr) b.x = W + b.rr; else if (b.x > W + b.rr) b.x = -b.rr;
        if (b.y < -b.rr) b.y = H + b.rr; else if (b.y > H + b.rr) b.y = -b.rr;
        ctx.globalAlpha = b.a; ctx.drawImage(glow(b.col), b.x - b.rr, b.y - b.rr, b.rr * 2, b.rr * 2);
      });
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; ctx.imageSmoothingEnabled = false;
  }

  /* 暗さ（奈落・暗黒）：自分のまわりだけ見える */
  let darkC = null;
  function dark(P, k) {
    if (!darkC || darkC.width !== W || darkC.height !== H) darkC = MA.Pix.mkCanvas(W, H);
    const g = darkC.getContext("2d");
    g.globalCompositeOperation = "source-over"; g.clearRect(0, 0, W, H);
    g.fillStyle = "rgba(4,2,10,.94)"; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = "destination-out";
    const p = proj(P.x, P.y - 6), r = 92 * k * (P.st ? P.st.vision : 1) * RD * p.s;
    const gr = g.createRadialGradient(p.x, p.y, r * 0.45, p.x, p.y, r);
    gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.save(); g.translate(p.x, p.y); g.scale(1, P3.cos); g.translate(-p.x, -p.y); g.beginPath(); g.arc(p.x, p.y, r, 0, TAU); g.fill(); g.restore();
    G().map.objects.forEach((o) => {
      if (!((o.kind === "purifier" && !o.done) || o.kind === "exit" || o.kind === "fountain")) return;
      const q = proj(o.x, o.y); if (q.x < -120 || q.y < -120 || q.x > W + 120 || q.y > H + 120) return;
      const rr = 44 * RD * q.s, g2 = g.createRadialGradient(q.x, q.y, 4, q.x, q.y, rr);
      g2.addColorStop(0, "rgba(0,0,0,.9)"); g2.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = g2; g.beginPath(); g.arc(q.x, q.y, rr, 0, TAU); g.fill();
    });
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(darkC, 0, 0);
  }

  /* 画面の点（0〜1 の割合）→ 地面の点（ワールド）。マウスでねらうとき */
  function screenToWorld(fx, fy) {
    const g = G(); if (!g) return null;
    if (!is25()) return { x: g.cam.x - g.vw / 2 + fx * g.vw, y: g.cam.y - g.vh / 2 + fy * g.vh };
    const sx = fx * W, sy = Math.min(H * 0.999, Math.max(0, fy * H));
    const c0x = camX, c0y = camY; camX = g.cam.x; camY = g.cam.y;
    const r = unproj(sx, sy); camX = c0x; camY = c0y;
    return r;
  }

  MA.Render = { init, resize, draw, onStart, onMap, dirtyMap, drawMap: R2.drawMap, drawNum: R2.drawNum, screenToWorld, is25, mode };
})();
