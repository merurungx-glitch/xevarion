/* ══════════════════════════════════════════════════════════════════
   XEVARION PARK — すべての建物の中・階・展望エレベーター（★★ 2026-09-30 ご指定
   「展望台エレベーターの演出など内部も全てのエリアや建物で作成してください」
   「NGX本社は内部のそれぞれの階層や室内などを全て作成してください」）
   ------------------------------------------------------------------
   ・建物の正面に入口（ガラスの扉・名前の札）。E で「中へ」→ 暗転 → 建物の中の部屋（地下 300m の見えない所に、その時だけ組み立てる）。
     部屋は種類ごと（ロビー・お店・食堂・カフェ・オフィス・研究室・会議室・データセンター・ラウンジ・客室・ギャラリー・モール…）。
   ・高い建物は階がある：部屋のエレベーター → 階をえらぶ → 扉が閉まって階の数字が変わる → 着いた階の部屋。
   ・屋上・展望フロアへは「ガラスのエレベーター」で建物の外がわを上る（本物の景色が見える・高さと速さを表示）。
   ・部屋の中の物（当たり・すわれる所・できること・画面）は、部屋にいる間だけ有効。出ると片づける。
   ══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const T = THREE, X = XTex, P = XWorld.World.prototype, TAU = Math.PI * 2, XP = XPark;
  const RY = -300;                               /* 部屋の床の高さ（島の下・外からは見えない） */
  let W = null, API = null;
  const R = { cur: null, lift: null, roof: null, back: null };

  /* ══════════════ 物を集めて「部屋のグループ」にする（あとで全部片づけられる） ══════════════ */
  const KEEP = ["colliders", "casters", "lamps", "seats", "walkPaths", "roads", "trees", "heightExtra", "riverGaps", "inter", "screens", "zones", "interiors", "noGrass", "doors"];
  function capture(w, fn) {
    const root = new T.Group(), saved = {}, got = {};
    KEEP.forEach((k) => { saved[k] = w[k]; w[k] = []; });
    const sb = w.batch, sd = w._detail, sl = w._landmark, tmp = new (sb.constructor)(); w.batch = tmp; w._detail = false; w._landmark = false;
    const sAdd = w.scene.add; w.scene.add = function () { for (const o of arguments) root.add(o); return w.scene; };
    const nA = w.anim.length, nL = (w.looseList || []).length;
    w._capturing = (w._capturing || 0) + 1;
    try { fn(); } finally { w._capturing--; KEEP.forEach((k) => { got[k] = w[k]; w[k] = saved[k]; }); w.batch = sb; w._detail = sd; w._landmark = sl; w.scene.add = sAdd; }
    const bg = new T.Group(); tmp.build(bg); bg.children.forEach((m) => { m.castShadow = false; m.receiveShadow = false; }); root.add(bg);
    got.anim = w.anim.splice(nA); got.loose = w.looseList ? w.looseList.splice(nL) : [];
    return { root, got };
  }
  /* 動く物のグループ（フロートなど）の中では入口を作らない */
  const _cg = P.captureGroup;
  P.captureGroup = function (fn) { this._capturing = (this._capturing || 0) + 1; try { return _cg.call(this, fn); } finally { this._capturing--; } };

  /* ══════════════ 窓の外の景色（絵）：昼の街・夜の街 ══════════════ */
  const VIEW = {};
  function viewTex(night) {
    const k = night ? "n" : "d"; if (VIEW[k]) return VIEW[k];
    const c = X.cv(2048, 512), g = c.getContext("2d"), r = X.rnd(night ? 77 : 33);
    const sk = g.createLinearGradient(0, 0, 0, 512);
    if (night) { sk.addColorStop(0, "#050a26"); sk.addColorStop(0.55, "#1a1650"); sk.addColorStop(1, "#4a2a6a"); } else { sk.addColorStop(0, "#5aa8f0"); sk.addColorStop(0.6, "#bfe2ff"); sk.addColorStop(1, "#f4f0e8"); }
    g.fillStyle = sk; g.fillRect(0, 0, 2048, 512);
    if (night) for (let i = 0; i < 260; i++) { g.fillStyle = "rgba(255,255,255," + (0.3 + r() * 0.7) + ")"; g.fillRect(r() * 2048, r() * 220, 1.5, 1.5); }
    else { g.fillStyle = "rgba(255,255,255,.75)"; for (let i = 0; i < 9; i++) { const x = r() * 2048, y = 40 + r() * 120; for (let k2 = 0; k2 < 5; k2++) { g.beginPath(); g.arc(x + k2 * 26, y + Math.sin(k2) * 8, 22 + r() * 16, 0, TAU); g.fill(); } } }
    /* 遠くの山と海 */
    g.fillStyle = night ? "#1a1f3a" : "#9ab8c8"; g.beginPath(); g.moveTo(0, 380); for (let x = 0; x <= 2048; x += 32) g.lineTo(x, 330 + Math.sin(x * 0.006) * 30 + Math.sin(x * 0.017) * 12); g.lineTo(2048, 512); g.lineTo(0, 512); g.fill();
    /* ビル（3列：遠い・中・近い）＋瓦屋根・目のあるビル */
    [[0.55, 300, 90, 0.35], [0.8, 360, 150, 0.6], [1, 430, 210, 1]].forEach(([sh, base, hm, a]) => {
      let x = -20; while (x < 2060) {
        const bw = 40 + r() * 90 * sh, bh = hm * (0.35 + r() * 0.65), yy = base - bh;
        const hue = [210, 190, 260, 20, 330, 45][Math.floor(r() * 6)];
        g.fillStyle = night ? "hsl(" + hue + ",35%," + (8 + a * 10) + "%)" : "hsl(" + hue + ",25%," + (78 - a * 22) + "%)"; g.fillRect(x, yy, bw, bh + 200);
        if (r() < 0.25) { g.fillStyle = night ? "#2a1a2a" : "#7a3a3a"; g.beginPath(); g.moveTo(x - 6, yy); g.lineTo(x + bw / 2, yy - 18 * sh); g.lineTo(x + bw + 6, yy); g.fill(); }
        if (r() < 0.12 && a > 0.5) { const ex = x + bw / 2, ey = yy + 22 * sh; g.fillStyle = "#fff"; [-1, 1].forEach((s) => { g.beginPath(); g.ellipse(ex + s * 9 * sh, ey, 7 * sh, 9 * sh, 0, 0, TAU); g.fill(); }); g.fillStyle = "#222"; [-1, 1].forEach((s) => { g.beginPath(); g.arc(ex + s * 9 * sh, ey + 2, 3.5 * sh, 0, TAU); g.fill(); }); }
        for (let wy = yy + 8; wy < base - 4; wy += 9 * sh + 3) for (let wx = x + 5; wx < x + bw - 6; wx += 8 * sh + 3) { if (r() < (night ? 0.45 : 0.3)) { g.fillStyle = night ? ["#ffe7a0", "#ffd070", "#a8e8ff", "#ff9ad8"][Math.floor(r() * 4)] : "rgba(255,255,255,.55)"; g.fillRect(wx, wy, 4 * sh + 1, 5 * sh); } }
        if (night && r() < 0.15) { g.fillStyle = ["#ff4fb0", "#4ff0ff", "#ffd84a"][Math.floor(r() * 3)]; g.fillRect(x + 4, yy + 10, bw - 8, 3); }
        x += bw + r() * 8;
      }
    });
    /* まん中に NGX タワーの影 */
    g.fillStyle = night ? "#2a3a8a" : "#6a88c0"; g.fillRect(1000, 40, 48, 400); g.fillRect(990, 150, 68, 14); g.fillStyle = night ? "#ffd86a" : "#e8c040"; g.fillRect(1010, 100, 28, 6);
    const tex = X.tex(c); VIEW[k] = new T.MeshBasicMaterial({ map: tex, toneMapped: false, fog: false }); return VIEW[k];
  }

  /* ══════════════ 新しい部屋の種類の中身（park_interiors.js の中身の表に足す） ══════════════ */
  const F2 = {
    office(C) {
      const { B, G, iw, id, hi } = C, rows = Math.max(2, Math.floor((id - 5) / 3.2)), cols = Math.max(2, Math.floor((iw - 4) / 3.4));
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const a = -iw / 2 + 2.4 + i * (iw - 4.8) / Math.max(1, cols - 1), b = -id / 2 + 3 + j * 3.2;
        B("white2", 1.8, 0.05, 0.9, a, 0.74, b); B("darkMetal", 0.06, 0.72, 0.06, a - 0.8, 0.36, b); B("darkMetal", 0.06, 0.72, 0.06, a + 0.8, 0.36, b);
        B("pBlack", 0.8, 0.5, 0.04, a, 1.08, b - 0.3); B(["neonCyan", "neonBlue", "neonPurple"][(i + j) % 3], 0.74, 0.44, 0.02, a, 1.08, b - 0.27);
        B("seatBlue", 0.5, 0.08, 0.5, a, 0.46, b + 0.6); B("seatBlue", 0.5, 0.5, 0.06, a, 0.75, b + 0.86); C.seat(a, b + 0.6, Math.PI, 0.47); C.col(a, b, 1.9, 1.0);
      }
      B("white2", Math.min(6, iw * 0.4), 1.6, 0.06, 0, 1.9, -id / 2 + 0.3); C.sign("今週の目標：新しいアプリを届ける！", { bg: "#ffffff", color: "#1a3a8a", px: 1024 }, Math.min(5.6, iw * 0.38), 0.5, 0, 2.3, -id / 2 + 0.35);
      C.act(0, -id / 2 + 1.6, 2.6, "開発チームの仕事を見学する", () => ({ lobby: { name: C.name, text: "ここではアプリの新しい機能を作っています。画面には設計図とテストの結果。コーヒーのいい香り。" } }), "💻");
    },
    server(C) {
      const { B, iw, id, hi } = C, n = Math.max(2, Math.floor((iw - 3) / 2.6));
      for (let i = 0; i < n; i++) for (let j = 0; j < 3; j++) {
        const a = -iw / 2 + 1.8 + i * (iw - 3.6) / Math.max(1, n - 1), b = -id / 2 + 2.6 + j * ((id - 6) / 2);
        B("pBlack", 1.1, Math.min(2.4, hi - 0.8), 2.2, a, Math.min(2.4, hi - 0.8) / 2, b); C.col(a, b, 1.2, 2.3);
        for (let k = 0; k < 9; k++) B(k % 3 === 0 ? "neonGreen" : k % 3 === 1 ? "neonCyan" : "neonBlue", 0.02, 0.05, 0.12, a + 0.56, 0.3 + k * 0.23, b - 0.8 + (k % 4) * 0.5);
      }
      B("neonCyan", iw - 1, 0.04, 0.2, 0, 0.03, 0);
      C.sign("NGX DATA CENTER  —  24時間 見守り中", { bg: "#021018", color: "#7fe8ff", glow: "#4ff0ff", px: 1024 }, Math.min(8, iw * 0.6), 0.7, 0, hi - 0.8, -id / 2 + 0.3);
      C.act(0, id / 2 - 3, 2.4, "サーバーのようすを見る", () => ({ lobby: { name: C.name, text: "アプリの記録とセーブデータを守るサーバーの部屋。ランプの点滅は元気なしるし。部屋はひんやり 18℃。" } }), "🖥️");
    },
    meeting(C) {
      const { B, G, iw, id, hi } = C, L = Math.min(iw - 5, 9);
      B("woodDark", L, 0.08, 2.2, 0, 0.74, -0.5); B("woodDark", 0.3, 0.72, 1.6, -L / 2 + 0.6, 0.36, -0.5); B("woodDark", 0.3, 0.72, 1.6, L / 2 - 0.6, 0.36, -0.5); C.col(0, -0.5, L, 2.3);
      for (let i = 0; i < Math.floor(L / 1.3); i++) [-1, 1].forEach((s) => { const a = -L / 2 + 0.7 + i * 1.3, b = -0.5 + s * 1.6; B("pBlack", 0.55, 0.08, 0.55, a, 0.46, b); B("pBlack", 0.55, 0.6, 0.06, a, 0.8, b + s * 0.28); C.seat(a, b, s > 0 ? Math.PI : 0, 0.47); });
      C.screen(0, 2.3, -id / 2 + 0.4, Math.min(6, iw * 0.45), 2.4, "NGX 企画会議", ["新しいアプリのアイデア", "みんなで考える未来"], ["#0a1450", "#2a1a7a"]);
    },
    exec(C) {
      const { B, G, iw, id, hi } = C;
      B("woodDark", 3.6, 0.1, 1.6, 0, 0.78, -id / 2 + 3.2); B("woodDark", 3.4, 0.74, 0.1, 0, 0.37, -id / 2 + 2.5); C.col(0, -id / 2 + 3.2, 3.7, 1.7);
      B("pBlack", 0.8, 1.2, 0.8, 0, 0.6, -id / 2 + 1.7); C.seat(0, -id / 2 + 1.9, 0, 0.5);
      for (let i = 0; i < 4; i++) { const a = -iw / 2 + 1 + i * 0.1; G("gold", new T.CylinderGeometry(0.12, 0.18, 0.5, 8).translate(-iw / 2 + 0.9, 1.3 + i * 0.6, -id / 2 + 1.2 + i * 0.9)); }
      B("woodDark", 0.4, 2.6, 4, -iw / 2 + 0.6, 1.3, -id / 2 + 2.5);
      [[-2, 1], [2, 1]].forEach(([a, b]) => { B("fabricW", 2.2, 0.45, 0.9, a, 0.22, b); B("fabricW", 2.2, 0.6, 0.2, a, 0.6, b + 0.4); C.seat(a, b, Math.PI, 0.45); C.col(a, b, 2.3, 1.0); });
      C.sign("NGX", { bg: "#0a1450", color: "#ffd86a", glow: "#ffd86a", px: 512 }, 2.6, 1.0, 0, hi - 1.0, -id / 2 + 0.3);
      C.act(0, -id / 2 + 4.6, 2.4, "役員フロアを見学する", () => ({ lobby: { name: C.name, text: "街と海をぜんぶ見わたせる、いちばん静かなフロア。机の上には次のアプリの計画書。" } }), "🏢");
    },
    lounge(C) {
      const { B, G, iw, id, hi } = C;
      B("pBlack", Math.min(8, iw - 4), 1.05, 0.7, 0, 0.52, -id / 2 + 1.6); B("gold", Math.min(8, iw - 4), 0.05, 0.8, 0, 1.07, -id / 2 + 1.6); C.col(0, -id / 2 + 1.6, Math.min(8, iw - 4), 0.8);
      for (let i = 0; i < 5; i++) { const a = -Math.min(8, iw - 4) / 2 + 0.8 + i * Math.min(8, iw - 4) / 5; B("chromeB", 0.1, 0.72, 0.1, a, 0.36, -id / 2 + 2.3); G("seatsRed", new T.CylinderGeometry(0.22, 0.22, 0.08, 12).translate(a, 0.76, -id / 2 + 2.3)); C.seat(a, -id / 2 + 2.3, Math.PI, 0.78); }
      const n = Math.max(2, Math.floor((iw - 4) / 4.2));
      for (let i = 0; i < n; i++) { const a = -iw / 2 + 2.6 + i * (iw - 5.2) / Math.max(1, n - 1), b = id / 2 - 3.6; B("fabricB", 2.4, 0.42, 0.9, a, 0.21, b); B("fabricB", 2.4, 0.5, 0.25, a, 0.55, b + 0.35); C.seat(a - 0.6, b, Math.PI, 0.44); C.seat(a + 0.6, b, Math.PI, 0.44); C.col(a, b, 2.5, 1.0); G("white2", new T.CylinderGeometry(0.4, 0.4, 0.05, 14).translate(a, 0.45, b - 1.2)); }
      C.act(0, -id / 2 + 3.2, 2.6, "ラウンジで注文する", () => ({ shop: { kind: "food", name: C.name, items: (P.PARK_DATA.MENU.bar || []).concat(P.PARK_DATA.MENU.cafe || []).slice(0, 8) } }), "🍹");
    },
    hotelroom(C) {
      const { B, G, iw, id, hi } = C;
      B("white2", 2.2, 0.5, 2.4, -iw / 2 + 2, 0.25, -id / 2 + 1.8); B("fabricW", 2.1, 0.12, 2.3, -iw / 2 + 2, 0.56, -id / 2 + 1.8); B("fabricB", 2.1, 0.06, 0.9, -iw / 2 + 2, 0.64, -id / 2 + 2.5); B("woodDark", 2.3, 1.1, 0.12, -iw / 2 + 2, 0.55, -id / 2 + 0.6); C.col(-iw / 2 + 2, -id / 2 + 1.8, 2.3, 2.5); C.seat(-iw / 2 + 2, -id / 2 + 2.6, 0, 0.62);
      B("woodLight", 1.4, 0.06, 0.6, iw / 2 - 1.2, 0.74, -id / 2 + 1); B("pBlack", 1.6, 0.9, 0.05, iw / 2 - 1.2, 1.5, -id / 2 + 0.35);
      B("fabricY", 0.9, 0.45, 0.9, iw / 2 - 1.3, 0.22, 0.4); C.seat(iw / 2 - 1.3, 0.4, -Math.PI / 2, 0.45);
      C.act(0, 0, 2.2, "ひと休みする", () => ({ rest: { name: C.name } }), "🛏️");
    },
    /* ★★ 2026-09-30b 大人のギャラリー（18歳以上・park_adult.js） */
    adult(C) { if (window.XAdult) XAdult.room(C); },
    mall(C) {
      const { B, G, W: Wd, iw, id, hi, o } = C, GD = P.PARK_DATA.GOODS, MN = P.PARK_DATA.MENU;
      const shops = [["NGX ストア", "store", "#0a1450"], ["ファッション NOVA", "fashion", "#c83a6a"], ["おもちゃの森", "toy", "#e0782a"], ["ブックス星見", "book", "#2a8a4a"], ["ミュージック", "music", "#6a3ad8"], ["スポーツ館", "sports", "#1a8ad8"], ["時計と宝石", "watch", "#8a6a0a"], ["雑貨 ひだまり", "zakka", "#d8a520"], ["フォトスタジオ", "photo", "#3a3a3a"], ["おみやげ横丁", "souvenir", "#b8262a"]];
      const per = Math.max(2, Math.floor((iw - 4) / 7)), sw = (iw - 2) / per;
      let k = 0;
      [-1, 1].forEach((side) => { if (side > 0 && id < 18) return; for (let i = 0; i < per && k < shops.length; i++, k++) {
        const [nm, gk, col] = shops[(k + (o.seed || 0)) % shops.length], a = -iw / 2 + 1 + sw * (i + 0.5), b = side < 0 ? -id / 2 + 2.2 : id / 2 - 4.4, fb = b + (side < 0 ? 2.0 : -2.0);
        B("white2", sw - 0.6, hi - 0.4, 0.2, a, (hi - 0.4) / 2, b + (side < 0 ? -1.9 : 1.9));
        B("woodLight", sw - 1.4, 1.0, 0.7, a, 0.5, fb - (side < 0 ? 0.9 : -0.9)); C.col(a, fb - (side < 0 ? 0.9 : -0.9), sw - 1.4, 0.8);
        for (let s = 0; s < 3; s++) B(["propPink", "propMint", "propYellow"][s], 0.5, 0.35, 0.35, a - 1 + s, 1.18, fb - (side < 0 ? 0.9 : -0.9));
        C.sign(nm, { bg: col, color: "#fff", border: "#ffd86a", px: 512 }, Math.min(sw - 1, 5.2), 0.8, a, hi - 1.2, fb - (side < 0 ? 1.7 : -1.7) * 1 + (side < 0 ? -0.2 : 0.2));
        C.act(a, fb, 2.2, nm + " で買い物", () => ({ shop: { kind: "goods", name: nm, items: GD[gk] || GD.default } }), "🛍️");
      } });
      /* まん中：吹き抜けの噴水・エスカレーター（飾り）・案内板 */
      G("stoneW", new T.CylinderGeometry(2.4, 2.6, 0.6, 24).translate(0, 0.3, 0)); G("neonCyan", new T.TorusGeometry(2.45, 0.06, 6, 32).rotateX(Math.PI / 2).translate(0, 0.62, 0)); G("glassDome", new T.SphereGeometry(1.2, 20, 12).translate(0, 1.8, 0)); C.col(0, 0, 5.2, 5.2);
      [-1, 1].forEach((s) => { const a = s * (iw / 2 - 3.2); for (let st = 0; st < 10; st++) B("chromeB", 1.2, 0.18, 0.5, a, 0.1 + st * 0.32, -2.2 + st * 0.45); B("glassClear", 0.05, 1.0, 5, a - 0.65, 2.2, 0); B("glassClear", 0.05, 1.0, 5, a + 0.65, 2.2, 0); C.col(a, 0, 1.5, 5.4); });
      C.act(0, 3.2, 2.4, "フロアの案内を見る", () => ({ lobby: { name: C.name, text: "このフロアには " + Math.min(k, shops.length) + " のお店。上の階はフードホール、ミュージアム、オフィス。エレベーターで行けます。" } }), "🗺️");
    }
  };
  const SIZE = { lobby: [22, 18, 6], shop: [14, 12, 4.2], food: [18, 14, 4.4], cafe: [14, 12, 4.2], gallery: [20, 16, 5], arcade: [18, 14, 4.2], gacha: [14, 12, 4.2], theater: [20, 22, 7], classroom: [16, 14, 4], library: [18, 14, 4.6], lab: [20, 14, 4.4], karaoke: [12, 10, 3.6], gym: [22, 18, 7], spa: [18, 14, 4.2], studio: [18, 14, 5], showroom: [22, 16, 5.2], room: [12, 10, 3.6],
    office: [24, 18, 3.8], server: [20, 16, 3.8], meeting: [16, 12, 3.8], exec: [18, 14, 4.2], lounge: [24, 16, 4.6], hotelroom: [10, 8, 3.2], mall: [40, 28, 6.4], adult: [30, 22, 6] };
  const MAPS = { office: ["creamW", "carpetGray", "white2"], server: ["pNavy", "expoFloor", "pNavy"], meeting: ["creamW", "carpetNavy", "white2"], exec: ["woodLight", "carpetRed", "white2"], lounge: ["pNavy", "carpetPlum", "pBlack"], hotelroom: ["creamW", "carpetTeal", "white2"], mall: ["white2", "marble", "white2"], adult: ["pNavy", "carpetPlum", "pBlack"] };
  const LIGHT2 = { server: "neon", lounge: "cinema", adult: "cinema" };

  /* ══════════════ 部屋を組み立てる（地下 RY に） ══════════════ */
  function buildRoom(def, fi) {
    const F = def.floors ? def.floors[fi] : def, type = F.type || "shop", sz = SIZE[type] || [16, 13, 4.2];
    const rw = F.w || sz[0], rd = F.d || sz[1], hi = F.h || sz[2], x0 = def.x, z0 = def.z;
    const name = F.name || def.name, mp = MAPS[type];
    const cap = capture(W, () => {
      const o = Object.assign({ type, name, glass: false, door: 2.6, key: "offWhite" }, mp ? { inner: mp[0], floor: mp[1], ceil: mp[2] } : {}, LIGHT2[type] ? { light: LIGHT2[type] } : {}, F.opt || {});
      ["menu", "prop", "list", "items", "text", "actLabel", "deskSign", "fortune", "seed", "video"].forEach((k) => { if (F[k] != null) o[k] = F[k]; });
      W.enterable(x0, z0, rw, rd, hi, 0, o);
      if (F.act) W.interact(x0, z0 - rd / 2 + 3.4, 2.8, F.act[0], () => F.act[1], F.act[2]);
      if (F.screen) W.bigScreen(x0, Math.min(hi - 1.7, 3.0), z0 - rd / 2 + 0.5, 0, Math.min(rw - 6, 10), Math.min(hi - 1.8, 3.4), F.screen[0], F.screen[1], ["#3a0a4a", "#0a1a5a"]);
      /* 窓（絵の景色）：左右と奥の壁 */
      const vm = viewTex(window.XFX && XFX.mode === "night"), wh = Math.min(hi - 1.6, 2.6), wy = 1.0 + wh / 2;
      if (F.view !== false) {
        const addWin = (w2, px, pz, ry) => { const m = new T.Mesh(new T.PlaneGeometry(w2, wh), vm); m.position.set(px, wy, pz); m.rotation.y = ry; W.scene.add(m); const f = new T.Mesh(new T.BoxGeometry(w2 + 0.2, wh + 0.2, 0.04), W.m.darkMetal); f.position.set(px - Math.sin(ry) * 0.03, wy, pz - Math.cos(ry) * 0.03); f.rotation.y = ry; W.scene.add(f); };
        if (type !== "theater" && type !== "karaoke" && type !== "haunted" && type !== "escape" && type !== "server" && type !== "studio" && type !== "adult") {
          [-1, 1].forEach((s) => addWin(rd - 4, x0 + s * (rw / 2 - 0.46), z0 - 0.5, -s * Math.PI / 2));
          if (type === "lounge" || type === "exec" || type === "office") addWin(rw - 6, x0, z0 - rd / 2 + 0.46, 0);
        }
      }
      /* 入口：閉じたガラスの扉（外へは E）・床の番号 */
      W.colObb(x0, z0 + rd / 2 - 0.25, 3.2, 0.5, 0);
      W.box("glassClear", x0, 0, z0 + rd / 2 - 0.3, 2.5, 3.0, 0.05); W.box("goldOrn", x0, 0, z0 + rd / 2 - 0.3, 0.06, 3.0, 0.08);
      W.interact(x0, z0 + rd / 2 - 1.6, 2.2, def.floors && fi > 0 ? "1階の出口から外へ出る" : "外に出る", () => ({ roomExit: true }), "🚪");
      if (def.floors && def.floors.length > 1) {
        const ex = x0 + rw / 2 - 2.2, ez = z0 - rd / 2 + 0.35;
        W.box("chromeB", ex, 0, ez, 2.4, 3.0, 0.12); W.box("pBlack", ex, 0, ez + 0.07, 0.04, 2.9, 0.02); W.box("neonCyan", ex, 3.05, ez, 2.4, 0.12, 0.14);
        W.sign((F.label || (fi + 1) + "F") + " ▲▼", { bg: "#0a1430", color: "#7fe8ff", px: 256 }, 1.2, 0.34, ex, 3.35, ez + 0.08, 0);
        W.interact(ex, ez + 1.6, 2.4, "エレベーター（階をえらぶ）", () => ({ roomFloors: true }), "🛗");
      }
      W.sign((F.label ? F.label + "  " : "") + name, { bg: "#0a1430", color: "#fff", border: "#ffd86a", px: 1024 }, Math.min(rw - 4, 9), 0.7, x0, hi - 0.55, z0 + rd / 2 - 0.42, Math.PI);
      if (F2[type] == null && def.floors && fi === 0 && type === "lobby") { /* ロビー：受付の案内 */ }
    });
    cap.root.position.y = RY;
    return { cap, x0, z0, rw, rd, hi, F, def, fi };
  }
  function activate(room) {
    const g = room.cap.got;
    W.scene.add(room.cap.root);
    g.colliders.forEach((c) => { c.ya = RY - 30; c.yb = RY + 30; W.colliders.push(c); });
    g.inter.forEach((it) => { it.y = RY; W.inter.push(it); });
    g.seats.forEach((s) => { s.h += RY; W.seats.push(s); });
    g.zones.forEach((zn) => W.zones.push(zn));
    g.interiors.forEach((q) => { q.y0 = RY; q.yMax = RY + 40; W.interiors.push(q); });
    g.screens.forEach((s) => W.screens.push(s));
    g.anim.forEach((f) => W.anim.push(f));
    room.lv = { lv: true, cx: room.x0, cz: room.z0, ang: 0, hw: room.rw / 2 + 2, hl: room.rd / 2 + 2, y: RY }; W.heightExtra.push(room.lv);
    if (W.signAtlas) W.signAtlas.pages.forEach((pg) => { pg.tex.needsUpdate = true; });
  }
  function deactivate(room) {
    const g = room.cap.got, rm = (arr, list) => { if (!list.length) return; const S = new Set(list); for (let i = arr.length - 1; i >= 0; i--) if (S.has(arr[i])) arr.splice(i, 1); };
    rm(W.colliders, g.colliders); rm(W.inter, g.inter); rm(W.seats, g.seats); rm(W.zones, g.zones); rm(W.interiors, g.interiors); rm(W.screens, g.screens); rm(W.anim, g.anim); rm(W.heightExtra, [room.lv]);
    W.scene.remove(room.cap.root);
    room.cap.root.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  }

  /* ══════════════ 暗転・エレベーターの扉（画面） ══════════════ */
  function ui() {
    if (document.getElementById("xelev")) return;
    const st = document.createElement("style");
    st.textContent = "#xelev{position:fixed;inset:0;z-index:60;pointer-events:none;display:none}#xelev.on{display:block}#xelev .dl,#xelev .dr{position:absolute;top:0;bottom:0;width:50%;background:linear-gradient(90deg,#9aa4b4,#dfe6ee 45%,#aeb8c6);box-shadow:inset 0 0 40px rgba(0,0,0,.35);transition:transform .5s cubic-bezier(.6,0,.3,1)}#xelev .dl{left:0;transform:translateX(-100%)}#xelev .dr{right:0;transform:translateX(100%)}#xelev.shut .dl,#xelev.shut .dr{transform:none}#xelev .ind{position:absolute;left:50%;top:14%;transform:translateX(-50%);min-width:170px;padding:10px 18px;border-radius:12px;background:#0a1020;color:#7fe8ff;font:900 34px/1.1 'M PLUS Rounded 1c',sans-serif;text-align:center;box-shadow:0 0 24px rgba(79,240,255,.4);opacity:0;transition:opacity .3s}#xelev.shut .ind{opacity:1}#xelev .ind small{display:block;font-size:13px;color:#cfe;margin-top:4px}" +
      "#xliftHud{position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:40;padding:8px 16px;border-radius:14px;background:rgba(8,14,34,.78);color:#fff;font:800 14px/1.35 'M PLUS Rounded 1c',sans-serif;text-align:center;display:none;box-shadow:0 4px 18px rgba(0,0,0,.35)}#xliftHud.on{display:block}#xliftHud b{display:block;font-size:26px;color:#7fe8ff}";
    document.head.appendChild(st);
    const d = document.createElement("div"); d.id = "xelev"; d.innerHTML = '<div class="dl"></div><div class="dr"></div><div class="ind"><span class="fl">1F</span><small class="nm"></small></div>'; document.body.appendChild(d);
    const h = document.createElement("div"); h.id = "xliftHud"; document.body.appendChild(h);
  }
  function elevator(fromLab, toLab, name, mid, done) {
    ui(); const el = document.getElementById("xelev"), fl = el.querySelector(".fl"), nm = el.querySelector(".nm");
    el.classList.add("on"); fl.textContent = fromLab; nm.textContent = name || "";
    requestAnimationFrame(() => el.classList.add("shut"));
    const seq = floorSeq(fromLab, toLab);
    setTimeout(() => { if (mid) mid(); let i = 0; const tk = setInterval(() => { fl.textContent = seq[Math.min(seq.length - 1, i++)]; if (i >= seq.length) { clearInterval(tk); setTimeout(() => { el.classList.remove("shut"); setTimeout(() => { el.classList.remove("on"); if (done) done(); }, 520); }, 260); } }, Math.max(60, 900 / seq.length)); }, 560);
  }
  function floorSeq(a, b) { const n = (s) => s === "R" ? 999 : parseInt(s, 10) || 1, A = n(a), B = n(b); if (A === 999 || B === 999 || Math.abs(A - B) > 60) return [b]; const out = [], st = A < B ? 1 : -1; for (let f = A; f !== B; f += st) out.push(f + "F"); out.push(b); return out.filter((x, i) => i % Math.max(1, Math.floor(out.length / 14)) === 0 || i === out.length - 1); }
  function fade(on, txt) { const ov = document.getElementById("fade"); if (!ov) return; if (on) { ov.classList.add("on"); const t = document.getElementById("fadeT"); if (t) t.textContent = txt || ""; } else ov.classList.remove("on"); }

  /* ══════════════ 入る・出る・階をかえる ══════════════ */
  function labelOf(def, i) { return def.floors ? (def.floors[i].label || (i + 1) + "F") : "1F"; }
  function spawnAtDoor(room) { API.place(room.x0, room.z0 + room.rd / 2 - 2.4, RY, Math.PI); }
  function spawnAtLift(room) { API.place(room.x0 + room.rw / 2 - 2.2, room.z0 - room.rd / 2 + 2.2, RY, 0); }
  function enter(def, fi) {
    fi = fi || 0;
    if (def.floors && def.floors[fi] && (def.floors[fi].deck || def.floors[fi].roof)) return liftUp(def, fi);
    fade(true, def.name + (def.floors ? "（" + labelOf(def, fi) + "）" : "") + " に入ります…");
    setTimeout(() => {
      if (!R.cur) R.back = { x: def.fx, z: def.fz, yaw: def.fyaw, y: def.fy || null };
      else deactivate(R.cur);
      const room = buildRoom(def, fi); activate(room); R.cur = room; spawnAtDoor(room);
      setTimeout(() => fade(false), 120);
      if (API.toast) API.toast("🚪 " + (room.F.label ? room.F.label + " " : "") + (room.F.name || def.name) + "（" + (fi > 0 ? "エレベーターで ほかの階へ・" : "") + "出口の前で E で外へ）");
    }, 380);
  }
  function exit() {
    if (!R.cur) return false;
    fade(true, "外に出ます…");
    setTimeout(() => { const b = R.back || { x: R.cur.def.fx, z: R.cur.def.fz, yaw: R.cur.def.fyaw }; deactivate(R.cur); R.cur = null; API.place(b.x, b.z, b.y != null ? b.y : W.heightAt(b.x, b.z), b.yaw); setTimeout(() => fade(false), 100); }, 380);
    return true;
  }
  function goFloor(def, i) {
    const F = def.floors[i];
    if (F.adult && window.XAdult && !XAdult.ok()) { XAdult.ask(() => goFloor(def, i)); return; }          /* ★★ 2026-09-30b 18歳以上の確認 */
    if (F.here) { /* 1階（本物のロビー）へ */ const from = R.cur ? labelOf(def, R.cur.fi) : "1F"; elevator(from, F.label || "1F", def.name, () => { if (R.cur) { deactivate(R.cur); R.cur = null; } const b = def.lobby || R.back; if (b) API.place(b.x, b.z, W.heightAt(b.x, b.z), b.yaw); }); return; }
    if (F.deck || F.roof) { if (R.cur) { const r0 = R.cur; deactivate(r0); R.cur = null; } return liftUp(def, i); }
    const from = R.cur ? labelOf(def, R.cur.fi) : "1F";
    elevator(from, labelOf(def, i), def.name, () => {
      if (R.cur) deactivate(R.cur); else R.back = def.lobby ? { x: def.lobby.x, z: def.lobby.z, yaw: def.lobby.yaw } : { x: def.fx, z: def.fz, yaw: def.fyaw };
      const room = buildRoom(def, i); activate(room); R.cur = room; spawnAtLift(room);
    });
  }
  function floorsUI(def) {
    def = def || (R.cur && R.cur.def); if (!def || !def.floors) return;
    const b = XParkUI.panel("🛗", def.name + "　エレベーター", "rooms"), curI = R.cur ? R.cur.fi : -1;
    b.innerHTML = '<p class="pnote">行きたい階をえらんでね（' + def.floors.length + ' のフロア）。</p><div class="pgrid">' + def.floors.map((F, i) => '<button class="pitem" data-i="' + i + '"' + (i === curI ? " disabled" : "") + '><span class="pemo">' + (F.deck || F.roof ? "🌆" : F.here ? "🏛️" : ({ office: "💻", server: "🖥️", meeting: "📋", exec: "🏢", lounge: "🍸", mall: "🛍️", food: "🍽️", cafe: "☕", gallery: "🖼️", lab: "🧪", studio: "🎬", gym: "🏋️", hotelroom: "🛏️", library: "📚", arcade: "🕹️", theater: "🎞️", spa: "♨️", classroom: "✏️", lobby: "🛎️", shop: "🛍️", karaoke: "🎤", showroom: "🚘", adult: "🔞" })[F.type] || "🏬") + "</span><b>" + (F.label || (i + 1) + "F") + "</b><small>" + (F.name || "") + "</small><i>" + (i === curI ? "いまの階" : "行く") + "</i></button>").join("") + "</div>";
    b.querySelectorAll(".pitem").forEach((el) => el.onclick = () => { const i = +el.dataset.i; XParkUI.close(); goFloor(def, i); });
  }

  /* ══════════════ ガラスのエレベーター（建物の外がわを上る・本物の景色） ══════════════ */
  function capsule() {
    const g = new T.Group(), glass = new T.MeshStandardMaterial({ color: 0xcfefff, transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0.2, side: T.DoubleSide, depthWrite: false });
    g.add(new T.Mesh(new T.CylinderGeometry(1.35, 1.35, 2.7, 24, 1, true), glass)); g.children[0].position.y = 1.35;
    const fr = W.m.gold || new T.MeshStandardMaterial({ color: 0xd8b040 });
    [0, 2.7].forEach((y) => { const d = new T.Mesh(new T.CylinderGeometry(1.45, 1.45, 0.16, 24), W.m.white2 || fr); d.position.y = y; g.add(d); const rg = new T.Mesh(new T.TorusGeometry(1.42, 0.05, 6, 32), fr); rg.rotation.x = Math.PI / 2; rg.position.y = y + (y ? -0.1 : 0.1); g.add(rg); });
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU, b = new T.Mesh(new T.CylinderGeometry(0.035, 0.035, 2.7, 6), fr); b.position.set(Math.cos(a) * 1.38, 1.35, Math.sin(a) * 1.38); g.add(b); }
    const rail = new T.Mesh(new T.BoxGeometry(0.5, 0.5, 0.5), W.m.chromeB || fr); g.add(rail); g.userData.rail = rail;
    return g;
  }
  /* o = { x, z（のぼる所）, ax, az（外向き）, y0, y1, name, done(), floors 表示用の最上階 } */
  function liftRide(o) {
    ui(); if (R.lift) return;
    const g = capsule(); g.position.set(o.x, o.y0, o.z); W.scene.add(g);
    const rail = new T.Mesh(new T.BoxGeometry(0.35, Math.abs(o.y1 - o.y0) + 3, 0.35), W.m.chromeB); rail.position.set(o.x - o.ax * 1.55, (o.y0 + o.y1) / 2 + 1.5, o.z - o.az * 1.55); W.scene.add(rail);
    const dh = Math.abs(o.y1 - o.y0);
    R.lift = { o, g, rail, t: -0.6, T: Math.max(4.5, Math.min(12, dh / 26)), yaw: Math.atan2(o.ax, o.az) };
    if (API.hideAvatar) API.hideAvatar(true);
    document.getElementById("xliftHud").classList.add("on");
  }
  function liftUpdate(dt) {
    const L = R.lift; if (!L) return;
    L.t += dt; const u = Math.max(0, Math.min(1, L.t / L.T)), k = u * u * (3 - 2 * u), y = L.o.y0 + (L.o.y1 - L.o.y0) * k;
    L.g.position.y = y; L.y = y;
    const v = L.t > 0 && L.t < L.T ? Math.abs(L.o.y1 - L.o.y0) / L.T * 6 * u * (1 - u) : 0;
    const top = L.o.topF || Math.round(Math.max(L.o.y0, L.o.y1) / 4.2);
    document.getElementById("xliftHud").innerHTML = "🛗 " + (L.o.name || "エレベーター") + "<b>" + Math.max(1, Math.round(y / 4.2)) + "F　" + Math.round(y) + " m</b>" + (v > 0.5 ? "秒速 " + v.toFixed(1) + " m（時速 " + Math.round(v * 3.6) + " km）" : L.t < 0 ? "扉が閉まります…" : "到着しました") + "　／　最上階 " + top + "F";
    if (L.t >= L.T + 0.7) {
      W.scene.remove(L.g); W.scene.remove(L.rail); R.lift = null;
      document.getElementById("xliftHud").classList.remove("on");
      if (API.hideAvatar) API.hideAvatar(false);
      if (L.o.done) L.o.done();
    }
  }
  function liftCamera(dt, camera) {
    const L = R.lift; if (!L) return false;
    const sway = Math.sin(L.t * 0.35) * 0.7, yaw = L.yaw + sway, down = L.o.y1 > L.o.y0 ? -0.18 - 0.25 * Math.min(1, Math.max(0, L.t / L.T)) : -0.3;
    camera.position.set(L.o.x, (L.y || L.o.y0) + 1.62, L.o.z);
    camera.lookAt(L.o.x + Math.sin(yaw) * 10, (L.y || L.o.y0) + 1.62 + down * 10, L.o.z + Math.cos(yaw) * 10);
    return true;
  }
  /* 屋上・展望フロアへ */
  function liftUp(def, i) {
    const F = def.floors[i], L = def.lift; if (!L) return;
    const b = R.cur ? null : null;
    if (R.cur) { deactivate(R.cur); R.cur = null; }
    fade(true, (F.name || "屋上") + " へ…");
    setTimeout(() => {
      fade(false);
      liftRide({ x: L.x, z: L.z, ax: L.ax, az: L.az, y0: L.y0 || 0.2, y1: F.deck ? F.deck.y : L.top, name: def.name + "　" + (F.label || "") + " " + (F.name || ""), topF: L.topF,
        done: () => {
          if (F.deck) { API.deck(Object.assign({ name: F.name }, F.deck, { liftDef: def })); return; }
          startRoof(def, F);
        } });
    }, 380);
  }
  /* 屋上（長方形）：四角い「展望デッキ」として歩ける（ふちから落ちない）。出口（エレベーター）の前で E で下へ */
  function startRoof(def, F) {
    const rf = def.roof; if (!rf) return;
    const c = Math.cos(rf.ry || 0), s = Math.sin(rf.ry || 0), ex = rf.x + (rf.d / 2 - 2.2) * s, ez = rf.z + (rf.d / 2 - 2.2) * c;
    API.deck({ rect: true, x: rf.x, z: rf.z, ry: rf.ry || 0, hw: rf.w / 2 - 1.2, hd: rf.d / 2 - 1.2, y: rf.y, exitX: ex, exitZ: ez, exitR: 2.6, liftDef: def, name: def.name + " の屋上" });
    if (API.toast) API.toast("🌆 " + def.name + " の屋上（" + Math.round(rf.y) + "m）。エレベーターの前で E（下のボタン）で地上へ");
  }
  /* 展望フロア（丸い）から下りる：ガラスのエレベーターで */
  function deckDown(dk) {
    const def = dk.liftDef; if (!def || !def.lift) return false;
    const L = def.lift;
    liftRide({ x: L.x, z: L.z, ax: L.ax, az: L.az, y0: dk.y, y1: L.y0 || 0.2, name: def.name + "　地上へ", topF: L.topF, done: () => { const b = !dk.rect && def.lobby ? def.lobby : { x: def.fx, z: def.fz, yaw: def.fyaw }; API.place(b.x, b.z, W.heightAt(b.x, b.z), b.yaw); } });
    return true;
  }

  /* ══════════════ 建物の入口（正面にガラスの扉・名前の札・E で中へ） ══════════════ */
  const NM = {
    fut: [["スカイ", "ネオン", "ミライ", "ギャラクシー", "ステラ", "オービット", "サイバー", "ルミナ", "ノヴァ", "ホライズン", "アストロ", "クオーツ"], ["タワー", "ビル", "センター", "プラザ", "スクエア", "ヒルズ", "コート", "ゲート"]],
    yoma: [["妖魔", "月見", "化け猫", "狐火", "河童", "天狗", "あやかし", "ろくろ", "夜桜", "提灯", "ぬらり", "鬼灯"], ["堂", "屋", "館", "亭", "商店", "本舗", "楼", "庵"]]
  };
  const YOMA_AREA = { kabuki: 1, yukaku: 1, yokai: 1, shrine: 1, marketW: 1, marketE: 1, gate: 1, onsen: 1, wonder: 1, green: 1 };
  function nameFor(w, x, z, big) {
    const a = w.areaName ? w.areaName(x, z) : null, pool = a && YOMA_AREA[a.id] ? NM.yoma : NM.fut, h = Math.abs(Math.floor(x * 7.31 + z * 3.17)), U = w._bldNames = w._bldNames || {};
    let nm = ""; for (let t = 0; t < 16; t++) { nm = pool[0][(h + t * 5) % pool[0].length] + pool[1][((h >> 3) + t * 3) % pool[1].length]; if (!U[nm]) break; }          /* ★ 同じ名前の建物が並ばないように */
    if (U[nm]) { U[nm]++; nm += " " + U[nm] + "号館"; } else U[nm] = 1;
    return nm;
  }
  const SHOPT = [["shop", "お店"], ["food", "食堂"], ["cafe", "カフェ"], ["gallery", "ギャラリー"], ["arcade", "ゲームセンター"], ["gacha", "ガチャ屋"], ["library", "本屋"], ["karaoke", "カラオケ"], ["studio", "写真館"], ["showroom", "ショールーム"], ["spa", "湯屋"], ["lab", "工房"]];
  function typeFromName(n, h) {
    const s = String(n || "");
    if (/ラーメン|食堂|定食|焼き|寿司|すし|そば|うどん|丼|カレー|レストラン|DINER|FOOD|グリル|屋台|たこ|お好み|天ぷら/i.test(s)) return "food";
    if (/カフェ|喫茶|CAFE|COFFEE|甘味|茶|パフェ|ケーキ|スイーツ/i.test(s)) return "cafe";
    if (/ゲーム|GAME|ARCADE|アーケード/i.test(s)) return "arcade"; if (/ガチャ/.test(s)) return "gacha"; if (/カラオケ|KARAOKE/i.test(s)) return "karaoke";
    if (/本|書|BOOK|LIBRARY|図書/i.test(s)) return "library"; if (/写真|PHOTO|STUDIO|スタジオ/i.test(s)) return "studio"; if (/湯|SPA|温泉|銭湯/i.test(s)) return "spa";
    if (/ギャラリー|GALLERY|美術|博物|MUSEUM|展示/i.test(s)) return "gallery"; if (/ホテル|HOTEL|旅館|INN/i.test(s)) return "hotel"; if (/オフィス|OFFICE|商事|本社|BANK|銀行/i.test(s)) return "office";
    if (/LAB|研究|ラボ/i.test(s)) return "lab"; if (/SHOWROOM|ショールーム|EV/i.test(s)) return "showroom";
    return null;
  }
  function defFor(w, name, x, z, h, seed, fx, fz, fyaw, lift, roof) {
    const t0 = typeFromName(name, h);
    if (h >= 30 || t0 === "office" || t0 === "hotel") {
      const hotel = t0 === "hotel" || (!t0 && seed % 5 === 0);
      const topF = Math.max(3, Math.round(h / 4.2)), fl = [{ label: "1F", name: hotel ? "ホテルのロビー" : "エントランスロビー", type: "lobby", opt: { deskSign: hotel ? "FRONT  フロント" : "RECEPTION  受付", actLabel: hotel ? "フロントで案内を聞く" : "受付で案内を聞く", text: hotel ? "ようこそ " + name + " へ。客室・レストラン・スカイラウンジはエレベーターでどうぞ。" : name + " へようこそ。上の階はオフィス・会議室・スカイラウンジです。" } }];
      const pool = hotel ? [["food", "レストラン"], ["hotelroom", "客室"], ["hotelroom", "スイートルーム"], ["spa", "スパ"], ["gym", "フィットネス"]] : [["cafe", "カフェ"], ["office", "オフィス"], ["meeting", "会議室"], ["lab", "研究ラボ"], ["server", "データセンター"], ["gallery", "ギャラリー"], ["gym", "フィットネス"], ["library", "ライブラリー"]];
      const n = Math.min(pool.length, 2 + (seed % 3) + (h > 80 ? 1 : 0)), used = [];
      for (let k = 0; k < n; k++) { const p = pool[(seed + k * 3) % pool.length]; if (used.includes(p[0] + p[1])) continue; used.push(p[0] + p[1]); fl.push({ type: p[0], name: p[1], seed: seed + k }); }
      fl.sort((a, b) => (a.type === "lobby" ? -1 : b.type === "lobby" ? 1 : 0));
      const step = Math.max(1, Math.floor((topF - 2) / Math.max(1, fl.length)));
      fl.forEach((F, k) => { if (k) F.label = Math.min(topF - 1, 1 + k * step) + "F"; });
      if (h >= 26) fl.push({ label: topF + "F", name: "スカイラウンジ", type: "lounge" });
      if (roof && lift) fl.push({ label: "R", name: "屋上（展望）", roof: true });
      return { name, x, z, fx, fz, fyaw, floors: fl, lift, roof };
    }
    if (h >= 12 && !t0) {
      const k = seed % 4, fl = [[{ type: "shop", name: "1階 ショップ" }, { type: "cafe", name: "2階 カフェ" }, { type: "gallery", name: "3階 ギャラリー" }], [{ type: "food", name: "1階 レストラン" }, { type: "karaoke", name: "2階 カラオケ" }, { type: "arcade", name: "3階 ゲームセンター" }], [{ type: "lobby", name: "1階 ロビー", opt: { text: name + " にようこそ。" } }, { type: "office", name: "2階 オフィス" }, { type: "classroom", name: "3階 教室" }], [{ type: "shop", name: "1階 ショップ" }, { type: "library", name: "2階 本屋" }, { type: "studio", name: "3階 スタジオ" }]][k];
      fl.forEach((F, i) => { F.label = (i + 1) + "F"; });
      return { name, x, z, fx, fz, fyaw, floors: fl.slice(0, h >= 16 ? 3 : 2) };
    }
    const t = t0 || SHOPT[seed % SHOPT.length][0];
    return { name, x, z, fx, fz, fyaw, type: t, seed };
  }
  /* 入口を付ける：建物の中心 x,z・幅 bw・奥行き bd・高さ h・向き ry。正面（ローカル +z）→ 裏 → 左右の順に、前があいている面をえらぶ */
  function autoDoor(w, x, z, bw, bd, h, ry, o, roofInfo) {
    if (!w.building || w._capturing || w._noAutoDoor || (o && (o.noDoor || o.inside))) return null;
    if (h < 4.2 || bw < 5 || bd < 5) return null;
    (w._doorQ = w._doorQ || []).push([x, z, bw, bd, h, ry || 0, { name: o && ((o.sign && (o.sign.text || o.sign)) || o.name) }, roofInfo]);
    return null;
  }
  /* 入口を置く（建物がぜんぶそろってから：前が道・広場・芝生であいている面） */
  P.placeDoors = function () {
    const w = this, Q = w._doorQ || []; w._doorQ = []; if (!Q.length) return;
    const I = w.spotIndex(); let n = 0;
    const why = {}; w._doorWhy = why;
    Q.forEach((q) => { if (placeDoor(w, I, ...q)) n++; });
    w._autoDoors = n; w._doorTried = Q.length;
    /* ★★ 2026-09-30b 影の形から付けていた入口はやめた（建物のない所・謎の所に扉ができていた） */
  };
  function placeDoor(w, I, x, z, bw, bd, h, ry, o, roofInfo) {
    const c = Math.cos(ry || 0), s = Math.sin(ry || 0), L = (a, b) => [x + a * c + b * s, z - a * s + b * c];
    const faces = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    for (const [na, nb] of faces) {
      const half = na ? bw / 2 : bd / 2; if ((na ? bd : bw) < 4.5) continue;
      const nx = na * c + nb * s, nz = -na * s + nb * c, [fx0, fz0] = L(na * half, nb * half), fx = fx0 + nx * 2.2, fz = fz0 + nz * 2.2;
      const why = w._doorWhy || {}, bad = I.col(fx, fz, 0.45) ? "col" : I.bld(fx, fz, 0.4) ? "bld" : I.water(fx, fz) ? "water" : !w.insideIsland(fx, fz, 4) ? "coast" : I.col(fx0 + nx * 1.0, fz0 + nz * 1.0, 0.2) ? "col1" : null;
      if (bad) { why[bad] = (why[bad] || 0) + 1; continue; }
      const nearWay = I.road(fx, fz, 11) || (w.paved || []).some((q) => fx > q[0] - 10 && fx < q[2] + 10 && fz > q[1] - 10 && fz < q[3] + 10);
      if (!nearWay) { why.far = (why.far || 0) + 1; continue; }          /* ★ 2026-09-30b 道や広場に面していない面には付けない */
      const dry = Math.atan2(nx, nz), name = (o && o.sign && (o.sign.text || o.sign)) || (o && o.name) || nameFor(w, x, z, h > 30);
      /* 扉：金の枠・ガラス2枚・取っ手・名前の札・足ふきマット */
      const dx = fx0 + nx * 0.035, dz = fz0 + nz * 0.035;
      w.detail(() => {
        w.box("goldOrn", dx - nx * 0.02, 0, dz - nz * 0.02, 2.8, 2.95, 0.05, { ry: dry });
        w.box("glassClear", dx, 0.02, dz, 2.5, 2.7, 0.03, { ry: dry }); w.box("darkMetal", dx + nx * 0.01, 0.02, dz + nz * 0.01, 0.05, 2.7, 0.035, { ry: dry });
        [-1, 1].forEach((k) => w.box("chromeB", dx + nx * 0.03 + Math.cos(dry) * k * 0.18, 1.0, dz + nz * 0.03 - Math.sin(dry) * k * 0.18, 0.04, 0.5, 0.04, { ry: dry }));
        w.box("stoneW", fx0 + nx * 0.7, 0, fz0 + nz * 0.7, 3.2, 0.06, 1.2, { ry: dry });
      });
      if (typeof name === "string" && name.length <= 18) w.sign(name, { bg: "#0a1430", color: "#fff", border: "#ffd86a", px: 512 }, Math.min(bw, bd, 4.6), 0.5, dx + nx * 0.02, 3.2, dz + nz * 0.02, dry, { detail: true });
      const seed = Math.abs(Math.floor(x * 13.7 + z * 7.9));
      let lift = null, roof = null;
      if (roofInfo && roofInfo.y >= 24) { const [lx, lz] = L(na * (half + 1.9) + (na ? 0 : bw / 2 - 2.2), nb * (half + 1.9) + (nb ? 0 : bd / 2 - 2.2)); lift = { x: lx, z: lz, ax: nx, az: nz, y0: 0.2, top: roofInfo.y, topF: Math.round(roofInfo.y / 4.2) }; roof = roofInfo;
        /* ★★ 2026-09-30d 屋上へのエレベーターを見えるように（ガラスの筒・入口・屋上への渡り廊下）＝ご指定「エレベーターの入り口が変」 */
        if (w.liftShaft && !I.road(lx, lz, 1.9) && !I.col(lx, lz, 1.8) && !I.water(lx, lz)) w.liftShaft(lift, roofInfo.y, { bridges: [[roofInfo.y, 2.0]], door: true, label: "エレベーター（屋上へ）" }); }
      const def = defFor(w, String(name), x, z, h, seed, fx, fz, dry + Math.PI, lift, roof);
      def.x = x; def.z = z;
      w.interact(fx, fz, 2.3, "中に入る：" + String(name).slice(0, 16), () => ({ room: def }), "🚪");
      (w.doors = w.doors || []).push([fx, fz]);
      return def;
    }
    return null;
  }
  /* 建物の関数に入口を付ける（中まである建物＝inside はそのまま） */
  const _bld = P.bld;
  P.bld = function (x, z, w, d, h, o) { const top = _bld.apply(this, arguments); o = o || {}; if (!o.inside && !(o.y > 0.5) && (o.sign || o.shop)) autoDoor(this, x, z, w, d, h, o.ry || 0, o, h >= 24 && (o.roof || "flat") === "flat" ? { x, z, w, d, ry: o.ry || 0, y: top + 0.35 } : null); return top; };
  const _sky = P.skyscraper;
  P.skyscraper = function (x, z, w, d, h, o) {
    o = o || {}; this._noAutoDoor = (this._noAutoDoor || 0) + 1; let y; try { y = _sky.apply(this, arguments); } finally { this._noAutoDoor--; }
    const steps = o.steps || 3, tp = o.taper || 0.8, k = Math.pow(tp, steps - 1), bw = o.podium ? w + 8 : w, bd = o.podium ? d + 8 : d;
    autoDoor(this, x, z, bw, bd, h, 0, o, !o.spire ? { x, z, w: w * k, d: d * k, ry: 0, y: y + 0.45 } : null);
    return y;
  };
  const _shop = P.yomaShop;
  P.yomaShop = function (x, z, w, d, h, o) { const top = _shop.apply(this, arguments); o = o || {}; if (!o.inside) autoDoor(this, x, z, w, d, h, o.ry || 0, { name: o.sign, noDoor: o.noDoor }); return top; };
  const _ft = P.futureTower;
  P.futureTower = function (x, z, w, h, o) { const r = _ft.apply(this, arguments); autoDoor(this, x, z, w, w * 0.85, h, 0, o || {}, null); return r; };

  /* ══════════════ main.js から ══════════════ */
  function handle(r) {
    if (r.room) { enter(r.room, r.floor || 0); return true; }
    if (r.roomExit) { exit(); return true; }
    if (r.roomFloors) { floorsUI(r.roomFloors === true ? null : r.roomFloors); return true; }
    if (r.liftTo) { const def = r.liftTo.def, i = r.liftTo.i; goFloor(def, i); return true; }
    return false;
  }
  if (P.INT_FURN) Object.assign(P.INT_FURN, F2);
  window.XRooms = {
    RY, R,
    init(world, api) { W = world; API = api; ui(); },
    handle, enter, exit, goFloor, floorsUI, deckDown,
    busy: () => !!R.lift,
    inRoom: () => !!R.cur,
    update: (dt) => liftUpdate(dt),
    camera: (dt, cam) => liftCamera(dt, cam),
    autoDoor: (w, x, z, bw, bd, h, ry, o, roof) => autoDoor(w, x, z, bw, bd, h, ry, o, roof),
    F2
  };
})();
