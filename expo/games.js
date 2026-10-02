/* ══════════════════════════════════════════════════════════════════
   XEVARION WORLD CONFERENCE — スポーツパーク・サーキットのミニゲーム（CPU のキャラと対戦）
   ------------------------------------------------------------------
   ・サッカー：3対3（自分＋味方CPU 2 vs 相手CPU 3）。囲いのあるフィールド（ボールは板ではね返る）。3分 or 5点先取。
   ・ボッチャ：自分（赤）vs リコ（青）。ジャックボール→交互（遠いほうが投げる）→6球ずつ。狙いは左右、強さはためて離す。
   ・カートレース：自分＋CPU 5台で3周。コースから出ると遅くなる。
   ・main.js からは XGames.start(kind, ctx) で始め、毎フレーム game.update(dt, inp) を呼ぶ。
     ownsMove＝自分の移動をゲームが決める、ownsCam＝カメラもゲームが決める
   ══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const T = THREE, X = XTex;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const wrapA = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };

  /* ── 画面（HUD） ── */
  let hud = null;
  function ui() {
    if (hud) return hud;
    const d = document.createElement("div"); d.id = "gHud";
    d.innerHTML = '<div class="gTop"><b id="gTitle"></b><span id="gInfo"></span></div><div id="gSub"></div>' +
      '<div id="gMsg"></div><div id="gPow"><i></i></div><button id="gAct"></button><button id="gExit">✕ やめる</button>';
    document.body.appendChild(d);
    hud = { root: d, title: d.querySelector("#gTitle"), info: d.querySelector("#gInfo"), sub: d.querySelector("#gSub"), msg: d.querySelector("#gMsg"), pow: d.querySelector("#gPow"), powI: d.querySelector("#gPow i"), act: d.querySelector("#gAct"), exit: d.querySelector("#gExit") };
    return hud;
  }
  function msg(html, ms) { const h = ui(); h.msg.innerHTML = html; h.msg.classList.add("on"); clearTimeout(h._mt); if (ms) h._mt = setTimeout(() => h.msg.classList.remove("on"), ms); }
  function confetti(n) {
    const box = document.createElement("div"); box.className = "gConf"; document.body.appendChild(box);
    const cols = ["#ff5f8f", "#ffd24a", "#5ab8ff", "#7cff9a", "#c08aff", "#ff8a3d"];
    for (let i = 0; i < (n || 80); i++) { const p = document.createElement("i"); p.style.left = Math.random() * 100 + "%"; p.style.background = cols[i % cols.length]; p.style.animationDelay = Math.random() * 0.8 + "s"; p.style.animationDuration = 1.8 + Math.random() * 1.4 + "s"; box.appendChild(p); }
    setTimeout(() => box.remove(), 4000);
  }

  /* 共通：ゲームの土台 */
  function Base(ctx, kind, title) {
    this.ctx = ctx; this.kind = kind; this.objs = []; this.cpus = []; this.done = false; this.t = 0;
    const h = ui(); h.root.className = "on " + kind; h.title.textContent = title; h.info.textContent = ""; h.sub.textContent = ""; h.msg.classList.remove("on"); h.pow.classList.remove("on");
    h.exit.onclick = () => ctx.exit();
    this.actDown = false;
    h.act.onpointerdown = (e) => { e.preventDefault(); this.actDown = true; this.actPress = true; };
    h.act.onpointerup = h.act.onpointercancel = h.act.onpointerleave = () => { if (this.actDown) this.actRelease = true; this.actDown = false; };
  }
  Base.prototype.add = function (o) { this.ctx.scene.add(o); this.objs.push(o); return o; };
  Base.prototype.cpu = function (spec) { const a = this.ctx.person(spec); this.add(a.root); return a; };   /* ★ VRoid のサンプルの色違い（people.js） */
  Base.prototype.dispose = function () {
    this.objs.forEach((o) => this.ctx.scene.remove(o));
    const h = ui(); h.root.className = ""; h.msg.classList.remove("on");
  };
  /* ボタン・キーの「押した瞬間」「離した瞬間」をまとめる */
  Base.prototype.input = function (inp) {
    const press = !!(inp.actPress || this.actPress), release = !!(inp.actRelease || this.actRelease), held = !!(inp.actHeld || this.actDown);
    this.actPress = this.actRelease = false;
    return { press, release, held };
  };
  function endPanel(game, title, lines, win) {
    msg('<b class="big">' + title + "</b>" + lines.map((l) => "<p>" + l + "</p>").join("") +
      '<div class="btns"><button data-a="again">もう一度</button><button data-a="exit">やめる</button></div>');
    const h = ui();
    h.msg.querySelectorAll("button").forEach((b) => b.onclick = () => { h.msg.classList.remove("on"); if (b.dataset.a === "again") game.ctx.restart(); else game.ctx.exit(); });
    if (win) confetti(90);
  }

  /* ══════════════ サッカー ══════════════ */
  const TEAM_B = { c: "#2a6ae8", s: "#ffffff", p: "#1a3a8a", names: ["ユウ", "ノア", "タクミ"] };
  const TEAM_R = { c: "#e03a3a", s: "#ffd24a", p: "#7a1a1a", names: ["ケン", "アキ", "ルイ", "マコ"] };
  function ballTex() {
    const c = X.cv(256, 128), g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, 256, 128);
    g.fillStyle = "#1a1a1a";
    for (let i = 0; i < 12; i++) { const x = (i % 6) * 44 + (i >= 6 ? 22 : 0) + 10, y = i >= 6 ? 88 : 36; g.beginPath(); for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 - Math.PI / 2; g.lineTo(x + Math.cos(a) * 11, y + Math.sin(a) * 11); } g.fill(); }
    return X.tex(c);
  }
  function Soccer(ctx) {
    Base.call(this, ctx, "soccer", "⚽ サッカー 3対3");
    const F = this.F = ctx.world.soccer, hx = F.FW / 2, hz = F.FH / 2;
    this.hx = hx; this.hz = hz; this.goalW = F.goalW;
    this.score = [0, 0]; this.clock = 180; this.state = "ready"; this.stateT = 2.2;
    /* ボール */
    this.ball = { x: F.cx, z: F.cz, y: 0.22, vx: 0, vz: 0, vy: 0, r: 0.22, last: null };
    this.ballM = this.add(new T.Mesh(new T.SphereGeometry(0.22, 20, 14), new T.MeshToonMaterial({ map: ballTex(), gradientMap: X.toonGradient() })));
    this.ballM.castShadow = true;
    /* 選手：[0]＝自分（青）。青の CPU 2・赤の CPU 3 */
    this.mates = [
      { me: true, team: 0, role: "att" },
      { team: 0, role: "def", av: this.cpu(XPeople.athlete(TEAM_B, 0)) }, { team: 0, role: "gk", av: this.cpu(XPeople.athlete(TEAM_B, 1)) },
      { team: 1, role: "att", av: this.cpu(XPeople.athlete(TEAM_R, 0)) }, { team: 1, role: "def", av: this.cpu(XPeople.athlete(TEAM_R, 1)) }, { team: 1, role: "gk", av: this.cpu(XPeople.athlete(TEAM_R, 2)) }
    ];
    this.mates.forEach((m) => { m.x = 0; m.z = 0; m.yaw = 0; m.vx = 0; m.vz = 0; m.cool = 0; m.act = null; m.actT = 0; m.spd = m.me ? 0 : m.role === "gk" ? 4.4 : m.team === 1 ? 3.7 + Math.random() * 0.3 : 4.3; });   /* 赤（相手）は少し遅め＝勝てる強さ */
    this.kickoff(0);
    ui().act.textContent = "⚽ キック";
    ctx.cam.yaw = -Math.PI / 2; ctx.cam.pitch = 0.62; ctx.cam.dist = 9.5;
    msg("<b class=\"big\">KICK OFF!</b><p>WASD／スティックで動く・近づいて " + (ctx.MOBILE ? "キック" : "E（スペース）") + " でける</p><p>→ 右のゴールをねらおう（3分・5点先取）</p>", 2600);
  }
  Soccer.prototype = Object.create(Base.prototype);
  Soccer.prototype.ownsMove = false;
  Soccer.prototype.kickoff = function (side) {
    const F = this.F, B = this.ball;
    B.x = F.cx; B.z = F.cz; B.y = 0.22; B.vx = B.vz = B.vy = 0;
    const P = { att: [-2.5, 0], def: [-10, 3], gk: [-this.hx + 1.2, 0] };
    this.mates.forEach((m, i) => {
      const s = m.team === 0 ? 1 : -1, p = P[m.role];
      m.x = F.cx + p[0] * s + (m.team === side && m.role === "att" ? s * 1.6 : 0); m.z = F.cz + p[1] * (i % 2 ? 1 : -1);
      m.yaw = s > 0 ? Math.PI / 2 : -Math.PI / 2; m.vx = m.vz = 0;
      if (m.me) { const pl = this.ctx.player; pl.x = m.x; pl.z = m.z; pl.yaw = m.yaw; }
    });
    this.state = "ready"; this.stateT = 1.6;
  };
  Soccer.prototype.kick = function (m, dirx, dirz, power, lift) {
    const B = this.ball, l = Math.hypot(dirx, dirz) || 1;
    B.vx = dirx / l * power; B.vz = dirz / l * power; B.vy = lift || 0; B.last = m.team;
    m.cool = 0.45; m.act = "kick"; m.actT = 0;
    if (m.me) this.ctx.player.av.play && this.ctx.player.av.play("kick", 0.4);
  };
  Soccer.prototype.update = function (dt, inp) {
    const F = this.F, B = this.ball, ctx = this.ctx, pl = ctx.player, btn = this.input(inp);
    this.t += dt;
    const me = this.mates[0]; me.x = pl.x; me.z = pl.z; me.yaw = pl.yaw;
    if (this.state === "ready") { this.stateT -= dt; if (this.stateT <= 0) this.state = "play"; }
    else if (this.state === "play") {
      this.clock -= dt;
      if (this.clock <= 0 || Math.max(...this.score) >= 5) return this.finish();
    } else if (this.state === "goal") { this.stateT -= dt; if (this.stateT <= 0) this.kickoff(this.lastConceded); }
    const playing = this.state === "play";
    /* ── 自分：近くでボタン＝キック（ゴールの方向へ少し寄せる） ── */
    me.cool -= dt;
    const dMe = Math.hypot(B.x - me.x, B.z - me.z);
    if (playing && btn.press && dMe < 1.3 && me.cool <= 0 && B.y < 1.0) {
      let fx = Math.sin(me.yaw), fz = Math.cos(me.yaw);
      const gx = F.cx + this.hx + 1 - B.x, gz = F.cz - B.z, ga = Math.atan2(gx, gz), fa = Math.atan2(fx, fz);
      if (Math.abs(wrapA(ga - fa)) < 1.0) { const a = fa + wrapA(ga - fa) * 0.55; fx = Math.sin(a); fz = Math.cos(a); }
      const far = Math.hypot(gx, gz) > 14;
      this.kick(me, fx, fz, far ? 19 : 15, far ? 3.2 : 1.2);
    }
    /* ドリブル：近くで動いていると、ボールを前へ運ぶ */
    const pv = Math.hypot(pl.vx || 0, pl.vz || 0);
    if (playing && dMe < 0.75 && pv > 0.5 && B.y < 0.5 && me.cool <= 0) {
      const fx = Math.sin(me.yaw), fz = Math.cos(me.yaw);
      B.x = me.x + fx * 0.62; B.z = me.z + fz * 0.62; B.vx = pl.vx * 1.05; B.vz = pl.vz * 1.05; B.last = 0;
    }
    /* ── CPU ── */
    const toBall = (m) => Math.hypot(B.x - m.x, B.z - m.z);
    [0, 1].forEach((team) => {
      const tm = this.mates.filter((m) => m.team === team && !m.me && m.role !== "gk");
      const chasers = this.mates.filter((m) => m.team === team && m.role !== "gk");
      let best = null, bd = 1e9; chasers.forEach((m) => { const d = toBall(m); if (d < bd) { bd = d; best = m; } });
      this.mates.filter((m) => m.team === team && !m.me).forEach((m) => {
        const s = team === 0 ? 1 : -1, ownGoal = F.cx - s * this.hx, oppGoal = F.cx + s * this.hx;
        let tx, tz, spd = m.spd;
        if (m.role === "gk") {
          tx = ownGoal + s * 1.2; tz = clamp(B.z, F.cz - this.goalW / 2 + 0.4, F.cz + this.goalW / 2 - 0.4);
          if (Math.abs(B.x - ownGoal) < 7 && Math.abs(B.z - F.cz) < 6) { tx = B.x; tz = B.z; spd *= 1.2; }
        } else if (m === best || (m.role === "att" && toBall(m) < 6)) {
          /* ボールの「ゴールと反対側」へ回りこんでから当たる */
          const gx = oppGoal - B.x, gz = F.cz - B.z, gl = Math.hypot(gx, gz) || 1;
          tx = B.x - gx / gl * 0.55; tz = B.z - gz / gl * 0.55;
          if (toBall(m) > 2.5) { tx = B.x; tz = B.z; }
        } else {
          /* 守備：自分のゴールとボールのあいだ／攻撃：前の空いた所 */
          const attack = B.last === team;
          tx = attack ? B.x + s * 7 : (B.x + ownGoal) / 2; tz = F.cz + (m.role === "def" ? -4 : 4) * (Math.sin(this.t * 0.3 + (m.team * 3)) > 0 ? 1 : -1);
          tx = clamp(tx, F.cx - this.hx + 2, F.cx + this.hx - 2);
        }
        if (!playing) { tx = m.x; tz = m.z; }
        const dx = tx - m.x, dz = tz - m.z, d = Math.hypot(dx, dz);
        let v = 0;
        if (d > 0.15) { const k = Math.min(1, d / 0.8); m.x += dx / d * spd * k * dt; m.z += dz / d * spd * k * dt; v = spd * k; m.yaw += wrapA(Math.atan2(dx, dz) - m.yaw) * Math.min(1, dt * 10); }
        m.v = v;
        m.x = clamp(m.x, F.cx - this.hx - 1.5, F.cx + this.hx + 1.5); m.z = clamp(m.z, F.cz - this.hz - 1.5, F.cz + this.hz + 1.5);
        /* キック */
        m.cool -= dt;
        /* キーパー：手の届く所（1.5m）に来たシュートは止める */
        if (playing && m.role === "gk" && toBall(m) < 1.5 && B.y < 2.2 && Math.hypot(B.vx, B.vz) > 3 && (B.vx * s) < 0 && m.cool <= 0 && Math.random() < 0.55 + 0.25 * (team === 0 ? 1 : 0)) {
          B.vx = B.vz = B.vy = 0; B.x = m.x + s * 0.5; B.z = m.z; m.cool = 0.25;
        }
        if (playing && toBall(m) < 0.95 && m.cool <= 0 && B.y < 1.0) {
          const gx = oppGoal - B.x, gz = F.cz + (Math.random() - 0.5) * this.goalW * 0.9 - B.z, gd = Math.hypot(gx, gz);
          /* 前にいる味方へパス（ゴールが遠いとき） */
          const fw = tm.find((o) => o !== m && (o.x - m.x) * s > 3 && Math.hypot(o.x - m.x, o.z - m.z) < 16);
          if (m.role === "gk") this.kick(m, s * 1, (Math.random() - 0.5) * 0.8, 17, 4);
          else if (gd > 16 && fw && Math.random() < 0.55) this.kick(m, fw.x + s * 2 - B.x, fw.z - B.z, 13, 0.5);
          else if (gd > 22 && team === 1) this.kick(m, gx, gz, 11, 0.3);          /* 赤は遠くからは運ぶ（前へ軽く） */
          else this.kick(m, gx, gz, gd > 14 ? (team === 1 ? 15 : 18) : 13, gd > 14 ? 2.2 : 0.8);
        }
      });
    });
    /* ── ボールの動き ── */
    B.vy -= 9.8 * dt; B.y += B.vy * dt;
    if (B.y < B.r) { B.y = B.r; if (B.vy < -1.5) B.vy = -B.vy * 0.45; else B.vy = 0; }
    const fr = B.y > B.r + 0.05 ? 0.15 : 1.0;
    const k = Math.exp(-fr * dt); B.vx *= k; B.vz *= k;
    B.x += B.vx * dt; B.z += B.vz * dt;
    /* 板・ゴール */
    const x0 = F.cx - this.hx, x1 = F.cx + this.hx, z0 = F.cz - this.hz - 2, z1 = F.cz + this.hz + 2;
    if (B.z < z0 + B.r) { B.z = z0 + B.r; B.vz = Math.abs(B.vz) * 0.7; } if (B.z > z1 - B.r) { B.z = z1 - B.r; B.vz = -Math.abs(B.vz) * 0.7; }
    const inMouth = Math.abs(B.z - F.cz) < this.goalW / 2 - B.r && B.y < 2.1;
    if (playing && B.x > x1 && inMouth) return this.goal(0);
    if (playing && B.x < x0 && inMouth) return this.goal(1);
    if (!inMouth || !playing) {
      if (B.x < x0 - 1.8 + B.r) { B.x = x0 - 1.8 + B.r; B.vx = Math.abs(B.vx) * 0.7; }
      if (B.x > x1 + 1.8 - B.r) { B.x = x1 + 1.8 - B.r; B.vx = -Math.abs(B.vx) * 0.7; }
    } else if (B.x < x0 - 1.4 || B.x > x1 + 1.4) { B.vx *= -0.3; }
    /* 選手に当たったボールは少しはねる */
    this.mates.forEach((m) => { const d = Math.hypot(B.x - m.x, B.z - m.z); if (d < 0.45 && B.y < 1.2 && !(m.me && pv > 0.5)) { const nx = (B.x - m.x) / (d || 1), nz = (B.z - m.z) / (d || 1); B.x = m.x + nx * 0.45; B.z = m.z + nz * 0.45; const vn = B.vx * nx + B.vz * nz; if (vn < 0) { B.vx -= 1.6 * vn * nx; B.vz -= 1.6 * vn * nz; } } });
    this.ballM.position.set(B.x, B.y, B.z);
    this.ballM.rotation.x += B.vz * dt / B.r; this.ballM.rotation.z -= B.vx * dt / B.r;
    /* 見た目 */
    this.mates.forEach((m) => {
      if (m.me) return;
      if (m.act) { m.actT += dt / 0.4; if (m.actT >= 1) m.act = null; }
      m.av.root.position.set(m.x, 0, m.z); m.av.root.rotation.y = m.yaw;
      m.av.update(dt, m.v || 0, { action: m.act, actionT: m.actT, headYaw: 0 });
    });
    const mm = Math.max(0, this.clock), mi = Math.floor(mm / 60), se = Math.floor(mm % 60);
    ui().info.innerHTML = '<span class="tb">青 ' + this.score[0] + '</span> - <span class="tr">' + this.score[1] + ' 赤</span>  ⏱ ' + mi + ":" + String(se).padStart(2, "0");
    ui().sub.textContent = dMe < 1.3 && playing ? (ctx.MOBILE ? "キックできる！" : "E でキック！") : "";
  };
  Soccer.prototype.goal = function (team) {
    this.score[team]++; this.lastConceded = team === 0 ? 1 : 0;
    this.state = "goal"; this.stateT = 2.6;
    msg('<b class="big ' + (team === 0 ? "tb" : "tr") + '">GOAL!!</b><p>' + (team === 0 ? "青チーム（あなたのチーム）が決めた！" : "赤チームに決められた…") + "</p>", 2400);
    if (team === 0) { confetti(50); this.ctx.player.av.play && this.ctx.player.av.play("cheer", 1.2); }
    this.mates.forEach((m) => { if (!m.me && m.team === team) { m.act = "cheer"; m.actT = 0; } });
  };
  Soccer.prototype.finish = function () {
    if (this.done) return; this.done = true; this.state = "end";
    const [a, b] = this.score, win = a > b;
    endPanel(this, win ? "🏆 勝ち！" : a === b ? "引き分け" : "負け…", ["青 " + a + " − " + b + " 赤", win ? "ナイスゲーム！" : "もう一度挑戦してみよう"], win);
  };
  Soccer.prototype.camera = function (cam) { cam.pitch = Math.max(cam.pitch, 0.45); };

  /* ══════════════ ボッチャ ══════════════ */
  function Boccia(ctx) {
    /* ★★ 2026-10-02 MAGI BOCCIA RUSH LAND のコートは「ラッシュ」ルール：3 投ごとに RUSH SHOT（光る玉＝ほかの玉を強くはじく） */
    const RUSH = !!(ctx.world.boccia && ctx.world.boccia.rush);
    Base.call(this, ctx, "boccia", RUSH ? "🔴 MAGI BOCCIA RUSH（あなた＝赤 vs リコ＝青）" : "🔴 ボッチャ（あなた＝赤 vs リコ＝青）");
    this.rush = RUSH; this.nThrow = { r: 0, b: 0 };
    const C = this.C = ctx.world.boccia;
    this.x0 = C.cx - C.L / 2; this.x1 = C.cx + C.L / 2; this.z0 = C.cz - C.Wd / 2; this.z1 = C.cz + C.Wd / 2; this.line = C.cx - 3.75;
    this.balls = []; this.left = { r: 6, b: 6 }; this.phase = "jack"; this.turn = "r"; this.aim = 0; this.pow = 0; this.charging = false; this.wait = 0;
    this.throwAt = { r: [C.cx - 5, C.cz + 1.2], b: [C.cx - 5, C.cz - 1.2] };
    this.riko = this.cpu("riko"); this.riko.root.position.set(this.throwAt.b[0], 0, this.throwAt.b[1]); this.riko.root.rotation.y = Math.PI / 2;
    /* ねらいの矢印 */
    const ar = new T.Mesh(new T.ConeGeometry(0.18, 0.5, 3), new T.MeshBasicMaterial({ color: 0xffe066 })); ar.rotation.x = Math.PI / 2; this.arrow = this.add(new T.Group()); this.arrow.add(ar); ar.position.z = 1.2;
    const ln = new T.Mesh(new T.BoxGeometry(0.04, 0.02, 1.0), new T.MeshBasicMaterial({ color: 0xffe066 })); ln.position.z = 0.6; this.arrow.add(ln);
    ui().act.textContent = "🔴 ためて投げる";
    ctx.cam.yaw = -Math.PI / 2; ctx.cam.pitch = 0.42; ctx.cam.dist = 4.2;
    msg('<b class="big">BOCCIA</b><p>まずは白いジャックボールを投げよう</p><p>' + (ctx.MOBILE ? "スティックの左右でねらい・ボタンを押してためて離す" : "A/D でねらい・E（スペース）を押してためて離す") + "</p>", 3200);
  }
  Boccia.prototype = Object.create(Base.prototype);
  Boccia.prototype.ownsMove = true;
  Boccia.prototype.addBall = function (kind, x, z, vx, vz) {
    const col = kind === "j" ? 0xffffff : kind === "r" ? 0xe8303a : 0x2a6ae8;
    const m = this.add(new T.Mesh(new T.SphereGeometry(0.135, 20, 14), new T.MeshToonMaterial({ color: col, gradientMap: X.toonGradient() }))); m.castShadow = true;
    const b = { kind, x, z, vx, vz, m, out: false }; this.balls.push(b); return b;
  };
  Boccia.prototype.throwBall = function (who, ang, pw) {
    const [tx, tz] = this.throwAt[who], v = 1.2 + pw * 4.3;   /* いちばん強くて 14m ほど（コートは投げる所から 10m） */
    const kind = this.phase === "jack" ? "j" : who;
    const nb = this.addBall(kind, tx + 0.5, tz, Math.cos(ang) * v, Math.sin(ang) * v);
    if (this.rush && kind !== "j" && ++this.nThrow[who] % 3 === 0) { nb.rush = true; nb.m.material.emissive = new T.Color(who === "r" ? 0xff3a3a : 0x3a6aff); nb.m.material.emissiveIntensity = 0.9; nb.m.scale.setScalar(1.12); msg('<b class="big">RUSH SHOT!!</b><p>' + (who === "r" ? "あなた" : "リコ") + "の光る玉は、ほかの玉を強くはじく！</p>", 1200); }
    if (kind !== "j") this.left[who]--;
    this.wait = 0.5;
    if (who === "r") this.ctx.player.av.play && this.ctx.player.av.play("throw", 0.55); else { this.rikoAct = 0; }
  };
  Boccia.prototype.moving = function () { return this.balls.some((b) => !b.out && Math.hypot(b.vx, b.vz) > 0.02); };
  Boccia.prototype.jack = function () { return this.balls.find((b) => b.kind === "j" && !b.out); };
  Boccia.prototype.nextTurn = function () {
    const J = this.jack();
    if (this.phase === "jack") {
      if (!J || J.x < this.line + 1) { this.balls.filter((b) => b.kind === "j").forEach((b) => { b.out = true; b.m.visible = false; }); const nb = this.addBall("j", this.C.cx + 0.5, this.C.cz, 0, 0); msg("<p>ジャックが範囲の外 → ✕印に置きなおしました</p>", 1800); }
      this.phase = "play"; this.turn = "r"; return;
    }
    if (!J) { const nb = this.addBall("j", this.C.cx + 0.5, this.C.cz, 0, 0); }
    if (this.left.r + this.left.b === 0) return this.finish();
    if (this.left.r === 0) { this.turn = "b"; return; } if (this.left.b === 0) { this.turn = "r"; return; }
    const jb = this.jack(), near = (k) => Math.min(...this.balls.filter((b) => b.kind === k && !b.out).map((b) => Math.hypot(b.x - jb.x, b.z - jb.z)).concat([99]));
    const r = near("r"), b = near("b");
    if (r === 99 && b === 99) this.turn = this.turn === "r" ? "b" : "r";
    else this.turn = r > b ? "r" : "b";                 /* ジャックから遠いほうが投げる */
  };
  Boccia.prototype.update = function (dt, inp) {
    const ctx = this.ctx, pl = ctx.player, btn = this.input(inp), C = this.C;
    this.t += dt;
    const [px, pz] = this.throwAt.r; pl.x = px; pl.z = pz; pl.yaw = Math.PI / 2 + 0 * this.aim;
    /* ボールの転がり・ぶつかり */
    const bs = this.balls.filter((b) => !b.out);
    for (const b of bs) {
      const v = Math.hypot(b.vx, b.vz);
      if (v > 0) { const nv = Math.max(0, v - 1.05 * dt); b.vx *= nv / v; b.vz *= nv / v; }
      b.x += b.vx * dt; b.z += b.vz * dt;
      if (b.x > this.x1 || b.z < this.z0 || b.z > this.z1 || b.x < this.x0) { b.out = true; b.m.visible = false; }
    }
    for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
      const a = bs[i], b = bs[j], dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
      if (d < 0.27 && d > 1e-5) {
        const nx = dx / d, nz = dz / d, ov = 0.27 - d; a.x -= nx * ov / 2; a.z -= nz * ov / 2; b.x += nx * ov / 2; b.z += nz * ov / 2;
        const rv = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
        if (rv < 0) { const ma = a.rush ? 2.6 : 1, mb = b.rush ? 2.6 : 1, k = -(1 + 0.85) * rv / (1 / ma + 1 / mb); a.vx -= k / ma * nx; a.vz -= k / ma * nz; b.vx += k / mb * nx; b.vz += k / mb * nz; }
      }
    }
    bs.forEach((b) => { b.m.position.set(b.x, 0.135, b.z); b.m.rotation.x += b.vz * dt / 0.135; b.m.rotation.z -= b.vx * dt / 0.135; });
    /* 手番 */
    if (this.done) return;
    this.wait -= dt;
    const busy = this.moving() || this.wait > 0;
    if (!busy && this.pending) { this.pending = false; this.nextTurn(); if (this.done) return; }
    const myTurn = !busy && !this.pending && this.turn === "r";
    this.arrow.visible = myTurn;
    if (myTurn) {
      this.aim = clamp(this.aim + (inp.ix || 0) * dt * 0.9, -0.55, 0.55);   /* 右（D）＝投げる人から見て右（+z） */
      this.arrow.position.set(px + 0.5, 0.05, pz); this.arrow.rotation.y = Math.PI / 2 - this.aim;
      if (btn.press) { this.charging = true; this.powT = 0; }
      if (this.charging) {
        this.powT += dt; this.pow = 0.5 - 0.5 * Math.cos(this.powT * 2.6);
        const h = ui(); h.pow.classList.add("on"); h.powI.style.width = Math.round(this.pow * 100) + "%";
        if (btn.release || !btn.held) { this.charging = false; ui().pow.classList.remove("on"); this.throwBall("r", this.aim, this.pow); this.pending = true; }
      }
    } else if (!busy && !this.pending && this.turn === "b") {
      /* リコ（CPU）：ジャックのそばをねらう。赤がジャックにくっついていたら強めにはじく */
      const J = this.jack() || { x: C.cx + 0.5, z: C.cz };
      const [tx, tz] = this.throwAt.b;
      let gx = J.x + (Math.random() - 0.5) * 0.5, gz = J.z + (Math.random() - 0.5) * 0.5;
      const rClose = this.balls.find((b) => b.kind === "r" && !b.out && Math.hypot(b.x - J.x, b.z - J.z) < 0.35);
      if (this.phase === "jack") { gx = C.cx + 1 + Math.random() * 3; gz = C.cz + (Math.random() - 0.5) * 3; }
      const d = Math.hypot(gx - (tx + 0.5), gz - tz), v = Math.sqrt(2 * 1.05 * d) * (0.94 + Math.random() * 0.12) * (rClose ? 1.25 : 1);
      const ang = Math.atan2(gz - tz, gx - (tx + 0.5)) + (Math.random() - 0.5) * 0.06;
      const pw = clamp((v - 1.2) / 4.3, 0, 1);
      this.rikoWait = (this.rikoWait || 0) + dt;
      if (this.rikoWait > 1.2) { this.rikoWait = 0; this.throwBall("b", ang, pw); this.pending = true; }
    }
    /* リコの見た目 */
    if (this.rikoAct != null) { this.rikoAct += dt / 0.55; if (this.rikoAct >= 1) this.rikoAct = null; }
    this.riko.update(dt, 0, { action: this.rikoAct != null ? "throw" : null, actionT: this.rikoAct || 0 });
    ui().info.innerHTML = '<span class="tr">赤 残り ' + this.left.r + '</span>  <span class="tb">青 残り ' + this.left.b + "</span>";
    ui().sub.textContent = this.phase === "jack" ? "ジャックボール（白）を投げよう" : myTurn ? "あなたの番" : this.turn === "b" && !busy ? "リコの番…" : "";
    /* カメラ：投げる所から／転がっている間は上から */
    const cam = ctx.cam;
    if (busy) { cam.pitch += (0.95 - cam.pitch) * Math.min(1, dt * 2); cam.dist += (9 - cam.dist) * Math.min(1, dt * 2); }
    else { cam.pitch += (0.42 - cam.pitch) * Math.min(1, dt * 3); cam.dist += (4.2 - cam.dist) * Math.min(1, dt * 3); }
  };
  Boccia.prototype.finish = function () {
    if (this.done) return; this.done = true;
    const J = this.jack();
    const dist = (k) => this.balls.filter((b) => b.kind === k && !b.out).map((b) => Math.hypot(b.x - J.x, b.z - J.z)).sort((a, b) => a - b);
    const r = dist("r"), b = dist("b"), rb = r[0] != null ? r[0] : 99, bb = b[0] != null ? b[0] : 99;
    let win = null, pts = 0;
    if (rb < bb) { win = "r"; pts = r.filter((d) => d < bb).length; } else if (bb < rb) { win = "b"; pts = b.filter((d) => d < rb).length; }
    setTimeout(() => endPanel(this, win === "r" ? "🏆 あなたの勝ち！" : win === "b" ? "リコの勝ち" : "引き分け", [win ? (win === "r" ? "赤" : "青") + " に " + pts + " 点" : "同じ近さでした", win === "r" ? "リコ「やるね！もう一回やろう！」" : "リコ「ふふっ、次も負けないよ！」"], win === "r"), 600);
  };

  /* ══════════════ カートレース ══════════════ */
  const KART_COLS = [0xff5f3a, 0x2a6ae8, 0x2fbf6a, 0xffc020, 0xc05aff, 0xff5fa8];
  function kartMesh(color) {
    const g = new T.Group(), m = new T.MeshToonMaterial({ color, gradientMap: X.toonGradient() }), dk = new T.MeshToonMaterial({ color: 0x1c1c22, gradientMap: X.toonGradient() });
    const body = new T.Mesh(new T.BoxGeometry(1.25, 0.32, 2.1), m); body.position.y = 0.32; g.add(body);
    const nose = new T.Mesh(new T.BoxGeometry(1.0, 0.24, 0.6), m); nose.position.set(0, 0.3, 1.25); g.add(nose);
    const seat = new T.Mesh(new T.BoxGeometry(0.62, 0.5, 0.18), dk); seat.position.set(0, 0.62, -0.5); g.add(seat);
    const wing = new T.Mesh(new T.BoxGeometry(1.3, 0.06, 0.35), m); wing.position.set(0, 0.8, -1.05); g.add(wing);
    const wheels = [];
    [[-0.66, 0.72], [0.66, 0.72], [-0.66, -0.72], [0.66, -0.72]].forEach(([x, z]) => { const w = new T.Mesh(new T.CylinderGeometry(0.26, 0.26, 0.24, 14), dk); w.rotation.z = Math.PI / 2; w.position.set(x, 0.26, z); g.add(w); wheels.push(w); });
    const st = new T.Mesh(new T.TorusGeometry(0.16, 0.03, 6, 16), dk); st.position.set(0, 0.72, 0.25); st.rotation.x = -0.9; g.add(st);
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    g.userData.wheels = wheels;
    return g;
  }
  function Kart(ctx) {
    Base.call(this, ctx, "kart", "🏁 カートレース（3周）");
    const Cc = this.C = ctx.world.circuit, N = Cc.pts.length;
    this.N = N; this.laps = 3; this.state = "count"; this.stateT = 3.9; this.raceT = 0;
    const names = ["ジン", "ナナ", "トーマ", "ヴィオ", "ミカ"];
    this.karts = [];
    for (let i = 0; i < 6; i++) {
      const me = i === 5;
      const mesh = this.add(kartMesh(KART_COLS[i]));
      let drv = null;
      if (!me) { const sp = XPeople.athlete({ c: "#" + new T.Color(KART_COLS[i]).getHexString(), names: [names[i]] }, i); drv = this.cpu(sp); }
      /* グリッド：スタートラインの後ろに2列 */
      const back = 6 + Math.floor(i / 2) * 5, lat = (i % 2 ? 2.2 : -2.2);
      const idx = (N - Math.round(back / (Cc.len / N)) + N) % N;
      const p = Cc.pts[idx], q = Cc.pts[(idx + 1) % N], h = Math.atan2(q.x - p.x, q.z - p.z);
      const nx = Math.cos(h), nz = -Math.sin(h);
      this.karts.push({ me, mesh, drv, x: p.x + nx * lat, z: p.z + nz * lat, h, v: 0, idx, lap: -1, passedHalf: true,   /* スタートラインの手前から：線をこえて 0 周目 */ prog: 0, max: me ? 22 : 19.5 + Math.random() * 2.5, line: (Math.random() - 0.5) * 4, finish: 0, name: me ? "あなた" : names[i], steer: 0 });
    }
    ui().act.textContent = "🚀 ブースト";
    this.boost = 1;
    msg('<b class="big">READY…</b><p>' + (ctx.MOBILE ? "スティックで左右・上でアクセル／下でブレーキ（手をはなすと自動でアクセル）" : "W／↑ アクセル・S／↓ ブレーキ・A/D でハンドル・E でブースト") + "</p>", 2600);
  }
  Kart.prototype = Object.create(Base.prototype);
  Kart.prototype.ownsMove = true; Kart.prototype.ownsCam = true;
  Kart.prototype.nearest = function (k) {
    const P = this.C.pts, N = this.N; let bi = k.idx, bd = 1e9;
    for (let o = -12; o <= 30; o++) { const i = (k.idx + o + N) % N, d = (P[i].x - k.x) ** 2 + (P[i].z - k.z) ** 2; if (d < bd) { bd = d; bi = i; } }
    return bi;
  };
  Kart.prototype.update = function (dt, inp) {
    const ctx = this.ctx, P = this.C.pts, N = this.N, W = this.C.W, btn = this.input(inp);
    if (this.state === "count") {
      this.stateT -= dt;
      const n = Math.ceil(this.stateT - 0.9);
      const txt = n >= 1 ? String(n) : "GO!";
      if (txt !== this._ct) { this._ct = txt; msg('<b class="big">' + txt + "</b>", txt === "GO!" ? 900 : 0); }
      if (this.stateT <= 0.9) { this.state = "race"; }
    }
    const racing = this.state === "race";
    if (racing) this.raceT += dt;
    /* 自分の入力 */
    let thr = 0, steer = 0;
    if (inp.keyW || (inp.joy && inp.iz < -0.25)) thr = 1;
    if (inp.keyS || (inp.joy && inp.iz > 0.35)) thr = -1;
    if (ctx.MOBILE && !inp.keyS && !(inp.joy && inp.iz > 0.35)) thr = Math.max(thr, 1);   /* スマホは自動でアクセル */
    steer = clamp(-(inp.ix || 0), -1, 1);
    if (btn.press && this.boost >= 1) { this.boostT = 1.4; this.boost = 0; }
    this.boost = Math.min(1, this.boost + dt / 8);
    if (this.boostT > 0) this.boostT -= dt;
    this.karts.forEach((k, ki) => {
      if (k.finish) { thr = 0; }
      let t = 0, s = 0;
      if (k.me) { t = k.finish ? 0.2 : thr; s = steer; }
      else {
        /* CPU：少し先の点（自分の走る線）をねらう */
        const look = Math.round(8 + k.v * 0.5), tp = P[(k.idx + look) % N], tq = P[(k.idx + look + 1) % N];
        const hh = Math.atan2(tq.x - tp.x, tq.z - tp.z), tx = tp.x + Math.cos(hh) * k.line, tz = tp.z - Math.sin(hh) * k.line;
        const want = Math.atan2(tx - k.x, tz - k.z), da = wrapA(want - k.h);
        s = clamp(da * 2.4, -1, 1); t = 1 - Math.min(0.55, Math.abs(da) * 1.1);
        /* ついてくる強さ：自分より前すぎると少しゆるめる */
        const me = this.karts[5]; const gap = (k.lap * N + k.idx) - (me.lap * N + me.idx);
        k.rubber = gap > 60 ? 0.93 : gap < -60 ? 1.06 : 1;
      }
      if (!racing) t = 0;
      if (k.finish && !k.me) t = 0.4;
      const lat = this.lateral(k), off = Math.abs(lat) > W / 2 + 0.6;
      const maxV = (off ? 9 : k.max) * (k.rubber || 1) * (k.me && this.boostT > 0 ? 1.35 : 1);
      if (t > 0) k.v += 13 * t * dt * (k.v < maxV ? 1 : 0); else if (t < 0) k.v += (k.v > 0 ? 22 : 6) * t * dt;
      k.v -= k.v * (off ? 1.4 : 0.32) * dt; if (k.v > maxV) k.v -= (k.v - maxV) * 3 * dt;
      k.v = clamp(k.v, -5, 30);
      k.steer += (s - k.steer) * Math.min(1, dt * 8);
      k.h += k.steer * 1.9 * (k.v / (Math.abs(k.v) + 4)) * dt;
      k.x += Math.sin(k.h) * k.v * dt; k.z += Math.cos(k.h) * k.v * dt;
      /* 外側のさく（コースの中心から W/2+3.2 を超えない） */
      k.idx = this.nearest(k);
      const L2 = this.lateral(k);
      if (Math.abs(L2) > W / 2 + 2.8) { const p = P[k.idx], q = P[(k.idx + 1) % N], hh = Math.atan2(q.x - p.x, q.z - p.z), nx = Math.cos(hh), nz = -Math.sin(hh), sg = Math.sign(L2); k.x = p.x + nx * sg * (W / 2 + 2.8); k.z = p.z + nz * sg * (W / 2 + 2.8); k.v *= 0.6; }
      /* 周回 */
      if (k.idx > N * 0.45 && k.idx < N * 0.6) k.passedHalf = true;
      if (k.passedHalf && k.idx < N * 0.1 && (k.prevIdx || 0) > N * 0.9) { k.lap++; k.passedHalf = false; if (k.lap >= this.laps && !k.finish) { k.finish = this.raceT; if (k.me) this.finishMe(); } else if (k.me && k.lap > 0 && k.lap < this.laps) msg('<b class="big">LAP ' + (k.lap + 1) + "/" + this.laps + "</b>", 1200); }
      k.prevIdx = k.idx;
      k.prog = k.lap * N + k.idx;
    });
    /* カートどうし */
    for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) { const a = this.karts[i], b = this.karts[j], dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz); if (d < 2.1 && d > 1e-4) { const o = (2.1 - d) / 2, nx = dx / d, nz = dz / d; a.x -= nx * o; a.z -= nz * o; b.x += nx * o; b.z += nz * o; } }
    /* 見た目 */
    const pl = ctx.player;
    this.karts.forEach((k) => {
      k.mesh.position.set(k.x, 0, k.z); k.mesh.rotation.y = k.h; k.mesh.rotation.z = -k.steer * Math.min(1, k.v / 20) * 0.06;
      k.mesh.userData.wheels.forEach((w, i) => { w.rotation.x += k.v * dt / 0.26; if (i < 2) w.rotation.y = k.steer * 0.4; });
      const sx = k.x - Math.sin(k.h) * 0.45, sz = k.z - Math.cos(k.h) * 0.45;
      if (k.me) { pl.x = sx; pl.z = sz; pl.yaw = k.h; pl.kartY = 0.28; }
      else { k.drv.root.position.set(sx, 0.2, sz); k.drv.root.rotation.y = k.h; k.drv.update(dt, 0, { action: "drive", actionT: 0.5, seatH: 0.32 }); }
    });
    const me = this.karts[5];
    const order = this.karts.slice().sort((a, b) => (b.finish ? 1e9 - b.finish : b.prog) - (a.finish ? 1e9 - a.finish : a.prog));
    const pos = order.indexOf(me) + 1;
    const lapShown = Math.max(1, Math.min(this.laps, me.lap + 1));
    ui().info.innerHTML = "LAP " + lapShown + "/" + this.laps + "  🏁 " + pos + "位 / 6  ⏱ " + this.raceT.toFixed(1) + "s  " + Math.round(Math.abs(me.v) * 3.6) + "km/h";
    ui().sub.innerHTML = '<span class="boost"><i style="width:' + Math.round(this.boost * 100) + '%"></i></span>';
    this.me = me; this.pos = pos;
    /* カメラ（うしろから追いかける） */
    const cam = ctx.camera, back = 6.2, up = 2.6;
    const cx = me.x - Math.sin(me.h) * back, cz = me.z - Math.cos(me.h) * back;
    this.cp = this.cp || new T.Vector3(cx, up, cz);
    this.cp.lerp(new T.Vector3(cx, up, cz), Math.min(1, dt * 5));
    cam.position.copy(this.cp); cam.lookAt(me.x + Math.sin(me.h) * 4, 1.0, me.z + Math.cos(me.h) * 4);
  };
  Kart.prototype.lateral = function (k) {
    const P = this.C.pts, N = this.N, p = P[k.idx], q = P[(k.idx + 1) % N], hh = Math.atan2(q.x - p.x, q.z - p.z);
    return (k.x - p.x) * Math.cos(hh) + (k.z - p.z) * -Math.sin(hh);
  };
  Kart.prototype.finishMe = function () {
    if (this.done) return; this.done = true;
    setTimeout(() => {
      const order = this.karts.slice().sort((a, b) => (b.finish ? 1e9 - b.finish : b.prog) - (a.finish ? 1e9 - a.finish : a.prog));
      const pos = order.indexOf(this.karts[5]) + 1;
      endPanel(this, pos === 1 ? "🏆 優勝！" : pos + "位でゴール", ["タイム " + this.karts[5].finish.toFixed(2) + " 秒", order.map((k, i) => (i + 1) + ". " + k.name).join("　")], pos === 1);
    }, 900);
  };

  /* ══════════════ 入口 ══════════════ */
  function start(kind, ctx) {
    if (kind === "soccer") return new Soccer(ctx);
    if (kind === "boccia") return new Boccia(ctx);
    if (kind === "kart") return window.XKartGP ? new XKartGP(ctx) : new Kart(ctx);          /* ★★ 2026-09-30 妖怪スカイグランプリ（park_kart.js） */
    return null;
  }
  window.XGames = { start, Base, ui, msg, confetti, endPanel };          /* ★★ 2026-10-02 ほかのファイルのゲーム（games_burst.js・park_gacha3d.js）からも土台を使う */
})();
