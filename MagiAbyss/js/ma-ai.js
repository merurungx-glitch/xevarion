/* ============================================================
   MagiAbyss — ma-ai.js
   敵の行動（状態をもつ）
   ・状態：move（近づく・距離をとる）→ wind（攻撃準備：床に予告）→ act（攻撃）→ recover（硬直）
   ・型：chase 追跡／charge 突進／ranged 遠距離／summon 召喚／guard 防御／hex 妨害／elite エリート／swarm 群体
   ・攻撃の範囲は必ず床に予告を出してから当てる（避けられるように）。
   ============================================================ */
(function () {
  "use strict";
  const MA = (window.MA = window.MA || {});
  const TAU = Math.PI * 2;
  const E = () => MA.E;
  const G = () => MA.G;

  function toward(e, tx, ty, sp, dt) {
    const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy) || 1;
    /* ★ プレイヤーへ向かうとき、見通しが無ければ通路をたどる（フローフィールド） */
    const p = G().P;
    if (tx === p.x && ty === p.y && !E().canSee(e)) {
      const pd = E().pathDir(e);
      if (pd) { E().moveEnemy(e, pd[0] * sp * dt, pd[1] * sp * dt); if (Math.abs(pd[0]) > 0.2) e.face = pd[0] > 0 ? 1 : -1; return d; }
    }
    E().moveEnemy(e, dx / d * sp * dt, dy / d * sp * dt);
    if (Math.abs(dx) > 1) e.face = dx > 0 ? 1 : -1;
    return d;
  }
  function setSt(e, st) { e.st = st; e.stT = 0; }
  const P = () => G().P;

  /* 弾を撃つ（n 発・扇・輪） */
  function fire(e, spec) {
    const p = P();
    const a0 = Math.atan2(p.y - e.y, p.x - e.x);
    const n = spec.n || 1;
    for (let i = 0; i < n; i++) {
      let a = a0;
      if (spec.ring) a = a0 + i / n * TAU;
      else if (n > 1) a = a0 + (i - (n - 1) / 2) * (spec.spread || 0.25);
      E().ebullet({ x: e.x, y: e.y, vx: Math.cos(a) * spec.speed, vy: Math.sin(a) * spec.speed, dmg: e.atk * (spec.big ? 1.3 : 0.9), r: spec.big ? 5 : 3, col: e.d.col, kind: spec.big ? "orb" : "shard", src: e });
    }
  }

  const AI = {
    /* 追跡：まっすぐ近づいて体当たり（少しゆらぐ） */
    none() {},
    chase(e, dt, k) {
      const p = P();
      if (!E().canSee(e)) { const pd = E().pathDir(e); if (pd) { E().moveEnemy(e, pd[0] * e.spd * k * dt, pd[1] * e.spd * k * dt); e.face = pd[0] > 0 ? 1 : -1; return; } }
      const wob = Math.sin(e.animT * 3 + e.id) * 0.25;
      const a = Math.atan2(p.y - e.y, p.x - e.x) + wob;
      E().moveEnemy(e, Math.cos(a) * e.spd * k * dt, Math.sin(a) * e.spd * k * dt);
      e.face = Math.cos(a) > 0 ? 1 : -1;
    },
    swarm(e, dt, k) {
      const p = P();
      if (!E().canSee(e)) { const pd = E().pathDir(e); if (pd) { E().moveEnemy(e, pd[0] * e.spd * k * dt, pd[1] * e.spd * k * dt); e.face = pd[0] > 0 ? 1 : -1; return; } }
      const a = Math.atan2(p.y - e.y, p.x - e.x) + Math.sin(e.animT * 7 + e.id * 1.7) * 0.7;
      E().moveEnemy(e, Math.cos(a) * e.spd * k * dt, Math.sin(a) * e.spd * k * dt);
      e.face = Math.cos(a) > 0 ? 1 : -1;
    },
    /* 突進：近づく → 線で予告（0.7秒）→ まっすぐ走る → 硬直 */
    charge(e, dt, k) {
      const p = P();
      e.stT += dt;
      if (e.st === "move") {
        const d = toward(e, p.x, p.y, e.spd * k, dt);
        e.cd -= dt;
        if (d < 110 && e.cd <= 0 && MA.Map.los(G().map, e.x, e.y, p.x, p.y)) {
          setSt(e, "wind");
          e.ang = Math.atan2(p.y - e.y, p.x - e.x);
          e.tg = E().telegraph({ shape: "line", x: e.x, y: e.y, ang: e.ang, len: 120, w: e.r * 2 + 4, dur: 0.7, owner: e, follow: true, onFire: () => {} });
        }
      } else if (e.st === "wind") {
        if (e.stT >= 0.7) { setSt(e, "dash"); }
      } else if (e.st === "dash") {
        E().moveEnemy(e, Math.cos(e.ang) * e.spd * 3.2 * dt, Math.sin(e.ang) * e.spd * 3.2 * dt);
        if (e.stT >= 0.42) { setSt(e, "recover"); }
      } else if (e.st === "recover") {
        if (e.stT >= 0.8) { setSt(e, "move"); e.cd = 2 + G().rnd() * 1.5; }
      }
    },
    /* 遠距離：距離をとる → 光って予告（0.5秒）→ 撃つ → 硬直 */
    ranged(e, dt, k) {
      const p = P();
      e.stT += dt;
      const d = Math.hypot(p.x - e.x, p.y - e.y);
      if (e.st === "move") {
        const want = 120;
        if (d > want + 30) toward(e, p.x, p.y, e.spd * k, dt);
        else if (d < want - 30) { const a = Math.atan2(e.y - p.y, e.x - p.x); E().moveEnemy(e, Math.cos(a) * e.spd * k * dt, Math.sin(a) * e.spd * k * dt); }
        else { const a = Math.atan2(e.y - p.y, e.x - p.x) + Math.PI / 2; E().moveEnemy(e, Math.cos(a) * e.spd * 0.5 * k * dt, Math.sin(a) * e.spd * 0.5 * k * dt); }
        e.face = p.x > e.x ? 1 : -1;
        e.cd -= dt;
        if (e.cd <= 0 && d < 220 && MA.Map.los(G().map, e.x, e.y, p.x, p.y)) {
          setSt(e, "wind");
          E().fx({ type: "charge", x: e.x, y: e.y, t: 0, dur: 0.5, col: e.d.col, r: e.r + 6, owner: e });
          if (!e.d.shot || e.d.shot.n === 1) e.tg = E().telegraph({ shape: "line", x: e.x, y: e.y, ang: Math.atan2(p.y - e.y, p.x - e.x), len: 200, w: 3, dur: 0.5, owner: e, follow: true, col: "#ff8090", onFire: () => {} });
        }
      } else if (e.st === "wind") {
        if (e.stT >= 0.5) { fire(e, e.d.shot || { speed: 120, n: 1 }); setSt(e, "recover"); }
      } else if (e.st === "recover") {
        if (e.stT >= 0.6) { setSt(e, "move"); e.cd = (e.d.shot ? e.d.shot.cd : 2.5) * (0.8 + G().rnd() * 0.4) / ((G().muts.warp && G().muts.warp.speed) || 1); }
      }
    },
    /* 召喚：距離をとって、光の輪で予告 → 手下を呼ぶ */
    summon(e, dt, k) {
      const p = P();
      e.stT += dt;
      const d = Math.hypot(p.x - e.x, p.y - e.y);
      if (e.st === "move") {
        if (d < 90) { const a = Math.atan2(e.y - p.y, e.x - p.x); E().moveEnemy(e, Math.cos(a) * e.spd * k * dt, Math.sin(a) * e.spd * k * dt); }
        else if (d > 150) toward(e, p.x, p.y, e.spd * k * 0.7, dt);
        e.cd -= dt;
        const kids = G().E.filter((x) => !x.dead && x.parent === e.id).length;
        if (e.cd <= 0 && kids < 6) { setSt(e, "wind"); E().fx({ type: "summon", x: e.x, y: e.y, t: 0, dur: 0.6, col: e.d.col, r: 18 }); }
      } else if (e.st === "wind") {
        if (e.stT >= 0.6) {
          for (let i = 0; i < 3; i++) { const a = G().rnd() * TAU; const m = E().spawnEnemy(e.d.summon || "slime", e.x + Math.cos(a) * 14, e.y + Math.sin(a) * 14, { summoned: true }); if (m) m.parent = e.id; }
          setSt(e, "recover");
        }
      } else if (e.st === "recover") { if (e.stT >= 0.8) { setSt(e, "move"); e.cd = 4.5; } }
    },
    /* 防御：ゆっくり近づく。ときどき守り（被ダメージ減・盾の印）。根・地響きは床に予告 */
    guard(e, dt, k) {
      const p = P();
      e.stT += dt;
      const d = Math.hypot(p.x - e.x, p.y - e.y);
      if (e.st === "move") {
        toward(e, p.x, p.y, e.spd * k, dt);
        e.guardOn = (Math.floor((e.animT + e.id) / 2.5) % 2) === 0;
        e.cd -= dt;
        if (e.cd <= 0 && d < 140) {
          setSt(e, "wind"); e.guardOn = true;
          if (e.d.root) { e.tg = E().telegraph({ shape: "circle", x: p.x, y: p.y, r: 16, dur: 0.95, dmg: e.atk * 1.2, owner: e, keep: true, col: "#a0e060", onFire: (o) => { if (E().inShape(o, P().x, P().y, P().r)) E().hurtPlayer(o.dmg, e); E().fx({ type: "spikes", x: o.x, y: o.y, t: 0, dur: 0.5, col: "#6a8a3a" }); } }); }
          else if (e.d.slam) { e.tg = E().telegraph({ shape: "circle", x: e.x, y: e.y, r: 42, dur: 0.9, dmg: e.atk * 1.4, owner: e, follow: true }); }
          else if (e.d.laser) { const a = Math.atan2(p.y - e.y, p.x - e.x); e.tg = E().telegraph({ shape: "line", x: e.x, y: e.y, ang: a, len: 220, w: 10, dur: 0.9, dmg: e.atk * 1.3, owner: e, col: "#c8b0ff" }); }
          else if (e.d.lunge) { e.ang = Math.atan2(p.y - e.y, p.x - e.x); e.tg = E().telegraph({ shape: "cone", x: e.x, y: e.y, ang: e.ang, r: 46, arc: 1.4, dur: 0.75, dmg: e.atk * 1.4, owner: e, follow: true }); }
          else { e.tg = E().telegraph({ shape: "circle", x: e.x, y: e.y, r: 30, dur: 0.85, dmg: e.atk * 1.2, owner: e, follow: true }); }
        }
      } else if (e.st === "wind") {
        if (e.stT >= 1.0) { setSt(e, "recover"); e.guardOn = false; }
      } else if (e.st === "recover") { if (e.stT >= 0.9) { setSt(e, "move"); e.cd = 3 + G().rnd() * 2; } }
    },
    /* 妨害：テレポート・遅くなる沼／暗闇の範囲・扇の弾 */
    hex(e, dt, k) {
      const p = P();
      e.stT += dt;
      const d = Math.hypot(p.x - e.x, p.y - e.y);
      if (e.st === "move") {
        if (d > 160) toward(e, p.x, p.y, e.spd * k, dt);
        else if (d < 90) { const a = Math.atan2(e.y - p.y, e.x - p.x); E().moveEnemy(e, Math.cos(a) * e.spd * k * dt, Math.sin(a) * e.spd * k * dt); }
        e.face = p.x > e.x ? 1 : -1;
        e.cd -= dt;
        if (e.cd <= 0 && d < 230) {
          setSt(e, "wind");
          const r = G().rnd();
          if (e.d.blink && r < 0.35) e.next = "blink";
          else if (e.d.beam && r < 0.5) { e.next = "beam"; e.ang = Math.atan2(p.y - e.y, p.x - e.x); e.tg = E().telegraph({ shape: "line", x: e.x, y: e.y, ang: e.ang, len: 240, w: 8, dur: 0.85, dmg: e.atk * 1.3, owner: e, col: "#c070ff" }); }
          else if (r < 0.75) { e.next = "zone"; e.tg = E().telegraph({ shape: "circle", x: p.x, y: p.y, r: 30, dur: 0.9, col: "#9a5aff", keep: true, onFire: (o) => { E().zone({ x: o.x, y: o.y, r: 30, dur: 4, side: "enemy", dmg: e.atk * 0.25, tick: 0.5, dark: !!e.d.dark, slowP: 1, col: "#6a3aa0" }); } }); }
          else e.next = "shoot";
          E().fx({ type: "charge", x: e.x, y: e.y, t: 0, dur: 0.6, col: e.d.col, r: e.r + 6, owner: e });
        }
      } else if (e.st === "wind") {
        if (e.stT >= 0.6) {
          if (e.next === "blink") {
            const a = G().rnd() * TAU, r = 70 + G().rnd() * 40;
            const nx = p.x + Math.cos(a) * r, ny = p.y + Math.sin(a) * r;
            if (!MA.Map.solidAt(G().map, nx, ny)) { E().fx({ type: "poof", x: e.x, y: e.y, t: 0, dur: 0.3, col: e.d.col, r: e.r }); e.x = nx; e.y = ny; E().fx({ type: "poof", x: e.x, y: e.y, t: 0, dur: 0.3, col: e.d.col, r: e.r }); }
            /* まぼろし（分身）を1体 */
            if (G().E.filter((x) => !x.dead && x.decoyOf === e.id).length < 2) { const dcy = E().spawnEnemy(e.k, e.x + 20, e.y, { summoned: true, hpMul: 0.15 }); if (dcy) { dcy.decoyOf = e.id; dcy.decoy = true; dcy.ai = "chase"; } }
          } else if (e.next === "shoot") fire(e, e.d.shot || { speed: 120, n: 3, spread: 0.4 });
          setSt(e, "recover");
        }
      } else if (e.st === "recover") { if (e.stT >= 0.8) { setSt(e, "move"); e.cd = 3 + G().rnd() * 1.5; } }
    },
    /* エリート：大きく強い。突進・地響き・弾の輪を順番に */
    elite(e, dt, k) {
      const p = P();
      e.stT += dt;
      const d = Math.hypot(p.x - e.x, p.y - e.y);
      if (e.st === "move") {
        toward(e, p.x, p.y, e.spd * k, dt);
        e.cd -= dt;
        if (e.cd <= 0 && d < 170) {
          setSt(e, "wind");
          e.pat = (e.pat || 0) % 3;
          if (e.pat === 0) { e.ang = Math.atan2(p.y - e.y, p.x - e.x); e.tg = E().telegraph({ shape: "line", x: e.x, y: e.y, ang: e.ang, len: 170, w: e.r * 2 + 8, dur: 0.85, owner: e, follow: true, onFire: () => {} }); }
          else if (e.pat === 1) e.tg = E().telegraph({ shape: "circle", x: e.x, y: e.y, r: 56, dur: 1.0, dmg: e.atk * 1.5, owner: e, follow: true });
          else E().fx({ type: "charge", x: e.x, y: e.y, t: 0, dur: 0.8, col: e.d.col, r: e.r + 10, owner: e });
          e.pat++;
        }
      } else if (e.st === "wind") {
        if (e.stT >= (e.pat === 1 ? 0.85 : 1.0)) {
          if (e.pat === 1) setSt(e, "dash");
          else if (e.pat === 3) { for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + e.animT; E().ebullet({ x: e.x, y: e.y, vx: Math.cos(a) * 95, vy: Math.sin(a) * 95, dmg: e.atk * 0.8, r: 4, col: e.d.col, kind: "orb", src: e }); } setSt(e, "recover"); }
          else setSt(e, "recover");
        }
      } else if (e.st === "dash") {
        E().moveEnemy(e, Math.cos(e.ang) * e.spd * 3.6 * dt, Math.sin(e.ang) * e.spd * 3.6 * dt);
        if (e.stT >= 0.45) setSt(e, "recover");
      } else if (e.st === "recover") { if (e.stT >= 1.0) { setSt(e, "move"); e.cd = 1.6; } }
    },
  };
  function step(e, dt, k) {
    const f = AI[e.ai] || AI.chase;
    f(e, dt, k);
  }
  MA.AI = { step, AI, fire };
})();
