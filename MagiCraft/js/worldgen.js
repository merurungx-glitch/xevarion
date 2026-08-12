'use strict';
/* ============================================================
   MagiCraft 3D: ボクセルワールド + 地形生成
   ・オーバーワールド: 128x64x128 (16x16 柱チャンク x 8x8)
   ・ヴォイド次元: 浮遊島のボスアリーナ
   ============================================================ */

const CHUNK = 16;
const LIGHT_DIRS = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];

class VoxelWorld {
  constructor(wx, wy, wz){
    this.wx = wx; this.wy = wy; this.wz = wz;
    this.cx = Math.ceil(wx / CHUNK); this.cz = Math.ceil(wz / CHUNK);
    this.data = new Uint8Array(wx * wy * wz);
    this.blockLight = new Uint8Array(wx * wy * wz); // 松明などの光源 0..15
    this.torches = new Set();                        // 松明ブロックの idx
    this.edits = new Map();                          // プレイヤーが変更した idx→id (セーブ用)
    this.heightMap = new Int16Array(wx * wz); // 最上段の不透明ブロック y
    this.chunks = [];   // {cx,cz, opaque:{vao,count}, water:{...}, dirty}
    for (let cz = 0; cz < this.cz; cz++)
      for (let cx = 0; cx < this.cx; cx++)
        this.chunks.push({ cx, cz, opaque:null, water:null, dirty:true });
  }
  idx(x, y, z){ return (x * this.wz + z) * this.wy + y; }
  inside(x, y, z){ return x >= 0 && x < this.wx && y >= 0 && y < this.wy && z >= 0 && z < this.wz; }
  get(x, y, z){
    if (y >= this.wy) return B.AIR;
    if (y < 0) return B.BEDROCK;
    if (x < 0 || x >= this.wx || z < 0 || z >= this.wz) return this.borderBlock;
    return this.data[this.idx(x, y, z)];
  }
  set(x, y, z, id){
    if (!this.inside(x, y, z)) return;
    const i = this.idx(x, y, z);
    const old = this.data[i];
    if (old === id) return;
    // 古い松明の光を除去
    if (old === B.TORCH){ this.torches.delete(i); this.removeLight(x, y, z); }
    this.data[i] = id;
    this.edits.set(i, id);
    this.touchHeight(x, z);
    this.markDirty(x, z);
    // 新しい松明の光を追加
    if (id === B.TORCH){ this.torches.add(i); this.addLight(x, y, z, BLOCK_LIGHT[B.TORCH]); }
    // 不透明ブロックを光の中に置いたら、その光を再計算(影を作る)
    else if (BLOCKS[id].opaque && this.blockLight[i] > 0){ this.removeLight(x, y, z); }
  }

  /* セーブから編集を再適用 (idx→id) */
  replayEdits(entries){
    for (const [i, id] of entries){
      const y = i % this.wy, t = (i - y) / this.wy;
      const z = t % this.wz, x = (t - z) / this.wz;
      this.set(x, y, z, id);
    }
  }

