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
    /* ★★ 2026-09-18 PARTY MATCH の4色 */
    yellow: ["#fff3b0", "#ffd23d", "#8a6a00"],
    green: ["#c4f7df", "#2fd18c", "#0a5e3c"],
    purple: ["#e3d4ff", "#a26bff", "#40157e"],
    orange: ["#ffd9b8", "#ff8a2a", "#7a3300"],
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
    const sideC = e.side === "blue" ? "#7cc4ff" : e.side && B.SIDE_INFO && B.SIDE_INFO[e.side] && e.side !== "red" ? B.SIDE_INFO[e.side].lt : "#ff5a6e";
    switch (e.t) {
      case "hit": {
        const pw = Math.min(1, (e.v || 2) / 7);
        burst(p.X, p.Y, big ? 16 + pw * 22 : 8, "#fff3c4", 120 + pw * 220, 2.6);
        streak(p.X, p.Y, e.nx || 0, -(e.ny || 0), sideC, big ? 10 : 4);
        ring(p.X, p.Y, 4, 30 + pw * 40, "rgba(255,255,255,.9)", 0.35, 3);
        /* ★ 2026-09-18 強い当たりは2重の衝撃波＋画面のフラッシュ */
        if (big && pw > 0.35) { ring(p.X, p.Y, 8, 60 + pw * 70, sideC, 0.55, 5); flash(sideC, 0.18 + pw * 0.2); }
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
      /* ★★ 2026-10-01 アディショナルマッチ：中央の「×」にジャックが置かれた */
      case "addl": ring(p.X, p.Y, 6, 46, "rgba(255,176,0,.95)", 0.8, 4); if (big) ring(p.X, p.Y, 4, 28, "rgba(255,255,255,.9)", 0.5, 2); break;
    }
  }
  /* ══ ★★ 2026-09-18 ショットの演出を少し豪華に（ご指定）══
     どれも<b>見た目だけ</b>（盤面・物理には触らない）。設定の「演出の強さ」が off なら何もしない。 */
  /* 投げた瞬間：足もとの衝撃リング・進む向きの光の筋・強さの文字。技を乗せたときはさらに一段 */
  function launch(x, y, nx, ny, col, power, skill) {
    const L = lv();
    if (L === "off") return;
    const big = L === "full";
    const pw = Math.max(0, Math.min(1, power || 0));
    ring(x, y, 6, 26 + pw * 34, col, 0.42, 4);
    ring(x, y, 4, 16 + pw * 18, "rgba(255,255,255,.9)", 0.3, 2);
    if (big) {
      streak(x, y, nx, ny, col, 6 + Math.round(pw * 10));
      burst(x, y, 8 + Math.round(pw * 14), "#ffffff", 90 + pw * 160, 2);
    }
    if (pw >= 0.85) { popLite("MAX POWER!", col); shake(big ? 4 : 2); flash(col, 0.22); sfx("launch", 1); }
    else if (pw >= 0.6) { popLite("POWER " + Math.round(pw * 100) + "%", col); sfx("launch", 0.6); }
    else sfx("launch", 0.25);
    if (skill && big) { ring(x, y, 10, 80, "rgba(255,200,61,.95)", 0.6, 3); burst(x, y, 18, "#ffc83d", 200, 2.4); }
  }
  /* 転がっている球のうしろの火花（速さに比例して出る数を変える） */
  let sparkAcc = 0;
  function spark(x, y, col, spd) {
    sparkAcc += Math.min(1.2, (spd - 2) / 4);
    while (sparkAcc >= 1) {
      sparkAcc -= 1;
      const a = Math.random() * Math.PI * 2, v = 20 + Math.random() * 40;
      add({ k: "dot", x: x + (Math.random() - 0.5) * 6, y: y + (Math.random() - 0.5) * 6, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
            life: 0, max: 0.25 + Math.random() * 0.25, c: Math.random() < 0.5 ? col : "#ffffff", s: 1.6 + Math.random() * 1.4 });
    }
  }
  /* ジャックにぴったり寄ったとき：PERFECT / GREAT / NICE */
  function nice(x, y, d, col, r) {
    const L = lv();
    if (L === "off") return;
    const cm = Math.round(d * 100);
    const t = d < 0.12 ? "PERFECT!" : d < 0.25 ? "GREAT!" : "NICE!";
    for (let k = 0; k < (d < 0.12 ? 3 : 2); k++) ring(x, y, r, r * (3 + k * 1.6), k ? "rgba(255,255,255,.7)" : col, 0.5 + k * 0.15, 3 - k);
    burst(x, y, d < 0.12 ? 26 : 14, "#ffe14d", 160, 2.4);
    pop(t, cm + "cm", d < 0.12 ? "#ffc83d" : col, d < 0.12);
    if (d < 0.12) { flash("#ffc83d", 0.25); shake(3); }
    sfx("nice", d < 0.12 ? 1 : 0.5);
  }
  /* コートの箱だけを一瞬その色で光らせる */
  function flash(col, a) {
    if (!host || lv() !== "full") return;
    const el = document.createElement("div");
    el.className = "fxflash";
    el.style.setProperty("--pc", col || "#fff");
    el.style.setProperty("--pa", String(a == null ? 0.25 : a));
    host.appendChild(el);
    setTimeout(() => el.remove(), 420);
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
        /* ★★ 2026-10-01 星形の光と「目の帯」（ペルソナ風）を追加 */
        el.innerHTML = '<div class="u-bg"></div><div class="u-star"></div><div class="u-dots"></div><div class="u-slash"></div>'
          + '<div class="u-eyes"><img src="' + esc(im) + '" alt="" onerror="this.onerror=null;this.src=\'' + esc(th) + '\'"></div>'
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

  /* ══════════════════════════════════════════════════════════════
     ★★ 2026-10-01 ペルソナ風の大きな演出（ご指定「演出をより豪華でペルソナ風に」）
     ・赤×黒×白・斜めの帯・白い星形の爆発・網点・切り抜き文字（1文字ずつ箱と向きを変える）
     ・kind：start（VS）／ end（エンド開始）／ addl（ADDITIONAL MATCH）／ win・lose・draw（結果）／ turn（端末をわたして）
     ・タップで飛ばせる。設定の「演出」が OFF なら出さない・SHORT なら短く。盤面の計算にはかかわらない
     ══════════════════════════════════════════════════════════════ */
  let banT = 0, banRes = null;
  function clearBanner() { const o = document.getElementById("mbrBan"); if (o) o.remove(); clearTimeout(banT); if (banRes) { const r = banRes; banRes = null; r(); } }
  /* 切り抜き文字：文字ごとに箱・色・向き・大きさを変える（同じ文字列ならいつも同じ形） */
  function p5(text, big) {
    let h = 0, i = 0;
    /* 単語の途中で折り返さない（単語ごとにまとめる）。いちばん長い単語が画面に入る大きさにする */
    const words = String(text).split(/\s+/).filter(Boolean);
    const longest = Math.max(1, ...words.map((w) => Array.from(w).length));
    const fs = "min(" + (big ? "15vw,120px" : "9.5vw,74px") + "," + (86 / (longest * 0.7)).toFixed(2) + "vw)";
    const html = words.map((w) => '<span class="p5w">' + Array.from(w).map((ch) => {
      h = (h * 31 + ch.charCodeAt(0) + i * 7) >>> 0;
      const k = h % 4, rot = ((h >>> 3) % 15) - 7, sc = 0.88 + ((h >>> 6) % 9) / 22, dy = ((h >>> 9) % 7) - 3;
      const s = '<i class="p5c k' + k + '" style="--r:' + rot + "deg;--s:" + sc.toFixed(2) + ";--y:" + dy + "px;--d:" + (i * 0.035).toFixed(3) + 's">' + esc(ch) + "</i>";
      i++;
      return s;
    }).join("") + "</span>").join("");
    return '<div class="p5t' + (big ? " big" : "") + '" style="--fs:' + fs + '">' + html + "</div>";
  }
  function banner(kind, o) {
    o = o || {};
    return new Promise((res) => {
      const L = lv();
      clearBanner();
      if (L === "off") { res(); return; }
      const el = document.createElement("div");
      el.id = "mbrBan";
      el.className = "b-" + kind + (L === "short" ? " short" : "");
      const col = o.col || { lose: "#3a5bff", addl: "#ffb000", draw: "#b45cff" }[kind] || "#ff1f3d";
      el.style.setProperty("--bc", col);
      /* 背景の中心はテーマ色を暗くした色（青の勝ちなら青い背景） */
      const m = /^#([0-9a-f]{6})$/i.exec(col);
      if (m) { const n = parseInt(m[1], 16); el.style.setProperty("--bd", "rgb(" + [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v * 0.34)).join(",") + ")"); }
      const star = '<div class="b-star"></div><div class="b-star s2"></div>';
      const bg = '<div class="b-bg"></div><div class="b-stripe"></div><div class="b-dots"></div>' + star
        + '<div class="b-shard s1"></div><div class="b-shard s2"></div><div class="b-shard s3"></div><div class="b-shard s4"></div>';
      const port = (c, i, side) => c ? '<div class="pt" style="--i:' + i + '"><img src="' + esc(imgPath(c, true)) + '" alt="" onerror="this.onerror=null;this.src=\'' + esc(imgPath(c, false)) + '\'"><b>' + esc(c.nm) + "</b></div>" : "";
      let body = "";
      if (kind === "start") {
        const R = (o.red || []).slice(0, 3), Bl = (o.blue || []).slice(0, 3);
        body = '<div class="vs-l">' + R.map((c, i) => port(c, i, "red")).join("") + '<div class="tm">' + esc(o.redName || "RED") + "</div></div>"
          + '<div class="vs-r">' + Bl.map((c, i) => port(c, i, "blue")).join("") + '<div class="tm">' + esc(o.blueName || "BLUE") + "</div></div>"
          + '<div class="vs-c">' + p5("VS", true) + '<div class="sub">' + esc(o.sub || "BOCCIA RUSH — MATCH START") + "</div></div>";
      } else if (kind === "turn") {
        body = '<div class="b-mid">' + p5(o.title || "YOUR TURN") + '<div class="sub">' + esc(o.sub || "") + "</div></div>";
      } else {
        const T = kind === "addl" ? "ADDITIONAL MATCH" + (o.n > 1 ? " " + o.n : "") : kind === "end" ? (o.title || "END") : kind === "win" ? (o.title || "VICTORY") : kind === "lose" ? (o.title || "DEFEAT") : kind === "draw" ? "DRAW" : (o.title || "");
        body = (o.char ? '<div class="b-char"><img src="' + esc(imgPath(o.char, true)) + '" alt="" onerror="this.onerror=null;this.src=\'' + esc(imgPath(o.char, false)) + '\'"></div>' : "")
          + '<div class="b-mid">' + (o.kicker ? '<div class="kick">' + esc(o.kicker) + "</div>" : "") + p5(T, kind !== "end") + (o.sub ? '<div class="sub">' + esc(o.sub) + "</div>" : "") + "</div>";
      }
      el.innerHTML = bg + body + '<div class="b-skip">TAP TO SKIP</div>';
      el.addEventListener("click", clearBanner);
      el.addEventListener("touchstart", (ev) => { ev.preventDefault(); clearBanner(); }, { passive: false });
      document.body.appendChild(el);
      banRes = res;
      const ms = { start: 2300, addl: 2400, end: 1100, win: 2200, lose: 1900, draw: 1900, turn: 1150 }[kind] || 1500;
      banT = setTimeout(clearBanner, L === "short" ? Math.round(ms * 0.55) : ms);
      try {
        sfx(kind === "lose" ? "sad" : kind === "win" ? "fanfare" : kind === "turn" || kind === "end" ? "special" : "ban", 1);
        if (kind === "start" || kind === "addl" || kind === "win") vib([20, 40, 30]);
      } catch (e) {}
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
      case "launch": noise(0.08 + p * 0.1, 0.05 + p * 0.1); tone(180 + p * 160, 0.16, "sawtooth", 0.04, 2.2); break;
      case "nice": [784, 988, 1175, 1568].slice(0, p >= 1 ? 4 : 3).forEach((f, i) => setTimeout(() => tone(f, 0.14, "triangle", 0.08), i * 70)); break;
      /* ★★ 2026-10-01 ペルソナ風の演出用（斬る音＋和音／ファンファーレ／負け） */
      case "ban": noise(0.16, 0.12); tone(240, 0.2, "sawtooth", 0.05, 3.2); setTimeout(() => [523, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.16, "square", 0.04), i * 55)), 150); break;
      case "fanfare": [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, i === 3 ? 0.55 : 0.14, "triangle", 0.08), i * 110)); break;
      case "sad": [392, 330, 262].forEach((f, i) => setTimeout(() => tone(f, 0.28, "sine", 0.07), i * 170)); break;
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
      ".fxflash{position:absolute;inset:0;z-index:4;pointer-events:none;background:radial-gradient(circle at 50% 70%,var(--pc),transparent 70%);opacity:0;animation:fxF .42s ease-out both}",
      "@keyframes fxF{0%{opacity:var(--pa)}100%{opacity:0}}",
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
      /* ★★ 2026-10-01 ペルソナ風の大きな演出（banner） */
      "#mbrBan{position:fixed;inset:0;z-index:160;overflow:hidden;cursor:pointer;font-family:'Noto Sans JP',sans-serif;--bc:#ff1f3d}",
      "#mbrBan .b-bg{position:absolute;inset:0;background:radial-gradient(120% 90% at 50% 50%,var(--bd,#5a0010) 0%,#090006 62%,#000 100%);animation:bnF 2.4s ease both}",
      "#mbrBan .b-stripe{position:absolute;inset:-30%;background:repeating-linear-gradient(-24deg,rgba(255,255,255,.07) 0 18px,transparent 18px 46px,rgba(0,0,0,.5) 46px 60px,transparent 60px 92px);animation:bnS 2.4s linear both}",
      "#mbrBan .b-dots{position:absolute;inset:-20%;opacity:.28;background-image:radial-gradient(var(--bc) 1.6px,transparent 2.1px);background-size:13px 13px;transform:rotate(-14deg);animation:bnF 2.4s ease both}",
      "#mbrBan .b-star{position:absolute;left:50%;top:50%;width:150vmax;height:150vmax;margin:-75vmax 0 0 -75vmax;background:#fff;opacity:.95;",
      "  clip-path:polygon(50% 0,53% 44%,72% 6%,56% 46%,92% 18%,58% 48%,100% 44%,58% 51%,96% 70%,56% 53%,78% 96%,53% 56%,50% 100%,47% 56%,24% 95%,44% 53%,4% 72%,42% 51%,0 47%,42% 48%,8% 20%,44% 46%,26% 4%,47% 44%);",
      "  animation:bnStar 2.4s cubic-bezier(.2,.9,.3,1) both}",
      "#mbrBan .b-star.s2{background:var(--bc);transform:scale(.62) rotate(14deg);animation-name:bnStar2;opacity:.98}",
      "#mbrBan .b-shard{position:absolute;height:14vh;left:-30%;right:-30%;transform:skewY(-16deg);animation:bnSh 2.4s cubic-bezier(.2,.9,.3,1) both}",
      "#mbrBan .b-shard.s1{top:6%;background:#000;border-bottom:4px solid #fff}",
      "#mbrBan .b-shard.s2{top:78%;background:var(--bc);height:9vh;animation-delay:.06s}",
      "#mbrBan .b-shard.s3{top:16%;height:3vh;background:#fff;animation-delay:.1s;opacity:.9}",
      "#mbrBan .b-shard.s4{top:70%;height:2.4vh;background:#000;animation-delay:.14s}",
      ".p5t{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:6px .28em;line-height:1;transform:rotate(-6deg);font-size:var(--fs,clamp(30px,9.5vw,74px))}",
      ".p5t .p5w{display:inline-flex;align-items:center;gap:1px;white-space:nowrap}",
      ".p5t .p5c{display:inline-block;font-style:normal;font-family:'Anton','Noto Sans JP',sans-serif;font-weight:900;font-size:1em;padding:.04em .1em;",
      "  transform:translateY(var(--y)) rotate(var(--r)) scale(var(--s));animation:bnL .5s cubic-bezier(.2,1.5,.4,1) both;animation-delay:calc(.12s + var(--d))}",
      ".p5t .k0{background:#000;color:#fff;box-shadow:3px 3px 0 var(--bc,#ff1f3d)}",
      ".p5t .k1{background:#fff;color:#000}",
      ".p5t .k2{background:var(--bc,#ff1f3d);color:#fff;text-shadow:2px 2px 0 #000}",
      ".p5t .k3{background:transparent;color:#fff;-webkit-text-stroke:2px #000;text-shadow:4px 4px 0 var(--bc,#ff1f3d)}",
      "#mbrBan .b-mid{position:absolute;left:4%;right:4%;top:50%;transform:translateY(-55%);text-align:center;z-index:3}",
      "#mbrBan .kick{display:inline-block;font-family:'Anton','Orbitron',sans-serif;font-style:italic;font-size:15px;color:#000;background:#fff;padding:2px 16px;transform:skewX(-14deg) rotate(-6deg);margin-bottom:10px;animation:bnSub .4s .05s both}",
      "#mbrBan .sub{display:inline-block;margin-top:16px;font-weight:900;font-size:clamp(12px,3.6vw,17px);color:#fff;background:#000;padding:6px 18px;transform:skewX(-12deg) rotate(-6deg);",
      "  box-shadow:4px 4px 0 var(--bc);animation:bnSub .6s .45s cubic-bezier(.2,.9,.3,1) both}",
      "#mbrBan .b-char{position:absolute;right:-6%;bottom:0;width:min(58vw,420px);height:62vh;z-index:2;animation:bnCh 2.4s cubic-bezier(.2,.9,.3,1) both;",
      "  clip-path:polygon(18% 0,100% 0,100% 100%,0 100%)}",
      "#mbrBan .b-char img{width:100%;height:100%;object-fit:cover;object-position:50% 14%}",
      "#mbrBan .vs-l,#mbrBan .vs-r{position:absolute;top:0;bottom:0;width:58%;display:flex;flex-direction:column;justify-content:center;gap:6px;z-index:2}",
      "#mbrBan .vs-l{left:0;padding-left:3%;animation:bnVL 2.3s cubic-bezier(.2,.9,.3,1) both}",
      "#mbrBan .vs-r{right:0;align-items:flex-end;padding-right:3%;animation:bnVR 2.3s cubic-bezier(.2,.9,.3,1) both}",
      "#mbrBan .pt{position:relative;width:min(44vw,300px);height:12vh;overflow:hidden;background:#000;transform:skewY(-10deg);clip-path:polygon(4% 0,100% 0,96% 100%,0 100%);",
      "  animation:bnPt .5s cubic-bezier(.2,1.2,.4,1) both;animation-delay:calc(.15s + var(--i) * .08s)}",
      "#mbrBan .vs-l .pt{border-bottom:5px solid #ff1f3d}#mbrBan .vs-r .pt{border-bottom:5px solid #2f8fff}",
      "#mbrBan .pt img{position:absolute;left:0;top:-40%;width:100%;height:auto;min-height:180%;object-fit:cover;object-position:50% 16%;transform:skewY(10deg)}",
      "#mbrBan .pt b{position:absolute;left:8%;bottom:4px;font-size:12px;font-weight:900;color:#fff;background:rgba(0,0,0,.7);padding:1px 8px;transform:skewY(10deg)}",
      "#mbrBan .tm{font-family:'Anton','Noto Sans JP',sans-serif;font-weight:900;font-style:italic;font-size:clamp(20px,6vw,40px);color:#fff;text-shadow:3px 3px 0 #000,-1px -1px 0 #000;margin-top:4px;transform:skewY(-10deg);max-width:90%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
      "#mbrBan .vs-r .pt b{left:auto;right:8%}",
      "#mbrBan .vs-l .tm{color:#ff6a7c}#mbrBan .vs-r .tm{color:#7cc4ff}",
      "#mbrBan .vs-c{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:3;text-align:center;width:max-content}",
      "#mbrBan .b-skip{position:absolute;right:14px;bottom:calc(env(safe-area-inset-bottom,0px) + 12px);font-family:'Anton','Orbitron',sans-serif;font-style:italic;font-size:12px;color:rgba(255,255,255,.7);letter-spacing:.2em;z-index:4}",
      "#mbrBan.b-turn .b-bg,#mbrBan.b-end .b-bg{background:rgba(0,0,0,.55)}",
      "#mbrBan.b-turn .b-star,#mbrBan.b-end .b-star,#mbrBan.b-turn .b-stripe,#mbrBan.b-end .b-stripe,#mbrBan.b-turn .b-dots,#mbrBan.b-end .b-dots{display:none}",
      "#mbrBan.b-turn .b-bg,#mbrBan.b-end .b-bg,#mbrBan.b-turn .b-shard,#mbrBan.b-end .b-shard{animation-duration:1.15s}",
      "#mbrBan.b-lose{--bc:#3a5bff}#mbrBan.b-lose .b-star{background:#c8d4ff}",
      "#mbrBan.b-addl{--bc:#ffb000}#mbrBan.b-draw{--bc:#b45cff}",
      "#mbrBan.short .b-bg,#mbrBan.short .b-stripe,#mbrBan.short .b-dots,#mbrBan.short .b-star,#mbrBan.short .b-shard,#mbrBan.short .vs-l,#mbrBan.short .vs-r,#mbrBan.short .b-char{animation-duration:1.25s}",
      "@keyframes bnF{0%{opacity:0}10%{opacity:1}86%{opacity:1}100%{opacity:0}}",
      "@keyframes bnS{0%{opacity:0;transform:translateX(-12%)}10%{opacity:1}86%{opacity:1}100%{opacity:0;transform:translateX(8%)}}",
      "@keyframes bnStar{0%{transform:scale(0) rotate(-40deg)}16%{transform:scale(1.04) rotate(4deg)}22%{transform:scale(1) rotate(0)}84%{opacity:.95;transform:scale(1.03) rotate(3deg)}100%{opacity:0;transform:scale(1.4) rotate(10deg)}}",
      "@keyframes bnStar2{0%{transform:scale(0) rotate(60deg)}18%{transform:scale(.66) rotate(10deg)}24%{transform:scale(.62) rotate(14deg)}84%{opacity:.98}100%{opacity:0;transform:scale(.9) rotate(30deg)}}",
      "@keyframes bnSh{0%{transform:skewY(-16deg) translateX(-110%)}16%{transform:skewY(-16deg) translateX(0)}86%{opacity:1}100%{opacity:0;transform:skewY(-16deg) translateX(40%)}}",
      "@keyframes bnL{0%{opacity:0;transform:translateY(var(--y)) rotate(calc(var(--r) - 40deg)) scale(2.4)}100%{opacity:1;transform:translateY(var(--y)) rotate(var(--r)) scale(var(--s))}}",
      "@keyframes bnSub{0%{opacity:0;transform:skewX(-12deg) rotate(-6deg) translateX(60%)}100%{opacity:1;transform:skewX(-12deg) rotate(-6deg)}}",
      "@keyframes bnCh{0%{opacity:0;transform:translateX(40%)}20%{opacity:1;transform:none}86%{opacity:1}100%{opacity:0}}",
      "@keyframes bnVL{0%{transform:translateX(-110%)}16%{transform:none}86%{opacity:1;transform:none}100%{opacity:0;transform:translateX(-20%)}}",
      "@keyframes bnVR{0%{transform:translateX(110%)}16%{transform:none}86%{opacity:1;transform:none}100%{opacity:0;transform:translateX(20%)}}",
      "@keyframes bnPt{0%{opacity:0;transform:skewY(-10deg) scaleX(.2)}100%{opacity:1;transform:skewY(-10deg)}}",
      /* ★★ 2026-10-01 ULT のカットインに「目の帯」と星形の光（ペルソナ風） */
      "#mbrCut.k-ult .u-star{position:absolute;left:30%;top:50%;width:120vmax;height:120vmax;margin:-60vmax 0 0 -60vmax;background:var(--tc);opacity:.35;",
      "  clip-path:polygon(50% 0,54% 42%,80% 10%,57% 47%,100% 42%,58% 53%,86% 86%,53% 57%,50% 100%,46% 57%,14% 88%,42% 53%,0 46%,43% 47%,20% 12%,46% 42%);animation:bnStar 1.65s cubic-bezier(.2,.9,.3,1) both}",
      "#mbrCut.k-ult .u-eyes{position:absolute;left:-10%;right:-10%;top:3%;height:12vh;overflow:hidden;transform:skewY(-6deg);border-top:4px solid #fff;border-bottom:4px solid var(--tc);background:#000;",
      "  animation:uEy 1.65s cubic-bezier(.2,.9,.3,1) both}",
      "#mbrCut.k-ult .u-eyes{z-index:2}",
      "#mbrCut.k-ult .u-eyes img{position:absolute;left:0;top:50%;width:100%;height:auto;transform:translateY(-30%) skewY(6deg)}",
      "@keyframes uEy{0%{transform:skewY(-6deg) translateX(100%)}16%{transform:skewY(-6deg)}84%{opacity:1}100%{opacity:0;transform:skewY(-6deg) translateX(-30%)}}",
      "#mbrCut.short .u-star,#mbrCut.short .u-eyes{animation-duration:.85s}",
    ].join("\n");
    document.head.appendChild(st);
  })();

  window.MBRFX = { drawBall, ballThumb, imgOf, imgPath, onEvent, drawParticles, shakeOffset, shake, setHost, pop, popLite, cutIn, clearCut, sfx, vib, speak,
                   launch, spark, nice, flash, banner, clearBanner, p5 };
})();
