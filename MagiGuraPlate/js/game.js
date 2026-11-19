/* MagiGura Plate — ゲームの進行と操作
 *
 *  ルール：自分の番に手持ちのコマを1つ皿に置く。落ちたコマは落とした人の手持ちになる。
 *          手持ちを全部置いた人の勝ち。
 *          コマの上にも置ける（2段まで・まん中が下のコマに乗っていること）。向きは好きに変えられる。
 *  1台を全員で囲む前提なので、席の札は画面のふちに並び、それぞれの席のほうを向く。
 *  ★★ 2026-11-17 XEVARION 版：メンバー（名前・アイコン・アカウント連携・この端末の本人）と席の場所は setup.js で決める。
 *     席の札に名前とアイコン、番は席の時計まわり。勝負がついたら順位で XEVA（account.js）。
 */
(function (root) {
  'use strict';
  const GP = root.GP, CFG = GP.CFG, KINDS = GP.KINDS, KIND_IDS = GP.KIND_IDS, RD = GP.Render, AU = GP.Audio;
  const $ = function (id) { return document.getElementById(id); };
  const SU = GP.Setup, ACC = GP.Account, esc = SU.esc;
  /* 手持ちは全員同じ。この並びの先頭から人数に応じた数だけ配る */
  const STOCK_ORDER = ['disc', 'iron', 'ice', 'bar', 'rubber', 'disc', 'ice', 'bar', 'disc', 'rubber', 'ice', 'iron', 'disc', 'bar'];
  const STOCK_N = { 2: 10, 3: 8, 4: 7, 5: 6, 6: 5, 7: 5, 8: 4 };
  const SIZE_MUL = { short: 0.7, normal: 1, long: 1.4 };
  const HOVER = 0.2, FALL_G = 10, CELL = 46;
  const FINE = Math.PI / 12;      // つまんでいる間の向きの1段（15度）
  const SAVE_KEY = 'guraplate_v1';
  const DESC = { disc: '重さ2・ふつう', iron: '重さ5・重い', ice: '重さ2・すべる', bar: '重さ3・長い', rubber: '重さ2・すべらない' };

  const S = {
    screen: 'title', n: 4, size: 'normal', first: 0, gid: 0,
    players: [], cur: 0, phase: 'idle', paused: false,
    world: new GP.World(), ghost: null, falling: [], fx: [], accent: null,
    acc: 0, slowT: 0, slowUsed: false, simT: 0, turnFell: 0, chips: 0, chipSeq: 0,
    wait: 0, after: null, drop: null, drag: null,
    shake: 0, now: 0, last: 0, danger: 0, demoT: 0.6, layout: null, gen: 0, manual: false
  };

  const seatsEl = $('seats'), flyEl = $('fly'), menuBtn = $('menuBtn');

  /* 音のオン・オフだけをここに（人数・手持ち・メンバー・席は setup.js の guraplate_setup_v1） */
  function load() {
    try {
      const o = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
      if (o.sound === false) AU.setOn(false);
    } catch (e) { /* 保存が使えない環境でも遊べる */ }
    S.n = SU.n; S.size = SU.size;
  }
  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ n: S.n, size: S.size, sound: AU.isOn() })); } catch (e) { /* 同上 */ }
  }
  function sfx(name, a, b) { if (S.screen !== 'title') AU[name](a, b); }

  /* ---------- プレイヤーと手持ち ----------
     ★★ 2026-11-17 メンバーは setup.js から（席の時計まわりの順＝番の順）。色はメンバーごとに決まっている */
  function makePlayers() {
    const ms = SU.players();
    S.n = ms.length; S.size = SU.size;
    const k = Math.max(3, Math.round(STOCK_N[S.n] * SIZE_MUL[S.size]));
    S.players = [];
    ms.forEach(function (m, i) {
      const p = { i: i, m: m.m, name: m.name, img: m.img, uid: m.uid, owner: m.owner, slot: m.slot, color: m.color,
        stock: {}, rot: {}, cells: {}, el: null, seat: null, turns: 0 };
      KIND_IDS.forEach(function (id) { p.stock[id] = 0; p.rot[id] = 0; });
      for (let j = 0; j < k; j++) p.stock[STOCK_ORDER[j]]++;
      S.players.push(p);
    });
  }
  function total(p) { let t = 0; for (const id of KIND_IDS) t += p.stock[id]; return t; }

  function buildSeats(preview) {
    seatsEl.innerHTML = '';
    S.players.forEach(function (p) {
      const el = document.createElement('div');
      el.className = 'seat' + (preview ? ' preview' : '');
      el.style.setProperty('--pc', p.color);
      /* ★★ 2026-11-17 札のふちに名前・左の箱にアイコン（無ければ名前の頭文字）と手持ちの数 */
      el.innerHTML = '<b class="snm">' + esc(p.name) + '</b>' +
        '<div class="who' + (p.img ? ' has-av' : '') + '">' + (p.img ? '<img class="sav" src="' + esc(p.img) + '" alt="" onerror="this.parentNode.classList.remove(\'has-av\');this.remove()">' : '') +
        '<span class="pn">' + esc(String(p.name || '?').slice(0, 1)) + '</span><b class="cnt"></b></div><div class="tray"></div><div class="note"></div>';
      const tray = el.querySelector('.tray');
      KIND_IDS.forEach(function (id) {
        const c = document.createElement('div');
        c.className = 'cell'; c.dataset.kind = id; c.dataset.p = p.i;
        c.innerHTML = '<canvas></canvas><i class="num"></i>' + (KINDS[id].rotN > 1 ? '<s class="rt"></s>' : '');
        tray.appendChild(c);
        p.cells[id] = c;
      });
      seatsEl.appendChild(el);
      p.el = el;
      el.querySelector('.cnt').textContent = total(p);
      refreshSeat(p);
      drawIcons(p);
    });
    layout();
  }
  function refreshSeat(p) {
    const t = String(total(p)), c = p.el.querySelector('.cnt');
    if (c.textContent !== t) { c.textContent = t; c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
    KIND_IDS.forEach(function (id) {
      p.cells[id].classList.toggle('zero', p.stock[id] === 0);
      p.cells[id].querySelector('.num').textContent = p.stock[id];
    });
  }
  function drawIcons(p) {
    KIND_IDS.forEach(function (id) { RD.drawIcon(p.cells[id].querySelector('canvas'), id, p.rot[id], CELL); });
  }
  /* ---------- コマの向き（p.rot[種類] = 角度。人ごと・種類ごとにおぼえている） ---------- */
  function setRot(p, kind, a) {
    const s = KINDS[kind].sym;
    if (!s) return;
    a %= s; if (a < 0) a += s;
    if (s - a < 1e-6) a = 0;
    p.rot[kind] = a;
    RD.drawIcon(p.cells[kind].querySelector('canvas'), kind, a, CELL);
  }
  /* step きざみの、となりの向きへ進める（dir = +1 で時計まわり） */
  function stepRot(p, kind, step, dir) {
    const a = p.rot[kind];
    setRot(p, kind, (dir > 0 ? Math.floor(a / step + 1e-4) + 1 : Math.ceil(a / step - 1e-4) - 1) * step);
    sfx('rotate');
    refreshGhost();
  }
  function note(p, text, cls) {
    const el = p.el.querySelector('.note');
    el.textContent = text; el.className = 'note';
    void el.offsetWidth;
    el.className = 'note ' + cls;
  }
  function clearNote(p) { p.el.querySelector('.note').className = 'note'; }

  /* ---------- 画面の割りつけ ----------
   * 横長の画面を基準に考える（縦長のときは 90 度回して当てはめる）。
   * 長い辺に2席ずつ（四すみ）、短い辺に1〜2席。皿は中央にできるだけ大きく。 */
  function insets() {
    const cs = getComputedStyle($('probe'));
    return { t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0, b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0 };
  }
  /* ★★ 2026-11-17 席は10か所（setup.js の RING）。だれがどこに座るかで札の大きさと皿の大きさを決める（これまでの人数ごとの並びと同じ計算）。
     ・同じ短い辺に2席（Ld と Lu・Ru と Rd）があると札を小さく（これまでの7〜8人と同じ）。
     ・四すみの席（TL・TR・BL・BR）があると、札に当たらないよう皿を小さく（これまでの3人以上と同じ）。 */
  /* ★★ 2026-11-19 画面の大きさ。iPhone・iPad のアプリ表示（html.xv-full）では window.innerHeight が<b>画面より短い箱</b>の高さなので、
     xeva-safebottom.js の --xv-fullh（本当の画面の高さ）を使う（下に線の空白が残っていた） */
  function viewWH() {
    const de = document.documentElement;
    let W = window.innerWidth, H = window.innerHeight;
    if (de.classList.contains('xv-full')) {
      const f = parseFloat(getComputedStyle(de).getPropertyValue('--xv-fullh'));
      if (f > H && f - H < 200) H = f;
    }
    return { W: W, H: H };
  }
  function slotGeom(used) {
    const vw = viewWH(), W = vw.W, H = vw.H, ins = insets();
    const UW = W - ins.l - ins.r, UH = H - ins.t - ins.b;
    const land = UW >= UH, LW = land ? UW : UH, LH = land ? UH : UW;
    const has = function (id) { return used.indexOf(id) >= 0; };
    const pairs = (has('Ld') && has('Lu')) || (has('Ru') && has('Rd'));
    const base = LH / 768, mg = Math.max(4, 8 * base);
    let u = Math.max(0.42, Math.min(1.3, base)) * (pairs ? 0.86 : 1);
    u = Math.min(u, (LW - 3 * mg) / 644);
    if (pairs) u = Math.min(u, (LH - 4 * mg) / 770);
    const cw = 322 * u, ch = 60 * u, gap = 6 * u, dy = cw / 2 + gap / 2;
    const P = {
      TL: { x: mg + cw / 2, y: mg + ch / 2, rot: 180 }, TR: { x: LW - mg - cw / 2, y: mg + ch / 2, rot: 180 },
      BL: { x: mg + cw / 2, y: LH - mg - ch / 2, rot: 0 }, BR: { x: LW - mg - cw / 2, y: LH - mg - ch / 2, rot: 0 },
      Lc: { x: mg + ch / 2, y: LH / 2, rot: 90 }, Rc: { x: LW - mg - ch / 2, y: LH / 2, rot: 270 }
    };
    P.Ld = { x: P.Lc.x, y: LH / 2 + dy, rot: 90 }; P.Lu = { x: P.Lc.x, y: LH / 2 - dy, rot: 90 };
    P.Ru = { x: P.Rc.x, y: LH / 2 - dy, rot: 270 }; P.Rd = { x: P.Rc.x, y: LH / 2 + dy, rot: 270 };
    let Rp = (LH / 2 - mg) * 0.9;
    Rp = Math.min(Rp, LW / 2 - (2 * mg + ch) - 4);
    if (['TL', 'TR', 'BL', 'BR'].some(has)) {
      const dx = LW / 2 - mg - cw, dz = LH / 2 - mg - ch;
      Rp = Math.min(Rp, dx > 0 ? Math.hypot(dx, dz) - 4 : dz - 4);
    }
    const map = function (s) {
      return land ? { x: ins.l + s.x, y: ins.t + s.y, rot: s.rot } : { x: ins.l + LH - s.y, y: ins.t + s.x, rot: (s.rot + 90) % 360 };
    };
    const slots = {};
    Object.keys(P).forEach(function (id) { slots[id] = map(P[id]); });
    return { W: W, H: H, cx: ins.l + UW / 2, cy: ins.t + UH / 2, R: Rp, u: u, slots: slots, menu: map({ x: mg + ch + 30 * u, y: mg + ch + 30 * u, rot: 0 }) };
  }
  function layout() {
    const vw = viewWH(), W = vw.W, H = vw.H;
    RD.resize(W, H, root.XevaPerf && XevaPerf.dpr ? XevaPerf.dpr(2) : Math.min(2, window.devicePixelRatio || 1));   /* ★★ 2026-11-17 XEVARION の動作モード（軽量・標準・高解像度） */
    const g = slotGeom(S.players.map(function (p) { return p.slot; }));
    const u = g.u;
    RD.setView(g.cx, g.cy, g.R);
    S.layout = { W: W, H: H, cx: g.cx, cy: g.cy, R: g.R, u: u, seats: S.players.map(function (p) { return g.slots[p.slot] || g.slots.BL; }), menu: g.menu };
    S.players.forEach(function (p, i) {
      p.seat = S.layout.seats[i];
      p.el.style.left = p.seat.x + 'px'; p.el.style.top = p.seat.y + 'px';
      p.el.style.setProperty('--rot', p.seat.rot + 'deg');
      p.el.style.setProperty('--u', u);
    });
    menuBtn.style.left = S.layout.menu.x + 'px'; menuBtn.style.top = S.layout.menu.y + 'px';
  }

  /* ---------- 番の進行 ---------- */
  function startGame() {
    AU.unlock();
    S.gen++; S.gid = Date.now();
    makePlayers();
    buildSeats(false);
    S.world = new GP.World();
    S.falling.length = 0; S.fx.length = 0; S.ghost = null; S.drag = null; S.chips = 0; S.acc = 0; S.slowT = 0; S.shake = 0;
    flyEl.innerHTML = '';
    S.screen = 'play'; S.paused = false;
    SU.hide(); $('over').classList.add('hidden'); $('menu').classList.add('hidden');   /* ★★ 2026-11-17 はじめの画面・準備（全画面）を閉じる */
    menuBtn.classList.remove('hidden');
    S.cur = S.first % S.n; S.first++;
    wake();
    beginTurn();
  }
  /* ★★ 2026-11-17 はじめの画面は MagiQuiz と同じ全画面（setup.js の showTitle）。うしろの皿は止めておく（frame で描かない） */
  function toTitle() {
    S.screen = 'title'; S.paused = false; S.phase = 'idle'; S.accent = null;
    S.gen++;
    AU.slide(0);
    makePlayers();
    buildSeats(true);
    S.world = new GP.World();
    S.falling.length = 0; S.fx.length = 0; S.ghost = null; S.drag = null; S.chips = 0; S.demoT = 0.6;
    flyEl.innerHTML = '';
    $('over').classList.add('hidden'); $('menu').classList.add('hidden');
    menuBtn.classList.add('hidden');
    SU.showTitle();
  }
  function beginTurn() {
    const p = S.players[S.cur];
    S.phase = 'aim'; S.accent = p.color;
    S.players.forEach(function (q) { q.el.classList.toggle('active', q === p); });
    note(p, 'あなたの番', 'stay');
    sfx('turn');
  }
  function nextTurn() {
    S.cur = (S.cur + 1) % S.n;
    beginTurn();
  }
  function waitThen(sec, fn) { S.phase = 'wait'; S.wait = sec; S.after = fn; }

  function startDrop() {
    const p = S.players[S.cur], g = S.ghost;
    p.stock[g.kind]--; p.turns++; refreshSeat(p); clearNote(p);
    g.tw = false; g.spin = false;
    S.drop = { t: 0, dur: 0.17, z0: g.z };
    S.phase = 'drop';
  }
  function land() {
    const g = S.ghost, k = KINDS[g.kind];
    const b = S.world.land(g.kind, g.x, g.y, g.a);
    sfx('place', k.mat, k.m);
    if (b.base) sfx('hit', b.base.k.mat, 0.35);        // 下のコマに当たる音
    S.fx.push({ type: 'ring', x: g.x, y: g.y, z: b.z, r: k.rad, grow: 0.07 + k.m * 0.02, t0: S.now, dur: 0.4 });
    S.ghost = null; S.drop = null;
    S.phase = 'sim'; S.simT = 0; S.turnFell = 0; S.slowUsed = false; S.slowT = 0; S.acc = 0;
  }
  function resolveTurn() {
    const p = S.players[S.cur];
    AU.slide(0);
    if (S.turnFell > 0) {
      note(p, '+' + S.turnFell, 'pop bad');
      waitThen(1.0, nextTurn);
    } else if (total(p) === 0) {
      win(p);
    } else {
      const last = total(p) === 1;
      note(p, last ? 'あと1こ!' : 'セーフ', last ? 'pop warn' : 'pop ok');
      sfx('safe');
      waitThen(last ? 0.9 : 0.45, nextTurn);
    }
  }
  /* ★★ 2026-11-17 順位：全部置いた人が1位。ほかは手持ちの少ない順（同じ数なら同じ順位） */
  function ranks() {
    const order = S.players.slice().sort(function (a, b) { return total(a) - total(b) || a.i - b.i; });
    let last = -1, rk = 0;
    order.forEach(function (q, i) { const t = total(q); if (t !== last) { rk = i + 1; last = t; } q.rank = rk; });
    return order;
  }
  function win(p) {
    S.screen = 'over'; S.phase = 'idle';
    S.players.forEach(function (q) { q.el.classList.remove('active'); });
    p.el.classList.add('winner');
    note(p, 'かち!', 'stay');
    AU.win();
    const cols = SU.COLORS.concat(['#ffffff']);
    for (let i = 0; i < 110; i++) {
      const a = Math.random() * Math.PI * 2, v = 120 + Math.random() * 520;
      S.fx.push({ type: 'spark', rect: true, sx: S.layout.cx, sy: S.layout.cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t0: S.now + Math.random() * 0.25, dur: 1.4 + Math.random() * 1.2, color: i % 3 ? cols[Math.random() * cols.length | 0] : p.color, size: 4 + Math.random() * 5, rot: Math.random() * 6, spin: (Math.random() - 0.5) * 14 });
    }
    /* 賞金と戦績（この端末の本人は財布へ直接・連携した人はアカウントへ／オフラインなら送り待ち） */
    const order = ranks(), gid = S.gid, gen = S.gen;
    const rows = order.map(function (q) { return { name: q.name, uid: q.uid, owner: q.owner, rank: q.rank, left: total(q), turns: q.turns }; });
    const paid = ACC.report(rows, { gid: gid }).catch(function () { return { prizes: [] }; });
    setTimeout(function () {
      if (S.screen !== 'over' || gen !== S.gen) return;
      $('overTitle').innerHTML = SU.avatar({ name: p.name, color: p.color, img: p.img }, 'md win') + '<span><b style="color:' + p.color + '">' + esc(p.name) + '</b> の勝ち!</span>';
      const paint = function (res) {
        const pz = {};
        ((res && res.prizes) || []).forEach(function (x) { pz[x.name + '|' + x.rank] = x; });
        $('rank').innerHTML = order.map(function (q) {
          const x = pz[q.name + '|' + q.rank];
          const tag = x ? '<em class="pz ' + x.kind + '">+' + x.amount.toLocaleString() + ' XEVA<small>' + (x.kind === 'me' ? 'この端末' : x.kind === 'cloud' ? '送りました' : 'あとで送ります') + '</small></em>' : '';
          return '<li class="' + (q.rank === 1 ? 'first' : '') + '" style="--c:' + q.color + '"><i class="rk">' + q.rank + '</i>' + SU.avatar({ name: q.name, color: q.color, img: q.img }, 'sm') +
            '<span class="rn"><b>' + esc(q.name) + '</b><small>' + (total(q) === 0 ? '全部置いた' : 'のこり ' + total(q) + ' こ') + '</small></span>' + tag + '</li>';
        }).join('');
        $('overNote').textContent = res && res.short ? '賞金は、全員が ' + ACC.MIN_TURNS + ' 回以上置いた試合だけです' : (res && res.prizes && res.prizes.length ? '' : '「メンバーと席」でアカウント連携・「この端末の本人」にすると、順位で XEVA がもらえます');
      };
      paint(null);
      paid.then(function (res) { if (S.screen === 'over' && gen === S.gen) paint(res); });
      $('overPanel').style.transform = 'rotate(' + p.seat.rot + 'deg)';
      $('over').classList.remove('hidden');
    }, 1300);
  }

  /* ---------- 物理を進める（スローつき） ---------- */
  function runPhysics(dt) {
    const w = S.world;
    let ts = 1;
    if (S.slowT > 0) { S.slowT -= dt; ts = S.slowT > 0.3 ? 0.25 : 0.25 + 0.75 * (1 - Math.max(0, S.slowT) / 0.3); }
    S.acc += dt * ts;
    let steps = 0, hit = 0;
    while (S.acc >= CFG.DT && steps < 30) {
      w.step(); S.acc -= CFG.DT; steps++;
      if (w.hitMax > hit) hit = w.hitMax;
      if (w.stopHit > 0.12) { sfx('stop', w.stopHit); S.shake = Math.max(S.shake, Math.min(1, w.stopHit * 0.8)); }
      if (w.dropped) sfx('hit', w.dropped.k.mat, 0.3);   // 上の段からすべり下りた
      while (w.fallen.length) onFall(w.fallen.shift());
    }
    if (steps === 30) S.acc = 0;
    if (hit > 0.08) sfx('hit', 'wood', hit * 0.3);
    let lv = 0;
    for (let i = 0; i < w.bodies.length; i++) {
      const b = w.bodies[i], sp = Math.hypot(b.vx, b.vy);
      if (sp < 0.03) continue;
      lv += b.m * sp;
      /* ふちへ向かってすべっていく最初の1個で、スローにする */
      if (!S.slowUsed && S.screen === 'play' && b.x * b.x + b.y * b.y > 0.74 && b.x * b.vx + b.y * b.vy > 0.1) { S.slowUsed = true; S.slowT = 0.8; }
    }
    if (S.screen !== 'title') AU.slide(lv);
    return ts;
  }
  function onFall(rec) {
    const f = RD.poseForFall(rec.body, rec.sx, rec.sy), t = f.pose.t;
    const l = Math.hypot(t[0], t[1]) || 1, ox = t[0] / l, oy = t[1] / l;
    S.falling.push({
      kind: rec.body.kind, pose: f.pose, v: [f.v[0] + ox * 0.15, f.v[1] + oy * 0.15, f.v[2]],
      ax: -oy, ay: ox, om: 2.5, age: 0, alpha: 1, landed: false, owner: S.screen === 'play' ? S.cur : -1
    });
    S.turnFell++;
    sfx('fall');
    if (S.turnFell === 3) { sfx('crash', 3); S.shake = Math.max(S.shake, 0.5); }
  }
  function tumble(m, kx, ky, th) {
    const c = Math.cos(th), s = Math.sin(th);
    for (let j = 0; j < 3; j++) {
      const vx = m[j], vy = m[j + 3], vz = m[j + 6], d = (kx * vx + ky * vy) * (1 - c);
      m[j] = vx * c + ky * vz * s + kx * d;
      m[j + 3] = vy * c - kx * vz * s + ky * d;
      m[j + 6] = vz * c + (kx * vy - ky * vx) * s;
    }
  }
  function updateFalling(dt) {
    for (let i = S.falling.length - 1; i >= 0; i--) {
      const f = S.falling[i], t = f.pose.t;
      f.age += dt;
      if (!f.landed) {
        f.v[2] -= FALL_G * dt;
        t[0] += f.v[0] * dt; t[1] += f.v[1] * dt; t[2] += f.v[2] * dt;
        f.om += 10 * dt;
        tumble(f.pose.m, f.ax, f.ay, f.om * dt);
        if (t[2] < -RD.ZT + 0.06) {
          f.landed = true;
          const sp = RD.worldToScreen(t);
          sfx('clack', KINDS[f.kind].mat);
          for (let j = 0; j < 6; j++) {
            const a = Math.random() * Math.PI * 2, v = 40 + Math.random() * 90;
            S.fx.push({ type: 'spark', sx: sp[0], sy: sp[1], vx: Math.cos(a) * v, vy: Math.sin(a) * v, t0: S.now, dur: 0.35, color: 'rgba(210,220,255,0.8)', size: 2.4 });
          }
          if (f.owner >= 0) flyChip(f, sp);
        }
      } else {
        f.alpha -= dt / 0.25;
        if (f.alpha <= 0) S.falling.splice(i, 1);
      }
    }
  }
  /* 落ちたコマが、落とした人の手持ちへ飛んでいく */
  function flyChip(f, sp) {
    const p = S.players[f.owner], el = document.createElement('div'), cv = document.createElement('canvas');
    el.className = 'chip'; el.appendChild(cv);
    RD.drawIcon(cv, f.kind, p.rot[f.kind], CELL);
    const r = p.cells[f.kind].getBoundingClientRect(), u = S.layout.u;
    const from = 'translate(' + sp[0] + 'px,' + sp[1] + 'px) scale(' + (u * 0.8) + ')';
    const to = 'translate(' + (r.left + r.width / 2) + 'px,' + (r.top + r.height / 2) + 'px) scale(' + u + ')';
    el.style.transform = from;
    flyEl.appendChild(el);
    S.chips++;
    const idx = S.chipSeq++ % 9, gen = S.gen;
    let done = false;
    const fin = function () {
      if (done) return;
      done = true; el.remove();
      if (gen !== S.gen) return;                       // 飛んでいる間に試合が変わった
      S.chips--;
      p.stock[f.kind]++; refreshSeat(p);
      const c = p.cells[f.kind]; c.classList.remove('pulse'); void c.offsetWidth; c.classList.add('pulse');
      sfx('back', idx);
    };
    try {
      const an = el.animate([{ transform: from }, { transform: to }], { duration: 460, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' });
      an.onfinish = fin;
    } catch (e) { /* animate が無い環境は下のタイマーだけで進む */ }
    setTimeout(fin, 640);
  }

  /* ---------- 毎フレーム ---------- */
  function update(dt) {
    S.now += dt;
    let ts = 1;
    if (!S.paused) {
      if (S.screen === 'title') { ts = runPhysics(dt); demo(dt); }
      else if (S.phase === 'drop') {
        S.drop.t += dt;
        const u = Math.min(1, S.drop.t / S.drop.dur), g = S.ghost;
        g.z = g.zb + (S.drop.z0 - g.zb) * (1 - u * u);
        if (u >= 1) land();
      } else if (S.phase === 'aim' && S.ghost) {
        /* つまんでいるコマは、下にある面（皿か、コマの上）から少し浮いている。面が変わったら、すっと高さを合わせる */
        const g = S.ghost;
        g.zs += (g.zb - g.zs) * Math.min(1, dt * 18);
        g.z = g.zs + HOVER;
      } else if (S.phase === 'sim') {
        S.simT += dt;
        ts = runPhysics(dt);
        const w = S.world;
        if (((w.quiet > 0.4 && S.simT > 0.5) || S.simT > 18) && !S.falling.length && !S.chips) resolveTurn();
      } else if (S.phase === 'wait') {
        S.wait -= dt;
        if (S.wait <= 0) { const f = S.after; S.after = null; S.phase = 'idle'; if (f) f(); }
      }
      updateFalling(dt * ts);
    }
    for (let i = S.fx.length - 1; i >= 0; i--) if (S.now - S.fx[i].t0 > S.fx[i].dur) S.fx.splice(i, 1);
    S.shake *= Math.pow(0.002, dt);
    const w = S.world;
    let d = 0;
    if (w.bodies.length) d = Math.max(0, Math.min(1, (Math.hypot(w.sx, w.sy) / w.minMu() - 0.6) / 0.4));
    S.danger += (d - S.danger) * Math.min(1, dt * 8);
  }
  const view = { world: null, now: 0, ghost: null, falling: null, fx: null, accent: null, danger: 0, shakeX: 0, shakeY: 0, dim: 0 };
  function render() {
    view.world = S.world; view.now = S.now; view.ghost = S.ghost; view.falling = S.falling; view.fx = S.fx;
    view.accent = S.accent; view.danger = S.danger;
    view.shakeX = (Math.random() - 0.5) * 14 * S.shake; view.shakeY = (Math.random() - 0.5) * 14 * S.shake;
    view.dim = S.screen === 'title' ? 0.3 : 0;
    RD.draw(view);
  }
  function frame(t) {
    const now = t / 1000;
    let dt = now - S.last;
    S.last = now;
    if (dt > 0.1) dt = 0.1; else if (dt < 0) dt = 0;
    /* ★★ 2026-11-17 はじめの画面・準備（全画面）が出ている間は、うしろの皿を動かさない・描かない（電池のため） */
    if (!SU.isFront()) {
      if (!S.manual) update(dt);
      render();
    }
    requestAnimationFrame(frame);
  }

  /* はじめの画面のうしろで、皿が勝手に遊んでいる */
  function demo(dt) {
    const w = S.world;
    S.demoT -= dt;
    if (S.demoT > 0 || w.quiet < 0.3) return;
    const kind = KIND_IDS[Math.random() * KIND_IDS.length | 0], k = KINDS[kind], mean = w.bodies.length >= 11;
    let best = null, bs = mean ? -1 : 1e9;
    for (let i = 0, f = 0; i < 90 && f < 5; i++) {
      const r = mean ? 0.6 + Math.random() * 0.33 : 0.25 + Math.sqrt(Math.random()) * 0.65, th = Math.random() * 6.283;
      const x = r * Math.cos(th), y = r * Math.sin(th), a = (Math.random() * k.rotN | 0) * k.rotStep;
      if (!w.canPlace(kind, x, y, a)) continue;
      f++;
      let mx = k.m * x, my = k.m * y;
      for (const b of w.bodies) { mx += b.m * b.x; my += b.m * b.y; }
      const sc = Math.hypot(mx, my);
      if (mean ? sc > bs : sc < bs) { bs = sc; best = [x, y, a]; }
    }
    if (best) {
      const b = w.land(kind, best[0], best[1], best[2]);
      S.fx.push({ type: 'ring', x: best[0], y: best[1], z: b.z, r: k.rad, grow: 0.1, t0: S.now, dur: 0.4 });
    }
    S.demoT = 1.0 + Math.random() * 0.6;
  }

  /* ---------- 操作：手持ちから皿へ引っぱる ----------
   *  向きの変えかた
   *   ・手持ちをタップ（動かさずに離す）＝ 大きく1段
   *   ・つまんでいる間に、もう1本の指でひねる ＝ 好きな角度 / もう1本の指でタップ ＝ 15度ずつ
   *   ・マウスならホイール、キーボードなら R（Shift+R で逆）・← → */
  seatsEl.addEventListener('pointerdown', function (e) {
    if (S.screen !== 'play' || S.phase !== 'aim' || S.paused || S.drag) return;
    const cell = e.target.closest ? e.target.closest('.cell') : null;
    if (!cell) return;
    const p = S.players[S.cur], kind = cell.dataset.kind;
    if (+cell.dataset.p !== p.i || p.stock[kind] <= 0) return;
    e.preventDefault();
    AU.unlock();
    S.drag = { id: e.pointerId, kind: kind, cell: cell, x0: e.clientX, y0: e.clientY, px: e.clientX, py: e.clientY, moved: false, mouse: e.pointerType === 'mouse', tw: null };
    try { cell.setPointerCapture(e.pointerId); } catch (err) { /* 取れなくても window で受ける */ }
  });
  /* 2本目の指（つまんでいる間だけ）。どこに置いてもよい */
  window.addEventListener('pointerdown', function (e) {
    const d = S.drag;
    if (!d || e.pointerId === d.id || d.tw || S.phase !== 'aim' || S.paused || !KINDS[d.kind].sym) return;
    e.preventDefault();
    d.tw = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, t0: performance.now(), on: false, last: 0 };
  }, true);
  function moveGhost(px, py) {
    const d = S.drag, p = S.players[S.cur], w = S.world;
    const r = p.seat.rot * Math.PI / 180, off = d.mouse ? 0 : Math.max(40, 58 * S.layout.u);
    const pos = RD.screenToPlate(px + Math.sin(r) * off, py - Math.cos(r) * off, w.sx, w.sy);
    const a = p.rot[d.kind], out = Math.hypot(pos.x, pos.y) > 1.1;
    const sp = out ? null : w.spot(d.kind, pos.x, pos.y, a);
    const zb = sp ? sp.z : out ? 0 : w.topAt(pos.x, pos.y);      // 下にある面の高さ
    const zs = S.ghost ? S.ghost.zs : zb;
    S.ghost = {
      kind: d.kind, x: pos.x, y: pos.y, a: a, zb: zb, zs: zs, z: zs + HOVER, ok: !!sp, off: out,
      base: sp ? sp.base : null, spin: !!KINDS[d.kind].sym, tw: !!(d.tw && d.tw.on)
    };
  }
  function refreshGhost() {
    const d = S.drag;
    if (d && d.moved && S.phase === 'aim') moveGhost(d.px, d.py);
  }
  function wrapPi(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; }
  /* 2本の指を結ぶ線の向きが変わったぶんだけ回す（指が近すぎるときは角度があばれるので回さない） */
  function twist(d) {
    const t = d.tw, dx = t.x - d.px, dy = t.y - d.py;
    if (dx * dx + dy * dy < 24 * 24) { t.far = false; return; }
    const ang = Math.atan2(dy, dx), p = S.players[S.cur];
    if (t.far) setRot(p, d.kind, p.rot[d.kind] + wrapPi(ang - t.last));
    t.last = ang; t.far = true;
  }
  window.addEventListener('pointermove', function (e) {
    const d = S.drag;
    if (!d) return;
    if (d.tw && e.pointerId === d.tw.id) {
      const t = d.tw;
      e.preventDefault();
      t.x = e.clientX; t.y = e.clientY;
      /* 置いただけの指（手のひら・となりの人の指）では回さない。その指が自分で動いてから */
      if (!t.on && Math.hypot(t.x - t.x0, t.y - t.y0) > 10) { t.on = true; t.far = false; }
      if (t.on && S.phase === 'aim') { twist(d); refreshGhost(); }
      return;
    }
    if (e.pointerId !== d.id) return;
    e.preventDefault();
    d.px = e.clientX; d.py = e.clientY;
    if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) > 8) { d.moved = true; d.cell.classList.add('lifted'); sfx('lift'); }
    if (S.phase !== 'aim') return;
    if (d.tw && d.tw.on) twist(d);
    if (d.moved) moveGhost(e.clientX, e.clientY);
  }, { passive: false });
  function endDrag(e, cancel) {
    const d = S.drag;
    if (!d) return;
    if (d.tw && e.pointerId === d.tw.id) {            // 2本目の指を離した
      const t = d.tw;
      d.tw = null;
      if (!cancel && !t.on && performance.now() - t.t0 < 450 && S.phase === 'aim') stepRot(S.players[S.cur], d.kind, FINE, 1);
      else refreshGhost();
      return;
    }
    if (e.pointerId !== d.id) return;
    S.drag = null;
    d.cell.classList.remove('lifted');
    if (S.phase !== 'aim') return;
    const p = S.players[S.cur], k = KINDS[d.kind];
    if (cancel) { S.ghost = null; return; }
    if (!d.moved) {                                   // タップ＝向きを変える（大きく1段）
      if (k.sym) stepRot(p, d.kind, k.rotStep, 1);
      return;
    }
    if (S.ghost && S.ghost.ok) startDrop();
    else { if (S.ghost && !S.ghost.off) sfx('bad'); S.ghost = null; }
  }
  window.addEventListener('pointerup', function (e) { endDrag(e, false); });
  window.addEventListener('pointercancel', function (e) { endDrag(e, true); });

  /* マウスとキーボードでの向き変え（つまんでいるコマ。つまんでいなければ、マウスが乗っている手持ち） */
  function turnTarget(e) {
    if (S.screen !== 'play' || S.phase !== 'aim' || S.paused) return null;
    const p = S.players[S.cur];
    let kind = S.drag ? S.drag.kind : null;
    if (!kind && e && e.target && e.target.closest) {
      const cell = e.target.closest('.cell');
      if (cell && +cell.dataset.p === p.i && p.stock[cell.dataset.kind] > 0) kind = cell.dataset.kind;
    }
    return kind && KINDS[kind].sym ? kind : null;
  }
  let wheelAcc = 0;
  window.addEventListener('wheel', function (e) {
    const kind = turnTarget(e);
    if (!kind || !e.deltaY) return;
    e.preventDefault();
    /* マウスのホイールは1目盛りで1段。トラックパッドは細かい値がたくさん来るので、ためてから1段 */
    let n = 0;
    if (e.deltaMode !== 0 || Math.abs(e.deltaY) >= 50) { n = e.deltaY > 0 ? 1 : -1; wheelAcc = 0; }
    else {
      wheelAcc += e.deltaY;
      if (Math.abs(wheelAcc) >= 40) { n = wheelAcc > 0 ? 1 : -1; wheelAcc = 0; }
    }
    if (n) stepRot(S.players[S.cur], kind, FINE, n);
  }, { passive: false });
  window.addEventListener('keydown', function (e) {
    const k = e.key;
    if (k !== 'r' && k !== 'R' && k !== 'ArrowLeft' && k !== 'ArrowRight') return;
    const kind = turnTarget(null);
    if (!kind) return;
    e.preventDefault();
    stepRot(S.players[S.cur], kind, FINE, k === 'R' || k === 'ArrowLeft' ? -1 : 1);
  });

  /* ---------- メニュー ----------
     ★★ 2026-11-17 はじめの画面・準備は setup.js（MagiQuiz と同じ全画面）。ここはゲーム中のメニューだけ */
  function syncMenu() {
    $('mSound').textContent = '効果音：' + (AU.isOn() ? 'ON' : 'OFF');
    const B = GP.Bgm ? GP.Bgm.info() : null;
    $('mBgm').textContent = 'BGM：' + (B ? GP.Bgm.LABEL[B.mode] : 'オフ');
  }
  function setSound(on) { AU.setOn(!!on); save(); syncMenu(); }
  /* setup.js でメンバー・席・手持ちが変わったとき（うしろの札もそろえておく） */
  function applySetup() {
    if (S.screen === 'title') { makePlayers(); buildSeats(true); }
  }
  function initUi() {
    $('howClose').addEventListener('click', function () { AU.tap(); $('howto').classList.add('hidden'); });
    menuBtn.addEventListener('click', function () {
      if (S.screen !== 'play' || S.drag) return;
      AU.tap(); S.paused = true; AU.slide(0); syncMenu(); $('menu').classList.remove('hidden');
    });
    $('mResume').addEventListener('click', function () { AU.tap(); S.paused = false; $('menu').classList.add('hidden'); });
    $('mRestart').addEventListener('click', function () { S.first = 0; startGame(); });
    $('mTitle').addEventListener('click', function () { AU.tap(); toTitle(); });
    $('mHow').addEventListener('click', function () { AU.tap(); $('howto').classList.remove('hidden'); });
    $('mSound').addEventListener('click', function () { AU.setOn(!AU.isOn()); AU.tap(); save(); syncMenu(); });
    /* ★★ 2026-11-17 BGM（オリジナル曲 → 自分の曲 → オフ） */
    $('mBgm').addEventListener('click', function () { if (GP.Bgm) GP.Bgm.next(); AU.tap(); syncMenu(); });
    $('againBtn').addEventListener('click', startGame);
    $('backBtn').addEventListener('click', function () { AU.tap(); toTitle(); });

    const lg = $('legend');
    KIND_IDS.forEach(function (id) {
      const d = document.createElement('div'), c = document.createElement('canvas');
      d.appendChild(c);
      d.insertAdjacentHTML('beforeend', '<b>' + KINDS[id].name + '</b>' + DESC[id]);
      lg.appendChild(d);
      RD.drawIcon(c, id, 0, 50);
    });

    /* 拡大・スクロール・長押しメニューを止める（置く操作のじゃまになる） */
    document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
    document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    document.addEventListener('dblclick', function (e) { e.preventDefault(); });
    document.addEventListener('touchmove', function (e) {
      if (!(e.target.closest && e.target.closest('.panel, #front, .sheet'))) e.preventDefault();   /* ★★ 2026-11-17 はじめの画面・準備（全画面）とシートはスクロールできるように */
    }, { passive: false });
    window.addEventListener('resize', layout);
    window.addEventListener('orientationchange', function () { setTimeout(layout, 250); });
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && S.screen === 'play') wake(); });
  }
  /* 遊んでいる間は画面を消さない（対応している端末だけ） */
  function wake() {
    try { if (navigator.wakeLock) navigator.wakeLock.request('screen').catch(function () {}); } catch (e) { /* 使えなくてもよい */ }
  }

  RD.init($('cv'));
  SU.init();
  load();
  initUi();
  /* ★★ 2026-11-17 setup.js が席の位置を出すときに使う（slotGeom）・メンバーが変わったら札を動かす（applySetup）。toTitle より前に公開する */
  GP.Game = { S: S, slotGeom: slotGeom, applySetup: applySetup, start: startGame, setSound: setSound };
  toTitle();
  requestAnimationFrame(function (t) { S.last = t / 1000; requestAnimationFrame(frame); });

  /* 試験用：いまの番の人が、指定の場所にコマを置く（コマの上なら乗る） */
  function place(kind, x, y, a) {
    const p = S.players[S.cur];
    if (S.screen !== 'play' || S.phase !== 'aim' || p.stock[kind] <= 0) return false;
    const sp = S.world.spot(kind, x, y, a || 0);
    if (!sp) return false;
    S.ghost = { kind: kind, x: x, y: y, a: a || 0, zb: sp.z, zs: sp.z, z: sp.z + HOVER, ok: true, off: false, base: sp.base, spin: false, tw: false };
    startDrop();
    return true;
  }
  GP.Game = { S: S, update: update, render: render, start: startGame, toTitle: toTitle, layout: layout, total: total, place: place, setRot: setRot, slotGeom: slotGeom, applySetup: applySetup, ranks: ranks, setSound: setSound };
})(window);
