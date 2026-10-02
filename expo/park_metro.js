/* ══════════════════════════════════════════════════════════════════
   XEVARION PARK — 地下鉄「XEVARION METRO ゆめ環状線」（★★ 2026-09-30d ご指定
   「モノレールのように地下鉄などの乗り物を PARK 内に走らせたい。乗るところや路線図など細部まで作成」）
   ------------------------------------------------------------------
   ・パークのまん中の帯（ゲート → 西 → 北の NGX 本社 → 東 → ゲート）を1周する環状線・12 駅・1 周 約 3.4km。
     2 本の線路（外回り＝時計回り・内回り）。日本の電車と同じ左側通行・島式ホーム（ドアは右側が開く）。
   ・駅（地下）：地上の出入口（ガラスの屋根・「M」の看板の柱・エレベーター）→ 階段 → 地下通路 → 改札階（券売機・運賃表・
     駅事務室・自動改札・路線図・電光掲示板）→ 階段とエスカレーター → ホーム（ホームドア・駅名標・のりば案内・ベンチ・自販機・
     時計つき電光掲示板・広告）。ホームのどこからでも「乗る」→ 行き先をえらぶと、近い向き（外回り／内回り）を自動で決める。
   ・トンネル：コンクリートの箱・壁の明かり・ケーブル・待避通路・線路（レール・まくら木・第三軌条）・複線の間の柱。
   ・車両：4 両・銀色の車体に路線の色の帯・前の行き先表示・妖魔シティの電車の目。車内放送（日本語と英語）・乗り換え案内。
   ・地下の部分は地下にいるとき（と出入口の近く）だけ描く。地上の地面には出入口の所だけ穴をあける。
   ・高さ：改札階の床 −6m・ホームの床（車両の床）−12.5m。地下では地上の当たりは効かない（world.js）・明るさは駅（main.js）。
   ══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const T = THREE, X = XTex, P = XWorld.World.prototype, TAU = Math.PI * 2, XP = XPark;
  const XT = window.XTransit; if (!XT || !XT.lib) return;
  const Q = XT.lib;
  const { mkPath, pAt, pDir, nearestS, fwd, sgnD, mkLine, mkTrains, travelTime, makeProbe, linkRoad, smooth, esc } = Q;

  /* ── 高さと大きさ ── */
  const YM = -6.0, YP = -12.5, YC = YM - 0.5, YMC = YM + 4.7, YT = YP - 1.1, YTC = YP + 4.4;
  const DST = 6.15, DTN = 2.4;                     /* 線路の中心の横の位置（駅・トンネル） */
  const PW = 4.4, PL = 34, SB = 8.2, SA = 41;      /* ホームの半分の幅・長さ／駅の箱の半分の幅・長さ */
  const MZ0 = -34, MZ1 = 36, GA = 26;              /* 改札階の範囲（a）・改札の位置 */
  const SW = 2.1;                                  /* ホームへの階段の半分の幅 */
  const STAIRS = [{ a0: -22, a1: -10, up: 1 }, { a0: 4, a1: 16, up: -1 }];     /* up：+1＝a が大きい方が上（改札階） */
  const RUN = 12, WC = 4.6, HC = 3.4;              /* 地上への階段の長さ・通路の幅・高さ */
  const NC = 4, PITCH = 13.8;
  const COLS = [-5.5, -1.5, 20.5, 25, 29.5];       /* ホームのまん中の柱（階段・エレベーターの所はよける） */
  const EVA = -29.5;                               /* ホームと改札階を結ぶエレベーター（a） */
  const LINE = { id: "yume", jp: "ゆめ環状線（急行）", en: "Yume Express Ring", letter: "Y", color: "#ff3d8b", dark: "#a0104e", light: "#ffe0ee" };
  /* ★★ 2026-10-01 長い距離を速く運ぶ「急行の環状線」に作り直し（ご指定「地下鉄は長距離輸送が目的なので路線を伸ばして駅数を減らして」）
     12駅 → 7駅・1周 約 3.5km → 約 5.3km（モノレールの外の新しい土地＝MAGIBURST LAND・XEVA GACHA PALACE・MAGI BOCCIA RUSH LAND まで）。
     駅と駅のあいだは 400〜1100m。電車も速く（最高 30m/s）。
     駅（時計回り＝外回りの順）：[番号, 名前, 英語, [目安の x, z], 近くの見どころ] */
  const ST_DEF = [
    ["Y01", "ゲート", "GATE", [-150, 895], "ゲート・マーケット・妖怪商店街・ビーチ"],
    ["Y02", "マギバーストランド", "MAGIBURST LAND", [-955, 115], "マギバーストランド（黄昏の王城・ボスコロシアム）・宇宙港"],
    ["Y03", "スタジアム", "STADIUM", [-450, -385], "サッカースタジアム・ISHIDA PRODUCTION・アドベンチャー"],
    ["Y04", "NGX 本社", "NGX HQ", [-20, -430], "NGX GLOBAL HQ・ドーム・モーターシティ・ハーバー"],
    ["Y05", "ガチャパレス", "XEVA GACHA PALACE", [885, -285], "XEVA ガチャパレス（本物のガチャ）・ファンランド・NGX CITY"],
    ["Y06", "リゾート", "RESORT", [640, 160], "リゾート・フューチャーハイツ・ナイトゾーン・ゲームワールド"],
    ["Y07", "ボッチャラッシュ", "BOCCIA RUSH LAND", [620, 1010], "マギボッチャラッシュランド・スポーツワールド・夜桜遊郭"]
  ];
  const METRO = window.XMetro = { LINE, stations: [], kiosks: [], lines: [], holes: [], screens: [], built: false, group: null, meshes: [] };
  const _p = { x: 0, y: 0, z: 0 }, _d = { x: 0, z: 0 };

  /* ══════════════ 材質（タイルの壁・テラゾーの床・点字ブロック・光る天井・線路・車体） ══════════════ */
  function rep(c) { const t = X.tex(c, [1, 1]); t.anisotropy = 4; return t; }
  function mats(w) {
    const m = w.m; if (m.mtWall) return;
    const std = (o) => new T.MeshStandardMaterial(Object.assign({ envMapIntensity: 0.3 }, o));
    { const c = X.cv(256, 256), g = c.getContext("2d"), r = X.rnd(71); g.fillStyle = "#cfd4db"; g.fillRect(0, 0, 256, 256);          /* 白いタイル */
      for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { const k = 240 + Math.floor(r() * 10); g.fillStyle = "rgb(" + k + "," + (k + 2) + "," + Math.min(255, k + 5) + ")"; g.fillRect(i * 32 + 1.5, j * 32 + 1.5, 29, 29); }
      m.mtWall = std({ map: rep(c), roughness: 0.2, envMapIntensity: 0.25 }); }
    { const c = X.cv(256, 256), g = c.getContext("2d"), r = X.rnd(83); g.fillStyle = "#c9ccd2"; g.fillRect(0, 0, 256, 256);          /* テラゾーの床 */
      for (let i = 0; i < 2600; i++) { const v = Math.floor(150 + r() * 100); g.fillStyle = "rgba(" + v + "," + v + "," + (v + 6) + "," + (0.35 + r() * 0.4) + ")"; g.fillRect(r() * 256, r() * 256, 1 + r() * 2.2, 1 + r() * 2.2); }
      g.fillStyle = "rgba(90,96,110,.55)"; for (let i = 0; i <= 2; i++) { g.fillRect(i * 128 - 1, 0, 2, 256); g.fillRect(0, i * 128 - 1, 256, 2); }
      m.mtFloor = std({ map: rep(c), roughness: 0.32, metalness: 0.05, envMapIntensity: 0.35 }); }
    { const c = X.cv(128, 128), g = c.getContext("2d"); g.fillStyle = "#f2c200"; g.fillRect(0, 0, 128, 128); g.fillStyle = "#ffd83a";          /* 点字ブロック */
      for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) { g.beginPath(); g.arc(13 + i * 25.5, 13 + j * 25.5, 7, 0, TAU); g.fill(); }
      g.strokeStyle = "rgba(120,90,0,.5)"; g.lineWidth = 2; g.strokeRect(1, 1, 126, 126); m.mtTactile = std({ map: rep(c), roughness: 0.6 }); }
    { const c = X.cv(128, 256), g = c.getContext("2d"), r = X.rnd(97); g.fillStyle = "#56565a"; g.fillRect(0, 0, 128, 256);          /* 砂利とまくら木（4m で1回） */
      for (let i = 0; i < 1400; i++) { const v = Math.floor(60 + r() * 70); g.fillStyle = "rgb(" + v + "," + v + "," + (v + 4) + ")"; g.fillRect(r() * 128, r() * 256, 2 + r() * 3, 2 + r() * 3); }
      for (let k = 0; k < 6; k++) { const y = k * 256 / 6 + 8; g.fillStyle = "#8a8a8e"; g.fillRect(10, y, 108, 20); g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(10, y + 17, 108, 3); }
      m.mtTrack = std({ map: rep(c), roughness: 0.95 }); }
    m.mtCeil = new T.MeshStandardMaterial({ color: 0xf1f3f6, emissive: 0xa6acb6, roughness: 0.9, metalness: 0, envMapIntensity: 0 });
    m.mtPlat = std({ color: 0x8a8d93, roughness: 0.9 });
    m.mtTunnel = std({ map: X.plasterTex("#8f9196", [1, 1], "tunnel", 22), roughness: 0.95, envMapIntensity: 0.15 });
    m.mtLine = new T.MeshStandardMaterial({ color: LINE.color, emissive: 0x5a1030, roughness: 0.4, envMapIntensity: 0.2 });
    m.mtBody = new T.MeshStandardMaterial({ color: 0xdde2e9, metalness: 0.55, roughness: 0.3, envMapIntensity: 0.6 });
    m.mtSeat = std({ color: 0x9a2a5a, roughness: 0.85 });
    m.mtGate = std({ color: 0xe8ebf0, metalness: 0.35, roughness: 0.35 });
    m.mtDark = std({ color: 0x2a2d34, roughness: 0.7 });
    m.mtOrange = new T.MeshBasicMaterial({ color: 0xffb030, toneMapped: false });
    m.mtGreen = new T.MeshBasicMaterial({ color: 0x3aff8a, toneMapped: false });
    m.mtBlueLed = new T.MeshBasicMaterial({ color: 0x3ab8ff, toneMapped: false });
    m.mtRail = std({ color: 0x9a9ca4, metalness: 0.85, roughness: 0.3 });
  }

  /* ══════════════ 絵（看板のアトラスに直接描く・同じ絵は1回だけ描いて使い回す） ══════════════ */
  const SLOT = {};
  function slotOf(w, key, pw, ph, draw) {
    if (key && SLOT[key]) return SLOT[key];
    const s = w.signAtlas.slot(pw, ph), g = s.p.g;
    g.save(); g.beginPath(); g.rect(s.x, s.y, s.w, s.h); g.clip(); g.translate(s.x, s.y); draw(g, s.w, s.h); g.restore();
    if (key) SLOT[key] = s; return s;
  }
  function slotPlane(w, s, sw, sh, x, y, z, ry, both) {
    const geo = new T.PlaneGeometry(sw, sh), uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (s.x + uv.getX(i) * s.w) / 2048, 1 - (s.y + (1 - uv.getY(i)) * s.h) / 2048);
    const add = (r) => w.batch.add(s.p.key, w.m[s.p.key], geo, new T.Matrix4().compose(new T.Vector3(x + Math.sin(r) * 0.012, y, z + Math.cos(r) * 0.012), new T.Quaternion().setFromEuler(new T.Euler(0, r, 0)), new T.Vector3(1, 1, 1)));
    add(ry || 0); if (both) add((ry || 0) + Math.PI);
  }
  const FONT = "'M PLUS Rounded 1c','Hiragino Sans','Yu Gothic',sans-serif";
  function fit(g, text, maxW, size, weight) { let fs = size; g.font = (weight || 900) + " " + fs + "px " + FONT; const w0 = g.measureText(text).width; if (w0 > maxW) { fs *= maxW / w0; g.font = (weight || 900) + " " + fs + "px " + FONT; } return fs; }
  function textSlot(w, key, text, o, pw, ph) { return slotOf(w, key, pw, ph, (g, W, H) => { g.fillStyle = o.bg || "#1c2240"; g.fillRect(0, 0, W, H); g.fillStyle = o.color || "#fff"; g.textAlign = "center"; g.textBaseline = "middle"; fit(g, text, W * 0.92, H * 0.62); g.fillText(text, W / 2, H * 0.53); }); }
  /* 駅の番号（丸・路線の色・Y と数字） */
  function badge(g, x, y, r, no) {
    g.fillStyle = "#fff"; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    g.strokeStyle = LINE.color; g.lineWidth = r * 0.24; g.beginPath(); g.arc(x, y, r * 0.86, 0, TAU); g.stroke();
    g.fillStyle = "#10142a"; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = "900 " + Math.round(r * 0.52) + "px " + FONT; g.fillText(no.slice(0, 1), x, y - r * 0.3);
    g.font = "900 " + Math.round(r * 0.78) + "px " + FONT; g.fillText(no.slice(1), x, y + r * 0.26);
  }
  /* 地下鉄のしるし（オリジナル：角の丸い四角・M と星） */
  function logo(g, x, y, s) {
    const r = s * 0.2; g.save();
    const gr = g.createLinearGradient(x, y, x + s, y + s); gr.addColorStop(0, "#ff3d8b"); gr.addColorStop(1, "#6a3dff"); g.fillStyle = gr;
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + s, y, x + s, y + s, r); g.arcTo(x + s, y + s, x, y + s, r); g.arcTo(x, y + s, x, y, r); g.arcTo(x, y, x + s, y, r); g.closePath(); g.fill();
    g.strokeStyle = "#fff"; g.lineWidth = s * 0.11; g.lineJoin = "round"; g.lineCap = "round";
    g.beginPath(); g.moveTo(x + s * 0.2, y + s * 0.78); g.lineTo(x + s * 0.2, y + s * 0.3); g.lineTo(x + s * 0.5, y + s * 0.62); g.lineTo(x + s * 0.8, y + s * 0.3); g.lineTo(x + s * 0.8, y + s * 0.78); g.stroke();
    g.fillStyle = "#ffe04a"; g.beginPath(); for (let i = 0; i <= 10; i++) { const a = i / 10 * TAU - Math.PI / 2, rr = i % 2 ? s * 0.045 : s * 0.1; const px = x + s * 0.5 + Math.cos(a) * rr, py = y + s * 0.17 + Math.sin(a) * rr; if (i) g.lineTo(px, py); else g.moveTo(px, py); } g.fill();
    g.restore();
  }
  function nameBoard(g, W, H, S, left, right) {
    g.fillStyle = "#ffffff"; g.fillRect(0, 0, W, H);
    g.fillStyle = LINE.color; g.fillRect(0, H * 0.7, W, H * 0.1); g.fillStyle = "#1c2240"; g.fillRect(0, H * 0.8, W, H * 0.2);
    badge(g, H * 0.36, H * 0.36, H * 0.27, S.no);
    g.fillStyle = "#10142a"; g.textAlign = "center"; g.textBaseline = "middle"; fit(g, S.name, W * 0.54, H * 0.34); g.fillText(S.name, W * 0.52, H * 0.3);
    g.fillStyle = "#3a4058"; fit(g, S.en, W * 0.52, H * 0.14, 800); g.fillText(S.en, W * 0.52, H * 0.57);
    g.fillStyle = "#fff"; g.textBaseline = "middle";
    if (left) { g.textAlign = "left"; fit(g, "◀ " + left.no + " " + left.name, W * 0.47, H * 0.12, 800); g.fillText("◀ " + left.no + " " + left.name, W * 0.02, H * 0.9); }
    if (right) { g.textAlign = "right"; fit(g, right.no + " " + right.name + " ▶", W * 0.47, H * 0.12, 800); g.fillText(right.no + " " + right.name + " ▶", W * 0.98, H * 0.9); }
  }
  function lineSign(g, W, H, num, dirJa, dirEn) {
    g.fillStyle = "#1c2240"; g.fillRect(0, 0, W, H);
    g.fillStyle = "#fff"; g.beginPath(); g.arc(H * 0.5, H * 0.5, H * 0.38, 0, TAU); g.fill();
    g.fillStyle = "#1c2240"; g.textAlign = "center"; g.textBaseline = "middle"; g.font = "900 " + Math.round(H * 0.5) + "px " + FONT; g.fillText(num, H * 0.5, H * 0.53);
    g.fillStyle = LINE.color; g.beginPath(); g.arc(H * 1.3, H * 0.5, H * 0.3, 0, TAU); g.fill(); g.fillStyle = "#fff"; g.font = "900 " + Math.round(H * 0.34) + "px " + FONT; g.fillText("Y", H * 1.3, H * 0.52);
    g.textAlign = "left"; g.fillStyle = "#fff"; fit(g, dirJa, W - H * 1.8, H * 0.36); g.fillText(dirJa, H * 1.75, H * 0.36);
    g.fillStyle = "#b8c4e8"; fit(g, dirEn, W - H * 1.8, H * 0.2, 700); g.fillText(dirEn, H * 1.75, H * 0.74);
  }
  function exitSign(g, W, H, ja, en) {
    g.fillStyle = "#ffd200"; g.fillRect(0, 0, W, H);
    g.fillStyle = "#1a1a1a"; g.textAlign = "left"; g.textBaseline = "middle";
    g.font = "900 " + Math.round(H * 0.62) + "px " + FONT; g.fillText("↑", H * 0.12, H * 0.52);
    fit(g, ja, W - H * 0.9, H * 0.36); g.fillText(ja, H * 0.72, H * 0.34);
    fit(g, en, W - H * 0.9, H * 0.22, 800); g.fillText(en, H * 0.72, H * 0.74);
  }

  /* ══════════════ 線（環状線のまん中の線・駅の場所・線路） ══════════════ */
  function ringPath(pts) { const cr = new T.CatmullRomCurve3(pts.map(([x, z]) => new T.Vector3(x, YP, z)), true, "centripetal"); return mkPath(cr.getPoints(4800), true, 1); }
  function straighten(A0, sts) {
    const pts = []; for (let i = 0; i < A0.n; i++) pts.push(new T.Vector3(A0.P[i * 3], YP, A0.P[i * 3 + 2]));
    sts.forEach((st) => { for (let i = 0; i < pts.length; i++) { const a = sgnD(A0, st.s, i * A0.ds); if (Math.abs(a) > 92) continue; const k = Math.abs(a) <= 46 ? 1 : smooth((92 - Math.abs(a)) / 46); pts[i].x += (st.x + st.fx * a - pts[i].x) * k; pts[i].z += (st.z + st.fz * a - pts[i].z) * k; } });
    return mkPath(pts, true, 1);
  }
  /* 線路の中心の横の位置（駅は ±6.15・トンネルは ±2.4・その間はなめらかに） */
  function dAt(Ac, sites, s) { let k = 0; for (const st of sites) { const a = Math.abs(sgnD(Ac, st.sC, s)); const kk = a <= 44 ? 1 : a >= 98 ? 0 : smooth((98 - a) / 54); if (kk > k) k = kk; } return DTN + (DST - DTN) * k; }
  function trackLoop(Ac, sites, side) {
    const pts = [], p = { x: 0, y: 0, z: 0 }, d = { x: 0, z: 0 };
    for (let s = 0; s < Ac.L - 0.5; s += 1) { pAt(Ac, s, p); pDir(Ac, s, d); const dd = dAt(Ac, sites, s) * side; pts.push(new T.Vector3(p.x - d.z * dd, YP, p.z + d.x * dd)); }
    if (side > 0) pts.reverse();
    return mkPath(pts, true, 1);
  }

  /* ══════════════ 場所えらび（地上の出入口があいている所） ══════════════ */
  const pavedAt = (w, x, z) => (w.paved || []).some((q) => x > q[0] - 0.4 && x < q[2] + 0.4 && z > q[1] - 0.4 && z < q[3] + 0.4);
  function kioskScore(w, probe, tx, tz, kx, kz, taken, relax) {
    const vx = -kz, vz = kx, at = (u, v) => [tx + kx * u + vx * v, tz + kz * u + vz * v];
    let sc = 0, road = false;
    for (let u = -9.6; u <= 2.2; u += 1.2) for (let v = -3.2; v <= 5.8; v += 1.1) {
      const inHole = v <= 3.1, inEv = v > 3.1 && u >= -5 && u <= -1.6; if (!inHole && !inEv) continue;
      const [x, z] = at(u, v);
      if (!w.insideIsland(x, z, 12)) return null;
      const q = probe(x, z, 1.0);
      if (q.cast || q.water || q.room || q.circ) return null;
      if (q.road || pavedAt(w, x, z)) return null;
      if (q.col) { if (!relax) return null; sc += 6; }
      for (const k of taken) if (Math.hypot(x - k[0], z - k[1]) < 18) return null;
    }
    for (let u = 3; u <= 13; u += 1.5) for (let v = -2.4; v <= 2.4; v += 1.2) {
      const [x, z] = at(u, v), q = probe(x, z, 1.5);
      if (q.cast || q.water || q.room) return null;
      if (q.road || pavedAt(w, x, z)) road = true;
      sc += q.col * 1.2;
    }
    return sc + (road ? 0 : 22);
  }
  function boxWet(probe, p, d) { for (let a = -SA; a <= SA; a += 6) for (const b of [-SB, 0, SB]) { const q = probe(p.x + d.x * a - d.z * b, p.z + d.z * a + d.x * b, 99); if (q.water) return true; } return false; }
  function searchSite(w, A0, s0, probe, taken, relax) {
    let best = null; const p = { x: 0, y: 0, z: 0 }, d = { x: 0, z: 0 };
    const shifts = relax ? [0, 12, -12, 24, -24, 36, -36, 48, -48, 60, -60, 72, -72, 90, -90] : [0, 12, -12, 24, -24, 36, -36, 48, -48];
    for (const dl of shifts) {
      const s = s0 + dl; pAt(A0, s, p); pDir(A0, s, d);
      if (boxWet(probe, p, d)) continue;
      for (const e of [1, -1]) {
        const fx = d.x * e, fz = d.z * e, rx = -fz, rz = fx, cands = [];
        for (let Lc = 0; Lc <= (relax ? 60 : 42); Lc += 6) cands.push({ side: 0, Lc });
        for (const sd of [1, -1]) for (let Lc = 0; Lc <= (relax ? 42 : 30); Lc += 6) cands.push({ side: sd, Lc });
        for (const c of cands) {
          let sx, sz, kx, kz;
          if (!c.side) { sx = p.x + fx * MZ1; sz = p.z + fz * MZ1; kx = fx; kz = fz; }
          else { const a = (GA + MZ1) / 2; sx = p.x + fx * a + rx * SB * c.side; sz = p.z + fz * a + rz * SB * c.side; kx = rx * c.side; kz = rz * c.side; }
          const bx = sx + kx * c.Lc, bz = sz + kz * c.Lc, tx = bx + kx * RUN, tz = bz + kz * RUN;
          const sc = kioskScore(w, probe, tx, tz, kx, kz, taken, relax); if (sc == null) continue;
          const total = sc + Math.abs(dl) * 0.45 + c.Lc * 0.7 + (c.side ? 4 : 0);
          if (!best || total < best.sc) best = { sc: total, s, e, side: c.side, Lc: c.Lc, tx, tz, kx, kz };
        }
      }
    }
    return best;
  }

  /* ══════════════ 形を作る道具 ══════════════ */
  const HX = (w) => (w.heightExtra = w.heightExtra || []);
  function withY(w, ya, yb, fn) { const n0 = w.colliders.length; fn(); for (let i = n0; i < w.colliders.length; i++) { w.colliders[i].ya = ya; w.colliders[i].yb = yb; } }
  /* 座標：a＝前・b＝右。box(key, a, b, y, la, lb, h) … la＝a の長さ・lb＝b の長さ・y＝下の面 */
  function FR(w, cx, cz, fx, fz) {
    const rx = -fz, rz = fx, ry = Math.atan2(fx, fz);
    const at = (a, b) => [cx + fx * a + rx * b, cz + fz * a + rz * b];
    return {
      cx, cz, fx, fz, rx, rz, ry, at,
      faceF: ry, faceB: ry + Math.PI, faceR: Math.atan2(rx, rz), faceL: Math.atan2(-rx, -rz),
      box(key, a, b, y, la, lb, h, o) { const [x, z] = at(a, b); w.box(key, x, y, z, lb, h, la, Object.assign({ ry }, o || {})); },
      geo(key, g, a, y, b, det) { const [x, z] = at(a, b); w.geo(key, g, x, y, z, ry, det); },
      col(a, b, la, lb, ya, yb) { const [x, z] = at(a, b); withY(w, ya, yb, () => w.colObb(x, z, lb, la, ry)); },
      lv(a, b, la, lb, y) { const [x, z] = at(a, b); HX(w).push({ lv: 1, cx: x, cz: z, ang: ry, hw: lb / 2, hl: la / 2, y }); },
      /* 坂（階段）：a0 で y0 → a1 で y1 */
      ramp(a0, a1, b, lb, y0, y1) { const [x, z] = at((a0 + a1) / 2, b); const lo = Math.min(a0, a1) === a0; HX(w).push({ ramp: 1, cx: x, cz: z, ang: ry, hw: lb / 2, hl: Math.abs(a1 - a0) / 2, y0: lo ? y0 : y1, y1: lo ? y1 : y0 }); },
      room(a, b, la, lb, y0, hi, yMax, name) { const [x, z] = at(a, b); (w.interiors = w.interiors || []).push({ x, z, c: Math.cos(ry), s: Math.sin(ry), hw: lb / 2 - 0.25, hd: la / 2 - 0.25, hi, y0, yMax, name, type: "station", round: false, metro: true }); },
      slot(s, sw, sh, a, y, b, face, both) { const [x, z] = at(a, b); slotPlane(w, s, sw, sh, x, y, z, face, both); },
      inter(a, b, y, r, label, act, icon) { const [x, z] = at(a, b); const it = w.interact(x, z, r, label, act, icon); it.y = y; return it; }
    };
  }
  /* 線にそった「面の帯」（位置ごとに幅が変わる）：faceFn(s) → [[l0, y0, l1, y1, nl, ny], …]（l＝右向きの横位置） */
  function sweepVar(A, s0, s1, step, faceFn) {
    const n = Math.max(1, Math.ceil((s1 - s0) / step)), p = { x: 0, y: 0, z: 0 }, d = { x: 0, z: 0 }, rows = [];
    for (let i = 0; i <= n; i++) { const s = s0 + (s1 - s0) * i / n; pAt(A, s, p); pDir(A, s, d); rows.push({ x: p.x, z: p.z, rx: -d.z, rz: d.x, f: faceFn(s), s }); }
    const pos = [], nor = [], uv = [], idx = [], nf = rows[0].f.length;
    for (let f = 0; f < nf; f++) {
      const base = pos.length / 3;
      rows.forEach((r) => { const [l0, y0, l1, y1, nl, ny] = r.f[f]; pos.push(r.x + r.rx * l0, y0, r.z + r.rz * l0, r.x + r.rx * l1, y1, r.z + r.rz * l1); nor.push(r.rx * nl, ny, r.rz * nl, r.rx * nl, ny, r.rz * nl); const wd = Math.hypot(l1 - l0, y1 - y0); uv.push(0, r.s * 0.25, wd * 0.25, r.s * 0.25); });
      const q = (k) => [pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]], A0 = q(base), B0 = q(base + 1), C0 = q(base + 2);
      const u = [B0[0] - A0[0], B0[1] - A0[1], B0[2] - A0[2]], v = [C0[0] - A0[0], C0[1] - A0[1], C0[2] - A0[2]];
      const cr = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]], N0 = [nor[base * 3], nor[base * 3 + 1], nor[base * 3 + 2]];
      const flip = cr[0] * N0[0] + cr[1] * N0[1] + cr[2] * N0[2] < 0;
      for (let i = 0; i < n; i++) { const k = base + i * 2; if (!flip) idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); else idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
    }
    const g = new T.BufferGeometry(); g.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new T.Float32BufferAttribute(nor, 3)); g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    return g;
  }

  /* ══════════════ 路線図（すべての線・板と乗る前の画面） ══════════════ */
  function drawMetroMap(g, W, H, o) {
    o = o || {};
    const head = o.board ? Math.round(H * 0.12) : 0, pad = Math.round(W * 0.03);
    const x0 = -900, x1 = 900, z0 = -1080, z1 = 1080, sc = Math.min((W - pad * 2) / (x1 - x0), (H - head - pad * 2) / (z1 - z0));
    const ox = (W - (x1 - x0) * sc) / 2, oz = head + (H - head - (z1 - z0) * sc) / 2, Pj = (x, z) => [ox + (x - x0) * sc, oz + (z - z0) * sc];
    g.fillStyle = "#f5f7fb"; g.fillRect(0, 0, W, H);
    if (o.board) {
      const gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, LINE.color); gr.addColorStop(1, "#1a2a6a"); g.fillStyle = gr; g.fillRect(0, 0, W, head);
      logo(g, pad * 0.6, head * 0.12, head * 0.76);
      g.fillStyle = "#fff"; g.textAlign = "left"; g.textBaseline = "middle"; fit(g, "XEVARION METRO　路線図  ROUTE MAP", W * 0.52, head * 0.46); g.fillText("XEVARION METRO　路線図  ROUTE MAP", pad * 0.6 + head * 0.95, head * 0.53);
      const t2 = LINE.jp + "・" + METRO.stations.length + "駅・1周 約" + (METRO.ringL / 1000).toFixed(1) + "km"; g.textAlign = "right"; fit(g, t2, W * 0.34, head * 0.3, 800); g.fillText(t2, W - pad * 0.6, head * 0.53);
    }
    g.fillStyle = "#e2efd9"; g.strokeStyle = "#b9d7ae"; g.lineWidth = Math.max(1, W / 400); g.beginPath(); for (let i = 0; i <= 240; i++) { const [x, z] = XP.islandPt(i / 240 * TAU, 1), [px, pz] = Pj(x, z); if (i) g.lineTo(px, pz); else g.moveTo(px, pz); } g.fill(); g.stroke();
    XP.AREAS.forEach((a) => { if (a.id === "marketE") return; const [p0, q0] = Pj(a.x0, a.z0), [p1, q1] = Pj(a.x1, a.z1); g.fillStyle = a.c + "1c"; g.fillRect(p0, q0, p1 - p0, q1 - q0); });
    /* ほかの線（モノレール・路面電車）はうすく */
    XT.lines.forEach((Ln) => { if (Ln.metro) return; const A = Ln.A; g.strokeStyle = Ln.color + "99"; g.lineWidth = Math.max(1.5, W / (Ln.id === "mono" ? 240 : 300)); g.setLineDash(Ln.id === "mono" ? [] : [W / 160, W / 240]); g.beginPath(); for (let s = 0; s <= A.L; s += A.L / 300) { pAt(A, s, _p); const [px, pz] = Pj(_p.x, _p.z); if (s) g.lineTo(px, pz); else g.moveTo(px, pz); } g.stroke(); g.setLineDash([]);
      Ln.stops.forEach((st) => { pAt(A, st.sC, _p); const [px, pz] = Pj(_p.x, _p.z); g.fillStyle = "#fff"; g.strokeStyle = Ln.color; g.lineWidth = W / 700; g.beginPath(); g.arc(px, pz, W / 190, 0, TAU); g.fill(); g.stroke(); }); });
    { const lg = [["🚝 モノレール", "#1a8ad8"], ["🚋 路面電車", "#e8503a"], ["🚇 " + LINE.jp, LINE.color]]; g.font = "800 " + Math.round(W / 58) + "px " + FONT; g.textAlign = "left"; g.textBaseline = "middle"; lg.forEach(([t, c], i) => { const y = H - pad - (lg.length - 1 - i) * W / 40; g.fillStyle = c; g.fillRect(pad, y - W / 400, W / 26, W / 200); g.fillStyle = "#223"; g.fillText(t, pad + W / 22, y); }); }
    /* 地下鉄（太い線＋白い芯） */
    const pts = METRO.mapPts || [];
    g.lineJoin = "round"; g.lineCap = "round"; g.strokeStyle = LINE.color; g.lineWidth = W / 70; g.beginPath(); pts.forEach(([x, z], i) => { const [px, pz] = Pj(x, z); if (i) g.lineTo(px, pz); else g.moveTo(px, pz); }); g.closePath(); g.stroke();
    g.strokeStyle = "#ffffff"; g.lineWidth = W / 260; g.stroke();
    const proj = (S) => Pj(S.cx, S.cz);
    METRO.stations.forEach((S, i) => {
      const [px, pz] = proj(S), here = o.hereSi === i, sel = o.selSi === i, r = W / 50 * (here || sel ? 1.2 : 1);
      g.fillStyle = sel ? "#ffe04a" : "#fff"; g.strokeStyle = here ? "#e8286a" : LINE.color; g.lineWidth = r * 0.28; g.beginPath(); g.arc(px, pz, r, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = "#10142a"; g.textAlign = "center"; g.textBaseline = "middle"; g.font = "900 " + Math.round(r * 0.72) + "px " + FONT; g.fillText(S.no.slice(1), px, pz + 1);
      let dx = S.cx - 30, dz = S.cz - 200; const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
      const tx = px + dx * r * 2.1, tz = pz + dz * r * 2.1, fs = Math.round(W / 44);
      g.font = "900 " + fs + "px " + FONT; g.textAlign = dx > 0.3 ? "left" : dx < -0.3 ? "right" : "center"; g.textBaseline = dz > 0.3 ? "top" : dz < -0.3 ? "bottom" : "middle";
      g.lineWidth = fs * 0.3; g.strokeStyle = "rgba(255,255,255,.95)"; g.strokeText(S.name, tx, tz); g.fillStyle = here ? "#e8286a" : sel ? "#b8860b" : "#10142a"; g.fillText(S.name, tx, tz);
      if (S.xferIc) { g.font = "700 " + Math.round(fs * 0.8) + "px " + FONT; g.fillStyle = "#3a4a7a"; g.fillText(S.xferIc, tx, tz + (g.textBaseline === "bottom" ? -fs * 1.05 : fs * 1.05)); }
      if (here) { g.font = "900 " + Math.round(fs * 0.85) + "px " + FONT; g.fillStyle = "#e8286a"; g.textAlign = "center"; g.textBaseline = "bottom"; g.fillText("現在地", px, pz - r * 1.3); }
    });
    return proj;
  }
  function mapTex(w) {
    if (w.m.mtMap) return "mtMap";
    const c = X.cv(1024, 1024), g = c.getContext("2d"); METRO.mapProj = drawMetroMap(g, 1024, 1024, { board: true });
    w.m.mtMap = new T.MeshBasicMaterial({ map: X.tex(c), toneMapped: false }); w.m.mtMap.map.anisotropy = 4;
    return "mtMap";
  }
  /* 路線図の板（正方形）＋現在地の赤い丸 */
  function mapBoard(w, F, S, a, y, b, face, pw) {
    const key = mapTex(w), ph = pw, [x, z] = F.at(a, b), fx = Math.sin(face), fz = Math.cos(face);
    w.geo(key, new T.PlaneGeometry(pw, ph), x + fx * 0.03, y, z + fz * 0.03, face);
    w.geo("darkMetal", new T.BoxGeometry(pw + 0.2, ph + 0.2, 0.06), x - fx * 0.01, y, z - fz * 0.01, face);
    const pr = METRO.mapProj(S), u = (pr[0] / 1024 - 0.5) * pw, v = (0.5 - pr[1] / 1024) * ph, rx = Math.cos(face), rz = -Math.sin(face);
    w.geo("neonRed", new T.CylinderGeometry(0.035 * pw, 0.035 * pw, 0.03, 16).rotateX(Math.PI / 2), x + rx * u + fx * 0.05, y + v, z + rz * u + fz * 0.05, face);
  }

  /* ══════════════ 駅（地下）の形 ══════════════ */
  function doorAs() { const out = []; for (let i = 0; i < NC; i++) { const ac = (NC - 1) * PITCH / 2 - i * PITCH; [-4.3, 0, 4.3].forEach((dz) => out.push(ac + dz)); } return out.sort((a, b) => a - b); }
  function inHole(a, b, m) { for (const st of STAIRS) if (a > st.a0 - m && a < st.a1 + m && Math.abs(b) < SW + m) return true; if (Math.abs(a - EVA) < 1.1 + m && Math.abs(b) < 1.1 + m) return true; return false; }
  const HOLES = STAIRS.map((s) => [s.a0, s.a1]).concat([[EVA - 1.2, EVA + 1.2]]).sort((p, q) => p[0] - q[0]);
  function spans(A0, A1) { const out = []; let a = A0; HOLES.forEach(([h0, h1]) => { if (h1 <= A0 || h0 >= A1) return; if (h0 > a) out.push([a, h0, false]); out.push([Math.max(a, h0), Math.min(h1, A1), true]); a = Math.min(h1, A1); }); if (a < A1) out.push([a, A1, false]); return out; }
  /* 天井と床（穴をよけて四角に分ける）：y＝改札階の床の下の面（ホームの天井） */
  function slabSpan(F, A0, A1, withCeil, withFloor) {
    spans(A0, A1).forEach(([a0, a1, hole]) => {
      if (a1 - a0 < 0.02) return; const ac = (a0 + a1) / 2, la = a1 - a0;
      const parts = hole ? (() => { const hw = Math.abs(ac - EVA) < 2 ? 1.1 : SW + 0.1; return [[-(hw + SB) / 2, SB - hw], [(hw + SB) / 2, SB - hw]]; })() : [[0, 2 * SB]];
      parts.forEach(([bc, lb]) => {
        if (withCeil) F.box("mtCeil", ac, bc, YC - 0.02, la, lb, 0.04);
        F.box("mtPlat", ac, bc, YC + 0.02, la, lb, YM - 0.05 - YC);
        if (withFloor) F.box("mtFloor", ac, bc, YM - 0.03, la, lb, 0.03, { uv: 1.2 });
      });
    });
  }
  function buildStation(w, S, F) {
    const E = S.e, side = S.side, hs = S.hs, m = w.m;
    /* 坂（ホームへの階段）は床より先に登録する（heightAt は先に見つかった方を使う） */
    STAIRS.forEach((st) => { const top = st.up > 0 ? st.a1 : st.a0, bot = st.up > 0 ? st.a0 : st.a1; F.ramp(bot, top, 0, 2 * SW - 0.1, YP, YM); });
    /* ── ホームの階（YP） ── */
    F.box("mtPlat", 0, 0, YT, 2 * PL, 2 * PW, YP - YT - 0.03);
    F.box("mtFloor", 0, 0, YP - 0.03, 2 * PL, 2 * PW, 0.03, { uv: 1.2 });
    [-1, 1].forEach((sd) => { F.box("mtTactile", 0, sd * (PW - 0.75), YP, 2 * PL - 0.6, 0.5, 0.012, { uv: 0.4 }); F.box("lineW", 0, sd * (PW - 0.08), YP, 2 * PL, 0.12, 0.014); });
    F.lv(0, 0, 2 * PL, 2 * PW, YP);
    [-1, 1].forEach((sd) => {
      F.box("mtTunnel", 0, sd * (PW + SB) / 2, YT - 0.3, 2 * SA, SB - PW, 0.3);
      F.box("mtWall", 0, sd * (SB - 0.1), YT - 0.3, 2 * SA, 0.2, YC - YT + 0.3, { uv: 2.4 });
      F.box("mtLine", 0, sd * (SB - 0.22), YP + 1.9, 2 * SA, 0.04, 0.42);
      F.box("mtDark", 0, sd * (SB - 0.22), YP + 1.72, 2 * SA, 0.03, 0.12);
    });
    slabSpan(F, -SA, SA, true, false);
    slabSpan(F, MZ0, MZ1, false, true);
    for (let a = -SA + 4; a < SA - 2; a += 8) { [-2.9, 2.9].forEach((b) => { if (!inHole(a, b, 1.6)) F.box("lightPanel", a, b, YC - 0.08, 5.4, 0.34, 0.06); }); [-6.2, 6.2].forEach((b) => F.box("neonWhite", a, b, YC - 0.06, 3.0, 0.16, 0.04)); }
    /* 柱（まん中）・駅番号の板 */
    const bdg = slotOf(w, "mtBadge_" + S.no, 128, 128, (g, W2, H2) => { g.fillStyle = "#fff"; g.fillRect(0, 0, W2, H2); badge(g, W2 / 2, H2 / 2, W2 * 0.42, S.no); });
    COLS.forEach((a) => { F.box("mtWall", a, 0, YP, 0.8, 0.8, YC - YP, { uv: 1.6 }); F.box("mtLine", a, 0, YP + 2.1, 0.84, 0.84, 0.3); F.col(a, 0, 0.8, 0.8, YP - 1, YP + 3); F.slot(bdg, 0.5, 0.5, a, YP + 1.55, 0.41, F.faceR); F.slot(bdg, 0.5, 0.5, a, YP + 1.55, -0.41, F.faceL); });
    /* ホームドア（固定の枠）＋当たり（ホームのはしからはしまで：線路へは落ちない） */
    const doors = doorAs();
    [-1, 1].forEach((sd) => {
      const b = sd * (PW - 0.14); let a0 = -PL + 0.2;
      doors.concat([PL - 0.2 + 0.9]).forEach((dc, i) => {
        const a1 = Math.min(PL - 0.2, dc - 0.9);
        if (a1 - a0 > 0.15) { F.box("glassClear", (a0 + a1) / 2, b, YP, a1 - a0, 0.05, 1.3); F.box("mtGate", (a0 + a1) / 2, b, YP + 1.3, a1 - a0, 0.16, 0.12); F.box("mtLine", (a0 + a1) / 2, b + sd * 0.02, YP + 1.1, a1 - a0, 0.06, 0.08); }
        if (i < doors.length) [-1, 1].forEach((e2) => { F.box("mtGate", dc + e2 * 0.95, b, YP, 0.14, 0.3, 1.45); F.box("mtGreen", dc + e2 * 0.95, b - sd * 0.16, YP + 1.28, 0.06, 0.02, 0.08); });
        a0 = dc + 0.9;
      });
      F.col(0, b, 2 * PL, 0.3, YP - 1.5, YP + 2.6);
    });
    /* ホームのはし（柵）・トンネルの口の上の壁 */
    const staff = textSlot(w, "mtStaff", "関係者以外 立入禁止  STAFF ONLY", { bg: "#c8202a" }, 512, 64);
    [-1, 1].forEach((e2) => { F.box("glassClear", e2 * (PL - 0.1), 0, YP, 0.05, 2 * PW, 1.2); F.box("mtGate", e2 * (PL - 0.1), 0, YP + 1.2, 0.1, 2 * PW, 0.08); F.col(e2 * (PL - 0.1), 0, 0.3, 2 * PW, YP - 1.5, YP + 2.6); F.slot(staff, 2.6, 0.32, e2 * (PL - 0.16), YP + 0.8, 0, e2 > 0 ? F.faceB : F.faceF); });
    [-1, 1].forEach((e2) => F.box("mtTunnel", e2 * (SA - 0.15), 0, YTC, 0.3, 2 * SB, YC - YTC));
    /* ── ホームへの階段・エスカレーター ── */
    const bottomSign = textSlot(w, "mtUpSign", "↑ 改札・出口  Ticket gates / Exit", { bg: "#ffd200", color: "#1a1a1a" }, 512, 96);
    STAIRS.forEach((st) => stairFlight(w, F, st, bottomSign));
    /* ── ホームの案内：駅名標（ホームの上・線路の壁）・のりば・電光掲示板・ベンチ・自販機・広告 ── */
    const plusA = E > 0 ? S.next : S.prev, minusA = E > 0 ? S.prev : S.next;          /* a の + の方にある駅 */
    const nbR = slotOf(w, "mtNameR_" + S.no, 640, 160, (g, W2, H2) => nameBoard(g, W2, H2, S, minusA, plusA));          /* +b を向く板（見る人の右＝+a） */
    const nbL = slotOf(w, "mtNameL_" + S.no, 640, 160, (g, W2, H2) => nameBoard(g, W2, H2, S, plusA, minusA));
    [-24.5, 22.75].forEach((a) => { F.box("mtDark", a, 0, YC - 0.5, 0.06, 0.06, 0.5); F.slot(nbR, 3.6, 0.9, a, YC - 1.05, 0.03, F.faceR); F.slot(nbL, 3.6, 0.9, a, YC - 1.05, -0.03, F.faceL); });
    [-30, -14, 2, 18, 32].forEach((a) => { F.slot(nbL, 3.6, 0.9, a, YP + 3.0, SB - 0.25, F.faceL); F.slot(nbR, 3.6, 0.9, a, YP + 3.0, -(SB - 0.25), F.faceR); });
    const apps = ((window.EXPO_DATA && EXPO_DATA.apps) || []).filter((a) => a.img && a.href && !/^[぀-ヿ]/.test(a.name));
    [-22, -6, 10, 26].forEach((a, k) => [-1, 1].forEach((sd) => { const ap = apps[(S.i * 3 + k * 2 + (sd > 0 ? 1 : 0)) % Math.max(1, apps.length)]; if (ap) posterAt(w, F, ap, a, YP + 3.7, sd * (SB - 0.24), sd > 0 ? F.faceL : F.faceR, 4.2, 2.4); }));
    /* のりば（1 番線＝外回り・2 番線＝内回り）・電光掲示板 */
    const bOut = -E * DST;
    const lsO = slotOf(w, "mtLineO_" + S.no, 512, 128, (g, W2, H2) => lineSign(g, W2, H2, "1", "外回り　" + S.dirO.ja + " 方面", "Outer loop for " + S.dirO.en));
    const lsI = slotOf(w, "mtLineI_" + S.no, 512, 128, (g, W2, H2) => lineSign(g, W2, H2, "2", "内回り　" + S.dirI.ja + " 方面", "Inner loop for " + S.dirI.en));
    [[bOut, lsO], [-bOut, lsI]].forEach(([bt, sl]) => { const b = Math.sign(bt) * 3.0; [-17, 7.5].forEach((a) => { F.box("mtDark", a, b, YC - 0.36, 0.05, 0.05, 0.36); F.slot(sl, 2.8, 0.7, a, YC - 0.72, b, F.faceB, true); }); });
    [[bOut, "out"], [-bOut, "in"]].forEach(([bt, which]) => ledBoard(w, F, S, which, -3.5, YC - 0.9, Math.sign(bt) * 2.9));
    [-3.5, 22.75, 27.25].forEach((a) => [-1, 1].forEach((sd) => bench(w, F, a, sd * 1.05, sd > 0 ? F.faceR : F.faceL, YP)));
    [[-32.4, -2.6, "gTeal"], [-32.4, 2.6, "rOrange"]].forEach(([a, b, key]) => { F.box(m[key] ? key : "gSilver", a, b, YP, 0.9, 1.2, 1.9); F.box("neonWhite", a + 0.46, b, YP + 1.1, 0.02, 0.9, 0.6); F.col(a, b, 1.0, 1.3, YP - 1, YP + 3); });
    const ext = textSlot(w, "mtExt", "消火器", { bg: "#c8202a" }, 256, 96);
    [-12, 12].forEach((a) => [-1, 1].forEach((sd) => { F.box("pRed", a, sd * (SB - 0.3), YP + 0.3, 0.5, 0.2, 0.8); F.slot(ext, 0.5, 0.19, a, YP + 1.28, sd * (SB - 0.19), sd > 0 ? F.faceL : F.faceR); }));
    /* エレベーター（ガラスの塔：ホーム ↔ 改札階） */
    const evs = textSlot(w, "mtEv", "エレベーター  ELEVATOR", { bg: "#1c2240" }, 512, 96);
    F.box("glassClear", EVA, 0, YP, 2.2, 2.2, YMC - YP); [[-1.1, -1.1], [1.1, -1.1], [-1.1, 1.1], [1.1, 1.1]].forEach(([da, db]) => F.box("chromeB", EVA + da, db, YP, 0.1, 0.1, YMC - YP)); F.col(EVA, 0, 2.3, 2.3, YP - 1, YM + 3.5);
    [YP, YM].forEach((y) => { F.box("mtLine", EVA, 0, y + 2.6, 2.26, 2.26, 0.12); F.slot(evs, 1.8, 0.34, EVA + 1.14, y + 2.3, 0, F.faceF); });
    F.inter(EVA + 2.2, 0, YP, 2.0, "エレベーター（改札階へ）", () => ({ metro: { ev: "mz", si: S.i } }), "🛗");
    for (let a = -30; a <= 30.01; a += 10) F.inter(a, 0, YP, 7.0, "地下鉄に乗る（" + LINE.jp + "・行き先をえらぶ）", () => ({ transit: { line: "yumeO", stop: S.kOut, mode: "platform" } }), "🚇");
    F.room(0, 0, 2 * SA, 2 * SB, YT, YC - YT, YM - 1.2, S.name + "駅 ホーム（" + LINE.jp + "）");

    /* ── 改札階（YM） ── */
    const mc = (MZ0 + MZ1) / 2, ml = MZ1 - MZ0;
    F.lv(mc, 0, ml, 2 * SB - 0.4, YM);
    [-1, 1].forEach((sd) => {
      const openA = side === sd ? [(GA + MZ1) / 2 - WC / 2, (GA + MZ1) / 2 + WC / 2] : null;
      const seg = (a0, a1) => { if (a1 - a0 < 0.05) return; F.box("mtWall", (a0 + a1) / 2, sd * (SB - 0.1), YM, a1 - a0, 0.2, YMC - YM, { uv: 2.4 }); F.box("mtLine", (a0 + a1) / 2, sd * (SB - 0.22), YM + 2.25, a1 - a0, 0.04, 0.3); F.col((a0 + a1) / 2, sd * (SB - 0.1), a1 - a0, 0.4, YM - 1.5, YM + 4); };
      if (openA) { seg(MZ0, openA[0]); seg(openA[1], MZ1); F.box("mtWall", (openA[0] + openA[1]) / 2, sd * (SB - 0.1), YM + HC, WC, 0.2, YMC - YM - HC); }
      else seg(MZ0, MZ1);
    });
    F.box("mtWall", MZ0 - 0.1, 0, YM, 0.2, 2 * SB, YMC - YM, { uv: 2.4 }); F.col(MZ0 - 0.1, 0, 0.4, 2 * SB, YM - 1.5, YM + 4);
    if (!side) { [-1, 1].forEach((sd) => { const bc = sd * (WC / 2 + SB) / 2; F.box("mtWall", MZ1 + 0.1, bc, YM, 0.2, SB - WC / 2, YMC - YM, { uv: 2.4 }); F.col(MZ1 + 0.1, bc, 0.4, SB - WC / 2, YM - 1.5, YM + 4); }); F.box("mtWall", MZ1 + 0.1, 0, YM + HC, 0.2, WC, YMC - YM - HC); }
    else { F.box("mtWall", MZ1 + 0.1, 0, YM, 0.2, 2 * SB, YMC - YM, { uv: 2.4 }); F.col(MZ1 + 0.1, 0, 0.4, 2 * SB, YM - 1.5, YM + 4); }
    F.box("mtCeil", mc, 0, YMC, ml, 2 * SB, 0.3); F.box("mtPlat", mc, 0, YMC + 0.3, ml + 0.4, 2 * SB + 0.4, -0.6 - (YMC + 0.3));
    for (let a = MZ0 + 4; a < MZ1 - 1; a += 6) [-4.5, 0, 4.5].forEach((b) => F.box("lightPanel", a, b, YMC - 0.05, 3.2, 1.0, 0.04));
    /* 階段の穴のまわりの手すり（上り口はあける）・上り口の「のりば」の案内 */
    const topSign = slotOf(w, "mtTop_" + S.no, 640, 128, (g, W2, H2) => { g.fillStyle = "#1c2240"; g.fillRect(0, 0, W2, H2); g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle"; const t1 = "↓ のりば  1 外回り（" + S.dirO.ja + "方面）・2 内回り（" + S.dirI.ja + "方面）"; fit(g, t1, W2 * 0.96, H2 * 0.34); g.fillText(t1, W2 / 2, H2 * 0.36); g.fillStyle = "#b8c4e8"; fit(g, "Platforms  1 Outer loop / 2 Inner loop", W2 * 0.9, H2 * 0.22, 700); g.fillText("Platforms  1 Outer loop / 2 Inner loop", W2 / 2, H2 * 0.74); });
    STAIRS.forEach((st) => {
      const bottomA = st.up > 0 ? st.a0 : st.a1, topA = st.up > 0 ? st.a1 : st.a0;
      [-1, 1].forEach((sd) => { F.box("glassClear", (st.a0 + st.a1) / 2, sd * (SW + 0.1), YM, st.a1 - st.a0, 0.05, 1.1); F.box("chromeB", (st.a0 + st.a1) / 2, sd * (SW + 0.1), YM + 1.1, st.a1 - st.a0, 0.08, 0.06); });
      F.box("glassClear", bottomA, 0, YM, 0.05, 2 * SW + 0.2, 1.1); F.box("chromeB", bottomA, 0, YM + 1.1, 0.06, 2 * SW + 0.2, 0.06);
      F.col(bottomA, 0, 0.3, 2 * SW + 0.3, YM - 1.2, YM + 3);
      F.box("mtDark", topA + st.up * 0.8, 0, YMC - 0.5, 0.05, 0.05, 0.5);
      F.slot(topSign, 4.2, 0.84, topA + st.up * 0.8, YMC - 0.95, 0, st.up > 0 ? F.faceF : F.faceB, true);
    });
    /* 改札（自動改札 7 台・6 レーン）・両はしはガラスの仕切り */
    for (let i = 0; i < 7; i++) { const b = -6.6 + i * 2.2;
      F.box("mtGate", GA, b, YM, 1.8, 0.28, 1.0); F.box("mtDark", GA, b, YM + 1.0, 1.84, 0.3, 0.04);
      [-1, 1].forEach((e2) => { F.box("mtBlueLed", GA + e2 * 0.7, b, YM + 1.04, 0.3, 0.2, 0.012); F.box(e2 > 0 ? "mtGreen" : "mtOrange", GA + e2 * 0.93, b, YM + 0.72, 0.02, 0.18, 0.12); });
      if (i < 6) [-1, 1].forEach((e2) => F.box(i % 2 ? "mtLine" : "pBlue", GA + 0.35, b + 1.1 + e2 * 0.9, YM + 0.45, 0.55, 0.06, 0.35));          /* 開いたフラップ（レーンの両わきにしまう） */
      F.col(GA, b, 1.9, 0.32, YM - 1.2, YM + 3); }
    [-1, 1].forEach((sd) => { F.box("glassClear", GA, sd * 7.4, YM, 0.05, 1.2, 1.1); F.col(GA, sd * 7.4, 0.3, 1.3, YM - 1.2, YM + 3); });
    const gs = slotOf(w, "mtGate_" + S.no, 768, 96, (g, W2, H2) => { g.fillStyle = "#1c2240"; g.fillRect(0, 0, W2, H2); g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle"; const t1 = "改札  TICKET GATES　　" + LINE.jp + "  " + S.no + " " + S.name + "駅"; fit(g, t1, W2 * 0.94, H2 * 0.5); g.fillText(t1, W2 / 2, H2 / 2); });
    F.slot(gs, 9.6, 1.2, GA, YMC - 0.75, 0, F.faceF, true);
    /* 券売機・運賃表（路線図）・駅事務室 */
    const hb = hs * (SB - 0.45);
    for (let i = 0; i < 4; i++) { const a = 27.8 + i * 1.3; F.box("gSilver", a, hb, YM, 1.1, 0.7, 1.75); F.box("mtBlueLed", a, hb - hs * 0.36, YM + 0.95, 0.7, 0.02, 0.5); F.box("mtLine", a, hb - hs * 0.36, YM + 1.6, 0.9, 0.02, 0.1); }
    F.col(29.75, hb, 5.4, 0.8, YM - 1, YM + 3);
    F.slot(textSlot(w, "mtTicket", "きっぷ・IC チャージ  Tickets", { bg: LINE.color }, 512, 64), 3.2, 0.4, 29.75, YM + 2.05, hs * (SB - 0.22), hs > 0 ? F.faceL : F.faceR);
    mapBoard(w, F, S, 29.75, YM + 3.3, hs * (SB - 0.22), hs > 0 ? F.faceL : F.faceR, 2.1);
    F.inter(29.75, hs * (SB - 1.8), YM, 2.2, "券売機（XEVARION METRO の乗り方）", () => ({ metro: { info: "ticket" } }), "🎫");
    if (side !== -hs) { const ob = -hs * (SB - 0.8), oa = 33.2;
      F.box("mtWall", oa, ob, YM, 4.6, 1.4, 1.0); F.box("glassClear", oa, ob, YM + 1.0, 4.4, 0.05, 1.3); F.box("mtWall", oa, ob, YM + 2.3, 4.6, 1.4, YMC - YM - 2.3); F.col(oa, ob, 4.7, 1.5, YM - 1, YM + 4);
      F.slot(textSlot(w, "mtOffice", "駅事務室  STATION OFFICE", { bg: "#1c2240" }, 512, 64), 2.6, 0.32, oa, YM + 2.6, ob + hs * 0.72, hs > 0 ? F.faceR : F.faceL);
      F.inter(oa, ob + hs * 1.6, YM, 2.0, "駅の窓口（案内）", () => ({ metro: { info: "office", si: S.i } }), "🙋"); }
    /* 改札の中：大きな路線図・ベンチ・電光掲示板・出口の案内 */
    mapBoard(w, F, S, -14, YM + 2.3, -hs * (SB - 0.24), hs > 0 ? F.faceR : F.faceL, 3.4);
    [-31, 0, 20].forEach((a) => [-1, 1].forEach((sd) => bench(w, F, a, sd * (SB - 0.7), sd > 0 ? F.faceL : F.faceR, YM)));
    ledBoard(w, F, S, "both", GA - 3, YMC - 1.0, 0);
    const ex = slotOf(w, "mtExit_" + S.no, 640, 128, (g, W2, H2) => exitSign(g, W2, H2, "出口 " + S.exitNo + "  " + S.exitTo, "Exit " + S.exitNo + " to street level"));
    F.box("mtDark", GA - 1.5, 0, YMC - 0.4, 0.05, 0.05, 0.4); F.slot(ex, 4.0, 0.8, GA - 1.5, YMC - 0.85, 0, F.faceB);
    F.inter(EVA + 2.2, 0, YM, 2.0, "エレベーター（ホームへ）", () => ({ metro: { ev: "pl", si: S.i } }), "🛗");
    F.room(mc, 0, ml, 2 * SB, YM, YMC - YM, YM + 3.5, S.name + "駅 改札（" + LINE.jp + "）");
  }
  /* ホームへの階段（左：階段・右：エスカレーター＝どちらも歩ける坂） */
  function stairFlight(w, F, st, bottomSign) {
    const n = 26, run = st.a1 - st.a0, rise = (YM - YP) / n, stp = run / n, top = st.up > 0 ? st.a1 : st.a0, bot = st.up > 0 ? st.a0 : st.a1, dir = st.up;
    for (let i = 0; i < n; i++) { const a = bot + dir * (i + 0.5) * stp, yTop = YP + (i + 1) * rise;
      F.box("mtFloor", a, -0.85, yTop - 0.25, stp + 0.02, 2.5, 0.25, { uv: 1.2 }); F.box("pYellow", a + dir * (stp / 2 - 0.03), -0.85, yTop - 0.01, 0.05, 2.4, 0.012);
      F.box("darkMetal", a, 1.25, yTop - 0.25, stp + 0.02, 1.5, 0.25); F.box("chromeB", a + dir * (stp / 2 - 0.02), 1.25, yTop - 0.01, 0.03, 1.4, 0.012); }
    const slope = Math.atan2(YM - YP, run), hyp = Math.hypot(run, YM - YP), inc = (key, b, lb, dy, th) => { const g = new T.BoxGeometry(lb, th, hyp).rotateX(dir > 0 ? -slope : slope); F.geo(key, g, (st.a0 + st.a1) / 2, (YP + YM) / 2 + dy, b); };
    inc("mtPlat", 0, 2 * SW, -0.45, 0.4);
    [-SW, 0.45, SW].forEach((b) => { inc("glassClear", b, 0.04, 0.55, 1.0); inc(b === 0.45 ? "black" : "chromeB", b, 0.1, 1.1, 0.08); });
    [-SW - 0.1, SW + 0.1].forEach((b) => inc("mtWall", b, 0.12, -0.05, 0.9));
    [-1, 1].forEach((sd) => F.col((st.a0 + st.a1) / 2, sd * (SW + 0.12), run, 0.3, YP - 1.2, YM + 3));
    F.col(top, 0, 0.4, 2 * SW + 0.3, YP - 1.2, YP + 2.4);
    F.box("mtWall", top - dir * 0.2, 0, YP, 0.2, 2 * SW + 0.2, YM - YP - 0.45, { uv: 2.4 });
    F.slot(bottomSign, 2.4, 0.45, bot - dir * 0.6, YP + 2.9, 0, dir > 0 ? F.faceB : F.faceF);
  }
  function bench(w, F, a, b, face, y) {
    const [x, z] = F.at(a, b), c = Math.cos(face), s = Math.sin(face);
    w.box("darkMetal", x, y, z, 2.4, 0.42, 0.45, { ry: face }); w.box("woodLight", x, y + 0.42, z, 2.6, 0.06, 0.52, { ry: face }); w.box("woodLight", x - s * 0.26, y + 0.48, z - c * 0.26, 2.6, 0.5, 0.06, { ry: face });
    withY(w, y - 1, y + 2.5, () => w.colObb(x, z, 2.6, 0.55, face));
    for (let k = -1; k <= 1; k++) w.seats.push({ x: x + c * k * 0.8 + s * 0.12, z: z - s * k * 0.8 + c * 0.12, yaw: face, h: y + 0.47 });
  }
  function posterAt(w, F, ap, a, y, b, face, pw, ph) {
    const key = "mtAd_" + ap.id; if (!w.m[key]) w.m[key] = new T.MeshBasicMaterial({ map: X.imgTex("../" + ap.img), toneMapped: false });
    const [x, z] = F.at(a, b), fx = Math.sin(face), fz = Math.cos(face);
    w.geo(key, new T.PlaneGeometry(pw, ph), x + fx * 0.03, y, z + fz * 0.03, face);
    w.geo("gSilver", new T.BoxGeometry(pw + 0.16, ph + 0.16, 0.05), x, y, z, face);
    w.geo("lightPanel", new T.BoxGeometry(pw + 0.16, 0.05, 0.08), x + fx * 0.05, y + ph / 2 + 0.1, z + fz * 0.05, face);
  }
  /* 電光掲示板（つぎの電車・時計）：which＝"out" / "in" / "both" */
  function ledBoard(w, F, S, which, a, y, b, faceOne) {
    const [x, z] = F.at(a, b);
    const draw = (g, W2, H2) => {
      g.fillStyle = "#050608"; g.fillRect(0, 0, W2, H2);
      const d = new Date(), hh = String(d.getHours()).padStart(2, "0"), mm = String(d.getMinutes()).padStart(2, "0");
      g.textBaseline = "middle"; g.textAlign = "right"; g.fillStyle = "#3aff8a"; g.font = "800 " + Math.round(H2 * 0.2) + "px monospace"; g.fillText(hh + ":" + mm, W2 - 12, H2 * 0.16);
      g.textAlign = "left"; g.fillStyle = "#fff"; g.font = "800 " + Math.round(H2 * 0.16) + "px " + FONT; g.fillText("つぎの電車  Next train", 12, H2 * 0.16);
      const rows = which === "both" ? [["out", "1"], ["in", "2"]] : [[which, which === "out" ? "1" : "2"]];
      rows.forEach(([wh, num], r) => {
        const L = wh === "out" ? METRO.lineO : METRO.lineI, k = wh === "out" ? S.kOut : S.kIn, dir = wh === "out" ? S.dirO : S.dirI; if (!L) return;
        const eta = etaAt(L, k), y0 = H2 * (which === "both" ? 0.45 + r * 0.3 : 0.52);
        g.fillStyle = "#ffb030"; g.font = "900 " + Math.round(H2 * (which === "both" ? 0.2 : 0.26)) + "px " + FONT; g.textAlign = "left";
        g.fillText(num + " " + (wh === "out" ? "外回り" : "内回り") + "  " + dir.ja + "方面", 12, y0);
        g.textAlign = "right"; g.fillStyle = eta < 0 ? "#3aff8a" : "#ffb030"; g.fillText(eta < 0 ? "到着" : eta < 45 ? "まもなく" : Math.ceil(eta / 60) + "分", W2 - 12, y0);
      });
      if (which !== "both") { g.fillStyle = "#8ab8ff"; g.textAlign = "left"; g.font = "700 " + Math.round(H2 * 0.14) + "px " + FONT; g.fillText((which === "out" ? "Outer loop for " + S.dirO.en : "Inner loop for " + S.dirI.en), 12, H2 * 0.84); }
    };
    const one = (face) => { const s = w.screen(3.2, 0.95, 512, x + Math.sin(face) * 0.07, y, z + Math.cos(face) * 0.07, face, (g, W2, H2) => { if (METRO.group && METRO.group.visible) draw(g, W2, H2); }, { every: 0.5 }); METRO.screens.push(s); };
    if (faceOne != null) one(faceOne); else { one(F.faceF); one(F.faceB); }
    w.box("mtDark", x, y + 0.48, z, 0.05, 0.4, 0.05);
  }
  function etaAt(L, k) {
    const st = L.stops[k]; if (!st) return 999; let best = 1e9;
    L.trains.forEach((tr) => { const d = fwd(L.A, tr.s, st.s); if (tr.st === "dwell" && d < 0.5) { best = -1; return; } if (best === -1) return; let n = 0, i = tr.next; while (i !== k && n < L.stops.length) { i = (i + 1) % L.stops.length; n++; } const t = d / (L.vmax * 0.72) + n * L.dwell; if (t < best) best = t; });
    return best;
  }

  /* ══════════════ 地下通路・地上への階段・地上の出入口 ══════════════ */
  function buildExit(w, S, F, UG) {
    const kx = S.kx, kz = S.kz, ky = Math.atan2(kx, kz);
    const K = FR(w, S.tx, S.tz, kx, kz);          /* 出口の座標：a＝上り（地上の入口の方）・b＝右。階段の上（地上）が a=0 */
    /* 改札階の出口の敷居（床がとぎれない）・通路（改札階 → 階段の下） */
    K.lv(-RUN - S.Lc, 0, 1.2, WC, YM);
    if (S.Lc > 0.1) UG(() => {
      const L0 = -RUN - S.Lc, L1 = -RUN, mcA = (L0 + L1) / 2;
      K.box("mtFloor", mcA, 0, YM - 0.03, S.Lc, WC, 0.03, { uv: 1.2 }); K.lv(mcA, 0, S.Lc + 0.4, WC - 0.2, YM);
      [-1, 1].forEach((sd) => { K.box("mtWall", mcA, sd * (WC / 2 + 0.1), YM, S.Lc, 0.2, HC, { uv: 2.4 }); K.box("mtLine", mcA, sd * (WC / 2 - 0.02), YM + 2.05, S.Lc, 0.04, 0.26); K.col(mcA, sd * (WC / 2 + 0.1), S.Lc + 0.4, 0.4, YM - 1.5, YM + 4); });
      K.box("mtCeil", mcA, 0, YM + HC, S.Lc, WC + 0.4, 0.3); K.box("mtPlat", mcA, 0, YM + HC + 0.3, S.Lc, WC + 0.4, -0.6 - (YM + HC + 0.3));
      for (let a = L0 + 2; a < L1 - 1; a += 4) K.box("lightPanel", a, 0, YM + HC - 0.05, 2.4, 0.5, 0.04);
      K.room(mcA, 0, S.Lc + 0.4, WC + 0.2, YM, HC, YM + 3.2, S.name + "駅 地下通路");
    });
    /* 地上への階段（地面の穴から見えるので、地上の形といっしょ＝いつも描く） */
    const n = 24, rise = -YM / n, stp = RUN / n;
    for (let i = 0; i < n; i++) { const a = -RUN + (i + 0.5) * stp, yTop = YM + (i + 1) * rise; K.box("stoneW", a, 0, yTop - 0.25, stp + 0.02, WC, 0.25, { uv: 2 }); K.box("pYellow", a + stp / 2 - 0.03, 0, yTop - 0.01, 0.05, WC - 0.1, 0.012); }
    const slope = Math.atan2(-YM, RUN), hyp = Math.hypot(RUN, YM), inc = (key, b, lb, dy, th) => { const g = new T.BoxGeometry(lb, th, hyp).rotateX(-slope); K.geo(key, g, -RUN / 2, YM / 2 + dy, b); };
    inc("mtPlat", 0, WC, -0.45, 0.4);
    [-1, 1].forEach((sd) => { K.box("mtWall", -RUN / 2, sd * (WC / 2 + 0.1), YM - 0.3, RUN, 0.2, -YM + 0.28, { uv: 2.4 }); inc("chromeB", sd * (WC / 2 - 0.12), 0.06, 0.95, 0.06); K.col(-RUN / 2, sd * (WC / 2 + 0.1), RUN + 0.4, 0.4, YM - 1.5, 6); });
    inc("chromeB", 0, 0.06, 0.95, 0.06);
    const ex = slotOf(w, "mtExit_" + S.no, 640, 128, (g, W2, H2) => exitSign(g, W2, H2, "出口 " + S.exitNo + "  " + S.exitTo, "Exit " + S.exitNo + " to street level"));
    UG(() => K.slot(ex, 3.0, 0.6, -RUN - 0.4, YM + HC - 0.45, 0, K.faceB));
    /* 地下の部分の天井（地面のすぐ下） */
    K.box("mtCeil", -RUN + 1.45, 0, -0.42, 3.1, WC + 0.4, 0.3); K.box("mtPlat", -RUN + 1.45, 0, -0.12, 3.1, WC + 0.4, 0.1);
    K.ramp(-RUN, 0, 0, WC - 0.2, YM, 0);
    K.room(-RUN + 1.6, 0, 3.4, WC + 0.2, YM, -0.5 - YM, -0.4, S.name + "駅 出入口 " + S.exitNo);
    K.room(-4.6, 0, 9.4, WC + 0.6, YM, 3.3 - YM, 2.6, S.name + "駅 出入口 " + S.exitNo);
    /* ── 地上の出入口（ガラスの壁・屋根・M の看板の柱・エレベーター） ── */
    [-1, 1].forEach((sd) => {
      K.box("glassClear", -4.1, sd * 2.75, 0, 9.8, 0.05, 2.9);
      for (let a = -9; a <= 0.81; a += 1.95) K.box("chromeB", a, sd * 2.75, 0, 0.1, 0.1, 3.05);
      K.box("chromeB", -4.1, sd * 2.75, 2.9, 9.9, 0.12, 0.12); K.box("chromeB", -4.1, sd * 2.75, 1.0, 9.8, 0.06, 0.06);
      K.col(-4.1, sd * 2.75, 10.2, 0.4, YM - 1.5, 6);
    });
    K.box("mtWall", -9.1, 0, 0, 0.2, 5.7, 3.1, { uv: 2.4 }); K.col(-9.1, 0, 0.4, 5.7, -1.1, 6);
    mapBoard(w, K, S, -8.95, 1.75, 0, K.faceF, 2.3);
    K.box("white2", -4.0, 0, 3.05, 11.6, 6.3, 0.22); K.box("glassDome", -4.2, 0, 3.27, 8.8, 4.2, 0.06); K.box("mtLine", -4.0, 0, 2.98, 11.64, 6.34, 0.1);
    const front = slotOf(w, "mtFront_" + S.no, 768, 96, (g, W2, H2) => { g.fillStyle = "#1c2240"; g.fillRect(0, 0, W2, H2); logo(g, H2 * 0.1, H2 * 0.1, H2 * 0.8); badge(g, H2 * 1.5, H2 / 2, H2 * 0.4, S.no); g.fillStyle = "#fff"; g.textAlign = "left"; g.textBaseline = "middle"; const t1 = S.name + "駅　" + LINE.jp + "　出入口 " + S.exitNo; fit(g, t1, W2 - H2 * 2.2, H2 * 0.46); g.fillText(t1, H2 * 2.05, H2 * 0.4); g.fillStyle = "#b8c4e8"; const t2 = "XEVARION METRO  " + S.en + " STATION  Exit " + S.exitNo; fit(g, t2, W2 - H2 * 2.2, H2 * 0.22, 700); g.fillText(t2, H2 * 2.05, H2 * 0.78); });
    K.slot(front, 6.2, 0.78, 1.7, 2.65, 0, K.faceF);
    K.box("mtDark", 1.66, 0, 2.2, 0.08, 6.3, 0.95);
    /* M の看板の柱（遠くからも見える） */
    { const [px, pz] = K.at(2.4, -3.3), lg = slotOf(w, "mtLogo", 256, 256, (g, W2) => logo(g, 8, 8, W2 - 16)), pl = slotOf(w, "mtPlate_" + S.no, 256, 96, (g, W2, H2) => { g.fillStyle = "#fff"; g.fillRect(0, 0, W2, H2); badge(g, H2 * 0.5, H2 * 0.5, H2 * 0.42, S.no); g.fillStyle = "#10142a"; g.textAlign = "left"; g.textBaseline = "middle"; fit(g, S.name, W2 - H2 * 1.15, H2 * 0.5); g.fillText(S.name, H2 * 1.05, H2 * 0.52); });
      /* ★★ 2026-10-01 駅の場所がわかるように、M の柱を高く大きく（ご指定「駅の場所がわかりづらい」）＝前は 5m */
      w.geo("chromeB", new T.CylinderGeometry(0.16, 0.2, 11, 10), px, 5.5, pz); w.geo("mtDark", new T.BoxGeometry(2.1, 2.1, 2.1), px, 12.2, pz, ky); w.geo("mtLine", new T.BoxGeometry(2.16, 0.16, 2.16), px, 11.1, pz, ky); w.geo("mtLine", new T.TorusGeometry(1.7, 0.08, 6, 32).rotateX(Math.PI / 2), px, 13.5, pz); withY(w, -1, 12, () => w.colCircle(px, pz, 0.35));
      [0, 1, 2, 3].forEach((i) => { const f = ky + i * Math.PI / 2; slotPlane(w, lg, 1.95, 1.95, px + Math.sin(f) * 1.07, 12.2, pz + Math.cos(f) * 1.07, f); slotPlane(w, pl, 2.05, 0.77, px + Math.sin(f) * 0.24, 10.2, pz + Math.cos(f) * 0.24, f); w.geo("white2", new T.BoxGeometry(0.06, 0.8, 2.1), px + Math.sin(f) * 0.2, 10.2, pz + Math.cos(f) * 0.2, f + Math.PI / 2); }); }
    /* 地上のエレベーター（ガラスの箱・入口は前） */
    { const ea = -3.4, eb = 4.2;
      [[-1.2, 0], [1.2, 0]].forEach(([da]) => K.box("glassClear", ea + da, eb, 0, 0.05, 2.4, 2.9)); K.box("glassClear", ea, eb + 1.2, 0, 2.4, 0.05, 2.9);
      [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]].forEach(([da, db]) => K.box("chromeB", ea + da, eb + db, 0, 0.1, 0.1, 3.0));
      K.box("white2", ea, eb, 3.0, 2.7, 2.7, 0.2); K.box("mtLine", ea, eb, 2.95, 2.72, 2.72, 0.08); K.box("chromeB", ea + 1.2, eb, 0, 0.08, 1.8, 2.3);
      K.col(ea, eb, 2.5, 2.5, -1.2, 6);
      K.slot(textSlot(w, "mtEv", "エレベーター  ELEVATOR", { bg: "#1c2240" }, 512, 96), 1.4, 0.26, ea + 1.26, 2.55, eb, K.faceF);
      K.inter(ea + 2.2, eb, 0, 1.9, "エレベーター（地下の改札へ）", () => ({ metro: { ev: "gate", si: S.i } }), "🛗");
      S.evStreet = K.at(ea + 2.4, eb); S.evFace = K.faceF; }
    /* 入口の前の床・道へ・木を植えない・草を生やさない・影 */
    const [ex0, ez0] = K.at(2.2, 0);
    w.casters.push({ pts: [[-9.4, -2.95], [1.8, -2.95], [1.8, 5.6], [-9.4, 5.6]].map(([a, b]) => K.at(a, b)), h: 3.3 });          /* 先に出入口の形を登録（道が出入口を横切らない） */
    w.disk(ex0, ez0, 3.4, "walkCream", 0.02);
    linkRoad(w, ex0, ez0, kx, kz);
    (w.doors = w.doors || []).push([ex0, ez0]);
    METRO.holes.push([[-9.0, -2.55], [0.02, -2.55], [0.02, 2.55], [-9.0, 2.55]].map(([a, b]) => K.at(a, b)));
    /* ★★ 2026-10-01 草を生やさない所は、階段の穴より大きめに（前は穴のふちから草の株が穴の上にはみ出して、浮いて見えた） */
    let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; [[-12.5, -6], [4.8, -6], [4.8, 8.4], [-12.5, 8.4]].forEach(([a, b]) => { const [x, z] = K.at(a, b); x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); });
    (w.noGrass = w.noGrass || []).push([x0, z0, x1, z1]);
    w.forestOpen.push([S.tx, S.tz, 16]);
    (w.treeKeepOut = w.treeKeepOut || []).push({ pts: [[S.tx, S.tz, 0], [...K.at(-9, 0), 0], [...K.at(2, 0), 0]], r: 7 });
    for (let i = w.trees.length - 1; i >= 0; i--) { const t = w.trees[i]; if (t[0] === "flower") continue; const dx = t[1] - S.tx, dz = t[2] - S.tz; if (dx * dx + dz * dz < 200) w.trees.splice(i, 1); }
    METRO.kiosks.push({ x: S.tx, z: S.tz, si: S.i });
    if (window.XTransit && XTransit.metroDecor) XTransit.metroDecor(w, S, K);          /* ★★ 2026-10-02 地上の出入口のデザイン・規模を駅ごとに（park_fantasy.js） */
    w.places.push(["🚇 " + S.no + " " + S.name + "駅（" + LINE.jp + "）", ...K.at(5, 0), ky + Math.PI]);
    S.gateIn = S.side ? F.at((GA + MZ1) / 2, S.side * (SB - 2.2)) : F.at(MZ1 - 2.2, 0);
    { const it = w.interact(S.gateIn[0], S.gateIn[1], 1.8, "エレベーター（地上の出入口 " + S.exitNo + " へ）", () => ({ metro: { ev: "street", si: S.i } }), "🛗"); it.y = YM; }
  }

  /* ══════════════ トンネル（駅と駅のあいだ）・線路 ══════════════ */
  function buildTunnels(w, Ac, sites) {
    const n = sites.length;
    for (let i = 0; i < n; i++) {
      const s0 = sites[i].sC + SA, s1raw = sites[(i + 1) % n].sC - SA, s1 = s1raw < s0 ? s1raw + Ac.L : s1raw;
      const W = (q) => dAt(Ac, sites, ((q % Ac.L) + Ac.L) % Ac.L) + 1.95;
      for (let s = s0; s < s1 - 0.01; s += 60) {
        const e = Math.min(s1, s + 60);
        w.batch.add("mtTunnel", w.m.mtTunnel, sweepVar(Ac, s, e, 3, (q) => { const Wd = W(q); return [[-Wd, YT, Wd, YT, 0, 1], [-Wd, YTC, Wd, YTC, 0, -1], [-Wd, YT, -Wd, YTC, 1, 0], [Wd, YT, Wd, YTC, -1, 0]]; }), new T.Matrix4());
        w.batch.add("mtDark", w.m.mtDark, sweepVar(Ac, s, e, 3, (q) => { const Wd = W(q) - 0.02; return [[-Wd, YP + 2.4, -Wd + 0.35, YP + 2.4, 0, 1], [Wd - 0.35, YP + 2.4, Wd, YP + 2.4, 0, 1], [-Wd, YT + 0.9, -Wd + 0.7, YT + 0.9, 0, 1], [Wd - 0.7, YT + 0.9, Wd, YT + 0.9, 0, 1]]; }), new T.Matrix4());
        w.batch.add("mtLine", w.m.mtLine, sweepVar(Ac, s, e, 3, (q) => { const Wd = W(q) - 0.03; return [[-Wd, YP + 1.2, -Wd, YP + 1.32, 1, 0], [Wd, YP + 1.32, Wd, YP + 1.2, -1, 0]]; }), new T.Matrix4());
      }
      for (let s = s0 + 6; s < s1 - 4; s += 12) { const q = s % Ac.L; pAt(Ac, q, _p); pDir(Ac, q, _d); const Wd = W(q) - 0.05, ry = Math.atan2(_d.x, _d.z), rx = -_d.z, rz = _d.x; [-1, 1].forEach((sd) => w.box("lightPanel", _p.x + rx * sd * Wd, YP + 3.1, _p.z + rz * sd * Wd, 0.08, 0.2, 1.6, { ry })); }
      for (let s = s0 + 3; s < s1 - 2; s += 5) { const q = s % Ac.L; if (dAt(Ac, sites, q) > DTN + 0.4) continue; pAt(Ac, q, _p); pDir(Ac, q, _d); w.box("mtTunnel", _p.x, YT, _p.z, 0.5, YTC - YT, 0.5, { ry: Math.atan2(_d.x, _d.z) }); }
    }
  }
  function buildTrack(w, A) {
    for (let s = 0; s < A.L - 0.01; s += 90) {
      const e = Math.min(A.L, s + 90);
      w.batch.add("mtTrack", w.m.mtTrack, sweepVar(A, s, e, 2, () => [[-1.35, YP - 0.86, 1.35, YP - 0.86, 0, 1]]), new T.Matrix4());
      w.batch.add("mtRail", w.m.mtRail, sweepVar(A, s, e, 2, () => [[-0.8, YP - 0.68, -0.7, YP - 0.68, 0, 1], [0.7, YP - 0.68, 0.8, YP - 0.68, 0, 1], [-0.8, YP - 0.86, -0.8, YP - 0.68, -1, 0], [0.8, YP - 0.68, 0.8, YP - 0.86, 1, 0], [-0.7, YP - 0.68, -0.7, YP - 0.86, 1, 0], [0.7, YP - 0.86, 0.7, YP - 0.68, -1, 0]]), new T.Matrix4());
      w.batch.add("mtDark", w.m.mtDark, sweepVar(A, s, e, 2, () => [[1.3, YP - 0.74, 1.46, YP - 0.74, 0, 1]]), new T.Matrix4());
    }
  }

  /* ══════════════ ホームドア（動く）・駅の人 ══════════════ */
  function buildDoors(w, grp) {
    const doors = doorAs(), per = doors.length * 2 * 2, N = METRO.stations.length * per;
    const c = X.cv(128, 64), g = c.getContext("2d"); g.fillStyle = "#dfe6ee"; g.fillRect(0, 0, 128, 64); g.fillStyle = "#9fc4e0"; g.fillRect(14, 8, 100, 30); g.fillStyle = LINE.color; g.fillRect(0, 44, 128, 6); g.fillStyle = "#1c2240"; g.fillRect(0, 56, 128, 8);
    const mat = new T.MeshStandardMaterial({ map: X.tex(c), roughness: 0.3, metalness: 0.2, envMapIntensity: 0.4 });
    const im = new T.InstancedMesh(new T.BoxGeometry(0.05, 1.32, 0.88).translate(0, 0.66, 0), mat, N); im.frustumCulled = false; grp.add(im);
    const m4 = new T.Matrix4(), q = new T.Quaternion(), v = new T.Vector3(), one = new T.Vector3(1, 1, 1);
    const set = (S, sideIdx, k) => {
      const F = S.F, b = (sideIdx ? 1 : -1) * (PW - 0.14), base = S.i * per + sideIdx * doors.length * 2; q.setFromEuler(new T.Euler(0, F.ry, 0));
      doors.forEach((dc, j) => [-1, 1].forEach((e2, h) => { const [x, z] = F.at(dc + e2 * (0.45 + 0.86 * k), b); v.set(x, YP, z); m4.compose(v, q, one); im.setMatrixAt(base + j * 2 + h, m4); }));
      im.instanceMatrix.needsUpdate = true;
    };
    METRO.stations.forEach((S) => { set(S, 0, 0); set(S, 1, 0); S.doorK = [0, 0]; });
    w.anim.push(() => {
      if (!grp.visible) return;
      METRO.stations.forEach((S) => [0, 1].forEach((sideIdx) => {
        const isOut = (sideIdx ? 1 : -1) === Math.sign(-S.e), L = isOut ? METRO.lineO : METRO.lineI, st = L.stops[isOut ? S.kOut : S.kIn];
        let k = 0; for (const tr of L.trains) if (tr.st === "dwell" && fwd(L.A, tr.s, st.s) < 0.5) { k = smooth(tr.door); break; }
        if (Math.abs(k - S.doorK[sideIdx]) > 0.01) { S.doorK[sideIdx] = k; set(S, sideIdx, k); }
      }));
    });
  }
  function buildPeople(grp) {
    const r = X.rnd(707), spots = [];
    METRO.stations.forEach((S) => {
      const F = S.F;
      for (let i = 0; i < 9; i++) { let a = 0, b = 0, t = 0; do { a = -30 + r() * 58; b = (r() < 0.5 ? -1 : 1) * (2.3 + r() * 1.6); t++; } while (t < 12 && (inHole(a, b, 0.6) || COLS.some((c) => Math.abs(c - a) < 0.9 && Math.abs(b) < 0.9))); const [x, z] = F.at(a, b); spots.push([x, YP, z, (b > 0 ? F.faceR : F.faceL) + (r() - 0.5) * 0.8]); }
      for (let i = 0; i < 6; i++) { const a = MZ0 + 4 + r() * (GA - MZ0 - 6), b = (r() - 0.5) * 12; if (inHole(a, b, 0.8)) continue; const [x, z] = F.at(a, b); spots.push([x, YM, z, r() * TAU]); }
    });
    const parts = (cloth) => { const g = [[new T.BoxGeometry(0.3, 0.76, 0.2).translate(0, 0.38, 0), [0.2, 0.22, 0.28]], [new T.CylinderGeometry(0.19, 0.23, 0.72, 6).translate(0, 1.1, 0), cloth], [new T.IcosahedronGeometry(0.16, 0).translate(0, 1.6, 0), [0.95, 0.82, 0.7]], [new T.BoxGeometry(0.3, 0.12, 0.3).translate(0, 1.72, -0.02), [0.22, 0.15, 0.1]]];
      const mg = XWorld.mergeGeos(g.map((p) => p[0])), col = new Float32Array(mg.attributes.position.count * 3); let o = 0; g.forEach(([geo, c]) => { const n2 = geo.attributes.position.count; for (let i = 0; i < n2; i++) { col[(o + i) * 3] = c[0]; col[(o + i) * 3 + 1] = c[1]; col[(o + i) * 3 + 2] = c[2]; } o += n2; }); mg.setAttribute("color", new T.BufferAttribute(col, 3)); return mg; };
    const cloths = [[1, 0.42, 0.55], [0.35, 0.6, 1], [1, 0.82, 0.3], [0.95, 0.95, 0.95], [0.25, 0.3, 0.45]], mat = new T.MeshLambertMaterial({ vertexColors: true });
    cloths.forEach((cl, ci) => { const my = spots.filter((_, i) => i % cloths.length === ci); if (!my.length) return; const im = new T.InstancedMesh(parts(cl), mat, my.length), m4 = new T.Matrix4(); my.forEach(([x, y, z, yaw], i) => { m4.compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(0, yaw, 0)), new T.Vector3(1, 0.92 + r() * 0.16, 1)); im.setMatrixAt(i, m4); }); im.frustumCulled = false; grp.add(im); });
  }

  /* ══════════════ 地面の穴（出入口の所） ══════════════ */
  function rebuildGround(w) {
    if (!w.ground || !METRO.holes.length) return;
    const NP = 480, sh = new T.Shape();
    for (let i = 0; i <= NP; i++) { const [x, z] = XP.islandPt(i / NP * TAU, 1); if (i) sh.lineTo(x, -z); else sh.moveTo(x, -z); }
    const kh = new T.Path(); kh.moveTo(-26, 72); kh.lineTo(26, 72); kh.lineTo(26, 18); kh.lineTo(-26, 18); kh.lineTo(-26, 72); sh.holes.push(kh);
    METRO.holes.forEach((pts) => { const h = new T.Path(); pts.forEach(([x, z], i) => { if (i) h.lineTo(x, -z); else h.moveTo(x, -z); }); h.lineTo(pts[0][0], -pts[0][1]); sh.holes.push(h); });
    const g = new T.ShapeGeometry(sh, 1); g.rotateX(-Math.PI / 2);
    const uv = g.attributes.uv, pp = g.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, pp.getX(i) / 6, pp.getZ(i) / 6);
    const old = w.ground.geometry; w.ground.geometry = g; old.dispose();
  }

  /* ══════════════ 組み立て ══════════════ */
  P.buildMetro = function () {
    const w = this; mats(w);
    const probe = makeProbe(w), A0 = ringPath(ST_DEF.map((d) => d[3]));
    /* 駅の場所（出入口があいている所・駅の前後を少しずらしてさがす） */
    const sites = [], taken = [];
    ST_DEF.forEach((def, i) => {
      const s0 = nearestS(A0, def[3][0], def[3][1]);
      let site = searchSite(w, A0, s0, probe, taken, false) || searchSite(w, A0, s0, probe, taken, true);
      if (!site) { pAt(A0, s0, _p); pDir(A0, s0, _d); site = { s: s0, e: 1, side: 0, Lc: 0, kx: _d.x, kz: _d.z, tx: _p.x + _d.x * (MZ1 + RUN), tz: _p.z + _d.z * (MZ1 + RUN), forced: true }; }
      taken.push([site.tx, site.tz]); sites.push(Object.assign(site, { def, i }));
    });
    const sts = sites.map((st) => { const p = pAt(A0, st.s, { x: 0, y: 0, z: 0 }), d = pDir(A0, st.s, { x: 0, z: 0 }); return { s: st.s, x: p.x, z: p.z, fx: d.x, fz: d.z }; });
    const Ac = straighten(A0, sts);
    sites.forEach((st, i) => { st.sC = nearestS(Ac, sts[i].x, sts[i].z); });
    METRO.ring = Ac; METRO.ringL = Ac.L;
    METRO.mapPts = []; for (let s = 0; s < Ac.L; s += 8) { pAt(Ac, s, _p); METRO.mapPts.push([_p.x, _p.z]); }
    const n = sites.length;
    sites.forEach((st, i) => { const def = st.def; METRO.stations.push({ i, no: def[0], name: def[1], en: def[2], hint: def[4], cx: sts[i].x, cz: sts[i].z, fx: sts[i].fx, fz: sts[i].fz, e: st.e, side: st.side, Lc: st.Lc, tx: st.tx, tz: st.tz, kx: st.kx, kz: st.kz, sC: st.sC, forced: !!st.forced, hs: st.side ? -st.side : -1, exitNo: "A1", exitTo: def[4].split("・")[0] }); });
    METRO.stations.forEach((S, i) => { S.next = METRO.stations[(i + 1) % n]; S.prev = METRO.stations[(i - 1 + n) % n];
      S.dirO = { ja: S.next.name + "・" + METRO.stations[(i + 2) % n].name, en: Q.enSay(S.next.en) };
      S.dirI = { ja: S.prev.name + "・" + METRO.stations[(i - 2 + n) % n].name, en: Q.enSay(S.prev.en) }; });
    /* 乗り換え（近くのモノレール・路面電車の駅）：看板の路線図にも出すので先に */
    const others = XT.lines.filter((L) => !L.metro);
    METRO.stations.forEach((S) => { S.near = others.map((L) => { let bd = 1e9; L.stops.forEach((st) => { pAt(L.A, st.sC, _p); bd = Math.min(bd, Math.hypot(_p.x - S.cx, _p.z - S.cz)); }); return [L, bd]; }).filter(([, d]) => d < 260); S.xferIc = S.near.map(([L]) => L.icon).join(" "); });
    /* 線路（外回り＝左の線路を +s・内回り＝右の線路を −s）と線 */
    const Aout = trackLoop(Ac, sites, -1), Ain = trackLoop(Ac, sites, 1);
    const car = { len: 13.2, wid: 2.95, hgt: 2.45, doorZ: [-4.3, 0, 4.3], doorW: 1.3, winY0: 0.92, winY1: 2.0, nose: 1.0, noseH: 1.0, noseLo: -0.3, gap: 0.6, body: "mtBody", frame: "mtBody", trim: "mtLine", trimY: 0.5, trimH: 0.3, trim2: "mtLine", seat: "mtSeat", floor: "carpetGray", wheels: true, skirt: [-0.8, -0.3], iris: "irisB" };
    const common = { nCars: NC, pitch: PITCH, bogie: 4.6, lift: 0, car, vmax: 30, acc: 1.3, dec: 1.35, dwell: 9, lead: 220, seat: [0, 1.55, car.len / 2 + 0.1], floorY: YP, metro: true, icon: "🚇", color: LINE.color, color2: LINE.light, annJa: "地下鉄 " + LINE.jp, annEn: "Metro " + LINE.en, annDist: 170, viewDist: 9 };
    const Lo = mkLine(Object.assign({ id: "yumeO", name: "XEVARION METRO " + LINE.en.toUpperCase() + " (OUTER)", jp: "XEVARION METRO " + LINE.jp + "（外回り）", dir: "外回り", A: Aout }, common));
    const Li = mkLine(Object.assign({ id: "yumeI", name: "XEVARION METRO " + LINE.en.toUpperCase() + " (INNER)", jp: "XEVARION METRO " + LINE.jp + "（内回り）", dir: "内回り", A: Ain, noMapLabel: true }, common));
    METRO.lineO = Lo; METRO.lineI = Li; METRO.lines = [Lo, Li];
    const half = (NC - 1) * PITCH / 2, AL = half + 4.3;
    METRO.stations.forEach((S) => {
      const fx = S.fx, fz = S.fz, rx = -fz, rz = fx, plat = { px: S.cx, pz: S.cz, fx, fz, nx: rx, nz: rz, a0: -PL, a1: PL, b0: -PW, b1: PW, y: YP };
      const ja = S.near.map(([L]) => (L.id === "mono" ? "モノレール" : "路面電車") + "は、お乗り換えです。").join(""), en = S.near.map(([L]) => "Please change here for the XEVARION " + (L.id === "mono" ? "Monorail" : "Streetcar") + ".").join(" ");
      const base = { no: S.no, name: S.name, en: S.en, hint: S.hint, right: true, doorX: -1, si: S.i, plat, xfer: ja ? [ja, en] : null };
      const sO = nearestS(Aout, S.cx - rx * DST, S.cz - rz * DST), sI = nearestS(Ain, S.cx + rx * DST, S.cz + rz * DST);
      Lo.stops.push(Object.assign({}, base, { sC: sO, s: (sO + half) % Aout.L, dirn: 1, alight: { x: S.cx + fx * AL - rx * 3.2, z: S.cz + fz * AL - rz * 3.2, y: YP, yaw: Math.atan2(fx, fz) } }));
      Li.stops.push(Object.assign({}, base, { sC: sI, s: (sI + half) % Ain.L, dirn: -1, alight: { x: S.cx - fx * AL + rx * 3.2, z: S.cz - fz * AL + rz * 3.2, y: YP, yaw: Math.atan2(-fx, -fz) } }));
    });
    [Lo, Li].forEach((L) => { L.stops.sort((p, q) => p.s - q.s); L.stops.forEach((st, k) => { st.k = k; }); });
    METRO.stations.forEach((S) => { S.kOut = Lo.stops.findIndex((q) => q.si === S.i); S.kIn = Li.stops.findIndex((q) => q.si === S.i); });
    [Lo, Li].forEach((L) => {
      L.openStop = (k) => stopUI(L.stops[k].si);
      L.drawMap = (g, W, H, o) => { const pr = drawMetroMap(g, W, H, { board: o.board, hereSi: o.here != null && L.stops[o.here] ? L.stops[o.here].si : null, selSi: o.sel != null && L.stops[o.sel] ? L.stops[o.sel].si : null }); return (st) => pr(METRO.stations[st.si]); };
      L.mapProj = (st) => METRO.mapProj(METRO.stations[st.si]);
    });
    others.forEach((L) => L.stops.forEach((st) => { pAt(L.A, st.sC, _p); const S = METRO.stations.find((q) => Math.hypot(q.cx - _p.x, q.cz - _p.z) < 260); if (S) st.xfer = [(st.xfer ? st.xfer[0] : "") + "地下鉄" + LINE.jp + "は、お乗り換えです。", ((st.xfer ? st.xfer[1] + " " : "") + "Please change here for the XEVARION Metro " + LINE.en + ".")]; }));
    /* ── 形：地下（駅・通路・トンネル・線路・電車）は別のまとまり／地上（出入口・地上への階段）はいつも ── */
    const grp = new T.Group(); grp.name = "metro"; w.scene.add(grp); METRO.group = grp;
    const ub = new (w.batch.constructor)();
    const UG = (fn) => { const b0 = w.batch, s0 = w.scene; w.batch = ub; w.scene = grp; try { fn(); } finally { w.batch = b0; w.scene = s0; } };
    METRO.stations.forEach((S) => { const F = FR(w, S.cx, S.cz, S.fx * S.e, S.fz * S.e); S.F = F; UG(() => buildStation(w, S, F)); buildExit(w, S, F, UG); });
    UG(() => { buildTunnels(w, Ac, sites); buildTrack(w, Aout); buildTrack(w, Ain); mkTrains(w, Lo, 4); mkTrains(w, Li, 4); });
    /* 電車の前の行き先表示 */
    UG(() => [Lo, Li].forEach((L) => L.trains.forEach((tr) => [[tr.cars[0], 1], [tr.cars[tr.cars.length - 1], -1]].forEach(([c, e2]) => { const z = e2 * (car.len / 2 + 0.22); const g = w.captureGroup(() => w.sign((L === Lo ? "外回り" : "内回り") + "  " + LINE.jp, { bg: "#070707", color: "#ffb030", glow: "#ffb030", px: 512 }, 1.5, 0.26, 0, car.hgt - 0.22, z, e2 > 0 ? 0 : Math.PI)); c.g.add(g); }))));
    buildDoors(w, grp); buildPeople(grp);
    METRO.meshes = ub.build(grp);
    rebuildGround(w);
    /* 地下にいるとき（と出入口の近く）だけ描く・遠くは描かない */
    const meshes = METRO.meshes;
    w.anim.push(() => {
      const cam = w._cam; if (!cam) return;
      const cx = cam.position.x, cz = cam.position.z, under = cam.position.y < -0.6;
      let vis = under; if (!vis) for (const k of METRO.kiosks) if (Math.abs(cx - k.x) < 42 && Math.abs(cz - k.z) < 42) { vis = true; break; }
      grp.visible = vis; if (!vis) return;
      const R = under ? 460 : 80;
      for (const m of meshes) { const bs = m.geometry.boundingSphere; m.visible = Math.hypot(bs.center.x - cx, bs.center.z - cz) - bs.radius < R; }
    });
    METRO.built = true;
    w.metroReport = () => ({ stations: METRO.stations.map((S) => [S.no, S.name, Math.round(S.cx), Math.round(S.cz), "exit", Math.round(S.tx), Math.round(S.tz), S.side ? "side" + S.side : "end", S.Lc, S.forced ? "FORCED" : ""]), ringL: Math.round(Ac.L), kiosks: METRO.kiosks.length, meshes: meshes.length });
  };

  /* ══════════════ 地下のいまの場所（名前と明るさ・main.js） ══════════════ */
  P.metroZoneAt = function (x, z, y, riding) {
    if (!METRO.built) return null;
    for (const S of METRO.stations) { const dx = x - S.cx, dz = z - S.cz, a = dx * S.fx + dz * S.fz, b = -dx * S.fz + dz * S.fx; if (Math.abs(a) < SA + 1 && Math.abs(b) < SB + 1) return { name: "🚇 " + S.no + " " + S.name + "駅（" + LINE.jp + "）", light: "metro", x0: 0, z0: 0, x1: 0, z1: 0 }; }
    if (riding && riding.L && riding.L.metro) return { name: "🚇 " + riding.L.jp, light: "tunnel", x0: 0, z0: 0, x1: 0, z1: 0 };
    let best = null, bd = 1e9; for (const S of METRO.stations) { const d = Math.hypot(x - S.tx, z - S.tz); if (d < bd) { bd = d; best = S; } }
    return best && bd < 90 ? { name: "🚇 " + best.no + " " + best.name + "駅 出入口 " + best.exitNo, light: "metro", x0: 0, z0: 0, x1: 0, z1: 0 } : null;
  };

  /* ══════════════ 乗る（行き先をえらぶ：向きは近い方を自動で） ══════════════ */
  function stopUI(si) {
    const ui = window.XParkUI, S = METRO.stations[si], Lo = METRO.lineO, Li = METRO.lineI, n = METRO.stations.length;
    if (XT.wait) XT.cancelWait(true);
    const b = ui.panel("🚇", "XEVARION METRO " + LINE.jp + "　" + S.no + " " + S.name + "駅", "transit");
    b.innerHTML = '<div class="trp"><div class="trpm"><canvas></canvas><small>' + esc(LINE.jp) + "（" + esc(LINE.en) + "）・駅をえらぶと、近い向き（外回り／内回り）の電車に乗ります</small></div><div class=\"trpl\"></div></div>" +
      '<p class="pfoot">ホームで待つと電車が入ってきます（ホームドアが開きます）。車内では ドラッグ（スマホはスティック）で見回す・V で外から・E で早送り。</p>';
    const cv = b.querySelector("canvas"), kk = Math.min(2, devicePixelRatio || 1), CW = 600, CH = 600;
    cv.width = CW * kk; cv.height = CH * kk; cv.style.aspectRatio = CW + " / " + CH;
    const g = cv.getContext("2d"); g.setTransform(kk, 0, 0, kk, 0, 0);
    let sel = null, proj = null;
    const draw = () => { g.clearRect(0, 0, CW, CH); proj = drawMetroMap(g, CW, CH, { hereSi: si, selSi: sel }); };
    draw();
    const route = (j) => { const S2 = METRO.stations[j], tO = travelTime(Lo, S.kOut, S2.kOut), tI = travelTime(Li, S.kIn, S2.kIn); return tO <= tI ? { L: Lo, k: S.kOut, j: S2.kOut, t: tO, nm: "外回り", dir: S.dirO } : { L: Li, k: S.kIn, j: S2.kIn, t: tI, nm: "内回り", dir: S.dirI }; };
    const list = b.querySelector(".trpl"); let html = '<div class="trpH">' + esc(S.name) + " 駅から</div>";
    for (let i = 1; i < n; i++) { const j = (si + i) % n, S2 = METRO.stations[j], r = route(j), t = Math.max(30, Math.round(r.t / 10) * 10), m = Math.floor(t / 60), sec = t % 60, cnt = r.L === Lo ? i : n - i;
      html += '<button data-j="' + j + '" style="--c:' + LINE.color + '"><em>' + S2.no + "</em><b>" + esc(S2.name) + "</b><small>" + esc(S2.hint) + (S2.xferIc ? "　乗り換え " + S2.xferIc : "") + "</small><i>" + r.nm + " " + cnt + "駅目・約" + (m ? m + "分" : "") + (sec ? sec + "秒" : "") + "</i></button>"; }
    list.innerHTML = html;
    const go = (j) => { const r = route(j); ui.close(); r.L.dir = r.nm + "（" + r.dir.ja + "方面）"; r.L.dirEn = (r.L === Lo ? "the outer loop, " : "the inner loop, ") + r.dir.en; XT.board(r.L, r.k, r.j, "platform"); };
    list.querySelectorAll("button").forEach((x) => { x.onclick = () => go(+x.dataset.j); x.onmouseenter = () => { sel = +x.dataset.j; draw(); }; });
    cv.addEventListener("click", (e) => { const rc = cv.getBoundingClientRect(), px = (e.clientX - rc.left) / rc.width * CW, py = (e.clientY - rc.top) / rc.height * CH; let best = -1, bd = 24; METRO.stations.forEach((S2, j) => { if (j === si) return; const [qx, qy] = proj(S2), dd = Math.hypot(qx - px, qy - py); if (dd < bd) { bd = dd; best = j; } }); if (best >= 0) { if (sel === best) go(best); else { sel = best; draw(); const bt = list.querySelector('[data-j="' + best + '"]'); if (bt) { bt.scrollIntoView({ block: "nearest" }); list.querySelectorAll("button").forEach((q) => q.classList.toggle("on", q === bt)); } } } });
  }

  /* ══════════════ エレベーター・案内（main.js の runAct から） ══════════════ */
  XT.metroAct = function (r) {
    const S = r.si != null ? METRO.stations[r.si] : null, C = XT.ctx;
    if (r.info === "ticket") { C.toast("🎫 XEVARION METRO はパークの乗り放題パスで乗れます（きっぷはいりません）。ホームで「乗る」→ 行き先をえらんでね"); return true; }
    if (r.info === "office" && S) { if (window.XParkUI) XParkUI.handle({ lobby: { name: S.name + "駅 窓口（" + LINE.jp + "）", text: S.name + "駅へようこそ。" + LINE.jp + "はパークのまん中を1周する地下鉄です（" + METRO.stations.length + "駅・1周 約" + Math.round(METRO.ringL / 100) / 10 + "km）。外回りは " + S.dirO.ja + " 方面、内回りは " + S.dirI.ja + " 方面。地上の出口 " + S.exitNo + " は「" + S.exitTo + "」のそばです。" } }, null); return true; }
    /* ★★ 2026-10-02 エレベーターの演出（とびら・階数計）。とびらが閉まっている間に移動する */
    const EV = (from, to, title, f) => { if (window.XParkUI && XParkUI.elevator) XParkUI.elevator({ floors: ["B2", "B1", "1F"], from, to, title, dur: 1500 }, f); else f(); };
    if (r.ev && S) {
      const F = S.F;
      if (r.ev === "gate") { const [x, z] = S.gateIn; EV("1F", "B1", S.name + "駅  改札階（地下1階）へ", () => C.teleport(x, z, YM, S.side ? Math.atan2(-F.rx * S.side, -F.rz * S.side) : F.faceB, "エレベーターで改札階（地下1階）へ")); return true; }
      if (r.ev === "mz") { const [x, z] = F.at(EVA + 2.4, 0); EV("B2", "B1", S.name + "駅  改札階へ", () => C.teleport(x, z, YM, F.faceF, "エレベーターで改札階（改札の中）へ")); return true; }
      if (r.ev === "pl") { const [x, z] = F.at(EVA + 2.4, 0); EV("B1", "B2", S.name + "駅  ホーム（地下2階）へ", () => C.teleport(x, z, YP, F.faceF, "エレベーターでホーム（地下2階）へ")); return true; }
      if (r.ev === "street" && S.evStreet) { EV("B1", "1F", S.name + "駅  地上の出入口 " + S.exitNo + " へ", () => C.teleport(S.evStreet[0], S.evStreet[1], 0, S.evFace, "エレベーターで地上（出入口 " + S.exitNo + "）へ")); return true; }
    }
    return false;
  };
  XT.metro = METRO;
})();
