/* ══════════════════════════════════════════════════════════════════
   XEVARION PARK — VRoid のキャラ（VRM 1.0）を読んで動かす
   ------------------------------------------------------------------
   ・外部のライブラリ（three-vrm / GLTFLoader）を使わない自前の読みこみ。glb の中身（メッシュ・骨・材質・画像・モーフ）を
     three のオブジェクトに組み立てる。画像は tools/vrm_to_web.py で WebP にしてある（標準外だが自前で読むのでよい）。
   ・★ 2026-09-28c 1つのモデル（asset）から何人でも作れる（形・画像は共有、材質と骨は1人ずつ）。
     髪・服・目の色はシェーダーで色相を回して「色違い」にする（画像をコピーしないので軽い）。
   ・動き：人型の骨を「正規化」して（three-vrm と同じ式）、モデルの向きの軸で回す。歩く・走る・待機・すわる・手をふる・
     ける・投げる・運転 を手続きで作る。歩き方は「かかとから着地→足の裏→つま先でけり出す」「ひざの曲げ」「腰の上下・左右・
     ひねり」「肩の逆回転」「歩幅に合わせた足の速さ（すべらない）」。
   ・揺れもの：VRMC_springBone（髪・スカート・袖・胸）を仕様どおりの計算で。胸（Bust）は opt.bust のときだけ。
   ・VRM 1.0 はモデルが +Z を向いている。
   ══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const T = THREE;
  const CT = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
  const NC = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

  function parseGLB(buf) {
    const dv = new DataView(buf); let off = 12, json = null, bin = null;
    while (off < buf.byteLength) {
      const len = dv.getUint32(off, true), type = dv.getUint32(off + 4, true);
      if (type === 0x4E4F534A) json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, off + 8, len)));
      else if (type === 0x004E4942) bin = buf.slice(off + 8, off + 8 + len);
      off += 8 + len;
    }
    return { json, bin };
  }
  function accessor(J, bin, i) {
    const a = J.accessors[i], bv = J.bufferViews[a.bufferView], C = CT[a.componentType], n = NC[a.type];
    const bpe = C.BYTES_PER_ELEMENT, stride = bv.byteStride || 0, off = (bv.byteOffset || 0) + (a.byteOffset || 0);
    let arr;
    if (!stride || stride === bpe * n) arr = new C(bin.slice(off, off + a.count * n * bpe));
    else {
      arr = new C(a.count * n); const src = new DataView(bin);
      const get = { 5120: "getInt8", 5121: "getUint8", 5122: "getInt16", 5123: "getUint16", 5125: "getUint32", 5126: "getFloat32" }[a.componentType];
      for (let k = 0; k < a.count; k++) for (let c = 0; c < n; c++) arr[k * n + c] = src[get](off + k * stride + c * bpe, true);
    }
    return { arr, n, norm: !!a.normalized, type: a.componentType };
  }
  function toFloat(acc) {
    if (acc.arr instanceof Float32Array) return acc.arr;
    const out = new Float32Array(acc.arr.length), d = acc.norm ? ({ 5121: 255, 5123: 65535, 5120: 127, 5122: 32767 }[acc.type] || 1) : 1;
    for (let i = 0; i < out.length; i++) out[i] = acc.arr[i] / d;
    return out;
  }

  /* ── 材質（MToon をトゥーン塗りで近づける）── */
  const gradCache = {};
  function gradient(shade) {
    const s = shade.map((v) => Math.round(Math.max(0.35, Math.min(1, v)) * 255)), k = s.join(",");
    if (gradCache[k]) return gradCache[k];
    const d = new Uint8Array([s[0], s[1], s[2], 255, s[0], s[1], s[2], 255, 255, 255, 255, 255, 255, 255, 255, 255]);
    const t = new T.DataTexture(d, 4, 1, T.RGBAFormat); t.minFilter = t.magFilter = T.NearestFilter; t.needsUpdate = true;
    return (gradCache[k] = t);
  }
  /* 色違い：色相を回す・あざやかさ・明るさ（材質ごとの値。プログラムは全員で共有） */
  const HUE_GLSL = "uniform float uHue; uniform float uSat; uniform float uVal;\n" +
    "vec3 xhue(vec3 c){ const vec3 k = vec3(0.57735); float ca = cos(uHue); vec3 r = c*ca + cross(k,c)*sin(uHue) + k*dot(k,c)*(1.0-ca);" +
    " float l = dot(r, vec3(0.299,0.587,0.114)); r = mix(vec3(l), r, uSat); return max(r*uVal, 0.0); }\n";
  function hueCompile(sh) {
    const h = this.userData.hue;
    sh.uniforms.uHue = { value: h.h || 0 }; sh.uniforms.uSat = { value: h.s == null ? 1 : h.s }; sh.uniforms.uVal = { value: h.v == null ? 1 : h.v };
    sh.fragmentShader = HUE_GLSL + sh.fragmentShader
      .replace("#include <map_fragment>", "#include <map_fragment>\n  diffuseColor.rgb = xhue(diffuseColor.rgb);")
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n  totalEmissiveRadiance = xhue(totalEmissiveRadiance);");
  }
  async function loadImages(J, bin) {
    return Promise.all((J.images || []).map((im) => new Promise((ok) => {
      const bv = J.bufferViews[im.bufferView];
      const blob = new Blob([new Uint8Array(bin, bv.byteOffset || 0, bv.byteLength)], { type: im.mimeType || "image/png" });
      const url = URL.createObjectURL(blob), img = new Image();
      img.onload = () => { ok(img); setTimeout(() => URL.revokeObjectURL(url), 1000); };
      img.onerror = () => ok(null);
      img.src = url;
    })));
  }
  function texOf(A, info, srgb) {
    if (!info) return null;
    const key = info.index + (srgb ? "s" : "l");
    if (A.tex[key]) return A.tex[key];
    const J = A.J, tx = J.textures[info.index]; if (!tx) return null;
    const img = A.imgs[tx.source]; if (!img) return null;
    const t = new T.Texture(img); t.flipY = false; if (srgb) t.colorSpace = T.SRGBColorSpace;
    const sm = (J.samplers || [])[tx.sampler] || {};
    const W = { 33071: T.ClampToEdgeWrapping, 33648: T.MirroredRepeatWrapping, 10497: T.RepeatWrapping };
    t.wrapS = W[sm.wrapS] || T.RepeatWrapping; t.wrapT = W[sm.wrapT] || T.RepeatWrapping;
    t.anisotropy = 4; t.needsUpdate = true;
    return (A.tex[key] = t);
  }
  function makeMaterial(A, m, tint) {
    const pbr = m.pbrMetallicRoughness || {}, mt = (m.extensions || {}).VRMC_materials_mtoon || {};
    const base = pbr.baseColorFactor || [1, 1, 1, 1];
    const map = texOf(A, pbr.baseColorTexture, true);
    const shadeC = mt.shadeColorFactor || [0.85, 0.85, 0.85];
    const shade = [0, 1, 2].map((i) => shadeC[i] / Math.max(0.05, base[i]));
    const name = (m.name || "").toUpperCase();
    const faceish = /FACE|EYE|SKIN/.test(name);
    const mat = new T.MeshToonMaterial({ map, gradientMap: gradient(faceish ? shade.map((v) => 0.55 + v * 0.45) : shade), side: m.doubleSided ? T.DoubleSide : T.FrontSide });
    mat.color.setRGB(base[0], base[1], base[2], T.LinearSRGBColorSpace);
    mat.emissive = new T.Color(1, 1, 1).multiplyScalar(faceish ? 0.2 : 0.12); mat.emissiveMap = map;
    if (m.alphaMode === "MASK") mat.alphaTest = m.alphaCutoff != null ? m.alphaCutoff : 0.5;
    else if (m.alphaMode === "BLEND") { mat.transparent = true; mat.depthWrite = !!mt.transparentWithZWrite; }
    mat.userData = { name: m.name, mtoon: mt, order: (mt.renderQueueOffsetNumber || 0) + (m.alphaMode === "BLEND" ? 10 : 0) + (/HIGHLIGHT/.test(name) ? 3 : /IRIS/.test(name) ? 1 : /EYELASH|EYELINE|BROW/.test(name) ? 2 : 0), blend: m.alphaMode === "BLEND" };
    /* 色違い（髪・服・目） */
    let h = null;
    if (tint) {
      if (/HAIR/.test(name)) h = tint.hair;
      else if (/CLOTH|TOPS|BOTTOMS|ONEPIECE|SHOES/.test(name)) h = /SHOES/.test(name) ? tint.shoes || tint.cloth : tint.cloth;
      else if (/IRIS/.test(name)) h = tint.eye;
    }
    if (h && (h.h || h.s != null || h.v != null)) { mat.userData.hue = h; mat.onBeforeCompile = hueCompile; }
    if (h && h.c) { const c = new T.Color(h.c); mat.color.multiply(c); mat.emissive.multiply(c); }   /* 色を掛ける（白い服にも色がつく） */
    return mat;
  }
  function outlineMaterial(src, color, width) {
    const m = new T.MeshBasicMaterial({ color: new T.Color(color[0], color[1], color[2]).multiplyScalar(0.8), side: T.BackSide, map: src.alphaTest ? src.map : null, alphaTest: src.alphaTest || 0 });
    m.userData.ow = width;
    m.onBeforeCompile = outlineCompile;
    return m;
  }
  function outlineCompile(sh) {
    sh.uniforms.uOW = { value: this.userData.ow };
    sh.vertexShader = "uniform float uOW;\n" + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n  transformed += normalize(objectNormal) * uOW;");
  }

  /* ══════════════ 読みこみ（1回）と、1人ぶんを作る（何回でも） ══════════════ */
  const assets = {};
  function loadAsset(url) {
    if (assets[url]) return assets[url];
    assets[url] = (async () => {
      const buf = await (await fetch(url)).arrayBuffer();
      const { json: J, bin } = parseGLB(buf);
      const imgs = await loadImages(J, bin);
      return { url, J, bin, imgs, tex: {}, geo: {} };
    })();
    return assets[url];
  }
  function geoOf(A, mi, pi) {
    const key = mi + ":" + pi;
    if (A.geo[key]) return A.geo[key];
    const J = A.J, bin = A.bin, p = J.meshes[mi].primitives[pi], g = new T.BufferGeometry(), At = p.attributes;
    g.setAttribute("position", new T.BufferAttribute(toFloat(accessor(J, bin, At.POSITION)), 3));
    if (At.NORMAL != null) g.setAttribute("normal", new T.BufferAttribute(toFloat(accessor(J, bin, At.NORMAL)), 3));
    if (At.TEXCOORD_0 != null) g.setAttribute("uv", new T.BufferAttribute(toFloat(accessor(J, bin, At.TEXCOORD_0)), 2));
    if (At.JOINTS_0 != null) { const a = accessor(J, bin, At.JOINTS_0); g.setAttribute("skinIndex", new T.BufferAttribute(a.arr instanceof Float32Array ? new Uint16Array(a.arr) : a.arr, 4)); }
    if (At.WEIGHTS_0 != null) g.setAttribute("skinWeight", new T.BufferAttribute(toFloat(accessor(J, bin, At.WEIGHTS_0)), 4));
    if (p.indices != null) { const a = accessor(J, bin, p.indices); g.setIndex(new T.BufferAttribute(a.arr instanceof Uint8Array ? new Uint16Array(a.arr) : a.arr, 1)); }
    if (p.targets && p.targets.length) { g.morphAttributes.position = p.targets.map((t) => new T.BufferAttribute(toFloat(accessor(J, bin, t.POSITION)), 3)); g.morphTargetsRelative = true; }
    if (!g.attributes.normal) g.computeVertexNormals();
    return (A.geo[key] = g);
  }
  /* opt = { tint: {hair:{h,s,v}, cloth:{…}, eye:{…}, shoes}, outline: true/false, bust: true/false, scale, hide: /材質名/ } */
  function instantiate(A, opt) {
    opt = opt || {};
    const J = A.J, bin = A.bin;
    const mats = (J.materials || []).map((m) => makeMaterial(A, m, opt.tint));
    const nodes = J.nodes.map((n) => {
      const o = (n.mesh != null) ? new T.Group() : new T.Bone();
      o.name = n.name || "";
      if (n.matrix) new T.Matrix4().fromArray(n.matrix).decompose(o.position, o.quaternion, o.scale);
      else { if (n.translation) o.position.fromArray(n.translation); if (n.rotation) o.quaternion.fromArray(n.rotation); if (n.scale) o.scale.fromArray(n.scale); }
      return o;
    });
    J.nodes.forEach((n, i) => (n.children || []).forEach((c) => nodes[i].add(nodes[c])));
    const root = new T.Group();
    (J.scenes[J.scene || 0].nodes).forEach((i) => root.add(nodes[i]));
    root.updateMatrixWorld(true);
    const meshesByNode = {}, outlines = [], all = [];
    J.nodes.forEach((n, ni) => {
      if (n.mesh == null) return;
      const Mh = J.meshes[n.mesh], list = [];
      const skin = n.skin != null ? J.skins[n.skin] : null;
      let skeleton = null;
      if (skin) {
        const bones = skin.joints.map((j) => nodes[j]);
        if (!A.ibm) A.ibm = {};
        const ibm = skin.inverseBindMatrices != null ? (A.ibm[n.skin] || (A.ibm[n.skin] = accessor(J, bin, skin.inverseBindMatrices).arr)) : null;
        skeleton = new T.Skeleton(bones, bones.map((_, k) => ibm ? new T.Matrix4().fromArray(ibm, k * 16) : new T.Matrix4()));
      }
      Mh.primitives.forEach((p, pi) => {
        /* ★ 2026-09-28d opt.hide（材質の名前）に合う部品は出さない（自分のキャラの首のチョーカー・ご指定） */
        if (opt.hide && J.materials && J.materials[p.material] && opt.hide.test(J.materials[p.material].name || "")) return;
        const g = geoOf(A, n.mesh, pi);
        const mat = mats[p.material] || new T.MeshToonMaterial({ color: 0xcccccc });
        const mesh = skeleton ? new T.SkinnedMesh(g, mat) : new T.Mesh(g, mat);
        mesh.frustumCulled = false; mesh.castShadow = !mat.userData.blend && opt.shadow !== false; mesh.receiveShadow = false;
        mesh.renderOrder = mat.userData.order || 0;
        mesh.userData.matName = (J.materials && J.materials[p.material] && J.materials[p.material].name) || "";
        if (p.targets && p.targets.length) mesh.updateMorphTargets();
        nodes[ni].add(mesh);
        if (skeleton) mesh.bind(skeleton, mesh.matrixWorld);
        list.push(mesh); all.push(mesh);
        const mt = mat.userData.mtoon || {}, ow = mt.outlineWidthFactor || 0;
        if (opt.outline !== false && ow > 0 && !mat.userData.blend && skeleton) {
          const o = new T.SkinnedMesh(g, outlineMaterial(mat, mt.outlineColorFactor || [0.2, 0.15, 0.15], Math.max(0.0016, ow * 1.6)));
          o.frustumCulled = false; o.castShadow = false; o.renderOrder = -1;
          if (p.targets && p.targets.length) o.updateMorphTargets();
          nodes[ni].add(o); o.bind(skeleton, o.matrixWorld);
          list.push(o); outlines.push(o);
        }
      });
      meshesByNode[ni] = list;
    });
    return new VRMChar(J, root, nodes, meshesByNode, outlines, opt);
  }
  async function load(url, opt) { return instantiate(await loadAsset(url), opt); }
  const FACE_DETAIL = /EyeIris|EyeHighlight|EyeWhite|FaceBrow|FaceEyelash|FaceEyeline|FaceMouth/;

  /* ══════════════ キャラ本体 ══════════════ */
  const _q = new T.Quaternion(), _q2 = new T.Quaternion(), _v = new T.Vector3(), _v2 = new T.Vector3(), _e = new T.Euler();
  /* ★ 2026-09-28d 遠い人は顔の細かい部品を省く（1人あたり描く回数が 7 回へる） */
  function faceDetail(on) {
    if (this._fd === on) return; this._fd = on;
    for (const k in this.meshes) this.meshes[k].forEach((m) => { if (FACE_DETAIL.test(m.userData.matName || "")) m.visible = on; });
  }
  function VRMChar(J, root, nodes, meshesByNode, outlines, opt) {
    this.J = J; this.nodes = nodes; this.meshes = meshesByNode; this.outlines = outlines; this.opt = opt || {};
    this.root = new T.Group(); this.model = root; this.root.add(root);
    if (opt && opt.scale) root.scale.setScalar(opt.scale);
    const V = J.extensions.VRMC_vrm;
    this.meta = V.meta || {};
    this.bones = {};
    root.updateMatrixWorld(true);
    Object.entries(V.humanoid.humanBones).forEach(([name, hb]) => {
      const raw = nodes[hb.node]; if (!raw) return;
      const pw = new T.Quaternion(); if (raw.parent) raw.parent.getWorldQuaternion(pw);
      this.bones[name] = { raw, rest: raw.quaternion.clone(), pw, pwInv: pw.clone().invert(), restPos: raw.position.clone(), q: new T.Quaternion() };
    });
    const hips = this.bones.hips;
    this.hipsY = hips ? hips.raw.getWorldPosition(new T.Vector3()).y : 0.9;
    const head = this.bones.head;
    this.height = head ? head.raw.getWorldPosition(new T.Vector3()).y + 0.16 : 1.6;
    const lf = this.bones.leftUpperLeg, lk = this.bones.leftLowerLeg;
    this.legLen = (lf && lk) ? this.hipsY * 0.95 : 0.85;
    /* ★ 2026-09-29 脚の長さ・足首の高さ・つま先とかかと（腰の高さを「立っている足が地面にぴったり付く」ように計算する） */
    { const wp = (n) => this.bones[n] ? this.bones[n].raw.getWorldPosition(new T.Vector3()) : null;
      const pUL = wp("leftUpperLeg"), pLL = wp("leftLowerLeg"), pF = wp("leftFoot"), pT = wp("leftToes");
      if (pUL && pLL && pF) {
        const L1 = pUL.distanceTo(pLL), L2 = pLL.distanceTo(pF), k = (L1 + L2) / 0.8;
        this.gait = { L1, L2, ha: Math.max(0.03, pF.y), toe: pT ? Math.max(0.06, Math.hypot(pT.z - pF.z, pT.x - pF.x)) : 0.11 * k, heel: 0.045 * k };
        this.gait.rest = L1 + L2 + this.gait.ha;
      } }
    this.expr = {};
    const E = V.expressions || {};
    Object.entries(Object.assign({}, E.preset || {}, E.custom || {})).forEach(([k, e]) => { this.expr[k] = e.morphTargetBinds || []; });
    this.initSpring(J.extensions.VRMC_springBone);
    this.t = Math.random() * 10; this.phase = Math.random() * 6.28; this.speed = 0; this.amp = 0;
    this.blinkAt = 1 + Math.random() * 3; this.face = "neutral"; this.faceUntil = 0; this.talkUntil = 0;
    this.wave = 0; this.action = null; this.actionT = 0;
    this.lookS = 0; this.weight = Math.random() * 6.28;
    this.springOn = true;
  }
  VRMChar.prototype.rot = function (name, x, y, z) { const b = this.bones[name]; if (!b) return; _e.set(x || 0, y || 0, z || 0, "XYZ"); b.q.setFromEuler(_e); };
  /* 腕：前後（X）→ 下ろす（Z）の順 */
  VRMChar.prototype.rotXZ = function (name, x, z, y) {
    const b = this.bones[name]; if (!b) return;
    _q.setFromAxisAngle(_v.set(0, 0, 1), z); _q2.setFromAxisAngle(_v2.set(1, 0, 0), x);
    b.q.copy(_q2).multiply(_q);
    if (y) { _q.setFromAxisAngle(_v.set(0, 1, 0), y); b.q.premultiply(_q); }
  };
  VRMChar.prototype.applyRig = function () { for (const k in this.bones) { const b = this.bones[k]; b.raw.quaternion.copy(b.pwInv).multiply(b.q).multiply(b.pw).multiply(b.rest); } };
  VRMChar.prototype.play = function (name, dur) { if (name === "wave") { this.wave = dur || 1.6; return; } this.action = name; this.actionT = 0; this.actionDur = dur || 0.5; };
  VRMChar.prototype.setFace = function (name, ms) { this.face = name || "neutral"; this.faceUntil = ms ? performance.now() + ms : 0; };
  VRMChar.prototype.applyExpressions = function (weights) {
    for (const ni in this.meshes) this.meshes[ni].forEach((m) => { if (m.morphTargetInfluences) m.morphTargetInfluences.fill(0); });
    for (const k in weights) {
      const w = weights[k]; if (!w || !this.expr[k]) continue;
      this.expr[k].forEach((b) => { (this.meshes[b.node] || []).forEach((m) => { if (m.morphTargetInfluences && b.index < m.morphTargetInfluences.length) m.morphTargetInfluences[b.index] = Math.min(1, m.morphTargetInfluences[b.index] + b.weight * w); }); });
    }
  };

  /* ══════════════ 揺れもの（VRMC_springBone 1.0） ══════════════ */
  VRMChar.prototype.initSpring = function (S) {
    this.springs = []; this.colliders = [];
    if (!S) return;
    const N = this.nodes;
    (S.colliders || []).forEach((c) => {
      const sh = c.shape || {};
      if (sh.sphere) this.colliders.push({ node: N[c.node], off: new T.Vector3().fromArray(sh.sphere.offset || [0, 0, 0]), r: sh.sphere.radius || 0.05, p: new T.Vector3(), t: null, tw: null, rw: 0 });
      else if (sh.capsule) this.colliders.push({ node: N[c.node], off: new T.Vector3().fromArray(sh.capsule.offset || [0, 0, 0]), tail: new T.Vector3().fromArray(sh.capsule.tail || [0, 0, 0]), r: sh.capsule.radius || 0.05, p: new T.Vector3(), tw: new T.Vector3(), rw: 0 });
      else this.colliders.push(null);
    });
    const groups = (S.colliderGroups || []).map((g) => (g.colliders || []).map((i) => this.colliders[i]).filter(Boolean));
    this.model.updateMatrixWorld(true);
    (S.springs || []).forEach((sp) => {
      if (/bust/i.test(sp.name || "") && !this.opt.bust) return;          /* 胸の揺れは opt.bust のときだけ */
      const cols = [].concat(...(sp.colliderGroups || []).map((gi) => groups[gi] || []));
      const js = sp.joints || [], chain = [];
      for (let i = 0; i < js.length; i++) {
        const j = js[i], node = N[j.node]; if (!node) continue;
        const child = js[i + 1] ? N[js[i + 1].node] : (node.children.find((c) => c.isBone) || null);
        let local;
        if (child) local = child.position.clone();
        else { local = node.position.clone().normalize().multiplyScalar(0.07); if (local.lengthSq() < 1e-8) local.set(0, -0.07, 0); }
        const wp = node.getWorldPosition(new T.Vector3()), tail = local.clone().applyMatrix4(node.matrixWorld), len = wp.distanceTo(tail);
        if (len < 1e-5) continue;
        chain.push({ node, init: node.quaternion.clone(), axis: local.clone().normalize(), len, cur: tail.clone(), prev: tail.clone(),
          stiff: j.stiffness != null ? j.stiffness : 1, grav: j.gravityPower || 0, gdir: new T.Vector3().fromArray(j.gravityDir || [0, -1, 0]), drag: j.dragForce != null ? j.dragForce : 0.4, hitR: j.hitRadius || 0.02, bust: /bust/i.test(sp.name || "") });
      }
      if (chain.length) this.springs.push({ chain, cols });
    });
  };
  VRMChar.prototype.resetSpring = function () {
    this.root.updateMatrixWorld(true);
    this.springs.forEach((s) => s.chain.forEach((j) => { j.node.quaternion.copy(j.init); j.node.updateMatrixWorld(true); const t = j.axis.clone().multiplyScalar(j.len).applyMatrix4(j.node.matrixWorld); j.cur.copy(t); j.prev.copy(t); }));
  };
  const _pw = new T.Quaternion(), _wp = new T.Vector3(), _nt = new T.Vector3(), _st = new T.Vector3(), _cc = new T.Vector3(), _ct = new T.Vector3(), _to = new T.Vector3(), _inv = new T.Quaternion(), _sc = new T.Vector3();
  VRMChar.prototype.updateSpring = function (dt) {
    if (!this.springs.length) return;
    dt = Math.min(dt, 1 / 30);
    this.root.updateMatrixWorld(true);
    for (const c of this.colliders) { if (!c) continue; c.p.copy(c.off).applyMatrix4(c.node.matrixWorld); if (c.tail) c.tw.copy(c.tail).applyMatrix4(c.node.matrixWorld); c.rw = c.r * c.node.getWorldScale(_sc).x; }
    /* 大きく動いたとき（ワープ）は形をもどす */
    for (const s of this.springs) {
      for (const j of s.chain) {
        const node = j.node;
        node.getWorldPosition(_wp);
        if (node.parent) node.parent.getWorldQuaternion(_pw); else _pw.identity();
        _nt.copy(j.cur).sub(j.prev).multiplyScalar(1 - j.drag).add(j.cur);
        _st.copy(j.axis).applyQuaternion(_q.copy(_pw).multiply(j.init)).multiplyScalar(j.stiff * dt);
        _nt.add(_st).addScaledVector(j.gdir, j.grav * dt);
        _nt.sub(_wp).normalize().multiplyScalar(j.len).add(_wp);
        for (const c of s.cols) {
          let cp = c.p;
          if (c.tail) { _cc.copy(c.tw).sub(c.p); const l2 = _cc.lengthSq(); let k = l2 > 0 ? _ct.copy(_nt).sub(c.p).dot(_cc) / l2 : 0; k = Math.max(0, Math.min(1, k)); cp = _ct.copy(c.p).addScaledVector(_cc, k); }
          const rr = c.rw + j.hitR, d = _nt.distanceTo(cp);
          if (d < rr && d > 1e-6) { _nt.sub(cp).normalize().multiplyScalar(rr).add(cp); _nt.sub(_wp).normalize().multiplyScalar(j.len).add(_wp); }
        }
        if (_nt.distanceToSquared(j.cur) > 1) { _nt.copy(j.axis).applyQuaternion(_q.copy(_pw).multiply(j.init)).multiplyScalar(j.len).add(_wp); j.cur.copy(_nt); }
        j.prev.copy(j.cur); j.cur.copy(_nt);
        _inv.copy(_pw).multiply(j.init).invert();
        _to.copy(_nt).sub(_wp).applyQuaternion(_inv).normalize();
        _q2.setFromUnitVectors(j.axis, _to);
        node.quaternion.copy(j.init).multiply(_q2);
        node.updateMatrixWorld(true);
      }
    }
  };

  /* ══════════════ 手続きの動き ══════════════
     st = { speed（m/s）, sit, seatH, look（首の向き）, action, actionT, turn（向きの変わる速さ rad/s） }
     ★★ 2026-09-29 歩き・走りのフォームを作り直し（ご指定「歩いたり走ったりのフォームを改善」）
       ・人の歩行・走行の計測データ（1歩の周期の中の 股関節・ひざ・足首 の角度）の形をキーフレームにして、なめらかな曲線でなぞる。
         歩き：かかとで着地 → 体重がのってひざが少し曲がる → 足の裏 → つま先でけり出す（足首が大きく伸びる）→ ひざを大きく曲げて振り出す
         走り：前足部で着地 → ひざが深く曲がって体重を受ける → 強くけり出す → 両足が浮く（空中）→ かかとがお尻に近づくほど脚をたたむ
       ・★ 腰の高さは「脚の長さ×角度」から毎回計算して、いちばん下の足（かかと／つま先）がちょうど地面に付くようにする
         → 足が地面にめりこまない・浮かない。上下の揺れ（片足で立つときが高い・走りは着地で沈む）も自然に出る。
       ・腰：脚といっしょにひねる・立っている脚の側へ寄る・振り出す側が下がる。胸は逆にひねる。走ると前かがみ（全力はもっと）。
       ・腕：脚と逆に振る。歩きはひじを軽く、走りは直角近くに曲げる。手の指は軽く丸める（前はまっすぐ＝板のような手）。
       ・歩き→走り→全力は速さでまぜる。1歩の長さは速さに合わせて伸びる（足がすべりにくい）。曲がるときは内側へ体を傾ける。 */
  const bump = (p, c, w) => { let d = p - c; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return Math.abs(d) < w ? 0.5 + 0.5 * Math.cos(d / w * Math.PI) : 0; };
  const DEG = Math.PI / 180;
  /* 周期つきのなめらかな曲線：キーフレーム [位相 0〜1, 角度(度)]（最初は 0） → 257 点の表（ラジアン） */
  function gaitLUT(keys) {
    const K = keys.length, ext = [[keys[K - 2][0] - 1, keys[K - 2][1]], [keys[K - 1][0] - 1, keys[K - 1][1]]].concat(keys, [[keys[0][0] + 1, keys[0][1]], [keys[1][0] + 1, keys[1][1]]]);
    const out = new Float32Array(257);
    for (let n = 0; n <= 256; n++) {
      const ph = (n % 256) / 256; let i = 1; while (i < ext.length - 3 && ext[i + 1][0] <= ph) i++;
      const P0 = ext[i - 1], P1 = ext[i], P2 = ext[i + 1], P3 = ext[i + 2], h = P2[0] - P1[0], s = (ph - P1[0]) / h;
      const m1 = (P2[1] - P0[1]) / (P2[0] - P0[0]), m2 = (P3[1] - P1[1]) / (P3[0] - P1[0]);
      const s2 = s * s, s3 = s2 * s;
      out[n] = ((2 * s3 - 3 * s2 + 1) * P1[1] + (s3 - 2 * s2 + s) * h * m1 + (-2 * s3 + 3 * s2) * P2[1] + (s3 - s2) * h * m2) * DEG;
    }
    return out;
  }
  const LS = (lut, ph) => { ph -= Math.floor(ph); const x = ph * 256, i = x | 0, f = x - i; return lut[i] + (lut[i + 1] - lut[i]) * f; };
  /* 股関節（前へ＋・体の縦からの角度）・ひざ（曲げ＋）・足首（つま先を上げる＋）。位相 0＝その脚の着地 */
  const GW = {
    hip: gaitLUT([[0, 17], [0.1, 13], [0.2, 6], [0.3, -1], [0.4, -8], [0.5, -15], [0.56, -17], [0.62, -13], [0.7, -1], [0.8, 12], [0.88, 18], [0.95, 18]]),
    knee: gaitLUT([[0, 4], [0.06, 11], [0.14, 16], [0.22, 11], [0.32, 6], [0.42, 4], [0.5, 8], [0.56, 15], [0.62, 25], [0.67, 39], [0.72, 50], [0.77, 54], [0.83, 43], [0.89, 24], [0.95, 8]]),
    ank: gaitLUT([[0, 0], [0.07, -5], [0.15, 2], [0.3, 7], [0.44, 9], [0.5, 2], [0.56, -10], [0.62, -18], [0.68, -12], [0.76, -2], [0.86, 2]])
  };
  const GR = {
    hip: gaitLUT([[0, 24], [0.1, 14], [0.2, 0], [0.3, -13], [0.36, -18], [0.44, -14], [0.54, 2], [0.64, 22], [0.74, 36], [0.84, 41], [0.92, 34]]),
    knee: gaitLUT([[0, 20], [0.08, 34], [0.16, 40], [0.26, 30], [0.36, 18], [0.46, 44], [0.56, 80], [0.64, 98], [0.72, 100], [0.8, 82], [0.88, 50], [0.95, 28]]),
    ank: gaitLUT([[0, 4], [0.1, 14], [0.18, 18], [0.28, 8], [0.36, -20], [0.44, -16], [0.54, -4], [0.7, 6], [0.85, 8], [0.95, 5]])
  };
  const FINGERS = ["Index", "Middle", "Ring", "Little"];
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v, smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  VRMChar.prototype.update = function (dt, st) {
    st = st || {};
    const t = (this.t += dt);
    if (this.action) { this.actionT += dt / (this.actionDur || 0.5); if (this.actionT >= 1) { this.action = null; this.actionT = 0; } }
    const target = st.speed || 0;
    this.speed += (target - this.speed) * Math.min(1, dt * 6);
    const spd = this.speed;
    const amp = this.amp += (Math.min(1, spd / 0.9) - this.amp) * Math.min(1, dt * 5);
    /* 歩き（〜2.6m/s）→ 走り（4m/s〜）→ 全力（6〜9m/s） */
    const runW = smooth(2.6, 4.2, spd), walkW = 1 - runW, sprint = smooth(6, 9, spd);
    const fW = spd / clamp(0.85 + 0.42 * spd, 1.0, 2.0), fR = spd / clamp(1.1 + 0.32 * spd, 1.8, 4.0);
    this.phase += dt * (spd > 0.03 ? (fW * walkW + fR * runW) : 0);          /* 位相は 1 周＝1.0（左脚の着地 → 次の左脚の着地） */
    const P = this.phase * Math.PI * 2, idle = 1 - amp;
    const aW = clamp(0.55 + 0.19 * spd, 0.6, 1.08) * amp * walkW, aR = clamp(0.8 + 0.04 * spd, 0.9, 1.2) * amp * runW;
    const br = Math.sin(t * 1.6), w8 = Math.sin(t * 0.35 + this.weight);
    for (const k in this.bones) this.bones[k].q.identity();
    const R = (n, x, y, z) => this.rot(n, x, y, z);
    let hipDrop = 0, hipX = 0;
    if (st.sit) {
      R("leftUpperLeg", -1.5, 0.05, 0.06); R("rightUpperLeg", -1.5, -0.05, -0.06);
      R("leftLowerLeg", 1.45, 0, 0); R("rightLowerLeg", 1.45, 0, 0);
      this.rotXZ("leftUpperArm", -0.25, -1.2); this.rotXZ("rightUpperArm", -0.25, 1.2);
      R("leftLowerArm", 0, -0.7, 0); R("rightLowerArm", 0, 0.7, 0);
      R("spine", 0.04 + br * 0.01, 0, 0); R("chest", 0.01 * br, 0, 0); R("neck", 0.05, (st.look || 0) * 0.7, 0); R("head", 0, (st.look || 0) * 0.3, 0);
      hipDrop = this.hipsY - (st.seatH != null ? st.seatH : 0.45) - 0.07;
      this.fingerCurl(0.35, 0.45);
      if (st.armsUp) { this.rotXZ("leftUpperArm", -0.1, -0.25); this.rotXZ("rightUpperArm", -0.1, 0.25); R("leftLowerArm", 0, -0.35, 0); R("rightLowerArm", 0, 0.35, 0); this.fingerCurl(0.05, 0.05); }
      else if (st.hold) { this.rotXZ("leftUpperArm", -0.9, -1.0); this.rotXZ("rightUpperArm", -0.9, 1.0); R("leftLowerArm", 0, -0.9, 0); R("rightLowerArm", 0, 0.9, 0); }
    } else {
      const G = this.gait;
      /* 前かがみ（腰の少しの前傾＋胸）。太ももは腰の傾きのぶん打ち消して、体の縦に対する角度を曲線どおりにする */
      const pelvisPitch = (0.02 * walkW + 0.09 * runW + 0.07 * sprint) * amp;
      const legs = [["left", this.phase], ["right", this.phase + 0.5]], reach = [];
      legs.forEach(([s, ph]) => {
        const hip = LS(GW.hip, ph) * aW + LS(GR.hip, ph) * aR;
        const knee = LS(GW.knee, ph) * aW + LS(GR.knee, ph) * aR + idle * 0.03;
        const ank = LS(GW.ank, ph) * aW + LS(GR.ank, ph) * aR;
        R(s + "UpperLeg", -hip - pelvisPitch, 0, 0);
        R(s + "LowerLeg", knee, 0, 0);
        R(s + "Foot", -ank, 0, 0);
        R(s + "Toes", Math.max(0, -(hip - knee + ank)) * 0.35 * amp, 0, 0);    /* けり出しでつま先の指が反る */
        if (G) {
          const th2 = hip - knee, e = th2 + ank;                              /* すね・足の向き（体の縦から・つま先が上がる＋） */
          const yHeel = -G.heel * Math.sin(e) - G.ha * Math.cos(e), yToe = G.toe * Math.sin(e) - G.ha * Math.cos(e);
          reach.push(G.L1 * Math.cos(hip) + G.L2 * Math.cos(th2) - Math.min(yHeel, yToe));
        }
      });
      if (G && reach.length === 2) {
        /* 走り：両足が浮く時間（空中）だけ体を持ち上げる */
        const ph = this.phase - Math.floor(this.phase), lift = (0.045 + 0.035 * sprint) * runW * amp * (bump(ph * Math.PI * 2, 0.43 * Math.PI * 2, 0.5) + bump(ph * Math.PI * 2, 0.93 * Math.PI * 2, 0.5));
        hipDrop = G.rest - (Math.max(reach[0], reach[1]) + lift);
      }
      /* 腰：左右へ寄る・ひねる・振り出す側が下がる・曲がるときは内側へ */
      const turn = clamp(st.turn || 0, -3, 3);
      hipX = Math.sin(P) * (0.026 * walkW + 0.01 * runW) * amp + idle * w8 * 0.02;
      const pelvYaw = -Math.cos(P) * (0.09 * walkW + 0.06 * runW) * amp, obl = -Math.sin(P) * (0.05 * walkW + 0.035 * runW) * amp;
      R("hips", pelvisPitch, pelvYaw, obl + idle * w8 * 0.035 - turn * 0.035 * runW * amp);
      /* 胸：腰と逆にひねる（腰のひねりを打ち消した上で、逆向きに）・前かがみ・呼吸 */
      const thorYaw = Math.cos(P) * (0.06 * walkW + 0.13 * runW) * amp;
      R("spine", (0.02 * walkW + 0.12 * runW + 0.12 * sprint) * amp + idle * br * 0.012, -pelvYaw + thorYaw * 0.6, -obl * 0.6 - idle * w8 * 0.02 - turn * 0.03 * runW * amp);
      R("chest", 0.01 * br * idle + 0.02 * runW * amp, thorYaw * 0.3, -obl * 0.2);
      R("upperChest", 0, thorYaw * 0.1, 0);
      /* 腕：左腕は右脚と同じ（右脚の位相）で前後。前へ振るときひじを深く */
      const armOf = (ph) => {
        const q = (ph + 0.5) * Math.PI * 2;
        const sh = (14 * DEG * Math.cos(q) + 4 * DEG) * walkW * amp + ((30 + 14 * sprint) * DEG * Math.cos(q - 0.19) + 8 * DEG) * runW * amp;
        const el = (0.14 + 0.2 * Math.max(0, Math.cos(q))) * walkW * amp + (1.35 + 0.22 * Math.cos(q - 0.19)) * runW * amp + idle * 0.1;
        return [sh, el];
      };
      const [shL, elL] = armOf(this.phase), [shR, elR] = armOf(this.phase + 0.5);
      const down = 1.24 - 0.08 * runW * amp;
      this.rotXZ("leftUpperArm", -shL, -down + 0.03 * br * idle, 0.05 + 0.12 * runW * amp);
      this.rotXZ("rightUpperArm", -shR, down - 0.03 * br * idle, -0.05 - 0.12 * runW * amp);
      R("leftLowerArm", 0, -elL, 0); R("rightLowerArm", 0, elR, 0);
      R("leftHand", 0, 0, -0.1 - 0.1 * runW * amp); R("rightHand", 0, 0, 0.1 + 0.1 * runW * amp);
      this.fingerCurl(0.3 + 0.55 * runW * amp, 0.35 + 0.6 * runW * amp);
      /* 首・頭：胸のひねりと上下の揺れを打ち消して前を見る＋見る方向 */
      this.lookS += ((st.look || 0) - this.lookS) * Math.min(1, dt * 4);
      R("neck", -0.02 - (0.1 * runW + 0.1 * sprint) * amp + Math.sin(t * 0.7) * 0.015 * idle, -thorYaw * 0.7 + this.lookS * 0.6, obl * 0.3);
      R("head", (this.talkUntil > performance.now() ? Math.sin(t * 9) * 0.035 : 0) - 0.04 * runW * amp, this.lookS * 0.4, 0);
      /* しぐさ */
      if (this.wave > 0) { this.wave -= dt; this.rotXZ("rightUpperArm", -0.2, -0.3); R("rightLowerArm", 0, 0.3, Math.sin(t * 11) * 0.4 - 1.2); }
      const a = st.action || this.action;
      if (a) {
        const k = Math.max(0, Math.min(1, st.actionT != null ? st.actionT : this.actionT)), s = Math.sin(k * Math.PI);
        if (a === "kick") { R("rightUpperLeg", -1.25 * s + 0.4 * (k < 0.3 ? 1 - k / 0.3 : 0), 0, 0); R("rightLowerLeg", 0.9 * (1 - s), 0, 0); R("spine", -0.15 * s, 0, 0); this.rotXZ("leftUpperArm", -0.5 * s, -1.0); }
        if (a === "throw") { this.rotXZ("rightUpperArm", k < 0.5 ? 0.9 * (k / 0.5) : 0.9 - 2.2 * ((k - 0.5) / 0.5), 1.1); R("spine", 0.25 * s, 0, 0); R("rightUpperLeg", -0.3 * s, 0, 0); R("rightLowerLeg", 0.3 * s, 0, 0); }
        if (a === "cheer") { this.rotXZ("leftUpperArm", 0, -0.2 - 0.25 * s); this.rotXZ("rightUpperArm", 0, 0.2 + 0.25 * s); R("leftLowerArm", 0, -0.2, 0); R("rightLowerArm", 0, 0.2, 0); hipDrop -= 0.08 * s; }
        if (a === "dance") { const q = t * 3.2; this.rotXZ("leftUpperArm", Math.sin(q) * 0.5, -0.4 - Math.sin(q * 0.5) * 0.9); this.rotXZ("rightUpperArm", -Math.sin(q) * 0.5, 0.4 + Math.cos(q * 0.5) * 0.9); R("hips", 0, Math.sin(q) * 0.25, Math.sin(q * 2) * 0.06); R("spine", 0, -Math.sin(q) * 0.15, 0); hipDrop -= Math.abs(Math.sin(q)) * 0.05; hipX = Math.sin(q) * 0.05; }
        if (a === "drive") { this.rotXZ("leftUpperArm", -0.9, -0.9); this.rotXZ("rightUpperArm", -0.9, 0.9); R("leftLowerArm", 0, -0.6, 0); R("rightLowerArm", 0, 0.6, 0); R("leftUpperLeg", -1.35, 0, 0.1); R("rightUpperLeg", -1.35, 0, -0.1); R("leftLowerLeg", 1.1, 0, 0); R("rightLowerLeg", 1.1, 0, 0); R("neck", 0, st.look || 0, 0); R("hips", 0, 0, 0); R("spine", 0, 0, 0); hipDrop = this.hipsY - (st.seatH != null ? st.seatH : 0.25); hipX = 0; }
      }
    }
    const hips = this.bones.hips;
    if (hips) { const s = hips.raw.parent ? hips.raw.parent.getWorldScale(_v).y : 1; hips.raw.position.copy(hips.restPos); hips.raw.position.y -= hipDrop / s; hips.raw.position.x += hipX / s; }
    this.applyRig();
    /* 表情＋まばたき＋口 */
    const now = performance.now();
    if (this.faceUntil && now > this.faceUntil) { this.face = "neutral"; this.faceUntil = 0; }
    this.blinkAt -= dt; let blink = 0;
    if (this.blinkAt <= 0) { blink = 1; if (this.blinkAt < -0.13) this.blinkAt = 2 + Math.random() * 3.5; }
    const W = {};
    if (this.face && this.face !== "neutral") W[this.face] = 1;
    if (this.face !== "happy" && this.face !== "relaxed") W.blink = blink;
    if (this.talkUntil > now) W.aa = (Math.sin(t * 18) * 0.5 + 0.5) * 0.7;
    if (st.noFace !== true) this.applyExpressions(W);
    if (this.springOn && st.noSpring !== true) this.updateSpring(dt);
  };

  VRMChar.prototype.faceDetail = faceDetail;
  /* 指：a＝つけ根・b＝先の曲げ（0〜1）。左手の指は +X 向きなので Z の − で手のひら側へ、右手は + */
  VRMChar.prototype.fingerCurl = function (a, b) {
    for (const f of FINGERS) {
      const k = f === "Index" ? 0.85 : f === "Little" ? 1.12 : 1;
      [["left", -1], ["right", 1]].forEach(([s, sg]) => { this.rot(s + f + "Proximal", 0, 0, sg * a * 0.9 * k); this.rot(s + f + "Intermediate", 0, 0, sg * b * 1.1 * k); this.rot(s + f + "Distal", 0, 0, sg * b * 0.7 * k); });
    }
    this.rot("leftThumbProximal", 0, -0.15 * a, -0.1 * a); this.rot("rightThumbProximal", 0, 0.15 * a, 0.1 * a);
  };
  window.XVRM = { load, loadAsset, instantiate };
})();
