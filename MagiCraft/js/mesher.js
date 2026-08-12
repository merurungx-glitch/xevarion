'use strict';
/* ============================================================
   MagiCraft 3D: チャンクメッシャー
   ・隣接が不透明でない面のみ生成（フェイスカリング）
   ・ボクセルクラフト式 頂点アンビエントオクルージョン (AO)
   ・ハイトマップによる簡易スカイライト（洞窟は暗く）
   頂点: x,y,z, u,v, light  (6 float)
   ============================================================ */

const MESHER = (() => {

  /* 面テーブル: 各方向 [nx,ny,nz], CCW 4頂点(外から見て反時計回り), 面シェード */
  // 頂点は単位立方体 [0,1]^3 のコーナー
  const FACES = [
    { n:[ 1, 0, 0], v:[[1,0,0],[1,1,0],[1,1,1],[1,0,1]], shade:0.80 }, // +X
    { n:[-1, 0, 0], v:[[0,0,0],[0,0,1],[0,1,1],[0,1,0]], shade:0.80 }, // -X
    { n:[ 0, 1, 0], v:[[0,1,0],[0,1,1],[1,1,1],[1,1,0]], shade:1.00 }, // +Y
    { n:[ 0,-1, 0], v:[[0,0,0],[1,0,0],[1,0,1],[0,0,1]], shade:0.55 }, // -Y
    { n:[ 0, 0, 1], v:[[0,0,1],[1,0,1],[1,1,1],[0,1,1]], shade:0.70 }, // +Z
    { n:[ 0, 0,-1], v:[[1,0,0],[0,0,0],[0,1,0],[1,1,0]], shade:0.70 }, // -Z
  ];

  // 各面の頂点ごとの UV (u: 0..1, v: 0..1  v=0が上)
  function faceUVs(face){
    const uv = [];
    for (const [vx, vy, vz] of face.v){
      let u, v;
      if (face.n[1] !== 0){ u = vx; v = vz; }          // 上下面
      else if (face.n[0] !== 0){ u = vz; v = 1 - vy; } // X面
      else { u = vx; v = 1 - vy; }                     // Z面
      uv.push([u, v]);
    }
    return uv;
  }
  const FACE_UVS = FACES.map(faceUVs);

  const AO_VALS = [0.45, 0.65, 0.82, 1.0];

  /* AO: 面の前の空セル(base) + 頂点コーナーの2辺+角 */
  function vertAO(world, bx, by, bz, face, corner){
    const n = face.n;
    // 面前方セル
    const fx = bx + n[0], fy = by + n[1], fz = bz + n[2];
    // 接線軸2つ
    let t1, t2;
    if (n[0] !== 0){ t1 = [0, corner[1] ? 1 : -1, 0]; t2 = [0, 0, corner[2] ? 1 : -1]; }
    else if (n[1] !== 0){ t1 = [corner[0] ? 1 : -1, 0, 0]; t2 = [0, 0, corner[2] ? 1 : -1]; }
    else { t1 = [corner[0] ? 1 : -1, 0, 0]; t2 = [0, corner[1] ? 1 : -1, 0]; }
    const s1 = world.isOpaque(fx + t1[0], fy + t1[1], fz + t1[2]) ? 1 : 0;
    const s2 = world.isOpaque(fx + t2[0], fy + t2[1], fz + t2[2]) ? 1 : 0;
    const c  = world.isOpaque(fx + t1[0] + t2[0], fy + t1[1] + t2[1], fz + t1[2] + t2[2]) ? 1 : 0;
    return AO_VALS[(s1 && s2) ? 0 : 3 - (s1 + s2 + c)];
  }

  /* スムーズ照明: 頂点コーナーに触れる面前方の4セルで block光/sky光を平均。
     角や段差に光が回り込み、松明の高さ変化で急に暗くなる問題を解消する。 */
  function vertLight(world, bx, by, bz, face, corner){
    const n = face.n;
    const fx = bx + n[0], fy = by + n[1], fz = bz + n[2];
    let t1, t2;
    if (n[0] !== 0){ t1 = [0, corner[1] ? 1 : -1, 0]; t2 = [0, 0, corner[2] ? 1 : -1]; }
    else if (n[1] !== 0){ t1 = [corner[0] ? 1 : -1, 0, 0]; t2 = [0, 0, corner[2] ? 1 : -1]; }
    else { t1 = [corner[0] ? 1 : -1, 0, 0]; t2 = [0, corner[1] ? 1 : -1, 0]; }
    const cells = [
      [0, 0, 0], [t1[0], t1[1], t1[2]], [t2[0], t2[1], t2[2]],
      [t1[0] + t2[0], t1[1] + t2[1], t1[2] + t2[2]],
    ];
    let bl = 0, sk = 0, cnt = 0;
    for (const [dx, dy, dz] of cells){
      const cx = fx + dx, cy = fy + dy, cz = fz + dz;
      if (world.isOpaque(cx, cy, cz)) continue; // 不透明セルは光に寄与しない
      bl += world.getLight(cx, cy, cz);
      sk += world.skyLit(cx, cy, cz) ? 1 : 0.28;
      cnt++;
    }
    if (cnt === 0) return { block: world.getLight(fx, fy, fz) / 15, sky: world.skyLit(fx, fy, fz) ? 1 : 0.28 };
    return { block: bl / cnt / 15, sky: sk / cnt };
  }

  /* チャンク(柱)のメッシュ生成 → {opaque:{verts,inds}, water:{...}} */
  function buildChunk(world, cx, cz){
    const oV = [], oI = [], wV = [], wI = [];
    const x0 = cx * CHUNK, z0 = cz * CHUNK;
    const x1 = Math.min(x0 + CHUNK, world.wx), z1 = Math.min(z0 + CHUNK, world.wz);

    for (let x = x0; x < x1; x++){
      for (let z = z0; z < z1; z++){
        for (let y = 0; y < world.wy; y++){
          const id = world.data[world.idx(x, y, z)];
          if (id === B.AIR || id === B.TORCH) continue; // 松明は小ボックスで別描画
          const bl = BLOCKS[id];
          const isWater = !!bl.water;

          for (let f = 0; f < 6; f++){
            const face = FACES[f], n = face.n;
            const nx = x + n[0], ny = y + n[1], nz = z + n[2];
            const nid = world.get(nx, ny, nz);
            if (isWater){
              // 水は空気に接する面のみ
              if (nid !== B.AIR) continue;
            } else {
              if (BLOCKS[nid].opaque) continue;
              if (nid === id) continue; // 同種(ゲート同士など)
            }

            // ライト成分を分離: shadeAo(幾何陰影) / sky(昼夜で暗くなる) / block(松明・常時)
            const tile = bl.tiles[n[1] > 0 ? 0 : n[1] < 0 ? 1 : 2];
            const [u0, v0, u1, v1] = tileUV(tile);
            const uvs = FACE_UVS[f];

            const V = isWater ? wV : oV, I = isWater ? wI : oI;
            const base = V.length / 8;
            const ao = [];
            for (let k = 0; k < 4; k++){
              const c = face.v[k];
              const a = bl.emissive ? 1 : vertAO(world, x, y, z, face, c);
              ao.push(a);
              let shadeAo = face.shade * a, skyV, blkV;
              if (bl.emissive){ shadeAo = 1; skyV = 1; blkV = 1; } // 自発光=フルブライト
              else {
                const L = vertLight(world, x, y, z, face, c); // 4セル平均のスムーズ照明
                skyV = L.sky; blkV = L.block;
              }
              V.push(
                x + c[0], y + c[1] * (isWater ? 0.88 : 1), z + c[2],
                u0 + (u1 - u0) * uvs[k][0], v0 + (v1 - v0) * uvs[k][1],
                shadeAo, skyV, blkV
              );
            }
            // AO の異方性補正: 対角が暗い場合は分割を反転
            if (ao[0] + ao[2] >= ao[1] + ao[3]) I.push(base, base + 1, base + 2, base, base + 2, base + 3);
            else I.push(base + 1, base + 2, base + 3, base + 1, base + 3, base);
          }
        }
      }
    }
    return {
      opaque: { verts: new Float32Array(oV), inds: new Uint32Array(oI) },
      water:  { verts: new Float32Array(wV), inds: new Uint32Array(wI) },
    };
  }

  return { buildChunk };
})();
