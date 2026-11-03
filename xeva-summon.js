/* ============================================================
   XEVARION SUMMON — ガチャの演出（★★ 2026-10-12c VERSION 3：すべてエヴァ風に作り直し・ご指定）
   ------------------------------------------------------------
   ご指定（10-12c）：「文字が変化したりカットインが入ったりする確定演出など、エヴァのパチンコの演出のように
     より豪華で派手で長く」「前からある円（召喚陣）と落ちてくる演出は消して、すべてエヴァ風に」
     「結果を1体ずつ出す前に、10連のレア度をキャラではなくマークで軽く見せてから演出へ。そのときに昇格演出を」
     「いまのランクアップはランクアップになっていない」「キャラが出てから確定の動きが出る → 演出を先に」
   流れ：
     ⓪ 起動（黒い画面に走査線・システムの文字）
     ① 警報と解析：黄黒の帯・六角形の格子・照準・データの列・共鳴率。中央の札の文字が段階的に変わる
        （反応検知 → 反応増大 → 臨界突破。色は 緑 → 橙 → 赤）＝文字変化
     ② カットイン：斜めの帯が画面を横切る（色＝青：何も約束しない／赤：SSR以上／金：SSR以上が2体以上／虹：UR）
        ピックアップのシルエット・南瓜（Pumpkin Night の UR）・臨界カウントダウン（UR）もここ
     ③ 題字：黒い画面に白い明朝の大きな字「召喚」。UR のときは赤く「覚醒」に書きかわる
     ④ 信号の盤：10枠（単発は1枠）のレア度を六角形のマークで先に見せる。ピックアップは<b>ここで昇格</b>
        （青→金・金→虹。マークがふるえ、ひびが入り、「昇格」の札とともに色が上がる）→ 確定の札
     ⑤ 1体ずつ：かならず演出（解析・警報・十字の光）が先、キャラはそのあと。UR は画面いっぱいの縦長の絵
     ⑥ まとめ
   ★ 確定演出は<b>うそをつかない</b>：出たら必ずその内容。色・文字・マークはすべて本当の結果どおり。
   ★ 抽選・保存はもう済んでいる（mb-core の doFesGacha などが grantChar してから revealGacha を呼ぶ）。ここは見せるだけ。
   ★ どこでも「SKIP」でまとめへ。タップで次の段へ（演出の途中なら早送り）。
   ★ 既存の作品の固有の言葉・ロゴ・書体は使わない（形の雰囲気だけ。文字はすべてこのアプリのもの）。
   ★ アイテム（チケット・ジェム・ゴールド・MagiBurst の道具）は絵文字でなく描いた絵（XevaItemArt）。
   ★★ 2026-11-03 ご指定「始めのパーセントはやめてスロットに」「パチンコの演出に寄せてより豪華に」
     「UR 2体確定の超豪華ロングの天使の演出」「昇格のまえにカットインの UR の数でネタバレする」
     → ① の「共鳴率 ％」を<b>3つのリールのスロット</b>に（左→右→まん中の順に止まる・2つそろうとリーチ）。
         そろった絵柄＝ 天天天：UR 2体以上（このあと天使降臨）／777：UR／◆◆◆：SSR以上 2体以上／★★★：SSR以上／ばらばら：SSR以上なし（たまにリーチだけ）。
       UR のときは画面いっぱいに EMERGENCY の札。UR が2体以上のときは<b>天使降臨</b>（題字 → 光の天使が降りてくる → UR の数だけ光の柱と十字の光 → カウントダウン → 白い光）。
     → ★ ①〜③（スロット・カットイン・確定演出）は<b>昇格する前の色</b>で決める（S.from）。昇格は ④ の盤で初めて分かる。
       盤の最後の札（UR 確定など）だけは本当の結果（S.infoReal）。
   ============================================================ */
