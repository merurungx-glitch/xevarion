/* ══════════════════════════════════════════════════════════════════
   XEVARION PARK — 音楽とショー（★★ 2026-09-29 ご指定）
   ------------------------------------------------------------------
   ・音楽：メインテーマ＝パークの中（外）／DAYTIME PARADE THEME＝昼のパレード／XEVARION NIGHT＝夜の噴水ショー。
     曲は audio/park_*.mp3（ご提供の曲）。拍・小節・盛り上がり・強い音の時刻は audio/park_music.js（曲を解析して作ったデータ）。
     → 照明・噴水・花火・フロートの動きを、実際の曲の拍と盛り上がりに合わせる。
   ・ライブアリーナ（ENTERTAINMENT・屋内）：大画面で YouTube の動画（=LOVE など）を見ながら、ムービングライト・レーザー・
     ペンライトの観客・LED の画面・ストロボでライブ会場のように。YouTube の音はブラウザの決まりで読めないので、
     曲のテンポ（BPM・タップで合わせられる）に合わせて光らせる。動画を流していないときは、メインテーマでデモのライブ。
   ・デイタイムパレード（昼）：マーケット → 中央噴水公園をひとまわり → マーケット。オリジナルのフロート6台と踊る人たち・紙吹雪。
   ・XEVARION NIGHT（夜）：中央の大噴水で、噴水の水柱・霧の幕への映像・レーザー・サーチライト・花火を曲に合わせて。
   ══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const T = THREE, X = XTex, P = XWorld.World.prototype, TAU = Math.PI * 2, XP = XPark;
  const MOBILE = XP.MOBILE;

  /* ══════════════ 曲の解析データ ══════════════ */
  const AL = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";
  function decode(s) { const a = new Float32Array(Math.max(1, s.length)); for (let i = 0; i < s.length; i++) a[i] = AL.indexOf(s[i]) / 63; return a; }
  function Track(key) {
    const d = (window.XPARK_MUSIC || {})[key] || { dur: 120, bpm: 120, beats: [], sections: [[0, 1]], hits: [], rises: [], env: {} };
    this.key = key; this.dur = d.dur; this.bpm = d.bpm; this.beats = d.beats || []; this.bar0 = d.bar0 || 0; this.sections = d.sections || [[0, 1]]; this.hits = d.hits || []; this.rises = d.rises || [];
    this.env = {}; ["bass", "low", "mid", "high", "loud"].forEach((k) => { this.env[k] = d.env && d.env[k] ? decode(d.env[k]) : new Float32Array([0.5]); });
    if (!this.beats.length) { for (let t = 0; t < this.dur; t += 60 / this.bpm) this.beats.push(t); }
  }
  Track.prototype.at = function (tt, o) {
    o = o || {};
    const t = ((tt % this.dur) + this.dur) % this.dur, B = this.beats;
    let lo = 0, hi = B.length - 1, i = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (B[m] <= t) { i = m; lo = m + 1; } else hi = m - 1; }
    const tb = i >= 0 ? B[i] : 0, tn = i + 1 < B.length ? B[i + 1] : tb + 60 / this.bpm;
    o.beat = i; o.beatPh = Math.max(0, Math.min(1, (t - tb) / Math.max(0.05, tn - tb)));
    o.bar = Math.floor((i - this.bar0) / 4); o.inBar = (((i - this.bar0) % 4) + 4) % 4;
    o.pulse = Math.exp(-(t - tb) * 7); o.down = o.inBar === 0 ? o.pulse : 0;
    const k = t * 10, j = Math.floor(k), f = k - j, E = this.env, S = (a) => a.length > 1 ? a[Math.min(a.length - 1, j)] * (1 - f) + a[Math.min(a.length - 1, j + 1)] * f : 0.5;
    o.bass = S(E.bass); o.low = S(E.low); o.mid = S(E.mid); o.high = S(E.high); o.loud = S(E.loud);
    let lv = 1; for (const q of this.sections) { if (q[0] <= t) lv = q[1]; else break; } o.level = lv;
    let hp = 0; for (const h of this.hits) { if (h > t) break; if (t - h < 1.2) hp = Math.max(hp, Math.exp(-(t - h) * 4)); } o.hit = hp;
    o.t = t; return o;
  };
  /* t0〜t1 の間に来た「強い音」「急に大きくなる所」 */
  Track.prototype.events = function (t0, t1) {
    const out = []; if (t1 < t0) return out;
    const a = ((t0 % this.dur) + this.dur) % this.dur, b = a + (t1 - t0);
    const test = (list, kind) => list.forEach((h) => { if ((h > a && h <= b) || (h + this.dur > a && h + this.dur <= b)) out.push(kind); });
    test(this.hits, "hit"); test(this.rises, "rise");
    return out;
  };
  const TR = {}; ["main", "main2", "parade", "night", "chase", "gate"].forEach((k) => { TR[k] = new Track(k); });

  /* ══════════════ 音（曲の音量・つなぎ） ══════════════
     ★ 2026-09-29b：起動したときは音楽オフ（♪ を押すとオン＋お知らせ）。パークの中は Main Theme と Main Theme2 を交互に
       （1曲おわったら次へ）。昼のパレード＝Daytime Parade・夜の噴水＝XEVARION NIGHT・ハーバーの水上パレード＝Chase the Light。
       ★ mp3/m4a はオンにしてから読む（preload none）＝音楽を使わない人は 27MB を落とさない。 */
  const FILE = { main: "audio/park_main.mp3", main2: "audio/park_main2.m4a", parade: "audio/park_parade.mp3", night: "audio/park_night.mp3", chase: "audio/park_chase.mp3", gate: "audio/park_gate.mp3" };
  const NAMES = { main: "Main Theme — XEVARION PARK", main2: "Main Theme2 — XEVARION PARK", parade: "Daytime Parade Theme", night: "XEVARION NIGHT — Fountain & Night Show Theme", chase: "Chase the Light", gate: "XEVARION GATE — Entrance Theme" };
  const AU = {
    el: {}, vol: {}, target: {}, master: 0.75, on: false, unlocked: false, park: 0, PARK: ["main", "main2"], NAMES,
    init() {
      Object.keys(FILE).forEach((k) => { const a = new Audio(); a.src = FILE[k]; a.loop = this.PARK.indexOf(k) < 0; a.preload = "none"; a.volume = 0; this.el[k] = a; this.vol[k] = 0; this.target[k] = 0; });
      this.PARK.forEach((k, i) => this.el[k].addEventListener("ended", () => { if (this.park === i) this.nextPark(); }));
      try { const v = parseFloat(localStorage.getItem("xeva_park_volume")); if (v >= 0 && v <= 1) this.master = v; } catch (e) {}
      const un = () => { this.unlocked = true; removeEventListener("pointerdown", un, true); removeEventListener("keydown", un, true); removeEventListener("touchstart", un, true); this.kick(); };
      addEventListener("pointerdown", un, true); addEventListener("keydown", un, true); addEventListener("touchstart", un, true);
    },
    parkKey() { return this.PARK[this.park]; },
    /* ★ 2026-09-29d ゲートのまわりでは XEVARION GATE（入口の曲）。gateK＝ゲートの曲の強さ 0〜1 */
    gateK: 0,
    curPark() { return this.gateK > 0.5 ? "gate" : this.PARK[this.park]; },
    /* パークの曲を次へ（Main Theme ⇄ Main Theme2） */
    nextPark() {
      const old = this.parkKey(); this.park = (this.park + 1) % this.PARK.length; const k = this.parkKey();
      this.vol[k] = this.vol[old]; this.vol[old] = 0; this.target[k] = this.target[old]; this.target[old] = 0;
      try { this.el[old].pause(); this.el[old].currentTime = 0; } catch (e) {} try { this.el[k].currentTime = 0; } catch (e) {}
      if (this.unlocked && this.on && this.target[k] > 0.01) this.el[k].play().catch(() => {});
      if (this.onTrack) this.onTrack(k);
    },
    kick() { for (const k in this.el) if (this.on && this.target[k] > 0.01 && this.el[k].paused) this.el[k].play().catch(() => {}); },
    setOn(v) { this.on = !!v; if (v) { this.unlocked = true; this.kick(); } else for (const k in this.el) { try { this.el[k].pause(); } catch (e) {} this.vol[k] = 0; } },
    setVolume(v) { this.master = Math.max(0, Math.min(1, v)); try { localStorage.setItem("xeva_park_volume", String(this.master)); } catch (e) {} },
    restart(k) { const a = this.el[k]; try { a.currentTime = 0; } catch (e) {} if (this.unlocked && this.on) a.play().catch(() => {}); },
    playing(k) { const a = this.el[k]; return !!a && !a.paused && a.readyState >= 2; },
    time(k) { return this.el[k].currentTime || 0; },
    /* いま一番大きく鳴っている曲（なければ null） */
    now() { if (!this.on) return null; let best = null, bv = 0.04; for (const k in this.vol) if (this.vol[k] > bv && !this.el[k].paused) { bv = this.vol[k]; best = k; } return best; },
    update(dt) {
      for (const k in this.el) {
        const a = this.el[k], tg = this.on ? this.target[k] : 0;
        this.vol[k] += (tg - this.vol[k]) * Math.min(1, dt * (tg > this.vol[k] ? 1.1 : 2.2));
        const v = Math.max(0, Math.min(1, this.vol[k] * this.master));
        if (Math.abs(a.volume - v) > 0.002) a.volume = v;
        if (tg > 0.01 && a.paused && this.unlocked && this.on && !a._st && !a.ended) { a._st = true; a.play().then(() => { a._st = false; }).catch(() => { a._st = false; }); }
        if (tg <= 0.001 && this.vol[k] < 0.004 && !a.paused) a.pause();
      }
    }
  };

  /* ══════════════ まとめて1つの形にする（動く物＝フロートなど） ══════════════
     park.js / park_style.js の部品（geo・box・sign・giantProp・lantern…）を、そのまま「動かせるグループ」に組み立てる */
  P.captureGroup = function (fn) {
    const w = this, keep = ["batch", "colliders", "casters", "lamps", "seats", "walkPaths", "roads", "trees", "heightExtra", "riverGaps", "_detail", "_landmark"], saved = {};
    keep.forEach((k) => { saved[k] = w[k]; });
    const tmp = new (w.batch.constructor)();
    w.batch = tmp; w.colliders = []; w.casters = []; w.lamps = []; w.seats = []; w.walkPaths = []; w.roads = []; w.trees = []; w.heightExtra = []; w.riverGaps = []; w._detail = false; w._landmark = false;
    try { fn(); } finally { keep.forEach((k) => { w[k] = saved[k]; }); }
    const g = new T.Group(); tmp.build(g);
    g.children.forEach((m) => { m.castShadow = true; m.receiveShadow = true; });
    return g;
  };

  /* ══════════════ ライブ会場の演出（★★ 2026-09-29b XEVARION DOME：park_dome.js が作る。ここは光・画面・炎・紙吹雪） ══════════════ */
  const PAL = [[0xff4fb0, 0x4ff0ff], [0xa86aff, 0xffd84a], [0xffffff, 0x88aaff], [0xff3a4a, 0x3a8aff], [0x4fff9a, 0xff4fb0], [0xffa03a, 0xff4fb0]];
  const Arena = {
    st: {}, bpm: 128, tap: [], tapT0: 0, clock: 0, pat: 0, lastBar: -1, demo: false, cA: new T.Color(), cB: new T.Color(), cC: new T.Color(), videoPal: null, lastEv: 0,
    mode(ctx) { const A = ctx.world.liveArena; if (!A) return "off"; const p = ctx.player, inside = A.inside ? A.inside(p) : (p.x > A.x0 && p.x < A.x1 && p.z > A.z0 && p.z < A.z1); if (ctx.theater && ctx.theater.key === "arena" && ctx.theater.playing) return "video"; if (inside || this.demo) return "demo"; return Math.hypot(p.x - A.cx, p.z - A.cz) < (A.R ? A.R + 170 : 140) ? "near" : "off"; },
    tapBeat() { const now = performance.now() / 1000; this.tap = this.tap.filter((t) => now - t < 3).concat([now]); if (this.tap.length >= 3) { const d = []; for (let i = 1; i < this.tap.length; i++) d.push(this.tap[i] - this.tap[i - 1]); const m = d.reduce((a, b) => a + b, 0) / d.length; if (m > 0.25 && m < 1.5) this.bpm = Math.round(60 / m); } this.clock = 0; return this.bpm; },
    /* 動画のサムネイルから色をとる（main.js が呼ぶ）：あざやかな色を3つ */
    setVideoColors(cols) { this.videoPal = cols && cols.length >= 2 ? cols : null; },
    emit(F, x, y, z, n, o) { for (let i = 0; i < n; i++) { const p = F.P2[F.k % F.P2.length]; F.k++; p.x = x + (Math.random() - 0.5) * (o.sp || 1); p.y = y; p.z = z + (Math.random() - 0.5) * (o.sp || 1); p.vx = (Math.random() - 0.5) * (o.vx || 2); p.vy = o.vy * (0.7 + Math.random() * 0.5); p.vz = (Math.random() - 0.5) * (o.vx || 2); p.life = (o.life || 1) * (0.7 + Math.random() * 0.6); p.c = o.col ? o.col() : [1, 0.6, 0.2]; p.g = o.g; p.d = o.d || 1.5; } },
    stepPts(F, dt) { let alive = false; for (let i = 0; i < F.P2.length; i++) { const p = F.P2[i]; if (p.life <= 0) { F.fp[i * 3 + 1] = -999; continue; } alive = true; p.life -= dt; p.vy -= p.g * dt; const d = Math.exp(-(p.d || 1.5) * dt); p.vx *= d; p.vy *= d; p.vz *= d; p.x += p.vx * dt + (p.g < 2 && p.g > 0 ? Math.sin(p.life * 5 + i) * 0.02 : 0); p.y += p.vy * dt; p.z += p.vz * dt; F.fp[i * 3] = p.x; F.fp[i * 3 + 1] = p.y; F.fp[i * 3 + 2] = p.z; const f = Math.min(1, p.life) * 2.2; F.fc[i * 3] = p.c[0] * f; F.fc[i * 3 + 1] = p.c[1] * f; F.fc[i * 3 + 2] = p.c[2] * f; } F.pts.geometry.attributes.position.needsUpdate = true; F.pts.geometry.attributes.color.needsUpdate = true; return alive; },
    update(dt, t, ctx) {
      const A = ctx.world.liveArena; if (!A) return;
      const md = this.mode(ctx); this.md = md;
      const vis = md !== "off"; A.beams.forEach((b) => { b.piv.visible = vis; }); A.lasers.forEach((l) => { l.piv.visible = vis; }); (A.spots || []).forEach((l) => { l.piv.visible = vis; });
      const dA = ctx.camera ? Math.hypot(ctx.camera.position.x - A.cx, ctx.camera.position.z - A.cz) : 0, nearA = vis || dA < 240;          /* ★ 2026-09-29d 近づいたら先に出しておく */
      A.crowd.visible = A.pens.visible = nearA; if (A.seats) A.seats.visible = nearA; if (A.led) A.led.visible = vis;
      if (A.wash) A.wash.visible = false;
      const fa = A.flames ? this.stepPts(A.flames, dt) : false, ca = A.conf ? this.stepPts(A.conf, dt) : false; if (A.flames) A.flames.pts.visible = vis && fa; if (A.conf) A.conf.pts.visible = vis && ca;
      if (!vis) { this.flash(0); return; }
      const s = this.st;
      if (md === "video") { this.clock += dt; const bp = 60 / this.bpm, bi = Math.floor(this.clock / bp); s.beatPh = (this.clock % bp) / bp; s.beat = bi; s.bar = Math.floor(bi / 4); s.inBar = bi % 4; s.pulse = Math.exp(-(this.clock % bp) * 7); s.bass = 0.6 + 0.4 * s.pulse; s.level = 2 + ((s.bar >> 3) % 2); s.high = 0.5 + 0.3 * Math.sin(this.clock * 3); s.mid = 0.55; s.loud = 0.7; s.hit = s.inBar === 0 ? s.pulse : 0; }
      else { const pk = AU.curPark(); TR[pk].at(AU.time(pk), s); }
      if (s.bar !== this.lastBar && s.bar % 8 === 0) { this.pat = (this.pat + 1) % 6; const vp = md === "video" && this.videoPal; this.pal = vp ? [vp[(s.bar / 8) % vp.length | 0], vp[((s.bar / 8) + 1) % vp.length | 0], vp[((s.bar / 8) + 2) % vp.length | 0]] : PAL[(s.bar / 8 + (s.level || 0)) % PAL.length | 0]; }
      const newBar = s.bar !== this.lastBar; this.lastBar = s.bar;
      const pal = this.pal || PAL[0], lv = s.level || 1, energy = 0.35 + 0.65 * Math.min(1, (s.bass || 0.5) * 0.7 + lv * 0.18), tt = t;
      this.cA.setHex(pal[0]); this.cB.setHex(pal[1]); this.cC.setHex(pal[2] != null ? pal[2] : pal[0]);
      /* ムービングライト：6 つの動き（小節の8つごとに変わる） */
      A.beams.forEach((b) => {
        let rx = 0, rz = 0; const k = b.i, ph = s.beat + s.beatPh;
        if (this.pat === 0) { rx = Math.sin(tt * 0.9 + k * 0.6) * 0.55; rz = Math.cos(tt * 0.7 + k * 0.4) * 0.35; }
        else if (this.pat === 1) { rx = (s.beat % 2 ? 0.5 : -0.5) * (k % 2 ? 1 : -1); rz = 0.2 * Math.sin(k); }
        else if (this.pat === 2) { rx = Math.sin(ph * Math.PI * 0.5 + k) * 0.5; rz = Math.cos(ph * Math.PI * 0.5 + k) * 0.5; }
        else if (this.pat === 3) { const tx = A.sx, tz = A.cz + Math.sin(tt * 0.5) * 12; rx = Math.atan2(tz - b.fz, 36) * -1; rz = Math.atan2(tx - b.fx, 36); }
        else if (this.pat === 4) { const fanA = (k % 16) / 15 - 0.5; rx = 0.25 + Math.sin(ph * Math.PI) * 0.2; rz = fanA * 1.1; }
        else { rx = Math.sin(tt * 2.2 + k * 1.3) * 0.6; rz = Math.sin(tt * 1.7 + k * 0.7) * 0.4; }
        b.piv.rotation.set(rx, 0, rz);
        b.cone.material.color.copy(k % 3 === 0 ? this.cA : k % 3 === 1 ? this.cB : this.cC).multiplyScalar(energy * (0.6 + 0.8 * s.pulse));
        b.cone.material.opacity = 0.14 + 0.14 * s.pulse;
      });
      const lz = lv >= 2 || md === "video";
      A.lasers.forEach((l) => { l.piv.visible = lz; if (!lz) return; const k = l.i; l.piv.rotation.set(-0.08 - Math.abs(Math.sin(tt * 0.8 + k)) * 0.25, Math.sin(tt * 1.3 + k * 0.5) * 0.5 + (k - 11.5) * 0.04, 0); l.ln.material.color.copy(k % 2 ? this.cB : this.cA).multiplyScalar(1.5 + s.pulse * 2); });
      (A.spots || []).forEach((l) => { const tx = A.sx + Math.sin(tt * 0.4 + l.i) * 6, tz = A.cz + Math.cos(tt * 0.33 + l.i * 2) * 10, dx = tx - l.piv.position.x, dz = tz - l.piv.position.z, dy = -l.piv.position.y + 1.5, dl = Math.hypot(dx, dz); l.piv.rotation.set(0, 0, 0); l.piv.lookAt(tx, 1.5, tz); l.piv.rotateX(-Math.PI / 2); l.cone.material.color.setRGB(1, 0.97, 0.9).multiplyScalar(0.8 + 0.4 * s.pulse); });
      A.U.uBeat.value = s.beat + s.beatPh; A.U.uJump.value = lv >= 2 ? 1 : 0.4; A.U.uWave.value = lv >= 3 ? 1 : 0; A.U.uPen.value.copy(s.bar % 16 < 8 ? this.cA : this.cB);
      /* 屋根の光・ゲートの光（外からも見える） */
      const m = ctx.world.m; if (m.domeA) { m.domeA.color.copy(this.cA).multiplyScalar(0.7 + 0.8 * s.pulse); m.domeB.color.copy(this.cB).multiplyScalar(0.6 + 0.6 * (s.bass || 0.5)); m.domeC.color.copy(this.cC).multiplyScalar(0.8 + 0.6 * s.pulse); }
      const inside = A.inside ? A.inside(ctx.player) : false;
      this.flash(inside && lv >= 3 && s.inBar === 0 ? s.pulse * 0.1 : 0);
      /* 炎（強い音・盛り上がりの小節の頭）・紙吹雪（盛り上がりの入り） */
      if (A.flames && A.flameAt) {
        const hit = (s.hit || 0) > 0.9 && t - this.lastEv > 0.4, down = lv >= 2 && s.inBar === 0 && s.pulse > 0.95 && t - this.lastEv > 0.4;
        if (hit || down) { this.lastEv = t; const all = hit && lv >= 2; A.flameAt.forEach((q, i) => { if (all || (i + s.beat) % 3 === 0) this.emit(A.flames, q[0], q[1], q[2], MOBILE ? 12 : 26, { vy: 16, g: -1.2, life: 1.0, sp: 0.8, vx: 1.6, d: 1.0, col: () => Math.random() < 0.5 ? [1, 0.5, 0.12] : [1, 0.82, 0.3] }); }); }
      }
      if (A.conf && newBar && lv >= 3 && s.bar % 4 === 0) { const cs = [this.cA, this.cB, this.cC, new T.Color(1, 1, 1)]; for (let k = 0; k < 6; k++) { const a = Math.random() * TAU, r = Math.random() * 30; this.emit(A.conf, A.cx + Math.cos(a) * r, 36, A.cz + Math.sin(a) * r, MOBILE ? 50 : 140, { vy: -2, g: 1.2, life: 7, sp: 12, vx: 4, d: 2.5, col: () => { const c = cs[Math.floor(Math.random() * cs.length)]; return [c.r, c.g, c.b]; } }); } }
      /* 床の LED */
      if (A.led && (this._ledT = (this._ledT || 0) + dt) > 0.05) { this._ledT = 0; const g = A.led.geometry, p = g.attributes.position, c = g.attributes.color, hc = new T.Color(); for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), d = Math.hypot(x * 0.6, y * 1.2); const on = Math.sin(d * 0.8 - (s.beat + s.beatPh) * 3.1416) > 0.2; hc.copy((Math.floor(x / 6) + s.beat) % 2 ? this.cA : this.cB).multiplyScalar(on ? 1.6 * energy : 0.06); c.setXYZ(i, hc.r, hc.g, hc.b); } c.needsUpdate = true; }
      /* 客席の上の LED の輪：光が走る */
      if (A.ringScr && (this._rgT = (this._rgT || 0) + dt) > 0.04) { this._rgT = 0; const g = A.ringScr.g, W2 = A.ringScr.w, H2 = A.ringScr.h; const ca = "#" + this.cA.getHexString(), cb = "#" + this.cB.getHexString(); g.fillStyle = "#05030c"; g.fillRect(0, 0, W2, H2); const off = ((s.beat + s.beatPh) * 64) % 128; for (let x = -128; x < W2 + 128; x += 128) { g.fillStyle = ca; g.globalAlpha = 0.9; g.fillRect(x + off, 0, 56, H2); g.fillStyle = cb; g.fillRect(x + off + 64, 0, 56, H2); } g.globalAlpha = 1; g.fillStyle = "#fff"; g.font = "900 40px sans-serif"; for (let x = 0; x < W2; x += 512) g.fillText("XEVARION DOME ✦ LIVE", (x + (t * 120) % 512), 46); A.ringScr.flush(); }
    },
    /* ストロボ（画面をうすく白く光らせる。まぶしすぎないよう弱め・小節の頭だけ） */
    flash(v) { let el = this._fl; if (!el) { el = this._fl = document.createElement("div"); el.style.cssText = "position:fixed;inset:0;z-index:6;pointer-events:none;background:#fff;opacity:0"; document.body.appendChild(el); } const o = v < 0.01 ? 0 : v; if (Math.abs((this._fo || 0) - o) > 0.005) { el.style.opacity = o.toFixed(3); this._fo = o; } },
    drawMain(g, W, H, t) {
      const s = this.st, pal = this.pal || PAL[0];
      g.fillStyle = "#05030c"; g.fillRect(0, 0, W, H);
      const cA = "#" + new T.Color(pal[0]).getHexString(), cB = "#" + new T.Color(pal[1]).getHexString(), pu = s.pulse || 0;
      for (let i = 0; i < 18; i++) { const M8 = W * 0.8, r = (((i * 60 + ((s.beat || 0) + (s.beatPh || 0)) * 40) % M8) + M8) % M8;          /* ★★ 2026-09-29c 拍がマイナス（曲の前）でも半径はプラス（前は例外で画面ごと止まった） */ g.strokeStyle = i % 2 ? cA : cB; g.globalAlpha = 0.5 * (1 - r / (W * 0.8)); g.lineWidth = 8; g.beginPath(); g.arc(W / 2, H / 2, r, 0, TAU); g.stroke(); }
      g.globalAlpha = 1; g.fillStyle = "#fff"; g.textAlign = "center"; g.font = "900 " + Math.round(H * (0.14 + pu * 0.02)) + "px 'M PLUS Rounded 1c',sans-serif"; g.shadowColor = cA; g.shadowBlur = 30; g.fillText("XEVARION DOME", W / 2, H * 0.5);
      g.font = "800 " + Math.round(H * 0.05) + "px 'M PLUS Rounded 1c',sans-serif"; g.shadowBlur = 0; g.fillStyle = "#ffe7ff"; g.fillText(this.md === "demo" ? "XEVARION DOME LIVE" : "E で大画面に YouTube の動画を映せます", W / 2, H * 0.66); g.textAlign = "left";
    },
    drawSide(g, W, H, t, dz) {
      const s = this.st, pal = this.pal || PAL[0], n = 10;
      g.fillStyle = "#05030c"; g.fillRect(0, 0, W, H);
      for (let i = 0; i < n; i++) { const v = Math.max(0.05, Math.min(1, ((i < 3 ? s.bass : i < 6 ? s.mid : s.high) || 0.4) * (0.6 + 0.5 * Math.abs(Math.sin(t * 3 + i * 1.7 + dz))) + (s.pulse || 0) * 0.3)); g.fillStyle = "#" + new T.Color(i % 2 ? pal[0] : pal[1]).getHexString(); g.fillRect(i * W / n + 3, H - v * H, W / n - 6, v * H); }
    }
  };

  /* ══════════════ デイタイムパレード ══════════════ */
  /* ★★ 2026-09-30 ご指定「パレードの始まる場所は人が見えない隠れた部分から開始して、より長いパレードに」
     噴水公園の西の「パレードスタジオ」（大きな扉の建物）の中から出発 → 噴水の輪の南西 → 大通り（マーケット）を南へ → ゲートの前で U ターン →
     大通りを北へ → 噴水の輪を東・北・西とまわって → スタジオの中へ帰る（約 1.6km） */
  const STUDIO = { x: -150, z: 352, w: 30, d: 44 };
  function paradeRoute() {
    const pts = [[STUDIO.x + 2, STUDIO.z], [STUDIO.x + 10, STUDIO.z], [STUDIO.x + 17, STUDIO.z], [-118, 350]];
    const ring = (a0, a1, n) => { for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push([Math.cos(a) * 100, 290 + Math.sin(a) * 100]); } };
    ring(Math.PI * 0.83, Math.PI / 2 + 0.08, 10);
    pts.push([-8, 404], [-15, 440], [-15, 520], [-15, 600], [-15, 680], [-15, 760], [-15, 822]);
    for (let i = 1; i < 12; i++) { const a = Math.PI + i / 12 * Math.PI; pts.push([Math.cos(a) * 15, 836 - Math.sin(a) * 15 * 0.9]); }
    pts.push([15, 822], [15, 760], [15, 680], [15, 600], [15, 520], [15, 440], [8, 404]);
    ring(Math.PI / 2 - 0.08, -Math.PI * 1.17, 40);
    pts.push([-118, 350], [STUDIO.x + 17, STUDIO.z + 4], [STUDIO.x + 8, STUDIO.z + 4], [STUDIO.x - 2, STUDIO.z + 4]);
    return new T.CatmullRomCurve3(pts.map(([x, z]) => new T.Vector3(x, 0, z)), false, "centripetal");
  }
  /* パレードスタジオ（山車の車庫）：かまぼこ屋根・大きな扉（ネオンのふち）・「PARADE STUDIO」 */
  function paradeStudio(w) {
    /* ★★ 2026-09-30b ご指定「パレード開始場所の表示がおかしい」：クリーム色の窓の壁（マンションに見えた）をやめ、
       紺の壁＋金の帯・正面に塔2本とかざりの壁（目・看板）・扉のネオンのアーチ・目の高さの案内板 */
    const { x, z, w: W2, d: D } = STUDIO, H = 14, dw = 16, x1 = x + W2 / 2, WK = "pNavy";
    w.box(WK, x, 0, z - D / 2 + 0.3, W2, H, 0.6, { collide: true }); w.box(WK, x, 0, z + D / 2 - 0.3, W2, H, 0.6, { collide: true });
    w.box(WK, x - W2 / 2 + 0.3, 0, z, 0.6, H, D, { collide: true });
    [[-1, (D - dw) / 2], [1, (D - dw) / 2]].forEach(([s, len]) => w.box(WK, x1 - 0.3, 0, z + s * (dw / 2 + len / 2), 0.6, H, len, { collide: true }));
    w.box(WK, x1 - 0.3, 9.5, z, 0.6, H - 9.5, dw);
    /* 金の帯（上と中ほど）・すその石 */
    [[H - 0.7, 0.45], [5.2, 0.25]].forEach(([y, hh]) => { w.box("goldOrn", x, y, z - D / 2 - 0.02, W2 + 0.2, hh, 0.7); w.box("goldOrn", x, y, z + D / 2 + 0.02, W2 + 0.2, hh, 0.7); w.box("goldOrn", x - W2 / 2 - 0.02, y, z, 0.7, hh, D + 0.2);
      [-1, 1].forEach((s) => w.box("goldOrn", x1 + 0.02, y, z + s * (dw / 2 + (D - dw) / 4), 0.7, hh, (D - dw) / 2)); });
    w.box("stoneW", x, 0, z, W2 + 0.4, 0.8, D + 0.4);
    w.box("pBlack", x, 0.02, z, W2 - 1.2, 0.04, D - 1.2);
    w.box("pBlack", x, H - 0.3, z, W2 - 1, 0.3, D - 1);
    const R = W2 / 2 + 0.6, g = new T.CylinderGeometry(R, R, D + 1.2, 24, 1, false, -Math.PI / 2, Math.PI).rotateX(-Math.PI / 2).scale(1, 0.55, 1); w.geo("kwR" in w.m ? "kwR" : "pRed", g, x, H, z);
    /* 正面のかざりの壁（屋根のふちをかくす）・目・看板 */
    w.box(WK, x1 + 0.3, H - 0.2, z, 0.6, 6.2, 26); w.box("goldOrn", x1 + 0.3, H + 5.9, z, 0.9, 0.4, 26.4); w.box("goldOrn", x1 + 0.62, H - 0.2, z, 0.1, 0.25, 26);
    w.geo("goldOrn", new T.OctahedronGeometry(1.1, 0).scale(1, 1.3, 1), x1 + 0.3, H + 7.6, z);
    w.eyes(x1 + 0.64, z, H + 3.7, Math.PI / 2, 1.05, 3.4, "irisA");
    w.sign("PARADE STUDIO", { bg: "#1a0a3a", color: "#fff", glow: "#ff9ad8", border: "#ffd86a", px: 1024 }, 13, 1.6, x1 + 0.66, H + 1.2, z, Math.PI / 2);
    /* 正面の塔（左右）：赤と金・てっぺんに星 */
    [-1, 1].forEach((s) => { const tz = z + s * 14.4, tx = x1 + 0.8; w.box("pRed", tx, 0, tz, 2.6, H + 7, 2.6, { collide: true }); [3, 8.4, H + 1, H + 6.6].forEach((y) => w.box("goldOrn", tx, y, tz, 2.9, 0.35, 2.9));
      w.geo("pRed", new T.ConeGeometry(1.9, 3.2, 4).rotateY(Math.PI / 4), tx, H + 8.6, tz); w.geo("goldOrn", new T.OctahedronGeometry(0.55, 0).scale(1, 1.4, 1), tx, H + 10.8, tz);
      w.box("neonPink", tx + 1.32, 1.2, tz, 0.08, H + 5, 0.3); });
    /* 扉のネオンのアーチと電球・「ここから出発」 */
    w.geo("neonPink", new T.TorusGeometry(dw / 2 + 0.3, 0.26, 8, 44, Math.PI).scale(1, 0.55, 1).rotateY(Math.PI / 2), x1 + 0.34, 9.3, z);
    w.geo("neonCyan", new T.TorusGeometry(dw / 2 + 0.95, 0.14, 6, 44, Math.PI).scale(1, 0.55, 1).rotateY(Math.PI / 2), x1 + 0.3, 9.3, z);
    [-1, 1].forEach((s) => w.box("neonCyan", x1 + 0.02, 0, z + s * (dw / 2 + 0.1), 0.1, 9.4, 0.2));
    for (let i = 0; i <= 14; i++) { const a = i / 14 * Math.PI; w.geo("lampY", new T.SphereGeometry(0.2, 8, 6), x1 + 0.5, 9.3 + Math.sin(a) * (dw / 2 + 0.3) * 0.55, z + Math.cos(a) * (dw / 2 + 0.3)); }
    w.sign("パレードはここから出発！", { bg: "#ff4fb0", color: "#fff", border: "#ffd86a", px: 1024 }, 9.5, 1.1, x1 + 0.1, 11.2, z, Math.PI / 2);
    /* 目の高さの案内板（道の横） */
    { const bx = x1 + 5, bz = z + 11.5; w.box("woodDark2", bx, 0, bz, 0.25, 1.4, 0.25); w.box("woodDark2", bx, 0, bz + 3.6, 0.25, 1.4, 0.25);
      w.sign("🎉 PARADE STUDIO　パレードの出発口", { bg: "#1a0a3a", color: "#fff", border: "#ffd86a", px: 1024, both: true }, 4.2, 0.62, bx, 2.0, bz + 1.8, Math.PI / 2);
      w.sign("昼のパレードはこの扉から出て、大通りをまわり、噴水公園へ", { bg: "#fff6fb", color: "#8a1a5a", px: 1024, both: true }, 4.2, 0.44, bx, 1.45, bz + 1.8, Math.PI / 2); w.colSeg(bx, bz, bx, bz + 3.6, 0.2); }
    w.caster(x, z, W2, D, H + 4);
    w.route([[x1 + 1, z + 2], [-118, 350]], 12, "walkY", { lamps: false, trees: false, benches: false, bushes: false });
  }
  P.buildParade = function () {
    const w = this, curve = paradeRoute(), L = curve.getLength(), floats = [];
    paradeStudio(w);
    const mk = (fn) => w.captureGroup(fn);
    const base = (key, c1, len) => { w.geo(key, new T.BoxGeometry(5.6, 1.1, len || 9).translate(0, 0.75, 0)); w.geo("pWhite", new T.BoxGeometry(5.8, 0.2, (len || 9) + 0.2).translate(0, 1.35, 0)); w.geo(c1 || "neonCyan", new T.BoxGeometry(5.9, 0.12, (len || 9) + 0.3).translate(0, 0.35, 0)); [-1, 1].forEach((s) => w.geo("pBlack", new T.CylinderGeometry(0.4, 0.4, 0.3, 12).rotateZ(Math.PI / 2).translate(s * 2.6, 0.4, 2.8))); };
    /* 1 クリスタル（XEVARION のしるし）・2 桜の塔・3 おかし・4 音楽のステージ・5 宇宙・6 もふもふの生きもの（オリジナル） */
    floats.push(mk(() => { base("pNavy", "neonCyan"); w.geo("glassDome", new T.OctahedronGeometry(2.4, 0).scale(1, 1.5, 1).translate(0, 5.2, 0)); w.geo("neonCyan", new T.TorusGeometry(3.4, 0.12, 6, 40).rotateX(Math.PI / 2).translate(0, 5.2, 0)); w.geo("neonPurple", new T.TorusGeometry(2.8, 0.1, 6, 40).rotateX(1.1).translate(0, 5.2, 0)); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; w.geo("goldOrn", new T.OctahedronGeometry(0.35, 0).translate(Math.cos(a) * 2.2, 2.2, Math.sin(a) * 3.4)); } w.sign("XEVARION", { bg: "#0a1a4a", color: "#fff", glow: "#7fd8ff", px: 512, both: true }, 4.8, 0.8, 0, 1.2, 4.62, 0); }));
    floats.push(mk(() => { base("woodRed", "neonPink"); w.pagodaTower(0, 0, 3.0, 3, { roofKey: "kwG" }); for (let i = 0; i < 4; i++) w.lantern(i < 2 ? -2.3 : 2.3, 1.6, i % 2 ? -3.4 : 3.4, 0.7, "lanR"); for (let i = 0; i < 9; i++) w.geo("propPink", new T.IcosahedronGeometry(0.75, 1).translate(Math.cos(i) * 1.8, 3.2 + (i % 3) * 0.5, -2.8 + (i % 4) * 0.4)); }));
    floats.push(mk(() => { base("propPink", "neonYellow"); w.giantProp("cake", 0, 1.4, -1.6, 1.3, 0); w.giantProp("icecream", -1.8, 1.4, 2.2, 0.7, 0); w.giantProp("donut", 1.7, 1.4, 2.4, 0.55, 0.5); }));
    floats.push(mk(() => { base("pBlack", "neonPurple"); w.geo("stageTop", new T.BoxGeometry(5, 0.3, 6).translate(0, 1.6, 0)); [-1, 1].forEach((s) => { w.geo("pBlack", new T.BoxGeometry(1.4, 2.8, 1.2).translate(s * 2.1, 3.0, -2.6)); w.geo("neonCyan", new T.CylinderGeometry(0.45, 0.45, 0.05, 16).rotateX(Math.PI / 2).translate(s * 2.1, 3.4, -1.98)); w.geo("neonPink", new T.CylinderGeometry(0.3, 0.3, 0.05, 16).rotateX(Math.PI / 2).translate(s * 2.1, 2.3, -1.98)); }); w.geo("goldOrn", new T.CylinderGeometry(0.9, 0.9, 1.2, 16).translate(0, 2.3, -3.2)); w.neonIcon("note", 0, 4.6, -3.4, 0.9, 0, "neonYellow"); }));
    floats.push(mk(() => { base("pNavy", "neonBlue"); w.geo("rocketW", new T.CylinderGeometry(0.7, 0.7, 5, 16).translate(0, 4.0, -1.5)); w.geo("rocketR", new T.ConeGeometry(0.7, 1.6, 16).translate(0, 7.3, -1.5)); w.geo("propYellow", new T.SphereGeometry(1.0, 16, 12).translate(-1.6, 3.2, 2.2)); w.geo("irisA", new T.SphereGeometry(0.7, 16, 12).translate(1.7, 2.6, 2.6)); w.geo("goldOrn", new T.TorusGeometry(1.25, 0.08, 5, 32).rotateX(1.2).translate(-1.6, 3.2, 2.2)); }));
    floats.push(mk(() => { base("propMint", "neonGreen"); w.geo("propWhite", new T.SphereGeometry(2.2, 20, 14).scale(1, 0.85, 1).translate(0, 3.4, 0)); [-1, 1].forEach((s) => w.geo("propWhite", new T.ConeGeometry(0.6, 1.4, 10).rotateZ(-s * 0.4).translate(s * 1.3, 5.4, 0))); w.eyes(0, 1.9, 3.8, 0, 0.55, 1.4, "irisD", 0); w.geo("propPink", new T.SphereGeometry(0.25, 10, 8).translate(0, 3.0, 2.05)); }));
    /* 7 提供 NGX（最後の車）★★ 2026-09-30 ご指定「パレードやショーの提供は最後の車や船などに追加して記載」 */
    { const lg = "ngxLogo"; if (!w.m[lg]) w.m[lg] = new T.MeshBasicMaterial({ map: X.imgTex("img/ngx_logo.webp"), transparent: true, toneMapped: false, side: T.DoubleSide, depthWrite: false });
      floats.push(mk(() => { base("pNavy", "neonYellow", 10); w.geo("white2", new T.BoxGeometry(0.5, 4.6, 8.4).translate(0, 3.8, 0)); w.geo("goldOrn", new T.BoxGeometry(0.6, 0.24, 8.8).translate(0, 6.2, 0)); w.geo("goldOrn", new T.BoxGeometry(0.6, 0.24, 8.8).translate(0, 1.5, 0));
        w.geo(lg, new T.PlaneGeometry(7.6, 2.8).rotateY(Math.PI / 2).translate(0.28, 3.9, 0)); w.geo(lg, new T.PlaneGeometry(7.6, 2.8).rotateY(-Math.PI / 2).translate(-0.28, 3.9, 0));
        w.sign("提供　NGX", { bg: "#0a1450", color: "#fff", glow: "#ffd86a", border: "#ffd86a", px: 512 }, 4.6, 0.85, 0.3, 6.9, 0, Math.PI / 2); w.sign("提供　NGX", { bg: "#0a1450", color: "#fff", glow: "#ffd86a", border: "#ffd86a", px: 512 }, 4.6, 0.85, -0.3, 6.9, 0, -Math.PI / 2);
        w.sign("SPONSORED BY NGX", { bg: "#0a1450", color: "#ffd86a", px: 512, both: true }, 4.8, 0.7, 0, 1.2, 5.12, 0); })); }
    floats.forEach((g) => { g.traverse((o) => { o.layers.set(3); }); g.visible = false; w.scene.add(g); });
    /* 踊る人（小さな人の群れ・インスタンス） */
    const N = 48, dg = XWorld.mergeGeos([new T.BoxGeometry(0.4, 0.85, 0.26).translate(0, 0.43, 0), new T.BoxGeometry(0.46, 0.64, 0.3).translate(0, 1.18, 0), new T.SphereGeometry(0.16, 8, 6).translate(0, 1.68, 0), new T.BoxGeometry(1.3, 0.1, 0.1).translate(0, 1.42, 0)]);
    const DU = { uBeat: { value: 0 } }, dm = new T.MeshLambertMaterial({ color: 0xffffff });
    dm.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, DU); sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uBeat;").replace("#include <begin_vertex>", "#include <begin_vertex>\n{ float b = uBeat * 6.2832; transformed.y += abs(sin(b * 0.5)) * 0.25; if (position.y > 1.36 && position.y < 1.48) transformed.y += sin(b) * abs(position.x) * 0.9; transformed.x += sin(b * 0.5) * 0.06 * position.y; }"); };
    const dancers = new T.InstancedMesh(dg, dm, N), dc = new T.Color(), dcols = [0xff4fb0, 0x4ff0ff, 0xffd84a, 0xffffff, 0xa86aff, 0x4fff9a];
    for (let i = 0; i < N; i++) { dc.setHex(dcols[i % dcols.length]); dancers.setColorAt(i, dc); }
    dancers.frustumCulled = false; dancers.visible = false; dancers.layers.set(3); w.scene.add(dancers);
    /* 紙吹雪（フロートから） */
    const CN = 1400, cp = new Float32Array(CN * 3), cv = new Float32Array(CN * 3), cl = new Float32Array(CN), ccol = new Float32Array(CN * 3), cg = new T.BufferGeometry();
    for (let i = 0; i < CN; i++) { cp[i * 3 + 1] = -99; const c = new T.Color(dcols[i % dcols.length]); ccol[i * 3] = c.r; ccol[i * 3 + 1] = c.g; ccol[i * 3 + 2] = c.b; }
    cg.setAttribute("position", new T.BufferAttribute(cp, 3)); cg.setAttribute("color", new T.BufferAttribute(ccol, 3));
    const conf = new T.Points(cg, new T.PointsMaterial({ size: 0.22, vertexColors: true, transparent: true, depthWrite: false })); conf.frustumCulled = false; conf.visible = false; conf.layers.set(3); w.scene.add(conf);
    w.parade = { curve, L, floats, dancers, DU, conf, cp, cv, cl, ci: 0, names: ["XEVARION CRYSTAL", "SAKURA PAGODA", "SWEETS PARTY", "MUSIC STAGE", "SPACE TRIP", "FUWA-FUWA FRIENDS", "SPONSORED BY NGX"] };
    /* パレードを始める看板（マーケットの広場・噴水の南） */
    [[-24, 608], [0, 402], [STUDIO.x + STUDIO.w / 2 + 6, STUDIO.z - 12]].forEach(([x, z]) => { w.sign("DAYTIME PARADE  昼のパレード", { bg: "#ff4fb0", color: "#fff", border: "#ffd84a", px: 1024, both: true }, 5.4, 0.9, x, 3.2, z, 0); w.detail(() => w.geo("woodDark2", new T.BoxGeometry(0.16, 2.8, 0.16), x, 1.4, z)); w.interact(x, z + 1.5, 3.2, "昼のパレードを始める", () => ({ parade: true }), "🎉"); });
  };
  const PARADE = {
    on: false, t: 0, v: 3.4, gap: 24, next: 75, lead: 0, lastT: 0, st: {},
    start(ctx) { const W = ctx.world.parade; if (!W || this.on) return false; this.on = true; this.t = 0; this.lastT = 0; W.floats.forEach((g) => { g.visible = true; }); W.dancers.visible = true; W.conf.visible = true; AU.restart("parade"); return true; },
    stop(ctx) { const W = ctx.world.parade; this.on = false; if (!W) return; W.floats.forEach((g) => { g.visible = false; }); W.dancers.visible = false; W.conf.visible = false; this.next = 600; },
    update(dt, t, ctx) {
      const W = ctx.world.parade; if (!W) return 0;
      if (!this.on) { if (ctx.day) { this.next -= dt; if (this.next < 20 && !this.warned && ctx.near(0, 480, 700)) { this.warned = true; ctx.notice("🎉 まもなく「デイタイムパレード」！ パレードスタジオ（噴水公園の西）から出発 → 大通り → 中央噴水公園", "parade"); } if (this.next <= 0) { this.warned = false; this.start(ctx); } } return 0; }
      if (!ctx.day) { this.stop(ctx); return 0; }
      this.t += dt;
      const at = AU.playing("parade") ? AU.time("parade") : this.t % TR.parade.dur;
      const s = TR.parade.at(at, this.st);
      const ev = TR.parade.events(this.lastT, at); this.lastT = at;
      const head = this.t * this.v, n = W.floats.length, p = new T.Vector3(), q = new T.Vector3();
      let near = 1e9;
      W.floats.forEach((g, i) => {
        const d = head - i * this.gap; g.visible = d > 0 && d < W.L; if (!g.visible) return;
        const u = d / W.L; W.curve.getPointAt(u, p); W.curve.getPointAt(Math.min(1, u + 0.002), q);
        g.position.set(p.x, Math.abs(Math.sin((s.beat + s.beatPh) * Math.PI)) * 0.08, p.z); g.rotation.y = Math.atan2(q.x - p.x, q.z - p.z);
        const pl = ctx.player, dd = Math.hypot(pl.x - p.x, pl.z - p.z); if (dd < near) near = dd;
        if (ev.length || (s.inBar === 0 && s.pulse > 0.95 && s.level >= 2)) for (let k = 0; k < 40; k++) { const j = W.ci = (W.ci + 1) % W.cl.length; W.cp[j * 3] = p.x + (Math.random() - 0.5) * 3; W.cp[j * 3 + 1] = 6; W.cp[j * 3 + 2] = p.z + (Math.random() - 0.5) * 3; W.cv[j * 3] = (Math.random() - 0.5) * 5; W.cv[j * 3 + 1] = 3 + Math.random() * 4; W.cv[j * 3 + 2] = (Math.random() - 0.5) * 5; W.cl[j] = 4 + Math.random() * 2; }
      });
      /* 踊る人：フロートのあいだに2列 */
      const m4 = new T.Matrix4(), qq = new T.Quaternion(), e = new T.Euler(), one = new T.Vector3(1, 1, 1);
      for (let i = 0; i < W.dancers.count; i++) { const k = Math.floor(i / 8), j = i % 8, d = head - k * this.gap - this.gap * 0.5 - (j >> 1) * 2.2; if (d <= 0 || d >= W.L) { m4.makeTranslation(0, -99, 0); W.dancers.setMatrixAt(i, m4); continue; } const u = d / W.L; W.curve.getPointAt(u, p); W.curve.getPointAt(Math.min(1, u + 0.002), q); const a = Math.atan2(q.x - p.x, q.z - p.z), side = j % 2 ? 1 : -1; e.set(0, a + Math.sin((s.beat + s.beatPh) * Math.PI) * 0.5, 0); qq.setFromEuler(e); m4.compose(p.set(p.x + Math.cos(a) * side * 1.6, 0, p.z - Math.sin(a) * side * 1.6), qq, one); W.dancers.setMatrixAt(i, m4); }
      W.dancers.instanceMatrix.needsUpdate = true; W.DU.uBeat.value = s.beat + s.beatPh;
      for (let j = 0; j < W.cl.length; j++) { if (W.cl[j] <= 0) continue; W.cl[j] -= dt; W.cv[j * 3 + 1] -= 3.2 * dt; const f = Math.exp(-1.8 * dt); W.cv[j * 3] *= f; W.cv[j * 3 + 2] *= f; W.cp[j * 3] += W.cv[j * 3] * dt; W.cp[j * 3 + 1] = Math.max(0.03, W.cp[j * 3 + 1] + W.cv[j * 3 + 1] * dt); W.cp[j * 3 + 2] += W.cv[j * 3 + 2] * dt; if (W.cl[j] <= 0) W.cp[j * 3 + 1] = -99; }
      W.conf.geometry.attributes.position.needsUpdate = true;
      if (head - (n - 1) * this.gap > W.L + 10) this.stop(ctx);
      this.near = near;
      return Math.max(0, Math.min(1, 1 - (near - 50) / 220));
    }
  };

  /* ══════════════ XEVARION NIGHT（夜の噴水ショー） ══════════════ */
  P.buildNightShow = function () {
    const w = this, cx = 0, cz = 290;
    /* 霧の幕（映像を映す）：噴水の北がわ・南を向く */
    const scr = new X.Screen(1024, 512);
    const curtain = new T.Mesh(new T.CylinderGeometry(34, 34, 22, 48, 1, true, Math.PI * 0.72, Math.PI * 0.56).translate(0, 11, 0), new T.MeshBasicMaterial({ map: scr.tex, transparent: true, opacity: 0.85, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false, fog: false }));
    curtain.position.set(cx, 0.6, cz); curtain.rotation.y = Math.PI; curtain.visible = false; curtain.layers.set(3); w.scene.add(curtain);
    /* 水柱（24本・高さは曲で） */
    const NJ = 32, per = MOBILE ? 60 : 110, N = NJ * per, jg = new T.BufferGeometry(), seed = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { seed[i * 3] = Math.floor(i / per); seed[i * 3 + 1] = Math.random(); seed[i * 3 + 2] = Math.random(); }
    jg.setAttribute("position", new T.BufferAttribute(new Float32Array(N * 3), 3)); jg.setAttribute("aSeed", new T.BufferAttribute(seed, 3));
    const JU = { uT: XP.TIME, uH: { value: new Float32Array(NJ) }, uHue: { value: 0 }, uScale: { value: 400 }, uAmp: { value: 0 } };
    const dot = X.cv(64, 64), dg = dot.getContext("2d"), gr = dg.createRadialGradient(32, 32, 0, 32, 32, 30); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.5, "rgba(230,248,255,.7)"); gr.addColorStop(1, "rgba(200,240,255,0)"); dg.fillStyle = gr; dg.fillRect(0, 0, 64, 64);
    JU.uMap = { value: X.tex(dot) };
    const jm = new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: JU,
      vertexShader: [
        "attribute vec3 aSeed; uniform float uT, uH[" + NJ + "], uHue, uScale, uAmp; varying vec3 vC; varying float vA;",
        "vec3 hsl(float h){ vec3 k = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); return 0.3 + 0.7 * k; }",
        "void main(){ int j = int(aSeed.x); float hh = 0.0; for (int k = 0; k < " + NJ + "; k++) if (k == j) hh = uH[k];",
        "  float ring = aSeed.x < 16.0 ? 21.0 : 12.5, a = (mod(aSeed.x, 16.0) / 16.0) * 6.2832 + (aSeed.x < 16.0 ? 0.0 : 0.2);",
        "  float t = fract(aSeed.y + uT * 0.55), lean = sin(uT * 0.7 + aSeed.x) * 0.25;",
        "  vec3 p = vec3(cos(a) * ring, 0.7, sin(a) * ring); vec3 dir = normalize(vec3(-cos(a) * lean, 1.0, -sin(a) * lean));",
        "  float h = hh * uAmp; p += dir * (t * h) + vec3(0.0, -t * t * h * 0.35, 0.0); p.xz += (aSeed.z - 0.5) * 0.5;",
        "  vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = step(0.2, h) * 0.9 * uScale / max(1.0, -mv.z);",
        "  vC = hsl(fract(uHue + aSeed.x / 32.0)) * 2.2; vA = (1.0 - t) * step(0.2, h); }"].join("\n"),
      fragmentShader: "uniform sampler2D uMap; varying vec3 vC; varying float vA; void main(){ vec4 c = texture2D(uMap, gl_PointCoord); if (c.a * vA < 0.02) discard; gl_FragColor = vec4(vC * c.rgb, c.a * vA * 0.8);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}" });
    const jets = new T.Points(jg, jm); jets.position.set(cx, 0, cz); jets.frustumCulled = false; jets.visible = false; jets.layers.set(3); w.scene.add(jets);
    /* レーザー（噴水のまわり8本）・サーチライト（4本） */
    const bm = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false });
    const lasers = []; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, piv = new T.Group(); piv.position.set(cx + Math.cos(a) * 27.5, 1.2, cz + Math.sin(a) * 27.5); const ln = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 160, 5, 1, true).translate(0, 80, 0), bm.clone()); piv.add(ln); piv.visible = false; piv.layers.set(3); ln.layers.set(3); w.scene.add(piv); lasers.push({ piv, ln, a, i }); }
    const sm = new T.MeshBasicMaterial({ color: 0xbfd8ff, transparent: true, opacity: 0.12, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false, fog: false });
    const searches = []; [0, 1, 2, 3].forEach((i) => { const a = i / 4 * TAU + Math.PI / 4, piv = new T.Group(); piv.position.set(cx + Math.cos(a) * 80, 0.5, cz + Math.sin(a) * 80); const cone = new T.Mesh(new T.CylinderGeometry(0.4, 9, 220, 20, 1, true).translate(0, 110, 0), sm.clone()); piv.add(cone); piv.visible = false; piv.layers.set(3); cone.layers.set(3); w.scene.add(piv); searches.push({ piv, cone, i }); });
    /* 花火（曲の強い音で打ち上げ） */
    const FN = MOBILE ? 1500 : 3200, fp = new Float32Array(FN * 3), fc = new Float32Array(FN * 3), fg = new T.BufferGeometry(), P2 = [];
    for (let i = 0; i < FN; i++) { fp[i * 3 + 1] = -999; P2.push({ x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0, life: 0, c: [1, 1, 1] }); }
    fg.setAttribute("position", new T.BufferAttribute(fp, 3)); fg.setAttribute("color", new T.BufferAttribute(fc, 3));
    const fdot = X.cv(64, 64), fdg = fdot.getContext("2d"), fgr = fdg.createRadialGradient(32, 32, 0, 32, 32, 30); fgr.addColorStop(0, "rgba(255,255,255,1)"); fgr.addColorStop(1, "rgba(255,255,255,0)"); fdg.fillStyle = fgr; fdg.fillRect(0, 0, 64, 64);
    const fw = new T.Points(fg, new T.PointsMaterial({ size: 2.6, map: X.tex(fdot), vertexColors: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false, toneMapped: false }));
    fw.frustumCulled = false; fw.visible = false; fw.layers.set(3); w.scene.add(fw);
    w.nightShow2 = { cx, cz, curtain, scr, jets, JU, NJ, lasers, searches, fw, fp, fc, P2, fk: 0 };
    w.interact(cx, cz + 34, 4, "XEVARION NIGHT（夜の噴水ショー）を始める", () => ({ nightShow: true }), "✨");
  };
  const NIGHT = {
    on: false, t: 0, lastT: 0, cool: 20, st: {}, hue: 0,
    start(ctx) { const S = ctx.world.nightShow2; if (!S || this.on) return false; this.on = true; this.t = 0; this.lastT = 0; [S.curtain, S.jets, S.fw].forEach((o) => { o.visible = true; }); S.lasers.forEach((l) => { l.piv.visible = true; }); S.searches.forEach((l) => { l.piv.visible = true; }); AU.restart("night"); return true; },
    stop(ctx) { const S = ctx.world.nightShow2; this.on = false; this.cool = 90; if (!S) return; [S.curtain, S.jets].forEach((o) => { o.visible = false; }); S.lasers.forEach((l) => { l.piv.visible = false; }); S.searches.forEach((l) => { l.piv.visible = false; }); },
    burst(S, x, y, z, big) {
      const cols = [[1, 0.35, 0.7], [0.4, 0.9, 1], [1, 0.9, 0.3], [0.6, 1, 0.5], [0.8, 0.5, 1], [1, 0.55, 0.25], [1, 1, 1]], c = cols[Math.floor(Math.random() * cols.length)], n = big ? 260 : 150, v0 = big ? 30 : 22;
      for (let i = 0; i < n; i++) { const p = S.P2[S.fk % S.P2.length]; S.fk++; const a = Math.random() * TAU, b = Math.acos(Math.random() * 2 - 1), v = v0 * (0.85 + Math.random() * 0.3); p.x = x; p.y = y; p.z = z; p.vx = Math.sin(b) * Math.cos(a) * v; p.vy = Math.cos(b) * v; p.vz = Math.sin(b) * Math.sin(a) * v; p.life = 2.0 + Math.random() * 0.8; p.c = c; }
    },
    update(dt, t, ctx) {
      const S = ctx.world.nightShow2; if (!S) return 0;
      const pl = ctx.player, dist = Math.hypot(pl.x - S.cx, pl.z - S.cz);
      if (!this.on) { if (ctx.night && !ctx.inNightZone) { this.cool -= dt; if (this.cool <= 0 && dist < 520) this.start(ctx); } }
      else if (!ctx.night || ctx.inNightZone && dist > 400) this.stop(ctx);
      /* 花火は止めたあとも落ちきるまで動かす */
      let alive = false;
      for (let i = 0; i < S.P2.length; i++) { const p = S.P2[i]; if (p.life <= 0) { S.fp[i * 3 + 1] = -999; continue; } alive = true; p.life -= dt; p.vy -= 7 * dt; const d = Math.exp(-1.5 * dt); p.vx *= d; p.vy *= d; p.vz *= d; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; S.fp[i * 3] = p.x; S.fp[i * 3 + 1] = p.y; S.fp[i * 3 + 2] = p.z; const f = Math.min(1, p.life) * 2.6; S.fc[i * 3] = p.c[0] * f; S.fc[i * 3 + 1] = p.c[1] * f; S.fc[i * 3 + 2] = p.c[2] * f; }
      S.fw.geometry.attributes.position.needsUpdate = true; S.fw.geometry.attributes.color.needsUpdate = true; S.fw.visible = alive || this.on;
      if (!this.on) return 0;
      this.t += dt;
      const at = AU.playing("night") ? AU.time("night") : this.t % TR.night.dur, s = TR.night.at(at, this.st), ev = TR.night.events(this.lastT, at);
      if (at < this.lastT - 1 && this.t > 30) { this.lastT = at; this.stop(ctx); return 0; }        /* 1曲で終わり */
      this.lastT = at;
      const lv = s.level, pulse = s.pulse, bass = s.bass;
      this.hue = (this.hue + dt * (0.02 + lv * 0.015)) % 1;
      /* 水柱：パターンは小節ごと。低音で高く */
      const pat = ((s.bar >> 1) + lv) % 4, H = S.JU.uH.value;
      for (let k = 0; k < S.NJ; k++) { const ring = k < 16 ? 0 : 1, idx = k % 16; let h;
        if (pat === 0) h = 6 + bass * 18 * (ring ? 0.7 : 1);
        else if (pat === 1) h = (idx % 2 === s.beat % 2 ? 20 : 4) * (0.5 + bass * 0.7);
        else if (pat === 2) h = 4 + 18 * Math.max(0, Math.sin((idx / 16) * TAU - (s.beat + s.beatPh) * 1.6));
        else h = 5 + 16 * (0.5 + 0.5 * Math.sin(idx * 0.8 + t * 2)) * bass;
        H[k] = h * (0.6 + 0.2 * lv) + pulse * 3; }
      S.JU.uAmp.value = Math.min(1, S.JU.uAmp.value + dt * 0.5); S.JU.uHue.value = this.hue; S.JU.uScale.value = (ctx.renderer ? ctx.renderer.domElement.height : 900) * 0.5;
      S.lasers.forEach((l) => { const on = lv >= 1; l.piv.visible = on; if (!on) return; const sw = Math.sin(t * (0.6 + lv * 0.2) + l.i * 0.8); l.piv.rotation.set(Math.cos(l.a) * sw * 0.7, 0, -Math.sin(l.a) * sw * 0.7 + (s.inBar % 2 ? 0.1 : -0.1)); l.ln.material.color.setHSL((this.hue + l.i / 8) % 1, 1, 0.55).multiplyScalar(1.4 + pulse * 2.2); l.ln.material.opacity = 0.35 + 0.4 * pulse; });
      S.searches.forEach((l) => { l.piv.rotation.set(Math.sin(t * 0.3 + l.i) * 0.45, 0, Math.cos(t * 0.25 + l.i * 1.7) * 0.45); l.cone.material.opacity = 0.06 + 0.07 * (lv / 3) + 0.05 * pulse; });
      /* 花火：強い音・盛り上がりの入り・大きい小節の頭 */
      ev.forEach((k) => { const big = k === "rise" || lv >= 3; for (let q = 0; q < (big ? 3 : 1); q++) this.burst(S, S.cx + (Math.random() - 0.5) * 140, 85 + Math.random() * 60, S.cz - 120 + (Math.random() - 0.5) * 120, big); });
      if (lv >= 2 && s.inBar === 0 && s.pulse > 0.97 && Math.random() < 0.4) this.burst(S, S.cx + (Math.random() - 0.5) * 120, 90 + Math.random() * 40, S.cz - 100 + (Math.random() - 0.5) * 80, false);
      /* 霧の幕の映像 */
      if ((this._ct = (this._ct || 0) + dt) > 0.05) { this._ct = 0; const g = S.scr.g, W2 = S.scr.w, H2 = S.scr.h; g.clearRect(0, 0, W2, H2);
        const hue = this.hue * 360; for (let i = 0; i < 14; i++) { const M7 = W2 * 0.7, r = ((((i * 70 + ((s.beat || 0) + (s.beatPh || 0)) * 30) % M7) + M7) % M7); g.strokeStyle = "hsla(" + ((hue + i * 25) % 360) + ",100%,60%," + (0.6 * (1 - r / (W2 * 0.7))) + ")"; g.lineWidth = 10; g.beginPath(); g.arc(W2 / 2, H2 * 0.55, r, 0, TAU); g.stroke(); }
        const em = S.scr.img("img/park_emblem.webp"); if (em) { const k2 = 0.5 + pulse * 0.06; g.globalAlpha = 0.9; g.drawImage(em, W2 / 2 - em.width * k2 * 0.25, H2 * 0.18, em.width * k2 * 0.5, em.height * k2 * 0.5); g.globalAlpha = 1; }
        g.fillStyle = "#fff"; g.textAlign = "center"; g.font = "900 64px 'M PLUS Rounded 1c',sans-serif"; g.shadowColor = "hsl(" + hue + ",100%,60%)"; g.shadowBlur = 24; g.shadowBlur = 0; g.textAlign = "left";
        S.scr.flush(); }
      /* ホールのドームの光 */
      const dome = ctx.world.m.hallDome; if (dome) { dome.emissive.setHSL((this.hue + 0.5) % 1, 0.9, 0.35); dome.emissiveIntensity = 0.8 + pulse * 1.2; }
      return Math.max(0, Math.min(1, 1 - (dist - 160) / 320));
    }
  };

  /* ══════════════ まとめ（main.js から） ══════════════ */
  const SHOWS = {
    AU, TR, Arena, PARADE, NIGHT, NAMES,
    init(o) { this.o = o; AU.init(); },
    /* ctx = { world, player, theater, zone, day, night, inNightZone, sky, riding, renderer, near(x,z,r), notice(text,kind) } */
    update(dt, t, ctx) {
      ctx.near = ctx.near || ((x, z, r) => Math.hypot(ctx.player.x - x, ctx.player.z - z) < r);
      ctx.notice = ctx.notice || (() => {});
      const pg = PARADE.update(dt, t, ctx), ng = NIGHT.update(dt, t, ctx), hb = window.XHarbor ? XHarbor.update(dt, t, ctx) : 0;
      Arena.update(dt, t, ctx);
      const md = Arena.md, indoor = ctx.zone && ctx.zone.light && ctx.zone.light !== "outdoor" && ctx.zone.light !== "arena" && ctx.zone.light !== "live";
      let main = indoor ? 0.2 : 0.5;
      if (md === "video") main = 0; else if (md === "demo") main = 0.95;
      main *= (1 - Math.max(pg, ng, hb));
      { const p = ctx.player, dg = Math.hypot(p.x - 0, p.z - 905), gk = ctx.riding || ctx.sky ? 0 : Math.max(0, Math.min(1, (235 - dg) / 85)); AU.gateK += (gk - AU.gateK) * Math.min(1, dt * 0.9); }
      const pk = AU.parkKey(); AU.PARK.forEach((k) => { AU.target[k] = k === pk ? main * (1 - AU.gateK) : 0; }); AU.target.gate = main * AU.gateK; AU.target.parade = PARADE.on ? pg * 0.95 : 0; AU.target.night = NIGHT.on ? ng * 0.95 : 0; AU.target.chase = window.XHarbor && XHarbor.on ? hb * 0.95 : 0;
      if (AU.override) { for (const k in AU.target) AU.target[k] = k === AU.override.key ? AU.override.vol : 0; }
      /* ★★ 2026-09-30b 動画（ライブ映像・シアター）を画面に出している間は、パークの音（BGM・ゲート・パレード・ショー）をぜんぶ止める
         （前は「再生中」の知らせが来ないとアリーナの中の曲 0.95 が鳴り、シアターでは BGM がそのまま鳴っていた） */
      if (ctx.theater && ctx.theater.shown) { for (const k in AU.target) AU.target[k] = 0; }
      /* ★ 2026-09-29d ショーが終わったら「提供 NGX」（見ていた人に） */
      { const on = { parade: PARADE.on, night: NIGHT.on, harbor: !!(window.XHarbor && XHarbor.on) }, k2 = { parade: pg, night: ng, harbor: hb }, P0 = this._on || {};
        for (const k in on) { if (on[k]) this._seen = Object.assign(this._seen || {}, { [k]: Math.max((this._seen || {})[k] || 0, k2[k]) }); if (P0[k] && !on[k] && this._seen && this._seen[k] > 0.08 && ctx.sponsor) { ctx.sponsor(k); this._seen[k] = 0; } }
        this._on = on; }     /* ★ 建物の中のカラオケ・リズム（park_ui.js） */
      if (PARADE.on && !AU.el.parade.loop) AU.el.parade.loop = true;
      AU.update(dt);
    }
  };
  window.XShows = SHOWS;
})();
