'use strict';
/* ============================================================
   MagiCraft 3D: WebGL2 レンダラ
   ・チャンク(不透明/水) / エンティティ(色付きボックス) / 選択ワイヤ枠
   ・距離フォグ + 昼夜サイクルの空色
   ============================================================ */

const R = (() => {
  let gl, canvas;
  let chunkProg, boxProg;
  let atlasTex;
  const proj = MTH.mat4(), view = MTH.mat4(), tmpM = MTH.mat4();
  let boxVAO, boxCount, wireVAO, wireCount;

  const state = {
    fogColor: [0.55, 0.75, 0.95],
    fogNear: 60, fogFar: 130,
    day: 1.0,           // 0.25(夜)〜1.0(昼)
    sunDir: [0.5, 0.8, 0.3],
  };

  function compile(vsSrc, fsSrc){
    const mk = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
        throw new Error('shader: ' + gl.getShaderInfoLog(s));
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, mk(gl.VERTEX_SHADER, vsSrc));
    gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fsSrc));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS))
      throw new Error('link: ' + gl.getProgramInfoLog(p));
    const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++){
      const info = gl.getActiveUniform(p, i);
      u[info.name] = gl.getUniformLocation(p, info.name);
    }
    return { p, u };
  }

  const CHUNK_VS = `#version 300 es
  layout(location=0) in vec3 aPos;
  layout(location=1) in vec2 aUV;
  layout(location=2) in float aLight;
  layout(location=3) in float aSky;
  layout(location=4) in float aBlock;
  uniform mat4 uProj, uView;
  out vec2 vUV; out float vLight, vSky, vBlock, vDist;
  void main(){
    vec4 vp = uView * vec4(aPos, 1.0);
    gl_Position = uProj * vp;
    vUV = aUV; vLight = aLight; vSky = aSky; vBlock = aBlock; vDist = length(vp.xyz);
  }`;

  const CHUNK_FS = `#version 300 es
  precision mediump float;
  in vec2 vUV; in float vLight, vSky, vBlock, vDist;
  uniform sampler2D uTex;
  uniform vec3 uFog; uniform float uFogNear, uFogFar, uDay, uAlpha;
  out vec4 o;
  void main(){
    vec4 c = texture(uTex, vUV);
    // 空の光は昼夜で暗くなる / 松明の光は常に一定
    float sky = vSky * uDay;
    float lit = max(max(sky, vBlock), 0.05);   // 最低限のアンビエント
    vec3 rgb = c.rgb * (vLight * lit);
    float f = smoothstep(uFogNear, uFogFar, vDist);
    o = vec4(mix(rgb, uFog, f), uAlpha * c.a);
  }`;

  const BOX_VS = `#version 300 es
  layout(location=0) in vec3 aPos;
  layout(location=1) in vec3 aNrm;
  uniform mat4 uProj, uView, uModel;
  out vec3 vNrm; out float vDist;
  void main(){
    vec4 wp = uModel * vec4(aPos, 1.0);
    vec4 vp = uView * wp;
    gl_Position = uProj * vp;
    vNrm = mat3(uModel) * aNrm; vDist = length(vp.xyz);
  }`;

  const BOX_FS = `#version 300 es
  precision mediump float;
  in vec3 vNrm; in float vDist;
  uniform vec4 uColor; uniform vec3 uSun, uFog;
  uniform float uFogNear, uFogFar, uDay, uEmis;
  out vec4 o;
  void main(){
    float d = max(dot(normalize(vNrm), normalize(uSun)), 0.0);
    float l = mix((0.55 + 0.45 * d) * uDay, 1.0, uEmis);
    vec3 rgb = uColor.rgb * l;
    float f = smoothstep(uFogNear, uFogFar, vDist);
    o = vec4(mix(rgb, uFog, f), uColor.a);
  }`;

  function init(cv){
    canvas = cv;
    gl = cv.getContext('webgl2', { antialias: false, alpha: false });
    if (!gl) return false;
    chunkProg = compile(CHUNK_VS, CHUNK_FS);
    boxProg = compile(BOX_VS, BOX_FS);

    // アトラス
    const atlas = buildAtlas();
    atlasTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, atlasTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    buildBoxGeom();
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    resize();
    return true;
  }

  function buildBoxGeom(){
    // 単位立方体 (中心原点, 半径0.5) 位置+法線
    const P = [
      // +X
      [ .5,-.5,-.5],[ .5, .5,-.5],[ .5, .5, .5],[ .5,-.5, .5],
      // -X
      [-.5,-.5,-.5],[-.5,-.5, .5],[-.5, .5, .5],[-.5, .5,-.5],
      // +Y
      [-.5, .5,-.5],[-.5, .5, .5],[ .5, .5, .5],[ .5, .5,-.5],
      // -Y
      [-.5,-.5,-.5],[ .5,-.5,-.5],[ .5,-.5, .5],[-.5,-.5, .5],
      // +Z
      [-.5,-.5, .5],[ .5,-.5, .5],[ .5, .5, .5],[-.5, .5, .5],
      // -Z
      [ .5,-.5,-.5],[-.5,-.5,-.5],[-.5, .5,-.5],[ .5, .5,-.5],
    ];
    const NRM = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
    const verts = [], inds = [];
    for (let f = 0; f < 6; f++){
      const b = f * 4;
      for (let k = 0; k < 4; k++) verts.push(...P[b + k], ...NRM[f]);
      inds.push(b, b + 1, b + 2, b, b + 2, b + 3);
    }
    boxVAO = gl.createVertexArray();
    gl.bindVertexArray(boxVAO);
    const vb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
    const ib = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(inds), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
    boxCount = inds.length;

    // ワイヤ枠 (単位立方体エッジ / [0,1]^3)
    const E = [];
    const c = [[0,0,0],[1,0,0],[1,0,1],[0,0,1],[0,1,0],[1,1,0],[1,1,1],[0,1,1]];
    const eIdx = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
    for (const [a, b2] of eIdx){ E.push(...c[a].map(v => v - 0.5), 0,1,0, ...c[b2].map(v => v - 0.5), 0,1,0); }
    wireVAO = gl.createVertexArray();
    gl.bindVertexArray(wireVAO);
    const wb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, wb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(E), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
    wireCount = E.length / 6;
    gl.bindVertexArray(null);
  }

  function resize(){
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.floor(canvas.clientWidth * dpr), h = Math.floor(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h){
      canvas.width = w; canvas.height = h;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
    MTH.perspective(proj, 70 * Math.PI / 180, canvas.width / Math.max(1, canvas.height), 0.1, 300);
  }

  /* ---- チャンク GPU バッファ ---- */
  function uploadMesh(mesh){
    if (!mesh.inds.length) return null;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const vb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.verts, gl.STATIC_DRAW);
    const ib = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.inds, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 32, 12);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 32, 20);
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 32, 24);
    gl.enableVertexAttribArray(4);
    gl.vertexAttribPointer(4, 1, gl.FLOAT, false, 32, 28);
    gl.bindVertexArray(null);
    return { vao, vb, ib, count: mesh.inds.length };
  }
  function freeMesh(h){
    if (!h) return;
    gl.deleteBuffer(h.vb); gl.deleteBuffer(h.ib); gl.deleteVertexArray(h.vao);
  }

  function remeshChunk(world, ch){
    freeMesh(ch.opaque); freeMesh(ch.water);
    const m = MESHER.buildChunk(world, ch.cx, ch.cz);
    ch.opaque = uploadMesh(m.opaque);
    ch.water = uploadMesh(m.water);
    ch.dirty = false;
  }

  /* dirty チャンクを最大 n 個再メッシュ */
  function processDirty(world, n){
    let done = 0;
    for (const ch of world.chunks){
      if (!ch.dirty) continue;
      remeshChunk(world, ch);
      if (++done >= n) break;
    }
    return done;
  }
  function meshAll(world){
    for (const ch of world.chunks) remeshChunk(world, ch);
  }
  function dropMeshes(world){
    for (const ch of world.chunks){ freeMesh(ch.opaque); freeMesh(ch.water); ch.opaque = ch.water = null; ch.dirty = true; }
  }

  /* ---- フレーム描画 ---- */
  function begin(eye, yaw, pitch){
    resize();
    MTH.fpsView(view, eye, yaw, pitch);
    const [r, g2, b] = state.fogColor;
    gl.clearColor(r, g2, b, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  function drawWorld(world){
    gl.useProgram(chunkProg.p);
    gl.uniformMatrix4fv(chunkProg.u.uProj, false, proj);
    gl.uniformMatrix4fv(chunkProg.u.uView, false, view);
    gl.uniform3fv(chunkProg.u.uFog, state.fogColor);
    gl.uniform1f(chunkProg.u.uFogNear, state.fogNear);
    gl.uniform1f(chunkProg.u.uFogFar, state.fogFar);
    gl.uniform1f(chunkProg.u.uDay, state.day);
    gl.uniform1f(chunkProg.u.uAlpha, 1.0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, atlasTex);
    gl.uniform1i(chunkProg.u.uTex, 0);

    for (const ch of world.chunks){
      if (!ch.opaque) continue;
      gl.bindVertexArray(ch.opaque.vao);
      gl.drawElements(gl.TRIANGLES, ch.opaque.count, gl.UNSIGNED_INT, 0);
    }
    // 水 (半透明)
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    gl.disable(gl.CULL_FACE);
    gl.uniform1f(chunkProg.u.uAlpha, 0.62);
    for (const ch of world.chunks){
      if (!ch.water) continue;
      gl.bindVertexArray(ch.water.vao);
      gl.drawElements(gl.TRIANGLES, ch.water.count, gl.UNSIGNED_INT, 0);
    }
    gl.enable(gl.CULL_FACE);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);
  }

  /* 色付きボックス (エンティティ / パーティクル) */
  function beginBoxes(){
    gl.useProgram(boxProg.p);
    gl.uniformMatrix4fv(boxProg.u.uProj, false, proj);
    gl.uniformMatrix4fv(boxProg.u.uView, false, view);
    gl.uniform3fv(boxProg.u.uSun, state.sunDir);
    gl.uniform3fv(boxProg.u.uFog, state.fogColor);
    gl.uniform1f(boxProg.u.uFogNear, state.fogNear);
    gl.uniform1f(boxProg.u.uFogFar, state.fogFar);
    gl.uniform1f(boxProg.u.uDay, state.day);
    gl.bindVertexArray(boxVAO);
  }
  function drawBox(x, y, z, ry, sx, sy, sz, rgba, emis){
    MTH.trs(tmpM, x, y, z, ry || 0, sx, sy, sz);
    gl.uniformMatrix4fv(boxProg.u.uModel, false, tmpM);
    gl.uniform4fv(boxProg.u.uColor, rgba);
    gl.uniform1f(boxProg.u.uEmis, emis || 0);
    if (rgba[3] < 1){ gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); }
    gl.drawElements(gl.TRIANGLES, boxCount, gl.UNSIGNED_SHORT, 0);
    if (rgba[3] < 1) gl.disable(gl.BLEND);
  }
  function endBoxes(){ gl.bindVertexArray(null); }

  /* 選択ブロックのワイヤ枠 */
  function drawSelection(bx, by, bz){
    gl.useProgram(boxProg.p);
    gl.uniformMatrix4fv(boxProg.u.uProj, false, proj);
    gl.uniformMatrix4fv(boxProg.u.uView, false, view);
    gl.uniform3fv(boxProg.u.uSun, state.sunDir);
    gl.uniform3fv(boxProg.u.uFog, state.fogColor);
    gl.uniform1f(boxProg.u.uFogNear, 9999);
    gl.uniform1f(boxProg.u.uFogFar, 10000);
    gl.uniform1f(boxProg.u.uDay, 1);
    gl.uniform1f(boxProg.u.uEmis, 1);
    MTH.trs(tmpM, bx + 0.5, by + 0.5, bz + 0.5, 0, 1.003, 1.003, 1.003);
    gl.uniformMatrix4fv(boxProg.u.uModel, false, tmpM);
    gl.uniform4fv(boxProg.u.uColor, [0.05, 0.02, 0.1, 0.9]);
    gl.bindVertexArray(wireVAO);
    gl.drawArrays(gl.LINES, 0, wireCount);
    gl.bindVertexArray(null);
  }

  return { init, state, begin, drawWorld, beginBoxes, drawBox, endBoxes, drawSelection,
           processDirty, meshAll, dropMeshes, resize };
})();