(function () {
  "use strict";
  if (window.XevaSummon) return;

  /* ══ 音（WebAudio・ファイルを使わない）══
     ★★ 2026-11-03 ご指定「ガチャはパチンコのように音も豪華に」
     → すべての音を<b>ホールの響き（リバーブ）とコンプレッサー</b>に通す（bus）。
       部品：金管（brass）・ベル（bell）・太鼓（kick/snare/hat）・太鼓のロール（roll）・上がっていく音（riser）・キュイン音（kyuin）・聖歌隊（pad）。
       演出のあいだは<b>緊張の BGM</b>（BGM.start／level／stop）。段（緑→橙→赤）でテンポと音が上がる。 */
  let ac = null, bus = null;
  function AC() {
    try {
      if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === "suspended") ac.resume();
      if (ac && !bus) setupBus();
    } catch (e) { ac = null; }
    return ac;
  }
  function setupBus() {
    try {
      const comp = ac.createDynamicsCompressor();
      comp.threshold.value = -16; comp.knee.value = 14; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.22;
      const g = ac.createGain(); g.gain.value = 0.95;
      const rev = ac.createConvolver(), n = Math.floor(ac.sampleRate * 2.2), buf = ac.createBuffer(2, n, ac.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.8); }
      rev.buffer = buf;
      const wet = ac.createGain(); wet.gain.value = 0.26;
      g.connect(comp); g.connect(rev); rev.connect(wet); wet.connect(comp); comp.connect(ac.destination);
      bus = g;
    } catch (e) { bus = null; }
  }
  const OUT = () => bus || (ac && ac.destination);
  function tone(f0, f1, dur, type, vol, delay) {
    const c = AC(); if (!c) return;
    const t = c.currentTime + (delay || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.1, t + Math.min(0.03, dur / 4));
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(OUT()); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, vol, delay, hp) {
    const c = AC(); if (!c) return;
    const t = c.currentTime + (delay || 0);
    const n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 1.5);
    const s = c.createBufferSource(); s.buffer = buf;
    const f = c.createBiquadFilter(); f.type = "highpass"; f.frequency.value = hp || 400;
    const g = c.createGain(); g.gain.setValueAtTime(vol || 0.08, t);
    s.connect(f); f.connect(g); g.connect(OUT()); s.start(t);
  }
  /* 金管（ノコギリ波2本・フィルターがひらく）。f は1つでも配列（和音）でもよい */
  function brass(f, dur, vol, delay) {
    const c = AC(); if (!c) return;
    (Array.isArray(f) ? f : [f]).forEach((fr) => {
      const t = c.currentTime + (delay || 0);
      const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.Q.value = 2.2;
      lp.frequency.setValueAtTime(500, t); lp.frequency.exponentialRampToValueAtTime(Math.min(9000, fr * 7), t + 0.07); lp.frequency.exponentialRampToValueAtTime(Math.min(5000, fr * 3.2), t + dur);
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.05, t + 0.04);
      g.gain.setValueAtTime(vol || 0.05, t + Math.max(0.05, dur - 0.12)); g.gain.exponentialRampToValueAtTime(0.0008, t + dur + 0.1);
      [-6, 6].forEach((dt) => { const o = c.createOscillator(); o.type = "sawtooth"; o.frequency.value = fr; o.detune.value = dt; o.connect(lp); o.start(t); o.stop(t + dur + 0.15); });
      lp.connect(g); g.connect(OUT());
    });
  }
  /* ベル（倍音のずれた正弦波・長くひびく） */
  function bell(f, dur, vol, delay) {
    [[1, 1], [2.76, 0.42], [5.4, 0.2], [8.93, 0.08]].forEach(([m, v]) => tone(f * m, f * m * 0.998, (dur || 1.4) / (m > 2 ? 1.6 : 1), "sine", (vol || 0.05) * v, delay));
  }
  function kick(delay, vol) { tone(160, 42, 0.32, "sine", vol || 0.2, delay); tone(80, 38, 0.2, "triangle", (vol || 0.2) * 0.5, delay); }
  function snare(delay, vol) { noise(0.16, vol || 0.09, delay, 1600); tone(220, 180, 0.08, "triangle", (vol || 0.09) * 0.6, delay); }
  function hat(delay, vol) { noise(0.04, vol || 0.03, delay, 7500); }
  /* 太鼓のロール（だんだん速く・強く） */
  function roll(dur, delay) {
    let t = delay || 0, gap = 0.11; const end = t + (dur || 1);
    while (t < end) { const k = (t - (delay || 0)) / (dur || 1); snare(t, 0.035 + k * 0.08); t += gap; gap = Math.max(0.032, gap * 0.9); }
  }
  /* 上がっていく音（ノイズの帯域が上へ） */
  function riser(dur, vol, delay) {
    const c = AC(); if (!c) return;
    const t = c.currentTime + (delay || 0), n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource(); s.buffer = buf;
    const f = c.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 3; f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(7000, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.08, t + dur * 0.9); g.gain.exponentialRampToValueAtTime(0.0008, t + dur + 0.05);
    s.connect(f); f.connect(g); g.connect(OUT()); s.start(t); s.stop(t + dur + 0.1);
  }
  /* キュイン音（すばやく上がってビブラートで鳴りつづける・大当たりの合図） */
  function kyuin(delay, len) {
    const c = AC(); if (!c) return;
    const t = c.currentTime + (delay || 0), L = len || 1.4;
    [[1, 0.06, "square"], [2, 0.03, "sawtooth"]].forEach(([m, v, ty]) => {
      const o = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
      o.type = ty; o.frequency.setValueAtTime(320 * m, t); o.frequency.exponentialRampToValueAtTime(2400 * m, t + 0.55);
      lfo.frequency.value = 17; lg.gain.value = 55 * m; lfo.connect(lg); lg.connect(o.frequency);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.06); g.gain.setValueAtTime(v, t + L - 0.25); g.gain.exponentialRampToValueAtTime(0.0008, t + L);
      o.connect(g); g.connect(OUT()); o.start(t); lfo.start(t); o.stop(t + L + 0.05); lfo.stop(t + L + 0.05);
    });
  }
  /* 聖歌隊（ゆっくり立ちあがる和音・少し揺れる） */
  function pad(freqs, dur, vol, delay) {
    const c = AC(); if (!c) return;
    const t = c.currentTime + (delay || 0);
    freqs.forEach((f) => {
      [-8, 0, 8].forEach((dt) => {
        const o = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
        o.type = dt ? "sine" : "triangle"; o.frequency.value = f; o.detune.value = dt;
        lfo.frequency.value = 5 + Math.random(); lg.gain.value = 3; lfo.connect(lg); lg.connect(o.detune);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime((vol || 0.03) / 3, t + dur * 0.4); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
        o.connect(g); g.connect(OUT()); o.start(t); lfo.start(t); o.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
      });
    });
  }
  const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);   /* MIDI の番号 → Hz */
  const SND = {
    boot: () => { tone(60, 120, 0.5, "sawtooth", 0.06); noise(0.4, 0.04, 0.05, 1800); tone(880, 880, 0.06, "square", 0.03, 0.45); riser(0.9, 0.05, 0.1); kick(0.9, 0.16); brass([NOTE(45), NOTE(52)], 0.5, 0.04, 0.9); },
    type: () => { tone(2200 + Math.random() * 600, 2200, 0.025, "square", 0.018); },
    tick: () => { tone(1800, 1800, 0.03, "square", 0.025); },
    alarm: () => { [0, 0.24, 0.48].forEach((d) => { tone(880, 880, 0.16, "square", 0.05, d); tone(660, 660, 0.12, "square", 0.04, d + 0.12); }); kick(0, 0.12); },
    alarm2: () => { [0, 0.18, 0.36, 0.54, 0.72].forEach((d, i) => tone(i % 2 ? 740 : 990, i % 2 ? 740 : 990, 0.12, "square", 0.055, d)); brass([NOTE(50), NOTE(53), NOTE(57)], 0.3, 0.045, 0); kick(0, 0.16); kick(0.36, 0.14); },
    boom: () => { noise(1.2, 0.16, 0, 60); tone(70, 32, 1.3, "sawtooth", 0.12); tone(140, 50, 0.9, "square", 0.05, 0.05); kick(0, 0.26); },
    glitch: () => { for (let i = 0; i < 6; i++) tone(200 + Math.random() * 1800, 100 + Math.random() * 900, 0.05, "square", 0.04, i * 0.04); noise(0.3, 0.06, 0, 2500); },
    chg: () => { noise(0.12, 0.07, 0, 2600); tone(320, 1280, 0.18, "square", 0.05); brass(NOTE(62), 0.16, 0.03); },
    cut: () => { noise(0.45, 0.09, 0, 900); tone(240, 1200, 0.35, "sawtooth", 0.05); riser(0.35, 0.05); kick(0.3, 0.18); brass([NOTE(55), NOTE(62), NOTE(67)], 0.35, 0.05, 0.3); },
    count: () => { tone(1320, 1320, 0.18, "square", 0.06); tone(660, 660, 0.18, "sine", 0.05); kick(0, 0.2); snare(0, 0.05); },
    mark: () => { tone(1100, 1500, 0.06, "triangle", 0.035); },
    crack: () => { noise(0.18, 0.14, 0, 1500); tone(1200, 300, 0.2, "square", 0.06); },
    promote: () => { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, f * 1.01, 0.2, "square", 0.05, i * 0.045)); noise(0.3, 0.05, 0.1, 3000); kyuin(0.05, 0.8); bell(1568, 1.2, 0.05, 0.3); },
    gold: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, f, 0.5, "triangle", 0.07, i * 0.06)); brass([NOTE(60), NOTE(64), NOTE(67)], 0.6, 0.05, 0.05); bell(1319, 1.4, 0.05, 0.25); },
    rainbow: () => { [523, 659, 784, 988, 1175, 1568, 2093].forEach((f, i) => tone(f, f, 0.7, "sine", 0.07, i * 0.07)); noise(0.6, 0.05, 0.2, 2500); kyuin(0, 1.5); [1047, 1319, 1568, 2093].forEach((f, i) => bell(f, 1.6, 0.04, 0.3 + i * 0.1)); },
    flip: () => { noise(0.12, 0.06, 0, 2000); tone(600, 900, 0.12, "triangle", 0.06); },
    sr: () => { tone(880, 1175, 0.25, "triangle", 0.07); bell(1760, 0.9, 0.03, 0.05); },
    ssr: () => { tone(196, 784, 0.6, "sawtooth", 0.07); [784, 988, 1175, 1568].forEach((f, i) => tone(f, f, 0.5, "triangle", 0.06, 0.15 + i * 0.08)); noise(0.4, 0.05, 0.1, 3000);
      brass([NOTE(55), NOTE(62), NOTE(67), NOTE(71)], 0.9, 0.05, 0.12); kick(0.12, 0.2); [1175, 1568, 1976].forEach((f, i) => bell(f, 1.2, 0.04, 0.35 + i * 0.09)); },
    ur: () => { tone(98, 392, 1.1, "sawtooth", 0.08); [523, 784, 1047, 1319, 1568, 2093].forEach((f, i) => tone(f, f, 0.9, "sine", 0.07, 0.3 + i * 0.09)); noise(0.9, 0.06, 0.3, 3500);
      brass([NOTE(43), NOTE(50), NOTE(55), NOTE(59), NOTE(62)], 1.6, 0.06, 0.25); kick(0.25, 0.26); kick(0.6, 0.2); kyuin(0.25, 1.8); [1568, 2093, 2637, 3136].forEach((f, i) => bell(f, 1.8, 0.035, 0.6 + i * 0.12)); },
    item: () => { tone(740, 990, 0.12, "triangle", 0.05); tone(990, 1320, 0.12, "triangle", 0.04, 0.08); bell(1980, 0.6, 0.02, 0.1); },
    /* ファンファーレ（金管のメロディ＋太鼓） */
    fanfare: () => {
      [[67, 0, 0.16], [67, 0.18, 0.1], [67, 0.3, 0.1], [72, 0.42, 0.5], [71, 0.95, 0.14], [72, 1.11, 0.14], [74, 1.27, 0.14], [76, 1.43, 0.8]].forEach(([n, d, len]) => brass([NOTE(n), NOTE(n - 12)], len, 0.05, d));
      [0, 0.42, 1.43].forEach((d) => { kick(d, 0.2); snare(d + 0.01, 0.06); });
      roll(0.6, 0.8); bell(NOTE(88), 1.5, 0.04, 1.45);
    },
    /* ★★ 2026-11-03 スロット・天使降臨 */
    reel: () => { for (let i = 0; i < 6; i++) tone(1500 + (i % 2) * 300, 1500, 0.02, "square", 0.018, i * 0.05); },
    stop: () => { tone(220, 120, 0.12, "square", 0.07); noise(0.08, 0.06, 0, 1200); kick(0, 0.12); },
    reach: () => { [392, 494, 587, 784, 988].forEach((f, i) => tone(f, f * 1.02, 0.22, "sawtooth", 0.05, i * 0.07)); noise(0.5, 0.04, 0.1, 2400);
      brass([NOTE(57), NOTE(64), NOTE(69)], 0.3, 0.055, 0); roll(0.95, 0.05); riser(0.95, 0.07, 0.05); },
    jackpot: () => { [784, 988, 1175, 1568, 1976, 2349].forEach((f, i) => tone(f, f, 0.6, "triangle", 0.07, i * 0.06)); noise(0.7, 0.05, 0.2, 3000);
      kyuin(0, 1.6); kick(0, 0.24); brass([NOTE(60), NOTE(64), NOTE(67), NOTE(72)], 1.0, 0.055, 0.1); [2093, 2637, 3136, 4186].forEach((f, i) => bell(f, 1.4, 0.03, 0.2 + i * 0.08)); },
    choir: () => { pad([NOTE(60), NOTE(64), NOTE(67)], 2.2, 0.05, 0); pad([NOTE(65), NOTE(69), NOTE(72)], 2.2, 0.05, 1.2); pad([NOTE(67), NOTE(71), NOTE(74), NOTE(79)], 2.8, 0.06, 2.4);
      [[1, 0.5], [1.5, 1.7], [2, 2.9]].forEach(([m, d]) => bell(NOTE(84) * m / 1.5, 1.6, 0.03, d)); },
    angel: () => { tone(55, 30, 2.2, "sawtooth", 0.12); noise(1.8, 0.1, 0, 120); [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, f, 1.6, "sine", 0.04, 0.4 + i * 0.12)); kick(0, 0.28); brass([NOTE(36), NOTE(43), NOTE(48)], 2.0, 0.05, 0.05); },
  };
  const snd = (k) => { try { if (SND[k]) SND[k](); } catch (e) {} };
  /* ══ ★★ 2026-11-03 演出のあいだの緊張の BGM（4つ打ち・ベース・ハイハット）。段で速く・赤で警報のシンセ ══ */
  const BGM = {
    id: null, step: 0, lv: "g",
    start(lv) { this.stop(); if (!AC()) return; this.lv = lv || "g"; this.step = 0; this.loop(); },
    level(lv) { this.lv = lv; },
    loop() {
      const bpm = this.lv === "r" ? 156 : this.lv === "o" ? 144 : 128, q = 60 / bpm / 2;   /* 8分音符 */
      const s = this.step++, bar = Math.floor(s / 8) % 4, root = [45, 45, 41, 43][bar];
      if (s % 2 === 0) kick(0, this.lv === "g" ? 0.1 : 0.15);
      if (s % 4 === 2 && this.lv !== "g") snare(0, 0.04);
      hat(0, s % 2 ? 0.03 : 0.015);
      tone(NOTE(root - 12), NOTE(root - 12), q * 0.9, "sawtooth", this.lv === "g" ? 0.035 : 0.05);
      if (this.lv === "r" && s % 4 === 0) tone(NOTE(root + 24), NOTE(root + 23), q * 1.6, "square", 0.025);
      if (this.lv !== "g" && s % 8 === 7) brass([NOTE(root + 12), NOTE(root + 19)], q * 0.8, 0.025);
      this.id = setTimeout(() => this.loop(), q * 1000);
    },
    stop() { if (this.id) clearTimeout(this.id); this.id = null; },
  };

  /* ══ 小道具 ══ */
  const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const G = (n) => { try { return (0, eval)(n); } catch (e) { return undefined; } };
  const has = (n) => { try { return typeof (0, eval)(n) !== "undefined"; } catch (e) { return false; } };
  function chr(id) { try { return CHARS[id] || null; } catch (e) { return null; } }
  function rarOf(r) {
    if (!r) return "ITEM";
    if (r.type === "select") return "SSR";
    if (r.type !== "char") return "ITEM";
    try { return rarLabel(r.id); } catch (e) { return "SR"; }
  }
  function tierOf(r) { const x = rarOf(r); return x === "UR" ? 3 : x === "SSR" ? 2 : x === "SR" ? 1 : 0; }
  const RB = (t) => (t === 3 ? "UR" : t === 2 ? "SSR" : t === 1 ? "SR" : "ITEM");
  function ssOf(id) { try { return typeof ssArtOf === "function" ? ssArtOf(id) : null; } catch (e) { return null; } }
  function elOf(id) { const c = chr(id); try { return (c && ELEM[c.el]) || null; } catch (e) { return null; } }
  function subOf(r) {
    if (r.type !== "char") return "×" + (r.n || 1);
    if (r.max) return "💠結晶 +" + (r.cryst || 5);
    if (r.fullAwk) return "👑 限界突破MAX!!";
    if (r.awk) return "覚醒 +" + r.awk;
    return "NEW!";
  }
  function isNew(r) { return r && r.type === "char" && !r.awk && !r.max; }

  /* ══ アイテムの絵（★★ 2026-10-12c 絵文字をやめて描いた絵に・ご指定）══
     ticket … フェスチケット（金）／gticket … ガチャチケット（青）／orb … ジェム／gold … ゴールド／item … MagiBurst の道具（mb-core の itemIcon）
     ★★ 2026-10-12d MagiBurst などと<b>同じ絵</b>にそろえた（ご指定）：チケット＝mb-core の fesTicketSVG／gachaTicketSVG、
       道具＝itemIcon、ジェム＝gem.png、ゴールド＝MagiBurst の .ic-gold と同じ星の刻印の金貨 */
  let artUid = 0;
  const ItemArt = {
    info(r) {
      if (r.type === "ticket") return { nm: "フェスチケット", c: "#c86bff", c2: "#ffd257" };
      if (r.type === "gticket") return { nm: "ガチャチケット", c: "#2b7bff", c2: "#9fd0ff" };
      if (r.type === "orb") return { nm: "ジェム", c: "#3fc8ff", c2: "#d6f6ff" };
      /* ★★ 2026-11-03 XEVARION 共通のアイテム（mb-core の X_ITEM_INFO） */
      if (r.type === "xitem") { try { const x = X_ITEM_INFO[r.item]; if (x) return { nm: x.nm, c: x.c, c2: "#ffffff" }; } catch (e) {} return { nm: String(r.item || "アイテム"), c: "#ffc63d", c2: "#ffffff" }; }
      if (r.type === "item") { try { const it = ITEMS[r.item]; if (it) return { nm: it.nm, c: it.c || "#8affc4", c2: "#ffffff" }; } catch (e) {} return { nm: String(r.item || "アイテム"), c: "#8affc4", c2: "#ffffff" }; }
      return { nm: "ゴールド", c: "#ffc63d", c2: "#fff2b0" };
    },
    svg(r, px) {
      const u = "xia" + (++artUid), s = px || 96;
      const W = (inner, defs) => '<svg viewBox="0 0 100 100" width="' + s + '" height="' + s + '" aria-hidden="true" style="display:block;overflow:visible"><defs>' + (defs || "") + "</defs>" + inner + "</svg>";
      /* チケットはウォレット・提供割合と同じ絵（mb-core の fesTicketSVG／gachaTicketSVG。横長なので高さ＝幅÷1.55） */
      try {
        if (r.type === "ticket" && typeof fesTicketSVG === "function") return fesTicketSVG(Math.round(s / 1.55));
        if (r.type === "gticket" && typeof gachaTicketSVG === "function") return gachaTicketSVG(Math.round(s / 1.55));
      } catch (e) {}
      if (r.type === "ticket" || r.type === "gticket") {
        const fes = r.type === "ticket";
        const a = fes ? "#fff1b8" : "#d8ecff", b = fes ? "#ffb020" : "#2b7bff", d = fes ? "#a8620a" : "#123f8f";
        const body = "M10 30 H90 V43 A7 7 0 0 0 90 57 V70 H10 V57 A7 7 0 0 0 10 43 Z";
        return W('<g transform="rotate(-12 50 50)"><path d="' + body + '" fill="url(#' + u + 'g)" stroke="' + d + '" stroke-width="2.5"/>' +
          '<path d="M66 32 V68" stroke="' + d + '" stroke-width="1.8" stroke-dasharray="3 3" opacity=".7"/>' +
          '<path d="M14 34 H86" stroke="#fff" stroke-width="2" opacity=".55"/>' +
          (fes ? '<path d="M38 38 l3.6 7.4 8.1 1.2-5.9 5.7 1.4 8.1-7.2-3.8-7.2 3.8 1.4-8.1-5.9-5.7 8.1-1.2z" fill="#fff" stroke="' + d + '" stroke-width="1.6"/>'
            : '<circle cx="38" cy="50" r="12" fill="#fff" stroke="' + d + '" stroke-width="2"/><path d="M26 50 H50" stroke="' + d + '" stroke-width="2"/><circle cx="38" cy="50" r="3.6" fill="' + b + '" stroke="' + d + '" stroke-width="1.6"/>') +
          '<text x="78" y="55" text-anchor="middle" font-family="Orbitron,sans-serif" font-weight="900" font-size="9" fill="' + d + '" transform="rotate(90 78 52)">' + (fes ? "FES" : "GACHA") + "</text>" +
          '<path d="M18 63 L24 63 M28 63 L50 63" stroke="' + d + '" stroke-width="2" opacity=".5"/></g>' +
          '<path d="M82 14 l2.2 5 5 2.2-5 2.2-2.2 5-2.2-5-5-2.2 5-2.2z" fill="#fff"/>',
          '<linearGradient id="' + u + 'g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + a + '"/><stop offset=".55" stop-color="' + b + '"/><stop offset="1" stop-color="' + a + '"/></linearGradient>');
      }
      /* ★★ 2026-10-12d ジェムは MagiBurst・ホームと同じ絵（gem.png）にそろえた（ご指定「MagiBurst などと統一」） */
      if (r.type === "orb") {
        return '<img class="ia-img" src="gem.png" alt="" width="' + s + '" height="' + s + '" style="display:block;width:' + s + 'px;height:' + s + 'px;object-fit:contain" draggable="false">';
      }
      if (r.type === "item") {
        try { if (typeof itemIcon === "function") { const h = itemIcon(r.item, s); if (h) return h; } } catch (e) {}
      }
      if (r.type === "xitem") {
        try { if (typeof xitemIcon === "function") return '<div style="width:' + s + 'px;height:' + s + 'px;display:grid;place-items:center">' + xitemIcon(r.item, Math.round(s * 0.92)) + "</div>"; } catch (e) {}
      }
      /* ★★ 2026-10-12d ゴールドは MagiBurst のコイン（.ic-gold：星の刻印・金属の照り）と同じ描き方にそろえた（ご指定） */
      const star = [[50, 2], [61, 37], [98, 37], [68, 59], [79, 95], [50, 73], [21, 95], [32, 59], [2, 37], [39, 37]]
        .map((p) => (24 + p[0] * 0.52).toFixed(1) + " " + (24 + p[1] * 0.52).toFixed(1)).join(" ");
      return W('<circle cx="50" cy="52" r="44" fill="#7a4600" opacity=".35"/>' +
        '<circle cx="50" cy="50" r="44" fill="url(#' + u + 'r)"/>' +
        '<circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,246,216,.72)" stroke-width="3.6"/>' +
        '<circle cx="50" cy="50" r="36.5" fill="none" stroke="rgba(176,104,0,.55)" stroke-width="3.2"/>' +
        '<polygon points="' + star + '" fill="rgba(150,88,0,.62)"/>' +
        '<path d="M14 58 L58 12 L70 16 L22 70 Z" fill="url(#' + u + 's)" clip-path="url(#' + u + 'c)"/>',
        '<radialGradient id="' + u + 'r" cx=".36" cy=".3" r=".75"><stop offset="0" stop-color="#fff6d8"/><stop offset=".1" stop-color="#fff6d8"/><stop offset=".3" stop-color="#ffe08a"/><stop offset=".62" stop-color="#ffbe33"/><stop offset=".86" stop-color="#e08a00"/><stop offset="1" stop-color="#a55f00"/></radialGradient>' +
        '<linearGradient id="' + u + 's" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".62"/><stop offset="1" stop-color="#fff" stop-opacity=".1"/></linearGradient>' +
        '<clipPath id="' + u + 'c"><circle cx="50" cy="50" r="40"/></clipPath>');
    },
  };
  window.XevaItemArt = ItemArt;

  /* ══ 見た目（1回だけ差しこむ）══ */
  function css() {
    if (document.getElementById("xsmCss")) return;
    const s = document.createElement("style"); s.id = "xsmCss";
    s.textContent = `
#xsm{position:fixed;inset:0;z-index:1250;overflow:hidden;color:#fff;font-family:'Noto Sans JP',sans-serif;user-select:none;-webkit-user-select:none;
  background:#000;perspective:1000px;opacity:0;transition:opacity .3s ease;touch-action:manipulation;--hc:#33ff9e;--hca:rgba(51,255,158,.35)}
#xsm.on{opacity:1}
#xsm *{box-sizing:border-box}
#xsm.lv-o{--hc:#ff9a1f;--hca:rgba(255,154,31,.35)}
#xsm.lv-r{--hc:#ff2a3a;--hca:rgba(255,42,58,.35)}
@keyframes xsSpin{to{transform:rotate(360deg)}}
@keyframes xsHue{to{filter:hue-rotate(360deg)}}
@keyframes xsBlink{50%{opacity:.25}}
/* ── 背景：六角形の格子・走査線・流れる光（全段で共通）── */
#xsm .xs-bg{position:absolute;inset:0;pointer-events:none;color:var(--hc);opacity:0;transition:opacity .5s}
#xsm.bg .xs-bg{opacity:1}
#xsm .xs-bg svg{position:absolute;inset:0;width:100%;height:100%;opacity:.22}
#xsm .xs-bg .scan{position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(0,0,0,.4) 0 2px,transparent 2px 4px)}
#xsm .xs-bg .sweep{position:absolute;left:0;right:0;height:18%;top:-20%;background:linear-gradient(transparent,var(--hca),transparent);animation:evSweep 1.4s linear infinite}
@keyframes evSweep{to{top:110%}}
#xsm .xs-bg .vig{position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 45%,rgba(0,0,0,.85))}
#xsm .xs-flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none;z-index:60}
#xsm .xs-flash.go{animation:xsFlash .6s ease-out}
#xsm .xs-flash.red{background:#ff2a3a}
@keyframes xsFlash{0%{opacity:.95}100%{opacity:0}}
#xsm.shake .xs-stage,#xsm.shake .xs-cards,#xsm.shake .xs-board{animation:evShake .6s linear}
@keyframes evShake{0%,100%{transform:none}15%{transform:translate(-10px,6px)}30%{transform:translate(9px,-7px)}45%{transform:translate(-7px,-4px)}60%{transform:translate(6px,5px)}80%{transform:translate(-3px,2px)}}
/* ── ⓪ 起動 ── */
#xsm .xs-boot{position:absolute;inset:0;z-index:45;pointer-events:none;display:none}
#xsm.boot .xs-boot{display:block}
#xsm .xs-boot .line{position:absolute;left:0;right:0;top:50%;height:2px;background:#fff;box-shadow:0 0 18px #fff;transform:scaleX(0);animation:btLine .5s cubic-bezier(.2,.9,.3,1) forwards}
@keyframes btLine{60%{transform:scaleX(1);height:2px;opacity:1}100%{transform:scaleX(1);height:0;opacity:0}}
#xsm .xs-boot pre{position:absolute;left:calc(env(safe-area-inset-left,0px) + 6%);top:calc(env(safe-area-inset-top,0px) + 14%);margin:0;font:700 clamp(10px,1.8vh,14px)/1.7 'Courier New',monospace;color:var(--hc);text-shadow:0 0 8px var(--hc);white-space:pre-wrap;max-width:88%}
#xsm .xs-boot pre::after{content:"▌";animation:xsBlink .5s steps(2) infinite}
/* ── ① 警報と解析 ── */
#xsm .xs-eva{position:absolute;inset:0;z-index:40;display:none;pointer-events:none;overflow:hidden;color:var(--hc)}
#xsm .xs-eva.on{display:block}
#xsm .xs-eva.out{animation:evOut .25s steps(3) forwards}
@keyframes evOut{to{opacity:0}}
#xsm .ev-bars i{position:absolute;left:-10%;right:-10%;height:clamp(26px,5.5vh,46px);background:repeating-linear-gradient(-45deg,#ffd21a 0 18px,#111 18px 36px);display:flex;align-items:center;overflow:hidden;transform:scaleY(0)}
#xsm .ev-bars i.t{top:calc(env(safe-area-inset-top,0px) + 6%)}
#xsm .ev-bars i.b{bottom:calc(env(safe-area-inset-bottom,0px) + 6%)}
#xsm .xs-eva.on .ev-bars i{animation:evBar .22s steps(2) forwards}
@keyframes evBar{to{transform:scaleY(1)}}
#xsm .ev-bars i span{flex:none;white-space:nowrap;font:900 clamp(13px,2.6vh,20px)/1 'Orbitron','Noto Sans JP',sans-serif;letter-spacing:.3em;color:#111;background:#ffd21a;padding:3px 14px;margin-left:24px;animation:evMarq 2.4s linear infinite}
#xsm .ev-bars i.b span{animation-direction:reverse}
@keyframes evMarq{from{transform:translateX(0)}to{transform:translateX(-50%)}}
#xsm.lv-r .ev-bars i{background:repeating-linear-gradient(-45deg,#ff2a3a 0 18px,#111 18px 36px)}
#xsm.lv-r .ev-bars i span{background:#ff2a3a;color:#fff}
#xsm.rbbar .ev-bars i{background:repeating-linear-gradient(-45deg,#ff5fa2 0 14px,#ffd257 14px 28px,#7dffb0 28px 42px,#5fd0ff 42px 56px,#111 56px 70px)}
#xsm .ev-ret{position:absolute;left:50%;top:44%;width:min(58vmin,400px);height:min(58vmin,400px);margin:calc(min(58vmin,400px) / -2) 0 0 calc(min(58vmin,400px) / -2);opacity:0}
#xsm .xs-eva.hud .ev-ret{opacity:1;animation:evRetIn .5s cubic-bezier(.2,1.4,.4,1)}
@keyframes evRetIn{from{transform:scale(2.2) rotate(-40deg);opacity:0}}
#xsm .ev-ret svg{width:100%;height:100%;overflow:visible}
#xsm .ev-ret .r1{animation:xsSpin 6s linear infinite;transform-box:fill-box;transform-origin:center}
#xsm .ev-ret .r2{animation:xsSpin 3.5s linear infinite reverse;transform-box:fill-box;transform-origin:center}
#xsm .ev-data{position:absolute;top:18%;bottom:18%;width:min(30vw,220px);overflow:hidden;font:700 clamp(9px,1.6vh,12px)/1.55 'Courier New',monospace;opacity:0;
  -webkit-mask:linear-gradient(transparent,#000 15%,#000 85%,transparent);mask:linear-gradient(transparent,#000 15%,#000 85%,transparent)}
#xsm .ev-data.l{left:calc(env(safe-area-inset-left,0px) + 3%)} #xsm .ev-data.r{right:calc(env(safe-area-inset-right,0px) + 3%);text-align:right}
#xsm .xs-eva.hud .ev-data{opacity:.8}
#xsm .ev-data div{animation:evData 2.2s linear infinite}
@keyframes evData{to{transform:translateY(-50%)}}
#xsm .ev-sync{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);text-align:center;opacity:0;text-shadow:0 0 14px var(--hc)}
#xsm .xs-eva.hud .ev-sync{opacity:1}
#xsm .ev-sync small{display:block;font:900 clamp(11px,2vh,15px)/1 'Noto Sans JP',sans-serif;letter-spacing:.5em;margin-bottom:6px}
#xsm .ev-sync b{font:900 clamp(40px,10vh,84px)/1 'Orbitron',monospace;letter-spacing:.02em}
#xsm .ev-sync i{font:900 clamp(18px,4vh,32px)/1 'Orbitron',monospace;font-style:normal;margin-left:4px}
#xsm .xs-eva.over .ev-sync{animation:evBlink .16s steps(2) infinite}
@keyframes evBlink{50%{opacity:.25}}
/* 文字変化の札（反応検知 → 反応増大 → 臨界突破） */
#xsm .ev-txc{position:absolute;left:50%;top:calc(44% + min(29vmin,200px) + 6px);transform:translateX(-50%);min-width:min(70vw,380px);text-align:center;opacity:0}
#xsm .xs-eva.hud .ev-txc{opacity:1}
#xsm .ev-txc b{display:block;padding:8px 20px 9px;font:900 clamp(22px,5.4vh,42px)/1 'Noto Serif JP','Hiragino Mincho ProN','Yu Mincho','YuMincho',serif;letter-spacing:.32em;
  color:#000;background:var(--hc);box-shadow:0 0 0 2px #000,0 0 0 4px var(--hc),0 0 30px var(--hc)}
#xsm .ev-txc small{display:block;margin-top:6px;font:900 clamp(10px,1.8vh,13px)/1 'Orbitron',sans-serif;letter-spacing:.35em;color:var(--hc)}
#xsm .ev-txc.chg b{animation:txChg .5s steps(5)}
@keyframes txChg{0%{transform:scale(1.5) skewX(-20deg);filter:invert(1)}20%{transform:translateX(-10px)}40%{transform:translateX(8px) scale(1.1);filter:hue-rotate(90deg)}60%{transform:translateX(-5px)}80%{transform:translateX(3px)}100%{transform:none;filter:none}}
#xsm .ev-txc.rb b{background:linear-gradient(100deg,#ff5fa2,#ffd257 25%,#7dffb0 50%,#5fd0ff 75%,#c79cff);background-size:200% 100%;animation:txChg .5s steps(5),txRb 1.2s linear infinite}
@keyframes txRb{to{background-position:200% 0}}
#xsm .ev-warn{position:absolute;left:0;right:0;top:44%;transform:translateY(-50%) scaleY(0);background:var(--hc);color:#000;text-align:center;padding:10px 0 12px;opacity:0;z-index:3}
#xsm .xs-eva.warn .ev-warn{animation:evWarn 1.1s steps(1) forwards}
@keyframes evWarn{0%{opacity:1;transform:translateY(-50%) scaleY(1)}12%{opacity:0}24%{opacity:1}36%{opacity:0}48%{opacity:1}88%{opacity:1}100%{opacity:0}}
#xsm .ev-warn b{display:block;font:900 clamp(26px,min(9vh,10.5vw),78px)/1 'Orbitron','Noto Sans JP',sans-serif;letter-spacing:.12em;font-style:italic;white-space:nowrap}
#xsm .ev-warn span{display:block;margin-top:6px;font:900 clamp(13px,2.6vh,20px)/1.2 'Noto Sans JP',sans-serif;letter-spacing:.3em}
#xsm .xs-eva.glitch{animation:evGlitch .45s steps(6)}
@keyframes evGlitch{0%{transform:translate(0)}20%{transform:translate(-8px,3px);filter:hue-rotate(80deg)}40%{transform:translate(6px,-4px)}60%{transform:translate(-4px,2px);filter:invert(1)}80%{transform:translate(3px,0)}100%{transform:none;filter:none}}
/* ── ② カットイン ── */
#xsm .xs-cut{position:absolute;inset:0;z-index:48;pointer-events:none;display:none;overflow:hidden}
#xsm .xs-cut.on{display:block}
#xsm .xs-cut .ct-dim{position:absolute;inset:0;background:rgba(0,0,0,.55);opacity:0;animation:ctDim 1.7s ease forwards}
@keyframes ctDim{10%,85%{opacity:1}100%{opacity:0}}
#xsm .xs-cut .ct-band{position:absolute;left:-10%;right:-10%;top:50%;height:min(42vh,300px);margin-top:calc(min(42vh,300px) / -2);transform:skewY(-9deg) translateX(110%);
  background:var(--cb,#2b6bff);box-shadow:0 0 0 4px #000,0 0 0 8px var(--cb2,#9fd0ff),0 0 50px var(--cb,#2b6bff);animation:ctBand 1.7s cubic-bezier(.2,.9,.3,1) forwards;overflow:hidden}
@keyframes ctBand{0%{transform:skewY(-9deg) translateX(110%)}22%{transform:skewY(-9deg) translateX(0)}80%{transform:skewY(-9deg) translateX(-3%)}100%{transform:skewY(-9deg) translateX(-115%)}}
#xsm .xs-cut .ct-band::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(100deg,transparent 0 26px,rgba(255,255,255,.12) 26px 30px);animation:ctLines .5s linear infinite}
@keyframes ctLines{to{background-position:240px 0}}
/* ★★ 2026-11-03 ご指摘「カットインの上が切れる」：中身が傾いた帯（overflow:hidden）の中にあったので、帯の左側では丸と文字の上が帯のふちで切れていた。
   → 中身（.ct-in）は帯の外の兄弟にして、傾けず・切らずに、帯と同じ動きで流す */
#xsm .xs-cut .ct-in{position:absolute;left:0;right:0;top:50%;height:min(42vh,300px);margin-top:calc(min(42vh,300px) / -2);z-index:2;display:flex;align-items:center;gap:4%;
  padding:0 max(14%,calc(10% + 24px));transform:skewY(-9deg) translateX(110%);animation:ctBand 1.7s cubic-bezier(.2,.9,.3,1) forwards}
/* ★★ 2026-11-03 ご指摘「丸と文字が少し上寄り」：帯は斜め（左ほど下がる）なのに中身を水平に並べていた → 並びは帯と同じ傾き（同じ ctBand）、丸と文字そのものは逆に傾けてまっすぐに */
#xsm .xs-cut .ct-in > *{transform:skewY(9deg)}
#xsm .xs-cut .ct-pic{flex:none;width:min(30vh,32vw,210px);height:min(30vh,32vw,210px);border-radius:50%;overflow:hidden;background:#000;box-shadow:0 0 0 4px #fff,0 0 30px rgba(255,255,255,.7);display:grid;place-items:center}
#xsm .xs-cut .ct-pic img{width:100%;height:100%;object-fit:cover;filter:brightness(0) drop-shadow(0 0 8px #fff)}
/* ★★ 2026-11-03 ご指摘「丸の中が表示されない」：ピックアップのシルエット（黒）を黒い丸に出していた → 明るい地（UR は虹色）に黒いシルエット */
#xsm .xs-cut .ct-pic.sil{background:radial-gradient(circle at 50% 38%,#fff 0,#fff6d8 38%,var(--cb2,#9fd0ff) 72%,var(--cb,#2b6bff))}
#xsm .xs-cut.c-rb .ct-pic.sil{background:conic-gradient(from 0deg,#ff5fa2,#ffd257,#7dffb0,#5fd0ff,#c79cff,#ff5fa2)}
/* 正方形の絵は背景まで描いてあるので、真っ黒にすると丸ごと黒くなる → 暗い単色の絵に虹の色味をのせ、まん中に「？」（誰かがうっすら分かる） */
#xsm .xs-cut .ct-pic.sil{position:relative}
#xsm .xs-cut .ct-pic.sil img{filter:grayscale(1) brightness(.5) contrast(1.8);mix-blend-mode:multiply}
#xsm .xs-cut .ct-pic.sil::after{content:"?";position:absolute;inset:0;display:grid;place-items:center;font:900 calc(min(30vh,32vw,210px) * .52)/1 'Orbitron',sans-serif;color:#fff;
  text-shadow:0 0 12px #fff,0 0 30px var(--cb,#ff5fa2);animation:evBlink .5s steps(2) infinite}
#xsm .xs-cut.c-rb .ct-pic:not(.sil){background:radial-gradient(circle,#2a0a3a,#000 70%)}
#xsm .xs-cut.c-rb .ct-pic:not(.sil) svg path:first-child{fill:rgba(255,95,162,.28)}
#xsm .xs-cut .ct-pic svg{width:76%;height:76%}
#xsm .xs-cut .ct-tx{min-width:0;text-shadow:0 3px 10px rgba(0,0,0,.6)}
#xsm .xs-cut .ct-tx small{display:block;font:900 clamp(11px,2vh,15px)/1 'Orbitron',sans-serif;letter-spacing:.4em;opacity:.9}
#xsm .xs-cut .ct-tx b{display:block;margin-top:6px;font:900 clamp(26px,min(8.5vh,10vw),76px)/1 'Orbitron','Noto Sans JP',sans-serif;font-style:italic;letter-spacing:.04em;white-space:nowrap}
#xsm .xs-cut .ct-tx span{display:block;margin-top:8px;font:900 clamp(14px,2.8vh,22px)/1.2 'Noto Sans JP',sans-serif;letter-spacing:.24em}
#xsm .xs-cut.c-red{--cb:#d8102a;--cb2:#ff8a8a}
#xsm .xs-cut.c-gold{--cb:#e08a12;--cb2:#fff2b0}
#xsm .xs-cut.c-rb .ct-band{background:linear-gradient(100deg,#ff4f9a,#ffb020 25%,#41d98a 50%,#2fa8ff 75%,#a35cff);animation:ctBand 1.7s cubic-bezier(.2,.9,.3,1) forwards,xsHue 1.4s linear infinite}
#xsm .xs-cut.c-pk{--cb:#d8600a;--cb2:#ffd29a}
/* 臨界カウントダウン（UR） */
#xsm .xs-count{position:absolute;inset:0;z-index:49;display:none;place-items:center;pointer-events:none;background:rgba(0,0,0,.7)}
#xsm .xs-count.on{display:grid}
#xsm .xs-count b{font:900 clamp(120px,36vmin,300px)/1 'Orbitron',monospace;color:#ff2a3a;text-shadow:0 0 30px #ff2a3a,0 0 80px #ff2a3a;animation:cntIn .5s cubic-bezier(.2,1.5,.4,1)}
#xsm .xs-count small{position:absolute;left:0;right:0;top:calc(50% + min(20vmin,170px));text-align:center;font:900 clamp(14px,3vh,24px)/1 'Noto Sans JP',sans-serif;letter-spacing:.5em;color:#fff}
@keyframes cntIn{from{transform:scale(2.6);opacity:0}}
/* ── ③ 題字（黒い画面に白い明朝）── */
#xsm .xs-title{position:absolute;inset:0;z-index:50;background:#000;display:none;color:#fff;pointer-events:none;font-family:'Noto Serif JP','Hiragino Mincho ProN','Yu Mincho','YuMincho','MS PMincho',serif}
#xsm .xs-title.on{display:block}
#xsm .xs-title > *{position:absolute;opacity:0;white-space:nowrap;line-height:1}
#xsm .xs-title.on > *{animation:evCut .01s steps(1) forwards}
@keyframes evCut{to{opacity:1}}
#xsm .xs-title .ta{left:9%;top:16%;font-size:clamp(90px,26vmin,230px);font-weight:900;transform:scaleY(1.32);transform-origin:0 0;animation-delay:.05s!important}
#xsm .xs-title .tb{left:38%;top:44%;font-size:clamp(90px,26vmin,230px);font-weight:900;transform:scaleY(1.32);transform-origin:0 0;animation-delay:.3s!important}
#xsm .xs-title .tc{right:9%;top:14%;font-size:clamp(26px,6vmin,52px);font-weight:900;writing-mode:vertical-rl;letter-spacing:.2em;animation-delay:.55s!important}
#xsm .xs-title .td{left:9%;bottom:14%;font:900 clamp(11px,2.2vmin,18px)/1.4 'Orbitron',sans-serif;letter-spacing:.42em;color:#dfe6ff;animation-delay:.68s!important}
#xsm .xs-title .te{left:9%;bottom:calc(14% + clamp(18px,3.4vmin,28px));font-size:clamp(14px,3vmin,24px);font-weight:900;letter-spacing:.3em;animation-delay:.68s!important}
#xsm .xs-title.on::after{content:"";position:absolute;inset:0;background:#fff;opacity:0;animation:evTFlash .9s .05s ease-out}
@keyframes evTFlash{0%{opacity:.85}25%{opacity:0}}
#xsm .xs-title.kanji .ta,#xsm .xs-title.kanji .tb{color:#ff2a3a;text-shadow:0 0 30px #ff2a3a;animation:evCut .01s steps(1) forwards,ttGl .5s steps(5)!important}
#xsm .xs-title.kanji .te{color:#ff6a7a}
#xsm .xs-title.kanji{background:radial-gradient(circle at 50% 50%,#2a0004,#000 70%)}
@keyframes ttGl{0%{transform:scaleY(1.32) translateX(-14px) skewX(-18deg);filter:invert(1)}40%{transform:scaleY(1.32) translateX(10px)}70%{transform:scaleY(1.32) translateX(-4px)}100%{transform:scaleY(1.32)}}
/* ── ④ 信号の盤（10枠のレア度をマークで）── */
#xsm .xs-board{position:absolute;inset:0;z-index:20;display:none;flex-direction:column;align-items:center;justify-content:center;gap:clamp(10px,2.4vh,20px);padding:calc(env(safe-area-inset-top,0px) + 60px) 12px calc(env(safe-area-inset-bottom,0px) + 70px)}
#xsm .xs-board.on{display:flex}
#xsm .xs-board h5{margin:0;font:900 clamp(11px,2vh,14px)/1 'Orbitron','Noto Sans JP',sans-serif;letter-spacing:.42em;color:var(--hc);text-shadow:0 0 10px var(--hc)}
#xsm .xs-board .bd{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:clamp(6px,1.6vw,14px);width:min(94vw,600px)}
#xsm .xs-board .bd.n1{grid-template-columns:minmax(0,170px);justify-content:center}
#xsm .bm{position:relative;aspect-ratio:1/1.1;display:grid;place-items:center;opacity:0;transform:scale(.3) rotate(-30deg);--mc:#5aa8ff;--mc2:#cfe6ff}
#xsm .bm.in{animation:bmIn .38s cubic-bezier(.2,1.5,.4,1) forwards}
@keyframes bmIn{to{opacity:1;transform:none}}
#xsm .bm svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;filter:drop-shadow(0 0 8px var(--mc))}
#xsm .bm svg .hx{fill:rgba(0,0,0,.6);stroke:var(--mc);stroke-width:5}
#xsm .bm svg .hi{fill:none;stroke:var(--mc2);stroke-width:1.6;opacity:.8}
#xsm .bm b{position:relative;font:900 clamp(12px,3.2vw,22px)/1 'Orbitron',sans-serif;letter-spacing:.02em;color:var(--mc2);text-shadow:0 0 10px var(--mc)}
#xsm .bm small{position:absolute;bottom:14%;font:900 clamp(7px,1.6vw,10px)/1 'Orbitron',sans-serif;letter-spacing:.2em;color:var(--mc2);opacity:.75}
#xsm .bm.t2{--mc:#ffb020;--mc2:#fff2b0}
#xsm .bm.t3{--mc:#ff5fa2;--mc2:#fff}
#xsm .bm.t3 svg{animation:xsHue 1.8s linear infinite}
#xsm .bm.t3 b{background:linear-gradient(115deg,#ff9ad8,#fff6c4 40%,#a8fff0 70%,#d8c8ff);-webkit-background-clip:text;background-clip:text;color:transparent}
#xsm .bm.t0{--mc:#41d9b0;--mc2:#d8fff4}
#xsm .bm.t0 b{font-size:clamp(9px,2.2vw,14px)}
#xsm .bm .bm-up{position:absolute;left:50%;top:-14%;transform:translateX(-50%) scale(0);font:900 clamp(10px,2.4vw,15px)/1 'Noto Sans JP',sans-serif;letter-spacing:.1em;white-space:nowrap;
  color:#000;background:#fff;padding:3px 8px;box-shadow:0 0 0 2px #000,0 0 14px #fff;z-index:2}
#xsm .bm.upg .bm-up{animation:bmUp 1.3s cubic-bezier(.2,1.5,.4,1) forwards}
@keyframes bmUp{0%{transform:translateX(-50%) scale(0)}20%{transform:translateX(-50%) scale(1.25)}35%,85%{transform:translateX(-50%) scale(1)}100%{transform:translateX(-50%) scale(1);opacity:0}}
#xsm .bm.shk{animation:bmShk .45s linear}
@keyframes bmShk{0%,100%{transform:none}20%{transform:translateX(-6px) rotate(-6deg)}40%{transform:translateX(6px) rotate(6deg)}60%{transform:translateX(-4px)}80%{transform:translateX(3px)}}
#xsm .bm.crk::after{content:"";position:absolute;inset:8%;background:linear-gradient(60deg,transparent 46%,#fff 48%,#fff 50%,transparent 52%),linear-gradient(-40deg,transparent 47%,#fff 49%,transparent 51%);opacity:.9;animation:bmCrk .6s ease-out forwards}
@keyframes bmCrk{to{opacity:0;transform:scale(1.4)}}
#xsm .bm.pop{animation:bmPop .5s cubic-bezier(.2,1.6,.4,1)}
@keyframes bmPop{0%{transform:scale(1.6)}100%{transform:none}}
#xsm .bm .ring{position:absolute;inset:-10%;border-radius:50%;border:3px solid var(--mc);opacity:0}
#xsm .bm.pop .ring{animation:bmRing .7s ease-out}
@keyframes bmRing{0%{opacity:1;transform:scale(.6)}100%{opacity:0;transform:scale(1.8)}}
#xsm .xs-board .cap{min-height:1.2em;text-align:center;opacity:0;transform:translateY(14px) scale(.9)}
#xsm .xs-board .cap.on{animation:bcIn .5s cubic-bezier(.2,1.5,.4,1) forwards}
@keyframes bcIn{to{opacity:1;transform:none}}
#xsm .xs-board .cap b{display:inline-block;font:900 clamp(20px,5vw,38px)/1.1 'Orbitron','Noto Sans JP',sans-serif;font-style:italic;letter-spacing:.06em;padding:6px 18px;color:#000;background:var(--hc);box-shadow:0 0 0 2px #000,0 0 0 4px var(--hc),0 0 26px var(--hc)}
#xsm .xs-board .cap.rb b{background:linear-gradient(100deg,#ff5fa2,#ffd257 25%,#7dffb0 50%,#5fd0ff 75%,#c79cff);background-size:200% 100%;animation:txRb 1.2s linear infinite}
#xsm .xs-board .cap small{display:block;margin-top:8px;font:900 11px 'Orbitron',sans-serif;letter-spacing:.4em;color:var(--hc)}
/* ── 上の帯（題・SKIP）── */
#xsm .xs-top{position:absolute;left:0;right:0;top:0;display:flex;align-items:center;gap:10px;padding:calc(env(safe-area-inset-top,0px) + 10px) 14px 8px;z-index:70;background:linear-gradient(rgba(0,0,0,.7),transparent)}
#xsm .xs-ttl{flex:1;min-width:0;font-size:12px;font-weight:900;letter-spacing:.04em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;opacity:.9}
/* ★★ 2026-10-24 ご指定「スキップボタンをデザイン」：演出（エヴァ風）に合わせた斜めの札。
   左に黄と黒の警告の縞・黒いガラスの地・「SKIP」と小さな「結果へ」・右へ流れる三つの矢印。押すと沈む */
#xsm .xs-skip{flex:none;position:relative;display:flex;align-items:center;gap:8px;height:38px;padding:0 16px 0 24px;border:0;cursor:pointer;color:#fff;
  background:linear-gradient(100deg,rgba(14,10,34,.86),rgba(40,22,70,.86));
  clip-path:polygon(10px 0,100% 0,calc(100% - 10px) 100%,0 100%);
  box-shadow:inset 0 0 0 1.5px rgba(255,210,26,.85);transition:transform .12s,filter .12s;-webkit-tap-highlight-color:transparent}
#xsm .xs-skip::before{content:"";position:absolute;left:0;top:0;bottom:0;width:15px;
  background:repeating-linear-gradient(-55deg,#ffd21a 0 5px,#111 5px 9px);clip-path:polygon(10px 0,15px 0,5px 100%,0 100%)}
#xsm .xs-skip::after{content:"";position:absolute;inset:0;background:linear-gradient(100deg,transparent 35%,rgba(255,255,255,.22) 50%,transparent 65%);
  transform:translateX(-110%);animation:xsSkShine 2.8s ease-in-out infinite;pointer-events:none}
@keyframes xsSkShine{55%,100%{transform:translateX(110%)}}
#xsm .xs-skip .sk-tx{display:flex;flex-direction:column;align-items:flex-start;line-height:1}
#xsm .xs-skip .sk-tx b{font:900 14px/1 'Orbitron',sans-serif;letter-spacing:.16em;color:#ffd21a;text-shadow:0 0 8px rgba(255,210,26,.55)}
#xsm .xs-skip .sk-tx small{margin-top:3px;font-size:9px;font-weight:900;letter-spacing:.2em;opacity:.85}
#xsm .xs-skip .sk-ar{display:flex;gap:1px}
#xsm .xs-skip .sk-ar i{width:8px;height:12px;background:#ffd21a;clip-path:polygon(0 0,45% 0,100% 50%,45% 100%,0 100%,55% 50%);opacity:.25;animation:xsSkAr 1s linear infinite}
#xsm .xs-skip .sk-ar i:nth-child(2){animation-delay:.18s}
#xsm .xs-skip .sk-ar i:nth-child(3){animation-delay:.36s}
@keyframes xsSkAr{0%,100%{opacity:.25}35%{opacity:1}}
#xsm .xs-skip:hover{filter:brightness(1.15)}
#xsm .xs-skip:active{transform:translateY(1px) scale(.96)}
@media (prefers-reduced-motion:reduce){#xsm .xs-skip::after,#xsm .xs-skip .sk-ar i{animation:none;opacity:.9}}
#xsm .xs-cnt{flex:none;font:900 12px 'Orbitron',sans-serif;letter-spacing:.08em;opacity:.85}
/* ── ⑤ 1体ずつ ── */
#xsm .xs-cards{position:absolute;inset:0;display:none;align-items:center;justify-content:center;perspective:1100px;z-index:22}
#xsm.cards .xs-cards{display:flex}
#xsm .xs-glow{position:absolute;left:50%;top:50%;width:150vmax;height:150vmax;margin:-75vmax 0 0 -75vmax;opacity:0;pointer-events:none;transition:opacity .3s;
  background:repeating-conic-gradient(from 0deg,rgba(255,255,255,.18) 0 4deg,transparent 4deg 16deg);animation:xsSpin 18s linear infinite;
  -webkit-mask:radial-gradient(circle,#000 8%,rgba(0,0,0,.6) 30%,transparent 60%);mask:radial-gradient(circle,#000 8%,rgba(0,0,0,.6) 30%,transparent 60%)}
#xsm .xs-glow.g1.on{opacity:.35;filter:sepia(1) hue-rotate(170deg)}
#xsm .xs-glow.g2.on{opacity:.9;background:repeating-conic-gradient(from 0deg,rgba(255,215,90,.55) 0 5deg,transparent 5deg 15deg);animation-duration:10s}
#xsm .xs-glow.g3.on{opacity:1;background:repeating-conic-gradient(from 0deg,rgba(255,110,180,.5) 0 5deg,transparent 5deg 12deg,rgba(255,220,90,.5) 12deg 17deg,transparent 17deg 24deg,rgba(110,255,180,.45) 24deg 29deg,transparent 29deg 36deg,rgba(90,200,255,.5) 36deg 41deg,transparent 41deg 48deg);animation-duration:7s}
/* カードの前の解析（演出が先・キャラはあと） */
#xsm .xs-pre{position:absolute;left:50%;top:50%;width:min(60vmin,330px);aspect-ratio:1/1.1;margin:calc(min(60vmin,330px) * -.55) 0 0 calc(min(60vmin,330px) / -2);display:grid;place-items:center;z-index:4;pointer-events:none;--mc:#5aa8ff;--mc2:#cfe6ff}
#xsm .xs-pre.t2{--mc:#ffb020;--mc2:#fff2b0}
#xsm .xs-pre svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;filter:drop-shadow(0 0 14px var(--mc))}
#xsm .xs-pre svg .hx{fill:rgba(0,0,0,.55);stroke:var(--mc);stroke-width:4}
#xsm .xs-pre svg .r1{fill:none;stroke:var(--mc2);stroke-width:1.5;stroke-dasharray:5 5;animation:xsSpin 4s linear infinite;transform-box:fill-box;transform-origin:center}
#xsm .xs-pre .pt{position:relative;text-align:center;color:var(--mc2);text-shadow:0 0 12px var(--mc)}
#xsm .xs-pre .pt small{display:block;font:900 clamp(10px,2vh,13px)/1 'Orbitron',sans-serif;letter-spacing:.4em}
#xsm .xs-pre .pt b{display:block;margin-top:10px;font:900 clamp(30px,8vh,60px)/1 'Orbitron',sans-serif;letter-spacing:.06em}
#xsm .xs-pre .pt span{display:block;margin-top:10px;font:900 clamp(12px,2.2vh,16px)/1 'Noto Sans JP',sans-serif;letter-spacing:.3em}
#xsm .xs-pre .bar{position:absolute;left:12%;right:12%;bottom:18%;height:4px;background:rgba(255,255,255,.15);overflow:hidden}
#xsm .xs-pre .bar i{display:block;height:100%;width:0;background:var(--mc);box-shadow:0 0 10px var(--mc);animation:preBar var(--pd,.5s) linear forwards}
@keyframes preBar{to{width:100%}}
#xsm .xs-pre.in{animation:preIn .3s cubic-bezier(.2,1.4,.4,1)}
@keyframes preIn{from{transform:scale(.4) rotate(-20deg);opacity:0}}
#xsm .xs-pre.out{animation:preOut .22s steps(3) forwards}
@keyframes preOut{to{opacity:0;transform:scale(1.4)}}
#xsm .xs-band{position:absolute;left:0;right:0;top:50%;transform:translateY(-50%) scaleY(0);z-index:6;pointer-events:none;background:var(--bc,#ff9a1f);color:#000;text-align:center;padding:10px 0 12px}
#xsm .xs-band.go{animation:evWarn 1.1s steps(1) forwards}
#xsm .xs-band b{display:block;font:900 clamp(24px,min(8vh,9.5vw),64px)/1 'Orbitron','Noto Sans JP',sans-serif;letter-spacing:.1em;font-style:italic;white-space:nowrap}
#xsm .xs-band span{display:block;margin-top:6px;font:900 clamp(12px,2.4vh,18px)/1.2 'Noto Sans JP',sans-serif;letter-spacing:.3em}
#xsm .xs-xcross{position:absolute;left:50%;top:50%;width:0;height:0;pointer-events:none;z-index:5}
#xsm .xs-xcross i{position:absolute;left:0;top:0;background:#fff;opacity:0;--xc:#ff9a1f;box-shadow:0 0 30px #fff,0 0 70px var(--xc),0 0 140px var(--xc)}
#xsm .xs-xcross i.v{width:min(9vmin,64px);height:240vh;margin:-120vh 0 0 calc(min(9vmin,64px) / -2);transform:scaleX(0)}
#xsm .xs-xcross i.h{height:min(7vmin,48px);width:150vw;margin:calc(min(7vmin,48px) / -2) 0 0 -75vw;transform:scaleY(0)}
#xsm .xs-xcross.go i.v{animation:evCrV 1.5s cubic-bezier(.15,.9,.3,1) forwards}
#xsm .xs-xcross.go i.h{animation:evCrH 1.5s .08s cubic-bezier(.15,.9,.3,1) forwards}
#xsm .xs-xcross.rb i{--xc:#ff2a6a}
@keyframes evCrV{0%{opacity:1;transform:scaleX(0)}12%{opacity:1;transform:scaleX(1.6)}60%{opacity:.9;transform:scaleX(1)}100%{opacity:0;transform:scaleX(.2)}}
@keyframes evCrH{0%{opacity:1;transform:scaleY(0)}12%{opacity:1;transform:scaleY(1.6)}60%{opacity:.9;transform:scaleY(1)}100%{opacity:0;transform:scaleY(.2)}}
#xsm .xs-card{position:relative;width:min(64vw,340px);aspect-ratio:3/4;transform-style:preserve-3d;transform:translateY(40vh) rotateY(180deg) scale(.4);opacity:0;z-index:3}
#xsm .xs-card.in{animation:xsCardIn .45s cubic-bezier(.2,.9,.3,1.15) forwards}
#xsm .xs-card.flip{animation:xsCardFlip .7s cubic-bezier(.3,.8,.3,1.1) forwards}
@keyframes xsCardIn{to{transform:translateY(0) rotateY(180deg) scale(1);opacity:1}}
@keyframes xsCardFlip{0%{transform:rotateY(180deg) scale(1);opacity:1}60%{transform:rotateY(-12deg) scale(1.06)}100%{transform:rotateY(0) scale(1);opacity:1}}
/* ★ めくりの前半は表を確実に隠す（端末によって裏返しの表が一瞬透けて、左右反転に見えることがある） */
#xsm .xs-card.flip .xs-face{animation:fcOn .7s linear}
@keyframes fcOn{0%,12%{opacity:0}13%,100%{opacity:1}}
#xsm .xs-card.flip .xs-back{animation:bkOff .7s linear forwards}
@keyframes bkOff{0%,12%{opacity:1}13%,100%{opacity:0}}
#xsm .xs-face,#xsm .xs-back{position:absolute;inset:0;border-radius:22px;overflow:hidden;backface-visibility:hidden;-webkit-backface-visibility:hidden}
#xsm .xs-back{transform:rotateY(180deg);background:radial-gradient(circle at 50% 40%,#1c3a8a,#0a1430 70%);box-shadow:0 0 0 4px #9fd0ff,0 0 30px rgba(90,168,255,.6)}
#xsm .xs-back::before{content:"";position:absolute;inset:12px;border-radius:14px;border:2px solid rgba(220,230,255,.7);
  background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='34.64' height='60'%3E%3Cpath d='M17.32 0L34.64 10V30L17.32 40L0 30V10Z M17.32 40V60' fill='none' stroke='white' stroke-opacity='.18' stroke-width='1.2'/%3E%3C/svg%3E")}
#xsm .xs-back::after{content:"";position:absolute;left:50%;top:50%;width:46%;aspect-ratio:1/1.1;transform:translate(-50%,-50%);
  background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 110'%3E%3Cpath d='M50 4L94 29V81L50 106L6 81V29Z' fill='none' stroke='white' stroke-width='5'/%3E%3Cpath d='M50 22L78 38V72L50 88L22 72V38Z' fill='none' stroke='white' stroke-width='2' stroke-opacity='.7'/%3E%3C/svg%3E") center/contain no-repeat;filter:drop-shadow(0 0 12px #8fb0ff)}
#xsm .xs-back.b2{background:radial-gradient(circle at 50% 40%,#8a5a0a,#2a1804 70%);box-shadow:0 0 0 4px #ffd257,0 0 40px rgba(255,200,80,.8)}
#xsm .xs-back.b2::after{filter:drop-shadow(0 0 14px #ffd257)}
#xsm .xs-back.b3{background:linear-gradient(135deg,#ff5fa2,#ffd257 30%,#7dffb0 50%,#5fd0ff 70%,#a35cff);box-shadow:0 0 0 4px #fff,0 0 50px rgba(255,160,230,.9);animation:xsHue 2.4s linear infinite}
#xsm .xs-back.blk{background:radial-gradient(circle at 50% 40%,#2a2440,#05040c 70%);box-shadow:0 0 0 4px #ffd257,0 0 40px rgba(255,93,143,.5)}
#xsm .xs-face{background:#0d0a1e;box-shadow:0 0 0 4px #9fd0ff}
#xsm .xs-face img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
#xsm .xs-face .xs-fx{position:absolute;inset:0;background:linear-gradient(180deg,transparent 52%,rgba(6,4,20,.85));pointer-events:none}
#xsm .xs-face .xs-shine{position:absolute;inset:0;background:linear-gradient(115deg,transparent 35%,rgba(255,255,255,.65) 48%,transparent 60%);transform:translateX(-120%)}
#xsm .xs-card.flip .xs-shine{animation:xsShine .9s .45s ease-out forwards}
@keyframes xsShine{to{transform:translateX(120%)}}
#xsm .xs-face.r2{box-shadow:0 0 0 4px #ffd257,0 0 46px rgba(255,200,80,.85)}
#xsm .xs-face.r3{box-shadow:0 0 0 4px #fff,0 0 0 8px #ff8fd0,0 0 60px rgba(255,140,220,.9)}
#xsm .xs-info{position:absolute;left:0;right:0;bottom:0;padding:12px 14px 14px;text-align:left}
#xsm .xs-rar{display:inline-block;font:900 20px/1 'Orbitron',sans-serif;letter-spacing:.08em;padding:4px 10px 5px;border-radius:8px;margin-bottom:6px;
  background:linear-gradient(135deg,#c8d6ff,#8aa0d8);color:#14203a;opacity:0;transform:scale(2.2) rotate(-8deg)}
#xsm .xs-card.flip .xs-rar{animation:xsStamp .35s .55s cubic-bezier(.2,1.6,.4,1) forwards}
@keyframes xsStamp{to{opacity:1;transform:scale(1) rotate(-4deg)}}
#xsm .xs-rar.r2{background:linear-gradient(135deg,#fff3c4,#ffd257 50%,#ffb020);color:#5a3a00;box-shadow:0 0 18px rgba(255,200,80,.9)}
#xsm .xs-nm{display:block;font-size:clamp(20px,5.6vw,30px);font-weight:900;line-height:1.15;text-shadow:0 2px 10px rgba(0,0,0,.8)}
#xsm .xs-nm span{display:inline-block;opacity:0;transform:translateY(12px)}
#xsm .xs-card.flip .xs-nm span{animation:xsLetter .35s cubic-bezier(.2,1.5,.4,1) forwards}
@keyframes xsLetter{to{opacity:1;transform:none}}
#xsm .xs-sub{display:block;margin-top:3px;font-size:12px;font-weight:900;opacity:.9}
#xsm .xs-new{position:absolute;right:12px;top:12px;font:900 15px 'Orbitron',sans-serif;color:#fff;background:#ff3d6e;border-radius:10px;padding:4px 10px;transform:rotate(8deg) scale(0);box-shadow:0 0 0 2px #fff,0 6px 16px rgba(255,40,90,.5)}
#xsm .xs-card.flip .xs-new{animation:xsNew .35s .8s cubic-bezier(.2,1.6,.4,1) forwards}
@keyframes xsNew{to{transform:rotate(8deg) scale(1)}}
#xsm .xs-elb{position:absolute;left:12px;top:12px;font-size:11px;font-weight:900;padding:3px 9px;border-radius:99px;background:rgba(0,0,0,.55);border:1.5px solid var(--ec,#fff)}
#xsm .xs-burst{position:absolute;left:50%;top:50%;width:0;height:0;pointer-events:none;z-index:4}
#xsm .xs-burst i{position:absolute;left:0;top:0;width:10px;height:10px;margin:-5px;background:var(--pc,#fff);clip-path:polygon(50% 0,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0 50%,38% 38%);opacity:0}
#xsm .xs-burst.go i{animation:xsBurst 1s ease-out forwards}
@keyframes xsBurst{0%{opacity:1;transform:translate(0,0) scale(.5) rotate(0)}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(1.3) rotate(220deg)}}
/* アイテム（描いた絵） */
/* ★★ 2026-10-12d ご指摘「アイテムの輝きが枠をはみ出している」：走る光（::after）が枠の外まで出ていた → overflow:hidden で枠の中だけに */
#xsm .xs-item{position:relative;width:min(56vw,270px);aspect-ratio:1/1.08;border-radius:26px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;z-index:3;overflow:hidden;isolation:isolate;
  background:radial-gradient(circle at 50% 36%,rgba(255,255,255,.22),rgba(10,16,40,.9) 70%);box-shadow:0 0 0 3px var(--ic,#8affc4),0 0 0 7px rgba(0,0,0,.6),0 0 40px var(--ic,#8affc4);
  transform:translateY(30vh) scale(.4) rotate(-10deg);opacity:0}
#xsm .xs-item.in{animation:xsItemIn .5s cubic-bezier(.2,1.3,.4,1) forwards}
@keyframes xsItemIn{to{transform:none;opacity:1}}
#xsm .xs-item .ia{filter:drop-shadow(0 6px 14px rgba(0,0,0,.55)) drop-shadow(0 0 18px var(--ic,#8affc4));animation:iaFloat 2.4s ease-in-out infinite}
@keyframes iaFloat{50%{transform:translateY(-6px) rotate(2deg)}}
#xsm .xs-item small{font:900 11px 'Orbitron',sans-serif;letter-spacing:.4em;color:var(--ic,#8affc4)}
#xsm .xs-item span{font-size:16px;font-weight:900}
#xsm .xs-item::after{content:"";position:absolute;inset:0;border-radius:26px;background:linear-gradient(115deg,transparent 35%,rgba(255,255,255,.4) 48%,transparent 60%);transform:translateX(-120%);animation:xsShine 1s .4s ease-out forwards}
/* ── UR（画面いっぱいの縦長の絵）── */
#xsm .xs-ur{position:absolute;inset:0;display:none;z-index:30;overflow:hidden;background:#05030f}
#xsm .xs-ur.on{display:block}
#xsm .xs-ur .u-bg{position:absolute;inset:-10%;background:conic-gradient(from 0deg,#ff5fa2,#ffd257,#7dffb0,#5fd0ff,#a35cff,#ff5fa2);opacity:.28;filter:blur(30px);animation:xsSpin 8s linear infinite}
#xsm .xs-ur .u-lines{position:absolute;inset:0;background:repeating-linear-gradient(100deg,transparent 0 22px,rgba(255,255,255,.07) 22px 24px);animation:xsLines .8s linear infinite}
@keyframes xsLines{to{background-position:240px 0}}
#xsm .xs-ur .u-art{position:absolute;left:50%;bottom:0;height:min(96vh,100%);aspect-ratio:619/1100;transform:translate(-50%,30%) scale(1.1);opacity:0;
  -webkit-mask:linear-gradient(180deg,#000 82%,transparent);mask:linear-gradient(180deg,#000 82%,transparent)}
#xsm .xs-ur.go .u-art{animation:xsUrArt 1.1s 3.1s cubic-bezier(.15,.85,.25,1) forwards}
@keyframes xsUrArt{to{transform:translate(-50%,0) scale(1);opacity:1}}
#xsm .xs-ur .u-art img{width:100%;height:100%;object-fit:cover;display:block}
#xsm .xs-ur .u-frame{position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 0 0 3px rgba(255,255,255,.9),inset 0 0 0 8px rgba(255,140,220,.55),inset 0 0 80px rgba(255,180,240,.35)}
#xsm .xs-ur .u-emb{position:absolute;left:calc(env(safe-area-inset-left,0px) + 4%);top:calc(env(safe-area-inset-top,0px) + 70px);width:min(30vmin,170px);aspect-ratio:1;opacity:0;transform:scale(2.5) rotate(-30deg)}
#xsm .xs-ur.go .u-emb{animation:xsEmb .6s 3.9s cubic-bezier(.2,1.5,.4,1) forwards}
@keyframes xsEmb{to{opacity:1;transform:none}}
#xsm .xs-ur .u-emb i{position:absolute;inset:0;border-radius:50%;background:conic-gradient(#ff5fa2,#ffd257,#7dffb0,#5fd0ff,#a35cff,#ff5fa2);animation:xsSpin 3s linear infinite;
  -webkit-mask:radial-gradient(circle,transparent 58%,#000 60%);mask:radial-gradient(circle,transparent 58%,#000 60%)}
#xsm .xs-ur .u-emb b{position:absolute;inset:0;display:grid;place-items:center;font:900 min(13vmin,72px)/1 'Orbitron',sans-serif;letter-spacing:.02em;
  background:linear-gradient(115deg,#fff,#ffd6f0 30%,#fff6c4 60%,#c8f6ff);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 12px rgba(255,160,230,.9))}
#xsm .xs-ur .u-txt{position:absolute;right:calc(env(safe-area-inset-right,0px) + 4%);bottom:calc(env(safe-area-inset-bottom,0px) + 9%);text-align:right;max-width:70%;opacity:0;transform:translateX(40px)}
#xsm .xs-ur.go .u-txt{animation:xsUrTx .6s 4.05s cubic-bezier(.2,1.2,.4,1) forwards}
@keyframes xsUrTx{to{opacity:1;transform:none}}
#xsm .xs-ur .u-txt small{display:block;font:900 12px 'Orbitron',sans-serif;letter-spacing:.4em;color:#ffd6f0}
#xsm .xs-ur .u-txt b{display:block;font-size:clamp(34px,10vw,72px);font-weight:900;line-height:1.05;
  background:linear-gradient(100deg,#fff,#ffd6f0 30%,#fff6c4 60%,#c8f6ff);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 3px 10px rgba(0,0,0,.8))}
#xsm .xs-ur .u-txt span{display:block;margin-top:6px;font-size:13px;font-weight:900;color:#fff;text-shadow:0 2px 8px #000}
#xsm .xs-ur .u-sp{position:absolute;inset:0;pointer-events:none}
#xsm .xs-ur .u-sp i{position:absolute;top:-6%;width:8px;height:8px;background:#fff;clip-path:polygon(50% 0,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0 50%,38% 38%);animation:xsFall 3s linear infinite}
@keyframes xsFall{to{transform:translateY(112vh) rotate(360deg)}}
#xsm .xs-ur .u-flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none;z-index:7}
#xsm .xs-ur.go .u-flash{animation:xsFlash .8s 3s ease-out}
@media (min-aspect-ratio:4/3){#xsm .xs-ur .u-art{left:38%}}
/* UR の前：警報 → 文字変化（反応検知 → 臨界突破 → 覚醒）→ 虹のカットイン → 十字の光 */
#xsm .xs-ur .u-alert{position:absolute;inset:0;z-index:6;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:#ff2a3a;animation:evUrA 3.05s steps(1) forwards}
@keyframes evUrA{0%,96%{opacity:1}100%{opacity:0;visibility:hidden}}
#xsm .xs-ur .u-alert b{font:900 clamp(28px,min(11vh,11vw),96px)/1 'Orbitron',sans-serif;letter-spacing:.08em;font-style:italic;text-shadow:0 0 24px #ff2a3a;animation:evBlink .2s steps(2) infinite;white-space:nowrap}
#xsm .xs-ur .u-alert span{font:900 clamp(14px,3vh,24px)/1.2 'Noto Sans JP',sans-serif;letter-spacing:.4em;color:#fff}
#xsm .xs-ur .u-alert em{font-style:normal;font:900 clamp(40px,12vh,110px)/1 'Noto Serif JP','Hiragino Mincho ProN','Yu Mincho',serif;letter-spacing:.3em;color:#fff;opacity:0;text-shadow:0 0 30px #ff2a3a}
#xsm .xs-ur .u-alert.k em{animation:ukIn .5s steps(5) forwards}
#xsm .xs-ur .u-alert.k b{animation:none;opacity:.25}
@keyframes ukIn{0%{opacity:1;transform:scale(1.8);filter:invert(1)}40%{transform:translateX(-12px)}70%{transform:translateX(8px)}100%{opacity:1;transform:none;filter:none}}
#xsm .xs-ur .u-alert i{position:absolute;left:0;right:0;height:clamp(22px,4.6vh,40px);background:repeating-linear-gradient(-45deg,#ff2a3a 0 16px,#111 16px 32px)}
#xsm .xs-ur .u-alert i.t{top:12%} #xsm .xs-ur .u-alert i.b{bottom:12%}
#xsm .xs-ur .u-alert.rb i{background:repeating-linear-gradient(-45deg,#ff5fa2 0 14px,#ffd257 14px 28px,#7dffb0 28px 42px,#5fd0ff 42px 56px,#111 56px 70px)}
/* ── 下の案内・進み ── */
#xsm .xs-foot{position:absolute;left:0;right:0;bottom:calc(env(safe-area-inset-bottom,0px) + 14px);display:none;flex-direction:column;align-items:center;gap:8px;z-index:65;pointer-events:none}
#xsm.cards .xs-foot,#xsm.board .xs-foot{display:flex}
#xsm .xs-dots{display:flex;gap:5px}
#xsm .xs-dots i{width:9px;height:10px;clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%);background:rgba(255,255,255,.25);transition:all .3s}
#xsm .xs-dots i.d{background:rgba(160,200,255,.85)}
#xsm .xs-dots i.d2{background:#ffd257}
#xsm .xs-dots i.d3{background:#ff8fd0}
#xsm .xs-dots i.d0{background:#41d9b0}
#xsm .xs-dots i.on{transform:scale(1.5)}
#xsm .xs-tap{font:900 11px 'Orbitron',sans-serif;letter-spacing:.3em;opacity:.75;animation:xsBlink 1.2s ease-in-out infinite}
/* ── ⑥ まとめ ── */
#xsm .xs-sum{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;padding:calc(env(safe-area-inset-top,0px) + 56px) 12px calc(env(safe-area-inset-bottom,0px) + 16px);z-index:68;
  background:radial-gradient(120% 90% at 50% 30%,rgba(40,30,90,.94),rgba(6,4,18,.97))}
#xsm .xs-sum.on{display:flex;animation:xsSumIn .4s ease}
@keyframes xsSumIn{from{opacity:0}}
#xsm .xs-sum h3{font:900 clamp(18px,4.6vw,26px) 'Orbitron','Noto Sans JP',sans-serif;letter-spacing:.06em;margin:0 0 4px;text-align:center}
#xsm .xs-sum h4{font-size:12px;font-weight:800;opacity:.85;margin:0 0 12px;text-align:center}
#xsm .xs-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;width:min(96vw,620px)}
#xsm .xs-grid.n1{grid-template-columns:minmax(0,180px);justify-content:center}
#xsm .xs-cell{position:relative;border-radius:14px;overflow:hidden;aspect-ratio:3/4;background:#141a3a;box-shadow:0 0 0 2px rgba(200,214,255,.7);cursor:pointer;
  opacity:0;transform:translateY(16px) scale(.9);animation:xsCell .35s cubic-bezier(.2,1.3,.4,1) forwards}
@keyframes xsCell{to{opacity:1;transform:none}}
#xsm .xs-cell img{width:100%;height:100%;object-fit:cover;display:block}
#xsm .xs-cell.r2{box-shadow:0 0 0 2.5px #ffd257,0 0 16px rgba(255,200,80,.7)}
#xsm .xs-cell.r3{box-shadow:0 0 0 2.5px #fff,0 0 0 5px #ff8fd0,0 0 20px rgba(255,140,220,.8)}
#xsm .xs-cell .c-r{position:absolute;left:4px;top:4px;font:900 10px 'Orbitron',sans-serif;padding:2px 5px;border-radius:5px;background:#8aa0d8;color:#14203a}
#xsm .xs-cell.r2 .c-r{background:#ffd257;color:#5a3a00}
#xsm .xs-cell.r3 .c-r{background:linear-gradient(115deg,#ff5fa2,#ffd257,#7dffb0,#5fd0ff);color:#fff}
#xsm .xs-cell .c-n{position:absolute;left:0;right:0;bottom:0;padding:12px 4px 4px;font-size:10px;font-weight:900;text-align:center;line-height:1.25;background:linear-gradient(transparent,rgba(5,4,16,.92))}
#xsm .xs-cell .c-n small{display:block;font-size:9px;opacity:.9}
#xsm .xs-cell .c-new{position:absolute;right:3px;top:3px;font:900 9px 'Orbitron',sans-serif;background:#ff3d6e;border-radius:5px;padding:2px 5px}
#xsm .xs-cell.it{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;cursor:default;background:radial-gradient(circle at 50% 35%,rgba(255,255,255,.18),#141a3a 72%);box-shadow:0 0 0 2px var(--ic,#8affc4)}
#xsm .xs-cell.it .ia{width:66%;display:grid;place-items:center}
#xsm .xs-cell.it .ia svg, #xsm .xs-cell.it .ia img{width:100%!important;height:auto!important}
#xsm .xs-cell.it span{font-size:9.5px;font-weight:900;text-align:center;padding:0 3px;line-height:1.2}
#xsm .xs-btns{display:flex;gap:10px;margin-top:16px}
#xsm .xs-ok{border:none;cursor:pointer;font:900 16px 'Orbitron','Noto Sans JP',sans-serif;letter-spacing:.1em;color:#fff;padding:13px 54px;border-radius:99px;background:linear-gradient(135deg,#7b5cf0,#f0509a);box-shadow:0 8px 22px rgba(123,92,240,.5)}
#xsm .xs-sumtag{margin-top:10px;font-size:11px;font-weight:800;opacity:.8;text-align:center}
@media (max-width:420px){#xsm .xs-grid{gap:5px}#xsm .xs-cell .c-n{font-size:9px}}
/* ── ★★ 2026-11-03 ① のスロット（前の「共鳴率 ％」のかわり）── */
#xsm .ev-slot{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%) scale(.6);width:min(86vw,440px);opacity:0;z-index:2;--sh:min(9.5vh,15vw,74px)}
#xsm .xs-eva.hud .ev-slot{opacity:1;transform:translate(-50%,-50%);transition:transform .35s cubic-bezier(.2,1.5,.4,1),opacity .2s}
#xsm .ev-slot .sl-hd{display:flex;justify-content:space-between;align-items:flex-end;margin:0 4px 5px;font:900 clamp(9px,1.6vh,12px)/1 'Orbitron',sans-serif;letter-spacing:.32em;color:var(--hc);text-shadow:0 0 8px var(--hc)}
#xsm .ev-slot .sl-hd b{font-family:'Noto Serif JP','Yu Mincho',serif;font-size:clamp(12px,2.2vh,16px);letter-spacing:.4em}
#xsm .ev-slot .sl-box{position:relative;display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:8px;border-radius:6px;background:rgba(0,0,0,.72);
  box-shadow:0 0 0 2px var(--hc),0 0 0 5px #000,0 0 0 7px var(--hc),0 0 34px var(--hca)}
#xsm .ev-slot .rl{position:relative;height:calc(var(--sh) * 3);overflow:hidden;border-radius:3px;background:linear-gradient(#05070f,#12162a 50%,#05070f);
  -webkit-mask:linear-gradient(transparent,#000 22%,#000 78%,transparent);mask:linear-gradient(transparent,#000 22%,#000 78%,transparent)}
#xsm .ev-slot .st{position:absolute;left:0;right:0;top:0;display:flex;flex-direction:column}
#xsm .ev-slot .rl.spin .st{animation:slSpin .3s linear infinite;filter:blur(1.4px) brightness(1.2)}
@keyframes slSpin{from{transform:translateY(calc(var(--sh) * -10))}to{transform:translateY(0)}}
#xsm .ev-slot .rl.stop .st{animation:slStop .5s cubic-bezier(.25,1.7,.45,1) forwards}
@keyframes slStop{from{transform:translateY(calc(var(--sh) * -3))}to{transform:translateY(calc(var(--sh) * -1))}}
#xsm .ev-slot .sy{flex:none;height:var(--sh);display:grid;place-items:center;font-style:normal;font:900 calc(var(--sh) * .78)/1 'Orbitron',sans-serif;position:relative}
#xsm .ev-slot .s7{color:#ff2a3a;-webkit-text-stroke:2px #fff;text-shadow:0 0 12px #ff2a3a,0 0 26px #ff2a3a;font-style:italic}
#xsm .ev-slot .sten b{font:900 calc(var(--sh) * .62)/1 'Noto Serif JP','Yu Mincho',serif;color:#fff;text-shadow:0 0 10px #fff,0 0 22px #ffd257;position:relative}
#xsm .ev-slot .sten::before{content:"";position:absolute;width:calc(var(--sh) * .86);height:calc(var(--sh) * .86);border-radius:50%;border:3px solid #ffd257;box-shadow:0 0 14px #ffd257,inset 0 0 12px #ffd257}
#xsm .ev-slot .shex svg{position:absolute;width:calc(var(--sh) * .82);height:calc(var(--sh) * .82)}
#xsm .ev-slot .shex svg path{fill:rgba(255,176,32,.25);stroke:#ffb020;stroke-width:8}
#xsm .ev-slot .shex b{font-size:calc(var(--sh) * .4);color:#fff2b0;text-shadow:0 0 10px #ffb020;position:relative}
#xsm .ev-slot .sstar{color:#5fb0ff;text-shadow:0 0 12px #2b7bff;font-size:calc(var(--sh) * .7)}
#xsm .ev-slot .sx{color:#c79cff;text-shadow:0 0 12px #7a3cff;font-size:calc(var(--sh) * .66)}
#xsm .ev-slot .szero{color:#7dffb0;text-shadow:0 0 10px #1fbf6a;font:900 calc(var(--sh) * .6)/1 'Noto Serif JP','Yu Mincho',serif}
#xsm .ev-slot .pay{position:absolute;left:4px;right:4px;top:calc(8px + var(--sh));height:var(--sh);pointer-events:none;border-top:2px solid rgba(255,255,255,.35);border-bottom:2px solid rgba(255,255,255,.35)}
#xsm .ev-slot.reach .rl.c{box-shadow:inset 0 0 0 3px var(--rc,#ff2a3a),0 0 26px var(--rc,#ff2a3a);animation:slReach .32s steps(2) infinite}
@keyframes slReach{50%{box-shadow:inset 0 0 0 3px #fff,0 0 40px var(--rc,#ff2a3a)}}
#xsm .ev-slot.hit .pay{border-color:#fff;background:linear-gradient(90deg,transparent,rgba(255,255,255,.28),transparent);animation:slHit .25s steps(2) 6}
@keyframes slHit{50%{background:transparent;border-color:var(--rc,#ffd257)}}
#xsm .ev-slot.hit .sl-box{animation:slBoxHit .6s ease-out}
@keyframes slBoxHit{0%{transform:scale(1.12);filter:brightness(2)}100%{transform:none;filter:none}}
#xsm .ev-slot.hit.rb .sl-box{box-shadow:0 0 0 2px #fff,0 0 0 5px #000,0 0 0 7px #ffd257,0 0 50px #ff5fa2,0 0 90px #5fd0ff}
#xsm .ev-slot .sl-rc{position:absolute;left:50%;bottom:calc(100% + 26px);transform:translateX(-50%) scale(0);white-space:nowrap;text-align:center;pointer-events:none}
#xsm .ev-slot .sl-rc b{display:block;font:900 clamp(26px,6.4vh,52px)/1 'Noto Serif JP','Yu Mincho',serif;letter-spacing:.18em;color:#fff;
  -webkit-text-stroke:1.5px var(--rc,#ff2a3a);text-shadow:0 0 14px var(--rc,#ff2a3a),0 0 34px var(--rc,#ff2a3a);transform:scaleY(1.2)}
#xsm .ev-slot .sl-rc small{display:block;margin-top:6px;font:900 clamp(10px,1.8vh,13px)/1 'Orbitron',sans-serif;letter-spacing:.45em;color:var(--rc,#ff2a3a)}
#xsm .ev-slot.reach .sl-rc{animation:slRc .45s cubic-bezier(.2,1.6,.4,1) forwards}
@keyframes slRc{to{transform:translateX(-50%) scale(1)}}
#xsm .ev-slot.rcrb .sl-rc b{background:linear-gradient(100deg,#ff5fa2,#ffd257 25%,#7dffb0 50%,#5fd0ff 75%,#c79cff);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-stroke:0;animation:txRb 1s linear infinite}
/* ── ★★ 2026-11-03 UR：画面いっぱいの EMERGENCY の札 ── */
#xsm .ev-emg{position:absolute;inset:0;z-index:1;pointer-events:none}
#xsm .ev-emg i{position:absolute;width:clamp(96px,26vmin,190px);padding:7px 0 8px;text-align:center;font:900 clamp(12px,2.6vmin,20px)/1 'Orbitron',sans-serif;font-style:italic;letter-spacing:.08em;
  color:#ff2a3a;background:rgba(40,0,6,.82);box-shadow:0 0 0 2px #ff2a3a,0 0 22px rgba(255,42,58,.7);opacity:0;transform:scale(1.8);animation:emgIn .18s steps(2) forwards,evBlink .5s steps(2) .2s infinite}
#xsm .ev-emg i small{display:block;margin-top:4px;font:900 .55em/1 'Noto Sans JP',sans-serif;letter-spacing:.3em;font-style:normal}
@keyframes emgIn{to{opacity:1;transform:none}}
/* ── ★★ 2026-11-03 天使降臨（UR 2体以上・超豪華ロング）── */
#xsm .xs-angel{position:absolute;inset:0;z-index:47;display:none;pointer-events:none;overflow:hidden;background:#000}
#xsm .xs-angel.on{display:block}
#xsm .xs-angel .ag-sky{position:absolute;inset:0;opacity:0;transition:opacity 1.2s;background:radial-gradient(ellipse at 50% 30%,#fff6e0 0,#9fd0ff 18%,#2a3a8a 46%,#05061a 78%)}
#xsm .xs-angel.sky .ag-sky{opacity:1}
#xsm .xs-angel .ag-rays{position:absolute;left:50%;top:38%;width:220vmax;height:220vmax;margin:-110vmax 0 0 -110vmax;opacity:0;transition:opacity 1s;
  background:repeating-conic-gradient(from 0deg,rgba(255,255,255,.22) 0 3deg,transparent 3deg 12deg);animation:xsSpin 30s linear infinite;
  -webkit-mask:radial-gradient(circle,#000 6%,rgba(0,0,0,.5) 26%,transparent 52%);mask:radial-gradient(circle,#000 6%,rgba(0,0,0,.5) 26%,transparent 52%)}
#xsm .xs-angel.sky .ag-rays{opacity:1}
#xsm .xs-angel .ag-city{position:absolute;left:0;right:0;bottom:0;height:24%;opacity:0;transition:opacity 1s;
  background:linear-gradient(transparent,rgba(0,0,0,.85)),repeating-linear-gradient(90deg,#070a18 0 18px,#0c1230 18px 30px,#05070f 30px 52px,#0a0f26 52px 64px);
  -webkit-mask:linear-gradient(transparent,#000 30%);mask:linear-gradient(transparent,#000 30%);clip-path:polygon(0 60%,6% 60%,6% 30%,12% 30%,12% 50%,18% 50%,18% 18%,23% 18%,23% 46%,30% 46%,30% 8%,35% 8%,35% 40%,42% 40%,42% 26%,48% 26%,48% 52%,55% 52%,55% 12%,61% 12%,61% 44%,67% 44%,67% 22%,73% 22%,73% 56%,80% 56%,80% 16%,86% 16%,86% 48%,93% 48%,93% 34%,100% 34%,100% 100%,0 100%)}
#xsm .xs-angel.sky .ag-city{opacity:1}
#xsm .xs-angel .ag-ttl{position:absolute;inset:0;background:#000;color:#fff;font-family:'Noto Serif JP','Hiragino Mincho ProN','Yu Mincho','YuMincho',serif;z-index:6}
#xsm .xs-angel .ag-ttl.out{animation:evOut .3s steps(3) forwards}
#xsm .xs-angel .ag-ttl b{position:absolute;font-weight:900;line-height:1;opacity:0;transform:scaleY(1.34);transform-origin:0 0}
#xsm .xs-angel .ag-ttl b.on{animation:evCut .01s steps(1) forwards}
#xsm .xs-angel .ag-ttl .a1{left:8%;top:12%;font-size:clamp(84px,24vmin,210px)}
#xsm .xs-angel .ag-ttl .a2{left:34%;top:12%;font-size:clamp(84px,24vmin,210px)}
#xsm .xs-angel .ag-ttl .a3{left:59%;top:24%;font-size:clamp(40px,10vmin,90px)}
#xsm .xs-angel .ag-ttl .a4{left:18%;top:50%;font-size:clamp(84px,24vmin,210px);color:#ff2a3a;text-shadow:0 0 30px #ff2a3a}
#xsm .xs-angel .ag-ttl .a5{left:46%;top:50%;font-size:clamp(84px,24vmin,210px);color:#ff2a3a;text-shadow:0 0 30px #ff2a3a}
#xsm .xs-angel .ag-ttl small{position:absolute;left:8%;bottom:10%;font:900 clamp(11px,2.2vmin,18px)/1.4 'Orbitron',sans-serif;letter-spacing:.42em;color:#dfe6ff;opacity:0}
#xsm .xs-angel .ag-ttl small.on{animation:evCut .01s steps(1) forwards}
#xsm .xs-angel .ag-ttl em{position:absolute;right:8%;top:10%;writing-mode:vertical-rl;font-style:normal;font-weight:900;font-size:clamp(20px,5vmin,44px);letter-spacing:.3em;opacity:0}
#xsm .xs-angel .ag-ttl em.on{animation:evCut .01s steps(1) forwards}
#xsm .xs-angel .ag-body{position:absolute;left:50%;top:40%;width:min(92vmin,680px);height:min(92vmin,680px);margin:calc(min(92vmin,680px) / -2) 0 0 calc(min(92vmin,680px) / -2);opacity:0;z-index:2}
#xsm .xs-angel.desc .ag-body{animation:agDesc 2.6s cubic-bezier(.16,.8,.3,1) forwards}
@keyframes agDesc{0%{opacity:0;transform:translateY(-70%) scale(.55)}25%{opacity:1}100%{opacity:1;transform:none}}
#xsm .xs-angel .ag-body svg{width:100%;height:100%;overflow:visible}
#xsm .xs-angel .ag-body .halo{transform-box:fill-box;transform-origin:center;animation:xsSpin 9s linear infinite}
#xsm .xs-angel .ag-body .halo2{transform-box:fill-box;transform-origin:center;animation:xsSpin 6s linear infinite reverse}
#xsm .xs-angel .ag-body .wing{transform-box:view-box;transform-origin:200px 200px;animation:agWing 2.6s ease-in-out infinite alternate}
#xsm .xs-angel .ag-body .wing.r{animation-name:agWingR}
@keyframes agWing{from{transform:rotate(-4deg)}to{transform:rotate(5deg)}}
@keyframes agWingR{from{transform:rotate(4deg)}to{transform:rotate(-5deg)}}
#xsm .xs-angel .ag-body .core{transform-box:fill-box;transform-origin:center;animation:agCore 1.6s ease-in-out infinite}
@keyframes agCore{50%{transform:scale(1.08);filter:brightness(1.5)}}
#xsm .xs-angel.charge .ag-body .core{animation:agCore .28s ease-in-out infinite}
#xsm .xs-angel.charge .ag-body{filter:drop-shadow(0 0 30px #fff) drop-shadow(0 0 60px #ffd257)}
#xsm .xs-angel.open .ag-body .wing{animation-duration:.9s}
#xsm .xs-angel .ag-band{position:absolute;left:-10%;right:-10%;height:clamp(24px,5vh,42px);background:#fff;color:#000;display:flex;align-items:center;overflow:hidden;opacity:0;z-index:4;transform:rotate(-6deg)}
#xsm .xs-angel .ag-band.t{top:16%} #xsm .xs-angel .ag-band.b{bottom:20%;transform:rotate(-6deg)}
#xsm .xs-angel .ag-band span{flex:none;white-space:nowrap;font:900 clamp(12px,2.4vh,18px)/1 'Orbitron',sans-serif;letter-spacing:.34em;animation:evMarq 2.2s linear infinite}
#xsm .xs-angel .ag-band.b span{animation-direction:reverse}
#xsm .xs-angel.bands .ag-band{animation:agBand .3s steps(2) forwards}
@keyframes agBand{to{opacity:.92}}
#xsm .xs-angel .ag-pil{position:absolute;inset:0;z-index:3}
#xsm .xs-angel .ag-pil i{position:absolute;bottom:-5%;width:clamp(40px,12vmin,110px);height:115%;margin-left:calc(clamp(40px,12vmin,110px) / -2);transform:scaleY(0);transform-origin:50% 100%;
  background:linear-gradient(transparent,rgba(255,255,255,.95) 30%,#fff 60%,rgba(255,240,200,.9));box-shadow:0 0 40px #fff,0 0 90px #ffd257,0 0 160px #ff5fa2;mix-blend-mode:screen}
#xsm .xs-angel .ag-pil i.go{animation:agPil 1.6s cubic-bezier(.2,.9,.3,1) forwards}
@keyframes agPil{0%{transform:scaleY(0) scaleX(.4)}22%{transform:scaleY(1) scaleX(1.3)}70%{transform:scaleY(1) scaleX(1)}100%{transform:scaleY(1) scaleX(.85);opacity:.85}}
#xsm .xs-angel .ag-pil b{position:absolute;top:58%;transform:translate(-50%,-50%) scale(0);font:900 clamp(22px,6vmin,48px)/1 'Orbitron',sans-serif;font-style:italic;color:#fff;text-shadow:0 0 14px #ff5fa2,0 0 30px #ffd257;white-space:nowrap}
#xsm .xs-angel .ag-pil b.go{animation:slRcB .5s cubic-bezier(.2,1.6,.4,1) .2s forwards}
@keyframes slRcB{to{transform:translate(-50%,-50%) scale(1)}}
#xsm .xs-angel .xs-xcross{z-index:4}
#xsm .xs-angel .ag-cnt{position:absolute;left:50%;top:40%;transform:translate(-50%,-50%);z-index:5;text-align:center;display:none}
#xsm .xs-angel .ag-cnt.on{display:block}
#xsm .xs-angel .ag-cnt b{display:block;font:900 clamp(110px,32vmin,260px)/1 'Orbitron',monospace;color:#fff;text-shadow:0 0 30px #ffd257,0 0 70px #ff5fa2;animation:cntIn .5s cubic-bezier(.2,1.5,.4,1)}
#xsm .xs-angel .ag-cnt small{display:block;margin-top:6px;font:900 clamp(14px,3vh,22px)/1 'Noto Serif JP','Yu Mincho',serif;letter-spacing:.6em;color:#fff;text-shadow:0 0 10px #000}
#xsm .xs-angel .ag-wo{position:absolute;inset:0;background:#fff;opacity:0;z-index:7}
#xsm .xs-angel .ag-wo.go{animation:agWo 1.4s ease-out forwards}
@keyframes agWo{0%{opacity:0}18%{opacity:1}55%{opacity:1}100%{opacity:0}}
#xsm .xs-angel .ag-fin{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) scale(.3);z-index:8;text-align:center;opacity:0;white-space:nowrap}
#xsm .xs-angel .ag-fin.on{animation:agFin .6s cubic-bezier(.2,1.6,.4,1) forwards}
@keyframes agFin{to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
#xsm .xs-angel .ag-fin b{display:block;font:900 clamp(54px,15vmin,130px)/1 'Orbitron',sans-serif;font-style:italic;letter-spacing:.04em;
  background:linear-gradient(100deg,#ff5fa2,#ffd257 25%,#7dffb0 50%,#5fd0ff 75%,#c79cff);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 0 3px #000) drop-shadow(0 0 18px rgba(255,255,255,.8));animation:txRb 1s linear infinite}
#xsm .xs-angel .ag-fin small{display:block;margin-top:10px;font:900 clamp(26px,7vmin,60px)/1 'Noto Serif JP','Yu Mincho',serif;letter-spacing:.5em;color:#fff;text-shadow:0 0 20px #ffd257,0 0 40px #ff5fa2}
#xsm .xs-angel .ag-fin em{display:block;margin-top:12px;font:900 clamp(10px,1.8vh,13px)/1 'Orbitron',sans-serif;letter-spacing:.42em;color:#ffe9a8;font-style:normal}
@media (prefers-reduced-motion:reduce){#xsm *{animation-duration:.01s!important;animation-iteration-count:1!important}}
`;
    document.head.appendChild(s);
  }

  /* ══ 状態 ══ */
  let S = null;              // いまの公開の状態
  const T = [];              // タイマー
  function at(ms, fn) { const id = setTimeout(() => { try { fn(); } catch (e) { console.warn("[summon]", e); } }, ms); T.push(id); return id; }
  function clearT() { while (T.length) clearTimeout(T.pop()); }
  const alive = (ov) => !!(S && S.ov === ov);

  /* ══ 確定演出の選びかた（出たら必ずその内容＝うそをつかない）══ */
  function chooseTells(rs, gmode, ft) {
    /* ★★ 2026-11-03 ft（昇格まえの色）を渡すと、それで決める（①〜③で昇格がばれないように） */
    const tiers = ft ? ft.slice() : rs.map(tierOf);
    const best = Math.max(0, ...tiers);
    const nS = tiers.filter((t) => t >= 2).length;
    let pick = [];
    try { pick = gmode && typeof pickIdsOfMode === "function" ? pickIdsOfMode(gmode) : []; } catch (e) { pick = []; }
    const pickHit = rs.find((r, i) => r.type === "char" && tiers[i] >= 2 && pick.indexOf(r.id) >= 0);
    let pumpkin = false;
    try { const f = gmode && typeof fesDef === "function" ? FESTS[gmode] : null; pumpkin = !!(f && f.pumpkin) && best === 3; } catch (e) {}
    const tl = [];
    const rnd = Math.random;
    if (best === 3 && rnd() < 0.45) tl.push("rank");        /* 警報の橙が赤に割れる（UR 確定） */
    if (best === 3 && rnd() < 0.5) tl.push("kanji");        /* 題字が赤い「覚醒」に書きかわる（UR 確定） */
    if (best === 3 && rnd() < 0.4) tl.push("count");        /* 臨界カウントダウン（UR 確定） */
    if (best === 3 && rnd() < 0.5) tl.push("rbbar");        /* 警報の帯が虹色（UR 確定） */
    if (nS >= 2 && rnd() < 0.6) tl.push("double");          /* カットインが2回（SSR以上が2体以上） */
    if (pickHit && rnd() < 0.55) tl.push("sil");            /* ピックアップのシルエット（カットインの中） */
    if (pumpkin && rnd() < 0.75) tl.push("pk");             /* 南瓜のカットイン（Pumpkin Night の UR） */
    /* カットインの色：虹＝UR／金＝SSR以上が2体以上／赤＝SSR以上／青＝何も約束しない（ふつうの回は半分くらい） */
    let cut = null;
    if (best === 3 && rnd() < 0.75) cut = "rb";
    else if (nS >= 2 && rnd() < 0.7) cut = "gold";
    else if (best >= 2 && rnd() < 0.75) cut = "red";
    else if (rnd() < 0.45) cut = "blue";
    if (tl.indexOf("double") >= 0 && !cut) cut = "gold";
    if ((tl.indexOf("sil") >= 0 || tl.indexOf("pk") >= 0) && !cut) cut = best === 3 ? "rb" : "red";
    return { best, nS, tl, pickHit, pumpkin, cut };
  }
  const has1 = (info, k) => info.tl.indexOf(k) >= 0;
  function capText(info) {
    if (has1(info, "pk")) return ["PUMPKIN NIGHT UR 確定!!", "TRICK OR TREAT", true];
    if (info.best === 3) return ["UR 確定", "ULTRA RARE", true];
    if (info.nS >= 2) return ["W SSR以上 確定", "DOUBLE SUPER RARE", false];
    if (info.best === 2 && info.pickHit) return ["PICK UP 確定", "SUPER RARE", false];
    if (info.best === 2) return ["SSR以上 確定", "SUPER RARE", false];
    return ["", "", false];
  }

  /* ══ 組み立て ══ */
  const HEXPAT = '<svg width="100%" height="100%"><defs><pattern id="xsHexP" width="34.64" height="60" patternUnits="userSpaceOnUse"><path d="M17.32 0L34.64 10V30L17.32 40L0 30V10Z M17.32 40V60" fill="none" stroke="currentColor" stroke-width="1.2"/></pattern></defs><rect width="100%" height="100%" fill="url(#xsHexP)"/></svg>';
  function build(title) {
    css();
    let ov = document.getElementById("xsm");
    if (ov) ov.remove();
    ov = document.createElement("div");
    ov.id = "xsm";
    ov.innerHTML = `
      <div class="xs-bg">${HEXPAT}<div class="scan"></div><div class="sweep"></div><div class="vig"></div></div>
      <div class="xs-boot"><div class="line"></div><pre></pre></div>
      <div class="xs-eva"></div>
      <div class="xs-angel"></div>
      <div class="xs-cut"></div>
      <div class="xs-count"><b></b><small>臨界まで</small></div>
      <div class="xs-title"></div>
      <div class="xs-board"></div>
      <div class="xs-cards"></div>
      <div class="xs-ur"></div>
      <div class="xs-sum"></div>
      <div class="xs-flash"></div>
      <div class="xs-top"><span class="xs-ttl">${esc(String(title || "").replace(/<[^>]+>/g, ""))}</span><span class="xs-cnt"></span><button class="xs-skip" type="button" aria-label="スキップして結果へ"><span class="sk-tx"><b>SKIP</b><small>結果へ</small></span><span class="sk-ar" aria-hidden="true"><i></i><i></i><i></i></span></button></div>
      <div class="xs-foot"><span class="xs-dots"></span><span class="xs-tap">TAP</span></div>`;
    document.body.appendChild(ov);
    try { document.body.style.overflow = "hidden"; } catch (e) {}
    ov.querySelector(".xs-skip").addEventListener("click", (e) => { e.stopPropagation(); toSummary(); });
    ov.addEventListener("click", onTap);
    requestAnimationFrame(() => ov.classList.add("on"));
    return ov;
  }
  function flash(red) { const f = S.ov.querySelector(".xs-flash"); if (!f) return; f.classList.toggle("red", !!red); f.classList.remove("go"); void f.offsetWidth; f.classList.add("go"); }
  function shake() { const ov = S.ov; ov.classList.remove("shake"); void ov.offsetWidth; ov.classList.add("shake"); at(700, () => { if (alive(ov)) ov.classList.remove("shake"); }); }
  function setLv(lv) { const ov = S.ov; ov.classList.remove("lv-g", "lv-o", "lv-r"); ov.classList.add("lv-" + lv); BGM.level(lv); }
  function hexLines(n, lv) {
    const w = ["SIGNAL", "PHASE", "ORBIT", "LUMEN", "UMBRA", "CORE", "VECTOR", "SEAL", "ECHO", "NODE"];
    let s = "";
    for (let k = 0; k < n; k++) {
      const h = Math.floor(Math.random() * 0xffffff).toString(16).toUpperCase().padStart(6, "0");
      s += "<div>" + w[k % w.length] + "-" + String(k + 1).padStart(2, "0") + " 0x" + h + " " + (lv === "r" ? "▲▲▲" : lv === "o" ? "▲▲" : "▲") + " " + (Math.random() * 100).toFixed(2) + "</div>";
    }
    return s + s;
  }
  /* 中央の六角形の飾り（マーク・解析で使う） */
  const HEXMARK = '<svg viewBox="0 0 100 110"><path class="hx" d="M50 4L94 29V81L50 106L6 81V29Z"/><path class="hi" d="M50 16L84 35V75L50 94L16 75V35Z"/></svg>';

  /* ══ ⓪ 起動 → ① 警報と解析 → ② カットイン → ③ 題字（すべての時刻を順に積む）══ */
  function intro() {
    const ov = S.ov, info = S.info;
    S.phase = "intro";
    const rank = has1(info, "rank");
    /* 段の色：緑＝何も約束しない／橙＝SSR以上／赤＝UR（rank は橙で始めて途中で赤に割れる） */
    const lv = rank ? "o" : info.best >= 3 ? "r" : info.best === 2 ? "o" : "g";
    S.lv = lv;
    setLv("g");
    let t = 0;
    /* ⓪ 起動 */
    ov.classList.add("boot");
    snd("boot");
    const pre = ov.querySelector(".xs-boot pre");
    const lines = ["XEVARION SUMMON SYSTEM  ver.3.0", "> 星脈リンク …… 接続", "> 召喚炉 圧力 …… 正常", "> 対象数 …… " + S.rs.length, "> 解析を開始します"];
    let txt = "";
    lines.forEach((ln, k) => at(380 + k * 210, () => { if (!alive(ov)) return; txt += (k ? "\n" : "") + ln; pre.textContent = txt; snd("type"); }));
    t = 1500;
    /* ① 警報と解析 */
    at(t, () => { if (!alive(ov)) return; ov.classList.remove("boot"); ov.classList.add("bg"); evaOpen(lv, rank); BGM.start("g"); });
    const evLen = evaTimeline(t, lv, rank);
    t += evLen;
    /* ② カットイン（2回のときもある）・カウントダウン */
    /* ★★ 2026-10-16 ご報告「カットインの数と排出されるキャラ数が合っていない」：
       前はカットインが確率で0〜3回（青＝何も約束しない回・W・南瓜が別々に足される）で、出てくる SSR 以上の数と食いちがっていた。
       → <b>カットインは SSR 以上のキャラ1体につき1回ちょうど</b>（低いレア度から順に・UR は虹／南瓜・SSR は赤）。
         多いときは1回を短くする（3回まで 1.65 秒・それ以上は全体で約6秒に収める）。 */
    /* ★★ 2026-11-03 UR が2体以上（昇格まえの色で）＝ 天使降臨（超豪華ロング・ご指定） */
    if (S.plan && S.plan.angel) t += angelSeq(t, S.plan.nU);
    /* ★★ 2026-11-03 カットインの数と色も<b>昇格まえの色</b>（S.from）で。前は本当の色だったので、盤で昇格する前に UR の数がばれていた（ご指摘） */
    const hi = S.rs.map((r, i) => ({ r, t: S.from[i] })).filter((o) => o.r.type === "char" && o.t >= 2).sort((a, b) => a.t - b.t);
    const step = hi.length <= 3 ? 1650 : Math.max(900, Math.round(6000 / hi.length));
    hi.forEach((o, k) => {
      const ur = o.t === 3;
      const c = ur ? (has1(info, "pk") ? "pk" : "rb") : "red";
      at(t, () => { if (alive(ov)) cutIn(c, k, o.r, hi.length); });
      t += step;
    });
    if (has1(info, "count")) {
      at(t, () => { if (!alive(ov)) return; const cn = ov.querySelector(".xs-count"); cn.classList.add("on"); });
      [3, 2, 1].forEach((n, k) => at(t + k * 520, () => { if (!alive(ov)) return; const b = ov.querySelector(".xs-count b"); b.textContent = String(n); b.style.animation = "none"; void b.offsetWidth; b.style.animation = ""; snd("count"); if (n === 1) shake(); }));
      at(t + 1600, () => { if (alive(ov)) { ov.querySelector(".xs-count").classList.remove("on"); flash(true); snd("boom"); } });
      t += 1700;
    }
    /* ③ 題字 */
    at(t, () => { if (alive(ov)) titleCard(); });
    t += has1(info, "kanji") ? 2100 : 1450;
    S.introEnd = t;
    at(t, showBoard);
  }
  function evaOpen(lv, rank) {
    const ov = S.ov, ev = ov.querySelector(".xs-eva");
    const n10 = S.rs.length >= 10;
    const bar = (tx) => "<span>" + (tx + " ▲ ").repeat(8) + "</span>";
    ev.innerHTML = '<div class="ev-data l"><div>' + hexLines(24, lv) + '</div></div><div class="ev-data r"><div>' + hexLines(24, lv) + "</div></div>" +
      '<div class="ev-ret"><svg viewBox="-110 -110 220 220" fill="none" stroke="currentColor"><g class="r1"><circle r="100" stroke-width="2" stroke-dasharray="6 6"/><path d="M0-108V-84M0 84V108M-108 0H-84M84 0H108" stroke-width="4"/></g><g class="r2"><circle r="72" stroke-width="3" stroke-dasharray="40 14"/><path d="M-50-50L-38-38M50-50L38-38M-50 50L-38 38M50 50L38 38" stroke-width="3"/></g><circle r="46" stroke-width="1.5"/></svg></div>' +
      slotHTML() + '<div class="ev-emg"></div>' +
      '<div class="ev-txc"><b>反応検知</b><small>SIGNAL DETECTED</small></div>' +
      '<div class="ev-bars"><i class="t">' + bar("WARNING") + '</i><i class="b">' + bar(n10 ? "SUMMONING SEQUENCE ×10" : "SUMMONING SEQUENCE") + "</i></div>" +
      '<div class="ev-warn"><b>WARNING</b><span>召喚シグナルを検知</span></div>';
    ev.className = "xs-eva on";
    snd("alarm");
    at(220, () => { if (alive(ov)) { ev.classList.add("hud"); snd("tick"); } });
  }
  /* ══ ★★ 2026-11-03 スロット（左→右→まん中の順に止まる）══
     そろう絵柄は<b>昇格まえの色</b>（S.from）で決める＝うそをつかない・昇格はばらさない。 */
  const SLOT_SYM = {
    seven: '<i class="sy s7">7</i>',
    ten: '<i class="sy sten"><b>天</b></i>',
    hex: '<i class="sy shex"><svg viewBox="0 0 100 110"><path d="M50 4L94 29V81L50 106L6 81V29Z"/></svg><b>◆</b></i>',
    star: '<i class="sy sstar">★</i>',
    x: '<i class="sy sx">X</i>',
    zero: '<i class="sy szero">零</i>',
  };
  const SLOT_RING = ["seven", "x", "hex", "zero", "star", "ten", "x", "star", "hex", "zero"];
  function slotPlan(from) {
    const nU = from.filter((t) => t === 3).length, nS = from.filter((t) => t >= 2).length;
    const R = Math.random;
    if (nU >= 2) return { s: ["ten", "ten", "ten"], reach: true, hit: true, angel: true, nU };
    if (nU === 1) return { s: ["seven", "seven", "seven"], reach: true, hit: true, nU };
    if (nS >= 2) return { s: ["hex", "hex", "hex"], reach: true, hit: true, nU };
    if (nS === 1) return { s: ["star", "star", "star"], reach: true, hit: true, nU };
    /* SSR 以上なし：ばらばら（3割はリーチだけ＝まん中ははずれ） */
    const pool = ["x", "zero", "star", "hex"];
    const a = pool[Math.floor(R() * pool.length)];
    if (R() < 0.3) { let c = a; while (c === a) c = SLOT_RING[Math.floor(R() * SLOT_RING.length)]; return { s: [a, c, a], reach: true, hit: false, nU }; }
    let b = a, c = a;
    while (b === a) b = pool[Math.floor(R() * pool.length)];
    while (c === a || c === b) c = SLOT_RING[Math.floor(R() * SLOT_RING.length)];
    return { s: [a, c, b], reach: false, hit: false, nU };
  }
  function slotHTML() {
    const strip = SLOT_RING.concat(SLOT_RING).map((k) => SLOT_SYM[k]).join("");
    return '<div class="ev-slot"><div class="sl-hd"><span>XEVA-SLOT</span><b>召喚判定</b></div><div class="sl-box">' +
      ["l", "c", "r"].map((p, i) => '<div class="rl ' + p + ' spin"><div class="st" style="animation-delay:-' + (i * 0.11).toFixed(2) + 's">' + strip + "</div></div>").join("") +
      '<i class="pay"></i></div><div class="sl-rc"><b></b><small></small></div></div>';
  }
  /* 1つのリールを止める（目当ての絵柄をまん中の段に） */
  function reelStop(pos, sym) {
    const sl = S.ov.querySelector(".ev-slot"); if (!sl) return;
    const rl = sl.querySelector(".rl." + pos); if (!rl) return;
    const i = SLOT_RING.indexOf(sym), at = (k) => SLOT_SYM[SLOT_RING[(i + k + SLOT_RING.length * 4) % SLOT_RING.length]];
    rl.classList.remove("spin");
    rl.querySelector(".st").innerHTML = at(-2) + at(-1) + SLOT_SYM[sym] + at(1) + at(2);
    void rl.offsetWidth; rl.classList.add("stop");
    snd("stop");
  }
  const SLOT_RC = { seven: ["#ff2a3a", "７リーチ", "SEVEN REACH"], ten: ["#ffd257", "天使リーチ", "ANGELIC REACH"], hex: ["#ffb020", "◆リーチ", "GOLD REACH"],
    star: ["#5fb0ff", "★リーチ", "BLUE REACH"], x: ["#c79cff", "リーチ", "REACH"], zero: ["#7dffb0", "リーチ", "REACH"] };
  function slotTimeline(t0) {
    const ov = S.ov, P = S.plan;
    for (let k = 0; k < 8; k++) at(t0 + 320 + k * 110, () => { if (alive(ov)) snd("reel"); });
    at(t0 + 760, () => { if (alive(ov)) reelStop("l", P.s[0]); });
    at(t0 + 1180, () => { if (alive(ov)) reelStop("r", P.s[2]); });
    if (P.reach) at(t0 + 1300, () => {
      if (!alive(ov)) return;
      const sl = ov.querySelector(".ev-slot"); if (!sl) return;
      const rc = SLOT_RC[P.s[0]] || SLOT_RC.x;
      sl.style.setProperty("--rc", rc[0]);
      sl.querySelector(".sl-rc b").textContent = rc[1]; sl.querySelector(".sl-rc small").textContent = rc[2];
      sl.classList.add("reach"); if (P.s[0] === "ten") sl.classList.add("rcrb");
      snd("reach"); if (P.s[0] === "ten" || P.s[0] === "seven") shake();
    });
    const tc = P.reach ? 2250 : 1560;
    at(t0 + tc, () => {
      if (!alive(ov)) return;
      reelStop("c", P.s[1]);
      const sl = ov.querySelector(".ev-slot"); if (!sl) return;
      sl.classList.remove("reach");
      if (P.hit) {
        sl.classList.add("hit"); if (P.s[0] === "ten" || P.s[0] === "seven") sl.classList.add("rb");
        flash(P.s[0] === "seven"); snd("jackpot"); if (P.s[0] === "ten") snd("rainbow");
      }
    });
    return tc;
  }
  /* ★★ 2026-11-03 UR：画面いっぱいの EMERGENCY の札（散らばって点滅） */
  function emgTiles() {
    const box = S.ov.querySelector(".ev-emg"); if (!box || box.childElementCount) return;
    const spots = [[4, 18], [62, 14], [30, 30], [72, 34], [6, 52], [58, 58], [26, 70], [70, 76], [40, 8], [2, 84], [44, 46], [80, 4]];
    spots.forEach(([x, y], k) => at(k * 70, () => {
      if (!S || !box.isConnected) return;
      const i = document.createElement("i");
      i.style.left = x + "%"; i.style.top = y + "%";
      i.innerHTML = "EMERGENCY<small>緊急事態</small>";
      box.appendChild(i);
      if (k % 3 === 0) snd("tick");
    }));
  }

  /* 文字変化の札を書きかえる */
  function txChange(b, small, rb) {
    const el = S.ov.querySelector(".ev-txc"); if (!el) return;
    el.querySelector("b").textContent = b; el.querySelector("small").textContent = small;
    el.classList.remove("chg"); void el.offsetWidth; el.classList.add("chg");
    el.classList.toggle("rb", !!rb);
    snd("chg");
  }
  /* ①の時刻（t0 から）。戻り値＝この段の長さ */
  function evaTimeline(t0, lv, rank) {
    const ov = S.ov;
    /* ★★ 2026-11-03 「共鳴率 ％」をやめてスロット（ご指定） */
    const tc = slotTimeline(t0);
    /* 文字変化：反応検知（緑）→ 反応増大（橙）→ 臨界突破（赤）。色はそこで本当の段へ */
    if (lv !== "g") at(t0 + 1150, () => { if (!alive(ov)) return; setLv("o"); txChange("反応増大", "SIGNAL RISING"); });
    if (lv === "r") at(t0 + 2050, () => { if (!alive(ov)) return; setLv("r"); txChange("臨界突破", "CRITICAL", S.info.tl.indexOf("rbbar") >= 0); shake(); });
    if (lv === "r" || rank) at(t0 + (rank ? 2450 : 2150), () => { if (alive(ov)) emgTiles(); });
    if (lv === "g") at(t0 + 1400, () => { if (alive(ov)) txChange("解析中", "ANALYZING"); });
    at(t0 + 1250, () => {
      if (!alive(ov)) return;
      const ev = ov.querySelector(".xs-eva"); ev.classList.add("warn");
      const w = ov.querySelector(".ev-warn");
      if (w && lv !== "g") { w.querySelector("b").textContent = lv === "r" ? "EMERGENCY" : "WARNING"; w.querySelector("span").textContent = lv === "r" ? "超高位の反応を確認" : "強い召喚反応を確認"; }
      snd(lv === "g" ? "alarm" : "alarm2");
    });
    if (rank) at(t0 + 2350, () => {
      /* 確定演出 rank：橙が赤に割れる（UR 確定） */
      if (!alive(ov)) return;
      setLv("r");
      const ev = ov.querySelector(".xs-eva"); ev.classList.add("glitch", "over");
      txChange("臨界突破", "CRITICAL", S.info.tl.indexOf("rbbar") >= 0);
      const w = ov.querySelector(".ev-warn"); if (w) { w.querySelector("b").textContent = "EMERGENCY"; w.querySelector("span").textContent = "超高位の反応を確認"; }
      ev.classList.remove("warn"); void ev.offsetWidth; ev.classList.add("warn");
      snd("glitch"); snd("alarm2"); flash(true); shake();
    });
    if (S.info.tl.indexOf("rbbar") >= 0) at(t0 + (rank ? 2550 : 2250), () => { if (alive(ov)) { ov.classList.add("rbbar"); snd("rainbow"); } });
    const len = Math.max(lv === "g" ? 2900 : 3500, tc + 1100);
    at(t0 + len - 250, () => { if (!alive(ov)) return; const ev = ov.querySelector(".xs-eva"); ev.classList.add("out"); });
    at(t0 + len, () => { if (!alive(ov)) return; const ev = ov.querySelector(".xs-eva"); ev.className = "xs-eva"; ev.innerHTML = ""; });
    return len;
  }
  /* ══ ★★ 2026-11-03 天使降臨（UR 2体以上）。t0 からの長さを返す ══
     題字「天使、降臨」→ 空と街・光の天使が降りてくる・白い帯 → UR の数だけ光の柱と十字の光 → 翼がひらき核が光る・カウントダウン → 白い光 →「UR ×N 確定」 */
  function angelSVG() {
    const wing = (side) => {
      const s = side === "l" ? -1 : 1;
      return [[-28, 175, 0.95], [-52, 160, 0.85], [-76, 140, 0.7]].map(([deg, len, op], j) => {
        const a = (s * (90 + deg)) * Math.PI / 180, x = 200 + Math.sin(a) * len, y = 200 - Math.cos(a) * len * 0.92;
        const cx1 = 200 + Math.sin(a) * len * 0.35 + s * 26, cy1 = 200 - Math.cos(a) * len * 0.6 - 30;
        return '<path d="M200 200 Q' + cx1.toFixed(1) + " " + cy1.toFixed(1) + " " + x.toFixed(1) + " " + y.toFixed(1) + " Q" + (x - s * 14).toFixed(1) + " " + (y + 26).toFixed(1) + ' 200 214 Z" fill="url(#agW)" opacity="' + op + '"/>' +
          '<path d="M200 204 Q' + cx1.toFixed(1) + " " + (cy1 + 10).toFixed(1) + " " + x.toFixed(1) + " " + y.toFixed(1) + '" fill="none" stroke="#fff" stroke-width="' + (2.4 - j * 0.5) + '" opacity=".9"/>';
      }).join("");
    };
    return '<svg viewBox="0 0 400 400"><defs>' +
      '<linearGradient id="agW" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#e6f2ff" stop-opacity=".85"/><stop offset="1" stop-color="#9fd0ff" stop-opacity=".15"/></linearGradient>' +
      '<linearGradient id="agC" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff5fa2"/><stop offset=".3" stop-color="#ffd257"/><stop offset=".55" stop-color="#7dffb0"/><stop offset=".8" stop-color="#5fd0ff"/><stop offset="1" stop-color="#c79cff"/></linearGradient>' +
      '<radialGradient id="agG"><stop offset="0" stop-color="#fff"/><stop offset=".4" stop-color="#fff6d8" stop-opacity=".8"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>' +
      '<circle cx="200" cy="200" r="190" fill="url(#agG)" opacity=".55"/>' +
      '<g class="wing l">' + wing("l") + "</g><g class=\"wing r\">" + wing("r") + "</g>" +
      '<path d="M188 222 L200 388 L212 222 Z" fill="url(#agW)" opacity=".8"/>' +
      '<g class="halo"><ellipse cx="200" cy="96" rx="78" ry="16" fill="none" stroke="#ffd257" stroke-width="5" stroke-dasharray="26 10"/></g>' +
      '<g class="halo2"><ellipse cx="200" cy="96" rx="96" ry="22" fill="none" stroke="#fff" stroke-width="1.8" stroke-dasharray="4 8"/></g>' +
      '<g class="halo"><circle cx="200" cy="200" r="62" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="3 9"/></g>' +
      '<g class="halo2"><circle cx="200" cy="200" r="78" fill="none" stroke="#ffd257" stroke-width="1.5" stroke-dasharray="40 14 6 14"/></g>' +
      '<g class="core"><path d="M200 146 L236 200 L200 254 L164 200 Z" fill="url(#agC)" stroke="#fff" stroke-width="4"/>' +
      '<path d="M200 172 L218 200 L200 228 L182 200 Z" fill="#fff" opacity=".85"/><circle cx="200" cy="200" r="6" fill="#ff2a3a"/></g></svg>';
  }
  function angelSeq(t0, nU) {
    const ov = S.ov, box = ov.querySelector(".xs-angel");
    const n = Math.max(2, nU | 0);
    let t = t0;
    at(t, () => {
      if (!alive(ov)) return;
      box.innerHTML = '<div class="ag-sky"></div><div class="ag-rays"></div><div class="ag-city"></div>' +
        '<div class="ag-body">' + angelSVG() + '</div>' +
        '<div class="ag-band t"><span>' + "ANGELIC SIGNAL ― 天使反応 ― ".repeat(8) + '</span></div><div class="ag-band b"><span>' + ("UR ×" + n + " ― ULTRA RARE ― ").repeat(10) + "</span></div>" +
        '<div class="ag-pil"></div><div class="ag-cnt"><b></b><small>覚醒まで</small></div>' +
        '<div class="ag-ttl"><b class="a1">天</b><b class="a2">使</b><b class="a3">、</b><b class="a4">降</b><b class="a5">臨</b><em>十連召喚・特異点</em><small>ANGELIC DESCENT ― ULTRA RARE ×' + n + "</small></div>" +
        '<div class="ag-wo"></div><div class="ag-fin"><b>UR ×' + n + "</b><small>確定</small><em>ANGELIC DESCENT</em></div>";
      box.className = "xs-angel on";
      setLv("r"); snd("alarm2"); snd("glitch"); flash(true);
    });
    /* 題字（1文字ずつ） */
    ["a1", "a2", "a3", "a4", "a5"].forEach((c, k) => at(t + 250 + k * 260, () => { if (!alive(ov)) return; const b = box.querySelector(".ag-ttl ." + c); if (b) b.classList.add("on"); snd(k >= 3 ? "boom" : "type"); if (k >= 3) shake(); }));
    at(t + 1600, () => { if (!alive(ov)) return; const e = box.querySelector(".ag-ttl em"), s = box.querySelector(".ag-ttl small"); if (e) e.classList.add("on"); if (s) s.classList.add("on"); snd("chg"); });
    t += 2500;
    /* 空と天使 */
    at(t, () => { if (!alive(ov)) return; BGM.stop(); const tt = box.querySelector(".ag-ttl"); if (tt) tt.classList.add("out"); box.classList.add("sky", "desc"); snd("choir"); snd("angel"); });
    at(t + 1500, () => { if (alive(ov)) { box.classList.add("bands"); snd("alarm"); } });
    t += 2700;
    /* UR の数だけ光の柱と十字の光 */
    const pil = () => box.querySelector(".ag-pil");
    for (let k = 0; k < n; k++) {
      const x = n === 1 ? 50 : 18 + (64 * k) / (n - 1);
      at(t + k * 800, () => {
        if (!alive(ov)) return;
        const p = pil(); if (!p) return;
        const i = document.createElement("i"); i.style.left = x + "%"; p.appendChild(i);
        const b = document.createElement("b"); b.style.left = x + "%"; b.textContent = "UR " + (k + 1); p.appendChild(b);
        const cr = document.createElement("div"); cr.className = "xs-xcross rb"; cr.style.left = x + "%"; cr.style.top = "48%"; cr.innerHTML = '<i class="v"></i><i class="h"></i>'; box.appendChild(cr);
        requestAnimationFrame(() => { i.classList.add("go"); b.classList.add("go"); cr.classList.add("go"); });
        flash(); shake(); snd("boom"); snd("rainbow");
      });
    }
    t += n * 800 + 500;
    /* 翼がひらき、核が光る → カウントダウン */
    at(t, () => { if (alive(ov)) { box.classList.add("open", "charge"); snd("glitch"); } });
    [3, 2, 1].forEach((v, k) => at(t + 300 + k * 560, () => {
      if (!alive(ov)) return;
      const c = box.querySelector(".ag-cnt"); if (!c) return;
      c.classList.add("on"); const b = c.querySelector("b"); b.textContent = String(v); b.style.animation = "none"; void b.offsetWidth; b.style.animation = "";
      snd("count"); if (v === 1) shake();
    }));
    t += 300 + 3 * 560;
    /* 白い光 → UR ×N 確定 */
    at(t, () => { if (!alive(ov)) return; const c = box.querySelector(".ag-cnt"); if (c) c.classList.remove("on"); const w = box.querySelector(".ag-wo"); if (w) w.classList.add("go"); snd("boom"); snd("ur"); });
    at(t + 450, () => { if (!alive(ov)) return; const f = box.querySelector(".ag-fin"); if (f) f.classList.add("on"); snd("fanfare"); });
    t += 2300;
    at(t, () => { if (!alive(ov)) return; box.className = "xs-angel"; box.innerHTML = ""; BGM.start("r"); });
    return t - t0;
  }
  /* ② カットイン（色：blue / red / gold / rb / pk） */
  function cutIn(c, k, r, n) {
    const ov = S.ov, info = S.info, box = ov.querySelector(".xs-cut");
    const T1 = ({ blue: ["SIGNAL", "ANALYZE", "反応を解析中…"], red: ["SUPER RARE", "SSR", "強い反応！"], gold: ["DOUBLE", "W SSR以上", "反応が2つ！"],
      rb: ["ULTRA RARE", "UR", "臨界を突破！"], pk: ["PUMPKIN NIGHT", "UR 確定", "南瓜の灯がともる"] }[c] || ["SIGNAL", "", ""]).slice();
    /* ★★ 2026-10-16 何体目のカットインかを出す（カットインの数＝SSR 以上のキャラの数） */
    if (n > 1) T1[2] = "反応 " + (k + 1) + " / " + n;
    let sil = false;
    let pic = '<svg viewBox="0 0 100 110"><path d="M50 4L94 29V81L50 106L6 81V29Z" fill="rgba(0,0,0,.4)" stroke="#fff" stroke-width="5"/><path d="M50 22L78 38V72L50 88L22 72V38Z" fill="none" stroke="#fff" stroke-width="2" opacity=".7"/><text x="50" y="64" text-anchor="middle" font-family="Orbitron,sans-serif" font-weight="900" font-size="20" fill="#fff">' + (c === "rb" ? "UR" : c === "blue" ? "?" : "SSR") + "</text></svg>";
    if (c === "pk") pic = '<svg viewBox="0 0 100 100"><path d="M50 22c-3-9 3-13 8-14-4 4-4 8-3 14" fill="#3a8a2a"/><ellipse cx="50" cy="60" rx="38" ry="30" fill="#ff8a1f" stroke="#7a3a00" stroke-width="3"/><path d="M50 30v60M30 34c-6 10-6 42 0 52M70 34c6 10 6 42 0 52" stroke="#c85a00" stroke-width="2.5" fill="none"/><path d="M33 52l8-7 8 7zM51 52l8-7 8 7z" fill="#ffe37a"/><path d="M34 68q16 12 32 0l-5 4-5-4-6 5-6-5-5 4z" fill="#ffe37a"/></svg>';
    if (has1(info, "sil") && info.pickHit && (c === "red" || c === "gold" || c === "rb") && (r ? r === info.pickHit : k === 0)) {
      const ch = chr(info.pickHit.id);
      if (ch) { pic = '<img src="' + esc(ch.th || ch.img) + '" alt="">'; sil = true; }
      T1[2] = "ピックアップの反応！" + (n > 1 ? "（" + (k + 1) + " / " + n + "）" : "");
    }
    const tok = String(Math.random());
    box.dataset.tok = tok;
    box.className = "xs-cut on c-" + c;
    box.innerHTML = '<div class="ct-dim"></div><div class="ct-band"></div><div class="ct-in"><div class="ct-pic' + (sil ? " sil" : "") + '">' + pic + '</div><div class="ct-tx"><small>' + esc(T1[0]) + "</small><b>" + esc(T1[1]) + "</b><span>" + esc(T1[2]) + "</span></div></div>";
    snd("cut");
    if (c === "rb") at(300, () => { if (alive(ov)) snd("rainbow"); });
    else if (c === "red" || c === "gold" || c === "pk") at(300, () => { if (alive(ov)) snd("gold"); });
    /* ★ 続けて2回出すとき、1回目の片づけが2回目を消さないように（同じカットインのときだけ消す） */
    at(1650, () => { if (alive(ov) && box.dataset.tok === tok) { box.className = "xs-cut"; box.innerHTML = ""; } });
  }
  /* ③ 題字：黒い画面に白い明朝の「召喚」。kanji の確定演出のときは赤い「覚醒」に書きかわる */
  function titleCard() {
    const ov = S.ov, info = S.info, tt = ov.querySelector(".xs-title");
    const n10 = S.rs.length >= 10;
    tt.innerHTML = '<b class="ta">召</b><b class="tb">喚</b><b class="tc">' + (n10 ? "十連召喚" : "単発召喚") + '</b><b class="te">星脈よ、応えよ。</b><b class="td">XEVARION SUMMONING SEQUENCE</b>';
    tt.className = "xs-title on";
    snd("boom");
    if (has1(info, "kanji")) at(950, () => {
      if (!alive(ov)) return;
      tt.querySelector(".ta").textContent = "覚"; tt.querySelector(".tb").textContent = "醒";
      tt.querySelector(".te").textContent = "臨界の星、ここに目覚める。";
      tt.classList.add("kanji"); flash(true); snd("glitch"); snd("ur"); shake();
    });
  }

  /* ══ ④ 信号の盤：レア度を六角形のマークで先に見せる。ピックアップはここで昇格 ══ */
  function showBoard() {
    if (!S || S.phase === "board" || S.phase === "cards" || S.phase === "sum") return;
    clearT(); BGM.stop();
    const ov = S.ov;
    S.phase = "board";
    ["boot"].forEach((c) => ov.classList.remove(c));
    ov.querySelector(".xs-eva").className = "xs-eva"; ov.querySelector(".xs-eva").innerHTML = "";
    ov.querySelector(".xs-cut").className = "xs-cut"; ov.querySelector(".xs-count").classList.remove("on");
    ov.querySelector(".xs-title").className = "xs-title";
    { const ag = ov.querySelector(".xs-angel"); if (ag) { ag.className = "xs-angel"; ag.innerHTML = ""; } }
    ov.classList.add("bg", "board");
    setLv(S.info.best >= 3 ? "r" : S.info.best === 2 ? "o" : "g");
    const bd = ov.querySelector(".xs-board");
    const marks = S.rs.map((r, i) => {
      const t = tierOf(r), from = S.from[i];
      return '<div class="bm t' + from + '" data-i="' + i + '">' + HEXMARK + '<i class="ring"></i><b>' + RB(from) + "</b><small>" + String(i + 1).padStart(2, "0") + '</small><i class="bm-up">' + (t === 3 ? "UR 昇格!!" : "昇格!") + "</i></div>";
    }).join("");
    bd.innerHTML = '<h5>SIGNAL ANALYSIS</h5><div class="bd' + (S.rs.length === 1 ? " n1" : "") + '">' + marks + '</div><div class="cap"><b></b><small></small></div>';
    bd.classList.add("on");
    const els = bd.querySelectorAll(".bm");
    els.forEach((el, i) => at(120 + i * 110, () => { if (!alive(ov)) return; el.classList.add("in"); snd("mark"); }));
    let t = 120 + els.length * 110 + 450;
    /* 昇格（下から順に。2段の昇格は 2回） */
    const ups = [];
    S.rs.forEach((r, i) => { let f = S.from[i]; const to = tierOf(r); while (f < to) { f++; ups.push([i, f]); } });
    ups.forEach(([i, nt]) => {
      const el = els[i];
      /* ★ 出てくるときの動き（in）を外すと縮んだ形に戻るので、止まった形を直接書いておく */
      at(t, () => { if (!alive(ov)) return; el.classList.remove("in"); el.style.opacity = "1"; el.style.transform = "none"; el.classList.add("shk"); snd("crack"); });
      at(t + 450, () => {
        if (!alive(ov)) return;
        el.classList.remove("shk", "t1", "t2", "t3", "pop", "upg", "crk"); void el.offsetWidth;
        el.classList.add("t" + nt, "pop", "crk", "upg");
        el.querySelector("b").textContent = RB(nt);
        flash(nt === 3); snd(nt === 3 ? "rainbow" : "promote"); if (nt === 3) shake();
        /* ★★ 2026-11-03 盤の色も昇格で上がる（はじめは昇格まえの色） */
        if (nt === 3) setLv("r"); else if (nt === 2 && !ov.classList.contains("lv-r")) setLv("o");
      });
      t += 1150;
    });
    S.boardDone = t;
    at(t, () => boardCap());
    at(t + 1500, () => { if (alive(ov) && S.phase === "board") startCards(); });
  }
  function boardFinish() {
    /* 盤を最後の状態にする（タップで早送りしたとき） */
    const ov = S.ov, bd = ov.querySelector(".xs-board");
    clearT();
    bd.querySelectorAll(".bm").forEach((el) => {
      const i = Number(el.dataset.i), t = tierOf(S.rs[i]);
      el.classList.remove("shk", "t0", "t1", "t2", "t3", "upg", "crk", "pop", "in");
      el.classList.add("t" + t); el.style.opacity = "1"; el.style.transform = "none";
      el.querySelector("b").textContent = RB(t);
    });
    boardCap();
  }
  function boardCap() {
    if (!S) return;
    const ov = S.ov, cap = ov.querySelector(".xs-board .cap");
    if (!cap || cap.classList.contains("on")) { S.capShown = true; return; }
    const [a, b, rb] = capText(S.infoReal || S.info);   /* ★★ 2026-11-03 最後の札は本当の結果（昇格のあと） */
    S.capShown = true;
    if (!a) return;
    cap.querySelector("b").textContent = a; cap.querySelector("small").textContent = b;
    cap.classList.toggle("rb", !!rb);
    cap.classList.add("on");
    snd(rb ? "ur" : "gold");
  }

  /* ══ ⑤ 1体ずつ ══ */
  function startCards() {
    if (!S || S.phase === "cards" || S.phase === "sum") return;
    clearT();
    S.phase = "cards";
    const ov = S.ov;
    ov.classList.remove("board", "boot");
    ov.querySelector(".xs-board").classList.remove("on");
    ov.querySelector(".xs-eva").className = "xs-eva"; ov.querySelector(".xs-cut").className = "xs-cut"; ov.querySelector(".xs-title").className = "xs-title";
    ov.querySelector(".xs-count").classList.remove("on");
    ov.classList.add("cards", "bg");
    flash();
    S.i = -1;
    paintDots();
    next();
  }
  function paintDots() {
    const d = S.ov.querySelector(".xs-dots"); if (!d) return;
    d.innerHTML = S.rs.map((r, k) => {
      const t = tierOf(r);
      return `<i class="${k < S.i ? "d d" + t : ""}${k === S.i ? " on" : ""}"></i>`;
    }).join("");
    const c = S.ov.querySelector(".xs-cnt"); if (c) c.textContent = S.i >= 0 ? (Math.min(S.i + 1, S.rs.length) + " / " + S.rs.length) : "";
  }
  function next() {
    if (!S) return;
    clearT();
    S.i++;
    if (S.i >= S.rs.length) { toSummary(); return; }
    paintDots();
    showOne(S.rs[S.i], S.i);
  }
  function burst(box, col, n) {
    const b = document.createElement("div");
    b.className = "xs-burst";
    b.innerHTML = Array.from({ length: n || 18 }, (_, k) => {
      const a = (k / (n || 18)) * Math.PI * 2, d = 160 + (k % 3) * 70;
      return `<i style="--dx:${Math.round(Math.cos(a) * d)}px;--dy:${Math.round(Math.sin(a) * d)}px;--pc:${k % 2 ? col : "#ffffff"};animation-delay:${(k % 4) * 0.03}s"></i>`;
    }).join("");
    box.appendChild(b);
    requestAnimationFrame(() => b.classList.add("go"));
  }
  function nameSpans(nm) { return String(nm || "").split("").map((ch, k) => `<span style="animation-delay:${(0.62 + k * 0.05).toFixed(2)}s">${esc(ch)}</span>`).join(""); }
  function cardHTML(r, t) {
    const c = chr(r.id) || {};
    const e = elOf(r.id);
    return `<div class="xs-glow g${t}"></div><div class="xs-xcross"><i class="v"></i><i class="h"></i></div>
      <div class="xs-card">
        <div class="xs-back ${t === 3 ? "b3" : t === 2 ? "b2" : ""}"></div>
        <div class="xs-face r${t}">
          <img src="${esc(c.img || c.th || "")}" alt="" onerror="if(this.dataset.fb)return;this.dataset.fb=1;this.src='${esc(c.th || "")}'">
          <div class="xs-fx"></div><i class="xs-shine"></i>
          ${e ? `<span class="xs-elb" style="--ec:${e.c}">${esc(e.nm)}${r.sure ? " ・ 確定枠" : ""}</span>` : ""}
          ${isNew(r) ? '<span class="xs-new">NEW</span>' : ""}
          <div class="xs-info"><span class="xs-rar r${t}">${RB(t)}</span>
            <b class="xs-nm">${nameSpans(c.nm)}</b><span class="xs-sub">${esc(subOf(r))}${(() => { try { return " ・ " + charNoText(r.id); } catch (er) { return ""; } })()}</span></div>
        </div>
      </div>`;
  }
  /* カードの前の解析（SR・SSR）：六角形の中に「SIGNAL 03」→ レア度。SSR は橙の帯と十字の光。キャラはこのあと */
  function preHTML(i, t) {
    return '<div class="xs-pre t' + t + ' in" style="--pd:' + (t === 2 ? "0.9s" : "0.32s") + '"><svg viewBox="0 0 100 110"><path class="hx" d="M50 4L94 29V81L50 106L6 81V29Z"/><circle class="r1" cx="50" cy="55" r="34"/></svg>' +
      '<div class="pt"><small>SIGNAL ' + String(i + 1).padStart(2, "0") + "</small><b>" + RB(t) + "</b><span>" + (t === 2 ? "強い反応" : "反応あり") + '</span></div><div class="bar"><i></i></div></div>';
  }
  function showOne(r, i) {
    const box = S.ov.querySelector(".xs-cards");
    const ur = S.ov.querySelector(".xs-ur");
    ur.classList.remove("on", "go"); ur.innerHTML = "";
    S.busy = true;
    /* アイテム・チケット（描いた絵） */
    if (r.type !== "char" && r.type !== "select") {
      const it = ItemArt.info(r);
      box.innerHTML = `<div class="xs-glow g1 on"></div><div class="xs-item" style="--ic:${it.c}"><div class="ia">${ItemArt.svg(r, 132)}</div><small>ITEM</small><span>${esc(it.nm)} ×${r.n || 1}</span></div>`;
      requestAnimationFrame(() => { const el = box.querySelector(".xs-item"); if (el) el.classList.add("in"); });
      snd("item");
      at(350, () => { S.busy = false; });
      at(S.fast ? 900 : 1500, next);
      return;
    }
    /* BLACK SELECT（好きなSSRを1体） */
    if (r.type === "select") {
      box.innerHTML = `<div class="xs-glow g2 on"></div><div class="xs-card"><div class="xs-back blk"></div><div class="xs-face r2"><div class="xs-info"><span class="xs-rar r2">SSR</span><b class="xs-nm">SSR セレクト</b><span class="xs-sub">好きな1体をえらぶ</span></div></div></div>`;
      const cd = box.querySelector(".xs-card");
      requestAnimationFrame(() => cd.classList.add("in"));
      snd("gold");
      at(700, () => {
        if (r.picked || typeof luxOpenSelect !== "function") { S.busy = false; return; }
        try {
          luxOpenSelect(r.pool, (id, got) => {
            r.picked = id || 1;
            if (id) { r.type = "char"; r.id = id; if (got) { r.awk = got.awk; r.fullAwk = got.fullAwk; r.max = got.max; r.cryst = got.cryst; } }
            S.busy = false;
            if (id) { S.i--; next(); } else next();
          });
        } catch (e) { S.busy = false; }
      });
      return;
    }
    const t = tierOf(r);
    if (t === 3) { box.innerHTML = ""; urShow(r); return; }
    /* 演出（解析）が先 → キャラ */
    box.innerHTML = preHTML(i, t);
    snd(t === 2 ? "alarm" : "tick");
    const pd = t === 2 ? 1000 : 380;
    if (t === 2) {
      at(pd, () => {
        if (!S || S.i !== i) return;
        const pre = box.querySelector(".xs-pre"); if (pre) pre.classList.add("out");
        const band = document.createElement("div"); band.className = "xs-band"; band.style.setProperty("--bc", "#ff9a1f");
        band.innerHTML = "<b>SUPER RARE</b><span>解析完了 ／ SSR</span>"; box.appendChild(band); requestAnimationFrame(() => band.classList.add("go"));
        snd("alarm2"); flash();
      });
    }
    const reveal = t === 2 ? pd + 1150 : pd;
    at(reveal, () => {
      if (!S || S.i !== i) return;
      box.innerHTML = cardHTML(r, t);
      const g = box.querySelector(".xs-glow"); if (g) g.classList.add("on");
      const cd = box.querySelector(".xs-card");
      cd.style.transform = "rotateY(180deg)"; cd.style.opacity = "1";
      if (t === 2) { const x = box.querySelector(".xs-xcross"); x.classList.add("go"); snd("boom"); shake(); }
      void cd.offsetWidth;
      at(t === 2 ? 260 : 40, () => {
        if (!S || S.i !== i) return;
        cd.style.transform = ""; cd.style.opacity = ""; cd.classList.add("flip");
        if (t === 2) { flash(); snd("ssr"); at(380, () => burst(box, "#ffd257", 22)); } else snd("sr");
      });
    });
    at(reveal + 700, () => { S.busy = false; });
    if (t <= 1) at(reveal + (S.fast ? 900 : 1500), next);
    else at(reveal + 4000, next);
  }
  /* UR：警報 → 文字変化（反応検知 → 臨界突破 → 覚醒）→ 十字の光 → 画面いっぱいの縦長の絵（SS）→ 名前 */
  function urShow(r) {
    const c = chr(r.id) || {};
    const ov = S.ov, ur = ov.querySelector(".xs-ur");
    const ss = ssOf(r.id) || c.wide || c.img;
    let gnm = ""; try { gnm = typeof gachaNmOfMode === "function" ? gachaNmOfMode(S.gmode) : ""; } catch (e) {}
    const sp = Array.from({ length: 26 }, (_, k) => `<i style="left:${(k * 37) % 100}%;animation-delay:${((k * 0.23) % 3).toFixed(2)}s;animation-duration:${(2.4 + (k % 5) * 0.4).toFixed(1)}s;background:${["#fff", "#ffd257", "#ff8fd0", "#7fe8ff"][k % 4]}"></i>`).join("");
    ur.innerHTML = `<div class="u-alert${S.info.tl.indexOf("rbbar") >= 0 ? " rb" : ""}"><i class="t"></i><b>EMERGENCY</b><span>超高位の反応を確認</span><em>覚醒</em><i class="b"></i></div><div class="u-bg"></div><div class="u-lines"></div>
      <div class="u-art"><img src="${esc(ss)}" alt="" onerror="if(this.dataset.fb)return;this.dataset.fb=1;this.src='${esc(c.img || "")}'"></div>
      <div class="u-sp">${sp}</div><div class="u-frame"></div>
      <div class="u-emb"><i></i><b>UR</b></div>
      <div class="u-txt"><small>ULTRA RARE${r.sure ? " ・ 確定枠" : ""}</small><b>${esc(c.nm || "")}</b><span>${esc(subOf(r))}${gnm ? " ・ " + esc(gnm) : ""}</span></div>
      <div class="u-flash"></div>`;
    ur.classList.add("on");
    void ur.offsetWidth; ur.classList.add("go");
    snd("alarm2");
    const al = ur.querySelector(".u-alert");
    at(900, () => { if (!alive(ov)) return; const sp2 = al.querySelector("span"); if (sp2) sp2.textContent = "臨界を突破"; snd("chg"); });
    at(1700, () => { if (!alive(ov)) return; al.classList.add("k"); snd("glitch"); snd("boom"); shake(); });
    at(2950, () => { if (!alive(ov)) return; snd("boom"); snd("ur"); });
    at(4600, () => { S.busy = false; });
    at(10200, next);
  }

  /* ══ ⑥ まとめ ══ */
  function toSummary() {
    if (!S || S.phase === "sum") return;
    clearT(); BGM.stop();
    S.phase = "sum";
    /* まだ選んでいない BLACK SELECT があれば、まとめの前に必ず選ばせる */
    const pend = S.rs.find((r) => r.type === "select" && !r.picked);
    if (pend && typeof luxOpenSelect === "function") {
      try { luxOpenSelect(pend.pool, (id, got) => { pend.picked = id || 1; if (id) { pend.type = "char"; pend.id = id; if (got) { pend.awk = got.awk; pend.fullAwk = got.fullAwk; pend.max = got.max; pend.cryst = got.cryst; } } paintSum(); }); } catch (e) {}
    }
    paintSum();
  }
  function paintSum() {
    if (!S) return;
    const ov = S.ov;
    ov.classList.remove("cards", "board", "boot");
    ["xs-eva", "xs-cut", "xs-title"].forEach((k) => { const el = ov.querySelector("." + k); if (el) { el.className = k; el.innerHTML = ""; } });
    ov.querySelector(".xs-count").classList.remove("on");
    ov.querySelector(".xs-board").classList.remove("on");
    const ur = ov.querySelector(".xs-ur"); ur.classList.remove("on", "go"); ur.innerHTML = "";
    const cards = ov.querySelector(".xs-cards"); cards.innerHTML = "";
    ov.classList.add("bg");
    const tiers = S.rs.map(tierOf);
    const nUR = tiers.filter((t) => t === 3).length, nSSR = tiers.filter((t) => t === 2).length;
    const head = nUR ? "✦✦ UR 獲得！ ✦✦" : nSSR ? "✦ SSR 獲得！ ✦" : S.rs.some((r) => r.type === "char") ? "キャラ獲得！" : "結果";
    const cells = S.rs.map((r, k) => {
      const t = tierOf(r);
      const dl = (0.04 * k).toFixed(2);
      if (r.type === "select") return `<div class="xs-cell it" style="animation-delay:${dl}s;--ic:#ffd257"><div class="ia">${HEXMARK}</div><span>SSR セレクト</span></div>`;
      if (r.type !== "char") {
        const it = ItemArt.info(r);
        return `<div class="xs-cell it" style="animation-delay:${dl}s;--ic:${it.c}"><div class="ia">${ItemArt.svg(r, 64)}</div><span>${esc(it.nm)} ×${r.n || 1}</span></div>`;
      }
      const c = chr(r.id) || {};
      return `<div class="xs-cell r${t}" data-id="${esc(r.id)}" style="animation-delay:${dl}s"><img src="${esc(c.th || c.img || "")}" alt="">
        <span class="c-r">${RB(t)}</span>${isNew(r) ? '<span class="c-new">NEW</span>' : ""}
        <span class="c-n">${esc(c.nm || "")}<small>${esc(subOf(r))}</small></span></div>`;
    }).join("");
    const sm = ov.querySelector(".xs-sum");
    sm.innerHTML = `<h3>${esc(head)}</h3><h4>${esc(String(S.title || "").replace(/<[^>]+>/g, ""))}</h4>
      <div class="xs-grid${S.rs.length === 1 ? " n1" : ""}">${cells}</div>
      <div class="xs-btns"><button class="xs-ok" type="button">OK</button></div>
      ${S.rs.some((r) => r.type === "char") ? '<div class="xs-sumtag">キャラを押すと性能が見られます</div>' : ""}`;
    sm.classList.add("on");
    sm.querySelector(".xs-ok").addEventListener("click", (e) => { e.stopPropagation(); close(); });
    sm.querySelectorAll(".xs-cell[data-id]").forEach((el) => el.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = el.getAttribute("data-id");
      if (typeof window.openDetX === "function") { try { window.openDetX(id); const d = document.getElementById("detOv"); if (d) d.style.zIndex = "1300"; } catch (er) {} }
    }));
    const top = ov.querySelector(".xs-skip"); if (top) top.style.display = "none";
    const cnt = ov.querySelector(".xs-cnt"); if (cnt) cnt.textContent = "";
    if (nUR || nSSR || S.rs.some((r) => r.type === "char")) snd("fanfare");
  }
  function close() {
    clearT(); BGM.stop();
    const ov = S && S.ov;
    S = null;
    if (ov) { ov.classList.remove("on"); setTimeout(() => { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 360); }
    try { document.body.style.overflow = ""; } catch (e) {}
    try { const d = document.getElementById("detOv"); if (d) d.style.zIndex = ""; } catch (e) {}
    try { if (typeof window.closeGres === "function") window.closeGres(); } catch (e) {}
  }
  /* タップ：演出の途中なら次の段へ（盤は最後の状態→もう一度で1体ずつ）、カードなら次へ */
  function onTap() {
    if (!S) return;
    AC();
    if (S.phase === "intro") { showBoard(); return; }
    if (S.phase === "board") { if (!S.capShown) { boardFinish(); at(900, () => { if (S && S.phase === "board") startCards(); }); } else startCards(); return; }
    if (S.phase === "cards") {
      if (S.busy) return;
      next();
    }
  }

  /* ══ 入口（mb-core の revealGacha から呼ばれる）══ */
  function play(results, title, gmode) {
    const rs = (results || []).slice();
    if (!rs.length) return;
    clearT();
    const ov = build(title);
    /* 昇格（SR→SSR／SSR→UR）は<b>そのガチャのピックアップだけ</b>・確定枠は除く（これまでと同じきまり）。
       ★★ 2026-10-12c 盤の上で、本当より下の色から始めて、目の前で上がる（＝本当の昇格。前はカードの光が最初から本当の色だった）。
       UR は 3割で SR から2段昇格 */
    let pick = null;
    try { pick = gmode && typeof pickIdsOfMode === "function" ? pickIdsOfMode(gmode) : null; } catch (e) { pick = null; }
    const chance = has("RANKUP_CHANCE") ? G("RANKUP_CHANCE") : 0.2;
    const from = rs.map((r) => {
      const t = tierOf(r);
      if (r.type !== "char" || t < 2 || r.sure || r.max || r.lux === "allssr") return t;
      if (pick && pick.indexOf(r.id) < 0) return t;
      if (Math.random() >= chance) return t;
      return t === 3 && Math.random() < 0.3 ? 1 : t - 1;
    });
    /* ★★ 2026-11-03 ①〜③（スロット・カットイン・確定演出）は昇格まえの色（from）で決める＝盤で昇格するまでばれない（ご指摘）。
       盤の最後の札だけ本当の結果（infoReal）。UR が2体以上（昇格まえ）なら天使降臨（plan.angel） */
    const info0 = chooseTells(rs, gmode, from), plan = slotPlan(from);
    if (plan.angel && info0.tl.indexOf("kanji") < 0) info0.tl.push("kanji");
    S = { ov, rs, title, gmode, info: info0, infoReal: chooseTells(rs, gmode), plan, from, i: -1, phase: "intro", busy: false, fast: rs.length >= 10, capShown: false };
    /* 絵は先に読みこんでおく（演出のあいだに届くように）。UR は縦長の SS 絵も */
    S.pre = [];
    rs.forEach((r) => {
      if (r.type !== "char") return;
      const c = chr(r.id); if (!c) return;
      [c.img, c.th, tierOf(r) === 3 ? ssOf(r.id) : null].forEach((u) => { if (!u) return; const im = new Image(); im.decoding = "async"; im.src = u; S.pre.push(im); });
    });
    const luxAll = rs.length >= 10 && rs.every((r) => r.lux === "allssr");
    if (luxAll && typeof luxAstralIntro === "function") {
      /* ASTRAL BURST（10枠ぜんぶSSR）は、いままでの特大の演出のあとに盤 → 1体ずつ */
      ov.style.visibility = "hidden";
      luxAstralIntro(() => { if (S && S.ov === ov) { ov.style.visibility = ""; showBoard(); } });
      return;
    }
    intro();
  }

  window.XevaSummon = { play, close, VERSION: 3 };
})();
