/* ══════════════════════════════════════════════════════════════════
   XEVARION WORLD CONFERENCE — 会場（ワールド）
   ------------------------------------------------------------------
   配置（メートル・上から見て −z が奥＝北）… テーマパークの部分は buildGround の上の説明を見る
     入口広場       x −36..36 / z 12..50     ゲート・パートナーのバナー
     ロビー         x −36..36 / z −18..12    受付・ホログラム柱・XEVA CAFÉ（西）・XEVARION STORE（東）
     基調講演ホール x −26..26 / z −72..−18   すり鉢の客席・大画面（更新情報を発表会の形で）
     講演トラック   西棟  A（ゲーム）/ B（学習）/ C（クリエイティブ・ツール）
     展示ホール     東棟 x 36..102 / z −46..46   アプリのブース（近づいて「ひらく」でそのアプリへ）
   ・同じ材質の箱は1つにまとめて描く（描く回数を減らす＝スマホでも軽い）。
   ・当たり判定は床の上の長方形（2D）。床の高さは heightAt(x, z)。
   ══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const T = THREE, X = XTex;
  const D = window.EXPO_DATA || { apps: [], updates: [], events: [], news: [], mates: [], release: {} };
  const ROOT = "../";

  /* ══════════════ まとめ描き（静的な箱・板） ══════════════ */
  function Batch() { this.parts = {}; }
  /* ★ 2026-09-28c 場所（150m 四方）ごとに分けてまとめる（パークが広いので、遠い所は描かない・見えない所は省ける） */
  const CELL = 250;
  /* ★ 2026-09-28d 色だけの材質（mat.userData.vc）は、色を頂点に焼いて1つの材質にまとめる（描く回数が大きく減る）。
     detail … true＝小物（近くだけ）／"L"＝遠くからも見える目印（高いビル・塔） */
  Batch.prototype.add = function (key, mat, geo, m4, detail) {
    const g = geo.clone(); g.applyMatrix4(m4);
    const vc = mat && mat.userData && mat.userData.vc;
    if (vc) {
      const n = g.attributes.position.count, col = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { col[i * 3] = vc.color.r; col[i * 3 + 1] = vc.color.g; col[i * 3 + 2] = vc.color.b; }
      g.setAttribute("color", new T.BufferAttribute(col, 3)); key = vc.fam; mat = vc.mat;
    }
    if (!g.boundingSphere) g.computeBoundingSphere();
    const c = g.boundingSphere.center, L = detail === "L", big = g.boundingSphere.radius > CELL;
    const cs = L ? CELL * 3 : CELL, cell = big ? "all" : (L ? "L" : "") + Math.floor(c.x / cs) + "_" + Math.floor(c.z / cs);
    const k = key + "|" + cell + (detail === true ? "|d" : "");
    let p = this.parts[k]; if (!p) p = this.parts[k] = { mat, geos: [], key, cell, detail: detail === true, landmark: L };
    p.geos.push(g);
  };
  Batch.prototype.build = function (scene, opt) {
    const out = [];
    for (const k in this.parts) {
      const p = this.parts[k];
      const merged = mergeGeos(p.geos);
      const mesh = new T.Mesh(merged, p.mat);
      mesh.receiveShadow = true; mesh.castShadow = p.detail || !!(opt && opt.cast && opt.cast[p.key]);
      mesh.matrixAutoUpdate = false; mesh.updateMatrix();
      mesh.userData.key = p.key; mesh.userData.cell = p.cell; mesh.userData.detail = p.detail; mesh.userData.landmark = p.landmark;
      scene.add(mesh); out.push(mesh);
    }
    return out;
  };
  function mergeGeos(list) {
    let n = 0, ni = 0, hasCol = false;
    list.forEach((g) => { n += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; if (g.attributes.color) hasCol = true; });
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), idx = new Uint32Array(ni), col = hasCol ? new Float32Array(n * 3).fill(1) : null;
    let o = 0, oi = 0;
    list.forEach((g) => {
      const c = g.attributes.position.count;
      pos.set(g.attributes.position.array, o * 3);
      if (g.attributes.normal) nor.set(g.attributes.normal.array, o * 3);
      if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
      if (col && g.attributes.color) { const ca = g.attributes.color, cs = ca.itemSize; if (cs === 3) col.set(ca.array, o * 3); else for (let i = 0; i < c; i++) { col[(o + i) * 3] = ca.getX(i); col[(o + i) * 3 + 1] = ca.getY(i); col[(o + i) * 3 + 2] = ca.getZ(i); } }
      if (g.index) { const a = g.index.array; for (let i = 0; i < a.length; i++) idx[oi + i] = a[i] + o; oi += a.length; }
      else { for (let i = 0; i < c; i++) idx[oi + i] = o + i; oi += c; }
      o += c;
    });
    const out = new T.BufferGeometry();
    out.setAttribute("position", new T.BufferAttribute(pos, 3));
    out.setAttribute("normal", new T.BufferAttribute(nor, 3));
    out.setAttribute("uv", new T.BufferAttribute(uv, 2));
    if (col) out.setAttribute("color", new T.BufferAttribute(col, 3));
    out.setIndex(new T.BufferAttribute(idx, 1));
    out.computeBoundingSphere();
    return out;
  }
  /* 大きさに合わせて UV を広げる箱（テクスチャが伸びない） */
  function boxGeo(w, h, d, uvScale) {
    const g = new T.BoxGeometry(w, h, d);
    if (uvScale) {
      const uv = g.attributes.uv, nrm = g.attributes.normal;
      for (let i = 0; i < uv.count; i++) {
        const nx = Math.abs(nrm.getX(i)), ny = Math.abs(nrm.getY(i));
        const sx = nx > 0.5 ? d : w, sy = ny > 0.5 ? d : h;
        uv.setXY(i, uv.getX(i) * sx / uvScale, uv.getY(i) * sy / uvScale);
      }
    }
    return g;
  }

  /* ══════════════ ワールド ══════════════ */
  function World(scene, renderer) {
    this.scene = scene; this.renderer = renderer;
    this.batch = new Batch();
    this.colliders = [];           /* {x0,z0,x1,z1} */
    this.zones = [];               /* {name, x0,z0,x1,z1, light} */
    this.inter = [];               /* {x,z,r,label,act,icon} */
    this.screens = [];             /* {scr, draw(g,w,h,t)} */
    this.anim = [];                /* 毎フレーム呼ぶ関数 */
    this.walls = [];               /* カメラのめり込み防止に使うメッシュ */
    this.npcSpots = {};
    this.m = this.materials();
    this.build();
  }

  World.prototype.materials = function () {
    const std = (o) => new T.MeshStandardMaterial(o);
    const m = {
      lobbyFloor: std({ map: X.stoneTex("#cfc6b8", "rgba(90,80,70,.4)", [18, 12], "lobby"), roughness: 0.16, metalness: 0.0 }),
      paver: std({ map: X.paverTex([3, 3]), roughness: 0.85 }),          /* 床の UV は 4m で1。石1つ 30cm ほど */
      grass: std({ map: X.grassTex([40, 40]), roughness: 1 }),
      white: std({ map: X.plasterTex("#dcd9d3", [8, 8], "white", 8), roughness: 0.75 }),
      warmWhite: std({ color: 0xf6efe4, roughness: 0.6 }),
      concrete: std({ map: X.plasterTex("#b9b7b3", [10, 10], "conc", 18), roughness: 0.9 }),
      expoFloor: std({ map: X.stoneTex("#9fa3a8", "rgba(60,60,70,.35)", [26, 34], "expo", 5), roughness: 0.22, metalness: 0.1 }),
      carpetNavy: std({ map: X.carpetTex("#1b2440", "#34507c", [26, 26], "navy"), roughness: 0.95 }),
      carpetRed: std({ map: X.carpetTex("#5a1d2a", "#8a3446", [10, 10], "red"), roughness: 0.95 }),
      carpetTeal: std({ map: X.carpetTex("#153c44", "#2f7480", [10, 10], "teal"), roughness: 0.95 }),
      carpetPlum: std({ map: X.carpetTex("#35214a", "#6a4a8e", [10, 10], "plum"), roughness: 0.95 }),
      carpetGray: std({ map: X.carpetTex("#3a3f48", "#5b6270", [22, 22], "gray"), roughness: 0.95 }),
      wood: std({ map: X.woodTex("#a0714a", "#8a5f3c", [3, 3], "a"), roughness: 0.55 }),
      woodDark: std({ map: X.woodTex("#5c3b26", "#4a2f1e", [3, 3], "d"), roughness: 0.5 }),
      woodLight: std({ map: X.woodTex("#d9b78d", "#c9a57c", [4, 4], "l"), roughness: 0.5 }),
      steel: std({ color: 0x2b2f36, roughness: 0.38, metalness: 0.85 }),
      chrome: std({ color: 0xd8dde4, roughness: 0.12, metalness: 1.0 }),
      black: std({ color: 0x121317, roughness: 0.25, metalness: 0.2 }),
      stageTop: std({ color: 0x0c0d12, roughness: 0.08, metalness: 0.3 }),
      glass: new T.MeshStandardMaterial({ color: 0xbfd9ee, roughness: 0.04, metalness: 0.2, transparent: true, opacity: 0.22, depthWrite: false }),
      glassDark: new T.MeshStandardMaterial({ color: 0x5a7e9c, roughness: 0.05, metalness: 0.5, transparent: true, opacity: 0.55 }),
      seat: std({ color: 0x9a2230, roughness: 0.8 }),
      seatBlue: std({ color: 0x233f7a, roughness: 0.8 }),
      water: std({ color: 0x3f8fbf, roughness: 0.04, metalness: 0.3, transparent: true, opacity: 0.85 }),
      leaf: new T.MeshToonMaterial({ color: 0x5c9c48, gradientMap: X.toonGradient() }),
      leaf2: new T.MeshToonMaterial({ color: 0x7ab852, gradientMap: X.toonGradient() }),
      trunk: std({ color: 0x6a4a34, roughness: 0.9 }),
      lightPanel: new T.MeshBasicMaterial({ color: 0xfffaf0 }),
      ledBlue: new T.MeshBasicMaterial({ color: 0x4fb6ff }),
      ledPink: new T.MeshBasicMaterial({ color: 0xff6fb4 }),
      ledGold: new T.MeshBasicMaterial({ color: 0xffc85a }),
      ledCyan: new T.MeshBasicMaterial({ color: 0x5ff0ff }),
      /* ★ 2026-09-28b テーマパーク：鮮やかな色 */
      lawn: std({ map: X.lawnTex([2, 2], "a"), roughness: 1 }),
      paverWarm: std({ map: X.paverTex([3, 3], true), roughness: 0.85 }),
      marble: std({ map: X.stoneTex("#f4f1ec", "rgba(170,160,150,.35)", [2, 2], "marble", 31), roughness: 0.35 }),
      soil: std({ color: 0x6a4a32, roughness: 1 }),
      flowerR: new T.MeshToonMaterial({ color: 0xff4f6a, gradientMap: X.toonGradient() }), flowerY: new T.MeshToonMaterial({ color: 0xffd23a, gradientMap: X.toonGradient() }),
      flowerP: new T.MeshToonMaterial({ color: 0xff8ac8, gradientMap: X.toonGradient() }), flowerW: new T.MeshToonMaterial({ color: 0xffffff, gradientMap: X.toonGradient() }),
      flowerV: new T.MeshToonMaterial({ color: 0xa87aff, gradientMap: X.toonGradient() }), flowerO: new T.MeshToonMaterial({ color: 0xff8a2a, gradientMap: X.toonGradient() }),
      ledPinkS: new T.MeshToonMaterial({ color: 0xff5f9a, gradientMap: X.toonGradient() }), ledBlueS: new T.MeshToonMaterial({ color: 0x4fa8ff, gradientMap: X.toonGradient() }), ledGreenS: new T.MeshToonMaterial({ color: 0x4fd88a, gradientMap: X.toonGradient() }),
      sakura: new T.MeshToonMaterial({ color: 0xffb7d0, gradientMap: X.toonGradient() }), sakura2: new T.MeshToonMaterial({ color: 0xffd0e0, gradientMap: X.toonGradient() }),
      steelWhite: std({ color: 0xf2f4f8, roughness: 0.3, metalness: 0.4 }),
      turf: std({ map: X.turfTex(14), roughness: 0.95 }),
      lineW: new T.MeshBasicMaterial({ color: 0xf6f6f6 }),
      boardBlue: std({ color: 0x2a5ad8, roughness: 0.5 }), boardRed: std({ color: 0xe0402a, roughness: 0.5 }),
      seatsTier: std({ color: 0x5ab8ff, roughness: 0.6 }),
      courtBlue: std({ color: 0x2f62b8, roughness: 0.7 }),
      asphalt: std({ map: X.asphaltTex([1, 1]), roughness: 0.9 }),
      curb: new T.MeshStandardMaterial({ map: (function () { const c = X.cv(32, 64), g = c.getContext("2d"); g.fillStyle = "#e8352a"; g.fillRect(0, 0, 32, 32); g.fillStyle = "#ffffff"; g.fillRect(0, 32, 32, 32); const t = X.tex(c); t.wrapS = t.wrapT = T.RepeatWrapping; return t; })(), roughness: 0.6 }),
      facade: std({ map: X.plasterTex("#efe9e0", [10, 4], "facade", 6), roughness: 0.7 })
    };
    /* 映りこみは控えめに（白い床・壁が白飛びしていた） */
    for (const k in m) if (m[k].isMeshStandardMaterial) m[k].envMapIntensity = /Floor|chrome|stageTop|glass|water|marble/.test(k) ? 0.7 : 0.35;
    m.asphalt.map.wrapS = m.asphalt.map.wrapT = T.RepeatWrapping; m.curb.side = T.DoubleSide;
    return m;
  };

  /* 箱を置く（まとめ描き）。collide で当たり判定も */
  World.prototype.box = function (key, x, y, z, w, h, d, opt) {
    opt = opt || {};
    const g = boxGeo(w, h, d, opt.uv);
    const m4 = new T.Matrix4().compose(new T.Vector3(x, y + h / 2, z), new T.Quaternion().setFromEuler(new T.Euler(0, opt.ry || 0, 0)), new T.Vector3(1, 1, 1));
    this.batch.add(key, this.m[key], g, m4, opt.detail || this._detail || (this._landmark && y + h > 30 ? "L" : false));
    if (opt.collide) this.colObb(x, z, w, d, opt.ry || 0);          /* ★ 2026-09-29 斜めの箱は斜めのまま当たる（前は軸にそろえた四角＝見えない角） */
    if (opt.wall) this.wallBoxes = (this.wallBoxes || []).concat([[x, y + h / 2, z, w, h, d]]);
  };
  World.prototype.collider = function (x0, z0, x1, z1, ry) {
    if (ry && Math.abs(Math.sin(ry)) > 0.5) { const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, hw = (x1 - x0) / 2, hd = (z1 - z0) / 2; x0 = cx - hd; x1 = cx + hd; z0 = cz - hw; z1 = cz + hw; }
    this.colliders.push({ x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1) });
  };
  /* ★★ 2026-09-29 当たり判定の形を増やす（ご指定「入れない所の線とオブジェクトの限界がずれている」の真因＝
     丸い噴水・池・ドーム・塔も、斜めの建物も、川も、ぜんぶ「四角」で近似していた → 丸い物のまわりに見えない角、
     斜めの建物は小さな四角の集まりでギザギザ、川は点ごとの四角ですき間だらけ）。
     t: "c" 円 / "ring" 輪（あき＝橋の所）/ "seg" 線分（太さつき・川やレール）/ "obb" 回転した長方形 / "ell" だ円の輪（スタジアムの客席） */
  const _bb = (o, x0, z0, x1, z1) => { o.x0 = x0; o.z0 = z0; o.x1 = x1; o.z1 = z1; return o; };
  World.prototype.colCircle = function (x, z, r) { this.colliders.push(_bb({ t: "c", x, z, r }, x - r, z - r, x + r, z + r)); };
  World.prototype.colRing = function (x, z, r0, r1, gaps) { this.colliders.push(_bb({ t: "ring", x, z, r0, r1, gaps: gaps || null }, x - r1, z - r1, x + r1, z + r1)); };
  World.prototype.colSeg = function (ax, az, bx, bz, r) { this.colliders.push(_bb({ t: "seg", ax, az, bx, bz, r }, Math.min(ax, bx) - r, Math.min(az, bz) - r, Math.max(ax, bx) + r, Math.max(az, bz) + r)); };
  World.prototype.colObb = function (x, z, w, d, ry) {
    const c = Math.cos(ry || 0), s = Math.sin(ry || 0), hw = w / 2, hd = d / 2, ex = Math.abs(c) * hw + Math.abs(s) * hd, ez = Math.abs(s) * hw + Math.abs(c) * hd;
    if (Math.abs(s) < 1e-3 || Math.abs(c) < 1e-3) { this.collider(x - ex, z - ez, x + ex, z + ez); return; }
    this.colliders.push(_bb({ t: "obb", x, z, hw, hd, c, s }, x - ex, z - ez, x + ex, z + ez));
  };
  World.prototype.colEll = function (x, z, rx0, rz0, rx1, rz1, gaps) { this.colliders.push(_bb({ t: "ell", x, z, rx0, rz0, rx1, rz1, gaps: gaps || null }, x - rx1, z - rz1, x + rx1, z + rz1)); };
  /* 折れ線（川・柵など）を線分の当たりに。skip(x, z) が true の所はあける（橋） */
  World.prototype.colPolyline = function (pts, r, skip) {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
      if (skip && (skip(a[0], a[1]) || skip(b[0], b[1]) || skip(mx, mz))) continue;
      this.colSeg(a[0], a[1], b[0], b[1], r);
    }
  };
  /* 壁：a→b の直線（x または z がそろう）に高さ h、あき（ドア）を gaps で */
  World.prototype.wall = function (key, x0, z0, x1, z1, h, th, gaps, opt) {
    opt = opt || {};
    const horiz = Math.abs(z1 - z0) < 1e-6;
    const a = horiz ? Math.min(x0, x1) : Math.min(z0, z1), b = horiz ? Math.max(x0, x1) : Math.max(z0, z1);
    const segs = []; let cur = a;
    (gaps || []).slice().sort((p, q) => p[0] - q[0]).forEach(([g0, g1]) => { if (g0 > cur) segs.push([cur, g0]); cur = Math.max(cur, g1); });
    if (cur < b) segs.push([cur, b]);
    segs.forEach(([s0, s1]) => {
      const len = s1 - s0, c = (s0 + s1) / 2;
      if (horiz) this.box(key, c, opt.y || 0, z0, len, h, th, { collide: true, uv: 2, wall: true });
      else this.box(key, x0, opt.y || 0, c, th, h, len, { collide: true, uv: 2, wall: true });
    });
    /* ドアの上（まぐさ） */
    (gaps || []).forEach(([g0, g1]) => {
      const dh = opt.doorH || 4.2; if (dh >= h) return;
      const c = (g0 + g1) / 2, len = g1 - g0;
      if (horiz) this.box(key, c, dh, z0, len, h - dh, th, { uv: 2 });
      else this.box(key, x0, dh, c, th, h - dh, len, { uv: 2 });
    });
  };
  World.prototype.floor = function (key, x0, z0, x1, z1, y) {
    const g = new T.PlaneGeometry(x1 - x0, z1 - z0); g.rotateX(-Math.PI / 2);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (x1 - x0) / 4, uv.getY(i) * (z1 - z0) / 4);
    this.batch.add(key, this.m[key], g, new T.Matrix4().makeTranslation((x0 + x1) / 2, y || 0, (z0 + z1) / 2));
  };
  World.prototype.zone = function (name, x0, z0, x1, z1, light) { this.zones.push({ name, x0, z0, x1, z1, light: light || "indoor" }); };

  /* 画像や文字の板（個別のメッシュ） */
  World.prototype.panel = function (tex, w, h, x, y, z, ry, opt) {
    opt = opt || {};
    const mat = opt.lit ? new T.MeshStandardMaterial({ map: tex, roughness: 0.6, transparent: !!opt.transparent }) : new T.MeshBasicMaterial({ map: tex, transparent: !!opt.transparent, toneMapped: opt.toneMapped !== false ? false : true });
    if (opt.color) mat.color = new T.Color(opt.color);
    const mesh = new T.Mesh(new T.PlaneGeometry(w, h), mat);
    mesh.position.set(x, y, z); mesh.rotation.y = ry || 0;
    /* ★ 2026-09-28b 裏にうすいふた（片面の板は裏から見ると消えて、向こうが透けて見えた）。まとめ描きなので軽い */
    if (!opt.transparent && !opt.noBack) { const r = ry || 0; this.box("black", x - Math.sin(r) * 0.02, y - h / 2, z - Math.cos(r) * 0.02, w, h, 0.02, { ry: r }); }
    this.scene.add(mesh); this.loose(mesh, Math.max(140, w * 14)); return mesh;
  };
  World.prototype.screen = function (w, h, pxW, x, y, z, ry, draw, opt) {
    const scr = new X.Screen(pxW, Math.round(pxW * h / w));
    const mesh = this.panel(scr.tex, w, h, x, y, z, ry, opt);
    const s = { scr, draw, mesh, last: -1, every: (opt && opt.every) || 0.25 };
    this.screens.push(s);
    /* 枠 */
    const fr = new T.Mesh(new T.BoxGeometry(w + 0.3, h + 0.3, 0.2), this.m.black);
    fr.position.copy(mesh.position); fr.rotation.y = ry || 0; fr.translateZ(-0.12);
    this.scene.add(fr); this.loose(fr, Math.max(140, w * 14));
    return s;
  };
  /* ★ 2026-09-28d 1つずつのメッシュは、遠く（r より先）では描かない */
  World.prototype.loose = function (o, r) { (this.looseList = this.looseList || []).push({ o, r: r || 200 }); return o; };
  World.prototype.interact = function (x, z, r, label, act, icon) { const it = { x, z, r, label, act, icon: icon || "👆" }; this.inter.push(it); return it; };

  /* ══════════════ 組み立て ══════════════ */
  World.prototype.build = function () {
    this.seats = [];                /* すわれる所 {x, z, yaw, h} */
    this.parkMaterials();           /* park.js：材質・看板のアトラス */
    this.buildIsland();             /* park.js：島・海・遠くの山 */
    this.buildShell();              /* 会議場（XEVARION HALL）：中身は今まで通り */
    this.buildCourt();
    this.buildLobby();
    this.buildKeynote();
    this.buildTracks();
    this.buildExpo();
    this.buildPark();               /* park_areas.js / park_areas2.js：24エリア・モノレール・道 */
    this.finishRivers();            /* 川と道の交わる所に橋 */
    this.fillForest();              /* 森・植えこみ → 木のインスタンス */
    this.buildCrowdFar();           /* 遠くの来場者 */
    this.buildLampPools();          /* 夜の街灯の光だまり */
    this.meshes = this.batch.build(this.scene, { cast: { steel: true, wood: true, woodDark: true, black: true } });
    this.cellMeshes = this.meshes.filter((m) => m.userData.cell && m.userData.cell !== "all");
    this.meshes.forEach((m) => { if (/^(white|warmWhite|concrete|glassDark|woodDark|wood|facade|gSilver|gPurple|gBlue)$/.test(m.userData.key)) this.walls.push(m); });
    if (this.signAtlas) this.signAtlas.pages.forEach((pg) => { pg.tex.needsUpdate = true; });
    this.bakeGround();              /* 影と接地の暗さを焼きこむ（材質に付ける） */
  };

  /* ── 空（夕方のゴールデンアワー）── */
  World.prototype.buildSky = function () {
    const g = new T.SphereGeometry(900, 40, 20);
    const mat = new T.ShaderMaterial({
      side: T.BackSide, depthWrite: false,
      uniforms: { sun: { value: new T.Vector3(-0.55, 0.22, -0.8).normalize() } },
      vertexShader: "varying vec3 vd; void main(){ vd = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
      fragmentShader: "uniform vec3 sun; varying vec3 vd; void main(){ float h = clamp(vd.y,-0.2,1.0);" +
        " vec3 zen = vec3(0.10,0.36,0.86); vec3 mid = vec3(0.32,0.62,0.98); vec3 hor = vec3(0.78,0.9,1.0); vec3 low = vec3(0.62,0.78,0.72);" +
        " vec3 c = mix(hor, mid, smoothstep(0.0,0.22,h)); c = mix(c, zen, smoothstep(0.22,0.9,h)); c = mix(low, c, smoothstep(-0.12,0.02,h));" +
        " float s = max(dot(vd, sun),0.0); c += vec3(1.0,0.95,0.8)*pow(s,12.0)*0.35 + vec3(1.0,0.98,0.9)*pow(s,500.0)*3.0;" +
        " gl_FragColor = vec4(c,1.0); }"
    });
    const sky = new T.Mesh(g, mat); sky.renderOrder = -1; sky.frustumCulled = false;
    this.scene.add(sky); this.sky = sky;
    /* 雲（やわらかい板） */
    const cc = X.cv(256, 128), cg = cc.getContext("2d");
    for (let i = 0; i < 16; i++) { const x = 40 + Math.random() * 176, y = 50 + Math.random() * 40, r = 20 + Math.random() * 30; const gr = cg.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.6, "rgba(250,252,255,.8)"); gr.addColorStop(1, "rgba(240,246,255,0)"); cg.fillStyle = gr; cg.fillRect(0, 0, 256, 128); }
    const ct = X.tex(cc);
    for (let i = 0; i < 16; i++) {
      const s = new T.Sprite(new T.SpriteMaterial({ map: ct, transparent: true, opacity: 0.95, depthWrite: false, fog: false }));
      const a = Math.random() * Math.PI * 2, r = 380 + Math.random() * 300;
      s.position.set(Math.cos(a) * r, 90 + Math.random() * 120, Math.sin(a) * r - 100); s.scale.set(220 + Math.random() * 180, 80 + Math.random() * 40, 1);
      this.scene.add(s);
    }
  };

  /* ══════════════ ★★ 2026-09-28b テーマパーク（ご指定：より広く・鮮やかに・噴水・座れる椅子・競技のフィールド） ══════════════
     配置（上から見て −z が北）
       建物（会議場）  x −104..104 / z −76..48   ロビー・基調講演・講演トラック（西棟）・展示ホール（東棟）
       入口広場        x −36..36  / z 12..50     ゲート・パートナーのバナー
       セントラルパーク x −80..80  / z 50..150    大噴水・花壇・並木・屋台・ベンチ
       ワンダーランド  x −175..−80 / z 50..150    観覧車・メリーゴーラウンド・タワー
       スポーツパーク  x 80..195  / z 50..150    サッカー場（CPU と 3対3）・ボッチャのコート
       サーキット      x −160..170 / z 155..300  カートレース（CPU と 3周）
     ・地面は会場ぜんぶに敷く（前は建物のまわりに地面がなく、すき間から空が見えていた）。
     ・前の屋外プラザは展示ホール・TRACK B の部屋と同じ場所に重なっていた（ホールの中に木・見えない柵）→ 配置ごと作り直し */
  /* 会議場の外壁（西棟の外側・入口広場の西側・屋根）。窓の並ぶ明るい外壁にする */
  World.prototype.buildShell = function () {
    const w = this;
    w.wall("facade", -104, -40, -104, 36, 9, 0.6, []);
    w.wall("facade", -104, -40, -26, -40, 9, 0.6, []);
    w.wall("facade", -104, 36, -36, 36, 9, 0.6, []);
    w.wall("facade", -36, 12, -36, 36, 9, 0.6, []);
    w.box("facade", -70, 8.3, -2, 68, 0.5, 76);                           /* 西棟の屋根 */
    /* 窓（外から見える面に帯状に） */
    for (let x = -100; x <= -42; x += 6) { w.box("glassDark", x, 3, 36.32, 4.2, 3.2, 0.05); }
    for (let z = 15; z <= 33; z += 6) w.box("glassDark", -35.68, 3, z, 0.05, 3.2, 4.2);
    w.panel(X.signTex("SESSION WING", { w: 1024, h: 160, color: "#ffffff", glow: "#ffb86e" }), 12, 1.9, -70, 7.2, 36.4, 0);
    /* 外壁の前の並木と花壇 */
    for (let x = -98; x <= -44; x += 9) { w.tree(x, 44, 1.1, (x / 9) % 2 ? "sakura" : "green"); w.flowerBed(x + 4.5, 40, 5, 1.6, 0, x); }
    /* ロビーの東西の壁を屋根の上まで（展示ホールの屋根とのすき間から空が見えた） */
    w.box("white", -36, 14, -3, 0.5, 1.8, 30); w.box("white", 36, 14, -3, 0.5, 1.8, 30);
  };

  /* ── 入口広場（建物の前） ── */
  World.prototype.buildCourt = function () {
    const w = this;
    w.zone("エントランスプラザ", -36, 12, 36, 50, "outdoor");
    w.floor("paver", -36, 12, 36, 50, 0.004);
    /* 入口のゲート */
    const gz = 30;
    [-9, 9].forEach((x) => { w.box("steel", x, 0, gz, 1.2, 9, 1.2, { collide: true }); w.box("ledBlue", x, 0.2, gz + 0.62, 0.15, 8.4, 0.02); });
    w.box("steel", 0, 8.4, gz, 19.4, 1.8, 1.4);
    const gt = X.signTex("XEVARION WORLD CONFERENCE 2026", { w: 2048, h: 180, grad: ["#0b1a3a", "#1f3f86", "#0b1a3a"], glow: "#7fd8ff" });
    w.panel(gt, 18.6, 1.55, 0, 9.3, gz + 0.72, 0); w.panel(gt, 18.6, 1.55, 0, 9.3, gz - 0.72, Math.PI);
    /* パートナーのバナー（両側） */
    D.mates.forEach((m, i) => { const s = i % 2 ? 1 : -1, z = 16 + Math.floor(i / 2) * 7; w.banner(ROOT + m.dir + m.id + ".webp" + (m.v ? "?v=" + m.v : ""), m.color, s * 31, z, s < 0 ? Math.PI / 2 : -Math.PI / 2, m.name); });
    for (let z = 18; z <= 46; z += 14) [-1, 1].forEach((s) => { w.planter(s * 15, z); w.lamp(s * 22, z + 7); });
    [-1, 1].forEach((s) => { w.bench(s * 12, 40, s < 0 ? Math.PI / 2 : -Math.PI / 2); w.bench(s * 12, 22, s < 0 ? Math.PI / 2 : -Math.PI / 2); });
    /* 建物の正面（ガラスのカーテンウォール） */
    const fz = 12, H = 16;
    w.box("glassDark", -21, 0, fz, 30, H, 0.3, { collide: true, wall: true }); w.box("glassDark", 21, 0, fz, 30, H, 0.3, { collide: true, wall: true });
    w.box("glass", 0, 0, fz, 12, 5, 0.1);
    w.box("glassDark", 0, 5, fz, 12, H - 5, 0.3);
    for (let x = -36; x <= 36; x += 3) w.box("steel", x, 0, fz + 0.2, 0.18, H, 0.25);
    for (let y = 4; y <= H; y += 4) w.box("steel", 0, y, fz + 0.2, 72, 0.18, 0.25);
    w.box("white", 0, H, 4, 76, 1.2, 18);
    w.box("white", 0, 5.2, fz + 4, 16, 0.4, 8);
    w.panel(X.signTex("XEVARION HALL", { w: 1024, h: 160, color: "#ffffff", glow: "#7fd8ff" }), 14, 2.2, 0, 14.2, fz + 0.5, 0);
  };

  /* 大噴水（3段・まん中の高い噴き上げ・まわりから弧を描く水・きらめく水面） */
  World.prototype.grandFountain = function (x, z) {
    const w = this;
    const rim = new T.TorusGeometry(10, 0.55, 12, 72); rim.rotateX(Math.PI / 2);
    w.batch.add("marble", w.m.marble, rim, new T.Matrix4().makeTranslation(x, 0.55, z));
    const wall = new T.CylinderGeometry(10, 10.2, 0.6, 72, 1, true);
    w.batch.add("marble", w.m.marble, wall, new T.Matrix4().makeTranslation(x, 0.3, z));
    w.colCircle(x, z, 10.5);
    /* きらめく水面（シェーダー） */
    const waterM = new T.ShaderMaterial({
      transparent: true, uniforms: { t: { value: 0 } },
      vertexShader: "varying vec2 vu; void main(){ vu = position.xy; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
      fragmentShader: "uniform float t; varying vec2 vu; void main(){ float r = length(vu); float wv = sin(r*3.0 - t*2.5)*0.5+0.5; float s = sin(vu.x*2.1+t*1.3)*sin(vu.y*2.3-t*1.1);" +
        " vec3 c = mix(vec3(0.12,0.62,0.86), vec3(0.35,0.86,0.98), wv*0.6+0.2); c += vec3(1.0)*pow(max(s,0.0),6.0)*0.8; gl_FragColor = vec4(c, 0.9); }"
    });
    const pool = new T.Mesh(new T.CircleGeometry(9.8, 72), waterM); pool.rotation.x = -Math.PI / 2; pool.position.set(x, 0.5, z); w.scene.add(pool);
    /* 段 */
    const tier = (r, h, y) => {
      const ped = new T.CylinderGeometry(r * 0.3, r * 0.4, h, 24); w.batch.add("marble", w.m.marble, ped, new T.Matrix4().makeTranslation(x, y - h / 2 + 0.3, z));
      const bowl = new T.CylinderGeometry(r, r * 0.55, 0.5, 40); w.batch.add("marble", w.m.marble, bowl, new T.Matrix4().makeTranslation(x, y, z));
      const wt = new T.Mesh(new T.CircleGeometry(r * 0.94, 40), waterM); wt.rotation.x = -Math.PI / 2; wt.position.set(x, y + 0.26, z); w.scene.add(wt);
    };
    tier(4, 1.8, 2.0); tier(2, 1.6, 3.8);
    w.box("marble", x, 4.0, z, 0.5, 1.2, 0.5);
    /* 水（粒）：まん中の噴き上げ・段からこぼれる水・まわりのアーチ */
    const N = 900, geo = new T.BufferGeometry(), pos = new Float32Array(N * 3), P = [];
    for (let i = 0; i < N; i++) P.push({ k: i % 3, t: Math.random(), a: Math.random() * Math.PI * 2, j: Math.floor(Math.random() * 12) });
    geo.setAttribute("position", new T.BufferAttribute(pos, 3));
    const dot = X.cv(64, 64), dg = dot.getContext("2d"), gr = dg.createRadialGradient(32, 32, 0, 32, 32, 30); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.5, "rgba(230,248,255,.8)"); gr.addColorStop(1, "rgba(200,240,255,0)"); dg.fillStyle = gr; dg.fillRect(0, 0, 64, 64);
    const pts = new T.Points(geo, new T.PointsMaterial({ color: 0xffffff, map: X.tex(dot), size: 0.26, transparent: true, opacity: 0.9, depthWrite: false }));   /* 丸い水しぶき（四角い粒に見えていた） */
    pts.frustumCulled = false; w.scene.add(pts);
    w.anim.push((dt, t) => {
      waterM.uniforms.t.value = t;
      for (let i = 0; i < N; i++) {
        const p = P[i]; p.t += dt * (p.k === 0 ? 0.55 : 0.7); if (p.t > 1) { p.t -= 1; p.a = Math.random() * Math.PI * 2; }
        let px, py, pz;
        if (p.k === 0) {                      /* まん中の噴き上げ（7m） */
          const r = 0.15 + p.t * 1.6, h = 5.2 + Math.sin(p.t * Math.PI) * 3.4 - p.t * p.t * 2.5;
          px = x + Math.cos(p.a) * r; pz = z + Math.sin(p.a) * r; py = Math.max(0.5, h);
        } else if (p.k === 1) {               /* 段からこぼれる水のカーテン */
          const r = (p.j % 2 ? 4.0 : 2.0) + 0.05, top = p.j % 2 ? 2.2 : 4.0;
          px = x + Math.cos(p.a) * (r + p.t * 0.3); pz = z + Math.sin(p.a) * (r + p.t * 0.3); py = top - p.t * p.t * (top - 0.6);
        } else {                              /* ふちから中へ弧をえがく 12 本 */
          const a = p.j / 12 * Math.PI * 2, r = 9.6 - p.t * 5.2;
          px = x + Math.cos(a) * r; pz = z + Math.sin(a) * r; py = 0.7 + Math.sin(p.t * Math.PI) * 2.6;
        }
        pos[i * 3] = px; pos[i * 3 + 1] = py; pos[i * 3 + 2] = pz;
      }
      geo.attributes.position.needsUpdate = true;
    });
    /* 浮かぶオーブ（XEVARION のしるし） */
    const orb = new T.Sprite(new T.SpriteMaterial({ map: X.imgTex(ROOT + "brand-xevarion-orb.png"), transparent: true, depthWrite: false }));
    orb.scale.set(3.4, 3.0, 1); orb.position.set(x, 11, z); w.scene.add(orb);
    const halo = new T.Mesh(new T.TorusGeometry(2.1, 0.06, 8, 64), new T.MeshBasicMaterial({ color: 0x8fe3ff })); halo.position.set(x, 11, z); w.scene.add(halo);
    w.anim.push((dt, t) => { orb.position.y = halo.position.y = 11 + Math.sin(t * 1.1) * 0.35; halo.rotation.set(t * 0.6, t * 0.8, 0); });
  };
  /* 花壇：縁石＋色とりどりの花（まとめて描く） */
  World.prototype.flowerBed = function (x, z, wd, dp, ry, seed) {
    const w = this;
    w.box("marble", x, 0, z, wd, 0.35, dp, { ry, collide: true });
    const soil = new T.BoxGeometry(wd - 0.3, 0.05, dp - 0.3);
    w.batch.add("soil", w.m.soil, soil, new T.Matrix4().compose(new T.Vector3(x, 0.36, z), new T.Quaternion().setFromEuler(new T.Euler(0, ry || 0, 0)), new T.Vector3(1, 1, 1)));
    const cols = ["flowerR", "flowerY", "flowerP", "flowerW", "flowerV", "flowerO"];
    const r = X.rnd(Math.floor(seed * 97 + 13) >>> 0 || 7), c = Math.cos(ry || 0), s = Math.sin(ry || 0);
    const n = Math.floor(wd * dp * 5);
    for (let i = 0; i < n; i++) {
      const lx = (r() - 0.5) * (wd - 0.5), lz = (r() - 0.5) * (dp - 0.5);
      const px = x + lx * c + lz * s, pz = z - lx * s + lz * c;
      const key = cols[Math.floor((lx * 0.8 + 10) + (seed % 3)) % cols.length];
      const g = new T.IcosahedronGeometry(0.13 + r() * 0.06, 0);
      w.batch.add(key, w.m[key], g, new T.Matrix4().makeTranslation(px, 0.52 + r() * 0.12, pz));
      if (i % 3 === 0) { const lf = new T.ConeGeometry(0.1, 0.3, 4); w.batch.add("leaf2", w.m.leaf2, lf, new T.Matrix4().makeTranslation(px + 0.12, 0.5, pz)); }
    }
  };
  /* 旗の飾り（2本の柱のあいだ） */
  World.prototype.garland = function (x0, z0, x1, z1) {
    const w = this, n = 14, cols = ["ledPinkS", "flowerY", "ledBlueS", "flowerO", "flowerV", "ledGreenS"];
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t, y = 4.7 - Math.sin(t * Math.PI) * 0.6;
      const g = new T.ConeGeometry(0.17, 0.34, 3); g.rotateX(Math.PI); g.rotateY(Math.atan2(x1 - x0, z1 - z0));
      w.batch.add(cols[i % cols.length], w.m[cols[i % cols.length]], g, new T.Matrix4().makeTranslation(x, y - 0.3, z));
    }
  };
  World.prototype.stall = function (x, z, ry, name, color) {
    const w = this, key = "awn" + color;
    if (!w.m[key]) { const c = X.cv(128, 64), g = c.getContext("2d"); for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#ffffff" : color; g.fillRect(i * 16, 0, 16, 64); } w.m[key] = new T.MeshStandardMaterial({ map: X.tex(c), roughness: 0.7 }); }
    w.box("woodLight", x, 0, z, 4, 1.1, 2, { collide: true, ry });
    w.box("white", x, 1.1, z - 0.2, 4, 0.08, 2.2, { ry });
    [[-1.9, -0.9], [1.9, -0.9], [-1.9, 0.9], [1.9, 0.9]].forEach(([a, b]) => w.box("steel", x + a, 0, z + b, 0.1, 2.9, 0.1));
    const roof = new T.BoxGeometry(4.6, 0.25, 2.8); roof.rotateX(0.25);
    w.batch.add(key, w.m[key], roof, new T.Matrix4().makeTranslation(x, 3.0, z));
    w.panel(X.signTex(name, { w: 512, h: 128, bg: color, color: "#fff" }), 3.2, 0.8, x, 2.3, z + 1.02, 0);
  };
  World.prototype.balloons = function (x, z) {
    const w = this, cols = [0xff5f8f, 0xffd24a, 0x5ab8ff, 0x7cff9a, 0xc08aff, 0xff8a3d];
    const grp = new T.Group(); grp.position.set(x, 0, z); w.scene.add(grp);
    w.box("steel", x, 0, z, 0.08, 1.2, 0.08);
    const bs = [];
    for (let i = 0; i < 7; i++) {
      const m = new T.Mesh(new T.SphereGeometry(0.42, 16, 12), new T.MeshToonMaterial({ color: cols[i % cols.length], gradientMap: X.toonGradient() }));
      m.scale.set(1, 1.18, 1); const a = i / 7 * Math.PI * 2;
      m.position.set(Math.cos(a) * 0.55, 4.2 + (i % 3) * 0.45, Math.sin(a) * 0.55); grp.add(m); bs.push(m);
      const str = new T.Mesh(new T.CylinderGeometry(0.008, 0.008, 3.1, 3), w.m.steel); str.position.set(Math.cos(a) * 0.28, 2.7, Math.sin(a) * 0.28); grp.add(str);
    }
    w.anim.push((dt, t) => { bs.forEach((b, i) => { b.position.y = 4.2 + (i % 3) * 0.45 + Math.sin(t * 1.3 + i) * 0.12; }); });
  };
  World.prototype.signPost = function (x, z, lines) {
    const w = this;
    w.box("woodDark", x, 0, z, 0.2, 3.6, 0.2, { collide: true });
    lines.forEach(([txt, col], i) => {
      w.panel(X.signTex(txt, { w: 768, h: 128, bg: col, color: "#fff", size: 60 }), 3.2, 0.52, x, 3.2 - i * 0.62, z + 0.12, 0);
      w.panel(X.signTex(txt, { w: 768, h: 128, bg: col, color: "#fff", size: 60 }), 3.2, 0.52, x, 3.2 - i * 0.62, z - 0.12, Math.PI);
    });
  };

  World.prototype.ferris = function (x, z) {
    const w = this, R = 24, H = 27;
    [-1, 1].forEach((s) => {                      /* A 字の脚 */
      [-1, 1].forEach((f) => { const g = new T.CylinderGeometry(0.45, 0.6, Math.hypot(H, 12), 10); const m4 = new T.Matrix4().compose(new T.Vector3(x + f * 6, H / 2, z + s * 3.2), new T.Quaternion().setFromEuler(new T.Euler(0, 0, -f * Math.atan2(12, H) / 1)), new T.Vector3(1, 1, 1)); w.batch.add("steelWhite", w.m.steelWhite, g, m4); });
    });
    w.box("marble", x, 0, z, 18, 0.8, 10, { collide: true });
    const wheel = new T.Group(); wheel.position.set(x, H, z); w.scene.add(wheel);
    const rimM = new T.MeshToonMaterial({ color: 0xffffff, gradientMap: X.toonGradient() });
    [-1.5, 1.5].forEach((dz) => { const r = new T.Mesh(new T.TorusGeometry(R, 0.3, 8, 96), rimM); r.position.z = dz; wheel.add(r); const r2 = new T.Mesh(new T.TorusGeometry(R * 0.55, 0.18, 6, 64), rimM); r2.position.z = dz; wheel.add(r2); });
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; const sp = new T.Mesh(new T.CylinderGeometry(0.1, 0.1, R, 4), rimM); sp.position.set(Math.cos(a) * R / 2, Math.sin(a) * R / 2, 0); sp.rotation.z = a - Math.PI / 2; wheel.add(sp); }
    const hub = new T.Mesh(new T.CylinderGeometry(1.6, 1.6, 3.6, 24), new T.MeshToonMaterial({ color: 0xff5f8f, gradientMap: X.toonGradient() })); hub.rotation.x = Math.PI / 2; wheel.add(hub);
    /* LED */
    const ledM = new T.MeshBasicMaterial({ color: 0xffe07a });
    for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2; const l = new T.Mesh(new T.SphereGeometry(0.22, 6, 4), ledM); l.position.set(Math.cos(a) * R, Math.sin(a) * R, 1.8); wheel.add(l); }
    const cols = [0xff5f8f, 0xffc84a, 0x5ab8ff, 0x7ce0a0, 0xc08aff, 0xff8a3d];
    const gons = [];
    for (let i = 0; i < 16; i++) {
      const g = new T.Group(); w.scene.add(g);
      const cab = new T.Mesh(new T.CylinderGeometry(1.5, 1.5, 2.2, 16), new T.MeshToonMaterial({ color: cols[i % cols.length], gradientMap: X.toonGradient() })); cab.position.y = -1.8; g.add(cab);
      const win = new T.Mesh(new T.CylinderGeometry(1.52, 1.52, 0.9, 16, 1, true), new T.MeshBasicMaterial({ color: 0xcfeaff, transparent: true, opacity: 0.7, side: T.DoubleSide })); win.position.y = -1.5; g.add(win);
      const top = new T.Mesh(new T.ConeGeometry(1.7, 0.9, 16), new T.MeshToonMaterial({ color: 0xffffff, gradientMap: X.toonGradient() })); top.position.y = -0.3; g.add(top);
      gons.push({ g, a: i / 16 * Math.PI * 2 });
    }
    w.anim.push((dt, t) => {
      const rot = t * 0.05; wheel.rotation.z = rot;
      gons.forEach((o) => { const a = o.a + rot; o.g.position.set(x + Math.cos(a) * R, H + Math.sin(a) * R, z); });
    });
    w.panel(X.signTex("SKY WHEEL", { w: 1024, h: 180, grad: ["#ff5f8f", "#ffb04a"], color: "#fff" }), 9, 1.6, x, 2.6, z + 5.1, 0);
  };
  World.prototype.carousel = function (x, z) {
    const w = this;
    w.box("marble", x, 0, z, 17, 0.5, 17, { collide: true });
    const top = new T.Group(); top.position.set(x, 0.5, z); w.scene.add(top);
    const plat = new T.Mesh(new T.CylinderGeometry(7.5, 7.5, 0.4, 48), new T.MeshToonMaterial({ color: 0xfff3dc, gradientMap: X.toonGradient() })); plat.position.y = 0.2; top.add(plat);
    const c = X.cv(256, 64), g = c.getContext("2d"); for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? "#ffffff" : "#ff5f7a"; g.fillRect(i * 16, 0, 16, 64); }
    const canopy = new T.Mesh(new T.ConeGeometry(8.4, 3.2, 32, 1, true), new T.MeshToonMaterial({ map: X.tex(c), gradientMap: X.toonGradient(), side: T.DoubleSide })); canopy.position.y = 6.6; top.add(canopy);
    const crown = new T.Mesh(new T.SphereGeometry(0.8, 16, 12), new T.MeshToonMaterial({ color: 0xffd24a, gradientMap: X.toonGradient() })); crown.position.y = 8.6; top.add(crown);
    const pole = new T.Mesh(new T.CylinderGeometry(1.2, 1.2, 6, 20), new T.MeshToonMaterial({ color: 0xffd24a, gradientMap: X.toonGradient() })); pole.position.y = 3.2; top.add(pole);
    const horses = [], cols = [0xffffff, 0xffe0f0, 0xd8f0ff, 0xfff0c8];
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2, r = i % 2 ? 5.2 : 6.4;
      const hg = new T.Group(); hg.position.set(Math.cos(a) * r, 1.4, Math.sin(a) * r); hg.rotation.y = -a; top.add(hg);
      const rod = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 5.4, 6), new T.MeshToonMaterial({ color: 0xffd24a, gradientMap: X.toonGradient() })); rod.position.y = 2.2; hg.add(rod);
      const hm = new T.MeshToonMaterial({ color: cols[i % cols.length], gradientMap: X.toonGradient() });
      const body = new T.Mesh(new T.CapsuleGeometry(0.35, 1.1, 4, 10), hm); body.rotation.z = Math.PI / 2; hg.add(body);
      const neck = new T.Mesh(new T.CapsuleGeometry(0.2, 0.6, 4, 8), hm); neck.position.set(0.7, 0.45, 0); neck.rotation.z = -0.6; hg.add(neck);
      const head = new T.Mesh(new T.CapsuleGeometry(0.17, 0.35, 4, 8), hm); head.position.set(1.0, 0.75, 0); head.rotation.z = Math.PI / 2 - 0.3; hg.add(head);
      [[0.45, 0.2], [0.45, -0.2], [-0.45, 0.2], [-0.45, -0.2]].forEach(([lx, lz]) => { const l = new T.Mesh(new T.CylinderGeometry(0.07, 0.06, 0.8, 5), hm); l.position.set(lx, -0.55, lz); hg.add(l); });
      const saddle = new T.Mesh(new T.BoxGeometry(0.5, 0.12, 0.6), new T.MeshToonMaterial({ color: 0xff5f7a, gradientMap: X.toonGradient() })); saddle.position.y = 0.38; hg.add(saddle);
      horses.push({ hg, ph: i * 0.8 });
    }
    w.anim.push((dt, t) => { top.rotation.y = t * 0.35; horses.forEach((h) => { h.hg.position.y = 1.4 + Math.sin(t * 2 + h.ph) * 0.35; }); });
    w.panel(X.signTex("MERRY-GO-ROUND", { w: 1024, h: 160, grad: ["#ff5f7a", "#ffd24a"], color: "#fff" }), 7, 1.1, x, 1.6, z + 8.6, 0);
  };
  World.prototype.dropTower = function (x, z) {
    const w = this, H = 48;
    w.box("steelWhite", x, 0, z, 2.2, H, 2.2, { collide: true });
    w.box("ledPinkS", x, H, z, 3, 1.5, 3);
    const ring = new T.Mesh(new T.CylinderGeometry(4.2, 4.2, 1.4, 24, 1, true), new T.MeshToonMaterial({ color: 0x5ab8ff, gradientMap: X.toonGradient(), side: T.DoubleSide })); ring.position.set(x, 10, z); w.scene.add(ring);
    w.anim.push((dt, t) => { const k = (t * 0.08) % 1; ring.position.y = k < 0.7 ? 3 + k / 0.7 * 38 : 41 - Math.pow((k - 0.7) / 0.3, 2) * 38; });
  };

  World.prototype.tree = function (x, z, s, kind) {
    this.box("trunk", x, 0, z, 0.35 * s, 3 * s, 0.35 * s);
    const g = new T.IcosahedronGeometry(1.8 * s, 1), g2 = new T.IcosahedronGeometry(1.3 * s, 1);
    const k1 = kind === "sakura" ? "sakura" : "leaf", k2 = kind === "sakura" ? "sakura2" : "leaf2";
    this.batch.add(k1, this.m[k1], g, new T.Matrix4().makeTranslation(x, 3.8 * s, z));
    this.batch.add(k2, this.m[k2], g2, new T.Matrix4().makeTranslation(x + 0.6 * s, 4.6 * s, z - 0.3 * s));
    this.colCircle(x, z, 0.3 * s + 0.1);
  };
  World.prototype.planter = function (x, z) {
    this.box("concrete", x, 0, z, 2.4, 0.6, 2.4, { collide: true });
    const g = new T.IcosahedronGeometry(1.0, 1); g.scale(1, 0.55, 1);
    this.batch.add("leaf2", this.m.leaf2, g, new T.Matrix4().makeTranslation(x, 0.9, z));
  };
  World.prototype.bench = function (x, z, ry) {
    ry = ry || 0;
    const c = Math.cos(ry), s = Math.sin(ry);
    this.box("woodLight", x, 0.42, z, 2.2, 0.08, 0.55, { collide: true, ry });
    this.box("woodLight", x - 0.26 * s, 0.5, z - 0.26 * c, 2.2, 0.42, 0.06, { ry });   /* 背もたれ（すわる向きの反対側） */
    this.box("steel", x, 0, z, 2.0, 0.42, 0.1, { ry });
    /* すわれる所（2人ぶん）：背もたれの反対側を向く */
    [-0.55, 0.55].forEach((lx) => this.seats.push({ x: x + lx * c + 0.06 * s, z: z - lx * s + 0.06 * c, yaw: ry, h: 0.47 }));
  };
  World.prototype.lamp = function (x, z) {
    this.box("steel", x, 0, z, 0.14, 4.4, 0.14, { collide: true });
    this.box("lightPanel", x, 4.4, z, 0.5, 0.25, 0.5);
  };
  World.prototype.fountain = function (x, z) {
    const ring = new T.TorusGeometry(5, 0.35, 10, 48); ring.rotateX(Math.PI / 2);
    this.batch.add("concrete", this.m.concrete, ring, new T.Matrix4().makeTranslation(x, 0.45, z));
    const wat = new T.CircleGeometry(4.9, 48); wat.rotateX(-Math.PI / 2);
    const water = new T.Mesh(wat, this.m.water); water.position.set(x, 0.5, z); this.scene.add(water);
    this.colCircle(x, z, 5.4);
    /* 浮かぶオーブ（XEVARION のしるし） */
    const orbTex = X.imgTex(ROOT + "brand-xevarion-orb.png");
    const orb = new T.Sprite(new T.SpriteMaterial({ map: orbTex, transparent: true, depthWrite: false }));
    orb.scale.set(3.0, 2.6, 1); orb.position.set(x, 5.2, z); this.scene.add(orb);
    const halo = new T.Mesh(new T.TorusGeometry(1.8, 0.05, 8, 64), new T.MeshBasicMaterial({ color: 0x8fe3ff }));
    halo.position.set(x, 4.2, z); this.scene.add(halo);
    const halo2 = halo.clone(); halo2.scale.setScalar(0.8); this.scene.add(halo2);
    /* 水しぶき */
    const pc = 160, pg = new T.BufferGeometry(), pp = new Float32Array(pc * 3), pv = [];
    for (let i = 0; i < pc; i++) pv.push({ a: Math.random() * Math.PI * 2, t: Math.random() });
    pg.setAttribute("position", new T.BufferAttribute(pp, 3));
    const pts = new T.Points(pg, new T.PointsMaterial({ color: 0xdff4ff, size: 0.12, transparent: true, opacity: 0.8 }));
    this.scene.add(pts);
    this.anim.push((dt, t) => {
      orb.position.y = 5.2 + Math.sin(t * 1.2) * 0.25;
      halo.rotation.set(t * 0.6, t * 0.9, 0); halo2.rotation.set(-t * 0.7, 0.4, t * 0.5);
      halo.position.y = halo2.position.y = orb.position.y;
      for (let i = 0; i < pc; i++) {
        const p = pv[i]; p.t += dt * 0.6; if (p.t > 1) { p.t -= 1; p.a = Math.random() * Math.PI * 2; }
        const r = 0.6 + p.t * 3.4; pp[i * 3] = x + Math.cos(p.a) * r; pp[i * 3 + 2] = z + Math.sin(p.a) * r; pp[i * 3 + 1] = 0.6 + Math.sin(p.t * Math.PI) * 2.2;
      }
      pg.attributes.position.needsUpdate = true;
    });
  };
  World.prototype.banner = function (src, color, x, z, ry, name) {
    this.box("steel", x, 0, z, 0.16, 7.6, 0.16, { collide: true });
    const c = X.cv(512, 1152), g = c.getContext("2d");
    const gr = g.createLinearGradient(0, 0, 0, 1152); gr.addColorStop(0, color); gr.addColorStop(1, "#0b1530"); g.fillStyle = gr; g.fillRect(0, 0, 512, 1152);
    const tex = X.tex(c);
    const mesh = this.panel(tex, 2.2, 4.95, x, 5.0, z, ry, { lit: true, noBack: true });
    const back = this.panel(tex, 2.2, 4.95, x, 5.0, z, ry + Math.PI, { lit: true, noBack: true });
    const im = new Image(); im.onload = () => {
      const s = Math.min(480 / im.width, 1000 / im.height);
      g.drawImage(im, 256 - im.width * s / 2, 1080 - im.height * s, im.width * s, im.height * s);
      g.fillStyle = "rgba(10,20,50,.55)"; g.fillRect(0, 1060, 512, 92);
      g.fillStyle = "#fff"; g.font = "900 64px sans-serif"; g.textAlign = "center"; g.fillText(name, 256, 1128);
      tex.needsUpdate = true;
    }; im.src = src;
  };
  World.prototype.foodTruck = function (x, z, ry, name, color) {
    const m = this.m;
    this.m["truck" + name] = new T.MeshStandardMaterial({ color: new T.Color(color), roughness: 0.4, metalness: 0.3 });
    const key = "truck" + name;
    const c = Math.cos(ry), s = Math.sin(ry);
    const P = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
    let [px, pz] = P(0, 0);
    this.box(key, px, 0.5, pz, 6, 2.6, 2.4, { collide: true, ry });
    [px, pz] = P(2.2, 0); this.box(key, px, 0.5, pz, 1.6, 1.8, 2.3, { ry });
    [[-1.8, 1.2], [1.8, 1.2], [-1.8, -1.2], [1.8, -1.2]].forEach(([lx, lz]) => { const [wx, wz] = P(lx, lz); this.box("black", wx, 0, wz, 0.8, 0.8, 0.3, { ry }); });
    const sign = X.signTex(name, { w: 1024, h: 200, bg: "#fff8ec", color: color });
    const [sx, sz] = P(-0.4, 1.23);
    this.panel(sign, 4.2, 0.8, sx, 2.7, sz, ry, { lit: true });
    [px, pz] = P(-0.4, 1.9);
    this.box("warmWhite", px, 2.9, pz, 4.6, 0.08, 1.4, { ry });
  };

  /* ── ロビー ── */
  World.prototype.buildLobby = function () {
    const w = this;
    w.zone("メインロビー", -36, -18, 36, 12, "lobby");
    w.floor("lobbyFloor", -36, -18, 36, 12);
    w.box("white", 0, 14, -3, 72, 0.4, 30);                                           /* 天井 */
    for (let x = -30; x <= 30; x += 6) for (let z = -15; z <= 8; z += 6) w.box("lightPanel", x, 13.95, z, 4.6, 0.05, 4.6);   /* 天窓の光 */
    /* 柱 */
    [-24, -12, 12, 24].forEach((x) => [-12, 2].forEach((z) => w.box("white", x, 0, z, 1.2, 14, 1.2, { collide: true, wall: true })));
    /* 奥の壁（基調講演ホールへのドア）・東西の壁（トラック・展示へ） */
    w.wall("white", -36, -18, 36, -18, 14, 0.5, [[-6, 6]], { doorH: 5 });
    w.wall("white", -36, -18, -36, 12, 14, 0.5, [[-5, 5]], { doorH: 5 });
    w.wall("white", 36, -18, 36, 12, 14, 0.5, [[-5, 5]], { doorH: 5 });
    /* ドアの上の案内 */
    w.panel(X.signTex("KEYNOTE HALL  ▲", { w: 1024, h: 160, bg: "#0e1628", color: "#fff", glow: "#6ec7ff" }), 10, 1.5, 0, 6.2, -17.7, 0);
    w.panel(X.signTex("◀  SESSION TRACKS  A · B · C", { w: 1024, h: 160, bg: "#0e1628", color: "#fff", glow: "#ffb86e" }), 9, 1.4, -35.7, 6.2, 0, Math.PI / 2);
    w.panel(X.signTex("EXPO HALL  ▶", { w: 1024, h: 160, bg: "#0e1628", color: "#fff", glow: "#7cffb8" }), 9, 1.4, 35.7, 6.2, 0, -Math.PI / 2);
    /* 案内カウンター（右） */
    [12].forEach((x) => {
      w.box("woodLight", x, 0, 6, 7, 1.1, 1.2, { collide: true }); w.box("black", x, 1.1, 6, 7.2, 0.06, 1.4);
      w.box("ledBlue", x, 0.05, 6.62, 7, 0.08, 0.02);
    });
    w.panel(X.signTex("INFORMATION  案内", { w: 1024, h: 140, bg: "#ffffff", color: "#1a2b52" }), 6, 0.8, 12, 1.9, 6.62, 0, { lit: true });
    /* ★ 2026-09-29d 左：アップデート情報のブース（弧にならべた5面の画面。1面に1つずつ・12秒ごとに次の5件） */
    w.updateBooth(-13, 11, 7);
    w.npcSpots.reception = [[-13, 7.3, 0], [12, 4.6, 0]];
    /* 中央のホログラム柱（パートナーと XEVARION） */
    w.holoColumn(0, -4);
    /* 天井から下がる大きなバナー */
    D.mates.slice(0, 6).forEach((m, i) => {
      const x = -25 + i * 10;
      const c = X.cv(512, 1152), g = c.getContext("2d"); g.fillStyle = m.color; g.fillRect(0, 0, 512, 1152);
      const tex = X.tex(c); w.panel(tex, 3, 6.7, x, 9.6, -16.6, 0, { lit: true });
      const im = new Image(); im.onload = () => { const s = Math.min(500 / im.width, 1100 / im.height); const gr = g.createLinearGradient(0, 0, 0, 1152); gr.addColorStop(0, m.color); gr.addColorStop(1, "#101a36"); g.fillStyle = gr; g.fillRect(0, 0, 512, 1152); g.drawImage(im, 256 - im.width * s / 2, 1152 - im.height * s, im.width * s, im.height * s); tex.needsUpdate = true; };
      im.src = ROOT + m.dir + m.id + ".webp";
    });
    w.buildCafe();
    w.buildStore();
    /* ロビーのソファ */
    [[-8, -12], [8, -12]].forEach(([x, z]) => { w.box("seatBlue", x, 0, z, 4, 0.45, 1.2, { collide: true }); w.box("seatBlue", x, 0.45, z - 0.5, 4, 0.6, 0.25); [-1.3, 0, 1.3].forEach((dx) => w.seats.push({ x: x + dx, z: z + 0.05, yaw: 0, h: 0.47 })); });
  };
  World.prototype.updateBooth = function (cx, cz, R) {
    const w = this, ups = (D.updates || []).slice(0, 24), n = Math.max(1, ups.length), A = [-44, -22, 0, 22, 44].map((d) => d * Math.PI / 180);
    const cols = ["#3a8aff", "#ff4f8f", "#ffb030", "#2fbfb0", "#8e6bff"];
    A.forEach((a, i) => {
      const x = cx + Math.sin(a) * R, z = cz - Math.cos(a) * R, ry = Math.atan2(cx - x, cz - z);
      w.box("black", x, 0, z, 3.1, 0.3, 0.5, { ry }); w.box("chromeB", x, 0.3, z, 0.2, 5.2, 0.2, { ry });
      w.box("black", x - Math.sin(ry) * 0.12, 1.05, z - Math.cos(ry) * 0.12, 3.0, 4.1, 0.16, { ry, collide: true });
      w.screen(2.8, 3.9, 560, x, 3.1, z, ry, (g, W, H, t) => {
        const page = Math.floor(t / 12), u = ups[(page * 5 + i) % n] || {}, c = cols[i % cols.length], k = (t % 12) / 12, fade = Math.min(1, k * 10, (1 - k) * 14);
        const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "#0a1230"); gr.addColorStop(1, "#1a1450"); g.fillStyle = gr; g.fillRect(0, 0, W, H);
        g.fillStyle = c; g.fillRect(0, 0, W, 86); g.globalAlpha = fade;
        g.fillStyle = "#fff"; g.font = "900 34px sans-serif"; g.textAlign = "left"; g.fillText("UPDATE", 26, 56); g.textAlign = "right"; g.font = "800 28px sans-serif"; g.fillText(u.at || "", W - 24, 56); g.textAlign = "left";
        const im = u.img ? this.imgCache(ROOT + u.img) : null; if (im) { const s = Math.min((W - 60) / im.width, 230 / im.height); g.drawImage(im, W / 2 - im.width * s / 2, 108, im.width * s, im.height * s); }
        g.fillStyle = "#fff"; g.font = "900 40px sans-serif"; X.wrap(g, u.t1 || "", W - 50).slice(0, 3).forEach((l, j) => g.fillText(l, 26, 390 + j * 50));
        g.fillStyle = "#c8d4f0"; g.font = "600 26px sans-serif"; const lines = []; String(u.t2 || "").split("／").forEach((p) => X.wrap(g, "・" + p, W - 50).forEach((l) => lines.push(l)));
        lines.slice(0, 11).forEach((l, j) => g.fillText(l, 26, 560 + j * 36));
        g.globalAlpha = 1; g.fillStyle = "rgba(255,255,255,.15)"; g.fillRect(0, H - 8, W, 8); g.fillStyle = c; g.fillRect(0, H - 8, W * k, 8);
      }, { every: 0.25 });
    });
    w.panel(X.signTex("UPDATE INFORMATION  アップデート情報", { w: 1536, h: 170, bg: "#0e1628", color: "#fff", glow: "#7fd8ff" }), 11, 1.2, cx, 6.2, cz - R - 0.4, 0, { lit: true });
    w.box("woodLight", cx, 0, cz - 2.6, 8, 1.1, 1.0, { collide: true }); w.box("black", cx, 1.1, cz - 2.6, 8.2, 0.06, 1.2); w.box("ledBlue", cx, 0.05, cz - 2.08, 8, 0.08, 0.02);
    w.panel(X.signTex("最新のアップデート　ぜんぶ見る → E", { w: 1024, h: 140, bg: "#ffffff", color: "#1a2b52" }), 5.4, 0.62, cx, 0.62, cz - 2.07, 0, { lit: true });
    w.interact(cx, cz - 1.2, 3.6, "アップデート情報をぜんぶ見る（" + ups.length + " 件）", () => ({ updates: true }), "🆕");
  };
  const _imgC = {};
  World.prototype.imgCache = function (src) { let im = _imgC[src]; if (!im) { im = _imgC[src] = new Image(); im.crossOrigin = "anonymous"; im.src = src; } return im.complete && im.naturalWidth ? im : null; };
  World.prototype.holoColumn = function (x, z) {
    const w = this;
    w.box("black", x, 0, z, 6.8, 0.5, 6.8, { collide: true });
    const scr = new X.Screen(1024, 1024);
    const cyl = new T.Mesh(new T.CylinderGeometry(2.8, 2.8, 6, 48, 1, true), new T.MeshBasicMaterial({ map: scr.tex, transparent: true, opacity: 0.92, side: T.DoubleSide, toneMapped: false }));
    cyl.position.set(x, 3.6, z); w.scene.add(cyl);
    (w.walls = w.walls || []).push(cyl); w.colCircle(x, z, 3.9);          /* ★ 2026-09-30 カメラがホログラムの筒の中に入って、画面全体が青いしま（水の中のよう）になっていた */
    const ringM = new T.MeshBasicMaterial({ color: 0x7fe0ff });
    [0.6, 6.6].forEach((y) => { const r = new T.Mesh(new T.TorusGeometry(2.85, 0.06, 8, 64), ringM); r.rotation.x = Math.PI / 2; r.position.set(x, y, z); w.scene.add(r); });
    const orb = new T.Sprite(new T.SpriteMaterial({ map: X.imgTex(ROOT + "brand-xevarion-orb.png"), transparent: true, depthWrite: false }));
    orb.scale.set(3.2, 2.8, 1); orb.position.set(x, 8.6, z); w.scene.add(orb);
    const mates = D.mates, nc = newChars(12);          /* ★ 2026-09-29d 新キャラを回す（なければパートナー） */
    w.screens.push({ scr, every: 0.05, last: -1, draw(g, W, H, t) {
      g.clearRect(0, 0, W, H);
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "rgba(40,140,255,.25)"); gr.addColorStop(1, "rgba(120,60,255,.35)"); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.strokeStyle = "rgba(160,230,255,.25)"; for (let y = (t * 40) % 16; y < H; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      const off = (t * 0.05) % 1;
      if (nc.length) {
        const n = nc.length;
        for (let i = 0; i < n; i++) {
          const im = scr.img(nc[i].img), u = ((i / n + off) % 1) * W, sz = Math.min(W / n * 1.6, H * 0.62);
          if (im) { g.save(); g.beginPath(); g.arc(u, H * 0.55, sz / 2, 0, Math.PI * 2); g.clip(); g.globalAlpha = 0.95; g.drawImage(im, u - sz / 2, H * 0.55 - sz * 0.46, sz, sz); g.restore(); }
          g.globalAlpha = 1; g.strokeStyle = nc[i].color || "#7fe0ff"; g.lineWidth = 6; g.beginPath(); g.arc(u, H * 0.55, sz / 2, 0, Math.PI * 2); g.stroke();
          g.fillStyle = "#fff"; g.font = "900 44px sans-serif"; g.textAlign = "center"; g.fillText(nc[i].name, u, H * 0.55 + sz / 2 + 52);
        }
        g.fillStyle = "#ffd86a"; g.font = "900 60px sans-serif"; g.textAlign = "center";
        for (let k = 0; k < 2; k++) g.fillText("★ NEW CHARACTERS ★", ((0.5 + k * 0.5 - off) % 1) * W, 90);
      } else {
        const n = mates.length;
        for (let i = 0; i < n; i++) {
          const im = scr.img(ROOT + mates[i].dir + mates[i].id + ".webp");
          const u = ((i / n + off) % 1) * W, hh = H * 0.8;
          if (im) { const s = hh / im.height; g.globalAlpha = 0.9; g.drawImage(im, u - im.width * s / 2, H - hh - 20, im.width * s, hh); g.globalAlpha = 1; }
        }
        g.fillStyle = "#fff"; g.font = "900 64px sans-serif"; g.textAlign = "center";
        for (let k = 0; k < 2; k++) g.fillText("XEVARION WORLD CONFERENCE", ((0.5 + k * 0.5 - off) % 1) * W, 90);
      }
    } });
    w.anim.push((dt, t) => { cyl.rotation.y = t * 0.12; orb.position.y = 8.6 + Math.sin(t) * 0.2; });
    w.interact(x, z + 4, 3, nc.length ? "新キャラのホログラムを見る（基調講演ホールで発表中）" : "パートナーのホログラムを見る", () => ({ talkHolo: true }), "✨");
  };
  World.prototype.buildCafe = function () {
    const w = this, x0 = -35, x1 = -19, z0 = -16, z1 = 6;
    w.zone("XEVA CAFÉ", x0, z0, x1, z1, "cafe");
    w.floor("wood", x0, z0, x1, z1, 0.01);
    /* カウンター（L字） */
    w.box("woodDark", -27, 0, -13.5, 12, 1.05, 1.1, { collide: true }); w.box("black", -27, 1.05, -13.5, 12.2, 0.06, 1.3);
    w.box("woodDark", -33.6, 0, -8, 1.1, 1.05, 10, { collide: true });
    w.box("chrome", -29, 1.1, -13.6, 0.9, 0.7, 0.6); w.box("chrome", -25, 1.1, -13.6, 0.5, 0.45, 0.5);       /* エスプレッソマシン */
    /* メニューボード */
    const menu = X.cv(1024, 512), g = menu.getContext("2d");
    g.fillStyle = "#1e2a26"; g.fillRect(0, 0, 1024, 512);
    g.fillStyle = "#f3e9d6"; g.font = "900 70px serif"; g.textAlign = "center"; g.fillText("XEVA CAFÉ", 512, 90);
    g.font = "700 36px sans-serif"; g.textAlign = "left";
    [["マジカル・ラテ", "480"], ["バースト・エスプレッソ", "420"], ["星煌フラペチーノ", "620"], ["パートナー・パンケーキ", "780"], ["XEVA クロワッサン", "360"]].forEach(([n, p], i) => {
      g.fillText(n, 90, 180 + i * 62); g.textAlign = "right"; g.fillText(p + " XEVA", 934, 180 + i * 62); g.textAlign = "left";
    });
    w.panel(X.tex(menu), 7, 3.5, -27, 3.6, -15.8, 0, { lit: true });
    w.box("woodDark", -27, 5.4, -15.9, 7.4, 0.2, 0.3);
    /* テーブル・いす */
    [[-30, -4], [-24, -4], [-30, 2], [-24, 2]].forEach(([x, z]) => {
      const tg = new T.CylinderGeometry(0.7, 0.7, 0.05, 24);
      w.batch.add("woodLight", w.m.woodLight, tg, new T.Matrix4().makeTranslation(x, 0.75, z));
      w.box("steel", x, 0, z, 0.08, 0.75, 0.08, { collide: true });
      [[1.1, 0], [-1.1, 0], [0, 1.1], [0, -1.1]].forEach(([dx, dz]) => { w.box("seat", x + dx, 0.45, z + dz, 0.45, 0.06, 0.45); w.seats.push({ x: x + dx * 1.05, z: z + dz * 1.05, yaw: Math.atan2(-dx, -dz), h: 0.51 }); });
      w.collider(x - 1.2, z - 1.2, x + 1.2, z + 1.2);
    });
    /* ペンダントライト */
    for (let x = -32; x <= -22; x += 3.3) { w.box("steel", x, 4.6, -12, 0.03, 9.4, 0.03); const sh = new T.ConeGeometry(0.35, 0.4, 16, 1, true); w.batch.add("ledGold", w.m.ledGold, sh, new T.Matrix4().makeTranslation(x, 4.5, -12)); }
    w.panel(X.signTex("XEVA CAFÉ", { w: 1024, h: 200, color: "#f6e2b8", glow: "#ffb45c" }), 8, 1.6, -27, 7.5, -15.8, 0);
    w.npcSpots.cafe = [[-27, -14.6, 0]];
    w.interact(-27, -12.2, 2.4, "カフェのメニューを見る", () => ({ menu: "cafe" }), "☕");
  };
  World.prototype.buildStore = function () {
    const w = this, x0 = 19, x1 = 35, z0 = -16, z1 = 6;
    w.zone("XEVARION STORE", x0, z0, x1, z1, "store");
    w.floor("woodLight", x0, z0, x1, z1, 0.01);
    /* 棚（アプリの箱が並ぶ） */
    const apps = D.apps;
    [-12, -6, 0].forEach((z, row) => {
      w.box("white", 27, 0, z, 10, 2.2, 0.9, { collide: true });
      for (let i = 0; i < 8; i++) {
        const a = apps[(row * 8 + i) % apps.length]; if (!a) continue;
        const mesh = w.panel(X.imgTex(ROOT + a.img), 0.9, 0.9, 23 + i * 1.15, 1.55, z + 0.46, 0, { lit: true });
        const back = w.panel(X.imgTex(ROOT + a.img), 0.9, 0.9, 23 + i * 1.15, 1.55, z - 0.46, Math.PI, { lit: true });
      }
    });
    /* ガチャのコーナー（開催中のガチャのバナーを順番に） */
    const gs = liveGachaList();
    const s = w.screen(8, 4.3, 900, 27, 4.2, -15.7, 0, (g, W, H, t) => {
      const gi = Math.floor(t / 4) % Math.max(1, gs.length), gg = gs[gi];
      g.fillStyle = "#0d1430"; g.fillRect(0, 0, W, H);
      const im = gg && s.scr.img(ROOT + gg.banner);
      if (im) g.drawImage(im, 0, 0, W, H);
      g.fillStyle = "rgba(0,0,0,.55)"; g.fillRect(0, H - 60, W, 60);
      g.fillStyle = "#fff"; g.font = "900 34px sans-serif"; g.textAlign = "left"; g.fillText("開催中のガチャ  " + (gg ? gg.nm : ""), 20, H - 20);
    }, { every: 0.5 });
    [23, 31].forEach((x) => { const cap = new T.SphereGeometry(0.55, 20, 14); w.batch.add("glass", w.m.glass, cap, new T.Matrix4().makeTranslation(x, 1.6, -14.4)); w.box("ledPink", x, 0, -14.4, 1, 1.1, 1, { collide: true }); });
    w.panel(X.signTex("XEVARION STORE", { w: 1024, h: 200, color: "#ffffff", glow: "#ff7ac8" }), 8, 1.6, 27, 7.5, -15.8, 0);
    w.interact(27, -13, 3, "ガチャを回しにいく", () => ({ open: "gacha.html" }), "🎰");
    w.npcSpots.store = [[27, -11.4, Math.PI]];
  };

  /* ── 基調講演ホール ── */
  World.prototype.buildKeynote = function () {
    const w = this;
    w.zone("基調講演ホール（KEYNOTE）", -26, -72, 26, -18, "keynote");
    /* 床：なだらかに下る（すり鉢） */
    const g = new T.PlaneGeometry(52, 54, 26, 54); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const z = p.getZ(i) - 45; p.setY(i, keyH(0, z)); }
    g.computeVertexNormals();
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 13, uv.getY(i) * 13.5);
    w.batch.add("carpetNavy", w.m.carpetNavy, g, new T.Matrix4().makeTranslation(0, 0, -45));
    /* 壁（木の音響パネル）と天井 */
    w.wall("woodDark", -26, -72, -26, -18, 20, 0.6, [], { y: -4 });
    w.wall("woodDark", 26, -72, 26, -18, 20, 0.6, [], { y: -4 });
    w.box("black", 0, -4, -72.3, 52, 21, 0.6, { collide: true });
    w.box("black", 0, 15.5, -45, 52, 0.4, 54);
    /* ロビー側の壁の内張り（天井まで・すき間から空が見えないように） */
    [-16, 16].forEach((x) => w.box("woodDark", x, -0.2, -18.6, 20, 16, 0.3, { collide: false }));
    w.box("woodDark", 0, 5, -18.6, 12.2, 11, 0.3, { collide: false });
    for (let z = -66; z <= -22; z += 4) [-25.6, 25.6].forEach((x) => w.box("ledBlue", x, 1, z, 0.05, 9, 0.08));
    /* 天井の照明のレール */
    for (let z = -64; z <= -24; z += 8) { w.box("steel", 0, 13.5, z, 48, 0.25, 0.25); for (let x = -20; x <= 20; x += 5) w.box("lightPanel", x, 13.2, z, 0.4, 0.3, 0.4); }
    /* ステージ */
    const sy = -1.7;
    w.box("gDark", 0, -4, -64, 40, 4 + sy, 12, { collide: false });          /* ★ 2026-09-29d 暗いステージ（前は白く光る床に見えて、客席が埋もれて見えた） */
    w.box("ledCyan", 0, sy - 0.05, -57.95, 40, 0.06, 0.05);
    w.stageTop = sy;
    /* 大画面 */
    const slides = keynoteSlides();
    w.keynote = { slides, idx: 0, t0: 0 };
    const scr = w.screen(28, 15.75, 1600, 0, 6.6, -71.8, 0, (gg, W, H, t) => drawKeynote(gg, W, H, t, w.keynote, scr), { every: 0.1 });
    /* 左右の小さな画面（話している人） */
    [-19, 19].forEach((x, i) => w.screen(8, 4.5, 640, x, 7.5, -71.6, 0, (gg, W, H, t) => {
      const sl = w.keynote.slides[w.keynote.idx] || {};
      gg.fillStyle = "#0a0f22"; gg.fillRect(0, 0, W, H);
      const m = w.keynote.presenter;
      if (i === 0) { const gr = gg.createLinearGradient(0, 0, W, H); gr.addColorStop(0, "#2a1f5a"); gr.addColorStop(1, "#0a2a5a"); gg.fillStyle = gr; gg.fillRect(0, 0, W, H); gg.fillStyle = "#7fd8ff"; gg.font = "900 34px sans-serif"; gg.textAlign = "center"; gg.fillText("PRESENTER", W / 2, 80); gg.fillStyle = "#fff"; gg.font = "900 72px sans-serif"; gg.fillText(m ? m.name : "—", W / 2, 180); gg.font = "700 26px sans-serif"; gg.fillStyle = "#c8d4f0"; gg.fillText(m ? (m.role || "") : "", W / 2, 230); gg.textAlign = "left"; }
      if (i === 1) { gg.fillStyle = "#7fd8ff"; gg.font = "900 40px sans-serif"; gg.textAlign = "center"; gg.fillText("LIVE", W / 2, 70); gg.fillStyle = "#fff"; gg.font = "700 28px sans-serif"; X.wrap(gg, sl.t1 || "", W - 60).slice(0, 4).forEach((l, k) => gg.fillText(l, W / 2, 140 + k * 40)); gg.textAlign = "left"; }
    }, { every: 0.3 }));
    /* 客席（1つの形をたくさん並べる） */
    const seatG = seatGeometry();
    const pos = [];
    for (let z = -28; z >= -53; z -= 1.3) {
      const y = keyH(0, z);
      for (let x = -22; x <= -3.2; x += 0.72) pos.push([x, y, z]);
      for (let x = 3.2; x <= 22; x += 0.72) pos.push([x, y, z]);
      w.collider(-22.4, z - 0.45, -2.9, z + 0.25); w.collider(2.9, z - 0.45, 22.4, z + 0.25);
    }
    w.seatKeynote = pos;
    pos.forEach((q) => w.seats.push({ x: q[0], z: q[2] + 0.04, yaw: Math.PI, h: q[1] + 0.5 }));
    const inst = new T.InstancedMesh(seatG, w.m.seat, pos.length);
    const mm = new T.Matrix4();
    pos.forEach((q, i) => { mm.makeTranslation(q[0], q[1], q[2]); inst.setMatrixAt(i, mm); });
    inst.castShadow = false; inst.receiveShadow = true; w.scene.add(inst);
    /* ステージの演台 */
    w.box("black", 7, sy, -61, 1.2, 1.15, 0.7); w.panel(X.imgTex(ROOT + "brand-xevarion-orb.png"), 0.9, 0.78, 7, sy + 0.7, -60.62, 0, { transparent: true });
    w.npcSpots.keynote = [[0, -61.5, 0]];
    w.interact(0, -26, 3.5, "基調講演のスライドを読む", () => ({ slides: "keynote" }), "📺");
    w.interact(0, -55, 3.5, "基調講演のスライドを読む", () => ({ slides: "keynote" }), "📺");
    /* ステージに上がる階段（当たり判定なし・床の高さで上がる） */
    w.box("gDark", 0, -3.2, -57.2, 6, 0.6, 1.6);
    /* ステージ前の立ち入りどめ */
    w.collider(-20, -58.2, -3.5, -57.6); w.collider(3.5, -58.2, 20, -57.6);
    w.collider(-26, -72, -20, -57.6); w.collider(20, -72, 26, -57.6);
  };
  function keyH(x, z) {
    if (z > -24) return 0;
    if (z > -54) return -3 * (-24 - z) / 30;
    if (z > -57.6) return -3;
    if (z > -58.4 && Math.abs(x) < 3.2) return -3 + (-57.6 - z) / 0.8 * 1.3;
    return -1.7;
  }
  function seatGeometry() {
    const a = new T.BoxGeometry(0.56, 0.1, 0.5); a.translate(0, 0.45, 0);
    const b = new T.BoxGeometry(0.56, 0.62, 0.08); b.translate(0, 0.78, 0.25); b.rotateX(-0.1);
    const c = new T.BoxGeometry(0.06, 0.45, 0.4); c.translate(0.3, 0.22, 0);
    return mergeGeos([a, b, c]);
  }

  /* ── 講演トラック（西棟） ── */
  World.prototype.buildTracks = function () {
    const w = this;
    w.zone("セッション廊下", -72, -5, -36, 5, "corridor");
    w.floor("carpetGray", -72, -5, -36, 5, 0.005);
    w.box("white", -54, 6, 0, 36, 0.3, 10);
    for (let x = -68; x <= -40; x += 4) w.box("lightPanel", x, 5.9, 0, 2.2, 0.05, 1);
    w.wall("white", -72, -5, -36, -5, 6, 0.4, [[-55, -51]], { doorH: 3.4 });
    w.wall("white", -72, 5, -36, 5, 6, 0.4, [[-55, -51]], { doorH: 3.4 });
    const tracks = trackSessions();
    /* doorSide＝ドアのある側（S＝+z 側・N＝−z 側・E＝+x 側）。スクリーンはその反対 */
    w.room("TRACK A", "ゲーム", "carpetRed", -66, -34, -40, -5, "S", tracks.A, "#ff6f7a");
    w.room("TRACK B", "学習・AI", "carpetTeal", -66, 5, -40, 34, "N", tracks.B, "#5fe0c8");
    w.room("TRACK C", "クリエイティブ・ツール", "carpetPlum", -98, -15, -72, 15, "E", tracks.C, "#b98cff");
    /* 廊下の案内板（いまのセッション） */
    const s = w.screen(4, 2.25, 700, -44, 2.4, -4.7, 0, (g, W, H, t) => {
      g.fillStyle = "#0c1224"; g.fillRect(0, 0, W, H);
      g.fillStyle = "#fff"; g.font = "900 38px sans-serif"; g.fillText("SESSIONS  いまの講演", 24, 56);
      ["A", "B", "C"].forEach((k, i) => {
        const tr = tracks[k], ss = tr.list[Math.floor(t / 20) % Math.max(1, tr.list.length)] || {};
        g.fillStyle = tr.color; g.fillRect(24, 90 + i * 100, 90, 70); g.fillStyle = "#0c1224"; g.font = "900 44px sans-serif"; g.fillText(k, 52, 142 + i * 100);
        g.fillStyle = "#fff"; g.font = "700 28px sans-serif"; g.fillText((ss.title || "").slice(0, 22), 130, 118 + i * 100);
        g.fillStyle = "#9fb3d8"; g.font = "600 22px sans-serif"; g.fillText(tr.label, 130, 150 + i * 100);
      });
    }, { every: 1 });
  };
  World.prototype.room = function (code, label, carpet, x0, z0, x1, z1, doorSide, track, color) {
    const w = this;
    w.zone(code + "（" + label + "）", x0, z0, x1, z1, "track");
    w.floor(carpet, x0, z0, x1, z1, 0.005);
    const H = 8, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    w.box("white", cx, H, cz, x1 - x0, 0.3, z1 - z0);
    for (let x = x0 + 3; x < x1 - 2; x += 5) for (let z = z0 + 3; z < z1 - 2; z += 5) w.box("lightPanel", x, H - 0.05, z, 1.4, 0.05, 1.4);
    /* 壁（ドアのある側は廊下の壁を使う） */
    /* 壁（ドアのある側は廊下の壁を使う。C は x1 の壁にドア） */
    if (doorSide !== "N") w.wall("white", x0, z0, x1, z0, H, 0.4, [], {});
    if (doorSide !== "S") w.wall("white", x0, z1, x1, z1, H, 0.4, [], {});
    w.wall("white", x0, z0, x0, z1, H, 0.4, [], {});
    w.wall("white", x1, z0, x1, z1, H, 0.4, doorSide === "E" ? [[-2, 2]] : [], { doorH: 3.4 });
    /* 画面はドアの反対側 */
    let sx, sz, ry, facing;
    if (doorSide === "S") { sx = cx; sz = z0 + 0.4; ry = 0; facing = [0, 1]; }
    else if (doorSide === "N") { sx = cx; sz = z1 - 0.4; ry = Math.PI; facing = [0, -1]; }
    else { sx = x0 + 0.4; sz = cz; ry = Math.PI / 2; facing = [1, 0]; }
    const st = { idx: 0, track, color, code, label };
    const s = w.screen(10, 5.6, 1280, sx, 3.8, sz, ry, (g, W, H2, t) => drawSession(g, W, H2, t, st, s), { every: 0.2 });
    s._code = code;
    track.state = st;
    /* 客席 */
    const seatG = seatGeometry(); const pos = [];
    for (let r = 0; r < 7; r++) for (let c = -6; c <= 6; c++) {
      if (c === 0) continue;
      const d = 5 + r * 1.3, lat = c * 0.72;
      const px = sx + facing[0] * d + (facing[0] === 0 ? lat : 0), pz = sz + facing[1] * d + (facing[1] === 0 ? lat : 0);
      pos.push([px, pz]);
    }
    w.seatTrack = (w.seatTrack || []).concat(pos.map(([px, pz]) => [px, pz, sx, sz]));
    pos.forEach(([px, pz]) => w.seats.push({ x: px, z: pz, yaw: Math.atan2(sx - px, sz - pz), h: 0.5 }));
    const inst = new T.InstancedMesh(seatG, w.m.seatBlue, pos.length); const mm = new T.Matrix4(); const q = new T.Quaternion().setFromEuler(new T.Euler(0, ry, 0));   /* 背もたれが画面の反対側 */
    pos.forEach(([px, pz], i) => { mm.compose(new T.Vector3(px, 0, pz), q, new T.Vector3(1, 1, 1)); inst.setMatrixAt(i, mm); });
    inst.receiveShadow = true; w.scene.add(inst);
    for (let r = 0; r < 7; r++) {
      const d = 5 + r * 1.3;
      [[-4.6, -0.4], [0.4, 4.6]].forEach(([a, b]) => {
        if (facing[0] === 0) w.collider(sx + a, sz + facing[1] * d - 0.3, sx + b, sz + facing[1] * d + 0.3);
        else w.collider(sx + facing[0] * d - 0.3, sz + a, sx + facing[0] * d + 0.3, sz + b);
      });
    }
    /* 演台と話す人の場所 */
    const px = sx + facing[0] * 2.4 + (facing[0] === 0 ? 3.8 : 0), pz = sz + facing[1] * 2.4 + (facing[1] !== 0 ? 0 : 3.8);
    w.box("black", px, 0, pz, 0.9, 1.1, 0.6, { collide: true });
    w.npcSpots[code] = [[sx + facing[0] * 2.6 - (facing[0] === 0 ? 2.5 : 0), sz + facing[1] * 2.6 - (facing[1] !== 0 ? 0 : 2.5), Math.atan2(facing[0], facing[1])]];
    /* 入口の看板 */
    const signTex = X.signTex(code + String.fromCharCode(10) + label, { w: 512, h: 256, bg: "#101830", color: color, glow: color });
    if (doorSide === "S") w.panel(signTex, 2.6, 1.3, -53, 4.6, -4.76, 0);
    if (doorSide === "N") w.panel(signTex, 2.6, 1.3, -53, 4.6, 4.76, Math.PI);
    if (doorSide === "E") w.panel(signTex, 2.6, 1.3, -71.76, 4.6, 0, Math.PI / 2);
    w.interact(sx + facing[0] * 9, sz + facing[1] * 9, 4.5, code + " のスライドを読む", () => ({ slides: code }), "📖");
  };

  /* ── 展示ホール（東棟） ── */
  World.prototype.buildExpo = function () {
    const w = this, x0 = 36, x1 = 104, z0 = -48, z1 = 48, H = 15;
    w.zone("展示ホール（EXPO）", x0, z0, x1, z1, "expo");
    w.floor("expoFloor", x0, z0, x1, z1, 0.004);
    w.box("steel", (x0 + x1) / 2, H, 0, x1 - x0, 0.4, z1 - z0);
    for (let z = z0 + 6; z < z1; z += 8) { w.box("steel", (x0 + x1) / 2, H - 1.2, z, x1 - x0, 0.35, 0.35); for (let x = x0 + 6; x < x1; x += 7) w.box("lightPanel", x, H - 1.5, z, 1.8, 0.1, 1.8); }
    for (let x = x0 + 6; x < x1; x += 14) w.box("steel", x, H - 1.2, 0, 0.35, 0.35, z1 - z0);
    w.wall("concrete", x0 + 1, z0, x1, z0, H, 0.6); w.wall("concrete", x0 + 1, z1, x1, z1, H, 0.6);
    w.wall("concrete", x1, z0, x1, z1, H, 0.6);
    w.wall("concrete", x0, z0, x0, -18, H, 0.6); w.wall("concrete", x0, 12, x0, z1, H, 0.6);   /* 西の壁（ロビーとつながる所以外） */
    w.panel(X.signTex("EXPO HALL — XEVARION APPS", { w: 2048, h: 220, bg: "#0c1224", color: "#fff", glow: "#7cffb8" }), 30, 3.2, (x0 + x1) / 2, 11, z1 - 0.35, Math.PI);
    w.panel(X.signTex("EXPO HALL — XEVARION APPS", { w: 2048, h: 220, bg: "#0c1224", color: "#fff", glow: "#7cffb8" }), 30, 3.2, (x0 + x1) / 2, 11, z0 + 0.35, 0);
    /* ブース（アプリごと） */
    const cols = [48, 60, 72, 84, 96], rows = [-38, -24, -10, 10, 24, 38];
    const slots = []; rows.forEach((z) => cols.forEach((x) => slots.push([x, z])));
    const apps = D.apps.slice();
    const tones = { red: "#e8515f", blue: "#4b8bff", violet: "#8e6bff", teal: "#2fbfb0", pink: "#ff6fa8", gold: "#e6a824" };
    apps.forEach((a, i) => { if (slots[i]) w.booth(a, slots[i][0], slots[i][1], tones[a.tone] || "#4b8bff", slots[i][1] < 0 ? 1 : -1); });
    /* 残りの枠：ガチャのパビリオン */
    const gi = Math.min(apps.length, slots.length - 1);
    if (slots[gi]) w.gachaPavilion(slots[gi][0], slots[gi][1], slots[gi][1] < 0 ? 1 : -1);
    w.npcSpots.expo = [[42, -2, Math.PI / 2], [70, 0, 0]];
    w.expoPath = [[44, 0], [66, 0], [100, 0], [100, -17], [44, -17], [44, 17], [100, 17], [66, 0]];
  };
  World.prototype.booth = function (a, x, z, color, face) {
    const w = this;
    const key = "pad" + color;
    if (!w.m[key]) w.m[key] = new T.MeshStandardMaterial({ color: new T.Color(color).multiplyScalar(0.55), roughness: 0.9 });
    const bz = z - face * 3.2;                                                             /* 奥の壁の位置 */
    const pad = new T.BoxGeometry(10, 0.08, 7.6); w.batch.add(key, w.m[key], pad, new T.Matrix4().makeTranslation(x, 0.04, z));
    w.box("white", x, 0, bz, 10, 4.6, 0.3, { collide: true, wall: true });
    w.box("white", x - 4.85, 0, z - face * 1.6, 0.3, 4.6, 3.2, { collide: true });
    const ry = face > 0 ? 0 : Math.PI;
    const front = bz + face * 0.17;
    /* 大きな絵（アプリのアイコン） */
    w.panel(X.imgTex(ROOT + a.img), 3.6, 3.6, x - 2.4, 2.5, front, ry, { lit: false });
    /* 名前と説明 */
    const c = X.cv(1024, 640), g = c.getContext("2d");
    g.fillStyle = "#ffffff"; g.fillRect(0, 0, 1024, 640);
    g.fillStyle = color; g.fillRect(0, 0, 1024, 150);
    g.fillStyle = "#fff"; g.font = "900 84px sans-serif"; g.fillText(a.full || a.name, 36, 106);
    g.fillStyle = "#1a2544"; g.font = "800 44px sans-serif"; g.fillText(a.sub || "", 36, 220);
    g.font = "500 34px sans-serif"; g.fillStyle = "#3d4a6e";
    X.wrap(g, a.desc || "", 950).slice(0, 8).forEach((l, i) => g.fillText(l, 36, 290 + i * 46));
    w.panel(X.tex(c), 4.6, 2.9, x + 2.1, 2.55, front, ry, { lit: true });
    /* 上の光る看板 */
    w.panel(X.signTex(a.name, { w: 1024, h: 180, bg: color, color: "#fff" }), 6, 1.05, x, 5.3, bz, ry);
    w.box("steel", x, 4.6, bz, 6.2, 0.2, 0.3);
    /* カウンター */
    w.box("white", x + 1.2, 0, z + face * 1.6, 3, 1.05, 0.8, { collide: true });
    w.box(key === "" ? "black" : "black", x + 1.2, 1.05, z + face * 1.6, 3.1, 0.05, 0.9);
    w.interact(x, z + face * 2.6, 2.8, a.name + " をひらく", () => ({ open: a.href, app: a }), "▶");
  };
  World.prototype.gachaPavilion = function (x, z, face) {
    const w = this;
    const bz = z - face * 3.2;
    w.box("black", x, 0, bz, 10, 5.2, 0.3, { collide: true, wall: true });
    const gs = liveGachaList();
    const ry = face > 0 ? 0 : Math.PI;
    const s = w.screen(9, 4.83, 1000, x, 2.9, bz + face * 0.25, ry, (g, W, H, t) => {
      const gg = gs[Math.floor(t / 3.5) % Math.max(1, gs.length)];
      g.fillStyle = "#0d1430"; g.fillRect(0, 0, W, H);
      const im = gg && s.scr.img(ROOT + gg.banner); if (im) g.drawImage(im, 0, 0, W, H);
    }, { every: 0.5 });
    w.panel(X.signTex("GACHA PAVILION", { w: 1024, h: 180, grad: ["#ff5fa2", "#ffb04a"], color: "#fff" }), 7, 1.2, x, 6.0, bz, ry);
    w.interact(x, z + face * 2, 3, "ガチャを回しにいく", () => ({ open: "gacha.html" }), "🎰");
  };

  /* ══════════════ スライドの中身 ══════════════ */
  function liveGachaList() {
    const G = window.XH_GACHA_DEFS; if (!G) return [];
    const today = new Date().toLocaleDateString("sv-SE"), day = new Date().getDate(), out = [];
    const add = (s, n) => { const d = new Date(s + "T00:00:00"); d.setDate(d.getDate() + n); return d.toLocaleDateString("sv-SE"); };
    (G.fests || []).forEach((f) => {
      if (!f.banner) return;
      if (f.openAt && Date.now() < Date.parse(f.openAt)) return;
      if (f.monthly && !(day >= f.monthly[0] && day <= f.monthly[1])) return;
      const timed = !f.monthly && !f.lux && !f.perm && f.since;
      if (timed && today >= (f.until ? add(f.until, 1) : add(f.since, G.fesDays || 20))) return;
      out.push({ banner: f.banner, nm: f.nm });
    });
    out.push({ banner: "MagiBurst/img/bn_premium_s.webp", nm: "PREMIUM SELECT" });
    return out;
  }
  /* ★ 2026-09-29d 新キャラ（mb-newchars.js → expo-data.js の newchars）。登場日が来たものだけ */
  function newChars(n) {
    const now = Date.now();
    return (D.newchars || []).filter((c) => { if (!c.since) return true; const t = Date.parse(c.since.length > 10 ? c.since : c.since + "T00:00:00"); return !(t > now); }).slice(0, n || 16);
  }
  function keynoteSlides() {
    const nc = newChars(16);
    if (nc.length) {
      const out = [{ kind: "title", t1: "NEW CHARACTERS", t2: "新しい仲間たちを紹介します！", sub: "XEVARION WORLD CONFERENCE 2026 — 新キャラ " + nc.length + " 人", say: "ようこそ！今日は、新しく仲間になったキャラクターたちを紹介します！" }];
      nc.forEach((c, i) => out.push({ kind: "chara", t1: c.name, t2: c.catch, where: c.where, since: c.since, img: c.img, color: c.color, n: i + 1, say: c.name + "が登場！「" + c.catch + "」" + (c.where ? "　" + c.where + "で会えます。" : "") }));
      out.push({ kind: "end", t1: "SEE YOU IN MagiBurst", t2: "アップデート情報は、ロビー左の「UPDATE INFORMATION」ブースで", say: "紹介は以上です！アップデート情報は、ロビーの左のブースで見られますよ。" });
      return out;
    }
    const r = D.release || {}, out = [];
    out.push({ kind: "title", t1: "XEVARION KEYNOTE", t2: r.title || "", sub: (r.date || "") + "  Version " + (r.version || ""), say: "ようこそ、XEVARION ワールドカンファレンスへ！今日の発表は「" + (r.title || "最新アップデート") + "」です。" });
    (r.notes || []).forEach((n, i) => out.push({ kind: "note", t1: "WHAT'S NEW  " + (i + 1), t2: n, say: n }));
    (D.updates || []).slice(0, 10).forEach((u) => out.push({ kind: "update", t1: u.t1, t2: u.t2, img: u.img, date: u.at, href: u.href, say: u.t1 + "。" + (u.t2 || "").split("／")[0] }));
    out.push({ kind: "end", t1: "THANK YOU", t2: "展示ホールで、すべてのアプリを体験できます", say: "発表は以上です。ぜひ展示ホールで体験してみてくださいね！" });
    return out;
  }
  function drawKeynote(g, W, H, t, K, sobj) {
    const dur = 9, n = K.slides.length;
    const idx = ((Math.floor(Math.max(0, t) / dur) % n) + n) % n;
    if (idx !== K.idx) { K.idx = idx; K.changed = true; }
    const sl = K.slides[idx], k = (t % dur) / dur;
    const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, "#081230"); gr.addColorStop(0.6, "#12245a"); gr.addColorStop(1, "#2a1450"); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    /* 光の帯 */
    g.globalAlpha = 0.18; for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? "#6fd0ff" : "#b58cff"; g.beginPath(); const x = ((t * 40 + i * 300) % (W + 600)) - 300; g.moveTo(x, 0); g.lineTo(x + 140, 0); g.lineTo(x - 260, H); g.lineTo(x - 400, H); g.fill(); } g.globalAlpha = 1;
    const fade = Math.min(1, k * 8, (1 - k) * 10);
    g.globalAlpha = fade;
    g.fillStyle = "#7fd8ff"; g.font = "900 34px sans-serif"; g.textAlign = "left"; g.fillText("XEVARION WORLD CONFERENCE 2026", 60, 70);
    g.fillStyle = "rgba(255,255,255,.5)"; g.textAlign = "right"; g.font = "700 28px sans-serif"; g.fillText((idx + 1) + " / " + n, W - 60, 70); g.textAlign = "left";
    if (sl.kind === "title" || sl.kind === "end") {
      g.textAlign = "center"; g.fillStyle = "#fff"; g.font = "900 120px sans-serif"; g.fillText(sl.t1, W / 2, H * 0.42);
      g.font = "800 54px sans-serif"; g.fillStyle = "#ffe7a8"; X.wrap(g, sl.t2, W - 240).slice(0, 2).forEach((l, i) => g.fillText(l, W / 2, H * 0.58 + i * 66));
      if (sl.sub) { g.font = "600 34px sans-serif"; g.fillStyle = "#9fb3d8"; g.fillText(sl.sub, W / 2, H * 0.78); }
      g.textAlign = "left";
    } else if (sl.kind === "chara") {
      /* 新キャラ：丸い光の中に絵・右に名前とひとこと・登場するガチャ */
      const col = sl.color || "#7fd8ff", cx = W * 0.29, cy = H * 0.56, R = H * 0.4;
      const rg = g.createRadialGradient(cx, cy, R * 0.3, cx, cy, R * 1.25); rg.addColorStop(0, col + "aa"); rg.addColorStop(1, col + "00"); g.fillStyle = rg; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2 + t * 0.4; g.strokeStyle = col + "55"; g.lineWidth = 6; g.beginPath(); g.moveTo(cx + Math.cos(a) * R * 1.08, cy + Math.sin(a) * R * 1.08); g.lineTo(cx + Math.cos(a) * R * 1.3, cy + Math.sin(a) * R * 1.3); g.stroke(); }
      const im = sobj.scr.img(sl.img);
      g.save(); g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.clip(); g.fillStyle = "#101a36"; g.fillRect(cx - R, cy - R, R * 2, R * 2);
      if (im) { const s2 = Math.max(R * 2 / im.width, R * 2 / im.height) * (1.02 + 0.03 * Math.min(1, k * 3)); g.drawImage(im, cx - im.width * s2 / 2, cy - im.height * s2 * 0.46, im.width * s2, im.height * s2); }
      g.restore(); g.strokeStyle = col; g.lineWidth = 12; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke(); g.strokeStyle = "#fff"; g.lineWidth = 3; g.stroke();
      const tx = W * 0.56;
      g.fillStyle = col; g.font = "900 44px sans-serif"; g.fillText("NEW CHARACTER  #" + sl.n, tx, H * 0.25);
      g.fillStyle = "#fff"; g.font = "900 160px sans-serif"; g.fillText(sl.t1, tx, H * 0.46);
      g.fillStyle = "#ffe7a8"; g.font = "800 50px sans-serif"; X.wrap(g, "「" + (sl.t2 || "") + "」", W - tx - 50).slice(0, 2).forEach((l, i) => g.fillText(l, tx, H * 0.6 + i * 64));
      if (sl.where) { g.font = "900 40px sans-serif"; const tw2 = g.measureText("登場：" + sl.where).width + 60; g.fillStyle = col; g.beginPath(); g.roundRect ? g.roundRect(tx, H * 0.76, tw2, 64, 32) : g.rect(tx, H * 0.76, tw2, 64); g.fill(); g.fillStyle = "#fff"; g.fillText("登場：" + sl.where, tx + 30, H * 0.76 + 46); }
      if (sl.since) { g.fillStyle = "rgba(255,255,255,.7)"; g.font = "700 32px sans-serif"; g.fillText(sl.since.slice(0, 10) + " から", tx, H * 0.9); }
    } else {
      const hasImg = !!sl.img, tw = hasImg ? W * 0.56 : W - 120;
      g.fillStyle = "#ffc85a"; g.font = "900 40px sans-serif"; g.fillText(sl.kind === "update" ? "UPDATE  " + (sl.date || "") : sl.t1, 60, 170);
      g.fillStyle = "#fff"; g.font = "900 70px sans-serif";
      const title = sl.kind === "update" ? sl.t1 : sl.t2;
      X.wrap(g, title, tw).slice(0, 3).forEach((l, i) => g.fillText(l, 60, 270 + i * 84));
      if (sl.kind === "update") {
        g.fillStyle = "#d4ddf2"; g.font = "600 38px sans-serif";
        X.wrap(g, (sl.t2 || "").replace(/／/g, "\n・"), tw).slice(0, 9).forEach((l, i) => g.fillText(i === 0 ? "・" + l : l, 60, 540 + i * 50));
      }
      if (hasImg) { const im = sobj.scr.img(ROOT + sl.img); if (im) { const s = Math.min(W * 0.34 / im.width, H * 0.62 / im.height); g.drawImage(im, W - 60 - im.width * s, H * 0.2, im.width * s, im.height * s); } }
    }
    /* 進みぐあい */
    g.globalAlpha = 1; g.fillStyle = "rgba(255,255,255,.15)"; g.fillRect(0, H - 8, W, 8); g.fillStyle = "#7fd8ff"; g.fillRect(0, H - 8, W * ((idx + k) / n), 8);
  }
  function trackSessions() {
    const T3 = { A: { label: "ゲーム", color: "#ff6f7a", list: [] }, B: { label: "学習・AI", color: "#5fe0c8", list: [] }, C: { label: "クリエイティブ・ツール", color: "#b98cff", list: [] } };
    const reA = /MagiBurst|MagiBattle|ガチャ|FES|フェス|祭|Diamond|Boccia|Chain|Arena|Dominion|Rail|Shift|Jackpot|Lotto|Manor|Empire|Craft|キャラ|クエスト/i;
    const reB = /MagiLex|XEVYNAR|学習|Focus|単語|物理|化学|数学|古文|問題/i;
    (D.news || []).forEach((n) => {
      const s = { title: n.title, text: n.text, date: n.date };
      const txt = n.title + n.text;
      if (reB.test(n.title)) T3.B.list.push(s); else if (reA.test(n.title)) T3.A.list.push(s); else T3.C.list.push(s);
    });
    (D.events || []).slice(0, 8).forEach((e) => T3.A.list.push({ title: e.t1, text: e.t2, date: e.from || "", img: e.img }));
    ["A", "B", "C"].forEach((k) => { if (!T3[k].list.length) T3[k].list.push({ title: "準備中", text: "まもなく始まります", date: "" }); T3[k].list = T3[k].list.slice(0, 18); });
    return T3;
  }
  function drawSession(g, W, H, t, st, sobj) {
    const tr = st.track, n = tr.list.length, dur = 12;
    const idx = ((Math.floor(Math.max(0, t) / dur) % n) + n) % n; st.idx = idx;
    const s = tr.list[idx], k = (t % dur) / dur;
    g.fillStyle = "#0b1022"; g.fillRect(0, 0, W, H);
    g.fillStyle = st.color; g.fillRect(0, 0, 14, H);
    g.globalAlpha = Math.min(1, k * 8, (1 - k) * 10);
    g.fillStyle = st.color; g.font = "900 34px sans-serif"; g.fillText(st.code + "  " + st.label, 50, 64);
    g.fillStyle = "rgba(255,255,255,.5)"; g.font = "700 26px sans-serif"; g.textAlign = "right"; g.fillText((s.date || "") + "   " + (idx + 1) + "/" + n, W - 40, 64); g.textAlign = "left";
    g.fillStyle = "#fff"; g.font = "900 54px sans-serif";
    const tl = X.wrap(g, s.title || "", W - 110).slice(0, 2); tl.forEach((l, i) => g.fillText(l, 50, 150 + i * 64));
    g.fillStyle = "#cdd6ee"; g.font = "500 30px sans-serif";
    X.wrap(g, s.text || "", W - 110).slice(0, 12).forEach((l, i) => g.fillText(l, 50, 170 + tl.length * 64 + 20 + i * 40));
    g.globalAlpha = 1;
    g.fillStyle = "rgba(255,255,255,.12)"; g.fillRect(0, H - 6, W, 6); g.fillStyle = st.color; g.fillRect(0, H - 6, W * k, 6);
  }

  /* ══════════════ 床の高さ・当たり判定 ══════════════ */
  /* ★★ 2026-09-29c yNow（いまの高さ）を渡すと、段のある床（lv：高架のホームなど）と坂（ramp：駅の階段）が効く。
     下を歩いている人（高さが遠い）には効かない＝ホームの下は地面のまま。lastLv に「いま立っている段」 */
  World.prototype.heightAt = function (x, z, yNow) {
    if (yNow != null) this.lastLv = null;
    if (x > -26 && x < 26 && z < -18 && z > -72) return keyH(x, z);
    if (this.heightExtra) for (const q of this.heightExtra) {
      if (q.ramp || q.lv) {
        if (yNow == null) continue;
        if (q._r == null) q._r = Math.hypot(q.hw, q.hl) + 0.5;
        const dx = x - q.cx, dz = z - q.cz; if (Math.abs(dx) > q._r || Math.abs(dz) > q._r) continue;
        const a = dx * Math.cos(q.ang) - dz * Math.sin(q.ang), b = dx * Math.sin(q.ang) + dz * Math.cos(q.ang);
        if (Math.abs(a) >= q.hw || Math.abs(b) >= q.hl) continue;
        const h = q.ramp ? q.y0 + (q.y1 - q.y0) * (b + q.hl) / (2 * q.hl) : q.y;
        if (Math.abs(yNow - h) < 2.6) { this.lastLv = q; return h; }
        continue;
      }
      if (q.rake) { const dx = x - q.cx, dz = z - q.cz, d = Math.hypot(dx, dz); if (d >= q.r0 && d < q.r1) { const a = Math.atan2(dz, dx); let gap = false; if (q.gaps) for (const g of q.gaps) { if (Math.abs(Math.atan2(Math.sin(a - g[0]), Math.cos(a - g[0]))) < g[1]) { gap = true; break; } } if (!gap) return q.y0 + Math.min(q.n - 1, Math.floor((d - q.r0) / q.step)) * q.rise; } continue; } if (q.tstep) { const dx = x - q.cx, dz = z - q.cz, a = dx * Math.cos(q.ang) - dz * Math.sin(q.ang), b = dx * Math.sin(q.ang) + dz * Math.cos(q.ang); if (Math.abs(a) < q.hw && b >= q.b0) { if (b < q.bA) return Math.floor((b - q.b0) / 1.25) * q.rise; if (b < q.bS) return q.top; const i = Math.floor((b - q.bS) / q.dD); if (i < q.nD) return q.top - (i + 1) * q.top / q.nD; } continue; } if (q.arch) { const dx = x - q.cx, dz = z - q.cz, a = dx * Math.cos(q.ang) - dz * Math.sin(q.ang), b = dx * Math.sin(q.ang) + dz * Math.cos(q.ang); if (Math.abs(a) < q.hw && Math.abs(b) < q.hl) return q.h * Math.sin(Math.PI * (b + q.hl) / (2 * q.hl)) + 0.14; continue; } if (q.ring) { const dx = x - q.cx, dz = z - q.cz, d = Math.hypot(dx, dz); if (d >= q.r0 && d < q.r1) { let a = Math.atan2(dz, dx) - q.a0; a = ((a % 6.2832) + 6.2832) % 6.2832; if (a <= q.aw) return q.y; } continue; } if (q.r) { if (Math.hypot(x - q.cx, z - q.cz) < q.r) return q.y; } else { const dx = x - q.cx, dz = z - q.cz, a = dx * Math.cos(q.ang) - dz * Math.sin(q.ang), b = dx * Math.sin(q.ang) + dz * Math.cos(q.ang); if (Math.abs(a) < q.hw && Math.abs(b) < q.hl) return q.y; } }
    return 0;
  };
  /* 当たり判定を 20m 四方ごとに分けて、近くのものだけ調べる（パークが広く、数が多いので） */
  World.prototype.colGrid = function () {
    const G = new Map(), S = 20;
    this.colliders.forEach((c) => { for (let gx = Math.floor(c.x0 / S); gx <= Math.floor(c.x1 / S); gx++) for (let gz = Math.floor(c.z0 / S); gz <= Math.floor(c.z1 / S); gz++) { const k = gx + "," + gz; if (!G.has(k)) G.set(k, []); G.get(k).push(c); } });
    this._grid = G; this._gridN = this.colliders.length;
  };
  World.prototype.resolve = function (p, r) {
    if (this.keepOnIsland) this.keepOnIsland(p);
    if (!this._grid || this._gridN !== this.colliders.length) this.colGrid();
    const near = new Set(), S = 20;
    for (let gx = Math.floor((p.x - r - 1) / S); gx <= Math.floor((p.x + r + 1) / S); gx++) for (let gz = Math.floor((p.z - r - 1) / S); gz <= Math.floor((p.z + r + 1) / S); gz++) { const a = this._grid.get(gx + "," + gz); if (a) a.forEach((c) => near.add(c)); }
    let hit = 0; const py = p.y || 0;
    for (let it = 0; it < 3; it++) for (const c of near) {
      if (p.x + r < c.x0 || p.x - r > c.x1 || p.z + r < c.z0 || p.z - r > c.z1) continue;
      if (c.ya !== undefined && (py < c.ya || py > c.yb)) continue;         /* ★★ 2026-09-29c 高さの範囲つき（ホームの手すり・地上の柱） */
      if (py < -100 && c.ya === undefined) continue;                          /* ★★ 2026-09-30 建物の中の部屋（地下）では地上の当たりは効かない */
      if (c.fence && p.overFence) continue;                                   /* ★★ 2026-09-29d ホバーは柵を越えられる */
      if (c.t) { if (pushShape(c, p, r)) hit++; continue; }
      const cx = Math.max(c.x0, Math.min(p.x, c.x1)), cz = Math.max(c.z0, Math.min(p.z, c.z1));
      let dx = p.x - cx, dz = p.z - cz; const d = Math.hypot(dx, dz);
      if (d > 1e-6) { if (d < r) { p.x += dx / d * (r - d); p.z += dz / d * (r - d); hit++; } }
      else {                                                  /* 中心が箱の中：いちばん近い辺へ */
        const l = p.x - c.x0, rr = c.x1 - p.x, tt = p.z - c.z0, bb = c.z1 - p.z, m = Math.min(l, rr, tt, bb);
        if (m === l) p.x = c.x0 - r; else if (m === rr) p.x = c.x1 + r; else if (m === tt) p.z = c.z0 - r; else p.z = c.z1 + r;
        hit++;
      }
    }
    return hit;
  };
  /* 角度が「あき」（橋・入口）の中か */
  function inGap(gaps, a) { if (!gaps) return false; for (const g of gaps) { let d = a - g[0]; d = ((d % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2); let w = g[1] - g[0]; w = ((w % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2); if (d <= w) return true; } return false; }
  /* 円・輪・線分・回転した長方形・だ円の輪から押し出す（押し出したら true） */
  function pushShape(c, p, r) {
    if (c.t === "c") {
      const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), R = c.r + r; if (d >= R) return false;
      if (d < 1e-6) { p.x = c.x + R; return true; } p.x = c.x + dx / d * R; p.z = c.z + dz / d * R; return true;
    }
    if (c.t === "ring" || c.t === "ell") {
      const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz); if (d < 1e-6) return false;
      const ux = dx / d, uz = dz / d;
      if (c.gaps && inGap(c.gaps, Math.atan2(dz, dx))) return false;
      let ri, ro;
      if (c.t === "ring") { ri = c.r0; ro = c.r1; }
      else { ro = 1 / Math.sqrt((ux / c.rx1) * (ux / c.rx1) + (uz / c.rz1) * (uz / c.rz1)); ri = c.rx0 > 0 ? 1 / Math.sqrt((ux / c.rx0) * (ux / c.rx0) + (uz / c.rz0) * (uz / c.rz0)) : 0; }
      if (d >= ro + r || (ri > 0 && d <= ri - r)) return false;
      const toIn = ri > 0 ? d - (ri - r) : 1e9, toOut = ro + r - d, nd = toIn < toOut ? ri - r : ro + r;
      p.x = c.x + ux * nd; p.z = c.z + uz * nd; return true;
    }
    if (c.t === "seg") {
      const ex = c.bx - c.ax, ez = c.bz - c.az, l2 = ex * ex + ez * ez; let k = l2 > 0 ? ((p.x - c.ax) * ex + (p.z - c.az) * ez) / l2 : 0; k = Math.max(0, Math.min(1, k));
      const qx = c.ax + ex * k, qz = c.az + ez * k, dx = p.x - qx, dz = p.z - qz, d = Math.hypot(dx, dz), R = c.r + r; if (d >= R) return false;
      if (d < 1e-6) { const l = Math.sqrt(l2) || 1; p.x = qx - ez / l * R; p.z = qz + ex / l * R; return true; }
      p.x = qx + dx / d * R; p.z = qz + dz / d * R; return true;
    }
    if (c.t === "obb") {
      const dx = p.x - c.x, dz = p.z - c.z, a = dx * c.c - dz * c.s, b = dx * c.s + dz * c.c;
      if (Math.abs(a) >= c.hw + r || Math.abs(b) >= c.hd + r) return false;
      const qa = Math.max(-c.hw, Math.min(c.hw, a)), qb = Math.max(-c.hd, Math.min(c.hd, b));
      let na, nb;
      if (qa !== a || qb !== b) { const ea = a - qa, eb = b - qb, d = Math.hypot(ea, eb); if (d >= r) return false; na = qa + ea / d * r; nb = qb + eb / d * r; }
      else { const pa = c.hw - Math.abs(a), pb = c.hd - Math.abs(b); if (pa < pb) { na = Math.sign(a || 1) * (c.hw + r); nb = b; } else { na = a; nb = Math.sign(b || 1) * (c.hd + r); } }
      p.x = c.x + na * c.c + nb * c.s; p.z = c.z - na * c.s + nb * c.c; return true;
    }
    return false;
  }
  World.prototype.pushShape = pushShape;
  /* ★ 2026-09-29 カメラが建物にめりこまない：建物の足もとの形（影の焼き込みに使う多角形）と高さで「中か」を調べる。
     前はカメラの当たりが一部の材質の壁だけで、ガラスのビルなどの中へカメラが入って、景色が大きな色の板のように見えた */
  World.prototype.camGrid = function () {
    const G = new Map(), S = 24, list = [];
    (this.casters || []).forEach((c) => {
      if (!c.pts || c.pts.length < 3 || c.h < 2.5) return;
      let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; c.pts.forEach(([x, z]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); });
      const it = { pts: c.pts, h: c.h, x0, z0, x1, z1 }; list.push(it);
      for (let gx = Math.floor(x0 / S); gx <= Math.floor(x1 / S); gx++) for (let gz = Math.floor(z0 / S); gz <= Math.floor(z1 / S); gz++) { const k = gx + "," + gz; if (!G.has(k)) G.set(k, []); G.get(k).push(it); }
    });
    this._cg = G; this._cgS = S;
  };
  function inPoly(P, x, z) { let inside = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const xi = P[i][0], zi = P[i][1], xj = P[j][0], zj = P[j][1]; if (((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi) + xi)) inside = !inside; } return inside; }
  /* (x,y,z) が建物の中なら true。tx,tz（キャラの位置）がその建物の中なら、その建物は数えない（建物の中を歩いているとき） */
  World.prototype.camBlock = function (x, y, z, tx, tz) {
    if (y < -100) return false;
    if (!this._cg) this.camGrid();
    const a = this._cg.get(Math.floor(x / this._cgS) + "," + Math.floor(z / this._cgS));
    if (a) for (const it of a) {
      if (y > it.h || x < it.x0 || x > it.x1 || z < it.z0 || z > it.z1) continue;
      if (inPoly(it.pts, x, z) && !(tx != null && tx >= it.x0 && tx <= it.x1 && tz >= it.z0 && tz <= it.z1 && inPoly(it.pts, tx, tz))) return true;
    }
    /* ★★ 2026-09-30b 生け垣（エリアのさかい）もカメラがくぐらない */
    const b = this._grid && this._grid.get(Math.floor(x / 20) + "," + Math.floor(z / 20));
    if (b) for (const c of b) {
      if (!c.hedge || y > c.hedge + 0.3 || x < c.x0 - 0.3 || x > c.x1 + 0.3 || z < c.z0 - 0.3 || z > c.z1 + 0.3) continue;
      if (c.t === "obb") { const dx = x - c.x, dz = z - c.z, u = dx * c.c - dz * c.s, v = dx * c.s + dz * c.c; if (Math.abs(u) < c.hw + 0.3 && Math.abs(v) < c.hd + 0.3) return true; } else return true;
    }
    return false;
  };
  World.prototype.zoneAt = function (x, z) {
    let best = null;
    for (const zn of this.zones) if (x >= zn.x0 && x <= zn.x1 && z >= zn.z0 && z <= zn.z1) { if (!best || (zn.x1 - zn.x0) * (zn.z1 - zn.z0) < (best.x1 - best.x0) * (best.z1 - best.z0)) best = zn; }
    return best;
  };
  World.prototype.update = function (dt, t, cam) {
    if (cam) { this._camX = cam.position.x; this._camZ = cam.position.z; this._cam = cam; }
    this.anim.forEach((f) => f(dt, t));
    /* 遠い場所（まとめ描きのかたまり）は描かない・小物（ベンチ・街灯・花など）はもっと近くだけ */
    if (cam && this.cellMeshes) {
      const cx = cam.position.x, cz = cam.position.z, hi = cam.position.y, R = this.viewR || 900, RD = (this.viewD || 300) + hi * 0.8;
      for (const m of this.cellMeshes) { const c = m.geometry.boundingSphere.center; const d = Math.hypot(c.x - cx, c.z - cz) - m.geometry.boundingSphere.radius; m.visible = d < (m.userData.detail ? RD : m.userData.landmark ? R * 3 : R); }
      if (this.updateVeg) this.updateVeg(cx, cz, R);
      if (this.farObjs) for (const f of this.farObjs) f.o.visible = Math.hypot(f.x - cx, f.z - cz) < f.r;
      if (this.looseList) { const k = hi > 200 ? 4 : 1; for (const L of this.looseList) { const p = L.o.position; L.o.visible = Math.abs(p.x - cx) < L.r * k && Math.abs(p.z - cz) < L.r * k; } }
    }
    for (const s of this.screens) {
      if (s.mesh && !s.mesh.visible) continue;             /* 見えていない画面は描きなおさない */
      if (t - s.last < s.every) continue;
      s.last = t;
      s.draw(s.scr.g, s.scr.w, s.scr.h, t);
      s.scr.flush();
    }
  };

  window.XWorld = { World, liveGachaList, mergeGeos };
})();
