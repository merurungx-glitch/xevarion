/* ══════════════════════════════════════════════════════════════════
   XEVARION PARK — ファンタジーの世界観（★★ 2026-10-02 ご指定
     「エリアの世界観をドラクエのようなファンタジーでグラフィックがきれいな形に変更してください」）
   ------------------------------------------------------------------
   王道 RPG の城下町のような、明るくてきれいなファンタジーの町なみにする（形・色・絵はすべてオリジナル）：
     ・道：石だたみ（あたたかい色の丸い石・大きな敷石・灰色の石の通り）。中央線は石の帯に
     ・屋根：うろこの瓦（青・赤・緑・紫・オレンジ・青緑・灰色）。お店は急な切妻屋根＋煙突＋ドーマー窓
     ・壁：しっくいと木の柱・梁・すじかい（ハーフティンバー）。窓は格子・よろい戸・花の箱。夜は窓に明かり
     ・街灯：黒い鉄の柱＋ガラスのランタン。提灯 → 鉄のランタン、提灯の列 → 三角の旗（ガーランド）
     ・看板：木の板（板目・金の縁・びょう）に明朝の文字（駅の電光掲示板など光る表示はそのまま）
     ・エリアの門：石の塔 2 本（円すいの屋根・旗）と石のアーチ・名前の木の板・たいまつ
     ・大門・五重の塔 → 石の城門・魔法使いの塔、屋台 → しま模様の天幕の屋台
     ・空・光：青くすんだ空と白い雲、少しあざやかで温かい色（fx.js の昼の色）
   もとの「妖魔シティ風」にもどすときは localStorage "xeva_park_theme" = "yoma"。
   ══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const T = THREE, X = XTex, P = XWorld.World.prototype, TAU = Math.PI * 2, XP = XPark;
  let on = true; try { on = localStorage.getItem("xeva_park_theme") !== "yoma"; } catch (e) {}
  XP.FANTASY = on;
  if (!on) return;

  /* ══════════════ 手続きテクスチャ ══════════════ */
  const cache = {};
  function T2(key, size, draw) {
    if (cache[key]) return cache[key];
    const c = X.cv(size[0], size[1]), g = c.getContext("2d"); draw(g, c.width, c.height, X.rnd(key.length * 131 + key.charCodeAt(0) * 7 + 11));
    const t = X.tex(c); t.wrapS = t.wrapT = T.RepeatWrapping; return (cache[key] = t);
  }
  const shade = (c, f) => { const k = new T.Color(c); k.multiplyScalar(f); return "#" + k.getHexString(); };
  const mix = (a, b, t) => { const k = new T.Color(a); k.lerp(new T.Color(b), t); return "#" + k.getHexString(); };
  const SERIF = "'Yu Mincho','YuMincho','Hiragino Mincho ProN','Noto Serif JP','MS PMincho',serif";

  /* 丸い石だたみ（ずらした格子・つなぎ目なし） */
  function cobbleTex(key, cols, mortar, n) {
    return T2(key, [512, 512], (g, w, h, r) => {
      g.fillStyle = mortar; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 4000; i++) { g.fillStyle = "rgba(0,0,0," + (r() * 0.08) + ")"; g.fillRect(r() * w, r() * h, 2, 2); }
      const cs = w / n;
      const stone = (cx, cy, rx, ry, col, rot) => {
        g.save(); g.translate(cx, cy); g.rotate(rot);
        const gr = g.createRadialGradient(-rx * 0.35, -ry * 0.4, 1, 0, 0, Math.max(rx, ry) * 1.15);
        gr.addColorStop(0, shade(col, 1.22)); gr.addColorStop(0.55, col); gr.addColorStop(1, shade(col, 0.68));
        g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.fill();
        g.strokeStyle = "rgba(0,0,0,.28)"; g.lineWidth = 1.6; g.stroke();
        g.fillStyle = "rgba(255,255,255,.10)"; g.beginPath(); g.ellipse(-rx * 0.3, -ry * 0.35, rx * 0.35, ry * 0.22, 0, 0, TAU); g.fill();
        g.restore();
      };
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const off = (j & 1) ? cs / 2 : 0, cx = i * cs + off + (r() - 0.5) * cs * 0.16, cy = j * cs + cs / 2 + (r() - 0.5) * cs * 0.14;
        const rx = cs * (0.40 + r() * 0.06), ry = cs * (0.35 + r() * 0.07), col = cols[Math.floor(r() * cols.length)], rot = (r() - 0.5) * 0.6;
        for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) { const x = cx + dx, y = cy + dy; if (x > -cs && x < w + cs && y > -cs && y < h + cs) stone(x, y, rx, ry, col, rot); }
      }
    });
  }
  /* 大きな敷石（段ごとに長さのちがう石） */
  function flagTex(key, cols, joint) {
    return T2(key, [512, 512], (g, w, h, r) => {
      g.fillStyle = joint; g.fillRect(0, 0, w, h);
      const rowH = 64;
      for (let y = 0; y < h; y += rowH) {
        let x = -r() * 80;
        while (x < w) {
          const L = 70 + r() * 90, col = cols[Math.floor(r() * cols.length)];
          const gr = g.createLinearGradient(0, y, 0, y + rowH); gr.addColorStop(0, shade(col, 1.08)); gr.addColorStop(1, shade(col, 0.88));
          g.fillStyle = gr;
          const draw = (xx) => { g.beginPath(); g.moveTo(xx + 3, y + 3); g.lineTo(xx + L - 3, y + 3); g.lineTo(xx + L - 3, y + rowH - 3); g.lineTo(xx + 3, y + rowH - 3); g.closePath(); g.fill(); };
          draw(x); if (x + L > w) draw(x - w); if (x < 0) draw(x + w);
          for (let k = 0; k < 40; k++) { g.fillStyle = "rgba(" + (r() < 0.5 ? "255,255,255," : "0,0,0,") + (r() * 0.07) + ")"; g.fillRect(x + r() * L, y + r() * rowH, 3, 2); }
          x += L;
        }
      }
    });
  }
  /* うろこの瓦（屋根） */
  function shingleTex(key, base) {
    return T2("fsh" + key, [256, 256], (g, w, h, r) => {
      g.fillStyle = shade(base, 0.5); g.fillRect(0, 0, w, h);
      const rowH = 22, sw = 28;
      for (let y = -rowH; y < h + rowH; y += rowH) {
        const off = ((Math.round(y / rowH) & 1) ? sw / 2 : 0);
        for (let x = -sw; x < w + sw; x += sw) {
          const cx = x + off + sw / 2, k = 0.86 + r() * 0.28;
          const gr = g.createLinearGradient(0, y, 0, y + rowH * 1.3);
          gr.addColorStop(0, shade(base, 1.2 * k)); gr.addColorStop(0.65, shade(base, 0.98 * k)); gr.addColorStop(1, shade(base, 0.62 * k));
          g.fillStyle = gr;
          g.beginPath(); g.moveTo(cx - sw / 2 + 1, y); g.lineTo(cx + sw / 2 - 1, y); g.lineTo(cx + sw / 2 - 1, y + rowH * 0.62);
          g.quadraticCurveTo(cx + sw / 2 - 1, y + rowH * 1.3, cx, y + rowH * 1.3); g.quadraticCurveTo(cx - sw / 2 + 1, y + rowH * 1.3, cx - sw / 2 + 1, y + rowH * 0.62); g.closePath(); g.fill();
          g.strokeStyle = "rgba(0,0,0,.28)"; g.lineWidth = 1.4; g.stroke();
          g.fillStyle = "rgba(255,255,255,.12)"; g.fillRect(cx - sw / 2 + 4, y + 2, sw - 8, 2);
        }
      }
    });
  }
  /* しっくいと木の柱（ハーフティンバー）：1枚＝横 10.5m × 縦 10.5m（3階ぶん）。夜は窓に明かり */
  function timberMat(key, plaster, beam, shutter) {
    const S = 512, F = S / 3, cols = 4, Wd = S / cols;
    const cm = X.cv(S, S), ce = X.cv(S, S), g = cm.getContext("2d"), e = ce.getContext("2d"), r = X.rnd(key.length * 91 + 17);
    g.fillStyle = plaster; g.fillRect(0, 0, S, S); e.fillStyle = "#000"; e.fillRect(0, 0, S, S);
    for (let i = 0; i < 9000; i++) { g.fillStyle = r() < 0.5 ? "rgba(255,255,255," + r() * 0.12 + ")" : "rgba(80,60,40," + r() * 0.08 + ")"; g.fillRect(r() * S, r() * S, 2 + r() * 3, 2 + r() * 3); }
    const bm = (x0, y0, x1, y1, t) => { g.strokeStyle = beam; g.lineWidth = t; g.lineCap = "square"; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.strokeStyle = "rgba(255,255,255,.12)"; g.lineWidth = 2; g.beginPath(); g.moveTo(x0 - 2, y0); g.lineTo(x1 - 2, y1); g.stroke(); };
    for (let f = 0; f < 3; f++) {
      const y0 = f * F, y1 = y0 + F;
      bm(0, y1 - 7, S, y1 - 7, 14);                     /* 梁（階のさかい） */
      for (let i = 0; i <= cols; i++) bm(i * Wd, y0, i * Wd, y1, 12);
      for (let i = 0; i < cols; i++) {
        const cx = i * Wd + Wd / 2, kind = (i + f * 2) % 4;
        if (kind === 1) { bm(i * Wd + 8, y1 - 12, i * Wd + Wd - 8, y0 + 10, 9); bm(i * Wd + 8, y0 + 10, i * Wd + Wd - 8, y1 - 12, 9); continue; }   /* すじかい（×） */
        /* 窓：木の枠・十字の格子・よろい戸・花の箱 */
        const ww = Wd * 0.42, hh = F * 0.46, wy = y0 + F * 0.42;
        g.fillStyle = shade(beam, 1.2); g.fillRect(cx - ww / 2 - 6, wy - hh / 2 - 6, ww + 12, hh + 12);
        const gr = g.createLinearGradient(0, wy - hh / 2, 0, wy + hh / 2); gr.addColorStop(0, "#a8d4ee"); gr.addColorStop(1, "#33475e"); g.fillStyle = gr; g.fillRect(cx - ww / 2, wy - hh / 2, ww, hh);
        g.strokeStyle = shade(beam, 1.1); g.lineWidth = 3; g.beginPath(); g.moveTo(cx, wy - hh / 2); g.lineTo(cx, wy + hh / 2); g.moveTo(cx - ww / 2, wy); g.lineTo(cx + ww / 2, wy); g.stroke();
        [-1, 1].forEach((k) => { const sx = cx + k * (ww / 2 + 6 + 9); g.fillStyle = shutter; g.fillRect(sx - 9, wy - hh / 2 - 4, 18, hh + 8); g.fillStyle = "rgba(0,0,0,.25)"; for (let yy = wy - hh / 2; yy < wy + hh / 2; yy += 7) g.fillRect(sx - 8, yy, 16, 2); });
        g.fillStyle = shade(beam, 1.0); g.fillRect(cx - ww / 2 - 8, wy + hh / 2 + 6, ww + 16, 9);
        for (let k = 0; k < 7; k++) { g.fillStyle = ["#ff5a6e", "#ff9ad0", "#ffd84a", "#ffffff", "#ff7a3a"][Math.floor(r() * 5)]; g.beginPath(); g.arc(cx - ww / 2 + 2 + k * (ww - 4) / 6, wy + hh / 2 + 4, 4.2, 0, TAU); g.fill(); }
        g.fillStyle = "#3f8a3a"; g.fillRect(cx - ww / 2 - 4, wy + hh / 2 + 5, ww + 8, 2);
        if (r() < 0.55) { e.fillStyle = r() < 0.7 ? "rgb(255,200,120)" : "rgb(255,170,90)"; e.fillRect(cx - ww / 2, wy - hh / 2, ww, hh); }
      }
    }
    const map = X.tex(cm), emi = X.tex(ce); [map, emi].forEach((t) => { t.wrapS = t.wrapT = T.RepeatWrapping; });
    return { map, emi };
  }
  /* 鉄のランタンのガラス（提灯の形の板に貼る：琥珀のガラスと鉄の枠） */
  function lanternGlass(key, glass) {
    return T2("flg" + key, [128, 128], (g, w, h) => {
      const gr = g.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w * 0.7); gr.addColorStop(0, "#fff6d8"); gr.addColorStop(0.5, glass); gr.addColorStop(1, shade(glass, 0.6));
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = "#1d1a18"; for (let x = 0; x < w; x += w / 4) g.fillRect(x, 0, 6, h); g.fillRect(0, 0, w, 10); g.fillRect(0, h - 10, w, 10); g.fillRect(0, h / 2 - 3, w, 6);
    });
  }
  /* 旗（のれんの代わり）：色の布に紋章（盾・王冠・星・剣・十字） */
  function bannerTex(key, cloth, emblem) {
    return T2("fbn" + key, [256, 128], (g, w, h) => {
      g.fillStyle = cloth; g.fillRect(0, 0, w, h);
      g.fillStyle = shade(cloth, 0.75); for (let x = 0; x < w; x += 8) g.fillRect(x, 0, 2, h);
      g.fillStyle = "#e8c050"; g.fillRect(0, 6, w, 5); g.fillRect(0, h - 11, w, 5);
      for (let x = 0; x < w; x += 16) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 8, h - 9); g.lineTo(x + 16, h); g.fill(); }
      [w * 0.25, w * 0.75].forEach((cx) => emblemDraw(g, cx, h * 0.48, h * 0.3, emblem));
    });
  }
  function emblemDraw(g, cx, cy, s, kind) {
    g.save(); g.translate(cx, cy);
    g.fillStyle = "#f6e6b0"; g.strokeStyle = "#5a3a10"; g.lineWidth = s * 0.08;
    g.beginPath(); g.moveTo(-s * 0.7, -s * 0.8); g.lineTo(s * 0.7, -s * 0.8); g.lineTo(s * 0.7, 0); g.quadraticCurveTo(s * 0.6, s * 0.75, 0, s); g.quadraticCurveTo(-s * 0.6, s * 0.75, -s * 0.7, 0); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = "#b8262a";
    if (kind === "crown") { g.beginPath(); g.moveTo(-s * 0.45, s * 0.25); g.lineTo(-s * 0.45, -s * 0.3); g.lineTo(-s * 0.2, 0); g.lineTo(0, -s * 0.45); g.lineTo(s * 0.2, 0); g.lineTo(s * 0.45, -s * 0.3); g.lineTo(s * 0.45, s * 0.25); g.closePath(); g.fill(); }
    else if (kind === "star") { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? s * 0.2 : s * 0.48; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); g.fill(); }
    else if (kind === "sword") { g.fillRect(-s * 0.06, -s * 0.55, s * 0.12, s * 0.9); g.fillRect(-s * 0.28, s * 0.18, s * 0.56, s * 0.1); g.fillStyle = "#5a3a10"; g.fillRect(-s * 0.06, s * 0.28, s * 0.12, s * 0.22); }
    else if (kind === "cross") { g.fillRect(-s * 0.1, -s * 0.5, s * 0.2, s * 1.0); g.fillRect(-s * 0.4, -s * 0.15, s * 0.8, s * 0.2); }
    else { g.beginPath(); g.arc(0, 0, s * 0.32, 0, TAU); g.fill(); }
    g.restore();
  }

  /* 石の塔の外壁（ガラスのビル → 石づくりの塔）：1枚＝14m 四方・4階×3列のアーチ窓。夜は窓に明かり */
  function stoneTowerMat(key, stone, trim, glass) {
    const S = 512, F = S / 4, cols = 3, Wd = S / cols;
    const cm = X.cv(S, S), ce = X.cv(S, S), g = cm.getContext("2d"), e = ce.getContext("2d"), r = X.rnd(key.length * 53 + 29);
    g.fillStyle = shade(stone, 0.7); g.fillRect(0, 0, S, S); e.fillStyle = "#000"; e.fillRect(0, 0, S, S);
    for (let y = 0; y < S; y += 21.33) { let x = -r() * 40; while (x < S) { const L = 36 + r() * 40; g.fillStyle = shade(stone, 0.86 + r() * 0.26); g.fillRect(x + 1.5, y + 1.5, L - 3, 18.3); if (x + L > S) g.fillRect(x - S + 1.5, y + 1.5, L - 3, 18.3); x += L; } }
    for (let f = 0; f < 4; f++) {
      g.fillStyle = trim; g.fillRect(0, f * F + F - 8, S, 8); g.fillStyle = "rgba(255,255,255,.18)"; g.fillRect(0, f * F + F - 8, S, 2);
      for (let i = 0; i < cols; i++) {
        const cx = i * Wd + Wd / 2, ww = Wd * 0.34, hh = F * 0.58, top = f * F + F * 0.16;
        g.fillStyle = trim; g.beginPath(); g.moveTo(cx - ww / 2 - 6, top + hh + 6); g.lineTo(cx - ww / 2 - 6, top + ww / 2); g.arc(cx, top + ww / 2, ww / 2 + 6, Math.PI, 0); g.lineTo(cx + ww / 2 + 6, top + hh + 6); g.closePath(); g.fill();
        const gr = g.createLinearGradient(0, top, 0, top + hh); gr.addColorStop(0, glass); gr.addColorStop(1, "#1e2a3c"); g.fillStyle = gr;
        g.beginPath(); g.moveTo(cx - ww / 2, top + hh); g.lineTo(cx - ww / 2, top + ww / 2); g.arc(cx, top + ww / 2, ww / 2, Math.PI, 0); g.lineTo(cx + ww / 2, top + hh); g.closePath(); g.fill();
        g.strokeStyle = trim; g.lineWidth = 2.5; g.beginPath(); g.moveTo(cx, top + 2); g.lineTo(cx, top + hh); g.moveTo(cx - ww / 2, top + hh * 0.55); g.lineTo(cx + ww / 2, top + hh * 0.55); g.stroke();
        g.fillStyle = shade(trim, 0.9); g.fillRect(cx - ww / 2 - 8, top + hh + 4, ww + 16, 6);
        if (r() < 0.5) { e.fillStyle = r() < 0.7 ? "rgb(255,205,130)" : "rgb(255,175,95)"; e.beginPath(); e.moveTo(cx - ww / 2, top + hh); e.lineTo(cx - ww / 2, top + ww / 2); e.arc(cx, top + ww / 2, ww / 2, Math.PI, 0); e.lineTo(cx + ww / 2, top + hh); e.closePath(); e.fill(); }
      }
    }
    const map = X.tex(cm), emi = X.tex(ce); [map, emi].forEach((t) => { t.wrapS = t.wrapT = T.RepeatWrapping; });
    return { map, emi };
  }

  /* ══════════════ 材質の置きかえ（形はそのまま・絵だけ） ══════════════ */
  const _sm = P.styleMaterials;
  P.styleMaterials = function () {
    _sm.call(this);
    const w = this, m = w.m;
    const swap = (k, tex, o) => { const mm = m[k]; if (!mm) return; mm.map = tex; mm.color && mm.color.set(0xffffff); if (o) Object.assign(mm, o); mm.needsUpdate = true; };
    /* 道：石だたみ */
    swap("walkY", cobbleTex("fCobW", ["#c9a46a", "#d8b47a", "#b8915a", "#e0c08a", "#c8a070"], "#7a6448", 14), { roughness: 0.85 });
    swap("walkCream", flagTex("fFlag", ["#d9cdb4", "#cfc2a6", "#e2d8c2", "#c7b998", "#d4c6aa"], "#8a7c62"), { roughness: 0.82 });
    swap("roadY", cobbleTex("fCobG", ["#8f8a86", "#9c9690", "#85807b", "#a7a199", "#7d7873"], "#4f4a46", 18), { roughness: 0.9 });
    ["linePink", "lineYellow"].forEach((k) => { if (m[k]) m[k].color.set(0xcdbf9e); });
    if (m.lineWhite) m.lineWhite.color.set(0xe6dcc6);
    /* 屋根：うろこの瓦 */
    [["kwB", "#3d62b8"], ["kwG", "#3f8f4f"], ["kwR", "#c4442f"], ["kwP", "#6e4ab4"], ["kwK", "#4b505e"], ["kwO", "#d9772e"], ["kwT", "#2f8f8a"]].forEach(([k, c]) => swap(k, shingleTex(k, c), { roughness: 0.6, metalness: 0.05 }));
    /* 外壁：しっくいと木 */
    [["yRed", "#f0cdb4", "#4a2e1c", "#b8402e"], ["yTeal", "#d3e8e0", "#3a3026", "#2f8a7a"], ["yYellow", "#f4e3a8", "#4a3220", "#3a6ab8"], ["yPurple", "#e2d6ee", "#3a2a30", "#6e4ab4"],
     ["yGreen", "#dbe9c8", "#3a2c1c", "#3f8a3a"], ["yBrown", "#e9d8be", "#4a2e1c", "#8a4a22"], ["yCream", "#f6eedb", "#4a3020", "#2f6ab0"], ["yPink", "#f4d6de", "#4a2a2a", "#c03a6a"],
     ["yBlue", "#d6e1f3", "#30303a", "#3a5ab8"], ["yOrange", "#f3d6ac", "#4a2a18", "#2f8a6a"]].forEach(([k, pl, bm, sh]) => {
      const mm = m[k]; if (!mm) return; const t = timberMat(k, pl, bm, sh); mm.map = t.map; mm.emissiveMap = t.emi; mm.color.set(0xffffff); mm.roughness = 0.78; mm.needsUpdate = true;
    });
    /* 提灯 → 鉄のランタン（琥珀のガラス） */
    [["lanR", "#ffb860"], ["lanR2", "#ffa84a"], ["lanR3", "#ffc070"], ["lanW", "#fff0c0"], ["lanY", "#ffd070"], ["lanP", "#ffb0d0"], ["lanBig", "#ffb860"]].forEach(([k, gl]) => { const mm = m[k]; if (!mm) return; const t = lanternGlass(k, gl); mm.map = t; mm.emissiveMap = t; mm.emissive && mm.emissive.setRGB(1, 0.75, 0.45); mm.needsUpdate = true; });
    /* のれん → 紋章の旗 */
    [["norB", "#2a3a8a", "crown"], ["norR", "#a8262a", "sword"], ["norK", "#2a2a30", "star"], ["norG", "#2a6a3a", "cross"], ["norP", "#6a2a8a", "star"], ["norO", "#c0601a", "crown"]].forEach(([k, c, e]) => swap(k, bannerTex(k, c, e)));
    /* ガラス・オフィスのビル → 石づくりの塔（アーチ窓） */
    [["gBlue", "#9aa6b8", "#e6e0d0", "#a8d0f0"], ["gTeal", "#9fb8b0", "#e8e2d2", "#a8e0e0"], ["gGold", "#d8c08a", "#fff0c8", "#ffe0a0"], ["gPurple", "#b0a2c8", "#efe6d6", "#d0b8ff"],
     ["gSilver", "#e2e0da", "#ffffff", "#b8d8f0"], ["gGreen", "#a8b898", "#ece6d2", "#b8e8c8"], ["gDark", "#6a707c", "#c8c0b0", "#8ab0d8"], ["gRose", "#d0a8a8", "#f6e8dc", "#ffc8d8"],
     ["oWhite", "#e6e0d4", "#ffffff", "#9ac0e0"], ["oBeige", "#d6c4a8", "#f6ead2", "#9ac0e0"], ["oGray", "#a8aeb6", "#e4e0d8", "#a8c8e8"], ["oBlue", "#c0cede", "#f0ece2", "#a8c8f0"]].forEach(([k, st, tr, gl]) => {
      const mm = m[k]; if (!mm) return; const t = stoneTowerMat(k, st, tr, gl); mm.map = t.map; mm.emissiveMap = t.emi; mm.color.set(0xffffff); mm.roughness = 0.84; mm.metalness = 0.02; mm.envMapIntensity = 0.3; mm.needsUpdate = true;
    });
    if (m.woodRed) m.woodRed.color.set(0x7a4a2a);          /* 朱の柱 → こげ茶の木 */
    if (m.tealMetal) m.tealMetal.color.set(0x2a2a30);      /* 青緑の金属 → 黒い鉄 */
    if (m.lanternCap) m.lanternCap.color.set(0x1d1a18);
    /* ファンタジーの新しい材質 */
    const std = (o) => { const x = new T.MeshStandardMaterial(o); x.envMapIntensity = 0.4; return x; };
    m.fStone = std({ map: flagTex("fStoneWall", ["#bdb6a8", "#a9a294", "#c8c1b2", "#b2aa9a", "#9e9788"], "#6e675c"), roughness: 0.9 });
    m.fStoneDark = std({ map: flagTex("fStoneWall2", ["#8e8678", "#7d766a", "#9a9284", "#857e72"], "#4e4840"), roughness: 0.92 });
    m.fWood = std({ map: T2("fWoodPl", [256, 256], (g, W2, H2, r) => { g.fillStyle = "#6a4426"; g.fillRect(0, 0, W2, H2); for (let x = 0; x < W2; x += 32) { g.fillStyle = shade("#7a5030", 0.85 + r() * 0.3); g.fillRect(x + 1, 0, 30, H2); for (let k = 0; k < 14; k++) { g.strokeStyle = "rgba(40,20,8," + (0.1 + r() * 0.15) + ")"; g.lineWidth = 1; g.beginPath(); const y0 = r() * H2; g.moveTo(x + 2, y0); g.bezierCurveTo(x + 10, y0 + 6, x + 20, y0 - 6, x + 30, y0 + 3); g.stroke(); } } }), roughness: 0.8 });
    m.fIron = std({ color: 0x24221f, roughness: 0.45, metalness: 0.6 });
    m.fGold = std({ color: 0xe0b44a, roughness: 0.3, metalness: 0.85 });
    m.fCanvasR = std({ map: T2("fCanR", [128, 128], (g, W2, H2) => { for (let x = 0; x < W2; x += 32) { g.fillStyle = "#c8322e"; g.fillRect(x, 0, 16, H2); g.fillStyle = "#f6efe0"; g.fillRect(x + 16, 0, 16, H2); } }), roughness: 0.9, side: T.DoubleSide });
    m.fCanvasB = std({ map: T2("fCanB", [128, 128], (g, W2, H2) => { for (let x = 0; x < W2; x += 32) { g.fillStyle = "#2f5ab8"; g.fillRect(x, 0, 16, H2); g.fillStyle = "#f6efe0"; g.fillRect(x + 16, 0, 16, H2); } }), roughness: 0.9, side: T.DoubleSide });
    m.fCanvasG = std({ map: T2("fCanG", [128, 128], (g, W2, H2) => { for (let x = 0; x < W2; x += 32) { g.fillStyle = "#2f8a4a"; g.fillRect(x, 0, 16, H2); g.fillStyle = "#f2e8c8"; g.fillRect(x + 16, 0, 16, H2); } }), roughness: 0.9, side: T.DoubleSide });
    m.fCanvasY = std({ map: T2("fCanY", [128, 128], (g, W2, H2) => { for (let x = 0; x < W2; x += 32) { g.fillStyle = "#e0a02a"; g.fillRect(x, 0, 16, H2); g.fillStyle = "#7a2a8a"; g.fillRect(x + 16, 0, 16, H2); } }), roughness: 0.9, side: T.DoubleSide });
    const flame = new T.MeshBasicMaterial({ color: 0xffa040, toneMapped: false }); m.fFlame = flame; w.nightMats.push({ m: flame, base: new T.Color(0xffa040), day: 1.0, night: 3.2 });
    ["F_R", "F_B", "F_Y", "F_G", "F_P", "F_W"].forEach((k, i) => { m[k] = std({ color: [0xd8343a, 0x2f5ab8, 0xf0c03a, 0x2f9a4a, 0x8a4ac8, 0xf4efe2][i], roughness: 0.85, side: T.DoubleSide }); });
  };

  /* ══════════════ 看板：木の板に明朝の文字 ══════════════ */
  const lum = (c) => { try { const k = new T.Color(c); return 0.2126 * k.r + 0.7152 * k.g + 0.0722 * k.b; } catch (e) { return 0.5; } };
  /* 電光掲示板（黒い板に、文字と光が同じ色＝オレンジや緑の LED）だけはそのまま */
  const isLed = (o) => !!(o.glow && o.color && o.bg && /^#/.test(o.bg) && lum(o.bg) < 0.02 && !o.grad && String(o.color).toLowerCase() === String(o.glow).toLowerCase());
  function drawWood(g, x, y, w, h, text, o) {
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    const tint = o.grad ? o.grad[0] : (o.bg && /^#|^rgb/.test(o.bg) ? o.bg : "#5a3a22");
    const base = mix("#5c3a20", tint, 0.28), r = X.rnd(Math.round(w * 7 + h * 13 + String(text).length * 31));
    const gr = g.createLinearGradient(x, y, x, y + h); gr.addColorStop(0, shade(base, 1.18)); gr.addColorStop(1, shade(base, 0.82)); g.fillStyle = gr; g.fillRect(x, y, w, h);
    /* 板目（横の板・木目） */
    const nP = Math.max(1, Math.round(h / 54));
    for (let i = 1; i < nP; i++) { g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(x, y + i * h / nP - 1, w, 2.5); }
    for (let k = 0; k < Math.round(w * h / 900); k++) { g.strokeStyle = "rgba(20,10,4," + (0.08 + r() * 0.14) + ")"; g.lineWidth = 1 + r(); const yy = y + r() * h, xx = x + r() * w; g.beginPath(); g.moveTo(xx, yy); g.bezierCurveTo(xx + 20, yy + 3, xx + 40, yy - 3, xx + 60 + r() * 60, yy + 1); g.stroke(); }
    /* 金の縁・すみのびょう */
    const bw = Math.max(3, Math.min(w, h) * 0.07);
    g.strokeStyle = "#d8aa4a"; g.lineWidth = bw; g.strokeRect(x + bw / 2 + 2, y + bw / 2 + 2, w - bw - 4, h - bw - 4);
    g.strokeStyle = "rgba(60,30,8,.6)"; g.lineWidth = Math.max(1, bw * 0.25); g.strokeRect(x + bw + 3, y + bw + 3, w - bw * 2 - 6, h - bw * 2 - 6);
    g.fillStyle = "#f0d070"; [[x + bw * 1.6, y + bw * 1.6], [x + w - bw * 1.6, y + bw * 1.6], [x + bw * 1.6, y + h - bw * 1.6], [x + w - bw * 1.6, y + h - bw * 1.6]].forEach(([px, py]) => { g.beginPath(); g.arc(px, py, bw * 0.45, 0, TAU); g.fill(); });
    /* 文字（明朝・クリーム色・こげ茶のふち） */
    const lines = String(text).split("\n");
    let fs = o.size || Math.min(h * 0.6 / lines.length, w * 0.86 / Math.max(...lines.map((l) => Math.max(1, l.length))) * 1.75);
    const font = () => (o.weight || 900) + " " + fs + "px " + SERIF;
    g.font = font();
    const maxW = Math.max(...lines.map((l) => g.measureText(l).width)); if (maxW > w * 0.86) { fs *= w * 0.86 / maxW; g.font = font(); }
    g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
    lines.forEach((l, i) => { const ty = y + h / 2 + (i - (lines.length - 1) / 2) * fs * 1.12;
      g.strokeStyle = "#2a1406"; g.lineWidth = Math.max(2, fs * 0.16); g.strokeText(l, x + w / 2, ty);
      g.fillStyle = "#ffeec2"; g.fillText(l, x + w / 2, ty);
      g.fillStyle = "rgba(255,255,255,.18)"; g.fillText(l, x + w / 2 - fs * 0.02, ty - fs * 0.03); });
    g.restore();
  }
  const _sign = P.sign;
  P.sign = function (text, o, sw, sh, x, y, z, ry, extra) {
    o = o || {};
    if (o.keep || isLed(o) || !this.signAtlas) return _sign.apply(this, arguments);
    /* ★ 看板の絵の大きさ（m あたり 50〜90 画素で十分。前は小さな看板も 1024 画素で、看板の絵の紙が 90 枚＝重かった） */
    let pw = o.px || (sw / sh > 5 ? 1024 : 512);
    if (sw < 12) pw = Math.min(pw, 512); if (sw < 4.5) pw = Math.min(pw, 256);
    const ph = Math.max(48, Math.round(pw * sh / sw / 8) * 8);
    const s = this.signAtlas.slot(pw, Math.min(512, ph));
    drawWood(s.p.g, s.x, s.y, s.w, s.h, text, o);
    const g = new T.PlaneGeometry(sw, sh), uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (s.x + uv.getX(i) * s.w) / 2048, 1 - (s.y + (1 - uv.getY(i)) * s.h) / 2048);
    const add = (r, off) => this.batch.add(s.p.key, this.m[s.p.key], g, new T.Matrix4().compose(new T.Vector3(x + Math.sin(r) * off, y, z + Math.cos(r) * off), new T.Quaternion().setFromEuler(new T.Euler(0, r, 0)), new T.Vector3(1, 1, 1)), extra && extra.detail);
    add(ry || 0, 0.01);
    if (o.both) add((ry || 0) + Math.PI, 0.01);
  };

  /* ══════════════ 街灯：黒い鉄の柱＋ガラスのランタン ══════════════ */
  P.yomaLamp = function (x, z, ry) {
    const W = this;
    W.detail(() => {
      W.geo("fIron", new T.CylinderGeometry(0.22, 0.3, 0.6, 8), x, 0.3, z);
      W.geo("fIron", new T.CylinderGeometry(0.07, 0.1, 4.0, 8), x, 2.6, z);
      W.geo("fIron", new T.TorusGeometry(0.16, 0.035, 5, 10), x, 0.95, z);
      /* ランタン（4本の枠・ガラス・屋根・飾り） */
      const ly = 4.85;
      W.geo("fIron", new T.CylinderGeometry(0.2, 0.14, 0.12, 4).rotateY(Math.PI / 4), x, ly - 0.42, z);
      W.geo("lampY", new T.CylinderGeometry(0.2, 0.15, 0.62, 4, 1).rotateY(Math.PI / 4), x, ly, z);
      [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => W.geo("fIron", new T.BoxGeometry(0.035, 0.66, 0.035), x + a * 0.14, ly, z + b * 0.14));
      W.geo("fIron", new T.ConeGeometry(0.3, 0.36, 4).rotateY(Math.PI / 4), x, ly + 0.5, z);
      W.geo("fIron", new T.SphereGeometry(0.06, 6, 5), x, ly + 0.74, z);
    });
    W.colCircle(x, z, 0.24); W.lamps.push([x, z]);
  };
  /* 提灯 → 鉄のランタン（ガラスの箱）。y は下のはし */
  P.lantern = function (x, y, z, s, key, ry) {
    const W = this; s = s || 1;
    W.geo(key || "lanR", new T.CylinderGeometry(0.26 * s, 0.2 * s, 0.7 * s, 6).rotateY(ry || 0), x, y + 0.45 * s, z);
    W.geo("fIron", new T.ConeGeometry(0.36 * s, 0.32 * s, 6).rotateY(ry || 0), x, y + 0.96 * s, z);
    W.geo("fIron", new T.CylinderGeometry(0.22 * s, 0.24 * s, 0.08 * s, 6), x, y + 0.08 * s, z);
    W.geo("fIron", new T.TorusGeometry(0.08 * s, 0.018 * s, 4, 8), x, y + 1.18 * s, z);
  };
  /* 提灯の列 → 三角の旗のガーランド（色とりどり） */
  const _ls = P.lanternString;
  P.lanternString = function (x0, z0, x1, z1, h, n, seed) {
    const W = this, L = Math.hypot(x1 - x0, z1 - z0);
    [[x0, z0], [x1, z1]].forEach(([x, z]) => { if (W.anchorAt && W.anchorAt(x, z, h)) return; (W._anchors = W._anchors || []).push([x, z]); W.geo("fWood", new T.CylinderGeometry(0.1, 0.13, h + 0.4, 8), x, (h + 0.4) / 2, z); W.geo("fGold", new T.SphereGeometry(0.16, 8, 6), x, h + 0.5, z); W.colCircle(x, z, 0.2); });
    W.detail(() => {
      const nn = Math.max(4, Math.round(L / 1.1)), keys = ["F_R", "F_B", "F_Y", "F_G", "F_P", "F_W"], ryP = Math.atan2(-(z1 - z0), x1 - x0);
      const yAt = (t) => h - Math.sin(Math.PI * t) * L * 0.05, up = new T.Vector3(0, 1, 0), dir = new T.Vector3();
      for (let i = 0; i < nn; i++) {
        const t0 = i / nn, t1 = (i + 1) / nn, ax = x0 + (x1 - x0) * t0, az = z0 + (z1 - z0) * t0, bx = x0 + (x1 - x0) * t1, bz = z0 + (z1 - z0) * t1, ay = yAt(t0), by = yAt(t1);
        dir.set(bx - ax, by - ay, bz - az); const sl = dir.length(); dir.normalize();
        const seg = new T.CylinderGeometry(0.012, 0.012, sl, 3).applyQuaternion(new T.Quaternion().setFromUnitVectors(up, dir));
        W.geo("fIron", seg, (ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
        const tri = new T.BufferGeometry(); tri.setAttribute("position", new T.Float32BufferAttribute([-0.34, 0, 0, 0.34, 0, 0, 0, -0.62, 0], 3)); tri.computeVertexNormals();
        W.geo(keys[(i + (seed || 0)) % keys.length], tri, (ax + bx) / 2, (ay + by) / 2 - 0.01, (az + bz) / 2, ryP);
      }
    });
    void _ls;
  };
  /* 大きな目（妖怪の町の飾り）は出さない */
  P.eyes = function () {};

  /* ══════════════ お店：急な切妻屋根・煙突・ドーマー窓・壁のランタン・つり看板 ══════════════ */
  function gableRoof(w, d, rh, ov) {
    ov = ov == null ? 0.7 : ov;
    const sh = new T.Shape(); sh.moveTo(-d / 2 - ov, 0); sh.lineTo(d / 2 + ov, 0); sh.lineTo(0, rh); sh.lineTo(-d / 2 - ov, 0);
    const g = new T.ExtrudeGeometry(sh, { depth: w + ov * 2, bevelEnabled: false }); g.translate(0, 0, -(w + ov * 2) / 2); g.rotateY(Math.PI / 2);
    const uv = g.attributes.uv, p = g.attributes.position, n = g.attributes.normal;
    for (let i = 0; i < uv.count; i++) { const ny = Math.abs(n.getY(i)); if (ny > 0.2) uv.setXY(i, p.getX(i) / 2.6, (Math.abs(p.getZ(i)) * 0.8 + p.getY(i)) / 2.2); else uv.setXY(i, p.getZ(i) / 3, p.getY(i) / 3); }
    return g;
  }
  P.fantasyRoof = function (x, z, w, d, top, ry, rk, o) {
    o = o || {};
    const W = this, c = Math.cos(ry || 0), s = Math.sin(ry || 0), L = (a, b) => [x + a * c + b * s, z - a * s + b * c];
    const rh = o.rh || Math.max(2.4, Math.min(w, d) * 0.62);
    W.geo(rk, gableRoof(w, d, rh, 0.75), x, top, z, ry || 0);
    /* 妻側の三角（壁と同じ色・木の梁） */
    const tri = new T.Shape(); tri.moveTo(-d / 2, 0); tri.lineTo(d / 2, 0); tri.lineTo(0, rh * 0.97); tri.lineTo(-d / 2, 0);
    const tg = new T.ShapeGeometry(tri), wall = o.wall || "creamW";
    { const uv = tg.attributes.uv, p = tg.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / 10.5 + 0.5, p.getY(i) / 10.5 + 0.34); }          /* 外壁の絵（1枚＝10.5m）に合わせる */
    [[w / 2 + 0.01, Math.PI / 2], [-w / 2 - 0.01, -Math.PI / 2]].forEach(([a, r2]) => { const [px, pz] = L(a, 0); W.geo(wall, tg.clone(), px, top, pz, (ry || 0) + r2); });
    W.detail(() => {
      /* 煙突 */
      if (o.chimney !== false) { const [cx, cz] = L(w * 0.28, -d * 0.18); W.geo("fStone", new T.BoxGeometry(0.9, rh * 0.9 + 1.2, 0.9), cx, top + rh * 0.45 + 0.6, cz, ry || 0); W.geo("fStoneDark", new T.BoxGeometry(1.1, 0.25, 1.1), cx, top + rh * 0.9 + 1.25, cz, ry || 0); }
      /* ドーマー窓（屋根の前） */
      if (o.dormer !== false && w >= 7) { const [dx2, dz2] = L(-w * 0.18, d * 0.18), dh = rh * 0.42;
        W.geo(wall, new T.BoxGeometry(1.8, dh, 1.6), dx2, top + rh * 0.3 + dh / 2 - 0.1, dz2, ry || 0);
        W.geo(rk, gableRoof(1.8, 1.6, 0.9, 0.2), dx2, top + rh * 0.3 + dh - 0.1, dz2, (ry || 0) + Math.PI / 2);
        const [wx, wz] = L(-w * 0.18, d * 0.18 + 0.81); W.geo("windowDark", new T.PlaneGeometry(0.9, dh * 0.6), wx, top + rh * 0.3 + dh * 0.45, wz, ry || 0); }
      /* 棟の飾り（金の玉・旗） */
      const [fx, fz] = L(-w / 2 - 0.3, 0); W.geo("fIron", new T.CylinderGeometry(0.04, 0.04, 1.4, 4), fx, top + rh + 0.4, fz); W.geo("fGold", new T.SphereGeometry(0.14, 8, 6), fx, top + rh + 1.1, fz);
    });
    return top + rh;
  };
  const _shop = P.yomaShop;
  P.yomaShop = function (x, z, w, d, h, o) {
    o = Object.assign({}, o || {});
    const roof = o.roof || "kawara", ry = o.ry || 0;
    o.eyes = false;
    const nl = o.lanterns == null ? 2 : o.lanterns; o.lanterns = 0;
    const prop = o.prop; delete o.prop;
    const gable = roof === "kawara";
    if (gable) o.roof = "none";
    if (o.noren) o.noren = o.noren;            /* のれん＝紋章の旗（材質が変わる） */
    const top0 = _shop.call(this, x, z, w, d, h, o);
    const W = this, c = Math.cos(ry), s = Math.sin(ry), L = (a, b) => [x + a * c + b * s, z - a * s + b * c];
    let top = top0;
    if (gable) top = W.fantasyRoof(x, z, w, d, h, ry, o.roofKey || "kwB", { rh: o.rh ? Math.max(o.rh * 1.25, Math.min(w, d) * 0.55) : null, wall: o.key || "creamW" });
    /* 壁のランタン（入口の両わき）・つり看板 */
    const shopH = Math.min(4.2, h * 0.55);
    W.detail(() => {
      for (let i = 0; i < Math.min(2, nl); i++) { const a = (i ? 1 : -1) * Math.min(w / 2 - 0.8, 2.6), [px, pz] = L(a, d / 2 + 0.32); W.geo("fIron", new T.BoxGeometry(0.06, 0.06, 0.5), px, shopH - 0.9, pz - 0.0, ry); W.lantern(px + s * 0.18, shopH - 1.75, pz + c * 0.18, 0.62, ["lanR", "lanW", "lanY", "lanR2"][i % 4], ry); }
      if (o.sign && w >= 6) { const [bx2, bz2] = L(w / 2 - 0.3, d / 2 + 0.9); W.geo("fIron", new T.BoxGeometry(0.06, 0.06, 1.6), bx2, shopH + 0.4, bz2, ry); W.geo("fIron", new T.BoxGeometry(0.05, 0.5, 0.05), bx2, shopH + 0.15, bz2, ry);
        W.sign(String(o.sign).slice(0, 6), { bg: "#5a3a22", px: 256, both: true }, 1.25, 0.8, bx2 - c * 0.0, shopH - 0.35, bz2 + 0.0, ry + Math.PI / 2); }
    });
    if (prop) { const [px, pz] = L(o.propX || 0, o.propZ || 0); W.giantProp(prop, px, top - (gable ? 0.6 : 0.05), pz, o.propS || Math.min(w, d) * 0.22, ry + (o.propR || 0)); }
    return top;
  };

  /* ══════════════ ファンタジーの家（すき間のお店・町の家） ══════════════ */
  const WALLS = ["yCream", "yYellow", "yBrown", "yPink", "yBlue", "yGreen", "yRed", "yPurple", "yOrange", "yTeal"], ROOFS = ["kwB", "kwR", "kwG", "kwP", "kwO", "kwT", "kwK"];
  P.fantasyHouse = function (x, z, w, d, h, o) {
    o = o || {};
    const W = this, ry = o.ry || 0, r = X.rnd(Math.abs(Math.round(x * 13 + z * 7)) + 5), wall = o.key || WALLS[Math.floor(r() * WALLS.length)], rk = o.roofKey || ROOFS[Math.floor(r() * ROOFS.length)];
    const top = W.yomaShop(x, z, w, d, h, { ry, key: wall, shop: o.shop || (r() < 0.5 ? "shopA" : "shopC"), roof: "kawara", roofKey: rk, sign: o.sign, signColor: "#5a3a22", lanterns: 2, noren: o.noren, inside: o.inside, rh: o.rh });
    /* 石の土台・角の塔（ときどき） */
    const c = Math.cos(ry), s = Math.sin(ry), L = (a, b) => [x + a * c + b * s, z - a * s + b * c];
    W.detail(() => { W.box("fStone", x, 0, z, w + 0.3, 0.7, d + 0.3, { ry }); });
    if (o.tower || r() < 0.22) { const [tx, tz] = L(w / 2 - 0.4, d / 2 - 0.4); W.turret(tx, tz, 1.3, h + 2 + r() * 3, wall, rk, true); }
    return top;
  };

  /* ══════════════ 屋台 → しま模様の天幕の屋台 ══════════════ */
  P.yatai = function (x, z, ry, name, noren, prop) {
    const W = this, c = Math.cos(ry), s = Math.sin(ry), L = (a, b) => [x + a * c + b * s, z - a * s + b * c];
    W.box("fWood", x, 0, z, 3.4, 1.0, 1.8, { ry, collide: true });
    W.box("woodDark", x, 1.0, z, 3.6, 0.08, 2.0, { ry });
    [[-1.6, -0.8], [1.6, -0.8], [-1.6, 0.8], [1.6, 0.8]].forEach(([a, b]) => { const [px, pz] = L(a, b); W.box("fWood", px, 0, pz, 0.12, 2.7, 0.12, { ry }); });
    const can = ["fCanvasR", "fCanvasB", "fCanvasG", "fCanvasY"][Math.abs(Math.round(x + z)) % 4];
    W.geo(can, gableRoof(3.8, 2.4, 0.9, 0.25), x, 2.65, z, ry + Math.PI / 2);
    W.detail(() => { [-1.5, 1.5].forEach((a) => { const [lx, lz] = L(a, 1.0); W.lantern(lx, 1.7, lz, 0.45, "lanW", ry); }); });
    if (name) { const [px, pz] = L(0, 1.02); W.sign(name, { bg: "#5a3a22", px: 512, both: true }, 2.8, 0.55, px, 2.3, pz, ry); }
    if (prop) W.giantProp(prop, x, 3.6, z, 0.42, ry);
    W.caster(x, z, 3.4, 1.8, 3.4, ry);
  };

  /* ══════════════ エリアの門：石の塔 2 本と石のアーチ ══════════════ */
  P.areaGate = function (x, z, ry, area, style, spanIn) {
    const W = this, a = typeof area === "string" ? XP.A[area] : area; if (!a) return;
    const c = Math.cos(ry), s = Math.sin(ry), col = a.c || "#3a78e8", span = spanIn || (style === "big" ? 20 : 15), hh = Math.max(style === "big" ? 12 : 9.5, span * 0.55);
    (W.gates = W.gates || []).push({ x, z, ry, id: a.id, span });
    const flagK = "fGate_" + a.id; if (!W.m[flagK]) { const mm = new T.MeshStandardMaterial({ color: new T.Color(col), roughness: 0.8, side: T.DoubleSide }); W.m[flagK] = mm; }
    const roofK = "fGateR_" + a.id; if (!W.m[roofK]) { const base = new T.Color(col); const mm = new T.MeshStandardMaterial({ map: shingleTex("g" + a.id, "#" + base.clone().multiplyScalar(0.85).getHexString()), roughness: 0.6 }); W.m[roofK] = mm; }
    [-1, 1].forEach((k) => {
      const px = x + k * (span / 2 + 1.2) * c, pz = z - k * (span / 2 + 1.2) * s, R = 1.9;
      W.geo("fStone", new T.CylinderGeometry(R, R * 1.08, hh, 14), px, hh / 2, pz);
      W.geo("fStoneDark", new T.CylinderGeometry(R * 1.18, R * 1.18, 0.8, 14), px, hh + 0.2, pz);
      for (let i = 0; i < 8; i++) { const aa = i / 8 * TAU; W.geo("fStone", new T.BoxGeometry(0.7, 0.8, 0.5), px + Math.cos(aa) * R * 1.05, hh + 0.95, pz + Math.sin(aa) * R * 1.05, -aa); }
      W.geo(roofK, new T.ConeGeometry(R * 1.35, R * 3.0, 14), px, hh + 1.3 + R * 1.5, pz);
      W.geo("fGold", new T.ConeGeometry(0.1, 1.4, 4), px, hh + 1.3 + R * 3 + 0.5, pz);
      /* 塔の旗（エリアの色）・たいまつ */
      W.detail(() => {
        const fx = px + s * (R + 0.05) * 1, fz = pz + c * (R + 0.05) * 1;
        W.geo(flagK, new T.PlaneGeometry(1.5, 3.4), fx, hh - 2.6, fz, ry);
        W.geo(flagK, new T.PlaneGeometry(1.5, 3.4), px - s * (R + 0.05), hh - 2.6, pz - c * (R + 0.05), ry + Math.PI);
        W.geo("fGold", new T.BoxGeometry(1.7, 0.12, 0.12), fx, hh - 0.85, fz, ry);
        [1, -1].forEach((q) => { const tx = px + s * q * (R + 0.35), tz = pz + c * q * (R + 0.35); W.geo("fIron", new T.CylinderGeometry(0.06, 0.04, 0.9, 6), tx, 3.2, tz); W.geo("fIron", new T.CylinderGeometry(0.16, 0.1, 0.25, 6), tx, 3.7, tz); W.geo("fFlame", new T.ConeGeometry(0.14, 0.42, 6), tx, 4.0, tz); });
      });
      W.colCircle(px, pz, R + 0.1);
    });
    /* 石のアーチ（2本の塔をつなぐ）・かなめ石・名前の板 */
    const AR = span / 2 + 0.6, arcY = hh - 1.7 - AR;
    const arc = new T.TorusGeometry(AR, 0.85, 8, 28, Math.PI); arc.rotateY(ry);
    W.geo("fStone", arc, x, arcY, z);
    W.box("fStone", x, hh - 1.6, z, span + 2.4, 2.2, 1.6, { ry });
    W.box("fStoneDark", x, hh + 0.5, z, span + 2.6, 0.4, 1.8, { ry });
    W.geo("fGold", new T.BoxGeometry(1.0, 1.3, 1.75), x, hh - 1.75, z, ry);
    const txt = a.n + "  " + a.name;
    W.sign(txt, { bg: col, px: 1024 }, span - 0.8, 1.55, x + s * 0.82, hh - 0.5, z + c * 0.82, ry);
    W.sign(txt, { bg: col, px: 1024 }, span - 0.8, 1.55, x - s * 0.82, hh - 0.5, z - c * 0.82, ry + Math.PI);
    W.caster(x, z, span + 4, 2, hh, ry); W.casters[W.casters.length - 1].gate = true;
  };

  /* ══════════════ 大門 → 石の城門（2つの塔・アーチ・落とし格子・旗） ══════════════ */
  P.pagodaGate = function (x, z, ry, s, o) {
    o = o || {};
    const W = this, c = Math.cos(ry), sn = Math.sin(ry), L = (a, b) => [x + a * c + b * sn, z - a * sn + b * c];
    const H = 11 * s;
    [-1, 1].forEach((k) => { const [px, pz] = L(k * 6 * s, 0), R = 2.2 * s;
      W.geo("fStone", new T.CylinderGeometry(R, R * 1.06, H + 3 * s, 14), px, (H + 3 * s) / 2, pz);
      W.geo(o.roofKey || "kwB", new T.ConeGeometry(R * 1.35, R * 3.2, 14), px, H + 3 * s + R * 1.6, pz);
      W.geo("fGold", new T.ConeGeometry(0.12 * s, 1.6 * s, 4), px, H + 3 * s + R * 3.2 + 0.6, pz);
      W.colCircle(px, pz, R + 0.1); });
    W.box("fStone", x, H - 2.5 * s, z, 10 * s, 4.6 * s, 3.2 * s, { ry });
    for (let i = -4; i <= 4; i++) { const [px, pz] = L(i * 1.1 * s, 0); W.box("fStone", px, H + 2.1 * s, pz, 0.7 * s, 0.9 * s, 3.4 * s, { ry }); }
    const arc = new T.TorusGeometry(3.8 * s, 0.7 * s, 8, 24, Math.PI); arc.rotateY(ry); W.geo("fStoneDark", arc, x, H - 4.8 * s, z);
    [-1, 1].forEach((k) => { const [px, pz] = L(0, k * 1.62 * s); W.detail(() => { for (let i = -3; i <= 3; i++) { const [qx, qz] = L(i * 0.95 * s, k * 1.62 * s); W.box("fIron", qx, H - 4.6 * s, qz, 0.08 * s, 1.2 * s, 0.08 * s, { ry }); } }); void px; void pz; });
    if (o.text) { const [px, pz] = L(0, 1.65 * s); W.sign(o.text, { bg: "#3a2416", px: 1024, both: true }, 7 * s, 1.1 * s, px, H - 1.6 * s, pz, ry); }
    W.detail(() => [-1, 1].forEach((k) => { const [px, pz] = L(k * 3.2 * s, 1.7 * s); W.geo("F_R", new T.PlaneGeometry(1.4 * s, 3.2 * s), px, H - 2.4 * s, pz, ry); }));
    W.caster(x, z, 16 * s, 5 * s, H + 6 * s, ry); W.casters[W.casters.length - 1].gate = true;
  };
  /* 五重の塔 → 魔法使いの塔（石の円柱・張り出しの部屋・円すいの屋根・光る玉） */
  P.pagodaTower = function (x, z, w, tiers, o) {
    o = o || {};
    const W = this, R = w * 0.55, H = 8 + tiers * 5.2;
    W.geo("fStone", new T.CylinderGeometry(R + 1.5, R + 1.8, 1.2, 18), x, 0.6, z);
    W.geo("fStone", new T.CylinderGeometry(R * 0.86, R, H, 18), x, 1.2 + H / 2, z);
    for (let i = 1; i < tiers; i++) W.geo("fStoneDark", new T.CylinderGeometry(R * 0.95, R * 0.95, 0.5, 18), x, 1.2 + i * H / tiers, z);
    const cy = 1.2 + H;
    W.geo("fStoneDark", new T.CylinderGeometry(R * 1.3, R * 0.9, 1.2, 18), x, cy + 0.4, z);
    W.geo(o.key && /^y/.test(o.key) ? o.key : "yPurple", new T.CylinderGeometry(R * 1.2, R * 1.2, 4.2, 18), x, cy + 3, z);
    W.geo(o.roofKey || "kwP", new T.ConeGeometry(R * 1.55, R * 3.6, 18), x, cy + 5.1 + R * 1.8, z);
    const orbK = "fOrb"; if (!W.m[orbK]) { const mm = new T.MeshStandardMaterial({ color: 0x8ad8ff, emissive: 0x6ac8ff, emissiveIntensity: 1.2, roughness: 0.2 }); W.m[orbK] = mm; W.nightMats.push({ m: mm, day: 1.0, night: 2.6 }); }
    W.geo(orbK, new T.SphereGeometry(0.7, 16, 12), x, cy + 5.1 + R * 3.6 + 0.6, z);
    W.detail(() => { for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; W.geo("windowDark", new T.BoxGeometry(0.8, 1.6, 0.2), x + Math.cos(a) * R * 1.21, cy + 3, z + Math.sin(a) * R * 1.21, -a + Math.PI / 2); } });
    W.colCircle(x, z, R + 1.8); W.casterCircle(x, z, R, cy + 6 + R * 3.6);
    return cy + 6;
  };

  /* ══════════════ 高い塔（ビル）のてっぺん：のこぎり形の胸壁・円すいの屋根・金の飾り・旗 ══════════════ */
  const _sky = P.skyscraper;
  P.skyscraper = function (x, z, w, d, h, o) {
    o = o || {};
    const y = _sky.apply(this, arguments);
    if (o.spire) return y;          /* ヘリポートの上も屋根にする（ファンタジーの塔） */
    const W = this, steps = o.steps || 3, tp = o.taper || 0.8, k = Math.pow(tp, steps - 1), tw = w * k, td = d * k, R = Math.min(tw, td) * 0.62;
    const lm = W._landmark; W._landmark = true;
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; W.geo("fStone", new T.BoxGeometry(1.2, 1.4, 0.8), x + Math.cos(a) * R * 0.98, y + 1.1, z + Math.sin(a) * R * 0.98, -a); }
    W.geo("fStoneDark", new T.CylinderGeometry(R * 0.92, R * 0.98, 1.0, 16), x, y + 0.5, z);
    const rk = ["kwB", "kwR", "kwP", "kwG", "kwT"][Math.abs(Math.round(x * 3 + z)) % 5];
    W.geo(rk, new T.ConeGeometry(R * 0.95, R * 2.4, 16), x, y + 1.0 + R * 1.2, z);
    W.geo("fGold", new T.ConeGeometry(0.25, 3.2, 6), x, y + 1.0 + R * 2.4 + 1.4, z);
    W.geo("fGold", new T.SphereGeometry(0.4, 10, 8), x, y + 1.0 + R * 2.4 + 0.2, z);
    W.geo("F_R", new T.PlaneGeometry(2.4, 1.3), x + 1.25, y + 1.0 + R * 2.4 + 2.0, z);
    W._landmark = lm;
    return y;
  };

  /* ══════════════ 駅のデザイン・規模をエリアごとに（★★ 2026-10-02 ご指定「駅のデザインはエリアによって変えて規模も変えて」） ══════════════
     モノレールの 12 駅：色（柱・梁・屋根の帯・床・手すり・光る線）をエリアの世界観に塗りかえ、規模（1〜3）で飾りを変える。
       規模1＝角の塔 2 本・旗／規模2＝＋石の門（入口のアーチ）・花だん／規模3＝＋時計台・大きな広場・旗の列
     テーマの飾り：魔法（水晶）・金の宮殿（金のドーム）・紅い月（赤い玉）・港（灯台の灯）・リゾート（ヤシ）・東の町（ランタン） */
  const uvS = (g, su, sv) => { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); return g; };
  const ST_THEME = {
    M01: { k: "grand", sc: 3, wall: 0xf0ebe0, base: 0xb8b0a0, metal: 0xd8aa4a, band: 0x3d62b8, floor: 0xe6dcc6, roof: "kwB", ban: "F_B", stone: "fStone", jp: "王都の玄関" },
    M02: { k: "sea", sc: 1, wall: 0xf6f4ee, base: 0xc8d4dc, metal: 0x8a6a48, band: 0x2f8f8a, floor: 0xf0e6cc, roof: "kwT", ban: "F_W", stone: "fStone", jp: "浜辺の駅" },
    M03: { k: "aqua", sc: 2, wall: 0xdcefee, base: 0xa8c4c4, metal: 0x2a2a30, band: 0x2f8f8a, floor: 0xe2ece6, roof: "kwT", ban: "F_B", stone: "fStone", jp: "水の都の駅" },
    M04: { k: "magic", sc: 3, wall: 0x8a8098, base: 0x5e586a, metal: 0x24221f, band: 0x6e4ab4, floor: 0xb8b0c4, roof: "kwP", ban: "F_P", stone: "fStoneDark", crystal: true, jp: "魔法の王国の駅" },
    M05: { k: "castle", sc: 2, wall: 0xd2cabc, base: 0x9a9284, metal: 0x24221f, band: 0xc4442f, floor: 0xd8cdb4, roof: "kwR", ban: "F_R", stone: "fStone", jp: "城下の駅" },
    M06: { k: "jungle", sc: 1, wall: 0x8a6a48, base: 0x6a5038, metal: 0x5a3a22, band: 0x3f8f4f, floor: 0xc8b48a, roof: "kwG", ban: "F_G", stone: "fStoneDark", jp: "森の駅" },
    M07: { k: "arena", sc: 3, wall: 0xe0cc9a, base: 0xb09a70, metal: 0x24221f, band: 0xd9772e, floor: 0xe2d2a8, roof: "kwO", ban: "F_Y", stone: "fStone", jp: "闘技場の駅" },
    M08: { k: "harbor", sc: 2, wall: 0xf2ece0, base: 0x9aa4ac, metal: 0x24221f, band: 0x3d62b8, floor: 0xd6cdb8, roof: "kwK", ban: "F_B", stone: "fStone", lighthouse: true, jp: "港町の駅" },
    M09: { k: "gold", sc: 3, wall: 0xfaf6ec, base: 0xd8c08a, metal: 0xe0b44a, band: 0xe0b44a, floor: 0xf2e8d0, roof: "kwGold", ban: "F_Y", stone: "fStone", dome: true, jp: "黄金の宮殿の駅" },
    M10: { k: "resort", sc: 2, wall: 0xf4e6cc, base: 0xc8b090, metal: 0x8a6a48, band: 0xd9772e, floor: 0xf0e2c4, roof: "kwO", ban: "F_W", stone: "fStone", palm: true, jp: "南国の駅" },
    M11: { k: "eastern", sc: 2, wall: 0x6a4428, base: 0x4a3020, metal: 0x24221f, band: 0x4b505e, floor: 0xb8a888, roof: "kwK", ban: "F_R", stone: "fStoneDark", lanterns: true, jp: "東の町の駅" },
    M12: { k: "crimson", sc: 3, wall: 0x5a5058, base: 0x3a3238, metal: 0x24221f, band: 0xc4442f, floor: 0x9a8a8a, roof: "kwR", ban: "F_R", stone: "fStoneDark", moon: true, jp: "紅い月の闘技場の駅" }
  };
  const XTR = window.XTransit;
  if (XTR) {
    XTR.stationTheme = function (w, S, st) {
      const th = ST_THEME[st.no]; if (!th || !w.m.fStone) return;
      st.theme = th;
      const col = (k, hex, o) => { const key = "stTh_" + th.k + "_" + k; if (!w.m[key]) w.m[key] = new T.MeshStandardMaterial(Object.assign({ color: hex, roughness: 0.7, metalness: 0.05 }, o || {})); return key; };
      if (!w.m.kwGold) { w.m.kwGold = new T.MeshStandardMaterial({ map: shingleTex("kwGold", "#e0b040"), roughness: 0.35, metalness: 0.65 }); w.m.kwGold.envMapIntensity = 0.9; }
      const trimK = "stTh_" + th.k + "_trim"; if (!w.m[trimK]) { const mm = new T.MeshStandardMaterial({ color: th.metal === 0xe0b44a ? 0xf2cf6a : 0xd8aa4a, emissive: 0x6a4a10, emissiveIntensity: 0.4, roughness: 0.35, metalness: 0.7 }); w.m[trimK] = mm; w.nightMats.push({ m: mm, day: 0.4, night: 1.4 }); }
      const MAP = { white2: col("wall", th.wall), white: col("wall2", th.wall), concrete: col("base", th.base), chromeB: col("metal", th.metal, { metalness: 0.6, roughness: 0.4 }), darkMetal: col("metal", th.metal, { metalness: 0.6, roughness: 0.4 }),
        neonCyan: trimK, neonWhite: "lampY", pBlue: col("band", th.band, { roughness: 0.6 }), pRed: col("band", th.band, { roughness: 0.6 }), marble: col("floor", th.floor, { roughness: 0.8 }), plazaGray: col("floor2", th.floor, { roughness: 0.82 }) };
      const sb = S.box, sg = S.geo;
      S.box = function (key, a, b, y, la, lb, h, o) { return sb.call(S, MAP[key] || key, a, b, y, la, lb, h, o); };
      S.geo = function (key, g, a, y, b, det) { return sg.call(S, MAP[key] || key, g, a, y, b, det); };
    };
    XTR.stationDecor = function (w, S, st) {
      const th = st.theme; if (!th) return;
      const I = w.spotIndex(), sc = th.sc, a0 = -32, a1 = -10, b0 = 9.8, b1 = 21.5, hh = 5.6, ac = (a0 + a1) / 2, H = 14.2;
      const free = (a, b, r) => { const [x, z] = S.at(a, b); return !I.road(x, z, r * 0.5) && !I.bld(x, z, r * 0.6) && w.insideIsland(x, z, 4); };
      const lm = w._landmark; w._landmark = true;
      /* 角の塔（入口側の 2 すみ）：規模で高さ・太さが変わる */
      const tR = 1.3 + sc * 0.45, tH = 7 + sc * 3.2;
      [[a0 - 0.6, b1 + 0.6], [a1 + 0.6, b1 + 0.6]].forEach(([a, b]) => {
        const [x, z] = S.at(a, b);
        w.geo(th.stone, uvS(new T.CylinderGeometry(tR, tR * 1.06, tH, 14), tR * 1.6, tH / 4), x, tH / 2, z);
        w.geo("fStoneDark", new T.CylinderGeometry(tR * 1.15, tR * 1.15, 0.6, 14), x, tH + 0.2, z);
        w.geo(th.roof, uvS(new T.ConeGeometry(tR * 1.35, tR * 3.2, 14), 2, 1.5), x, tH + 0.5 + tR * 1.6, z);
        w.geo("fGold", new T.ConeGeometry(0.1, 1.4, 4), x, tH + 0.5 + tR * 3.2 + 0.6, z);
        w.colCircle(x, z, tR + 0.1);
      });
      /* 入口の上の大きな駅名の木の板（王道 RPG の町の看板のように） */
      S.sign(st.no + "  " + st.name, { bg: "#" + new T.Color(th.band).getHexString(), px: 1024 }, Math.min(16, 9 + sc * 2), 1.5 + sc * 0.15, ac, hh + 1.55, b1 + 0.45, S.faceN);
      S.sign("～ " + th.jp + " ～", { bg: "#5a3a22", px: 512 }, 6, 0.7, ac, hh + 0.35, b1 + 0.46, S.faceN);
      /* ホームの屋根の柱に旗（エリアの色） */
      w.detail(() => { for (const a of [-24, -8, 8, 24]) S.planeN(th.ban, 1.2, 2.8, a, H + 1.6, 10.05, false); });
      /* 規模2〜：入口の前の石の門・花だん */
      if (sc >= 2 && free(ac, b1 + 4, 6)) {
        const gw = 6 + sc; [-1, 1].forEach((k) => { const [x, z] = S.at(ac + k * gw, b1 + 4); w.geo(th.stone, uvS(new T.BoxGeometry(1.4, 7 + sc, 1.4), 0.5, 2), x, (7 + sc) / 2, z, S.ry); w.geo("fGold", new T.SphereGeometry(0.45, 10, 8), x, 7.6 + sc, z); w.colCircle(x, z, 0.9);
          const [fx, fz] = S.at(ac + k * (gw + 3.2), b1 + 4.6); if (free(ac + k * (gw + 3.2), b1 + 4.6, 3) && w.flowerBed) w.flowerBed(fx, fz, 4, 1.6, S.ry, 900 + k, XP.FLOWER_PAL[(sc + k + 3) % XP.FLOWER_PAL.length]); });
        const [mx, mz] = S.at(ac, b1 + 4); const arc = new T.TorusGeometry(gw, 0.55, 8, 24, Math.PI); arc.rotateY(S.ry + Math.PI / 2); w.geo(th.stone, arc, mx, 6.2 + sc - gw, mz);
        w.box("fStone", mx, 6.2 + sc, mz, gw * 2 + 1.6, 1.4, 1.2, { ry: S.ry + Math.PI / 2 });
        const [sx, sz] = S.at(ac, b1 + 4.65); w.sign(st.name, { bg: "#5a3a22", px: 512, both: true }, gw * 1.6, 1.0, sx, 6.9 + sc, sz, S.faceN);
      }
      /* 規模3：時計台（4面の時計・とがった屋根・旗）・大きな広場 */
      if (sc >= 3 && free(a0 - 7, b1 - 4, 8)) {
        const [x, z] = S.at(a0 - 7, b1 - 4), TW = 6, TH = 26;
        w.geo(th.stone, uvS(new T.BoxGeometry(TW, TH, TW), 1.5, 6.5), x, TH / 2, z, S.ry); w.colObb(x, z, TW, TW, S.ry); w.caster(x, z, TW, TW, TH + 10, S.ry);
        w.geo("fStoneDark", new T.BoxGeometry(TW + 0.8, 0.8, TW + 0.8), x, TH, z, S.ry);
        const ck = "stClock"; if (!w.m[ck]) { const c = X.cv(256, 256), g = c.getContext("2d"); g.fillStyle = "#f6ecd2"; g.beginPath(); g.arc(128, 128, 120, 0, TAU); g.fill(); g.lineWidth = 10; g.strokeStyle = "#7a5418"; g.stroke(); g.fillStyle = "#3a2408"; g.font = "900 26px serif"; g.textAlign = "center"; g.textBaseline = "middle"; ["XII", "III", "VI", "IX"].forEach((t, i) => { const a = -Math.PI / 2 + i * Math.PI / 2; g.fillText(t, 128 + Math.cos(a) * 92, 128 + Math.sin(a) * 92); }); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; g.fillRect(128 + Math.cos(a) * 104 - 3, 128 + Math.sin(a) * 104 - 3, 6, 6); } g.lineCap = "round"; g.lineWidth = 9; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + 50, 128 - 30); g.stroke(); g.lineWidth = 6; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 - 10, 128 - 82); g.stroke(); const mm = new T.MeshStandardMaterial({ map: X.tex(c), roughness: 0.6, emissive: 0x6a5020, emissiveMap: X.tex(c), emissiveIntensity: 0.2 }); w.m[ck] = mm; w.nightMats.push({ m: mm, day: 0.2, night: 1.2 }); }
        [0, Math.PI / 2, Math.PI, -Math.PI / 2].forEach((r) => { const f = S.ry + r; w.geo(ck, new T.CircleGeometry(2.2, 32), x + Math.sin(f) * (TW / 2 + 0.06), TH - 3.2, z + Math.cos(f) * (TW / 2 + 0.06), f); w.geo("fGold", new T.TorusGeometry(2.25, 0.16, 6, 32), x + Math.sin(f) * (TW / 2 + 0.08), TH - 3.2, z + Math.cos(f) * (TW / 2 + 0.08), f); });
        w.geo(th.roof, uvS(new T.ConeGeometry(TW * 0.82, TW * 2.2, 4).rotateY(Math.PI / 4), 2, 2), x, TH + 0.4 + TW * 1.1, z, S.ry);
        w.geo("fGold", new T.ConeGeometry(0.16, 2.6, 4), x, TH + 0.4 + TW * 2.2 + 1.1, z); w.geo(th.ban, new T.PlaneGeometry(2.2, 1.2), x + 1.2, TH + 0.4 + TW * 2.2 + 1.7, z);
        const [px, pz] = S.at(ac, b1 + 12); if (free(ac, b1 + 12, 14)) { w.disk(px, pz, 13, "walkCream", 0.03); w.disk(px, pz, 13.7, "stoneW", 0.028, 13); w.disk(px, pz, 4, "walkY", 0.032); if (w.plazaCrowd) w.plazaCrowd(px, pz, 10, 1.0); }
      }
      /* テーマの飾り */
      if (th.crystal) { const [x, z] = S.at(ac, b1 + 1.2); const k = w.m.mbCrystal ? "mbCrystal" : "fGold"; w.geo(k, new T.OctahedronGeometry(1.4, 0).scale(1, 1.9, 1), x, hh + 5.2, z); }
      if (th.dome) { const [x, z] = S.at(ac, (b0 + b1) / 2); w.geo("kwGold", uvS(new T.SphereGeometry(5.6, 24, 12, 0, TAU, 0, Math.PI / 2), 4, 2), x, hh + 0.7, z); w.geo("fGold", new T.ConeGeometry(0.3, 3, 8), x, hh + 7.4, z); }
      if (th.moon) { const [x, z] = S.at(a1 + 0.6, b1 + 0.6); const k = w.m.mbrMoon ? "mbrMoon" : (w.m.mbrRed ? "mbrRed" : "F_R"); w.geo(k, new T.SphereGeometry(1.6, 18, 12), x, tH + 0.5 + tR * 3.2 + 2.4, z); }
      if (th.lighthouse) { const [x, z] = S.at(a1 + 0.6, b1 + 0.6); w.geo("lampY", new T.SphereGeometry(0.8, 12, 10), x, tH + 0.2 + 0.9, z); }
      if (th.palm) [[a0 - 3, b1 + 3], [a1 + 3, b1 + 3]].forEach(([a, b]) => { if (free(a, b, 3)) { const [x, z] = S.at(a, b); w.plant("palm", x, z, 1.2); } });
      if (th.lanterns) w.detail(() => { for (let a = a0 + 2; a <= a1 - 2; a += 4) { const [x, z] = S.at(a, b1 + 0.9); w.lantern(x, hh - 1.6, z, 0.7, "lanR", S.faceN); } });
      w._landmark = lm;
    };
    /* 地下鉄の地上の出入口：石の柱 4 本と急な屋根のあずまや（駅ごとの色・規模） */
    const MT_THEME = { Y01: ["kwB", 3, "F_B"], Y02: ["kwP", 3, "F_P", "crystal"], Y03: ["kwR", 2, "F_R"], Y04: ["kwB", 3, "F_Y"], Y05: ["kwGold", 3, "F_Y", "dome"], Y06: ["kwO", 2, "F_W"], Y07: ["kwR", 3, "F_R", "moon"] };
    XTR.metroDecor = function (w, S, K) {
      const t = MT_THEME[S.no]; if (!t || !w.m.fStone) return;
      if (!w.m.kwGold) { w.m.kwGold = new T.MeshStandardMaterial({ map: shingleTex("kwGold", "#e0b040"), roughness: 0.35, metalness: 0.65 }); }
      const [rk, sc, ban, extra] = t, top = 4.2 + sc * 0.7, lm = w._landmark; w._landmark = true;
      [[-9.9, -3.4], [2.2, -3.4], [-9.9, 6.0], [2.2, 6.0]].forEach(([a, b]) => { const [x, z] = K.at(a, b); w.geo("fStone", uvS(new T.CylinderGeometry(0.42, 0.5, top, 10), 0.8, top / 3), x, top / 2, z); w.geo("fStoneDark", new T.BoxGeometry(1.2, 0.4, 1.2), x, 0.2, z, K.ry); w.geo("fStoneDark", new T.BoxGeometry(1.1, 0.35, 1.1), x, top - 0.1, z, K.ry); w.colCircle(x, z, 0.55); });
      { const [x, z] = K.at(-3.85, 1.3); w.box("fWood", x, top - 0.3, z, 13.2, 0.45, 10.4, { ry: K.ry + Math.PI / 2, uv: 4 }); w.fantasyRoof(x, z, 10.4, 13.2, top + 0.15, K.ry, rk, { chimney: false, dormer: sc >= 3, wall: "fWood", rh: 3 + sc * 0.6 }); }
      w.detail(() => { [[-9.9, -3.4], [2.2, -3.4]].forEach(([a, b]) => { const [x, z] = K.at(a, b - 0.55); w.geo(ban, new T.PlaneGeometry(0.9, 2.2), x, top - 1.6, z, K.faceL); }); });
      if (extra === "crystal" && w.m.mbCrystal) { const [x, z] = K.at(-3.85, 1.3); w.geo("mbCrystal", new T.OctahedronGeometry(0.8, 0).scale(1, 1.8, 1), x, top + 3 + sc * 0.6 + 1.6, z); }
      if (extra === "dome") { const [x, z] = K.at(-3.85, 1.3); w.geo("fGold", new T.SphereGeometry(0.6, 12, 10), x, top + 3 + sc * 0.6 + 0.9, z); }
      if (extra === "moon") { const [x, z] = K.at(-3.85, 1.3); w.geo(w.m.mbrMoon ? "mbrMoon" : "F_R", new T.SphereGeometry(0.9, 14, 10), x, top + 3 + sc * 0.6 + 1.3, z); }
      w._landmark = lm;
    };
  }

  /* ══════════════ 道（車道）の中央線は石の帯に・横断歩道なし ══════════════ */
  const _ys = P.yomaStreet;
  P.yomaStreet = function (pts, o) { o = Object.assign({}, o || {}); if (o.center && o.center !== "none") o.center = "white"; o.cross = false; return _ys.call(this, pts, o); };

  /* ══════════════ 屋根の上の飾り：ファンタジーの道具（剣・盾・薬びん・宝箱・王冠・魔法の帽子） ══════════════ */
  const _gp = P.giantProp;
  const FPROPS = { takoyaki: "chest", onigiri: "potion", dango: "sword", ramen: "potion", taiyaki: "shield", sushi: "chest", tempura: "crown", ice: "hat", crepe: "potion", donut: "shield", burger: "chest", cake: "crown" };
  P.giantProp = function (kind, x, y, z, s, ry) {
    const k2 = FPROPS[kind] || kind, W = this, G = (key, g) => W.geo(key, g.scale(s, s, s).rotateY(ry || 0), x, y, z);
    if (k2 === "sword") {
      G("fIron", new T.BoxGeometry(0.34, 3.6, 0.1).translate(0, 2.6, 0)); G("fGold", new T.BoxGeometry(1.6, 0.26, 0.3).translate(0, 0.75, 0)); G("fWood", new T.CylinderGeometry(0.13, 0.13, 0.9, 8).translate(0, 0.2, 0)); G("fGold", new T.SphereGeometry(0.2, 8, 6).translate(0, -0.3, 0));
      G("propWhite", new T.ConeGeometry(0.24, 0.5, 4).rotateY(Math.PI / 4).scale(1, 1, 0.3).translate(0, 4.6, 0));
    } else if (k2 === "shield") {
      const sh = new T.Shape(); sh.moveTo(-1.1, 1.3); sh.lineTo(1.1, 1.3); sh.lineTo(1.1, 0.1); sh.quadraticCurveTo(1.0, -1.1, 0, -1.6); sh.quadraticCurveTo(-1.0, -1.1, -1.1, 0.1); sh.closePath();
      G("F_B", new T.ExtrudeGeometry(sh, { depth: 0.25, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.1, bevelSegments: 2 }).translate(0, 1.8, -0.12));
      G("fGold", new T.BoxGeometry(0.3, 2.4, 0.12).translate(0, 1.8, 0.24)); G("fGold", new T.BoxGeometry(1.7, 0.3, 0.12).translate(0, 2.2, 0.24));
    } else if (k2 === "potion") {
      const prof = [new T.Vector2(0, 0), new T.Vector2(0.95, 0.05), new T.Vector2(1.15, 0.7), new T.Vector2(1.0, 1.5), new T.Vector2(0.35, 2.0), new T.Vector2(0.32, 2.6), new T.Vector2(0.42, 2.65), new T.Vector2(0, 2.7)];
      G("F_R", new T.LatheGeometry(prof, 18)); G("fWood", new T.CylinderGeometry(0.3, 0.26, 0.5, 10).translate(0, 2.85, 0)); G("propWhite", new T.SphereGeometry(0.22, 8, 6).translate(-0.45, 1.2, 0.85));
    } else if (k2 === "chest") {
      G("fWood", new T.BoxGeometry(2.6, 1.3, 1.7).translate(0, 0.65, 0)); G("fWood", new T.CylinderGeometry(0.85, 0.85, 2.6, 14, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).translate(0, 1.3, 0));
      [-0.9, 0, 0.9].forEach((a) => G("fGold", new T.BoxGeometry(0.16, 1.32, 1.74).translate(a, 0.66, 0))); G("fGold", new T.BoxGeometry(0.4, 0.5, 0.1).translate(0, 1.25, 0.88));
    } else if (k2 === "crown") {
      G("fGold", new T.CylinderGeometry(1.2, 1.1, 0.8, 18, 1, true).translate(0, 0.4, 0));
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; G("fGold", new T.ConeGeometry(0.28, 0.9, 4).translate(Math.cos(a) * 1.15, 1.2, Math.sin(a) * 1.15)); G("F_R", new T.SphereGeometry(0.16, 8, 6).translate(Math.cos(a) * 1.18, 0.45, Math.sin(a) * 1.18)); }
    } else if (k2 === "hat") {
      G("F_P", new T.CylinderGeometry(1.6, 1.6, 0.14, 20).translate(0, 0.1, 0)); G("F_P", new T.ConeGeometry(0.9, 2.8, 16).rotateZ(-0.18).translate(0.2, 1.5, 0)); G("fGold", new T.TorusGeometry(0.88, 0.1, 6, 18).rotateX(Math.PI / 2).translate(0, 0.32, 0));
    } else return _gp.apply(this, arguments);
  };
})();
