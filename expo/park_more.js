/* ══════════════════════════════════════════════════════════════════
   XEVARION PARK — 新しいエリア その2（★★ 2026-09-30 ご指定
   「NGX本社…より高く広く大きくし、エリア一帯を大きなモールとして大都市に」「新しいアトラクションを増やして」
   「まだ多く空いているエリアがあるので…新規エリアの開発」「妖怪ウォッチの世界感かつ未来の街」）
   ------------------------------------------------------------------
   34 NGX CITY（サッカー場の北）… ガラスの大屋根のモール「NGX GALLERIA」（両がわに入れるお店 22）、
        超高層ビル 6 本（120〜210m・屋上へはガラスのエレベーター）・空中の連絡橋・NGX のホログラムの広場。
   35 YOKAI WONDERLAND（西の海ぞい）… 妖怪メリーゴーラウンド・ゆのみカップ・スカイスイング・妖怪船・バンパーカー・
        ドラゴンコースター・妖怪屋敷・屋台の通り。ぜんぶ乗れる（E で早くおりる・V で視点）。
   36 妖魔温泉街（神社と歌舞伎の間）… 川ぞいの旅館・大浴場・足湯・湯けむり・朱の太鼓橋。
   37 SKY GARDEN（ゲームワールドの東）… ねじれた塔 3 本と、高さ 64m の空中庭園の輪（ガラスのエレベーターで上がれる）。
   ・乗り物の生きもの・建物・ロゴはオリジナル（既存作品のものは使わない）。NGX のロゴはご提供の画像。
   ══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const T = THREE, X = XTex, P = XWorld.World.prototype, TAU = Math.PI * 2, XP = XPark, UP = new T.Vector3(0, 1, 0);
  const texMat = (w, key, src) => { if (!w.m[key]) { const m = new T.MeshBasicMaterial({ map: X.imgTex(src), transparent: true, toneMapped: false, side: T.DoubleSide, depthWrite: false }); w.m[key] = m; w.nightMats.push({ m, base: new T.Color(1, 1, 1), day: 1, night: 1.35 }); } return key; };
  const reg = (w, R) => ((w.rides = w.rides || {})[R.id] = R);

  /* ══════════════ 34 NGX CITY ══════════════ */
  P.buildNGXCity = function () {
    const w = this, Z = -428, X0 = 352, X1 = 540, SW = 18, logo = texMat(w, "ngxLogo", "img/ngx_logo.webp");
    w.areaZone("ngxcity");
    w.places.push(["34 NGX CITY（NGX ギャラリア）", X0 - 6, Z, Math.PI / 2]);
    const lm = w._landmark; w._landmark = true;
    /* モールの通り：大理石の床・ガラスのかまぼこ屋根・金の骨 */
    w.route([[X0 - 14, Z], [X1 + 6, Z]], SW, "marble", { lamps: false, trees: false, benches: false, bushes: false, curb: false });
    w.geo("glassDomeP", new T.CylinderGeometry(SW / 2 + 0.6, SW / 2 + 0.6, X1 - X0, 28, 1, true, 0, Math.PI).rotateZ(Math.PI / 2).scale(1, 0.55, 1), (X0 + X1) / 2, 10.5, Z);
    for (let x = X0; x <= X1; x += 12) { w.geo("gold", new T.TorusGeometry(SW / 2 + 0.6, 0.22, 4, 24, Math.PI).rotateY(Math.PI / 2).scale(1, 0.55, 1), x, 10.5, Z); [-1, 1].forEach((s) => { w.box("white2", x, 0, Z + s * (SW / 2 + 0.4), 0.6, 10.5, 0.6); w.box("neonCyan", x, 10.3, Z + s * (SW / 2 + 0.72), 0.7, 0.14, 0.06); }); }
    w.caster((X0 + X1) / 2, Z, X1 - X0, SW + 1, 15.5); w.casters[w.casters.length - 1].gate = true;
    /* 通りのまん中：植えこみ・ベンチ・NGX の旗・ホログラムの看板 */
    for (let x = X0 + 14; x < X1 - 6; x += 24) {
      w.planterBox(x, Z, 5, 1.8, true); w.plant("sakura", x, Z, 0.9);
      [-1, 1].forEach((s) => w.bench(x, Z + s * 2.2, s < 0 ? Math.PI : 0));
      w.geo(logo, new T.PlaneGeometry(4.2, 1.54), x + 12, 7.2, Z); w.geo(logo, new T.PlaneGeometry(4.2, 1.54).rotateY(Math.PI), x + 12, 7.2, Z);
      w.box("chromeB", x + 12, 8.1, Z, 0.06, 2.4, 0.06);
    }
    for (let x = X0 + 6; x < X1; x += 18) w.lanternString(x, Z - SW / 2 - 0.4, x, Z + SW / 2 + 0.4, 8.6, 6, x);
    /* お店（南の列は北向き・北の列は南向き）：入れるお店 */
    const SHOPS = [["NGX STORE 本店", "shop", "gBlue", "#0a1450"], ["ファッション LUNA", "shop", "gRose", "#c83a6a"], ["NGX カフェ", "cafe", "sCream", "#6a3a1a"], ["ゲームラボ NGX", "arcade", "gPurple", "#3a1a6a"], ["本と文具 ほしぞら", "library", "woodLight", "#2a6a3a"], ["フードホール 妖", "food", "yOrange", "#8a3a1a"],
      ["ガジェット館", "showroom", "gSilver", "#1a3a5a"], ["ガチャの森", "gacha", "yPink", "#a83a8a"], ["NGX シネマ", "theater", "gDark", "#1a1a2a"], ["スイーツ 月見", "cafe", "yCream", "#a8703a"], ["カラオケ NGX", "karaoke", "gPurple", "#5a1a8a"], ["フォトスタジオ", "studio", "oWhite", "#3a3a3a"],
      ["ミュージック館", "shop", "gTeal", "#0a4a5a"], ["ラーメン 天狗", "food", "yRed", "#8a1a1a"], ["おもちゃのNGX", "shop", "yYellow", "#a8801a"], ["アート ギャラリー", "gallery", "white2", "#2a2a4a"], ["スパ & リラクゼーション", "spa", "yTeal", "#1a5a5a"], ["ロボット教室", "classroom", "gGreen", "#1a5a2a"],
      ["寿司 つくよみ", "food", "yBrown", "#5a3a1a"], ["NGX トラベル", "lobby", "gBlue", "#1a3a6a"], ["時計と宝石", "shop", "gGold", "#6a5a1a"], ["スポーツ NGX", "shop", "gRose", "#1a5a8a"]];
    const per = SHOPS.length / 2, step = (X1 - X0) / per;
    SHOPS.forEach(([nm, type, key, col], i) => {
      const side = i % 2 ? 1 : -1, k = Math.floor(i / 2), x = X0 + step * (k + 0.5), z = Z + side * (SW / 2 + 7.6), h = 11 + (k % 3) * 2.5;
      w.bld(x, z, step - 1.2, 14, h, { ry: side < 0 ? 0 : Math.PI, key, shop: "shopA", roof: "flat", crown: ["neonCyan", "neonPink", "neonPurple", "neonYellow"][k % 4], sign: { text: nm, bg: col, w: Math.min(step - 3, 11), h: 1.6, y: 6.2, glow: "#ffffff", border: "#ffd86a" }, inside: { type, name: nm, h: 5.2, door: 3.4, menu: type === "food" ? (["ramen", "sushi", "diner"][k % 3]) : undefined } });
      if (k % 3 === 1) w.eyes(x, z + side * -7.05, h - 2.4, side < 0 ? 0 : Math.PI, 0.9, 2.6, ["irisA", "irisB", "irisC", "irisE"][k % 4]);
    });
    /* 西の入口の広場：NGX のホログラム（回る）・噴水 */
    { const px = X0 - 16, pz = Z; w.disk(px, pz, 17, "marble", 0.016); w.disk(px, pz, 17.6, "gold", 0.014, 17);
      w.pond(px, pz, 6.5, "fountain"); w.geo("white2", new T.CylinderGeometry(1.2, 1.6, 2.6, 16), px, 1.3, pz);
      const holo = new T.Group(); const pl = new T.Mesh(new T.PlaneGeometry(9, 3.3), w.m[logo]); holo.add(pl); const pl2 = pl.clone(); pl2.rotation.y = Math.PI; holo.add(pl2);
      const ring = new T.Mesh(new T.TorusGeometry(5.2, 0.12, 6, 64), w.m.neonCyan); ring.rotation.x = Math.PI / 2; ring.position.y = -2.6; holo.add(ring);
      holo.position.set(px, 7.4, pz); w.scene.add(holo); w.loose(holo, 900); w.anim.push((dt, t) => { holo.rotation.y = t * 0.5; holo.position.y = 7.4 + Math.sin(t * 1.3) * 0.3; });
      w.plazaCrowd(px, pz, 14, 1.2); w.forestOpen.push([px, pz, 30]); }
    /* 超高層ビル（北）：屋上はガラスのエレベーターで上がれる（park_rooms.js の入口） */
    const TW = [[380, -488, 26, 210, "gBlue", "NGX SKY RESIDENCE", 4, "neonCyan"], [426, -481, 24, 176, "gPurple", "NGX GRAND HOTEL", 3, "neonPink"], [468, -470, 22, 150, "gTeal", "NGX MEDIA TOWER", 3, "neonCyan"],
      [506, -458, 20, 128, "gSilver", "NGX TECH TOWER", 3, "neonPurple"], [352, -522, 20, 160, "gDark", "NGX TWIN A", 3, "neonYellow"], [395, -530, 20, 160, "gDark", "NGX TWIN B", 3, "neonYellow"]];
    TW.forEach(([x, z, s, h, key, nm, st, cr]) => {
      const top = w.skyscraper(x, z, s, s, h, { key, steps: st, taper: 0.86, podium: "gSilver", shop: "shopB", crown: cr, heli: nm.indexOf("TWIN") < 0 });
      w.sign(nm, { bg: "#0a1450", color: "#fff", glow: "#7fd8ff", px: 1024 }, s * 0.9, 1.8, x, 9, z + (s + 8) / 2 + 0.08, 0);
      w.geo(logo, new T.PlaneGeometry(s * 0.7, s * 0.7 * 0.367), x, top - 6, z + s * Math.pow(0.86, st - 1) / 2 + 0.3);
    });
    /* 空中の連絡橋（ガラスの筒・光の線） */
    [[380, -488, 426, -481, 118], [426, -481, 468, -470, 96], [352, -522, 395, -530, 92], [468, -470, 506, -458, 74]].forEach(([x0, z0, x1, z1, y]) => {
      const L = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(x1 - x0, z1 - z0), mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
      w.geo("glassClear", new T.CylinderGeometry(2.4, 2.4, L - 16, 16, 1, true).rotateX(Math.PI / 2), mx, y, mz, ang); w.geo("white2", new T.BoxGeometry(4.2, 0.4, L - 16), mx, y - 2.2, mz, ang);
      w.geo("neonCyan", new T.BoxGeometry(0.12, 0.12, L - 16), mx, y - 1.9, mz, ang); for (let k = 0; k < 5; k++) w.geo("gold", new T.TorusGeometry(2.45, 0.1, 4, 20), mx + Math.sin(ang) * (k - 2) * (L - 16) / 5, y, mz + Math.cos(ang) * (k - 2) * (L - 16) / 5, ang);
    });
    w._landmark = lm;
    w.plazaCrowd((X0 + X1) / 2, Z, 70, 1.3);
    w.areaGate(X0 - 34, Z, Math.PI / 2, "ngxcity", "big");
    w.forestOpen.push([(X0 + X1) / 2, Z, 110], [430, -490, 90]);
    (w.roadEdges = w.roadEdges || []).push(["ngxcity", "harbor2"], ["ngxcity", "soccer"]);
  };

  /* ══════════════ 回る乗り物（共通） ══════════════ */
  /* オリジナルの生きもの（メリーゴーラウンド用）：ねこまた・きつね・たぬき・かっぱ・りゅう・おばけ */
  function creature(w, kind, col) {
    const g = new T.Group(), M = (k) => w.m[k] || w.m.white2, add = (geo, k, x, y, z, rx, ry, rz) => { const m = new T.Mesh(geo, M(k)); m.position.set(x || 0, y || 0, z || 0); m.rotation.set(rx || 0, ry || 0, rz || 0); g.add(m); return m; };
    const body = kind === "dragon" ? "propGreen" : kind === "fox" ? "propOrange" : kind === "tanuki" ? "propBrown" : kind === "kappa" ? "propMint" : kind === "ghost" ? "propWhite" : col || "propPink";
    add(new T.CapsuleGeometry(0.42, 0.9, 6, 12).rotateX(Math.PI / 2), w.m[body] ? body : "propPink", 0, 0.9, 0);
    const head = add(new T.SphereGeometry(0.42, 16, 12), w.m[body] ? body : "propPink", 0, 1.35, 0.72);
    [-1, 1].forEach((s) => { add(new T.SphereGeometry(0.12, 10, 8), "eyeW", s * 0.17, 1.44, 1.06); add(new T.SphereGeometry(0.065, 8, 6), "eyeB", s * 0.17, 1.44, 1.14); });
    if (kind === "cat" || kind === "fox") [-1, 1].forEach((s) => add(new T.ConeGeometry(0.14, 0.34, 8), w.m[body] ? body : "propPink", s * 0.22, 1.78, 0.66, 0, 0, s * -0.3));
    if (kind === "cat") [-1, 1].forEach((s) => add(new T.CylinderGeometry(0.05, 0.07, 1.0, 6), "propPink", s * 0.14, 1.3, -0.95, -0.9, 0, s * 0.3));
    if (kind === "fox") for (let k = -1; k <= 1; k++) add(new T.ConeGeometry(0.18, 0.9, 8), "propCream", k * 0.2, 1.25, -1.0, -1.1, 0, k * 0.4);
    if (kind === "tanuki") { add(new T.SphereGeometry(0.2, 10, 8), "propBrown", 0, 1.1, -0.95); add(new T.BoxGeometry(0.5, 0.08, 0.3), "propBlack", 0, 1.9, 0.65); }
    if (kind === "kappa") add(new T.CylinderGeometry(0.28, 0.28, 0.05, 14), "propWhite", 0, 1.78, 0.7);
    if (kind === "dragon") { for (let k = 0; k < 4; k++) add(new T.ConeGeometry(0.1, 0.3, 6), "propYellow", 0, 1.35 + 0.02 * k, 0.2 - k * 0.35); add(new T.ConeGeometry(0.1, 0.4, 6), "propYellow", -0.2, 1.8, 0.66, 0, 0, 0.5); add(new T.ConeGeometry(0.1, 0.4, 6), "propYellow", 0.2, 1.8, 0.66, 0, 0, -0.5); }
    if (kind === "ghost") add(new T.ConeGeometry(0.42, 0.8, 12), "propWhite", 0, 0.5, -0.4, Math.PI, 0, 0);
    add(new T.BoxGeometry(0.5, 0.08, 0.7), "propRed", 0, 1.33, -0.05);
    return g;
  }
  /* 乗り物の登録（ride.kind = "flat"）：pose(t) で席の位置・向き・見る先を返す */
  function flatRide(w, o) {
    const R = reg(w, Object.assign({ kind: "flat", busy: false, dur: 42, t: 0, spd: 0.35 }, o));
    w.anim.push((dt) => { const tgt = R.busy ? 1 : (R.idle != null ? R.idle : 0.35); R.spd += (tgt - R.spd) * Math.min(1, dt * 0.6); R.t += dt * R.spd; if (R.tick) R.tick(dt, R.t, R.spd); });
    R.startRide = () => { R.t0 = R.t; }; R.stopRide = () => {};
    return R;
  }
  const _v = new T.Vector3(), _v2 = new T.Vector3();

  /* 妖怪メリーゴーラウンド */
  P.carousel = function (x, z, id, name) {
    const w = this, Rr = 7.2, top = new T.Group(); top.position.set(x, 0, z); w.scene.add(top); w.loose(top, 400);
    w.geo("stoneW", new T.CylinderGeometry(9.6, 9.8, 0.5, 40), x, 0.25, z); w.colRing(x, z, 9.5, 9.9, [[-0.2, 0.2]]);
    const plat = new T.Mesh(new T.CylinderGeometry(9, 9, 0.3, 40), w.m.woodLight); plat.position.y = 0.65; top.add(plat);
    const pole = new T.Mesh(new T.CylinderGeometry(1.1, 1.1, 5.4, 16), w.m.yRed || w.m.pRed); pole.position.y = 3.3; top.add(pole);
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, m = new T.Mesh(new T.PlaneGeometry(1.4, 3.8), w.m[i % 2 ? "yCream" : "yPink"] || w.m.white2); m.position.set(Math.cos(a) * 1.15, 3.3, Math.sin(a) * 1.15); m.rotation.y = -a + Math.PI / 2; top.add(m); }
    const canopy = new T.Mesh(new T.ConeGeometry(10, 3.6, 24, 1, true), w.m.kwR || w.m.pRed); canopy.position.y = 7.6; top.add(canopy);
    const rim = new T.Mesh(new T.CylinderGeometry(10, 10, 0.9, 24, 1, true), w.m.gold); rim.position.y = 5.5; top.add(rim);
    for (let i = 0; i < 24; i++) { const a = i / 24 * TAU, b = new T.Mesh(new T.SphereGeometry(0.16, 8, 6), w.m[i % 3 ? "lampY" : "neonPink"] || w.m.lampY); b.position.set(Math.cos(a) * 10.05, 5.5, Math.sin(a) * 10.05); top.add(b); }
    [-1, 1].forEach((s) => { const e = new T.Mesh(new T.SphereGeometry(0.9, 16, 12, 0, TAU, 0, Math.PI / 2).rotateX(Math.PI / 2).scale(1, 1.1, 0.45), w.m.eyeW); e.position.set(s * 1.3, 8.2, 8.6); top.add(e); const p = new T.Mesh(new T.CircleGeometry(0.4, 16), w.m.eyeB); p.position.set(s * 1.3, 8.1, 9.02); top.add(p); });
    const K = ["cat", "fox", "tanuki", "kappa", "dragon", "ghost"], ani = [];
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, r = i % 2 ? Rr : Rr - 2.2, c = creature(w, K[i % K.length]), pl = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 5, 6), w.m.gold); c.userData = { a, r, ph: i * 0.9 }; pl.position.set(Math.cos(a) * r, 3.2, Math.sin(a) * r); top.add(pl); top.add(c); ani.push(c); }
    const R = flatRide(w, { id, name, x, z, dur: 40, idle: 0.3,
      tick: (dt, t) => { top.rotation.y = -t * 0.6; ani.forEach((c) => { const u = c.userData; c.position.set(Math.cos(u.a) * u.r, 0.3 + Math.sin(t * 2.2 + u.ph) * 0.45, Math.sin(u.a) * u.r); c.rotation.y = -u.a; }); },
      pose: (t) => { const c = ani[1]; c.updateMatrixWorld(true); const p = new T.Vector3(0, 1.5, 0.1).applyMatrix4(c.matrixWorld); const f = new T.Vector3(0, 1.5, 3).applyMatrix4(c.matrixWorld); const yaw = Math.atan2(f.x - p.x, f.z - p.z); return { p, yaw, look: _v.copy(f).add(new T.Vector3(0, -0.4, 0)).clone(), info: "妖怪メリーゴーラウンド（E でおりる）" }; } });
    w.sign(name, { bg: "#c83a3a", color: "#fff", glow: "#ffd86a", border: "#ffd86a", px: 512 }, 7, 1.1, x + 10.3, 1.6, z + 4, Math.PI / 2);
    w.interact(x + 11.6, z, 3.2, name + " に乗る", () => ({ rideId: id }), "🎠"); w.caster(x, z, 20, 20, 9.4);
    return R;
  };
  /* ゆのみカップ（回るカップ） */
  P.spinCups = function (x, z, id, name) {
    const w = this, base = new T.Group(); base.position.set(x, 0, z); w.scene.add(base); w.loose(base, 400);
    w.geo("stoneW", new T.CylinderGeometry(12, 12.2, 0.4, 40), x, 0.2, z); w.colRing(x, z, 11.9, 12.4, [[-0.18, 0.18]]);
    const turn = new T.Mesh(new T.CylinderGeometry(11.4, 11.4, 0.2, 40), w.m.pBlue); turn.position.y = 0.5; base.add(turn);
    const cups = [], cols = ["pRed", "pYellow", "pGreen", "pPink", "pPurple", "pOrange"];
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU, cg = new T.Group(); const prof = []; for (let k = 0; k <= 8; k++) { const tt = k / 8; prof.push(new T.Vector2(1.0 + 0.5 * Math.sin(tt * 1.6), tt * 1.3)); } const cup = new T.Mesh(new T.LatheGeometry(prof, 20), w.m[cols[i]]); cup.material = w.m[cols[i]]; cup.position.y = 0.6; cg.add(cup); const band = new T.Mesh(new T.TorusGeometry(1.5, 0.08, 6, 24), w.m.gold); band.rotation.x = Math.PI / 2; band.position.y = 1.9; cg.add(band); const wheel = new T.Mesh(new T.CylinderGeometry(0.5, 0.5, 0.1, 12), w.m.white2); wheel.position.y = 1.0; cg.add(wheel); cg.userData = { a }; base.add(cg); cups.push(cg); }
    const tea = new T.Mesh(new T.SphereGeometry(2.6, 20, 14, 0, TAU, 0, Math.PI / 2), w.m.yCream || w.m.white2); tea.position.y = 0.6; base.add(tea); const lid = new T.Mesh(new T.SphereGeometry(0.5, 12, 8), w.m.pRed); lid.position.y = 3.3; base.add(lid);
    const R = flatRide(w, { id, name, x, z, dur: 38, idle: 0.25,
      tick: (dt, t) => { turn.rotation.y = t * 0.5; cups.forEach((c, i) => { const a = c.userData.a + t * 0.5; c.position.set(Math.cos(a) * 7, 0, Math.sin(a) * 7); c.rotation.y = t * (1.6 + (i % 3) * 0.5) * (i % 2 ? 1 : -1); }); },
      pose: () => { const c = cups[0]; c.updateMatrixWorld(true); const p = new T.Vector3(0.6, 1.2, 0).applyMatrix4(c.matrixWorld), f = new T.Vector3(3, 1.0, 0).applyMatrix4(c.matrixWorld); return { p, yaw: Math.atan2(f.x - p.x, f.z - p.z), look: f, info: "ゆのみカップ（くるくる！ E でおりる）" }; } });
    w.sign(name, { bg: "#2a6ad8", color: "#fff", glow: "#ffd86a", border: "#ffd86a", px: 512 }, 6, 1.0, x + 12.7, 1.6, z + 4, Math.PI / 2);
    w.interact(x + 14, z, 3.2, name + " に乗る", () => ({ rideId: id }), "☕"); w.caster(x, z, 24, 24, 3);
    return R;
  };
  /* スカイスイング（空中ブランコ） */
  P.skySwinger = function (x, z, id, name) {
    const w = this, H = 16, top = new T.Group(); top.position.set(x, H, z); w.scene.add(top); w.loose(top, 600);
    w.geo("white2", new T.CylinderGeometry(0.9, 1.4, H, 16), x, H / 2, z); w.geo("stoneW", new T.CylinderGeometry(3, 3.2, 0.6, 24), x, 0.3, z); w.colCircle(x, z, 3.2);
    const cap = new T.Mesh(new T.ConeGeometry(6.5, 2.4, 24), w.m.kwB || w.m.pBlue); cap.position.y = 1.4; top.add(cap);
    const disc = new T.Mesh(new T.CylinderGeometry(6.8, 6.8, 0.6, 32), w.m.gold); top.add(disc);
    const chairs = []; for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, arm = new T.Group(); arm.rotation.y = -a; const chain = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 7, 4), w.m.chromeB); chain.position.set(6.2, -3.5, 0); const seat = new T.Mesh(new T.BoxGeometry(0.7, 0.12, 0.7), w.m[["pRed", "pYellow", "pBlue", "pGreen"][i % 4]]); seat.position.set(6.2, -7.0, 0); const pivot = new T.Group(); pivot.position.set(6.2, 0, 0); chain.position.set(0, -3.5, 0); seat.position.set(0, -7.0, 0); pivot.add(chain); pivot.add(seat); arm.add(pivot); top.add(arm); chairs.push(pivot); }
    const R = flatRide(w, { id, name, x, z, dur: 40, idle: 0.2,
      tick: (dt, t, spd) => { top.rotation.y = t * 0.9; const sw = Math.min(1.05, spd * 1.1); chairs.forEach((c) => { c.rotation.z = sw * 0.95; }); top.position.y = H + spd * 2.5; top.rotation.x = Math.sin(t * 0.5) * 0.12 * spd; },
      pose: () => { const c = chairs[0]; c.updateMatrixWorld(true); const p = new T.Vector3(0, -6.6, 0).applyMatrix4(c.matrixWorld), f = new T.Vector3(0, -7.2, -8).applyMatrix4(c.matrixWorld); return { p, yaw: Math.atan2(f.x - p.x, f.z - p.z), look: f, info: "スカイスイング 高さ " + Math.round(p.y) + " m（E でおりる）" }; } });
    w.sign(name, { bg: "#3a78e8", color: "#fff", glow: "#ffd86a", border: "#ffd86a", px: 512 }, 6, 1.0, x + 3.6, 2.2, z, Math.PI / 2);
    w.interact(x + 5.6, z, 3.2, name + " に乗る", () => ({ rideId: id }), "🪂"); w.caster(x, z, 6, 6, H + 3);
    return R;
  };
  /* 妖怪船（大きくゆれる船） */
  P.yokaiShip = function (x, z, id, name) {
    const w = this, H = 13, piv = new T.Group(); piv.position.set(x, H, z); w.scene.add(piv); w.loose(piv, 500);
    [-1, 1].forEach((s) => [-1, 1].forEach((f) => { const g = new T.CylinderGeometry(0.35, 0.5, Math.hypot(H, 6), 8); g.rotateX(f * Math.atan2(6, H)); w.geo("woodRed", g, x + s * 4.2, H / 2, z + f * 3); }));
    w.box("stoneW", x, 0, z, 12, 0.5, 26, { collide: false }); w.colObb(x, z, 12.4, 3, 0);
    const hullP = []; for (let k = 0; k <= 12; k++) { const t = k / 12 - 0.5; hullP.push(new T.Vector3(0, Math.pow(Math.abs(t) * 2, 2) * 1.6, t * 18)); }
    const arm = new T.Group(); piv.add(arm);
    const hull = new T.Mesh(new T.BoxGeometry(4.6, 2.2, 16), w.m.woodDark2); hull.position.y = -H + 2.2; arm.add(hull);
    const deck = new T.Mesh(new T.BoxGeometry(4.2, 0.2, 15.6), w.m.woodLight); deck.position.y = -H + 3.3; arm.add(deck);
    [-1, 1].forEach((s) => { const bow = new T.Mesh(new T.ConeGeometry(2.3, 3.4, 4).rotateX(s * Math.PI / 2).rotateZ(Math.PI / 4), w.m.woodDark2); bow.position.set(0, -H + 2.4, s * 9.6); arm.add(bow); });
    const head = new T.Mesh(new T.SphereGeometry(1.4, 16, 12), w.m.propGreen || w.m.pGreen); head.position.set(0, -H + 5, 10.4); arm.add(head);
    [-1, 1].forEach((s) => { const e = new T.Mesh(new T.SphereGeometry(0.42, 10, 8), w.m.eyeW); e.position.set(s * 0.6, -H + 5.4, 11.6); arm.add(e); const p = new T.Mesh(new T.SphereGeometry(0.2, 8, 6), w.m.eyeB); p.position.set(s * 0.6, -H + 5.4, 11.95); arm.add(p); const hn = new T.Mesh(new T.ConeGeometry(0.25, 1.0, 6), w.m.propYellow || w.m.gold); hn.position.set(s * 0.7, -H + 6.5, 10.2); arm.add(hn); });
    const sail = new T.Mesh(new T.PlaneGeometry(5, 5), w.m.yRed || w.m.pRed); sail.position.set(0, -H + 7, 0); sail.rotation.y = Math.PI / 2; arm.add(sail);
    for (let i = 0; i < 2; i++) { const bar = new T.Mesh(new T.CylinderGeometry(0.12, 0.12, H - 2, 6), w.m.chromeB); bar.position.set(0, -(H - 2) / 2, i ? 3 : -3); arm.add(bar); }
    const R = flatRide(w, { id, name, x, z, dur: 36, idle: 0.15,
      tick: (dt, t, spd) => { const amp = 0.25 + spd * 0.85; piv.rotation.x = Math.sin(t * 1.35) * amp; },
      pose: () => { arm.updateMatrixWorld(true); const p = new T.Vector3(0, -H + 3.9, 6.6).applyMatrix4(arm.matrixWorld), f = new T.Vector3(0, -H + 3.4, 16).applyMatrix4(arm.matrixWorld), up = new T.Vector3(0, 1, 0).applyQuaternion(piv.quaternion); return { p, yaw: 0, look: f, up, info: "妖怪船 — ぐわーん！（E でおりる）" }; } });
    w.sign(name, { bg: "#1a8a4a", color: "#fff", glow: "#ffd86a", border: "#ffd86a", px: 512 }, 6, 1.0, x + 6.6, 1.8, z, Math.PI / 2);
    w.interact(x + 8, z, 3.2, name + " に乗る", () => ({ rideId: id }), "⛵"); w.caster(x, z, 8, 22, H + 3);
    return R;
  };
  /* バンパーカー（自動でぶつかり合う） */
  P.bumperCars = function (x, z, id, name) {
    const w = this, AW = 26, AD = 18;
    w.box("pNavy", x, 0, z, AW + 1, 0.3, AD + 1); w.box("expoFloorD" in w.m ? "expoFloorD" : "darkMetal", x, 0.3, z, AW, 0.02, AD);
    [[0, -AD / 2 - 0.4, AW + 1.6, 0.5], [0, AD / 2 + 0.4, AW + 1.6, 0.5], [-AW / 2 - 0.4, 0, 0.5, AD + 1.6], [AW / 2 + 0.4, -AD / 4 - 1.5, 0.5, AD / 2 - 1.4], [AW / 2 + 0.4, AD / 4 + 1.5, 0.5, AD / 2 - 1.4]].forEach(([a, b, ww, dd]) => w.box("pYellow", x + a, 0, z + b, ww, 0.9, dd, { collide: true }));
    for (let i = 0; i < 6; i++) { const a = -AW / 2 + i * AW / 5; w.box("chromeB", x + a, 0, z - AD / 2 - 0.4, 0.2, 6.5, 0.2); w.box("chromeB", x + a, 0, z + AD / 2 + 0.4, 0.2, 6.5, 0.2); }
    w.box("pRed", x, 6.5, z, AW + 2, 0.5, AD + 2); w.box("neonCyan", x, 6.3, z, AW + 2.1, 0.12, AD + 2.1);
    const cars = [], cols = ["pRed", "pBlue", "pYellow", "pGreen", "pPink", "pPurple", "pOrange", "white2"];
    for (let i = 0; i < 8; i++) { const g = new T.Group(); const b = new T.Mesh(new T.BoxGeometry(1.5, 0.6, 2.2), w.m[cols[i]]); b.position.y = 0.6; g.add(b); const bump = new T.Mesh(new T.TorusGeometry(1.1, 0.16, 6, 16).rotateX(Math.PI / 2).scale(1, 1, 1.35), w.m.pBlack); bump.position.y = 0.45; g.add(bump); const pole = new T.Mesh(new T.CylinderGeometry(0.04, 0.04, 5.2, 4), w.m.chromeB); pole.position.set(0, 3.2, -0.8); g.add(pole); g.userData = { x: (i % 4 - 1.5) * 5, z: (i < 4 ? -3 : 3), a: i * 0.8, v: 3 }; g.position.set(x + g.userData.x, 0.32, z + g.userData.z); w.scene.add(g); w.loose(g, 300); cars.push(g); }
    const R = flatRide(w, { id, name, x, z, dur: 40, idle: 1,
      tick: (dt) => { cars.forEach((c, i) => { const u = c.userData; u.a += (Math.sin(performance.now() * 0.0007 + i * 2) * 1.2) * dt; u.x += Math.sin(u.a) * u.v * dt; u.z += Math.cos(u.a) * u.v * dt; if (Math.abs(u.x) > AW / 2 - 1.4) { u.x = Math.sign(u.x) * (AW / 2 - 1.4); u.a = -u.a; } if (Math.abs(u.z) > AD / 2 - 1.6) { u.z = Math.sign(u.z) * (AD / 2 - 1.6); u.a = Math.PI - u.a; } cars.forEach((o, j) => { if (j <= i) return; const v = o.userData, dx = v.x - u.x, dz = v.z - u.z, d = Math.hypot(dx, dz); if (d < 2.2 && d > 0.01) { const k = (2.2 - d) / 2 / d; u.x -= dx * k; u.z -= dz * k; v.x += dx * k; v.z += dz * k; u.a += 1.4; v.a -= 1.4; } }); c.position.set(x + u.x, 0.32, z + u.z); c.rotation.y = u.a; }); },
      pose: () => { const c = cars[0], u = c.userData, p = new T.Vector3(c.position.x, 1.0, c.position.z); return { p, yaw: u.a, look: new T.Vector3(p.x + Math.sin(u.a) * 8, 0.8, p.z + Math.cos(u.a) * 8), info: "バンパーカー — ドーン！（E でおりる）" }; } });
    w.sign(name, { bg: "#e8a020", color: "#1a1a2a", glow: "#fff", px: 512 }, 8, 1.2, x + AW / 2 + 1.1, 7.8, z, Math.PI / 2);
    w.interact(x + AW / 2 + 2.4, z, 3.2, name + " に乗る", () => ({ rideId: id }), "🚗"); w.caster(x, z, AW + 2, AD + 2, 7);
    return R;
  };

  /* ══════════════ 35 YOKAI WONDERLAND ══════════════ */
  P.buildWonderland = function () {
    const w = this, PX = -676;
    w.areaZone("wonder");
    w.places.push(["35 YOKAI WONDERLAND（入口の広場）", -660, 372, -Math.PI / 2]);
    /* 入口の広場・まん中の通り（提灯・旗） */
    w.disk(-668, 372, 16, "walkCream", 0.016); w.disk(-668, 372, 16.5, "walkY", 0.014, 16);
    w.route([[PX, 384], [PX, 686]], 10, "walkY", { lamps: "yoma", lampsBoth: true, lampEvery: 16, trees: false, benches: 36, bushes: false });
    for (let z = 396; z < 680; z += 14) w.lanternString(PX - 6.4, z, PX + 6.4, z, 6.2, 6, z);
    w.pagodaGate(PX, 390, 0, 1.1, { roofKey: "kwR", lanKey: "lanBig", text: "YOKAI WONDERLAND" });
    /* 乗り物（西がわ）・入口は通りに向く */
    const RX = -708;
    w.carousel(RX, 420, "wcarousel", "妖怪メリーゴーラウンド");
    w.spinCups(RX, 466, "wcups", "ゆのみカップ");
    w.skySwinger(RX, 516, "wswing", "スカイスイング");
    w.yokaiShip(RX, 566, "wship", "妖怪船");
    w.bumperCars(RX, 612, "wbump", "妖怪バンパーカー");
    [[420, 10], [466, 12.4], [516, 4.4], [566, 7], [612, 13.4]].forEach(([z, r]) => w.route([[RX + r + 1, z], [PX - 5, z]], 6, "walkCream", { lamps: false, trees: false, benches: false, bushes: false }));
    /* 妖怪屋敷（中はお化け屋敷） */
    w.yomaShop(RX + 2, 656, 24, 16, 9, { ry: Math.PI / 2, key: "yPurple", shop: "shopD", roof: "kawara", roofKey: "kwB", sign: "妖怪屋敷", signColor: "#1a0a1a", noren: "norP", lanterns: 3, eyes: { iris: "irisC" }, inside: { type: "haunted", name: "妖怪屋敷" } });
    /* ドラゴンコースター（西のはしを1周）：頭つきの先頭車 */
    { const C = []; for (let i = 0; i < 40; i++) { const t = i / 40, a = t * TAU, zc = 530, rz = 148, rx = 8.5; C.push(new T.Vector3(-737 + Math.cos(a) * rx, 3.5 + Math.max(0, Math.sin(a * 3 + 0.5)) * 8.5, zc + Math.sin(a) * rz)); }
      const curve = new T.CatmullRomCurve3(C, true, "centripetal"), F = XRides.frames(curve, true, false, 900);
      XRides.trackMeshes(w, F, "railRed" in w.m ? "railRed" : "pRed", 1.4, 8);
      let s0 = 0, ymin = 1e9; for (let i = 0; i < F.n; i++) if (F.pos[i].y < ymin - 0.01) { ymin = F.pos[i].y; s0 = i / F.n * F.L; }
      const cars = XRides.coasterCars(w, [0x2a9a4a, 0xffc830, 0x2a9a4a, 0xffc830]);
      { const hd = new T.Group(); const h = new T.Mesh(new T.SphereGeometry(0.9, 14, 10), w.m.propGreen || w.m.pGreen); hd.add(h); [-1, 1].forEach((s) => { const e = new T.Mesh(new T.SphereGeometry(0.3, 8, 6), w.m.eyeW); e.position.set(s * 0.4, 0.3, 0.7); hd.add(e); const hn = new T.Mesh(new T.ConeGeometry(0.16, 0.6, 6), w.m.propYellow || w.m.gold); hn.position.set(s * 0.45, 0.9, -0.1); hd.add(hn); }); hd.position.set(0, 1.2, 1.9); cars[0].add(hd); }
      const R = XRides.rideReg(w, { id: "wdragon", name: "ドラゴンコースター", kind: "coaster", F, cars, s: 0, v: 8, s0, busy: false, gap: 3.1, chain: 5 });
      const top = F.pos.reduce((m, p) => Math.max(m, p.y), 0);
      const S1 = { p: new T.Vector3(), t: new T.Vector3(), n: new T.Vector3() }, S2 = { p: new T.Vector3(), t: new T.Vector3(), n: new T.Vector3() };
      w.anim.push((dt) => { if (R.busy) return; const Sx = XRides.sample(F, R.s, S1); R.v = Math.max(7, Math.sqrt(Math.max(0, 2 * 9.8 * (top + 1.5 - Sx.p.y)))) * 0.85; R.s = (R.s + R.v * dt) % F.L; R.cars.forEach((c, i) => XRides.placeCar(c, XRides.sample(F, R.s - i * R.gap, S2), 0.3)); });
      const st = XRides.station(w, F, s0 + 4, "DRAGON COASTER", "#1a6a2a"); XRides.rideAt(w, st, "ドラゴンコースターに乗る（家族で楽しめるコースター）", () => ({ rideId: "wdragon" }), "🐉");
      if (st.x > st.px + 1) w.route([[st.x, st.z], [PX - 5, st.z]], 6, "walkCream", { lamps: false, trees: false, benches: false, bushes: false }); }          /* ★★ 2026-09-30b 入口が東（通りの側）のときだけまっすぐ。西なら自動の道がつなぐ（前はホームの上を道が通った） */
    /* 屋台の通り（東がわ） */
    const Y = [["たこ焼き", "norO", "takoyaki"], ["わたあめ", "norP", "icecream"], ["やきそば", "norK", "ramen"], ["りんごあめ", "norR", "dango"], ["くじびき", "norB", null], ["金魚すくい", "norB", null], ["クレープ", "norP", "crepe"], ["ラムネ", "norG", null], ["焼きとうもろこし", "norO", null], ["お面屋", "norK", null]];
    Y.forEach(([nm, nr, prop], i) => { const z = 406 + i * 26, x = PX + 13; w.yatai(x, z, -Math.PI / 2, nm, nr, prop); });
    w.plazaCrowd(-668, 372, 14, 1.2); w.plazaCrowd(PX, 530, 60, 0.9);
    w.areaGate(-649, 372, Math.PI / 2, "wonder", "big");
    w.forestOpen.push([-700, 520, 170]);
    (w.roadEdges = w.roadEdges || []).push(["wonder", "space"], ["wonder", "aqua"]);
  };

  /* ══════════════ 36 妖魔温泉街 ══════════════ */
  P.buildOnsen = function () {
    const w = this, RX = -500, Z0 = -30, Z1 = 90;
    w.areaZone("onsen");
    w.places.push(["36 妖魔温泉街（湯の川）", RX, 86, Math.PI]);
    w.river([[RX, Z0], [RX, Z1 - 12]], 7, { kind: "canal" });
    w.rect("stoneBeige", RX - 17, Z1 - 12, RX + 17, Z1 + 8, 0.02);            /* 入口の石だたみの広場（川はここで終わる） */
    [-1, 1].forEach((s) => w.route([[RX + s * 12, Z0 - 6], [RX + s * 12, Z1 + 8]], 9, "stoneBeige", { lamps: false, trees: false, benches: false, bushes: false }));
    w.taikoBridge(RX, 30, Math.PI / 2, 14, 4, 2.6);
    /* 旅館（両がわ・3階・のれん「ゆ」・提灯） */
    const INN = [["旅館 月見荘", "yCream"], ["湯宿 ろくろ", "yTeal"], ["宿 かっぱの湯", "yGreen"], ["旅館 狐火", "yOrange"], ["湯の宿 天狗", "yRed"], ["宿 ぬらりひょん", "yPurple"], ["旅館 雪女", "yBlue"], ["湯宿 化け猫", "yPink"]];
    INN.forEach(([nm, key], i) => { const s = i % 2 ? 1 : -1, k = Math.floor(i / 2), z = Z0 + 8 + k * 26, x = RX + s * 26;
      w.yomaShop(x, z, 18, 12, 10.5, { ry: s < 0 ? Math.PI / 2 : -Math.PI / 2, key, shop: "shopA", roof: "kawara", roofKey: ["kwB", "kwG", "kwO", "kwR"][i % 4], sign: nm, signColor: "#2a1a10", noren: "norB", lanterns: 2, signV: "ゆ", eyes: i % 3 === 0 ? { iris: "irisE" } : null, inside: { type: i % 2 ? "room" : "spa", name: nm } }); });
    /* 大浴場（北）・足湯（川ぞい）・湯けむり */
    w.yomaShop(RX, Z0 - 22, 30, 18, 11, { ry: 0, key: "yCream", shop: "shopD", roof: "kawara", roofKey: "kwG", rh: 5, sign: "妖魔の湯 大浴場", signColor: "#1a3a6a", noren: "norB", lanterns: 4, signV: "ゆ", inside: { type: "spa", name: "妖魔の湯 大浴場" } });
    [[RX - 6.2, 62], [RX + 6.2, 62]].forEach(([x, z]) => { w.pool(x, z, 2.6, 14, 0, "fountain"); for (let k = 0; k < 5; k++) w.seats.push({ x: x + (x < RX ? -1.8 : 1.8), z: z - 5.6 + k * 2.8, yaw: x < RX ? Math.PI / 2 : -Math.PI / 2, h: 0.45 }); w.box("woodLight", x + (x < RX ? -1.8 : 1.8), 0, z, 0.8, 0.42, 14); });
    w.sign("足湯（あしゆ）すわって足をあたためよう", { bg: "#1a3a6a", color: "#fff", px: 1024 }, 7, 0.7, RX, 1.6, 71, 0);
    { const puffs = []; const pm = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, depthWrite: false }); for (let i = 0; i < 26; i++) { const m = new T.Mesh(new T.SphereGeometry(1.2, 10, 8), pm); m.userData = { x: RX + (Math.random() - 0.5) * 12, z: 40 + Math.random() * 40, ph: Math.random() * 6 }; w.scene.add(m); puffs.push(m); w.loose(m, 300); }
      w.anim.push((dt, t) => puffs.forEach((m) => { const u = m.userData, k = ((t * 0.25 + u.ph) % 1); m.position.set(u.x + Math.sin(t + u.ph) * 0.6, 0.6 + k * 5, u.z); m.scale.setScalar(0.6 + k * 1.6); })); }
    for (let z = Z0 + 4; z < Z1; z += 12) w.lanternString(RX - 12, z, RX + 12, z, 5.6, 7, z);
    w.plazaCrowd(RX, 30, 40, 0.9);
    w.areaGate(RX, Z1 + 4, 0, "onsen", "big");
    w.forestOpen.push([RX, 30, 70]);
    (w.roadEdges = w.roadEdges || []).push(["onsen", "shrine"], ["onsen", "ent"], ["onsen", "metro"]);
  };

  /* ══════════════ 37 SKY GARDEN ══════════════ */
  P.buildSkyGarden = function () {
    const w = this, CX = 415, CZ = 430, RY = 64, R0 = 30, R1 = 40;
    w.areaZone("sky");
    w.places.push(["37 SKY GARDEN（空中庭園の塔）", CX, CZ + 48, Math.PI]);
    w.disk(CX, CZ, 44, "plaza", 0.016); w.pond(CX + 26, CZ + 28, 5, "fountain");
    const lm = w._landmark; w._landmark = true;
    [[CX - 13, CZ - 12, 12, 150, "gTeal"], [CX + 13, CZ - 12, 13, 176, "gPurple"], [CX, CZ + 16, 12, 132, "gBlue"]].forEach(([x, z, s, h, key], i) => w.futureTower(x, z, s, h, { key, twist: 0.7 + i * 0.3, band: ["neonCyan", "neonPink", "neonYellow"][i] }));
    /* 空中庭園の輪（木・花・ベンチ・ガラスの手すり） */
    w.geo("white2", new T.RingGeometry(R0, R1, 72, 1).rotateX(-Math.PI / 2), CX, RY + 0.4, CZ); w.geo("lawnPark", new T.RingGeometry(R0 + 1.5, R1 - 1.5, 72, 1).rotateX(-Math.PI / 2), CX, RY + 0.45, CZ);
    w.geo("white2", new T.CylinderGeometry(R1 + 0.2, R1, 1.4, 72, 1, true), CX, RY - 0.3, CZ); w.geo("gold", new T.TorusGeometry(R1, 0.14, 4, 96).rotateX(Math.PI / 2), CX, RY + 1.7, CZ); w.geo("glassClear", new T.CylinderGeometry(R1, R1, 1.2, 72, 1, true), CX, RY + 1.1, CZ);
    w.geo("gold", new T.TorusGeometry(R0, 0.12, 4, 96).rotateX(Math.PI / 2), CX, RY + 1.7, CZ); w.geo("glassClear", new T.CylinderGeometry(R0, R0, 1.2, 72, 1, true), CX, RY + 1.1, CZ);
    w.geo("neonCyan", new T.TorusGeometry(R1 + 0.25, 0.1, 4, 96).rotateX(Math.PI / 2), CX, RY - 0.9, CZ);
    for (let i = 0; i < 18; i++) { const a = i / 18 * TAU, r = (R0 + R1) / 2 + (i % 2 ? 2.6 : -2.6); w.geo("leafLight", new T.IcosahedronGeometry(1.6, 1), CX + Math.cos(a) * r, RY + 2.6, CZ + Math.sin(a) * r); w.geo("trunk" in w.m ? "trunk" : "woodDark2", new T.CylinderGeometry(0.18, 0.24, 1.6, 6), CX + Math.cos(a) * r, RY + 1.2, CZ + Math.sin(a) * r); }
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; w.geo("white2", new T.CylinderGeometry(0.6, 0.8, RY, 10), CX + Math.cos(a) * (R1 - 1), RY / 2, CZ + Math.sin(a) * (R1 - 1)); w.colCircle(CX + Math.cos(a) * (R1 - 1), CZ + Math.sin(a) * (R1 - 1), 0.9); }
    w._landmark = lm;
    const def = { name: "SKY GARDEN", x: CX, z: CZ, fx: CX, fz: CZ + 44, fyaw: 0, lift: { x: CX, z: CZ + R1 + 2.2, ax: 0, az: 1, y0: 0.3, topF: 16 },
      floors: [{ label: "16F", name: "空中庭園（64m）", deck: { x: CX, z: CZ, y: RY + 0.5, rIn: R0 + 0.8, rOut: R1 - 0.8, exitR: R0 + 3, name: "SKY GARDEN 空中庭園（64m）" } }] };
    def.floors[0].deck.exitR = 0; def.floors[0].deck.exitX = CX; def.floors[0].deck.exitZ = CZ + (R0 + R1) / 2; def.floors[0].deck.exitR = 2.8;
    w.box("chromeB", CX, 0, CZ + R1 + 1.2, 3.2, 3.2, 0.4); w.sign("SKY GARDEN ▲ ガラスのエレベーター", { bg: "#0a3a3a", color: "#fff", glow: "#7fe8ff", px: 1024 }, 6, 0.8, CX, 3.8, CZ + R1 + 1.45, 0);
    w.interact(CX, CZ + R1 + 3, 3, "空中庭園（高さ 64m）へ（ガラスのエレベーター）", () => ({ roomFloors: def }), "🌿");
    w.plazaCrowd(CX, CZ, 22, 0.8);
    w.areaGate(CX, CZ + 54, 0, "sky", "big");
    w.forestOpen.push([CX, CZ, 60]);
    (w.roadEdges = w.roadEdges || []).push(["sky", "media"], ["sky", "night"]);
  };
})();
