/* ============================================================
   MagiAbyss — ma-map.js
   迷宮の自動生成（毎回すこしずつ変わる・つながりは必ず保証する）
   ------------------------------------------------------------
   ・大きな方眼（マクロ格子）に部屋を置き、全域木＋ループで通路をつなぐ
     → どの部屋にも必ず行ける（つながりが壊れない）。
   ・構成（layout）は迷宮ごとに3つ。毎回どれかを選び、部屋の中身はランダム。
   ・置物（木・岩・本棚…）を置いたあと、スタートから歩いて行けるかを
     幅優先で調べ、行けない床があれば置物をどけて必ずつなぐ。
   ・地図データは「タイルの配列」と「物の一覧」だけ。エンジンはそれを読むだけ。
   タイル：0 壁 / 1 床 / 2 置物（当たりあり）/ 3 毒沼 / 4 氷 / 5 溶岩 / 6 魔法床 / 7 汚染
           8 水（当たりあり）/ 9 穴（当たりあり・空）/ 10 隠し壁 / 11 蔦の封印（こわせる）
           12 ボスの扉（鍵がそろうと開く）/ 13 封印の扉（封印の鍵で開く）/ 14 じゅうたん（床）
   ============================================================ */
(function () {
  "use strict";
  const MA = (window.MA = window.MA || {});
  const T = { WALL: 0, FLOOR: 1, BLOCK: 2, POISON: 3, ICE: 4, LAVA: 5, RUNE: 6, TAINT: 7, WATER: 8, PIT: 9, SECRET: 10, VINE: 11, BOSSDOOR: 12, SEALDOOR: 13, CARPET: 14 };
  const SOLID = new Uint8Array(16); [T.WALL, T.BLOCK, T.WATER, T.PIT, T.SECRET, T.VINE, T.BOSSDOOR, T.SEALDOOR].forEach((t) => { SOLID[t] = 1; });
  const TS = 16;

  function mkRng(seed) {
    let s = (seed >>> 0) || 0x9e3779b9;
    const r = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    r.int = (a, b) => a + Math.floor(r() * (b - a + 1));
    r.pick = (arr) => arr[Math.floor(r() * arr.length)];
    r.shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; };
    return r;
  }

  /* 迷宮ごとの構成（3つ）。mw/mh＝マクロ格子の数、cw/ch＝1マスのタイル数 */
  const LAYOUTS = {
    forest:  [{ mw: 6, mh: 5, cw: 26, ch: 22, cave: 1, holes: 0.12, loop: 0.25, cor: 4 }, { mw: 7, mh: 4, cw: 26, ch: 22, cave: 1, holes: 0.1, loop: 0.3, cor: 4 }, { mw: 5, mh: 6, cw: 26, ch: 22, cave: 1, holes: 0.08, loop: 0.2, cor: 5 }],
    ice:     [{ mw: 6, mh: 5, cw: 26, ch: 22, cave: 1, holes: 0.15, loop: 0.2, cor: 4 }, { mw: 7, mh: 5, cw: 24, ch: 20, cave: 1, holes: 0.18, loop: 0.25, cor: 4 }, { mw: 5, mh: 5, cw: 30, ch: 24, cave: 1, holes: 0.05, loop: 0.3, cor: 5 }],
    lava:    [{ mw: 6, mh: 5, cw: 26, ch: 22, cave: 0, holes: 0.12, loop: 0.25, cor: 4 }, { mw: 7, mh: 4, cw: 26, ch: 24, cave: 0, holes: 0.1, loop: 0.3, cor: 4 }, { mw: 5, mh: 6, cw: 28, ch: 22, cave: 0, holes: 0.1, loop: 0.2, cor: 4 }],
    library: [{ mw: 6, mh: 5, cw: 26, ch: 22, cave: 0, holes: 0.1, loop: 0.35, cor: 4 }, { mw: 6, mh: 6, cw: 24, ch: 20, cave: 0, holes: 0.15, loop: 0.3, cor: 3 }, { mw: 7, mh: 4, cw: 26, ch: 22, cave: 0, holes: 0.1, loop: 0.4, cor: 4 }],
    abyss:   [{ mw: 6, mh: 5, cw: 26, ch: 22, cave: 1, holes: 0.15, loop: 0.2, cor: 4 }, { mw: 6, mh: 6, cw: 24, ch: 22, cave: 1, holes: 0.2, loop: 0.2, cor: 3 }, { mw: 7, mh: 5, cw: 24, ch: 20, cave: 1, holes: 0.12, loop: 0.25, cor: 4 }],
    sky:     [{ mw: 6, mh: 5, cw: 26, ch: 22, cave: 0, holes: 0.18, loop: 0.2, cor: 3 }, { mw: 7, mh: 5, cw: 24, ch: 22, cave: 0, holes: 0.2, loop: 0.25, cor: 3 }, { mw: 5, mh: 6, cw: 28, ch: 22, cave: 0, holes: 0.12, loop: 0.2, cor: 4 }],
  };

  /* ══════════════════════════════════════════════════════════════
     生成本体
     opt: { biome, seed, layout(0..2 省略で乱数), arena(深淵踏破の小さな階), chests(+n) }
     ══════════════════════════════════════════════════════════════ */
  function generate(opt) {
    const r = mkRng(opt.seed || (Date.now() ^ (Math.random() * 1e9)));
    const biome = opt.biome || "forest";
    let L;
    if (opt.arena) L = { mw: opt.arena.mw || 3, mh: opt.arena.mh || 2, cw: 26, ch: 22, cave: biome === "forest" || biome === "ice" || biome === "abyss" ? 1 : 0, holes: 0, loop: 0.5, cor: 4 };
    else { const list = LAYOUTS[biome] || LAYOUTS.forest; L = Object.assign({}, list[opt.layout != null ? opt.layout : r.int(0, list.length - 1)]); }
    const W = L.mw * L.cw + 2, H = L.mh * L.ch + 2;
    const tiles = new Uint8Array(W * H);         // 0＝壁
    const roomAt = new Int16Array(W * H).fill(-1);
    const idx = (x, y) => y * W + x;
    const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;

    /* ── ① マクロ格子：使うマス（穴をあけて形を変える）── */
    const cells = [];
    for (let j = 0; j < L.mh; j++) for (let i = 0; i < L.mw; i++) cells.push({ i, j, on: true, room: null, links: [] });
    const cellAt = (i, j) => (i >= 0 && j >= 0 && i < L.mw && j < L.mh) ? cells[j * L.mw + i] : null;
    const startCell = cellAt(0, r.int(0, L.mh - 1));
    cells.forEach((c) => { if (c !== startCell && r() < L.holes) c.on = false; });
    /* 穴で分断されたら、つながるまで穴を戻す */
    for (let guard = 0; guard < 50; guard++) {
      const seen = new Set([startCell]), q = [startCell];
      while (q.length) { const c = q.shift(); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([di, dj]) => { const n = cellAt(c.i + di, c.j + dj); if (n && n.on && !seen.has(n)) { seen.add(n); q.push(n); } }); }
      const lost = cells.filter((c) => c.on && !seen.has(c));
      if (!lost.length) break;
      /* 行けないマスに隣りあう「穴」を1つ埋める */
      const fix = cells.find((c) => !c.on && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([di, dj]) => { const n = cellAt(c.i + di, c.j + dj); return n && seen.has(n); }) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([di, dj]) => { const n = cellAt(c.i + di, c.j + dj); return n && lost.indexOf(n) >= 0; }));
      if (fix) fix.on = true; else lost.forEach((c) => { c.on = false; });
    }
    const live = cells.filter((c) => c.on);

    /* ── ② 全域木（ランダムな深さ優先）＋ループ ── */
    const visited = new Set([startCell]), stack = [startCell];
    while (stack.length) {
      const c = stack[stack.length - 1];
      const nb = r.shuffle([[1, 0], [-1, 0], [0, 1], [0, -1]]).map(([di, dj]) => cellAt(c.i + di, c.j + dj)).filter((n) => n && n.on && !visited.has(n));
      if (!nb.length) { stack.pop(); continue; }
      const n = nb[0];
      visited.add(n); c.links.push(n); n.links.push(c); stack.push(n);
    }
    live.forEach((c) => {
      [[1, 0], [0, 1]].forEach(([di, dj]) => {
        const n = cellAt(c.i + di, c.j + dj);
        if (n && n.on && c.links.indexOf(n) < 0 && r() < L.loop) { c.links.push(n); n.links.push(c); }
      });
    });

    /* ── ③ スタートからの距離（ボス部屋＝いちばん遠い所） ── */
    const dist = new Map([[startCell, 0]]);
    { const q = [startCell]; while (q.length) { const c = q.shift(); c.links.forEach((n) => { if (!dist.has(n)) { dist.set(n, dist.get(c) + 1); q.push(n); } }); } }
    let bossCell = startCell;
    live.forEach((c) => { if ((dist.get(c) || 0) > (dist.get(bossCell) || 0)) bossCell = c; });

    /* ── ④ 部屋を掘る ── */
    const rooms = [];
    function carveRect(x0, y0, w, h, t) { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (inb(x, y) && x > 0 && y > 0 && x < W - 1 && y < H - 1) tiles[idx(x, y)] = t == null ? T.FLOOR : t; }
    live.forEach((c) => {
      const big = (c === bossCell) || (c === startCell);
      const ox = 1 + c.i * L.cw, oy = 1 + c.j * L.ch;
      const rw = big ? L.cw - 4 : r.int(Math.floor(L.cw * 0.5), L.cw - 5);
      const rh = big ? L.ch - 4 : r.int(Math.floor(L.ch * 0.5), L.ch - 5);
      const rx = ox + (big ? 2 : r.int(2, L.cw - rw - 2)), ry = oy + (big ? 2 : r.int(2, L.ch - rh - 2));
      const room = { id: rooms.length, cell: c, x: rx, y: ry, w: rw, h: rh, cx: rx + Math.floor(rw / 2), cy: ry + Math.floor(rh / 2), type: "battle", dist: dist.get(c) || 0, seen: false, cleared: false, ambush: false };
      c.room = room;
      rooms.push(room);
      if (L.cave && !big) {
        /* 洞窟っぽい形：楕円に近い形で掘ってから、ふちを少しけずる */
        for (let y = ry; y < ry + rh; y++) for (let x = rx; x < rx + rw; x++) {
          const dx = (x - room.cx) / (rw / 2), dy = (y - room.cy) / (rh / 2);
          const d = dx * dx + dy * dy;
          if (d < 0.78 + r() * 0.3) tiles[idx(x, y)] = T.FLOOR;
        }
      } else carveRect(rx, ry, rw, rh);
      for (let y = ry; y < ry + rh; y++) for (let x = rx; x < rx + rw; x++) if (tiles[idx(x, y)] === T.FLOOR) roomAt[idx(x, y)] = room.id;
    });

    /* ── ⑤ 通路（部屋の中心どうしを L 字で結ぶ。幅 L.cor）── */
    const corridors = [];
    function carveCorridor(a, b) {
      const w = L.cor, hw = Math.floor(w / 2);
      const horizFirst = r() < 0.5;
      const pts = horizFirst ? [[a.cx, a.cy], [b.cx, a.cy], [b.cx, b.cy]] : [[a.cx, a.cy], [a.cx, b.cy], [b.cx, b.cy]];
      const cells2 = [];
      for (let k = 0; k < 2; k++) {
        const [x1, y1] = pts[k], [x2, y2] = pts[k + 1];
        const sx = Math.sign(x2 - x1), sy = Math.sign(y2 - y1);
        let x = x1, y = y1;
        for (let n = 0; n < 400; n++) {
          for (let oy = -hw; oy < w - hw; oy++) for (let ox = -hw; ox < w - hw; ox++) {
            const tx = x + ox, ty = y + oy;
            if (tx <= 0 || ty <= 0 || tx >= W - 1 || ty >= H - 1) continue;
            if (tiles[idx(tx, ty)] === T.WALL) { tiles[idx(tx, ty)] = T.FLOOR; cells2.push(idx(tx, ty)); }
          }
          if (x === x2 && y === y2) break;
          if (x !== x2) x += sx; else if (y !== y2) y += sy;
        }
      }
      corridors.push({ a: a.id, b: b.id, cells: cells2 });
    }
    const done = new Set();
    live.forEach((c) => c.links.forEach((n) => {
      const k = Math.min(c.room.id, n.room.id) + "-" + Math.max(c.room.id, n.room.id);
      if (done.has(k)) return; done.add(k);
      carveCorridor(c.room, n.room);
    }));

    /* ── ⑥ 部屋の役割を決める ── */
    const startRoom = startCell.room, bossRoom = bossCell.room;
    startRoom.type = "start"; bossRoom.type = "boss";
    const others = rooms.filter((x) => x !== startRoom && x !== bossRoom);
    /* 行き止まり（つながりが1本）は宝物庫・封印区域に向く */
    const deg = (rm) => rm.cell.links.length;
    const byDist = others.slice().sort((a, b) => a.dist - b.dist);
    const midRoom = byDist[Math.floor(byDist.length * 0.6)] || others[0];
    if (midRoom) midRoom.type = "mid";
    const pool = r.shuffle(others.filter((x) => x !== midRoom));
    const deadEnds = pool.filter((x) => deg(x) === 1);
    const take = (pref) => { let x = pref.length ? pref.shift() : null; if (!x) x = pool.find((p) => p.type === "battle"); if (x) { const i = pool.indexOf(x); if (i >= 0) pool.splice(i, 1); const j = deadEnds.indexOf(x); if (j >= 0) deadEnds.splice(j, 1); } return x; };
    const want = opt.arena ? ["heal"] : ["vault", "sealed", "heal", "circle", "altar", "spirit", "vault2"];
    want.forEach((ty) => {
      /* ★ 封印区域は<b>行き止まりだけ</b>（扉でふさぐので、奥に別の部屋があると行けなくなる） */
      if (ty === "sealed") { const d = deadEnds.shift(); if (d) { const i = pool.indexOf(d); if (i >= 0) pool.splice(i, 1); d.type = "sealed"; } return; }
      const x = (ty === "vault" || ty === "vault2") ? take(deadEnds) : take([]);
      if (x) x.type = ty === "vault2" ? "vault" : ty;
    });
    if (biome === "sky" && !opt.arena) { const x = take([]); if (x) x.type = "timed"; }

    /* ── ⑦ 隠し部屋（どこかの部屋の外に小部屋を掘り、隠し壁でつなぐ）── */
    let secretRoom = null;
    if (!opt.arena) {
      const cand = r.shuffle(rooms.filter((x) => x.type === "battle" || x.type === "heal"));
      for (const host of cand) {
        const dirs = r.shuffle([[1, 0], [-1, 0], [0, 1], [0, -1]]);
        let ok = false;
        for (const [dx, dy] of dirs) {
          const sw = 7, sh = 6;
          const sx = dx > 0 ? host.x + host.w + 2 : dx < 0 ? host.x - sw - 2 : host.cx - 3;
          const sy = dy > 0 ? host.y + host.h + 2 : dy < 0 ? host.y - sh - 2 : host.cy - 3;
          if (sx < 2 || sy < 2 || sx + sw >= W - 2 || sy + sh >= H - 2) continue;
          let clear = true;
          for (let y = sy - 1; y < sy + sh + 1 && clear; y++) for (let x = sx - 1; x < sx + sw + 1; x++) if (tiles[idx(x, y)] !== T.WALL) { clear = false; break; }
          if (!clear) continue;
          carveRect(sx, sy, sw, sh);
          const sr = { id: rooms.length, cell: null, x: sx, y: sy, w: sw, h: sh, cx: sx + 3, cy: sy + 3, type: "secret", dist: host.dist + 1, seen: false, cleared: false };
          rooms.push(sr);
          for (let y = sy; y < sy + sh; y++) for (let x = sx; x < sx + sw; x++) roomAt[idx(x, y)] = sr.id;
          /* host とのあいだを掘って、いちばん host 寄りを隠し壁に */
          let x = dx ? (dx > 0 ? host.x + host.w : host.x - 1) : host.cx, y = dy ? (dy > 0 ? host.y + host.h : host.y - 1) : host.cy;
          /* host の床に届くまで host 側へ寄せる */
          for (let k = 0; k < 6; k++) { const bx = x - dx, by = y - dy; if (tiles[idx(bx, by)] === T.FLOOR) break; x -= dx; y -= dy; }
          const path = [];
          for (let k = 0; k < 12; k++) { const tx = x + dx * k, ty = y + dy * k; if (roomAt[idx(tx, ty)] === sr.id) break; path.push([tx, ty]); }
          /* ★ 掘る道がほかの通路・部屋を横切るなら、この向きはやめる（隠し部屋に別の入口ができてしまう） */
          const crosses = path.some(([tx, ty], k) => k > 0 && (tiles[idx(tx, ty)] !== T.WALL || tiles[idx(tx + (dx ? 0 : 1), ty + (dx ? 1 : 0))] !== T.WALL));
          if (crosses || !path.length) {
            for (let yy = sy; yy < sy + sh; yy++) for (let xx = sx; xx < sx + sw; xx++) { tiles[idx(xx, yy)] = T.WALL; roomAt[idx(xx, yy)] = -1; }
            rooms.pop();
            continue;
          }
          path.forEach(([tx, ty], k) => { tiles[idx(tx, ty)] = k === 0 ? T.SECRET : T.FLOOR; if (dx) { tiles[idx(tx, ty + 1)] = k === 0 ? T.SECRET : T.FLOOR; } else { tiles[idx(tx + 1, ty)] = k === 0 ? T.SECRET : T.FLOOR; } });
          sr.wall = path[0];
          secretRoom = sr; ok = true; break;
        }
        if (ok) break;
      }
    }

    /* ── ⑧ ボスの扉・封印の扉（部屋に入る通路の口をふさぐ）── */
    function blockEntrances(room, tileType) {
      /* 部屋のまわり1マス外側の床（＝通路の口）をふさぐ */
      const out = [];
      for (let y = room.y - 1; y <= room.y + room.h; y++) for (let x = room.x - 1; x <= room.x + room.w; x++) {
        if (x >= room.x && x < room.x + room.w && y >= room.y && y < room.y + room.h) continue;
        if (!inb(x, y)) continue;
        if (tiles[idx(x, y)] === T.FLOOR && roomAt[idx(x, y)] < 0) { tiles[idx(x, y)] = tileType; out.push([x, y]); }
      }
      return out;
    }
    const bossDoors = opt.arena ? [] : blockEntrances(bossRoom, T.BOSSDOOR);
    const sealedRoom = rooms.find((x) => x.type === "sealed");
    const sealDoors = sealedRoom ? blockEntrances(sealedRoom, T.SEALDOOR) : [];

    /* ── ⑨ 置物（木・岩・本棚…）と地形の特徴 ── */
    const decoKind = { forest: ["tree", "tree", "bush", "rock"], ice: ["crystal", "crystal", "rock"], lava: ["rock", "rock"], library: ["shelf", "shelf", "statue"], abyss: ["void", "void", "rock"], sky: ["starpillar", "statue"] }[biome] || ["rock"];
    const decos = [];
    const keepClear = (x, y, room) => {
      /* 部屋の中心まわり・出入り口のまわりは空けておく */
      if (Math.abs(x - room.cx) < 4 && Math.abs(y - room.cy) < 3) return true;
      for (let oy = -2; oy <= 2; oy++) for (let ox = -2; ox <= 2; ox++) { const t = tiles[idx(x + ox, y + oy)]; if (roomAt[idx(x + ox, y + oy)] < 0 && t === T.FLOOR) return true; if (t === T.BOSSDOOR || t === T.SEALDOOR || t === T.SECRET) return true; }
      return false;
    };
    rooms.forEach((room) => {
      if (room.type === "boss" || room.type === "secret") return;
      const area = room.w * room.h;
      const n = Math.floor(area / (room.type === "start" ? 90 : 55));
      for (let k = 0; k < n; k++) {
        const x = r.int(room.x + 1, room.x + room.w - 2), y = r.int(room.y + 1, room.y + room.h - 2);
        if (tiles[idx(x, y)] !== T.FLOOR || keepClear(x, y, room)) continue;
        tiles[idx(x, y)] = T.BLOCK;
        decos.push({ x, y, kind: r.pick(decoKind), v: r.int(0, 3) });
      }
      /* 地形の特徴（床の種類） */
      const patch = (t, cnt, rad) => {
        for (let k = 0; k < cnt; k++) {
          const px = r.int(room.x + 2, room.x + room.w - 3), py = r.int(room.y + 2, room.y + room.h - 3);
          const rr = r.int(1, rad);
          for (let y = py - rr; y <= py + rr; y++) for (let x = px - rr; x <= px + rr; x++) {
            if (!inb(x, y) || tiles[idx(x, y)] !== T.FLOOR) continue;
            if ((x - px) * (x - px) + (y - py) * (y - py) > rr * rr + 1) continue;
            if (Math.abs(x - room.cx) < 3 && Math.abs(y - room.cy) < 2 && room.type !== "battle") continue;
            tiles[idx(x, y)] = t;
          }
        }
      };
      if (room.type === "start" || room.type === "heal") return;
      if (biome === "forest" && r() < 0.5) patch(T.POISON, r.int(1, 2), 2);
      if (biome === "ice" && r() < 0.75) patch(T.ICE, r.int(2, 4), 3);
      if (biome === "lava") { if (r() < 0.6) patch(T.LAVA, r.int(1, 3), 2); }
      if (biome === "library" && r() < 0.6) patch(T.RUNE, r.int(1, 3), 1);
      if (biome === "abyss" && r() < 0.6) patch(T.TAINT, r.int(1, 3), 2);
      if (biome === "library" && r() < 0.4) { for (let x = room.x + 2; x < room.x + room.w - 2; x++) if (tiles[idx(x, room.cy)] === T.FLOOR) tiles[idx(x, room.cy)] = T.CARPET; }
    });

    /* ── ⑩ つながりの保証：スタートから歩けない床があれば、置物・水・穴をどける ── */
    const start = { x: startRoom.cx, y: startRoom.cy };
    function walkable(t) { return !SOLID[t] || t === T.VINE || t === T.BOSSDOOR || t === T.SEALDOOR || t === T.SECRET; }
    function flood() {
      const seen = new Uint8Array(W * H), q = [idx(start.x, start.y)];
      seen[q[0]] = 1;
      for (let qi = 0; qi < q.length; qi++) {
        const p = q[qi], x = p % W, y = (p / W) | 0;
        const nb = [p - 1, p + 1, p - W, p + W];
        for (let k = 0; k < 4; k++) { const n = nb[k]; if (seen[n]) continue; if (!walkable(tiles[n])) continue; seen[n] = 1; q.push(n); }
      }
      return seen;
    }
    for (let pass = 0; pass < 40; pass++) {
      const seen = flood();
      let fixed = 0;
      for (let p = 0; p < W * H; p++) {
        const t = tiles[p];
        if (seen[p] || t === T.WALL || !walkable(t)) continue;
        /* 行けない床：となりの置物を床へ */
        const nb = [p - 1, p + 1, p - W, p + W];
        for (let k = 0; k < 4; k++) { const n = nb[k]; if (tiles[n] === T.BLOCK || tiles[n] === T.WATER || tiles[n] === T.PIT) { tiles[n] = T.FLOOR; fixed++; } }
      }
      if (!fixed) break;
    }
    /* どけた置物は飾りの一覧からも消す */
    for (let k = decos.length - 1; k >= 0; k--) if (tiles[idx(decos[k].x, decos[k].y)] !== T.BLOCK) decos.splice(k, 1);

    /* ── ⑪ 蔦の封印（森）：通路の途中をふさぐ。こわせば通れる（全域木の通路は1本だけ）── */
    const vines = [];
    if (biome === "forest" && !opt.arena) {
      corridors.forEach((c) => {
        if (r() > 0.35 || c.cells.length < 10) return;
        const mid = c.cells[Math.floor(c.cells.length / 2)];
        const mx = mid % W, my = (mid / W) | 0;
        for (let oy = -2; oy <= 2; oy++) for (let ox = -2; ox <= 2; ox++) {
          const p = idx(mx + ox, my + oy);
          if (tiles[p] === T.FLOOR && roomAt[p] < 0) { tiles[p] = T.VINE; vines.push(p); }
        }
      });
    }

    /* ── ⑫ 物を置く（宝箱・回復・魔法陣・祭壇・鍵…）── */
    const objects = [];
    const place = (room, kind, extra) => {
      /* 部屋の中心付近の空いている床 */
      for (let k = 0; k < 60; k++) {
        const x = room.cx + r.int(-Math.floor(room.w / 4), Math.floor(room.w / 4)), y = room.cy + r.int(-Math.floor(room.h / 4), Math.floor(room.h / 4));
        if (!inb(x, y) || tiles[idx(x, y)] !== T.FLOOR) continue;
        if (objects.some((o) => Math.abs(o.tx - x) < 3 && Math.abs(o.ty - y) < 3)) continue;
        const o = Object.assign({ kind, tx: x, ty: y, x: x * TS + 8, y: y * TS + 8, room: room.id, done: false }, extra || {});
        objects.push(o);
        return o;
      }
      const o = Object.assign({ kind, tx: room.cx, ty: room.cy, x: room.cx * TS + 8, y: room.cy * TS + 8, room: room.id, done: false }, extra || {});
      tiles[idx(room.cx, room.cy)] = T.FLOOR;
      objects.push(o);
      return o;
    };
    place(startRoom, "retreat");
    const extraChests = opt.chests || 0;
    rooms.forEach((room) => {
      if (room.type === "vault") { place(room, "chest", { tier: 2 }); place(room, "chest", { tier: 1 }); room.guard = true; }
      if (room.type === "sealed") { place(room, "chest", { tier: 2 }); place(room, "chest", { tier: 2 }); place(room, "lore"); }
      if (room.type === "heal") place(room, "fountain");
      if (room.type === "circle") place(room, "circle");
      if (room.type === "altar") place(room, "altar");
      if (room.type === "spirit") place(room, "spirit");
      if (room.type === "secret") { place(room, "chest", { tier: 2, secret: 1 }); place(room, "lore"); }
      if (room.type === "timed") place(room, "starShard");
      if (room.type === "battle" && r() < 0.35) place(room, "chest", { tier: 1 });
    });
    for (let k = 0; k < extraChests; k++) { const rm = r.pick(rooms.filter((x) => x.type === "battle")); if (rm) place(rm, "chest", { tier: 1 }); }
    /* 星脈の鍵：中ボス（倒すと出る）＋ 試練・宝物庫・祭壇・隠し部屋のうち3つに。必要なのは3つ */
    const keySpots = [];
    if (midRoom) keySpots.push({ room: midRoom.id, how: "mid" });
    rooms.filter((x) => x.type === "circle" || x.type === "vault" || x.type === "altar" || x.type === "timed").forEach((x) => keySpots.push({ room: x.id, how: x.type }));
    /* 転移門（書庫）：遠い部屋どうしを2組 */
    const warps = [];
    if (biome === "library" && !opt.arena) {
      const cand = r.shuffle(rooms.filter((x) => x.type === "battle"));
      for (let k = 0; k + 1 < cand.length && warps.length < 4; k += 2) {
        const a = place(cand[k], "warp"), b = place(cand[k + 1], "warp");
        a.pair = objects.indexOf(b); b.pair = objects.indexOf(a); warps.push(a, b);
      }
    }
    /* 噴火口（熔岩）・重力の渦（星天） */
    if (biome === "lava") rooms.filter((x) => x.type === "battle").forEach((x) => { if (r() < 0.7) place(x, "vent"); });
    if (biome === "sky") rooms.filter((x) => x.type === "battle").forEach((x) => { if (r() < 0.45) place(x, "gravity"); });
    /* 汚染をはらう燭台（奈落） */
    if (biome === "abyss") rooms.filter((x) => x.type === "battle").forEach((x) => { if (r() < 0.4) place(x, "purifier"); });

    /* ── ⑬ ボスの部屋のギミックの置き場所（中心から放射状）── */
    const gimSpots = [];
    const gn = 4;
    for (let k = 0; k < gn; k++) {
      const a = k / gn * Math.PI * 2 + Math.PI / 4;
      gimSpots.push({ x: (bossRoom.cx + Math.cos(a) * bossRoom.w * 0.33) * TS + 8, y: (bossRoom.cy + Math.sin(a) * bossRoom.h * 0.33) * TS + 8 });
    }

    return {
      W, H, TS, tiles, roomAt, rooms, corridors, objects, decos, vines, warps,
      start: { x: start.x * TS + 8, y: start.y * TS + 8 }, startRoom: startRoom.id, bossRoom: bossRoom.id, midRoom: midRoom ? midRoom.id : -1,
      sealedRoom: sealedRoom ? sealedRoom.id : -1, secretRoom: secretRoom ? secretRoom.id : -1,
      bossDoors, sealDoors, keySpots, gimSpots, biome, seen: new Uint8Array(W * H), layout: L,
      seed: opt.seed,
    };
  }

  /* ── 調べもの ── */
  function tileAt(map, px, py) { const x = Math.floor(px / TS), y = Math.floor(py / TS); if (x < 0 || y < 0 || x >= map.W || y >= map.H) return T.WALL; return map.tiles[y * map.W + x]; }
  function solidAt(map, px, py) { return SOLID[tileAt(map, px, py)] === 1; }
  function roomOf(map, px, py) { const x = Math.floor(px / TS), y = Math.floor(py / TS); if (x < 0 || y < 0 || x >= map.W || y >= map.H) return -1; return map.roomAt[y * map.W + x]; }
  /* 円と壁の当たり（押し出し量を返す） */
  function collideCircle(map, x, y, rad) {
    let ox = 0, oy = 0;
    const x0 = Math.floor((x - rad) / TS), x1 = Math.floor((x + rad) / TS), y0 = Math.floor((y - rad) / TS), y1 = Math.floor((y + rad) / TS);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const t = (tx < 0 || ty < 0 || tx >= map.W || ty >= map.H) ? T.WALL : map.tiles[ty * map.W + tx];
      if (!SOLID[t]) continue;
      const nx = Math.max(tx * TS, Math.min(x, tx * TS + TS)), ny = Math.max(ty * TS, Math.min(y, ty * TS + TS));
      const dx = x - nx, dy = y - ny, d2 = dx * dx + dy * dy;
      if (d2 < rad * rad) {
        const d = Math.sqrt(d2) || 0.0001;
        const push = rad - d;
        if (d2 === 0) { ox += 0; oy -= push; } else { ox += dx / d * push; oy += dy / d * push; }
      }
    }
    return [ox, oy];
  }
  /* 見通し（2点のあいだに壁があるか）— 粗い DDA */
  function los(map, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy);
    const n = Math.ceil(d / 8);
    for (let i = 1; i < n; i++) { const t = i / n; if (solidAt(map, x1 + dx * t, y1 + dy * t)) return false; }
    return true;
  }
  /* 床のランダムな点（部屋の中・条件つき） */
  function randomFloor(map, rnd, test) {
    for (let k = 0; k < 200; k++) {
      const x = Math.floor(rnd() * map.W), y = Math.floor(rnd() * map.H);
      const t = map.tiles[y * map.W + x];
      if (SOLID[t] || t === T.LAVA) continue;
      const px = x * TS + 8, py = y * TS + 8;
      if (!test || test(px, py, x, y)) return { x: px, y: py };
    }
    return null;
  }

  MA.Map = { generate, T, SOLID, TS, tileAt, solidAt, roomOf, collideCircle, los, randomFloor, mkRng, LAYOUTS };
})();
