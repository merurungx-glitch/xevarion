'use strict';
/* ============================================================
   MagiCraft 3D: ブロック / アイテム / レシピ / テクスチャアトラス
   ブロックのテクスチャは canvas でプロシージャル生成（画像ファイル不要）
   ============================================================ */

const B = {
  AIR:0, GRASS:1, DIRT:2, STONE:3, LOG:4, LEAF:5,
  COAL:6, IRON:7, GOLD:8, DIA:9, MAGI:10, BEDROCK:11,
  PLANK:12, TABLE:13, ENHANCE:14, GATE:15,
  WATER:16, VOID:17, CRYSTAL:18, SAND:19, TORCH:20
};

/* ---- アトラスのタイル番号 (8列 x 4行 / 1タイル16px) ---- */
const TL = {
  WHITE:0, GRASS_TOP:1, GRASS_SIDE:2, DIRT:3, STONE:4, BEDROCK:5,
  LOG_SIDE:6, LOG_TOP:7, LEAF:8, PLANK:9, TABLE_TOP:10, TABLE_SIDE:11,
  COAL:12, IRON:13, GOLD:14, DIA:15, MAGI:16, ENHANCE_T:17, ENHANCE_S:18,
  GATE:19, WATER:20, VOID:21, CRYSTAL:22, SAND:23, TORCH:24
};
const ATLAS_COLS = 8, ATLAS_ROWS = 4, TILE_PX = 16;

/* ---- ブロック定義 ----
   tiles:[top,bottom,side] / solid:当たり判定 / opaque:隣接面カリング
   hard:採掘秒(基準) / tier:必要ツルハシ段階 / drop:アイテム / exp:採掘EXP
   emissive:自発光 / col:パーティクル色 */
