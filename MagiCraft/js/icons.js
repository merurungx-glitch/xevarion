'use strict';
/* ============================================================
   MagiCraft 3D: アイテムアイコン生成
   ・設置ブロック → ブロックのテクスチャで立体キューブを描画(ブロックと同じ見た目)
   ・素材/道具/装備 → ブロックと同じピクセルアート調で自作
   絵文字を廃し、世界のブロックデザインに統一する。
   ============================================================ */

const ICONS = (() => {
  const S = 48;                 // アイコン解像度
  const cache = {};
  let atlas = null;
  function getAtlas(){ if (!atlas) atlas = buildAtlas(); return atlas; }

  /* 立方体のテクスチャ面(平行四辺形にアフィン変換でタイルを貼る) */
  function drawFace(g, tile, O, U, V, darken){
    const sx = (tile % ATLAS_COLS) * TILE_PX, sy = Math.floor(tile / ATLAS_COLS) * TILE_PX;
    g.save();
    g.imageSmoothingEnabled = false;
    g.setTransform(U[0] / TILE_PX, U[1] / TILE_PX, V[0] / TILE_PX, V[1] / TILE_PX, O[0], O[1]);
    g.drawImage(getAtlas(), sx, sy, TILE_PX, TILE_PX, 0, 0, TILE_PX, TILE_PX);
    if (darken > 0){ g.fillStyle = 'rgba(0,0,0,' + darken + ')'; g.fillRect(0, 0, TILE_PX, TILE_PX); }
    g.restore();
    g.setTransform(1, 0, 0, 1, 0, 0);
  }
  function blockCube(g, tiles){
    const cx = S * 0.5, w = S * 0.34, h = S * 0.19, y0 = S * 0.13, sideH = S * 0.37;
    const Tb = [cx, y0], Tr = [cx + w, y0 + h], Tf = [cx, y0 + 2 * h], Tl = [cx - w, y0 + h];
    // 上面(top) / 左面(side・やや暗) / 右面(side・さらに暗) — mesherの陰影に合わせる
    drawFace(g, tiles[0], Tl, [Tf[0] - Tl[0], Tf[1] - Tl[1]], [Tb[0] - Tl[0], Tb[1] - Tl[1]], 0);
    drawFace(g, tiles[2], Tl, [Tf[0] - Tl[0], Tf[1] - Tl[1]], [0, sideH], 0.20);
    drawFace(g, tiles[2], Tf, [Tr[0] - Tf[0], Tr[1] - Tf[1]], [0, sideH], 0.40);
  }

  /* ---- ピクセルアート用ヘルパ (16グリッド) ---- */
  function pix(draw){
    const c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    const u = S / 16;
    const rect = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(Math.round(x * u), Math.round(y * u), Math.ceil(w * u), Math.ceil(h * u)); };
    const dot = (x, y, col) => rect(x, y, 1, 1, col);
    const disc = (ccx, ccy, r, col) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++){ const dx = x - ccx + 0.5, dy = y - ccy + 0.5; if (dx*dx + dy*dy <= r*r) dot(x, y, col); } };
    const ring = (ccx, ccy, r, col) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++){ const dx = x - ccx + 0.5, dy = y - ccy + 0.5, d = dx*dx + dy*dy; if (d <= r*r && d > (r-1.2)*(r-1.2)) dot(x, y, col); } };
    draw({ rect, dot, disc, ring });
    return c;
  }

  /* ---- 各素材/道具の描画 ---- */
  function ingot(P, base, hi, dark){
    P.rect(4, 6, 8, 5, base);
    P.rect(5, 5, 6, 1, hi);
    P.rect(4, 6, 8, 1, hi);
    P.rect(4, 10, 8, 1, dark);
    P.rect(11, 6, 1, 5, dark);
  }
  function gem(P, base, hi, dark){
    P.rect(6, 3, 4, 1, hi);
    P.rect(5, 4, 6, 1, base);
    P.rect(4, 5, 8, 3, base);
    P.rect(5, 8, 6, 2, base);
    P.rect(6, 10, 4, 1, dark);
    P.rect(7, 11, 2, 1, dark);
    P.rect(6, 4, 2, 1, hi);
    P.rect(5, 5, 1, 2, hi);
  }
  function pickaxe(P, tint, dark){
    P.rect(3, 4, 10, 2, tint);
    P.rect(3, 3, 3, 1, tint); P.rect(10, 3, 3, 1, tint);
    P.rect(3, 5, 10, 1, dark);
    P.rect(7, 5, 2, 9, '#8a5a2b');
    P.rect(8, 5, 1, 9, '#5e3d1c');
  }
  function sword(P, tint, hi, dark){
    P.rect(7, 2, 2, 8, tint);
    P.rect(7, 2, 1, 8, hi);
    P.rect(8, 3, 1, 7, dark);
    P.rect(5, 10, 6, 1, '#c9a24a');    // 鍔
    P.rect(7, 11, 2, 3, '#7d5626');    // 柄
    P.rect(6, 14, 4, 1, '#c9a24a');    // 柄頭
  }

  const DRAW = {
    stick: P => { P.rect(7, 3, 2, 10, '#a9773f'); P.rect(7, 3, 1, 10, '#c68f52'); P.rect(9, 3, 1, 10, '#7d5626'); },
    coal:  P => { P.disc(8, 8, 4.2, '#2c2c34'); P.rect(6, 6, 2, 2, '#4a4a55'); P.dot(10, 9, '#4a4a55'); },
    iron:  P => ingot(P, '#c9c9d2', '#eaeaf0', '#9a9aa6'),
    gold:  P => ingot(P, '#e6b422', '#ffe06a', '#b5820f'),
    dia:   P => gem(P, '#4fd8d4', '#9ff6f2', '#28a6a2'),
    magi:  P => { P.disc(8, 8, 5.6, 'rgba(198,108,255,0.22)'); gem(P, '#a24ff0', '#d7a8ff', '#5e1fb0'); },
    core:  P => { P.disc(8, 8, 5, '#1f7d78'); P.ring(8, 8, 5, '#5ce8e4'); P.disc(8, 8, 2.2, '#8ff6f2'); P.dot(6, 6, '#ffffff'); },
    bdata: P => { P.disc(8, 8, 5.4, '#3a3f6a'); P.ring(8, 8, 5.4, '#7a86d8'); P.disc(8, 8, 1.8, '#141830'); P.rect(9, 4, 2, 3, 'rgba(255,255,255,0.5)'); },
    manual:P => { P.rect(4, 3, 8, 10, '#5b3fb0'); P.rect(4, 3, 2, 10, '#3a2478'); P.rect(6, 4, 6, 8, '#efe8ff'); P.rect(7, 6, 4, 1, '#b7a8e0'); P.rect(7, 8, 4, 1, '#b7a8e0'); },
    torch: P => { P.rect(7, 7, 2, 7, '#6b4a2b'); P.rect(9, 7, 1, 7, '#59391f'); P.rect(6, 3, 4, 4, '#ffb020'); P.rect(7, 2, 2, 2, '#ffe37a'); P.rect(7, 4, 2, 2, '#ff7a1a'); },
    gate:  P => { P.disc(8, 8, 6, '#20123a'); P.ring(8, 8, 6, '#c66cff'); P.ring(8, 8, 4.2, '#8a5cff'); P.ring(8, 8, 2.4, '#e9d5ff'); P.dot(8, 8, '#ffffff'); },

    pick_wood:  P => pickaxe(P, '#a9773f', '#7d5626'),
    pick_stone: P => pickaxe(P, '#9a9aa0', '#6f6f76'),
    pick_iron:  P => pickaxe(P, '#d8d8de', '#a2a2ac'),
    pick_dia:   P => pickaxe(P, '#5ce8e4', '#2aa6a2'),
    sword_wood: P => sword(P, '#a9773f', '#c68f52', '#7d5626'),
    sword_stone:P => sword(P, '#9a9aa0', '#c2c2c8', '#6f6f76'),
    sword_iron: P => sword(P, '#d8d8de', '#f2f2f6', '#a2a2ac'),
    sword_dia:  P => sword(P, '#5ce8e4', '#a8f6f3', '#2aa6a2'),

    g_blade: P => { P.disc(8, 7, 6, 'rgba(198,108,255,0.18)'); sword(P, '#c66cff', '#ecd6ff', '#7a2fd0'); P.dot(7, 4, '#ffffff'); },
    g_armor: P => { P.rect(4, 4, 8, 8, '#6d5acc'); P.rect(4, 4, 8, 1, '#9a86ff'); P.rect(3, 4, 2, 3, '#6d5acc'); P.rect(11, 4, 2, 3, '#6d5acc'); P.rect(7, 5, 2, 5, '#4a3a99'); P.rect(4, 11, 8, 1, '#4a3a99'); },
    g_talis: P => { P.rect(4, 3, 8, 1, '#c9a24a'); P.rect(4, 3, 1, 3, '#c9a24a'); P.rect(11, 3, 1, 3, '#c9a24a'); P.disc(8, 9, 3.4, '#c66cff'); P.ring(8, 9, 3.4, '#e9c94a'); P.dot(7, 8, '#ffffff'); },
  };

  // 立体キューブで描くアイテム(通常の不透明ブロック)
  const CUBE = { dirt: B.DIRT, stone: B.STONE, log: B.LOG, plank: B.PLANK, table: B.TABLE, enhance_table: B.ENHANCE };

  function build(key){
    const c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d');
    if (CUBE[key] != null){
      blockCube(g, BLOCKS[CUBE[key]].tiles);
      return c;
    }
    if (DRAW[key]) return pix(DRAW[key]);
    // フォールバック: 灰色の四角
    g.fillStyle = '#7a7a86'; g.fillRect(10, 10, 28, 28);
    return c;
  }

  function url(key){
    if (cache[key]) return cache[key];
    try { cache[key] = build(key).toDataURL('image/png'); }
    catch (e) { cache[key] = ''; }
    return cache[key];
  }
  // <img> タグ文字列(UIに埋め込み用)
  function img(key, cls){
    const it = ITEMS[key] || {};
    return `<img class="i-img ${cls || ''}" src="${url(key)}" alt="${it.name || key}" draggable="false">`;
  }

  return { url, img };
})();
