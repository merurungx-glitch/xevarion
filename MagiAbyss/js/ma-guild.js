/* ============================================================
   MagiAbyss — ma-guild.js
   冒険者ギルド《アストラ》（歩ける拠点）と、施設ごとの画面
   ・ギルドはドット絵の部屋。キャラ（選んでいる子）を歩かせて施設に近づくか、
     施設の名札を押すと、その画面が開く。NPC は待機アニメ、炉・ろうそく・深淵の門は動く。
   ・タイトル画面・設定・データ管理もここ。
   ============================================================ */
(function () {
  "use strict";
  const MA = (window.MA = window.MA || {});
  const D = () => MA.D;
  const S = () => MA.Save.S;
  const UI = () => MA.UI;
  const ACT = () => MA.UI.ACT;
  const TAU = Math.PI * 2;
  const esc = (s) => MA.UI.esc(s);
  const ic = (n, c, cls) => MA.Art.iconHTML(n, c, cls);
  const fmt = (n) => MA.UI.fmt(n);
  const fmtT = (s) => MA.UI.fmtT(s);
  const $ = (s, r) => (r || document).querySelector(s);

  /* ══════════════════════════════════════════════════════════════
     ギルドの部屋
     ══════════════════════════════════════════════════════════════ */
  const GW = 26, GH = 18, TS = 16;
  /* 施設：x,y,w,h（当たり・タイル）／spot（話しかける場所）／open（開く画面） */
  const FAC = [
    { id: "board", nm: "依頼掲示板", sub: "迷宮をえらぶ", x: 3, y: 1, w: 4, h: 2, spot: [5, 4], open: "dungeons", c: "#ffd84a", ic: "scroll" },
    { id: "recept", nm: "受付", sub: "ストーリー・施設強化", x: 10, y: 3, w: 6, h: 1, spot: [13, 5], open: "reception", c: "#ff8fd0", ic: "person", npc: "laura" },
    { id: "shop", nm: "魔導具店", sub: "装備・道具を買う", x: 19, y: 3, w: 4, h: 1, spot: [21, 5], open: "shop", c: "#7fd0ff", ic: "shop", npc: "shopkeep" },
    { id: "lib", nm: "資料室", sub: "図鑑", x: 23, y: 6, w: 2, h: 4, spot: [21, 8], open: "codex", c: "#e8d080", ic: "book" },
    { id: "notice", nm: "協会掲示", sub: "実績・ミッション", x: 16, y: 1, w: 2, h: 2, spot: [17, 4], open: "missions", c: "#4fe39a", ic: "mission" },
    { id: "smith", nm: "鍛冶屋", sub: "強化・作成・分解", x: 20, y: 12, w: 4, h: 2, spot: [19, 15], open: "smith", c: "#ff8a3d", ic: "hammer", npc: "smith" },
    { id: "tavern", nm: "酒場", sub: "キャラクター編成", x: 1, y: 11, w: 5, h: 1, spot: [4, 13], open: "chars", c: "#ff6a5a", ic: "person", npc: "barkeep" },
    { id: "info", nm: "冒険者情報", sub: "キャラ育成・スキルツリー", x: 1, y: 5, w: 3, h: 2, spot: [5, 7], open: "train", c: "#c27bff", ic: "tree" },
    { id: "storage", nm: "倉庫", sub: "装備管理・アイテム", x: 14, y: 14, w: 3, h: 2, spot: [15, 13], open: "storage", c: "#9ab0ff", ic: "chest" },
    { id: "gate", nm: "深淵の門", sub: "深淵踏破（エンドコンテンツ）", x: 9, y: 15, w: 3, h: 2, spot: [10, 14], open: "abyss", c: "#a874ff", ic: "abyss" },
  ];
  const TABLES = [[8, 9], [12, 10], [8, 12]];
  let hub = null, hctx = null, bg = null, gmap = null;
  const GS = { x: 13 * TS, y: 8 * TS, vx: 0, vy: 0, r: 5, face: 1, walkT: 0, moving: false, near: null, t: 0, npcs: [], running: false, cam: { x: 0, y: 0 } };

  function buildGuildMap() {
    const tiles = new Uint8Array(GW * GH).fill(1);
    for (let x = 0; x < GW; x++) { tiles[x] = 0; tiles[GW + x] = 0; tiles[(GH - 1) * GW + x] = 0; }
    for (let y = 0; y < GH; y++) { tiles[y * GW] = 0; tiles[y * GW + GW - 1] = 0; }
    FAC.forEach((f) => { for (let y = f.y; y < f.y + f.h; y++) for (let x = f.x; x < f.x + f.w; x++) if (y >= 0 && y < GH && x >= 0 && x < GW) tiles[y * GW + x] = 2; });
    TABLES.forEach(([x, y]) => { tiles[y * GW + x] = 2; tiles[y * GW + x + 1] = 2; });
    return { W: GW, H: GH, tiles, roomAt: new Int16Array(GW * GH).fill(-1) };
  }
  function drawBg() {
    const c = MA.Pix.mkCanvas(GW * TS, GH * TS), g = c.getContext("2d");
    g.imageSmoothingEnabled = false;
    const T = MA.Art.tiles("guild");
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
      const t = gmap.tiles[y * GW + x];
      if (t === 0) { const below = y + 1 < GH ? gmap.tiles[(y + 1) * GW + x] : 0; g.drawImage(below === 0 ? T.top : T.face, x * TS, y * TS); }
      else g.drawImage(T.floor[(x * 7 + y * 13) % 4], x * TS, y * TS);
    }
    /* じゅうたん */
    g.fillStyle = "#7a2a3a"; g.fillRect(9 * TS, 6 * TS, 8 * TS, 6 * TS); g.fillStyle = "#a8423e"; g.fillRect(9 * TS + 4, 6 * TS + 4, 8 * TS - 8, 6 * TS - 8);
    g.strokeStyle = "#e0b040"; g.strokeRect(9 * TS + 7.5, 6 * TS + 7.5, 8 * TS - 15, 6 * TS - 15);
    for (let i = 0; i < 6; i++) { g.fillStyle = "#e0b040"; g.fillRect(9 * TS + 16 + i * 18, 9 * TS - 1, 4, 2); }
    /* 施設の家具 */
    const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    /* 依頼掲示板（壁） */
    R(3 * TS, 1 * TS + 2, 4 * TS, 2 * TS - 2, "#6a4a2a"); R(3 * TS + 3, 1 * TS + 5, 4 * TS - 6, 2 * TS - 9, "#c8a060");
    for (let i = 0; i < 7; i++) R(3 * TS + 6 + (i % 4) * 14, 1 * TS + 8 + Math.floor(i / 4) * 10, 10, 8, ["#f0e2b8", "#e8d8a8", "#fff4d0"][i % 3]);
    R(3 * TS + 8, 1 * TS + 9, 2, 2, "#ff4a4a"); R(3 * TS + 36, 1 * TS + 19, 2, 2, "#ff4a4a");
    /* 受付カウンター */
    R(10 * TS, 3 * TS, 6 * TS, TS, "#7a4a2a"); R(10 * TS, 3 * TS, 6 * TS, 4, "#a8743f"); R(10 * TS, 3 * TS + 14, 6 * TS, 2, "#4a2a14");
    R(11 * TS, 3 * TS - 6, 8, 6, "#e8e0d0"); R(14 * TS + 4, 3 * TS - 8, 6, 8, "#4a8a4a"); R(14 * TS + 5, 3 * TS - 12, 4, 5, "#7fd060");
    /* 魔導具店 */
    R(19 * TS, 3 * TS, 4 * TS, TS, "#3a4a7a"); R(19 * TS, 3 * TS, 4 * TS, 4, "#5a6aa0");
    for (let i = 0; i < 5; i++) { R(19 * TS + 4 + i * 12, 3 * TS - 6, 6, 6, ["#ff6a8a", "#7fd0ff", "#ffd84a", "#4fe39a", "#c27bff"][i]); }
    R(19 * TS, 1 * TS + 4, 4 * TS, 12, "#3a2a1a"); for (let i = 0; i < 8; i++) R(19 * TS + 3 + i * 8, 1 * TS + 6, 5, 8, ["#9ab0ff", "#ff8fd0", "#ffe86a", "#7fd0ff"][i % 4]);
    /* 資料室の本棚（右の壁） */
    for (let k = 0; k < 2; k++) { R(23 * TS + k * TS, 6 * TS, TS, 4 * TS, "#5a3a22"); for (let r = 0; r < 6; r++) for (let i = 0; i < 4; i++) R(23 * TS + k * TS + 2 + i * 3, 6 * TS + 3 + r * 10, 2, 7, ["#a0402a", "#3a6a9a", "#4a8a4a", "#c8985a", "#7a4aa0"][(i + r + k) % 5]); }
    /* 協会掲示（壁の掲示板） */
    R(16 * TS, 1 * TS + 2, 2 * TS, 2 * TS - 2, "#2a5a3a"); R(16 * TS + 3, 1 * TS + 5, 2 * TS - 6, 2 * TS - 9, "#3a7a4a");
    R(16 * TS + 6, 1 * TS + 8, 8, 10, "#f0e2b8"); R(16 * TS + 17, 1 * TS + 10, 9, 8, "#ffe86a");
    /* 鍛冶屋（炉と金床） */
    R(20 * TS, 12 * TS, 2 * TS, 2 * TS, "#5a5068"); R(20 * TS + 4, 12 * TS + 10, 2 * TS - 8, 14, "#2a1a14");
    R(22 * TS + 2, 13 * TS + 2, 2 * TS - 4, 10, "#6a6a7a"); R(22 * TS + 6, 13 * TS - 2, 2 * TS - 12, 6, "#8a8a9a");
    /* 酒場のカウンター */
    R(1 * TS, 11 * TS, 5 * TS, TS, "#6a3a1a"); R(1 * TS, 11 * TS, 5 * TS, 4, "#9a5a2a");
    R(1 * TS, 9 * TS, 5 * TS, 12, "#3a2210"); for (let i = 0; i < 9; i++) R(1 * TS + 4 + i * 8, 9 * TS + 2, 4, 9, ["#7a2a2a", "#c8985a", "#4a8a4a", "#e8e0d0"][i % 4]);
    /* 冒険者情報の机 */
    R(1 * TS, 5 * TS, 3 * TS, 2 * TS, "#7a4a2a"); R(1 * TS + 4, 5 * TS + 4, 14, 10, "#f0e2b8"); R(2 * TS + 8, 5 * TS + 6, 10, 8, "#3a6a9a");
    /* 倉庫（宝箱とたる） */
    R(14 * TS, 14 * TS, 3 * TS, 2 * TS, "#3a2a1a");
    [[14, 14], [15, 14], [16, 15]].forEach(([x, y], i) => { R(x * TS + 2, y * TS + 3, 12, 11, i === 1 ? "#3a5ab0" : "#a0682a"); R(x * TS + 2, y * TS + 7, 12, 1, "#e0b040"); });
    /* テーブル */
    TABLES.forEach(([x, y]) => { g.fillStyle = "#6a3a1a"; g.beginPath(); g.ellipse(x * TS + 16, y * TS + 8, 15, 8, 0, 0, TAU); g.fill(); g.fillStyle = "#9a5a2a"; g.beginPath(); g.ellipse(x * TS + 16, y * TS + 6, 13, 6, 0, 0, TAU); g.fill(); R(x * TS + 10, y * TS + 2, 4, 5, "#e8e0d0"); R(x * TS + 19, y * TS + 3, 4, 4, "#c8985a"); });
    /* 深淵の門（下の壁） */
    R(9 * TS, 15 * TS, 3 * TS, 2 * TS, "#2a1a3a"); g.fillStyle = "#4a2a7a"; g.beginPath(); g.ellipse(10.5 * TS, 16 * TS, 18, 16, 0, Math.PI, 0); g.fill();
    /* 窓（上の壁） */
    [[8, 0], [18, 0]].forEach(([x, y]) => { R(x * TS + 3, y * TS + 6, 10, 12, "#ffe8a0"); R(x * TS + 7, y * TS + 6, 2, 12, "#8a6a40"); R(x * TS + 3, y * TS + 11, 10, 2, "#8a6a40"); });
    return c;
  }
  /* ギルドの人たち（XEVARION のキャラではない） */
  const NPCDEF = {
    laura: { nm: "ギルドマスター ラウラ", pal: { H: "#5a3a8a", h: "#3a2260", L: "#8a6ac0", E: "#ffcc3a", A: "#2a2440", a: "#1a1630", C: "#e0b040", c: "#a07a20", P: "#2a2440", p: "#1a1630", O: "#2a2030", o: "#141018", K: "#120e1a" }, hair: "long", outfit: "robe" },
    shopkeep: { nm: "魔導具店のミント", pal: { H: "#4fbf9a", h: "#2f8a6a", L: "#8fe8c8", E: "#3a6aff", A: "#f2f2f6", a: "#c8c8d6", C: "#3a4a7a", c: "#2a3460", P: "#3a4a7a", p: "#2a3460", O: "#5a3a2a", o: "#3a2418", K: "#0e1a14" }, hair: "bob", outfit: "tank" },
    smith: { nm: "鍛冶屋のガルド", pal: { H: "#8a3a1a", h: "#5a2410", L: "#c86a3a", E: "#3a2a1a", A: "#6a5a4a", a: "#4a3e32", C: "#3a2a1a", c: "#2a1e12", P: "#3a3a4a", p: "#2a2a36", O: "#2a1e12", o: "#140e08", S: "#d8a07a", s: "#b07a58", K: "#140c08" }, hair: "bob", outfit: "tank" },
    barkeep: { nm: "酒場のローザ", pal: { H: "#c83a4a", h: "#8a2230", L: "#f07080", E: "#3a8a3a", A: "#f2f2f6", a: "#c8c8d6", C: "#2a2a30", c: "#16161a", P: "#2a2a30", p: "#16161a", O: "#2a2a30", o: "#16161a", K: "#160a0e" }, hair: "long", outfit: "tank" },
    adv1: { nm: "冒険者", pal: { H: "#d8b040", h: "#a07a20", L: "#ffe08a", E: "#3a6aff", A: "#5a7a3a", a: "#3e5a28", C: "#8a5a2a", c: "#5a3a1a", P: "#5a4a3a", p: "#3a2e24", O: "#3a2a1a", o: "#1e140a", K: "#120e08" }, hair: "bob", outfit: "tank" },
    adv2: { nm: "冒険者", pal: { H: "#2a3a6a", h: "#1a2448", L: "#5a6aa0", E: "#ff8a3a", A: "#8a2a3a", a: "#5a1a26", C: "#e0b040", c: "#a07a20", P: "#2a2a36", p: "#1a1a24", O: "#2a1e12", o: "#140e08", K: "#0e0e18" }, hair: "long", outfit: "tank" },
    adv3: { nm: "冒険者", pal: { H: "#e8e8f0", h: "#b0b0c0", L: "#ffffff", E: "#c070ff", A: "#3a2a5a", a: "#261a40", C: "#9a90b0", c: "#6a6080", P: "#3a2a5a", p: "#261a40", O: "#2a2030", o: "#141018", K: "#120e1a" }, hair: "long", outfit: "robe" },
  };
  function npcSprite(k) {
    const n = NPCDEF[k], PA = MA.Pix.PARTS;
    const layers = [n.hair === "bob" ? PA.backBob() : PA.backLong(24), n.outfit === "robe" ? { x: 6, y: 14, rows: ["..AACCAA....", ".AAAACAAAAA.", "AAAAACAAAAAA", "A.AAAAAAAA.A", "a.AaAAAAaA.a", "S.AAAAAAAA.S", "..AAAAAAAA..", "..AaAAAAaA..", "..AAAAAAAA..", "..aAAAAAAa..", "...OO..OO...", "...oo..oo..."] } : PA.outfitTank(PA.BOTTOM_PANTS), "FACE", n.hair === "bob" ? PA.frontBob(false) : PA.frontStraight(14)];
    return MA.Pix.spriteFromDef("npc_" + k, { pal: n.pal, legY: n.outfit === "robe" ? 27 : 23, robe: n.outfit === "robe", layers });
  }
  function initNpcs() {
    GS.npcs = [
      { k: "laura", x: 13 * TS, y: 2 * TS + 14, still: 1 },
      { k: "shopkeep", x: 21 * TS, y: 2 * TS + 14, still: 1 },
      { k: "smith", x: 22 * TS, y: 11 * TS + 14, still: 1 },
      { k: "barkeep", x: 3 * TS, y: 10 * TS + 14, still: 1 },
      { k: "adv1", x: 9 * TS, y: 11 * TS, home: [9 * TS, 11 * TS] },
      { k: "adv2", x: 13 * TS, y: 12 * TS, home: [13 * TS, 12 * TS] },
      { k: "adv3", x: 19 * TS, y: 7 * TS, home: [19 * TS, 7 * TS] },
    ];
    GS.npcs.forEach((n) => { n.t = Math.random() * 5; n.face = 1; n.tx = n.x; n.ty = n.y; n.walkT = 0; });
  }

  /* ══ ギルドの開始・ループ ══ */
  function enter() {
    MA.E.stop();
    UI().closeModal(true);
    UI().scr("guild");
    if (!gmap) { gmap = buildGuildMap(); initNpcs(); }
    bg = drawBg();
    hub = $("#hub"); hctx = hub.getContext("2d");
    resizeHub();
    MA.Input.enabled = true;
    MA.Input.clearAll();
    $("#touch").innerHTML = '<div class="t-zone" id="tZone"><div class="t-base" id="tBase"><div class="t-knob" id="tKnob"></div></div></div><div class="t-btns"><button class="tb big" data-act="interact">' + ic("info") + "</button></div>";
    MA.Input.bindTouch($("#tZone"), $("#tBase"), $("#tKnob"));
    MA.Input.bindButtons($("#touch"));
    GS.x = 13 * TS; GS.y = 8 * TS;
    renderTop();
    buildLabels();
    MA.Audio.bgm("guild");
    if (!GS.running) { GS.running = true; GS.last = performance.now(); requestAnimationFrame(loopHub); }
    /* はじめてのとき：序章 */
    if (!S().codex.story.prologue) setTimeout(() => playStory("prologue"), 300);
    else {
      /* ★ 結果画面をすぐ閉じても、クリアした迷宮の章を取りこぼさない */
      const pend = D().STORY.find((st) => st.at && S().dun[st.at] && S().dun[st.at].clears > 0 && !S().codex.story[st.id]);
      if (pend) setTimeout(() => { if (!UI().topModal()) playStory(pend.id); }, 300);
      else checkResume();
    }
    MA.Prog.checkAll();
  }
  function leave() { GS.running = false; }
  function resizeHub() {
    if (!hub) return;
    const w = window.innerWidth, h = window.innerHeight;
    let scale = Math.min(w / (GW * TS), (h - 0) / (GH * TS));
    if (scale > 1.5) scale = Math.floor(scale * 2) / 2;
    scale = Math.max(1, Math.min(scale, Math.min(w, h) / 200));
    /* ★ スマホの縦画面：部屋全体を等倍で入れると人が小さく、上下も大きく空く → 2倍前後に拡大してカメラで追う */
    if (h > w * 1.2) scale = Math.max(scale, Math.min(2, Math.round(w / 190 * 2) / 2));
    GS.scale = scale;
    hub.width = Math.ceil(w / scale); hub.height = Math.ceil(h / scale);
    hub.style.width = w + "px"; hub.style.height = h + "px";
    hctx.imageSmoothingEnabled = false;
  }
  window.addEventListener("resize", () => { if (GS.running) { resizeHub(); } });
  function loopHub(now) {
    if (!GS.running) return;
    requestAnimationFrame(loopHub);
    /* ★ rAF の時刻は performance.now() より前のことがある（最初のコマ）→ 負の時間にしない */
    const dt = Math.max(0, Math.min(0.05, (now - GS.last) / 1000)); GS.last = now;
    if (document.body.dataset.scr !== "guild") return;
    GS.t += dt;
    updateHub(dt);
    drawHub();
  }
  function updateHub(dt) {
    const I = MA.Input;
    const modalOpen = !!UI().topModal();
    let mx = modalOpen ? 0 : I.mx, my = modalOpen ? 0 : I.my;
    const sp = 82;
    GS.vx += (mx * sp - GS.vx) * Math.min(1, dt * 14); GS.vy += (my * sp - GS.vy) * Math.min(1, dt * 14);
    const o = { x: GS.x, y: GS.y, r: 5 };
    o.x += GS.vx * dt; let p = MA.Map.collideCircle(gmap, o.x, o.y, o.r); o.x += p[0]; o.y += p[1];
    o.y += GS.vy * dt; p = MA.Map.collideCircle(gmap, o.x, o.y, o.r); o.x += p[0]; o.y += p[1];
    GS.x = o.x; GS.y = o.y;
    GS.moving = Math.hypot(mx, my) > 0.1; if (GS.moving) { GS.walkT += dt; if (Math.abs(mx) > 0.1) GS.face = mx > 0 ? 1 : -1; }
    /* 近くの施設 */
    let near = null, nd = 1e9;
    FAC.forEach((f) => { const dx = GS.x - (f.spot[0] * TS + 8), dy = GS.y - (f.spot[1] * TS + 8), d = dx * dx + dy * dy; if (d < 26 * 26 && d < nd) { nd = d; near = f; } });
    if (near !== GS.near) { GS.near = near; const hint = $("#gHint"); if (hint) { hint.hidden = !near; if (near) hint.innerHTML = ic(near.ic, near.c) + "<b>" + esc(near.nm) + "</b><span>" + esc(near.sub) + '</span><kbd>F</kbd>'; } }
    if (!modalOpen && (I.consume("interact") || I.consume("attack")) && near) openFac(near.open);
    if (!modalOpen && I.consume("menu")) openPanel("settings");
    I.pressed.delete("map"); I.pressed.delete("dash"); I.pressed.delete("skill"); I.pressed.delete("burst"); I.pressed.delete("ult");
    /* NPC：ときどき近くを歩く */
    GS.npcs.forEach((n) => {
      n.t -= dt;
      if (n.still) { n.face = GS.x > n.x ? 1 : -1; return; }
      if (n.t <= 0) { n.t = 2 + Math.random() * 4; n.tx = n.home[0] + (Math.random() - 0.5) * 60; n.ty = n.home[1] + (Math.random() - 0.5) * 40; }
      const dx = n.tx - n.x, dy = n.ty - n.y, d = Math.hypot(dx, dy);
      if (d > 2) { const q = { x: n.x + dx / d * 30 * dt, y: n.y + dy / d * 30 * dt }; const pp = MA.Map.collideCircle(gmap, q.x, q.y, 5); n.x = q.x + pp[0]; n.y = q.y + pp[1]; n.walkT += dt; n.moving = true; n.face = dx > 0 ? 1 : -1; } else n.moving = false;
    });
    /* カメラ */
    const vw = hub.width, vh = hub.height, mw = GW * TS, mh = GH * TS;
    GS.cam.x = mw > vw ? Math.max(vw / 2, Math.min(mw - vw / 2, GS.x)) : mw / 2;
    GS.cam.y = mh > vh ? Math.max(vh / 2, Math.min(mh - vh / 2, GS.y)) : mh / 2;
  }
  function drawHub() {
    const g = hctx, vw = hub.width, vh = hub.height;
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;   /* ★ 前のコマの変形が残らないように */
    const cx = Math.round(GS.cam.x - vw / 2), cy = Math.round(GS.cam.y - vh / 2);
    g.fillStyle = "#120a08"; g.fillRect(0, 0, vw, vh);
    g.drawImage(bg, -cx, -cy);
    /* 動くもの：炉の火・ろうそく・深淵の門 */
    const t = GS.t;
    const fire = (x, y, s) => { for (let i = 0; i < 4; i++) { g.fillStyle = ["#ff6a2a", "#ffb03a", "#ffe86a", "#ff8a3a"][i]; const h = (6 + Math.sin(t * 9 + i * 1.7) * 2) * s; g.fillRect(Math.round(x + (i - 1.5) * 3 * s - cx), Math.round(y - h - cy), Math.ceil(2 * s), Math.ceil(h)); } };
    fire(21 * TS, 13 * TS + 8, 1.2);
    [[2, 2], [24, 2], [2, 16], [24, 16], [8, 4], [18, 4]].forEach(([x, y], i) => { g.fillStyle = "#e8e0d0"; g.fillRect(x * TS + 7 - cx, y * TS + 4 - cy, 2, 5); g.fillStyle = i % 2 ? "#ffe86a" : "#ffb03a"; g.fillRect(x * TS + 7 - cx, y * TS + 1 - cy + Math.round(Math.sin(t * 7 + i)), 2, 3); });
    const gateOpen = !!(S().dun.d3 && S().dun.d3.clears);
    g.globalAlpha = gateOpen ? 0.6 + 0.3 * Math.sin(t * 3) : 0.25;
    g.fillStyle = "#a874ff"; g.beginPath(); g.ellipse(10.5 * TS - cx, 16 * TS - cy, 14, 13, 0, Math.PI, 0); g.fill();
    g.fillStyle = "#ffffff"; g.beginPath(); g.ellipse(10.5 * TS - cx, 16 * TS - cy - 4, 5 + Math.sin(t * 4) * 2, 4, 0, 0, TAU); g.fill();
    g.globalAlpha = 1;
    /* 人物（y の順） */
    const list = GS.npcs.map((n) => ({ y: n.y, n })).concat([{ y: GS.y, me: 1 }]);
    list.sort((a, b) => a.y - b.y);
    list.forEach((it) => {
      if (it.me) { drawWalker(g, MA.Pix.charSprite(S().sel), GS, cx, cy); return; }
      drawWalker(g, npcSprite(it.n.k), it.n, cx, cy);
    });
    /* 明かり（あたたかいふち） */
    const gr = g.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.3, vw / 2, vh / 2, Math.max(vw, vh) * 0.75);
    gr.addColorStop(0, "rgba(255,200,120,0)"); gr.addColorStop(1, "rgba(20,8,4,.55)");
    g.fillStyle = gr; g.fillRect(0, 0, vw, vh);
    /* 名札の位置 */
    placeLabels(cx, cy);
  }
  function drawWalker(g, sp, o, cx, cy) {
    let f;
    if (o.moving) f = sp.walk[Math.floor(o.walkT * 9) % 4];
    else { const it = Math.floor(GS.t * 2 + (o.x % 3)) % 2; f = sp.idle[((GS.t + o.x * 0.01) % 3.4) > 3.25 ? 2 : it]; }
    const x = Math.round(o.x - cx), y = Math.round(o.y - cy);
    g.fillStyle = "rgba(0,0,0,.3)"; g.beginPath(); g.ellipse(x, y + 2, 7, 3, 0, 0, TAU); g.fill();
    if (!f) return;
    if (o.face < 0) { g.save(); try { g.translate(x, 0); g.scale(-1, 1); g.drawImage(f, -Math.floor(f.width / 2), y - f.height + 4); } finally { g.restore(); } }
    else g.drawImage(f, x - Math.floor(f.width / 2), y - f.height + 4);
  }
  /* 施設の名札（押せる） */
  function buildLabels() {
    const box = $("#gLabels"); box.innerHTML = "";
    FAC.forEach((f) => {
      const b = document.createElement("button");
      b.className = "glab"; b.dataset.a = "fac"; b.dataset.v = f.open; b.style.setProperty("--c", f.c);
      const locked = f.id === "gate" && !(S().dun.d3 && S().dun.d3.clears);
      b.innerHTML = ic(locked ? "lock" : f.ic, f.c) + "<span>" + esc(f.nm) + "</span>";
      b._f = f;
      box.appendChild(b);
    });
  }
  function placeLabels(cx, cy) {
    const sc = GS.scale || 1;
    document.querySelectorAll(".glab").forEach((b) => {
      const f = b._f; if (!f) return;
      const x = (f.x + f.w / 2) * TS - cx, y = f.y * TS - cy - 4;
      b.style.transform = "translate(" + Math.round(x * sc) + "px," + Math.round(y * sc) + "px) translate(-50%,-100%)";
      b.classList.toggle("near", GS.near === f);
    });
  }
  function renderTop() {
    const s = S();
    $("#gTop").innerHTML = '<div class="g-logo"><img src="img/icon_s.webp" alt=""><b>Magi<i>Abyss</i></b></div>' +
      '<div class="g-cur">' + ic("gold") + "<b>" + fmt(s.gold) + "</b></div>" +
      '<div class="g-cur">' + ic("mat", D().MATS.stone.c) + "<b>" + fmt(s.mats.stone || 0) + "</b></div>" +
      '<div class="g-cur">' + ic("crystal") + "<b>" + fmt(s.mats.crystal || 0) + "</b></div>" +
      '<button class="g-btn" data-a="panel" data-v="items" title="アイテム">' + ic("chest") + "</button>" +
      '<button class="g-btn" data-a="panel" data-v="settings" title="設定">' + ic("gear") + "</button>" +
      '<button class="g-btn" data-a="toTitle" title="タイトルへ">' + ic("back") + "</button>";
    const sel = s.sel, C = D().CHARS[sel];
    $("#gSel").innerHTML = '<img src="../img/t_' + UI().imgName(sel) + '.webp" alt=""><div><small>出発するキャラ</small><b>' + esc(C.nm) + "</b><span>Lv." + MA.Save.lvOf(sel) + "・" + D().CTYPE[C.type].nm + (MA.Save.owned(sel) ? "" : "・おためし") + '</span></div><button class="btn sm" data-a="fac" data-v="chars">変更</button>';
  }

  /* ══════════════════════════════════════════════════════════════
     パネル（施設の画面）
     ══════════════════════════════════════════════════════════════ */
  function openFac(id) { MA.Audio.sfx("click"); openPanel(id); }
  function openPanel(id, arg) {
    const f = PANELS[id]; if (!f) return;
    const r = f(arg);
    if (!r) return;
    const m = UI().modal(r.html, { wide: r.wide !== false, tall: r.tall, cls: "pn pn-" + id, onClose: () => { renderTop(); } });
    m.dataset.panel = id;
    if (r.after) r.after(m);
    return m;
  }
  function refresh(m, id, arg) {
    const f = PANELS[id]; const r = f(arg);
    const inner = m.querySelector(".mdl-in");
    const sc = inner.scrollTop;
    inner.innerHTML = '<button class="mdl-x" data-a="closeModal" aria-label="閉じる">' + ic("close") + "</button>" + r.html;
    inner.scrollTop = sc;
    if (r.after) r.after(m);
  }
  function refreshTop() { const m = UI().topModal(); if (m && m.dataset.panel) refresh(m, m.dataset.panel, m._arg); renderTop(); }
  function head(icon, title, sub, col) { return '<div class="pn-h">' + ic(icon, col) + "<div><b>" + esc(title) + "</b>" + (sub ? "<small>" + sub + "</small>" : "") + "</div></div>"; }
  const PANELS = {};

  /* ── 依頼掲示板：迷宮えらび ── */
  let selDun = "d1";
  function dunOpen(d) { return !d.unlock || (S().dun[d.unlock] && S().dun[d.unlock].clears > 0); }
  PANELS.dungeons = () => {
    const s = S();
    const nodes = [[14, 74], [30, 52], [48, 70], [62, 40], [80, 62], [88, 22]];
    const map = '<div class="wmap"><div class="wm-bg"></div><svg class="wm-path" viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="' + nodes.map((p) => p.join(",")).join(" ") + '" /></svg>' +
      D().DUNGEONS.map((d, i) => {
        const open = dunOpen(d), dr = s.dun[d.id] || {};
        return '<button class="wm-node' + (selDun === d.id ? " sel" : "") + (open ? "" : " lock") + (dr.clears ? " clr" : "") + '" style="left:' + nodes[i][0] + "%;top:" + nodes[i][1] + "%;--c:" + d.c + '" data-a="selDun" data-v="' + d.id + '">' + ic(open ? (dr.clears ? "flag" : "star") : "lock", d.c) + "<span>" + d.no + "</span></button>";
      }).join("") + "</div>";
    const d = D().DUN[selDun], open = dunOpen(d), dr = s.dun[d.id] || {};
    const B = D().BOSSES[d.boss];
    const power = MA.Stats.power(MA.Stats.compute(s.sel));
    const det = '<div class="dun-det" style="--c:' + d.c + '">' +
      '<div class="dd-art" id="ddArt"></div>' +
      '<div class="dd-h"><small>第' + d.no + "迷宮・" + esc(d.en) + "</small><b>" + esc(d.nm) + '</b><span class="stars">' + "★".repeat(d.stars) + "<i>" + "★".repeat(6 - d.stars) + "</i></span>" + "<em>" + esc(d.diff) + "</em></div>" +
      '<p class="dd-d">' + esc(d.d) + "</p>" +
      '<div class="dd-grid"><div><small>推奨レベル</small><b>Lv.' + d.rec.lv + '</b></div><div><small>推奨戦力</small><b class="' + (power >= d.rec.power ? "ok" : "ng") + '">' + fmt(d.rec.power) + '</b><i>あなた ' + fmt(power) + '</i></div><div><small>クリア</small><b>' + (dr.clears ? dr.clears + "回" : "まだ") + "</b></div><div><small>ベスト</small><b>" + (dr.best ? fmtT(dr.best) : "—") + "</b></div></div>" +
      '<div class="dd-sec">出現する敵</div><div class="dd-en" id="ddEn"></div>' +
      '<div class="dd-sec">ボス</div><div class="dd-boss"><canvas id="ddBoss" width="64" height="64"></canvas><div><b>' + esc(B.nm) + "</b><small>" + esc(B.gim.nm) + "：" + esc(B.gim.d) + "</small></div></div>" +
      '<div class="dd-sec">手に入る素材</div><div class="dd-mats">' + d.mats.map((k) => '<span>' + ic("mat", D().MATS[k].c) + esc(D().MATS[k].nm) + "</span>").join("") + '<span>' + ic("crystal") + "星脈結晶（ボス）</span></div>" +
      '<div class="dd-sec">特殊ルール</div><ul class="dd-rules">' + d.rules.map((r) => "<li>" + esc(r) + "</li>").join("") + "</ul>" +
      (open ? '<button class="btn gold big" data-a="prep" data-v="' + d.id + '">' + ic("door") + "探索準備へ</button>" : '<div class="locked">' + ic("lock") + "「" + esc(D().DUN[d.unlock].nm) + "」をクリアすると解放されます</div>") +
      "</div>";
    return { html: head("scroll", "依頼掲示板", "迷宮をえらんでください", "#ffd84a") + '<div class="dun-wrap">' + map + det + "</div>", after: (m) => paintDun(m, d) };
  };
  function paintDun(m, d) {
    /* 迷宮の絵（床のタイルと置物で小さな景色を描く） */
    const art = $("#ddArt", m); if (!art) return;
    const c = MA.Pix.mkCanvas(160, 64), g = c.getContext("2d"); g.imageSmoothingEnabled = false;
    const T = MA.Art.tiles(d.biome), B = MA.Art.BIOME[d.biome];
    g.fillStyle = B.bg; g.fillRect(0, 0, 160, 64);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 10; x++) g.drawImage(y === 0 ? T.face : T.floor[(x + y) % 4], x * 16, y * 16);
    const dk = { forest: "tree", ice: "crystal", lava: "rock", library: "shelf", abyss: "void", sky: "starpillar" }[d.biome];
    [[20, 62], [140, 62], [100, 40]].forEach(([x, y], i) => { const f = MA.Art.deco(dk, i).frames[0]; g.drawImage(f, x - f.width / 2, y - f.height); });
    d.enemies.slice(0, 3).forEach((k, i) => { const e = D().ENEMIES[k]; const f = MA.Art.sprite(e.art, e.col).frames[0]; g.drawImage(f, 46 + i * 24, 54 - f.height); });
    c.className = "pxc"; art.innerHTML = ""; art.appendChild(c);
    const en = $("#ddEn", m);
    en.innerHTML = "";
    d.enemies.concat([d.elite]).forEach((k) => {
      const e = D().ENEMIES[k]; const seen = S().codex.en[k];
      const w = document.createElement("div"); w.className = "en-chip";
      const f = MA.Art.sprite(e.art, e.col).frames[0];
      const cc = MA.Pix.mkCanvas(f.width, f.height); cc.getContext("2d").drawImage(f, 0, 0); cc.className = "pxc";
      if (!seen) cc.style.filter = "brightness(0)";
      w.appendChild(cc);
      const sp = document.createElement("span"); sp.textContent = seen ? e.nm : "？？？"; w.appendChild(sp);
      const ai = document.createElement("i"); ai.textContent = { chase: "追跡", charge: "突進", ranged: "遠距離", summon: "召喚", guard: "防御", hex: "妨害", elite: "エリート", swarm: "群体" }[e.ai]; w.appendChild(ai);
      en.appendChild(w);
    });
    const bc = $("#ddBoss", m); const bf = MA.Art.sprite(D().BOSSES[d.boss].art).frames[0];
    const bg2 = bc.getContext("2d"); bg2.imageSmoothingEnabled = false; const k = Math.min(64 / bf.width, 64 / bf.height);
    bg2.clearRect(0, 0, 64, 64); bg2.drawImage(bf, (64 - bf.width * k) / 2, (64 - bf.height * k) / 2, bf.width * k, bf.height * k);
    if (!S().codex.boss[d.boss]) bc.style.filter = "brightness(0.15)";
  }

  /* ── 探索準備 ── */
  let prepMuts = [];
  PANELS.prep = (dunId) => {
    const s = S(), d = D().DUN[dunId];
    const cid = s.sel, C = D().CHARS[cid], own = MA.Save.owned(cid);
    const st = MA.Stats.compute(cid, own ? {} : { lv: 10, awk: 0, tree: {}, gear: [] });
    const pw = MA.Stats.power(st);
    const dr = s.dun[dunId] || {};
    const mutOpen = dr.clears > 0;
    const gear = MA.Stats.gearOf(cid, s);
    const slots = D().SLOT_KEYS.map((sl) => { const g = own ? gear.find((x) => D().GEAR[x.id].slot === sl) : null; return '<div class="slot' + (g ? "" : " empty") + '" style="--rc:' + (g ? D().RAR[g.rar].c : "#555") + '">' + ic(D().SLOTS[sl].ic, g ? D().RAR[g.rar].c : "#666") + "<small>" + (g ? esc(D().GEAR[g.id].nm) + (g.lv ? " +" + g.lv : "") : D().SLOTS[sl].nm + "（なし）") + "</small></div>"; }).join("");
    const rewardK = 1 + prepMuts.reduce((a, k) => a + D().MUTATIONS[k].reward, 0);
    const html = head("door", "探索準備", esc(d.nm) + "・推奨 Lv." + d.rec.lv + "／戦力 " + fmt(d.rec.power), d.c) +
      '<div class="prep">' +
      '<div class="pr-char"><img src="../img/t_' + UI().imgName(cid) + '.webp" alt=""><canvas id="prSprite" width="48" height="60"></canvas><div><b>' + esc(C.nm) + "</b><small>" + esc(C.title) + "・" + D().CTYPE[C.type].nm + "</small><span>Lv." + st.lv + (own ? "" : "（おためし：Lv10固定・経験値なし）") + '　戦力 <b class="' + (pw >= d.rec.power ? "ok" : "ng") + '">' + fmt(pw) + '</b></span><button class="btn sm" data-a="fac" data-v="chars">キャラを変える</button></div></div>' +
      '<div class="pr-sec">装備</div><div class="slots">' + slots + '</div>' + (own ? '<button class="btn sm ghost" data-a="panel" data-v="storage">装備を変更</button>' : "") +
      '<div class="pr-sec">ダンジョン変異 ' + (mutOpen ? "<small>（報酬 ×" + rewardK.toFixed(2) + "）</small>" : "<small>（この迷宮を1回クリアすると選べます）</small>") + '</div><div class="muts">' +
      Object.keys(D().MUTATIONS).map((k) => { const M = D().MUTATIONS[k]; const on = prepMuts.indexOf(k) >= 0; return '<button class="mut' + (on ? " on" : "") + '" data-a="togMut" data-v="' + k + '" data-d="' + dunId + '"' + (mutOpen ? "" : " disabled") + "><b>" + esc(M.nm) + "</b><small>" + esc(M.d) + (M.reward ? "・報酬+" + Math.round(M.reward * 100) + "%" : "") + "</small></button>"; }).join("") +
      '</div><div class="pr-sec">持ちこみ</div><div class="carry">' +
      [["potion", "回復薬"], ["elixir", "エリクサー"], ["reroll", "運命のダイス（引き直し）"], ["banish", "忘却の砂（とばす）"]].map(([k, n]) => '<span>' + ic(k === "reroll" ? "dice" : k === "banish" ? "sand" : k) + esc(n) + " <b>×" + Math.min(k === "elixir" ? 1 : 3, s.items[k] || 0) + "</b></span>").join("") +
      '<button class="btn sm ghost" data-a="panel" data-v="shop">店で買う</button></div>' +
      '<p class="hint">探索は1回 15〜35分ほど。鍵を3つ集めるとボスの扉が開きます。途中で閉じても次に開いたときに再開できます。</p>' +
      '<button class="btn gold big" data-a="go" data-v="' + dunId + '">' + ic("door") + "出発する</button></div>";
    return { html, after: (m) => { m._arg = dunId; drawSpritePreview($("#prSprite", m), cid); } };
  };
  function drawSpritePreview(c, cid, mode) {
    if (!c) return;
    const sp = MA.Pix.charSprite(cid);
    const g = c.getContext("2d"); g.imageSmoothingEnabled = false;
    let t = 0;
    const loop = () => {
      if (!c.isConnected) return;
      t += 1 / 60;
      g.clearRect(0, 0, c.width, c.height);
      const ph = mode === "demo" ? Math.floor(t / 1.6) % 3 : 0;
      const f = ph === 1 ? sp.walk[Math.floor(t * 9) % 4] : ph === 2 ? (Math.floor(t * 6) % 2 ? sp.atk : sp.idle[0]) : sp.idle[(t % 3.2) > 3.05 ? 2 : Math.floor(t * 2) % 2];
      const k = Math.floor(Math.min(c.width / sp.w, c.height / sp.h));
      g.drawImage(f, Math.round((c.width - f.width * k) / 2), Math.round(c.height - f.height * k), f.width * k, f.height * k);
      requestAnimationFrame(loop);
    };
    loop();
  }

  /* ── キャラクター一覧（酒場）── */
  let charFilter = "all";
  PANELS.chars = () => {
    const s = S();
    const list = D().CHAR_ORDER.filter((id) => charFilter === "all" || (charFilter === "own" ? MA.Save.owned(id) : D().CHARS[id].type === charFilter));
    const html = head("person", "キャラクター編成（酒場）", "所持と凸は XEVARION と共通・レベルはこのアプリだけ", "#ff6a5a") +
      '<div class="tabs">' + [["all", "すべて"], ["own", "所持"]].concat(Object.keys(D().CTYPE).map((k) => [k, D().CTYPE[k].nm])).map(([k, n]) => '<button class="tab' + (charFilter === k ? " on" : "") + '" data-a="charFilter" data-v="' + k + '">' + esc(n) + "</button>").join("") + "</div>" +
      '<div class="cgrid">' + list.map((id) => {
        const C = D().CHARS[id], own = MA.Save.owned(id), awk = MA.Save.awkOf(id), lv = MA.Save.lvOf(id);
        const st = MA.Stats.compute(id);
        return '<button class="cc' + (s.sel === id ? " sel" : "") + (own ? "" : " lock") + '" data-a="charDet" data-v="' + id + '" style="--c:' + D().ELEM[C.el].c + '">' +
          '<img src="../img/t_' + UI().imgName(id) + '.webp" alt="" loading="lazy">' +
          '<span class="cc-rar r-' + C.rank + '">' + C.rank + "</span>" + (awk ? '<span class="cc-awk">' + "◆".repeat(awk) + "</span>" : "") +
          '<div class="cc-b"><b>' + esc(C.nm) + '</b><small><i class="el" style="--c:' + D().ELEM[C.el].c + '">' + D().ELEM[C.el].nm + (C.el2 ? "＆" + D().ELEM[C.el2].nm : "") + "</i>" + D().CTYPE[C.type].nm + "</small>" +
          '<span class="cc-st">HP ' + st.hp + "・攻 " + st.atk + "・防 " + st.def + "・速 " + Math.round(st.spd) + "</span>" +
          "<em>" + (own ? "Lv." + lv : "未所持（おためし可）") + "</em></div></button>";
      }).join("") + "</div>" +
      '<p class="hint">未所持のキャラは XEVARION のガチャ（極彩祭・極煌祭・極華祭）で手に入ります。「おためし」なら Lv10 で遊べます（経験値は入りません）。</p>';
    return { html };
  };
  /* ── キャラ詳細 ── */
  PANELS.charDet = (id) => {
    const s = S(), C = D().CHARS[id], own = MA.Save.owned(id), awk = MA.Save.awkOf(id), lv = MA.Save.lvOf(id);
    const st = MA.Stats.compute(id);
    const rec = s.chars[id] || { xp: 0 };
    const nx = MA.Save.xpFor(lv + 1), cur = MA.Save.xpFor(lv);
    const xpPct = lv >= D().CHAR_MAX_LV ? 100 : Math.round((rec.xp - cur) / (nx - cur) * 100);
    const row = (k, v) => "<div><small>" + k + "</small><b>" + v + "</b></div>";
    const biasTxt = Object.keys(C.bias).map((k) => D().CAT[k]).join("・");
    const evo = D().EVOS[C.evo.to];
    const html = '<div class="cdet" style="--c:' + D().ELEM[C.el].c + '">' +
      '<div class="cd-top"><div class="cd-art"><img src="../img/' + UI().imgName(id) + '.webp" alt=""><canvas id="cdSprite" width="96" height="120"></canvas></div>' +
      '<div class="cd-info"><small>' + esc(C.fes) + "・" + esc(C.title) + '</small><b class="cd-nm">' + esc(C.nm) + ' <span class="cc-rar r-' + C.rank + '">' + C.rank + "</span></b>" +
      '<div class="cd-tags"><i class="el" style="--c:' + D().ELEM[C.el].c + '">' + D().ELEM[C.el].nm + (C.el2 ? "＆" + D().ELEM[C.el2].nm : "") + '属性</i><i style="--c:' + D().CTYPE[C.type].c + '">' + D().CTYPE[C.type].nm + "</i>" + (C.sub ? '<i style="--c:' + D().CTYPE[C.sub].c + '">' + D().CTYPE[C.sub].nm + "</i>" : "") + "</div>" +
      '<div class="cd-lv">' + (own ? "Lv." + lv + ' <span class="xpbar"><i style="width:' + xpPct + '%"></i></span> <small>凸 ' + awk + "/4（XEVARION と共通）</small>" : "未所持（おためしは Lv10）") + "</div>" +
      '<div class="cd-pow">戦力 <b>' + fmt(MA.Stats.power(st)) + "</b></div>" +
      '<div class="row">' + (own || true ? '<button class="btn gold" data-a="selChar" data-v="' + id + '">' + (s.sel === id ? "出発キャラに選択中" : own ? "このキャラで出発" : "おためしで選ぶ") + "</button>" : "") +
      (own ? '<button class="btn" data-a="panel" data-v="tree" data-x="' + id + '">' + ic("tree") + 'スキルツリー</button><button class="btn" data-a="panel" data-v="storage" data-x="' + id + '">' + ic("armor") + "装備</button>" : "") + "</div></div></div>" +
      '<div class="cd-stats">' + row("HP", st.hp) + row("攻撃力", st.atk) + row("防御力", st.def) + row("移動速度", Math.round(st.spd)) + row("攻撃速度", "×" + st.aspd.toFixed(2)) + row("会心率", st.crit + "%") + row("会心ダメージ", "×" + st.critDmg.toFixed(2)) + row("魔法威力", "×" + st.mag.toFixed(2)) + row("回避性能", st.eva) + row("属性適性", D().ELEM[C.el].nm + (C.el2 ? "・" + D().ELEM[C.el2].nm : "")) + "</div>" +
      '<div class="cd-sk"><div><span class="sk-k">通常攻撃</span><b>' + esc(C.atk.nm) + "</b><small>" + esc(C.atk.d) + "</small></div>" +
      '<div><span class="sk-k q">固有スキル Q</span><b>' + esc(C.skill.nm) + "</b><small>" + esc(C.skill.d) + "（再使用 " + C.skill.cd + "秒・MP " + C.skill.mp + "）</small></div>" +
      '<div><span class="sk-k r">必殺技 R</span><b>' + esc(C.ult.nm) + "</b><small>" + esc(C.ult.d) + "（必殺技ゲージ100%で発動）</small></div>" +
      '<div><span class="sk-k p">パッシブ</span><b>' + esc(C.passive.nm) + "</b><small>" + esc(C.passive.d) + "</small></div>" +
      '<div><span class="sk-k e">専用進化</span><b>' + esc(evo.nm) + "</b><small>" + esc(D().ELEM[C.evo.el].nm + "の" + D().WEAPONS[C.evo.weapon].nm) + " を Lv7 にすると進化：" + esc(evo.d) + "</small></div></div>" +
      '<div class="cd-gw"><div><span class="ok">得意</span>' + esc(C.good) + '</div><div><span class="ng">苦手</span>' + esc(C.weak) + '</div><div><span>成長補正</span>' + esc(biasTxt) + " の能力がレベルアップで出やすい</div></div>" +
      '<div class="cd-awk"><b>凸の効果</b>' + D().AWK.slice(1).map((a, i) => '<span class="' + (awk > i ? "on" : "") + '">' + (i + 1) + "凸：" + esc(a.d) + "</span>").join("") + "</div>" +
      "</div>";
    return { html, after: (m) => { m._arg = id; drawSpritePreview($("#cdSprite", m), id, "demo"); } };
  };
  /* ── 冒険者情報：育成（キャラをえらんでスキルツリー）── */
  PANELS.train = () => {
    const html = head("tree", "冒険者情報", "キャラクターの育成・スキルツリー", "#c27bff") +
      '<div class="cgrid sm">' + D().CHAR_ORDER.map((id) => { const C = D().CHARS[id], own = MA.Save.owned(id); const sp = own ? MA.Save.spOf(id) : null; return '<button class="cc' + (own ? "" : " lock") + '" data-a="' + (own ? "treeOf" : "charDet") + '" data-v="' + id + '"><img src="../img/t_' + UI().imgName(id) + '.webp" alt="" loading="lazy"><div class="cc-b"><b>' + esc(C.nm) + "</b><em>" + (own ? "Lv." + MA.Save.lvOf(id) + (sp.left ? '・<span class="sp">SP ' + sp.left + "</span>" : "") : "未所持") + "</em></div></button>"; }).join("") + "</div>";
    return { html };
  };
  PANELS.tree = (id) => {
    id = id || S().sel;
    const C = D().CHARS[id], rec = MA.Save.charRec(id), sp = MA.Save.spOf(id);
    const br = Object.keys(D().TREE_BR).map((b) => '<div class="tr-br"><div class="tr-bh" style="--c:' + D().TREE_BR[b].c + '">' + D().TREE_BR[b].nm + "</div>" +
      D().TREE.filter((n) => n.br === b).map((n) => {
        const has = !!rec.tree[n.id], can = !has && n.req.every((r) => rec.tree[r]) && sp.left >= n.cost;
        const fx = Object.keys(n.fx).map((k) => ({ atk: "攻撃力+" + Math.round(n.fx[k] * 100) + "%", crit: "会心率+" + n.fx[k] + "%", aspd: "攻撃速度+" + Math.round(n.fx[k] * 100) + "%", critDmg: "会心ダメージ+" + Math.round(n.fx[k] * 100) + "%", hp: "最大HP+" + Math.round(n.fx[k] * 100) + "%", def: "防御力+" + n.fx[k], regen: "毎秒HP+" + n.fx[k], skill: "固有スキルの威力+" + Math.round(n.fx[k] * 100) + "%", mp: "MPの回復・最大MPアップ", cdr: "再使用-" + Math.round(n.fx[k] * 100) + "%", passive: "パッシブが強くなる", ult: "必殺技の威力+" + Math.round(n.fx[k] * 100) + "%", ultCharge: "必殺技ゲージのたまり+" + Math.round(n.fx[k] * 100) + "%", shieldStart: "探索開始時に最大HPの" + Math.round(n.fx[k] * 100) + "%のバリア" }[k] || k)).join("・");
        return '<button class="tr-n' + (has ? " on" : can ? " can" : "") + '" data-a="learn" data-v="' + n.id + '" data-c="' + id + '"' + (has || !can ? " disabled" : "") + '><b>' + esc(n.nm) + "</b><small>" + esc(fx) + "</small><i>" + (has ? "習得" : "SP " + n.cost) + "</i></button>";
      }).join('<span class="tr-ln"></span>') + "</div>").join("");
    const html = head("tree", C.nm + " のスキルツリー", "スキルポイント（レベル1つで1）：のこり <b>" + sp.left + "</b> ／ " + sp.total, "#c27bff") +
      '<div class="tree">' + br + '</div><div class="row c"><button class="btn ghost sm" data-a="treeReset" data-v="' + id + '">ふりなおす（500G）</button></div>';
    return { html, after: (m) => { m._arg = id; } };
  };

  /* ── 倉庫：装備管理とアイテム ── */
  let storTab = "gear", storSlot = "all", storChar = null;
  PANELS.storage = (cidArg) => {
    const s = S();
    const cid = storChar || cidArg || s.sel;
    const tabs = '<div class="tabs"><button class="tab' + (storTab === "gear" ? " on" : "") + '" data-a="storTab" data-v="gear">装備管理</button><button class="tab' + (storTab === "items" ? " on" : "") + '" data-a="storTab" data-v="items">アイテム一覧</button></div>';
    if (storTab === "items") return { html: head("chest", "倉庫", "", "#9ab0ff") + tabs + itemsHTML() };
    const own = MA.Save.owned(cid);
    const eq = s.eq[cid] || {};
    const slotsHTML = D().SLOT_KEYS.map((sl) => { const g = s.gear[eq[sl]]; return '<button class="slot' + (g ? "" : " empty") + (storSlot === sl ? " sel" : "") + '" data-a="storSlot" data-v="' + sl + '" style="--rc:' + (g ? D().RAR[g.rar].c : "#555") + '">' + ic(D().SLOTS[sl].ic, g ? D().RAR[g.rar].c : "#777") + "<small>" + D().SLOTS[sl].nm + "</small><b>" + (g ? esc(D().GEAR[g.id].nm) + (g.lv ? " +" + g.lv : "") : "なし") + "</b></button>"; }).join("");
    const list = Object.keys(s.gear).filter((u) => storSlot === "all" || D().GEAR[s.gear[u].id].slot === storSlot)
      .sort((a, b) => D().RAR_KEYS.indexOf(s.gear[b].rar) - D().RAR_KEYS.indexOf(s.gear[a].rar) || s.gear[b].lv - s.gear[a].lv);
    const inv = list.length ? list.map((u) => gearRow(u, cid)).join("") : '<p class="empty">装備がありません。宝箱・ショップ・鍛冶屋で手に入ります。</p>';
    const st = MA.Stats.compute(cid);
    const html = head("armor", "倉庫：装備管理", "キャラごとに 6枠（武器・防具・指輪・護符・靴・魔導具）", "#9ab0ff") + tabs +
      '<div class="stor-char"><select data-a="storChar">' + D().CHAR_ORDER.filter((id) => MA.Save.owned(id)).map((id) => '<option value="' + id + '"' + (id === cid ? " selected" : "") + ">" + esc(D().CHARS[id].nm) + "</option>").join("") + "</select>" +
      '<span>戦力 <b>' + fmt(MA.Stats.power(st)) + "</b>　HP " + st.hp + "・攻 " + st.atk + "・防 " + st.def + "・会心 " + st.crit + "%</span></div>" +
      (own ? "" : '<p class="warn">このキャラは未所持のため装備できません（おためしは装備なし）</p>') +
      '<div class="slots big">' + slotsHTML + "</div>" +
      '<div class="tabs sm"><button class="tab' + (storSlot === "all" ? " on" : "") + '" data-a="storSlot" data-v="all">すべて</button>' + D().SLOT_KEYS.map((sl) => '<button class="tab' + (storSlot === sl ? " on" : "") + '" data-a="storSlot" data-v="' + sl + '">' + D().SLOTS[sl].nm + "</button>").join("") + "</div>" +
      '<div class="glist">' + inv + "</div>";
    return { html, after: (m) => { m._arg = cid; storChar = cid; } };
  };
  function gearText(g) {
    const st = MA.Stats.gearStat(g);
    const nm = { hp: "HP", atk: "攻撃", def: "防御", spd: "移動", aspd: "攻撃速度", crit: "会心", critDmg: "会心ダメ", mag: "魔法", eva: "回避", regen: "回復/秒", drain: "吸収", cdr: "再使用短縮", exp: "経験値", magnet: "拾う範囲", mp: "MP回復", dash: "ダッシュ+", vision: "視界", summon: "精霊", reveal: "宝箱表示" };
    return Object.keys(st).map((k) => (nm[k] || k) + (k === "aspd" || k === "mag" || k === "drain" || k === "cdr" || k === "exp" || k === "magnet" || k === "critDmg" || k === "vision" ? " +" + Math.round(st[k] * 100) + "%" : k === "reveal" || k === "summon" ? "" : " +" + st[k])).join("・");
  }
  function gearRow(u, cid) {
    const s = S(), g = s.gear[u], gd = D().GEAR[g.id], who = MA.Save.gearOwner(u);
    const mine = who === cid;
    return '<div class="gi" style="--rc:' + D().RAR[g.rar].c + '">' + ic(D().SLOTS[gd.slot].ic, D().RAR[g.rar].c) +
      '<div class="gi-b"><b>' + esc(gd.nm) + (g.lv ? ' <span class="plus">+' + g.lv + "</span>" : "") + ' <span class="c-rar" style="--rc:' + D().RAR[g.rar].c + '">' + g.rar + "</span>" + (gd.el ? ' <i class="el" style="--c:' + D().ELEM[gd.el].c + '">' + D().ELEM[gd.el].nm + "</i>" : "") + (g.nw ? ' <span class="new">NEW</span>' : "") + "</b><small>" + esc(gearText(g)) + "</small><small class='gd'>" + esc(gd.d) + "</small></div>" +
      (who && !mine ? '<span class="gi-who">' + esc(D().CHARS[who].nm) + "が装備中</span>" : "") +
      (mine ? '<button class="btn sm ghost" data-a="unequip" data-v="' + gd.slot + '">はずす</button>' : '<button class="btn sm" data-a="equip" data-v="' + u + '">装備</button>') + "</div>";
  }
  function itemsHTML() {
    const s = S();
    const mats = Object.keys(D().MATS).map((k) => '<div class="it">' + ic("mat", D().MATS[k].c) + "<div><b>" + esc(D().MATS[k].nm) + ' <span class="cnt">×' + fmt(s.mats[k] || 0) + "</span></b><small>" + esc(D().MATS[k].d) + "</small></div></div>").join("");
    const items = Object.keys(D().SHOP_ITEMS).filter((k) => k !== "stonePack").map((k) => '<div class="it">' + ic(k === "reroll" ? "dice" : k === "banish" ? "sand" : k) + "<div><b>" + esc(D().SHOP_ITEMS[k].nm) + ' <span class="cnt">×' + (s.items[k] || 0) + "</span></b><small>" + esc(D().SHOP_ITEMS[k].d) + "</small></div></div>").join("");
    return '<div class="pr-sec">素材</div><div class="items">' + mats + '</div><div class="pr-sec">道具</div><div class="items">' + items + '</div><div class="pr-sec">お金</div><div class="items"><div class="it">' + ic("gold") + "<div><b>ゴールド <span class='cnt'>" + fmt(s.gold) + "</span></b><small>ギルドで使えるお金</small></div></div></div>";
  }
  PANELS.items = () => ({ html: head("chest", "アイテム一覧", "", "#9ab0ff") + itemsHTML() });

  /* ── 鍛冶屋 ── */
  let smithTab = "up", smithSel = null;
  const CRAFT = [
    { id: "windcharm", cost: { gold: 500, sap: 6, stone: 10 }, d: "烈風火輪の鍵" },
    { id: "galeboots", cost: { gold: 600, sap: 4, shard: 4, stone: 10 }, d: "迅雷双刃・疾風の矢の鍵" },
    { id: "starring", cost: { gold: 800, shard: 6, stone: 12 }, d: "星雷連鎖の鍵" },
    { id: "soulcharm", cost: { gold: 900, core: 6, stone: 12 }, d: "深影乱舞の鍵" },
    { id: "haloring", cost: { gold: 900, page: 6, stone: 12 }, d: "光輪の書の鍵" },
    { id: "lantern", cost: { gold: 700, shard: 8, stone: 10 }, d: "暗い迷宮で見える範囲が広がる" },
    { id: "compass", cost: { gold: 700, sap: 8, stone: 10 }, d: "宝箱がミニマップに出る" },
    { id: "aquaBow", cost: { gold: 900, shard: 6, stone: 14 }, d: "水の星弓（タキナ専用進化の素）" },
    { id: "fireTome", cost: { gold: 900, core: 6, stone: 14 }, d: "炎の魔導書（烈風火輪・ココハ専用進化の素）" },
    { id: "thunderStaff", cost: { gold: 900, page: 6, stone: 14 }, d: "雷の魔導杖（星雷連鎖の素）" },
    { id: "shadowDagger", cost: { gold: 900, abyss: 6, stone: 14 }, d: "影の双短剣（深影乱舞の素）" },
  ];
  function enhCost(g) { const rk = D().RAR_KEYS.indexOf(g.rar) + 1; const n = g.lv + 1; const c = { gold: Math.round(80 * n * n * rk), stone: 2 * n + rk }; if (n >= 8) c.crystal = n - 7; return c; }
  function costHTML(c) { return Object.keys(c).map((k) => { const have = k === "gold" ? S().gold : (S().mats[k] || 0); return '<span class="' + (have >= c[k] ? "" : "ng") + '">' + (k === "gold" ? ic("gold") : ic("mat", D().MATS[k].c)) + fmt(c[k]) + "</span>"; }).join(""); }
  PANELS.smith = () => {
    const s = S();
    const max = 2 + (s.fac.smith || 0) * 2;
    const tabs = '<div class="tabs">' + [["up", "強化"], ["craft", "作成"], ["salvage", "分解"]].map(([k, n]) => '<button class="tab' + (smithTab === k ? " on" : "") + '" data-a="smithTab" data-v="' + k + '">' + n + "</button>").join("") + "</div>";
    let body = "";
    if (smithTab === "up") {
      const list = Object.keys(s.gear).sort((a, b) => D().RAR_KEYS.indexOf(s.gear[b].rar) - D().RAR_KEYS.indexOf(s.gear[a].rar) || s.gear[b].lv - s.gear[a].lv);
      body = '<p class="hint">強化の上限は <b>+' + max + "</b>（鍛冶場 Lv" + (s.fac.smith || 0) + "）。受付で鍛冶場を強化すると上がります。+8 からは星脈結晶が必要です。</p>" +
        (list.length ? '<div class="glist">' + list.map((u) => { const g = s.gear[u], gd = D().GEAR[g.id], c = enhCost(g); return '<div class="gi" style="--rc:' + D().RAR[g.rar].c + '">' + ic(D().SLOTS[gd.slot].ic, D().RAR[g.rar].c) + '<div class="gi-b"><b>' + esc(gd.nm) + ' <span class="plus">+' + g.lv + '</span> <span class="c-rar" style="--rc:' + D().RAR[g.rar].c + '">' + g.rar + "</span></b><small>" + esc(gearText(g)) + "</small>" + (g.lv < max ? '<small class="cost">' + costHTML(c) + "</small>" : "<small>上限</small>") + "</div>" + (g.lv < max ? '<button class="btn sm gold" data-a="enhance" data-v="' + u + '"' + (MA.Save.hasCost(c) ? "" : " disabled") + ">+" + (g.lv + 1) + "</button>" : "") + "</div>"; }).join("") + "</div>" : '<p class="empty">装備がありません。</p>');
    } else if (smithTab === "craft") {
      body = '<p class="hint">素材から装備を作ります（R）。星脈結晶を1つ足すと SR で作れます。共鳴の鍵になる装備もここで作れます。</p><div class="glist">' + CRAFT.map((r) => { const gd = D().GEAR[r.id]; const c2 = Object.assign({}, r.cost, { crystal: 1 }); return '<div class="gi" style="--rc:#5ab8ff">' + ic(D().SLOTS[gd.slot].ic, gd.el ? D().ELEM[gd.el].c : null) + '<div class="gi-b"><b>' + esc(gd.nm) + "</b><small>" + esc(r.d) + "・" + esc(gd.d) + '</small><small class="cost">' + costHTML(r.cost) + '</small></div><button class="btn sm" data-a="craft" data-v="' + r.id + '"' + (MA.Save.hasCost(r.cost) ? "" : " disabled") + '>R</button><button class="btn sm gold" data-a="craftSR" data-v="' + r.id + '"' + (MA.Save.hasCost(c2) ? "" : " disabled") + ">SR</button></div>"; }).join("") + "</div>";
    } else {
      const val = { N: 2, R: 5, SR: 12, SSR: 30, UR: 80 };
      const list = Object.keys(s.gear).filter((u) => !MA.Save.gearOwner(u));
      body = '<p class="hint">だれも装備していない装備を分解して魔石にします（N 2・R 5・SR 12・SSR 30・UR 80）。分解は元にもどせません。</p>' + (list.length ? '<div class="glist">' + list.map((u) => { const g = s.gear[u], gd = D().GEAR[g.id]; return '<div class="gi" style="--rc:' + D().RAR[g.rar].c + '">' + ic(D().SLOTS[gd.slot].ic, D().RAR[g.rar].c) + '<div class="gi-b"><b>' + esc(gd.nm) + (g.lv ? " +" + g.lv : "") + ' <span class="c-rar" style="--rc:' + D().RAR[g.rar].c + '">' + g.rar + "</span></b><small>魔石 ×" + (val[g.rar] + g.lv * 2) + '</small></div><button class="btn sm danger" data-a="salvage" data-v="' + u + '">分解</button></div>'; }).join("") + "</div>" : '<p class="empty">分解できる装備がありません（装備中のものは分解できません）。</p>');
    }
    return { html: head("hammer", "鍛冶屋", "鍛冶屋のガルド「いい素材、持ってきたか？」", "#ff8a3d") + tabs + body };
  };

  /* ── 魔導具店 ── */
  function shopStock() {
    const s = S(), day = MA.Save.today();
    if (s.shop.day === day && s.shop.stock.length) return s.shop.stock;
    const r = MA.Map.mkRng(Number(day.replace(/-/g, "")) * 7 + (s.shop.refresh || 0) * 101 + (s.fac.shop || 0));
    const lv = s.fac.shop || 0;
    const W = [[60, 35, 5, 0, 0], [45, 40, 13, 2, 0], [30, 42, 22, 6, 0], [18, 40, 30, 11, 1], [8, 35, 38, 17, 2], [0, 30, 45, 22, 3]][Math.min(5, lv)];
    const price = { N: 150, R: 400, SR: 1200, SSR: 3500, UR: 9000 };
    const stock = [];
    for (let i = 0; i < 6; i++) {
      let x = r() * 100, rar = "N"; for (let k = 0; k < 5; k++) { x -= W[k]; if (x <= 0) { rar = D().RAR_KEYS[k]; break; } }
      const id = D().GEAR_KEYS[Math.floor(r() * D().GEAR_KEYS.length)];
      stock.push({ id, rar, price: price[rar], sold: false });
    }
    if (s.shop.day !== day) s.shop.refresh = 0;
    s.shop.day = day; s.shop.stock = stock;
    MA.Save.saveSoon();
    return stock;
  }
  PANELS.shop = () => {
    const s = S(), st = shopStock();
    const gear = st.map((x, i) => { const gd = D().GEAR[x.id]; return '<div class="gi' + (x.sold ? " sold" : "") + '" style="--rc:' + D().RAR[x.rar].c + '">' + ic(D().SLOTS[gd.slot].ic, D().RAR[x.rar].c) + '<div class="gi-b"><b>' + esc(gd.nm) + ' <span class="c-rar" style="--rc:' + D().RAR[x.rar].c + '">' + x.rar + "</span>" + (gd.el ? ' <i class="el" style="--c:' + D().ELEM[gd.el].c + '">' + D().ELEM[gd.el].nm + "</i>" : "") + "</b><small>" + esc(gearText({ id: x.id, rar: x.rar, lv: 0 })) + "</small><small class='gd'>" + esc(gd.d) + "</small></div>" + (x.sold ? "<span class='gi-who'>売り切れ</span>" : '<button class="btn sm gold" data-a="buyGear" data-v="' + i + '"' + (s.gold >= x.price ? "" : " disabled") + ">" + ic("gold") + fmt(x.price) + "</button>") + "</div>"; }).join("");
    const items = Object.keys(D().SHOP_ITEMS).map((k) => { const it = D().SHOP_ITEMS[k]; const have = s.items[k] || 0; const full = it.max && have >= it.max; return '<div class="gi">' + ic(k === "reroll" ? "dice" : k === "banish" ? "sand" : k === "stonePack" ? "mat" : k, k === "stonePack" ? D().MATS.stone.c : null) + '<div class="gi-b"><b>' + esc(it.nm) + (it.max ? ' <span class="cnt">' + have + "/" + it.max + "</span>" : "") + "</b><small>" + esc(it.d) + '</small></div><button class="btn sm gold" data-a="buyItem" data-v="' + k + '"' + (s.gold >= it.price && !full ? "" : " disabled") + ">" + ic("gold") + fmt(it.price) + "</button></div>"; }).join("");
    const rc = 200 * ((s.shop.refresh || 0) + 1);
    return { html: head("shop", "魔導具店", "店主のミント「今日の品ぞろえはこちらです♪」（毎日入れかわり）", "#7fd0ff") +
      '<div class="pr-sec">装備（店 Lv' + (s.fac.shop || 0) + '）<button class="btn sm ghost" data-a="shopRefresh"' + (s.gold >= rc ? "" : " disabled") + ">入れかえ " + ic("gold") + fmt(rc) + '</button></div><div class="glist">' + gear + '</div><div class="pr-sec">道具</div><div class="glist">' + items + "</div>" };
  };

  /* ── 資料室：図鑑 ── */
  let codexTab = "chars";
  PANELS.codex = () => {
    const s = S(), cx = s.codex;
    const tabs = '<div class="tabs">' + [["chars", "キャラ"], ["en", "敵"], ["boss", "ボス"], ["wp", "武器"], ["mg", "魔法"], ["gear", "装備"], ["res", "星脈共鳴"], ["lore", "古文書"], ["story", "ストーリー"]].map(([k, n]) => '<button class="tab' + (codexTab === k ? " on" : "") + '" data-a="codexTab" data-v="' + k + '">' + n + "</button>").join("") + "</div>";
    let body = "", cnt = "";
    const card = (on, iconH, nm, d) => '<div class="cx' + (on ? "" : " no") + '">' + iconH + "<div><b>" + (on ? esc(nm) : "？？？") + "</b><small>" + (on ? d : "まだ見つけていません") + "</small></div></div>";
    if (codexTab === "chars") { body = D().CHAR_ORDER.map((id) => { const C = D().CHARS[id]; return card(true, '<img class="cx-img" src="../img/t_' + UI().imgName(id) + '.webp" alt="" loading="lazy">', C.nm, esc(C.fes + "・" + C.title + "・" + D().CTYPE[C.type].nm) + (MA.Save.owned(id) ? "" : "（未所持）")); }).join(""); }
    else if (codexTab === "en") { const keys = Object.keys(D().ENEMIES); cnt = keys.filter((k) => cx.en[k]).length + "/" + keys.length; body = keys.map((k) => { const e = D().ENEMIES[k]; return card(!!cx.en[k], '<span class="cx-sp" data-art="' + e.art + '" data-col="' + e.col + '"></span>', e.nm, "撃破 " + fmt(cx.en[k] || 0) + "・" + D().ELEM[e.el].nm + "属性・" + { chase: "追跡型", charge: "突進型", ranged: "遠距離型", summon: "召喚型", guard: "防御型", hex: "妨害型", elite: "エリート型", swarm: "群体" }[e.ai]); }).join(""); }
    else if (codexTab === "boss") { const keys = Object.keys(D().BOSSES); cnt = keys.filter((k) => cx.boss[k]).length + "/" + keys.length; body = keys.map((k) => { const b = D().BOSSES[k]; return card(!!cx.boss[k], '<span class="cx-sp" data-art="' + b.art + '"></span>', b.nm, "討伐 " + (cx.boss[k] || 0) + "回・" + esc(b.gim.nm) + "：" + esc(b.gim.d)); }).join(""); }
    else if (codexTab === "wp") { const keys = D().WEAPON_KEYS.concat(Object.keys(D().EVOS)); cnt = keys.filter((k) => cx.wp[k]).length + "/" + keys.length; body = keys.map((k) => { const w = D().WEAPONS[k] || D().EVOS[k]; return card(!!cx.wp[k], ic(D().WEAPONS[k] ? k : w.base, D().EVOS[k] ? "#ff6aa8" : null), w.nm, esc(w.d)); }).join(""); }
    else if (codexTab === "mg") { const keys = D().MAGIC_KEYS; cnt = keys.filter((k) => cx.mg[k]).length + "/" + keys.length; body = keys.map((k) => card(!!cx.mg[k], ic(k), D().MAGICS[k].nm, esc(D().ELEM[D().MAGICS[k].el].nm + "属性・" + D().MAGICS[k].d))).join(""); }
    else if (codexTab === "gear") { const keys = D().GEAR_KEYS; cnt = keys.filter((k) => cx.gear[k] != null).length + "/" + keys.length; body = keys.map((k) => { const g = D().GEAR[k]; return card(cx.gear[k] != null, ic(D().SLOTS[g.slot].ic, cx.gear[k] != null ? D().RAR[D().RAR_KEYS[cx.gear[k]]].c : null), g.nm, esc(D().SLOTS[g.slot].nm + "・" + g.d) + (cx.gear[k] != null ? "（最高 " + D().RAR_KEYS[cx.gear[k]] + "）" : "")); }).join(""); }
    else if (codexTab === "res") { const keys = D().RESONANCES; cnt = keys.filter((r) => cx.res[r.id]).length + "/" + keys.length; body = keys.map((r) => card(!!cx.res[r.id], ic("star", r.c), r.nm, esc(r.d) + "<br><i>条件：" + esc(r.req.map((alts) => alts.map(tagName).join(" または ")).join(" ＋ ")) + "</i>（発動 " + (cx.res[r.id] || 0) + "回）")).join(""); }
    else if (codexTab === "lore") { cnt = D().LORE.filter((l) => cx.lore[l.id]).length + "/" + D().LORE.length; body = D().LORE.map((l) => card(!!cx.lore[l.id], ic("scroll"), l.nm, esc(l.d))).join(""); }
    else if (codexTab === "story") { body = D().STORY.map((st) => '<div class="cx' + (cx.story[st.id] ? "" : " no") + '">' + ic("book") + "<div><b>" + (cx.story[st.id] ? esc(st.nm) : "？？？") + "</b><small>" + (cx.story[st.id] ? '<button class="btn sm" data-a="story" data-v="' + st.id + '">もう一度読む</button>' : st.at ? esc(D().DUN[st.at].nm) + "をクリアすると読めます" : "") + "</small></div></div>").join(""); }
    return { html: head("book", "資料室：図鑑", cnt ? "発見 " + cnt : "", "#e8d080") + tabs + '<div class="codex">' + body + "</div>", after: (m) => { m.querySelectorAll(".cx-sp").forEach((el) => { const s2 = MA.Art.sprite(el.dataset.art, el.dataset.col || undefined); const f = s2.frames[0]; const c = MA.Pix.mkCanvas(f.width, f.height); c.getContext("2d").drawImage(f, 0, 0); c.className = "pxc"; if (el.closest(".no")) c.style.filter = "brightness(0)"; el.appendChild(c); }); } };
  };
  function tagName(t) {
    const p = t.split(":");
    if (p[0] === "weapon") return (p[2] ? D().ELEM[p[2]].nm + "の" : "") + D().WEAPONS[p[1]].nm;
    if (p[0] === "magic") return "魔法「" + D().MAGICS[p[1]].nm + "」";
    if (p[0] === "equip") { const g = D().GEAR[p[2]] || Object.values(D().GEAR).find((x) => x.tag === p[2]); return "装備「" + (g ? g.nm : p[2]) + "」"; }
    if (p[0] === "seal") return D().ELEM[p[1]].nm + "の刻印";
    if (p[0] === "stat") return "能力「" + D().STATS[p[1]].nm + "」";
    if (p[0] === "char") return D().CHARS[p[1]].nm;
    if (p[0] === "count") return { weapon: "武器", magic: "魔法", el: "属性" }[p[1]] + p[2] + "種類";
    if (p[0] === "el") return D().ELEM[p[1]].nm + "属性";
    return t;
  }

  /* ── 協会掲示：ミッション・実績 ── */
  let misTab = "mis";
  PANELS.missions = () => {
    const s = S(); MA.Save.rollMissions();
    const tabs = '<div class="tabs"><button class="tab' + (misTab === "mis" ? " on" : "") + '" data-a="misTab" data-v="mis">ミッション</button><button class="tab' + (misTab === "ach" ? " on" : "") + '" data-a="misTab" data-v="ach">実績</button></div>';
    let body = "";
    if (misTab === "mis") {
      const row = (m, prog, done, kind) => { const v = Math.min(m.n, prog[m.key] || 0); const ok = v >= m.n; return '<div class="mis' + (done ? " done" : ok ? " ok" : "") + '"><div><b>' + esc(m.nm) + "</b><small>報酬：" + esc(MA.Prog.rwText(m.rw)) + '</small><span class="mbar"><i style="width:' + (v / m.n * 100) + '%"></i><em>' + fmt(v) + "/" + fmt(m.n) + "</em></span></div>" + (done ? "<span class='gi-who'>受取ずみ</span>" : '<button class="btn sm gold" data-a="claimMis" data-v="' + kind + ":" + m.id + '"' + (ok ? "" : " disabled") + ">受け取る</button>") + "</div>"; };
      body = '<div class="pr-sec">毎日（' + esc(s.mis.day) + "）</div>" + D().MISSIONS.daily.map((m) => row(m, s.mis.d, s.mis.dc[m.id], "d")).join("") +
        '<div class="pr-sec">毎週（' + esc(s.mis.week) + "）</div>" + D().MISSIONS.weekly.map((m) => row(m, s.mis.w, s.mis.wc[m.id], "w")).join("");
    } else {
      body = '<div class="pr-sec">達成 ' + Object.keys(s.ach).length + "/" + D().ACH.length + "（達成すると報酬は自動で受け取ります）</div>" + D().ACH.map((a) => '<div class="mis' + (s.ach[a.id] ? " done" : "") + '">' + ic("trophy", s.ach[a.id] ? "#ffd84a" : "#666") + "<div><b>" + esc(a.nm) + "</b><small>" + esc(a.d) + "・報酬：" + esc(MA.Prog.rwText(a.rw)) + "</small></div>" + (s.ach[a.id] ? "<span class='gi-who'>達成</span>" : "") + "</div>").join("");
    }
    return { html: head("mission", "協会掲示", "冒険者協会からの依頼と記録", "#4fe39a") + tabs + body };
  };

  /* ── 深淵の門 ── */
  PANELS.abyss = () => {
    const s = S();
    const open = !!(s.dun.d3 && s.dun.d3.clears);
    const cid = s.sel, C = D().CHARS[cid];
    const rec = s.abyss.record.slice(0, 5).map((r) => "<li>" + r.f + "階　" + esc(D().CHARS[r.c] ? D().CHARS[r.c].nm : r.c) + "　" + fmtT(r.t) + "</li>").join("") || "<li>まだ記録がありません</li>";
    const html = head("abyss", "深淵の門：深淵踏破", "すべてのアビスの底へつづく連続攻略", "#a874ff") +
      (open ? '<div class="abyss"><p>階層が進むほど敵が強くなる連続攻略です。<br>・敵の編成はランダム（6つの迷宮から）<br>・階ごとに<b>特殊ルール</b>（魔力暴走・暗黒・強敵・疾風・硝子の体・飢餓・豊穣）<br>・<b>5階ごとに階層ボス</b><br>・敵を規定数倒すと下への門が開く。HPは階をまたいで少しだけ回復<br>・10階ごとに初めて到達すると XEVARION ジェム×5、深淵の欠片・星脈結晶</p>' +
        '<div class="dd-grid"><div><small>最高記録</small><b>' + (s.abyss.best || 0) + "階</b><i>" + esc(s.abyss.bestChar ? D().CHARS[s.abyss.bestChar].nm : "") + "</i></div><div><small>挑戦</small><b>" + (s.abyss.runs || 0) + '回</b></div></div><div class="pr-sec">最近の記録</div><ul class="dd-rules">' + rec + "</ul>" +
        '<div class="pr-char"><img src="../img/t_' + UI().imgName(cid) + '.webp" alt=""><div><b>' + esc(C.nm) + "</b><span>Lv." + MA.Save.lvOf(cid) + '</span><button class="btn sm" data-a="fac" data-v="chars">キャラを変える</button></div></div>' +
        '<button class="btn gold big" data-a="goAbyss">' + ic("abyss") + "深淵へ降りる</button></div>"
        : '<div class="locked">' + ic("lock") + "「紅蓮の熔岩城」をクリアすると、ギルドの地下に深淵の門が開きます</div>");
    return { html };
  };

  /* ── 受付：ストーリー・施設強化・遊び方 ── */
  PANELS.reception = () => {
    const s = S();
    const fac = Object.keys(D().FACILITIES).map((k) => {
      const F = D().FACILITIES[k], lv = s.fac[k] || 0, max = lv >= F.max;
      const c = max ? null : F.cost(lv);
      return '<div class="gi">' + ic({ smith: "hammer", shop: "shop", tavern: "person", train: "attack", chapel: "revive", archive: "book" }[k]) + '<div class="gi-b"><b>' + esc(F.nm) + ' <span class="cnt">Lv' + lv + "/" + F.max + "</span></b><small>いま：" + esc(F.d(lv)) + (max ? "" : "<br>次：" + esc(F.d(lv + 1))) + "</small>" + (c ? '<small class="cost">' + costHTML(c) + "</small>" : "") + "</div>" + (max ? "<span class='gi-who'>最大</span>" : '<button class="btn sm gold" data-a="facUp" data-v="' + k + '"' + (MA.Save.hasCost(c) ? "" : " disabled") + ">強化</button>") + "</div>";
    }).join("");
    const story = D().STORY.map((st) => '<div class="mis' + (s.codex.story[st.id] ? "" : " no") + '">' + ic("book") + "<div><b>" + (s.codex.story[st.id] ? esc(st.nm) : "？？？") + "</b><small>" + (st.at ? esc(D().DUN[st.at].nm) + "のあと" : "はじまり") + "</small></div>" + (s.codex.story[st.id] ? '<button class="btn sm" data-a="story" data-v="' + st.id + '">読む</button>' : "") + "</div>").join("");
    const howto = '<ul class="howto"><li><b>移動</b>：WASD／方向キー（スマホは左下のスティック）</li><li><b>攻撃</b>：自動（設定で手動に変更可）。マウスの方向・近い敵・移動方向へ</li><li><b>Q</b> 固有スキル／<b>E</b> 星脈解放（MP40）／<b>R</b> 必殺技（ゲージ100%）</li><li><b>Space</b> 回避（無敵）／<b>Tab</b> 地図／<b>Esc</b> メニュー／<b>F</b> 調べる</li><li>敵を倒すと経験値の結晶。レベルアップで能力を1つ選ぶ（引き直し・とばすもできる）</li><li>武器 Lv7 ＋ 条件の能力 Lv2 で<b>進化</b>。キャラごとの<b>専用進化</b>もある</li><li>武器・魔法・装備・キャラの組み合わせで<b>星脈共鳴</b>が発動する（図鑑で条件を確認）</li><li>鍵を3つ集めるとボスの扉が開く（中ボス・試練の魔法陣・宝物庫・祭壇・時間制限区域）</li><li>ボスのまわりのギミックを全部こわす（踏む）と <b>BREAK</b>：6秒止まってダメージ2倍</li></ul>';
    return { html: head("person", "受付", "ギルドマスター ラウラ「おかえりなさい。今日はどうする？」", "#ff8fd0") +
      '<div class="pr-sec">拠点施設の強化</div><div class="glist">' + fac + '</div><div class="pr-sec">ストーリー</div>' + story + '<div class="pr-sec">遊び方</div>' + howto };
  };

  /* ── 設定 ── */
  PANELS.settings = () => {
    const st = S().set;
    const seg = (k, opts) => '<div class="seg">' + opts.map(([v, n]) => '<button class="' + (String(st[k]) === String(v) ? "on" : "") + '" data-a="setv" data-v="' + k + '" data-x="' + v + '">' + esc(n) + "</button>").join("") + "</div>";
    const html = head("gear", "設定", "", "#c8c8d8") + '<div class="sets">' +
      '<label>BGM の音量<input type="range" min="0" max="1" step="0.05" value="' + st.bgm + '" data-in="bgm"></label>' +
      '<label>効果音の音量<input type="range" min="0" max="1" step="0.05" value="' + st.se + '" data-in="se"></label>' +
      "<div><span>攻撃の方向</span>" + seg("aim", [["auto", "自動（マウス／近い敵）"], ["mouse", "マウス照準"], ["move", "移動方向"]]) + "</div>" +
      "<div><span>通常攻撃</span>" + seg("autoAtk", [[true, "自動で撃つ"], [false, "押しているあいだ"]]) + "</div>" +
      "<div><span>ダメージの数字</span>" + seg("dmgNum", [[true, "出す"], [false, "出さない"]]) + "</div>" +
      "<div><span>画面のゆれ</span>" + seg("shake", [[true, "あり"], [false, "なし"]]) + "</div>" +
      "<div><span>敵の最大数（重いときは少なく）</span>" + seg("maxEnemies", [[30, "30"], [45, "45"], [60, "60"], [80, "80"]]) + "</div>" +
      "<div><span>画面の大きさ</span>" + seg("zoom", [["near", "大きく"], ["auto", "ふつう"], ["far", "広く"]]) + "</div>" +
      "<div><span>スマホのスティック</span>" + seg("stickSide", [["left", "左"], ["right", "右"]]) + "</div>" +
      "<div><span>振動</span>" + seg("vib", [[true, "あり"], [false, "なし"]]) + "</div>" +
      "<div><span>FPS 表示</span>" + seg("fps", [[false, "なし"], [true, "あり"]]) + "</div>" +
      '</div><div class="row c"><button class="btn" data-a="panel" data-v="data">' + ic("save") + "セーブデータ管理</button></div>";
    return { html, wide: false };
  };
  /* ── セーブデータ管理 ── */
  PANELS.data = () => {
    const inf = MA.Save.info();
    const s = S();
    const html = head("save", "セーブデータ管理", "このアプリのセーブ（magiabyss_v1）", "#5ab8ff") +
      '<div class="dd-grid"><div><small>作成</small><b>' + new Date(inf.created || Date.now()).toLocaleDateString() + "</b></div><div><small>最終保存</small><b>" + new Date(inf.updated || Date.now()).toLocaleString() + "</b></div><div><small>大きさ</small><b>" + (inf.size / 1024).toFixed(1) + "KB</b></div><div><small>バックアップ</small><b>" + (inf.bak ? "あり" : "なし") + "</b></div></div>" +
      '<div class="dd-grid"><div><small>プレイ時間</small><b>' + Math.floor((s.stats.playSec || 0) / 3600) + "時間" + Math.floor((s.stats.playSec || 0) % 3600 / 60) + "分</b></div><div><small>探索</small><b>" + fmt(s.stats.runs) + "回</b></div><div><small>撃破</small><b>" + fmt(s.stats.kills) + "</b></div><div><small>最終プレイ</small><b>" + (s.last ? esc((s.last.dun ? D().DUN[s.last.dun].nm : "深淵踏破 " + s.last.floor + "階") + "・" + { clear: "クリア", defeat: "敗北", retreat: "帰還" }[s.last.result]) : "—") + "</b></div></div>" +
      '<p class="hint">所持キャラと凸は XEVARION のアカウントと共通です（ここでは消えません）。ログインしていれば、このセーブも XEVARION のアカウントに同期されます。</p>' +
      '<div class="col"><button class="btn" data-a="dataSave">' + ic("save") + 'いますぐ保存</button><button class="btn" data-a="dataExport">' + ic("scroll") + 'データを書き出す（コピー・ファイル）</button><button class="btn" data-a="dataImport">' + ic("book") + 'データを読み込む</button><button class="btn ghost" data-a="dataBackup">' + ic("back") + 'ひとつ前のバックアップに戻す</button><button class="btn danger" data-a="dataReset">' + ic("close") + "はじめからにする</button></div>" +
      '<textarea id="dataTxt" class="datatx" hidden spellcheck="false"></textarea><div class="row c" id="dataIO" hidden><button class="btn sm" data-a="dataCopy">コピー</button><button class="btn sm" data-a="dataFile">ファイルに保存</button><label class="btn sm">ファイルから<input type="file" accept=".json,application/json" data-in="file" hidden></label><button class="btn sm gold" data-a="dataLoad">この内容を読み込む</button></div>';
    return { html, wide: false };
  };

  /* ══ ストーリー（会話）══ */
  function playStory(id) {
    const st = D().STORY.find((x) => x.id === id); if (!st) return;
    S().codex.story[id] = 1; MA.Save.saveSoon();
    let i = 0;
    const m = UI().modal('<div class="story"><div class="st-h">' + esc(st.nm) + '</div><div class="st-box"><b class="st-who"></b><p class="st-line"></p></div><div class="row c"><button class="btn ghost sm" data-a="storySkip">とばす</button><button class="btn gold" data-a="storyNext">つぎへ</button></div></div>', { cls: "stm", noClose: true });
    const show = () => { const L = st.lines[i]; $(".st-who", m).textContent = L[0]; $(".st-line", m).textContent = L[1]; $("[data-a=storyNext]", m).textContent = i >= st.lines.length - 1 ? "とじる" : "つぎへ"; };
    m._next = () => { i++; if (i >= st.lines.length) { UI().closeModal(); checkResume(); return; } show(); };
    show();
  }

  /* ══ 中断した探索 ══ */
  function checkResume() {
    const run = MA.Save.loadRun();
    if (!run || UI().topModal()) return;
    const where = run.mode === "abyss" ? "深淵踏破 " + run.floor + "階" : (D().DUN[run.dun] ? D().DUN[run.dun].nm : "迷宮");
    const m = UI().modal('<div class="evt"><div class="ev-h">' + ic("door") + '<b>中断した探索があります</b></div><p class="ev-d">' + esc(where) + "・" + esc(D().CHARS[run.cid] ? D().CHARS[run.cid].nm : run.cid) + "・" + fmtT(run.t) + "（Lv." + (run.P && run.P.lv) + "・撃破 " + fmt(run.stats && run.stats.kills) + "）<br>つづきから再開できます。あきらめる場合は、手に入れたゴールドと素材の半分・装備を受け取ります。<br><small>※敵の配置は再開時に新しくなります</small></p>" +
      '<div class="row c"><button class="btn ghost" data-a="resumeGiveUp">あきらめる</button><button class="btn gold" data-a="resumeRun">再開する</button></div></div>', { cls: "evm", noClose: true });
    m._run = run;
  }

  /* ══ 探索を始める ══ */
  function startRun(cfg) {
    const s = S();
    leave();
    UI().closeModal(true);
    UI().scr("run");
    MA.Input.enabled = true;
    MA.Input.clearAll();
    MA.Save.save();
    const trial = !MA.Save.owned(cfg.cid);
    MA.Render.init($("#gc"));
    MA.E.start({ mode: cfg.mode, dun: cfg.dun, cid: cfg.cid, muts: cfg.muts || [], trial, resume: cfg.resume, seed: cfg.seed, floor: cfg.floor });
    MA.UI.buildHud();
    void s;
  }

  /* ══════════════════════════════════════════════════════════════
     タイトル
     ══════════════════════════════════════════════════════════════ */
  function title() {
    UI().scr("title");
    MA.Input.enabled = false;
    const s = S();
    $("#title").innerHTML = '<div class="tt-bg"></div><div class="tt-art"></div><div class="tt-shade"></div>' +
      '<div class="tt-in">' +
      '<div class="tt-tap" id="ttTap">TAP TO START</div>' +
      '<div class="tt-menu" id="ttMenu" hidden>' +
      '<button class="sign" data-a="ttStart">' + (s.stats.runs ? "冒険をつづける" : "冒険をはじめる") + '</button><button class="sign" data-a="panel" data-v="settings">設定</button><button class="sign" data-a="panel" data-v="data">データ管理</button><a class="sign" href="../index.html">XEVARION へ戻る</a></div></div>' +
      '<div class="tt-ver">MagiAbyss Ver.1.0　' + (MA.Save.note ? '<b class="warn">' + esc(MA.Save.note) + "</b>" : "") + "</div>";
    const go = () => { MA.Audio.unlock(); MA.Audio.setVol(s.set.bgm, s.set.se); MA.Audio.bgm("title"); $("#ttTap").hidden = true; $("#ttMenu").hidden = false; $("#title").removeEventListener("pointerdown", go); };
    $("#title").addEventListener("pointerdown", go);
    window.addEventListener("keydown", function k(e) { if (document.body.dataset.scr === "title" && (e.key === "Enter" || e.key === " ")) { go(); window.removeEventListener("keydown", k); } });
  }

  /* ══ ボタン（data-a）の受け口 ══ */
  const A = MA.UI.ACT;
  A.fac = (el) => openPanel(el.dataset.v);
  A.panel = (el) => openPanel(el.dataset.v, el.dataset.x);
  A.ttStart = () => { enter(); };
  A.toTitle = () => { leave(); title(); };
  A.selDun = (el) => { selDun = el.dataset.v; refreshTop(); };
  A.prep = (el) => { prepMuts = []; openPanel("prep", el.dataset.v); };
  A.togMut = (el) => { const k = el.dataset.v; const i = prepMuts.indexOf(k); if (i >= 0) prepMuts.splice(i, 1); else prepMuts.push(k); refreshTop(); };
  A.go = (el) => { startRun({ mode: "dungeon", dun: el.dataset.v, cid: S().sel, muts: prepMuts.slice() }); };
  A.goAbyss = () => { startRun({ mode: "abyss", cid: S().sel }); };
  A.charFilter = (el) => { charFilter = el.dataset.v; refreshTop(); };
  A.charDet = (el) => openPanel("charDet", el.dataset.v);
  A.selChar = (el) => { S().sel = el.dataset.v; MA.Save.saveSoon(); MA.Audio.sfx("key"); UI().toast(D().CHARS[el.dataset.v].nm + " を出発キャラにしました", "#ffd84a"); refreshTop(); renderTop(); };
  A.treeOf = (el) => openPanel("tree", el.dataset.v);
  A.learn = (el) => { const id = el.dataset.c, n = D().TREE.find((x) => x.id === el.dataset.v); const sp = MA.Save.spOf(id); if (!n || sp.left < n.cost) return; MA.Save.charRec(id).tree[n.id] = 1; MA.Save.save(); MA.Audio.sfx("levelup"); refreshTop(); };
  A.treeReset = (el) => { const id = el.dataset.v; UI().ask("スキルツリーをふりなおしますか？（500G）", () => { if (!MA.Save.payCost({ gold: 500 })) { UI().toast("ゴールドが足りません", "#ff5a6a"); return; } MA.Save.charRec(id).tree = {}; MA.Save.save(); refreshTop(); }); };
  A.storTab = (el) => { storTab = el.dataset.v; refreshTop(); };
  A.storSlot = (el) => { storSlot = el.dataset.v; refreshTop(); };
  A.equip = (el) => { const m = UI().topModal(); const cid = (m && m._arg) || S().sel; if (!MA.Save.owned(cid)) { UI().toast("未所持のキャラは装備できません", "#ff5a6a"); return; } MA.Save.equip(cid, el.dataset.v); S().gear[el.dataset.v].nw = 0; MA.Save.save(); MA.Audio.sfx("key"); refreshTop(); };
  A.unequip = (el) => { const m = UI().topModal(); const cid = (m && m._arg) || S().sel; MA.Save.unequip(cid, el.dataset.v); MA.Save.save(); refreshTop(); };
  A.smithTab = (el) => { smithTab = el.dataset.v; refreshTop(); };
  A.enhance = (el) => { const g = S().gear[el.dataset.v]; if (!g) return; const max = 2 + (S().fac.smith || 0) * 2; if (g.lv >= max) return; if (!MA.Save.payCost(enhCost(g))) return; g.lv++; MA.Audio.sfx("chest"); UI().toast(D().GEAR[g.id].nm + " +" + g.lv + " に強化！", "#ffd84a"); if (g.lv >= 10) MA.Prog.unlock("plus10"); MA.Save.save(); refreshTop(); };
  A.craft = (el) => { const r = CRAFT.find((x) => x.id === el.dataset.v); if (!r || !MA.Save.payCost(r.cost)) return; MA.Save.newGear(r.id, "R"); MA.Audio.sfx("chest"); UI().toast(D().GEAR[r.id].nm + "（R）を作った！", "#5ab8ff"); MA.Save.save(); refreshTop(); };
  A.craftSR = (el) => { const r = CRAFT.find((x) => x.id === el.dataset.v); if (!r) return; const c = Object.assign({}, r.cost, { crystal: 1 }); if (!MA.Save.payCost(c)) return; MA.Save.newGear(r.id, "SR"); MA.Audio.sfx("chest"); UI().toast(D().GEAR[r.id].nm + "（SR）を作った！", "#c27bff"); MA.Save.save(); refreshTop(); };
  A.salvage = (el) => { const u = el.dataset.v, g = S().gear[u]; if (!g || MA.Save.gearOwner(u)) return; UI().ask(D().GEAR[g.id].nm + "（" + g.rar + "）を分解しますか？", () => { const val = { N: 2, R: 5, SR: 12, SSR: 30, UR: 80 }[g.rar] + g.lv * 2; delete S().gear[u]; MA.Save.addMat("stone", val); MA.Save.save(); UI().toast("魔石 ×" + val + " を手に入れた", "#9ab0ff"); refreshTop(); }, { yes: "分解する", danger: 1 }); };
  A.buyGear = (el) => { const st = shopStock(); const x = st[+el.dataset.v]; if (!x || x.sold || !MA.Save.payCost({ gold: x.price })) return; x.sold = true; MA.Save.newGear(x.id, x.rar); if (x.rar === "SSR" || x.rar === "UR") MA.Prog.unlock("ssr"); if (x.rar === "UR") MA.Prog.unlock("ur"); MA.Audio.sfx("coin"); UI().toast(D().GEAR[x.id].nm + "（" + x.rar + "）を買った", "#ffd84a"); MA.Save.save(); refreshTop(); };
  A.buyItem = (el) => { const k = el.dataset.v, it = D().SHOP_ITEMS[k]; if (it.max && (S().items[k] || 0) >= it.max) return; if (!MA.Save.payCost({ gold: it.price })) return; if (it.give) Object.keys(it.give).forEach((m) => MA.Save.addMat(m, it.give[m])); else S().items[k] = (S().items[k] || 0) + 1; MA.Audio.sfx("coin"); MA.Save.save(); refreshTop(); };
  A.shopRefresh = () => { const s = S(); const rc = 200 * ((s.shop.refresh || 0) + 1); if (!MA.Save.payCost({ gold: rc })) return; s.shop.refresh = (s.shop.refresh || 0) + 1; s.shop.stock = []; shopStock(); MA.Save.save(); refreshTop(); };
  A.codexTab = (el) => { codexTab = el.dataset.v; refreshTop(); };
  A.misTab = (el) => { misTab = el.dataset.v; refreshTop(); };
  A.claimMis = (el) => { const [kind, id] = el.dataset.v.split(":"); const s = S(); const list = kind === "d" ? D().MISSIONS.daily : D().MISSIONS.weekly; const m = list.find((x) => x.id === id); const prog = kind === "d" ? s.mis.d : s.mis.w; const done = kind === "d" ? s.mis.dc : s.mis.wc; if (!m || done[id] || (prog[m.key] || 0) < m.n) return; done[id] = Date.now(); Object.keys(m.rw).forEach((k) => MA.Save.addMat(k, m.rw[k])); MA.Audio.sfx("key"); UI().toast("ミッション報酬：" + MA.Prog.rwText(m.rw), "#4fe39a"); MA.Save.save(); refreshTop(); };
  A.facUp = (el) => { const k = el.dataset.v, F = D().FACILITIES[k], lv = S().fac[k] || 0; if (lv >= F.max) return; if (!MA.Save.payCost(F.cost(lv))) return; S().fac[k] = lv + 1; MA.Audio.sfx("levelup"); UI().toast(F.nm + " を Lv" + (lv + 1) + " にした", "#ffd84a"); MA.Save.save(); refreshTop(); };
  A.story = (el) => { UI().closeModal(); playStory(el.dataset.v); };
  A.storyNext = (el) => { const m = el.closest(".mdl"); m._next && m._next(); };
  A.storySkip = () => { UI().closeModal(); checkResume(); };
  A.resumeRun = (el) => { const m = el.closest(".mdl"); const run = m._run; UI().closeModal(); startRun({ mode: run.mode, dun: run.dun, cid: run.cid, muts: run.muts, seed: run.seed, floor: run.floor, resume: run }); };
  A.resumeGiveUp = (el) => { const m = el.closest(".mdl"); const run = m._run; UI().closeModal(); const out = MA.Prog.settleAbandoned(run); UI().toast("中断した探索を受け取りました：" + fmt(out.gold) + "G" + Object.keys(out.mats).map((k) => "・" + D().MATS[k].nm + "×" + out.mats[k]).join(""), "#8affc4"); renderTop(); };
  A.setv = (el) => { const k = el.dataset.v; let v = el.dataset.x; if (v === "true") v = true; else if (v === "false") v = false; else if (!isNaN(+v) && v !== "") v = +v; S().set[k] = v; MA.Save.saveSoon(); if (k === "zoom") { MA.Render.resize(); resizeHub(); } if (k === "stickSide") document.body.classList.toggle("stick-right", v === "right"); refreshTop(); };
  A.dataSave = () => { UI().toast(MA.Save.save() ? "保存しました" : "保存できませんでした", "#5ab8ff"); };
  A.dataExport = () => { const t = $("#dataTxt"); t.hidden = false; $("#dataIO").hidden = false; t.value = MA.Save.exportText(); t.select(); };
  A.dataImport = () => { const t = $("#dataTxt"); t.hidden = false; $("#dataIO").hidden = false; t.value = ""; t.placeholder = "書き出したデータをここに貼りつけて「この内容を読み込む」"; t.focus(); };
  A.dataCopy = () => { const t = $("#dataTxt"); t.select(); try { navigator.clipboard.writeText(t.value).then(() => UI().toast("コピーしました", "#5ab8ff"), () => { document.execCommand("copy"); UI().toast("コピーしました", "#5ab8ff"); }); } catch (e) { try { document.execCommand("copy"); UI().toast("コピーしました", "#5ab8ff"); } catch (e2) {} } };
  A.dataFile = () => { const blob = new Blob([MA.Save.exportText()], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "MagiAbyss-save-" + MA.Save.today() + ".json"; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); };
  A.dataLoad = () => { const t = $("#dataTxt"); UI().ask("いまのセーブを、この内容で置きかえますか？（いまのセーブはバックアップに残ります）", () => { const r = MA.Save.importText(t.value); UI().toast(r.msg, r.ok ? "#8affc4" : "#ff5a6a"); if (r.ok) { UI().closeModal(true); renderTop(); } }, { yes: "読み込む" }); };
  A.dataBackup = () => { UI().ask("ひとつ前のバックアップに戻しますか？", () => { const r = MA.Save.restoreBackup(); UI().toast(r.msg, r.ok ? "#8affc4" : "#ff5a6a"); if (r.ok) { UI().closeModal(true); renderTop(); } }); };
  A.dataReset = () => { UI().ask("このアプリのセーブをはじめからにしますか？<br><small>（レベル・装備・素材・記録が消えます。キャラの所持と凸は XEVARION のものなので消えません）</small>", () => { UI().ask("本当に消しますか？ 元にもどせません（ひとつ前はバックアップに残ります）", () => { MA.Save.reset(); UI().closeModal(true); UI().toast("はじめからにしました", "#ff5a6a"); title(); }, { yes: "消す", danger: 1 }); }, { yes: "つぎへ", danger: 1 }); };
  /* スライダー・ファイル・選択 */
  document.addEventListener("input", (e) => {
    const k = e.target.dataset && e.target.dataset.in;
    if (k === "bgm" || k === "se") { S().set[k] = +e.target.value; MA.Audio.setVol(S().set.bgm, S().set.se); MA.Save.saveSoon(); }
  });
  document.addEventListener("change", (e) => {
    const k = e.target.dataset && e.target.dataset.in;
    if (k === "file") { const f = e.target.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { $("#dataTxt").value = rd.result; UI().toast("ファイルを読みました。「この内容を読み込む」で反映します", "#5ab8ff"); }; rd.readAsText(f); }
    if (e.target.dataset && e.target.dataset.a === "storChar") { storChar = e.target.value; refreshTop(); }
  });

  MA.Guild = { enter, leave, title, startRun, playStory, openPanel, renderTop, FAC, checkResume, GS, npcSprite };
})();
