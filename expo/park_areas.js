/* ══════════════════════════════════════════════════════════════════
   XEVARION PARK — エリア（その1）★★ 2026-09-28d
   中央噴水公園・XEVARION HALL の外観・GATE・GREEN WALK／MARKET・TOWER／METROPOLIS・SPACE PORT・LAB・AQUA・BEACH・ADVENTURE・ENTERTAINMENT
   ・実在のテーマパークの作り方を参考（入口の広場→大通りの商店街→中央のハブ→放射状にテーマの区域・島の外周に森と鉄道・水辺）。
     建物・キャラクター・ロゴは既存の作品を使わず、すべてオリジナル。
   ══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const T = THREE, X = XTex, P = XWorld.World.prototype, TAU = Math.PI * 2, ROOT = "../";
  const XP = XPark, A = XP.A, M = XP.M;

  P.areaZone = function (id) { const a = A[id]; this.zone(a.n + " " + a.name, a.x0, a.z0, a.x1, a.z1, "outdoor"); };
  P.disk = function (x, z, r, key, y, r0) {
    if (!r0 && r > 6) (this.paved = this.paved || []).push([x - r * 0.9, z - r * 0.9, x + r * 0.9, z + r * 0.9]);
    const g = r0 ? new T.RingGeometry(r0, r, 96, 1) : new T.CircleGeometry(r, 96); g.rotateX(-Math.PI / 2);
    const uv = g.attributes.uv, p = g.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / 4, p.getZ(i) / 4);
    this.batch.add(key, this.m[key], g, new T.Matrix4().makeTranslation(x, y || 0.012, z));
  };
  P.rect = function (key, x0, z0, x1, z1, y) { this.floor(key, x0, z0, x1, z1, y || 0.014); if (!/^lawn/.test(key)) (this.paved = this.paved || []).push([Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1)]); };
  P.ellipsePlaza = function (x, z, rx, rz, key, y) {
    if (!/^lawn/.test(key)) (this.paved = this.paved || []).push([x - rx * 0.8, z - rz * 0.8, x + rx * 0.8, z + rz * 0.8]);
    const sh = new T.Shape(); for (let i = 0; i <= 96; i++) { const a = i / 96 * TAU; const px = Math.cos(a) * rx, pz = Math.sin(a) * rz; if (i) sh.lineTo(px, -pz); else sh.moveTo(px, -pz); }
    const g = new T.ShapeGeometry(sh, 1); g.rotateX(-Math.PI / 2); const uv = g.attributes.uv, p = g.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / 4, p.getZ(i) / 4);
    this.batch.add(key, this.m[key], g, new T.Matrix4().makeTranslation(x, y || 0.013, z));
  };
  /* テーブルとパラソル（いす＝すわれる） */
  P.cafeTable = function (x, z, key) {
    /* ★ 2026-09-29 当たりは丸（テーブル）＋いすの所はあける */
    const w = this;
    w.detail(() => {
      w.geo("white2", new T.CylinderGeometry(0.45, 0.45, 0.05, 12), x, 0.74, z); w.geo("darkMetal", new T.CylinderGeometry(0.04, 0.04, 0.74, 5), x, 0.37, z);
      w.geo("darkMetal", new T.CylinderGeometry(0.03, 0.03, 2.5, 5), x, 1.25, z); w.geo(key || "fabricW", new T.ConeGeometry(1.5, 0.55, 10), x, 2.45, z);
      [0, Math.PI].forEach((a) => { const px = x + Math.sin(a) * 0.85, pz = z + Math.cos(a) * 0.85; w.box("white2", px, 0.44, pz, 0.45, 0.05, 0.45); w.box("white2", px + Math.sin(a) * 0.2, 0.47, pz + Math.cos(a) * 0.2, 0.45, 0.45, 0.05, { ry: a }); w.seats.push({ x: px, z: pz, yaw: a + Math.PI, h: 0.46 }); });
    });
    w.colCircle(x, z, 0.5);
  };
  /* 小さな売店（屋根・看板・カウンター） */
  P.kiosk = function (x, z, ry, name, color, roofKey) {
    const w = this, c = Math.cos(ry), s = Math.sin(ry);
    w.box("offWhite", x, 0, z, 4.2, 2.6, 3.0, { ry }); w.colRot(x, z, 4.2, 3, ry);
    w.box("woodLight", x + s * 1.6, 0, z + c * 1.6, 4.0, 1.05, 0.3, { ry });
    w.geo(roofKey || "awningR", new T.ConeGeometry(3.4, 1.4, 4).rotateY(Math.PI / 4).scale(1, 1, 0.8), x, 3.3, z, ry);
    w.sign(name, { bg: color || "#e84a5a", color: "#fff", border: "rgba(255,255,255,.6)" }, 3.6, 0.7, x + s * 1.52, 2.25, z + c * 1.52, ry);
    w.caster(x, z, 4.2, 3, 3, ry);
  };
  /* 旗（ゆれる）：ポールはまとめ描き・布は全部で1つのインスタンス（ゆれは頂点シェーダー） */
  P.flag = function (x, z, color, h) {
    const w = this; h = h || 9;
    w.detail(() => { w.geo("rail", new T.CylinderGeometry(0.06, 0.08, h, 6), x, h / 2, z); w.geo("gold", new T.SphereGeometry(0.14, 8, 6), x, h + 0.1, z); });
    (w.flagList = w.flagList || []).push([x, h, z, color]);
  };
  P.animFlags = function () {
    const L = this.flagList || []; if (!L.length) return;
    const g = new T.PlaneGeometry(1.8, 1.1, 8, 1); g.translate(0.9, 0, 0);
    const m = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, side: T.DoubleSide });
    m.onBeforeCompile = (sh) => { sh.uniforms.uTime = XP.TIME; sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uTime;").replace("#include <begin_vertex>", "#include <begin_vertex>\n{ vec4 ip = instanceMatrix * vec4(0.0,0.0,0.0,1.0); float ph = ip.x * 0.37 + ip.z * 0.21; transformed.z += sin(uTime * 4.0 + position.x * 1.6 + ph) * 0.2 * position.x / 1.8; transformed.y -= position.x * position.x * 0.03; }"); };
    const im = new T.InstancedMesh(g, m, L.length), m4 = new T.Matrix4(), c = new T.Color();
    L.forEach(([x, h, z, col], i) => { m4.compose(new T.Vector3(x + 0.06, h - 0.7, z), new T.Quaternion().setFromEuler(new T.Euler(0, (x * 0.13 + z * 0.07) % 0.6 - 0.3, 0)), new T.Vector3(1, 1, 1)); im.setMatrixAt(i, m4); c.setHex(col); im.setColorAt(i, c); });
    im.frustumCulled = false; this.scene.add(im); this.flagMesh = im;
  };
  /* 大きな画面（アニメーション） */
  P.bigScreen = function (x, y, z, ry, w, h, title, sub, colors) {
    const W = this, cols = colors || ["#1a2a6a", "#6a2a8a"];
    return W.screen(w, h, 768, x, y, z, ry, (g, W2, H2, t) => {
      const gr = g.createLinearGradient(0, 0, W2, H2); gr.addColorStop(0, cols[0]); gr.addColorStop(1, cols[1]); g.fillStyle = gr; g.fillRect(0, 0, W2, H2);
      for (let i = 0; i < 6; i++) { g.fillStyle = "rgba(255,255,255," + (0.05 + 0.05 * Math.sin(t * 1.5 + i)) + ")"; g.beginPath(); g.arc((i * 173 + t * 60) % W2, H2 * (0.2 + 0.12 * i), 30 + i * 12, 0, TAU); g.fill(); }
      g.fillStyle = "#fff"; g.font = "900 " + Math.round(H2 * 0.2) + "px sans-serif"; g.textAlign = "center"; g.fillText(title, W2 / 2, H2 * 0.48);
      if (sub) { g.font = "700 " + Math.round(H2 * 0.09) + "px sans-serif"; g.fillStyle = "#ffe7a8"; const arr = Array.isArray(sub) ? sub : [sub]; g.fillText(arr[Math.floor(t / 3) % arr.length], W2 / 2, H2 * 0.7); }
      g.textAlign = "left";
    }, { every: 0.2 });
  };
  /* 光の柱（夜のショー） */
  P.spotBeam = function (x, y, z, color, tilt) {
    const m = new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.16, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false });
    const g = new T.ConeGeometry(4, 60, 16, 1, true); g.translate(0, -30, 0); g.rotateX(Math.PI);
    const b = new T.Mesh(g, m); b.position.set(x, y, z); b.rotation.z = tilt || 0; b.visible = false; this.scene.add(b); this.nightObjs.push(b);
    this.anim.push((dt, t) => { if (!b.visible) return; b.rotation.z = (tilt || 0) + Math.sin(t * 0.6 + x) * 0.35; b.rotation.x = Math.cos(t * 0.5 + z) * 0.3; });
    return b;
  };
  /* 人の多い所（遠くの群れ用） */
  P.plazaCrowd = function (x, z, r, dens) { this.plazas.push([x, z, r, dens || 1]); };

  /* ══════════════ 12 CENTRAL FOUNTAIN PARK ══════════════ */
  P.buildCentral = function () {
    const w = this, cx = 0, cz = 290;
    w.areaZone("fountain");
    w.places.push(["12 中央噴水公園", 0, 382, Math.PI]);
    /* 広場の石畳（輪の模様） */
    w.disk(cx, cz, 60, "walkCream", 0.012); w.disk(cx, cz, 46, "walkY", 0.016, 42); w.disk(cx, cz, 60, "brickPave", 0.016, 55.5);
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, g = new T.PlaneGeometry(0.8, 14); g.rotateX(-Math.PI / 2); g.rotateY(-a); w.batch.add("walkY", w.m.walkY, g, new T.Matrix4().makeTranslation(cx + Math.cos(a) * 34, 0.017, cz + Math.sin(a) * 34)); }
    w.bigFountain(cx, cz);
    /* 水路（輪）と4本の橋 */
    const ring = new T.RingGeometry(64, 74, 160, 1); ring.rotateX(-Math.PI / 2);
    w.water(ring, cx, 0.05, cz, "fountain");
    [63.7, 74.3].forEach((r) => { const t = new T.TorusGeometry(r, 0.4, 6, 160); t.rotateX(Math.PI / 2); w.geo("stoneW", t, cx, 0.28, cz); });
    const bridgeAt = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
    w.colRing(cx, cz, 63.5, 74.5, bridgeAt.map((b) => [b - 0.108, b + 0.108]));          /* ★ 輪の当たり（前は 72 個の四角で、ふちがギザギザ） */
    bridgeAt.forEach((a) => {
      const x = cx + Math.cos(a) * 69, z = cz + Math.sin(a) * 69, ry = Math.PI / 2 - a;
      w.geo("stoneW", new T.BoxGeometry(16, 0.4, 16), x, 0.1, z, ry);
      [-1, 1].forEach((s) => { const px = x + Math.cos(a + Math.PI / 2) * 8 * s, pz = z + Math.sin(a + Math.PI / 2) * 8 * s; w.geo("stoneW", new T.BoxGeometry(0.5, 1.0, 16), px, 0.8, pz, ry); w.lamp(px + Math.cos(a) * 7.6, pz + Math.sin(a) * 7.6, "globe"); w.lamp(px - Math.cos(a) * 7.6, pz - Math.sin(a) * 7.6, "globe"); });
    });
    /* 外の庭（芝・花壇・並木・ベンチ・カフェ・小さなステージ・遊歩道） */
    w.disk(cx, cz, 126, "lawnPark", 0.01, 75);
    w.route(ringPts(cx, cz, 100, 72), 8, "paverWarm", { raw: true, lamps: "globe", lampEvery: 24, bushes: false, curb: false });
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; w.route([[cx + Math.cos(a) * 74, cz + Math.sin(a) * 74], [cx + Math.cos(a) * 126, cz + Math.sin(a) * 126]], 14, "walkY", { lamps: false, bushes: false }); }
    [45, 135, 225, 315].forEach((d) => { const a = d * Math.PI / 180; w.route([[cx + Math.cos(a) * 100, cz + Math.sin(a) * 100], [cx + Math.cos(a) * 126, cz + Math.sin(a) * 126]], 10, "paverWarm", { lamps: false, bushes: false }); });
    const skip = (a, wid) => [0, 45, 90, 135, 180, 225, 270, 315].some((d) => { let q = Math.abs(a - d * Math.PI / 180); q = Math.min(q, TAU - q); return q < wid; });
    for (let i = 0; i < 24; i++) { const a = (i + 0.5) / 24 * TAU; if (skip(a, 0.12)) continue; const x = cx + Math.cos(a) * 86, z = cz + Math.sin(a) * 86; w.flowerBed(x, z, 12, 3, Math.PI / 2 - a, i + 90, XP.FLOWER_PAL[i % XP.FLOWER_PAL.length]); }
    for (let i = 0; i < 40; i++) { const a = (i + 0.5) / 40 * TAU; if (skip(a, 0.09) || [67.5, 157.5, 202.5, 247.5, 337.5].some((d) => Math.abs(a - d * Math.PI / 180) < 0.1)) continue; w.plant(i % 3 === 0 ? "sakura" : i % 3 === 1 ? "oak" : "flowerTree", cx + Math.cos(a) * 121, cz + Math.sin(a) * 121, 1.05 + (i % 3) * 0.1); }
    for (let i = 0; i < 32; i++) { const a = (i + 0.5) / 32 * TAU; if (skip(a, 0.1)) continue; w.bench(cx + Math.cos(a) * 95.2, cz + Math.sin(a) * 95.2, -a - Math.PI / 2); }
    [67.5, 157.5, 247.5, 337.5].forEach((d, i) => {
      const a = d * Math.PI / 180, x = cx + Math.cos(a) * 114, z = cz + Math.sin(a) * 114;
      w.yatai(x, z, -a - Math.PI / 2, ["噴水カフェ", "クレープ", "XEVA 茶屋", "ポップコーン"][i], ["norG", "norR", "norB", "norO"][i], ["coffee", "crepe", "dango", "donut"][i]);
      for (let k = 0; k < 4; k++) { const b = a + (k - 1.5) * 0.05; w.cafeTable(cx + Math.cos(b) * 108.5, cz + Math.sin(b) * 108.5, ["fabricW", "fabricR", "fabricB", "fabricY"][k]); }
    });
    /* 小さなステージ（あずまや） */
    { const a = 202.5 * Math.PI / 180, x = cx + Math.cos(a) * 112, z = cz + Math.sin(a) * 112;
      w.geo("stoneW", new T.CylinderGeometry(7, 7.4, 1, 8), x, 0.5, z); w.colCircle(x, z, 7.3);
      for (let i = 0; i < 8; i++) { const b = i / 8 * TAU; w.geo("white2", new T.CylinderGeometry(0.22, 0.22, 5, 8), x + Math.cos(b) * 6.4, 3.5, z + Math.sin(b) * 6.4); }
      w.geo("rTeal", new T.ConeGeometry(8, 3.2, 8), x, 7.6, z); w.geo("gold", new T.SphereGeometry(0.5, 10, 8), x, 9.4, z);
      w.caster(x, z, 12, 12, 8); w.npcSpots.fountain = [[x + 8, z + 4, -a - Math.PI / 2]];
    }
    w.plazaCrowd(cx, cz, 58, 1.5); w.plazaCrowd(cx, cz, 124, 0.25);
    w.forestOpen = (w.forestOpen || []).concat([[cx, cz, 130]]);
  };
  function ringPts(cx, cz, r, n) { const out = []; for (let i = 0; i <= n; i++) { const a = i / n * TAU; out.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); } return out; }
  P.bigFountain = function (x, z) {
    const w = this;
    const rim = new T.TorusGeometry(26, 0.9, 12, 120); rim.rotateX(Math.PI / 2); w.geo("stoneW", rim, x, 0.8, z);
    w.geo("stoneW", new T.CylinderGeometry(26, 26.4, 1.0, 120, 1, true), x, 0.5, z);
    w.colCircle(x, z, 27.0);
    w.water(new T.CircleGeometry(25.8, 120).rotateX(-Math.PI / 2), x, 0.66, z, "fountain");
    const tier = (r, h, y) => { w.geo("stoneW", new T.CylinderGeometry(r * 0.28, r * 0.4, h, 32), x, y - h / 2 + 0.3, z); w.geo("stoneW", new T.CylinderGeometry(r, r * 0.55, 0.8, 48), x, y, z); w.water(new T.CircleGeometry(r * 0.93, 48).rotateX(-Math.PI / 2), x, y + 0.41, z, "fountain"); };
    tier(11, 3.8, 4.0); tier(5.6, 3.4, 7.8); tier(2.6, 3.0, 11.2);
    /* まわりの光るガラスのひれ（8枚） */
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, px = x + Math.cos(a) * 20, pz = z + Math.sin(a) * 20; w.geo("stoneW", new T.CylinderGeometry(0.28, 0.34, 4.2, 10), px, 2.1, pz); w.geo("neonCyan", new T.CylinderGeometry(0.2, 0.2, 0.9, 10), px, 4.6, pz); w.geo("gold", new T.SphereGeometry(0.26, 10, 8), px, 5.2, pz); }
    /* 水の粒（まん中の 30m の噴き上げ・16本のアーチ・段の水・ふちから中へ）。位置は頂点シェーダーで計算・夜は虹色 */
    const N = XP.MOBILE ? 2400 : 5200, geo = new T.BufferGeometry(), seed = new Float32Array(N * 4);
    for (let i = 0; i < N; i++) { seed[i * 4] = i % 4; seed[i * 4 + 1] = Math.random(); seed[i * 4 + 2] = Math.random() * TAU; seed[i * 4 + 3] = Math.floor(Math.random() * 16); }
    geo.setAttribute("position", new T.BufferAttribute(new Float32Array(N * 3), 3)); geo.setAttribute("aSeed", new T.BufferAttribute(seed, 4));
    const dot = X.cv(64, 64), dg = dot.getContext("2d"), gr = dg.createRadialGradient(32, 32, 0, 32, 32, 30); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.5, "rgba(230,248,255,.75)"); gr.addColorStop(1, "rgba(200,240,255,0)"); dg.fillStyle = gr; dg.fillRect(0, 0, 64, 64);
    const pm = new T.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uT: XP.TIME, uNight: { value: 0 }, uMap: { value: X.tex(dot) }, uC: { value: new T.Vector3(x, 0, z) }, uScale: { value: 380 } },
      vertexShader: [
        "attribute vec4 aSeed; uniform float uT, uNight, uScale; uniform vec3 uC; varying vec3 vCol; varying float vA;",
        "vec3 hsl(float h){ vec3 k = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); return 0.25 + 0.75 * k; }",
        "void main(){",
        "  float k = aSeed.x, j = aSeed.w, sp = k < 0.5 ? 0.33 : 0.58; float t = fract(aSeed.y + uT * sp); float cyc = floor(aSeed.y + uT * sp); float a = aSeed.z + cyc * 2.39996;",
        "  vec3 p;",
        "  if (k < 0.5) { float r = 0.3 + t * 3.6; float h = 11.0 + sin(t * 3.14159) * 19.0 + 17.0 * t * (1.0 - t) - t * t * 6.0; p = vec3(cos(a) * r, max(0.7, h), sin(a) * r); }",
        "  else if (k < 1.5) { float aa = j / 16.0 * 6.28318 + sin(uT * 0.4) * 0.2, r = 15.0 - t * 6.5; p = vec3(cos(aa) * r, 4.4 + sin(t * 3.14159) * (9.0 + 3.0 * sin(uT * 0.8 + j)), sin(aa) * r); }",
        "  else if (k < 2.5) { float lv = mod(j, 3.0); float r = lv < 0.5 ? 11.0 : lv < 1.5 ? 5.6 : 2.6; float top = lv < 0.5 ? 4.0 : lv < 1.5 ? 7.8 : 11.2; p = vec3(cos(a) * (r + t * 0.4), top - t * t * (top - 0.7), sin(a) * (r + t * 0.4)); }",
        "  else { float aa = j / 16.0 * 6.28318, r = 25.5 - t * 10.0; p = vec3(cos(aa) * r, 0.9 + sin(t * 3.14159) * 5.5, sin(aa) * r); }",
        "  vec4 mv = modelViewMatrix * vec4(uC + p, 1.0); gl_Position = projectionMatrix * mv;",
        "  gl_PointSize = 0.7 * uScale / max(1.0, -mv.z);",
        "  vCol = mix(vec3(1.0), hsl(fract(uT * 0.07 + j / 16.0 + (k < 0.5 ? 0.5 : 0.0))) * 2.4, uNight); vA = 0.9;",
        "}"].join("\n"),
      fragmentShader: "uniform sampler2D uMap; varying vec3 vCol; varying float vA; void main(){ vec4 c = texture2D(uMap, gl_PointCoord); if (c.a < 0.02) discard; gl_FragColor = vec4(vCol * c.rgb, c.a * vA);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}" });
    const pts = new T.Points(geo, pm); pts.frustumCulled = false; w.scene.add(pts);
    w.anim.push(() => { pm.uniforms.uNight.value = w.nightShow || 0; pm.uniforms.uScale.value = (w.renderer ? w.renderer.domElement.height : 900) * 0.5; });
    const colm = new T.Mesh(new T.CylinderGeometry(0.5, 1.8, 30, 16, 1, true), new T.MeshBasicMaterial({ color: 0xdff6ff, transparent: true, opacity: 0.4, depthWrite: false })); colm.position.set(x, 11 + 15, z); w.scene.add(colm);
    /* XEVARION のシンボル（ロゴのマーク）が浮かぶ・まわりに光の輪 */
    const emT = X.imgTex("img/park_emblem.webp");
    const emM = new T.MeshBasicMaterial({ map: emT, transparent: true, depthWrite: false, side: T.DoubleSide, toneMapped: false });
    const em = new T.Mesh(new T.PlaneGeometry(15, 9.6), emM); em.position.set(x, 40, z); w.scene.add(em);
    w.nightMats.push({ m: emM, base: new T.Color(1, 1, 1), day: 1.05, night: 1.8 });
    const halos = [0, 1, 2].map((i) => { const h = new T.Mesh(new T.TorusGeometry(8.5 + i * 1.6, 0.12, 8, 96), w.m.neonCyan); h.position.set(x, 40, z); w.scene.add(h); return h; });
    w.anim.push((dt, t) => {
      colm.scale.y = 1 + Math.sin(t * 1.7) * 0.08;
      em.position.y = 40 + Math.sin(t * 0.8) * 0.8; em.rotation.y = t * 0.25;
      halos.forEach((h, i) => { h.position.y = em.position.y; h.rotation.set(Math.PI / 2 + Math.sin(t * 0.5 + i) * 0.5, t * (0.3 + i * 0.15), Math.cos(t * 0.4 + i) * 0.4); });
    });
    w.caster(x, z, 6, 6, 12);
  };

  /* ══════════════ 11 XEVARION HALL の外観（中は今まで通り） ══════════════ */
  P.buildHallExterior = function () {
    const w = this;
    (w.noGrass = w.noGrass || []).push([-40, 8, 40, 54]);          /* ★ 2026-09-29d 入口広場の石だたみに草が生えていた */
    /* 外壁をガラスに（外から見える面だけ・中の壁の外側に薄い板） */
    w.box("gSilver", 104.5, 0, 0, 0.4, 15.4, 97, { uv: 14 }); w.box("gSilver", 70, 0, -48.5, 68, 15.4, 0.4, { uv: 14 }); w.box("gSilver", 70, 0, 48.5, 68, 15.4, 0.4, { uv: 14 });
    w.box("gPurple", 0, -0.5, -72.95, 53, 18, 0.4, { uv: 14 }); w.box("gPurple", 26.5, 0, -60, 0.4, 16.5, 24, { uv: 14 }); w.box("gPurple", -26.5, 0, -56, 0.4, 16.5, 32, { uv: 14 });
    w.box("gBlue", -104.5, 0, -2, 0.4, 9.4, 77, { uv: 14 }); w.box("gBlue", -65, 0, -40.5, 78, 9.4, 0.4, { uv: 14 });
    [[-70, -2, 68, 76, 9], [0, -3, 72, 30, 14.5], [0, -45, 52, 54, 16], [70, 0, 68, 96, 15.5], [0, 12, 72, 1, 16]].forEach(([x, z, ww, dd, h]) => w.caster(x, z, ww, dd, h));
    /* 基調講演ホールの上の紫のドーム・てっぺんにシンボル */
    const domeM = new T.MeshStandardMaterial({ color: 0x7a4ae8, roughness: 0.18, metalness: 0.75, emissive: 0x3a1a8a, emissiveIntensity: 0.25 }); domeM.envMapIntensity = 1.3; w.m.hallDome = domeM;
    w.nightMats.push({ m: domeM, day: 0.25, night: 1.2 });
    /* ★ 2026-09-29d ドームは屋根の上に収める（前は半径30で横の壁・うしろの壁・ロビーの屋根からはみ出し、壁を貫通して見えた）。下に白い台（ドラム） */
    const DY = 17.4, DR = 24.6, DZ = 25.4;
    w.geo("white2", new T.CylinderGeometry(1, 1, 1.6, 64, 1, false).scale(DR + 0.3, 1, DZ + 0.3), 0, DY - 0.8, -45.5);
    w.geo("neonPurple", new T.CylinderGeometry(1, 1, 0.4, 96, 1, true).scale(DR + 0.34, 1, DZ + 0.34), 0, DY - 0.35, -45.5);
    w.geo("hallDome", new T.SphereGeometry(1, 48, 20, 0, TAU, 0, Math.PI / 2).scale(DR, 15.5, DZ), 0, DY, -45.5);
    for (let i = 0; i < 16; i++) { const t = new T.TorusGeometry(1, 0.01, 4, 48, Math.PI); t.rotateY(i / 16 * Math.PI); t.scale(DR + 0.15, 15.6, DZ + 0.15); w.geo("white2", t, 0, DY, -45.5); }
    w.caster(0, -45.5, 50, 52, 34);
    const emM = new T.MeshBasicMaterial({ map: X.imgTex("img/park_emblem.webp"), transparent: true, depthWrite: false, side: T.DoubleSide, toneMapped: false });
    const em = new T.Mesh(new T.PlaneGeometry(12, 7.7), emM); em.position.set(0, 40, -45.5); w.scene.add(em); w.anim.push((dt, t) => { em.rotation.y = t * 0.3; });
    /* ★ 2026-09-29d 建物の足もとに石の台（前は地面から壁がいきなり立って、下が埋もれて見えた） */
    [[70, 48.5, 68, 0.9, 0], [70, -48.5, 68, 0.9, 0], [104.5, 0, 0.9, 98, 0], [0, -73.1, 54, 0.9, 0], [26.6, -60, 0.9, 25, 0], [-26.6, -56.5, 0.9, 33, 0], [-104.5, -2, 0.9, 78, 0], [-65, -40.6, 79, 0.9, 0], [-70, 36.4, 68, 0.9, 0], [-36.3, 24, 0.9, 24, 0]].forEach(([x, z, ww, dd]) => { w.box("stoneGray", x, 0, z, ww + 0.4, 0.95, dd + 0.4); w.box("gold", x, 0.95, z, ww + 0.44, 0.06, dd + 0.44); });
    /* 大屋根の輪（2重・柱で支える）＝ホールを包む流れる屋根 */
    const ell = (rx, rz, y) => { const pts = []; for (let i = 0; i < 160; i++) { const a = i / 160 * TAU; pts.push(new T.Vector3(Math.cos(a) * rx, y + Math.sin(a * 2) * 1.5, -16 + Math.sin(a) * rz)); } return new T.CatmullRomCurve3(pts, true); };
    const c1 = ell(128, 92, 25), c2 = ell(114, 80, 30);
    w.geo("white2", new T.TubeGeometry(c1, 320, 2.0, 10, true), 0, 0, 0);
    w.geo("gBlue", new T.TubeGeometry(c2, 320, 1.3, 8, true), 0, 0, 0);
    w.geo("neonPurple", new T.TubeGeometry(ell(128, 92, 23.6), 320, 0.22, 6, true), 0, 0, 0);
    (w.afterBuild = w.afterBuild || []).push(() => {
      const segD = (x, z, r) => { const [x0, z0, x1, z1] = r, dx = x1 - x0, dz = z1 - z0, l2 = dx * dx + dz * dz; let t = l2 ? ((x - x0) * dx + (z - z0) * dz) / l2 : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(x - (x0 + dx * t), z - (z0 + dz * t)); };
      const inPoly = (x, z, pts) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, zi] = pts[i], [xj, zj] = pts[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
      for (let i = 0; i < 20; i++) {
        const a = (i + 0.5) / 20 * TAU, p = c1.getPointAt(i / 20 + 0.5 / 20); let bx = Math.cos(a) * 140, bz = -16 + Math.sin(a) * 102;
        if (bz > 40 && Math.abs(bx) < 60) continue;                         /* 正面の広場の上は柱をなくす */
        let ok = false;
        for (const k of [1, 0.96, 1.04, 0.92, 1.08]) { const x = Math.cos(a) * 140 * k, z = -16 + Math.sin(a) * 102 * k; if (w.roads.some((r) => segD(x, z, r) < r[4] / 2 + 1.5) || w.casters.some((c) => c.h > 2 && inPoly(x, z, c.pts)) || w.isWater(x, z)) continue; bx = x; bz = z; ok = true; break; }
        if (!ok) continue;                                                   /* ★ 2026-09-29d 道・建物・水の上に柱を立てない（前は建物を柱がつきぬけていた） */
        const top = new T.Vector3(p.x, p.y, p.z), bot = new T.Vector3(bx, 0, bz), mid = top.clone().add(bot).multiplyScalar(0.5), L = top.distanceTo(bot);
        const g = new T.CylinderGeometry(0.6, 1.0, L, 8); const mesh = new T.Mesh(g); mesh.position.copy(mid); mesh.lookAt(top); mesh.rotateX(Math.PI / 2); mesh.updateMatrix();
        w.batch.add("white2", w.m.white2, g, mesh.matrix); w.colCircle(bx, bz, 1.1);
      }
    });
    /* 東西の大きな画面 */
    w.bigScreen(104.9, 9, 0, Math.PI / 2, 20, 11, "XEVARION HALL", ["基調講演・講演トラック・展示ホール", "Connect Everything. Expand the Future.", "パートナーとアプリの最新情報"], ["#2a1a6a", "#1a4a9a"]);
    w.bigScreen(-104.9, 7, -2, -Math.PI / 2, 16, 8, "WORLD CONFERENCE", ["TRACK A ゲーム", "TRACK B 学習・AI", "TRACK C クリエイティブ"], ["#1a2a5a", "#5a1a6a"]);
    /* 前の広場から中央の噴水へのグランドアベニュー */
    w.route([[0, 50], [0, 218]], 26, "walkCream", { lamps: "classic", lampsBoth: true, lampEvery: 18, trees: 16, treeKind: "sakura", bushes: false });
    for (let z = 66; z <= 206; z += 20) w.lanternString(-12.6, z, 12.6, z, 7.2, 12, z);
    for (let z = 70; z <= 200; z += 26) [-1, 1].forEach((s) => w.flowerBed(s * 18.5, z, 3.4, 12, 0, z + s));
    for (let z = 64; z <= 210; z += 30) [-1, 1].forEach((s) => w.flag(s * 11.5, z, s < 0 ? 0x6a4ae8 : 0x3a8aff, 10));
    w.plazaCrowd(0, 135, 60, 0.6);
    w.places.push(["11 HALL ロビー", 0, 8, Math.PI], ["　基調講演ホール", 0, -24, Math.PI], ["　講演トラック", -53, 0, Math.PI / 2], ["　展示ホール", 42, 0, Math.PI / 2], ["　CAFÉ・STORE", -24, 0, Math.PI / 2]);
  };

  /* ══════════════ 1 XEVARION GATE ══════════════ */
  P.buildGate = function () {
    const w = this, gz = 866;
    w.areaZone("gate");
    w.places.unshift(["1 GATE（入口）", 0, 945, Math.PI]);
    w.ellipsePlaza(0, 918, 128, 60, "walkCream");
    w.ellipsePlaza(0, 918, 100, 42, "walkY", 0.016);
    w.ellipsePlaza(0, 918, 96, 38, "walkCream", 0.019);
    /* ★★ 2026-09-29 大門（妖魔シティ風の大きな門：2段の瓦屋根・朱の柱・金の飾り・大提灯）＋両わきの未来の白い塔
       門の板に XEVARION PARK のロゴ。てっぺんの上にシンボルが浮かぶ */
    const gc = gz - 4;
    w.pagodaGate(0, gc, 0, 2.5, { roofKey: "kwG", lanKey: "lanBig" });
    const wm = X.imgTex("img/park_wordmark.webp"), wmM = new T.MeshBasicMaterial({ map: wm, transparent: true, toneMapped: false });
    w.nightMats.push({ m: wmM, base: new T.Color(1.15, 1.15, 1.15), day: 1, night: 1.6 });
    [[gc + 4.9, 0], [gc - 4.9, Math.PI]].forEach(([z, r]) => { w.box("woodDark2", 0, 15.0, z - (r ? -0.14 : 0.14), 17.4, 3.6, 0.22); const p = new T.Mesh(new T.PlaneGeometry(16.6, 2.9), wmM); p.position.set(0, 16.8, z); p.rotation.y = r; w.scene.add(p); w.loose(p, 900); });
    [-1, 1].forEach((s) => {
      const x = s * 36;
      const tw = new T.CylinderGeometry(1.6, 4.8, 40, 4, 1); tw.rotateY(Math.PI / 4); tw.scale(1, 1, 0.7); w.geo("white2", tw, x, 20, gz, s * 0.12);
      w.geo("gBlue", new T.BoxGeometry(0.4, 30, 3.2), x - s * 2.4, 16, gz, 0); w.geo("neonCyan", new T.BoxGeometry(0.2, 32, 0.25), x - s * 2.62, 17, gz + 1.7, 0); w.geo("neonCyan", new T.BoxGeometry(0.2, 32, 0.25), x - s * 2.62, 17, gz - 1.7, 0);
      w.geo("chromeB", new T.ConeGeometry(0.5, 9, 8), x, 44.5, gz); w.geo("neonWhite", new T.SphereGeometry(0.45, 10, 8), x, 49.2, gz);
      w.collider(x - 4.5, gz - 3.5, x + 4.5, gz + 3.5); w.caster(x, gz, 8, 6, 40);
      /* 両わきのチケット売り場（瓦屋根・のれん・提灯） */
      w.yomaShop(s * 58, gz + 4, 20, 10, 6.5, { ry: 0, key: s < 0 ? "yCream" : "yTeal", shop: "shopD", roof: "kawara", roofKey: "kwB", rh: 3.6, sign: "チケット  TICKETS", signColor: "#1a3a8a", noren: "norB", lanterns: 3,
        inside: { type: "lobby", name: "チケット売り場", deskSign: "TICKETS  チケット・案内", actLabel: "パークの案内を聞く・パスを受け取る", text: "ようこそ XEVARION PARK へ！ 1日パスは無料です（見るだけ）。24のエリアを地図からワープできます。" } });
      w.lanternString(s * 36 - s * 3, gz + 6, s * 14, gz + 6, 9.5, 9, s + 3);
    });
    const emM = new T.MeshBasicMaterial({ map: X.imgTex("img/park_emblem.webp"), transparent: true, depthWrite: false, side: T.DoubleSide, toneMapped: false });
    w.nightMats.push({ m: emM, base: new T.Color(1, 1, 1), day: 1.05, night: 1.8 });
    const em = new T.Mesh(new T.PlaneGeometry(16, 10.2), emM); em.position.set(0, 54, gc); w.scene.add(em);
    const ring = w.floatRing(0, 54, gc, 11, "neonCyan");
    w.anim.push((dt, t) => { em.position.y = 54 + Math.sin(t * 0.9) * 0.6; em.rotation.y = Math.sin(t * 0.3) * 0.4; });
    /* 改札（すき間を通れる） */
    for (let i = -8; i <= 8; i++) { const x = i * 3.1; w.box("chromeB", x, 0, gz + 5, 0.5, 1.1, 1.8, { collide: true }); w.box("neonCyan", x, 1.1, gz + 5, 0.52, 0.05, 1.82); }
    w.box("glassClear", -26, 0, gz + 5, 0.1, 1.2, 1.8); w.box("glassClear", 26, 0, gz + 5, 0.1, 1.2, 1.8);
    /* 案内所（ガラスの丸い建物）・ギフトショップ（丸い屋根に目・屋根の上に大きなケーキ） */
    { const x = -92, z = 920; w.geo("gTeal", new T.CylinderGeometry(9, 9, 7, 32), x, 3.5, z); w.geo("white2", new T.CylinderGeometry(10.5, 10.5, 0.8, 32), x, 7.4, z); w.geo("glassDome", new T.SphereGeometry(8, 24, 12, 0, TAU, 0, Math.PI / 2), x, 7.8, z); w.colCircle(x, z, 9.2); w.casterCircle(x, z, 9, 12);
      w.sign("INFORMATION  案内所", { bg: "#1a8ad8", color: "#fff", px: 1024 }, 11, 1.4, x + 6.6, 5.6, z - 6.2, Math.PI * 0.75); w.floatRing(x, 17, z, 5, "neonCyan"); }
    w.yomaShop(92, 922, 26, 16, 8, { ry: -Math.PI / 2, key: "yTeal", shop: "shopD", roof: "barrel", roofKey: "kwO", eyes: { iris: "irisE" }, sign: "XEVARION GIFTS  おみやげ", signColor: "#1a3a8a", signW: 14, noren: "norB", lanterns: 3, inside: { type: "shop", name: "XEVARION GIFTS" } });
    w.giantProp("cake", 92, 18.3, 922, 2.2, 0);
    /* 入口の噴水と、ロゴのマークの形の花壇 */
    w.gateFountain(0, 932);
    w.emblemGarden(0, 897);
    for (let i = 0; i < 14; i++) { const a = Math.PI * (0.1 + i / 13 * 0.8); const x = Math.cos(a) * 120, z = 918 + Math.sin(a) * 55; w.flag(x, z, [0x3a78e8, 0xe84a8a, 0xffc830, 0x2fbfb0, 0x8a5ae0][i % 5], 9); }
    for (let i = 0; i < 22; i++) { const a = Math.PI * (0.05 + i / 21 * 0.9); if (i % 3 === 1) w.plant("sakura", Math.cos(a) * 132, 920 + Math.sin(a) * 64, 1.15); else w.palm(Math.cos(a) * 132, 920 + Math.sin(a) * 64, 1.1 + (i % 3) * 0.1); }
    for (let x = -110; x <= 110; x += 22) if (Math.abs(x) > 40) w.lamp(x, 882, "classic");
    [-60, -30, 30, 60].forEach((x) => w.bench(x, 958, Math.PI));
    /* 屋台（広場のふち） */
    [[-66, 947, Math.PI, "わたあめ", "norP", "donut"], [66, 947, Math.PI, "チュロス", "norO", "crepe"], [-104, 896, Math.PI / 2 + 0.3, "ラムネ", "norB", "coffee"], [104, 896, -Math.PI / 2 - 0.3, "焼きそば", "norK", "ramen"]].forEach(([x, z, ry, n, nr, pr]) => w.yatai(x, z, ry, n, nr, pr));
    w.npcSpots.gate = [[9, 890, Math.PI]];
    w.plazaCrowd(0, 915, 80, 1.6);
    w.forestOpen = (w.forestOpen || []).concat([[0, 920, 140]]);
  };
  P.gateFountain = function (x, z) {
    const w = this;
    const rim = new T.TorusGeometry(13, 0.6, 10, 80); rim.rotateX(Math.PI / 2); w.geo("stoneW", rim, x, 0.6, z);
    w.geo("stoneW", new T.CylinderGeometry(13, 13.2, 0.6, 80, 1, true), x, 0.3, z); w.colCircle(x, z, 13.7);
    w.water(new T.CircleGeometry(12.8, 80).rotateX(-Math.PI / 2), x, 0.48, z, "fountain");
    w.geo("stoneW", new T.CylinderGeometry(1.2, 2.2, 3, 24), x, 1.5, z); w.geo("gBlue", new T.SphereGeometry(2.2, 32, 16), x, 5.2, z);
    const rg = new T.TorusGeometry(3.4, 0.14, 8, 64); w.geo("gold", rg.clone().rotateX(1.2), x, 5.2, z); w.geo("gold", rg.clone().rotateX(-0.6).rotateZ(0.8), x, 5.2, z);
    const N = 900, geo = new T.BufferGeometry(), pos = new Float32Array(N * 3), S = [];
    for (let i = 0; i < N; i++) S.push({ t: Math.random(), j: i % 24 });
    geo.setAttribute("position", new T.BufferAttribute(pos, 3));
    const dot = X.cv(64, 64), dg = dot.getContext("2d"), gr = dg.createRadialGradient(32, 32, 0, 32, 32, 30); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.5, "rgba(230,248,255,.7)"); gr.addColorStop(1, "rgba(200,240,255,0)"); dg.fillStyle = gr; dg.fillRect(0, 0, 64, 64);
    const pts = new T.Points(geo, new T.PointsMaterial({ color: 0xe8f8ff, map: X.tex(dot), size: 0.5, transparent: true, opacity: 0.85, depthWrite: false })); pts.frustumCulled = false; w.scene.add(pts);
    w.anim.push((dt, t) => { for (let i = 0; i < N; i++) { const s = S[i]; s.t += dt * 0.7; if (s.t > 1) s.t -= 1; const a = s.j / 24 * TAU, r = 12.5 - s.t * 8.5; pos[i * 3] = x + Math.cos(a) * r; pos[i * 3 + 1] = 0.6 + Math.sin(s.t * Math.PI) * 4.2; pos[i * 3 + 2] = z + Math.sin(a) * r; } geo.attributes.position.needsUpdate = true; });
  };
  /* ロゴのマーク（X と軌道の輪と星）の形の花壇 */
  P.emblemGarden = function (x, z) {
    const w = this;
    w.ellipsePlaza(x, z, 26, 11, "lawnPark", 0.02);
    const rim = new T.TorusGeometry(1, 0.03, 4, 96); rim.rotateX(Math.PI / 2); rim.scale(26.3, 8, 11.3); w.geo("stoneW", rim, x, 0.2, z);
    w.colEll(x, z, 0, 0, 26.4, 11.4);
    const put = (px, pz, c) => w.trees.push(["flower", px, pz, 1.05, c]);
    for (let t = -1; t <= 1; t += 0.018) {
      const a1 = [x + t * 20, z + t * 8 + Math.sin(t * 3) * 1.2], a2 = [x + t * 20, z - t * 8 + Math.sin(t * 3) * 1.2];
      for (let k = -1; k <= 1; k++) { put(a1[0] + k * 0.25, a1[1] + k * 0.35, 0x2a6ae8); put(a2[0] + k * 0.25, a2[1] - k * 0.35, 0x3aa8ff); }
    }
    for (let i = 0; i < 150; i++) { const a = i / 150 * TAU; put(x + Math.cos(a) * 22, z + Math.sin(a) * 8.6, i % 2 ? 0x9a5ae8 : 0x6a4ae8); }
    for (let i = 0; i < 40; i++) { const a = i / 40 * TAU, r = i % 2 ? 1.2 : 3.2; put(x + 16 + Math.cos(a) * r, z - 5 + Math.sin(a) * r * 0.7, 0xffe060); }
    for (let i = 0; i < 260; i++) { const a = Math.random() * TAU, rr = Math.sqrt(Math.random()); const px = x + Math.cos(a) * rr * 25, pz = z + Math.sin(a) * rr * 10; put(px, pz, 0xffffff); }
  };

  /* ══════════════ 19 GREEN WALK ／ 4 MARKET ══════════════ */
  const SHOPS = [["XEVARION STORE", "#3a78e8"], ["CAFÉ STELLA", "#2c9e7a"], ["SWEETS FACTORY", "#ff6fa8"], ["GAME PLAZA", "#8a5aff"], ["FASHION NOVA", "#e84a8a"], ["BAKERY LUNE", "#e8a040"],
    ["BOOKS & MAPS", "#2a7a8a"], ["ICE PARLOR", "#5ab8ff"], ["TOY LAND", "#e0485a"], ["DINER 24", "#c8503a"], ["GIFT GALLERY", "#d8a020"], ["TEA ROOM", "#3fae7c"],
    ["MUSIC BOX", "#6a4ae8"], ["CREPERIE", "#ff8a3d"], ["PHOTO STUDIO", "#1a8ad8"], ["CHOCOLATIER", "#8a5a3a"], ["FLOWER SHOP", "#ff7aa8"], ["SOUVENIR", "#2fbfb0"],
    ["PASTA HOUSE", "#d84a3a"], ["STAR BURGER", "#f0a020"], ["MAGI GOODS", "#9a4ae8"], ["CANDY POP", "#ff5fa0"], ["WATCH & GEM", "#4a5a8a"], ["SPORTS SHOP", "#2a8a5a"]];
  const FAC = ["sPink", "sYellow", "sMint", "sBlue", "sCream", "sLav", "sPeach", "sRed", "sTeal", "sWhite"], ROOFS = ["rRed", "rBlue", "rPurple", "rTeal", "rOrange", "rSlate", "rPink", "rGold"], SHOPF = ["shopA", "shopB", "shopC", "shopD"], AWN = ["awningR", "awningB", "awningG", "awningY", "awningP"];
  let shopK = 0;
  /* ★★ 2026-09-29 店の並びは妖魔シティ風（色とりどりの外壁・瓦／丸い屋根・丸い屋根の正面に大きな目・屋根の大きな食べ物・のれん・提灯・縦の看板）。
     食べ物の店は屋根にその食べ物、ほかの店はネオンの形。店の名前はオリジナル */
  const YFAC = ["yRed", "yTeal", "yYellow", "yPurple", "yGreen", "yBrown", "yCream", "yPink", "yBlue", "yOrange"], YROOF = ["kwB", "kwG", "kwR", "kwP", "kwK", "kwO", "kwT"];
  const YSHOPS = [["たこ焼き 蛸まる", "takoyaki", "norO"], ["XEVARION STORE", null], ["甘味処 ほしぞら", "dango", "norR"], ["ゲームセンター XEVA", null], ["XEVA ラーメン", "ramen", "norK"], ["おもちゃの国", null],
    ["アイス工房", "icecream", "norB"], ["本と地図", null], ["ドーナツ堂", "donut", "norP"], ["写真館", null], ["たい焼き 金魚", "taiyaki", "norO"], ["花屋 さくら", null], ["プリン屋", "pudding", "norG"], ["時計と宝石", null],
    ["寿司 まる", "sushi", "norB"], ["スポーツ館", null], ["カフェ 月あかり", "coffee", "norG"], ["音楽館", null], ["クレープ 花", "crepe", "norR"], ["雑貨 ほしのわ", null], ["ケーキの森", "cake", "norP"], ["洋服 NOVA", null], ["おむすび処", "onigiri", "norK"], ["おみやげ館", null]];
  const SIGNC = ["#1a1030", "#3a0a1a", "#0a2a3a", "#2a1a0a", "#1a2a0a", "#2a0a2a"];
  P.shopRow = function (xa, xb, za, zb, face, seed, o) {
    o = o || {};
    const w = this, r = X.rnd(seed), ry = face > 0 ? Math.PI / 2 : -Math.PI / 2, dep = xb - xa, cxx = (xa + xb) / 2;
    let z = za;
    while (z < zb - 6) {
      let wz = Math.min(zb - z, 10 + Math.floor(r() * 9)); if (zb - z - wz < 8) wz = zb - z;
      const k = shopK++, cz = z + wz / 2, sh = YSHOPS[k % YSHOPS.length], food = !!sh[1];
      const rr = r(), roof = rr < 0.42 ? "kawara" : rr < 0.8 ? "barrel" : "flat";
      const h = (o.hMin || 7.5) + Math.floor(r() * ((o.hVar || 2) + 1)) * 3;
      w.yomaShop(cxx, cz, wz, dep, h, {
        ry, key: YFAC[(k * 3 + seed) % YFAC.length], shop: ["shopA", "shopB", "shopC", "shopD"][k % 4], roof, roofKey: YROOF[(k * 5 + seed) % YROOF.length],
        sign: sh[0], signColor: SIGNC[k % SIGNC.length], glow: ["#ffcf6a", "#ff9ad0", "#8ff0ff", "#b8ff8a"][k % 4],
        eyes: roof === "barrel" && r() < 0.75 ? { iris: ["irisA", "irisB", "irisC", "irisD", "irisE"][k % 5], look: r() - 0.5 } : (roof !== "barrel" && r() < 0.14),
        prop: food && r() < 0.85 ? sh[1] : null, noren: food ? sh[2] : (r() < 0.35 ? "norB" : null),
        signV: r() < 0.45 ? ["営業中", "名物", "本日", "おいしい", "たのしい", "ようこそ"][k % 6] : null, lanterns: 2,
        neon: !food && r() < 0.6 ? { kind: ["star", "heart", "moon", "note", "cat", "crystal"][k % 6], key: ["neonPink", "neonCyan", "neonYellow", "neonPurple"][k % 4] } : null,
        inside: { type: food ? (sh[1] === "coffee" || sh[1] === "cake" ? "cafe" : "food") : /ゲーム/.test(sh[0]) ? "arcade" : /写真/.test(sh[0]) ? "studio" : /本と地図/.test(sh[0]) ? "library" : "shop", name: sh[0], prop: sh[1], menu: sh[1] }
      });
      z += wz;
    }
  };
  P.buildGreenWalk = function () {
    const w = this, z0 = 420, z1 = 858, SQ = 630;
    w.areaZone("green"); w.areaZone("marketW"); w.areaZone("marketE");
    w.places.push(["19 GREEN WALK", 0, 470, Math.PI], ["4 MARKET（中央広場）", 0, 668, Math.PI]);
    /* 2本の歩道（中央に緑の帯と水路） */
    [-15, 15].forEach((x) => { w.route([[x, z0], [x, SQ - 30]], 14, "paverWarm", { lamps: false, bushes: false }); w.route([[x, SQ + 30], [x, z1]], 14, "paverWarm", { lamps: false, bushes: false }); });
    w.rect("lawnPark", -8, z0, 8, SQ - 34); w.rect("lawnPark", -8, SQ + 34, 8, z1);
    w.river([[0, z0 + 4], [0, SQ - 36]], 5.5, { kind: "canal" }); w.river([[0, SQ + 36], [0, 826]], 5.5, { kind: "canal" });          /* ★★ 2026-09-29c 南は路面電車の U ターンの手前まで */
    [470, 560, 700, 790].forEach((z) => w.route([[-9, z], [9, z]], 6, "stoneW", { lamps: false, bushes: false, curb: false }));
    for (let z = z0 + 8; z < z1; z += 13) { if (Math.abs(z - SQ) < 40) continue; [-1, 1].forEach((s) => w.plant((Math.floor(z / 13) + (s > 0 ? 1 : 0)) % 2 ? "sakura" : "oak", s * 5.4, z, 1.0)); }
    for (let z = z0 + 4; z < z1; z += 20) { if (Math.abs(z - SQ) < 36) continue; [-1, 1].forEach((s) => { w.lamp(s * 23.2, z, "classic"); w.flag(s * 23.6, z + 10, s < 0 ? 0xe84a8a : 0x3a8aff, 6.5); }); }
    for (let z = z0 + 14; z < z1; z += 40) { if (Math.abs(z - SQ) < 40) continue; [-1, 1].forEach((s) => w.bench(s * 8.9, z, s < 0 ? -Math.PI / 2 : Math.PI / 2)); }
    /* 中央広場（時計塔の噴水・花の屋台・テーブル） */
    w.disk(0, SQ, 40, "plaza", 0.014); w.disk(0, SQ, 40, "brickPave", 0.018, 36);
    w.clockFountain(0, SQ);
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + 0.26; if (Math.abs(Math.sin(a)) > 0.85 || Math.abs(Math.cos(a) * 25) < 21) continue; w.cafeTable(Math.cos(a) * 25, SQ + Math.sin(a) * 25, ["fabricR", "fabricW", "fabricB", "fabricY"][i % 4]); }
    [[-30, SQ - 18, 0.6], [30, SQ - 18, -0.6], [-30, SQ + 18, 2.5], [30, SQ + 18, -2.5]].forEach(([x, z, ry], i) => w.kiosk(x, z, ry, ["FLOWERS", "FRUIT JUICE", "HOT DOG", "BALLOONS"][i], ["#ff7aa8", "#ffb030", "#e84a4a", "#3a8aff"][i], AWN[i]));
    w.balloonsAt(-6, SQ + 30); w.balloonsAt(6, SQ - 30);
    w.plazaCrowd(0, SQ, 38, 1.8);
    /* 路面電車は park_transit.js（★★ 2026-09-29c 1周の線・停留所・乗れる） */
    /* マーケットの店（表通り・裏の通り） */
    const segs = [[426, 518], [528, SQ - 40], [SQ + 40, 738], [748, 848]];
    segs.forEach(([a, b], i) => { w.shopRow(-46, -24, a, b, 1, 11 + i, {}); w.shopRow(24, 46, a, b, -1, 21 + i, {}); });
    /* 裏の通り（れんが）とその外側の店 */
    [-57, 57].forEach((x) => w.route([[x, 428], [x, 846]], 10, "brickPave", { lamps: "classic", lampEvery: 22, bushes: false }));
    [[430, 518], [528, 620], [640, 738], [748, 846]].forEach(([a, b], i) => { w.shopRow(-108, -64, a, b, 1, 31 + i, { hMin: 12, hVar: 3, gable: 0.3 }); w.shopRow(64, 108, a, b, -1, 41 + i, { hMin: 12, hVar: 3, gable: 0.3 }); });
    /* 横の通り（西＝LAB・AQUA へ、東＝BOCCIA・MEDIA へ） */
    [523, 743].forEach((z) => w.route([[-112, z], [112, z]], 10, "paverWarm", { lamps: false, bushes: false }));
    w.route([[-40, SQ], [-112, SQ]], 12, "paverWarm", { lamps: false, bushes: false }); w.route([[40, SQ], [112, SQ]], 12, "paverWarm", { lamps: false, bushes: false });
    /* ★ 2026-09-29 表通りの上に提灯の列・裏の「まんぷく横丁」に屋台と提灯 */
    for (let z = z0 + 14; z < z1; z += 20) { if (Math.abs(z - SQ) < 44) continue; [-1, 1].forEach((s) => w.lanternString(s * 23.6, z, s * 8.8, z, 8.2, 8, z + s)); }
    const YT = [["焼き鳥", "norK", "ramen"], ["りんごあめ", "norR", "icecream"], ["たこ焼き", "norO", "takoyaki"], ["わたあめ", "norP", "donut"], ["おでん", "norB", "onigiri"], ["かき氷", "norG", "pudding"], ["焼きそば", "norK", "ramen"], ["チョコバナナ", "norP", "crepe"]];
    [-1, 1].forEach((sd) => { let k = 0; for (let z = 440; z < 840; z += 26) { if (Math.abs(z - 523) < 10 || Math.abs(z - 743) < 10 || Math.abs(z - SQ) < 16) continue; const t = YT[(k + (sd > 0 ? 3 : 0)) % YT.length]; w.yatai(sd * 49.5, z, sd < 0 ? -Math.PI / 2 : Math.PI / 2, t[0], t[1], k % 3 === 0 ? t[2] : null); k++; } for (let z = 450; z < 840; z += 24) w.lanternString(sd * 52, z, sd * 62, z, 5.6, 6, z * 3 + sd); });
    [[-57, 432], [57, 432], [-57, 842], [57, 842]].forEach(([x, z]) => { w.torii(x, z, 0, 1.05); w.sign("まんぷく横丁", { bg: "#1a0a0a", color: "#ffe7a0", glow: "#ffb04a", px: 512, both: true }, 4.6, 0.9, x, 5.0, z, 0); });
    w.npcSpots.market = [[-10, 560, Math.PI / 2], [10, 720, -Math.PI / 2]];
    for (let z = 440; z < 850; z += 60) { w.crowdSpots.push([-15, z, 3], [15, z + 30, 3]); }
  };
  P.clockFountain = function (x, z) {
    const w = this;
    const rim = new T.TorusGeometry(9, 0.5, 10, 64); rim.rotateX(Math.PI / 2); w.geo("stoneW", rim, x, 0.55, z);
    w.geo("stoneW", new T.CylinderGeometry(9, 9.2, 0.55, 64, 1, true), x, 0.28, z); w.colCircle(x, z, 9.6);
    w.water(new T.CircleGeometry(8.8, 64).rotateX(-Math.PI / 2), x, 0.45, z, "fountain");
    w.box("stoneBeige", x, 0, z, 3.4, 16, 3.4); w.box("offWhite", x, 16, z, 4.2, 0.6, 4.2);
    w.box("sCream", x, 16.6, z, 3.4, 4, 3.4); w.geo("rBlue", new T.ConeGeometry(3.2, 6, 4).rotateY(Math.PI / 4), x, 23.6, z); w.geo("gold", new T.ConeGeometry(0.12, 2, 4), x, 27.4, z);
    const fc = X.cv(256, 256), fg = fc.getContext("2d"); fg.fillStyle = "#fffaf0"; fg.beginPath(); fg.arc(128, 128, 120, 0, TAU); fg.fill(); fg.strokeStyle = "#2a3a5a"; fg.lineWidth = 8; fg.stroke();
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; fg.fillStyle = "#2a3a5a"; fg.fillRect(128 + Math.cos(a) * 96 - 5, 128 + Math.sin(a) * 96 - 5, 10, 10); }
    const hands = [];
    const faceT = X.tex(fc);
    [[0, 1.72], [Math.PI / 2, 1.72], [Math.PI, 1.72], [-Math.PI / 2, 1.72]].forEach(([r, d]) => {
      const f = new T.Mesh(new T.CircleGeometry(1.45, 32), new T.MeshStandardMaterial({ map: faceT, roughness: 0.5 })); f.position.set(x + Math.sin(r) * d, 18.6, z + Math.cos(r) * d); f.rotation.y = r; w.scene.add(f);
      [[1.1, 0.08], [0.8, 0.12]].forEach(([len, wd], k) => { const h = new T.Mesh(new T.BoxGeometry(wd, len, 0.03), w.m.pNavy); h.geometry.translate(0, len / 2, 0); h.position.set(x + Math.sin(r) * (d + 0.02), 18.6, z + Math.cos(r) * (d + 0.02)); h.rotation.y = r; w.scene.add(h); hands.push([h, k]); });
    });
    w.anim.push(() => { const d = new Date(), mm = d.getMinutes() + d.getSeconds() / 60, hh = (d.getHours() % 12) + mm / 60; hands.forEach(([h, k]) => { h.rotation.z = -(k === 0 ? mm / 60 : hh / 12) * TAU; }); });
    w.caster(x, z, 4, 4, 27);
  };
  P.balloonsAt = function (x, z) { if (this.balloons) this.balloons(x, z); };

  /* ══════════════ 3 TOWER ／ 2 METROPOLIS ══════════════ */
  P.buildMetropolis = function () {
    const w = this, TX = -250, TZ = 250;
    w.areaZone("metro"); w.areaZone("tower");
    w.places.push(["3 TOWER", -198, 262, -Math.PI / 2], ["2 METROPOLIS", -350, 305, Math.PI]);
    /* 道路（碁盤の目）：アスファルト＋白線＋歩道 */
    const AV = [-510, -430, -350], ST = [145, 225, 305, 385];
    const street = (x0, z0, x1, z1, wd) => w.yomaStreet([[x0, z0], [x1, z1]], { road: wd, walk: 5, center: "pink", lampEvery: 28, treeEvery: 15, cross: false });
    AV.forEach((x) => street(x, 118, x, 432, 12));
    /* タワーの広場（半径46）は道が通りぬけない（前は z=225 の道が広場の上を通って重なっていた） */
    ST.forEach((z) => { if (z === 225) { street(-532, z, -300, z, 11); street(-200, z, -178, z, 11); } else street(-532, z, -178, z, 11); });
    /* 横断歩道 */
    AV.forEach((x) => ST.forEach((z) => w.detail(() => { for (let k = -2; k <= 2; k++) { w.floor("roadLine", x - 7.5, z + k * 1.6 - 0.35, x - 5.5, z + k * 1.6 + 0.35, 0.045); w.floor("roadLine", x + 5.5, z + k * 1.6 - 0.35, x + 7.5, z + k * 1.6 + 0.35, 0.045); } })));
    /* 高層ビル（街区ごと） */
    const r = X.rnd(303), keys = ["gBlue", "gTeal", "gSilver", "gDark", "gPurple", "gGold", "gGreen", "gRose", "oGray", "oBlue", "oWhite"];
    const blocks = [];
    [[-497, -443], [-417, -363], [-337, -300]].forEach(([bx0, bx1]) => [[160, 211], [240, 291], [320, 371], [399, 436]].forEach(([bz0, bz1]) => blocks.push([bx0, bz0, bx1, bz1])));
    [[-296, 160, -186, 204], [-296, 320, -186, 371], [-296, 399, -186, 436]].forEach((b) => blocks.push(b));
    blocks.forEach(([bx0, bz0, bx1, bz1], bi) => {
      const bw = bx1 - bx0, bd = bz1 - bz0; if (bw < 20 || bd < 20) { if (bw >= 10 && bd >= 10) { const n = Math.max(1, Math.round(Math.max(bw, bd) / 30)); for (let k = 0; k < n; k++) { const t = (k + 0.5) / n; w.bld(bw > bd ? bx0 + bw * t : (bx0 + bx1) / 2, bw > bd ? (bz0 + bz1) / 2 : bz0 + bd * t, bw > bd ? bw / n - 3 : bw - 3, bw > bd ? bd - 3 : bd / n - 3, 14 + r() * 16, { key: keys[(bi + k) % keys.length], shop: "shopA" }); } } return; }
      const nx = bw > 50 ? 2 : 1, nz = bd > 50 ? 2 : 1;
      for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
        const cx = bx0 + bw * (i + 0.5) / nx, cz = bz0 + bd * (j + 0.5) / nz, sw = bw / nx - 8, sd = bd / nz - 8;
        const dC = Math.hypot(cx - TX, cz - TZ), h = 50 + r() * 70 + Math.max(0, 180 - dC) * 0.55;
        const key = keys[Math.floor(r() * keys.length)], shape = r();
        if (shape < 0.18) { const R = Math.min(sw, sd) / 2; w.geo(key, new T.CylinderGeometry(R, R, h, 28), cx, h / 2, cz); w.geo("chromeB", new T.CylinderGeometry(R + 0.5, R + 0.5, 1, 28), cx, h, cz); w.colCircle(cx, cz, R + 0.5); w.casterCircle(cx, cz, R, h); w.geo("neonCyan", new T.TorusGeometry(R + 0.3, 0.15, 6, 32).rotateX(Math.PI / 2), cx, h - 2, cz); }
        else w.skyscraper(cx, cz, sw, sd, h, { key, steps: 2 + Math.floor(r() * 3), taper: 0.72 + r() * 0.16, podium: r() < 0.55 ? "gSilver" : null, shop: SHOPF[Math.floor(r() * 4)], crown: r() < 0.5 ? ["neonCyan", "neonWhite", "neonPurple", "neonBlue"][Math.floor(r() * 4)] : null, spire: r() < 0.25 ? 12 + r() * 20 : 0, heli: r() < 0.2 });
      }
    });
    /* 空中の歩道（ビルの間の橋）・高架の新交通（まわる電車） */
    [[-470, 185, -390, 185, 42], [-390, 265, -390, 345, 60], [-470, 345, -470, 265, 34], [-322, 185, -322, 265, 50]].forEach(([x0, z0, x1, z1, y]) => { const L = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(x1 - x0, z1 - z0); w.geo("glassClear", new T.BoxGeometry(5, 3.6, L), (x0 + x1) / 2, y + 1.8, (z0 + z1) / 2, ang); w.geo("white2", new T.BoxGeometry(5.4, 0.5, L), (x0 + x1) / 2, y, (z0 + z1) / 2, ang); w.geo("white2", new T.BoxGeometry(5.4, 0.3, L), (x0 + x1) / 2, y + 3.7, (z0 + z1) / 2, ang); w.geo("neonCyan", new T.BoxGeometry(5.5, 0.1, L), (x0 + x1) / 2, y + 0.25, (z0 + z1) / 2, ang); });
    w.peopleMover([[-536, 116], [-180, 116], [-180, 438], [-536, 438]], 16);
    /* ★ 2026-09-30 街の外まわりの歩道（東西の通りの端をつなぐ：前は通りが芝生で行き止まりだった） */
    w.route([[-526, 100], [-526, 440]], 8, "walkCream", { lamps: "yoma", lampEvery: 22, trees: false, benches: 40, bushes: false });
    w.route([[-170, 118], [-170, 205]], 8, "walkCream", { lamps: "yoma", lampEvery: 22, trees: false, benches: false, bushes: false });
    w.route([[-170, 300], [-170, 440]], 8, "walkCream", { lamps: "yoma", lampEvery: 22, trees: false, benches: 40, bushes: false });
    /* 中央の広場（彫刻・大画面・カフェ）＝ -390, 265 の街区 */
    /* タワー */
    w.xevarionTower(TX, TZ);
    /* 車（道を走る） */
    w.traffic(AV.map((x) => [[x - 3, 120], [x - 3, 430], [x + 3, 430], [x + 3, 120]]).concat(ST.filter((z) => z !== 225).map((z) => [[-530, z + 3], [-180, z + 3], [-180, z - 3], [-530, z - 3]]).concat([[[-530, 228], [-302, 228], [-302, 222], [-530, 222]]])));
    /* 未来の建築：光の輪・ホログラムの看板 */
    [[-390, 265, 60], [-470, 345, 48], [-322, 185, 70]].forEach(([x, z, y]) => w.floatRing(x, y + 14, z, 9, "neonCyan"));
    w.areaGate(-176, 262, Math.PI / 2, "metro", "big");
    w.plazaCrowd(TX, TZ, 44, 1.3);
    ST.forEach((z) => w.crowdSpots.push([-400, z + 9, 3], [-280, z - 9, 3]));
  };
  P.xevarionTower = function (x, z) {
    const w = this;
    w.disk(x, z, 46, "plaza", 0.02); w.disk(x, z, 46, "plazaGray", 0.024, 42);
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; w.plant("palm", x + Math.cos(a) * 38, z + Math.sin(a) * 38, 1.1); if (i % 2) w.bench(x + Math.cos(a + 0.26) * 34, z + Math.sin(a + 0.26) * 34, -a - Math.PI / 2 + Math.PI); }
    w.pond(x, z + 30, 7, "fountain");
    /* 足もとのガラスの建物・柱・展望台2つ・尖塔 */
    w.geo("gBlue", new T.CylinderGeometry(15, 17, 12, 40), x, 6, z); w.geo("white2", new T.CylinderGeometry(18, 18, 1.2, 40), x, 12.4, z); w.colCircle(x, z, 17);
    w.geo("white2", new T.CylinderGeometry(3.2, 6.2, 150, 24), x, 12 + 75, z);
    for (let k = 0; k < 3; k++) { const pts = []; for (let i = 0; i <= 120; i++) { const t = i / 120, a = t * TAU * 5 + k * TAU / 3, rr = 6.2 - t * 3.0 + 0.3; pts.push(new T.Vector3(x + Math.cos(a) * rr, 12 + t * 150, z + Math.sin(a) * rr)); } w.geo("neonCyan", new T.TubeGeometry(new T.CatmullRomCurve3(pts), 400, 0.16, 5, false), 0, 0, 0); }
    [[125, 14, 7, "gTeal"], [172, 9, 5, "gBlue"]].forEach(([y, r, h, key]) => { w.geo(key, new T.CylinderGeometry(r, r * 0.78, h, 36), x, y, z); w.geo("white2", new T.CylinderGeometry(r + 0.6, r + 0.6, 0.6, 36), x, y + h / 2, z); w.geo("white2", new T.CylinderGeometry(r * 0.8, r * 0.7, 0.8, 36), x, y - h / 2, z); w.geo("neonWhite", new T.TorusGeometry(r + 0.62, 0.12, 6, 48).rotateX(Math.PI / 2), x, y + h / 2 - 0.4, z); });
    w.geo("chromeB", new T.ConeGeometry(1.4, 44, 12), x, 196, z); w.geo("neonRed", new T.SphereGeometry(0.6, 10, 8), x, 218.5, z);
    w.caster(x, z, 10, 10, 190); w.casterCircle(x, z, 15, 12);
    w.sign("XEVARION TOWER", { bg: "#0e2a6a", color: "#fff", glow: "#7fd8ff", px: 1024 }, 16, 1.8, x + 16.2, 9, z, Math.PI / 2);
    /* ★★ 2026-09-30 ガラスのエレベーターで外がわを上る（展望台 125m・スカイデッキ 172m） */
    const TWD = { name: "XEVARION TOWER", x, z, fx: x + 19, fz: z, fyaw: -Math.PI / 2, lift: { x: x + 18.8, z: z + 3, ax: 1, az: 0, y0: 0.3, topF: 52 },
      floors: [{ label: "30F", name: "展望台（125m）", deck: { x, z, y: 122, rIn: 6.4, rOut: 12.4, exitR: 7.4, name: "XEVARION TOWER 展望台（125m）" } }, { label: "41F", name: "スカイデッキ（172m）", deck: { x, z, y: 170, rIn: 1.2, rOut: 6.4, exitR: 2.6, name: "XEVARION TOWER スカイデッキ（172m）" } }] };
    w.interact(x + 18, z, 4, "タワーの展望台へ（ガラスのエレベーター）", () => ({ roomFloors: TWD }), "🗼");
  };
  /* 高架の新交通（四角い周回・電車が走る） */
  P.peopleMover = function (corners, y) {
    const w = this, pts = corners.concat([corners[0]]);
    const path = []; for (let i = 0; i < corners.length; i++) { const a = corners[i], b = corners[(i + 1) % corners.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.ceil(L / 8); for (let k = 0; k < n; k++) path.push(new T.Vector3(a[0] + (b[0] - a[0]) * k / n, y, a[1] + (b[1] - a[1]) * k / n)); }
    const curve = new T.CatmullRomCurve3(path, true, "catmullrom", 0.05);
    w.geo("white2", new T.TubeGeometry(curve, 600, 1.0, 6, true).scale(1, 0.8, 1), 0, 0, 0);
    for (let i = 0; i < path.length; i += 3) { const p = path[i]; w.box("white2", p.x, 0, p.z, 1.1, y - 0.6, 1.1, { collide: true }); }
    const cars = [], cm = new T.MeshStandardMaterial({ color: 0xf6f8fc, roughness: 0.25, metalness: 0.5 }), wm = new T.MeshStandardMaterial({ color: 0x2a8ae8, roughness: 0.1, metalness: 0.6, emissive: 0x2a6ae8, emissiveIntensity: 0.2 });
    for (let i = 0; i < 3; i++) { const g = new T.Group(); const b = new T.Mesh(new T.CapsuleGeometry(1.3, 7, 4, 12), cm); b.rotation.x = Math.PI / 2; g.add(b); const wn = new T.Mesh(new T.BoxGeometry(2.64, 0.8, 7.2), wm); wn.position.y = 0.3; g.add(wn); w.scene.add(g); cars.push(g); }
    let u = 0; const L = curve.getLength();
    w.anim.push((dt) => { u = (u + dt * 11 / L) % 1; cars.forEach((c, i) => { const uu = (u - i * 10 / L + 1) % 1, p = curve.getPointAt(uu), q = curve.getPointAt((uu + 0.002) % 1); c.position.set(p.x, p.y + 1.9, p.z); c.lookAt(q.x, q.y + 1.9, q.z); }); });
  };
  /* 車（道を走る・ぶつからない）：車体・窓・タイヤ・ライトをそれぞれインスタンスでまとめる */
  P.traffic = function (loops) {
    const w = this, cols = [0xe8e8ec, 0x2a2a30, 0xc83a3a, 0x3a6ac8, 0xf0c030, 0x6a6a74, 0x2fa88a, 0xffffff];
    const cars = [];
    loops.forEach((lp, li) => {
      const curve = new T.CatmullRomCurve3(lp.map(([x, z]) => new T.Vector3(x, 0, z)), true, "catmullrom", 0.02), L = curve.getLength();
      const n = Math.max(1, Math.floor(L / 80));
      for (let i = 0; i < n; i++) cars.push({ curve, off: i / n, spd: (8 + (li % 3) * 1.5) / L, col: cols[(li * 3 + i) % cols.length] });
    });
    const N = cars.length;
    const bodyM = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25, metalness: 0.6 }); bodyM.envMapIntensity = 1.1;
    const body = new T.InstancedMesh(XWorld.mergeGeos([new T.BoxGeometry(1.9, 0.8, 4.4).translate(0, 0.7, 0), new T.BoxGeometry(1.8, 0.35, 1.2).translate(0, 1.2, 1.4)]), bodyM, N);
    const cab = new T.InstancedMesh(new T.BoxGeometry(1.7, 0.7, 2.3).translate(0, 1.4, -0.2), w.m.windowDark, N);
    const wg = XWorld.mergeGeos([-1.4, 1.4].map((dz) => new T.CylinderGeometry(0.36, 0.36, 2.0, 10).rotateZ(Math.PI / 2).translate(0, 0.36, dz)));
    const wheel = new T.InstancedMesh(wg, w.m.darkMetal, N);
    const tail = new T.InstancedMesh(new T.BoxGeometry(1.6, 0.15, 0.05).translate(0, 0.85, -2.22), w.m.neonRed, N);
    const head = new T.InstancedMesh(new T.BoxGeometry(1.5, 0.15, 0.05).translate(0, 0.85, 2.22), w.m.lampGlowB, N);
    const c = new T.Color(); cars.forEach((k, i) => { c.setHex(k.col); body.setColorAt(i, c); });
    const all = [body, cab, wheel, tail, head]; all.forEach((m) => { m.frustumCulled = false; w.scene.add(m); });
    const m4 = new T.Matrix4(), q = new T.Quaternion(), p = new T.Vector3(), p2 = new T.Vector3(), one = new T.Vector3(1, 1, 1), up = new T.Vector3(0, 1, 0), mt = new T.Matrix4();
    w.anim.push((dt, t) => {
      const near = Math.abs(-350 - (w._camX || 0)) < 700 && Math.abs(275 - (w._camZ || 0)) < 700; all.forEach((m) => { m.visible = near; }); if (!near) return;
      cars.forEach((k, i) => { const u = (k.off + t * k.spd) % 1; k.curve.getPointAt(u, p); k.curve.getPointAt((u + 0.003) % 1, p2); mt.lookAt(p2, p, up); q.setFromRotationMatrix(mt); m4.compose(p, q, one); all.forEach((m) => m.setMatrixAt(i, m4)); });
      all.forEach((m) => { m.instanceMatrix.needsUpdate = true; });
    });
  };

  /* ══════════════ 6 SPACE PORT ══════════════ */
  P.buildSpacePort = function () {
    const w = this;
    w.areaZone("space");
    w.places.push(["6 SPACE PORT", -566, 196, -Math.PI / 2]);
    w.rect("plazaGray", -760, 40, -660, 140, 0.012); w.rect("plazaGray", -690, 170, -585, 250, 0.012); w.rect("plazaGray", -640, 80, -570, 130, 0.012);
    /* 発射台とロケット・整備塔・避雷塔 */
    { const x = -712, z = 88;
      w.box("stoneGray", x, 0, z, 44, 3, 44, { collide: true }); w.box("darkMetal", x, 3, z - 14, 10, 0.2, 14);
      w.rocket(x, z);
      [[-24, -24], [24, -24], [-24, 24], [24, 24]].forEach(([a, b]) => { w.box("railRed", x + a, 0, z + b, 1.2, 70, 1.2, { collide: true }); w.box("neonRed", x + a, 70, z + b, 0.8, 0.8, 0.8); });
      w.geo("white2", new T.SphereGeometry(6, 16, 12), x + 30, 28, z - 20); w.box("white2", x + 30, 0, z - 20, 1.4, 22, 1.4, { collide: true });
      w.sign("LAUNCH COMPLEX 1", { bg: "#1a1a2a", color: "#fff", glow: "#ff6a4a", px: 1024 }, 16, 1.8, x, 5.2, z + 22.2, 0);
      w.caster(x, z, 44, 44, 3); }
    /* 宇宙港ターミナル（曲面の屋根・ドーム） */
    { const x = -640, z = 205;
      w.bld(x, z, 70, 30, 12, { key: "techW", roof: "flat", roofKey: "rMetalW", inside: { type: "lobby", name: "宇宙港ターミナル", h: 8, door: 6, deskSign: "DEPARTURES  出発カウンター", actLabel: "出発カウンターで宇宙旅行の案内を聞く", text: "月・火星・宇宙ステーションへの便（空想）。ロケットの打ち上げは外の発射台から見られます。" } });
      const arch = new T.CylinderGeometry(22, 22, 72, 40, 1, true, -Math.PI / 2 * 0.7, Math.PI * 0.7); arch.rotateZ(Math.PI / 2); w.geo("gSilver", arch, x, 2, z);
      w.dome(x - 32, z + 22, 12, "glassDome", "white2"); w.dome(x + 32, z + 22, 10, "glassDome", "white2");
      w.sign("XEVARION SPACE PORT", { bg: "#0a1a4a", color: "#fff", glow: "#7fd8ff", px: 1024 }, 30, 3, x, 15.5, z + 15.3, 0);
      w.bigScreen(x, 8, z + 15.4, 0, 14, 7, "DEPARTURES", ["MOON  14:30  ON TIME", "MARS  15:10  BOARDING", "ORBIT STATION  16:00", "XEVARION-7  LAUNCH 18:00"], ["#0a1030", "#1a2a6a"]);
      for (let i = -3; i <= 3; i++) w.flag(x + i * 9, z + 26, [0x3a78e8, 0xffffff, 0xe84a4a][(i + 3) % 3], 10); }
    /* 管制塔 */
    { const x = -600, z = 100; w.geo("white2", new T.CylinderGeometry(4, 6, 44, 20), x, 22, z); w.geo("gDark", new T.CylinderGeometry(10, 7, 8, 20), x, 48, z); w.geo("white2", new T.CylinderGeometry(10.5, 10.5, 0.8, 20), x, 52.4, z); w.geo("white2", new T.CylinderGeometry(1, 1, 10, 8), x, 58, z); w.geo("neonRed", new T.SphereGeometry(0.6, 8, 6), x, 63.4, z); w.colCircle(x, z, 6.2); w.caster(x, z, 12, 12, 52);
      w.dish(x + 22, z + 18, 8); w.dish(x - 24, z + 30, 6); w.dish(x + 30, z - 20, 5); }
    /* 宇宙のジェットコースター（白い円すいのドーム） */
    { const x = -690, z = 285; const g = new T.ConeGeometry(34, 38, 48, 1, true); w.geo("white2", g, x, 19, z); for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; const rib = new T.BoxGeometry(0.6, 51, 0.8); rib.rotateX(-Math.atan2(34, 38)); w.geo("rMetal", rib, x + Math.cos(a) * 17, 19, z + Math.sin(a) * 17, -a + Math.PI / 2); }
      w.geo("neonCyan", new T.TorusGeometry(34.3, 0.3, 6, 96).rotateX(Math.PI / 2), x, 0.8, z); w.colCircle(x, z, 34.4); w.casterCircle(x, z, 30, 30);
      w.sign("COSMIC COASTER", { bg: "#101840", color: "#fff", glow: "#4ff0ff", px: 1024 }, 18, 2.2, x + 28, 4, z + 16, Math.PI / 3); }
    /* 宇宙ステーション風の建物（高い輪） */
    { const x = -610, z = 300, Y = 22; const ring = new T.TorusGeometry(20, 3.2, 12, 64); ring.rotateX(Math.PI / 2); w.geo("white2", ring, x, Y, z); w.geo("gBlue", new T.TorusGeometry(20, 3.3, 6, 64, TAU).rotateX(Math.PI / 2).scale(1, 0.25, 1), x, Y, z);
      w.geo("white2", new T.CylinderGeometry(5, 5, 14, 24), x, Y, z); for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + Math.PI / 4; w.geo("white2", new T.BoxGeometry(1.6, 1.6, 18), x + Math.cos(a) * 11, Y, z + Math.sin(a) * 11, -a + Math.PI / 2); w.box("rMetal", x + Math.cos(a) * 20, 0, z + Math.sin(a) * 20, 1.8, Y, 1.8, { collide: true }); }
      w.geo("pBlue", new T.BoxGeometry(18, 0.3, 6), x, Y + 9, z); w.box("rMetal", x, 0, z, 3, Y - 7, 3, { collide: true }); w.caster(x, z, 44, 44, Y + 3); w.casters[w.casters.length - 1].gate = true;          /* ★★ 2026-09-30b 輪は上空・地面は柱だけ＝下を通れる */
      w.sign("ORBIT STATION", { bg: "#0a1a4a", color: "#fff", px: 1024 }, 12, 1.4, x, 6, z - 21.2, Math.PI); }
    /* 未来のシャトル（展示）・火星基地・月面 */
    w.shuttle(-600, 50);
    { const x = -740, z = 200; w.dome(x, z, 11, "rOrange", "white2"); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; w.geo("rockRed", new T.DodecahedronGeometry(2 + (i % 3), 0), x + Math.cos(a) * 17, 1, z + Math.sin(a) * 17); } w.sign("MARS BASE", { bg: "#8a2a1a", color: "#fff", px: 512 }, 7, 1.2, x + 12, 3, z, Math.PI / 2); }
    { const x = -740, z = 150; w.dome(x, z, 9, "offWhite", "white2"); w.sign("MOON WALK", { bg: "#3a3a4a", color: "#fff", px: 512 }, 7, 1.2, x + 10, 3, z, Math.PI / 2); }
    /* 空飛ぶ円盤（浮かんでまわる） */
    { const g = new T.Group(); const disc = new T.Mesh(new T.SphereGeometry(6, 32, 12), w.m.chromeB); disc.scale.set(1, 0.22, 1); g.add(disc); const top = new T.Mesh(new T.SphereGeometry(2.4, 20, 10, 0, TAU, 0, Math.PI / 2), w.m.glassDome); top.position.y = 0.8; g.add(top); const rim = new T.Mesh(new T.TorusGeometry(6, 0.18, 6, 48), w.m.neonCyan); rim.rotation.x = Math.PI / 2; g.add(rim);
      g.position.set(-660, 30, 110); w.scene.add(g); w.anim.push((dt, t) => { g.position.y = 30 + Math.sin(t * 0.8) * 2.5; g.rotation.y = t * 0.9; g.position.x = -660 + Math.sin(t * 0.13) * 30; }); }
    w.cosmicCoaster(-690, 285);          /* ★ 2026-09-29 乗れるコースター（park_rides.js） */
    w.areaGate(-560, 200, -Math.PI / 2, "space", "big");
    w.plazaCrowd(-640, 240, 30, 1.2); w.plazaCrowd(-680, 150, 34, 0.6);
    w.forestOpen.push([-665, 180, 120]);
  };
  P.rocket = function (x, z) {
    const w = this, B = 3;
    w.geo("rocketW", new T.CylinderGeometry(4, 4, 64, 32), x, B + 32, z);
    w.geo("rocketR", new T.ConeGeometry(4, 14, 32), x, B + 64 + 7, z);
    w.geo("rocketR", new T.CylinderGeometry(4.05, 4.05, 3, 32), x, B + 44, z);
    w.geo("pNavy", new T.CylinderGeometry(4.06, 4.06, 1.2, 32), x, B + 20, z);
    [0, 1, 2, 3].forEach((i) => { const a = i / 4 * TAU + Math.PI / 4; w.geo("rocketW", new T.CylinderGeometry(1.8, 1.8, 34, 16), x + Math.cos(a) * 5.6, B + 17, z + Math.sin(a) * 5.6); w.geo("rocketR", new T.ConeGeometry(1.8, 6, 16), x + Math.cos(a) * 5.6, B + 37, z + Math.sin(a) * 5.6); w.geo("darkMetal", new T.ConeGeometry(1.6, 2.4, 12, 1, true), x + Math.cos(a) * 5.6, B - 0.6, z + Math.sin(a) * 5.6); });
    w.sign("XEVARION-7", { bg: "#ffffff", color: "#1a2a6a", px: 512 }, 2.2, 14, x, B + 34, z + 4.05, 0);
    for (let y = 0; y < 76; y += 4) { w.box("railRed", x + 12, B + y, z, 5, 0.3, 5); [[-2.3, -2.3], [2.3, -2.3], [-2.3, 2.3], [2.3, 2.3]].forEach(([a, b]) => w.box("railRed", x + 12 + a, B + y, z + b, 0.3, 4, 0.3)); }
    w.box("railRed", x + 7.5, B + 52, z, 4.2, 0.8, 1.4); w.box("railRed", x + 7.5, B + 30, z, 4.2, 0.8, 1.4);
    w.collider(x + 9, z - 3, x + 15, z + 3); w.caster(x, z, 10, 10, 78); w.caster(x + 12, z, 5, 5, 78);
    const N = 220, geo = new T.BufferGeometry(), pos = new Float32Array(N * 3), S = [];
    for (let i = 0; i < N; i++) S.push({ t: Math.random(), a: Math.random() * TAU });
    geo.setAttribute("position", new T.BufferAttribute(pos, 3));
    const pts = new T.Points(geo, new T.PointsMaterial({ color: 0xffffff, size: 4.5, transparent: true, opacity: 0.3, depthWrite: false })); pts.frustumCulled = false; w.scene.add(pts);
    w.anim.push((dt) => { for (let i = 0; i < N; i++) { const s = S[i]; s.t += dt * 0.22; if (s.t > 1) { s.t -= 1; s.a = Math.random() * TAU; } const r = 4 + s.t * 18; pos[i * 3] = x + Math.cos(s.a) * r; pos[i * 3 + 1] = B + 0.5 + s.t * 7; pos[i * 3 + 2] = z + Math.sin(s.a) * r; } geo.attributes.position.needsUpdate = true; });
  };
  P.dish = function (x, z, r) { const w = this; const d = new T.SphereGeometry(r, 24, 10, 0, TAU, 0, 0.95); d.rotateX(-0.9); w.geo("white2", d, x, r * 1.6, z); w.box("rMetal", x, 0, z, 1, r * 1.5, 1, { collide: true }); w.geo("rMetal", new T.CylinderGeometry(0.1, 0.1, r * 1.2, 5).rotateX(-0.9), x, r * 1.9, z + r * 0.5); w.caster(x, z, r, r, r * 2); };
  P.shuttle = function (x, z) {
    const w = this;
    w.box("stoneGray", x, 0, z, 30, 1.5, 16, { collide: true });
    w.geo("rocketW", new T.CapsuleGeometry(2.6, 18, 6, 16).rotateX(Math.PI / 2), x, 6.5, z);
    const wing = new T.Shape(); wing.moveTo(0, -6); wing.lineTo(9, 4); wing.lineTo(0, 7); wing.lineTo(-9, 4); wing.lineTo(0, -6);
    const wg = new T.ExtrudeGeometry(wing, { depth: 0.5, bevelEnabled: false }); wg.rotateX(Math.PI / 2); w.geo("white2", wg, x, 5.6, z + 1);
    w.geo("pNavy", new T.BoxGeometry(0.4, 5, 4), x, 9.5, z - 7);
    w.box("rMetal", x, 1.5, z - 4, 0.8, 3, 0.8); w.box("rMetal", x, 1.5, z + 4, 0.8, 3, 0.8);
    w.sign("FUTURE SHUTTLE X-1", { bg: "#1a2a5a", color: "#fff", px: 512 }, 7, 1, x, 1.2, z + 8.05, 0);
    w.caster(x, z, 18, 20, 10);
  };

  /* ══════════════ 5 XEVARION LAB ══════════════ */
  P.buildLab = function () {
    const w = this, cx = -260, cz = 535;
    w.areaZone("lab");
    w.places.push(["5 LAB", -155, 520, -Math.PI / 2]);
    w.rect("plaza", -300, 505, -220, 575, 0.013); w.rect("plazaGray", -360, 470, -300, 505, 0.013);
    /* 巨大な光る球（ホログラムの地球）と輪 */
    { const g = new T.IcosahedronGeometry(11, 3); const wire = new T.LineSegments(new T.EdgesGeometry(g, 1), new T.LineBasicMaterial({ color: 0x7fe8ff, transparent: true, opacity: 0.9, toneMapped: false })); wire.position.set(cx, 24, cz); w.scene.add(wire);
      const core = new T.Mesh(new T.SphereGeometry(10.4, 40, 24), new T.MeshStandardMaterial({ color: 0x2a6ae8, emissive: 0x2a8ae8, emissiveIntensity: 0.6, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.55 })); core.position.copy(wire.position); w.scene.add(core);
      w.nightMats.push({ m: core.material, day: 0.6, night: 1.6 });
      const rings = [0, 1, 2].map((i) => { const r = new T.Mesh(new T.TorusGeometry(15 + i * 2.2, 0.3, 8, 96), [w.m.neonCyan, w.m.neonPurple, w.m.neonWhite][i]); r.position.copy(wire.position); w.scene.add(r); return r; });
      w.geo("white2", new T.CylinderGeometry(6, 9, 10, 32), cx, 5, cz); w.geo("neonCyan", new T.TorusGeometry(9.1, 0.2, 6, 64).rotateX(Math.PI / 2), cx, 0.5, cz); w.colCircle(cx, cz, 9.2);
      w.anim.push((dt, t) => { wire.rotation.y = core.rotation.y = t * 0.15; rings.forEach((r, i) => r.rotation.set(Math.PI / 2 + Math.sin(t * 0.3 + i * 2) * 0.6, t * (0.2 + i * 0.1), Math.cos(t * 0.25 + i) * 0.5)); });
      w.pool(cx, cz + 34, 36, 10, 0, "fountain"); w.caster(cx, cz, 12, 12, 20); }
    /* 研究所の建物（白いパネル＋ガラスの帯）・ドーム・AI タワー */
    w.bld(-330, 490, 44, 26, 18, { key: "techW", roof: "flat", crown: "neonCyan", sign: { text: "XEVARION LAB — RESEARCH CENTER", bg: "#0a3a5a", w: 24, h: 1.8, y: 15 }, inside: { type: "lab", name: "研究センター", h: 6, door: 4 } });
    w.bld(-190, 490, 40, 24, 14, { key: "techG", roof: "flat", crown: "neonWhite", sign: { text: "SCIENCE EXPO", bg: "#1a5a8a", w: 14, h: 1.8, y: 11 }, inside: { type: "gallery", name: "サイエンスエキスポ", h: 6, door: 4, list: XWorld.World.prototype.PARK_DATA.EXHIBIT.science } });
    w.bld(-335, 590, 40, 22, 12, { key: "techW", roof: "flat", ry: Math.PI, sign: { text: "ROBOT FACTORY", bg: "#2a4a6a", w: 14, h: 1.6, y: 9.5 }, inside: { type: "showroom", name: "ロボット工場", h: 6, door: 4, robot: true, list: XWorld.World.prototype.PARK_DATA.EXHIBIT.robot } });
    w.dome(-200, 585, 18, "glassDome", "white2"); w.dome(-305, 545, 10, "glassDomeP", "white2");
    { const x = -175, z = 545; w.geo("gTeal", new T.CylinderGeometry(9, 10, 56, 32), x, 28, z); w.geo("white2", new T.CylinderGeometry(10.6, 10.6, 1, 32), x, 56.5, z); w.geo("neonCyan", new T.TorusGeometry(9.7, 0.3, 6, 64).rotateX(Math.PI / 2), x, 50, z); w.geo("chromeB", new T.ConeGeometry(0.8, 14, 8), x, 64, z); w.colCircle(x, z, 10.1); w.casterCircle(x, z, 9.5, 57);
      w.sign("AI TOWER", { bg: "#0a2a4a", color: "#fff", glow: "#4ff0ff", px: 512 }, 8, 1.4, x, 6, z + 9.7, 0); }
    { const x = -240, z = 598; w.bld(x, z, 26, 16, 10, { key: "neonB", roof: "flat", ry: Math.PI, sign: { text: "VR / AR PAVILION", bg: "#1a0a3a", w: 14, h: 1.5, y: 7.8, glow: "#a86aff" }, inside: { type: "arcade", name: "VR / AR パビリオン", h: 5 } }); }
    /* 大きなロボットの像（オリジナル） */
    w.robotStatue(-280, 470, 1.6);
    /* ドローン（浮かぶ）・風車 */
    for (let i = 0; i < 6; i++) { const d = new T.Group(); const b = new T.Mesh(new T.BoxGeometry(1, 0.3, 1), w.m.white2); d.add(b); [[0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]].forEach(([a, c]) => { const p = new T.Mesh(new T.CylinderGeometry(0.4, 0.4, 0.04, 12), w.m.neonCyan); p.position.set(a, 0.2, c); d.add(p); }); w.scene.add(d); const ph = i * 1.3; w.anim.push((dt, t) => { d.position.set(cx + Math.cos(t * 0.3 + ph) * 34, 14 + Math.sin(t * 0.7 + ph) * 3, cz + Math.sin(t * 0.3 + ph) * 26); d.rotation.y = t; }); }
    w.areaGate(-150, 505, Math.PI / 2, "lab");
    w.plazaCrowd(cx, cz, 50, 1.1);
  };
  P.robotStatue = function (x, z, s) {
    const w = this; const B = (k, px, py, pz, sx, sy, sz) => w.box(k, x + px * s, py * s, z + pz * s, sx * s, sy * s, sz * s);
    B("stoneGray", 0, 0, 0, 8, 1.5, 8); B("white2", -1.6, 1.5, 0, 1.6, 6, 1.8); B("white2", 1.6, 1.5, 0, 1.6, 6, 1.8); B("pBlue", 0, 7.5, 0, 5.2, 5, 3); B("white2", 0, 12.5, 0, 3.4, 3, 3);
    B("neonCyan", 0, 13.4, 1.52, 2.4, 0.5, 0.05); B("white2", -3.5, 8, 0, 1.4, 5, 1.4); B("white2", 3.5, 8, 0, 1.4, 5, 1.4); B("gold", 0, 15.5, 0, 0.3, 2, 0.3); B("neonYellow", 0, 9, 1.52, 1.6, 1.6, 0.05);
    w.collider(x - 4 * s, z - 4 * s, x + 4 * s, z + 4 * s); w.caster(x, z, 5 * s, 3 * s, 16 * s);
    w.sign("XR-01", { bg: "#1a2a4a", color: "#fff", px: 512 }, 3 * s, 0.6 * s, x, 0.8 * s, z + 4.05 * s, 0);
  };

  /* ══════════════ 17 XEVARION AQUA ══════════════ */
  P.buildAqua = function () {
    const w = this, cx = -512, cz = 595;
    w.areaZone("aqua");
    w.places.push(["17 AQUA", -380, 640, -Math.PI / 2]);
    w.rect("sandFlat", -640, 472, -388, 718, 0.012);
    w.rect("woodDeck", -600, 520, -430, 690, 0.016);
    /* 波のプール（扇形）・流れるプール（輪）・水上アスレチック */
    { const sh = new T.Shape(); sh.moveTo(0, 0); for (let i = 0; i <= 32; i++) { const a = -Math.PI * 0.35 + i / 32 * Math.PI * 0.7; sh.lineTo(Math.sin(a) * 48, Math.cos(a) * 48); } sh.lineTo(0, 0);
      const g = new T.ShapeGeometry(sh, 1); g.rotateX(-Math.PI / 2); w.water(g, cx + 20, 0.09, cz + 60, "pool"); w.collider(cx + 20 - 30, cz + 60 - 48, cx + 20 + 30, cz + 60 - 10);
      w.box("stoneW", cx + 20, 0, cz + 12, 60, 3, 3, { collide: true }); w.sign("WAVE POOL", { bg: "#1aa8e0", color: "#fff", px: 512 }, 10, 1.6, cx + 20, 3.6, cz + 13.6, 0); }
    { const pts = []; for (let i = 0; i <= 96; i++) { const a = i / 96 * TAU; pts.push([cx + Math.cos(a) * 92, cz + Math.sin(a) * 88]); } const sp = w.river(pts, 8, { kind: "pool" }); }
    w.pool(cx - 50, cz - 30, 34, 18, 0.1, "pool");
    for (let i = 0; i < 7; i++) { const x = cx - 64 + i * 5, z = cz - 30; w.geo(["pRed", "pYellow", "pBlue", "pGreen"][i % 4], new T.CylinderGeometry(1.2, 1.2, 0.5, 12), x, 0.3, z); }
    /* スライダーのお城（カラフルな塔・6本のスライダー） */
    w.slideCastle(cx - 10, cz - 55);
    /* 水の遊び場（大きなバケツ・噴水） */
    { const x = cx + 55, z = cz - 40; w.box("pYellow", x, 0, z, 16, 6, 12, { collide: true }); w.box("pBlue", x, 6, z, 18, 0.6, 14); [[-7, -5], [7, -5], [-7, 5], [7, 5]].forEach(([a, b]) => w.box("pRed", x + a, 6.6, z + b, 1, 5, 1)); w.box("pGreen", x, 11.6, z, 16, 0.5, 12);
      const bucket = new T.Mesh(new T.CylinderGeometry(2.4, 1.8, 3, 16, 1, true), w.m.pOrange); bucket.position.set(x, 14, z); w.scene.add(bucket); w.anim.push((dt, t) => { const k = (t * 0.15) % 1; bucket.rotation.z = k > 0.92 ? Math.sin((k - 0.92) / 0.08 * Math.PI) * 2.2 : 0; });
      w.geo("pRed", new T.CylinderGeometry(0.8, 0.8, 1.2, 16, 1, true, 0, Math.PI).rotateZ(Math.PI / 2), x + 8.8, 3, z); w.caster(x, z, 18, 14, 12); }
    /* カバナ・パラソル・デッキチェア・ヤシ・プールサイドのカフェ */
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, x = cx + Math.cos(a) * 104, z = cz + Math.sin(a) * 100; if (!w.insideIsland(x, z, 12)) continue; w.palm(x, z, 1.1 + (i % 3) * 0.1); }
    for (let i = 0; i < 10; i++) { const x = cx - 60 + i * 12, z = cz + 96; if (!w.insideIsland(x, z, 10)) continue; w.cabana(x, z, i); }
    for (let i = 0; i < 14; i++) { const a = -0.5 + i / 13 * 1.0, x = cx + 20 + Math.sin(a) * 56, z = cz + 60 + Math.cos(a) * 56; w.lounger(x, z, a + Math.PI); }
    w.bld(cx - 63, cz + 45, 22, 14, 7, { key: "hMint", roof: "flat", roofKey: "rGreen", ry: Math.PI / 2, shop: "shopD", sign: { text: "POOLSIDE CAFÉ", bg: "#1aa8e0", w: 10, h: 1.4, y: 3.6 }, inside: { type: "cafe", name: "プールサイドカフェ", menu: "icecream" } });
    for (let i = 0; i < 6; i++) w.cafeTable(cx - 45, cz + 32 + i * 5, ["fabricB", "fabricY"][i % 2]);
    w.areaGate(-386, 640, Math.PI / 2, "aqua");
    w.plazaCrowd(cx, cz + 10, 70, 1.2);
    w.forestOpen.push([cx, cz, 120]);
  };
  P.cabana = function (x, z, i) { const w = this; w.box("woodLight", x, 0, z, 4, 0.3, 4); [[-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8], [1.8, 1.8]].forEach(([a, b]) => w.box("woodLight", x + a, 0, z + b, 0.15, 2.8, 0.15)); w.geo(["fabricW", "fabricB", "fabricY"][i % 3], new T.ConeGeometry(3.2, 1.4, 4).rotateY(Math.PI / 4), x, 3.5, z); w.collider(x - 2, z - 2, x + 2, z + 2); w.seats.push({ x, z: z + 1, yaw: Math.PI, h: 0.46 }); };
  P.lounger = function (x, z, ry) { const w = this; w.detail(() => { w.box("white2", x, 0.3, z, 0.7, 0.1, 1.9, { ry }); const b = new T.BoxGeometry(0.7, 0.1, 0.7); b.rotateX(-0.7); w.geo("white2", b, x + Math.sin(ry) * 0.8, 0.55, z + Math.cos(ry) * 0.8, ry); }); w.seats.push({ x, z, yaw: ry + Math.PI, h: 0.4 }); };
  P.slideCastle = function (x, z) {
    const w = this, H = 26;
    w.box("paleY", x, 0, z, 12, H, 12, { collide: true }); w.box("rOrange", x, H, z, 14, 0.8, 14);
    [[-6, -6], [6, -6], [-6, 6], [6, 6]].forEach(([a, b], i) => w.turret(x + a, z + b, 2.4, H + 4, "paleP", ["rBlue", "rRed", "rTeal", "rPurple"][i], true));
    w.turret(x, z, 3.2, H + 10, "paleB", "rPink", true);
    w.caster(x, z, 14, 14, H + 6);
    const sl = [["pRed", 0, 1, 1.7], ["pBlue", Math.PI / 2, -1, 1.3], ["pYellow", Math.PI, 1, 1.9], ["pGreen", -Math.PI / 2, -1, 1.5], ["pPurple", Math.PI / 4, 1, 1.1], ["pOrange", -Math.PI * 0.75, -1, 2.2]];
    sl.forEach(([key, a0, dir, turns], k) => {
      const pts = []; const top = H - 1 - (k % 3) * 4;
      for (let i = 0; i <= 90; i++) { const t = i / 90, a = a0 + dir * t * TAU * turns, r = 9 + t * (10 + k * 3); pts.push(new T.Vector3(x + Math.cos(a) * r, top - t * (top - 1.2), z + Math.sin(a) * r)); }
      w.geo(key, new T.TubeGeometry(new T.CatmullRomCurve3(pts), 220, 1.1, 10, false), 0, 0, 0);
      for (let i = 0; i < 90; i += 9) { const p = pts[i]; w.box("white2", p.x, 0, p.z, 0.3, p.y, 0.3); }
      const end = pts[90]; w.pond(end.x, end.z, 4, "pool", true);
    });
    w.sign("SPLASH CASTLE", { bg: "#ff5f8f", color: "#fff", px: 512 }, 9, 1.6, x, 8, z + 6.1, 0);
  };

  /* ══════════════ 18 XEVARION BEACH（南西の入り江） ══════════════ */
  P.buildBeach = function () {
    const w = this, a0 = 1.86, a1 = 2.62, N = 120;
    w.areaZone("beach");
    /* 白い砂浜の帯（海岸線にそって） */
    const pos = [], idx = [], uv = [];
    for (let i = 0; i <= N; i++) { const a = a0 + (a1 - a0) * i / N, [x0, z0] = XP.islandPt(a, 1.0), [x1, z1] = XP.islandPt(a, 0.952); pos.push(x1, 0.03, z1, x0, 0.03, z0); uv.push(x1 / 4, z1 / 4, x0 / 4, z0 / 4); }
    for (let i = 0; i < N; i++) { const b = i * 2; idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3); }
    const g = new T.BufferGeometry(); g.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    w.m.sandFlat.side = T.DoubleSide; w.batch.add("sandFlat", w.m.sandFlat, g, new T.Matrix4());
    /* 砂浜の後ろの木道・パラソル・ビーチハウス・ヤシ */
    const walk = []; for (let i = 0; i <= 40; i++) walk.push(XP.islandPt(a0 + 0.02 + (a1 - a0 - 0.04) * i / 40, 0.944));
    w.route(walk, 6, "woodDeck", { lamps: "globe", lampEvery: 30, bushes: false, curb: false });
    const r = X.rnd(808);
    for (let i = 0; i < 70; i++) { const a = a0 + 0.03 + (a1 - a0 - 0.06) * (i + r() * 0.6) / 70, k = 0.962 + r() * 0.028, [x, z] = XP.islandPt(a, k); if (i % 3 === 0) w.umbrellaSet(x, z, a, i); else if (i % 3 === 1) w.lounger(x, z, a + Math.PI / 2); }
    for (let i = 0; i < 36; i++) { const a = a0 + (a1 - a0) * (i + 0.5) / 36, [x, z] = XP.islandPt(a, 0.955 + (i % 2) * 0.008); w.palm(x, z, 1.1 + (i % 4) * 0.12); }
    for (let i = 0; i < 9; i++) { const a = a0 + 0.08 + (a1 - a0 - 0.16) * i / 8, [x, z] = XP.islandPt(a, 0.93); const ry = -a + Math.PI / 2 + Math.PI; w.bld(x, z, 9, 7, 4.5, { key: ["sBlue", "sPink", "sYellow", "sMint", "sWhite"][i % 5], roof: "gable", roofKey: ["rTeal", "rRed", "rBlue", "rOrange"][i % 4], rh: 2.4, ry, sign: { text: ["BEACH HOUSE", "SURF SHOP", "SHAVED ICE", "BEACH BAR", "RENTAL", "JUICE", "SNACK", "LIFEGUARD", "SUNSET GRILL"][i], bg: "#1aa8e0", w: 6, h: 0.9, y: 3.2 }, inside: { h: 3.6, type: ["cafe", "shop", "food", "food", "shop", "cafe", "food", "lobby", "food"][i], menu: ["cafe", null, "icecream", "bar", null, "cafe", "takoyaki", null, "diner"][i], name: ["ビーチハウス", "サーフショップ", "かき氷", "ビーチバー", "レンタル", "ジュース", "スナック", "ライフガード", "サンセットグリル"][i], items: i === 1 ? [["サーフボード", 28000, "波に乗ろう"], ["ラッシュガード", 4800, "日焼け止め"], ["ビーチサンダル", 1500, "カラフル"], ["日焼け止め", 900, "SPF50"]] : i === 4 ? [["パラソル（1日）", 800, "日かげを作る"], ["浮き輪（1日）", 500, "大きなドーナツ"], ["ビーチボール", 300, "みんなで遊ぼう"], ["シュノーケル", 1200, "海の中をのぞく"]] : undefined, actLabel: i === 7 ? "ライフガードに海の安全を聞く" : undefined, text: i === 7 ? "泳ぐときはブイの内側で。困ったら手をふってね！" : undefined } }); }
    /* ライフガードの塔・ビーチバレー */
    [[2.0, 0.978], [2.35, 0.978]].forEach(([a, k]) => { const [x, z] = XP.islandPt(a, k); w.box("white2", x, 0, z, 0.2, 3, 0.2); w.box("pRed", x, 3, z, 2, 1.6, 2); w.geo("pWhite", new T.ConeGeometry(1.8, 0.8, 4).rotateY(Math.PI / 4), x, 5, z); w.collider(x - 1, z - 1, x + 1, z + 1); });
    { const [x, z] = XP.islandPt(2.18, 0.972); w.box("white2", x - 4.5, 0, z, 0.12, 2.4, 0.12); w.box("white2", x + 4.5, 0, z, 0.12, 2.4, 0.12); w.box("fabricW", x, 1.6, z, 9, 0.9, 0.04); }
    /* 桟橋と夕日の展望デッキ（海の上へ・歩ける） */
    { const a = 2.24, [x0, z0] = XP.islandPt(a, 0.975), [x1, z1] = XP.islandPt(a, 1.1), L = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(x1 - x0, z1 - z0), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      w.geo("woodDeck", new T.BoxGeometry(5, 0.3, L), cx, 0.2, cz, ang);
      for (let d = 0; d < L; d += 6) { const px = x0 + Math.sin(ang) * d, pz = z0 + Math.cos(ang) * d; [-2.3, 2.3].forEach((o) => { w.geo("woodDark", new T.CylinderGeometry(0.2, 0.2, 4, 6), px + Math.cos(ang) * o, -1.4, pz - Math.sin(ang) * o); w.detail(() => w.geo("woodLight", new T.BoxGeometry(0.1, 1.0, 6), px + Math.cos(ang) * o, 1.2, pz - Math.sin(ang) * o, ang)); }); }
      w.geo("woodDeck", new T.CylinderGeometry(14, 14, 0.4, 32), x1, 0.15, z1);
      for (let i = 0; i < 12; i++) { const b = i / 12 * TAU; w.bench(x1 + Math.cos(b) * 11, z1 + Math.sin(b) * 11, -b + Math.PI / 2); }
      w.geo("white2", new T.CylinderGeometry(1.4, 2, 12, 16), x1, 6.6, z1); w.geo("pRed", new T.CylinderGeometry(2.2, 2.2, 2, 16), x1, 13.4, z1); w.geo("lampGlow", new T.SphereGeometry(1, 12, 8), x1, 15, z1); w.geo("pRed", new T.ConeGeometry(2.4, 2, 16), x1, 16.6, z1);
      w.walkable = (w.walkable || []).concat([{ cx, cz, ang, hw: 2.4, hl: L / 2 + 1 }, { cx: x1, cz: z1, r: 13.5 }]);
      w.heightExtra = (w.heightExtra || []).concat([{ cx, cz, ang, hw: 2.6, hl: L / 2, y: 0.35 }, { cx: x1, cz: z1, r: 14, y: 0.35 }]);
      w.places.push(["18 BEACH（夕日の桟橋）", x0 + Math.sin(ang) * 20, z0 + Math.cos(ang) * 20, ang]);
      w.plazaCrowd(x1, z1, 10, 1.5); }
    /* ヨット（入り江に浮かぶ） */
    for (let i = 0; i < 6; i++) { const [x, z] = XP.islandPt(2.0 + i * 0.1, 1.1 + (i % 2) * 0.05); const g = new T.Group(); const h = new T.Mesh(new T.BoxGeometry(2.4, 1, 7), w.m.white2); h.position.y = 0.3; g.add(h); const s = new T.Mesh(new T.ConeGeometry(2.6, 9, 3), w.m.fabricW); s.position.set(0, 5.4, 0.6); g.add(s); g.position.set(x, -0.4, z); g.rotation.y = i; w.scene.add(g); w.loose(g, 420); const ph = i; w.anim.push((dt, t) => { g.position.y = -0.4 + Math.sin(t * 1.2 + ph) * 0.15; g.rotation.z = Math.sin(t * 0.9 + ph) * 0.05; }); }
    const [bx, bz] = XP.islandPt(2.24, 0.95); w.npcSpots.beach = [[bx, bz, 0]];
    w.places.push(["18 BEACH", bx, bz, 2.24 + Math.PI / 2]);
    for (let i = 0; i < 8; i++) { const [x, z] = XP.islandPt(a0 + (a1 - a0) * (i + 0.5) / 8, 0.975); w.plazaCrowd(x, z, 14, 1.2); }
  };
  P.umbrellaSet = function (x, z, a, i) { const w = this; w.detail(() => { w.geo("white2", new T.CylinderGeometry(0.04, 0.04, 2.6, 5), x, 1.3, z); w.geo(["fabricR", "fabricB", "fabricY", "fabricW", "awningP"][i % 5], new T.ConeGeometry(1.6, 0.6, 12), x, 2.6, z); }); w.lounger(x + Math.cos(a) * 1.2, z + Math.sin(a) * 1.2, a + Math.PI / 2); };

  /* ══════════════ 7 XEVARION ADVENTURE ══════════════ */
  P.buildAdventure = function () {
    const w = this, mx = -525, mz = -300;
    w.areaZone("adv");
    w.places.push(["7 ADVENTURE", -420, -150, 0]);
    w.mountain(mx, mz, 78, 118);
    w.coaster(mx, mz, "railRed", 118, [0x3a78e8, 0xffd23a, 0xe0485a, 0x4fd88a, 0xff8a3a], 0.9);
    w.loopCoaster(-350, -200);
    w.dropTower2(-640, -170, 70);
    w.ropeBridge(-492, -193, -446, -210);
    w.flume(-600, -440);
    w.temple(-350, -322);
    for (let i = 0; i < 26; i++) { const a = i / 26 * TAU; w.plant(i % 3 ? "palm" : "oak", mx + Math.cos(a) * 94, mz + Math.sin(a) * 90, 1.1 + (i % 3) * 0.15); }
    w.areaGate(-470, -140, Math.PI, "adv", "big");
    w.plazaCrowd(-450, -190, 40, 1.1);
  };
  P.mountain = function (x, z, r, h) {
    const w = this;
    const mk = (R, H, seg, seed) => {
      const g = new T.ConeGeometry(R, H, 40, seg), pp = g.attributes.position;
      for (let i = 0; i < pp.count; i++) { const px = pp.getX(i), py = pp.getY(i), pz = pp.getZ(i), a = Math.atan2(pz, px), t = (py + H / 2) / H; const n = Math.sin(a * 5 + seed) * 0.1 + Math.sin(a * 11 + py * 0.15 + seed) * 0.06 + Math.sin(py * 0.3 + a * 3) * 0.05 + (t > 0.85 ? 0.12 : 0); const k = 1 + n * (t < 0.98 ? 1 : 0); pp.setXYZ(i, px * k, py + Math.sin(a * 7 + seed) * H * 0.02 * t, pz * k); }
      g.computeVertexNormals(); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 10, uv.getY(i) * 7); return g;
    };
    w.geo("rockRed", mk(r, h, 16, 1), x, h / 2 - 1, z);
    w.geo("rock", mk(r * 0.62, h * 0.72, 10, 3), x + r * 0.6, h * 0.36 - 1, z + r * 0.3);
    w.geo("rockRed", mk(r * 0.5, h * 0.55, 10, 5), x - r * 0.55, h * 0.275 - 1, z - r * 0.35);
    w.colCircle(x, z, r * 0.93); w.colCircle(x + r * 0.6, z + r * 0.3, r * 0.58); w.colCircle(x - r * 0.55, z - r * 0.35, r * 0.47); w.casterCircle(x, z, r * 0.8, h * 0.6);
    /* 頂上の神殿 */
    const ty = h - 8; w.box("stoneBeige", x, ty, z, 16, 2, 16); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; w.geo("stoneBeige", new T.CylinderGeometry(0.7, 0.8, 8, 10), x + Math.cos(a) * 6.5, ty + 6, z + Math.sin(a) * 6.5); } w.geo("gold", new T.ConeGeometry(9, 5, 8), x, ty + 12.5, z);
    /* 滝と滝つぼ */
    const fc = X.cv(64, 256), fg = fc.getContext("2d"); fg.fillStyle = "rgba(220,245,255,.4)"; fg.fillRect(0, 0, 64, 256); for (let i = 0; i < 50; i++) { fg.fillStyle = "rgba(255,255,255," + (0.3 + Math.random() * 0.6) + ")"; fg.fillRect(Math.random() * 64, 0, 2 + Math.random() * 4, 256); }
    const ft = X.tex(fc); ft.wrapT = T.RepeatWrapping;
    const fall = new T.Mesh(new T.PlaneGeometry(14, h * 0.62), new T.MeshBasicMaterial({ map: ft, color: 0xcff0ff, transparent: true, opacity: 0.9, side: T.DoubleSide, depthWrite: false })); const fa = 1.15;
    fall.position.set(x + r * 0.5 * Math.cos(fa), h * 0.31, z + r * 0.5 * Math.sin(fa)); fall.lookAt(x + r * 3 * Math.cos(fa), h * 0.31, z + r * 3 * Math.sin(fa)); fall.rotateX(-0.3); w.scene.add(fall);
    w.pond(x + (r + 8) * Math.cos(fa), z + (r + 8) * Math.sin(fa), 16, "canal");
    w.anim.push((dt, t) => { ft.offset.y = -t * 1.3; });
    const mist = new T.Mesh(new T.SphereGeometry(8, 16, 8), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, depthWrite: false })); mist.scale.y = 0.4; mist.position.set(x + (r + 4) * Math.cos(fa), 2, z + (r + 4) * Math.sin(fa)); w.scene.add(mist);
    w.mountainAt = { x, z, r, h };
  };
  P.coaster = function (x, z, key, H, carCols, spd) {
    const w = this, C = [];
    for (let i = 0; i < 28; i++) { const a = i / 28 * TAU, r = 100 + Math.sin(a * 3) * 18, y = 6 + Math.max(0, Math.sin(a * 2 + 0.6)) * H * 0.42 + Math.max(0, Math.sin(a * 5)) * 10; C.push(new T.Vector3(x + Math.cos(a) * r, y, z + Math.sin(a) * r * 0.9)); }
    const curve = new T.CatmullRomCurve3(C, true, "centripetal"), N = 500, pts = curve.getSpacedPoints(N);
    const railG = (off) => { const pp = pts.map((p, i) => { const q = pts[(i + 1) % N], d = new T.Vector3().subVectors(q, p).normalize(), n = new T.Vector3(-d.z, 0, d.x); return p.clone().addScaledVector(n, off); }); return new T.TubeGeometry(new T.CatmullRomCurve3(pp, true), 900, 0.22, 6, true); };
    w.geo(key, railG(0.8), 0, 0, 0); w.geo(key, railG(-0.8), 0, 0, 0);
    for (let i = 0; i < N; i += 7) { const p = pts[i]; if (p.y > 3) w.box("white2", p.x, 0, p.z, 0.55, p.y, 0.55); }
    w.detail(() => { for (let i = 0; i < N; i += 2) { const p = pts[i], q = pts[(i + 1) % N], g = new T.BoxGeometry(2, 0.14, 0.3); g.rotateY(Math.atan2(q.x - p.x, q.z - p.z)); w.batch.add("darkMetal", w.m.darkMetal, g, new T.Matrix4().makeTranslation(p.x, p.y - 0.1, p.z), true); } });
    const cars = carCols.map((c) => { const m = new T.Mesh(new T.BoxGeometry(2.2, 1.2, 3), new T.MeshStandardMaterial({ color: c, roughness: 0.35, metalness: 0.3 })); w.scene.add(m); w.loose(m, 500); return m; });
    let u = Math.random();
    w.anim.push((dt) => { const p = curve.getPointAt(u), prevY = curve.getPointAt((u + 0.997) % 1).y, sp = (0.01 + Math.max(0, prevY - p.y) * 0.004 + Math.max(0, H * 0.4 - p.y) * 0.0002) * (spd || 1); u = (u + dt * sp) % 1; cars.forEach((c, i) => { const uu = (u - i * 0.0075 + 1) % 1, pp = curve.getPointAt(uu), q = curve.getPointAt((uu + 0.002) % 1); c.position.set(pp.x, pp.y + 0.8, pp.z); c.lookAt(q.x, q.y + 0.8, q.z); }); });
  };
  /* 宙返りのあるコースター（黄色） */
  P.loopCoaster = function (x, z) {
    const w = this, C = [];
    const addLoop = (cx, cz, R, n) => { for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + i / n * TAU; C.push(new T.Vector3(cx + Math.cos(a) * R * 0.25 + (i / n - 0.5) * 6, R + Math.sin(a) * R + 2, cz + Math.cos(a) * R)); } };
    C.push(new T.Vector3(x - 60, 4, z + 30), new T.Vector3(x - 30, 30, z + 30), new T.Vector3(x, 38, z + 20), new T.Vector3(x + 20, 8, z));
    addLoop(x + 30, z - 20, 13, 16);
    C.push(new T.Vector3(x + 30, 4, z - 60), new T.Vector3(x, 18, z - 70), new T.Vector3(x - 40, 10, z - 40), new T.Vector3(x - 70, 6, z));
    const curve = new T.CatmullRomCurve3(C, true, "centripetal"), N = 500, pts = curve.getSpacedPoints(N);
    const up = new T.Vector3(0, 1, 0);
    const railG = (off) => { const pp = pts.map((p, i) => { const q = pts[(i + 1) % N], d = new T.Vector3().subVectors(q, p).normalize(), n = new T.Vector3().crossVectors(d, up); if (n.lengthSq() < 1e-4) n.set(1, 0, 0); n.normalize(); return p.clone().addScaledVector(n, off); }); return new T.TubeGeometry(new T.CatmullRomCurve3(pp, true), 900, 0.24, 6, true); };
    w.geo("railYellow", railG(0.8), 0, 0, 0); w.geo("railYellow", railG(-0.8), 0, 0, 0);
    for (let i = 0; i < N; i += 8) { const p = pts[i]; if (p.y > 3) w.box("rail", p.x, 0, p.z, 0.5, p.y - 0.4, 0.5); }
    const cars = [0xff5f8f, 0x5ab8ff, 0xffd24a, 0x7ce0a0].map((c) => { const m = new T.Mesh(new T.BoxGeometry(2.2, 1.1, 2.8), new T.MeshStandardMaterial({ color: c, roughness: 0.35, metalness: 0.3 })); w.scene.add(m); w.loose(m, 500); return m; });
    let u = 0;
    w.anim.push((dt) => { const p = curve.getPointAt(u); u = (u + dt * (0.018 + Math.max(0, 30 - p.y) * 0.0006)) % 1; cars.forEach((c, i) => { const uu = (u - i * 0.007 + 1) % 1, pp = curve.getPointAt(uu), q = curve.getPointAt((uu + 0.002) % 1); c.position.set(pp.x, pp.y + 0.7, pp.z); c.lookAt(q.x, q.y + 0.7, q.z); }); });
    w.sign("SKY FALCON", { bg: "#ffc830", color: "#1a1a2a", px: 512 }, 8, 1.4, x - 60, 3, z + 34, 0);
  };
  P.dropTower2 = function (x, z, H) {
    const w = this;
    w.geo("white2", new T.CylinderGeometry(1.8, 2.4, H, 12), x, H / 2, z); w.geo("railRed", new T.CylinderGeometry(3.2, 3.2, 2.4, 16), x, H + 1.2, z); w.geo("neonYellow", new T.TorusGeometry(3.3, 0.15, 6, 32).rotateX(Math.PI / 2), x, H + 2.4, z);
    w.colCircle(x, z, 3.4); w.caster(x, z, 5, 5, H);
    const ring = new T.Mesh(new T.CylinderGeometry(5, 5, 1.8, 24, 1, true), new T.MeshStandardMaterial({ color: 0x3a8aff, roughness: 0.4, side: T.DoubleSide })); ring.position.set(x, 4, z); w.scene.add(ring);
    w.anim.push((dt, t) => { const k = (t * 0.07) % 1; ring.position.y = k < 0.65 ? 3 + k / 0.65 * (H - 8) : (H - 5) - Math.pow((k - 0.65) / 0.35, 2) * (H - 8); ring.rotation.y = t * 0.2; });
    w.sign("FREE FALL", { bg: "#e0302a", color: "#fff", px: 512 }, 6, 1.2, x, 2.4, z + 2.6, 0);
  };
  P.ropeBridge = function (x0, z0, x1, z1) {
    const w = this, L = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(x1 - x0, z1 - z0);
    [[x0, z0], [x1, z1]].forEach(([x, z]) => { w.geo("rockRed", new T.CylinderGeometry(6, 8, 22, 9), x, 11, z); w.colCircle(x, z, 8.1); w.casterCircle(x, z, 7, 22); });
    const pts = []; for (let i = 0; i <= 20; i++) { const t = i / 20; pts.push([x0 + (x1 - x0) * t, 22 - Math.sin(t * Math.PI) * 3, z0 + (z1 - z0) * t]); }
    for (let i = 0; i < 20; i++) { const [x, y, z] = pts[i]; w.geo("woodLight", new T.BoxGeometry(2.6, 0.12, L / 20 * 0.8), x, y, z, ang); }
    [-1.4, 1.4].forEach((o) => { const cv = new T.CatmullRomCurve3(pts.map(([x, y, z]) => new T.Vector3(x + Math.cos(ang) * o, y + 1.1, z - Math.sin(ang) * o))); w.geo("woodDark", new T.TubeGeometry(cv, 40, 0.06, 4, false), 0, 0, 0); });
  };
  P.flume = function (x, z) {
    const w = this, C = [];
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; C.push(new T.Vector3(x + Math.cos(a) * 34, i < 3 ? 20 - i * 6 : i > 12 ? 2 + (i - 12) * 5 : 2 + Math.sin(a * 2) * 1.5, z + Math.sin(a) * 26)); }
    const curve = new T.CatmullRomCurve3(C, true, "centripetal"), pts = curve.getSpacedPoints(200);
    w.geo("woodLight", new T.TubeGeometry(curve, 400, 2.2, 8, true), 0, 0, 0);
    for (let i = 0; i < 200; i += 8) { const p = pts[i]; if (p.y > 2) w.box("woodDark", p.x, 0, p.z, 0.5, p.y - 1.5, 0.5); }
    const logs = [0, 1, 2].map(() => { const l = new T.Mesh(new T.CapsuleGeometry(0.8, 2.6, 4, 8), w.m.woodDark); l.rotation.x = Math.PI / 2; const g = new T.Group(); g.add(l); w.scene.add(g); w.loose(g, 300); return g; });
    let u = 0; w.anim.push((dt) => { u = (u + dt * 0.02) % 1; logs.forEach((g, i) => { const uu = (u + i / 3) % 1, p = curve.getPointAt(uu), q = curve.getPointAt((uu + 0.003) % 1); g.position.set(p.x, p.y + 0.4, p.z); g.lookAt(q.x, q.y + 0.4, q.z); }); });
    w.sign("JUNGLE FLUME", { bg: "#2a8a3a", color: "#fff", px: 512 }, 8, 1.4, x, 3, z + 28, 0);
  };
  P.temple = function (x, z) {
    const w = this;
    for (let i = 0; i < 4; i++) w.box("stoneBeige", x, i * 4, z, 44 - i * 9, 4, 36 - i * 7, { collide: i === 0 });
    w.box("castleDark", x, 0, z + 18.1, 8, 7, 0.4); w.caster(x, z, 44, 36, 16);
    for (let i = -2; i <= 2; i++) { w.geo("stoneBeige", new T.CylinderGeometry(0.9, 1.0, 9, 10), x + i * 8, 4.5, z + 20); }
    w.geo("gold", new T.ConeGeometry(4, 5, 4).rotateY(Math.PI / 4), x, 18.5, z);
    w.sign("LOST RUINS", { bg: "#6a4a2a", color: "#ffe7a8", px: 512 }, 12, 1.8, x, 9.5, z + 18.4, 0);
    for (let i = 0; i < 8; i++) w.geo("stoneBeige", new T.CylinderGeometry(0.8, 0.9, 2 + (i % 3) * 2, 8), x - 30 + (i % 4) * 5, 1 + (i % 3), z + 24 + Math.floor(i / 4) * 6);
  };

  /* ══════════════ 10 XEVARION ENTERTAINMENT DISTRICT ══════════════ */
  P.buildEntertainment = function () {
    const w = this, lx = -330, lz = -45;
    w.areaZone("ent");
    w.places.push(["10 ENTERTAINMENT", -250, 100, Math.PI]);
    w.rect("walkCream", -265, -128, -236, 84, 0.012); w.rect("walkCream", -300, -30, -265, 20, 0.012); w.rect("walkY", -236, -40, -214, 50, 0.012); w.rect("walkY", -236, -112, -214, -40, 0.012); w.rect("walkCream", -430, 20, -380, 80, 0.012);
    /* 湖と、水の上の大きな野外ステージ（曲面の屋根・画面・光の柱） */
    w.pond(lx, lz, 36, "lake");
    { const sx = lx - 40, sz = lz;
      w.box("stageTop", sx, 0, sz, 22, 1.6, 34, { collide: true }); w.box("neonPurple", sx + 11.05, 0.2, sz, 0.1, 1.2, 34);
      const shell = new T.SphereGeometry(20, 32, 16, -Math.PI / 2, Math.PI, 0, Math.PI / 2); shell.scale(0.8, 1.05, 1.05); w.geo("white2", shell, sx - 4, 1.6, sz);
      for (let i = 0; i < 7; i++) { const t = new T.TorusGeometry(20.2 - i * 0.02, 0.3, 4, 32, Math.PI); t.rotateY(Math.PI / 2); t.scale(0.8, 1.05, 1.05); t.rotateZ(0); w.geo(i % 2 ? "neonPink" : "neonCyan", t.clone().scale(1 - i * 0.07, 1 - i * 0.07, 1 - i * 0.07), sx - 4, 1.6, sz); }
      w.caster(sx - 4, sz, 34, 42, 20);
      w.stageScreen = w.bigScreen(sx - 12, 11, sz, Math.PI / 2, 22, 11, "XEVARION LIVE", ["TONIGHT 19:00", "Connect Everything.", "LIVE STAGE ON THE LAKE"], ["#3a0a5a", "#0a2a6a"]);
      [-17, 17].forEach((o) => { w.box("black", sx + 6, 1.6, sz + o, 3, 12, 3, { collide: true }); w.box("neonPink", sx + 7.55, 3, sz + o, 0.05, 9, 2.4); });
      for (let i = 0; i < 6; i++) w.spotBeam(sx + 8, 20, sz - 15 + i * 6, [0xff4fb0, 0x4ff0ff, 0xa86aff][i % 3], (i - 2.5) * 0.12);
      w.interact(lx + 46, lz, 6, "ステージの大画面で動画を見る（YouTube）", () => ({ video: "stage" }), "🎬");
      w.videoSpots = (w.videoSpots || {}); w.videoSpots.stage = { scr: w.stageScreen, cam: [lx + 26, 4.2, lz], look: [sx - 12, 11, sz] };
    }
    /* 湖の東の客席（半円の段） */
    /* ★ 2026-09-29 客席の段は上って座れる（前は宙に浮いた板で、足がめりこんでいた）。段の面（縦）もつける */
    for (let k = 0; k < 5; k++) {
      const y = 0.25 + k * 0.5, r0 = 40 + k * 3, r1 = 43 + k * 3, t = new T.RingGeometry(r0, r1, 48, 1, -Math.PI * 0.42, Math.PI * 0.84); t.rotateX(-Math.PI / 2); w.batch.add("stoneW", w.m.stoneW, t, new T.Matrix4().makeTranslation(lx, y, lz));
      const rs = new T.CylinderGeometry(r0, r0, 0.5, 48, 1, true, Math.PI * 0.08, Math.PI * 0.84); w.batch.add("stoneW", w.m.stoneW, rs, new T.Matrix4().makeTranslation(lx, y - 0.25, lz));
      w.heightExtra = (w.heightExtra || []).concat([{ ring: 1, cx: lx, cz: lz, r0, r1, a0: -Math.PI * 0.42, aw: Math.PI * 0.84, y }]);
      for (let i = 0; i < 24; i++) { const a = -Math.PI * 0.4 + i / 23 * Math.PI * 0.8; w.seats.push({ x: lx + Math.cos(a) * (r0 + 0.35), z: lz + Math.sin(a) * (r0 + 0.35), yaw: Math.atan2(-Math.cos(a), -Math.sin(a)), h: y + 0.02 }); }
    }
    { const rs = new T.CylinderGeometry(55, 55, 2.5, 48, 1, true, Math.PI * 0.08, Math.PI * 0.84); w.batch.add("stoneW", w.m.stoneW, rs, new T.Matrix4().makeTranslation(lx, 1.25, lz)); }
    /* 劇場・ライブハウス・ダンスステージ・映画館・ショードーム・レストラン */
    w.bld(-205, 20, 44, 28, 20, { key: "sRed", roof: "hip", roofKey: "kwR", rh: 9, crown: "neonYellow", ry: -Math.PI / 2, sign: { text: "XEVARION THEATER", bg: "#8a1a2a", w: 24, h: 2.6, y: 15, glow: "#ffe04a" }, inside: { type: "theater", name: "XEVARION 劇場", h: 12, door: 5, video: "playhouse", screenTitle: "XEVARION 劇場" } });
    { const x = -219.6, z = 20; w.box("gold", x - 2, 6, z, 4, 0.8, 30); w.detail(() => { for (let i = -14; i <= 14; i += 1.2) w.geo("lampGlow", new T.SphereGeometry(0.14, 6, 4), x - 4, 6.2, z + i); });
      [-9, 0, 9].forEach((dz) => w.lantern(x - 4.5, 1.8, z + dz, 2.0, dz ? "lanR2" : "lanBig", -Math.PI / 2)); w.sign("XEVARION 劇場", { bg: "#3a0a10", color: "#ffe7a0", glow: "#ffb04a", border: "#f2c04a", px: 512, both: false }, 6, 1.3, x - 0.2, 21.8, z, -Math.PI / 2); }
    /* ★★ 2026-09-29 ライブアリーナ（屋内・=LOVE などの映像をライブ会場のように。演出は park_shows.js） */
    /* ★ 2026-09-29b 大きなライブは XEVARION DOME（park_dome.js）へ。ここは小さなライブハウス */
    w.bld(-178, -74, 44, 40, 16, { key: "gDark", roof: "flat", crown: "neonPink", ry: -Math.PI / 2, sign: { text: "LIVE HOUSE XEVA", bg: "#10061e", glow: "#ff4fb0", w: 18, h: 2.2, y: 12 }, inside: { type: "karaoke", name: "ライブハウス XEVA", h: 7, door: 5 } });
    { const x = -300, z = -118; w.box("stageTop", x, 0, z, 26, 1.2, 18, { collide: true }); const led = new T.Mesh(new T.PlaneGeometry(24, 16, 12, 8), new T.MeshBasicMaterial({ vertexColors: true, toneMapped: false })); led.rotation.x = -Math.PI / 2; led.position.set(x, 1.22, z);
      const cc = new Float32Array(led.geometry.attributes.position.count * 3); led.geometry.setAttribute("color", new T.BufferAttribute(cc, 3)); w.scene.add(led); const hc = new T.Color();
      w.anim.push((dt, t) => { const p = led.geometry.attributes.position; for (let i = 0; i < p.count; i++) { hc.setHSL((p.getX(i) * 0.02 + p.getY(i) * 0.03 + t * 0.2) % 1, 0.9, 0.5 + 0.2 * Math.sin(t * 3 + i)); cc[i * 3] = hc.r * 1.6; cc[i * 3 + 1] = hc.g * 1.6; cc[i * 3 + 2] = hc.b * 1.6; } led.geometry.attributes.color.needsUpdate = true; });
      w.sign("DANCE STAGE", { bg: "#2a0a4a", color: "#fff", glow: "#4ff0ff", px: 512 }, 10, 1.6, x, 5, z - 9.1, Math.PI); w.box("darkMetal", x - 12, 0, z - 8, 0.4, 7, 0.4); w.box("darkMetal", x + 12, 0, z - 8, 0.4, 7, 0.4); w.box("darkMetal", x, 7, z - 8, 24.4, 0.4, 0.4); }
    w.bld(-400, 50, 36, 26, 16, { key: "gPurple", roof: "flat", crown: "neonPink", ry: Math.PI / 2, sign: { text: "CINEMA HALL", bg: "#2a0a4a", w: 16, h: 2.2, y: 12, glow: "#ff4fb0" }, inside: { type: "theater", name: "シネマホール", h: 10, door: 4, video: "cinemahall" } });
    w.dome(-420, -100, 18, "glassDomeP", "neonPink"); w.sign("SHOW DOME", { bg: "#3a0a5a", color: "#fff", glow: "#a86aff", px: 512 }, 10, 1.6, -420 + 17, 3, -100, Math.PI / 2);
    /* 大提灯の食堂（提灯そのものが建物）とまわりの屋台 */
    w.lanternBldg(-300, 52, 8.5, 13, { door: "diner", doorA: Math.PI / 2, name: "大提灯食堂" });
    w.sign("大提灯食堂  LANTERN DINER", { bg: "#1a0a0a", color: "#ffe7a0", glow: "#ffb04a", border: "#f2c04a", px: 1024 }, 11, 1.4, -300, 3.2, 52 + 8.7, 0);
    [[-322, 70, Math.PI, "お好み焼き", "norO", "ramen"], [-278, 70, Math.PI, "ベビーカステラ", "norR", "donut"], [-322, 34, 0, "フランクフルト", "norK", null], [-278, 34, 0, "フルーツ飴", "norP", "icecream"]].forEach(([x, z, ry, n, nr, pr]) => w.yatai(x, z, ry, n, nr, pr));
    for (let i = 0; i < 6; i++) w.cafeTable(-312 + i * 5, 78, ["fabricR", "fabricY"][i % 2]);
    /* エンタメの塔（5重の塔）・劇場の瓦屋根と大きな提灯・川の太鼓橋 */
    w.pagodaTower(-412, -18, 11, 5, { roofKey: "kwK" });
    w.taikoBridge(-437.5, -152.5, 2.23, 15, 4.2, 1.5);
    /* 光のアーチの通り（南北の大通り） */
    for (let i = 0; i < 9; i++) { const x = -250, z = 70 - i * 23; const a = new T.TorusGeometry(7, 0.25, 6, 32, Math.PI); w.geo(["neonPink", "neonCyan", "neonYellow", "neonPurple"][i % 4], a, x, 0, z, 0); }
    w.areaGate(-250, 88, 0, "ent", "big");
    w.plazaCrowd(lx + 45, lz, 25, 2.2); w.plazaCrowd(-250, -20, 60, 1.0);
    w.river([[-480, -232], [-455, -175], [-420, -130], [-385, -95], [-350, -62]], 9, { kind: "canal" });
  };
})();