const BLOCKS = {
  [B.AIR]:    { name:'', solid:false, opaque:false },
  [B.GRASS]:  { name:'草ブロック', solid:true, opaque:true, tiles:[TL.GRASS_TOP,TL.DIRT,TL.GRASS_SIDE], hard:0.7, tier:0, drop:'dirt', col:'#5fae3c' },
  [B.DIRT]:   { name:'土',         solid:true, opaque:true, tiles:[TL.DIRT,TL.DIRT,TL.DIRT], hard:0.6, tier:0, drop:'dirt', col:'#7a5230' },
  [B.STONE]:  { name:'石',         solid:true, opaque:true, tiles:[TL.STONE,TL.STONE,TL.STONE], hard:2.2, tier:1, drop:'stone', col:'#8a8a90' },
  [B.LOG]:    { name:'原木',       solid:true, opaque:true, tiles:[TL.LOG_TOP,TL.LOG_TOP,TL.LOG_SIDE], hard:1.2, tier:0, drop:'log', col:'#6b4a2b' },
  [B.LEAF]:   { name:'葉',         solid:true, opaque:true, tiles:[TL.LEAF,TL.LEAF,TL.LEAF], hard:0.2, tier:0, drop:null, col:'#3e8a30' },
  [B.COAL]:   { name:'石炭鉱石',   solid:true, opaque:true, tiles:[TL.COAL,TL.COAL,TL.COAL], hard:2.8, tier:1, drop:'coal', exp:5,  col:'#26262c' },
  [B.IRON]:   { name:'鉄鉱石',     solid:true, opaque:true, tiles:[TL.IRON,TL.IRON,TL.IRON], hard:3.4, tier:2, drop:'iron', exp:8,  col:'#d8a066' },
  [B.GOLD]:   { name:'金鉱石',     solid:true, opaque:true, tiles:[TL.GOLD,TL.GOLD,TL.GOLD], hard:4.0, tier:3, drop:'gold', exp:12, col:'#f5d33c' },
  [B.DIA]:    { name:'ダイヤ鉱石', solid:true, opaque:true, tiles:[TL.DIA,TL.DIA,TL.DIA],    hard:5.0, tier:3, drop:'dia',  exp:20, col:'#5ce8e4' },
  [B.MAGI]:   { name:'マギ鉱石',   solid:true, opaque:true, tiles:[TL.MAGI,TL.MAGI,TL.MAGI], hard:6.0, tier:4, drop:'magi', exp:30, col:'#c66cff', emissive:0.35 },
  [B.BEDROCK]:{ name:'岩盤',       solid:true, opaque:true, tiles:[TL.BEDROCK,TL.BEDROCK,TL.BEDROCK], hard:Infinity, tier:99, col:'#3a3a3e' },
  [B.PLANK]:  { name:'木材',       solid:true, opaque:true, tiles:[TL.PLANK,TL.PLANK,TL.PLANK], hard:1.0, tier:0, drop:'plank', col:'#a9773f' },
  [B.TABLE]:  { name:'作業台',     solid:true, opaque:true, tiles:[TL.TABLE_TOP,TL.PLANK,TL.TABLE_SIDE], hard:1.2, tier:0, drop:'table', col:'#a9773f', interact:'craft' },
  [B.ENHANCE]:{ name:'強化台',     solid:true, opaque:true, tiles:[TL.ENHANCE_T,TL.ENHANCE_S,TL.ENHANCE_S], hard:2.0, tier:0, drop:'enhance_table', col:'#6d5acc', interact:'enhance', emissive:0.3 },
  [B.GATE]:   { name:'次元ゲート', solid:false, opaque:false, tiles:[TL.GATE,TL.GATE,TL.GATE], hard:3.0, tier:0, drop:'gate', col:'#c66cff', interact:'gate', emissive:1 },
  [B.WATER]:  { name:'水',         solid:false, opaque:false, water:true, tiles:[TL.WATER,TL.WATER,TL.WATER], hard:Infinity, tier:99, col:'#3d6fd8' },
  [B.VOID]:   { name:'ヴォイド石', solid:true, opaque:true, tiles:[TL.VOID,TL.VOID,TL.VOID], hard:8.0, tier:4, drop:null, col:'#241340' },
  [B.CRYSTAL]:{ name:'虚空結晶',   solid:true, opaque:true, tiles:[TL.CRYSTAL,TL.CRYSTAL,TL.CRYSTAL], hard:6.0, tier:4, drop:'magi', exp:15, col:'#8a5cff', emissive:0.8 },
  [B.SAND]:   { name:'砂',         solid:true, opaque:true, tiles:[TL.SAND,TL.SAND,TL.SAND], hard:0.6, tier:0, drop:null, col:'#d9c88a' },
  // 松明: 非固体・小型ボックス描画(mesherはスキップ)。周囲を明るく照らす光源
  [B.TORCH]:  { name:'松明',       solid:false, opaque:false, tiles:[TL.TORCH,TL.TORCH,TL.TORCH], hard:0.1, tier:0, drop:'torch', col:'#ffb020', light:14 },
};

/* 光源ブロックの発光レベル (0..15) */
const BLOCK_LIGHT = { [B.TORCH]: 14 };

