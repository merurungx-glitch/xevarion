/* ============================================================
   MagiBattle 3.0 — mb3-render.js（戦闘の画面：キャンバス＋HUD＋効果音）
   ・カメラは味方のうしろ。奥（地平線）から敵が迫り、手前に遮蔽物と5人の後ろ姿。
   ・照準：指を置いたまま動かすと照準が指の動きに合わせて動き（トラックパッドのように相対移動）、押しているあいだ撃つ。マウスはカーソルの位置。
   ・カットイン（バーストスキル）はキャラの縦長の絵（MagiBurst/img/ss/）、戦闘はドット絵（mb3-sprite.js）。
   ・MB3.Battle.start(root, cfg, onEnd) で始め、終わったら onEnd(B) を呼ぶ。
   ★★ 2026-10-31 ご指定「自分の攻撃のエフェクトなどをより豪華で派手で爽快感がある形に（重点的に）」
     ・光は「にじむ光の玉」（glow）を前もって描いておき、加算で重ねる（軽くて派手）。
     ・撃つ：銃口の星形の閃光・武器ごとの弾道（AR＝金の筋・SMG＝細かい筋・MG＝弾の流れ・SG＝扇の散弾・SR＝光線・RL＝煙を引くロケット）・薬莢。
     ・当たる：火花の筋・小さな閃光・会心は星と「CRITICAL」・コアは虹の輪と「WEAK」。
     ・倒す：敵が色つきの破片に砕ける・爆発の光と衝撃波と煙と火の粉・強敵とボスはヒットストップ・連続撃破「KILL ×n」・コンボ数。
     ・バースト：キャラごとの演出（ハル＝雨と波紋／チカ＝月の光線／ヒサコ＝桜と光線／アリス＝白百合の衝撃波／コハク＝薔薇の嵐／
       スズ＝ひまわりの六角の盾／ショウコ＝回復の雨／ユナ＝黒薔薇の爆発／ヨシノ＝火柱／アイナ＝月の雷と薔薇／イチカ＝波と泡／ノノカ＝白い花と回復）。
     ・フルバースト：虹色のふち・光の筋が立ちのぼる・弾が金色に・終わると合計ダメージ。WAVE をすべて倒すと「WAVE CLEAR」。
     ・敵の予兆：赤い円（曲射・ミサイルの雨）・突進の赤い光と矢印・EMP の青い輪・レーザーの線・地ひびきの赤い帯・ボスの盾と激昂。
   ★★ 2026-10-31 ご指定「AUTO のオン・オフは維持」→ AUTO と速さは設定に保存（つぎのバトルも同じ）。画面をさわっても AUTO は切れない（AUTO ボタン・T キーだけ）。
   ★★ 2026-10-31 アリーナ：相手は横にひろく並べる（ご指定「寄りすぎ」）。バーストは両方とも自動（ご指定「基本的にアリーナは自動」）・相手のバーストは上に小さく。
   ★★ 2026-10-31 完凸（凸4）のキャラのカードは、ほかの画面と同じ金の光（.mx）。
   ============================================================ */
