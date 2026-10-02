/* ══════════════════════════════════════════════════════════════════
   XEVARION PARK — MAGIBURST 3D ボスバトル（★★ 2026-10-02 ご指定
     「MagiBurst や MagiBocciaRush のエリアは実際に 3D 環境でゲームができたり…」）
   ------------------------------------------------------------------
   ボスコロシアムの中の円い闘技場で遊ぶ「引っぱりハンティング」：
     ・仲間 3 人（光る玉＋キャラの絵）を順番に、向きを決めて・ためて・はなすと、玉が闘技場をはね回る
     ・敵（小鬼・コウモリ・ゴーレム・ウィスプ）とボス（MagiBurst のボスの絵）に当たるとダメージ。連続で当てるほどコンボ
     ・止まっている仲間にふれると「BURST LINK」（まわりの敵にまとめてダメージ）
     ・当てるとゲージがたまり、満タンで次の 1 投が「FULL BURST」（3 倍のダメージ）
     ・敵は数ターンごとに攻撃（頭の上の数字が 0 になると攻撃）。仲間の HP が 0 で負け、ボスをたおせば勝ち
   操作：A/D（スティックの左右）で向き・E（ボタン）を押してためて離す。main.js の XGames と同じしくみ。
   ══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const T = THREE, X = XTex, G = window.XGames; if (!G || !G.Base) return;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), TAU = Math.PI * 2;
  const PARTY = [["Roselia", "火", 0xff5a3a], ["Shizuka", "水", 0x3aa8ff], ["Nemu", "風", 0x4ad88a], ["Yuria", "光", 0xffd84a], ["Altia", "闇", 0xa86aff], ["Liana", "水", 0x3aa8ff], ["Kureha", "火", 0xff5a3a], ["Akatsuki", "闇", 0xa86aff], ["Hikaru", "光", 0xffd84a], ["Yaju", "風", 0x4ad88a]];
  const BOSS = ["Hecatia", "Dominus", "Eclipse", "Inferna", "Oblivion", "Umbra", "Astraea", "Dominia"];
  const texCache = {};
  const imgTex = (src) => texCache[src] || (texCache[src] = X.imgTex(src));

  /* 文字の板（ダメージの数字・HP のバー） */
  function textSprite(w, h) {
    const c = X.cv(w, h), t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace;
    const sp = new T.Sprite(new T.SpriteMaterial({ map: t, transparent: true, depthWrite: false, depthTest: false, toneMapped: false }));
    sp.renderOrder = 50; sp.userData = { c, g: c.getContext("2d"), t };
    return sp;
  }

  function Burst(ctx) {
    G.Base.call(this, ctx, "burst", "⚔️ MAGIBURST ボスバトル（ボスコロシアム）");
    const A = this.A = ctx.world.burstArena || { cx: ctx.player.x, cz: ctx.player.z, rx: 15, rz: 11 };
    this.rx = A.rx || 15; this.rz = A.rz || 11;
    this.turn = 0; this.cur = 0; this.phase = "intro"; this.t = 0; this.aim = -Math.PI / 2; this.pow = 0; this.charging = false;
    this.hp = 1000; this.hpMax = 1000; this.gauge = 0; this.combo = 0; this.maxCombo = 0; this.dmgTotal = 0; this.fx = []; this.nums = [];
    /* 闘技場の床：光る輪・魔法陣 */
    const ring = this.add(new T.Mesh(new T.TorusGeometry(1, 0.012, 6, 96).scale(this.rx, this.rz, 30).rotateX(Math.PI / 2), new T.MeshBasicMaterial({ color: 0xc07aff, toneMapped: false })));
    ring.position.set(A.cx, 0.08, A.cz);
    const rc = X.cv(512, 512), rg = rc.getContext("2d"); rg.strokeStyle = "rgba(200,140,255,.55)"; rg.lineWidth = 6; rg.beginPath(); rg.arc(256, 256, 240, 0, TAU); rg.stroke(); rg.lineWidth = 3; rg.beginPath(); rg.arc(256, 256, 200, 0, TAU); rg.stroke();
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; rg.beginPath(); rg.moveTo(256 + Math.cos(a) * 200, 256 + Math.sin(a) * 200); rg.lineTo(256 + Math.cos(a + TAU / 3) * 200, 256 + Math.sin(a + TAU / 3) * 200); rg.stroke(); }
    rg.font = "900 26px serif"; rg.fillStyle = "rgba(220,180,255,.7)"; rg.textAlign = "center"; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; rg.save(); rg.translate(256 + Math.cos(a) * 220, 256 + Math.sin(a) * 220); rg.rotate(a + Math.PI / 2); rg.fillText("ᚱᚢᚾᛖᛋᛏ"[i % 6], 0, 8); rg.restore(); }
    const rune = this.add(new T.Mesh(new T.PlaneGeometry(this.rx * 2, this.rz * 2).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ map: new T.CanvasTexture(rc), transparent: true, depthWrite: false, toneMapped: false, opacity: 0.8 })));
    rune.position.set(A.cx, 0.06, A.cz); this.rune = rune;
    /* 仲間 3 人 */
    const pick = PARTY.slice().sort(() => Math.random() - 0.5).slice(0, 3);
    this.party = pick.map(([nm, el, col], i) => {
      const g = this.add(new T.Group());
      const ball = new T.Mesh(new T.SphereGeometry(0.85, 24, 16), new T.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.55, roughness: 0.25, metalness: 0.2 })); ball.position.y = 0.85; g.add(ball);
      const halo = new T.Mesh(new T.RingGeometry(1.0, 1.25, 32).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.7, toneMapped: false })); halo.position.y = 0.05; g.add(halo);
      const sp = new T.Sprite(new T.SpriteMaterial({ map: imgTex("../img/t_" + nm + ".webp"), toneMapped: false })); sp.scale.set(1.9, 1.9, 1); sp.position.y = 2.75; g.add(sp);
      const o = { nm, el, col, g, ball, halo, x: A.cx - 4 + i * 4, z: A.cz + this.rz * 0.62, vx: 0, vz: 0, r: 0.85, atk: 70 + Math.round(Math.random() * 20), linked: false };
      g.position.set(o.x, 0, o.z); return o;
    });
    /* 敵：ボス＋手下 */
    this.enemies = [];
    const bn = A.boss || BOSS[Math.floor(Math.random() * BOSS.length)];
    this.bossName = bn;
    this.spawnBoss(A.cx, A.cz - this.rz * 0.42, bn);
    [[-8, -1, "imp"], [8, -1.5, "bat"], [-4.5, 3.4, "golem"], [5, 3, "wisp"]].forEach(([dx, dz, k]) => this.spawn(k, A.cx + dx, A.cz + dz));
    /* ねらいの矢印 */
    const am = new T.MeshBasicMaterial({ color: 0xffe066, toneMapped: false, depthTest: false });
    this.arrow = this.add(new T.Group()); const shaft = new T.Mesh(new T.BoxGeometry(0.34, 0.06, 3.2), am); shaft.position.z = 2.3; shaft.renderOrder = 60; this.arrow.add(shaft);
    const head = new T.Mesh(new T.ConeGeometry(0.7, 1.3, 3).rotateX(Math.PI / 2), am); head.position.z = 4.4; head.renderOrder = 60; this.arrow.add(head);
    this.arrow.position.y = 0.2;
    G.ui().act.textContent = "⚔️ ためて放つ";
    ctx.cam.yaw = 0; ctx.cam.pitch = 1.0; ctx.cam.dist = 30;
    this.camT = new T.Vector3(A.cx, 0, A.cz + 2);
    G.msg('<b class="big">BOSS BATTLE</b><p>ボス「' + bn + '」があらわれた！</p><p>' + (ctx.MOBILE ? "スティックの左右で向き・ボタンを押してためて離す" : "A/D で向き・E（スペース）を押してためて離す") + "</p><p>仲間にふれると BURST LINK・ゲージ満タンで FULL BURST</p>", 3600);
    this.phaseT = 2.2;
    const pl = ctx.player; pl.x = A.cx; pl.z = A.cz + this.rz + 3.5; pl.yaw = Math.PI;
  }
  Burst.prototype = Object.create(G.Base.prototype);
  Burst.prototype.ownsMove = true;
  Burst.prototype.ownsCam = true;

  Burst.prototype.spawnBoss = function (x, z, nm) {
    const g = this.add(new T.Group());
    const ped = new T.Mesh(new T.CylinderGeometry(2.8, 3.2, 0.8, 24), new T.MeshStandardMaterial({ color: 0x3a2a4a, roughness: 0.7 })); ped.position.y = 0.4; g.add(ped);
    const aura = new T.Mesh(new T.RingGeometry(2.4, 3.4, 40).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ color: 0xff3a6a, transparent: true, opacity: 0.6, toneMapped: false })); aura.position.y = 0.85; g.add(aura);
    const sp = new T.Sprite(new T.SpriteMaterial({ map: imgTex("../MagiBurst/img/e_" + nm + ".webp"), toneMapped: false })); sp.scale.set(7, 7, 1); sp.position.y = 4.6; g.add(sp);
    const bar = textSprite(256, 64); bar.scale.set(5.2, 1.3, 1); bar.position.y = 8.8; g.add(bar);
    g.position.set(x, 0, z);
    const e = { kind: "boss", nm, g, sp, aura, bar, x, z, r: 2.7, hp: 1500, max: 1500, cd: 3, cdMax: 3, atk: 160, boss: true, wob: 0 };
    this.enemies.push(e); this.drawBar(e); return e;
  };
  Burst.prototype.spawn = function (kind, x, z) {
    const g = this.add(new T.Group()), M = (c, e) => new T.MeshStandardMaterial({ color: c, emissive: e || 0x000000, emissiveIntensity: e ? 0.6 : 0, roughness: 0.6 });
    const eye = (px, py, pz) => { const m = new T.Mesh(new T.SphereGeometry(0.12, 8, 6), new T.MeshBasicMaterial({ color: 0xfff27a, toneMapped: false })); m.position.set(px, py, pz); g.add(m); };
    let r = 0.9, hp = 240, atk = 60, cd = 2;
    if (kind === "imp") { const b = new T.Mesh(new T.ConeGeometry(0.8, 1.7, 12), M(0xc8342e)); b.position.y = 0.85; g.add(b); [-1, 1].forEach((k) => { const h = new T.Mesh(new T.ConeGeometry(0.12, 0.45, 6), M(0x2a1a14)); h.position.set(k * 0.3, 1.75, 0); h.rotation.z = -k * 0.4; g.add(h); }); eye(-0.18, 1.2, 0.5); eye(0.18, 1.2, 0.5); }
    else if (kind === "bat") { const b = new T.Mesh(new T.SphereGeometry(0.6, 14, 10), M(0x6a3a9a)); b.position.y = 1.6; g.add(b); [-1, 1].forEach((k) => { const wg = new T.Mesh(new T.PlaneGeometry(1.3, 0.7), new T.MeshStandardMaterial({ color: 0x3a1a5a, side: T.DoubleSide })); wg.position.set(k * 0.95, 1.7, 0); wg.userData.wing = k; g.add(wg); }); eye(-0.2, 1.7, 0.5); eye(0.2, 1.7, 0.5); hp = 180; atk = 50; cd = 1; }
    else if (kind === "golem") { [[0, 0.6, 1.4, 1.2, 1.0], [0, 1.6, 1.1, 0.9, 0.9], [0, 2.3, 0.7, 0.6, 0.6]].forEach(([px, py, sx, sy, sz]) => { const b = new T.Mesh(new T.BoxGeometry(sx, sy, sz), M(0x8a8478)); b.position.set(px, py, 0); g.add(b); }); eye(-0.15, 2.35, 0.32); eye(0.15, 2.35, 0.32); r = 1.0; hp = 420; atk = 90; cd = 3; }
    else { const b = new T.Mesh(new T.SphereGeometry(0.55, 16, 12), M(0x6ac8ff, 0x3a9aff)); b.position.y = 1.4; g.add(b); const h = new T.Mesh(new T.SphereGeometry(0.95, 16, 12), new T.MeshBasicMaterial({ color: 0x6ac8ff, transparent: true, opacity: 0.25, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false })); h.position.y = 1.4; g.add(h); hp = 200; atk = 70; cd = 2; }
    const bar = textSprite(128, 40); bar.scale.set(1.9, 0.6, 1); bar.position.y = kind === "golem" ? 3.1 : 2.6; g.add(bar);
    g.position.set(x, 0, z);
    const e = { kind, g, bar, x, z, r, hp, max: hp, cd, cdMax: cd, atk, wob: Math.random() * 9 };
    this.enemies.push(e); this.drawBar(e); return e;
  };
  Burst.prototype.drawBar = function (e) {
    const u = e.bar.userData, g = u.g, W = u.c.width, H = u.c.height;
    g.clearRect(0, 0, W, H);
    g.fillStyle = "rgba(10,6,20,.8)"; g.fillRect(0, H * 0.45, W, H * 0.4);
    const k = clamp(e.hp / e.max, 0, 1); g.fillStyle = k > 0.5 ? "#5ae08a" : k > 0.25 ? "#ffd84a" : "#ff4a5a"; g.fillRect(3, H * 0.45 + 3, (W - 6) * k, H * 0.4 - 6);
    g.font = "900 " + Math.round(H * 0.42) + "px sans-serif"; g.textAlign = "left"; g.textBaseline = "top"; g.fillStyle = e.cd <= 1 ? "#ff5a6e" : "#fff"; g.strokeStyle = "#000"; g.lineWidth = 4;
    const tx = (e.boss ? e.nm + "  " : "") + "⏳" + e.cd; g.strokeText(tx, 4, 0); g.fillText(tx, 4, 0);
    u.t.needsUpdate = true;
  };
  /* ダメージの数字（浮かんで消える） */
  Burst.prototype.num = function (x, y, z, text, col, big) {
    const sp = textSprite(256, 96), u = sp.userData, g = u.g;
    g.font = "900 " + (big ? 78 : 60) + "px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.lineWidth = 9; g.strokeStyle = "#1a0a14"; g.strokeText(text, 128, 48); g.fillStyle = col || "#ffe066"; g.fillText(text, 128, 48); u.t.needsUpdate = true;
    sp.scale.set(big ? 4.2 : 3, big ? 1.58 : 1.12, 1); sp.position.set(x, y, z); this.add(sp);
    this.nums.push({ sp, t: 0 });
  };
  Burst.prototype.burstRing = function (x, z, r, col) {
    const m = this.add(new T.Mesh(new T.RingGeometry(0.6, 1, 48).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9, side: T.DoubleSide, toneMapped: false, depthWrite: false })));
    m.position.set(x, 0.3, z); this.fx.push({ m, t: 0, r });
  };
  Burst.prototype.hurt = function (e, d, col) {
    if (e.hp <= 0) return;
    d = Math.round(d); e.hp -= d; this.dmgTotal += d; this.drawBar(e);
    this.num(e.x, e.boss ? 6.5 : 2.6, e.z, String(d), col, d >= 300);
    e.wob = 0.35;
    if (e.hp <= 0) {
      e.dead = 0.001; this.burstRing(e.x, e.z, e.boss ? 9 : 4, e.boss ? 0xffd84a : 0xff8a5a);
      if (e.boss) this.win = true;
    }
  };
  Burst.prototype.launch = function () {
    const o = this.party[this.cur], v = 13 + this.pow * 17, fb = this.gauge >= 100;
    o.vx = Math.cos(this.aim) * v * (fb ? 1.25 : 1); o.vz = Math.sin(this.aim) * v * (fb ? 1.25 : 1);
    this.fb = fb; if (fb) { this.gauge = 0; G.msg('<b class="big">FULL BURST!!</b><p>' + o.nm + " の全力の一撃！</p>", 1300); G.confetti(30); }
    this.combo = 0; this.moveT = 0; this.phase = "move"; this.party.forEach((p) => { p.linked = false; });
    this.hitCool = new Map();
    if (this.ctx.player.av && this.ctx.player.av.play) this.ctx.player.av.play("throw", 0.5);
  };
  Burst.prototype.update = function (dt, inp) {
    const ctx = this.ctx, A = this.A, btn = this.input(inp), h = G.ui();
    this.t += dt;
    /* 見た目：揺れ・回転・羽ばたき・数字・輪 */
    this.rune.rotation.y += dt * 0.05;
    this.enemies.forEach((e) => {
      e.wob = Math.max(0, (e.wob || 0) - dt);
      if (e.dead) { e.dead += dt; const s = Math.max(0, 1 - e.dead * 2.2); e.g.scale.setScalar(s); if (s <= 0 && e.g.parent) e.g.parent.remove(e.g); return; }
      e.g.position.set(e.x + (e.wob > 0 ? Math.sin(this.t * 60) * 0.12 : 0), e.kind === "bat" || e.kind === "wisp" ? Math.sin(this.t * 2 + e.x) * 0.25 : 0, e.z);
      e.g.children.forEach((c) => { if (c.userData.wing) c.rotation.y = c.userData.wing * Math.sin(this.t * 14) * 0.6; });
      if (e.boss) { e.aura.rotation.y += dt * 0.8; e.sp.position.y = 4.6 + Math.sin(this.t * 1.4) * 0.25; }
    });
    for (let i = this.nums.length - 1; i >= 0; i--) { const n = this.nums[i]; n.t += dt; n.sp.position.y += dt * 1.6; n.sp.material.opacity = clamp(1.6 - n.t, 0, 1); if (n.t > 1.6) { n.sp.parent && n.sp.parent.remove(n.sp); this.nums.splice(i, 1); } }
    for (let i = this.fx.length - 1; i >= 0; i--) { const f = this.fx[i]; f.t += dt; const s = 1 + f.t * f.r * 2.2; f.m.scale.set(s, 1, s); f.m.material.opacity = clamp(0.9 - f.t * 1.4, 0, 1); if (f.t > 0.7) { f.m.parent && f.m.parent.remove(f.m); this.fx.splice(i, 1); } }
    this.party.forEach((o, i) => { o.g.position.set(o.x, 0, o.z); o.ball.rotation.x += o.vz * dt; o.ball.rotation.z -= o.vx * dt; o.halo.material.opacity = i === this.cur && this.phase === "aim" ? 0.6 + Math.sin(this.t * 6) * 0.3 : 0.35; });
    /* 進行 */
    if (this.done) { this.cam(dt); return; }
    if (this.phase === "intro") { this.phaseT -= dt; if (this.phaseT <= 0) this.phase = "aim"; }
    else if (this.phase === "aim") {
      const o = this.party[this.cur];
      this.aim += (inp.ix || 0) * dt * 1.6;
      this.arrow.visible = true; this.arrow.position.set(o.x, 0.2, o.z); this.arrow.rotation.y = Math.PI / 2 - this.aim;
      this.arrow.scale.setScalar(this.charging ? 0.8 + this.pow * 0.9 : 1);
      if (btn.press) { this.charging = true; this.powT = 0; }
      if (this.charging) {
        this.powT += dt; this.pow = 0.5 - 0.5 * Math.cos(this.powT * 2.4);
        h.pow.classList.add("on"); h.powI.style.width = Math.round(this.pow * 100) + "%";
        if (btn.release || !btn.held) { this.charging = false; h.pow.classList.remove("on"); this.arrow.visible = false; this.launch(); }
      }
    } else if (this.phase === "move") {
      this.moveT += dt;
      const steps = 3, sdt = dt / steps;
      for (let s = 0; s < steps; s++) this.physics(sdt);
      const moving = this.party.some((o) => Math.hypot(o.vx, o.vz) > 0.4);
      if (!moving || this.moveT > 7) { this.party.forEach((o) => { o.vx = o.vz = 0; }); this.afterShot(); }
    } else if (this.phase === "enemy") {
      this.phaseT -= dt;
      if (this.phaseT <= 0) { this.phase = "aim"; this.cur = (this.cur + 1) % this.party.length; this.fb = false; }
    }
    /* HUD */
    const o = this.party[this.cur];
    h.info.innerHTML = '<span class="tr">HP ' + Math.max(0, Math.round(this.hp)) + " / " + this.hpMax + '</span>　<span class="tb">ゲージ ' + Math.min(100, Math.round(this.gauge)) + "%</span>";
    h.sub.textContent = this.phase === "aim" ? "▶ " + o.nm + "（" + o.el + "）の番" + (this.gauge >= 100 ? "　⚡ FULL BURST 準備OK！" : "") : this.phase === "move" ? (this.combo ? this.combo + " HIT!" : "") : this.phase === "enemy" ? "敵のターン…" : "";
    h.act.textContent = this.gauge >= 100 ? "⚡ FULL BURST" : "⚔️ ためて放つ";
    this.cam(dt);
  };
  Burst.prototype.physics = function (dt) {
    const A = this.A, rx = this.rx, rz = this.rz;
    this.party.forEach((o) => {
      const v = Math.hypot(o.vx, o.vz); if (v < 0.01) return;
      const nv = Math.max(0, v - (2.2 + v * 0.05) * dt); o.vx *= nv / v; o.vz *= nv / v;
      o.x += o.vx * dt; o.z += o.vz * dt;
      /* 闘技場のふち（だ円）ではね返る */
      const ux = (o.x - A.cx) / (rx - o.r), uz = (o.z - A.cz) / (rz - o.r), q = ux * ux + uz * uz;
      if (q > 1) {
        const s = 1 / Math.sqrt(q); o.x = A.cx + (o.x - A.cx) * s; o.z = A.cz + (o.z - A.cz) * s;
        let nx = (o.x - A.cx) / (rx * rx), nz = (o.z - A.cz) / (rz * rz); const nl = Math.hypot(nx, nz) || 1; nx /= nl; nz /= nl;
        const dv = o.vx * nx + o.vz * nz; if (dv > 0) { o.vx -= 2 * dv * nx; o.vz -= 2 * dv * nz; o.vx *= 0.96; o.vz *= 0.96; }
      }
      /* 敵に当たる */
      this.enemies.forEach((e) => {
        if (e.dead) return;
        const dx = o.x - e.x, dz = o.z - e.z, d = Math.hypot(dx, dz), R = o.r + e.r;
        if (d < R && d > 1e-4) {
          const nx = dx / d, nz = dz / d; o.x = e.x + nx * R; o.z = e.z + nz * R;
          const dv = o.vx * nx + o.vz * nz; if (dv < 0) { o.vx -= 2 * dv * nx; o.vz -= 2 * dv * nz; o.vx *= 0.95; o.vz *= 0.95; }
          const key = e, last = this.hitCool.get(key) || -9; if (this.moveT - last < 0.25) return; this.hitCool.set(key, this.moveT);
          this.combo++; this.maxCombo = Math.max(this.maxCombo, this.combo);
          const sp = Math.hypot(o.vx, o.vz), dmg = o.atk * (0.7 + sp / 20) * (1 + this.combo * 0.12) * (this.fb ? 3 : 1);
          this.hurt(e, dmg, this.fb ? "#ffd84a" : "#fff");
          this.gauge = Math.min(100, this.gauge + (this.fb ? 0 : 9));
          this.burstRing(e.x, e.z, 1.2, o.col);
        }
      });
      /* 止まっている仲間にふれる → BURST LINK（まわりの敵へ） */
      this.party.forEach((p) => {
        if (p === o || p.linked || Math.hypot(p.vx, p.vz) > 0.5) return;
        const d = Math.hypot(o.x - p.x, o.z - p.z); if (d > o.r + p.r) return;
        p.linked = true; this.burstRing(p.x, p.z, 4.2, p.col);
        this.num(p.x, 3.4, p.z, "BURST LINK", "#7cf0ff");
        this.enemies.forEach((e) => { if (!e.dead && Math.hypot(e.x - p.x, e.z - p.z) < 7.5) this.hurt(e, p.atk * 1.1 * (1 + this.combo * 0.05), "#7cf0ff"); });
        /* 押しのける */
        const nx = (p.x - o.x) / (d || 1), nz = (p.z - o.z) / (d || 1); o.x = p.x - nx * (o.r + p.r); o.z = p.z - nz * (o.r + p.r);
        const dv = o.vx * nx + o.vz * nz; if (dv > 0) { o.vx -= 2 * dv * nx; o.vz -= 2 * dv * nz; }
      });
    });
  };
  Burst.prototype.afterShot = function () {
    if (this.combo >= 3) this.num(this.A.cx, 5, this.A.cz + 2, this.combo + " COMBO!", "#ffb0d0", true);
    if (this.win) return this.finish(true);
    /* 敵のターン：数字を 1 減らし、0 の敵が攻撃 */
    this.turn++;
    let dmg = 0;
    this.enemies.forEach((e) => {
      if (e.dead) return;
      e.cd--; if (e.cd <= 0) { e.cd = e.cdMax; dmg += e.atk * (0.85 + Math.random() * 0.3); this.burstRing(e.x, e.z, e.boss ? 10 : 3, 0xff3a5a); e.wob = 0.5; }
      this.drawBar(e);
    });
    /* ボスが弱ると手下を呼ぶ */
    const B = this.enemies.find((e) => e.boss && !e.dead);
    if (B && B.hp < B.max * 0.5 && !this.summoned) { this.summoned = true; this.spawn("wisp", this.A.cx - 6, this.A.cz - 4); this.spawn("imp", this.A.cx + 6, this.A.cz - 4); G.msg('<b class="big">ボスが仲間を呼んだ！</b>', 1500); }
    if (dmg > 0) {
      this.hp -= dmg; this.num(this.A.cx, 4, this.A.cz + this.rz * 0.6, "-" + Math.round(dmg), "#ff5a6e", true);
      G.ui().root.classList.add("hit"); setTimeout(() => G.ui().root.classList.remove("hit"), 400);
      if (this.hp <= 0) return this.finish(false);
    }
    this.phase = "enemy"; this.phaseT = dmg > 0 ? 1.1 : 0.4;
  };
  Burst.prototype.finish = function (win) {
    if (this.done) return; this.done = true;
    setTimeout(() => G.endPanel(this, win ? "🏆 ボス「" + this.bossName + "」をたおした！" : "パーティーはたおれてしまった…",
      ["ターン " + this.turn + "・最大コンボ " + this.maxCombo + "・合計ダメージ " + this.dmgTotal.toLocaleString("ja-JP"), win ? "MagiBurst のアプリでは、もっと強いボスが待っています" : "仲間にふれて BURST LINK、ゲージ満タンで FULL BURST！"], win), 800);
  };
  Burst.prototype.cam = function (dt) {
    const A = this.A, cam = this.ctx.camera;
    let tx = A.cx, tz = A.cz + 1;
    if (this.phase === "move") { const o = this.party.reduce((a, b) => (Math.hypot(b.vx, b.vz) > Math.hypot(a.vx, a.vz) ? b : a)); tx = A.cx + (o.x - A.cx) * 0.35; tz = A.cz + (o.z - A.cz) * 0.35 + 1; }
    this.camT.x += (tx - this.camT.x) * Math.min(1, dt * 2.5); this.camT.z += (tz - this.camT.z) * Math.min(1, dt * 2.5);
    const want = new T.Vector3(this.camT.x, 27, this.camT.z + 21);
    cam.position.lerp(want, Math.min(1, dt * 3)); cam.lookAt(this.camT.x, 0, this.camT.z - 1);
  };
  Burst.prototype.dispose = function () {
    G.Base.prototype.dispose.call(this);
    this.nums.forEach((n) => n.sp.parent && n.sp.parent.remove(n.sp));
    this.fx.forEach((f) => f.m.parent && f.m.parent.remove(f.m));
    this.enemies.forEach((e) => e.g.parent && e.g.parent.remove(e.g));
  };

  const _start = G.start;
  G.start = function (kind, ctx) { if (kind === "burst") return new Burst(ctx); return _start(kind, ctx); };
  window.XGames.start = G.start;
})();
