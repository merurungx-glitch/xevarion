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
  /* ══ ★★ 2026-10-28 冒険の地図を作り直し（ご指定「ステージ選択のマップが位置が見づらかったり近かったりバランスが悪いので作り直して」）══
     ・地図を 480×270 → <b>640×360</b>（16:9 のまま）に広げ、迷宮どうし・名札どうしが重ならないよう置き直した。
       本編の大陸（拠点の町・第1〜第5迷宮）は左寄りのまん中、右の海に 星天の神殿（空の島）と 第7〜第9迷宮の異界の島、
       外伝（第10〜第15迷宮）は解放のもとの迷宮の近くの海に、島ごとに形と色をかえて置いた（地図のはしから 36 以上はなす）。
     ・名札の向き LB（d＝下・u＝上・r＝右・l＝左）は、となりの迷宮や地図のはしにかからない側。
     ・道は点を結ぶ折れ線 → なめらかな曲線（本編＝金の点線・外伝＝海の上の細い点線）。 */
  const MW = 640, MH = 360;
  const esc = (s) => MA.UI.esc(s);
  const ic = (n, c, cls) => MA.Art.iconHTML(n, c, cls);
  const fmt = (n) => MA.UI.fmt(n);
  const fmtT = (s) => MA.UI.fmtT(s);
  const $ = (s, r) => (r || document).querySelector(s);

  /* 地図の上の位置（640×360 の中）。道は迷宮の順（解放の順） */
  const POS = {
    town: [112, 300], d1: [178, 218], d2: [140, 116], d3: [282, 84], d4: [382, 178], d5: [286, 270],
    d6: [470, 64], d7: [566, 186], d8: [526, 290], d9: [404, 316],
    /* 外伝（海に浮かぶ異界の島）：第10＝第2の北西・第11＝第3の北東・第12＝第4の東・第13＝第5の南西・第14＝第7の北（右上のすみ）・第15＝第8の南東 */
    d10: [48, 58], d11: [388, 30], d12: [478, 236], d13: [222, 338], d14: [600, 60], d15: [592, 322],
  };
  const LB = { town: "r", d9: "u", d13: "r", d15: "u", d8: "u", d10: "r", d12: "u" };
  const ROUTE = ["town", "d1", "d2", "d3", "d4", "d5", "d6", "d7", "d8", "d9"];
  /* 外伝の道（解放のもと → 外伝の島） */
  const SIDE_ROUTE = [["d2", "d10"], ["d3", "d11"], ["d4", "d12"], ["d5", "d13"], ["d7", "d14"], ["d8", "d15"]];
  const BIOME_AT = { town: "town", d1: "forest", d2: "ice", d3: "lava", d4: "library", d5: "abyss", d6: "sky" };

  /* ══ ノイズ（いつも同じ地図になる）══ */
  function hash(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function vnoise(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; const s = (t) => t * t * (3 - 2 * t); const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1); const u = s(xf), v = s(yf); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
  function fbm(x, y) { return vnoise(x, y) * 0.55 + vnoise(x * 2.1, y * 2.1) * 0.3 + vnoise(x * 4.3, y * 4.3) * 0.15; }

  /* 大陸の形（丸い塊の和）と、島（迷宮ごと） */
  const CONT = [[112, 300, 78], [178, 218, 88], [140, 116, 84], [282, 84, 80], [382, 178, 84], [286, 270, 84], [228, 170, 104], [330, 240, 70], [96, 210, 66], [214, 96, 64], [340, 120, 64]];
  const ISLE = {
    d7: { r: 22, k: "crimson" }, d8: { r: 24, k: "frostfire" }, d9: { r: 24, k: "void" },
    d10: { r: 24, k: "shroom" }, d11: { r: 21, k: "frost" }, d12: { r: 21, k: "ember" }, d13: { r: 21, k: "marble" }, d14: { r: 23, k: "sakura" }, d15: { r: 23, k: "sunken" },
  };
  const ISLE_PAL = {
    crimson: ["#6a4a5a", "#523848", "#3a2434"], frostfire: ["#7a8aa8", "#5a6a88", "#3e4a66"], void: ["#4a3a6a", "#36285a", "#221840"],
    shroom: ["#6fae5a", "#5a9446", "#437a34"], frost: ["#e8f6ff", "#c8e2f2", "#a2c6de"], ember: ["#7a3a24", "#5e2a18", "#42180c"],
    marble: ["#f2efe6", "#dcd6c6", "#c2b9a2"], sakura: ["#86c46a", "#6aac54", "#528c40"], sunken: ["#3aa0b8", "#2a86a2", "#1c6a86"],
  };

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
    const IH = {}; Object.keys(ISLE_PAL).forEach((k) => { IH[k] = ISLE_PAL[k].map(hex); });
    const SEA = [hex("#3c8cc0"), hex("#2c76a8"), hex("#20618e"), hex("#174b74"), hex("#123c60")];
    const SAND = [hex("#f2dca8"), hex("#e2c88c")];
    const KEYS = ["town", "d1", "d2", "d3", "d4", "d5"];
    const centers = KEYS.map((k) => [k, POS[k][0], POS[k][1]]);
    const IK = Object.keys(ISLE);
    const bio = new Uint8Array(MW * MH);                     // 0 海・1 砂浜・2〜7 大陸の地域・20〜 島
    const contAt = (x, y) => {
      let f = 0;
      for (let i = 0; i < CONT.length; i++) { const q = CONT[i], dx = x - q[0], dy = y - q[1]; f += Math.exp(-(dx * dx + dy * dy) / (q[2] * q[2]) * 1.7); }
      return f + (fbm(x / 34, y / 34) - 0.5) * 0.62 + (vnoise(x / 8, y / 8) - 0.5) * 0.06 - 0.6;
    };
    const isleAt = (x, y) => {
      let best = -9, bi = -1;
      for (let i = 0; i < IK.length; i++) {
        const k = IK[i], p = POS[k], r = ISLE[k].r, dx = x - p[0], dy = (y - p[1] - 3) * 1.18;
        const v = 1 - (dx * dx + dy * dy) / (r * r) + (fbm(x / 9 + i * 7, y / 9) - 0.5) * 0.7;
        if (v > best) { best = v; bi = i; }
      }
      return [best, bi];
    };
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      const i = (y * MW + x) * 4, j = y * MW + x;
      const land = contAt(x, y), [il, ii] = isleAt(x, y);
      let col;
      if (land < 0 && il < 0) {
        /* 海：岸に近いほど明るい・深いところは濃く・波の線 */
        const near = Math.max(land, il * 0.55);
        const k = near > -0.07 ? 0 : near > -0.2 ? 1 : near > -0.4 ? 2 : near > -0.62 ? 3 : 4;
        col = SEA[k];
        const w = Math.sin(x * 0.16 + Math.sin(y * 0.29) * 2 + y * 0.045);
        if (k >= 1 && w > 0.965 && (y % 7) < 1) col = hex("#9ad4f0");
        if (k === 0 && ((x + y) % 3 === 0)) col = hex("#c8ecff");
        bio[j] = 0;
      } else if (land >= 0) {
        if (land < 0.05) { col = SAND[(x + y) % 2]; bio[j] = 1; }
        else {
          let best = 0, bd = 1e9;
          const jit = (fbm(x / 18 + 3, y / 18 + 7) - 0.5) * 84 + (vnoise(x / 5, y / 5) - 0.5) * 12;
          centers.forEach(([k, cx, cy], ci) => { const dd = Math.hypot(x - cx, (y - cy) * 1.1) + jit * (ci % 2 ? 1 : -1); if (dd < bd) { bd = dd; best = ci; } });
          const P = PH[BIOME_AT[KEYS[best]]] || PH.town;
          const sh = fbm(x / 12 + best * 5, y / 12) + (vnoise(x / 3, y / 3) - 0.5) * 0.25;
          const lvl = sh > 0.62 ? 0 : sh > 0.4 ? 1 : 2;
          const edge = Math.abs(sh - 0.62) < 0.03 || Math.abs(sh - 0.4) < 0.03;
          col = P[edge && (x + y) % 2 ? Math.min(2, lvl + 1) : lvl];
          bio[j] = 2 + best;
        }
      } else {
        /* 島：ふちは砂浜（雪・岩の島は白っぽいふち） */
        const kk = ISLE[IK[ii]].k, P = IH[kk];
        if (il < 0.12) { col = kk === "frost" || kk === "marble" ? hex("#ffffff") : kk === "ember" || kk === "void" || kk === "crimson" ? hex("#2a2030") : SAND[(x + y) % 2]; }
        else {
          const sh = fbm(x / 7 + ii * 3, y / 7) + (vnoise(x / 2.5, y / 2.5) - 0.5) * 0.2;
          col = P[sh > 0.6 ? 0 : sh > 0.42 ? 1 : 2];
        }
        bio[j] = 20 + ii;
      }
      d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
    }
    /* 地域の境目と海岸に濃い線 */
    for (let y = 1; y < MH - 1; y++) for (let x = 1; x < MW - 1; x++) {
      const j = y * MW + x, b = bio[j];
      if (b === 0) { if (bio[j - MW] >= 1 || bio[j - 1] >= 1) { const i = j * 4; d[i] = 26; d[i + 1] = 62; d[i + 2] = 92; } continue; }
      if (b >= 2 && b < 20 && bio[j + MW] >= 2 && bio[j + MW] < 20 && bio[j + MW] !== b && (x % 2)) { const i = j * 4; d[i] = Math.round(d[i] * 0.72); d[i + 1] = Math.round(d[i + 1] * 0.72); d[i + 2] = Math.round(d[i + 2] * 0.72); }
    }
    g.putImageData(img, 0, 0);
    const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), w, h); };
    const tri = (x, y, w, h, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(Math.round(x), Math.round(y - h)); g.lineTo(Math.round(x + w / 2), Math.round(y)); g.lineTo(Math.round(x - w / 2), Math.round(y)); g.closePath(); g.fill(); };
    const circ = (x, y, r, col) => { g.fillStyle = col; g.beginPath(); g.arc(Math.round(x), Math.round(y), r, 0, TAU); g.fill(); };
    const ell = (x, y, rx, ry, col) => { g.fillStyle = col; g.beginPath(); g.ellipse(Math.round(x), Math.round(y), rx, ry, 0, 0, TAU); g.fill(); };
    const rnd = (() => { let s = 99; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();
    const bioAt = (x, y) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= MW || y >= MH) return 0; return bio[y * MW + x]; };
    const isRegion = (x, y, k) => { const v = 2 + KEYS.indexOf(k); return bioAt(x, y) === v && bioAt(x, y + 4) === v && bioAt(x - 3, y) === v && bioAt(x + 3, y) === v; };
    const isIsle = (x, y, k) => bioAt(x, y) === 20 + IK.indexOf(k) && bioAt(x, y + 3) === 20 + IK.indexOf(k);
    /* 迷宮の丸（と名札）のまわりには物を置かない */
    const nearNode = (x, y, r) => Object.keys(POS).some((k) => Math.hypot(x - POS[k][0], y - POS[k][1]) < r);
    /* ── 川（氷の山から森をぬけて南の海へ）── */
    const river = [[156, 132], [170, 150], [168, 170], [190, 188], [214, 206], [222, 232], [236, 256], [232, 284], [240, 312], [252, 346]];
    [[4, "#2a72a4"], [3, "#4aa8e0"], [1, "#9ad8f8"]].forEach(([w, col]) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); river.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); });
    /* ── 町のまわりの畑（パッチワーク）── */
    [[72, 300, 16, 10, "#c8b050"], [86, 316, 18, 9, "#9ac050"], [140, 316, 14, 10, "#d8c060"], [70, 282, 12, 9, "#a8c858"], [146, 284, 12, 8, "#b8c850"]].forEach(([x, y, w, h, col]) => { R(x, y, w, h, col); for (let i = 1; i < h; i += 2) R(x, y + i, w, 1, MA.Pix.shade(col, 0.82)); R(x - 1, y - 1, w + 2, 1, "#6a8a3a"); });
    /* ── 木（森は一面に・町のまわりにも少し）── */
    const tree = (x, y, dark, mid, light) => { ell(x, y + 3, 3, 1, "rgba(0,0,0,.25)"); tri(x, y + 2, 8, 10, dark); tri(x, y, 6, 8, mid); R(x - 1, y - 6, 1, 3, light); R(x - 0.5, y + 2, 1, 2, "#5a3a20"); };
    const round = (x, y, dark, mid, light) => { ell(x, y + 3, 3, 1, "rgba(0,0,0,.25)"); circ(x, y - 1, 4, dark); circ(x - 1, y - 2, 3, mid); R(x - 2, y - 4, 2, 1, light); };
    for (let i = 0; i < 2300; i++) {
      const x = rnd() * MW, y = rnd() * MH;
      if (nearNode(x, y, 22)) continue;
      if (isRegion(x, y, "d1")) { if (rnd() < 0.8) tree(x, y, "#1f4a1a", "#2f6a28", "#6ab048"); else round(x, y, "#2a5a24", "#3f8a34", "#7ac058"); }
      else if (isRegion(x, y, "town") && rnd() < 0.1) round(x, y, "#3a6a2a", "#5a9a3a", "#9ad868");
      else if (isRegion(x, y, "d2") && rnd() < 0.16) tree(x, y, "#2a4a5a", "#4a7a8a", "#ffffff");
    }
    /* ── 雪の山（氷）── */
    [[104, 82, 30, 34], [134, 70, 34, 40], [176, 86, 26, 28], [92, 112, 24, 24], [196, 64, 22, 26], [74, 92, 22, 20], [160, 52, 24, 24], [118, 142, 20, 18]].forEach(([x, y, w, h]) => {
      if (nearNode(x, y - h / 2, 18)) return;
      tri(x + 2, y + 1, w, h, "rgba(20,40,70,.35)"); tri(x, y, w, h, "#7a8aa8"); tri(x + 3, y, w - 8, h - 5, "#9aaac8"); tri(x, y - h + 11, w * 0.44, 11, "#ffffff"); R(x - 1, y - h + 6, 2, 3, "#e0f0ff");
    });
    for (let i = 0; i < 60; i++) { const x = rnd() * MW, y = rnd() * MH; if (isRegion(x, y, "d2") && !nearNode(x, y, 16)) { R(x, y, 3, 2, "#a8c8e0"); R(x, y - 1, 2, 1, "#ffffff"); } }
    /* ── 火山・熔岩の川・とがった岩（熔岩）── */
    const vx = 252, vy = 74;
    tri(vx, vy + 22, 76, 52, "#3a1a10"); tri(vx + 2, vy + 22, 60, 46, "#5a2a1a"); tri(vx + 8, vy + 22, 26, 42, "#6a3424"); R(vx - 8, vy - 28, 16, 4, "#ff6a2a"); circ(vx, vy - 26, 6, "#ffb03a"); circ(vx, vy - 27, 3, "#fff0a0");
    [[vx - 4, vy - 22, vx - 16, vy - 4, vx + 8, vy + 8, vx - 14, vy + 30], [vx + 4, vy - 22, vx + 18, vy, vx + 12, vy + 12, vx + 36, vy + 32]].forEach(([x0, y0, x1, y1, x2, y2, x3, y3]) => { [[3, "#c83a1a"], [2, "#ff7a2a"], [1, "#ffe06a"]].forEach(([w, col]) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.bezierCurveTo(x1, y1, x2, y2, x3, y3); g.stroke(); }); });
    for (let i = 0; i < 360; i++) { const x = rnd() * MW, y = rnd() * MH; if (!isRegion(x, y, "d3") || nearNode(x, y, 18)) continue; const k = rnd(); if (k < 0.55) { tri(x, y, 5, 9, "#2a1208"); tri(x + 1, y, 3, 7, "#4a2414"); } else if (k < 0.8) { ell(x, y, 4, 2, "#ff6a2a"); ell(x, y, 2, 1, "#ffd04a"); } else { R(x, y, 4, 1, "#ff8a3a"); R(x + 2, y + 1, 3, 1, "#c83a1a"); } }
    for (let i = 0; i < 6; i++) circ(vx + 4 + i * 3, vy - 34 - i * 5, 3 + i, "rgba(90,80,90," + (0.5 - i * 0.07) + ")");
    /* ── 書庫の遺跡（砂）：柱・ピラミッド・砂丘・サボテン ── */
    tri(420, 150, 40, 26, "#c8a868"); tri(423, 150, 30, 21, "#e2c488"); for (let i = 0; i < 4; i++) R(408 + i * 6, 146 - i * 5, Math.max(2, 26 - i * 12), 1, "#a8884a");
    [[344, 206], [354, 202], [366, 210], [408, 208], [418, 214], [338, 222]].forEach(([x, y], i) => { R(x + 1, y - 11, 4, 12, "rgba(0,0,0,.2)"); R(x, y - 12, 4, 12, "#f2ece0"); R(x - 1, y - 13, 6, 2, "#d8d0c0"); R(x, y - 3, 4, 3, "#b8b0a0"); if (i % 3 === 1) R(x - 2, y - 6, 8, 2, "#c8c0b0"); });
    for (let i = 0; i < 220; i++) { const x = rnd() * MW, y = rnd() * MH; if (!isRegion(x, y, "d4") || nearNode(x, y, 20)) continue; const k = rnd(); if (k < 0.5) { g.strokeStyle = "#f8e8b8"; g.lineWidth = 1; g.beginPath(); g.arc(x, y + 4, 5, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); } else if (k < 0.75) { ell(x, y, 3, 2, "#a88858"); R(x - 1, y - 2, 2, 1, "#c8a878"); } else { R(x, y - 5, 2, 6, "#5a9a3a"); R(x - 2, y - 3, 2, 1, "#5a9a3a"); R(x + 2, y - 4, 2, 1, "#5a9a3a"); } }
    /* ── 深淵の裂け目・紫の水晶・枯れ木（深淵）── */
    const ax = 318, ay = 290;
    for (let k = 0; k < 7; k++) { g.strokeStyle = ["#0a0414", "#1a0a2a", "#2a1040", "#5a2a8a", "#8a4ad0", "#2a1040", "#c27bff"][k]; g.lineWidth = 2; g.beginPath(); g.ellipse(ax, ay, 30 - k * 4, 12 - k * 1.7, -0.2, 0, TAU); g.stroke(); }
    ell(ax, ay, 4, 2, "#05030a");
    for (let i = 0; i < 240; i++) { const x = rnd() * MW, y = rnd() * MH; if (!isRegion(x, y, "d5") || nearNode(x, y, 20)) continue; const k = rnd(); if (k < 0.4) { tri(x, y, 5, 10, "#6a3ab0"); tri(x + 1, y, 2, 8, "#d0a8ff"); } else if (k < 0.7) { g.strokeStyle = "#b06aff"; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 4, y + 2); g.lineTo(x + 7, y + 1); g.stroke(); } else { R(x, y - 6, 1, 7, "#2a1a20"); R(x - 2, y - 5, 2, 1, "#2a1a20"); R(x + 1, y - 4, 2, 1, "#2a1a20"); } }
    /* ── 町（拠点）：家と石碑 ── */
    [[84, 302], [96, 308], [108, 300], [92, 318], [106, 322], [120, 314], [130, 302]].forEach(([x, y]) => { if (Math.hypot(x - POS.town[0], y - POS.town[1]) < 10) return; R(x - 4, y - 4, 9, 6, "#efe0c0"); tri(x + 0.5, y - 4, 12, 6, "#4a6aa8"); R(x - 1, y - 2, 2, 4, "#6a4428"); R(x + 2, y - 2, 2, 2, "#ffe8a0"); });
    /* ── 海：船・岩・羅針盤 ── */
    const ship = (x, y) => { g.fillStyle = "#6a4428"; g.beginPath(); g.moveTo(x - 7, y); g.lineTo(x + 7, y); g.lineTo(x + 5, y + 3); g.lineTo(x - 5, y + 3); g.closePath(); g.fill(); R(x, y - 10, 1, 10, "#4a2a18"); g.fillStyle = "#f2ece0"; g.beginPath(); g.moveTo(x + 1, y - 9); g.lineTo(x + 7, y - 3); g.lineTo(x + 1, y - 2); g.closePath(); g.fill(); R(x - 9, y + 3, 18, 1, "rgba(255,255,255,.5)"); };
    ship(36, 196); ship(456, 334); ship(568, 246); ship(330, 20);
    [[24, 140], [612, 258], [470, 132], [262, 350], [560, 40]].forEach(([x, y]) => { ell(x, y, 5, 3, "#5a5a6a"); ell(x - 1, y - 1, 3, 2, "#8a8a9a"); });
    (function compass(x, y) {
      g.strokeStyle = "rgba(255,244,210,.55)"; g.lineWidth = 1; g.beginPath(); g.arc(x, y, 13, 0, TAU); g.stroke(); g.beginPath(); g.arc(x, y, 9, 0, TAU); g.stroke();
      const pt = (a, l, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.lineTo(x + Math.cos(a + 1.9) * 3, y + Math.sin(a + 1.9) * 3); g.lineTo(x + Math.cos(a - 1.9) * 3, y + Math.sin(a - 1.9) * 3); g.closePath(); g.fill(); };
      for (let k = 0; k < 4; k++) pt(-Math.PI / 2 + k * Math.PI / 2, 17, k === 0 ? "#ffd84a" : "rgba(255,244,210,.8)");
      for (let k = 0; k < 4; k++) pt(-Math.PI / 4 + k * Math.PI / 2, 9, "rgba(255,244,210,.45)");
      R(x - 1, y - 27, 3, 5, "#ffd84a");
    })(30, 330);
    /* ── 空の神殿（右上の海に浮かぶ島）と雲 ── */
    const cloud = (x, y, w) => { circ(x, y, w * 0.35, "#ffffff"); circ(x - w * 0.3, y + 2, w * 0.25, "#f2f6ff"); circ(x + w * 0.32, y + 2, w * 0.27, "#f2f6ff"); R(x - w * 0.5, y + 2, w, w * 0.2, "#e2eaf8"); };
    const sx = POS.d6[0], sy = POS.d6[1];
    [[sx, sy + 30, 78], [sx - 36, sy + 42, 44], [sx + 40, sy + 44, 50], [sx - 58, sy + 6, 30], [sx + 56, sy - 4, 34]].forEach(([x, y, w]) => cloud(x, y, w));
    const isle = (x, y, w) => { g.fillStyle = "#5a4a3a"; g.beginPath(); g.moveTo(x - w / 2, y); g.lineTo(x + w / 2, y); g.lineTo(x + w * 0.15, y + w * 0.6); g.lineTo(x - w * 0.12, y + w * 0.52); g.closePath(); g.fill(); g.fillStyle = "#7a6a52"; g.beginPath(); g.moveTo(x - w / 2, y); g.lineTo(x, y); g.lineTo(x - w * 0.08, y + w * 0.4); g.closePath(); g.fill(); R(x - w / 2, y - 3, w, 4, "#8ac458"); R(x - w / 2, y, w, 1, "#4a7a2a"); };
    isle(sx, sy + 12, 54); isle(sx - 44, sy - 14, 20); isle(sx + 44, sy - 22, 18);
    R(sx - 13, sy - 8, 26, 20, "#f6f2e2"); tri(sx, sy - 8, 32, 11, "#ffd84a"); for (let i = 0; i < 4; i++) R(sx - 10 + i * 6, sy - 4, 2, 16, "#c8c0a0"); R(sx - 2, sy + 2, 4, 10, "#ffd84a"); circ(sx, sy - 18, 2, "#ffffff");
    [[sx - 26, sy - 28], [sx + 22, sy - 40], [sx - 30, sy + 4], [sx + 32, sy + 8]].forEach(([x, y]) => { R(x, y - 2, 1, 5, "#fff8c0"); R(x - 2, y, 5, 1, "#fff8c0"); });
    /* ── 異界の門（第7〜第9迷宮と外伝の島の上）── */
    const rift = (x, y, c1, c2) => {
      for (let k = 0; k < 4; k++) { g.strokeStyle = [c2, c1, "#ffffff", c1][k]; g.lineWidth = 1.5; g.beginPath(); g.ellipse(x, y - 9, 7 - k * 1.6, 9 - k * 2, 0, 0, TAU); g.stroke(); }
      R(x - 1, y - 10, 2, 2, "#ffffff");
    };
    rift(POS.d7[0] - 14, POS.d7[1] + 6, "#ff4f7a", "#6a1030");
    rift(POS.d8[0] + 15, POS.d8[1] + 6, "#7fd0ff", "#ff7a2a");
    rift(POS.d9[0] - 15, POS.d9[1] + 6, "#b06aff", "#2a1046");
    /* 外伝の島らしい小物 */
    const at = (k, dx, dy) => [POS[k][0] + dx, POS[k][1] + dy];
    { const [x, y] = at("d10", -12, 8); [[0, 0, "#e84a4a"], [8, 4, "#ff9a4a"], [-6, 6, "#e84a4a"], [14, -2, "#d03a8a"]].forEach(([ox, oy, col]) => { R(x + ox - 0.5, y + oy, 2, 4, "#f2dfb8"); ell(x + ox + 0.5, y + oy, 4, 2.4, col); R(x + ox - 1, y + oy - 1, 1, 1, "#fff"); }); }
    { const [x, y] = at("d11", -12, 6); for (let k = 0; k < 4; k++) { tri(x + k * 7, y + 4, 5, 10 + (k % 2) * 4, "#bfe8ff"); tri(x + k * 7 + 1, y + 4, 2, 8 + (k % 2) * 4, "#ffffff"); } }
    { const [x, y] = at("d12", 12, 6); R(x - 6, y - 2, 12, 4, "#3a1a10"); R(x - 4, y - 6, 8, 4, "#5a2a1a"); circ(x, y - 9, 3, "#ff7a2a"); circ(x, y - 10, 1.5, "#ffe06a"); for (let k = 0; k < 3; k++) circ(x + 1 + k, y - 15 - k * 4, 1.4 + k * 0.6, "rgba(90,70,80," + (0.5 - k * 0.12) + ")"); }
    { const [x, y] = at("d13", -14, 4); R(x - 6, y - 4, 12, 7, "#f6f2e2"); circ(x, y - 5, 6, "#e8e2d2"); g.fillStyle = "#c8c0a8"; g.fillRect(x - 1, y - 11, 2, 5); R(x - 5, y + 2, 10, 1, "#b8b09a"); }
    { const [x, y] = at("d14", 14, 4); for (let k = 0; k < 3; k++) { const tx = x + k * 7 - 6, ty = y + (k % 2) * 3; R(tx, ty - 2, 1, 5, "#5a3a28"); circ(tx, ty - 5, 4, "#ffb0d8"); circ(tx - 1, ty - 6, 2.5, "#ffd0e8"); } }
    { const [x, y] = at("d15", -14, 4); for (let k = 0; k < 4; k++) R(x - 6 + k * 4, y - 6 + (k % 2) * 3, 2, 8 - (k % 2) * 3, "rgba(200,230,240,.8)"); ell(x, y + 3, 10, 2, "rgba(255,255,255,.35)"); }
    /* ── 地図のふち（古い紙のよう）── */
    const vg = g.createRadialGradient(MW / 2, MH / 2, MH * 0.44, MW / 2, MH / 2, MW * 0.66);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(10,6,24,.34)");
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
      '<button class="st-pan l" data-a="stPan" data-v="-1" aria-label="地図を左へ">' + ic("back") + '</button><button class="st-pan r" data-a="stPan" data-v="1" aria-label="地図を右へ">' + ic("back") + "</button>" +
      '<div class="st-det scroll-y" id="stDet" hidden></div><div class="st-tip" id="stTip">迷宮をえらんでください<small>地図はドラッグで動かせます</small></div>';
    const ref = document.getElementById("run");
    ref.parentNode.insertBefore(s, ref);
    bindPan(s);
    return s;
  }
  /* ══ ★★ 2026-10-14 ご報告「クエスト選択で右側が表示されず、マップも動かせない」══
     地図（16:9）は画面を覆う大きさ（縦に長い画面ほど左右にはみ出す）のまま<b>まん中に固定</b>していたので、
     地図の右はしの第6〜第8迷宮と左はしの拠点の町が画面の外に出て、えらべなかった（10-12 に第7〜第9迷宮を右に足してから目立った）。
     → 地図を<b>ドラッグ（指・マウス）・ホイール・左右の矢印</b>で動かせるようにした（地図のはしで止まる）。
       開いたときは「いま挑戦中の迷宮」（ひらいていて、まだクリアしていない最初の迷宮）が見える位置から。
       迷宮をえらぶと、詳細の左の空きにくるよう動かす（いままでどおり）。 */
  const PAN = { x: 0, y: 0 };
  function detW() { const det = document.getElementById("stDet"); return det && !det.hidden ? det.getBoundingClientRect().width : 0; }
  function panSize() {
    const box = document.getElementById("wmBox"), st = document.getElementById("stages");
    return { W: box ? box.offsetWidth : 0, H: box ? box.offsetHeight : 0, vw: (st && st.clientWidth) || innerWidth, vh: (st && st.clientHeight) || innerHeight };
  }
  function panBounds(dw) {
    const z = panSize(), ox = Math.max(0, (z.W - z.vw) / 2), oy = Math.max(0, (z.H - z.vh) / 2);
    return { x0: -ox - (dw || 0), x1: ox, y0: -oy, y1: oy };
  }
  function panClamp(dw) { const b = panBounds(dw); PAN.x = Math.max(b.x0, Math.min(b.x1, PAN.x)); PAN.y = Math.max(b.y0, Math.min(b.y1, PAN.y)); }
  function panApply(anim) {
    const box = document.getElementById("wmBox"); if (!box) return;
    box.classList.toggle("drag", !anim);
    box.style.transform = "translate(" + Math.round(PAN.x) + "px," + Math.round(PAN.y) + "px)";
    /* 左右の矢印は、その向きにまだ動かせるときだけ */
    const s = document.getElementById("stages"); if (!s) return;
    const b = panBounds(detW());
    s.classList.toggle("pan-l", PAN.x < b.x1 - 2);
    s.classList.toggle("pan-r", PAN.x > b.x0 + 2);
  }
  /* いま挑戦中の迷宮（ひらいていて、まだクリアしていない最初の迷宮。全部クリアなら最後にひらいた迷宮） */
  function frontId() {
    const ds = D().DUNGEONS; let last = null;
    for (const d of ds) { if (!dunOpen(d)) continue; last = d.id; if (!(S().dun[d.id] && S().dun[d.id].clears)) return d.id; }
    return last;
  }
  function bindPan(s) {
    if (s.dataset.pan) return; s.dataset.pan = "1";
    let st = null, moved = false, killClick = -1e9;
    s.addEventListener("pointerdown", (e) => {
      if (e.button > 0) return;
      if (e.target.closest(".st-det, .st-top, .st-pan")) return;   /* 詳細の板・上のバー・矢印では動かさない */
      st = { id: e.pointerId, x: e.clientX, y: e.clientY, px: PAN.x, py: PAN.y }; moved = false;
    });
    s.addEventListener("pointermove", (e) => {
      if (!st || e.pointerId !== st.id) return;
      const dx = e.clientX - st.x, dy = e.clientY - st.y;
      /* 14px までは「押しただけ」（ma-ui.js の指で押した判定と同じ幅）＝迷宮をえらべる */
      if (!moved && Math.hypot(dx, dy) < 14) return;
      if (!moved) { moved = true; s.classList.add("panning"); try { s.setPointerCapture(e.pointerId); } catch (x) {} }
      PAN.x = st.px + dx; PAN.y = st.py + dy;
      panClamp(detW()); panApply(false);
      if (e.cancelable) e.preventDefault();
    });
    const end = (e) => {
      if (!st || (e && e.pointerId !== st.id)) return;
      if (moved) killClick = performance.now();
      st = null; moved = false; s.classList.remove("panning");
      const box = document.getElementById("wmBox"); if (box) box.classList.remove("drag");
    };
    s.addEventListener("pointerup", end); s.addEventListener("pointercancel", end);
    /* ドラッグのあとに来る click（マウス）で迷宮をえらばないように */
    s.addEventListener("click", (e) => { if (performance.now() - killClick < 350) { e.preventDefault(); e.stopPropagation(); } }, true);
    s.addEventListener("wheel", (e) => {
      if (e.target.closest(".st-det")) return;
      e.preventDefault();
      const b = panBounds(0), onlyX = b.y1 - b.y0 < 2;
      const dx = e.shiftKey ? e.deltaY : e.deltaX, dy = e.shiftKey ? 0 : e.deltaY;
      /* 横にだけはみ出す地図（縦長・ふつうの画面）は、縦のホイールでも横に動かす */
      if (onlyX) PAN.x -= (Math.abs(dx) > Math.abs(dy) ? dx : dy); else { PAN.x -= dx; PAN.y -= dy; }
      panClamp(detW()); panApply(false);
    }, { passive: false });
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
    if (id) select(id); else { sel = null; $("#stDet").hidden = true; s.classList.remove("det"); requestAnimationFrame(() => focusMap(null, false)); }
    /* 案内（迷宮をえらんでください・地図はドラッグで動かせます）は開くたびに出して、少しして消す */
    const tp = $("#stTip"); if (tp) { tp.classList.remove("show"); void tp.offsetWidth; tp.classList.add("show"); }
    MA.Audio.bgm("guild");
  }
  function hide() { const s = document.getElementById("stages"); if (s) s.classList.remove("det"); }
  function renderCur() { $("#stCur").innerHTML = ic("gold") + "<b>" + fmt(S().gold) + "</b>"; }
  /* ★★ 2026-10-28 道はなめらかな曲線（Catmull-Rom → 3次ベジエ）。外伝は海の上をゆるく弧をえがく */
  function smoothPath(pts) {
    if (!pts.length) return "";
    let s = "M" + pts[0][0] + " " + pts[0][1];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2, t = 0.17;
      const c1 = [p1[0] + (p2[0] - p0[0]) * t, p1[1] + (p2[1] - p0[1]) * t], c2 = [p2[0] - (p3[0] - p1[0]) * t, p2[1] - (p3[1] - p1[1]) * t];
      s += " C" + c1.map((v) => v.toFixed(1)).join(" ") + " " + c2.map((v) => v.toFixed(1)).join(" ") + " " + p2.join(" ");
    }
    return s;
  }
  function arcPath(a, b) {
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    const k = 0.18 * L, cx = mx - dy / L * k, cy = my + dx / L * k;
    return "M" + a[0] + " " + a[1] + " Q" + cx.toFixed(1) + " " + cy.toFixed(1) + " " + b[0] + " " + b[1];
  }
  function renderNodes() {
    const box = $("#wmNodes");
    const ds = D().DUNGEONS;
    /* ★★ 2026-10-27 本編の道は本編の迷宮だけで数える（外伝が開いていても、本編の道を先まで明るくしない） */
    let lastOpen = 0;
    ROUTE.slice(1).forEach((k, i) => { const d = D().DUN[k]; if (d && dunOpen(d)) lastOpen = i + 1; });
    const pts = ROUTE.map((k) => POS[k]);
    const path = (dd, cls) => '<path class="' + cls + '" d="' + dd + '" />';
    $("#wmRoute").innerHTML = path(smoothPath(pts), "rt-base") + path(smoothPath(pts), "rt-all") + (lastOpen ? path(smoothPath(pts.slice(0, lastOpen + 1)), "rt-open") : "") +
      SIDE_ROUTE.filter(([a, b]) => POS[a] && POS[b] && D().DUN[b]).map(([a, b]) => path(arcPath(POS[a], POS[b]), "rt-all rt-side" + (dunOpen(D().DUN[b]) ? " rt-open" : ""))).join("");
    const pos = (k) => "left:" + (POS[k][0] / MW * 100).toFixed(3) + "%;top:" + (POS[k][1] / MH * 100).toFixed(3) + "%";
    let h = '<div class="wm-node town lb-' + (LB.town || "d") + '" style="' + pos("town") + '"><i class="wn-md">' + ic("home") + '</i><span class="wn-lb"><small>拠点</small>拠点の町</span></div>';
    ds.forEach((d) => {
      if (!POS[d.id]) return;
      const open = dunOpen(d), dr = S().dun[d.id] || {}, hr = dr.hard || {};
      const cls = "wm-node lb-" + (LB[d.id] || "d") + (d.side ? " side" : "") + (open ? "" : " lock") + (dr.clears ? " clr" : open ? " new" : "") + (hr.clears ? " hclr" : "") + (sel === d.id ? " sel" : "");
      const no = '<b class="wn-no">' + d.no + "</b>";
      h += '<button class="' + cls + '" style="' + pos(d.id) + ";--c:" + d.c + '" data-a="stSel" data-v="' + d.id + '" aria-label="' + esc((d.side ? "外伝・" : "") + "第" + d.no + "迷宮 " + d.nm) + '">' +
        '<i class="wn-md">' + (open ? no + (dr.clears ? '<em class="wn-ck">' + ic("check") + "</em>" : "") : '<em class="wn-lk">' + ic("lock") + "</em>") + "</i>" +
        (open && !dr.clears ? '<em class="wn-new">NEW</em>' : "") +
        '<span class="wn-lb"><small>' + (d.side ? "外伝・" : "") + "第" + d.no + "迷宮" + (hr.clears ? ' <em class="hd">HARD</em>' : "") + "</small>" + esc(d.nm) + "</span>" +
        /* ボスの影は、ひらいている迷宮だけ（鍵の迷宮まで出すと地図がごちゃごちゃする） */
        (open ? '<canvas class="wm-boss" width="40" height="40" data-boss="' + d.boss + '"' + (S().codex.boss[d.boss] ? "" : ' data-hide="1"') + "></canvas>" : "") + "</button>";
    });
    box.innerHTML = h;
    box.querySelectorAll(".wm-boss").forEach((c) => {
      const B = D().BOSSES[c.dataset.boss]; const f = MA.Art.sprite(B.art).frames[0];
      const g = c.getContext("2d"); g.imageSmoothingEnabled = false; const k = Math.min(40 / f.width, 40 / f.height);
      g.drawImage(f, (40 - f.width * k) / 2, 40 - f.height * k, f.width * k, f.height * k);
      if (c.dataset.hide) c.style.filter = "brightness(0) drop-shadow(0 0 2px rgba(255,255,255,.5))";
    });
    /* 名札の大きさは地図の大きさに合わせる（小さい画面で重ならないように） */
    try { const wb = document.getElementById("wmBox"); if (wb) wb.style.setProperty("--ms", (wb.offsetWidth / MW).toFixed(3)); } catch (e) {}
  }
  /* 選んだ迷宮が詳細の左の空きにくるよう、地図をずらす（id が無いときは、いま挑戦中の迷宮が画面のまん中あたりに）
     ★★ 2026-10-14 ずらし方は PAN（ドラッグと同じ値）に一本化。地図のはしより外へは出さない */
  function focusMap(id, anim) {
    const k = id || frontId();
    const dw = id ? detW() : 0;
    if (k && POS[k]) {
      const z = panSize();
      const nx = (z.vw - z.W) / 2 + POS[k][0] / MW * z.W, ny = (z.vh - z.H) / 2 + POS[k][1] / MH * z.H;
      PAN.x = (z.vw - dw) / 2 - nx; PAN.y = z.vh / 2 - ny;
    } else { PAN.x = 0; PAN.y = 0; }
    panClamp(dw); panApply(anim !== false);
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
    const recLv = Math.min(60, d.rec.lv + (MD.recAdd || 0)), recPw = D().recOf(d, diff);
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
      '<div class="sd-h"><small>' + (d.side ? "外伝・" : "") + "第" + d.no + "迷宮・" + esc(d.en) + "</small><b>" + esc(d.nm) + '</b><div><span class="stars">' + "★".repeat(d.stars) + "<i>" + "★".repeat(Math.max(0, 6 - d.stars)) + "</i></span><em>" + esc(d.diff) + "</em>" + '<span class="sd-elb">' + ic("el_" + d.el) + D().ELEM[d.el].nm + "属性が多い</span></div></div>" +
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
  window.addEventListener("resize", () => { if (document.body.dataset.scr !== "stages") return; if (sel) focusMap(sel); else { panClamp(0); panApply(false); } });

  /* ══ ボタン ══ */
  const A = MA.UI.ACT;
  A.stBack = () => { MA.Guild.enter(); };
  A.stSel = (b) => { const d = D().DUN[b.dataset.v]; if (!d) return; MA.Audio.sfx(dunOpen(d) ? "click" : "error"); select(d.id); };
  /* ★★ 2026-10-14 詳細を閉じたときは、いまの位置のまま（はしだけ合わせる） */
  A.stClose = () => { sel = null; $("#stDet").hidden = true; $("#stages").classList.remove("det"); renderNodes(); panClamp(0); panApply(true); };
  /* 左右の矢印：画面の幅の半分ずつ */
  A.stPan = (b) => { const z = panSize(); PAN.x -= (Number(b.dataset.v) || 0) * z.vw * 0.5; panClamp(detW()); panApply(true); };
  A.stDiff = (b) => { const d = D().DUN[sel]; if (b.dataset.v === "hard" && !hardOpen(d)) return; diff = b.dataset.v; renderDet(); };
  A.claimTime = (b) => {
    const n = MA.Prog.claimTime(b.dataset.v);
    MA.UI.toast(n > 0 ? "ジェム ×" + n + " を受け取りました" : "受け取りずみです（ほかの端末で受け取った分）", n > 0 ? "#5ad8ff" : "#c8c8d8");
    if (document.body.dataset.scr === "stages") renderDet();
    MA.Guild && MA.Guild.refreshTop && MA.Guild.refreshTop();
  };
  /* ★★ 2026-10-27 出発キャラを変えたとき、開いている詳細（敵との相性・戦力）を描き直す */
  function refreshDet() { const s = document.getElementById("stages"); if (s && s.classList.contains("det") && sel && document.body.dataset.scr === "stages") renderDet(); }
  MA.Stages = { open, hide, select, POS, paint, refreshDet };
})();
