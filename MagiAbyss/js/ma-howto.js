/* ============================================================
   MagiAbyss — ma-howto.js
   ★★ 2026-10-05 遊び方を「映像」で（ご指定：ルールなどを映像で分かりやすく）
   ・スライドごとに小さなキャンバスでゲームの絵（キャラ・敵・アイコン）を動かして見せる。
   ・はじめて広場に来たとき（序章のあと）に自動で1回。受付・設定・タイトルの「遊び方」からいつでも。
   ・スマホのときはボタンの説明、PC のときはキー（設定の割り当て）の説明にかわる。
   ============================================================ */
(function () {
  "use strict";
  const MA = (window.MA = window.MA || {});
  const D = () => MA.D;
  const S = () => MA.Save.S;
  const TAU = Math.PI * 2;
  const VW = 320, VH = 168;
  const esc = (s) => MA.UI.esc(s);
  const ic = (n, c) => MA.Art.iconHTML(n, c);
  const imgCache = {};
  function icImg(n, col) { const k = n + "|" + (col || ""); if (!imgCache[k]) { const im = new Image(); im.src = MA.Art.icon(n, col); imgCache[k] = im; } return imgCache[k]; }
  function touch() { return document.body.classList.contains("touchdev"); }
  function key(a) { return MA.Input.keyLabel(a); }
  function cid() { const s = S(); return MA.Save.owned(s.sel) ? s.sel : (D().CHAR_ORDER.find((id) => MA.Save.owned(id)) || "takina"); }

  /* ── 描く道具 ── */
  let g = null;
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const T = (txt, x, y, col, size, align) => { g.font = "700 " + (size || 10) + "px 'DotGothic16', monospace"; g.textAlign = align || "center"; g.textBaseline = "middle"; g.fillStyle = "#0a0716"; [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dx, dy]) => g.fillText(txt, Math.round(x + dx), Math.round(y + dy))); g.fillStyle = col || "#fff"; g.fillText(txt, Math.round(x), Math.round(y)); };
  const spr = (f, x, y, flip, k) => { k = k || 1; const w = f.width * k, h = f.height * k; if (flip) { g.save(); g.translate(Math.round(x), 0); g.scale(-1, 1); g.drawImage(f, -Math.round(w / 2), Math.round(y - h), w, h); g.restore(); } else g.drawImage(f, Math.round(x - w / 2), Math.round(y - h), w, h); };
  const icon = (n, x, y, s, col) => { const im = icImg(n, col); if (im.complete) g.drawImage(im, Math.round(x - s / 2), Math.round(y - s / 2), s, s); };
  const shadow = (x, y, w) => { g.fillStyle = "rgba(0,0,0,.28)"; g.beginPath(); g.ellipse(Math.round(x), Math.round(y), w, w * 0.4, 0, 0, TAU); g.fill(); };
  function floor(biome) {
    const Tl = MA.Art.tiles(biome || "forest");
    for (let y = 0; y < VH; y += 16) for (let x = 0; x < VW; x += 16) g.drawImage(Tl.floor[((x >> 4) * 7 + (y >> 4) * 13) % 4], x, y);
  }
  function hero(x, y, mode, t, flip) {
    const sp = MA.Pix.charSprite(cid());
    let f = sp.idle[Math.floor(t * 2) % 2];
    if (mode === "side" && sp.side) f = sp.side[Math.floor(t * 10) % 4];
    else if (mode === "walk") f = sp.walk[Math.floor(t * 9) % 4];
    else if (mode === "atk") f = Math.floor(t * 8) % 2 ? sp.atk : sp.idle[0];
    shadow(x, y + 2, 7);
    spr(f, x, y + 4, flip);
  }
  /* 敵の id（ENEMIES）でも、絵の名前（ART）でもよい */
  function enemy(key2, x, y, t, col, k) { const e = D().ENEMIES[key2]; const s = MA.Art.sprite(e ? e.art : key2, e ? e.col : col); const f = s.frames[Math.floor(t * 3) % s.frames.length]; shadow(x, y + 1, f.width * 0.35 * (k || 1)); spr(f, x, y + 2, false, k); }
  function bar(x, y, w, h, v, c1, bgc) { R(x - 1, y - 1, w + 2, h + 2, "#0a0716"); R(x, y, w, h, bgc || "#2a1630"); R(x, y, w * Math.max(0, Math.min(1, v)), h, c1); }
  function keycap(x, y, txt, on) { g.font = "700 9px 'DotGothic16', monospace"; const w = Math.max(14, g.measureText(txt).width + 8); R(x - w / 2, y - 7, w, 14, on ? "#ffd84a" : "#e8d8ff"); R(x - w / 2 + 1, y - 6, w - 2, 12, on ? "#5a3a08" : "#1a1030"); T(txt, x, y + 0.5, on ? "#ffe86a" : "#fff", 9); }
  function tbtn(x, y, r, iconN, on, col) { g.fillStyle = on ? (col || "#ff8fd0") : "#3a2a6a"; g.beginPath(); g.arc(Math.round(x), Math.round(y), r + 2, 0, TAU); g.fill(); g.fillStyle = "#241a50"; g.beginPath(); g.arc(Math.round(x), Math.round(y), r, 0, TAU); g.fill(); icon(iconN, x, y, r * 1.1); }
  const ease = (t) => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);

  /* ══ スライド ══ */
  const SLIDES = [
    {
      t: "移動と通常攻撃",
      d: () => (touch() ? "画面の<b>左半分</b>（ボタンのないところ）を指でさわると<b>スティック</b>が出ます。動かした方向へ歩きます。"
        : "<b>" + key("up") + key("left") + key("down") + key("right") + "</b>（または矢印キー）で歩きます。") +
        "<br>通常攻撃は<b>自動で</b>、<b>向いている方向へいつも</b>出ます（前に敵がいなくても出ます）。",
      draw(t) {
        floor("forest");
        const L = 4.0, k = (t % L) / L;
        const dir = k < 0.5 ? 1 : -1;
        const px = k < 0.5 ? 70 + k * 2 * 180 : 250 - (k - 0.5) * 2 * 180;
        hero(px, 112, "side", t, dir < 0);
        /* 弾（向いている方向へ） */
        for (let i = 0; i < 5; i++) { const bt = ((t * 2.6 + i / 5) % 1); const bx = px + dir * (12 + bt * 140); g.globalAlpha = 1 - bt; R(bx - 3, 104, 6, 3, "#7fd8ff"); R(bx - 1, 105, 2, 1, "#ffffff"); g.globalAlpha = 1; }
        /* 敵（弾が当たると数字） */
        const ex = dir > 0 ? 286 : 34;
        enemy("slime", ex, 114, t);
        if (Math.floor(t * 2.6) % 2) T(String(12 + Math.floor((t * 7) % 9)), ex, 92 - (t * 30 % 10), "#ffffff", 10);
        if (touch()) { g.globalAlpha = 0.75; g.strokeStyle = "#b08aff"; g.lineWidth = 2; g.beginPath(); g.arc(44, 140, 18, 0, TAU); g.stroke(); R(44 - 8 + dir * 8, 132, 16, 16, "#c9a8ff"); g.globalAlpha = 1; T("スティック", 44, 162, "#e8d8ff", 9); }
        else { keycap(28, 136, key("up")); keycap(14, 152, key("left")); keycap(28, 152, key("down"), dir < 0); keycap(42, 152, key("right"), dir > 0); }
        T("攻撃は いつも向いている方向へ", 160, 20, "#ffe86a", 11);
      },
    },
    {
      t: "経験値とレベルアップ",
      d: () => "敵を倒すと<b>経験値の結晶</b>が落ちます。近づくと吸いよせられます。<br>上の<b>経験値のバー</b>がいっぱいになると<b>LEVEL UP</b>。出てきたカードから<b>1つ</b>えらんで強くなります（武器・魔法・能力）。",
      draw(t) {
        floor("forest");
        const L = 4.2, k = (t % L) / L;
        hero(160, 118, "idle", t);
        /* 敵が倒れて結晶 → 吸いよせ */
        if (k < 0.25) { enemy("slime", 230, 118, t); if (k > 0.15) T("撃破！", 230, 92, "#ff8fd0", 10); }
        const gx = k < 0.25 ? 230 : 230 - ease((k - 0.25) / 0.2) * 70, gy = 112 - Math.sin(Math.min(1, (k - 0.25) / 0.2) * Math.PI) * 14;
        if (k > 0.2 && k < 0.46) { g.fillStyle = "#5ad8ff"; g.beginPath(); g.moveTo(gx, gy - 4); g.lineTo(gx + 3, gy); g.lineTo(gx, gy + 4); g.lineTo(gx - 3, gy); g.closePath(); g.fill(); }
        /* 経験値のバー */
        const xp = k < 0.46 ? 0.62 : Math.min(1, 0.62 + (k - 0.46) * 6);
        bar(20, 10, 280, 6, xp, "#39e0c8", "#120a1c");
        R(130, 16, 60, 14, "#1a0f24"); T("LEVEL " + (xp >= 1 ? 6 : 5), 160, 23, xp >= 1 ? "#ffe86a" : "#bff8ee", 10);
        if (xp >= 1) {
          T("LEVEL UP!", 160, 50, "#ffffff", 16);
          const cards = [["sword", "#ff8a6a", "魔導剣"], ["fireball", "#ff6a3d", "炎の魔法"], ["crit", "#ffd84a", "会心率"]];
          cards.forEach(([n, c, nm], i) => { const a = ease((k - 0.6) * 5 - i * 0.3); if (a <= 0) return; const cx = 80 + i * 80, cy = 112 - a * 6; g.globalAlpha = a; R(cx - 30, cy - 34, 60, 64, "#120a26"); R(cx - 28, cy - 32, 56, 60, "#241640"); R(cx - 30, cy - 34, 60, 2, c); icon(n, cx, cy - 10, 26); T(nm, cx, cy + 16, "#fff", 9); g.globalAlpha = 1; if (i === 1 && k > 0.9) { g.strokeStyle = "#ffd84a"; g.lineWidth = 2; g.strokeRect(cx - 31, cy - 35, 62, 66); } });
        }
      },
    },
    {
      t: "スキル・技・必殺技",
      d: () => {
        const k = touch() ? ["右下の<b>スキル</b>", "<b>技</b>", "<b>必殺技</b>"] : ["<b>" + key("skill") + "</b> スキル", "<b>" + key("burst") + "</b> 技", "<b>" + key("ult") + "</b> 必殺技"];
        return k[0] + "・" + k[1] + "は <b>MP</b>（青いバー）を使います。ボタンのまわりの<b>輪</b>がたまると使えます。<br>" + k[2] + "は<b>必殺技ゲージ</b>（10目盛り）が100%で発動。敵を倒す・ダメージを与えるとたまり、いっぱいで <b>READY!</b>";
      },
      draw(t) {
        floor("ice");
        const L = 6, k = (t % L) / L;
        hero(120, 112, k > 0.3 && k < 0.42 ? "atk" : "idle", t);
        [[200, 104], [236, 118], [262, 98], [222, 132]].forEach(([x, y], i) => enemy(i % 2 ? "iceSlime" : "frostWisp", x, y, t + i));
        const mp = k < 0.3 ? 0.35 + k * 2.2 : k < 0.42 ? 0.35 : 0.35 + (k - 0.42) * 0.4;
        const ug = Math.min(1, k < 0.55 ? 0.3 + k : 1);
        /* MP とゲージ */
        R(16, 8, 120, 34, "rgba(10,6,24,.8)");
        T("MP", 28, 16, "#9ad8ff", 9); bar(40, 13, 90, 6, mp, "#5a9aff");
        T("必殺", 28, 32, "#ffb8de", 9);
        for (let i = 0; i < 10; i++) { const f = Math.max(0, Math.min(1, ug * 10 - i)); R(40 + i * 9, 28, 8, 7, "#2a1630"); R(40 + i * 9, 28, 8 * f, 7, ug >= 1 ? "#ffd84a" : "#ff6aa8"); }
        /* ボタン */
        const bx = 268, by = 150;
        const skReady = mp > 0.62 && k < 0.42;
        tbtn(bx - 70, by, 13, "sk_ripple", skReady, "#5ab8ff"); T(touch() ? "スキル" : key("skill"), bx - 70, by - 20, "#bfe8ff", 9);
        tbtn(bx - 36, by, 13, "flash", mp > 0.6, "#7fd0ff"); T(touch() ? "技" : key("burst"), bx - 36, by - 20, "#bfe8ff", 9);
        tbtn(bx, by, 15, "ultc", ug >= 1, "#ff6aa8"); T(ug >= 1 ? "READY!" : (touch() ? "必殺技" : key("ult")), bx, by - 22, ug >= 1 ? "#ffd84a" : "#ffb8de", 9);
        /* 発動の演出 */
        if (k > 0.3 && k < 0.42) { const r = (k - 0.3) / 0.12; g.strokeStyle = "rgba(127,208,255," + (1 - r) + ")"; g.lineWidth = 3; g.beginPath(); g.ellipse(120, 112, 20 + r * 70, (20 + r * 70) * 0.5, 0, 0, TAU); g.stroke(); T("スキル！", 120, 70, "#bfe8ff", 11); }
        if (k > 0.72) { const r = (k - 0.72) / 0.28; g.globalAlpha = Math.max(0, 0.5 - r * 0.5); R(0, 0, VW, VH, "#ffe8f4"); g.globalAlpha = 1; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + r * 3; R(160 + Math.cos(a) * r * 140 - 3, 90 + Math.sin(a) * r * 70 - 3, 6, 6, i % 2 ? "#ff6aa8" : "#ffffff"); } T("必殺技！", 160, 60, "#ffffff", 16); }
      },
    },
    {
      t: "回避（ダッシュ）",
      d: () => (touch() ? "<b>回避</b>ボタン" : "<b>" + key("dash") + "</b>") + "で、向いている方向へすばやく移動します。<b>移動中は無敵</b>なので、敵の弾や突進をすりぬけられます。<br>回数（×2 など）はしばらくすると回復します。",
      draw(t) {
        floor("lava");
        const L = 3.2, k = (t % L) / L;
        const dashing = k > 0.4 && k < 0.55;
        const px = k < 0.4 ? 90 : k < 0.55 ? 90 + (k - 0.4) / 0.15 * 90 : 180;
        if (dashing) { g.globalAlpha = 0.35; hero(px - 18, 112, "side", t); hero(px - 36, 112, "side", t); g.globalAlpha = 1; }
        hero(px, 112, dashing ? "side" : "idle", t);
        /* 敵の弾（右から） */
        const bx = 300 - k * 260;
        if (bx > 20) { g.fillStyle = "#ff6a2a"; g.beginPath(); g.arc(Math.round(bx), 104, 6, 0, TAU); g.fill(); g.fillStyle = "#ffe86a"; g.beginPath(); g.arc(Math.round(bx), 104, 3, 0, TAU); g.fill(); }
        enemy("emberImp", 296, 114, t);
        if (dashing) T("無敵！", px, 76, "#bfe8ff", 12);
        if (k > 0.55 && k < 0.8) T("すりぬけた！", 180, 76, "#ffe86a", 11);
        if (touch()) { tbtn(286, 150, 12, "dash", dashing, "#e8f4ff"); T("回避", 286, 132, "#fff", 9); } else keycap(286, 148, key("dash"), dashing);
      },
    },
    {
      t: "属性の相性（XEVARION と同じ）",
      d: () => "属性は<b>火・木・水・光・闇</b>の5つ。<b>火→木→水→火</b>、<b>光⇄闇</b>の向きで<b>有利</b>（ダメージ ×1.25）。逆は<b>不利</b>（×0.75）、ほかは<b>同等</b>。<br>敵からのダメージも同じ相性で変わります。地図で敵の属性を見て、キャラをえらびましょう。",
      draw(t) {
        R(0, 0, VW, VH, "#120a24");
        const cx = 110, cy = 88, r = 50;
        const pos = { fire: -90, wood: 30, water: 150 };
        const P2 = (el) => [cx + Math.cos(pos[el] * Math.PI / 180) * r, cy + Math.sin(pos[el] * Math.PI / 180) * r];
        const arrow = (a, b, col, ph) => { const [x1, y1] = P2(a), [x2, y2] = P2(b); const kk = (t * 0.8 + ph) % 1; g.strokeStyle = col; g.lineWidth = 2; g.setLineDash([4, 3]); g.lineDashOffset = -t * 20; g.beginPath(); g.moveTo(x1 + (x2 - x1) * 0.22, y1 + (y2 - y1) * 0.22); g.lineTo(x1 + (x2 - x1) * 0.78, y1 + (y2 - y1) * 0.78); g.stroke(); g.setLineDash([]); const mx = x1 + (x2 - x1) * (0.22 + kk * 0.56), my = y1 + (y2 - y1) * (0.22 + kk * 0.56); R(mx - 2, my - 2, 4, 4, "#ffffff"); };
        arrow("fire", "wood", "#ff5d47", 0); arrow("wood", "water", "#2fbf71", 0.33); arrow("water", "fire", "#38a6ff", 0.66);
        Object.keys(pos).forEach((el) => { const [x, y] = P2(el); g.fillStyle = "#1a1030"; g.beginPath(); g.arc(x, y, 15, 0, TAU); g.fill(); icon("el_" + el, x, y, 20); T(D().ELEM[el].nm, x, y + 22, D().ELEM[el].c, 10); });
        /* 光⇄闇 */
        icon("el_light", 238, 60, 20); icon("el_dark", 288, 60, 20); T("光", 238, 82, "#f0b429", 10); T("闇", 288, 82, "#a86bff", 10);
        const kk = (t * 0.9) % 1; R(250 + kk * 26, 58, 3, 3, "#fff"); R(276 - kk * 26, 64, 3, 3, "#fff");
        T("⇄ たがいに有利", 263, 100, "#e8d8ff", 9);
        T("有利 ×1.25", 263, 124, "#7dffb0", 12); T("不利 ×0.75", 263, 142, "#ff8a9a", 12);
        T("→ が有利な向き", cx, 160, "#bfa8ff", 9);
      },
    },
    {
      t: "鍵を集めてボスへ",
      d: () => "迷宮のどこかにある<b>鍵を3つ</b>（中ボス・試練の魔法陣・宝物庫・祭壇など）集めると、<b>ボスの扉</b>が開きます。<br>ボスのまわりのギミックを全部こわすと <b>BREAK</b>（6秒止まってダメージ2倍）。ボスを倒して出口からクリア！",
      draw(t) {
        floor("library");
        const L = 5, k = (t % L) / L;
        const n = Math.min(3, Math.floor(k * 5));
        R(90, 10, 140, 26, "rgba(10,6,24,.82)");
        for (let i = 0; i < 3; i++) { g.globalAlpha = i < n ? 1 : 0.25; icon("key", 120 + i * 40, 23, 20); g.globalAlpha = 1; }
        const open = n >= 3;
        /* 扉 */
        R(220, 60, 60, 70, "#2a1a3a"); R(226, 66, 48, 64, open ? "#0a0716" : "#5a2a7a");
        if (!open) { R(246, 90, 8, 10, "#ffd84a"); } else { g.globalAlpha = 0.4 + 0.3 * Math.sin(t * 6); R(226, 66, 48, 64, "#a874ff"); g.globalAlpha = 1; enemy("bTree", 250, 132, t, null, 0.5); }
        hero(open ? 170 + Math.min(1, (k - 0.6) * 4) * 20 : 120 + Math.sin(t * 2) * 20, 130, open ? "side" : "walk", t);
        T(open ? "ボスの扉が開いた！" : "鍵 " + n + "/3", 160, 50, open ? "#ff8fd0" : "#fff", 11);
      },
    },
    {
      t: "宝箱と装備",
      d: () => "<b>宝箱</b>に近づいて調べると、装備・ゴールド・アイテムが手に入ります。<b>開けた宝箱は消えます</b>。<br>装備は6か所（武器・防具・指輪・護符・靴・魔導具）。<b>倉庫</b>で付けかえ、<b>鍛冶屋</b>で強化できます。",
      draw(t) {
        floor("forest");
        const L = 4, k = (t % L) / L;
        hero(110 + Math.min(1, k * 3) * 40, 120, k < 0.33 ? "side" : "idle", t);
        if (k < 0.75) {
          const open = k > 0.4;
          g.globalAlpha = k > 0.62 ? 1 - (k - 0.62) / 0.13 : 1;
          R(196, 100, 30, 22, "#a0682a"); R(196, 100, 30, 3, "#e0b040"); R(209, 106, 4, 6, "#e0b040");
          if (!open) R(194, 92, 34, 10, "#c88a3a"); else R(194, 80, 34, 8, "#c88a3a");
          g.globalAlpha = 1;
        } else T("宝箱は消えた", 211, 110, "#c8c8d8", 9);
        if (k > 0.4) { const a = Math.min(1, (k - 0.4) * 4); icon("armor", 211, 92 - a * 30, 20); icon("ring", 190, 96 - a * 20, 16, "#ff8fd0"); icon("gold", 232, 96 - a * 22, 16); if (a >= 1) T("SR 装備を手に入れた！", 211, 40, "#c27bff", 11); }
      },
    },
    {
      t: "クリア時間のミッションとハード",
      d: () => "それぞれの迷宮に<b>クリア時間のミッション</b>（3段）があり、早くクリアするほど <b>XEVARION のジェム</b>がもらえます（1回だけ・アカウント共通）。<br>迷宮をノーマルで1回クリアすると <b>ハード</b>（敵が強い・報酬 ×1.8・装備のレア度アップ）に挑めます。",
      draw(t) {
        R(0, 0, VW, VH, "#140c28");
        const L = 6, k = (t % L) / L;
        const sec = Math.floor(k * 22 * 60);
        T(String(Math.floor(sec / 60)).padStart(2, "0") + ":" + String(sec % 60).padStart(2, "0"), 80, 30, "#ffffff", 18);
        icon("st_time", 40, 30, 18);
        [[20, 3], [14, 5], [10, 8]].forEach(([m, gem], i) => {
          const y = 64 + i * 26;
          const clearAt = 0.45;
          const ok = k > clearAt && 9.9 * 60 <= m * 60;
          R(20, y - 10, 150, 20, ok ? "#1f4a3a" : "#241a40");
          icon("st_time", 32, y, 12); T(m + "分以内", 66, y, "#fff", 10); icon("gem", 120, y, 12); T("×" + gem, 140, y, "#5ad8ff", 10);
          if (ok) T("✓", 160, y, "#7dffb0", 12);
        });
        if (k > 0.45) T("9:54 でクリア！ ジェム +16", 96, 150, "#ffe86a", 10);
        /* ハードのタブ */
        R(200, 40, 50, 20, "#2a5a3a"); T("ノーマル", 225, 50, "#fff", 9);
        R(256, 40, 50, 20, k > 0.6 ? "#a8203a" : "#3a2a4a"); T(k > 0.6 ? "ハード" : "🔒", 281, 50, "#fff", 9);
        if (k > 0.6) { T("敵 HP×1.75 攻撃×1.45", 253, 82, "#ff8a9a", 9); T("報酬 ×1.8", 253, 100, "#ffd84a", 10); enemy("flameKnight", 253, 150, t); }
      },
    },
    {
      t: "使えるキャラ",
      d: () => "MagiAbyss で使えるのは、XEVARION のガチャ <b>Pumpkin Night・Sapphire Breeze・極彩祭・極煌祭・極華祭</b> で手に入るキャラ（" + D().CHAR_ORDER.length + "人）です。<b>持っているキャラだけ</b>で遊べます。<br>キャラごとに<b>スキル・技・必殺技・特性</b>の組み合わせがちがいます（酒場でくわしく見られます）。凸は XEVARION と共通です。",
      draw(t) {
        R(0, 0, VW, VH, "#1a1030");
        [["Pumpkin", "#ff9a4a"], ["Sapphire", "#6fa8ff"], ["極彩祭", "#ff8fd0"], ["極煌祭", "#ffd84a"], ["極華祭", "#7fd0ff"]].forEach(([n, c], i) => { R(10 + i * 61, 14, 56, 18, c); T(n, 38 + i * 61, 23, "#1a0a20", 9); });
        const ids = D().CHAR_ORDER;
        ids.forEach((id, i) => {
          const sp = MA.Pix.charSprite(id);
          const x = ((i * 36 + t * 30) % (VW + 40)) - 20, y = 120 + (i % 2) * 22;
          const own = MA.Save.owned(id);
          if (!own) g.globalAlpha = 0.35;
          spr(sp.side ? sp.side[Math.floor(t * 10 + i) % 4] : sp.walk[0], x, y);
          g.globalAlpha = 1;
        });
        T("持っているキャラ：" + ids.filter((id) => MA.Save.owned(id)).length + "/" + ids.length, 160, 50, "#fff", 10);
      },
    },
  ];

  /* ══ 枠 ══ */
  let cur = 0, raf = 0, t0 = 0, first = false;
  function open(i, isFirst) {
    first = !!isFirst;
    cur = Math.max(0, Math.min(SLIDES.length - 1, i || 0));
    const m = MA.UI.modal('<div class="howto2"><div class="ht-h">' + ic("info") + '<b>遊び方</b><span id="htN"></span></div>' +
      '<div class="ht-stage"><canvas id="htCv" width="' + VW + '" height="' + VH + '"></canvas></div>' +
      '<div class="ht-t" id="htT"></div><p class="ht-d" id="htD"></p>' +
      '<div class="ht-dots" id="htDots">' + SLIDES.map((_, j) => '<button data-a="htGo" data-v="' + j + '" aria-label="' + (j + 1) + '"></button>').join("") + "</div>" +
      '<div class="row c"><button class="btn ghost" data-a="htPrev">' + ic("back") + 'まえへ</button><button class="btn gold" data-a="htNext" id="htNext">つぎへ</button></div></div>', { cls: "htm", wide: true, onClose: done });
    void m;
    show();
    t0 = performance.now();
    cancelAnimationFrame(raf);
    const loop = (now) => {
      const cv = document.getElementById("htCv"); if (!cv) return;
      g = cv.getContext("2d"); g.imageSmoothingEnabled = false;
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
      try { SLIDES[cur].draw((now - t0) / 1000); } catch (e) { /* 絵の失敗で枠を止めない */ }
      g = null;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }
  function show() {
    const s = SLIDES[cur];
    document.getElementById("htT").textContent = (cur + 1) + ". " + s.t;
    document.getElementById("htD").innerHTML = s.d();
    document.getElementById("htN").textContent = (cur + 1) + " / " + SLIDES.length;
    document.querySelectorAll("#htDots button").forEach((b, j) => b.classList.toggle("on", j === cur));
    document.getElementById("htNext").textContent = cur >= SLIDES.length - 1 ? "とじる" : "つぎへ";
    t0 = performance.now();
  }
  function done() {
    cancelAnimationFrame(raf);
    if (!S().tutorial) { S().tutorial = 1; MA.Save.saveSoon(); }
    if (first && MA.Guild && MA.Guild.checkResume) setTimeout(() => MA.Guild.checkResume(), 200);
    first = false;
  }
  const A = MA.UI.ACT;
  A.htNext = () => { if (cur >= SLIDES.length - 1) { MA.UI.closeModal(); return; } cur++; show(); };
  A.htPrev = () => { if (cur > 0) { cur--; show(); } };
  A.htGo = (b) => { cur = +b.dataset.v; show(); };
  MA.Howto = { open, SLIDES };
})();
