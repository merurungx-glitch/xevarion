/* ============================================================
   MagiAbyss — ma-stages.js
   ★★ 2026-10-05 クエスト選択を「冒険の地図」の画面にした（ご指定：以前に添付した クエスト選択画面案）
   ・島の地図（ドット絵をコードで描く）の上に、迷宮の丸いボタン・名前の札・点線の道・ボス。
   ・ボタンを押すと右から詳細が出る：ノーマル／ハード・推奨レベル・敵の属性と相性・ボス・
     クリア時間のミッション（ジェム）・素材・特殊ルール → 「出発準備へ」。
   ・ハードは、その迷宮をノーマルで1回クリアすると選べる。
   ============================================================ */
(function () {
  "use strict";
  const MA = (window.MA = window.MA || {});
  const D = () => MA.D;
  const S = () => MA.Save.S;
  const TAU = Math.PI * 2;
  const MW = 480, MH = 270;
  const esc = (s) => MA.UI.esc(s);
  const ic = (n, c, cls) => MA.Art.iconHTML(n, c, cls);
  const fmt = (n) => MA.UI.fmt(n);
  const fmtT = (s) => MA.UI.fmtT(s);
  const $ = (s, r) => (r || document).querySelector(s);

  /* 地図の上の位置（480×270 の中）。道は迷宮の順（解放の順） */
  const POS = { town: [70, 205], d1: [96, 148], d2: [122, 70], d3: [226, 74], d4: [250, 158], d5: [346, 204], d6: [408, 76] };
  const ROUTE = ["town", "d1", "d2", "d3", "d4", "d5", "d6"];
  const BIOME_AT = { town: "town", d1: "forest", d2: "ice", d3: "lava", d4: "library", d5: "abyss", d6: "sky" };

  /* ══ ノイズ（いつも同じ地図になる）══ */
  function hash(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function vnoise(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; const s = (t) => t * t * (3 - 2 * t); const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1); const u = s(xf), v = s(yf); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
  function fbm(x, y) { return vnoise(x, y) * 0.55 + vnoise(x * 2.1, y * 2.1) * 0.3 + vnoise(x * 4.3, y * 4.3) * 0.15; }

  /* ══ 地図を描く（一度だけ）══ */
  let mapCanvas = null;
  function paint() {
    if (mapCanvas) return mapCanvas;
    const c = MA.Pix.mkCanvas(MW, MH), g = c.getContext("2d");
    g.imageSmoothingEnabled = false;
    const img = g.createImageData(MW, MH), d = img.data;
    const hex = MA.Pix.hex;
    /* 地形の色（明るい・ふつう・暗い）。ピクセルごとにノイズで陰をつける */
    const PAL = {
      town: ["#8cc45c", "#76b04a", "#5e9638"], forest: ["#4f9a40", "#3b7f30", "#285e22"], ice: ["#ffffff", "#dceef8", "#b4d2e8"],
      lava: ["#8a4a34", "#6a3424", "#4a2016"], library: ["#ecd49a", "#d6b878", "#b8985a"], abyss: ["#6a4290", "#4a2a6a", "#2e1846"],
    };
    const PH = {}; Object.keys(PAL).forEach((k) => { PH[k] = PAL[k].map(hex); });
    const SEA = [hex("#3a86b8"), hex("#2a72a4"), hex("#1f5f8a"), hex("#174a72")];
    const SAND = [hex("#f2dca8"), hex("#e2c88c")];
    const KEYS = ["town", "d1", "d2", "d3", "d4", "d5"];
    const centers = KEYS.map((k) => [k, POS[k][0], POS[k][1]]);
    const bio = new Uint8Array(MW * MH);                     // 0 海・1 砂浜・2〜 地域
    const landAt = (x, y) => { const ex = (x - 205) / 192, ey = (y - 140) / 120; let land = 1 - (ex * ex + ey * ey) + (fbm(x / 30, y / 30) - 0.5) * 0.95 + (vnoise(x / 7, y / 7) - 0.5) * 0.06; land -= Math.max(0, (x - 330) / 140) * Math.max(0, (120 - y) / 90) * 1.4; return land; };
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      const i = (y * MW + x) * 4, j = y * MW + x;
      const land = landAt(x, y);
      let col;
      if (land < 0) {
        /* 海：岸に近いほど明るい・波の線 */
        const k = land > -0.08 ? 0 : land > -0.22 ? 1 : land > -0.45 ? 2 : 3;
        col = SEA[k];
        const w = Math.sin(x * 0.18 + Math.sin(y * 0.31) * 2 + y * 0.05);
        if (k >= 1 && w > 0.96 && (y % 7) < 1) col = hex("#9ad4f0");
        if (k === 0 && ((x + y) % 3 === 0)) col = hex("#c8ecff");
        bio[j] = 0;
      } else if (land < 0.055) { col = SAND[(x + y) % 2]; bio[j] = 1; }
      else {
        let best = 0, bd = 1e9;
        const jit = (fbm(x / 16 + 3, y / 16 + 7) - 0.5) * 78 + (vnoise(x / 5, y / 5) - 0.5) * 12;
        centers.forEach(([k, cx, cy], ci) => { const dd = Math.hypot(x - cx, (y - cy) * 1.12) + jit * (ci % 2 ? 1 : -1); if (dd < bd) { bd = dd; best = ci; } });
        const P = PH[BIOME_AT[KEYS[best]]] || PH.town;
        const sh = fbm(x / 11 + best * 5, y / 11) + (vnoise(x / 3, y / 3) - 0.5) * 0.25;
        const lvl = sh > 0.62 ? 0 : sh > 0.4 ? 1 : 2;
        /* 2つの段のあいだは市松でまぜる（ドットらしい陰） */
        const edge = Math.abs(sh - 0.62) < 0.03 || Math.abs(sh - 0.4) < 0.03;
        col = P[edge && (x + y) % 2 ? Math.min(2, lvl + 1) : lvl];
        bio[j] = 2 + best;
      }
      d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
    }
    /* 地域の境目と海岸に濃い線 */
    for (let y = 1; y < MH - 1; y++) for (let x = 1; x < MW - 1; x++) {
      const j = y * MW + x, b = bio[j];
      if (b === 0) { if (bio[j - MW] >= 1 || bio[j - 1] >= 1) { const i = j * 4; d[i] = 30; d[i + 1] = 70; d[i + 2] = 100; } continue; }
      if (b >= 2 && bio[j + MW] >= 2 && bio[j + MW] !== b && (x % 2)) { const i = j * 4; d[i] = Math.round(d[i] * 0.72); d[i + 1] = Math.round(d[i + 1] * 0.72); d[i + 2] = Math.round(d[i + 2] * 0.72); }
    }
    g.putImageData(img, 0, 0);
    const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), w, h); };
    const tri = (x, y, w, h, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(Math.round(x), Math.round(y - h)); g.lineTo(Math.round(x + w / 2), Math.round(y)); g.lineTo(Math.round(x - w / 2), Math.round(y)); g.closePath(); g.fill(); };
    const circ = (x, y, r, col) => { g.fillStyle = col; g.beginPath(); g.arc(Math.round(x), Math.round(y), r, 0, TAU); g.fill(); };
    const ell = (x, y, rx, ry, col) => { g.fillStyle = col; g.beginPath(); g.ellipse(Math.round(x), Math.round(y), rx, ry, 0, 0, TAU); g.fill(); };
    const rnd = (() => { let s = 99; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();
    const bioAt = (x, y) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= MW || y >= MH) return 0; return bio[y * MW + x]; };
    const isRegion = (x, y, k) => bioAt(x, y) === 2 + KEYS.indexOf(k) && bioAt(x, y + 4) >= 2 && bioAt(x - 3, y) >= 2 && bioAt(x + 3, y) >= 2;
    const nearNode = (x, y, r) => Object.keys(POS).some((k) => Math.hypot(x - POS[k][0], y - POS[k][1]) < r);
    /* ── 川（氷の山から南の海へ）── */
    const river = [[132, 96], [150, 112], [158, 132], [176, 150], [194, 166], [205, 186], [208, 208], [222, 232], [236, 262]];
    [[4, "#2a72a4"], [3, "#4aa8e0"], [1, "#9ad8f8"]].forEach(([w, col]) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); river.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); });
    /* ── 町のまわりの畑（パッチワーク）── */
    [[38, 214, 16, 10, "#c8b050"], [56, 230, 18, 9, "#9ac050"], [86, 226, 14, 10, "#d8c060"], [40, 196, 12, 9, "#a8c858"]].forEach(([x, y, w, h, col]) => { R(x, y, w, h, col); for (let i = 1; i < h; i += 2) R(x, y + i, w, 1, MA.Pix.shade(col, 0.82)); R(x - 1, y - 1, w + 2, 1, "#6a8a3a"); });
    /* ── 木（森は一面に・町のまわりにも少し）── */
    const tree = (x, y, dark, mid, light) => { ell(x, y + 3, 3, 1, "rgba(0,0,0,.25)"); tri(x, y + 2, 8, 10, dark); tri(x, y, 6, 8, mid); R(x - 1, y - 6, 1, 3, light); R(x - 0.5, y + 2, 1, 2, "#5a3a20"); };
    const round = (x, y, dark, mid, light) => { ell(x, y + 3, 3, 1, "rgba(0,0,0,.25)"); circ(x, y - 1, 4, dark); circ(x - 1, y - 2, 3, mid); R(x - 2, y - 4, 2, 1, light); };
    for (let i = 0; i < 1400; i++) {
      const x = rnd() * MW, y = rnd() * MH;
      if (nearNode(x, y, 14)) continue;
      if (isRegion(x, y, "d1")) { if (rnd() < 0.8) tree(x, y, "#1f4a1a", "#2f6a28", "#6ab048"); else round(x, y, "#2a5a24", "#3f8a34", "#7ac058"); }
      else if (isRegion(x, y, "town") && rnd() < 0.12) round(x, y, "#3a6a2a", "#5a9a3a", "#9ad868");
      else if (isRegion(x, y, "d2") && rnd() < 0.18) tree(x, y, "#2a4a5a", "#4a7a8a", "#ffffff");
    }
    /* ── 雪の山（氷）── */
    [[96, 74, 28, 32], [124, 62, 32, 38], [150, 80, 24, 26], [82, 96, 22, 22], [168, 58, 20, 24], [64, 66, 20, 18], [140, 44, 22, 22]].forEach(([x, y, w, h]) => { tri(x + 2, y + 1, w, h, "rgba(20,40,70,.35)"); tri(x, y, w, h, "#7a8aa8"); tri(x + 3, y, w - 8, h - 5, "#9aaac8"); tri(x, y - h + 11, w * 0.44, 11, "#ffffff"); R(x - 1, y - h + 6, 2, 3, "#e0f0ff"); });
    for (let i = 0; i < 40; i++) { const x = rnd() * MW, y = rnd() * MH; if (isRegion(x, y, "d2") && !nearNode(x, y, 12)) { R(x, y, 3, 2, "#a8c8e0"); R(x, y - 1, 2, 1, "#ffffff"); } }
    /* ── 火山・熔岩の川・とがった岩（熔岩）── */
    tri(228, 96, 70, 50, "#3a1a10"); tri(230, 96, 56, 44, "#5a2a1a"); tri(236, 96, 24, 40, "#6a3424"); R(220, 46, 16, 4, "#ff6a2a"); circ(228, 48, 6, "#ffb03a"); circ(228, 47, 3, "#fff0a0");
    [[224, 52, 212, 70, 236, 82, 214, 104], [232, 52, 246, 74, 240, 86, 264, 106], [228, 54, 226, 76, 222, 90, 230, 118]].forEach(([x0, y0, x1, y1, x2, y2, x3, y3]) => { [[3, "#c83a1a"], [2, "#ff7a2a"], [1, "#ffe06a"]].forEach(([w, col]) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.bezierCurveTo(x1, y1, x2, y2, x3, y3); g.stroke(); }); });
    for (let i = 0; i < 260; i++) { const x = rnd() * MW, y = rnd() * MH; if (!isRegion(x, y, "d3") || nearNode(x, y, 12)) continue; const k = rnd(); if (k < 0.55) { tri(x, y, 5, 9, "#2a1208"); tri(x + 1, y, 3, 7, "#4a2414"); } else if (k < 0.8) { ell(x, y, 4, 2, "#ff6a2a"); ell(x, y, 2, 1, "#ffd04a"); } else { R(x, y, 4, 1, "#ff8a3a"); R(x + 2, y + 1, 3, 1, "#c83a1a"); } }
    /* 煙 */
    for (let i = 0; i < 6; i++) circ(232 + i * 3, 40 - i * 5, 3 + i, "rgba(90,80,90," + (0.5 - i * 0.07) + ")");
    /* ── 書庫の遺跡（砂）：柱・ピラミッド・砂丘・岩 ── */
    tri(276, 132, 34, 22, "#c8a868"); tri(279, 132, 26, 18, "#e2c488"); for (let i = 0; i < 4; i++) R(266 + i * 5, 128 - i * 4, 22 - i * 10 > 0 ? 22 - i * 10 : 2, 1, "#a8884a");
    [[232, 156], [240, 152], [252, 156], [260, 152], [244, 172], [258, 174], [222, 168]].forEach(([x, y], i) => { R(x + 1, y - 11, 4, 12, "rgba(0,0,0,.2)"); R(x, y - 12, 4, 12, "#f2ece0"); R(x - 1, y - 13, 6, 2, "#d8d0c0"); R(x, y - 3, 4, 3, "#b8b0a0"); if (i % 3 === 1) R(x - 2, y - 6, 8, 2, "#c8c0b0"); });
    R(238, 138, 26, 4, "#e8e0d0"); R(240, 132, 22, 6, "#d8d0c0"); tri(251, 132, 28, 9, "#c8c0b0");
    for (let i = 0; i < 160; i++) { const x = rnd() * MW, y = rnd() * MH; if (!isRegion(x, y, "d4") || nearNode(x, y, 14)) continue; const k = rnd(); if (k < 0.5) { g.strokeStyle = "#f8e8b8"; g.lineWidth = 1; g.beginPath(); g.arc(x, y + 4, 5, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); } else if (k < 0.75) { ell(x, y, 3, 2, "#a88858"); R(x - 1, y - 2, 2, 1, "#c8a878"); } else { R(x, y - 5, 2, 6, "#5a9a3a"); R(x - 2, y - 3, 2, 1, "#5a9a3a"); R(x + 2, y - 4, 2, 1, "#5a9a3a"); } }
    /* ── 深淵の裂け目・紫の水晶・枯れ木（深淵）── */
    for (let k = 0; k < 7; k++) { g.strokeStyle = ["#0a0414", "#1a0a2a", "#2a1040", "#5a2a8a", "#8a4ad0", "#2a1040", "#c27bff"][k]; g.lineWidth = 2; g.beginPath(); g.ellipse(346, 216, 30 - k * 4, 13 - k * 1.8, -0.2, 0, TAU); g.stroke(); }
    ell(346, 216, 4, 2, "#05030a");
    for (let i = 0; i < 180; i++) { const x = rnd() * MW, y = rnd() * MH; if (!isRegion(x, y, "d5") || nearNode(x, y, 16)) continue; const k = rnd(); if (k < 0.4) { tri(x, y, 5, 10, "#6a3ab0"); tri(x + 1, y, 2, 8, "#d0a8ff"); } else if (k < 0.7) { g.strokeStyle = "#b06aff"; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 4, y + 2); g.lineTo(x + 7, y + 1); g.stroke(); } else { R(x, y - 6, 1, 7, "#2a1a20"); R(x - 2, y - 5, 2, 1, "#2a1a20"); R(x + 1, y - 4, 2, 1, "#2a1a20"); } }
    /* ── 町（拠点）：家と石碑 ── */
    [[60, 210], [72, 214], [84, 208], [66, 222], [80, 224], [92, 216]].forEach(([x, y]) => { R(x - 4, y - 4, 9, 6, "#efe0c0"); tri(x + 0.5, y - 4, 12, 6, "#4a6aa8"); R(x - 1, y - 2, 2, 4, "#6a4428"); R(x + 2, y - 2, 2, 2, "#ffe8a0"); });
    R(69, 194, 3, 9, "#6a8ad0"); R(73, 192, 3, 11, "#4a6ab0"); circ(71, 194, 2, "#bfe8ff");
    /* ── 海：船・岩 ── */
    const ship = (x, y) => { g.fillStyle = "#6a4428"; g.beginPath(); g.moveTo(x - 7, y); g.lineTo(x + 7, y); g.lineTo(x + 5, y + 3); g.lineTo(x - 5, y + 3); g.closePath(); g.fill(); R(x, y - 10, 1, 10, "#4a2a18"); g.fillStyle = "#f2ece0"; g.beginPath(); g.moveTo(x + 1, y - 9); g.lineTo(x + 7, y - 3); g.lineTo(x + 1, y - 2); g.closePath(); g.fill(); R(x - 9, y + 3, 18, 1, "rgba(255,255,255,.5)"); };
    ship(300, 254); ship(30, 120); ship(440, 200);
    [[18, 60], [456, 248], [300, 22]].forEach(([x, y]) => { ell(x, y, 5, 3, "#5a5a6a"); ell(x - 1, y - 1, 3, 2, "#8a8a9a"); });
    /* ── 空の神殿（右上の海に浮かぶ島）と雲 ── */
    const cloud = (x, y, w) => { circ(x, y, w * 0.35, "#ffffff"); circ(x - w * 0.3, y + 2, w * 0.25, "#f2f6ff"); circ(x + w * 0.32, y + 2, w * 0.27, "#f2f6ff"); R(x - w * 0.5, y + 2, w, w * 0.2, "#e2eaf8"); };
    [[408, 106, 72], [378, 120, 42], [442, 122, 48], [360, 72, 30], [454, 62, 34]].forEach(([x, y, w]) => cloud(x, y, w));
    const isle = (x, y, w) => { g.fillStyle = "#5a4a3a"; g.beginPath(); g.moveTo(x - w / 2, y); g.lineTo(x + w / 2, y); g.lineTo(x + w * 0.15, y + w * 0.6); g.lineTo(x - w * 0.12, y + w * 0.52); g.closePath(); g.fill(); g.fillStyle = "#7a6a52"; g.beginPath(); g.moveTo(x - w / 2, y); g.lineTo(x, y); g.lineTo(x - w * 0.08, y + w * 0.4); g.closePath(); g.fill(); R(x - w / 2, y - 3, w, 4, "#8ac458"); R(x - w / 2, y, w, 1, "#4a7a2a"); };
    isle(408, 88, 46); isle(368, 58, 20); isle(448, 46, 18);
    R(396, 68, 24, 18, "#f6f2e2"); tri(408, 68, 30, 10, "#ffd84a"); for (let i = 0; i < 4; i++) R(398 + i * 6, 72, 2, 14, "#c8c0a0"); R(406, 78, 4, 8, "#ffd84a"); circ(408, 58, 2, "#ffffff");
    /* 星のきらめき（神殿のまわり） */
    [[392, 52], [430, 70], [384, 90], [446, 96]].forEach(([x, y]) => { R(x, y - 2, 1, 5, "#fff8c0"); R(x - 2, y, 5, 1, "#fff8c0"); });
    /* ── 地図のふち（古い紙のよう）── */
    const vg = g.createRadialGradient(MW / 2, MH / 2, MH * 0.42, MW / 2, MH / 2, MW * 0.64);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(10,6,24,.38)");
    g.fillStyle = vg; g.fillRect(0, 0, MW, MH);
    mapCanvas = c;
    return c;
  }

  /* ══ 画面 ══ */
  let sel = null, diff = "normal", built = false;
  function el() {
    let s = document.getElementById("stages");
    if (s) return s;
    s = document.createElement("section");
    s.className = "scr"; s.id = "stages";
    s.innerHTML = '<div class="wm-box" id="wmBox"><div class="wm-cv" id="wmCv"></div><svg class="wm-route" id="wmRoute" viewBox="0 0 ' + MW + " " + MH + '" preserveAspectRatio="none"></svg><div class="wm-nodes" id="wmNodes"></div></div>' +
      '<div class="st-top"><button class="st-back" data-a="stBack">' + ic("back") + "<b>STAGES</b><small>冒険の地図</small></button><div class=\"st-cur\" id=\"stCur\"></div></div>" +
      '<div class="st-det scroll-y" id="stDet" hidden></div><div class="st-tip" id="stTip">迷宮をえらんでください</div>';
    const ref = document.getElementById("run");
    ref.parentNode.insertBefore(s, ref);
    return s;
  }
  function dunOpen(d) { return !d.unlock || (S().dun[d.unlock] && S().dun[d.unlock].clears > 0); }
  function hardOpen(d) { return !!(S().dun[d.id] && S().dun[d.id].clears > 0); }
  function open(id) {
    const s = el();
    if (!built) {
      const cv = paint(); cv.className = "pxc"; $("#wmCv").appendChild(cv);
      built = true;
    }
    MA.Guild && MA.Guild.leave && MA.Guild.leave();
    MA.UI.closeModal(true);
    MA.UI.scr("stages");
    MA.Input.enabled = false;
    renderNodes();
    renderCur();
    if (id) select(id); else { sel = null; $("#stDet").hidden = true; s.classList.remove("det"); focusMap(null); }
    MA.Audio.bgm("guild");
  }
  function hide() { const s = document.getElementById("stages"); if (s) s.classList.remove("det"); }
  function renderCur() { $("#stCur").innerHTML = ic("gold") + "<b>" + fmt(S().gold) + "</b>"; }
  function renderNodes() {
    const box = $("#wmNodes");
    const ds = D().DUNGEONS;
    /* 点線の道（ひらいた所まで明るく） */
    const pts = ROUTE.map((k) => POS[k]);
    let lastOpen = 0;
    ds.forEach((d, i) => { if (dunOpen(d)) lastOpen = i + 1; });
    const poly = (arr, cls) => '<polyline class="' + cls + '" points="' + arr.map((p) => p.join(",")).join(" ") + '" />';
    $("#wmRoute").innerHTML = poly(pts, "rt-all") + poly(pts.slice(0, lastOpen + 1), "rt-open");
    let h = '<div class="wm-node town" style="left:' + (POS.town[0] / MW * 100) + "%;top:" + (POS.town[1] / MH * 100) + '%"><i></i><span>拠点の町</span></div>';
    ds.forEach((d) => {
      const open = dunOpen(d), dr = S().dun[d.id] || {}, hr = dr.hard || {};
      const cls = "wm-node" + (open ? "" : " lock") + (dr.clears ? " clr" : open ? " new" : "") + (hr.clears ? " hclr" : "") + (sel === d.id ? " sel" : "");
      h += '<button class="' + cls + '" style="left:' + (POS[d.id][0] / MW * 100) + "%;top:" + (POS[d.id][1] / MH * 100) + "%;--c:" + d.c + '" data-a="stSel" data-v="' + d.id + '">' +
        '<i>' + (open ? (dr.clears ? ic("check") : "") : ic("lock")) + "</i>" +
        '<span><small>第' + d.no + "迷宮</small>" + esc(d.nm) + (hr.clears ? ' <em class="hd">HARD</em>' : "") + "</span>" +
        '<canvas class="wm-boss" width="40" height="40" data-boss="' + d.boss + '"' + (S().codex.boss[d.boss] ? "" : ' data-hide="1"') + "></canvas></button>";
    });
    box.innerHTML = h;
    box.querySelectorAll(".wm-boss").forEach((c) => {
      const B = D().BOSSES[c.dataset.boss]; const f = MA.Art.sprite(B.art).frames[0];
      const g = c.getContext("2d"); g.imageSmoothingEnabled = false; const k = Math.min(40 / f.width, 40 / f.height);
      g.drawImage(f, (40 - f.width * k) / 2, 40 - f.height * k, f.width * k, f.height * k);
      if (c.dataset.hide) c.style.filter = "brightness(0) drop-shadow(0 0 2px rgba(255,255,255,.5))";
    });
  }
  /* 選んだ迷宮が詳細の左の空きにくるよう、地図を少しずらす */
  function focusMap(id) {
    const box = $("#wmBox");
    if (!id) { box.style.transform = ""; return; }
    const r = box.getBoundingClientRect(), vw = window.innerWidth;
    const det = $("#stDet"); const dw = det && !det.hidden ? det.getBoundingClientRect().width : 0;
    const nx = r.left + POS[id][0] / MW * r.width;
    const want = (vw - dw) / 2;
    const cur = parseFloat((box.style.transform.match(/translateX\((-?[\d.]+)px\)/) || [0, 0])[1]) || 0;
    let dx = cur + (want - nx);
    const minX = -(r.width - vw) / 2 - dw * 0.9, maxX = (r.width - vw) / 2 + 40;
    dx = Math.max(Math.min(dx, maxX), Math.min(0, minX));
    box.style.transform = "translateX(" + Math.round(dx) + "px)";
  }
  function select(id) {
    sel = id;
    const d = D().DUN[id];
    if (diff === "hard" && !hardOpen(d)) diff = "normal";
    renderNodes();
    renderDet();
    $("#stages").classList.add("det");
    requestAnimationFrame(() => focusMap(id));
  }
  function relName(r) { return r === "adv" ? "有利" : r === "dis" ? "不利" : "同等"; }
  function renderDet() {
    const det = $("#stDet");
    const d = D().DUN[sel]; if (!d) return;
    const open = dunOpen(d), dr = S().dun[d.id] || {}, hr = dr.hard || {}, hOpen = hardOpen(d);
    const MD = D().MODES[diff];
    const cid = S().sel, C = D().CHARS[cid];
    const own = MA.Save.owned(cid);
    const power = MA.Stats.power(MA.Stats.compute(cid));
    const recLv = d.rec.lv + (MD.recAdd || 0), recPw = Math.round(d.rec.power * (diff === "hard" ? 1.9 : 1));
    const rec = diff === "hard" ? hr : dr;
    const B = D().BOSSES[d.boss];
    /* 敵の属性と、いまのキャラとの相性 */
    const enemies = d.enemies.concat([d.elite]);
    const en = enemies.map((k) => {
      const e = D().ENEMIES[k], seen = S().codex.en[k];
      const r = D().elemRel(C.el, e.el);
      return '<div class="sd-en" data-art="' + e.art + '" data-col="' + (e.col || "") + '"' + (seen ? "" : ' data-hide="1"') + '><canvas width="28" height="28"></canvas><b>' + (seen ? esc(e.nm) : "？？？") + "</b>" +
        '<span class="sd-el">' + ic("el_" + e.el) + D().ELEM[e.el].nm + '</span><em class="rel ' + r + '">' + relName(r) + "</em></div>";
    }).join("");
    const bRel = D().elemRel(C.el, B.el);
    /* クリア時間のミッション */
    const tl = MA.Prog.timeList(d.id, diff);
    const tm = tl.map((m) => '<div class="sd-tm' + (m.done ? " ok" : "") + '">' + ic("st_time") + "<b>" + m.min + "分以内にクリア</b>" + '<span class="g">' + ic("gem") + m.gem + "</span>" +
      (m.done ? (m.claimed ? '<em class="got">受取ずみ</em>' : '<button class="btn sm gold" data-a="claimTime" data-v="' + m.key + '">受け取る</button>') : '<em class="no">未達成</em>') + "</div>").join("");
    const first = diff === "hard" ? (MA.Prog.FIRST_GEMS_HARD[d.id] || 15) : (MA.Prog.FIRST_GEMS[d.id] || 10);
    const firstGot = !!rec.clears;
    det.innerHTML = '<button class="sd-x" data-a="stClose" aria-label="閉じる">' + ic("close") + "</button>" +
      '<div class="sd-art" id="sdArt" style="--c:' + d.c + '"></div>' +
      '<div class="sd-h"><small>第' + d.no + "迷宮・" + esc(d.en) + "</small><b>" + esc(d.nm) + '</b><div><span class="stars">' + "★".repeat(d.stars) + "<i>" + "★".repeat(6 - d.stars) + "</i></span><em>" + esc(d.diff) + "</em>" + '<span class="sd-elb">' + ic("el_" + d.el) + D().ELEM[d.el].nm + "属性が多い</span></div></div>" +
      '<div class="sd-tabs"><button class="' + (diff === "normal" ? "on" : "") + '" data-a="stDiff" data-v="normal">' + ic("normal") + "ノーマル</button>" +
      '<button class="hard ' + (diff === "hard" ? "on" : "") + '" data-a="stDiff" data-v="hard"' + (hOpen ? "" : " disabled") + ">" + ic(hOpen ? "hard" : "lock") + "ハード" + (hOpen ? "" : "<small>ノーマルをクリアで解放</small>") + "</button></div>" +
      '<p class="sd-d">' + esc(d.d) + (diff === "hard" ? '<br><span class="sd-hd">' + esc(MD.d) + "</span>" : "") + "</p>" +
      '<div class="sd-grid"><div><small>推奨レベル</small><b>Lv.' + recLv + "</b></div>" +
      '<div><small>推奨戦力</small><b class="' + (power >= recPw ? "ok" : "ng") + '">' + fmt(recPw) + "</b><i>あなた " + fmt(power) + "</i></div>" +
      "<div><small>クリア</small><b>" + (rec.clears ? rec.clears + "回" : "まだ") + "</b></div><div><small>ベスト</small><b>" + (rec.best ? fmtT(rec.best) : "—") + "</b></div></div>" +
      '<div class="sd-sec">' + ic("st_time") + "クリア時間のミッション<small>早くクリアするほど XEVARION のジェム</small></div>" + tm +
      '<div class="sd-sec">' + ic("gem") + "初回クリア<small>" + (firstGot ? "受け取りずみ" : "ジェム ×" + first) + "</small></div>" +
      '<div class="sd-sec">' + ic("skull") + "出現する敵と相性<small>" + esc(C.nm) + "（" + D().ELEM[C.el].nm + "）から見て</small></div><div class=\"sd-ens\">" + en + "</div>" +
      '<div class="sd-sec">' + ic("star", "#ff5a6a") + 'ボス</div><div class="sd-boss"><canvas id="sdBoss" width="56" height="56"></canvas><div><b>' + (S().codex.boss[d.boss] ? esc(B.nm) : "？？？") + ' <span class="sd-el">' + ic("el_" + B.el) + D().ELEM[B.el].nm + '</span><em class="rel ' + bRel + '">' + relName(bRel) + "</em></b><small>" + esc(B.gim.nm) + "：" + esc(B.gim.d) + "</small></div></div>" +
      '<div class="sd-sec">' + ic("mat", "#9ab0ff") + "手に入る素材</div><div class=\"dd-mats\">" + d.mats.map((k) => "<span>" + ic("mat", D().MATS[k].c) + esc(D().MATS[k].nm) + "</span>").join("") + "<span>" + ic("crystal") + "星脈結晶（ボス" + (diff === "hard" ? "・2倍" : "") + "）</span></div>" +
      '<div class="sd-sec">' + ic("info") + '特殊ルール</div><ul class="dd-rules">' + d.rules.map((r) => "<li>" + esc(r) + "</li>").join("") + "</ul>" +
      '<div class="sd-go">' + (!open ? '<div class="locked">' + ic("lock") + "「" + esc(D().DUN[d.unlock].nm) + "」をクリアすると解放されます</div>"
        : !own ? '<div class="locked">' + ic("lock") + "出発するキャラを持っていません（XEVARION のガチャで手に入ります）</div>"
        : '<button class="btn gold big' + (diff === "hard" ? " hardgo" : "") + '" data-a="prep" data-v="' + d.id + '" data-x="' + diff + '">' + ic("door") + (diff === "hard" ? "ハードで" : "") + "出発準備へ</button>") + "</div>";
    det.hidden = false;
    det.scrollTop = 0;
    paintDet(d);
  }
  function paintDet(d) {
    const art = $("#sdArt"); if (!art) return;
    const c = MA.Pix.mkCanvas(200, 56), g = c.getContext("2d"); g.imageSmoothingEnabled = false;
    const T = MA.Art.tiles(d.biome), BI = MA.Art.BIOME[d.biome];
    g.fillStyle = BI.bg; g.fillRect(0, 0, 200, 56);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 13; x++) g.drawImage(y === 0 ? T.face : T.floor[(x + y) % 4], x * 16, y * 16 - 8);
    const dk = { forest: "tree", ice: "crystal", lava: "rock", library: "shelf", abyss: "void", sky: "starpillar" }[d.biome];
    [[18, 54], [182, 54], [140, 40]].forEach(([x, y], i) => { const f = MA.Art.deco(dk, i).frames[0]; g.drawImage(f, x - f.width / 2, y - f.height); });
    d.enemies.slice(0, 3).forEach((k, i) => { const e = D().ENEMIES[k]; const f = MA.Art.sprite(e.art, e.col).frames[0]; g.drawImage(f, 56 + i * 26, 50 - f.height); });
    c.className = "pxc"; art.innerHTML = ""; art.appendChild(c);
    $("#stDet").querySelectorAll(".sd-en").forEach((w) => {
      const cv = w.querySelector("canvas"); const f = MA.Art.sprite(w.dataset.art, w.dataset.col || undefined).frames[0];
      const gg = cv.getContext("2d"); gg.imageSmoothingEnabled = false; const k = Math.min(28 / f.width, 28 / f.height, 2);
      gg.drawImage(f, (28 - f.width * k) / 2, 28 - f.height * k, f.width * k, f.height * k);
      if (w.dataset.hide) cv.style.filter = "brightness(0)";
    });
    const bc = $("#sdBoss"); const bf = MA.Art.sprite(D().BOSSES[d.boss].art).frames[0];
    const bg2 = bc.getContext("2d"); bg2.imageSmoothingEnabled = false; const k = Math.min(56 / bf.width, 56 / bf.height);
    bg2.drawImage(bf, (56 - bf.width * k) / 2, (56 - bf.height * k) / 2, bf.width * k, bf.height * k);
    if (!S().codex.boss[d.boss]) bc.style.filter = "brightness(0.15)";
  }
  window.addEventListener("resize", () => { if (document.body.dataset.scr === "stages" && sel) focusMap(sel); });

  /* ══ ボタン ══ */
  const A = MA.UI.ACT;
  A.stBack = () => { MA.Guild.enter(); };
  A.stSel = (b) => { const d = D().DUN[b.dataset.v]; if (!d) return; MA.Audio.sfx(dunOpen(d) ? "click" : "error"); select(d.id); };
  A.stClose = () => { sel = null; $("#stDet").hidden = true; $("#stages").classList.remove("det"); renderNodes(); focusMap(null); };
  A.stDiff = (b) => { const d = D().DUN[sel]; if (b.dataset.v === "hard" && !hardOpen(d)) return; diff = b.dataset.v; renderDet(); };
  A.claimTime = (b) => {
    const n = MA.Prog.claimTime(b.dataset.v);
    MA.UI.toast(n > 0 ? "ジェム ×" + n + " を受け取りました" : "受け取りずみです（ほかの端末で受け取った分）", n > 0 ? "#5ad8ff" : "#c8c8d8");
    if (document.body.dataset.scr === "stages") renderDet();
    MA.Guild && MA.Guild.refreshTop && MA.Guild.refreshTop();
  };
  MA.Stages = { open, hide, select, POS, paint };
})();