  /* ---- ブロックライト (松明) ---- */
  getLight(x, y, z){
    if (!this.inside(x, y, z)) return 0;
    return this.blockLight[this.idx(x, y, z)];
  }
  markDirtyRegion(x, z, rc){
    const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
    for (let a = cx - rc; a <= cx + rc; a++)
      for (let b = cz - rc; b <= cz + rc; b++)
        if (a >= 0 && a < this.cx && b >= 0 && b < this.cz)
          this.chunks[b * this.cx + a].dirty = true;
  }
  // 光の追加 (BFS 波及)
  addLight(x, y, z, level){
    const i0 = this.idx(x, y, z);
    if (this.blockLight[i0] >= level) return;
    this.blockLight[i0] = level;
    const q = [[x, y, z, level]];
    while (q.length){
      const [cx, cy, cz, cl] = q.shift();
      if (cl <= 1) continue;
      const nl = cl - 1;
      for (const [dx, dy, dz] of LIGHT_DIRS){
        const nx = cx + dx, ny = cy + dy, nz = cz + dz;
        if (!this.inside(nx, ny, nz)) continue;
        const ni = this.idx(nx, ny, nz);
        if (BLOCKS[this.data[ni]].opaque) continue;
        if (this.blockLight[ni] < nl){ this.blockLight[ni] = nl; q.push([nx, ny, nz, nl]); }
      }
    }
    this.markDirtyRegion(x, z, Math.ceil(level / CHUNK) + 1);
  }
  // 光の除去 (voxel-craft式: 除去 → 周縁から再点灯)
  removeLight(x, y, z){
    const i0 = this.idx(x, y, z);
    const start = this.blockLight[i0];
    if (start === 0) return;
    this.blockLight[i0] = 0;
    const q = [[x, y, z, start]], relight = [];
    while (q.length){
      const [cx, cy, cz, cl] = q.shift();
      for (const [dx, dy, dz] of LIGHT_DIRS){
        const nx = cx + dx, ny = cy + dy, nz = cz + dz;
        if (!this.inside(nx, ny, nz)) continue;
        const ni = this.idx(nx, ny, nz);
        const nb = this.blockLight[ni];
        if (nb !== 0 && nb < cl){ this.blockLight[ni] = 0; q.push([nx, ny, nz, nb]); }
        else if (nb >= cl){ relight.push([nx, ny, nz, nb]); }
      }
    }
    for (const [rx, ry, rz, rl] of relight) this.addLight(rx, ry, rz, rl);
    this.markDirtyRegion(x, z, Math.ceil(start / CHUNK) + 1);
  }
  touchHeight(x, z){
    let y = this.wy - 1;
    while (y > 0 && !BLOCKS[this.data[this.idx(x, y, z)]].opaque) y--;
    this.heightMap[x * this.wz + z] = y;
  }
  buildHeightMap(){
    for (let x = 0; x < this.wx; x++) for (let z = 0; z < this.wz; z++) this.touchHeight(x, z);
  }
  skyLit(x, y, z){
    if (x < 0 || x >= this.wx || z < 0 || z >= this.wz) return true;
    return y >= this.heightMap[x * this.wz + z];
  }
  isSolid(x, y, z){ return !!BLOCKS[this.get(x, y, z)].solid; }
  isOpaque(x, y, z){ return !!BLOCKS[this.get(x, y, z)].opaque; }
  markDirty(x, z){
    const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
    const mark = (a, b) => {
      if (a < 0 || a >= this.cx || b < 0 || b >= this.cz) return;
      this.chunks[b * this.cx + a].dirty = true;
    };
    mark(cx, cz);
    if (x % CHUNK === 0) mark(cx - 1, cz);
    if (x % CHUNK === CHUNK - 1) mark(cx + 1, cz);
    if (z % CHUNK === 0) mark(cx, cz - 1);
    if (z % CHUNK === CHUNK - 1) mark(cx, cz + 1);
  }
}
VoxelWorld.prototype.borderBlock = B.BEDROCK;

