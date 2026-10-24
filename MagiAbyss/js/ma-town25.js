/* ============================================================
   MagiAbyss — ma-town25.js
   ★★ 2026-10-23 拠点（町の広場）も 2.5D に（ご指定「MagiAbyss のホーム画面も 2.5D にしてください」）
   ------------------------------------------------------------
   迷宮の 2.5D（ma-render25.js）と同じ考え方で、ma-town.js の絵をそのまま使う：
   ① 地面（草・道・広場）は真上から描いた絵を、遠近をつけて<b>傾けて</b>貼る。
      町の外には森の地面のふちを足して、奥が切れて見えないようにする（ふちの木は立てて描く）。
   ② 建物・木・街灯・石碑・掲示板・柵・旗飾り・アルパカ・鳥・町の人・自分は<b>立てて</b>描き、手前から奥へ（y の順に）重ねる。
      建物は南のふち（足もと）で立てる＝うしろ（北）を歩く人は建物にかくれる。炉の火・煙突の煙は建物といっしょに立つ。
   ③ 光：<b>時間帯</b>（朝・昼・夕方・夜＝端末の時計）でまわりの明るさと色を変え、街灯・炉・たき火・石碑・窓を光らせる。
      昼は雲の影と光の筋、夜はほたる。奥の霞・四すみの暗がり・ただよう花粉。
   ④ 自分は HD ドット（迷宮と同じ charSpriteHD）。町の人・動物は1倍のドットを2倍で。
   ・設定「グラフィック」が 2D のときは今までの描画（ma-guild.js の drawHub）。軽め（lite）は光と粒子を少なく。
   ・歩く・当たり・近くの施設はいままでと同じ真上の座標のまま。見え方だけを変える。
   ============================================================ */
