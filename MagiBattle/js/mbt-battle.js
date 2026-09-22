/* ============================================================
   MagiBattle 2.0 — バトルエンジン＋バトル画面（★★ 2026-09-23 全面刷新）
   ------------------------------------------------------------
   ・NIKKE を参考にした<b>リアルタイム戦闘</b>。
       味方5体が武器ごとの間隔で自動で撃つ／スキル2は再使用時間ごとに自動で撃つ。
       攻撃でたまる<b>バーストゲージ</b>が満タンになると、
       <b>バーストⅠ → Ⅱ → Ⅲ</b> を順番につなぐ（手動でタップ・オートなら自動）。
       3段つながると <b>FULL BURST</b>（10秒・味方全員の攻撃力+50%）。
   ・ボスは<b>チャージ攻撃</b>をためる。赤いゲージ（コア）を時間内に削りきれば BREAK！
   ・敵をタップすると<b>集中攻撃</b>（照準）。
   ・性能の計算は ../magibattle-stats.js（MBStats）だけが持つ。ここでは組み立てて動かすだけ。
   ・画面を使わない<b>シミュレーション</b>（MBT_BATTLE.simulate）は、難易度の調整に使う。
   ============================================================ */
(function () {
  "use strict";
  const S = () => window.MBStats;
  const $ = (q, el) => (el || document).querySelector(q);
  const TICK = 1 / 30;                         // 1コマ（秒）
  const FULL_T = 10, STAGE_T = 10;             // FULL BURST の長さ・バーストの段の待ち時間
  /* ★ 実測（simulate）：同じくらいの強さの編成で 1戦 70〜90秒・残りHP 50〜70%。
     Lv.10 の SR 編成が「れんしゅう」、Lv.40 の SSR が「激つよ」、Lv.80 完凸が「超越」を 70秒ほど。 */
  const TUNE = { EHP: 40, EATK: 0.13 };        // 敵の HP・攻撃の全体の目盛り
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  const fmtN = (n) => {
    n = Math.round(n || 0);
    return n >= 1e8 ? (n / 1e8).toFixed(2) + "億" : n >= 1e4 ? (n / 1e4).toFixed(n >= 1e6 ? 0 : 1) + "万" : n.toLocaleString();
  };

  /* ══════════ 乱数（シードつき。シミュレーションで同じ結果を出せるように） ══════════ */
  function rngOf(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e9) / 1e9; }; }

  /* ══════════ 効果音（ファイルなし・WebAudio で合成） ══════════ */
  let AC = null, sndOn = true;
  function acx() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } return AC; }
  function tone(f0, f1, dur, type, vol, delay) {
    const a = acx(); if (!a || !sndOn) return;
    const t = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
    o.type = type || "square"; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    g.gain.setValueAtTime(vol || 0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, delay, hp) {
    const a = acx(); if (!a || !sndOn) return;
    const t = a.currentTime + (delay || 0), n = Math.floor(a.sampleRate * dur), b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = a.createBufferSource(), g = a.createGain(), f = a.createBiquadFilter();
    f.type = "highpass"; f.frequency.value = hp || 600;
    s.buffer = b; g.gain.value = vol || 0.05; s.connect(f); f.connect(g); g.connect(a.destination); s.start(t);
  }
  let _lastShot = 0;
  const SFX = {
    shot(w) { const n = performance.now(); if (n - _lastShot < 45) return; _lastShot = n;
      if (w === "SR") { noise(0.18, 0.09, 0, 300); tone(420, 90, 0.2, "sawtooth", 0.05); }
      else if (w === "RL") { tone(160, 60, 0.3, "sawtooth", 0.06); noise(0.25, 0.06, 0.05, 200); }
      else if (w === "SG") noise(0.12, 0.07, 0, 500);
      else noise(0.05, 0.035, 0, 1200); },
    crit() { tone(1300, 600, 0.12, "triangle", 0.06); },
    skill() { tone(500, 1200, 0.16, "sawtooth", 0.05); noise(0.2, 0.05, 0.05, 900); },
    hurt() { tone(180, 90, 0.12, "square", 0.04); },
    burst() { tone(220, 880, 0.35, "sawtooth", 0.07); tone(330, 1320, 0.35, "square", 0.04, 0.05); noise(0.5, 0.06, 0.1, 400); },
    full() { [523, 659, 784, 1046].forEach((f, i) => tone(f, f * 1.01, 0.25, "square", 0.05, i * 0.07)); },
    brk() { tone(900, 200, 0.4, "sawtooth", 0.07); noise(0.4, 0.08, 0, 300); },
    warn() { tone(880, 880, 0.12, "square", 0.05); tone(880, 880, 0.12, "square", 0.05, 0.2); },
    win() { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, f, 0.18, "triangle", 0.06, i * 0.1)); },
    lose() { [392, 330, 262, 196].forEach((f, i) => tone(f, f * 0.98, 0.3, "triangle", 0.05, i * 0.16)); },
  };

  /* ══════════ 属性アイコン（小さい丸） ══════════ */
  const EG = {
    fire: '<path d="M12 2c1 4 5 6 5 11a5 5 0 01-10 0c0-2.6 1.4-4.2 2.7-5.7C10.2 9 11 9.4 12 9c.9-.4 1-2.8 0-7Z" fill="#fff"/>',
    water: '<path d="M12 3c3.6 4.6 6 7.7 6 10.6A6 6 0 016 13.6C6 10.7 8.4 7.6 12 3Z" fill="#fff"/>',
    wood: '<path d="M12 21C6 17 5 9 12 3c7 6 6 14 0 18Z" fill="#fff"/>',
    light: '<path d="M12 2l1.9 6.3L20 10l-6.1 1.7L12 18l-1.9-6.3L4 10l6.1-1.7Z" fill="#fff"/>',
    dark: '<path d="M20.5 15.6A9.6 9.6 0 117.6 2.6a7.6 7.6 0 0012.9 13Z" fill="#fff"/>',
  };
  function elIcon(el, cls) {
    const e = S().ELEM[el]; if (!e) return "";
    return '<span class="elb ' + (cls || "") + '" style="--ec:' + e.c + '"><svg viewBox="0 0 24 24">' + EG[el] + "</svg></span>";
  }

  /* ══════════ ユニット ══════════ */
  function fxSum(fx) {
    const o = {};
    fx.forEach((f) => {
      if (f.k === "elkill") { (o.elkill = o.elkill || {})[f.el] = (o.elkill[f.el] || 0) + f.v; return; }
      if (f.k === "elemadv" || f.k === "double") { o[f.k] = f.v; return; }
      if (f.k === "pray" || f.k === "godpray") { o.pray = Math.max(o.pray || 0, f.v); if (f.k === "godpray") o.godpray = 1; return; }
      o[f.k] = (o[f.k] || 0) + f.v;
    });
    o.anti = Math.min(0.20, o.anti || 0);
    o.guard = Math.min(0.30, o.guard || 0);
    o.burstcd = Math.min(0.30, o.burstcd || 0);
    return o;
  }
  function mkAlly(a, i) {
    const M = S(), p = M.unit(a.id);
    const gs = M.gearSum(a.gear || []);
    const st = M.statsAt(a.id, a.lv || 1, a.awk || 0, gs);
    const fx = fxSum(p.fx);
    const w = M.WEAPONS[p.weapon];
    const s2cd = M.s2Text(p).cd * (1 - gs.cd * 0.5);
    const cry = p.tier.k === "crystal";
    const bcd = (cry ? 20 : M.BURST_CD[p.burst]) * (1 - fx.burstcd) * (1 - gs.cd * 0.5);
    return {
      uid: "a" + i, side: "ally", i, id: a.id, p, nm: p.nm, img: p.img, th: p.th, el: p.el, el2: p.el2,
      maxhp: st.hp, hp: st.hp, atk: st.atk, def: st.def, crit: st.crit, critDmg: st.critDmg,
      w, wk: p.weapon, atkT: 0.4 + i * 0.13, s2cd, s2T: s2cd * (0.35 + 0.1 * i), bcd, bT: 0,
      burst: p.burst, cry, fx, gs, shield: 0, buffs: [], dmg: 0, alive: true, first: new Set(), ramp: 0,
      lv: a.lv || 1, awk: a.awk || 0, cls: p.cls,
      /* 狙われやすさ：防御型は3倍、前衛は1.4倍・後衛は0.6倍 */
      taunt: (p.cls === "defender" ? 3 : 1) * (a.front === false ? 0.6 : 1.4),
    };
  }
  const MONSTERS = {
    skyreaper: { nm: "スカイリーパー", img: "img/skyreaper.webp", el: "dark", c: "#a86bff" },
    razorwing: { nm: "レイザーウィング", img: "img/razorwing.webp", el: "fire", c: "#ff5d47" },
  };
  function mkEnemy(e, i, rnd) {
    const M = S();
    let nm, img, el, el2 = null, st, monster = false, id = e.id;
    if (e.monster) {
      const m = MONSTERS[e.monster]; monster = true; nm = e.name || m.nm; img = m.img; el = e.el || m.el;
      /* 怪物の素の強さ＝同じレベルの SSR の平均くらい */
      const lv = e.lv || 40, k = M.lvCurve(lv);
      st = { hp: Math.round(24000 * k), atk: Math.round(9000 * k), def: Math.round(4200 * k) };
    } else {
      const p = M.unit(id); nm = p.nm; img = p.img; el = p.el; el2 = p.el2;
      st = M.statsAt(id, e.lv || 1, e.awk || 0, null);
    }
    const boss = !!e.boss;
    /* ★ 敵の全体の目盛り（EHP・EATK）。モードの hpMul/atkMul は「この上での強さ」。
       味方5体の火力に対して、1戦が 60〜100秒ほどになるように合わせてある（simulate で実測）。 */
    const maxhp = Math.round(st.hp * (e.hpMul || 1) * TUNE.EHP);
    return {
      uid: "e" + i, side: "enemy", i, id, nm, img, el, el2, monster, boss,
      maxhp, hp: maxhp, atk: Math.round(st.atk * (e.atkMul || 1) * TUNE.EATK), def: Math.round(st.def * (e.defMul || 1)),
      itv: boss ? 1.25 : 1.7 + rnd() * 0.7, atkT: 1.2 + rnd() * 1.2 + i * 0.25,
      skT: 6 + rnd() * 5, skItv: boss ? 8 : 10 + rnd() * 3,
      chT: boss ? 13 + rnd() * 3 : 1e9, chItv: e.chargeItv || 17, charging: null,
      stun: 0, defDown: 0, defDownT: 0, poison: 0, poisonT: 0, poisonAtk: 0, alive: true, immortal: !!e.immortal, dealt: 0,
    };
  }

  /* ══════════ 戦いの状態 ══════════ */
  function mkState(cfg) {
    const rnd = rngOf(cfg.seed || (Date.now() & 0xffffff));
    const st = {
      cfg, rnd, t: 0, over: false, win: false, speed: cfg.speed || 1, auto: !!cfg.auto, headless: !!cfg.headless,
      allies: cfg.allies.map(mkAlly), enemies: cfg.enemies.map((e, i) => mkEnemy(e, i, rnd)),
      gauge: 0, stage: 0, stageT: 0, full: 0, focus: null, paused: 0, score: 0, bossDmg: 0,
      teamAura: 0, synergy: 0, praysLeft: 0, regenT: 3, log: [], events: [],
    };
    /* チームで効くもの：パワーオーラ（全員へ）・バリア（全員へ）・シナジー */
    st.teamAura = Math.min(0.40, st.allies.reduce((a, u) => a + (u.fx.aura || 0), 0));
    const bar = st.allies.reduce((a, u) => a + (u.fx.barrier || 0), 0);
    st.allies.forEach((u) => { u.shield = Math.round(u.maxhp * Math.min(0.30, bar)); });
    st.synergy = synergyOf(cfg.allies.map((a) => a.id)).atk;
    st.prayers = st.allies.filter((u) => u.fx.pray).map((u) => u.uid);
    return st;
  }
  /* ── チームシナジー：同じフェス（同じ学園・同じ宴）のキャラがそろうと攻撃力アップ ── */
  function synergyOf(ids) {
    const M = S(), cnt = {};
    ids.filter(Boolean).forEach((id) => { const p = M.unit(id); if (p && p.fes) cnt[p.fes] = (cnt[p.fes] || 0) + 1; });
    let best = 0, key = "";
    Object.keys(cnt).forEach((k) => { if (cnt[k] > best) { best = cnt[k]; key = k; } });
    const atk = best >= 5 ? 0.20 : best >= 3 ? 0.10 : best >= 2 ? 0.05 : 0;
    return { atk, n: best, key };
  }

  const alive = (arr) => arr.filter((u) => u.alive);
  function buffV(u, k) { return u.buffs.reduce((a, b) => a + (b.k === k ? b.v : 0), 0); }
  function atkOf(st, u) {
    let m = 1 + st.teamAura + st.synergy + buffV(u, "atk");
    if (st.full > 0) m += 0.5 + (u.cry ? 0.3 : 0);
    if (u.fx.soko && u.hp < u.maxhp * 0.5) m += u.fx.soko;
    return u.atk * m;
  }
  function pickTarget(st, u) {
    const es = alive(st.enemies); if (!es.length) return null;
    if (st.focus) { const f = es.find((e) => e.uid === st.focus); if (f) return f; }
    const boss = es.find((e) => e.boss); if (boss) return boss;
    return es.reduce((a, b) => (b.hp < a.hp ? b : a));
  }

  /* ══════════ ダメージ（味方 → 敵） ══════════ */
  function hitEnemy(st, u, e, mul, o) {
    if (!e || !e.alive) return 0;
    o = o || {};
    const M = S();
    let em = M.elemMult(u.el, e.el);
    if (u.el2) em = Math.max(em, M.elemMult(u.el2, e.el));
    if (u.fx.elemadv) em = Math.max(em, M.ADV);
    let m = atkOf(st, u) * mul * em;
    if (em > 1) m *= 1 + (u.gs.elemdmg || 0);
    const crit = st.rnd() < u.crit + (o.crit || 0);
    if (crit) m *= u.critDmg;
    const f = u.fx;
    let k = 1 + (f.all || 0);
    if (e.boss) k += f.boss || 0; else k += f.mob || 0;
    if (!u.first.has(e.uid)) { k += f.first || 0; u.first.add(e.uid); }
    const hr = e.hp / e.maxhp;
    if (hr >= 0.7) k += f.vital || 0;
    if (hr <= 0.3) k += f.fatal || 0;
    if (e.poisonT > 0) k += f.poisonk || 0;
    if (f.elkill && f.elkill[e.el]) k += f.elkill[e.el];
    if (alive(st.enemies).length <= 2) k += f.fewfoe || 0;
    if (o.skill) k += (f.skill || 0) + (u.gs.hitrate || 0);
    if (o.burst) k += u.gs.chgdmg || 0;
    m *= k;
    const def = e.def * (1 - (e.defDownT > 0 ? e.defDown : 0));
    m *= M.defMul(def) * (0.94 + st.rnd() * 0.12);
    const dmg = Math.max(1, Math.round(m));
    applyEnemyDmg(st, e, dmg, u);
    u.dmg += dmg;
    if (f.drain) u.hp = Math.min(u.maxhp, u.hp + dmg * f.drain * 0.05);
    if (o.gauge && st.full <= 0 && st.stage === 0) st.gauge = Math.min(100, st.gauge + o.gauge * (1 + (f.gauge || 0)));
    if (!st.headless) fxHit(st, u, e, dmg, crit, o);
    return dmg;
  }
  function applyEnemyDmg(st, e, dmg, u) {
    if (e.charging) {
      e.charging.core -= dmg;
      if (e.charging.core <= 0) { e.charging = null; e.stun = 3; e.chT = e.chItv; st.events.push({ k: "break", e }); }
    }
    if (st.cfg.mode === "sa") st.score += dmg;
    if (e.boss) st.bossDmg += dmg;
    if (e.immortal) { e.hp = Math.max(e.maxhp * 0.02, e.hp - dmg); if (e.hp <= e.maxhp * 0.02) e.hp = e.maxhp; return; }
    e.hp -= dmg;
    if (e.hp <= 0) { e.hp = 0; e.alive = false; e.charging = null; if (st.focus === e.uid) st.focus = null; st.events.push({ k: "kill", e }); }
  }

  /* ══════════ ダメージ（敵 → 味方） ══════════ */
  function pickAlly(st) {
    const as = alive(st.allies); if (!as.length) return null;
    const tot = as.reduce((a, u) => a + u.taunt, 0);
    let r = st.rnd() * tot;
    for (const u of as) { r -= u.taunt; if (r <= 0) return u; }
    return as[as.length - 1];
  }
  function hitAlly(st, e, u, mul) {
    if (!u || !u.alive) return 0;
    const M = S();
    let em = M.elemMult(e.el, u.el);
    let m = e.atk * mul * em * M.defMul(u.def) * (1 - (u.fx.guard || 0)) * (0.92 + st.rnd() * 0.16);
    let dmg = Math.max(1, Math.round(m));
    if (u.shield > 0) { const a = Math.min(u.shield, dmg); u.shield -= a; dmg -= a; }
    u.hp -= dmg; e.dealt += dmg;
    if (u.hp <= 0) { u.hp = 0; u.alive = false; st.events.push({ k: "down", u }); }
    if (!st.headless) fxHurt(st, e, u, dmg);
    return dmg;
  }

  /* ══════════ スキル2 ══════════ */
  function castSkill2(st, u, power) {
    const M = S(), P = M.S2_PAT[u.p.skill2.pat];
    const es = alive(st.enemies); if (!es.length) return;
    power = power || 1;
    const mul = P.mul * power;
    if (!st.headless) fxSkillName(st, u);
    if (P.tg === "all") es.forEach((e) => { hitEnemy(st, u, e, mul, { skill: 1, gauge: 3 }); if (P.debuff === "def") { e.defDown = Math.max(e.defDown, 0.12); e.defDownT = Math.max(e.defDownT, 8); } });
    else if (P.tg === "rand") { for (let k = 0; k < (P.n || 5); k++) { const al = alive(st.enemies); if (!al.length) break; hitEnemy(st, u, al[Math.floor(st.rnd() * al.length)], mul, { skill: 1, gauge: 1.2 }); } }
    else {
      const t0 = pickTarget(st, u);
      const list = [t0].concat(es.filter((e) => e !== t0)).slice(0, P.tg);
      list.forEach((e) => hitEnemy(st, u, e, mul, { skill: 1, gauge: 4, crit: P.tg === 1 ? 0.2 : 0 }));
    }
    if (!st.headless) fxSkill(st, u, P);
    if (!st.headless) SFX.skill();
  }

  /* ══════════ バースト ══════════ */
  function burstReady(st, u, stage) { return u.alive && u.bT <= 0 && (u.burst === stage || u.cry); }
  function availableFor(st, stage) { return st.allies.filter((u) => burstReady(st, u, stage)); }
  function autoPick(st, stage) {
    const list = availableFor(st, stage); if (!list.length) return null;
    /* 決まった段の子を優先（晶学の子はⅢにとっておく） */
    const exact = list.filter((u) => u.burst === stage && !u.cry);
    const pool = stage === 3 ? list : (exact.length ? exact : list);
    return pool.reduce((a, b) => (atkOf(st, b) > atkOf(st, a) ? b : a));
  }
  function doBurst(st, u) {
    if (!u || st.stage < 1 || !burstReady(st, u, st.stage)) return false;
    const stage = st.stage, f = u.p.burstSk.feat, M = S();
    u.bT = u.bcd;
    st.stageT = STAGE_T;
    if (!st.headless) { cutin(st, u, stage); SFX.burst(); st.paused = Math.max(st.paused, 0.95); }
    const es = alive(st.enemies);
    const bo = { burst: 1, gauge: 0 };
    if (stage === 1) {
      st.allies.forEach((a) => { if (a.alive) a.buffs.push({ k: "atk", v: 0.30, t: 10 }); });
      if (f.heal) st.allies.forEach((a) => { if (a.alive) a.hp = Math.min(a.maxhp, a.hp + a.maxhp * 0.25); });
      else st.allies.forEach((a) => { if (a.alive) a.shield += Math.round(a.maxhp * 0.12); });
      es.forEach((e) => hitEnemy(st, u, e, 3.0, bo));
    } else if (stage === 2) {
      es.forEach((e) => {
        hitEnemy(st, u, e, 6.0, bo);
        e.defDown = Math.max(e.defDown, 0.25); e.defDownT = Math.max(e.defDownT, 10);
        if (f.delay && e.charging) e.charging.t += 2; else if (f.delay) e.chT += 2;
        if (f.poison) { e.poisonT = 10; e.poisonAtk = Math.max(e.poisonAtk, atkOf(st, u) * 0.35); }
      });
      if (f.heal) st.allies.forEach((a) => { if (a.alive) a.hp = Math.min(a.maxhp, a.hp + a.maxhp * 0.15); });
    } else {
      const tg = pickTarget(st, u);
      if (f.barrage && tg) { for (let k = 0; k < 12; k++) hitEnemy(st, u, tg.alive ? tg : pickTarget(st, u), 1.6, bo); const t2 = pickTarget(st, u); if (t2) hitEnemy(st, u, t2, 6.0, bo); }
      else { es.forEach((e) => hitEnemy(st, u, e, 9.0, bo)); const t2 = pickTarget(st, u); if (t2) hitEnemy(st, u, t2, 6.0, bo); }
      if (f.defdown) alive(st.enemies).forEach((e) => { e.defDown = Math.max(e.defDown, 0.15); e.defDownT = Math.max(e.defDownT, 10); });
      if (f.rally) st.allies.forEach((a) => { if (a.alive && a !== u) { const t = pickTarget(st, a); if (t) hitEnemy(st, a, t, 2.0, bo); } });
    }
    if (f.fb) st.allies.forEach((a) => { a.s2T = Math.min(a.s2T, 0.2); });
    if (!st.headless) fxBurst(st, u, stage);
    st.stage++;
    if (st.stage > 3) {
      st.stage = 0; st.gauge = 0; st.full = FULL_T;
      st.events.push({ k: "full" });
    }
    return true;
  }

  /* ══════════ 1コマすすめる ══════════ */
  function step(st, dt) {
    if (st.over) return;
    if (st.paused > 0) { st.paused -= dt / Math.max(1, st.speed); return; }   // カットインは実時間で待つ
    st.t += dt;
    const M = S();
    /* バフ・デバフの時間 */
    st.allies.forEach((u) => { u.buffs = u.buffs.filter((b) => (b.t -= dt) > 0); if (u.bT > 0) u.bT -= dt; });
    st.enemies.forEach((e) => {
      if (!e.alive) return;
      if (e.defDownT > 0) e.defDownT -= dt;
      if (e.poisonT > 0) { e.poisonT -= dt; const d = Math.round(e.poisonAtk * dt); if (d > 0) applyEnemyDmg(st, e, d, null); }
      if (e.stun > 0) e.stun -= dt;
    });
    if (st.full > 0) { st.full -= dt; if (st.full <= 0) st.events.push({ k: "fullend" }); }
    /* リジェネ（3秒ごと） */
    st.regenT -= dt;
    if (st.regenT <= 0) {
      st.regenT = 3;
      const rg = Math.min(0.05, st.allies.reduce((a, u) => a + (u.alive ? (u.fx.regen || 0) : 0), 0));
      if (rg > 0) st.allies.forEach((u) => { if (u.alive) u.hp = Math.min(u.maxhp, u.hp + u.maxhp * rg); });
    }
    /* 祈り（チームHPが35%を切ったら1回ずつ） */
    const tot = st.allies.reduce((a, u) => a + u.maxhp, 0), cur = st.allies.reduce((a, u) => a + u.hp, 0);
    if (st.prayers.length && cur < tot * 0.35) {
      const pu = st.allies.find((u) => u.uid === st.prayers[0]); st.prayers.shift();
      if (pu && pu.alive) {
        st.allies.forEach((u) => { if (u.alive) u.hp = Math.min(u.maxhp, u.hp + u.maxhp * pu.fx.pray); });
        if (pu.fx.godpray) st.allies.forEach((u) => { if (u.alive) u.buffs.push({ k: "atk", v: 0.15, t: 10 }); });
        st.events.push({ k: "pray", u: pu });
      }
    }
    /* 味方：ふだんの攻撃・スキル2 */
    for (const u of st.allies) {
      if (!u.alive) continue;
      const haste = 1 + (u.fx.haste || 0) + (u.gs.haste || 0);
      u.atkT -= dt * haste;
      if (u.atkT <= 0) {
        const w = u.w;
        let itv = w.itv;
        if (w.ramp) { u.ramp = Math.min(1, u.ramp + 0.05); itv = w.itv * (1.6 - 0.8 * u.ramp); }
        u.atkT += itv;
        const tg = pickTarget(st, u);
        if (tg) {
          if (w.tg > 1) { const es = alive(st.enemies); [tg].concat(es.filter((e) => e !== tg)).slice(0, w.tg).forEach((e) => hitEnemy(st, u, e, w.mul, { gauge: w.gauge / w.tg })); }
          else hitEnemy(st, u, tg, w.mul, { gauge: w.gauge });
          if (w.splash) alive(st.enemies).forEach((e) => { if (e !== tg) hitEnemy(st, u, e, w.mul * w.splash, { gauge: 0 }); });
          if (!st.headless) { fxShot(st, u, tg); SFX.shot(u.wk); }
        }
      }
      u.s2T -= dt;
      if (u.s2T <= 0 && alive(st.enemies).length) {
        u.s2T = u.s2cd;
        castSkill2(st, u, 1);
        if (u.fx.double) castSkill2(st, u, 0.5);
      }
    }
    /* 敵：攻撃・技・チャージ攻撃 */
    for (const e of st.enemies) {
      if (!e.alive || e.stun > 0) continue;
      if (e.charging) {
        e.charging.t -= dt;
        if (e.charging.t <= 0) {
          e.charging = null; e.chT = e.chItv;
          const red = Math.min(0.20, st.allies.reduce((a, u) => Math.max(a, u.alive ? (u.fx.anti || 0) : 0), 0) * 2);
          alive(st.allies).forEach((u) => hitAlly(st, e, u, 2.6 * (1 - red)));
          st.events.push({ k: "blast", e });
        }
        continue;
      }
      e.chT -= dt;
      if (e.chT <= 0) { e.charging = { t: 5, max: 5, core: e.maxhp * 0.045, coreMax: e.maxhp * 0.045 }; st.events.push({ k: "charge", e }); continue; }
      e.atkT -= dt;
      if (e.atkT <= 0) { e.atkT = e.itv; hitAlly(st, e, pickAlly(st), 1.0); }
      e.skT -= dt;
      if (e.skT <= 0) { e.skT = e.skItv; alive(st.allies).forEach((u) => hitAlly(st, e, u, e.boss ? 0.9 : 0.55)); if (!st.headless) fxEnemySkill(st, e); }
    }
    /* バーストゲージ → 段 */
    if (st.stage === 0 && st.full <= 0 && st.gauge >= 100) { st.stage = 1; st.stageT = STAGE_T; st.events.push({ k: "stage" }); }
    if (st.stage > 0) {
      if (!availableFor(st, st.stage).length) { st.events.push({ k: "chainbreak", s: st.stage }); st.stage = 0; st.gauge = 45; }
      else if (st.auto) { if (!st.headless || true) doBurst(st, autoPick(st, st.stage)); }
      else { st.stageT -= dt; if (st.stageT <= 0) { st.events.push({ k: "chainbreak", s: st.stage }); st.stage = 0; st.gauge = 45; } }
    }
    /* 勝ち負け */
    const tl = st.cfg.time || 180;
    if (!alive(st.allies).length) { st.over = true; st.win = st.cfg.mode === "sa"; }
    else if (!alive(st.enemies).length) { st.over = true; st.win = true; }
    else if (st.t >= tl) { st.over = true; st.win = st.cfg.mode === "sa"; st.timeUp = true; }
  }

  /* ══════════ シミュレーション（画面なし） ══════════ */
  function simulate(cfg) {
    const st = mkState(Object.assign({}, cfg, { headless: true, auto: true }));
    let n = 0;
    while (!st.over && n < 60 * 60 * 10) { step(st, TICK); n++; }
    return { win: st.win, t: Math.round(st.t), score: st.score, bossDmg: st.bossDmg,
      hpLeft: st.allies.reduce((a, u) => a + u.hp, 0) / st.allies.reduce((a, u) => a + u.maxhp, 0),
      dmg: st.allies.map((u) => [u.nm, u.dmg]) };
  }

  /* ══════════════════ ここから画面 ══════════════════ */
  let ST = null, raf = 0, lastT = 0, cv = null, ctx = null, W = 0, H = 0, DPR = 1;
  const parts = [];   // 効果（弾・火花・輪・文字）
  let rectCache = {};
  const root = () => $("#battle");

  function buildDOM(st) {
    const b = root();
    b.innerHTML = '<div class="bbg"><img src="img/kv.webp" alt=""></div>'
      + '<div class="btop"><div class="st">' + esc(st.cfg.title || "") + '</div>'
      + '<div class="tm" id="btm">3:00</div>'
      + '<button class="bbtn' + (st.auto ? " on" : "") + '" id="bAuto">AUTO</button>'
      + '<button class="bbtn" id="bSpd">×' + st.speed + "</button>"
      + '<button class="bbtn" id="bMenu" aria-label="メニュー"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"><path d="M9 6v12M15 6v12"/></svg></button></div>'
      + (st.cfg.mode === "sa" || st.cfg.mode === "icp" ? '<div class="sahud"><div id="bScore">DMG 0</div></div>' : "")
      + '<div class="efield" id="bEF">' + st.enemies.map(enemyHTML).join("") + "</div>"
      + '<div class="fbbar" id="bFB"><b>FULL BURST</b><i id="bFBi" style="width:100%"></i></div>'
      + '<div class="bgauge" id="bGauge"><div class="bar"><i id="bGi" style="width:0%"></i></div><div class="stg"><span data-s="1">Ⅰ</span><span data-s="2">Ⅱ</span><span data-s="3">Ⅲ</span></div></div>'
      + '<div class="squad" id="bSq">' + st.allies.map(allyHTML).join("") + "</div>"
      + '<canvas id="fx"></canvas><div class="bflash" id="bFl"></div><div class="bmsg" id="bMsg"></div>'
      + '<div class="cutin" id="bCut"><div class="dim"></div><div class="band"></div><img class="ci" alt=""><div class="ctx"><i></i><b></b><small></small></div><div class="big"></div></div>'
      + '<div class="bov" id="bPause"><div class="bcard"><div class="rtitle" style="font-size:30px">PAUSE</div>'
      + '<div class="rsub">バトルを一時停止しています</div>'
      + '<button class="btn red wide" id="bResume">▶ 続ける</button>'
      + '<div class="brow"><button class="btn" id="bRetry">↻ 最初から</button><button class="btn" id="bGiveup">あきらめる</button></div>'
      + '<div class="brow"><button class="btn" id="bSnd">効果音 ' + (sndOn ? "ON" : "OFF") + '</button></div></div></div>'
      + '<div class="bov" id="bRes"><div class="bcard" id="bResC"></div></div>';
    cv = $("#fx"); ctx = cv.getContext("2d");
    resize();
    b.querySelectorAll(".eu").forEach((el) => el.addEventListener("click", () => {
      const e = st.enemies.find((x) => x.uid === el.dataset.u);
      if (!e || !e.alive) return;
      st.focus = st.focus === e.uid ? null : e.uid; paintFocus(st);
    }));
    b.querySelectorAll(".au").forEach((el) => el.addEventListener("click", () => {
      const u = st.allies.find((x) => x.uid === el.dataset.u);
      if (u && st.stage > 0 && burstReady(st, u, st.stage)) doBurst(st, u);
    }));
    $("#bAuto").onclick = () => { st.auto = !st.auto; $("#bAuto").classList.toggle("on", st.auto); if (st.cfg.onPref) st.cfg.onPref({ auto: st.auto }); };
    $("#bSpd").onclick = () => { st.speed = st.speed >= 3 ? 1 : st.speed + 1; $("#bSpd").textContent = "×" + st.speed; if (st.cfg.onPref) st.cfg.onPref({ speed: st.speed }); };
    $("#bMenu").onclick = () => { st.menu = true; $("#bPause").classList.add("on"); };
    $("#bResume").onclick = () => { st.menu = false; $("#bPause").classList.remove("on"); lastT = performance.now(); };
    $("#bRetry").onclick = () => { $("#bPause").classList.remove("on"); const c = st.cfg; stop(); if (c.onRetry) c.onRetry(); };
    $("#bGiveup").onclick = () => { $("#bPause").classList.remove("on"); st.menu = false; st.over = true; st.win = st.cfg.mode === "sa"; st.giveup = true; };
    $("#bSnd").onclick = () => { sndOn = !sndOn; $("#bSnd").textContent = "効果音 " + (sndOn ? "ON" : "OFF"); if (st.cfg.onPref) st.cfg.onPref({ sfx: sndOn }); };
  }
  function enemyHTML(e) {
    return '<div class="eu' + (e.boss ? " boss" : "") + (e.monster ? " monster" : "") + '" data-u="' + e.uid + '">'
      + '<div class="eimg"><img src="' + esc(e.img) + '" alt="">' + elIcon(e.el) + '<div class="dbf"></div>'
      + '<div class="charge"><div class="cl">⚠ CHARGE</div><div class="cb"><i></i></div></div></div>'
      + '<div class="ehp"><b></b><i></i></div><div class="enm"><span>' + esc(e.nm) + "</span><span></span></div></div>";
  }
  function allyHTML(u) {
    return '<div class="au" data-u="' + u.uid + '"><div class="ph"><img src="' + esc(u.img) + '" alt="">'
      + '<span class="bs">' + (u.cry ? "Ⅰ~Ⅲ" : S().BURST_NM[u.burst]) + "</span>" + elIcon(u.el)
      + '<span class="s2"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="rgba(0,0,0,.6)" stroke="rgba(255,255,255,.15)" stroke-width="3"/><circle class="s2c" cx="12" cy="12" r="9" fill="none" stroke="#7fd4ff" stroke-width="3" stroke-dasharray="56.5" stroke-dashoffset="56.5"/></svg></span>'
      + '<span class="anm">' + esc(u.nm) + '</span></div><div class="hp"><i></i><s></s></div><div class="bcd" hidden></div></div>';
  }
  function paintFocus(st) { root().querySelectorAll(".eu").forEach((el) => el.classList.toggle("focus", el.dataset.u === st.focus)); }
  function resize() {
    if (!cv) return;
    const r = root().getBoundingClientRect();
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    rectCache = {};
  }
  window.addEventListener("resize", () => { if (ST) resize(); });
  /* 画面上の位置（#battle の中の座標）。1秒ごとに取り直す */
  function posOf(u) {
    const key = u.uid, now = performance.now();
    const c = rectCache[key];
    if (c && now - c.at < 1000) return c;
    const el = root().querySelector('[data-u="' + key + '"]');
    const br = root().getBoundingClientRect();
    if (!el) return { x: W / 2, y: H / 2, w: 40, h: 40 };
    const r = el.getBoundingClientRect();
    const o = { x: r.left - br.left + r.width / 2, y: r.top - br.top + r.height * (u.side === "ally" ? 0.3 : 0.45), w: r.width, h: r.height, at: now };
    rectCache[key] = o;
    return o;
  }
  function elemColor(el) { const e = S().ELEM[el]; return e ? e.c : "#fff"; }

  /* ── 効果をつくる ── */
  function addP(p) { if (parts.length < 420) parts.push(p); }
  function fxShot(st, u, e) {
    const a = posOf(u), b = posOf(e), c = elemColor(u.el);
    const jx = (st.rnd() - 0.5) * b.w * 0.4, jy = (st.rnd() - 0.5) * b.h * 0.3;
    if (u.wk === "SR") { addP({ k: "beam", x: a.x, y: a.y, x2: b.x + jx, y2: b.y + jy, w: 7, c, t: 0, d: 0.22 }); }
    else if (u.wk === "RL") { addP({ k: "rocket", x: a.x, y: a.y, x2: b.x + jx, y2: b.y + jy, c, t: 0, d: 0.35 }); }
    else if (u.wk === "SG") { for (let k = 0; k < 3; k++) addP({ k: "tracer", x: a.x, y: a.y, x2: b.x + jx + (k - 1) * 22, y2: b.y + jy, w: 2.2, c, t: 0, d: 0.14 }); }
    else addP({ k: "tracer", x: a.x + (st.rnd() - 0.5) * 12, y: a.y, x2: b.x + jx, y2: b.y + jy, w: u.wk === "AR" ? 2.4 : 1.6, c, t: 0, d: 0.12 });
  }
  function fxHit(st, u, e, dmg, crit, o) {
    const b = posOf(e), c = elemColor(u.el);
    const x = b.x + (st.rnd() - 0.5) * b.w * 0.5, y = b.y + (st.rnd() - 0.5) * b.h * 0.4;
    for (let k = 0; k < (crit ? 7 : 3); k++) addP({ k: "spark", x, y, vx: (st.rnd() - 0.5) * 260, vy: (st.rnd() - 0.7) * 260, c: crit ? "#ffe066" : c, t: 0, d: 0.35 });
    if (o.burst || o.skill || crit || st.rnd() < 0.5) addP({ k: "num", x, y: y - 10, s: fmtN(dmg), crit, big: !!o.burst, c: crit ? "#ffe066" : (o.burst ? "#ff8a9a" : "#fff"), t: 0, d: 0.8 });
    const el = root().querySelector('.eu[data-u="' + e.uid + '"]');
    if (el && (crit || o.burst)) { el.classList.remove("hit"); void el.offsetWidth; el.classList.add("hit"); }
    if (crit && !o.burst) SFX.crit();
  }
  function fxHurt(st, e, u, dmg) {
    const a = posOf(e), b = posOf(u);
    addP({ k: "tracer", x: a.x, y: a.y, x2: b.x, y2: b.y, w: 3, c: "#ff3b4f", t: 0, d: 0.16 });
    addP({ k: "num", x: b.x, y: b.y - 6, s: "-" + fmtN(dmg), c: "#ff6b7a", t: 0, d: 0.7, small: 1 });
    const el = root().querySelector('.au[data-u="' + u.uid + '"]');
    if (el) { el.classList.remove("hurt"); void el.offsetWidth; el.classList.add("hurt"); }
    SFX.hurt();
  }
  function fxSkillName(st, u) {
    const a = posOf(u);
    addP({ k: "label", x: a.x, y: a.y - 40, s: u.p.skill2.nm, c: elemColor(u.el), t: 0, d: 1.0 });
  }
  function fxSkill(st, u, P) {
    const a = posOf(u), c = elemColor(u.el);
    const es = alive(st.enemies);
    if (P.tg === "all") es.forEach((e) => { const b = posOf(e); addP({ k: "ring", x: b.x, y: b.y, r0: 10, r1: b.w * 0.9, c, t: 0, d: 0.5 }); });
    else es.slice(0, P.tg === "rand" ? 5 : P.tg).forEach((e) => { const b = posOf(e); addP({ k: "beam", x: a.x, y: a.y, x2: b.x, y2: b.y, w: 12, c, t: 0, d: 0.3 }); addP({ k: "ring", x: b.x, y: b.y, r0: 6, r1: b.w * 0.6, c: "#fff", t: 0, d: 0.35 }); });
    addP({ k: "ring", x: a.x, y: a.y, r0: 8, r1: 70, c, t: 0, d: 0.4 });
  }
  function fxEnemySkill(st, e) {
    const a = posOf(e);
    addP({ k: "ring", x: a.x, y: a.y, r0: 10, r1: 160, c: "#ff2d4a", t: 0, d: 0.5 });
    alive(st.allies).forEach((u) => { const b = posOf(u); addP({ k: "beam", x: a.x, y: a.y, x2: b.x, y2: b.y, w: 5, c: "#ff2d4a", t: 0, d: 0.25 }); });
  }
  function fxBurst(st, u, stage) {
    const c = elemColor(u.el), es = alive(st.enemies);
    shake(); flash();
    if (stage === 1) {
      st.allies.forEach((a) => { const p = posOf(a); addP({ k: "ring", x: p.x, y: p.y, r0: 5, r1: 90, c: "#ffe066", t: 0, d: 0.7 }); addP({ k: "pillar", x: p.x, y: p.y, c: "#ffe066", t: 0, d: 0.8 }); });
    } else if (stage === 2) {
      es.forEach((e) => { const p = posOf(e); addP({ k: "net", x: p.x, y: p.y, r: p.w * 0.7, c: "#b58cff", t: 0, d: 1.0 }); });
    }
    const a = posOf(u);
    es.forEach((e, i) => { const b = posOf(e); addP({ k: "beam", x: a.x, y: a.y, x2: b.x, y2: b.y, w: stage === 3 ? 26 : 16, c, t: -i * 0.04, d: 0.5 }); addP({ k: "boom", x: b.x, y: b.y, r: b.w * (stage === 3 ? 1.1 : 0.8), c, t: -i * 0.04, d: 0.6 }); });
  }
  function cutin(st, u, stage) {
    const el = $("#bCut"); if (!el) return;
    const c = elemColor(u.el);
    el.style.setProperty("--c1", c);
    el.style.setProperty("--c2", "#12060a");
    el.querySelector(".ci").src = u.img;
    el.querySelector("i").textContent = "BURST " + S().BURST_NM[stage];
    el.querySelector("b").textContent = u.p.burstSk.nm;
    el.querySelector("small").textContent = u.nm;
    el.querySelector(".big").textContent = stage === 3 ? "BURST Ⅲ" : "BURST " + S().BURST_NM[stage];
    el.classList.remove("on"); void el.offsetWidth; el.classList.add("on");
    clearTimeout(cutin._t); cutin._t = setTimeout(() => el.classList.remove("on"), 950);
  }
  function shake() { const b = root(); b.classList.remove("shake"); void b.offsetWidth; b.classList.add("shake"); }
  function flash() { const f = $("#bFl"); if (!f) return; f.classList.remove("on"); void f.offsetWidth; f.classList.add("on"); }
  function bigMsg(txt, c) { const m = $("#bMsg"); if (!m) return; m.textContent = txt; m.style.setProperty("--mc", c || "#ff2d4a"); m.classList.remove("on"); void m.offsetWidth; m.classList.add("on"); }

  /* ── 効果を描く ── */
  function draw(dt) {
    ctx.clearRect(0, 0, W, H);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.t += dt;
      if (p.t >= p.d) { parts.splice(i, 1); continue; }
      if (p.t < 0) continue;
      const q = p.t / p.d;
      ctx.save();
      if (p.k === "tracer" || p.k === "beam") {
        const hd = Math.min(1, q * 3), x = p.x + (p.x2 - p.x) * hd, y = p.y + (p.y2 - p.y) * hd;
        const tl = Math.max(0, hd - (p.k === "beam" ? 1 : 0.35));
        const x0 = p.x + (p.x2 - p.x) * tl, y0 = p.y + (p.y2 - p.y) * tl;
        ctx.globalAlpha = 1 - q * 0.8;
        ctx.lineCap = "round";
        ctx.strokeStyle = p.c; ctx.lineWidth = p.w * (p.k === "beam" ? (1 - q * 0.5) : 1);
        ctx.shadowColor = p.c; ctx.shadowBlur = p.k === "beam" ? 18 : 8;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x, y); ctx.stroke();
        if (p.k === "beam") { ctx.strokeStyle = "#fff"; ctx.lineWidth = p.w * 0.35; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x, y); ctx.stroke(); }
      } else if (p.k === "rocket") {
        const x = p.x + (p.x2 - p.x) * q, y = p.y + (p.y2 - p.y) * q - Math.sin(q * Math.PI) * 60;
        ctx.fillStyle = p.c; ctx.shadowColor = p.c; ctx.shadowBlur = 14;
        ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
        if (q > 0.9) addP({ k: "boom", x: p.x2, y: p.y2, r: 46, c: p.c, t: 0, d: 0.4 });
      } else if (p.k === "spark") {
        const x = p.x + p.vx * p.t, y = p.y + p.vy * p.t + 300 * p.t * p.t;
        ctx.globalAlpha = 1 - q; ctx.fillStyle = p.c; ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
      } else if (p.k === "ring") {
        ctx.globalAlpha = 1 - q; ctx.strokeStyle = p.c; ctx.lineWidth = 4 * (1 - q) + 1; ctx.shadowColor = p.c; ctx.shadowBlur = 14;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r0 + (p.r1 - p.r0) * q, 0, Math.PI * 2); ctx.stroke();
      } else if (p.k === "boom") {
        const r = p.r * (0.3 + q * 0.9);
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        g.addColorStop(0, "rgba(255,255,255," + (1 - q) + ")"); g.addColorStop(0.4, p.c); g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.globalAlpha = 1 - q; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
      } else if (p.k === "pillar") {
        const w = 40 * (1 - q * 0.5);
        const g = ctx.createLinearGradient(p.x - w, 0, p.x + w, 0);
        g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(0.5, p.c); g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.globalAlpha = (1 - q) * 0.8; ctx.fillStyle = g; ctx.fillRect(p.x - w, 0, w * 2, p.y + 30);
      } else if (p.k === "net") {
        ctx.globalAlpha = (1 - q) * 0.9; ctx.strokeStyle = p.c; ctx.lineWidth = 2; ctx.shadowColor = p.c; ctx.shadowBlur = 10;
        for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + q * 2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + Math.cos(a) * p.r, p.y + Math.sin(a) * p.r); ctx.stroke(); }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.6, 0, Math.PI * 2); ctx.stroke();
      } else if (p.k === "num") {
        const y = p.y - 36 * q;
        ctx.globalAlpha = q > 0.7 ? (1 - q) / 0.3 : 1;
        const fs = p.big ? 24 : p.crit ? 20 : p.small ? 12 : 15;
        ctx.font = "900 italic " + fs + "px Orbitron, sans-serif"; ctx.textAlign = "center";
        ctx.lineWidth = 4; ctx.strokeStyle = "rgba(0,0,0,.85)"; ctx.strokeText(p.s, p.x, y);
        ctx.fillStyle = p.c; ctx.fillText(p.s, p.x, y);
        if (p.crit) { ctx.font = "900 10px Orbitron, sans-serif"; ctx.strokeText("CRITICAL", p.x, y - fs); ctx.fillText("CRITICAL", p.x, y - fs); }
      } else if (p.k === "label") {
        ctx.globalAlpha = q > 0.75 ? (1 - q) / 0.25 : 1;
        ctx.font = "900 12px 'Noto Sans JP', sans-serif"; ctx.textAlign = "center";
        const tw = ctx.measureText(p.s).width + 18, y = p.y - 10 * q;
        ctx.fillStyle = "rgba(4,6,14,.85)"; ctx.fillRect(p.x - tw / 2, y - 14, tw, 20);
        ctx.fillStyle = p.c; ctx.fillRect(p.x - tw / 2, y - 14, 3, 20);
        ctx.fillStyle = "#fff"; ctx.fillText(p.s, p.x, y + 1);
      }
      ctx.restore();
    }
  }

  /* ── 数字・バーの描き直し（毎コマではなく間引く） ── */
  let _paintAt = 0;
  function paint(st, force) {
    const now = performance.now();
    if (!force && now - _paintAt < 66) return;
    _paintAt = now;
    const b = root();
    st.enemies.forEach((e) => {
      const el = b.querySelector('.eu[data-u="' + e.uid + '"]'); if (!el) return;
      const r = Math.max(0, e.hp / e.maxhp);
      el.querySelector(".ehp i").style.width = (r * 100).toFixed(1) + "%";
      el.querySelector(".ehp b").style.width = (r * 100).toFixed(1) + "%";
      el.querySelector(".enm span:last-child").textContent = e.immortal ? "∞" : fmtN(e.hp);
      el.classList.toggle("dead", !e.alive);
      el.classList.toggle("charging", !!e.charging);
      if (e.charging) el.querySelector(".cb i").style.width = Math.max(0, e.charging.core / e.charging.coreMax * 100) + "%";
      const db = [];
      if (e.defDownT > 0) db.push("DEF↓");
      if (e.poisonT > 0) db.push("毒");
      if (e.stun > 0) db.push("STUN");
      el.querySelector(".dbf").innerHTML = db.map((x) => "<i>" + x + "</i>").join("");
    });
    st.allies.forEach((u) => {
      const el = b.querySelector('.au[data-u="' + u.uid + '"]'); if (!el) return;
      const r = Math.max(0, u.hp / u.maxhp);
      const hi = el.querySelector(".hp i"); hi.style.width = (r * 100).toFixed(1) + "%"; hi.classList.toggle("low", r < 0.3);
      el.querySelector(".hp s").style.width = Math.min(100, u.shield / u.maxhp * 100).toFixed(1) + "%";
      const s2 = el.querySelector(".s2c"); if (s2) s2.setAttribute("stroke-dashoffset", (56.5 * Math.max(0, u.s2T / u.s2cd)).toFixed(1));
      const cd = el.querySelector(".bcd");
      if (u.bT > 0 && u.alive) { cd.hidden = false; cd.textContent = Math.ceil(u.bT); } else cd.hidden = true;
      el.classList.toggle("dead", !u.alive);
      el.classList.toggle("ready", st.stage > 0 && burstReady(st, u, st.stage));
      el.classList.toggle("fb", st.full > 0 && u.alive);
    });
    $("#bGi").style.width = (st.stage > 0 ? 100 : st.gauge) + "%";
    $("#bGauge").classList.toggle("full", st.stage > 0);
    b.querySelectorAll("#bGauge .stg span").forEach((s) => {
      const k = +s.dataset.s;
      s.className = st.stage === k ? "now" : (st.stage > k || st.full > 0) ? "ok" : "";
    });
    $("#bFB").classList.toggle("on", st.full > 0);
    if (st.full > 0) $("#bFBi").style.width = (st.full / FULL_T * 100) + "%";
    b.classList.toggle("fullb", st.full > 0);
    const tl = (st.cfg.time || 180) - st.t;
    const tm = $("#btm"); tm.textContent = Math.floor(Math.max(0, tl) / 60) + ":" + String(Math.floor(Math.max(0, tl) % 60)).padStart(2, "0");
    tm.classList.toggle("low", tl < 20);
    const sc = $("#bScore"); if (sc) sc.textContent = "DMG " + fmtN(st.cfg.mode === "sa" ? st.score : st.bossDmg);
  }
  function handleEvents(st) {
    const ev = st.events; st.events = [];
    ev.forEach((x) => {
      if (st.headless) return;
      if (x.k === "stage") { bigMsg("BURST READY", "#ffe066"); SFX.warn(); }
      else if (x.k === "full") { bigMsg("FULL BURST", "#ffe066"); SFX.full(); flash(); }
      else if (x.k === "chainbreak") bigMsg("CHAIN BREAK", "#8290b5");
      else if (x.k === "charge") { bigMsg("⚠ CHARGE", "#ff2d4a"); SFX.warn(); }
      else if (x.k === "break") { bigMsg("BREAK!!", "#7fd4ff"); SFX.brk(); shake(); const p = posOf(x.e); addP({ k: "boom", x: p.x, y: p.y, r: 160, c: "#7fd4ff", t: 0, d: 0.7 }); }
      else if (x.k === "blast") { shake(); flash(); const p = posOf(x.e); addP({ k: "ring", x: p.x, y: p.y, r0: 20, r1: 600, c: "#ff2d4a", t: 0, d: 0.7 }); }
      else if (x.k === "pray") { bigMsg(x.u.fx.godpray ? "神癒の祈り" : "治癒の祈り", "#2fd98a"); st.allies.forEach((a) => { const p = posOf(a); addP({ k: "pillar", x: p.x, y: p.y, c: "#7dffb0", t: 0, d: 1 }); }); }
      else if (x.k === "kill") { const p = posOf(x.e); addP({ k: "boom", x: p.x, y: p.y, r: 120, c: elemColor(x.e.el), t: 0, d: 0.6 }); }
    });
  }

  /* ══════════ はじめる・止める ══════════ */
  function start(cfg) {
    stop();
    sndOn = cfg.sfx !== false;
    const st = ST = mkState(cfg);
    const b = root();
    b.classList.add("on");
    document.body.style.overflow = "hidden";
    buildDOM(st);
    paint(st, true);
    bigMsg("BATTLE START", "#ff2d4a");
    acx();
    lastT = performance.now();
    const loop = (now) => {
      if (ST !== st) return;
      let dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
      if (!st.menu && !document.hidden) {
        let sim = dt * st.speed;
        while (sim > 0 && !st.over) { const d = Math.min(TICK, sim); step(st, d); sim -= d; }
        handleEvents(st);
      }
      draw(st.menu ? 0 : dt);
      paint(st);
      if (st.over && !st.ended) { st.ended = true; paint(st, true); setTimeout(() => finish(st), 700); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return st;
  }
  function finish(st) {
    if (ST !== st) return;
    (st.win ? SFX.win : SFX.lose)();
    const res = {
      win: st.win, t: st.t, giveup: !!st.giveup, timeUp: !!st.timeUp, score: st.score, bossDmg: st.bossDmg,
      allies: st.allies.map((u) => ({ id: u.id, nm: u.nm, img: u.img, dmg: u.dmg, hp: u.hp, maxhp: u.maxhp, alive: u.alive })),
      enemyHpLeft: st.enemies.reduce((a, e) => a + (e.immortal ? 0 : e.hp), 0),
    };
    if (st.cfg.onEnd) st.cfg.onEnd(res, showResult);
  }
  /* 結果の画面（中身はアプリ側が作って渡す） */
  function showResult(html, buttons) {
    const c = $("#bResC"); if (!c) return;
    c.innerHTML = html + '<div class="brow" id="bResBtns"></div>';
    const row = $("#bResBtns");
    (buttons || []).forEach((bt) => {
      const x = document.createElement("button");
      x.className = "btn " + (bt.cls || ""); x.textContent = bt.label;
      x.onclick = () => bt.fn();
      row.appendChild(x);
    });
    $("#bRes").classList.add("on");
  }
  function stop() {
    cancelAnimationFrame(raf); raf = 0; ST = null; parts.length = 0;
    const b = root(); if (b) { b.classList.remove("on", "fullb"); b.innerHTML = ""; }
    document.body.style.overflow = "";
  }

  window.MBT_BATTLE = { start, stop, simulate, synergyOf, elIcon, fmtN, SFX, MONSTERS, TUNE, setSound(v) { sndOn = !!v; } };
})();
