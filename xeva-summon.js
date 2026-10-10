/* ============================================================
   XEVARION SUMMON — ガチャの演出（★★ 2026-10-09 1から作り直し・ご指定）
   ------------------------------------------------------------
   ご指定：「豪華で華やかな演出に」「10連もまとめて出るのではなく、1体ずつ（ウマ娘・ホロドリのように）」
          「確定演出もいくつか」「UR の排出演出で縦長の SS の絵を使ってよい」「3D らしく作ってよい」
   流れ：
     ① 召喚陣（3D の床の魔法陣・降りてくる光の玉・光の柱）。ここで<b>確定演出</b>が出る（下の TELLS）
     ② 1体ずつ公開（カードが陣から飛び出して回転して開く）。SR・アイテムは短く、SSR は光と星、
        UR は画面いっぱいに<b>縦長の SS 絵</b>（mb-core の ssArtOf）。ピックアップはときどき<b>RANK UP</b>（SR→SSR／SSR→UR）
     ③ まとめ（10枠の一覧・NEW・凸・結晶）。OK で閉じる（ガチャ画面の closeGres を呼ぶ）
   ★ 確定演出は<b>うそをつかない</b>：出たら必ずその内容（SSR以上／UR／2体以上／ピックアップ／Pumpkin Night の UR）。
   ★ 抽選・保存はもう済んでいる（mb-core の doFesGacha などが grantChar してから revealGacha を呼ぶ）。ここは見せるだけ。
   ★ どこでも「SKIP」でまとめへ。画面をタップすると次へ進む（演出の途中なら早送り）。
   ★ 画面の外の DOM には触らない（#xsm を1枚かぶせるだけ）。音は WebAudio で作る（最初のタップまでは鳴らない）。
   ============================================================ */
