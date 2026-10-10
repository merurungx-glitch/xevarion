/* ============================================================
   MagiAbyss — ma-pixel.js
   ドット絵の土台（★ 画像ファイルを使わず、ここで全部描く）
   ------------------------------------------------------------
   ・キャラクター … 文字の方眼（ASCII）でパーツを重ねて 24×30 のドット絵を作る。
                    パレットを差しかえるだけで別のキャラになる。輪郭線は自動。
                    待機2コマ・歩き4コマ・攻撃1コマ・被弾（白）を同じ絵から作る。
   ・敵・ボス・小物 … ベクターで小さく描いてから「ドット化」（不透明度のしきい値＋
                    パレットへの減色＋輪郭線）する pixelize()。
   ・数字のフォント … 3×5 の自前ビットマップ（ダメージ表示）。
   ・正式なドット絵に差しかえるときは、MA.Art.charSprite(id) が返す
     { frames } を画像から作ったものに置きかえるだけでよい（描画側は frames しか見ない）。
   ============================================================ */
(function () {
  "use strict";
  const MA = (window.MA = window.MA || {});

  /* ── 色のヘルパー ── */
  function hex(c) {
    if (!c) return [0, 0, 0];
    if (Array.isArray(c)) return c;
    let s = String(c).replace("#", "");
    if (s.length === 3) s = s.split("").map((x) => x + x).join("");
    const n = parseInt(s, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function toHex(r, g, b) {
    const f = (v) => ("0" + Math.max(0, Math.min(255, Math.round(v))).toString(16)).slice(-2);
    return "#" + f(r) + f(g) + f(b);
  }
  function shade(c, k) { const [r, g, b] = hex(c); return toHex(r * k, g * k, b * k); }
  function mix(a, b, t) { const A = hex(a), B = hex(b); return toHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); }
  function rgba(c, a) { const [r, g, b] = hex(c); return "rgba(" + r + "," + g + "," + b + "," + a + ")"; }

  function mkCanvas(w, h) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    return c;
  }
  /* ピクセル配列 { w, h, d: Uint8ClampedArray } */
  function mkBuf(w, h) { return { w, h, d: new Uint8ClampedArray(w * h * 4) }; }
  function bufToCanvas(b) {
    const c = mkCanvas(b.w, b.h);
    const g = c.getContext("2d");
    const id = g.createImageData(b.w, b.h);
    id.data.set(b.d);
    g.putImageData(id, 0, 0);
    return c;
  }
  function setPx(b, x, y, col, a) {
    if (x < 0 || y < 0 || x >= b.w || y >= b.h) return;
    const i = (y * b.w + x) * 4;
    b.d[i] = col[0]; b.d[i + 1] = col[1]; b.d[i + 2] = col[2]; b.d[i + 3] = a == null ? 255 : a;
  }
  function alphaAt(b, x, y) { if (x < 0 || y < 0 || x >= b.w || y >= b.h) return 0; return b.d[(y * b.w + x) * 4 + 3]; }
  function cloneBuf(b) { return { w: b.w, h: b.h, d: new Uint8ClampedArray(b.d) }; }

  /* ── 文字の方眼を描く ──
     layer = { x, y, rows: ["..HHH..", ...] }。'.' と ' ' は透明。
     pal の文字に無い文字は無視する。 */
  function drawLayer(b, layer, pal) {
    if (!layer) return;
    const ox = layer.x | 0, oy = layer.y | 0;
    const rows = layer.rows || [];
    for (let j = 0; j < rows.length; j++) {
      const r = rows[j];
      for (let i = 0; i < r.length; i++) {
        const ch = r[i];
        if (ch === "." || ch === " ") continue;
        const c = pal[ch];
        if (!c) continue;
        const col = hex(String(c).slice(0, 7));
        const al = String(c).length === 9 ? parseInt(String(c).slice(7, 9), 16) : (ch === "~" ? 150 : 255);
        setPx(b, ox + i, oy + j, col, al);
      }
    }
  }
  /* 輪郭線：不透明の画素に4方向で接する透明の画素を塗る */
  function outlineBuf(b, color, alphaMin) {
    const col = hex(color), out = cloneBuf(b), am = alphaMin || 1;
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
      if (alphaAt(b, x, y) >= am) continue;
      if (alphaAt(b, x - 1, y) >= am || alphaAt(b, x + 1, y) >= am || alphaAt(b, x, y - 1) >= am || alphaAt(b, x, y + 1) >= am) setPx(out, x, y, col, 255);
    }
    return out;
  }
  /* 範囲を動かした新しい配列を返す（cond(x,y) が true の画素だけ dx,dy ずらす） */
  function shiftWhere(b, cond, dx, dy) {
    const out = mkBuf(b.w, b.h);
    /* まず動かさない画素 */
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
      if (cond(x, y)) continue;
      const i = (y * b.w + x) * 4;
      if (b.d[i + 3]) out.d.set(b.d.subarray(i, i + 4), i);
    }
    /* 動かす画素（上書き） */
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
      if (!cond(x, y)) continue;
      const i = (y * b.w + x) * 4;
      if (!b.d[i + 3]) continue;
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= b.w || ny >= b.h) continue;
      out.d.set(b.d.subarray(i, i + 4), (ny * b.w + nx) * 4);
    }
    return out;
  }
  function whiteOf(b, col) {
    const out = cloneBuf(b), c = hex(col || "#ffffff");
    for (let i = 0; i < out.d.length; i += 4) if (out.d[i + 3]) { out.d[i] = c[0]; out.d[i + 1] = c[1]; out.d[i + 2] = c[2]; }
    return out;
  }

  /* ══════════════════════════════════════════════════════════════
     数字のビットマップフォント（3×5）
     ══════════════════════════════════════════════════════════════ */
  const GLYPH = {
    "0": ["111", "101", "101", "101", "111"], "1": ["010", "110", "010", "010", "111"],
    "2": ["111", "001", "111", "100", "111"], "3": ["111", "001", "111", "001", "111"],
    "4": ["101", "101", "111", "001", "001"], "5": ["111", "100", "111", "001", "111"],
    "6": ["111", "100", "111", "101", "111"], "7": ["111", "001", "010", "010", "010"],
    "8": ["111", "101", "111", "101", "111"], "9": ["111", "101", "111", "001", "111"],
    ".": ["0", "0", "0", "0", "1"], "+": ["000", "010", "111", "010", "000"], "-": ["000", "000", "111", "000", "000"],
    "K": ["101", "110", "100", "110", "101"], "M": ["10001", "11011", "10101", "10001", "10001"],
    "!": ["1", "1", "1", "0", "1"], "x": ["000", "101", "010", "101", "000"], "/": ["001", "001", "010", "100", "100"],
    " ": ["0", "0", "0", "0", "0"], "%": ["101", "001", "010", "100", "101"],
  };
  const fontCache = {};
  /* 文字列を色つきで1枚の canvas に（輪郭つき）。s は拡大率 */
  function textSprite(str, color, s, outline) {
    const key = str + "|" + color + "|" + s + "|" + outline;
    if (fontCache[key]) return fontCache[key];
    s = s || 1;
    let w = 0;
    for (const ch of str) { const g = GLYPH[ch] || GLYPH[" "]; w += g[0].length + 1; }
    w = Math.max(1, w - 1);
    const b = mkBuf(w + 2, 7), col = hex(color);
    let x = 1;
    for (const ch of str) {
      const g = GLYPH[ch] || GLYPH[" "];
      for (let j = 0; j < 5; j++) for (let i = 0; i < g[j].length; i++) if (g[j][i] === "1") setPx(b, x + i, 1 + j, col);
      x += g[0].length + 1;
    }
    const o = outline === false ? b : outlineBuf(b, outline || "#120a18");
    let c = bufToCanvas(o);
    if (s > 1) {
      const c2 = mkCanvas(c.width * s, c.height * s), g2 = c2.getContext("2d");
      g2.imageSmoothingEnabled = false; g2.drawImage(c, 0, 0, c2.width, c2.height); c = c2;
    }
    if (Object.keys(fontCache).length > 600) for (const k in fontCache) delete fontCache[k];
    fontCache[key] = c;
    return c;
  }
  function shortNum(n) {
    n = Math.round(n);
    if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + "M";
    if (n >= 1e4) return (n / 1e3).toFixed(n >= 1e5 ? 0 : 1) + "K";
    return String(n);
  }

  /* ══════════════════════════════════════════════════════════════
     ベクターで描いてドット化（敵・ボス・小物・アイコン）
     draw(g, w, h) で普通に描く → 不透明度しきい値 → パレットへ減色 → 輪郭
     ══════════════════════════════════════════════════════════════ */
  function pixelize(w, h, draw, opt) {
    opt = opt || {};
    const c = mkCanvas(w, h), g = c.getContext("2d");
    g.imageSmoothingEnabled = false;
    draw(g, w, h);
    const id = g.getImageData(0, 0, w, h);
    const b = { w, h, d: id.data };
    const thr = opt.thr == null ? 110 : opt.thr;
    const pal = (opt.pal || []).map(hex);
    for (let i = 0; i < b.d.length; i += 4) {
      const a = b.d[i + 3];
      if (a < thr) { b.d[i + 3] = 0; continue; }
      let r = b.d[i], gg = b.d[i + 1], bb = b.d[i + 2];
      /* 半透明の縁は、塗った色そのもの（アルファで割り戻す）に近づける */
      if (a < 255) { const k = 255 / a; r = Math.min(255, r * k); gg = Math.min(255, gg * k); bb = Math.min(255, bb * k); }
      if (pal.length) {
        let best = 0, bd = 1e9;
        for (let p = 0; p < pal.length; p++) {
          const dr = pal[p][0] - r, dg = pal[p][1] - gg, db = pal[p][2] - bb;
          const dd = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;
          if (dd < bd) { bd = dd; best = p; }
        }
        r = pal[best][0]; gg = pal[best][1]; bb = pal[best][2];
      }
      b.d[i] = r; b.d[i + 1] = gg; b.d[i + 2] = bb; b.d[i + 3] = 255;
    }
    const o = opt.outline === false ? b : outlineBuf(b, opt.outline || "#120a18");
    return { buf: o, canvas: bufToCanvas(o) };
  }
  /* buf から「ちょっとずらした」アニメのコマを作る */
  function framesFrom(buf, list) { return list.map((f) => bufToCanvas(f(buf))); }

  /* ══════════════════════════════════════════════════════════════
     キャラクター（24×30）
     ------------------------------------------------------------
     パーツの順：backHair → body → face → frontHair → acc → prop
     文字：S 肌・s 肌の影・E 瞳・W 白・B ほほ・M 口
           H 髪・h 髪の影・L 髪のつや
           A 服・a 服の影・C 服2・c 服2の影・P 下・p 下の影・O 靴・o 靴の影
           D 飾り・d 飾りの影・G 金属・g 金属の影・X/x/Y 持ち物
     ══════════════════════════════════════════════════════════════ */
  const CW = 24, CH = 30;
  const BASE_PAL = { S: "#f8d8c4", s: "#e2a891", W: "#ffffff", B: "#f49aaa", M: "#c4566a", K: "#14111c" };

  /* 顔（全員共通）。x7〜16・y6〜13 */
  const FACE = { x: 7, y: 6, rows: [
    "SSSSSSSSSS",
    "SSSSSSSSSS",
    "SKKSSSSKKS",
    "SEWSSSSEWS",
    "SEESSSSEES",
    "SBSSMMSSBS",
    ".SSSSSSSS.",
    "...ssss...",
  ] };
  /* 目を閉じた顔（まばたき用：目の3行を線にする） */
  const FACE_BLINK = { x: 7, y: 8, rows: [
    "SSSSSSSSSS",
    "SKKSSSSKKS",
    "SSSSSSSSSS",
  ] };

  /* ── 髪の型 ── */
  /* 前髪（頭の上＋前髪）。ぱっつん寄り。x5〜18 */
  function frontStraight(sideTo, opt) {
    opt = opt || {};
    const rows = [
      "....HHHHHH....",
      "..HHHHHHHHHH..",
      ".HHHHHHHHHHHH.",
      "HHHHLLLHHHHHHH",
      "HHHLLHHHHHHHHH",
      "HHHHHHHHHHHHHH",
      opt.part ? "HHhHHHHhhHHHhH" : "HHhHHHhhHHHhHH",
      "HH...h..h...HH",
    ];
    for (let y = 9; y <= sideTo; y++) rows.push(y >= sideTo - 1 ? "h............h" : "Hh..........hH");
    return { x: 5, y: 1, rows };
  }
  /* 横に流した前髪（片側が長い） */
  function frontSwept(sideTo) {
    const rows = [
      "....HHHHHH....",
      "..HHHHHHHHHH..",
      ".HHHHHHHHHHHH.",
      "HHHLLLHHHHHHHH",
      "HHLLHHHHHHHHHH",
      "HHHHHHHHHHHHHH",
      "HHHHHHHHhhHhHH",
      "HHHHh..h....HH",
      "HHh.........HH",
    ];
    for (let y = 10; y <= sideTo; y++) rows.push(y >= sideTo - 1 ? "h............h" : "Hh..........hH");
    return { x: 5, y: 1, rows };
  }
  /* 長い髪の後ろ（体のうしろに落ちる） */
  function backLong(bottom, wavy) {
    const rows = [
      "....hhhhhhhh....",
      "..hhhhhhhhhhhh..",
      ".hhhhhhhhhhhhhh.",
    ];
    for (let y = 5; y <= bottom; y++) {
      if (y <= 13) rows.push("hhhhhhhhhhhhhhhh");
      else if (y < bottom - 1) rows.push(wavy && (y % 3 === 0) ? ".hhh........hhh." : "hhhh........hhhh");
      else if (y === bottom - 1) rows.push(wavy ? "hhh..........hhh" : ".hhh........hhh.");
      else rows.push(wavy ? ".h............h." : "..hh........hh..");
    }
    return { x: 4, y: 2, rows };
  }
  /* ボブ（あごの下まで） */
  function backBob() {
    return { x: 4, y: 2, rows: [
      "....hhhhhhhh....",
      "..hhhhhhhhhhhh..",
      ".hhhhhhhhhhhhhh.",
      "hhhhhhhhhhhhhhhh",
      "hhhhhhhhhhhhhhhh",
      "hhhhhhhhhhhhhhhh",
      "hhhhhhhhhhhhhhhh",
      "hhhhhhhhhhhhhhhh",
      "hhhhhhhhhhhhhhhh",
      "hhhhhhhhhhhhhhhh",
      ".hhhhhhhhhhhhhh.",
      ".hhh........hhh.",
      "..hh........hh..",
    ] };
  }
  function frontBob(wavyEnds) {
    return { x: 4, y: 1, rows: [
      ".....HHHHHH.....",
      "...HHHHHHHHHH...",
      "..HHHHHHHHHHHH..",
      ".HHHHLLLHHHHHHH.",
      ".HHHLLHHHHHHHHH.",
      "HHHHHHHHHHHHHHHH",
      "HHHhHHHhhHHHhHHH",
      "HHH...h..h...HHH",
      "HHh..........hHH",
      "HH............HH",
      "HH............HH",
      wavyEnds ? "hHh..........hHh" : "Hh............hH",
      wavyEnds ? ".h............h." : "h..............h",
    ] };
  }

  /* ── 服の型（x6〜17・y14〜28） ── */
  function outfitTank(bottom, gloves) {
    const arm = gloves ? "C" : "S", arm2 = gloves ? "c" : "s";
    const rows = [
      ".SSaSSSSaSS.",
      arm + "SAAAAAAAAS" + arm,
      arm + ".AAAAAAAA." + arm,
      arm2 + ".AaAAAAaA." + arm2,
      arm + ".AAAAAAAA." + arm,
      arm + ".AAAAAAAA." + arm,
    ];
    return { x: 6, y: 14, rows: rows.concat(bottom) };
  }
  const BOTTOM_SHORTS = [
    "..PPPPPPPP..",
    "..PPPppPPP..",
    "..PPP..PPP..",
    "...SS..SS...",
    "...SS..SS...",
    "...ss..ss...",
    "..OOO..OOO..",
    "..ooo..ooo..",
  ];
  const BOTTOM_SKIRT = [
    "..PPPPPPPP..",
    ".PPPPPPPPPP.",
    ".PpPPpPPpPP.",
    "...SS..SS...",
    "...SS..SS...",
    "...ss..ss...",
    "..OOO..OOO..",
    "..ooo..ooo..",
  ];
  const BOTTOM_PANTS = [
    "..PPPPPPPP..",
    "..PPPPPPPP..",
    "..PPpP.PPP..",
    "..PPP..PPP..",
    "..PPp..PPp..",
    "..PPP..PPP..",
    "..OOO..OOO..",
    "..ooo..ooo..",
  ];
  const BOTTOM_BOOTS_SKIRT = [
    "..PPPPPPPP..",
    ".PPPPPPPPPP.",
    ".PpPPpPPpPP.",
    "...SS..SS...",
    "...OO..OO...",
    "...OO..OO...",
    "..OOO..OOO..",
    "..ooo..ooo..",
  ];

  /* ══════════════════════════════════════════════════════════════
     キャラごとの定義（MagiBurst の id と同じ）
     ══════════════════════════════════════════════════════════════ */
  const CHAR_ART = {
    /* ── タキナ（水）：長い黒髪をポニーテールに結う・タンクトップ・蒼い銃 ── */
    takina: {
      pal: { H: "#1d1c29", h: "#100f18", L: "#4a5280", E: "#9b6bff", A: "#eaf3fc", a: "#b6cbe4", C: "#262833", c: "#15161c",
             P: "#2b3552", p: "#1c2338", O: "#eef3f9", o: "#9fb0c6", D: "#3a3c4c", X: "#d8ecff", x: "#4f8fe0", Y: "#2b3552", K: "#120f1c" },
      legY: 23,
      layers: [
        backLong(24),
        /* ポニーテール（頭のうしろ右上から右へ流れる） */
        { x: 15, y: 0, rows: [
          "..hhhh.",
          ".hHHHHh",
          "hHHLHHh",
          ".hhDDhh.",
          "...hHHh",
          "...hHHHh",
          "....hHHh",
          "....hHHh",
          ".....hHh",
          ".....hHh",
          ".....hhh",
          "......hh",
          "......hh",
        ] },
        outfitTank(BOTTOM_SHORTS),
        /* タンクトップの脇から見える黒いインナー */
        { x: 8, y: 15, rows: ["C......C", "C......C"] },
        "FACE",
        frontStraight(14),
        /* 結んでいる髪どめ（頭の右上） */
        { x: 16, y: 2, rows: ["DD"] },
        /* 右手の蒼い銃 */
        { x: 17, y: 18, rows: ["xXXXX", "xxXx.", ".Yx..", ".Y..."] },
      ],
    },
    /* ══ ★★ 2026-10-09 Pumpkin Night（UR）10体 ══
       帽子（魔女帽）は前髪のあとに重ねる（頭のてっぺんを隠し、前髪のすそは見える）。 */
    /* ── アヤノ（火）：ピンクの髪・紺と赤の魔女帽・紺のドレス・赤いケープ・ランタン ── */
    ayano: {
      pal: { H: "#f2b3c4", h: "#c9849a", L: "#ffe0ea", E: "#5aa8ff", A: "#22306e", a: "#141c48", C: "#c8283c", c: "#8a1828",
             D: "#1d2a6a", d: "#101640", G: "#d8283e", P: "#22306e", p: "#141c48", O: "#2a1a20", o: "#160c10", X: "#ffb347", x: "#e06a1a", Y: "#3a2a24", K: "#140c14" },
      legY: 23,
      layers: [
        backLong(22),
        outfitTank(BOTTOM_SKIRT),
        { x: 4, y: 14, rows: ["CC............CC", "CC............CC", "Cc............cC", "Cc............cC", "CC............CC", "Cc............cC", "CC............CC", "cc............cc"] },
        { x: 10, y: 15, rows: ["..GG..", ".GWWG.", "..GG.."] },
        "FACE",
        frontStraight(13),
        { x: 3, y: 0, rows: [
          "..........dD......",
          "........DDDd......",
          "......DDDDDDd.....",
          "....dDDDDDDDDd....",
          "..ddGGGGGGGGGGdd..",
          "dDDDDDDDDDDDDDDDDd",
        ] },
        /* 左手の南瓜のランタン */
        { x: 1, y: 17, rows: [".Y.", "XXX", "XxX", "XXX"] },
      ],
    },
    /* ── サキ（火）：茶色の長い髪・黒とオレンジの魔女帽・黒いコルセット・クリームのレース・ぐるぐる飴 ── */
    saki: {
      pal: { H: "#6b4a32", h: "#43291b", L: "#9c7458", E: "#e0902a", A: "#2a2026", a: "#18121a", C: "#f4e8d8", c: "#d4c4ac",
             D: "#1e1a22", d: "#0e0c12", G: "#ff8a1f", P: "#2a2026", p: "#18121a", O: "#2a1a14", o: "#140c08", X: "#ff8a1f", x: "#ffd257", Y: "#f4f4f4", K: "#140c10" },
      legY: 23,
      layers: [
        backLong(24, true),
        outfitTank(BOTTOM_SKIRT),
        { x: 7, y: 14, rows: ["CCCCCCCCCC", "..C....C..", "..........", "..........", "..........", "CcCcCcCcCc"] },
        "FACE",
        frontSwept(14),
        { x: 3, y: 0, rows: [
          ".........Dd.......",
          ".......DDDDd......",
          "......DDDDDDd.....",
          "....dDDDDDDDDd....",
          "..ddGGGGGGGGGGdd..",
          "dDDDDDDDDDDDDDDDDd",
        ] },
        /* 右手のぐるぐる飴 */
        { x: 17, y: 12, rows: [".XX.", "XxXX", "XXxX", ".XX.", "..Y.", "..Y.", "..Y."] },
      ],
    },
    /* ── ユカ（水）：黒い髪・猫耳・水色の魔女帽・白とピンクのフリル・星の杖 ── */
    yuka: {
      pal: { H: "#1e2030", h: "#0e0f18", L: "#5a6a9a", E: "#8fd0ff", A: "#f4f6ff", a: "#c8d0e8", C: "#ffb8d8", c: "#e88ab0",
             D: "#bfe6ff", d: "#7cb8e8", G: "#ff9ac2", P: "#ffc8e0", p: "#e89ab8", O: "#f4f6ff", o: "#b8c0d8", X: "#ffe9a8", x: "#ffd257", Y: "#d8dcf0", K: "#10101c" },
      legY: 23,
      layers: [
        backLong(24),
        outfitTank(BOTTOM_SKIRT),
        { x: 7, y: 14, rows: ["..CC..CC..", ".C..CC..C.", "....DD...."] },
        "FACE",
        frontStraight(14),
        { x: 3, y: 0, rows: [
          "..........dD......",
          "........DDDd......",
          "......DDDDDDd.....",
          "....dDDDDDDDDd....",
          "..ddGGGGGGGGGGdd..",
          "dDDDDDDDDDDDDDDDDd",
        ] },
        /* 帽子から出た猫耳 */
        { x: 4, y: 2, rows: ["H.", "HH"] },
        { x: 18, y: 2, rows: [".H", "HH"] },
        /* 右手の星の杖 */
        { x: 18, y: 12, rows: [".X.", "XxX", ".X.", ".Y.", ".Y.", ".Y."] },
      ],
    },
    /* ── ナツミ（水）：長い黒髪・黒猫の耳としっぽ・黒いドレス・灰色のファー ── */
    natsumi: {
      pal: { H: "#16161e", h: "#0a0a10", L: "#3e3e58", E: "#5aa8ff", A: "#1a1a22", a: "#0e0e14", C: "#4a4a5a", c: "#2e2e3a",
             D: "#ff9ab0", d: "#c86a80", P: "#1a1a22", p: "#0e0e14", O: "#1a1a22", o: "#0a0a10", W: "#ffffff", K: "#0c0c14" },
      legY: 23,
      layers: [
        /* しっぽ（体のうしろ） */
        { x: 18, y: 16, rows: ["..hh", "...h", "...h", "..hh", ".hh."] },
        backLong(25),
        outfitTank(BOTTOM_SKIRT, true),
        { x: 6, y: 14, rows: ["CCCCCCCCCCCC"] },
        "FACE",
        frontStraight(15),
        /* 猫耳 */
        { x: 5, y: 0, rows: ["H...", "HH..", "HDH."] },
        { x: 15, y: 0, rows: ["...H", "..HH", ".HDH"] },
        /* 白いリボン（右） */
        { x: 17, y: 4, rows: ["WW", "W."] },
      ],
    },
    /* ── ミウ（木）：緑のボブ・深緑のボンネット・オレンジのリボン・南瓜 ── */
    miu: {
      pal: { H: "#5a7a2a", h: "#3a5418", L: "#8aa84a", E: "#ff8a3a", A: "#1f4a2a", a: "#12301a", C: "#ff8a1f", c: "#c85a10",
             D: "#1f5a32", d: "#123a20", G: "#ff8a1f", P: "#1f4a2a", p: "#12301a", O: "#2a1a14", o: "#140c08", X: "#ff8a1f", x: "#c85a10", Y: "#3a7a2a", K: "#0e140c" },
      legY: 23,
      layers: [
        backBob(),
        { x: 3, y: 0, rows: [
          "....DDDDDDDDDD....",
          "..DDDDDDDDDDDDDD..",
          ".DDdDDDDDDDDDDdDD.",
          "DDd............dDD",
          "DD..............DD",
          "Dd..............dD",
          "D................D",
          "D................D",
          "d................d",
        ] },
        outfitTank(BOTTOM_SKIRT),
        { x: 9, y: 14, rows: ["GGGGGG", "..GG..", ".G..G."] },
        "FACE",
        frontBob(true),
        /* ボンネットの南瓜の飾り */
        { x: 4, y: 1, rows: [".Y.", "XXX", "XxX"] },
        /* 左手の南瓜 */
        { x: 0, y: 17, rows: [".YY..", "XXXX.", "XxXXX", "XXXxX", ".XXX."] },
      ],
    },
    /* ── マイ（木）：黒緑の長い髪・四つ葉の髪かざり・黒いレースのドレス・オレンジのリボン・南瓜の飴 ── */
    mai: {
      pal: { H: "#1e2a22", h: "#0e1610", L: "#4a6a52", E: "#c8b040", A: "#1a1a1a", a: "#0c0c0c", C: "#ff8a1f", c: "#c85a10",
             D: "#3dd17a", d: "#1f8a44", P: "#1a1a1a", p: "#0c0c0c", O: "#1a1a1a", o: "#0a0a0a", X: "#ff8a1f", x: "#c85a10", Y: "#e8e0d0", K: "#0c100c" },
      legY: 23,
      layers: [
        backLong(25, true),
        outfitTank(BOTTOM_SKIRT),
        { x: 7, y: 15, rows: ["C........C", ".C......C.", "..........", "CcCcCcCcCc"] },
        "FACE",
        frontSwept(15),
        /* 四つ葉の髪かざり（左右） */
        { x: 4, y: 2, rows: [".D.", "DdD", ".D."] },
        { x: 17, y: 4, rows: [".D.", "DdD", ".D."] },
        /* 左手の南瓜の飴 */
        { x: 1, y: 13, rows: [".XX.", "XxXX", "XXXX", ".XX.", "..Y.", "..Y."] },
      ],
    },
    /* ── チナツ（光）：くせのある金茶の髪・黒いレース・金の網・燭台 ── */
    chinatsu: {
      pal: { H: "#9a8a3a", h: "#6a5a1e", L: "#d8c870", E: "#6ad0d8", A: "#1a1418", a: "#0c080c", C: "#c89a3a", c: "#8a6a20",
             G: "#c89a3a", g: "#8a6a20", P: "#1a1418", p: "#0c080c", O: "#1a1418", o: "#0a060a", X: "#ffd257", x: "#ff8a1f", Y: "#f4ecd8", K: "#100c0c" },
      legY: 23,
      layers: [
        backBob(),
        outfitTank(BOTTOM_SKIRT, true),
        { x: 8, y: 15, rows: ["G.G.G.G.", ".g.g.g.g", "G.G.G.G."] },
        "FACE",
        frontBob(true),
        /* 右手の燭台 */
        { x: 18, y: 12, rows: [".x", ".X", "YY", "YY", "YY", "YY", "GG"] },
      ],
    },
    /* ── ユウミ（光）：銀のすじの入った黒い髪・赤いマフラー・ベージュのコート・南瓜 ── */
    yuumi: {
      pal: { H: "#1a1c24", h: "#0c0d12", L: "#c8ccd8", E: "#7aa8e8", A: "#ece4d4", a: "#c4b8a4", C: "#22303a", c: "#121a22",
             D: "#c8283c", d: "#8a1828", P: "#3a2a4a", p: "#24182e", O: "#2a2026", o: "#140e12", X: "#ff8a1f", x: "#c85a10", Y: "#3a7a2a", K: "#0c0c12" },
      legY: 23,
      layers: [
        backLong(24),
        outfitTank(BOTTOM_SKIRT, true),
        { x: 9, y: 15, rows: ["CCCCCC", "CCCCCC", "CcCCcC"] },
        { x: 7, y: 13, rows: ["DDDDDDDDDD", ".DdDDDDdD.", "....Dd...."] },
        "FACE",
        frontStraight(14),
        /* 銀のすじ（左の前髪） */
        { x: 6, y: 8, rows: ["L", "L", "L", "L", "L", "L"] },
        /* 左手の南瓜 */
        { x: 0, y: 18, rows: [".YY..", "XXXX.", "XxXXX", "XXXxX", ".XXX."] },
      ],
    },
    /* ── リナ（闇）：紫のボブ・頭と体の包帯・赤い瞳 ── */
    rina: {
      pal: { H: "#3a2a5a", h: "#1e1434", L: "#6a5a9a", E: "#ff3a3a", A: "#f0ece4", a: "#c8c0b0", C: "#f0ece4", c: "#c8c0b0",
             P: "#f0ece4", p: "#c8c0b0", O: "#d8d0c0", o: "#a89c88", D: "#ff8a1f", K: "#120c18" },
      legY: 23,
      layers: [
        backBob(),
        outfitTank(BOTTOM_SHORTS),
        { x: 7, y: 15, rows: ["a.a.a.a.a.", "..........", ".a.a.a.a.a"] },
        "FACE",
        frontBob(false),
        /* 頭の包帯と花かざり */
        { x: 4, y: 3, rows: ["CCCCCCCCCCCCCCCC", "cC.cCC.cC.CCc.Cc"] },
        { x: 15, y: 2, rows: [".D.", "DDD", ".D."] },
      ],
    },
    /* ── カオリ（闇）：紫の長い髪・オレンジの魔女帽・オレンジと黒の服・おばけ ── */
    kaori: {
      pal: { H: "#6a3a8a", h: "#42205a", L: "#a07ac8", E: "#ff6a5a", A: "#ff8a1f", a: "#c85a10", C: "#1e1428", c: "#100a16",
             D: "#ff8a1f", d: "#c85a10", G: "#2a1a3a", P: "#2a1a3a", p: "#180e22", O: "#2a1a3a", o: "#140a1c", X: "#f4f4ff", x: "#c8c8e8", Y: "#2a1a3a", K: "#140a1c" },
      legY: 23,
      layers: [
        backLong(25),
        outfitTank(BOTTOM_SKIRT),
        { x: 9, y: 16, rows: ["CCCCCC", "CCCCCC", "CcCCcC"] },
        "FACE",
        frontStraight(15),
        { x: 3, y: 0, rows: [
          ".........Dd.......",
          ".......DDDDd......",
          "......DDDDDDd.....",
          "....dDDDDDDDDd....",
          "..ddGGGGGGGGGGdd..",
          "dDDDDDDDDDDDDDDDDd",
        ] },
        /* 左のおばけ */
        { x: 0, y: 12, rows: [".XXX.", "XXXXX", "XKXKX", "XXXXX", "XxXxX"] },
      ],
    },
    /* ── ★★ 2026-10-07 ヒバナ（木）：茶色の長い髪を青いリボンで右に結ぶ・水色のワンピース・青い花のイヤリング・勿忘草の花束 ── */
    hibana: {
      pal: { H: "#6a4a36", h: "#432c1f", L: "#9c7458", E: "#b48a52", A: "#d6e7ff", a: "#a9c4ea", C: "#f4f8ff", c: "#cfdcf0",
             D: "#3f7fe6", d: "#2a5bb8", P: "#b9d3fb", p: "#8fb0e4", O: "#f4f8ff", o: "#b6c3d8", X: "#6fa8ff", x: "#3d7be0", Y: "#3dbf7a", K: "#15111a" },
      legY: 23,
      layers: [
        backLong(24),
        /* 右に結んだ髪（根もとに青いリボン） */
        { x: 15, y: 1, rows: [
          "..hhh.",
          ".hHHHh",
          "hHHLHh",
          ".DdDhh",
          "..hHHh",
          "..hHHHh",
          "...hHHh",
          "...hHHh",
          "....hHh",
          "....hhh",
        ] },
        { x: 6, y: 14, rows: [
          ".AAACDCAAA..",
          "SAAAACAAAAAS",
          "S.AAAAAAAA.S",
          "s.AaAAAAaA.s",
          "S.AAAAAAAA.S",
          "S.AAAAAAAA.S",
        ].concat(BOTTOM_SKIRT) },
        "FACE",
        frontStraight(14),
        /* 青い花のイヤリング */
        { x: 6, y: 11, rows: ["X"] },
        { x: 17, y: 11, rows: ["X"] },
        /* 左手の勿忘草の花束 */
        { x: 1, y: 16, rows: [".X.X.", "XxXxX", ".XYX.", "..Y..", "..Y.."] },
      ],
    },
    /* ── ★★ 2026-10-07 フキ（闇）：長い黒髪・白いシャツ・紺のリボン・紺のスカート・夜桜の枝 ── */
    fuki: {
      pal: { H: "#22263a", h: "#121421", L: "#4c5577", E: "#7fa8e8", A: "#f5f7fc", a: "#cdd5e6", C: "#f5f7fc", c: "#cdd5e6",
             D: "#26357a", d: "#18225a", P: "#2c3a72", p: "#1c264e", O: "#262a3a", o: "#141824", X: "#ffc4dc", x: "#ff8fb8", Y: "#4a3a3a", K: "#120f18" },
      legY: 23,
      layers: [
        backLong(25),
        { x: 6, y: 14, rows: [
          ".AAADdDAAA..",
          "SAAAAADAAAAS",
          "S.AAAAAAAA.S",
          "s.AaAAAAaA.s",
          "S.AAAAAAAA.S",
          "S.AAAAAAAA.S",
        ].concat(BOTTOM_SKIRT) },
        "FACE",
        frontStraight(14),
        /* 右手の夜桜の枝 */
        { x: 17, y: 14, rows: ["X.X..", ".XxX.", "..Y.X", "...Yx", "....Y"] },
      ],
    },
    /* ── ヒナノ（風）：ウェーブの黒髪・デニムジャケット・白いトップス・カーゴパンツ・アイス ── */
    hinano: {
      pal: { H: "#26222e", h: "#141118", L: "#5a5470", E: "#d3953e", A: "#7aaee2", a: "#4d7cb8", C: "#f5f5f5", c: "#d2d2da",
             P: "#6c7a4b", p: "#4d5a34", O: "#f2f2f2", o: "#a8a8b8", D: "#e8c25a", G: "#f2d27a", X: "#9fe6ff", x: "#57c2e8", Y: "#f3e3c3", K: "#120f18" },
      legY: 23,
      layers: [
        backLong(25, true),
        { x: 6, y: 14, rows: [
          "AASCCCCCCSAA",
          "AaCCCCCCCCaA",
          "Aa.CCCCCC.aA",
          "AA.cCCCCc.AA",
          "Aa.SSSSSS.aA",
          "SA.PPPPPP.AS",
        ].concat(BOTTOM_PANTS.slice(1)) },
        "FACE",
        frontSwept(14),
        /* ヘアピン（左） */
        { x: 6, y: 5, rows: ["DD", ".D"] },
        /* 右手のアイス */
        { x: 17, y: 16, rows: [".XX", "XxX", "XxX", ".Y.", ".Y."] },
      ],
    },
    /* ── ハノン（光）：茶色のボブ・白いブラウス・紺のリボン・紺のスカート・バスケットボール ── */
    hanon: {
      pal: { H: "#714a30", h: "#4c2e1c", L: "#a87a52", E: "#b06a2c", A: "#f6f1ea", a: "#d6ccc0", C: "#f6f1ea", c: "#d6ccc0",
             D: "#27306e", d: "#171d48", P: "#2d3462", p: "#1d2244", O: "#3b2a24", o: "#22180f", X: "#f08a34", x: "#b8561c", Y: "#4a2410", K: "#150f12" },
      legY: 23,
      layers: [
        backBob(),
        { x: 6, y: 14, rows: [
          ".AAADdDAAA..",
          "SAAAAADAAAAS",
          "S.AAAAAAAA.S",
          "s.AaAAAAaA.s",
          "S.AAAAAAAA.S",
          "S.AAAAAAAA.S",
        ].concat(BOTTOM_SKIRT) },
        "FACE",
        frontBob(false),
        /* 左手のバスケットボール */
        { x: 1, y: 17, rows: [".XXX.", "XxXYX", "XYYYX", "XXYxX", ".XXX."] },
      ],
    },
    /* ── ココハ（炎）：長い黒髪に紅い椿・赤い振袖・透明な傘 ── */
    kokoha: {
      pal: { H: "#1e1b24", h: "#0f0d13", L: "#4d4660", E: "#ff7aa6", A: "#d8283e", a: "#a3162b", C: "#fbeef0", c: "#e7c9cf",
             D: "#ff3550", d: "#b51632", G: "#ffd36a", P: "#d8283e", p: "#a3162b", O: "#f6f0e8", o: "#c9bfb2",
             X: "#d8f3ffaa", x: "#8cc6e4", Y: "#6b5a4c", K: "#140c12" },
      legY: 27, robe: true,
      layers: [
        backLong(24),
        { x: 5, y: 14, rows: [
          "..AAACCAAA...",
          ".AAAAACAAAAA.",
          "AAAaAACAAaAAA",
          "AAA.AAAAA.AAA",
          "AaA.AAcAA.AaA",
          ".AA.GGGGG.AA.",
          "..S.AAAAA.S..",
          "....AAcAA....",
          "...AAAAAAA...",
          "...AaAAAaA...",
          "...AAACAAA...",
          "...aAAAAAa...",
          "....OO.OO....",
          "....oo.oo....",
        ] },
        /* 振袖の白い模様 */
        { x: 6, y: 16, rows: ["C.......C", "......C..", ".C.......", "....C...C"] },
        "FACE",
        frontStraight(15, { part: 1 }),
        /* 椿の髪かざり（左右） */
        { x: 4, y: 3, rows: [".D.", "DdD", ".D."] },
        { x: 17, y: 5, rows: [".D.", "DdD", ".D."] },
        /* 透明な傘（頭の上にさしかける・すけて見える） */
        { x: 8, y: 0, rows: [
          "....xxxxxx....",
          "..xxXXXxXXXxx.",
          ".xXXXXXxXXXXXx",
          "xXXXXXXxXXXXXXx",
          "xxXxxXxxxXxxXxx",
        ] },
        { x: 15, y: 0, rows: ["Y"] },
        { x: 17, y: 5, rows: ["Y", "Y", "Y", "Y", "Y", "Y", "Y", "Y", "Y", "Y", "Y", "Y", "Y", "YY"] },
      ],
    },
    /* ── ムツミ（炎）：黒〜紅のボブ・赤い瞳・ベージュのニットワンピ・黒いジャケット ── */
    mutsumi: {
      pal: { H: "#2b1a20", h: "#170c10", L: "#7a2b38", E: "#ff3048", A: "#c4b8ac", a: "#958a7e", C: "#23202a", c: "#141218",
             P: "#c4b8ac", p: "#958a7e", O: "#1d1a22", o: "#0e0c11", X: "#ff6a3c", x: "#ffc65a", K: "#150b0f" },
      legY: 24,
      layers: [
        backBob(),
        { x: 5, y: 14, rows: [
          "..CAAAAAAC...",
          ".CCAAAAAACC..",
          ".CC.AAAAA.CC.",
          ".Cc.AaAaA.cC.",
          ".CC.AAAAA.CC.",
          "..S.AAAAA.S..",
          "....AaAAA....",
          "....AAAAA....",
          "....aAAAa....",
          "....SS.SS....",
          "....SS.SS....",
          "....ss.ss....",
          "...OOO.OOO...",
          "...ooo.ooo...",
        ] },
        "FACE",
        frontBob(true),
        /* 左手の炎（ミラージュ） */
        { x: 1, y: 17, rows: [".x.", "xXx", "XXX", ".X."] },
      ],
    },
    /* ── レイナ（影）：アッシュの長い髪にお団子2つ・青い瞳・黒いタートルネック・銀の十字架 ── */
    reina: {
      pal: { H: "#bba48c", h: "#8d7762", L: "#e6d4bc", E: "#4c8dff", A: "#27242f", a: "#16141b", C: "#27242f", c: "#16141b",
             G: "#e9eaf2", g: "#9fa2b4", P: "#3b2f56", p: "#271f3b", O: "#1b1822", o: "#0d0c11", X: "#a86bff", x: "#5d2bd0", K: "#15111a" },
      legY: 23,
      layers: [
        backLong(25),
        /* お団子（左右） */
        { x: 3, y: 0, rows: [".hHh", "hHLHh", "hHHHh", ".hhh"] },
        { x: 16, y: 0, rows: ["hHh.", "hHLHh", "hHHHh", ".hhh."] },
        outfitTank(BOTTOM_SKIRT),
        /* タートルネック（腕も黒い長袖） */
        { x: 6, y: 13, rows: [
          "....AAAA....",
          ".AAAAAAAAAA.",
          "AAAAAAAAAAAA",
          "A.AAAAAAAA.A",
          "a.AaAAAAaA.a",
          "A.AAAGAAAA.A",
          "A.AAGGGAAA.A",
          "S.AAAGAAAA.S",
        ] },
        "FACE",
        frontStraight(15),
        /* 左手の影の球 */
        { x: 1, y: 18, rows: [".x.", "xXx", ".x."] },
      ],
    },
    /* ── アズサ（水）：金髪のロングに青い薔薇・金の瞳・青いゴシックドレス・細身の剣 ── */
    azusa: {
      pal: { H: "#f2d374", h: "#c79e3e", L: "#fff4bf", E: "#f0b030", A: "#2f53c4", a: "#1d3488", C: "#15131c", c: "#0b0a10",
             D: "#3a63ea", d: "#1c3aa0", G: "#e3e8f2", g: "#9aa3b8", P: "#2f53c4", p: "#1d3488", O: "#15131c", o: "#0b0a10",
             X: "#e9f1fb", x: "#9fb2cc", Y: "#d9b45a", K: "#14101e" },
      legY: 27, robe: true,
      layers: [
        backLong(25),
        { x: 5, y: 14, rows: [
          ".AAACCCCAAA..",
          "AAAAACCAAAAA.",
          "AAa.AAAAA.aAA",
          ".AA.AaAaA.AA.",
          ".CC.AAAAA.CC.",
          "..S.CCCCC.S..",
          "....AAAAA....",
          "...AAAAAAA...",
          "...AaAAAaA...",
          "..AAAAAAAAA..",
          "..AaAAAAAaA..",
          "..CCCCCCCCC..",
          "....OO.OO....",
          "....oo.oo....",
        ] },
        "FACE",
        frontSwept(15),
        /* 青い薔薇（左）と銀の髪かざり（右） */
        { x: 3, y: 1, rows: [".DD.", "DdDD", "DDdD", ".DD."] },
        { x: 16, y: 4, rows: ["GG", "Gg"] },
        /* 右手のレイピア（ななめ下へ） */
        { x: 17, y: 19, rows: ["YY....", ".X....", "..X...", "...X..", "....X.", ".....x"] },
      ],
    },
    /* ── カグラ（炎）：長い黒髪・赤い瞳・白いタンク・黒いサスペンダー・黒い長手袋・刀 ── */
    kagura: {
      pal: { H: "#1b181e", h: "#0d0b0f", L: "#4a4250", E: "#ff3a46", A: "#f3f3f3", a: "#cfcfd8", C: "#1e1c24", c: "#0e0d12",
             P: "#1f1d26", p: "#111017", O: "#1e1c24", o: "#0e0d12", X: "#dde3ec", x: "#8c95a6", D: "#e02a3c", Y: "#2a1418", K: "#120d10" },
      legY: 23,
      layers: [
        backLong(25),
        /* 背中にななめに背負った刀（柄は右肩の上・切っ先は左下） */
        { x: 3, y: 9, rows: [
          "................Y.",
          "...............YY.",
          "..............D...",
          ".............X....",
          "............X.....",
          "...........X......",
          "..........X.......",
          ".........X........",
          "........X.........",
          ".......X..........",
          "......X...........",
          ".....X............",
          "....X.............",
          "...X..............",
          "..x...............",
          ".x................",
        ] },
        outfitTank(BOTTOM_BOOTS_SKIRT, true),
        /* サスペンダー */
        { x: 9, y: 14, rows: ["C....C", "C....C", "C....C", "C....C", "C....C"] },
        "FACE",
        frontStraight(15),
      ],
    },
    /* ── コトリ（水）：紺の長い髪に頭のお団子・紫の瞳・白いタンク・黒いショートパンツ・バスケットボール ── */
    kotori: {
      pal: { H: "#262b4e", h: "#13162c", L: "#55609c", E: "#a17cff", A: "#f3f5f9", a: "#c9d0de", C: "#f3f5f9", c: "#c9d0de",
             P: "#1d1c24", p: "#0f0e13", O: "#f2f2f6", o: "#a3a3b5", X: "#ef7c2e", x: "#b04c14", Y: "#4a2410", K: "#110f1c" },
      legY: 23,
      layers: [
        backLong(24, true),
        /* 頭のお団子 */
        { x: 9, y: 0, rows: ["..hh..", ".hHHh.", "hHLHHh"] },
        outfitTank(BOTTOM_SHORTS),
        "FACE",
        frontStraight(14),
        /* 右手のバスケットボール */
        { x: 17, y: 17, rows: [".XXX.", "XxXYX", "XYYYX", "XXYxX", ".XXX."] },
      ],
    },
  };
  /* ── クミコ＆レイナ（炎＆光）：ふたりで1キャラ。セーラー服・ユーフォニアムとトランペット ── */
  const DUO_UNIFORM = (inst) => [
    { x: 6, y: 13, rows: [
      "..CCDDCC....",
      ".CCAADAAACC.",
      "SAAAAAAAAAAS",
      "S.AAAAAAAA.S",
      "s.AaAAAAaA.s",
      "S.AAAAAAAA.S",
      "S.AAAAAAAA.S",
    ].concat(BOTTOM_SKIRT) },
  ];
  CHAR_ART.kumireina = {
    duo: true,
    /* 奥（右）がレイナ：黒い長い髪・紫の瞳 */
    back: {
      pal: { H: "#1c1a26", h: "#0e0d14", L: "#4a4a6a", E: "#a77cff", A: "#f3f5fa", a: "#c8d0e0", C: "#2a4a8c", c: "#1a3060",
             D: "#e8507c", P: "#2c3a66", p: "#1c2648", O: "#3a2a24", o: "#20160f", G: "#ffd36a", g: "#c99a2e", K: "#120f1a" },
      legY: 23,
      layers: [backLong(25)].concat(DUO_UNIFORM(), ["FACE", frontStraight(15),
        /* トランペット */
        { x: 16, y: 16, rows: ["GGGgg.", "..GGGg", "....gG"] }]),
    },
    /* 手前（左）がクミコ：茶色のくせっ毛ボブ・茶色の瞳 */
    front: {
      pal: { H: "#a76a40", h: "#74442a", L: "#d39a68", E: "#9b5a2a", A: "#f3f5fa", a: "#c8d0e0", C: "#2a4a8c", c: "#1a3060",
             D: "#e8507c", P: "#2c3a66", p: "#1c2648", O: "#3a2a24", o: "#20160f", G: "#ffd36a", g: "#c99a2e", K: "#150f10" },
      legY: 23,
      layers: [backBob()].concat(DUO_UNIFORM(), ["FACE", frontBob(true),
        /* ユーフォニアム（金色） */
        { x: 0, y: 15, rows: ["..GGG.", ".GgggG", "GGGGGG", "GgGGgG", ".GGGG.", "..gg.."] }]),
    },
  };

  /* ── 1体ぶんの方眼 → 画素 ── */
  function composeChar(def) {
    const pal = Object.assign({}, BASE_PAL, def.pal);
    const b = mkBuf(CW, CH);
    def.layers.forEach((L) => {
      if (L === "FACE") drawLayer(b, FACE, pal);
      else drawLayer(b, L, pal);
    });
    return { buf: b, pal };
  }
  function composeBlink(def) {
    const pal = Object.assign({}, BASE_PAL, def.pal);
    const b = mkBuf(CW, CH);
    def.layers.forEach((L) => {
      if (L === "FACE") { drawLayer(b, FACE, pal); drawLayer(b, FACE_BLINK, pal); }
      else drawLayer(b, L, pal);
    });
    return { buf: b, pal };
  }
  /* 待機・歩き・攻撃・被弾のコマを作る */
  function animFrames(base, blink, def, outline) {
    const legY = def.legY || 23;
    const W = base.w;
    const ol = (b) => outlineBuf(b, outline);
    const up = (b, extra) => shiftWhere(b, (x, y) => y < legY && !(extra && extra(x, y)), 0, -1);
    let walk;
    if (def.robe) {
      /* 長い裾：上下にはずむ＋裾が左右にゆれる */
      walk = [
        base,
        shiftWhere(up(base), (x, y) => y >= legY - 3, 1, 0),
        base,
        shiftWhere(up(base), (x, y) => y >= legY - 3, -1, 0),
      ];
    } else {
      const mid = W / 2;
      walk = [
        base,
        shiftWhere(up(base), (x, y) => y >= legY && x < mid, 0, -1),
        base,
        shiftWhere(up(base), (x, y) => y >= legY && x >= mid, 0, -1),
      ];
    }
    const idle = [base, shiftWhere(base, (x, y) => y < legY - 2, 0, 1), blink];
    const atk = shiftWhere(base, (x, y) => y < 14, 1, 0);
    const out = {
      idle: idle.map((b) => bufToCanvas(ol(b))),
      walk: walk.map((b) => bufToCanvas(ol(b))),
      atk: bufToCanvas(ol(atk)),
      hurt: bufToCanvas(whiteOf(ol(base))),
    };
    out.w = W; out.h = base.h;
    return out;
  }
  /* ══════════════════════════════════════════════════════════════
     ★★ 2026-10-05 横向きに走る絵（ご指定「横に走る時のデザイン」）
     ------------------------------------------------------------
     正面の絵を左右反転するだけだと、横へ走っても正面を向いたまま滑って見える。
     横顔（目は1つ・鼻先・耳は髪の下）＋走る脚（4コマ：前に踏む・すれちがう・後ろに蹴る・すれちがう）
     ＋腕の振り＋走るとなびく髪 を、キャラの色（pal）と下の SIDE の型から組み立てる。右向きで作り、左は反転。
     hair … long（長い）・bob・pony（ポニーテール）／len … 後ろ髪の下端／wavy … ゆるいウェーブ
     top … 上の服の型／arm … 腕の色の文字（S＝素肌）／bottom … shorts・pants・skirt・bootsSkirt・robe・dress
     prop … 手に持つ物／acc … 髪かざり など
     ══════════════════════════════════════════════════════════════ */
  const SIDE = {
    takina:  { hair: "pony", len: 22, top: "tank", arm: "S", bottom: "shorts", prop: "gun", inner: "C" },
    hibana:  { hair: "long", len: 24, top: "blouse", arm: "A", bottom: "skirt", prop: "orb", ribbon: 1 },
    fuki:    { hair: "long", len: 25, top: "uniform", arm: "A", bottom: "skirt", prop: "flame" },
    hinano:  { hair: "long", len: 24, wavy: 1, top: "jacket", arm: "A", bottom: "pants", prop: "ice", acc: "pin" },
    hanon:   { hair: "bob", top: "blouse", arm: "A", bottom: "skirt", prop: "ball", ribbon: 1 },
    kokoha:  { hair: "long", len: 23, top: "kimono", arm: "A", bottom: "robe", prop: "umbrella", acc: "camellia" },
    mutsumi: { hair: "bob", wavy: 1, top: "knitjacket", arm: "C", bottom: "dress", prop: "flame" },
    reina:   { hair: "long", len: 24, top: "turtle", arm: "A", bottom: "skirt", prop: "orb", acc: "buns" },
    azusa:   { hair: "long", len: 24, top: "gothic", arm: "A", bottom: "robe", prop: "rapier", acc: "rose" },
    kagura:  { hair: "long", len: 24, top: "tank", arm: "C", bottom: "bootsSkirt", prop: "katana", susp: 1 },
    kotori:  { hair: "long", len: 23, wavy: 1, top: "tank", arm: "S", bottom: "shorts", prop: "ball", acc: "topbun" },
    duoBack: { hair: "long", len: 24, top: "uniform", arm: "A", bottom: "skirt", prop: "trumpet" },
    duoFront:{ hair: "bob", wavy: 1, top: "uniform", arm: "A", bottom: "skirt", prop: "euph" },
    /* ★★ 2026-10-09 Pumpkin Night（acc：witch／witchcat／cat／bonnet／clover／bandage・prop：lantern／candy／wand／pumpkin／candle／ghost・top：scarf） */
    ayano:   { hair: "long", len: 22, top: "blouse", arm: "A", bottom: "skirt", prop: "lantern", acc: "witch" },
    saki:    { hair: "long", len: 24, wavy: 1, top: "gothic", arm: "A", bottom: "skirt", prop: "candy", acc: "witch" },
    yuka:    { hair: "long", len: 23, top: "blouse", arm: "A", bottom: "skirt", prop: "wand", acc: "witchcat" },
    natsumi: { hair: "long", len: 25, top: "tank", arm: "C", bottom: "skirt", acc: "cat", tail: 1 },
    miu:     { hair: "bob", top: "uniform", arm: "A", bottom: "skirt", prop: "pumpkin", acc: "bonnet" },
    mai:     { hair: "long", len: 24, wavy: 1, top: "gothic", arm: "A", bottom: "skirt", prop: "candy", acc: "clover" },
    chinatsu:{ hair: "bob", wavy: 1, top: "gothic", arm: "C", bottom: "skirt", prop: "candle" },
    yuumi:   { hair: "long", len: 23, top: "scarf", arm: "C", bottom: "skirt", prop: "pumpkin" },
    rina:    { hair: "bob", top: "tank", arm: "A", bottom: "shorts", acc: "bandage" },
    kaori:   { hair: "long", len: 25, top: "blouse", arm: "A", bottom: "skirt", prop: "ghost", acc: "witch" },
    generic: { hair: "long", len: 23, top: "tank", arm: "S", bottom: "skirt" },
  };
  function sideBuf(pal0, sd, ph, legY0) {
    const pal = Object.assign({}, BASE_PAL, pal0);
    const b = mkBuf(CW, CH);
    const put = (x, y, ch) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= CW || y >= CH) return; const c = pal[ch]; if (!c) return; const s = String(c); setPx(b, x, y, hex(s.slice(0, 7)), s.length === 9 ? parseInt(s.slice(7, 9), 16) : 255); };
    const box = (x0, y0, x1, y1, ch) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(x, y, ch); };
    const seg = (x0, y0, x1, y1, ch, w) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; put(x, y, ch); if (w > 1) put(x + 1, y, ch); } };
    const dy = ph % 2 === 1 ? -1 : 0;          // すれちがう瞬間は体が1つ上がる
    const run = true;
    const legY = legY0 || 23;
    const robe = sd.bottom === "robe";
    /* 腕・脚の振り（0：右脚が前／2：左脚が前） */
    const sw = [1, 0, -1, 0][ph];
    const flow = (y) => run ? Math.floor(Math.max(0, y - 6) / 5) : 0;   // 走ると髪がうしろへ流れる
    /* ── 1. いちばん奥：後ろ髪・背中の刀・奥の腕と脚 ── */
    if (sd.hair === "long") {
      const L = sd.len || 23;
      for (let y = 4; y <= L; y++) {
        const f = flow(y) + (sd.wavy && y % 4 === 0 ? 1 : 0);
        const x0 = 6 - f, x1 = (y < 13 ? 11 : 9) - f;
        for (let x = x0; x <= x1; x++) put(x, y + dy, y === L ? "h" : (x === x0 ? "h" : "h"));
        if (y > 12 && y < L - 1) put(x0 + 1, y + dy, "H");
      }
    } else if (sd.hair === "bob") {
      for (let y = 4; y <= 13; y++) { const f = y > 10 ? 1 : 0; for (let x = 6 - f; x <= 11; x++) put(x, y + dy, "h"); }
      if (sd.wavy) { put(5, 12 + dy, "h"); put(5, 13 + dy, "h"); }
    } else if (sd.hair === "pony") {
      /* 結び目（頭のうしろ上）から長い尾が後ろへ流れる */
      const pts = [[7, 3], [6, 4], [5, 5], [4, 6], [3, 7], [3, 8], [2, 9], [2, 10], [1, 11], [1, 12], [1, 13], [0, 14], [0, 15], [1, 16], [1, 17]];
      pts.forEach(([x, y], i) => { const k = ph % 2 ? (i > 8 ? 1 : 0) : 0; put(x + k, y + dy, "H"); put(x + 1 + k, y + dy, i < 12 ? "H" : "h"); if (i < 10) put(x + 2 + k, y + dy, "h"); });
      put(4, 6 + dy, "L"); put(3, 8 + dy, "L");
      for (let y = 4; y <= 12; y++) for (let x = 7; x <= 10; x++) put(x, y + dy, "h");
    }
    if (sd.acc === "buns") { box(6, 1 + dy, 9, 3 + dy, "H"); put(7, 1 + dy, "L"); put(6, 1 + dy, "h"); put(9, 3 + dy, "h"); }
    if (sd.acc === "topbun") { box(10, 0 + dy, 13, 1 + dy, "H"); put(11, 0 + dy, "L"); }
    if (sd.prop === "katana") { seg(9, 11 + dy, 3, 25 + dy, "X", 1); put(10, 10 + dy, "Y"); put(11, 9 + dy, "Y"); put(9, 12 + dy, "D"); put(3, 26 + dy, "x"); }
    /* ★★ 2026-10-09 黒猫のしっぽ（ナツミ） */
    if (sd.tail) { seg(8, 20 + dy, 4, 17 + dy, "H", 1); seg(4, 17 + dy, 3, 12 + dy, "H", 1); put(3, 11 + dy, "h"); }
    /* 奥の脚（暗い色） */
    const shoe = (x, y, ch, ch2) => { put(x - 1, y, ch); put(x, y, ch); put(x + 1, y, ch); put(x + 2, y, ch); put(x - 1, y + 1, ch2); put(x, y + 1, ch2); put(x + 1, y + 1, ch2); put(x + 2, y + 1, ch2); };
    const legCol = sd.bottom === "pants" ? "p" : "s";
    const leg = (hx, sgn, back) => {
      /* sgn：1＝前へ踏む／-1＝後ろへ蹴る／0＝すれちがい（back なら持ち上げる） */
      const c = back ? legCol : (sd.bottom === "pants" ? "P" : "S");
      const lowerC = sd.bottom === "bootsSkirt" ? (back ? "o" : "O") : c;
      let fx, fy;
      if (sgn > 0) { fx = hx + 3; fy = 27; }
      else if (sgn < 0) { fx = hx - 3; fy = 27; }
      else if (back) { fx = hx - 2; fy = 25; }
      else { fx = hx; fy = 27; }
      const kx = (hx + fx) / 2 + (sgn === 0 && back ? 1 : 0), ky = (legY + dy + fy) / 2;
      if (!robe) { seg(hx, legY + 1 + dy, kx, ky, c, 2); seg(kx, ky, fx, fy, lowerC, 2); }
      shoe(fx, fy + 1, back ? "o" : "O", back ? "o" : "o");
    };
    leg(11, -sw, true);
    /* 奥の腕（体のうしろ・暗い色） */
    const armC = sd.arm || "S", armBack = armC === "S" ? "s" : armC === "A" ? "a" : armC === "C" ? "c" : armC;
    const arm = (sx, sy, sgn, back) => {
      const hx = sx + sgn * 3, hy = sy + 6;
      seg(sx, sy, (sx + hx) / 2, sy + 3, back ? armBack : armC, 2);
      seg((sx + hx) / 2, sy + 3, hx, hy, back ? armBack : armC, 2);
      put(hx, hy + 1, back ? "s" : "S"); put(hx + 1, hy + 1, back ? "s" : "S");
      return [hx, hy + 1];
    };
    arm(11, 15 + dy, -sw, true);
    /* ── 2. 体（胴・腰・スカート） ── */
    const T = sd.top;
    const torso = (ch, sh) => { for (let y = 14; y <= legY - 1; y++) { for (let x = 9; x <= 14; x++) put(x, y + dy, ch); put(9, y + dy, sh); } };
    if (T === "tank") { torso("A", "a"); put(9, 14 + dy, "S"); put(10, 14 + dy, "S"); put(13, 14 + dy, "S"); if (sd.inner) { put(14, 15 + dy, sd.inner); put(14, 16 + dy, sd.inner); } }
    else if (T === "jacket") { torso("C", "c"); for (let y = 14; y <= legY - 1; y++) { put(9, y + dy, "a"); put(10, y + dy, "A"); put(11, y + dy, "A"); put(12, y + dy, y % 3 ? "A" : "a"); } }
    else if (T === "blouse") { torso("A", "a"); if (sd.ribbon) { put(14, 14 + dy, "D"); put(15, 15 + dy, "D"); put(14, 15 + dy, "d"); put(15, 16 + dy, "d"); } }
    else if (T === "kimono") { torso("A", "a"); put(13, 14 + dy, "C"); put(14, 15 + dy, "C"); box(9, 19 + dy, 14, 20 + dy, "G"); put(11, 16 + dy, "C"); }
    else if (T === "knitjacket") { torso("A", "a"); for (let y = 14; y <= legY - 2; y++) { put(9, y + dy, "c"); put(10, y + dy, "C"); put(11, y + dy, "C"); } }
    else if (T === "turtle") { torso("A", "a"); put(11, 13 + dy, "A"); put(12, 13 + dy, "A"); put(14, 17 + dy, "G"); put(14, 18 + dy, "G"); put(13, 17 + dy, "g"); put(14, 19 + dy, "G"); }
    else if (T === "gothic") { torso("A", "a"); box(9, 18 + dy, 14, 18 + dy, "C"); put(13, 14 + dy, "C"); put(14, 14 + dy, "C"); }
    else if (T === "uniform") { torso("A", "a"); box(9, 14 + dy, 11, 15 + dy, "C"); put(14, 15 + dy, "D"); put(15, 16 + dy, "D"); put(14, 16 + dy, "D"); }
    else if (T === "scarf") { torso("A", "a"); box(9, 13 + dy, 15, 14 + dy, "D"); put(15, 15 + dy, "D"); put(15, 16 + dy, "d"); put(16, 15 + dy, "d"); }   /* ★★ 2026-10-09 ユウミ */
    else torso("A", "a");
    if (sd.susp) { for (let y = 14; y <= legY - 1; y++) put(12, y + dy, "C"); }
    put(11, 13 + dy, T === "turtle" ? "A" : "S"); put(12, 13 + dy, T === "turtle" ? "A" : "s");
    /* 手前の脚 */
    leg(12, sw, false);
    /* 腰から下 */
    const B = sd.bottom;
    if (B === "shorts") { box(9, legY + dy, 14, legY + 2 + dy, "P"); put(9, legY + 2 + dy, "p"); put(12, legY + 1 + dy, "p"); }
    else if (B === "pants") { box(9, legY + dy, 14, legY + 1 + dy, "P"); }
    else if (B === "skirt" || B === "bootsSkirt") {
      for (let y = 0; y < 4; y++) { const x0 = 9 - Math.floor(y / 2) - (y === 3 ? 1 : 0), x1 = 14 + Math.floor(y / 2); for (let x = x0; x <= x1; x++) put(x, legY - 1 + y + dy, (x + y) % 4 === 0 ? "p" : "P"); }
    } else if (B === "dress") {
      for (let y = 0; y < 4; y++) { const x0 = 9 - Math.floor(y / 2), x1 = 14 + Math.floor(y / 2); for (let x = x0; x <= x1; x++) put(x, legY - 1 + y + dy, y === 3 ? "a" : "A"); }
    } else if (robe) {
      const hem = legY0 >= 27 ? 27 : 26;
      for (let y = 20; y <= hem; y++) { const k = Math.floor((y - 20) / 2); const x0 = 9 - k - (y > 24 ? 1 : 0), x1 = 14 + k; for (let x = x0; x <= x1; x++) put(x, y + dy, y === hem ? (sd.top === "gothic" ? "C" : "a") : ((x === x0) ? "a" : "A")); }
      if (sd.top === "kimono") { put(12, 23 + dy, "C"); put(10, 25 + dy, "C"); put(14, 24 + dy, "C"); }
    }
    /* ── 3. 頭（横顔） ── */
    const hy = dy;
    for (let y = 3; y <= 13; y++) for (let x = 7; x <= 17; x++) { if ((x - 12) * (x - 12) + (y - 8.4) * (y - 8.4) <= 25.5) put(x, y + hy, "S"); }
    put(18, 10 + hy, "S");                      // 鼻先
    put(17, 12 + hy, "M"); put(16, 13 + hy, "s"); put(15, 13 + hy, "s");
    put(15, 8 + hy, "K"); put(16, 8 + hy, "K");  // まつげ
    put(15, 9 + hy, "E"); put(16, 9 + hy, "W"); put(15, 10 + hy, "E"); put(16, 10 + hy, "E");
    put(16, 11 + hy, "B");
    /* 前髪・頭のてっぺん・耳を隠す横の髪 */
    const capRows = { 2: [9, 14], 3: [8, 16], 4: [7, 17], 5: [7, 17], 6: [7, 17] };
    Object.keys(capRows).forEach((yy) => { const [x0, x1] = capRows[yy]; for (let x = x0; x <= x1; x++) put(x, +yy + hy, "H"); });
    put(10, 3 + hy, "L"); put(11, 3 + hy, "L"); put(12, 4 + hy, "L"); put(13, 4 + hy, "L");
    put(17, 7 + hy, "H"); put(14, 7 + hy, "h"); put(17, 8 + hy, "h");   // 前髪の毛先
    for (let y = 7; y <= 12; y++) { put(7, y + hy, "H"); put(8, y + hy, "H"); put(9, y + hy, "H"); put(10, y + hy, y < 11 ? "H" : "h"); if (y < 11) put(11, y + hy, "h"); }
    if (sd.hair === "bob") { put(11, 11 + hy, "H"); put(11, 12 + hy, "h"); }
    /* 髪かざり */
    if (sd.acc === "pin") { put(14, 4 + hy, "D"); put(15, 4 + hy, "D"); }
    if (sd.acc === "camellia") { put(8, 3 + hy, "D"); put(9, 4 + hy, "D"); put(7, 4 + hy, "D"); put(8, 4 + hy, "d"); put(8, 5 + hy, "D"); }
    if (sd.acc === "rose") { box(7, 2 + hy, 9, 4 + hy, "D"); put(8, 3 + hy, "d"); }
    /* ★★ 2026-10-09 Pumpkin Night：魔女帽・猫耳・ボンネット・四つ葉・包帯 */
    if (sd.acc === "witch" || sd.acc === "witchcat") {
      for (let x = 4; x <= 19; x++) put(x, 3 + hy, (x === 4 || x === 19) ? "d" : "D");
      for (let x = 8; x <= 15; x++) put(x, 2 + hy, "G");
      for (let x = 9; x <= 14; x++) put(x, 1 + hy, "D");
      for (let x = 8; x <= 11; x++) put(x, 0 + hy, x === 8 ? "d" : "D");
      if (sd.acc === "witchcat") { put(16, 1 + hy, "H"); put(16, 2 + hy, "H"); put(17, 2 + hy, "H"); }
    }
    if (sd.acc === "cat") { put(9, 1 + hy, "H"); put(9, 2 + hy, "H"); put(10, 2 + hy, "D"); put(14, 1 + hy, "H"); put(14, 2 + hy, "H"); put(13, 2 + hy, "D"); }
    if (sd.acc === "bonnet") { for (let y = 2; y <= 10; y++) for (let x = 6; x <= 10; x++) put(x, y + hy, (x === 6 || y === 2) ? "d" : "D"); for (let x = 7; x <= 15; x++) put(x, 2 + hy, "D"); put(12, 13 + hy, "G"); put(13, 14 + hy, "G"); }
    if (sd.acc === "clover") { put(8, 3 + hy, "D"); put(9, 3 + hy, "D"); put(8, 4 + hy, "D"); put(9, 4 + hy, "d"); }
    if (sd.acc === "bandage") { for (let x = 7; x <= 17; x++) { put(x, 4 + hy, "C"); if (x % 3 === 0) put(x, 5 + hy, "c"); } }
    if (sd.prop === "takina" || sd.hair === "pony") { put(7, 3 + hy, "D"); put(7, 4 + hy, "D"); }
    /* ── 4. 手前の腕と持ち物 ── */
    const [hx, hy2] = arm(12, 15 + dy, sw, false);
    const P = sd.prop;
    if (P === "gun") { box(hx + 1, hy2 - 1, hx + 4, hy2 - 1, "X"); put(hx + 1, hy2, "x"); put(hx + 2, hy2, "x"); put(hx + 5, hy2 - 1, "x"); }
    else if (P === "ice") { put(hx + 1, hy2 - 2, "X"); put(hx + 2, hy2 - 2, "X"); put(hx + 1, hy2 - 3, "X"); put(hx + 2, hy2 - 3, "x"); put(hx + 1, hy2 - 1, "Y"); put(hx + 2, hy2 - 1, "Y"); }
    else if (P === "ball") { const bx = hx + 1, by = hy2 - 2; [".XX.", "XYXX", "XXYx", ".xx."].forEach((r, j) => { for (let i = 0; i < 4; i++) if (r[i] !== ".") put(bx + i, by + j, r[i]); }); }
    else if (P === "flame") { put(hx + 1, hy2 - 1, "X"); put(hx + 1, hy2 - 2, "x"); put(hx + 2, hy2 - 1, "X"); put(hx + 2, hy2 - 3, "X"); put(hx + 1, hy2, "X"); }
    else if (P === "orb") { put(hx + 1, hy2 - 1, "X"); put(hx + 2, hy2 - 1, "x"); put(hx + 1, hy2 - 2, "x"); put(hx + 2, hy2, "X"); }
    else if (P === "rapier") { put(hx + 1, hy2, "Y"); put(hx + 1, hy2 - 1, "Y"); seg(hx + 2, hy2, hx + 7, hy2 + 3, "X", 1); }
    else if (P === "umbrella") {
      /* すけた傘を頭の上に（柄は手前の手へ） */
      for (let x = 5; x <= 19; x++) { const t = Math.abs(x - 12); const top = t > 6 ? 3 : t > 4 ? 2 : t > 2 ? 1 : 0; for (let y = top; y <= 3; y++) put(x, y + dy - 1, y === 3 ? "x" : "X"); }
      seg(12, 2 + dy, hx + 1, hy2 - 1, "Y", 1);
    }
    /* ★★ 2026-10-09 Pumpkin Night の小物 */
    else if (P === "lantern") { put(hx + 1, hy2 - 3, "Y"); box(hx, hy2 - 2, hx + 2, hy2, "X"); put(hx + 1, hy2 - 1, "x"); }
    else if (P === "candy") { seg(hx + 1, hy2, hx + 1, hy2 - 3, "Y", 1); box(hx, hy2 - 6, hx + 2, hy2 - 4, "X"); put(hx + 1, hy2 - 5, "x"); }
    else if (P === "wand") { seg(hx + 1, hy2, hx + 4, hy2 - 4, "Y", 1); put(hx + 5, hy2 - 5, "X"); put(hx + 4, hy2 - 5, "x"); put(hx + 5, hy2 - 6, "x"); put(hx + 6, hy2 - 5, "x"); put(hx + 5, hy2 - 4, "x"); }
    else if (P === "pumpkin") { box(hx, hy2 - 2, hx + 3, hy2 + 1, "X"); put(hx + 1, hy2 - 3, "Y"); put(hx + 1, hy2 - 1, "x"); put(hx + 2, hy2 - 1, "x"); }
    else if (P === "candle") { box(hx + 1, hy2 - 3, hx + 2, hy2, "Y"); put(hx + 1, hy2 - 4, "X"); put(hx + 1, hy2 - 5, "x"); }
    else if (P === "ghost") { box(hx + 1, hy2 - 5, hx + 4, hy2 - 2, "X"); put(hx + 2, hy2 - 4, "K"); put(hx + 4, hy2 - 4, "K"); put(hx + 1, hy2 - 1, "X"); put(hx + 3, hy2 - 1, "X"); }
    else if (P === "trumpet") { box(16, 11 + hy, 20, 11 + hy, "G"); put(21, 10 + hy, "G"); put(21, 11 + hy, "G"); put(21, 12 + hy, "G"); put(17, 12 + hy, "g"); }
    else if (P === "euph") { box(13, 16 + dy, 16, 19 + dy, "G"); put(16, 15 + dy, "G"); put(17, 14 + dy, "G"); put(14, 17 + dy, "g"); put(15, 18 + dy, "g"); }
    return b;
  }
  /* 4コマ（＋輪郭）。duo は奥のレイナを先に描いて手前のクミコを重ねる（横幅 32） */
  function sideFrames(id, def) {
    const ol = (bb, k) => bufToCanvas(outlineBuf(bb, k || "#14111c"));
    if (def.duo) {
      const W = 32;
      return [0, 1, 2, 3].map((ph) => {
        const bk = outlineBuf(sideBuf(def.back.pal, SIDE.duoBack, (ph + 2) % 4, 23), def.back.pal.K);
        const fr = sideBuf(def.front.pal, SIDE.duoFront, ph, 23);
        const b = mkBuf(W, CH);
        const put2 = (src, ox, oy) => { for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) { const i = (y * src.w + x) * 4; if (!src.d[i + 3]) continue; const nx = x + ox, ny = y + oy; if (nx < 0 || nx >= W || ny < 0 || ny >= CH) continue; b.d.set(src.d.subarray(i, i + 4), (ny * W + nx) * 4); } };
        put2(bk, 1, -1); put2(fr, 8, 0);
        return ol(b, def.front.pal.K);
      });
    }
    const sd = SIDE[id] || SIDE.generic;
    return [0, 1, 2, 3].map((ph) => ol(sideBuf(def.pal, sd, ph, def.legY || 23), def.pal.K));
  }
  const spriteCache = {};
  function charSprite(id) {
    if (spriteCache[id]) return spriteCache[id];
    const def = CHAR_ART[id] || genericArt(id);
    let res;
    if (def.duo) {
      /* ふたり：レイナ（奥・右）を先に描いて、クミコ（手前・左）を重ねる。横幅 32 */
      const W = 32;
      const mk = (blinkIt) => {
        const bk = (blinkIt ? composeBlink : composeChar)(def.back).buf;
        const fr = (blinkIt ? composeBlink : composeChar)(def.front).buf;
        const b = mkBuf(W, CH);
        const put = (src, ox, oy) => { for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) { const i = (y * src.w + x) * 4; if (!src.d[i + 3]) continue; const nx = x + ox, ny = y + oy; if (nx < 0 || nx >= W || ny < 0 || ny >= CH) continue; b.d.set(src.d.subarray(i, i + 4), (ny * W + nx) * 4); } };
        put(outlineBuf(bk, def.back.pal.K), 8, -1);
        put(fr, 0, 0);
        return b;
      };
      const base = mk(false), blink = mk(true);
      res = animFrames(base, blink, { legY: 23 }, def.front.pal.K);
    } else {
      const c = composeChar(def), bl = composeBlink(def);
      res = animFrames(c.buf, bl.buf, def, def.pal.K || "#14111c");
    }
    /* 横向きに走る4コマ（右向き） */
    try { res.side = sideFrames(CHAR_ART[id] ? id : "generic", def); } catch (e) { res.side = null; }
    spriteCache[id] = res;
    return res;
  }
  /* 定義の無いキャラ（あとから極◯祭に増えた子）は、属性色で組み立てる */
  const EL_COL = { fire: "#e0402e", water: "#3a8ee8", wood: "#3fbf6e", light: "#e8c040", dark: "#8a5ce0" };
  function genericArt(id) {
    let el = "water";
    try { if (typeof CHARS !== "undefined" && CHARS[id]) el = CHARS[id].el; } catch (e) {}
    const c = EL_COL[el] || "#3a8ee8";
    return {
      pal: { H: shade(c, 0.55), h: shade(c, 0.35), L: shade(c, 0.85), E: c, A: "#f2f2f6", a: "#c8c8d6", C: shade(c, 0.6), c: shade(c, 0.4),
             P: shade(c, 0.45), p: shade(c, 0.3), O: "#2a2830", o: "#141218", K: "#120f18" },
      legY: 23,
      layers: [backLong(24), outfitTank(BOTTOM_SKIRT), "FACE", frontStraight(14)],
    };
  }

  /* ══════════════════════════════════════════════════════════════
     イラストからドットの顔アイコンを作る（HUD・一覧用）
     切り抜き位置は 0〜1 の割合（t_◯◯.webp の正方形に対して）
     ══════════════════════════════════════════════════════════════ */
  /* ★★ 2026-10-05 顔がずれていた子（ココハ・タキナ）を直した（t_◯◯.webp を見て合わせた） */
  const FACE_BOX = {
    takina: [0.20, 0.16, 0.36], hibana: [0.34, 0.20, 0.40], fuki: [0.22, 0.18, 0.42], hinano: [0.31, 0.10, 0.35], hanon: [0.32, 0.08, 0.38], kokoha: [0.35, 0.15, 0.33],
    mutsumi: [0.34, 0.05, 0.33], reina: [0.28, 0.12, 0.38], azusa: [0.30, 0.06, 0.37], kumireina: [0.19, 0.06, 0.56],
    kagura: [0.23, 0.08, 0.37], kotori: [0.34, 0.12, 0.34],
    /* ★★ 2026-10-09 Pumpkin Night */
    ayano: [0.36, 0.30, 0.32], saki: [0.38, 0.28, 0.32], yuka: [0.34, 0.28, 0.34], natsumi: [0.36, 0.18, 0.33], miu: [0.42, 0.24, 0.34],
    mai: [0.46, 0.26, 0.34], chinatsu: [0.40, 0.25, 0.33], yuumi: [0.36, 0.20, 0.34], rina: [0.42, 0.22, 0.34], kaori: [0.36, 0.28, 0.34],
  };
  const portraitCache = {};
  function portrait(id, file, size, cb) {
    size = size || 40;
    const key = id + "|" + size;
    if (portraitCache[key]) { cb && cb(portraitCache[key]); return portraitCache[key]; }
    const img = new Image();
    img.onload = () => {
      try {
        const bx = FACE_BOX[id] || [0.25, 0.08, 0.5];
        const sw = img.naturalWidth, sh = img.naturalHeight;
        const c = mkCanvas(size, size), g = c.getContext("2d");
        g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
        g.drawImage(img, bx[0] * sw, bx[1] * sh, bx[2] * sw, bx[2] * sh, 0, 0, size, size);
        /* ★★ 2026-10-05 色を 6 段に落としていたせいで、肌や髪の色が変（ご指摘）→ 元の色のまま */
        const url = c.toDataURL("image/png");
        portraitCache[key] = url;
        cb && cb(url);
      } catch (e) { cb && cb(file); }
    };
    img.onerror = () => cb && cb(file);
    img.src = file;
    return null;
  }

  /* 定義から作る（ギルドの NPC など。key でキャッシュ） */
  function spriteFromDef(key, def) {
    if (spriteCache[key]) return spriteCache[key];
    const c = composeChar(def), bl = composeBlink(def);
    const res = animFrames(c.buf, bl.buf, def, def.pal.K || "#14111c");
    /* 横向き（NPC も side の型があれば） */
    if (def.side) { try { res.side = [0, 1, 2, 3].map((ph) => bufToCanvas(outlineBuf(sideBuf(def.pal, def.side, ph, def.legY || 23), def.pal.K || "#14111c"))); } catch (e) { res.side = null; } }
    spriteCache[key] = res;
    return res;
  }
  const PARTS = { FACE, frontStraight, frontSwept, backLong, backBob, frontBob, outfitTank, BOTTOM_SHORTS, BOTTOM_SKIRT, BOTTOM_PANTS, BOTTOM_BOOTS_SKIRT };

  MA.Pix = {
    hex, toHex, shade, mix, rgba, mkCanvas, mkBuf, bufToCanvas, setPx, outlineBuf, shiftWhere, whiteOf,
    drawLayer, pixelize, framesFrom, textSprite, shortNum, charSprite, portrait, CHAR_ART, FACE_BOX, CW, CH, SIDE,
    spriteFromDef, PARTS,
  };
})();
