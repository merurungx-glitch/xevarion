'use strict';
/* ============ MagiCraft 3D: 最小限の行列 / ベクトル数学 ============
   mat4 は WebGL 標準の列優先 Float32Array(16)。 */
const MTH = (() => {

  function mat4() {
    const m = new Float32Array(16);
    m[0] = m[5] = m[10] = m[15] = 1;
    return m;
  }

  function perspective(out, fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    out.fill(0);
    out[0] = f / aspect;
    out[5] = f;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[14] = 2 * far * near * nf;
    return out;
  }

  /* FPS カメラのビュー行列 (eye, yaw, pitch)。
     yaw=0 で -Z を向く / pitch 正 = 上を見る。 */
  function fpsView(out, eye, yaw, pitch) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    // forward
    const fx = sy * cp, fy = sp, fz = -cy * cp;
    // right
    const rx = cy, ry = 0, rz = sy;
    // up = right x forward
    const ux = ry * fz - rz * fy, uy = rz * fx - rx * fz, uz = rx * fy - ry * fx;
    out[0] = rx; out[4] = ry; out[8] = rz;
    out[1] = ux; out[5] = uy; out[9] = uz;
    out[2] = -fx; out[6] = -fy; out[10] = -fz;
    out[3] = 0; out[7] = 0; out[11] = 0;
    out[12] = -(rx * eye[0] + ry * eye[1] + rz * eye[2]);
    out[13] = -(ux * eye[0] + uy * eye[1] + uz * eye[2]);
    out[14] = (fx * eye[0] + fy * eye[1] + fz * eye[2]);
    out[15] = 1;
    return out;
  }

  function forwardOf(yaw, pitch) {
    const cp = Math.cos(pitch);
    return [Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp];
  }

  /* model = translate * rotateY * scale  (エンティティ描画用) */
  function trs(out, tx, ty, tz, ry, sx, sy, sz) {
    const c = Math.cos(ry), s = Math.sin(ry);
    out[0] = c * sx; out[1] = 0; out[2] = -s * sx; out[3] = 0;
    out[4] = 0; out[5] = sy; out[6] = 0; out[7] = 0;
    out[8] = s * sz; out[9] = 0; out[10] = c * sz; out[11] = 0;
    out[12] = tx; out[13] = ty; out[14] = tz; out[15] = 1;
    return out;
  }

  return { mat4, perspective, fpsView, forwardOf, trs };
})();
