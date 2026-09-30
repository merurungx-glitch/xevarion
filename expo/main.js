/* ══════════════════════════════════════════════════════════════════
   XEVARION PARK — 本体（描画・操作・カメラ・会場のキャラ・ミニゲーム・画面の UI）
   ★★ 2026-09-28d パーク全面作り直し（park.js / park_areas.js / park_areas2.js）＋見た目の仕上げ（fx.js）
     ・空・雲・光のにじみ・昼／夕方／夜（時間で自動にくり返す・☀️ ボタン・T でも変えられる）。NIGHT ZONE もほかのエリアと同じ。
     ・上空から見る（🛰 ボタン・V）：マップの絵のように島全体を空から見わたす。
     ・来場者：近くは VRoid の人（まわりに集まるように入れかわる）、遠くは小さな人の群れ。
     ・モノレールに乗れる（駅で E）。ステージ・シアターの大画面で YouTube の動画を見られる。
   ★ 2026-09-28c パーク全体をマップどおりに。会場のキャラは VRoid のサンプル A/C/M/O/P の色違い（people.js）。
   ★ 2026-09-28b 自分が動かすキャラは VRoid Studio で作ったキャラ（chara/chara01.glb・vrm.js）だけ。W 2回でダッシュ。すわれる。ミニゲーム。
   ══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const T = THREE, D = window.EXPO_DATA || { mates: [] };
  const ROOT = "../";
  const $ = (id) => document.getElementById(id);
  const MOBILE = matchMedia("(pointer:coarse)").matches || /iPhone|iPad|Android/.test(navigator.userAgent);
  const SUN = XPark.SUN.clone();
  document.body.classList.toggle("mobile", MOBILE);

  /* ── 保存（どこにいたか）── */
  const ST_KEY = "xeva_expo_state2";
  function loadState() { try { return JSON.parse(sessionStorage.getItem(ST_KEY) || "null"); } catch (e) { return null; } }
  function saveState(s) { try { sessionStorage.setItem(ST_KEY, JSON.stringify(s)); } catch (e) {} }

  /* ══════════════ 描画の準備 ══════════════ */
  const canvas = $("cv");
  const renderer = new T.WebGLRenderer({ canvas, antialias: !MOBILE, powerPreference: "high-performance", alpha: true });
  renderer.setClearAlpha(1);          /* ★ 2026-09-29d 透明はライブの画面の「窓」だけ（動画はキャンバスのうしろ＝キャラや人が前に見える） */
  const PR = Math.min(window.devicePixelRatio || 1, MOBILE ? 1.25 : 1.6);
  renderer.setPixelRatio(PR);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = MOBILE ? T.PCFShadowMap : T.PCFSoftShadowMap;
  const scene = new T.Scene();
  scene.fog = new T.Fog(0xcfe2fb, 220, 1900);
  const camera = new T.PerspectiveCamera(58, 1, 0.12, 7000);

  const hemi = new T.HemisphereLight(0xeaf3ff, 0x8a9a72, 0.8); scene.add(hemi);
  const sun = new T.DirectionalLight(0xfff2de, 2.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(MOBILE ? 1024 : 2048, MOBILE ? 1024 : 2048);
  const sc = sun.shadow.camera; sc.left = sc.bottom = MOBILE ? -22 : -34; sc.right = sc.top = MOBILE ? 22 : 34; sc.near = 1; sc.far = 260;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
  scene.add(sun); scene.add(sun.target);
  const fill = new T.DirectionalLight(0xbfd4ff, 0.35); fill.position.set(-20, 30, -10); scene.add(fill);
  const spots = [-1, 1].map((s) => { const L = new T.SpotLight(0xfff2dd, 0, 40, 0.32, 0.5, 1.2); L.position.set(s * 8, 12, -48); L.target.position.set(0, -1.7, -61.5); scene.add(L); scene.add(L.target); return L; });
  const cafeLight = new T.PointLight(0xffb86b, 0, 18, 1.6); cafeLight.position.set(-27, 4, -8); scene.add(cafeLight);

  const world = new XWorld.World(scene, renderer);
  const VIEWR = MOBILE ? 520 : 1000, VIEWD = MOBILE ? 180 : 320;
  world.viewR = VIEWR; world.viewD = VIEWD;
  XFX.init({ renderer, scene, camera, sun, hemi, fill, world, mobile: MOBILE, sunDir: SUN });
  XGFX.init({ renderer, scene, camera, sun, world });
  XShows.init({ world });             /* ★ 2026-09-29 草・水の映りこみ・建物の映りこみ・花びら・画質 */
  /* 鏡・プローブに描かない物（レイヤー 3）：遠くの群衆・客席の人・光だまり・旗・粒・小物 */
  (function () {
    const L3 = (o) => { if (o) o.layers.set(3); };
    (world.crowdFar || []).forEach(L3); L3(world.lampPools); L3(world.flagMesh);
    (world.farObjs || []).forEach((f) => L3(f.o));
    scene.traverse((o) => { if (o.isPoints) o.layers.set(3); });
    (world.meshes || []).forEach((m) => { if (m.userData.detail) m.layers.set(3); });
    (world.vegCells || []).forEach((c) => { if (c.only) c.lod.forEach((l) => l && l.forEach(L3)); });
  })();

  const LIGHTS = {
    outdoor: { face: 1.0, hemi: 0.75, sun: 2.3, exp: 0.95, spot: 0, cafe: 0, fog: [0xcfe4ff, 220, 1900] },
    lobby: { face: 0.93, hemi: 0.62, sun: 0.75, exp: 0.85, spot: 0, cafe: 0.6, fog: [0xd8d0c4, 40, 160] },
    cafe: { face: 0.92, hemi: 0.5, sun: 0.5, exp: 0.88, spot: 0, cafe: 2.2, fog: [0xd8d0c4, 40, 160] },
    store: { face: 0.93, hemi: 0.55, sun: 0.65, exp: 0.88, spot: 0, cafe: 0.4, fog: [0xd8d0c4, 40, 160] },
    keynote: { face: 0.8, hemi: 0.22, sun: 0.15, exp: 0.9, spot: 60, cafe: 0, fog: [0x0a0f22, 30, 120] },
    corridor: { face: 0.9, hemi: 0.55, sun: 0.45, exp: 0.88, spot: 0, cafe: 0, fog: [0xcac6c0, 30, 120] },
    track: { face: 0.82, hemi: 0.42, sun: 0.3, exp: 0.9, spot: 0, cafe: 0, fog: [0x1a1f30, 30, 120] },
    expo: { face: 0.94, hemi: 0.6, sun: 0.6, exp: 0.9, spot: 0, cafe: 0, fog: [0xc6c8cc, 50, 200] },
    arena: { face: 1.0, hemi: 0.85, sun: 1.8, exp: 0.95, spot: 0, cafe: 0, fog: [0xcfe4ff, 120, 900] },
    live: { face: 0.85, hemi: 0.16, sun: 0.1, exp: 1.05, spot: 0, cafe: 0, fog: [0x0a0616, 40, 160] },
    /* ★★ 2026-09-29 入れる建物の中 */
    shop: { face: 0.93, hemi: 0.7, sun: 0.35, exp: 0.92, spot: 0, cafe: 0, room: 1.0, fog: [0xd8d0c4, 40, 170], sky: 0xfff8f0, gnd: 0xe8e2da },
    neon: { face: 0.88, hemi: 0.42, sun: 0.12, exp: 1.0, spot: 0, cafe: 0, room: 0.75, roomC: 0xe0a8ff, fog: [0x140a24, 30, 130], sky: 0xd8c8ff, gnd: 0x6a4a8a },
    cinema: { face: 0.8, hemi: 0.26, sun: 0.06, exp: 0.95, spot: 0, cafe: 0, room: 0.45, roomC: 0xffd8b0, fog: [0x0a0616, 30, 150], sky: 0xb0a0c8, gnd: 0x4a2a38 },
    dark: { face: 0.72, hemi: 0.14, sun: 0.04, exp: 0.95, spot: 0, cafe: 0, room: 0.2, roomC: 0x8a9aff, fog: [0x05040a, 12, 70], sky: 0x6a6a8a, gnd: 0x201828 },
    planet: { face: 0.7, hemi: 0.12, sun: 0.02, exp: 1.0, spot: 0, cafe: 0, room: 0.1, roomC: 0x8ab0ff, fog: [0x02030a, 60, 240], sky: 0x3a4a8a, gnd: 0x101830 }
  };
  (["lobby", "cafe", "store", "corridor", "expo"]).forEach((k) => { LIGHTS[k].sky = 0xfff8f0; LIGHTS[k].gnd = 0xe8e2da; });
  (["keynote", "track", "live"]).forEach((k) => { LIGHTS[k].sky = 0x9a9ab8; LIGHTS[k].gnd = 0x2a2440; });
  let curLight = Object.assign({ room: 0 }, LIGHTS.outdoor);
  /* ★★ 2026-09-29 部屋の明かり（入れる建物の天井のまん中）・半球光の空と地面の色（屋内は暖かい白） */
  const roomLight = new T.PointLight(0xfff0dc, 0, 30, 1.2); roomLight.position.set(0, -50, 0); scene.add(roomLight);
  const hemiSky = new T.Color(0xeaf3ff), hemiGnd = new T.Color(0x8a9a72), _hc = new T.Color(), _rc = new T.Color(0xfff0dc);

  /* ══════════════ 自分（VRoid のキャラ） ══════════════ */
  const st0 = loadState();
  const START = [0, 952, Math.PI];                                   /* はじめは正面のゲートの前の広場から（北を向く） */
  const player = { x: START[0], z: START[1], y: 0, yaw: START[2], vx: 0, vz: 0, av: null, run: false, dash: false, sit: null, deck: null };
  if (st0 && typeof st0.x === "number" && world.insideIsland(st0.x, st0.z, 4)) { player.x = st0.x; player.z = st0.z; player.yaw = st0.yaw || 0; }
  const cam = { yaw: player.yaw + Math.PI, pitch: 0.22, dist: MOBILE ? 5.6 : 4.2, target: new T.Vector3() };

  /* ══════════════ 会場のキャラ（名前・役・話すこと） ══════════════ */
  const NPC = [
    { id: "minato", spot: "keynote", say: "slide", lines: ["ようこそ、基調講演へ！前の大きな画面で最新のアップデートを発表しています。", "すわって聞いていってくださいね。客席の近くで E を押すとすわれます。"] },
    { id: "kai", spot: "TRACK A", say: "track", lines: ["TRACK A はゲームの話！新しいイベントやガチャの話題が中心だ。", "北東のサッカースタジアムも楽しいぞ。3対3、勝てるかな？"] },
    { id: "yui", spot: "TRACK B", say: "track", lines: ["TRACK B では学習と AI のお話をしています。", "東の LEARNING CITY も、遊びながら学べる場所ですよ。"] },
    { id: "ren", spot: "TRACK C", say: "track", lines: ["TRACK C はクリエイティブとツールの話。作るのって楽しいよね。", "展示ホールで気になるアプリを開いてみて。"] },
    { id: "tsumugi", spot: "reception", i: 0, lines: ["XEVARION HALL へようこそ！", "右上の地図のボタンで、行きたいエリアへワープできますよ。", "🛰 のボタンで、パークを空から見わたせます！"] },
    { id: "aoi", spot: "reception", i: 1, lines: ["案内カウンターです。講演は奥が基調講演、西が講演トラック、東が展示ホールです。", "サッカーは北東のスタジアム、ボッチャは南東のアリーナ、カートは北のモーターシティです。"] },
    { id: "koko", spot: "cafe", lines: ["いらっしゃいませ！XEVA CAFÉ へようこそ。", "おすすめは星煌フラペチーノです♪ テーブルのいすにもすわれますよ。"] },
    { id: "mio", spot: "store", lines: ["XEVARION STORE へようこそ！", "奥のガチャのコーナーから、開催中のガチャに行けます。"] },
    { id: "haru", path: "expo", lines: ["展示ホールには全部のアプリのブースがあるよ。", "ブースの前で E を押すと、そのアプリが開くんだ。"] },
    { id: "sota", spot: "soccer", lines: ["サッカーやるかい？ 3対3、青チームで右のゴールをねらうんだ。", "ボールに近づいて E（スマホはキック）で蹴れる。走ってドリブルもできるぞ！"], game: "soccer" },
    { id: "riko", spot: "boccia", lines: ["ボッチャで勝負しよう！ 白いジャックにどれだけ近づけるかの勝負だよ。", "ためる時間で強さが変わるよ。やさしく投げるのがコツ！"], game: "boccia" },
    { id: "jin", spot: "kart", lines: ["カートレースに出るか？ 3周でいちばんを目指せ！", "E でブースト。コースの外は遅くなるから気をつけろよ。"], game: "kart" },
    { id: "sakura", spot: "fountain", dance: true, lines: ["セントラルファウンテンパークへようこそ♪ 大噴水、きれいでしょ？", "夜になると噴水の水が虹色に光るの！ ☀️ のボタンで夜にしてみて♪"] },
    { id: "nagi", spot: "gate", lines: ["XEVARION PARK へようこそ！ まっすぐ進むとマーケット、その先が中央の大噴水です。", "右上の地図から、24のエリアどこへでもワープできますよ！", "駅からモノレールに乗って、島をひとまわりもできます！"] }
  ];
  let npcs = [];
  function setupNPCs() {
    npcs.forEach((n) => scene.remove(n.av.root)); npcs = [];
    NPC.forEach((d) => {
      const av = XPeople.make(d.id, { outline: true }); av.root.traverse((o) => o.layers.set(3));
      const n = Object.assign({ av, name: av.name, role: av.sp.role, x: 0, z: 0, yaw: 0, path: null, pi: 0, talkUntil: 0, greeted: false, lastSlide: -1, li: 0 }, d);
      if (d.spot) { const sp = (world.npcSpots[d.spot] || [])[d.i || 0] || [0, 0, 0]; n.x = sp[0]; n.z = sp[1]; n.yaw = sp[2]; n.home = [sp[0], sp[1], sp[2]]; }
      if (d.path === "expo") { n.path = world.expoPath; n.x = n.path[0][0]; n.z = n.path[0][1]; }
      if (d.dance) n.av.v.opt.dance = true;
      if (d.say === "slide") world.keynote.presenter = { name: n.name, role: n.role };
      scene.add(av.root);
      npcs.push(n);
    });
  }

  /* ══════════════ 一般の来場者（近くは VRoid の人：自分のまわりの道を歩き、遠くへ行ったら近くに入れかわる） ══════════════ */
  const crowd = [], POOL = MOBILE ? 7 : 11;
  function pickWalk(c, near) {
    const WP = world.walkPaths;
    for (let tries = 0; tries < 60; tries++) {
      const p = WP[Math.floor(Math.random() * WP.length)], pts = p.pts; if (!pts || pts.length < 2) continue;
      const i = Math.floor(Math.random() * (pts.length - 1)), x = pts[i][0], z = pts[i][1], d = Math.hypot(x - player.x, z - player.z);
      if (d < (near ? 5 : 22) || d > 34 || world.isWater(x, z)) continue;
      c.kind = "walk"; c.path = p; c.i = i; c.dir = Math.random() < 0.5 ? 1 : -1; c.off = (Math.random() - 0.5) * Math.max(0.6, p.w - 2.4); c.x = x; c.z = z; c.pause = 0; c.spd = 1.0 + Math.random() * 0.4;
      return true;
    }
    return false;
  }
  function pickStand(c, near) {
    const PL = world.plazas;
    for (let tries = 0; tries < 30; tries++) {
      const q = PL[Math.floor(Math.random() * PL.length)]; if (!q) break;
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * q[2] * 0.9, x = q[0] + Math.cos(a) * r, z = q[1] + Math.sin(a) * r, d = Math.hypot(x - player.x, z - player.z);
      if (d < (near ? 5 : 22) || d > 34 || !world.insideIsland(x, z, 4) || world.isWater(x, z) || world.isWater(x + 0.7, z) || world.isWater(x, z + 0.7)) continue;
      c.kind = "stand"; c.x = x; c.z = z; c.yaw = Math.random() * Math.PI * 2; c.path = null;
      return true;
    }
    return pickWalk(c, near);
  }
  /* ★★ 2026-09-30 会話する2人組（ご指定「エリアごとにそれぞれ人が吹き出しで会話するように」）：先の人の横に相手が立つ */
  function placePartner(c) { const b = c.partner; if (!b) return; const a = c.yaw + Math.PI / 2; b.kind = "stand"; b.path = null; b.x = c.x + Math.sin(a) * 1.3; b.z = c.z + Math.cos(a) * 1.3; if (world.isWater(b.x, b.z)) { b.x = c.x - Math.sin(a) * 1.3; b.z = c.z - Math.cos(a) * 1.3; } c.yaw = Math.atan2(b.x - c.x, b.z - c.z); b.yaw = c.yaw + Math.PI; }
  function setupCrowd() {
    crowd.forEach((c) => { scene.remove(c.av.root); if (c.bub) { c.bub.remove(); c.bub = null; } }); crowd.length = 0;
    for (let i = 0; i < POOL; i++) {
      const av = XPeople.make(XPeople.random(), { shadow: false }); av.root.traverse((o) => o.layers.set(3));
      const c = { av, kind: "walk", x: 0, z: 0, yaw: 0, skip: i % 3 };
      if (i % 4 === 1 && crowd.length && crowd[crowd.length - 1].lead) { const L = crowd[crowd.length - 1]; L.partner = c; c.partnerOf = L; scene.add(av.root); crowd.push(c); placePartner(L); continue; }
      if (i % 4 === 0) c.lead = true;
      if (!(i % 3 === 0 || c.lead ? pickStand(c, true) : pickWalk(c, true))) { c.x = player.x + (Math.random() - 0.5) * 40; c.z = player.z + (Math.random() - 0.5) * 40; c.kind = "stand"; }
      scene.add(av.root); crowd.push(c);
    }
    /* 近くのベンチ（客席）にすわる人：基調講演・トラックの客席 */
    const K = MOBILE ? 0.4 : 0.8, ks = (world.seatKeynote || []).slice();
    for (let i = 0; i < 26 * K && ks.length; i++) { const j = Math.floor(Math.pow(Math.random(), 1.6) * ks.length * 0.8), q = ks.splice(ks.length - 1 - j, 1)[0]; const av = XPeople.make(XPeople.random(), { shadow: false }); av.sit = true; av.seatH = 0.5; scene.add(av.root); crowd.push({ av, kind: "sit", x: q[0], z: q[2] + 0.12, yaw: Math.PI, y: q[1], skip: 0, fixed: true }); }
    const ts = (world.seatTrack || []).slice();
    for (let i = 0; i < 18 * K && ts.length; i++) { const q = ts.splice(Math.floor(Math.random() * ts.length), 1)[0]; const av = XPeople.make(XPeople.random(), { shadow: false }); av.sit = true; av.seatH = 0.5; scene.add(av.root); crowd.push({ av, kind: "sit", x: q[0], z: q[1], yaw: Math.atan2(q[2] - q[0], q[3] - q[1]), y: 0, skip: 0, fixed: true }); }
  }
  function updateCrowd(dt) {
    for (const c of crowd) {
      let d = Math.hypot(player.x - c.x, player.z - c.z);
      if (!c.fixed && !c.partnerOf && d > 40 && !sky.on) { if (c.lead ? pickStand(c, false) : c.kind === "stand" ? pickStand(c, false) : pickWalk(c, false)) { if (c.lead) placePartner(c); d = Math.hypot(player.x - c.x, player.z - c.z); } }
      c.av.root.visible = d < (MOBILE ? 26 : 31) && !sky.on && !(riding && riding.L.id === "mono");
      if (!c.av.root.visible) continue;
      c.skip = (c.skip + 1) % (d < 25 ? 1 : d < 40 ? 2 : 3);
      let vel = 0;
      if (c.kind === "walk" && c.path) {
        const pts = c.path.pts, ni = c.i + c.dir;
        if (ni < 0 || ni >= pts.length) { c.dir = -c.dir; c.pause = Math.random() < 0.35 ? 1 + Math.random() * 2.5 : 0; }
        else {
          const a = pts[c.i], b = pts[ni], sx = b[0] - a[0], sz = b[1] - a[1], sl = Math.hypot(sx, sz) || 1, nx = -sz / sl, nz = sx / sl;
          const tx = b[0] + nx * c.off, tz = b[1] + nz * c.off, dx = tx - c.x, dz = tz - c.z, dd = Math.hypot(dx, dz);
          if (dd < 0.6) c.i = ni;
          else if (!(c.pause > 0)) {
            let ax = dx / dd, az = dz / dd;
            if (d < 1.4) { ax += (c.x - player.x) / d * 0.8; az += (c.z - player.z) / d * 0.8; const l = Math.hypot(ax, az); ax /= l; az /= l; }
            c.x += ax * c.spd * dt; c.z += az * c.spd * dt; vel = c.spd;
            let dy = Math.atan2(ax, az) - c.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2; c.yaw += dy * Math.min(1, dt * 6);
          }
        }
        if (c.pause > 0) c.pause -= dt;
      }
      const baseY = c.kind === "sit" ? (c.y || 0) : world.heightAt(c.x, c.z);
      c.av.root.position.set(c.x, baseY, c.z); c.av.root.rotation.y = c.yaw;
      c.acc = (c.acc || 0) + dt;
      c.av.detail(d < 22);
      if (c.skip === 0) { c.av.update(c.acc, vel, { noSpring: d > 18, noFace: d > 22 }); c.acc = 0; }
    }
  }

  /* ══════════════ 吹き出し・名前 ══════════════ */
  const bubLayer = $("bubbles");
  function bubbleFor(obj) {
    if (!obj.bub) {
      obj.bub = document.createElement("div"); obj.bub.className = "bub"; bubLayer.appendChild(obj.bub);
      obj.tag = document.createElement("div"); obj.tag.className = "tag"; obj.tag.textContent = obj.name; bubLayer.appendChild(obj.tag);
    }
    return obj.bub;
  }
  function say(n, text, ms, expr) {
    const b = bubbleFor(n); b.textContent = text; b.classList.add("on");
    n.av.setExpr(expr || (/[！!♪]/.test(text) ? "happy" : "smile"), 2600 + text.length * 60);
    n.av.talkUntil = performance.now() + 900 + text.length * 55;
    n.talkUntil = performance.now() + (ms || 2600 + text.length * 70);
  }

  /* ══════════════ 入力 ══════════════ */
  const keys = {};
  let lastW = 0, actPress = false, actRelease = false;
  addEventListener("keydown", (e) => {
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if (XParkUI.busy()) { keys[e.code] = false; if (e.code === "Escape" || (e.code === "KeyM" && $("pui").classList.contains("map"))) XParkUI.close(); else XParkUI.key(e); if (e.code === "Space") e.preventDefault(); return; }
    const was = keys[e.code];
    keys[e.code] = true;
    if ((e.code === "KeyW" || e.code === "ArrowUp") && !was && !e.repeat) { const now = performance.now(); if (now - lastW < 300) player.dash = true; lastW = now; }
    if ((e.code === "KeyE" || e.code === "Enter" || e.code === "Space") && !was) { actPress = true; if (riding) { XTransit.skip(); } else if (XRides.RIDE.cur) { rideSkip = true; } else if (XRides.HOVER.on && e.code === "KeyE") { toggleHover(); } else if (!game && !sky.on) doInteract(); if (e.code === "Space") e.preventDefault(); }
    if (!was) for (const a in KEYS) if (KEYS[a] === e.code) { runKey(a); break; }
    if (e.code === "Escape") { if (theater) closeVideo(); else if (sky.on) toggleSky(); else if (game) exitGame(); else closeOverlays(); }
    if (e.code === "ShiftLeft" || e.code === "ShiftRight") player.run = true;
  });
  addEventListener("keyup", (e) => {
    keys[e.code] = false;
    if (e.code === "KeyW" || e.code === "ArrowUp") player.dash = false;
    if (e.code === "KeyE" || e.code === "Enter" || e.code === "Space") actRelease = true;
    if (e.code === "ShiftLeft" || e.code === "ShiftRight") player.run = false;
  });
  const joy = { id: null, x0: 0, y0: 0, dx: 0, dy: 0 }, look = { id: null, x: 0, y: 0 }, pinch = { d: 0 };
  const touches = {};
  canvas.addEventListener("pointerdown", (e) => {
    try { canvas.setPointerCapture(e.pointerId); } catch (er) {}
    touches[e.pointerId] = { x: e.clientX, y: e.clientY };
    if (e.pointerType === "touch" && e.clientX < innerWidth * 0.45 && joy.id == null && !sky.on) {
      joy.id = e.pointerId; joy.x0 = e.clientX; joy.y0 = e.clientY; joy.dx = joy.dy = 0;
      $("joy").style.cssText = "display:block;left:" + (e.clientX - 60) + "px;top:" + (e.clientY - 60) + "px"; $("knob").style.transform = "translate(0,0)";
    } else if (look.id == null) { look.id = e.pointerId; look.x = e.clientX; look.y = e.clientY; look.moved = 0; }
  });
  canvas.addEventListener("pointermove", (e) => {
    if (touches[e.pointerId]) { touches[e.pointerId].x = e.clientX; touches[e.pointerId].y = e.clientY; }
    const ids = Object.keys(touches);
    if (ids.length >= 2 && e.pointerType === "touch" && joy.id == null) {
      const a = touches[ids[0]], b = touches[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch.d) { if (sky.on) sky.dist = Math.max(260, Math.min(3200, sky.dist * pinch.d / d)); else cam.dist = Math.max(1.6, Math.min(12, cam.dist * pinch.d / d)); }
      pinch.d = d; return;
    }
    if (e.pointerId === joy.id) {
      let dx = e.clientX - joy.x0, dy = e.clientY - joy.y0; const m = Math.hypot(dx, dy); if (m > 55) { dx *= 55 / m; dy *= 55 / m; }
      joy.dx = dx / 55; joy.dy = dy / 55; $("knob").style.transform = "translate(" + dx + "px," + dy + "px)";
    } else if (e.pointerId === look.id) {
      const dx = e.clientX - look.x, dy = e.clientY - look.y; look.x = e.clientX; look.y = e.clientY; look.moved += Math.abs(dx) + Math.abs(dy);
      if (sky.on) { sky.yaw -= dx * 0.005; sky.pitch = Math.max(0.18, Math.min(1.45, sky.pitch + dy * 0.004)); }
      else if (riding) XTransit.look(dx * SENS.v, dy * SENS.v);
      else if ((!theater || theater.free) && !riding) { const k = SENS.v; cam.yaw -= dx * 0.0055 * k; cam.pitch = cam.fp ? Math.max(-1.35, Math.min(1.35, cam.pitch + dy * 0.004 * k)) : Math.max(-0.95, Math.min(1.3, cam.pitch + dy * 0.004 * k)); }
    }
  });
  const endPtr = (e) => {
    delete touches[e.pointerId]; if (Object.keys(touches).length < 2) pinch.d = 0;
    if (e.pointerId === joy.id) { joy.id = null; joy.dx = joy.dy = 0; $("joy").style.display = "none"; }
    if (e.pointerId === look.id) { if (look.moved < 8 && !game && !sky.on) clickPick(e.clientX, e.clientY); look.id = null; }
  };
  canvas.addEventListener("pointerup", endPtr); canvas.addEventListener("pointercancel", endPtr);
  canvas.addEventListener("wheel", (e) => { if (sky.on) sky.dist = Math.max(260, Math.min(3200, sky.dist * (1 + Math.sign(e.deltaY) * 0.1))); else cam.dist = Math.max(1.6, Math.min(12, cam.dist * (1 + Math.sign(e.deltaY) * 0.1))); e.preventDefault(); }, { passive: false });

  const ray = new T.Raycaster();
  function clickPick(cx, cy) {
    const v = new T.Vector2(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1);
    ray.setFromCamera(v, camera);
    let best = null, bd = 1e9;
    npcs.forEach((n) => { const p = new T.Vector3(n.x, n.av.root.position.y + 1.2, n.z), d = ray.ray.distanceToPoint(p), dist = p.distanceTo(camera.position); if (d < 0.7 && dist < 20 && dist < bd) { bd = dist; best = n; } });
    if (best) return talkTo(best);
  }

  /* ══════════════ 近くの「できること」 ══════════════ */
  let nearNow = null;
  function nearInteract(maxR) {
    let best = null, bd = 1e9;
    const onLv = !!world.lastLv;
    world.inter.forEach((it) => { if (it.y != null ? Math.abs(player.y - it.y) > 2.5 : onLv) return; const d = Math.hypot(it.x - player.x, it.z - player.z); if (d < (maxR || it.r) && d < bd) { bd = d; best = it; } });
    return best;
  }
  function nearNPC() { if (player.y < -100) return null; let best = null, bd = 2.6; npcs.forEach((n) => { const d = Math.hypot(n.x - player.x, n.z - player.z); if (d < bd) { bd = d; best = n; } }); return best; }
  function nearSeat() {
    let best = null, bd = 1.25;
    for (const s of world.seats) { if (s.taken) continue; const d = Math.hypot(s.x - player.x, s.z - player.z); if (d < bd && Math.abs((s.h - 0.5) - player.y) < 1.2) { bd = d; best = s; } }
    return best;
  }
  function doInteract() {
    if (theater) return;
    if (player.sit) return standUp();
    if (player.deck) { const dk = player.deck; if (Math.hypot(player.x - (dk.exitX != null ? dk.exitX : dk.x), player.z - (dk.exitZ != null ? dk.exitZ : dk.z)) < (dk.exitR || 7)) { if (dk.liftDef && window.XRooms && XRooms.deckDown(dk)) { player.deck = null; return; } player.deck = null; player.x = dk.downX != null ? dk.downX : dk.x + 20; player.z = dk.downZ != null ? dk.downZ : dk.z; player.y = 0; toast("地上にもどりました"); return; } }
    const n = nearNPC(); if (n) return talkTo(n);
    const it = nearInteract(); if (it) return runAct(it);
    const s = nearSeat(); if (s) return sitDown(s);
  }
  function sitDown(s) {
    player.sit = s; s.taken = true; player.x = s.x; player.z = s.z; player.yaw = s.yaw;
    cam.yaw = s.yaw + Math.PI; toast("すわりました（もう一度押すか、歩くと立ちます）");
    player.av && player.av.setFace("relaxed", 2500);
  }
  function standUp() {
    const s = player.sit; if (!s) return;
    s.taken = false; player.sit = null;
    player.x = s.x + Math.sin(s.yaw) * 0.55; player.z = s.z + Math.cos(s.yaw) * 0.55;
  }
  function talkTo(n) {
    const t = n.lines[n.li % n.lines.length]; n.li++;
    say(n, t);
    n.faceUntil = performance.now() + 6000;
    if (Math.random() < 0.5) n.av.wave = 1.6;
    if (n.game) setTimeout(() => { if (!game) toast("🎮 近くのボタン（" + (MOBILE ? "下のボタン" : "E") + "）で始められます"); }, 1200);
  }
  function runAct(it) {
    const r = it.act();
    if (!r) return;
    if (window.XRooms && XRooms.handle(r)) { if (player.sit) standUp(); return; }          /* ★★ 2026-09-30 建物の中・階・展望エレベーター（park_rooms.js） */
    if (XParkUI.handle(r, world.interiorAt ? world.interiorAt(player.x, player.z, player.y) : null)) return;
    if (r.open) return openApp(r.open, r.app);
    if (r.slides) return openSlides(r.slides);
    if (r.menu) return openMenu();
    if (r.game) return startGame(r.game);
    if (r.video) return openVideo(r.video);
    if (r.transit) { if (XRides.HOVER.on) toggleHover(); if (player.sit) standUp(); XTransit.act(r.transit); return; }
    if (r.rideId) return startParkRide(r.rideId);
    if (r.deck) { if (player.sit) standUp(); enterDeck(r.deck); return; }          /* ★ 2026-09-29d NGX タワーの展望フロアなど */
    if (r.lift) { const [lx, ly, lz] = r.lift; player.deck = { x: lx - 14, z: lz, y: ly, rIn: 6.4, rOut: 12.6 }; player.x = lx - 14 + 9; player.z = lz; player.y = ly; toast("展望台（地上 125m）にのぼりました。まん中で E（下のボタン）で地上へ"); return; }
    if (r.board) { if (window.XLife) XLife.boardUI(r.board); return; }          /* ★★ 2026-09-30 掲示板 */
    if (r.scope) { if (window.XScope) XScope.open(r.scope); return; }           /* ★★ 2026-09-30 夜桜キャッスル（MagiScope ギャラリー） */
    if (r.adultList) { if (window.XAdult) XAdult.list(); return; }              /* ★★ 2026-09-30b 大人のギャラリー（18歳以上） */
    if (r.adultWork != null) { if (window.XAdult) XAdult.detail(r.adultWork); return; }
    if (r.pray) { toast("⛩️ パン、パン… 妖怪神社にお参りしました。いいことがありますように！"); return; }
    if (r.omikuji) { const F = [["大吉", "なにをやってもうまくいく日！"], ["中吉", "友だちと出かけると、いいことが。"], ["小吉", "小さなしあわせが見つかりそう。"], ["吉", "こつこつ続けるとうまくいく。"], ["末吉", "あせらずに。夜にいいことが。"], ["凶", "今日はゆっくり休もう。明日は大吉かも？"]]; const f = F[Math.floor(Math.random() * F.length)]; toast("📜 おみくじ：【" + f[0] + "】 " + f[1]); return; }
    if (r.talkHolo) toast(window.EXPO_DATA && (EXPO_DATA.newchars || []).length ? "🌟 新キャラの発表は、奥の基調講演ホール（KEYNOTE）の大画面で！" : "パートナーはホームのロビーで待っています");
    if (r.parade) { if (XFX.mode !== "day") return toast("パレードは昼に行われます（☀️ で昼にできます）"); if (!XShows.PARADE.start(showCtx())) toast("パレードはいま行われています！"); else toast("🎉 デイタイムパレード スタート！"); return; }
    if (r.nightShow) { if (XFX.mode !== "night") return toast("XEVARION NIGHT は夜のショーです（🌙 で夜にできます）"); if (!XShows.NIGHT.start(showCtx())) toast("ショーはいま行われています！"); else toast("✨ XEVARION NIGHT スタート！"); return; }
    if (r.harborShow) { if (XFX.mode !== "night") return toast("水上パレード「CHASE THE LIGHT」は夜のショーです（🌙 で夜にできます）"); if (!XHarbor.start(showCtx())) toast("パレードはいま行われています！"); else toast("🚢 CHASE THE LIGHT スタート！"); return; }
    if (r.arenaDemo) { XShows.Arena.demo = !XShows.Arena.demo; toast(XShows.Arena.demo ? "✨ デモのライブ（メインテーマ）" : "デモのライブをとめました"); }
  }
  /* 展望フロア（丸い輪）・屋上（四角）に立つ */
  function enterDeck(d) {
    player.deck = Object.assign({}, d); player.y = d.y;
    if (d.rect) { const k = 2.6 / Math.max(1, Math.hypot(d.exitX - d.x, d.exitZ - d.z)); player.x = d.exitX + (d.x - d.exitX) * k; player.z = d.exitZ + (d.z - d.exitZ) * k; }
    else { player.x = d.x + (d.rIn + d.rOut) / 2; player.z = d.z; }
    if (!d.rect) toast("🛗 " + (d.name || "展望フロア") + "（地上 " + Math.round(d.y) + "m）。内がわのエレベーターの前で E（下のボタン）で地上へ");
  }
  function openApp(href, app) {
    saveState({ x: player.x, z: player.z, yaw: player.yaw });
    const ov = $("fade"); ov.classList.add("on"); $("fadeT").textContent = (app ? (app.full || app.name) : "アプリ") + " へ移動しています…";
    setTimeout(() => { location.href = ROOT + href; }, 450);
  }

  /* ══════════════ ミニゲーム ══════════════ */
  let game = null, gameKind = null, beforeGame = null;
  function startGame(kind) {
    if (game) return;
    if (player.sit) standUp();
    beforeGame = { x: player.x, z: player.z, yaw: player.yaw, dist: cam.dist, pitch: cam.pitch };
    gameKind = kind; world.raceActive = kind === "kart";
    document.body.classList.add("ingame");
    closeOverlays();
    game = XGames.start(kind, ctxGame);
  }
  function exitGame() {
    if (!game) return;
    game.dispose(); game = null; document.body.classList.remove("ingame"); world.raceActive = false;
    if (beforeGame) { player.x = beforeGame.x; player.z = beforeGame.z; player.yaw = beforeGame.yaw; cam.dist = beforeGame.dist; cam.pitch = beforeGame.pitch; cam.yaw = player.yaw + Math.PI; }
    player.kartY = 0;
    toast("ゲームを終わりました");
  }
  const ctxGame = { scene, world, player, cam, camera, MOBILE, toast: (t) => toast(t), exit: () => exitGame(), restart: () => { const k = gameKind; exitGame(); setTimeout(() => startGame(k), 60); },
    person: (spec) => XPeople.make(spec, { shadow: !MOBILE }) };

  /* ══════════════ 上空から見る（★ 2026-09-28d） ══════════════ */
  const sky = { on: false, yaw: 0, pitch: 0.62, dist: 1900, target: new T.Vector3(0, 0, 200), k: 1 };
  function toggleSky() {
    if (game || theater || riding) return;
    sky.on = !sky.on; sky.k = 0;
    document.body.classList.toggle("skyview", sky.on);
    if (sky.on) { sky.yaw = 0; sky.pitch = 0.62; sky.dist = MOBILE ? 2300 : 1900; sky.target.set(0, 0, 200); world.viewR = 1e5; world.viewD = MOBILE ? 300 : 900; if (world.crowdNear) world.crowdNear.value = 0; closeOverlays(); toast("上空から見ています（もどるは右上のボタン・Esc）"); }
    else { world.viewR = VIEWR * AQ.r; world.viewD = VIEWD; if (world.crowdNear) world.crowdNear.value = 30; }
  }
  $("skyBtn").onclick = toggleSky; $("skyBack").onclick = toggleSky;

  /* ══════════════ 昼・夕方・夜（★ 2026-09-28d） ══════════════ */
  const TIME_ICON = { day: "☀️", dusk: "🌇", night: "🌙" }, TIME_NAME = { day: "昼", dusk: "夕方", night: "夜" };
  function setTimeIcon(m) { $("timeBtn").innerHTML = '<svg class="ic"><use href="#i-' + ({ day: "sun", dusk: "dusk", night: "moon" }[m] || "sun") + '"/></svg><small>' + (TIME_NAME[m] || "昼") + '</small>'; showKeyBadges(); }
  /* ★★ 2026-09-30b 昼夜は時間で自動にくり返す（昼 7 分 → 夕方 1 分半 → 夜 5 分 → 昼 …・ご指定）。☀️ ボタン・T で変えると、そこから数えなおす */
  const TIME_LEN = { day: 420, dusk: 90, night: 300 };
  let timeLeft = TIME_LEN[XFX.mode] || 420;
  function tickTime(dt) {
    if (game || theater) return;
    timeLeft -= dt; if (timeLeft > 0) return;
    const m = XFX.cycle(); setTimeIcon(m); timeLeft = TIME_LEN[m] || 300;
    showNotice({ day: "☀️ 朝になりました", dusk: "🌇 夕方になりました（街の明かりがつきはじめます）", night: "🌙 夜になりました（噴水の光のショー・花火・窓の明かり）" }[m] || "", "info");
  }
  function cycleTime() { const m = XFX.cycle(); setTimeIcon(m); timeLeft = TIME_LEN[m] || 300; toast(TIME_NAME[m] + "にしました" + (m === "night" ? "（噴水の光のショー・花火・窓の明かり）" : "") + "　※ 時間がたつと自動で変わります"); }
  $("timeBtn").onclick = cycleTime; setTimeIcon(XFX.mode || "day");

  /* ══════════════ 大画面で動画（YouTube の公式の埋め込みプレーヤー）★ 2026-09-28d ／ ★★ 2026-09-29 ══════════════
     ・YouTube の公式の API（iframe_api）で「再生中か」を知る → ライブアリーナの光は再生中だけ・パークの音楽は小さく
     ・動画は 3D の画面の4すみに合わせて変形して重ねる（斜めから見ても画面にぴったり）。アリーナでは「歩いて見る」ができる
     ・YouTube の音はブラウザの決まりで読めないので、光はテンポ（BPM）に合わせる（タップで合わせられる） */
  let theater = null, ytPlayer = null, ytApi = null;
  const HOLE_MAT = new T.MeshBasicMaterial({ color: 0x000000, blending: T.CustomBlending, blendEquation: T.AddEquation, blendSrc: T.ZeroFactor, blendDst: T.ZeroFactor, blendSrcAlpha: T.ZeroFactor, blendDstAlpha: T.ZeroFactor, toneMapped: false, fog: false });
  const VID_KEY = "xeva_park_videos";
  function vidList() { try { return JSON.parse(localStorage.getItem(VID_KEY) || "[]") || []; } catch (e) { return []; } }
  function vidSave(list) { try { localStorage.setItem(VID_KEY, JSON.stringify(list.slice(0, 20))); } catch (e) {} }
  function ytId(s) {
    s = String(s || "").trim(); if (/^[\w-]{11}$/.test(s)) return s;
    const m = s.match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([\w-]{11})/); return m ? m[1] : null;
  }
  function loadYT() {
    if (ytApi) return ytApi;
    ytApi = new Promise((res, rej) => {
      if (window.YT && YT.Player) return res();
      const prev = window.onYouTubeIframeAPIReady; window.onYouTubeIframeAPIReady = () => { if (prev) try { prev(); } catch (e) {} res(); };
      const sc = document.createElement("script"); sc.src = "https://www.youtube.com/iframe_api"; sc.onerror = () => rej(new Error("yt")); document.head.appendChild(sc);
      setTimeout(() => rej(new Error("timeout")), 7000);
    });
    ytApi.catch(() => { ytApi = null; });
    return ytApi;
  }
  function renderVidList() {
    const L = vidList();
    $("vidList").innerHTML = L.length ? L.map((v, i) => '<button data-i="' + i + '">▶ ' + esc(v.title || v.id) + "</button>").join("") : "";
    $("vidList").querySelectorAll("button").forEach((b) => b.onclick = () => playVideo(L[+b.dataset.i].id));
  }
  function openVideo(key) {
    const sp = world.videoSpots && world.videoSpots[key]; if (!sp) return;
    if (player.sit) standUp();
    theater = { sp, key, playing: false, shown: false, free: false };
    document.body.classList.add("theater"); document.body.classList.toggle("vid-arena", !!sp.arena); $("vid").classList.add("on"); $("vidFrame").innerHTML = ""; $("vidFrame").style.display = "none";
    $("bpmV").textContent = XShows.Arena.bpm + " BPM";
    renderVidList();
  }
  function noCC(p) { try { p.unloadModule("captions"); } catch (e) {} try { p.unloadModule("cc"); } catch (e) {} try { p.setOption("captions", "track", {}); } catch (e) {} }
  function playVideo(id) {
    if (!theater || !id) return;
    const L = vidList().filter((v) => v.id !== id); L.unshift({ id, title: id }); vidSave(L); renderVidList();
    if (ytPlayer) { try { ytPlayer.destroy(); } catch (e) {} ytPlayer = null; }
    $("vidFrame").innerHTML = '<div id="ytp"></div>'; $("vidFrame").style.display = "block"; theater.shown = true; theater.playing = false;
    const plain = () => { $("vidFrame").innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&playsinline=1&rel=0&modestbranding=1&cc_load_policy=0&iv_load_policy=3" title="YouTube" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>'; if (theater) theater.playing = true; };
    loadYT().then(() => {
      if (!theater) return;
      ytPlayer = new YT.Player("ytp", { width: 1280, height: 720, videoId: id, host: "https://www.youtube-nocookie.com",
        playerVars: { autoplay: 1, playsinline: 1, rel: 0, modestbranding: 1, cc_load_policy: 0, iv_load_policy: 3 },
        /* ★★ 2026-09-30b 字幕（自動字幕）を出さない：読みこみ・再生のたびに字幕の部品を外す */
        events: { onReady: (e) => noCC(e.target), onStateChange: (e) => { if (theater) theater.playing = e.data === 1 || e.data === 3; if (e.data === 1) { XShows.Arena.clock = 0; noCC(e.target); } }, onError: () => toast("この動画は埋め込みで再生できないかもしれません") } });
    }).catch(plain);
    const scr = theater.sp.scr; scr.draw = (g, W, H) => { g.fillStyle = "#000"; g.fillRect(0, 0, W, H); g.fillStyle = "#fff"; g.font = "900 60px sans-serif"; g.textAlign = "center"; g.fillText("▶ NOW PLAYING", W / 2, H / 2); g.textAlign = "left"; };
    /* ★ 2026-09-29d 画面は「窓」（色も透明度も 0 を書く）→ うしろの動画が見える。画面より前の人・キャラ・光は動画の上に描かれる（前は動画が一番上にかぶさって人をかくしていた） */
    if (!theater.mat0) { theater.mat0 = scr.mesh.material; scr.mesh.material = HOLE_MAT; }
    $("vid").classList.add("playing");
    fetch("https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=" + id).then((r) => r.ok ? r.json() : null).then((j) => { if (!j) return; const L2 = vidList(); const it = L2.find((v) => v.id === id); if (it) { it.title = j.title; vidSave(L2); renderVidList(); } }).catch(() => {});
  }
  function closeVideo() {
    if (!theater) return;
    if (ytPlayer) { try { ytPlayer.destroy(); } catch (e) {} ytPlayer = null; }
    $("vidFrame").innerHTML = ""; $("vid").classList.remove("on"); document.body.classList.remove("theater", "vid-free", "vid-arena");
    const scr = theater.sp.scr; if (scr.draw0) scr.draw = scr.draw0;
    if (theater.mat0) { scr.mesh.material = theater.mat0; theater.mat0 = null; }
    $("vid").classList.remove("playing");
    theater = null;
  }
  function freeVideo(on) { if (!theater) return; theater.free = on; document.body.classList.toggle("vid-free", on); document.body.classList.toggle("theater", !on); toast(on ? "歩きながら見られます（動画は画面にうつったまま）" : "正面から見ます"); }
  $("vidPlay").onclick = () => { const id = ytId($("vidUrl").value); if (!id) { toast("YouTube の動画のURLを貼ってください"); return; } playVideo(id); };
  $("vidClose").onclick = closeVideo;
  $("vidFree").onclick = () => freeVideo(!(theater && theater.free));
  $("bpmTap").onclick = () => { $("bpmV").textContent = XShows.Arena.tapBeat() + " BPM"; };
  $("bpmDn").onclick = () => { XShows.Arena.bpm = Math.max(60, XShows.Arena.bpm - 2); $("bpmV").textContent = XShows.Arena.bpm + " BPM"; };
  $("bpmUp").onclick = () => { XShows.Arena.bpm = Math.min(220, XShows.Arena.bpm + 2); $("bpmV").textContent = XShows.Arena.bpm + " BPM"; };
  /* 3D の画面の4すみ → 動画の枠を射影変換（CSS の matrix3d）で重ねる */
  const _v3 = new T.Vector3();
  function quadCSS(w, h, q) {
    const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
    const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3, dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
    let a, b, c, d, e, f, g = 0, hh = 0;
    if (Math.abs(dx3) < 1e-6 && Math.abs(dy3) < 1e-6) { a = x1 - x0; b = x3 - x0; c = x0; d = y1 - y0; e = y3 - y0; f = y0; }
    else { const den = dx1 * dy2 - dx2 * dy1; g = (dx3 * dy2 - dx2 * dy3) / den; hh = (dx1 * dy3 - dx3 * dy1) / den; a = x1 - x0 + g * x1; b = x3 - x0 + hh * x3; c = x0; d = y1 - y0 + g * y1; e = y3 - y0 + hh * y3; f = y0; }
    return "matrix3d(" + [a / w, d / w, 0, g / w, b / h, e / h, 0, hh / h, 0, 0, 1, 0, c, f, 0, 1].map((v) => +v.toFixed(8)).join(",") + ")";
  }
  function placeVideo() {
    if (!theater || !theater.shown) return;
    const m = theater.sp.scr.mesh, g = m.geometry; if (!g.boundingBox) g.computeBoundingBox();
    const bb = g.boundingBox, q = []; let behind = false;
    [[bb.min.x, bb.max.y], [bb.max.x, bb.max.y], [bb.max.x, bb.min.y], [bb.min.x, bb.min.y]].forEach(([a, b]) => { _v3.set(a, b, 0).applyMatrix4(m.matrixWorld); const vz = _v3.clone().applyMatrix4(camera.matrixWorldInverse).z; if (vz > -0.2) behind = true; _v3.project(camera); q.push([(_v3.x * 0.5 + 0.5) * innerWidth, (-_v3.y * 0.5 + 0.5) * innerHeight]); });
    const f = $("vidFrame").style;
    if (behind) { f.visibility = "hidden"; return; }
    f.visibility = "visible"; f.left = "0px"; f.top = "0px"; f.width = "1280px"; f.height = "720px"; f.transformOrigin = "0 0"; f.transform = quadCSS(1280, 720, q);
  }

  /* ══════════════ モノレール・路面電車（★★ 2026-09-29c park_transit.js）══════════════
     電車の位置を決める → そのあとカメラ（同じフレーム）。前は位置を2か所で書きかえ、カメラは1フレーム前の位置＝カクカクの真因。
     riding ＝ XTransit.cur（乗っている間）。見回し：ドラッグ・矢印・スティック／V：外から／E：早送り */
  let riding = null;
  /* ══════════════ ★★ 2026-09-29 アトラクションに乗る・XEVA HOVER ══════════════ */
  let rideSkip = false;
  const rideCtx = { world, camera, player, t: 0 };
  function startParkRide(id) {
    if (player.sit) standUp();
    if (XRides.HOVER.on) toggleHover();
    if (!XRides.RIDE.start(id, rideCtx)) return;
    document.body.classList.add("riding2");
    const R = XRides.RIDE.cur.R;
    toast("🎢 " + R.name + " — " + (MOBILE ? "下のボタンで" : "E で") + (R.kind === "float" || R.kind === "loop" ? "おりる" : "早送り") + "・V で視点");
  }
  function updateParkRide(dt) {
    rideCtx.t = tAll;
    const res = XRides.RIDE.update(dt, rideCtx, rideSkip); rideSkip = false;
    if (res && res.end) {
      document.body.classList.remove("riding2"); camera.up.set(0, 1, 0);
      if (player.av) { player.av.root.visible = true; player.av.root.quaternion.identity(); player.av.resetSpring(); }
      cam.yaw = player.yaw + Math.PI; toast(res.msg);
      return false;
    }
    return !!res;
  }
  function toggleHover() {
    const H = XRides.HOVER;
    if (H.on) { H.stop(rideCtx); document.body.classList.remove("hovering"); camera.fov = innerWidth < innerHeight ? 66 : 58; camera.updateProjectionMatrix(); toast("XEVA HOVER をおりました"); return; }
    if (player.sit) standUp();
    H.start(rideCtx); document.body.classList.add("hovering"); cam.yaw = player.yaw + Math.PI;
    toast("🛵 XEVA HOVER！ " + (MOBILE ? "スティックで走る・下のボタンでおりる" : "W で加速・A/D で曲がる・Shift でブースト・E でおりる"));
  }

  /* ══════════════ 画面の UI ══════════════ */
  function closeOverlays() { XParkUI.close(); document.querySelectorAll(".ov.on").forEach((o) => o.classList.remove("on")); }
  document.querySelectorAll(".ov").forEach((o) => o.addEventListener("click", (e) => { if (e.target === o || e.target.closest(".x")) o.classList.remove("on"); }));
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
  function openSlides(kind) {
    let list = [], title = "";
    if (kind === "keynote") {
      title = "基調講演 — " + ((D.release && D.release.title) || "");
      list = world.keynote.slides.map((s) => ({ h: s.kind === "update" ? s.t1 : (s.t2 || s.t1), sub: s.kind === "update" ? (s.date || "") : s.t1, body: s.kind === "update" ? s.t2 : (s.sub || ""), img: s.img, href: s.href }));
    } else { title = kind; list = trackOf(kind).list.map((s) => ({ h: s.title, sub: s.date, body: s.text, img: s.img })); }
    $("slT").textContent = title;
    $("slList").innerHTML = list.map((s) => '<div class="sl">' + (s.img ? '<img src="' + esc(ROOT + s.img) + '" alt="">' : "") +
      '<div><small>' + esc(s.sub || "") + '</small><b>' + esc(s.h || "") + '</b><p>' + esc(s.body || "").replace(/／/g, "<br>・").replace(/\n/g, "<br>") + "</p>" +
      (s.href ? '<button class="go" data-h="' + esc(s.href) + '">ひらく ›</button>' : "") + "</div></div>").join("");
    $("slList").querySelectorAll(".go").forEach((b) => b.onclick = () => openApp(b.dataset.h));
    $("slides").classList.add("on"); $("slList").scrollTop = 0;
  }
  function trackOf(code) {
    const reA = /MagiBurst|MagiBattle|ガチャ|FES|フェス|祭|Diamond|Boccia|Chain|Arena|Dominion|Rail|Shift|Jackpot|Lotto|Manor|Empire|Craft|キャラ|クエスト/i;
    const reB = /MagiLex|XEVYNAR|学習|Focus|単語|物理|化学|数学|古文|問題/i;
    const out = { list: [] };
    (D.news || []).forEach((n) => { const k = reB.test(n.title) ? "TRACK B" : reA.test(n.title) ? "TRACK A" : "TRACK C"; if (k === code) out.list.push({ title: n.title, text: n.text, date: n.date }); });
    if (code === "TRACK A") (D.events || []).slice(0, 8).forEach((e) => out.list.push({ title: e.t1, text: e.t2, date: e.from || "", img: e.img }));
    out.list = out.list.slice(0, 18);
    return out;
  }
  function openMenu() {
    $("slT").textContent = "XEVA CAFÉ — メニュー";
    $("slList").innerHTML = [["マジカル・ラテ", "480 XEVA", "ふんわりミルクに星のラテアート"], ["バースト・エスプレッソ", "420 XEVA", "キレのある深煎り。集中したい講演の前に"],
      ["星煌フラペチーノ", "620 XEVA", "きらきらのゼリー入り。会場限定"], ["ワールド・パンケーキ", "780 XEVA", "会場のロゴの焼き印つき"], ["XEVA クロワッサン", "360 XEVA", "朝いちばんの焼きたて"]]
      .map(([n, p, d]) => '<div class="sl"><div><small>' + p + "</small><b>" + n + "</b><p>" + d + "</p></div></div>").join("") + '<p class="note">※ 会場のカフェは見るだけです（XEVA は減りません）。</p>';
    $("slides").classList.add("on");
  }
  function places() { return world.places || []; }
  /* ★★ 2026-09-29 地図は park_ui.js の見やすい地図（番号の丸・大きな文字・押してワープ・拡大縮小） */
  function toggleMap() {
    if (XParkUI.busy()) { if ($("pui").classList.contains("map")) XParkUI.close(); return; }
    if (game || theater || riding) return;
    if (sky.on) toggleSky();
    XParkUI.map();
  }
  $("mapBtn").onclick = toggleMap; $("mini").onclick = toggleMap;
  $("actBtn").onclick = () => { if (riding) XTransit.skip(); else if (XTransit.lifting) return; else if (XRides.RIDE.cur) rideSkip = true; else if (XRides.HOVER.on) toggleHover(); else doInteract(); };
  $("hoverBtn").onclick = () => { if (!game && !theater && !riding && !XRides.RIDE.cur && !sky.on) toggleHover(); };
  $("exitBtn").onclick = () => { saveState({ x: player.x, z: player.z, yaw: player.yaw }); location.href = ROOT + "index.html"; };
  /* ★ 2026-09-29b 音楽：起動したときはオフ。オンにすると「曲が流れます」とお知らせしてから鳴らす */
  function setMusic(on) {
    const AU = XShows.AU; AU.setOn(on); $("musicBtn").classList.toggle("off", !on);
    if (on) { const k = AU.now() || AU.parkKey(); showNotice("♪ 音楽をオンにしました — 「" + AU.NAMES[k] + "」が流れます", "music"); }
    else toast("パークの音楽：オフ");
    nowPlaying(true);
  }
  function nowPlaying(force) {
    const AU = XShows.AU, k0 = AU.now(), k = k0 === "parade" || k0 === "night" || k0 === "chase" ? null : k0, el = $("nowPlay"); if (!el) return;          /* ★ ショーの間は曲名を出さない */
    if (k === nowPlaying.k && !force) return; nowPlaying.k = k;
    el.textContent = k ? "♪ " + AU.NAMES[k] : ""; el.classList.toggle("on", !!k);
  }
  XShows.AU.onTrack = (k) => { if (XShows.AU.on) showNotice("♪ つぎの曲 — 「" + XShows.AU.NAMES[k] + "」", "music"); };
  $("musicBtn").onclick = () => setMusic(!XShows.AU.on);
  /* ★ 2026-09-29d ワールドを開くたびに音楽はオフから（戻るボタンでページがそのまま復元されたときも） */
  addEventListener("pageshow", (e) => { if (e.persisted && XShows.AU.on) { XShows.AU.setOn(false); $("musicBtn").classList.add("off"); nowPlaying(true); } });
  addEventListener("pagehide", () => { if (XShows.AU.on) XShows.AU.setOn(false); });
  /* ★ 2026-09-29d ショーのあとに「提供 NGX」 */
  function showSponsor(kind) {
    const el = $("sponsor"); if (!el) return;
    el.querySelector("small").textContent = { parade: "デイタイムパレード", night: "XEVARION NIGHT", harbor: "水上パレード" }[kind] || "ショー";
    el.classList.remove("on"); void el.offsetWidth; el.classList.add("on"); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove("on"), 6500);
  }
  $("musicBtn").classList.toggle("off", !XShows.AU.on);
  $("runBtn").onclick = () => runKey("run");
  function toggleRun() { player.runLock = !player.runLock; $("runBtn").classList.toggle("on", player.runLock); toast(player.runLock ? "ダッシュ：オン" : "ダッシュ：オフ"); };
  function toast(t) { const el = $("toast"); el.textContent = t; el.classList.add("on"); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove("on"), 2400); }

  /* 地図（島の形・エリア・道・サーキット・モノレール） */
  /* 地図の下絵（島・道・エリア・川）は1回だけ描いておく（毎フレーム道を全部描くと重い） */
  let mapBase = null; const MB = { x0: -900, z0: -680, x1: 900, z1: 1060, S: 2048 };
  function baseMap() {
    if (mapBase) return mapBase;
    const c = document.createElement("canvas"); c.width = c.height = MB.S; const g = c.getContext("2d"), s = MB.S / Math.max(MB.x1 - MB.x0, MB.z1 - MB.z0);
    const P = (x, z) => [(x - MB.x0) * s, (z - MB.z0) * s];
    g.fillStyle = "#1e78b4"; g.fillRect(0, 0, MB.S, MB.S);
    g.fillStyle = "#58a84e"; g.beginPath(); for (let i = 0; i <= 240; i++) { const [px, pz] = XPark.islandPt(i / 240 * Math.PI * 2, 1); const [a1, b1] = P(px, pz); if (i) g.lineTo(a1, b1); else g.moveTo(a1, b1); } g.fill();
    XPark.AREAS.forEach((a) => { const [p0, q0] = P(a.x0, a.z0), [p1, q1] = P(a.x1, a.z1); g.fillStyle = a.c + "55"; g.fillRect(p0, q0, p1 - p0, q1 - q0); });
    g.strokeStyle = "rgba(245,236,210,.95)"; g.lineCap = "round"; g.lineJoin = "round";
    world.walkPaths.forEach((p) => { g.lineWidth = Math.max(2, p.w * s); g.beginPath(); p.pts.forEach(([x, z], i) => { const [a, b] = P(x, z); if (i) g.lineTo(a, b); else g.moveTo(a, b); }); g.stroke(); });
    const cols = { lobby: "#6c7fa8", cafe: "#8a6a4a", store: "#a0607e", keynote: "#2b3f7a", corridor: "#5a6070", track: "#6b4f8a", expo: "#4f7a7a" };
    world.zones.forEach((z) => { if (!cols[z.light]) return; const [a, b] = P(z.x0, z.z0), [c2, d] = P(z.x1, z.z1); g.fillStyle = cols[z.light]; g.fillRect(a, b, c2 - a, d - b); });
    if (world.circuit) { g.strokeStyle = "#3a3d45"; g.lineWidth = 14 * s; g.beginPath(); world.circuit.pts.forEach((p, i) => { const [a, b] = P(p.x, p.z); if (i) g.lineTo(a, b); else g.moveTo(a, b); }); g.closePath(); g.stroke(); }
    (world.rivers || []).forEach((rv) => { g.strokeStyle = "#3ac0e8"; g.lineWidth = Math.max(2, rv.w * s); g.beginPath(); rv.pts.forEach(([x, z], i) => { const [a, b] = P(x, z); if (i) g.lineTo(a, b); else g.moveTo(a, b); }); g.stroke(); });
    /* ★★ 2026-09-29c モノレール（青）・路面電車（赤）の線と駅 */
    (window.XTransit ? XTransit.lines : []).forEach((Ln) => { const A = Ln.A, q = { x: 0, y: 0, z: 0 }, at = (sv) => { const k = (((sv % A.L) + A.L) % A.L) / A.ds, i = Math.min(A.n - 1, Math.floor(k)), f = k - i; q.x = A.P[i * 3] + (A.P[i * 3 + 3] - A.P[i * 3]) * f; q.z = A.P[i * 3 + 2] + (A.P[i * 3 + 5] - A.P[i * 3 + 2]) * f; return q; };
      g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = Ln.color; g.lineWidth = Math.max(2.5, (Ln.id === "mono" ? 5 : 3.5) * s * 2.2); g.beginPath(); for (let sv = 0; sv <= A.L; sv += 6) { const p = at(sv), [a, b] = P(p.x, p.z); if (sv) g.lineTo(a, b); else g.moveTo(a, b); } g.closePath(); g.stroke();
      g.strokeStyle = "#fff"; g.lineWidth = Math.max(1, g.lineWidth * 0.3); g.stroke();
      Ln.stops.forEach((st) => { const p = at(st.sC), [a, b] = P(p.x, p.z), r = Math.max(3, 6 * s * 2.2); g.fillStyle = "#fff"; g.strokeStyle = Ln.color; g.lineWidth = Math.max(1.5, r * 0.4); g.beginPath(); g.arc(a, b, r, 0, 7); g.fill(); g.stroke(); }); });
    return (mapBase = c);
  }
  function drawMap(c, big) {
    const g = c.getContext("2d"), W = c.width, H = c.height;
    const x0 = big ? -900 : player.x - 110, x1 = big ? 900 : player.x + 110, z0 = big ? -680 : player.z - 88, z1 = big ? 1060 : player.z + 88, s = Math.min(W / (x1 - x0), H / (z1 - z0));
    const P = (x, z) => [(x - x0) * s + (W - (x1 - x0) * s) / 2, (z - z0) * s + (H - (z1 - z0) * s) / 2];
    g.clearRect(0, 0, W, H); g.fillStyle = "#1e78b4"; g.fillRect(0, 0, W, H);
    { const bm = baseMap(), bs = MB.S / Math.max(MB.x1 - MB.x0, MB.z1 - MB.z0), [dx0, dz0] = P(MB.x0, MB.z0); g.imageSmoothingEnabled = true; g.drawImage(bm, dx0, dz0, MB.S / bs * s, MB.S / bs * s); }
    if (big) { g.fillStyle = "#fff"; g.font = "900 " + Math.round(9 * W / 380) + "px sans-serif"; g.textAlign = "center"; g.shadowColor = "rgba(0,0,0,.6)"; g.shadowBlur = 4; XPark.AREAS.forEach((a) => { if (a.id === "marketE") return; const [px, pz] = P(a.cx, a.cz); g.fillText(a.n + " " + a.name.replace(/^XEVARION /, "").replace(" DISTRICT", ""), px, pz); }); const [hx, hz] = P(0, -14); g.fillText("11 HALL", hx, hz); g.shadowBlur = 0; }
    npcs.forEach((n) => { const [a, b] = P(n.x, n.z); g.fillStyle = "#ffd24a"; g.beginPath(); g.arc(a, b, big ? 3.5 : 2.5, 0, 7); g.fill(); });
    const [px, pz] = P(player.x, player.z);
    g.save(); g.translate(px, pz); g.rotate(-player.yaw + Math.PI); g.fillStyle = "#ff5f8f"; g.strokeStyle = "#fff"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, -8); g.lineTo(6, 7); g.lineTo(-6, 7); g.closePath(); g.fill(); g.stroke(); g.restore();
  }

  /* ══════════════ ★★ 2026-09-29b 一人称視点・キーの割り当て（右のボタン・設定で変えられる） ══════════════ */
  const SENS = { v: 1 }; try { const v = parseFloat(localStorage.getItem("xeva_park_sens")); if (v > 0.2 && v < 3) SENS.v = v; } catch (e) {}
  function toggleFP(v) {
    cam.fp = v != null ? !!v : !cam.fp; $("fpBtn").classList.toggle("on", cam.fp);
    if (cam.fp) { cam.pitch = Math.max(-0.5, Math.min(0.4, cam.pitch * 0.4)); toast("👁 一人称視点（" + keyName(KEYS.fp) + " でもどる）"); }
    else { cam.pitch = 0.22; if (player.av) player.av.root.visible = true; toast("三人称視点"); }
  }
  const KEY_DEF = { map: "KeyM", sky: "KeyV", bag: "KeyB", time: "KeyT", run: "KeyR", music: "KeyN", hover: "KeyC", fp: "KeyF", settings: "KeyO" };
  const KEY_LABEL = { map: "地図・ワープ", sky: "上空から見る", bag: "思い出バッグ", time: "昼・夕方・夜", run: "ダッシュ固定", music: "音楽オン・オフ", hover: "XEVA HOVER", fp: "一人称視点", settings: "設定" };
  const KEY_BTN = { map: "mapBtn", sky: "skyBtn", bag: "bagBtn", time: "timeBtn", run: "runBtn", music: "musicBtn", hover: "hoverBtn", fp: "fpBtn", settings: "setBtn" };
  const KEY_RESERVED = ["KeyW", "KeyA", "KeyS", "KeyD", "KeyE", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "Enter", "Escape", "ShiftLeft", "ShiftRight", "Tab", "MetaLeft", "MetaRight", "AltLeft", "AltRight", "ControlLeft", "ControlRight"];
  const KEYS = Object.assign({}, KEY_DEF);
  try { const sv = JSON.parse(localStorage.getItem("xeva_park_keys") || "null"); if (sv && typeof sv === "object") for (const a in KEY_DEF) if (typeof sv[a] === "string") KEYS[a] = sv[a]; } catch (e) {}
  const KEY_SYM = { Comma: ",", Period: ".", Slash: "/", Semicolon: ";", Quote: "'", BracketLeft: "[", BracketRight: "]", Backquote: "`", Minus: "-", Equal: "=", Backslash: "＼", IntlYen: "¥", IntlRo: "ろ", Space: "Space" };
  function keyName(code) { if (!code) return "—"; if (KEY_SYM[code]) return KEY_SYM[code]; return code.replace(/^Key/, "").replace(/^Digit/, "").replace(/^Numpad/, "Num"); }
  function showKeyBadges() { if (MOBILE || !keysReady) return; for (const a in KEY_BTN) { const b = $(KEY_BTN[a]); if (!b) continue; let k = b.querySelector("kbd"); if (!k) { k = document.createElement("kbd"); b.appendChild(k); } k.textContent = keyName(KEYS[a]); b.title = KEY_LABEL[a] + "（" + keyName(KEYS[a]) + "）"; } }
  function saveKeys() { try { localStorage.setItem("xeva_park_keys", JSON.stringify(KEYS)); } catch (e) {} showKeyBadges(); }
  function runKey(a) {
    if (a === "map") { if (!game) toggleMap(); }
    else if (a === "sky") { if (XRides.RIDE.cur) { const v = XRides.RIDE.toggleView(); toast(v ? "うしろからの視点" : "前の席の視点"); } else if (riding) XTransit.toggleView(); else if (!game && !theater) toggleSky(); }
    else if (a === "bag") { if (!game && !sky.on && !theater) XParkUI.bag(); }
    else if (a === "time") cycleTime();
    else if (a === "run") toggleRun();
    else if (a === "music") setMusic(!XShows.AU.on);
    else if (a === "hover") { if (!game && !theater && !riding && !XRides.RIDE.cur) { if (sky.on) toggleSky(); toggleHover(); } }
    else if (a === "fp") { if (!game && !riding && !XRides.RIDE.cur) toggleFP(); }
    else if (a === "settings") openSettings();
  }
  function openSettings() {
    XParkUI.settings({
      list: Object.keys(KEY_DEF).map((a) => [a, KEY_LABEL[a]]), get: (a) => KEYS[a], name: keyName, reserved: KEY_RESERVED,
      set: (a, code) => { for (const b in KEYS) if (b !== a && KEYS[b] === code) KEYS[b] = KEYS[a]; KEYS[a] = code; saveKeys(); },
      reset: () => { Object.assign(KEYS, KEY_DEF); saveKeys(); },
      sens: () => SENS.v, setSens: (v) => { SENS.v = v; try { localStorage.setItem("xeva_park_sens", String(v)); } catch (e) {} },
      fp: () => !!cam.fp, setFP: (v) => toggleFP(v),
      vol: () => XShows.AU.master, setVol: (v) => XShows.AU.setVolume(v), music: () => XShows.AU.on, setMusicOn: (v) => setMusic(v),
      quality: () => ({ level: XGFX.user || XGFX.level, auto: XGFX.auto, levels: XGFX.ORDER }), setQuality: (lv, auto) => XGFX.setUser(lv, auto)
    });
  }
  var keysReady = true;     /* var：これより前（昼夜のアイコンを作るとき）に呼ばれても何もしない */
  for (const a in KEY_BTN) { const b = $(KEY_BTN[a]); if (b && a !== "music" && a !== "run" && a !== "time" && a !== "map" && a !== "sky" && a !== "bag" && a !== "hover") b.onclick = () => runKey(a); }
  showKeyBadges();

  /* ══════════════ 建物の中の画面・地図・記念写真（park_ui.js） ══════════════ */
  let photoCam = null, snapCb = null; const phT = new T.Vector3();
  function photoCamUpdate(dt) {
    photoCam.t += dt; const fy = Math.sin(player.yaw), fz = Math.cos(player.yaw);
    phT.set(player.x, player.y + 1.3, player.z); camPos.set(player.x + fy * 2.6, player.y + 1.45, player.z + fz * 2.6);
    const IQ = world.interiorAt ? world.interiorAt(player.x, player.z, player.y) : null; if (IQ) { const kk = world.camInside(IQ, phT, camPos); if (kk < 1) camPos.lerpVectors(phT, camPos, Math.max(0.35, kk)); }
    camera.position.lerp(camPos, Math.min(1, dt * 5)); camLook.lerp(phT, Math.min(1, dt * 6)); camera.lookAt(camLook);
  }
  XParkUI.init({ world, player, cam, camera, renderer, MOBILE, mapBounds: MB, toast: (t) => toast(t), avatar: () => player.av, baseMap: () => baseMap(),
    warp: (x, z, yaw, label) => { if (XRides.HOVER.on) toggleHover(); if (player.sit) standUp(); player.deck = null; player.x = x; player.z = z; player.yaw = yaw || 0; cam.yaw = (yaw || 0) + Math.PI; if (player.av) player.av.resetSpring(); for (const c of crowd) if (!c.fixed) c.x = 1e5; toast((label || "") + " へ移動しました"); },
    skyExit: () => { if (sky.on) toggleSky(); },
    openApp: (href, app) => openApp(href, app),
    getTime: () => XFX.mode, setTime: (m) => { XFX.set(m); setTimeIcon(m); timeLeft = TIME_LEN[m] || 300; toast(TIME_NAME[m] + "にしました"); },
    /* 写真：部屋の中なら、いちばん広く空いている向きを向いてから前にカメラ */
    photo: (on, pose) => {
      if (!on) { photoCam = null; return; }
      if (player.sit) standUp();
      const IQ = world.interiorAt ? world.interiorAt(player.x, player.z, player.y) : null;
      if (IQ) { let best = player.yaw, bk = -1; phT.set(player.x, player.y + 1.3, player.z); for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; tmp.set(player.x + Math.sin(a) * 2.6, player.y + 1.45, player.z + Math.cos(a) * 2.6); const kk = world.camInside(IQ, phT, tmp); if (kk > bk + 0.02) { bk = kk; best = a; } } player.yaw = best; }
      photoCam = { pose, t: 0 };
      if (player.av) { if (pose === "wave") player.av.play("wave", 3.2); if (pose !== "plain") player.av.setFace("happy", 4500); }
    },
    snap: (cb) => { snapCb = cb; } });
  /* ★★ 2026-09-30 建物の中・階・展望エレベーター（park_rooms.js） */
  XRooms.init(world, {
    place: (x, z, y, yaw) => { if (player.sit) standUp(); player.deck = null; player.x = x; player.z = z; player.y = y; player.yaw = yaw; cam.yaw = yaw + Math.PI; if (player.av) { player.av.root.position.set(x, y, z); player.av.resetSpring(); } for (const c of crowd) if (!c.fixed) c.x = 1e5; },
    toast: (t) => toast(t),
    hideAvatar: (h) => { if (player.av) player.av.root.visible = !h; },
    deck: (d) => enterDeck(d)
  });
  XTransit.init({ world, player, cam, camera, toast: (t) => toast(t),
    teleport: (x, z, y, yaw, msg) => { if (player.sit) standUp(); player.deck = null; player.x = x; player.z = z; player.y = y; player.yaw = yaw; cam.yaw = yaw + Math.PI; if (player.av) player.av.resetSpring(); if (msg) toast("🛗 " + msg); },
    onBoard: () => { if (player.sit) standUp(); if (XRides.HOVER.on) toggleHover(); if (cam.fp) toggleFP(); },
    onArrive: (x, z, y, yaw, st) => { player.deck = null; player.x = x; player.z = z; player.y = y; player.yaw = yaw; cam.yaw = yaw + Math.PI; cam.pitch = 0.22; camera.fov = innerWidth < innerHeight ? 66 : 58; camera.updateProjectionMatrix(); if (player.av) { player.av.root.visible = true; player.av.resetSpring(); } for (const c of crowd) if (!c.fixed) c.x = 1e5; toast("🚉 " + st.no + " " + st.name + " に着きました"); } });
  $("bagBtn").onclick = () => { if (!game && !sky.on && !theater) XParkUI.bag(); };

  /* ══════════════ ループ ══════════════ */
  function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < h ? 66 : 58; camera.updateProjectionMatrix(); XFX.setSize(w, h, renderer.getPixelRatio()); if (XGFX.o) XGFX.resize(); const k = devicePixelRatio > 1 ? 2 : 1; $("mini").width = 150 * k; $("mini").height = 120 * k; }
  addEventListener("resize", resize); resize();

  /* ★ 2026-09-28d 自動の画質：2秒ごとの平均が 28fps を下回ったら描く解像度（最低 0.7）と見える距離を少し下げ、余裕があれば戻す */
  const AQ = { acc: 0, n: 0, scale: 1, r: 1 };
  function autoQuality(dt) {
    AQ.acc += dt; AQ.n++;
    if (AQ.acc < 2) return;
    const fps = AQ.n / AQ.acc; AQ.acc = 0; AQ.n = 0;
    if (sky.on || !running) return;
    let ch = false;
    AQ.lv = (AQ.lv || 0) + 1; if (AQ.lv % 2 === 0 && XGFX.step(fps)) return;
    if (fps < 26 && AQ.scale > 0.7) { AQ.scale = Math.max(0.7, AQ.scale - 0.1); ch = true; }
    else if (fps < 28 && AQ.r > 0.6) { AQ.r = Math.max(0.6, AQ.r - 0.1); }
    else if (fps > 52 && AQ.r < 1) { AQ.r = Math.min(1, AQ.r + 0.1); }
    else if (fps > 52 && AQ.scale < 1) { AQ.scale = Math.min(1, AQ.scale + 0.1); ch = true; }
    world.viewR = VIEWR * AQ.r; world.viewD = VIEWD * (0.6 + 0.4 * AQ.r);
    if (ch) { renderer.setPixelRatio(PR * AQ.scale); resize(); }
  }
  let last = performance.now(), running = false, zoneName = "", tAll = 0;
  const camPos = new T.Vector3(), tmp = new T.Vector3(), camLook = new T.Vector3();
  function step(now) {
    requestAnimationFrame(step);
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now; tAll += dt;
    const fxc = XFX.update(dt, tAll);
    autoQuality(dt);
    world.nightShow = fxc.night + fxc.dusk * 0.5;
    if (!running || !player.av) { world.update(dt, tAll, camera); XGFX.before(scene, camera, tAll, null, XFX.sky, !sky.on); XFX.render(scene, camera); return; }
    /* 入力（W の前後・A/D の左右・スティック） */
    let ix = 0, iz = 0;
    if (keys.KeyW || keys.ArrowUp) iz -= 1; if (keys.KeyS || keys.ArrowDown) iz += 1;
    if (keys.KeyA || keys.ArrowLeft) ix -= 1; if (keys.KeyD || keys.ArrowRight) ix += 1;
    if (joy.id != null) { ix += joy.dx; iz += joy.dy; }
    if (XParkUI.busy()) { ix = 0; iz = 0; }
    const inp = { ix, iz, joy: joy.id != null, keyW: !!(keys.KeyW || keys.ArrowUp), keyS: !!(keys.KeyS || keys.ArrowDown), actPress, actRelease, actHeld: !!(keys.KeyE || keys.Space || keys.Enter) };
    actPress = actRelease = false;
    const av = player.av;
    const ownsMove = (game && game.ownsMove) || sky.on || (theater && !theater.free) || riding || XTransit.busy() || XRides.RIDE.cur || XRides.HOVER.on || XRooms.busy();
    if (XRides.HOVER.on) { rideCtx.t = tAll; XRides.HOVER.update(dt, sky.on ? { ix: 0, iz: 0, boost: false } : { ix, iz, boost: player.run || player.dash || player.runLock || (joy.id != null && Math.hypot(ix, iz) > 0.95) }, rideCtx); }
    let realV = 0;
    if (sky.on && (ix || iz)) { const sp = sky.dist * 0.55 * dt, fx = -Math.sin(sky.yaw), fz = -Math.cos(sky.yaw), rx = Math.cos(sky.yaw), rz = -Math.sin(sky.yaw); sky.target.x = Math.max(-900, Math.min(900, sky.target.x + (fx * -iz + rx * ix) * sp)); sky.target.z = Math.max(-700, Math.min(1100, sky.target.z + (fz * -iz + rz * ix) * sp)); }
    if (!ownsMove) {
      const mag = Math.min(1, Math.hypot(ix, iz));
      if (player.sit && mag > 0.3) standUp();
      const dashing = player.dash || player.runLock || (joy.id != null && mag > 0.95);
      const running2 = player.run || (joy.id != null && mag > 0.8);
      const spd = player.sit ? 0 : mag * (dashing ? 9.0 : running2 ? 5.4 : 2.5);
      let vx = 0, vz = 0;
      if (mag > 0.05 && !player.sit) {
        const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
        const mx = fx * -iz + rx * ix, mz = fz * -iz + rz * ix, ml = Math.hypot(mx, mz) || 1;
        vx = mx / ml * spd; vz = mz / ml * spd;
        let dy = Math.atan2(vx, vz) - player.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
        player.yaw += dy * Math.min(1, dt * 12);
      }
      const ox = player.x, oz = player.z;
      player.x += vx * dt; player.z += vz * dt;
      if (player.deck) {
        const dk = player.deck;
        if (dk.rect) { const c = Math.cos(dk.ry || 0), s = Math.sin(dk.ry || 0), dx = player.x - dk.x, dz = player.z - dk.z; let a = dx * c - dz * s, b = dx * s + dz * c; a = Math.max(-dk.hw, Math.min(dk.hw, a)); b = Math.max(-dk.hd, Math.min(dk.hd, b)); player.x = dk.x + a * c + b * s; player.z = dk.z - a * s + b * c; }
        else { const dx = player.x - dk.x, dz = player.z - dk.z, d = Math.hypot(dx, dz) || 1; const r = Math.max(dk.rIn, Math.min(dk.rOut, d)); player.x = dk.x + dx / d * r; player.z = dk.z + dz / d * r; }
      } else if (!player.sit) world.resolve(player, 0.3);
      realV = Math.hypot(player.x - ox, player.z - oz) / Math.max(dt, 1e-4);
      player.vx = vx; player.vz = vz;
      if (mag > 0.05 && look.id == null && !game && !cam.fp) { let d = (player.yaw + Math.PI) - cam.yaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; cam.yaw += d * Math.min(1, dt * 1.6); }
    }
    if (game) game.update(dt, inp);
    const gy = player.deck ? player.deck.y : player.sit ? player.sit.h - 0.5 : world.heightAt(player.x, player.z, player.y);
    if (!XRides.HOVER.on && !XRides.RIDE.cur && !XTransit.busy()) player.y += (gy - player.y) * Math.min(1, dt * 14);
    const inKart = game && gameKind === "kart";
    const onRide = !!XRides.RIDE.cur, onHover = XRides.HOVER.on;
    if (!onRide) { av.root.position.set(player.x, inKart ? (player.kartY || 0.2) : player.y, player.z); av.root.rotation.set(0, player.yaw, onHover ? XRides.HOVER.roll : 0); }
    let yr = player.yaw - (player._py != null ? player._py : player.yaw); while (yr > Math.PI) yr -= Math.PI * 2; while (yr < -Math.PI) yr += Math.PI * 2; player._py = player.yaw;
    if (onRide) { const C = XRides.RIDE.cur; av.update(dt, { speed: 0, sit: true, seatH: 0.45, armsUp: !!(C && C.R.kind === "coaster" && C.v > 16), hold: !!(C && (C.R.kind === "drop" || C.R.kind === "slide")) }); }
    else if (onHover) av.update(dt, { speed: 0, action: "drive", seatH: 0.97, look: 0 });
    else av.update(dt, { speed: (game && game.ownsMove) ? 0 : realV, sit: !!player.sit, seatH: player.sit ? 0.5 : inKart ? 0.3 : undefined, action: inKart ? "drive" : null, look: 0, turn: yr / Math.max(dt, 1e-3) });
    if (!onRide) av.root.visible = !riding && !(theater && !theater.free) && !XRooms.busy();

    npcs.forEach((n) => updateNPC(n, dt, now));
    updateCrowd(dt); updateChat(dt);

    /* 電車（モノレール・路面電車）を動かす：カメラより先に＝同じフレームの位置からカメラを置く */
    XTransit.update(dt); riding = XTransit.cur;
    XRooms.update(dt);
    if (riding) XTransit.lookRate(dt, ((keys.ArrowRight || keys.KeyD) ? 1 : 0) - ((keys.ArrowLeft || keys.KeyA) ? 1 : 0) + (joy.id != null ? joy.dx : 0), ((keys.ArrowDown || keys.KeyS) ? 1 : 0) - ((keys.ArrowUp || keys.KeyW) ? 1 : 0) + (joy.id != null ? joy.dy : 0));
    /* カメラ：上空／電車／シアター／ふつう（肩ごし・壁にめりこまない） */
    if (riding) XTransit.camera(dt, camera);
    else if (XRooms.busy() && XRooms.camera(dt, camera)) { /* ガラスのエレベーター */ }
    else if (XRides.RIDE.cur && updateParkRide(dt)) { /* 乗り物のカメラ */ }
    else if (sky.on) {
      /* ★ 2026-09-29b ホバーに乗ったままでも上空から見られる（前はホバーのカメラが先に動いて開けなかった） */
      sky.k = Math.min(1, sky.k + dt * 0.8);
      camPos.set(sky.target.x + Math.sin(sky.yaw) * Math.cos(sky.pitch) * sky.dist, sky.target.y + Math.sin(sky.pitch) * sky.dist, sky.target.z + Math.cos(sky.yaw) * Math.cos(sky.pitch) * sky.dist);
      const e = sky.k < 1 ? Math.min(1, dt * 2.2) : Math.min(1, dt * 8);
      camera.position.lerp(camPos, e); camLook.lerp(sky.target, e); camera.lookAt(camLook);
    } else if (XRides.HOVER.on) { if (sky.k < 1) sky.k = Math.min(1, sky.k + dt * 1.2); hoverCam(dt); }
    else if (sky.k < 1) {
      sky.k = Math.min(1, sky.k + dt * 1.2);
      normalCam(dt, Math.min(1, dt * 2.5));
    } else if (photoCam) {
      photoCamUpdate(dt);
    } else if (theater && !theater.free) {
      const sp = theater.sp; camPos.set(sp.cam[0], sp.cam[1], sp.cam[2]); camera.position.lerp(camPos, Math.min(1, dt * 4)); camLook.lerp(tmp.set(sp.look[0], sp.look[1], sp.look[2]), Math.min(1, dt * 4)); camera.lookAt(camLook);
    } else if (!(game && game.ownsCam)) {
      if (game && game.camera) game.camera(cam);
      normalCam(dt, Math.min(1, dt * 12));
    }

    /* 場所ごとの明るさ（外は昼・夕・夜の今の値）。NIGHT ZONE の中は夜 */
    const zn = player.deck ? { name: player.deck.name || "展望フロア", light: "deck", x0: 0, z0: 0, x1: 0, z1: 0 } : world.zoneAt(player.x, player.z);
    XFX.force(null);     /* ★ 2026-09-29b 昼夜はどのエリアも同じ（ご指定：NIGHT も他のエリアに連動） */
    LIGHTS.outdoor.hemi = fxc.hemi; LIGHTS.outdoor.sun = fxc.sun; LIGHTS.outdoor.exp = fxc.exp; LIGHTS.outdoor.fog = [fxc.fog, sky.on ? 2600 : fxc.fogN, sky.on ? 9000 : fxc.fogF];
    LIGHTS.arena.hemi = fxc.hemi + 0.1; LIGHTS.arena.sun = fxc.sun * 0.7; LIGHTS.arena.exp = fxc.exp; LIGHTS.arena.fog = [fxc.fog, 120, 900];
    const tl = sky.on || riding || XRooms.busy() || player.deck ? LIGHTS.outdoor : (LIGHTS[(zn && zn.light) || "outdoor"] || LIGHTS.outdoor);     /* 上空から見ているときは外の明るさ（建物の中の暗さを島じゅうに当てない） */
    const k = Math.min(1, dt * 2.2);
    curLight.hemi += (tl.hemi - curLight.hemi) * k; curLight.sun += (tl.sun - curLight.sun) * k; curLight.exp += (tl.exp - curLight.exp) * k;
    curLight.spot += (tl.spot - curLight.spot) * k; curLight.cafe += (tl.cafe - curLight.cafe) * k;
    curLight.face += (tl.face - curLight.face) * k;
    { const IQ = !sky.on && !riding && !XRooms.busy() && !player.deck && world.interiorAt ? world.interiorAt(player.x, player.z, player.y) : null, tr = IQ ? (tl.room || 0.8) : 0; curLight.room += (tr - curLight.room) * k;
      if (IQ) { const R = IQ.round ? IQ.r : Math.max(IQ.hw, IQ.hd); roomLight.position.set(IQ.x, (IQ.y0 || 0) + Math.max(2.4, (IQ.dome ? Math.min(IQ.hi + 3, IQ.R * 0.6) : IQ.hi) - 0.7), IQ.z); roomLight.distance = Math.max(12, R * 2.4); _rc.setHex(tl.roomC || 0xfff0dc); roomLight.color.lerp(_rc, k); roomLight.userData.s = Math.min(3, 0.8 + R / 10); }
      roomLight.intensity = curLight.room * 26 * (roomLight.userData.s || 1);
      hemiSky.lerp(_hc.setHex(tl.sky != null ? tl.sky : fxc.hemiS), k); hemiGnd.lerp(_hc.setHex(tl.gnd != null ? tl.gnd : fxc.hemiG), k); hemi.color.copy(hemiSky); hemi.groundColor.copy(hemiGnd); }
    hemi.intensity = curLight.hemi; sun.intensity = curLight.sun; renderer.toneMappingExposure = curLight.exp;
    spots.forEach((s) => s.intensity = curLight.spot); cafeLight.intensity = curLight.cafe;
    scene.fog.color.lerp(new T.Color(tl.fog[0]), k); scene.fog.near += (tl.fog[1] - scene.fog.near) * k; scene.fog.far += (tl.fog[2] - scene.fog.far) * k;
    if (world.sea && world.sea.material.uniforms.uFog) world.sea.material.uniforms.uFog.value.set(sky.on ? 4000 : 900, sky.on ? 9500 : 3200);
    const fc = sky.on || riding ? camera.position : player;
    sun.position.set(fc.x, 0, fc.z).addScaledVector(SUN, 150); sun.target.position.set(fc.x, 0, fc.z);
    const ar = world.areaName ? world.areaName(player.x, player.z) : null;
    const znName = zn && !/^\d/.test(zn.name) && zn.light !== "outdoor" ? zn.name : ar ? ar.n + " " + ar.name : zn ? zn.name : "XEVARION PARK";
    if (ar) XParkUI.area(ar);
    if (znName !== zoneName) { zoneName = znName; $("zone").textContent = znName; $("zone").classList.remove("pop"); void $("zone").offsetWidth; $("zone").classList.add("pop"); }

    world.update(dt, tAll, camera);
    tickTime(dt);
    XShows.update(dt, tAll, showCtx(zn));
    /* 近くの「できること」のボタン */
    let lab = "";
    if (riding) lab = riding.fast ? "▶ ふつうの速さにする" : "⏩ 早送り";
    else if (XTransit.lifting || XRooms.busy()) lab = "🛗 エレベーターで移動中…";
    else if (XRides.RIDE.cur) { const C = XRides.RIDE.cur; lab = (C.R.kind === "float" || C.R.kind === "loop" || C.R.kind === "shuttle" ? "🚪 おりる" : "⏩ 早送り") + (C.info ? "　" + C.info : ""); }
    else if (XRides.HOVER.on) lab = "🛵 おりる　" + Math.round(XRides.HOVER.speed * 3.6) + " km/h";
    else if (!game && !sky.on && !theater) {
      if (player.sit) lab = "🧍 立つ";
      else { const n2 = nearNPC(), it = n2 ? null : nearInteract(), s2 = n2 || it ? null : nearSeat(); lab = n2 ? "💬 " + n2.name + "と話す" : it ? it.icon + " " + it.label : s2 ? "🪑 すわる" : player.deck && Math.hypot(player.x - (player.deck.exitX != null ? player.deck.exitX : player.deck.x), player.z - (player.deck.exitZ != null ? player.deck.exitZ : player.deck.z)) < (player.deck.exitR || 7) ? "🛗 エレベーターで地上へ" : ""; }
    }
    if (lab !== nearNow) { nearNow = lab; $("actBtn").textContent = lab || ""; $("actBtn").classList.toggle("on", !!lab); $("hintE").style.display = lab && !MOBILE ? "" : "none"; }
    if (!sky.on) drawMap($("mini"), false);
    placeBubbles();
    XGFX.before(scene, camera, tAll, player, XFX.sky, !sky.on);
    if (XGFX.petals && curLight.room > 0.05) XGFX.petals.pts.visible = false;
    XFX.render(scene, camera);
    if (snapCb && (!photoCam || photoCam.t > 0.6)) { const cb = snapCb; snapCb = null; let url = null; try { url = renderer.domElement.toDataURL("image/jpeg", 0.92); } catch (e) {} cb(url); }
    XParkUI.skyTags(sky.on && sky.k >= 1, camera);
    nowPlaying();
    placeVideo();
    if (window.XAdult) XAdult.update(camera);          /* ★★ 2026-09-30b 大人のギャラリーの額（画面の窓のうしろの画像） */
    if (tAll - (step.saved || 0) > 3 && !game && !riding && !XRooms.inRoom() && !player.deck) { step.saved = tAll; saveState({ x: player.x, z: player.z, yaw: player.yaw }); }
  }
  /* ★★ 2026-09-29 下から見上げる（ご指定「キャラを下から見られず、床も変になる」）
     前はカメラが地面の下にもぐって、床が消えたり裏が見えたりしていた。
     → 見上げるときはカメラを腰の高さ（地面すれすれにはしない）までおろし、そこから上を向く。キャラは画面の下、空や建物が上に広がる。 */
  const lookVec = new T.Vector3(), camLookT = new T.Vector3();
  /* ショーに渡す今の様子 */
  let _sc = null;
  function showCtx(zn) {
    const c = _sc || (_sc = { world, renderer, player, camera, notice: (t, kind) => showNotice(t, kind), sponsor: (kind) => showSponsor(kind) });
    c.theater = theater; c.zone = zn || world.zoneAt(player.x, player.z); c.day = XFX.mode === "day" && !(c.zone && c.zone.night); c.night = XFX.mode === "night";
    c.inNightZone = !!(c.zone && c.zone.night); c.sky = sky.on; c.riding = !!riding;
    return c;
  }
  /* お知らせ（パレード・ショー）：押すと見やすい所へ */
  const NOTICE_SPOT = { parade: [-104, 364, -Math.PI / 2], night: [0, 398, Math.PI], harbor: [195, -326, Math.PI] };
  function showNotice(t, kind) {
    const el = $("notice");
    if (theater || !t) return;          /* ★★ 2026-09-30b 動画を見ている間はお知らせを出さない（字幕のように重なっていた） */
    if (kind === "music" || kind === "info") { el.innerHTML = "<b>" + esc(t) + "</b>"; el.classList.add("on"); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove("on"), 4200); return; }
    el.innerHTML = "<b>" + esc(t) + "</b><button>見に行く</button>"; el.classList.add("on");
    el.querySelector("button").onclick = () => { const sp = NOTICE_SPOT[kind]; if (sp) { if (player.sit) standUp(); player.deck = null; player.x = sp[0]; player.z = sp[1]; player.yaw = sp[2]; cam.yaw = sp[2] + Math.PI; for (const c of crowd) if (!c.fixed) c.x = 1e5; } el.classList.remove("on"); };
    clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove("on"), 16000);
  }
  function hoverCam(dt) {
    const H = XRides.HOVER, back = 7 + Math.min(4, H.speed * 0.12), fy = Math.sin(H.yaw), fz = Math.cos(H.yaw);
    camPos.set(H.x - fy * back, H.y + 2.6 + H.speed * 0.02, H.z - fz * back);
    const g2 = world.heightAt(camPos.x, camPos.z) + 0.8; if (camPos.y < g2) camPos.y = g2;
    camera.position.lerp(camPos, Math.min(1, dt * 5)); camLook.set(H.x + fy * 6, H.y + 1.2, H.z + fz * 6); camera.lookAt(camLook);
    const f = 58 + Math.min(14, H.speed * 0.35); if (Math.abs(camera.fov - f) > 0.3) { camera.fov += (f - camera.fov) * Math.min(1, dt * 3); camera.updateProjectionMatrix(); }
  }
  function normalCam(dt, e) {
    /* ★ 2026-09-29b 一人称視点：目の高さから見回す（自分の体は見えない） */
    if (cam.fp) {
      const eh = player.sit ? 1.05 : 1.48, sp0 = Math.sin(cam.pitch), cp0 = Math.cos(cam.pitch);
      lookVec.set(-Math.sin(cam.yaw) * cp0, -sp0, -Math.cos(cam.yaw) * cp0);
      camPos.set(player.x + lookVec.x * 0.15, player.y + eh, player.z + lookVec.z * 0.15);
      camera.position.lerp(camPos, e > 0.5 ? 1 : Math.min(1, e * 3)); camLook.copy(camera.position).addScaledVector(lookVec, 10); camera.lookAt(camLook);
      if (player.av) player.av.root.visible = false;
      return;
    }
    cam.target.set(player.x, player.y + (player.sit ? 1.0 : 1.4), player.z);
    const cd = cam.dist, sp = Math.sin(cam.pitch), cp = Math.cos(cam.pitch);
    lookVec.set(-Math.sin(cam.yaw) * cp, -sp, -Math.cos(cam.yaw) * cp);
    camPos.set(cam.target.x + Math.sin(cam.yaw) * cp * cd, cam.target.y + sp * cd, cam.target.z + Math.cos(cam.yaw) * cp * cd);
    tmp.copy(camPos).sub(cam.target); const len = tmp.length(); tmp.normalize();
    ray.set(cam.target, tmp); ray.far = len; ray.camera = camera;
    const hit = ray.intersectObjects(world.walls, false)[0];
    if (hit) camPos.copy(cam.target).addScaledVector(tmp, Math.max(0.6, hit.distance - 0.25));
    /* 建物の中へ入らない（足もとの形＋高さで判定） */
    { const L2 = camPos.distanceTo(cam.target); for (let s2 = 0.5; s2 < L2; s2 += 0.35) { const qx = cam.target.x + tmp.x * s2, qy = cam.target.y + tmp.y * s2, qz = cam.target.z + tmp.z * s2; if (world.camBlock(qx, qy, qz, player.x, player.z)) { camPos.copy(cam.target).addScaledVector(tmp, Math.max(0.5, s2 - 0.4)); break; } } }
    /* ★★ 2026-09-29 建物の中：カメラは部屋の中（壁・天井の手前）にとどめる */
    const IQ = world.interiorAt ? world.interiorAt(player.x, player.z, player.y) : null;
    if (IQ) { const kk = world.camInside(IQ, cam.target, camPos); if (kk < 1) camPos.lerpVectors(cam.target, camPos, Math.max(0.04, kk)); }
    const minY = Math.max((player.y < -100 ? player.y : player.deck ? player.deck.y : world.heightAt(camPos.x, camPos.z)) + 0.35, player.y + (player.sit ? 0.75 : 0.95));
    if (camPos.y < minY) camPos.y = minY;
    camera.position.lerp(camPos, e);
    if (IQ) { const kk = world.camInside(IQ, cam.target, camera.position); if (kk < 1) camera.position.lerpVectors(cam.target, camera.position, Math.max(0.04, kk)); }
    if (camera.position.y < minY) camera.position.y = minY;
    if (player.av && camera.position.distanceTo(cam.target) < 0.45) player.av.root.visible = false;
    if (sp < 0) camLookT.copy(camera.position).addScaledVector(lookVec, Math.max(1, cd)); else camLookT.copy(cam.target);
    camLook.lerp(camLookT, e > 0.5 ? 1 : e * 1.6);
    camera.lookAt(camLook);
  }

  function updateNPC(n, dt, now) {
    const av = n.av;
    let vel = 0;
    const dP = Math.hypot(player.x - n.x, player.z - n.z);
    const hide = game && (n.game === gameKind);
    if (n.path && !(n.faceUntil > now) && dP > 2.2) {
      const tg = n.path[n.pi], dx = tg[0] - n.x, dz = tg[1] - n.z, d = Math.hypot(dx, dz);
      if (d < 0.4) { n.pi = (n.pi + 1) % n.path.length; n.pause = 1 + Math.random() * 2.5; }
      else if (!(n.pause > 0)) { const sp = 1.05; n.x += dx / d * sp * dt; n.z += dz / d * sp * dt; vel = sp; let dy = Math.atan2(dx, dz) - n.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2; n.yaw += dy * Math.min(1, dt * 6); }
      if (n.pause > 0) n.pause -= dt;
    }
    let headYaw = 0;
    if (dP < 6 && !game) {
      const want = Math.atan2(player.x - n.x, player.z - n.z);
      let d = want - n.yaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
      if (n.faceUntil > now || (!n.path && dP < 3.2 && !n.say)) n.yaw += d * Math.min(1, dt * 4);
      else headYaw = Math.max(-0.9, Math.min(0.9, d));
      if (!n.greeted && dP < 3.4) { n.greeted = true; say(n, n.lines[0]); n.li = 1; av.wave = 1.4; }
    } else if (n.home && !n.path && !(n.faceUntil > now)) {
      let d = n.home[2] - n.yaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; n.yaw += d * Math.min(1, dt * 2);
    }
    if (n.say === "slide") {
      const K = world.keynote;
      if (K.idx !== n.lastSlide) { n.lastSlide = K.idx; const zn = world.zoneAt(player.x, player.z); if (zn && zn.light === "keynote") say(n, (K.slides[K.idx] || {}).say || "", 8000); }
      if (Math.random() < dt * 0.08) av.wave = 1.2;
    }
    if (n.say === "track") {
      const code = n.spot, idx = Math.floor(tAll / 12);
      if (idx !== n.lastSlide) {
        n.lastSlide = idx;
        const zn = world.zoneAt(player.x, player.z);
        if (zn && zn.name.indexOf(code) === 0) { const tr = trackOf(code), s = tr.list[idx % Math.max(1, tr.list.length)]; if (s) say(n, "つぎのお話は「" + s.title.replace(/^[^\wぁ-んァ-ヶ一-龠]+/, "") + "」です。", 7000, "proud"); }
      }
    }
    let act = null, actT = 0;
    if (n.dance) { act = "dance"; actT = 0.5; }
    av.root.position.set(n.x, world.heightAt(n.x, n.z), n.z); av.root.rotation.y = n.yaw;
    const far = dP > 40;
    n.acc = (n.acc || 0) + dt;
    av.detail(dP < 26);
    if (!far || Math.random() < 0.25) { av.update(n.acc, vel, { headYaw, action: act, actionT: actT, noSpring: dP > 25, noFace: dP > 35 }); n.acc = 0; }
    av.root.visible = dP < 60 && !hide && !sky.on && !riding;
    if (n.bub && n.talkUntil < now) n.bub.classList.remove("on");
  }

  const proj = new T.Vector3();
  /* 2人組の会話：近くにいる組が、エリアの話題で交互に話す（吹き出し） */
  let chatT = 3, chatNow = null;
  function crowdBubble(c, text, ms) { if (!c.bub) { c.bub = document.createElement("div"); c.bub.className = "bub chat"; bubLayer.appendChild(c.bub); } c.bub.textContent = text; c.bub.classList.add("on"); c.bubUntil = performance.now() + ms; if (c.av.setExpr) c.av.setExpr(/[！!]/.test(text) ? "happy" : "smile", ms); c.av.talkUntil = performance.now() + Math.min(ms, 900 + text.length * 55); }
  function updateChat(dt) {
    if (chatNow) { chatNow.t += dt; if (chatNow.step === 0 && chatNow.t > 2.8) { chatNow.step = 1; crowdBubble(chatNow.b, chatNow.lines[1], 2800); } else if (chatNow.t > 6.2) chatNow = null; return; }
    chatT -= dt; if (chatT > 0 || sky.on || riding || theater || player.y < -100) return; chatT = 4 + Math.random() * 5;
    const ar = world.areaName ? world.areaName(player.x, player.z) : null, cands = crowd.filter((c) => c.lead && c.partner && c.av.root.visible && Math.hypot(c.x - player.x, c.z - player.z) < 20);
    if (!cands.length) return;
    const A = cands[Math.floor(Math.random() * cands.length)], lines = XLife.chatPick(ar ? ar.id : "_", Math.floor(Math.random() * 1000));
    crowdBubble(A, lines[0], 2800); chatNow = { a: A, b: A.partner, lines, t: 0, step: 0 };
  }
  function placeBubbles() {
    const now = performance.now();
    crowd.forEach((c) => { if (!c.bub) return; const on = c.bubUntil > now && c.av.root.visible; if (!on) { c.bub.style.display = "none"; return; } proj.set(c.x, c.av.root.position.y + 2.0, c.z).project(camera); const dist = camera.position.distanceTo(c.av.root.position), vis = proj.z < 1 && dist < 26 && Math.abs(proj.x) < 1.15 && Math.abs(proj.y) < 1.15; c.bub.style.display = vis ? "" : "none"; if (vis) c.bub.style.transform = "translate(" + Math.round((proj.x * 0.5 + 0.5) * innerWidth) + "px," + Math.round((-proj.y * 0.5 + 0.5) * innerHeight) + "px) translate(-50%,-100%)"; });
    npcs.forEach((n) => {
      if (!n.tag) bubbleFor(n);
      const h = (n.av.sp.h || 1.62) + 0.3;
      proj.set(n.x, n.av.root.position.y + h, n.z).project(camera);
      const dist = camera.position.distanceTo(n.av.root.position);
      const vis = proj.z < 1 && dist < 16 && Math.abs(proj.x) < 1.2 && Math.abs(proj.y) < 1.2 && n.av.root.visible;
      const sx = (proj.x * 0.5 + 0.5) * innerWidth, sy = (-proj.y * 0.5 + 0.5) * innerHeight;
      n.tag.style.display = vis && dist < 11 ? "" : "none";
      n.tag.style.transform = "translate(" + Math.round(sx) + "px," + Math.round(sy) + "px) translate(-50%,-100%)";
      n.bub.style.display = vis ? "" : "none";
      n.bub.style.transform = "translate(" + Math.round(sx) + "px," + Math.round(sy - 26) + "px) translate(-50%,-100%)";
    });
  }

  /* ══════════════ はじまり ══════════════ */
  world.screens.forEach((s) => { s.draw0 = s.draw; });
  function start() {
    running = true;
    $("hud").classList.add("on");
    setTimeout(() => showNotice("🎵 音楽はオフです。右上の ♪（" + keyName(KEYS.music) + " キー）でオンにすると、パークの曲が流れます", "info"), 3200);
    toast("XEVARION PARK へようこそ！ " + (MOBILE ? "左をドラッグで歩く・右をドラッグで見回す・🛰 で空から見る" : "WASD で歩く・W 2回でダッシュ・E で話す／すわる・M 地図・V 空から・T 昼夜"));
  }
  const mgr = T.DefaultLoadingManager;
  mgr.onProgress = (u, a, b) => { $("barIn").style.width = Math.round(a / Math.max(1, b) * 60) + "%"; };
  let readyOnce = false;
  function ready() {
    if (readyOnce) return; readyOnce = true;
    $("loadT") && ($("loadT").textContent = "キャラクターを準備しています…");
    Promise.all([XPeople.preload((a, b) => { $("barIn").style.width = Math.round(60 + a / b * 30) + "%"; }), XVRM.load("chara/chara01.glb?v=1", { hide: /Choker/i })]).then(([_, v]) => {
      setupNPCs(); setupCrowd();
      player.av = v; scene.add(v.root);
      v.root.position.set(player.x, 0, player.z); v.root.rotation.y = player.yaw; v.resetSpring();
      v.root.traverse((o) => { if (o.isMesh && o.material && o.material.isMeshToonMaterial) o.receiveShadow = false; });
      $("barIn").style.width = "100%";
      $("loading").classList.add("done");
      start();
    }).catch((e) => { console.error(e); $("loadT") && ($("loadT").textContent = "キャラクターを読みこめませんでした（通信を確かめてください）"); });
  }
  mgr.onLoad = ready;
  setTimeout(ready, 6000);
  requestAnimationFrame(step);
  window.EXPO = { world, player, npcs: () => npcs, camera, renderer, scene, cam, game: () => game, startGame, exitGame, toggleSky, sky, FX: XFX, crowd, openApp: (h, a) => openApp(h, a) };
})();
