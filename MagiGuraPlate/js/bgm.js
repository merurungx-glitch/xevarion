/* ============================================================
   MagiGura Plate — BGM（XEVARION 版）
   ★★ 2026-11-17 ご指定「MagiGura Plate 用の曲（添付の m4a）を使ってよい」「曲はオフも可能」
   ------------------------------------------------------------
   ・えらべるのは3つ：
       orig … オリジナル曲（この場で WebAudio で作る・音声ファイルなし＝オフラインでも鳴る）
       mine … 自分の曲（端末の中の曲ファイルをえらぶ。この端末の IndexedDB にだけ入れる＝配らない・同期しない）
       off  … 鳴らさない
   ★ 添付の曲（YouTube の「リコーダーでタイタニックのテーマ」）は、映画の主題歌のメロディと投稿者の録音（どちらも著作物）なので、
     公開している XEVARION には入れない（ジェフ千葉のホームの BGM と同じ扱い）。iPad で「自分の曲」としてえらべば流せる。
   ・効果音（GP.Audio の ON/OFF）とは別。同じ AudioContext を使う（iPad はタップで1つ起こせば足りる）。
   ・音量：はじめの画面・準備はふつう、ゲーム中は少し小さく（皿とコマの音が聞こえるように）。
   ・保存は guraplate_bgm_v1（{ mode }・端末だけ）。曲ファイルは IndexedDB guraplate_bgm の f/mine。
   ============================================================ */
(function (root) {
  'use strict';
  const GP = root.GP, AU = GP.Audio;
  const KEY = 'guraplate_bgm_v1', DB = 'guraplate_bgm', MAX_MB = 40;
  const VOL = { front: 0.17, play: 0.1 };
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

  /* ══ オリジナル曲（116 BPM・16小節でくり返す・マリンバ＋ピチカートのベース＋シェイカー＋グロッケン） ══
     コードと音の型は、このアプリのために作ったもの（どの曲の写しでもない） */
  const BPM = 116, EIGHTH = 60 / BPM / 2;
  const CH = { C: [60, 64, 67], G: [55, 59, 62], Am: [57, 60, 64], F: [53, 57, 60], Em: [52, 55, 59], Dm: [50, 53, 57] };
  const BARS = ['C', 'G', 'Am', 'F', 'C', 'F', 'G', 'G', 'F', 'G', 'Em', 'Am', 'Dm', 'G', 'C', 'C'];
  const PAT = [
    [0, null, 2, 1, 2, null, 3, 2], [3, 2, 1, null, 2, 1, 0, null], [1, 2, 3, null, 3, 2, 1, 2], [2, null, null, 1, 0, null, null, null]
  ];
  const SEQ = [0, 1, 0, 2, 0, 1, 2, 3, 1, 0, 2, 1, 0, 2, 1, 3];
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  let timer = 0, step = 0, nextT = 0;
  function note(ac, dest, t, f, dur, type, vol, partial) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
    if (partial) {                                   /* マリンバらしい高い倍音（すぐ消える） */
      const o2 = ac.createOscillator(), g2 = ac.createGain();
      o2.type = 'sine'; o2.frequency.setValueAtTime(f * 4, t);
      g2.gain.setValueAtTime(0.0001, t); g2.gain.exponentialRampToValueAtTime(vol * 0.35, t + 0.004); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      o2.connect(g2); g2.connect(dest); o2.start(t); o2.stop(t + 0.12);
    }
  }
  function shaker(ac, dest, t, vol) {
    const nb = AU.noiseBuf(); if (!nb) return;
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = nb; f.type = 'highpass'; f.frequency.value = 6500;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random()); s.stop(t + 0.07);
  }
  function kick(ac, dest, t) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.16);
    g.gain.setValueAtTime(0.55, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.22);
  }
  function playStep(ac, dest, t, k) {
    const bar = (k >> 3) % BARS.length, e = k & 7, ch = CH[BARS[bar]];
    const tones = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[0] + 24];
    const pi = PAT[SEQ[bar]][e];
    if (pi != null) note(ac, dest, t, mtof(tones[pi]), EIGHTH * 2.4, 'sine', 0.42, true);
    if (e === 0) { note(ac, dest, t, mtof(ch[0] - 12), EIGHTH * 1.6, 'triangle', 0.5); kick(ac, dest, t); }
    if (e === 4) note(ac, dest, t, mtof(ch[2] - 12), EIGHTH * 1.6, 'triangle', 0.42);
    if (e === 7) note(ac, dest, t, mtof(ch[1] - 12), EIGHTH * 0.9, 'triangle', 0.3);
    if (e & 1) shaker(ac, dest, t, 0.16);
    if (e === 0 && !(bar & 1)) note(ac, dest, t + EIGHTH * 0.5, mtof(ch[2] + 24), EIGHTH * 5, 'sine', 0.1);
  }
  function origStart() {
    const ac = AU.ctx(), dest = out(); if (!ac || !dest || timer) return;
    nextT = ac.currentTime + 0.08;
    timer = setInterval(() => {
      if (!ac || ac.state !== 'running') return;
      while (nextT < ac.currentTime + 0.18) { playStep(ac, dest, nextT, step); step = (step + 1) % (BARS.length * 8); nextT += EIGHTH; }
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
  /* はじめてのタップのあと（ブラウザは、さわる前は音を出させない） */
  function kick() { AU.unlock(); if (!S.on) { S.on = true; apply(); } else if (S.mode === 'mine' && S.au && S.au.paused) mineStart(); }
  function scene(s) { S.scene = s; if (S.on) fade(S.mode === 'off' ? 0 : VOL[s] || VOL.front, 0.8); }
  function setMode(m) {
    if (['orig', 'mine', 'off'].indexOf(m) < 0) return;
    if (m === 'mine' && !S.has) return;
    S.mode = m; save();
    if (S.on) { origStop(); mineStop(); apply(); }
  }
  /* 自分の曲をえらぶ（端末のファイル → この端末の IndexedDB にだけ入れる） */
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

  GP.Bgm = { kick, scene, setMode, next, pickFile, clearMine, info, peek, LABEL, MAX_MB };
})(window);
