/* ══════════════════════════════════════════════════════════════
   ★★ 2026-10-26 完凸ロビー（ご指定「ヒサコとアリスは完凸すると、ロビー（パートナーの所）に動く立ち絵を出せる」）
   ------------------------------------------------------------
   ・表情は動かさず、軽く動かす（呼吸・頭の小さな傾き・髪とスカートのゆれ・体の重心）。セリフ・タッチの反応はなし
     （押すと小さくはずむだけ）。
   ・選ぶのはパートナーの画面の「ロビー」タブ（パートナーとは別のタブ）。表示（標準・アップ・全身）はパートナーと同じ。
   ・開放＝そのキャラの完凸（MagiBurst の magiburst_v1.chars[id].awk か、ポータルの xeva_gacha_v1.dupes[id] が 4）。
   ・選んだロビーは xeva_mate_v1.lobby（同期する）。パートナーを選ぶと外れる（home-mate.js）。
   ・素材は home-mate/lobby/（立ち絵は背景が透明・元は Documents/Claude/_fes_src/1024/*_lobby_full.webp）。
     髪・スカートの見分けは読みこんだときに色で決める（DEFS の hair／cloth）。画素の座標は元の絵のまま。
   ・ほかの所からは home-mate.js と同じ呼ばれ方（mount／layout／greet／destroy／shouldRun／kick）。
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const VER = 1;
  const DIR = "home-mate/lobby/";
  const DEFS = {
    /* ★★ 2026-10-30 超極彩祭のハル・チカ（ご指定「この2キャラは完凸をすることでロビーにセットできます」）。
       立ち絵は Documents/Claude/_fes_src/fes21/3.webp（ハル）・7.webp（チカ）＝背景が透明の全身。背景は展望テラス（ヒサコ・アリスと同じ） */
    haru: {
      name: "ハル", ruby: "Haru", color: "#3a8ee8", el: "water", img: "haru.webp", bg: "park.webp",
      intro: "展望テラスで、青い髪をかきあげるハル。",
      rig: { size: [940, 1672], headTop: [425, 15], face: [440, 205], neck: [455, 300], shoulderY: 330, waistY: 575, hemY: 880, kneeY: 1090, pivot: [470, 1640], centerX: 450 },
      /* 髪＝青（顔と胸の青いキャミソールは y と顔の楕円で外す）／ゆれる布＝白い上着のすそ（青みの白・肌は色相で外す） */
      hair: { hue: [200, 240], sat: [0.3, 1], val: [0.18, 0.95], y1: 322, noFace: [440, 205, 74, 90] },
      cloth: { hue: [190, 260], sat: [0.02, 0.2], val: [0.7, 1], y0: 560, y1: 900 },
    },
    chika: {
      name: "チカ", ruby: "Chika", color: "#8a5ce0", el: "dark", img: "chika.webp", bg: "park.webp",
      intro: "展望テラスで、白いドレスのすそをつまむチカ。",
      rig: { size: [941, 1672], headTop: [510, 22], face: [530, 208], neck: [533, 295], shoulderY: 330, waistY: 580, hemY: 1450, kneeY: 1080, pivot: [520, 1630], centerX: 520 },
      /* 髪＝黒〜紺（白いドレスは明るさで外す・長い髪の範囲だけ）／スカート＝白〜うす紫のドレス（肌は色相で外す） */
      hair: { sat: [0, 0.8], val: [0, 0.62], boxes: [[110, 0, 480, 880], [380, 0, 680, 300], [600, 280, 790, 840]], noFace: [530, 208, 72, 90] },
      cloth: { hue: [200, 290], sat: [0.03, 0.4], val: [0.62, 1], y0: 600, y1: 1500 },
    },
    hisako: {
      name: "ヒサコ", ruby: "Hisako", color: "#38a6ff", el: "water", img: "hisako.webp", bg: "park.webp",
      intro: "放課後の展望テラスで、ピースをくれるヒサコ。",
      rig: { size: [940, 1672], headTop: [470, 20], face: [452, 282], neck: [452, 385], shoulderY: 440, waistY: 695, hemY: 950, kneeY: 1190, pivot: [560, 1645], centerX: 500 },
      /* 髪＝茶色（目と顔の中は除く・靴は y で除く）／スカート＝濃い緑（スカーフの先も少しゆれる） */
      hair: { hue: [8, 42], sat: [0.26, 1], val: [0.18, 0.84], y1: 1010, noFace: [450, 284, 96, 114] },
      cloth: { hue: [110, 205], sat: [0.1, 1], val: [0, 0.56], y0: 690, y1: 1000 },
    },
    alice: {
      name: "アリス", ruby: "Alice", color: "#7a5cff", el: "dark", img: "alice.webp", bg: "park.webp",
      intro: "木もれ日の展望テラスで、はにかむアリス。",
      rig: { size: [941, 1672], headTop: [370, 20], face: [412, 235], neck: [468, 320], shoulderY: 335, waistY: 605, hemY: 850, kneeY: 1130, pivot: [572, 1650], centerX: 470 },
      /* 髪＝黒〜灰色（紺の制服は彩度で外す・白いシャツは明るさで外す・左の長い髪と、右肩のうしろの髪の範囲だけ） */
      hair: { sat: [0, 0.27], val: [0, 0.86], boxes: [[212, 0, 462, 745], [450, 30, 585, 350]], noFace: [412, 236, 74, 92] },
      cloth: { hue: [195, 255], sat: [0.16, 1], val: [0, 0.64], y0: 595, y1: 905 },
    },
  };
  const src = (f) => DIR + f + "?v=" + VER;
  const RM = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches || document.body.classList.contains("xos-nomotion"); } catch (e) { return false; } };
  function store() { try { return JSON.parse(localStorage.getItem("xeva_mate_v1") || "{}") || {}; } catch (e) { return {}; } }

  /* ══ 開放（完凸） ══ */
  function awkOf(id) {
    let mb = {}, xg = {};
    try { mb = (JSON.parse(localStorage.getItem("magiburst_v1") || "null") || {}).chars || {}; } catch (e) {}
    try { xg = JSON.parse(localStorage.getItem("xeva_gacha_v1") || "null") || {}; } catch (e) {}
    const m = mb[id], xo = !!((xg.owned || {})[id]), xd = ((xg.dupes || {})[id]) | 0;
    return { own: !!m || xo, awk: Math.min(4, Math.max(m ? (m.awk | 0) : 0, xo ? xd : 0)) };
  }
  function unlocked(id) { return !!DEFS[id] && awkOf(id).awk >= 4; }

  function smooth(e0, e1, x) { let t = (x - e0) / (e1 - e0); t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }
  function hsv(r, g, b) {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let h = 0;
    if (d > 0) { h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
    return [h, mx ? d / mx : 0, mx / 255];
  }
  const inR = (v, r) => !r || (v >= r[0] && v <= r[1]);

  function Lobby(stage, id) {
    this.stage = stage; this.id = id; this.def = DEFS[id]; this.rig = this.def.rig; this.lobby = true;
    this.t = Math.random() * 10; this.seed = Math.random() * 100;
    this.view = store().view || "normal"; this.frame = null; this.running = false;
    this.hop = { y: 0, v: 0 }; this.jolt = { x: 0, v: 0 };
  }

  Lobby.prototype.load = async function () {
    const img = (u) => new Promise((ok, ng) => { const i = new Image(); i.decoding = "async"; i.onload = () => ok(i); i.onerror = ng; i.src = u; });
    const base = await img(src(this.def.img));
    const W = base.naturalWidth, H = base.naturalHeight;
    this.W = W; this.H = H;
    const bc = document.createElement("canvas"); bc.width = W; bc.height = H;
    const bx = bc.getContext("2d", { willReadFrequently: true }); bx.drawImage(base, 0, 0);
    this.baseCv = bc; this.px = bx.getImageData(0, 0, W, H).data;
    this.buildMesh();
    this.px = null;     /* 重みを決めたら画素はもう使わない（タップの当たりは alpha だけ残す） */
  };

  /* 色で髪・スカートを見分ける（4×4 の点の割合） */
  Lobby.prototype.labelAt = function (x, y) {
    const D = this.px, W = this.W, H = this.H, hr = this.def.hair, cr = this.def.cloth;
    let hairN = 0, clothN = 0, n = 0;
    for (let j = -3; j <= 3; j += 2) for (let i = -3; i <= 3; i += 2) {
      const xx = Math.max(0, Math.min(W - 1, Math.round(x + i))), yy = Math.max(0, Math.min(H - 1, Math.round(y + j)));
      const k = (yy * W + xx) * 4; if (D[k + 3] < 40) continue;
      n++;
      const [h, s, v] = hsv(D[k], D[k + 1], D[k + 2]);
      let isHair = inR(s, hr.sat) && inR(v, hr.val) && (!hr.hue || inR(h, hr.hue)) && (hr.y1 == null || yy < hr.y1);
      if (isHair && hr.boxes) isHair = hr.boxes.some((b) => xx >= b[0] && xx <= b[2] && yy >= b[1] && yy <= b[3]);
      if (isHair && hr.noFace) { const f = hr.noFace, q = ((xx - f[0]) / f[2]) ** 2 + ((yy - f[1]) / f[3]) ** 2; if (q < 1) isHair = false; }
      if (isHair) hairN++;
      if (inR(h, cr.hue) && inR(s, cr.sat) && inR(v, cr.val) && yy >= cr.y0 && yy <= cr.y1) clothN++;
    }
    return n ? [hairN / n, clothN / n] : [0, 0];
  };

  Lobby.prototype.buildMesh = function () {
    const W = this.W, H = this.H, S = 8, A = this.px, r = this.rig;
    const cols = Math.ceil(W / S), rows = Math.ceil(H / S);
    const idx = new Int32Array((cols + 1) * (rows + 1)).fill(-1);
    const rest = [], tris = [];
    const V = (i, j) => { const k = j * (cols + 1) + i; if (idx[k] < 0) { idx[k] = rest.length / 2; rest.push(Math.min(i * S, W), Math.min(j * S, H)); } return idx[k]; };
    for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
      let any = false;
      for (let y = cy * S - 1; y <= cy * S + S && !any; y += 2) for (let x = cx * S - 1; x <= cx * S + S; x += 2) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue; if (A[(y * W + x) * 4 + 3] > 4) { any = true; break; }
      }
      if (!any) continue;
      const a = V(cx, cy), b = V(cx + 1, cy), c = V(cx + 1, cy + 1), d = V(cx, cy + 1);
      tris.push(a, b, c, a, c, d);
    }
    const n = rest.length / 2;
    this.rest = new Float32Array(rest); this.pos = new Float32Array(rest.length);
    this.uv = new Float32Array(rest.length); this.tris = n > 65535 ? new Uint32Array(tris) : new Uint16Array(tris);
    const hair = new Float32Array(n), cloth = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = rest[i * 2], y = rest[i * 2 + 1];
      this.uv[i * 2] = x / W; this.uv[i * 2 + 1] = y / H;
      const [h, c] = this.labelAt(x, y); hair[i] = h; cloth[i] = c;
    }
    /* となりと平均を何回か取って、境目をなだらかに（髪・スカートだけが動いて三角形がのびるのを防ぐ） */
    const nb = new Array(n);
    for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
      const k = idx[j * (cols + 1) + i]; if (k < 0) continue;
      const list = [];
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ii = i + di, jj = j + dj;
        if (ii < 0 || jj < 0 || ii > cols || jj > rows) continue;
        const kk = idx[jj * (cols + 1) + ii]; if (kk >= 0) list.push(kk);
      }
      nb[k] = list;
    }
    const relax = (arr, passes) => {
      let cur = arr, nxt = new Float32Array(n);
      for (let p = 0; p < passes; p++) {
        for (let i = 0; i < n; i++) {
          const L = nb[i]; if (!L || !L.length) { nxt[i] = cur[i]; continue; }
          let sum = 0; for (let q = 0; q < L.length; q++) sum += cur[L[q]];
          nxt[i] = cur[i] * 0.5 + (sum / L.length) * 0.5;
        }
        const t = cur; cur = nxt; nxt = t;
      }
      return cur;
    };
    const hairS = relax(hair, 7), clothS = relax(cloth, 8);
    this.w = new Array(n);
    for (let i = 0; i < n; i++) {
      const x = rest[i * 2], y = rest[i * 2 + 1];
      const fall = smooth(r.neck[1] - 80, r.neck[1] + 300, y);
      this.w[i] = {
        head: smooth(r.neck[1] + 40, r.neck[1] - 34, y),
        torso: smooth(r.waistY, r.shoulderY, y),
        hip: smooth(r.pivot[1], r.waistY, y),
        hair: Math.min(1, hairS[i] * 1.25) * (0.25 + 0.75 * fall),
        cloth: Math.min(1, clothS[i] * 1.3) * smooth(r.waistY - 20, r.hemY + 10, y),
      };
    }
    /* タップの当たり（16px ごとの alpha） */
    const gw = Math.ceil(W / 16), gh = Math.ceil(H / 16), hitMap = new Uint8Array(gw * gh);
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) { const x = Math.min(W - 1, i * 16 + 8), y = Math.min(H - 1, j * 16 + 8); hitMap[j * gw + i] = A[(y * W + x) * 4 + 3] > 40 ? 1 : 0; }
    this.hitMap = hitMap; this.hitW = gw; this.hitH = gh;
    this.vcount = n;
  };

  /* 1点の変形（画素の座標・上が0） */
  Lobby.prototype.deform = function (x, y, w, o) {
    const r = this.rig;
    let qx = x, qy = y;
    qy -= o.breath * w.torso;
    qy += this.hop.y * w.hip;
    if (w.head > 0) {
      const ang = (o.tilt + this.jolt.x) * w.head * Math.PI / 180;
      const nx = r.neck[0], ny = r.neck[1] - o.breath + this.hop.y;
      const dx = qx - nx, dy = qy - ny, cs = Math.cos(ang), sn = Math.sin(ang);
      qx = nx + dx * cs - dy * sn; qy = ny + dx * sn + dy * cs;
    }
    qx += o.hairX * w.hair; qy += Math.abs(o.hairX) * 0.15 * w.hair;
    qx += o.clothX * w.cloth; qy += Math.abs(o.clothX) * 0.1 * w.cloth;
    qx += o.hipX * w.hip;
    if (o.lean) {
      const la = o.lean * Math.PI / 180, dx = qx - r.pivot[0], dy = qy - r.pivot[1], cs = Math.cos(la), sn = Math.sin(la);
      qx = r.pivot[0] + dx * cs - dy * sn; qy = r.pivot[1] + dx * sn + dy * cs;
    }
    return [qx, qy];
  };

  Lobby.prototype.update = function (dt) {
    const t = (this.t += dt), amp = RM() ? 0.45 : 1, sd = this.seed;
    const breath = (1 - Math.cos(t * 2 * Math.PI / 4.4)) * 0.5;
    /* タップ：小さくはずむ（ばね） */
    this.hop.v += (-this.hop.y * 60 - this.hop.v * 7) * dt; this.hop.y += this.hop.v * dt;
    this.jolt.v += (-this.jolt.x * 50 - this.jolt.v * 6.5) * dt; this.jolt.x += this.jolt.v * dt;
    const o = {
      breath: breath * 3.6 * amp,
      tilt: (0.8 * Math.sin(t * 0.52 + sd) + 0.3 * Math.sin(t * 1.21)) * amp,
      hairX: (7 * Math.sin(t * 0.74 + sd) + 2.8 * Math.sin(t * 1.73 + 1)) * amp,
      clothX: (3 * Math.sin(t * 0.9 + 2) + 1.2 * Math.sin(t * 2.1)) * amp,
      hipX: (2.2 * Math.sin(t * 0.33 + sd)) * amp,
      lean: (0.25 * Math.sin(t * 0.41 + sd)) * amp,
    };
    const R = this.rest, Q = this.pos;
    for (let i = 0; i < this.vcount; i++) {
      const q = this.deform(R[i * 2], R[i * 2 + 1], this.w[i], o);
      Q[i * 2] = q[0]; Q[i * 2 + 1] = q[1];
    }
  };

  Lobby.prototype.initGL = function (canvas) {
    const opt = { alpha: true, premultipliedAlpha: true, antialias: true, preserveDrawingBuffer: false };
    let gl = canvas.getContext("webgl2", opt), v2 = !!gl;
    if (!gl) gl = canvas.getContext("webgl", opt) || canvas.getContext("experimental-webgl", opt);
    if (!gl) return false;
    this.gl = gl; this.gl2 = v2;
    const vs = "attribute vec2 p;attribute vec2 u;uniform vec2 s;uniform vec2 o;varying vec2 vu;void main(){vu=u;gl_Position=vec4(p*s+o,0.,1.);}";
    const fs = "precision mediump float;varying vec2 vu;uniform sampler2D t;void main(){gl_FragColor=texture2D(t,vu);}";
    const sh = (type, s) => { const x = gl.createShader(type); gl.shaderSource(x, s); gl.compileShader(x); return x; };
    const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return false;
    gl.useProgram(pr);
    this.loc = { p: gl.getAttribLocation(pr, "p"), u: gl.getAttribLocation(pr, "u"), s: gl.getUniformLocation(pr, "s"), o: gl.getUniformLocation(pr, "o") };
    if (this.tris instanceof Uint32Array && !v2 && !gl.getExtension("OES_element_index_uint")) return false;
    this.bPos = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.bPos); gl.bufferData(gl.ARRAY_BUFFER, this.rest, gl.DYNAMIC_DRAW);
    this.bUv = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.bUv); gl.bufferData(gl.ARRAY_BUFFER, this.uv, gl.STATIC_DRAW);
    this.bIdx = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bIdx); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.tris, gl.STATIC_DRAW);
    this.tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.baseCv);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    if (v2) { gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); }
    else gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    return true;
  };

  /* どこからどこまでを、舞台のどこに映すか（パートナーと同じ決め方：頭〜膝（標準）／腰（アップ）／足もと（全身）） */
  Lobby.prototype.layout = function () {
    if (!this.rig || this.dead || !this.W) return;
    const st = this.stage.getBoundingClientRect();
    if (!st.width || !st.height) return;
    const top = document.querySelector(".xh-top"), bar = document.querySelector(".xh-bar");
    const prof = document.querySelector("#xhLobby .xh-prof");
    const padT = prof && prof.offsetParent ? Math.max(0, prof.getBoundingClientRect().bottom - st.top) + 4
                                           : (top ? Math.max(0, top.getBoundingClientRect().bottom - st.top) : 60) + 8;
    const padB = bar ? Math.max(0, st.bottom - bar.getBoundingClientRect().top) : 70;
    const r = this.rig, v = this.view;
    const y0 = r.headTop[1] - 20;
    const y1 = v === "up" ? r.hemY + 30 : v === "full" ? r.pivot[1] + 14 : r.kneeY + 60;
    const avail = Math.max(160, st.height - padT - (v === "full" ? padB + 8 : padB * 0.5));
    const s = avail / (y1 - y0);
    const cx = r.centerX != null ? r.centerX : r.pivot[0];
    this.frameTo = { s, ox: st.width / 2 - cx * s, oy: padT - y0 * s, w: st.width, h: st.height };
    if (!this.frame) this.frame = Object.assign({}, this.frameTo);
  };

  Lobby.prototype.draw = function (dt) {
    const gl = this.gl, cv = this.canvas;
    const dpr = Math.min(2.5, window.devicePixelRatio || 1);
    const W = cv.clientWidth, H = cv.clientHeight;
    const cw = Math.round(W * dpr), ch = Math.round(H * dpr);
    if (!cw || !ch) return;
    if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; this.layout(); }
    const F = this.frame, T = this.frameTo, k = 1 - Math.exp(-dt * 6);
    F.s += (T.s - F.s) * k; F.ox += (T.ox - F.ox) * k; F.oy += (T.oy - F.oy) * k;
    gl.viewport(0, 0, cw, ch);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(this.loc.s, (2 * F.s) / W, (-2 * F.s) / H);
    gl.uniform2f(this.loc.o, (2 * F.ox) / W - 1, 1 - (2 * F.oy) / H);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bPos); gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.pos);
    gl.enableVertexAttribArray(this.loc.p); gl.vertexAttribPointer(this.loc.p, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bUv);
    gl.enableVertexAttribArray(this.loc.u); gl.vertexAttribPointer(this.loc.u, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bIdx);
    gl.drawElements(gl.TRIANGLES, this.tris.length, this.tris instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, 0);
    this.frames = (this.frames || 0) + 1;
  };

  Lobby.prototype.hitAt = function (clientX, clientY) {
    const b = this.stage.getBoundingClientRect(), F = this.frame;
    if (!F || !this.hitMap) return false;
    const px = (clientX - b.left - F.ox) / F.s, py = (clientY - b.top - F.oy) / F.s;
    const i = Math.floor(px / 16), j = Math.floor(py / 16);
    if (i < 0 || j < 0 || i >= this.hitW || j >= this.hitH) return false;
    return !!this.hitMap[j * this.hitW + i];
  };

  Lobby.prototype.mount = async function (picked) {
    const st = this.stage, m = this.def;
    st.dataset.mate = "lb-" + this.id;
    const layer = document.createElement("div");
    layer.className = "hm-layer hm-lobby"; layer.dataset.mate = "lb-" + this.id;
    layer.innerHTML = '<div class="hm-bg" style="background-image:url(' + src(m.bg) + ')"></div><canvas class="hm-cv" aria-label="' + m.name + '"></canvas>';
    st.appendChild(layer);
    this.layer = layer;
    this.canvas = layer.querySelector(".hm-cv");
    for (let i = 0; ; i++) {
      try { await this.load(); break; } catch (e) {
        console.warn("[home-lobby] load", e);
        if (this.dead) return false;
        if (i >= 3) { layer.classList.add("in"); this.still(); return false; }
        await new Promise((ok) => setTimeout(ok, 1200 * (i + 1)));
      }
    }
    if (this.dead) return false;
    if (!this.initGL(this.canvas)) { layer.classList.add("in"); this.still(); return false; }
    this.canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); this.running = false; this.lost = true; try { window.HomeMate && HomeMate.revive && HomeMate.revive(this); } catch (e2) {} });
    this.onTap = (e) => {
      if (e.target.closest && e.target.closest("button,a,input,.xh-prof,.xh-offline")) return;
      if (!this.hitAt(e.clientX, e.clientY)) return;
      this.hop.v -= 70; this.jolt.v += (Math.random() < 0.5 ? -1 : 1) * 9;
    };
    this.tapEl = document.getElementById("xhLobby") || this.canvas;
    this.tapEl.addEventListener("click", this.onTap);
    this.onResize = () => this.layout();
    window.addEventListener("resize", this.onResize);
    this.layout();
    if (this.frameTo) this.frame = Object.assign({}, this.frameTo);
    requestAnimationFrame(() => layer.classList.add("in"));
    setTimeout(() => { if (!this.dead) layer.classList.add("in"); }, 700);
    this.kick();
    if (picked && picked !== "quiet") setTimeout(() => this.entrance(), 160);
    this.ready = true;
    return true;
  };
  /* 選んだときに小さくはずむ（パートナーの登場の代わり） */
  Lobby.prototype.entrance = function () { this.hop.v -= 110; if (this.canvas) { this.canvas.classList.remove("hm-in-wave"); void this.canvas.offsetWidth; this.canvas.classList.add("hm-in-wave"); } };
  Lobby.prototype.greet = function () {};
  Lobby.prototype.still = function () {
    if (!this.canvas || !this.canvas.parentNode) return;
    const im = document.createElement("img"); im.className = "hm-still"; im.src = src(this.def.img); im.alt = this.def.name;
    this.canvas.replaceWith(im);
  };
  Lobby.prototype.destroy = function () {
    this.dead = true; this.running = false;
    window.removeEventListener("resize", this.onResize);
    if (this.tapEl && this.onTap) this.tapEl.removeEventListener("click", this.onTap);
    try { const ext = this.gl && this.gl.getExtension("WEBGL_lose_context"); if (ext) ext.loseContext(); } catch (e) {}
    const L = this.layer; if (L) { L.classList.remove("in"); L.classList.add("out"); setTimeout(() => L.remove(), 450); }
  };
  Lobby.prototype.shouldRun = function () {
    if (document.hidden || !this.gl || this.dead) return false;
    const home = document.getElementById("xhome");
    if (home && !home.classList.contains("on")) return false;
    const gate = document.getElementById("xevaHome");
    if (gate && gate.classList.contains("open") && gate.getClientRects().length) return false;
    if (document.body.classList.contains("xl-drawer-open")) return false;
    return true;
  };
  Lobby.prototype.kick = function () {
    if (this.running || this.dead) return;
    this.running = true; this.last = performance.now();
    const loop = (now) => {
      if (this.dead) { this.running = false; return; }
      if (!this.shouldRun()) { this.last = now; setTimeout(() => requestAnimationFrame(loop), 400); return; }
      const dt = Math.min(1 / 30, Math.max(0.001, (now - this.last) / 1000)); this.last = now;
      if (!this.frameTo) this.layout();
      if (!this.frameTo) { requestAnimationFrame(loop); return; }
      try { this.update(dt); this.draw(dt); this.errs = 0; } catch (e) {
        this.errs = (this.errs || 0) + 1;
        if (this.errs === 1) console.warn("[home-lobby]", e);
        if (this.errs > 30) { this.running = false; try { window.HomeMate && HomeMate.revive && HomeMate.revive(this); } catch (e2) {} return; }
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  };

  window.HMLobby = {
    DEFS, unlocked, awkOf, src,
    create: (stage, id) => new Lobby(stage, id),
    ids: () => Object.keys(DEFS),
  };
})();
