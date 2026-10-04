/* ============================================================
   MagiAbyss — ma-audio.js
   効果音と BGM（WebAudio でその場で合成するチップチューン。音のファイルは使わない）
   ・最初のタップ（TAP TO START）までは鳴らさない（ブラウザの決まり）。
   ・BGM は場面ごとの短い曲を先読みしながらくり返す（setTimeout の先読みスケジューラ）。
   ============================================================ */
(function () {
  "use strict";
  const MA = (window.MA = window.MA || {});
  let ac = null, master = null, sfxBus = null, bgmBus = null, noiseBuf = null;
  const vol = { bgm: 0.55, se: 0.8 };
  function ensure() {
    if (ac) return ac;
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = 0.9; master.connect(ac.destination);
      sfxBus = ac.createGain(); sfxBus.gain.value = vol.se; sfxBus.connect(master);
      bgmBus = ac.createGain(); bgmBus.gain.value = vol.bgm * 0.5; bgmBus.connect(master);
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 1, ac.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ac = null; }
    return ac;
  }
  function unlock() { ensure(); if (ac && ac.state === "suspended") ac.resume().catch(() => {}); }
  function setVol(bgm, se) {
    if (bgm != null) vol.bgm = bgm; if (se != null) vol.se = se;
    if (sfxBus) sfxBus.gain.value = vol.se;
    if (bgmBus) bgmBus.gain.value = vol.bgm * 0.5;
  }
  /* ── 音の部品 ── */
  function tone(type, f0, f1, t, dur, g0, bus, attack) {
    if (!ac) return;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(g0, t + (attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus || sfxBus);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(t, dur, g0, fType, freq, bus) {
    if (!ac) return;
    const s = ac.createBufferSource(); s.buffer = noiseBuf;
    const f = ac.createBiquadFilter(); f.type = fType || "lowpass"; f.frequency.value = freq || 2000;
    const g = ac.createGain();
    g.gain.setValueAtTime(g0, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(bus || sfxBus);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  /* 同じ音を短い間に何十回も鳴らさない（敵が大量にいるとき） */
  const lastAt = {};
  function gate(k, ms) { const n = performance.now(); if (lastAt[k] && n - lastAt[k] < ms) return false; lastAt[k] = n; return true; }
  const SFX = {
    shot() { if (!gate("shot", 45)) return; const t = ac.currentTime; tone("square", 880, 440, t, 0.06, 0.05); },
    slash() { if (!gate("slash", 60)) return; const t = ac.currentTime; noise(t, 0.08, 0.12, "highpass", 2500); tone("sawtooth", 600, 200, t, 0.07, 0.03); },
    hit() { if (!gate("hit", 30)) return; const t = ac.currentTime; tone("square", 260, 120, t, 0.05, 0.04); },
    crit() { if (!gate("crit", 50)) return; const t = ac.currentTime; tone("square", 1200, 600, t, 0.08, 0.05); tone("triangle", 300, 150, t, 0.1, 0.06); },
    kill() { if (!gate("kill", 40)) return; const t = ac.currentTime; noise(t, 0.09, 0.08, "bandpass", 900); tone("square", 520, 180, t, 0.08, 0.035); },
    hurt() { const t = ac.currentTime; tone("sawtooth", 220, 80, t, 0.18, 0.12); noise(t, 0.12, 0.1, "lowpass", 800); },
    gem() { if (!gate("gem", 35)) return; const t = ac.currentTime; tone("square", 1320 + Math.random() * 200, 1760, t, 0.05, 0.03); },
    coin() { if (!gate("coin", 50)) return; const t = ac.currentTime; tone("square", 988, 988, t, 0.05, 0.04); tone("square", 1318, 1318, t + 0.05, 0.08, 0.04); },
    levelup() { const t = ac.currentTime; [523, 659, 784, 1046].forEach((f, i) => tone("square", f, f, t + i * 0.07, 0.12, 0.06)); tone("triangle", 262, 262, t, 0.4, 0.08); },
    chest() { const t = ac.currentTime; [392, 523, 659, 784, 1046].forEach((f, i) => tone("triangle", f, f, t + i * 0.06, 0.18, 0.07)); },
    dash() { const t = ac.currentTime; noise(t, 0.14, 0.12, "bandpass", 1600); },
    skill() { const t = ac.currentTime; tone("triangle", 660, 1320, t, 0.2, 0.08); noise(t, 0.2, 0.05, "highpass", 4000); },
    ult() { const t = ac.currentTime; [262, 330, 392, 523].forEach((f) => tone("sawtooth", f, f * 2, t, 0.6, 0.05)); noise(t, 0.6, 0.12, "lowpass", 3000); },
    boom() { if (!gate("boom", 60)) return; const t = ac.currentTime; noise(t, 0.3, 0.2, "lowpass", 900); tone("sine", 120, 40, t, 0.3, 0.15); },
    zap() { if (!gate("zap", 60)) return; const t = ac.currentTime; noise(t, 0.12, 0.12, "highpass", 3000); tone("square", 1600, 200, t, 0.1, 0.04); },
    heal() { const t = ac.currentTime; [784, 988, 1175].forEach((f, i) => tone("sine", f, f, t + i * 0.06, 0.2, 0.06)); },
    click() { const t = ac.currentTime; tone("square", 660, 660, t, 0.04, 0.04); },
    back() { const t = ac.currentTime; tone("square", 440, 330, t, 0.06, 0.04); },
    error() { const t = ac.currentTime; tone("square", 160, 140, t, 0.16, 0.06); },
    key() { const t = ac.currentTime; [784, 988, 1175, 1568].forEach((f, i) => tone("square", f, f, t + i * 0.09, 0.16, 0.06)); },
    roar() { const t = ac.currentTime; noise(t, 1.0, 0.25, "lowpass", 500); tone("sawtooth", 90, 45, t, 1.0, 0.12); },
    reso() { const t = ac.currentTime; [523, 784, 1046, 1318, 1568, 2093].forEach((f, i) => tone("triangle", f, f, t + i * 0.05, 0.3, 0.05)); },
    warn() { if (!gate("warn", 120)) return; const t = ac.currentTime; tone("square", 880, 880, t, 0.05, 0.03); },
    step() {},
  };
  function sfx(name) { if (!ac || !vol.se) return; const f = SFX[name]; if (f) try { f(); } catch (e) {} }

  /* ══ BGM：小さなシーケンサ（リード・ベース・ドラム）══
     音名は半音（0＝A4=440 からの差）。null は休み。 */
  const SONGS = {
    title:   { bpm: 92, lead: [3, null, 7, 10, 12, null, 10, 7, 5, null, 8, 12, 15, null, 12, 8], bass: [-21, -21, -14, -14, -16, -16, -9, -9], drum: "k...h...k...h..h", wave: "triangle" },
    guild:   { bpm: 108, lead: [0, 4, 7, 4, 9, 7, 4, 2, 0, 4, 7, 12, 11, 7, 9, null], bass: [-24, -17, -20, -15, -22, -15, -19, -17], drum: "k.h.k.h.k.h.khhh", wave: "square" },
    forest:  { bpm: 126, lead: [7, null, 10, 12, 14, 12, 10, 7, 5, 7, 10, null, 12, 10, 7, 5], bass: [-17, -17, -12, -12, -14, -14, -19, -19], drum: "k.hhs.hhk.hhs.hh", wave: "square" },
    ice:     { bpm: 118, lead: [12, 15, 19, 15, 12, 10, 7, null, 10, 12, 15, 17, 15, 12, 10, null], bass: [-12, -12, -17, -17, -15, -15, -19, -19], drum: "k...s...k.k.s...", wave: "triangle" },
    lava:    { bpm: 140, lead: [0, 3, 5, 6, 7, 6, 5, 3, 0, null, -2, 0, 3, null, 5, 3], bass: [-24, -24, -21, -21, -26, -26, -19, -19], drum: "k.k.s.k.k.k.s.hh", wave: "sawtooth" },
    library: { bpm: 104, lead: [5, 9, 12, 9, 17, 16, 12, 9, 7, 10, 14, 10, 19, 17, 14, null], bass: [-19, -19, -14, -14, -17, -17, -12, -12], drum: "k...h.h.s...h.h.", wave: "triangle" },
    abyss:   { bpm: 96, lead: [0, null, 1, null, 7, 6, null, 3, 0, null, -1, null, 6, 3, 1, null], bass: [-24, -24, -23, -23, -26, -26, -25, -25], drum: "k.....h.s.....h.", wave: "sawtooth" },
    sky:     { bpm: 132, lead: [12, 16, 19, 24, 23, 19, 16, 14, 12, 14, 16, 19, 21, 19, 16, 14], bass: [-12, -12, -10, -10, -8, -8, -7, -5], drum: "k.hhs.hhk.hhs.hk", wave: "square" },
    boss:    { bpm: 156, lead: [0, 0, 3, 0, 5, 0, 6, 5, 0, 0, 3, 0, 7, 6, 5, 3], bass: [-24, -12, -24, -12, -21, -9, -22, -10], drum: "k.k.s.k.k.ks.s.s", wave: "sawtooth" },
    result:  { bpm: 100, lead: [7, 12, 16, 19, 16, 12, 14, 17, 21, 17, 14, 12, 19, null, null, null], bass: [-17, -12, -10, -12, -15, -10, -8, -5], drum: "k...h...k...h...", wave: "triangle" },
  };
  let cur = null, step = 0, nextT = 0, timer = 0;
  const f = (n) => 440 * Math.pow(2, n / 12);
  function schedule() {
    if (!ac || !cur) return;
    const sp = 60 / cur.bpm / 4;   // 16分音符
    while (nextT < ac.currentTime + 0.25) {
      const L = cur.lead[step % cur.lead.length];
      if (L != null && vol.bgm > 0) tone(cur.wave, f(L), f(L), nextT, sp * 1.6, 0.05, bgmBus, 0.01);
      if (step % 2 === 0) { const b = cur.bass[(step / 2) % cur.bass.length]; if (b != null && vol.bgm > 0) tone("triangle", f(b), f(b), nextT, sp * 2.1, 0.11, bgmBus, 0.01); }
      const dch = cur.drum[step % cur.drum.length];
      if (vol.bgm > 0) {
        if (dch === "k") tone("sine", 140, 45, nextT, 0.12, 0.2, bgmBus);
        else if (dch === "s") noise(nextT, 0.08, 0.1, "bandpass", 1800, bgmBus);
        else if (dch === "h") noise(nextT, 0.03, 0.05, "highpass", 7000, bgmBus);
      }
      nextT += sp; step++;
    }
    timer = setTimeout(schedule, 60);
  }
  function bgm(name) {
    if (!ensure()) return;
    if (cur && cur === SONGS[name]) return;
    clearTimeout(timer);
    cur = SONGS[name] || null;
    if (!cur) return;
    step = 0; nextT = ac.currentTime + 0.08;
    schedule();
  }
  function stopBgm() { clearTimeout(timer); cur = null; }
  document.addEventListener("visibilitychange", () => {
    if (!ac) return;
    if (document.hidden) { try { ac.suspend(); } catch (e) {} } else { try { ac.resume(); } catch (e) {} }
  });
  MA.Audio = { unlock, sfx, bgm, stopBgm, setVol, SONGS };
})();
