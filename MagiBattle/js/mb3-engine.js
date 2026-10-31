/* ============================================================
   MagiBattle 3.0 — mb3-engine.js（戦闘の本体・画面には触らない）
   ・場所の決め方：x＝左右（−1〜1）・z＝奥行き（0＝味方の遮蔽物の列〜1＝地平線）・y＝高さ（宙に浮く敵）
   ・味方5人は手前の遮蔽物のうしろ。撃っているあいだは身を出し（exposed）、隠れているあいだは遮蔽物がダメージを受ける。
   ・操作しているキャラ（ctl）は、押しているあいだだけ照準へ撃つ（B.firing・当たり判定は描画側の B.pickAt）。ほかは自動。
   ・バースト：ゲージ満タン → Ⅰ → Ⅱ → Ⅲ → FULL BURST（10秒・与ダメージ ×1.5）。Ⅰ のあとは 10秒以内に次をつなぐ。
   ・mode：stage（キャンペーン）／tower（塔）／boss（迎撃戦・与えたダメージがスコア）／arena（5対5の自動戦）
   ・描画・音のための出来事は B.ev に積む（描画側が毎フレーム取り出す）。
   ★★ 2026-10-31 ご指定「敵の攻撃パターンを増やして」：
     ・敵：dash（突進）・mortar（曲射の範囲）・heal（回復）・emp（ゲージを削る）・salvo（連射）・split（倒すと分裂）
     ・ボス：rain（ミサイルの雨）・beam（なぎ払うレーザー）・quake（地ひびき）・shield（盾）＋HP 半分で「激昂」
     ・予兆（B.marks＝地面の赤い円・B.beam・B.quake）は描画側が見せる。AI のキャラは予兆を見て隠れる（操作中のキャラはプレイヤーしだい）。
   ★★ 2026-10-31 アリーナは両方とも自動（ご指定「アリーナのバーストはどちらも自動発動に。基本的にアリーナは自動」）。
   ★★ 2026-10-31 演出のために：コンボ数（B.combo）・連続撃破（B.streak）・ヒットストップ（B.hitstop）・フルバースト中の合計ダメージ（S.fbDmg）。
   ============================================================ */
