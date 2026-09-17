/* ══════════════════════════════════════════════════════════════
   MagiBocciaRush — 演出（v4・2026-09-17 新設）
   ──────────────────────────────────────────────────────────────
   ・専用ボールの絵（チーム色の外周＋キャラのエンブレム＋格ごとの装飾）
   ・コートの上の粒子（衝突の火花・壁の波紋・ジャックの共鳴・衝撃波）
   ・文字の演出（IMPACT! / BANK SHOT / TACTICAL CHAIN ×3 …）
   ・カットイン（登場・特殊ショット・アルティメット）
   ・効果音（WebAudio で合成。素材ファイルは使わない）／せりふの読み上げ

   ★★ 演出の注意（ご指定）
     ・<b>コートとボールを完全に隠さない</b>：特殊ショットは帯だけ、ULT も半透明で、物理は止めない。
     ・<b>スキップ</b>：ULT はタップで飛ばせる。設定の「演出」で FULL / SHORT / OFF。
     ・<b>オンラインで遅れを作らない</b>：演出は見た目だけで、盤面の計算には一切かかわらない。
   ★ 見た目の豪華さは<b>性能と無関係</b>（ボールの格は MBR の grade で、能力には使っていない）。
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const B = window.MBR;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function lv() { try { return (B.load().fxLevel) || "full"; } catch (e) { return "full"; } }
  function lang() { try { return localStorage.getItem("xeva_lang_v1") === "en" ? "en" : "ja"; } catch (e) { return "ja"; } }

  /* ══════════ キャラの絵（キャッシュ）══════════ */
  const IMG = {};
  function imgPath(c, full) {
    const p = full ? (c.img || c.th) : (c.th || c.img);
    if (!p) return "";
    return /^(https?:|\.\.\/|img\/)/.test(p) ? p : "../img/" + p;
  }
  function imgOf(c) {
    if (!c) return null;
    let im = IMG[c.id];
    if (!im) {
      im = new Image();
      im.decoding = "async";
      im.src = imgPath(c);
      IMG[c.id] = im;
    }
    return im.complete && im.naturalWidth ? im : null;
  }

  /* ══════════ 専用ボール ══════════ */
  const SIDE_C = {
    red: ["#ffb3bb", "#ff3b52", "#8a0a1f"],
    blue: ["#bfe3ff", "#2f8fff", "#0a3478"],
    none: ["#ffffff", "#e9ecf2", "#9aa3b5"],
  };
  function drawBall(ctx, X, Y, r, o) {
    o = o || {};
    const t = o.t || 0;
    const cs = o.jack ? SIDE_C.none : (SIDE_C[o.side] || SIDE_C.red);
    ctx.save();
    /* 影 */
    ctx.beginPath(); ctx.ellipse(X + r * 0.12, Y + r * 0.55, r * 0.95, r * 0.42, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,.38)"; ctx.fill();
    /* 格の光（SSR・UR だけ） */
    const skin = o.jack ? "" : (o.skin || "std");
    if (skin === "radiant" || skin === "prism") {
      ctx.shadowColor = skin === "prism" ? "hsl(" + ((t * 90) % 360) + ",100%,65%)" : "#ffc83d";
      ctx.shadowBlur = r * 0.9;
    }
    const g = ctx.createRadialGradient(X - r * 0.35, Y - r * 0.4, r * 0.08, X, Y, r);
    g.addColorStop(0, cs[0]); g.addColorStop(0.55, cs[1]); g.addColorStop(1, cs[2]);
    ctx.beginPath(); ctx.arc(X, Y, r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
    ctx.shadowBlur = 0;
    if (!o.jack && o.char) {
      /* エンブレム（キャラの顔）。★ 転がった距離に合わせて回す */
      const ir = r * 0.66;
      const im = imgOf(o.char);
      ctx.save();
      ctx.beginPath(); ctx.arc(X, Y, ir, 0, Math.PI * 2); ctx.clip();
      ctx.translate(X, Y); ctx.rotate(o.rot || 0);
      if (im) {
        const s = ir * 2.3;
        ctx.drawImage(im, -s / 2, -s * 0.36, s, s);
      } else {
        ctx.fillStyle = B.ELEM_C[o.char.el] || "#888"; ctx.fillRect(-ir, -ir, ir * 2, ir * 2);
        ctx.fillStyle = "#fff"; ctx.font = "900 " + Math.round(ir) + "px 'Noto Sans JP',sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(o.char.nm || "?").slice(0, 1), 0, 2);
      }
      ctx.restore();
      /* 格ごとのふち */
      ctx.lineWidth = Math.max(1.5, r * 0.14);
      if (skin === "std") { ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.beginPath(); ctx.arc(X, Y, ir, 0, Math.PI * 2); ctx.stroke(); }
      else if (skin === "emblem") {
        ctx.strokeStyle = B.ELEM_C[o.char.el] || "#fff";
        ctx.beginPath(); ctx.arc(X, Y, ir, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = "#fff";
        for (let k = 0; k < 6; k++) {
          const a = (o.rot || 0) + k * Math.PI / 3;
          ctx.beginPath(); ctx.arc(X + Math.cos(a) * ir, Y + Math.sin(a) * ir, r * 0.07, 0, Math.PI * 2); ctx.fill();
        }
      } else if (skin === "radiant") {
        const gg = ctx.createLinearGradient(X - r, Y - r, X + r, Y + r);
        gg.addColorStop(0, "#fff6c9"); gg.addColorStop(0.5, "#ffc83d"); gg.addColorStop(1, "#9a6a00");
        ctx.strokeStyle = gg; ctx.beginPath(); ctx.arc(X, Y, ir, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,.6)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(X, Y, r * 0.86, (o.rot || 0), (o.rot || 0) + Math.PI * 1.2); ctx.stroke();
      } else if (skin === "prism") {
        for (let k = 0; k < 6; k++) {
          ctx.strokeStyle = "hsl(" + ((k * 60 + t * 120) % 360) + ",100%,62%)";
          ctx.beginPath(); ctx.arc(X, Y, ir, k * Math.PI / 3 + t, (k + 1) * Math.PI / 3 + t); ctx.stroke();
        }
        const sp = (t * 3) % (Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(X + Math.cos(sp) * r * 0.86, Y + Math.sin(sp) * r * 0.86, r * 0.08, 0, Math.PI * 2); ctx.fill();
      }
    } else if (o.jack) {
      ctx.beginPath(); ctx.arc(X, Y, r * 0.42, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(120,130,160,.7)"; ctx.lineWidth = 1.2; ctx.stroke();
    }
    /* つや */
    ctx.beginPath(); ctx.ellipse(X - r * 0.34, Y - r * 0.42, r * 0.34, r * 0.18, -0.6, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,.45)"; ctx.fill();
    ctx.lineWidth = 1.2; ctx.strokeStyle = "rgba(0,0,0,.45)";
    ctx.beginPath(); ctx.arc(X, Y, r, 0, Math.PI * 2); ctx.stroke();
    /* GUARD の六角形 */
    if (o.guard) {
      ctx.strokeStyle = "rgba(190,160,255," + (0.65 + Math.sin(t * 5) * 0.25) + ")";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let k = 0; k <= 6; k++) {
        const a = k * Math.PI / 3 + Math.PI / 6;
        const px = X + Math.cos(a) * r * 1.3, py = Y + Math.sin(a) * r * 1.3;
        if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    if (o.shock) {
      ctx.strokeStyle = "#ffe14d"; ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let k = 0; k < 3; k++) {
        const a = t * 9 + k * 2.1;
        ctx.moveTo(X + Math.cos(a) * r * 1.1, Y + Math.sin(a) * r * 1.1);
        ctx.lineTo(X + Math.cos(a + 0.3) * r * 1.45, Y + Math.sin(a + 0.3) * r * 1.3);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
  /* 図鑑・編成に置く小さなボールの絵（canvas を1枚返す） */
  function ballThumb(c, skin, side, size) {
    const cv = document.createElement("canvas");
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const s = size || 58;
    cv.width = s * dpr; cv.height = s * dpr;
    const ctx = cv.getContext("2d");
    ctx.scale(dpr, dpr);
    const paint = (tt) => {
      ctx.clearRect(0, 0, s, s);
      drawBall(ctx, s / 2, s / 2 - 2, s * 0.36, { side: side || "red", char: c, skin, rot: tt * 0.6, t: tt });
    };
    paint(0);
    if (!imgOf(c)) { const im = IMG[c.id]; if (im) im.addEventListener("load", () => paint(0), { once: true }); }
    cv._paint = paint;
    return cv;
  }

  /* ══════════ 粒子 ══════════ */
  const P = [];
  const MAXP = 260;
  function add(p) { if (P.length < MAXP) P.push(p); }
  function burst(x, y, n, col, sp, size) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = sp * (0.35 + Math.random());
      add({ k: "dot", x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: 0.35 + Math.random() * 0.35, c: col, s: size || 2.4 });
    }
  }
  function ring(x, y, r0, r1, col, max, w) { add({ k: "ring", x, y, r0, r1, c: col, life: 0, max: max || 0.5, w: w || 3 }); }
  function streak(x, y, nx, ny, col, n) {
    for (let i = 0; i < n; i++) {
      const sp = (Math.random() - 0.5) * 1.3;
      const vx = nx - ny * sp, vy = ny + nx * sp;
      const v = 160 + Math.random() * 260;
      add({ k: "line", x, y, vx: vx * v, vy: vy * v, life: 0, max: 0.22 + Math.random() * 0.18, c: col, s: 2 });
    }
  }
  /* コートの出来事 → 粒子と文字。toS は (x,y)m → {X,Y}px。 */
  function onEvent(e, toS, PXm) {
    const L = lv();
    if (L === "off") return;
    const big = L === "full";
    const p = toS(e.x, e.y);
    const sideC = e.side === "blue" ? "#7cc4ff" : "#ff5a6e";
    switch (e.t) {
      case "hit": {
        const pw = Math.min(1, (e.v || 2) / 7);
        burst(p.X, p.Y, big ? 16 + pw * 22 : 8, "#fff3c4", 120 + pw * 220, 2.6);
        streak(p.X, p.Y, e.nx || 0, -(e.ny || 0), sideC, big ? 10 : 4);
        ring(p.X, p.Y, 4, 30 + pw * 40, "rgba(255,255,255,.9)", 0.35, 3);
        if (pw > 0.45) { pop("IMPACT!", (e.power > 1.05 ? "POWER +" + Math.round((e.power - 1) * 100) + "%" : ""), sideC); shake(big ? 6 * pw : 3); }
        sfx("hit", pw);
        break;
      }
      case "tap": sfx("tap", 0.3); burst(p.X, p.Y, 5, "#fff", 80, 2); break;
      case "wall": {
        ring(p.X, p.Y, 6, 46, "rgba(255,138,42,.95)", 0.45, 4);
        burst(p.X, p.Y, big ? 12 : 5, "#ffb070", 140, 2.2);
        popLite("BANK SHOT", "#ff8a2a");
        sfx("wall", 0.6);
        break;
      }
      case "jack": {
        for (let k = 0; k < (big ? 3 : 1); k++) ring(p.X, p.Y, 4, 38 + k * 22, "rgba(140,210,255," + (0.9 - k * 0.2) + ")", 0.55 + k * 0.15, 2.5);
        burst(p.X, p.Y, big ? 14 : 6, "#bfe6ff", 110, 2);
        pop("JACK RESONANCE", lang() === "en" ? "The jack responds!" : "ジャックボールに反応！", "#7cc4ff");
        sfx("jack", 0.7);
        break;
      }
      case "chain": {
        pop("TACTICAL CHAIN", "×" + e.n, "#ffc83d", true);
        burst(p.X, p.Y, big ? 24 : 10, "#ffc83d", 200, 2.8);
        sfx("chain", e.n);
        break;
      }
      case "guard": ring(p.X, p.Y, 6, 22, "rgba(190,160,255,.9)", 0.5, 3); popLite("GUARD", "#b49bff"); sfx("guard", 0.4); break;
      case "guardbreak": burst(p.X, p.Y, 18, "#b49bff", 180, 2.6); pop("GUARD BREAK", "", "#b49bff"); sfx("hit", 0.8); break;
      case "shock": ring(p.X, p.Y, 4, 26, "rgba(255,225,77,.95)", 0.35, 2); popLite("SHOCK", "#ffe14d"); break;
      case "split": burst(p.X, p.Y, 10, "#e3b8ff", 160, 2); popLite("SPLIT", "#e3b8ff"); break;
      case "nova": {
        ring(p.X, p.Y, 6, 0.7 * PXm, "rgba(255,90,110,.95)", 0.6, 6);
        ring(p.X, p.Y, 6, 0.7 * PXm * 1.3, "rgba(255,255,255,.6)", 0.7, 2);
        burst(p.X, p.Y, big ? 40 : 14, "#ff9aa4", 300, 3);
        shake(big ? 12 : 5);
        sfx("nova", 1);
        break;
      }
      case "dead": burst(p.X, p.Y, 8, "#888", 90, 2); popLite("DEAD BALL", "#aaa"); break;
      case "ultready": sfx("ready", 1); break;
    }
  }
  function drawParticles(ctx, dt) {
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      p.life += dt;
      const k = p.life / p.max;
      if (k >= 1) { P.splice(i, 1); continue; }
      ctx.globalAlpha = 1 - k;
      if (p.k === "dot") {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92;
        ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.s * (1 - k * 0.5), 0, Math.PI * 2); ctx.fill();
      } else if (p.k === "line") {
        const x2 = p.x + p.vx * dt * 3, y2 = p.y + p.vy * dt * 3;
        ctx.strokeStyle = p.c; ctx.lineWidth = p.s; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(x2, y2); ctx.stroke();
        p.x += p.vx * dt; p.y += p.vy * dt;
      } else if (p.k === "ring") {
        const rr = p.r0 + (p.r1 - p.r0) * (1 - (1 - k) * (1 - k));
        ctx.strokeStyle = p.c; ctx.lineWidth = p.w * (1 - k) + 0.5;
        ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, Math.PI * 2); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }
  /* 画面ゆれ（キャンバスの箱だけ） */
  let shakeAmt = 0;
  function shake(n) { if (lv() !== "off") shakeAmt = Math.max(shakeAmt, n); }
  function shakeOffset(dt) {
    if (shakeAmt < 0.3) { shakeAmt = 0; return { x: 0, y: 0 }; }
    const o = { x: (Math.random() - 0.5) * shakeAmt, y: (Math.random() - 0.5) * shakeAmt };
    shakeAmt *= Math.pow(0.02, dt);
    return o;
  }

  /* ══════════ 文字の演出（コートの上）══════════ */
  let host = null;
  function setHost(el) { host = el; }
  let popT = 0;
  function pop(title, sub, col, huge) {
    const L = lv();
    if (L === "off" || !host) return;
    const old = host.querySelector(".fxpop"); if (old) old.remove();
    const el = document.createElement("div");
    el.className = "fxpop" + (huge ? " huge" : "") + (L === "short" ? " short" : "");
    el.style.setProperty("--pc", col || "#ff3b52");
    el.innerHTML = '<div class="t">' + esc(title) + "</div>" + (sub ? '<div class="s">' + esc(sub) + "</div>" : "");
    host.appendChild(el);
    clearTimeout(popT);
    popT = setTimeout(() => el.remove(), L === "short" ? 650 : 1050);
  }
  function popLite(title, col) {
    const L = lv();
    if (L === "off" || !host) return;
    if (host.querySelector(".fxpop")) return;          /* 大きい文字が出ているときは足さない */
    const el = document.createElement("div");
    el.className = "fxlite";
    el.style.setProperty("--pc", col || "#fff");
    el.textContent = title;
    host.appendChild(el);
    setTimeout(() => el.remove(), 700);
  }

  /* ══════════ カットイン ══════════ */
  let cutT = 0, cutResolve = null;
  function clearCut() {
    const o = document.getElementById("mbrCut"); if (o) o.remove();
    clearTimeout(cutT);
    if (cutResolve) { const r = cutResolve; cutResolve = null; r(); }
  }
  /* kind: enter（登場・小さな帯）／ special（帯）／ ult（全画面・タップで飛ばす） */
  function cutIn(c, kind, title, sub, voice) {
    return new Promise((res) => {
      const L = lv();
      clearCut();
      if (!c || L === "off" || (L === "short" && kind === "enter")) { res(); return; }
      const ty = B.TYPES[c.type] || { c: "#ff3b52", ja: "" };
      const el = document.createElement("div");
      el.id = "mbrCut";
      el.className = "k-" + kind + (L === "short" ? " short" : "");
      el.style.setProperty("--tc", ty.c);
      const im = imgPath(c, kind === "ult");
      const th = imgPath(c, false);
      if (kind === "enter") {
        el.innerHTML = '<div class="en-b"><img src="' + esc(th) + '" alt=""><div class="tx">'
          + '<div class="l0">' + esc(sub || "NEXT THROW") + '</div><div class="l1">' + esc(c.nm) + "</div>"
          + '<div class="l2" style="color:' + ty.c + '">' + esc(ty.ja) + "</div></div>"
          + (voice ? '<div class="vo">「' + esc(voice) + "」</div>" : "") + "</div>";
      } else if (kind === "special") {
        el.innerHTML = '<div class="sp-band"></div><div class="sp-img"><img src="' + esc(th) + '" alt=""></div>'
          + '<div class="sp-tx"><div class="e">' + esc(title) + '</div><div class="j">' + esc(sub || "") + "</div></div>";
      } else {
        el.innerHTML = '<div class="u-bg"></div><div class="u-dots"></div><div class="u-slash"></div>'
          + '<div class="u-img"><img src="' + esc(im) + '" alt="" onerror="this.onerror=null;this.src=\'' + esc(th) + '\'"></div>'
          + '<div class="u-tx"><div class="k">ULTIMATE SKILL</div><div class="n">' + esc(title) + "</div>"
          + '<div class="s">' + esc(sub || "") + "</div>" + (voice ? '<div class="v">「' + esc(voice) + "」</div>" : "") + "</div>"
          + '<div class="u-skip">TAP TO SKIP</div>';
        el.addEventListener("click", clearCut);
        el.addEventListener("touchstart", (ev) => { ev.preventDefault(); clearCut(); }, { passive: false });
      }
      document.body.appendChild(el);
      cutResolve = res;
      const ms = kind === "ult" ? (L === "short" ? 850 : 1650) : kind === "special" ? (L === "short" ? 520 : 900) : 1150;
      cutT = setTimeout(clearCut, ms);
    });
  }

  /* ══════════ 効果音（合成）══════════ */
  let AC = null;
  function ac() {
    try { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch (e) { AC = null; }
    return AC;
  }
  function tone(f, dur, type, vol, slide) {
    const a = ac(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type || "sine"; o.frequency.value = f;
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), a.currentTime + dur);
    g.gain.value = vol || 0.12;
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
    o.connect(g); g.connect(a.destination);
    o.start(); o.stop(a.currentTime + dur + 0.02);
  }
  function noise(dur, vol) {
    const a = ac(); if (!a) return;
    const n = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
    const s = a.createBufferSource(), g = a.createGain();
    s.buffer = buf; g.gain.value = vol || 0.2; s.connect(g); g.connect(a.destination); s.start();
  }
  let lastSfx = {};
  function sfx(k, p) {
    let on = true;
    try { on = B.load().sound !== false; } catch (e) {}
    if (!on) return;
    const now = performance.now();
    if (lastSfx[k] && now - lastSfx[k] < 60) return;
    lastSfx[k] = now;
    p = p == null ? 0.5 : p;
    switch (k) {
      case "throw": noise(0.12, 0.08); tone(220, 0.12, "triangle", 0.05, 0.6); break;
      case "hit": noise(0.09, 0.12 + p * 0.25); tone(140 + p * 60, 0.12, "square", 0.05, 0.5); break;
      case "tap": tone(420, 0.05, "triangle", 0.05); break;
      case "wall": tone(300, 0.09, "square", 0.05, 0.7); noise(0.05, 0.08); break;
      case "jack": tone(880, 0.25, "sine", 0.08); setTimeout(() => tone(1320, 0.3, "sine", 0.06), 70); break;
      case "chain": [660, 880, 1100, 1320, 1600].slice(0, Math.min(5, (p || 2) + 1)).forEach((f, i) => setTimeout(() => tone(f, 0.12, "triangle", 0.07), i * 55)); break;
      case "guard": tone(520, 0.18, "sine", 0.06, 1.3); break;
      case "nova": noise(0.35, 0.3); tone(90, 0.4, "sawtooth", 0.08, 0.4); break;
      case "ready": tone(990, 0.1, "square", 0.05); setTimeout(() => tone(1480, 0.18, "square", 0.05), 90); break;
      case "ult": tone(160, 0.6, "sawtooth", 0.07, 2.4); noise(0.4, 0.15); break;
      case "special": tone(520, 0.16, "triangle", 0.07, 1.8); break;
      case "score": [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.16, "triangle", 0.08), i * 90)); break;
      case "ui": tone(700, 0.04, "square", 0.03); break;
    }
  }
  function vib(ms) { try { if (B.load().vib !== false && navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }
  /* ★★ 2026-09-17c ボイス＝VOICEVOX で作った音声（voice/<話者>/…m4a）。
     v は B.voiceClip / B.tutClip の返り値 { tx, src }。force は「▶ を押して聞く」とき（設定が OFF でも鳴らす）。
     ★ iPhone は「一度ユーザー操作の中で play() した Audio」でないと、あとから鳴らせない。
       最初のタップで同じ Audio を無音で1回鳴らしておく。 */
  let VA = null, vTok = 0;
  function vEl() { if (!VA) { VA = new Audio(); VA.preload = "auto"; } return VA; }
  function unlockVoice() {
    document.removeEventListener("pointerdown", unlockVoice, true);
    try {
      const a = vEl();
      if (a.src && !a.paused) return;
      const t = ++vTok;
      a.muted = true; a.src = "voice/3/tut-8.m4a";
      const p = a.play();
      if (p && p.then) p.then(() => { if (t === vTok) a.pause(); a.muted = false; }).catch(() => { a.muted = false; });
      else a.muted = false;
    } catch (e) {}
  }
  document.addEventListener("pointerdown", unlockVoice, true);
  function speak(v, force) {
    try {
      /* ★★ 2026-09-17d キャラのボイスは廃止。鳴らすのはチュートリアル（voice/3/tut-*）だけ */
      if (!v || !v.src || v.src.indexOf("/tut-") < 0) return;
      if (!force && !B.load().voice) return;
      const a = vEl();
      vTok++;
      a.pause(); a.muted = false; a.volume = 0.95;
      a.src = v.src;
      const p = a.play();
      if (p && p.catch) p.catch(() => {});
    } catch (e) {}
  }

  /* ══════════ CSS（このファイルの演出だけ）══════════ */
  (function css() {
    if (document.getElementById("mbrFxCSS")) return;
    const st = document.createElement("style");
    st.id = "mbrFxCSS";
    st.textContent = [
      ".fxpop{position:absolute;left:0;right:0;top:34%;z-index:5;text-align:center;pointer-events:none;animation:fxP 1.05s cubic-bezier(.2,1.3,.4,1) both}",
      ".fxpop.short{animation-duration:.65s}",
      ".fxpop .t{display:inline-block;font-family:'Anton','Orbitron',sans-serif;font-style:italic;font-size:clamp(30px,11vw,58px);line-height:.95;color:#fff;",
      "  transform:skewX(-10deg) rotate(-4deg);text-shadow:4px 4px 0 var(--pc),-2px -2px 0 #000,0 0 26px var(--pc);letter-spacing:.02em}",
      ".fxpop.huge .t{font-size:clamp(34px,12.5vw,66px)}",
      ".fxpop .s{display:inline-block;margin-top:4px;font-family:'Anton','Orbitron',sans-serif;font-style:italic;font-size:clamp(18px,6vw,30px);",
      "  color:#000;background:var(--pc);padding:0 14px;transform:skewX(-10deg)}",
      "@keyframes fxP{0%{opacity:0;transform:scale(2.2)}18%{opacity:1;transform:scale(.94)}28%{transform:scale(1)}78%{opacity:1}100%{opacity:0;transform:translateY(-14px)}}",
      ".fxlite{position:absolute;right:10px;top:46%;z-index:5;pointer-events:none;font-family:'Anton','Orbitron',sans-serif;font-style:italic;font-size:20px;",
      "  color:var(--pc);text-shadow:2px 2px 0 #000;animation:fxL .7s ease both}",
      "@keyframes fxL{0%{opacity:0;transform:translateX(30px)}20%{opacity:1;transform:none}80%{opacity:1}100%{opacity:0}}",
      /* 登場 */
      "#mbrCut{position:fixed;inset:0;z-index:150;pointer-events:none;overflow:hidden;font-family:'Noto Sans JP',sans-serif}",
      "#mbrCut.k-enter .en-b{position:absolute;left:0;top:calc(env(safe-area-inset-top,0px) + 118px);display:flex;align-items:center;gap:9px;",
      "  padding:6px 26px 6px 6px;background:linear-gradient(100deg,#000 60%,var(--tc));clip-path:polygon(0 0,100% 0,calc(100% - 18px) 100%,0 100%);",
      "  animation:enB 1.15s cubic-bezier(.2,.9,.3,1) both;max-width:92vw}",
      "#mbrCut.k-enter img{width:58px;height:58px;object-fit:cover;object-position:50% 14%;clip-path:polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)}",
      "#mbrCut.k-enter .l0{font-family:'Anton','Orbitron',sans-serif;font-style:italic;font-size:11px;color:#ff8190;letter-spacing:.1em;line-height:1}",
      "#mbrCut.k-enter .l1{font-size:17px;font-weight:900;color:#fff;line-height:1.2}",
      "#mbrCut.k-enter .l2{font-family:'Anton','Orbitron',sans-serif;font-style:italic;font-size:11px;line-height:1}",
      "#mbrCut.k-enter .vo{position:absolute;left:72px;top:100%;margin-top:4px;background:#fff;color:#000;font-size:11px;font-weight:900;padding:3px 10px;white-space:nowrap;",
      "  clip-path:polygon(6px 0,100% 0,calc(100% - 6px) 100%,0 100%)}",
      "@keyframes enB{0%{transform:translateX(-105%)}18%{transform:none}82%{transform:none;opacity:1}100%{transform:translateX(-30%);opacity:0}}",
      /* 特殊ショット（帯だけ・コートは見える） */
      "#mbrCut.k-special .sp-band{position:absolute;left:-10%;right:-10%;top:38%;height:21%;transform:skewY(-9deg);",
      "  background:linear-gradient(90deg,rgba(0,0,0,.92),rgba(0,0,0,.82) 60%,var(--tc));border-top:3px solid #fff;border-bottom:3px solid var(--tc);",
      "  animation:spB .9s cubic-bezier(.2,.9,.3,1) both}",
      "#mbrCut.k-special .sp-img{position:absolute;left:4%;top:34%;width:34vw;max-width:170px;aspect-ratio:1;transform:skewY(-9deg);overflow:hidden;",
      "  clip-path:polygon(12% 0,100% 0,88% 100%,0 100%);animation:spI .9s cubic-bezier(.2,.9,.3,1) both}",
      "#mbrCut.k-special .sp-img img{width:100%;height:100%;object-fit:cover;object-position:50% 12%}",
      "#mbrCut.k-special .sp-tx{position:absolute;right:6%;top:42%;text-align:right;transform:skewY(-9deg);animation:spT .9s cubic-bezier(.2,.9,.3,1) both}",
      "#mbrCut.k-special .sp-tx .e{font-family:'Anton','Orbitron',sans-serif;font-style:italic;font-size:clamp(26px,9vw,48px);color:#fff;line-height:1;text-shadow:3px 3px 0 var(--tc)}",
      "#mbrCut.k-special .sp-tx .j{font-size:12px;font-weight:900;color:#fff;letter-spacing:.2em}",
      "#mbrCut.short .sp-band,#mbrCut.short .sp-img,#mbrCut.short .sp-tx{animation-duration:.52s}",
      "@keyframes spB{0%{transform:skewY(-9deg) scaleX(0);transform-origin:left}20%{transform:skewY(-9deg) scaleX(1)}80%{opacity:1}100%{opacity:0}}",
      "@keyframes spI{0%{transform:skewY(-9deg) translateX(-120%)}22%{transform:skewY(-9deg)}80%{opacity:1}100%{opacity:0;transform:skewY(-9deg) translateX(20%)}}",
      "@keyframes spT{0%{transform:skewY(-9deg) translateX(80%);opacity:0}25%{transform:skewY(-9deg);opacity:1}80%{opacity:1}100%{opacity:0}}",
      /* アルティメット（半透明の全画面・タップで飛ばす） */
      "#mbrCut.k-ult{pointer-events:auto;cursor:pointer}",
      "#mbrCut.k-ult .u-bg{position:absolute;inset:0;background:radial-gradient(80% 60% at 30% 50%,rgba(60,0,10,.78),rgba(0,0,0,.9));animation:uBg 1.65s ease both}",
      "#mbrCut.k-ult .u-dots{position:absolute;inset:-20%;opacity:.22;background-image:radial-gradient(var(--tc) 1.4px,transparent 1.8px);background-size:12px 12px;",
      "  transform:rotate(-12deg);animation:uBg 1.65s ease both}",
      "#mbrCut.k-ult .u-slash{position:absolute;left:-20%;right:-20%;top:56%;height:7%;background:var(--tc);transform:skewY(-12deg);animation:uS 1.65s cubic-bezier(.2,.9,.3,1) both}",
      "#mbrCut.k-ult .u-img{position:absolute;left:-4%;top:6%;width:72vw;max-width:420px;height:78%;animation:uI 1.65s cubic-bezier(.2,.9,.3,1) both;",
      "  -webkit-mask-image:linear-gradient(90deg,#000 60%,transparent);mask-image:linear-gradient(90deg,#000 60%,transparent)}",
      "#mbrCut.k-ult .u-img img{width:100%;height:100%;object-fit:cover;object-position:50% 10%}",
      "#mbrCut.k-ult .u-tx{position:absolute;right:5%;left:30%;top:24%;text-align:right;animation:uT 1.65s cubic-bezier(.2,.9,.3,1) both}",
      "#mbrCut.k-ult .u-tx .k{display:inline-block;font-family:'Anton','Orbitron',sans-serif;font-style:italic;font-size:14px;color:#000;background:#fff;padding:1px 12px;transform:skewX(-10deg)}",
      "#mbrCut.k-ult .u-tx .n{font-family:'Anton','Noto Sans JP',sans-serif;font-weight:900;font-style:italic;font-size:clamp(26px,8.5vw,52px);line-height:1.08;color:#fff;margin-top:8px;",
      "  text-shadow:4px 4px 0 var(--tc),0 0 30px var(--tc)}",
      "#mbrCut.k-ult .u-tx .s{font-family:'Anton','Orbitron',sans-serif;font-style:italic;font-size:16px;color:var(--tc);margin-top:6px;letter-spacing:.08em}",
      "#mbrCut.k-ult .u-tx .v{font-size:13px;font-weight:900;color:#fff;margin-top:10px}",
      "#mbrCut.k-ult .u-skip{position:absolute;right:14px;bottom:calc(env(safe-area-inset-bottom,0px) + 14px);font-family:'Anton','Orbitron',sans-serif;font-style:italic;",
      "  font-size:12px;color:rgba(255,255,255,.7);letter-spacing:.2em}",
      "#mbrCut.short .u-bg,#mbrCut.short .u-dots,#mbrCut.short .u-slash,#mbrCut.short .u-img,#mbrCut.short .u-tx{animation-duration:.85s}",
      "@keyframes uBg{0%{opacity:0}12%{opacity:1}84%{opacity:1}100%{opacity:0}}",
      "@keyframes uS{0%{transform:skewY(-12deg) translateX(-110%)}18%{transform:skewY(-12deg)}84%{opacity:1}100%{opacity:0;transform:skewY(-12deg) translateX(40%)}}",
      "@keyframes uI{0%{opacity:0;transform:translateX(-30%) scale(1.15)}20%{opacity:1;transform:none}84%{opacity:1}100%{opacity:0;transform:translateX(6%)}}",
      "@keyframes uT{0%{opacity:0;transform:translateX(40%)}24%{opacity:1;transform:none}84%{opacity:1}100%{opacity:0}}",
    ].join("\n");
    document.head.appendChild(st);
  })();

  window.MBRFX = { drawBall, ballThumb, imgOf, imgPath, onEvent, drawParticles, shakeOffset, shake, setHost, pop, popLite, cutIn, clearCut, sfx, vib, speak };
})();