(function () {
  "use strict";
  if (window.XevaSummon) return;

  /* ══ 音（WebAudio・ファイルを使わない）══ */
  let ac = null;
  function AC() {
    try {
      if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === "suspended") ac.resume();
    } catch (e) { ac = null; }
    return ac;
  }
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
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, vol, delay, hp) {
    const c = AC(); if (!c) return;
    const t = c.currentTime + (delay || 0);
    const n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 1.5);
    const s = c.createBufferSource(); s.buffer = buf;
    const f = c.createBiquadFilter(); f.type = "highpass"; f.frequency.value = hp || 400;
    const g = c.createGain(); g.gain.setValueAtTime(vol || 0.08, t);
    s.connect(f); f.connect(g); g.connect(c.destination); s.start(t);
  }
  const SND = {
    open: () => { noise(0.9, 0.05, 0, 900); tone(110, 220, 1.1, "sine", 0.08); tone(220, 440, 1.2, "triangle", 0.05, 0.1); },
    orb: () => { tone(660, 1320, 0.7, "sine", 0.06); tone(990, 1980, 0.6, "triangle", 0.04, 0.12); },
    land: () => { noise(0.35, 0.12, 0, 120); tone(90, 50, 0.5, "sawtooth", 0.1); },
    star: () => { [1568, 2093, 2637].forEach((f, i) => tone(f, f * 1.02, 0.25, "triangle", 0.05, i * 0.07)); },
    gold: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, f, 0.5, "triangle", 0.07, i * 0.06)); },
    rainbow: () => { [523, 659, 784, 988, 1175, 1568, 2093].forEach((f, i) => tone(f, f, 0.7, "sine", 0.07, i * 0.07)); noise(0.6, 0.05, 0.2, 2500); },
    crack: () => { noise(0.18, 0.14, 0, 1500); tone(1200, 300, 0.2, "square", 0.06); },
    flip: () => { noise(0.12, 0.06, 0, 2000); tone(600, 900, 0.12, "triangle", 0.06); },
    sr: () => { tone(880, 1175, 0.25, "triangle", 0.07); },
    ssr: () => { tone(196, 784, 0.6, "sawtooth", 0.07); [784, 988, 1175, 1568].forEach((f, i) => tone(f, f, 0.5, "triangle", 0.06, 0.15 + i * 0.08)); noise(0.4, 0.05, 0.1, 3000); },
    ur: () => { tone(98, 392, 1.1, "sawtooth", 0.08); [523, 784, 1047, 1319, 1568, 2093].forEach((f, i) => tone(f, f, 0.9, "sine", 0.07, 0.3 + i * 0.09)); noise(0.9, 0.06, 0.3, 3500); },
    rank: () => { [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, f * 1.01, 0.18, "square", 0.05, i * 0.05)); },
    item: () => { tone(740, 990, 0.12, "triangle", 0.05); },
    fanfare: () => { [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.36], [784, 0.52], [1047, 0.64]].forEach(([f, d]) => tone(f, f, 0.28, "triangle", 0.08, d)); },
  };
  const snd = (k) => { try { if (SND[k]) SND[k](); } catch (e) {} };

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
  function ssOf(id) { try { return typeof ssArtOf === "function" ? ssArtOf(id) : null; } catch (e) { return null; } }
  function elOf(id) { const c = chr(id); try { return (c && ELEM[c.el]) || null; } catch (e) { return null; } }
  function itemOf(r) {
    if (r.type === "ticket") return { icon: "🎫", nm: "フェスチケット", c: "#ffb020" };
    if (r.type === "gticket") return { icon: "🎫", nm: "ガチャチケット", c: "#1a63b8" };
    if (r.type === "orb") return { icon: "💎", nm: "ジェム", c: "#7cc4ff" };
    if (r.type === "item") { try { const it = ITEMS[r.item]; if (it) return { icon: it.icon, nm: it.nm, c: it.c || "#8affc4" }; } catch (e) {} return { icon: "◆", nm: r.item, c: "#8affc4" }; }
    return { icon: "G", nm: "ゴールド", c: "#ffd257" };
  }
  function subOf(r) {
    if (r.type !== "char") return "×" + (r.n || 1);
    if (r.max) return "💠結晶 +" + (r.cryst || 5);
    if (r.fullAwk) return "👑 限界突破MAX!!";
    if (r.awk) return "覚醒 +" + r.awk;
    return "NEW!";
  }
  function isNew(r) { return r && r.type === "char" && !r.awk && !r.max; }

  /* ══ 見た目（1回だけ差しこむ）══ */
  function css() {
    if (document.getElementById("xsmCss")) return;
    const s = document.createElement("style"); s.id = "xsmCss";
    s.textContent = `
#xsm{position:fixed;inset:0;z-index:1250;overflow:hidden;color:#fff;font-family:'Noto Sans JP',sans-serif;user-select:none;-webkit-user-select:none;
  background:radial-gradient(120% 90% at 50% 30%,#1b1446 0%,#0b0820 55%,#040310 100%);perspective:900px;opacity:0;transition:opacity .35s ease;touch-action:manipulation}
#xsm.on{opacity:1}
#xsm *{box-sizing:border-box}
#xsm .xs-sky,#xsm .xs-sky2{position:absolute;inset:-20%;pointer-events:none;
  background-image:radial-gradient(1.5px 1.5px at 10% 20%,#fff,transparent),radial-gradient(1px 1px at 30% 70%,#cfe1ff,transparent),radial-gradient(1.5px 1.5px at 55% 35%,#fff,transparent),
  radial-gradient(1px 1px at 75% 15%,#ffe9a8,transparent),radial-gradient(1.2px 1.2px at 85% 60%,#fff,transparent),radial-gradient(1px 1px at 45% 85%,#d8c8ff,transparent);
  background-size:220px 220px;animation:xsDrift 40s linear infinite;opacity:.8}
#xsm .xs-sky2{background-size:330px 330px;animation-duration:70s;opacity:.5;transform:scale(1.3)}
@keyframes xsDrift{to{background-position:220px 440px}}
#xsm .xs-neb{position:absolute;inset:0;pointer-events:none;background:radial-gradient(60% 40% at 20% 30%,rgba(140,80,255,.25),transparent 70%),radial-gradient(50% 40% at 80% 70%,rgba(60,160,255,.2),transparent 70%);
  animation:xsNeb 9s ease-in-out infinite alternate}
@keyframes xsNeb{to{transform:scale(1.15) rotate(6deg)}}
/* ── 召喚陣（3D の床） ── */
#xsm .xs-stage{position:absolute;inset:0;transform-style:preserve-3d}
#xsm .xs-floor{position:absolute;left:50%;top:64%;width:min(118vmin,760px);height:min(118vmin,760px);margin:calc(min(118vmin,760px) / -2) 0 0 calc(min(118vmin,760px) / -2);
  transform:rotateX(72deg) scale(.6);transform-style:preserve-3d;opacity:0;transition:transform 1s cubic-bezier(.2,.9,.3,1),opacity .6s}
#xsm.go .xs-floor{transform:rotateX(72deg) scale(1);opacity:1}
#xsm .xs-ring{position:absolute;inset:0;border-radius:50%;--rc:#7fb8ff}
#xsm .xs-ring.r1{border:3px solid var(--rc);box-shadow:0 0 30px var(--rc),inset 0 0 30px var(--rc);animation:xsSpin 12s linear infinite}
#xsm .xs-ring.r2{inset:9%;border:2px dashed var(--rc);opacity:.8;animation:xsSpin 8s linear infinite reverse}
#xsm .xs-ring.r3{inset:20%;background:conic-gradient(from 0deg,transparent 0 10deg,var(--rc) 10deg 12deg,transparent 12deg 30deg);-webkit-mask:radial-gradient(circle,transparent 58%,#000 59%,#000 64%,transparent 65%);
  mask:radial-gradient(circle,transparent 58%,#000 59%,#000 64%,transparent 65%);animation:xsSpin 6s linear infinite}
#xsm .xs-ring.r4{inset:30%;border:2px solid var(--rc);box-shadow:0 0 24px var(--rc);animation:xsSpin 10s linear infinite reverse}
#xsm .xs-ring.r5{inset:38%;background:radial-gradient(circle,rgba(255,255,255,.55),transparent 70%);animation:xsPulse 1.2s ease-in-out infinite alternate}
#xsm .xs-rune{position:absolute;inset:4%;animation:xsSpin 20s linear infinite}
#xsm .xs-rune svg{width:100%;height:100%;overflow:visible}
#xsm .xs-rune text{fill:var(--rc);font:900 15px 'Orbitron',sans-serif;letter-spacing:7px}
#xsm .xs-hex{position:absolute;inset:24%;animation:xsSpin 14s linear infinite}
#xsm .xs-hex svg{width:100%;height:100%}
#xsm .xs-hex path{fill:none;stroke:var(--rc);stroke-width:2;filter:drop-shadow(0 0 6px var(--rc))}
@keyframes xsSpin{to{transform:rotate(360deg)}}
@keyframes xsPulse{from{opacity:.4}to{opacity:1}}
#xsm.t-gold .xs-ring,#xsm.t-gold .xs-rune,#xsm.t-gold .xs-hex{--rc:#ffd257}
#xsm.t-rainbow .xs-ring,#xsm.t-rainbow .xs-rune,#xsm.t-rainbow .xs-hex{--rc:#ff9ad8;animation-duration:3s}
#xsm.t-rainbow .xs-floor{filter:hue-rotate(0);animation:xsHue 2s linear infinite}
@keyframes xsHue{to{filter:hue-rotate(360deg)}}
#xsm .xs-floor2{position:absolute;left:50%;top:64%;width:min(80vmin,520px);height:min(80vmin,520px);margin:calc(min(80vmin,520px) / -2) 0 0 calc(min(80vmin,520px) / -2);
  transform:translateY(-120px) rotateX(72deg) scale(.4);opacity:0;border-radius:50%;border:3px solid #ffd257;box-shadow:0 0 40px #ffd257,inset 0 0 40px #ffd257;pointer-events:none}
#xsm.tell-double .xs-floor2{animation:xsDouble 1.4s cubic-bezier(.2,.9,.3,1) forwards}
@keyframes xsDouble{to{transform:translateY(-160px) rotateX(72deg) scale(1) rotate(180deg);opacity:1}}
/* ── 光の玉と柱 ── */
#xsm .xs-orb{position:absolute;left:50%;top:-12%;width:64px;height:64px;margin-left:-32px;border-radius:50%;
  background:radial-gradient(circle at 38% 32%,#fff,#cfe6ff 35%,#5aa8ff 70%,rgba(90,168,255,0) 72%);box-shadow:0 0 40px #7fb8ff,0 0 90px #5aa8ff;opacity:0}
#xsm.drop .xs-orb{animation:xsOrb 1s cubic-bezier(.5,0,.7,.4) forwards}
@keyframes xsOrb{0%{opacity:0;transform:translateY(0) scale(.6)}15%{opacity:1}100%{opacity:1;transform:translateY(calc(64vh + 12vh)) scale(1.1)}}
#xsm .xs-orb::after{content:"";position:absolute;left:50%;bottom:50%;width:6px;height:46vh;margin-left:-3px;background:linear-gradient(transparent,rgba(190,220,255,.8));border-radius:3px}
#xsm.t-gold .xs-orb{background:radial-gradient(circle at 38% 32%,#fff,#fff0b8 35%,#ffc93c 70%,rgba(255,201,60,0) 72%);box-shadow:0 0 40px #ffd257,0 0 90px #ffb020}
#xsm.t-rainbow .xs-orb{background:radial-gradient(circle at 38% 32%,#fff,#ffd6f0 30%,#c7a0ff 55%,#7fe8ff 70%,transparent 72%);box-shadow:0 0 40px #ff9ad8,0 0 90px #7fe8ff;animation-name:xsOrb}
#xsm .xs-pillar{position:absolute;left:50%;bottom:30%;width:min(40vmin,260px);height:120vh;margin-left:calc(min(40vmin,260px) / -2);transform-origin:50% 100%;transform:scaleX(0);opacity:0;
  background:linear-gradient(90deg,transparent,rgba(160,200,255,.0) 10%,rgba(160,200,255,.65) 45%,#fff 50%,rgba(160,200,255,.65) 55%,transparent 90%);filter:blur(2px)}
#xsm.lit .xs-pillar{animation:xsPillar .9s cubic-bezier(.2,.9,.3,1) forwards}
@keyframes xsPillar{0%{transform:scaleX(0);opacity:0}30%{transform:scaleX(1.3);opacity:1}100%{transform:scaleX(1);opacity:.85}}
#xsm.t-gold .xs-pillar{background:linear-gradient(90deg,transparent,rgba(255,210,90,.65) 45%,#fff 50%,rgba(255,210,90,.65) 55%,transparent)}
#xsm.t-rainbow .xs-pillar{background:linear-gradient(90deg,transparent,#ff6fb5 30%,#ffd257 40%,#fff 50%,#7dffb0 60%,#5fd0ff 70%,transparent);animation:xsPillar .9s cubic-bezier(.2,.9,.3,1) forwards,xsHue 1.6s linear infinite}
#xsm .xs-flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none}
#xsm .xs-flash.go{animation:xsFlash .6s ease-out}
@keyframes xsFlash{0%{opacity:.95}100%{opacity:0}}
#xsm .xs-shock{position:absolute;left:50%;top:64%;width:30px;height:30px;margin:-15px;border-radius:50%;border:4px solid #fff;opacity:0;pointer-events:none}
#xsm.lit .xs-shock{animation:xsShock .8s ease-out}
@keyframes xsShock{0%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(40)}}
/* ── 確定演出 ── */
#xsm .xs-star{position:absolute;left:-20%;top:12%;width:220px;height:3px;background:linear-gradient(90deg,transparent,#fff 80%,#fff);border-radius:3px;
  box-shadow:0 0 12px #fff,0 0 30px #ffd257;transform:rotate(14deg);opacity:0;pointer-events:none}
#xsm .xs-star::after{content:"";position:absolute;right:-6px;top:-6px;width:15px;height:15px;border-radius:50%;background:#fff;box-shadow:0 0 18px #fff,0 0 36px #ffd257}
#xsm.tell-star .xs-star{animation:xsStar 1.1s ease-in forwards}
@keyframes xsStar{0%{opacity:0;transform:translate(0,0) rotate(14deg)}10%{opacity:1}100%{opacity:0;transform:translate(150vw,36vh) rotate(14deg)}}
#xsm .xs-sil{position:absolute;left:50%;top:30%;width:min(56vmin,360px);height:min(56vmin,360px);margin:calc(min(56vmin,360px) / -2) 0 0 calc(min(56vmin,360px) / -2);
  opacity:0;pointer-events:none;filter:brightness(0) drop-shadow(0 0 18px #fff) drop-shadow(0 0 30px var(--sc,#ffd257));transform:scale(.8)}
#xsm .xs-sil img{width:100%;height:100%;object-fit:cover;border-radius:50%;-webkit-mask:radial-gradient(circle,#000 55%,transparent 72%);mask:radial-gradient(circle,#000 55%,transparent 72%)}
#xsm.tell-sil .xs-sil{animation:xsSil 1.6s ease forwards}
@keyframes xsSil{0%{opacity:0;transform:scale(.8)}30%{opacity:.95;transform:scale(1)}75%{opacity:.95}100%{opacity:0;transform:scale(1.15)}}
#xsm .xs-pk{position:absolute;inset:0;pointer-events:none}
#xsm .xs-pk i{position:absolute;font-style:normal;font-size:min(9vmin,52px);opacity:0;filter:drop-shadow(0 0 12px #ff8a1f) drop-shadow(0 0 26px #ffb347)}
#xsm.tell-pk .xs-pk i{animation:xsPk 2.4s ease forwards}
@keyframes xsPk{0%{opacity:0;transform:translateY(20px) scale(.5)}25%{opacity:1;transform:translateY(0) scale(1.1)}80%{opacity:1}100%{opacity:0;transform:translateY(-30px) scale(1)}}
#xsm .xs-crack{position:absolute;left:50%;top:64%;width:min(60vmin,400px);height:6px;margin-left:calc(min(60vmin,400px) / -2);opacity:0;pointer-events:none;
  background:linear-gradient(90deg,transparent,#fff,transparent);box-shadow:0 0 20px #fff,0 0 40px #ff9ad8}
#xsm.tell-rank .xs-crack{animation:xsCrack .7s ease-out 1.75s forwards}
@keyframes xsCrack{0%{opacity:0;transform:scaleX(0)}40%{opacity:1;transform:scaleX(1)}100%{opacity:0;transform:scaleX(1.4)}}
#xsm .xs-cap{position:absolute;left:0;right:0;bottom:calc(env(safe-area-inset-bottom,0px) + 9%);text-align:center;pointer-events:none}
#xsm .xs-cap b{display:inline-block;font:900 clamp(20px,5.4vw,40px)/1.15 'Orbitron','Noto Sans JP',sans-serif;letter-spacing:.06em;font-style:italic;
  background:linear-gradient(100deg,#fff,#cfe6ff);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 14px rgba(140,190,255,.8));
  opacity:0;transform:translateY(18px) scale(.9)}
#xsm .xs-cap.on b{animation:xsCap .5s cubic-bezier(.2,1.5,.4,1) forwards}
#xsm .xs-capic{display:block;font-style:normal;font-size:clamp(30px,8vw,54px);line-height:1;margin-bottom:6px;opacity:0;transform:scale(.4)}
#xsm .xs-cap.on .xs-capic{animation:xsCap .5s cubic-bezier(.2,1.5,.4,1) forwards}
#xsm .xs-cap small{display:block;margin-top:6px;font:900 12px 'Orbitron',sans-serif;letter-spacing:.4em;color:#cfe1ff;opacity:0;transition:opacity .3s}
#xsm .xs-cap.on small{opacity:.8}
#xsm.t-gold .xs-cap b{background-image:linear-gradient(100deg,#fff6c4,#ffd257 50%,#ffb020);filter:drop-shadow(0 0 14px rgba(255,200,80,.9))}
#xsm.t-rainbow .xs-cap.on b{background-image:linear-gradient(100deg,#ff7ab8,#ffd257 25%,#7dffb0 50%,#5fd0ff 75%,#c79cff);background-size:200% 100%;animation:xsCap .5s cubic-bezier(.2,1.5,.4,1) forwards,xsCapRb 1.4s linear infinite}
@keyframes xsCap{to{opacity:1;transform:none}}
@keyframes xsCapRb{to{background-position:200% 0}}
/* ── 上の帯（題・SKIP）── */
#xsm .xs-top{position:absolute;left:0;right:0;top:0;display:flex;align-items:center;gap:10px;padding:calc(env(safe-area-inset-top,0px) + 10px) 14px 8px;z-index:30;
  background:linear-gradient(rgba(4,3,16,.7),transparent)}
#xsm .xs-ttl{flex:1;min-width:0;font-size:12px;font-weight:900;letter-spacing:.04em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;opacity:.9}
#xsm .xs-skip{flex:none;border:1.5px solid rgba(255,255,255,.7);background:rgba(10,8,30,.55);color:#fff;font:900 12px 'Orbitron',sans-serif;letter-spacing:.12em;padding:8px 14px;border-radius:99px;cursor:pointer}
#xsm .xs-cnt{flex:none;font:900 12px 'Orbitron',sans-serif;letter-spacing:.08em;opacity:.85}
/* ── 1体ずつのカード ── */
#xsm .xs-cards{position:absolute;inset:0;display:none;align-items:center;justify-content:center;perspective:1100px;z-index:10}
#xsm.cards .xs-cards{display:flex}
#xsm.cards .xs-stage{opacity:.25;transition:opacity .4s}
#xsm .xs-glow{position:absolute;left:50%;top:50%;width:150vmax;height:150vmax;margin:-75vmax 0 0 -75vmax;opacity:0;pointer-events:none;
  background:repeating-conic-gradient(from 0deg,rgba(255,255,255,.18) 0 4deg,transparent 4deg 16deg);animation:xsSpin 18s linear infinite;
  -webkit-mask:radial-gradient(circle,#000 8%,rgba(0,0,0,.6) 30%,transparent 60%);mask:radial-gradient(circle,#000 8%,rgba(0,0,0,.6) 30%,transparent 60%)}
#xsm .xs-glow.g1{opacity:.35;filter:sepia(1) hue-rotate(170deg)}
#xsm .xs-glow.g2{opacity:.9;background:repeating-conic-gradient(from 0deg,rgba(255,215,90,.55) 0 5deg,transparent 5deg 15deg);animation-duration:10s}
#xsm .xs-glow.g3{opacity:1;background:repeating-conic-gradient(from 0deg,rgba(255,110,180,.5) 0 5deg,transparent 5deg 12deg,rgba(255,220,90,.5) 12deg 17deg,transparent 17deg 24deg,rgba(110,255,180,.45) 24deg 29deg,transparent 29deg 36deg,rgba(90,200,255,.5) 36deg 41deg,transparent 41deg 48deg);animation-duration:7s}
#xsm .xs-card{position:relative;width:min(64vw,340px);aspect-ratio:3/4;transform-style:preserve-3d;transform:translateY(40vh) rotateY(180deg) scale(.4);opacity:0}
#xsm .xs-card.in{animation:xsCardIn .55s cubic-bezier(.2,.9,.3,1.15) forwards}
#xsm .xs-card.flip{animation:xsCardFlip .7s cubic-bezier(.3,.8,.3,1.1) forwards}
@keyframes xsCardIn{to{transform:translateY(0) rotateY(180deg) scale(1);opacity:1}}
@keyframes xsCardFlip{0%{transform:rotateY(180deg) scale(1);opacity:1}60%{transform:rotateY(-12deg) scale(1.06)}100%{transform:rotateY(0) scale(1);opacity:1}}
#xsm .xs-face,#xsm .xs-back{position:absolute;inset:0;border-radius:22px;overflow:hidden;backface-visibility:hidden;-webkit-backface-visibility:hidden}
#xsm .xs-back{transform:rotateY(180deg);background:radial-gradient(circle at 50% 40%,#3a4a8a,#141a3a 70%);box-shadow:0 0 0 4px #c8d6ff,0 0 30px rgba(140,180,255,.6)}
#xsm .xs-back::before{content:"";position:absolute;inset:12px;border-radius:14px;border:2px solid rgba(220,230,255,.7);
  background:repeating-conic-gradient(from 0deg at 50% 50%,rgba(255,255,255,.08) 0 10deg,transparent 10deg 20deg)}
#xsm .xs-back::after{content:"✦";position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:64px;color:#e8eeff;text-shadow:0 0 20px #8fb0ff}
#xsm .xs-back.b2{background:radial-gradient(circle at 50% 40%,#8a6a1a,#3a2a08 70%);box-shadow:0 0 0 4px #ffd257,0 0 40px rgba(255,200,80,.8)}
#xsm .xs-back.b2::after{color:#fff3c4;text-shadow:0 0 24px #ffd257}
#xsm .xs-back.b3{background:linear-gradient(135deg,#ff5fa2,#ffd257 30%,#7dffb0 50%,#5fd0ff 70%,#a35cff);box-shadow:0 0 0 4px #fff,0 0 50px rgba(255,160,230,.9);animation:xsHue 2.4s linear infinite}
#xsm .xs-back.b3::after{color:#fff;text-shadow:0 0 30px #fff}
#xsm .xs-back.blk{background:radial-gradient(circle at 50% 40%,#2a2440,#05040c 70%);box-shadow:0 0 0 4px #ffd257,0 0 40px rgba(255,93,143,.5)}
#xsm .xs-face{background:#0d0a1e;box-shadow:0 0 0 4px #c8d6ff}
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
#xsm .xs-rar.r3{background:linear-gradient(115deg,#ff5fa2,#ffd257 30%,#7dffb0 50%,#5fd0ff 70%,#a35cff);color:#fff;text-shadow:0 1px 3px rgba(60,10,90,.7);box-shadow:0 0 22px rgba(255,140,220,.9)}
#xsm .xs-nm{display:block;font-size:clamp(20px,5.6vw,30px);font-weight:900;line-height:1.15;text-shadow:0 2px 10px rgba(0,0,0,.8)}
#xsm .xs-nm span{display:inline-block;opacity:0;transform:translateY(12px)}
#xsm .xs-card.flip .xs-nm span{animation:xsLetter .35s cubic-bezier(.2,1.5,.4,1) forwards}
@keyframes xsLetter{to{opacity:1;transform:none}}
#xsm .xs-sub{display:block;margin-top:3px;font-size:12px;font-weight:900;opacity:.9}
#xsm .xs-new{position:absolute;right:12px;top:12px;font:900 15px 'Orbitron',sans-serif;color:#fff;background:#ff3d6e;border-radius:10px;padding:4px 10px;transform:rotate(8deg) scale(0);
  box-shadow:0 0 0 2px #fff,0 6px 16px rgba(255,40,90,.5)}
#xsm .xs-card.flip .xs-new{animation:xsNew .35s .8s cubic-bezier(.2,1.6,.4,1) forwards}
@keyframes xsNew{to{transform:rotate(8deg) scale(1)}}
#xsm .xs-elb{position:absolute;left:12px;top:12px;font-size:11px;font-weight:900;padding:3px 9px;border-radius:99px;background:rgba(0,0,0,.55);border:1.5px solid var(--ec,#fff)}
#xsm .xs-burst{position:absolute;left:50%;top:50%;width:0;height:0;pointer-events:none;z-index:2}
#xsm .xs-burst i{position:absolute;left:0;top:0;width:10px;height:10px;margin:-5px;background:var(--pc,#fff);clip-path:polygon(50% 0,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0 50%,38% 38%);opacity:0}
#xsm .xs-burst.go i{animation:xsBurst 1s ease-out forwards}
@keyframes xsBurst{0%{opacity:1;transform:translate(0,0) scale(.5) rotate(0)}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(1.3) rotate(220deg)}}
#xsm .xs-item{width:min(52vw,250px);aspect-ratio:1;border-radius:22px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;
  background:radial-gradient(circle at 50% 35%,rgba(255,255,255,.18),rgba(20,24,60,.85));box-shadow:0 0 0 3px rgba(255,255,255,.5),0 0 30px var(--ic,#8affc4);
  transform:translateY(30vh) scale(.4);opacity:0}
#xsm .xs-item.in{animation:xsItemIn .45s cubic-bezier(.2,1.3,.4,1) forwards}
@keyframes xsItemIn{to{transform:none;opacity:1}}
#xsm .xs-item b{font-size:64px;line-height:1;filter:drop-shadow(0 0 14px var(--ic,#8affc4))}
#xsm .xs-item span{font-size:15px;font-weight:900}
#xsm .xs-rank{position:absolute;left:0;right:0;top:16%;text-align:center;pointer-events:none;z-index:5}
#xsm .xs-rank b{display:inline-block;font:900 clamp(30px,9vw,62px)/1 'Orbitron',sans-serif;font-style:italic;letter-spacing:.04em;
  background:linear-gradient(100deg,#fff,#ffd257 40%,#ff7ab8 70%,#7fe8ff);-webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 0 18px rgba(255,200,120,.9));animation:xsRankTx 1.2s cubic-bezier(.2,1.5,.4,1) both}
@keyframes xsRankTx{0%{opacity:0;transform:scale(2.4)}25%{opacity:1;transform:scale(1)}80%{opacity:1}100%{opacity:0;transform:scale(1.1)}}
#xsm .xs-card.shake{animation:xsShake .5s linear}
@keyframes xsShake{0%,100%{transform:rotateY(180deg) translateX(0)}20%{transform:rotateY(180deg) translateX(-10px) rotate(-3deg)}40%{transform:rotateY(180deg) translateX(10px) rotate(3deg)}60%{transform:rotateY(180deg) translateX(-8px)}80%{transform:rotateY(180deg) translateX(6px)}}
/* ── UR（画面いっぱいの縦長の絵）── */
#xsm .xs-ur{position:absolute;inset:0;display:none;z-index:20;overflow:hidden;background:#05030f}
#xsm .xs-ur.on{display:block}
#xsm .xs-ur .u-bg{position:absolute;inset:-10%;background:conic-gradient(from 0deg,#ff5fa2,#ffd257,#7dffb0,#5fd0ff,#a35cff,#ff5fa2);opacity:.28;filter:blur(30px);animation:xsSpin 8s linear infinite}
#xsm .xs-ur .u-lines{position:absolute;inset:0;background:repeating-linear-gradient(100deg,transparent 0 22px,rgba(255,255,255,.07) 22px 24px);animation:xsLines .8s linear infinite}
@keyframes xsLines{to{background-position:240px 0}}
#xsm .xs-ur .u-art{position:absolute;left:50%;bottom:0;height:min(96vh,100%);aspect-ratio:619/1100;transform:translate(-50%,30%) scale(1.1);opacity:0;
  -webkit-mask:linear-gradient(180deg,#000 82%,transparent);mask:linear-gradient(180deg,#000 82%,transparent)}
#xsm .xs-ur.go .u-art{animation:xsUrArt 1.1s .25s cubic-bezier(.15,.85,.25,1) forwards}
@keyframes xsUrArt{to{transform:translate(-50%,0) scale(1);opacity:1}}
#xsm .xs-ur .u-art img{width:100%;height:100%;object-fit:cover;display:block}
#xsm .xs-ur .u-frame{position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 0 0 3px rgba(255,255,255,.9),inset 0 0 0 8px rgba(255,140,220,.55),inset 0 0 80px rgba(255,180,240,.35)}
#xsm .xs-ur .u-emb{position:absolute;left:calc(env(safe-area-inset-left,0px) + 4%);top:calc(env(safe-area-inset-top,0px) + 70px);width:min(30vmin,170px);aspect-ratio:1;opacity:0;transform:scale(2.5) rotate(-30deg)}
#xsm .xs-ur.go .u-emb{animation:xsEmb .6s 1s cubic-bezier(.2,1.5,.4,1) forwards}
@keyframes xsEmb{to{opacity:1;transform:none}}
#xsm .xs-ur .u-emb i{position:absolute;inset:0;border-radius:50%;background:conic-gradient(#ff5fa2,#ffd257,#7dffb0,#5fd0ff,#a35cff,#ff5fa2);animation:xsSpin 3s linear infinite;
  -webkit-mask:radial-gradient(circle,transparent 58%,#000 60%);mask:radial-gradient(circle,transparent 58%,#000 60%)}
#xsm .xs-ur .u-emb b{position:absolute;inset:0;display:grid;place-items:center;font:900 min(13vmin,72px)/1 'Orbitron',sans-serif;letter-spacing:.02em;
  background:linear-gradient(115deg,#fff,#ffd6f0 30%,#fff6c4 60%,#c8f6ff);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 12px rgba(255,160,230,.9))}
#xsm .xs-ur .u-txt{position:absolute;right:calc(env(safe-area-inset-right,0px) + 4%);bottom:calc(env(safe-area-inset-bottom,0px) + 9%);text-align:right;max-width:70%;opacity:0;transform:translateX(40px)}
#xsm .xs-ur.go .u-txt{animation:xsUrTx .6s 1.15s cubic-bezier(.2,1.2,.4,1) forwards}
@keyframes xsUrTx{to{opacity:1;transform:none}}
#xsm .xs-ur .u-txt small{display:block;font:900 12px 'Orbitron',sans-serif;letter-spacing:.4em;color:#ffd6f0}
#xsm .xs-ur .u-txt b{display:block;font-size:clamp(34px,10vw,72px);font-weight:900;line-height:1.05;
  background:linear-gradient(100deg,#fff,#ffd6f0 30%,#fff6c4 60%,#c8f6ff);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 3px 10px rgba(0,0,0,.8))}
#xsm .xs-ur .u-txt span{display:block;margin-top:6px;font-size:13px;font-weight:900;color:#fff;text-shadow:0 2px 8px #000}
#xsm .xs-ur .u-sp{position:absolute;inset:0;pointer-events:none}
#xsm .xs-ur .u-sp i{position:absolute;top:-6%;width:8px;height:8px;background:#fff;clip-path:polygon(50% 0,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0 50%,38% 38%);animation:xsFall 3s linear infinite}
@keyframes xsFall{to{transform:translateY(112vh) rotate(360deg)}}
#xsm .xs-ur .u-flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none}
#xsm .xs-ur.go .u-flash{animation:xsFlash .8s .2s ease-out}
@media (min-aspect-ratio:4/3){#xsm .xs-ur .u-art{left:38%}}
/* ── 下の案内・進み ── */
#xsm .xs-foot{position:absolute;left:0;right:0;bottom:calc(env(safe-area-inset-bottom,0px) + 14px);display:none;flex-direction:column;align-items:center;gap:8px;z-index:25;pointer-events:none}
#xsm.cards .xs-foot{display:flex}
#xsm .xs-dots{display:flex;gap:5px}
#xsm .xs-dots i{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.25);transition:all .3s}
#xsm .xs-dots i.d{background:rgba(255,255,255,.7)}
#xsm .xs-dots i.d2{background:#ffd257;box-shadow:0 0 8px #ffd257}
#xsm .xs-dots i.d3{background:#ff8fd0;box-shadow:0 0 8px #ff8fd0}
#xsm .xs-dots i.on{transform:scale(1.5)}
#xsm .xs-tap{font:900 11px 'Orbitron',sans-serif;letter-spacing:.3em;opacity:.75;animation:xsBlink 1.2s ease-in-out infinite}
@keyframes xsBlink{50%{opacity:.25}}
/* ── まとめ ── */
#xsm .xs-sum{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;padding:calc(env(safe-area-inset-top,0px) + 56px) 12px calc(env(safe-area-inset-bottom,0px) + 16px);z-index:28;
  background:radial-gradient(120% 90% at 50% 30%,rgba(40,30,90,.92),rgba(6,4,18,.96))}
#xsm .xs-sum.on{display:flex;animation:xsSumIn .4s ease}
@keyframes xsSumIn{from{opacity:0}}
#xsm .xs-sum h3{font:900 clamp(18px,4.6vw,26px) 'Orbitron','Noto Sans JP',sans-serif;letter-spacing:.06em;margin-bottom:4px;text-align:center}
#xsm .xs-sum h4{font-size:12px;font-weight:800;opacity:.85;margin-bottom:12px;text-align:center}
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
#xsm .xs-cell .c-n{position:absolute;left:0;right:0;bottom:0;padding:12px 4px 4px;font-size:10px;font-weight:900;text-align:center;line-height:1.25;
  background:linear-gradient(transparent,rgba(5,4,16,.92))}
#xsm .xs-cell .c-n small{display:block;font-size:9px;opacity:.9}
#xsm .xs-cell .c-new{position:absolute;right:3px;top:3px;font:900 9px 'Orbitron',sans-serif;background:#ff3d6e;border-radius:5px;padding:2px 5px}
#xsm .xs-cell.it{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;background:radial-gradient(circle at 50% 35%,rgba(255,255,255,.14),#141a3a)}
#xsm .xs-cell.it b{font-size:30px;line-height:1}
#xsm .xs-cell.it span{font-size:9.5px;font-weight:900;text-align:center;padding:0 3px}
#xsm .xs-btns{display:flex;gap:10px;margin-top:16px}
#xsm .xs-ok{border:none;cursor:pointer;font:900 16px 'Orbitron','Noto Sans JP',sans-serif;letter-spacing:.1em;color:#fff;padding:13px 54px;border-radius:99px;
  background:linear-gradient(135deg,#7b5cf0,#f0509a);box-shadow:0 8px 22px rgba(123,92,240,.5)}
#xsm .xs-sumtag{margin-top:10px;font-size:11px;font-weight:800;opacity:.8;text-align:center}
@media (max-width:420px){#xsm .xs-grid{gap:5px}#xsm .xs-cell .c-n{font-size:9px}}
@media (prefers-reduced-motion:reduce){#xsm *{animation-duration:.01s!important;animation-iteration-count:1!important}}
`;
    document.head.appendChild(s);
  }

  /* ══ 状態 ══ */
  let S = null;              // いまの公開の状態
  const T = [];              // タイマー
  function at(ms, fn) { const id = setTimeout(() => { try { fn(); } catch (e) { console.warn("[summon]", e); } }, ms); T.push(id); return id; }
  function clearT() { while (T.length) clearTimeout(T.pop()); }

  /* ══ 確定演出の選びかた（出たら必ずその内容＝うそをつかない）══ */
  function chooseTells(rs, gmode) {
    const tiers = rs.map(tierOf);
    const best = Math.max(0, ...tiers);
    const nS = tiers.filter((t) => t >= 2).length;
    let pick = [];
    try { pick = gmode && typeof pickIdsOfMode === "function" ? pickIdsOfMode(gmode) : []; } catch (e) { pick = []; }
    const pickHit = rs.find((r) => r.type === "char" && tierOf(r) >= 2 && pick.indexOf(r.id) >= 0);
    let pumpkin = false;
    try { const f = gmode && typeof fesDef === "function" ? FESTS[gmode] : null; pumpkin = !!(f && f.pumpkin) && best === 3; } catch (e) {}
    const tl = [];
    const rnd = Math.random;
    if (best === 3 && rnd() < 0.5) tl.push("rank");                     /* 金 → 虹に割れる（UR 確定） */
    if (best >= 2 && rnd() < 0.55) tl.push("star");                     /* 流れ星（SSR以上 確定） */
    if (nS >= 2 && rnd() < 0.6) tl.push("double");                      /* 二重の魔法陣（SSR以上が2体以上） */
    if (pickHit && rnd() < 0.5) tl.push("sil");                         /* ピックアップのシルエット */
    if (pumpkin && rnd() < 0.75) tl.push("pk");                         /* 南瓜のランタン（Pumpkin Night の UR） */
    return { best, nS, tl, pickHit, pumpkin };
  }
  function capText(info) {
    if (info.tl.indexOf("pk") >= 0) return ["PUMPKIN NIGHT UR 確定!!", "TRICK OR TREAT", "🎃"];
    if (info.best === 3) return ["✦✦ UR 確定 ✦✦", "ULTRA RARE", "🌈"];
    if (info.tl.indexOf("double") >= 0) return ["✦ W SSR以上 確定!! ✦", "DOUBLE", "✨"];
    if (info.tl.indexOf("sil") >= 0) return ["✦ PICK UP 確定!! ✦", "PICK UP", "⭐"];
    if (info.best === 2) return ["✦ SSR以上 確定!! ✦", "SUPER RARE", "✨"];
    return ["SUMMON", "XEVARION GACHA", ""];
  }

  /* ══ 組み立て ══ */
  function build(title) {
    css();
    let ov = document.getElementById("xsm");
    if (ov) ov.remove();
    ov = document.createElement("div");
    ov.id = "xsm";
    const runes = "XEVARION ✦ SUMMON ✦ LUMEN ✦ UMBRA ✦ IGNIS ✦ AQUA ✦ VERDE ✦ ";
    ov.innerHTML = `
      <div class="xs-sky"></div><div class="xs-sky2"></div><div class="xs-neb"></div>
      <div class="xs-stage">
        <div class="xs-floor">
          <div class="xs-ring r1"></div><div class="xs-ring r2"></div><div class="xs-ring r3"></div><div class="xs-ring r4"></div><div class="xs-ring r5"></div>
          <div class="xs-rune"><svg viewBox="-200 -200 400 400"><defs><path id="xsRp" d="M0,-180 a180,180 0 1,1 -0.1,0"/></defs><text><textPath href="#xsRp">${runes}${runes}</textPath></text></svg></div>
          <div class="xs-hex"><svg viewBox="-100 -100 200 200"><path d="M0,-90 L78,45 L-78,45 Z"/><path d="M0,90 L78,-45 L-78,-45 Z"/></svg></div>
        </div>
        <div class="xs-floor2"></div>
        <div class="xs-pillar"></div><div class="xs-shock"></div><div class="xs-crack"></div>
        <div class="xs-orb"></div>
        <div class="xs-star"></div>
        <div class="xs-sil"><img alt=""></div>
        <div class="xs-pk"></div>
      </div>
      <div class="xs-cards"></div>
      <div class="xs-ur"></div>
      <div class="xs-sum"></div>
      <div class="xs-cap"><i class="xs-capic"></i><b></b><small></small></div>
      <div class="xs-flash"></div>
      <div class="xs-top"><span class="xs-ttl">${esc(String(title || "").replace(/<[^>]+>/g, ""))}</span><span class="xs-cnt"></span><button class="xs-skip" type="button">SKIP ▶▶</button></div>
      <div class="xs-foot"><span class="xs-dots"></span><span class="xs-tap">TAP</span></div>`;
    document.body.appendChild(ov);
    try { document.body.style.overflow = "hidden"; } catch (e) {}
    ov.querySelector(".xs-skip").addEventListener("click", (e) => { e.stopPropagation(); toSummary(); });
    ov.addEventListener("click", onTap);
    requestAnimationFrame(() => ov.classList.add("on"));
    return ov;
  }
  function flash() { const f = S.ov.querySelector(".xs-flash"); if (!f) return; f.classList.remove("go"); void f.offsetWidth; f.classList.add("go"); }
  function tierClass(t) { return t === 3 ? "t-rainbow" : t === 2 ? "t-gold" : "t-blue"; }

  /* ══ ① 召喚陣 ══ */
  function intro() {
    const ov = S.ov, info = S.info;
    S.phase = "intro";
    /* 降りてくる玉の色。青は何も約束しない／金＝SSR以上／虹＝UR（うそはつかない）。
       着地したところで本当の色になる（青→金・金→虹に変わるのも見どころ）。rank（金→虹に割れる）は金から始める */
    const r0 = Math.random();
    const first = info.tl.indexOf("rank") >= 0 ? 2
      : info.best >= 2 ? (r0 < 0.4 ? 1 : (info.best === 3 && r0 < 0.7 ? 2 : info.best)) : 1;
    ov.classList.add(tierClass(first));
    at(80, () => { ov.classList.add("go"); snd("open"); });
    at(500, () => { ov.classList.add("drop"); snd("orb"); });
    if (info.tl.indexOf("star") >= 0) at(820, () => { ov.classList.add("tell-star"); snd("star"); });
    if (info.tl.indexOf("pk") >= 0) at(700, () => {
      const box = ov.querySelector(".xs-pk");
      box.innerHTML = [[12, 58], [86, 54], [24, 34], [74, 30], [50, 18]].map(([x, y], i) => `<i style="left:${x}%;top:${y}%;animation-delay:${i * 0.12}s">🎃</i>`).join("");
      ov.classList.add("tell-pk"); snd("gold");
    });
    if (info.tl.indexOf("sil") >= 0 && info.pickHit) at(900, () => {
      const c = chr(info.pickHit.id), sil = ov.querySelector(".xs-sil");
      const e = elOf(info.pickHit.id);
      if (c && sil) { sil.querySelector("img").src = c.th || c.img; sil.style.setProperty("--sc", (e && e.c) || "#ffd257"); ov.classList.add("tell-sil"); }
    });
    at(1500, () => {
      ov.classList.add("lit"); flash(); snd("land");
      /* 光の柱の色＝その10連でいちばん上のレア度（rank のときは金で出て、あとで虹に割れる） */
      const now = info.tl.indexOf("rank") >= 0 ? 2 : info.best;
      ov.classList.remove("t-blue", "t-gold", "t-rainbow"); ov.classList.add(tierClass(now >= 2 ? now : 1));
      if (now === 2) snd("gold");
      if (now === 3) snd("rainbow");
    });
    if (info.tl.indexOf("double") >= 0) at(1650, () => ov.classList.add("tell-double"));
    if (info.tl.indexOf("rank") >= 0) {
      ov.classList.add("tell-rank");
      at(1850, () => { snd("crack"); });
      at(2250, () => { ov.classList.remove("t-gold"); ov.classList.add("t-rainbow"); flash(); snd("rainbow"); });
    }
    at(info.tl.indexOf("rank") >= 0 ? 2350 : 1950, () => {
      const [a, b, ic] = capText(info);
      const cap = ov.querySelector(".xs-cap");
      cap.querySelector("b").textContent = a; cap.querySelector("small").textContent = b; cap.querySelector(".xs-capic").textContent = ic || "";
      cap.classList.add("on");
    });
    S.introEnd = info.tl.indexOf("rank") >= 0 ? 3500 : 3000;
    at(S.introEnd, startCards);
  }

  /* ══ ② 1体ずつ ══ */
  function startCards() {
    if (!S || S.phase === "cards" || S.phase === "sum") return;
    clearT();
    S.phase = "cards";
    const ov = S.ov;
    ov.classList.add("cards");
    const cap = ov.querySelector(".xs-cap"); if (cap) cap.classList.remove("on");
    flash();
    S.i = -1;
    paintDots();
    next();
  }
  function paintDots() {
    const d = S.ov.querySelector(".xs-dots"); if (!d) return;
    d.innerHTML = S.rs.map((r, k) => {
      const t = tierOf(r);
      return `<i class="${k < S.i ? "d" + (t >= 2 ? " d" + t : "") : ""}${k === S.i ? " on" : ""}"></i>`;
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
  function cardHTML(r, t, backT) {
    const c = chr(r.id) || {};
    const e = elOf(r.id);
    const rb = t === 3 ? "UR" : t === 2 ? "SSR" : "SR";
    return `<div class="xs-glow g${t}"></div>
      <div class="xs-card">
        <div class="xs-back ${backT === 3 ? "b3" : backT === 2 ? "b2" : ""}"></div>
        <div class="xs-face r${t}">
          <img src="${esc(c.img || c.th || "")}" alt="" onerror="if(this.dataset.fb)return;this.dataset.fb=1;this.src='${esc(c.th || "")}'">
          <div class="xs-fx"></div><i class="xs-shine"></i>
          ${e ? `<span class="xs-elb" style="--ec:${e.c}">${esc(e.nm)}${r.sure ? " ・ 確定枠" : ""}</span>` : ""}
          ${isNew(r) ? '<span class="xs-new">NEW</span>' : ""}
          <div class="xs-info"><span class="xs-rar r${t}">${rb}</span>
            <b class="xs-nm">${nameSpans(c.nm)}</b><span class="xs-sub">${esc(subOf(r))}${(() => { try { return " ・ " + charNoText(r.id); } catch (er) { return ""; } })()}</span></div>
        </div>
      </div>`;
  }
  function showOne(r, i) {
    const box = S.ov.querySelector(".xs-cards");
    const ur = S.ov.querySelector(".xs-ur");
    ur.classList.remove("on", "go"); ur.innerHTML = "";
    S.busy = true;
    /* アイテム・チケット */
    if (r.type !== "char" && r.type !== "select") {
      const it = itemOf(r);
      box.innerHTML = `<div class="xs-glow g1"></div><div class="xs-item" style="--ic:${it.c}"><b>${esc(it.icon)}</b><span>${esc(it.nm)} ×${r.n || 1}</span></div>`;
      requestAnimationFrame(() => { const el = box.querySelector(".xs-item"); if (el) el.classList.add("in"); });
      snd("item");
      at(350, () => { S.busy = false; });
      at(S.fast ? 450 : 900, next);
      return;
    }
    /* BLACK SELECT（好きなSSRを1体） */
    if (r.type === "select") {
      box.innerHTML = `<div class="xs-glow g2"></div><div class="xs-card"><div class="xs-back blk"></div><div class="xs-face r2"><div class="xs-info"><span class="xs-rar r2">SSR</span><b class="xs-nm">SSR セレクト</b><span class="xs-sub">好きな1体をえらぶ</span></div></div></div>`;
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
    const up = S.up.has(i);
    const backT = up ? Math.max(1, t - 1) : t;
    box.innerHTML = cardHTML(r, t, backT);
    const cd = box.querySelector(".xs-card");
    requestAnimationFrame(() => cd.classList.add("in"));
    snd(t >= 2 ? "orb" : "flip");
    let wait = 520;
    if (up) {
      /* RANK UP：カードがふるえて、ひびが入り、ひとつ上のレア度の光になる */
      at(560, () => { cd.classList.remove("in"); cd.style.transform = "rotateY(180deg)"; cd.style.opacity = "1"; cd.classList.add("shake"); snd("crack"); });
      at(1100, () => {
        const back = cd.querySelector(".xs-back"); if (back) { back.classList.remove("b2", "b3"); back.classList.add(t === 3 ? "b3" : "b2"); }
        const g = box.querySelector(".xs-glow"); if (g) { g.className = "xs-glow g" + t; }
        const rk = document.createElement("div"); rk.className = "xs-rank"; rk.innerHTML = "<b>RANK UP!!</b>"; box.appendChild(rk);
        flash(); snd("rank");
      });
      wait = 1900;
    }
    if (t === 3) {
      /* UR：画面いっぱいの縦長の絵（SS）。無いときは横長の絵／正方形 */
      at(wait, () => urShow(r));
      return;
    }
    at(wait, () => {
      cd.classList.remove("in", "shake"); cd.style.transform = ""; cd.style.opacity = "";
      void cd.offsetWidth; cd.classList.add("flip");
      if (t === 2) { flash(); snd("ssr"); at(380, () => burst(box, "#ffd257", 22)); }
      else snd("sr");
    });
    at(wait + 650, () => { S.busy = false; });
    if (t <= 1) at(wait + (S.fast ? 700 : 1300), next);
    else at(wait + 4200, next);
  }
  function urShow(r) {
    const c = chr(r.id) || {};
    const ur = S.ov.querySelector(".xs-ur");
    const ss = ssOf(r.id) || c.wide || c.img;
    let gnm = ""; try { gnm = typeof gachaNmOfMode === "function" ? gachaNmOfMode(S.gmode) : ""; } catch (e) {}
    const sp = Array.from({ length: 26 }, (_, k) => `<i style="left:${(k * 37) % 100}%;animation-delay:${((k * 0.23) % 3).toFixed(2)}s;animation-duration:${(2.4 + (k % 5) * 0.4).toFixed(1)}s;background:${["#fff", "#ffd257", "#ff8fd0", "#7fe8ff"][k % 4]}"></i>`).join("");
    ur.innerHTML = `<div class="u-bg"></div><div class="u-lines"></div>
      <div class="u-art"><img src="${esc(ss)}" alt="" onerror="if(this.dataset.fb)return;this.dataset.fb=1;this.src='${esc(c.img || "")}'"></div>
      <div class="u-sp">${sp}</div><div class="u-frame"></div>
      <div class="u-emb"><i></i><b>UR</b></div>
      <div class="u-txt"><small>ULTRA RARE${r.sure ? " ・ 確定枠" : ""}</small><b>${esc(c.nm || "")}</b><span>${esc(subOf(r))}${gnm ? " ・ " + esc(gnm) : ""}</span></div>
      <div class="u-flash"></div>`;
    ur.classList.add("on");
    void ur.offsetWidth; ur.classList.add("go");
    snd("ur");
    at(1200, () => { S.busy = false; });
    at(6000, next);
  }

  /* ══ ③ まとめ ══ */
  function toSummary() {
    if (!S || S.phase === "sum") return;
    clearT();
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
    ov.classList.remove("cards");
    const ur = ov.querySelector(".xs-ur"); ur.classList.remove("on", "go"); ur.innerHTML = "";
    const cards = ov.querySelector(".xs-cards"); cards.innerHTML = "";
    const cap = ov.querySelector(".xs-cap"); if (cap) cap.classList.remove("on");
    const tiers = S.rs.map(tierOf);
    const nUR = tiers.filter((t) => t === 3).length, nSSR = tiers.filter((t) => t === 2).length;
    const head = nUR ? "✦✦ UR 獲得！ ✦✦" : nSSR ? "✦ SSR 獲得！ ✦" : S.rs.some((r) => r.type === "char") ? "キャラ獲得！" : "結果";
    const cells = S.rs.map((r, k) => {
      const t = tierOf(r);
      const dl = (0.04 * k).toFixed(2);
      if (r.type !== "char") {
        const it = r.type === "select" ? { icon: "✦", nm: "SSR セレクト" } : itemOf(r);
        return `<div class="xs-cell it" style="animation-delay:${dl}s"><b>${esc(it.icon)}</b><span>${esc(it.nm)}${r.type === "select" ? "" : " ×" + (r.n || 1)}</span></div>`;
      }
      const c = chr(r.id) || {};
      return `<div class="xs-cell r${t}" data-id="${esc(r.id)}" style="animation-delay:${dl}s"><img src="${esc(c.th || c.img || "")}" alt="">
        <span class="c-r">${t === 3 ? "UR" : t === 2 ? "SSR" : "SR"}</span>${isNew(r) ? '<span class="c-new">NEW</span>' : ""}
        <span class="c-n">${esc(c.nm || "")}<small>${esc(subOf(r))}</small></span></div>`;
    }).join("");
    const sm = ov.querySelector(".xs-sum");
    sm.innerHTML = `<h3>${esc(head)}</h3><h4>${esc(String(S.title || "").replace(/<[^>]+>/g, ""))}</h4>
      <div class="xs-grid${S.rs.length === 1 ? " n1" : ""}">${cells}</div>
      <div class="xs-btns"><button class="xs-ok" type="button">OK</button></div>
      <div class="xs-sumtag">キャラを押すと性能が見られます</div>`;
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
    clearT();
    const ov = S && S.ov;
    S = null;
    if (ov) { ov.classList.remove("on"); setTimeout(() => { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 360); }
    try { document.body.style.overflow = ""; } catch (e) {}
    try { const d = document.getElementById("detOv"); if (d) d.style.zIndex = ""; } catch (e) {}
    try { if (typeof window.closeGres === "function") window.closeGres(); } catch (e) {}
  }
  /* タップ：演出の途中なら早送り、カードなら次へ */
  function onTap() {
    if (!S) return;
    AC();
    if (S.phase === "intro") { startCards(); return; }
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
    /* RANK UP（SR→SSR／SSR→UR）は<b>そのガチャのピックアップだけ</b>・確定枠は除く（これまでと同じきまり） */
    const up = new Set();
    let pick = null;
    try { pick = gmode && typeof pickIdsOfMode === "function" ? pickIdsOfMode(gmode) : null; } catch (e) { pick = null; }
    const chance = has("RANKUP_CHANCE") ? G("RANKUP_CHANCE") : 0.2;
    rs.forEach((r, i) => {
      if (r.type !== "char" || tierOf(r) < 2 || r.sure || r.max || r.lux === "allssr") return;
      if (pick && pick.indexOf(r.id) < 0) return;
      if (Math.random() < chance) up.add(i);
    });
    S = { ov, rs, title, gmode, info: chooseTells(rs, gmode), up, i: -1, phase: "intro", busy: false, fast: rs.length >= 10 };
    /* 絵は先に読みこんでおく（召喚陣のあいだに届くように）。UR は縦長の SS 絵も */
    S.pre = [];
    rs.forEach((r) => {
      if (r.type !== "char") return;
      const c = chr(r.id); if (!c) return;
      [c.img, c.th, tierOf(r) === 3 ? ssOf(r.id) : null].forEach((u) => { if (!u) return; const im = new Image(); im.decoding = "async"; im.src = u; S.pre.push(im); });
    });
    const luxAll = rs.length >= 10 && rs.every((r) => r.lux === "allssr");
    if (luxAll && typeof luxAstralIntro === "function") {
      /* ASTRAL BURST（10枠ぜんぶSSR）は、いままでの「真っ黒→特大の演出」のあとにカードへ */
      ov.style.visibility = "hidden";
      luxAstralIntro(() => { if (S && S.ov === ov) { ov.style.visibility = ""; startCards(); } });
      return;
    }
    intro();
  }

  window.XevaSummon = { play, close, VERSION: 1 };
})();