/* ---------------- ノイズ ---------------- */
function makeNoise(seed){
  const hash = (x, y, z) => {
    let h = seed ^ (x * 374761393) ^ (y * 668265263) ^ (z * 2147483647);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const lerp = (a, b, t) => a + (b - a) * (t * t * (3 - 2 * t));
  function n2(x, z){
    const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
    return lerp(
      lerp(hash(xi, 0, zi), hash(xi + 1, 0, zi), xf),
      lerp(hash(xi, 0, zi + 1), hash(xi + 1, 0, zi + 1), xf), zf);
  }
  function n3(x, y, z){
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = x - xi, yf = y - yi, zf = z - zi;
    const c = (dy) => lerp(
      lerp(hash(xi, yi + dy, zi), hash(xi + 1, yi + dy, zi), xf),
      lerp(hash(xi, yi + dy, zi + 1), hash(xi + 1, yi + dy, zi + 1), xf), zf);
    return lerp(c(0), c(1), yf);
  }
  return { n2, n3, hash };
}

/* ---------------- オーバーワールド生成 ---------------- */
const OW = { W:128, H:64, D:128, SEA:26 };

function genOverworld(seed){
  const w = new VoxelWorld(OW.W, OW.H, OW.D);
  const N = makeNoise(seed);
  const rand = (() => { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();

  // 高さマップ: 2 オクターブのバリューノイズ
  const hAt = (x, z) =>
    Math.floor(20 + N.n2(x / 34, z / 34) * 22 + N.n2(x / 11, z / 11) * 7);

  for (let x = 0; x < OW.W; x++){
    for (let z = 0; z < OW.D; z++){
      const h = Math.min(OW.H - 8, hAt(x, z));
      for (let y = 0; y <= h; y++){
        let id;
        if (y === 0) id = B.BEDROCK;
        else if (y === h) id = (h <= OW.SEA + 1) ? B.SAND : B.GRASS;
        else if (y >= h - 3) id = (h <= OW.SEA + 1) ? B.SAND : B.DIRT;
        else id = B.STONE;
        w.data[w.idx(x, y, z)] = id;
      }
      // 水面
      if (h < OW.SEA){
        for (let y = h + 1; y <= OW.SEA; y++) w.data[w.idx(x, y, z)] = B.WATER;
      }
    }
  }

  // 洞窟: 3D ノイズで石をくり抜く
  for (let x = 1; x < OW.W - 1; x++){
    for (let z = 1; z < OW.D - 1; z++){
      const h = Math.min(OW.H - 8, hAt(x, z));
      for (let y = 3; y < h - 2; y++){
        const c = N.n3(x / 13, y / 9, z / 13);
        if (c > 0.72){
          const i = w.idx(x, y, z);
          if (w.data[i] === B.STONE || w.data[i] === B.DIRT) w.data[i] = B.AIR;
        }
      }
    }
  }

  // 鉱脈: 深さ帯ごとにヴェイン配置
  function vein(id, count, yMin, yMax, size){
    for (let i = 0; i < count; i++){
      let x = 2 + Math.floor(rand() * (OW.W - 4));
      let z = 2 + Math.floor(rand() * (OW.D - 4));
      let y = yMin + Math.floor(rand() * (yMax - yMin));
      const n = 2 + Math.floor(rand() * size);
      for (let j = 0; j < n; j++){
        if (w.inside(x, y, z) && w.data[w.idx(x, y, z)] === B.STONE) w.data[w.idx(x, y, z)] = id;
        x += Math.floor(rand() * 3) - 1; y += Math.floor(rand() * 3) - 1; z += Math.floor(rand() * 3) - 1;
        if (y < 1) y = 1;
      }
    }
  }
  vein(B.COAL, 190, 6, 40, 6);
  vein(B.IRON, 150, 4, 28, 5);
  vein(B.GOLD, 80,  3, 18, 4);
  vein(B.DIA,  60,  2, 12, 4);
  vein(B.MAGI, 46,  1, 8,  4);

  // 木を植える
  const trees = 120;
  for (let i = 0; i < trees; i++){
    const x = 3 + Math.floor(rand() * (OW.W - 6));
    const z = 3 + Math.floor(rand() * (OW.D - 6));
    let y = OW.H - 2;
    while (y > 1 && w.data[w.idx(x, y, z)] === B.AIR) y--;
    if (w.data[w.idx(x, y, z)] !== B.GRASS) continue;
    const th = 4 + Math.floor(rand() * 2);
    if (y + th + 3 >= OW.H) continue;
    for (let t = 1; t <= th; t++) w.data[w.idx(x, y + t, z)] = B.LOG;
    // 葉: 上部に球状
    for (let dy = th - 1; dy <= th + 2; dy++){
      const r = dy >= th + 1 ? 1 : 2;
      for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++){
        if (Math.abs(dx) === r && Math.abs(dz) === r && rand() < 0.5) continue;
        const tx = x + dx, ty = y + dy, tz = z + dz;
        if (w.inside(tx, ty, tz) && w.data[w.idx(tx, ty, tz)] === B.AIR)
          w.data[w.idx(tx, ty, tz)] = B.LEAF;
      }
    }
  }

  w.buildHeightMap();

  // スポーン地点: 中央付近の陸地
  let sx = OW.W >> 1, sz = OW.D >> 1;
  outer:
  for (let r = 0; r < 40; r++){
    for (let dx = -r; dx <= r; dx += Math.max(1, r)){
      for (let dz = -r; dz <= r; dz += Math.max(1, r)){
        const x = (OW.W >> 1) + dx, z = (OW.D >> 1) + dz;
        if (x < 2 || z < 2 || x >= OW.W - 2 || z >= OW.D - 2) continue;
        const hy = w.heightMap[x * w.wz + z];
        if (w.data[w.idx(x, hy, z)] === B.GRASS){ sx = x; sz = z; break outer; }
      }
    }
  }
  w.spawn = [sx + 0.5, w.heightMap[sx * w.wz + sz] + 2.2, sz + 0.5];
  return w;
}

/* ---------------- ヴォイド次元 (ボスアリーナ) ---------------- */
const VD = { W:48, H:40, D:48 };

function genVoid(){
  const w = new VoxelWorld(VD.W, VD.H, VD.D);
  w.borderBlock = B.AIR;           // 島の外は奈落
  const cx = VD.W / 2, cz = VD.D / 2;
  const N = makeNoise(613);

  // 浮遊島: 中心ほど厚い円盤
  for (let x = 0; x < VD.W; x++){
    for (let z = 0; z < VD.D; z++){
      const d = Math.hypot(x - cx, z - cz);
      const rim = 19 + N.n2(x / 9, z / 9) * 3;
      if (d > rim) continue;
      const depth = Math.max(1, Math.round((1 - d / rim) * 5 + N.n2(x / 5, z / 5) * 2));
      const top = 10;
      for (let y = top - depth; y <= top; y++)
        w.data[w.idx(x, y, z)] = B.VOID;
    }
  }
  // 結晶柱
  const pillars = [[-11,-11],[11,-11],[-11,11],[11,11],[0,-14],[0,14],[-14,0],[14,0]];
  for (const [px, pz] of pillars){
    const x = cx + px, z = cz + pz;
    if (w.get(x, 10, z) !== B.VOID) continue;
    const h = 3 + Math.floor(N.hash(x, 0, z) * 3);
    for (let y = 11; y <= 10 + h; y++) w.data[w.idx(x, y, z)] = B.CRYSTAL;
  }
  w.buildHeightMap();
  w.spawn = [cx + 0.5, 12.3, cz + 16.5]; // 島の南端側
  w.isVoid = true;
  return w;
}
