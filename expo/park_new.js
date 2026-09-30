/* ══════════════════════════════════════════════════════════════════
   XEVARION PARK — 新しいエリア（★★ 2026-09-29d ご指定「エリア間のスペースを新たなエリアとして展開・より密度の高いテーマパーク」
   「大きい建物や高い建物の複数追加」「妖怪ウォッチの世界感かつ未来の街」「NGX本社ビルとそのエリアを豪華かつ超壮大に」
   「それぞれのアプリをモチーフにした建物をそれぞれ別に新たに設立し、アプリにアクセスできるように」）
   ------------------------------------------------------------------
   28 NGX GLOBAL HQ（北東）… 地上250m の NGX タワー（青いガラス・金の柱・3つの光の輪・金の NGX ロゴ・190m の展望フロア）、
        ロビー（公式サイト・エレベーター）、会議棟（巻きつく大画面「つなぐ、すべてを。広がる、未来を。」）、研究棟（ガラスのドーム）、
        カフェテリア、和館（朱の塔と NGX の大旗）、噴水の広場（青いオーブ）・案内板・空に浮かぶ島・飛行船。
   29 APP STREET（ゲートの東）… アプリごとの建物 27 棟（屋根の上にアプリのしるし・入口の E でアプリへ）。
   30 YOKAI SHOTENGAI 妖怪商店街（ゲートの西）… アーケードの商店街（駄菓子・ラーメン・銭湯・ガチャ…・目のある店）。
   32 FUTURE HEIGHTS（東の高層ビル街）… 90〜150m のビル 8 本（ねこ耳・月・ねじれ・目・提灯・らせん・クリスタル・金の冠）。
   33 YOKAI SHRINE FOREST 妖怪神社の森（西）… 本殿・千本鳥居・五重塔・御神木・池と太鼓橋・おみくじ。
   ・キャラクター・ロゴ・建物はオリジナル（既存作品のものは使わない）。NGX のロゴはご提供の画像。
   ══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const T = THREE, X = XTex, P = XWorld.World.prototype, TAU = Math.PI * 2, XP = XPark, MOBILE = XP.MOBILE;
  const rnd = (seed) => X.rnd(seed);
  const texMat = (w, key, src, o) => { if (!w.m[key]) { const m = new T.MeshBasicMaterial(Object.assign({ map: X.imgTex(src), transparent: true, toneMapped: false, side: T.DoubleSide, depthWrite: false }, o || {})); w.m[key] = m; w.nightMats.push({ m, base: new T.Color(1, 1, 1), day: 1, night: 1.35 }); } return key; };

  /* ══════════════ 28 NGX GLOBAL HQ ══════════════ */
  P.buildNGX = function () {
    const w = this, TX = 640, TZ = -240, PX = 600, PZ = -185;
    w.areaZone("ngx");
    w.places.push(["28 NGX GLOBAL HQ（本社前の広場）", PX - 10, PZ + 30, Math.PI * 0.8]);
    const logo = texMat(w, "ngxLogo", "img/ngx_logo.webp"), mark = texMat(w, "ngxMark", "img/ngx_mark.webp");
    const lm = w._landmark; w._landmark = true;
    /* ── 広場（円・噴水・青いオーブ） ── */
    w.disk(PX, PZ, 34, "walkCream", 0.014); w.disk(PX, PZ, 28, "plaza", 0.017, 22);
    for (let i = 0; i < 24; i++) { const a = i / 24 * TAU, g = new T.PlaneGeometry(0.6, 6); g.rotateX(-Math.PI / 2); g.rotateY(-a); w.batch.add("walkY", w.m.walkY, g, new T.Matrix4().makeTranslation(PX + Math.cos(a) * 25, 0.02, PZ + Math.sin(a) * 25)); }
    { const rim = new T.TorusGeometry(14, 0.7, 10, 72); rim.rotateX(Math.PI / 2); w.geo("stoneW", rim, PX, 0.7, PZ); w.geo("stoneW", new T.CylinderGeometry(14, 14.3, 0.7, 72, 1, true), PX, 0.35, PZ); w.colCircle(PX, PZ, 14.8);
      w.water(new T.CircleGeometry(13.8, 72).rotateX(-Math.PI / 2), PX, 0.55, PZ, "fountain");
      w.geo("stoneW", new T.CylinderGeometry(2.2, 3.4, 3.2, 16), PX, 1.6, PZ); w.geo("gold", new T.TorusGeometry(3.1, 0.25, 8, 32).rotateX(Math.PI / 2), PX, 3.2, PZ);
      const orbM = new T.MeshStandardMaterial({ color: 0x3a8aff, emissive: 0x2a6aff, emissiveIntensity: 0.9, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.92 }); w.nightMats.push({ m: orbM, day: 0.7, night: 1.8 });
      const orb = new T.Mesh(new T.SphereGeometry(3.6, 32, 20), orbM); orb.position.set(PX, 7.6, PZ); w.scene.add(orb);
      const rings = [0, 1, 2].map((i) => { const r = new T.Mesh(new T.TorusGeometry(4.8 + i * 0.9, 0.12, 6, 64), w.m[i === 1 ? "gold" : "neonCyan"]); r.position.copy(orb.position); w.scene.add(r); return r; });
      const jets = []; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, m = new T.Mesh(new T.CylinderGeometry(0.12, 0.28, 1, 8), new T.MeshBasicMaterial({ color: 0xcff4ff, transparent: true, opacity: 0.55, depthWrite: false })); m.position.set(PX + Math.cos(a) * 9, 0.6, PZ + Math.sin(a) * 9); w.scene.add(m); jets.push(m); }
      w.anim.push((dt, t) => { orb.position.y = 7.6 + Math.sin(t * 0.9) * 0.4; orb.rotation.y = t * 0.3; rings.forEach((r, i) => { r.position.y = orb.position.y; r.rotation.set(Math.PI / 2 + Math.sin(t * 0.6 + i) * 0.7, t * (0.4 + i * 0.2), Math.cos(t * 0.5 + i) * 0.5); }); jets.forEach((m, i) => { const h = 4 + 2.5 * Math.sin(t * 2 + i * 0.8); m.scale.y = h; m.position.y = 0.6 + h / 2; }); });
      w.casterCircle(PX, PZ, 14, 9); }
    /* 案内板（会議棟・研究棟・展望フロア・カフェテリア）と NGX の旗 */
    { const bx = PX + 20, bz = PZ + 24;
      w.box("pNavy", bx, 0, bz, 0.4, 5.2, 0.4); w.box("pNavy", bx + 3.4, 0, bz, 0.4, 5.2, 0.4);
      [["会議棟  →", "#3a3aa8"], ["研究棟  ↖", "#3a3aa8"], ["展望フロア  ↑", "#3a3aa8"], ["カフェテリア  →", "#3a3aa8"]].forEach(([t, c], i) => w.sign(t, { bg: c, color: "#fff", border: "#ffd86a", px: 512, both: true }, 3.2, 0.72, bx + 1.7, 4.6 - i * 0.95, bz, Math.PI * 0.2));
      w.colCircle(bx + 1.7, bz, 2); }
    for (let i = 0; i < 8; i++) { const a = Math.PI * (0.35 + i / 7 * 0.9), x = PX + Math.cos(a) * 31, z = PZ + Math.sin(a) * 31; w.box("gold", x, 0, z, 0.3, 9, 0.3); w.geo(logo, new T.PlaneGeometry(2.6, 1.0).rotateY(-a + Math.PI / 2), x + Math.cos(a) * 0.2, 7.2, z + Math.sin(a) * 0.2); w.box("pNavy", x + Math.cos(a) * 0.25, 5.8, z + Math.sin(a) * 0.25, 0.05, 3.2, 1.6, { ry: -a + Math.PI / 2 }); w.colCircle(x, z, 0.3); }
    /* ── NGX タワー ── */
    const podR = 44, podH = 24, doorA = Math.atan2(PZ - TZ, PX - TX);          /* ★★ 2026-09-30 より高く広く大きく（ご指定）：足もとの館 半径44m・高さ24m（3層） */
    w.roundInterior(TX, TZ, podR - 1, 7.2, doorA, { type: "lobby", name: "NGX 本社 ロビー", floor: "marble", inner: "white2", ceil: "white2", gap: 0.16 });
    { const gap = 0.16, th0 = Math.PI / 2 - doorA + gap, thl = TAU - gap * 2;
      w.geo("gBlue", new T.CylinderGeometry(podR, podR, podH, 64, 1, true, th0, thl), TX, podH / 2, TZ);
      w.geo("gBlue", new T.CylinderGeometry(podR, podR, podH - 7.4, 64, 1, true, th0 - gap * 2 + 0.001, gap * 2), TX, 7.4 + (podH - 7.4) / 2, TZ);
      for (let i = 0; i < 64; i++) { const a = i / 64 * TAU; if (Math.abs(Math.atan2(Math.sin(a - doorA), Math.cos(a - doorA))) < gap) continue; w.box("gold", TX + Math.cos(a) * (podR + 0.1), 0, TZ + Math.sin(a) * (podR + 0.1), 0.35, podH, 0.5, { ry: -a + Math.PI / 2 }); }
      [8, 16].forEach((y) => { w.geo("white2", new T.CylinderGeometry(podR + 0.6, podR + 0.6, 0.9, 96, 1, true), TX, y, TZ); w.geo("neonCyan", new T.TorusGeometry(podR + 0.62, 0.1, 4, 96).rotateX(Math.PI / 2), TX, y - 0.3, TZ); });
      [4, 12, 20].forEach((y) => w.geo("chromeB", new T.TorusGeometry(podR + 0.15, 0.18, 4, 96).rotateX(Math.PI / 2), TX, y, TZ));
      w.geo("white2", new T.CylinderGeometry(podR + 1.2, podR + 1.2, 1, 64), TX, podH + 0.5, TZ);
      w.geo("gold", new T.TorusGeometry(podR + 1.25, 0.3, 6, 96).rotateX(Math.PI / 2), TX, podH + 1, TZ);
      /* 入口：金の門・「NGX 本社」・ひさし */
      const ex = TX + Math.cos(doorA) * (podR + 0.2), ez = TZ + Math.sin(doorA) * (podR + 0.2), ery = -doorA + Math.PI / 2;
      w.box("gold", ex, 0, ez, 12, 0.6, 0.8, { ry: ery }); w.box("pNavy", ex, 7.4, ez, 13, 2.2, 0.8, { ry: ery });
      w.sign("NGX 本社", { bg: "#0a1450", color: "#fff", glow: "#7fd8ff", border: "#ffd86a", px: 512 }, 8, 1.6, ex + Math.cos(doorA) * 0.45, 8.5, ez + Math.sin(doorA) * 0.45, Math.atan2(Math.cos(doorA), Math.sin(doorA)));
      w.box("white2", ex + Math.cos(doorA) * 5, 6.6, ez + Math.sin(doorA) * 5, 14, 0.4, 10, { ry: ery }); w.box("neonCyan", ex + Math.cos(doorA) * 5, 6.5, ez + Math.sin(doorA) * 5, 14.1, 0.06, 10.1, { ry: ery });
      /* 階段（入口の前・3段） */
      for (let k = 0; k < 3; k++) w.box("stoneW", ex + Math.cos(doorA) * (2.4 + k * 0.9), 0, ez + Math.sin(doorA) * (2.4 + k * 0.9), 16 - k, 0.2 + (2 - k) * 0.12, 0.9, { ry: ery });
    }
    /* 塔の本体（段々に細く・金の柱・銀の帯） */
    const SEG = [[26, podH + 1, 120], [22, 120, 220], [18, 220, 310], [14, 310, 360], [10, 360, 390]];          /* ★★ 2026-09-30 高さ 390m（とがり屋根・光の針で 455m） */
    SEG.forEach(([r, y0, y1]) => {
      const h = y1 - y0; w.geo("gBlue", new T.CylinderGeometry(r, r, h, 48, 1, false), TX, y0 + h / 2, TZ);
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + 0.13; w.box("gold", TX + Math.cos(a) * (r + 0.12), y0, TZ + Math.sin(a) * (r + 0.12), 0.6, h, 0.7, { ry: -a + Math.PI / 2 }); }
      for (let y = y0 + 6; y < y1 - 1; y += 12) w.geo("chromeB", new T.TorusGeometry(r + 0.2, 0.22, 4, 64).rotateX(Math.PI / 2), TX, y, TZ);
      w.geo("white2", new T.CylinderGeometry(r + 1.4, r + 1.4, 1.2, 48), TX, y1 - 0.6, TZ); w.geo("neonCyan", new T.TorusGeometry(r + 1.45, 0.14, 4, 64).rotateX(Math.PI / 2), TX, y1 - 0.6, TZ);
    });
    w.caster(TX, TZ, 56, 56, 390);
    /* 金の NGX ロゴ（3面）・ロゴのしるし */
    [doorA, doorA + TAU / 3, doorA - TAU / 3].forEach((a, i) => { const r = i ? 22.9 : 26.9, y = i ? 170 : 84, sw = i ? 30 : 42; w.geo(logo, new T.PlaneGeometry(sw, sw * 0.367).rotateY(-a + Math.PI / 2), TX + Math.cos(a) * r, y, TZ + Math.sin(a) * r); });
    w.geo(mark, new T.PlaneGeometry(16, 12.3).rotateY(-doorA + Math.PI / 2), TX + Math.cos(doorA) * 14.2, 336, TZ + Math.sin(doorA) * 14.2);
    /* てっぺん：ガラスのとがり屋根・金の冠・光 */
    w.geo("glassDome", new T.ConeGeometry(10, 30, 24), TX, 390 + 15, TZ); w.geo("gold", new T.TorusGeometry(10.2, 0.5, 6, 48).rotateX(Math.PI / 2), TX, 390.4, TZ);
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; w.geo("gold", new T.ConeGeometry(0.8, 6, 6), TX + Math.cos(a) * 9.6, 393, TZ + Math.sin(a) * 9.6); }
    w.geo("chromeB", new T.CylinderGeometry(0.35, 0.8, 34, 8), TX, 420 + 17, TZ); w.geo("neonCyan", new T.SphereGeometry(1.4, 12, 8), TX, 455, TZ);
    /* 展望フロア（310m・ぐるりとガラスの手すり） */
    w.geo("white2", new T.RingGeometry(14.2, 25.5, 64, 1).rotateX(-Math.PI / 2), TX, 310.75, TZ); w.geo("gold", new T.CylinderGeometry(25.6, 24.6, 1.4, 64, 1, true), TX, 310.05, TZ);
    w.geo("glassClear", new T.CylinderGeometry(25.4, 25.4, 1.3, 64, 1, true), TX, 311.45, TZ); w.geo("gold", new T.TorusGeometry(25.4, 0.1, 4, 96).rotateX(Math.PI / 2), TX, 312.1, TZ);
    w.box("pNavy", TX + Math.cos(doorA) * 14.3, 310.8, TZ + Math.sin(doorA) * 14.3, 3.2, 3.0, 0.3, { ry: -doorA + Math.PI / 2 }); w.box("neonCyan", TX + Math.cos(doorA) * 14.5, 313.6, TZ + Math.sin(doorA) * 14.5, 3.2, 0.2, 0.1, { ry: -doorA + Math.PI / 2 });
    /* 3つの光の輪（ゆっくり回る） */
    { const hm = [new T.MeshStandardMaterial({ color: 0x9fd8ff, emissive: 0x3a8aff, emissiveIntensity: 1.0, metalness: 0.6, roughness: 0.2 }), w.m.gold, new T.MeshStandardMaterial({ color: 0xd8b8ff, emissive: 0x8a4aff, emissiveIntensity: 0.9, metalness: 0.6, roughness: 0.2 })];
      hm.forEach((m) => { if (m !== w.m.gold) w.nightMats.push({ m, day: 0.8, night: 2.0 }); });
      const halos = [[40, 1.2, 100, 0.18], [50, 1.0, 200, -0.12], [33, 1.0, 286, 0.3]].map(([r, tb, y, tilt], i) => { const g = new T.Mesh(new T.TorusGeometry(r, tb, 10, 128), hm[i]); g.position.set(TX, y, TZ); g.rotation.x = Math.PI / 2 + tilt; w.scene.add(g); w.loose(g, 2000); return { g, y, tilt, s: [0.05, -0.035, 0.07][i] }; });
      w.anim.push((dt, t) => halos.forEach((h, i) => { h.g.rotation.z = t * h.s; h.g.rotation.x = Math.PI / 2 + h.tilt + Math.sin(t * 0.2 + i) * 0.05; h.g.position.y = h.y + Math.sin(t * 0.4 + i * 2) * 1.2; })); }
    /* ロビーの中：受付・大きなロゴの壁・エレベーター（展望フロアへ）・公式サイト */
    { const bx = TX - Math.cos(doorA) * 14, bz = TZ - Math.sin(doorA) * 14, bry = -doorA + Math.PI / 2;
      w.box("gSilver", bx, 0, bz, 10, 7, 0.6, { ry: bry, collide: true }); w.geo(logo, new T.PlaneGeometry(9, 3.3).rotateY(bry), bx + Math.cos(doorA) * 0.35, 4.2, bz + Math.sin(doorA) * 0.35);
      const dx = TX - Math.cos(doorA) * 5, dz = TZ - Math.sin(doorA) * 5; w.box("woodDark2", dx, 0, dz, 8, 1.1, 1.2, { ry: bry, collide: true }); w.box("gold", dx, 1.1, dz, 8.2, 0.06, 1.3, { ry: bry });
      w.sign("RECEPTION  受付", { bg: "#0a1450", color: "#fff", px: 512 }, 4, 0.6, dx + Math.cos(doorA) * 0.62, 0.7, dz + Math.sin(doorA) * 0.62, Math.atan2(Math.cos(doorA), Math.sin(doorA)));
      const eA = doorA + 0.9, eX = TX + Math.cos(eA) * 8, eZ = TZ + Math.sin(eA) * 8; w.box("chromeB", eX, 0, eZ, 3.4, 4.2, 0.5, { ry: -eA + Math.PI / 2, collide: true }); w.box("neonCyan", eX + Math.cos(eA) * 0.26, 4.25, eZ + Math.sin(eA) * 0.26, 3.4, 0.2, 0.08, { ry: -eA + Math.PI / 2 });
      w.sign("エレベーター  1F〜75F・展望 310m ▲", { bg: "#1a2a6a", color: "#fff", px: 512 }, 3.4, 0.55, eX + Math.cos(eA) * 0.3, 4.9, eZ + Math.sin(eA) * 0.3, Math.atan2(Math.cos(eA), Math.sin(eA)));
      const downX = TX + Math.cos(doorA) * (podR + 8), downZ = TZ + Math.sin(doorA) * (podR + 8);
      /* ★★ 2026-09-30 本社の中の各階（ご指定「内部のそれぞれの階層や室内などを全て作成」）：エレベーターで階をえらぶ。展望フロアへは外のガラスのエレベーター */
      const apps = ((window.EXPO_DATA && EXPO_DATA.apps) || []).map((a) => [a.name, (a.sub || "") + "　—　" + (a.full || a.name) + " の歩み（NGX のアプリ）"]);
      const lA = doorA + 0.55, lob = { x: eX + Math.cos(eA) * 1.8, z: eZ + Math.sin(eA) * 1.8, yaw: Math.atan2(-Math.cos(eA), -Math.sin(eA)) };
      const NGXD = { name: "NGX 本社タワー", x: TX, z: TZ, fx: downX, fz: downZ, fyaw: Math.atan2(Math.cos(doorA), Math.sin(doorA)), lobby: lob,
        lift: { x: TX + Math.cos(lA) * (podR + 2.4), z: TZ + Math.sin(lA) * (podR + 2.4), ax: Math.cos(lA), az: Math.sin(lA), y0: 0.3, topF: 90 },
        floors: [
          { label: "1F", name: "エントランスロビー", here: true },
          { label: "2F", name: "NGX ギャラリア（ショップ）", type: "mall" },
          { label: "3F", name: "フードホール", type: "food", w: 26, d: 18, menu: "diner" },
          { label: "5F", name: "NGX ミュージアム（アプリの歴史）", type: "gallery", w: 26, d: 20, list: apps.length ? apps : null },
          { label: "12F", name: "開発フロア", type: "office" },
          { label: "18F", name: "デザインスタジオ", type: "studio" },
          { label: "25F", name: "研究ラボ", type: "lab" },
          { label: "33F", name: "配信・撮影スタジオ", type: "showroom" },
          { label: "40F", name: "データセンター", type: "server" },
          { label: "52F", name: "大会議室", type: "meeting", w: 20, d: 14 },
          { label: "60F", name: "役員フロア", type: "exec" },
          { label: "68F", name: "スカイラウンジ", type: "lounge" },
          { label: "75F", name: "展望フロア（310m）", deck: { x: TX, z: TZ, y: 310.8, rIn: 15, rOut: 24.6, exitR: 16.4, name: "NGX タワー 展望フロア（310m）" } }
        ] };
      w.interact(eX + Math.cos(eA) * 1.6, eZ + Math.sin(eA) * 1.6, 2.6, "エレベーター（各階・展望フロア 310m）", () => ({ roomFloors: NGXD }), "🛗");
      const ngx = ((window.EXPO_DATA && EXPO_DATA.apps) || []).find((a) => a.id === "ngx");
      if (ngx) w.interact(dx + Math.cos(doorA) * 1.6, dz + Math.sin(doorA) * 1.6, 2.6, "NGX 公式サイトを開く", () => ({ open: ngx.href, app: ngx }), "🌐"); }
    /* ── 会議棟（まるい塔・巻きつく大画面） ── */
    { const cx = 700, cz = -190, r = 15, h = 72;
      w.geo("gPurple", new T.CylinderGeometry(r, r, h, 40), cx, h / 2, cz); w.colCircle(cx, cz, r + 0.2); w.casterCircle(cx, cz, r, h);
      for (let y = 8; y < h; y += 8) w.geo("chromeB", new T.TorusGeometry(r + 0.2, 0.2, 4, 48).rotateX(Math.PI / 2), cx, y, cz);
      w.geo("gold", new T.CylinderGeometry(r + 1, r + 1, 1.6, 40), cx, h, cz); w.geo("neonPink", new T.TorusGeometry(r + 1.05, 0.2, 4, 48).rotateX(Math.PI / 2), cx, h + 0.2, cz);
      const scr = new X.Screen(2048, 512), sm = new T.MeshBasicMaterial({ map: scr.tex, toneMapped: false }); w.nightMats.push({ m: sm, base: new T.Color(1, 1, 1), day: 1, night: 1.4 });
      const cyl = new T.Mesh(new T.CylinderGeometry(r + 0.5, r + 0.5, 26, 64, 1, true, Math.PI * 0.2, Math.PI * 1.6), sm); cyl.position.set(cx, 44, cz); w.scene.add(cyl); w.loose(cyl, 1500);
      w.screens.push({ scr, mesh: cyl, every: 0.08, last: -1, draw(g, W, H, t) {
        const gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, "#0a1450"); gr.addColorStop(0.5, "#2a1a7a"); gr.addColorStop(1, "#0a1450"); g.fillStyle = gr; g.fillRect(0, 0, W, H);
        const off = (t * 60) % W; g.fillStyle = "#fff"; g.font = "900 110px sans-serif"; g.textAlign = "left";
        for (let k = -1; k < 2; k++) { g.fillText("つなぐ、すべてを。 広がる、未来を。", k * W + off, 180); }
        g.fillStyle = "#ffd86a"; g.font = "900 150px sans-serif"; for (let k = -1; k < 2; k++) g.fillText("NGX", k * W + W * 0.62 + off, 400);
        g.fillStyle = "rgba(127,216,255,.5)"; for (let i = 0; i < 40; i++) { const x = (i * 97 + t * 30) % W, y = (i * 53) % H; g.fillRect(x, y, 3, 3); }
      } });
      w.sign("NGX 会議棟  CONFERENCE", { bg: "#2a1a6a", color: "#fff", glow: "#d8b8ff", px: 1024 }, 14, 1.8, cx + Math.cos(2.4) * (r + 0.3), 6, cz + Math.sin(2.4) * (r + 0.3), Math.atan2(Math.cos(2.4), Math.sin(2.4)));
      w.enterable(cx + Math.cos(2.4) * (r + 6), cz + Math.sin(2.4) * (r + 6), 14, 10, 5, Math.atan2(Math.cos(2.4), Math.sin(2.4)), { type: "theater", name: "NGX 会議室（上映）", key: "gPurple" });
    }
    /* ── 研究棟（ガラスのドームの大きな館） ── */
    { const rx = 606, rz = -300;
      w.bld(rx, rz, 50, 26, 7, { key: "white2", roof: "flat", ry: 0.35, sign: { text: "NGX 研究棟  RESEARCH LAB", bg: "#0a3a5a", w: 18, h: 1.6, y: 5.2, glow: "#7fe8ff" }, inside: { type: "lab", name: "NGX 研究棟", h: 5.5, door: 5 } });
      w.geo("glassDome", new T.CylinderGeometry(12, 12, 46, 32, 1, true, -Math.PI / 2, Math.PI).rotateZ(Math.PI / 2).rotateY(0.35), rx, 7, rz);
      for (let i = 0; i < 7; i++) { const t0 = new T.TorusGeometry(12.05, 0.18, 4, 24, Math.PI); t0.rotateY(0.35 + Math.PI / 2); const off = (i - 3) * 7.4; w.geo("white2", t0, rx + Math.cos(0.35) * off, 7, rz - Math.sin(0.35) * off); }
      w.caster(rx, rz, 50, 26, 19, 0.35);
    }
    /* ── カフェテリア（テラスつき） ── */
    w.bld(656, -170, 30, 16, 6.5, { key: "sCream", roof: "flat", ry: -1.83, crown: "neonYellow", sign: { text: "NGX カフェテリア", bg: "#6a3a1a", w: 12, h: 1.5, y: 5.2, glow: "#ffd86a" }, inside: { type: "cafe", name: "NGX カフェテリア", h: 5, door: 4 } });
    for (let i = 0; i < 6; i++) w.cafeTable(640 - Math.floor(i / 3) * 2.6, -184 + (i % 3) * 7 + Math.floor(i / 3) * 3, ["fabricW", "fabricB", "fabricY"][i % 3]);     /* ★ 2026-09-30 入口（広場がわ）の前のテラス */
    /* ── 和館（朱の塔と NGX の大旗）＝画像の左の赤い建物 ── */
    { const jx = 586, jz = -254;
      w.pagodaTower(jx, jz, 14, 4, { roofKey: "kwG" });
      w.box("gold", jx + 9, 0, jz, 0.4, 30, 0.4); w.box("pNavy", jx + 9.3, 14, jz, 0.06, 13, 7.6);
      w.geo(logo, new T.PlaneGeometry(7, 2.6).rotateY(Math.PI / 2), jx + 9.36, 21.5, jz); w.geo(mark, new T.PlaneGeometry(5.4, 4.2).rotateY(Math.PI / 2), jx + 9.36, 16.5, jz); w.colCircle(jx + 9, jz, 0.4); }
    /* ── 空に浮かぶ島（木がのった岩）と飛行船 ── */
    { const isl = [[560, -330, 96, 14], [760, -300, 122, 11], [690, -120, 84, 9]].map(([x, z, y, r], k) => {
        const g = w.captureGroup(() => { w.geo("rock", new T.DodecahedronGeometry(r, 1).scale(1, 0.55, 1).translate(0, -r * 0.2, 0)); w.geo("rockRed", new T.ConeGeometry(r * 0.8, r * 1.2, 7).rotateX(Math.PI).translate(0, -r * 0.8, 0)); w.geo("lawnPark", new T.CylinderGeometry(r * 0.92, r * 0.92, 0.6, 16).translate(0, r * 0.3, 0));
          for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + k; w.geo("trunk", new T.CylinderGeometry(0.4, 0.5, 4, 6).translate(Math.cos(a) * r * 0.45, r * 0.3 + 2, Math.sin(a) * r * 0.45)); w.geo("leafLight", new T.IcosahedronGeometry(2.4, 0).translate(Math.cos(a) * r * 0.45, r * 0.3 + 5, Math.sin(a) * r * 0.45)); }
          w.geo("woodRed", new T.BoxGeometry(3, 3, 3).translate(0, r * 0.3 + 1.5, 0)); w.geo("kwB", new T.ConeGeometry(2.8, 1.6, 4).rotateY(Math.PI / 4).translate(0, r * 0.3 + 3.8, 0)); });
        g.position.set(x, y, z); w.scene.add(g); w.loose(g, 2500); return { g, y, k }; });
      const ship = w.captureGroup(() => { w.geo("white2", new T.SphereGeometry(1, 20, 12).scale(5, 5, 16)); w.geo("pNavy", new T.BoxGeometry(3, 2, 6).translate(0, -5.6, 0)); [-1, 1].forEach((s) => w.geo("gold", new T.BoxGeometry(0.3, 4, 3).translate(s * 4.6, 0, -13))); w.geo("gold", new T.BoxGeometry(8, 0.3, 3).translate(0, 0, -13)); w.geo(logo, new T.PlaneGeometry(14, 5.2).rotateY(Math.PI / 2).translate(5.15, 1, 0)); w.geo(logo, new T.PlaneGeometry(14, 5.2).rotateY(-Math.PI / 2).translate(-5.15, 1, 0)); });
      w.scene.add(ship); w.loose(ship, 3000);
      w.anim.push((dt, t) => { isl.forEach((q) => { q.g.position.y = q.y + Math.sin(t * 0.3 + q.k * 2) * 2.5; q.g.rotation.y = t * 0.02 * (q.k % 2 ? 1 : -1); }); const a = t * 0.04; ship.position.set(TX + Math.cos(a) * 230, 150 + Math.sin(t * 0.3) * 4, TZ + Math.sin(a) * 230); ship.rotation.y = -a; }); }
    /* 木・花・街灯・人 */
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; if (Math.abs(Math.atan2(Math.sin(a - doorA), Math.cos(a - doorA))) < 0.5) continue; w.plant(i % 2 ? "sakura" : "oak", TX + Math.cos(a) * (podR + 6), TZ + Math.sin(a) * (podR + 6), 1.1); }
    w.route([[PX - Math.cos(doorA) * 16, PZ - Math.sin(doorA) * 16], [TX + Math.cos(doorA) * (podR + 3), TZ + Math.sin(doorA) * (podR + 3)]], 14, "walkY", { lamps: "yoma", lampEvery: 16, trees: false, benches: false, bushes: false });     /* ★ 2026-09-30 噴水のふちから（噴水の下を通らない） */
    w.route([[PX + 18, PZ - 22], [700 - 16, -190 + 2]], 8, "walkCream", { lamps: "yoma", lampEvery: 18, trees: false, benches: false });
    w.route([[PX - 6, PZ - 32], [606, -286]], 8, "walkCream", { lamps: "yoma", lampEvery: 18, trees: false, benches: false });
    w.plazaCrowd(PX, PZ, 30, 1.4);
    w.areaGate(PX - 30, PZ + 24, Math.PI * 0.75, "ngx", "big");
    w.forestOpen.push([TX, TZ, 60], [PX, PZ, 45]);
    w._landmark = lm;
  };

  /* ══════════════ 29 APP STREET（アプリの建物） ══════════════ */
  const TONE = { red: "#e84a4a", blue: "#3a78e8", violet: "#8e5ae8", teal: "#2fbfb0", pink: "#ff5f9f", gold: "#e6a824" };
  const TONEKEY = { red: "sRed", blue: "sBlue", violet: "sLav", teal: "sTeal", pink: "sPink", gold: "sYellow" };
  /* 屋根の上のしるし（アプリごと・オリジナル）。(x, y＝屋根の高さ, z, ry, 色) */
  const MOTIF = {
    magibattle: (w, x, y, z, ry) => { [-1, 1].forEach((s) => { w.geo("chromeB", new T.BoxGeometry(0.5, 7, 0.2).rotateZ(s * 0.6), x, y + 3.6, z, ry); w.geo("gold", new T.BoxGeometry(2.2, 0.35, 0.4).rotateZ(s * 0.6), x - s * 1.1, y + 1.2, z, ry); }); w.geo("neonOrange", new T.ConeGeometry(1.2, 3, 8), x, y + 1.5, z); },
    magilex: (w, x, y, z, ry) => { [-1, 1].forEach((s) => { w.geo("pBlue", new T.BoxGeometry(4.2, 0.35, 6).rotateZ(s * 0.32).translate(s * 2, 0, 0), x, y + 1.6, z, ry); w.geo("pWhite", new T.BoxGeometry(3.9, 0.3, 5.6).rotateZ(s * 0.32).translate(s * 1.9, 0.3, 0), x, y + 1.6, z, ry); }); w.geo("pRed", new T.BoxGeometry(0.3, 2.6, 0.05).translate(0.4, -0.6, 2.8), x, y + 2, z, ry); w.geo("neonCyan", new T.OctahedronGeometry(0.7, 0), x, y + 4.4, z); },
    magiburst: (w, x, y, z, ry) => { const sh = new T.Shape(); for (let i = 0; i <= 10; i++) { const a = i / 10 * TAU - Math.PI / 2, r = i % 2 ? 1.5 : 3.6; if (i) sh.lineTo(Math.cos(a) * r, -Math.sin(a) * r); else sh.moveTo(Math.cos(a) * r, -Math.sin(a) * r); } w.geo("pPurple", new T.ExtrudeGeometry(sh, { depth: 0.9, bevelEnabled: false }).translate(0, 0, -0.45), x, y + 4.4, z, ry); w.geo("gold", new T.TorusGeometry(4.2, 0.15, 6, 40), x, y + 4.4, z, ry); },
    magiarena: (w, x, y, z, ry) => { w.geo("sTeal", new T.CylinderGeometry(4, 4.3, 2.6, 24, 1, true), x, y + 1.3, z); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; w.geo("white2", new T.BoxGeometry(0.4, 2.8, 0.4), x + Math.cos(a) * 4.1, y + 1.4, z + Math.sin(a) * 4.1); } w.geo("gold", new T.TorusGeometry(4.2, 0.12, 4, 32).rotateX(Math.PI / 2), x, y + 2.7, z); },
    magilink: (w, x, y, z, ry) => { w.geo("pPink", new T.TorusGeometry(2, 0.4, 10, 32), x - 1.2, y + 3, z, ry); w.geo("neonPink", new T.TorusGeometry(2, 0.4, 10, 32).rotateY(Math.PI / 2), x + 1.2, y + 3, z); },
    magichainparty: (w, x, y, z, ry) => { const cols = ["pRed", "pYellow", "pBlue", "pGreen", "pPink"]; for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; w.geo(cols[i % 5], new T.SphereGeometry(0.8, 12, 8).scale(1, 1.2, 1), x + Math.cos(a) * 2.4, y + 3.2 + Math.sin(i * 1.7) * 0.8, z + Math.sin(a) * 2.4); w.geo("pWhite", new T.CylinderGeometry(0.02, 0.02, 2.4, 3), x + Math.cos(a) * 2.4, y + 1.6, z + Math.sin(a) * 2.4); } },
    magidominiongrid: (w, x, y, z) => { const cols = ["pBlue", "pRed", "pWhite"]; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { const hh = 1 + ((i + j) % 3); w.box(cols[(i * 3 + j) % 3], x + (i - 1) * 1.8, y, z + (j - 1) * 1.8, 1.6, hh, 1.6); } },
    magibocciarush: (w, x, y, z) => { w.geo("pRed", new T.SphereGeometry(2.3, 20, 14), x - 1.2, y + 2.3, z); w.geo("pBlue", new T.SphereGeometry(1.6, 16, 12), x + 2.1, y + 1.6, z + 0.6); w.geo("pWhite", new T.SphereGeometry(0.7, 12, 8), x + 0.6, y + 0.7, z - 2); },
    magirail: (w, x, y, z, ry) => { w.geo("darkMetal", new T.BoxGeometry(0.2, 0.2, 9), x - 0.7, y + 0.1, z, ry); w.geo("darkMetal", new T.BoxGeometry(0.2, 0.2, 9), x + 0.7, y + 0.1, z, ry); w.geo("pGreen", new T.BoxGeometry(2.4, 2.2, 6).translate(0, 1.4, 0), x, y, z, ry); w.geo("pWhite", new T.CylinderGeometry(1.2, 1.2, 6, 12, 1, false, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2).rotateZ(0).translate(0, 2.5, 0), x, y, z, ry); w.geo("neonYellow", new T.BoxGeometry(2.45, 0.5, 5).translate(0, 1.8, 0), x, y, z, ry); },
    magishift: (w, x, y, z) => { [[-2, "pBlack"], [0, "pWhite"], [2, "pRed"]].forEach(([dx, k]) => { w.geo(k, new T.CylinderGeometry(0.6, 1.0, 2.2, 12), x + dx, y + 1.1, z); w.geo(k, new T.SphereGeometry(0.75, 12, 8), x + dx, y + 2.7, z); }); },
    magiscope: (w, x, y, z, ry) => { w.geo("white2", new T.SphereGeometry(3, 20, 12, 0, TAU, 0, Math.PI / 2), x, y, z); w.geo("pNavy", new T.CylinderGeometry(0.7, 1.0, 7, 12).rotateZ(-0.8), x + 1.6, y + 3.2, z, ry); w.geo("neonCyan", new T.CylinderGeometry(0.72, 0.72, 0.1, 12).rotateZ(-0.8).translate(2.6, 2.4, 0), x + 1.6, y + 3.2, z, ry); },
    magiranking: (w, x, y, z) => { [[-2, 1.4, "pBlue"], [0, 2.4, "gold"], [2, 1.0, "pRed"]].forEach(([dx, hh, k]) => w.box(k, x + dx, y, z, 1.9, hh, 1.9)); w.geo("gold", new T.CylinderGeometry(0.9, 0.4, 1.6, 16), x, y + 3.4, z); w.geo("gold", new T.TorusGeometry(0.5, 0.1, 4, 16), x - 0.9, y + 3.6, z); w.geo("gold", new T.TorusGeometry(0.5, 0.1, 4, 16), x + 0.9, y + 3.6, z); },
    magicraft: (w, x, y, z) => { const r = rnd(7), cols = ["pGreen", "propBrown", "stoneGray", "pBlue", "pYellow"]; for (let i = 0; i < 12; i++) { const dx = Math.floor(r() * 4) - 2, dz = Math.floor(r() * 4) - 2, dy = Math.floor(r() * 3); w.box(cols[i % 5], x + dx * 1.3, y + dy * 1.3, z + dz * 1.3, 1.3, 1.3, 1.3); } },
    magijackpot: (w, x, y, z, ry) => { w.geo("gold", new T.BoxGeometry(6, 4.4, 2.4).translate(0, 2.2, 0), x, y, z, ry); [-1.8, 0, 1.8].forEach((dx) => w.geo("pWhite", new T.BoxGeometry(1.4, 2, 0.1).translate(dx, 2.4, 1.22), x, y, z, ry)); w.geo("pRed", new T.SphereGeometry(0.5, 10, 8).translate(3.6, 4.4, 0), x, y, z, ry); w.geo("chromeB", new T.CylinderGeometry(0.1, 0.1, 2.4, 6).translate(3.6, 3.2, 0), x, y, z, ry); w.geo("neonYellow", new T.BoxGeometry(6.1, 0.3, 2.5).translate(0, 4.5, 0), x, y, z, ry); },
    magilotto: (w, x, y, z) => { w.geo("glassDome", new T.SphereGeometry(3, 20, 14), x, y + 3.2, z); const cols = ["pRed", "pYellow", "pBlue", "pGreen", "pPink", "pOrange"]; for (let i = 0; i < 14; i++) { const a = i * 2.4, rr = 1 + (i % 3) * 0.6; w.geo(cols[i % 6], new T.SphereGeometry(0.45, 10, 8), x + Math.cos(a) * rr, y + 1.4 + (i % 4) * 0.7, z + Math.sin(a) * rr); } w.geo("gold", new T.CylinderGeometry(1.6, 2, 0.8, 16), x, y + 0.4, z); },
    magimanor: (w, x, y, z, ry) => { const sh = new T.Shape(); sh.moveTo(-3.6, 0); sh.lineTo(3.6, 0); sh.lineTo(0, 4.6); sh.lineTo(-3.6, 0); w.geo("pPurple", new T.ExtrudeGeometry(sh, { depth: 8, bevelEnabled: false }).translate(0, 0, -4), x, y, z, ry); w.geo("pNavy", new T.CylinderGeometry(1.2, 1.2, 5, 8), x + 2.8, y + 2.5, z); w.geo("pPurple", new T.ConeGeometry(1.5, 3.4, 8), x + 2.8, y + 6.7, z); w.geo("neonYellow", new T.BoxGeometry(0.6, 0.8, 0.1), x + 2.8, y + 3, z + 1.2); },
    magidiamond: (w, x, y, z, ry) => { w.geo("pWhite", new T.SphereGeometry(2.6, 20, 14), x, y + 2.8, z); w.geo("pRed", new T.TorusGeometry(2.62, 0.08, 4, 40).rotateY(0.6), x, y + 2.8, z); w.geo("pRed", new T.TorusGeometry(2.62, 0.08, 4, 40).rotateY(-0.6).rotateX(0.3), x, y + 2.8, z); w.geo("propBrown", new T.CylinderGeometry(0.25, 0.45, 6, 10).rotateZ(-0.9), x + 2.6, y + 2.4, z, ry); },
    xevynar: (w, x, y, z) => { w.geo("holoBlue", new T.SphereGeometry(3, 24, 16), x, y + 3.2, z); for (let i = 0; i < 3; i++) w.geo("neonCyan", new T.TorusGeometry(3.2 + i * 0.4, 0.07, 4, 48).rotateX(i * 1.05).rotateY(i * 0.7), x, y + 3.2, z); },
    magifocus: (w, x, y, z, ry) => { [3, 2.2, 1.4, 0.6].forEach((r, i) => w.geo(i % 2 ? "pWhite" : "pBlue", new T.TorusGeometry(r, 0.28, 6, 32), x, y + 3.6, z, ry)); w.geo("pRed", new T.SphereGeometry(0.35, 10, 8), x, y + 3.6, z); },
    magiempire: (w, x, y, z) => { w.geo("gold", new T.CylinderGeometry(3, 3.2, 1.6, 20, 1, true), x, y + 0.8, z); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; w.geo("gold", new T.ConeGeometry(0.6, 2.4, 6), x + Math.cos(a) * 3, y + 2.6, z + Math.sin(a) * 3); w.geo(["pRed", "pBlue", "pGreen"][i % 3], new T.OctahedronGeometry(0.4, 0), x + Math.cos(a) * 3.05, y + 1, z + Math.sin(a) * 3.05); } },
    magimusic: (w, x, y, z, ry) => { w.geo("pNavy", new T.TorusGeometry(3, 0.4, 8, 24, Math.PI), x, y + 1.5, z, ry); [-1, 1].forEach((s) => w.geo("pPurple", new T.CylinderGeometry(1.1, 1.1, 1, 16).rotateZ(Math.PI / 2).translate(s * 3, 0, 0), x, y + 1.5, z, ry)); w.neonIcon("note", x, y + 5.5, z, 1.2, ry, "neonPink"); },
    magiportfolio: (w, x, y, z) => { [[-2, 1.6, "pRed"], [0, 3.2, "pYellow"], [2, 5, "pGreen"]].forEach(([dx, hh, k]) => w.box(k, x + dx, y, z, 1.6, hh, 1.6)); w.geo("neonGreen", new T.ConeGeometry(0.8, 1.4, 4).rotateZ(-0.6), x + 2.8, y + 5.6, z); },
    magicounter: (w, x, y, z, ry) => { w.geo("pNavy", new T.BoxGeometry(7, 3, 0.6).translate(0, 1.9, 0), x, y, z, ry); w.geo("neonGreen", new T.BoxGeometry(6.4, 2.2, 0.1).translate(0, 1.9, 0.32), x, y, z, ry); },
    magitier: (w, x, y, z) => { ["pRed", "pOrange", "pYellow", "pGreen", "pBlue"].forEach((k, i) => w.box(k, x, y + i * 0.9, z, 6.5 - i * 1.2, 0.9, 6.5 - i * 1.2)); },
    ordyxis: (w, x, y, z, ry) => { w.geo("pWhite", new T.CylinderGeometry(2.4, 1.8, 3, 20), x, y + 1.6, z); w.geo("pWhite", new T.TorusGeometry(0.9, 0.25, 6, 16).rotateY(ry || 0).translate(0, 0, 0), x + 2.6, y + 1.8, z); w.geo("propChoco", new T.CylinderGeometry(2.2, 2.2, 0.1, 20), x, y + 3, z); w.geo("pWhite", new T.CylinderGeometry(3.4, 3.4, 0.25, 24), x, y + 0.12, z); },
    ishida: (w, x, y, z, ry) => { w.geo("pBlack", new T.BoxGeometry(2.6, 2.4, 4.4).translate(0, 1.6, 0), x, y, z, ry); [-1, 1].forEach((s) => w.geo("pBlack", new T.CylinderGeometry(1.2, 1.2, 0.4, 16).rotateZ(Math.PI / 2).translate(0, 3.8, s * 1.3), x, y, z, ry)); w.geo("chromeB", new T.CylinderGeometry(0.7, 0.9, 1.6, 12).rotateX(Math.PI / 2).translate(0, 1.6, 2.9), x, y, z, ry); },
    magicalfuture: (w, x, y, z) => { w.geo("chromeB", new T.CylinderGeometry(0.2, 0.3, 6, 8), x, y + 3, z); w.geo("neonPink", new T.TorusGeometry(2.6, 0.2, 6, 40).rotateX(Math.PI / 2), x, y + 4.4, z); w.geo("holoBlue", new T.SphereGeometry(0.9, 14, 10), x, y + 6.4, z); }
  };
  P.buildAppStreet = function () {
    const w = this, Z = 890, X0 = 134, X1 = 298, apps = ((window.EXPO_DATA && EXPO_DATA.apps) || []).filter((a) => a.id !== "ngx" && a.href);
    w.areaZone("apps");
    w.places.push(["29 APP STREET（アプリの通り）", X0 + 8, Z, -Math.PI / 2]);
    w.route([[X0 - 26, Z], [X1 + 2, Z]], 14, "walkY", { lamps: "yoma", lampsBoth: true, lampEvery: 14, trees: false, benches: false, bushes: false });     /* ★ 2026-09-30 ゲートの広場までのばす */
    w.rect("walkCream", X0, Z - 22, X1, Z - 7.1, 0.016); w.rect("walkCream", X0, Z + 7.1, X1, Z + 22, 0.016);
    const per = Math.ceil(apps.length / 2), step = (X1 - X0) / per;
    apps.forEach((app, i) => {
      const side = i % 2 ? 1 : -1, k = Math.floor(i / 2), x = X0 + step * (k + 0.5), z = Z + side * 21.5, ry = side < 0 ? 0 : Math.PI, col = TONE[app.tone] || "#3a78e8", key = TONEKEY[app.tone] || "sBlue";
      const bw = step - 1.6, bd = 22, h = 9 + ((k * 7 + (side > 0 ? 3 : 0)) % 4) * 1.8;
      const top = w.bld(x, z, bw, bd, h, { ry, key, shop: "shopA", roof: "flat", crown: "neonCyan", parapetKey: "white2", sign: { text: app.name, bg: col, w: Math.min(bw - 1, 10), h: 1.6, y: h - 1.4, glow: "#ffffff", border: "#ffffff" } });
      const fx = x, fz = z - side * (bd / 2 + 0.12), face = side < 0 ? 0 : Math.PI;
      const tk = texMat(w, "appT_" + app.id, "../" + app.img, { transparent: false, depthWrite: true });
      w.geo(tk, new T.PlaneGeometry(Math.min(bw - 2, 7.2), Math.min(bw - 2, 7.2) * 0.5625).rotateY(face), fx, 6.4, fz - side * 0.02);
      w.box("gold", fx, 4.6, fz + side * 0.05, Math.min(bw - 1.6, 7.8), Math.min(bw - 2, 7.2) * 0.5625 + 0.5, 0.08, { ry: face });
      w.sign(app.sub || "", { bg: "#0a1430", color: "#fff", px: 512 }, Math.min(bw - 2, 7), 0.62, fx, 3.2, fz - side * 0.06, face);
      (MOTIF[app.id] || MOTIF.magicalfuture)(w, x, top, z, ry, col);
      w.interact(fx, fz - side * 2.2, 3.2, app.name + "（" + (app.sub || "アプリ") + "）を開く", () => ({ open: app.href, app }), "📱");
    });
    /* 通りのまん中：アプリの旗・花のプランター */
    for (let x = X0 + 10; x < X1; x += 20) { w.flag(x, Z - 6.4, 0x3a8aff, 7); w.flag(x + 10, Z + 6.4, 0xff5f9f, 7); }
    w.plazaCrowd((X0 + X1) / 2, Z, 60, 0.6);
    w.areaGate(X0 - 2, Z, Math.PI / 2, "apps", "big");
    w.forestOpen.push([(X0 + X1) / 2, Z, 100]);
  };

  /* ══════════════ 30 YOKAI SHOTENGAI 妖怪商店街 ══════════════ */
  P.buildYokaiStreet = function () {
    const w = this, Z = 890, X0 = -298, X1 = -134;
    w.areaZone("yokai");
    w.places.push(["30 妖怪商店街（アーケード）", X1 - 8, Z, Math.PI / 2]);
    w.route([[X1 + 26, Z], [X0 - 2, Z]], 14, "brickPave", { lamps: false, trees: false, benches: false, bushes: false });     /* ★ 2026-09-30 ゲートの広場までのばす */
    w.rect("stoneBeige", X0, Z - 22, X1, Z - 7.1, 0.016); w.rect("stoneBeige", X0, Z + 7.1, X1, Z + 22, 0.016);
    /* アーケードの屋根（半透明のアーチ・柱・色とりどりの垂れ幕・提灯） */
    { const L = X1 - X0 - 8, cx = (X0 + X1) / 2;
      w.geo("glassDomeP", new T.CylinderGeometry(8.4, 8.4, L, 24, 1, true, 0, Math.PI).rotateZ(Math.PI / 2).scale(1, 0.42, 1), cx, 7.4, Z);
      for (let x = X0 + 4; x <= X1 - 4; x += 12) { [-1, 1].forEach((s) => { w.box("woodRed", x, 0, Z + s * 7.6, 0.4, 7.6, 0.4, { collide: true }); w.caster(x, Z + s * 7.6, 0.5, 0.5, 7.6); }); const t0 = new T.TorusGeometry(8.4, 0.18, 4, 20, Math.PI).rotateY(Math.PI / 2).scale(1, 0.42, 1); w.geo("woodRed", t0, x, 7.4, Z);
        const cols = ["#e84a4a", "#3a78e8", "#ffc830", "#2fbfb0", "#ff5f9f"]; w.sign(["妖怪商店街", "YOKAI SHOTENGAI", "よってらっしゃい", "ようこそ", "妖の夜まつり"][(x / 12 | 0) % 5], { bg: cols[(x / 12 | 0) % 5], color: "#fff", px: 512, both: true }, 5, 0.8, x, 6.2, Z, Math.PI / 2); }
      for (let x = X0 + 10; x <= X1 - 10; x += 12) w.lanternString(x, Z - 7.6, x, Z + 7.6, 6.8, 5, x);
      w.caster(cx, Z, L, 16, 8.2); w.casters[w.casters.length - 1].gate = true; }
    /* 入口の門（両はし） */
    [[X1 + 4, -Math.PI / 2], [X0 - 1, Math.PI / 2]].forEach(([x, ry]) => { w.pagodaGate(x, Z, ry + Math.PI / 2, 1.3, { roofKey: "kwB", lanKey: "lanBig" }); w.sign("妖怪商店街", { bg: "#1a0a0a", color: "#ffe7a0", glow: "#ffb04a", px: 512, both: true }, 6, 1.2, x, 9.5, Z, Math.PI / 2); });
    /* 店（北がわ・南がわ）：目のある店・大きな食べ物・のれん・提灯 */
    const SH = [
      ["駄菓子 ようかい堂", "yCream", "shop", "donut", "norP", "ヨウカイドウ"], ["妖らーめん", "yRed", "food", "ramen", "norK", "ラーメン"], ["おばけ書店", "yBrown", "gallery", null, "norB", "ショテン"],
      ["ヨーマート", "yTeal", "shop", null, "norG", "コンビニ"], ["喫茶 夜霧", "yPurple", "cafe", "coffee", "norB", "キッサ"], ["たい焼き 猫又", "yYellow", "food", "taiyaki", "norO", "タイヤキ"],
      ["ガチャ横丁", "yPink", "gacha", null, "norP", "ガチャ"], ["ゲームセンター 妖", "yBlue", "arcade", null, "norB", "ゲーム"], ["占いの館 月読", "yPurple", "lobby", null, "norP", "ウラナイ"],
      ["銭湯 妖の湯", "yTeal", "spa", null, "norB", "ユ"], ["写真館 ばけ写", "yCream", "studio", null, "norG", "シャシン"], ["お好み焼き 一反", "yOrange", "food", "okonomiyaki", "norO", "オコノミ"],
      ["カラオケ 妖声", "yRed", "karaoke", null, "norR", "カラオケ"], ["甘味処 あずき", "yGreen", "cafe", "dango", "norG", "カンミ"], ["おもちゃ屋 ばけばけ", "yYellow", "shop", null, "norO", "オモチャ"],
      ["金魚すくい", "yBlue", "arcade", null, "norB", "キンギョ"], ["豆腐屋 ぬりかべ", "yCream", "shop", null, "norK", "トウフ"], ["八百屋 かっぱ", "yGreen", "shop", null, "norG", "ヤオヤ"],
      ["焼きとり 火車", "yBrown", "food", "yakitori", "norK", "ヤキトリ"], ["花屋 あやかし", "yPink", "shop", null, "norP", "ハナ"], ["時計屋 ときわ", "yCream", "gallery", null, "norB", "トケイ"], ["くすり屋 天狗", "yRed", "shop", null, "norR", "クスリ"]
    ];
    const per = Math.ceil(SH.length / 2), step = (X1 - X0) / per;
    SH.forEach(([name, key, type, prop, noren, v], i) => {
      const side = i % 2 ? 1 : -1, k = Math.floor(i / 2), x = X1 - step * (k + 0.5), z = Z + side * 19.5, ry = side < 0 ? 0 : Math.PI, bw = step - 1.4;
      const roof = ["kawara", "barrel", "kawara", "flat"][(i * 3) % 4];
      w.yomaShop(x, z, bw, 16, 8 + (k % 3) * 1.6, { ry, key, shop: "shopA", roof, roofKey: ["kwB", "kwG", "kwO", "kwR"][i % 4], sign: name, signColor: "#1a1030", noren, lanterns: 2, prop: prop || null, eyes: i % 3 === 0 ? { iris: ["irisA", "irisB", "irisC", "irisD", "irisE"][i % 5] } : null, signV: v, inside: Object.assign({ type, name }, type === "lobby" ? { fortune: true, actLabel: "占ってもらう", text: "月の光で、あなたの運勢を占います。" } : {}) });
    });
    /* 商店街の小物：赤いポスト・自動販売機・電話ボックス・ベンチ・マンホール */
    [[X1 - 10, Z - 6.2], [X0 + 30, Z + 6.2]].forEach(([x, z]) => { w.geo("pRed", new T.CylinderGeometry(0.4, 0.4, 1.4, 12), x, 0.7, z); w.geo("pRed", new T.SphereGeometry(0.4, 12, 8, 0, TAU, 0, Math.PI / 2), x, 1.4, z); w.colCircle(x, z, 0.45); });
    for (let x = X0 + 16; x < X1; x += 36) [-1, 1].forEach((s) => { const z = Z + s * 6.4; w.box(s < 0 ? "pBlue" : "pRed", x, 0, z, 1.0, 1.9, 0.8, { collide: true }); w.box("neonWhite", x, 1.0, z - s * 0.41, 0.8, 0.7, 0.02); });
    w.box("glassClear", X0 + 48, 0, Z - 6.2, 1.1, 2.3, 1.1, { collide: true }); w.box("pGreen", X0 + 48, 2.3, Z - 6.2, 1.2, 0.2, 1.2);
    for (let x = X0 + 8; x < X1; x += 18) w.geo("darkMetal", new T.CylinderGeometry(0.45, 0.45, 0.02, 16), x, 0.045, Z + 2.5);
    w.plazaCrowd((X0 + X1) / 2, Z, 60, 0.8);
    w.areaGate(X1 + 2, Z, -Math.PI / 2, "yokai", "big");
    w.forestOpen.push([(X0 + X1) / 2, Z, 100]);
  };

  /* ══════════════ 32 FUTURE HEIGHTS（東の高層ビル街） ══════════════ */
  P.buildFutureHeights = function () {
    const w = this, AX = 488, Z0 = -148, Z1 = 236;
    w.areaZone("heights");
    w.places.push(["32 FUTURE HEIGHTS（高層ビル街）", AX, 30, Math.PI]);
    w.route([[AX, Z0], [AX, Z1]], 16, "walkY", { lamps: "yoma", lampsBoth: true, lampEvery: 16, trees: 18, treeKind: "poplar", benches: 40, bushes: false });
    [-60, 150].forEach((z) => w.route([[433, z], [543, z]], 10, "walkCream", { lamps: "yoma", lampEvery: 18, trees: false, benches: false, bushes: false }));
    const lm = w._landmark; w._landmark = true;
    const TW = [
      [458, -118, "YOMA SKY TOWER", 140, "catears", "gPurple"], [518, -110, "NEON MOON TOWER", 120, "moon", "gBlue"],
      [458, -24, "TWIST TOWER", 110, "twist", "gTeal"], [518, -18, "EYE TOWER", 100, "eyes", "gSilver"],
      [458, 90, "LANTERN TOWER", 90, "lantern", "gRose"], [518, 96, "HELIX TOWER", 130, "helix", "gBlue"],
      [458, 200, "CRYSTAL TOWER", 150, "crystal", "gSilver"], [518, 204, "XEVA BANK", 100, "crown", "gGold"]
    ];
    TW.forEach(([x, z, name, h, kind, key], i) => {
      const s = 22;
      w.bld(x, z, s + 6, s + 6, 7, { key: "white2", shop: "shopB", roof: "flat", crown: "neonCyan", sign: { text: name, bg: "#0a1450", w: 16, h: 1.5, y: 5.6, glow: "#7fd8ff" }, ry: x < AX ? Math.PI / 2 : -Math.PI / 2, inside: { type: i % 2 ? "shop" : "cafe", name, h: 5, door: 4 } });
      let top;
      if (kind === "twist") { let y = 7; for (let k = 0; k < 11; k++) { w.box(key, x, y, z, s, h / 11 * 0.92, s, { ry: k * 0.09, uv: 14 }); w.box("chromeB", x, y + h / 11 * 0.92, z, s + 0.6, h / 11 * 0.08, s + 0.6, { ry: k * 0.09 }); y += h / 11; } top = y; w.caster(x, z, s, s, top); }
      else if (kind === "helix") { w.geo(key, new T.CylinderGeometry(s * 0.42, s * 0.46, h, 24), x, 7 + h / 2, z); for (let k = 0; k < 2; k++) { const pts = []; for (let q = 0; q <= 80; q++) { const t = q / 80, a = t * TAU * 3 + k * Math.PI; pts.push(new T.Vector3(x + Math.cos(a) * s * 0.55, 7 + t * h, z + Math.sin(a) * s * 0.55)); } w.geo(k ? "neonPink" : "neonCyan", new T.TubeGeometry(new T.CatmullRomCurve3(pts), 160, 0.6, 6, false), 0, 0, 0); } top = 7 + h; w.casterCircle(x, z, s * 0.5, top); }
      else if (kind === "lantern") { let y = 7; for (let k = 0; k < 6; k++) { const hh = h / 6; const prof = []; for (let q = 0; q <= 10; q++) { const t = q / 10; prof.push(new T.Vector2(s * 0.4 * (0.72 + 0.28 * Math.sin(Math.PI * t)), t * hh)); } w.geo(k % 2 ? "lanR" : "lanBig", new T.LatheGeometry(prof, 24), x, y, z); w.geo("lanternCap", new T.CylinderGeometry(s * 0.3, s * 0.3, 1.2, 24), x, y, z); y += hh; } top = y; w.casterCircle(x, z, s * 0.4, top); }
      else { top = w.skyscraper(x, z, s, s, h + 7, { key, steps: 3, taper: 0.84, band: "chromeB", crown: "neonCyan", spire: kind === "crystal" ? 0 : 0, heli: kind === "crown" }); }
      /* てっぺんの飾り */
      if (kind === "catears") { [-1, 1].forEach((sd) => w.geo(key, new T.ConeGeometry(4, 10, 4).rotateY(Math.PI / 4), x + sd * 5, top + 5, z)); w.eyes(x, z + s * 0.35, top - 6, 0, 2.2, 5.4, "irisE", 0); }
      if (kind === "moon") { const mm = new T.MeshStandardMaterial({ color: 0xfff4c8, emissive: 0xffe08a, emissiveIntensity: 0.6, roughness: 0.6 }); w.nightMats.push({ m: mm, day: 0.5, night: 1.6 }); const moon = new T.Mesh(new T.SphereGeometry(9, 24, 16), mm); moon.position.set(x, top + 12, z); w.scene.add(moon); w.loose(moon, 2000); w.anim.push((dt, t) => { moon.rotation.y = t * 0.1; }); }
      if (kind === "eyes") { [0, Math.PI / 2, Math.PI, -Math.PI / 2].forEach((a) => w.eyes(x + Math.sin(a) * (s * 0.84 * 0.84 / 2 + 0.2), z + Math.cos(a) * (s * 0.84 * 0.84 / 2 + 0.2), top - 8, a, 2.8, 7, ["irisA", "irisB", "irisC", "irisD"][Math.round(a) & 3], 0)); }
      if (kind === "crystal") { w.geo("glassDome", new T.OctahedronGeometry(8, 0).scale(1, 2.2, 1), x, top + 16, z); w.geo("holoBlue", new T.OctahedronGeometry(4.6, 0).scale(1, 2.2, 1), x, top + 16, z); }
      if (kind === "crown") { w.geo("gold", new T.CylinderGeometry(7, 7.5, 3, 20, 1, true), x, top + 1.5, z); for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; w.geo("gold", new T.ConeGeometry(0.9, 4, 6), x + Math.cos(a) * 7, top + 5, z + Math.sin(a) * 7); } }
      /* ビルの横の大きな看板（夜に光る） */
      const bs = ["#ff4f8f", "#4ff0ff", "#ffd84a", "#a86aff"][i % 4], face = x < AX ? Math.PI / 2 : -Math.PI / 2, fx = x + (x < AX ? 1 : -1) * (s / 2 + 0.2);
      w.sign(["XEVARION", "妖魔 CITY", "NEO YOMA", "FUTURE", "つなぐ", "XEVA PAY", "NGX", "未来"][i % 8], { bg: "#05030c", color: bs, glow: bs, px: 512 }, 3.2, 12, fx, 30 + (i % 3) * 8, z, face);
    });
    /* 空中の渡り廊下（向かいのビルどうし） */
    [[-118, -110], [90, 96], [200, 204]].forEach(([z0, z1], k) => { const y = 42 + k * 10, a = new T.Vector3(458 + 9, y, z0), b = new T.Vector3(518 - 9, y, z1); w.geo("glassDome", new T.CylinderGeometry(2.2, 2.2, a.distanceTo(b), 16, 1, true).rotateZ(Math.PI / 2).rotateY(-Math.atan2(b.z - a.z, b.x - a.x)), (a.x + b.x) / 2, y, (a.z + b.z) / 2); w.geo("white2", new T.BoxGeometry(a.distanceTo(b), 0.4, 3.4).rotateY(-Math.atan2(b.z - a.z, b.x - a.x)), (a.x + b.x) / 2, y - 2.1, (a.z + b.z) / 2); });
    w._landmark = lm;
    w.plazaCrowd(AX, 40, 40, 0.8);
    w.areaGate(AX, Z1 - 2, 0, "heights", "big");
  };

  /* ══════════════ 33 YOKAI SHRINE FOREST 妖怪神社の森 ══════════════ */
  P.buildShrine = function () {
    const w = this, HX = -680, HZ = -84;
    w.areaZone("shrine");
    w.places.push(["33 妖怪神社の森（参道）", -575, -40, -Math.PI / 2]);
    /* 参道（東の入口 → 千本鳥居 → 本殿） */
    w.route([[-564, -40], [-600, -40], [-640, -52], [HX + 18, HZ + 6]], 7, "stoneBeige", { lamps: false, trees: false, benches: false, bushes: false });
    for (let i = 0; i < 22; i++) { const t = i / 21, x = -598 - t * 40, z = -40 - t * 12; w.torii(x, z, Math.atan2(-40, -12), 0.62); }
    for (let i = 0; i < 8; i++) [-1, 1].forEach((s) => { const x = -572 - i * 5, z = -40 + s * 4.2; w.box("stoneGray", x, 0, z, 0.9, 0.5, 0.9); w.box("stoneGray", x, 0.5, z, 0.35, 1.3, 0.35); w.box("stoneW", x, 1.8, z, 0.9, 0.8, 0.9); w.box("lanY", x, 1.95, z, 0.5, 0.45, 0.5); w.geo("stoneGray", new T.ConeGeometry(0.8, 0.6, 4).rotateY(Math.PI / 4), x, 2.9, z); w.colCircle(x, z, 0.5); });
    /* 大鳥居（入口） */
    w.torii(-566, -40, -Math.PI / 2, 1.6);
    /* 本殿（大きな瓦屋根・朱の柱・賽銭箱・鈴） */
    w.yomaShop(HX, HZ, 30, 20, 9, { ry: Math.PI / 2, key: "woodRed", shop: "woodRed", roof: "kawara", roofKey: "kwG", rh: 7, sign: "妖怪神社", signColor: "#1a0a0a", noren: "norR", lanterns: 4, awning: "kwG" });
    w.box("woodDark2", HX + 12.6, 0, HZ, 3.2, 1, 1.4, { collide: true }); w.box("gold", HX + 12.6, 1, HZ, 3.3, 0.08, 1.5);
    w.geo("gold", new T.SphereGeometry(0.45, 12, 8), HX + 11.2, 4.1, HZ); w.geo("fabricR", new T.CylinderGeometry(0.05, 0.05, 2.9, 4), HX + 11.2, 2.5, HZ); w.geo("woodDark2", new T.CylinderGeometry(0.06, 0.06, 0.5, 4), HX + 11.2, 4.7, HZ);
    w.interact(HX + 14.6, HZ, 3, "お参りする（鈴を鳴らす）", () => ({ pray: true }), "⛩️");
    /* 五重塔 */
    w.pagodaTower(-734, -40, 11, 5, { roofKey: "kwB" });
    /* 御神木（大きな木・しめ縄・紙垂） */
    { const x = -626, z = -122; w.geo("trunk", new T.CylinderGeometry(2.4, 3.6, 16, 12), x, 8, z); for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; w.geo("leafDark", new T.IcosahedronGeometry(7 + (i % 3), 1), x + Math.cos(a) * 6, 18 + (i % 2) * 3, z + Math.sin(a) * 6); } w.geo("leafLight", new T.IcosahedronGeometry(8, 1), x, 24, z);
      w.geo("propTan", new T.TorusGeometry(3.3, 0.35, 8, 32).rotateX(Math.PI / 2), x, 6, z); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; w.geo("pWhite", new T.BoxGeometry(0.4, 1.2, 0.05).rotateY(-a), x + Math.cos(a) * 3.4, 5.1, z + Math.sin(a) * 3.4); }
      w.colCircle(x, z, 3.8); w.casterCircle(x, z, 10, 26); w.box("stoneW", x, 0, z, 9, 0.4, 9); }
    /* 池と太鼓橋 */
    { const x = -700, z = 0; w.water(new T.CircleGeometry(16, 40).rotateX(-Math.PI / 2).scale(1.4, 1, 1), x, 0.08, z, "pool"); w.geo("stoneW", new T.TorusGeometry(16, 0.5, 6, 48).rotateX(Math.PI / 2).scale(1.4, 1, 1), x, 0.25, z);
      for (let i = 0; i < 16; i++) { const t0 = i / 16, t1 = (i + 1) / 16, y0 = Math.sin(Math.PI * t0) * 2.6, y1 = Math.sin(Math.PI * t1) * 2.6, x0 = x - 22 + t0 * 44, x1 = x - 22 + t1 * 44; w.geo("woodRed", new T.BoxGeometry(Math.hypot(x1 - x0, y1 - y0), 0.25, 3).rotateZ(Math.atan2(y1 - y0, x1 - x0)), (x0 + x1) / 2, (y0 + y1) / 2 + 0.3, z); }
      (w.heightExtra = w.heightExtra || []).push({ arch: 1, cx: x, cz: z, ang: Math.PI / 2, hw: 1.5, hl: 22, h: 2.6 }); (w.riverGaps = w.riverGaps || []).push({ x, z, r: 3 });
      w.colEll(x, z, 21.8, 15, 23, 16.5, [[-0.12, 0.12], [Math.PI - 0.12, Math.PI + 0.12]]); }
    /* おみくじ・絵馬・狛犬 */
    { const x = -650, z = -60; w.box("woodDark2", x, 0, z, 3.6, 2.6, 1.2, { collide: true }); w.sign("おみくじ", { bg: "#b8262a", color: "#fff", px: 256 }, 1.8, 0.5, x, 2.3, z + 0.62, 0); w.interact(x, z + 2, 2.4, "おみくじを引く", () => ({ omikuji: true }), "📜");
      w.box("woodDark2", x - 8, 0, z + 2, 5, 2.4, 0.3, { collide: true }); for (let i = 0; i < 18; i++) w.box("woodLight", x - 10.2 + (i % 6) * 0.9, 0.8 + Math.floor(i / 6) * 0.55, z + 2.18, 0.7, 0.45, 0.04); }
    [-1, 1].forEach((s) => { const x = -572, z = -40 + s * 6; w.box("stoneGray", x, 0, z, 1.6, 1.1, 1.6, { collide: true }); w.geo("stoneW", new T.SphereGeometry(0.75, 12, 10).scale(1, 1.1, 1.3), x, 1.9, z); w.geo("stoneW", new T.SphereGeometry(0.5, 10, 8), x - 0.5, 2.6, z); });
    w.plazaCrowd(-620, -50, 24, 0.8);
    w.areaGate(-561, -40, Math.PI / 2, "shrine");
    w.forestOpen.push([-640, -60, 40]);
  };
})();
