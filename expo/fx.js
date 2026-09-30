/* ══════════════════════════════════════════════════════════════════
   XEVARION PARK — 見た目の仕上げ（★ 2026-09-28d ご指定「ワールドは遠慮せず最高品質で」）
   ------------------------------------------------------------------
   ・空：高さで変わる色・太陽・流れる雲（シェーダー）・夕方・夜（星と月）。空はカメラについて来る（遠くで切れない）。
   ・映りこみ：空から作った環境マップ（ガラスのビルに空と雲が映る）。昼・夕・夜が変わったら作り直す。
   ・光のにじみ（ブルーム）：明るい所（太陽・ネオン・夜の窓・街灯）が光ってにじむ。HDR で描いてから色調を整える。
   ・昼／夕方／夜：光・空・霧・海・窓の明かり（emissive）・街灯の光だまり をまとめて切りかえる（2.5 秒でなめらかに）。
   ・スマホはブルームなし（そのまま描く）。
   ══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const T = THREE;

  /* ══════════════ 空 ══════════════ */
  const SKY_VS = "varying vec3 vd; void main(){ vd = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }";
  const SKY_FS = [
    "uniform vec3 sun; uniform vec3 moon; uniform float uDay, uDusk, uNight, uTime, uCloud, uSunK; varying vec3 vd;",
    "float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }",
    "float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);",
    "  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }",
    "float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 6; i++){ v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return v; }",
    "void main(){",
    "  vec3 d = normalize(vd); float h = d.y;",
    "  vec3 zen = vec3(0.10, 0.34, 0.82) * uDay + vec3(0.16, 0.18, 0.42) * uDusk + vec3(0.006, 0.012, 0.04) * uNight;",
    "  vec3 mid = vec3(0.30, 0.58, 0.95) * uDay + vec3(0.62, 0.36, 0.48) * uDusk + vec3(0.02, 0.035, 0.09) * uNight;",
    "  vec3 hor = vec3(0.74, 0.87, 0.99) * uDay + vec3(1.05, 0.56, 0.34) * uDusk + vec3(0.06, 0.09, 0.2) * uNight;",
    "  float t = clamp(h, 0.0, 1.0);",
    "  vec3 c = mix(hor, mid, smoothstep(0.0, 0.25, t)); c = mix(c, zen, smoothstep(0.2, 0.95, t));",
    "  c = mix(c, hor * 0.92, smoothstep(0.0, -0.2, h));",
    "  vec3 sd = normalize(sun); float s = max(dot(d, sd), 0.0);",
    "  float dayish = uDay + uDusk;",
    "  c += (vec3(1.0, 0.92, 0.75) * pow(s, 6.0) * 0.28 + vec3(1.0, 0.97, 0.9) * pow(s, 1200.0) * 40.0 * uSunK) * dayish;",
    "  c += vec3(1.0, 0.45, 0.2) * pow(s, 3.0) * 0.45 * uDusk;",
    "  vec3 md = normalize(moon); float m = max(dot(d, md), 0.0);",
    "  c += (vec3(0.9, 0.93, 1.0) * smoothstep(0.99955, 0.9998, m) * 6.0 + vec3(0.35, 0.45, 0.8) * pow(m, 50.0) * 0.35) * uNight;",
    "  if (h > 0.0 && uNight > 0.01) { vec2 sp = d.xz / (d.y + 0.35) * 220.0; vec2 cell = floor(sp); float r = hash(cell);",
    "    float st = smoothstep(0.9965, 1.0, r) * (0.55 + 0.45 * sin(uTime * 2.3 + r * 60.0));",
    "    c += vec3(0.9, 0.95, 1.0) * st * uNight * smoothstep(0.02, 0.25, h) * 2.2; }",
    "  if (h > -0.02) {",
    "    vec2 cp = d.xz / (max(d.y, 0.0) + 0.1) * 0.9 + vec2(uTime * 0.0035, uTime * 0.0012);",
    "    float n = fbm(cp * 1.5);",
    "    float cov = smoothstep(0.52 - uCloud * 0.1, 0.8, n) * smoothstep(-0.02, 0.2, h);",
    "    float th = fbm(cp * 3.2 + 4.0);",
    "    vec3 toSun = normalize(vec3(sd.x, 0.0, sd.z) + 1e-4); float side = 0.5 + 0.5 * dot(normalize(vec3(d.x, 0.0, d.z) + 1e-4), toSun);",
    "    vec3 lit = mix(vec3(0.78, 0.83, 0.9), vec3(1.08, 1.06, 1.02), clamp(th * 1.3 - 0.1 + side * 0.25, 0.0, 1.0));",
    "    vec3 cc = lit * uDay + mix(vec3(0.55, 0.32, 0.42), vec3(1.2, 0.72, 0.45), side) * uDusk + vec3(0.09, 0.1, 0.16) * uNight;",
    "    c = mix(c, cc, cov * 0.92);",
    "  }",
    "  gl_FragColor = vec4(c, 1.0);",
    "  #include <tonemapping_fragment>",
    "  #include <colorspace_fragment>",
    "}"
  ].join("\n");

  function makeSky() {
    const mat = new T.ShaderMaterial({
      side: T.BackSide, depthWrite: false, fog: false,
      uniforms: { sun: { value: new T.Vector3(0.38, 0.78, 0.5) }, moon: { value: new T.Vector3(-0.45, 0.5, -0.55) }, uDay: { value: 1 }, uDusk: { value: 0 }, uNight: { value: 0 }, uTime: { value: 0 }, uCloud: { value: 0.5 }, uSunK: { value: 1 } },
      vertexShader: SKY_VS, fragmentShader: SKY_FS
    });
    const sky = new T.Mesh(new T.SphereGeometry(10, 48, 24), mat);
    sky.frustumCulled = false; sky.renderOrder = -1000;
    return sky;
  }

  /* ══════════════ 光のにじみ（ブルーム） ══════════════ */
  const QUAD_VS = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";
  function Bloom(renderer) {
    this.r = renderer;
    const gl2 = renderer.capabilities.isWebGL2;
    const opt = { type: T.HalfFloatType, depthBuffer: false };
    this.rt = new T.WebGLRenderTarget(4, 4, { type: T.HalfFloatType, samples: gl2 ? 4 : 0 });
    this.lv = []; for (let i = 0; i < 6; i++) this.lv.push({ a: new T.WebGLRenderTarget(4, 4, opt), b: new T.WebGLRenderTarget(4, 4, opt) });
    this.cam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new T.Mesh(new T.PlaneGeometry(2, 2), null); this.quad.frustumCulled = false;
    this.qs = new T.Scene(); this.qs.add(this.quad);
    this.mBright = new T.ShaderMaterial({ uniforms: { tSrc: { value: null }, texel: { value: new T.Vector2() }, threshold: { value: 1.0 }, knee: { value: 0.6 } }, vertexShader: QUAD_VS, depthTest: false, depthWrite: false, toneMapped: false,
      fragmentShader: "uniform sampler2D tSrc; uniform vec2 texel; uniform float threshold, knee; varying vec2 vUv;" +
        " void main(){ vec3 c = (texture2D(tSrc, vUv + texel * vec2(-0.5, -0.5)).rgb + texture2D(tSrc, vUv + texel * vec2(0.5, -0.5)).rgb + texture2D(tSrc, vUv + texel * vec2(-0.5, 0.5)).rgb + texture2D(tSrc, vUv + texel * vec2(0.5, 0.5)).rgb) * 0.25;" +
        " c = min(c, vec3(60.0)); float l = max(c.r, max(c.g, c.b)); float k = threshold <= 0.0 ? 1.0 : smoothstep(threshold, threshold + knee, l); gl_FragColor = vec4(c * k, 1.0); }" });
    this.mBlur = new T.ShaderMaterial({ uniforms: { tSrc: { value: null }, dir: { value: new T.Vector2() } }, vertexShader: QUAD_VS, depthTest: false, depthWrite: false, toneMapped: false,
      fragmentShader: "uniform sampler2D tSrc; uniform vec2 dir; varying vec2 vUv;" +
        " void main(){ vec3 c = texture2D(tSrc, vUv).rgb * 0.2270270270;" +
        " c += (texture2D(tSrc, vUv + dir * 1.3846153846).rgb + texture2D(tSrc, vUv - dir * 1.3846153846).rgb) * 0.3162162162;" +
        " c += (texture2D(tSrc, vUv + dir * 3.2307692308).rgb + texture2D(tSrc, vUv - dir * 3.2307692308).rgb) * 0.0702702703;" +
        " gl_FragColor = vec4(c, 1.0); }" });
    this.mComp = new T.ShaderMaterial({
      uniforms: { tScene: { value: null }, t0: { value: null }, t1: { value: null }, t2: { value: null }, t3: { value: null }, t4: { value: null }, t5: { value: null }, strength: { value: 0.55 }, vign: { value: 0.18 }, grade: { value: new T.Vector3(1, 1, 1) }, sat: { value: 1.18 }, uSun: { value: new T.Vector2(0.5, 0.5) }, uRays: { value: 0 } },
      vertexShader: QUAD_VS, depthTest: false, depthWrite: false,
      fragmentShader: "uniform sampler2D tScene, t0, t1, t2, t3, t4, t5; uniform float strength, vign, sat, uRays; uniform vec3 grade; uniform vec2 uSun; varying vec2 vUv;" +
        " void main(){ vec3 c = texture2D(tScene, vUv).rgb;" +
        " vec3 b = texture2D(t0, vUv).rgb * 0.35 + texture2D(t1, vUv).rgb * 0.55 + texture2D(t2, vUv).rgb * 0.75 + texture2D(t3, vUv).rgb * 0.9 + texture2D(t4, vUv).rgb * 1.0 + texture2D(t5, vUv).rgb * 1.0;" +
        " if (uRays > 0.001) { vec2 dd = (uSun - vUv) / 28.0; vec2 pp = vUv; float ww = 1.0; vec3 ry = vec3(0.0); for (int i = 0; i < 28; i++) { pp += dd; ry += texture2D(t1, pp).rgb * ww; ww *= 0.94; } c += ry * uRays / 28.0; }" +
        " c += b * strength * 0.25; c *= grade; float lu = dot(c, vec3(0.2126, 0.7152, 0.0722)); c = max(mix(vec3(lu), c, sat), 0.0);" +
        " vec2 q = vUv - 0.5; c *= 1.0 - vign * dot(q, q) * 2.2;" +
        " gl_FragColor = vec4(c, 1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n float al = smoothstep(0.0, 0.3, texture2D(tScene, vUv).a); gl_FragColor.rgb *= al; gl_FragColor.a = al; }" });
    this.w = 0; this.h = 0;
  }
  Bloom.prototype.setSize = function (w, h) {
    this.w = w; this.h = h;
    this.rt.setSize(w, h);
    let lw = Math.max(1, w >> 1), lh = Math.max(1, h >> 1);
    this.lv.forEach((L) => { L.a.setSize(lw, lh); L.b.setSize(lw, lh); L.w = lw; L.h = lh; lw = Math.max(1, lw >> 1); lh = Math.max(1, lh >> 1); });
  };
  Bloom.prototype.pass = function (mat, target) { this.quad.material = mat; this.r.setRenderTarget(target); this.r.render(this.qs, this.cam); };
  Bloom.prototype.render = function (scene, camera) {
    const r = this.r;
    r.setRenderTarget(this.rt); r.render(scene, camera);
    let src = this.rt.texture, sw = this.w, sh = this.h;
    this.lv.forEach((L, i) => {
      const B = this.mBright.uniforms; B.tSrc.value = src; B.texel.value.set(1 / sw, 1 / sh); B.threshold.value = i === 0 ? this.threshold : 0;
      this.pass(this.mBright, L.a);
      const U = this.mBlur.uniforms;
      U.tSrc.value = L.a.texture; U.dir.value.set(1 / L.w, 0); this.pass(this.mBlur, L.b);
      U.tSrc.value = L.b.texture; U.dir.value.set(0, 1 / L.h); this.pass(this.mBlur, L.a);
      src = L.a.texture; sw = L.w; sh = L.h;
    });
    const C = this.mComp.uniforms; C.tScene.value = this.rt.texture;
    ["t0", "t1", "t2", "t3", "t4", "t5"].forEach((k, i) => { C[k].value = this.lv[i].a.texture; });
    this.pass(this.mComp, null);
  };

  /* ══════════════ 昼・夕方・夜 ══════════════ */
  const MODES = {
    day: { day: 1, dusk: 0, night: 0, sunC: 0xfff1dc, sun: 2.5, hemiS: 0xe6f1ff, hemiG: 0x86976c, hemi: 0.5, fill: 0.25, exp: 0.82, fog: 0xcfe2fb, fogN: 260, fogF: 2200, emi: 0, lampPool: 0, bloom: 0.3, thr: 5.0, grade: [1.0, 1.0, 1.02] },
    dusk: { day: 0.1, dusk: 0.9, night: 0, sunC: 0xffa060, sun: 1.6, hemiS: 0xffc8a6, hemiG: 0x5a4a50, hemi: 0.4, fill: 0.2, exp: 0.95, fog: 0xf0b48c, fogN: 200, fogF: 1800, emi: 0.55, lampPool: 0.45, bloom: 0.6, thr: 2.6, grade: [1.04, 0.98, 0.94] },
    night: { day: 0, dusk: 0, night: 1, sunC: 0xa8b8e8, sun: 0.32, hemiS: 0x243052, hemiG: 0x0a0a12, hemi: 0.24, fill: 0.08, exp: 1.05, fog: 0x0a1330, fogN: 140, fogF: 1600, emi: 1, lampPool: 1, bloom: 0.9, thr: 1.1, grade: [0.98, 0.98, 1.03] }
  };
  const lerp = (a, b, k) => a + (b - a) * k;
  const cA = new T.Color(), cB = new T.Color();
  function lerpHex(a, b, k) { cA.set(a); cB.set(b); return cA.lerp(cB, k).getHex(); }

  const FX = {
    mode: "day", cur: Object.assign({}, MODES.day), from: null, to: null, k: 1, forced: null,
    init(o) {
      this.o = o; const r = o.renderer;
      this.sky = makeSky(); o.scene.add(this.sky);
      this.sky.material.uniforms.sun.value.copy(o.sunDir);
      this.bloomOn = !o.mobile && r.capabilities.isWebGL2;
      if (this.bloomOn) { this.bloom = new Bloom(r); this.bloom.threshold = 1.35; }
      this.pm = new T.PMREMGenerator(r);
      this.envScene = new T.Scene();
      this.envSky = makeSky(); this.envSky.scale.setScalar(50); this.envSky.material.uniforms.uSunK.value = 0; this.envScene.add(this.envSky);
      const ground = new T.Mesh(new T.CircleGeometry(400, 32), new T.MeshBasicMaterial({ color: 0x5a7a52 })); ground.rotation.x = -Math.PI / 2; ground.position.y = -8; this.envScene.add(ground);
      this.envGround = ground;
      this.makeEnv();
      this.apply(this.cur);
    },
    makeEnv() {
      const U = this.envSky.material.uniforms, S = this.sky.material.uniforms;
      ["uDay", "uDusk", "uNight", "uTime", "uCloud"].forEach((k) => U[k].value = S[k].value);
      U.sun.value.copy(S.sun.value); U.moon.value.copy(S.moon.value);
      this.envGround.material.color.setHex(lerpHex(0x5a7a52, 0x0a0c14, this.cur.night));
      const old = this.envRT;
      this.envRT = this.pm.fromScene(this.envScene, 0.02, 0.1, 1000);
      this.o.scene.environment = (window.XGFX && XGFX.probe && XGFX.probe.envTex) || this.envRT.texture;
      if (old) old.dispose();
    },
    setSize(w, h, pr) { if (this.bloom) this.bloom.setSize(Math.round(w * pr), Math.round(h * pr)); },
    /* 昼→夕→夜→昼 */
    cycle() { const nx = { day: "dusk", dusk: "night", night: "day" }[this.mode]; this.set(nx); return nx; },
    set(m) { this.mode = m; this.target(); },
    /* エリアの中だけ夜（NIGHT ZONE）など：force = "night" / null */
    force(m) { if (this.forced === m) return; this.forced = m; this.target(); },
    target() {
      const m = this.forced || this.mode;
      this.from = Object.assign({}, this.cur); this.to = MODES[m]; this.k = 0; this.envDirty = true;
    },
    apply(p) {
      const o = this.o, U = this.sky.material.uniforms;
      U.uDay.value = p.day; U.uDusk.value = p.dusk; U.uNight.value = p.night;
      o.sun.color.setHex(p.sunC);
      o.hemi.color.setHex(p.hemiS); o.hemi.groundColor.setHex(p.hemiG);
      if (o.fill) o.fill.intensity = p.fill;
      if (this.bloom) { this.bloom.mComp.uniforms.strength.value = p.bloom; this.bloom.threshold = p.thr; this.bloom.mComp.uniforms.grade.value.set(p.grade[0], p.grade[1], p.grade[2]); }
      const w = o.world;
      if (w && w.nightMats) w.nightMats.forEach((n) => { const k = lerp(n.day, n.night, p.emi); if (n.base) n.m.color.copy(n.base).multiplyScalar(k); else n.m.emissiveIntensity = k; });
      if (w && w.nightObjs) w.nightObjs.forEach((n) => { n.visible = p.emi > 0.25; });
      if (w && w.lampPools) { w.lampPools.visible = p.lampPool > 0.02; w.lampPools.material.opacity = p.lampPool; }
      if (w && w.sea) { const su = w.sea.material.uniforms; if (su.fogColor) su.fogColor.value.setHex(p.fog); if (su.uNight) su.uNight.value = p.night + p.dusk * 0.4; }
      if (w && w.waterMats) w.waterMats.forEach((m) => { if (m.uniforms.uNight) m.uniforms.uNight.value = p.night + p.dusk * 0.4; });
      if (w && w.aoU) w.aoU.uSunSh.value = 1 - p.night * 0.85;
    },
    /* main.js が毎フレーム呼ぶ。戻り値＝いまの外の明るさ（main.js の LIGHTS.outdoor） */
    update(dt, t) {
      const U = this.sky.material.uniforms; U.uTime.value = t;
      if (this.to && this.k < 1) {
        this.k = Math.min(1, this.k + dt / 2.5);
        const e = this.k * this.k * (3 - 2 * this.k), a = this.from, b = this.to, c = this.cur;
        ["day", "dusk", "night", "sun", "hemi", "fill", "exp", "fogN", "fogF", "emi", "lampPool", "bloom", "thr"].forEach((key) => c[key] = lerp(a[key], b[key], e));
        c.sunC = lerpHex(a.sunC, b.sunC, e); c.hemiS = lerpHex(a.hemiS, b.hemiS, e); c.hemiG = lerpHex(a.hemiG, b.hemiG, e); c.fog = lerpHex(a.fog, b.fog, e);
        c.grade = [0, 1, 2].map((i) => lerp(a.grade[i], b.grade[i], e));
        this.apply(c);
        if (this.k >= 1 && this.envDirty) { this.envDirty = false; this.makeEnv(); }
      }
      return this.cur;
    },
    render(scene, camera) {
      this.sky.position.copy(camera.position);
      this.o.renderer.shadowMap.needsUpdate = true;
      if (this.bloom) {
        /* ★ 2026-09-29 光の筋（ゴッドレイ）：太陽の画面上の位置へ向かって明るい所をのばす。建物・木にさえぎられると筋になる */
        const C = this.bloom.mComp.uniforms, sp = this._sp || (this._sp = new T.Vector3());
        sp.copy(this.o.sunDir).multiplyScalar(1000).add(camera.position).project(camera);
        const vis = sp.z < 1 && Math.abs(sp.x) < 1.6 && Math.abs(sp.y) < 1.6 ? 1 - Math.max(0, Math.max(Math.abs(sp.x), Math.abs(sp.y)) - 1) / 0.6 : 0;
        C.uSun.value.set(sp.x * 0.5 + 0.5, sp.y * 0.5 + 0.5);
        C.uRays.value = (this.rays == null ? 1 : this.rays) * vis * (this.cur.day * 0.55 + this.cur.dusk * 0.9);
        this.bloom.render(scene, camera);
      }
      else { this.o.renderer.setRenderTarget(null); this.o.renderer.render(scene, camera); }
    },
    isNight() { return this.cur.night > 0.5; }
  };
  FX.MODES = MODES;
  window.XFX = FX;
})();
