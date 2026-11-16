/* MagiGura Plate — 物理エンジン（画面に依存しない）
 *
 *  皿   : 中央の一点で支えられた円盤。傾きは「下り坂の向きと強さ」を表すベクトル s=(sx,sy)（|s| = tanθ）。
 *         (慣性 + コマの慣性) s'' = 重力のモーメント − ばね K·s − 粘性 − 軸のまさつ
 *         コマが増えるほど K が弱くなる（支点より上に重さが乗るため）＝だんだんグラグラになる。
 *  コマ : 皿の面の上をすべる 2D の剛体（円・凸多角形）。皿とのまさつは「止める力に上限がある拘束」として解く。
 *         傾きが静止まさつを越えるとすべり出し、動きだすと動まさつ（小さい）に切りかわる。
 *  重ね : コマの上にもう1つだけ乗せられる（2段まで）。上のコマは、まん中が下のコマの面に乗っている間だけそこにいる。
 *         上のコマのまさつの相手は皿ではなく下のコマ（材質の組み合わせで決まる）。反作用は下のコマが受ける。
 *         まん中が外れると下の段へ下りる。下のコマが落ちれば、支えを失ってその場で下りる。
 *  長さの単位は皿の半径（R = 1）。
 */
(function (root) {
  'use strict';

  var CFG = {
    R: 1,            // 皿の半径
    HUB: 0.17,       // 中央の軸（置けない・ぶつかる）
    G: 10,           // 重力
    K0: 260,         // 空のときのばね
    LCRIT: 70,       // この重さでばねが 0 になる（実際は KMIN で止める）
    KMIN: 0.1,
    IP: 4,           // 皿そのものの慣性
    CVISC: 13,        // 粘性
    CDRY: 0.6,       // 軸のまさつ（小さなゆれを止める）
    SMAX: 0.62,      // これ以上は傾かない（土台に当たる）
    STOP_E: 0.25,
    C0: 0.16,        // 支点から皿の面までの高さ
    DROP_V: 1.3,     // コマが落ちてくる速さ
    DT: 1 / 240,
    ITER: 10,
    MU_PP: 0.25,     // コマどうしのまさつ
    REST: 0.1,       // コマどうしのはねかえり
    V_SLIP: 0.02,    // これより速いと「すべっている」
    V_STICK: 0.004,
    BAUM: 0.2, SLOP: 0.002, MAXBIAS: 1.5,
    /* --- 重ね置き --- */
    STACK: true,     // コマの上に置けるか（試験で false にすると、重ねない昔のルールになる）
    SUP_IN: 0.02,    // 乗せるとき、まん中がこれだけ下のコマの内側に入っていること
    MU_REF: 0.34,    // 上に乗せても、皿の上と同じすべりやすさになる材質のまさつ（木）。これより小さい材質の上はすべる
    TALL: 0.025,     // 上の段のコマは、自分の底よりこれ以上背の高いとなりのコマにはぶつかる
    ZLOAD: 4,        // 高い所の重さは皿をよけいにグラグラにする（重さ ×(1 + ZLOAD·高さ) として数える。物理どおりなら 2.7。少し強め）
    RIDE_SWEEP: 3,   // 上下のまさつを解く回数（1回の反復の中で）
    SOFT_BIAS: 0.35, // 下りてきたコマが、重なりからぬけ出す速さ
    ZV: 0.9          // 見た目の高さが変わる速さ
  };

  function rect(w, h) {
    var a = w / 2, b = h / 2;
    return [[-a, -b], [a, -b], [a, b], [-a, b]];
  }
  function regPoly(n, r, a0) {
    var v = [];
    for (var i = 0; i < n; i++) {
      var a = a0 + i * 2 * Math.PI / n;
      v.push([r * Math.cos(a), r * Math.sin(a)]);
    }
    return v;
  }

  /* コマの種類。pips = 重さの目（上の面に点で描く）
   * 向き：sym = この角度だけ回すと元の形にもどる / rotStep = 手持ちをタップしたときの1段 / rotN = その段の数 */
  var KINDS = {
    disc:   { name: '木の丸', mat: 'wood',   shape: 'circle', r: 0.125, h: 0.10, m: 2, mus: 0.34, muk: 0.25, rotN: 1, rotStep: 0, sym: 0 },
    iron:   { name: '鉄',     mat: 'iron',   shape: 'circle', r: 0.15,  h: 0.16, m: 5, mus: 0.30, muk: 0.22, rotN: 1, rotStep: 0, sym: 0 },
    ice:    { name: '氷',     mat: 'ice',    shape: 'poly', verts: regPoly(3, 0.19, -Math.PI / 2), h: 0.09, m: 2, mus: 0.16, muk: 0.07, rotN: 4, rotStep: Math.PI / 6, sym: Math.PI * 2 / 3 },
    bar:    { name: '木の棒', mat: 'wood',   shape: 'poly', verts: rect(0.46, 0.13), h: 0.10, m: 3, mus: 0.34, muk: 0.25, rotN: 4, rotStep: Math.PI / 4, sym: Math.PI },
    rubber: { name: 'ゴム',   mat: 'rubber', shape: 'poly', verts: rect(0.23, 0.23), h: 0.12, m: 2, mus: 0.55, muk: 0.45, rotN: 2, rotStep: Math.PI / 4, sym: Math.PI / 2 }
  };
  var KIND_IDS = ['disc', 'iron', 'ice', 'bar', 'rubber'];

  (function prepare() {
    for (var id in KINDS) {
      var k = KINDS[id];
      k.id = id;
      if (k.shape === 'circle') {
        k.area = Math.PI * k.r * k.r;
        k.I = 0.5 * k.m * k.r * k.r;
        k.rad = k.r;
      } else {
        var v = k.verts, n = v.length, i, j, A = 0;
        for (i = 0; i < n; i++) { j = (i + 1) % n; A += v[i][0] * v[j][1] - v[j][0] * v[i][1]; }
        if (A < 0) { v.reverse(); A = -A; }            // 向きをそろえる
        k.area = A / 2;
        var num = 0, den = 0, rad = 0;
        for (i = 0; i < n; i++) {
          j = (i + 1) % n;
          var cr = v[i][0] * v[j][1] - v[j][0] * v[i][1];
          num += cr * (v[i][0] * v[i][0] + v[i][1] * v[i][1] + v[i][0] * v[j][0] + v[i][1] * v[j][1] + v[j][0] * v[j][0] + v[j][1] * v[j][1]);
          den += cr;
          rad = Math.max(rad, Math.sqrt(v[i][0] * v[i][0] + v[i][1] * v[i][1]));
        }
        k.I = k.m * num / (6 * den);
        k.rad = rad;
        k.n = n;
        k.lx = []; k.ly = []; k.lnx = []; k.lny = [];
        for (i = 0; i < n; i++) {
          j = (i + 1) % n;
          var ex = v[j][0] - v[i][0], ey = v[j][1] - v[i][1], el = Math.sqrt(ex * ex + ey * ey);
          k.lx.push(v[i][0]); k.ly.push(v[i][1]);
          k.lnx.push(ey / el); k.lny.push(-ex / el);     // 外向きの法線
        }
      }
      k.rEff = 0.9 * Math.sqrt(k.I / k.m);               // 回転を止めるまさつの腕の長さ
    }
  })();

  var uid = 0;
  function makeBody(kindId, x, y, a) {
    var k = KINDS[kindId];
    var b = {
      id: ++uid, kind: kindId, k: k, x: x, y: y, a: a || 0, vx: 0, vy: 0, w: 0,
      m: k.m, im: 1 / k.m, I: k.I, iI: 1 / k.I, rad: k.rad, circle: k.shape === 'circle',
      sliding: false, gn: CFG.G, lmax: 0, amax: 0, fx: 0, fy: 0, fa: 0, age: 0,
      /* 重ね置き：z = 底の高さ（皿の面が 0）, zr = 見た目の高さ, base = 乗っている相手, riders = 自分に乗っているコマ,
         carry = 乗っているコマの重さの合計, mus/muk = いまの相手とのまさつ, soft = 下りてきて重なりをほどいている最中 */
      z: 0, zr: 0, base: null, riders: null, carry: 0, mus: k.mus, muk: k.muk, soft: false, softHit: false
    };
    if (!b.circle) { b.wx = new Array(k.n); b.wy = new Array(k.n); b.nx = new Array(k.n); b.ny = new Array(k.n); }
    updateWorld(b);
    return b;
  }
  /* 点 (px,py) が、コマ b を上から見た形のどれだけ内側にあるか（負＝内側・正＝外側） */
  function sdist(b, px, py) {
    if (b.circle) { var dx = px - b.x, dy = py - b.y; return Math.sqrt(dx * dx + dy * dy) - b.rad; }
    var best = -Infinity;
    for (var i = 0; i < b.k.n; i++) {
      var s = b.nx[i] * (px - b.wx[i]) + b.ny[i] * (py - b.wy[i]);
      if (s > best) best = s;
    }
    return best;
  }
  /* u を base の上に乗せる。まさつは、下のコマの材質のぶんだけ変わる：
     木の上＝皿の上と同じ / 氷の上＝半分以下（よくすべる） / ゴムの上＝1.6倍（止まる） / 鉄の上＝少しすべる */
  function mount(u, base) {
    u.base = base; u.z = base.k.h;
    (base.riders || (base.riders = [])).push(u);
    base.carry += u.m;
    var f = base.k.mus / CFG.MU_REF;
    u.mus = u.k.mus * f; u.muk = u.k.muk * f;
  }
  /* ぶつかる組み合わせか。同じ段どうしはぶつかる。段がちがうときは、下の段のコマが十分に背が高いときだけ */
  function hits(a, b) {
    var la = a.base ? 1 : 0, lb = b.base ? 1 : 0;
    if (la === lb) return true;
    if (la) return b !== a.base && b.k.h > a.z + CFG.TALL;
    return a !== b.base && a.k.h > b.z + CFG.TALL;
  }
  function updateWorld(b) {
    if (b.circle) return;
    var k = b.k, c = Math.cos(b.a), s = Math.sin(b.a);
    for (var i = 0; i < k.n; i++) {
      b.wx[i] = b.x + c * k.lx[i] - s * k.ly[i];
      b.wy[i] = b.y + s * k.lx[i] + c * k.ly[i];
      b.nx[i] = c * k.lnx[i] - s * k.lny[i];
      b.ny[i] = s * k.lnx[i] + c * k.lny[i];
    }
  }

  /* ---------- 当たり判定（法線は A → B、margin より近ければ接触として返す） ---------- */
  function addC(out, A, B, px, py, nx, ny, pen) {
    out.push({ A: A, B: B, px: px, py: py, nx: nx, ny: ny, pen: pen, jn: 0, jt: 0 });
  }
  function circleCircle(A, B, out, margin) {
    var dx = B.x - A.x, dy = B.y - A.y, d2 = dx * dx + dy * dy, rs = A.rad + B.rad;
    if (d2 >= (rs + margin) * (rs + margin)) return;
    var d = Math.sqrt(d2), nx = 1, ny = 0;
    if (d > 1e-9) { nx = dx / d; ny = dy / d; }
    var pen = rs - d;
    addC(out, A, B, A.x + nx * (A.rad - pen / 2), A.y + ny * (A.rad - pen / 2), nx, ny, pen);
  }
  function polyCircle(A, B, out, margin, flip) {      // A = 多角形, B = 円
    var n = A.k.n, best = -Infinity, bi = 0, i;
    for (i = 0; i < n; i++) {
      var s = A.nx[i] * (B.x - A.wx[i]) + A.ny[i] * (B.y - A.wy[i]);
      if (s > B.rad + margin) return;
      if (s > best) { best = s; bi = i; }
    }
    var i2 = (bi + 1) % n;
    var v1x = A.wx[bi], v1y = A.wy[bi], v2x = A.wx[i2], v2y = A.wy[i2];
    var nx, ny, pen;
    if (best < 1e-9) {                                  // 中心が多角形の中
      nx = A.nx[bi]; ny = A.ny[bi]; pen = B.rad - best;
    } else {
      var u1 = (B.x - v1x) * (v2x - v1x) + (B.y - v1y) * (v2y - v1y);
      var u2 = (B.x - v2x) * (v1x - v2x) + (B.y - v2y) * (v1y - v2y);
      var qx, qy;
      if (u1 <= 0) { qx = v1x; qy = v1y; } else if (u2 <= 0) { qx = v2x; qy = v2y; } else { qx = NaN; }
      if (qx === qx) {                                  // 角に当たっている
        var dx = B.x - qx, dy = B.y - qy, d = Math.sqrt(dx * dx + dy * dy);
        if (d > B.rad + margin) return;
        if (d > 1e-9) { nx = dx / d; ny = dy / d; } else { nx = A.nx[bi]; ny = A.ny[bi]; }
        pen = B.rad - d;
      } else {
        nx = A.nx[bi]; ny = A.ny[bi]; pen = B.rad - best;
      }
    }
    var px = B.x - nx * (B.rad - pen / 2), py = B.y - ny * (B.rad - pen / 2);
    if (flip) addC(out, B, A, px, py, -nx, -ny, pen); else addC(out, A, B, px, py, nx, ny, pen);
  }
  var _sepI = 0;
  function maxSep(A, B) {
    var n = A.k.n, m = B.k.n, best = -Infinity;
    for (var i = 0; i < n; i++) {
      var nx = A.nx[i], ny = A.ny[i], vx = A.wx[i], vy = A.wy[i], si = Infinity;
      for (var j = 0; j < m; j++) {
        var d = nx * (B.wx[j] - vx) + ny * (B.wy[j] - vy);
        if (d < si) si = d;
      }
      if (si > best) { best = si; _sepI = i; }
    }
    return best;
  }
  function polyPoly(A, B, out, margin) {
    var sa = maxSep(A, B), ia = _sepI; if (sa > margin) return;
    var sb = maxSep(B, A), ib = _sepI; if (sb > margin) return;
    var ref, inc, ri, flip;
    if (sb > sa + 1e-4) { ref = B; inc = A; ri = ib; flip = true; } else { ref = A; inc = B; ri = ia; flip = false; }
    var n = ref.k.n, m = inc.k.n, nx = ref.nx[ri], ny = ref.ny[ri];
    var best = Infinity, ii = 0, j;
    for (j = 0; j < m; j++) { var d = inc.nx[j] * nx + inc.ny[j] * ny; if (d < best) { best = d; ii = j; } }
    var i2 = (ii + 1) % m, r2 = (ri + 1) % n;
    var p1x = inc.wx[ii], p1y = inc.wy[ii], p2x = inc.wx[i2], p2y = inc.wy[i2];
    var v1x = ref.wx[ri], v1y = ref.wy[ri], v2x = ref.wx[r2], v2y = ref.wy[r2];
    var tx = v2x - v1x, ty = v2y - v1y, tl = Math.sqrt(tx * tx + ty * ty); tx /= tl; ty /= tl;
    var d1 = tx * (p1x - v1x) + ty * (p1y - v1y), d2 = tx * (p2x - v1x) + ty * (p2y - v1y), f;
    if (d1 < 0 && d2 < 0) return;
    if (d1 < 0) { f = d1 / (d1 - d2); p1x += (p2x - p1x) * f; p1y += (p2y - p1y) * f; }
    else if (d2 < 0) { f = d2 / (d2 - d1); p2x += (p1x - p2x) * f; p2y += (p1y - p2y) * f; }
    d1 = tx * (p1x - v2x) + ty * (p1y - v2y); d2 = tx * (p2x - v2x) + ty * (p2y - v2y);
    if (d1 > 0 && d2 > 0) return;
    if (d1 > 0) { f = d1 / (d1 - d2); p1x += (p2x - p1x) * f; p1y += (p2y - p1y) * f; }
    else if (d2 > 0) { f = d2 / (d2 - d1); p2x += (p1x - p2x) * f; p2y += (p1y - p2y) * f; }
    var a = flip ? inc : ref, b = flip ? ref : inc, cx = flip ? -nx : nx, cy = flip ? -ny : ny;
    var s1 = nx * (p1x - v1x) + ny * (p1y - v1y), s2 = nx * (p2x - v1x) + ny * (p2y - v1y);
    if (s1 <= margin) addC(out, a, b, p1x - nx * s1 / 2, p1y - ny * s1 / 2, cx, cy, -s1);
    if (s2 <= margin) addC(out, a, b, p2x - nx * s2 / 2, p2y - ny * s2 / 2, cx, cy, -s2);
  }
  function collide(A, B, out, margin) {
    if (A.circle) {
      if (B.circle) circleCircle(A, B, out, margin); else polyCircle(B, A, out, margin, true);
    } else {
      if (B.circle) polyCircle(A, B, out, margin, false); else polyPoly(A, B, out, margin);
    }
  }

  /* ---------- 世界 ---------- */
  function World() {
    this.bodies = [];
    this.sx = 0; this.sy = 0;       // 傾き
    this.vx = 0; this.vy = 0;       // 傾きの速さ
    this.ax = 0; this.ay = 0;       // 傾きの加速度（直前の1歩）
    this.K = CFG.K0; this.load = 0;
    this.time = 0; this.quiet = 0;
    this.fallen = [];               // 落ちたコマ（呼び出し側が読んで空にする）
    this.hitMax = 0;                // この1歩でいちばん強かった衝突（音用）
    this.stopHit = 0;               // 土台に当たった強さ（音用）
    this.dropped = null;            // この1歩で、上の段から下りたコマ（音用）
    this.hub = { id: 0, x: 0, y: 0, vx: 0, vy: 0, w: 0, a: 0, rad: CFG.HUB, circle: true, im: 0, iI: 0, m: 0, I: 0, hub: true };
    this._cs = [];
  }

  /* 皿のばね（重いほど弱い。高い所に乗った重さは、そのぶんよけいに効く） */
  World.prototype.stiffness = function () {
    var L = 0, Le = 0, bs = this.bodies;
    for (var i = 0; i < bs.length; i++) { L += bs[i].m; Le += bs[i].m * (1 + CFG.ZLOAD * bs[i].z); }
    this.load = L;
    this.K = CFG.K0 * Math.max(CFG.KMIN, 1 - Le / CFG.LCRIT);
    return this.K;
  };

  /* 皿とのまさつ（上限つき）：止まろうとする */
  function ground(b) {
    var ox = b.fx, oy = b.fy, qx = ox - b.m * b.vx, qy = oy - b.m * b.vy;
    var ql = Math.sqrt(qx * qx + qy * qy);
    if (ql > b.lmax) { var sc = ql > 0 ? b.lmax / ql : 0; qx *= sc; qy *= sc; }
    b.vx += (qx - ox) * b.im; b.vy += (qy - oy) * b.im; b.fx = qx; b.fy = qy;
    var oa = b.fa, qa = oa - b.I * b.w;
    if (qa > b.amax) qa = b.amax; else if (qa < -b.amax) qa = -b.amax;
    b.w += (qa - oa) * b.iI; b.fa = qa;
  }
  /* 上のコマ u と下のコマ b のまさつ（上限つき）：u は、b の面の「自分の真下の点」と同じ動きをしようとする。
     力は u のまん中にかかり、b は同じ大きさで逆向きの力を、その点に受ける（回される） */
  function ride(u, b) {
    var rx = u.x - b.x, ry = u.y - b.y;
    var dvx = u.vx - (b.vx - b.w * ry), dvy = u.vy - (b.vy + b.w * rx);
    var a = u.im + b.im, k11 = a + b.iI * ry * ry, k12 = -b.iI * rx * ry, k22 = a + b.iI * rx * rx;
    var det = k11 * k22 - k12 * k12;
    var px = -(k22 * dvx - k12 * dvy) / det, py = -(k11 * dvy - k12 * dvx) / det;
    var ox = u.fx, oy = u.fy, qx = ox + px, qy = oy + py, ql = Math.sqrt(qx * qx + qy * qy);
    if (ql > u.lmax) { var sc = ql > 0 ? u.lmax / ql : 0; qx *= sc; qy *= sc; }
    px = qx - ox; py = qy - oy; u.fx = qx; u.fy = qy;
    u.vx += px * u.im; u.vy += py * u.im;
    b.vx -= px * b.im; b.vy -= py * b.im; b.w -= (rx * py - ry * px) * b.iI;
    var oa = u.fa, qa = oa - (u.w - b.w) / (u.iI + b.iI);
    if (qa > u.amax) qa = u.amax; else if (qa < -u.amax) qa = -u.amax;
    var la = qa - oa; u.fa = qa;
    u.w += la * u.iI; b.w -= la * b.iI;
  }

  World.prototype.step = function () {
    var dt = CFG.DT, bs = this.bodies, n = bs.length, i, j, b, o;
    var sx = this.sx, sy = this.sy, vx = this.vx, vy = this.vy;

    /* --- 皿 --- */
    var Mx = 0, My = 0, L = 0, Le = 0, Txx = CFG.IP, Tyy = CFG.IP, Txy = 0;
    for (i = 0; i < n; i++) {
      b = bs[i];
      Mx += b.m * b.x; My += b.m * b.y; L += b.m; Le += b.m * (1 + CFG.ZLOAD * b.z);
      Txx += b.m * b.x * b.x; Tyy += b.m * b.y * b.y; Txy += b.m * b.x * b.y;
    }
    this.load = L;
    var K = this.K = CFG.K0 * Math.max(CFG.KMIN, 1 - Le / CFG.LCRIT);
    var cosT = 1 / Math.sqrt(1 + sx * sx + sy * sy);
    var tx = CFG.G * Mx * cosT - K * sx - CFG.CVISC * vx;
    var ty = CFG.G * My * cosT - K * sy - CFG.CVISC * vy;
    var det = Txx * Tyy - Txy * Txy;
    var nvx = vx + (Tyy * tx - Txy * ty) / det * dt;
    var nvy = vy + (Txx * ty - Txy * tx) / det * dt;
    var sp = Math.sqrt(nvx * nvx + nvy * nvy), ux, uy;
    if (sp > 0) {                                       // 軸のまさつ
      ux = nvx / sp; uy = nvy / sp;
      var Iu = Txx * ux * ux + 2 * Txy * ux * uy + Tyy * uy * uy;
      var dv = CFG.CDRY * dt / Iu;
      if (dv >= sp) { nvx = 0; nvy = 0; } else { nvx -= ux * dv; nvy -= uy * dv; }
    }
    this.ax = (nvx - vx) / dt; this.ay = (nvy - vy) / dt;
    vx = nvx; vy = nvy;
    sx += vx * dt; sy += vy * dt;
    this.stopHit = 0;
    var sm = Math.sqrt(sx * sx + sy * sy);
    if (sm > CFG.SMAX) {                                // 土台に当たる
      ux = sx / sm; uy = sy / sm; sx = ux * CFG.SMAX; sy = uy * CFG.SMAX;
      var vr = vx * ux + vy * uy;
      if (vr > 0) { vx -= (1 + CFG.STOP_E) * vr * ux; vy -= (1 + CFG.STOP_E) * vr * uy; this.stopHit = vr; }
    }
    this.sx = sx; this.sy = sy; this.vx = vx; this.vy = vy;

    /* --- コマ：坂の重力と、皿のゆれによる力 --- */
    cosT = 1 / Math.sqrt(1 + sx * sx + sy * sy);
    var gx = CFG.G * sx * cosT, gy = CFG.G * sy * cosT, gz = CFG.G * cosT;
    this.dropped = null;
    /* すべっているか（上の段のコマは、下のコマに対しての動きで見る） */
    for (i = 0; i < n; i++) {
      b = bs[i]; o = b.base;
      var qvx = b.vx, qvy = b.vy;
      if (o) { qvx -= o.vx - o.w * (b.y - o.y); qvy -= o.vy + o.w * (b.x - o.x); }
      var v2 = qvx * qvx + qvy * qvy;
      if (b.sliding) { if (v2 < CFG.V_STICK * CFG.V_STICK) b.sliding = false; }
      else if (v2 > CFG.V_SLIP * CFG.V_SLIP) b.sliding = true;
    }
    for (i = 0; i < n; i++) {
      b = bs[i];
      var hz = CFG.C0 + b.z;                                        // 支点からの高さ（高いほど皿のゆれで大きく振られる）
      b.vx += (gx - hz * this.ax) * dt; b.vy += (gy - hz * this.ay) * dt;
      b.gn = Math.max(0, gz - (this.ax * b.x + this.ay * b.y));     // 面を押す強さ（皿が下がると軽くなる）
      b.lmax = (b.sliding ? b.muk : b.mus) * (b.m + b.carry) * b.gn * dt;   // 下のコマは、乗っているぶんも押しつけられる
      b.amax = b.lmax * b.k.rEff;
      b.fx = 0; b.fy = 0; b.fa = 0;
      b.age += dt;
      if (b.soft) b.softHit = false;
      updateWorld(b);
    }

    /* --- 接触をさがす --- */
    var cs = this._cs; cs.length = 0;
    var hub = this.hub, c;
    for (i = 0; i < n; i++) {
      b = bs[i];
      for (j = i + 1; j < n; j++) {
        o = bs[j];
        if (!hits(b, o)) continue;
        var ddx = o.x - b.x, ddy = o.y - b.y, rr = b.rad + o.rad;
        if (ddx * ddx + ddy * ddy < rr * rr) collide(b, o, cs, 0);
      }
      if (b.base) continue;                                         // 上の段は、軸の上を通りすぎる
      var hr = b.rad + hub.rad;
      if (b.x * b.x + b.y * b.y < hr * hr) collide(hub, b, cs, 0);
    }
    var nc = cs.length;
    for (i = 0; i < nc; i++) {
      c = cs[i];
      var A = c.A, B = c.B;
      c.rAx = c.px - A.x; c.rAy = c.py - A.y; c.rBx = c.px - B.x; c.rBy = c.py - B.y;
      var rnA = c.rAx * c.ny - c.rAy * c.nx, rnB = c.rBx * c.ny - c.rBy * c.nx;
      c.kn = A.im + B.im + A.iI * rnA * rnA + B.iI * rnB * rnB;
      var rtA = c.rAx * c.nx + c.rAy * c.ny, rtB = c.rBx * c.nx + c.rBy * c.ny;
      c.kt = A.im + B.im + A.iI * rtA * rtA + B.iI * rtB * rtB;
      var rvx = B.vx - B.w * c.rBy - A.vx + A.w * c.rAy, rvy = B.vy + B.w * c.rBx - A.vy - A.w * c.rAx;
      var vn = rvx * c.nx + rvy * c.ny;
      if (A.soft || B.soft) {
        /* 上の段から下りてきたコマは、下のコマと深く重なっている。はじき飛ばさず、ゆっくり押し出す */
        c.bias = Math.min(CFG.SOFT_BIAS, CFG.BAUM / dt * Math.max(0, c.pen - CFG.SLOP));
        if (c.pen > 2 * CFG.SLOP) { A.softHit = true; B.softHit = true; }
      } else {
        c.bias = Math.min(CFG.MAXBIAS, CFG.BAUM / dt * Math.max(0, c.pen - CFG.SLOP));
        if (vn < -0.5) c.bias = Math.max(c.bias, -CFG.REST * vn);
      }
      c.vn0 = vn;
    }
    for (i = 0; i < n; i++) { b = bs[i]; if (b.soft && !b.softHit) b.soft = false; }   // 重なりがほどけた

    /* --- 拘束を解く：皿とのまさつ（上限つき）・上下のまさつ → コマどうしの接触 --- */
    for (var it = 0; it < CFG.ITER; it++) {
      for (i = 0; i < n; i++) {
        b = bs[i];
        if (b.base) continue;
        ground(b);
        var rs = b.riders;
        if (rs && rs.length) {
          /* 下のコマが止まる → 上のコマが合わせる、を何回かくり返す（1回ずつだと、重い物が乗ったときに解き残しが出る） */
          for (var sw = 0; sw < CFG.RIDE_SWEEP; sw++) {
            for (j = 0; j < rs.length; j++) ride(rs[j], b);
            ground(b);
          }
        }
      }
      for (i = 0; i < nc; i++) {
        c = cs[i]; A = c.A; B = c.B;
        var nx = c.nx, ny = c.ny;
        rvx = B.vx - B.w * c.rBy - A.vx + A.w * c.rAy; rvy = B.vy + B.w * c.rBx - A.vy - A.w * c.rAx;
        var dj = (c.bias - (rvx * nx + rvy * ny)) / c.kn, j0 = c.jn;
        c.jn = Math.max(j0 + dj, 0); dj = c.jn - j0;
        var ix = dj * nx, iy = dj * ny;
        A.vx -= ix * A.im; A.vy -= iy * A.im; A.w -= (c.rAx * iy - c.rAy * ix) * A.iI;
        B.vx += ix * B.im; B.vy += iy * B.im; B.w += (c.rBx * iy - c.rBy * ix) * B.iI;
        rvx = B.vx - B.w * c.rBy - A.vx + A.w * c.rAy; rvy = B.vy + B.w * c.rBx - A.vy - A.w * c.rAx;
        var tgx = -ny, tgy = nx;
        var djt = -(rvx * tgx + rvy * tgy) / c.kt, mf = CFG.MU_PP * c.jn, t0 = c.jt;
        c.jt = Math.max(-mf, Math.min(mf, t0 + djt)); djt = c.jt - t0;
        ix = djt * tgx; iy = djt * tgy;
        A.vx -= ix * A.im; A.vy -= iy * A.im; A.w -= (c.rAx * iy - c.rAy * ix) * A.iI;
        B.vx += ix * B.im; B.vy += iy * B.im; B.w += (c.rBx * iy - c.rBy * ix) * B.iI;
      }
    }
    var hm = 0;
    for (i = 0; i < nc; i++) { c = cs[i]; if (c.vn0 < -0.15 && c.jn > hm) hm = c.jn; }
    this.hitMax = hm;

    /* --- 位置を進める・ふちを越えたら落ちる --- */
    /* 「静まった」の目安：はさまったコマに残るごく小さな速さ（解き残し）は動きとみなさない */
    var still = (vx * vx + vy * vy) < 1e-8;
    for (i = n - 1; i >= 0; i--) {
      b = bs[i];
      if (b.vx * b.vx + b.vy * b.vy < 1e-10) { b.vx = 0; b.vy = 0; }
      if (b.w * b.w < 1e-8) b.w = 0;
      if (b.vx * b.vx + b.vy * b.vy > 2.5e-7 || b.w * b.w > 2.5e-5) still = false;
      b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.w * dt;
      if (b.x * b.x + b.y * b.y > CFG.R * CFG.R) {
        bs.splice(i, 1);
        this._unlink(b);
        this.fallen.push({ body: b, sx: sx, sy: sy, t: this.time });
        still = false;
      }
    }
    /* --- 上の段：まん中が下のコマから外れたら下りる。見た目の高さは少しずつ追いつく --- */
    var dz = CFG.ZV * dt;
    for (i = 0; i < bs.length; i++) {
      b = bs[i];
      if (b.base && sdist(b.base, b.x, b.y) > 0) { this._leave(b); still = false; }
      if (b.zr !== b.z) {
        b.zr = b.zr < b.z ? Math.min(b.z, b.zr + dz) : Math.max(b.z, b.zr - dz);
        still = false;
      }
    }
    this.time += dt;
    this.quiet = still ? this.quiet + dt : 0;
  };

  /* 上の段のコマ u が、下のコマから外れた。となりの（背の高くない）コマの上にまん中が来ていればそちらへ移る。
     そうでなければ皿の面へ下りる。どちらも、下りた先で他のコマと重なっているので soft にしてゆっくりほどく */
  World.prototype._leave = function (u) {
    var old = u.base, bs = this.bodies, i, o, nb = null;
    for (i = 0; i < bs.length; i++) {
      o = bs[i];
      if (o === old || o === u || o.base || o.k.h > u.z + CFG.TALL) continue;
      var dx = u.x - o.x, dy = u.y - o.y;
      if (dx * dx + dy * dy < o.rad * o.rad && sdist(o, u.x, u.y) < 0) { nb = o; break; }
    }
    if (old) {
      i = old.riders.indexOf(u);
      if (i >= 0) old.riders.splice(i, 1);
      old.carry -= u.m;
    }
    u.base = null; u.soft = true;
    if (nb) mount(u, nb);
    else { u.z = 0; u.mus = u.k.mus; u.muk = u.k.muk; }
    this.dropped = u;
  };
  /* b が皿から落ちた：上下のつながりを切る（乗っていたコマは支えを失って下りる） */
  World.prototype._unlink = function (b) {
    var o = b.base, i;
    if (o) {
      i = o.riders.indexOf(b);
      if (i >= 0) o.riders.splice(i, 1);
      o.carry -= b.m; b.base = null;
    }
    var rs = b.riders;
    if (rs) while (rs.length) this._leave(rs[rs.length - 1]);
  };

  /* コマが皿に落ちてきた（落下の勢いで皿がゆれる）。コマの上なら、その上に乗る */
  World.prototype.land = function (kindId, x, y, a) {
    var sp = this.spot(kindId, x, y, a);
    var b = makeBody(kindId, x, y, a), bs = this.bodies;
    if (sp && sp.base) { mount(b, sp.base); b.zr = b.z; }
    bs.push(b);
    var Txx = CFG.IP, Tyy = CFG.IP, Txy = 0;
    for (var i = 0; i < bs.length; i++) {
      var o = bs[i];
      Txx += o.m * o.x * o.x; Tyy += o.m * o.y * o.y; Txy += o.m * o.x * o.y;
    }
    var jx = b.m * CFG.DROP_V * x, jy = b.m * CFG.DROP_V * y, det = Txx * Tyy - Txy * Txy;
    this.vx += (Tyy * jx - Txy * jy) / det;
    this.vy += (Txx * jy - Txy * jx) / det;
    this.quiet = 0;
    return b;
  };

  /* そこに置けるか。置けるなら { base: 乗る相手（皿の面なら null）, z: 底の高さ } を返す。置けなければ null。
   *  ・皿の内側であること
   *  ・まん中がコマの上なら、そのコマに乗せる（2段まで。まん中が SUP_IN 以上内側。上の段のコマ・背の高いとなりと重ならない）
   *  ・そうでなければ皿の面に置く（軸・どの段のコマとも重ならない） */
  var CLEAR = 0.012;
  World.prototype.spot = function (kindId, x, y, a) {
    var k = KINDS[kindId], R = CFG.R - 0.015, i, o, bs = this.bodies;
    var t = this._probe && this._probe.kind === kindId ? this._probe : (this._probe = makeBody(kindId, 0, 0, 0));
    t.x = x; t.y = y; t.a = a || 0; updateWorld(t);
    if (t.circle) {
      if (Math.sqrt(x * x + y * y) + k.r > R) return null;
    } else {
      for (i = 0; i < k.n; i++) if (t.wx[i] * t.wx[i] + t.wy[i] * t.wy[i] > R * R) return null;
    }
    var base = null;
    if (CFG.STACK) {
      for (i = 0; i < bs.length; i++) {
        o = bs[i];
        var bx = x - o.x, by = y - o.y;
        if (bx * bx + by * by >= o.rad * o.rad) continue;
        updateWorld(o);
        if (sdist(o, x, y) >= 0) continue;
        if (o.base) return null;                        // 3段目は置けない
        base = o;
      }
      if (base && sdist(base, x, y) > -CFG.SUP_IN) return null;
    }
    t.base = base; t.z = base ? base.k.h : 0;
    var out = [];
    if (!base) { collide(this.hub, t, out, CLEAR); if (out.length) return null; }
    for (i = 0; i < bs.length; i++) {
      o = bs[i];
      /* コマは上から下りてくるので、皿の面に置くときは、上の段のコマの下へもぐりこめない（全部と比べる） */
      if (o === base || (base && !hits(t, o))) continue;
      var dx = o.x - x, dy = o.y - y, rr = o.rad + t.rad + CLEAR;
      if (dx * dx + dy * dy < rr * rr) { collide(o, t, out, CLEAR); if (out.length) return null; }
    }
    return { base: base, z: t.z };
  };
  World.prototype.canPlace = function (kindId, x, y, a) { return this.spot(kindId, x, y, a) !== null; };

  /* その点の真上から見て、いちばん高い面の高さ（置けない所でつまんでいるコマを、めり込ませずに見せるため） */
  World.prototype.topAt = function (x, y) {
    var h = 0, bs = this.bodies;
    for (var i = 0; i < bs.length; i++) {
      var o = bs[i], dx = x - o.x, dy = y - o.y;
      if (dx * dx + dy * dy < o.rad * o.rad && sdist(o, x, y) < 0) h = Math.max(h, o.z + o.k.h);
    }
    return h;
  };

  /* いま止まっているとして、つり合う傾きの大きさ（表示・試験用） */
  World.prototype.staticTilt = function () {
    var Mx = 0, My = 0, bs = this.bodies;
    for (var i = 0; i < bs.length; i++) { Mx += bs[i].m * bs[i].x; My += bs[i].m * bs[i].y; }
    var K = this.stiffness();
    return { x: CFG.G * Mx / K, y: CFG.G * My / K, mag: CFG.G * Math.sqrt(Mx * Mx + My * My) / K };
  };

  /* 皿の上でいちばんすべりやすいコマの静止まさつ（危険の表示用。上の段のコマは、下のコマとのまさつ） */
  World.prototype.minMu = function () {
    var m = Infinity, bs = this.bodies;
    for (var i = 0; i < bs.length; i++) if (bs[i].mus < m) m = bs[i].mus;
    return m;
  };

  root.GP = root.GP || {};
  root.GP.CFG = CFG;
  root.GP.KINDS = KINDS;
  root.GP.KIND_IDS = KIND_IDS;
  root.GP.World = World;
  root.GP.makeBody = makeBody;
  root.GP.sdist = sdist;
})(typeof window !== 'undefined' ? window : globalThis);
