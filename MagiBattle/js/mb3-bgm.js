/* ============================================================
   MagiBattle 3.0 — mb3-bgm.js（オリジナル BGM）
   ★★ 2026-10-31 ご指定「オリジナル BGM をそれぞれ付けて」
   ・音のファイルは使わず、WebAudio でその場に曲を組み立てて鳴らす（ドラム・ベース・和音・アルペジオ・メロディ）。
   ・曲（TRACKS）：タイトル／ロビー／育成・編成（メニュー）／ストーリー／キャンペーン（章ごとに6曲）／ボス／アリーナ／迎撃戦／タワー。
     メロディはそれぞれの曲の合い言葉（seed）から作る＝毎回同じ曲・曲ごとにちがう旋律（A A' B C の8小節を繰り返す）。
   ・MB3.BGM.play("lobby") で切りかえ（0.7秒でクロスフェード）。設定の「BGM」と音量（Save の set.bgm／set.bgmVol）。
   ・音を出せるのは画面にさわったあと（ブラウザの決まり）。それまでは鳴らす曲だけ覚えておき、さわったら始める。
   ============================================================ */
(function () {
  "use strict";
  const MB3 = (window.MB3 = window.MB3 || {});
  const BGM = (MB3.BGM = {});
  let ac = null, out = null, bus = null, dly = null, noiseBuf = null;
  let cur = null, want = null, timer = 0, nextT = 0, step = 0, on = true, vol = 0.55, hiddenPause = false, duckT = 0;
  const NF = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], phrygian: [0, 1, 3, 5, 7, 8, 10], hminor: [0, 2, 3, 5, 7, 8, 11] };

  /* ══════════ 曲 ══════════
     prog … 8小節の和音（音階の何番目・0 はじまり。"4M" は長三和音にする・"1b" はフリギアの bII）
     k/s/h/c … ドラム（16分の16マス：x＝打つ・o＝強く・.＝なし）。bass … R 根音・5 五度・o オクターブ上・3 三度・. のばす・- 休む
     arp … 和音の音の並び（0 1 2 3＝根音・3度・5度・オクターブ）と速さ。lead … メロディの音色・密度・音域 */
  const TRACKS = {
    title:  { bpm: 92, root: 50, sc: "minor", prog: ["0", "5", "2", "6", "0", "5", "3", "4M"], k: "o...........x...", s: "................", h: "", c: "", bass: "R.......R...5...", pad: 0.15, arp: { p: "0120", every: 2, v: 0.08, w: "triangle", oct: 2 }, lead: { w: "sawtooth", dens: 0.35, v: 0.12, oct: 1, cut: 1800 }, tom: 1 },
    lobby:  { bpm: 112, root: 53, sc: "major", prog: ["0", "4", "5", "3", "0", "4", "3", "4"], k: "x.......x.......", s: "....x.......x...", h: "..x...x...x...x.", c: "", bass: "R...R.R.R...R.5.", pad: 0.08, arp: { p: "0121", every: 2, v: 0.09, w: "pluck", oct: 2 }, lead: { w: "bell", dens: 0.55, v: 0.12, oct: 1 } },
    menu:   { bpm: 96, root: 57, sc: "major", prog: ["3", "4", "2", "5", "3", "4", "0", "0"], k: "x.....x...x.....", s: "....x.......x...", h: "x.x.x.x.x.x.x.x.", c: "", bass: "R.....R...R.5...", pad: 0.1, arp: { p: "0123", every: 4, v: 0.07, w: "triangle", oct: 2 }, lead: { w: "triangle", dens: 0.4, v: 0.11, oct: 1 }, soft: 1 },
    story:  { bpm: 76, root: 48, sc: "major", prog: ["0", "5", "3", "4", "0", "5", "3", "4"], k: "", s: "", h: "", c: "", bass: "R.......5.......", pad: 0.12, arp: { p: "0121", every: 1, v: 0.06, w: "bell", oct: 2 }, lead: { w: "bell", dens: 0.3, v: 0.1, oct: 1 }, soft: 1 },
    battle1:{ bpm: 146, root: 52, sc: "minor", prog: ["0", "5", "6", "0", "0", "5", "6", "4M"], k: "x...x...x...x...", s: "....x.......x...", h: ".x.x.x.x.x.x.x.x", c: "", bass: "R.RoR.RoR.RoR.Ro", pad: 0.06, arp: { p: "0120", every: 1, v: 0.06, w: "square", oct: 2 }, lead: { w: "square", dens: 0.7, v: 0.1, oct: 1 } },
    battle2:{ bpm: 142, root: 54, sc: "minor", prog: ["0", "3", "5", "6", "0", "3", "6", "4M"], k: "x...x...x..xx...", s: "....x.......x...", h: "xxx.xxx.xxx.xxx.", c: "", bass: "R.R.R.oRR.R.R.5o", pad: 0.06, arp: { p: "0212", every: 1, v: 0.06, w: "triangle", oct: 2 }, lead: { w: "sawtooth", dens: 0.65, v: 0.09, oct: 1, cut: 2600 } },
    battle3:{ bpm: 150, root: 50, sc: "phrygian", prog: ["0", "1", "0", "6", "0", "1", "5", "6"], k: "x..x..x.x..x..x.", s: "....x.......x...", h: ".x.x.x.x.x.x.x.x", c: "", bass: "RRR.RRo.RRR.R5o.", pad: 0.05, arp: { p: "0102", every: 1, v: 0.06, w: "square", oct: 2 }, lead: { w: "square", dens: 0.7, v: 0.1, oct: 1 } },
    battle4:{ bpm: 140, root: 47, sc: "minor", prog: ["0", "5", "2", "6", "3", "5", "6", "4M"], k: "x...x...x...x...", s: "....x.......x...", h: "..x...x...x...x.", c: "", bass: "R.R.oR.RR.R.oR.5", pad: 0.08, arp: { p: "0123", every: 1, v: 0.07, w: "bell", oct: 2 }, lead: { w: "triangle", dens: 0.65, v: 0.12, oct: 1 } },
    battle5:{ bpm: 152, root: 48, sc: "minor", prog: ["0", "0", "5", "6", "0", "0", "6", "4M"], k: "x.x.x...x.x.x...", s: "....x.......x...", h: ".xxx.xxx.xxx.xxx", c: "", bass: "RRoRRRoRRRoRR5oR", pad: 0.05, arp: { p: "0101", every: 1, v: 0.05, w: "square", oct: 1 }, lead: { w: "sawtooth", dens: 0.7, v: 0.09, oct: 1, cut: 2200 }, heavy: 1 },
    battle6:{ bpm: 148, root: 56, sc: "dorian", prog: ["0", "3", "0", "6", "0", "3", "5", "4M"], k: "x...x...x...x...", s: "....x.......x..x", h: ".x.x.x.x.x.x.x.x", c: "", bass: "R.oR.oR.R.oR.o5.", pad: 0.07, arp: { p: "0213", every: 1, v: 0.06, w: "pluck", oct: 2 }, lead: { w: "square", dens: 0.68, v: 0.1, oct: 1 } },
    boss:   { bpm: 160, root: 48, sc: "phrygian", prog: ["0", "1", "6", "0", "0", "1", "5", "4M"], k: "x.x.x.x.x.x.x.x.", s: "....x.......x...", h: "xxxxxxxxxxxxxxxx", c: "", bass: "RRRRRRRRRRRRoRRR", pad: 0.07, arp: { p: "0120", every: 1, v: 0.05, w: "square", oct: 2 }, lead: { w: "sawtooth", dens: 0.75, v: 0.1, oct: 1, cut: 3000 }, heavy: 1 },
    arena:  { bpm: 128, root: 55, sc: "minor", prog: ["0", "3", "6", "2", "0", "3", "6", "4M"], k: "x..x..x...x..x..", s: "....x.......x...", h: ".x.x.x.x.x.x.x.x", c: "....x.......x...", bass: "R..R..o...R..5..", pad: 0.06, arp: { p: "0212", every: 2, v: 0.07, w: "pluck", oct: 2 }, lead: { w: "square", dens: 0.6, v: 0.1, oct: 1 } },
    icpt:   { bpm: 118, root: 50, sc: "hminor", prog: ["0", "0", "5", "4M", "0", "0", "6", "4M"], k: "x.........x.....", s: "........x.......", h: "x.x.x.x.x.x.x.x.", c: "", bass: "R.......R...R.o.", pad: 0.1, arp: { p: "0120", every: 2, v: 0.06, w: "triangle", oct: 2 }, lead: { w: "sawtooth", dens: 0.5, v: 0.1, oct: 0, cut: 1600 }, heavy: 1 },
    tower:  { bpm: 132, root: 47, sc: "dorian", prog: ["0", "6", "5", "6", "0", "6", "3", "4"], k: "x...x...x...x...", s: "....x.......x...", h: "..x...x...x...x.", c: "", bass: "R.R.R.R.R.R.R.R.", pad: 0.06, arp: { p: "0124", every: 1, v: 0.08, w: "pluck", oct: 2 }, lead: { w: "triangle", dens: 0.55, v: 0.11, oct: 1 } },
  };
  BGM.TRACKS = TRACKS;
  BGM.NAMES = { title: "VANGUARD", lobby: "Sunny Barracks", menu: "Tactics Room", story: "Afterglow", battle1: "Astera Breakout", battle2: "Dusk Harbor Run", battle3: "Sand Corridor",
    battle4: "White Night", battle5: "Steel Fortress", battle6: "Void Capital", boss: "Hollow Crown", arena: "Rookie Arena", icpt: "Interception", tower: "Vanguard Tower" };

  /* ══════════ 下ごしらえ ══════════ */
  function ctx() { try { return MB3.Audio && MB3.Audio.ctx ? MB3.Audio.ctx() : null; } catch (e) { return null; } }
  function ensure() {
    if (out) return true;
    const a = ctx(); if (!a) return false;
    ac = a;
    out = a.createGain(); out.gain.value = 0;
    const comp = a.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
    out.connect(comp); comp.connect(a.destination);
    bus = a.createGain(); bus.gain.value = 1; bus.connect(out);
    /* 少しだけ響き（ディレイ） */
    dly = a.createDelay(1); dly.delayTime.value = 0.28; const fb = a.createGain(); fb.gain.value = 0.28; const wet = a.createGain(); wet.gain.value = 0.22;
    dly.connect(fb); fb.connect(dly); dly.connect(wet); wet.connect(out);
    noiseBuf = a.createBuffer(1, a.sampleRate * 0.5, a.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }
  function env(g, t, a, peak, dur, rel) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.setValueAtTime(peak, t + Math.max(a, dur - rel)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
  function noise(t, dur, type, f, q, v) { const s = ac.createBufferSource(); s.buffer = noiseBuf; const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q || 1; const g = ac.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(fl); fl.connect(g); g.connect(bus); s.start(t); s.stop(t + dur + 0.02); }

  /* ── 楽器 ── */
  const INS = {
    kick(t, v, heavy) { const o = ac.createOscillator(); o.type = "sine"; o.frequency.setValueAtTime(heavy ? 170 : 150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.13); const g = ac.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + (heavy ? 0.36 : 0.28)); o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.4); },
    snare(t, v) { noise(t, 0.16, "bandpass", 1900, 0.8, v * 0.8); const o = ac.createOscillator(); o.type = "triangle"; o.frequency.setValueAtTime(200, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.08); const g = ac.createGain(); g.gain.setValueAtTime(v * 0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1); o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.12); },
    clap(t, v) { [0, 0.012, 0.024].forEach((d) => noise(t + d, 0.08, "bandpass", 1300, 1.4, v * 0.6)); },
    hat(t, v, open) { noise(t, open ? 0.14 : 0.035, "highpass", 7600, 0.7, v); },
    tom(t, v, m) { const o = ac.createOscillator(); o.type = "sine"; o.frequency.setValueAtTime(NF(m), t); o.frequency.exponentialRampToValueAtTime(NF(m) * 0.6, t + 0.3); const g = ac.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45); o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.5); },
    bass(t, m, dur, v, heavy) {
      const o = ac.createOscillator(); o.type = heavy ? "sawtooth" : "square"; o.frequency.value = NF(m);
      const f = ac.createBiquadFilter(); f.type = "lowpass"; f.frequency.setValueAtTime(heavy ? 900 : 700, t); f.frequency.exponentialRampToValueAtTime(260, t + Math.min(0.3, dur)); f.Q.value = 3;
      const g = ac.createGain(); env(g, t, 0.006, v, dur, Math.min(0.08, dur * 0.4)); o.connect(f); f.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.05);
    },
    pad(t, ms, dur, v) {
      const f = ac.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 1300; f.Q.value = 0.6;
      const g = ac.createGain(); env(g, t, Math.min(0.5, dur * 0.3), v, dur, Math.min(0.6, dur * 0.4)); f.connect(g); g.connect(bus);
      ms.forEach((m) => { [-6, 6].forEach((dt) => { const o = ac.createOscillator(); o.type = "sawtooth"; o.frequency.value = NF(m); o.detune.value = dt; o.connect(f); o.start(t); o.stop(t + dur + 0.1); }); });
    },
    tone(t, m, dur, v, w, cut, toDelay) {
      const g = ac.createGain();
      if (w === "bell") {
        const o1 = ac.createOscillator(), o2 = ac.createOscillator(); o1.type = "sine"; o2.type = "sine"; o1.frequency.value = NF(m); o2.frequency.value = NF(m) * 2.76;
        const g2 = ac.createGain(); g2.gain.value = 0.25; o1.connect(g); o2.connect(g2); g2.connect(g);
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.35, dur * 1.6));
        o1.start(t); o2.start(t); o1.stop(t + dur * 1.6 + 0.4); o2.stop(t + dur * 1.6 + 0.4);
      } else if (w === "pluck") {
        const o = ac.createOscillator(); o.type = "triangle"; o.frequency.value = NF(m); const f = ac.createBiquadFilter(); f.type = "lowpass"; f.frequency.setValueAtTime(3200, t); f.frequency.exponentialRampToValueAtTime(500, t + 0.2);
        o.connect(f); f.connect(g); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.18, dur)); o.start(t); o.stop(t + dur + 0.3);
      } else {
        const o = ac.createOscillator(); o.type = w || "square"; o.frequency.value = NF(m);
        const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 5.5; lg.gain.value = dur > 0.3 ? 4 : 0; lfo.connect(lg); lg.connect(o.detune); lfo.start(t); lfo.stop(t + dur + 0.1);
        const f = ac.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = cut || (w === "triangle" ? 6000 : 2400);
        o.connect(f); f.connect(g); env(g, t, 0.01, v, dur, Math.min(0.12, dur * 0.5)); o.start(t); o.stop(t + dur + 0.05);
      }
      g.connect(bus); if (toDelay && dly) g.connect(dly);
    },
  };

  /* ══════════ 曲を組み立てる（ループ1回ぶんの出来事を、16分のマスごとに）══════════ */
  function rng(seed) { let h = 2166136261; for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); } let a = h >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function chordOf(tr, ch) {
    const sc = SCALES[tr.sc] || SCALES.minor;
    const deg = parseInt(ch, 10) || 0, major = /M/.test(ch);
    const at = (i) => { const k = deg + i; return sc[((k % 7) + 7) % 7] + 12 * Math.floor(k / 7); };
    const r = at(0); let th = at(2), fi = at(4);
    if (major) { th = r + 4; fi = r + 7; }
    return [r, th, fi, r + 12].map((x) => x + tr.root);
  }
  function scaleNotes(tr) { const sc = SCALES[tr.sc] || SCALES.minor; const out2 = []; for (let o = -1; o < 4; o++) sc.forEach((s) => out2.push(tr.root + s + 12 * o)); return out2; }
  /* メロディ：2小節のまとまり A・B・C を A A' B C… の形に。強拍は和音の音、ほかは音階をなめらかに */
  const RHY = [
    "x...x...x.x.x...", "x.x.x...x...x...", "x...x.x.x...x.x.", "x..x..x.x...x...", "x.......x.x.x...", "x...x...x...x.x.",
    "x.xx..x.x...x...", "x...x.x...x.x...", "x..x..x...x.x...", "x...x...x...----",
  ];
  function genLead(tr, R) {
    const bars = tr.prog.length, total = bars * 16, mel = new Array(total).fill(null);
    const notes = scaleNotes(tr), lo = tr.root + 12 * (tr.lead.oct || 1) + 2, hi = lo + 17;
    const pool = notes.filter((m) => m >= lo && m <= hi);
    let prev = pool[Math.floor(pool.length / 2)];
    const nearestChordTone = (bar, p) => { const ch = chordOf(tr, tr.prog[bar]); let best = null, bd = 99; for (let o = -1; o <= 2; o++) ch.forEach((c) => { const m = c + 12 * o; if (m < lo || m > hi) return; const d = Math.abs(m - p) + R() * 2; if (d < bd) { bd = d; best = m; } }); return best == null ? p : best; };
    const stepTone = (p) => { const i = pool.indexOf(p) >= 0 ? pool.indexOf(p) : Math.floor(pool.length / 2); const mv = [-2, -1, -1, 1, 1, 2][Math.floor(R() * 6)]; return pool[Math.max(0, Math.min(pool.length - 1, i + mv))]; };
    const make2 = (b0) => {
      const seg = [];
      for (let b = 0; b < 2; b++) {
        let rh = RHY[Math.floor(R() * RHY.length)];
        if (R() > (tr.lead.dens || 0.5)) rh = rh.replace(/x/g, (m, i) => (i % 8 === 0 ? "x" : "."));
        for (let s = 0; s < 16; s++) {
          const ch = rh[s];
          if (ch !== "x") { seg.push(ch === "-" ? "-" : null); continue; }
          prev = s % 4 === 0 ? nearestChordTone(b0 + b, prev) : (R() < 0.35 ? nearestChordTone(b0 + b, prev) : stepTone(prev));
          seg.push(prev);
        }
      }
      return seg;
    };
    const A = make2(0), B = make2(2), C = make2(6);
    const A2 = A.slice(); for (let i = 24; i < 32; i++) A2[i] = null; A2[24] = nearestChordTone(5, A[24] || prev);
    /* 最後は根音で落ちつく */
    const endRoot = (() => { let m = tr.root + 12 * (tr.lead.oct || 1); while (m < lo) m += 12; return m; })();
    for (let i = 28; i < 32; i++) C[i] = null; C[28] = endRoot;
    const seq = A.concat(B, A2, C);
    /* 長さ（次の音・休みまで） */
    for (let i = 0; i < total; i++) {
      const m = seq[i]; if (typeof m !== "number") continue;
      let len = 1; while (i + len < total && seq[i + len] === null && len < 8) len++;
      mel[i] = { m, len };
    }
    return mel;
  }
  function build(key) {
    const tr = TRACKS[key]; if (!tr) return null;
    const R = rng("mb3bgm:" + key);
    const bars = tr.prog.length, total = bars * 16;
    const ev = []; for (let i = 0; i < total; i++) ev.push([]);
    const pat = (s, i) => (s && s.length ? s[i % 16] : ".");
    const lead = genLead(tr, R);
    for (let bar = 0; bar < bars; bar++) {
      const ch = chordOf(tr, tr.prog[bar]), base = bar * 16;
      /* 和音（小節の頭でのばす） */
      if (tr.pad) ev[base].push({ k: "pad", ms: [ch[0] + 12, ch[1] + 12, ch[2] + 12], dur: 16, v: tr.pad });
      for (let s = 0; s < 16; s++) {
        const i = base + s;
        const kk = pat(tr.k, s); if (kk === "x" || kk === "o") ev[i].push({ k: "kick", v: kk === "o" ? 1.0 : 0.85 });
        if (pat(tr.s, s) === "x") ev[i].push({ k: "snare", v: 0.42 });
        if (pat(tr.c, s) === "x") ev[i].push({ k: "clap", v: 0.4 });
        if (pat(tr.h, s) === "x") ev[i].push({ k: "hat", v: tr.soft ? 0.08 : 0.13, open: s % 8 === 6 && R() < 0.3 });
        /* ベース */
        const bc = pat(tr.bass, s);
        if (bc !== "." && bc !== "-") {
          let len = 1; while (s + len < 16 && pat(tr.bass, s + len) === "." && len < 8) len++;
          const m = (bc === "5" ? ch[2] : bc === "o" ? ch[0] + 12 : bc === "3" ? ch[1] : ch[0]) - 12;
          ev[i].push({ k: "bass", m, len, v: tr.heavy ? 0.3 : 0.26 });
        }
        /* アルペジオ */
        if (tr.arp && s % tr.arp.every === 0) {
          const p = tr.arp.p, idx = Number(p[(s / tr.arp.every) % p.length]);
          const m = ch[Math.min(3, idx)] + 12 * (tr.arp.oct - 1) + (idx === 4 ? 12 : 0);
          ev[i].push({ k: "arp", m, len: tr.arp.every, v: tr.arp.v, w: tr.arp.w });
        }
        /* タイトル：小節の終わりにタム */
        if (tr.tom && s === 12 && bar % 2 === 1) { ev[i].push({ k: "tom", m: tr.root - 12 + 7, v: 0.45 }); ev[i + 2] && ev[i + 2].push({ k: "tom", m: tr.root - 12, v: 0.5 }); }
        /* メロディ */
        if (lead[i]) ev[i].push({ k: "lead", m: lead[i].m, len: lead[i].len, v: tr.lead.v, w: tr.lead.w, cut: tr.lead.cut });
      }
    }
    return { key, tr, ev, total, sp: 60 / tr.bpm / 4 };
  }
  const built = {};
  function trackOf(key) { return built[key] || (built[key] = build(key)); }

  /* ══════════ 鳴らす ══════════ */
  function playStep(T, i, t) {
    const evs = T.ev[i], sp = T.sp;
    for (const e of evs) {
      try {
        switch (e.k) {
          case "kick": INS.kick(t, e.v, T.tr.heavy); break;
          case "snare": INS.snare(t, e.v); break;
          case "clap": INS.clap(t, e.v); break;
          case "hat": INS.hat(t, e.v, e.open); break;
          case "tom": INS.tom(t, e.v, e.m); break;
          case "bass": INS.bass(t, e.m, e.len * sp * 0.95, e.v, T.tr.heavy); break;
          case "pad": INS.pad(t, e.ms, e.dur * sp, e.v); break;
          case "arp": INS.tone(t, e.m, e.len * sp * 0.9, e.v, e.w, 0, true); break;
          case "lead": INS.tone(t, e.m, e.len * sp * 0.92, e.v, e.w, e.cut, true); break;
        }
      } catch (err) {}
    }
  }
  function tick() {
    if (!cur || !ac || ac.state !== "running") return;
    const ahead = ac.currentTime + 0.14;
    if (nextT < ac.currentTime - 0.3) nextT = ac.currentTime + 0.05;   /* 止まっていたら、いまから */
    while (nextT < ahead) { playStep(cur, step, nextT); nextT += cur.sp; step = (step + 1) % cur.total; }
  }
  function level() { return on ? vol * 0.5 * (duckT > 0 ? 0.45 : 1) : 0; }
  function fadeTo(v, sec) { if (!out) return; const t = ac.currentTime; out.gain.cancelScheduledValues(t); out.gain.setValueAtTime(Math.max(0.0001, out.gain.value), t); out.gain.linearRampToValueAtTime(Math.max(0.0001, v), t + sec); }
  function start(key) {
    if (!ensure()) return false;
    if (ac.state !== "running") { try { ac.resume(); } catch (e) {} if (ac.state !== "running") return false; }
    const T = trackOf(key); if (!T) return false;
    const go = () => { cur = T; step = 0; nextT = ac.currentTime + 0.08; fadeTo(level(), 0.9); if (!timer) timer = setInterval(tick, 25); };
    if (cur && cur.key !== key) { fadeTo(0.0001, 0.45); setTimeout(go, 470); } else go();
    return true;
  }
  /* 曲を指定（同じ曲ならそのまま）。音を出せないときは覚えておく */
  BGM.play = function (key) {
    if (!TRACKS[key]) return;
    want = key;
    if (!on) return;
    if (cur && cur.key === key && out && out.gain.value > 0.0005) return;
    start(key);
  };
  BGM.stop = function (sec) { want = null; if (!out) return; fadeTo(0.0001, sec == null ? 0.6 : sec); setTimeout(() => { if (!want) { cur = null; } }, ((sec == null ? 0.6 : sec) * 1000) + 60); };
  /* 画面にさわったら（音を出せるようになったら）呼ぶ */
  BGM.kick = function () { if (want && on && (!cur || cur.key !== want || (out && out.gain.value < 0.0005))) start(want); };
  BGM.set = function (v) { on = !!v; if (!on) { if (out) fadeTo(0.0001, 0.3); } else if (want) start(want); };
  BGM.setVol = function (v) { vol = Math.max(0, Math.min(1, Number(v) || 0)); if (out && cur) fadeTo(level(), 0.2); };
  BGM.duck = function (sec) { duckT = sec; if (out && cur) fadeTo(level(), 0.12); clearTimeout(BGM._dk); BGM._dk = setTimeout(() => { duckT = 0; if (out && cur) fadeTo(level(), 0.5); }, sec * 1000); };
  BGM.cur = () => (cur ? cur.key : null);
  BGM.want = () => want;
  Object.defineProperty(BGM, "on", { get: () => on });
  /* 画面が裏に回ったら止める（電池・ほかのタブ） */
  document.addEventListener("visibilitychange", () => {
    if (!out) return;
    if (document.hidden) { hiddenPause = true; fadeTo(0.0001, 0.2); }
    else if (hiddenPause) { hiddenPause = false; if (cur && on) { nextT = ac.currentTime + 0.1; fadeTo(level(), 0.6); } }
  });
})();