/* ---- アイテム定義（2D版から継承） ---- */
const ITEMS = {
  dirt:  {name:'土',            icon:'🟫', place:B.DIRT},
  stone: {name:'石',            icon:'🪨', place:B.STONE},
  log:   {name:'原木',          icon:'🪵', place:B.LOG},
  plank: {name:'木材',          icon:'🟧', place:B.PLANK},
  stick: {name:'棒',            icon:'🥢'},
  coal:  {name:'石炭',          icon:'⚫'},
  iron:  {name:'鉄',            icon:'⚙️'},
  gold:  {name:'金',            icon:'🟡'},
  dia:   {name:'ダイヤ',        icon:'💎'},
  magi:  {name:'マギクリスタル', icon:'🔮'},
  core:  {name:'魔獣コア',      icon:'🧿', desc:'スライムが落とす。クラフト素材'},
  bdata: {name:'バトルデータ',  icon:'📀', desc:'育成画面で使用: +40EXP'},
  manual:{name:'スキルマニュアル',icon:'📘', desc:'育成画面でクリティカル率UP'},
  torch: {name:'松明',          icon:'🔥', place:B.TORCH, desc:'設置して周囲を照らす。夜や洞窟の必需品 (石炭+棒で4個)'},
  table: {name:'作業台',        icon:'🛠️', place:B.TABLE, desc:'設置して「使う」でクラフト'},
  enhance_table:{name:'強化台', icon:'🔩', place:B.ENHANCE, desc:'設置して「使う」で装備強化'},
  gate:  {name:'次元ゲート',    icon:'🌀', place:B.GATE, desc:'設置して「使う」でボス次元へ!'},

  pick_wood: {name:'木のツルハシ',   icon:'⛏️', tool:{tier:1, power:2.2}, melee:8},
  pick_stone:{name:'石のツルハシ',   icon:'⛏️', tool:{tier:2, power:3.5}, melee:8},
  pick_iron: {name:'鉄のツルハシ',   icon:'⛏️', tool:{tier:3, power:5.0}, melee:8},
  pick_dia:  {name:'ダイヤのツルハシ',icon:'⛏️', tool:{tier:4, power:8.0}, melee:8},

  sword_wood: {name:'木の剣',    icon:'🗡️', melee:14},
  sword_stone:{name:'石の剣',    icon:'🗡️', melee:22},
  sword_iron: {name:'鉄の剣',    icon:'🗡️', melee:34},
  sword_dia:  {name:'ダイヤの剣',icon:'🗡️', melee:52},

  g_blade:{name:'魔導ブレード',   icon:'⚔️', gear:'weapon', atk:30, enhAtk:6,  melee:40, desc:'装備でATK+30 (強化毎+6)'},
  g_armor:{name:'魔導アーマー',   icon:'🛡️', gear:'armor',  hp:120, enhHp:25,  desc:'装備でHP+120 (強化毎+25)'},
  g_talis:{name:'魔導タリスマン', icon:'📿', gear:'acc', desc:'クリティカル+10% (強化毎+2%)'},
};

const RECIPES = [
  {out:'plank', n:4, needs:{log:1},              table:false},
  {out:'stick', n:4, needs:{plank:2},            table:false},
  {out:'torch', n:4, needs:{coal:1, stick:1},    table:false},
  {out:'table', n:1, needs:{plank:4},            table:false},
  {out:'pick_wood',  n:1, needs:{plank:3, stick:2}, table:true},
  {out:'sword_wood', n:1, needs:{plank:2, stick:1}, table:true},
  {out:'pick_stone', n:1, needs:{stone:3, stick:2}, table:true},
  {out:'sword_stone',n:1, needs:{stone:2, stick:1}, table:true},
  {out:'pick_iron',  n:1, needs:{iron:3, stick:2},  table:true},
  {out:'sword_iron', n:1, needs:{iron:2, stick:1},  table:true},
  {out:'pick_dia',   n:1, needs:{dia:3, stick:2},   table:true},
  {out:'sword_dia',  n:1, needs:{dia:2, stick:1},   table:true},
  {out:'enhance_table', n:1, needs:{stone:4, iron:2, magi:1}, table:true},
  {out:'g_blade', n:1, needs:{iron:4, dia:2, magi:3}, table:true},
  {out:'g_armor', n:1, needs:{iron:6, magi:2},        table:true},
  {out:'g_talis', n:1, needs:{gold:4, magi:2},        table:true},
  {out:'manual',  n:1, needs:{magi:2, core:2},        table:true},
  {out:'bdata',   n:1, needs:{coal:2, core:1},        table:true},
  {out:'gate',    n:1, needs:{magi:5, dia:3, gold:3, core:5}, table:true},
];

function enhCost(lv){
  const c = {iron: 2 + lv*2, gold: 1 + lv};
  if (lv >= 2) c.dia  = lv - 1;
  if (lv >= 4) c.magi = lv - 3;
  return c;
}
const ENH_MAX = 10;

/* ============================================================
   テクスチャアトラス生成（16px タイル、ボクセルクラフト風ピクセルノイズ）
   ============================================================ */