(function () {
  "use strict";
  const MB3 = (window.MB3 = window.MB3 || {});
  const ENG = () => MB3.Engine, SPR = () => MB3.Spr, ST = () => window.MBStats;
  const IMG = "../img/", SSD = "../MagiBurst/img/ss/";
  const FILE = { haru: "Haru", chika: "Chika", hisako: "Hisako", alice: "Alice", kohaku: "Kohaku", suzu: "Suzu", shouko: "Shouko", yuna: "Yuna", chie: "Chie", aina: "Aina", ichika: "Ichika", nonoka: "Nonoka" };
  MB3.FILE = FILE;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  const fmt = (n) => Math.round(n).toLocaleString("ja-JP");
  const short = (n) => (n >= 1e9 ? (n / 1e9).toFixed(2) + "B" : n >= 1e6 ? (n / 1e6).toFixed(2) + "M" : n >= 1e4 ? (n / 1e3).toFixed(1) + "K" : fmt(n));
  const R2 = Math.random;
  const rgb = (h) => { const s = String(h).replace("#", ""); const n = parseInt(s.length === 3 ? s.split("").map((x) => x + x).join("") : s, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  /* キャラごとの色（弾道・バーストの演出） */
  const CCOL = { haru: "#4fb8ff", chika: "#cfe6ff", hisako: "#ff8fc8", alice: "#e8eeff", kohaku: "#ff4d6d", suzu: "#ffd23a", shouko: "#4fe0a0", yuna: "#b06bff", chie: "#ff7a3c", aina: "#ff7ad9", ichika: "#33d6ff", nonoka: "#fff4d6" };

  /* ══════════ 効果音（WebAudio で作る・ファイルなし）══════════ */
  const AU = (MB3.Audio = (function () {
    let ac = null, master = null, noiseBuf = null, on = true, vol = 1, last = {};
    function init() {
      if (ac) return ac;
      try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = 0.34 * vol; master.connect(ac.destination);
        noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.8, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } catch (e) { ac = null; }
      return ac;
    }
    function noise(t, dur, f, q, g, type) {
      const s = ac.createBufferSource(); s.buffer = noiseBuf; const fl = ac.createBiquadFilter(); fl.type = type || "bandpass"; fl.frequency.value = f; fl.Q.value = q || 1;
      const ga = ac.createGain(); ga.gain.setValueAtTime(g, t); ga.gain.exponentialRampToValueAtTime(0.001, t + dur); s.connect(fl); fl.connect(ga); ga.connect(master); s.start(t); s.stop(t + dur + 0.02);
    }
    function tone(t, f0, f1, dur, g, type) {
      const o = ac.createOscillator(); o.type = type || "sine"; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
      const ga = ac.createGain(); ga.gain.setValueAtTime(g, t); ga.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(ga); ga.connect(master); o.start(t); o.stop(t + dur + 0.02);
    }
    function play(k, v) {
      if (!on || !init()) return;
      if (ac.state === "suspended") { try { ac.resume(); } catch (e) {} if (ac.state !== "running") return; }
      const now = ac.currentTime; v = v == null ? 1 : v;
      const gap = { AR: 0.05, SMG: 0.04, MG: 0.035, eshot: 0.12, hit: 0.05, core: 0.06, crit: 0.07, kill: 0.06, coverHit: 0.12 }[k] || 0;
      if (gap && last[k] && now - last[k] < gap) return; last[k] = now;
      switch (k) {
        case "AR": noise(now, 0.08, 1800, 1.2, 0.36 * v); tone(now, 230, 90, 0.06, 0.14 * v, "square"); break;
        case "SMG": noise(now, 0.05, 2600, 1.5, 0.27 * v); tone(now, 300, 120, 0.04, 0.08 * v, "square"); break;
        case "MG": noise(now, 0.05, 1400, 1.1, 0.3 * v); tone(now, 160, 70, 0.04, 0.11 * v, "square"); break;
        case "SG": noise(now, 0.26, 900, 0.7, 0.6 * v); tone(now, 150, 45, 0.18, 0.34 * v, "sawtooth"); break;
        case "SR": noise(now, 0.34, 1200, 0.6, 0.62 * v); tone(now, 900, 70, 0.32, 0.28 * v, "sawtooth"); tone(now, 2400, 600, 0.12, 0.12 * v, "square"); break;
        case "RL": noise(now, 0.4, 500, 0.6, 0.5 * v); tone(now, 320, 60, 0.34, 0.26 * v, "triangle"); break;
        case "boom": noise(now, 0.7, 160, 0.5, 0.8 * v, "lowpass"); tone(now, 95, 28, 0.55, 0.5 * v, "sine"); break;
        case "kill": noise(now, 0.25, 600, 0.8, 0.4 * v); tone(now, 520, 120, 0.16, 0.16 * v, "square"); break;
        case "eshot": noise(now, 0.06, 3200, 2, 0.12 * v); break;
        case "hit": noise(now, 0.04, 4200, 3, 0.11 * v); break;
        case "core": tone(now, 1500, 2600, 0.08, 0.18 * v, "square"); tone(now + 0.04, 2600, 3200, 0.07, 0.1 * v, "triangle"); break;
        case "crit": tone(now, 1900, 1200, 0.07, 0.14 * v, "triangle"); noise(now, 0.05, 5200, 3, 0.1 * v); break;
        case "burst": tone(now, 300, 1400, 0.35, 0.36); noise(now, 0.5, 2500, 0.4, 0.26); tone(now + 0.12, 700, 2100, 0.3, 0.16, "triangle"); break;
        case "fb": tone(now, 200, 900, 0.6, 0.36, "square"); tone(now + 0.08, 400, 1600, 0.5, 0.26, "sawtooth"); noise(now, 0.9, 1200, 0.3, 0.32); [523, 659, 784, 1046].forEach((f, i) => tone(now + 0.3 + i * 0.07, f, f, 0.18, 0.12, "triangle")); break;
        case "ready": tone(now, 880, 1320, 0.12, 0.2, "triangle"); tone(now + 0.1, 1320, 1760, 0.12, 0.18, "triangle"); break;
        case "warn": tone(now, 520, 520, 0.18, 0.22, "square"); tone(now + 0.25, 520, 520, 0.18, 0.22, "square"); break;
        case "reload": noise(now, 0.05, 3000, 4, 0.12); noise(now + 0.12, 0.05, 2200, 4, 0.12); break;
        case "click": tone(now, 900, 1200, 0.05, 0.12, "triangle"); break;
        case "heal": tone(now, 660, 990, 0.25, 0.12, "sine"); tone(now + 0.08, 990, 1320, 0.2, 0.08, "sine"); break;
        case "beam": tone(now, 180, 900, 0.5, 0.22, "sawtooth"); noise(now, 0.6, 3000, 0.5, 0.18); break;
        case "emp": tone(now, 1200, 80, 0.5, 0.2, "square"); noise(now, 0.3, 6000, 1, 0.12); break;
        case "quake": noise(now, 1.0, 90, 0.4, 0.9, "lowpass"); tone(now, 60, 30, 0.9, 0.5, "sine"); break;
        case "enrage": tone(now, 110, 70, 0.8, 0.4, "sawtooth"); noise(now, 0.8, 400, 0.4, 0.4, "lowpass"); break;
        case "combo": tone(now, 1046, 1568, 0.12, 0.13, "triangle"); tone(now + 0.08, 1568, 2093, 0.14, 0.11, "triangle"); break;
        case "shield": tone(now, 330, 660, 0.4, 0.16, "triangle"); tone(now, 495, 990, 0.4, 0.1, "sine"); break;
        case "break": noise(now, 0.5, 5000, 0.6, 0.4); tone(now, 1800, 300, 0.4, 0.2, "square"); break;
        case "wave": noise(now, 0.4, 1800, 0.5, 0.2); tone(now, 500, 1000, 0.3, 0.1, "triangle"); break;
        case "win": [523, 659, 784, 1046, 1318].forEach((f, i) => tone(now + i * 0.11, f, f, 0.26, 0.22, "triangle")); tone(now + 0.6, 1046, 1046, 0.6, 0.16, "square"); break;
        case "lose": [392, 330, 262, 196].forEach((f, i) => tone(now + i * 0.2, f, f * 0.98, 0.32, 0.2, "triangle")); break;
        case "down": tone(now, 400, 90, 0.4, 0.22, "sawtooth"); break;
        case "coverHit": noise(now, 0.08, 900, 1.2, 0.1 * v); break;
      }
    }
    return { init, play, ctx: () => init(), set(v) { on = !!v; }, setVol(v) { vol = Math.max(0, Math.min(1, Number(v))); if (master) master.gain.value = 0.34 * vol; }, get on() { return on; } };
  })());

  /* ══════════ 戦闘の画面 ══════════ */
  const R = (MB3.Battle = {});
  let B = null, cv = null, g = null, hud = null, W = 0, H = 0, dpr = 1, raf = 0, lastT = 0, onEnd = null, bgC = null, bgKey = "";
  let geo = {}, aim = { x: 0, y: 0 }, shake = 0, P = [], tracers = [], rockets = [], beams = [], nums = [], booms = [], rings = [], emitters = [], delayed = [], pops = [];
  let flashT = 0, flashC = "255,255,255", cutQ = [], cutting = false, ended = false, msgT = 0, tint = null, speedT = 0, fbIntro = 0, keys = {}, keyFire = false, autoHintT = 0, lowHp = 0;
  const KEYAIM = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], KeyA: [-1, 0], KeyD: [1, 0], KeyW: [0, -1], KeyS: [0, 1] };
  let pointer = { down: false, id: null, lx: 0, ly: 0, mouse: false }, paused = false;

  /* ── 前もって描く光（加算で重ねる）── */
  const GLC = {};
  function glowSpr(c) {
    const key = typeof c === "string" ? c : c.join(",");
    if (GLC[key]) return GLC[key];
    const col = typeof c === "string" ? rgb(c).join(",") : c.join(",");
    const s = 64, cv2 = document.createElement("canvas"); cv2.width = cv2.height = s; const x = cv2.getContext("2d");
    const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.2, "rgba(" + col + ",.95)"); gr.addColorStop(0.5, "rgba(" + col + ",.38)"); gr.addColorStop(1, "rgba(" + col + ",0)");
    x.fillStyle = gr; x.fillRect(0, 0, s, s);
    return (GLC[key] = cv2);
  }
  function glow(x, y, r, c, a) { if (r <= 0.5) return; const pa = g.globalAlpha; g.globalAlpha = Math.max(0, Math.min(1, a)); g.drawImage(glowSpr(c), x - r, y - r, r * 2, r * 2); g.globalAlpha = pa; }
  /* 出来事の処理中（描く前）に光らせたいもの → 描くときに出す */
  let flares = [];
  function addFlare(x, y, r, c, d, rot) { flares.push({ x, y, r, c, t: d || 0.22, d: d || 0.22, rot: rot == null ? R2() : rot }); if (flares.length > 40) flares.shift(); }
  function flare(x, y, r, c, a, rot) {   /* 4本の光の筋（星形） */
    const sp = glowSpr(c); g.save(); g.translate(x, y); g.rotate(rot || 0); g.globalAlpha = Math.max(0, Math.min(1, a));
    g.drawImage(sp, -r, -r * 0.1, r * 2, r * 0.2); g.drawImage(sp, -r * 0.1, -r, r * 0.2, r * 2);
    g.rotate(Math.PI / 4); g.drawImage(sp, -r * 0.55, -r * 0.06, r * 1.1, r * 0.12); g.drawImage(sp, -r * 0.06, -r * 0.55, r * 0.12, r * 1.1);
    g.restore();
  }

  function layout() {
    const r = hud.root.getBoundingClientRect();
    W = Math.max(320, r.width); H = Math.max(400, r.height);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + "px"; cv.style.height = H + "px";
    const port = H > W * 1.05;
    const bb = hud.root.querySelector(".b3-bot"), bbH = bb ? bb.getBoundingClientRect().height : 0;
    const topH = 70, botH = Math.max(port ? 150 : 128, Math.round(bbH) + (port ? 4 : 12));
    geo = { port, hz: port ? H * 0.25 : H * 0.29, gy0: H - botH - (port ? 30 : 22), topH, botH };
    geo.k = Math.min(W, H * 0.85) / 118;
    geo.slotW = Math.min(W / 5.3, port ? 999 : H * 0.2);
    if (!aim.x) { aim.x = W / 2; aim.y = geo.hz + (geo.gy0 - geo.hz) * 0.45; }
    bgKey = ""; bgC = null;
  }
  /* 奥行き → 画面 */
  function sz(z) { return 1 / (1 + Math.max(-0.2, z) * 3.0); }
  const S1 = sz(1);
  function proj(x, z, y) {
    const s = sz(z), n = (s - S1) / (1 - S1);
    const gy = geo.hz + (geo.gy0 - geo.hz) * n;
    const spread = W * (0.1 + 0.37 * n);
    return { x: W / 2 + x * spread, y: gy - (y || 0) * H * 0.42 * (0.3 + 0.7 * n), s, n };
  }
  /* アリーナの相手：横にひろく（ご指定「寄りすぎ」）。画面の 12%〜88% に等間隔 */
  function foePos(i) { const y = geo.hz + (geo.gy0 - geo.hz) * (geo.port ? 0.4 : 0.42); return { x: W * (0.12 + i * 0.19), y, s: 1 }; }
  /* 画面 → 当たり判定（操作中のキャラの1発）。dx,dy は画面の高さに対する割合のぶれ */
  function pickAt(dx, dy) {
    const px = aim.x + dx * H, py = aim.y + dy * H;
    const ms = B.proj.filter((p) => p.k === "missile" && !p.dead && p._r);
    for (const m of ms) { const r = m._r; if (Math.hypot(px - r.x, py - r.y) < r.r) return { t: m, part: "body" }; }
    const es = B.enemies.filter((e) => !e.dead && e._r).sort((a, b) => a.z - b.z);
    for (const e of es) {
      const r = e._r;
      if (e.isBoss && e.parts) for (const p of e.parts) { if (p.dead) continue; const cx = r.x + (p.x - 0.5) * r.w, cy = r.y + p.y * r.h; if (Math.hypot(px - cx, py - cy) < p.r * r.w) return { t: e, part: p.k }; }
      if (r.cr && Math.hypot(px - r.cx, py - r.cy) < r.cr * 1.15) return { t: e, part: "core" };
      if (px > r.x - r.w * 0.42 && px < r.x + r.w * 0.42 && py > r.y + r.h * 0.06 && py < r.y + r.h * 0.96) return { t: e, part: "body" };
    }
    return null;
  }

  /* ── HUD（DOM）── */
  function buildHud(root) {
    root.innerHTML =
      '<canvas class="b3-cv"></canvas>' +
      '<div class="b3-fb" id="b3Fb"></div><div class="b3-low" id="b3Low"></div>' +
      '<div class="b3-top"><div class="b3-st"><b id="b3Stage"></b><small id="b3Wave"></small></div><div class="b3-time" id="b3Time">4:00</div><button class="b3-pause" id="b3Pause" aria-label="一時停止"><i></i><i></i></button></div>' +
      '<div class="b3-boss" id="b3Boss" hidden><div class="b3-bn"><small id="b3BossCode"></small><b id="b3BossNm"></b><em id="b3Enr" hidden>激昂</em></div><div class="b3-bhp"><i id="b3BossHp"></i></div><div class="b3-bsh" id="b3Bsh" hidden><i id="b3BshBar"></i><span>SHIELD</span></div><div class="b3-brk" id="b3Brk" hidden><span>BREAK</span><i id="b3BrkBar"></i></div></div>' +
      '<div class="b3-eg" id="b3EG" hidden><span id="b3EGt">ENEMY</span><i><b id="b3EGb"></b></i></div>' +
      '<div class="b3-combo" id="b3Combo"><b id="b3ComboN">0</b><small>HIT</small></div>' +
      '<div class="b3-msg" id="b3Msg"></div>' +
      '<div class="b3-cut" id="b3Cut"></div>' +
      '<div class="b3-bot"><div class="b3-gauge"><div class="b3-gtxt" id="b3GTxt">BURST</div><div class="b3-gbar"><i id="b3GBar"></i></div><button class="b3-auto" id="b3Auto">AUTO</button><button class="b3-spd" id="b3Spd">×1</button></div>' +
      '<div class="b3-cards" id="b3Cards"></div></div>' +
      '<div class="b3-pmenu" id="b3PMenu" hidden><div class="b3-pbox"><b>一時停止</b><button id="b3Resume" class="b3-pbtn pri">再開する</button><button id="b3Sound" class="b3-pbtn">効果音：ON</button><button id="b3Bgm" class="b3-pbtn">BGM：ON</button><button id="b3Quit" class="b3-pbtn dim">撤退する</button></div></div>';
    const $ = (s) => root.querySelector(s);
    return { root, $, cards: $("#b3Cards"), cut: $("#b3Cut"), msg: $("#b3Msg"), combo: $("#b3Combo"), comboN: $("#b3ComboN") };
  }
  function cardsHTML() {
    return B.side[0].units.map((u) => {
      const K = u.K, Bu = ST().BURST[K.burst];
      const mx = u.awk >= (ST().MAX_AWK || 4);
      return '<button class="b3-card' + (mx ? " mx" : "") + '" data-i="' + u.i + '" style="--bc:' + Bu.c + ";--cc:" + (CCOL[u.id] || "#fff") + '"><span class="b3-ci"><img src="' + SSD + FILE[u.id] + 'SS.webp" alt="" onerror="this.src=\'' + IMG + "t_" + FILE[u.id] + '.webp\'"></span>' +
        '<span class="b3-cb">' + Bu.nm + '</span><span class="b3-cw">' + K.wp + '</span><span class="b3-cn">' + esc(ST().charNm(u.id)) + '</span><span class="b3-key">' + (u.i + 1) + '</span><span class="b3-ccd"></span><span class="b3-cready">BURST</span>' +
        '<span class="b3-bars"><i class="hp"><b></b></i><i class="cv"><b></b></i><i class="am"><b></b></i></span></button>';
    }).join("");
  }
  function paintHud() {
    const S = B.side[0];
    const t = Math.max(0, B.time - B.t), m = Math.floor(t / 60), s = Math.floor(t % 60);
    hud.$("#b3Time").textContent = m + ":" + String(s).padStart(2, "0");
    hud.$("#b3Time").classList.toggle("low", t < 20);
    const gb = hud.$("#b3GBar"), gt = hud.$("#b3GTxt");
    if (S.fb > 0) { gb.style.width = (S.fb / ENG().FB_TIME * 100) + "%"; gb.className = "fb"; gt.innerHTML = "<b>FULL BURST</b> " + S.fb.toFixed(1); }
    else if (S.stage > 0) { gb.style.width = "100%"; gb.className = "st" + S.stage; gt.innerHTML = "<b>BURST " + ["", "Ⅰ", "Ⅱ", "Ⅲ"][S.stage] + "</b>" + (S.stage >= 2 ? " " + Math.max(0, S.stageT).toFixed(1) : " READY"); }
    else { gb.style.width = S.gauge + "%"; gb.className = ""; gt.textContent = "BURST " + Math.floor(S.gauge) + "%"; }
    const cands = S.stage > 0 ? ENG().burstCands(S) : [];
    hud.cards.querySelectorAll(".b3-card").forEach((el) => {
      const u = S.units[+el.dataset.i]; if (!u) return;
      el.classList.toggle("ctl", B.ctl === u.i && !B.auto && B.manual);
      el.classList.toggle("dead", u.dead);
      el.classList.toggle("ready", cands.indexOf(u) >= 0);
      el.classList.toggle("rel", u.reload > 0);
      const bars = el.querySelectorAll(".b3-bars b");
      bars[0].style.width = (u.hp / u.hpMax * 100) + "%";
      bars[1].style.width = (u.cover.hp / u.cover.max * 100) + "%";
      bars[2].style.width = (u.reload > 0 ? (1 - u.reload / u.rT) * 100 : u.ammo / u.mag * 100) + "%";
      const cd = el.querySelector(".b3-ccd");
      if (u.bcd > 0 && !u.dead) { cd.style.display = ""; cd.textContent = Math.ceil(u.bcd); cd.style.setProperty("--p", (u.bcd / u.K.cd * 100) + "%"); } else cd.style.display = "none";
    });
    /* ボス（HP・盾・BREAK・激昂） */
    const bo = B.bossRef || (B.mode === "boss" ? B.enemies.find((e) => e.isBoss) : null);
    const bx = hud.$("#b3Boss");
    if (bo && !bo.dead) {
      bx.hidden = false; hud.$("#b3BossNm").textContent = bo.nm; hud.$("#b3BossCode").textContent = bo.bd.code + (B.mode === "boss" ? "　DAMAGE " + fmt(B.dmgTotal) : "");
      hud.$("#b3BossHp").style.width = Math.max(0, bo.hp / bo.hpMax * 100) + "%";
      hud.$("#b3Enr").hidden = !bo.enraged;
      const sh = hud.$("#b3Bsh"); if (bo.shieldHp > 0) { sh.hidden = false; hud.$("#b3BshBar").style.width = (bo.shieldHp / bo.shieldMax * 100) + "%"; } else sh.hidden = true;
      const br = hud.$("#b3Brk"); if (B.breakT > 0) { br.hidden = false; hud.$("#b3BrkBar").style.width = (bo.act && bo.act.k === "charge" ? Math.max(0, 1 - bo.act.dmg / bo.act.need) * 100 : 0) + "%"; } else br.hidden = true;
    } else bx.hidden = true;
    /* アリーナ：相手のバーストのゲージ（小さく） */
    if (B.mode === "arena" && B.side[1]) {
      const E = B.side[1], eg = hud.$("#b3EG"); eg.hidden = false;
      hud.$("#b3EGb").style.width = (E.fb > 0 ? E.fb / ENG().FB_TIME * 100 : E.stage > 0 ? 100 : E.gauge) + "%";
      hud.$("#b3EGt").textContent = E.fb > 0 ? "ENEMY FULL BURST" : E.stage > 0 ? "ENEMY BURST " + ["", "Ⅰ", "Ⅱ", "Ⅲ"][E.stage] : "ENEMY " + Math.floor(E.gauge) + "%";
      eg.classList.toggle("hot", E.fb > 0 || E.stage > 0);
    }
    hud.$("#b3Auto").classList.toggle("on", !!B.auto || B.mode === "arena");
    hud.$("#b3Spd").textContent = "×" + (B.speed || 1);
    hud.$("#b3Fb").classList.toggle("on", S.fb > 0);
    /* コンボ */
    const c = B.combo;
    if (c.n >= 5 && c.t > 0) { if (hud.comboN.textContent !== String(c.n)) { hud.comboN.textContent = c.n; hud.combo.classList.remove("pop"); void hud.combo.offsetWidth; hud.combo.classList.add("pop"); } hud.combo.classList.add("on"); hud.combo.classList.toggle("hot", c.n >= 50); }
    else hud.combo.classList.remove("on");
    /* 味方の HP が低いと画面のふちが赤く */
    const lw = S.units.some((u) => !u.dead && u.hp < u.hpMax * 0.3);
    if (lw !== !!lowHp) { lowHp = lw ? 1 : 0; hud.$("#b3Low").classList.toggle("on", lw); }
  }
  function showMsg(html, cls, dur) { const m = hud.msg; m.className = "b3-msg " + (cls || ""); m.innerHTML = html; void m.offsetWidth; m.classList.add("on"); msgT = dur || 1.6; }
  function showCut(ev) { cutQ.push(ev); if (!cutting) nextCut(); }
  function nextCut() {
    const ev = cutQ.shift(); if (!ev) { cutting = false; return; }
    cutting = true;
    const Bu = ST().BURST[ev.stage] || ST().BURST[3];
    const side = ev.side === 1;
    hud.cut.className = "b3-cut" + (side ? " foe" : "");
    hud.cut.style.setProperty("--bc", Bu.c); hud.cut.style.setProperty("--cc", CCOL[ev.id] || "#fff");
    hud.cut.innerHTML = '<div class="b3-cband"><img class="b3-css" src="' + SSD + FILE[ev.id] + 'SS.webp" alt="" onerror="this.src=\'' + IMG + FILE[ev.id] + '.webp\'">' +
      '<div class="b3-ctxt"><small>BURST ' + Bu.nm + (side ? "・ENEMY" : "") + '</small><b>' + esc(ev.nm) + "</b><em>" + esc(ST().charNm(ev.id)) + "</em></div></div>";
    void hud.cut.offsetWidth; hud.cut.classList.add("on");
    AU.play("burst"); try { if (!side && MB3.BGM) MB3.BGM.duck(1.1); } catch (e) {}
    setTimeout(() => { hud.cut.classList.remove("on"); setTimeout(nextCut, 110); }, side ? 560 : 950);
  }

  /* ── 入力 ── */
  function saveSet(k, v) { try { MB3.Save && MB3.Save.setSetting(k, v); } catch (e) {} }
  function setAuto(v) { B.auto = !!v; saveSet("auto", B.auto); AU.play("click"); showMsg("<small>AUTO</small><b>" + (B.auto ? "ON" : "OFF") + "</b>", "auto", 0.7); }
  function setSpeed(v) { B.speed = v; saveSet("spd", v); AU.play("click"); }
  function bindInput() {
    const el = cv;
    let kd = null, ku = null, blur = null;
    const down = (e) => {
      if (paused || B.over) return;
      AU.init(); try { MB3.BGM && MB3.BGM.kick(); } catch (e2) {}
      if (!B.manual) return;                                   /* アリーナ：撃つのは自動 */
      if (B.auto) { if (autoHintT <= 0) { showMsg("<small>AUTO 中</small><b>手動は AUTO を OFF に</b>", "auto", 1.3); autoHintT = 4; } return; }
      const p = e.changedTouches ? e.changedTouches[0] : e;
      pointer.down = true; pointer.mouse = !e.changedTouches && e.pointerType !== "touch";
      pointer.lx = p.clientX; pointer.ly = p.clientY;
      if (pointer.mouse) { const r = cv.getBoundingClientRect(); aim.x = p.clientX - r.left; aim.y = p.clientY - r.top; }
      B.firing = true;
      e.preventDefault();
    };
    const move = (e) => {
      const p = e.changedTouches ? e.changedTouches[0] : e;
      const r = cv.getBoundingClientRect();
      if (pointer.mouse || (!e.changedTouches && e.pointerType === "mouse")) { aim.x = p.clientX - r.left; aim.y = p.clientY - r.top; }
      else if (pointer.down) { aim.x += (p.clientX - pointer.lx) * 1.35; aim.y += (p.clientY - pointer.ly) * 1.35; pointer.lx = p.clientX; pointer.ly = p.clientY; }
      aim.x = Math.max(8, Math.min(W - 8, aim.x)); aim.y = Math.max(geo.topH, Math.min(geo.gy0 - 10, aim.y));
      if (pointer.down) e.preventDefault();
    };
    const up = () => { pointer.down = false; if (B) B.firing = false; };
    el.addEventListener("pointerdown", down, { passive: false });
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up); window.addEventListener("pointercancel", up);
    R._unbind = () => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up);
      window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); window.removeEventListener("blur", blur); keys = {}; keyFire = false;
    };
    /* カード：バーストの番なら発動／それ以外は操作するキャラを変える（アリーナは全部自動なので何もしない） */
    const tapCard = (i) => {
      if (!B || B.over || B.mode === "arena") return;
      AU.init(); try { MB3.BGM && MB3.BGM.kick(); } catch (e2) {}
      const S = B.side[0], u = S.units[i];
      if (!u || u.dead) return;
      if (S.stage > 0 && ENG().burstCands(S).indexOf(u) >= 0) { ENG().tapBurst(B, i); return; }
      ENG().setCtl(B, i); AU.play("click");
    };
    hud.cards.addEventListener("click", (e) => { const c = e.target.closest(".b3-card"); if (c) tapCard(+c.dataset.i); });
    const cycle = (d) => {
      const U = B.side[0].units;
      for (let k = 1; k <= U.length; k++) { const j = (((B.ctl + d * k) % U.length) + U.length) % U.length; if (!U[j].dead) { ENG().setCtl(B, j); AU.play("click"); return; } }
    };
    kd = (e) => {
      if (!B || e.metaKey || e.ctrlKey || e.altKey) return;
      const c = e.code;
      if (c === "Escape" || c === "KeyP") { e.preventDefault(); if (!B.over) setPause(!paused); return; }
      if (paused) { if (c === "Enter" || c === "Space") { e.preventDefault(); setPause(false); } return; }
      if (B.over) return;
      if (c === "KeyX") { e.preventDefault(); setSpeed(B.speed === 2 ? 1 : 2); return; }
      if (c === "KeyM") { e.preventDefault(); AU.set(!AU.on); saveSet("sfx", AU.on); return; }
      if (B.mode === "arena") return;   /* アリーナは全部自動（一時停止・速さ・音だけ） */
      if (c === "KeyT") { e.preventDefault(); setAuto(!B.auto); return; }
      AU.init();
      const S = B.side[0];
      const dg = /^(Digit|Numpad)([1-5])$/.exec(c);
      if (dg) { e.preventDefault(); tapCard(+dg[2] - 1); return; }
      if (c === "KeyB" || c === "Enter") { e.preventDefault(); const cs = S.stage > 0 ? ENG().burstCands(S) : []; if (cs[0]) ENG().tapBurst(B, cs[0].i); return; }
      if (c === "Space" || c === "KeyJ") { e.preventDefault(); if (e.repeat || B.auto) return; keyFire = true; B.firing = true; return; }
      if (KEYAIM[c]) { e.preventDefault(); keys[c] = 1; return; }
      if (c === "KeyQ" || c === "KeyE") { e.preventDefault(); cycle(c === "KeyE" ? 1 : -1); return; }
    };
    ku = (e) => {
      const c = e.code;
      if (KEYAIM[c]) delete keys[c];
      if ((c === "Space" || c === "KeyJ") && keyFire) { keyFire = false; if (!pointer.down && B) B.firing = false; }
    };
    blur = () => { keys = {}; if (keyFire) { keyFire = false; if (B && !pointer.down) B.firing = false; } };
    window.addEventListener("keydown", kd); window.addEventListener("keyup", ku); window.addEventListener("blur", blur);
    hud.$("#b3Auto").onclick = () => setAuto(!B.auto);
    hud.$("#b3Spd").onclick = () => setSpeed(B.speed === 2 ? 1 : 2);
    hud.$("#b3Pause").onclick = () => setPause(true);
    hud.$("#b3Resume").onclick = () => setPause(false);
    hud.$("#b3Sound").onclick = () => { AU.set(!AU.on); paintPause(); saveSet("sfx", AU.on); };
    hud.$("#b3Bgm").onclick = () => { const v = !(MB3.BGM && MB3.BGM.on); try { MB3.BGM.set(v); } catch (e) {} saveSet("bgm", v); paintPause(); };
    hud.$("#b3Quit").onclick = () => { setPause(false); if (B && !B.over) { B.over = true; B.result = "retreat"; B.ev.push({ k: "end", r: "retreat" }); } };
  }
  function paintPause() { hud.$("#b3Sound").textContent = "効果音：" + (AU.on ? "ON" : "OFF"); hud.$("#b3Bgm").textContent = "BGM：" + (MB3.BGM && MB3.BGM.on ? "ON" : "OFF"); }
  function setPause(p) { paused = p; hud.$("#b3PMenu").hidden = !p; paintPause(); lastT = performance.now(); if (B) B.firing = false; }

  /* ══════════ 粒・光・輪（演出の部品）══════════ */
  function part(o) { if (P.length > 950) P.splice(0, P.length - 950); P.push(o); }
  function sparks(x, y, n, c, sp, w) {
    const col = typeof c === "string" ? c : "#ffe9a8";
    for (let i = 0; i < n; i++) { const a = R2() * Math.PI * 2, v = (sp || 180) * (0.35 + R2()); part({ k: "spark", x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, t: 0.18 + R2() * 0.24, d: 0.42, c: col, s: (w || 1.6) * (0.7 + R2() * 0.8), g: 380, add: 1 }); }
  }
  function ring(x, y, r0, r1, d, c, w) { rings.push({ x, y, r0, r1, t: 0, d, c, w }); if (rings.length > 70) rings.splice(0, rings.length - 70); }
  function smoke(x, y, n, sc) { for (let i = 0; i < n; i++) part({ k: "smoke", x: x + (R2() - 0.5) * 16 * sc, y: y - 4, vx: (R2() - 0.5) * 34, vy: -18 - R2() * 34, t: 0.8 + R2() * 0.6, d: 1.4, c: "rgba(60,64,82,.5)", s: (6 + R2() * 7) * sc, g: -20, grow: 1.7 }); }
  function petals(x, y, n, c, spread, kind) {
    for (let i = 0; i < n; i++) {
      const a = R2() * Math.PI * 2, v = (spread || 220) * (0.3 + R2());
      part({ k: "petal", x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, t: 1.0 + R2() * 0.9, d: 1.9, c: Array.isArray(c) ? c[i % c.length] : c, s: 4 + R2() * 4, rot: R2() * 6, vr: (R2() - 0.5) * 9, g: 70, drag: 1.6, sh: kind || "petal" });
    }
  }
  function debris(x, y, n, cols, sp, sc) {
    for (let i = 0; i < n; i++) { const a = -Math.PI * R2(), v = (sp || 260) * (0.3 + R2()); part({ k: "debris", x, y, vx: Math.cos(a) * v * (R2() < 0.5 ? -1 : 1), vy: Math.sin(a) * v, t: 0.6 + R2() * 0.6, d: 1.2, c: cols[i % cols.length], s: (3 + R2() * 5) * (sc || 1), rot: R2() * 6, vr: (R2() - 0.5) * 16, g: 620 }); }
  }
  function embers(x, y, n, c) { for (let i = 0; i < n; i++) part({ k: "glow", x: x + (R2() - 0.5) * 30, y: y - R2() * 10, vx: (R2() - 0.5) * 40, vy: -40 - R2() * 90, t: 0.6 + R2() * 0.7, d: 1.3, c: c || "#ffb04a", s: 3 + R2() * 4, g: -30, add: 1 }); }
  function emit(d, rate, fn) { emitters.push({ t: 0, d, rate, acc: 0, fn }); }
  function later(sec, fn) { delayed.push({ t: sec, fn }); }
  function pop(x, y, text, cls) { pops.push({ x, y, text, cls: cls || "", t: 0, d: 0.9 }); if (pops.length > 12) pops.shift(); }
  function bigBoom(x, y, s) {
    booms.push({ x, y, s, t: 0 });
    part({ k: "glow", x, y: y - 6 * s, vx: 0, vy: 0, t: 0.32, d: 0.32, c: "#ffd08a", s: 46 * s, g: 0, add: 1, fade: 1 });
    part({ k: "glow", x, y: y - 6 * s, vx: 0, vy: 0, t: 0.18, d: 0.18, c: "#ffffff", s: 26 * s, g: 0, add: 1, fade: 1 });
    for (let i = 0; i < 12 * s; i++) { const a = R2() * Math.PI * 2, v = 220 * s * (0.4 + R2()); part({ k: "spark", x, y: y - 6, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, t: 0.3 + R2() * 0.35, d: 0.6, c: R2() < 0.6 ? "#ffc066" : "#ff7a3c", s: 2 + R2() * 1.6, g: 420, add: 1 }); }
    smoke(x, y, Math.round(3 + 3 * s), Math.max(0.7, s * 0.8));
    ring(x, y - 4, 4, Math.max(26, 36 * s), 0.45, "rgba(255,190,110,.95)", 3.2);
    if (s >= 1.6) ring(x, y - 4, 8, 70 * s, 0.6, "rgba(255,240,200,.7)", 2);
    embers(x, y, Math.round(4 * s));
  }

  /* ── 出来事 → 演出 ── */
  function unitPos(u) {
    if (u.side === 1) return foePos(u.i);
    return { x: W / 2 + u.x * W * 0.47 * (geo.port ? 1 : 0.85), y: geo.gy0 + 6 };
  }
  function gunPos(u) { const p = unitPos(u); if (u.side === 1) return { x: p.x - 6, y: p.y - geo.slotW * 0.55 }; const sc = geo.slotW / 48 * 0.84, h = 60 * sc; return { x: p.x + (u.exposed ? geo.slotW * 0.22 : 0) + 8, y: p.y - h * (u.exposed ? 0.86 : 0.6) }; }
  function tgtPos(t) {
    if (!t) return { x: W / 2, y: H * 0.4 };
    if (t.side != null) { const p = t.side === 1 ? foePos(t.i) : unitPos(t); return { x: p.x, y: p.y - geo.slotW * 0.6 }; }
    if (t._r) return { x: t._r.x, y: t._r.y + t._r.h * 0.45 };
    const p = proj(t.x || 0, t.z || 0.5, t.y || 0); return { x: p.x, y: p.y - 20 };
  }
  function burstFx(ev) {
    const side = ev.side, S = B.side[side], u = S.units[ev.i]; if (!u) return;
    const up = side === 0 ? unitPos(u) : foePos(u.i);
    const sx = up.x, sy = up.y - geo.slotW * 0.7;
    const tp = tgtPos(ev.tgt), c = CCOL[ev.id] || "#fff", cr = rgb(c);
    const allT = side === 0 ? (B.mode === "arena" ? B.side[1].units.filter((x) => !x.dead).map((x) => tgtPos(x)) : B.enemies.filter((e) => !e.dead && e._r).map((e) => tgtPos(e))) : B.side[0].units.filter((x) => !x.dead).map((x) => { const p = unitPos(x); return { x: p.x, y: p.y - 40 }; });
    const sc = side === 0 ? 1 : 0.6;
    ring(sx, sy, 6, geo.slotW * 1.6 * sc, 0.55, c, 4);
    part({ k: "glow", x: sx, y: sy, vx: 0, vy: 0, t: 0.5, d: 0.5, c, s: 60 * sc, g: 0, add: 1, fade: 1 });
    switch (ev.fx) {
      case "mgOverdrive":   /* ハル：雨と波紋 */
        for (let k = 0; k < 3; k++) later(k * 0.12, () => ring(sx, sy, 10, W * 0.55, 0.7, "rgba(80,180,255,.8)", 3));
        emit(1.6 * sc, 70, () => part({ k: "drop", x: R2() * W, y: -10, vx: -60, vy: 900 + R2() * 300, t: 0.6, d: 0.6, c: "#9ad8ff", s: 1.4, g: 0, add: 1 }));
        tint = { c: "#3aa0ff", a: 0.22, t: 0.6, d: 0.6 }; break;
      case "coreSnipe":     /* チカ：月の光線 */
        beams.push({ x0: sx, y0: sy, x1: tp.x, y1: tp.y, w: 30 * sc, t: 0.6, d: 0.6, c: "#cfe6ff" });
        addFlare(tp.x, tp.y, 130 * sc, "#cfe6ff", 0.5, 0); later(0.02, () => { for (let k = 0; k < 3; k++) ring(tp.x, tp.y, 6, 90 + k * 40, 0.5 + k * 0.1, "rgba(220,240,255,.9)", 3); sparks(tp.x, tp.y, 30, "#e8f4ff", 360, 2.2); });
        flashT = Math.max(flashT, 0.18); flashC = "220,236,255"; if (side === 0) B.hitstop = Math.max(B.hitstop, 0.16); break;
      case "chargeOverdrive":   /* ヒサコ：桜と光線 */
        beams.push({ x0: sx, y0: sy, x1: tp.x, y1: tp.y, w: 20 * sc, t: 0.5, d: 0.5, c: "#ff9fd0" });
        petals(W / 2, H * 0.35, 46 * sc, ["#ffc1dc", "#ff8fc8", "#fff0f6"], W * 0.6); addFlare(tp.x, tp.y, 100 * sc, "#ff8fc8", 0.4); break;
      case "aoeVuln":   /* アリス：白百合の衝撃波（敵全体） */
        allT.forEach((p, k) => later(k * 0.05, () => { ring(p.x, p.y, 4, 70, 0.55, "rgba(240,244,255,.95)", 4); addFlare(p.x, p.y, 70, "#e8eeff", 0.35); sparks(p.x, p.y, 10, "#ffffff", 260); }));
        petals(W / 2, H * 0.3, 30 * sc, ["#ffffff", "#e8eeff", "#dfe6ff"], W * 0.55); flashT = Math.max(flashT, 0.15); flashC = "255,255,255"; break;
      case "arOverdrive":   /* コハク：紅薔薇の嵐 */
        emit(1.0, 40, () => { const a = R2() * Math.PI * 2, r = geo.slotW * (0.6 + R2() * 0.6); part({ k: "petal", x: sx + Math.cos(a) * r, y: sy + Math.sin(a) * r * 0.5, vx: -Math.sin(a) * 160, vy: Math.cos(a) * 80 - 40, t: 0.9, d: 0.9, c: R2() < 0.7 ? "#ff3b5c" : "#ffd36b", s: 4 + R2() * 4, rot: R2() * 6, vr: 8, g: 30, drag: 0.6, sh: "rose" }); });
        sparks(sx, sy, 24, "#ffd36b", 280); tint = { c: "#ff4d6d", a: 0.18, t: 0.5, d: 0.5 }; break;
      case "tauntShield":   /* スズ：ひまわりの六角の盾 */
        emit(1.4, 1, () => {}); hexWallT = 1.6; petals(W / 2, geo.gy0 - geo.slotW, 28 * sc, ["#ffd23a", "#ffb800", "#ffe98a"], W * 0.5); tint = { c: "#ffd23a", a: 0.16, t: 0.5, d: 0.5 }; break;
      case "teamDrHeal":    /* ショウコ：回復の雨 */
        emit(1.4, 50, () => part({ k: "drop", x: R2() * W, y: -10, vx: 0, vy: 700 + R2() * 200, t: 0.8, d: 0.8, c: "#7dffc4", s: 1.6, g: 0, add: 1 }));
        side === 0 && B.side[0].units.forEach((x) => { if (x.dead) return; const p = unitPos(x); for (let k = 0; k < 4; k++) later(k * 0.15, () => part({ k: "plus", x: p.x + (R2() - 0.5) * 30, y: p.y - 40, vx: 0, vy: -60, t: 0.9, d: 0.9, c: "#3df0a0", s: 9, g: 0 })); });
        tint = { c: "#4fe0a0", a: 0.16, t: 0.6, d: 0.6 }; break;
      case "sgOverdrive":   /* ユナ：黒薔薇の爆発 */
        later(0.05, () => { ring(tp.x, tp.y, 6, 120, 0.5, "rgba(190,110,255,.95)", 5); addFlare(tp.x, tp.y, 120, "#b06bff", 0.4); debris(tp.x, tp.y, 26, ["#2a1440", "#7a3ac8", "#b06bff", "#e0c8ff"], 380, 1.2); petals(tp.x, tp.y, 22, ["#3a1a50", "#7a3ac8", "#c08cff"], 300, "rose"); });
        flashT = Math.max(flashT, 0.12); flashC = "190,140,255"; if (side === 0) B.hitstop = Math.max(B.hitstop, 0.12); break;
      case "aoeBurn":   /* ヨシノ：火柱（敵全体） */
        allT.forEach((p, k) => later(k * 0.06, () => { emit(0.9, 26, () => part({ k: "glow", x: p.x + (R2() - 0.5) * 26, y: p.y + 10, vx: (R2() - 0.5) * 20, vy: -220 - R2() * 160, t: 0.5, d: 0.5, c: R2() < 0.5 ? "#ff7a3c" : "#ffcf5a", s: 7 + R2() * 7, g: 0, add: 1 })); addFlare(p.x, p.y, 80, "#ff9a3c", 0.4); ring(p.x, p.y, 4, 60, 0.5, "rgba(255,140,60,.9)", 3); }));
        petals(W / 2, H * 0.3, 24 * sc, ["#ffb7c5", "#ff8fa8"], W * 0.5); tint = { c: "#ff7a3c", a: 0.2, t: 0.6, d: 0.6 }; break;
      case "critDmgChg":    /* アイナ：月の雷と薔薇 */
        bolts.push({ x: tp.x, y: tp.y, t: 0.35, d: 0.35, c: "#ffb0ec", seg: bolt(tp.x, -10, tp.x, tp.y) });
        later(0.05, () => { addFlare(tp.x, tp.y, 100, "#ff7ad9", 0.4); ring(tp.x, tp.y, 6, 100, 0.5, "rgba(255,150,230,.9)", 4); sparks(tp.x, tp.y, 18, "#ffd0f2", 300); });
        petals(sx, sy, 24 * sc, ["#ff7ad9", "#ffc0ee", "#ffffff"], 260, "rose"); break;
      case "teamAtkReload":   /* イチカ：波と泡 */
        waveT = 0.8; emit(1.2, 36, () => part({ k: "bubble", x: R2() * W, y: geo.gy0 + 10, vx: (R2() - 0.5) * 20, vy: -120 - R2() * 120, t: 1.0, d: 1.0, c: "#9ff0ff", s: 3 + R2() * 6, g: -20 }));
        tint = { c: "#33d6ff", a: 0.18, t: 0.5, d: 0.5 }; break;
      case "cdrHeal":   /* ノノカ：白い花と回復 */
        petals(W / 2, H * 0.25, 40 * sc, ["#ffffff", "#fff4d6", "#ffe0ec"], W * 0.6, "flower");
        side === 0 && B.side[0].units.forEach((x) => { if (x.dead) return; const p = unitPos(x); for (let k = 0; k < 3; k++) later(k * 0.18, () => part({ k: "plus", x: p.x + (R2() - 0.5) * 30, y: p.y - 40, vx: 0, vy: -60, t: 0.9, d: 0.9, c: "#7dffc4", s: 9, g: 0 })); });
        break;
    }
  }
  let hexWallT = 0, waveT = 0, bolts = [];
  function bolt(x0, y0, x1, y1) { const pts = [[x0, y0]]; const n = 9; for (let i = 1; i < n; i++) { const f = i / n; pts.push([x0 + (x1 - x0) * f + (R2() - 0.5) * 50, y0 + (y1 - y0) * f]); } pts.push([x1, y1]); return pts; }

  function drainEvents() {
    const evs = B.ev; B.ev = [];
    const S0 = B.side[0];
    evs.forEach((ev) => {
      switch (ev.k) {
        case "shot": {
          const u = B.side[ev.side] && B.side[ev.side].units[ev.i]; if (!u) break;
          const gp = gunPos(u), fb = B.side[ev.side].fb > 0;
          const cc = fb ? "#ffe07a" : (CCOL[u.id] || "#ffe9a8");
          const tpt = ev.t ? (ev.ctl ? { x: aim.x + (R2() - 0.5) * 14, y: aim.y + (R2() - 0.5) * 14 } : tgtPos(ev.t)) : (ev.ctl ? { x: aim.x + (R2() - 0.5) * 40, y: aim.y + (R2() - 0.5) * 40 } : null);
          /* 銃口の閃光（星形）＋薬莢 */
          const mz = ev.charge ? 1.6 : ev.w === "SG" ? 1.3 : ev.w === "MG" ? 0.85 : ev.w === "SMG" ? 0.75 : 1;
          muzzles.push({ x: gp.x, y: gp.y, t: 0.07, d: 0.07, s: mz * (ev.side === 0 ? 1 : 0.7), c: cc });
          if (ev.side === 0 && (ev.w === "AR" || ev.w === "MG" || ev.w === "SMG") && R2() < 0.35) part({ k: "debris", x: gp.x - 6, y: gp.y + 2, vx: -60 - R2() * 60, vy: -120 - R2() * 60, t: 0.5, d: 0.5, c: "#ffd36b", s: 2.2, rot: 0, vr: 12, g: 700 });
          if (!tpt) break;
          if (ev.w === "SG") {   /* 扇の散弾 */
            for (let k = 0; k < Math.min(7, ev.pel || 6); k++) tracers.push({ x0: gp.x, y0: gp.y, x1: tpt.x + (R2() - 0.5) * 70, y1: tpt.y + (R2() - 0.5) * 50, t: 0.07, d: 0.07, c: cc, w: 1.3 });
            if (ev.t && ev.side === 0) sparks(tpt.x, tpt.y, 6, cc, 200);
          } else if (ev.w === "RL") {   /* 煙を引くロケット（着弾で爆発の光） */
            rockets.push({ x0: gp.x, y0: gp.y, x1: tpt.x, y1: tpt.y, t: 0, d: 0.16, c: cc, big: ev.charge });
          } else if (ev.w === "SR") {   /* 光線 */
            beams.push({ x0: gp.x, y0: gp.y, x1: tpt.x, y1: tpt.y, w: ev.charge ? 7 : 4, t: 0.22, d: 0.22, c: cc });
            if (ev.t) { hits.push({ x: tpt.x, y: tpt.y, t: 0.16, d: 0.16, s: 1.4, c: cc }); sparks(tpt.x, tpt.y, 10, cc, 260, 2); }
          } else {
            tracers.push({ x0: gp.x, y0: gp.y, x1: tpt.x, y1: tpt.y, t: ev.w === "MG" ? 0.05 : 0.06, d: 0.06, c: cc, w: ev.w === "SMG" ? 1.1 : ev.w === "MG" ? 1.6 : 1.8, head: ev.ctl });
            if (ev.t && (ev.ctl || R2() < 0.18)) hits.push({ x: tpt.x, y: tpt.y, t: 0.08, d: 0.08, s: ev.ctl ? 0.8 : 0.5, c: cc });
          }
          if (ev.side === 0 && (ev.ctl || ev.w === "SR" || ev.w === "RL" || ev.w === "SG" || R2() < 0.35)) AU.play(ev.w, ev.ctl ? 1 : 0.45);
          else if (ev.side === 1 && R2() < 0.3) AU.play(ev.w, 0.3);
          if (ev.ctl && (ev.charge || ev.w === "SG")) shake = Math.max(shake, ev.charge ? 4 : 3);
          break;
        }
        case "dmg": {
          const p = ev.e && ev.e._r ? { x: ev.e._r.x, y: ev.e._r.y + ev.e._r.h * 0.4 } : proj(ev.x, ev.z, ev.y);
          const big = ev.crit || ev.core || ev.skill;
          /* AI の会心・弱点は間引く（数字が積み重なって読めないので）。操作中・スキルは全部出す */
          if (ev.ctl || ev.skill || ev.dot || (ev.core && R2() < 0.45) || (ev.crit && R2() < 0.3) || (ev.v > 0 && R2() < 0.12)) pushNum(p.x, p.y, { v: ev.v, crit: ev.crit, core: ev.core, dot: ev.dot, skill: ev.skill, fb: ev.fb });
          if (ev.ctl || ev.crit || ev.core) sparks(p.x, p.y - 4, ev.core ? 10 : ev.crit ? 7 : 3, ev.core ? "#ff7a9a" : ev.crit ? "#ffd36b" : "#fff2c0", ev.core ? 230 : 170);
          if (ev.core) { ring(p.x, p.y - 4, 3, 32, 0.32, "rgba(255,90,140,.95)", 2.6); addFlare(p.x, p.y - 4, 40, "#ff6aa0", 0.2); }
          else if (ev.crit && (ev.ctl || ev.skill)) { addFlare(p.x, p.y - 4, 32, "#ffd36b", 0.18); ring(p.x, p.y - 4, 3, 20, 0.26, "rgba(255,220,120,.9)", 2.2); }
          if (ev.core) AU.play("core", 0.6); else if (ev.crit && ev.ctl) AU.play("crit", 0.6); else if (ev.ctl) AU.play("hit", 0.5);
          break;
        }
        case "dmgU": {   /* アリーナ：キャラに当たった */
          const p = ev.side === 1 ? foePos(ev.i) : unitPos(B.side[0].units[ev.i]);
          if (ev.skill || (ev.crit && R2() < 0.35) || R2() < 0.15) pushNum(p.x + (R2() - 0.5) * 20, p.y - geo.slotW * 0.9, { v: ev.v, crit: ev.crit, skill: ev.skill, fb: ev.fb, foe: ev.side === 0 });
          if (ev.side === 1) sparks(p.x, p.y - geo.slotW * 0.6, ev.crit ? 8 : 3, ev.crit ? "#ffd36b" : "#fff2c0", 180);
          break;
        }
        case "boom": {
          const p = proj(ev.x, ev.z, ev.y), s = (ev.s || 1) * Math.max(0.5, p.s * 1.6);
          bigBoom(p.x, p.y, s);
          if ((ev.s || 1) >= 2.4) { flashT = Math.max(flashT, 0.3); flashC = "255,240,220"; shake = Math.max(shake, 14); }
          shake = Math.max(shake, 3 * (ev.s || 1)); AU.play("boom", Math.min(1, 0.35 + (ev.s || 1) * 0.25)); break;
        }
        case "kill": {
          const e = ev.e, r = e && e._r;
          const p = r ? { x: r.x, y: r.y + r.h * 0.5 } : proj(ev.x, ev.z, ev.y);
          const cols = (SPR().ENEMY_COLS && SPR().ENEMY_COLS[ev.kind]) || ["#5b6378", "#8790a8", "#3c4357"];
          const sc = r ? Math.max(0.6, Math.min(2.4, r.w / 40)) : 1;
          debris(p.x, p.y, Math.round((ev.boss ? 40 : ev.elite ? 26 : 14) * Math.min(1.4, sc)), cols.concat(["#ff2f4f"]), 300 * sc, sc);
          sparks(p.x, p.y, ev.boss ? 40 : 14, "#ffd08a", 320 * sc, 2);
          addFlare(p.x, p.y, 80 * sc * (ev.boss ? 2.4 : ev.elite ? 1.5 : 1), "#ffe2a8", ev.boss ? 0.6 : 0.3);
          if (ev.streak >= 2) { pop(p.x, p.y - 40 * sc, "KILL ×" + ev.streak, ev.streak >= 5 ? "streak hot" : "streak"); if (ev.streak === 3 || ev.streak === 5 || ev.streak === 8) AU.play("combo"); }
          if (ev.boss) {   /* ボス：連鎖する爆発 → 大きな光 */
            const bw = r ? r.w : 200, bh = r ? r.h : 200;
            for (let k = 0; k < 8; k++) later(0.12 + k * 0.16, () => { const qx = p.x + (R2() - 0.5) * bw * 0.8, qy = p.y + (R2() - 0.5) * bh * 0.6; bigBoom(qx, qy, 1.6 + R2()); shake = Math.max(shake, 10); AU.play("boom", 0.8); });
            later(1.5, () => { flashT = 0.5; flashC = "255,250,235"; ring(p.x, p.y, 10, Math.max(W, H), 0.9, "rgba(255,230,180,.9)", 6); shake = 18; });
          }
          AU.play("kill", 0.7);
          break;
        }
        case "cut": {
          showCut(ev);
          const Bu = ST().BURST[ev.stage] || ST().BURST[3];
          if (ev.side === 0) { tint = { c: Bu.c, a: 0.3, t: 0.45, d: 0.45 }; speedT = 0.55; shake = Math.max(shake, 6); }
          else { tint = { c: "#ff3b5a", a: 0.12, t: 0.3, d: 0.3 }; }
          break;
        }
        case "burstFx": burstFx(ev); break;
        case "fb":
          if (ev.side === 0) {
            showMsg("<small>ALL SQUAD</small><b>FULL BURST</b>", "fb", 1.6); AU.play("fb"); flashT = 0.2; flashC = "255,230,250";
            fbIntro = 1.1; tint = { c: "#ff5ad0", a: 0.24, t: 0.7, d: 0.7 }; speedT = 0.8; shake = Math.max(shake, 10);
            ring(W / 2, H * 0.45, 20, Math.max(W, H) * 0.8, 0.7, "rgba(255,150,230,.9)", 6);
            for (let k = 0; k < 3; k++) later(0.1 + k * 0.12, () => ring(W / 2, H * 0.45, 20, Math.max(W, H) * (0.5 + k * 0.2), 0.6, ["rgba(94,242,255,.8)", "rgba(255,211,107,.8)", "rgba(176,107,255,.8)"][k], 4));
            emit(ENG().FB_TIME, 14, () => part({ k: "streak", x: R2() * W, y: H + 10, vx: 0, vy: -900 - R2() * 500, t: 0.6, d: 0.6, c: ["#ff7ad9", "#5ef2ff", "#ffd36b", "#b06bff"][Math.floor(R2() * 4)], s: 1.5 + R2() * 2, g: 0, add: 1 }));
          } else showMsg("<small>ENEMY</small><b>FULL BURST</b>", "warn sm", 1.1);
          break;
        case "fbEnd": if (ev.side === 0 && ev.dmg > 0) showMsg("<small>FULL BURST 合計</small><b>" + short(ev.dmg) + "</b>", "fbsum", 1.5); break;
        case "burstReady": if (ev.side === 0) { AU.play("ready"); hud.root.classList.remove("rdy"); void hud.root.offsetWidth; hud.root.classList.add("rdy"); } break;
        case "wave":
          showMsg(ev.boss ? "<small>WARNING</small><b>BOSS</b>" : "<small>WAVE</small><b>" + ev.n + " / " + ev.of + "</b>", ev.boss ? "warn" : "", ev.boss ? 2.2 : 1.3);
          if (ev.boss) { AU.play("warn"); try { MB3.BGM && MB3.BGM.play(B.mode === "boss" ? "icpt" : "boss"); } catch (e) {} } else AU.play("wave");
          hud.$("#b3Wave").textContent = "WAVE " + ev.n + "/" + ev.of; break;
        case "waveClear":
          showMsg("<small>WAVE " + ev.n + "</small><b>CLEAR!</b>", "clear", 1.1);
          for (let k = 0; k < 4; k++) later(k * 0.08, () => sparks(W * (0.2 + R2() * 0.6), H * (0.25 + R2() * 0.25), 16, ["#ffd36b", "#5ef2ff", "#ff7ad9", "#7dffc4"][k], 300, 2));
          break;
        case "combo": AU.play("combo"); break;
        case "comboEnd": break;
        case "tele": break;
        case "laser": { const u = ev.u; if (u) { const gp = unitPos(u); const p = ev.e._r; if (p) beams.push({ x0: p.x, y0: p.y + p.h * 0.3, x1: gp.x, y1: gp.y - 20, w: 5, t: 0.22, d: 0.22, c: "#ff3b5a" }); hits.push({ x: gp.x, y: gp.y - 30, t: 0.2, d: 0.2, s: 1.6, c: "#ff3b5a" }); } AU.play("SR", 0.5); break; }
        case "sweepTele": showMsg("<small>CAUTION</small><b>隠れて！</b>", "warn", 1.6); AU.play("warn"); break;
        case "sweep": flashT = 0.25; flashC = "255,90,110"; shake = 10; AU.play("boom", 0.8); break;
        case "charge": showMsg("<small>BREAK CHANCE</small><b>攻撃を集中！</b>", "warn", 1.8); break;
        case "break": showMsg(ev.ok ? "<b>BREAK!</b>" : "<small>被弾</small><b>大技を受けた</b>", ev.ok ? "brk" : "warn", 1.4); if (ev.ok) { AU.play("break"); const r = ev.e._r; if (r) { for (let k = 0; k < 4; k++) ring(r.x, r.y + r.h * 0.45, 10, r.w * (0.6 + k * 0.25), 0.5, "rgba(255,220,120,.9)", 4); debris(r.x, r.y + r.h * 0.4, 24, ["#9ff0ff", "#ffffff", "#ffd36b"], 360); } } break;
        case "partBreak": { showMsg("<small>PART DESTROYED</small><b>" + esc(ev.p.nm) + "</b>", "", 1.2); const r = ev.e && ev.e._r; if (r) { const cx = r.x + (ev.p.x - 0.5) * r.w, cy = r.y + ev.p.y * r.h; sparks(cx, cy, 22, "#9ff0ff", 300, 2); ring(cx, cy, 6, r.w * 0.5, 0.45, "rgba(140,230,255,.95)", 3.5); addFlare(cx, cy, 90, "#9ff0ff", 0.35); debris(cx, cy, 16, ["#5b6378", "#8790a8", "#b8c0d4"], 320); shake = Math.max(shake, 8); } break; }
        case "shieldBreak": { const r = ev.e && ev.e._r; if (r) { ring(r.x, r.y + r.h * 0.6, r.w * 0.3, r.w * 0.95, 0.4, "rgba(120,220,255,.9)", 3); sparks(r.x, r.y + r.h * 0.6, 14, "#9ff0ff", 240); debris(r.x, r.y + r.h * 0.6, 10, ["#9ff0ff", "#e6f8ff"], 260, 0.8); } AU.play("break", 0.5); break; }
        case "shieldUp": showMsg("<small>BOSS</small><b>シールド展開</b>", "warn", 1.4); AU.play("shield"); break;
        case "shieldDown": if (ev.broke) { showMsg("<small>SHIELD</small><b>BREAK!</b>", "brk", 1.4); AU.play("break"); const r = ev.e._r; if (r) { debris(r.x, r.y + r.h * 0.5, 34, ["#9ff0ff", "#cfefff", "#ffffff"], 420, 1.1); ring(r.x, r.y + r.h * 0.5, r.w * 0.4, r.w * 1.4, 0.6, "rgba(160,230,255,.95)", 5); } } break;
        case "enrage": showMsg("<small>WARNING</small><b>激昂</b>", "warn", 1.6); AU.play("enrage"); shake = Math.max(shake, 12); tint = { c: "#ff2040", a: 0.25, t: 0.6, d: 0.6 }; break;
        case "bossMove": { const mv = MB3.D.BOSS_MOVES[ev.move]; if (mv && (ev.move === "rain" || ev.move === "beam" || ev.move === "quake")) showMsg("<small>" + esc(mv.nm) + "</small><b>" + (ev.move === "rain" ? "赤い円から離れて！" : "隠れて！") + "</b>", "warn", 1.4); if (ev.move === "rain" || ev.move === "beam" || ev.move === "quake") AU.play("warn"); break; }
        case "beamTele": AU.play("beam"); break;
        case "beamHit": { const u = B.side[0].units[ev.i]; if (u) { const p = unitPos(u); sparks(p.x, p.y - 40, 16, "#ff7a9a", 280); } break; }
        case "quakeTele": break;
        case "quake": flashT = 0.2; flashC = "255,120,90"; shake = 16; AU.play("quake"); for (let k = 0; k < 10; k++) debris(W * R2(), geo.gy0 + 10, 3, ["#6e6046", "#8a7a5a", "#3c4357"], 260); break;
        case "rainTele": break;
        case "markHit": { const u = B.side[0].units[ev.i]; const p = u ? unitPos(u) : { x: W / 2, y: geo.gy0 }; bigBoom(p.x, p.y - 10, 1.3); shake = Math.max(shake, 6); AU.play("boom", 0.6); break; }
        case "dashTele": AU.play("warn"); break;
        case "dash": { const r = ev.e._r; if (r) for (let k = 0; k < 8; k++) part({ k: "streak", x: r.x + (R2() - 0.5) * r.w, y: r.y + R2() * r.h, vx: 0, vy: 600, t: 0.25, d: 0.25, c: "#ff6a7a", s: 2, g: 0, add: 1 }); break; }
        case "dashHit": { const u = ev.u; if (u) { const p = unitPos(u); hits.push({ x: p.x, y: p.y - 40, t: 0.25, d: 0.25, s: 2.2, c: "#ff5a6a" }); sparks(p.x, p.y - 40, 20, "#ffb0b8", 320); ring(p.x, p.y - 40, 6, 60, 0.35, "rgba(255,90,110,.9)", 3); shake = Math.max(shake, 8); AU.play("boom", 0.5); } break; }
        case "empTele": AU.play("emp", 0.5); break;
        case "emp": { const r = ev.e && ev.e._r; ring(r ? r.x : W / 2, r ? r.y + r.h * 0.5 : H * 0.4, 10, Math.max(W, H) * 0.8, 0.8, "rgba(90,200,255,.9)", 5); tint = { c: "#3aa0ff", a: 0.2, t: 0.5, d: 0.5 }; showMsg("<small>EMP</small><b>ゲージ減少</b>", "emp", 1.2); AU.play("emp"); hud.root.classList.remove("jam"); void hud.root.offsetWidth; hud.root.classList.add("jam"); break; }
        case "eheal": { const a = ev.e && ev.e._r, b2 = ev.t && ev.t._r; if (a && b2) { beams.push({ x0: a.x, y0: a.y + a.h * 0.5, x1: b2.x, y1: b2.y + b2.h * 0.5, w: 3, t: 0.4, d: 0.4, c: "#5dffa8" }); for (let k = 0; k < 5; k++) part({ k: "plus", x: b2.x + (R2() - 0.5) * 20, y: b2.y + b2.h * 0.4, vx: 0, vy: -40, t: 0.8, d: 0.8, c: "#5dffa8", s: 7, g: 0 }); } break; }
        case "salvoTele": break;
        case "split": AU.play("kill", 0.4); break;
        case "shotDown": { const p = proj(ev.x || 0, ev.z || 0.3, ev.y || 0); pop(p.x, p.y - 20, "SHOT DOWN", "sd"); break; }
        case "down": AU.play("down"); break;
        case "heal": {
          if (R2() < 0.4) AU.play("heal");
          const u = ev.side === 0 ? B.side[0].units[ev.i] : null;
          if (u && ev.v >= 1 && R2() < 0.6) { const up = unitPos(u); pushNum(up.x, up.y - geo.slotW * 1.1, { v: ev.v, heal: true }); part({ k: "plus", x: up.x, y: up.y - 30, vx: 0, vy: -50, t: 0.7, d: 0.7, c: "#5dffa8", s: 8, g: 0 }); }
          break;
        }
        case "uhit": if (ev.side === 0 && ev.big) { const u = B.side[0].units[ev.i]; if (u) { const p = unitPos(u); hits.push({ x: p.x, y: p.y - 40, t: 0.16, d: 0.16, s: 1.4, c: "#ff5a6a" }); } shake = Math.max(shake, 4); } break;
        case "coverHit": if (ev.side === 0 && R2() < 0.25) { const u = B.side[0].units[ev.i]; if (u) { const p = unitPos(u); sparks(p.x + (R2() - 0.5) * geo.slotW * 0.6, p.y - geo.slotW * 0.35, 3, "#c8d2e6", 150); AU.play("coverHit", 0.4); } } break;
        case "coverBreak": { const u = B.side[ev.side] && B.side[ev.side].units[ev.i]; if (u && ev.side === 0) { const p = unitPos(u); debris(p.x, p.y - geo.slotW * 0.3, 18, ["#8790a8", "#5b6378", "#6e6046"], 300); smoke(p.x, p.y - 10, 4, 1); } break; }
        case "reload": if (ev.side === 0 && ev.i === B.ctl) AU.play("reload"); break;
        case "eshot": AU.play("eshot", 0.5); if (ev.e && ev.e._r) { const r = ev.e._r; hits.push({ x: r.x, y: r.y + r.h * 0.4, t: 0.07, d: 0.07, s: 0.6, c: ev.mortar ? "#ff9a3c" : "#ffb070" }); } break;
        case "end": endBattle(ev.r); break;
      }
    });
  }
  let muzzles = [], hits = [];
  /* ダメージの数字：近くの新しい数字があれば上に積む（重なって読めないのを防ぐ） */
  function pushNum(x, y, o) {
    let k = 0; for (const n of nums) if (n.age < 0.32 && Math.abs(n.x0 - x) < 34 && Math.abs(n.y0 - y) < 20) k++;
    nums.push(Object.assign({ x: x + (R2() - 0.5) * 16, y: y - Math.min(4, k) * 17, x0: x, y0: y, t: o.heal ? 0.95 : o.skill ? 1.15 : 0.85, age: 0 }, o));
    if (nums.length > 70) nums.splice(0, nums.length - 70);
  }

  /* ── 描く ── */
  function drawBg(tt) {
    if (!bgC || bgKey !== B._bg + W + "x" + H) {
      const lw = 220, lh = Math.round(220 * H / W);
      bgC = SPR().bg(B._bg || "ruins", lw, lh, geo.hz / H);
      bgKey = B._bg + W + "x" + H;
    }
    g.imageSmoothingEnabled = false;
    g.drawImage(bgC, 0, 0, W, H);
  }
  /* 地面の予兆（赤い円）・地ひびき・レーザー */
  function drawTele(tt) {
    const us = B.side[0].units;
    B.marks.forEach((m) => {
      if (m.k === "emp") return;
      const u = us[m.i]; if (!u) return;
      const p = unitPos(u), rw = geo.slotW * 0.62, rh = rw * 0.32, f = 1 - Math.max(0, m.t) / m.tt;
      const pu = 0.5 + 0.5 * Math.sin(tt * 18);
      g.save();
      g.fillStyle = "rgba(255,40,70," + (0.18 + 0.2 * f) + ")"; g.beginPath(); g.ellipse(p.x, p.y - 4, rw * 1.35, rh * 1.35, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = "rgba(255,60,90," + (0.55 + 0.4 * pu) + ")"; g.lineWidth = 3; g.beginPath(); g.ellipse(p.x, p.y - 4, rw * 1.35, rh * 1.35, 0, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = "rgba(255,230,120,.95)"; g.lineWidth = 4; g.beginPath(); g.ellipse(p.x, p.y - 4, rw * 1.35 * (1 - f), rh * 1.35 * (1 - f), 0, 0, Math.PI * 2); g.stroke();
      /* 落ちてくる弾 */
      if (m.t < 0.45) { const fy = p.y - 4 - (m.t / 0.45) * H * 0.6; g.globalCompositeOperation = "lighter"; glow(p.x, fy, 14, m.k === "rain" ? "#ff5a3c" : "#ff9a3c", 1); g.globalCompositeOperation = "source-over"; }
      g.restore();
    });
    if (B.quake) {
      const f = 1 - B.quake.t / B.quake.tt, a = 0.18 + 0.22 * (0.5 + 0.5 * Math.sin(tt * 22));
      const gr = g.createLinearGradient(0, geo.gy0 - geo.slotW * 1.4, 0, H);
      gr.addColorStop(0, "rgba(255,40,70,0)"); gr.addColorStop(0.5, "rgba(255,40,70," + a + ")"); gr.addColorStop(1, "rgba(255,40,70," + (a * 0.6) + ")");
      g.fillStyle = gr; g.fillRect(0, geo.gy0 - geo.slotW * 1.4, W, H);
      g.strokeStyle = "rgba(255,200,180," + (0.4 + f * 0.5) + ")"; g.lineWidth = 2; g.beginPath();
      for (let k = 0; k < 6; k++) { let x = W * (k + 0.5) / 6, y = geo.gy0 + 20; g.moveTo(x, y); for (let j = 0; j < 5; j++) { x += (Math.sin(k * 7 + j * 3) * 18); y -= geo.slotW * 0.18 * f; g.lineTo(x, y); } }
      g.stroke();
    }
    if (B.beam) {
      const bm = B.beam, top = geo.hz - 20, bot = geo.gy0 + 20;
      const xs = (x) => W / 2 + x * W * 0.47 * (geo.port ? 1 : 0.85);
      if (bm.t < bm.tele) {   /* 予兆：左はしに点滅する線と矢印 */
        const a = 0.4 + 0.4 * Math.sin(tt * 20), x = xs(-1.0);
        g.strokeStyle = "rgba(255,50,80," + a + ")"; g.lineWidth = 2; g.setLineDash([8, 6]); g.beginPath(); g.moveTo(x, top); g.lineTo(x, bot); g.stroke(); g.setLineDash([]);
        g.fillStyle = "rgba(255,80,100," + a + ")"; g.beginPath(); g.moveTo(x + 10, (top + bot) / 2 - 12); g.lineTo(x + 34, (top + bot) / 2); g.lineTo(x + 10, (top + bot) / 2 + 12); g.fill();
      } else {
        const x = xs(bm.x);
        g.globalCompositeOperation = "lighter";
        const gr = g.createLinearGradient(x - 26, 0, x + 26, 0); gr.addColorStop(0, "rgba(255,40,70,0)"); gr.addColorStop(0.5, "rgba(255,120,140,.85)"); gr.addColorStop(1, "rgba(255,40,70,0)");
        g.fillStyle = gr; g.fillRect(x - 26, top, 52, bot - top);
        g.fillStyle = "rgba(255,255,255,.9)"; g.fillRect(x - 2.5, top, 5, bot - top);
        glow(x, bot - 10, 40, "#ff5a7a", 0.9);
        g.globalCompositeOperation = "source-over";
        if (R2() < 0.8) part({ k: "spark", x, y: bot - 10, vx: (R2() - 0.5) * 300, vy: -200 * R2(), t: 0.3, d: 0.3, c: "#ffb0c0", s: 1.6, g: 500, add: 1 });
      }
    }
  }
  function drawEnemy(e, tt) {
    const p = proj(e.x, e.z, e.y);
    let sp, k = geo.k * p.s * (e.size || 1);
    if (e.isBoss) { sp = SPR().boss(e.boss); k = geo.k * p.s * 0.55 * (e.size || 3); }
    else sp = SPR().enemy(e.k);
    const w = sp.w * k, h = sp.h * k;
    const fr = sp.f[Math.floor((tt * 6 + e.t) % 2)];
    let x = p.x - w / 2, y = p.y - h;
    if (e.dash && e.dash.ph === 0) { x += (R2() - 0.5) * 4; }
    if (e.stun > 0 && e.isBoss) x += Math.sin(tt * 40) * 2;
    e._r = { x: p.x, y, w, h, cx: e.core ? x + e.core[0] * w : 0, cy: e.core ? y + e.core[1] * h : 0, cr: e.core ? e.core[2] * w : 0 };
    /* 影 */
    g.fillStyle = "rgba(0,0,0,.28)"; g.beginPath(); g.ellipse(p.x, proj(e.x, e.z, 0).y, w * 0.38, Math.max(2, h * 0.06), 0, 0, Math.PI * 2); g.fill();
    /* 激昂・突進の構え・EMP の光（うしろに） */
    if (e.isBoss && e.enraged && !e.dead) { g.globalCompositeOperation = "lighter"; glow(p.x, y + h * 0.5, w * 0.62, "#ff2040", 0.35 + 0.15 * Math.sin(tt * 6)); g.globalCompositeOperation = "source-over"; }
    if (e.dash && e.dash.ph === 0) { g.globalCompositeOperation = "lighter"; glow(p.x, y + h * 0.5, w * 0.9, "#ff3050", 0.5 + 0.4 * Math.sin(tt * 30)); g.globalCompositeOperation = "source-over"; }
    if (e.emp) { const f = (tt * 1.6) % 1; g.strokeStyle = "rgba(90,200,255," + (1 - f) + ")"; g.lineWidth = 3; g.beginPath(); g.arc(p.x, y + h * 0.5, w * (0.4 + f * 0.9), 0, Math.PI * 2); g.stroke(); }
    if (e.dead) { g.globalAlpha = Math.max(0, e.dieT / (e.isBoss ? 1.8 : 0.5)); }
    g.drawImage(fr, x, y, w, h);
    if (e.hitT > 0 && !e.dead) { g.globalAlpha = Math.min(1, e.hitT / 0.06) * 0.85; g.drawImage(sp.hit, x, y, w, h); }
    if (e.burn && e.burn.length && !e.dead && R2() < 0.4) part({ k: "glow", x: p.x + (R2() - 0.5) * w * 0.6, y: y + h * (0.3 + R2() * 0.6), vx: 0, vy: -60, t: 0.4, d: 0.4, c: "#ff7a3c", s: 4 + R2() * 4, g: 0, add: 1 });
    g.globalAlpha = 1;
    if (e.dead) return;
    /* 盾（シールダー） */
    if (e.sh > 0) { g.strokeStyle = "rgba(120,220,255,.65)"; g.lineWidth = 2; g.beginPath(); g.ellipse(p.x, y + h * 0.62, w * 0.52, h * 0.36, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); }
    /* ボスのシールド（六角の膜） */
    if (e.isBoss && e.shieldHp > 0) {
      g.save(); g.globalCompositeOperation = "lighter"; g.strokeStyle = "rgba(120,220,255," + (0.45 + 0.2 * Math.sin(tt * 4)) + ")"; g.lineWidth = 1.5;
      const cx = p.x, cy = y + h * 0.5, rr = Math.max(w, h) * 0.58;
      g.beginPath(); g.ellipse(cx, cy, rr, rr * 0.86, 0, 0, Math.PI * 2); g.stroke();
      for (let a = 0; a < 6; a++) { const an = a / 6 * Math.PI * 2 + tt * 0.3; hexAt(cx + Math.cos(an) * rr * 0.55, cy + Math.sin(an) * rr * 0.45, rr * 0.2); }
      g.fillStyle = "rgba(120,220,255,.08)"; g.beginPath(); g.ellipse(cx, cy, rr, rr * 0.86, 0, 0, Math.PI * 2); g.fill();
      g.restore();
    }
    /* 壊れた部位 */
    if (e.isBoss) e.parts.forEach((pa) => { if (!pa.dead) return; const cx = x + pa.x * w, cy = y + pa.y * h; g.fillStyle = "rgba(20,10,20,.55)"; g.beginPath(); g.arc(cx, cy, pa.r * w * 0.8, 0, Math.PI * 2); g.fill(); if (R2() < 0.2) part({ k: "smoke", x: cx, y: cy, vx: (R2() - 0.5) * 30, vy: -40 - R2() * 30, t: 0.8, d: 0.8, c: "rgba(60,60,70,.7)", s: 4, g: -10, grow: 1.4 }); });
    /* コアの光 */
    if (e.core && (e.isBoss || e.elite || B.firing)) { const pu = 0.5 + 0.5 * Math.sin(tt * 8 + e.t); g.strokeStyle = "rgba(255,60,90," + (0.35 + 0.4 * pu) + ")"; g.lineWidth = 1.5; g.beginPath(); g.arc(e._r.cx, e._r.cy, e._r.cr * 1.25, 0, Math.PI * 2); g.stroke(); }
    /* HP（強敵・ボス以外は減ったときだけ） */
    if (!e.isBoss && (e.elite || e.hp < e.hpMax)) {
      const bw = Math.max(18, w * 0.7), bx = p.x - bw / 2, by = y - 7;
      g.fillStyle = "rgba(10,12,24,.75)"; g.fillRect(bx - 1, by - 1, bw + 2, 5);
      g.fillStyle = e.elite ? "#ff9a3c" : "#ff4d6d"; g.fillRect(bx, by, bw * Math.max(0, e.hp / e.hpMax), 3);
      if (e.shMax) { g.fillStyle = "#7fe6ff"; g.fillRect(bx, by - 3, bw * Math.max(0, e.sh / e.shMax), 2); }
    }
    /* 狙撃の予兆・突進の矢印 */
    if (e.tele) { const u = e.tele.u; if (u && !u.dead) { const up = unitPos(u); const blink = Math.floor(tt * 14) % 2; g.strokeStyle = blink ? "rgba(255,40,70,.95)" : "rgba(255,40,70,.4)"; g.lineWidth = 2; g.setLineDash([6, 4]); g.beginPath(); g.moveTo(p.x, y + h * 0.3); g.lineTo(up.x, up.y - 40); g.stroke(); g.setLineDash([]); } }
    if (e.dash && e.dash.ph === 0 && e.dash.u && !e.dash.u.dead) { const up = unitPos(e.dash.u); g.strokeStyle = "rgba(255,70,90,.85)"; g.lineWidth = 3; g.beginPath(); g.moveTo(p.x, y + h); g.lineTo(up.x, up.y - 30); g.stroke(); g.fillStyle = "rgba(255,70,90,.9)"; g.beginPath(); g.arc(up.x, up.y - 30, 6, 0, Math.PI * 2); g.fill(); }
  }
  function hexAt(x, y, r) { g.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + Math.PI / 6; const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; if (i) g.lineTo(px, py); else g.moveTo(px, py); } g.closePath(); g.stroke(); }
  function drawProj(tt) {
    B.proj.forEach((pr) => {
      if (pr.k === "missile") {
        const p = proj(pr.x, Math.max(0, pr.z), pr.y);
        const sp = SPR().missile(), k = geo.k * 0.7 * (0.4 + 0.6 * p.n + 0.4);
        const w = sp.width * k, h = sp.height * k;
        pr._r = { x: p.x, y: p.y, r: Math.max(16, w * 1.4) };
        g.globalCompositeOperation = "lighter"; glow(p.x, p.y - h * 0.4, w * 1.2, "#ff6a3c", 0.7); g.globalCompositeOperation = "source-over";
        g.save(); g.translate(p.x, p.y); g.rotate(Math.PI); g.drawImage(sp, -w / 2, -h / 2, w, h); g.restore();
        if (R2() < 0.7) part({ k: "smoke", x: p.x, y: p.y - h * 0.5, vx: (R2() - 0.5) * 20, vy: -20, t: 0.5, d: 0.5, c: "rgba(200,200,210,.5)", s: 3 + R2() * 3, g: -10, grow: 1.2 });
        g.strokeStyle = "rgba(255,80,100,.85)"; g.lineWidth = 2; g.beginPath(); g.arc(p.x, p.y, pr._r.r * 0.75, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (pr.hp / pr.hpMax)); g.stroke();
      } else {
        const f = 1 - pr.t / pr.tt;
        const from = proj(pr.x0, pr.z0, pr.y0), to = unitPos(pr.u);
        const x = from.x + (to.x - from.x) * f, y = from.y + (to.y - 40 - from.y) * f;
        const r = (pr.shell ? 4 : 2.2) + f * (pr.shell ? 7 : 3.5);
        g.globalCompositeOperation = "lighter";
        glow(x, y, r * 3.2, pr.shell ? "#ff8a3c" : "#ffb070", 0.8);
        g.fillStyle = "rgba(255,240,220,.95)"; g.beginPath(); g.arc(x, y, r * 0.6, 0, Math.PI * 2); g.fill();
        g.globalCompositeOperation = "source-over";
      }
    });
  }
  function drawSquad(tt, S) {
    const sc = geo.slotW / 48 * 0.84;
    S.units.forEach((u) => {
      const p = unitPos(u);
      const cst = u.cover.hp <= 0 ? 3 : u.cover.hp < u.cover.max * 0.33 ? 2 : u.cover.hp < u.cover.max * 0.66 ? 1 : 0;
      const cvs = SPR().cover(cst);
      const sp = SPR().back(u.id);
      const w = sp.w * sc, h = sp.h * sc;
      const cw = geo.slotW * 1.08, ch = cw * cvs.height / cvs.width;
      g.imageSmoothingEnabled = false;
      g.drawImage(cvs, p.x - cw / 2, p.y - h * 0.05 - ch, cw, ch);
      if (u.dead) { g.globalAlpha = 0.5; }
      const ex = u.exposed && !u.dead;
      const fr = ex ? sp.aim : sp.f[Math.floor((tt * 1.6 + u.i * 0.3) % 2)];
      const dx = ex ? geo.slotW * 0.22 : 0, dy = ex ? -h * 0.04 : u.dead ? h * 0.42 : h * 0.26;
      const rc = u.anim.shot > 0 ? 2 : 0;
      g.fillStyle = "rgba(0,0,0,.35)"; g.beginPath(); g.ellipse(p.x + dx, p.y + 4, w * 0.36, 5, 0, 0, Math.PI * 2); g.fill();
      /* フルバースト中・バースト強化中は足もとに光 */
      if (!u.dead && (S.fb > 0 || u.buffs.length)) { g.globalCompositeOperation = "lighter"; glow(p.x + dx, p.y - h * 0.4, w * 0.8, S.fb > 0 ? "#ffcf5a" : (CCOL[u.id] || "#fff"), 0.22 + 0.1 * Math.sin(tt * 6 + u.i)); g.globalCompositeOperation = "source-over"; }
      g.drawImage(fr, p.x - w / 2 + dx, p.y - h + dy + rc, w, h);
      if (u.anim.hit > 0 && !u.dead) { g.globalAlpha = u.anim.hit / 0.12 * 0.7; g.drawImage(sp.hurt, p.x - w / 2 + dx, p.y - h + dy + rc, w, h); }
      g.globalAlpha = 1;
      if (B.ctl === u.i && !B.auto && B.manual && !u.dead && S.n === 0) { g.strokeStyle = "#5ef2ff"; g.lineWidth = 2.5; const y0 = p.y - h + dy - 10; g.beginPath(); g.moveTo(p.x + dx - 7, y0 - 7); g.lineTo(p.x + dx, y0); g.lineTo(p.x + dx + 7, y0 - 7); g.stroke(); }
      if (u.shield > 0 && !u.dead) { g.strokeStyle = "rgba(120,220,255,.65)"; g.lineWidth = 2; g.beginPath(); g.ellipse(p.x + dx, p.y - h * 0.45 + dy, w * 0.5, h * 0.55, 0, 0, Math.PI * 2); g.stroke(); }
      if (u.taunt > 0 && !u.dead) { g.font = "900 12px 'Noto Sans JP',sans-serif"; g.textAlign = "center"; g.lineWidth = 3; g.strokeStyle = "rgba(0,0,0,.6)"; g.strokeText("挑発", p.x + dx, p.y - h + dy - 14); g.fillStyle = "#ffd23a"; g.fillText("挑発", p.x + dx, p.y - h + dy - 14); }
      if (!u.dead && (u.W.chg && u.chg > 0 || u.W.ramp && u.ramp > 0.05)) { const v = u.W.chg ? u.chg : u.ramp; g.strokeStyle = u.W.chg ? "#bff6ff" : "#ffd36b"; g.lineWidth = 3; g.beginPath(); g.arc(p.x + dx, p.y - h * 0.55 + dy, 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * v); g.stroke(); if (u.W.chg && u.chg > 0.7) { g.globalCompositeOperation = "lighter"; glow(p.x + dx + 10, p.y - h * 0.8 + dy, 10 + u.chg * 10, "#bff6ff", u.chg); g.globalCompositeOperation = "source-over"; } }
    });
    /* スズの六角の盾（遮蔽物の列の上） */
    if (hexWallT > 0) {
      g.save(); g.globalCompositeOperation = "lighter"; const a = Math.min(1, hexWallT / 0.4);
      g.strokeStyle = "rgba(255,215,80," + (0.6 * a) + ")"; g.lineWidth = 2;
      const y0 = geo.gy0 - geo.slotW * 0.9, r = geo.slotW * 0.2;
      for (let i = 0; i < 16; i++) for (let j = 0; j < 2; j++) hexAt(W * (i + 0.5 + (j % 2) * 0.5) / 16, y0 + j * r * 1.5, r);
      g.fillStyle = "rgba(255,210,60," + (0.08 * a) + ")"; g.fillRect(0, y0 - r, W, r * 3.6);
      g.restore();
    }
    /* イチカの波 */
    if (waveT > 0) { const f = 1 - waveT / 0.8, x = -W * 0.3 + f * W * 1.6; g.save(); g.globalCompositeOperation = "lighter"; const gr = g.createLinearGradient(x - 120, 0, x + 120, 0); gr.addColorStop(0, "rgba(51,214,255,0)"); gr.addColorStop(0.5, "rgba(150,240,255,.55)"); gr.addColorStop(1, "rgba(51,214,255,0)"); g.fillStyle = gr; g.fillRect(x - 120, geo.gy0 - geo.slotW * 1.5, 240, geo.slotW * 1.8); g.restore(); }
  }
  /* アリーナの相手（横にひろく・正面向き） */
  function drawFoes(tt) {
    const S = B.side[1]; if (!S) return;
    S.units.forEach((u) => {
      const p = foePos(u.i);
      const sp = SPR().front(u.id);
      const k = Math.min(W * 0.15 / sp.w, (geo.gy0 - geo.hz) * 0.55 / sp.h);
      const w = sp.w * k, h = sp.h * k;
      const ex = u.exposed && !u.dead;
      const fr = ex ? (sp.aim || sp.f[0]) : sp.f[Math.floor((tt * 1.6 + u.i * 0.3) % 2)];
      if (u.dead) g.globalAlpha = 0.35;
      g.fillStyle = "rgba(0,0,0,.3)"; g.beginPath(); g.ellipse(p.x, p.y, w * 0.35, 5, 0, 0, Math.PI * 2); g.fill();
      if (!u.dead && S.fb > 0) { g.globalCompositeOperation = "lighter"; glow(p.x, p.y - h * 0.4, w * 0.8, "#ff5a7a", 0.25); g.globalCompositeOperation = "source-over"; }
      const fx = p.x - w / 2 + (ex ? -w * 0.1 : 0), fy = p.y - h + (ex ? -h * 0.06 : h * 0.14);
      g.drawImage(fr, fx, fy, w, h);
      if (u.anim.hit > 0 && !u.dead) { g.globalAlpha = u.anim.hit / 0.12 * 0.7; g.drawImage(sp.hurt, fx, fy, w, h); }
      g.globalAlpha = 1;
      u._r = { x: p.x, y: p.y - h, w, h };
      const cst = u.cover.hp <= 0 ? 3 : u.cover.hp < u.cover.max * 0.33 ? 2 : u.cover.hp < u.cover.max * 0.66 ? 1 : 0;
      const cvs = SPR().cover(cst, true); const cw = w * 1.2, ch = cw * cvs.height / cvs.width;
      g.drawImage(cvs, p.x - cw / 2, p.y - ch * 0.72, cw, ch);
      if (!u.dead) {
        const bw = w * 0.95, bx = p.x - bw / 2, by = p.y - h - 10;
        g.fillStyle = "rgba(10,12,24,.75)"; g.fillRect(bx - 1, by - 1, bw + 2, 6); g.fillStyle = "#ff4d6d"; g.fillRect(bx, by, bw * u.hp / u.hpMax, 4);
        g.fillStyle = "#8ea0c4"; g.fillRect(bx, by + 4, bw * Math.max(0, u.cover.hp / u.cover.max), 1.5);
        if (u.taunt > 0) { g.font = "900 11px 'Noto Sans JP',sans-serif"; g.textAlign = "center"; g.fillStyle = "#ffd23a"; g.fillText("挑発", p.x, by - 4); }
      }
    });
  }
  function drawCross(tt) {
    if (!B.manual || B.auto || B.over) return;
    const u = B.side[0].units[B.ctl]; if (!u || u.dead) return;
    const x = aim.x, y = aim.y, f = B.firing;
    g.save(); g.translate(x, y);
    const col = B.jam > 0 ? "rgba(120,200,255," : "rgba(94,242,255,";
    g.strokeStyle = col + (f ? ".98)" : ".7)"); g.lineWidth = 2.2;
    g.shadowColor = "rgba(0,0,0,.6)"; g.shadowBlur = 3;
    const w = u.W.sh;
    if (w === "SG") { g.beginPath(); g.arc(0, 0, 28, 0, Math.PI * 2); g.stroke(); g.setLineDash([3, 5]); g.beginPath(); g.arc(0, 0, 20, 0, Math.PI * 2); g.stroke(); g.setLineDash([]); }
    else if (w === "SR" || w === "RL") { g.beginPath(); g.arc(0, 0, 18, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(-26, 0); g.lineTo(-8, 0); g.moveTo(8, 0); g.lineTo(26, 0); g.moveTo(0, -26); g.lineTo(0, -8); g.moveTo(0, 8); g.lineTo(0, 26); g.stroke(); if (u.chg > 0) { g.strokeStyle = "#ffffff"; g.lineWidth = 3.4; g.beginPath(); g.arc(0, 0, 23, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * u.chg); g.stroke(); } }
    else { const r = w === "MG" ? 16 - u.ramp * 6 : 12; g.beginPath(); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; g.moveTo(Math.cos(a) * (r + 2), Math.sin(a) * (r + 2)); g.lineTo(Math.cos(a) * (r + 10), Math.sin(a) * (r + 10)); } g.stroke(); g.beginPath(); g.arc(0, 0, 2.2, 0, Math.PI * 2); g.fillStyle = g.strokeStyle; g.fill(); }
    g.shadowBlur = 0;
    g.fillStyle = "rgba(10,14,30,.65)"; g.fillRect(22, 14, 36, 5); g.fillStyle = u.reload > 0 ? "#ffd36b" : "#5ef2ff"; g.fillRect(22, 14, 36 * (u.reload > 0 ? 1 - u.reload / u.rT : u.ammo / u.mag), 5);
    if (B.jam > 0) { g.font = "900 10px 'Orbitron',sans-serif"; g.fillStyle = "#9fdcff"; g.fillText("JAM", 22, 32); }
    g.restore();
  }
  function drawFx(dt, tt) {
    g.globalCompositeOperation = "lighter";
    /* 銃口の閃光 */
    muzzles.forEach((m) => { m.t -= dt; const a = Math.max(0, m.t / m.d); glow(m.x, m.y, 18 * m.s, m.c, a); flare(m.x, m.y, 22 * m.s, "#fff6d0", a, R2() * 0.4); });
    muzzles = muzzles.filter((m) => m.t > 0); if (muzzles.length > 40) muzzles.splice(0, muzzles.length - 40);
    /* 弾道 */
    tracers.forEach((t) => {
      t.t -= dt; const a = Math.max(0, t.t / (t.d || 0.08));
      g.strokeStyle = t.c; g.lineCap = "round";
      g.globalAlpha = a * 0.3; g.lineWidth = t.w * 5; g.beginPath(); g.moveTo(t.x0, t.y0); g.lineTo(t.x1, t.y1); g.stroke();
      g.globalAlpha = a; g.lineWidth = t.w; g.beginPath(); g.moveTo(t.x0 + (t.x1 - t.x0) * 0.25, t.y0 + (t.y1 - t.y0) * 0.25); g.lineTo(t.x1, t.y1); g.stroke();
      if (t.head) glow(t.x1, t.y1, t.w * 5, t.c, a);
    });
    g.globalAlpha = 1; tracers = tracers.filter((t) => t.t > 0); if (tracers.length > 120) tracers.splice(0, tracers.length - 120);
    /* 光線（SR・バースト・回復の線） */
    beams.forEach((b) => {
      b.t -= dt; const a = Math.max(0, b.t / b.d), w = b.w * (0.35 + 0.65 * a);
      g.lineCap = "round"; g.strokeStyle = b.c;
      g.globalAlpha = a * 0.35; g.lineWidth = w * 3.2; g.beginPath(); g.moveTo(b.x0, b.y0); g.lineTo(b.x1, b.y1); g.stroke();
      g.globalAlpha = a; g.lineWidth = w; g.beginPath(); g.moveTo(b.x0, b.y0); g.lineTo(b.x1, b.y1); g.stroke();
      g.strokeStyle = "#ffffff"; g.lineWidth = Math.max(1, w * 0.35); g.beginPath(); g.moveTo(b.x0, b.y0); g.lineTo(b.x1, b.y1); g.stroke();
      glow(b.x0, b.y0, w * 2.4, b.c, a); glow(b.x1, b.y1, w * 3, b.c, a);
    });
    g.globalAlpha = 1; beams = beams.filter((b) => b.t > 0);
    /* 月の雷 */
    bolts.forEach((b) => { b.t -= dt; const a = Math.max(0, b.t / b.d); g.strokeStyle = b.c; g.globalAlpha = a; g.lineWidth = 6 * a + 1; g.beginPath(); b.seg.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke(); g.strokeStyle = "#fff"; g.lineWidth = 1.6; g.stroke(); });
    g.globalAlpha = 1; bolts = bolts.filter((b) => b.t > 0);
    /* ロケット（煙を引いて飛び、着いたら爆発の光） */
    rockets.forEach((r) => {
      r.t += dt; const f = Math.min(1, r.t / r.d), x = r.x0 + (r.x1 - r.x0) * f, y = r.y0 + (r.y1 - r.y0) * f - Math.sin(f * Math.PI) * 20;
      glow(x, y, r.big ? 16 : 11, "#ffb070", 1);
      g.globalCompositeOperation = "source-over"; part({ k: "smoke", x, y, vx: (R2() - 0.5) * 20, vy: -10, t: 0.45, d: 0.45, c: "rgba(220,220,230,.55)", s: 3 + R2() * 2, g: -10, grow: 1.3 }); g.globalCompositeOperation = "lighter";
      if (f >= 1 && !r.done) { r.done = true; hits.push({ x: r.x1, y: r.y1, t: 0.25, d: 0.25, s: r.big ? 2.6 : 1.8, c: "#ffb070" }); ring(r.x1, r.y1, 4, r.big ? 70 : 44, 0.35, "rgba(255,180,90,.95)", 3); sparks(r.x1, r.y1, r.big ? 18 : 10, "#ffc066", 260); }
    });
    rockets = rockets.filter((r) => !r.done);
    /* 当たった光 */
    hits.forEach((h) => { h.t -= dt; const a = Math.max(0, h.t / h.d); glow(h.x, h.y, 22 * h.s * (1.4 - a * 0.4), h.c, a); flare(h.x, h.y, 26 * h.s, "#ffffff", a * 0.8, 0.3); });
    hits = hits.filter((h) => h.t > 0); if (hits.length > 60) hits.splice(0, hits.length - 60);
    flares.forEach((f) => { f.t -= dt; const a = Math.max(0, f.t / f.d); glow(f.x, f.y, f.r * 0.45 * (1.3 - a * 0.3), f.c, a * 0.9); flare(f.x, f.y, f.r * (1.25 - a * 0.25), f.c, a, f.rot); });
    flares = flares.filter((f) => f.t > 0);
    g.globalCompositeOperation = "source-over";
    /* 爆発のコマ */
    booms.forEach((b) => {
      b.t += dt; const n = Math.min(5, Math.floor(b.t / 0.07)); const c = SPR().boom(n); const s = 32 * b.s * geo.k * 0.5;
      g.imageSmoothingEnabled = false; g.drawImage(c, b.x - s / 2, b.y - s / 2 - s * 0.2, s, s);
    });
    booms = booms.filter((b) => b.t < 0.42);
    /* 粒 */
    P.forEach((p) => {
      p.t -= dt;
      if (p.drag) { p.vx *= Math.max(0, 1 - p.drag * dt); p.vy *= Math.max(0, 1 - p.drag * dt * 0.5); }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.g == null ? 420 : p.g) * dt;
      if (p.vr) p.rot = (p.rot || 0) + p.vr * dt;
      const a = p.fade ? Math.max(0, p.t / p.d) : Math.max(0, Math.min(1, p.t * 2.2));
      switch (p.k) {
        case "spark": g.globalCompositeOperation = "lighter"; g.globalAlpha = a; g.strokeStyle = p.c; g.lineWidth = p.s; g.lineCap = "round"; g.beginPath(); g.moveTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035); g.lineTo(p.x, p.y); g.stroke(); break;
        case "streak": g.globalCompositeOperation = "lighter"; g.globalAlpha = a * 0.8; g.strokeStyle = p.c; g.lineWidth = p.s; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * 0.05, p.y - p.vy * 0.05); g.stroke(); break;
        case "drop": g.globalCompositeOperation = "lighter"; g.globalAlpha = a * 0.7; g.strokeStyle = p.c; g.lineWidth = p.s; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * 0.02, p.y - p.vy * 0.02); g.stroke(); break;
        case "glow": g.globalCompositeOperation = "lighter"; glow(p.x, p.y, p.s * (p.fade ? 1 + (1 - a) * 0.6 : 1), p.c, a); break;
        case "smoke": { g.globalCompositeOperation = "source-over"; const s = p.grow ? p.s * (1 + Math.max(0, 1.4 - p.t) * p.grow) : p.s; g.globalAlpha = Math.min(1, a) * 0.8; g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, s, 0, Math.PI * 2); g.fill(); break; }
        case "debris": g.globalCompositeOperation = "source-over"; g.globalAlpha = a; g.save(); g.translate(p.x, p.y); g.rotate(p.rot || 0); g.fillStyle = p.c; g.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.66); g.restore(); break;
        case "petal": {
          g.globalCompositeOperation = "source-over"; g.globalAlpha = a; g.save(); g.translate(p.x + Math.sin((p.t + p.rot) * 4) * 6, p.y); g.rotate(p.rot || 0); g.fillStyle = p.c;
          if (p.sh === "rose") { g.beginPath(); g.arc(0, 0, p.s * 0.7, 0, Math.PI * 2); g.fill(); g.fillStyle = "rgba(0,0,0,.18)"; g.beginPath(); g.arc(p.s * 0.15, 0, p.s * 0.35, 0, Math.PI * 2); g.fill(); }
          else if (p.sh === "flower") { for (let i = 0; i < 5; i++) { g.rotate(Math.PI * 2 / 5); g.beginPath(); g.ellipse(p.s * 0.55, 0, p.s * 0.5, p.s * 0.28, 0, 0, Math.PI * 2); g.fill(); } g.fillStyle = "#ffd36b"; g.beginPath(); g.arc(0, 0, p.s * 0.25, 0, Math.PI * 2); g.fill(); }
          else { g.beginPath(); g.ellipse(0, 0, p.s, p.s * 0.55, 0, 0, Math.PI * 2); g.fill(); }
          g.restore(); break;
        }
        case "plus": g.globalCompositeOperation = "source-over"; g.globalAlpha = a; g.fillStyle = p.c; g.strokeStyle = "rgba(0,60,30,.5)"; g.lineWidth = 1; { const s = p.s; g.fillRect(p.x - s / 2, p.y - s / 6, s, s / 3); g.fillRect(p.x - s / 6, p.y - s / 2, s / 3, s); } break;
        case "bubble": g.globalCompositeOperation = "lighter"; g.globalAlpha = a * 0.7; g.strokeStyle = p.c; g.lineWidth = 1.2; g.beginPath(); g.arc(p.x + Math.sin(p.t * 9 + p.s) * 4, p.y, p.s, 0, Math.PI * 2); g.stroke(); break;
        default: g.globalCompositeOperation = p.add ? "lighter" : "source-over"; g.globalAlpha = a; g.fillStyle = p.c; g.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
      }
    });
    g.globalAlpha = 1; g.globalCompositeOperation = "source-over"; P = P.filter((p) => p.t > 0);
    /* 衝撃波の輪 */
    g.globalCompositeOperation = "lighter";
    rings.forEach((r) => {
      r.t += dt; const f = Math.min(1, r.t / r.d), e = 1 - (1 - f) * (1 - f);
      g.globalAlpha = Math.max(0, 1 - f); g.strokeStyle = r.c; g.lineWidth = Math.max(0.5, r.w * (1 - f * 0.6));
      g.beginPath(); g.arc(r.x, r.y, r.r0 + (r.r1 - r.r0) * e, 0, Math.PI * 2); g.stroke();
    });
    g.globalAlpha = 1; g.globalCompositeOperation = "source-over"; rings = rings.filter((r) => r.t < r.d);
    /* ダメージの数字 */
    g.textAlign = "center";
    nums.forEach((n) => {
      n.t -= dt; n.age += dt; n.y -= (n.heal ? 26 : 38) * dt;
      const big = n.crit || n.core || n.skill, pop2 = big ? 1 + 0.9 * Math.max(0, 1 - n.age / 0.14) : 1 + 0.3 * Math.max(0, 1 - n.age / 0.08);
      const fs = (n.skill ? 24 : big ? 20 : n.dot ? 11 : 14) * pop2;
      g.font = "900 " + fs.toFixed(1) + "px 'Orbitron','Noto Sans JP',sans-serif";
      g.globalAlpha = Math.max(0, Math.min(1, n.t * 2.4));
      g.lineWidth = big ? 5 : 3.4; g.strokeStyle = "rgba(10,8,24,.92)"; g.lineJoin = "round";
      const tx = (n.heal ? "+" : "") + fmt(n.v);
      g.strokeText(tx, n.x, n.y);
      let fill;
      if (n.heal) fill = "#5dffa8";
      else if (n.foe) fill = "#ff8a9a";
      else if (big) { const gr = g.createLinearGradient(0, n.y - fs, 0, n.y); if (n.core) { gr.addColorStop(0, "#ffd0e0"); gr.addColorStop(1, "#ff4d7a"); } else if (n.skill) { gr.addColorStop(0, "#ffffff"); gr.addColorStop(0.5, "#9ff8ff"); gr.addColorStop(1, "#b06bff"); } else { gr.addColorStop(0, "#fff6c2"); gr.addColorStop(1, "#ff9a2e"); } fill = gr; }
      else fill = n.fb ? "#ffe07a" : n.dot ? "#ff9a5a" : "#ffffff";
      g.fillStyle = fill; g.fillText(tx, n.x, n.y);
      if (big) {
        const lb = n.core ? "WEAK POINT" : n.skill ? "BURST" : "CRITICAL";
        g.font = "900 9.5px 'Orbitron',sans-serif"; g.lineWidth = 3; g.strokeText(lb, n.x, n.y + 12);
        g.fillStyle = n.core ? "#ffb0c8" : n.skill ? "#b8f6ff" : "#ffe6a0"; g.fillText(lb, n.x, n.y + 12);
      }
    });
    g.globalAlpha = 1; nums = nums.filter((n) => n.t > 0);
    /* 文字のポップ（KILL ×n・WEAK・SHOT DOWN） */
    pops.forEach((p) => {
      p.t += dt; const f = p.t / p.d, a = f < 0.7 ? 1 : Math.max(0, 1 - (f - 0.7) / 0.3), s = 1 + 0.6 * Math.max(0, 1 - p.t / 0.12);
      g.font = "900 " + (p.cls.indexOf("streak") >= 0 ? 17 : 12) * s + "px 'Orbitron','Noto Sans JP',sans-serif"; g.globalAlpha = a;
      g.lineWidth = 4; g.strokeStyle = "rgba(10,8,24,.9)"; const y = p.y - f * 20; g.strokeText(p.text, p.x, y);
      g.fillStyle = p.cls.indexOf("hot") >= 0 ? "#ff5ad0" : p.cls.indexOf("streak") >= 0 ? "#ffd36b" : p.cls === "weak" ? "#ff8ab0" : "#9ff0ff"; g.fillText(p.text, p.x, y);
    });
    g.globalAlpha = 1; pops = pops.filter((p) => p.t < p.d);
    /* なぎはらいの予兆 */
    if (B.sweep) { const a = 0.25 + 0.25 * Math.sin(tt * 18); g.fillStyle = "rgba(255,40,70," + a + ")"; g.fillRect(0, geo.gy0 - geo.slotW * 1.2, W, geo.slotW * 0.9); }
    /* 画面の光 */
    if (flashT > 0) { flashT -= dt; g.fillStyle = "rgba(" + flashC + "," + Math.max(0, flashT) * 1.6 + ")"; g.fillRect(0, 0, W, H); }
    if (tint && tint.t > 0) { tint.t -= dt; g.globalCompositeOperation = "lighter"; g.globalAlpha = Math.max(0, tint.t / tint.d) * tint.a; g.fillStyle = tint.c; g.fillRect(0, 0, W, H); g.globalAlpha = 1; g.globalCompositeOperation = "source-over"; }
    /* 発動の集中線 */
    if (speedT > 0) {
      speedT -= dt; const a = Math.min(1, speedT / 0.25);
      g.save(); g.translate(W / 2, H * 0.45); g.strokeStyle = "rgba(255,255,255," + (0.55 * a).toFixed(3) + ")";
      for (let i = 0; i < 40; i++) { const an = R2() * Math.PI * 2, r0 = Math.min(W, H) * (0.28 + R2() * 0.22), len = 50 + R2() * 170; g.lineWidth = 1 + R2() * 2.8; g.beginPath(); g.moveTo(Math.cos(an) * r0, Math.sin(an) * r0); g.lineTo(Math.cos(an) * (r0 + len), Math.sin(an) * (r0 + len)); g.stroke(); }
      g.restore();
    }
    /* フルバーストの光の帯（はじまりの一回） */
    if (fbIntro > 0) {
      fbIntro -= dt; const f = 1 - Math.max(0, fbIntro) / 1.1, x = -W * 0.5 + f * W * 2;
      g.save(); g.globalCompositeOperation = "lighter"; g.transform(1, 0, -0.35, 1, H * 0.2, 0);
      const gr = g.createLinearGradient(x - 170, 0, x + 170, 0);
      gr.addColorStop(0, "rgba(255,90,208,0)"); gr.addColorStop(0.5, "rgba(255,220,250,.6)"); gr.addColorStop(1, "rgba(94,242,255,0)");
      g.fillStyle = gr; g.fillRect(x - 170, 0, 340, H); g.restore();
    }
    /* フルバースト中：虹色のふち */
    if (B.side[0].fb > 0) {
      const hue = (tt * 120) % 360, th = Math.max(10, Math.min(W, H) * 0.035);
      g.save(); g.globalCompositeOperation = "lighter";
      [[0, 0, W, th, 0, 1], [0, H - th, W, th, 0, -1], [0, 0, th, H, 1, 0], [W - th, 0, th, H, -1, 0]].forEach((r, k) => {
        const gr = r[4] ? g.createLinearGradient(r[4] > 0 ? 0 : W, 0, r[4] > 0 ? th : W - th, 0) : g.createLinearGradient(0, r[5] > 0 ? 0 : H, 0, r[5] > 0 ? th : H - th);
        gr.addColorStop(0, "hsla(" + ((hue + k * 60) % 360) + ",100%,65%,.55)"); gr.addColorStop(1, "hsla(" + ((hue + k * 60) % 360) + ",100%,65%,0)");
        g.fillStyle = gr; g.fillRect(r[0], r[1], r[2], r[3]);
      });
      g.restore();
    }
  }
  function stepTimers(dt) {
    delayed.forEach((d) => { d.t -= dt; if (d.t <= 0 && !d.done) { d.done = true; try { d.fn(); } catch (e) {} } });
    delayed = delayed.filter((d) => !d.done);
    emitters.forEach((e) => { e.t += dt; e.acc += dt * e.rate; while (e.acc >= 1) { e.acc -= 1; try { e.fn(); } catch (er) {} } });
    emitters = emitters.filter((e) => e.t < e.d);
    if (hexWallT > 0) hexWallT -= dt;
    if (waveT > 0) waveT -= dt;
    if (autoHintT > 0) autoHintT -= dt;
  }
  function keyAim(dt) {
    let dx = 0, dy = 0; for (const c in keys) { const v = KEYAIM[c]; if (v) { dx += v[0]; dy += v[1]; } }
    if (!dx && !dy) return;
    aim.x = Math.max(8, Math.min(W - 8, aim.x + dx * W * 0.85 * dt)); aim.y = Math.max(geo.topH, Math.min(geo.gy0 - 10, aim.y + dy * H * 0.6 * dt));
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!B) return;
    let dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
    const tt = now / 1000;
    if (!paused && !ended) { keyAim(dt); ENG().update(B, dt); drainEvents(); }
    if (paused) dt = 0;
    /* ヒットストップ中は演出もゆっくり */
    const fdt = B.hitstop > 0 ? dt * 0.25 : dt * (B.speed || 1) * (B.slow > 0 ? 0.5 : 1);
    stepTimers(fdt);
    if (msgT > 0) { msgT -= dt; if (msgT <= 0) hud.msg.classList.remove("on"); }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    let sx = 0, sy = 0;
    if (shake > 0) { sx = (R2() - 0.5) * shake; sy = (R2() - 0.5) * shake; shake = Math.max(0, shake - dt * 34); }
    g.save(); g.translate(sx, sy);
    drawBg(tt);
    drawTele(tt);
    if (B.mode === "arena") drawFoes(tt);
    else B.enemies.slice().sort((a, b) => b.z - a.z).forEach((e) => drawEnemy(e, tt));
    drawProj(tt);
    drawSquad(tt, B.side[0]);
    drawFx(fdt, tt);
    drawCross(tt);
    g.restore();
    paintHud();
  }

  /* ══════════ はじめる・おわる ══════════ */
  const BG_N = { ruins: 1, harbor: 2, desert: 3, snow: 4, fort: 5, void: 6 };
  function bgmOf(cfg) {
    if (cfg.mode === "arena") return "arena";
    if (cfg.mode === "boss") return "icpt";
    if (cfg.mode === "tower") return "tower";
    return "battle" + (BG_N[cfg.bg || (cfg.stage && cfg.stage.bg)] || 1);
  }
  function start(root, cfg, cb) {
    stop();
    onEnd = cb; ended = false; paused = false;
    hud = buildHud(root);
    cv = root.querySelector(".b3-cv"); g = cv.getContext("2d");
    B = ENG().create(cfg);
    B._bg = cfg.bg || (cfg.stage && cfg.stage.bg) || "ruins";
    B.pickAt = pickAt;
    B.speed = cfg.speed || 1;
    P = []; tracers = []; rockets = []; beams = []; nums = []; booms = []; rings = []; emitters = []; delayed = []; pops = []; muzzles = []; hits = []; bolts = []; flares = [];
    cutQ = []; cutting = false; aim = { x: 0, y: 0 }; tint = null; speedT = 0; fbIntro = 0; keys = {}; keyFire = false; flashT = 0; shake = 0; hexWallT = 0; waveT = 0; autoHintT = 0; lowHp = 0;
    layout();
    hud.$("#b3Stage").textContent = cfg.title || (cfg.stage ? cfg.stage.nm : cfg.mode === "arena" ? "ARENA" : "");
    hud.$("#b3Wave").textContent = cfg.mode === "arena" ? (cfg.foeName ? "VS " + cfg.foeName : "") : cfg.mode === "boss" ? "INTERCEPTION" : "";
    hud.cards.innerHTML = cardsHTML();
    hud.root.classList.toggle("arena", cfg.mode === "arena");
    layout();
    bindInput();
    window.addEventListener("resize", onResize);
    lastT = performance.now();
    raf = requestAnimationFrame(frame);
    try { AU.set(!MB3.Save || MB3.Save.setting("sfx") !== false); } catch (e) {}
    try { MB3.BGM && MB3.BGM.play(bgmOf(cfg)); } catch (e) {}
    return B;
  }
  function onResize() { if (B) layout(); }
  function endBattle(r) {
    if (ended) return;
    ended = true;
    B.firing = false;
    try { MB3.BGM && MB3.BGM.stop(0.5); } catch (e) {}
    AU.play(r === "win" || r === "end" ? "win" : "lose");
    if (r === "win") { for (let k = 0; k < 6; k++) later(k * 0.12, () => sparks(W * (0.15 + R2() * 0.7), H * (0.2 + R2() * 0.3), 22, ["#ffd36b", "#5ef2ff", "#ff7ad9", "#7dffc4", "#ffffff", "#b06bff"][k], 340, 2.2)); }
    showMsg(r === "win" ? "<small>MISSION</small><b>COMPLETE</b>" : r === "end" ? "<small>TIME UP</small><b>" + fmt(B.dmgTotal) + "</b>" : r === "retreat" ? "<b>撤退</b>" : "<b>DEFEAT</b>", r === "win" || r === "end" ? "win" : "lose", 2.5);
    setTimeout(() => { const cb = onEnd; const b = B; if (cb) cb(b); }, r === "retreat" ? 300 : 1800);
  }
  function stop() {
    cancelAnimationFrame(raf); raf = 0;
    if (R._unbind) { R._unbind(); R._unbind = null; }
    window.removeEventListener("resize", onResize);
    B = null;
  }
  R.start = start; R.stop = stop; R.layout = () => B && layout();
  R.get = () => B;
  R.CCOL = CCOL;
})();
