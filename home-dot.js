/* ══════════════════════════════════════════════════════════════
   ★★ 2026-10-26 ホームの「開催中のイベント」のバナーの上で、ドット絵のキャラがいろいろ動く（ご指定）
   ------------------------------------------------------------
   ・絵は MagiAbyss のドット絵をそのまま使う（MagiAbyss/js/ma-pixel.js の MA.Pix.charSpriteHD・画像ファイルなし）。
     ホームが出てから読む（はじめの表示を重くしない）。
   ・出せるのは<b>持っているキャラ</b>だけ（MagiBurst の magiburst_v1.chars か、ポータルの xeva_gacha_v1.owned）。
   ・立つ場所＝開催中のイベントのバナー（#xlEvb）の上の端。イベントが無いときはガチャのバナー（#xlBan）。
     パートナー非表示のとき（2枚が横に並ぶ）は、2枚の上を行き来する（すき間はぴょんと跳びこえる）。
   ・動き：歩く・走る・見まわす・ジャンプ・はねる・すわって足をぶらぶら・ねむる・手をふる・くるっと回る・おどる・のび・端からのぞく。
     押すと跳ねて「✎ かえる」が出る → パートナーの画面の「ドット絵」タブ（HomeMate.openPicker("dot")）。
   ・設定は xeva_mate_v1.dot（同期する）：無し／"" ＝おまかせ（持っている子から起動ごとに1人）・"off" ＝出さない・id ＝その子。
   ・見えていないとき（ほかの画面・メニューを開いている・タブが裏）は止まる。動きを減らす設定では歩かない。
   ★ キャラの一覧は ma-pixel.js の CHAR_ART（読みこむ前の判定だけ DOT_IDS を使う。MagiAbyss にキャラを足したらここにも足す）。
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const PIX_SRC = "MagiAbyss/js/ma-pixel.js?v=9";
  const KEY = "xeva_mate_v1";
  const PICK = "xeva_dot_pick";          /* おまかせで、この起動に出している子（タブごと） */
  const HINT = "xeva_dot_hint_v1";       /* はじめて出たときの「✎ かえる」（端末ごと・1回） */
  const DOT_IDS = ["takina", "ayano", "saki", "yuka", "natsumi", "miu", "mai", "chinatsu", "yuumi", "rina", "chie", "ichika", "nonoka", "aina", "yuna",
    "kohaku", "hisako", "alice", "miki", "suzu", "shouko", "kaori", "hibana", "fuki", "hinano", "hanon", "kokoha", "mutsumi", "reina", "azusa", "kagura", "kotori", "kumireina"];
  const PADX = 26;      /* バナーの左右のはみ出し（端からのぞくぶん） */
  const ABOVE = 30;     /* 頭の上のゆとり（ジャンプ・吹き出し） */
  const SINK = 16;      /* バナーの上の端より下（すわると足がバナーにかかる） */
  const ROOM = 56;      /* パートナー非表示のとき、バナーの上にあける高さ（home-mate.js の nmLayout が使う） */
  const RM = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches || document.body.classList.contains("xos-nomotion"); } catch (e) { return false; } };

  /* ══ 設定と所持 ══ */
  function store() { try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { return {}; } }
  function setting() { const v = store().dot; return v == null ? "" : String(v); }
  function ids() {
    const art = window.MA && MA.Pix && MA.Pix.CHAR_ART;
    if (!art) return DOT_IDS.slice();
    const a = Object.keys(art);
    return DOT_IDS.filter((id) => art[id]).concat(a.filter((id) => DOT_IDS.indexOf(id) < 0));
  }
  let _own = null, _ownAt = 0;
  function ownMap() {
    const now = Date.now();
    if (_own && now - _ownAt < 1500) return _own;
    let mb = {}, xg = {};
    try { mb = (JSON.parse(localStorage.getItem("magiburst_v1") || "null") || {}).chars || {}; } catch (e) {}
    try { xg = (JSON.parse(localStorage.getItem("xeva_gacha_v1") || "null") || {}).owned || {}; } catch (e) {}
    _own = {}; ids().forEach((id) => { if (mb[id] || xg[id]) _own[id] = 1; });
    _ownAt = now;
    return _own;
  }
  function owned(id) { return !!ownMap()[id]; }
  function ownedIds() { return ids().filter(owned); }
  function nameOf(id) {
    try { const m = ((window.XEVA && XEVA.MB_CHARS) || []).find((c) => c.mbId === id); if (m && m.name) return m.name; } catch (e) {}
    return id;
  }
  /* いま出す子（出さないときは null） */
  function want() {
    const v = setting();
    if (v === "off") return null;
    if (v && owned(v)) return v;
    const own = ownedIds(); if (!own.length) return null;
    let p = null; try { p = sessionStorage.getItem(PICK); } catch (e) {}
    if (!p || own.indexOf(p) < 0) {
      p = own[Math.floor(Math.random() * own.length)];
      try { sessionStorage.setItem(PICK, p); } catch (e) {}
    }
    return p;
  }

  /* ══ ma-pixel.js を読む（1回だけ） ══ */
  let pixP = null;
  function loadPix() {
    if (window.MA && MA.Pix && MA.Pix.charSpriteHD) return Promise.resolve(true);
    if (pixP) return pixP;
    pixP = new Promise((ok) => {
      const s = document.createElement("script");
      s.src = PIX_SRC; s.async = true;
      s.onload = () => { _own = null; ok(!!(window.MA && MA.Pix && MA.Pix.charSpriteHD)); };
      s.onerror = () => { pixP = null; ok(false); };
      document.head.appendChild(s);
    });
    return pixP;
  }
  function sprite(id) {
    let sp = null;
    try { sp = MA.Pix.charSpriteHD(id); } catch (e) { try { sp = MA.Pix.charSprite(id); } catch (e2) { sp = null; } }
    if (sp && !(sp.w && sp.h)) { const f = sp.idle && sp.idle[0]; sp.w = f ? f.width : 48; sp.h = f ? f.height : 60; }
    return sp;
  }
  /* 選ぶ画面の小さな絵（待機の1コマ） */
  function thumb(id, cv) {
    return loadPix().then((ok) => {
      if (!ok || !cv) return;
      const sp = sprite(id); if (!sp) return;
      const f = sp.idle[0], k = 1;
      cv.width = f.width * k; cv.height = f.height * k;
      const g = cv.getContext("2d"); g.imageSmoothingEnabled = false; g.drawImage(f, 0, 0, f.width * k, f.height * k);
    });
  }

  /* ══ 画面の部品 ══ */
  const CSS =
    "#xlDot{position:absolute;left:0;top:0;width:0;height:0;pointer-events:none;image-rendering:pixelated;image-rendering:crisp-edges;z-index:3}" +
    "#xlDot[hidden],#xlDotHit[hidden]{display:none}" +
    "#xlDotHit{position:absolute;left:0;top:0;width:38px;height:54px;padding:0;margin:0;border:0;background:none;cursor:pointer;z-index:4;-webkit-tap-highlight-color:transparent;touch-action:manipulation}" +
    "#xlDotChip{position:absolute;left:0;top:0;z-index:5;padding:3px 9px 3px 7px;border-radius:99px;border:2px solid #12203d;font:900 10.5px/1.25 'Noto Sans JP',sans-serif;color:#12203d;" +
    "background:linear-gradient(180deg,#fff6dc,#ffd76a);box-shadow:0 2px 0 rgba(18,32,61,.35);white-space:nowrap;cursor:pointer;opacity:0;transform:translateY(4px) scale(.9);transition:opacity .18s,transform .18s;pointer-events:none}" +
    "#xlDotChip.on{opacity:1;transform:none;pointer-events:auto}" +
    "#xlDotChip:active{translate:0 1px}";
  let cv = null, g = null, hit = null, chip = null, chipT = 0;
  function mountEls() {
    const lob = document.getElementById("xhLobby"); if (!lob) return false;
    if (!document.getElementById("xlDotCss")) { const st = document.createElement("style"); st.id = "xlDotCss"; st.textContent = CSS; document.head.appendChild(st); }
    if (!cv || !cv.isConnected) {
      cv = document.createElement("canvas"); cv.id = "xlDot"; cv.setAttribute("aria-hidden", "true"); cv.hidden = true;
      lob.appendChild(cv); g = cv.getContext("2d");
    }
    if (!hit || !hit.isConnected) {
      hit = document.createElement("button"); hit.id = "xlDotHit"; hit.type = "button"; hit.hidden = true;
      hit.setAttribute("aria-label", "ドット絵のキャラ（押すと反応・かえるボタン）");
      hit.addEventListener("click", (e) => { e.stopPropagation(); onTap(); });
      lob.appendChild(hit);
    }
    if (!chip || !chip.isConnected) {
      chip = document.createElement("button"); chip.id = "xlDotChip"; chip.type = "button"; chip.textContent = "✎ かえる";
      chip.addEventListener("click", (e) => { e.stopPropagation(); hideChip(); try { if (window.XOS) XOS.haptic(); } catch (e2) {} if (window.HomeMate && HomeMate.openPicker) HomeMate.openPicker("dot"); });
      lob.appendChild(chip);
    }
    return true;
  }
  function showChip(ms) { if (!chip) return; chip.classList.add("on"); clearTimeout(chipT); chipT = setTimeout(hideChip, ms || 2800); }
  function hideChip() { if (chip) chip.classList.remove("on"); clearTimeout(chipT); }

  /* ══ キャラの状態 ══ */
  const S = { id: null, sp: null, x: 60, dir: 1, act: "idle", t: 0, dur: 2, d: {}, yOff: 0, sx: 1, sy: 1, rot: 0, sink: 0,
              W: 0, H: 0, dpr: 1, ground: 0, minX: 0, maxX: 0, gaps: [], onEv: false, box: null, parts: [], blinkAt: 0, blinkT: -1,
              bubble: null, layAt: 0, ok: false };

  /* 立つ場所（バナー）をはかる。どこにも無いときは false */
  function targets() {
    const vis = (el) => el && !el.hidden && el.style.display !== "none" && el.getClientRects().length && el.getBoundingClientRect().width > 40;
    const evb = document.getElementById("xlEvb"), ban = document.getElementById("xlBan");
    const out = [];
    /* ★★ 2026-10-26（2回目）パートナー非表示のときは、イベントのバナーの上に「ロビー」のボタンがある（ご指定）→ ガチャのバナーの上だけを歩く */
    const lb = document.getElementById("xhLobby");
    if (lb && lb.classList.contains("xl-nomate")) { S.onEv = false; if (vis(ban)) out.push(ban); return out; }
    if (vis(evb)) out.push(evb);
    if (vis(ban)) {
      if (!out.length) out.push(ban);
      else { const a = evb.getBoundingClientRect(), b = ban.getBoundingClientRect(); if (Math.abs(a.top - b.top) < 6) out.push(ban); }   /* 横に並んでいる（パートナー非表示） */
    }
    S.onEv = out.indexOf(evb) >= 0;
    return out;
  }
  function layout() {
    S.layAt = performance.now();
    const lob = document.getElementById("xhLobby");
    const els = lob ? targets() : [];
    if (!els.length || !S.sp) { S.ok = false; return false; }
    const L = lob.getBoundingClientRect();
    const rs = els.map((e) => e.getBoundingClientRect()).sort((a, b) => a.left - b.left);
    const top = Math.min.apply(null, rs.map((r) => r.top));
    const sw = S.sp.w || 48, sh = S.sp.h || 60;
    const left = Math.max(0, rs[0].left - L.left - PADX), right = Math.min(L.width, rs[rs.length - 1].right - L.left + PADX);
    const W = Math.max(60, Math.round(right - left)), H = Math.round(sh + ABOVE + SINK);
    const cx = Math.round(left), cy = Math.round(top - L.top - sh - ABOVE);
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    if (S.W !== W || S.H !== H || S.dpr !== dpr) {
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      cv.style.width = W + "px"; cv.style.height = H + "px";
      S.W = W; S.H = H; S.dpr = dpr;
    }
    cv.style.left = cx + "px"; cv.style.top = cy + "px";
    S.box = { x: cx, y: cy };
    S.ground = sh + ABOVE;
    const bl = rs[0].left - L.left - cx, br = rs[rs.length - 1].right - L.left - cx;
    S.minX = bl + 15; S.maxX = br - 15;
    S.edgeL = bl; S.edgeR = br;
    S.gaps = [];
    for (let i = 0; i < rs.length - 1; i++) {
      const a = rs[i].right - L.left - cx, b = rs[i + 1].left - L.left - cx;
      if (b - a > 1) S.gaps.push([a - 6, b + 6]);
    }
    if (S.x < S.minX || S.x > S.maxX) S.x = Math.max(S.minX, Math.min(S.maxX, S.x));
    S.ok = S.maxX - S.minX > 20;
    return S.ok;
  }
  function inGap(x) { for (const gp of S.gaps) if (x > gp[0] && x < gp[1]) return gp; return null; }
  /* すき間には止まらない（いちばん近い岸へ） */
  function land(x) {
    x = Math.max(S.minX, Math.min(S.maxX, x));
    const gp = inGap(x); if (!gp) return x;
    return x - gp[0] < gp[1] - x ? gp[0] - 4 : gp[1] + 4;
  }

  /* ══ 動き ══
     d … その動きだけの値。dur … 長さ（秒）。終わったら next() が次を決める */
  const NIGHT = () => { const h = new Date().getHours(); return h >= 23 || h < 5; };
  function pickAct() {
    const rm = RM();
    const list = rm
      ? [["idle", 5], ["sit", 2], ["look", 1.5], ["wave", 1], ["sleep", NIGHT() ? 3 : 0.8]]
      : [["idle", 3], ["walk", 4.2], ["run", 0.9], ["jump", 1.3], ["hop", 1], ["sit", 1.5], ["sleep", NIGHT() ? 3 : 0.6], ["wave", 1.1],
         ["spin", 0.8], ["look", 1.2], ["dance", 0.7], ["stretch", 0.6], ["peek", 0.7], ["chat", 0.9]];
    let sum = 0; list.forEach((a) => { sum += a[1]; });
    let r = Math.random() * sum;
    for (const a of list) { r -= a[1]; if (r <= 0) return a[0]; }
    return "idle";
  }
  function start(act, d) {
    S.act = act; S.t = 0; S.d = d || {}; S.sx = 1; S.sy = 1; S.rot = 0;
    const R = (a, b) => a + Math.random() * (b - a);
    switch (act) {
      case "idle": S.dur = R(1.6, 3.4); break;
      case "walk": case "run": {
        let to = S.x;
        for (let i = 0; i < 6 && Math.abs(to - S.x) < 34; i++) to = R(S.minX, S.maxX);
        to = land(to);
        S.d.to = to; S.dir = to >= S.x ? 1 : -1;
        S.d.v = act === "run" ? 62 : 24;
        S.dur = Math.abs(to - S.x) / S.d.v + 0.05;
        break;
      }
      case "jump": S.dur = 0.95; break;
      case "hop": S.dur = 1.35; break;
      case "react": S.dur = 0.85; break;
      case "sit": S.dur = R(3.2, 6); break;
      case "sleep": S.dur = R(5.5, 9); break;
      case "wave": S.dur = 1.6; break;
      case "spin": S.dur = 0.9; break;
      case "look": S.dur = 2.1; break;
      case "dance": S.dur = 2.6; break;
      case "stretch": S.dur = 1.6; break;
      case "peek": {
        const toL = S.x - S.minX < S.maxX - S.x;
        S.d.side = toL ? -1 : 1; S.d.to = toL ? S.minX - 2 : S.maxX + 2; S.d.v = 24;
        S.dir = S.d.side; S.d.walk = Math.abs(S.d.to - S.x) / S.d.v;
        S.dur = S.d.walk + 2.2;
        break;
      }
      case "chat": S.dur = 2.4; say(chatLine(), 2.2); break;
      default: S.dur = 2;
    }
    if (act === "look") say("？", 1.6);
    if (act === "peek") setTimeout(() => { if (S.act === "peek") say("…", 1.4); }, Math.max(0, S.d.walk * 1000 + 300));
  }
  function next() { start(pickAct()); }
  function chatLine() {
    const ev = S.onEv;
    const L = ev ? ["イベント中！", "♪", "がんばろ！", "ミッション見た？", "いい天気〜"] : ["ガチャひく？", "♪", "なにする？", "いい天気〜", "ふぁ〜"];
    return L[Math.floor(Math.random() * L.length)];
  }
  function say(text, sec) { S.bubble = { text, t: 0, life: sec || 1.8 }; }
  function puff(kind, n) {
    for (let i = 0; i < (n || 1); i++) {
      const p = { kind, x: S.x + (Math.random() - 0.5) * 10, y: S.ground + S.yOff + S.sink - (S.sp.h || 60) * 0.85, vx: (Math.random() - 0.5) * 14, vy: -14 - Math.random() * 10, t: 0, life: 1.1 + Math.random() * 0.4 };
      if (kind === "dust") { p.y = S.ground - 1; p.vy = -4 - Math.random() * 4; p.vx = -S.dir * (6 + Math.random() * 8); p.life = 0.45; }
      if (kind === "z") { p.x = S.x + 8; p.vx = 6 + Math.random() * 3; p.vy = -9; p.life = 1.8; }
      if (kind === "spark") { p.vx = (Math.random() - 0.5) * 40; p.vy = -10 - Math.random() * 26; p.life = 0.7; }
      S.parts.push(p);
    }
    if (S.parts.length > 40) S.parts.splice(0, S.parts.length - 40);
  }

  function onTap() {
    try { if (window.XOS) XOS.haptic(); } catch (e) {}
    if (S.act === "sleep") say("！", 1.2);
    else say(["えへへ", "わっ！", "なあに？", "♥", "えいっ"][Math.floor(Math.random() * 5)], 1.6);
    start("react");
    puff("heart", 2);
    placeChip();
    showChip(3200);
  }
  function placeChip() {
    if (!chip || !S.box) return;
    const cw = chip.offsetWidth || 64, x = S.box.x + S.x, y = S.box.y + S.ground - (S.sp ? S.sp.h : 60) - 22;
    const lob = document.getElementById("xhLobby"), lw = lob ? lob.clientWidth : 375;
    chip.style.left = Math.max(6, Math.min(lw - cw - 6, x - cw / 2)) + "px";
    chip.style.top = Math.max(4, y) + "px";
  }

  /* 1こま進める */
  function update(dt) {
    const rm = RM();
    S.t += dt;
    const t = S.t, u = Math.min(1, t / S.dur);
    S.yOff = 0; S.sx = 1; S.sy = 1; S.rot = 0;
    let sinkTo = 0;
    switch (S.act) {
      case "walk": case "run": {
        const step = S.d.v * dt * S.dir;
        S.x += step;
        if ((S.dir > 0 && S.x >= S.d.to) || (S.dir < 0 && S.x <= S.d.to)) { S.x = S.d.to; S.t = S.dur; }
        const gp = inGap(S.x);
        if (gp) { const k = (S.x - gp[0]) / (gp[1] - gp[0]); S.yOff = -Math.sin(Math.PI * k) * 14; }
        else if (S.act === "run") { if (Math.random() < dt * 6) puff("dust"); S.yOff = -Math.abs(Math.sin(t * 14)) * 2; }
        else S.yOff = -Math.abs(Math.sin(t * 8)) * 1;
        break;
      }
      case "jump": case "react": {
        const c = 0.14, air = S.act === "react" ? 0.5 : 0.58, hgt = S.act === "react" ? 16 : 22;
        if (t < c) { const k = t / c; S.sy = 1 - 0.14 * k; S.sx = 1 + 0.1 * k; }
        else if (t < c + air) { const k = (t - c) / air; S.yOff = -Math.sin(Math.PI * k) * hgt; S.sy = 1 + 0.08 * Math.cos(Math.PI * k); S.sx = 1 - 0.05 * Math.cos(Math.PI * k); }
        else { const k = Math.min(1, (t - c - air) / (S.dur - c - air)); S.sy = 1 - 0.12 * (1 - k); S.sx = 1 + 0.09 * (1 - k); if (!S.d.landed) { S.d.landed = 1; puff("dust", 2); } }
        if (S.act === "jump" && t > c && !S.d.sp) { S.d.sp = 1; puff("spark", 3); }
        break;
      }
      case "hop": {
        const k = (t % 0.45) / 0.45;
        S.yOff = -Math.sin(Math.PI * k) * 7;
        const n = Math.floor(t / 0.45); if (n !== S.d.n) { S.d.n = n; if (n < 3) puff("note"); }
        break;
      }
      case "dance": {
        const k = (t % 0.32) / 0.32;
        S.yOff = -Math.sin(Math.PI * k) * 5;
        const n = Math.floor(t / 0.32); if (n !== S.d.n) { S.d.n = n; S.dir = n % 2 ? -1 : 1; if (n % 3 === 0) puff("note"); }
        break;
      }
      case "sit": case "sleep": sinkTo = 11; if (S.act === "sleep" && Math.floor(t / 1.1) !== S.d.n) { S.d.n = Math.floor(t / 1.1); if (t > 0.6) puff("z"); } break;
      case "spin": S.sx = Math.cos(u * Math.PI * 4); if (u > 0.95 && !S.d.sp) { S.d.sp = 1; puff("spark", 3); } break;
      case "stretch": { const k = Math.sin(Math.PI * u); S.sy = 1 + 0.08 * k; S.sx = 1 - 0.06 * k; break; }
      case "wave": if (Math.floor(t / 0.5) !== S.d.n) { S.d.n = Math.floor(t / 0.5); puff("spark"); } break;
      case "look": { const n = Math.floor(t / 0.62); S.dir = n % 2 ? 1 : -1; break; }
      case "peek": {
        if (t < S.d.walk) { S.x += S.d.v * dt * S.d.side; S.x = S.d.side < 0 ? Math.max(S.d.to, S.x) : Math.min(S.d.to, S.x); }
        else { const k = Math.min(1, (t - S.d.walk) / 0.35), back = Math.max(0, Math.min(1, (S.dur - t) / 0.35)); S.rot = S.d.side * 0.24 * Math.min(k, back); }
        break;
      }
      default: break;
    }
    if (rm) { S.yOff *= 0.4; S.rot *= 0.5; }
    S.sink += (sinkTo - S.sink) * Math.min(1, dt * 9);
    if (S.t >= S.dur) next();
    /* まばたき（待機・すわり・手ふり） */
    const now = performance.now();
    if (S.blinkT < 0 && now >= S.blinkAt) S.blinkT = 0;
    if (S.blinkT >= 0) { S.blinkT += dt; if (S.blinkT > 0.13) { S.blinkT = -1; S.blinkAt = now + 2200 + Math.random() * 3200; } }
    for (const p of S.parts) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.kind === "spark") p.vy += 60 * dt; if (p.kind === "dust") p.vx *= 0.92; }
    S.parts = S.parts.filter((p) => p.t < p.life);
    if (S.bubble) { S.bubble.t += dt; if (S.bubble.t > S.bubble.life) S.bubble = null; }
  }

  function frame() {
    const sp = S.sp, t = S.t;
    const blink = S.blinkT >= 0;
    const side = sp.side && sp.side.length ? sp.side : null;
    switch (S.act) {
      case "walk": case "run": {
        const fps = S.act === "run" ? 14 : 8, arr = side || sp.walk;
        return { f: arr[Math.floor(t * fps) % arr.length], flip: side ? S.dir < 0 : false };
      }
      case "peek": {
        if (t < S.d.walk) { const arr = side || sp.walk; return { f: arr[Math.floor(t * 8) % arr.length], flip: side ? S.dir < 0 : false }; }
        return { f: side ? side[0] : sp.idle[0], flip: side ? S.d.side < 0 : false };
      }
      case "look": return { f: side ? side[0] : sp.idle[0], flip: side ? S.dir < 0 : false };
      case "sit": return { f: sp.walk[Math.floor(t / 0.42) % 2 ? 1 : 3] || sp.idle[0], flip: false };
      case "sleep": return { f: sp.idle[2] || sp.idle[0], flip: false };
      case "wave": return { f: Math.floor(t / 0.24) % 2 ? sp.atk : sp.idle[0], flip: false };
      case "dance": return { f: Math.floor(t / 0.32) % 3 === 2 ? sp.atk : (side ? side[0] : sp.idle[0]), flip: side ? S.dir < 0 : false };
      case "jump": case "react": case "hop": return { f: sp.idle[0], flip: false };
      default: return { f: blink ? (sp.idle[2] || sp.idle[0]) : sp.idle[Math.floor(t / 0.55) % 2] || sp.idle[0], flip: false };
    }
  }

  function draw() {
    const d = S.dpr;
    g.setTransform(d, 0, 0, d, 0, 0);
    g.clearRect(0, 0, S.W, S.H);
    g.imageSmoothingEnabled = false;
    const sp = S.sp, fw = sp.w || 48, fh = sp.h || 60;
    const gx = Math.round(S.x), gy = S.ground;
    /* 足もとの影（跳んでいるあいだは小さく薄く。すき間の上では出さない） */
    const air = Math.max(0, -S.yOff);
    if (!inGap(S.x)) {
      g.fillStyle = "rgba(10,22,48," + (0.3 * (1 - Math.min(0.8, air / 26))).toFixed(3) + ")";
      g.beginPath(); g.ellipse(gx, gy - 1 + S.sink * 0.15, 12 * (1 - Math.min(0.5, air / 40)), 3, 0, 0, Math.PI * 2); g.fill();
    }
    const F = frame();
    g.save();
    g.translate(gx, Math.round(gy + S.yOff + S.sink));
    if (S.rot) g.rotate(S.rot);
    g.scale((F.flip ? -1 : 1) * S.sx, S.sy);
    g.drawImage(F.f, -Math.round(fw / 2), -fh + 1);
    g.restore();
    /* 粒（♪・♥・z・きらきら・ほこり） */
    for (const p of S.parts) {
      const a = Math.max(0, 1 - p.t / p.life);
      g.globalAlpha = a;
      if (p.kind === "dust") { g.fillStyle = "#ffffff"; g.fillRect(Math.round(p.x), Math.round(p.y), 2, 2); continue; }
      if (p.kind === "spark") { g.fillStyle = "#ffe066"; g.fillRect(Math.round(p.x) - 1, Math.round(p.y), 3, 1); g.fillRect(Math.round(p.x), Math.round(p.y) - 1, 1, 3); continue; }
      const ch = p.kind === "note" ? "♪" : p.kind === "heart" ? "♥" : p.kind === "z" ? (p.t > 0.9 ? "Z" : "z") : "✦";
      g.font = "900 " + (p.kind === "z" ? 10 : 11) + "px 'Noto Sans JP',sans-serif";
      g.textAlign = "center"; g.textBaseline = "middle";
      g.lineWidth = 3; g.strokeStyle = "rgba(18,32,61,.9)"; g.strokeText(ch, p.x, p.y);
      g.fillStyle = p.kind === "heart" ? "#ff5a8a" : p.kind === "note" ? "#ffe066" : "#ffffff";
      g.fillText(ch, p.x, p.y);
    }
    g.globalAlpha = 1;
    /* ふきだし */
    if (S.bubble) {
      const b = S.bubble, k = Math.min(1, b.t / 0.12) * Math.min(1, (b.life - b.t) / 0.2);
      g.globalAlpha = Math.max(0, k);
      g.font = "900 10px 'Noto Sans JP',sans-serif";
      const tw = Math.ceil(g.measureText(b.text).width), bw = tw + 12, bh = 17;
      let bx = gx - bw / 2;
      bx = Math.max(2, Math.min(S.W - bw - 2, bx));
      const by = Math.max(1, Math.round(gy + S.yOff + S.sink - fh - 6 - bh));
      g.fillStyle = "#ffffff"; g.strokeStyle = "#12203d"; g.lineWidth = 2;
      g.beginPath();
      if (g.roundRect) g.roundRect(bx, by, bw, bh, 8); else g.rect(bx, by, bw, bh);
      g.fill(); g.stroke();
      g.fillStyle = "#12203d"; g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText(b.text, bx + bw / 2, by + bh / 2 + 0.5);
      g.globalAlpha = 1;
    }
    /* 押せる場所をキャラに合わせる */
    if (hit && S.box) {
      hit.style.transform = "translate(" + Math.round(S.box.x + gx - 19) + "px," + Math.round(S.box.y + gy + S.yOff + S.sink - fh + 6) + "px)";
    }
  }

  /* ══ 動かす／止める ══ */
  function visible() {
    if (document.hidden) return false;
    const home = document.getElementById("xhome"); if (home && !home.classList.contains("on")) return false;
    const gate = document.getElementById("xevaHome");
    if (gate && gate.classList.contains("open") && gate.getClientRects().length) return false;
    if (document.body.classList.contains("xl-drawer-open")) return false;
    const lob = document.getElementById("xhLobby"); if (!lob || !lob.getClientRects().length) return false;
    return true;
  }
  let running = false, last = 0;
  function loop(now) {
    if (!S.sp) { running = false; return; }
    if (!visible()) { last = now; setTimeout(() => requestAnimationFrame(loop), 500); return; }
    if (now - S.layAt > 400) layout();
    const show = S.ok;
    if (cv.hidden === show) cv.hidden = !show;
    if (hit.hidden === show) hit.hidden = !show;
    if (!show) { hideChip(); last = now; setTimeout(() => requestAnimationFrame(loop), 700); return; }
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000)); last = now;
    try { update(dt); draw(); } catch (e) { console.warn("[home-dot]", e); }
    requestAnimationFrame(loop);
  }
  function kick() { if (running) return; running = true; last = performance.now(); requestAnimationFrame(loop); }

  /* 出す子を決めなおす（起動・設定を変えた・同期・ガチャから戻った） */
  let busy = false;
  async function refresh(entry) {
    if (busy) return; busy = true;
    try {
      _own = null;
      const id = want();
      if (!id) {
        S.sp = null; S.id = null;
        if (cv) cv.hidden = true; if (hit) hit.hidden = true; hideChip();
        try { window.HomeMate && HomeMate.relayout && HomeMate.relayout(); } catch (e) {}
        return;
      }
      if (!(await loadPix())) return;
      if (!mountEls()) return;
      if (id !== S.id || !S.sp) {
        S.sp = sprite(id); S.id = id;
        if (!S.sp) return;
        S.W = 0;
        layout();
        S.x = land(S.minX + (S.maxX - S.minX) * (0.3 + Math.random() * 0.4));
        S.blinkAt = performance.now() + 1500;
        start(entry ? "react" : "idle");
        if (entry) { puff("spark", 4); say("よろしくね！", 1.8); }
      }
      try { window.HomeMate && HomeMate.relayout && HomeMate.relayout(); } catch (e) {}
      kick();
      let seen = false; try { seen = localStorage.getItem(HINT) === "1"; } catch (e) {}
      if (!seen) {
        try { localStorage.setItem(HINT, "1"); } catch (e) {}
        setTimeout(() => { if (S.sp && S.ok) { say("押してみてね", 2.4); placeChip(); showChip(5200); } }, 1800);
      }
    } finally { busy = false; }
  }
  function set(v) {
    let st = {}; try { st = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) {}
    st.dot = v == null ? "" : String(v);
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {}
    try { sessionStorage.removeItem(PICK); } catch (e) {}
    S.id = null;
    refresh(v !== "off");
  }
  /* パートナー非表示のとき、バナーの上にあける高さ（出していないときは 0） */
  function room() { return want() ? ROOM : 0; }

  window.HomeDot = {
    ids, owned, ownedIds, nameOf, setting, set, thumb, room, loadPix,
    shown: () => S.id,
    refresh: () => refresh(false),
    _act: (a) => { if (S.sp) start(a); },      /* 確かめる用（動きを1つ指定して始める） */
  };

  /* ホームが出てから読む（はじめの表示を重くしない） */
  function boot() {
    const go = () => setTimeout(() => refresh(false), 1200);
    if (document.readyState === "complete") go(); else window.addEventListener("load", go, { once: true });
  }
  window.addEventListener("resize", () => { S.layAt = 0; });
  window.addEventListener("xeva:synced", () => refresh(false));
  window.addEventListener("pageshow", () => refresh(false));
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(false); });
  window.addEventListener("storage", (e) => { if (e.key === KEY || e.key === "magiburst_v1" || e.key === "xeva_gacha_v1") refresh(false); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
