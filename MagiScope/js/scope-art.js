/* ============================================================
   MagiScope — 作品の絵（キービジュアル・表紙・ジャケット）をその場で描く
   ------------------------------------------------------------
   ★ 2026-09-20b からは実画像（AniList の表紙・FANZA の表紙・iTunes のジャケット）が優先。
     ここで描くのは、画像が無い・読めないときの代わりの絵だけ（MS.artSrc / MS.imgFail）。
   ★ <img src="data:image/svg+xml…"> にしているのは、SVG の中の id（グラデーション）が
     ページの中でぶつからないようにするため。1枚ずつ閉じた文書になる。
   ★ FANZA の表紙は<b>抽象的な模様だけ</b>（人物は描かない）。
   ============================================================ */
(function () {
  "use strict";
  const MS = window.MS;
  const cache = new Map();

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const x = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const hsl = (h, s, l, a) => "hsl(" + ((h % 360) + 360) % 360 + "," + s + "%," + l + "%" + (a != null ? "," + a : "") + ")";
  const f1 = (n) => Math.round(n * 10) / 10;

  /* 文字幅（全角1・半角0.55）で折り返す */
  function wrap(str, maxW, maxLines) {
    const out = []; let line = "", w = 0;
    for (const ch of String(str)) {
      const cw = /[\x20-\x7e]/.test(ch) ? 0.56 : 1;
      if (w + cw > maxW && line) {
        out.push(line); line = ""; w = 0;
        if (out.length === maxLines) break;
      }
      line += ch; w += cw;
    }
    if (out.length < maxLines && line) out.push(line);
    else if (line && out.length === maxLines) out[maxLines - 1] = out[maxLines - 1].slice(0, -1) + "…";
    return out;
  }
  function stars(r, n, w, h, op) {
    let s = "";
    for (let i = 0; i < n; i++) s += '<circle cx="' + f1(r() * w) + '" cy="' + f1(r() * h) + '" r="' + f1(0.5 + r() * 1.6) + '" fill="#fff" opacity="' + f1(0.3 + r() * (op || 0.7)) + '"/>';
    return s;
  }
  function ridge(r, w, y0, amp, n) {
    let d = "M0 " + f1(y0 + r() * amp);
    for (let i = 1; i <= n; i++) d += " L" + f1(w * i / n) + " " + f1(y0 + (r() - 0.5) * amp * 2);
    return d;
  }

  /* ── アニメ：ジャンルで少しずつ模様を変える ── */
  function motif(g, r, w, h, hh) {
    let s = "";
    if (g === "アクション") {
      for (let i = 0; i < 9; i++) { const y = r() * h; s += '<path d="M' + f1(w * 0.1 + r() * w) + " " + f1(y) + " l" + f1(-w * 0.5) + " " + f1(h * 0.3) + '" stroke="#fff" stroke-opacity="' + f1(0.12 + r() * 0.3) + '" stroke-width="' + f1(1 + r() * 3) + '"/>'; }
    } else if (g === "恋愛") {
      for (let i = 0; i < 14; i++) {
        const ex = r() * w, ey = r() * h * 0.8;
        s += '<ellipse cx="' + f1(ex) + '" cy="' + f1(ey) + '" rx="' + f1(4 + r() * 6) + '" ry="' + f1(2 + r() * 3) + '" transform="rotate(' + f1(r() * 180) + " " + f1(ex) + " " + f1(ey) + ')" fill="' + hsl(340, 90, 85) + '" opacity="' + f1(0.35 + r() * 0.5) + '"/>';
      }
    } else if (g === "SF") {
      const hy = h * 0.66;
      for (let i = -8; i <= 8; i++) s += '<line x1="' + f1(w / 2) + '" y1="' + f1(hy) + '" x2="' + f1(w / 2 + i * w * 0.18) + '" y2="' + h + '" stroke="' + hsl(hh + 150, 100, 70) + '" stroke-opacity=".35"/>';
      for (let i = 1; i < 7; i++) { const y = hy + (h - hy) * Math.pow(i / 7, 1.8); s += '<line x1="0" y1="' + f1(y) + '" x2="' + w + '" y2="' + f1(y) + '" stroke="' + hsl(hh + 150, 100, 70) + '" stroke-opacity=".3"/>'; }
    } else if (g === "ミステリー") {
      s += '<circle cx="' + f1(w * 0.72) + '" cy="' + f1(h * 0.2) + '" r="' + f1(w * 0.12) + '" fill="#fff" opacity=".85"/><circle cx="' + f1(w * 0.76) + '" cy="' + f1(h * 0.18) + '" r="' + f1(w * 0.11) + '" fill="' + hsl(hh, 40, 14) + '"/>';
      for (let i = 0; i < 4; i++) s += '<rect x="-20" y="' + f1(h * (0.55 + i * 0.08)) + '" width="' + (w + 40) + '" height="' + f1(h * 0.05) + '" rx="' + f1(h * 0.025) + '" fill="#fff" opacity=".07"/>';
    } else if (g === "スポーツ") {
      s += '<path d="M' + f1(-w * 0.1) + " " + f1(h * 0.75) + " Q" + f1(w * 0.5) + " " + f1(h * 0.05) + " " + f1(w * 1.1) + " " + f1(h * 0.55) + '" stroke="#fff" stroke-opacity=".55" stroke-width="' + f1(w * 0.02) + '" fill="none" stroke-dasharray="' + f1(w * 0.05) + " " + f1(w * 0.03) + '"/>';
      s += '<circle cx="' + f1(w * 0.86) + '" cy="' + f1(h * 0.42) + '" r="' + f1(w * 0.06) + '" fill="#fff" opacity=".9"/>';
    } else if (g === "日常" || g === "コメディ") {
      for (let i = 0; i < 3; i++) { const cx = r() * w, cy = h * (0.12 + r() * 0.3), k = w * (0.05 + r() * 0.05); s += '<g fill="#fff" opacity=".55"><circle cx="' + f1(cx) + '" cy="' + f1(cy) + '" r="' + f1(k) + '"/><circle cx="' + f1(cx + k) + '" cy="' + f1(cy + k * 0.2) + '" r="' + f1(k * 0.8) + '"/><circle cx="' + f1(cx - k) + '" cy="' + f1(cy + k * 0.25) + '" r="' + f1(k * 0.7) + '"/></g>'; }
    } else if (g === "ファンタジー") {
      for (let i = 0; i < 18; i++) { const cx = r() * w, cy = r() * h * 0.7, k = 2 + r() * 5; s += '<path d="M' + f1(cx) + " " + f1(cy - k) + " L" + f1(cx + k * 0.3) + " " + f1(cy) + " L" + f1(cx) + " " + f1(cy + k) + " L" + f1(cx - k * 0.3) + " " + f1(cy) + 'z" fill="' + hsl(50, 100, 85) + '" opacity="' + f1(0.4 + r() * 0.5) + '"/>'; }
    }
    return s;
  }
  function anime(it, wide) {
    const seed = MS.fnv(it.id), r = rng(seed);
    const w = wide ? 480 : 300, h = wide ? 270 : 400;
    const h1 = seed % 360, h2 = h1 + 30 + r() * 90;
    const sunX = w * (0.2 + r() * 0.6), sunY = h * (wide ? 0.32 : 0.3) + r() * h * 0.12;
    let s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + " " + h + '"><defs>' +
      '<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + hsl(h1, 70, 16) + '"/><stop offset=".62" stop-color="' + hsl(h2, 72, 44) + '"/><stop offset="1" stop-color="' + hsl(h2 + 25, 85, 72) + '"/></linearGradient>' +
      '<radialGradient id="s"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".3" stop-color="' + hsl(h2 + 40, 100, 82) + '" stop-opacity=".7"/><stop offset="1" stop-color="' + hsl(h2, 100, 70) + '" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".78"/></linearGradient></defs>' +
      '<rect width="' + w + '" height="' + h + '" fill="url(#g)"/>' + stars(r, 36, w, h * 0.55) +
      '<circle cx="' + f1(sunX) + '" cy="' + f1(sunY) + '" r="' + f1(w * 0.34) + '" fill="url(#s)"/>' +
      '<circle cx="' + f1(sunX) + '" cy="' + f1(sunY) + '" r="' + f1(w * 0.09) + '" fill="#fff" opacity=".92"/>' +
      motif((it.genres || [it.genre])[0], r, w, h, h1);
    for (let k = 0; k < 3; k++) {
      const y0 = h * (0.62 + k * 0.11);
      s += '<path d="' + ridge(r, w, y0, h * 0.05, 7 + k * 3) + " L" + w + " " + h + " L0 " + h + 'z" fill="' + hsl(h1 + k * 10, 45, 10 + k * 3) + '" opacity="' + f1(0.55 + k * 0.2) + '"/>';
    }
    s += '<path d="M' + f1(-w * 0.1) + " " + f1(h * 0.55) + " C" + f1(w * 0.3) + " " + f1(h * 0.35) + " " + f1(w * 0.6) + " " + f1(h * 0.75) + " " + f1(w * 1.1) + " " + f1(h * 0.45) + '" stroke="#fff" stroke-opacity=".35" stroke-width="2" fill="none"/>';
    s += '<rect y="' + f1(h * 0.55) + '" width="' + w + '" height="' + f1(h * 0.45) + '" fill="url(#b)"/>';
    const lines = wrap(it.title, wide ? 16 : 9, 2), fs = wide ? 26 : 30;
    lines.forEach((ln, i) => {
      s += '<text x="' + f1(w * 0.06) + '" y="' + f1(h - (lines.length - i) * fs * 1.18 + fs * 0.2) + '" font-family="sans-serif" font-weight="900" font-size="' + fs + '" fill="#fff" style="paint-order:stroke" stroke="' + hsl(h1, 60, 12) + '" stroke-width="4">' + x(ln) + "</text>";
    });
    return s + "</svg>";
  }

  function fanza(it) {
    const seed = MS.fnv(it.id), r = rng(seed);
    const w = 300, h = 400, h1 = [330, 345, 280, 260, 200, 20, 300, 170][seed % 8] + r() * 20, h2 = h1 + 25 + r() * 30;
    const gold = hsl(42, 80, 70);
    let s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400"><defs>' +
      '<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + hsl(h1, 55, 14) + '"/><stop offset=".55" stop-color="' + hsl(h2, 60, 28) + '"/><stop offset="1" stop-color="' + hsl(h2 + 20, 70, 42) + '"/></linearGradient>' +
      '<radialGradient id="o"><stop offset="0" stop-color="' + hsl(h2 + 30, 100, 80) + '" stop-opacity=".75"/><stop offset="1" stop-color="' + hsl(h2, 100, 60) + '" stop-opacity="0"/></radialGradient></defs>' +
      '<rect width="300" height="400" fill="url(#g)"/>';
    const cx = 60 + r() * 180, cy = 120 + r() * 100;
    s += '<circle cx="' + f1(cx) + '" cy="' + f1(cy) + '" r="150" fill="url(#o)"/>';
    /* 花弁の模様 */
    const n = 6 + Math.floor(r() * 5), R0 = 40 + r() * 30;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 360 + r() * 8;
      s += '<ellipse cx="' + f1(cx) + '" cy="' + f1(cy - R0 * 0.6) + '" rx="' + f1(R0 * 0.32) + '" ry="' + f1(R0 * 0.7) + '" transform="rotate(' + f1(a) + " " + f1(cx) + " " + f1(cy) + ')" fill="' + hsl(h2 + 40, 90, 85) + '" opacity=".22"/>';
    }
    s += '<circle cx="' + f1(cx) + '" cy="' + f1(cy) + '" r="' + f1(R0 * 0.25) + '" fill="' + gold + '" opacity=".7"/>';
    for (let i = 0; i < 3; i++) s += '<circle cx="' + f1(cx) + '" cy="' + f1(cy) + '" r="' + f1(R0 * (1.3 + i * 0.35)) + '" fill="none" stroke="' + gold + '" stroke-opacity="' + f1(0.35 - i * 0.08) + '"/>';
    s += stars(r, 16, 300, 400, 0.4);
    s += '<rect x="12" y="12" width="276" height="376" rx="6" fill="none" stroke="' + gold + '" stroke-opacity=".55"/><rect x="18" y="18" width="264" height="364" rx="4" fill="none" stroke="' + gold + '" stroke-opacity=".25"/>';
    s += '<text x="26" y="40" font-family="serif" font-size="13" fill="' + gold + '" letter-spacing="2">' + x(it.publisher || "") + "</text>";
    s += '<rect x="' + (274 - (it.kind || "").length * 13) + '" y="28" width="' + ((it.kind || "").length * 13 + 8) + '" height="18" rx="9" fill="' + gold + '" opacity=".9"/><text x="' + (278 - (it.kind || "").length * 13) + '" y="41" font-family="sans-serif" font-weight="700" font-size="11" fill="' + hsl(h1, 50, 14) + '">' + x(it.kind || "") + "</text>";
    const lines = wrap(it.title, 9, 3);
    lines.forEach((ln, i) => {
      s += '<text x="150" y="' + (300 - (lines.length - 1 - i) * 32) + '" text-anchor="middle" font-family="serif" font-weight="700" font-size="27" fill="#fff" style="paint-order:stroke" stroke="' + hsl(h1, 50, 10) + '" stroke-width="3">' + x(ln) + "</text>";
    });
    s += '<line x1="90" y1="328" x2="210" y2="328" stroke="' + gold + '" stroke-opacity=".6"/>';
    s += '<text x="150" y="354" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#fff" opacity=".9">' + x(it.author || "") + "</text>";
    return s + "</svg>";
  }

  function karaoke(it) {
    const seed = MS.fnv(it.id), r = rng(seed);
    const h1 = seed % 360, h2 = h1 + 50 + r() * 80;
    let s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><defs>' +
      '<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + hsl(h1, 85, 58) + '"/><stop offset="1" stop-color="' + hsl(h2, 75, 26) + '"/></linearGradient>' +
      '<radialGradient id="v"><stop offset="0" stop-color="#222" /><stop offset=".22" stop-color="' + hsl(h1, 70, 60) + '"/><stop offset=".26" stop-color="#111"/><stop offset="1" stop-color="#050505"/></radialGradient></defs>' +
      '<rect width="300" height="300" fill="url(#g)"/>';
    const vx = 170 + r() * 90, vy = 150 + r() * 100, vr = 110 + r() * 40;
    s += '<circle cx="' + f1(vx) + '" cy="' + f1(vy) + '" r="' + f1(vr) + '" fill="url(#v)" opacity=".9"/>';
    for (let i = 1; i < 8; i++) s += '<circle cx="' + f1(vx) + '" cy="' + f1(vy) + '" r="' + f1(vr * (0.32 + i * 0.09)) + '" fill="none" stroke="#fff" stroke-opacity=".07"/>';
    s += '<circle cx="' + f1(vx) + '" cy="' + f1(vy) + '" r="5" fill="#fff" opacity=".8"/>';
    /* 波形 */
    let bars = "";
    for (let i = 0; i < 26; i++) { const hh = 6 + Math.pow(r(), 1.6) * 60; bars += '<rect x="' + (14 + i * 7) + '" y="' + f1(286 - hh) + '" width="4" height="' + f1(hh) + '" rx="2" fill="#fff" opacity=".75"/>'; }
    s += bars;
    const lines = wrap(it.title, 8, 3);
    lines.forEach((ln, i) => { s += '<text x="18" y="' + (48 + i * 34) + '" font-family="sans-serif" font-weight="900" font-size="30" fill="#fff" style="paint-order:stroke" stroke="' + hsl(h2, 60, 18) + '" stroke-width="3">' + x(ln) + "</text>"; });
    s += '<text x="18" y="' + (48 + lines.length * 34 + 4) + '" font-family="sans-serif" font-weight="700" font-size="15" fill="#fff" opacity=".9">' + x(wrap(it.artist || "", 14, 1)[0] || "") + "</text>";
    return s + "</svg>";
  }

  /* 画像の URL（API の image があればそれ、無ければ描く） */
  MS.artSrc = function (it, wide) {
    if (!it) return "";
    if (wide && it.banner) return it.banner;
    if (it.image) return it.image;
    const key = it.category + ":" + it.id + (wide ? ":w" : "");
    let v = cache.get(key);
    if (!v) {
      const svg = it.category === "anime" ? anime(it, wide) : it.category === "fanza" ? fanza(it) : karaoke(it);
      v = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
      if (cache.size > 900) cache.clear();
      cache.set(key, v);
    }
    return v;
  };
})();
