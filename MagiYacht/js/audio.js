/* ============================================================
   MagiYacht — 効果音（WebAudio でその場で作る。音声ファイルは使わない＝オフラインでも鳴る）
   ・サイコロ：床（フェルト）に落ちる・ふちに当たる・サイコロどうし・手の中でカラカラ
   ・キープ・欄をえらぶ・書く（点が大きいほど音が増える）・0点・ヨット・ボーナス・番・結果
   ・BGM（js/bgm.js）と同じ AudioContext を使う（iPad はタップで1つ起こせば足りる）
   ============================================================ */
(function (root) {
  'use strict';
  const MY = root.MY = root.MY || {};
  const KEY = 'magiyacht_opt_v1';
  let ac = null, master = null, noiseBuf = null;
  const O = { se: true, vib: true };
  try { const o = JSON.parse(localStorage.getItem(KEY) || 'null'); if (o) { if (o.se === false) O.se = false; if (o.vib === false) O.vib = false; } } catch (e) { /* 初めて */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(O)); } catch (e) { /* 保存できない */ } };

  function init() {
    if (ac) return true;
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return false;
    try {
      ac = new AC();
      master = ac.createGain(); master.gain.value = O.se ? 0.85 : 0; master.connect(ac.destination);
      const n = (ac.sampleRate * 1.2) | 0;
      noiseBuf = ac.createBuffer(1, n, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ac = null; return false; }
    return true;
  }
  function unlock() { if (init() && ac.state === 'suspended') ac.resume(); }

  function tone(f, dur, type, vol, delay, f2) {
    if (!ac || !O.se) return;
    const t = ac.currentTime + (delay || 0), o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.03);
  }
  function noise(dur, vol, freq, q, delay, type) {
    if (!ac || !O.se) return;
    const t = ac.currentTime + (delay || 0), s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = q || 1;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * 0.8); s.stop(t + dur + 0.03);
  }
  /* ふるえる：自分の操作（キープ・書く・ヨット）のときだけ。画面にふれる前はブラウザが止めるので呼ばない */
  const vib = (ms) => {
    if (!O.vib || !navigator.vibrate) return;
    const ua = navigator.userActivation; if (ua && !ua.hasBeenActive) return;
    try { navigator.vibrate(ms); } catch (e) { /* 使えない */ }
  };

  const A = {
    ctx: () => (init() ? ac : null),
    noiseBuf: () => noiseBuf,
    unlock,
    isOn: () => O.se, setOn(v) { O.se = !!v; save(); if (master) master.gain.value = O.se ? 0.85 : 0; },
    vibOn: () => O.vib, setVib(v) { O.vib = !!v; save(); },
    /* サイコロが当たった：k＝floor（フェルト）/wall（ふち）/die（サイコロどうし）・s＝強さ 0〜1 */
    hit(k, s) {
      if (!ac) return;
      s = Math.max(0.08, Math.min(1, s));
      if (k === 'die') { noise(0.035, 0.32 * s, 3400 + Math.random() * 900, 2.4); tone(1900 + Math.random() * 500, 0.03, 'triangle', 0.12 * s); }
      else if (k === 'wall') { tone(260 + Math.random() * 40, 0.08, 'triangle', 0.36 * s, 0, 170); noise(0.05, 0.22 * s, 1500, 1.2); }
      else { tone(130 + Math.random() * 30, 0.09, 'sine', 0.4 * s, 0, 70); noise(0.06, 0.2 * s, 700, 0.8, 0, 'lowpass'); noise(0.02, 0.14 * s, 2600, 2); }
    },
    rattle() { if (!ac) return; noise(0.025, 0.12 + Math.random() * 0.08, 2800 + Math.random() * 1600, 3); if (Math.random() < 0.5) tone(1600 + Math.random() * 900, 0.02, 'triangle', 0.05); },
    grab() { tone(420, 0.07, 'sine', 0.14, 0, 620); },
    keep() { tone(660, 0.06, 'triangle', 0.16); tone(990, 0.08, 'triangle', 0.14, 0.05); vib(10); },
    unkeep() { tone(880, 0.06, 'triangle', 0.13); tone(590, 0.08, 'triangle', 0.12, 0.05); },
    tap() { tone(1040, 0.045, 'triangle', 0.12); },
    pick() { tone(760, 0.05, 'triangle', 0.14); tone(1140, 0.07, 'sine', 0.1, 0.04); },
    /* 点を書いた：点が大きいほど上がっていく音が増える */
    write(pts) {
      if (!pts) { tone(220, 0.16, 'square', 0.08, 0, 150); tone(150, 0.22, 'sine', 0.2, 0.05, 110); return; }
      const n = pts >= 40 ? 5 : pts >= 25 ? 4 : pts >= 15 ? 3 : 2;
      const sc = [659, 784, 988, 1175, 1319];
      for (let i = 0; i < n; i++) tone(sc[i], 0.18, 'triangle', 0.17, i * 0.07);
      vib(15);
    },
    yacht() {
      const n = [523, 659, 784, 1047, 1319, 1568, 2093];
      n.forEach((f, i) => { tone(f, 0.3, 'triangle', 0.2, i * 0.075); tone(f * 2, 0.22, 'sine', 0.06, i * 0.075 + 0.02); });
      for (let i = 0; i < 8; i++) tone(2400 + Math.random() * 1800, 0.12, 'sine', 0.05, 0.55 + i * 0.06);
      vib([30, 40, 30, 40, 60]);
    },
    bonus() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.22, 'sine', 0.18, i * 0.09)); },
    turn() { tone(587, 0.08, 'triangle', 0.16); tone(880, 0.12, 'triangle', 0.16, 0.08); },
    bad() { tone(190, 0.15, 'sawtooth', 0.12, 0, 130); },
    win() {
      const n = [523, 659, 784, 1047, 784, 1047, 1319];
      n.forEach((f, i) => { tone(f, 0.28, 'triangle', 0.22, i * 0.12); tone(f / 2, 0.28, 'sine', 0.14, i * 0.12); });
    },
    drum() { for (let i = 0; i < 14; i++) noise(0.05, 0.08 + i * 0.012, 300, 0.7, i * 0.07, 'lowpass'); }
  };
  MY.Audio = A;
})(window);
