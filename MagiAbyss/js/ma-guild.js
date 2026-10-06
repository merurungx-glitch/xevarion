/* ============================================================
   MagiAbyss — ma-guild.js
   冒険者ギルド《アストラ》（歩ける拠点）と、施設ごとの画面
   ・ギルドはドット絵の部屋。キャラ（選んでいる子）を歩かせて施設に近づくか、
     施設の名札を押すと、その画面が開く。NPC は待機アニメ、炉・ろうそく・深淵の門は動く。
   ・タイトル画面・設定・データ管理もここ。
   ============================================================ */
(function () {
  "use strict";
  const MA = (window.MA = window.MA || {});
  const D = () => MA.D;
  const S = () => MA.Save.S;
  const UI = () => MA.UI;
  const ACT = () => MA.UI.ACT;
  const TAU = Math.PI * 2;
  const esc = (s) => MA.UI.esc(s);
  const ic = (n, c, cls) => MA.Art.iconHTML(n, c, cls);
  const fmt = (n) => MA.UI.fmt(n);
  const fmtT = (s) => MA.UI.fmtT(s);
  const $ = (s, r) => (r || document).querySelector(s);

  /* ══════════════════════════════════════════════════════════════
     拠点（町の広場）
     ★★ 2026-10-05 屋内のギルドから「屋外の町の広場」に作り直し（ご指定：ギルド案1 の配置）。
       地面・建物・置物・動物の絵は ma-town.js。ここは歩く・近くの施設・名札・NPC。
     ══════════════════════════════════════════════════════════════ */
  const TS = 16;
  const FAC = MA.Town.FAC;
  let hub = null, hctx = null, bg = null, gmap = null;
  const GS = { x: 23 * TS, y: 20 * TS, vx: 0, vy: 0, r: 5, face: 1, walkT: 0, moving: false, side: false, near: null, t: 0, npcs: [], running: false, cam: { x: 0, y: 0 } };

  /* 町の人たち（XEVARION のキャラではない） */
  const SIDE_ROBE = (hair) => ({ hair: hair === "bob" ? "bob" : "long", len: 23, top: "gothic", arm: "A", bottom: "robe" });
  const SIDE_TANK = (hair) => ({ hair: hair === "bob" ? "bob" : "long", len: 22, top: "tank", arm: "S", bottom: "pants" });
  const NPCDEF = {
    laura: { nm: "ギルドマスター ラウラ", pal: { H: "#5a3a8a", h: "#3a2260", L: "#8a6ac0", E: "#ffcc3a", A: "#2a2440", a: "#1a1630", C: "#e0b040", c: "#a07a20", P: "#2a2440", p: "#1a1630", O: "#2a2030", o: "#141018", K: "#120e1a" }, hair: "long", outfit: "robe" },
    shopkeep: { nm: "魔導具店のミント", pal: { H: "#4fbf9a", h: "#2f8a6a", L: "#8fe8c8", E: "#3a6aff", A: "#f2f2f6", a: "#c8c8d6", C: "#3a4a7a", c: "#2a3460", P: "#3a4a7a", p: "#2a3460", O: "#5a3a2a", o: "#3a2418", K: "#0e1a14" }, hair: "bob", outfit: "tank" },
    smith: { nm: "鍛冶屋のガルド", pal: { H: "#8a3a1a", h: "#5a2410", L: "#c86a3a", E: "#3a2a1a", A: "#6a5a4a", a: "#4a3e32", C: "#3a2a1a", c: "#2a1e12", P: "#3a3a4a", p: "#2a2a36", O: "#2a1e12", o: "#140e08", S: "#d8a07a", s: "#b07a58", K: "#140c08" }, hair: "bob", outfit: "tank" },
    barkeep: { nm: "酒場のローザ", pal: { H: "#c83a4a", h: "#8a2230", L: "#f07080", E: "#3a8a3a", A: "#f2f2f6", a: "#c8c8d6", C: "#2a2a30", c: "#16161a", P: "#2a2a30", p: "#16161a", O: "#2a2a30", o: "#16161a", K: "#160a0e" }, hair: "long", outfit: "tank" },
    teller: { nm: "占い師のシエル", pal: { H: "#d8d0f0", h: "#a89cc8", L: "#ffffff", E: "#c070ff", A: "#5a2a90", a: "#3a1a60", C: "#ffd84a", c: "#c8a030", P: "#5a2a90", p: "#3a1a60", O: "#2a1a3a", o: "#140a20", K: "#140a1e" }, hair: "long", outfit: "robe" },
    bard: { nm: "吟遊詩人のリュート", pal: { H: "#c88a3a", h: "#8a5a20", L: "#f0c070", E: "#2a8a5a", A: "#2a8a5a", a: "#1a6040", C: "#e0b040", c: "#a07a20", P: "#5a4a3a", p: "#3a2e24", O: "#3a2a1a", o: "#1e140a", K: "#120e08" }, hair: "bob", outfit: "tank" },
    adv1: { nm: "冒険者", pal: { H: "#d8b040", h: "#a07a20", L: "#ffe08a", E: "#3a6aff", A: "#5a7a3a", a: "#3e5a28", C: "#8a5a2a", c: "#5a3a1a", P: "#5a4a3a", p: "#3a2e24", O: "#3a2a1a", o: "#1e140a", K: "#120e08" }, hair: "bob", outfit: "tank" },
    adv2: { nm: "冒険者", pal: { H: "#2a3a6a", h: "#1a2448", L: "#5a6aa0", E: "#ff8a3a", A: "#8a2a3a", a: "#5a1a26", C: "#e0b040", c: "#a07a20", P: "#2a2a36", p: "#1a1a24", O: "#2a1e12", o: "#140e08", K: "#0e0e18" }, hair: "long", outfit: "tank" },
    adv3: { nm: "冒険者", pal: { H: "#e8e8f0", h: "#b0b0c0", L: "#ffffff", E: "#c070ff", A: "#3a2a5a", a: "#261a40", C: "#9a90b0", c: "#6a6080", P: "#3a2a5a", p: "#261a40", O: "#2a2030", o: "#141018", K: "#120e1a" }, hair: "long", outfit: "robe" },
  };
  function npcSprite(k) {
    const n = NPCDEF[k], PA = MA.Pix.PARTS;
    const layers = [n.hair === "bob" ? PA.backBob() : PA.backLong(24), n.outfit === "robe" ? { x: 6, y: 14, rows: ["..AACCAA....", ".AAAACAAAAA.", "AAAAACAAAAAA", "A.AAAAAAAA.A", "a.AaAAAAaA.a", "S.AAAAAAAA.S", "..AAAAAAAA..", "..AaAAAAaA..", "..AAAAAAAA..", "..aAAAAAAa..", "...OO..OO...", "...oo..oo..."] } : PA.outfitTank(PA.BOTTOM_PANTS), "FACE", n.hair === "bob" ? PA.frontBob(false) : PA.frontStraight(14)];
    return MA.Pix.spriteFromDef("npc_" + k, { pal: n.pal, legY: n.outfit === "robe" ? 27 : 23, robe: n.outfit === "robe", layers, side: n.outfit === "robe" ? SIDE_ROBE(n.hair) : SIDE_TANK(n.hair) });
  }
  function initNpcs() {
    GS.npcs = [
      { k: "laura", x: 41.2 * TS, y: 19.8 * TS, still: 1 },
      { k: "shopkeep", x: 18.2 * TS, y: 7.6 * TS, still: 1 },
      { k: "smith", x: 8.7 * TS, y: 8.0 * TS, still: 1 },
      { k: "barkeep", x: 32.0 * TS, y: 8.8 * TS, still: 1 },
      { k: "teller", x: 6.2 * TS, y: 12.6 * TS, still: 1 },
      { k: "bard", x: 15.0 * TS, y: 28.4 * TS, still: 1, play: 1 },
      { k: "adv1", x: 20 * TS, y: 18 * TS, home: [20 * TS, 18 * TS] },
      { k: "adv2", x: 28 * TS, y: 16 * TS, home: [28 * TS, 16 * TS] },
      { k: "adv3", x: 31 * TS, y: 21 * TS, home: [31 * TS, 21 * TS] },
    ];
    GS.npcs.forEach((n) => { n.t = Math.random() * 5; n.face = 1; n.tx = n.x; n.ty = n.y; n.walkT = 0; });
  }

  /* ══ 拠点の開始・ループ ══ */
  function enter() {
    MA.E.stop();
    UI().closeModal(true);
    if (MA.Stages) MA.Stages.hide();
    UI().scr("guild");
    if (!gmap) { gmap = MA.Town.buildMap(); initNpcs(); }
    bg = MA.Town.drawBg();
    hub = $("#hub"); hctx = hub.getContext("2d");
    resizeHub();
    MA.Input.enabled = true;
    MA.Input.clearAll();
    $("#touch").innerHTML = '<div class="t-home" id="tHome"><i></i><span>移動</span></div><div class="t-base" id="tBase"><div class="t-knob" id="tKnob"></div></div>' +
      '<div class="t-btns"><button class="tb s-big a-interact" data-act="interact" id="tb_interact"><span class="tb-ring"></span><span class="tb-ic">' + ic("info") + '</span><em class="tb-n"></em><span class="tb-l">調べる</span></button></div>';
    MA.Input.bindTouch();
    MA.Input.bindButtons($("#touch"));
    GS.x = MA.Town.start[0] * TS; GS.y = MA.Town.start[1] * TS; GS.near = null;
    renderTop();
    buildLabels();
    MA.Audio.bgm("guild");
    if (!GS.running) { GS.running = true; GS.last = performance.now(); requestAnimationFrame(loopHub); }
    /* はじめてのとき：序章 → 遊び方 */
    if (!S().codex.story.prologue) setTimeout(() => playStory("prologue"), 300);
    else {
      /* ★ 結果画面をすぐ閉じても、クリアした迷宮の章を取りこぼさない */
      const pend = D().STORY.find((st) => st.at && S().dun[st.at] && S().dun[st.at].clears > 0 && !S().codex.story[st.id]);
      if (pend) setTimeout(() => { if (!UI().topModal()) playStory(pend.id); }, 300);
      else if (!S().tutorial) setTimeout(() => { if (!UI().topModal() && MA.Howto) MA.Howto.open(0, true); }, 300);
      else checkResume();
    }
    MA.Prog.checkAll();
    /* 冒険の地図の絵は重い（0.5秒ほど）ので、広場にいるあいだの空き時間に描いておく */
    if (MA.Stages && !GS.mapPre) { GS.mapPre = 1; const pre = () => { try { MA.Stages.paint(); } catch (e) {} }; if (window.requestIdleCallback) requestIdleCallback(pre, { timeout: 5000 }); else setTimeout(pre, 2500); }
  }
  function leave() { GS.running = false; }
  function resizeHub() {
    if (!hub) return;
    const v = MA.vp ? MA.vp() : { w: window.innerWidth, h: window.innerHeight };
    const w = v.w, h = v.h;
    const phone = MA.isPhone && MA.isPhone();
    let scale = h / (phone ? 230 : 420);
    if (scale >= 2) scale = Math.floor(scale * 2) / 2;
    scale = Math.max(1, scale);
    /* 町より広く見えないように（まわりに何もない帯を出さない） */
    scale = Math.max(scale, Math.ceil(w / MA.Town.PW * 4) / 4, Math.ceil(h / MA.Town.PH * 4) / 4);
    GS.scale = scale;
    hub.width = Math.ceil(w / scale); hub.height = Math.ceil(h / scale);
    hub.style.width = w + "px"; hub.style.height = h + "px";
    hctx.imageSmoothingEnabled = false;
  }
  window.addEventListener("resize", () => { if (GS.running) { resizeHub(); } });
  function loopHub(now) {
    if (!GS.running) return;
    requestAnimationFrame(loopHub);
    /* ★ rAF の時刻は performance.now() より前のことがある（最初のコマ）→ 負の時間にしない */
    const dt = Math.max(0, Math.min(0.05, (now - GS.last) / 1000)); GS.last = now;
    if (document.body.dataset.scr !== "guild") return;
    GS.t += dt;
    updateHub(dt);
    drawHub();
  }
  function updateHub(dt) {
    const I = MA.Input;
    const modalOpen = !!UI().topModal();
    let mx = modalOpen ? 0 : I.mx, my = modalOpen ? 0 : I.my;
    const sp = 86;
    GS.vx += (mx * sp - GS.vx) * Math.min(1, dt * 14); GS.vy += (my * sp - GS.vy) * Math.min(1, dt * 14);
    const o = { x: GS.x, y: GS.y, r: 5 };
    o.x += GS.vx * dt; let p = MA.Map.collideCircle(gmap, o.x, o.y, o.r); o.x += p[0]; o.y += p[1];
    o.y += GS.vy * dt; p = MA.Map.collideCircle(gmap, o.x, o.y, o.r); o.x += p[0]; o.y += p[1];
    GS.x = o.x; GS.y = o.y;
    GS.moving = Math.hypot(mx, my) > 0.1; if (GS.moving) { GS.walkT += dt; if (Math.abs(mx) > 0.1) GS.face = mx > 0 ? 1 : -1; }
    GS.side = GS.moving && Math.abs(mx) > Math.abs(my) * 0.8;
    /* 近くの施設 */
    let near = null, nd = 1e9;
    FAC.forEach((f) => { const dx = GS.x - f.spot[0] * TS, dy = GS.y - f.spot[1] * TS, d = dx * dx + dy * dy; if (d < 30 * 30 && d < nd) { nd = d; near = f; } });
    if (near !== GS.near) {
      GS.near = near;
      const hint = $("#gHint");
      if (hint) { hint.hidden = !near; if (near) hint.innerHTML = ic(near.ic, near.c) + "<b>" + esc(near.nm) + "</b><span>" + esc(near.sub) + '</span><button class="btn sm gold" data-a="fac" data-v="' + near.open + '">開く</button>' + (isTouchUI() ? "" : '<kbd class="kk">' + esc(MA.Input.keyLabel("interact")) + "</kbd>"); }
      const tb = $("#tb_interact"); if (tb) tb.classList.toggle("ready", !!near);
    }
    if (!modalOpen && (I.consume("interact") || I.consume("attack")) && near) openFac(near.open);
    if (!modalOpen && I.consume("menu")) openPanel("settings");
    if (!modalOpen && I.consume("map")) openFac("stages");
    I.pressed.delete("dash"); I.pressed.delete("skill"); I.pressed.delete("burst"); I.pressed.delete("ult");
    /* NPC：ときどき近くを歩く */
    GS.npcs.forEach((n) => {
      n.t -= dt;
      if (n.still) { n.face = GS.x > n.x ? 1 : -1; n.moving = false; return; }
      if (n.t <= 0) { n.t = 2 + Math.random() * 4; n.tx = n.home[0] + (Math.random() - 0.5) * 80; n.ty = n.home[1] + (Math.random() - 0.5) * 50; }
      const dx = n.tx - n.x, dy = n.ty - n.y, d = Math.hypot(dx, dy);
      if (d > 2) { const q = { x: n.x + dx / d * 30 * dt, y: n.y + dy / d * 30 * dt }; const pp = MA.Map.collideCircle(gmap, q.x, q.y, 5); n.x = q.x + pp[0]; n.y = q.y + pp[1]; n.walkT += dt; n.moving = true; n.face = dx > 0 ? 1 : -1; n.side = Math.abs(dx) > Math.abs(dy) * 0.8; } else n.moving = false;
    });
    MA.Town.updateAnimals(dt);
    /* カメラ */
    const vw = hub.width, vh = hub.height, mw = MA.Town.PW, mh = MA.Town.PH;
    GS.cam.x = mw > vw ? Math.max(vw / 2, Math.min(mw - vw / 2, GS.x)) : mw / 2;
    GS.cam.y = mh > vh ? Math.max(vh / 2, Math.min(mh - vh / 2, GS.y - 10)) : mh / 2;
  }
  function isTouchUI() { return document.body.classList.contains("touchdev"); }
  function drawHub() {
    const g = hctx, vw = hub.width, vh = hub.height;
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;   /* ★ 前のコマの変形が残らないように */
    const cx = Math.round(GS.cam.x - vw / 2), cy = Math.round(GS.cam.y - vh / 2);
    g.fillStyle = "#3a6a2a"; g.fillRect(0, 0, vw, vh);
    g.drawImage(bg, -cx, -cy);
    /* y の順：置物・動物・人 */
    const list = [];
    MA.Town.collectProps(list);
    GS.npcs.forEach((n) => list.push({ y: n.y, n }));
    list.push({ y: GS.y, me: 1 });
    list.sort((a, b) => a.y - b.y);
    list.forEach((it) => {
      if (it.me) { drawWalker(g, MA.Pix.charSprite(S().sel), GS, cx, cy); return; }
      if (it.n) { drawWalker(g, npcSprite(it.n.k), it.n, cx, cy); return; }
      MA.Town.drawProp(g, it, cx, cy, GS.t);
    });
    MA.Town.drawAnim(g, cx, cy, GS.t);
    /* 近くの施設の足もとに光の輪 */
    if (GS.near) { const f = GS.near; g.globalAlpha = 0.45 + 0.25 * Math.sin(GS.t * 6); g.strokeStyle = f.c; g.lineWidth = 1; g.beginPath(); g.ellipse(Math.round(f.spot[0] * TS - cx), Math.round(f.spot[1] * TS - cy), 12, 5, 0, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1; }
    /* やわらかいふち（昼の光） */
    const gr = g.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.45, vw / 2, vh / 2, Math.max(vw, vh) * 0.8);
    gr.addColorStop(0, "rgba(255,240,200,0)"); gr.addColorStop(1, "rgba(30,20,10,.28)");
    g.fillStyle = gr; g.fillRect(0, 0, vw, vh);
    /* 名札の位置 */
    placeLabels(cx, cy);
  }
  function drawWalker(g, sp, o, cx, cy) {
    let f;
    if (o.moving && o.side && sp.side) f = sp.side[Math.floor(o.walkT * 10) % 4];
    else if (o.moving) f = sp.walk[Math.floor(o.walkT * 9) % 4];
    else if (o.play) f = sp.idle[Math.floor(GS.t * 3) % 2];
    else { const it = Math.floor(GS.t * 2 + (o.x % 3)) % 2; f = sp.idle[((GS.t + o.x * 0.01) % 3.4) > 3.25 ? 2 : it]; }
    const x = Math.round(o.x - cx), y = Math.round(o.y - cy);
    g.fillStyle = "rgba(0,0,0,.28)"; g.beginPath(); g.ellipse(x, y + 2, 7, 3, 0, 0, Math.PI * 2); g.fill();
    if (!f) return;
    if (o.face < 0) { g.save(); try { g.translate(x, 0); g.scale(-1, 1); g.drawImage(f, -Math.floor(f.width / 2), y - f.height + 4); } finally { g.restore(); } }
    else g.drawImage(f, x - Math.floor(f.width / 2), y - f.height + 4);
    /* 吟遊詩人の音符 */
    if (o.play) { const k = (GS.t * 0.8) % 1; g.globalAlpha = 1 - k; g.fillStyle = "#ffd84a"; g.fillRect(x + 6 + Math.sin(k * 6) * 3, y - 30 - k * 14, 2, 4); g.fillRect(x + 6 + Math.sin(k * 6) * 3 - 2, y - 27 - k * 14, 3, 2); g.globalAlpha = 1; }
  }
  /* 施設の名札（押せる） */
  function buildLabels() {
    const box = $("#gLabels"); box.innerHTML = "";
    FAC.forEach((f) => {
      const b = document.createElement("button");
      b.className = "glab"; b.dataset.a = "fac"; b.dataset.v = f.open; b.style.setProperty("--c", f.c);
      const locked = f.id === "gate" && !(S().dun.d3 && S().dun.d3.clears);
      b.innerHTML = ic(locked ? "lock" : f.ic, f.c) + "<span>" + esc(f.nm) + "</span>";
      b._f = f;
      box.appendChild(b);
    });
  }
  function placeLabels(cx, cy) {
    const sc = GS.scale || 1;
    document.querySelectorAll(".glab").forEach((b) => {
      const f = b._f; if (!f) return;
      const x = f.lab[0] * TS - cx, y = f.lab[1] * TS - cy;
      b.style.transform = "translate(" + Math.round(x * sc) + "px," + Math.round(y * sc) + "px) translate(-50%,-100%)";
      b.classList.toggle("near", GS.near === f);
    });
  }
  /* 上のバー・左下の「出発するキャラ」 */
  function renderTop() {
    const s = S();
    const kk = (a) => isTouchUI() ? "" : '<kbd class="kk">' + esc(MA.Input.keyLabel(a)) + "</kbd>";
    $("#gTop").innerHTML = '<div class="g-logo"><img src="img/icon_s.webp" alt=""><b>Magi<i>Abyss</i></b></div>' +
      '<div class="g-curs"><span class="g-cur" title="ゴールド">' + ic("gold") + "<b>" + fmt(s.gold) + '</b></span><span class="g-cur" title="魔石">' + ic("mat", D().MATS.stone.c) + "<b>" + fmt(s.mats.stone || 0) + '</b></span><span class="g-cur" title="星脈結晶">' + ic("crystal") + "<b>" + fmt(s.mats.crystal || 0) + "</b></span></div>" +
      '<div class="g-tbs"><button class="g-tb gold" data-a="fac" data-v="stages">' + ic("map") + "<span>クエスト</span>" + kk("map") + '</button>' +
      '<button class="g-tb" data-a="fac" data-v="chars">' + ic("person") + "<span>キャラ</span></button>" +
      '<button class="g-tb" data-a="fac" data-v="missions">' + ic("mission") + "<span>ミッション</span></button>" +
      '<button class="g-tb" data-a="howto">' + ic("info") + "<span>遊び方</span></button></div>" +
      '<button class="g-btn" data-a="panel" data-v="settings" title="設定">' + ic("gear") + "</button>" +
      '<button class="g-btn" data-a="toTitle" title="タイトルへ">' + ic("back") + "</button>";
    const sel = s.sel, C = D().CHARS[sel];
    const anyOwned = D().CHAR_ORDER.some((id) => MA.Save.owned(id));
    if (!anyOwned) {
      $("#gSel").innerHTML = '<div class="g-noown">' + ic("lock") + '<div><b>遊べるキャラがいません</b><small>XEVARION の <em class="f1">極彩祭</em><em class="f2">極煌祭</em><em class="f3">極華祭</em> のキャラを手に入れると遊べます</small></div><a class="btn sm gold" href="../gacha.html">ガチャへ</a></div>';
      return;
    }
    $("#gSel").innerHTML = '<img src="../img/t_' + UI().imgName(sel) + '.webp" alt=""><div><small>出発するキャラ</small><b>' + esc(C.nm) + ' <em class="cc-rar r-' + C.rank + '">' + C.rank + "</em></b><span>" + ic("el_" + C.el) + "Lv." + MA.Save.lvOf(sel) + "・" + D().CTYPE[C.type].nm + '</span></div><button class="btn sm" data-a="fac" data-v="chars">変更</button>';
  }

  /* ══════════════════════════════════════════════════════════════
     パネル（施設の画面）
     ══════════════════════════════════════════════════════════════ */
  function openFac(id) { MA.Audio.sfx("click"); if (id === "stages") { MA.Stages.open(); return; } openPanel(id); }
  function openPanel(id, arg) {
    const f = PANELS[id]; if (!f) return;
    const r = f(arg);
    if (!r) return;
    const m = UI().modal(r.html, { wide: r.wide !== false, tall: r.tall, cls: "pn pn-" + id, onClose: () => { renderTop(); } });
    m.dataset.panel = id;
    if (r.after) r.after(m);
    return m;
  }
  function refresh(m, id, arg) {
    const f = PANELS[id]; const r = f(arg);
    const inner = m.querySelector(".mdl-in");
    const sc = inner.scrollTop;
    inner.innerHTML = '<button class="mdl-x" data-a="closeModal" aria-label="閉じる">' + ic("close") + "</button>" + r.html;
    inner.scrollTop = sc;
    if (r.after) r.after(m);
  }
  function refreshTop() { const m = UI().topModal(); if (m && m.dataset.panel) refresh(m, m.dataset.panel, m._arg); renderTop(); }
  function head(icon, title, sub, col) { return '<div class="pn-h">' + ic(icon, col) + "<div><b>" + esc(title) + "</b>" + (sub ? "<small>" + sub + "</small>" : "") + "</div></div>"; }
  const PANELS = {};

  /* ── 依頼掲示板 → 冒険の地図（ma-stages.js）── */
  function dunOpen(d) { return !d.unlock || (S().dun[d.unlock] && S().dun[d.unlock].clears > 0); }

  /* ── 探索準備 ──
     ★★ 2026-10-05 ノーマル／ハード（地図で選んだ難易度）・未所持のキャラでは出発できない（ご指定） */
  let prepMuts = [], prepDiff = "normal";
  PANELS.prep = (dunId) => {
    const s = S(), d = D().DUN[dunId];
    const cid = s.sel, C = D().CHARS[cid], own = MA.Save.owned(cid);
    const st = MA.Stats.compute(cid);
    const pw = MA.Stats.power(st);
    const dr = s.dun[dunId] || {};
    const hard = prepDiff === "hard";
    const MD = D().MODES[prepDiff];
    const recLv = d.rec.lv + (MD.recAdd || 0), recPw = Math.round(d.rec.power * (hard ? 1.9 : 1));
    const mutOpen = dr.clears > 0;
    const gear = MA.Stats.gearOf(cid, s);
    const slots = D().SLOT_KEYS.map((sl) => { const g = own ? gear.find((x) => D().GEAR[x.id].slot === sl) : null; return '<div class="slot' + (g ? "" : " empty") + '" style="--rc:' + (g ? D().RAR[g.rar].c : "#555") + '">' + ic(D().SLOTS[sl].ic, g ? D().RAR[g.rar].c : "#666") + "<small>" + (g ? esc(D().GEAR[g.id].nm) + (g.lv ? " +" + g.lv : "") : D().SLOTS[sl].nm + "（なし）") + "</small></div>"; }).join("");
    const rewardK = 1 + prepMuts.reduce((a, k) => a + D().MUTATIONS[k].reward, 0);
    const html = head("door", "探索準備" + (hard ? "（ハード）" : ""), esc(d.nm) + "・推奨 Lv." + recLv + "／戦力 " + fmt(recPw), hard ? "#ff5a6a" : d.c) +
      '<div class="prep' + (hard ? " hard" : "") + '">' +
      (hard ? '<div class="pr-hard">' + ic("hard") + "<b>ハード</b><span>" + esc(MD.d) + "</span></div>" : "") +
      '<div class="pr-char"><img src="../img/t_' + UI().imgName(cid) + '.webp" alt=""><canvas id="prSprite" width="48" height="60"></canvas><div><b>' + esc(C.nm) + ' <em class="cc-rar r-' + C.rank + '">' + C.rank + "</em></b><small>" + ic("el_" + C.el) + D().ELEM[C.el].nm + "・" + esc(C.title) + "・" + D().CTYPE[C.type].nm + "</small><span>Lv." + st.lv + '　戦力 <b class="' + (pw >= recPw ? "ok" : "ng") + '">' + fmt(pw) + '</b></span><button class="btn sm" data-a="fac" data-v="chars">キャラを変える</button></div></div>' +
      '<div class="pr-sec">装備</div><div class="slots">' + slots + '</div><button class="btn sm ghost" data-a="panel" data-v="storage">装備を変更</button>' +
      '<div class="pr-sec">ダンジョン変異 ' + (mutOpen ? "<small>（報酬 ×" + rewardK.toFixed(2) + "）</small>" : "<small>（この迷宮を1回クリアすると選べます）</small>") + '</div><div class="muts">' +
      Object.keys(D().MUTATIONS).map((k) => { const M = D().MUTATIONS[k]; const on = prepMuts.indexOf(k) >= 0; return '<button class="mut' + (on ? " on" : "") + '" data-a="togMut" data-v="' + k + '" data-d="' + dunId + '"' + (mutOpen ? "" : " disabled") + "><b>" + esc(M.nm) + "</b><small>" + esc(M.d) + (M.reward ? "・報酬+" + Math.round(M.reward * 100) + "%" : "") + "</small></button>"; }).join("") +
      '</div><div class="pr-sec">持ちこみ</div><div class="carry">' +
      [["potion", "回復薬"], ["elixir", "エリクサー"], ["reroll", "運命のダイス（引き直し）"], ["banish", "忘却の砂（とばす）"]].map(([k, n]) => '<span>' + ic(k === "reroll" ? "dice" : k === "banish" ? "sand" : k) + esc(n) + " <b>×" + Math.min(k === "elixir" ? 1 : 3, s.items[k] || 0) + "</b></span>").join("") +
      '<button class="btn sm ghost" data-a="panel" data-v="shop">店で買う</button></div>' +
      '<p class="hint">探索は1回 10〜30分ほど。鍵を3つ集めるとボスの扉が開きます。早くクリアするとクリア時間のミッションでジェムがもらえます。途中で閉じても次に開いたときに再開できます。</p>' +
      (own ? '<button class="btn gold big' + (hard ? " hardgo" : "") + '" data-a="go" data-v="' + dunId + '">' + ic("door") + (hard ? "ハードで" : "") + "出発する</button>"
        : '<div class="locked">' + ic("lock") + "このキャラは持っていないので出発できません。「キャラを変える」から選んでください</div>") + "</div>";
    return { html, after: (m) => { m._arg = dunId; drawSpritePreview($("#prSprite", m), cid); } };
  };
  function drawSpritePreview(c, cid, mode) {
    if (!c) return;
    const sp = MA.Pix.charSprite(cid);
    const g = c.getContext("2d"); g.imageSmoothingEnabled = false;
    let t = 0;
    const loop = () => {
      if (!c.isConnected) return;
      t += 1 / 60;
      g.clearRect(0, 0, c.width, c.height);
      /* demo … 待機 → 正面に歩く → 横に走る → 攻撃 をくり返す */
      const ph = mode === "demo" ? Math.floor(t / 1.6) % 4 : 0;
      let f, flip = false;
      if (ph === 1) f = sp.walk[Math.floor(t * 9) % 4];
      else if (ph === 2 && sp.side) { f = sp.side[Math.floor(t * 10) % 4]; flip = Math.floor(t / 1.6 / 4) % 2 === 1; }
      else if (ph === 3) f = Math.floor(t * 6) % 2 ? sp.atk : sp.idle[0];
      else f = sp.idle[(t % 3.2) > 3.05 ? 2 : Math.floor(t * 2) % 2];
      const k = Math.floor(Math.min(c.width / sp.w, c.height / sp.h));
      const x = Math.round((c.width - f.width * k) / 2), y = Math.round(c.height - f.height * k);
      if (flip) { g.save(); g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(f, x, y, f.width * k, f.height * k); g.restore(); }
      else g.drawImage(f, x, y, f.width * k, f.height * k);
      requestAnimationFrame(loop);
    };
    loop();
  }

  /* ── キャラクター一覧（酒場）──
     ★★ 2026-10-05 未所持のキャラは選べない（ご指定）。使えるのは XEVARION の
       極彩祭・極煌祭・極華祭のキャラだと、ひと目でわかるように表記する（ご指定）。 */
  /* ★★ 2026-10-07 Sapphire Breeze（UR）も使える（ご指定） */
  const FES_CLS = { "極彩祭": "f1", "極煌祭": "f2", "極華祭": "f3", "Sapphire Breeze": "f4" };
  function fesBadge(C) { return '<em class="fes ' + (FES_CLS[C.fes] || "") + '">' + esc(C.fes) + "</em>"; }
  function fesInfo() {
    return '<div class="fes-info">' + ic("star", "#ffd84a") + '<div><b>MagiAbyss で使えるキャラ</b><small>XEVARION のガチャ <em class="fes f4">Sapphire Breeze</em><em class="fes f1">極彩祭</em><em class="fes f2">極煌祭</em><em class="fes f3">極華祭</em> で手に入るキャラ（' + D().CHAR_ORDER.length + "人）。持っているキャラだけで遊べます。凸は XEVARION と共通・レベルはこのアプリだけ。</small></div>" +
      '<a class="btn sm gold" href="../gacha.html">ガチャへ</a></div>';
  }
  let charFilter = "all";
  PANELS.chars = () => {
    const s = S();
    const ownN = D().CHAR_ORDER.filter((id) => MA.Save.owned(id)).length;
    const list = D().CHAR_ORDER.filter((id) => {
      const C = D().CHARS[id];
      if (charFilter === "all") return true;
      if (charFilter === "own") return MA.Save.owned(id);
      if (/^fes:/.test(charFilter)) return C.fes === charFilter.slice(4);
      return C.el === charFilter;
    });
    const tabs = [["all", "すべて"], ["own", "所持（" + ownN + "）"], ["fes:Sapphire Breeze", "Sapphire"], ["fes:極彩祭", "極彩祭"], ["fes:極煌祭", "極煌祭"], ["fes:極華祭", "極華祭"]].concat(D().ELEM_KEYS.map((k) => [k, D().ELEM[k].nm]));
    const html = head("person", "キャラクター一覧（酒場）", "押すとくわしい性能。持っているキャラだけ出発できます", "#ff6a5a") + fesInfo() +
      '<div class="tabs">' + tabs.map(([k, n]) => '<button class="tab' + (charFilter === k ? " on" : "") + '" data-a="charFilter" data-v="' + k + '">' + (D().ELEM[k] ? ic("el_" + k) : "") + esc(n) + "</button>").join("") + "</div>" +
      '<div class="cgrid">' + list.map((id) => {
        const C = D().CHARS[id], own = MA.Save.owned(id), awk = MA.Save.awkOf(id), lv = MA.Save.lvOf(id);
        const st = MA.Stats.compute(id);
        const Ad = D().ARTS[C.art.k], Tr = D().TRAITS[C.trait.k];
        return '<button class="cc' + (s.sel === id ? " sel" : "") + (own ? "" : " lock") + '" data-a="charDet" data-v="' + id + '" style="--c:' + D().ELEM[C.el].c + '">' +
          '<img src="../img/t_' + UI().imgName(id) + '.webp" alt="" loading="lazy">' +
          '<span class="cc-rar r-' + C.rank + '">' + C.rank + "</span>" + (awk ? '<span class="cc-awk">' + "◆".repeat(awk) + "</span>" : "") +
          '<span class="cc-el">' + ic("el_" + C.el) + (C.el2 ? ic("el_" + C.el2) : "") + "</span>" +
          (own ? (s.sel === id ? '<span class="cc-now">出発中</span>' : "") : '<span class="cc-lock">' + ic("lock") + "未所持</span>") +
          '<div class="cc-b"><b>' + esc(C.nm) + "</b>" + fesBadge(C) + "<small>" + D().CTYPE[C.type].nm + "</small>" +
          '<span class="cc-kit">' + ic(UI().kitIc(C, "skill")) + ic(Ad.ic) + ic("ultc", D().ELEM[C.el].c) + ic(Tr.ic) + "</span>" +
          '<span class="cc-st">' + ic("st_hp") + st.hp + " " + ic("st_atk") + st.atk + " " + ic("st_def") + st.def + "</span>" +
          "<em>" + (own ? "Lv." + lv + "・戦力 " + fmt(MA.Stats.power(st)) : "XEVARION のガチャで入手") + "</em></div></button>";
      }).join("") + "</div>";
    return { html };
  };
  /* ── キャラ詳細 ──
     ★★ 2026-10-05 性能をアイコンで見やすく（ご指定）。技の組み合わせ（スキル・技・必殺技・特性・パッシブ）を
       それぞれの具体的なアイコン＋★（グレード）で。凸の効果・属性の相性も表にする。 */
  const STAT_IC = { hp: "st_hp", atk: "st_atk", def: "st_def", spd: "st_spd", aspd: "haste", crit: "crit", critDmg: "power", mag: "arcana", eva: "dashup" };
  function stars(gr) { return '<span class="kgr">' + "★".repeat(gr) + "<i>" + "★".repeat(5 - gr) + "</i></span>"; }
  PANELS.charDet = (id) => {
    const s = S(), C = D().CHARS[id], own = MA.Save.owned(id), awk = MA.Save.awkOf(id), lv = MA.Save.lvOf(id);
    const st = MA.Stats.compute(id);
    const rec = s.chars[id] || { xp: 0 };
    const nx = MA.Save.xpFor(lv + 1), cur = MA.Save.xpFor(lv);
    const xpPct = lv >= D().CHAR_MAX_LV ? 100 : Math.round((rec.xp - cur) / (nx - cur) * 100);
    const elC = D().ELEM[C.el].c;
    const Ad = D().ARTS[C.art.k], Tr = D().TRAITS[C.trait.k];
    const gm = (g) => D().GRADE_MUL[g] || 1;
    const stat = (k, nm, v, max) => '<div class="cs"><span>' + ic(STAT_IC[k]) + "</span><small>" + nm + "</small><b>" + v + '</b><i style="--w:' + Math.min(100, Math.round(max)) + '%"></i></div>';
    const kit = (cls, icn, col, lab, nm, d, extra) => '<div class="kit ' + cls + '"><span class="kit-ic">' + ic(icn, col) + '</span><div><small>' + lab + "</small><b>" + esc(nm) + "</b>" + (extra || "") + "<p>" + d + "</p></div></div>";
    /* 属性の相性（このキャラの攻撃 → 敵の属性） */
    const rel = D().ELEM_KEYS.map((e) => { const r = D().elemRel(C.el, e); return '<span class="er ' + r + '">' + ic("el_" + e) + D().ELEM[e].nm + "<b>" + (r === "adv" ? "×1.25" : r === "dis" ? "×0.75" : "×1") + "</b></span>"; }).join("");
    const html = '<div class="cdet" style="--c:' + elC + '">' +
      (function () { const w = typeof wideArt === "function" ? wideArt(id) : null; return '<div class="cd-top' + (w ? " wide" : "") + '"><div class="cd-art"><img src="' + (w || "../img/" + UI().imgName(id) + ".webp") + '" alt=""><canvas id="cdSprite" width="96" height="120"></canvas></div>'; })() +
      '<div class="cd-info">' + fesBadge(C) + '<small class="cd-ttl">' + esc(C.title) + '</small><b class="cd-nm">' + esc(C.nm) + ' <span class="cc-rar r-' + C.rank + '">' + C.rank + "</span></b>" +
      '<div class="cd-tags"><i class="el" style="--c:' + elC + '">' + ic("el_" + C.el) + D().ELEM[C.el].nm + (C.el2 ? "＆" + D().ELEM[C.el2].nm : "") + '属性</i><i style="--c:' + D().CTYPE[C.type].c + '">' + D().CTYPE[C.type].nm + "</i>" + (C.sub ? '<i style="--c:' + D().CTYPE[C.sub].c + '">' + D().CTYPE[C.sub].nm + "</i>" : "") + "</div>" +
      '<div class="cd-lv">' + (own ? "Lv." + lv + ' <span class="xpbar"><i style="width:' + xpPct + '%"></i></span> <small>凸 ' + awk + "/4（XEVARION と共通）</small>" : '<span class="ng">' + ic("lock") + "未所持（XEVARION の" + esc(C.fes) + "で手に入ります）</span>") + "</div>" +
      '<div class="cd-pow">戦力 <b>' + fmt(MA.Stats.power(st)) + "</b>" + (C.rank === "UR" ? '<small class="ur">UR：全能力 ×' + D().RANK.UR.mul + "</small>" : "") + "</div>" +
      '<div class="row">' + (own ? '<button class="btn gold" data-a="selChar" data-v="' + id + '"' + (s.sel === id ? " disabled" : "") + ">" + (s.sel === id ? "出発キャラに選択中" : "このキャラで出発") + "</button>" +
        '<button class="btn" data-a="panel" data-v="tree" data-x="' + id + '">' + ic("tree") + 'スキルツリー</button><button class="btn" data-a="panel" data-v="storage" data-x="' + id + '">' + ic("armor") + "装備</button>"
        : '<a class="btn gold" href="../gacha.html">' + ic("star") + "XEVARION のガチャへ</a>") + "</div></div></div>" +
      '<div class="cd-sec">能力（Lv.' + st.lv + "）</div>" +
      '<div class="cd-stats">' + stat("hp", "HP", st.hp, st.hp / 40) + stat("atk", "攻撃力", st.atk, st.atk / 3) + stat("def", "防御力", st.def, st.def * 3) + stat("spd", "移動速度", Math.round(st.spd), st.spd / 1.2) +
        stat("aspd", "攻撃速度", "×" + st.aspd.toFixed(2), st.aspd * 60) + stat("crit", "会心率", st.crit + "%", st.crit * 2.5) + stat("critDmg", "会心ダメージ", "×" + st.critDmg.toFixed(2), st.critDmg * 40) + stat("mag", "魔法威力", "×" + st.mag.toFixed(2), st.mag * 55) + stat("eva", "回避", st.eva, st.eva * 3) + "</div>" +
      '<div class="cd-sec">技の組み合わせ<small>★ が多いほど強い（5段階）</small></div><div class="kits">' +
      kit("atk", UI().kitIc(C, "atk"), elC, "通常攻撃（いつも出る）", C.atk.nm, esc(C.atk.d)) +
      kit("sk", UI().kitIc(C, "skill"), null, "スキル" + (own ? " ［" + MA.Input.keyLabel("skill") + "］" : ""), C.skill.nm, esc(C.skill.d), '<span class="kch">' + ic("st_time") + C.skill.cd + "秒 " + ic("burst") + "MP " + C.skill.mp + "</span>") +
      kit("art", Ad.ic, null, "技" + (own ? " ［" + MA.Input.keyLabel("burst") + "］" : ""), Ad.nm, esc(Ad.d(gm(C.art.g) * (1 + (st.art || 0)))), stars(C.art.g) + '<span class="kch">' + ic("st_time") + Ad.cd + "秒 " + ic("burst") + "MP " + Ad.mp + "</span>") +
      kit("ult", "ultc", elC, "必殺技" + (own ? " ［" + MA.Input.keyLabel("ult") + "］" : ""), C.ult.nm, esc(C.ult.d), '<span class="kch">' + ic("ult") + "ゲージ100%（敵を倒す・ダメージを与える・戦闘中の時間でたまる）</span>") +
      kit("tr", Tr.ic, null, "特性（いつも効く）", Tr.nm, esc(Tr.d(gm(C.trait.g)))) +
      kit("ps", UI().kitIc(C, "passive"), null, "パッシブ", C.passive.nm, esc(C.passive.d)) +
      kit("evo", "star", "#ff6aa8", "専用進化", D().EVOS[C.evo.to].nm, esc(D().ELEM[C.evo.el].nm + "の" + D().WEAPONS[C.evo.weapon].nm + " を Lv7 にすると進化：" + D().EVOS[C.evo.to].d)) +
      "</div>" +
      '<div class="cd-sec">属性の相性<small>' + esc(C.nm) + "の攻撃が、その属性の敵に与えるダメージ</small></div><div class=\"cd-rel\">" + rel + "</div>" +
      '<div class="cd-gw"><div><span class="ok">得意</span>' + esc(C.good) + '</div><div><span class="ng">苦手</span>' + esc(C.weak) + '</div><div><span>成長</span>' + esc(Object.keys(C.bias).map((k) => D().CAT[k]).join("・")) + " がレベルアップの候補に出やすい</div></div>" +
      '<div class="cd-sec">凸の効果<small>XEVARION のガチャで同じキャラを引くと凸（最大4）</small></div><div class="cd-awk">' +
      D().AWK.slice(1).map((a, i) => '<span class="' + (awk > i ? "on" : "") + '">' + ic(awk > i ? "check" : "star", awk > i ? null : "#5a4a8a") + "<b>" + (i + 1) + "凸</b>" + esc(a.d) + "</span>").join("") + "</div>" +
      "</div>";
    return { html, after: (m) => { m._arg = id; drawSpritePreview($("#cdSprite", m), id, "demo"); } };
  };

  /* ── 冒険者情報：育成（キャラをえらんでスキルツリー）── */
  PANELS.train = () => {
    const html = head("tree", "冒険者情報", "キャラクターの育成・スキルツリー", "#c27bff") +
      '<div class="cgrid sm">' + D().CHAR_ORDER.map((id) => { const C = D().CHARS[id], own = MA.Save.owned(id); const sp = own ? MA.Save.spOf(id) : null; return '<button class="cc' + (own ? "" : " lock") + '" data-a="' + (own ? "treeOf" : "charDet") + '" data-v="' + id + '"><img src="../img/t_' + UI().imgName(id) + '.webp" alt="" loading="lazy"><div class="cc-b"><b>' + esc(C.nm) + "</b><em>" + (own ? "Lv." + MA.Save.lvOf(id) + (sp.left ? '・<span class="sp">SP ' + sp.left + "</span>" : "") : "未所持") + "</em></div></button>"; }).join("") + "</div>";
    return { html };
  };
  PANELS.tree = (id) => {
    id = id || S().sel;
    const C = D().CHARS[id], rec = MA.Save.charRec(id), sp = MA.Save.spOf(id);
    const br = Object.keys(D().TREE_BR).map((b) => '<div class="tr-br"><div class="tr-bh" style="--c:' + D().TREE_BR[b].c + '">' + D().TREE_BR[b].nm + "</div>" +
      D().TREE.filter((n) => n.br === b).map((n) => {
        const has = !!rec.tree[n.id], can = !has && n.req.every((r) => rec.tree[r]) && sp.left >= n.cost;
        const fx = Object.keys(n.fx).map((k) => ({ atk: "攻撃力+" + Math.round(n.fx[k] * 100) + "%", crit: "会心率+" + n.fx[k] + "%", aspd: "攻撃速度+" + Math.round(n.fx[k] * 100) + "%", critDmg: "会心ダメージ+" + Math.round(n.fx[k] * 100) + "%", hp: "最大HP+" + Math.round(n.fx[k] * 100) + "%", def: "防御力+" + n.fx[k], regen: "毎秒HP+" + n.fx[k], skill: "固有スキルの威力+" + Math.round(n.fx[k] * 100) + "%", mp: "MPの回復・最大MPアップ", cdr: "再使用-" + Math.round(n.fx[k] * 100) + "%", passive: "パッシブが強くなる", ult: "必殺技の威力+" + Math.round(n.fx[k] * 100) + "%", ultCharge: "必殺技ゲージのたまり+" + Math.round(n.fx[k] * 100) + "%", shieldStart: "探索開始時に最大HPの" + Math.round(n.fx[k] * 100) + "%のバリア" }[k] || k)).join("・");
        return '<button class="tr-n' + (has ? " on" : can ? " can" : "") + '" data-a="learn" data-v="' + n.id + '" data-c="' + id + '"' + (has || !can ? " disabled" : "") + '><b>' + esc(n.nm) + "</b><small>" + esc(fx) + "</small><i>" + (has ? "習得" : "SP " + n.cost) + "</i></button>";
      }).join('<span class="tr-ln"></span>') + "</div>").join("");
    const html = head("tree", C.nm + " のスキルツリー", "スキルポイント（レベル1つで1）：のこり <b>" + sp.left + "</b> ／ " + sp.total, "#c27bff") +
      '<div class="tree">' + br + '</div><div class="row c"><button class="btn ghost sm" data-a="treeReset" data-v="' + id + '">ふりなおす（500G）</button></div>';
    return { html, after: (m) => { m._arg = id; } };
  };

  /* ── 倉庫：装備管理とアイテム ── */
  let storTab = "gear", storSlot = "all", storChar = null;
  PANELS.storage = (cidArg) => {
    const s = S();
    const cid = storChar || cidArg || s.sel;
    const tabs = '<div class="tabs"><button class="tab' + (storTab === "gear" ? " on" : "") + '" data-a="storTab" data-v="gear">装備管理</button><button class="tab' + (storTab === "items" ? " on" : "") + '" data-a="storTab" data-v="items">アイテム一覧</button></div>';
    if (storTab === "items") return { html: head("chest", "倉庫", "", "#9ab0ff") + tabs + itemsHTML() };
    const own = MA.Save.owned(cid);
    const eq = s.eq[cid] || {};
    const slotsHTML = D().SLOT_KEYS.map((sl) => { const g = s.gear[eq[sl]]; return '<button class="slot' + (g ? "" : " empty") + (storSlot === sl ? " sel" : "") + '" data-a="storSlot" data-v="' + sl + '" style="--rc:' + (g ? D().RAR[g.rar].c : "#555") + '">' + ic(D().SLOTS[sl].ic, g ? D().RAR[g.rar].c : "#777") + "<small>" + D().SLOTS[sl].nm + "</small><b>" + (g ? esc(D().GEAR[g.id].nm) + (g.lv ? " +" + g.lv : "") : "なし") + "</b></button>"; }).join("");
    const list = Object.keys(s.gear).filter((u) => storSlot === "all" || D().GEAR[s.gear[u].id].slot === storSlot)
      .sort((a, b) => D().RAR_KEYS.indexOf(s.gear[b].rar) - D().RAR_KEYS.indexOf(s.gear[a].rar) || s.gear[b].lv - s.gear[a].lv);
    const inv = list.length ? list.map((u) => gearRow(u, cid)).join("") : '<p class="empty">装備がありません。宝箱・ショップ・鍛冶屋で手に入ります。</p>';
    const st = MA.Stats.compute(cid);
    const html = head("armor", "倉庫：装備管理", "キャラごとに 6枠（武器・防具・指輪・護符・靴・魔導具）", "#9ab0ff") + tabs +
      '<div class="stor-char"><select data-a="storChar">' + D().CHAR_ORDER.filter((id) => MA.Save.owned(id)).map((id) => '<option value="' + id + '"' + (id === cid ? " selected" : "") + ">" + esc(D().CHARS[id].nm) + "</option>").join("") + "</select>" +
      '<span>戦力 <b>' + fmt(MA.Stats.power(st)) + "</b>　HP " + st.hp + "・攻 " + st.atk + "・防 " + st.def + "・会心 " + st.crit + "%</span></div>" +
      (own ? "" : '<p class="warn">このキャラは未所持のため装備できません（おためしは装備なし）</p>') +
      '<div class="slots big">' + slotsHTML + "</div>" +
      '<div class="tabs sm"><button class="tab' + (storSlot === "all" ? " on" : "") + '" data-a="storSlot" data-v="all">すべて</button>' + D().SLOT_KEYS.map((sl) => '<button class="tab' + (storSlot === sl ? " on" : "") + '" data-a="storSlot" data-v="' + sl + '">' + D().SLOTS[sl].nm + "</button>").join("") + "</div>" +
      '<div class="glist">' + inv + "</div>";
    return { html, after: (m) => { m._arg = cid; storChar = cid; } };
  };
  function gearText(g) {
    const st = MA.Stats.gearStat(g);
    const nm = { hp: "HP", atk: "攻撃", def: "防御", spd: "移動", aspd: "攻撃速度", crit: "会心", critDmg: "会心ダメ", mag: "魔法", eva: "回避", regen: "回復/秒", drain: "吸収", cdr: "再使用短縮", exp: "経験値", magnet: "拾う範囲", mp: "MP回復", dash: "ダッシュ+", vision: "視界", summon: "精霊", reveal: "宝箱表示" };
    return Object.keys(st).map((k) => (nm[k] || k) + (k === "aspd" || k === "mag" || k === "drain" || k === "cdr" || k === "exp" || k === "magnet" || k === "critDmg" || k === "vision" ? " +" + Math.round(st[k] * 100) + "%" : k === "reveal" || k === "summon" ? "" : " +" + st[k])).join("・");
  }
  function gearRow(u, cid) {
    const s = S(), g = s.gear[u], gd = D().GEAR[g.id], who = MA.Save.gearOwner(u);
    const mine = who === cid;
    return '<div class="gi" style="--rc:' + D().RAR[g.rar].c + '">' + ic(D().SLOTS[gd.slot].ic, D().RAR[g.rar].c) +
      '<div class="gi-b"><b>' + esc(gd.nm) + (g.lv ? ' <span class="plus">+' + g.lv + "</span>" : "") + ' <span class="c-rar" style="--rc:' + D().RAR[g.rar].c + '">' + g.rar + "</span>" + (gd.el ? ' <i class="el" style="--c:' + D().ELEM[gd.el].c + '">' + D().ELEM[gd.el].nm + "</i>" : "") + (g.nw ? ' <span class="new">NEW</span>' : "") + "</b><small>" + esc(gearText(g)) + "</small><small class='gd'>" + esc(gd.d) + "</small></div>" +
      (who && !mine ? '<span class="gi-who">' + esc(D().CHARS[who].nm) + "が装備中</span>" : "") +
      (mine ? '<button class="btn sm ghost" data-a="unequip" data-v="' + gd.slot + '">はずす</button>' : '<button class="btn sm" data-a="equip" data-v="' + u + '">装備</button>') + "</div>";
  }
  function itemsHTML() {
    const s = S();
    const mats = Object.keys(D().MATS).map((k) => '<div class="it">' + ic("mat", D().MATS[k].c) + "<div><b>" + esc(D().MATS[k].nm) + ' <span class="cnt">×' + fmt(s.mats[k] || 0) + "</span></b><small>" + esc(D().MATS[k].d) + "</small></div></div>").join("");
    const items = Object.keys(D().SHOP_ITEMS).filter((k) => k !== "stonePack").map((k) => '<div class="it">' + ic(k === "reroll" ? "dice" : k === "banish" ? "sand" : k) + "<div><b>" + esc(D().SHOP_ITEMS[k].nm) + ' <span class="cnt">×' + (s.items[k] || 0) + "</span></b><small>" + esc(D().SHOP_ITEMS[k].d) + "</small></div></div>").join("");
    return '<div class="pr-sec">素材</div><div class="items">' + mats + '</div><div class="pr-sec">道具</div><div class="items">' + items + '</div><div class="pr-sec">お金</div><div class="items"><div class="it">' + ic("gold") + "<div><b>ゴールド <span class='cnt'>" + fmt(s.gold) + "</span></b><small>ギルドで使えるお金</small></div></div></div>";
  }
  PANELS.items = () => ({ html: head("chest", "アイテム一覧", "", "#9ab0ff") + itemsHTML() });

  /* ── 鍛冶屋 ── */
  let smithTab = "up", smithSel = null;
  const CRAFT = [
    { id: "windcharm", cost: { gold: 500, sap: 6, stone: 10 }, d: "烈風火輪の鍵" },
    { id: "galeboots", cost: { gold: 600, sap: 4, shard: 4, stone: 10 }, d: "迅雷双刃・疾風の矢の鍵" },
    { id: "starring", cost: { gold: 800, shard: 6, stone: 12 }, d: "星雷連鎖の鍵" },
    { id: "soulcharm", cost: { gold: 900, core: 6, stone: 12 }, d: "深影乱舞の鍵" },
    { id: "haloring", cost: { gold: 900, page: 6, stone: 12 }, d: "光輪の書の鍵" },
    { id: "lantern", cost: { gold: 700, shard: 8, stone: 10 }, d: "暗い迷宮で見える範囲が広がる" },
    { id: "compass", cost: { gold: 700, sap: 8, stone: 10 }, d: "宝箱がミニマップに出る" },
    { id: "aquaBow", cost: { gold: 900, shard: 6, stone: 14 }, d: "水の星弓（タキナ専用進化の素）" },
    { id: "fireTome", cost: { gold: 900, core: 6, stone: 14 }, d: "炎の魔導書（烈風火輪・ココハ専用進化の素）" },
    { id: "thunderStaff", cost: { gold: 900, page: 6, stone: 14 }, d: "雷の魔導杖（星雷連鎖の素）" },
    { id: "shadowDagger", cost: { gold: 900, abyss: 6, stone: 14 }, d: "影の双短剣（深影乱舞の素）" },
  ];
  function enhCost(g) { const rk = D().RAR_KEYS.indexOf(g.rar) + 1; const n = g.lv + 1; const c = { gold: Math.round(80 * n * n * rk), stone: 2 * n + rk }; if (n >= 8) c.crystal = n - 7; return c; }
  function costHTML(c) { return Object.keys(c).map((k) => { const have = k === "gold" ? S().gold : (S().mats[k] || 0); return '<span class="' + (have >= c[k] ? "" : "ng") + '">' + (k === "gold" ? ic("gold") : ic("mat", D().MATS[k].c)) + fmt(c[k]) + "</span>"; }).join(""); }
  PANELS.smith = () => {
    const s = S();
    const max = 2 + (s.fac.smith || 0) * 2;
    const tabs = '<div class="tabs">' + [["up", "強化"], ["craft", "作成"], ["salvage", "分解"]].map(([k, n]) => '<button class="tab' + (smithTab === k ? " on" : "") + '" data-a="smithTab" data-v="' + k + '">' + n + "</button>").join("") + "</div>";
    let body = "";
    if (smithTab === "up") {
      const list = Object.keys(s.gear).sort((a, b) => D().RAR_KEYS.indexOf(s.gear[b].rar) - D().RAR_KEYS.indexOf(s.gear[a].rar) || s.gear[b].lv - s.gear[a].lv);
      body = '<p class="hint">強化の上限は <b>+' + max + "</b>（鍛冶場 Lv" + (s.fac.smith || 0) + "）。受付で鍛冶場を強化すると上がります。+8 からは星脈結晶が必要です。</p>" +
        (list.length ? '<div class="glist">' + list.map((u) => { const g = s.gear[u], gd = D().GEAR[g.id], c = enhCost(g); return '<div class="gi" style="--rc:' + D().RAR[g.rar].c + '">' + ic(D().SLOTS[gd.slot].ic, D().RAR[g.rar].c) + '<div class="gi-b"><b>' + esc(gd.nm) + ' <span class="plus">+' + g.lv + '</span> <span class="c-rar" style="--rc:' + D().RAR[g.rar].c + '">' + g.rar + "</span></b><small>" + esc(gearText(g)) + "</small>" + (g.lv < max ? '<small class="cost">' + costHTML(c) + "</small>" : "<small>上限</small>") + "</div>" + (g.lv < max ? '<button class="btn sm gold" data-a="enhance" data-v="' + u + '"' + (MA.Save.hasCost(c) ? "" : " disabled") + ">+" + (g.lv + 1) + "</button>" : "") + "</div>"; }).join("") + "</div>" : '<p class="empty">装備がありません。</p>');
    } else if (smithTab === "craft") {
      body = '<p class="hint">素材から装備を作ります（R）。星脈結晶を1つ足すと SR で作れます。共鳴の鍵になる装備もここで作れます。</p><div class="glist">' + CRAFT.map((r) => { const gd = D().GEAR[r.id]; const c2 = Object.assign({}, r.cost, { crystal: 1 }); return '<div class="gi" style="--rc:#5ab8ff">' + ic(D().SLOTS[gd.slot].ic, gd.el ? D().ELEM[gd.el].c : null) + '<div class="gi-b"><b>' + esc(gd.nm) + "</b><small>" + esc(r.d) + "・" + esc(gd.d) + '</small><small class="cost">' + costHTML(r.cost) + '</small></div><button class="btn sm" data-a="craft" data-v="' + r.id + '"' + (MA.Save.hasCost(r.cost) ? "" : " disabled") + '>R</button><button class="btn sm gold" data-a="craftSR" data-v="' + r.id + '"' + (MA.Save.hasCost(c2) ? "" : " disabled") + ">SR</button></div>"; }).join("") + "</div>";
    } else {
      const val = { N: 2, R: 5, SR: 12, SSR: 30, UR: 80 };
      const list = Object.keys(s.gear).filter((u) => !MA.Save.gearOwner(u));
      body = '<p class="hint">だれも装備していない装備を分解して魔石にします（N 2・R 5・SR 12・SSR 30・UR 80）。分解は元にもどせません。</p>' + (list.length ? '<div class="glist">' + list.map((u) => { const g = s.gear[u], gd = D().GEAR[g.id]; return '<div class="gi" style="--rc:' + D().RAR[g.rar].c + '">' + ic(D().SLOTS[gd.slot].ic, D().RAR[g.rar].c) + '<div class="gi-b"><b>' + esc(gd.nm) + (g.lv ? " +" + g.lv : "") + ' <span class="c-rar" style="--rc:' + D().RAR[g.rar].c + '">' + g.rar + "</span></b><small>魔石 ×" + (val[g.rar] + g.lv * 2) + '</small></div><button class="btn sm danger" data-a="salvage" data-v="' + u + '">分解</button></div>'; }).join("") + "</div>" : '<p class="empty">分解できる装備がありません（装備中のものは分解できません）。</p>');
    }
    return { html: head("hammer", "鍛冶屋", "鍛冶屋のガルド「いい素材、持ってきたか？」", "#ff8a3d") + tabs + body };
  };

  /* ── 魔導具店 ── */
  function shopStock() {
    const s = S(), day = MA.Save.today();
    if (s.shop.day === day && s.shop.stock.length) return s.shop.stock;
    const r = MA.Map.mkRng(Number(day.replace(/-/g, "")) * 7 + (s.shop.refresh || 0) * 101 + (s.fac.shop || 0));
    const lv = s.fac.shop || 0;
    const W = [[60, 35, 5, 0, 0], [45, 40, 13, 2, 0], [30, 42, 22, 6, 0], [18, 40, 30, 11, 1], [8, 35, 38, 17, 2], [0, 30, 45, 22, 3]][Math.min(5, lv)];
    const price = { N: 150, R: 400, SR: 1200, SSR: 3500, UR: 9000 };
    const stock = [];
    for (let i = 0; i < 6; i++) {
      let x = r() * 100, rar = "N"; for (let k = 0; k < 5; k++) { x -= W[k]; if (x <= 0) { rar = D().RAR_KEYS[k]; break; } }
      const id = D().GEAR_KEYS[Math.floor(r() * D().GEAR_KEYS.length)];
      stock.push({ id, rar, price: price[rar], sold: false });
    }
    if (s.shop.day !== day) s.shop.refresh = 0;
    s.shop.day = day; s.shop.stock = stock;
    MA.Save.saveSoon();
    return stock;
  }
  PANELS.shop = () => {
    const s = S(), st = shopStock();
    const gear = st.map((x, i) => { const gd = D().GEAR[x.id]; return '<div class="gi' + (x.sold ? " sold" : "") + '" style="--rc:' + D().RAR[x.rar].c + '">' + ic(D().SLOTS[gd.slot].ic, D().RAR[x.rar].c) + '<div class="gi-b"><b>' + esc(gd.nm) + ' <span class="c-rar" style="--rc:' + D().RAR[x.rar].c + '">' + x.rar + "</span>" + (gd.el ? ' <i class="el" style="--c:' + D().ELEM[gd.el].c + '">' + D().ELEM[gd.el].nm + "</i>" : "") + "</b><small>" + esc(gearText({ id: x.id, rar: x.rar, lv: 0 })) + "</small><small class='gd'>" + esc(gd.d) + "</small></div>" + (x.sold ? "<span class='gi-who'>売り切れ</span>" : '<button class="btn sm gold" data-a="buyGear" data-v="' + i + '"' + (s.gold >= x.price ? "" : " disabled") + ">" + ic("gold") + fmt(x.price) + "</button>") + "</div>"; }).join("");
    const items = Object.keys(D().SHOP_ITEMS).map((k) => { const it = D().SHOP_ITEMS[k]; const have = s.items[k] || 0; const full = it.max && have >= it.max; return '<div class="gi">' + ic(k === "reroll" ? "dice" : k === "banish" ? "sand" : k === "stonePack" ? "mat" : k, k === "stonePack" ? D().MATS.stone.c : null) + '<div class="gi-b"><b>' + esc(it.nm) + (it.max ? ' <span class="cnt">' + have + "/" + it.max + "</span>" : "") + "</b><small>" + esc(it.d) + '</small></div><button class="btn sm gold" data-a="buyItem" data-v="' + k + '"' + (s.gold >= it.price && !full ? "" : " disabled") + ">" + ic("gold") + fmt(it.price) + "</button></div>"; }).join("");
    const rc = 200 * ((s.shop.refresh || 0) + 1);
    return { html: head("shop", "魔導具店", "店主のミント「今日の品ぞろえはこちらです♪」（毎日入れかわり）", "#7fd0ff") +
      '<div class="pr-sec">装備（店 Lv' + (s.fac.shop || 0) + '）<button class="btn sm ghost" data-a="shopRefresh"' + (s.gold >= rc ? "" : " disabled") + ">入れかえ " + ic("gold") + fmt(rc) + '</button></div><div class="glist">' + gear + '</div><div class="pr-sec">道具</div><div class="glist">' + items + "</div>" };
  };

  /* ── 資料室：図鑑 ── */
  let codexTab = "chars";
  PANELS.codex = () => {
    const s = S(), cx = s.codex;
    const tabs = '<div class="tabs">' + [["chars", "キャラ"], ["en", "敵"], ["boss", "ボス"], ["wp", "武器"], ["mg", "魔法"], ["gear", "装備"], ["res", "星脈共鳴"], ["lore", "古文書"], ["story", "ストーリー"]].map(([k, n]) => '<button class="tab' + (codexTab === k ? " on" : "") + '" data-a="codexTab" data-v="' + k + '">' + n + "</button>").join("") + "</div>";
    let body = "", cnt = "";
    const card = (on, iconH, nm, d) => '<div class="cx' + (on ? "" : " no") + '">' + iconH + "<div><b>" + (on ? esc(nm) : "？？？") + "</b><small>" + (on ? d : "まだ見つけていません") + "</small></div></div>";
    if (codexTab === "chars") { body = D().CHAR_ORDER.map((id) => { const C = D().CHARS[id]; return card(true, '<img class="cx-img" src="../img/t_' + UI().imgName(id) + '.webp" alt="" loading="lazy">', C.nm, esc(C.fes + "・" + C.title + "・" + D().CTYPE[C.type].nm) + (MA.Save.owned(id) ? "" : "（未所持）")); }).join(""); }
    else if (codexTab === "en") { const keys = Object.keys(D().ENEMIES); cnt = keys.filter((k) => cx.en[k]).length + "/" + keys.length; body = keys.map((k) => { const e = D().ENEMIES[k]; return card(!!cx.en[k], '<span class="cx-sp" data-art="' + e.art + '" data-col="' + e.col + '"></span>', e.nm, "撃破 " + fmt(cx.en[k] || 0) + "・" + D().ELEM[e.el].nm + "属性・" + { chase: "追跡型", charge: "突進型", ranged: "遠距離型", summon: "召喚型", guard: "防御型", hex: "妨害型", elite: "エリート型", swarm: "群体" }[e.ai]); }).join(""); }
    else if (codexTab === "boss") { const keys = Object.keys(D().BOSSES); cnt = keys.filter((k) => cx.boss[k]).length + "/" + keys.length; body = keys.map((k) => { const b = D().BOSSES[k]; return card(!!cx.boss[k], '<span class="cx-sp" data-art="' + b.art + '"></span>', b.nm, "討伐 " + (cx.boss[k] || 0) + "回・" + esc(b.gim.nm) + "：" + esc(b.gim.d)); }).join(""); }
    else if (codexTab === "wp") { const keys = D().WEAPON_KEYS.concat(Object.keys(D().EVOS)); cnt = keys.filter((k) => cx.wp[k]).length + "/" + keys.length; body = keys.map((k) => { const w = D().WEAPONS[k] || D().EVOS[k]; return card(!!cx.wp[k], ic(D().WEAPONS[k] ? k : w.base, D().EVOS[k] ? "#ff6aa8" : null), w.nm, esc(w.d)); }).join(""); }
    else if (codexTab === "mg") { const keys = D().MAGIC_KEYS; cnt = keys.filter((k) => cx.mg[k]).length + "/" + keys.length; body = keys.map((k) => card(!!cx.mg[k], ic(k), D().MAGICS[k].nm, esc(D().ELEM[D().MAGICS[k].el].nm + "属性・" + D().MAGICS[k].d))).join(""); }
    else if (codexTab === "gear") { const keys = D().GEAR_KEYS; cnt = keys.filter((k) => cx.gear[k] != null).length + "/" + keys.length; body = keys.map((k) => { const g = D().GEAR[k]; return card(cx.gear[k] != null, ic(D().SLOTS[g.slot].ic, cx.gear[k] != null ? D().RAR[D().RAR_KEYS[cx.gear[k]]].c : null), g.nm, esc(D().SLOTS[g.slot].nm + "・" + g.d) + (cx.gear[k] != null ? "（最高 " + D().RAR_KEYS[cx.gear[k]] + "）" : "")); }).join(""); }
    else if (codexTab === "res") { const keys = D().RESONANCES; cnt = keys.filter((r) => cx.res[r.id]).length + "/" + keys.length; body = keys.map((r) => card(!!cx.res[r.id], ic("star", r.c), r.nm, esc(r.d) + "<br><i>条件：" + esc(r.req.map((alts) => alts.map(tagName).join(" または ")).join(" ＋ ")) + "</i>（発動 " + (cx.res[r.id] || 0) + "回）")).join(""); }
    else if (codexTab === "lore") { cnt = D().LORE.filter((l) => cx.lore[l.id]).length + "/" + D().LORE.length; body = D().LORE.map((l) => card(!!cx.lore[l.id], ic("scroll"), l.nm, esc(l.d))).join(""); }
    else if (codexTab === "story") { body = D().STORY.map((st) => '<div class="cx' + (cx.story[st.id] ? "" : " no") + '">' + ic("book") + "<div><b>" + (cx.story[st.id] ? esc(st.nm) : "？？？") + "</b><small>" + (cx.story[st.id] ? '<button class="btn sm" data-a="story" data-v="' + st.id + '">もう一度読む</button>' : st.at ? esc(D().DUN[st.at].nm) + "をクリアすると読めます" : "") + "</small></div></div>").join(""); }
    return { html: head("book", "資料室：図鑑", cnt ? "発見 " + cnt : "", "#e8d080") + tabs + '<div class="codex">' + body + "</div>", after: (m) => { m.querySelectorAll(".cx-sp").forEach((el) => { const s2 = MA.Art.sprite(el.dataset.art, el.dataset.col || undefined); const f = s2.frames[0]; const c = MA.Pix.mkCanvas(f.width, f.height); c.getContext("2d").drawImage(f, 0, 0); c.className = "pxc"; if (el.closest(".no")) c.style.filter = "brightness(0)"; el.appendChild(c); }); } };
  };
  function tagName(t) {
    const p = t.split(":");
    if (p[0] === "weapon") return (p[2] ? D().ELEM[p[2]].nm + "の" : "") + D().WEAPONS[p[1]].nm;
    if (p[0] === "magic") return "魔法「" + D().MAGICS[p[1]].nm + "」";
    if (p[0] === "equip") { const g = D().GEAR[p[2]] || Object.values(D().GEAR).find((x) => x.tag === p[2]); return "装備「" + (g ? g.nm : p[2]) + "」"; }
    if (p[0] === "seal") return D().ELEM[p[1]].nm + "の刻印";
    if (p[0] === "stat") return "能力「" + D().STATS[p[1]].nm + "」";
    if (p[0] === "char") return D().CHARS[p[1]].nm;
    if (p[0] === "count") return { weapon: "武器", magic: "魔法", el: "属性" }[p[1]] + p[2] + "種類";
    if (p[0] === "el") return D().ELEM[p[1]].nm + "属性";
    return t;
  }

  /* ── 協会掲示：ミッション・実績 ── */
  let misTab = "mis";
  PANELS.missions = () => {
    const s = S(); MA.Save.rollMissions();
    const tabs = '<div class="tabs">' + [["mis", "ミッション"], ["time", "クリア時間（ジェム）"], ["ach", "実績"]].map(([k, n]) => '<button class="tab' + (misTab === k ? " on" : "") + '" data-a="misTab" data-v="' + k + '">' + n + "</button>").join("") + "</div>";
    let body = "";
    if (misTab === "time") {
      /* ★★ 2026-10-05 クリア時間のミッション（迷宮×ノーマル／ハード×3段）。達成したらここでも受け取れる */
      let left = 0;
      body = '<p class="hint">迷宮を決まった時間より早くクリアすると、XEVARION のジェムがもらえます（クリアしたときに自動で受け取り。受け取れなかった分はここから）。</p>' +
        D().DUNGEONS.map((d) => ["normal", "hard"].map((df) => {
          const tl = MA.Prog.timeList(d.id, df);
          const rec = df === "hard" ? ((s.dun[d.id] || {}).hard || {}) : (s.dun[d.id] || {});
          return '<div class="tm-dun' + (df === "hard" ? " hard" : "") + '"><div class="tm-h" style="--c:' + d.c + '"><b>第' + d.no + "迷宮 " + esc(d.nm) + "</b><em>" + D().MODES[df].nm + "</em><small>ベスト " + (rec.best ? fmtT(rec.best) : "—") + "</small></div>" +
            tl.map((m) => { if (m.done && !m.claimed) left++; return '<div class="sd-tm' + (m.done ? " ok" : "") + '">' + ic("st_time") + "<b>" + m.min + '分以内</b><span class="g">' + ic("gem") + m.gem + "</span>" + (m.done ? (m.claimed ? '<em class="got">受取ずみ</em>' : '<button class="btn sm gold" data-a="claimTime" data-v="' + m.key + '">受け取る</button>') : '<em class="no">未達成</em>') + "</div>"; }).join("") + "</div>";
        }).join("")).join("");
      if (left) body = '<div class="pr-sec">受け取れるジェムがあります（' + left + "件）</div>" + body;
    } else if (misTab === "mis") {
      const row = (m, prog, done, kind) => { const v = Math.min(m.n, prog[m.key] || 0); const ok = v >= m.n; return '<div class="mis' + (done ? " done" : ok ? " ok" : "") + '"><div><b>' + esc(m.nm) + "</b><small>報酬：" + esc(MA.Prog.rwText(m.rw)) + '</small><span class="mbar"><i style="width:' + (v / m.n * 100) + '%"></i><em>' + fmt(v) + "/" + fmt(m.n) + "</em></span></div>" + (done ? "<span class='gi-who'>受取ずみ</span>" : '<button class="btn sm gold" data-a="claimMis" data-v="' + kind + ":" + m.id + '"' + (ok ? "" : " disabled") + ">受け取る</button>") + "</div>"; };
      body = '<div class="pr-sec">毎日（' + esc(s.mis.day) + "）</div>" + D().MISSIONS.daily.map((m) => row(m, s.mis.d, s.mis.dc[m.id], "d")).join("") +
        '<div class="pr-sec">毎週（' + esc(s.mis.week) + "）</div>" + D().MISSIONS.weekly.map((m) => row(m, s.mis.w, s.mis.wc[m.id], "w")).join("");
    } else {
      body = '<div class="pr-sec">達成 ' + Object.keys(s.ach).length + "/" + D().ACH.length + "（達成すると報酬は自動で受け取ります）</div>" + D().ACH.map((a) => '<div class="mis' + (s.ach[a.id] ? " done" : "") + '">' + ic("trophy", s.ach[a.id] ? "#ffd84a" : "#666") + "<div><b>" + esc(a.nm) + "</b><small>" + esc(a.d) + "・報酬：" + esc(MA.Prog.rwText(a.rw)) + "</small></div>" + (s.ach[a.id] ? "<span class='gi-who'>達成</span>" : "") + "</div>").join("");
    }
    return { html: head("mission", "協会掲示", "冒険者協会からの依頼と記録", "#4fe39a") + tabs + body };
  };

  /* ── 深淵の門 ── */
  PANELS.abyss = () => {
    const s = S();
    const open = !!(s.dun.d3 && s.dun.d3.clears);
    const cid = s.sel, C = D().CHARS[cid];
    const rec = s.abyss.record.slice(0, 5).map((r) => "<li>" + r.f + "階　" + esc(D().CHARS[r.c] ? D().CHARS[r.c].nm : r.c) + "　" + fmtT(r.t) + "</li>").join("") || "<li>まだ記録がありません</li>";
    const html = head("abyss", "深淵の門：深淵踏破", "すべてのアビスの底へつづく連続攻略", "#a874ff") +
      (open ? '<div class="abyss"><p>階層が進むほど敵が強くなる連続攻略です。<br>・敵の編成はランダム（6つの迷宮から）<br>・階ごとに<b>特殊ルール</b>（魔力暴走・暗黒・強敵・疾風・硝子の体・飢餓・豊穣）<br>・<b>5階ごとに階層ボス</b><br>・敵を規定数倒すと下への門が開く。HPは階をまたいで少しだけ回復<br>・10階ごとに初めて到達すると XEVARION ジェム×5、深淵の欠片・星脈結晶</p>' +
        '<div class="dd-grid"><div><small>最高記録</small><b>' + (s.abyss.best || 0) + "階</b><i>" + esc(s.abyss.bestChar ? D().CHARS[s.abyss.bestChar].nm : "") + "</i></div><div><small>挑戦</small><b>" + (s.abyss.runs || 0) + '回</b></div></div><div class="pr-sec">最近の記録</div><ul class="dd-rules">' + rec + "</ul>" +
        '<div class="pr-char"><img src="../img/t_' + UI().imgName(cid) + '.webp" alt=""><div><b>' + esc(C.nm) + "</b><span>Lv." + MA.Save.lvOf(cid) + '</span><button class="btn sm" data-a="fac" data-v="chars">キャラを変える</button></div></div>' +
        '<button class="btn gold big" data-a="goAbyss">' + ic("abyss") + "深淵へ降りる</button></div>"
        : '<div class="locked">' + ic("lock") + "「紅蓮の熔岩城」をクリアすると、ギルドの地下に深淵の門が開きます</div>");
    return { html };
  };

  /* ── 受付：ストーリー・施設強化・遊び方 ── */
  PANELS.reception = () => {
    const s = S();
    const fac = Object.keys(D().FACILITIES).map((k) => {
      const F = D().FACILITIES[k], lv = s.fac[k] || 0, max = lv >= F.max;
      const c = max ? null : F.cost(lv);
      return '<div class="gi">' + ic({ smith: "hammer", shop: "shop", tavern: "person", train: "attack", chapel: "revive", archive: "book" }[k]) + '<div class="gi-b"><b>' + esc(F.nm) + ' <span class="cnt">Lv' + lv + "/" + F.max + "</span></b><small>いま：" + esc(F.d(lv)) + (max ? "" : "<br>次：" + esc(F.d(lv + 1))) + "</small>" + (c ? '<small class="cost">' + costHTML(c) + "</small>" : "") + "</div>" + (max ? "<span class='gi-who'>最大</span>" : '<button class="btn sm gold" data-a="facUp" data-v="' + k + '"' + (MA.Save.hasCost(c) ? "" : " disabled") + ">強化</button>") + "</div>";
    }).join("");
    const story = D().STORY.map((st) => '<div class="mis' + (s.codex.story[st.id] ? "" : " no") + '">' + ic("book") + "<div><b>" + (s.codex.story[st.id] ? esc(st.nm) : "？？？") + "</b><small>" + (st.at ? esc(D().DUN[st.at].nm) + "のあと" : "はじまり") + "</small></div>" + (s.codex.story[st.id] ? '<button class="btn sm" data-a="story" data-v="' + st.id + '">読む</button>' : "") + "</div>").join("");
    const K = (a) => esc(MA.Input.keyLabel(a));
    const howto = '<div class="row"><button class="btn gold" data-a="howto">' + ic("info") + '遊び方の映像を見る</button></div><ul class="howto"><li><b>移動</b>：' + K("up") + K("left") + K("down") + K("right") + '／方向キー（スマホは画面の左半分をさわるとスティック）</li><li><b>通常攻撃</b>：自動で、向いている方向へいつも出る（設定で「近い敵をねらう」「マウスの方向」にもできる）</li><li><b>' + K("skill") + '</b> スキル／<b>' + K("burst") + '</b> 技（キャラごとにちがう・MP）／<b>' + K("ult") + '</b> 必殺技（ゲージ100%）</li><li><b>' + K("dash") + '</b> 回避（無敵）／<b>' + K("map") + '</b> 地図／<b>' + K("menu") + '</b> メニュー／<b>' + K("interact") + '</b> 調べる（キーは設定で変えられる）</li><li><b>属性</b>：火→木→水→火・光⇄闇 が有利（×1.25）、逆は不利（×0.75）</li><li>敵を倒すと経験値の結晶。レベルアップで能力を1つ選ぶ（引き直し・とばすもできる）</li><li>武器 Lv7 ＋ 条件の能力 Lv2 で<b>進化</b>。キャラごとの<b>専用進化</b>もある</li><li>武器・魔法・装備・キャラの組み合わせで<b>星脈共鳴</b>が発動する（図鑑で条件を確認）</li><li>鍵を3つ集めるとボスの扉が開く（中ボス・試練の魔法陣・宝物庫・祭壇・時間制限区域）</li><li>ボスのまわりのギミックを全部こわす（踏む）と <b>BREAK</b>：6秒止まってダメージ2倍</li></ul>';
    return { html: head("person", "受付", "ギルドマスター ラウラ「おかえりなさい。今日はどうする？」", "#ff8fd0") +
      '<div class="pr-sec">拠点施設の強化</div><div class="glist">' + fac + '</div><div class="pr-sec">ストーリー</div>' + story + '<div class="pr-sec">遊び方</div>' + howto };
  };

  /* ── 設定 ──
     ★★ 2026-10-05 キーボードの割り当て・スマホのボタン（大きさ・濃さ・左右・割り当て）を変えられる（ご指定）。
       攻撃の向きの標準は「向いている方向」（PC もスマホも同じ） */
  let setTab = "play", keyWait = null;
  const TOUCH_SLOT_NM = { big: "いちばん大きい丸", d: "① 左", a: "② 左上", b: "③ 上", c: "④ 右上" };
  const TOUCH_ACT_NM = { attack: "通常攻撃", skill: "スキル", burst: "技", ult: "必殺技", dash: "回避", interact: "調べる", map: "地図", none: "なし（出さない）" };
  PANELS.settings = () => {
    const st = S().set;
    const seg = (k, opts) => '<div class="seg">' + opts.map(([v, n]) => '<button class="' + (String(st[k]) === String(v) ? "on" : "") + '" data-a="setv" data-v="' + k + '" data-x="' + v + '">' + esc(n) + "</button>").join("") + "</div>";
    const tabs = '<div class="tabs">' + [["play", "あそび"], ["keys", "キーボード"], ["touch", "スマホのボタン"], ["sound", "音・表示"]].map(([k, n]) => '<button class="tab' + (setTab === k ? " on" : "") + '" data-a="setTab" data-v="' + k + '">' + n + "</button>").join("") + "</div>";
    let body = "";
    if (setTab === "play") {
      body = "<div><span>攻撃の向き</span>" + seg("aim", [["facing", "向いている方向（標準）"], ["auto", "近い敵を自動でねらう"], ["mouse", "マウスの方向（PC）"]]) + '<small class="sub">通常攻撃は敵がいなくても いつも出ます。標準は PC もスマホも「向いている方向」です。</small></div>' +
        "<div><span>通常攻撃</span>" + seg("autoAtk", [[true, "自動で撃つ"], [false, "押しているあいだ"]]) + "</div>" +
        "<div><span>敵の最大数（重いときは少なく）</span>" + seg("maxEnemies", [[30, "30"], [45, "45"], [60, "60"], [80, "80"]]) + "</div>" +
        "<div><span>画面の大きさ</span>" + seg("zoom", [["near", "大きく"], ["auto", "ふつう"], ["far", "広く"]]) + "</div>" +
        "<div><span>遊び方</span><div class=\"row\"><button class=\"btn sm\" data-a=\"howto\">" + ic("info") + "遊び方の映像を見る</button></div></div>";
    } else if (setTab === "keys") {
      const k = MA.Input.keysNow();
      body = '<p class="hint">ボタンを押してから、割り当てたいキーを押してください（ほかの行動に使っているキーは入れかわります）。</p><div class="keys">' +
        MA.Input.ACTIONS.map(([a, nm]) => '<div class="key-row"><b>' + esc(nm) + "</b>" + [0, 1].map((i) => {
          const wait = keyWait && keyWait[0] === a && keyWait[1] === i;
          return '<button class="key-b' + (wait ? " wait" : "") + (k[a][i] ? "" : " none") + '" data-a="keyCap" data-v="' + a + '" data-x="' + i + '">' + (wait ? "キーを押す…" : k[a][i] ? esc(MA.Input.codeLabel(k[a][i])) : "—") + "</button>";
        }).join("") + "</div>").join("") + '</div><div class="row c"><button class="btn sm ghost" data-a="keyReset">' + ic("back") + "初期設定にもどす</button></div>" +
        '<p class="hint">マウス：左クリックでも通常攻撃（押しているあいだ）。攻撃の向きを「マウスの方向」にすると、マウスの方へ撃ちます。</p>';
    } else if (setTab === "touch") {
      const t = st.touch || {};
      const tm = MA.Input.touchMap();
      const segT = (k, opts) => '<div class="seg">' + opts.map(([v, n]) => '<button class="' + (String(t[k] == null ? (k === "alpha" ? 0.9 : 1) : t[k]) === String(v) ? "on" : "") + '" data-a="setTouch" data-v="' + k + '" data-x="' + v + '">' + esc(n) + "</button>").join("") + "</div>";
      body = "<div><span>ボタンの大きさ</span>" + segT("size", [[0.85, "小さめ"], [1, "ふつう"], [1.15, "大きめ"], [1.3, "特大"]]) + "</div>" +
        "<div><span>ボタンの濃さ</span>" + segT("alpha", [[0.55, "うすい"], [0.75, "ややうすい"], [0.9, "ふつう"], [1, "こい"]]) + "</div>" +
        "<div><span>スティックの位置</span>" + seg("stickSide", [["left", "左（ボタンは右）"], ["right", "右（ボタンは左）"]]) + "</div>" +
        "<div><span>ボタンの割り当て</span><div class=\"tmap\">" +
        '<div class="tm-prev">' + MA.Input.TOUCH_SLOTS.map((s) => '<i class="tp s-' + s + (tm[s] === "none" ? " off" : "") + '"><b>' + esc((TOUCH_ACT_NM[tm[s]] || "").replace("（出さない）", "")) + "</b></i>").join("") + "</div>" +
        '<div class="tm-sel">' + MA.Input.TOUCH_SLOTS.map((s) => '<label><span>' + TOUCH_SLOT_NM[s] + '</span><select data-in="tmap" data-slot="' + s + '">' + MA.Input.TOUCH_ACTS.map((a) => '<option value="' + a + '"' + (tm[s] === a ? " selected" : "") + ">" + TOUCH_ACT_NM[a] + "</option>").join("") + "</select></label>").join("") + "</div></div>" +
        '<div class="row"><button class="btn sm ghost" data-a="touchReset">' + ic("back") + "初期設定にもどす</button></div></div>" +
        '<p class="hint">移動は、画面の左半分（ボタンのないところ）をさわるとスティックが出ます。スマホでは横画面で遊びます。</p>';
    } else {
      body = '<label>BGM の音量<input type="range" min="0" max="1" step="0.05" value="' + st.bgm + '" data-in="bgm"></label>' +
        '<label>効果音の音量<input type="range" min="0" max="1" step="0.05" value="' + st.se + '" data-in="se"></label>' +
        "<div><span>ダメージの数字</span>" + seg("dmgNum", [[true, "出す"], [false, "出さない"]]) + "</div>" +
        "<div><span>画面のゆれ</span>" + seg("shake", [[true, "あり"], [false, "なし"]]) + "</div>" +
        "<div><span>振動</span>" + seg("vib", [[true, "あり"], [false, "なし"]]) + "</div>" +
        "<div><span>FPS 表示</span>" + seg("fps", [[false, "なし"], [true, "あり"]]) + "</div>";
    }
    const html = head("gear", "設定", "", "#c8c8d8") + tabs + '<div class="sets">' + body + '</div><div class="row c"><button class="btn" data-a="panel" data-v="data">' + ic("save") + "セーブデータ管理</button></div>";
    return { html, wide: false };
  };
  /* ── セーブデータ管理 ── */
  PANELS.data = () => {
    const inf = MA.Save.info();
    const s = S();
    const html = head("save", "セーブデータ管理", "このアプリのセーブ（magiabyss_v1）", "#5ab8ff") +
      '<div class="dd-grid"><div><small>作成</small><b>' + new Date(inf.created || Date.now()).toLocaleDateString() + "</b></div><div><small>最終保存</small><b>" + new Date(inf.updated || Date.now()).toLocaleString() + "</b></div><div><small>大きさ</small><b>" + (inf.size / 1024).toFixed(1) + "KB</b></div><div><small>バックアップ</small><b>" + (inf.bak ? "あり" : "なし") + "</b></div></div>" +
      '<div class="dd-grid"><div><small>プレイ時間</small><b>' + Math.floor((s.stats.playSec || 0) / 3600) + "時間" + Math.floor((s.stats.playSec || 0) % 3600 / 60) + "分</b></div><div><small>探索</small><b>" + fmt(s.stats.runs) + "回</b></div><div><small>撃破</small><b>" + fmt(s.stats.kills) + "</b></div><div><small>最終プレイ</small><b>" + (s.last ? esc((s.last.dun ? D().DUN[s.last.dun].nm : "深淵踏破 " + s.last.floor + "階") + "・" + { clear: "クリア", defeat: "敗北", retreat: "帰還" }[s.last.result]) : "—") + "</b></div></div>" +
      '<p class="hint">所持キャラと凸は XEVARION のアカウントと共通です（ここでは消えません）。ログインしていれば、このセーブも XEVARION のアカウントに同期されます。</p>' +
      '<div class="col"><button class="btn" data-a="dataSave">' + ic("save") + 'いますぐ保存</button><button class="btn" data-a="dataExport">' + ic("scroll") + 'データを書き出す（コピー・ファイル）</button><button class="btn" data-a="dataImport">' + ic("book") + 'データを読み込む</button><button class="btn ghost" data-a="dataBackup">' + ic("back") + 'ひとつ前のバックアップに戻す</button><button class="btn danger" data-a="dataReset">' + ic("close") + "はじめからにする</button></div>" +
      '<textarea id="dataTxt" class="datatx" hidden spellcheck="false"></textarea><div class="row c" id="dataIO" hidden><button class="btn sm" data-a="dataCopy">コピー</button><button class="btn sm" data-a="dataFile">ファイルに保存</button><label class="btn sm">ファイルから<input type="file" accept=".json,application/json" data-in="file" hidden></label><button class="btn sm gold" data-a="dataLoad">この内容を読み込む</button></div>';
    return { html, wide: false };
  };

  /* ══ ストーリー（会話）══ */
  function playStory(id) {
    const st = D().STORY.find((x) => x.id === id); if (!st) return;
    S().codex.story[id] = 1; MA.Save.saveSoon();
    let i = 0;
    const m = UI().modal('<div class="story"><div class="st-h">' + esc(st.nm) + '</div><div class="st-box"><b class="st-who"></b><p class="st-line"></p></div><div class="row c"><button class="btn ghost sm" data-a="storySkip">とばす</button><button class="btn gold" data-a="storyNext">つぎへ</button></div></div>', { cls: "stm", noClose: true });
    const show = () => { const L = st.lines[i]; $(".st-who", m).textContent = L[0]; $(".st-line", m).textContent = L[1]; $("[data-a=storyNext]", m).textContent = i >= st.lines.length - 1 ? "とじる" : "つぎへ"; };
    m._next = () => { i++; if (i >= st.lines.length) { UI().closeModal(); checkResume(); return; } show(); };
    show();
  }

  /* ══ 中断した探索 ══ */
  function checkResume() {
    const run = MA.Save.loadRun();
    if (!run || UI().topModal()) return;
    const where = run.mode === "abyss" ? "深淵踏破 " + run.floor + "階" : (D().DUN[run.dun] ? D().DUN[run.dun].nm : "迷宮");
    const m = UI().modal('<div class="evt"><div class="ev-h">' + ic("door") + '<b>中断した探索があります</b></div><p class="ev-d">' + esc(where) + "・" + esc(D().CHARS[run.cid] ? D().CHARS[run.cid].nm : run.cid) + "・" + fmtT(run.t) + "（Lv." + (run.P && run.P.lv) + "・撃破 " + fmt(run.stats && run.stats.kills) + "）<br>つづきから再開できます。あきらめる場合は、手に入れたゴールドと素材の半分・装備を受け取ります。<br><small>※敵の配置は再開時に新しくなります</small></p>" +
      '<div class="row c"><button class="btn ghost" data-a="resumeGiveUp">あきらめる</button><button class="btn gold" data-a="resumeRun">再開する</button></div></div>', { cls: "evm", noClose: true });
    m._run = run;
  }

  /* ══ 探索を始める ══ */
  function startRun(cfg) {
    const s = S();
    /* ★★ 2026-10-05 持っていないキャラでは出発できない（ご指定）。前に始めた探索の再開だけは続けられる */
    if (!MA.Save.owned(cfg.cid) && !cfg.resume) { UI().toast("このキャラは持っていません（XEVARION のガチャで手に入ります）", "#ff5a6a"); openPanel("chars"); return; }
    leave();
    UI().closeModal(true);
    if (MA.Stages) MA.Stages.hide();
    UI().scr("run");
    MA.Input.enabled = true;
    MA.Input.clearAll();
    MA.Save.save();
    const trial = !MA.Save.owned(cfg.cid);
    MA.Render.init($("#gc"));
    MA.E.start({ mode: cfg.mode, dun: cfg.dun, cid: cfg.cid, muts: cfg.muts || [], trial, resume: cfg.resume, seed: cfg.seed, floor: cfg.floor, diff: cfg.diff || (cfg.resume && cfg.resume.diff) || "normal" });
    MA.UI.buildHud();
    void s;
  }

  /* ══════════════════════════════════════════════════════════════
     タイトル
     ══════════════════════════════════════════════════════════════ */
  function title() {
    UI().scr("title");
    MA.Input.enabled = false;
    const s = S();
    $("#title").innerHTML = '<div class="tt-bg"></div><div class="tt-art"></div><div class="tt-shade"></div>' +
      '<div class="tt-chars">' + ic("star", "#ffd84a") + '使えるキャラ：XEVARION の<b class="f4">Sapphire Breeze</b><b class="f1">極彩祭</b><b class="f2">極煌祭</b><b class="f3">極華祭</b></div>' +
      '<div class="tt-in">' +
      '<div class="tt-tap" id="ttTap">TAP TO START</div>' +
      '<div class="tt-menu" id="ttMenu" hidden>' +
      '<button class="sign main" data-a="ttStart">' + (s.stats.runs ? "冒険をつづける" : "冒険をはじめる") + '</button><button class="sign" data-a="howto">遊び方</button><button class="sign" data-a="panel" data-v="settings">設定</button><button class="sign" data-a="panel" data-v="data">データ管理</button><a class="sign" href="../index.html">XEVARION へ戻る</a></div></div>' +
      '<div class="tt-ver">MagiAbyss Ver.1.1　' + (MA.Save.note ? '<b class="warn">' + esc(MA.Save.note) + "</b>" : "") + "</div>";
    const go = () => { MA.Audio.unlock(); MA.Audio.setVol(s.set.bgm, s.set.se); MA.Audio.bgm("title"); $("#ttTap").hidden = true; $("#ttMenu").hidden = false; $("#title").removeEventListener("pointerdown", go); };
    $("#title").addEventListener("pointerdown", go);
    window.addEventListener("keydown", function k(e) { if (document.body.dataset.scr === "title" && (e.key === "Enter" || e.key === " ")) { go(); window.removeEventListener("keydown", k); } });
  }

  /* ══ ボタン（data-a）の受け口 ══ */
  const A = MA.UI.ACT;
  A.fac = (el) => openFac(el.dataset.v);
  A.panel = (el) => openPanel(el.dataset.v, el.dataset.x);
  A.ttStart = () => { enter(); };
  A.toTitle = () => { leave(); title(); };
  A.prep = (el) => { prepMuts = []; prepDiff = el.dataset.x === "hard" ? "hard" : "normal"; openPanel("prep", el.dataset.v); };
  A.howto = () => { if (MA.Howto) MA.Howto.open(0); };
  A.togMut = (el) => { const k = el.dataset.v; const i = prepMuts.indexOf(k); if (i >= 0) prepMuts.splice(i, 1); else prepMuts.push(k); refreshTop(); };
  A.go = (el) => { startRun({ mode: "dungeon", dun: el.dataset.v, cid: S().sel, muts: prepMuts.slice(), diff: prepDiff }); };
  A.goAbyss = () => { startRun({ mode: "abyss", cid: S().sel }); };
  A.charFilter = (el) => { charFilter = el.dataset.v; refreshTop(); };
  A.charDet = (el) => openPanel("charDet", el.dataset.v);
  A.selChar = (el) => { if (!MA.Save.owned(el.dataset.v)) { UI().toast("持っていないキャラは選べません", "#ff5a6a"); return; } S().sel = el.dataset.v; MA.Save.saveSoon(); MA.Audio.sfx("key"); UI().toast(D().CHARS[el.dataset.v].nm + " を出発キャラにしました", "#ffd84a"); refreshTop(); renderTop(); };
  A.treeOf = (el) => openPanel("tree", el.dataset.v);
  A.learn = (el) => { const id = el.dataset.c, n = D().TREE.find((x) => x.id === el.dataset.v); const sp = MA.Save.spOf(id); if (!n || sp.left < n.cost) return; MA.Save.charRec(id).tree[n.id] = 1; MA.Save.save(); MA.Audio.sfx("levelup"); refreshTop(); };
  A.treeReset = (el) => { const id = el.dataset.v; UI().ask("スキルツリーをふりなおしますか？（500G）", () => { if (!MA.Save.payCost({ gold: 500 })) { UI().toast("ゴールドが足りません", "#ff5a6a"); return; } MA.Save.charRec(id).tree = {}; MA.Save.save(); refreshTop(); }); };
  A.storTab = (el) => { storTab = el.dataset.v; refreshTop(); };
  A.storSlot = (el) => { storSlot = el.dataset.v; refreshTop(); };
  A.equip = (el) => { const m = UI().topModal(); const cid = (m && m._arg) || S().sel; if (!MA.Save.owned(cid)) { UI().toast("未所持のキャラは装備できません", "#ff5a6a"); return; } MA.Save.equip(cid, el.dataset.v); S().gear[el.dataset.v].nw = 0; MA.Save.save(); MA.Audio.sfx("key"); refreshTop(); };
  A.unequip = (el) => { const m = UI().topModal(); const cid = (m && m._arg) || S().sel; MA.Save.unequip(cid, el.dataset.v); MA.Save.save(); refreshTop(); };
  A.smithTab = (el) => { smithTab = el.dataset.v; refreshTop(); };
  A.enhance = (el) => { const g = S().gear[el.dataset.v]; if (!g) return; const max = 2 + (S().fac.smith || 0) * 2; if (g.lv >= max) return; if (!MA.Save.payCost(enhCost(g))) return; g.lv++; MA.Audio.sfx("chest"); UI().toast(D().GEAR[g.id].nm + " +" + g.lv + " に強化！", "#ffd84a"); if (g.lv >= 10) MA.Prog.unlock("plus10"); MA.Save.save(); refreshTop(); };
  A.craft = (el) => { const r = CRAFT.find((x) => x.id === el.dataset.v); if (!r || !MA.Save.payCost(r.cost)) return; MA.Save.newGear(r.id, "R"); MA.Audio.sfx("chest"); UI().toast(D().GEAR[r.id].nm + "（R）を作った！", "#5ab8ff"); MA.Save.save(); refreshTop(); };
  A.craftSR = (el) => { const r = CRAFT.find((x) => x.id === el.dataset.v); if (!r) return; const c = Object.assign({}, r.cost, { crystal: 1 }); if (!MA.Save.payCost(c)) return; MA.Save.newGear(r.id, "SR"); MA.Audio.sfx("chest"); UI().toast(D().GEAR[r.id].nm + "（SR）を作った！", "#c27bff"); MA.Save.save(); refreshTop(); };
  A.salvage = (el) => { const u = el.dataset.v, g = S().gear[u]; if (!g || MA.Save.gearOwner(u)) return; UI().ask(D().GEAR[g.id].nm + "（" + g.rar + "）を分解しますか？", () => { const val = { N: 2, R: 5, SR: 12, SSR: 30, UR: 80 }[g.rar] + g.lv * 2; delete S().gear[u]; MA.Save.addMat("stone", val); MA.Save.save(); UI().toast("魔石 ×" + val + " を手に入れた", "#9ab0ff"); refreshTop(); }, { yes: "分解する", danger: 1 }); };
  A.buyGear = (el) => { const st = shopStock(); const x = st[+el.dataset.v]; if (!x || x.sold || !MA.Save.payCost({ gold: x.price })) return; x.sold = true; MA.Save.newGear(x.id, x.rar); if (x.rar === "SSR" || x.rar === "UR") MA.Prog.unlock("ssr"); if (x.rar === "UR") MA.Prog.unlock("ur"); MA.Audio.sfx("coin"); UI().toast(D().GEAR[x.id].nm + "（" + x.rar + "）を買った", "#ffd84a"); MA.Save.save(); refreshTop(); };
  A.buyItem = (el) => { const k = el.dataset.v, it = D().SHOP_ITEMS[k]; if (it.max && (S().items[k] || 0) >= it.max) return; if (!MA.Save.payCost({ gold: it.price })) return; if (it.give) Object.keys(it.give).forEach((m) => MA.Save.addMat(m, it.give[m])); else S().items[k] = (S().items[k] || 0) + 1; MA.Audio.sfx("coin"); MA.Save.save(); refreshTop(); };
  A.shopRefresh = () => { const s = S(); const rc = 200 * ((s.shop.refresh || 0) + 1); if (!MA.Save.payCost({ gold: rc })) return; s.shop.refresh = (s.shop.refresh || 0) + 1; s.shop.stock = []; shopStock(); MA.Save.save(); refreshTop(); };
  A.codexTab = (el) => { codexTab = el.dataset.v; refreshTop(); };
  A.misTab = (el) => { misTab = el.dataset.v; refreshTop(); };
  A.claimMis = (el) => { const [kind, id] = el.dataset.v.split(":"); const s = S(); const list = kind === "d" ? D().MISSIONS.daily : D().MISSIONS.weekly; const m = list.find((x) => x.id === id); const prog = kind === "d" ? s.mis.d : s.mis.w; const done = kind === "d" ? s.mis.dc : s.mis.wc; if (!m || done[id] || (prog[m.key] || 0) < m.n) return; done[id] = Date.now(); Object.keys(m.rw).forEach((k) => MA.Save.addMat(k, m.rw[k])); MA.Audio.sfx("key"); UI().toast("ミッション報酬：" + MA.Prog.rwText(m.rw), "#4fe39a"); MA.Save.save(); refreshTop(); };
  A.facUp = (el) => { const k = el.dataset.v, F = D().FACILITIES[k], lv = S().fac[k] || 0; if (lv >= F.max) return; if (!MA.Save.payCost(F.cost(lv))) return; S().fac[k] = lv + 1; MA.Audio.sfx("levelup"); UI().toast(F.nm + " を Lv" + (lv + 1) + " にした", "#ffd84a"); MA.Save.save(); refreshTop(); };
  A.story = (el) => { UI().closeModal(); playStory(el.dataset.v); };
  A.storyNext = (el) => { const m = el.closest(".mdl"); m._next && m._next(); };
  A.storySkip = () => { UI().closeModal(); checkResume(); };
  A.resumeRun = (el) => { const m = el.closest(".mdl"); const run = m._run; UI().closeModal(); startRun({ mode: run.mode, dun: run.dun, cid: run.cid, muts: run.muts, seed: run.seed, floor: run.floor, resume: run }); };
  A.resumeGiveUp = (el) => { const m = el.closest(".mdl"); const run = m._run; UI().closeModal(); const out = MA.Prog.settleAbandoned(run); UI().toast("中断した探索を受け取りました：" + fmt(out.gold) + "G" + Object.keys(out.mats).map((k) => "・" + D().MATS[k].nm + "×" + out.mats[k]).join(""), "#8affc4"); renderTop(); };
  A.setv = (el) => { const k = el.dataset.v; let v = el.dataset.x; if (v === "true") v = true; else if (v === "false") v = false; else if (!isNaN(+v) && v !== "") v = +v; S().set[k] = v; MA.Save.saveSoon(); if (k === "zoom") { MA.Render.resize(); resizeHub(); } if (k === "stickSide") MA.applyDeviceClasses(); refreshTop(); };
  A.setTab = (el) => { setTab = el.dataset.v; keyWait = null; MA.Input.capture = null; refreshTop(); };
  /* キーの割り当て：押したキーをその枠へ（ほかで使っていたら入れかえ） */
  A.keyCap = (el) => {
    const a = el.dataset.v, i = +el.dataset.x;
    keyWait = [a, i]; refreshTop();
    MA.Input.capture = (code) => {
      keyWait = null;
      const k = MA.Input.keysNow();
      Object.keys(k).forEach((b) => { k[b] = k[b].map((c) => (c === code ? null : c)); });
      k[a][i] = code;
      S().set.keys = k; MA.Save.saveSoon(); MA.Input.rebuildKeys();
      MA.Audio.sfx("key"); refreshTop();
    };
  };
  A.keyReset = () => { S().set.keys = null; keyWait = null; MA.Input.capture = null; MA.Save.saveSoon(); MA.Input.rebuildKeys(); refreshTop(); UI().toast("キーの割り当てを初期設定にもどしました", "#5ab8ff"); };
  A.setTouch = (el) => { const t = S().set.touch = S().set.touch || {}; t[el.dataset.v] = +el.dataset.x; MA.Save.saveSoon(); MA.applyDeviceClasses(); refreshTop(); };
  A.touchReset = () => { S().set.touch = { size: 1, alpha: 0.9, pos: null, map: null }; MA.Save.saveSoon(); MA.applyDeviceClasses(); refreshTop(); };
  A.dataSave = () => { UI().toast(MA.Save.save() ? "保存しました" : "保存できませんでした", "#5ab8ff"); };
  A.dataExport = () => { const t = $("#dataTxt"); t.hidden = false; $("#dataIO").hidden = false; t.value = MA.Save.exportText(); t.select(); };
  A.dataImport = () => { const t = $("#dataTxt"); t.hidden = false; $("#dataIO").hidden = false; t.value = ""; t.placeholder = "書き出したデータをここに貼りつけて「この内容を読み込む」"; t.focus(); };
  A.dataCopy = () => { const t = $("#dataTxt"); t.select(); try { navigator.clipboard.writeText(t.value).then(() => UI().toast("コピーしました", "#5ab8ff"), () => { document.execCommand("copy"); UI().toast("コピーしました", "#5ab8ff"); }); } catch (e) { try { document.execCommand("copy"); UI().toast("コピーしました", "#5ab8ff"); } catch (e2) {} } };
  A.dataFile = () => { const blob = new Blob([MA.Save.exportText()], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "MagiAbyss-save-" + MA.Save.today() + ".json"; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); };
  A.dataLoad = () => { const t = $("#dataTxt"); UI().ask("いまのセーブを、この内容で置きかえますか？（いまのセーブはバックアップに残ります）", () => { const r = MA.Save.importText(t.value); UI().toast(r.msg, r.ok ? "#8affc4" : "#ff5a6a"); if (r.ok) { UI().closeModal(true); renderTop(); } }, { yes: "読み込む" }); };
  A.dataBackup = () => { UI().ask("ひとつ前のバックアップに戻しますか？", () => { const r = MA.Save.restoreBackup(); UI().toast(r.msg, r.ok ? "#8affc4" : "#ff5a6a"); if (r.ok) { UI().closeModal(true); renderTop(); } }); };
  A.dataReset = () => { UI().ask("このアプリのセーブをはじめからにしますか？<br><small>（レベル・装備・素材・記録が消えます。キャラの所持と凸は XEVARION のものなので消えません）</small>", () => { UI().ask("本当に消しますか？ 元にもどせません（ひとつ前はバックアップに残ります）", () => { MA.Save.reset(); UI().closeModal(true); UI().toast("はじめからにしました", "#ff5a6a"); title(); }, { yes: "消す", danger: 1 }); }, { yes: "つぎへ", danger: 1 }); };
  /* スライダー・ファイル・選択 */
  document.addEventListener("input", (e) => {
    const k = e.target.dataset && e.target.dataset.in;
    if (k === "bgm" || k === "se") { S().set[k] = +e.target.value; MA.Audio.setVol(S().set.bgm, S().set.se); MA.Save.saveSoon(); }
  });
  document.addEventListener("change", (e) => {
    const k = e.target.dataset && e.target.dataset.in;
    if (k === "file") { const f = e.target.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { $("#dataTxt").value = rd.result; UI().toast("ファイルを読みました。「この内容を読み込む」で反映します", "#5ab8ff"); }; rd.readAsText(f); }
    if (e.target.dataset && e.target.dataset.a === "storChar") { storChar = e.target.value; refreshTop(); }
    if (k === "tmap") { const t = S().set.touch = S().set.touch || {}; const m = Object.assign({}, MA.Input.touchMap()); m[e.target.dataset.slot] = e.target.value; t.map = m; MA.Save.saveSoon(); refreshTop(); }
  });

  MA.Guild = { enter, leave, title, startRun, playStory, openPanel, openFac, renderTop, refreshTop, resizeHub, FAC, checkResume, GS, npcSprite };
})();
