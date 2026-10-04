/* ============================================================
   MagiAbyss — ma-boss.js
   ボス戦
   ・フェーズ：HP 100〜70％ 通常／70〜40％ 範囲・突進／40〜15％ 強化・地形変化／15％以下 最終攻撃
   ・攻撃はすべて床に予告を出してから（避けられる）。
   ・ギミック：アリーナの「蔦の封印」「氷の鏡」…を全部こわす／踏むと BREAK（6秒止まって被ダメージ2倍）。
     しばらくすると立て直す（何度でも隙を作れる）。
   ============================================================ */
(function () {
  "use strict";
  const MA = (window.MA = window.MA || {});
  const TAU = Math.PI * 2;
  const D = () => MA.D;
  const E = () => MA.E;
  const G = () => MA.G;
  const A = () => MA.Audio;
  const PH = [0.70, 0.40, 0.15];

  function begin(room, abyss) {
    const g = G();
    if (g.bossActive) return;
    const key = abyss ? Object.keys(D().BOSSES)[(g.floor / 5 - 1 + (g.seed % 6)) % 6 | 0] : g.dun.boss;
    const def = D().BOSSES[key];
    g.bossActive = true;
    g.bossRoomId = room.id;
    const cx = room.cx * 16 + 8, cy = room.cy * 16 + 8;
    /* 体力：迷宮の強さ × 経過時間 × 探索中のレベル（プレイヤーの強さに追いつくように）
       ★ 2026-10-04 調整：レベルを見ていなかったので、Lv18 前後で着くと 8〜20 秒で倒れていた（早回しの実測）。
         レベル1つごとに +12% → Lv18 で約3倍＝ボス戦はおよそ 20〜40 秒（早回しの実測・タキナがいちばん短い）。 */
    const sc = E().enemyScale();
    const e = E().spawnEnemy(key, cx, cy - 20, { boss: true });
    const lvK = 1 + 0.12 * Math.max(0, (g.P.lv || 1) - 1);
    e.mhp = e.hp = Math.round(def.hp * Math.pow(sc.hp, 0.92) * lvK * (abyss ? 0.5 : 1));
    /* ★ 体力をレベルに合わせて伸ばした（戦いが約3倍長い）ぶん、攻撃は 0.8 倍に */
    e.atk = def.atk * sc.atk * 0.8;
    e.r = def.r; e.d = Object.assign({}, def, { exp: 120, col: def.col }); e.art = MA.Art.sprite(def.art);
    e.name = def.nm; e.phase = 0; e.patT = 2.2; e.armor = 1; e.invuln = true; e.introT = 2.2; e.heavy = true;
    e.bk = key;
    g.boss = e;
    /* 扉を閉じる（迷宮だけ） */
    if (!abyss) {
      const map = g.map;
      map.bossDoors.forEach(([x, y]) => { map.tiles[y * map.W + x] = MA.Map.T.BOSSDOOR; });
      MA.Render.dirtyMap && MA.Render.dirtyMap();
      /* 部屋の外にいる雑魚は消す（ボスに集中） */
      g.E.forEach((o) => { if (!o.boss && MA.Map.roomOf(map, o.x, o.y) !== room.id) o.dead = true; });
    }
    placeGimmicks(room, def);
    A().bgm("boss"); A().sfx("roar");
    g.shake = 8;
    MA.UI.bossIntro(def, e);
    E().toast("BOSS「" + def.nm + "」", "#ff5a6a");
    E().updateObjective();
  }
  function placeGimmicks(room, def) {
    const g = G();
    const gm = def.gim;
    g.gims = [];
    const n = gm.n;
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU + Math.PI / 4;
      const x = room.cx * 16 + 8 + Math.cos(a) * room.w * 16 * 0.34, y = room.cy * 16 + 8 + Math.sin(a) * room.h * 16 * 0.32;
      if (gm.kind === "rune") { g.gims.push({ kind: "rune", x, y, on: false }); continue; }
      const o = E().spawnEnemy("slime", x, y, { summoned: true });
      if (!o) continue;
      o.gim = gm.kind; o.ai = "none"; o.heavy = true; o.name = gm.nm; o.r = 8;
      o.mhp = o.hp = Math.round(gm.hp * E().enemyScale().hp * 0.6);
      o.atk = 0; o.spd = 0; o.el = null;
      o.art = MA.Art.sprite(gm.kind === "brazier" ? "brazierOff" : gm.kind);
      o.d = Object.assign({}, o.d, { exp: 0, col: "#ffffff", nm: gm.nm });
      o.onDeath = () => { gimCheck(); };
      o.isGim = true;
      g.gims.push(o);
    }
    g.gimRespawn = 0;
  }
  function gimCheck() {
    const g = G(), b = g.boss;
    if (!b || b.dead) return;
    const left = g.gims.filter((x) => (x.kind === "rune" ? !x.on : !x.dead)).length;
    if (left === 0 && !(b.breakT > 0)) {
      b.breakT = 6;
      E().toast("BREAK！ " + b.name + " が崩れた（6秒間 ダメージ2倍）", "#ffd84a");
      E().fx({ type: "break", x: b.x, y: b.y, t: 0, dur: 1.0, col: "#ffd84a" });
      A().sfx("boom"); g.shake = 10;
      g.TG = g.TG.filter((t) => t.owner !== b);
      g.gimRespawn = 22;
      /* 執行者の BREAK は燭台がともる見た目に */
      g.gims.forEach((x) => { if (x.gim === "brazier") x.art = MA.Art.sprite("brazier"); });
    }
  }

  /* ══ 技の部品 ══ */
  function P() { return G().P; }
  function circles(b, n, spread, r, delay, mul, col) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, d = i === 0 ? 0 : Math.random() * spread;
      const x = P().x + Math.cos(a) * d, y = P().y + Math.sin(a) * d;
      E().telegraph({ shape: "circle", x, y, r, dur: delay + i * 0.05, dmg: b.atk * mul, owner: b, col: col || "#ff3050" });
    }
  }
  function lines(b, n, w, len, delay, mul, aimed, col) {
    for (let i = 0; i < n; i++) {
      const base = Math.atan2(P().y - b.y, P().x - b.x);
      const a = aimed ? base + (i - (n - 1) / 2) * 0.35 : i / n * TAU + Math.random();
      E().telegraph({ shape: "line", x: b.x, y: b.y, ang: a, len, w, dur: delay, dmg: b.atk * mul, owner: b, col: col || "#ff3050" });
    }
  }
  function ring(b, r1, r2, delay, mul) { E().telegraph({ shape: "ring", x: b.x, y: b.y, r: r1, r2, dur: delay, dmg: b.atk * mul, owner: b, follow: true }); }
  function cone(b, r, arc, delay, mul) { const a = Math.atan2(P().y - b.y, P().x - b.x); E().telegraph({ shape: "cone", x: b.x, y: b.y, ang: a, r, arc, dur: delay, dmg: b.atk * mul, owner: b, follow: true }); }
  function burstRing(b, n, sp, mul, off, col) { for (let i = 0; i < n; i++) { const a = i / n * TAU + (off || 0); E().ebullet({ x: b.x, y: b.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dmg: b.atk * mul, r: 4, col: col || b.d.col, kind: "orb", src: b }); } }
  function spiral(b, dur, arms, sp, mul, rate, col) {
    const t0 = G().t;
    let a = Math.random() * TAU;
    for (let k = 0; k < dur / rate; k++) G().queue.push({ at: t0 + k * rate, f: () => { if (b.dead || b.breakT > 0) return; a += 0.32; for (let i = 0; i < arms; i++) { const aa = a + i / arms * TAU; E().ebullet({ x: b.x, y: b.y, vx: Math.cos(aa) * sp, vy: Math.sin(aa) * sp, dmg: b.atk * mul, r: 3, col: col || b.d.col, kind: "shard", src: b }); } } });
  }
  function aimed(b, n, spread, sp, mul, col) { const a0 = Math.atan2(P().y - b.y, P().x - b.x); for (let i = 0; i < n; i++) { const a = a0 + (i - (n - 1) / 2) * spread; E().ebullet({ x: b.x, y: b.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dmg: b.atk * mul, r: 4, col: col || b.d.col, kind: "orb", src: b }); } }
  function dashAt(b, mul) {
    const a = Math.atan2(P().y - b.y, P().x - b.x);
    E().telegraph({ shape: "line", x: b.x, y: b.y, ang: a, len: 200, w: b.r * 1.6, dur: 0.85, owner: b, onFire: () => { b.dash = { a, t: 0.5, mul }; } });
  }
  function summon(b, k, n) { for (let i = 0; i < n; i++) { const a = i / n * TAU; const m = E().spawnEnemy(k, b.x + Math.cos(a) * 40, b.y + Math.sin(a) * 40, { summoned: true }); if (m) m.room = G().bossRoomId; } }
  function hazardZones(b, n, col, mul, dark) { for (let i = 0; i < n; i++) { const room = G().map.rooms[G().bossRoomId]; const x = (room.x + 2 + Math.random() * (room.w - 4)) * 16, y = (room.y + 2 + Math.random() * (room.h - 4)) * 16; E().telegraph({ shape: "circle", x, y, r: 26, dur: 1.0, col, onFire: (o) => E().zone({ x: o.x, y: o.y, r: 26, dur: 8, side: "enemy", dmg: b.atk * mul, tick: 0.5, dark: !!dark, col }) }); } }

  /* ══ ボスごとの技 ══ */
  const PAT = {
    /* 古樹の守護者 */
    roots(b) { circles(b, 5 + b.phase, 70, 18, 1.0, 1.2, "#a0e060"); },
    leafSpiral(b) { spiral(b, 2.6, 3 + b.phase, 80 + b.phase * 10, 0.7, 0.16, "#7fd060"); },
    summon(b) { summon(b, "goblin", 3 + b.phase); },
    charge(b) { dashAt(b, 1.6); },
    rootRing(b) { ring(b, 120, 40, 1.2, 1.4); },
    leafStorm(b) { for (let k = 0; k < 4; k++) G().queue.push({ at: G().t + k * 0.5, f: () => burstRing(b, 18, 90, 0.7, k * 0.17, "#7fd060") }); circles(b, 6, 90, 20, 1.2, 1.3, "#a0e060"); },
    /* 氷晶の女王 */
    lances(b) { lines(b, 3 + Math.min(2, b.phase), 12, 220, 0.9, 1.4, true, "#7fd0ff"); },
    freezeRing(b) { ring(b, 90, 30, 1.0, 1.3); G().queue.push({ at: G().t + 1.0, f: () => burstRing(b, 16, 100, 0.7, 0, "#bff0ff") }); },
    icicles(b) { circles(b, 7 + b.phase * 2, 120, 16, 1.0, 1.2, "#7fd0ff"); },
    clones(b) { summon(b, "frostWisp", 2 + b.phase); },
    blizzard(b) { spiral(b, 3.0, 4, 90, 0.6, 0.18, "#e0f6ff"); hazardZones(b, 3, "#9ad8ff", 0.25); },
    lanceRain(b) { lines(b, 8, 12, 260, 1.0, 1.5, false, "#7fd0ff"); circles(b, 5, 100, 18, 1.2, 1.3, "#7fd0ff"); },
    /* 熔岩の巨神 */
    slam(b) { E().telegraph({ shape: "circle", x: b.x, y: b.y, r: 70, dur: 1.1, dmg: b.atk * 1.6, owner: b, follow: true, col: "#ff7a2a" }); G().queue.push({ at: G().t + 1.1, f: () => { G().shake = 10; burstRing(b, 14, 80, 0.7, 0, "#ff7a2a"); } }); },
    lavaWave(b) { const a = Math.atan2(P().y - b.y, P().x - b.x); for (let k = -1; k <= 1; k++) E().telegraph({ shape: "line", x: b.x, y: b.y, ang: a + k * 0.5, len: 240, w: 26, dur: 1.0, dmg: b.atk * 1.5, owner: b, col: "#ff7a2a" }); },
    meteor(b) { circles(b, 6 + b.phase * 2, 110, 22, 1.2, 1.5, "#ff9a3a"); },
    eruption(b) { hazardZones(b, 4 + b.phase, "#ff6a1a", 0.35); },
    magmaRing(b) { for (let k = 0; k < 3; k++) G().queue.push({ at: G().t + k * 0.45, f: () => burstRing(b, 20, 85, 0.75, k * 0.16, "#ffb03a") }); },
    /* 禁書の司書 */
    tomeBarrage(b) { for (let k = 0; k < 5; k++) G().queue.push({ at: G().t + k * 0.25, f: () => aimed(b, 3, 0.25, 130, 0.8, "#e8d080") }); },
    teleport(b) { const room = G().map.rooms[G().bossRoomId]; const x = (room.x + 3 + Math.random() * (room.w - 6)) * 16, y = (room.y + 3 + Math.random() * (room.h - 6)) * 16; E().fx({ type: "poof", x: b.x, y: b.y, t: 0, dur: 0.4, col: "#c070ff", r: 24 }); b.x = x; b.y = y; E().fx({ type: "poof", x, y, t: 0, dur: 0.4, col: "#c070ff", r: 24 }); burstRing(b, 12, 95, 0.7, 0, "#c070ff"); },
    pageStorm(b) { spiral(b, 3.0, 5, 85, 0.65, 0.2, "#f0e2b8"); },
    puppets(b) { summon(b, "puppet", 3 + b.phase); },
    laserGrid(b) { const room = G().map.rooms[G().bossRoomId]; for (let k = 0; k < 3 + b.phase; k++) { const y = (room.y + 2 + Math.random() * (room.h - 4)) * 16; E().telegraph({ shape: "line", x: room.x * 16, y, ang: 0, len: room.w * 16, w: 12, dur: 1.1, dmg: b.atk * 1.4, owner: b, col: "#e8d080" }); const x = (room.x + 2 + Math.random() * (room.w - 4)) * 16; E().telegraph({ shape: "line", x, y: room.y * 16, ang: Math.PI / 2, len: room.h * 16, w: 12, dur: 1.1, dmg: b.atk * 1.4, owner: b, col: "#e8d080" }); } },
    spiral(b) { spiral(b, 3.4, 6, 95, 0.7, 0.15, "#c070ff"); },
    /* 奈落の執行者 */
    sweep(b) { cone(b, 110, 2.2, 0.9, 1.8); },
    darkZones(b) { hazardZones(b, 4 + b.phase, "#6a3aa0", 0.4, true); },
    clonesD(b) { summon(b, "shadowSwarm", 6 + b.phase * 2); },
    lunge(b) { dashAt(b, 2.0); },
    darkness(b) { G().darkT = 7; E().toast("闇が広がる……", "#a874ff"); aimed(b, 5, 0.3, 110, 0.8, "#a874ff"); },
    scytheStorm(b) { for (let k = 0; k < 6; k++) G().queue.push({ at: G().t + k * 0.3, f: () => { const a = Math.random() * TAU; E().ebullet({ x: b.x, y: b.y, vx: Math.cos(a) * 80, vy: Math.sin(a) * 80, dmg: b.atk * 1.0, r: 7, col: "#d8d8f0", kind: "scythe", src: b, curve: 1.6, life: 5 }); } }); },
    /* 星脈の原初竜 */
    breath(b) { cone(b, 150, 1.0, 1.0, 1.9); G().queue.push({ at: G().t + 1.0, f: () => aimed(b, 9, 0.12, 160, 0.7, "#ffe86a") }); },
    meteorD(b) { circles(b, 8 + b.phase * 2, 130, 22, 1.2, 1.6, "#ffe86a"); },
    gravity(b) { const room = G().map.rooms[G().bossRoomId]; const o = { kind: "gravity", x: room.cx * 16 + 8 + (Math.random() - 0.5) * 120, y: room.cy * 16 + 8 + (Math.random() - 0.5) * 80, done: false, dyn: 1, temp: 7 }; G().map.objects.push(o); G().queue.push({ at: G().t + 7, f: () => { const i = G().map.objects.indexOf(o); if (i >= 0) G().map.objects.splice(i, 1); } }); burstRing(b, 12, 90, 0.7, 0, "#ffe86a"); },
    timestop(b) {
      /* 時間停止：弾がその場で止まり、少しあとに一斉に動き出す */
      for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; E().ebullet({ x: b.x + Math.cos(a) * 30, y: b.y + Math.sin(a) * 30, vx: Math.cos(a) * 110, vy: Math.sin(a) * 110, dmg: b.atk * 0.8, r: 4, col: "#fff4b0", kind: "orb", src: b, hold: 1.2 }); }
      E().toast("時が止まる——", "#fff4b0"); G().flash = 0.4; G().flashCol = "#ffffff";
    },
    starRain(b) { circles(b, 12, 150, 18, 1.1, 1.3, "#ffe86a"); },
    supernova(b) { ring(b, 160, 54, 1.6, 2.4); G().queue.push({ at: G().t + 1.6, f: () => { burstRing(b, 24, 110, 0.9, 0, "#ffe86a"); G().flash = 0.6; G().flashCol = "#fff4b0"; } }); },
  };
  /* ボスの技の並び（data の pats の名前を、ここの技に対応づける） */
  const ALIAS = { clones: "clones", summonD: "clonesD" };
  function patsOf(b) {
    const list = (D().BOSSES[b.bk].pats || []).map((p) => {
      if (b.bk === "executionerBoss" && p === "clones") return "clonesD";
      if (b.bk === "dragon" && p === "meteor") return "meteorD";
      return ALIAS[p] && PAT[ALIAS[p]] ? ALIAS[p] : p;
    });
    /* フェーズで使える技が増える：0→2つ・1→4つ・2→5つ・3→6つ（最後の技は最終フェーズで多め） */
    const n = [2, 4, 5, 6][b.phase];
    return list.slice(0, n);
  }

  function update(dt) {
    const g = G(), b = g.boss;
    if (!g.bossActive || !b) return;
    if (b.dead) return;
    /* 登場演出のあいだは無敵 */
    if (b.introT > 0) { b.introT -= dt; if (b.introT <= 0) b.invuln = false; return; }
    if (b.phaseT > 0) { b.phaseT -= dt; if (b.phaseT <= 0) b.invuln = false; return; }
    /* フェーズ */
    const ratio = b.hp / b.mhp;
    const want = ratio <= PH[2] ? 3 : ratio <= PH[1] ? 2 : ratio <= PH[0] ? 1 : 0;
    if (want > b.phase) {
      b.phase = want;
      b.invuln = true; b.phaseT = 1.6;
      g.TG = g.TG.filter((t) => t.owner !== b);
      A().sfx("roar"); g.shake = 10;
      const def = D().BOSSES[b.bk];
      MA.UI.bossLine && MA.UI.bossLine(def.lines[Math.min(def.lines.length - 1, b.phase - 1)] || "");
      E().toast(["", "PHASE 2：範囲攻撃と突進", "PHASE 3：攻撃強化・地形変化", "FINAL：最終攻撃"][b.phase], "#ff5a6a");
      /* プレイヤーを押しもどす衝撃 */
      const p = P(); const a = Math.atan2(p.y - b.y, p.x - b.x); if (Math.hypot(p.x - b.x, p.y - b.y) < 90) E().moveCircle(p, Math.cos(a) * 40, Math.sin(a) * 40, true);
      E().fx({ type: "shock", x: b.x, y: b.y, t: 0, dur: 0.6, r: 100, col: b.d.col });
      if (b.phase >= 2) terrain(b);
      b.atk *= 1.12; b.spdMul = (b.spdMul || 1) * 1.1;
      return;
    }
    if (b.breakT > 0) { b.breakT -= dt; return; }
    /* ギミックの立て直し */
    if (g.gimRespawn > 0) { g.gimRespawn -= dt; if (g.gimRespawn <= 0) { placeGimmicks(g.map.rooms[g.bossRoomId], D().BOSSES[b.bk]); E().toast(D().BOSSES[b.bk].gim.nm + "がふたたび現れた", "#ffd84a"); } }
    /* 魔法床（封印の頁）は踏むと起動 */
    (g.gims || []).forEach((x) => { if (x.kind === "rune" && !x.on && Math.hypot(P().x - x.x, P().y - x.y) < 14) { x.on = true; E().fx({ type: "ring", x: x.x, y: x.y, t: 0, dur: 0.4, r: 18, col: "#e8d080" }); A().sfx("key"); gimCheck(); } });
    /* 突進中 */
    if (b.dash) {
      b.dash.t -= dt;
      E().moveEnemy(b, Math.cos(b.dash.a) * 240 * dt, Math.sin(b.dash.a) * 240 * dt);
      if (Math.hypot(P().x - b.x, P().y - b.y) < b.r + P().r) E().hurtPlayer(b.atk * b.dash.mul, b);
      if (b.dash.t <= 0) b.dash = null;
      return;
    }
    /* ゆっくり近づく（離れすぎない） */
    const p = P();
    const d = Math.hypot(p.x - b.x, p.y - b.y);
    if (d > 60) { const a = Math.atan2(p.y - b.y, p.x - b.x); E().moveEnemy(b, Math.cos(a) * b.spd * 0.5 * (b.spdMul || 1) * dt, Math.sin(a) * b.spd * 0.5 * (b.spdMul || 1) * dt); b.face = Math.cos(a) > 0 ? 1 : -1; }
    if (d < b.r + p.r) { if (!(b.touchCd > 0)) { if (E().hurtPlayer(b.atk, b)) b.touchCd = 1; } }
    if (b.touchCd > 0) b.touchCd -= dt;
    /* 技 */
    b.patT -= dt;
    if (b.patT <= 0) {
      const list = patsOf(b);
      let k = list[Math.floor(Math.random() * list.length)];
      if (b.phase === 3 && Math.random() < 0.4) k = list[list.length - 1];
      if (k === b.lastPat && list.length > 1) k = list[(list.indexOf(k) + 1) % list.length];
      b.lastPat = k;
      (PAT[k] || PAT.circles || (() => {}))(b);
      E().fx({ type: "charge", x: b.x, y: b.y, t: 0, dur: 0.5, col: b.d.col, r: b.r + 8, owner: b });
      b.patT = [3.0, 2.6, 2.2, 1.8][b.phase] * (G().muts.warp ? 0.8 : 1);
    }
  }
  /* フェーズ3以降：地形が変わる */
  function terrain(b) {
    const k = b.bk;
    if (k === "treeGuardian") hazardZones(b, 5, "#9a5ac8", 0.3);
    if (k === "iceQueen") { G().iceStorm = true; hazardZones(b, 4, "#9ad8ff", 0.25); }
    if (k === "lavaTitan") hazardZones(b, 6, "#ff6a1a", 0.4);
    if (k === "librarian") hazardZones(b, 5, "#e8d080", 0.35);
    if (k === "executionerBoss") { G().darkT = 999; hazardZones(b, 4, "#6a3aa0", 0.4, true); }
    if (k === "dragon") PAT.gravity(b);
    E().toast("地形が変わった！", "#ff8a3d");
  }
  function onKilled(e) {
    const g = G();
    g.bossActive = false; g.bossDone = true;
    g.stats.bosses++;
    const S = MA.Save.S;
    S.codex.boss[e.bk] = (S.codex.boss[e.bk] || 0) + 1;
    S.stats.bosses++;
    MA.Save.misAdd("bosses", 1);
    g.darkT = 0;
    if (g.stats.bossHitTaken === 0) E().ach("nohit");
    (g.gims || []).forEach((x) => { if (x.hp != null) x.dead = true; });
    g.gims = [];
    g.TG = []; g.EB = [];
    g.E.forEach((o) => { if (!o.dead) { o.dead = true; E().fx({ type: "poof", x: o.x, y: o.y, t: 0, dur: 0.3, col: "#ffffff", r: o.r }); } });
    E().fx({ type: "bossdeath", x: e.x, y: e.y, t: 0, dur: 2.2, col: e.d.col });
    g.slow = 1.6; g.shake = 14; g.flash = 1; g.flashCol = "#ffffff";
    A().sfx("boom");
    const map = g.map;
    const room = map.rooms[g.bossRoomId];
    /* 宝箱と出口 */
    map.objects.push({ kind: "chest", x: room.cx * 16 + 8 - 24, y: room.cy * 16 + 8, tier: 3, done: false, dyn: 1 });
    if (g.mode === "abyss") { E().openStairs(); }
    else {
      map.objects.push({ kind: "exit", x: room.cx * 16 + 8 + 24, y: room.cy * 16 + 8, done: false, dyn: 1 });
      map.bossDoors.forEach(([x, y]) => { map.tiles[y * map.W + x] = MA.Map.T.FLOOR; });
      MA.Render.dirtyMap && MA.Render.dirtyMap();
    }
    MA.UI.bossDown(e);
    A().bgm(g.mode === "abyss" ? g.map.biome : g.dun.biome);
    E().updateObjective();
  }
  MA.Boss = { begin, update, onKilled, PAT, gimCheck };
})();
