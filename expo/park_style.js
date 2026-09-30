/* ══════════════════════════════════════════════════════════════════
   XEVARION PARK — 街並みのスタイル（★★ 2026-09-29 ご指定「妖怪ウォッチの妖魔シティ風＋未来建築」）
   ------------------------------------------------------------------
   参考にした雰囲気（ゲームの公式の紹介と、いただいた画像から）：豪華絢爛で少し不思議な繁華街・大きな門・横丁の食べ物屋・
   ネオンの漢字看板・赤い提灯・れんがの高架とアーチ・赤い太鼓橋・桜並木・紫がかった道路とピンクの線・オレンジの歩道・
   青緑の2灯の街灯・かわらや丸い屋根の色とりどりの店・屋根に大きな目・屋根の上の大きな食べ物。
   ★ 建物・キャラクター・ロゴ・看板の文字はすべてオリジナル（既存の作品のものは使わない）。未来の建築（ガラスのキューブ・
     ねじれた塔・光の輪・ホログラム）とまぜる。
   ・このファイルは「部品」だけ（道・街灯・提灯・店・屋根・目・大きな食べ物・門・塔・高架・太鼓橋・ネオン・ガラスのキューブ…）。
     置く場所は park_areas*.js。
   ══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const T = THREE, X = XTex, P = XWorld.World.prototype, TAU = Math.PI * 2;
  const XP = XPark;

  /* ══════════════ 材質（手続きテクスチャ） ══════════════ */
  const tcache = {};
  function T2(key, size, draw, srgb) {
    if (tcache[key]) return tcache[key];
    const c = X.cv(size[0], size[1]), g = c.getContext("2d"); draw(g, c.width, c.height, X.rnd(key.length * 131 + key.charCodeAt(0) * 7 + 5));
    const t = X.tex(c, null, srgb); t.wrapS = t.wrapT = T.RepeatWrapping; return (tcache[key] = t);
  }
  const shade = (c, f) => { const k = new T.Color(c); k.multiplyScalar(f); return "#" + k.getHexString(); };
  const FONT = "'M PLUS Rounded 1c','Hiragino Sans','Yu Gothic','Noto Sans JP',sans-serif";

  /* かわら（瓦）：丸い瓦の縦の筋と段 */
  function kawaraTex(key, base) {
    return T2("kw" + key, [256, 256], (g, w, h, r) => {
      g.fillStyle = shade(base, 0.7); g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 32) for (let x = 0; x < w; x += 21.33) {
        const gr = g.createLinearGradient(x, 0, x + 21.33, 0); gr.addColorStop(0, shade(base, 0.62)); gr.addColorStop(0.5, shade(base, 1.08 + r() * 0.06)); gr.addColorStop(1, shade(base, 0.62));
        g.fillStyle = gr; g.fillRect(x + 1, y, 19.3, 30);
        g.fillStyle = shade(base, 1.2); g.beginPath(); g.ellipse(x + 10.7, y + 29, 8.5, 3.2, 0, 0, TAU); g.fill();
      }
      g.fillStyle = "rgba(0,0,0,.25)"; for (let y = 30; y < h; y += 32) g.fillRect(0, y + 2, w, 2);
    });
  }
  /* 色とりどりの外壁：縦の板・丸窓とアーチ窓（夜は明かり）・階の間の梁。1枚＝横 10.5m × 縦 10.5m（3階ぶん） */
  function yomaFacade(key, wall, beam, win) {
    const S = 512, F = S / 3, cols = 4, Wd = S / cols;
    const cm = X.cv(S, S), ce = X.cv(S, S), g = cm.getContext("2d"), e = ce.getContext("2d"), r = X.rnd(key.length * 77 + 13);
    g.fillStyle = wall; g.fillRect(0, 0, S, S); e.fillStyle = "#000"; e.fillRect(0, 0, S, S);
    for (let x = 0; x < S; x += 16) { g.fillStyle = shade(wall, 0.9 + r() * 0.16); g.fillRect(x, 0, 15, S); g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(x + 15, 0, 1, S); }
    for (let f = 0; f < 3; f++) {
      g.fillStyle = beam; g.fillRect(0, f * F + F - 14, S, 14); g.fillStyle = "rgba(255,255,255,.18)"; g.fillRect(0, f * F + F - 14, S, 2);
      for (let i = 0; i < cols; i++) {
        const cx = i * Wd + Wd / 2, cy = f * F + F * 0.45, round = (i + f) % 3 === 0, ww = Wd * 0.5, hh = F * 0.5;
        g.fillStyle = beam;
        if (round) { g.beginPath(); g.arc(cx, cy, ww * 0.55, 0, TAU); g.fill(); } else { g.fillRect(cx - ww / 2 - 5, cy - hh / 2 - 5, ww + 10, hh + 10); }
        const gr = g.createLinearGradient(0, cy - hh / 2, 0, cy + hh / 2); gr.addColorStop(0, win || "#9ad0e8"); gr.addColorStop(1, "#2a3a52"); g.fillStyle = gr;
        g.beginPath(); if (round) g.arc(cx, cy, ww * 0.46, 0, TAU); else { g.moveTo(cx - ww / 2, cy + hh / 2); g.lineTo(cx - ww / 2, cy - hh / 4); g.arc(cx, cy - hh / 4, ww / 2, Math.PI, 0); g.lineTo(cx + ww / 2, cy + hh / 2); } g.fill();
        g.strokeStyle = "rgba(255,255,255,.5)"; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, cy - hh / 2); g.lineTo(cx, cy + hh / 2); g.moveTo(cx - ww / 2, cy); g.lineTo(cx + ww / 2, cy); g.stroke();
        if (r() < 0.55) { e.fillStyle = r() < 0.7 ? "rgb(255,205,140)" : "rgb(255,170,110)"; e.beginPath(); if (round) e.arc(cx, cy, ww * 0.46, 0, TAU); else { e.moveTo(cx - ww / 2, cy + hh / 2); e.lineTo(cx - ww / 2, cy - hh / 4); e.arc(cx, cy - hh / 4, ww / 2, Math.PI, 0); e.lineTo(cx + ww / 2, cy + hh / 2); } e.fill(); }
      }
    }
    const map = X.tex(cm), emi = X.tex(ce); [map, emi].forEach((t) => { t.wrapS = t.wrapT = T.RepeatWrapping; });
    const m = new T.MeshStandardMaterial({ map, emissiveMap: emi, emissive: new T.Color(0xffffff), emissiveIntensity: 0, roughness: 0.66, metalness: 0.02 });
    m.envMapIntensity = 0.45; return m;
  }
  /* 提灯の紙（横の骨・上下の黒い帯・まん中に文字）。夜は中から光る */
  function lanternTex(key, paper, text, ink) {
    return T2("ln" + key, [256, 256], (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, shade(paper, 0.72)); gr.addColorStop(0.5, shade(paper, 1.05)); gr.addColorStop(1, shade(paper, 0.72));
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      for (let y = 8; y < h; y += 14) { g.fillStyle = "rgba(0,0,0,.2)"; g.fillRect(0, y, w, 2); g.fillStyle = "rgba(255,255,255,.12)"; g.fillRect(0, y + 2, w, 1); }
      g.fillStyle = "#141418"; g.fillRect(0, 0, w, 14); g.fillRect(0, h - 14, w, 14);
      if (text) { g.fillStyle = ink || "#111"; let fs = 110; g.font = "900 " + fs + "px " + FONT; const tw = g.measureText(text).width; if (tw > w * 0.44) fs *= w * 0.44 / tw; g.font = "900 " + fs + "px " + FONT; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, w / 2, h / 2 + 4); }
    });
  }
  /* のれん（3本の布・文字） */
  function norenTex(key, cloth, text) {
    return T2("nr" + key, [256, 128], (g, w, h) => {
      g.fillStyle = cloth; g.fillRect(0, 0, w, h);
      g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(w / 3 - 2, 26, 4, h); g.fillRect(w * 2 / 3 - 2, 26, 4, h);
      g.fillStyle = shade(cloth, 0.7); g.fillRect(0, 0, w, 22);
      g.fillStyle = "#fff"; g.font = "900 58px " + FONT; g.textAlign = "center"; g.textBaseline = "middle";
      [...String(text || "")].slice(0, 3).forEach((ch, i) => g.fillText(ch, w / 6 + i * w / 3, 76));
    });
  }

  const wrapBase = P.parkMaterials;
  P.parkMaterials = function () { wrapBase.call(this); this.styleMaterials(); };
  P.styleMaterials = function () {
    const w = this, m = w.m;
    const std = (o, env) => { const x = new T.MeshStandardMaterial(o); x.envMapIntensity = env != null ? env : 0.45; return x; };
    const flat = (mm) => { mm.polygonOffset = true; mm.polygonOffsetFactor = -1; mm.polygonOffsetUnits = -2; return mm; };
    /* 道：紫がかったアスファルト・オレンジの歩道・クリームの広場 */
    m.roadY = flat(std({ map: T2("roadY", [256, 256], (g, W, H, r) => { g.fillStyle = "#8a84bd"; g.fillRect(0, 0, W, H); for (let i = 0; i < 9000; i++) { const v = r(); g.fillStyle = v < 0.5 ? "rgba(255,255,255," + (r() * 0.07) + ")" : "rgba(40,30,90," + (r() * 0.08) + ")"; g.fillRect(r() * W, r() * H, 1.5, 1.5); } for (let i = 0; i < 5; i++) { g.fillStyle = "rgba(60,50,110,.06)"; g.fillRect(r() * W, r() * H, 30 + r() * 60, 20 + r() * 40); } }), roughness: 0.82 }, 0.35));
    m.walkY = flat(std({ map: T2("walkY2", [256, 256], (g, W, H, r) => { g.fillStyle = "#dc9d3e"; g.fillRect(0, 0, W, H); for (let y = 0; y < H; y += 32) for (let x = (y / 32) % 2 ? -16 : 0; x < W; x += 32) { g.fillStyle = shade(["#f2b64c", "#eeb048", "#f5bd57", "#f0b24a"][Math.floor(r() * 4)], 0.97 + r() * 0.06); g.fillRect(x + 1, y + 1, 30, 30); g.fillStyle = "rgba(255,255,255,.1)"; g.fillRect(x + 1, y + 1, 30, 2); for (let k = 0; k < 10; k++) { g.fillStyle = "rgba(120,70,20," + (r() * 0.07) + ")"; g.fillRect(x + 1 + r() * 29, y + 1 + r() * 29, 1.5, 1.5); } } }), roughness: 0.78 }, 0.3));
    m.walkCream = flat(std({ map: T2("walkCream2", [256, 256], (g, W, H, r) => { g.fillStyle = "#e2c48a"; g.fillRect(0, 0, W, H); for (let y = 0; y < H; y += 21.33) for (let x = (Math.round(y / 21.33) % 2) ? -21.33 : 0; x < W; x += 42.67) { g.fillStyle = shade(["#f6dc9e", "#f3d592", "#f8e2ac"][Math.floor(r() * 3)], 0.97 + r() * 0.05); g.fillRect(x + 1, y + 1, 40.6, 19.3); } }), roughness: 0.75 }, 0.3));
    m.linePink = flat(std({ color: 0xff8cc6, roughness: 0.6 }, 0.2)); m.lineWhite = flat(std({ color: 0xf6f6f2, roughness: 0.6 }, 0.2)); m.lineYellow = flat(std({ color: 0xffd64a, roughness: 0.6 }, 0.2));
    m.brickWall = std({ map: T2("brickW", [256, 256], (g, W, H, r) => { g.fillStyle = "#6a3226"; g.fillRect(0, 0, W, H); for (let y = 0; y < H; y += 16) for (let x = (y / 16) % 2 ? -16 : 0; x < W; x += 32) { g.fillStyle = shade("#a4503a", 0.8 + r() * 0.32); g.fillRect(x + 1.5, y + 1.5, 29, 13); } }), roughness: 0.85 });
    m.stoneStep = std({ map: T2("stoneStep", [256, 256], (g, W, H, r) => { g.fillStyle = "#8c8a86"; g.fillRect(0, 0, W, H); for (let y = 0; y < H; y += 32) for (let x = (y / 32) % 2 ? -32 : 0; x < W; x += 64) { g.fillStyle = shade("#b6b2aa", 0.85 + r() * 0.2); g.fillRect(x + 2, y + 2, 60, 28); } }), roughness: 0.85 });
    /* 瓦・外壁・提灯・のれん */
    [["kwB", "#3e4a6e"], ["kwG", "#3f8c5a"], ["kwR", "#b5553a"], ["kwP", "#6a4aa0"], ["kwK", "#2e3036"], ["kwO", "#d8862e"], ["kwT", "#2a8a8a"]].forEach(([k, c]) => { m[k] = std({ map: kawaraTex(k, c), roughness: 0.55, metalness: 0.15 }, 0.6); });
    const fac = (k, wall, beam, win) => { const mm = yomaFacade(k, wall, beam, win); m[k] = mm; w.nightMats.push({ m: mm, day: 0, night: 1.4 }); };
    fac("yRed", "#c4473a", "#4a2a22"); fac("yTeal", "#2f9c95", "#23413e"); fac("yYellow", "#e6b43c", "#5a3a1e"); fac("yPurple", "#6f4c9e", "#2e2248");
    fac("yGreen", "#4c8c4a", "#243a22"); fac("yBrown", "#8a5a3a", "#3a2418"); fac("yCream", "#efe0bc", "#5a3a28"); fac("yPink", "#e27aa0", "#4a2238"); fac("yBlue", "#3f6ec8", "#1e2a4a"); fac("yOrange", "#e8823a", "#4a2a18");
    const lan = (k, paper, text, ink, day, night) => { const t = lanternTex(k, paper, text, ink); const mm = new T.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: new T.Color(1, 0.62, 0.38), emissiveIntensity: 0.2, roughness: 0.7 }); m[k] = mm; w.nightMats.push({ m: mm, day: day != null ? day : 0.18, night: night || 1.7 }); };
    lan("lanR", "#e33a2c", "祭"); lan("lanR2", "#e33a2c", "夢"); lan("lanR3", "#e33a2c", "XEVA", "#111"); lan("lanW", "#fbf2dc", "星", "#c8282a", 0.25, 1.6); lan("lanY", "#f2c040", "楽", "#8a1a1a"); lan("lanP", "#e05aa0", "遊", "#1a0a2a");
    lan("lanBig", "#e0342a", "XEVARION", "#111");
    const nor = (k, cloth, text) => { m[k] = std({ map: norenTex(k, cloth, text), roughness: 0.9, side: T.DoubleSide }, 0.2); };
    nor("norB", "#243a7a", "食事処"); nor("norR", "#b8262a", "甘味処"); nor("norK", "#1e1e24", "居酒屋"); nor("norG", "#2a6a3a", "茶屋"); nor("norP", "#7a2a8a", "遊技場"); nor("norO", "#c8601a", "焼き物");
    /* 色だけの材質（頂点の色にまとめる） */
    const col = (c, r, mt, fam) => { const mm = std({ color: c, roughness: r != null ? r : 0.55, metalness: mt || 0 }); mm.userData.vc = { fam: fam || "vcStd", mat: m[fam || "vcStd"], color: mm.color.clone() }; return mm; };
    Object.assign(m, {
      tealMetal: col(0x2aa89a, 0.35, 0.55, "vcMetal"), woodRed: col(0xd4402a, 0.45), woodDark2: col(0x3a2820, 0.7), creamW: col(0xf6ecd6, 0.6), lanternCap: col(0x17171c, 0.5),
      eyeW: col(0xfbfbf6, 0.22), eyeB: col(0x141018, 0.3), irisA: col(0x2a8cff, 0.3), irisB: col(0xff6a2a, 0.3), irisC: col(0x9a4aff, 0.3), irisD: col(0x1ec070, 0.3), irisE: col(0xffc81e, 0.3),
      propTan: col(0xd99f52, 0.6), propBrown: col(0x6e361a, 0.5), propPink: col(0xff8ab8, 0.5), propMint: col(0x8fe8c8, 0.5), propCream: col(0xfff0d0, 0.55), propRed: col(0xe0302a, 0.45),
      propGreen: col(0x4aa840, 0.6), propWhite: col(0xfdfdfb, 0.5), propBlack: col(0x131418, 0.5), propYellow: col(0xffd84a, 0.5), propSalmon: col(0xff8a5a, 0.4), propChoco: col(0x4a2616, 0.45),
      goldOrn: col(0xf2c04a, 0.25, 0.9, "vcGloss"), glassCube: (function () { const mm = new T.MeshStandardMaterial({ color: 0x5ab8d0, roughness: 0.05, metalness: 0.85 }); mm.envMapIntensity = 1.6; return mm; })()
    });
    /* 光るもの（夜は明るく） */
    const glow = (key, hex, day, night) => { const mm = new T.MeshBasicMaterial({ color: hex, toneMapped: false }); m[key] = mm; w.nightMats.push({ m: mm, base: new T.Color(hex), day, night }); mm.userData.vc = { fam: "vcGlow", mat: m.vcGlow, color: mm.color.clone() }; };
    glow("lampY", 0xeaff9a, 1.0, 3.6); glow("lanGlow", 0xff7a4a, 0.9, 3.2); glow("holoBlue", 0x6ae0ff, 1.0, 2.6); glow("eyeHi", 0xffffff, 1.2, 2.2);
  };

  /* ══════════════ 形の小道具 ══════════════ */
  function bx(w, h, d, uvS) {
    const g = new T.BoxGeometry(w, h, d);
    if (uvS) { const uv = g.attributes.uv, n = g.attributes.normal; for (let i = 0; i < uv.count; i++) { const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i)); const sx = nx > 0.5 ? d : w, sy = ny > 0.5 ? d : h; uv.setXY(i, uv.getX(i) * sx / uvS, uv.getY(i) * sy / uvS); } }
    return g;
  }
  const at = (g, x, y, z) => g.translate(x, y, z);
  /* 屋根：寄棟の瓦屋根（軒がそり返る2段）。w×d の建物の上（y=top） */
  function kawaraRoof(w, d, rh, eave) {
    eave = eave == null ? 0.9 : eave;
    const s2 = Math.SQRT1_2, sq = (d + eave * 2) / (w + eave * 2);
    const low = new T.CylinderGeometry((w * 0.78) * s2, (w + eave * 2) * s2, rh * 0.28, 4, 1).rotateY(Math.PI / 4).scale(1, 1, sq).translate(0, rh * 0.14, 0);
    const up = new T.ConeGeometry((w * 0.8) * s2, rh * 0.8, 4, 1).rotateY(Math.PI / 4).scale(1, 1, sq).translate(0, rh * 0.28 + rh * 0.4, 0);
    [low, up].forEach((g) => { const uv = g.attributes.uv, p = g.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, (p.getX(i) + p.getZ(i)) / 3, p.getY(i) / 2.2); });
    return XWorld.mergeGeos([low, up]);
  }

  /* ══════════════ 道（紫のアスファルト・ピンクの中央線・白線・オレンジの歩道・横断歩道） ══════════════ */
  /* pts（折れ線）, o = { road 車道の幅, walk 歩道の幅, center "pink"|"white"|"none", cross 両はしの横断歩道, lamps, trees "sakura"|false, lanterns 提灯の列, noCars } */
  P.yomaStreet = function (pts, o) {
    o = o || {};
    const W = this, sp = XP.smoothPts(pts, 3), rw = o.road || 12, ww = o.walk == null ? 5 : o.walk, y = 0.02;
    const off = (d) => sp.map((p, i) => { const a = sp[Math.max(0, i - 1)], b = sp[Math.min(sp.length - 1, i + 1)]; let dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz) || 1; return [p[0] - dz / l * d, p[1] + dx / l * d]; });
    W.batch.add("roadY", W.m.roadY, XP.ribbon(sp, rw, y, 6), new T.Matrix4());
    for (let i = 0; i < sp.length - 1; i++) W.roads.push([sp[i][0], sp[i][1], sp[i + 1][0], sp[i + 1][1], rw + ww * 2]);
    (W.streets = W.streets || []).push({ pts: sp, w: rw + ww * 2 });          /* ★ 2026-09-30 行き止まりの判定に使う */
    /* 白い路側線・中央線（ピンクの破線） */
    W.detail(() => {
      [-1, 1].forEach((s) => W.batch.add("lineWhite", W.m.lineWhite, XP.ribbon(off(s * (rw / 2 - 0.45)), 0.18, y + 0.01, 2), new T.Matrix4(), true));
      if (o.center !== "none") { const key = o.center === "white" ? "lineWhite" : "linePink"; let acc = 0; for (let i = 0; i < sp.length - 1; i++) { const a = sp[i], b = sp[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]); acc += L; if (Math.floor(acc / 4.5) % 2 === 0) continue; const g = new T.PlaneGeometry(0.2, L * 0.95); g.rotateX(-Math.PI / 2); g.rotateY(Math.atan2(b[0] - a[0], b[1] - a[1])); W.batch.add(key, W.m[key], g, new T.Matrix4().makeTranslation((a[0] + b[0]) / 2, y + 0.012, (a[1] + b[1]) / 2), true); } }
    });
    /* 歩道・縁石 */
    if (ww > 0) [-1, 1].forEach((s) => {
      const c = off(s * (rw / 2 + ww / 2)); W.batch.add("walkY", W.m.walkY, XP.ribbon(c, ww, y + 0.004, 4), new T.Matrix4());
      W.batch.add("stoneW", W.m.stoneW, XP.ribbon(off(s * (rw / 2 + 0.12)), 0.3, y + 0.09, 2), new T.Matrix4(), true);
      W.walkPaths.push({ pts: c, w: ww });
    });
    (W.paved = W.paved || []);
    /* 横断歩道（両はし） */
    if (o.cross !== false) W.detail(() => [0, sp.length - 1].forEach((i) => { const a = sp[Math.max(0, i - 1)], b = sp[Math.min(sp.length - 1, i + 1)], ang = Math.atan2(b[0] - a[0], b[1] - a[1]), [px, pz] = sp[i], dir = i ? -1 : 1, cx = px + Math.sin(ang) * dir * 3, cz = pz + Math.cos(ang) * dir * 3; for (let k = -Math.floor(rw / 1.6) / 2; k <= Math.floor(rw / 1.6) / 2; k++) { const g = new T.PlaneGeometry(0.7, 3.2); g.rotateX(-Math.PI / 2); g.rotateY(ang); W.batch.add("lineWhite", W.m.lineWhite, g, new T.Matrix4().makeTranslation(cx + Math.cos(ang) * k * 1.4, y + 0.013, cz - Math.sin(ang) * k * 1.4), true); } }));
    /* 街灯・桜・提灯（歩道の外側） */
    const cum = [0]; for (let i = 1; i < sp.length; i++) cum.push(cum[i - 1] + Math.hypot(sp[i][0] - sp[i - 1][0], sp[i][1] - sp[i - 1][1]));
    const total = cum[cum.length - 1], at2 = (d) => { let i = 1; while (i < sp.length - 1 && cum[i] < d) i++; const t = (d - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]), dx = sp[i][0] - sp[i - 1][0], dz = sp[i][1] - sp[i - 1][1], l = Math.hypot(dx, dz) || 1; return [sp[i - 1][0] + dx * t, sp[i - 1][1] + dz * t, dx / l, dz / l]; };
    const edge = rw / 2 + (ww > 0 ? ww - 0.9 : 1.2);
    if (o.lamps !== false) for (let d = 10, k = 0; d < total - 6; d += o.lampEvery || 24, k++) { const [x, z, dx, dz] = at2(d); const s = k % 2 ? 1 : -1; W.yomaLamp(x - dz * s * edge, z + dx * s * edge, Math.atan2(dx, dz)); }
    if (o.trees !== false) for (let d = 18, k = 0; d < total - 8; d += o.treeEvery || 16, k++) { const [x, z, dx, dz] = at2(d); [-1, 1].forEach((s) => { const px = x - dz * s * (edge + 0.1), pz = z + dx * s * (edge + 0.1); W.detail(() => { W.box("stoneW", px, 0, pz, 1.6, 0.45, 1.6); W.box("soilDark", px, 0.45, pz, 1.3, 0.02, 1.3); }); W.colliders.push({ x0: px - 0.8, z0: pz - 0.8, x1: px + 0.8, z1: pz + 0.8 }); W.plant(o.trees === "oak" ? "oak" : k % 5 === 4 ? "flowerTree" : "sakura", px, pz, 0.8 + (k % 3) * 0.08); }); }
    if (o.lanterns) for (let d = 14; d < total - 10; d += 12) { const [x, z, dx, dz] = at2(d); W.lanternString(x - dz * edge, z + dx * edge, x + dz * edge, z - dx * edge, 6.2, 7, d); }
    return sp;
  };
  /* 青緑の2灯の街灯（オリジナル） */
  P.yomaLamp = function (x, z, ry) {
    const W = this, c = Math.cos(ry || 0), s = Math.sin(ry || 0);
    W.detail(() => {
      W.geo("tealMetal", new T.CylinderGeometry(0.14, 0.2, 0.5, 8), x, 0.25, z);
      W.geo("tealMetal", new T.CylinderGeometry(0.06, 0.09, 4.8, 8), x, 2.9, z);
      W.geo("tealMetal", new T.SphereGeometry(0.12, 8, 6), x, 5.35, z);
      [-1, 1].forEach((k) => {
        const ax = x + c * k * 0.55, az = z - s * k * 0.55;
        const arm = new T.CylinderGeometry(0.035, 0.035, 0.62, 5).rotateZ(Math.PI / 2 - k * 0.25).rotateY(ry || 0); W.geo("tealMetal", arm, (x + ax) / 2, 5.2, (z + az) / 2);
        W.geo("tealMetal", new T.CylinderGeometry(0.1, 0.05, 0.12, 8), ax, 5.26, az);
        W.geo("lampY", new T.SphereGeometry(0.2, 10, 8), ax, 5.08, az);
      });
    });
    W.colCircle(x, z, 0.2); W.lamps.push([x, z]);
  };
  /* 提灯（赤い紙・黒いふた）。y は下のはし */
  P.lantern = function (x, y, z, s, key, ry) {
    const W = this; s = s || 1;
    const prof = []; for (let i = 0; i <= 10; i++) { const t = i / 10; prof.push(new T.Vector2(0.3 * s + 0.16 * s * Math.sin(Math.PI * t), t * 0.95 * s)); }
    const g = new T.LatheGeometry(prof, 14).rotateY(Math.PI + (ry || 0));
    W.geo(key || "lanR", g, x, y + 0.08 * s, z);
    W.geo("lanternCap", new T.CylinderGeometry(0.26 * s, 0.26 * s, 0.1 * s, 12), x, y + 0.04 * s, z);
    W.geo("lanternCap", new T.CylinderGeometry(0.26 * s, 0.26 * s, 0.1 * s, 12), x, y + 1.08 * s, z);
    W.geo("lanternCap", new T.CylinderGeometry(0.02, 0.02, 0.35 * s, 4), x, y + 1.3 * s, z);
  };
  /* 提灯の列（2点のあいだにたるませて） */
  /* そこに高さ h までの建物・柱があるか（提灯のひもを結べるか） */
  P.anchorAt = function (x, z, h) {
    const segD = (px, pz, ax, az, bx, bz) => { const vx = bx - ax, vz = bz - az, l2 = vx * vx + vz * vz || 1; let t = ((px - ax) * vx + (pz - az) * vz) / l2; t = Math.max(0, Math.min(1, t)); return Math.hypot(px - ax - vx * t, pz - az - vz * t); };
    for (const c of this.casters) { if (c.h < h - 1.2) continue; const P = c.pts; let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const [px, pz] of P) { if (px < x0) x0 = px; if (px > x1) x1 = px; if (pz < z0) z0 = pz; if (pz > z1) z1 = pz; } if (x < x0 - 1.5 || x > x1 + 1.5 || z < z0 - 1.5 || z > z1 + 1.5) continue;
      let inside = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { if ((P[i][1] > z) !== (P[j][1] > z) && x < (P[j][0] - P[i][0]) * (z - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) inside = !inside; }
      if (inside) return true; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; if (segD(x, z, a[0], a[1], b[0], b[1]) < 1.3) return true; } }
    return (this._anchors || []).some((q) => Math.hypot(q[0] - x, q[1] - z) < 0.6);
  };
  P.lanternString = function (x0, z0, x1, z1, h, n, seed) {
    const W = this, L = Math.hypot(x1 - x0, z1 - z0), keys = ["lanR", "lanR2", "lanW", "lanY", "lanR3", "lanP"];
    /* ★ 2026-09-29d はしに結ぶ所がなければ、朱の柱を立てる（ご指定「提灯などが浮いている」） */
    [[x0, z0], [x1, z1]].forEach(([x, z]) => { if (W.anchorAt(x, z, h)) return; (W._anchors = W._anchors || []).push([x, z]); W.geo("woodRed", new T.CylinderGeometry(0.1, 0.13, h + 0.4, 8), x, (h + 0.4) / 2, z); W.geo("gold", new T.SphereGeometry(0.16, 8, 6), x, h + 0.5, z); W.geo("woodDark2", new T.CylinderGeometry(0.2, 0.24, 0.3, 8), x, 0.15, z); W.colCircle(x, z, 0.18); });
    W.detail(() => {
      for (let i = 0; i <= n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t, y = h - Math.sin(Math.PI * t) * L * 0.05; if (i < n) { const t2 = (i + 1) / n, y2 = h - Math.sin(Math.PI * t2) * L * 0.05, sl = Math.hypot(L / n, y2 - y); const g = new T.BoxGeometry(0.03, 0.03, sl).rotateX(-Math.atan2(y2 - y, L / n)); W.geo("lanternCap", g, x + (x1 - x0) / n / 2, (y + y2) / 2, z + (z1 - z0) / n / 2, Math.atan2(x1 - x0, z1 - z0)); } if (i > 0 && i < n) W.lantern(x, y - 0.75, z, 0.55, keys[((seed | 0) + i) % keys.length], Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2); }
    });
  };

  /* ══════════════ 目（大きな丸い目：屋根や壁に。オリジナル） ══════════════ */
  P.eyes = function (x, z, y, ry, r, gap, iris, look) {
    const W = this, c = Math.cos(ry), s = Math.sin(ry);
    [-1, 1].forEach((k) => {
      const ex = x + c * k * gap / 2, ez = z - s * k * gap / 2, lx = (look || 0) * 0.22 * r, ly = -0.12 * r;
      const w0 = new T.SphereGeometry(r, 18, 12, 0, TAU, 0, Math.PI / 2).rotateX(Math.PI / 2).scale(1, 1.12, 0.45);
      W.geo("eyeW", w0, ex, y, ez, ry);
      const ir = new T.CircleGeometry(r * 0.56, 18).translate(lx, ly, r * 0.45 + 0.012); W.geo(iris || "irisA", ir, ex, y, ez, ry);
      const pu = new T.CircleGeometry(r * 0.27, 14).translate(lx * 1.15, ly, r * 0.45 + 0.024); W.geo("eyeB", pu, ex, y, ez, ry);
      const hi = new T.CircleGeometry(r * 0.1, 10).translate(lx - r * 0.18, ly + r * 0.2, r * 0.45 + 0.036); W.geo("eyeHi", hi, ex, y, ez, ry);
    });
  };

  /* ══════════════ 大きな食べ物（屋根の上の飾り・オリジナル） ══════════════ */
  P.giantProp = function (kind, x, y, z, s, ry) {
    const W = this, G = (key, g) => W.geo(key, g.scale(s, s, s).rotateY(ry || 0), x, y, z);
    if (kind === "takoyaki") {
      G("propBrown", new T.BoxGeometry(3.6, 0.35, 2.2).translate(0, 0.18, 0));
      [[-1, 0], [0, 0.1], [1, 0]].forEach(([a, b]) => { G("propTan", new T.SphereGeometry(0.62, 16, 12).translate(a * 1.05, 0.85, b)); G("propChoco", new T.SphereGeometry(0.64, 16, 8, 0, TAU, 0, 0.9).translate(a * 1.05, 0.87, b)); G("propWhite", new T.TorusGeometry(0.38, 0.05, 6, 16).rotateX(Math.PI / 2).translate(a * 1.05, 1.42, b)); G("propGreen", new T.BoxGeometry(0.2, 0.05, 0.12).translate(a * 1.05 + 0.1, 1.5, b)); });
      G("propTan", new T.CylinderGeometry(0.03, 0.03, 1.6, 5).rotateZ(0.5).translate(1.7, 1.3, 0));
    } else if (kind === "onigiri") {
      const sh = new T.Shape(); sh.moveTo(0, 1.6); sh.quadraticCurveTo(1.4, 0.2, 0.9, -0.5); sh.quadraticCurveTo(0, -0.8, -0.9, -0.5); sh.quadraticCurveTo(-1.4, 0.2, 0, 1.6);
      G("propWhite", new T.ExtrudeGeometry(sh, { depth: 0.9, bevelEnabled: true, bevelSize: 0.25, bevelThickness: 0.25, bevelSegments: 3, curveSegments: 10 }).translate(0, 0.8, -0.45));
      G("propBlack", new T.BoxGeometry(1.2, 0.9, 1.5).translate(0, 0.45, 0));
    } else if (kind === "dango") {
      G("propTan", new T.CylinderGeometry(0.06, 0.06, 4.2, 6).translate(0, 2.1, 0));
      [["propPink", 1.0], ["propCream", 2.0], ["propGreen", 3.0]].forEach(([k, yy]) => G(k, new T.SphereGeometry(0.62, 16, 12).translate(0, yy, 0)));
    } else if (kind === "ramen") {
      const prof = [new T.Vector2(0, 0), new T.Vector2(0.9, 0), new T.Vector2(1.0, 0.15), new T.Vector2(1.8, 1.2), new T.Vector2(1.85, 1.3)];
      G("propRed", new T.LatheGeometry(prof, 24)); G("propWhite", new T.TorusGeometry(1.82, 0.08, 6, 32).rotateX(Math.PI / 2).translate(0, 1.3, 0));
      G("propYellow", new T.CylinderGeometry(1.7, 1.7, 0.1, 24).translate(0, 1.18, 0));
      G("propWhite", new T.CylinderGeometry(0.45, 0.45, 0.12, 16).translate(0.6, 1.26, 0.3)); G("propPink", new T.TorusGeometry(0.22, 0.05, 5, 12).rotateX(Math.PI / 2).translate(0.6, 1.33, 0.3));
      G("propBrown", new T.BoxGeometry(0.9, 0.08, 0.5).rotateY(0.5).translate(-0.5, 1.26, 0.2)); G("propGreen", new T.BoxGeometry(0.5, 0.06, 0.5).translate(-0.2, 1.27, -0.6));
      G("propTan", new T.CylinderGeometry(0.04, 0.05, 3.2, 5).rotateZ(1.1).translate(0.4, 2.2, -0.3)); G("propTan", new T.CylinderGeometry(0.04, 0.05, 3.2, 5).rotateZ(1.2).translate(0.5, 2.1, -0.1));
    } else if (kind === "icecream") {
      G("propTan", new T.ConeGeometry(0.75, 2.2, 14).rotateX(Math.PI).translate(0, 1.1, 0));
      G("propPink", new T.SphereGeometry(0.85, 16, 12).translate(0, 2.55, 0)); G("propMint", new T.SphereGeometry(0.7, 16, 12).translate(0, 3.55, 0)); G("propRed", new T.SphereGeometry(0.2, 10, 8).translate(0, 4.3, 0));
    } else if (kind === "donut") {
      G("propTan", new T.TorusGeometry(1.2, 0.55, 12, 24).translate(0, 1.4, 0)); G("propPink", new T.TorusGeometry(1.2, 0.56, 10, 24, TAU).scale(1, 1, 0.6).translate(0, 1.4, 0.12));
      for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; G(["propYellow", "propMint", "propWhite", "propBlack"][i % 4], new T.BoxGeometry(0.22, 0.06, 0.06).rotateZ(a).translate(Math.cos(a) * 1.2, 1.4 + Math.sin(a) * 1.2, 0.5)); }
    } else if (kind === "taiyaki") {
      const sh = new T.Shape(); sh.moveTo(-1.8, 0); sh.quadraticCurveTo(-1.2, 1.0, 0.6, 0.8); sh.lineTo(1.4, 1.1); sh.lineTo(1.2, 0); sh.lineTo(1.4, -1.1); sh.lineTo(0.6, -0.8); sh.quadraticCurveTo(-1.2, -1.0, -1.8, 0);
      G("propTan", new T.ExtrudeGeometry(sh, { depth: 0.5, bevelEnabled: true, bevelSize: 0.18, bevelThickness: 0.2, bevelSegments: 2 }).translate(0, 1.4, -0.25)); G("propBrown", new T.SphereGeometry(0.12, 8, 6).translate(-1.2, 1.7, 0.45));
    } else if (kind === "pudding") {
      G("propYellow", new T.CylinderGeometry(1.0, 1.35, 1.6, 20).translate(0, 0.8, 0)); G("propBrown", new T.CylinderGeometry(1.0, 1.0, 0.3, 20).translate(0, 1.7, 0)); G("propWhite", new T.SphereGeometry(0.45, 12, 8).translate(0, 2.0, 0)); G("propRed", new T.SphereGeometry(0.22, 10, 8).translate(0, 2.5, 0));
    } else if (kind === "sushi") {
      G("propWhite", new T.CapsuleGeometry(0.55, 1.5, 4, 10).rotateZ(Math.PI / 2).scale(1, 0.8, 1).translate(0, 0.5, 0)); G("propSalmon", new T.BoxGeometry(2.4, 0.3, 1.25).translate(0, 1.0, 0));
      for (let i = -2; i <= 2; i++) G("propCream", new T.BoxGeometry(0.06, 0.02, 1.26).translate(i * 0.4, 1.16, 0));
    } else if (kind === "coffee") {
      G("propWhite", new T.CylinderGeometry(1.1, 0.85, 1.9, 20).translate(0, 0.95, 0)); G("propChoco", new T.CylinderGeometry(1.02, 1.02, 0.08, 20).translate(0, 1.86, 0)); G("propWhite", new T.TorusGeometry(0.45, 0.13, 8, 16, Math.PI).rotateZ(-Math.PI / 2).translate(1.1, 1.0, 0));
    } else if (kind === "crepe") {
      G("propCream", new T.ConeGeometry(1.0, 2.6, 16).rotateX(Math.PI).translate(0, 1.3, 0)); G("propWhite", new T.SphereGeometry(0.75, 14, 10).translate(0, 2.55, 0)); G("propRed", new T.SphereGeometry(0.3, 10, 8).translate(0.35, 3.1, 0.2)); G("propChoco", new T.BoxGeometry(0.9, 0.12, 0.12).rotateZ(0.6).translate(-0.2, 3.0, 0.2));
    } else if (kind === "cake") {
      G("propCream", new T.CylinderGeometry(1.6, 1.6, 1.0, 24).translate(0, 0.5, 0)); G("propPink", new T.CylinderGeometry(1.25, 1.25, 0.8, 24).translate(0, 1.4, 0)); G("propWhite", new T.TorusGeometry(1.6, 0.12, 6, 32).rotateX(Math.PI / 2).translate(0, 1.0, 0));
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; G("propRed", new T.SphereGeometry(0.2, 8, 6).translate(Math.cos(a) * 1.0, 1.95, Math.sin(a) * 1.0)); } G("propYellow", new T.CylinderGeometry(0.06, 0.06, 0.7, 5).translate(0, 2.2, 0));
    }
  };

  /* ══════════════ 店（妖魔シティ風：色とりどりの外壁・瓦／丸い屋根・看板・のれん・提灯・目・屋根の大きな食べ物） ══════════════
     x,z 中心・幅 w（ry=0 で x 方向）・奥行き d・高さ h（屋根の下まで）
     o = { ry, key 外壁, shop 1階, roof "kawara"|"barrel"|"flat"|"none", roofKey, rh 屋根の高さ, sign 看板の文字, signV 縦の看板, signColor, glow,
           eyes true / {iris}, prop 大きな食べ物, noren "norB"…, lanterns 数, awning, neon ネオンの飾り {kind, key}, noCol } */
  P.yomaShop = function (x, z, w, d, h, o) {
    o = o || {};
    const W = this, ry = o.ry || 0, c = Math.cos(ry), s = Math.sin(ry), L = (a, b) => [x + a * c + b * s, z - a * s + b * c];
    const G = (key, g, det) => W.geo(key, g, x, 0, z, ry, det);
    const shopH = Math.min(4.2, h * 0.55), key = o.key || "yRed";
    if (o.inside) W.enterable(x, z, w, d, shopH, ry, Object.assign({ key: o.shop || "shopA", name: o.sign, prop: o.prop }, o.inside));
    else G(o.shop || "shopA", at(bx(w, shopH, d, 14), 0, shopH / 2, 0));
    if (h - shopH > 0.2) G(key, at(bx(w, h - shopH, d, 10.5), 0, shopH + (h - shopH) / 2, 0));
    G("woodDark2", at(new T.BoxGeometry(w + 0.35, 0.4, d + 0.35), 0, shopH, 0));
    /* ひさし（瓦の小さな屋根）かテント */
    if (o.awning !== false) {
      if (typeof o.awning === "string") { const aw = new T.BoxGeometry(w * 0.9, 0.12, 1.7).rotateX(-0.3); G(o.awning, at(aw, 0, shopH - 0.45, d / 2 + 0.8)); }
      else { const aw = new T.BoxGeometry(w + 0.6, 0.18, 1.5).rotateX(-0.42); const uv = aw.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 3, uv.getY(i)); G(o.eaveKey || o.roofKey || "kwB", at(aw, 0, shopH - 0.35, d / 2 + 0.65)); }
    }
    /* のれん */
    if (o.noren) W.detail(() => { const g = new T.PlaneGeometry(Math.min(3.2, w * 0.4), 1.25); G(o.noren, at(g, 0, shopH - 1.45, d / 2 + 0.06), true); });
    /* 屋根 */
    const roof = o.roof || "kawara", rk = o.roofKey || "kwB";
    let top = h;
    if (roof === "kawara") { const rh = o.rh || Math.min(w, d) * 0.42; G(rk, at(kawaraRoof(w, d, rh, 0.9), 0, h, 0)); G("woodDark2", at(new T.BoxGeometry(0.5, 0.35, 0.5), 0, h + rh * 1.02, 0)); top = h + rh; }
    else if (roof === "barrel") {
      const R = w / 2 + 0.35, k = (o.rh || R * 0.8) / R, g = new T.CylinderGeometry(R, R, d + 0.8, 20, 1, false, -Math.PI / 2, Math.PI).rotateX(-Math.PI / 2).scale(1, k, 1);
      const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * R * 3.14 / 3, uv.getY(i) * (d + 0.8) / 2.2);
      G(rk, at(g, 0, h, 0));
      const gb = new T.CircleGeometry(R * 0.985, 20, 0, Math.PI).scale(1, k, 1); G(key, at(gb.clone(), 0, h, d / 2 + 0.38)); G(key, at(gb.rotateY(Math.PI), 0, h, -d / 2 - 0.38));
      G("woodDark2", at(new T.TorusGeometry(R, 0.12, 5, 20, Math.PI).scale(1, k, 1), 0, h, d / 2 + 0.42));
      top = h + R * k;
      if (o.eyes) { const ey = o.eyes === true ? {} : o.eyes; W.eyes(...L(0, d / 2 + 0.42), h + R * k * 0.46, ry, R * 0.28, R * 0.92, ey.iris || "irisA", ey.look); }
    } else if (roof === "flat") { G("woodDark2", at(new T.BoxGeometry(w + 0.4, 0.5, d + 0.4), 0, h + 0.25, 0)); top = h + 0.5; }
    if (o.eyes && roof !== "barrel") { const ey = o.eyes === true ? {} : o.eyes; W.eyes(...L(0, d / 2 + 0.02), h - (h - shopH) * 0.42, ry, Math.min(w, 8) * 0.13, Math.min(w, 8) * 0.42, ey.iris || "irisB", ey.look); }
    /* 看板：屋根の前の大きな板（光る文字）・かどの縦の看板 */
    if (o.sign) { const sw = Math.min(w * 0.86, o.signW || 9), sh = o.signH || 1.5, [px, pz] = L(0, d / 2 + 0.12); W.sign(o.sign, { bg: o.signColor || "#1a1030", color: o.signInk || "#fff", glow: o.glow || "#ffcf6a", border: o.signBorder || "#f2c04a", px: sw / sh > 5 ? 1024 : 512 }, sw, sh, px, o.signY != null ? o.signY : (roof === "flat" ? h + 1.4 : shopH + 0.95), pz, ry); }
    if (o.signV) { const [px, pz] = L(w / 2 - 0.2, d / 2 + 0.55); W.sign(String(o.signV).split("").join("\n"), { bg: o.signVColor || "#b8262a", color: "#fff", glow: "#ffd7a0", border: "#f2c04a", px: 256, both: true }, 0.9, Math.min(h - 1.5, 0.95 * String(o.signV).length + 0.4), px, shopH + (Math.min(h - 1.5, 0.95 * String(o.signV).length + 0.4)) / 2 + 0.2, pz, ry + Math.PI / 2); W.detail(() => W.geo("woodDark2", new T.BoxGeometry(0.1, 0.1, 0.9).rotateY(ry), ...[L(w / 2 - 0.2, d / 2 + 0.3)].map(([a, b]) => [a, shopH + 0.3, b])[0])); }
    /* 提灯（入口の両わき） */
    const nl = o.lanterns == null ? 2 : o.lanterns;
    for (let i = 0; i < nl; i++) { const a = nl === 1 ? 0 : (i / (nl - 1) - 0.5) * (w - 1.4), [px, pz] = L(a, d / 2 + 1.1); W.detail(() => W.lantern(px, shopH - 2.2, pz, 0.75, o.lanternKey || ["lanR", "lanR2", "lanW", "lanY"][i % 4], ry)); }
    /* 屋根の上の大きな食べ物・ネオン */
    if (o.prop) { const [px, pz] = L(o.propX || 0, o.propZ || 0); W.giantProp(o.prop, px, top - (roof === "kawara" ? (o.rh || Math.min(w, d) * 0.42) * 0.45 : 0.05), pz, o.propS || Math.min(w, d) * 0.22, ry + (o.propR || 0)); }
    if (o.neon) { const [px, pz] = L(o.neon.dx || -w * 0.28, d / 2 + 0.15); W.neonIcon(o.neon.kind || "star", px, o.neon.y || (shopH + (h - shopH) * 0.55), pz, o.neon.s || 1.2, ry, o.neon.key || "neonPink"); }
    if (!o.noCol && !o.inside) W.colRot(x, z, w, d, ry);
    W.caster(x, z, w, d, top, ry);
    return top;
  };
  /* 大きな提灯の建物（赤い紙の大きな提灯そのものが建物・中は店）：直径 2r・高さ h */
  P.lanternBldg = function (x, z, r, h, o) {
    o = o || {};
    const W = this, prof = []; for (let i = 0; i <= 18; i++) { const t = i / 18; prof.push(new T.Vector2(r * (0.78 + 0.22 * Math.sin(Math.PI * t)), t * h)); }
    const gap = o.door ? 0.34 : 0, g = new T.LatheGeometry(prof, 36, o.door ? (Math.PI / 2 - (o.doorA || 0)) + gap - Math.PI : 0, TAU - gap * 2).rotateY(Math.PI + (o.ry || 0));
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2, uv.getY(i));
    W.geo(o.key || "lanBig", g, x, 2, z);
    if (o.door) W.geo("lanternCap", new T.CylinderGeometry(r * 0.82, r * 0.86, 2, 36, 1, true, (Math.PI / 2 - (o.doorA || 0)) + 0.34, TAU - 0.68), x, 1, z); else W.geo("lanternCap", new T.CylinderGeometry(r * 0.82, r * 0.86, 2, 36), x, 1, z);
    W.geo("lanternCap", new T.CylinderGeometry(r * 0.82, r * 0.8, 1.4, 36), x, h + 2.7, z);
    W.geo("goldOrn", new T.TorusGeometry(r * 0.83, 0.18, 6, 36).rotateX(Math.PI / 2), x, 2.05, z); W.geo("goldOrn", new T.TorusGeometry(r * 0.81, 0.18, 6, 36).rotateX(Math.PI / 2), x, h + 2.0, z);
    W.geo("goldOrn", new T.ConeGeometry(0.5, 2.4, 8), x, h + 4.6, z);
    if (o.door) { const a = o.doorA || 0; W.geo("lanternCap", new T.BoxGeometry(2 * r * Math.sin(gap) + 0.4, 1.2, 0.6).rotateY(Math.PI / 2 - a), x + Math.cos(a) * r * 0.92, 4.1, z + Math.sin(a) * r * 0.92); W.roundInterior(x, z, r * 0.86, 3.6, a, { type: o.door, name: o.name || "大提灯食堂", floor: "wood" }); }
    else W.colCircle(x, z, r * 0.9);
    W.casterCircle(x, z, r, h + 3);
  };
  /* 大門（門・2段の瓦屋根・朱の柱・金の飾り・大きな提灯・光る輪郭）：幅 14s */
  P.pagodaGate = function (x, z, ry, s, o) {
    o = o || {};
    const W = this, c = Math.cos(ry), sn = Math.sin(ry), L = (a, b) => [x + a * c + b * sn, z - a * sn + b * c], G = (key, g) => W.geo(key, g.scale(s, s, s), x, 0, z, ry);
    [[-5, -1.6], [5, -1.6], [-5, 1.6], [5, 1.6]].forEach(([a, b]) => { G("woodRed", new T.CylinderGeometry(0.45, 0.55, 9, 12).translate(a, 4.5, b)); G("stoneW", new T.CylinderGeometry(0.75, 0.85, 0.6, 12).translate(a, 0.3, b)); G("goldOrn", new T.CylinderGeometry(0.5, 0.5, 0.3, 12).translate(a, 8.6, b)); const [px, pz] = L(a * s, b * s); W.colCircle(px, pz, 0.6 * s); });
    [-1.6, 1.6].forEach((b) => { G("woodRed", new T.BoxGeometry(12, 0.7, 0.6).translate(0, 7.6, b)); G("woodRed", new T.BoxGeometry(11.4, 0.45, 0.5).translate(0, 5.6, b)); });
    G("woodDark2", new T.BoxGeometry(13, 0.5, 4.4).translate(0, 9.1, 0));
    G(o.roofKey || "kwG", kawaraRoof(12.5, 4.2, 3.2, 1.6).translate(0, 9.3, 0));
    G("woodRed", new T.BoxGeometry(6.4, 2.6, 2.8).translate(0, 12.3, 0)); G("goldOrn", new T.BoxGeometry(6.6, 0.2, 3.0).translate(0, 13.6, 0));
    G(o.roofKey || "kwG", kawaraRoof(6.4, 2.8, 2.6, 1.3).translate(0, 13.6, 0));
    G("goldOrn", new T.ConeGeometry(0.28, 1.8, 8).translate(0, 16.9, 0)); G("goldOrn", new T.SphereGeometry(0.3, 10, 8).translate(0, 17.9, 0));
    [-1, 1].forEach((k) => { G("goldOrn", new T.BoxGeometry(0.4, 0.7, 0.4).translate(k * 3.2, 15.9, 0)); G("neonCyan", new T.BoxGeometry(12.8, 0.1, 0.1).translate(0, 9.35, k * 2.95)); });
    /* 大きな提灯（門の下）と看板 */
    const [lx, lz] = L(0, 0); W.lantern(lx, 3.2 * s, lz, 2.6 * s, o.lanKey || "lanBig", ry);
    if (o.text) { const [px, pz] = L(0, 1.95 * s); W.sign(o.text, { bg: "#1a0c10", color: "#ffe7a0", glow: "#ffb04a", border: "#f2c04a", px: 1024, both: true }, 6 * s, 1.1 * s, px, 6.6 * s, pz, ry); }
    W.caster(x, z, 14 * s, 5 * s, 16 * s, ry); W.casters[W.casters.length - 1].gate = true;     /* くぐれる（道の探索・小物の判定で建物あつかいしない） */
  };
  /* 塔（多重の瓦屋根・朱と金）：tiers 段・下の幅 w */
  P.pagodaTower = function (x, z, w, tiers, o) {
    o = o || {};
    const W = this; let y = 0, bw = w;
    W.geo("stoneW", new T.BoxGeometry(w + 3, 1.2, w + 3), x, 0.6, z); y = 1.2;
    for (let i = 0; i < tiers; i++) {
      const hh = i === 0 ? 6 : 4.2; W.geo(o.key || "woodRed", new T.BoxGeometry(bw, hh, bw), x, y + hh / 2, z);
      W.geo("goldOrn", new T.BoxGeometry(bw + 0.3, 0.25, bw + 0.3), x, y + hh, z);
      W.geo(o.roofKey || "kwK", kawaraRoof(bw + 1.2, bw + 1.2, 2.2, 1.4), x, y + hh, z);
      if (i % 2 === 0) W.detail(() => [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, b]) => W.lantern(x + a * (bw / 2 + 1.7), y + hh - 1.5, z + b * (bw / 2 + 1.7), 0.7, "lanR")));
      y += hh + 1.2; bw *= 0.8;
    }
    W.geo("goldOrn", new T.CylinderGeometry(0.12, 0.2, 6, 8), x, y + 3, z); for (let k = 0; k < 5; k++) W.geo("goldOrn", new T.TorusGeometry(0.5 - k * 0.06, 0.06, 5, 16).rotateX(Math.PI / 2), x, y + 1 + k * 0.9, z);
    W.colObb(x, z, w + 3, w + 3, 0); W.caster(x, z, w, w, y + 4, 0);
    return y;
  };
  /* れんがの高架（アーチの列）：pts の折れ線にそって・高さ h・幅 wd。上は歩けない（下をくぐれる） */
  P.viaduct = function (pts, h, wd, o) {
    o = o || {};
    const W = this;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / 11)), sl = L / n, ang = Math.atan2(b[0] - a[0], b[1] - a[1]);
      for (let k = 0; k < n; k++) {
        const t = (k + 0.5) / n, cx = a[0] + (b[0] - a[0]) * t, cz = a[1] + (b[1] - a[1]) * t;
        const half = sl / 2, pier = 0.9, ar = half - pier, hs = Math.max(1.5, h - 1.6 - ar);
        const sh = new T.Shape(); sh.moveTo(-half, 0); sh.lineTo(half, 0); sh.lineTo(half, h); sh.lineTo(-half, h); sh.lineTo(-half, 0);
        const hole = new T.Path(); hole.moveTo(-ar, 0); hole.lineTo(ar, 0); hole.lineTo(ar, hs); hole.absarc(0, hs, ar, 0, Math.PI, false); hole.lineTo(-ar, 0); sh.holes.push(hole);
        const g = new T.ExtrudeGeometry(sh, { depth: wd, bevelEnabled: false, curveSegments: 10 }); g.translate(0, 0, -wd / 2); g.rotateY(Math.PI / 2);
        const uv = g.attributes.uv; for (let q = 0; q < uv.count; q++) uv.setXY(q, uv.getX(q) / 4, uv.getY(q) / 4);
        W.geo(o.key || "brickWall", g, cx, 0, cz, ang);
        W.geo("stoneW", new T.BoxGeometry(wd + 0.6, 0.5, sl), cx, h + 0.25, cz, ang);
        /* 橋脚の当たり（アーチの下は通れる） */
        const px = a[0] + (b[0] - a[0]) * (k / n), pz = a[1] + (b[1] - a[1]) * (k / n);
        W.colObb(px, pz, wd, pier * 2, ang);
      }
      W.colObb(b[0], b[1], wd, 1.8, ang);
      W.caster((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, wd, L, h, ang);
      if (o.lanterns) W.detail(() => { for (let k = 0; k <= n; k++) { const t = k / n, cx = a[0] + (b[0] - a[0]) * t, cz = a[1] + (b[1] - a[1]) * t; [-1, 1].forEach((sd) => W.lantern(cx + Math.cos(ang) * sd * (wd / 2 + 0.5), h - 1.6, cz - Math.sin(ang) * sd * (wd / 2 + 0.5), 0.6, "lanR")); } });
    }
  };
  /* 赤い太鼓橋（歩いて渡れる・アーチの高さ hh）：中心 x,z・向き ang（渡る方向）・長さ len・幅 wd */
  P.taikoBridge = function (x, z, ang, len, wd, hh) {
    const W = this, N = 14, c = Math.cos(ang), s = Math.sin(ang);
    hh = hh || Math.min(1.6, len * 0.14);
    const yAt = (t) => hh * Math.sin(Math.PI * t);
    for (let i = 0; i < N; i++) {
      const t0 = i / N, t1 = (i + 1) / N, y0 = yAt(t0), y1 = yAt(t1), sl = len / N, mid = (t0 + t1) / 2 - 0.5, bx2 = x + s * mid * len, bz2 = z + c * mid * len;
      const g = new T.BoxGeometry(wd, 0.28, Math.hypot(sl, y1 - y0) + 0.02).rotateX(-Math.atan2(y1 - y0, sl));
      W.geo("woodRed", g, bx2, (y0 + y1) / 2, bz2, ang);
      [-1, 1].forEach((k) => {
        const rx = bx2 + c * k * (wd / 2), rz = bz2 - s * k * (wd / 2);
        W.geo("woodRed", new T.BoxGeometry(0.12, 0.12, Math.hypot(sl, y1 - y0) + 0.02).rotateX(-Math.atan2(y1 - y0, sl)), rx, (y0 + y1) / 2 + 1.0, rz, ang);
        if (i % 2 === 0) W.geo("woodRed", new T.BoxGeometry(0.16, 1.0, 0.16), rx, y0 + 0.5, rz, ang);
      });
    }
    [-1, 1].forEach((e) => [-1, 1].forEach((k) => { const px = x + s * e * len / 2 + c * k * wd / 2, pz = z + c * e * len / 2 - s * k * wd / 2; W.geo("woodRed", new T.BoxGeometry(0.24, 1.3, 0.24), px, 0.65, pz, ang); W.geo("goldOrn", new T.SphereGeometry(0.18, 8, 6), px, 1.42, pz); }));
    W.heightExtra = (W.heightExtra || []).concat([{ arch: 1, cx: x, cz: z, ang, hw: wd / 2, hl: len / 2, h: hh }]);
    (W.riverGaps = W.riverGaps || []).push({ x, z, r: wd / 2 + 0.6 });
    [-1, 1].forEach((k) => W.colObb(x + c * k * (wd / 2 + 0.1), z - s * k * (wd / 2 + 0.1), 0.25, len - 0.4, ang));
    (W.walkPaths).push({ pts: [[x - s * len / 2, z - c * len / 2], [x + s * len / 2, z + c * len / 2]], w: wd - 0.6 });
  };
  /* ネオンの形（星・ハート・月・クリスタル・音符・矢印・カップ・猫の顔）：板＋光る線 */
  const ICONS = {
    star: () => { const p = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i / 10 * TAU, r = i % 2 ? 0.42 : 1; p.push([Math.cos(a) * r, -Math.sin(a) * r]); } return [p]; },
    heart: () => { const p = []; for (let i = 0; i < 40; i++) { const t = i / 40 * TAU; p.push([Math.pow(Math.sin(t), 3) * 0.95, (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16]); } return [p]; },
    moon: () => { const p = []; for (let i = 0; i <= 24; i++) { const a = -Math.PI * 0.8 + i / 24 * Math.PI * 1.6; p.push([Math.cos(a), Math.sin(a)]); } for (let i = 24; i >= 0; i--) { const a = -Math.PI * 0.62 + i / 24 * Math.PI * 1.24; p.push([0.42 + Math.cos(a) * 0.72, Math.sin(a) * 0.72]); } return [p]; },
    crystal: () => [[[0, 1], [0.6, 0.35], [0.45, -0.9], [-0.45, -0.9], [-0.6, 0.35]], [[-0.6, 0.35], [0.6, 0.35]], [[0, 1], [0, -0.9]]],
    note: () => { const c = []; for (let i = 0; i <= 16; i++) { const a = i / 16 * TAU; c.push([-0.35 + Math.cos(a) * 0.32, -0.7 + Math.sin(a) * 0.24]); } return [c, [[-0.05, -0.65], [-0.05, 0.9], [0.55, 0.6]]]; },
    arrow: () => [[[-1, 0.25], [0.3, 0.25], [0.3, 0.6], [1, 0], [0.3, -0.6], [0.3, -0.25], [-1, -0.25]]],
    cup: () => [[[-0.6, 0.5], [-0.5, -0.7], [0.4, -0.7], [0.5, 0.5]], [[0.5, 0.3], [0.85, 0.2], [0.85, -0.2], [0.45, -0.3]], [[-0.3, 0.7], [-0.2, 1.0]], [[0.1, 0.7], [0.2, 1.0]]],
    cat: () => { const p = [[-0.9, 1], [-0.55, 0.45]]; for (let i = 0; i <= 20; i++) { const a = Math.PI * 0.85 - i / 20 * Math.PI * 1.7 - Math.PI; p.push([Math.cos(a + Math.PI) * 0.95, -0.05 + Math.sin(a + Math.PI) * 0.8]); } p.push([0.55, 0.45], [0.9, 1]); return [p, [[-0.4, 0.05], [-0.25, 0.05]], [[0.25, 0.05], [0.4, 0.05]]]; },
    xeva: () => [[[-1, 1], [1, -1]], [[-1, -1], [1, 1]], [[-0.3, 1.1], [0.3, 1.1]]]
  };
  P.neonIcon = function (kind, x, y, z, s, ry, key) {
    const W = this, lines = (ICONS[kind] || ICONS.star)();
    W.geo("pBlack", new T.BoxGeometry(2.5 * s, 2.5 * s, 0.12).translate(0, 0, -0.08), x, y, z, ry);
    lines.forEach((pl) => {
      const closed = pl.length > 4 && kind !== "note" && kind !== "cup";
      const v = pl.map(([a, b]) => new T.Vector3(a * s, b * s, 0.04));
      const cv = new T.CatmullRomCurve3(v, closed, "catmullrom", 0.02);
      W.geo(key || "neonPink", new T.TubeGeometry(cv, Math.max(8, pl.length * 4), 0.055 * s + 0.02, 5, closed), x, y, z, ry);
    });
  };
  /* ガラスのキューブの店（未来の建築：光る継ぎ目・エンブレム） */
  P.glassCube = function (x, z, s, o) {
    o = o || {};
    const W = this, ry = o.ry || 0;
    W.geo("glassCube", new T.BoxGeometry(s, s, s), x, s / 2, z, ry);
    W.geo("pWhite", new T.BoxGeometry(s + 0.4, 0.5, s + 0.4), x, s + 0.25, z, ry);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { const c = Math.cos(ry), sn = Math.sin(ry), px = x + (a * c + b * sn) * s / 2, pz = z + (-a * sn + b * c) * s / 2; W.geo(o.seam || "neonCyan", new T.BoxGeometry(0.16, s, 0.16), px, s / 2, pz, ry); });
    W.geo(o.seam || "neonCyan", new T.BoxGeometry(s + 0.1, 0.14, s + 0.1), x, s * 0.36, z, ry);
    W.geo("holoBlue", new T.TorusGeometry(s * 0.28, s * 0.03, 6, 32).rotateX(Math.PI / 2), x, s + 1.4, z);
    W.geo("holoBlue", new T.TorusGeometry(s * 0.2, s * 0.025, 6, 32).rotateX(Math.PI / 2), x, s + 2.0, z);
    if (o.sign) W.sign(o.sign, { bg: "#08202a", color: "#bff4ff", glow: "#4ff0ff", px: 1024 }, s * 0.8, s * 0.12, x + Math.sin(ry) * (s / 2 + 0.05), s * 0.82, z + Math.cos(ry) * (s / 2 + 0.05), ry);
    W.colObb(x, z, s, s, ry); W.caster(x, z, s, s, s + 0.5, ry);
  };
  /* ねじれた未来の塔（ガラスの段を少しずつ回す・光る段の線・てっぺんの光の輪） */
  P.futureTower = function (x, z, w, h, o) {
    o = o || {};
    const W = this, n = Math.max(6, Math.round(h / 6)), tw = o.twist || 0.9, lm = W._landmark; W._landmark = true;
    for (let i = 0; i < n; i++) {
      const y = i * h / n, k = 1 - i / n * 0.35, a = i / n * tw;
      W.geo(o.key || "gTeal", new T.BoxGeometry(w * k, h / n - 0.3, w * k * 0.85), x, y + (h / n) / 2, z, a);
      W.geo(i % 3 === 0 ? (o.band || "neonCyan") : "chromeB", new T.BoxGeometry(w * k + 0.5, 0.3, w * k * 0.85 + 0.5), x, y + h / n - 0.15, z, a);
    }
    W.geo("neonCyan", new T.TorusGeometry(w * 0.62, 0.35, 6, 40).rotateX(Math.PI / 2), x, h + 3, z); W.geo("neonPurple", new T.TorusGeometry(w * 0.45, 0.25, 6, 40).rotateX(Math.PI / 2 + 0.25), x, h + 6, z);
    W.geo("chromeB", new T.ConeGeometry(0.6, 14, 8), x, h + 7, z);
    W._landmark = lm;
    W.colObb(x, z, w, w * 0.85, 0); W.caster(x, z, w, w, h, 0);
  };
  /* 浮かぶ光の輪（ゆっくり回る） */
  P.floatRing = function (x, y, z, r, key) {
    const W = this, g = new T.Group(); g.position.set(x, y, z); W.scene.add(g);
    const m1 = new T.Mesh(new T.TorusGeometry(r, r * 0.04, 8, 64), W.m[key || "neonCyan"]); g.add(m1);
    const m2 = new T.Mesh(new T.TorusGeometry(r * 0.8, r * 0.03, 8, 64), W.m.neonPurple); g.add(m2);
    W.loose(g, 500);
    W.anim.push((dt, t) => { m1.rotation.set(Math.PI / 2 + Math.sin(t * 0.4 + x) * 0.3, t * 0.3, 0); m2.rotation.set(Math.PI / 2 + Math.cos(t * 0.5 + z) * 0.4, -t * 0.4, 0); g.position.y = y + Math.sin(t * 0.8 + x * 0.1) * 0.6; });
    return g;
  };
  /* 屋台（のれん・提灯・カウンター） */
  P.yatai = function (x, z, ry, name, noren, prop) {
    const W = this, c = Math.cos(ry), s = Math.sin(ry), L = (a, b) => [x + a * c + b * s, z - a * s + b * c];
    W.box("woodLight", x, 0, z, 3.4, 1.0, 1.8, { ry, collide: true });
    W.box("woodDark", x, 1.0, z, 3.6, 0.08, 2.0, { ry });
    [[-1.6, -0.8], [1.6, -0.8], [-1.6, 0.8], [1.6, 0.8]].forEach(([a, b]) => { const [px, pz] = L(a, b); W.box("woodDark", px, 0, pz, 0.1, 2.6, 0.1, { ry }); });
    const roof = new T.BoxGeometry(4.0, 0.14, 2.6).rotateX(0.18); W.geo("kwK", roof, x, 2.7, z, ry);
    W.detail(() => { const [nx, nz] = L(0, 0.92); W.geo(noren || "norO", new T.PlaneGeometry(3.2, 0.7).translate(0, 0, 0), nx, 2.15, nz, ry); [-1.5, 1.5].forEach((a) => { const [lx, lz] = L(a, 1.0); W.lantern(lx, 1.6, lz, 0.55, "lanR", ry); }); });
    if (name) { const [px, pz] = L(0, -0.95); W.sign(name, { bg: "#1a1010", color: "#ffe7a0", glow: "#ffb04a", px: 512, both: true }, 2.8, 0.6, px, 3.2, pz, ry); }
    if (prop) { W.giantProp(prop, x, 2.85, z, 0.45, ry); }
    W.caster(x, z, 3.4, 1.8, 2.8, ry);
  };
  /* 自動販売機・ガチャの機械（小物） */
  P.vending = function (x, z, ry, key) {
    const W = this; W.detail(() => { W.box(key || "pRed", x, 0, z, 1.0, 1.9, 0.75, { ry }); const c = Math.cos(ry), s = Math.sin(ry); W.box("lampGlowB", x + s * 0.38, 0.9, z + c * 0.38, 0.8, 0.8, 0.02, { ry }); }); W.colObb(x, z, 1.0, 0.75, ry);
  };
  P.gachaMachine = function (x, z, s, key, y0) {
    const W = this; y0 = y0 || 0; W.geo(key || "pRed", new T.BoxGeometry(1.2 * s, 1.1 * s, 1.0 * s), x, y0 + 0.55 * s, z); W.geo("glassClear", new T.SphereGeometry(0.62 * s, 16, 12), x, y0 + 1.6 * s, z); W.geo("pWhite", new T.CylinderGeometry(0.3 * s, 0.3 * s, 0.2 * s, 12), x, y0 + 2.3 * s, z);
    W.geo("goldOrn", new T.CylinderGeometry(0.22 * s, 0.22 * s, 0.1 * s, 12).rotateX(Math.PI / 2), x, y0 + 0.55 * s, z + 0.52 * s);
    for (let i = 0; i < 8; i++) W.geo(["propPink", "propMint", "propYellow", "irisA"][i % 4], new T.SphereGeometry(0.16 * s, 8, 6), x + Math.cos(i) * 0.3 * s, y0 + 1.35 * s + (i % 3) * 0.12 * s, z + Math.sin(i * 1.7) * 0.3 * s);
    if (!y0) W.colCircle(x, z, 0.65 * s);
  };
  /* 鳥居の形の門（朱） */
  P.torii = function (x, z, ry, s) {
    const W = this, G = (key, g) => W.geo(key, g.scale(s, s, s), x, 0, z, ry);
    [-1, 1].forEach((k) => { G("woodRed", new T.CylinderGeometry(0.28, 0.34, 6, 10).translate(k * 2.4, 3, 0)); G("lanternCap", new T.CylinderGeometry(0.4, 0.4, 0.5, 10).translate(k * 2.4, 0.25, 0)); const c = Math.cos(ry), sn = Math.sin(ry); W.colCircle(x + c * k * 2.4 * s, z - sn * k * 2.4 * s, 0.4 * s); });
    G("woodRed", new T.BoxGeometry(6.4, 0.4, 0.45).translate(0, 4.8, 0)); G("lanternCap", new T.BoxGeometry(7.4, 0.35, 0.6).translate(0, 5.95, 0)); G("woodRed", new T.BoxGeometry(7.0, 0.3, 0.5).translate(0, 5.65, 0));
  };
})();
