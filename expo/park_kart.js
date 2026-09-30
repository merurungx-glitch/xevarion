/* ══════════════════════════════════════════════════════════════════
   XEVARION PARK — 妖怪スカイグランプリ（カートレース）★★ 2026-09-30 ご指定
   「カーレースを実際のマリオカートのような仕組みとデザインにしてください。また、勝負もできるようにして、
    コースは斜めや傾きや高低差がある楽しいコースに」
   ------------------------------------------------------------------
   ・パークの上空 260m に浮かぶ専用コース（8の字・立体交差・バンクのついたカーブ・上り下り・ジャンプ台・加速板）。
   ・しくみ：アクセル／ブレーキ・ハンドル・ドリフト（長くためるほど 青→オレンジ→むらさき の火花 → はなすとミニターボ）、
     加速板、ジャンプ、アイテム（提灯カプセルで拾う）、コースから落ちたら「おばけ提灯」が拾ってくれる。
   ・アイテム（オリジナル）：妖火ダッシュ／妖火トリプル／ぷるぷるゼリー（うしろに置く）／ホーミング提灯（前の人をねらう）／
     しびれ雲（前の全員が少しおそくなる）／星の衣（無敵・速い）／まもり札（1回ふせぐ）。順位が下ほど強いアイテムが出やすい。
   ・勝負：CPU 7 台と 3 周。むずかしさ（かんたん／ふつう／むずかしい）をえらべる。ライバル（いちばん速い CPU）を表示。
   ・操作：W／↑ アクセル・S／↓ ブレーキ・A/D ハンドル・Shift（または Q）ドリフト・E／スペース アイテム。
     スマホ：自動でアクセル・スティックでハンドル・右下の「ドリフト」「アイテム」ボタン。
   ・コース・カート・アイテムのデザインはすべてオリジナル（既存のゲームのものは使わない）。
   ══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const T = THREE, X = XTex, TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), wrapA = (a) => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
  const C0 = { x: -120, y: 262, z: -380 }, A = 300, W = 15, DS = 1;
  const ITEMS = {
    dash: ["🔥", "妖火ダッシュ"], dash3: ["🔥🔥🔥", "妖火トリプル"], jelly: ["🟣", "ぷるぷるゼリー"], homing: ["🏮", "ホーミング提灯"],
    cloud: ["⚡", "しびれ雲"], star: ["⭐", "星の衣"], shield: ["🛡️", "まもり札"]
  };
  const TABLE = [[["jelly", 40], ["shield", 30], ["dash", 30]], [["dash", 30], ["jelly", 20], ["homing", 30], ["shield", 20]], [["dash3", 25], ["homing", 25], ["cloud", 15], ["star", 20], ["dash", 15]]];
  const NAMES = ["ジン", "ナナ", "トーマ", "ヴィオ", "ミカ", "ルカ", "サクヤ"], COLS = [0xff5f3a, 0x2a6ae8, 0x2fbf6a, 0xffc020, 0xc05aff, 0xff5fa8, 0x3ad8d8, 0xffffff];

  /* ══════════════ コース（8の字・立体交差・バンク・ジャンプ） ══════════════ */
  function makeCourse() {
    const pts = [], N0 = 480;
    for (let i = 0; i < N0; i++) {
      const t = i / N0 * TAU, den = 1 + Math.sin(t) * Math.sin(t);
      const x = A * Math.cos(t) / den, z = A * Math.sin(t) * Math.cos(t) / den * 1.25;
      const y = 14 * Math.sin(t) + 4 * Math.sin(3 * t + 0.6) + 3 * Math.sin(5 * t);
      pts.push(new T.Vector3(C0.x + x, C0.y + y, C0.z + z));
    }
    const cv = new T.CatmullRomCurve3(pts, true, "centripetal"), L = cv.getLength(), n = Math.round(L / DS);
    const P = [], TG = [], NL = [], UP = [], BK = [], Y = [];
    for (let i = 0; i < n; i++) { const p = cv.getPointAt(i / n); P.push(p); }
    for (let i = 0; i < n; i++) { const a = P[(i - 2 + n) % n], b = P[(i + 2) % n], tg = new T.Vector3().subVectors(b, a).normalize(); TG.push(tg); }
    /* バンク：曲がる強さ（水平の向きの変化）から。外側が高く、最大 28° */
    for (let i = 0; i < n; i++) { const a = TG[(i - 6 + n) % n], b = TG[(i + 6) % n], ha = Math.atan2(a.x, a.z), hb = Math.atan2(b.x, b.z); const k = wrapA(hb - ha) / 12; BK.push(clamp(-k * 38, -0.49, 0.49)); }
    for (let pass = 0; pass < 3; pass++) for (let i = 0; i < n; i++) BK[i] = (BK[(i - 1 + n) % n] + BK[i] * 2 + BK[(i + 1) % n]) / 4;
    for (let i = 0; i < n; i++) { const tg = TG[i], h = Math.atan2(tg.x, tg.z), nl = new T.Vector3(Math.cos(h), 0, -Math.sin(h)); NL.push(nl); const up = new T.Vector3(0, 1, 0).applyAxisAngle(new T.Vector3(tg.x, 0, tg.z).normalize(), BK[i]); UP.push(up); }
    /* ジャンプ台：まっすぐな所（曲がりが小さい所）の 1 か所に、けり上げ（2.2m）＋すき間（14m） */
    let jmp = -1, best = 1e9; for (let i = Math.floor(n * 0.1); i < n * 0.4; i++) { let c = 0; for (let k = -20; k <= 30; k++) c += Math.abs(BK[(i + k + n) % n]); if (c < best) { best = c; jmp = i; } }
    const J = { s0: jmp - 14, s1: jmp, g0: jmp, g1: jmp + 14 };
    const yOff = (i) => { if (i >= J.s0 && i < J.s1) { const u = (i - J.s0) / (J.s1 - J.s0); return 2.2 * u * u; } return 0; };
    for (let i = 0; i < n; i++) Y.push(P[i].y + yOff(i));
    const dash = [], boxes = [];
    [0.06, 0.2, 0.33, 0.47, 0.58, 0.71, 0.83, 0.93].forEach((u, k) => dash.push({ s: Math.round(n * u), d: ((k % 3) - 1) * 4.2 }));
    dash.push({ s: J.s0 - 10, d: 0 }); dash.push({ s: J.s0 - 10, d: 4.4 }); dash.push({ s: J.s0 - 10, d: -4.4 });
    [0.15, 0.4, 0.64, 0.88].forEach((u) => { for (let k = -2; k <= 2; k++) boxes.push({ s: Math.round(n * u), d: k * 2.8, off: 0 }); });
    return { cv, L: n * DS, n, P, TG, NL, UP, BK, Y, J, dash, boxes };
  }
  const idx = (C, s) => ((Math.round(s / DS) % C.n) + C.n) % C.n;
  function trackPos(C, s, d, out) { const i = idx(C, s), p = C.P[i], nl = C.NL[i], bk = C.BK[i]; out.set(p.x + nl.x * d * Math.cos(bk), C.Y[i] + d * Math.sin(bk), p.z + nl.z * d * Math.cos(bk)); return out; }

  /* ══════════════ コースの形（道・手すり・下の面・光の線・スタートの門・加速板・提灯カプセル） ══════════════ */
  function buildCourseMesh(C, scene, world) {
    const g = new T.Group(), n = C.n, M = world.m;
    const road = [], edgeL = [], edgeR = [], railL = [], railR = [], under = [];
    const pos = (i, d, dy) => { const p = C.P[i], nl = C.NL[i], bk = C.BK[i]; return [p.x + nl.x * d * Math.cos(bk), C.Y[i] + d * Math.sin(bk) + (dy || 0), p.z + nl.z * d * Math.cos(bk)]; };
    const ribbon = (list, fn, closedGap) => { const v = [], ix = [], uv = []; let k = 0; for (let i = 0; i <= n; i += 2) { const j = i % n; const inGap = j >= C.J.g0 && j < C.J.g1; const [a, b] = fn(j); v.push(...a, ...b); uv.push(0, i / 8, 1, i / 8); if (i > 0 && !(inGap && closedGap)) ix.push(k - 2, k - 1, k, k - 1, k + 1, k); k += 2; } const geo = new T.BufferGeometry(); geo.setAttribute("position", new T.Float32BufferAttribute(v, 3)); geo.setAttribute("uv", new T.Float32BufferAttribute(uv, 2)); geo.setIndex(ix); geo.computeVertexNormals(); return geo; };
    const fixUp = (geo) => { const nr = geo.attributes.normal; let dn = 0; for (let i = 0; i < nr.count; i += 7) if (nr.getY(i) < 0) dn++; if (dn > nr.count / 14) { const a = geo.index.array; for (let i = 0; i < a.length; i += 3) { const q = a[i + 1]; a[i + 1] = a[i + 2]; a[i + 2] = q; } geo.computeVertexNormals(); } return geo; };
    const roadTex = (() => { const c = X.cv(256, 256), q = c.getContext("2d"); q.fillStyle = "#3a3a4a"; q.fillRect(0, 0, 256, 256); for (let i = 0; i < 900; i++) { q.fillStyle = "rgba(255,255,255," + (Math.random() * 0.05) + ")"; q.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); } q.fillStyle = "#e8e8f0"; q.fillRect(0, 0, 10, 256); q.fillRect(246, 0, 10, 256); q.fillStyle = "#ffcc33"; for (let y = 0; y < 256; y += 64) q.fillRect(124, y, 8, 32); const t = X.tex(c); t.wrapS = t.wrapT = T.RepeatWrapping; return t; })();
    const rm = new T.MeshStandardMaterial({ map: roadTex, roughness: 0.75 });
    g.add(new T.Mesh(fixUp(ribbon(road, (i) => [pos(i, W / 2), pos(i, -W / 2)], true)), rm));
    const um = new T.MeshStandardMaterial({ color: 0x2a1a4a, roughness: 0.6, side: T.DoubleSide });
    g.add(new T.Mesh(ribbon(under, (i) => [pos(i, W / 2 + 0.6, -1.2), pos(i, -W / 2 - 0.6, -1.2)], true), um));
    [1, -1].forEach((sd) => {
      g.add(new T.Mesh(ribbon(railL, (i) => [pos(i, sd * (W / 2 + 0.3), 0), pos(i, sd * (W / 2 + 0.3), 1.1)], true), new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, transparent: true, opacity: 0.55, side: T.DoubleSide })));
      g.add(new T.Mesh(ribbon(edgeL, (i) => [pos(i, sd * (W / 2 + 0.3), 1.1), pos(i, sd * (W / 2 + 0.3), 1.28)], true), new T.MeshBasicMaterial({ color: sd > 0 ? 0xff4fb0 : 0x4ff0ff, side: T.DoubleSide, toneMapped: false })));
      g.add(new T.Mesh(ribbon(edgeR, (i) => [pos(i, sd * (W / 2 + 0.6), -1.2), pos(i, sd * (W / 2 + 0.6), 0.05)], true), um));
    });
    /* スタートの門（朱の鳥居ふう・「YOKAI SKY GRAND PRIX」） */
    { const i0 = 0, p = C.P[i0], tg = C.TG[i0], h = Math.atan2(tg.x, tg.z); const gate = new T.Group(); gate.position.set(p.x, C.Y[i0], p.z); gate.rotation.y = h;
      [-1, 1].forEach((s) => { const col = new T.Mesh(new T.CylinderGeometry(0.6, 0.7, 11, 12), M.woodRed); col.position.set(s * (W / 2 + 1.5), 5.5, 0); gate.add(col); });
      const bar = new T.Mesh(new T.BoxGeometry(W + 6, 1.1, 1.2), M.woodRed); bar.position.y = 10.4; gate.add(bar); const top = new T.Mesh(new T.BoxGeometry(W + 8, 0.7, 1.6), M.lanternCap || M.pBlack); top.position.y = 11.3; gate.add(top);
      const sc = X.cv(1024, 160), q = sc.getContext("2d"); const gr = q.createLinearGradient(0, 0, 1024, 0); gr.addColorStop(0, "#ff4fb0"); gr.addColorStop(1, "#a86aff"); q.fillStyle = gr; q.fillRect(0, 0, 1024, 160); q.fillStyle = "#fff"; q.font = "900 84px sans-serif"; q.textAlign = "center"; q.fillText("YOKAI SKY GRAND PRIX", 512, 110);
      const smat = new T.MeshBasicMaterial({ map: X.tex(sc), toneMapped: false }); [[-0.62, Math.PI], [0.62, 0]].forEach(([zz, r]) => { const sign = new T.Mesh(new T.PlaneGeometry(W + 2, 2.2), smat); sign.position.set(0, 8.4, zz); sign.rotation.y = r; gate.add(sign); });
      const ck = X.cv(256, 32), cq = ck.getContext("2d"); for (let a = 0; a < 16; a++) for (let b = 0; b < 2; b++) { cq.fillStyle = (a + b) % 2 ? "#111" : "#fff"; cq.fillRect(a * 16, b * 16, 16, 16); }
      const line = new T.Mesh(new T.PlaneGeometry(W, 2), new T.MeshBasicMaterial({ map: X.tex(ck) })); line.rotation.x = -Math.PI / 2; line.position.y = 0.06; gate.add(line);
      g.add(gate); }
    /* 加速板（光る矢印） */
    const arrow = (() => { const c = X.cv(128, 128), q = c.getContext("2d"); q.fillStyle = "#ff8a1a"; q.fillRect(0, 0, 128, 128); q.fillStyle = "#fff6a0"; for (let k = 0; k < 2; k++) { q.beginPath(); q.moveTo(20, 60 - k * 40 + 60); q.lineTo(64, 18 - k * 40 + 60); q.lineTo(108, 60 - k * 40 + 60); q.lineTo(108, 80 - k * 40 + 60); q.lineTo(64, 40 - k * 40 + 60); q.lineTo(20, 80 - k * 40 + 60); q.fill(); } return X.tex(c); })();
    const am = new T.MeshBasicMaterial({ map: arrow, toneMapped: false }), tp = new T.Vector3();
    C.dash.forEach((D) => { const i = idx(C, D.s); trackPos(C, D.s, D.d, tp); const pl = new T.Mesh(new T.PlaneGeometry(3.2, 4.2), am); pl.position.set(tp.x, tp.y + 0.07, tp.z); const up = C.UP[i], f = new T.Vector3(C.TG[i].x, C.TG[i].y, C.TG[i].z), xa = new T.Vector3().crossVectors(f, up).normalize(), ya = new T.Vector3().crossVectors(up, xa).normalize(); pl.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(xa, ya, up)); g.add(pl); D.mesh = pl; });
    /* 提灯カプセル（アイテム）：回る・光る */
    const bm = new T.MeshStandardMaterial({ color: 0xffd86a, emissive: 0xff8a3a, emissiveIntensity: 0.6, roughness: 0.3, transparent: true, opacity: 0.9 });
    const bg = new T.CapsuleGeometry(0.55, 0.5, 4, 10);
    C.boxes.forEach((B) => { trackPos(C, B.s, B.d, tp); const m = new T.Mesh(bg, bm); m.position.set(tp.x, tp.y + 1.4, tp.z); g.add(m); const r = new T.Mesh(new T.TorusGeometry(0.62, 0.06, 6, 16), M.gold || bm); r.position.copy(m.position); g.add(r); B.mesh = m; B.ring = r; });
    /* 浮かぶ島・雲・提灯（まわりの景色） */
    for (let k = 0; k < 18; k++) { const i = Math.floor(k / 18 * n), p = C.P[i], nl = C.NL[i], sd = k % 2 ? 1 : -1, off = 26 + (k % 5) * 9; const isl = new T.Group(); const rk = new T.Mesh(new T.DodecahedronGeometry(6 + (k % 3) * 2, 0).scale(1, 0.55, 1), M.rock || new T.MeshStandardMaterial({ color: 0x8a7a6a })); isl.add(rk); const gr2 = new T.Mesh(new T.CylinderGeometry(5.6 + (k % 3) * 2, 5.6 + (k % 3) * 2, 0.6, 12), M.lawnPark || new T.MeshStandardMaterial({ color: 0x4a9a4a })); gr2.position.y = 3.2; isl.add(gr2); const tr = new T.Mesh(new T.IcosahedronGeometry(2.4, 0), M.leafLight || gr2.material); tr.position.y = 6; isl.add(tr); isl.position.set(p.x + nl.x * sd * off, C.Y[i] - 10 - (k % 4) * 6, p.z + nl.z * sd * off); g.add(isl); }
    const lan = new T.InstancedMesh(new T.SphereGeometry(0.5, 10, 8).scale(1, 1.3, 1), new T.MeshBasicMaterial({ color: 0xff5a3a, toneMapped: false }), Math.floor(n / 24) * 2); let li = 0; const m4 = new T.Matrix4();
    for (let i = 0; i < n; i += 24) [1, -1].forEach((sd) => { if (li >= lan.count) return; const [x, y, z] = pos(i, sd * (W / 2 + 0.5), 2.6); m4.makeTranslation(x, y, z); lan.setMatrixAt(li++, m4); });
    g.add(lan);
    g.traverse((o) => { if (o.isMesh) { o.frustumCulled = true; } });
    scene.add(g);
    return g;
  }

  /* ══════════════ カート（オリジナル：丸い車体・大きな目のヘッドライト・しっぽの羽） ══════════════ */
  function kartMesh(world, color) {
    const g = new T.Group(), m = new T.MeshToonMaterial({ color, gradientMap: X.toonGradient() }), dk = new T.MeshToonMaterial({ color: 0x1c1c22, gradientMap: X.toonGradient() }), wh = new T.MeshBasicMaterial({ color: 0xffffff });
    const body = new T.Mesh(new T.CapsuleGeometry(0.62, 1.1, 4, 10).rotateX(Math.PI / 2).scale(1.05, 0.55, 1), m); body.position.y = 0.42; g.add(body);
    [-1, 1].forEach((s) => { const e = new T.Mesh(new T.SphereGeometry(0.17, 10, 8), wh); e.position.set(s * 0.3, 0.52, 1.05); g.add(e); const p = new T.Mesh(new T.SphereGeometry(0.08, 8, 6), dk); p.position.set(s * 0.3, 0.52, 1.18); g.add(p); });
    const seat = new T.Mesh(new T.BoxGeometry(0.6, 0.5, 0.16), dk); seat.position.set(0, 0.72, -0.45); g.add(seat);
    const fin = new T.Mesh(new T.BoxGeometry(0.08, 0.5, 0.6), m); fin.position.set(0, 0.9, -1.0); g.add(fin);
    const wheels = []; [[-0.68, 0.72], [0.68, 0.72], [-0.68, -0.7], [0.68, -0.7]].forEach(([x, z]) => { const w = new T.Mesh(new T.CylinderGeometry(0.28, 0.28, 0.26, 14), dk); w.rotation.z = Math.PI / 2; w.position.set(x, 0.28, z); g.add(w); wheels.push(w); });
    const spark = [-1, 1].map((s) => { const sp = new T.Mesh(new T.ConeGeometry(0.18, 0.9, 8).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ color: 0x4fa8ff, transparent: true, opacity: 0.9, toneMapped: false })); sp.position.set(s * 0.68, 0.2, -1.1); sp.visible = false; g.add(sp); return sp; });
    const flame = new T.Mesh(new T.ConeGeometry(0.28, 1.4, 10).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.85, toneMapped: false })); flame.position.set(0, 0.45, -1.6); flame.visible = false; g.add(flame);
    const shield = new T.Mesh(new T.SphereGeometry(1.5, 16, 12), new T.MeshBasicMaterial({ color: 0x7fe8ff, transparent: true, opacity: 0.22, depthWrite: false })); shield.position.y = 0.6; shield.visible = false; g.add(shield);
    g.userData = { wheels, spark, flame, shield, body };
    return g;
  }

  /* ══════════════ レース ══════════════ */
  function GP(ctx) {
    this.ctx = ctx; this.objs = []; this.done = false; this.t = 0; this.state = "menu"; this.laps = 3; this.raceT = 0;
    const C = this.C = makeCourse();
    this.course = buildCourseMesh(C, ctx.scene, ctx.world); this.objs.push(this.course);
    this.hud(); this.keys = {}; this.kd = (e) => { this.keys[e.code] = true; }; this.ku = (e) => { this.keys[e.code] = false; }; addEventListener("keydown", this.kd); addEventListener("keyup", this.ku);
    this.traps = []; this.shots = [];
    this.menu();
  }
  GP.prototype.ownsMove = true; GP.prototype.ownsCam = true;
  GP.prototype.hud = function () {
    let h = document.getElementById("kgHud");
    if (!h) {
      const st = document.createElement("style"); st.textContent = "#kgHud{position:fixed;inset:0;pointer-events:none;z-index:30;font-family:'M PLUS Rounded 1c',sans-serif;display:none}#kgHud.on{display:block}#kgHud .top{position:absolute;left:12px;top:10px;color:#fff;text-shadow:0 2px 6px #000;font-weight:900;font-size:18px}#kgHud .pos{position:absolute;right:16px;bottom:120px;color:#fff;font-weight:900;font-size:64px;text-shadow:0 4px 12px #000}#kgHud .pos small{font-size:24px}#kgHud .item{position:absolute;left:50%;top:12px;transform:translateX(-50%);width:78px;height:78px;border-radius:18px;background:rgba(10,14,40,.72);border:3px solid #ffd86a;display:flex;align-items:center;justify-content:center;font-size:36px;color:#fff}#kgHud .item small{position:absolute;bottom:-20px;font-size:12px;white-space:nowrap;text-shadow:0 1px 3px #000}#kgHud .spd{position:absolute;left:14px;bottom:120px;color:#fff;font-weight:900;font-size:26px;text-shadow:0 2px 8px #000}#kgHud .big{position:absolute;left:50%;top:38%;transform:translate(-50%,-50%);font-size:88px;font-weight:900;color:#fff;text-shadow:0 6px 20px rgba(0,0,0,.6);pointer-events:none}#kgHud .rank{position:absolute;right:12px;top:90px;background:rgba(10,14,40,.6);color:#fff;border-radius:12px;padding:6px 10px;font-size:12px;line-height:1.5}#kgHud .btn{position:absolute;pointer-events:auto;width:84px;height:84px;border-radius:50%;border:0;font-weight:900;color:#fff;font-size:15px;box-shadow:0 4px 12px rgba(0,0,0,.35)}#kgHud .bd{right:112px;bottom:24px;background:linear-gradient(#4fa8ff,#2a5ad8)}#kgHud .bi{right:16px;bottom:24px;background:linear-gradient(#ffb04a,#e8602a)}#kgHud .menu{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);pointer-events:auto;background:rgba(12,10,40,.9);border:2px solid #ffd86a;border-radius:20px;padding:18px 22px;color:#fff;text-align:center;min-width:280px}#kgHud .menu h2{margin:0 0 8px;font-size:22px}#kgHud .menu p{margin:4px 0 10px;font-size:12.5px;opacity:.9;line-height:1.5}#kgHud .menu button{display:block;width:100%;margin:6px 0;padding:10px;border-radius:12px;border:0;font-weight:900;font-size:15px;cursor:pointer}#kgHud .menu .x{background:#555;color:#fff}";
      document.head.appendChild(st);
      h = document.createElement("div"); h.id = "kgHud"; h.innerHTML = '<div class="top"></div><div class="item"><span></span><small></small></div><div class="spd"></div><div class="pos"></div><div class="rank"></div><div class="big"></div><button class="btn bd">ドリフト</button><button class="btn bi">アイテム</button><div class="menu" style="display:none"></div>'; document.body.appendChild(h);
    }
    this.H = { root: h, top: h.querySelector(".top"), item: h.querySelector(".item span"), itemN: h.querySelector(".item small"), spd: h.querySelector(".spd"), pos: h.querySelector(".pos"), rank: h.querySelector(".rank"), big: h.querySelector(".big"), bd: h.querySelector(".bd"), bi: h.querySelector(".bi"), menu: h.querySelector(".menu") };
    h.classList.add("on"); this.H.big.textContent = "";
    const H = this.H; this.btnD = false; this.btnI = false;
    H.bd.onpointerdown = (e) => { e.preventDefault(); this.btnD = true; }; H.bd.onpointerup = H.bd.onpointercancel = H.bd.onpointerleave = () => { this.btnD = false; };
    H.bi.onpointerdown = (e) => { e.preventDefault(); this.btnI = true; };
    H.bd.style.display = H.bi.style.display = this.ctx.MOBILE ? "" : "none";
  };
  GP.prototype.menu = function () {
    const H = this.H; H.menu.style.display = "";
    H.menu.innerHTML = '<h2>🏁 妖怪スカイグランプリ</h2><p>パークの上空のコースで、CPU 7 台と 3 周の勝負！<br>' + (this.ctx.MOBILE ? "自動でアクセル・スティックでハンドル・「ドリフト」を押しながら曲がって はなすとミニターボ・「アイテム」で使う" : "W アクセル・S ブレーキ・A/D ハンドル・Shift（Q）を押しながら曲がって はなすとミニターボ・E でアイテム") + "</p>" +
      '<button data-d="0" style="background:#7cd87c">かんたん</button><button data-d="1" style="background:#ffd24a">ふつう</button><button data-d="2" style="background:#ff6a6a;color:#fff">むずかしい</button><button class="x">やめる</button>';
    H.menu.querySelectorAll("button[data-d]").forEach((b) => b.onclick = () => { H.menu.style.display = "none"; this.begin(+b.dataset.d); });
    H.menu.querySelector(".x").onclick = () => this.ctx.exit();
    /* うしろから見るカメラ（メニューの間はコースを回る） */
    this.state = "menu";
  };
  GP.prototype.begin = function (diff) {
    const C = this.C, ctx = this.ctx; this.diff = diff; this.karts = [];
    const vmax = [26, 30, 34][diff];
    for (let i = 0; i < 8; i++) {
      const me = i === 7, mesh = kartMesh(ctx.world, COLS[i]); ctx.scene.add(mesh); this.objs.push(mesh);
      let drv = null; if (!me && window.XPeople) { const sp = XPeople.athlete({ c: "#" + new T.Color(COLS[i]).getHexString(), names: [NAMES[i]] }, i); drv = ctx.person(sp); ctx.scene.add(drv.root); this.objs.push(drv.root); }
      const row = Math.floor(i / 2), s = C.L - 8 - row * 7, d = i % 2 ? 3.2 : -3.2;
      const skill = me ? 1 : [0.86, 0.93, 1.0][diff] * (0.95 + (i % 4) * 0.025);
      this.karts.push({ me, mesh, drv, s, d, h: 0, v: 0, y: 0, vy: 0, air: false, lap: -1, half: true, prog: 0, fin: 0, name: me ? "あなた" : NAMES[i], vmax: me ? vmax : vmax * skill, skill, line: (i % 3 - 1) * 3.4, item: null, n3: 0, boostT: 0, spinT: 0, starT: 0, shield: 0, drift: 0, dch: 0, cloudT: 0, lastS: s, fallT: 0 });
    }
    this.rival = this.karts.slice(0, 7).reduce((a, b) => (b.skill > a.skill ? b : a));
    this.karts.forEach((k) => { const i = idx(C, k.s), tg = C.TG[i]; k.h = Math.atan2(tg.x, tg.z); k.lastS = k.s; });
    this.state = "count"; this.stateT = 3.9;
  };
  GP.prototype.giveItem = function (k, order) {
    const pos = order.indexOf(k), tier = pos <= 1 ? 0 : pos <= 4 ? 1 : 2, tb = TABLE[tier], sum = tb.reduce((a, b) => a + b[1], 0);
    let r = Math.random() * sum; for (const [it, w] of tb) { r -= w; if (r <= 0) { k.item = it; k.n3 = it === "dash3" ? 3 : 1; break; } }
    if (k.me) { this.flash(ITEMS[k.item][0] + " " + ITEMS[k.item][1] + " をゲット！"); }
  };
  GP.prototype.flash = function (t) { const H = this.H; H.big.style.fontSize = "30px"; H.big.textContent = t; clearTimeout(this._ft); this._ft = setTimeout(() => { if (this.state === "race") H.big.textContent = ""; H.big.style.fontSize = ""; }, 1300); };
  GP.prototype.hit = function (k, kind) {
    if (k.starT > 0) return false;
    if (k.shield > 0) { k.shield = 0; if (k.me) this.flash("🛡️ まもり札がふせいだ！"); return false; }
    k.spinT = kind === "homing" ? 1.3 : 1.0; k.v *= 0.35; k.drift = 0; k.dch = 0;
    if (k.me) this.flash(kind === "jelly" ? "ぷるぷる〜！" : "あたった！");
    return true;
  };
  GP.prototype.useItem = function (k, order) {
    const it = k.item; if (!it) return;
    const C = this.C;
    if (it === "dash" || it === "dash3") { k.boostT = Math.max(k.boostT, 1.3); k.n3--; if (k.n3 <= 0) k.item = null; return; }
    if (it === "jelly") { this.traps.push({ s: k.s - 3, d: k.d, t: 0, mesh: this.trapMesh() }); k.item = null; return; }
    if (it === "homing") { const pos = order.indexOf(k), tgt = pos > 0 ? order[pos - 1] : null; this.shots.push({ s: k.s + 2, d: k.d, tgt, t: 0, mesh: this.shotMesh() }); k.item = null; return; }
    if (it === "cloud") { const pos = order.indexOf(k); order.forEach((o, i) => { if (i < pos && o.starT <= 0 && !o.shield) o.cloudT = 3; else if (i < pos && o.shield) o.shield = 0; }); if (k.me) this.flash("⚡ しびれ雲！前のみんながゆっくりに"); k.item = null; return; }
    if (it === "star") { k.starT = 5.5; k.item = null; return; }
    if (it === "shield") { k.shield = 1; k.item = null; return; }
  };
  GP.prototype.trapMesh = function () { const m = new T.Mesh(new T.SphereGeometry(0.7, 14, 10).scale(1, 0.6, 1), new T.MeshStandardMaterial({ color: 0xc05aff, transparent: true, opacity: 0.8, roughness: 0.2 })); this.ctx.scene.add(m); this.objs.push(m); return m; };
  GP.prototype.shotMesh = function () { const g = new T.Group(); const l = new T.Mesh(new T.SphereGeometry(0.55, 12, 10).scale(1, 1.3, 1), new T.MeshBasicMaterial({ color: 0xff5a3a, toneMapped: false })); g.add(l); [-1, 1].forEach((s) => { const e = new T.Mesh(new T.SphereGeometry(0.12, 8, 6), new T.MeshBasicMaterial({ color: 0xffffff })); e.position.set(s * 0.2, 0.15, 0.48); g.add(e); }); this.ctx.scene.add(g); this.objs.push(g); return g; };
  GP.prototype.order = function () { return this.karts.slice().sort((a, b) => (b.fin ? 1e9 - b.fin : b.prog) - (a.fin ? 1e9 - a.fin : a.prog)); };
  const tmpV = new T.Vector3(), tmpV2 = new T.Vector3();
  GP.prototype.update = function (dt, inp) {
    const C = this.C, ctx = this.ctx, H = this.H; this.t += dt;
    if (this.state === "menu") { const s = (this.t * 30) % C.L; trackPos(C, s, 0, tmpV); const i = idx(C, s), tg = C.TG[i]; ctx.camera.position.set(tmpV.x - tg.x * 14 + 8, tmpV.y + 9, tmpV.z - tg.z * 14); ctx.camera.lookAt(tmpV.x + tg.x * 10, tmpV.y, tmpV.z + tg.z * 10); ctx.player.x = tmpV.x; ctx.player.z = tmpV.z; ctx.player.kartY = -999; return; }
    if (this.state === "count") { this.stateT -= dt; const n = Math.ceil(this.stateT - 0.9), txt = n >= 1 ? String(n) : "GO!"; if (txt !== this._ct) { this._ct = txt; H.big.style.fontSize = ""; H.big.textContent = txt; if (txt === "GO!") setTimeout(() => { if (H.big.textContent === "GO!") H.big.textContent = ""; }, 900); } if (this.stateT <= 0.9) this.state = "race"; }
    const racing = this.state === "race" || this.state === "end";
    if (this.state === "race") this.raceT += dt;
    const order = this.order();
    /* 自分の入力 */
    const K = this.keys, thrK = inp.keyW || (inp.joy && inp.iz < -0.25) ? 1 : 0, brk = inp.keyS || (inp.joy && inp.iz > 0.35);
    let thr = brk ? -1 : thrK; if (ctx.MOBILE && !brk) thr = 1;
    const steerIn = clamp(-(inp.ix || 0), -1, 1), driftIn = !!(K.ShiftLeft || K.ShiftRight || K.KeyQ || this.btnD), itemIn = !!(inp.actPress || this.btnI); this.btnI = false;
    this.karts.forEach((k) => {
      /* CPU の頭 */
      let t = 0, st = 0, dr = false, useIt = false;
      if (k.me) { t = k.fin ? 0.3 : thr; st = steerIn; dr = driftIn; useIt = itemIn;
        /* ハンドルのお助け（かんたん：手をはなすとコースにそって走る／ふつう：手すりに近いときだけ少し） */
        const tgH = Math.atan2(C.TG[idx(C, k.s + 6)].x, C.TG[idx(C, k.s + 6)].z), dh = wrapA(tgH - k.h) - k.d * 0.02, assist = this.diff === 0 ? 1.4 : Math.abs(k.d) > W / 2 - 2.2 ? 0.6 : 0;
        if (assist && Math.abs(st) < 0.15 && !k.drift) st = clamp(dh * assist, -0.7, 0.7); }
      else {
        const look = 8 + k.v * 0.55, tgtS = k.s + look; trackPos(C, tgtS, k.line + Math.sin(this.t * 0.3 + k.skill * 9) * 1.2, tmpV);
        const want = Math.atan2(tmpV.x - k.mesh.position.x, tmpV.z - k.mesh.position.z), da = wrapA(want - k.h);
        st = clamp(da * 2.6, -1, 1); t = 1 - Math.min(0.5, Math.abs(da) * 0.8);
        const curv = Math.abs(C.BK[idx(C, k.s + 20)]); dr = curv > 0.3 && k.v > 16 ? true : (k.drift && k.dch < 1.3 + k.skill);
        const me = this.karts[7], gap = k.prog - me.prog; k.rubber = gap > 90 ? 0.9 : gap < -90 ? 1.1 : 1;
        if (k.item) { const pos = order.indexOf(k); if (k.item === "dash" || k.item === "dash3" || k.item === "cloud" || k.item === "star") useIt = Math.random() < dt * 0.8; else if (k.item === "jelly") useIt = order[pos + 1] && k.prog - order[pos + 1].prog < 25; else if (k.item === "homing") useIt = pos > 0 && order[pos - 1].prog - k.prog < 80; else if (k.item === "shield") useIt = Math.random() < dt * 0.2; }
      }
      if (!racing || (this.state === "count")) { t = 0; useIt = false; }
      if (useIt && k.item) this.useItem(k, order);
      /* ドリフト（ためてはなすとミニターボ） */
      if (dr && !k.drift && Math.abs(st) > 0.35 && k.v > 12 && !k.air) { k.drift = Math.sign(st); k.dch = 0; }
      if (k.drift) { if (!dr || k.v < 8) { const lv = k.dch > 3.0 ? 3 : k.dch > 1.8 ? 2 : k.dch > 0.9 ? 1 : 0; if (lv) { k.boostT = Math.max(k.boostT, [0, 0.6, 1.0, 1.6][lv]); if (k.me) this.flash(["", "ミニターボ！", "スーパーミニターボ！", "ウルトラミニターボ！"][lv]); } k.drift = 0; k.dch = 0; } else k.dch += dt * (0.7 + 0.6 * Math.abs(st) * Math.sign(st) * k.drift + 0.3); }
      /* 速さ */
      const i = idx(C, k.s), slope = C.TG[i].y, spin = k.spinT > 0, boost = k.boostT > 0 || k.starT > 0;
      let vmax = k.vmax * (k.rubber || 1) * (boost ? 1.42 : 1) * (k.cloudT > 0 ? 0.62 : 1) * (k.starT > 0 ? 1.08 : 1);
      if (spin) { t = 0; }
      if (t > 0) k.v += (boost ? 26 : 14) * t * dt * (k.v < vmax ? 1 : 0); else if (t < 0) k.v += (k.v > 0 ? 24 : 6) * t * dt;
      if (boost && k.v < vmax) k.v += 20 * dt;
      k.v -= slope * 9.8 * dt * 0.6; k.v -= k.v * (spin ? 2.2 : 0.3) * dt; if (k.v > vmax) k.v -= (k.v - vmax) * 2.5 * dt; k.v = clamp(k.v, -6, 52);
      /* ハンドル（ドリフト中はよく曲がる・すべる） */
      const sp = k.v / (Math.abs(k.v) + 4);
      if (spin) k.h += 9 * dt;
      else if (k.drift) k.h += (k.drift * 1.35 + st * 0.75) * sp * dt;
      else k.h += st * 1.75 * sp * dt;
      /* 進む：水平に動かして、いちばん近いコースの点から (s, d) をもとめる */
      trackPos(C, k.s, k.d, tmpV);
      const slip = k.drift ? -k.drift * 0.28 : 0, fx = Math.sin(k.h + slip), fz = Math.cos(k.h + slip);
      const nx = tmpV.x + fx * k.v * dt, nz = tmpV.z + fz * k.v * dt;
      let bs = k.s, bd = 1e9; for (let o = -6; o <= 10; o++) { const j = idx(C, k.s + o), p = C.P[j], dd = (p.x - nx) ** 2 + (p.z - nz) ** 2; if (dd < bd) { bd = dd; bs = Math.round(k.s) + o; } }
      const j = idx(C, bs), p = C.P[j], nl = C.NL[j], tg = C.TG[j], along = (nx - p.x) * tg.x + (nz - p.z) * tg.z;
      const newS = bs + along * 0.98, lat = ((nx - p.x) * nl.x + (nz - p.z) * nl.z) / Math.max(0.6, Math.cos(C.BK[j]));
      const prevS = k.s; k.s = newS; k.d = lat;
      /* ジャンプ（すき間）と空中 */
      const ji = idx(C, k.s), inGap = ji >= C.J.g0 && ji < C.J.g1;
      const groundY = C.Y[ji] + k.d * Math.sin(C.BK[ji]);
      if (!k.air && idx(C, prevS) < C.J.s1 && ji >= C.J.g0 && ji < C.J.g1) { k.air = true; k.vy = 5.5 + k.v * 0.12; k.y = C.Y[C.J.s1 - 1]; }
      if (k.air) { k.vy -= 18 * dt; k.y += k.vy * dt; if (!inGap && k.y <= groundY + 0.05 && Math.abs(k.d) < W / 2 + 0.2) { k.air = false; k.y = groundY; if (k.me && k.v > 20) this.flash("ナイスジャンプ！"); } else if (k.y < groundY - 18 || (inGap && k.y < C.Y[C.J.g0] - 20)) this.fall(k); }
      else { k.y = groundY; if (inGap) { k.air = true; k.vy = 0; } }
      /* 手すり（外へは出ない） */
      if (Math.abs(k.d) > W / 2 - 0.9) { k.d = Math.sign(k.d) * (W / 2 - 0.9); k.v *= 0.93; if (k.drift) { k.drift = 0; k.dch = 0; } const tgA = Math.atan2(tg.x, tg.z); k.h += wrapA(tgA - k.h) * 0.3; }
      /* 加速板・アイテムのカプセル */
      if (!k.air) C.dash.forEach((D) => { if (Math.abs(((k.s - D.s) % C.L + C.L) % C.L) < 2.2 && Math.abs(k.d - D.d) < 1.8) k.boostT = Math.max(k.boostT, 1.1); });
      C.boxes.forEach((B) => { if (B.off > 0) return; const ds = ((k.s - B.s) % C.L + C.L) % C.L; if ((ds < 1.6 || ds > C.L - 1.6) && Math.abs(k.d - B.d) < 1.5) { B.off = 3; if (!k.item) this.giveItem(k, order); } });
      /* 周回 */
      const su = ((k.s % C.L) + C.L) % C.L, pu = ((prevS % C.L) + C.L) % C.L;
      if (su > C.L * 0.45 && su < C.L * 0.55) k.half = true;
      if (k.half && pu > C.L * 0.9 && su < C.L * 0.1) { k.lap++; k.half = false; if (k.lap >= this.laps && !k.fin) { k.fin = this.raceT || 0.01; if (k.me) this.finish(); } else if (k.me && k.lap > 0) { H.big.style.fontSize = ""; H.big.textContent = k.lap === this.laps - 1 ? "ファイナルラップ！" : "LAP " + (k.lap + 1) + "/" + this.laps; setTimeout(() => { if (this.state === "race") H.big.textContent = ""; }, 1300); } }
      k.prog = k.lap * C.L + su;
      /* タイマー */
      k.boostT = Math.max(0, k.boostT - dt); k.spinT = Math.max(0, k.spinT - dt); k.starT = Math.max(0, k.starT - dt); k.cloudT = Math.max(0, k.cloudT - dt);
    });
    /* カートどうし（星の衣は相手をはじく） */
    for (let a = 0; a < 8; a++) for (let b = a + 1; b < 8; b++) { const A2 = this.karts[a], B2 = this.karts[b], ds = A2.s - B2.s, dd = A2.d - B2.d; if (Math.abs(ds) < 2.2 && Math.abs(dd) < 1.8) { if (A2.starT > 0 && B2.starT <= 0) this.hit(B2, "star"); else if (B2.starT > 0 && A2.starT <= 0) this.hit(A2, "star"); const o = (1.8 - Math.abs(dd)) / 2 * Math.sign(dd || 1); A2.d += o; B2.d -= o; } }
    /* ゼリー・ホーミング提灯 */
    this.traps = this.traps.filter((tr) => { tr.t += dt; trackPos(C, tr.s, tr.d, tmpV); tr.mesh.position.set(tmpV.x, tmpV.y + 0.35, tmpV.z); tr.mesh.scale.y = 0.6 + Math.sin(this.t * 8) * 0.08; for (const k of this.karts) { if (Math.abs(k.s - tr.s) < 1.6 && Math.abs(k.d - tr.d) < 1.4 && !k.air) { this.hit(k, "jelly"); this.ctx.scene.remove(tr.mesh); return false; } } if (tr.t > 40) { this.ctx.scene.remove(tr.mesh); return false; } return true; });
    this.shots = this.shots.filter((sh) => { sh.t += dt; const tg = sh.tgt; if (tg) { sh.s += 46 * dt; sh.d += (tg.d - sh.d) * Math.min(1, dt * 3); } else sh.s += 40 * dt; trackPos(C, sh.s, sh.d, tmpV); sh.mesh.position.set(tmpV.x, tmpV.y + 1.0 + Math.sin(this.t * 10) * 0.15, tmpV.z); const hitK = tg && Math.abs(((tg.s - sh.s) % C.L + C.L) % C.L) < 2.4 && Math.abs(tg.d - sh.d) < 2; if (hitK) { this.hit(tg, "homing"); this.ctx.scene.remove(sh.mesh); return false; } if (sh.t > 6) { this.ctx.scene.remove(sh.mesh); return false; } return true; });
    C.boxes.forEach((B) => { if (B.off > 0) { B.off -= dt; B.mesh.visible = B.ring.visible = B.off <= 0; } B.mesh.rotation.y += dt * 2; B.ring.rotation.x += dt * 1.4; B.ring.rotation.y += dt; });
    /* 見た目 */
    const pl = ctx.player;
    this.karts.forEach((k) => {
      const i = idx(C, k.s); trackPos(C, k.s, k.d, tmpV); const y = k.air ? k.y : tmpV.y;
      k.mesh.position.set(tmpV.x, y, tmpV.z);
      const up = C.UP[i], f = tmpV2.set(Math.sin(k.h), 0, Math.cos(k.h)); f.y = -(f.x * up.x + f.z * up.z) / Math.max(0.3, up.y); f.normalize();
      const r = new T.Vector3().crossVectors(up, f).normalize(), fu = new T.Vector3().crossVectors(r, up).normalize();
      k.mesh.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(r, up, fu));
      if (k.drift) k.mesh.rotateY(-k.drift * 0.35); if (k.spinT > 0) k.mesh.rotateY(this.t * 12);
      const U = k.mesh.userData; U.wheels.forEach((w, wi) => { w.rotation.x += k.v * dt / 0.28; });
      const lv = k.dch > 3.0 ? 3 : k.dch > 1.8 ? 2 : k.dch > 0.9 ? 1 : 0; U.spark.forEach((sp) => { sp.visible = !!k.drift && lv > 0; sp.material.color.setHex([0, 0x4fa8ff, 0xff8a1a, 0xc05aff][lv] || 0x4fa8ff); sp.scale.setScalar(0.8 + Math.random() * 0.5); });
      U.flame.visible = k.boostT > 0 || k.starT > 0; U.flame.scale.set(1, 1, 0.8 + Math.random() * 0.6); U.shield.visible = k.shield > 0;
      U.body.material.emissive = U.body.material.emissive || new T.Color(); if (k.starT > 0) { U.body.material.emissive.setHSL((this.t * 2) % 1, 1, 0.45); } else U.body.material.emissive.setRGB(0, 0, 0);
      const seatP = new T.Vector3(0, 0.25, -0.35).applyQuaternion(k.mesh.quaternion).add(k.mesh.position);
      if (k.me) { pl.x = seatP.x; pl.z = seatP.z; pl.yaw = Math.atan2(fu.x, fu.z); pl.kartY = seatP.y; }
      else if (k.drv) { k.drv.root.position.copy(seatP); k.drv.root.quaternion.copy(k.mesh.quaternion); k.drv.update(dt, 0, { action: "drive", actionT: 0.5, seatH: 0.32 }); }
    });
    /* HUD */
    const me = this.karts[7], pos = order.indexOf(me) + 1;
    H.top.innerHTML = "🏁 妖怪スカイグランプリ　LAP " + Math.max(1, Math.min(this.laps, me.lap + 1)) + "/" + this.laps + "　⏱ " + this.raceT.toFixed(1) + " 秒";
    H.pos.innerHTML = pos + '<small>' + (pos === 1 ? "st" : pos === 2 ? "nd" : pos === 3 ? "rd" : "th") + " / 8</small>";
    H.spd.textContent = Math.round(Math.abs(me.v) * 3.6) + " km/h" + (me.boostT > 0 ? "  🔥" : "") + (me.drift ? ["", "  ✦", "  ✦✦", "  ✦✦✦"][me.dch > 3 ? 3 : me.dch > 1.8 ? 2 : me.dch > 0.9 ? 1 : 0] : "");
    H.item.textContent = me.item ? ITEMS[me.item][0].slice(0, 2) : ""; H.itemN.textContent = me.item ? ITEMS[me.item][1] + (me.item === "dash3" ? " ×" + me.n3 : "") : "アイテム";
    H.rank.innerHTML = order.map((k, i) => (i + 1) + ". " + (k.me ? "<b>あなた</b>" : k.name + (k === this.rival ? " 👑" : "")) + (k.fin ? " 🏁" : "")).join("<br>");
    /* カメラ（うしろから・坂とバンクに合わせる） */
    const cam = ctx.camera, back = 6.8 + Math.min(3, me.v * 0.05), upH = 2.8;
    const f2 = new T.Vector3(Math.sin(me.h), 0, Math.cos(me.h)), cp = new T.Vector3().copy(me.mesh.position).addScaledVector(f2, -back); cp.y += upH;
    this.cp = this.cp || cp.clone(); this.cp.lerp(cp, Math.min(1, dt * 6)); cam.position.copy(this.cp);
    const i0 = idx(C, me.s); cam.up.lerp(new T.Vector3(0, 1, 0).lerp(C.UP[i0], 0.35), Math.min(1, dt * 4)); cam.lookAt(me.mesh.position.x + f2.x * 5, me.mesh.position.y + 1.1, me.mesh.position.z + f2.z * 5);
    const fov = 62 + (me.boostT > 0 ? 8 : 0) + Math.min(6, me.v * 0.12); if (Math.abs(cam.fov - fov) > 0.3) { cam.fov += (fov - cam.fov) * Math.min(1, dt * 3); cam.updateProjectionMatrix(); }
    this.me = me;
  };
  /* コースから落ちたら：おばけ提灯が拾ってくれる（少し前にもどる） */
  GP.prototype.fall = function (k) {
    k.air = false; k.vy = 0; k.v = 0; k.d = 0; k.drift = 0; k.dch = 0; k.spinT = 0.4;
    let s = k.s; const ji = idx(this.C, s); if (ji >= this.C.J.s0 - 4 && ji < this.C.J.g1 + 4) s = this.C.J.s0 - 30; k.s = s;
    if (k.me) this.flash("🏮 おばけ提灯が拾ってくれた！");
  };
  GP.prototype.finish = function () {
    if (this.done) return; this.done = true; this.state = "end";
    setTimeout(() => {
      const order = this.order(), me = this.karts[7], pos = order.indexOf(me) + 1, H = this.H;
      H.menu.style.display = "";
      H.menu.innerHTML = "<h2>" + (pos === 1 ? "🏆 優勝！" : pos + " 位でゴール") + "</h2><p>タイム " + (me.fin || this.raceT).toFixed(2) + " 秒　／　" + ["かんたん", "ふつう", "むずかしい"][this.diff] + "</p><p>" + order.map((k, i) => (i + 1) + ". " + (k.me ? "あなた" : k.name + (k === this.rival ? "👑" : ""))).join("　") + "</p>" +
        '<button data-a="again" style="background:#ffd24a">もう一度</button><button data-a="menu" style="background:#7fe8ff">むずかしさを変える</button><button class="x">やめる</button>';
      H.menu.querySelector('[data-a="again"]').onclick = () => this.ctx.restart();
      H.menu.querySelector('[data-a="menu"]').onclick = () => this.ctx.restart();
      H.menu.querySelector(".x").onclick = () => this.ctx.exit();
      if (pos === 1 && window.XParkUI) XParkUI.stamp && XParkUI.stamp("kart");
    }, 1200);
  };
  GP.prototype.dispose = function () {
    removeEventListener("keydown", this.kd); removeEventListener("keyup", this.ku);
    this.objs.forEach((o) => { this.ctx.scene.remove(o); o.traverse && o.traverse((m) => { if (m.geometry) m.geometry.dispose(); }); });
    this.traps.forEach((t) => this.ctx.scene.remove(t.mesh)); this.shots.forEach((s) => this.ctx.scene.remove(s.mesh));
    this.H.root.classList.remove("on"); this.H.menu.style.display = "none"; this.H.big.textContent = "";
    this.ctx.camera.up.set(0, 1, 0); this.ctx.player.kartY = 0;
  };
  window.XKartGP = GP;
})();
