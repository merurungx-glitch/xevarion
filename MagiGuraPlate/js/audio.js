/* MagiGura Plate — 音（WebAudio でその場で作る。音声ファイルは使わない） */
(function (root) {
  'use strict';
  const GP = root.GP;
  let ac = null, master = null, noiseBuf = null, on = true;
  let slideSrc = null, slideGain = null, slideFilt = null, lastHit = 0;

  function init() {
    if (ac) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      ac = new AC();
      master = ac.createGain(); master.gain.value = on ? 0.8 : 0; master.connect(ac.destination);
      const n = ac.sampleRate * 1.5 | 0;
      noiseBuf = ac.createBuffer(1, n, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      slideSrc = ac.createBufferSource(); slideSrc.buffer = noiseBuf; slideSrc.loop = true;
      slideFilt = ac.createBiquadFilter(); slideFilt.type = 'bandpass'; slideFilt.frequency.value = 1100; slideFilt.Q.value = 0.7;
      slideGain = ac.createGain(); slideGain.gain.value = 0;
      slideSrc.connect(slideFilt); slideFilt.connect(slideGain); slideGain.connect(master);
      slideSrc.start();
    } catch (e) { ac = null; return false; }
    return true;
  }
  function unlock() { if (init() && ac.state === 'suspended') ac.resume(); }

  function tone(f, dur, type, vol, delay, f2) {
    if (!ac || !on) return;
    const t = ac.currentTime + (delay || 0), o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.03);
  }
  function noise(dur, vol, freq, q, delay, type) {
    if (!ac || !on) return;
    const t = ac.currentTime + (delay || 0), s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; s.loop = true;
    f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = q || 1;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t, Math.random()); s.stop(t + dur + 0.03);
  }

  /* 材質ごとの「置いた音」 */
  function knock(mat, vol) {
    vol = vol || 0.5;
    if (mat === 'wood') { tone(240, 0.11, 'triangle', vol, 0, 150); noise(0.05, vol * 0.5, 1800, 1.2); }
    else if (mat === 'ice') { tone(1750, 0.22, 'sine', vol * 0.45, 0, 1500); tone(2640, 0.13, 'sine', vol * 0.22); noise(0.03, vol * 0.3, 5200, 2); }
    else if (mat === 'rubber') { tone(120, 0.14, 'sine', vol * 1.1, 0, 70); noise(0.06, vol * 0.25, 500, 0.8); }
    else { tone(420, 0.3, 'square', vol * 0.2, 0, 400); tone(1130, 0.4, 'sine', vol * 0.3); tone(1730, 0.25, 'sine', vol * 0.16); noise(0.04, vol * 0.4, 3000, 1.5); }
  }

  const A = {
    /* ★★ 2026-11-17 XEVARION 版の BGM（js/bgm.js）が同じ AudioContext を使う（iPad はタップで1つ起こせば足りる） */
    ctx: function () { return init() ? ac : null; },
    noiseBuf: function () { return noiseBuf; },
    unlock: unlock,
    setOn: function (v) { on = !!v; if (master) master.gain.value = on ? 0.8 : 0; },
    isOn: function () { return on; },
    place: function (mat, mass) { knock(mat, 0.4 + 0.07 * mass); tone(70, 0.2, 'sine', 0.25 + 0.06 * mass, 0, 45); },
    hit: function (mat, strength) {
      if (!ac) return;
      const now = ac.currentTime;
      if (now - lastHit < 0.045) return;
      lastHit = now;
      knock(mat, Math.min(0.5, 0.1 + strength * 0.6));
    },
    slide: function (level) {                              // すべっている間ずっと鳴るこすれ音
      if (!ac || !slideGain) return;
      const v = on ? Math.min(0.32, level * 0.09) : 0;
      slideGain.gain.setTargetAtTime(v, ac.currentTime, 0.05);
      slideFilt.frequency.setTargetAtTime(700 + Math.min(1800, level * 500), ac.currentTime, 0.08);
    },
    fall: function () { tone(900, 0.42, 'sine', 0.22, 0, 180); },
    clack: function (mat) { knock(mat, 0.28); noise(0.08, 0.12, 900, 0.7); },
    stop: function (v) { tone(90, 0.25, 'sine', Math.min(0.7, 0.25 + v * 0.3), 0, 50); noise(0.1, 0.25, 300, 0.6); },
    turn: function () { tone(660, 0.09, 'triangle', 0.22); tone(880, 0.14, 'triangle', 0.22, 0.08); },
    safe: function () { tone(784, 0.09, 'sine', 0.25); tone(1175, 0.2, 'sine', 0.25, 0.09); },
    back: function (i) { tone(520 - Math.min(8, i) * 28, 0.12, 'square', 0.12); },
    bad: function () { tone(180, 0.16, 'sawtooth', 0.16, 0, 120); },
    tap: function () { tone(1040, 0.05, 'triangle', 0.14); },
    rotate: function () { tone(700, 0.05, 'triangle', 0.14); tone(930, 0.06, 'triangle', 0.12, 0.04); },
    lift: function () { tone(500, 0.08, 'sine', 0.14, 0, 760); },
    win: function () {
      const n = [523, 659, 784, 1047, 784, 1047, 1319];
      for (let i = 0; i < n.length; i++) { tone(n[i], 0.26, 'triangle', 0.26, i * 0.11); tone(n[i] / 2, 0.26, 'sine', 0.16, i * 0.11); }
    },
    crash: function (n) { noise(0.5, Math.min(0.5, 0.2 + n * 0.04), 380, 0.5, 0, 'lowpass'); tone(110, 0.5, 'sawtooth', 0.14, 0, 55); }
  };
  GP.Audio = A;
})(window);
