/* ══════════════════════════════════════════════════════════════
   xeva-qr.js — 外部ライブラリを使わない QR コード（表示だけ）
   ──────────────────────────────────────────────────────────────
   ★ MagiTier の共有画面で使っていたものを、どのアプリからでも使えるように
     切り出したもの（中身は同じ）。オフラインの PWA なので CDN は使えない。
   ★ バイトモード・誤り訂正L・バージョン1〜20（最大 858 バイト）。
     これを超える文字列は入らないので、呼ぶ側で短くしてから渡すこと。

   使いかた:
     const cv = XevaQR.canvas("https://…", 220);   // <canvas> が返る
     box.appendChild(cv);
     XevaQR.fits(text)   … 入る長さかどうか
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
/* ── 最小の QR コード（バイトモード・誤り訂正L・自動バージョン） ──
   外部ライブラリを読まずに描くために、必要な範囲だけ実装してある。 */
function qrCanvas(text, px) {
  const qr = qrEncode(text);
  const n = qr.size, q = 4;
  /* ★★ 2026-09-03 ドットは小さすぎると読み取れない。
     floor だと長い文字列（バージョンが大きい）で 2px に落ちてしまうので、
     ① 数値は切り上げ、② 最低 3px にする（px は「このくらいの大きさ」の目安）。
     ★ 縮小はしない（縮めるとマスが潰れて読めなくなる）。
       画面に入りきらないぶんは CSS の max-width:100% にまかせる。 */
  const scale = Math.max(3, Math.ceil(px / (n + q * 2)));
  const cv = document.createElement("canvas");
  cv.width = cv.height = (n + q * 2) * scale;
  cv.style.imageRendering = "pixelated";
  const g = cv.getContext("2d");
  g.fillStyle = "#fff"; g.fillRect(0, 0, cv.width, cv.height);
  g.fillStyle = "#000";
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (qr.get(x, y)) g.fillRect((x + q) * scale, (y + q) * scale, scale, scale);
  return cv;
}
function qrEncode(str) {
  /* --- GF(256) --- */
  const EXP = new Array(512), LOG = new Array(256);
  for (let i = 0, x = 1; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  const mul = (a, b) => (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]];
  function rsPoly(deg) { let p = [1]; for (let i = 0; i < deg; i++) { const q = [1, EXP[i]], r = new Array(p.length + 1).fill(0);
    for (let j = 0; j < p.length; j++) for (let k = 0; k < 2; k++) r[j + k] ^= mul(p[j], q[k]); p = r; } return p; }
  function rsEnc(data, deg) {
    const gen = rsPoly(deg), res = new Array(deg).fill(0);
    data.forEach((b) => { const f = b ^ res[0]; res.shift(); res.push(0);
      for (let i = 0; i < deg; i++) res[i] ^= mul(gen[i + 1], f); });
    return res;
  }
  /* --- バージョンごとの容量（誤り訂正L・バイトモード） --- */
  const CAP_L = [17,32,53,78,106,134,154,192,230,271,321,367,425,458,520,586,644,718,792,858];
  const ECC_L = [7,10,15,20,26,18,20,24,30,18,20,24,26,30,22,24,28,30,28,28];
  const BLK_L = [1,1,1,1,1,2,2,2,2,4,4,4,4,4,6,6,6,6,7,8];
  const ALIGN = [[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],
                 [6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],
                 [6,30,56,82],[6,30,58,86],[6,34,62,90]];
  const data = new TextEncoder().encode(str);
  let ver = 0;
  while (ver < CAP_L.length && data.length > CAP_L[ver]) ver++;
  if (ver >= CAP_L.length) { ver = CAP_L.length - 1; }
  const V = ver + 1, size = 17 + V * 4;
  const ecc = ECC_L[ver], blocks = BLK_L[ver];
  /* --- ビット列 --- */
  const bits = [];
  const put = (v, n) => { for (let i = n - 1; i >= 0; i--) bits.push((v >> i) & 1); };
  put(4, 4);                                    // バイトモード
  put(data.length, V < 10 ? 8 : 16);
  data.forEach((b) => put(b, 8));
  /* 総コードワード数は表から引く（機能パターンを引いた概算では合わない） */
  const RAW = rawCodewords(V);
  const dataCw = RAW - ecc * blocks;
  put(0, Math.min(4, dataCw * 8 - bits.length));
  while (bits.length % 8) bits.push(0);
  const bytes = [];
  for (let i = 0; i < bits.length; i += 8) { let b = 0; for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j]; bytes.push(b); }
  const PAD = [0xEC, 0x11];
  for (let i = 0; bytes.length < dataCw; i++) bytes.push(PAD[i % 2]);
  /* --- ブロック分割 + RS --- */
  const short = Math.floor(dataCw / blocks), extra = dataCw % blocks;
  const dblocks = [], eblocks = [];
  let p = 0;
  for (let i = 0; i < blocks; i++) {
    const len = short + (i >= blocks - extra ? 1 : 0);
    const d = bytes.slice(p, p + len); p += len;
    dblocks.push(d); eblocks.push(rsEnc(d, ecc));
  }
  const final = [];
  const maxLen = Math.max.apply(null, dblocks.map((d) => d.length));
  for (let i = 0; i < maxLen; i++) dblocks.forEach((d) => { if (i < d.length) final.push(d[i]); });
  for (let i = 0; i < ecc; i++) eblocks.forEach((e) => final.push(e[i]));
  /* --- モジュール配置 --- */
  const m = Array.from({ length: size }, () => new Array(size).fill(null));
  const set = (x, y, v) => { if (x >= 0 && y >= 0 && x < size && y < size) m[y][x] = v; };
  const finder = (ox, oy) => {
    for (let y = -1; y <= 7; y++) for (let x = -1; x <= 7; x++) {
      const on = (x >= 0 && x <= 6 && (y === 0 || y === 6)) || (y >= 0 && y <= 6 && (x === 0 || x === 6)) || (x >= 2 && x <= 4 && y >= 2 && y <= 4);
      set(ox + x, oy + y, on ? 1 : 0);
    }
  };
  finder(0, 0); finder(size - 7, 0); finder(0, size - 7);
  for (let i = 8; i < size - 8; i++) { const v = i % 2 === 0 ? 1 : 0; set(i, 6, v); set(6, i, v); }
  const al = ALIGN[ver];
  al.forEach((ax) => al.forEach((ay) => {
    if ((ax < 8 && ay < 8) || (ax < 8 && ay > size - 9) || (ax > size - 9 && ay < 8)) return;
    for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++)
      set(ax + x, ay + y, (Math.abs(x) === 2 || Math.abs(y) === 2 || (x === 0 && y === 0)) ? 1 : 0);
  }));
  set(8, size - 8, 1);                           // ダークモジュール
  /* 形式情報の場所を予約 */
  for (let i = 0; i < 9; i++) { if (m[8][i] === null) m[8][i] = 0; if (m[i][8] === null) m[i][8] = 0; }
  for (let i = 0; i < 8; i++) { if (m[8][size - 1 - i] === null) m[8][size - 1 - i] = 0; if (m[size - 1 - i][8] === null) m[size - 1 - i][8] = 0; }
  if (V >= 7) {
    const vb = versionBits(V);
    for (let i = 0; i < 18; i++) { const b = (vb >> i) & 1, r = Math.floor(i / 3), c = i % 3;
      m[size - 11 + c][r] = b; m[r][size - 11 + c] = b; }
  }
  /* データを右下からジグザグに詰める */
  let idx = 0, bit = 7, dir = -1;
  for (let x = size - 1; x > 0; x -= 2) {
    if (x === 6) x--;
    for (let cnt = 0; cnt < size; cnt++) {
      const y = dir < 0 ? size - 1 - cnt : cnt;
      for (let k = 0; k < 2; k++) {
        const cx = x - k;
        if (m[y][cx] !== null) continue;
        let v = 0;
        if (idx < final.length) v = (final[idx] >> bit) & 1;
        if (--bit < 0) { bit = 7; idx++; }
        /* マスク0（(x+y)%2==0 で反転） */
        m[y][cx] = ((cx + y) % 2 === 0) ? (v ^ 1) : v;
      }
    }
    dir = -dir;
  }
  /* 形式情報（EC=L, mask=0） */
  const fmtBits = formatBits(0b01, 0);
  for (let i = 0; i <= 5; i++) m[8][i] = (fmtBits >> i) & 1;
  m[8][7] = (fmtBits >> 6) & 1; m[8][8] = (fmtBits >> 7) & 1; m[7][8] = (fmtBits >> 8) & 1;
  for (let i = 9; i < 15; i++) m[14 - i][8] = (fmtBits >> i) & 1;
  for (let i = 0; i < 8; i++) m[size - 1 - i][8] = (fmtBits >> i) & 1;
  for (let i = 8; i < 15; i++) m[8][size - 15 + i] = (fmtBits >> i) & 1;
  m[size - 8][8] = 1;
  return { size, get: (x, y) => !!m[y][x] };

  function rawCodewords(v) {
    /* 全モジュール数 − 機能パターン を 8 で割った数（バージョン1〜20ぶんを表で持つ） */
    const T = [26,44,70,100,134,172,196,242,292,346,404,466,532,581,655,733,815,901,991,1085];
    return T[v - 1];
  }
  function formatBits(ec, mask) {
    let d = (ec << 3) | mask, v = d << 10;
    for (let i = 4; i >= 0; i--) if (v & (1 << (i + 10))) v ^= 0x537 << i;
    return ((d << 10) | v) ^ 0x5412;
  }
  function versionBits(v) {
    let x = v << 12;
    for (let i = 5; i >= 0; i--) if (x & (1 << (i + 12))) x ^= 0x1f25 << i;
    return (v << 12) | x;
  }
}
  /* 入る長さか（バイト数で見る。UTF-8 なので日本語は1文字3バイト） */
  function fits(text) {
    try { return new TextEncoder().encode(String(text || "")).length <= 858; }
    catch (e) { return String(text || "").length <= 858; }
  }
  window.XevaQR = { canvas: qrCanvas, encode: qrEncode, fits: fits, MAX_BYTES: 858 };
})();
