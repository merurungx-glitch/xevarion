/* ============================================================
   MagiQuiz — quiz-fx.js（音・BGM・粒・画面の演出）
   ★★ 2026-11-05 全面作り直し（ご指定「アニメーションなども可能です。演出もこだわってください」）
   ------------------------------------------------------------
   ・音はぜんぶ WebAudio で合成（ファイルなし＝オフラインでも鳴る・追加のダウンロードなし）。
   ・BGM は小さなステップシーケンサー（title / play / bomb / result）。bomb は危険度でテンポが上がる。
   ・粒（紙ふぶき・火花・爆発・煙）は1枚の canvas（#fxc）。粒があるときだけ動かす。
   ・見えない爆弾のまわりの演出（Amb）：画面のふちの光・鼓動・地の色・四隅の火花・足もとの煙。
     ★ 爆弾そのものは絵に出さない（ご指定「爆弾は見えないように（周りの演出は可）」）。
       強さは「ずらした進み」から作る＝のこり時間は読めない（quiz-play.js の B.k）。
   ・動きを減らす設定（prefers-reduced-motion／XEVARION の設定 xos-nomotion）では、粒とゆれを止める。
   ============================================================ */
(function () {
  "use strict";
  const MQ = (window.MQ = window.MQ || {});
  const OPT_KEY = "magiquiz_opt_v1";
  const opt = (function () {
    const d = { se: true, bgm: true, fs: 1, sol: 0, vib: true, host: 1, hostId: "" };   /* ★★ 2026-11-08 司会キャラ（host＝オンオフ・hostId＝"" はおまかせ） */
    try { return Object.assign(d, JSON.parse(localStorage.getItem(OPT_KEY) || "{}")); } catch (e) { return d; }
  })();
  const saveOpt = () => { try { localStorage.setItem(OPT_KEY, JSON.stringify(opt)); } catch (e) {} };
  const RM = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches || document.body.classList.contains("xos-nomotion"); } catch (e) { return false; } };

  /* ══════════════ 音 ══════════════ */
  let AC = null, MASTER = null, SEG = null, BGG = null;
  function ac() {
    if (!AC) {
      try {
        AC = new (window.AudioContext || window.webkitAudioContext)();
        MASTER = AC.createDynamicsCompressor(); MASTER.threshold.value = -14; MASTER.ratio.value = 6; MASTER.connect(AC.destination);
        SEG = AC.createGain(); SEG.gain.value = 1; SEG.connect(MASTER);
        BGG = AC.createGain(); BGG.gain.value = 0.55; BGG.connect(MASTER);
      } catch (e) { AC = null; }
    }
    if (AC && AC.state === "suspended") { try { AC.resume(); } catch (e) {} }
    return AC;
  }
  function tone(f, t0, dur, type, vol, f2, dest) {
    const a = ac(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain(), now = a.currentTime + (t0 || 0);
    o.type = type || "sine"; o.frequency.setValueAtTime(f, now);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(1, f2), now + dur);
    g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(vol || 0.08, now + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.connect(g); g.connect(dest || SEG); o.start(now); o.stop(now + dur + 0.05);
  }
  function noise(dur, vol, type, freq, t0, dest) {
    const a = ac(); if (!a) return;
    const n = Math.floor(a.sampleRate * dur), b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(), now = a.currentTime + (t0 || 0);
    f.type = type || "lowpass"; f.frequency.value = freq || 900; g.gain.value = vol || 0.3;
    s.buffer = b; s.connect(f); f.connect(g); g.connect(dest || SEG); s.start(now);
  }
  function sfx(k, arg) {
    if (!opt.se) return;
    if (!ac()) return;
    switch (k) {
      case "tap": tone(720, 0, 0.05, "triangle", 0.05); break;
      case "sel": tone(560, 0, 0.06, "triangle", 0.07); tone(840, 0.045, 0.08, "triangle", 0.06); break;
      case "buzz": /* ボタンの「ピンポン」 */ tone(1046, 0, 0.13, "square", 0.05); tone(1568, 0.09, 0.3, "triangle", 0.1); tone(523, 0, 0.1, "sine", 0.12, 180); break;
      case "qin": tone(330, 0, 0.1, "triangle", 0.05); tone(494, 0.07, 0.14, "triangle", 0.05); break;
      case "ok": [659, 880, 1109, 1319].forEach((f, i) => { tone(f, i * 0.075, 0.26, "triangle", 0.11); tone(f * 2, i * 0.075, 0.18, "sine", 0.03); }); break;
      case "ng": tone(196, 0, 0.2, "sawtooth", 0.09, 170); tone(196, 0.24, 0.42, "sawtooth", 0.09, 120); break;
      case "time": [880, 880, 880].forEach((f, i) => tone(f, i * 0.16, 0.12, "square", 0.05)); tone(220, 0.5, 0.5, "sawtooth", 0.08, 110); break;
      case "warn": tone(1320, 0, 0.05, "square", 0.028); break;
      case "tick": tone(1700 + Math.random() * 120, 0, 0.022, "square", 0.022); break;
      case "tock": tone(1180, 0, 0.026, "square", 0.02); break;
      case "beat": /* 鼓動 */ tone(62, 0, 0.16, "sine", 0.3, 40); tone(54, 0.2, 0.2, "sine", 0.22, 36); break;
      case "boom": noise(1.6, 0.7, "lowpass", 1000); noise(0.35, 0.45, "highpass", 1800); tone(120, 0, 1.2, "sine", 0.5, 26); tone(68, 0.05, 1.5, "triangle", 0.3, 22); noise(1.1, 0.16, "bandpass", 420, 0.5); break;
      case "pass": tone(300, 0, 0.2, "sine", 0.1, 1300); noise(0.2, 0.08, "highpass", 2400); break;
      case "turn": tone(392, 0, 0.11, "triangle", 0.08); tone(523, 0.09, 0.11, "triangle", 0.08); tone(784, 0.18, 0.24, "triangle", 0.09); break;
      case "out": [392, 330, 262, 196].forEach((f, i) => tone(f, i * 0.13, 0.26, "sawtooth", 0.06)); noise(0.3, 0.14, "lowpass", 500, 0.5); break;
      case "climb": { const b = 392 * Math.pow(2, (arg || 1) / 12); tone(b, 0, 0.1, "triangle", 0.09); tone(b * 1.26, 0.08, 0.1, "triangle", 0.09); tone(b * 1.5, 0.16, 0.24, "triangle", 0.1); break; }
      case "check": [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.06, 0.5, "sine", 0.08)); break;
      case "fall": tone(880, 0, 0.6, "sawtooth", 0.05, 110); break;
      case "item": tone(880, 0, 0.1, "sine", 0.08); tone(1320, 0.08, 0.16, "sine", 0.07); break;
      case "ignite": noise(0.5, 0.14, "highpass", 3000); tone(140, 0, 0.5, "sawtooth", 0.05, 70); break;
      case "drum": for (let i = 0; i < 26; i++) noise(0.05, 0.08 + i * 0.006, "bandpass", 300 + i * 12, i * 0.066); break;
      case "cym": noise(1.4, 0.26, "highpass", 4200); tone(98, 0, 0.4, "sine", 0.3, 60); break;
      case "win": [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => { tone(f, i * 0.12, 0.3, "triangle", 0.1); tone(f / 2, i * 0.12, 0.3, "sine", 0.05); }); break;
      case "coin": [1319, 1760, 2093].forEach((f, i) => tone(f, i * 0.06, 0.2, "square", 0.03)); break;
      case "stamp": noise(0.1, 0.3, "lowpass", 700); tone(130, 0, 0.14, "sine", 0.3, 60); break;
    }
  }
  let vibOn = true;
  function vib(p) { try { if (opt.vib && vibOn && navigator.vibrate) navigator.vibrate(p); } catch (e) {} }

  /* ══════════════ BGM（ステップシーケンサー） ══════════════
     16分音符ごとに「ベース・和音・つぶ・ドラム」を鳴らす。音階は MIDI 番号。
     bomb だけは setHeat(0〜1) でテンポと強さが上がる。 */
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const SONGS = {
    title: { bpm: 118, bars: 4, chord: [[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 65]],
      bass: [[36, 0, 0, 36, 0, 0, 36, 0, 0, 0, 36, 0, 43, 0, 0, 0], [33, 0, 0, 33, 0, 0, 33, 0, 0, 0, 33, 0, 40, 0, 0, 0], [29, 0, 0, 29, 0, 0, 29, 0, 0, 0, 29, 0, 36, 0, 0, 0], [31, 0, 0, 31, 0, 0, 31, 0, 0, 0, 38, 0, 43, 0, 41, 0]],
      arp: [0, 2, 1, 3, 2, 1, 3, 2], kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1], snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], vol: 1 },
    play: { bpm: 92, bars: 4, chord: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 56, 59]],
      bass: [[33, 0, 0, 0, 33, 0, 0, 0, 33, 0, 0, 0, 40, 0, 0, 0], [29, 0, 0, 0, 29, 0, 0, 0, 29, 0, 0, 0, 36, 0, 0, 0], [31, 0, 0, 0, 31, 0, 0, 0, 31, 0, 0, 0, 38, 0, 0, 0], [28, 0, 0, 0, 28, 0, 0, 0, 28, 0, 0, 0, 35, 0, 0, 0]],
      arp: [0, 1, 2, 1], kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0], snare: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], vol: 0.62 },
    bomb: { bpm: 84, bars: 2, chord: [[45, 48, 52], [44, 47, 50]],
      bass: [[21, 0, 0, 21, 0, 0, 0, 0, 21, 0, 0, 21, 0, 0, 0, 0], [20, 0, 0, 20, 0, 0, 0, 0, 20, 0, 0, 20, 0, 0, 0, 0]],
      arp: null, kick: [1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0], hat: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], snare: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], vol: 0.72 },
    /* ★★ 2026-11-05 早押しバトル：はずむ短調 */
    rush: { bpm: 138, bars: 2, chord: [[57, 60, 64], [55, 59, 62]],
      bass: [[33, 0, 45, 0, 33, 0, 45, 0, 33, 0, 45, 0, 33, 45, 0, 45], [31, 0, 43, 0, 31, 0, 43, 0, 31, 0, 43, 0, 31, 43, 0, 43]],
      arp: [0, 2, 1, 2], kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1], snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], vol: 0.6 },
    result: { bpm: 128, bars: 4, chord: [[60, 64, 67], [65, 69, 72], [67, 71, 74], [60, 64, 67]],
      bass: [[36, 0, 48, 0, 36, 0, 48, 0, 36, 0, 48, 0, 36, 0, 48, 0], [41, 0, 53, 0, 41, 0, 53, 0, 41, 0, 53, 0, 41, 0, 53, 0], [43, 0, 55, 0, 43, 0, 55, 0, 43, 0, 55, 0, 43, 0, 55, 0], [36, 0, 48, 0, 36, 0, 48, 0, 36, 0, 43, 0, 40, 0, 43, 0]],
      arp: [0, 1, 2, 1, 2, 1], kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0], snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], vol: 0.85 },
  };
  const B = { cur: "", song: null, timer: 0, next: 0, step: 0, bar: 0, heat: 0, paused: false, duck: 1 };
  function drum(kind, t, g) {
    const a = AC; if (!a) return;
    if (kind === "k") {
      const o = a.createOscillator(), v = a.createGain();
      o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
      v.gain.setValueAtTime(0.32 * g, t); v.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      o.connect(v); v.connect(BGG); o.start(t); o.stop(t + 0.18);
    } else {
      const dur = kind === "h" ? 0.04 : 0.12, n = Math.floor(a.sampleRate * dur), bf = a.createBuffer(1, n, a.sampleRate), d = bf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const s = a.createBufferSource(), f = a.createBiquadFilter(), v = a.createGain();
      f.type = "highpass"; f.frequency.value = kind === "h" ? 7000 : 1800; v.gain.value = (kind === "h" ? 0.05 : 0.11) * g;
      s.buffer = bf; s.connect(f); f.connect(v); v.connect(BGG); s.start(t);
    }
  }
  function note(m, t, dur, type, vol) {
    const a = AC; if (!a) return;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.value = mtof(m);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(BGG); o.start(t); o.stop(t + dur + 0.04);
  }
  function schedule() {
    const a = AC; if (!a || !B.song) return;
    const S = B.song;
    while (B.next < a.currentTime + 0.16) {
      const t = B.next, st = B.step, bar = B.bar % S.bars, ch = S.chord[bar], v = S.vol;
      const bpm = S.bpm * (B.cur === "bomb" ? 1 + B.heat * 0.85 : 1), s16 = 60 / bpm / 4;
      const bn = S.bass[bar][st];
      if (bn) note(bn + 12, t, s16 * 2.4, B.cur === "bomb" ? "sawtooth" : "triangle", (B.cur === "bomb" ? 0.1 + B.heat * 0.08 : 0.16) * v);
      if (st === 0) ch.forEach((m) => note(m + (B.cur === "bomb" ? 12 : 0), t, s16 * 15, "sine", 0.03 * v));
      if (S.arp && st % 2 === 0) { const i = S.arp[(st / 2) % S.arp.length] % ch.length; note(ch[i] + 12, t, s16 * 1.8, "triangle", 0.042 * v); }
      if (S.kick[st]) drum("k", t, v);
      if (S.hat[st]) drum("h", t, v);
      if (S.snare[st]) drum("s", t, v);
      B.next += s16;
      B.step = (st + 1) % 16;
      if (B.step === 0) B.bar++;
    }
  }
  function bgm(name) {
    if (name === B.cur && B.timer) return;
    bgmStop();
    B.cur = name || "";
    if (!name || !opt.bgm || !opt.se && !opt.bgm) return;
    if (!ac()) return;
    B.song = SONGS[name]; if (!B.song) return;
    B.step = 0; B.bar = 0; B.next = AC.currentTime + 0.06;
    BGG.gain.cancelScheduledValues(AC.currentTime); BGG.gain.setTargetAtTime(0.55, AC.currentTime, 0.2);
    B.timer = setInterval(schedule, 60);
  }
  function bgmStop() {
    if (B.timer) clearInterval(B.timer);
    B.timer = 0; B.song = null;
  }
  function bgmDuck(on) { if (AC && BGG) BGG.gain.setTargetAtTime(on ? 0.14 : 0.55, AC.currentTime, 0.14); }
  function setHeat(v) { B.heat = Math.max(0, Math.min(1, v)); }
  document.addEventListener("visibilitychange", () => { if (document.hidden) { if (B.timer) { clearInterval(B.timer); B.timer = 0; B.paused = true; } } else if (B.paused) { B.paused = false; if (B.song && AC) { B.next = AC.currentTime + 0.06; B.timer = setInterval(schedule, 60); } } });
  /* iOS は最初のタップまで音が出ない → 最初のタップで音の箱を起こして、待っていた BGM を流す */
  let wanted = "";
  function unlock() {
    ac();
    if (wanted && opt.bgm) { const w = wanted; wanted = ""; B.cur = ""; bgm(w); }
  }
  ["pointerdown", "keydown"].forEach((ev) => document.addEventListener(ev, unlock, { passive: true }));
  function music(name) {
    if (!AC || AC.state !== "running") { wanted = name; B.cur = ""; return; }
    wanted = ""; bgm(name);
  }

  /* ══════════════ 粒（canvas） ══════════════ */
  const C = { cv: null, g: null, W: 0, H: 0, dpr: 1, ps: [], raf: 0, last: 0 };
  function fit() {
    const cv = C.cv || (C.cv = document.getElementById("fxc")); if (!cv) return;
    C.dpr = (window.XevaPerf ? XevaPerf.dpr(2) : Math.min(2, window.devicePixelRatio || 1));   /* ★★ 2026-11-10 動作モード（軽量＝1・標準＝これまで・高解像度＝端末の値） */ C.W = cv.clientWidth || innerWidth; C.H = cv.clientHeight || innerHeight;
    cv.width = Math.round(C.W * C.dpr); cv.height = Math.round(C.H * C.dpr);
    C.g = cv.getContext("2d");
  }
  window.addEventListener("resize", () => { if (C.cv) fit(); });
  function kick() { if (!C.raf) { C.last = performance.now(); C.raf = requestAnimationFrame(frame); } }
  function frame(now) {
    C.raf = 0;
    const g = C.g; if (!g) return;
    const dt = Math.min(0.05, (now - C.last) / 1000); C.last = now;
    g.setTransform(C.dpr, 0, 0, C.dpr, 0, 0); g.clearRect(0, 0, C.W, C.H);
    const ps = C.ps;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.t += dt; if (p.t >= p.life) { ps.splice(i, 1); continue; }
      const k = p.t / p.life;
      if (p.delay && p.t < p.delay) continue;
      p.vx *= Math.pow(p.drag || 1, dt * 60); p.vy = p.vy * Math.pow(p.drag || 1, dt * 60) + (p.gv || 0) * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.r += (p.vr || 0) * dt;
      g.globalAlpha = p.a * (p.fade === false ? 1 : 1 - k);
      if (p.k === "c") {         /* 紙ふぶき */
        g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.scale(1, Math.cos(p.t * p.w)); g.fillStyle = p.c; g.fillRect(-p.s / 2, -p.s * 0.32, p.s, p.s * 0.64); g.restore();
      } else if (p.k === "s") {  /* 火花 */
        g.strokeStyle = p.c; g.lineWidth = p.s; g.lineCap = "round"; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); g.stroke();
      } else if (p.k === "d") {  /* 丸い粒 */
        g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.s * (1 - k * 0.5), 0, 6.3); g.fill();
      } else if (p.k === "r") {  /* 衝撃の輪 */
        g.strokeStyle = p.c; g.lineWidth = p.s * (1 - k); g.beginPath(); g.arc(p.x, p.y, p.r0 + (p.r1 - p.r0) * (1 - Math.pow(1 - k, 3)), 0, 6.3); g.stroke();
      } else if (p.k === "m") {  /* 煙 */
        const R = p.s * (0.6 + k), gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, R);
        gr.addColorStop(0, p.c); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y, R, 0, 6.3); g.fill();
      }
    }
    g.globalAlpha = 1;
    if (ps.length) C.raf = requestAnimationFrame(frame); else g.clearRect(0, 0, C.W, C.H);
  }
  function add(p) { if (!C.cv) fit(); C.ps.push(Object.assign({ t: 0, life: 1, a: 1, vx: 0, vy: 0, r: 0 }, p)); if (C.ps.length > 900) C.ps.splice(0, C.ps.length - 900); kick(); }
  const CONF = ["#ffe33d", "#ff5a7a", "#7ee8ff", "#ffffff", "#b58cff", "#6df0b2", "#ffb020"];
  function confetti(n, from) {
    if (RM()) return;
    if (!C.cv) fit();
    for (let i = 0; i < (n || 80); i++) {
      const x = from ? from.x : Math.random() * C.W, y = from ? from.y : -20 - Math.random() * C.H * 0.3;
      add({ k: "c", x, y, vx: from ? (Math.random() - 0.5) * 760 : (Math.random() - 0.5) * 90, vy: from ? -260 - Math.random() * 620 : 120 + Math.random() * 170, gv: from ? 760 : 60, drag: from ? 0.985 : 1, s: 7 + Math.random() * 7, c: CONF[i % CONF.length], r: Math.random() * 6, vr: (Math.random() - 0.5) * 9, w: 5 + Math.random() * 9, life: 2.4 + Math.random() * 1.5, a: 1 });
    }
  }
  function burst(x, y, n, cols, spd) {
    if (RM()) return;
    cols = cols || CONF;
    for (let i = 0; i < (n || 26); i++) {
      const a = Math.random() * 6.28, v = (spd || 420) * (0.35 + Math.random() * 0.75);
      add({ k: "s", x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, gv: 340, drag: 0.95, s: 2 + Math.random() * 2.4, c: cols[i % cols.length], life: 0.5 + Math.random() * 0.5 });
    }
  }
  /* 爆発：衝撃の輪・破片・煙・画面の白い光・ゆれ */
  function explode(x, y) {
    if (!C.cv) fit();
    x = x == null ? C.W / 2 : x; y = y == null ? C.H / 2 : y;
    const S = Math.max(C.W, C.H);
    flash("#fff", 240);
    if (RM()) return;
    add({ k: "r", x, y, r0: 20, r1: S * 0.8, s: 40, c: "#fff3c4", life: 0.7 });
    add({ k: "r", x, y, r0: 10, r1: S * 0.55, s: 28, c: "#ff8a3d", life: 0.85, delay: 0.05 });
    const cols = ["#ffe33d", "#ffb020", "#ff5a3c", "#fff", "#ff8a3d"];
    for (let i = 0; i < 200; i++) {
      const a = Math.random() * 6.28, v = 120 + Math.random() * S * 1.05;
      add({ k: i % 3 ? "s" : "d", x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, gv: 460, drag: 0.94, s: 2 + Math.random() * 5, c: cols[i % cols.length], life: 0.8 + Math.random() * 0.9 });
    }
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * 6.28, v = 40 + Math.random() * 170;
      add({ k: "m", x: x + Math.cos(a) * 40, y: y + Math.sin(a) * 40, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 50, drag: 0.97, s: 90 + Math.random() * 130, c: i % 2 ? "rgba(60,20,40,.55)" : "rgba(255,110,40,.38)", life: 1.5 + Math.random() * 1.4, a: 0.9 });
    }
  }

  /* ══════════════ 画面の文字・光・ゆれ ══════════════ */
  function flash(color, ms) {
    const fx = document.getElementById("fxt"); if (!fx) return;
    const d = document.createElement("i"); d.className = "fx-flash"; d.style.background = color || "#fff"; d.style.animationDuration = (ms || 240) + "ms";
    fx.appendChild(d); setTimeout(() => d.remove(), (ms || 240) + 60);
  }
  /* 画面の中央に大きな文字／印を出す。cls で色と動きを変える */
  function stamp(html, cls, ms) {
    const fx = document.getElementById("fxt"); if (!fx) return null;
    const d = document.createElement("div"); d.className = "fx-stamp " + (cls || ""); d.innerHTML = html;
    fx.appendChild(d); setTimeout(() => d.remove(), ms || 900);
    return d;
  }
  function shake(cls) {
    if (RM()) return;
    const b = document.body, c = cls || "shake";
    b.classList.remove(c); void b.offsetWidth; b.classList.add(c);
    setTimeout(() => b.classList.remove(c), 900);
  }
  /* 横切る帯（PASS など） */
  function sweep(html, color) {
    const fx = document.getElementById("fxt"); if (!fx) return;
    const d = document.createElement("div"); d.className = "fx-sweep"; d.style.setProperty("--c", color || "#ffe33d"); d.innerHTML = "<span>" + html + "</span>";
    fx.appendChild(d); setTimeout(() => d.remove(), 1000);
  }

  /* ══════════════ 見えない爆弾のまわりの演出 ══════════════
     v＝0〜1 の「危なさ」。色は 紫 → 橙 → 赤。ふちの光は鼓動のように脈打ち、だんだん速く・強く。 */
  const Amb = { on: false, v: 0, tm: 0, last: 0, spark: 0, smoke: 0 };
  function ambEl() { return document.getElementById("amb"); }
  function ambOn(on) {
    const el = ambEl(); if (!el) return;
    Amb.on = !!on; el.classList.toggle("on", !!on);
    if (!on) { el.classList.remove("hot"); document.body.style.removeProperty("--heat"); setHeat(0); }
  }
  /* 時間が止まっているあいだ（解説・手番の受けわたし・一時停止）は、光を弱めて脈打ちも止める */
  function ambCalm(on) { const el = ambEl(); if (el) el.classList.toggle("calm", !!on); }
  function mix(a, b, t) { return a.map((v, i) => Math.round(v + (b[i] - v) * t)); }
  function ambSet(v, dt) {
    Amb.v = v;
    if (!Amb.on) return;
    Amb.tm -= dt;
    if (Amb.tm <= 0) {          /* CSS の値は 0.25 秒ごとに（毎フレーム書くと重い） */
      Amb.tm = 0.25;
      const el = ambEl(); if (!el) return;
      const c = v < 0.5 ? mix([150, 70, 255], [255, 150, 40], v * 2) : mix([255, 150, 40], [255, 30, 40], (v - 0.5) * 2);
      el.style.setProperty("--gc", "rgba(" + c.join(",") + "," + (0.4 + v * 0.5).toFixed(2) + ")");
      el.style.setProperty("--dz", v.toFixed(3));
      el.style.setProperty("--bp", (2.2 - 1.72 * v).toFixed(2) + "s");
      el.classList.toggle("hot", v > 0.72);
      document.body.style.setProperty("--heat", v.toFixed(3));
      setHeat(v);
    }
    if (RM() || !C.W && !fitOnce()) return;
    /* 四隅の火花 */
    Amb.spark -= dt * (0.25 + v * v * 7);
    if (Amb.spark <= 0 && v > 0.3) {
      Amb.spark = 1;
      const cx = Math.random() < 0.5 ? 0 : C.W, cy = Math.random() < 0.5 ? 0 : C.H, n = 3 + Math.round(v * 8);
      for (let i = 0; i < n; i++) add({ k: "s", x: cx, y: cy, vx: (cx ? -1 : 1) * (60 + Math.random() * 300), vy: (cy ? -1 : 1) * (60 + Math.random() * 300), gv: 220, drag: 0.96, s: 1.6 + Math.random() * 2, c: v > 0.6 ? "#ff7a3c" : "#ffd257", life: 0.4 + Math.random() * 0.5 });
    }
    /* 足もとの煙 */
    Amb.smoke -= dt * (0.4 + v * 2.4);
    if (Amb.smoke <= 0 && v > 0.45) {
      Amb.smoke = 1;
      add({ k: "m", x: Math.random() * C.W, y: C.H + 30, vx: (Math.random() - 0.5) * 18, vy: -30 - Math.random() * 50, s: 80 + Math.random() * 90, c: v > 0.7 ? "rgba(120,30,30,.3)" : "rgba(70,30,120,.26)", life: 3 + Math.random() * 2, a: 0.8 });
    }
  }
  function fitOnce() { fit(); return C.W > 0; }

  /* 文字の大きさ（設定） */
  function applyFs() { document.documentElement.style.setProperty("--fs", String(opt.fs || 1)); }
  applyFs();

  MQ.FX = { opt, saveOpt, sfx, vib, music, bgmStop: () => { wanted = ""; B.cur = ""; bgmStop(); }, bgmDuck, confetti, burst, explode, flash, stamp, shake, sweep, ambOn, ambSet, ambCalm, applyFs, RM,
    refreshBgm: () => { const n = B.cur || wanted; if (!opt.bgm) { bgmStop(); return; } if (n) { B.cur = ""; music(n); } }, get bgmName() { return B.cur || wanted; } };
})();