(function () {
  "use strict";
  const MA = (window.MA = window.MA || {});
  const TAU = Math.PI * 2;
  const TS = 16, RD = 2;
  const MG = 176;                       /* 町の外のふち（ワールドの画素） */
  let cv = null, ctx = null, W = 0, H = 0, VW = 0, VH = 0, cssW = 1, cssH = 1;
  const P3 = { cx: 0, cy: 0, D: 1, sin: 0, cos: 1, vTop: 0, vBot: 0, halfTop: 0 };
  let camX = 0, camY = 0, oX = 0, oY = 0;
  let gnd = null, trees = null, lm = null, lmx = null, LMQ = 3;
  const T = () => MA.Town;

  function S() { return MA.Save && MA.Save.S; }
  function mode() { return MA.Render && MA.Render.mode ? MA.Render.mode() : "hd"; }
  function on() { return !!(MA.Render && MA.Render.is25 && MA.Render.is25() && MA.Town && MA.Town.bgParts); }
  function lite() { return mode() === "lite"; }

  /* ══ 投影（ma-render25.js と同じ：θ30°・D＝1.65H） ══ */
  function setupProj() {
    const th = 30 * Math.PI / 180;
    P3.sin = Math.sin(th); P3.cos = Math.cos(th);
    P3.D = H * 1.65; P3.cx = W / 2; P3.cy = H / 2;
    P3.vTop = invV(-P3.cy); P3.vBot = invV(H - P3.cy);
    P3.halfTop = (W / 2) / (P3.D / (P3.D - P3.vTop * P3.sin));
  }
  function invV(Y) { return Y * P3.D / (P3.cos * P3.D + Y * P3.sin); }
  function proj(wx, wy) {
    const u = (wx - camX) * RD, v = (wy - camY) * RD;
    const s = P3.D / (P3.D - v * P3.sin);
    return { x: P3.cx + u * s, y: P3.cy + v * P3.cos * s, s };
  }
  /* 立てて描く：足もと（wx, wy）が投影の点に来るように変形をおく（中の絵はワールドの座標から oX/oY を引いて描く） */
  function up(wx, wy, sc) {
    const p = proj(wx, wy), k = RD * p.s * (sc || 1);
    ctx.setTransform(k, 0, 0, k, p.x - (wx - oX) * k, p.y - (wy - oY) * k);
    return p;
  }

  /* ══ 大きさ ══ */
  function resize(canvas, w, h, phone) {
    cv = canvas; ctx = cv.getContext("2d");
    cssW = w; cssH = h;
    /* 2D とほぼ同じ「見える広さ」（まん中の行）。少しだけ近くして建物を大きく見せる */
    const sc = Math.max(1, h / (phone ? 235 : 380), w / (T().PW + 140));   /* 横長の画面でも、町の外ばかりが見えないように */
    VW = Math.ceil(w / sc); VH = Math.ceil(h / sc);
    W = VW * RD; H = VH * RD;
    cv.width = W; cv.height = H;
    cv.style.width = w + "px"; cv.style.height = h + "px";
    ctx.imageSmoothingEnabled = false;
    setupProj();
    LMQ = lite() ? 5 : 3;
    lm = MA.Pix.mkCanvas(Math.ceil(W / LMQ), Math.ceil(H / LMQ)); lmx = lm.getContext("2d");
    fogCache.k = "";
    return sc;
  }
  function key() { return mode() + "|" + W + "x" + H; }

  /* カメラ（ma-guild.js の updateHub から）。まん中の行の広さで町の中に止める。町の外のふちが少しだけ見えてよい */
  function camera(GS) {
    const PW = T().PW, PH = T().PH;
    const top = -P3.vTop / RD, bot = P3.vBot / RD;      /* カメラから画面の上（奥）・下（手前）までの奥行き */
    const minX = VW / 2 - 28, maxX = PW - VW / 2 + 28;
    const minY = top - 70, maxY = PH - bot + 10;
    GS.cam.x = minX < maxX ? Math.max(minX, Math.min(maxX, GS.x)) : PW / 2;
    GS.cam.y = minY < maxY ? Math.max(minY, Math.min(maxY, GS.y - 10)) : (minY + maxY) / 2;
  }

  /* ══ 地面の絵（町＋まわりの森のふち）・RD 倍で一度だけ ══ */
  function buildGround() {
    const Tn = T(), parts = Tn.bgParts(), PW = Tn.PW, PH = Tn.PH;
    const gw = PW + MG * 2, gh = PH + MG * 2;
    const c = MA.Pix.mkCanvas(gw * RD, gh * RD), g = c.getContext("2d");
    g.imageSmoothingEnabled = false;
    g.setTransform(RD, 0, 0, RD, 0, 0);
    const r = Tn.rng(20261023);
    const GR = ["#4f8a32", "#58943a", "#4a8230", "#5f9a3c", "#467c2c"];
    for (let y = 0; y < gh; y += 4) for (let x = 0; x < gw; x += 4) { g.fillStyle = GR[Math.floor(r() * GR.length)]; g.fillRect(x, y, 4, 4); }
    /* ふちほど暗い森の地面（木の下の影） */
    const edge = (x0, y0, x1, y1, a) => { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, "rgba(18,40,14," + a + ")"); gr.addColorStop(1, "rgba(18,40,14,0)"); g.fillStyle = gr; };
    edge(0, 0, 0, MG, 0.55); g.fillRect(0, 0, gw, MG);
    edge(0, 0, MG, 0, 0.5); g.fillRect(0, 0, MG, gh);
    edge(gw, 0, gw - MG, 0, 0.5); g.fillRect(gw - MG, 0, MG, gh);
    edge(0, gh, 0, gh - MG, 0.35); g.fillRect(0, gh - MG, gw, MG);
    /* 茂み・花（ふち） */
    for (let i = 0; i < 520; i++) {
      const x = r() * gw, y = r() * gh;
      if (x > MG - 6 && x < MG + PW + 6 && y > MG - 6 && y < MG + PH + 6) continue;
      const k = r();
      if (k < 0.5) { g.fillStyle = "#3a6e26"; g.beginPath(); g.ellipse(x, y, 4 + r() * 5, 2.5 + r() * 2, 0, 0, TAU); g.fill(); g.fillStyle = "#5a9a3a"; g.beginPath(); g.ellipse(x - 1, y - 1, 2.5, 1.5, 0, 0, TAU); g.fill(); }
      else if (k < 0.75) { g.fillStyle = ["#ff8fd0", "#ffe86a", "#ffffff", "#9ad8ff"][Math.floor(r() * 4)]; g.fillRect(Math.round(x), Math.round(y), 1, 1); g.fillStyle = "#2e5e1e"; g.fillRect(Math.round(x), Math.round(y) + 1, 1, 1); }
      else { g.fillStyle = "#335f22"; g.fillRect(Math.round(x), Math.round(y), 1, 3); g.fillRect(Math.round(x) + 2, Math.round(y) + 1, 1, 2); }
    }
    /* 町（2D と同じ地面） */
    g.drawImage(parts.ground, MG, MG);
    /* 町と森のさかい目をなじませる（町のふち 10px にうすい陰） */
    const seam = (x0, y0, x1, y1, xx, yy, ww, hh) => { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, "rgba(20,44,16,.32)"); gr.addColorStop(1, "rgba(20,44,16,0)"); g.fillStyle = gr; g.fillRect(xx, yy, ww, hh); };
    seam(0, MG, 0, MG + 10, MG, MG, PW, 10);
    seam(MG, 0, MG + 10, 0, MG, MG, 10, PH);
    seam(MG + PW, 0, MG + PW - 10, 0, MG + PW - 10, MG, 10, PH);
    /* 建物のねもとの陰（地面に落ちる・やわらかく）と、東どなりに落ちる影 */
    Object.keys(Tn.BLD).forEach((id) => {
      const [bx, by, bw, bh] = Tn.BLD[id], x = MG + bx * TS, yb = MG + (by + bh) * TS, w = bw * TS;
      const gr = g.createLinearGradient(0, yb, 0, yb + 14); gr.addColorStop(0, "rgba(0,0,0,.34)"); gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr; g.fillRect(x + 2, yb, w - 4, 14);
      const g2 = g.createLinearGradient(x + w, 0, x + w + 12, 0); g2.addColorStop(0, "rgba(0,0,0,.22)"); g2.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = g2; g.fillRect(x + w, MG + by * TS + 6, 12, bh * TS - 4);
    });
    /* 置物の影 */
    const shadowR = { monolith: 22, board: 20, tree: 12, lamp: 4, barrels: 11, crates: 11, anvil: 7, fencePost: 3, campfire: 8, signpost: 6 };
    g.fillStyle = "rgba(0,0,0,.22)";
    Tn.PROPS.forEach((p) => { const rr = shadowR[p.k] || 6; g.beginPath(); g.ellipse(MG + p.x * TS + rr * 0.25, MG + p.y * TS, rr, rr * 0.5, 0, 0, TAU); g.fill(); });
    return c;
  }
  /* 町の外のふちに立つ木（北・西・東。手前（南）は町が見えなくなるので置かない） */
  function buildTrees() {
    const Tn = T(), PW = Tn.PW, PH = Tn.PH, r = Tn.rng(1023), out = [];
    const add = (x, y) => out.push({ x, y, v: r() < 0.12 ? 1 : r() < 0.1 ? 2 : 0, s: 0.95 + r() * 0.45, fl: r() < 0.5 });
    for (let y = -MG + 18; y < -6; y += 20) for (let x = -MG + 8; x < PW + MG; x += 18 + r() * 10) add(x + r() * 8, y + r() * 8);
    for (let y = -6; y < PH - 30; y += 20) {
      for (let x = -MG + 10; x < -14; x += 18 + r() * 10) add(x + r() * 6, y + r() * 8);
      for (let x = PW + 14; x < PW + MG - 6; x += 18 + r() * 10) add(x + r() * 6, y + r() * 8);
    }
    return out;
  }

  /* ══ 時間帯（端末の時計）══ */
  const TOD = {
    dawn:  { amb: "#ffe9dc", fog: "#ffd6e2", fogA: 0.3, lamp: 0.25, win: 0.15, cloud: 0.35, ray: 0.7, part: "pollen", tint: "rgba(255,200,170,.06)" },
    day:   { amb: "#fff9f0", fog: "#d6ebff", fogA: 0.3, lamp: 0, win: 0, cloud: 0.5, ray: 1, part: "pollen", tint: "" },
    eve:   { amb: "#ffd6b0", fog: "#ffa86a", fogA: 0.34, lamp: 0.7, win: 0.6, cloud: 0.3, ray: 0.55, part: "pollen", tint: "rgba(255,150,80,.08)" },
    night: { amb: "#8890c4", fog: "#1c2654", fogA: 0.42, lamp: 1, win: 1, cloud: 0, ray: 0, part: "firefly", tint: "rgba(40,60,140,.08)" },
  };
  let todK = "", todT = 0;
  function tod() {
    if (MA.Town25 && TOD[MA.Town25.force]) return TOD[MA.Town25.force];   /* 確かめる用：MA.Town25.force = "day" など */
    const now = Date.now();
    if (!todK || now - todT > 30000) {
      todT = now;
      const h = new Date().getHours() + new Date().getMinutes() / 60;
      todK = h >= 5 && h < 7 ? "dawn" : h >= 7 && h < 16 ? "day" : h >= 16 && h < 18.5 ? "eve" : "night";
    }
    return TOD[todK];
  }

  /* ══ 光の玉（色ごとに1枚） ══ */
  const glowCache = {};
  function glow(col) {
    if (glowCache[col]) return glowCache[col];
    const c = MA.Pix.mkCanvas(64, 64), g = c.getContext("2d");
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, MA.Pix.rgba(col, 1)); gr.addColorStop(0.35, MA.Pix.rgba(col, 0.55)); gr.addColorStop(1, MA.Pix.rgba(col, 0));
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    glowCache[col] = c;
    return c;
  }

  /* ══ 1フレーム ══
     X … ma-guild.js から { npcSprite(k), walker(g, sp, o, cx, cy, noShadow), near } */
  function draw(GS, X) {
    if (!cv) return;
    const Tn = T(), parts = Tn.bgParts(), t = GS.t, M = tod(), lt = lite();
    if (!gnd) gnd = buildGround();
    if (!trees) trees = buildTrees();
    camX = Math.round(GS.cam.x * RD) / RD; camY = Math.round(GS.cam.y * RD) / RD;
    oX = camX; oY = camY;

    /* ── ① 地面を傾けて貼る ── */
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#2c4a1e"; ctx.fillRect(0, 0, W, H);
    warpGround();

    /* ── ② 地面に重ねるもの（近くの施設の輪・雲の影） ── */
    if (X.near) {
      const f = X.near, p = proj(f.spot[0] * TS, f.spot[1] * TS), k = RD * p.s;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 6); ctx.strokeStyle = f.c; ctx.lineWidth = 1.5 * k;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, 13 * k, 13 * k * P3.cos * 0.55, 0, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 0.16; ctx.fillStyle = f.c; ctx.fill(); ctx.globalAlpha = 1;
    }
    if (M.cloud > 0 && !lt) cloudShadows(t, M.cloud);

    /* ── ③ 立てて描くもの（y の順） ── */
    const list = [];
    Object.keys(parts.blds).forEach((id) => list.push({ y: parts.blds[id].base, b: id }));
    Tn.collectProps(list);
    Tn.FENCES.forEach((fl, fi) => {
      const [x1, y1, x2, y2] = fl, n = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1) * TS / 10));
      for (let i = 0; i < n; i++) { const a = i / n, b = (i + 1) / n; list.push({ y: (y1 + (y2 - y1) * Math.max(a, b)) * TS + 0.5, fence: [x1 + (x2 - x1) * a, y1 + (y2 - y1) * a, x1 + (x2 - x1) * b, y1 + (y2 - y1) * b, fi * 31 + i] }); }
    });
    Tn.BUNTING.forEach((bn, bi) => list.push({ y: Math.max(bn[1], bn[3]) * TS + 1, bunt: bi }));
    const view = viewBox();
    trees.forEach((tr) => { if (tr.x > view.x0 - 40 && tr.x < view.x1 + 40 && tr.y > view.y0 - 10 && tr.y < view.y1 + 70) list.push({ y: tr.y, tree: tr }); });
    (GS.npcs || []).forEach((n) => list.push({ y: n.y, n }));
    list.push({ y: GS.y, me: 1 });
    list.sort((a, b) => a.y - b.y);
    for (const it of list) {
      if (it.b) {
        const B = parts.blds[it.b];
        up(B.cx, B.base); ctx.drawImage(B.c, B.x0 - oX, B.y0 - oY);
        Tn.drawBldAnim(ctx, it.b, oX, oY, t);
      } else if (it.prop) { up(it.prop.x * TS, it.prop.y * TS); Tn.drawProp(ctx, it, oX, oY, t); }
      else if (it.animal) { shadowAt(it.animal.x, it.animal.y, it.animal.k === "bird" ? 3 : 8, 0.22); up(it.animal.x, it.animal.y); Tn.drawProp(ctx, it, oX, oY, t); }
      else if (it.tree) { const tr = it.tree, s = Tn.propSprite("tree", tr.v); up(tr.x, tr.y, tr.s); if (tr.fl) { ctx.translate(tr.x - oX, 0); ctx.scale(-1, 1); ctx.translate(-(tr.x - oX), 0); } ctx.drawImage(s.c, Math.round(tr.x - s.ax - oX), Math.round(tr.y - s.ay - oY)); }
      else if (it.fence) fenceSeg(it.fence);
      else if (it.bunt != null) bunting(it.bunt, t);
      else if (it.n) { shadowAt(it.n.x, it.n.y, 7, 0.28); up(it.n.x, it.n.y); X.walker(ctx, X.npcSprite(it.n.k), it.n, oX, oY, true); }
      else if (it.me) { shadowAt(GS.x, GS.y, 7, 0.3); up(GS.x, GS.y); X.walker(ctx, X.mySprite(), GS, oX, oY, true); }
      ctx.globalAlpha = 1;
    }
    /* 自分が建物の向こうにいるときも見えるように（うすく重ねる） */
    up(GS.x, GS.y); ctx.globalAlpha = 0.26; X.walker(ctx, X.mySprite(), GS, oX, oY, true, true); ctx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    /* ── ④ 光・空気 ── */
    lights(GS, M, lt, parts);
    if (M.ray > 0 && !lt) rays(t, M.ray);
    fog(M);
    particles(GS, M, lt);
    if (M.tint) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = M.tint; ctx.fillRect(0, 0, W, H); }
  }

  /* 見えている地面のだいたいの四角（ワールド） */
  function viewBox() {
    return { x0: camX - P3.halfTop / RD, x1: camX + P3.halfTop / RD, y0: camY + P3.vTop / RD, y1: camY + P3.vBot / RD };
  }
  /* 地面を傾けて貼る（横の帯ごとに、その奥行きの大きさで）。地面の絵は町の左上から MG ずれている */
  function warpGround() {
    const step = 2, GW = gnd.width, GH = gnd.height;
    ctx.imageSmoothingEnabled = true;
    for (let sy = 0; sy < H; sy += step) {
      const va = invV(sy - P3.cy), vb = invV(Math.min(H, sy + step) - P3.cy);
      const vm = (va + vb) / 2, s = P3.D / (P3.D - vm * P3.sin);
      let srcW = W / s, srcX = (camX + MG) * RD - (W / 2) / s;
      const srcY = (camY + MG) * RD + va, srcH = Math.max(0.5, vb - va);
      if (srcY < 0 || srcY + srcH > GH) continue;
      /* 横にはみ出すぶんは切って、そのぶん貼る先も縮める */
      let dx = 0, dw = W;
      if (srcX < 0) { const cut = -srcX; dx = cut * s; dw -= dx; srcW -= cut; srcX = 0; }
      if (srcX + srcW > GW) { const cut = srcX + srcW - GW; dw -= cut * s; srcW -= cut; }
      if (srcW <= 0 || dw <= 0) continue;
      ctx.drawImage(gnd, srcX, srcY, srcW, srcH, dx, sy, dw, Math.min(step, H - sy) + 0.5);
    }
    ctx.imageSmoothingEnabled = false;
  }
  /* 地面に落ちる影（だ円） */
  function shadowAt(wx, wy, r, a) {
    const p = proj(wx, wy), k = RD * p.s;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "rgba(0,0,0," + a + ")";
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 1.5 * k, r * k, r * k * 0.42, 0, 0, TAU); ctx.fill();
  }
  /* 柵の1区間（柱＋横木2本）を立てて描く */
  function fenceSeg(f) {
    const [x1, y1, x2, y2] = f, a = proj(x1 * TS, y1 * TS), b = proj(x2 * TS, y2 * TS), ka = RD * a.s, kb = RD * b.s;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.strokeStyle = "#a8743f"; ctx.lineWidth = 2 * Math.min(ka, kb);
    [7, 3].forEach((h) => { ctx.beginPath(); ctx.moveTo(a.x, a.y - h * ka); ctx.lineTo(b.x, b.y - h * kb); ctx.stroke(); });
    ctx.fillStyle = "#7a5030";
    ctx.fillRect(b.x - 1.5 * kb, b.y - 10 * kb, 3 * kb, 10 * kb);
    ctx.fillStyle = "#a8743f"; ctx.fillRect(b.x - 1.5 * kb, b.y - 10 * kb, 3 * kb, 1.2 * kb);
    if (f[4] % 31 === 0) { ctx.fillStyle = "#7a5030"; ctx.fillRect(a.x - 1.5 * ka, a.y - 10 * ka, 3 * ka, 10 * ka); }
  }
  /* 旗飾り：柱の上（高さ14）からたるんだひもと、ゆれる三角の旗 */
  function bunting(bi, t) {
    const [x1, y1, x2, y2] = T().BUNTING[bi], cols = T().BUNT_COLS;
    const n = Math.max(4, Math.round(Math.hypot(x2 - x1, y2 - y1) * TS / 9));
    const pt = (k) => { const p = proj((x1 + (x2 - x1) * k) * TS, (y1 + (y2 - y1) * k) * TS), kk = RD * p.s; return { x: p.x, y: p.y - (14 - Math.sin(k * Math.PI) * 6) * kk, k: kk }; };
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.strokeStyle = "#5a3a1a"; ctx.lineWidth = Math.max(1, pt(0.5).k * 0.8); ctx.beginPath();
    for (let i = 0; i <= n; i++) { const q = pt(i / n); i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); }
    ctx.stroke();
    for (let i = 0; i < n; i++) {
      const q = pt((i + 0.5) / n), sw = Math.sin(t * 2.4 + i * 0.9 + bi) * 1.5 * q.k;
      ctx.fillStyle = cols[(i + bi) % cols.length];
      ctx.beginPath(); ctx.moveTo(q.x - 3 * q.k, q.y); ctx.lineTo(q.x + 3 * q.k, q.y); ctx.lineTo(q.x + sw, q.y + 7 * q.k); ctx.closePath(); ctx.fill();
    }
  }
  /* 雲の影（ゆっくり流れる・地面をうすく暗く） */
  function cloudShadows(t, a) {
    const PW = T().PW, PH = T().PH, span = PW + MG * 2;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "multiply"; ctx.imageSmoothingEnabled = true;
    for (let i = 0; i < 3; i++) {
      const x = ((i * 397 + t * 7) % span) - MG, y = (i * 211 + 60) % (PH + 80) - 40, r = 110 + i * 26;
      const p = proj(x, y), rr = r * RD * p.s;
      ctx.globalAlpha = a * 0.55;
      ctx.drawImage(glow("#9aa4b8"), p.x - rr, p.y - rr * P3.cos * 0.7, rr * 2, rr * 2 * P3.cos * 0.7);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; ctx.imageSmoothingEnabled = false;
  }
  /* 光の筋（左上から・昼） */
  function rays(t, a) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 3; i++) {
      const x0 = W * (0.12 + i * 0.22) + Math.sin(t * 0.25 + i * 2) * W * 0.03, w0 = W * (0.05 + i * 0.015);
      const gr = ctx.createLinearGradient(0, 0, 0, H * 0.9);
      gr.addColorStop(0, "rgba(255,246,214," + (0.11 * a) + ")"); gr.addColorStop(1, "rgba(255,246,214,0)");
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0 + w0, 0); ctx.lineTo(x0 + w0 + H * 0.5, H * 0.9); ctx.lineTo(x0 + H * 0.5 - w0 * 0.6, H * 0.9); ctx.closePath(); ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  }

  /* ══ 光（まわりの明るさ＝時間帯・街灯・炉・たき火・石碑・窓・自分のまわり） ══ */
  function lights(GS, M, lt, parts) {
    const Tn = T(), lw = lm.width, lh = lm.height, q = 1 / LMQ;
    const L2 = [];
    const add = (x, y, lift, r, col, a) => { if (a > 0.01) L2.push([x, y, lift, r, col, a]); };
    const night = M === TOD.night;
    add(GS.x, GS.y, 8, night ? 84 : 70, "#fff0d8", night ? 0.55 : 0.2);
    Tn.PROPS.forEach((p) => {
      if (p.k === "lamp") add(p.x * TS, p.y * TS, 30, 74, "#ffd890", 0.15 + M.lamp * 0.75);
      else if (p.k === "campfire") add(p.x * TS, p.y * TS, 6, 64, "#ffa850", 0.35 + M.lamp * 0.55);
      else if (p.k === "monolith") add(p.x * TS, p.y * TS, 50, 84, "#7fd0ff", 0.3 + M.lamp * 0.45);
    });
    const sm = Tn.BLD.smith;
    add((sm[0] + 1.9) * TS, (sm[1] + sm[3]) * TS, 30, 58, "#ff9a3a", 0.4 + M.lamp * 0.45);
    if (M.win > 0) parts.wins.forEach((w) => { const B = parts.blds[w.b]; if (B) add(w.x + w.w / 2, B.base, B.base - (w.y + w.h / 2), 24, "#ffcf7a", M.win * 0.7); });
    /* まわりを暗くする（かけ算）：昼はほとんど暗くしない */
    lmx.setTransform(1, 0, 0, 1, 0, 0); lmx.globalCompositeOperation = "source-over"; lmx.globalAlpha = 1;
    lmx.fillStyle = M.amb; lmx.fillRect(0, 0, lw, lh);
    lmx.globalCompositeOperation = "lighter";
    L2.forEach(([x, y, lift, r, col, a]) => {
      const p = proj(x, y), rr = r * RD * p.s * q, py = (p.y - lift * RD * p.s) * q;
      if (p.x * q + rr < 0 || p.x * q - rr > lw || py + rr < 0 || py - rr > lh) return;
      lmx.globalAlpha = a; lmx.drawImage(glow(col), p.x * q - rr, py - rr * 0.8, rr * 2, rr * 1.6);
    });
    lmx.globalAlpha = 1; lmx.globalCompositeOperation = "source-over";
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.globalCompositeOperation = "multiply"; ctx.drawImage(lm, 0, 0, W, H);
    /* 光のにじみ（足し算） */
    ctx.globalCompositeOperation = "lighter";
    L2.forEach(([x, y, lift, r, col, a], i) => {
      if (i === 0) return;   /* 自分のまわりはにじませない（キャラが白っぽくなる） */
      const p = proj(x, y), rr = r * RD * p.s * (r < 30 ? 0.7 : 0.5), py = p.y - lift * RD * p.s;
      if (p.x + rr < 0 || p.x - rr > W || py + rr < 0 || py - rr > H) return;
      ctx.globalAlpha = a * (lt ? 0.16 : 0.24) * (night ? 1.25 : 1); ctx.drawImage(glow(col), p.x - rr, py - rr * 0.8, rr * 2, rr * 1.6);
    });
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    ctx.imageSmoothingEnabled = false;
  }
  /* 奥の霞・すみの暗がり（時間帯の色） */
  let fogCache = { k: "" };
  function fog(M) {
    const k = M.fog + "|" + M.fogA + "|" + W + "x" + H;
    if (fogCache.k !== k) {
      const c = MA.Pix.mkCanvas(W, H), g = c.getContext("2d");
      const gr = g.createLinearGradient(0, 0, 0, H * 0.4);
      gr.addColorStop(0, MA.Pix.rgba(M.fog, M.fogA)); gr.addColorStop(0.55, MA.Pix.rgba(M.fog, M.fogA * 0.3)); gr.addColorStop(1, MA.Pix.rgba(M.fog, 0));
      g.fillStyle = gr; g.fillRect(0, 0, W, H * 0.4);
      const vg = g.createRadialGradient(W / 2, H * 0.54, Math.min(W, H) * 0.45, W / 2, H * 0.54, Math.hypot(W, H) * 0.64);
      vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(10,8,4,.38)");
      g.fillStyle = vg; g.fillRect(0, 0, W, H);
      fogCache = { k, c };
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(fogCache.c, 0, 0);
  }
  /* ただよう粒子（昼＝花粉と綿毛・夜＝ほたる）＋手前のぼけ */
  let parts = [], bokeh = [];
  const PART = {
    pollen:  { n: 36, col: ["#fff6c8", "#ffffff", "#ffe8a0"], up: -3, drift: 9, size: 1.2, life: [4, 8], z: [6, 46] },
    firefly: { n: 38, col: ["#d8ff7a", "#fff6a0"], up: -4, drift: 10, size: 1.6, life: [3, 6], z: [4, 34], blink: 1 },
  };
  function particles(GS, M, lt) {
    const D = PART[M.part] || PART.pollen, n = lt ? Math.round(D.n * 0.4) : D.n;
    const span = Math.max(W, H) / RD * 0.62, r = Math.random, step = 1 / 60;
    while (parts.length < n) parts.push({ x: camX + (r() - 0.5) * span * 2, y: camY + (r() - 0.5) * span * 2.2, z: D.z[0] + r() * (D.z[1] - D.z[0]), vx: (r() - 0.5) * D.drift, vz: -D.up * (0.6 + r() * 0.8), t: 0, life: D.life[0] + r() * (D.life[1] - D.life[0]), col: D.col[Math.floor(r() * D.col.length)], ph: r() * 9, kind: M.part });
    if (parts.length > n) parts.length = n;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "lighter"; ctx.imageSmoothingEnabled = true;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (p.kind !== M.part) { parts.splice(i, 1); i--; continue; }
      p.t += step; p.x += p.vx * step + Math.sin(GS.t * 0.7 + p.ph) * 4 * step; p.z += p.vz * step;
      if (p.t > p.life || p.z < -2 || Math.abs(p.x - camX) > span * 1.2 || Math.abs(p.y - camY) > span * 1.3) { parts.splice(i, 1); i--; continue; }
      const k = p.t / p.life, a = Math.sin(Math.PI * k) * (D.blink ? 0.55 + 0.45 * Math.sin(GS.t * 5 + p.ph) : 1);
      const q = proj(p.x, p.y), sz = D.size * RD * q.s * (1 + p.z / 80), yy = q.y - p.z * RD * q.s;
      if (q.x < -10 || q.x > W + 10 || yy < -10 || yy > H + 10) continue;
      ctx.globalAlpha = Math.max(0, a) * 0.85;
      ctx.drawImage(glow(p.col), q.x - sz * 3, yy - sz * 3, sz * 6, sz * 6);
    }
    if (!lt) {
      while (bokeh.length < 6) bokeh.push({ x: r() * W, y: r() * H, rr: (18 + r() * 34) * RD, vx: (r() - 0.5) * 6 * RD, vy: (r() - 0.5) * 4 * RD, a: 0.04 + r() * 0.06 });
      const col = D.col[0];
      bokeh.forEach((b) => {
        b.x += b.vx * step; b.y += b.vy * step;
        if (b.x < -b.rr) b.x = W + b.rr; else if (b.x > W + b.rr) b.x = -b.rr;
        if (b.y < -b.rr) b.y = H + b.rr; else if (b.y > H + b.rr) b.y = -b.rr;
        ctx.globalAlpha = b.a; ctx.drawImage(glow(col), b.x - b.rr, b.y - b.rr, b.rr * 2, b.rr * 2);
      });
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; ctx.imageSmoothingEnabled = false;
  }

  /* 施設の名札の位置（CSS の px）。名札は建物（置物）といっしょに立っている高さに出す */
  const LBASE = { board: 10.9, gate: 15.6, tavern: 8, smith: 7, shop: 7, recept: 19, info: 12, notice: 25, lib: 30, storage: 30 };
  function labelXY(f) {
    const by = (LBASE[f.id] != null ? LBASE[f.id] : f.lab[1]) * TS, wx = f.lab[0] * TS;
    const p = proj(wx, by), k = RD * p.s;
    return { x: p.x * cssW / W, y: (p.y + (f.lab[1] * TS - by) * k) * cssH / H };
  }

  MA.Town25 = { on, resize, key, camera, draw, labelXY };
})();
