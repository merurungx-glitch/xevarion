/* ============================================================
   MagiYacht — BGM（MagiGura Plate と同じ3つからえらぶ）
   ------------------------------------------------------------
     orig … オリジナル曲（この場で WebAudio で作る・音声ファイルなし＝オフラインでも鳴る）
     mine … 自分の曲（端末の中の曲ファイルをえらぶ。この端末の IndexedDB にだけ入れる＝配らない・同期しない）
     off  … 鳴らさない
   ・オリジナル曲は、このアプリのために作ったもの（どの曲の写しでもない）：
     124 BPM・ラウンジ風（ビブラフォン＋ウッドベースの歩くベース＋ブラシ＋指パッチン）。コード進行は16小節でくり返す。
   ・効果音（MY.Audio）とは別の音量。同じ AudioContext を使う。
   ・保存は magiyacht_bgm_v1（{ mode }・端末だけ）。曲ファイルは IndexedDB magiyacht_bgm の f/mine。
   ============================================================ */
(function (root) {
  'use strict';
  const MY = root.MY, AU = MY.Audio;
  const KEY = 'magiyacht_bgm_v1', DB = 'magiyacht_bgm', MAX_MB = 40;
  const VOL = { front: 0.16, play: 0.085 };
  const S = { mode: 'orig', scene: 'front', mineName: '', mineSize: 0, has: false, on: false, gain: null, au: null, auSrc: null, url: '' };
  try { const o = JSON.parse(localStorage.getItem(KEY) || 'null'); if (o && ['orig', 'mine', 'off'].indexOf(o.mode) >= 0) S.mode = o.mode; } catch (e) { /* 初めて */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ mode: S.mode })); } catch (e) { /* 保存できない */ } };

  /* ══ IndexedDB（自分の曲） ══ */
  function db() {
    return new Promise((res, rej) => {
      if (!root.indexedDB) { rej(new Error('idb')); return; }
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => { r.result.createObjectStore('f'); };
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
  }
  async function idb(mode, fn) {
    const d = await db();
    return new Promise((res, rej) => {
      const tx = d.transaction('f', mode), st = tx.objectStore('f'), q = fn(st);
      tx.oncomplete = () => { d.close(); res(q && q.result); };
      tx.onerror = tx.onabort = () => { d.close(); rej(tx.error); };
    });
  }
  const getMine = () => idb('readonly', (st) => st.get('mine')).catch(() => null);
  async function peek() {
    const m = await getMine();
    S.has = !!(m && m.blob); S.mineName = S.has ? String(m.name || '自分の曲') : ''; S.mineSize = S.has ? (m.blob.size || 0) : 0;
    if (!S.has && S.mode === 'mine') { S.mode = 'orig'; save(); }
    return info();
  }

  /* ══ 出口（音量はここ1か所） ══ */
  function out() {
    const ac = AU.ctx(); if (!ac) return null;
    if (!S.gain) { S.gain = ac.createGain(); S.gain.gain.value = 0; S.gain.connect(ac.destination); }
    return S.gain;
  }
  function fade(to, sec) {
    const g = out(), ac = AU.ctx(); if (!g || !ac) return;
    const t = ac.currentTime;
    g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(to, t + (sec || 0.4));
  }

  /* ══ オリジナル曲 ══ */
  const BPM = 124, EIGHTH = 60 / BPM / 2, SWING = EIGHTH * 0.28;
  const CH = {
    FM: [53, 57, 60, 64], Dm: [50, 53, 57, 60], Gm: [55, 58, 62, 65], C7: [48, 52, 55, 58],
    Am: [57, 60, 64, 67], D7: [50, 54, 57, 60], BbM: [58, 62, 65, 69], Bbm: [58, 61, 65, 67]
  };
  const BARS = ['FM', 'Dm', 'Gm', 'C7', 'Am', 'D7', 'Gm', 'C7', 'BbM', 'Bbm', 'Am', 'D7', 'Gm', 'C7', 'FM', 'C7'];
  /* ビブラフォンの型（コードの音の何番目か・null は休み・小数はとなりの音へ寄り道） */
  const PAT = [
    [null, 2, null, 3, 2, null, 1, null], [0, null, 1, 2, null, 3, null, null],
    [3, null, 2, null, 1, null, 2, 0], [null, null, 2, 3, null, null, 1, null], [1, 2, 3, null, 3, 2, null, null]
  ];
  const SEQ = [0, 1, 2, 3, 0, 4, 2, 3, 1, 0, 4, 2, 0, 1, 3, 3];
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  let timer = 0, step = 0, nextT = 0;
  function vib(ac, dest, t, f, dur, vol) {
    const o = ac.createOscillator(), g = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(f, t);
    lfo.frequency.value = 5.2; lg.gain.value = vol * 0.25; lfo.connect(lg); lg.connect(g.gain);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05); lfo.start(t); lfo.stop(t + dur + 0.05);
    const o2 = ac.createOscillator(), g2 = ac.createGain();
    o2.type = 'sine'; o2.frequency.setValueAtTime(f * 3.98, t);
    g2.gain.setValueAtTime(0.0001, t); g2.gain.exponentialRampToValueAtTime(vol * 0.22, t + 0.003); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o2.connect(g2); g2.connect(dest); o2.start(t); o2.stop(t + 0.15);
  }
  function bass(ac, dest, t, f, dur, vol) {
    const o = ac.createOscillator(), g = ac.createGain(), fl = ac.createBiquadFilter();
    o.type = 'triangle'; o.frequency.setValueAtTime(f, t);
    fl.type = 'lowpass'; fl.frequency.value = 520;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(vol * 0.35, t + dur * 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(fl); fl.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
  }
  function brush(ac, dest, t, vol, len) {
    const nb = AU.noiseBuf(); if (!nb) return;
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = nb; f.type = 'highpass'; f.frequency.value = 5200;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + (len || 0.07));
    s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random()); s.stop(t + (len || 0.07) + 0.02);
  }
  function snap(ac, dest, t) {
    const nb = AU.noiseBuf(); if (!nb) return;
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = nb; f.type = 'bandpass'; f.frequency.value = 2100; f.Q.value = 3;
    g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random()); s.stop(t + 0.06);
  }
  function chordStab(ac, dest, t, ch) {
    ch.forEach((m, i) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(mtof(m + 12), t);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.07, t + 0.01 + i * 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.55);
    });
  }
  function playStep(ac, dest, t0, k) {
    const bar = (k >> 3) % BARS.length, e = k & 7, ch = CH[BARS[bar]], nx = CH[BARS[(bar + 1) % BARS.length]];
    const t = t0 + ((e & 1) ? SWING : 0);
    const pi = PAT[SEQ[bar]][e];
    if (pi != null) vib(ac, dest, t, mtof(ch[pi] + 24), EIGHTH * 3.2, 0.34);
    /* 歩くベース（4分音符）：根音 → 5度 → 3度か6度 → 次の根音へ半音で寄る */
    if (!(e & 1)) {
      const q = e >> 1;
      const root0 = ch[0] - 12, next = nx[0] - 12;
      const nt = q === 0 ? root0 : q === 1 ? ch[2] - 12 : q === 2 ? (bar % 2 ? ch[1] - 12 : ch[3] - 12) : next + (next > root0 ? -1 : 1);
      bass(ac, dest, t, mtof(nt), EIGHTH * 1.9, 0.5);
    }
    if (e === 2 || e === 6) snap(ac, dest, t);
    brush(ac, dest, t, (e & 1) ? 0.07 : 0.11, (e & 1) ? 0.05 : 0.09);
    if (e === 3 && bar % 2 === 0) chordStab(ac, dest, t, ch);
  }
  function origStart() {
    const ac = AU.ctx(), dest = out(); if (!ac || !dest || timer) return;
    nextT = ac.currentTime + 0.08;
    timer = setInterval(() => {
      if (!ac || ac.state !== 'running') return;
      while (nextT < ac.currentTime + 0.2) { playStep(ac, dest, nextT, step); step = (step + 1) % (BARS.length * 8); nextT += EIGHTH; }
    }, 30);
  }
  function origStop() { clearInterval(timer); timer = 0; }

  /* ══ 自分の曲 ══ */
  async function mineStart() {
    const ac = AU.ctx(), dest = out(); if (!ac || !dest) return;
    if (!S.au) {
      const m = await getMine(); if (!m || !m.blob) { S.has = false; return; }
      if (S.url) URL.revokeObjectURL(S.url);
      S.url = URL.createObjectURL(m.blob);
      S.au = new Audio(); S.au.loop = true; S.au.preload = 'auto'; S.au.src = S.url;
      try { S.auSrc = ac.createMediaElementSource(S.au); S.auSrc.connect(dest); } catch (e) { S.auSrc = null; S.au.volume = 0.5; }
    }
    try { await S.au.play(); } catch (e) { /* つぎのタップで */ }
  }
  function mineStop() { try { if (S.au) S.au.pause(); } catch (e) { /* 止まっている */ } }
  function mineDrop() { mineStop(); if (S.auSrc) { try { S.auSrc.disconnect(); } catch (e) { /* なし */ } } S.au = null; S.auSrc = null; if (S.url) { URL.revokeObjectURL(S.url); S.url = ''; } }

  /* ══ 鳴らす・止める ══ */
  function apply() {
    const want = S.mode !== 'off' && !document.hidden && S.on;
    if (!want) { fade(0, 0.25); setTimeout(() => { if (!(S.mode !== 'off' && !document.hidden && S.on)) { origStop(); mineStop(); } }, 300); return; }
    if (S.mode === 'orig') { mineStop(); origStart(); }
    else { origStop(); mineStart(); }
    fade(VOL[S.scene] || VOL.front, 0.6);
  }
  function kick() { AU.unlock(); if (!S.on) { S.on = true; apply(); } else if (S.mode === 'mine' && S.au && S.au.paused) mineStart(); }
  function scene(s) { S.scene = s; if (S.on) fade(S.mode === 'off' ? 0 : VOL[s] || VOL.front, 0.8); }
  function setMode(m) {
    if (['orig', 'mine', 'off'].indexOf(m) < 0) return;
    if (m === 'mine' && !S.has) return;
    S.mode = m; save();
    if (S.on) { origStop(); mineStop(); apply(); }
  }
  async function pickFile(file) {
    if (!file) return { error: 'none' };
    if (!/^audio\//.test(file.type || '') && !/\.(m4a|mp3|aac|wav|ogg|oga|flac|caf)$/i.test(file.name || '')) return { error: 'type' };
    if (file.size > MAX_MB * 1048576) return { error: 'big' };
    try { await idb('readwrite', (st) => st.put({ name: file.name, type: file.type, blob: file, at: Date.now() }, 'mine')); } catch (e) { return { error: 'save' }; }
    mineDrop();
    S.has = true; S.mineName = file.name; S.mineSize = file.size;
    S.mode = 'mine'; save();
    kick(); origStop(); apply();
    return { ok: true };
  }
  async function clearMine() {
    mineDrop();
    try { await idb('readwrite', (st) => st.delete('mine')); } catch (e) { /* 無い */ }
    S.has = false; S.mineName = ''; S.mineSize = 0;
    if (S.mode === 'mine') { S.mode = 'orig'; save(); if (S.on) apply(); }
  }
  function info() { return { mode: S.mode, has: S.has, name: S.mineName, size: S.mineSize }; }
  const LABEL = { orig: 'オリジナル曲', mine: '自分の曲', off: 'オフ' };
  function next() { setMode(S.mode === 'orig' ? (S.has ? 'mine' : 'off') : S.mode === 'mine' ? 'off' : 'orig'); return S.mode; }

  document.addEventListener('visibilitychange', () => { if (S.on) apply(); });
  document.addEventListener('pointerdown', kick, true);
  peek();

  MY.Bgm = { kick, scene, setMode, next, pickFile, clearMine, info, peek, LABEL, MAX_MB };
})(window);