(function () {
  "use strict";
  const MB3 = (window.MB3 = window.MB3 || {});
  const ST = () => window.MBStats;
  const D = () => MB3.D;
  const rnd = Math.random;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const SLOT_X = [-0.78, -0.39, 0, 0.39, 0.78];
  const FOE_Z = 0.46;                 /* アリーナの相手の列の奥行き */
  const BURST_WINDOW = 10;            /* Ⅰ・Ⅱ のあと、次をつなげる秒数 */
  const FB_TIME = 10, FB_MUL = 1.5;
  const DEF_K = 600;

  /* ══════════ 味方（ユニット）を作る ══════════ */
  function mkUnit(side, i, m, B) {
    const S = ST(), K = S.KITS[m.id], W = S.WEAPONS[K.wp];
    const st = S.stats(m.id, m);
    const sk = m.sk || [1, 1, 1];
    const u = {
      side, i, id: m.id, K, W, st, sk, el: S.elOf(m.id), awk: m.awk | 0,
      x: side === 0 ? SLOT_X[i] : SLOT_X[i] * 0.86, z: side === 0 ? 0 : FOE_Z,
      hpMax: st.hp, hp: st.hp, shield: 0, dead: false,
      cover: { max: Math.round(st.hp * 1.25), hp: Math.round(st.hp * 1.25) },
      magBase: W.mag, mag: W.mag, ammo: W.mag, reload: 0, rT: W.reload,
      fireCd: rnd() * 0.4, chg: 0, ramp: 0, exposed: false, aimT: 0.3 + rnd() * 0.5,
      tgt: null, retgt: 0, bcd: 0, taunt: 0, buffs: [], st2: {}, cnt: { hits: 0, ripple: 0, heal: 0, regen: 0 },
      stk: {}, dmg: 0, healed: 0, taken: 0, hideT: 0, anim: { shot: 0, hit: 0, flip: 0 },
      s1: K.s1, s2: K.s2, bs: K.bs,
      v1: S.skillV(K.s1, sk[0], "v"), v2: S.skillV(K.s2, sk[1], "v"), w2: S.skillV(K.s2, sk[1], "w"),
      vb: S.skillV(K.bs, sk[2], "v"), wb: S.skillV(K.bs, sk[2], "w"),
    };
    return u;
  }
  /* 編成ぜんたいにかかるスキル（はじめに1回） */
  function applyTeamPassives(units) {
    let coverHp = 0, teamCrit = 0, teamAmmo = 0;
    units.forEach((u) => {
      if (u.s1.fx === "coverHp") coverHp += u.v1;
      if (u.s2.fx === "teamCrit") teamCrit += u.v2;
      if (u.s2.fx === "teamAmmo") teamAmmo += u.v2;
    });
    units.forEach((u) => {
      u.cover.max = Math.round(u.cover.max * (1 + coverHp / 100)); u.cover.hp = u.cover.max;
      u.st.crit += teamCrit;
      let am = teamAmmo + (u.st.ammo || 0);
      if (u.s1.fx === "gaugeGain") am += 20;
      if (u.s1.fx === "selfCrit") u.st.crit += u.v1;
      if (u.s1.fx === "coreDmg") u.st.core += u.v1;
      if (u.s2.fx === "selfDr") u.st.dr += u.v2;
      u.mag = Math.max(1, Math.round(u.magBase * (1 + am / 100))); u.ammo = u.mag;
      u.rT = u.W.reload / (1 + (u.st.reload || 0) / 100);
    });
  }

  /* ══════════ 敵を作る ══════════ */
  function mkEnemy(B, sp) {
    const Dd = D(), L = B.L;
    if (sp.boss) {
      const bd = Dd.BOSSES[sp.boss], m = Dd.enemyMul(L);
      const hpMul = B.mode === "boss" ? 30 : B.mode === "tower" ? 1.15 : 1;
      const e = {
        boss: sp.boss, bd, nm: bd.nm, isBoss: true, k: "boss", el: bd.el,
        hpMax: Math.round(bd.hp * m.hp * 0.32 * hpMul), atk: bd.atk * m.atk, def: bd.def * m.def,
        x: 0, z: 1.05, y: bd.fly || 0, tz: bd.z, spd: 0.12, size: bd.size, core: bd.core,
        parts: bd.parts.map((p) => ({ k: p.k, nm: p.nm, x: p.x, y: p.y, r: p.r, hpMax: 0, hp: 0, dead: false, frac: p.hp })),
        pat: bd.pat.slice(), patI: 0, patT: 4, act: null, cd: 99, vuln: { v: 0, t: 0 }, defDown: { v: 0, t: 0 }, burn: [], mark: 0, hitT: 0, dead: false, t: 0, gauge: 3,
        shieldHp: 0, shieldMax: 0, enraged: false, stun: 0,
      };
      e.hp = e.hpMax;
      e.parts.forEach((p) => { p.hpMax = Math.round(e.hpMax * p.frac); p.hp = p.hpMax; });
      return e;
    }
    const ed = Dd.ENEMIES[sp.k] || Dd.ENEMIES.walker, m = Dd.enemyMul(L);
    const elite = sp.elite ? 1 : 0;
    const els = ["fire", "water", "wood", "light", "dark"];
    const e = {
      k: sp.k, ed, nm: ed.nm + (elite ? "（強敵）" : ""), el: B.stageEl || els[Math.floor(rnd() * 5)],
      hpMax: Math.round(ed.hp * m.hp * (elite ? 6 : 1) * (B.hard ? 1.6 : 1)), atk: ed.atk * m.atk * (elite ? 1.6 : 1) * (B.hard ? 1.25 : 1), def: ed.def * m.def,
      x: clamp(sp.x || 0, -0.9, 0.9), z: sp.z != null ? sp.z : 0.84 + rnd() * 0.12, y: ed.fly || 0, spd: ed.spd * (0.85 + rnd() * 0.3), stop: ed.stop + (rnd() - 0.5) * 0.08,
      size: ed.size * (elite ? 1.35 : 1), core: ed.core, sh: ed.shield ? Math.round(ed.hp * m.hp * ed.shield) : 0, shMax: 0,
      cd: ed.cd * (0.6 + rnd() * 0.8), vuln: { v: 0, t: 0 }, defDown: { v: 0, t: 0 }, burn: [], mark: 0, hitT: 0, dead: false, t: rnd() * 6, elite, gauge: ed.gauge || 1, tele: null,
      dash: null, salvo: null, home: 0,
    };
    e.hp = e.hpMax; e.shMax = e.sh; e.home = e.stop;
    return e;
  }

  /* ══════════ 戦闘を作る ══════════ */
  function create(cfg) {
    const B = {
      mode: cfg.mode, t: 0, time: cfg.time || (cfg.mode === "arena" ? 90 : (cfg.stage && cfg.stage.time) || 240), over: false, result: null, speed: 1, slow: 0, hitstop: 0,
      L: cfg.stage ? cfg.stage.L : (cfg.L || 10), hard: !!(cfg.stage && cfg.stage.hard), stage: cfg.stage || null,
      side: [mkSide(0, cfg.team, null), null], enemies: [], proj: [], ev: [],
      ctl: 0, firing: false, auto: !!cfg.auto, manual: cfg.mode !== "arena",
      waveI: -1, waveT: 0, queue: [], waves: cfg.stage ? cfg.stage.waves : [], score: 0, dmgTotal: 0, kills: 0, pickAt: null, stageEl: null,
      bossRef: null, sweep: null, breakT: 0, marks: [], beam: null, quake: null, jam: 0,
      combo: { n: 0, t: 0, best: 0 }, streak: { n: 0, t: 0 }, waveClearT: 0,
    };
    B.side[0].B = B;
    if (cfg.mode === "arena") { B.side[1] = mkSide(1, cfg.foe, null); B.side[1].B = B; }
    if (cfg.mode === "boss") { B.waves = [[{ boss: cfg.boss, t: 0.5, x: 0 }]]; B.L = cfg.L || 40; B.weak = cfg.weak; }
    /* 操作するキャラ：生きている先頭の火力型 */
    const us = B.side[0].units;
    const atkI = us.findIndex((u) => u.K.cls === "atk");
    B.ctl = atkI >= 0 ? atkI : 0;
    B.ev.push({ k: "start" });
    return B;
  }
  function mkSide(n, team, B) {
    const units = (team || []).slice(0, 5).map((m, i) => mkUnit(n, i, m, B));
    applyTeamPassives(units);
    return { n, units, gauge: 0, stage: 0, stageT: 0, fb: 0, autoT: 0, bursts: 0, fbDmg: 0 };
  }

  /* ══════════ 毎フレーム ══════════ */
  function update(B, dtReal) {
    if (B.over) return;
    let dt = Math.min(0.05, dtReal) * (B.speed || 1);
    if (B.hitstop > 0) { B.hitstop -= dtReal; dt *= 0.06; }
    else if (B.slow > 0) { B.slow -= dtReal; dt *= 0.18; }
    B.t += dt;
    if (B.combo.t > 0) { B.combo.t -= dt; if (B.combo.t <= 0) { if (B.combo.n >= 10) B.ev.push({ k: "comboEnd", n: B.combo.n }); B.combo.n = 0; } }
    if (B.streak.t > 0) { B.streak.t -= dt; if (B.streak.t <= 0) B.streak.n = 0; }
    if (B.jam > 0) B.jam -= dt;
    /* 波 */
    if (B.mode !== "arena") stepWaves(B, dt);
    /* 敵 */
    B.enemies.forEach((e) => stepEnemy(B, e, dt));
    B.enemies = B.enemies.filter((e) => !(e.dead && e.dieT <= 0));
    /* 敵の弾・地面の予兆（曲射・ミサイルの雨）・レーザー・地ひびき */
    stepProj(B, dt);
    stepMarks(B, dt);
    stepBeam(B, dt);
    stepQuake(B, dt);
    /* 味方（と相手）*/
    [0, 1].forEach((n) => { const S = B.side[n]; if (!S) return; stepSide(B, S, dt); S.units.forEach((u) => stepUnit(B, S, u, dt)); });
    /* 終わり */
    checkEnd(B);
  }

  function stepWaves(B, dt) {
    if (B.waveI < 0 || (B.queue.length === 0 && B.enemies.every((e) => e.dead))) {
      if (B.waveI >= 0 && !B._clearSent) { B._clearSent = true; if (B.waveI + 1 < B.waves.length) B.ev.push({ k: "waveClear", n: B.waveI + 1 }); }
      if (B.waveI + 1 >= B.waves.length) { if (B.waveI >= 0) B.cleared = true; return; }
      B.waveT += dt;
      if (B.waveI < 0 || B.waveT > 1.6) {
        B.waveI++; B.waveT = 0; B._clearSent = false;
        B.queue = B.waves[B.waveI].map((s) => Object.assign({}, s)).sort((a, b) => a.t - b.t);
        B.waveClock = 0;
        B.ev.push({ k: "wave", n: B.waveI + 1, of: B.waves.length, boss: B.queue.some((s) => s.boss) });
      }
      return;
    }
    B.waveClock = (B.waveClock || 0) + dt;
    while (B.queue.length && B.queue[0].t <= B.waveClock) {
      const sp = B.queue.shift();
      const e = mkEnemy(B, sp);
      B.enemies.push(e);
      if (e.isBoss) { B.bossRef = e; B.ev.push({ k: "boss", nm: e.nm, code: e.bd.code }); }
    }
  }

  /* ── 敵の動き ── */
  function aiHides(B, u) { return !(B.ctl === u.i && B.manual && !B.auto); }   /* 操作中のキャラはプレイヤーしだい */
  function stepEnemy(B, e, dt) {
    e.t += dt; if (e.hitT > 0) e.hitT -= dt;
    if (e.dead) { e.dieT -= dt; return; }
    if (e.vuln.t > 0) e.vuln.t -= dt;
    if (e.defDown.t > 0) e.defDown.t -= dt;
    /* 燃焼 */
    if (e.burn.length) {
      e.burn.forEach((b) => { b.t -= dt; b.acc = (b.acc || 0) + dt; if (b.acc >= 1) { b.acc -= 1; dmgEnemy(B, b.src, e, b.dps, { dot: 1, noGauge: 1 }); } });
      e.burn = e.burn.filter((b) => b.t > 0);
      if (e.dead) return;
    }
    if (e.isBoss) return stepBoss(B, e, dt);
    const ed = e.ed;
    /* 突進のとちゅう（ランサー） */
    if (e.dash) { stepDash(B, e, dt); return; }
    /* 前進 */
    if (e.z > e.stop) { e.z -= e.spd * dt; if (e.k === "drone" || e.k === "mini") e.x += Math.sin(e.t * 1.7) * dt * 0.08; }
    else if (e.k === "bomber") { explodeBomber(B, e); return; }
    else if (ed.fly) e.x += Math.sin(e.t * 1.2) * dt * 0.05;
    e.x = clamp(e.x, -0.95, 0.95);
    if (e.k === "bomber") return;
    /* 攻撃：近づきながらでも撃つ（遠すぎるときだけ撃たない） */
    if (e.z > 0.86) return;
    if (e.tele) {
      e.tele.t -= dt;
      if (e.tele.t <= 0) { const u = e.tele.u; e.tele = null; if (u && !u.dead) hitUnit(B, u, e.atk * 2.6, { src: e, laser: 1 }); B.ev.push({ k: "laser", e, u }); }
      return;
    }
    /* タレットの連射 */
    if (e.salvo) {
      e.salvo.acc += dt;
      while (e.salvo.acc >= 0.13 && e.salvo.n > 0) { e.salvo.acc -= 0.13; e.salvo.n--; const u = e.salvo.u && !e.salvo.u.dead ? e.salvo.u : pickVictim(B, 0); if (u) fireBullet(B, e, u, e.atk * 1.1, 0.3); }
      if (e.salvo.n <= 0) e.salvo = null;
      return;
    }
    e.cd -= dt;
    if (e.cd > 0) return;
    e.cd = ed.cd * (0.85 + rnd() * 0.3);
    const u = pickVictim(B, 0);
    if (!u) return;
    switch (ed.atkT) {
      case "bullet": fireBullet(B, e, u, e.atk, 0.32); break;
      case "shell": fireBullet(B, e, u, e.atk * 2.2, 0.62, { shell: 1 }); break;
      case "missile": fireMissile(B, e, u, e.atk * 2.0); break;
      case "laser":
        e.tele = { u, t: 1.6 }; B.ev.push({ k: "tele", e, u });
        /* 狙われた AI のキャラは半分くらいの確率で隠れてかわす（操作中のキャラはプレイヤーしだい） */
        if (aiHides(B, u) && rnd() < 0.5) u.hideT = 1.8;
        break;
      case "dash":   /* 近いときだけ突進。遠ければ近づく */
        if (e.z > 0.3) { e.cd = 0.4; break; }
        e.dash = { ph: 0, t: 0.9, u, x0: e.x, z0: e.z }; B.ev.push({ k: "dashTele", e, u });
        if (aiHides(B, u) && rnd() < 0.6) u.hideT = 1.5;
        break;
      case "mortar": {   /* 曲射：狙ったキャラの場所に赤い円 → 1.7秒後に着弾（となりにも半分） */
        addMark(B, u.i, 1.7, e.atk * 2.1, e, "mortar");
        B.ev.push({ k: "eshot", e, mortar: 1 });
        break;
      }
      case "heal": {   /* 回復：いちばん減っている仲間を 14% 回復 */
        const al = B.enemies.filter((x) => !x.dead && !x.isBoss && x.hp < x.hpMax).sort((a, b) => a.hp / a.hpMax - b.hp / b.hpMax)[0];
        if (al) { const v = Math.round(al.hpMax * 0.14); al.hp = Math.min(al.hpMax, al.hp + v); B.ev.push({ k: "eheal", e, t: al, v }); }
        else e.cd = 1.2;
        break;
      }
      case "emp":
        e.tele = null; e.emp = { t: 1.4 }; B.ev.push({ k: "empTele", e }); e.cd = ed.cd; stepEmpLater(B, e);
        break;
      case "salvo":
        e.salvo = { n: 3 + Math.floor(rnd() * 3), acc: 0, u }; B.ev.push({ k: "salvoTele", e });
        break;
    }
  }
  /* EMP：1.4秒の予兆のあと（敵が生きていれば）ゲージを削り、リロード中のキャラを遅らせ、操作中のキャラを少し止める */
  function stepEmpLater(B, e) {
    e.empFire = B.t + 1.4;
    B.marks.push({ k: "emp", e, at: B.t + 1.4, done: false });
  }
  function fireEmp(B, e) {
    const S = B.side[0];
    if (S.stage === 0 && S.fb <= 0) S.gauge = Math.max(0, S.gauge - 22);
    S.units.forEach((u) => { if (!u.dead && u.reload > 0) u.reload += 1.2; });
    B.jam = 0.9;
    B.ev.push({ k: "emp", e });
  }
  /* 突進：0.9秒光る（予兆）→ 0.35秒で目の前へ → 当てる → 元の位置へ戻る */
  function stepDash(B, e, dt) {
    const d = e.dash; d.t -= dt;
    if (d.ph === 0) { if (d.t <= 0) { d.ph = 1; d.t = 0.35; B.ev.push({ k: "dash", e }); } return; }
    if (d.ph === 1) {
      const f = 1 - Math.max(0, d.t) / 0.35;
      const tx = d.u && !d.u.dead ? d.u.x : d.x0;
      e.x = d.x0 + (tx - d.x0) * f; e.z = d.z0 * (1 - f) + 0.02 * f;
      if (d.t <= 0) {
        d.ph = 2; d.t = 0.8;
        const u = d.u && !d.u.dead ? d.u : nearestSlot(B, e.x);
        if (u) hitUnit(B, u, e.atk * 2.4, { src: e, dash: 1 });
        B.ev.push({ k: "dashHit", e, u });
      }
      return;
    }
    if (d.ph === 2) { const f = 1 - Math.max(0, d.t) / 0.8; e.z = 0.02 + (Math.max(0.2, d.z0) - 0.02) * f; if (d.t <= 0) { e.dash = null; e.cd = e.ed.cd * (0.8 + rnd() * 0.4); } }
  }
  function explodeBomber(B, e) {
    const near = nearestSlot(B, e.x);
    if (near) hitUnit(B, near, e.atk * 1.6, { src: e, bomb: 1 });
    e.dead = true; e.dieT = 0.6; e.hp = 0;
    B.ev.push({ k: "boom", x: e.x, z: 0.02, y: 0, s: 1.4 });
  }
  function nearestSlot(B, x) {
    let best = null, bd = 9;
    B.side[0].units.forEach((u) => { if (u.dead) return; const d = Math.abs(u.x - x); if (d < bd) { bd = d; best = u; } });
    return best;
  }
  /* 狙われる味方：挑発中のキャラ → それ以外は身を出しているキャラをやや狙いやすく */
  function pickVictim(B, n) {
    const us = B.side[n].units.filter((u) => !u.dead);
    if (!us.length) return null;
    const tn = us.filter((u) => u.taunt > 0);
    if (tn.length) return tn[0];
    let tot = 0; const w = us.map((u) => { const x = u.exposed ? 2 : 1; tot += x; return x; });
    let r = rnd() * tot;
    for (let i = 0; i < us.length; i++) { r -= w[i]; if (r <= 0) return us[i]; }
    return us[us.length - 1];
  }
  function fireBullet(B, e, u, dmg, tt, opt) {
    B.proj.push(Object.assign({ k: "bullet", e, u, dmg, t: tt, tt, x0: e.x, z0: e.z, y0: e.y + 0.1 }, opt || {}));
    B.ev.push({ k: "eshot", e });
  }
  function fireMissile(B, e, u, dmg) {
    const hp = Math.max(60, e.atk * 9 * (1 + B.L * 0.05));
    B.proj.push({ k: "missile", e, u, dmg, t: 2.6, tt: 2.6, x0: e.x, z0: e.z, y0: e.y + 0.12, hp, hpMax: hp, x: e.x, z: e.z, y: 0, dead: false });
    B.ev.push({ k: "eshot", e, missile: 1 });
  }
  function stepProj(B, dt) {
    B.proj.forEach((p) => {
      if (p.dead) return;
      p.t -= dt;
      const f = 1 - p.t / p.tt;
      if (p.k === "missile") { p.x = p.x0 + (p.u.x - p.x0) * f; p.z = p.z0 * (1 - f); p.y = p.y0 + Math.sin(f * Math.PI) * 0.22; }
      if (p.t <= 0) {
        p.dead = true;
        if (!p.u.dead) hitUnit(B, p.u, p.dmg, { src: p.e, shell: p.shell, missile: p.k === "missile" });
        if (p.k === "missile" || p.shell) B.ev.push({ k: "boom", x: p.u.x, z: 0.02, y: 0, s: p.k === "missile" ? 1.1 : 0.8 });
      }
    });
    B.proj = B.proj.filter((p) => !p.dead);
  }
  /* ── 地面の予兆（曲射・ミサイルの雨）：B.marks の円が 0 になったら着弾 ── */
  function addMark(B, slot, t, dmg, src, kind) {
    B.marks.push({ k: kind || "mortar", i: slot, t, tt: t, dmg, src, done: false });
    const u = B.side[0].units[slot];
    if (u && !u.dead && aiHides(B, u) && rnd() < 0.7) u.hideT = Math.max(u.hideT, t + 0.35);
  }
  function stepMarks(B, dt) {
    if (!B.marks.length) return;
    B.marks.forEach((m) => {
      if (m.done) return;
      if (m.k === "emp") { if (B.t >= m.at) { m.done = true; if (m.e && !m.e.dead) fireEmp(B, m.e); if (m.e) m.e.emp = null; } return; }
      m.t -= dt;
      if (m.t > 0) return;
      m.done = true;
      const us = B.side[0].units;
      [m.i - 1, m.i, m.i + 1].forEach((j) => { const u = us[j]; if (!u || u.dead) return; hitUnit(B, u, m.dmg * (j === m.i ? 1 : 0.45), { src: m.src, area: 1 }); });
      B.ev.push({ k: "markHit", i: m.i, kind: m.k });
    });
    B.marks = B.marks.filter((m) => !m.done);
  }
  /* ── レーザー（なぎ払い）：予兆 1.0秒 → 左から右へ 1.6秒。光線が通ったキャラに当たる ── */
  function stepBeam(B, dt) {
    const bm = B.beam; if (!bm) return;
    bm.t += dt;
    if (bm.t < bm.tele) return;
    const f = Math.min(1, (bm.t - bm.tele) / bm.dur);
    bm.x = -1.1 + 2.2 * f;
    B.side[0].units.forEach((u) => {
      if (u.dead || bm.hit[u.i]) return;
      if (Math.abs(u.x - bm.x) < 0.12) { bm.hit[u.i] = 1; hitUnit(B, u, bm.dmg, { src: bm.src, beam: 1 }); B.ev.push({ k: "beamHit", i: u.i }); }
    });
    /* AI はレーザーが近づいたら隠れる */
    B.side[0].units.forEach((u) => { if (!u.dead && !bm.hit[u.i] && aiHides(B, u) && u.x - bm.x < 0.5 && u.x - bm.x > 0 && !u._bh) { u._bh = 1; if (rnd() < 0.8) u.hideT = Math.max(u.hideT, 0.9); } });
    if (f >= 1) { B.beam = null; B.side[0].units.forEach((u) => { u._bh = 0; }); }
  }
  /* ── 地ひびき：予兆 1.3秒 → 身を出しているキャラに大ダメージ・隠れていれば遮蔽物が少し受ける ── */
  function stepQuake(B, dt) {
    const q = B.quake; if (!q) return;
    q.t -= dt;
    if (q.t > 0) return;
    B.quake = null;
    B.side[0].units.forEach((u) => { if (!u.dead) hitUnit(B, u, q.dmg, { src: q.src, quake: 1 }); });
    B.ev.push({ k: "quake" });
  }

  /* ── ボス ── */
  function stepBoss(B, e, dt) {
    if (e.z > e.tz) { e.z -= e.spd * dt; return; }
    e.x = Math.sin(e.t * 0.35) * 0.12;
    if (e.stun > 0) { e.stun -= dt; return; }
    /* 激昂（HP 半分）：攻撃が速く・強く、ミサイルの雨がふえる */
    if (!e.enraged && e.hp < e.hpMax * 0.5 && B.mode !== "boss") {
      e.enraged = true; e.atk *= 1.15; e.pat.splice(e.patI % e.pat.length, 0, "rain");
      B.ev.push({ k: "enrage", e }); B.hitstop = Math.max(B.hitstop, 0.25);
    }
    /* いまの技 */
    if (e.act) {
      const a = e.act; a.t += dt;
      if (a.k === "barrage") { a.acc += dt; while (a.acc >= 0.22 && a.n > 0) { a.acc -= 0.22; a.n--; const u = pickVictim(B, 0); if (u) fireBullet(B, e, u, e.atk * 0.9, 0.36); } if (a.n <= 0) e.act = null; }
      else if (a.k === "missiles") { a.acc += dt; while (a.acc >= 0.45 && a.n > 0) { a.acc -= 0.45; a.n--; const u = pickVictim(B, 0); if (u) fireMissile(B, e, u, e.atk * 2.2); } if (a.n <= 0) e.act = null; }
      else if (a.k === "sweep") { if (a.t >= 1.8) { B.side[0].units.forEach((u) => { if (!u.dead) hitUnit(B, u, e.atk * 2.4, { src: e, sweep: 1 }); }); B.ev.push({ k: "sweep", e }); B.sweep = null; e.act = null; } }
      else if (a.k === "charge") {
        if (a.dmg >= a.need) { e.act = null; e.stun = 3.2; B.breakT = 0; B.ev.push({ k: "break", e, ok: 1 }); B.hitstop = Math.max(B.hitstop, 0.3); }
        else if (a.t >= a.dur) { e.act = null; B.breakT = 0; B.side[0].units.forEach((u) => { if (!u.dead) hitUnit(B, u, e.atk * 4.2, { src: e, big: 1 }); }); B.ev.push({ k: "break", e, ok: 0 }); B.ev.push({ k: "boom", x: 0, z: 0.05, y: 0, s: 2.6 }); }
        else B.breakT = 1 - a.t / a.dur;
      }
      else if (a.k === "summon") { const kk = B.stage && B.stage.c >= 4 ? ["drone", "mini", "healer"] : ["drone", "mini"]; for (let i = 0; i < 3; i++) B.enemies.push(mkEnemy(B, { k: kk[i % kk.length], x: -0.6 + i * 0.6 })); e.act = null; }
      else if (a.k === "rain") { a.acc += dt; while (a.acc >= 0.32 && a.n > 0) { a.acc -= 0.32; a.n--; const alive = B.side[0].units.filter((u) => !u.dead); const u = alive[Math.floor(rnd() * alive.length)]; if (u) addMark(B, u.i, 1.25, e.atk * 1.7, e, "rain"); } if (a.n <= 0) e.act = null; }
      else if (a.k === "beam" || a.k === "quake") { if (!B.beam && !B.quake) e.act = null; }
      else if (a.k === "shield") { if (e.shieldHp <= 0 || a.t > 14) { if (e.shieldHp > 0) { e.shieldHp = 0; B.ev.push({ k: "shieldDown", e }); } e.act = null; } }
      return;
    }
    e.patT -= dt;
    if (e.patT > 0) return;
    const k = e.pat[e.patI % e.pat.length]; e.patI++;
    const partsDown = e.parts.filter((p) => p.dead).length;
    e.patT = (3.4 + rnd() * 1.6) * (e.enraged ? 0.68 : 1);
    B.ev.push({ k: "bossMove", e, move: k });
    if (k === "barrage") e.act = { k, t: 0, acc: 0, n: Math.max(5, 12 - partsDown * 3) + (e.enraged ? 4 : 0) };
    else if (k === "missiles") e.act = { k, t: 0, acc: 0, n: Math.max(2, 4 - partsDown) + (e.enraged ? 1 : 0) };
    else if (k === "sweep") { e.act = { k, t: 0 }; B.sweep = { t: 1.8 }; B.ev.push({ k: "sweepTele", e }); }
    else if (k === "charge") { e.act = { k, t: 0, dur: 6, dmg: 0, need: e.hpMax * (B.mode === "boss" ? 0.012 : 0.07) }; B.ev.push({ k: "charge", e }); }
    else if (k === "summon") e.act = { k, t: 0 };
    else if (k === "rain") { e.act = { k, t: 0, acc: 0, n: 6 + (e.enraged ? 3 : 0) - partsDown }; B.ev.push({ k: "rainTele", e }); }
    else if (k === "beam") { e.act = { k, t: 0 }; B.beam = { t: 0, tele: 1.0, dur: 1.7, x: -1.1, dmg: e.atk * 2.6, src: e, hit: {} }; B.ev.push({ k: "beamTele", e }); }
    else if (k === "quake") { e.act = { k, t: 0 }; B.quake = { t: 1.3, tt: 1.3, dmg: e.atk * 3.0, src: e }; B.ev.push({ k: "quakeTele", e }); B.side[0].units.forEach((u) => { if (!u.dead && aiHides(B, u) && rnd() < 0.85) u.hideT = Math.max(u.hideT, 1.6); }); }
    else if (k === "shield") { e.shieldMax = Math.round(e.hpMax * (B.mode === "boss" ? 0.02 : 0.09)); e.shieldHp = e.shieldMax; e.act = { k, t: 0 }; B.ev.push({ k: "shieldUp", e }); }
  }

  /* ══════════ バースト ══════════ */
  function stepSide(B, S, dt) {
    if (S.fb > 0) { S.fb -= dt; if (S.fb <= 0) { S.fb = 0; B.ev.push({ k: "fbEnd", side: S.n, dmg: S.fbDmg }); } }
    if (S.stage >= 2) { S.stageT -= dt; if (S.stageT <= 0) { S.stage = 0; S.gauge = 0; B.ev.push({ k: "burstLost", side: S.n }); } }
    /* その段のバーストを持つキャラが（生きて）いない編成は、次の段へ進める（ゲージが満タンのまま止まらないように） */
    if (S.stage > 0 && !S.units.some((u) => !u.dead && u.K.burst === S.stage)) {
      if (S.stage >= 3) { S.stage = 0; S.gauge = 0; B.ev.push({ k: "burstLost", side: S.n }); }
      else { S.stage++; S.stageT = BURST_WINDOW; }
    }
    S.units.forEach((u) => { if (u.bcd > 0) u.bcd -= dt; });
    /* 自動のバースト（相手側・AUTO のとき・アリーナは両方） */
    const auto = S.n === 1 || B.auto || B.mode === "arena";
    if (auto && S.stage > 0) {
      S.autoT += dt;
      if (S.autoT >= (S.n === 1 ? 0.7 : 0.45)) {
        const c = burstCands(S);
        if (c.length) { c.sort((a, b) => (S.stage === 3 ? b.st.atk - a.st.atk : a.i - b.i)); doBurst(B, S, c[0]); }
        S.autoT = 0;
      }
    }
  }
  function burstCands(S) { return S.units.filter((u) => !u.dead && u.K.burst === S.stage && u.bcd <= 0); }
  function addGauge(B, S, u, g) {
    if (S.stage > 0 || S.fb > 0) return;
    S.gauge += g * (1 + ((u.st.gauge || 0) + (u.s1.fx === "gaugeGain" ? u.v1 : 0)) / 100);
    if (S.gauge >= 100) { S.gauge = 100; S.stage = 1; S.stageT = 999; S.autoT = 0; B.ev.push({ k: "burstReady", side: S.n }); }
  }
  function doBurst(B, S, u) {
    if (!u || u.dead || u.K.burst !== S.stage || u.bcd > 0) return false;
    const st = S.stage;
    u.bcd = u.K.cd;
    S.bursts++;
    B.ev.push({ k: "cut", side: S.n, id: u.id, stage: st, nm: u.bs.nm, i: u.i });
    if (S.n === 0) B.slow = Math.max(B.slow, 0.9);
    applyBurst(B, S, u);
    if (st >= 3) { S.fb = FB_TIME; S.fbDmg = 0; S.stage = 0; S.gauge = 0; B.ev.push({ k: "fb", side: S.n }); onFullBurst(B, S); }
    else { S.stage = st + 1; S.stageT = BURST_WINDOW; S.autoT = 0; }
    return true;
  }
  function onFullBurst(B, S) {
    S.units.forEach((u) => { if (!u.dead && u.s2.fx === "fbTeamAtk") S.units.forEach((a) => buff(a, "atk", u.v2, 10)); });
  }
  function buff(u, k, v, t) { if (u.dead) return; u.buffs.push({ k, v, t }); }
  function buffSum(u, k) { let s = 0; for (const b of u.buffs) if (b.k === k) s += b.v; return s; }
  function foes(B, S) { return S.n === 0 ? (B.mode === "arena" ? B.side[1].units.filter((x) => !x.dead) : B.enemies.filter((e) => !e.dead)) : B.side[0].units.filter((x) => !x.dead); }
  function mainTarget(B, S, u) {
    const f = foes(B, S); if (!f.length) return null;
    if (B.bossRef && !B.bossRef.dead && S.n === 0 && B.mode !== "arena") return B.bossRef;
    if (u.tgt && !u.tgt.dead && f.indexOf(u.tgt) >= 0) return u.tgt;
    return f.slice().sort((a, b) => (b.hpMax || 0) - (a.hpMax || 0))[0];
  }
  function applyBurst(B, S, u) {
    const al = S.units.filter((x) => !x.dead), atk = atkOf(B, S, u);
    const fx = u.bs.fx, f = foes(B, S);
    let tgt = null;
    const heal = (a, v) => { if (a.dead) return; const h = Math.min(a.hpMax - a.hp, v); a.hp += h; u.healed += h; if (h > 0) B.ev.push({ k: "heal", side: S.n, i: a.i, v: h }); };
    const hitT = (t, mul, o) => { if (!t) return; if (t.side != null) dmgUnitFromUnit(B, u, t, mul, Object.assign({ skill: 1 }, o)); else dmgEnemy(B, u, t, atk * mul, Object.assign({ skill: 1 }, o)); };
    switch (fx) {
      case "cdrHeal": al.forEach((a) => { if (a !== u) a.bcd = Math.max(0, a.bcd - u.vb); heal(a, atk * u.wb / 100); buff(a, "dr", 10, 5); }); break;
      case "teamAtkReload": al.forEach((a) => { buff(a, "atk", u.vb, 10); a.ammo = a.mag; a.reload = 0; }); break;
      case "tauntShield": u.taunt = 10; al.forEach((a) => { a.shield = Math.max(a.shield, a.hpMax * u.vb / 100); a.cover.hp = Math.min(a.cover.max, a.cover.hp + a.cover.max * 0.3); }); break;
      case "critDmgChg": tgt = mainTarget(B, S, u); al.forEach((a) => { buff(a, "critDmg", u.vb, 10); buff(a, "chg", 20, 10); }); hitT(tgt, u.wb / 100, {}); break;
      case "teamDrHeal": al.forEach((a) => { buff(a, "dr", u.vb, 10); heal(a, atk * u.wb / 100); buff(a, "regen", atk * 0.05, 10); }); break;
      case "aoeVuln": f.forEach((t) => { hitT(t, u.vb / 100, { aoe: 1 }); if (t.vuln) { t.vuln.v = Math.max(t.vuln.v || 0, u.wb); t.vuln.t = 10; } else buff(t, "vuln", u.wb, 10); }); break;
      case "coreSnipe": { tgt = mainTarget(B, S, u); hitT(tgt, u.vb / 100, { core: 1, crit: 1 }); al.forEach((a) => buff(a, "core", u.wb, 10)); break; }
      case "chargeOverdrive": tgt = mainTarget(B, S, u); buff(u, "chgDmg", u.vb, 10); buff(u, "chgFast", 1, 10); hitT(tgt, u.wb / 100, { charge: 0 }); break;
      case "arOverdrive": buff(u, "atk", u.vb, 10); buff(u, "critDmg", u.wb, 10); buff(u, "rate2", 1, 10); break;
      case "sgOverdrive": tgt = mainTarget(B, S, u); hitT(tgt, u.vb / 100, {}); buff(u, "pel2", 1, 10); break;
      case "aoeBurn": f.forEach((t) => { hitT(t, u.vb / 100, { aoe: 1 }); if (t.burn) t.burn.push({ dps: atk * u.wb / 100, t: 10, src: u }); }); break;
      case "mgOverdrive": buff(u, "atk", u.vb, 10); buff(u, "mgMax", 1, 10); u.ramp = 1; u.ammo = u.mag; u.reload = 0; break;
    }
    B.ev.push({ k: "burstFx", side: S.n, i: u.i, fx, id: u.id, tgt });
  }

  /* ══════════ 味方1人 ══════════ */
  function atkOf(B, S, u) {
    let p = buffSum(u, "atk");
    const fb = S.fb > 0;
    if (fb && u.s2.fx === "fbChargeAtk") p += u.v2;
    if (fb && u.s2.fx === "fbSelfAtk") p += u.v2;
    if (u.s2.fx === "atkIfEnemies" && foes(B, S).length >= (u.s2.n || 3)) p += u.v2;
    ["chargeAtk", "critAtk", "coreAtk"].forEach((k) => { const s = u.stk[k]; if (s && s.t > 0) p += s.n * s.v; });
    return u.st.atk * (1 + p / 100);
  }
  function stepUnit(B, S, u, dt) {
    if (u.anim.shot > 0) u.anim.shot -= dt; if (u.anim.hit > 0) u.anim.hit -= dt;
    if (u.dead) { u.exposed = false; return; }
    /* 強化の時間 */
    u.buffs.forEach((b) => { b.t -= dt; });
    u.buffs = u.buffs.filter((b) => b.t > 0);
    Object.keys(u.stk).forEach((k) => { const s = u.stk[k]; s.t -= dt; if (s.t <= 0) s.n = 0; });
    if (u.taunt > 0) u.taunt -= dt;
    /* 持続回復 */
    const rg = buffSum(u, "regen");
    if (rg > 0) { u.cnt.regen += dt; if (u.cnt.regen >= 1) { u.cnt.regen -= 1; const h = Math.min(u.hpMax - u.hp, rg); u.hp += h; } }
    /* ショウコのスキル1：5秒ごとに HP がいちばん低い味方を回復 */
    if (u.s1.fx === "healLowest") {
      u.cnt.heal += dt;
      if (u.cnt.heal >= (u.s1.period || 5)) { u.cnt.heal = 0; const al = S.units.filter((a) => !a.dead).sort((a, b) => a.hp / a.hpMax - b.hp / b.hpMax)[0]; if (al) { const h = Math.min(al.hpMax - al.hp, atkOf(B, S, u) * u.v1 / 100); al.hp += h; u.healed += h; if (h > 0) B.ev.push({ k: "heal", side: S.n, i: al.i, v: h }); } }
    }
    /* リロード中 */
    if (u.reload > 0) { u.reload -= dt; u.exposed = false; u.chg = 0; if (u.reload <= 0) { u.reload = 0; u.ammo = u.mag; } return; }
    const ctl = S.n === 0 && B.ctl === u.i && B.manual && !B.auto;
    /* 撃つか（AI は敵がいれば撃つ。なぎはらい・地ひびきの予兆のあいだは隠れる） */
    let want;
    if (ctl) want = B.firing && !(B.jam > 0);
    else {
      const f = foes(B, S);
      want = f.length > 0;
      if ((B.sweep || B.quake) && S.n === 0) want = false;
      if (u.hideT > 0) { u.hideT -= dt; want = false; }
      if (want) { u.aimT -= dt; if (u.aimT > 0) want = false; }
    }
    const mgMax = buffSum(u, "mgMax") > 0;
    if (!want) {
      if (u.exposed) u.aimT = 0.25 + rnd() * 0.35;
      u.exposed = false;
      if (u.W.chg && u.chg > 0 && ctl) u.chg = Math.max(0, u.chg - dt * 2);
      if (!mgMax) u.ramp = Math.max(0, u.ramp - dt * 1.5);
      if (ctl && u.ammo < u.mag * 0.4) startReload(B, u);
      return;
    }
    if (u.ammo <= 0 && !mgMax) { startReload(B, u); return; }
    u.exposed = true;
    /* AI のねらい（ときどき狙いなおす・ミサイルが近ければ落とす） */
    if (!ctl) {
      u.retgt -= dt;
      if (u.retgt <= 0 || !u.tgt || u.tgt.dead) { u.tgt = chooseTarget(B, S, u); u.retgt = 1.2 + rnd() * 1.2; }
      if (!u.tgt) { u.exposed = false; return; }
    }
    const W = u.W;
    const rateMul = (buffSum(u, "rate2") > 0 ? 2 : 1);
    if (W.chg) {
      /* SR・RL：チャージしてから撃つ */
      let spd = (1 + ((u.st.chg || 0) + buffSum(u, "chg") + (S.fb > 0 && u.s2.fx === "fbChargeAtk" ? u.w2 : 0)) / 100) / W.chg;
      if (buffSum(u, "chgFast") > 0) spd *= 2;
      if (u.fireCd > 0) { u.fireCd -= dt; return; }
      u.chg += dt * spd;
      if (u.chg >= 1) { u.chg = 0; u.fireCd = 0.28; shoot(B, S, u, { charge: 1 }); u.ammo--; }
      return;
    }
    let rate = W.rate;
    if (W.ramp) { u.ramp = mgMax ? 1 : Math.min(1, u.ramp + dt / W.ramp); rate = W.rate0 + (W.rate - W.rate0) * u.ramp; }
    rate *= rateMul;
    u.fireCd -= dt;
    let guard = 0;
    while (u.fireCd <= 0 && (u.ammo > 0 || mgMax) && guard++ < 6) {
      u.fireCd += 1 / rate;
      shoot(B, S, u, {});
      if (!mgMax) u.ammo--;
      if (u.dead || B.over) break;
    }
  }
  function startReload(B, u) {
    if (u.reload > 0 || u.ammo >= u.mag) return;
    u.reload = u.rT; u.exposed = false; u.chg = 0;
    B.ev.push({ k: "reload", side: u.side, i: u.i });
  }
  function chooseTarget(B, S, u) {
    if (B.mode === "arena") {
      const f = foes(B, S); if (!f.length) return null;
      const tn = f.filter((x) => x.taunt > 0); if (tn.length) return tn[0];
      const opp = f.find((x) => x.i === u.i); if (opp && rnd() < 0.5) return opp;
      return f[Math.floor(rnd() * f.length)];
    }
    /* 近いミサイル（手前半分）を優先して撃ち落とす */
    const ms = B.proj.filter((p) => p.k === "missile" && !p.dead && p.z < 0.6);
    if (ms.length && rnd() < 0.7) return ms.sort((a, b) => a.z - b.z)[0];
    const f = B.enemies.filter((e) => !e.dead && e.z < 1.0);
    if (!f.length) return null;
    /* 得意な距離の敵を少し優先・ボスは常に候補・回復役と突進の構えは先に */
    const W = u.W;
    const sc = (e) => { let s = 0; if (e.isBoss) s += 2; if (e.z >= W.opt[0] && e.z <= W.opt[1]) s += 1.5; s += (1 - e.z) * 1.2; if (e.k === "bomber" && e.z < 0.4) s += 3; if (e.tele) s += 2; if (e.k === "healer") s += 1.6; if (e.dash) s += 2.2; if (e.emp) s += 1; return s + rnd() * 0.8; };
    return f.slice().sort((a, b) => sc(b) - sc(a))[0];
  }

  /* ── 1発（散弾は粒ごと） ── */
  function shoot(B, S, u, o) {
    const W = u.W;
    u.anim.shot = 0.09;
    const ctl = S.n === 0 && B.ctl === u.i && B.manual && !B.auto;
    const n = W.pel ? W.pel * (buffSum(u, "pel2") > 0 ? 2 : 1) : 1;
    const mul = W.mul;
    let anyHit = false, hx = null;
    for (let k = 0; k < n; k++) {
      let t = null, part = "body";
      if (ctl && B.pickAt) {
        const sp = W.pel ? 0.06 : W.chg ? 0.004 : W.sh === "SMG" ? 0.022 : W.sh === "MG" ? 0.026 : 0.016;
        const r = B.pickAt((rnd() - 0.5) * 2 * sp, (rnd() - 0.5) * 2 * sp);
        if (r) { t = r.t; part = r.part || "body"; }
      } else {
        t = u.tgt;
        if (t) {
          let acc = W.pel ? 0.7 : W.chg ? 0.97 : 0.9;
          acc *= 1 + (u.st.hit || 0) / 100;
          if (t.z != null && t.side == null) { if (W.pel && t.z > 0.5) acc *= 0.55; }
          if (rnd() > acc) t = null;
          else if (t.core && !t.isBoss && rnd() < (W.chg ? 0.3 : 0.12)) part = "core";
          else if (t.isBoss && rnd() < (W.chg ? 0.3 : 0.1)) part = "core";
          else if (t.isBoss && t.parts && rnd() < 0.18) { const pa = t.parts.filter((p) => !p.dead); if (pa.length) part = pa[Math.floor(rnd() * pa.length)].k; }
        }
      }
      if (!t) continue;
      anyHit = true; hx = t;
      if (t.k === "missile") { t.hp -= atkOf(B, S, u) * mul * (o.charge ? (W.chgMul || 1) : 1); if (t.hp <= 0 && !t.dead) { t.dead = true; B.ev.push({ k: "boom", x: t.x, z: t.z, y: t.y, s: 0.7 }); B.ev.push({ k: "shotDown", x: t.x, z: t.z, y: t.y }); } continue; }
      if (t.side != null) { dmgUnitFromUnit(B, u, t, mul * (o.charge ? (W.chgMul || 1) * (1 + ((u.st.chgDmg || 0) + buffSum(u, "chgDmg")) / 100) : 1), { charge: o.charge, splash: W.splash }); }
      else {
        let m = mul;
        if (o.charge) m *= (W.chgMul || 1) * (1 + ((u.st.chgDmg || 0) + buffSum(u, "chgDmg") + (u.s1.fx === "pierceCharge" ? u.v1 : 0)) / 100);
        dmgEnemy(B, u, t, atkOf(B, S, u) * m, { core: part === "core", part: part !== "core" && part !== "body" ? part : null, charge: o.charge, pellet: !!W.pel });
        /* ロケットの爆風 */
        if (W.splash) B.enemies.forEach((e2) => { if (e2 === t || e2.dead) return; if (Math.hypot(e2.x - t.x, (e2.z - t.z) * 2) < W.splash * 2.2) dmgEnemy(B, u, e2, atkOf(B, S, u) * m * 0.5, { splash: 1, charge: o.charge }); });
        /* ヒサコ：貫通 */
        if (o.charge && u.s1.fx === "pierceCharge") { const bh = B.enemies.filter((e2) => !e2.dead && e2 !== t && e2.z > t.z && Math.abs(e2.x - t.x) < 0.22).sort((a, b) => a.z - b.z)[0]; if (bh) dmgEnemy(B, u, bh, atkOf(B, S, u) * m * 0.5, { pierce: 1 }); }
      }
      if (u.dead || B.over) break;
    }
    B.ev.push({ k: "shot", side: S.n, i: u.i, t: hx, hit: anyHit, w: W.sh, ctl, charge: !!o.charge, pel: n });
  }

  /* ══════════ ダメージ ══════════ */
  function critRoll(B, S, u, force) {
    const cr = (u.st.crit || 15) + buffSum(u, "crit");
    if (force || rnd() * 100 < cr) return 1 + ((u.st.critDmg || 50) + buffSum(u, "critDmg")) / 100;
    return 1;
  }
  function addCombo(B, u) {
    if (!u || u.side !== 0) return;
    B.combo.n++; B.combo.t = 1.6; if (B.combo.n > B.combo.best) B.combo.best = B.combo.n;
    if (B.combo.n === 10 || B.combo.n === 30 || B.combo.n === 50 || B.combo.n % 100 === 0) B.ev.push({ k: "combo", n: B.combo.n });
  }
  function dmgEnemy(B, u, e, raw, o) {
    if (!e || e.dead) return 0;
    o = o || {};
    const S = u ? B.side[u.side] : B.side[0];
    let d = raw;
    let cm = 1;
    if (u && !o.dot) {
      const W = u.W;
      if (!o.skill && e.z >= W.opt[0] && e.z <= W.opt[1]) d *= 1.3;
      if (u.s1.fx === "nearDmg" && e.z < 0.45) d *= 1 + u.v1 / 100;
      if (u.s1.fx === "maxRateDmg" && (u.ramp >= 0.999 || buffSum(u, "mgMax") > 0)) d *= 1 + u.v1 / 100;
      if (ST().elemAdv(u.el, e.el)) d *= 1.1 + (u.st.elem || 0) / 100;
      if (B.weak && u.el === B.weak) d *= 1.25;
      cm = critRoll(B, S, u, o.crit);
      d *= cm;
      if (o.core) d *= 2 + ((u.st.core || 0) + buffSum(u, "core")) / 100;
    }
    if (S.fb > 0) d *= FB_MUL;
    if (e.vuln.t > 0) d *= 1 + e.vuln.v / 100;
    const def = e.def * (1 - (e.defDown.t > 0 ? e.defDown.v / 100 : 0));
    d *= DEF_K / (DEF_K + def);
    d = Math.max(1, Math.round(d));
    /* 盾（シールダー）：コア以外は盾が受ける */
    if (e.sh > 0 && !o.core && !o.dot && !o.skill) { e.sh -= d; if (e.sh <= 0) { e.sh = 0; B.ev.push({ k: "shieldBreak", e }); } d = Math.round(d * 0.15); }
    /* ★★ ボスのシールド：コア・部位でよく削れる。体には 1割だけ */
    if (e.isBoss && e.shieldHp > 0 && !o.dot) {
      const sd = d * (o.core ? 2 : o.part ? 1.5 : o.skill ? 1.2 : 0.6);
      e.shieldHp -= sd;
      if (e.shieldHp <= 0) { e.shieldHp = 0; e.stun = 3; e.vuln.v = Math.max(e.vuln.v || 0, 25); e.vuln.t = 6; B.ev.push({ k: "shieldDown", e, broke: 1 }); B.hitstop = Math.max(B.hitstop, 0.3); }
      d = Math.round(d * 0.1);
    }
    /* ボスの部位 */
    if (e.isBoss && o.part) { const p = e.parts.find((x) => x.k === o.part && !x.dead); if (p) { p.hp -= d * 1.2; if (p.hp <= 0) { p.dead = true; e.hp -= Math.round(e.hpMax * 0.04); B.ev.push({ k: "partBreak", e, p }); B.ev.push({ k: "boom", x: e.x + (p.x - 0.5) * e.size * 0.18, z: e.z, y: e.y + 0.25, s: 1.6 }); B.hitstop = Math.max(B.hitstop, 0.18); } } }
    e.hp -= d;
    if (cm > 1 || o.core || o.charge || o.skill || o.part) e.hitT = 0.06;   /* 光るのは会心・コア・チャージ・スキル・部位だけ（連射でずっと白くならないように） */
    if (e.isBoss && e.act && e.act.k === "charge") e.act.dmg += d;
    if (u) { u.dmg += d; B.dmgTotal += d; if (u.side === 0 && S.fb > 0) S.fbDmg += d; }
    if (B.mode === "boss") B.score = B.dmgTotal;
    if (u && !o.dot) addCombo(B, u);
    /* 小さい数字は散弾・持続のときはまとめる */
    if (!o.pellet || rnd() < 0.3) B.ev.push({ k: "dmg", x: e.x, z: e.z, y: e.y + (e.isBoss ? 0.3 : 0.12), v: d, crit: cm > 1, core: !!o.core, ctl: u && B.ctl === u.i && u.side === 0 && B.manual && !B.auto, dot: !!o.dot, skill: !!o.skill, fb: S.fb > 0, ui: u ? u.i : -1, e });
    if (u && !o.noGauge) addGauge(B, S, u, u.W.gauge * (o.skill ? 0 : 1) * (e.gauge || 1));
    /* 当たったときのスキル */
    if (u && !o.dot && !o.skill) onHitSkills(B, S, u, e, o, cm > 1);
    if (e.hp <= 0) killEnemy(B, e, u);
    return d;
  }
  function onHitSkills(B, S, u, e, o, crit) {
    u.cnt.hits++;
    if (u.s1.fx === "healOnHits" && u.cnt.hits % (u.s1.n || 40) === 0) { const v = atkOf(B, S, u) * u.v1 / 100; S.units.forEach((a) => { if (!a.dead) { const h = Math.min(a.hpMax - a.hp, v); a.hp += h; u.healed += h; } }); B.ev.push({ k: "heal", side: S.n, i: -1, v }); }
    if (u.s2.fx === "rippleEvery") { u.cnt.ripple++; if (u.cnt.ripple >= (u.s2.n || 100)) { u.cnt.ripple = 0; const v = atkOf(B, S, u) * u.v2 / 100; B.enemies.filter((x) => !x.dead).forEach((x) => dmgEnemy(B, u, x, v, { skill: 1, aoe: 1 })); B.ev.push({ k: "ripple", side: S.n, i: u.i }); } }
    if (u.s2.fx === "markProc" && !e.dead) { e.mark = (e.mark || 0) + 1; if (e.mark >= (u.s2.n || 10)) { e.mark = 0; dmgEnemy(B, u, e, atkOf(B, S, u) * u.v2 / 100, { skill: 1 }); B.ev.push({ k: "mark", e }); } }
    if (o.charge) {
      if (u.s1.fx === "defDownOnCharge") { e.defDown.v = u.v1; e.defDown.t = u.s1.dur || 5; }
      if (u.s1.fx === "chargeAtkStack") stack(u, "chargeAtk", u.v1, u.s1.max || 5, u.s1.dur || 5);
      if (u.s2.fx === "coreChargeStack" && o.core) stack(u, "coreAtk", u.v2, u.s2.max || 5, u.s2.dur || 10);
      if (u.s1.fx === "chargeBurn") { const ar = [e].concat(B.enemies.filter((x) => !x.dead && x !== e && Math.hypot(x.x - e.x, (x.z - e.z) * 2) < 0.28)); ar.forEach((x) => x.burn.push({ dps: atkOf(B, S, u) * u.v1 / 100, t: u.s1.dur || 5, src: u })); }
    }
    if (crit && u.s2.fx === "critAtkStack") stack(u, "critAtk", u.v2, u.s2.max || 10, u.s2.dur || 3);
  }
  function stack(u, k, v, max, dur) { const s = u.stk[k] || (u.stk[k] = { n: 0, v, t: 0 }); s.v = v; s.n = Math.min(max, s.n + 1); s.t = dur; }
  function killEnemy(B, e, u) {
    if (e.dead) return;
    e.dead = true; e.hp = 0; e.dieT = e.isBoss ? 1.8 : 0.5;
    B.kills++;
    B.streak.n++; B.streak.t = 2.4;
    B.ev.push({ k: "kill", e, boss: !!e.isBoss, x: e.x, z: e.z, y: e.y, kind: e.k, elite: !!e.elite, streak: B.streak.n, by: u ? u.i : -1 });
    B.ev.push({ k: "boom", x: e.x, z: e.z, y: e.y + (e.isBoss ? 0.25 : 0.05), s: e.isBoss ? 3 : e.elite ? 1.8 : 1, kill: 1 });
    if (e.elite) B.hitstop = Math.max(B.hitstop, 0.14);
    /* スプリッター：倒すとミニドローン2体に分かれる */
    if (e.ed && e.ed.split) { for (let i = 0; i < e.ed.split; i++) { const m = mkEnemy(B, { k: "mini", x: e.x + (i ? 0.14 : -0.14), z: Math.max(0.22, e.z) }); B.enemies.push(m); } B.ev.push({ k: "split", e }); }
    if (e.isBoss) { B.bossRef = null; B.hitstop = Math.max(B.hitstop, 0.6); B.enemies.forEach((x) => { if (!x.dead && !x.isBoss) { x.dead = true; x.dieT = 0.5; B.ev.push({ k: "boom", x: x.x, z: x.z, y: x.y, s: 0.8 }); } }); B.proj = []; B.sweep = null; B.breakT = 0; B.marks = []; B.beam = null; B.quake = null; }
  }
  /* アリーナ：ユニット → ユニット */
  function dmgUnitFromUnit(B, u, t, mul, o) {
    if (!t || t.dead) return;
    const S = B.side[u.side];
    let d = atkOf(B, S, u) * mul;
    if (ST().elemAdv(u.el, t.el)) d *= 1.1 + (u.st.elem || 0) / 100;
    const cm = critRoll(B, S, u, o && o.crit); d *= cm;
    if (o && o.core) d *= 1.5;
    if (S.fb > 0) d *= FB_MUL;
    d *= 1 + buffSum(t, "vuln") / 100;
    d *= 0.42;                                 /* アリーナはゆっくり決着するように */
    const r = hitUnit(B, t, d, { src: u, pvp: 1 });
    u.dmg += r || 0; B.dmgTotal += u.side === 0 ? (r || 0) : 0;
    if (u.side === 0 && S.fb > 0) S.fbDmg += r || 0;
    if (u.side === 0) addCombo(B, u);
    if (r > 0 && (cm > 1 || (o && o.skill) || Math.random() < 0.25)) B.ev.push({ k: "dmgU", side: t.side, i: t.i, v: r, crit: cm > 1, skill: !!(o && o.skill), fb: S.fb > 0 });
    if (!(o && o.skill)) addGauge(B, S, u, u.W.gauge * 0.9);
    if (o && o.splash) { B.side[t.side].units.forEach((x) => { if (x !== t && !x.dead && Math.abs(x.i - t.i) === 1) hitUnit(B, x, d * 0.45, { src: u, pvp: 1 }); }); }
    if (o && o.charge && u.s1.fx === "defDownOnCharge") buff(t, "defDown", u.v1, 5);
    if (o && o.charge && u.s1.fx === "chargeAtkStack") stack(u, "chargeAtk", u.v1, u.s1.max || 5, u.s1.dur || 5);
    if (cm > 1 && u.s2.fx === "critAtkStack") stack(u, "critAtk", u.v2, u.s2.max || 10, u.s2.dur || 3);
    if (u.s1.fx === "healOnHits") { u.cnt.hits++; if (u.cnt.hits % (u.s1.n || 40) === 0) S.units.forEach((a) => { if (!a.dead) a.hp = Math.min(a.hpMax, a.hp + atkOf(B, S, u) * u.v1 / 100); }); }
  }
  /* 味方がダメージを受ける：隠れていれば遮蔽物 → シールド → HP */
  function hitUnit(B, u, raw, o) {
    if (!u || u.dead) return 0;
    o = o || {};
    let def = u.st.def * (1 + (u.taunt > 0 && u.s2.fx === "selfDr" ? 0.3 : 0)) * (1 - buffSum(u, "defDown") / 100);
    let d = raw * DEF_K / (DEF_K + def);
    const dr = Math.min(75, (u.st.dr || 0) + buffSum(u, "dr"));
    d *= 1 - dr / 100;
    d = Math.max(1, Math.round(d));
    let toCover = !u.exposed && u.cover.hp > 0 && !o.big;
    if (o.sweep) toCover = !u.exposed && u.cover.hp > 0;
    if (o.laser && u.exposed) toCover = false;
    /* ★★ 範囲（曲射・雨）・レーザー・地ひびき・突進：隠れていれば遮蔽物が軽めに受ける */
    if (toCover && (o.area || o.beam || o.quake || o.dash)) d = Math.round(d * (o.quake ? 0.3 : o.beam ? 0.45 : o.dash ? 0.8 : 0.7));
    if (toCover) {
      u.cover.hp -= d;
      if (u.cover.hp < 0) { const over = -u.cover.hp; u.cover.hp = 0; d = Math.round(over * 0.6); B.ev.push({ k: "coverBreak", side: u.side, i: u.i }); }
      else { B.ev.push({ k: "coverHit", side: u.side, i: u.i, v: d }); if (u.s2.fx === "coverRepairOnHit") repairOnHit(B, u); return 0; }
    }
    if (o.big) d = Math.round(d * 0.55);
    if (u.shield > 0) { const a = Math.min(u.shield, d); u.shield -= a; d -= a; }
    if (d <= 0) return 0;
    u.hp -= d; u.taken += d;
    if (d >= u.hpMax * 0.03 || o.big || o.laser) u.anim.hit = 0.12;   /* 光るのは大きな被弾だけ */
    if (u.s2.fx === "coverRepairOnHit") repairOnHit(B, u);
    B.ev.push({ k: "uhit", side: u.side, i: u.i, v: d, big: d >= u.hpMax * 0.12 });
    if (u.hp <= 0) { u.hp = 0; u.dead = true; u.exposed = false; B.ev.push({ k: "down", side: u.side, i: u.i, id: u.id }); if (B.ctl === u.i && u.side === 0) autoSwitch(B); }
    return d;
  }
  function repairOnHit(B, u) { const now = B.t; if (u.st2.rp && now - u.st2.rp < 1) return; u.st2.rp = now; u.cover.hp = Math.min(u.cover.max, u.cover.hp + u.cover.max * u.v2 / 100); }
  function autoSwitch(B) { const us = B.side[0].units; const n = us.find((x) => !x.dead); if (n) B.ctl = n.i; }

  /* ══════════ 終わりの判定 ══════════ */
  function checkEnd(B) {
    const alive0 = B.side[0].units.some((u) => !u.dead);
    if (!alive0) return finish(B, B.mode === "boss" ? "end" : "lose");
    if (B.mode === "arena") {
      const alive1 = B.side[1].units.some((u) => !u.dead);
      if (!alive1) return finish(B, "win");
      if (B.t >= B.time) {
        const pct = (S) => S.units.reduce((a, u) => a + u.hp / u.hpMax, 0);
        return finish(B, pct(B.side[0]) >= pct(B.side[1]) ? "win" : "lose", { timeout: 1 });
      }
      return;
    }
    if (B.mode === "boss") {
      if (B.waveI >= 0 && B.enemies.every((e) => e.dead) && B.queue.length === 0) return finish(B, "win");
      if (B.t >= B.time) return finish(B, "end");
      return;
    }
    if (B.cleared) return finish(B, "win");
    if (B.t >= B.time) return finish(B, "lose", { timeout: 1 });
  }
  function finish(B, r, o) {
    if (B.over) return;
    B.over = true; B.result = r; B.endInfo = o || {};
    B.ev.push({ k: "end", r });
  }

  /* ══════════ 外からの操作 ══════════ */
  function setCtl(B, i) { const u = B.side[0].units[i]; if (u && !u.dead) { B.ctl = i; B.ev.push({ k: "ctl", i }); } }
  function tapBurst(B, i) { const S = B.side[0]; const u = S.units[i]; return doBurst(B, S, u); }
  function burstReady(B, n) { const S = B.side[n || 0]; return S.stage > 0 ? burstCands(S) : []; }

  MB3.Engine = { create, update, setCtl, tapBurst, burstReady, burstCands, SLOT_X, FOE_Z, FB_TIME, BURST_WINDOW, atkOf, buffSum };
})();
