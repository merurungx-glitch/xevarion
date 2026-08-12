/* ============================================================
   MagiResonance — 2Dワールドホーム「共鳴都市オルディネ」
   昔の王道RPG風: タイルマップの町を歩き、建物に入ると各機能が開く。
   ・十字キー(画面Dパッド/矢印/WASD)で移動、Aボタン(または前方タップ)で調べる
   ・建物のドアに乗ると対応ビューへ / 南の出口=探索 / 祭壇=ガチャ
   ・NPC=所持Echoが町を散歩、話しかけるとひとこと
   window.World として公開。game.js から start/stop される。
   ============================================================ */
"use strict";

const World = (() => {
  const MW = 24, MH = 16;      // マップサイズ(タイル)
  const STEP_T = 0.16;         // 1歩の秒数

  /* ── 建物(本体は通行不可・ドアで各機能へ) ── */
  const BUILDINGS = [
    { x: 9,  y: 1,  w: 6, h: 3, door: { x: 11, y: 3 },  ic: "🏰", label: "アステルナじょう",   view: "story",     roof: "#e8c03f", body: "#6b6478" },
    { x: 6,  y: 1,  w: 3, h: 3, door: { x: 7,  y: 3 },  ic: "🛏️", label: "やどや",             view: "inn",       roof: "#e85f8f", body: "#6b5a44" },
    { x: 15, y: 1,  w: 3, h: 3, door: { x: 16, y: 3 },  ic: "⚔️", label: "ぶきとぼうぐ",       view: "shop", tab: "w", roof: "#8f9fb8", body: "#5c5648" },
    { x: 2,  y: 3,  w: 4, h: 3, door: { x: 3,  y: 5 },  ic: "🍺", label: "なかまのさかば",     view: "party",     roof: "#3fa0e8", body: "#6b5a44" },
    { x: 18, y: 3,  w: 4, h: 3, door: { x: 19, y: 5 },  ic: "📚", label: "だいとしょかん",     view: "dex",       roof: "#e8a03f", body: "#6b5a44" },
    { x: 6,  y: 9,  w: 3, h: 2, door: { x: 7,  y: 10 }, ic: "🎒", label: "どうぐや",           view: "shop", tab: "i", roof: "#3fd68f", body: "#5c5648" },
    { x: 2,  y: 9,  w: 3, h: 4, door: { x: 3,  y: 12 }, ic: "🗼", label: "しれんのとう",       view: "challenge", roof: "#8f79ff", body: "#4a4560", tower: true },
    { x: 18, y: 9,  w: 4, h: 3, door: { x: 19, y: 11 }, ic: "⚔", label: "かくとうじょう",     view: "arena",     roof: "#e85f5f", body: "#6b4a44" },
    { x: 14, y: 10, w: 3, h: 2, door: { x: 15, y: 11 }, ic: "✨", label: "しょうかんのほこら", href: "../gacha.html", roof: "#ff6fd8", body: "#5c4460" },
  ];
  /* ── 調べるオブジェクト(隣接+A) ── */
  const PROPS = [
    { x: 10, y: 10, ic: "🪧", label: "クエストけいじばん", kind: "board" },
    { x: 9,  y: 7,  ic: "⛲", label: "いのちのいずみ",     kind: "fountain" },
    { x: 16, y: 6,  ic: "🔮", label: "オーブのだい",       kind: "orb" },
  ];
  const EXIT_S = [{ x: 11, y: 15 }, { x: 12, y: 15 }]; // みなみのもり=たんけん

  /* ── NPCのセリフ ── */
  const NPC_LINES = [
    "「ここは アステルナの じょうかまち。\n　ゆっくりしていってね！」",
    "「みなみのもりに まものが ふえてるんだって。\n　たんけんは きをつけてね」",
    "「かくとうじょうで うでだめし しない？\n　わたし けっこう つよいよ？」",
    "「しれんのとう、うえのかいから へんなおとが…\n　……きになる」",
    "「いずみに コインを なげると\n　いいことが あるらしいよ」",
    "「ほこらで あたらしい なかまと であえるんだって。\n　XEVAは もった？」",
    "「そうびを かうなら ぶきやさん。\n　つよい ぶきは たかいけどね！」",
    "「つかれたら やどやで やすむといいよ。\n　HPも MPも ぜんかいふくく〜！」",
  ];
  const GUIDE_LINES = [
    "「ようこそ アステルナの じょうかまちへ！\n　きたの おしろで おうさまが まっておるぞ」",
    "「にしの さかばで なかまを あつめ\n　ひがしの としょかんで ずかんが みられる」",
    "「たたかうまえに ぶきやで そうびを ととのえ\n　つかれたら やどやで やすむのじゃ」",
    "「みなみのもりを ぬけると たんけんエリアじゃ。\n　ぜんめつすると しょじきんが はんぶんに…！」",
  ];

  /* ── 状態 ── */
  let cv = null, cx = null, raf = 0, running = false;
  let cb = {};              // { openView, openHref, dialog, save, state }
  let T = [];               // terrain grid
  let solid = [];           // 通行判定
  let doorAt = {};          // "x,y" -> building or exit
  let P = { x: 11, y: 8, dir: "down", fx: 11, fy: 8, moving: 0, mvFrom: null };
  let npcs = [];
  let keys = {}, padDir = null;
  let t0 = 0, elapsed = 0, stepCool = 0, doorLock = null;
  let imgs = {};            // char images cache

  /* ══════════ マップ生成 ══════════ */
  function buildMap() {
    T = []; solid = []; doorAt = {};
    for (let y = 0; y < MH; y++) { T.push(new Array(MW).fill("g")); solid.push(new Array(MW).fill(false)); }
    const rng = seededRng("ordine-town");
    // 外周は木(南の出口だけ空ける)
    for (let x = 0; x < MW; x++) { T[0][x] = "t"; T[MH - 1][x] = "t"; }
    for (let y = 0; y < MH; y++) { T[y][0] = "t"; T[y][MW - 1] = "t"; }
    EXIT_S.forEach((e) => { T[e.y][e.x] = "p"; });
    // 池
    for (let y = 12; y <= 13; y++) for (let x = 6; x <= 8; x++) T[y][x] = "w";
    // 木の飾り
    [[6, 6], [13, 13], [17, 13], [22, 7], [1, 7]].forEach(([x, y]) => { if (T[y][x] === "g") T[y][x] = "t"; });
    // 花
    for (let i = 0; i < 26; i++) {
      const x = 1 + ((rng() * (MW - 2)) | 0), y = 1 + ((rng() * (MH - 2)) | 0);
      if (T[y][x] === "g") T[y][x] = "f";
    }
    // 道: 中央大通り+横道+各ドアへのスパー
    const path = (x1, y1, x2, y2) => {
      let x = x1, y = y1;
      while (x !== x2) { T[y][x] = "p"; x += Math.sign(x2 - x); }
      while (y !== y2) { T[y][x] = "p"; y += Math.sign(y2 - y); }
      T[y][x] = "p";
    };
    path(11, 3, 11, 15); path(12, 3, 12, 15);
    path(3, 8, 20, 8);
    path(3, 5, 3, 8); path(19, 5, 19, 8);
    path(3, 8, 3, 12); path(19, 8, 19, 11);
    path(15, 11, 15, 8);
    // 通行不可: 木・水
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (T[y][x] === "t" || T[y][x] === "w") solid[y][x] = true;
    // 建物
    for (const b of BUILDINGS) {
      for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) solid[y][x] = true;
      solid[b.door.y][b.door.x] = false;
      T[b.door.y][b.door.x] = "p";
      doorAt[b.door.x + "," + b.door.y] = b;
      if (b.door.y + 1 < MH && T[b.door.y + 1][b.door.x] === "g") T[b.door.y + 1][b.door.x] = "p";
    }
    for (const p of PROPS) solid[p.y][p.x] = true;
    EXIT_S.forEach((e) => { doorAt[e.x + "," + e.y] = { exit: "explore", label: "南の森（探索）" }; });
  }

  /* ══════════ NPC ══════════ */
  function buildNpcs(state) {
    npcs = [];
    const spots = [[6, 5], [14, 6], [9, 12], [16, 13], [5, 7]];
    // 案内人
    npcs.push({ x: 13, y: 9, ic: "🧙", nm: "あんないにんメル", lines: GUIDE_LINES, wander: 0, t: 0 });
    // 所持Echoが散歩(パーティ外優先で最大3体)
    const list = (state.echoes || []).slice(0, 3);
    list.forEach((e, i) => {
      const [x, y] = spots[i];
      npcs.push({ x, y, img: e.img, nm: e.nm, lines: NPC_LINES, wander: 1, t: 1 + i });
    });
    npcs.forEach((n) => { n.fx = n.x; n.fy = n.y; n.moving = 0; });
  }
  function npcSolidAt(x, y) { return npcs.some((n) => n.x === x && n.y === y); }

  /* ══════════ 開始/停止 ══════════ */
  function start(canvas, callbacks) {
    stop();
    cv = canvas; cx = cv.getContext("2d");
    cb = callbacks || {};
    buildMap();
    buildNpcs(cb.state || {});
    const pos = (cb.state && cb.state.pos) || null;
    P = { x: 11, y: 9, dir: "down" };
    if (pos && pos.x > 0 && pos.x < MW - 1 && pos.y > 0 && pos.y < MH - 1 && !solid[pos.y][pos.x]) { P.x = pos.x; P.y = pos.y; P.dir = pos.dir || "down"; }
    P.fx = P.x; P.fy = P.y; P.moving = 0;
    doorLock = P.x + "," + P.y; // 復帰直後にドア再発動しない
    keys = {}; padDir = null;
    // キャラ画像
    loadImg("player", cb.state && cb.state.playerImg);
    npcs.forEach((n, i) => { if (n.img) loadImg("npc" + i, n.img); });
    resize();
    running = true;
    t0 = performance.now(); elapsed = 0;
    loop();
  }
  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }
  function loadImg(key, src) {
    if (!src) return;
    const im = new Image(); im.src = src;
    imgs[key] = im;
  }
  function resize() {
    if (!cv) return;
    const box = cv.parentElement;
    const w = box.clientWidth;
    const h = Math.max(300, Math.min(innerHeight * 0.58, w * 0.72));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    cv.style.height = h + "px";
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cv._w = w; cv._h = h;
    cv._ts = Math.max(30, Math.min(46, Math.floor(w / 13)));
  }

  /* ══════════ 入力 ══════════ */
  const DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  function heldDir() {
    if (padDir) return padDir;
    if (keys.ArrowUp || keys.w) return "up";
    if (keys.ArrowDown || keys.s) return "down";
    if (keys.ArrowLeft || keys.a) return "left";
    if (keys.ArrowRight || keys.d) return "right";
    return null;
  }
  function onKey(e, down) {
    if (!running) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d"].includes(k)) { keys[k] = down; e.preventDefault(); }
    if (down && (k === "Enter" || k === " " || k === "z")) { interact(); e.preventDefault(); }
  }
  function setPad(dir) { padDir = dir; }

  /* ══════════ 更新 ══════════ */
  function loop() {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    const now = performance.now();
    const dt = Math.min(0.05, (now - t0) / 1000); t0 = now;
    elapsed += dt;
    update(dt);
    draw();
  }
  function update(dt) {
    // プレイヤー移動(タイル間補間)
    if (P.moving > 0) {
      P.moving -= dt;
      const r = 1 - Math.max(0, P.moving) / STEP_T;
      P.fx = P.mvFrom.x + (P.x - P.mvFrom.x) * r;
      P.fy = P.mvFrom.y + (P.y - P.mvFrom.y) * r;
      if (P.moving <= 0) { P.fx = P.x; P.fy = P.y; onArrive(); }
    } else {
      const d = heldDir();
      if (d) tryStep(d);
    }
    // NPC徘徊
    for (const n of npcs) {
      if (n.moving > 0) {
        n.moving -= dt;
        const r = 1 - Math.max(0, n.moving) / 0.3;
        n.fx = n.from.x + (n.x - n.from.x) * r;
        n.fy = n.from.y + (n.y - n.from.y) * r;
        if (n.moving <= 0) { n.fx = n.x; n.fy = n.y; }
      } else if (n.wander) {
        n.t -= dt;
        if (n.t <= 0) {
          n.t = 1.8 + Math.random() * 2.4;
          const dirs = Object.keys(DIRV);
          const d = dirs[(Math.random() * 4) | 0];
          const [dx, dy] = DIRV[d];
          const nx = n.x + dx, ny = n.y + dy;
          if (canWalk(nx, ny) && !(nx === P.x && ny === P.y) && !npcSolidAt(nx, ny) && !doorAt[nx + "," + ny]) {
            n.from = { x: n.x, y: n.y }; n.x = nx; n.y = ny; n.moving = 0.3;
          }
        }
      }
    }
  }
  function canWalk(x, y) {
    if (x < 0 || y < 0 || x >= MW || y >= MH) return false;
    return !solid[y][x];
  }
  function tryStep(dir) {
    P.dir = dir;
    const [dx, dy] = DIRV[dir];
    const nx = P.x + dx, ny = P.y + dy;
    if (!canWalk(nx, ny) || npcSolidAt(nx, ny)) return;
    P.mvFrom = { x: P.x, y: P.y };
    P.x = nx; P.y = ny; P.moving = STEP_T;
    if (doorLock && doorLock !== nx + "," + ny) doorLock = null;
  }
  function onArrive() {
    const key = P.x + "," + P.y;
    persist();
    const d = doorAt[key];
    if (!d || doorLock === key) return;
    doorLock = key;
    // ドアの1歩手前を復帰位置として保存
    if (P.mvFrom) { persist(P.mvFrom.x, P.mvFrom.y); }
    if (window.RSND) RSND.ok();
    setTimeout(() => {
      if (d.exit === "explore") { if (cb.openView) cb.openView("explore"); }
      else if (d.href) { if (cb.openHref) cb.openHref(d.href); }
      else if (d.view) { if (cb.openView) cb.openView(d.view, d.tab); }
    }, 130);
  }
  function persist(x, y) {
    if (cb.save) cb.save({ x: x != null ? x : P.x, y: y != null ? y : P.y, dir: P.dir });
  }

  /* ── しらべる/はなす ── */
  function interact() {
    if (!running || P.moving > 0) return;
    const [dx, dy] = DIRV[P.dir];
    const tx = P.x + dx, ty = P.y + dy;
    // NPC
    const n = npcs.find((m) => m.x === tx && m.y === ty);
    if (n) {
      n.face = { x: -dx, y: -dy };
      const line = n.lines[(Math.random() * n.lines.length) | 0];
      if (cb.dialog) cb.dialog(n.nm, [line]);
      if (window.RSND) RSND.tap();
      return;
    }
    // プロップ
    const pr = PROPS.find((p) => p.x === tx && p.y === ty);
    if (pr) { if (cb.prop) cb.prop(pr); return; }
    // 建物のドアの前で調べても入れる
    const d = doorAt[tx + "," + ty];
    if (d) {
      if (d.exit === "explore") { if (cb.openView) cb.openView("explore"); }
      else if (d.href) { if (cb.openHref) cb.openHref(d.href); }
      else if (d.view) { if (cb.openView) cb.openView(d.view, d.tab); }
      return;
    }
    // 何もない
    if (cb.dialog && Math.random() < 0.3) cb.dialog("", ["しかし なにも みつからなかった。"]);
  }

  /* ══════════ 描画 ══════════ */
  function camera() {
    const ts = cv._ts;
    const vw = cv._w / ts, vh = cv._h / ts;
    let cxm = P.fx + 0.5 - vw / 2, cym = P.fy + 0.5 - vh / 2;
    cxm = Math.max(0, Math.min(MW - vw, cxm));
    cym = Math.max(0, Math.min(MH - vh, cym));
    return { ox: cxm * ts, oy: cym * ts, ts };
  }
  function draw() {
    if (!cv) return;
    const { ox, oy, ts } = camera();
    const w = cv._w, h = cv._h;
    cx.fillStyle = "#0d2416"; cx.fillRect(0, 0, w, h);
    const x0 = Math.max(0, Math.floor(ox / ts)), x1 = Math.min(MW - 1, Math.ceil((ox + w) / ts));
    const y0 = Math.max(0, Math.floor(oy / ts)), y1 = Math.min(MH - 1, Math.ceil((oy + h) / ts));
    // 地形
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) drawTile(x, y, x * ts - ox, y * ts - oy, ts);
    // 建物
    for (const b of BUILDINGS) drawBuilding(b, ox, oy, ts);
    // プロップ
    for (const p of PROPS) drawProp(p, ox, oy, ts);
    // NPC(下→上)
    const actors = npcs.slice().sort((a, b2) => a.fy - b2.fy);
    let playerDrawn = false;
    for (const n of actors) {
      if (!playerDrawn && P.fy < n.fy) { drawPlayer(ox, oy, ts); playerDrawn = true; }
      drawActor(n, ox, oy, ts);
    }
    if (!playerDrawn) drawPlayer(ox, oy, ts);
    // 建物ラベル(最前面)
    for (const b of BUILDINGS) drawLabel(b.ic + " " + b.label, (b.x + b.w / 2) * ts - ox, b.y * ts - oy - 6, ts);
    drawLabel("🌲 みなみのもり（たんけん）", (EXIT_S[0].x + 1) * ts - ox, (MH - 0.35) * ts - oy, ts);
  }
  function drawTile(x, y, sx, sy, ts) {
    const ch = T[y][x];
    const n = hashN(x + "_" + y, 31) % 5;
    // 草
    cx.fillStyle = n % 2 ? "#2e7d43" : "#2a7540";
    cx.fillRect(sx, sy, ts, ts);
    if (ch === "g" || ch === "f" || ch === "t") {
      cx.fillStyle = "rgba(255,255,255,.05)";
      if (n === 1) cx.fillRect(sx + ts * 0.2, sy + ts * 0.3, 2, 2);
      if (n === 3) cx.fillRect(sx + ts * 0.65, sy + ts * 0.6, 2, 2);
    }
    if (ch === "p") { // 道
      cx.fillStyle = "#c9a76a";
      cx.fillRect(sx, sy, ts, ts);
      cx.fillStyle = "rgba(0,0,0,.07)";
      if (n === 2) cx.fillRect(sx + ts * 0.3, sy + ts * 0.4, 3, 3);
      if (n === 4) cx.fillRect(sx + ts * 0.6, sy + ts * 0.25, 3, 3);
    }
    if (ch === "w") { // 水(アニメ)
      cx.fillStyle = "#2c66b8"; cx.fillRect(sx, sy, ts, ts);
      cx.fillStyle = "rgba(255,255,255,.22)";
      const ph = Math.sin(elapsed * 2 + x * 1.7 + y * 2.3);
      cx.fillRect(sx + ts * 0.15, sy + ts * (0.3 + ph * 0.08), ts * 0.3, 2);
      cx.fillRect(sx + ts * 0.55, sy + ts * (0.65 - ph * 0.08), ts * 0.25, 2);
    }
    if (ch === "f") { // 花
      const cols = ["#ff8fb8", "#ffd257", "#b8a0ff", "#ff9d6f"];
      cx.fillStyle = cols[n % 4];
      cx.beginPath(); cx.arc(sx + ts * 0.35, sy + ts * 0.4, ts * 0.07, 0, 7); cx.fill();
      cx.beginPath(); cx.arc(sx + ts * 0.68, sy + ts * 0.62, ts * 0.06, 0, 7); cx.fill();
    }
    if (ch === "t") { // 木
      cx.fillStyle = "#5a3d24";
      cx.fillRect(sx + ts * 0.42, sy + ts * 0.55, ts * 0.16, ts * 0.35);
      cx.fillStyle = "#1d5c33";
      cx.beginPath(); cx.arc(sx + ts * 0.5, sy + ts * 0.38, ts * 0.34, 0, 7); cx.fill();
      cx.fillStyle = "rgba(255,255,255,.09)";
      cx.beginPath(); cx.arc(sx + ts * 0.4, sy + ts * 0.28, ts * 0.12, 0, 7); cx.fill();
    }
  }
  function drawBuilding(b, ox, oy, ts) {
    const sx = b.x * ts - ox, sy = b.y * ts - oy, bw = b.w * ts, bh = b.h * ts;
    if (sx > cv._w || sy > cv._h || sx + bw < 0 || sy + bh < 0) return;
    const roofH = b.tower ? ts * 0.8 : ts * 1.05;
    // 壁
    cx.fillStyle = b.body || "#54586e";
    cx.fillRect(sx + 2, sy + roofH * 0.55, bw - 4, bh - roofH * 0.55 - 2);
    // 壁の窓
    cx.fillStyle = "rgba(255,232,150,.85)";
    const winY = sy + roofH * 0.55 + (bh - roofH * 0.55) * 0.3;
    for (let i = 0; i < b.w - 1; i++) {
      const wx = sx + ts * (0.55 + i);
      if (Math.abs(wx + ts * 0.2 - ((b.door.x + 0.5) * ts - ox)) < ts * 0.55) continue;
      cx.fillRect(wx, winY, ts * 0.28, ts * 0.3);
    }
    // 屋根
    cx.fillStyle = b.roof;
    cx.beginPath();
    cx.moveTo(sx - ts * 0.12, sy + roofH * 0.62);
    cx.lineTo(sx + bw * 0.5, sy - (b.tower ? ts * 0.5 : ts * 0.08));
    cx.lineTo(sx + bw + ts * 0.12, sy + roofH * 0.62);
    cx.closePath(); cx.fill();
    cx.fillStyle = "rgba(0,0,0,.15)";
    cx.beginPath();
    cx.moveTo(sx + bw * 0.5, sy - (b.tower ? ts * 0.5 : ts * 0.08));
    cx.lineTo(sx + bw + ts * 0.12, sy + roofH * 0.62);
    cx.lineTo(sx + bw * 0.5, sy + roofH * 0.62);
    cx.closePath(); cx.fill();
    // ドア
    const dx = b.door.x * ts - ox, dy = b.door.y * ts - oy;
    cx.fillStyle = "#241812";
    cx.beginPath();
    cx.moveTo(dx + ts * 0.2, dy + ts);
    cx.lineTo(dx + ts * 0.2, dy + ts * 0.35);
    cx.arc(dx + ts * 0.5, dy + ts * 0.35, ts * 0.3, Math.PI, 0);
    cx.lineTo(dx + ts * 0.8, dy + ts);
    cx.closePath(); cx.fill();
    // ドア前の光
    cx.fillStyle = "rgba(255,232,150,.15)";
    cx.fillRect(dx + ts * 0.15, dy + ts * 0.8, ts * 0.7, ts * 0.2);
    // アイコン(屋根の上)
    cx.font = `${Math.round(ts * 0.55)}px serif`;
    cx.textAlign = "center";
    cx.fillText(b.ic, sx + bw / 2, sy + roofH * 0.45);
  }
  function drawProp(p, ox, oy, ts) {
    const sx = p.x * ts - ox, sy = p.y * ts - oy;
    if (p.kind === "fountain") {
      cx.fillStyle = "#8a92b0";
      cx.beginPath(); cx.arc(sx + ts / 2, sy + ts / 2, ts * 0.45, 0, 7); cx.fill();
      cx.fillStyle = "#2c66b8";
      cx.beginPath(); cx.arc(sx + ts / 2, sy + ts / 2, ts * 0.33, 0, 7); cx.fill();
      const ph = (elapsed * 1.4) % 1;
      cx.fillStyle = `rgba(180,220,255,${0.8 - ph * 0.7})`;
      cx.beginPath(); cx.arc(sx + ts / 2, sy + ts * (0.45 - ph * 0.25), ts * (0.05 + ph * 0.06), 0, 7); cx.fill();
    } else {
      cx.font = `${Math.round(ts * 0.62)}px serif`;
      cx.textAlign = "center";
      cx.fillText(p.ic, sx + ts / 2, sy + ts * 0.75);
    }
  }
  function drawActor(n, ox, oy, ts) {
    const i = npcs.indexOf(n);
    drawChar(imgs["npc" + i], n.ic || "🧍", n.fx * ts - ox, n.fy * ts - oy, ts, elapsed * 3 + i);
  }
  function drawPlayer(ox, oy, ts) {
    drawChar(imgs.player, "🙂", P.fx * ts - ox, P.fy * ts - oy, ts, elapsed * 5, true);
  }
  function drawChar(img, fallbackIc, sx, sy, ts, phase, isPlayer) {
    const bob = Math.sin(phase) * ts * 0.03;
    const size = ts * 0.86;
    const x = sx + (ts - size) / 2, y = sy + (ts - size) / 2 - ts * 0.14 + bob;
    // 影
    cx.fillStyle = "rgba(0,0,0,.28)";
    cx.beginPath(); cx.ellipse(sx + ts / 2, sy + ts * 0.88, ts * 0.3, ts * 0.1, 0, 0, 7); cx.fill();
    if (img && img.complete && img.naturalWidth) {
      cx.save();
      const r = size * 0.24;
      cx.beginPath();
      cx.moveTo(x + r, y); cx.arcTo(x + size, y, x + size, y + size, r);
      cx.arcTo(x + size, y + size, x, y + size, r);
      cx.arcTo(x, y + size, x, y, r); cx.arcTo(x, y, x + size, y, r);
      cx.closePath(); cx.clip();
      cx.drawImage(img, x, y, size, size);
      cx.restore();
      cx.strokeStyle = isPlayer ? "#ffd257" : "rgba(255,255,255,.7)";
      cx.lineWidth = 2;
      cx.strokeRect(x + 1, y + 1, size - 2, size - 2);
    } else {
      cx.font = `${Math.round(size)}px serif`;
      cx.textAlign = "center";
      cx.fillText(fallbackIc, sx + ts / 2, y + size * 0.85);
    }
    if (isPlayer) { // 向きマーカー
      const [dx2, dy2] = DIRV[P.dir];
      cx.fillStyle = "#ffd257";
      cx.beginPath();
      const mx = sx + ts / 2 + dx2 * ts * 0.42, my = sy + ts * 0.42 + dy2 * ts * 0.46 + bob;
      cx.moveTo(mx, my);
      cx.lineTo(mx - dy2 * 4 - dx2 * 4, my - dx2 * 4 - dy2 * 4);
      cx.lineTo(mx + dy2 * 4 - dx2 * 4, my + dx2 * 4 - dy2 * 4);
      cx.closePath(); cx.fill();
    }
  }
  function drawLabel(txt, cxp, cyp, ts) {
    cx.font = `700 ${Math.max(10, Math.round(ts * 0.26))}px 'Noto Sans JP',sans-serif`;
    cx.textAlign = "center";
    const w = cx.measureText(txt).width + 12;
    cx.fillStyle = "rgba(8,10,26,.72)";
    const h = ts * 0.44;
    roundRect(cxp - w / 2, cyp - h * 0.75, w, h, 6);
    cx.fill();
    cx.fillStyle = "#ffe9a0";
    cx.fillText(txt, cxp, cyp - h * 0.75 + h * 0.68);
  }
  function roundRect(x, y, w, h, r) {
    cx.beginPath();
    cx.moveTo(x + r, y); cx.arcTo(x + w, y, x + w, y + h, r);
    cx.arcTo(x + w, y + h, x, y + h, r); cx.arcTo(x, y + h, x, y, r);
    cx.arcTo(x, y, x + w, y, r); cx.closePath();
  }

  /* ══════════ グローバル入力 ══════════ */
  window.addEventListener("keydown", (e) => onKey(e, true));
  window.addEventListener("keyup", (e) => onKey(e, false));
  window.addEventListener("resize", () => { if (running) resize(); });

  /* 検証用フック */
  const _dev = {
    pos: () => ({ x: P.x, y: P.y, dir: P.dir }),
    warp: (x, y) => { P.x = x; P.y = y; P.fx = x; P.fy = y; P.moving = 0; doorLock = null; },
    step: (d) => tryStep(d),
    arrive: () => onArrive(),
  };

  return { start, stop, setPad, interact, resize, running: () => running, _dev };
})();
window.World = World;