function buildAtlas(){
  const cv = document.createElement('canvas');
  cv.width = ATLAS_COLS * TILE_PX; cv.height = ATLAS_ROWS * TILE_PX;
  const g = cv.getContext('2d');

  // シード付き乱数（毎回同じ見た目）
  let s = 20260707;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };

  function px(tile, x, y, col){
    const tx = (tile % ATLAS_COLS) * TILE_PX, ty = Math.floor(tile / ATLAS_COLS) * TILE_PX;
    g.fillStyle = col; g.fillRect(tx + x, ty + y, 1, 1);
  }
  function fillNoise(tile, base, vary, alpha){
    for (let y = 0; y < TILE_PX; y++) for (let x = 0; x < TILE_PX; x++){
      const v = (rnd() - 0.5) * vary;
      px(tile, x, y, shade(base, v, alpha));
    }
  }
  function shade(hex, dv, alpha){
    const r = parseInt(hex.slice(1,3),16), gg = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    const f = (n) => Math.max(0, Math.min(255, Math.round(n * (1 + dv))));
    return alpha != null ? `rgba(${f(r)},${f(gg)},${f(b)},${alpha})` : `rgb(${f(r)},${f(gg)},${f(b)})`;
  }
  function speck(tile, col, count, size){
    for (let i = 0; i < count; i++){
      const x = 1 + Math.floor(rnd() * (TILE_PX - 2 - size)), y = 1 + Math.floor(rnd() * (TILE_PX - 2 - size));
      for (let dy = 0; dy <= size; dy++) for (let dx = 0; dx <= size; dx++){
        px(tile, x+dx, y+dy, shade(col, (rnd()-0.5)*0.25));
      }
    }
  }

  // 0 WHITE
  fillNoise(TL.WHITE, '#ffffff', 0);
  // 1 草TOP
  fillNoise(TL.GRASS_TOP, '#58a83a', 0.22);
  // 2 草SIDE = 土 + 上部に草
  fillNoise(TL.GRASS_SIDE, '#7a5230', 0.2);
  for (let x = 0; x < TILE_PX; x++){
    const d = 2 + Math.floor(rnd() * 3);
    for (let y = 0; y < d; y++) px(TL.GRASS_SIDE, x, y, shade('#58a83a', (rnd()-0.5)*0.22));
  }
  // 3 土
  fillNoise(TL.DIRT, '#7a5230', 0.2);
  // 4 石
  fillNoise(TL.STONE, '#8a8a90', 0.13);
  speck(TL.STONE, '#75757c', 5, 1);
  // 5 岩盤
  fillNoise(TL.BEDROCK, '#3a3a3e', 0.32);
  // 6 原木SIDE (縦縞)
  for (let x = 0; x < TILE_PX; x++){
    const c = (x % 4 < 2) ? '#6b4a2b' : '#59391f';
    for (let y = 0; y < TILE_PX; y++) px(TL.LOG_SIDE, x, y, shade(c, (rnd()-0.5)*0.12));
  }
  // 7 原木TOP (年輪)
  fillNoise(TL.LOG_TOP, '#a9773f', 0.1);
  g.strokeStyle = '#6b4a2b';
  { const tx = (TL.LOG_TOP % ATLAS_COLS)*TILE_PX, ty = Math.floor(TL.LOG_TOP/ATLAS_COLS)*TILE_PX;
    for (const r of [2,5,7]) g.strokeRect(tx+8-r, ty+8-r, r*2, r*2); }
  // 8 葉
  fillNoise(TL.LEAF, '#3e8a30', 0.3);
  speck(TL.LEAF, '#2c6b22', 6, 0);
  // 9 木材 (板)
  for (let y = 0; y < TILE_PX; y++) for (let x = 0; x < TILE_PX; x++){
    const line = (y % 4 === 3) || (x === (Math.floor(y/4)%2 ? 7 : 12) && y%4<3);
    px(TL.PLANK, x, y, shade(line ? '#7d5626' : '#a9773f', (rnd()-0.5)*0.1));
  }
  // 10 作業台TOP
  fillNoise(TL.TABLE_TOP, '#a9773f', 0.1);
  { const tx = (TL.TABLE_TOP%ATLAS_COLS)*TILE_PX, ty = Math.floor(TL.TABLE_TOP/ATLAS_COLS)*TILE_PX;
    g.fillStyle = '#7d5626'; g.fillRect(tx, ty, TILE_PX, 2); g.fillRect(tx, ty+14, TILE_PX, 2);
    g.fillRect(tx, ty, 2, TILE_PX); g.fillRect(tx+14, ty, 2, TILE_PX);
    g.fillStyle = '#59391f'; g.fillRect(tx+7, ty+2, 2, 12); g.fillRect(tx+2, ty+7, 12, 2); }
  // 11 作業台SIDE
  fillNoise(TL.TABLE_SIDE, '#a9773f', 0.1);
  { const tx = (TL.TABLE_SIDE%ATLAS_COLS)*TILE_PX, ty = Math.floor(TL.TABLE_SIDE/ATLAS_COLS)*TILE_PX;
    g.fillStyle = '#59391f'; g.fillRect(tx+2, ty+3, 5, 4); g.fillRect(tx+9, ty+3, 5, 4);
    g.fillStyle = '#7d5626'; g.fillRect(tx, ty, TILE_PX, 2); }
  // 鉱石 (石ベース + 色スペック)
  function ore(tile, col){
    fillNoise(tile, '#8a8a90', 0.13);
    speck(tile, col, 5, 1);
  }
  ore(TL.COAL, '#26262c'); ore(TL.IRON, '#d8a066'); ore(TL.GOLD, '#f5d33c');
  ore(TL.DIA, '#5ce8e4'); ore(TL.MAGI, '#c66cff');
  // 17/18 強化台
  fillNoise(TL.ENHANCE_T, '#4a3a99', 0.18); speck(TL.ENHANCE_T, '#8f7bff', 4, 1);
  fillNoise(TL.ENHANCE_S, '#3a2d78', 0.18); speck(TL.ENHANCE_S, '#6d5acc', 3, 1);
  // 19 ゲート (渦)
  fillNoise(TL.GATE, '#20123a', 0.3);
  { const tx = (TL.GATE%ATLAS_COLS)*TILE_PX, ty = Math.floor(TL.GATE/ATLAS_COLS)*TILE_PX;
    for (let i = 0; i < 42; i++){
      const a = i * 0.5, r = 1 + i * 0.16;
      const x = Math.round(8 + Math.cos(a) * r), y = Math.round(8 + Math.sin(a) * r);
      if (x>=0 && x<16 && y>=0 && y<16) g.fillStyle = i%3? '#c66cff' : '#e9d5ff', g.fillRect(tx+x, ty+y, 1, 1);
    } }
  // 20 水
  fillNoise(TL.WATER, '#3d6fd8', 0.15);
  // 21 ヴォイド石
  fillNoise(TL.VOID, '#241340', 0.28); speck(TL.VOID, '#4a2a80', 4, 0);
  // 22 虚空結晶
  fillNoise(TL.CRYSTAL, '#5c35b8', 0.2); speck(TL.CRYSTAL, '#c9a8ff', 6, 1);
  // 23 砂
  fillNoise(TL.SAND, '#d9c88a', 0.12);
  // 24 松明 (棒 + 炎。実際は小ボックスで描画するが安全のためタイルも用意)
  { const tx = (TL.TORCH%ATLAS_COLS)*TILE_PX, ty = Math.floor(TL.TORCH/ATLAS_COLS)*TILE_PX;
    g.clearRect(tx, ty, TILE_PX, TILE_PX);
    g.fillStyle = '#6b4a2b'; g.fillRect(tx+7, ty+6, 2, 9);
    g.fillStyle = '#ffb020'; g.fillRect(tx+6, ty+2, 4, 5);
    g.fillStyle = '#ffe37a'; g.fillRect(tx+7, ty+3, 2, 3); }

  return cv;
}

/* タイル番号 → UV 範囲 */
function tileUV(tile){
  const c = tile % ATLAS_COLS, r = Math.floor(tile / ATLAS_COLS);
  const w = 1 / ATLAS_COLS, h = 1 / ATLAS_ROWS;
  // わずかに内側に寄せてにじみ防止
  const e = 0.001;
  return [c * w + e, r * h + e, (c + 1) * w - e, (r + 1) * h - e];
}
