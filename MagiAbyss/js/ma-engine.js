/* ============================================================
   MagiAbyss — ma-engine.js
   探索（ゲームの中身）。画面（DOM）には直接さわらず、MA.UI の関数を呼ぶだけ。
   ・固定ステップ 60Hz で動かし、描画は MA.Render に任せる。
   ・攻撃の中身は ma-weapons.js、ボスの技は ma-boss.js。
   ============================================================ */
(function () {
  "use strict";
  const MA = (window.MA = window.MA || {});
  const D = () => MA.D;
  const M = () => MA.Map;
  const TAU = Math.PI * 2;
  const DT = 1 / 60;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };

  const G = (MA.G = { running: false, paused: null });
  let uid = 1;

  /* ══════════════════════════════════════════════════════════════
     敵のすばやい検索（32px のマス目）
     ══════════════════════════════════════════════════════════════ */
  const CELL = 32;
  const grid = new Map();
  function gridBuild() {
    grid.clear();
    for (let i = 0; i < G.E.length; i++) {
      const e = G.E[i]; if (e.dead) continue;
      const k = ((e.x / CELL) | 0) * 4096 + ((e.y / CELL) | 0);
      let a = grid.get(k); if (!a) { a = []; grid.set(k, a); } a.push(e);
    }
  }
  function eachNear(x, y, r, fn) {
    const x0 = ((x - r) / CELL) | 0, x1 = ((x + r) / CELL) | 0, y0 = ((y - r) / CELL) | 0, y1 = ((y + r) / CELL) | 0;
    for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
      const a = grid.get(cx * 4096 + cy); if (!a) continue;
      for (let i = 0; i < a.length; i++) { const e = a[i]; if (!e.dead && fn(e) === false) return; }
    }
  }
  function enemiesIn(x, y, r) { const out = []; eachNear(x, y, r + 40, (e) => { if (dist2(x, y, e.x, e.y) <= (r + e.r) * (r + e.r)) out.push(e); }); return out; }
  function nearest(x, y, maxD, skip) {
    let best = null, bd = maxD * maxD;
    for (let i = 0; i < G.E.length; i++) { const e = G.E[i]; if (e.dead || e.hidden || (skip && skip(e))) continue; const d = dist2(x, y, e.x, e.y); if (d < bd) { bd = d; best = e; } }
    return best;
  }
  function nearestN(x, y, maxD, n, skip) {
    const list = [];
    for (let i = 0; i < G.E.length; i++) { const e = G.E[i]; if (e.dead || e.hidden || (skip && skip(e))) continue; const d = dist2(x, y, e.x, e.y); if (d < maxD * maxD) list.push([d, e]); }
    list.sort((a, b) => a[0] - b[0]);
    return list.slice(0, n).map((x) => x[1]);
  }
  function strongest(x, y, maxD) {
    let best = null, bh = -1;
    for (let i = 0; i < G.E.length; i++) { const e = G.E[i]; if (e.dead || e.hidden) continue; if (dist2(x, y, e.x, e.y) > maxD * maxD) continue; const h = e.hp + (e.boss ? 1e9 : 0) + (e.elite ? 1e6 : 0); if (h > bh) { bh = h; best = e; } }
    return best;
  }

  /* ══════════════════════════════════════════════════════════════
     はじめる
     cfg: { mode: "dungeon"|"abyss", dun, cid, muts:[], trial, resume }
     ══════════════════════════════════════════════════════════════ */
  function start(cfg) {
    const S = MA.Save.S;
    const cid = cfg.cid;
    const C = D().CHARS[cid];
    const isAbyss = cfg.mode === "abyss";
    const dun = isAbyss ? null : D().DUN[cfg.dun];
    Object.keys(G).forEach((k) => { if (k !== "running") delete G[k]; });
    Object.assign(G, {
      running: true, paused: null, mode: cfg.mode, dun, cid, C, cfg,
      t: 0, frame: 0, seed: cfg.seed || ((Date.now() ^ (Math.random() * 1e9)) >>> 0),
      E: [], PB: [], EB: [], TG: [], ZN: [], FX: [], PK: [], NUM: [],
      shake: 0, flash: 0, flashCol: "#fff", slow: 0,
      keys: 0, keysNeed: isAbyss ? 0 : 3, sealKey: false, bossOpen: false, bossActive: false, bossDone: false, boss: null, mid: null,
      floor: cfg.floor || 1, rule: null,
      stats: { kills: 0, dmg: 0, taken: 0, gold: 0, mats: {}, chests: 0, elites: 0, bosses: 0, maxLv: 1, gear: [], lore: [], res: [], evo: [], levels: 0, secret: 0, bossHitTaken: 0 },
      muts: {}, mutList: (cfg.muts || []).slice(), queue: [], toasts: [], msgT: 0,
      dir: { t: 0, spawnT: 1, eliteT: 70, ambush: {} },
      corruption: 0, darkT: 0, timeStopT: 0, vision: 1,
      runId: Date.now(),
      /* ★★ 2026-10-05 難易度（ノーマル／ハード）。深淵はノーマル扱い */
      diff: cfg.mode === "abyss" ? "normal" : (cfg.diff === "hard" ? "hard" : "normal"),
    });
    G.modeDef = D().MODES[G.diff] || D().MODES.normal;
    G.rnd = M().mkRng(G.seed);
    /* 変異（探索）／特殊ルール（深淵） */
    G.mutList.forEach((k) => { const m = D().MUTATIONS[k]; if (m) G.muts[k] = m; });
    G.rewardMul = 1 + G.mutList.reduce((a, k) => a + ((D().MUTATIONS[k] || {}).reward || 0), 0);
    if (isAbyss) {
      G.rule = cfg.rule || D().ABYSS_RULES[0];
      G.abyssBiomes = ["forest", "ice", "lava", "library", "abyss", "sky"];
    }
    buildFloor(cfg);
    /* プレイヤー */
    const st0 = MA.Stats.compute(cid, cfg.trial ? { lv: 10, awk: 0, tree: {}, gear: [] } : {});
    const P = {
      cid, C, x: G.map.start.x, y: G.map.start.y + 20, vx: 0, vy: 0, r: 5, face: 1, aimA: 0, moving: false, walkT: 0,
      lv: 1, exp: 0, need: MA.Stats.expNeed(1), base: st0,
      weapons: [], magics: [], passives: {}, seals: {}, tags: new Set(), res: new Set(), resFx: [],
      skillCd: 0, burstCd: 0, ultG: st0.ultStart || 0, atkT: 0, atkN: 0,
      dashN: 1, dashCd: 0, dashT: 0, dvx: 0, dvy: 0, iT: 1.5, hurtT: 0, shield: 0,
      buffs: {}, focus: 0, heat: 0, gale: [], chainT: 0, guardCd: 0, mirage: [], clones: [], notes: [],
      revive: 0, rerolls: (st0.awkReroll || 0) + Math.ceil((S.fac.train || 0) / 2) + Math.min(3, S.items.reroll || 0),
      banish: Math.min(3, S.items.banish || 0), potion: Math.min(3, S.items.potion || 0), elixir: Math.min(1, S.items.elixir || 0),
      cardsN: 3 + ((S.fac.train || 0) >= 3 ? 1 : 0),
      kills: 0, alive: true,
    };
    G.P = P;
    /* 持ちこんだ消耗品はここで使ったことにする */
    if (!cfg.resume) { S.items.reroll = Math.max(0, (S.items.reroll || 0) - Math.min(3, S.items.reroll || 0)); S.items.banish = Math.max(0, (S.items.banish || 0) - Math.min(3, S.items.banish || 0)); S.items.potion = Math.max(0, (S.items.potion || 0) - P.potion); S.items.elixir = Math.max(0, (S.items.elixir || 0) - P.elixir); }
    /* 武器枠の装備：その武器を Lv1 で持って始める */
    if (!cfg.trial) MA.Stats.gearOf(cid, S).forEach((g) => { const gd = D().GEAR[g.id]; if (gd.runWeapon && !P.weapons.find((w) => w.k === gd.runWeapon)) P.weapons.push({ k: gd.runWeapon, lv: 1, el: gd.el || C.el, t: 0.5 }); });
    recompute();
    P.hp = P.st.hp; P.mp = P.st.mmp;
    if (P.st.shieldStart) P.shield = Math.round(P.st.hp * P.st.shieldStart);
    if (cfg.resume) applyResume(cfg.resume);
    /* カメラ */
    G.cam = { x: P.x, y: P.y };
    MA.Render && MA.Render.onStart && MA.Render.onStart();
    G.objective = "";
    updateObjective();
    MA.Audio.bgm(isAbyss ? (G.map.biome) : dun.biome);
    if (!cfg.resume) {
      toast(isAbyss ? "深淵踏破 " + G.floor + "階" + (G.rule && G.rule.id !== "none" ? "（" + G.rule.nm + "）" : "") : dun.nm + " — 探索開始", isAbyss ? "#a874ff" : dun.c);
    } else toast("探索を再開しました", "#8affc4");
    lastT = performance.now(); acc = 0;
    loop();
  }
  /* 階（マップ）を作る */
  function buildFloor(cfg) {
    const isAbyss = G.mode === "abyss";
    const biome = isAbyss ? G.abyssBiomes[(G.floor - 1 + (G.seed % 6)) % 6] : G.dun.biome;
    const S = MA.Save.S;
    G.map = M().generate({ biome, seed: G.seed + G.floor * 7919, arena: isAbyss ? { mw: G.floor % 5 === 0 ? 2 : 3, mh: 2 } : null, chests: isAbyss ? 1 : (S.fac.archive || 0), layout: cfg && cfg.layout });
    G.biome = biome;
    G.E = []; G.PB = []; G.EB = []; G.TG = []; G.ZN = []; G.PK = []; G.FX = [];
    G.boss = null; G.bossActive = false; G.bossDone = false; G.mid = null;
    /* ★ 深淵：1階あたり 44 体〜（前は 31 体で、Lv3 のまま5階の階層ボスに着いて詰んでいた） */
    G.floorKills = 0; G.floorNeed = isAbyss ? 36 + G.floor * 8 : 0; G.stairs = false;
    G.dir = { t: 0, spawnT: 2, eliteT: 70, ambush: {} };
    /* ★ 2026-10-05 強さ（levelMul）と報酬（goldMul）を分けた。敵の基本値が迷宮ごとにもう強くなっているので、
       強さの倍率まで大きくすると二重に伸びて、推奨レベルでも開始20秒で倒れていた（早回しの実測）。 */
    G.levelMul = isAbyss ? abyssMul(G.floor) : G.dun.lvMul;
    G.goldMul = isAbyss ? Math.max(1, abyssMul(G.floor) * 1.6) : (G.dun.gold || G.dun.lvMul);
    if (isAbyss) {
      /* 階ごとの特殊ルール（5階ごとはボスの階） */
      const rules = D().ABYSS_RULES;
      G.rule = G.floor === 1 ? rules[0] : rules[(G.floor * 7 + (G.seed % 11)) % rules.length];
      G.abyssBoss = G.floor % 5 === 0;
      G.bossOpen = true; G.keysNeed = 0;
    }
    if (MA.Render && MA.Render.onMap) MA.Render.onMap();
  }
  function abyssMul(f) { return 1.0 + (f - 1) * 0.35 + Math.pow(f, 1.45) * 0.05; }

  /* ══════════════════════════════════════════════════════════════
     能力の再計算（レベルアップ・共鳴・バフで呼ぶ）
     ══════════════════════════════════════════════════════════════ */
  function recompute() {
    const P = G.P, b = P.base, S = MA.Save.S;
    const st = Object.assign({}, b);
    const pv = (k) => (P.passives[k] || 0);
    const pm = (k) => (P.passiveMul && P.passiveMul[k]) || 0;   // カードのレアリティで増えたぶん
    st.atk = b.atk * (1 + pm("power"));
    st.aspd = b.aspd * (1 + pm("haste"));
    st.crit = b.crit + pm("crit"); st.critDmg = b.critDmg + pm("crit") * 0.02;
    st.hp = Math.round(b.hp * (1 + pm("vital")));
    st.def = b.def + pm("guard");
    st.spd = b.spd * (1 + pm("swift"));
    st.exp = (b.exp || 0) + pm("wisdom");
    st.regen = (b.regen || 0) + pm("regen");
    st.healMul = 1 + pm("regen") * 0.5;
    st.mag = b.mag + pm("arcana"); st.area = 1 + pm("arcana") * 0.6;
    st.elem = 1 + pm("affinity");
    st.magnet = 1 + (b.magnet || 0) + pm("magnet");
    st.cdr = Math.min(0.5, (b.cdr || 0) + pm("cooldown"));
    st.dashMax = 1 + (b.dash || 0) + pv("dashup") + (P.C.type === "mobile" ? 1 : 0);
    st.luck = pm("luck");
    st.drain = (b.drain || 0) + (P.C.passive.kind === "focus" ? P.C.passive.drain : 0);
    st.mmp = 100 + Math.round((b.mp || 0) * 40);
    st.mpRegen = 2.2 + (b.mp || 0) * 2;
    st.elDmg = {}; D().ELEM_KEYS.forEach((el) => { st.elDmg[el] = 1 + pm("seal_" + el); });
    st.pierce = 0; st.spread = 0; st.fan = 0; st.bounces = 0; st.petals = 0; st.heat = 0; st.chain = 0; st.thorns = 0; st.multishot = 0; st.burnSlash = 0;
    st.vision = 1 + (b.vision || 0);
    st.art = b.art || 0;
    /* ★★ 2026-10-05 特性（キャラごとの2つ目のパッシブ・★で効き目が変わる） */
    const TD = P.C.trait && D().TRAITS[P.C.trait.k];
    if (TD) {
      const gk = D().GRADE_MUL[P.C.trait.g || 3] || 1;
      const T = P.traitK = Object.assign({}, TD);
      ["eva", "spd", "crit", "critDmg", "burn", "vsBurn", "per", "max", "dmg", "drain", "aspd", "summon", "def", "hp", "k"].forEach((k2) => { if (typeof T[k2] === "number") T[k2] = T[k2] * gk; });
      if (T.kind === "insight" || T.kind === "dance") st.eva += T.eva;
      if (T.kind === "galefoot") { st.spd *= 1 + T.spd; st.dashMax += T.dash; }
      if (T.kind === "dusk") { st.elDmg.dark = (st.elDmg.dark || 1) * (1 + T.dmg); st.drain += T.drain; }
      if (T.kind === "ironwall") { st.def += T.def; st.hp = Math.round(st.hp * (1 + T.hp)); }
    } else P.traitK = null;
    /* 共鳴の能力 */
    P.resFx.forEach((fx) => {
      if (fx.t !== "stat") return;
      if (fx.atk) st.atk *= 1 + fx.atk;
      if (fx.aspd) st.aspd *= 1 + fx.aspd;
      if (fx.spd) st.spd *= 1 + fx.spd;
      if (fx.crit) st.crit += fx.crit;
      if (fx.def) st.def += fx.def;
      if (fx.regen) st.regen += fx.regen;
      if (fx.drain) st.drain += fx.drain;
      if (fx.elem) st.elem += fx.elem;
      if (fx.cdr) st.cdr = Math.min(0.5, st.cdr + fx.cdr);
      if (fx.mag) st.mag += fx.mag;
      ["pierce", "spread", "fan", "bounces", "petals", "heat", "chain", "thorns", "multishot", "burnSlash"].forEach((k) => { if (fx[k]) st[k] += fx[k]; });
    });
    /* 祭壇などの探索中バフ */
    if (P.altarAtk) st.atk *= 1 + P.altarAtk;
    if (P.altarDef) st.def += P.altarDef;
    /* 深淵の「硝子の体」 */
    st.dmgOut = (G.rule && G.rule.dmgOut) || 1; st.dmgIn = (G.rule && G.rule.dmgIn) || 1;
    const hpRatio = P.st ? P.hp / P.st.hp : 1;
    P.st = st;
    if (P.hp != null) P.hp = Math.min(st.hp, Math.max(1, Math.round(st.hp * hpRatio)));
    P.dashN = Math.min(P.dashN, st.dashMax);
  }

  /* ══════════════════════════════════════════════════════════════
     ループ
     ══════════════════════════════════════════════════════════════ */
  let lastT = 0, acc = 0, raf = 0;
  function loop() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  }
  function frame(now) {
    if (!G.running) return;
    raf = requestAnimationFrame(frame);
    let el = Math.max(0, (now - lastT) / 1000); lastT = now;
    if (el > 0.1) el = 0.1;
    if (!G.paused) {
      acc += el;
      let n = 0;
      /* ★ 1コマの中で例外が出ても、ゲーム全体は止めない（最初の1回だけ記録） */
      while (acc >= DT && n < 5) { try { tick(); } catch (e) { if (!G._terr) { G._terr = 1; console.error(e); } } acc -= DT; n++; }
      if (n >= 5) acc = 0;
    } else acc = 0;
    try { MA.Render.draw(el); } catch (e) { if (!G._rerr) { G._rerr = 1; console.error(e); } }
    if (MA.UI && MA.UI.hud) MA.UI.hud(el);
  }
  function pause(why) { G.paused = why || "menu"; MA.Input.clearAll(); }
  function resume() { G.paused = null; lastT = performance.now(); acc = 0; MA.Input.clearAll(); }
  function stop() { G.running = false; cancelAnimationFrame(raf); MA.Input.enabled = false; }

  /* ══════════════════════════════════════════════════════════════
     1ステップ
     ══════════════════════════════════════════════════════════════ */
  function tick() {
    const P = G.P;
    G.frame++;
    const dt = DT * (G.slow > 0 ? 0.35 : 1);
    if (G.slow > 0) G.slow -= DT;
    G.t += DT;
    G.gTok = Math.min(5, (G.gTok || 0) + 5 * DT);
    if (G.timeStopT > 0) G.timeStopT -= DT;
    gridBuild();
    flowT -= DT; if (flowT <= 0 || !flow) { flowT = 0.25; buildFlow(); }
    input(dt);
    updatePlayer(dt);
    MA.W.update(dt);           // 攻撃・武器・魔法・スキル・共鳴
    updateEnemies(dt);
    updateProjectiles(dt);
    updateEnemyBullets(dt);
    updateTelegraphs(dt);
    updateZones(dt);
    updatePickups(dt);
    updateObjects(dt);
    hazards(dt);
    if (MA.Boss) MA.Boss.update(dt);
    director(dt);
    updateFx(dt);
    discover();
    camera(dt);
    checkpoint();
    if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 30);
    if (G.flash > 0) G.flash = Math.max(0, G.flash - dt * 3);
    if (G.msgT > 0) G.msgT -= dt;
  }

  /* ── 入力 → 行動 ── */
  function input(dt) {
    const I = MA.Input, P = G.P, S = MA.Save.S;
    if (I.consume("menu")) { pause("menu"); MA.UI.showPause(); return; }
    if (I.consume("map")) { pause("map"); MA.UI.showMap(); return; }
    if (I.consume("dash")) dash();
    if (I.consume("skill")) MA.W.skill();
    if (I.consume("burst")) MA.W.burst();
    if (I.consume("ult")) MA.W.ult();
    if (I.consume("interact")) interact();
    /* ねらう向き
       ★★ 2026-10-05 標準は「向いている方向」（PC もスマホも同じ・ご提案どおり統一）。
         facing … 歩いている向き（止まっているあいだは最後に向いた向き）
         auto   … 近い敵を自動でねらう（いなければ向いている方向）
         mouse  … マウスの方向（PC。マウスが無ければ向いている方向） */
    const mode = S.set.aim || "facing";
    let ax = 0, ay = 0, ok = false;
    if (Math.hypot(I.mx, I.my) > 0.2) P.faceA = Math.atan2(I.my, I.mx);
    if (P.faceA == null) P.faceA = P.face < 0 ? Math.PI : 0;
    if (mode === "mouse" && I.hasMouse && !I.touch) {
      const wx = G.cam.x - G.vw / 2 + I.aimSX * G.vw, wy = G.cam.y - G.vh / 2 + I.aimSY * G.vh;
      ax = wx - P.x; ay = wy - P.y; ok = true;
    }
    if (!ok && mode === "auto") {
      const t = nearest(P.x, P.y, 260);
      if (t) { ax = t.x - P.x; ay = t.y - P.y; ok = true; }
    }
    if (!ok) { ax = Math.cos(P.faceA); ay = Math.sin(P.faceA); }
    P.aimA = Math.atan2(ay, ax);
    P.atkHeld = I.held.has("attack") || I.consume("attackTap");
  }
  function dash() {
    const P = G.P, I = MA.Input;
    if (P.dashN <= 0 || P.dashT > 0) return;
    let dx = I.mx, dy = I.my;
    if (!dx && !dy) { dx = Math.cos(P.aimA); dy = Math.sin(P.aimA); }
    const l = Math.hypot(dx, dy) || 1;
    const sp = 260 * (1 + 0.1 * (P.passives.dashup || 0));
    P.dvx = dx / l * sp; P.dvy = dy / l * sp; P.dashT = 0.17;
    P.dashN--; if (P.dashCd <= 0) P.dashCd = 1.2;
    P.iT = Math.max(P.iT, 0.3);
    MA.Audio.sfx("dash");
    fx({ type: "dust", x: P.x, y: P.y + 4, t: 0, dur: 0.3 });
    MA.W.onDash && MA.W.onDash();
  }

  /* ══════════════════════════════════════════════════════════════
     プレイヤー
     ══════════════════════════════════════════════════════════════ */
  function updatePlayer(dt) {
    const P = G.P, I = MA.Input, st = P.st, map = G.map;
    if (!P.alive) return;
    /* ダッシュの回復 */
    if (P.dashN < st.dashMax) { P.dashCd -= dt; if (P.dashCd <= 0) { P.dashN++; P.dashCd = P.dashN < st.dashMax ? 1.2 : 0; } }
    let spd = st.spd * (P.buffs.haste ? 1.15 : 1) * (P.buffs.gale ? (1 + P.buffs.gale.v) : 1);
    if (P.taintSlow) spd *= 0.85;
    let tvx = I.mx * spd, tvy = I.my * spd;
    /* 滑る床（氷）＝ゆっくり加速・ゆっくり止まる */
    const tile = M().tileAt(map, P.x, P.y);
    const slip = tile === M().T.ICE;
    const k = slip ? 2.2 : 18;
    P.vx += (tvx - P.vx) * Math.min(1, k * dt); P.vy += (tvy - P.vy) * Math.min(1, k * dt);
    let mvx = P.vx, mvy = P.vy;
    if (P.dashT > 0) { P.dashT -= dt; mvx = P.dvx; mvy = P.dvy; if (P.dashT <= 0) MA.W.onDashEnd && MA.W.onDashEnd(); }
    /* 重力の渦（星天）：引き寄せ */
    if (G.pull) { mvx += G.pull.x; mvy += G.pull.y; }
    moveCircle(P, mvx * dt, mvy * dt, true);
    P.moving = Math.hypot(I.mx, I.my) > 0.1;
    /* ★ 蔦の封印に向かって歩きつづけると切り払える（スマホでも狙わずに進める） */
    if (P.moving) {
      const fx2 = P.x + I.mx * (P.r + 4), fy2 = P.y + I.my * (P.r + 4);
      if (M().tileAt(map, fx2, fy2) === M().T.VINE) {
        P.cutT = (P.cutT || 0) + dt;
        if (P.cutT > 0.5) { P.cutT = 0; breakTile(fx2, fy2); toast("蔦の封印を切り払った", "#5fd86a"); }
        else if (Math.floor(P.cutT * 10) % 2 === 0) fx({ type: "spark", x: fx2, y: fy2, t: 0, dur: 0.15, col: "#7fe060" });
      } else P.cutT = 0;
    }
    if (P.moving) { P.walkT += dt; if (Math.abs(I.mx) > 0.1) P.face = I.mx > 0 ? 1 : -1; }
    else if (Math.abs(Math.cos(P.aimA)) > 0.2) P.face = Math.cos(P.aimA) > 0 ? 1 : -1;
    /* ★★ 2026-10-05 横に走るときは横向きの絵（ご指定）。ななめでも横の成分が大きければ横向き */
    P.side = P.moving && Math.abs(I.mx) > Math.abs(I.my) * 0.8;
    if (P.iT > 0) P.iT -= dt;
    if (P.hurtT > 0) P.hurtT -= dt;
    /* 回復・MP */
    if (st.regen > 0) heal(st.regen * dt, true);
    P.mp = Math.min(st.mmp, P.mp + st.mpRegen * dt);
    if (P.skillCd > 0) P.skillCd -= dt;
    if (P.burstCd > 0) P.burstCd -= dt;
    if (P.buffs.artRegen) heal(st.hp * P.buffs.artRegen.v * dt, true);
    /* ★★ 2026-10-07 ヒバナ「勿忘草の加護」：毎秒 最大HPの1%を回復 */
    if (P.C.passive.kind === "wasurena" && P.hp > 0) heal(st.hp * P.C.passive.regen * dt, true);
    /* 特性「闘志」：まわりの敵の数（0.25秒ごとに数える） */
    if (P.traitK && P.traitK.kind === "fervor") { G.fervT = (G.fervT || 0) - dt; if (G.fervT <= 0) { G.fervT = 0.25; P.fervorN = enemiesIn(P.x, P.y, P.traitK.r).length; } }
    /* 戦闘中（近くに敵がいる）は必殺技ゲージが時間でもたまる（単体のボス戦でも撃てるように） */
    if (P.ultG < 100) { G.ultNearT = (G.ultNearT || 0) - dt; if (G.ultNearT <= 0) { G.ultNearT = 0.25; G.ultNear = !!nearest(P.x, P.y, 260); } if (G.ultNear) P.ultG = Math.min(100, P.ultG + 0.7 * dt * (1 + (st.ultCharge || 0))); }
    Object.keys(P.buffs).forEach((b) => { const x = P.buffs[b]; x.t -= dt; if (x.t <= 0) { delete P.buffs[b]; if (x.re) recompute(); } });
    /* コトリ：HP40%未満でバリア */
    if (P.C.passive.kind === "guardian") { if (P.guardCd > 0) P.guardCd -= dt; else if (P.hp < st.hp * P.C.passive.hp) { P.shield = Math.max(P.shield, Math.round(st.hp * (P.C.passive.shield + (st.passive ? 0.1 : 0)))); P.guardCd = P.C.passive.cd; pop(P.x, P.y - 22, "BARRIER", "#7fd0ff"); MA.Audio.sfx("heal"); } }
  }
  /* 円を動かして壁で止める（軸ごと） */
  function moveCircle(o, dx, dy, isPlayer) {
    const map = G.map;
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 4));
    for (let i = 0; i < steps; i++) {
      o.x += dx / steps;
      let p = M().collideCircle(map, o.x, o.y, o.r);
      o.x += p[0]; o.y += p[1];
      o.y += dy / steps;
      p = M().collideCircle(map, o.x, o.y, o.r);
      o.x += p[0]; o.y += p[1];
    }
    /* 隠し壁・蔦にぶつかったダッシュはこわす */
    if (isPlayer && G.P.dashT > 0) {
      const ax = o.x + Math.sign(G.P.dvx) * (o.r + 3), ay = o.y + Math.sign(G.P.dvy) * (o.r + 3);
      const t = M().tileAt(map, ax, ay);
      if (t === M().T.SECRET) breakTile(ax, ay);
    }
  }
  function breakTile(px, py) {
    const map = G.map, T = M().T;
    const tx = Math.floor(px / 16), ty = Math.floor(py / 16);
    const t = map.tiles[ty * map.W + tx];
    if (t !== T.SECRET && t !== T.VINE) return false;
    /* 同じ種類でつながっているところをまとめてこわす */
    const q = [[tx, ty]], seen = new Set();
    while (q.length) {
      const [x, y] = q.pop(); const k = y * map.W + x;
      if (seen.has(k) || map.tiles[k] !== t) continue; seen.add(k);
      map.tiles[k] = T.FLOOR;
      q.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      fx({ type: "burst", x: x * 16 + 8, y: y * 16 + 8, t: 0, dur: 0.35, col: t === T.VINE ? "#5fd86a" : "#c8c0e0" });
    }
    MA.Render.dirtyMap && MA.Render.dirtyMap();
    MA.Audio.sfx("boom");
    if (t === T.SECRET) { toast("隠し部屋を見つけた！", "#ffd84a"); G.stats.secret++; ach("secret"); }
    return true;
  }

  /* ── ダメージ・回復 ── */
  function heal(n, silent) {
    const P = G.P;
    if (G.rule && G.rule.noHeal && !silent) return;
    const before = P.hp;
    P.hp = Math.min(P.st.hp, P.hp + n * (silent ? 1 : P.st.healMul));
    if (!silent && P.hp > before) pop(P.x, P.y - 20, "+" + Math.round(P.hp - before), "#7dffb0");
  }
  function hurtPlayer(dmg, src) {
    const P = G.P;
    if (!P.alive || P.iT > 0 || P.dashT > 0) return false;
    let d = dmg * P.st.dmgIn * (60 / (60 + Math.max(0, P.st.def) * 4));
    /* ★★ 2026-10-05 属性の相性（敵 → キャラ）：有利な敵からは ×1.2・不利な敵からは ×0.85 */
    const sEl = src && (src.el || (src.src && src.src.el));
    if (sEl) { const r = D().elemRel(sEl, P.C.el); if (r === "adv") d *= 1.2; else if (r === "dis") d *= 0.85; }
    /* 特性「不屈」 */
    if (P.traitK && P.traitK.kind === "undaunted" && P.hp < P.st.hp * P.traitK.under) d *= 1 - P.traitK.k;
    /* 前衛の守り：近接で戦うキャラ（ムツミ・カグラ・アズサ）は被ダメージ −15%（敵のそばに立つぶん） */
    if (P.C.type === "melee" || P.C.sub === "melee") d *= 0.85;
    if (Math.random() * 100 < P.st.eva * 0.5) {
      pop(P.x, P.y - 22, "MISS", "#c8c8d8"); P.iT = 0.2;
      /* 特性「見切り」：よけたあと必ず会心／「舞踏」：よけたあと攻撃速度アップ */
      if (P.traitK && P.traitK.kind === "insight") P.focus = Math.max(P.focus || 0, P.traitK.crits);
      if (P.traitK && P.traitK.kind === "dance") P.buffs.dance = { t: P.traitK.t, v: P.traitK.aspd };
      return false;
    }
    if (P.shield > 0) {
      const a = Math.min(P.shield, d); P.shield -= a; d -= a;
      if (P.st.thorns && src && src.hp != null) damageEnemy(src, a * P.st.thorns, { el: "water", noCrit: 1 });
      if (d <= 0) { P.iT = 0.25; fx({ type: "ring", x: P.x, y: P.y, t: 0, dur: 0.25, r: 14, col: "#7fd0ff" }); return true; }
    }
    d = Math.max(1, Math.round(d));
    P.hp -= d; G.stats.taken += d;
    if (G.bossActive) G.stats.bossHitTaken += d;
    P.iT = 0.55; P.hurtT = 0.25;
    G.shake = Math.max(G.shake, 4); G.flash = 0.35; G.flashCol = "#ff3050";
    pop(P.x, P.y - 22, "-" + d, "#ff5a6a", { big: d > P.st.hp * 0.15 });
    MA.Audio.sfx("hurt");
    if (MA.Save.S.set.vib && navigator.vibrate) try { navigator.vibrate(25); } catch (e) {}
    if (P.hp <= 0) die();
    return true;
  }
  function die() {
    const P = G.P;
    if (P.passives.revive && !P.revUsed) { P.revUsed = 1; P.hp = Math.round(P.st.hp * 0.5); P.iT = 2.5; toast("不死鳥の羽で起き上がった！", "#ff8a3d"); burstAround(P.x, P.y, 140, P.st.atk * 6, "fire"); return; }
    if (P.elixir > 0) { P.elixir--; P.hp = P.st.hp; P.iT = 2.5; toast("エリクサーで全回復！", "#ffd84a"); burstAround(P.x, P.y, 140, P.st.atk * 5, "light"); return; }
    P.hp = 0; P.alive = false;
    G.slow = 1.2;
    /* ★ その探索のときだけ結果へ（すぐ次の探索を始めても、前の「倒れた」が漏れない） */
    const rid = G.runId;
    setTimeout(() => { if (G.runId === rid) endRun("defeat"); }, 1300);
  }
  function burstAround(x, y, r, dmg, el) {
    enemiesIn(x, y, r).forEach((e) => damageEnemy(e, dmg, { el, kb: 30, kx: e.x - x, ky: e.y - y }));
    fx({ type: "ring", x, y, t: 0, dur: 0.45, r, col: D().ELEM[el].c });
    MA.Audio.sfx("boom");
  }

  /* ══════════════════════════════════════════════════════════════
     敵へのダメージ（ここが唯一の入口。属性・会心・状態異常・ゲージ・数字）
     opt: { el, crit(固定), noCrit, kb, kx, ky, burn, slow, stun, src, noChain, mul, fromChain, skill, noFx, col }
     ══════════════════════════════════════════════════════════════ */
  function damageEnemy(e, amount, opt) {
    if (!e || e.dead || e.invuln) return 0;
    opt = opt || {};
    const P = G.P, st = P.st;
    const el = opt.el || P.C.el;
    let d = amount * st.dmgOut;
    /* 属性の相性（XEVARION と同じ：有利 ×1.25・不利 ×0.75）。塗りかえ中（ヒナノ）は水になる */
    const defEl = e.paintT > 0 ? e.paintEl : e.el;
    let em = D().elemMul(el, defEl);
    if (P.C.el2 && el === P.C.el) em = Math.max(em, D().elemMul(P.C.el2, defEl));
    d *= em;
    d *= st.elDmg[el] || 1;
    /* 有利・不利はその敵に初めて当てたときだけ文字で知らせる */
    if (!opt.fromChain && !opt.noFx && !e.relShown && defEl && em !== 1) { e.relShown = 1; pop(e.x, e.y - e.r - 12, em > 1 ? "有利！" : "不利…", em > 1 ? "#ffd84a" : "#9a9ab0"); }
    /* 特性 */
    const TK = P.traitK;
    if (TK) {
      if (TK.kind === "kindle" && e.burnT > 0) d *= 1 + TK.vsBurn;
      if (TK.kind === "fervor" && P.fervorN) d *= 1 + Math.min(TK.max, TK.per * P.fervorN);
      if (TK.kind === "concert" && opt.src === "summon") d *= 1 + TK.summon;
    }
    /* 受けるダメージが増える状態 */
    if (e.vulT > 0) d *= 1 + e.vulK;
    if (e.defDownT > 0) d *= 1.25;
    if (e.breakT > 0) d *= 2;
    if (P.buffs.fanfare) d *= 1 + P.buffs.fanfare.v;
    if (P.C.passive.kind === "backwater" || P.C.passive.kind === "wasurena") { const lost = 1 - P.hp / st.hp; d *= 1 + Math.min(P.C.passive.max + (st.passive ? 0.1 : 0), lost * P.C.passive.per); }   /* ★★ 2026-10-07 ヒバナ「勿忘草の加護」も同じ式 */
    /* 守り（防御型・ボスの装甲）：光は無視する */
    if (e.guardOn && el !== "light") d *= 1 - e.guardK;
    if (e.boss && e.armor) d *= e.armor;
    /* 会心 */
    let crit = false;
    if (!opt.noCrit) {
      let cr = st.crit, cd = st.critDmg;
      if (TK && TK.kind === "clutch" && P.hp < st.hp * 0.5) { cr += TK.crit; cd += TK.critDmg; }
      if (P.focus > 0 && opt.src === "atk") { cr = 100; }
      crit = opt.crit || Math.random() * 100 < cr;
      if (crit) d *= cd;
      /* ★★ 2026-10-07 フキ「宵闇の残影」：会心で防御ダウン＋必殺技ゲージ+1 */
      if (crit && P.C.passive.kind === "yoiyami") { e.defDownT = Math.max(e.defDownT || 0, P.C.passive.t + (st.passive ? 1 : 0)); P.ultG = Math.min(100, P.ultG + 1); }
    }
    if (opt.src === "atk" && P.focus > 0) P.focus--;
    d = Math.max(1, d);
    e.hp -= d;
    e.hitT = 0.12;
    G.stats.dmg += d;
    if (G.dbg) { const k = opt.src || "other"; G.dbg[k] = (G.dbg[k] || 0) + d; }   /* 調整用の内訳（ふだんは null） */
    /* 必殺技ゲージ：当たり1回で「攻撃力の何倍か」×0.45（最大×2.2）。
       ★ 1秒にたまる量は 5 まで（G.gTok）＝範囲攻撃で一瞬にたまって連発にならない。時間でも少しずつ（updatePlayer） */
    if (!opt.noGauge && G.gTok > 0) { const add = Math.min(G.gTok, 0.45 * Math.min(2.2, d / Math.max(1, st.atk))); G.gTok -= add; P.ultG = Math.min(100, P.ultG + add * (1 + (st.ultCharge || 0))); }
    /* ドレイン */
    if (st.drain > 0 && !opt.noDrain) heal(d * st.drain, true);
    /* ふっとばし */
    if (opt.kb && !e.boss && !e.heavy) {
      const l = Math.hypot(opt.kx || 0, opt.ky || 0) || 1;
      e.kbx = (opt.kx || 0) / l * opt.kb * 6; e.kby = (opt.ky || 0) / l * opt.kb * 6;
    }
    /* 属性の追加効果（星脈の調律で強くなる） */
    const aff = st.elem;
    if (!opt.fromChain) {
      /* 火＝燃焼／水＝減速／木＝連撃（もう一度）／光＝連鎖／闇＝吸収・追撃 */
      if (el === "fire" && (opt.burn || Math.random() < 0.3 * aff)) { e.burnT = 3; e.burnDps = Math.max(e.burnDps || 0, d * 0.18 * aff * (TK && TK.kind === "kindle" ? 1 + TK.burn : 1)); }
      if (el === "water" && (opt.slow || Math.random() < 0.5)) { e.slowT = 1.6; e.slowK = Math.min(0.7, 0.3 * aff + (opt.slow || 0)); }
      if (el === "wood" && Math.random() < 0.18 * aff) G.queue.push({ at: G.t + 0.12, f: () => damageEnemy(e, d * 0.5, { el, fromChain: 1, noCrit: 1, col: "#7fe8a8" }) });
      if (el === "light" && !opt.noChain && Math.random() < 0.2 * aff) chainFrom(e, 2, d * 0.5, "light");
      if (el === "dark") { heal(d * 0.015 * aff, true); if (Math.random() < 0.15 * aff) G.queue.push({ at: G.t + 0.3, f: () => damageEnemy(e, d * 0.4, { el, fromChain: 1, noCrit: 1 }) }); }
    }
    if (opt.stun) e.stunT = Math.max(e.stunT || 0, opt.stun);
    /* 共鳴の連鎖（chain 型） */
    if (!opt.noChain && !opt.fromChain) MA.W.onHit && MA.W.onHit(e, d, el, opt);
    /* レイナ：倒したあとの連鎖 */
    if (P.chainT > 0 && !opt.noChain && !opt.fromChain && opt.src === "atk") chainFrom(e, 1 + (st.chain || 0), d * 0.6, el);
    /* 数字 */
    if (MA.Save.S.set.dmgNum && !opt.noFx) num(e.x + (Math.random() - 0.5) * 6, e.y - e.r - 4, d, crit, opt.col || (crit ? "#ffd84a" : el === P.C.el ? "#ffffff" : D().ELEM[el].c));
    if (crit) MA.Audio.sfx("crit"); else MA.Audio.sfx("hit");
    if (e.hp <= 0) killEnemy(e, el);
    return d;
  }
  function chainFrom(e, n, dmg, el) {
    let cur = e; const done = new Set([e.id]);
    for (let i = 0; i < n; i++) {
      const nx = nearest(cur.x, cur.y, 90, (o) => done.has(o.id));
      if (!nx) break;
      done.add(nx.id);
      fx({ type: "bolt", x: cur.x, y: cur.y, x2: nx.x, y2: nx.y, t: 0, dur: 0.18, col: D().ELEM[el].c });
      const c = cur; cur = nx;
      damageEnemy(nx, dmg, { el, fromChain: 1, noCrit: 1 });
      if (el === "light") MA.Audio.sfx("zap");
      void c;
    }
  }
  function killEnemy(e, el) {
    if (e.dead) return;
    if (e.isGim) {
      /* ボスのギミック（蔦の封印など）：経験値・図鑑は無し */
      e.dead = true; e.hp = 0;
      fx({ type: "burst", x: e.x, y: e.y, t: 0, dur: 0.5, col: "#ffd84a" });
      MA.Audio.sfx("boom");
      if (e.onDeath) e.onDeath(e);
      return;
    }
    e.dead = true; e.hp = 0;
    const P = G.P;
    G.stats.kills++; P.kills++; G.floorKills = (G.floorKills || 0) + 1;
    MA.Save.S.codex.en[e.k] = (MA.Save.S.codex.en[e.k] || 0) + 1;
    MA.Audio.sfx("kill");
    fx({ type: "poof", x: e.x, y: e.y, t: 0, dur: 0.35, col: e.d.col || "#ffffff", r: e.r });
    P.ultG = Math.min(100, P.ultG + (e.boss ? 30 : e.elite ? 8 : 0.6) * (1 + (P.st.ultCharge || 0)));
    /* 経験値・ドロップ */
    if (!e.summoned || Math.random() < 0.4) {
      const exp = (e.d.exp || 1) * (e.elite ? 1 : 1);
      dropGem(e.x, e.y, exp);
      if (Math.random() < 0.08 + (e.elite ? 0.9 : 0)) drop(e.x + 6, e.y, "coin", Math.round((3 + G.goldMul * 2) * (e.elite ? 6 : 1) * ((G.modeDef && G.modeDef.gold) || 1)));
      if (!(G.rule && G.rule.noHeal) && Math.random() < (e.elite ? 0.6 : 0.012)) drop(e.x - 6, e.y, "heal", 0.2);
      if (Math.random() < (e.elite ? 1 : 0.02)) drop(e.x, e.y + 6, "mat", 1);
      if (Math.random() < 0.0025) drop(e.x, e.y - 6, "magnet", 1);
    }
    /* キャラのパッシブ */
    MA.W.onKill && MA.W.onKill(e, el);
    if (e.elite && !e.boss) { G.stats.elites++; if (!e.mid) { const c = { kind: "chest", x: e.x, y: e.y, tier: 1, done: false, dyn: 1 }; G.map.objects.push(c); } }
    if (e.mid) onMidKilled(e);
    if (e.boss) MA.Boss && MA.Boss.onKilled(e);
    if (e.onDeath) e.onDeath(e);
    G.slowKillT = 0;
  }
  function dropGem(x, y, exp) {
    exp *= (G.muts.bounty ? G.muts.bounty.exp : 1) * ((G.rule && G.rule.exp) || 1) * (G.mode === "abyss" ? 1.4 : 1);
    /* 近くの小さな宝石とまとめる（数が増えすぎない） */
    if (G.PK.length > 260) { const g = G.PK.find((p) => p.k === "gem" && dist2(p.x, p.y, x, y) < 60 * 60); if (g) { g.v += exp; return; } }
    G.PK.push({ k: "gem", x: x + (Math.random() - 0.5) * 6, y: y + (Math.random() - 0.5) * 6, v: exp, t: 0 });
  }
  function drop(x, y, k, v) { G.PK.push({ k, x, y, v, t: 0, vy: -40 }); }

  /* ══════════════════════════════════════════════════════════════
     敵
     ══════════════════════════════════════════════════════════════ */
  function enemyScale() {
    const min = G.t / 60;
    /* ★ ウォームアップ：はじめは敵が少し弱く（0.55倍）、約2分で本来の強さに。
         探索 Lv1 のうちに上位の迷宮の待ち伏せに囲まれて、開始10〜40秒で倒れていた（早回しの実測）。深淵の2階からは無し */
    const warm = G.mode === "abyss" && G.floor > 1 ? 1 : Math.min(1, 0.55 + G.t / 240);
    const MD = G.modeDef || { hp: 1, atk: 1 };
    let hp = G.levelMul * warm * (1 + 0.06 * min) * (G.muts.bounty ? G.muts.bounty.hp : 1) * MD.hp;
    let atk = G.levelMul * warm * (1 + 0.035 * min) * MD.atk;
    if (G.mode === "dungeon" && G.t > 30 * 60 && !G.bossDone) { hp *= 1.5; atk *= 1.4; }
    return { hp, atk };
  }
  function spawnEnemy(k, x, y, opt) {
    opt = opt || {};
    const d = D().ENEMIES[k] || D().BOSSES[k];
    if (!d) return null;
    const sc = enemyScale();
    const elite = !!(opt.elite || d.elite);
    const hpMul = (opt.hpMul || 1) * (elite && !d.elite ? 6 : 1);
    const e = {
      id: uid++, k, d, x, y, vx: 0, vy: 0, r: d.r * (opt.scale || d.scale || 1) * (elite && !d.elite ? 1.4 : 1),
      hp: Math.round(d.hp * sc.hp * hpMul), atk: d.atk * sc.atk * (opt.atkMul || 1) * (elite && !d.elite ? 1.6 : 1),
      spd: d.spd * (G.muts.warp ? G.muts.warp.speed : 1) * ((G.rule && G.rule.speed) || 1) * (opt.spdMul || 1) * (0.9 + G.rnd() * 0.2),
      el: d.el, ai: opt.ai || d.ai, st: "move", stT: 0, cd: 1 + G.rnd() * 2, elite, boss: !!opt.boss, mid: !!opt.mid,
      hitT: 0, kbx: 0, kby: 0, touchCd: 0, face: 1, animT: G.rnd() * 10, scale: (opt.scale || d.scale || 1) * (elite && !d.elite ? 1.4 : 1),
      summoned: !!opt.summoned, room: opt.room, guardOn: false, guardK: d.guard || 0, heavy: elite || !!opt.boss,
    };
    /* ★ エリート・中ボスは探索中のレベルに合わせる（Lv2 で宝物庫の番人に入って即倒れていた／後半は弱すぎた）
         体力 ×(0.45＋0.055×Lv)（Lv10 で等倍・最大1.5倍）・攻撃 ×(0.6＋0.04×Lv)（最大1.2倍）。ボスは ma-boss.js で別に決める */
    if ((elite || opt.mid) && !opt.boss && G.P) {
      const lv = G.P.lv || 1;
      e.hp = Math.max(1, Math.round(e.hp * Math.min(1.5, 0.45 + 0.055 * lv)));
      e.atk *= Math.min(1.2, 0.6 + 0.04 * lv);
    }
    e.mhp = e.hp;
    e.art = MA.Art.sprite(d.art, d.col);
    if (opt.boss) { e.boss = true; e.invuln = !!opt.invuln; }
    G.E.push(e);
    return e;
  }
  function updateEnemies(dt) {
    const P = G.P;
    const ts = G.timeStopT > 0;
    for (let i = 0; i < G.E.length; i++) {
      const e = G.E[i];
      if (e.dead) continue;
      e.animT += dt;
      if (e.hitT > 0) e.hitT -= dt;
      /* 状態異常 */
      if (e.burnT > 0) { e.burnT -= dt; e.burnAcc = (e.burnAcc || 0) + dt; if (e.burnAcc >= 0.5) { e.burnAcc = 0; damageEnemy(e, e.burnDps * 0.5, { el: "fire", fromChain: 1, noCrit: 1, noGauge: 1, col: "#ff9a5a" }); if (e.dead) continue; } }
      if (e.slowT > 0) e.slowT -= dt;
      if (e.stunT > 0) { e.stunT -= dt; e.kbx *= 0.8; e.kby *= 0.8; moveEnemy(e, e.kbx * dt, e.kby * dt); continue; }
      if (e.vulT > 0) e.vulT -= dt;
      if (e.defDownT > 0) e.defDownT -= dt;
      if (e.paintT > 0) e.paintT -= dt;
      if (e.breakT > 0) { e.breakT -= dt; continue; }
      if (ts && !e.boss) continue;
      const slowK = e.slowT > 0 ? 1 - e.slowK : 1;
      /* ふっとばし */
      if (Math.abs(e.kbx) + Math.abs(e.kby) > 1) { moveEnemy(e, e.kbx * dt, e.kby * dt); e.kbx *= 0.85; e.kby *= 0.85; }
      if (e.boss || e.isGim) continue;   // ボスは ma-boss.js・ギミックは動かない
      MA.AI.step(e, dt, slowK);
      /* 体当たり */
      if (e.touchCd > 0) e.touchCd -= dt;
      if (e.st !== "recover" && e.touchCd <= 0 && dist2(e.x, e.y, P.x, P.y) < (e.r + P.r) * (e.r + P.r)) {
        if (hurtPlayer(e.atk * (e.st === "dash" ? 1.6 : 1), e)) e.touchCd = 0.8;
      }
    }
    /* 押し合い（重なりすぎない） */
    if (G.frame % 2 === 0) for (let i = 0; i < G.E.length; i++) {
      const a = G.E[i]; if (a.dead || a.boss || a.isGim) continue;
      eachNear(a.x, a.y, 24, (b) => {
        if (b === a || b.boss || b.isGim) return;
        const dx = a.x - b.x, dy = a.y - b.y, rr = (a.r + b.r) * 0.9, d2 = dx * dx + dy * dy;
        if (d2 > 0 && d2 < rr * rr) { const d = Math.sqrt(d2), p = (rr - d) * 0.25; a.x += dx / d * p; a.y += dy / d * p; }
      });
    }
    /* 片づけ */
    if (G.frame % 30 === 0) G.E = G.E.filter((e) => !e.dead);
  }
  function moveEnemy(e, dx, dy) {
    e.x += dx;
    let p = M().collideCircle(G.map, e.x, e.y, Math.min(e.r, 7)); e.x += p[0]; e.y += p[1];
    e.y += dy;
    p = M().collideCircle(G.map, e.x, e.y, Math.min(e.r, 7)); e.x += p[0]; e.y += p[1];
  }

  /* ══ プレイヤーの弾・敵の弾 ══ */
  function updateProjectiles(dt) {
    for (let i = G.PB.length - 1; i >= 0; i--) {
      const b = G.PB[i]; if (!b) continue;
      b.life -= dt; b.t = (b.t || 0) + dt;
      if (b.update) b.update(b, dt);
      if (b.homing) {
        let tg = b.tgt && !b.tgt.dead ? b.tgt : null;
        if (!tg) { tg = nearest(b.x, b.y, 200); b.tgt = tg; }
        if (tg) { const a = Math.atan2(tg.y - b.y, tg.x - b.x), sp = Math.hypot(b.vx, b.vy); const ca = Math.atan2(b.vy, b.vx); let da = a - ca; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU; const na = ca + clamp(da, -b.homing * dt, b.homing * dt); b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp; }
      }
      if (b.curve) { const ca = Math.atan2(b.vy, b.vx) + b.curve * dt, sp = Math.hypot(b.vx, b.vy); b.vx = Math.cos(ca) * sp; b.vy = Math.sin(ca) * sp; }
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (!b.ghost && M().solidAt(G.map, b.x, b.y)) {
        const t = M().tileAt(G.map, b.x, b.y);
        if (t === M().T.VINE || t === M().T.SECRET) hitTile(b.x, b.y, b.dmg);
        if (b.onWall) b.onWall(b); else b.life = 0;
      }
      if (b.life > 0) {
        const hr = b.r;
        eachNear(b.x, b.y, hr + 16, (e) => {
          if (b.life <= 0) return false;
          const rr = hr + e.r;
          if (dist2(b.x, b.y, e.x, e.y) > rr * rr) return;
          b.hit = b.hit || new Map();
          const last = b.hit.get(e.id);
          if (last != null && (b.rehit == null || G.t - last < b.rehit)) return;
          b.hit.set(e.id, G.t);
          damageEnemy(e, b.dmg, { el: b.el, kb: b.kb, kx: b.vx, ky: b.vy, src: b.src, burn: b.burn, slow: b.slow, stun: b.stun });
          if (b.onHit) b.onHit(b, e);
          if (b.pierce != null) { b.pierce--; if (b.pierce < 0) b.life = 0; }
        });
      }
      if (b.life <= 0) { if (b.onEnd) b.onEnd(b); G.PB.splice(i, 1); }
    }
    if (G.PB.length > 400) G.PB.splice(0, G.PB.length - 400);
  }
  function hitTile(px, py, dmg) {
    const k = Math.floor(px / 16) + "," + Math.floor(py / 16);
    G.tileHp = G.tileHp || {};
    G.tileHp[k] = (G.tileHp[k] || 40) - Math.max(5, dmg * 0.2);
    if (G.tileHp[k] <= 0) breakTile(px, py);
  }
  function updateEnemyBullets(dt) {
    const P = G.P;
    const ts = G.timeStopT > 0;
    for (let i = G.EB.length - 1; i >= 0; i--) {
      const b = G.EB[i]; if (!b) continue;
      if (b.hold > 0) { b.hold -= dt; continue; }
      if (!ts) { b.life -= dt; if (b.acc) { b.vx *= 1 + b.acc * dt; b.vy *= 1 + b.acc * dt; } if (b.curve) { const a = Math.atan2(b.vy, b.vx) + b.curve * dt, s = Math.hypot(b.vx, b.vy); b.vx = Math.cos(a) * s; b.vy = Math.sin(a) * s; } b.x += b.vx * dt; b.y += b.vy * dt; }
      if (!b.ghost && M().solidAt(G.map, b.x, b.y)) b.life = 0;
      /* 水の壁（コトリ）・アクア・フープ・バリアで止まる */
      if (P.wall && b.life > 0) { const w = P.wall; const dx = b.x - w.x, dy = b.y - w.y; if (Math.abs(dx * Math.cos(w.a) + dy * Math.sin(w.a)) < 6 && Math.abs(-dx * Math.sin(w.a) + dy * Math.cos(w.a)) < w.len / 2) { b.life = 0; fx({ type: "spark", x: b.x, y: b.y, t: 0, dur: 0.2, col: "#7fd0ff" }); } }
      if (b.life > 0 && dist2(b.x, b.y, P.x, P.y) < (b.r + P.r) * (b.r + P.r)) { if (hurtPlayer(b.dmg, b.src)) b.life = 0; }
      if (b.life <= 0) G.EB.splice(i, 1);
    }
    if (G.EB.length > 500) G.EB.splice(0, G.EB.length - 500);
  }
  function ebullet(o) { o.life = o.life || 4; o.r = o.r || 3; G.EB.push(o); return o; }
  function pbullet(o) { o.life = o.life || 1.5; o.r = o.r || 3; G.PB.push(o); return o; }

  /* ══ 予告（床に出る赤い範囲）══
     shape: circle / line / cone / ring / rect。dur のあいだ表示 → onFire（そこで当たり判定） */
  function telegraph(o) { o.t = 0; o.col = o.col || "#ff3050"; G.TG.push(o); MA.Audio.sfx("warn"); return o; }
  function inShape(o, x, y, pad) {
    pad = pad || 0;
    if (o.shape === "circle") return dist2(o.x, o.y, x, y) <= (o.r + pad) * (o.r + pad);
    if (o.shape === "ring") { const d = Math.sqrt(dist2(o.x, o.y, x, y)); return d >= o.r2 - pad && d <= o.r + pad; }
    if (o.shape === "line") { const dx = x - o.x, dy = y - o.y, ca = Math.cos(o.ang), sa = Math.sin(o.ang); const along = dx * ca + dy * sa, side = -dx * sa + dy * ca; return along >= -pad && along <= o.len + pad && Math.abs(side) <= o.w / 2 + pad; }
    if (o.shape === "cone") { const dx = x - o.x, dy = y - o.y, d = Math.hypot(dx, dy); if (d > o.r + pad) return false; let da = Math.atan2(dy, dx) - o.ang; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU; return Math.abs(da) <= o.arc / 2; }
    if (o.shape === "rect") return x >= o.x - pad && x <= o.x + o.w + pad && y >= o.y - pad && y <= o.y + o.h + pad;
    return false;
  }
  function updateTelegraphs(dt) {
    const P = G.P;
    for (let i = G.TG.length - 1; i >= 0; i--) {
      const o = G.TG[i]; if (!o) continue;   /* ★ 途中でボスが倒れると TG が作り直される（短くなる）ので、無い番号は飛ばす */
      if (o.owner && o.follow && !o.owner.dead) { o.x = o.owner.x; o.y = o.owner.y; }
      o.t += dt;
      if (o.t >= o.dur) {
        G.TG.splice(i, 1);
        if (o.owner && o.owner.dead && !o.keep) continue;
        if (o.onFire) o.onFire(o);
        else if (o.dmg && inShape(o, P.x, P.y, P.r)) hurtPlayer(o.dmg, o.owner);
        fx({ type: "tgfire", shape: o.shape, x: o.x, y: o.y, r: o.r, r2: o.r2, ang: o.ang, len: o.len, w: o.w, arc: o.arc, rw: o.w, rh: o.h, t: 0, dur: 0.25, col: o.fireCol || "#ffb0a0" });
      }
    }
  }
  /* ══ 範囲（残り続けるもの）══ */
  function zone(o) { o.t = 0; o.tick = o.tick || 0.25; o.acc = 0; G.ZN.push(o); return o; }
  function updateZones(dt) {
    const P = G.P;
    for (let i = G.ZN.length - 1; i >= 0; i--) {
      const z = G.ZN[i]; if (!z) continue;
      z.t += dt; z.acc += dt;
      if (z.follow) { z.x = P.x; z.y = P.y; }
      if (z.acc >= z.tick) {
        z.acc = 0;
        if (z.side === "enemy") { if (dist2(z.x, z.y, P.x, P.y) < (z.r + P.r) * (z.r + P.r)) { if (z.dmg) hurtPlayer(z.dmg, null); if (z.dark) G.darkT = Math.max(G.darkT, 1.5); if (z.slowP) P.taintSlowT = 0.5; } }
        else enemiesIn(z.x, z.y, z.r).forEach((e) => { damageEnemy(e, z.dmg, { el: z.el, noGauge: !z.gauge, slow: z.slow, burn: z.burn, src: z.src || "zone", noFx: z.quiet }); if (z.pull && !e.boss) { const a = Math.atan2(z.y - e.y, z.x - e.x); moveEnemy(e, Math.cos(a) * 6, Math.sin(a) * 6); } });
      }
      if (z.t >= z.dur) G.ZN.splice(i, 1);
    }
    P.taintSlow = (P.taintSlowT = (P.taintSlowT || 0) - dt) > 0;
  }

  /* ══ 拾うもの ══ */
  function updatePickups(dt) {
    const P = G.P;
    const mr = 48 * P.st.magnet;
    for (let i = G.PK.length - 1; i >= 0; i--) {
      const p = G.PK[i]; if (!p) continue;
      p.t += dt;
      if (p.vy) { p.y += p.vy * dt; p.vy += 200 * dt; if (p.vy > 0 && p.t > 0.3) p.vy = 0; }
      const d2 = dist2(p.x, p.y, P.x, P.y);
      if (p.mag || d2 < mr * mr || G.magnetAll > 0) {
        p.mag = true;
        const d = Math.sqrt(d2) || 1, sp = 140 + p.t * 60;
        p.x += (P.x - p.x) / d * sp * dt; p.y += (P.y - p.y) / d * sp * dt;
      }
      if (d2 < 10 * 10) { collect(p); G.PK.splice(i, 1); }
      else if (p.t > 120 && p.k === "gem" && !p.mag) { G.PK.splice(i, 1); }
    }
    if (G.magnetAll > 0) G.magnetAll -= dt;
  }
  function collect(p) {
    const P = G.P;
    if (p.k === "gem") { addExp(p.v); P.mp = Math.min(P.st.mmp, P.mp + 0.6); MA.Audio.sfx("gem"); }
    else if (p.k === "coin") { const g = Math.round(p.v * G.rewardMul); G.stats.gold += g; pop(P.x, P.y - 18, "+" + g + "G", "#ffd84a"); MA.Audio.sfx("coin"); }
    else if (p.k === "heal") { heal(P.st.hp * p.v); MA.Audio.sfx("heal"); }
    else if (p.k === "magnet") { G.magnetAll = 1.5; MA.Audio.sfx("key"); }
    else if (p.k === "mat") { const mats = G.mode === "abyss" ? ["abyss", "stone"] : G.dun.mats; const k = mats[(Math.random() * mats.length) | 0]; const n = Math.max(1, Math.round(p.v * (G.muts.bounty ? 1.5 : 1) * G.rewardMul)); G.stats.mats[k] = (G.stats.mats[k] || 0) + n; pop(P.x, P.y - 18, D().MATS[k].nm + " +" + n, D().MATS[k].c); MA.Audio.sfx("coin"); }
  }
  function addExp(v) {
    const P = G.P;
    P.exp += v * (1 + P.st.exp);
    while (P.exp >= P.need) {
      P.exp -= P.need; P.lv++; P.need = MA.Stats.expNeed(P.lv);
      G.stats.levels++; G.stats.maxLv = Math.max(G.stats.maxLv, P.lv);
      G.pendingLv = (G.pendingLv || 0) + 1;
    }
    if (G.pendingLv && !G.paused) openLevelUp();
  }
  function openLevelUp() {
    if (!G.pendingLv) return;
    G.pendingLv--;
    MA.Audio.sfx("levelup");
    if (G.P.lv >= 30) ach("lv30");
    if (G.P.lv >= 60) ach("lv60");
    const cards = MA.Cards.roll();
    pause("levelup");
    MA.UI.showLevelUp(cards);
  }
  /* カードを選んだあと（UI から） */
  function afterCard() {
    recompute();
    MA.W.refreshTags();
    if (G.pendingLv) { openLevelUp(); return; }
    resume();
  }

  /* ══════════════════════════════════════════════════════════════
     地図の物（宝箱・泉・祭壇・扉・鍵…）
     ══════════════════════════════════════════════════════════════ */
  function updateObjects(dt) {
    const P = G.P, map = G.map;
    G.near = null;
    for (const o of map.objects) {
      if (o.done && o.kind !== "warp" && o.kind !== "vent" && o.kind !== "gravity" && o.kind !== "retreat") continue;
      const d2 = dist2(o.x, o.y, P.x, P.y);
      if (o.kind === "chest" && d2 < 14 * 14 && !o.locked) { openChest(o); continue; }
      if (o.kind === "lore" && d2 < 14 * 14) { o.done = true; gainLore(); continue; }
      if (o.kind === "starShard" && d2 < 14 * 14) { if (G.timedRoom && G.timedRoom.left > 0) { o.done = true; G.timedRoom.ok = true; G.timedRoom.left = 0; giveKey("時間内に星の欠片を手に入れた"); } continue; }
      if (o.kind === "warp" && d2 < 10 * 10 && !(G.warpCd > 0)) { const to = map.objects[o.pair]; if (to) { P.x = to.x; P.y = to.y + 14; G.warpCd = 1.2; fx({ type: "ring", x: to.x, y: to.y, t: 0, dur: 0.4, r: 26, col: "#5ab8ff" }); MA.Audio.sfx("skill"); } continue; }
      if (["fountain", "altar", "spirit", "circle", "retreat", "purifier", "exit"].indexOf(o.kind) >= 0 && d2 < 26 * 26) { G.near = o; }
    }
    if (G.warpCd > 0) G.warpCd -= dt;
    /* 自動で使うもの（泉・出口）はスマホでも押さずに済むよう、近づいて少し待つと使う */
    if (G.near && (G.near.kind === "fountain") && !G.near.done) { G.nearT = (G.nearT || 0) + dt; if (G.nearT > 0.6) { interact(); G.nearT = 0; } } else G.nearT = 0;
  }
  function interact() {
    const o = G.near; if (!o) return;
    const P = G.P;
    if (o.kind === "fountain" && !o.done) { o.done = true; heal(P.st.hp * 0.6); P.mp = P.st.mmp; toast("回復の泉：HPとMPが回復した", "#7dffb0"); fx({ type: "ring", x: o.x, y: o.y, t: 0, dur: 0.6, r: 40, col: "#7dffb0" }); return; }
    if (o.kind === "retreat") { pause("event"); MA.UI.showRetreat(); return; }
    if (o.kind === "exit") { endRun(G.mode === "abyss" ? "floor" : "clear"); return; }
    if (o.kind === "purifier" && !o.done) { o.done = true; G.corruption = 0; toast("燭台の光で汚染がはらわれた", "#fff4b0"); return; }
    if (o.done) return;
    if (o.kind === "altar" || o.kind === "spirit" || o.kind === "circle") { pause("event"); MA.UI.showEvent(o); }
  }
  /* イベントの選択（UI から） */
  function eventChoice(o, k, extra) {
    const P = G.P;
    o.done = true;
    if (k === "absorb") { P.altarAtk = (P.altarAtk || 0) + 0.25; G.spawnMul = (G.spawnMul || 1) * 1.3; toast("星脈を吸収した：攻撃力+25%（敵が増える）", "#ff8fd0"); }
    if (k === "purify") { P.hp = P.st.hp; P.altarDef = (P.altarDef || 0) + 4; toast("星脈を浄化した：HP全回復・防御+4", "#7dffb0"); }
    if (k === "seal") { giveKey("祭壇を封印した"); const m = G.mode === "abyss" ? "abyss" : G.dun.mats[0]; G.stats.mats[m] = (G.stats.mats[m] || 0) + 4; }
    if (k === "trial") startTrial(o);
    if (k === "bless") { const c = MA.Cards.randomStat(); MA.Cards.apply(c); toast("祝福：" + c.nm + " を得た", "#c27bff"); }
    if (k === "seal_el") { MA.Cards.apply({ type: "stat", k: "seal_" + extra, rar: "R" }); toast(D().ELEM[extra].nm + "の刻印を授かった", D().ELEM[extra].c); }
    if (k === "retreat") { endRun("retreat"); return; }
    MA.W.refreshTags(); recompute();
    resume();
  }
  function startTrial(o) {
    const room = G.map.rooms[o.room];
    G.trial = { room, left: 25, o };
    toast("試練：25秒間 耐えぬけ！", "#c27bff");
    const list = G.mode === "abyss" ? ["slime"] : G.dun.enemies;
    for (let k = 0; k < 14; k++) { const a = G.rnd() * TAU; const p = { x: o.x + Math.cos(a) * 90, y: o.y + Math.sin(a) * 70 }; if (!M().solidAt(G.map, p.x, p.y)) spawnEnemy(list[k % list.length], p.x, p.y, { room: room.id }); }
  }
  function openChest(o) {
    o.done = true;
    G.stats.chests++;
    MA.Save.misAdd("chests", 1);
    const rewards = MA.Cards.chest(o.tier || 1);
    MA.Audio.sfx("chest");
    pause("chest");
    MA.UI.showChest(rewards, o.tier || 1);
  }
  function gainLore() {
    const S = MA.Save.S;
    const left = D().LORE.filter((l) => !S.codex.lore[l.id]);
    if (!left.length) { G.stats.gold += 50; toast("古文書（読みつくした）：50G", "#e8d080"); return; }
    const l = left[0];
    S.codex.lore[l.id] = 1; G.stats.lore.push(l.id);
    toast("古文書「" + l.nm + "」を見つけた（図鑑に記録）", "#e8d080");
  }
  function giveKey(why) {
    G.keys++;
    MA.Audio.sfx("key");
    toast((why ? why + "：" : "") + "星脈の鍵 " + Math.min(G.keys, G.keysNeed) + "/" + G.keysNeed, "#ff8fd0");
    if (G.keys >= G.keysNeed && !G.bossOpen && G.mode === "dungeon") openBossDoors();
    updateObjective();
  }
  function openBossDoors() {
    G.bossOpen = true;
    const map = G.map;
    map.bossDoors.forEach(([x, y]) => { map.tiles[y * map.W + x] = M().T.FLOOR; });
    MA.Render.dirtyMap && MA.Render.dirtyMap();
    toast("ボスの扉が開いた！ 最深部へ向かおう", "#ff5a6a");
    MA.Audio.sfx("roar");
    updateObjective();
  }
  function onMidKilled(e) {
    G.midDone = true;
    giveKey("中ボスを倒した");
    if (!G.sealKey && G.map.sealedRoom >= 0) { G.sealKey = true; const map = G.map; map.sealDoors.forEach(([x, y]) => { map.tiles[y * map.W + x] = M().T.FLOOR; }); MA.Render.dirtyMap && MA.Render.dirtyMap(); toast("封印の鍵を手に入れた：封印区域の扉が開いた", "#e8d080"); }
    G.map.objects.push({ kind: "chest", x: e.x, y: e.y, tier: 2, done: false, dyn: 1 });
  }

  /* ══════════════════════════════════════════════════════════════
     地形の効果（毒沼・氷・溶岩・魔法床・汚染・暗さ・氷柱・噴火・重力）
     ══════════════════════════════════════════════════════════════ */
  function hazards(dt) {
    const P = G.P, map = G.map, T = M().T;
    const t = M().tileAt(map, P.x, P.y);
    G.hzT = (G.hzT || 0) + dt;
    if (G.hzT >= 0.5) {
      G.hzT = 0;
      /* 毒沼：最大HPの約3%/秒。HP は 1 までしか減らない（毒だけでは倒れない。敵に囲まれると危ない）
         ★ 前は固定の 3＋倍率×2（約10/秒）で、HP の低いキャラは毒沼の多い部屋で戦うだけで削りきられていた（早回しの実測） */
      if (t === T.POISON) { if (P.hp > 1) { const pd = Math.min(Math.max(1, P.st.hp * 0.015 + G.levelMul), P.hp - 1); P.hp -= pd; G.stats.taken += pd; P.hurtT = 0.15; pop(P.x, P.y - 24, "毒 -" + Math.round(pd), "#c070ff"); } }
      if (t === T.LAVA) { hurtPlayer(6 + G.levelMul * 3, null); }
      if (t === T.RUNE && Math.floor(G.t / 3) % 2 === 0) hurtPlayer(4 + G.levelMul * 2, null);
      if (t === T.TAINT) { G.corruption = Math.min(100, G.corruption + 9); }
      else G.corruption = Math.max(0, G.corruption - 1.5);
      if (G.corruption >= 100) { hurtPlayer(5 + G.levelMul * 3, null); P.mp = Math.max(0, P.mp - 10); }
    }
    /* 奈落：視界が狭い／暗黒領域・暗黒の階 */
    const darkBase = G.biome === "abyss" || G.muts.dark || (G.rule && G.rule.dark);
    if (G.darkT > 0) G.darkT -= dt;
    G.vision = darkBase || G.darkT > 0 ? (G.darkT > 0 ? 0.55 : 1) * (G.muts.dark || (G.rule && G.rule.dark) ? 0.8 : 1) : 0;
    /* 氷柱（氷窟）：ときどき近くに影 → 落下 */
    if (G.biome === "ice" && !G.bossActive) {
      G.iceT = (G.iceT || 4) - dt;
      if (G.iceT <= 0) { G.iceT = 3 + G.rnd() * 3; const a = G.rnd() * TAU, d = 20 + G.rnd() * 60; const x = P.x + Math.cos(a) * d, y = P.y + Math.sin(a) * d; if (!M().solidAt(map, x, y)) telegraph({ shape: "circle", x, y, r: 14, dur: 1.1, dmg: 8 + G.levelMul * 4, col: "#7fd0ff", onFire: (o) => { if (inShape(o, P.x, P.y, P.r)) hurtPlayer(o.dmg, null); fx({ type: "icicle", x: o.x, y: o.y, t: 0, dur: 0.4 }); } }); }
    }
    /* 噴火口（熔岩城） */
    if (G.biome === "lava") map.objects.forEach((o) => {
      if (o.kind !== "vent") return;
      o.cd = (o.cd == null ? 2 + G.rnd() * 4 : o.cd) - dt;
      if (o.cd <= 0) { o.cd = 5 + G.rnd() * 3; if (dist2(o.x, o.y, P.x, P.y) < 220 * 220) telegraph({ shape: "circle", x: o.x, y: o.y, r: 34, dur: 1.2, dmg: 10 + G.levelMul * 4, col: "#ff7a2a" }); }
    });
    /* 重力の渦（星天） */
    G.pull = null;
    if (G.biome === "sky") map.objects.forEach((o) => {
      if (o.kind !== "gravity") return;
      const d = Math.sqrt(dist2(o.x, o.y, P.x, P.y));
      if (d < 110 && d > 4) { const k = (1 - d / 110) * 70; G.pull = { x: (o.x - P.x) / d * k, y: (o.y - P.y) / d * k }; if (d < 14) { hurtPlayer(5 + G.levelMul * 2, null); } }
    });
    /* 時間制限区域（星天）：入ったら時間内に星の欠片をとる */
    const rid = M().roomOf(map, P.x, P.y);
    if (rid >= 0) {
      const room = map.rooms[rid];
      if (room.type === "timed" && !room.timedStarted) { room.timedStarted = true; G.timedRoom = { room, left: 20, ok: false }; toast("時間制限区域：20秒以内に星の欠片をとれ！", "#ffe86a"); }
    }
    if (G.timedRoom && G.timedRoom.left > 0) {
      G.timedRoom.left -= dt;
      if (G.timedRoom.left <= 0 && !G.timedRoom.ok) {
        toast("時間切れ！ 星の番人があらわれた（倒すと鍵）", "#ff5a6a");
        const r = G.timedRoom.room;
        const o = map.objects.find((x) => x.kind === "starShard" && x.room === r.id); if (o) o.done = true;
        const guards = [];
        for (let k = 0; k < 2; k++) { const gd = spawnEnemy(G.dun ? G.dun.elite : "starKnight", r.cx * 16 + 8 + (k ? 30 : -30), r.cy * 16 + 8, { room: r.id }); if (gd) guards.push(gd); }
        guards.forEach((gd) => { gd.onDeath = () => { if (guards.every((x) => x.dead) && !G.timedRoom.keyGiven) { G.timedRoom.keyGiven = true; giveKey("星の番人を倒した"); } }; });
      }
    }
    /* 試練（魔法陣） */
    if (G.trial) {
      G.trial.left -= dt;
      G.trial.spawnT = (G.trial.spawnT || 0) - dt;
      if (G.trial.spawnT <= 0 && G.trial.left > 3) { G.trial.spawnT = 2.2; const o = G.trial.o; const list = G.mode === "abyss" ? ["slime"] : G.dun.enemies; for (let k = 0; k < 4; k++) { const a = G.rnd() * TAU; const x = o.x + Math.cos(a) * 100, y = o.y + Math.sin(a) * 70; if (!M().solidAt(map, x, y)) spawnEnemy(list[(G.rnd() * list.length) | 0], x, y); } }
      if (G.trial.left <= 0) { const o = G.trial.o; G.trial = null; toast("試練を乗りこえた！", "#c27bff"); giveKey("試練"); map.objects.push({ kind: "chest", x: o.x, y: o.y + 18, tier: 2, done: false, dyn: 1 }); }
    }
    /* 宝物庫の番人（入ると番人があらわれ、倒すまで宝箱は開かない） */
    if (rid >= 0) {
      const room = map.rooms[rid];
      if (room.type === "vault" && room.guard && !room.guardSpawned) {
        room.guardSpawned = true;
        const elite = G.dun ? G.dun.elite : "starKnight";
        room.guards = [spawnEnemy(elite, room.cx * 16 + 8, room.cy * 16 - 10, { room: rid })];
        const list = G.dun ? G.dun.enemies : ["slime"];
        for (let k = 0; k < 6; k++) room.guards.push(spawnEnemy(list[k % list.length], room.cx * 16 + 8 + (k - 3) * 16, room.cy * 16 + 24, { room: rid }));
        map.objects.forEach((o) => { if (o.room === rid && o.kind === "chest") o.locked = true; });
        toast("宝物庫の番人があらわれた！", "#ffd84a");
      }
      if (room.type === "vault" && room.guards && !room.vaultDone && room.guards.every((g) => !g || g.dead)) {
        room.vaultDone = true;
        map.objects.forEach((o) => { if (o.room === rid && o.kind === "chest") o.locked = false; });
        giveKey("宝物庫を守りぬいた");
      }
      /* 部屋に入ったら待ち伏せ（通常戦闘区域） */
      if (room.type === "battle" && !room.ambush && G.mode === "dungeon") {
        room.ambush = true;
        const list = G.dun.enemies;
        /* ★ 入口に近い部屋・序盤は小さめ（はじめの部屋のすぐとなりで 6〜12 体に囲まれて倒れていた） */
        const n = Math.min(12, 3 + Math.floor(G.rnd() * 4) + Math.min(4, room.dist || 0) + Math.floor(G.t / 120));
        for (let k = 0; k < n; k++) { const x = (room.x + 1 + G.rnd() * (room.w - 2)) * 16, y = (room.y + 1 + G.rnd() * (room.h - 2)) * 16; if (dist2(x, y, P.x, P.y) < 60 * 60 || M().solidAt(map, x, y)) continue; spawnEnemy(list[(G.rnd() * list.length) | 0], x, y, { room: rid }); }
      }
      /* 中ボスの部屋 */
      if (room.type === "mid" && !G.mid && G.mode === "dungeon") {
        G.mid = spawnEnemy(G.dun.mid, room.cx * 16 + 8, room.cy * 16 + 8, { mid: true, hpMul: 2.2, atkMul: 1.2, scale: 1.3, room: rid });
        G.mid.name = "中ボス " + G.mid.d.nm;
        toast("中ボス「" + G.mid.d.nm + "」があらわれた！", "#ff8a3d");
        MA.Audio.sfx("roar");
      }
      /* ボスの部屋 */
      if (room.type === "boss" && !G.bossActive && !G.bossDone && G.bossOpen && G.mode === "dungeon") MA.Boss.begin(room);
    }
    /* 深淵の階：敵を倒しきる→出口 */
    if (G.mode === "abyss" && !G.stairs) {
      if (G.abyssBoss) { if (!G.bossActive && !G.bossDone && G.t > 1.5) MA.Boss.begin(map.rooms[map.bossRoom], true); }
      else if (G.floorKills >= G.floorNeed) openStairs();
    }
    /* 時間で敵が強くなる（迷宮・30分） */
    if (G.mode === "dungeon" && !G.warn30 && G.t > 30 * 60 && !G.bossDone) { G.warn30 = 1; toast("深淵の侵蝕：敵がさらに強くなった", "#ff3050"); }
    /* 予約した処理 */
    if (G.queue.length) for (let i = G.queue.length - 1; i >= 0; i--) { if (G.queue[i].at <= G.t) { const q = G.queue[i]; G.queue.splice(i, 1); try { q.f(); } catch (e) {} } }
  }
  function openStairs() {
    G.stairs = true;
    const P = G.P;
    let x = P.x + 40, y = P.y;
    if (M().solidAt(G.map, x, y)) { x = P.x; y = P.y - 40; }
    if (M().solidAt(G.map, x, y)) { x = P.x; y = P.y; }
    G.map.objects.push({ kind: "exit", x, y, done: false, dyn: 1 });
    toast("下へつづく門が開いた！（F／調べるで次の階へ）", "#8affc4");
    MA.Audio.sfx("key");
    updateObjective();
  }

  /* ══════════════════════════════════════════════════════════════
     敵の出現（ディレクター）
     ══════════════════════════════════════════════════════════════ */
  function director(dt) {
    if (G.bossActive && G.mode === "dungeon") return;
    const P = G.P, S = MA.Save.S;
    const min = G.t / 60;
    const cap = Math.min(S.set.maxEnemies || 60, 90);
    /* ★ 序盤は少なめから（開始直後 45% → 約80秒で 100%）。上位の迷宮で、探索 Lv1 のうちに囲まれて倒れていた */
    const ramp = G.mode === "abyss" && G.floor > 1 ? 1 : Math.min(1, 0.45 + G.t / 150);
    let target = Math.min(cap, Math.round((16 + min * 3.2) * ramp * (G.muts.surge ? G.muts.surge.spawn : 1) * ((G.rule && G.rule.spawn) || 1) * (G.spawnMul || 1)));
    if (G.mode === "abyss") target = Math.min(cap, target + 8);
    const alive = G.E.reduce((a, e) => a + (e.dead ? 0 : 1), 0);
    G.dir.spawnT -= dt;
    if (G.dir.spawnT <= 0 && alive < target) {
      G.dir.spawnT = Math.max(0.35, 1.6 - min * 0.06);
      const list = G.mode === "abyss" ? abyssList() : G.dun.enemies;
      /* 時間がたつほど重い敵が混ざる（並びの後ろほど重い） */
      const reach = Math.min(list.length, 2 + Math.floor(min / 2));
      const k = list[Math.floor(G.rnd() * reach)];
      const pack = D().ENEMIES[k].pack || (G.rnd() < 0.25 ? 3 : 1);
      const pos = spawnPos();
      if (pos) for (let i = 0; i < pack; i++) spawnEnemy(k, pos.x + (G.rnd() - 0.5) * 24, pos.y + (G.rnd() - 0.5) * 24);
    }
    /* エリート */
    G.dir.eliteT -= dt * (G.muts.elites ? G.muts.elites.elite : 1) * ((G.rule && G.rule.elite) || 1) * ((G.modeDef && G.modeDef.elite) || 1);
    if (G.dir.eliteT <= 0) {
      G.dir.eliteT = 85 - Math.min(40, min * 2);
      const pos = spawnPos();
      if (pos) {
        const k = G.mode === "abyss" ? abyssList()[0] : G.dun.enemies[Math.floor(G.rnd() * G.dun.enemies.length)];
        const e = spawnEnemy(k, pos.x, pos.y, { elite: true });
        if (e) { e.name = "エリート " + e.d.nm; toast("エリート「" + e.d.nm + "」が近くにいる", "#ffcc3a"); }
      }
    }
  }
  function abyssList() {
    if (!G._abyssList || G._abyssFloor !== G.floor) {
      const all = [];
      D().DUNGEONS.forEach((d) => d.enemies.forEach((k) => all.push(k)));
      const r = M().mkRng(G.seed + G.floor * 31);
      G._abyssList = r.shuffle(all.slice()).slice(0, 4);
      G._abyssFloor = G.floor;
    }
    return G._abyssList;
  }
  /* 画面の外・歩いてたどり着ける（道のりの表で 10〜34 歩）・床の上
     ★ 前は「まっすぐ○px 先」だけで探していたので、壁の中・別の部屋になりがちで、ほとんど湧かなかった。 */
  function spawnPos() {
    const P = G.P, map = G.map;
    const hw = G.vw / 2 + 24, hh = G.vh / 2 + 32;
    const tryAt = (x, y) => {
      const t = M().tileAt(map, x, y);
      if (M().SOLID[t] || t === M().T.LAVA) return false;
      if (Math.abs(x - G.cam.x) < hw && Math.abs(y - G.cam.y) < hh) return false;
      const rid = M().roomOf(map, x, y);
      if (rid >= 0) { const rm = map.rooms[rid]; if (rm.type === "boss" || rm.type === "sealed" || rm.type === "secret" || (rm.type === "start" && G.t < 25)) return false; }
      const c = M().collideCircle(map, x, y, 6);
      return c[0] === 0 && c[1] === 0;
    };
    if (flow) {
      for (let k = 0; k < 60; k++) {
        const tx = (G.rnd() * flow.w) | 0, ty = (G.rnd() * flow.h) | 0;
        const d = flow.dist[ty * flow.w + tx];
        if (d < 10 || d > 34) continue;
        const x = (tx + flow.x0) * 16 + 8, y = (ty + flow.y0) * 16 + 8;
        if (tryAt(x, y)) return { x, y };
      }
    }
    for (let k = 0; k < 30; k++) {
      const a = G.rnd() * TAU, d = Math.max(G.vw, G.vh) * 0.55 + 20 + G.rnd() * 80;
      const x = P.x + Math.cos(a) * d, y = P.y + Math.sin(a) * d;
      if (tryAt(x, y)) return { x, y };
    }
    return null;
  }

  /* ══════════════════════════════════════════════════════════════
     プレイヤーまでの道のり（フローフィールド）
     ・壁のある迷宮でも敵が通路を通って追ってくるように、プレイヤーのまわり 44 マスを
       幅優先でたどった「あと何歩か」の表を 0.25 秒ごとに作り直す。
     ・敵は見通しが無いときだけこれに従う（見えているときはまっすぐ）。
     ══════════════════════════════════════════════════════════════ */
  let flow = null, flowT = 0;
  const FR = 44;
  function buildFlow() {
    const map = G.map, P = G.P, W = map.W, H = map.H, SOL = M().SOLID;
    const px = Math.floor(P.x / 16), py = Math.floor(P.y / 16);
    const x0 = Math.max(0, px - FR), y0 = Math.max(0, py - FR), x1 = Math.min(W - 1, px + FR), y1 = Math.min(H - 1, py + FR);
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    const dist = (flow && flow.dist.length === w * h) ? flow.dist : new Uint16Array(w * h);
    dist.fill(65535);
    const q = new Int32Array(w * h);
    let qh = 0, qt = 0;
    const s = (py - y0) * w + (px - x0);
    dist[s] = 0; q[qt++] = s;
    while (qh < qt) {
      const i = q[qh++], x = i % w, y = (i / w) | 0, d = dist[i] + 1;
      const tx = x + x0, ty = y + y0;
      if (x > 0 && dist[i - 1] === 65535 && !SOL[map.tiles[ty * W + tx - 1]]) { dist[i - 1] = d; q[qt++] = i - 1; }
      if (x < w - 1 && dist[i + 1] === 65535 && !SOL[map.tiles[ty * W + tx + 1]]) { dist[i + 1] = d; q[qt++] = i + 1; }
      if (y > 0 && dist[i - w] === 65535 && !SOL[map.tiles[(ty - 1) * W + tx]]) { dist[i - w] = d; q[qt++] = i - w; }
      if (y < h - 1 && dist[i + w] === 65535 && !SOL[map.tiles[(ty + 1) * W + tx]]) { dist[i + w] = d; q[qt++] = i + w; }
    }
    flow = { x0, y0, w, h, dist };
  }
  /* 敵が進むべき向き（単位ベクトル）。表の外・行き止まりなら null */
  function pathDir(e) {
    if (!flow) return null;
    const tx = Math.floor(e.x / 16) - flow.x0, ty = Math.floor(e.y / 16) - flow.y0;
    if (tx < 0 || ty < 0 || tx >= flow.w || ty >= flow.h) return null;
    const w = flow.w, d0 = flow.dist[ty * w + tx];
    if (d0 === 65535) return null;
    let best = d0, bx = 0, by = 0;
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      if (!ox && !oy) continue;
      const nx = tx + ox, ny = ty + oy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= flow.h) continue;
      /* ななめは両どなりが通れるときだけ（角を抜けない） */
      if (ox && oy && (flow.dist[ty * w + nx] === 65535 || flow.dist[ny * w + tx] === 65535)) continue;
      const d = flow.dist[ny * w + nx];
      if (d < best) { best = d; bx = ox; by = oy; }
    }
    if (!bx && !by) return null;
    /* 次のマスの中心へ向かう */
    const cx = (tx + bx + flow.x0) * 16 + 8, cy = (ty + by + flow.y0) * 16 + 8;
    const dx = cx - e.x, dy = cy - e.y, l = Math.hypot(dx, dy) || 1;
    return [dx / l, dy / l];
  }
  /* 見通し（敵ごとに少し間をあけて調べる） */
  function canSee(e) {
    if (e.losT > G.t) return e.los;
    e.losT = G.t + 0.2 + (e.id % 5) * 0.03;
    e.los = M().los(G.map, e.x, e.y, G.P.x, G.P.y);
    return e.los;
  }

  /* ══ 見つけた場所（ミニマップ） ══ */
  function discover() {
    if (G.frame % 6) return;
    const P = G.P, map = G.map;
    const R = 9, tx = Math.floor(P.x / 16), ty = Math.floor(P.y / 16);
    for (let y = ty - R; y <= ty + R; y++) for (let x = tx - R - 3; x <= tx + R + 3; x++) {
      if (x < 0 || y < 0 || x >= map.W || y >= map.H) continue;
      if ((x - tx) * (x - tx) * 0.7 + (y - ty) * (y - ty) > R * R) continue;
      map.seen[y * map.W + x] = 1;
    }
    const rid = M().roomOf(map, P.x, P.y);
    if (rid >= 0 && !map.rooms[rid].seen) { map.rooms[rid].seen = true; G.roomsSeen = (G.roomsSeen || 0) + 1; }
  }
  function camera(dt) {
    const P = G.P, map = G.map;
    const k = Math.min(1, dt * 7);
    G.cam.x += (P.x - G.cam.x) * k; G.cam.y += (P.y - G.cam.y) * k;
    const hw = G.vw / 2, hh = G.vh / 2;
    const mw = map.W * 16, mh = map.H * 16;
    G.cam.x = mw > G.vw ? clamp(G.cam.x, hw, mw - hw) : mw / 2;
    G.cam.y = mh > G.vh ? clamp(G.cam.y, hh, mh - hh) : mh / 2;
    /* プレイヤーが画面外に出ないように（カメラが追いつかないとき） */
    if (Math.abs(P.x - G.cam.x) > hw - 12) G.cam.x = P.x - Math.sign(P.x - G.cam.x) * (hw - 12);
    if (Math.abs(P.y - G.cam.y) > hh - 16) G.cam.y = P.y - Math.sign(P.y - G.cam.y) * (hh - 16);
  }

  /* ══ 見た目だけのもの ══ */
  function fx(o) { G.FX.push(o); if (G.FX.length > 700) G.FX.splice(0, G.FX.length - 700); return o; }
  function updateFx(dt) {
    for (let i = G.FX.length - 1; i >= 0; i--) { const f = G.FX[i]; f.t += dt; if (f.vx) { f.x += f.vx * dt; f.y += f.vy * dt; } if (f.t >= f.dur) G.FX.splice(i, 1); }
    for (let i = G.NUM.length - 1; i >= 0; i--) { const n = G.NUM[i]; n.t += dt; n.y -= 18 * dt * (1 - n.t); if (n.t >= 0.75) G.NUM.splice(i, 1); }
  }
  function num(x, y, v, crit, col) {
    if (G.NUM.length > 140) G.NUM.splice(0, 20);
    G.NUM.push({ x, y, v, crit, col, t: 0 });
  }
  function pop(x, y, txt, col, o) { G.NUM.push({ x, y, txt, col, t: 0, big: o && o.big }); }
  function toast(txt, col) { G.toasts.push({ txt, col: col || "#ffffff", t: 0 }); if (G.toasts.length > 5) G.toasts.shift(); MA.UI && MA.UI.toast && MA.UI.toast(txt, col); }
  function ach(id) { MA.Prog && MA.Prog.unlock(id); }

  /* ══ 目標の文 ══ */
  function updateObjective() {
    if (G.mode === "abyss") {
      G.objective = G.stairs ? "下への門をくぐろう" : G.abyssBoss ? "階層ボスを倒せ" : "敵を倒せ（" + Math.min(G.floorKills || 0, G.floorNeed) + "/" + G.floorNeed + "）";
      return;
    }
    if (G.bossDone) G.objective = "脱出地点へ向かおう（ボスの部屋の光）";
    else if (G.bossActive) G.objective = G.dun ? D().BOSSES[G.dun.boss].nm + "を倒せ" : "ボスを倒せ";
    else if (G.bossOpen) G.objective = "最深部のボスの部屋へ";
    else G.objective = "星脈の鍵を集めよう（" + G.keys + "/" + G.keysNeed + "）";
  }

  /* ══════════════════════════════════════════════════════════════
     探索の終わり
     result: clear / defeat / retreat / floor（深淵の次の階）/ abyssEnd
     ══════════════════════════════════════════════════════════════ */
  function endRun(result) {
    if (!G.running) return;
    if (result === "floor") { nextFloor(); return; }
    stop();
    MA.Save.clearRun();
    MA.Audio.bgm("result");
    const sum = MA.Prog.settle(result);
    MA.UI.showResult(sum);
  }
  function nextFloor() {
    G.floor++;
    MA.Save.S.stats.floors++;
    MA.Save.misAdd("floors", 1);
    const P = G.P;
    const keep = { lv: P.lv, exp: P.exp };
    buildFloor();
    P.x = G.map.start.x; P.y = G.map.start.y + 20; P.vx = 0; P.vy = 0;
    heal(P.st.hp * 0.25, true);
    G.cam.x = P.x; G.cam.y = P.y;
    G.stats.floor = G.floor;
    Object.assign(P, keep);
    recompute();
    MA.Audio.bgm(G.map.biome);
    toast("深淵踏破 " + G.floor + "階" + (G.rule && G.rule.id !== "none" ? "：" + G.rule.nm + "（" + G.rule.d + "）" : "") + (G.abyssBoss ? " — 階層ボス" : ""), "#a874ff");
    updateObjective();
    if (G.floor % 10 === 1 && G.floor > 1) { /* 10階ごとの節目の報酬は精算で */ }
  }

  /* ══ 中断と再開（10秒ごと・画面を離れたとき）══ */
  function snapshot() {
    const P = G.P;
    return {
      v: 1, at: Date.now(), mode: G.mode, dun: G.dun && G.dun.id, cid: G.cid, seed: G.seed, floor: G.floor, muts: G.mutList, trial: G.cfg.trial || null, diff: G.diff,
      t: G.t, keys: G.keys, sealKey: G.sealKey, bossOpen: G.bossOpen, midDone: !!G.midDone,
      stats: G.stats,
      P: { lv: P.lv, exp: P.exp, hp: P.hp, mp: P.mp, weapons: P.weapons.map((w) => ({ k: w.k, lv: w.lv, el: w.el, evo: w.evo || null })), magics: P.magics.map((m) => ({ k: m.k, lv: m.lv })), passives: P.passives, passiveMul: P.passiveMul || {}, ultG: P.ultG, rerolls: P.rerolls, banish: P.banish, potion: P.potion, elixir: P.elixir, revUsed: !!P.revUsed, altarAtk: P.altarAtk || 0, altarDef: P.altarDef || 0, x: P.x, y: P.y },
      objs: G.map.objects.map((o) => (o.dyn ? null : (o.done ? 1 : 0))),
      dyn: G.map.objects.filter((o) => o.dyn && !o.done).map((o) => ({ kind: o.kind, x: o.x, y: o.y, tier: o.tier })),
      rooms: G.map.rooms.map((r) => (r.seen ? 1 : 0) | (r.ambush ? 2 : 0) | (r.vaultDone ? 4 : 0) | (r.guardSpawned ? 8 : 0)),
      seen: Array.from(G.map.seen.reduce((acc, v, i) => { if (v) acc.push(i); return acc; }, [])),
      tiles: diffTiles(),
    };
  }
  function diffTiles() {
    /* こわした隠し壁・蔦・開いた扉（元の地図と違うところ） */
    const out = [];
    const T = M().T, map = G.map;
    for (let i = 0; i < map.tiles.length; i++) if (map.tiles[i] === T.FLOOR && G.orig && G.orig[i] !== T.FLOOR) out.push(i);
    return out;
  }
  let cpT = 0;
  function checkpoint() {
    if (!G.orig) G.orig = G.map.tiles.slice();
    cpT += DT;
    if (cpT < 10) return;
    cpT = 0;
    if (!G.P.alive || G.bossActive) return;
    try { MA.Save.saveRun(snapshot()); } catch (e) {}
  }
  function saveNow() { if (G.running && G.P && G.P.alive && !G.bossActive) try { MA.Save.saveRun(snapshot()); } catch (e) {} }
  document.addEventListener("visibilitychange", () => { if (document.hidden) { saveNow(); if (G.running && !G.paused) { pause("menu"); MA.UI.showPause(); } } });
  function applyResume(s) {
    const P = G.P;
    G.t = s.t || 0; G.keys = s.keys || 0; G.sealKey = !!s.sealKey; G.midDone = !!s.midDone;
    G.stats = Object.assign(G.stats, s.stats || {});
    const p = s.P || {};
    ["lv", "exp", "ultG", "rerolls", "banish", "potion", "elixir", "altarAtk", "altarDef"].forEach((k) => { if (p[k] != null) P[k] = p[k]; });
    P.need = MA.Stats.expNeed(P.lv);
    P.revUsed = !!p.revUsed;
    /* ★★ 2026-10-05 前の属性名（風・雷・影）で控えた探索も再開できるように読みかえる */
    const elFix = (e) => ({ wind: "wood", thunder: "light", shadow: "dark" }[e] || (D().ELEM[e] ? e : "water"));
    P.weapons = (p.weapons || []).filter((w) => D().WEAPONS[w.k]).map((w) => ({ k: w.k, lv: w.lv, el: elFix(w.el), evo: w.evo && D().EVOS[w.evo] ? w.evo : null, t: 0.5 }));
    P.magics = (p.magics || []).filter((m) => D().MAGICS[m.k]).map((m) => ({ k: m.k, lv: m.lv, t: 1 }));
    P.passives = {}; Object.keys(p.passives || {}).forEach((k) => { const k2 = /^seal_/.test(k) ? "seal_" + elFix(k.slice(5)) : k; if (D().STATS[k2]) P.passives[k2] = (P.passives[k2] || 0) + p.passives[k]; });
    P.passiveMul = p.passiveMul || {};
    MA.W.refreshTags(); recompute();
    P.hp = Math.min(P.st.hp, p.hp || P.st.hp); P.mp = p.mp || P.st.mmp;
    if (p.x) { P.x = p.x; P.y = p.y; }
    const map = G.map;
    (s.objs || []).forEach((v, i) => { if (v && map.objects[i]) map.objects[i].done = true; });
    (s.dyn || []).forEach((o) => map.objects.push({ kind: o.kind, x: o.x, y: o.y, tier: o.tier, done: false, dyn: 1 }));
    (s.rooms || []).forEach((v, i) => { const r = map.rooms[i]; if (!r) return; r.seen = !!(v & 1); r.ambush = !!(v & 2); r.vaultDone = !!(v & 4); r.guardSpawned = !!(v & 8); });
    (s.seen || []).forEach((i) => { map.seen[i] = 1; });
    G.orig = map.tiles.slice();
    (s.tiles || []).forEach((i) => { map.tiles[i] = M().T.FLOOR; });
    if (G.midDone) G.mid = { dead: true };
    if (G.keys >= G.keysNeed) { G.bossOpen = true; map.bossDoors.forEach(([x, y]) => { map.tiles[y * map.W + x] = M().T.FLOOR; }); }
    if (G.sealKey) map.sealDoors.forEach(([x, y]) => { map.tiles[y * map.W + x] = M().T.FLOOR; });
    MA.Render.dirtyMap && MA.Render.dirtyMap();
  }

  MA.E = {
    start, stop, pause, resume, recompute, afterCard, eventChoice, endRun, interact, dash,
    pathDir, canSee, tick,   /* tick：調整用の早回し（ふだんはループからだけ呼ぶ） */
    spawnEnemy, damageEnemy, hurtPlayer, heal, killEnemy, chainFrom, burstAround,
    ebullet, pbullet, telegraph, inShape, zone, fx, num, pop, toast, ach, updateObjective, openStairs, giveKey,
    enemiesIn, eachNear, nearest, nearestN, strongest, moveEnemy, moveCircle, breakTile, hitTile, drop, dropGem,
    gridBuild, snapshot, saveNow, openLevelUp, enemyScale, addExp, collect,
    dist2, clamp, TAU,
  };
})();
