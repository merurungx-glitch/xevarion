'use strict';
/* ============ MagiCraft 3D: WebAudio 簡易効果音 ============ */
const SFX = (() => {
  let ctx = null;
  function ac(){
    if (!ctx){
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){ return null; }
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function beep(freq, dur, type, vol, slide){
    const c = ac(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, c.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), c.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.08, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g).connect(c.destination);
    o.start(); o.stop(c.currentTime + dur);
  }
  function noise(dur, vol){
    const c = ac(); if (!c) return;
    const n = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, n, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource(), g = c.createGain();
    s.buffer = buf;
    g.gain.value = vol || 0.06;
    s.connect(g).connect(c.destination);
    s.start();
  }
  return {
    unlock(){ ac(); },
    dig(){ noise(0.06, 0.045); },
    breakB(){ noise(0.14, 0.09); beep(180, 0.1, 'square', 0.04, -80); },
    place(){ beep(220, 0.07, 'square', 0.05, 40); },
    hit(){ beep(140, 0.1, 'sawtooth', 0.07, -60); },
    crit(){ beep(520, 0.12, 'sawtooth', 0.08, -240); },
    hurt(){ beep(110, 0.22, 'sawtooth', 0.09, -50); },
    jump(){ },
    pickup(){ beep(660, 0.08, 'sine', 0.05, 220); },
    craft(){ beep(440, 0.09, 'triangle', 0.07, 120); beep(660, 0.12, 'triangle', 0.05, 160); },
    levelup(){ [440, 550, 660, 880].forEach((f, i) => setTimeout(() => beep(f, 0.14, 'triangle', 0.07), i * 90)); },
    gate(){ beep(120, 0.7, 'sine', 0.1, 320); beep(240, 0.7, 'sine', 0.06, 620); },
    boss(){ beep(70, 0.8, 'sawtooth', 0.12, -20); },
    shoot(){ beep(760, 0.12, 'square', 0.045, -420); },
    win(){ [523, 659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => beep(f, 0.22, 'triangle', 0.08), i * 130)); },
    die(){ [220, 180, 140, 90].forEach((f, i) => setTimeout(() => beep(f, 0.25, 'sawtooth', 0.08), i * 140)); },
  };
})();
