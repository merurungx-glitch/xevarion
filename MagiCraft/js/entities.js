'use strict';
/* ============================================================
   MagiCraft 3D: エンティティ
   ・スライム (オーバーワールド / コア・EXP ドロップ)
   ・ボス「次元魔神ヴォイドリア」(ヴォイド次元 / 3フェーズAI)
   ・ヴォイドインプ (ボス召喚)
   ・弾 / パーティクル / ドロップ表示
   描画はすべて色付きボックスの組み合わせ
   ============================================================ */

const EN = (() => {
  let list = [];        // 生きているエンティティ
  let particles = [];
  let boss = null;

  const rgba = (hex, a) => {
    const r = parseInt(hex.slice(1,3),16)/255, g = parseInt(hex.slice(3,5),16)/255, b = parseInt(hex.slice(5,7),16)/255;
    return [r, g, b, a == null ? 1 : a];
  };

  function reset(){ list = []; particles = []; boss = null; }
  function clearMobs(){ list = list.filter(e => false); particles = []; boss = null; }

  /* ---------------- スライム ---------------- */
  function spawnSlime(x, y, z, opts){
    const o = opts || {};
    const e = {
      kind: o.imp ? 'imp' : 'slime',
      x, y, z, vx: 0, vy: 0, vz: 0,
      hw: o.imp ? 0.32 : 0.42, h: o.imp ? 0.6 : 0.8,
      hp: o.hp || 30, maxHp: o.hp || 30,
      hopT: 1 + Math.random(), atkCd: 0, flash: 0,
      col: o.imp ? '#8a5cff' : '#5fce4c',
      dmg: o.imp ? 10 : 8, exp: o.imp ? 12 : 10,
      squish: 0,
    };
    list.push(e);
    return e;
  }

  function updateMob(e, world, pl, dt, game){
    e.hopT -= dt;
    e.atkCd -= dt;
    if (e.flash > 0) e.flash -= dt;
    const dx = pl.x - e.x, dz = pl.z - e.z;
    const dist = Math.hypot(dx, dz);

    if (e.hopT <= 0 && e.onGround){
      e.hopT = 1.1 + Math.random() * 0.9;
      if (dist < 26){
        const s = 3.2 / Math.max(dist, 0.001);
        e.vx = dx * s; e.vz = dz * s;
        e.vy = 7;
      } else if (Math.random() < 0.4){
        const a = Math.random() * Math.PI * 2;
        e.vx = Math.cos(a) * 2; e.vz = Math.sin(a) * 2; e.vy = 6.5;
      }
    }
    if (e.onGround){ e.vx *= 0.6; e.vz *= 0.6; e.squish = Math.min(e.squish + dt * 6, 1); }
    else e.squish = Math.max(e.squish - dt * 8, 0);

    e.vy -= 24 * dt;
    moveAABB(world, e, dt);
    if (e.y < -8){ e.hp = 0; }

    // 接触ダメージ
    if (e.atkCd <= 0 && dist < e.hw + 0.75 && Math.abs((pl.y) - e.y) < 1.6){
      game.damagePlayer(e.dmg, e.kind === 'imp' ? 'ヴォイドインプ' : 'スライム');
      e.atkCd = 0.9;
      // ノックバック
      const kb = 5 / Math.max(dist, 0.3);
      pl.vx += dx * kb; pl.vz += dz * kb; pl.vy = Math.max(pl.vy, 4);
    }
  }

  /* ---------------- ボス: 次元魔神ヴォイドリア ---------------- */
  function spawnBoss(cx, cy, cz){
    boss = {
      kind: 'boss', name: '次元魔神ヴォイドリア',
      x: cx, y: cy, z: cz, homeX: cx, homeY: cy, homeZ: cz,
      hp: 1500, maxHp: 1500,
      t: 0, atkT: 2.2, angle: 0, flash: 0, dead: 0,
      shots: [], // 弾
      slamWarn: 0,
    };
    SFX.boss();
    return boss;
  }

  function updateBoss(world, pl, dt, game){
    const b = boss; if (!b) return;
    if (b.dead > 0){
      b.dead += dt;
      if (b.dead > 1.6){ boss = null; game.onBossWin(); }
      return;
    }
    b.t += dt;
    if (b.flash > 0) b.flash -= dt;

    // ホバー移動: 中心を周回しつつプレイヤー方向に寄る
    const phase = b.hp / b.maxHp;
    const speed = phase < 0.3 ? 1.6 : phase < 0.6 ? 1.2 : 0.85;
    b.angle += dt * 0.45 * speed;
    const r = 7 + Math.sin(b.t * 0.5) * 2.5;
    const tx = b.homeX + Math.cos(b.angle) * r;
    const tz = b.homeZ + Math.sin(b.angle) * r;
    const ty = b.homeY + 4.5 + Math.sin(b.t * 1.2) * 1.4;
    b.x += (tx - b.x) * Math.min(1, dt * 1.4);
    b.y += (ty - b.y) * Math.min(1, dt * 1.6);
    b.z += (tz - b.z) * Math.min(1, dt * 1.4);

    const dx = pl.x - b.x, dy = (pl.y + 0.9) - b.y, dz = pl.z - b.z;
    const dist = Math.hypot(dx, dy, dz);

    // 近接スラム警告 → 発動
    if (b.slamWarn > 0){
      b.slamWarn -= dt;
      if (b.slamWarn <= 0){
        if (Math.hypot(pl.x - b.x, pl.z - b.z) < 5.5 && Math.abs(pl.y - b.y) < 6){
          game.damagePlayer(26, 'ヴォイドリアの衝撃波');
          const kb = 9 / Math.max(Math.hypot(dx, dz), 0.5);
          pl.vx += (pl.x - b.x) * kb; pl.vz += (pl.z - b.z) * kb; pl.vy = 7;
        }
        burst(b.x, b.y - 1.5, b.z, '#8a5cff', 20, 8);
        SFX.hit();
      }
    }

    // 攻撃サイクル
    b.atkT -= dt;
    if (b.atkT <= 0){
      b.atkT = phase < 0.3 ? 2.0 : phase < 0.6 ? 2.6 : 3.2;
      if (dist < 5 && b.slamWarn <= 0){
        b.slamWarn = 0.7; // 予告
      } else {
        // 弾: フェーズで数が増える
        const n = phase < 0.3 ? 5 : 3;
        const spd = phase < 0.3 ? 12 : 10;
        for (let i = 0; i < n; i++){
          const spread = (i - (n - 1) / 2) * 0.18;
          const cs = Math.cos(spread), sn = Math.sin(spread);
          const vx = (dx * cs - dz * sn) / dist * spd;
          const vz = (dx * sn + dz * cs) / dist * spd;
          const vy = dy / dist * spd;
          b.shots.push({ x: b.x, y: b.y, z: b.z, vx, vy, vz, life: 6 });
        }
        SFX.shoot();
      }
      // 召喚 (60%未満 / インプ3体まで)
      if (phase < 0.6){
        const imps = list.filter(e => e.kind === 'imp').length;
        if (imps < 3 && Math.random() < 0.5){
          spawnSlime(b.x + (Math.random() * 6 - 3), b.homeY + 2, b.z + (Math.random() * 6 - 3), { imp: true, hp: 40 });
        }
      }
    }

    // 弾の更新
    for (const s of b.shots){
      s.life -= dt;
      s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
      if (world.isSolid(Math.floor(s.x), Math.floor(s.y), Math.floor(s.z))){ s.life = 0; burst(s.x, s.y, s.z, '#c66cff', 5, 4); }
      // プレイヤー命中
      if (s.life > 0 &&
          Math.abs(s.x - pl.x) < 0.55 && Math.abs(s.z - pl.z) < 0.55 &&
          s.y > pl.y - 0.1 && s.y < pl.y + 1.9){
        s.life = 0;
        game.damagePlayer(16, 'ヴォイドの魔弾');
        burst(s.x, s.y, s.z, '#c66cff', 8, 5);
      }
    }
    b.shots = b.shots.filter(s => s.life > 0);
  }

  /* プレイヤーの近接攻撃: 視線上のエンティティに命中判定
     → {kind, e} | null */
  function pickTarget(eye, dir, reach){
    let best = null, bestT = reach;
    const test = (e, hw, h) => {
      // ray vs AABB (スラブ法)
      const min = [e.x - hw, e.y, e.z - hw], max = [e.x + hw, e.y + h, e.z + hw];
      let t0 = 0, t1 = bestT;
      for (let a = 0; a < 3; a++){
        const o = eye[a], d = dir[a];
        if (Math.abs(d) < 1e-8){ if (o < min[a] || o > max[a]) return; continue; }
        let ta = (min[a] - o) / d, tb = (max[a] - o) / d;
        if (ta > tb){ const tmp = ta; ta = tb; tb = tmp; }
        t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
        if (t0 > t1) return;
      }
      if (t0 < bestT){ bestT = t0; best = e; }
    };
    for (const e of list) test(e, e.hw, e.h);
    if (boss && !boss.dead) test(boss, 1.6, 3.2);
    return best;
  }

  function damage(e, amount, isCrit){
    e.hp -= amount;
    e.flash = 0.15;
    if (isCrit) SFX.crit(); else SFX.hit();
    if (e === boss){
      if (e.hp <= 0 && !e.dead){ e.dead = 0.01; burst(e.x, e.y, e.z, '#c66cff', 40, 10); SFX.win(); }
      return;
    }
  }

  /* 死亡回収 + ドロップ */
  function reapMobs(game){
    for (const e of list){
      if (e.hp <= 0){
        burst(e.x, e.y + 0.3, e.z, e.col, 10, 5);
        if (e.kind === 'slime'){
          game.give('core', 1 + (Math.random() < 0.35 ? 1 : 0));
          game.gainExp(e.exp);
        } else if (e.kind === 'imp'){
          game.give('core', 1);
          game.gainExp(e.exp);
        }
      }
    }
    list = list.filter(e => e.hp > 0);
  }

  /* ---------------- パーティクル ---------------- */
  function burst(x, y, z, colHex, n, spd){
    const c = rgba(colHex);
    for (let i = 0; i < n; i++){
      particles.push({
        x, y, z,
        vx: (Math.random() - 0.5) * spd, vy: Math.random() * spd * 0.9, vz: (Math.random() - 0.5) * spd,
        life: 0.5 + Math.random() * 0.3, col: c, s: 0.08 + Math.random() * 0.08,
      });
    }
  }
  function updateParticles(dt){
    for (const p of particles){
      p.life -= dt;
      p.vy -= 18 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    }
    particles = particles.filter(p => p.life > 0);
  }

  /* ---------------- 描画 ---------------- */
  function draw(t){
    R.beginBoxes();
    // モブ
    for (const e of list){
      const sq = 1 - e.squish * 0.25;
      const w = e.hw * 2 * (1 + e.squish * 0.2);
      const col = e.flash > 0 ? [1, 1, 1, 1] : rgba(e.col, 0.92);
      R.drawBox(e.x, e.y + e.h * sq / 2, e.z, 0, w, e.h * sq, w, col, e.kind === 'imp' ? 0.4 : 0);
      // 目
      const ang = Math.atan2(GAME.player.x - e.x, -(GAME.player.z - e.z));
      const exo = Math.sin(ang) * e.hw * 0.7, ezo = -Math.cos(ang) * e.hw * 0.7;
      R.drawBox(e.x + exo - Math.cos(ang) * 0.12, e.y + e.h * sq * 0.62, e.z + ezo - Math.sin(ang) * 0.12, 0, 0.09, 0.12, 0.09, [0.05,0.05,0.1,1], 0);
      R.drawBox(e.x + exo + Math.cos(ang) * 0.12, e.y + e.h * sq * 0.62, e.z + ezo + Math.sin(ang) * 0.12, 0, 0.09, 0.12, 0.09, [0.05,0.05,0.1,1], 0);
    }
    // ボス
    if (boss){
      const b = boss;
      const deadS = b.dead > 0 ? Math.max(0, 1 - b.dead / 1.4) : 1;
      const flash = b.flash > 0 || b.slamWarn > 0;
      const body = flash ? [1, 1, 1, 1] : rgba('#2a1050', 0.98);
      // 本体
      R.drawBox(b.x, b.y, b.z, b.t * 0.7, 2.6 * deadS, 2.6 * deadS, 2.6 * deadS, body, 0.25);
      // 内核
      R.drawBox(b.x, b.y, b.z, -b.t * 1.1, 1.4 * deadS, 1.4 * deadS, 1.4 * deadS, rgba('#c66cff', 0.95), 0.9);
      // 軌道シャード x4
      for (let i = 0; i < 4; i++){
        const a = b.t * 1.6 + i * Math.PI / 2;
        const sx = b.x + Math.cos(a) * 2.6, sz = b.z + Math.sin(a) * 2.6;
        const sy2 = b.y + Math.sin(b.t * 2 + i) * 0.8;
        R.drawBox(sx, sy2, sz, a, 0.5 * deadS, 0.9 * deadS, 0.5 * deadS, rgba('#8a5cff', 0.95), 0.7);
      }
      // 目 (プレイヤー方向)
      const ang = Math.atan2(GAME.player.x - b.x, -(GAME.player.z - b.z));
      R.drawBox(b.x + Math.sin(ang) * 1.32, b.y + 0.4, b.z - Math.cos(ang) * 1.32, ang, 0.7, 0.28, 0.15, [1, 0.2, 0.35, 1], 1);
      // 弾
      for (const s of b.shots)
        R.drawBox(s.x, s.y, s.z, s.life * 6, 0.42, 0.42, 0.42, rgba('#c66cff', 0.9), 1);
    }
    // パーティクル
    for (const p of particles)
      R.drawBox(p.x, p.y, p.z, p.life * 7, p.s, p.s, p.s, [p.col[0], p.col[1], p.col[2], Math.min(1, p.life * 2.5)], 0.3);
    R.endBoxes();
  }

  function update(world, pl, dt, game){
    for (const e of list) updateMob(e, world, pl, dt, game);
    reapMobs(game);
    updateBoss(world, pl, dt, game);
    updateParticles(dt);
  }

  return {
    reset, clearMobs, spawnSlime, spawnBoss, update, draw, burst,
    pickTarget, damage,
    get boss(){ return boss; },
    get mobs(){ return list; },
  };
})();
