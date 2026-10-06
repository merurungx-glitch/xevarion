/* ============================================================
   MagiAbyss — ma-render.js
   描画（ドットのまま拡大する。キャンバスは「見える範囲の画素数」だけ持つ）
   ・地図は 32×32 タイルのかたまり（チャンク）に一度だけ描いておき、毎フレームは貼るだけ。
   ・壁は上面と前面を描き分ける（2.5D）。木・本棚などの置物は人物と一緒に y の順で描く。
   ============================================================ */
(function () {
  "use strict";
  const MA = (window.MA = window.MA || {});
  const TAU = Math.PI * 2;
  const G = () => MA.G;
  const D = () => MA.D;
  const T = () => MA.Map.T;
  const TS = 16, CH = 32;
  let cv = null, ctx = null;
  let chunks = {}, chunkDirty = true;

  let bound = false;
  function init(canvas) {
    cv = canvas; ctx = cv.getContext("2d", { alpha: false });
    resize();
    /* ★ 探索を始めるたびに呼ばれるので、受け口は1回だけ */
    if (!bound) { bound = true; window.addEventListener("resize", resize); window.addEventListener("orientationchange", () => setTimeout(resize, 200)); }
  }
  function resize() {
    if (!cv) return;
    /* ★★ 2026-10-05 iPhone のアプリ表示では本当の画面の高さ（MA.vp）。スマホの横画面は少し寄る */
    const v = MA.vp ? MA.vp() : { w: window.innerWidth, h: window.innerHeight };
    const w = v.w, h = v.h;
    const S = MA.Save && MA.Save.S;
    const z = (S && S.set.zoom) || "auto";
    const port = h > w;
    const target = (z === "near" ? 0.8 : z === "far" ? 1.22 : 1) * (port ? 240 : (MA.isPhone && MA.isPhone() ? 250 : 300));
    let scale = Math.min(w, h) / target;
    if (scale >= 2) scale = Math.floor(scale * 2) / 2;
    scale = Math.max(1, scale);
    const vw = Math.ceil(w / scale), vh = Math.ceil(h / scale);
    cv.width = vw; cv.height = vh;
    cv.style.width = w + "px"; cv.style.height = h + "px";
    const g = G(); g.vw = vw; g.vh = vh; g.scale = scale;
    ctx.imageSmoothingEnabled = false;
  }
  function onStart() { chunks = {}; chunkDirty = true; resize(); }
  function onMap() { chunks = {}; chunkDirty = true; }
  function dirtyMap() { chunks = {}; }

  /* ══ チャンク（地図の床と壁）══ */
  function hash(x, y) { let h = x * 374761393 + y * 668265263; h = (h ^ (h >>> 13)) * 1274126177; return (h ^ (h >>> 16)) >>> 0; }
  function buildChunk(cx, cy) {
    const map = G().map, biome = map.biome;
    const tl = MA.Art.tiles(biome), B = MA.Art.BIOME[biome];
    const c = MA.Pix.mkCanvas(CH * TS, CH * TS), g = c.getContext("2d");
    g.imageSmoothingEnabled = false;
    const sky = biome === "sky", abyss = biome === "abyss";
    const t = T();
    const solidLike = (tt) => tt === t.WALL || tt === t.PIT;
    for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CH; tx++) {
      const x = cx * CH + tx, y = cy * CH + ty;
      if (x >= map.W || y >= map.H) continue;
      const tt = map.tiles[y * map.W + x];
      const px = tx * TS, py = ty * TS;
      if (tt === t.WALL || tt === t.PIT) {
        const below = y + 1 < map.H ? map.tiles[(y + 1) * map.W + x] : t.WALL;
        if (sky) { if (!solidLike(below)) { g.drawImage(tl.face, px, py); } continue; }
        if (abyss && !(below !== t.WALL && below !== t.PIT)) { /* 奈落：壁の奥は闇 */ g.fillStyle = "#07050d"; g.fillRect(px, py, TS, TS); continue; }
        g.drawImage(solidLike(below) ? tl.top : tl.face, px, py);
        /* さかい目の縁取り（となりが床なら暗い線＋上面のふち） */
        if (solidLike(below)) {
          const L = x > 0 ? map.tiles[y * map.W + x - 1] : t.WALL, Rr = x + 1 < map.W ? map.tiles[y * map.W + x + 1] : t.WALL, U = y > 0 ? map.tiles[(y - 1) * map.W + x] : t.WALL;
          g.fillStyle = B.wallEdge;
          if (!solidLike(L) && L !== t.BLOCK) g.fillRect(px, py, 2, TS);
          if (!solidLike(Rr) && Rr !== t.BLOCK) g.fillRect(px + TS - 2, py, 2, TS);
          if (!solidLike(U) && U !== t.BLOCK) g.fillRect(px, py, TS, 2);
        }
        continue;
      }
      /* 床 */
      const v = hash(x, y) % 4;
      g.drawImage(tl.floor[v], px, py);
      if (tt === t.POISON) g.drawImage(tl.poison, px, py);
      else if (tt === t.ICE) g.drawImage(tl.ice, px, py);
      else if (tt === t.LAVA) g.drawImage(tl.lava, px, py);
      else if (tt === t.RUNE) g.drawImage(tl.rune, px, py);
      else if (tt === t.TAINT) g.drawImage(tl.taint, px, py);
      else if (tt === t.WATER) g.drawImage(tl.water, px, py);
      else if (tt === t.CARPET) g.drawImage(tl.carpet, px, py);
      else if (tt === t.SECRET) { g.drawImage(tl.face, px, py); g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(px + 5, py + 4, 1, 7); g.fillRect(px + 6, py + 10, 3, 1); }
      else if (tt === t.VINE) { g.drawImage(tl.face, px, py); g.fillStyle = "#3f8a34"; g.fillRect(px + 2, py, 3, 16); g.fillRect(px + 9, py, 3, 16); g.fillStyle = "#7fd060"; g.fillRect(px + 4, py + 3, 6, 2); g.fillRect(px + 1, py + 10, 6, 2); g.fillStyle = "#ff8fd0"; g.fillRect(px + 7, py + 6, 2, 2); }
      else if (tt === t.BOSSDOOR) { g.fillStyle = "#3a1a2a"; g.fillRect(px, py, TS, TS); g.fillStyle = "#ff3050"; g.fillRect(px, py + 7, TS, 2); g.fillStyle = "#7a2a4a"; g.fillRect(px + 2, py, 2, TS); g.fillRect(px + 12, py, 2, TS); }
      else if (tt === t.SEALDOOR) { g.fillStyle = "#3a2a1a"; g.fillRect(px, py, TS, TS); g.fillStyle = "#e8d080"; g.fillRect(px + 6, py + 2, 4, 12); g.fillStyle = "#8a6a3a"; g.fillRect(px + 2, py, 2, TS); g.fillRect(px + 12, py, 2, TS); }
      /* 影（壁の真下） */
      if (y > 0) { const up = map.tiles[(y - 1) * map.W + x]; if (up === t.WALL && !sky) { g.fillStyle = "rgba(0,0,0,.28)"; g.fillRect(px, py, TS, 4); } }
    }
    return c;
  }
  function chunk(cx, cy) { const k = cx + "," + cy; if (!chunks[k]) chunks[k] = buildChunk(cx, cy); return chunks[k]; }

  /* ══ ダメージ数字のフォント（色ごとに1枚の帳面）══ */
  const GL = "0123456789.KM+-!/%x";
  const atlas = {};
  function glyphAtlas(col) {
    if (atlas[col]) return atlas[col];
    const c = MA.Pix.mkCanvas(GL.length * 6, 7), g = c.getContext("2d");
    for (let i = 0; i < GL.length; i++) { const s = MA.Pix.textSprite(GL[i], col, 1); g.drawImage(s, i * 6, 0); }
    atlas[col] = c;
    return c;
  }
  function drawNum(g, str, x, y, col, sc) {
    const at = glyphAtlas(col); sc = sc || 1;
    let w = 0; for (const ch of str) w += (ch === "." || ch === "!" ? 2 : ch === "M" ? 6 : 4);
    let cx = Math.round(x - w * sc / 2);
    for (const ch of str) {
      const i = GL.indexOf(ch); if (i < 0) { cx += 4 * sc; continue; }
      const gw = ch === "M" ? 7 : (ch === "." || ch === "!") ? 3 : 5;
      g.drawImage(at, i * 6, 0, gw, 7, cx, Math.round(y), gw * sc, 7 * sc);
      cx += (gw - 1) * sc;
    }
  }

  /* ══ 1フレーム ══ */
  let starfield = null;
  function draw(dt) {
    const g = G(); if (!g.map || !ctx) return;
    const map = g.map, P = g.P;
    const vw = g.vw, vh = g.vh;
    let camX = g.cam.x - vw / 2, camY = g.cam.y - vh / 2;
    if (g.shake > 0 && MA.Save.S.set.shake) { camX += (Math.random() - 0.5) * g.shake; camY += (Math.random() - 0.5) * g.shake; }
    camX = Math.round(camX); camY = Math.round(camY);
    const B = MA.Art.BIOME[map.biome];
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";   /* ★ 前のコマの変形が残らないように */
    ctx.fillStyle = B.bg; ctx.fillRect(0, 0, vw, vh);
    if (map.biome === "sky" || map.biome === "abyss") drawStars(camX, camY, vw, vh, map.biome);
    /* 地図 */
    const c0 = Math.floor(camX / (CH * TS)), c1 = Math.floor((camX + vw) / (CH * TS)), r0 = Math.floor(camY / (CH * TS)), r1 = Math.floor((camY + vh) / (CH * TS));
    for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) { if (cx < 0 || cy < 0) continue; ctx.drawImage(chunk(cx, cy), cx * CH * TS - camX, cy * CH * TS - camY); }
    animTiles(camX, camY, vw, vh);
    /* 床のもの：範囲・予告 */
    g.ZN.forEach((z) => drawZone(z, camX, camY));
    g.TG.forEach((o) => drawTelegraph(o, camX, camY));
    /* 地図の物（低いもの） */
    map.objects.forEach((o) => { if (o.kind === "warp" || o.kind === "circle" || o.kind === "vent" || o.kind === "gravity" || o.kind === "retreat") drawObject(o, camX, camY); });
    (g.gims || []).forEach((x) => { if (x.kind === "rune") { const s = MA.Art.sprite("rune"); ctx.globalAlpha = x.on ? 0.35 : 0.6 + 0.4 * Math.sin(g.t * 5); ctx.drawImage(s.frames[0], Math.round(x.x - camX - 10), Math.round(x.y - camY - 7)); ctx.globalAlpha = 1; } });
    /* 拾うもの */
    g.PK.forEach((p) => drawPickup(p, camX, camY));
    /* y の順に：置物・物・敵・プレイヤー */
    const list = [];
    const inView = (x, y, m) => x > camX - m && x < camX + vw + m && y > camY - m && y < camY + vh + m + 30;
    map.decos.forEach((d) => { const x = d.x * TS + 8, y = d.y * TS + 14; if (inView(x, y, 30)) list.push({ y, k: 0, o: d }); });
    /* ★ 2026-10-05 開けた宝箱は消す（ご指定「取ったら消える」） */
    map.objects.forEach((o) => { if (o.kind === "chest" && o.done) return; if (!(o.kind === "warp" || o.kind === "circle" || o.kind === "vent" || o.kind === "gravity" || o.kind === "retreat") && inView(o.x, o.y, 30)) list.push({ y: o.y, k: 1, o }); });
    for (let i = 0; i < g.E.length; i++) { const e = g.E[i]; if (!e.dead && inView(e.x, e.y, 60)) list.push({ y: e.y, k: 2, o: e }); }
    if (P) list.push({ y: P.y, k: 3, o: P });
    P && P.clones.forEach((c) => list.push({ y: c.y, k: 4, o: c }));
    P && P.mirage.forEach((m) => list.push({ y: m.y, k: 5, o: m }));
    list.sort((a, b) => a.y - b.y);
    for (const it of list) {
      if (it.k === 0) drawDeco(it.o, camX, camY);
      else if (it.k === 1) drawObject(it.o, camX, camY);
      else if (it.k === 2) drawEnemy(it.o, camX, camY);
      else if (it.k === 3) drawPlayer(it.o, camX, camY, 1);
      else if (it.k === 4) drawGhost(it.o, camX, camY, "#a874ff");
      else if (it.k === 5) drawGhost(it.o, camX, camY, "#ff6a3d");
    }
    /* 弾 */
    g.PB.forEach((b) => drawPB(b, camX, camY));
    g.EB.forEach((b) => drawEB(b, camX, camY));
    P && P.notes.forEach((n) => { if (n.x == null) return; ctx.fillStyle = "#ffd84a"; ctx.fillRect(Math.round(n.x - camX), Math.round(n.y - camY - 3), 2, 5); ctx.fillRect(Math.round(n.x - camX) - 2, Math.round(n.y - camY + 1), 3, 2); });
    if (P && P.wall) { ctx.save(); ctx.translate(Math.round(P.wall.x - camX), Math.round(P.wall.y - camY)); ctx.rotate(P.wall.a); ctx.fillStyle = "rgba(127,208,255,.55)"; ctx.fillRect(-3, -P.wall.len / 2, 6, P.wall.len); ctx.fillStyle = "#e0f6ff"; ctx.fillRect(-1, -P.wall.len / 2, 2, P.wall.len); ctx.restore(); }
    /* エフェクト */
    g.FX.forEach((f) => drawFx(f, camX, camY));
    /* 暗さ（奈落・暗黒） */
    if (g.vision > 0) drawDark(P, camX, camY, vw, vh, g.vision);
    /* 降る雨（ココハの必殺技など） */
    if (g.ZN.some((z) => z.kind === "bigrain")) bigRain(vw, vh);
    /* 数字 */
    if (MA.Save.S.set.dmgNum) g.NUM.forEach((n) => {
      const a = n.t < 0.6 ? 1 : 1 - (n.t - 0.6) / 0.15;
      ctx.globalAlpha = Math.max(0, a);
      const x = n.x - camX, y = n.y - camY;
      if (n.txt != null) { drawLabel(n.txt, x, y, n.col, n.big); }
      else drawNum(ctx, MA.Pix.shortNum(n.v), x, y - (n.crit ? 2 : 0), n.col, n.crit ? 2 : 1);
      ctx.globalAlpha = 1;
    });
    /* 画面の光 */
    if (g.flash > 0) { ctx.globalAlpha = Math.min(0.55, g.flash * 0.5); ctx.fillStyle = g.flashCol || "#fff"; ctx.fillRect(0, 0, vw, vh); ctx.globalAlpha = 1; }
    if (P && P.hp < P.st.hp * 0.3 && P.alive) { const a = 0.18 + 0.12 * Math.sin(g.t * 6); const gr = ctx.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.35, vw / 2, vh / 2, Math.max(vw, vh) * 0.7); gr.addColorStop(0, "rgba(255,0,40,0)"); gr.addColorStop(1, "rgba(255,0,40," + a + ")"); ctx.fillStyle = gr; ctx.fillRect(0, 0, vw, vh); }
    if (g.timeStopT > 0) { ctx.fillStyle = "rgba(255,244,176,.08)"; ctx.fillRect(0, 0, vw, vh); }
  }
  /* 文字（日本語のポップ）は小さな canvas にして使い回す */
  const labelCache = {};
  function drawLabel(txt, x, y, col, big) {
    const k = txt + "|" + col + "|" + (big ? 1 : 0);
    let c = labelCache[k];
    if (!c) {
      const fs = big ? 12 : 9;
      const m = MA.Pix.mkCanvas(1, 1).getContext("2d"); m.font = "700 " + fs + "px 'DotGothic16', monospace";
      const w = Math.ceil(m.measureText(txt).width) + 4;
      c = MA.Pix.mkCanvas(w, fs + 4); const g = c.getContext("2d");
      g.font = "700 " + fs + "px 'DotGothic16', monospace"; g.textBaseline = "top";
      g.fillStyle = "#120a18"; [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dx, dy]) => g.fillText(txt, 2 + dx, 2 + dy));
      g.fillStyle = col; g.fillText(txt, 2, 2);
      if (Object.keys(labelCache).length > 300) for (const kk in labelCache) delete labelCache[kk];
      labelCache[k] = c;
    }
    ctx.drawImage(c, Math.round(x - c.width / 2), Math.round(y - c.height / 2));
  }
  function drawStars(camX, camY, vw, vh, biome) {
    if (!starfield) { starfield = []; const r = MA.Art.rng(7); for (let i = 0; i < 140; i++) starfield.push([r() * 1200, r() * 1200, r() < 0.15 ? 2 : 1, r()]); }
    const t = G().t;
    starfield.forEach(([x, y, s, ph]) => {
      const sx = ((x - camX * 0.3) % 1200 + 1200) % 1200, sy = ((y - camY * 0.3) % 1200 + 1200) % 1200;
      if (sx > vw || sy > vh) return;
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 2 + ph * 9);
      ctx.fillStyle = biome === "sky" ? "#fff4c0" : "#a874ff";
      ctx.fillRect(Math.round(sx), Math.round(sy), s, s);
    });
    ctx.globalAlpha = 1;
  }
  /* 動く床（溶岩・魔法床・汚染）は光らせる */
  function animTiles(camX, camY, vw, vh) {
    const map = G().map, t = T(), tm = G().t;
    const x0 = Math.max(0, Math.floor(camX / TS)), x1 = Math.min(map.W - 1, Math.floor((camX + vw) / TS)), y0 = Math.max(0, Math.floor(camY / TS)), y1 = Math.min(map.H - 1, Math.floor((camY + vh) / TS));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const tt = map.tiles[y * map.W + x];
      if (tt === t.LAVA) { ctx.globalAlpha = 0.25 + 0.2 * Math.sin(tm * 3 + x + y); ctx.fillStyle = "#ffd04a"; ctx.fillRect(x * TS - camX, y * TS - camY, TS, TS); }
      else if (tt === t.RUNE && Math.floor(tm / 3) % 2 === 0) { ctx.globalAlpha = 0.35 + 0.2 * Math.sin(tm * 8); ctx.fillStyle = "#ffe86a"; ctx.fillRect(x * TS - camX + 2, y * TS - camY + 2, TS - 4, TS - 4); }
      else if (tt === t.TAINT) { ctx.globalAlpha = 0.2 + 0.15 * Math.sin(tm * 2 + x); ctx.fillStyle = "#c070ff"; ctx.fillRect(x * TS - camX, y * TS - camY, TS, TS); }
    }
    ctx.globalAlpha = 1;
  }
  function drawDeco(d, camX, camY) {
    const s = MA.Art.deco(d.kind, d.v);
    const f = s.frames[0];
    ctx.drawImage(f, Math.round(d.x * TS + 8 - f.width / 2 - camX), Math.round(d.y * TS + 15 - f.height - camY));
  }
  function shadow(x, y, w) { ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(x, y, w, w * 0.4, 0, 0, TAU); ctx.fill(); }
  function drawPlayer(P, camX, camY) {
    const g = G();
    const sp = MA.Pix.charSprite(P.cid);
    let f;
    if (P.hurtT > 0 && Math.floor(P.hurtT * 30) % 2 === 0) f = sp.hurt;
    else if (P.atkAnim > 0) f = sp.atk;
    else if (P.moving && P.side && sp.side) f = sp.side[Math.floor(P.walkT * 10) % 4];
    else if (P.moving) f = sp.walk[Math.floor(P.walkT * 9) % 4];
    else { const it = Math.floor(g.t * 2) % 2; f = sp.idle[(g.t % 3.2) > 3.05 ? 2 : it]; }
    const x = Math.round(P.x - camX), y = Math.round(P.y - camY);
    shadow(x, y + 2, 7);
    if (P.dashT > 0) { ctx.globalAlpha = 0.35; ctx.drawImage(f, x - f.width / 2 - Math.sign(P.dvx) * 8, y - f.height + 4); ctx.globalAlpha = 1; }
    if (P.iT > 0 && P.hurtT <= 0 && Math.floor(P.iT * 20) % 2 === 0) ctx.globalAlpha = 0.6;
    if (P.face < 0) { ctx.save(); ctx.translate(x, 0); ctx.scale(-1, 1); ctx.drawImage(f, -Math.floor(f.width / 2), y - f.height + 4); ctx.restore(); }
    else ctx.drawImage(f, x - Math.floor(f.width / 2), y - f.height + 4);
    ctx.globalAlpha = 1;
    if (P.shield > 0) { ctx.strokeStyle = "rgba(127,208,255,.7)"; ctx.beginPath(); ctx.ellipse(x, y - 10, 13, 16, 0, 0, TAU); ctx.stroke(); }
    /* ねらいの向き（小さな矢印） */
    const ax = x + Math.cos(P.aimA) * 16, ay = y - 8 + Math.sin(P.aimA) * 16;
    ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.fillRect(Math.round(ax) - 1, Math.round(ay) - 1, 2, 2);
  }
  function drawGhost(o, camX, camY, col) {
    const sp = MA.Pix.charSprite(G().P.cid);
    const f = sp.idle[0];
    ctx.globalAlpha = 0.45; ctx.drawImage(f, Math.round(o.x - camX - f.width / 2), Math.round(o.y - camY - f.height + 4)); ctx.globalAlpha = 1;
    ctx.fillStyle = col; ctx.fillRect(Math.round(o.x - camX) - 1, Math.round(o.y - camY) + 3, 3, 1);
  }
  function drawEnemy(e, camX, camY) {
    const g = G();
    const art = e.art; if (!art) return;
    const fi = Math.floor(e.animT * (e.st === "dash" ? 10 : 4)) % art.frames.length;
    const f = art.frames[fi];
    const fw = (e.hitT > 0 && art.white) ? art.white[fi] : null;
    const sc = e.boss ? 1 : (e.scale || 1);
    const w = f.width * sc, h = f.height * sc;
    const x = Math.round(e.x - camX), y = Math.round(e.y - camY);
    if (!e.isGim) shadow(x, y + 1, Math.max(4, w * 0.35));
    if (e.decoy) ctx.globalAlpha = 0.7;
    /* 予告中は少しふるえる */
    let ox = 0; if (e.st === "wind" || (e.boss && e.patT < 0.4)) ox = Math.sin(g.t * 60) * 1;
    if (e.elite && !e.boss) { ctx.globalAlpha = 0.35 + 0.2 * Math.sin(g.t * 6); ctx.fillStyle = e.mid ? "#ff8a3d" : "#ffcc3a"; ctx.beginPath(); ctx.ellipse(x, y - h / 2, w * 0.62, h * 0.62, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = e.decoy ? 0.7 : 1; }
    const baseA = ctx.globalAlpha;
    if (e.face < 0 && !e.boss) {
      ctx.save(); ctx.translate(x, 0); ctx.scale(-1, 1); ctx.drawImage(f, -w / 2 + ox, y - h + 2, w, h);
      if (fw) { ctx.globalAlpha = baseA * Math.min(0.75, e.hitT * 6); ctx.drawImage(fw, -w / 2 + ox, y - h + 2, w, h); }
      ctx.restore();
    } else {
      const dx = Math.round(x - w / 2 + ox), dy = Math.round(y - h + (e.boss ? h * 0.35 : 2));
      ctx.drawImage(f, dx, dy, w, h);
      if (fw) { ctx.globalAlpha = baseA * Math.min(0.75, e.hitT * 6); ctx.drawImage(fw, dx, dy, w, h); }
    }
    ctx.globalAlpha = 1;
    const top = e.boss ? y - h * 0.65 : y - h;
    /* 状態の印 */
    if (e.burnT > 0 && Math.floor(g.t * 8) % 2 === 0) { ctx.fillStyle = "#ff8a3d"; ctx.fillRect(x - 2 + Math.round(Math.sin(g.t * 9) * 3), top - 2, 2, 3); }
    if (e.slowT > 0) { ctx.fillStyle = "rgba(127,208,255,.5)"; ctx.fillRect(x - Math.round(w / 3), y, Math.round(w / 1.5), 2); }
    if (e.guardOn) { ctx.fillStyle = "#c8d8f0"; ctx.fillRect(x + Math.round(w / 2) - 2, top + 2, 4, 5); ctx.fillStyle = "#6a7a9a"; ctx.fillRect(x + Math.round(w / 2) - 1, top + 3, 2, 3); }
    if (e.paintT > 0) { ctx.fillStyle = ["#ff6a3d", "#3fa9ff", "#4fe39a", "#ffd84a"][Math.floor(g.t * 8) % 4]; ctx.fillRect(x - 1, top - 4, 2, 2); }
    if (e.defDownT > 0) { ctx.fillStyle = "#6f6cff"; ctx.fillRect(x - Math.round(w / 2) - 2, top + 1, 3, 1); ctx.fillRect(x - Math.round(w / 2) - 1, top + 2, 1, 2); }
    if (e.breakT > 0) { for (let i = 0; i < 3; i++) { const a = g.t * 4 + i * 2.1; ctx.fillStyle = "#ffd84a"; ctx.fillRect(Math.round(x + Math.cos(a) * 14), Math.round(top - 6 + Math.sin(a) * 4), 2, 2); } }
    if (e.stunT > 0 && !e.boss) { ctx.fillStyle = "#ffffff"; ctx.fillRect(x - 3, top - 4, 1, 1); ctx.fillRect(x + 2, top - 5, 1, 1); }
    /* HP（エリート・中ボス・ギミック） */
    if ((e.elite || e.isGim || e.mid) && !e.boss) {
      const bw = Math.max(16, Math.round(w)), r = Math.max(0, e.hp / e.mhp);
      ctx.fillStyle = "#120a18"; ctx.fillRect(x - bw / 2 - 1, top - 6, bw + 2, 4);
      ctx.fillStyle = e.isGim ? "#ffd84a" : e.mid ? "#ff8a3d" : "#ff4a5a"; ctx.fillRect(x - bw / 2, top - 5, Math.round(bw * r), 2);
    }
  }
  function drawObject(o, camX, camY) {
    const g = G();
    const x = Math.round(o.x - camX), y = Math.round(o.y - camY);
    let key = null, alpha = 1;
    switch (o.kind) {
      case "chest": key = o.tier >= 3 ? (o.done ? "chestBossOpen" : "chestBoss") : o.tier === 2 ? (o.done ? "chestRareOpen" : "chestRare") : (o.done ? "chestOpen" : "chest"); break;
      case "fountain": key = "fountain"; alpha = o.done ? 0.6 : 1; break;
      case "altar": key = "altar"; alpha = o.done ? 0.5 : 1; break;
      case "spirit": key = "spirit"; alpha = o.done ? 0.5 : 1; break;
      case "circle": key = "circle"; alpha = o.done ? 0.35 : 0.7 + 0.3 * Math.sin(g.t * 3); break;
      case "retreat": key = "portal"; alpha = 0.8; break;
      case "exit": key = "exitPortal"; break;
      case "warp": key = "warp"; alpha = 0.7 + 0.3 * Math.sin(g.t * 5); break;
      case "vent": key = "vent"; break;
      case "gravity": key = "gravity"; alpha = 0.7 + 0.3 * Math.sin(g.t * 4); break;
      case "lore": if (o.done) return; key = "lorePage"; break;
      case "starShard": if (o.done) return; key = "key"; break;
      case "purifier": key = o.done ? "brazierOff" : "brazier"; break;
      default: return;
    }
    const s = MA.Art.sprite(key);
    const f = s.frames[Math.floor(g.t * 3) % s.frames.length];
    ctx.globalAlpha = alpha;
    const bob = (o.kind === "lore" || o.kind === "starShard") ? Math.round(Math.sin(g.t * 4) * 2) : 0;
    if (o.kind === "gravity") { ctx.save(); ctx.translate(x, y); ctx.rotate(g.t * 3); ctx.drawImage(f, -f.width / 2, -f.height / 2); ctx.restore(); }
    else ctx.drawImage(f, Math.round(x - f.width / 2), Math.round(y - f.height + 6 + bob));
    ctx.globalAlpha = 1;
    if (o.locked) { const li = MA.Art.sprite("key"); ctx.globalAlpha = 0.6; ctx.drawImage(li.frames[0], x - 6, y - 22); ctx.globalAlpha = 1; }
    /* 近くにあるときの印 */
    if (g.near === o && !o.done) { ctx.fillStyle = "#ffffff"; ctx.fillRect(x - 1, y - 26 + Math.round(Math.sin(g.t * 6) * 2), 3, 3); }
    if ((o.kind === "chest" && !o.done && o.tier >= 2) || o.kind === "exit") { ctx.globalAlpha = 0.25 + 0.15 * Math.sin(g.t * 4); ctx.fillStyle = o.kind === "exit" ? "#8affc4" : "#ffd84a"; ctx.beginPath(); ctx.ellipse(x, y - 4, 14, 8, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
  }
  function drawPickup(p, camX, camY) {
    const x = Math.round(p.x - camX), y = Math.round(p.y - camY);
    if (x < -10 || y < -10 || x > G().vw + 10 || y > G().vh + 10) return;
    let key = "gem1";
    if (p.k === "gem") key = p.v >= 20 ? "gem3" : p.v >= 4 ? "gem2" : "gem1";
    else if (p.k === "coin") key = "coin"; else if (p.k === "heal") key = "heal"; else if (p.k === "magnet") key = "magnet"; else if (p.k === "mat") key = "matDrop";
    const f = MA.Art.sprite(key).frames[0];
    ctx.drawImage(f, x - Math.floor(f.width / 2), y - f.height + Math.round(Math.sin(G().t * 5 + p.x) * 1));
  }
  function col(c, a) { return MA.Pix.rgba(c, a); }
  function drawPB(b, camX, camY) {
    const x = Math.round(b.x - camX), y = Math.round(b.y - camY);
    if (x < -40 || y < -40 || x > G().vw + 40 || y > G().vh + 40) return;
    const a = Math.atan2(b.vy, b.vx), t = G().t;
    switch (b.kind) {
      case "bullet": ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = b.col; ctx.fillRect(-4, -1, 7, 3); ctx.fillStyle = "#ffffff"; ctx.fillRect(-1, 0, 4, 1); ctx.restore(); break;
      case "arrow": ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = "#e8e0c8"; ctx.fillRect(-6, 0, 9, 1); ctx.fillStyle = b.col; ctx.fillRect(3, -1, 3, 3); ctx.restore(); break;
      case "blade": ctx.save(); ctx.translate(x, y); ctx.rotate(t * 18); ctx.fillStyle = b.col; ctx.fillRect(-4, -1, 8, 2); ctx.fillRect(-1, -4, 2, 8); ctx.fillStyle = "#ffffff"; ctx.fillRect(-1, -1, 2, 2); ctx.restore(); break;
      case "ball": ctx.fillStyle = b.col; ctx.beginPath(); ctx.arc(x, y, b.r, 0, TAU); ctx.fill(); ctx.fillStyle = "#4a2410"; ctx.fillRect(x - b.r, y, b.r * 2, 1); ctx.fillRect(x, y - b.r, 1, b.r * 2); break;
      case "petal": ctx.fillStyle = b.col; ctx.fillRect(x - 2, y - 1, 4, 3); ctx.fillStyle = "#ffd0d8"; ctx.fillRect(x - 1, y - 1, 2, 1); break;
      case "orb": case "magic": case "note": {
        ctx.fillStyle = col(b.col, 0.35); ctx.beginPath(); ctx.arc(x, y, b.r + 2, 0, TAU); ctx.fill();
        ctx.fillStyle = b.col; ctx.beginPath(); ctx.arc(x, y, b.r, 0, TAU); ctx.fill(); ctx.fillStyle = "#ffffff"; ctx.fillRect(x - 1, y - 1, 2, 2);
        if (b.kind === "note") { ctx.fillStyle = "#ffd84a"; ctx.fillRect(x + 2, y - 5, 1, 5); }
        break;
      }
      case "fireball": ctx.fillStyle = "#ff6a2a"; ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fill(); ctx.fillStyle = "#ffd86a"; ctx.beginPath(); ctx.arc(x, y, 2.5, 0, TAU); ctx.fill(); ctx.fillStyle = "rgba(255,120,40,.5)"; ctx.fillRect(x - Math.cos(a) * 7 - 1, y - Math.sin(a) * 7 - 1, 3, 3); break;
      case "wave": { const r = b.r * (b.grow ? 1 + (b.t || 0) * 1.5 : 1); ctx.strokeStyle = b.col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x - Math.cos(a) * r, y - Math.sin(a) * r, r, a - 0.9, a + 0.9); ctx.stroke(); ctx.lineWidth = 1; break; }
      case "crescentShot": ctx.strokeStyle = b.col; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x - Math.cos(a) * 10, y - Math.sin(a) * 10, 14, a - 1.1, a + 1.1); ctx.stroke(); ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x - Math.cos(a) * 10, y - Math.sin(a) * 10, 14, a - 0.8, a + 0.8); ctx.stroke(); break;
      case "orbit": case "resorb": ctx.fillStyle = col(b.col, 0.3); ctx.beginPath(); ctx.arc(x, y, 6, 0, TAU); ctx.fill(); ctx.fillStyle = b.col; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, TAU); ctx.fill(); ctx.fillStyle = "#ffffff"; ctx.fillRect(x - 1, y - 1, 2, 2); break;
      default: ctx.fillStyle = b.col || "#fff"; ctx.fillRect(x - 2, y - 2, 4, 4);
    }
  }
  function drawEB(b, camX, camY) {
    const x = Math.round(b.x - camX), y = Math.round(b.y - camY);
    if (x < -20 || y < -20 || x > G().vw + 20 || y > G().vh + 20) return;
    if (b.kind === "scythe") { ctx.save(); ctx.translate(x, y); ctx.rotate(G().t * 12); ctx.strokeStyle = "#d8d8f0"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, b.r, 0, 3.6); ctx.stroke(); ctx.restore(); ctx.lineWidth = 1; return; }
    ctx.fillStyle = "rgba(255,40,80,.35)"; ctx.beginPath(); ctx.arc(x, y, b.r + 2, 0, TAU); ctx.fill();
    ctx.fillStyle = b.col || "#ff5a6a"; ctx.beginPath(); ctx.arc(x, y, b.r, 0, TAU); ctx.fill();
    ctx.fillStyle = "#ffffff"; ctx.fillRect(x - 1, y - 1, 2, 2);
    if (b.hold > 0) { ctx.strokeStyle = "#fff4b0"; ctx.beginPath(); ctx.arc(x, y, b.r + 3, 0, TAU); ctx.stroke(); }
  }
  function drawTelegraph(o, camX, camY) {
    const x = o.x - camX, y = o.y - camY;
    const k = Math.min(1, o.t / o.dur);
    ctx.save();
    ctx.fillStyle = col(o.col, 0.16); ctx.strokeStyle = col(o.col, 0.85); ctx.lineWidth = 1;
    const fillK = (fn) => { ctx.fillStyle = col(o.col, 0.16); fn(1, true); ctx.fillStyle = col(o.col, 0.32); fn(k, true); ctx.strokeStyle = col(o.col, 0.9); fn(1, false); };
    if (o.shape === "circle") fillK((s, fill) => { ctx.beginPath(); ctx.arc(x, y, o.r * s, 0, TAU); fill ? ctx.fill() : ctx.stroke(); });
    else if (o.shape === "ring") fillK((s, fill) => { ctx.beginPath(); ctx.arc(x, y, o.r, 0, TAU); ctx.arc(x, y, o.r2 + (o.r - o.r2) * (1 - s), 0, TAU, true); fill ? ctx.fill("evenodd") : ctx.stroke(); });
    else if (o.shape === "line") { ctx.translate(x, y); ctx.rotate(o.ang); fillK((s, fill) => { fill ? ctx.fillRect(0, -o.w / 2, o.len * s, o.w) : ctx.strokeRect(0, -o.w / 2, o.len, o.w); }); }
    else if (o.shape === "cone") fillK((s, fill) => { ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, o.r * s, o.ang - o.arc / 2, o.ang + o.arc / 2); ctx.closePath(); fill ? ctx.fill() : ctx.stroke(); });
    else if (o.shape === "rect") fillK((s, fill) => { fill ? ctx.fillRect(x, y, o.w, o.h * s) : ctx.strokeRect(x, y, o.w, o.h); });
    ctx.restore();
  }
  function drawZone(z, camX, camY) {
    const x = z.x - camX, y = z.y - camY, t = G().t;
    if (z.kind === "bigrain") return;
    const fade = Math.min(1, (z.dur - z.t) * 2);
    ctx.globalAlpha = 0.22 * fade;
    ctx.fillStyle = z.col || "#ffffff";
    ctx.beginPath(); ctx.arc(x, y, z.r, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.6 * fade;
    if (z.kind === "rain" || z.kind === "trail") { for (let i = 0; i < 6; i++) { const a = i * 1.7 + t * 2, rr = (i * 7.3 % z.r); ctx.fillRect(Math.round(x + Math.cos(a) * rr), Math.round(y + Math.sin(a) * rr - (t * 40 % 10)), 1, 3); } }
    else if (z.kind === "frost") { ctx.strokeStyle = "#e0f6ff"; ctx.beginPath(); ctx.arc(x, y, z.r * (0.6 + 0.1 * Math.sin(t * 4)), 0, TAU); ctx.stroke(); }
    else if (z.kind === "petals") { ctx.fillStyle = "#bcd8ff"; ctx.fillRect(Math.round(x - 1), Math.round(y - 1), 3, 2); }
    else { ctx.strokeStyle = z.col || "#fff"; ctx.beginPath(); ctx.arc(x, y, z.r, 0, TAU); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  let rainSeed = 0;
  function bigRain(vw, vh) {
    rainSeed += 1;
    ctx.fillStyle = "rgba(255,80,110,.12)"; ctx.fillRect(0, 0, vw, vh);
    ctx.fillStyle = "#ff8fa0";
    for (let i = 0; i < 70; i++) { const x = (i * 53 + rainSeed * 3) % vw, y = (i * 97 + rainSeed * 9) % vh; ctx.fillRect(x, y, 1, 5); }
  }
  /* 暗さ：プレイヤーのまわりだけ見える */
  let darkC = null;
  function drawDark(P, camX, camY, vw, vh, k) {
    if (!darkC || darkC.width !== vw || darkC.height !== vh) darkC = MA.Pix.mkCanvas(vw, vh);
    const g = darkC.getContext("2d");
    g.globalCompositeOperation = "source-over";
    g.clearRect(0, 0, vw, vh);
    g.fillStyle = "rgba(4,2,10,.94)"; g.fillRect(0, 0, vw, vh);
    g.globalCompositeOperation = "destination-out";
    const r = 92 * k * (P ? P.st.vision : 1);
    const x = P.x - camX, y = P.y - camY - 6;
    const gr = g.createRadialGradient(x, y, r * 0.45, x, y, r);
    gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    /* 燭台・出口・宝箱のまわりも少し見える */
    G().map.objects.forEach((o) => { if ((o.kind === "purifier" && !o.done) || o.kind === "exit" || o.kind === "fountain") { const ox = o.x - camX, oy = o.y - camY; if (ox < -60 || oy < -60 || ox > vw + 60 || oy > vh + 60) return; const g2 = g.createRadialGradient(ox, oy, 4, ox, oy, 44); g2.addColorStop(0, "rgba(0,0,0,.9)"); g2.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = g2; g.beginPath(); g.arc(ox, oy, 44, 0, TAU); g.fill(); } });
    ctx.drawImage(darkC, 0, 0);
  }

  /* ══ エフェクト ══ */
  function drawFx(f, camX, camY) {
    if (f.t < 0) return;
    const x = f.x - camX, y = f.y - camY, k = f.t / f.dur, t = G().t;
    const c = f.col || "#ffffff";
    ctx.save();
    switch (f.type) {
      case "slash": case "crescent": {
        ctx.globalAlpha = 1 - k; ctx.strokeStyle = c; ctx.lineWidth = f.type === "crescent" ? 4 : 3;
        ctx.beginPath(); ctx.arc(x, y, f.r * (0.7 + k * 0.3), f.a - f.arc / 2, f.a + f.arc / 2); ctx.stroke();
        ctx.strokeStyle = f.col2 || "#ffffff"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, f.r * (0.7 + k * 0.3) - 2, f.a - f.arc / 2.6, f.a + f.arc / 2.6); ctx.stroke();
        break;
      }
      case "thrust": ctx.globalAlpha = 1 - k; ctx.translate(x, y); ctx.rotate(f.a); ctx.fillStyle = f.col2 || c; ctx.fillRect(4, -2, f.len * (0.6 + k * 0.4), 4); ctx.fillStyle = c; ctx.fillRect(4, -1, f.len, 1); break;
      case "spin": ctx.globalAlpha = 1 - k; ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, f.r, k * TAU * 2, k * TAU * 2 + 4.2); ctx.stroke(); break;
      case "ring": case "flashring": { const r = (f.r || 60) * (0.3 + k * 0.7); ctx.globalAlpha = 1 - k; ctx.strokeStyle = c; ctx.lineWidth = f.type === "flashring" ? 4 : 2; ctx.beginPath(); ctx.arc(f.type === "flashring" ? G().vw / 2 : x, f.type === "flashring" ? G().vh / 2 : y, f.type === "flashring" ? Math.max(G().vw, G().vh) * k : r, 0, TAU); ctx.stroke(); break; }
      case "boom": case "bloom": case "hoop": case "shock": case "firering": {
        ctx.globalAlpha = (1 - k) * 0.8;
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, (f.r || 24) * (0.4 + k * 0.6), 0, TAU); ctx.fill();
        ctx.globalAlpha = 1 - k; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, (f.r || 24) * (0.5 + k * 0.5), 0, TAU); ctx.stroke();
        if (f.type === "bloom") for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + k; ctx.fillStyle = "#ffffff"; ctx.fillRect(Math.round(x + Math.cos(a) * (f.r || 24) * 0.7) - 1, Math.round(y + Math.sin(a) * (f.r || 24) * 0.7) - 1, 3, 3); }
        break;
      }
      case "bolt": case "lightning": {
        ctx.globalAlpha = 1 - k; ctx.strokeStyle = c; ctx.lineWidth = 2;
        const x2 = f.type === "lightning" ? x : f.x2 - camX, y2 = f.type === "lightning" ? y : f.y2 - camY;
        const sx = f.type === "lightning" ? x + 6 : x, sy = f.type === "lightning" ? y - 120 : y;
        ctx.beginPath(); ctx.moveTo(sx, sy);
        for (let i = 1; i < 6; i++) { const q = i / 6; ctx.lineTo(sx + (x2 - sx) * q + (Math.random() - 0.5) * 8, sy + (y2 - sy) * q + (Math.random() - 0.5) * 8); }
        ctx.lineTo(x2, y2); ctx.stroke();
        ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1; ctx.stroke();
        break;
      }
      case "pillar": ctx.globalAlpha = 1 - k; ctx.fillStyle = col(c, 0.6); ctx.fillRect(x - (f.r || 18) * 0.6, y - 140, (f.r || 18) * 1.2, 140); ctx.fillStyle = "#ffffff"; ctx.fillRect(x - 2, y - 140, 4, 140); ctx.beginPath(); ctx.ellipse(x, y, f.r || 18, (f.r || 18) * 0.4, 0, 0, TAU); ctx.fill(); break;
      case "spikes": ctx.globalAlpha = 1 - k; ctx.fillStyle = c; for (let i = -2; i <= 2; i++) { const h = 8 + (2 - Math.abs(i)) * 4; ctx.beginPath(); ctx.moveTo(x + i * 4 - 2, y); ctx.lineTo(x + i * 4, y - h * Math.min(1, k * 4)); ctx.lineTo(x + i * 4 + 2, y); ctx.fill(); } break;
      case "prism": { ctx.globalAlpha = 1 - k; const cs = ["#ff6a3d", "#3fa9ff", "#4fe39a", "#ffd84a", "#fff1a6", "#a874ff"]; cs.forEach((cc, i) => { ctx.strokeStyle = cc; ctx.beginPath(); ctx.arc(x, y, (f.r || 80) * (0.3 + k * 0.7) - i * 3, 0, TAU); ctx.stroke(); }); break; }
      case "poof": ctx.globalAlpha = 1 - k; ctx.fillStyle = c; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; const r = (f.r || 6) * (0.5 + k * 1.2); ctx.fillRect(Math.round(x + Math.cos(a) * r) - 1, Math.round(y - 4 + Math.sin(a) * r) - 1, 2, 2); } break;
      case "burst": case "spark": case "petalburst": ctx.globalAlpha = 1 - k; ctx.fillStyle = c; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + (f.x % 7); const r = 3 + k * 12; ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), 2, 2); } break;
      case "dust": ctx.globalAlpha = (1 - k) * 0.6; ctx.fillStyle = "#c8c0b0"; ctx.beginPath(); ctx.arc(x, y, 3 + k * 6, 0, TAU); ctx.fill(); break;
      case "muzzle": ctx.globalAlpha = 1 - k; ctx.fillStyle = c; ctx.fillRect(Math.round(x) - 2, Math.round(y) - 2, 4, 4); break;
      case "charge": { if (f.owner && f.owner.dead) break; const ox = f.owner ? f.owner.x - camX : x, oy = f.owner ? f.owner.y - camY : y; ctx.globalAlpha = 0.6 * (1 - k); ctx.strokeStyle = c; ctx.beginPath(); ctx.arc(ox, oy - 6, (f.r || 10) * (1.4 - k * 0.6), 0, TAU); ctx.stroke(); break; }
      case "summon": ctx.globalAlpha = 1 - k; ctx.strokeStyle = c; ctx.beginPath(); ctx.ellipse(x, y, (f.r || 16) * (0.5 + k), (f.r || 16) * 0.4 * (0.5 + k), 0, 0, TAU); ctx.stroke(); break;
      case "afterimage": { ctx.globalAlpha = (1 - k) * 0.6; ctx.strokeStyle = c; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.lineTo(f.x2 - camX, f.y2 - camY - 8); ctx.stroke(); break; }
      case "notes": ctx.globalAlpha = 1 - k; ctx.fillStyle = c; for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + k * 3; ctx.fillRect(Math.round(x + Math.cos(a) * 20 * (0.5 + k)), Math.round(y - 8 + Math.sin(a) * 14 * (0.5 + k)), 2, 4); } break;
      case "beam": ctx.globalAlpha = 1 - k; ctx.translate(x, y); ctx.rotate(f.a); ctx.fillStyle = col(c, 0.6); ctx.fillRect(0, -f.w / 2, f.len, f.w); ctx.fillStyle = "#ffffff"; ctx.fillRect(0, -2, f.len, 4); break;
      case "bellflower": {
        /* タキナの必殺技：画面いっぱいの蒼い桔梗 */
        ctx.globalAlpha = 1 - k * k;
        const R = Math.max(G().vw, G().vh) * (0.2 + k * 0.6), cx = G().vw / 2, cy = G().vh / 2;
        for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i / 5 * TAU + k; ctx.fillStyle = i % 2 ? "#a9a4ff" : "#6f6cff"; ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * R * 0.45, cy + Math.sin(a) * R * 0.45, R * 0.32, R * 0.18, a, 0, TAU); ctx.fill(); }
        ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(cx, cy, R * 0.12, 0, TAU); ctx.fill();
        break;
      }
      case "slashmark": ctx.globalAlpha = 1 - k; ctx.translate(x, y); ctx.rotate(f.a); ctx.fillStyle = c; ctx.fillRect(-10, -1, 20, 2); ctx.fillStyle = "#ffffff"; ctx.fillRect(-6, 0, 12, 1); break;
      case "meteor": ctx.globalAlpha = 1 - k; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, 10 * (1 - k) + 4, 0, TAU); ctx.fill(); break;
      case "icicle": ctx.globalAlpha = 1 - k; ctx.fillStyle = "#e0f6ff"; ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x, y - 18); ctx.lineTo(x + 4, y); ctx.fill(); break;
      case "tgfire": {
        ctx.globalAlpha = (1 - k) * 0.6; ctx.fillStyle = c;
        if (f.shape === "circle") { ctx.beginPath(); ctx.arc(x, y, f.r, 0, TAU); ctx.fill(); }
        else if (f.shape === "ring") { ctx.beginPath(); ctx.arc(x, y, f.r, 0, TAU); ctx.arc(x, y, f.r2, 0, TAU, true); ctx.fill("evenodd"); }
        else if (f.shape === "line") { ctx.translate(x, y); ctx.rotate(f.ang); ctx.fillRect(0, -f.w / 2, f.len, f.w); }
        else if (f.shape === "cone") { ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, f.r, f.ang - f.arc / 2, f.ang + f.arc / 2); ctx.closePath(); ctx.fill(); }
        else if (f.shape === "rect") ctx.fillRect(x, y, f.rw, f.rh);
        break;
      }
      case "reso": { ctx.globalAlpha = 1 - k; for (let i = 0; i < 3; i++) { ctx.strokeStyle = i % 2 ? "#ffffff" : c; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y - 8, 10 + k * 60 + i * 8, 0, TAU); ctx.stroke(); } break; }
      case "break": { ctx.globalAlpha = 1 - k; ctx.fillStyle = c; for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; ctx.fillRect(Math.round(x + Math.cos(a) * (10 + k * 50)), Math.round(y + Math.sin(a) * (10 + k * 50)), 3, 3); } break; }
      case "bossdeath": { ctx.globalAlpha = 1 - k; for (let i = 0; i < 4; i++) { ctx.strokeStyle = i % 2 ? "#ffffff" : c; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 10 + k * (140 + i * 30), 0, TAU); ctx.stroke(); } if (Math.random() < 0.5) { ctx.fillStyle = "#ffffff"; ctx.fillRect(x + (Math.random() - 0.5) * 60, y + (Math.random() - 0.5) * 60, 3, 3); } break; }
      default: ctx.globalAlpha = 1 - k; ctx.fillStyle = c; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
    }
    ctx.restore();
  }

  /* ══ ミニマップ・全体地図 ══ */
  function drawMap(g2, w, h, opt) {
    const g = G(), map = g.map; if (!map) return;
    opt = opt || {};
    const full = opt.full;
    const s = full ? Math.min(w / map.W, h / map.H) : 2;
    const ox = full ? (w - map.W * s) / 2 : w / 2 - g.P.x / 16 * s, oy = full ? (h - map.H * s) / 2 : h / 2 - g.P.y / 16 * s;
    g2.fillStyle = "rgba(8,6,18,.92)"; g2.fillRect(0, 0, w, h);
    const t = T();
    const x0 = full ? 0 : Math.max(0, Math.floor(-ox / s)), x1 = full ? map.W - 1 : Math.min(map.W - 1, Math.ceil((w - ox) / s));
    const y0 = full ? 0 : Math.max(0, Math.floor(-oy / s)), y1 = full ? map.H - 1 : Math.min(map.H - 1, Math.ceil((h - oy) / s));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = y * map.W + x;
      if (!map.seen[i]) continue;
      const tt = map.tiles[i];
      if (tt === t.WALL || tt === t.PIT) continue;
      g2.fillStyle = tt === t.BOSSDOOR ? "#ff3050" : tt === t.SEALDOOR ? "#e8d080" : tt === t.LAVA ? "#a04020" : tt === t.BLOCK ? "#3a3450" : map.roomAt[i] >= 0 ? "#5a5280" : "#433d63";
      g2.fillRect(ox + x * s, oy + y * s, Math.ceil(s), Math.ceil(s));
    }
    const dot = (px, py, c, r) => { g2.fillStyle = c; g2.fillRect(Math.round(ox + px / 16 * s - r), Math.round(oy + py / 16 * s - r), r * 2, r * 2); };
    const reveal = g.P.st.reveal;
    map.objects.forEach((o) => {
      const ti = Math.floor(o.y / 16) * map.W + Math.floor(o.x / 16);
      if (o.kind === "chest" && o.done) return;   /* ★ 2026-10-05 開けた宝箱は地図からも消す */
      if (!map.seen[ti] && !(reveal && o.kind === "chest")) return;
      if (o.done && o.kind !== "exit" && o.kind !== "retreat") return;
      const c = { chest: "#ffd84a", fountain: "#7dffb0", altar: "#ff8fd0", spirit: "#4fe39a", circle: "#c27bff", exit: "#8affc4", retreat: "#7a4aff", warp: "#5ab8ff", lore: "#e8d080", starShard: "#ffe86a", purifier: "#fff4b0" }[o.kind];
      if (c) dot(o.x, o.y, c, full ? 2 : 1.5);
    });
    /* ボスの部屋（扉を見たら） */
    if (g.mode === "dungeon") { const br = map.rooms[map.bossRoom]; if (br.seen || map.bossDoors.some(([x, y]) => map.seen[y * map.W + x])) { g2.fillStyle = "#ff3050"; const bx = ox + br.cx * s, by = oy + br.cy * s; g2.fillRect(bx - 3, by - 3, 6, 6); g2.fillStyle = "#ffffff"; g2.fillRect(bx - 1, by - 2, 2, 2); } }
    g.E.forEach((e) => { if (!e.dead && (e.elite || e.boss)) dot(e.x, e.y, e.boss ? "#ff3050" : "#ffcc3a", full ? 2.5 : 1.5); });
    dot(g.P.x, g.P.y, "#ffffff", full ? 3 : 2);
    if (!full) { g2.strokeStyle = "#ffffff"; g2.strokeRect(w / 2 - g.vw / 16 * s / 2, h / 2 - g.vh / 16 * s / 2, g.vw / 16 * s, g.vh / 16 * s); }
  }

  MA.Render = { init, resize, draw, onStart, onMap, dirtyMap, drawMap, drawNum };
})();
