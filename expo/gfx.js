/* ══════════════════════════════════════════════════════════════════
   XEVARION PARK — グラフィックの仕上げ（★★ 2026-09-29 ご指定「原神やゴーストオブツシマのように詳細で美しく。特に水・草・木・建物の反射」）
   ------------------------------------------------------------------
   ・霧：遠いほど＋低いほど濃く、太陽の方向は明るく暖かい（全部の材質の fog を置きかえる）＝空気の奥行き
   ・草：カメラのまわりに本物の草の葉（数万本・インスタンス）。風でそよぎ、自分が歩くとよける。芝生の所だけに生える（マスク）
   ・花びら（昼）・ほたる（夜）：カメラのまわりを舞う
   ・鏡（水面の映りこみ）：水面の高さで鏡に映したカメラから景色を描き、池・湖・水路・プール・海に映す（park.js の REFL）
   ・プローブ（建物の映りこみ）：自分のまわりの景色を立方体に描いて、ガラスや金属のビルに映す（夜はネオンが映る）
   ・画質：最高／高／標準／軽量（自動で下げ上げもする）
   ・描く順：鏡・プローブは「ふつうのカメラだけのもの（レイヤー 3）」を描かない（草・水・群衆・粒）＝軽い
   ══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const T = THREE;
  const MOBILE = matchMedia("(pointer:coarse)").matches || /iPhone|iPad|Android/.test(navigator.userAgent);

  /* ══════════════ 霧（空気の奥行き） ══════════════ */
  T.ShaderChunk.fog_pars_vertex = "#ifdef USE_FOG\n varying float vFogDepth;\n varying vec3 vFogWorld;\n#endif";
  T.ShaderChunk.fog_vertex = "#ifdef USE_FOG\n vFogDepth = - mvPosition.z;\n { mat3 fr3 = mat3(viewMatrix); vFogWorld = cameraPosition + vec3(dot(fr3[0], mvPosition.xyz), dot(fr3[1], mvPosition.xyz), dot(fr3[2], mvPosition.xyz)); }\n#endif";
  T.ShaderChunk.fog_pars_fragment = "#ifdef USE_FOG\n uniform vec3 fogColor;\n varying float vFogDepth;\n varying vec3 vFogWorld;\n #ifdef FOG_EXP2\n  uniform float fogDensity;\n #else\n  uniform float fogNear;\n  uniform float fogFar;\n #endif\n#endif";
  T.ShaderChunk.fog_fragment = [
    "#ifdef USE_FOG",
    " { vec3 fv = vFogWorld - cameraPosition; float fd = length(fv); vec3 fdir = fv / max(fd, 0.001);",
    " #ifdef FOG_EXP2",
    "  float fogFactor = 1.0 - exp( - fogDensity * fogDensity * fd * fd );",
    " #else",
    "  float fogFactor = smoothstep( fogNear, fogFar, fd );",
    " #endif",
    "  fogFactor *= mix(0.5, 1.0, exp(-max(vFogWorld.y, 0.0) * 0.006));",
    "  float sunA = pow(max(dot(fdir, vec3(0.3905, 0.8015, 0.5138)), 0.0), 5.0);",
    "  vec3 fcol = fogColor * (vec3(1.0) + sunA * vec3(0.38, 0.24, 0.06));",
    "  gl_FragColor.rgb = mix( gl_FragColor.rgb, fcol, fogFactor ); }",
    "#endif"
  ].join("\n");

  /* ══════════════ 画質 ══════════════ */
  const LEVELS = {
    ultra: { mirror: 0.5, mirrorEvery: 1, probe: 256, probeEvery: 2, grassN: 15000, grassF: 12000, grassM: 14000, petals: 1500, shadow: 4096, shadowR: 44, rays: 1, pr: 1.0 },
    high: { mirror: 0.38, mirrorEvery: 1, probe: 128, probeEvery: 3, grassN: 11000, grassF: 7000, grassM: 9000, petals: 1000, shadow: 2048, shadowR: 36, rays: 1, pr: 1.0 },
    medium: { mirror: 0, mirrorEvery: 1, probe: 0, probeEvery: 4, grassN: 6000, grassF: 2500, grassM: 3500, petals: 600, shadow: 2048, shadowR: 30, rays: 1, pr: 0.9 },
    low: { mirror: 0, mirrorEvery: 1, probe: 0, probeEvery: 4, grassN: 0, grassF: 0, grassM: 0, petals: 250, shadow: 1024, shadowR: 22, rays: 0, pr: 0.8 }
  };
  const ORDER = ["low", "medium", "high", "ultra"];
  function detectLevel(renderer) {
    if (MOBILE) return "low";
    try {
      const gl = renderer.getContext(), ext = gl.getExtension("WEBGL_debug_renderer_info"), name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "";
      if (/SwiftShader|llvmpipe|Basic Render/i.test(name)) return "low";
      if (/Intel|Iris|UHD|HD Graphics|Mali|Adreno|PowerVR/i.test(name)) return "high";
      return "ultra";
    } catch (e) { return "high"; }
  }

  /* 草のマスクの範囲（島全体・★★ 2026-09-30c 北へ広げた島）。マスクの絵と草のシェーダーの両方がこれを使う */
  const GB = { x0: XPark.BOUNDS.x0, z0: XPark.BOUNDS.z0, w: XPark.BOUNDS.w, h: XPark.BOUNDS.h };          /* ★★ 2026-10-01 島の範囲（park.js の BOUNDS） */
  /* ══════════════ 草（カメラのまわりの本物の葉） ══════════════ */
  function bladeGeo(nBlades, widthK, L) {
    const pos = [], hh = [], rnd = [], idx = [], nor = [];
    let base = 0;
    for (let b = 0; b < nBlades; b++) {
      const a = b / nBlades * Math.PI * 2 + b * 1.7, off = b ? 0.07 + 0.13 * ((b * 7) % 3) / 2 : 0, ox = Math.cos(a) * off, oz = Math.sin(a) * off;
      const rot = a + 0.9, c = Math.cos(rot), s = Math.sin(rot), w0 = (0.011 + 0.005 * (b % 3)) * widthK, curve = 0.1 + 0.08 * (b % 2), lr = b / nBlades;
      for (let i = 0; i <= L; i++) {
        const y = i / L * (0.75 + 0.25 * ((b * 5) % 4) / 3), w = i === L ? 0 : w0 * Math.pow(1 - i / L, 0.8) + 0.002, bend = curve * y * y;
        const pts = i === L ? [[0, y, bend]] : [[-w, y, bend], [w, y, bend]];
        pts.forEach(([px, py, pz]) => { pos.push(ox + px * c + pz * s, py, oz - px * s + pz * c); hh.push(y); rnd.push(lr); nor.push(s * 0.35, 1, c * 0.35); });
      }
      for (let i = 0; i < L - 1; i++) { const k = base + i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
      { const k = base + (L - 1) * 2; idx.push(k, k + 1, k + 2); }
      base += L * 2 + 1;
    }
    const g = new T.InstancedBufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new T.Float32BufferAttribute(nor, 3));
    g.setAttribute("aH", new T.Float32BufferAttribute(hh, 1)); g.setAttribute("aB", new T.Float32BufferAttribute(rnd, 1)); g.setIndex(idx);
    return g;
  }
  function Grass(world, maxN, S, far, nBlades, widthK, tag, L) {
    this.w = world; this.S = S; this.far = far;
    const g = bladeGeo(nBlades, widthK, L || 3), off = new Float32Array(maxN * 3), rn = new Float32Array(maxN * 4);
    for (let i = 0; i < maxN; i++) { off[i * 3] = Math.random() * S; off[i * 3 + 1] = Math.random() * S; off[i * 3 + 2] = Math.random() * Math.PI * 2; rn[i * 4] = Math.random(); rn[i * 4 + 1] = Math.random(); rn[i * 4 + 2] = Math.random(); rn[i * 4 + 3] = Math.random(); }
    g.setAttribute("aOff", new T.InstancedBufferAttribute(off, 3)); g.setAttribute("aRnd", new T.InstancedBufferAttribute(rn, 4));
    g.instanceCount = maxN; g.boundingSphere = new T.Sphere(new T.Vector3(), 1e7);
    this.U = { uCam: { value: new T.Vector3() }, uPlayer: { value: new T.Vector3(0, -99, 0) }, uS: { value: S }, uFar: { value: far }, uMask: { value: null }, uMaskB: { value: new T.Vector4(GB.x0, GB.z0, GB.w, GB.h) },          /* ★★ 2026-09-30c マスクの絵と同じ範囲（GB）＝前は別々に書いてあり、ずれると道の上に草が生えた */ uTrans: { value: 1 }, uNightG: { value: 0 }, uCut: { value: tag === "far" ? 10.5 : tag === "mid" ? 33 : 0 }, uEdge: { value: tag === "far" ? 0.5 : tag === "mid" ? 0.62 : 0.3 } };
    const U = this.U, AOU = XPark.AOU;
    const m = new T.MeshLambertMaterial({ color: 0xffffff, side: T.DoubleSide });
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U, { uTime: XPark.TIME, uShTex: AOU.uShTex, uGrassTex: AOU.uGrassTex, uAOmin: AOU.uAOmin, uAOsize: AOU.uAOsize });
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute vec3 aOff; attribute vec4 aRnd; attribute float aH, aB; uniform vec3 uCam, uPlayer; uniform float uS, uFar, uTime, uCut, uEdge; uniform sampler2D uMask; uniform vec4 uMaskB; varying float vH, vR, vFl; varying vec3 vGW;")
        .replace("#include <begin_vertex>", [
          "vec3 transformed;",
          "{ vec2 base = aOff.xy + uS * floor((uCam.xz - aOff.xy) / uS + 0.5);",
          "  vec4 mk = texture2D(uMask, (base - uMaskB.xy) / uMaskB.zw);",
          "  float d = length(base - uCam.xz), fade = 1.0 - smoothstep(uFar * 0.6, uFar, d);",
          "  float keep = step(aRnd.z, (mk.r - uEdge) / (1.0 - uEdge) * 1.05) * fade * step(uCut, d);",          /* ★★ 2026-10-01 遠くの太い株は、ふち（道・穴）から離れた所だけ */
          "  float h = (0.11 + 0.2 * aRnd.x * aRnd.x + 0.06 * step(0.94, aRnd.y)) * (0.6 + 0.65 * mk.g) * keep;",
          "  vec3 p = position; p.y *= h; p.xz *= 1.0 + 1.2 * smoothstep(6.0, uFar, d);",
          "  float c = cos(aOff.z), s = sin(aOff.z); p.xz = vec2(c * p.x - s * p.z, s * p.x + c * p.z);",
          "  float wph = uTime * 1.6 + base.x * 0.23 + base.y * 0.19;",
          "  vec2 wind = vec2(sin(wph) * 0.55 + sin(wph * 2.7 + base.y * 0.5) * 0.2 + 0.3, cos(wph * 0.8 + base.x * 0.31) * 0.35) * 0.2;",
          "  vec2 pd = base - uPlayer.xz; float pl = length(pd); vec2 push = pl < 1.2 ? pd / max(pl, 0.05) * (1.2 - pl) * 0.9 : vec2(0.0);",
          "  float bend = aH * aH; p.xz += (wind * 0.8 + push) * bend * max(h, 0.15) * 1.4; p.y -= length(push) * bend * h * 0.5;",
          "  transformed = vec3(base.x + p.x, p.y - 0.01, base.y + p.z);",
          "  vH = aH; vR = aRnd.y; vFl = (aRnd.w > 0.985 && aB < 0.01) ? 1.0 : 0.0; vGW = transformed; }"
        ].join("\n"));
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform sampler2D uShTex, uGrassTex; uniform vec2 uAOmin, uAOsize; uniform float uTrans, uNightG; varying float vH, vR, vFl; varying vec3 vGW;")
        .replace("#include <color_fragment>", [
          "#include <color_fragment>",
          "{ vec2 q = (vGW.xz - uAOmin) / uAOsize; vec3 tint = texture2D(uGrassTex, q).rgb * 1.25; float shd = mix(0.55, 1.0, texture2D(uShTex, q).r);",
          /* ★★ 2026-09-30d 根もとを明るく（前は根もとが暗く、芝生の上に黒いひっかき傷のように見えた） */
          "  vec3 gb = vec3(0.3, 0.58, 0.13), gt = mix(vec3(0.6, 0.87, 0.26), vec3(0.78, 0.9, 0.34), vR);",
          "  vec3 gc = mix(gb, gt, smoothstep(0.0, 1.0, vH)) * (0.9 + 0.2 * vR) * tint;",
          "  if (vFl > 0.5 && vH > 0.8) gc = mix(vec3(1.0, 0.95, 0.9), mix(vec3(1.0, 0.55, 0.75), vec3(1.0, 0.85, 0.3), step(0.5, vR)), step(0.33, vR));",
          "  diffuseColor.rgb = gc * mix(0.88, 1.0, vH) * mix(0.7, 1.0, shd); }"
        ].join("\n"))
        .replace("#include <opaque_fragment>", "{ vec3 V = normalize(vGW - cameraPosition); float back = pow(max(dot(V, vec3(0.3905, 0.8015, 0.5138)), 0.0), 3.0); outgoingLight += diffuseColor.rgb * back * vH * 0.9 * uTrans; }\n#include <opaque_fragment>");
    };
    m.customProgramCacheKey = () => "grass2";
    this.mat = m;
    this.mesh = new T.Mesh(g, m); this.mesh.frustumCulled = false; this.mesh.receiveShadow = true; this.mesh.castShadow = false; this.mesh.layers.set(3);
    this.mesh.name = "grass-" + tag;
    this.max = maxN; this.geo = g;
    world.scene.add(this.mesh);
  }
  Grass.prototype.setCount = function (n) { this.geo.instanceCount = Math.max(0, Math.min(this.max, n | 0)); this.mesh.visible = n > 0; };
  /* 草の生える所のマスク：島の中の芝生（道・広場・建物・水・砂・競技場は除く）。R＝濃さ・G＝背の高さ */
  function grassMask(w) {
    const N = 2048, B = GB, c = XTex.cv(N, N), g = c.getContext("2d");
    const P = (x, z) => [(x - B.x0) / B.w * N, (z - B.z0) / B.h * N], S = N / B.w;
    g.fillStyle = "#000"; g.fillRect(0, 0, N, N);
    g.fillStyle = "rgb(255,190,0)"; g.beginPath(); for (let i = 0; i <= 360; i++) { const [x, z] = XPark.islandPt(i / 360 * Math.PI * 2, 0.97); const [a, b] = P(x, z); if (i) g.lineTo(a, b); else g.moveTo(a, b); } g.fill();
    /* 木の下は背が低く少なめ */
    g.fillStyle = "rgba(170,90,0,.5)"; (w.trees || []).forEach(([k, x, z, s]) => { if (k === "flower" || k === "bush") return; const [a, b] = P(x, z); g.beginPath(); g.arc(a, b, 2.2 * (s || 1) * S, 0, 7); g.fill(); });
    g.fillStyle = "#000"; g.strokeStyle = "#000"; g.lineCap = "round"; g.lineJoin = "round";
    (w.paved || []).forEach((q) => { const [a, b] = P(q[0] - 0.6, q[1] - 0.6), [c2, d] = P(q[2] + 0.6, q[3] + 0.6); g.fillRect(a, b, c2 - a, d - b); });
    (w.roads || []).forEach((r) => { g.lineWidth = (r[4] + 2.6) * S; g.beginPath(); const [a, b] = P(r[0], r[1]), [c2, d] = P(r[2], r[3]); g.moveTo(a, b); g.lineTo(c2, d); g.stroke(); });
    (w.rivers || []).forEach((rv) => { g.lineWidth = (rv.w + 2.5) * S; g.beginPath(); rv.pts.forEach(([x, z], i) => { const [a, b] = P(x, z); if (i) g.lineTo(a, b); else g.moveTo(a, b); }); g.stroke(); });
    (w.casters || []).forEach((cs) => { g.beginPath(); cs.pts.forEach(([x, z], i) => { const [a, b] = P(x, z); if (i) g.lineTo(a, b); else g.moveTo(a, b); }); g.closePath(); g.fill(); g.lineWidth = 1.2 * S; g.stroke(); });
    (w.colliders || []).forEach((q) => {
      if (!q.t) { const [a, b] = P(q.x0 - 0.3, q.z0 - 0.3), [c2, d] = P(q.x1 + 0.3, q.z1 + 0.3); g.fillRect(a, b, c2 - a, d - b); return; }
      if (q.t === "c") { const [a, b] = P(q.x, q.z); g.beginPath(); g.arc(a, b, (q.r + 0.3) * S, 0, 7); g.fill(); }
      else if (q.t === "ring") { const [a, b] = P(q.x, q.z); g.lineWidth = (q.r1 - q.r0 + 0.6) * S; g.beginPath(); g.arc(a, b, (q.r0 + q.r1) / 2 * S, 0, 7); g.stroke(); }
      else if (q.t === "seg") { g.lineWidth = (q.r * 2 + 0.6) * S; g.beginPath(); const [a, b] = P(q.ax, q.az), [c2, d] = P(q.bx, q.bz); g.moveTo(a, b); g.lineTo(c2, d); g.stroke(); }
      else if (q.t === "obb") { g.beginPath(); [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([u, v], i) => { const aa = u * (q.hw + 0.3), bb = v * (q.hd + 0.3), [a, b] = P(q.x + aa * q.c + bb * q.s, q.z - aa * q.s + bb * q.c); if (i) g.lineTo(a, b); else g.moveTo(a, b); }); g.closePath(); g.fill(); }
      else if (q.t === "ell") { const [a, b] = P(q.x, q.z); g.beginPath(); g.ellipse(a, b, q.rx1 * S, q.rz1 * S, 0, 0, 7); g.fill(); }
    });
    /* 屋内・競技場・サーキット・ビーチ */
    (w.zones || []).forEach((zn) => { if (zn.light && zn.light !== "outdoor") { const [a, b] = P(zn.x0, zn.z0), [c2, d] = P(zn.x1, zn.z1); g.fillRect(a, b, c2 - a, d - b); } });
    ["sports", "beach", "soccer", "boccia"].forEach((id) => { const A = XPark.A[id]; if (!A) return; const [a, b] = P(A.x0, A.z0), [c2, d] = P(A.x1, A.z1); g.fillStyle = id === "sports" ? "rgba(0,0,0,.75)" : "#000"; g.fillRect(a, b, c2 - a, d - b); g.fillStyle = "#000"; });
    if (w.circuit) { g.lineWidth = (w.circuit.W + 14) * S; g.beginPath(); w.circuit.pts.forEach((p, i) => { const [a, b] = P(p.x, p.z); if (i) g.lineTo(a, b); else g.moveTo(a, b); }); g.closePath(); g.stroke(); }
    (w.noGrass || []).forEach((q) => { const [a, b] = P(q[0], q[1]), [c2, d] = P(q[2], q[3]); g.fillRect(a, b, c2 - a, d - b); });
    /* ★★ 2026-10-02 床の模様（丸い広場・楕円の広場・地面の床）はぜんぶ、少し大きめに型抜き（ご指定「地下鉄の入り口や床の模様に草が重なる」）。
       前は「舗装」の四角（丸い広場は内がわの 0.8〜0.9 倍の四角）だけだったので、丸の外がわに草が生えていた */
    g.fillStyle = "#000";
    (w.groundShapes || []).forEach((s) => {
      if (s.c) { const [a, b] = P(s.c[0], s.c[1]); g.beginPath(); g.arc(a, b, (s.c[2] + 1.0) * S, 0, 7); g.fill(); }
      else if (s.e) { const [a, b] = P(s.e[0], s.e[1]); g.beginPath(); g.ellipse(a, b, (s.e[2] + 1.0) * S, (s.e[3] + 1.0) * S, 0, 0, 7); g.fill(); }
      else if (s.r) { const [a, b] = P(s.r[0] - 0.9, s.r[1] - 0.9), [c2, d] = P(s.r[2] + 0.9, s.r[3] + 0.9); g.fillRect(a, b, c2 - a, d - b); }
    });
    (w.noGrassPoly || []).forEach((poly) => { g.beginPath(); poly.forEach(([x, z], i) => { const [a, b] = P(x, z); if (i) g.lineTo(a, b); else g.moveTo(a, b); }); g.closePath(); g.fill(); });
    const c2 = XTex.cv(N, N), g2 = c2.getContext("2d"); g2.filter = "blur(1px)"; g2.drawImage(c, 0, 0);
    const t = new T.CanvasTexture(c2); t.flipY = false; t.colorSpace = T.NoColorSpace; t.minFilter = T.LinearFilter; t.generateMipmaps = false; t.needsUpdate = true;
    return t;
  }

  /* ══════════════ 花びら（昼）・ほたる（夜） ══════════════ */
  function Petals(scene, max) {
    const pos = new Float32Array(max * 3), rnd = new Float32Array(max * 4);
    for (let i = 0; i < max; i++) { pos[i * 3] = Math.random() * 60; pos[i * 3 + 1] = Math.random() * 26; pos[i * 3 + 2] = Math.random() * 60; rnd[i * 4] = Math.random(); rnd[i * 4 + 1] = Math.random(); rnd[i * 4 + 2] = Math.random(); rnd[i * 4 + 3] = Math.random(); }
    const g = new T.BufferGeometry(); g.setAttribute("position", new T.BufferAttribute(pos, 3)); g.setAttribute("aR", new T.BufferAttribute(rnd, 4));
    g.boundingSphere = new T.Sphere(new T.Vector3(), 1e7);
    this.U = { uCam: { value: new T.Vector3() }, uT: XPark.TIME, uNight: { value: 0 }, uScale: { value: 400 }, uAmt: { value: 1 } };
    const m = new T.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: this.U,
      vertexShader: [
        "attribute vec4 aR; uniform vec3 uCam; uniform float uT, uNight, uScale, uAmt; varying float vA, vRot, vN; varying vec3 vC;",
        "void main(){",
        "  vec3 p = position; float t = uT;",
        "  vec3 day = vec3(p.x + sin(t * 0.7 + aR.x * 20.0) * 1.5 + t * 0.9, p.y - t * (0.55 + aR.y * 0.4), p.z + cos(t * 0.5 + aR.z * 20.0) * 1.5 + t * 0.4);",
        "  vec3 nig = vec3(p.x + sin(t * 0.3 + aR.x * 30.0) * 2.5, 0.4 + mod(p.y, 3.0) + sin(t * 0.8 + aR.w * 20.0) * 0.5, p.z + cos(t * 0.27 + aR.z * 30.0) * 2.5);",
        "  vec3 q = mix(day, nig, uNight);",
        "  vec3 box = vec3(60.0, 26.0, 60.0);",
        "  vec3 w = mod(q - uCam + box * 0.5, box) - box * 0.5 + uCam; w.y = mix(uCam.y - 6.0 + mod(q.y, 26.0), 0.3 + mod(q.y, 3.0), uNight);",
        "  vec4 mv = modelViewMatrix * vec4(w, 1.0); gl_Position = projectionMatrix * mv;",
        "  float keep = step(aR.w, uAmt);",
        "  gl_PointSize = keep * mix(0.26, 0.2, uNight) * uScale / max(0.5, -mv.z);",
        "  vA = keep * (1.0 - smoothstep(18.0, 30.0, length(w - uCam))); vRot = aR.x * 6.28 + uT * (1.0 + aR.y * 2.0); vN = uNight;",
        "  vC = mix(mix(vec3(1.0, 0.72, 0.84), vec3(1.0, 0.9, 0.95), aR.z), vec3(0.75, 1.0, 0.45) * (1.6 + 1.4 * sin(uT * 3.0 + aR.x * 40.0)), uNight);",
        "}"].join("\n"),
      fragmentShader: [
        "varying float vA, vRot, vN; varying vec3 vC;",
        "void main(){",
        "  vec2 p = gl_PointCoord - 0.5; float c = cos(vRot), s = sin(vRot); p = vec2(c * p.x - s * p.y, s * p.x + c * p.y);",
        "  float petal = 1.0 - smoothstep(0.35, 0.5, length(p * vec2(1.0, 2.1)));",
        "  float glow = pow(max(0.0, 1.0 - length(gl_PointCoord - 0.5) * 2.0), 2.0);",
        "  float a = mix(petal, glow, vN) * vA; if (a < 0.02) discard;",
        "  gl_FragColor = vec4(vC, a);",
        "  #include <tonemapping_fragment>",
        "  #include <colorspace_fragment>",
        "}"].join("\n") });
    this.pts = new T.Points(g, m); this.pts.frustumCulled = false; this.pts.layers.set(3); this.max = max;
    scene.add(this.pts);
  }

  /* ══════════════ 鏡（水面の映りこみ） ══════════════ */
  function Mirror(renderer) {
    this.r = renderer;
    this.rt = new T.WebGLRenderTarget(4, 4, { type: T.HalfFloatType });
    this.cam = new T.PerspectiveCamera(); this.cam.layers.set(0);
    this.h = 0.05; this.scale = 0.4; this.frame = 0;
    this.n = new T.Vector3(0, 1, 0); this.plane = new T.Plane(); this.clip = new T.Vector4(); this.q = new T.Vector4();
    this.rot = new T.Matrix4(); this.view = new T.Vector3(); this.look = new T.Vector3(); this.tgt = new T.Vector3(); this.cp = new T.Vector3(); this.pp = new T.Vector3(0, this.h, 0);
  }
  Mirror.prototype.setSize = function (w, h) { this.rt.setSize(Math.max(4, Math.round(w * this.scale)), Math.max(4, Math.round(h * this.scale))); };
  Mirror.prototype.render = function (scene, camera, sky, R) {
    const C = this.cam; this.pp.set(camera.position.x, this.h, camera.position.z);
    this.cp.setFromMatrixPosition(camera.matrixWorld);
    this.view.subVectors(this.pp, this.cp); if (this.view.dot(this.n) > 0) { R.uRefl.value = 0; return; }
    this.view.reflect(this.n).negate(); this.view.add(this.pp);
    this.rot.extractRotation(camera.matrixWorld);
    this.look.set(0, 0, -1).applyMatrix4(this.rot).add(this.cp);
    this.tgt.subVectors(this.pp, this.look); this.tgt.reflect(this.n).negate(); this.tgt.add(this.pp);
    C.position.copy(this.view); C.up.set(0, 1, 0).applyMatrix4(this.rot).reflect(this.n); C.lookAt(this.tgt);
    C.far = camera.far; C.near = camera.near; C.updateMatrixWorld(); C.projectionMatrix.copy(camera.projectionMatrix);
    R.uTexMat.value.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1).multiply(C.projectionMatrix).multiply(C.matrixWorldInverse);
    /* 水面より下を切る（斜めの近い面） */
    this.plane.setFromNormalAndCoplanarPoint(this.n, this.pp).applyMatrix4(C.matrixWorldInverse);
    this.clip.set(this.plane.normal.x, this.plane.normal.y, this.plane.normal.z, this.plane.constant);
    const pm = C.projectionMatrix.elements, q = this.q;
    q.x = (Math.sign(this.clip.x) + pm[8]) / pm[0]; q.y = (Math.sign(this.clip.y) + pm[9]) / pm[5]; q.z = -1.0; q.w = (1.0 + pm[10]) / pm[14];
    this.clip.multiplyScalar(2.0 / this.clip.dot(q));
    pm[2] = this.clip.x; pm[6] = this.clip.y; pm[10] = this.clip.z + 1.0 - 0.003; pm[14] = this.clip.w;
    C.projectionMatrixInverse.copy(C.projectionMatrix).invert();
    const sp = sky.position.x, sq = sky.position.y, sr = sky.position.z; sky.position.copy(C.position);
    const r = this.r, old = r.getRenderTarget();
    r.setRenderTarget(this.rt); r.clear(); r.render(scene, C);
    r.setRenderTarget(old); sky.position.set(sp, sq, sr);
    R.tRefl.value = this.rt.texture; R.uRefl.value = 1;
  };

  /* ══════════════ プローブ（まわりの景色の映りこみ） ══════════════ */
  function Probe(renderer, size) {
    this.r = renderer; this.size = size;
    const opt = { type: T.HalfFloatType, generateMipmaps: false };
    this.rts = [new T.WebGLCubeRenderTarget(size, opt), new T.WebGLCubeRenderTarget(size, opt)];
    this.cc = new T.CubeCamera(0.5, 1400, this.rts[0]);
    this.cc.children.forEach((c) => c.layers.set(0));
    this.face = 0; this.back = 1; this.frame = 0; this.pos = new T.Vector3(1e9, 0, 0); this.lastSwap = -99; this.ready = false;
  }
  Probe.prototype.update = function (scene, camera, sky, t, every) {
    this.frame++;
    if (this.face === 0) { if (camera.position.distanceTo(this.pos) < 10 && t - this.lastSwap < 4) return; this.pos.copy(camera.position); }
    if (this.frame % every) return;
    const r = this.r, cc = this.cc, rt = this.rts[this.back];
    if (cc.coordinateSystem !== r.coordinateSystem) { cc.coordinateSystem = r.coordinateSystem; cc.updateCoordinateSystem(); }
    cc.position.copy(this.pos); cc.updateMatrixWorld(true);
    const sp = sky.position.clone(); sky.position.copy(this.pos);
    const old = r.getRenderTarget();
    r.setRenderTarget(rt, this.face); r.clear(); r.render(scene, cc.children[this.face]);
    r.setRenderTarget(old); sky.position.copy(sp);
    this.face++;
    if (this.face >= 6) { this.face = 0; rt.texture.needsPMREMUpdate = true; this.envTex = rt.texture; this.back = 1 - this.back; this.lastSwap = t; this.ready = true; if (this.onSwap) this.onSwap(rt.texture); }
  };

  /* ══════════════ まとめ ══════════════ */
  const GFX = {
    level: "high", user: null, LEVELS, ORDER,
    init(o) {
      this.o = o; const w = o.world, r = o.renderer;
      this.level = this.user = (function () { try { const v = localStorage.getItem("xeva_park_quality"); return LEVELS[v] ? v : null; } catch (e) { return null; } })() || detectLevel(r);
      this.auto = (function () { try { return localStorage.getItem("xeva_park_quality_auto") !== "0"; } catch (e) { return true; } })();
      this.maxLevel = this.level;
      o.camera.layers.enable(3);
      r.shadowMap.autoUpdate = false; r.shadowMap.needsUpdate = true;
      /* 草・花びら（画質で本数を変える。最大の数だけ作っておく） */
      if (!MOBILE) {
        this.mask = grassMask(w);
        this.grassN = new Grass(w, LEVELS.ultra.grassN, 26, 12.5, 7, 1, "near", 3);
        this.grassF = new Grass(w, LEVELS.ultra.grassF, 80, 40, 3, 2.2, "far", 2);
        /* ★★ 2026-10-01 遠くの草（40〜115m・まばらで太い株）＝ご指定「草が遠いところで表示されていない」 */
        this.grassM = new Grass(w, LEVELS.ultra.grassM, 210, 115, 3, 3.6, "mid", 2);
        [this.grassN, this.grassF, this.grassM].forEach((gr) => { gr.U.uMask.value = this.mask; });
      }
      this.petals = new Petals(o.scene, LEVELS.ultra.petals);
      this.mirror = new Mirror(r);
      this.apply(this.level);
    },
    apply(level) {
      const L = LEVELS[level] || LEVELS.high, o = this.o; this.level = level; this.L = L;
      if (this.grassN) this.grassN.setCount(L.grassN);
      if (this.grassF) this.grassF.setCount(L.grassF);
      if (this.grassM) this.grassM.setCount(L.grassM || 0);
      if (this.petals) this.petals.U.uAmt.value = L.petals / this.petals.max;
      this.mirror.scale = L.mirror || 0.4; this.resize();
      if (!L.mirror) XPark.REFL.uRefl.value = 0;
      if (L.probe) { if (!this.probe || this.probe.size !== L.probe) { if (this.probe) this.probe.rts.forEach((t) => t.dispose()); this.probe = new Probe(o.renderer, L.probe); this.probe.onSwap = (tex) => { o.scene.environment = tex; }; } }
      else if (this.probe) { this.probe.rts.forEach((t) => t.dispose()); this.probe = null; if (window.XFX && XFX.envRT) o.scene.environment = XFX.envRT.texture; }
      const sun = o.sun; if (sun && sun.shadow.mapSize.x !== L.shadow) { sun.shadow.mapSize.set(L.shadow, L.shadow); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
      if (sun) { const sc = sun.shadow.camera, R = MOBILE ? Math.min(22, L.shadowR) : L.shadowR; sc.left = sc.bottom = -R; sc.right = sc.top = R; sc.updateProjectionMatrix(); }
      if (window.XFX && XFX.bloom) XFX.rays = L.rays;
      o.renderer.shadowMap.needsUpdate = true;
    },
    setUser(level, auto) {
      this.user = level; this.maxLevel = level; this.auto = auto !== false;
      try { localStorage.setItem("xeva_park_quality", level); localStorage.setItem("xeva_park_quality_auto", this.auto ? "1" : "0"); } catch (e) {}
      this.apply(level);
    },
    /* 自動：重いときは1段下げ、軽いときは（自分で選んだ段まで）1段上げる */
    step(fps) {
      if (!this.auto) return false;
      const i = ORDER.indexOf(this.level), mx = ORDER.indexOf(this.maxLevel);
      if (fps < 24 && i > 0) { this.apply(ORDER[i - 1]); return true; }
      if (fps > 55 && i < mx) { this.apply(ORDER[i + 1]); return true; }
      return false;
    },
    resize() { const o = this.o; if (!o) return; const s = o.renderer.getDrawingBufferSize(new T.Vector2()); this.mirror.setSize(s.x, s.y); },
    /* 毎フレーム：描く前に呼ぶ */
    before(scene, camera, t, player, sky, show) {
      const L = this.L, o = this.o;
      const low = camera.position.y < 90;
      [this.grassN, this.grassF, this.grassM].forEach((gr) => { if (!gr) return; gr.mesh.visible = low && gr.geo.instanceCount > 0; gr.U.uCam.value.copy(camera.position); if (player) gr.U.uPlayer.value.set(player.x, 0, player.z); });
      if (this.petals) { this.petals.pts.visible = low && L.petals > 0; this.petals.U.uCam.value.copy(camera.position); this.petals.U.uScale.value = o.renderer.getDrawingBufferSize(new T.Vector2()).y * 0.5; }
      const night = window.XFX ? XFX.cur.night : 0; if (this.petals) this.petals.U.uNight.value = night > 0.5 ? 1 : 0;
      if (this.grassN) { const tr = window.XFX ? (1 - XFX.cur.night * 0.85) : 1; this.grassN.U.uTrans.value = tr; if (this.grassF) this.grassF.U.uTrans.value = tr; if (this.grassM) this.grassM.U.uTrans.value = tr; }
      /* 鏡：水が見えそうなときだけ */
      if (L.mirror && show !== false && this.waterVisible(camera)) { this.mirror.frame++; if (this.mirror.frame % L.mirrorEvery === 0) this.mirror.render(scene, camera, sky, XPark.REFL); }
      else XPark.REFL.uRefl.value = 0;
      if (this.probe && show !== false) this.probe.update(scene, camera, sky, t, L.probeEvery);
    },
    _fr: new T.Frustum(), _pm: new T.Matrix4(), _sp: new T.Sphere(),
    waterVisible(camera) {
      const w = this.o.world;
      if (camera.position.y > 150) return false;                /* 空から見るときは映さない（重い・遠くて見えない） */
      if (w.coastDist && w.coastDist(camera.position.x, camera.position.z) < 900 && camera.position.y > 1) {
        /* 海：地平線の方を見ていれば見える */
        const d = new T.Vector3(); camera.getWorldDirection(d); if (d.y < 0.35) return true;
      }
      this._pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); this._fr.setFromProjectionMatrix(this._pm);
      for (const m of (w.waterMeshes || [])) {
        if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere();
        this._sp.copy(m.geometry.boundingSphere).applyMatrix4(m.matrixWorld);
        if (this._sp.center.distanceTo(camera.position) - this._sp.radius > 700) continue;
        if (this._fr.intersectsSphere(this._sp)) return true;
      }
      return false;
    }
  };
  window.XGFX = GFX;
})();
