/* ══════════════════════════════════════════════════════════════════
   XEVARION PARK — パークの土台（★★ 2026-09-28d 全面作り直し）
   ------------------------------------------------------------------
   ご指定：「添付のマップとデザイン案のように先進的で美しく・上空から見て画像のように・密度／質／広さを大きく展開・
            実際のテーマパークを参考にリアルに・コストを考えず最高品質で」
   ・島：海に囲まれた大きな島（東西 約1.7km・南北 約1.65km）。海岸線はゆるやかに出入りする（南に GATE の岬・南西にビーチの入り江・東にマリーナ）。
   ・このファイル：配置（L・AREAS）・材質（窓の明かりつき外壁）・部品（建物・屋根・街灯・看板・道・川・橋・水）・島と海・
                   木（インスタンス＋遠くは簡略）・来場者の群れ（遠景）・影と接地の暗さの焼き込み。
   ・各エリアの中身は park_areas.js。
   （上から見て −z が北。単位はメートル。XEVARION HALL（会議場）は world.js のまま (0, −14)）
   ══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const T = THREE, X = XTex, P = XWorld.World.prototype, TAU = Math.PI * 2;
  const MOBILE = matchMedia("(pointer:coarse)").matches || /iPhone|iPad|Android/.test(navigator.userAgent);
  const SUN = new T.Vector3(0.38, 0.78, 0.5).normalize();
  const SHX = -SUN.x / SUN.y, SHZ = -SUN.z / SUN.y;          /* 高さ 1m あたりの影ののび */

  /* ══════════════ 島の形 ══════════════ */
  const ISL = { cx: 0, cz: 190, rx: 840, rz: 800, n: 3 };
  /* ★★ 2026-09-30c 島を北へ広げる（ご指定「新たに PARK を拡張して企業エリアや遊園地などの新エリアを作成」）
     北向きの大きなゆるいふくらみ（NB＝[大きさ, 中心の角度, 半分の幅]）。東のリゾート・南西のビーチの海岸はそのまま。
     ★ 海のシェーダー（SEA_FS の isl）も同じ式にすること */
  const NB = [0.5, -Math.PI / 2, 1.4];
  function bump(a, c, w) { const d = Math.abs((((a - c + Math.PI) % TAU) + TAU) % TAU - Math.PI); return d < w ? 0.5 + 0.5 * Math.cos(d / w * Math.PI) : 0; }
  function islScale0(a) {
    return 1 + 0.028 * Math.sin(3 * a + 0.7) + 0.02 * Math.sin(5 * a + 2.1) + 0.01 * Math.sin(11 * a + 0.3)
      + 0.07 * bump(a, Math.PI / 2, 0.22) - 0.07 * bump(a, 2.2, 0.3) - 0.05 * bump(a, -0.08, 0.09);
  }
  /* ★★ 2026-10-01 島をモノレールの外へ広げる（ご指定「モノレールの外側にも新エリアを開発」「超巨大な PARK」）
     台地のようなふくらみ（EXP＝[大きさ, 中心の角度, 平らな所の半分の幅, なだらかに消える幅]）を4つ：
       西（MAGIBURST LAND）・南東（MAGI BOCCIA RUSH LAND）・北東（XEVA GACHA PALACE）・北西（OUTER WOODS）。
     ビーチ（南西）・リゾート（東）・ゲート（南）・港とドーム（北）の海岸はそのまま（入り江として残る）。
     ★ モノレールは広げる前の海岸（islandPtM）にそって走る＝その外側が新しい土地。
     ★ 海のシェーダー（SEA_FS の isl）も同じ式（EXP を文字にして入れる） */
  const EXP = [[0.46, Math.PI + 0.12, 0.32, 0.22], [0.58, 0.86, 0.26, 0.24], [0.5, -0.74, 0.2, 0.2], [0.26, -2.3, 0.2, 0.22]];
  function plat(a, c, f, d) { const x = Math.abs((((a - c + Math.PI) % TAU) + TAU) % TAU - Math.PI); return x <= f ? 1 : x < f + d ? 0.5 + 0.5 * Math.cos((x - f) / d * Math.PI) : 0; }
  function expand(a) { let s = 0; for (const e of EXP) s += e[0] * plat(a, e[1], e[2], e[3]); return s; }
  function islScaleM(a) { return islScale0(a) + NB[0] * bump(a, NB[1], NB[2]); }
  function islScale(a) { return islScaleM(a) + expand(a); }
  function edgeR(a) { const c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a)); return Math.pow(Math.pow(c, ISL.n) + Math.pow(s, ISL.n), -1 / ISL.n) * islScale(a); }
  function islandPt(a, k) { const r = edgeR(a) * (k || 1); return [ISL.cx + Math.cos(a) * r * ISL.rx, ISL.cz + Math.sin(a) * r * ISL.rz]; }
  /* 広げる前の海岸（2026-09-30c の島）＝モノレールの線・「モノレールの外か内か」 */
  function edgeRM(a) { const c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a)); return Math.pow(Math.pow(c, ISL.n) + Math.pow(s, ISL.n), -1 / ISL.n) * islScaleM(a); }
  function islandPtM(a, k) { const r = edgeRM(a) * (k || 1); return [ISL.cx + Math.cos(a) * r * ISL.rx, ISL.cz + Math.sin(a) * r * ISL.rz]; }
  /* その点が、広げる前の海岸の何倍の所か（1 より大きい＝広げた土地） */
  function outerK(x, z) { const u = (x - ISL.cx) / ISL.rx, v = (z - ISL.cz) / ISL.rz, a = Math.atan2(v, u); return Math.hypot(u, v) / edgeRM(a); }
  /* 島の全体の範囲（影・草・地図・森の焼きこみに使う）＝前は数字を何か所にも直書きしていた */
  const BOUNDS = (function () { let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (let i = 0; i < 1440; i++) { const [x, z] = islandPt(i / 1440 * TAU, 1); x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); } x0 = Math.floor((x0 - 40) / 10) * 10; z0 = Math.floor((z0 - 40) / 10) * 10; x1 = Math.ceil((x1 + 40) / 10) * 10; z1 = Math.ceil((z1 + 40) / 10) * 10; return { x0, z0, x1, z1, w: x1 - x0, h: z1 - z0 }; })();
  /* 広げる前の海岸（海岸にそって作ったエリア＝リゾートなどは、この線にそって作る：中身の位置がずれないように） */
  function islandPt0(a, k) { const c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a)), r = Math.pow(Math.pow(c, ISL.n) + Math.pow(s, ISL.n), -1 / ISL.n) * islScale0(a) * (k || 1); return [ISL.cx + Math.cos(a) * r * ISL.rx, ISL.cz + Math.sin(a) * r * ISL.rz]; }
  function coastDist(x, z) { const u = (x - ISL.cx) / ISL.rx, v = (z - ISL.cz) / ISL.rz, a = Math.atan2(v, u); return (edgeR(a) - Math.hypot(u, v)) * (ISL.rx + ISL.rz) / 2; }
  P.insideIsland = function (x, z, m) { return coastDist(x, z) > (m || 0); };
  P.coastDist = coastDist;

  /* ══════════════ 配置（エリアの範囲・番号） ══════════════ */
  const AREAS = [
    { id: "gate", n: 1, name: "XEVARION GATE", x0: -130, z0: 860, x1: 130, z1: 975, c: "#3a78e8" },
    { id: "metro", n: 2, name: "XEVARION METROPOLIS", x0: -540, z0: 110, x1: -170, z1: 440, c: "#3a6ae8" },
    { id: "tower", n: 3, name: "XEVARION TOWER", x0: -300, z0: 200, x1: -200, z1: 300, c: "#2a8ad8" },
    { id: "marketW", n: 4, name: "XEVARION MARKET", x0: -112, z0: 420, x1: -42, z1: 845, c: "#ff7a3d" },
    { id: "marketE", n: 4, name: "XEVARION MARKET", x0: 42, z0: 420, x1: 112, z1: 845, c: "#ff7a3d" },
    { id: "lab", n: 5, name: "XEVARION LAB", x0: -370, z0: 455, x1: -150, z1: 620, c: "#2fa0b0" },
    { id: "space", n: 6, name: "XEVARION SPACE PORT", x0: -770, z0: 20, x1: -560, z1: 340, c: "#2a3a8a" },
    { id: "adv", n: 7, name: "XEVARION ADVENTURE", x0: -720, z0: -470, x1: -300, z1: -150, c: "#e0782a" },
    { id: "game", n: 8, name: "XEVARION GAME WORLD", x0: 165, z0: 150, x1: 410, z1: 370, c: "#8a3ad8" },
    { id: "learn", n: 9, name: "XEVARION LEARNING CITY", x0: 125, z0: -140, x1: 430, z1: 115, c: "#2fb0a0" },
    { id: "ent", n: 10, name: "XEVARION ENTERTAINMENT DISTRICT", x0: -450, z0: -140, x1: -125, z1: 85, c: "#b03ad8" },
    { id: "fountain", n: 12, name: "XEVARION CENTRAL FOUNTAIN PARK", x0: -125, z0: 165, x1: 125, z1: 415, c: "#1aa8e0" },
    { id: "sports", n: 13, name: "XEVARION SPORTS WORLD", x0: 300, z0: 650, x1: 580, z1: 845, c: "#e0402a" },
    { id: "boccia", n: 14, name: "XEVARION BOCCIA ARENA", x0: 120, z0: 600, x1: 285, z1: 780, c: "#2a6ad8" },
    { id: "soccer", n: 15, name: "XEVARION SOCCER STADIUM", x0: 340, z0: -390, x1: 560, z1: -205, c: "#2a8a4a" },
    { id: "motor", n: 16, name: "XEVARION MOTOR CITY", x0: -330, z0: -610, x1: 80, z1: -90, c: "#d8402a" },
    { id: "harbor", n: 24, name: "XEVARION HARBOR", x0: 82, z0: -605, x1: 338, z1: -272, c: "#1a8ad8" },
    { id: "dome", n: 25, name: "XEVARION DOME", x0: -230, z0: -530, x1: -20, z1: -272, c: "#a84ae8" },
    { id: "kabuki", n: 26, name: "YOMA KABUKI TOWN", x0: 642, z0: 482, x1: 800, z1: 648, c: "#e0305a" },
    { id: "ngx", n: 28, name: "NGX GLOBAL HQ", x0: 572, z0: -330, x1: 790, z1: -152, c: "#d8a520" },
    { id: "apps", n: 29, name: "XEVARION APP STREET", x0: 128, z0: 846, x1: 300, z1: 935, c: "#3a8aff" },
    { id: "yokai", n: 30, name: "YOKAI SHOTENGAI", x0: -300, z0: 846, x1: -128, z1: 935, c: "#e0602a" },
    { id: "heights", n: 32, name: "FUTURE HEIGHTS", x0: 432, z0: -150, x1: 543, z1: 238, c: "#6a5ae8" },
    { id: "shrine", n: 33, name: "YOKAI SHRINE FOREST", x0: -790, z0: -150, x1: -560, z1: 18, c: "#c83a3a" },
    { id: "ballpark", n: 31, name: "XEVARION BALLPARK", x0: -305, z0: 660, x1: -130, z1: 842, c: "#2a8a4a" },
    { id: "ngxcity", n: 34, name: "NGX CITY", x0: 340, z0: -550, x1: 600, z1: -396, c: "#d8a520" },
    { id: "wonder", n: 35, name: "YOKAI WONDERLAND", x0: -790, z0: 345, x1: -645, z1: 690, c: "#e8502a" },
    { id: "onsen", n: 36, name: "YOMA ONSEN TOWN", x0: -545, z0: -66, x1: -455, z1: 98, c: "#3a8ab8" },
    { id: "sky", n: 37, name: "SKY GARDEN", x0: 365, z0: 378, x1: 465, z1: 486, c: "#2ab87a" },
    { id: "yukaku", n: 27, name: "YOZAKURA YUKAKU", x0: 582, z0: 648, x1: 765, z1: 800, c: "#c83a6a" },
    { id: "aqua", n: 17, name: "XEVARION AQUA", x0: -640, z0: 470, x1: -385, z1: 720, c: "#1aa8e0" },
    { id: "beach", n: 18, name: "XEVARION BEACH", x0: -720, z0: 700, x1: -300, z1: 960, c: "#f0a030" },
    { id: "green", n: 19, name: "XEVARION GREEN WALK", x0: -42, z0: 415, x1: 42, z1: 860, c: "#3fae5c" },
    { id: "resort", n: 20, name: "XEVARION RESORT", x0: 545, z0: -150, x1: 800, z1: 235, c: "#e0a030" },
    { id: "night", n: 21, name: "XEVARION NIGHT ZONE", x0: 470, z0: 240, x1: 790, z1: 480, c: "#5a2a9a" },
    { id: "puzzle", n: 22, name: "XEVARION PUZZLE CITY", x0: 360, z0: 490, x1: 640, z1: 645, c: "#e04a8a" },
    { id: "media", n: 23, name: "XEVARION MEDIA CITY", x0: 125, z0: 390, x1: 360, z1: 590, c: "#2a9ad8" }
  ];
  const A = {}; AREAS.forEach((a) => { A[a.id] = a; a.cx = (a.x0 + a.x1) / 2; a.cz = (a.z0 + a.z1) / 2; });

  /* ══════════════ 手続きテクスチャ ══════════════ */
  const cache = {};
  function cvs(key, w, h, draw) { if (!cache[key]) { const c = X.cv(w, h), g = c.getContext("2d"); draw(g, w, h); cache[key] = c; } return cache[key]; }
  function texOf(c, srgb) { const t = X.tex(c, null, srgb); t.wrapS = t.wrapT = T.RepeatWrapping; return t; }
  const rgba = (c, a) => { const k = new T.Color(c); return "rgba(" + Math.round(k.r * 255) + "," + Math.round(k.g * 255) + "," + Math.round(k.b * 255) + "," + a + ")"; };
  const shade = (c, f) => { const k = new T.Color(c); k.multiplyScalar(f); return "#" + k.getHexString(); };

  /* 外壁：4階ぶん（1階 3.5m・14m 四方で1枚）。map と夜の明かり（emissive）を同時に描く */
  function facade(kind, key, o) {
    const S = 512, cols = o.cols || 6, W = S / cols, F = S / 4;
    const cm = X.cv(S, S), ce = X.cv(S, S), g = cm.getContext("2d"), e = ce.getContext("2d");
    e.fillStyle = "#000"; e.fillRect(0, 0, S, S);
    const r = X.rnd((key.length * 131 + key.charCodeAt(0) * 7) >>> 0);
    const lit = o.lit != null ? o.lit : 0.45;
    const warm = () => { const k = r(); return k < 0.6 ? "rgb(255," + (200 + r() * 30 | 0) + "," + (130 + r() * 40 | 0) + ")" : k < 0.85 ? "rgb(" + (225 + r() * 30 | 0) + ",235,255)" : "rgb(255,170,110)"; };
    if (kind === "glass") {
      for (let i = 0; i < cols; i++) {
        const gr = g.createLinearGradient(0, 0, 0, S); const b = 0.85 + r() * 0.3;
        gr.addColorStop(0, shade(o.c1, b)); gr.addColorStop(0.55, shade(o.c2, b)); gr.addColorStop(1, shade(o.c1, b * 0.9));
        g.fillStyle = gr; g.fillRect(i * W, 0, W, S);
      }
      for (let f = 0; f < 4; f++) for (let i = 0; i < cols; i++) {
        g.fillStyle = "rgba(255,255,255," + (r() * 0.1) + ")"; g.fillRect(i * W + 2, f * F + 8, W - 4, F - 14);
        if (r() < lit) { e.fillStyle = r() < 0.7 ? "rgb(210,228,255)" : warm(); e.globalAlpha = 0.55 + r() * 0.45; e.fillRect(i * W + 3, f * F + 9, W - 6, F - 18); e.globalAlpha = 1; }
      }
      g.fillStyle = rgba(o.frame || "#1c2a3a", 0.75); for (let f = 0; f < 4; f++) g.fillRect(0, f * F, S, 7);
      g.fillStyle = rgba(o.mull || "#e8f0f8", 0.55); for (let i = 0; i <= cols; i++) g.fillRect(i * W - 1, 0, 2, S);
      const s = g.createLinearGradient(0, 0, S, S); s.addColorStop(0.25, "rgba(255,255,255,0)"); s.addColorStop(0.42, "rgba(255,255,255,.22)"); s.addColorStop(0.55, "rgba(255,255,255,0)"); g.fillStyle = s; g.fillRect(0, 0, S, S);
    } else if (kind === "office" || kind === "stucco" || kind === "hotel" || kind === "brick" || kind === "tech") {
      g.fillStyle = o.wall; g.fillRect(0, 0, S, S);
      if (kind === "brick") { for (let y = 0; y < S; y += 8) for (let x = (y / 8) % 2 ? -8 : 0; x < S; x += 16) { g.fillStyle = shade(o.wall, 0.85 + r() * 0.3); g.fillRect(x + 1, y + 1, 14, 6); } }
      else { for (let i = 0; i < 900; i++) { g.fillStyle = "rgba(0,0,0," + (r() * 0.035) + ")"; g.fillRect(r() * S, r() * S, 2 + r() * 6, 2 + r() * 6); } }
      for (let f = 0; f < 4; f++) {
        if (kind === "stucco" || kind === "hotel") { g.fillStyle = rgba(o.trim || "#ffffff", 0.9); g.fillRect(0, f * F + F - 7, S, 5); g.fillStyle = "rgba(0,0,0,.12)"; g.fillRect(0, f * F + F - 2, S, 2); }
        if (kind === "tech") { g.fillStyle = o.band || "#1d2a3a"; g.fillRect(0, f * F + 22, S, 50); g.fillStyle = "rgba(255,255,255,.18)"; g.fillRect(0, f * F + 22, S, 4);
          for (let i = 0; i < cols; i++) if (r() < lit) { e.fillStyle = "rgb(200,225,255)"; e.globalAlpha = 0.5 + r() * 0.5; e.fillRect(i * W, f * F + 24, W, 46); e.globalAlpha = 1; }
          g.fillStyle = "rgba(0,0,0,.08)"; for (let i = 0; i <= cols; i++) g.fillRect(i * W, f * F, 1, F); continue; }
        for (let i = 0; i < cols; i++) {
          const wx = i * W + W * (kind === "hotel" ? 0.1 : 0.2), wy = f * F + (kind === "stucco" ? 20 : 16), ww = W * (kind === "hotel" ? 0.8 : 0.6), wh = kind === "stucco" ? 72 : kind === "hotel" ? 84 : 76;
          if (kind === "stucco") {           /* アーチ窓＋よろい戸 */
            g.fillStyle = o.shutter || "#3a7a5a"; g.fillRect(wx - 9, wy + 10, 8, wh - 10); g.fillRect(wx + ww + 1, wy + 10, 8, wh - 10);
            g.fillStyle = "#ffffff"; g.beginPath(); g.moveTo(wx - 3, wy + wh + 3); g.lineTo(wx - 3, wy + ww / 2); g.arc(wx + ww / 2, wy + ww / 2, ww / 2 + 3, Math.PI, 0); g.lineTo(wx + ww + 3, wy + wh + 3); g.fill();
            const gr = g.createLinearGradient(0, wy, 0, wy + wh); gr.addColorStop(0, o.glass || "#7aa8c8"); gr.addColorStop(1, "#243446"); g.fillStyle = gr;
            g.beginPath(); g.moveTo(wx, wy + wh); g.lineTo(wx, wy + ww / 2); g.arc(wx + ww / 2, wy + ww / 2, ww / 2, Math.PI, 0); g.lineTo(wx + ww, wy + wh); g.fill();
            g.fillStyle = "rgba(255,255,255,.8)"; g.fillRect(wx + ww / 2 - 1, wy + 4, 2, wh - 4); g.fillRect(wx, wy + wh * 0.55, ww, 2);
            g.fillStyle = rgba(o.trim || "#ffffff", 1); g.fillRect(wx - 6, wy + wh + 2, ww + 12, 5);
            if (r() < lit) { e.fillStyle = warm(); e.beginPath(); e.moveTo(wx, wy + wh); e.lineTo(wx, wy + ww / 2); e.arc(wx + ww / 2, wy + ww / 2, ww / 2, Math.PI, 0); e.lineTo(wx + ww, wy + wh); e.fill(); }
          } else if (kind === "hotel") {     /* 大きな窓＋バルコニー */
            const gr = g.createLinearGradient(0, wy, 0, wy + wh); gr.addColorStop(0, o.glass || "#8ab8d8"); gr.addColorStop(1, "#28405a"); g.fillStyle = gr; g.fillRect(wx, wy, ww, wh);
            g.fillStyle = "rgba(255,255,255,.6)"; g.fillRect(wx + ww / 2 - 1, wy, 2, wh);
            g.fillStyle = rgba(o.trim || "#ffffff", 0.95); g.fillRect(wx - 6, wy + wh - 26, ww + 12, 4); g.fillStyle = "rgba(200,230,255,.45)"; g.fillRect(wx - 6, wy + wh - 22, ww + 12, 22);
            g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(wx - 6, wy + wh, ww + 12, 6);
            if (r() < lit) { e.fillStyle = warm(); e.fillRect(wx, wy, ww, wh - 24); }
          } else {                            /* オフィス・れんが：四角い窓 */
            g.fillStyle = "rgba(0,0,0,.22)"; g.fillRect(wx - 3, wy - 3, ww + 6, wh + 8);
            const gr = g.createLinearGradient(0, wy, 0, wy + wh); gr.addColorStop(0, o.glass || "#6a9ac0"); gr.addColorStop(1, "#1a2838"); g.fillStyle = gr; g.fillRect(wx, wy, ww, wh);
            g.fillStyle = "rgba(255,255,255,.28)"; g.fillRect(wx, wy, ww, 3); g.fillRect(wx + ww / 2 - 1, wy, 2, wh);
            g.fillStyle = rgba(o.trim || "#ffffff", 0.8); g.fillRect(wx - 4, wy + wh + 2, ww + 8, 4);
            if (r() < lit) { e.fillStyle = warm(); e.fillRect(wx, wy + 3, ww, wh - 3); }
          }
        }
      }
    } else if (kind === "shop") {             /* 1階のお店（大きなショーウィンドウ・入口・看板の帯）。1枚 = 横 14m・縦 3.5m×4 だが、1階だけに使う */
      g.fillStyle = o.wall; g.fillRect(0, 0, S, S);
      for (let f = 0; f < 4; f++) for (let i = 0; i < 3; i++) {
        const x = i * S / 3 + 10, y = f * F + 30, w = S / 3 - 20, h = F - 34;
        g.fillStyle = "rgba(0,0,0,.3)"; g.fillRect(x - 3, y - 3, w + 6, h + 3);
        const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, "#fff3d8"); gr.addColorStop(1, "#c8a878"); g.fillStyle = gr; g.fillRect(x, y, w, h);
        for (let k = 0; k < 7; k++) { g.fillStyle = ["#ff5f7a", "#ffd24a", "#5ab8ff", "#7ce0a0", "#c08aff", "#ff8a3d", "#ffffff"][Math.floor(r() * 7)]; g.fillRect(x + 6 + r() * (w - 26), y + h * 0.35 + r() * h * 0.45, 8 + r() * 14, 8 + r() * 14); }
        g.fillStyle = "rgba(255,255,255,.35)"; g.fillRect(x, y, w, 4); g.fillStyle = "#2a2a30"; g.fillRect(x + w / 2 - 1, y, 2, h);
        e.fillStyle = "rgb(255,226,170)"; e.fillRect(x, y, w, h);
        g.fillStyle = shade(o.wall, 0.7); g.fillRect(0, f * F + 6, S, 16);
      }
    } else if (kind === "neon") {
      g.fillStyle = o.wall || "#1a1428"; g.fillRect(0, 0, S, S);
      for (let i = 0; i < 700; i++) { g.fillStyle = "rgba(255,255,255," + (r() * 0.04) + ")"; g.fillRect(r() * S, r() * S, 3, 3); }
      const ncol = o.neon || ["#ff4fb0", "#4ff0ff", "#ffe04a", "#a86aff"];
      for (let f = 0; f < 4; f++) {
        for (let i = 0; i < cols; i++) { const x = i * W + 8, y = f * F + 18; g.fillStyle = "#0c0a18"; g.fillRect(x, y, W - 16, F - 36); if (r() < 0.55) { e.fillStyle = r() < 0.5 ? "rgb(255,160,220)" : "rgb(150,220,255)"; e.globalAlpha = 0.35 + r() * 0.4; e.fillRect(x, y, W - 16, F - 36); e.globalAlpha = 1; } }
        const c = ncol[f % ncol.length]; g.fillStyle = c; g.fillRect(0, f * F + 4, S, 5); e.fillStyle = c; e.fillRect(0, f * F + 3, S, 7);
      }
      for (let i = 0; i < 3; i++) { const c = ncol[(i + 1) % ncol.length], x = r() * S; g.fillStyle = c; g.fillRect(x, 0, 4, S); e.fillStyle = c; e.fillRect(x - 1, 0, 6, S); }
    }
    const map = texOf(cm), emi = texOf(ce);
    const m = new T.MeshStandardMaterial({ map, emissiveMap: emi, emissive: new T.Color(0xffffff), emissiveIntensity: 0, roughness: o.rough != null ? o.rough : kind === "glass" ? 0.08 : 0.72, metalness: o.metal != null ? o.metal : kind === "glass" ? 0.55 : 0.05 });
    m.envMapIntensity = kind === "glass" ? 1.25 : 0.45;
    m.userData.night = { day: kind === "neon" ? 0.55 : 0, night: kind === "neon" ? 1.8 : kind === "shop" ? 1.5 : 1.35 };
    return m;
  }
  /* 屋根：瓦・金属・砂利・芝 */
  function roofTex(kind, c) {
    return texOf(cvs("roof" + kind + c, 256, 256, (g) => {
      const r = X.rnd(c.length * 17 + kind.length);
      g.fillStyle = c; g.fillRect(0, 0, 256, 256);
      if (kind === "tile") for (let y = 0; y < 256; y += 16) for (let x = (y / 16) % 2 ? -12 : 0; x < 256; x += 24) { g.fillStyle = shade(c, 0.82 + r() * 0.3); g.beginPath(); g.ellipse(x + 12, y + 10, 12, 9, 0, 0, Math.PI); g.fill(); g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(x, y + 14, 24, 2); }
      else if (kind === "metal") for (let x = 0; x < 256; x += 16) { g.fillStyle = "rgba(255,255,255,.18)"; g.fillRect(x, 0, 3, 256); g.fillStyle = "rgba(0,0,0,.15)"; g.fillRect(x + 3, 0, 2, 256); }
      else if (kind === "gravel") { for (let i = 0; i < 5000; i++) { const v = 120 + r() * 90; g.fillStyle = "rgba(" + v + "," + v + "," + (v - 6) + ",.5)"; g.fillRect(r() * 256, r() * 256, 1.5, 1.5); } g.strokeStyle = "rgba(0,0,0,.2)"; g.strokeRect(0, 0, 256, 256); }
      else if (kind === "green") for (let i = 0; i < 3000; i++) { g.fillStyle = "rgba(" + (50 + r() * 50) + "," + (110 + r() * 70) + "," + (40 + r() * 30) + ",.6)"; g.fillRect(r() * 256, r() * 256, 2, 3); }
    }));
  }
  function simpleTex(key, base, draw) { return texOf(cvs(key, 256, 256, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); if (draw) draw(g, w, h, X.rnd(key.length * 29 + 5)); })); }

  P.parkMaterials = function () {
    const w = this, m = w.m;
    w.nightMats = []; w.nightObjs = []; w.waterMats = []; w.casters = []; w.trees = []; w.lamps = []; w.walkPaths = []; w.plazas = []; w.crowdSpots = []; w.places = []; w.roads = [];
    const std = (o, env) => { const x = new T.MeshStandardMaterial(o); x.envMapIntensity = env != null ? env : 0.45; return x; };
    const fac = (key, kind, o) => { const mm = facade(kind, key, o); m[key] = mm; w.nightMats.push({ m: mm, day: mm.userData.night.day, night: mm.userData.night.night }); };
    /* 外壁 */
    fac("gBlue", "glass", { c1: "#bfe0f8", c2: "#2a5a8a" }); fac("gTeal", "glass", { c1: "#c8f4ee", c2: "#1f6a70" }); fac("gGold", "glass", { c1: "#fff0c8", c2: "#8a5a20", lit: 0.55 });
    fac("gPurple", "glass", { c1: "#eed8ff", c2: "#4a2a8a" }); fac("gSilver", "glass", { c1: "#eef2f6", c2: "#5a6878", mull: "#ffffff" }); fac("gGreen", "glass", { c1: "#d8f8e0", c2: "#2a6a4a" });
    fac("gDark", "glass", { c1: "#9ab0c8", c2: "#141e2c", lit: 0.6 }); fac("gRose", "glass", { c1: "#ffe0ec", c2: "#8a3a5a" });
    fac("oWhite", "office", { wall: "#ece8e0", glass: "#6a9ac0", cols: 6, lit: 0.4 }); fac("oBeige", "office", { wall: "#d6c4a8", glass: "#5a88b0", cols: 5, lit: 0.45 });
    fac("oGray", "office", { wall: "#a8b0ba", glass: "#7ab0d8", cols: 7, lit: 0.35 }); fac("oBlue", "office", { wall: "#c8d8ec", glass: "#4a78a8", cols: 6, lit: 0.4 });
    fac("hWhite", "hotel", { wall: "#f8f4ec", trim: "#ffffff", glass: "#8ab8d8", cols: 5, lit: 0.5 }); fac("hSand", "hotel", { wall: "#f0dcc0", trim: "#fff6e8", cols: 5, lit: 0.5 });
    fac("hPink", "hotel", { wall: "#fbe4ea", trim: "#ffffff", cols: 5, lit: 0.5 }); fac("hMint", "hotel", { wall: "#dff4ec", trim: "#ffffff", cols: 5, lit: 0.45 });
    [["sPink", "#f7c8d0", "#6a8ad0"], ["sYellow", "#f8e0a0", "#3a7a5a"], ["sMint", "#bfe8d4", "#c84a5a"], ["sBlue", "#bcd8f4", "#e0a040"], ["sCream", "#f6ecd8", "#4a6ab8"],
      ["sLav", "#dccaf0", "#3a8a7a"], ["sPeach", "#f8c8a8", "#3a5a9a"], ["sRed", "#d86a5a", "#f0e0c0"], ["sTeal", "#7cc8c0", "#f8e8c8"], ["sWhite", "#fbfaf6", "#3a6ab8"]].forEach(([k, wall, sh]) => fac(k, "stucco", { wall, shutter: sh, cols: 5, lit: 0.5 }));
    fac("shopA", "shop", { wall: "#3a3a48" }); fac("shopB", "shop", { wall: "#6a3a2a" }); fac("shopC", "shop", { wall: "#2a4a5a" }); fac("shopD", "shop", { wall: "#e8e0d0" });
    fac("techW", "tech", { wall: "#f2f4f6", band: "#1d2a3a", cols: 8, lit: 0.55 }); fac("techG", "tech", { wall: "#d8dde4", band: "#243a50", cols: 8, lit: 0.5 });
    fac("brick", "brick", { wall: "#a8503a", glass: "#4a6a88", trim: "#e8dcc8", cols: 5, lit: 0.45 }); fac("brickD", "brick", { wall: "#6a3a30", glass: "#4a6a88", trim: "#d8c8b0", cols: 5, lit: 0.5 });
    fac("neonA", "neon", { wall: "#1a1428", cols: 6 }); fac("neonB", "neon", { wall: "#10182a", cols: 5, neon: ["#4ff0ff", "#a86aff", "#ff4fb0"] }); fac("neonC", "neon", { wall: "#241030", cols: 6, neon: ["#ffe04a", "#ff4fb0", "#4fff9a"] });
    /* 屋根 */
    [["rRed", "tile", "#c8483a"], ["rBlue", "tile", "#3a64c8"], ["rPurple", "tile", "#7a4ac8"], ["rTeal", "tile", "#2a9a90"], ["rOrange", "tile", "#e07a3a"], ["rSlate", "tile", "#4a5462"], ["rPink", "tile", "#e87aa8"], ["rGold", "tile", "#e0b040"],
      ["rMetal", "metal", "#9aa4b0"], ["rMetalW", "metal", "#e8ecf0"], ["rMetalB", "metal", "#3a6ab0"], ["rGravel", "gravel", "#9a9690"], ["rGreen", "green", "#4a8a3a"]].forEach(([k, kind, c]) => { m[k] = std({ map: roofTex(kind, c), roughness: kind === "metal" ? 0.4 : 0.85, metalness: kind === "metal" ? 0.5 : 0 }); });
    /* 地面・床 */
    const flat = (mm) => { mm.polygonOffset = true; mm.polygonOffsetFactor = -1; mm.polygonOffsetUnits = -2; return mm; };
    m.islandLawn = std({ map: X.lawnTex([1, 1], "island2", "#62b440", "rgba(255,245,160,.9)"), roughness: 1 }, 0.15);
    m.lawnPark = flat(std({ map: X.lawnTex([1, 1], "park3", "#58a63c", "rgba(255,255,255,.9)"), roughness: 1 }, 0.15));
    m.sand = std({ map: simpleTex("sand2", "#f0e0b8", (g, w, h, r) => { for (let i = 0; i < 6000; i++) { const v = 210 + r() * 45; g.fillStyle = "rgba(" + v + "," + (v - 14) + "," + (v - 50) + ",.5)"; g.fillRect(r() * w, r() * h, 1.5, 1.5); } }), roughness: 1 }, 0.2);
    m.sandFlat = flat(m.sand.clone());
    m.plaza = flat(std({ map: simpleTex("plaza2", "#cfc4b2", (g, w, h, r) => { for (let y = 0; y < h; y += 64) for (let x = 0; x < w; x += 64) { g.fillStyle = shade(["#d6cbb8", "#cbbfac", "#dcd2c0", "#c4b8a4"][Math.floor(r() * 4)], 0.94 + r() * 0.1); g.fillRect(x + 2, y + 2, 60, 60); for (let k = 0; k < 40; k++) { g.fillStyle = "rgba(90,80,70," + (r() * 0.08) + ")"; g.fillRect(x + 2 + r() * 58, y + 2 + r() * 58, 2, 2); } } g.fillStyle = "rgba(110,100,90,.55)"; for (let y = 0; y < h; y += 64) g.fillRect(0, y, w, 2); for (let x = 0; x < w; x += 64) g.fillRect(x, 0, 2, h); }), roughness: 0.75 }, 0.3));
    m.plazaGray = flat(std({ map: simpleTex("plazaG2", "#a9aeb6", (g, w, h, r) => { for (let y = 0; y < h; y += 42) for (let x = (y / 42) % 2 ? -42 : 0; x < w; x += 84) { g.fillStyle = shade("#b4b9c0", 0.86 + r() * 0.16); g.fillRect(x + 2, y + 2, 80, 38); } }), roughness: 0.7 }, 0.3));
    m.brickPave = flat(std({ map: simpleTex("brickPave", "#b0624a", (g, w, h, r) => { for (let y = 0; y < h; y += 16) for (let x = (y / 16) % 2 ? -16 : 0; x < w; x += 32) { g.fillStyle = shade("#b8664c", 0.85 + r() * 0.25); g.fillRect(x + 1, y + 1, 30, 14); } }), roughness: 0.8 }));
    m.paverWarm.polygonOffset = true; m.paverWarm.polygonOffsetFactor = -1; m.paverWarm.polygonOffsetUnits = -2;
    m.asphaltCity = flat(std({ map: X.asphaltTex([1, 1]), roughness: 0.85 }, 0.3));
    m.roadLine = flat(new T.MeshStandardMaterial({ color: 0xf4f4f0, roughness: 0.6 }));
    m.woodDeck = flat(std({ map: X.woodTex("#b88a5a", "#a07448", [1, 1], "deck"), roughness: 0.7 }));
    m.rubberBlue = flat(std({ color: 0x3a6ac8, roughness: 0.9 })); m.rubberRed = flat(std({ color: 0xc8503a, roughness: 0.9 })); m.rubberGreen = flat(std({ color: 0x3a9a5a, roughness: 0.9 }));
    m.courtOrange = flat(std({ color: 0xd8823a, roughness: 0.85 })); m.courtTeal = flat(std({ color: 0x2a8a8a, roughness: 0.85 }));
    m.darkGround = flat(std({ color: 0x2a2440, roughness: 0.8 }, 0.5));
    m.soilDark = std({ color: 0x5a4030, roughness: 1 });
    ["turf", "lineW", "courtBlue", "asphalt", "lawn", "paver"].forEach((k) => { if (m[k]) flat(m[k]); });
    /* 石・金属・色 */
    m.stoneW = std({ map: X.stoneTex("#f2eee6", "rgba(170,160,150,.3)", [1, 1], "stoneW", 7), roughness: 0.5 });
    m.stoneBeige = std({ map: X.stoneTex("#dccab0", "rgba(120,100,80,.35)", [1, 1], "stoneB", 9), roughness: 0.7 });
    m.stoneGray = std({ map: X.stoneTex("#9a9ca2", "rgba(40,40,50,.35)", [1, 1], "stoneG", 11), roughness: 0.8 });
    m.castle = std({ map: X.stoneTex("#f0e8f6", "rgba(120,100,150,.35)", [1, 1], "castleW2", 41), roughness: 0.7 });
    m.castleDark = std({ map: X.stoneTex("#3e3260", "rgba(20,10,40,.5)", [1, 1], "castleD2", 42), roughness: 0.7 });
    m.rock = std({ map: simpleTex("rock2", "#8a6a52", (g, w, h, r) => { for (let i = 0; i < 300; i++) { g.fillStyle = "rgba(" + (90 + r() * 80 | 0) + "," + (70 + r() * 55 | 0) + "," + (50 + r() * 40 | 0) + ",.6)"; g.beginPath(); g.ellipse(r() * w, r() * h, 6 + r() * 20, 4 + r() * 10, r() * 3, 0, 7); g.fill(); } }), roughness: 0.95 }, 0.2);
    m.rockRed = std({ map: simpleTex("rock3", "#b0603a", (g, w, h, r) => { for (let i = 0; i < 300; i++) { g.fillStyle = "rgba(" + (140 + r() * 70 | 0) + "," + (70 + r() * 50 | 0) + "," + (40 + r() * 30 | 0) + ",.6)"; g.beginPath(); g.ellipse(r() * w, r() * h, 8 + r() * 24, 3 + r() * 8, 0, 0, 7); g.fill(); } }), roughness: 0.95 }, 0.2);
    m.white2 = std({ color: 0xf6f7f9, roughness: 0.45 });
    m.offWhite = std({ color: 0xebe6dc, roughness: 0.6 });
    m.chromeB = std({ color: 0xdfe6ee, roughness: 0.15, metalness: 0.95 }, 1.0);
    m.gold = std({ color: 0xe8b84a, roughness: 0.3, metalness: 0.9 }, 1.0);
    m.copper = std({ color: 0x5ab8a0, roughness: 0.5, metalness: 0.4 });
    m.darkMetal = std({ color: 0x2a2e36, roughness: 0.4, metalness: 0.7 });
    m.windowDark = std({ color: 0x223040, roughness: 0.1, metalness: 0.6 }, 1.0);
    m.glassClear = new T.MeshStandardMaterial({ color: 0xcfe6f6, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.35, depthWrite: false }); m.glassClear.envMapIntensity = 1.2;
    m.glassDome = new T.MeshStandardMaterial({ color: 0xbfe4ff, roughness: 0.06, metalness: 0.4, transparent: true, opacity: 0.5 }); m.glassDome.envMapIntensity = 1.4;
    m.glassDomeP = new T.MeshStandardMaterial({ color: 0xe0c8ff, roughness: 0.06, metalness: 0.4, transparent: true, opacity: 0.55 }); m.glassDomeP.envMapIntensity = 1.4; m.glassDome.side = m.glassDomeP.side = T.DoubleSide; m.glassDome.depthWrite = m.glassDomeP.depthWrite = false;   /* ★ ドームの中からもガラスが見える */
    const col = (c, r, mt) => std({ color: c, roughness: r != null ? r : 0.55, metalness: mt || 0 });
    Object.assign(m, {
      pRed: col(0xe04a5a), pBlue: col(0x3a78e8), pYellow: col(0xffd23a), pGreen: col(0x4fc07a), pPurple: col(0x8a5ae0), pPink: col(0xff7ab4), pOrange: col(0xff8a3a), pTeal: col(0x2fbfb0), pWhite: col(0xffffff), pNavy: col(0x1f2f5a), pBlack: col(0x18181c, 0.4),
      paleY: col(0xffeaa8), paleB: col(0xbfe0ff), paleP: col(0xffd0e4), paleG: col(0xc8f0d0), paleV: col(0xe0d0ff), paleO: col(0xffd4b0),
      palmTrunk: col(0x9a7a52, 0.9), trunk2: col(0x6a4a34, 0.9), leafDark: col(0x3a7a3a, 0.8), leafLight: col(0x68b048, 0.8), hedge: std({ map: simpleTex("hedge", "#3f7f3a", (g, w, h, r) => { for (let i = 0; i < 2500; i++) { g.fillStyle = "rgba(" + (40 + r() * 50 | 0) + "," + (100 + r() * 70 | 0) + "," + (30 + r() * 40 | 0) + ",.7)"; g.beginPath(); g.arc(r() * w, r() * h, 2 + r() * 3, 0, 7); g.fill(); } }), roughness: 0.9 }, 0.2),
      rail: col(0xdfe3e8, 0.3, 0.7), railRed: col(0xd8303a, 0.35, 0.4), railBlue: col(0x2a6ae8, 0.35, 0.4), railYellow: col(0xffc830, 0.35, 0.4), railGreen: col(0x2ac870, 0.35, 0.4), railPurple: col(0x9a4ae8, 0.35, 0.4),
      seatsRed: col(0xd83a4a, 0.7), seatsBlue2: col(0x2a5ad8, 0.7), seatsWhite: col(0xe8ecf2, 0.7), seatsYellow: col(0xf0c030, 0.7),
      track: flat(col(0xc8503a, 0.9)), fabricW: col(0xfaf8f2, 0.8), fabricR: col(0xe84a5a, 0.8), fabricB: col(0x3a8aff, 0.8), fabricY: col(0xffd24a, 0.8),
      awningR: std({ map: simpleTex("awR", "#ff5a6a", (g, w, h) => { for (let i = 0; i < 8; i++) if (i % 2) { g.fillStyle = "#fff"; g.fillRect(i * w / 8, 0, w / 8, h); } }), roughness: 0.75 }),
      awningB: std({ map: simpleTex("awB", "#3a8aff", (g, w, h) => { for (let i = 0; i < 8; i++) if (i % 2) { g.fillStyle = "#fff"; g.fillRect(i * w / 8, 0, w / 8, h); } }), roughness: 0.75 }),
      awningG: std({ map: simpleTex("awG", "#3fc07a", (g, w, h) => { for (let i = 0; i < 8; i++) if (i % 2) { g.fillStyle = "#fff"; g.fillRect(i * w / 8, 0, w / 8, h); } }), roughness: 0.75 }),
      awningY: std({ map: simpleTex("awY", "#ffc830", (g, w, h) => { for (let i = 0; i < 8; i++) if (i % 2) { g.fillStyle = "#fff"; g.fillRect(i * w / 8, 0, w / 8, h); } }), roughness: 0.75 }),
      awningP: std({ map: simpleTex("awP", "#b07ae8", (g, w, h) => { for (let i = 0; i < 8; i++) if (i % 2) { g.fillStyle = "#fff"; g.fillRect(i * w / 8, 0, w / 8, h); } }), roughness: 0.75 }),
      rocketW: col(0xf4f6fa, 0.3, 0.3), rocketR: col(0xe0303a, 0.3, 0.2)
    });
    /* 光るもの（夜は明るく：色を HDR で強める） */
    const glow = (key, hex, day, night) => { const mm = new T.MeshBasicMaterial({ color: hex, toneMapped: false }); m[key] = mm; w.nightMats.push({ m: mm, base: new T.Color(hex), day, night }); };
    glow("neonPink", 0xff4fb0, 1.0, 3.2); glow("neonCyan", 0x4ff0ff, 1.0, 3.0); glow("neonPurple", 0xa86aff, 1.0, 3.2); glow("neonYellow", 0xffe04a, 1.0, 2.8);
    glow("neonGreen", 0x4fff9a, 1.0, 2.8); glow("neonOrange", 0xff8a3a, 1.0, 3.0); glow("neonWhite", 0xf4f8ff, 1.0, 2.6); glow("neonRed", 0xff3a4a, 1.0, 3.0); glow("neonBlue", 0x3a8aff, 1.0, 3.2);
    glow("lampGlow", 0xfff0d0, 1.0, 4.0); glow("lampGlowB", 0xd8ecff, 1.0, 3.6);
    if (m.lightPanel) w.nightMats.push({ m: m.lightPanel, base: new T.Color(0xfffaf0), day: 1.0, night: 2.4 });
    ["ledBlue", "ledPink", "ledGold", "ledCyan"].forEach((k) => { if (m[k]) w.nightMats.push({ m: m[k], base: m[k].color.clone(), day: 1.0, night: 2.6 }); });
    /* ★ 色だけの材質は「頂点の色」の材質にまとめる（world.js の Batch） */
    const fam = {
      vcStd: std({ vertexColors: true, roughness: 0.55 }), vcMetal: std({ vertexColors: true, roughness: 0.35, metalness: 0.5 }, 0.8),
      vcGloss: std({ vertexColors: true, roughness: 0.2, metalness: 0.85 }, 1.0), vcGlow: new T.MeshBasicMaterial({ vertexColors: true, toneMapped: false })
    };
    Object.assign(m, fam); w.nightMats.push({ m: fam.vcGlow, base: new T.Color(1, 1, 1), day: 1.0, night: 3.0 });
    const toFam = (keys, f) => keys.forEach((k) => { const mm = m[k]; if (!mm || mm.map || mm.transparent || mm.polygonOffset) return; mm.userData.vc = { fam: f, mat: fam[f], color: mm.color.clone() }; });
    toFam(["white2", "offWhite", "pRed", "pBlue", "pYellow", "pGreen", "pPurple", "pPink", "pOrange", "pTeal", "pWhite", "pNavy", "pBlack", "paleY", "paleB", "paleP", "paleG", "paleV", "paleO",
      "seatsRed", "seatsBlue2", "seatsWhite", "seatsYellow", "fabricW", "fabricR", "fabricB", "fabricY", "palmTrunk", "trunk2", "leafDark", "rocketW", "rocketR", "boardBlue", "boardRed", "steelWhite", "trunk", "soil", "soilDark", "warmWhite", "seat", "seatBlue", "black", "seatsTier", "stageTop"], "vcStd");
    toFam(["rail", "railRed", "railBlue", "railYellow", "railGreen", "railPurple", "copper"], "vcMetal");
    toFam(["steel", "chrome", "darkMetal", "chromeB", "gold", "windowDark"], "vcGloss");
    toFam(["neonPink", "neonCyan", "neonPurple", "neonYellow", "neonGreen", "neonOrange", "neonWhite", "neonRed", "neonBlue", "lampGlow", "lampGlowB", "lightPanel", "ledBlue", "ledPink", "ledGold", "ledCyan"], "vcGlow");
    ["neonPink", "neonCyan", "neonPurple", "neonYellow", "neonGreen", "neonOrange", "neonWhite", "neonRed", "neonBlue", "lampGlow", "lampGlowB", "lightPanel", "ledBlue", "ledPink", "ledGold", "ledCyan"].forEach((k) => { if (m[k] && m[k].userData.vc) m[k].userData.vc.color = m[k].color.clone(); });
    /* 看板のアトラス */
    w.signAtlas = new SignAtlas(w);
  };

  /* ══════════════ 看板（1枚の大きな絵にまとめて描く＝まとめ描きできる） ══════════════ */
  function SignAtlas(w) { this.w = w; this.pages = []; }
  SignAtlas.prototype.page = function () {
    const c = X.cv(2048, 2048), g = c.getContext("2d");
    const tex = X.tex(c); tex.anisotropy = 8;
    const key = "sign" + this.pages.length;
    const mat = new T.MeshBasicMaterial({ map: tex, toneMapped: false });
    this.w.m[key] = mat; this.w.nightMats.push({ m: mat, base: new T.Color(1, 1, 1), day: 1.0, night: 1.5 });
    const p = { c, g, tex, key, x: 0, y: 0, rowH: 0 };
    this.pages.push(p); return p;
  };
  SignAtlas.prototype.slot = function (pw, ph) {
    let p = this.pages[this.pages.length - 1];
    if (!p) p = this.page();
    if (p.x + pw > 2048) { p.x = 0; p.y += p.rowH; p.rowH = 0; }
    if (p.y + ph > 2048) { p = this.page(); }
    const s = { p, x: p.x, y: p.y, w: pw, h: ph };
    p.x += pw; p.rowH = Math.max(p.rowH, ph);
    return s;
  };
  function drawSign(g, x, y, w, h, text, o) {
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    if (o.bg) { g.fillStyle = o.bg; g.fillRect(x, y, w, h); }
    if (o.grad) { const gr = g.createLinearGradient(x, y, x + w, y + h); o.grad.forEach((s, i) => gr.addColorStop(i / (o.grad.length - 1), s)); g.fillStyle = gr; g.fillRect(x, y, w, h); }
    if (o.border) { g.strokeStyle = o.border; g.lineWidth = Math.max(3, h * 0.06); g.strokeRect(x + g.lineWidth / 2 + 2, y + g.lineWidth / 2 + 2, w - g.lineWidth - 4, h - g.lineWidth - 4); }
    const lines = String(text).split("\n");
    let fs = o.size || Math.min(h * 0.64 / lines.length, w * 0.92 / Math.max(...lines.map((l) => Math.max(1, l.length))) * 1.75);
    g.font = (o.weight || 900) + " " + fs + "px 'M PLUS Rounded 1c','Hiragino Sans','Yu Gothic',sans-serif";
    const maxW = Math.max(...lines.map((l) => g.measureText(l).width)); if (maxW > w * 0.92) { fs *= w * 0.92 / maxW; g.font = (o.weight || 900) + " " + fs + "px 'M PLUS Rounded 1c','Hiragino Sans','Yu Gothic',sans-serif"; }
    g.textAlign = "center"; g.textBaseline = "middle";
    if (o.glow) { g.shadowColor = o.glow; g.shadowBlur = fs * 0.35; }
    g.fillStyle = o.color || "#fff";
    lines.forEach((l, i) => g.fillText(l, x + w / 2, y + h / 2 + (i - (lines.length - 1) / 2) * fs * 1.12));
    g.restore();
  }
  /* 看板を置く：text, {bg, grad, color, glow, border, px（横の画素）, both（裏にも）}, 幅w・高さh（m）, 中心 x,y,z, 向き ry */
  P.sign = function (text, o, sw, sh, x, y, z, ry, extra) {
    o = o || {};
    const pw = o.px || (sw / sh > 5 ? 1024 : 512), ph = Math.max(64, Math.round(pw * sh / sw / 8) * 8);
    const s = this.signAtlas.slot(pw, Math.min(512, ph));
    drawSign(s.p.g, s.x, s.y, s.w, s.h, text, o);
    const g = new T.PlaneGeometry(sw, sh), uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (s.x + uv.getX(i) * s.w) / 2048, 1 - (s.y + (1 - uv.getY(i)) * s.h) / 2048);
    const add = (r, off) => this.batch.add(s.p.key, this.m[s.p.key], g, new T.Matrix4().compose(new T.Vector3(x + Math.sin(r) * off, y, z + Math.cos(r) * off), new T.Quaternion().setFromEuler(new T.Euler(0, r, 0)), new T.Vector3(1, 1, 1)), extra && extra.detail);
    add(ry || 0, 0.01);
    if (o.both) add((ry || 0) + Math.PI, 0.01);
  };

  /* ══════════════ 部品 ══════════════ */
  const _m4 = new T.Matrix4(), _q = new T.Quaternion(), _e = new T.Euler(), _v = new T.Vector3(), _s = new T.Vector3(1, 1, 1);
  function M(x, y, z, ry, sx, sy, sz) { _e.set(0, ry || 0, 0); _q.setFromEuler(_e); _v.set(x, y, z); _s.set(sx || 1, sy || 1, sz || 1); return new T.Matrix4().compose(_v, _q, _s); }
  P.geo = function (key, g, x, y, z, ry, detail) { if (this._landmark && !detail && !this._detail) { if (!g.boundingBox) g.computeBoundingBox(); if (g.boundingBox.max.y + y > 30) detail = "L"; } this.batch.add(key, this.m[key], g, M(x || 0, y || 0, z || 0, ry), detail || this._detail); };
  /* 小物（遠くでは描かない） */
  P.detail = function (f) { const d = this._detail; this._detail = true; try { f(); } finally { this._detail = d; } };
  /* 回転した長方形の当たり判定（細かい正方形でうめる・45°などでもぴったり） */
  /* ★ 2026-09-29 回転した長方形は1つの「回転した箱」の当たりに（前は小さな四角の集まりでギザギザ・角にすき間） */
  P.colRot = function (x, z, w, d, ry) { this.colObb(x, z, w, d, ry || 0); };
  /* 影を落とすもの（焼き込み用）：回転した長方形 */
  P.caster = function (x, z, w, d, h, ry) {
    const c = Math.cos(ry || 0), s = Math.sin(ry || 0), pts = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([a, b]) => [x + a * c + b * s, z - a * s + b * c]);
    this.casters.push({ pts, h });
  };
  P.casterCircle = function (x, z, r, h) { const pts = []; for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; pts.push([x + Math.cos(a) * r, z + Math.sin(a) * r]); } this.casters.push({ pts, h }); };

  /* 建物：x,z 中心・幅 w（ry=0 で x 方向）・奥行き d・高さ h
     o = { key 外壁, ry, roof: "flat"|"gable"|"hip"|"dome"|"none", roofKey, shop 1階の店の外壁, crown 光る帯, parapet, uv, y, noCol, sign:{text,...} } */
  P.bld = function (x, z, w, d, h, o) {
    o = o || {};
    const W = this, ry = o.ry || 0, y0 = o.y || 0, key = o.key || "oWhite", uv = o.uv || 14;
    const c = Math.cos(ry), s = Math.sin(ry), L = (a, b) => [x + a * c + b * s, z - a * s + b * c];
    let yb = y0;
    if (o.inside) { const [ox, oz] = L(o.inside.doorX || 0, d / 2 + 1.3), pr = { x: ox, z: oz }; W.resolve(pr, 0.3); if (Math.hypot(pr.x - ox, pr.z - oz) > 0.05) o = Object.assign({}, o, { inside: null }); }     /* 入口の前がほかの物でふさがっているときは、中を作らない（ふつうの建物） */
    if (o.inside) {                 /* ★ 2026-09-29 1階は中まである（park_interiors.js） */
      const hi = o.inside.h || (o.shop ? 4.4 : Math.min(h, 6));
      W.enterable(x, z, w, d, hi, ry, Object.assign({ key: o.shop || key, name: (o.sign && o.sign.text) || o.inside.name }, o.inside));
      yb = y0 + hi; if (h - hi > 0.3) W.box("offWhite", x, yb - 0.2, z, w + 0.4, 0.5, d + 0.4, { ry });   /* 下の面は天井（hi−0.24）より上＝部屋の中から見えない */
    } else if (o.shop) { W.box(o.shop, x, yb, z, w, 4.4, d, { ry, uv: 14 }); yb += 4.4; W.box("offWhite", x, yb - 0.25, z, w + 0.5, 0.5, d + 0.5, { ry }); }
    if (h - (yb - y0) > 0.1) W.box(key, x, yb, z, w, h - (yb - y0), d, { ry, uv });
    const top = y0 + h;
    if (!o.noCol && !o.inside) W.colRot(x, z, w, d, ry);
    W.caster(x, z, w, d, top, ry);
    const roof = o.roof || "flat";
    if (roof === "flat") {
      W.box(o.roofKey || "rGravel", x, top, z, w - 0.2, 0.3, d - 0.2, { ry, uv: 8 });
      if (o.parapet !== false) { const pk = o.parapetKey || "offWhite"; [[0, d / 2, w, 0.3], [0, -d / 2, w, 0.3], [w / 2, 0, 0.3, d], [-w / 2, 0, 0.3, d]].forEach(([a, b, ww, dd]) => { const [px, pz] = L(a, b); W.box(pk, px, top, pz, ww, 1.0, dd, { ry }); }); }
      if (h > 14 && !o.noHVAC) { const r = X.rnd((x * 13 + z * 7) >>> 0 || 3); W.detail(() => { for (let i = 0; i < 2 + (w * d > 900 ? 2 : 0); i++) { const [px, pz] = L((r() - 0.5) * w * 0.6, (r() - 0.5) * d * 0.6); W.box("rMetal", px, top + 0.3, pz, 2 + r() * 3, 1.2 + r(), 2 + r() * 2, { ry }); } }); }
    } else if (roof === "gable" || roof === "hip") {
      const rh = o.rh || Math.min(w, d) * 0.45, rk = o.roofKey || "rRed";
      let g;
      if (roof === "gable") {
        const sh = new T.Shape(); sh.moveTo(-d / 2 - 0.5, 0); sh.lineTo(d / 2 + 0.5, 0); sh.lineTo(0, rh); sh.lineTo(-d / 2 - 0.5, 0);
        g = new T.ExtrudeGeometry(sh, { depth: w + 1, bevelEnabled: false }); g.translate(0, 0, -(w + 1) / 2); g.rotateY(Math.PI / 2);
        const uvA = g.attributes.uv; for (let i = 0; i < uvA.count; i++) uvA.setXY(i, uvA.getX(i) / 4, uvA.getY(i) / 4);
        /* 妻側の三角（外壁の色） */
        const tri = new T.Shape(); tri.moveTo(-d / 2, 0); tri.lineTo(d / 2, 0); tri.lineTo(0, rh * 0.96); tri.lineTo(-d / 2, 0);
        const tg = new T.ShapeGeometry(tri);
        [[w / 2 - 0.01, Math.PI / 2], [-w / 2 + 0.01, -Math.PI / 2]].forEach(([a, r2]) => { const [px, pz] = L(a, 0); W.batch.add(o.gableKey || "offWhite", W.m[o.gableKey || "offWhite"], tg, M(px, top, pz, ry + r2)); });
      } else {
        g = new T.ConeGeometry(1, 1, 4, 1); g.rotateY(Math.PI / 4); g.scale((w + 1) * 0.7071, rh, (d + 1) * 0.7071); g.translate(0, rh / 2, 0);
        const uvA = g.attributes.uv; for (let i = 0; i < uvA.count; i++) uvA.setXY(i, uvA.getX(i) * w / 4, uvA.getY(i) * rh / 4);
      }
      W.batch.add(rk, W.m[rk], g, M(x, top, z, ry));
      W.caster(x, z, w * 0.8, d * 0.8, top + rh * 0.6, ry);
    } else if (roof === "dome") {
      const R = Math.min(w, d) * 0.45, g = new T.SphereGeometry(R, 24, 12, 0, TAU, 0, Math.PI / 2);
      W.batch.add(o.roofKey || "glassDome", W.m[o.roofKey || "glassDome"], g, M(x, top, z, 0));
      W.box("offWhite", x, top, z, w, 0.5, d, { ry });
    }
    if (o.crown) { const [px, pz] = L(0, d / 2 + 0.06); W.box(o.crown, px, top - 1.2, pz, w * 0.96, 0.35, 0.1, { ry }); const [qx, qz] = L(0, -d / 2 - 0.06); W.box(o.crown, qx, top - 1.2, qz, w * 0.96, 0.35, 0.1, { ry }); }
    if (o.sign) { const sg = o.sign, [px, pz] = L(sg.dx || 0, d / 2 + 0.08); W.sign(sg.text, sg, sg.w || Math.min(w * 0.8, 16), sg.h || 1.8, px, sg.y != null ? y0 + sg.y : top - 2.2, pz, ry); }
    return top;
  };
  /* 超高層（段々に細く・頂部の光る帯・アンテナ） */
  P.skyscraper = function (x, z, w, d, h, o) {
    o = o || {};
    const W = this, steps = o.steps || 3, key = o.key || "gBlue";
    const lm = W._landmark; W._landmark = true;
    let y = 0, sw = w, sd = d;
    if (o.podium) { W.bld(x, z, w + 8, d + 8, 7, { key: o.podium, shop: o.shop || "shopA", roof: "flat", roofKey: "rGreen", parapet: true }); }
    for (let i = 0; i < steps; i++) {
      const hh = (h - y) * (i === steps - 1 ? 1 : 0.55 + (i === 0 ? 0.1 : 0));
      W.box(key, x, y, z, sw, hh, sd, { uv: 14 }); if (i === 0) W.colRot(x, z, sw, sd, 0);
      y += hh;
      W.box(o.band || "chromeB", x, y, z, sw + 0.8, 0.8, sd + 0.8);
      if (o.crown) { W.box(o.crown, x, y - 1.6, z + sd / 2 + 0.05, sw, 0.3, 0.1); W.box(o.crown, x, y - 1.6, z - sd / 2 - 0.05, sw, 0.3, 0.1); W.box(o.crown, x + sw / 2 + 0.05, y - 1.6, z, 0.1, 0.3, sd); W.box(o.crown, x - sw / 2 - 0.05, y - 1.6, z, 0.1, 0.3, sd); }
      sw *= o.taper || 0.8; sd *= o.taper || 0.8;
    }
    W.caster(x, z, w, d, h);
    if (o.spire) { W.geo("chromeB", new T.ConeGeometry(Math.max(0.8, sw * 0.12), o.spire, 8), x, y + o.spire / 2, z); W.box("neonRed", x, y + o.spire - 0.6, z, 0.5, 0.5, 0.5); }
    else if (o.heli) { W.geo("pWhite", new T.CylinderGeometry(sw * 0.35, sw * 0.35, 0.3, 24), x, y + 0.2, z); }
    else W.detail(() => { W.box("rMetal", x + sw * 0.2, y, z, 3, 2, 3); W.box("darkMetal", x - sw * 0.2, y, z + 1, 0.3, 8, 0.3); });
    W._landmark = lm;
    return y;
  };
  /* ドーム（ガラス・枠つき） */
  P.dome = function (x, z, r, key, frameKey, y, noCol) {
    const W = this;
    W.geo(key, new T.SphereGeometry(r, 36, 18, 0, TAU, 0, Math.PI / 2), x, y || 0, z);
    for (let i = 0; i < 10; i++) { const t = new T.TorusGeometry(r * 1.004, Math.max(0.1, r * 0.01), 4, 36, Math.PI); t.rotateY(i / 10 * Math.PI); W.geo(frameKey || "white2", t, x, y || 0, z); }
    const ring = new T.TorusGeometry(r * 0.7, Math.max(0.1, r * 0.01), 4, 48); ring.rotateX(Math.PI / 2); W.geo(frameKey || "white2", ring, x, (y || 0) + r * 0.71, z);
    if (!noCol) W.colCircle(x, z, r + 0.1);
    W.casterCircle(x, z, r * 0.9, (y || 0) + r * 0.8);
  };
  P.turret = function (x, z, r, h, wallKey, roofKey, noCol) {
    const W = this;
    W.geo(wallKey, new T.CylinderGeometry(r, r * 1.04, h, 16), x, h / 2, z);
    W.geo(roofKey, new T.ConeGeometry(r * 1.3, r * 3, 16), x, h + r * 1.5, z);
    W.geo("gold", new T.ConeGeometry(0.1, 1.6, 4), x, h + r * 3 + 0.6, z);
    W.geo("offWhite", new T.CylinderGeometry(r * 1.12, r * 1.12, 0.5, 16), x, h - 0.2, z);
    if (!noCol) W.colCircle(x, z, r * 1.05);
    W.casterCircle(x, z, r, h + r * 1.5);
  };
  /* お城（オリジナル：塔・尖塔・門） */
  P.castle = function (x, z, s, wallKey, roofKey, roofKey2, ry) {
    const W = this, c = Math.cos(ry || 0), sn = Math.sin(ry || 0), L = (a, b) => [x + a * c + b * sn, z - a * sn + b * c];
    W.box(wallKey, x, 0, z, 30 * s, 14 * s, 20 * s, { ry, uv: 6 }); W.colRot(x, z, 30 * s, 20 * s, ry); W.caster(x, z, 30 * s, 20 * s, 14 * s, ry);
    W.box(wallKey, x, 14 * s, z, 18 * s, 12 * s, 13 * s, { ry, uv: 6 }); W.caster(x, z, 18 * s, 13 * s, 26 * s, ry);
    [[0, 0, 6, 38], [-15, -10, 3.4, 24], [15, -10, 3.4, 24], [-15, 10, 3.4, 22], [15, 10, 3.4, 22], [-8, -7, 2.4, 32], [8, -7, 2.4, 32], [0, 9, 2, 30]].forEach(([a, b, r, h], i) => { const [px, pz] = L(a * s, b * s); W.turret(px, pz, r * s, h * s, wallKey, i % 2 ? (roofKey2 || roofKey) : roofKey, true); });
    const [gx, gz] = L(0, 10 * s + 0.05); W.box("castleDark", gx, 0, gz, 6 * s, 8 * s, 0.4, { ry });
    for (let i = -3; i <= 3; i++) { const [px, pz] = L(i * 4 * s, 10 * s + 0.1); W.box("windowDark", px, 9 * s, pz, 1.2 * s, 2.4 * s, 0.1, { ry }); }
  };
  /* 街灯（3種類）。夜は光だまり */
  P.lamp = function (x, z, kind) {
    const W = this;
    if (kind === "yoma" || kind === "modern" || kind === "classic") return W.yomaLamp(x, z, (x * 0.37 + z * 0.11) % 6.28);   /* ★ 2026-09-29 街灯は妖魔シティ風の青緑の2灯にそろえる */
    W.detail(() => {
      if (kind === "classic") { W.box("darkMetal", x, 0, z, 0.3, 0.6, 0.3); W.geo("darkMetal", new T.CylinderGeometry(0.07, 0.1, 4.2, 6), x, 2.4, z); W.box("darkMetal", x, 4.4, z, 0.5, 0.12, 0.5); W.geo("lampGlow", new T.CylinderGeometry(0.2, 0.14, 0.55, 6), x, 4.78, z); W.geo("darkMetal", new T.ConeGeometry(0.3, 0.3, 6), x, 5.2, z); }
      else if (kind === "globe") { W.geo("darkMetal", new T.CylinderGeometry(0.06, 0.09, 3.4, 6), x, 1.7, z); W.geo("lampGlow", new T.SphereGeometry(0.28, 10, 8), x, 3.6, z); }
      else { W.geo("steel", new T.CylinderGeometry(0.07, 0.1, 5.6, 6), x, 2.8, z); W.box("steel", x + 0.45, 5.55, z, 1.0, 0.12, 0.26); W.box("lampGlowB", x + 0.8, 5.47, z, 0.5, 0.05, 0.2); }
    });
    W.colCircle(x, z, 0.16);
    W.lamps.push([x, z]);
  };
  P.bench = function (x, z, ry) {
    ry = ry || 0; const W = this, c = Math.cos(ry), s = Math.sin(ry);
    W.detail(() => {
      W.box("woodLight", x, 0.42, z, 2.0, 0.07, 0.5, { ry });
      W.box("woodLight", x - 0.24 * s, 0.52, z - 0.24 * c, 2.0, 0.4, 0.05, { ry });
      [-0.85, 0.85].forEach((lx) => W.box("darkMetal", x + lx * c, 0, z - lx * s, 0.08, 0.44, 0.5, { ry }));
    });
    W.colObb(x, z, 2.0, 0.5, ry);
    [-0.5, 0.5].forEach((lx) => W.seats.push({ x: x + lx * c + 0.06 * s, z: z - lx * s + 0.06 * c, yaw: ry, h: 0.47 }));
  };
  /* ★★ 2026-09-29d 場所の判定（道・建物・水・当たり）を 16m のます目で速く：小物・木を置くときに使う */
  P.spotIndex = function () {
    const w = this, GS = 16, RG = new Map(), CG = new Map(), KG = new Map();
    const add = (M, x0, z0, x1, z1, it) => { for (let gx = Math.floor(x0 / GS); gx <= Math.floor(x1 / GS); gx++) for (let gz = Math.floor(z0 / GS); gz <= Math.floor(z1 / GS); gz++) { const k = gx * 4096 + gz; let a = M.get(k); if (!a) M.set(k, a = []); a.push(it); } };
    w.roads.forEach((r) => add(RG, Math.min(r[0], r[2]) - r[4], Math.min(r[1], r[3]) - r[4], Math.max(r[0], r[2]) + r[4], Math.max(r[1], r[3]) + r[4], r));
    w.casters.forEach((c) => { if (c.h < 2 || c.gate) return; let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const [x, z] of c.pts) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (z < z0) z0 = z; if (z > z1) z1 = z; } add(CG, x0, z0, x1, z1, c); });
    w.colliders.forEach((c) => { if (c.yb !== undefined && c.yb < -0.5) return; add(KG, c.x0, c.z0, c.x1, c.z1, c); });          /* ★★ 2026-09-30d 地下（地下鉄）の当たりは地上の置き場所さがしに入れない */
    const segD = (x, z, r) => { const dx = r[2] - r[0], dz = r[3] - r[1], l2 = dx * dx + dz * dz; let t = l2 ? ((x - r[0]) * dx + (z - r[1]) * dz) / l2 : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(x - (r[0] + dx * t), z - (r[1] + dz * t)); };
    const inPoly = (x, z, pts) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, zi] = pts[i], [xj, zj] = pts[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
    const colIn = (c, x, z, pad) => {
      if (x < c.x0 - pad || x > c.x1 + pad || z < c.z0 - pad || z > c.z1 + pad) return false;
      if (!c.t) return true;
      if (c.t === "c") return Math.hypot(x - c.x, z - c.z) < c.r + pad;
      if (c.t === "obb") { const dx = x - c.x, dz = z - c.z, a = dx * c.c - dz * c.s, b = dx * c.s + dz * c.c; return Math.abs(a) < c.hw + pad && Math.abs(b) < c.hd + pad; }
      if (c.t === "seg") return segD(x, z, [c.ax, c.az, c.bx, c.bz]) < c.r + pad;
      if (c.t === "ring") { const d = Math.hypot(x - c.x, z - c.z); if (d < c.r0 - pad || d > c.r1 + pad) return false; if (c.gaps) { const a = Math.atan2(z - c.z, x - c.x); for (const [g0, g1] of c.gaps) { const m = (g0 + g1) / 2, hw = (g1 - g0) / 2; if (Math.abs(Math.atan2(Math.sin(a - m), Math.cos(a - m))) < hw) return false; } } return true; }
      if (c.t === "ell") { const u = (x - c.x) / c.rx1, v = (z - c.z) / c.rz1, u0 = (x - c.x) / c.rx0, v0 = (z - c.z) / c.rz0; return u * u + v * v < 1 && u0 * u0 + v0 * v0 > 1; }
      return true;
    };
    const get = (M, x, z) => M.get(Math.floor(x / GS) * 4096 + Math.floor(z / GS)) || [];
    return {
      road(x, z, pad) { for (const r of get(RG, x, z)) if (segD(x, z, r) < r[4] / 2 + (pad || 0)) return r; return null; },
      bld(x, z, pad) { for (const c of get(CG, x, z)) { if (inPoly(x, z, c.pts)) return c; if (pad) for (let i = 0; i < c.pts.length; i++) { const a = c.pts[i], b = c.pts[(i + 1) % c.pts.length]; if (segD(x, z, [a[0], a[1], b[0], b[1]]) < pad) return c; } } return null; },
      col(x, z, pad) { for (const c of get(KG, x, z)) if (colIn(c, x, z, pad || 0)) return c; return null; },
      water(x, z) { return w.isWater(x, z); }
    };
  };
  /* ★★ 2026-09-29d 街灯・ベンチはエリアと道を全部作ったあとに置く（道・建物・水・ほかの物の上には置かない）＝ご指定「街灯や木などが道に重なっている」 */
  P.placeProps = function (Q) {
    const w = this, I = w.spotIndex(), placed = [], near = (x, z, r) => placed.some((p) => Math.abs(p[0] - x) < r && Math.abs(p[1] - z) < r && Math.hypot(p[0] - x, p[1] - z) < r);
    const ok = (x, z, pad) => !I.road(x, z, pad - 0.2) && !I.bld(x, z, 0.4) && !I.water(x, z) && !I.col(x, z, pad) && w.insideIsland(x, z, 2);
    let skipped = 0;
    Q.forEach(([k, x, z, a]) => {
      if (k === 1) { const c = Math.cos(a || 0), s = Math.sin(a || 0); if (!(ok(x, z, 0.3) && ok(x + 0.9 * c, z - 0.9 * s, 0.25) && ok(x - 0.9 * c, z + 0.9 * s, 0.25)) || near(x, z, 1.6)) { skipped++; return; } placed.push([x, z]); P.bench.call(w, x, z, a); return; }
      if (!ok(x, z, 0.35) || near(x, z, 2.4)) { skipped++; return; }
      placed.push([x, z]); if (k === 0) P.lamp.call(w, x, z, a); else P.yomaLamp.call(w, x, z, a);
      if (k === 2 && w.lampFace && (w._lampN = (w._lampN || 0) + 1) % 3 === 0) { const r = I.road(x, z, 3.2); if (r) { const dx = r[2] - r[0], dz = r[3] - r[1], l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - r[0]) * dx + (z - r[1]) * dz) / l2)); w.lampFace(x, z, Math.atan2(r[0] + dx * t - x, r[1] + dz * t - z)); } }          /* ★ 2026-09-30 街灯の目（道の方を向く・動く） */
    });
    w._propsSkipped = skipped;
  };
  P.trash = function (x, z) { this.detail(() => { this.geo("darkMetal", new T.CylinderGeometry(0.3, 0.28, 0.9, 8), x, 0.45, z); this.geo("pGreen", new T.CylinderGeometry(0.32, 0.32, 0.12, 8), x, 0.95, z); }); };
  P.planterBox = function (x, z, w, d, flowers) { this.box("stoneW", x, 0, z, w, 0.5, d, { collide: true }); this.box("soilDark", x, 0.5, z, w - 0.3, 0.02, d - 0.3); this.bushRow(x, z, w - 0.6, d - 0.6, flowers); };
  /* 花（インスタンスの花のかたまり）・植えこみ */
  P.flowers = function (x, z, w, d, ry, n, palette, y) {          /* y＝花の根もとの高さ（花だんの土の上） */
    const r = X.rnd(((x * 31 + z * 17) >>> 0) || 5), c = Math.cos(ry || 0), s = Math.sin(ry || 0), pal = palette || FLOWER_PAL[Math.floor(r() * FLOWER_PAL.length)];
    const cnt = n || Math.floor(w * d * 2.6);
    for (let i = 0; i < cnt; i++) { const a = (r() - 0.5) * w, b = (r() - 0.5) * d; const band = Math.floor((a / w + 0.5) * pal.length * 0.999); this.trees.push(["flower", x + a * c + b * s, z - a * s + b * c, 0.85 + r() * 0.35, pal[(band + (r() < 0.15 ? 1 : 0)) % pal.length], y || 0]); }
  };
  P.flowerBed = function (x, z, wd, dp, ry, seed, palette) {
    this.box("stoneW", x, 0, z, wd, 0.32, dp, { ry, collide: true });
    this.box("soilDark", x, 0.32, z, wd - 0.3, 0.03, dp - 0.3, { ry });
    this.flowers(x, z, wd - 0.5, dp - 0.5, ry, null, palette, 0.35);          /* ★★ 2026-09-30d 花は土の上に（前は石の箱の中に埋まって、土だけに見えた） */
  };
  P.bushRow = function (x, z, w, d, flowers) {
    const r = X.rnd(((x * 7 + z * 13) >>> 0) || 9), n = Math.max(1, Math.round(Math.max(w, d) / 1.6));
    for (let i = 0; i < n; i++) { const t = n === 1 ? 0 : i / (n - 1) - 0.5; this.trees.push(["bush", x + t * (w > d ? w : 0), z + t * (w > d ? 0 : d), 0.7 + r() * 0.35]); }
    if (flowers) this.flowers(x, z, w, d, 0, Math.floor(w * d * 2));
  };
  P.hedge = function (x, z, w, d, h, ry) { this.box("hedge", x, 0, z, w, h || 1.2, d, { ry, collide: true, uv: 2 }); };
  P.tree = function (x, z, s, kind) { this.plant(kind === "sakura" ? "sakura" : "oak", x, z, s || 1); };
  P.plant = function (kind, x, z, s, col) { this.trees.push([kind, x, z, s || 1, col]); };
  P.palm = function (x, z, s) { this.trees.push(["palm", x, z, s || 1]); };
  P.pine = function (x, z, s) { this.trees.push(["pine", x, z, s || 1]); };
  const FLOWER_PAL = [[0xff4f6a, 0xffd23a, 0xffffff], [0xff8ac8, 0xa87aff, 0xffffff], [0xff8a2a, 0xffd23a, 0xff4f6a], [0x5ab8ff, 0xffffff, 0xa87aff], [0xff4f6a, 0xff8ac8, 0xffd0e0], [0xffd23a, 0xff8a2a, 0xffffff]];

  /* 区域の入口のアーチ（番号・名前） */
  P.areaGate = function (x, z, ry, area, style, spanIn) {
    const W = this, a = typeof area === "string" ? A[area] : area, c = Math.cos(ry), s = Math.sin(ry);
    /* ★★ 2026-09-30c 門の幅は道より広く（park_net.js の placeGates が道の幅から決める：前は柱が道の上に立っていた） */
    const col = a.c || "#3a78e8", span = spanIn || (style === "big" ? 20 : 15), hh = Math.max(style === "big" ? 11 : 8.5, span * 0.5);
    (W.gates = W.gates || []).push({ x, z, ry, id: a.id, span });          /* ★ 2026-09-29d 門の台帳（道が通っているか確かめる） */
    [-1, 1].forEach((k) => {
      const px = x + k * span / 2 * c, pz = z - k * span / 2 * s;
      W.box("white2", px, 0, pz, 1.4, hh, 1.4, { collide: true, ry }); W.box("gold", px, hh, pz, 1.7, 0.4, 1.7, { ry });
      W.geo("gold", new T.SphereGeometry(0.55, 12, 8), px, hh + 0.95, pz);
      W.box("neonCyan", px + 0.72 * s, 1, pz + 0.72 * c, 0.08, hh - 2, 0.08, { ry });
    });
    const arc = new T.TorusGeometry(span / 2, 0.35, 8, 32, Math.PI); arc.rotateY(ry); W.geo("white2", arc, x, hh - 0.6, z);
    W.box("pNavy", x, hh - 2.6, z, span - 1.2, 1.9, 0.5, { ry });
    const txt = a.n + "  " + a.name;
    W.sign(txt, { bg: col, color: "#fff", border: "rgba(255,255,255,.7)", px: 1024 }, span - 1.6, 1.6, x + s * 0.27, hh - 1.65, z + c * 0.27, ry);
    W.sign(txt, { bg: col, color: "#fff", border: "rgba(255,255,255,.7)", px: 1024 }, span - 1.6, 1.6, x - s * 0.27, hh - 1.65, z - c * 0.27, ry + Math.PI);
    W.caster(x, z, span, 1.5, hh, ry); W.casters[W.casters.length - 1].gate = true;
  };

  /* ══════════════ ★★ 2026-09-29d 門は道がそろってから：道にそろえて置き、門の前後に道がなければつなぐ ══════════════
     （ご指定「各エリアの入り口のゲートがズレていたり、道がないところもある」） */
  P.fixGates = function (Q) {
    const w = this, I = w.spotIndex();
    const segD = (x, z, r) => { const dx = r[2] - r[0], dz = r[3] - r[1], l2 = dx * dx + dz * dz; let t = l2 ? ((x - r[0]) * dx + (z - r[1]) * dz) / l2 : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(x - (r[0] + dx * t), z - (r[1] + dz * t)); };
    const clear = (x0, z0, x1, z1) => { const L = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(L / 2.5); for (let k = 1; k < n; k++) { const x = x0 + (x1 - x0) * k / n, z = z0 + (z1 - z0) * k / n; if (I.bld(x, z, 1) || I.water(x, z) || !w.insideIsland(x, z, 4)) return false; } return true; };
    w.gateFix = [];
    Q.forEach(([x, z, ry, area, style]) => {
      const a = typeof area === "string" ? A[area] : area, span = style === "big" ? 20 : 15;
      let best = null, bd = 9;
      for (const r of w.roads) { if (r[4] < 5 || r[4] > 30) continue; const d = segD(x, z, r); if (d < bd) { bd = d; best = r; } }
      let gx = x, gz = z, gry = ry, moved = 0;
      if (best) {
        const dx = best[2] - best[0], dz = best[3] - best[1], L2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - best[0]) * dx + (z - best[1]) * dz) / L2));
        gx = best[0] + dx * t; gz = best[1] + dz * t; gry = Math.atan2(dx, dz); if (Math.cos(gry - ry) < 0) gry += Math.PI; moved = Math.hypot(gx - x, gz - z);
      }
      /* ★★ 2026-09-30b 門の前後の道は park_roads.js の自動の道がつなぐ（前はここで別の道を足していて、道が二重になっていた） */
      w.gateFix.push([a.id, Math.round(gx), Math.round(gz), +moved.toFixed(1)]);
      P.areaGate.call(w, gx, gz, gry, area, style);
    });
  };

  /* ══════════════ ★★ 2026-09-29d 豪華な柵：エリアのまわり（ほかのエリアと接していない辺）に。道・門・水の所はあける ══════════════
     （ご指定「それぞれのエリアや道に侵入できない豪華な柵を設置しそれぞれのエリアや場所を明確に区別」）
     朱の柱＋金のぎぼし＋黒と金の横木＋格子（妖魔シティ風）。当たりは線（柵ごと）。ホバーは柵を越えられる（fence フラグ） */
  P.buildFences = function () {
    const w = this, I = w.spotIndex(), STEP = 3, gates = w.gates || [];
    const inOther = (x, z, self) => AREAS.some((b) => b !== self && b.id !== "marketE" && b.id !== "marketW" && b.id !== "green" && x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1) || (self.id !== "green" && ["marketW", "marketE", "green"].some((id) => { const b = A[id]; return b !== self && x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1; }));
    const nearGate = (x, z) => gates.some((g) => Math.hypot(g.x - x, g.z - z) < g.span / 2 + 2);
    const blocked = (x, z) => I.road(x, z, 1.2) || I.water(x, z) || nearGate(x, z) || I.bld(x, z, 0.6) || !w.insideIsland(x, z, 3) || w.onTrack(x, z, 1.5);
    const railBad = (px, pz, x, z) => { for (const f of [0.2, 0.4, 0.6, 0.8]) { const qx = px + (x - px) * f, qz = pz + (z - pz) * f; if (I.road(qx, qz, 0.4) || I.bld(qx, qz, 0.35) || w.onTrack(qx, qz, 1)) return true; } return false; };
    let posts = 0, runs = 0;
    const SKIP = { gate: 1, marketW: 1, marketE: 1, green: 1, tower: 1, fountain: 1, beach: 1 };
    AREAS.forEach((a) => {
      if (SKIP[a.id]) return;
      const edges = [[a.x0, a.z0, a.x1, a.z0, 0, -1], [a.x1, a.z0, a.x1, a.z1, 1, 0], [a.x1, a.z1, a.x0, a.z1, 0, 1], [a.x0, a.z1, a.x0, a.z0, -1, 0]];
      edges.forEach(([x0, z0, x1, z1, ox, oz]) => {
        const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / STEP)), ux = (x1 - x0) / L, uz = (z1 - z0) / L, ry = Math.atan2(ux, uz);
        let run = null, gapA = null, gapRoad = false;
        const flush = () => { if (run && run.length) gapA = run[run.length - 1]; if (!run || run.length < 2) { run = null; return; } const [ax, az] = run[0], [bx, bz] = run[run.length - 1]; const n0 = w.colliders.length; w.colSeg(ax, az, bx, bz, 0.22); w.colliders[n0].fence = true; runs++; run = null; };
        for (let i = 0; i <= n; i++) {
          const t = i / n, x = x0 + (x1 - x0) * t - ox * 0.6, z = z0 + (z1 - z0) * t - oz * 0.6;
          const out = inOther(x + ox * 2.5, z + oz * 2.5, a);
          if (out || blocked(x, z)) { if (!run) { if (out || !I.road(x, z, 1.2)) gapRoad = false; } else { flush(); gapRoad = !out && !!I.road(x, z, 1.2); } if (out || nearGate(x, z)) gapA = null; continue; }
          /* ★ 2026-09-30 道が柵をぬける所（エリアの出入口）は、両わきに門柱（石の台・朱の柱・金の笠・宝珠） */
          if (!run && gapA && gapRoad && Math.hypot(gapA[0] - x, gapA[1] - z) < 40) { [gapA, [x, z]].forEach(([px, pz]) => { w.detail(() => { w.box("stoneW", px, 0, pz, 0.95, 0.45, 0.95, { ry }); w.box("woodRed", px, 0.45, pz, 0.5, 2.25, 0.5, { ry }); w.box("gold", px, 2.7, pz, 0.72, 0.16, 0.72, { ry }); w.geo("kwB", new T.ConeGeometry(0.66, 0.5, 4).rotateY(Math.PI / 4 + ry), px, 3.11, pz); w.geo("gold", new T.SphereGeometry(0.16, 10, 8), px, 3.46, pz); w.box("lampY", px, 1.9, pz, 0.52, 0.34, 0.52, { ry }); }); w.colCircle(px, pz, 0.5); }); posts += 2; }
          gapA = null; gapRoad = false;
          if (run && run.length && railBad(run[run.length - 1][0], run[run.length - 1][1], x, z)) flush();          /* ★ 2026-09-30b 柱の間の横木が道・建物をまたがない */
          if (!run) run = [];
          run.push([x, z]);
          /* 柱（4本ごとに提灯のせ）と、前の柱までの横木・格子 */
          w.detail(() => {
            w.box("woodRed", x, 0, z, 0.26, 1.35, 0.26, { ry }); w.geo("gold", new T.OctahedronGeometry(0.2, 0).scale(1, 1.4, 1), x, 1.55, z);
            if (posts % 4 === 0) { w.box("stoneW", x, 0, z, 0.42, 0.3, 0.42, { ry }); w.geo("lanR", new T.SphereGeometry(0.22, 8, 6).scale(1, 1.25, 1), x, 1.95, z); }
            if (run.length > 1) { const [px, pz] = run[run.length - 2], mx = (px + x) / 2, mz = (pz + z) / 2, sl = Math.hypot(x - px, z - pz), sry = Math.atan2(x - px, z - pz);
              w.box("pBlack", mx, 1.12, mz, 0.1, 0.12, sl, { ry: sry }); w.box("gold", mx, 1.24, mz, 0.12, 0.04, sl, { ry: sry }); w.box("pBlack", mx, 0.32, mz, 0.08, 0.1, sl, { ry: sry });
              w.box("woodRed", mx, 0.42, mz, 0.05, 0.62, sl - 0.3, { ry: sry, uv: 1 }); }
          });
          posts++;
        }
        flush();
      });
    });
    w._fenceStat = { posts, runs };
  };

  /* ══════════════ 水 ══════════════ */
  /* ★★ 2026-09-29 水の作り直し（ご指定「原神やゴーストオブツシマのように。特に水・草・木・建物の反射」）
     ・映りこみ：水面の高さで鏡に映したカメラから景色を描いた絵（gfx.js の鏡）を、波でゆらして重ねる → 建物・木・空・夜のネオンが水に映る
     ・さざ波：向きのちがう波3つ＋細かいノイズ2つ（遠くは弱める）。見る角度で映りこみの強さが変わる（フレネル）
     ・プール・噴水は底にゆらめく光の模様（コースティクス）、水路は流れる。鏡を使えない画質のときは空の色 */
  const REFL = { tRefl: { value: null }, uTexMat: { value: new T.Matrix4() }, uRefl: { value: 0 } };
  (function () { const d = new T.DataTexture(new Uint8Array([150, 190, 235, 255]), 1, 1); d.needsUpdate = true; REFL.tRefl.value = d; })();
  const WATER_VS = "varying vec3 wp; varying vec2 vUv; void main(){ vUv = uv; vec4 p = modelMatrix * vec4(position, 1.0); wp = p.xyz; gl_Position = projectionMatrix * viewMatrix * p; }";
  const WATER_NOISE = [
    "float whash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }",
    "float wnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f); return mix(mix(whash(i), whash(i + vec2(1.0, 0.0)), u.x), mix(whash(i + vec2(0.0, 1.0)), whash(i + vec2(1.0, 1.0)), u.x), u.y); }",
    "vec2 wgrad(vec2 p){ const float e = 0.15; return vec2(wnoise(p + vec2(e, 0.0)) - wnoise(p - vec2(e, 0.0)), wnoise(p + vec2(0.0, e)) - wnoise(p - vec2(0.0, e))) / (2.0 * e); }"
  ].join("\n");
  const WATER_FS = [
    "uniform float t, uNight, alpha, uKind; uniform vec3 cDeep, cShal, sunDir; uniform sampler2D tRefl; uniform mat4 uTexMat; uniform float uRefl; varying vec3 wp; varying vec2 vUv;",
    WATER_NOISE,
    "void main(){",
    "  vec2 q = wp.xz; vec2 fl = uKind > 0.5 && uKind < 1.5 ? vec2(0.0, t * 0.6) : vec2(0.0);",
    "  vec2 g = vec2(0.8, 0.6) * cos(dot(q, vec2(0.8, 0.6)) * 1.3 + t * 1.6) * 0.1;",
    "  g += vec2(-0.5, 0.86) * cos(dot(q, vec2(-0.5, 0.86)) * 2.1 + t * 2.1) * 0.07;",
    "  g += vec2(0.2, -0.98) * cos(dot(q, vec2(0.2, -0.98)) * 3.7 + t * 2.9) * 0.045;",
    "  vec2 nq = uKind > 0.5 && uKind < 1.5 ? vUv * 4.0 - fl : q;",
    "  g += wgrad(nq * 0.9 + vec2(t * 0.25, t * 0.18)) * 0.09 + wgrad(nq * 2.7 - vec2(t * 0.42, -t * 0.31)) * 0.055;",
    "  float dcam = length(wp - cameraPosition); g *= mix(1.0, 0.3, smoothstep(30.0, 260.0, dcam));",
    "  vec3 n = normalize(vec3(-g.x, 1.0, -g.y)); vec3 v = normalize(cameraPosition - wp);",
    "  float fr = 0.02 + 0.98 * pow(1.0 - max(dot(n, v), 0.0), 5.0); fr = clamp(fr * 1.1 + 0.05, 0.0, 1.0);",
    "  float h1 = sin(q.x * 0.55 + t * 1.3) * sin(q.y * 0.48 - t * 1.05);",
    "  vec3 body = mix(cDeep, cShal, 0.55 + 0.2 * h1);",
    "  if (uKind > 1.5) { vec2 cq = q * 1.7; float c1 = abs(sin(cq.x + sin(cq.y * 1.3 + t * 1.1) * 1.3 + t * 0.9)); float c2 = abs(sin(cq.y * 1.2 + sin(cq.x * 0.9 - t) * 1.1 - t * 0.7)); body += vec3(0.55, 0.85, 1.0) * pow(1.0 - min(c1, c2), 4.0) * 0.14 * (1.0 - uNight); }",
    "  body *= 1.0 - uNight * 0.62;",
    "  vec3 refl = mix(vec3(0.62, 0.8, 1.0), vec3(0.03, 0.05, 0.14), uNight);",
    "  if (uRefl > 0.5) { vec4 rc = uTexMat * vec4(wp, 1.0); vec2 ruv = rc.xy / rc.w + n.xz * 0.05; refl = texture2D(tRefl, clamp(ruv, vec2(0.002), vec2(0.998))).rgb; }",
    "  vec3 c = mix(body, refl, fr);",
    "  vec3 r = reflect(-normalize(sunDir), n); float sp = pow(max(dot(r, v), 0.0), 240.0);",
    "  c += mix(vec3(1.0, 0.96, 0.86), vec3(0.45, 0.55, 0.9), uNight) * sp * (3.2 - uNight * 2.6);",
    "  gl_FragColor = vec4(c, alpha);",
    "  #include <tonemapping_fragment>",
    "  #include <colorspace_fragment>",
    "}"
  ].join("\n");
  const waterCache = {};
  function waterMat(w, kind) {
    if (waterCache[kind]) return waterCache[kind];
    const K = { pool: [0x0a8ac8, 0x3fe0f0, 0.93, 2], canal: [0x0c4a5a, 0x2a98a0, 0.95, 1], lake: [0x0a3060, 0x2a78a0, 0.97, 0], night: [0x08102a, 0x2a3a7a, 0.97, 0], harbor: [0x06284e, 0x2a7aa0, 0.96, 0], fountain: [0x0a78b8, 0x6ae8ff, 0.92, 2] }[kind] || [0x0f5a6a, 0x2aa8a8, 0.95, 1];
    const m = new T.ShaderMaterial({ transparent: K[2] < 1, depthWrite: true,
      uniforms: { t: { value: 0 }, uNight: { value: 0 }, cDeep: { value: new T.Color(K[0]) }, cShal: { value: new T.Color(K[1]) }, sunDir: { value: SUN.clone() }, alpha: { value: K[2] }, uKind: { value: K[3] }, tRefl: REFL.tRefl, uTexMat: REFL.uTexMat, uRefl: REFL.uRefl },
      vertexShader: WATER_VS, fragmentShader: WATER_FS });
    m.polygonOffset = true; m.polygonOffsetFactor = -1; m.polygonOffsetUnits = -3;
    w.waterMats.push(m); waterCache[kind] = m;
    return m;
  }
  P.waterMat = function (kind) { return waterMat(this, kind); };
  /* 水面は「映りこみ（鏡）」と「まわりの映りこみ（プローブ）」には描かない（レイヤー 3 ＝ ふつうのカメラだけ） */
  /* ★ 2026-09-29d 水の上か（1m のます目）：人の群れ・歩く人を水の中に置かない（ご指定「水の中に人がいます」） */
  P.isWater = function (x, z) {
    const w = this;
    if (!w._wg || w._wgN !== (w.waterMeshes || []).length) {
      const G = new Set(), key = (ix, iz) => (ix + 2048) * 8192 + (iz + 2048);
      (w.waterMeshes || []).forEach((m) => {
        /* ★★ 2026-09-30c 水面はエリアのグループの中にあることがある（エリアを動かした分も足す） */
        m.updateWorldMatrix(true, false);
        const g = m.geometry, P0 = g.attributes.position, idx = g.index ? g.index.array : null, n = idx ? idx.length : P0.count, ox = m.matrixWorld.elements[12], oz = m.matrixWorld.elements[14];
        for (let t = 0; t < n; t += 3) {
          const a = idx ? idx[t] : t, b = idx ? idx[t + 1] : t + 1, c = idx ? idx[t + 2] : t + 2;
          const ax = P0.getX(a) + ox, az = P0.getZ(a) + oz, bx = P0.getX(b) + ox, bz = P0.getZ(b) + oz, cx = P0.getX(c) + ox, cz = P0.getZ(c) + oz;
          const x0 = Math.floor(Math.min(ax, bx, cx)), x1 = Math.ceil(Math.max(ax, bx, cx)), z0 = Math.floor(Math.min(az, bz, cz)), z1 = Math.ceil(Math.max(az, bz, cz));
          const d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz); if (Math.abs(d) < 1e-9) continue;
          for (let ix = x0; ix < x1; ix++) for (let iz = z0; iz < z1; iz++) { const px = ix + 0.5, pz = iz + 0.5, l1 = ((bz - cz) * (px - cx) + (cx - bx) * (pz - cz)) / d, l2 = ((cz - az) * (px - cx) + (ax - cx) * (pz - cz)) / d, l3 = 1 - l1 - l2; if (l1 >= -0.05 && l2 >= -0.05 && l3 >= -0.05) G.add(key(ix, iz)); }
        }
      });
      w._wg = G; w._wgN = (w.waterMeshes || []).length; w._wk = key;
    }
    return w._wg.has(w._wk(Math.floor(x), Math.floor(z)));
  };
  P.water = function (geo, x, y, z, kind) { const m = new T.Mesh(geo, waterMat(this, kind || "pool")); m.position.set(x, y, z); m.receiveShadow = false; m.layers.set(3); this.scene.add(m); (this.waterMeshes = this.waterMeshes || []).push(m); return m; };
  P.pool = function (x, z, wd, dp, ry, kind) {
    const W = this, g = new T.PlaneGeometry(wd, dp); g.rotateX(-Math.PI / 2); if (ry) g.rotateY(ry);
    W.water(g, x, 0.08, z, kind || "pool");
    const e = 0.6, c = Math.cos(ry || 0), s = Math.sin(ry || 0);
    [[0, dp / 2 + e / 2, wd + e * 2, e], [0, -dp / 2 - e / 2, wd + e * 2, e], [wd / 2 + e / 2, 0, e, dp], [-wd / 2 - e / 2, 0, e, dp]].forEach(([a, b, ww, dd]) => W.box("stoneW", x + a * c + b * s, 0, z - a * s + b * c, ww, 0.3, dd, { ry }));
    W.colObb(x, z, wd + 0.9, dp + 0.9, ry || 0);
  };
  /* 丸い池 */
  P.pond = function (x, z, r, kind, noCol) {
    const W = this; W.water(new T.CircleGeometry(r, 48).rotateX(-Math.PI / 2), x, 0.07, z, kind || "lake");
    const rim = new T.TorusGeometry(r + 0.3, 0.35, 6, 64); rim.rotateX(Math.PI / 2); W.geo("stoneW", rim, x, 0.2, z);
    if (!noCol) W.colCircle(x, z, r + 0.55);                 /* ★ 池は丸い当たり（ふちの石まで） */
  };

  /* ══════════════ 道（曲線の帯）・川・橋 ══════════════ */
  function smoothPts(pts, step) {
    if (pts.length < 3) { const out = []; const [a, b] = pts; const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / (step || 4))); for (let i = 0; i <= n; i++) out.push([a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]); return out; }
    const cv = new T.CatmullRomCurve3(pts.map(([x, z]) => new T.Vector3(x, 0, z)), false, "centripetal"), L = cv.getLength(), n = Math.max(2, Math.ceil(L / (step || 4)));
    return cv.getSpacedPoints(n).map((p) => [p.x, p.z]);
  }
  P.smoothPts = smoothPts;
  function ribbon(pts, w, y, uvS, closed) {
    const pos = [], uv = [], idx = []; let len = 0; const n = pts.length;
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      if (i > 0) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      const nx = -dz, nz = dx, hw = w / 2;
      pos.push(pts[i][0] - nx * hw, y, pts[i][1] - nz * hw, pts[i][0] + nx * hw, y, pts[i][1] + nz * hw);
      uv.push(0, len / uvS, w / uvS, len / uvS);
    }
    for (let i = 0; i < n - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }   /* 上向きの面（逆だと上から見えない） */
    const g = new T.BufferGeometry(); g.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  P.ribbon = ribbon;
  /* 道：pts（折れ線・曲線にする）, 幅, 材質, { lamps: "classic"|"modern"|"globe"|false, trees: 間隔, benches, curb, y, walk(人が歩く) } */
  let pathN = 0;
  P.route = function (pts, wd, key, o) {
    o = o || {};
    const W = this, sp = o.raw ? pts : smoothPts(pts, 3), y = o.y != null ? o.y : 0.018 + (pathN++ % 7) * 0.003;
    if (!key || key === "paverWarm") key = wd >= 11 ? "walkY" : "walkCream";            /* ★ 2026-09-29 歩道はオレンジ・クリームのタイル（妖魔シティ風） */
    else if (key === "plaza") key = "walkCream";
    W.batch.add(key, W.m[key], ribbon(sp, wd, y, 4), new T.Matrix4());
    const r0 = W.roads.length;
    if (!o.noRoad) for (let i = 0; i < sp.length - 1; i++) W.roads.push([sp[i][0], sp[i][1], sp[i + 1][0], sp[i + 1][1], wd]);
    if (o.curb !== false && W._deferCurbs) (W._curbQ = W._curbQ || []).push({ sp, wd, y, r0, r1: W.roads.length });          /* ★★ 2026-09-30b 縁石はあとで（交わる所を切る） */
    else if (o.curb !== false) { [-1, 1].forEach((sd) => { const off = sp.map((p, i) => { const a = sp[Math.max(0, i - 1)], b = sp[Math.min(sp.length - 1, i + 1)]; let dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz) || 1; return [p[0] - dz / l * sd * (wd / 2 + 0.15), p[1] + dx / l * sd * (wd / 2 + 0.15)]; }); W.batch.add("stoneW", W.m.stoneW, ribbon(off, 0.3, y + 0.1, 2), new T.Matrix4(), true); }); }
    if (o.walk !== false) W.walkPaths.push({ pts: sp, w: wd });
    /* 道ぞいの街灯・並木・ベンチ（一定の間隔で） */
    const cum = [0]; for (let i = 1; i < sp.length; i++) cum.push(cum[i - 1] + Math.hypot(sp[i][0] - sp[i - 1][0], sp[i][1] - sp[i - 1][1]));
    const total = cum[cum.length - 1];
    const at = (d) => { let i = 1; while (i < sp.length - 1 && cum[i] < d) i++; const s0 = cum[i - 1], s1 = cum[i], t = (d - s0) / Math.max(1e-6, s1 - s0); const dx = sp[i][0] - sp[i - 1][0], dz = sp[i][1] - sp[i - 1][1], l = Math.hypot(dx, dz) || 1; return [sp[i - 1][0] + dx * t, sp[i - 1][1] + dz * t, dx / l, dz / l]; };
    const marks = (every, off, f) => { if (!every) return; for (let d = off; d < total - 2; d += every) { const [x, z, dx, dz] = at(d); f(x, z, dx, dz, -dz, dx, Math.round(d / every)); } };
    const edge = wd / 2 + 1.1;
    if (o.lamps !== false) marks(o.lampEvery || 26, 8, (x, z, dx, dz, nx, nz, k) => { const sd = o.lampsBoth ? null : (k % 2 ? 1 : -1); (sd ? [sd] : [-1, 1]).forEach((q) => W.lamp(x + nx * q * edge, z + nz * q * edge, o.lamps || "modern")); });
    if (o.trees) marks(o.trees, 4, (x, z, dx, dz, nx, nz, k) => [-1, 1].forEach((q) => W.plant(o.treeKind === "palm" ? "palm" : o.treeKind === "poplar" ? (k % 2 ? "sakura" : "poplar") : (k % 3 === 2 ? "oak" : "sakura"), x + nx * q * (edge + 2.2), z + nz * q * (edge + 2.2), 0.85 + (k % 5) * 0.07)));
    if (o.benches) marks(o.benches, 14, (x, z, dx, dz, nx, nz, k) => { const q = k % 2 ? 1 : -1; W.bench(x + nx * q * (edge - 0.2), z + nz * q * (edge - 0.2), Math.atan2(-nx * q, -nz * q)); });
    if (o.bushes !== false) marks(o.bushEvery || 11, 6, (x, z, dx, dz, nx, nz, k) => [-1, 1].forEach((q) => W.trees.push(["bush", x + nx * q * (edge + 0.6), z + nz * q * (edge + 0.6), 0.75 + (k % 3) * 0.12])));
    return sp;
  };
  /* ★★ 2026-09-30b 縁石はぜんぶの道がそろってから：ほかの道・広場の上は切る（前は交わる所で縁石が道を横切っていた＝ご指定「道の接続部分で不具合が多い」） */
  P.buildCurbs = function () {
    const W = this, Q = W._curbQ || []; W._curbQ = null; W._deferCurbs = false; if (!Q.length) return;
    const GS = 16, G = new Map(), R = W.roads, paved = W.paved || [];
    R.forEach((r, i) => { if (r[4] < 3) return; const x0 = Math.min(r[0], r[2]) - r[4], x1 = Math.max(r[0], r[2]) + r[4], z0 = Math.min(r[1], r[3]) - r[4], z1 = Math.max(r[1], r[3]) + r[4]; for (let gx = Math.floor(x0 / GS); gx <= Math.floor(x1 / GS); gx++) for (let gz = Math.floor(z0 / GS); gz <= Math.floor(z1 / GS); gz++) { const k = gx * 4096 + gz; let a = G.get(k); if (!a) G.set(k, a = []); a.push(i); } });
    const segD = (x, z, r) => { const dx = r[2] - r[0], dz = r[3] - r[1], l2 = dx * dx + dz * dz; let t = l2 ? ((x - r[0]) * dx + (z - r[1]) * dz) / l2 : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(x - (r[0] + dx * t), z - (r[1] + dz * t)); };
    const other = (x, z, r0, r1) => { const a = G.get(Math.floor(x / GS) * 4096 + Math.floor(z / GS)); if (!a) return false; for (const i of a) { if (i >= r0 && i < r1) continue; const r = R[i]; if (segD(x, z, r) < r[4] / 2 + 0.05) return true; } return false; };
    const onPaved = (x, z) => paved.some((q) => x > q[0] - 0.3 && x < q[2] + 0.3 && z > q[1] - 0.3 && z < q[3] + 0.3);
    let cut = 0;
    Q.forEach(({ sp, wd, y, r0, r1 }) => {
      [-1, 1].forEach((sd) => {
        const off = sp.map((p, i) => { const a = sp[Math.max(0, i - 1)], b = sp[Math.min(sp.length - 1, i + 1)]; let dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz) || 1; return [p[0] - dz / l * sd * (wd / 2 + 0.15), p[1] + dx / l * sd * (wd / 2 + 0.15)]; });
        let run = [];
        const flush = () => { if (run.length >= 2) W.batch.add("stoneW", W.m.stoneW, ribbon(run, 0.3, y + 0.1, 2), new T.Matrix4(), true); run = []; };
        off.forEach(([x, z]) => { if (other(x, z, r0, r1) || onPaved(x, z)) { flush(); cut++; } else run.push([x, z]); });
        flush();
      });
    });
    W._curbCut = cut;
  };
  /* ★★ 2026-09-30b サーキット・カートのコースの上か（柵・生け垣・道を置かない） */
  P.onTrack = function (x, z, pad) {
    const w = this; pad = pad || 0;
    if (!w._trk) {
      const segs = [], GS = 24, G = new Map();
      if (w.circuit) { const p = w.circuit.pts; for (let k = 0; k < p.length; k += 2) { const a = p[k], b = p[(k + 2) % p.length]; segs.push([a.x, a.z, b.x, b.z, w.circuit.W / 2 + 7]); } }
      (w.blockPaths || []).forEach((bp) => { for (let k = 0; k < bp.pts.length; k++) { const a = bp.pts[k], b = bp.pts[(k + 1) % bp.pts.length]; segs.push([a[0], a[1], b[0], b[1], bp.w / 2 + 1]); } });
      segs.forEach((sg, i) => { const r = sg[4] + 8; for (let gx = Math.floor((Math.min(sg[0], sg[2]) - r) / GS); gx <= Math.floor((Math.max(sg[0], sg[2]) + r) / GS); gx++) for (let gz = Math.floor((Math.min(sg[1], sg[3]) - r) / GS); gz <= Math.floor((Math.max(sg[1], sg[3]) + r) / GS); gz++) { const k = gx * 4096 + gz; let a = G.get(k); if (!a) G.set(k, a = []); a.push(i); } });
      w._trk = { segs, G, GS };
    }
    const T2 = w._trk, a = T2.G.get(Math.floor(x / T2.GS) * 4096 + Math.floor(z / T2.GS)); if (!a) return false;
    for (const i of a) { const s2 = T2.segs[i], dx = s2[2] - s2[0], dz = s2[3] - s2[1], l2 = dx * dx + dz * dz; let t = l2 ? ((x - s2[0]) * dx + (z - s2[1]) * dz) / l2 : 0; t = Math.max(0, Math.min(1, t)); if (Math.hypot(x - (s2[0] + dx * t), z - (s2[1] + dz * t)) < s2[4] + pad) return true; }
    return false;
  };
  /* 川：pts, 幅, { kind, bridges: 自動（道と交わる所） } … 岸の石・当たり判定（橋の所はあける） */
  P.river = function (pts, wd, o) {
    o = o || {};
    const W = this, sp = smoothPts(pts, 3);
    W.water(ribbon(sp, wd, 0, 4), 0, 0.06, 0, o.kind || "canal");
    [-1, 1].forEach((sd) => { const off = sp.map((p, i) => { const a = sp[Math.max(0, i - 1)], b = sp[Math.min(sp.length - 1, i + 1)]; let dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz) || 1; return [p[0] - dz / l * sd * (wd / 2 + 0.3), p[1] + dx / l * sd * (wd / 2 + 0.3)]; }); W.batch.add("stoneW", W.m.stoneW, ribbon(off, 0.6, 0.32, 2), new T.Matrix4()); });
    W.rivers = W.rivers || []; W.rivers.push({ pts: sp, w: wd });
    return sp;
  };
  /* 川と道の交わる所に橋をかけ、橋のない所に当たり判定を置く（道をぜんぶ引いてから呼ぶ） */
  P.finishRivers = function () {
    const W = this;
    (W.rivers || []).forEach((rv) => {
      const sp = rv.pts, cross = [];
      for (let i = 0; i < sp.length - 1; i++) {
        const ax = sp[i][0], az = sp[i][1], bx = sp[i + 1][0], bz = sp[i + 1][1];
        for (const r of W.roads) {
          const [cx, cz, dx, dz, rw] = r; if (rw < 3) continue;
          const d1x = bx - ax, d1z = bz - az, d2x = dx - cx, d2z = dz - cz, den = d1x * d2z - d1z * d2x; if (Math.abs(den) < 1e-6) continue;
          const t = ((cx - ax) * d2z - (cz - az) * d2x) / den, u = ((cx - ax) * d1z - (cz - az) * d1x) / den;
          if (t >= 0 && t <= 1 && u >= 0 && u <= 1) { const px = ax + d1x * t, pz = az + d1z * t; if (!cross.some((c) => Math.hypot(c.x - px, c.z - pz) < rw * 0.8 + 4)) { const ang = Math.atan2(d2x, d2z), sn = Math.max(0.35, Math.abs(Math.sin(ang - Math.atan2(d1x, d1z)))); cross.push({ x: px, z: pz, w: rw, ang, i, sn }); } }
        }
      }
      /* ★★ 2026-09-30d ななめに渡る橋：川の幅は道にそって 1/sin だけ長くなる（前は川の当たりが大通りのはしにかかっていた） */
      cross.forEach((c) => W.bridge(c.x, c.z, c.ang, rv.w / c.sn + 5, Math.min(c.w, 24), rv.w / c.sn));
      /* ★ 2026-09-29 川の当たりは「川の中心線にそった太い線」（前は点ごとの四角ですき間だらけ・岸とずれていた）。橋の所はあける */
      W.colPolyline(sp, rv.w / 2 + 0.3, (x, z) => cross.some((c) => Math.hypot(c.x - x, c.z - z) < Math.min(c.w, 24) / 2 / c.sn + rv.w / 2 + 1.5) || (W.riverGaps || []).some((g) => Math.hypot(g.x - x, g.z - z) < g.r + 1.5));    });
  };
  P.bridge = function (x, z, ang, len, wd, riverW) {
    const W = this, c = Math.cos(ang), s = Math.sin(ang);
    /* 欄干は当たる（橋から川へ落ちない）。長さは川の幅ぶんだけ（岸ぞいの道はふさがない） */
    [-1, 1].forEach((sd) => W.colObb(x + c * sd * (wd / 2 + 0.2), z - s * sd * (wd / 2 + 0.2), 0.5, (riverW || len - 5) + 1.2, ang));
    W.geo("stoneW", new T.BoxGeometry(wd, 0.35, len), x, 0.1, z, ang);
    const arch = new T.TorusGeometry(len * 0.36, 0.4, 6, 20, Math.PI); arch.rotateY(Math.PI / 2);
    [-1, 1].forEach((sd) => {
      const px = x + c * sd * (wd / 2 + 0.2), pz = z - s * sd * (wd / 2 + 0.2);
      W.geo("stoneW", new T.BoxGeometry(0.4, 1.0, len), px, 0.75, pz, ang);
      W.geo("offWhite", arch, px, -len * 0.36 - 0.05, pz, ang);
      W.detail(() => { [-1, 1].forEach((e) => { W.geo("stoneW", new T.BoxGeometry(0.6, 1.5, 0.6), px + s * e * len / 2, 0.75, pz + c * e * len / 2, ang); W.geo("lampGlow", new T.SphereGeometry(0.22, 8, 6), px + s * e * len / 2, 1.7, pz + c * e * len / 2); }); });
    });
  };

  /* ══════════════ 島と海 ══════════════ */
  const SEA_FS = [
    "uniform float t, uNight; uniform vec3 sun; uniform vec3 fogColor; uniform vec4 uIsl; uniform vec2 uFog; uniform sampler2D tRefl; uniform mat4 uTexMat; uniform float uRefl; varying vec3 wp;",
    "float bmp(float a, float c, float w){ float d = abs(mod(a - c + 3.14159265, 6.2831853) - 3.14159265); return d < w ? 0.5 + 0.5 * cos(d / w * 3.14159265) : 0.0; }",
    "float plt(float a, float c, float f, float w){ float d = abs(mod(a - c + 3.14159265, 6.2831853) - 3.14159265); return d <= f ? 1.0 : (d < f + w ? 0.5 + 0.5 * cos((d - f) / w * 3.14159265) : 0.0); }",
    "float isl(float a){ return 1.0 + 0.028 * sin(3.0 * a + 0.7) + 0.02 * sin(5.0 * a + 2.1) + 0.01 * sin(11.0 * a + 0.3) + 0.07 * bmp(a, 1.5707963, 0.22) - 0.07 * bmp(a, 2.2, 0.3) - 0.05 * bmp(a, -0.08, 0.09) + " + NB[0].toFixed(4) + " * bmp(a, " + NB[1].toFixed(7) + ", " + NB[2].toFixed(4) + ")" + EXP.map((e) => " + " + e[0].toFixed(4) + " * plt(a, " + e[1].toFixed(7) + ", " + e[2].toFixed(4) + ", " + e[3].toFixed(4) + ")").join("") + "; }",
    "void main(){",
    "  vec2 u = vec2((wp.x - uIsl.x) / uIsl.z, (wp.z - uIsl.y) / uIsl.w); float a = atan(u.y, u.x);",
    "  float er = pow(pow(abs(cos(a)), 3.0) + pow(abs(sin(a)), 3.0), -1.0 / 3.0) * isl(a);",
    "  float cd = (length(u) - er) * (uIsl.z + uIsl.w) * 0.5;",
    "  vec2 q = wp.xz * 0.05;",
    "  float h = sin(q.x * 1.7 + t * 0.9) * 0.5 + sin(q.y * 2.1 - t * 0.7) * 0.5 + sin((q.x + q.y) * 3.3 + t * 1.6) * 0.25 + sin((q.x - q.y) * 5.1 - t * 2.2) * 0.12;",
    "  float dcam = length(wp.xz - cameraPosition.xz), hf = smoothstep(900.0, 180.0, dcam), mf = smoothstep(2400.0, 500.0, dcam);",
    "  vec3 n = normalize(vec3((cos(q.x * 1.7 + t * 0.9) * 0.22) * mf + (cos((q.x + q.y) * 3.3 + t * 1.6) * 0.18 + sin(q.y * 9.0 + t * 3.0) * 0.04) * hf, 1.0, (cos(q.y * 2.1 - t * 0.7) * 0.22) * mf + (cos((q.x - q.y) * 5.1 - t * 2.2) * 0.09 + sin(q.x * 8.0 - t * 2.6) * 0.04) * hf));",
    "  vec3 v = normalize(cameraPosition - wp); float fr = pow(1.0 - max(dot(n, v), 0.0), 3.0);",
    "  float shal = smoothstep(240.0, 8.0, cd);",
    "  vec3 deep = vec3(0.015, 0.2, 0.46), mid = vec3(0.03, 0.42, 0.66), shw = vec3(0.16, 0.78, 0.8);",
    "  vec3 c = mix(deep, mid, smoothstep(700.0, 200.0, cd)); c = mix(c, shw, shal * 0.85);",
    "  vec3 sky = mix(vec3(0.66, 0.82, 1.0), vec3(0.04, 0.07, 0.18), uNight);",
    "  if (uRefl > 0.5) { vec4 rc = uTexMat * vec4(wp, 1.0); vec2 ruv = rc.xy / rc.w + n.xz * 0.03; sky = mix(sky, texture2D(tRefl, clamp(ruv, vec2(0.002), vec2(0.998))).rgb, smoothstep(2600.0, 900.0, dcam)); }",
    "  c = mix(c * (1.0 - uNight * 0.5), sky, clamp(fr * 1.3 + 0.12, 0.0, 1.0) * 0.8);",
    "  vec3 r = reflect(-normalize(sun), n); c += mix(vec3(1.0, 0.96, 0.85), vec3(0.5, 0.6, 1.0), uNight) * pow(max(dot(r, v), 0.0), 200.0) * (2.0 - uNight * 1.4) * (0.35 + 0.65 * hf);",
    "  float foam = smoothstep(16.0, 2.0, cd) * (0.55 + 0.45 * sin(cd * 0.9 - t * 1.8 + sin(a * 40.0) * 2.0));",
    "  c = mix(c, vec3(0.95, 0.98, 1.0), clamp(foam, 0.0, 1.0) * 0.55 * (1.0 - uNight * 0.6));",
    "  c *= 1.0 - uNight * 0.2;",
    "  float f = smoothstep(uFog.x, uFog.y, length(wp.xz - cameraPosition.xz)); c = mix(c, fogColor, f);",
    "  gl_FragColor = vec4(c, 1.0);",
    "  #include <tonemapping_fragment>",
    "  #include <colorspace_fragment>",
    "}"
  ].join("\n");
  P.buildIsland = function () {
    const w = this;
    /* 地面（基調講演ホールの床の上だけ穴） */
    const sh = new T.Shape(), NP = 480;
    for (let i = 0; i <= NP; i++) { const [x, z] = islandPt(i / NP * TAU, 1); if (i) sh.lineTo(x, -z); else sh.moveTo(x, -z); }
    const hole = new T.Path(); hole.moveTo(-26, 72); hole.lineTo(26, 72); hole.lineTo(26, 18); hole.lineTo(-26, 18); hole.lineTo(-26, 72); sh.holes.push(hole);
    const g = new T.ShapeGeometry(sh, 1); g.rotateX(-Math.PI / 2);
    const uv = g.attributes.uv, pp = g.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, pp.getX(i) / 6, pp.getZ(i) / 6);
    const ground = new T.Mesh(g, w.m.islandLawn); ground.position.y = -0.02; ground.receiveShadow = true; w.scene.add(ground); w.ground = ground;
    /* 海岸（砂の斜面・岩場） */
    const sp = [], si = [], su = [];
    for (let i = 0; i <= NP; i++) { const a = i / NP * TAU, [x0, z0] = islandPt(a, 1), [x1, z1] = islandPt(a, 1.05); sp.push(x0, -0.02, z0, x1, -2.6, z1); su.push(i * 3, 0, i * 3, 4); }
    for (let i = 0; i < NP; i++) { const a = i * 2; si.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    const sg = new T.BufferGeometry(); sg.setAttribute("position", new T.Float32BufferAttribute(sp, 3)); sg.setAttribute("uv", new T.Float32BufferAttribute(su, 2)); sg.setIndex(si); sg.computeVertexNormals();
    const shore = new T.Mesh(sg, w.m.sand); w.m.sand.side = T.DoubleSide; shore.receiveShadow = true; w.scene.add(shore);
    /* 海 */
    /* ★ 2026-09-29d 海は島の下には敷かない（島の形の穴）。前は島の下いっぱいに海があり、床が海面より低い基調講演ホールの客席を白い海面が横切っていた＝「ホールの下が埋もれて」見えた */
    const seaSh = new T.Shape(); seaSh.moveTo(-4500, -4500); seaSh.lineTo(4500, -4500); seaSh.lineTo(4500, 4500); seaSh.lineTo(-4500, 4500); seaSh.lineTo(-4500, -4500);
    { const hp = new T.Path(); for (let i = 0; i <= 240; i++) { const [x, z] = islandPt(-i / 240 * TAU, 0.975); if (i) hp.lineTo(x, 190 - z); else hp.moveTo(x, 190 - z); } seaSh.holes.push(hp); }
    const sea = new T.Mesh(new T.ShapeGeometry(seaSh, 1), new T.ShaderMaterial({
      uniforms: { t: { value: 0 }, uNight: { value: 0 }, sun: { value: SUN.clone() }, fogColor: { value: new T.Color(0xcfe2fb) }, uIsl: { value: new T.Vector4(ISL.cx, ISL.cz, ISL.rx, ISL.rz) }, uFog: { value: new T.Vector2(900, 3200) }, tRefl: REFL.tRefl, uTexMat: REFL.uTexMat, uRefl: REFL.uRefl },
      vertexShader: WATER_VS, fragmentShader: SEA_FS
    }));
    sea.rotation.x = -Math.PI / 2; sea.position.set(0, -0.5, 190); sea.layers.set(3); w.scene.add(sea); w.sea = sea;
    w.anim.push((dt, t) => { sea.material.uniforms.t.value = t; for (const m of w.waterMats) m.uniforms.t.value = t; });
    /* 遠くの陸と山（かすんだ色・北東と北西） */
    const mtn = (cx, cz, len, ang, h, seed, col) => {
      const r = X.rnd(seed), segX = 64, segZ = 10, g2 = new T.PlaneGeometry(len, h * 3.2, segX, segZ), p2 = g2.attributes.position;
      for (let i = 0; i < p2.count; i++) { const px = p2.getX(i), pz = p2.getY(i), k = 1 - Math.abs(pz) / (h * 1.6); const n = Math.sin(px * 0.004 + seed) * 0.5 + Math.sin(px * 0.011 + seed * 2) * 0.3 + Math.sin(px * 0.031) * 0.15 + (r() - 0.5) * 0.08; p2.setZ(i, Math.max(0, k) * h * (0.65 + n * 0.5)); }
      g2.computeVertexNormals(); g2.rotateX(-Math.PI / 2);
      const m = new T.Mesh(g2, new T.MeshLambertMaterial({ color: col, fog: false })); m.position.set(cx, -2, cz); m.rotation.y = ang; w.scene.add(m);
    };
    mtn(2600, -3900, 5200, 0.5, 380, 3, 0x9cbcc0); mtn(-3200, -3600, 4200, -0.6, 280, 7, 0xa6c2c6); mtn(4200, 600, 3400, 1.4, 240, 11, 0xacc8cc); mtn(0, -5200, 4600, 0, 460, 5, 0xb4ccd6);
    /* 小島 */
    [[-1500, 1200, 90], [1800, 1500, 120], [-2300, 200, 70], [1200, -1300, 80]].forEach(([x, z, r], i) => { const m = new T.Mesh(new T.SphereGeometry(r, 20, 10, 0, TAU, 0, Math.PI / 2), new T.MeshLambertMaterial({ color: [0x6a9a5a, 0x7aa868, 0x5a8a50, 0x6a9a60][i], fog: false })); m.scale.y = 0.35; m.position.set(x, -3, z); w.scene.add(m); });
    /* 船（のんびり動く） */
    const boats = [], hullM = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }), cabM = [0x3a78e8, 0xe0485a, 0xf2c24a, 0x2fbfb0].map((c) => new T.MeshStandardMaterial({ color: c, roughness: 0.5 }));
    for (let i = 0; i < 9; i++) {
      const bg = new T.Group(); const s = i % 3 === 0 ? 2.2 : 1;
      const hull = new T.Mesh(new T.CylinderGeometry(2 * s, 1.4 * s, 12 * s, 4, 1), hullM); hull.rotation.x = Math.PI / 2; hull.rotation.y = Math.PI / 4; hull.scale.set(1, 1, 0.5); hull.position.y = 0.4; bg.add(hull);
      const cab = new T.Mesh(new T.BoxGeometry(2.6 * s, 1.8 * s, 4 * s), cabM[i % 4]); cab.position.set(0, 1.5 * s, -1 * s); bg.add(cab);
      if (i % 2) { const sail = new T.Mesh(new T.ConeGeometry(3, 10, 3), hullM); sail.position.set(0, 6, 1.5); bg.add(sail); }
      w.scene.add(bg); boats.push({ g: bg, a: i / 9 * TAU, r: 1.12 + (i % 3) * 0.06, s: 0.004 + (i % 4) * 0.0015 });
    }
    w.anim.push((dt, t) => boats.forEach((b) => { const a = b.a + t * b.s, [x, z] = islandPt(a, b.r); b.g.position.set(x, -0.45 + Math.sin(t * 1.3 + b.a) * 0.15, z); b.g.rotation.y = -a; }));
  };

  /* ══════════════ 木（インスタンス・近くは細かく、遠くは簡単な形） ══════════════ */
  function canopyGeo(lumps, rng, detail, color) {
    const parts = [];
    lumps.forEach(([x, y, z, r, sy]) => { const g = new T.IcosahedronGeometry(r, detail); g.scale(1, sy || 0.85, 1); g.translate(x, y, z); parts.push(g); });
    const g = XWorld.mergeGeos(parts);
    /* 下ほど暗く・上を明るく（葉の重なりの影）。法線は木の中心から外向き（球のようなやわらかい陰） */
    const p = g.attributes.position, n = g.attributes.normal, col = new Float32Array(p.count * 3);
    { let cx = 0, cy = 0, cz = 0; for (let i = 0; i < p.count; i++) { cx += p.getX(i); cy += p.getY(i); cz += p.getZ(i); } cx /= p.count; cy /= p.count; cz /= p.count;
      for (let i = 0; i < p.count; i++) { let sx = p.getX(i) - cx, sy = (p.getY(i) - cy) * 1.3, sz = p.getZ(i) - cz; const l = Math.hypot(sx, sy, sz) || 1; n.setXYZ(i, sx / l, sy / l + 0.1, sz / l); } }
    let y0 = 1e9, y1 = -1e9; for (let i = 0; i < p.count; i++) { y0 = Math.min(y0, p.getY(i)); y1 = Math.max(y1, p.getY(i)); }
    for (let i = 0; i < p.count; i++) { const k = (p.getY(i) - y0) / Math.max(0.01, y1 - y0), up = n.getY(i) * 0.5 + 0.5, v = 0.5 + k * 0.26 + up * 0.14 + (rng() - 0.5) * 0.08; col[i * 3] = v * (color ? color[0] : 1); col[i * 3 + 1] = v * (color ? color[1] : 1); col[i * 3 + 2] = v * (color ? color[2] : 1); }
    g.setAttribute("color", new T.BufferAttribute(col, 3));
    return g;
  }
  /* ★★ 2026-09-29 近くの木の葉を「葉のかたまりの絵をはった板」の集まりに（原神のような、ふんわりした木）
     ・葉の絵（まわりは透明）を、かたまり（球）の表面にならべた板にはる。法線は木の中心から外向き → 球のようなやわらかい陰
     ・下ほど・内側ほど暗く（葉の重なりの影）。幹と枝は同じ絵の左上の「白い角」を使う（1つの材質で描ける） */
  let LEAF_TEX = null;
  function leafTex() {
    if (LEAF_TEX) return LEAF_TEX;
    const S = 256, c = X.cv(S, S), g = c.getContext("2d"), r = X.rnd(4242);
    g.clearRect(0, 0, S, S); g.fillStyle = "#fff"; g.fillRect(0, 0, 20, 20);
    const leaf = (x, y, a, L, Wd, lum) => {
      g.save(); g.translate(x, y); g.rotate(a);
      const v = Math.round(lum * 255), gr = g.createLinearGradient(0, -Wd, 0, Wd);
      gr.addColorStop(0, "rgb(" + (v * 0.86 | 0) + "," + v + "," + (v * 0.8 | 0) + ")"); gr.addColorStop(1, "rgb(" + (v * 0.6 | 0) + "," + (v * 0.78 | 0) + "," + (v * 0.58 | 0) + ")");
      g.fillStyle = gr; g.beginPath(); g.moveTo(-L / 2, 0); g.quadraticCurveTo(0, -Wd, L / 2, 0); g.quadraticCurveTo(0, Wd, -L / 2, 0); g.fill();
      g.strokeStyle = "rgba(40,60,30,.28)"; g.lineWidth = 1; g.beginPath(); g.moveTo(-L / 2, 0); g.lineTo(L / 2, 0); g.stroke(); g.restore();
    };
    for (let i = 0; i < 170; i++) {
      const a = r() * Math.PI * 2, d = Math.pow(r(), 0.72) * 96, x = 132 + Math.cos(a) * d, y = 132 + Math.sin(a) * d * 0.94;
      const lum = Math.min(1, 0.6 + 0.4 * (1 - d / 106) * (0.72 + 0.28 * r()) + (y < 132 ? 0.06 : -0.05));
      leaf(x, y, a + (r() - 0.5) * 1.7, 20 + r() * 15, 6.5 + r() * 4.5, lum);
    }
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; t.needsUpdate = true;
    return (LEAF_TEX = t);
  }
  const TRUNK_UV = [0.035, 0.965];
  function cardCrown(lumps, rng, per, sizeK) {
    const pos = [], nor = [], uv = [], col = [], idx = [];
    let cx = 0, cy = 0, cz = 0, ws = 0, yMin = 1e9, yMax = -1e9;
    lumps.forEach(([x, y, z, r, sy]) => { cx += x * r; cy += y * r; cz += z * r; ws += r; yMin = Math.min(yMin, y - r * (sy || 0.85)); yMax = Math.max(yMax, y + r * (sy || 0.85)); });
    cx /= ws; cy /= ws; cz /= ws;
    const U0 = 0.09, U1 = 0.97, V0 = 0.03, V1 = 0.91;
    lumps.forEach(([lx, ly, lz, r, sy]) => {
      sy = sy || 0.85;
      const n = Math.round(per * r / 2.2) + 4;
      for (let i = 0; i < n; i++) {
        const k = (i + 0.5) / n, th = Math.acos(1 - 2 * k), ph = i * 2.39996 + rng() * 0.7;
        const dx = Math.sin(th) * Math.cos(ph), dy = Math.cos(th), dz = Math.sin(th) * Math.sin(ph);
        if (dy < -0.5 && rng() < 0.55) continue;
        const rr = r * (0.55 + 0.38 * rng()), px = lx + dx * rr, py = ly + dy * rr * sy, pz = lz + dz * rr, sz = r * sizeK * (0.8 + 0.4 * rng());
        let nx = dx + (rng() - 0.5) * 0.6, ny = dy * 0.7 + 0.2 + (rng() - 0.5) * 0.4, nz = dz + (rng() - 0.5) * 0.6; const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
        let ux = -nz, uy = 0, uz = nx, ul = Math.hypot(ux, uz); if (ul < 1e-3) { ux = 1; uz = 0; ul = 1; } ux /= ul; uz /= ul;
        let vx = ny * uz - nz * uy, vy = nz * ux - nx * uz, vz = nx * uy - ny * ux;
        const a = rng() * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
        const Ux = ux * ca + vx * sa, Uy = uy * ca + vy * sa, Uz = uz * ca + vz * sa, Vx = vx * ca - ux * sa, Vy = vy * ca - uy * sa, Vz = vz * ca - uz * sa;
        const base = pos.length / 3, h = sz / 2;
        [[-1, -1, U0, V0], [1, -1, U1, V0], [1, 1, U1, V1], [-1, 1, U0, V1]].forEach(([a1, b1, tu, tv]) => {
          const x = px + (Ux * a1 + Vx * b1) * h, y = py + (Uy * a1 + Vy * b1) * h, z = pz + (Uz * a1 + Vz * b1) * h;
          pos.push(x, y, z);
          let sx = x - cx, sy2 = (y - cy) * 1.3, sz2 = z - cz; const sl = Math.hypot(sx, sy2, sz2) || 1; sx /= sl; sy2 /= sl; sz2 /= sl;
          const mx = sx * 0.75 + nx * 0.25, my = sy2 * 0.75 + ny * 0.25 + 0.12, mz = sz2 * 0.75 + nz * 0.25, ml = Math.hypot(mx, my, mz) || 1;
          nor.push(mx / ml, my / ml, mz / ml); uv.push(tu, tv);
          const hk = (y - yMin) / Math.max(0.01, yMax - yMin), out = rr / r, v = Math.min(1.05, 0.42 + hk * 0.36 + out * 0.22 + (rng() - 0.5) * 0.06);
          col.push(v, v, v);
        });
        idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
      }
    });
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new T.Float32BufferAttribute(nor, 3));
    g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2)); g.setAttribute("color", new T.Float32BufferAttribute(col, 3)); g.setIndex(idx);
    return g;
  }
  /* 幹と枝（枝は葉のかたまりの中へ）。UV は絵の白い角 */
  function trunkBranches(h, r0, r1, branches, seed) {
    const parts = [], rr = X.rnd(seed || 9);
    const tr = new T.CylinderGeometry(r1, r0, h, 7, 1); tr.translate(0, h / 2, 0); parts.push(tr);
    for (let i = 0; i < branches; i++) {
      const a = i / branches * Math.PI * 2 + rr() * 0.8, L = h * (0.45 + rr() * 0.2), tilt = 0.7 + rr() * 0.35;
      const b = new T.CylinderGeometry(r1 * 0.25, r1 * 0.6, L, 5, 1); b.translate(0, L / 2, 0); b.rotateZ(-tilt); b.rotateY(a); b.translate(0, h * (0.62 + rr() * 0.2), 0); parts.push(b);
    }
    const g = XWorld.mergeGeos(parts), u = g.attributes.uv; for (let i = 0; i < u.count; i++) u.setXY(i, TRUNK_UV[0], TRUNK_UV[1]);
    return g;
  }
  let FLOWER_TEX = null;
  function flowerTex() {
    if (FLOWER_TEX) return FLOWER_TEX;
    const c = X.cv(256, 128), g = c.getContext("2d"), r = X.rnd(515);
    g.clearRect(0, 0, 256, 128);
    for (let i = 0; i < 46; i++) { const x = 8 + r() * 112, y = 30 + r() * 96, a = -Math.PI / 2 + (r() - 0.5) * 1.6, L = 18 + r() * 22; g.save(); g.translate(x, 127); g.rotate(a + Math.PI / 2); const v = 0.55 + r() * 0.4; g.fillStyle = "rgb(" + (60 * v | 0) + "," + (150 * v | 0) + "," + (50 * v | 0) + ")"; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-5, -L * 0.5, 0, -L - (127 - y) * 0.6); g.quadraticCurveTo(5, -L * 0.5, 0, 0); g.fill(); g.restore(); }
    for (let i = 0; i < 7; i++) { const x = 140 + (i % 4) * 28 + r() * 10, y = 22 + Math.floor(i / 4) * 44 + r() * 16, R = 9 + r() * 5;
      g.strokeStyle = "rgb(70,140,60)"; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 6, 128); g.stroke();
      for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + r(); g.fillStyle = k % 2 ? "#ffffff" : "#f0f0f0"; g.beginPath(); g.ellipse(x + Math.cos(a) * R * 0.55, y + Math.sin(a) * R * 0.55, R * 0.55, R * 0.32, a, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = "#ffe07a"; g.beginPath(); g.arc(x, y, R * 0.28, 0, Math.PI * 2); g.fill(); }
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; t.needsUpdate = true;
    return (FLOWER_TEX = t);
  }
  function flowerCards() {
    const pos = [], uv = [], col = [], fol = [], nor = [], idx = [];
    const card = (a, w, h, y0, u0, u1, isF, off) => { const c = Math.cos(a), s = Math.sin(a), ox = Math.cos(a + 1.3) * off, oz = Math.sin(a + 1.3) * off, b = pos.length / 3;
      [[-1, 0, u0, 0], [1, 0, u1, 0], [1, 1, u1, 1], [-1, 1, u0, 1]].forEach(([k, j, u, v]) => { pos.push(ox + c * k * w / 2, y0 + j * h, oz - s * k * w / 2); uv.push(u, v); const sh = isF ? 1 : 0.62 + j * 0.38; col.push(sh, sh, sh); fol.push(isF ? 1 : 0); nor.push(0, 1, 0); });
      idx.push(b, b + 1, b + 2, b, b + 2, b + 3); };
    card(0.3, 0.6, 0.42, 0, 0, 0.5, false, 0); card(1.9, 0.6, 0.42, 0, 0, 0.5, false, 0);
    card(0.9, 0.5, 0.36, 0.14, 0.5, 1, true, 0.05); card(2.5, 0.5, 0.36, 0.12, 0.5, 1, true, 0.05);
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new T.Float32BufferAttribute(nor, 3)); g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    g.setAttribute("color", new T.Float32BufferAttribute(col, 3)); g.setAttribute("aFol", new T.Float32BufferAttribute(fol, 1)); g.setIndex(idx);
    return g;
  }
  function palmFronds(n, len) {
    const parts = [];
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU + (i % 2) * 0.2, pos = [], idx = [];
      for (let k = 0; k <= 6; k++) { const t = k / 6, r = t * len, y = Math.sin(t * 1.6) * len * 0.22 - t * t * len * 0.35, wdt = Math.sin(t * Math.PI) * 0.9 + 0.1; pos.push(r, y, -wdt, r, y + 0.05, wdt); }
      for (let k = 0; k < 6; k++) { const b = k * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
      const g = new T.BufferGeometry(); g.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); g.rotateY(a);
      parts.push(g);
    }
    const g = XWorld.mergeGeos(parts), p = g.attributes.position, col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) { const k = Math.min(1, Math.hypot(p.getX(i), p.getZ(i)) / len); col[i * 3] = 0.6 + k * 0.25; col[i * 3 + 1] = 0.8 + k * 0.2; col[i * 3 + 2] = 0.55 + k * 0.1; }
    g.setAttribute("color", new T.BufferAttribute(col, 3));
    return g;
  }
  let VEG = null;
  /* 幹（茶色・aFol=0）と葉（明るい灰色に下ほど暗い影・aFol=1）を1つの形にする。葉の色はインスタンスの色 */
  function treeGeo(trunk, crown, trunkCol) {
    const tc = trunkCol || [0.42, 0.29, 0.2];
    const tn = trunk ? trunk.attributes.position.count : 0;
    if (trunk && !trunk.attributes.color) { const c = new Float32Array(tn * 3); for (let i = 0; i < tn; i++) { c[i * 3] = tc[0]; c[i * 3 + 1] = tc[1]; c[i * 3 + 2] = tc[2]; } trunk.setAttribute("color", new T.BufferAttribute(c, 3)); }
    const g = trunk ? XWorld.mergeGeos([trunk, crown]) : crown;
    const n = g.attributes.position.count, fol = new Float32Array(n); for (let i = tn; i < n; i++) fol[i] = 1;
    g.setAttribute("aFol", new T.BufferAttribute(fol, 1));
    return g;
  }
  function vegDefs() {
    if (VEG) return VEG;
    const r = X.rnd(77);
    const trunk = (h, r0, r1, seg) => { const g = new T.CylinderGeometry(r1, r0, h, seg || 6, 1); g.translate(0, h / 2, 0); return g; };
    const oakHi = cardCrown([[0, 4.7, 0, 2.6, 0.85], [1.4, 5.6, 0.5, 2.0, 0.85], [-1.2, 5.5, -0.7, 2.0, 0.85], [0.2, 6.5, -0.2, 1.6, 0.8]], r, 19, 0.95);
    const oakLo = canopyGeo([[0, 5.0, 0, 2.9, 0.9]], r, 0);
    const popHi = cardCrown([[0, 5.0, 0, 1.6, 2.2], [0.2, 7.6, 0.15, 1.25, 1.9]], r, 24, 0.8);
    const popLo = canopyGeo([[0, 6, 0, 1.5, 2.6]], r, 0);
    const pineHi = XWorld.mergeGeos([new T.ConeGeometry(2.6, 3.4, 8).translate(0, 2.8, 0), new T.ConeGeometry(2.1, 3.0, 8).translate(0, 4.5, 0), new T.ConeGeometry(1.5, 2.6, 8).translate(0, 6.0, 0), new T.ConeGeometry(0.9, 2.0, 7).translate(0, 7.3, 0)]);
    const pineLo = new T.ConeGeometry(2.4, 7.5, 5).translate(0, 4.2, 0);
    [pineHi, pineLo].forEach((g) => { const p = g.attributes.position, col = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) { const v = 0.6 + Math.min(1, p.getY(i) / 8) * 0.35; col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = v; } g.setAttribute("color", new T.BufferAttribute(col, 3)); });
    const palmTrunkHi = (() => { const parts = []; for (let i = 0; i < 7; i++) { const g = new T.CylinderGeometry(0.2 - i * 0.008, 0.27 - i * 0.008, 1.5, 6, 1); g.translate(i * i * 0.012, 0.75 + i * 1.45, 0); parts.push(g); } return XWorld.mergeGeos(parts); })();
    const palmTrunkLo = trunk(10, 0.28, 0.2, 5);
    const frondHi = palmFronds(10, 4.8); frondHi.translate(0.6, 10.1, 0);
    const frondLo = palmFronds(6, 4.6); frondLo.translate(0.6, 10.1, 0);
    const bushHi = cardCrown([[0, 0.62, 0, 0.95, 0.75], [0.6, 0.55, 0.3, 0.72, 0.75], [-0.5, 0.52, -0.3, 0.72, 0.75]], r, 16, 1.15);
    const bushLo = canopyGeo([[0, 0.6, 0, 1.1, 0.7]], r, 0);
    /* ★ 2026-09-29 花：交差した「葉の板」（緑のまま・aFol=0）と「花の板」（白い花の絵をインスタンスの色でそめる・aFol=1）。
       前は緑の多面体に八面体の花びらで、近くで見るとカクカクした宝石のようだった */
    const flowerM = flowerCards();
    const broad = (k, c, sub) => sub === "sakura" ? c.setHSL(0.94 + (k % 4) * 0.012, 0.75, 0.76 + (k % 3) * 0.03) : sub === "flowerTree" ? (k % 2 ? c.setHSL(0.76, 0.6, 0.66) : c.setHSL(0.12, 0.85, 0.56)) : c.setHSL(0.26 + (k % 7) * 0.012, 0.55 + (k % 3) * 0.07, 0.3 + (k % 5) * 0.025);
    VEG = {
      broad: { geo: [treeGeo(trunkBranches(4.4, 0.36, 0.22, 4, 11), oakHi), treeGeo(trunk(4.2, 0.36, 0.26, 4), oakLo)], tint: broad, sway: 1, cards: true },
      poplar: { geo: [treeGeo(trunkBranches(3.4, 0.26, 0.16, 3, 12), popHi), treeGeo(trunk(3, 0.25, 0.18, 4), popLo)], tint: (k, c) => c.setHSL(0.27 + (k % 5) * 0.01, 0.45, 0.36 + (k % 4) * 0.02), sway: 1, cards: true },
      pine: { geo: [treeGeo(trunk(2.4, 0.3, 0.22), pineHi), treeGeo(trunk(2.4, 0.3, 0.22, 4), pineLo)], tint: (k, c) => c.setHSL(0.36 + (k % 5) * 0.01, 0.45, 0.28 + (k % 4) * 0.02), sway: 0.5 },
      palm: { geo: [treeGeo(palmTrunkHi, frondHi, [0.6, 0.47, 0.33]), treeGeo(palmTrunkLo, frondLo, [0.6, 0.47, 0.33])], tint: (k, c) => c.setHSL(0.28 + (k % 4) * 0.015, 0.55, 0.42 + (k % 3) * 0.03), sway: 1.6 },
      bush: { geo: [treeGeo(null, bushHi), treeGeo(null, bushLo)], tint: (k, c) => (k % 6 === 0 ? c.setHSL((k * 0.137) % 1, 0.65, 0.62) : c.setHSL(0.28 + (k % 4) * 0.012, 0.5, 0.36 + (k % 3) * 0.03)), sway: 0.3, near: 80, cards: true },
      flower: { geo: [flowerM, null], tint: null, sway: 0.2, near: 70, only: true }
    };
    VEG.oak = VEG.sakura = VEG.flowerTree = VEG.broad;
    return VEG;
  }
  /* 木の材質：影の焼き込み＋風でゆれる＋葉だけインスタンスの色 */
  const TIME = { value: 0 };
  function vegMat(base, sway) {
    const m = new T.MeshStandardMaterial(Object.assign({ roughness: 0.85, metalness: 0 }, base));
    m.envMapIntensity = 0.25;
    patchAO(m, false, sway, true);
    return m;
  }

  /* ══════════════ 影と接地の暗さ（焼き込み） ══════════════ */
  const AOU = {
    uAOTex: { value: null }, uShTex: { value: null }, uGrassTex: { value: null },
    uAOmin: { value: new T.Vector2(BOUNDS.x0, BOUNDS.z0) }, uAOsize: { value: new T.Vector2(BOUNDS.w, BOUNDS.h) },          /* ★★ 2026-10-01 島の範囲（BOUNDS・モノレールの外へ広げた島） */
    uSunSh: { value: 1 }, uTime: TIME
  };
  (function () { const d = new T.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); d.needsUpdate = true; AOU.uAOTex.value = AOU.uShTex.value = AOU.uGrassTex.value = d; })();
  function patchAO(mat, grass, sway, fol) {
    if (mat.userData.aoPatched) return; mat.userData.aoPatched = true;
    const prev = mat.onBeforeCompile;
    mat.onBeforeCompile = function (sh, r) {
      if (prev && prev !== mat.onBeforeCompile) prev.call(this, sh, r);
      Object.assign(sh.uniforms, AOU);
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vAOw;\nuniform float uTime;" + (fol ? "\nattribute float aFol;" : ""))
        .replace("#include <color_vertex>", fol ? "#include <color_vertex>\n#ifdef USE_INSTANCING_COLOR\n vColor.xyz = color.xyz * mix(vec3(1.0), instanceColor.xyz, aFol);\n#endif" : "#include <color_vertex>")
        .replace("#include <begin_vertex>", "#include <begin_vertex>" + (sway ? "\n{ vec4 ip = vec4(0.0, 0.0, 0.0, 1.0);\n#ifdef USE_INSTANCING\n ip = instanceMatrix * ip;\n#endif\n float sw = " + sway.toFixed(2) + " * max(0.0, position.y - 1.5) * 0.012; transformed.x += sin(uTime * 1.3 + ip.x * 0.13 + ip.z * 0.07) * sw; transformed.z += cos(uTime * 1.1 + ip.z * 0.11) * sw * 0.7; }" : ""))
        .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\n{ vec4 aw = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\n aw = instanceMatrix * aw;\n#endif\n vAOw = (modelMatrix * aw).xyz; }");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vAOw; uniform sampler2D uAOTex, uShTex, uGrassTex; uniform vec2 uAOmin, uAOsize; uniform float uSunSh;")
        .replace("#include <map_fragment>", "#include <map_fragment>\n{ vec2 q = (vAOw.xz - uAOmin) / uAOsize; float ao = mix(0.5, 1.0, texture2D(uAOTex, q).r); float shd = mix(0.52, 1.0, texture2D(uShTex, q).r);\n ao = mix(ao, 1.0, clamp(vAOw.y / 3.2, 0.0, 1.0));\n shd = mix(1.0, shd, uSunSh * (1.0 - clamp((vAOw.y - 0.15) / 0.9, 0.0, 1.0)));\n diffuseColor.rgb *= ao * shd;" + (grass ? "\n { float fd = smoothstep(140.0, 900.0, length(vAOw.xz - cameraPosition.xz)) * 0.6; diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.13, 0.45, 0.055), fd); }\n diffuseColor.rgb *= texture2D(uGrassTex, q).rgb * 1.28;" : "") + " }");
    };
    mat.customProgramCacheKey = () => "ao" + (grass ? "g" : "") + (sway ? "s" + sway : "") + (fol ? "f" : "");
  }
  P.patchAO = patchAO;

  P.bakeGround = function () {
    const w = this, B = AOU, x0 = B.uAOmin.value.x, z0 = B.uAOmin.value.y, SX = B.uAOsize.value.x, SZ = B.uAOsize.value.y;
    const NS = MOBILE ? 2048 : 4096, NA = 2048, NG = 1024;
    /* 影（太陽の向き）：木は薄く、建物は濃く（重なっても濃くならないよう不透明で塗って、あとでまとめてぼかす） */
    const cS = X.cv(NS, NS), gS = cS.getContext("2d"); gS.fillStyle = "#fff"; gS.fillRect(0, 0, NS, NS);
    const toS = (x, z) => [(x - x0) / SX * NS, (z - z0) / SZ * NS];
    gS.fillStyle = "#7a7a7a";
    w.trees.forEach(([k, x, z, s]) => { if (k === "flower" || k === "bush") return; const h = (k === "palm" ? 10 : k === "poplar" ? 8 : 6.5) * s, rr = (k === "palm" ? 3.6 : k === "poplar" ? 1.8 : 2.8) * s; const [px, pz] = toS(x + SHX * h * 0.72, z + SHZ * h * 0.72); gS.beginPath(); gS.ellipse(px, pz, rr / SX * NS, rr / SZ * NS * 1.15, 0, 0, TAU); gS.fill(); });
    gS.fillStyle = "#000";
    w.casters.forEach((c) => {
      const pts = c.pts.concat(c.pts.map(([x, z]) => [x + SHX * c.h, z + SHZ * c.h])), hull = convexHull(pts);
      gS.beginPath(); hull.forEach(([x, z], i) => { const [px, pz] = toS(x, z); if (i) gS.lineTo(px, pz); else gS.moveTo(px, pz); }); gS.closePath(); gS.fill();
    });
    const cS2 = X.cv(NS, NS), gS2 = cS2.getContext("2d"); gS2.filter = "blur(" + (NS / 2048 * 1.4).toFixed(1) + "px)"; gS2.drawImage(cS, 0, 0);
    /* 接地の暗さ（建物のまわり・木の根もと） */
    const cA = X.cv(NA, NA), gA = cA.getContext("2d"); gA.fillStyle = "#fff"; gA.fillRect(0, 0, NA, NA);
    const toA = (x, z) => [(x - x0) / SX * NA, (z - z0) / SZ * NA];
    gA.fillStyle = "#555"; gA.strokeStyle = "#555"; gA.lineWidth = 1.6 / SX * NA * 2; gA.lineJoin = "round";
    w.casters.forEach((c) => { gA.beginPath(); c.pts.forEach(([x, z], i) => { const [px, pz] = toA(x, z); if (i) gA.lineTo(px, pz); else gA.moveTo(px, pz); }); gA.closePath(); gA.fill(); gA.stroke(); });
    gA.fillStyle = "#9a9a9a"; w.trees.forEach(([k, x, z, s]) => { if (k === "flower") return; const [px, pz] = toA(x, z), rr = (k === "bush" ? 1.2 : 1.9) * s / SX * NA; gA.beginPath(); gA.arc(px, pz, rr, 0, TAU); gA.fill(); });
    const cA2 = X.cv(NA, NA), gA2 = cA2.getContext("2d"); gA2.filter = "blur(3px)"; gA2.drawImage(cA, 0, 0);
    /* 芝の色むら（明るい所・濃い所・黄みの所。森の下は濃く） */
    const cG = X.cv(NG, NG), gG = cG.getContext("2d"), r = X.rnd(123);
    gG.fillStyle = "rgb(200,208,188)"; gG.fillRect(0, 0, NG, NG);
    for (let i = 0; i < 900; i++) { const x = r() * NG, y = r() * NG, rr = 8 + r() * 46, k = r(); gG.fillStyle = k < 0.4 ? "rgba(236,242,206,.35)" : k < 0.7 ? "rgba(160,176,150,.3)" : "rgba(232,222,168,.3)"; gG.beginPath(); gG.arc(x, y, rr, 0, TAU); gG.fill(); }
    gG.fillStyle = "rgba(120,140,110,.22)"; w.trees.forEach(([k, x, z]) => { if (k === "flower" || k === "bush") return; const px = (x - x0) / SX * NG, pz = (z - z0) / SZ * NG; gG.beginPath(); gG.arc(px, pz, 3.2, 0, TAU); gG.fill(); });
    const cG2 = X.cv(NG, NG), gG2 = cG2.getContext("2d"); gG2.filter = "blur(6px)"; gG2.drawImage(cG, 0, 0);
    /* ★ 2026-09-29 flipY を切る：絵の上＝北（z の小さい方）。前は上下が逆で、焼いた影と接地の暗さが z の反対側（例：GATE の影が MOTOR CITY）に出ていた */
    const mk = (c) => { const t = new T.CanvasTexture(c); t.flipY = false; t.colorSpace = T.NoColorSpace; t.anisotropy = 4; t.wrapS = t.wrapT = T.ClampToEdgeWrapping; t.needsUpdate = true; return t; };
    B.uShTex.value = mk(cS2); B.uAOTex.value = mk(cA2); const gt = mk(cG2); gt.colorSpace = T.SRGBColorSpace; B.uGrassTex.value = gt;
    w.aoU = B;
    /* 材質に焼き込みをつける（光るもの・水・看板は除く） */
    patchAO(w.m.islandLawn, true);
    for (const k in w.m) { const m = w.m[k]; if (!m || m.isMeshBasicMaterial || m.isShaderMaterial || m.transparent || /^sign|glow|neon|led|lightPanel/.test(k) || k === "islandLawn") continue; if (m.isMeshStandardMaterial || m.isMeshLambertMaterial || m.isMeshToonMaterial) patchAO(m, false); }
  };
  function convexHull(pts) {
    const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); if (p.length < 3) return p;
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = []; for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    const up = []; for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    up.pop(); lo.pop(); return lo.concat(up);
  }

  /* ══════════════ 森・植えこみ（あいている芝生をうめる）→ 木のインスタンスを作る ══════════════ */
  P.fillForest = function () {
    const w = this, roads = w.roads, zones = w.zones;
    /* ★ 2026-09-29 コースターの線路のそばの木は取りのぞく（線路の下に木がささっていた） */
    const KO = new Map(), KS = 20; (w.treeKeepOut || []).forEach((k) => k.pts.forEach(([x, z, y]) => { const key = Math.floor(x / KS) + "," + Math.floor(z / KS); if (!KO.has(key)) KO.set(key, []); KO.get(key).push([x, z, k.r, y]); }));
    const keepOut = (x, z, h) => { for (let gx = Math.floor(x / KS) - 1; gx <= Math.floor(x / KS) + 1; gx++) for (let gz = Math.floor(z / KS) - 1; gz <= Math.floor(z / KS) + 1; gz++) { const a = KO.get(gx + "," + gz); if (a) for (const q of a) if (q[3] < (h || 11) && Math.hypot(q[0] - x, q[1] - z) < q[2]) return true; } return false; };
    /* ★ 2026-09-29 入れる建物の中（とすぐ外）に植えた木・花・しげみも取りのぞく（壁しか当たりがないので、木が部屋の中に立っていた） */
    const inRoom = (x, z) => { for (const q of w.interiors || []) { if (q.round) { if (Math.hypot(x - q.x, z - q.z) < q.r + 2.2) return true; continue; } const dx = x - q.x, dz = z - q.z, a = dx * q.c - dz * q.s, b = dx * q.s + dz * q.c; if (Math.abs(a) < q.hw + 1.6 && Math.abs(b) < q.hd + 1.6) return true; } return false; };
    const SI = w.spotIndex();          /* ★ 2026-09-29d 道・建物・水の上の木・しげみ・花は取りのぞく（前は道のまん中に木が立っていた） */
    w.trees = w.trees.filter((t) => !inRoom(t[1], t[2]) && (t[0] === "flower" || !keepOut(t[1], t[2], t[0] === "palm" ? 13 : t[0] === "bush" ? 3 : 10)) &&
      !SI.road(t[1], t[2], t[0] === "flower" ? -0.3 : t[0] === "bush" ? 0.1 : 0.9) && !SI.bld(t[1], t[2], t[0] === "flower" || t[0] === "bush" ? 0 : 1.2) && !SI.water(t[1], t[2]));
    const G = new Map(), GS = 40;
    const addG = (x0, z0, x1, z1, it) => { for (let gx = Math.floor(x0 / GS); gx <= Math.floor(x1 / GS); gx++) for (let gz = Math.floor(z0 / GS); gz <= Math.floor(z1 / GS); gz++) { const k = gx + "," + gz; if (!G.has(k)) G.set(k, []); G.get(k).push(it); } };
    roads.forEach((r) => addG(Math.min(r[0], r[2]) - r[4], Math.min(r[1], r[3]) - r[4], Math.max(r[0], r[2]) + r[4], Math.max(r[1], r[3]) + r[4], { r }));
    w.colliders.forEach((c) => addG(c.x0 - 3, c.z0 - 3, c.x1 + 3, c.z1 + 3, { c }));
    (w.rivers || []).forEach((rv) => { for (let i = 0; i < rv.pts.length - 1; i++) { const r = [rv.pts[i][0], rv.pts[i][1], rv.pts[i + 1][0], rv.pts[i + 1][1], rv.w + 4]; addG(Math.min(r[0], r[2]) - r[4], Math.min(r[1], r[3]) - r[4], Math.max(r[0], r[2]) + r[4], Math.max(r[1], r[3]) + r[4], { r }); } });
    const segD = (x, z, r) => { const [x0, z0, x1, z1] = r, dx = x1 - x0, dz = z1 - z0, l2 = dx * dx + dz * dz; let t = l2 ? ((x - x0) * dx + (z - z0) * dz) / l2 : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(x - (x0 + dx * t), z - (z0 + dz * t)); };
    const open = w.forestOpen || [];         /* 森にしない所（広場など）[x, z, r] */
    const paved = w.paved || [];             /* 舗装した所 [x0, z0, x1, z1] */
    /* エリアの中は、木がある方が自然な所だけ（まばらに）。競技場・サーキット・街・広場などには植えない */
    const ALLOW = { adv: 1, learn: 1, lab: 1, resort: 1, media: 1, ent: 1, space: 1, puzzle: 1, aqua: 1 };
    const inAreaOf = (x, z) => { let hit = null; for (const a of AREAS) if (x > a.x0 && x < a.x1 && z > a.z0 && z < a.z1) { if (!ALLOW[a.id]) return "no"; hit = a; } return hit; };
    const free = (x, z, m) => {
      if (!w.insideIsland(x, z, 18)) return false;
      if (x > -112 && x < 112 && z > -84 && z < 56) return false;
      if (SI.bld(x, z, m) || inRoom(x, z)) return false;          /* ★★ 2026-09-30b 中が空洞の建物（壁だけ当たりがある＝パレードスタジオなど）の中に森の木を植えていた */
      for (const zn of zones) if (!/^\d+ XEVARION/.test(zn.name) && x > zn.x0 - m && x < zn.x1 + m && z > zn.z0 - m && z < zn.z1 + m) return false;
      for (const q of paved) if (x > q[0] - m && x < q[2] + m && z > q[1] - m && z < q[3] + m) return false;
      for (const o of open) if (Math.hypot(x - o[0], z - o[1]) < o[2]) return false;
      const a = G.get(Math.floor(x / GS) + "," + Math.floor(z / GS)); if (a) for (const it of a) { if (it.r) { if (segD(x, z, it.r) < it.r[4] / 2 + m) return false; } else { const c = it.c; if (x > c.x0 - m && x < c.x1 + m && z > c.z0 - m && z < c.z1 + m) return false; } }
      return true;
    };
    const rr = X.rnd(97), noise = (x, z) => Math.sin(x * 0.011 + 1.3) * Math.sin(z * 0.013 + 0.4) + 0.5 * Math.sin(x * 0.031 - z * 0.027) + 0.25 * Math.sin(x * 0.07 + z * 0.05);
    const step = MOBILE ? 8 : 5.6;
    for (let x = BOUNDS.x0 + 20; x <= BOUNDS.x1 - 20; x += step) for (let z = BOUNDS.z0 + 20; z <= BOUNDS.z1 - 20; z += step) {          /* ★★ 2026-10-01 島の範囲（BOUNDS） */
      const px = x + (rr() - 0.5) * step * 0.9, pz = z + (rr() - 0.5) * step * 0.9, nz = noise(px, pz), cd = w.coastDist(px, pz);
      const dens = 0.72 + nz * 0.28 + (cd < 90 ? 0.2 : 0);
      const ar = inAreaOf(px, pz); if (ar === "no") continue;
      const inArea = !!ar;
      if (rr() > dens * (inArea ? 0.35 : 1) || !free(px, pz, inArea ? 5 : 3.5) || keepOut(px, pz)) continue;
      const k = rr();
      let kind = cd < 60 ? (k < 0.55 ? "palm" : k < 0.8 ? "pine" : "oak") : pz < -150 ? (k < 0.45 ? "pine" : k < 0.85 ? "oak" : "poplar") : (k < 0.7 ? "oak" : k < 0.76 ? "sakura" : k < 0.86 ? "poplar" : k < 0.9 ? "flowerTree" : "pine");
      w.trees.push([kind, px, pz, 0.95 + rr() * 0.6]);
      if (rr() < 0.25) { const bx = px + (rr() - 0.5) * 6, bz = pz + (rr() - 0.5) * 6, bs = 0.8 + rr() * 0.5; if (!SI.bld(bx, bz, 1) && !SI.road(bx, bz, 0.4)) w.trees.push(["bush", bx, bz, bs]); }
    }
    w.buildVegetation();
  };
  P.buildVegetation = function () {
    const w = this, V = vegDefs(), CELL = 220;
    const mats = { crown: {}, card: {}, flower: vegMat({ vertexColors: true, roughness: 0.7, map: flowerTex(), alphaTest: 0.45, alphaToCoverage: true, side: T.DoubleSide }) };
    const crownMat = (sway, card) => card ? (mats.card[sway] || (mats.card[sway] = vegMat({ vertexColors: true, side: T.DoubleSide, map: leafTex(), alphaTest: 0.42, alphaToCoverage: true }, sway))) : (mats.crown[sway] || (mats.crown[sway] = vegMat({ vertexColors: true, side: T.DoubleSide }, sway)));
    const cells = new Map(), kindOf = (k) => (k === "oak" || k === "sakura" || k === "flowerTree") ? "broad" : k;
    w.trees.forEach((t, i) => { const k = kindOf(t[0]) + "|" + Math.floor(t[1] / CELL) + "," + Math.floor(t[2] / CELL); if (!cells.has(k)) cells.set(k, []); cells.get(k).push([t, i]); });
    w.vegCells = [];
    const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), v = new T.Vector3(), sc = new T.Vector3(), col = new T.Color();
    cells.forEach((arr, key) => {
      const kind = key.split("|")[0], D = V[kind]; if (!D) return;
      let cx = 0, cz = 0, bx0 = 1e9, bz0 = 1e9, bx1 = -1e9, bz1 = -1e9; arr.forEach(([t]) => { cx += t[1]; cz += t[2]; bx0 = Math.min(bx0, t[1]); bx1 = Math.max(bx1, t[1]); bz0 = Math.min(bz0, t[2]); bz1 = Math.max(bz1, t[2]); }); cx /= arr.length; cz /= arr.length;
      const lod = [];
      for (let L = 0; L < 2; L++) {
        const cg = D.geo[L]; if (!cg) { lod.push(null); continue; }
        const im = new T.InstancedMesh(cg, kind === "flower" ? mats.flower : crownMat(D.sway, L === 0 && D.cards), arr.length);
        arr.forEach(([t, gi], i) => {
          const s = t[3]; e.set(0, (t[1] * 13.1 + t[2] * 7.3) % TAU, 0); q.setFromEuler(e); v.set(t[1], t[5] || 0, t[2]); sc.set(s, s * (kind === "flower" || kind === "bush" ? 1 : 0.92 + ((gi * 7) % 5) * 0.04), s);
          m4.compose(v, q, sc); im.setMatrixAt(i, m4);
          if (t[4] != null) col.setHex(t[4]); else if (D.tint) D.tint(gi, col, t[0]); else col.setRGB(1, 1, 1);
          im.setColorAt(i, col);
        });
        im.computeBoundingSphere(); im.castShadow = false; im.receiveShadow = true; im.frustumCulled = true; w.scene.add(im);
        lod.push([im]);
      }
      w.vegCells.push({ c: [cx, cz], b: [bx0, bz0, bx1, bz1], near: D.near || 95, only: !!D.only, lod });
      /* 幹は当たる（小さい木・花・植えこみは当たらない） */
      if (kind !== "flower" && kind !== "bush") arr.forEach(([t]) => w.colCircle(t[1], t[2], (kind === "palm" ? 0.3 : 0.36) * Math.min(1.4, t[3])));
    });
    w.anim.push((dt, t) => { TIME.value = t; });
  };
  /* 木の見える範囲（近くは細かい形・遠くは簡単な形・とても遠いのは描かない） */
  P.updateVeg = function (cx, cz, R) {
    if (!this.vegCells) return;
    for (const c of this.vegCells) {
      const ex = Math.max(c.b[0] - cx, 0, cx - c.b[2]), ez = Math.max(c.b[1] - cz, 0, cz - c.b[3]), d = Math.hypot(ex, ez);
      const hi = d < c.near, lo = !hi && d < R && !c.only;
      if (c.lod[0]) c.lod[0].forEach((m) => { m.visible = hi; });
      if (c.lod[1]) c.lod[1].forEach((m) => { m.visible = lo; });
    }
  };

  /* ══════════════ 遠くの来場者（小さな人の群れ・インスタンス・近くでは消えて VRoid の人に入れかわる） ══════════════ */
  P.buildCrowdFar = function () {
    const w = this, r = X.rnd(55), spots = [];
    const N = MOBILE ? 900 : 2100;
    w.walkPaths.forEach((p) => { const pts = p.pts; let acc = 0; for (let i = 1; i < pts.length; i++) { const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); acc += seg; if (acc > 5 + r() * 6) { acc = 0; const dx = (pts[i][0] - pts[i - 1][0]) / (seg || 1), dz = (pts[i][1] - pts[i - 1][1]) / (seg || 1), off = (r() - 0.5) * Math.max(1, p.w - 2); spots.push([pts[i][0] - dz * off, pts[i][1] + dx * off, Math.atan2(dx, dz) + (r() < 0.5 ? Math.PI : 0), 2 + r() * 5]); } } });
    w.plazas.forEach(([x, z, rad, dens]) => { const n = Math.floor(rad * rad * 0.012 * (dens || 1)); for (let i = 0; i < n; i++) { const a = r() * TAU, d = Math.sqrt(r()) * rad; spots.push([x + Math.cos(a) * d, z + Math.sin(a) * d, r() * TAU, r() < 0.4 ? 0 : 1 + r() * 3]); } });
    w.crowdSpots.forEach(([x, z, n]) => { for (let i = 0; i < n; i++) spots.push([x + (r() - 0.5) * 6, z + (r() - 0.5) * 6, r() * TAU, 0]); });
    for (let i = spots.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = spots[i]; spots[i] = spots[j]; spots[j] = t; }
    const list = spots.filter(([x, z]) => w.insideIsland(x, z, 4) && !w.isWater(x, z) && !w.isWater(x + 0.6, z) && !w.isWater(x - 0.6, z)).slice(0, N);
    w.crowdNear = w.crowdNear || { value: 30 };
    /* 1人 = 脚（こい色）・体（服の色＝インスタンスの色）・頭（はだ／髪）を1つの形に（三角形 約 60） */
    const parts = [[new T.BoxGeometry(0.3, 0.76, 0.2).translate(0, 0.38, 0), [0.22, 0.24, 0.3], 0], [new T.CylinderGeometry(0.19, 0.23, 0.72, 5).translate(0, 1.1, 0), [1, 1, 1], 1], [new T.IcosahedronGeometry(0.16, 0).translate(0, 1.6, 0), [0.95, 0.82, 0.7], 0], [new T.BoxGeometry(0.3, 0.12, 0.3).translate(0, 1.72, -0.02), [0.25, 0.17, 0.12], 0]];
    const pg = XWorld.mergeGeos(parts.map((q) => q[0])), pc = new Float32Array(pg.attributes.position.count * 3), pm = new Float32Array(pg.attributes.position.count);
    { let o = 0; parts.forEach(([g, c, k]) => { const n = g.attributes.position.count; for (let i = 0; i < n; i++) { pc[(o + i) * 3] = c[0]; pc[(o + i) * 3 + 1] = c[1]; pc[(o + i) * 3 + 2] = c[2]; pm[o + i] = k; } o += n; }); }
    pg.setAttribute("color", new T.BufferAttribute(pc, 3)); pg.setAttribute("aFol", new T.BufferAttribute(pm, 1));
    const walk = new Float32Array(list.length * 4);
    list.forEach((s, i) => { walk[i * 4] = s[3]; walk[i * 4 + 1] = r() * TAU; walk[i * 4 + 2] = 0.7 + r() * 0.5; walk[i * 4 + 3] = 0; });
    pg.setAttribute("aWalk", new T.InstancedBufferAttribute(walk, 4));
    const m = new T.MeshLambertMaterial({ color: 0xffffff, vertexColors: true });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = TIME; sh.uniforms.uNear = w.crowdNear;
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute vec4 aWalk; attribute float aFol; uniform float uTime, uNear;")
        .replace("#include <color_vertex>", "#include <color_vertex>\n#ifdef USE_INSTANCING_COLOR\n vColor.xyz = color.xyz * mix(vec3(1.0), instanceColor.xyz, aFol);\n#endif")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\n{ float ph = uTime * aWalk.z / max(aWalk.x, 0.5) + aWalk.y; transformed.z += sin(ph) * aWalk.x; transformed.y += abs(sin(ph * 5.0)) * 0.05 * step(0.1, aWalk.x);\n vec4 ip = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0); float dc = length(ip.xz - cameraPosition.xz); transformed *= step(uNear, dc); }");
    };
    m.customProgramCacheKey = () => "crowdFar";
    const im = new T.InstancedMesh(pg, m, list.length), m4 = new T.Matrix4(), c = new T.Color();
    const cloth = [0xff6a8a, 0x5aa8ff, 0xffd24a, 0x7ce0a0, 0xffffff, 0xc08aff, 0xff9a4a, 0x3a4a7a, 0xe84a5a, 0x2fbfb0, 0xf0f0f0, 0x222a3a];
    list.forEach((s, i) => { m4.compose(new T.Vector3(s[0], 0, s[1]), new T.Quaternion().setFromEuler(new T.Euler(0, s[2], 0)), new T.Vector3(1, 0.92 + r() * 0.16, 1)); im.setMatrixAt(i, m4); c.setHex(cloth[Math.floor(r() * cloth.length)]); im.setColorAt(i, c); });
    im.frustumCulled = false; im.castShadow = false; im.receiveShadow = false; w.scene.add(im);
    w.crowdFar = [im];
    w.crowdFarCount = list.length;
  };

  /* ══════════════ 夜の光だまり（街灯の下）・ほか仕上げ ══════════════ */
  P.buildLampPools = function () {
    const w = this; if (!w.lamps.length) return;
    const c = X.cv(128, 128), g = c.getContext("2d"), gr = g.createRadialGradient(64, 64, 0, 64, 64, 62); gr.addColorStop(0, "rgba(255,220,160,1)"); gr.addColorStop(0.4, "rgba(255,200,130,.45)"); gr.addColorStop(1, "rgba(255,190,120,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    const geo = new T.PlaneGeometry(9, 9); geo.rotateX(-Math.PI / 2);
    const mat = new T.MeshBasicMaterial({ map: X.tex(c), transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -6 });
    const im = new T.InstancedMesh(geo, mat, w.lamps.length), m4 = new T.Matrix4();
    w.lamps.forEach(([x, z], i) => { m4.makeTranslation(x, 0.07, z); im.setMatrixAt(i, m4); });
    im.frustumCulled = false; im.visible = false; w.scene.add(im); w.lampPools = im;
  };
  /* 桟橋など、島の外でも歩ける所 */
  P.onWalkable = function (x, z) {
    for (const q of (this.walkable || [])) { if (q.r) { if (Math.hypot(x - q.cx, z - q.cz) < q.r) return true; } else { const dx = x - q.cx, dz = z - q.cz, a = dx * Math.cos(q.ang) - dz * Math.sin(q.ang), b = dx * Math.sin(q.ang) + dz * Math.cos(q.ang); if (Math.abs(a) < q.hw && Math.abs(b) < q.hl) return true; } }
    return false;
  };
  /* 島の外へは出ない（world.resolve のはじめ） */
  P.keepOnIsland = function (p) {
    const d = coastDist(p.x, p.z);
    if (d > 8) { p._ok = [p.x, p.z]; p._pier = false; return; }
    if (this.onWalkable(p.x, p.z)) { p._ok = [p.x, p.z]; p._pier = true; return; }
    if (p._pier && p._ok) { p.x = p._ok[0]; p.z = p._ok[1]; return; }
    const u = (p.x - ISL.cx) / ISL.rx, v = (p.z - ISL.cz) / ISL.rz, a = Math.atan2(v, u), R = edgeR(a) - 8 / ((ISL.rx + ISL.rz) / 2);
    p.x = ISL.cx + Math.cos(a) * R * ISL.rx; p.z = ISL.cz + Math.sin(a) * R * ISL.rz;
  };
  P.areaName = function (x, z) { let best = null; for (const a of AREAS) if (x >= a.x0 && x <= a.x1 && z >= a.z0 && z <= a.z1) { if (!best || (a.x1 - a.x0) * (a.z1 - a.z0) < (best.x1 - best.x0) * (best.z1 - best.z0)) best = a; } return best; };

  window.XPark = { ISL, AREAS, A, islandPt, islandPt0, islandPtM, edgeR, edgeRM, outerK, coastDist, BOUNDS, EXP, SUN, SHX, SHZ, M, smoothPts, ribbon, FLOWER_PAL, MOBILE, TIME, AOU, REFL };
})();
