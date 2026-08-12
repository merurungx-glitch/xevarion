'use strict';
/* ============================================================
   MagiCraft 3D: プレイヤー物理 + レイキャスト
   ・AABB 軸分離衝突 (汎用 moveAABB はエンティティも使用)
   ・DDA レイキャストでブロック採掘 / 設置
   ============================================================ */

/* 汎用: AABB(中心x,z / 足元y, 半幅hw, 高さh) を vel*dt 移動し衝突解決
   ent: {x,y,z,vx,vy,vz,hw,h,onGround} */
function moveAABB(world, ent, dt){
  ent.onGround = false;
  ent.hitWall = false;
  const solid = (x, y, z) => world.isSolid(Math.floor(x), Math.floor(y), Math.floor(z));

  const collides = () => {
    const x0 = Math.floor(ent.x - ent.hw), x1 = Math.floor(ent.x + ent.hw);
    const y0 = Math.floor(ent.y), y1 = Math.floor(ent.y + ent.h - 0.001);
    const z0 = Math.floor(ent.z - ent.hw), z1 = Math.floor(ent.z + ent.hw);
    for (let x = x0; x <= x1; x++)
      for (let y = y0; y <= y1; y++)
        for (let z = z0; z <= z1; z++)
          if (world.isSolid(x, y, z)) return true;
    return false;
  };

  // X
  ent.x += ent.vx * dt;
  if (collides()){
    if (ent.vx > 0) ent.x = Math.floor(ent.x + ent.hw) - ent.hw - 0.001;
    else ent.x = Math.floor(ent.x - ent.hw) + 1 + ent.hw + 0.001;
    ent.vx = 0;
    ent.hitWall = true;
  }
  // Z
  ent.z += ent.vz * dt;
  if (collides()){
    if (ent.vz > 0) ent.z = Math.floor(ent.z + ent.hw) - ent.hw - 0.001;
    else ent.z = Math.floor(ent.z - ent.hw) + 1 + ent.hw + 0.001;
    ent.vz = 0;
    ent.hitWall = true;
  }
  // Y
  ent.y += ent.vy * dt;
  if (collides()){
    if (ent.vy > 0){ ent.y = Math.floor(ent.y + ent.h) - ent.h - 0.001; }
    else { ent.y = Math.floor(ent.y) + 1 + 0.0001; ent.onGround = true; }
    ent.vy = 0;
  }
  // 汎用: 水中判定
  ent.inWater = BLOCKS[world.get(Math.floor(ent.x), Math.floor(ent.y + 0.4), Math.floor(ent.z))].water || false;
}

/* DDA レイキャスト (Amanatides & Woo)
   → {x,y,z, nx,ny,nz, id, dist} | null */
function raycastBlock(world, ox, oy, oz, dx, dy, dz, maxDist){
  let x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
  const stepX = dx > 0 ? 1 : -1, stepY = dy > 0 ? 1 : -1, stepZ = dz > 0 ? 1 : -1;
  const tDX = dx !== 0 ? Math.abs(1 / dx) : Infinity;
  const tDY = dy !== 0 ? Math.abs(1 / dy) : Infinity;
  const tDZ = dz !== 0 ? Math.abs(1 / dz) : Infinity;
  let tMX = dx !== 0 ? (dx > 0 ? (x + 1 - ox) : (ox - x)) * tDX : Infinity;
  let tMY = dy !== 0 ? (dy > 0 ? (y + 1 - oy) : (oy - y)) * tDY : Infinity;
  let tMZ = dz !== 0 ? (dz > 0 ? (z + 1 - oz) : (oz - z)) * tDZ : Infinity;
  let nx = 0, ny = 0, nz = 0, t = 0;

  for (let i = 0; i < 120; i++){
    const id = world.get(x, y, z);
    if (id !== B.AIR && !BLOCKS[id].water){
      return { x, y, z, nx, ny, nz, id, dist: t };
    }
    if (tMX < tMY && tMX < tMZ){ x += stepX; t = tMX; tMX += tDX; nx = -stepX; ny = 0; nz = 0; }
    else if (tMY < tMZ){ y += stepY; t = tMY; tMY += tDY; nx = 0; ny = -stepY; nz = 0; }
    else { z += stepZ; t = tMZ; tMZ += tDZ; nx = 0; ny = 0; nz = -stepZ; }
    if (t > maxDist) return null;
  }
  return null;
}

class Player {
  constructor(){
    this.hw = 0.3; this.h = 1.8; this.eyeH = 1.62;
    this.x = 0; this.y = 0; this.z = 0;
    this.vx = 0; this.vy = 0; this.vz = 0;
    this.yaw = 0; this.pitch = -0.15;
    this.onGround = false; this.inWater = false;
    this.hp = 100; this.maxHp = 100;
    this.fallStart = 0;
    this.hurtCd = 0;
  }
  spawnAt(p){
    this.x = p[0]; this.y = p[1]; this.z = p[2];
    this.vx = this.vy = this.vz = 0;
    this.fallStart = this.y;
  }
  eye(){ return [this.x, this.y + this.eyeH, this.z]; }
  look(){ return MTH.forwardOf(this.yaw, this.pitch); }

  update(world, input, dt, game){
    const SPEED = 4.4, JUMP = 8.4, GRAV = 24;
    // 移動 (入力はローカル: forward, strafe)
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    let mx = input.strafe * cy + input.forward * sy;
    let mz = input.strafe * sy - input.forward * cy;
    const len = Math.hypot(mx, mz);
    if (len > 1){ mx /= len; mz /= len; }
    const sp = this.inWater ? SPEED * 0.6 : SPEED;
    this.vx = mx * sp; this.vz = mz * sp;

    if (this.inWater){
      this.vy += -9 * dt;
      if (input.jump) this.vy = Math.min(this.vy + 34 * dt, 4.2);
      this.vy = Math.max(this.vy, -3.5);
      this.fallStart = this.y;
      // 岸に向かって泳ぎながらジャンプ → 壁を蹴って水から上がる
      if (input.jump && this.hitWall) this.vy = 8.8;
    } else {
      this.vy -= GRAV * dt;
      if (input.jump && this.onGround) { this.vy = JUMP; SFX.jump(); }
      this.vy = Math.max(this.vy, -42);
    }

    const wasGround = this.onGround;
    moveAABB(world, this, dt);

    // 落下ダメージ
    if (!this.onGround && this.vy >= 0 && !this.inWater) this.fallStart = Math.max(this.fallStart, this.y);
    if (this.onGround && !wasGround){
      const fall = this.fallStart - this.y;
      if (fall > 3.5 && !this.inWater){
        game.damagePlayer(Math.round((fall - 3.2) * 5), '落下');
      }
      this.fallStart = this.y;
    }
    if (this.onGround || this.inWater) this.fallStart = this.y;

    // 奈落 (ヴォイド次元で島から落ちた)
    if (this.y < -8) game.damagePlayer(9999, '奈落');

    if (this.hurtCd > 0) this.hurtCd -= dt;
  }
}
