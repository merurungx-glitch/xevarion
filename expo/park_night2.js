/* ══════════════════════════════════════════════════════════════════
   NIGHT エリアの拡大（★★ 2026-09-29b ご指定「遊郭や歌舞伎町らしい大きい街並み。昼夜はほかのエリアに連動」）
   ------------------------------------------------------------------
   ・26 YOMA KABUKI TOWN（妖魔歌舞伎町）：x 642..800 / z 482..648
       一番街の赤い大アーチ・両がわに看板だらけのビル（縦の看板・LED・屋上の広告）・さくら通り・
       シネマ広場と「妖魔タワー」（屋上から大きな化け猫の顔がのぞく）・細い路地の飲み屋横丁（ゴールデン横丁）。
   ・27 YOZAKURA YUKAKU（夜桜遊郭）：x 582..765 / z 648..800
       大門・仲の町通り（まん中に夜桜・提灯の列）・紅い格子の2〜3階の茶屋・水路と橋・白い塀・
       突きあたりの五重の大楼「万華楼」。★ 家族で楽しめる内容（茶屋・食事・芝居小屋・占い・着物で記念写真）。
   ・昼は落ち着いた街、夜はネオンと提灯がともる（パーク全体の昼夜と同じ）。
   ══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const T = THREE, X = XTex, P = XWorld.World.prototype, TAU = Math.PI * 2, XP = XPark;
  const R = (seed) => X.rnd(seed);

  /* 看板の文字（オリジナル） */
  const SIGNS = ["居酒屋 妖魔", "ラーメン 夜叉", "カラオケ 月光", "ゲーム 百鬼", "焼肉 火車", "寿司 河童", "クレープ 雪女", "占い 九尾", "BAR 天狗", "CAFE 猫又", "プリクラ ろくろ首", "たこ焼き 一反木綿", "甘味 座敷わらし", "餃子 鬼火", "もんじゃ 化け狸", "お好み焼き 狐火", "ボウリング 大入道", "焼き鳥 かまいたち", "うどん 雨女", "中華 鵺"];
  const VSIGN = ["居酒屋", "カラオケ", "ラーメン", "焼肉", "ゲーム", "寿司", "占い", "甘味", "焼き鳥", "餃子", "喫茶", "中華"];
  const GLOW = ["#ff4fb0", "#4ff0ff", "#ffe04a", "#a86aff", "#4fff9a", "#ff8a3a", "#ff3a4a"];
  const FAC = ["neonA", "neonB", "neonC", "gDark", "brick", "gPurple", "techG", "neonB"];

  /* 看板だらけのビル：P.bld（1階は入れる）＋縦の看板・階ごとの帯・屋上の広告塔・室外機 */
  function kabukiBldg(w, x, z, bw, bd, h, ry, i, ins) {
    const c = Math.cos(ry), s = Math.sin(ry), L = (a, b) => [x + a * c + b * s, z - a * s + b * c], r = R(i * 97 + 13);
    const name = SIGNS[i % SIGNS.length], glow = GLOW[i % GLOW.length];
    w.bld(x, z, bw, bd, h, { key: FAC[i % FAC.length], shop: ["shopA", "shopB", "shopC", "shopD"][i % 4], roof: "flat", crown: ["neonPink", "neonCyan", "neonYellow", "neonPurple"][i % 4], ry, sign: { text: name, bg: "#10081e", glow, w: Math.min(bw * 0.8, 12), h: 1.4, y: 5.2 }, inside: ins });
    /* 縦の看板（前の左右のかど） */
    [-1, 1].forEach((k, j) => { if (r() < 0.25 && j) return; const vt = VSIGN[(i + j * 5) % VSIGN.length], hh = Math.min(h - 7, 1.1 * vt.length + 1.4), [px, pz] = L(k * (bw / 2 - 0.6), bd / 2 + 0.7); w.sign(vt.split("").join("\n"), { bg: ["#b8262a", "#1a0a3a", "#0a2a5a", "#2a0a4a"][(i + j) % 4], color: "#fff", glow: GLOW[(i + j * 3) % GLOW.length], border: "#f2c04a", px: 256, both: true }, 1.3, hh, px, 6.5 + hh / 2, pz, ry + Math.PI / 2); w.detail(() => w.geo("darkMetal", new T.BoxGeometry(0.1, 0.1, 0.8).rotateY(ry), ...[L(k * (bw / 2 - 0.6), bd / 2 + 0.3)].map(([a, b]) => [a, 7, b])[0])); });
    /* 階ごとの看板（横長）・LED の帯 */
    for (let f = 1; f < Math.floor(h / 3.6) - 1; f++) { if (r() < 0.45) continue; const [px, pz] = L((r() - 0.5) * bw * 0.3, bd / 2 + 0.12); w.sign(SIGNS[(i * 3 + f) % SIGNS.length], { bg: ["#1a0a2a", "#0a1a3a", "#2a0a0a", "#0a2a1a"][f % 4], color: "#fff", glow: GLOW[(i + f) % GLOW.length], px: 512 }, Math.min(bw * 0.7, 9), 1.1, px, 6 + f * 3.6, pz, ry); }
    /* 屋上の広告塔 */
    if (h > 16 && r() < 0.7) { const [px, pz] = L(0, 0); w.detail(() => { [-1, 1].forEach((k) => { const [qx, qz] = L(k * bw * 0.3, -bd * 0.1); w.geo("darkMetal", new T.BoxGeometry(0.3, 5, 0.3), qx, h + 2.5, qz); }); }); const [bx, bz] = L(0, -bd * 0.1 + 0.2); w.sign(SIGNS[(i + 7) % SIGNS.length], { grad: [["#ff4fb0", "#3a0a5a"], ["#1ab8ff", "#0a1a5a"], ["#ffb020", "#6a1a0a"], ["#4fff9a", "#0a3a3a"]][i % 4], color: "#fff", px: 1024, both: true }, bw * 0.7, 4, bx, h + 4.2, bz, ry); }
    /* 室外機・給水塔 */
    w.detail(() => { for (let k = 0; k < 3; k++) { const [px, pz] = L((r() - 0.5) * bw * 0.6, -bd * 0.35 + r() * 2); w.box("rMetal", px, h + 0.3, pz, 1.4, 0.9, 1, { ry }); } if (r() < 0.4) { const [px, pz] = L(bw * 0.25, bd * 0.2); w.geo("rMetal", new T.CylinderGeometry(1.2, 1.2, 2.2, 12), px, h + 2.6, pz); w.geo("darkMetal", new T.CylinderGeometry(0.1, 0.1, 1.5, 5), px, h + 0.8, pz); } });
    /* 提灯（入口の上） */
    const [lx, lz] = L(0, bd / 2 + 1.2); w.detail(() => w.lantern(lx, 3.6, lz, 0.55, ["lanR", "lanR2", "lanY", "lanW"][i % 4], ry));
  }
  /* 飲み屋横丁の小さな2階建て（細い路地） */
  function alleyShack(w, x, z, ry, i) {
    const bw = 5, bd = 5, h = 6.4 + (i % 3) * 0.6, c = Math.cos(ry), s = Math.sin(ry), L = (a, b) => [x + a * c + b * s, z - a * s + b * c];
    w.box(["woodDark2", "brick", "yRed", "woodDark"][i % 4], x, 0, z, bw, h, bd, { ry, collide: true });
    const [px, pz] = L(0, bd / 2 + 0.06); w.sign(["呑み処", "やきとり", "おでん", "BAR", "スナック星", "もつ煮", "立ち飲み", "喫茶"][i % 8], { bg: "#1a0a0a", color: "#ffe7a0", glow: "#ff8a3a", px: 256 }, 2.6, 0.7, px, 2.9, pz, ry);
    const [nx, nz] = L(0, bd / 2 + 0.07); w.detail(() => { w.geo(["norK", "norB", "norP", "norO"][i % 4], new T.PlaneGeometry(1.8, 0.9).rotateY(ry), nx, 2.0, nz); w.lantern(...L(bd * 0.3, bd / 2 + 0.5).slice(0, 1), 2.4, L(bd * 0.3, bd / 2 + 0.5)[1], 0.35, "lanR", ry); w.box("woodDark2", x, h, z, bw + 0.5, 0.3, bd + 0.5, { ry }); });
    w.caster(x, z, bw, bd, h, ry);
  }
  /* 紅い格子の茶屋（遊郭の家）：yomaShop（1階は入れる）＋格子・2階の縁側と手すり・障子の明かり */
  function yukakuHouse(w, x, z, bw, bd, h, ry, i, ins) {
    const c = Math.cos(ry), s = Math.sin(ry), L = (a, b) => [x + a * c + b * s, z - a * s + b * c];
    w.yomaShop(x, z, bw, bd, h, { ry, key: i % 3 === 2 ? "woodDark" : "woodRed", shop: "shopA", roof: "kawara", roofKey: i % 2 ? "kwK" : "kwR", rh: 3.2, eyes: i % 5 === 0 ? { iris: "irisE", look: 0.2 } : false, sign: ["茶屋 夜桜", "料亭 花月", "甘味 うさぎ屋", "芝居小屋 夜桜座", "占い 月の間", "着物の写真館", "三味線の間", "うどん 桜", "団子 やなぎ", "茶屋 ほたる", "料亭 紅葉", "かんざし屋"][i % 12], signColor: "#3a0a10", glow: "#ffb04a", noren: ["norK", "norP", "norB", "norO"][i % 4], lanterns: 2, inside: ins });
    const shopH = Math.min(4.2, h * 0.55);
    /* 2階：格子（縦の細い棒）・障子（光る）・縁側と紅い手すり */
    w.detail(() => {
      const [gx, gz] = L(0, bd / 2 + 0.05); w.geo("lampGlow", new T.BoxGeometry(bw - 1.6, h - shopH - 1.8, 0.04).rotateY(ry), gx, shopH + 0.9 + (h - shopH - 1.8) / 2, gz);
      for (let a = -bw / 2 + 0.9; a <= bw / 2 - 0.9; a += 0.28) { const [px, pz] = L(a, bd / 2 + 0.12); w.geo("woodRed", new T.BoxGeometry(0.07, h - shopH - 1.2, 0.07), px, shopH + 0.6 + (h - shopH - 1.2) / 2, pz); }
      const [bx, bz] = L(0, bd / 2 + 0.75); w.geo("woodDark2", new T.BoxGeometry(bw, 0.14, 1.4).rotateY(ry), bx, shopH + 0.55, bz);
      const [rx, rz] = L(0, bd / 2 + 1.42); w.geo("railRed", new T.BoxGeometry(bw, 0.08, 0.08).rotateY(ry), rx, shopH + 1.55, rz); for (let a = -bw / 2 + 0.2; a <= bw / 2; a += 0.9) { const [px, pz] = L(a, bd / 2 + 1.42); w.geo("railRed", new T.BoxGeometry(0.07, 1.0, 0.07), px, shopH + 1.05, pz); }
      for (let k = 0; k < 3; k++) { const [px, pz] = L(-bw / 2 + 1.2 + k * (bw - 2.4) / 2, bd / 2 + 1.1); w.lantern(px, shopH + 2.2, pz, 0.45, ["lanR", "lanW", "lanR2"][k], ry); }
      /* 1階の格子戸 */
      for (let a = -bw / 2 + 0.4; a <= bw / 2 - 0.4; a += 0.24) { if (Math.abs(a) < 1.6) continue; const [px, pz] = L(a, bd / 2 + 0.1); w.geo("woodRed", new T.BoxGeometry(0.06, shopH - 0.9, 0.06), px, (shopH - 0.9) / 2 + 0.2, pz); }
    });
  }

  P.buildKabuki = function () {
    const w = this;
    w.areaZone("kabuki");
    w.places.push(["26 KABUKI TOWN（一番街）", 715, 496, Math.PI]);
    const X0 = 715, SW = 12;
    w.rect("darkGround", 642, 482, 800, 648, 0.012);
    w.rect("asphaltCity", X0 - SW / 2, 486, X0 + SW / 2, 646, 0.02); w.rect("asphaltCity", 645, 560, 792, 570, 0.02);
    [[X0 - SW / 2 - 1.8, X0 - SW / 2], [X0 + SW / 2, X0 + SW / 2 + 1.8]].forEach(([a, b]) => w.rect("paver", a, 486, b, 646, 0.03));
    /* 一番街の大アーチ（北の入口・南） */
    [[X0, 490, 0], [X0, 642, Math.PI]].forEach(([x, z, ry], k) => {
      [-1, 1].forEach((s) => { w.box("pRed", x + s * (SW / 2 + 1.2), 0, z, 1.0, 11, 1.0, { collide: true }); w.box("goldOrn", x + s * (SW / 2 + 1.2), 11, z, 1.3, 0.4, 1.3); });
      w.box("pRed", x, 10.2, z, SW + 3.8, 0.6, 1.2); const sg = new T.TorusGeometry(SW / 2 + 1.2, 0.3, 6, 28, Math.PI); w.geo("neonPink", sg, x, 10.2, z);
      w.sign(k ? "妖魔歌舞伎町 一番街" : "妖魔歌舞伎町 一番街", { bg: "#b8102a", color: "#fff", glow: "#ffe04a", border: "#ffd84a", px: 1024, both: true }, SW + 2, 2.2, x, 12.6, z, ry);
      for (let i = 0; i < 8; i++) w.detail(() => w.geo(["lampGlow", "neonYellow"][i % 2], new T.SphereGeometry(0.2, 8, 6), x - SW / 2 - 0.8 + i * (SW + 1.6) / 7, 11.35, z + 0.65));
      w.caster(x, z, SW + 4, 1.4, 14); w.casters[w.casters.length - 1].gate = true;          /* ★★ 2026-09-30b くぐるアーチ（道の計画・入口の判定では建物あつかいしない） */
    });
    /* 一番街の両がわのビル */
    let n = 0;
    const row = (xc, ry, z0, z1, skip) => { let z = z0; while (z < z1) { const bw = 14 + ((n * 7) % 3) * 3, h = 12 + ((n * 11) % 6) * 4.5, zc = z + bw / 2; if (zc + bw / 2 > z1) break; if (!skip || !skip(zc, bw)) { const ins = [{ type: "food", name: SIGNS[n % SIGNS.length], menu: ["ramen", "takoyaki", "sushi", "diner", "onigiri"][n % 5], light: "neon" }, { type: "karaoke", name: SIGNS[n % SIGNS.length], h: 5 }, { type: "arcade", name: SIGNS[n % SIGNS.length], h: 5 }, { type: "cafe", name: SIGNS[n % SIGNS.length], menu: "crepe", light: "neon" }, { type: "shop", name: "雑貨 " + SIGNS[n % SIGNS.length], light: "neon" }][n % 5]; kabukiBldg(w, xc, zc, bw, 16, h, ry, n, ins); } n++; z += bw + 1.2; } };
    row(X0 - SW / 2 - 1.8 - 8.2, Math.PI / 2, 494, 558);
    row(X0 - SW / 2 - 1.8 - 8.2, Math.PI / 2, 626, 646);
    row(X0 + SW / 2 + 1.8 + 8.2, -Math.PI / 2, 494, 558);
    row(X0 + SW / 2 + 1.8 + 8.2, -Math.PI / 2, 572, 646, (zc, bw) => zc > 596 && zc < 632);
    /* さくら通り（東西）の北と南のビル */
    for (let i = 0; i < 2; i++) { const xc = 652 + i * 16.5; kabukiBldg(w, xc, 551, 15, 14, 12 + i * 4, Math.PI, 40 + i, { type: ["food", "cafe", "shop"][i], name: SIGNS[(40 + i) % SIGNS.length], menu: ["diner", "cake", null][i], light: "neon" }); kabukiBldg(w, xc, 580, 15, 14, 14 + i * 3, 0, 50 + i, i === 1 ? { type: "karaoke", name: "カラオケ 月光 本店", h: 5 } : { type: "food", name: SIGNS[(50 + i) % SIGNS.length], menu: ["takoyaki", "ramen", "onigiri"][i], light: "neon" }); }
    /* シネマ広場と妖魔タワー（屋上から化け猫の顔） */
    w.rect("plazaGray", 678, 590, X0 - SW / 2 - 1.8, 626, 0.025);
    { const x = 664, z = 608, bw = 26, bd = 30, h = 44; w.bld(x, z, bd, bw, h, { key: "gDark", roof: "flat", crown: "neonPink", ry: Math.PI / 2, sign: { text: "YOMA CINEMA", bg: "#10061e", glow: "#ff4fb0", w: 16, h: 2.4, y: 8 }, inside: { type: "theater", name: "妖魔シネマ", h: 10, door: 5, video: "yomacinema", screenTitle: "YOMA CINEMA" } });
      w.bigScreen(x + bw / 2 + 0.5, 22, z, Math.PI / 2, 20, 11, "YOMA CINEMA", ["NOW SHOWING", "妖怪大戦争（オリジナル）", "LATE SHOW 24:00", "KABUKI TOWN"], ["#2a0a4a", "#0a1a4a"]);
      bakeneko(w, x - 2, h, z, 1.0); }
    w.bigScreen(X0 + SW / 2 + 1.8 + 16.4, 18, 614, -Math.PI / 2, 16, 9, "KABUKI TOWN", ["妖魔歌舞伎町へようこそ", "今夜のおすすめ：ラーメン 夜叉", "カラオケ 月光 本店", "夜桜遊郭 はこちら →"], ["#3a0a1a", "#0a0a3a"]);
    w.plazaCrowd(680, 608, 18, 1.8);
    /* 飲み屋横丁（北東の細い路地） */
    let k2 = 0; for (let gx = 0; gx < 4; gx++) for (let gz = 0; gz < 5; gz++) { const x = 752 + gx * 9.5, z = 500 + gz * 9.2; if (XPark.coastDist(x, z) < 26) continue; alleyShack(w, x, z, gx % 2 ? -Math.PI / 2 : Math.PI / 2, k2++); }
    for (let gz = 0; gz < 5; gz++) w.lanternString(747, 496 + gz * 9.2, 790, 496 + gz * 9.2, 5.2, 8, gz * 7);
    w.sign("ゴールデン横丁", { bg: "#1a0a0a", color: "#ffd86a", glow: "#ff8a3a", border: "#8a6a2a", px: 512, both: true }, 6, 1.2, 745, 5.2, 520, Math.PI / 2);
    /* 一番街の提灯の列・街灯 */
    for (let z = 500; z < 640; z += 11) w.lanternString(X0 - SW / 2 - 1, z, X0 + SW / 2 + 1, z + 3, 7.4, 6, z);
    for (let z = 498; z < 642; z += 22) { w.yomaLamp(X0 - SW / 2 - 0.9, z, Math.PI / 2); w.yomaLamp(X0 + SW / 2 + 0.9, z + 11, -Math.PI / 2); }
    /* 道：夜のゾーン（太鼓橋）から・パズルシティから・遊郭へ */
    w.route([[690, 472], [704, 482], [X0, 488]], 8, "darkGround", { lamps: false, trees: false, benches: false });
    w.route([[622, 565], [645, 565]], 8, "paverWarm", { lamps: false, trees: false, benches: false });
    w.route([[X0, 646], [690, 648], [660, 644], [640, 642]], 9, "darkGround", { lamps: false, trees: false, benches: false });
    w.areaGate(636, 565, Math.PI / 2, "kabuki");
    w.plazaCrowd(X0, 560, 50, 1.5);
  };

  /* 化け猫の顔（オリジナル）：屋上からのぞく大きな顔（東を向く） */
  function bakeneko(w, x, y, z, s) {
    const lm = w._landmark; w._landmark = true;
    w.geo("propWhite", new T.SphereGeometry(8 * s, 24, 18).scale(1, 0.92, 1), x, y + 5 * s, z);
    [-1, 1].forEach((k) => { w.geo("propWhite", new T.ConeGeometry(3 * s, 6 * s, 10).rotateX(k * 0.25).translate(0, 0, 0), x - 1 * s, y + 12 * s, z + k * 4.2 * s); w.geo("propPink", new T.ConeGeometry(1.6 * s, 3.4 * s, 8).rotateX(k * 0.25), x + 0.6 * s, y + 11.6 * s, z + k * 4.1 * s); });
    w.geo("propPink", new T.SphereGeometry(1.0 * s, 12, 10).scale(0.6, 0.8, 1), x + 7.6 * s, y + 3.6 * s, z);
    for (let k = -1; k <= 1; k += 2) for (let j = 0; j < 3; j++) w.geo("pBlack", new T.CylinderGeometry(0.08 * s, 0.08 * s, 7 * s, 4).rotateX(Math.PI / 2 + (j - 1) * 0.18).translate(0, 0, k * 3.6 * s), x + 7.4 * s, y + 3.2 * s + (j - 1) * 0.7 * s, z);
    w.eyes(x + 6.9 * s, z, y + 6 * s, Math.PI / 2, 2.1 * s, 5.4 * s, "irisD", 0);
    w.geo("pRed", new T.TorusGeometry(6.6 * s, 0.9 * s, 8, 24).rotateZ(Math.PI / 2).rotateY(0).translate(0, 0, 0), x + 0.4 * s, y + 0.8 * s, z);
    w.geo("goldOrn", new T.SphereGeometry(1.4 * s, 12, 10), x + 6.6 * s, y - 0.2 * s, z);
    w._landmark = lm;
  }

  P.buildYukaku = function () {
    const w = this;
    w.areaZone("yukaku");
    w.places.push(["27 YOZAKURA YUKAKU（大門）", 640, 646, 0]);
    const X0 = 640, SW = 10, Z0 = 656, Z1 = 792;
    w.rect("paverWarm", X0 - SW / 2, Z0 - 4, X0 + SW / 2, Z1 - 16, 0.02);
    w.rect("stoneGray", X0 - 1, Z0, X0 + 1, Z1 - 20, 0.03);
    /* 大門（北）・白い塀 */
    w.pagodaGate(X0, Z0 - 6, Math.PI, 1.05, { text: "夜桜遊郭", roofKey: "kwR" });
    const wallZ0 = Z0 - 4, wallZ1 = Z1 + 2, WX0 = X0 - 30, WX1 = X0 + 30;
    const wallSeg = (x0, z0, x1, z1) => { const len = Math.hypot(x1 - x0, z1 - z0), ry = Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2; w.box("offWhite", cx, 0, cz, len, 3, 0.6, { ry, collide: true }); w.box("kwK", cx, 3, cz, len + 0.4, 0.4, 1.2, { ry }); };
    wallSeg(WX0, wallZ0, X0 - 12, wallZ0); wallSeg(X0 + 12, wallZ0, WX1, wallZ0);
    wallSeg(WX0, wallZ0, WX0, 732); wallSeg(WX0, 742, WX0, wallZ1); wallSeg(WX1, wallZ0, WX1, 732); wallSeg(WX1, 742, WX1, wallZ1); wallSeg(WX0, wallZ1, WX1, wallZ1);
    /* 水路（塀の外・東西）と橋（横の門） */
    w.river([[WX0 - 5, wallZ0 - 2], [WX0 - 5, wallZ1 + 2]], 5, { kind: "night" }); w.river([[WX1 + 5, wallZ0 - 2], [WX1 + 5, wallZ1 + 2]], 5, { kind: "night" });
    w.taikoBridge(WX0 - 5, 737, Math.PI / 2, 12, 3.4, 1.2); w.taikoBridge(WX1 + 5, 737, Math.PI / 2, 12, 3.4, 1.2);
    [[WX0, 737], [WX1, 737]].forEach(([x, z]) => { w.torii(x, z, Math.PI / 2, 0.55); });
    /* 仲の町通りの茶屋（東西の2列＋裏の小さな家） */
    let i = 0;
    for (let z = Z0 + 6; z < 756; z += 14.5, i++) {
      if (z > 728 && z < 742) continue;     /* 横の門（東西）へ抜ける路地をあける */
      const insW = [{ type: "cafe", name: "茶屋 夜桜", menu: "dango", light: "neon" }, { type: "food", name: "料亭 花月", menu: "sushi", light: "neon" }, { type: "cafe", name: "甘味 うさぎ屋", menu: "dango" }, { type: "theater", name: "芝居小屋 夜桜座", h: 7, video: "yozakuraza", screenTitle: "夜桜座", stageText: "本日の演目：「月夜の狐と提灯祭り」（オリジナルの芝居）。どうぞごゆっくり。" }, { type: "lobby", name: "占い 月の間", fortune: true, deskSign: "占い 月の間", actLabel: "水晶玉で占ってもらう", light: "neon", inner: "pPurple", floor: "carpetPlum" }][i % 5];
      const insE = [{ type: "studio", name: "着物の写真館", h: 3.8, glass: false }, { type: "karaoke", name: "三味線の間（歌う部屋）", h: 3.8 }, { type: "food", name: "うどん 桜", menu: "default", light: "neon" }, { type: "cafe", name: "団子 やなぎ", menu: "dango" }, { type: "shop", name: "かんざし屋", items: [["桜のかんざし", 2400, "花びらの飾り"], ["ちりめんの巾着", 1800, "手のひらサイズ"], ["扇子", 1500, "夜桜の絵"], ["提灯のキーホルダー", 600, "光る"]] }][i % 5];
      yukakuHouse(w, X0 - SW / 2 - 1.5 - 7, z, 13, 13, 9 + (i % 3) * 2, Math.PI / 2, i * 2, insW);
      yukakuHouse(w, X0 + SW / 2 + 1.5 + 7, z + 3, 13, 13, 9 + ((i + 1) % 3) * 2, -Math.PI / 2, i * 2 + 1, insE);
    }
    /* 夜桜（まん中）と提灯の列 */
    for (let z = Z0 + 10; z < Z1 - 28; z += 10) w.plant("sakura", X0, z, 1.05);
    for (let z = Z0 + 8; z < Z1 - 28; z += 12) w.lanternString(X0 - SW / 2 - 0.5, z, X0 + SW / 2 + 0.5, z + 2, 6.6, 5, z * 3);
    for (let z = Z0 + 4; z < Z1 - 26; z += 16) [-1, 1].forEach((k) => { w.detail(() => { const x = X0 + k * (SW / 2 - 0.6); w.geo("stoneGray", new T.BoxGeometry(0.6, 1.4, 0.6), x, 0.7, z); w.geo("stoneGray", new T.BoxGeometry(0.9, 0.2, 0.9), x, 1.5, z); w.geo("lampGlow", new T.BoxGeometry(0.5, 0.5, 0.5), x, 1.85, z); w.geo("kwK", new T.ConeGeometry(0.7, 0.5, 4).rotateY(Math.PI / 4), x, 2.35, z); }); w.colCircle(X0 + k * (SW / 2 - 0.6), z, 0.45); });
    /* 突きあたりの五重の大楼「万華楼」 */
    { const x = X0, z = Z1 - 8; w.pagodaTower(x, z + 2, 14, 5, { roofKey: "kwR" });
      w.yomaShop(x, z - 15, 24, 10, 7, { ry: Math.PI, key: "woodRed", shop: "shopA", roof: "kawara", roofKey: "kwR", rh: 3, eyes: { iris: "irisE" }, sign: "大楼 万華楼", signColor: "#3a0a10", glow: "#ffb04a", noren: "norK", lanterns: 4, inside: { type: "food", name: "大楼 万華楼（食事処）", menu: "diner", light: "neon" } }); }
    /* 見返りの柳のかわりの枝垂れ桜・入口の案内 */
    w.plant("sakura", X0 - 9, Z0 - 10, 1.3); w.plant("sakura", X0 + 9, Z0 - 10, 1.3);
    w.sign("夜桜遊郭 — 茶屋・芝居小屋・着物の写真館", { bg: "#3a0a10", color: "#ffe7a0", border: "#c8a060", px: 1024 }, 9, 1.0, X0 + 14, 3.2, Z0 - 12, 0);
    w.plazaCrowd(X0, 720, 30, 1.4);
    w.route([[586, 737], [WX0 - 11, 737]], 6, "paverWarm", { lamps: false, trees: false, benches: false });
  };
})();
