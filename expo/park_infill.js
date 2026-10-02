/* ══════════════════════════════════════════════════════════════════
   XEVARION PARK — すき間をうめる（★★ 2026-09-30d ご指定「それぞれのエリアで建物がなく開いているところがあるので
   高密度になるように建物を増やしてください。木なども植えても構いません」）
   ------------------------------------------------------------------
   ・道にそって「通りに面したお店」を並べる（道から 3m・お店どうし 4m あける・入口は道の方）＝町なみ。
     エリアの雰囲気で形を変える：妖魔の町（瓦・のれん・提灯・目）／未来の町（ガラス・光る帯・看板）。
     入口（中に入れる部屋）は park_rooms.js の自動の入口がつける。
   ・道から遠い広い芝生には、木のかたまり（桜・木・松）と花だん。
   ・置かない所：道・広場・建物・水・当たり・門のまわり・入口・できること（E）・ベンチの前・モノレール／路面電車の下・
     地下鉄の出入口・乗り物・スタジアムや競技場などの広い場所（エリアごと除く）。
   ・buildPark の最後（入口を付ける前）に1回だけ。
   ══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const T = THREE, X = XTex, P = XWorld.World.prototype, TAU = Math.PI * 2, XP = XPark;
  /* 広い場所が主役のエリアは除く（競技場・湖・プール・砂浜・サーキット・森の神社・山） */
  const SKIP = { gate: 1, fountain: 1, green: 1, marketW: 1, marketE: 1, tower: 1, soccer: 1, ballpark: 1, boccia: 1, sports: 1, motor: 1, dome: 1, harbor: 1, aqua: 1, beach: 1, resort: 1, shrine: 1, adv: 1, ngx: 1 };
  /* ★★ 2026-10-01 エリアの雰囲気ごとの町なみ（ご指定「建物の密度をそれぞれ高めて」）：
       yoma＝妖魔の町（瓦・のれん・提灯）／future＝未来の町（ガラス・光る帯）／fantasy＝MAGIBURST の魔法の町（白い壁・紫や青の三角屋根・小さな塔）／
       sport＝MAGI BOCCIA RUSH の町（黒と赤・光る帯）／gold＝XEVA GACHA PALACE の町（白と金・ネオン） */
  const THEME = { kabuki: "yoma", yukaku: "yoma", yokai: "yoma", onsen: "yoma", wonder: "yoma", fun: "yoma", ishida: "yoma", mburst: "fantasy", mbr: "sport", gacha: "gold" };
  const NAME_Y = [["だんご", "おでん", "駄菓子", "まねき猫", "提灯", "甘味", "たい焼き", "ラーメン", "占い", "妖怪グッズ", "お茶", "焼きそば", "ようかん", "すし", "天ぷら", "くじ", "お面", "和紙", "金魚", "せんべい"], ["屋", "堂", "処", "亭", "本舗", "の店", "横丁", "茶屋"]];
  const NAME_F = [["NEON", "STAR", "XEVA", "PIXEL", "ROBO", "CANDY", "SPACE", "MAGI", "LUNA", "NOVA", "PRISM", "COSMO", "HOLO", "TURBO", "SKY", "AQUA"], [" CAFÉ", " SHOP", " ARCADE", " BURGER", " CREPE", " BOOKS", " PHOTO", " GACHA", " TOYS", " LAB", " DINER", " STUDIO", " GAME BAR", " SWEETS"]];
  const NAME_M = [["魔法", "竜", "勇者", "妖精", "星", "月", "水晶", "黒猫", "銀", "炎", "風", "光", "闇", "宝石", "召喚", "聖騎士"], ["の宿屋", "の武器屋", "の道具屋", "の酒場", "のパン屋", "の薬屋", "の仕立屋", "の工房", "の書店", "の魔法屋", "の鍛冶屋", "の占い館"]];
  const NAME_S = [["RUSH", "STRIKE", "JACK", "RED MOON", "TEAM BLUE", "CHAMP", "VICTORY", "SPIN", "COURT", "ACE"], [" GEAR", " CAFÉ", " SHOP", " DINER", " GYM", " STORE", " BAR", " FOODS"]];
  const NAME_G = [["LUCKY", "CAPSULE", "JACKPOT", "XEVA", "GOLDEN", "STAR", "RAINBOW", "10連", "SSR", "MEGA"], [" GACHA", " CAFÉ", " BAR", " SHOP", " ARCADE", " SWEETS", " EXCHANGE", " TOYS"]];
  const YKEYS = ["yRed", "yCream", "yTeal", "yOrange", "yPink", "yBlue", "yGreen", "yPurple", "yYellow", "yBrown"], KW = ["kwK", "kwB", "kwR", "kwP", "kwG", "kwO", "kwT"], NOR = ["norR", "norB", "norK", "norO", "norP", "norG"];
  const GKEYS = ["gBlue", "gTeal", "gSilver", "gPurple", "gRose", "gGreen", "gGold", "oBlue", "oWhite"], CROWN = ["neonCyan", "neonPink", "neonYellow", "neonPurple", "neonGreen"], SHOP = ["shopA", "shopC", "shopD"];

  P.infill = function (GQ) {
    const w = this, I = w.spotIndex(), r = X.rnd(20260930), placed = [], rep = { shops: 0, groves: 0, byArea: {} };
    const gates = (GQ || []).map((q) => [q[0], q[1]]);
    const pts = []; (w.doors || []).forEach((d) => pts.push([d[0], d[1], 7])); (w._doorQ || []).forEach((q) => pts.push([q[0], q[1], Math.max(q[2], q[3]) / 2 + 6]));
    (w.inter || []).forEach((it) => { if (!it.y) pts.push([it.x, it.z, 5]); }); (w.seats || []).forEach((s) => pts.push([s.x, s.z, 3])); gates.forEach(([x, z]) => pts.push([x, z, 22]));
    ((window.XMetro && XMetro.kiosks) || []).forEach((k) => pts.push([k.x, k.z, 20]));
    (w.treeKeepOut || []).forEach((k) => { if (!k.pts || k.pts.length > 4000) return; k.pts.forEach((q) => pts.push([q[0], q[1], (k.r || 4) + 5])); });          /* コースターの線路の下・線路のそば */
    const G2 = new Map(), GS = 24; pts.forEach((p) => { const k = Math.floor(p[0] / GS) + "," + Math.floor(p[1] / GS); if (!G2.has(k)) G2.set(k, []); G2.get(k).push(p); });
    const nearPt = (x, z) => { for (let gx = Math.floor(x / GS) - 1; gx <= Math.floor(x / GS) + 1; gx++) for (let gz = Math.floor(z / GS) - 1; gz <= Math.floor(z / GS) + 1; gz++) { const a = G2.get(gx + "," + gz); if (a) for (const p of a) if (Math.hypot(p[0] - x, p[1] - z) < p[2]) return true; } return false; };
    const paved = (x, z, m) => (w.paved || []).some((q) => x > q[0] - m && x < q[2] + m && z > q[1] - m && z < q[3] + m);
    const onTrack = (x, z) => w.onTrack ? w.onTrack(x, z, 4) : false;
    /* 四角い形（中心・幅・奥行き・向き）があいているか */
    const clear = (a, cx, cz, bw, bd, ry, gap) => {
      const c = Math.cos(ry), s = Math.sin(ry);
      for (let u = -bw / 2 - gap; u <= bw / 2 + gap + 0.01; u += 1.5) for (let v = -bd / 2 - gap; v <= bd / 2 + gap + 0.01; v += 1.5) {
        const x = cx + u * c + v * s, z = cz - u * s + v * c;
        if (x < a.x0 + 2 || x > a.x1 - 2 || z < a.z0 + 2 || z > a.z1 - 2) return false;
        if (!w.insideIsland(x, z, 8) || I.water(x, z) || I.bld(x, z, 2.5) || I.road(x, z, 0.8) || I.col(x, z, 0.6) || paved(x, z, 0.8) || onTrack(x, z) || nearPt(x, z)) return false;
        for (const q of placed) if (Math.abs(q[0] - x) < q[2] && Math.abs(q[1] - z) < q[2] && Math.hypot(q[0] - x, q[1] - z) < q[2]) return false;
      }
      return true;
    };
    const pick = (arr) => arr[Math.floor(r() * arr.length)], has = (k, fb) => (w.m[k] ? k : fb);
    const nameOf = (th) => { const P0 = th === "yoma" ? NAME_Y : th === "fantasy" ? NAME_M : th === "sport" ? NAME_S : th === "gold" ? NAME_G : NAME_F; return pick(P0[0]) + pick(P0[1]); };
    /* ★★ 2026-10-01 魔法の町・スポーツの町・金の町の建物 */
    const themed = (th, cx, cz, bw, bd, h, ry, nm) => {
      const c = Math.cos(ry), s = Math.sin(ry), L = (u, v) => [cx + u * c + v * s, cz - u * s + v * c];
      if (th === "fantasy" && w.fantasyHouse) { const pal = themed.pal; w.fantasyHouse(cx, cz, bw, bd, h, { ry, sign: nm, key: pal ? pal.keys[Math.floor(r() * pal.keys.length)] : undefined, roofKey: pal ? pal.roofs[Math.floor(r() * pal.roofs.length)] : undefined }); return; }
      if (th === "fantasy") {
        const wall =has(pick(["castleW2", "stucco", "hWhite", "sCream", "stoneBeige", "sLav"]), "offWhite"), roof = has(pick(["rPurple", "rBlue", "rRed", "rSlate", "rTeal", "rPurple"]), "rRed");
        w.bld(cx, cz, bw, bd, h, { ry, key: wall, shop: r() < 0.5 ? "shopA" : null, roof: "gable", roofKey: roof, rh: 2.6 + r() * 2.2, sign: { text: nm, bg: "#2a0a3a", color: "#ffd86a", w: Math.min(bw * 0.8, 7.5), h: 0.95, y: 3.5, glow: "#c07aff" } });
        w.detail(() => { [-1, 1].forEach((k) => { const [px, pz] = L(k * (bw / 2 - 0.3), bd / 2 + 0.06); w.box("woodDark2", px, 0, pz, 0.35, h, 0.1, { ry }); }); const [mx, mz] = L(0, bd / 2 + 0.06); w.box("woodDark2", mx, h * 0.55, mz, bw, 0.3, 0.1, { ry }); });
        if (r() < 0.35) { const [tx, tz] = L(bw / 2 - 1.6, -bd / 2 + 1.6); w.turret(tx, tz, 1.6, h + 3 + r() * 4, wall, roof, true); }
      } else if (th === "sport") {
        w.bld(cx, cz, bw, bd, h, { ry, key: has(pick(["pBlack", "gDark", "pRed", "oGray", "pNavy"]), "pBlack"), shop: pick(SHOP), roof: "flat", roofKey: "rMetal", crown: has(pick(["neonRed", "neonBlue", "neonRed", "neonWhite"]), "neonPink"), sign: { text: nm, bg: "#1a0408", color: "#fff", w: Math.min(bw * 0.8, 8), h: 1.1, y: 3.6, glow: "#ff4a6a" } });
      } else {
        w.bld(cx, cz, bw, bd, h, { ry, key: has(pick(["white2", "gGold", "oWhite", "pYellow", "sPeach"]), "white2"), shop: pick(SHOP), roof: r() < 0.4 ? "dome" : "flat", roofKey: has("glassDome", "rMetal"), crown: has(pick(["neonYellow", "neonPink", "neonCyan", "neonPurple"]), "neonPink"), sign: { text: nm, bg: "#2a1a00", color: "#ffd86a", w: Math.min(bw * 0.8, 8), h: 1.1, y: 3.6, glow: "#ffd24a" } });
      }
    };
    XP.AREAS.forEach((a) => {
      if (SKIP[a.id]) return;
      /* ★★ 2026-10-02 ファンタジーの世界観（park_fantasy.js）：どのエリアも王道 RPG の城下町の家（ボッチャ・ガチャの町はそのまま） */
      const th = XP.FANTASY ? "fantasy" : (THEME[a.id] || "future"), yoma = th === "yoma"; let n = 0;
      themed.pal = null;          /* ★★ 2026-10-02 土地ごとの色（ボッチャ＝赤と黒・ガチャ＝金とクリーム） */
      const FPAL = a.id === "mbr" ? { keys: ["yRed", "yBrown", "yCream", "yRed"], roofs: ["kwR", "kwK", "kwR", "kwB"] } : a.id === "gacha" ? { keys: ["yYellow", "yCream", "yOrange"], roofs: ["kwO", "kwR", "kwB"] } : null;
      themed.pal = FPAL;
      const cap = Math.max(6, Math.min(110, Math.round((a.x1 - a.x0) * (a.z1 - a.z0) / (th === "future" || yoma ? 1500 : 1100))));          /* ★★ 2026-10-01 前は最大 16 けん＝すかすかだった */
      /* ── 1) 道にそったお店 ── */
      /* 道（なめらかにした道は短い線の集まりなので、線のつながり＝walkPaths にそって 13m ごと） */
      const cand = [];
      (w.walkPaths || []).forEach((wp) => {
        if (wp.w < 6 || wp.w > 18) return; const pp = wp.pts; if (!pp || pp.length < 2) return;
        let inA = false; for (const [x, z] of pp) if (x > a.x0 - 10 && x < a.x1 + 10 && z > a.z0 - 10 && z < a.z1 + 10) { inA = true; break; } if (!inA) return;
        const cum = [0]; for (let i = 1; i < pp.length; i++) cum.push(cum[i - 1] + Math.hypot(pp[i][0] - pp[i - 1][0], pp[i][1] - pp[i - 1][1]));
        const total = cum[cum.length - 1]; let i = 1;
        for (let d = 6; d < total - 4; d += 13) {
          while (i < pp.length - 1 && cum[i] < d) i++;
          const L = cum[i] - cum[i - 1]; if (L < 1e-6) continue;
          const t = (d - cum[i - 1]) / L, ux = (pp[i][0] - pp[i - 1][0]) / L, uz = (pp[i][1] - pp[i - 1][1]) / L, nx = -uz, nz = ux, px = pp[i - 1][0] + (pp[i][0] - pp[i - 1][0]) * t, pz = pp[i - 1][1] + (pp[i][1] - pp[i - 1][1]) * t;
          for (const sd of [-1, 1]) {
            const bw = 9 + Math.floor(r() * 4) * 1.5, bd = 7 + Math.floor(r() * 3), off = wp.w / 2 + 3 + bd / 2;
            cand.push([px + nx * sd * off, pz + nz * sd * off, bw, bd, Math.atan2(-nx * sd, -nz * sd)]);          /* 正面（+z）が道の方 */
          }
        }
      });
      for (let i = cand.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = cand[i]; cand[i] = cand[j]; cand[j] = t; }
      for (const [cx, cz, bw, bd, ry] of cand) {
        if (n >= cap) break;
        if (!clear(a, cx, cz, bw, bd, ry, 1.2)) continue;
        placed.push([cx, cz, Math.max(bw, bd) / 2 + 3]);
        const nm = nameOf(th), h = yoma ? 6.5 + r() * 3 : th === "fantasy" ? 7 + r() * 5 : 8 + r() * 12;
        if (th === "fantasy" || th === "sport" || th === "gold") themed(th, cx, cz, bw, bd, h, ry, nm);
        else if (yoma || r() < 0.45) {
          w.yomaShop(cx, cz, bw, bd, h, { ry, key: YKEYS[Math.floor(r() * YKEYS.length)], shop: SHOP[Math.floor(r() * SHOP.length)], roof: yoma ? (r() < 0.6 ? "kawara" : "barrel") : (r() < 0.5 ? "barrel" : "flat"), roofKey: KW[Math.floor(r() * KW.length)], rh: 2 + r() * 1.2, sign: nm, signColor: "#1a1030", noren: NOR[Math.floor(r() * NOR.length)], lanterns: yoma ? 2 : 0, eyes: r() < 0.3 ? { iris: ["irisA", "irisB", "irisC"][Math.floor(r() * 3)], look: 0.3 } : false });
        } else {
          w.bld(cx, cz, bw, bd, h, { ry, key: GKEYS[Math.floor(r() * GKEYS.length)], shop: SHOP[Math.floor(r() * SHOP.length)], roof: "flat", roofKey: "rMetal", crown: CROWN[Math.floor(r() * CROWN.length)], sign: { text: nm, bg: "#0a1430", w: Math.min(bw * 0.8, 8), h: 1.1, y: 3.6, glow: "#7fd8ff" } });
        }
        n++; rep.shops++;
      }
      /* ── 2) 道から遠い芝生に木のかたまりと花だん ── */
      let g = 0; const gcap = Math.max(3, Math.round(cap * 0.8));
      for (let x = a.x0 + 12; x < a.x1 - 12 && g < gcap; x += 22) for (let z = a.z0 + 12; z < a.z1 - 12 && g < gcap; z += 22) {
        const jx = x + (r() - 0.5) * 8, jz = z + (r() - 0.5) * 8;
        if (!clear(a, jx, jz, 12, 12, 0, 2)) continue;
        if (I.road(jx, jz, 7)) continue;
        placed.push([jx, jz, 9]);
        const kinds = yoma ? ["sakura", "sakura", "pine", "oak"] : ["oak", "sakura", "poplar", "oak"];
        for (let k = 0; k < 4; k++) { const aa = k / 4 * TAU + r(), rr = 2.5 + r() * 3; w.plant(kinds[Math.floor(r() * kinds.length)], jx + Math.cos(aa) * rr, jz + Math.sin(aa) * rr, 0.9 + r() * 0.4); }
        w.flowerBed(jx, jz, 4 + r() * 2, 2, r() * Math.PI, Math.floor(r() * 9999), XP.FLOWER_PAL[Math.floor(r() * XP.FLOWER_PAL.length)]);
        g++; rep.groves++;
      }
      rep.byArea[a.id] = [n, g];
    });
    w._infill = rep;
    return rep;
  };
})();
