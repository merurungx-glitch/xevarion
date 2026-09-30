/* ══════════════════════════════════════════════════════════════════
   XEVARION WORLD CONFERENCE — 手続きテクスチャ（床・壁・木・カーペット・看板・LED 画面の文字）
   画像ファイルを増やさず、canvas で描いて CanvasTexture にする。
   ══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const T = THREE;
  const cache = {};

  function cv(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
  function tex(c, repeat, srgb) {
    const t = new T.CanvasTexture(c);
    if (srgb !== false) t.colorSpace = T.SRGBColorSpace;
    t.anisotropy = 8;
    if (repeat) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
    return t;
  }
  function rnd(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  function noiseFill(g, w, h, amt, seed, alpha) {
    const r = rnd(seed), id = g.getImageData(0, 0, w, h), d = id.data;
    for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * amt; d[i] += n; d[i + 1] += n; d[i + 2] += n; if (alpha) d[i + 3] = 255; }
    g.putImageData(id, 0, 0);
  }

  /* 磨いた石の床（大判タイル・うっすら大理石の筋） */
  function stone(base, line, key, seed) {
    const k = "stone" + key; if (cache[k]) return cache[k];
    const c = cv(512, 512), g = c.getContext("2d");
    g.fillStyle = base; g.fillRect(0, 0, 512, 512);
    const r = rnd(seed || 3);
    for (let i = 0; i < 26; i++) {                     /* 大理石の筋 */
      g.strokeStyle = "rgba(255,255,255," + (0.03 + r() * 0.05) + ")"; g.lineWidth = 1 + r() * 3;
      g.beginPath(); let x = r() * 512, y = r() * 512; g.moveTo(x, y);
      for (let j = 0; j < 8; j++) { x += (r() - 0.5) * 140; y += (r() - 0.3) * 90; g.lineTo(x, y); }
      g.stroke();
    }
    noiseFill(g, 512, 512, 10, seed || 3);
    g.strokeStyle = line; g.lineWidth = 3; g.strokeRect(0, 0, 512, 512);     /* 目地 */
    return (cache[k] = c);
  }
  function stoneTex(base, line, rep, key) { return tex(stone(base, line, key), rep); }

  /* 木の床・壁パネル */
  function wood(c1, c2, key) {
    const k = "wood" + key; if (cache[k]) return cache[k];
    const c = cv(512, 512), g = c.getContext("2d"), r = rnd(7);
    for (let y = 0; y < 512; y += 64) {
      const off = r() * 400;
      for (let x = -off; x < 512; x += 400) {
        const t = r(); g.fillStyle = t < 0.5 ? c1 : c2; g.fillRect(x, y, 398, 62);
        for (let i = 0; i < 18; i++) { g.strokeStyle = "rgba(60,30,10," + (0.04 + r() * 0.06) + ")"; g.beginPath(); const yy = y + r() * 62; g.moveTo(x, yy); g.bezierCurveTo(x + 120, yy + (r() - 0.5) * 8, x + 260, yy + (r() - 0.5) * 8, x + 398, yy); g.stroke(); }
      }
      g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(0, y + 62, 512, 2);
    }
    noiseFill(g, 512, 512, 8, 9);
    return (cache[k] = c);
  }
  function woodTex(c1, c2, rep, key) { return tex(wood(c1, c2, key), rep); }

  /* カーペット（講演ホール）：模様入り */
  function carpetTex(base, pat, rep, key) {
    const k = "carpet" + key;
    let c = cache[k];
    if (!c) {
      c = cv(256, 256); const g = c.getContext("2d");
      g.fillStyle = base; g.fillRect(0, 0, 256, 256);
      g.strokeStyle = pat; g.lineWidth = 2; g.globalAlpha = 0.5;
      for (let i = -256; i < 512; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 256, 256); g.stroke(); g.beginPath(); g.moveTo(i + 256, 0); g.lineTo(i, 256); g.stroke(); }
      g.globalAlpha = 1; noiseFill(g, 256, 256, 26, 11);
      cache[k] = c;
    }
    return tex(c, rep);
  }

  /* コンクリート・白い壁 */
  function plasterTex(base, rep, key, amt) {
    const k = "plaster" + key;
    let c = cache[k];
    if (!c) { c = cv(256, 256); const g = c.getContext("2d"); g.fillStyle = base; g.fillRect(0, 0, 256, 256); noiseFill(g, 256, 256, amt || 12, 13); cache[k] = c; }
    return tex(c, rep);
  }

  /* 外の舗装（石畳） */
  function paverTex(rep, warm) {
    const k = warm ? "paverW" : "paver";
    let c = cache[k];
    if (!c) {
      c = cv(512, 512); const g = c.getContext("2d"), r = rnd(21);
      g.fillStyle = warm ? "#9a7a62" : "#5f5b57"; g.fillRect(0, 0, 512, 512);
      for (let y = 0; y < 512; y += 64) for (let x = (y / 64) % 2 ? -64 : 0; x < 512; x += 128) {
        if (warm) { const t = r(), R = 200 + t * 30, G = 160 + t * 26 + (r() < 0.2 ? -20 : 0), B = 120 + t * 20; g.fillStyle = "rgb(" + R + "," + G + "," + B + ")"; }   /* 暖かいレンガ色（明るすぎない） */
        else { const v = 104 + r() * 34; g.fillStyle = "rgb(" + (v + 10) + "," + (v + 5) + "," + v + ")"; }
        g.fillRect(x + 2, y + 2, 124, 60);
      }
      noiseFill(g, 512, 512, 16, 22); cache[k] = c;
    }
    return tex(c, rep);
  }
  function grassTex(rep) {
    let c = cache.grass;
    if (!c) {
      c = cv(256, 256); const g = c.getContext("2d"), r = rnd(31);
      g.fillStyle = "#4f8a3a"; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 2600; i++) { g.fillStyle = "rgba(" + (60 + r() * 60) + "," + (120 + r() * 70) + "," + (40 + r() * 30) + ",.6)"; g.fillRect(r() * 256, r() * 256, 1.5, 3 + r() * 3); }
      cache.grass = c;
    }
    return tex(c, rep);
  }

  /* ★ 2026-09-28b テーマパーク用：鮮やかな芝・サッカーのしま芝・アスファルト・ボッチャのコート */
  function lawnTex(rep, key, c1, c2) {
    const k = "lawn" + key; let c = cache[k];
    if (!c) {
      c = cv(256, 256); const g = c.getContext("2d"), r = rnd(41);
      g.fillStyle = c1 || "#5fb83e"; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 3200; i++) { g.fillStyle = "rgba(" + (70 + r() * 70) + "," + (150 + r() * 80) + "," + (40 + r() * 40) + ",.55)"; g.fillRect(r() * 256, r() * 256, 1.5, 3 + r() * 3); }
      for (let i = 0; i < 40; i++) { g.fillStyle = c2 || "rgba(255,240,120,.9)"; g.beginPath(); g.arc(r() * 256, r() * 256, 1.4, 0, 7); g.fill(); }   /* 小さな花 */
      cache[k] = c;
    }
    return tex(c, rep);
  }
  function turfTex(stripes) {
    const c = cv(512, 512), g = c.getContext("2d"), r = rnd(51);
    for (let i = 0; i < stripes; i++) { g.fillStyle = i % 2 ? "#3f9e3a" : "#4fb446"; g.fillRect(i * 512 / stripes, 0, 512 / stripes + 1, 512); }
    for (let i = 0; i < 4000; i++) { g.fillStyle = "rgba(20,60,20," + (r() * 0.12) + ")"; g.fillRect(r() * 512, r() * 512, 1, 2); }
    return tex(c);
  }
  function asphaltTex(rep) {
    let c = cache.asphalt;
    if (!c) { c = cv(256, 256); const g = c.getContext("2d"); g.fillStyle = "#4a4d55"; g.fillRect(0, 0, 256, 256); noiseFill(g, 256, 256, 30, 61); cache.asphalt = c; }
    return tex(c, rep);
  }

  /* ── 文字の看板（ネオン風・パネル風） ── */
  function signTex(text, opt) {
    opt = opt || {};
    const w = opt.w || 1024, h = opt.h || 256, c = cv(w, h), g = c.getContext("2d");
    if (opt.bg) { g.fillStyle = opt.bg; g.fillRect(0, 0, w, h); }
    if (opt.grad) { const gr = g.createLinearGradient(0, 0, w, h); opt.grad.forEach((s, i) => gr.addColorStop(i / (opt.grad.length - 1), s)); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
    g.textAlign = opt.align || "center"; g.textBaseline = "middle";
    const lines = String(text).split("\n");
    const fs = opt.size || Math.min(h * 0.62 / lines.length, w * 0.9 / Math.max(...lines.map((l) => l.length)) * 1.7);
    g.font = (opt.weight || 900) + " " + fs + "px " + (opt.font || "'M PLUS Rounded 1c','Hiragino Sans','Yu Gothic',sans-serif");
    if (opt.glow) { g.shadowColor = opt.glow; g.shadowBlur = fs * 0.35; }
    g.fillStyle = opt.color || "#fff";
    lines.forEach((l, i) => g.fillText(l, opt.align === "left" ? w * 0.05 : w / 2, h / 2 + (i - (lines.length - 1) / 2) * fs * 1.15));
    if (opt.glow) { g.shadowBlur = 0; g.fillText(lines[0] && "", 0, 0); }
    return tex(c);
  }

  /* 文字を行に折り返す（日本語は1文字ずつ） */
  function wrap(g, text, maxW) {
    const out = []; String(text || "").split("\n").forEach((para) => {
      let line = "";
      for (const ch of para) { if (g.measureText(line + ch).width > maxW && line) { out.push(line); line = ch; } else line += ch; }
      out.push(line);
    });
    return out;
  }

  /* ── LED 大画面（スライド）。draw(g, w, h, t) を呼んで CanvasTexture を更新する ── */
  function Screen(w, h) {
    this.c = cv(w, h); this.g = this.c.getContext("2d"); this.w = w; this.h = h;
    this.tex = tex(this.c); this.tex.anisotropy = 4;
    this.imgs = {};
  }
  Screen.prototype.img = function (src) {
    if (!src) return null;
    let im = this.imgs[src];
    if (!im) { im = new Image(); im.crossOrigin = "anonymous"; im.onload = () => { im.ok = true; }; im.src = src; this.imgs[src] = im; }
    return im.ok ? im : null;
  };
  Screen.prototype.flush = function () { this.tex.needsUpdate = true; };

  /* 共通の画像の読み込み（テクスチャ） */
  const loader = new T.TextureLoader();
  const imgTexCache = {};
  function imgTex(src, cb) {
    if (imgTexCache[src]) { if (cb) cb(imgTexCache[src]); return imgTexCache[src]; }
    const t = loader.load(src, (tt) => { if (cb) cb(tt); });
    t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8;
    imgTexCache[src] = t; return t;
  }

  /* トゥーン用の段階グラデーション（アニメ塗り） */
  let toonGrad = null;
  function toonGradient() {
    if (toonGrad) return toonGrad;
    const d = new Uint8Array([150, 150, 158, 255, 206, 206, 210, 255, 246, 246, 246, 255, 255, 255, 255, 255]);   /* 影もあまり暗くしない（アニメ塗り） */
    toonGrad = new T.DataTexture(d, 4, 1, T.RGBAFormat);
    toonGrad.minFilter = toonGrad.magFilter = T.NearestFilter; toonGrad.needsUpdate = true;
    return toonGrad;
  }

  window.XTex = { cv, tex, rnd, stoneTex, woodTex, carpetTex, plasterTex, paverTex, grassTex, lawnTex, turfTex, asphaltTex, signTex, wrap, Screen, imgTex, toonGradient };
})();
