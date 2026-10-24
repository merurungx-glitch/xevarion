/* ============================================================
   MagiShift — 画面（2026-09-21 新作 → ★★ 2026-10-13 1から作り直し）
   ------------------------------------------------------------
   1台の iPad をみんなで囲んで遊ぶ。
     タイトル → 準備（人数・ルール・プレイヤー・CPU）→ 順番の抽選 → 対戦 → 勝利 → 結果
   ・いま誰の番かを<b>いつも大きく</b>出す（手番の板・プレイヤーの札・盤のふちの色）。できることも文字で出す。
   ・自分以外の駒は押しても動かない（1台を回して使うので、まちがい操作を防ぐ）。
   ・★★ 2026-10-13 ご指定
       ① 動かすときは間の駒を飛びこえられる（shift-core.js）
       ② CPU（shift-ai.js）… 席ごとに「人／CPU」、強さは3段階
       ③ タクティクス（押す・ブロック）… 守るときの手段を増やした別ルール
       ④ 紐づけの継続（MagiChainParty と同じ）… 前回の紐づけを「要確認」で引きつぎ、
          押して4桁パスワードを入れると有効。アイコンと名前は開くたびに最新へ取り直す
   ・ルールは shift-core.js、CPU は shift-ai.js、アカウントは shift-account.js。ここは見た目と操作だけ。
   ============================================================ */
(function () {
  "use strict";
  const G = window.MShift;
  const $ = (q, el) => (el || document).querySelector(q);
  const $$ = (q, el) => Array.from((el || document).querySelectorAll(q));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  let S = null;                 /* いまの試合 */
  let HIST = [];                /* ★★ 2026-10-14 一手もどる用の記録（手を指す直前の盤面）。セーブにも最後の30手ぶんを残す */
  /* hold … ★★ 2026-10-15 1手もどして CPU の番になったときは、CPU を止めておく（「再開」で動き出す） */
  const UI = { prev: "title", blockMode: false, reported: false, hold: false };
  /* reach … ★★ 2026-10-14 あと1つでそろうマスの印（0＝表示しない〔標準〕・1＝いまの番の人だけ・2＝全員） */
  /* war … ★★ 2026-10-20 戦況バー（1＝出す〔標準〕・0＝出さない） */
  let opt = { size: 0, win: 0, pieces: 0, se: true, bgm: false, slow: false, reach: 0, war: 1 };
  const OPT_KEY = "magishift_opt_v1";
  try { opt = Object.assign(opt, JSON.parse(localStorage.getItem(OPT_KEY) || "{}")); } catch (e) {}
  const saveOpt = () => { try { localStorage.setItem(OPT_KEY, JSON.stringify(opt)); } catch (e) {} };

  /* ══ 駒の印（色だけに頼らない） ══ */
  const MARK = {
    circle: '<circle cx="12" cy="12" r="6.2"/>',
    cross: '<path d="M7.6 7.6l8.8 8.8M16.4 7.6l-8.8 8.8"/>',
    triangle: '<path d="M12 6.2l5.8 10.6H6.2z"/>',
    square: '<rect x="6.8" y="6.8" width="10.4" height="10.4" rx="1.6"/>',
    star: '<path d="M12 5.6l2 4.3 4.7.6-3.4 3.3.8 4.6L12 16.2 7.9 18.4l.8-4.6-3.4-3.3 4.7-.6z"/>',
    hex: '<path d="M12 5.4l5.6 3.3v6.6L12 18.6l-5.6-3.3V8.7z"/>',
    /* ★★ 2026-10-16 オレンジの印（ハート） */
    heart: '<path d="M12 18.2C8 15.3 5.6 13 5.6 10.2a3.2 3.2 0 0 1 6.4-.9 3.2 3.2 0 0 1 6.4.9c0 2.8-2.4 5.1-6.4 8z"/>',
    /* ★★ 2026-10-20 7人目（シアン）＝◆・8人目（ブラック）＝☾ */
    diamond: '<path d="M12 5.2 18.6 12 12 18.8 5.4 12z"/>',
    moon: '<path d="M14 6A6.6 6.6 0 1 0 17.6 15 5.2 5.2 0 0 1 14 6z"/>',
  };
  /* ★★ 2026-10-16 見た目は G.looks（色・形・印の色）。黄色は印を濃い色で描く（--pk） */
  const pieceSVG = (p, cls) => { const L = G.looks ? G.looks(p) : p; return '<svg class="pc ' + (cls || "") + '" viewBox="0 0 24 24" style="--pc:' + L.color + (L.ink ? ";--pk:" + L.ink : "") + '" aria-hidden="true">' +
    '<circle class="bg" cx="12" cy="12" r="10.6"/><ellipse class="hl" cx="9" cy="6.8" rx="5" ry="2.6"/><g class="mk">' + (MARK[L.mark] || MARK.circle) + "</g></svg>"; };
  const ICON = {
    wall: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="14" rx="2.5"/><path d="M3.5 9.7h17M3.5 14.3h17M9 5v4.7M15 9.7v4.6M9 14.3V19"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17"/></svg>',
    crown: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 8.5l4.6 3.8L12 5.5l3.9 6.8 4.6-3.8-1.8 9.8H5.3z"/><rect x="5.3" y="18.6" width="13.4" height="2" rx="1"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9.5h10V5l8 7-8 7v-4.5H3z"/></svg>',
    jump: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17c2-7 6-10 9-10s5 2 6 5"/><path d="M16.5 9.6 19.2 12l.6-3.6"/></svg>',
    push: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="7" cy="12" r="3.4"/><circle cx="15" cy="12" r="3.4"/><path d="M18.8 12h2.4M19.8 10.3l1.6 1.7-1.6 1.7"/></svg>',
    cpu: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="7" width="14" height="11" rx="3"/><path d="M12 7V4.5M9.5 12h.01M14.5 12h.01M9.5 15.5h5"/></svg>',
    /* ★★ 2026-10-14 一手もどる（↩） */
    undo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.6 4.6 4 9.2l4.6 4.6"/><path d="M4.6 9.2h9.2a5.6 5.6 0 0 1 0 11.2H10"/></svg>',
    /* ★★ 2026-10-15 止めた CPU の再開（▶） */
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="fl" d="M8 5.5v13l10.5-6.5z"/></svg>',
    /* ★★ 2026-10-20 ヒント（電球）・手番の時計・席の交代 */
    bulb: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 17.5h6M9.8 20.5h4.4"/><path d="M12 3.5a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2h5c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3.5z"/></svg>',
    clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="7.5"/><path d="M12 9v4.4l2.8 1.8M10 3.5h4"/></svg>',
    swap: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h11l-3-3M17 17H6l3 3"/></svg>',
  };
  const blkHTML = (color) => '<span class="blk" style="--bc:' + color + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h16M4 15h16M10 4v5M15 9v6M10 15v5"/></svg></span>';
  const thumb = (p) => (G.Account && G.Account.thumb ? G.Account.thumb(p) : (G.Account && G.Account.avatar ? G.Account.avatar(p) : ""));
  const avatarHTML = (p, cls) => {
    const a = thumb(p);
    return a ? '<img class="av' + (cls ? " " + cls : "") + '" src="' + esc(a) + '" alt="" style="--c:' + p.color + '" loading="lazy">' : "";
  };
  const isCpu = (p) => !!p && p.type === "cpu";

  /* ══ 音（短く・軽く・控えめ） ══ */
  let AC = null;
  function ac() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch (e) { AC = null; } return AC; }
  function tone(f, t0, dur, type, vol, f2) {
    const c = ac(); if (!c) return;
    try {
      const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + t0;
      o.type = type || "sine"; o.frequency.setValueAtTime(f, t);
      if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur * 0.9);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
    } catch (e) {}
  }
  function sfx(kind) {
    if (!opt.se) return;
    switch (kind) {
      case "put": tone(620, 0, 0.12, "sine", 0.13); tone(930, 0.06, 0.14, "sine", 0.08); break;
      case "move": tone(480, 0, 0.2, "triangle", 0.11, 780); break;
      case "push": tone(150, 0, 0.16, "square", 0.06, 90); tone(520, 0.05, 0.12, "triangle", 0.08); break;
      case "block": tone(240, 0, 0.09, "triangle", 0.12); tone(240, 0.1, 0.09, "triangle", 0.1); break;
      case "pick": tone(880, 0, 0.06, "sine", 0.06); break;
      case "no": tone(190, 0, 0.14, "square", 0.04); break;
      case "turn": tone(740, 0, 0.08, "sine", 0.04); break;
      case "win": [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.11, 0.3, "triangle", 0.11)); break;
      case "draw": tone(440, 0, 0.25, "sine", 0.08, 330); break;
      case "dice": tone(300 + Math.random() * 300, 0, 0.04, "square", 0.025); break;
      case "undo": tone(820, 0, 0.12, "triangle", 0.08, 520); tone(560, 0.07, 0.1, "sine", 0.05, 420); break;
      case "card": tone(1180, 0, 0.05, "sine", 0.05, 900); tone(700, 0.04, 0.09, "triangle", 0.06); break;
    }
  }
  /* ★ BGM。曲のファイルは持たず、やわらかい和音をその場で鳴らす（重くならない・オフラインでも鳴る）。
     設定を切ったときと、ゲーム画面から離れたときは必ず止める。 */
  let BG = null;
  const BG_CHORD = [[220, 277.18, 329.63], [196, 246.94, 293.66], [174.61, 220, 261.63], [164.81, 207.65, 246.94]];
  function bgmStop() {
    if (!BG) return;
    try { BG.gain.gain.linearRampToValueAtTime(.0001, AC.currentTime + .4); BG.oscs.forEach((o) => o.stop(AC.currentTime + .5)); } catch (e) {}
    clearInterval(BG.timer); BG = null;
  }
  function bgmStart() {
    if (BG || !opt.bgm) return;
    const c = ac(); if (!c) return;
    try {
      const gain = c.createGain();
      gain.gain.setValueAtTime(.0001, c.currentTime);
      gain.gain.linearRampToValueAtTime(.045, c.currentTime + 1.2);
      gain.connect(c.destination);
      const oscs = BG_CHORD[0].map((f) => { const o = c.createOscillator(); o.type = "triangle"; o.frequency.setValueAtTime(f, c.currentTime); o.connect(gain); o.start(); return o; });
      let i = 0;
      const timer = setInterval(() => { i = (i + 1) % BG_CHORD.length; oscs.forEach((o, k) => o.frequency.linearRampToValueAtTime(BG_CHORD[i][k], c.currentTime + 1.6)); }, 3200);
      BG = { gain, oscs, timer };
    } catch (e) { BG = null; }
  }

  function toast(t, ms) {
    const el = $("#toast");
    el.innerHTML = t; el.hidden = false;
    el.style.animation = "none"; void el.offsetWidth; el.style.animation = "";
    clearTimeout(toast._t); toast._t = setTimeout(() => { el.hidden = true; }, ms || 2000);
  }
  function show(id) {
    const cur = $(".scr.on");
    if (cur && cur.id !== id && ["title", "setup", "game", "result", "stats"].indexOf(cur.id) >= 0) UI.prev = cur.id;
    $$(".scr").forEach((s) => s.classList.toggle("on", s.id === id));
    $("#win").hidden = true;
    $("#ov").classList.remove("on");
    const sc = $("#" + id); if (sc) sc.scrollTop = 0;
    if (id === "title") demoStart(); else demoStop();
    /* BGM は対戦中だけ。ほかの画面では止める。 */
    if (id === "game" && opt.bgm) bgmStart(); else bgmStop();
    if (id !== "game") clearTimeout(cpuT);
  }

  /* ══ ① タイトル ══ */
  /* ★★ 2026-10-14 中断は試合ごとの枠（いくつでも・最大 G.MAX_SAVES）。1件ならそのまま再開、2件以上は一覧から選ぶ */
  function renderTitle() {
    const list = G.list();
    $("#btnCont").hidden = !list.length;
    if (list.length === 1) {
      const m = list[0].meta || {};
      $("#btnContTx").textContent = "つづきから（" + (m.players || []).length + "人・" + (G.MODES[m.mode] || G.MODES.normal).nm + "・" + (m.round || 1) + "周目）";
    } else if (list.length) $("#btnContTx").textContent = "つづきから（中断中 " + list.length + "件）";
    show("title");
  }
  function whenTxt(at) {
    const d = new Date(at || Date.now()), now = new Date();
    const hm = d.getHours() + ":" + String(d.getMinutes()).padStart(2, "0");
    if (d.toDateString() === now.toDateString()) return "きょう " + hm;
    const y = new Date(now); y.setDate(now.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return "きのう " + hm;
    return (d.getMonth() + 1) + "/" + d.getDate() + " " + hm;
  }
  function svRow(r) {
    const m = r.meta || {}, ps = m.players || [], tp = ps[m.turn] || null;
    return '<div class="svrow" data-g="' + esc(r.gid) + '"><div class="svp">' + ps.map((p) => pieceSVG({ id: p.id, color: p.color, mark: p.mark })).join("") + "</div>" +
      '<div class="svt"><b>' + ps.length + "人・" + esc((G.MODES[m.mode] || G.MODES.normal).nm) + "・" + m.size + "×" + m.size + "・" + m.win + "つ並べ</b>" +
      "<small>" + (m.round || 1) + "周目" + (tp ? '・<span style="color:color-mix(in srgb,' + esc(G.looks(tp).color) + ' 78%,#1d2445)">' + esc(tp.name) + "</span> の番" : "") + "・" + whenTxt(r.at) + "</small>" +
      '<small class="svn">' + ps.map((p) => esc(p.name) + (p.type === "cpu" ? "（CPU）" : "")).join("・") + "</small></div>" +
      '<div class="svb"><button class="btn sm pri" data-a="contGid" data-g="' + esc(r.gid) + '">' + IC2.play + "つづける</button>" +
      '<button class="ibtn sm del" data-a="delAsk" data-g="' + esc(r.gid) + '" aria-label="このセーブを消す">' + IC2.trash + "</button></div></div>";
  }
  function openSaves() {
    const list = G.list();
    if (!list.length) { $("#ov").classList.remove("on"); renderTitle(); return; }
    $("#ov").classList.add("on");
    $("#sheet").innerHTML = '<h2 class="svh">' + IC2.save + "つづきから</h2><p>中断中の試合が <b>" + list.length + "件</b> あります。つづける試合を選んでください" +
      "（いちばん新しいものが上・最大 " + G.MAX_SAVES + "件。こえると いちばん古いものから消えます）。</p>" +
      '<div class="svlist">' + list.map(svRow).join("") + "</div>" +
      '<div class="wbtns"><button class="btn" data-a="closeSheet">' + IC2.back + "もどる</button></div>";
  }
  /* タイトルの小さな盤：置く → 飛びこえて動かす、をゆっくりくり返す（控えめな動き） */
  const DEMO = { t: 0, i: 0, c: new Array(16).fill(-1) };
  const DEMO_STEPS = [
    { k: "put", p: 0, x: 1, y: 1 }, { k: "put", p: 1, x: 2, y: 2 }, { k: "put", p: 0, x: 1, y: 2 }, { k: "put", p: 1, x: 2, y: 1 },
    { k: "move", p: 0, fx: 1, fy: 1, x: 3, y: 3 }, { k: "put", p: 1, x: 0, y: 3 }, { k: "move", p: 0, fx: 1, fy: 2, x: 3, y: 2 },
    { k: "put", p: 1, x: 3, y: 1 }, { k: "wait" }, { k: "reset" },
  ];
  function demoBuild() {
    const b = $("#tdemo"); if (!b || b.childElementCount) return;
    b.innerHTML = Array.from({ length: 16 }, (_, i) => '<div class="cell" data-i="' + i + '"></div>').join("");
  }
  function demoPaint() {
    $$("#tdemo .cell").forEach((el, i) => { const v = DEMO.c[i]; const h = v >= 0 ? pieceSVG(G.COLORS[v]) : ""; if (el._h !== h) { el.innerHTML = h; el._h = h; } });
  }
  function demoStep() {
    const st = DEMO_STEPS[DEMO.i % DEMO_STEPS.length]; DEMO.i++;
    const cellEl = (x, y) => $('#tdemo .cell[data-i="' + (y * 4 + x) + '"]');
    if (st.k === "reset") { DEMO.c.fill(-1); demoPaint(); }
    else if (st.k === "put") { DEMO.c[st.y * 4 + st.x] = st.p; demoPaint(); const el = cellEl(st.x, st.y); if (el) { el.style.setProperty("--rc", G.COLORS[st.p].color); flash(el, ["put", "ripple"], 700); } }
    else if (st.k === "move") {
      DEMO.c[st.fy * 4 + st.fx] = -1; DEMO.c[st.y * 4 + st.x] = st.p; demoPaint();
      slideFrom(cellEl(st.fx, st.fy), cellEl(st.x, st.y));
    }
    DEMO.t = setTimeout(demoStep, st.k === "wait" ? 1600 : 1150);
  }
  function demoStart() { demoBuild(); clearTimeout(DEMO.t); DEMO.i = 0; DEMO.c.fill(-1); demoPaint(); DEMO.t = setTimeout(demoStep, 700); }
  function demoStop() { clearTimeout(DEMO.t); }

  /* ══ ② 準備（人数・ルール・プレイヤー・CPU）══
     ★★ 2026-09-21f プレイヤー登録・名前変更は MagiChainParty と同じしくみ（ご指定）
       ・席ごとに<b>名前をその場で打って変えられる</b>（6文字まで）
       ・🔗 で XEVARION アカウントを紐づけ（賞金を受け取る人だけ。紐づけなくても遊べる）
       ・紐づけた席をもう一度押すと解除
     ★★ 2026-10-13 ご指定「MagiChainParty のように紐づけの継続も」
       ・人数・ルール・CPU の強さ・席ごとの 人/CPU・名前・紐づけを<b>まとめて覚える</b>
       ・紐づけは<b>「要確認」</b>で戻す → 押して4桁パスワードを入れると有効（別の人が勝手に使えないように）
       ・確認した紐づけは、この画面を開いているあいだ（何回遊んでも）有効のまま
       ・紐づけたアカウントの名前・アイコンは開くたびに最新へ取り直す
     ★ パスワードはここでは保存しない（GameLink が確かめるのに使うだけ）。 */
  const SETUP_KEY = "magishift_setup_v1";
  const DEF_NAMES = ["あか", "あお", "みどり", "きいろ", "むらさき", "だいだい", "みずいろ", "くろ"];   /* ★★ 2026-10-20 8人まで */
  const CPU_LV = [["よわい", "ときどき油断"], ["ふつう", "守りもする"], ["つよい", "ふたまたを狙う"]];
  const setup = { n: 2, mode: "normal", cpuLevel: 1, all: DEF_NAMES.map((nm, i) => ({ name: nm, type: i === 0 ? "human" : "human", link: null })), restored: false };
  function saveSetup() {
    try {
      localStorage.setItem(SETUP_KEY, JSON.stringify({ v: 2, n: setup.n, mode: setup.mode, cpuLevel: setup.cpuLevel, players: setup.all.map((p) => ({
        name: p.name, type: p.type,
        link: (p.link && p.link.uid) ? { uid: p.link.uid, name: p.link.name, charFile: p.link.charFile || "", charId: p.link.charId || "" } : null,
      })) }));
    } catch (e) {}
  }
  function loadSetup() {
    try {
      const d = JSON.parse(localStorage.getItem(SETUP_KEY) || "null");
      if (!d) return;
      if (d.n >= 2 && d.n <= G.MAX_PLAYERS) setup.n = d.n;
      if (G.MODES[d.mode]) setup.mode = d.mode;
      if ([0, 1, 2].indexOf(d.cpuLevel) >= 0) setup.cpuLevel = d.cpuLevel;
      if (Array.isArray(d.players)) d.players.slice(0, G.MAX_PLAYERS).forEach((sp, i) => {
        const p = setup.all[i];
        if (sp && sp.name) p.name = String(sp.name).slice(0, 6);
        if (sp && (sp.type === "cpu" || sp.type === "human")) p.type = sp.type;
        /* ★ 紐づけは「未確認」で戻す。押して4桁パスワードを入れると有効 */
        if (sp && sp.link && sp.link.uid) p.link = { uid: sp.link.uid, name: sp.link.name, charFile: sp.link.charFile || "", charId: sp.link.charId || "", confirmed: false };
      });
      setup.restored = true;
    } catch (e) {}
  }
  const seats = () => setup.all.slice(0, setup.n);
  function ruleOf(n) {
    const r = G.RULES[n] || G.RULES[4];
    return { size: opt.size || r.size, win: opt.win || r.win, pieces: opt.pieces === 99 ? 0 : (opt.pieces || r.pieces) };
  }
  function renderSetup() {
    $("#segN").innerHTML = [2, 3, 4, 5, 6, 7, 8].map((n) => '<button class="' + (n === setup.n ? "on" : "") + '" data-a="setN" data-v="' + n + '">' + n + "人</button>").join("");
    const r = ruleOf(setup.n);
    $("#ruleInfo").innerHTML = "<span>盤 <b>" + r.size + "×" + r.size + "</b></span><span><b>" + r.win + "つ</b>並べたら勝ち</span><span>駒 1人 <b>" + (r.pieces ? r.pieces + "個" : "上限なし") + "</b></span>";
    $("#segMode").innerHTML = [
      ["normal", ICON.jump, "置く・動かすだけ。駒は2マス先まで、<b>あいだの駒を飛びこえて</b>動けます。"],
      ["tactics", ICON.push, "ノーマルに<b>押す</b>（となりの相手の駒を1マス押し出す）と<b>ブロック</b>（1周だけの壁・1人2個）を足した、守りの手が多いルール。"],
    ].map((m) => '<button class="mode' + (setup.mode === m[0] ? " on" : "") + '" data-a="setMode" data-v="' + m[0] + '"><span class="mt">' + m[1] + G.MODES[m[0]].nm + "</span><small>" + m[2] + "</small></button>").join("");
    $("#plist").innerHTML = seats().map((p, i) => {
      const c = G.COLORS[i];
      const linked = p.link && p.link.uid, ok = linked && p.link.confirmed !== false;
      const btn = p.type === "cpu" ? "" : !linked ? '<button class="gl-link-btn" data-a="seatlink" data-i="' + i + '" title="XEVARIONアカウントを紐づけて賞金を受け取る">🔗</button>'
        : ok ? '<button class="gl-link-btn on" data-a="seatlink" data-i="' + i + '" title="タップで紐づけを解除">✓ ' + esc(p.link.name) + "</button>"
        : '<button class="gl-link-btn pending" data-a="seatlink" data-i="' + i + '" title="前回の紐づけ — タップして4桁パスワードで確認">🔒 ' + esc(p.link.name) + "（要確認）</button>";
      const av = linked && p.type !== "cpu" ? avatarHTML({ charFile: p.link.charFile, charId: p.link.charId, color: c.color }) : "";
      return '<div class="prow" data-i="' + i + '" style="--c:' + c.color + ";animation-delay:" + (i * 0.04) + 's">' + pieceSVG(c) + av +
        '<input class="pname-in" maxlength="6" value="' + esc(p.name) + '" aria-label="' + esc(c.name) + 'の席の名前">' +
        '<div class="ptype"><button class="' + (p.type !== "cpu" ? "on" : "") + '" data-a="setType" data-i="' + i + '" data-v="human">人</button><button class="' + (p.type === "cpu" ? "on" : "") + '" data-a="setType" data-i="' + i + '" data-v="cpu">CPU</button></div>' + btn + "</div>";
    }).join("");
    const anyCpu = seats().some((p) => p.type === "cpu");
    $("#cpuCard").classList.toggle("hide", !anyCpu);
    $("#segCpu").innerHTML = CPU_LV.map((l, i) => '<button class="' + (i === setup.cpuLevel ? "on" : "") + '" data-a="setCpu" data-v="' + i + '">' + l[0] + "<small>" + l[1] + "</small></button>").join("");
  }
  function openSetup() {
    renderSetup();
    show("setup");
    if (setup.restored && !openSetup._told && seats().some((p) => p.link && p.link.uid && p.link.confirmed === false && p.type !== "cpu")) {
      openSetup._told = true;
      setTimeout(() => toast("🔗 前回の紐づけを引きつぎました。<b>🔒 要確認</b>を押してパスワードを確認してください", 3600), 450);
    }
    refreshProfiles();
  }
  /* 紐づけたアカウントの「今の」名前・アイコンを取り直す（開くたびに1回） */
  let profDone = false;
  function refreshProfiles() {
    if (profDone || !G.Account || !G.Account.refresh) return;
    profDone = true;
    const jobs = setup.all.filter((p) => p.link && p.link.uid).map((p) => G.Account.refresh(p.link).then((v) => {
      if (!v || !p.link) return false;
      const ch = (v.charFile || "") !== (p.link.charFile || "") || (v.name || "") !== (p.link.name || "");
      p.link.name = v.name || p.link.name; p.link.charFile = v.charFile || ""; p.link.charId = v.charId || "";
      return ch;
    }));
    if (!jobs.length) return;
    Promise.all(jobs).then((rs) => { if (!rs.some(Boolean)) return; saveSetup(); if ($("#setup").classList.contains("on")) renderSetup(); });
  }
  function seatLink(i) {
    const p = setup.all[i];
    if (!window.GameLink) { toast("紐づけ機能を準備中です…"); return; }
    if (navigator.onLine === false) { toast("オフライン中は紐づけできません"); return; }
    if (p.link && p.link.uid && p.link.confirmed === false) {
      GameLink.confirm(p.link).then((res) => {
        if (res && res.remove) { p.link = null; renderSetup(); saveSetup(); toast("紐づけを解除しました"); return; }
        if (res && res.uid) {
          p.link = { uid: res.uid, name: res.name, charFile: res.charFile || "", charId: res.charId || "", confirmed: true };
          renderSetup(); saveSetup(); toast("🔗 " + esc(res.name) + " の紐づけを確認しました");
        }
      });
      return;
    }
    if (p.link && p.link.uid) { p.link = null; renderSetup(); saveSetup(); toast("紐づけを解除しました"); return; }
    GameLink.link(p.name).then((res) => {
      if (!res || !res.uid) return;
      if (setup.all.some((q, j) => j !== i && j < setup.n && q.link && q.link.uid === res.uid)) { toast("そのアカウントはもう使われています"); return; }
      p.link = { uid: res.uid, name: res.name, charFile: res.charFile || "", charId: res.charId || "", confirmed: true };
      if (G.Account && G.Account.remember) G.Account.remember(p.link);
      renderSetup(); saveSetup(); toast("🔗 " + esc(res.name) + " を紐づけました");
    });
  }
  document.addEventListener("input", (e) => {
    if (!e.target.matches || !e.target.matches(".pname-in")) return;
    const i = +e.target.closest(".prow").dataset.i;
    setup.all[i].name = e.target.value.slice(0, 6);
    saveSetup();
  });

  /* ══ ③ 順番の決め方 ══
     ★★ 2026-09-22 ご指定「順番を抽選でランダムに」→ ★★ 2026-10-15 ご指定「順番の決め方を新しいものに（カジュアルかつシンプルに）」
     ＝<b>カードめくり</b>：うら向きのカード（中は 1〜人数 の数字）を、席の順に1人1枚ずつめくる。数字の小さい人から順番。
       CPU は自分でめくる。「おまかせ」で残りを全部めくれる。「もう一度きめる」で配り直し。 */
  function begin() {
    const ps = seats();
    if (ps.every((p) => p.type === "cpu")) { toast("1人は「人」にしてください（CPU だけでは遊べません）"); return; }
    const r = ruleOf(setup.n);
    S = G.newGame(ps.map((p, i) => {
      const lk = p.type !== "cpu" && p.link && p.link.uid && p.link.confirmed !== false ? p.link : null;
      const nm = String(p.name || "").trim() || DEF_NAMES[i];
      return { uid: lk ? lk.uid : "", name: nm, type: p.type === "cpu" ? "cpu" : "human",
        charFile: lk ? lk.charFile : "", charId: lk ? lk.charId : "", acct: lk ? lk.name : "" };
    }), { size: r.size, win: r.win, pieces: opt.pieces || 0, mode: setup.mode, cpuLevel: setup.cpuLevel });
    const pend = ps.filter((p) => p.type !== "cpu" && p.link && p.link.uid && p.link.confirmed === false).length;
    if (pend) toast("🔒 パスワード未確認の紐づけ " + pend + " 件は今回は使いません（準備の画面で確認できます）", 3000);
    saveSetup();
    UI.reported = false;
    drawOrder();
  }
  let orderTimer = 0;
  /* OD … カードめくりの状態（nums[k]＝k 枚目のカードの数字・by[k]＝めくった人の slot・who＝いまめくる人の席の番号） */
  let OD = null;
  function drawOrder() {
    const n = S.players.length;
    clearTimeout(orderTimer);
    OD = { nums: G.shuffleOrder(n).map((v) => v + 1), by: Array(n).fill(-1), who: 0, auto: false, done: false };
    $("#orderList").innerHTML = "";
    $("#orderBtns").hidden = true;
    const box = $("#orderCards");
    box.dataset.n = n;
    /* ★★ 2026-10-20 ご指定「順番決めのトランプがきれいに揃って」：1段に並べる枚数を決めて、段ごとに同じ数（5枚＝3＋2・7枚＝4＋3…）。残りの段はまん中 */
    box.style.setProperty("--cols", n <= 4 ? n : Math.ceil(n / 2));
    box.innerHTML = OD.nums.map((v, k) =>
      '<button class="ocd" data-a="orderPick" data-k="' + k + '" aria-label="' + (k + 1) + '枚目のカード" style="--d:' + (k * 0.06).toFixed(2) + 's">' +
        '<span class="in"><span class="bk"><i>?</i></span><span class="fr"><b>' + v + "</b><em></em></span></span></button>").join("");
    show("order");
    orderTurn();
  }
  /* いまめくる人を出す（CPU なら少し待って自分でめくる） */
  function orderTurn() {
    const n = S.players.length;
    if (OD.who >= n) { orderDone(); return; }
    const p = S.players[OD.who];
    $("#orderTitle").innerHTML = pieceSVG(p) + "<b>" + esc(p.name) + "</b><small>" + (isCpu(p) ? "（CPU）がカードをえらんでいます…" : "　カードを1枚えらんでね") + "</small>";
    $("#orderSub").textContent = "数字の小さい人から順番です（1 が先攻）";
    $("#orderAuto").hidden = false;
    $$("#orderCards .ocd").forEach((b) => { b.disabled = OD.by[+b.dataset.k] >= 0 || isCpu(p); });
    $("#order").style.setProperty("--tc", p.color);
    if (isCpu(p) || OD.auto) {
      orderTimer = setTimeout(() => {
        const free = OD.by.map((v, k) => (v < 0 ? k : -1)).filter((k) => k >= 0);
        orderPick(free[(Math.random() * free.length) | 0]);
      }, OD.auto ? 170 : 560);
    }
  }
  function orderPick(k) {
    if (!OD || OD.done || OD.who >= S.players.length || OD.by[k] >= 0) return;
    const p = S.players[OD.who];
    OD.by[k] = p.slot;
    const b = $('#orderCards .ocd[data-k="' + k + '"]');
    if (b) {
      b.style.setProperty("--c", p.color);
      const em = b.querySelector(".fr em"); if (em) em.innerHTML = pieceSVG(p) + "<span>" + esc(p.name) + "</span>";
      b.classList.add("open"); b.disabled = true;
      if (OD.nums[k] === 1) b.classList.add("first");
    }
    sfx("card");
    OD.who++;
    clearTimeout(orderTimer);
    orderTimer = setTimeout(orderTurn, OD.auto ? 140 : 380);
  }
  /* 全員めくったら、数字の順に並べて発表 */
  function orderDone() {
    const n = S.players.length;
    OD.done = true;
    const slotOf = {}; OD.nums.forEach((v, k) => { slotOf[v] = OD.by[k]; });
    S.order = Array.from({ length: n }, (_, i) => slotOf[i + 1]);
    G.startTurn(S);
    const f = S.players[S.order[0]];
    $("#orderTitle").innerHTML = "<b>順番が決まりました！</b>";
    $("#orderSub").innerHTML = "<b>" + esc(f.name) + "</b> から始めます";
    $("#orderAuto").hidden = true;
    $("#order").style.setProperty("--tc", f.color);
    $("#orderList").innerHTML = S.order.map((slot, k) => {
      const p = S.players[slot];
      return '<div class="oitem" style="--c:' + p.color + ";animation-delay:" + (0.25 + k * 0.08) + 's"><span class="ork">' + (k + 1) + "</span>" + pieceSVG(p) + '<b class="onm">' + esc(p.name) + "</b>" +
        (isCpu(p) ? '<span class="ocpu">CPU</span>' : "") + (k === 0 ? '<span class="ofirst">先攻</span>' : "") + "</div>";
    }).join("");
    sfx("put");
    orderTimer = setTimeout(() => { $("#orderBtns").hidden = false; }, 300 + n * 80);
  }

  /* ══ ④ 対戦 ══ */
  function startGame() {
    UI.blockMode = false; UI.hold = false; UI.review = false;
    HIST = [];
    const dropped = G.save(S, HIST);
    /* ★★ 2026-10-20 ご指摘「開始してから上の名前の表示がまとまり、盤が動く」：
       前は<b>画面を出す前</b>に描いていたので、札の列の幅が 0 → 仮の幅（340px）で列を数えていた（4人なら2段）。
       次の手で本当の幅で数えなおして1段に「まとまり」、そのぶん盤が動いていた → 画面を出してから描く */
    show("game");
    renderGame(true);
    turnClock(true);
    toast("🎯 <b>" + S.win + "つ</b>並べたら勝ち！" + (G.isTactics(S) ? "（タクティクス：押す・ブロックあり）" : ""), 2400);
    if (dropped) setTimeout(() => toast("💾 中断中の試合が " + G.MAX_SAVES + "件をこえたので、いちばん古いセーブを消しました", 3200), 2500);
    scheduleCpu();
  }
  function resume(gid) {
    const d = G.load(gid);
    if (!d || !d.S) { toast("このセーブは読めませんでした"); renderTitle(); return; }
    S = d.S; HIST = d.hist || []; UI.blockMode = false; UI.reported = false; UI.hold = false; UI.review = false;
    show("game");
    renderGame(true);
    turnClock(true);
    toast("▶ つづきから再開");
    scheduleCpu();
  }
  /* ══ ★★ 2026-10-14 ご指定「一手戻るボタン（デザインして）」══
     ・手を指す直前の盤面を HIST に積む（人の手は h:1、CPU の手は h:0。h は今は見せかたにだけ使う）。
     ・★★ 2026-10-15 ご指定「一手戻るは、自分・相手に関係なく、一つ前にだれかが置いたところに戻る」（MagiChainParty の「一手もどす」と同じ考え方）
       ＝<b>押すたびに、最後に指された1手だけ</b>を戻す（CPU の手でも1手）。
       戻した結果 CPU の番になったときは、CPU を<b>一時停止</b>（UI.hold）＝すぐ指し直さない。続けて押せばさらに1手ずつ戻り、「再開」で CPU が動き出す。
     ・決着がついた試合は戻さない（賞金・戦績を送ったあとなので）。番が回ってこない「とばし」は記録しない。 */
  function pushHist() {
    if (!S || S.phase !== "play") return;
    HIST.push({ s: JSON.stringify(Object.assign({}, S, { sel: null, log: [] })), ll: (S.log || []).length, h: isCpu(G.cur(S)) ? 0 : 1 });
    if (HIST.length > 300) HIST.splice(0, HIST.length - 300);
  }
  const canUndo = () => !!S && S.phase === "play" && HIST.length > 0;
  function undo() {
    if (!canUndo()) return;
    clearTimeout(cpuT);
    const h = HIST.pop();
    if (!h) return;
    const before = S.cells.slice(), log = (S.log || []).slice(0, h.ll);
    let R = null;
    try { R = JSON.parse(h.s); } catch (e) { R = null; }
    if (!R || !R.cells) return;
    /* ★★ 2026-10-20 途中で CPU にした席は、もどしても CPU のまま（交代は手の記録ではないので） */
    (R.players || []).forEach((q, i) => { const c = S.players[i]; if (!c) return; q.type = c.type; if (c.sub) q.sub = c.sub; else delete q.sub; });
    R.log = log; S = R; UI.blockMode = false; UI.hint = null;
    const who = G.cur(S);
    UI.hold = isCpu(who);           /* CPU の手を戻したら、CPU は止めておく */
    renderGame(true);
    /* 変わったマスを軽く光らせる（どこが戻ったか分かるように） */
    for (let i = 0; i < S.cells.length; i++) if (S.cells[i] !== before[i]) { const el = cellEl(i % S.size, Math.floor(i / S.size)); if (el) flash(el, ["rew"], 560); }
    sfx("undo");
    toast("↩ <b>" + esc(who.name) + "</b> の手をもどしました" + (HIST.length ? "" : "（これ以上はもどれません）") + (UI.hold ? "<br><small>CPU は止めています。「再開」で動き出します</small>" : ""), UI.hold ? 2600 : 1800);
    scheduleCpu();
  }
  function cpuResume() {
    if (!S || S.phase !== "play") return;
    UI.hold = false;
    renderGame();
    scheduleCpu();
  }
  /* ══ ★★ 2026-10-14 ご指定「あと一つで揃うマーク（標準は表示しない）」══
     空いているマスのうち、そこに置けばその人の駒が「並べる数」そろうマスに、その人の色の印。設定で 表示しない／いまの番の人だけ／全員 */
  function reachMap() {
    const out = {};
    if (!opt.reach || !S || S.phase !== "play") return out;
    const slots = opt.reach === 1 ? [S.turn] : S.players.map((p) => p.slot);
    for (let i = 0; i < S.cells.length; i++) {
      if (S.cells[i] !== -1) continue;
      const x = i % S.size, y = Math.floor(i / S.size);
      slots.forEach((sl) => { S.cells[i] = sl; const ln = G.lineAt(S, x, y); S.cells[i] = -1; if (ln) (out[i] = out[i] || []).push(sl); });
    }
    return out;
  }
  function renderGame(full, swap) {
    if (!S) return;
    const play = S.phase === "play", p = G.cur(S);
    const tc = play ? p.color : "#9aa3bd";
    $("#game").style.setProperty("--tc", tc);
    $("#gmeta").textContent = S.players.length + "人・" + S.size + "×" + S.size + "・" + S.win + "つ並べ・" + (G.MODES[S.mode] || G.MODES.normal).nm;
    /* ★★ 2026-09-22 ご指定：名前は<b>手番の順に</b>並べる（左の数字＝手番の順） */
    const gp = $("#gplayers"), n = S.players.length;
    gp.dataset.n = n;
    /* ★★ 2026-10-20 幅は「札の列 → 対戦の画面 → 画面の幅」の順で測る（画面を出す前に呼ばれても仮の 340px で数えない）。
       5人以上でせまい画面は札を小さく（cmp）して4列まで。段ごとの数はそろえる（5人＝3＋2・7人＝4＋3） */
    const w = gp.clientWidth || ($("#game").clientWidth - 24) || (window.innerWidth - 24) || 340;
    const cmp = n >= 5 && w < 560;
    gp.classList.toggle("cmp", cmp);
    const mx = Math.max(1, Math.floor((w + 8) / (cmp ? 82 : 136)));
    let cols = Math.min(n, mx); if (cols < n) cols = Math.ceil(n / Math.ceil(n / cols));
    gp.style.gridTemplateColumns = "repeat(" + cols + ",minmax(0,1fr))";
    gp.innerHTML = G.orderOf(S).map((slot, k) => {
      const q = S.players[slot], on = q.slot === S.turn && play;
      const out = G.outOfPieces(S, q.slot), left = G.leftOf(S, q.slot);
      /* ★★ 2026-10-14 ご指摘「駒を使い切った表示が範囲を出ていて見づらい」：長い文（使いきり・動かすだけ）が札の外へはみ出していた
         → 短い札「使いきり」（くわしい説明は手番の板・title に）にして、はみ出しても札の中で切る */
      /* ★★ 2026-10-20 小さい札（5人以上・せまい画面）は「のこり」を省いて数だけ（CPU は印のかどの小さな札で） */
      const pieces = S.maxPieces ? (out ? '<small class="out" title="駒を使いきりました（動かすだけ）"><span class="ob">' + (cmp ? "使用済" : "使いきり") + "</span>" + bk(q.slot) + "</small>" : "<small>" + (cmp ? "のこ" : "のこり ") + left + "個" + bk(q.slot) + "</small>") : "<small>" + G.countOf(S, q.slot) + "個" + bk(q.slot) + "</small>";
      return '<div class="pchip' + (on ? " on" : "") + (isCpu(q) ? " cpu" : "") + (q.sub ? " sub" : "") + '" style="--c:' + q.color + '"><span class="ord">' + (k + 1) + '</span><span class="pcw">' + pieceSVG(q) + avatarHTML(q, "mini") + "</span>" +
        '<span class="pn"><span class="pnr"><b>' + esc(q.name) + (isCpu(q) ? ' <span class="tag">' + (q.sub ? "代打CPU" : "CPU") + "</span>" : "") + "</b>" +
        /* ★★ 2026-10-24 ご指定「守りの回数を名前のところに小さく」 */
        '<i class="dfc" title="守り：ほかの人の「あと1つでそろう」マスを防いだ回数">🛡' + ((S.def && S.def[q.slot]) || 0) + "</i></span>" + pieces + "</span></div>";
    }).join("");
    if (full) buildBoard();
    paintWar();
    paintBoard();
    paintTurn(swap);
    turnClock();
    $("#board").classList.toggle("done", !play);
    if (play && !UI.review && !S.sandbox) G.save(S, HIST);
  }
  /* ══ ★★ 2026-10-20 ご指定「戦況をバーで表示（設定で非表示にも）」══
     人ごとの勢い（形のよさ＋すぐ勝てるマス・shift-ai.js の advantage）を、1本の帯の長さで。
     いまの番の人の区切りは少し明るく・リーチがある人には小さな印。決着したら勝った人の色いっぱいに。 */
  function paintWar() {
    const el = $("#gwar"); if (!el) return;
    const on = !!opt.war && S && S.players.length > 1;
    el.hidden = !on;
    if (!on) return;
    let sh = null;
    try { sh = S.phase === "play" ? G.AI.advantage(S) : S.players.map((p) => (p.slot === S.winner ? 1 : 0)); } catch (e) { sh = null; }
    if (!sh) { el.hidden = true; return; }
    if (S.draw) sh = S.players.map(() => 1 / S.players.length);
    const reach = {}; if (S.phase === "play") S.players.forEach((p) => { try { if (G.AI.winCells(S, p.slot).length) reach[p.slot] = 1; } catch (e) {} });
    const ord = G.orderOf(S);
    if (!el.firstChild || el.dataset.n !== String(S.players.length)) {
      el.dataset.n = S.players.length;
      el.innerHTML = '<span class="wl">戦況</span><div class="wbar">' + ord.map((slot) => '<i data-s="' + slot + '"><b></b></i>').join("") + "</div>";
    }
    ord.forEach((slot) => {
      const q = S.players[slot], seg = el.querySelector('i[data-s="' + slot + '"]'); if (!seg) return;
      const pct = Math.max(0, sh[slot] || 0) * 100;
      seg.style.flexGrow = Math.max(0.0001, pct).toFixed(3);
      seg.style.setProperty("--c", q.color);
      seg.classList.toggle("on", S.phase === "play" && slot === S.turn);
      seg.classList.toggle("rch", !!reach[slot]);
      seg.title = q.name + "：" + Math.round(pct) + "%" + (reach[slot] ? "（リーチ）" : "");
      seg.firstChild.textContent = pct >= 12 ? Math.round(pct) + "%" : "";
    });
  }
  /* ══ ★★ 2026-10-20 ご指定「毎回の手番開始から経過時間を表示（次の人になったら毎度リセット）」══
     手番が変わった（moves か turn が変わった）ときに 0 から数えなおす。1秒ごとに手番の板の時計だけ書きかえる */
  let clockT = 0;
  function turnClock(reset) {
    if (!S) return;
    const key = S.moves + ":" + S.turn + ":" + S.phase;
    if (reset || UI.clockKey !== key) { UI.clockKey = key; UI.clock0 = Date.now(); }
    paintClock();
    clearInterval(clockT);
    if (S.phase === "play") clockT = setInterval(() => { if (!$("#game").classList.contains("on") || !S || S.phase !== "play") { clearInterval(clockT); return; } paintClock(); }, 1000);
  }
  function paintClock() {
    const el = $("#tbClock"); if (!el || !UI.clock0) return;
    const sec = Math.max(0, Math.floor((Date.now() - UI.clock0) / 1000));
    el.lastChild.textContent = Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0");
    el.classList.toggle("long", sec >= 60);
  }
  /* ══ ★★ 2026-10-20 ご指定「ヒントを表示できるように」══
     いまの番の人にとって、いちばんよい手（CPU の「つよい」の考え方）を盤の上に光で出す＋理由をひとこと。
     ・置く／ブロック … そのマスが光る　・動かす／押す … 選ぶ駒と行き先が光る（矢印）
     ・手を指すか、番が変わると消える。もう一度押すと消える */
  const HINT_WHY = { win: "ここで<b>勝てます</b>！", stop: "{p} の<b>リーチを止める</b>手です", fork: "<b>2か所のリーチ（ふたまた）</b>を作る手です", reach: "<b>あと1つでそろう形（リーチ）</b>を作る手です", shape: "並びがのびる、<b>形のよい</b>手です" };
  function showHint() {
    if (!S || S.phase !== "play" || isCpu(G.cur(S))) return;
    if (UI.hint) { UI.hint = null; paintBoard(); return; }
    const h = G.AI.hint(S);
    if (!h || !h.a) { toast("いまは良い手が見つかりませんでした"); return; }
    UI.hint = Object.assign({ key: S.moves + ":" + S.turn }, h);
    S.sel = null; UI.blockMode = false;
    renderGame();
    const a = h.a, verb = a.t === "place" ? "置く" : a.t === "move" ? "動かす" : a.t === "push" ? "押す" : "ブロックを置く";
    const who = h.who != null && S.players[h.who] ? '<span style="color:color-mix(in srgb,' + S.players[h.who].color + ' 80%,#1d2445)">' + esc(S.players[h.who].name) + "</span>" : "相手";
    toast("💡 ヒント：光っているところに<b>" + verb + "</b>。" + (HINT_WHY[h.why] || HINT_WHY.shape).replace("{p}", who), 3200);
    sfx("pick");
  }
  function bk(slot) {
    if (!G.isTactics(S)) return "";
    const n = S.blockLeft[slot] || 0;
    return ' <span class="bk" title="ブロック のこり ' + n + '">' + (n ? "<i></i>".repeat(n) : "—") + "</span>";
  }
  function buildBoard() {
    const b = $("#board");
    b.style.setProperty("--n", S.size);
    b.innerHTML = Array.from({ length: S.size * S.size }, (_, i) =>
      '<button class="cell" data-a="cell" data-x="' + (i % S.size) + '" data-y="' + Math.floor(i / S.size) + '" aria-label="' + (i % S.size + 1) + "列 " + (Math.floor(i / S.size) + 1) + '行"></button>').join("");
  }
  function paintBoard() {
    const play = S.phase === "play", p = play ? G.cur(S) : null, human = play && !isCpu(p);
    const sel = S.sel;
    const moves = sel ? G.movesOf(S, sel.x, sel.y) : [];
    const pushes = sel ? G.pushesOf(S, sel.x, sel.y) : [];
    const blkBy = {}; (S.blks || []).forEach((b) => { blkBy[b.y * S.size + b.x] = b.by; });
    const L = S.last, lc = L ? S.players[L.slot].color : "";
    const RC = reachMap();
    const H = UI.hint && UI.hint.key === S.moves + ":" + S.turn && play ? UI.hint.a : null;
    if (!H && UI.hint) UI.hint = null;
    $$("#board .cell").forEach((el) => {
      const x = +el.dataset.x, y = +el.dataset.y, v = G.at(S, x, y), i = y * S.size + x;
      let h = v >= 0 ? pieceSVG(S.players[v]) : v === G.BLOCK ? blkHTML((S.players[blkBy[i]] || { color: "#9aa6bd" }).color) : "";
      const pu = pushes.find((q) => q.tx === x && q.ty === y);
      if (pu) h += '<span class="parr" style="--rot:' + Math.round(Math.atan2(pu.dy, pu.dx) * 180 / Math.PI) + 'deg">' + ICON.arrow + "</span>";
      /* ★★ 2026-10-14 あと1つでそろうマスの印（その人の色の輪。何人ぶんも重なるときは小さく並べる） */
      if (v === -1 && RC[i]) h += '<span class="rch n' + Math.min(4, RC[i].length) + '" title="あと1つでそろう">' + RC[i].map((sl) => '<i style="--rc:' + S.players[sl].color + '"></i>').join("") + "</span>";
      if (el._h !== h) { el.innerHTML = h; el._h = h; }
      const mv = moves.find((m) => m.x === x && m.y === y);
      el.classList.toggle("mine", human && v === S.turn);
      el.classList.toggle("sel", !!sel && sel.x === x && sel.y === y);
      el.classList.toggle("cand", !!mv);
      el.classList.toggle("jump", !!(mv && mv.jump));
      el.classList.toggle("pushc", !!pu);
      el.classList.toggle("bcand", human && UI.blockMode && v === -1);
      /* ★★ 2026-10-20 ヒント：行き先（hto）・選ぶ駒（hfrom）・押す駒（hpush） */
      el.classList.toggle("hto", !!H && H.x === x && H.y === y);
      el.classList.toggle("hfrom", !!H && (H.t === "move" || H.t === "push") && H.fx === x && H.fy === y);
      el.classList.toggle("hpush", !!H && H.t === "push" && H.tx === x && H.ty === y);
      el.classList.toggle("last", !!L && L.x === x && L.y === y && play);
      el.classList.toggle("lastfrom", !!L && (L.t === "move" && L.fx === x && L.fy === y || L.t === "push" && L.tx === x && L.ty === y) && v === -1 && play);
      el.style.setProperty("--lc", lc);
      const wi = S.line ? S.line.findIndex((c) => c.x === x && c.y === y) : -1;
      el.classList.toggle("win", wi >= 0);
      if (wi >= 0) el.style.setProperty("--wd", (wi * 0.08) + "s");
      el.disabled = !human;
    });
  }
  function paintTurn(swap) {
    const t = $("#turnbar");
    if (UI.review) { t.innerHTML = reviewBarHTML(); return; }   /* ★★ 2026-10-24 見返し中 */
    if (S.phase !== "play") {
      t.innerHTML = '<div class="tb-who"><b style="color:var(--sub)">' + (S.draw ? "引き分け" : "試合終了") + '</b></div><div class="tb-hint">' + (S.draw ? "CPU どうしで " + MAXR + "周しても決着がつきませんでした" : "おつかれさまでした！") + "</div>";
      return;
    }
    const p = G.cur(S), cpu = isCpu(p), tac = G.isTactics(S);
    const pushes = S.sel ? G.pushesOf(S, S.sel.x, S.sel.y) : [];
    const left = G.leftOf(S, p.slot);
    let hint;
    if (cpu && UI.hold) hint = "<b>一時停止中</b>（1手もどしました）。もう一度「もどる」でさらに1手、<b>再開</b>で CPU が動きます";
    else if (cpu) hint = '考えています<span class="tb-think"><i></i><i></i><i></i></span>';
    else if (UI.blockMode) hint = "ブロックを置くマスを選んでください。<b>次の自分の番まで</b>、そこにはだれも置けません";
    else if (S.sel) hint = "光っているマスへ<b>動かす</b>" + (pushes.length ? "／<b>矢印の駒を押す</b>" : "") + "。同じ駒をもう一度押すと取り消し";
    else if (G.outOfPieces(S, p.slot)) hint = "駒を使いきりました。<b>自分の駒を選んで動かします</b>" + (tac ? "（押す・ブロックもできます）" : "");
    else hint = "空いているマスに<b>置く</b>／自分の駒を選んで<b>動かす</b>" + (tac ? "・<b>押す</b>" : "") + (left != null ? '<span class="left">のこり ' + left + "個</span>" : "");
    let acts = "";
    if (!cpu && tac) {
      const bl = S.blockLeft[p.slot] || 0;
      acts += '<button class="tbtn' + (UI.blockMode ? " on" : "") + '" data-a="blockMode"' + (bl ? "" : " disabled") + ">" + ICON.wall + '<span class="tl">ブロック</span><b>' + bl + "</b></button>";
    }
    if (!cpu && (S.sel || UI.blockMode)) acts += '<button class="tbtn" data-a="cancel" aria-label="やめる">' + ICON.x + '<span class="tl">やめる</span></button>';
    /* ★★ 2026-10-14 1手もどる（CPU の番でも押せる）→ ★★ 10-15 だれの手でも1手ずつ。止めた CPU は「再開」 */
    if (cpu && UI.hold) acts += '<button class="tbtn go" data-a="cpuGo" aria-label="CPU を再開">' + ICON.play + '<span class="tl">再開</span></button>';
    /* ★★ 2026-10-20 ヒント（人の番だけ） */
    if (!cpu) acts += '<button class="tbtn hint' + (UI.hint ? " on" : "") + '" data-a="hint" aria-label="ヒント" title="いちばん良さそうな手を光らせます">' + ICON.bulb + '<span class="tl">ヒント</span></button>';
    if (canUndo()) acts += '<button class="tbtn undo" data-a="undo" aria-label="1手もどる" title="1手もどる（だれの手でも、ひとつ前にもどります）">' + ICON.undo + '<span class="tl">1手もどる</span><span class="ts">もどる</span></button>';
    /* ★★ 2026-10-24 試しの対局のときは「見返しにもどる」「本番の結果へ」 */
    if (S.sandbox) acts += '<button class="tbtn" data-a="rvBack" title="見返しにもどる">' + ICON.undo + '<span class="tl">見返し</span></button><button class="tbtn" data-a="rvEnd">' + IC2.list + '<span class="tl">本番の結果へ</span></button>';
    t.innerHTML = (S.sandbox ? '<div class="tb-sand">🧪 試しの対局（保存しない・賞金なし）</div>' : "") + '<div class="tb-who' + (swap ? " swap" : "") + '">' + pieceSVG(p) + "<b>" + esc(p.name) + "</b><small>の番" + (cpu ? "（CPU）" : "") + "</small>" +
        '<span class="tb-clock" id="tbClock" title="この手番の経過時間（次の人でリセット）">' + ICON.clock + "<span>0:00</span></span></div>" +
      '<div class="tb-hint">' + hint + "</div>" + '<div class="tb-acts">' + acts + "</div>";
  }
  const MAXR = G.MAX_ROUNDS;
  /* ★★ 2026-10-14 ご指定「戻るボタンなどは全てデザイン」：メニュー・確認・勝利の板のボタンにもアイコン */
  const IC2 = {
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
    redo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4.5V9h-4.5"/></svg>',
    list: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7h10M9 12h10M9 17h10"/><path class="fl" d="M5 6h1.6v1.6H5zM5 11.2h1.6v1.6H5zM5 16.4h1.6V18H5z"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="fl" d="M8 5.5v13l10.5-6.5z"/></svg>',
    save: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4.5h11l3 3V19a.5.5 0 0 1-.5.5h-13A.5.5 0 0 1 5 19z"/><path d="M8 4.5V9h7V4.5"/><path d="M8 19.5v-6h8v6"/></svg>',
    book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4.5h9.5a2 2 0 0 1 2 2v13H7a2 2 0 0 1-2-2z"/><path d="M5 17.5a2 2 0 0 1 2-2h9.5"/><path d="M8.5 8.5h5M8.5 11.5h4"/></svg>',
    gear: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M6 18l1.6-1.6M16.4 7.6 18 6"/></svg>',
    exit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M10 16l-4-4 4-4M6 12h10"/></svg>',
    trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 7h15M9.5 7V4.8h5V7"/><path d="M6.5 7l.9 12.2a1 1 0 0 0 1 .8h7.2a1 1 0 0 0 1-.8L17.5 7"/><path d="M10.3 10.5v6M13.7 10.5v6"/></svg>',
  };

  function onCell(x, y) {
    if (!S || S.phase !== "play" || UI.review) return;   /* ★★ 2026-10-24 見返し中は見るだけ */
    if (isCpu(G.cur(S))) { toast("いまは CPU の番です"); return; }
    if (UI.blockMode) {
      if (G.canBlock(S, x, y)) { pushHist(); const res = G.block(S, x, y); sfx("block"); after(res); return; }
      sfx("no"); toast("ブロックは空いているマスに置けます"); return;
    }
    if (S.sel) {
      if (S.sel.x === x && S.sel.y === y) { S.sel = null; renderGame(); return; }      /* もう一度押すと取り消し */
      if (G.canMove(S, S.sel.x, S.sel.y, x, y)) { pushHist(); const res = G.move(S, S.sel.x, S.sel.y, x, y); sfx("move"); after(res); return; }
      if (G.canPush(S, S.sel.x, S.sel.y, x, y)) { pushHist(); const res = G.push(S, S.sel.x, S.sel.y, x, y); sfx("push"); after(res); return; }
      if (G.canPick(S, x, y)) { pick(x, y); return; }
      sfx("no"); toast(G.at(S, x, y) === -1 ? "そこへは動かせません（2マス先まで）" : "その駒は押せません"); return;
    }
    if (G.canPick(S, x, y)) { pick(x, y); return; }
    const v = G.at(S, x, y);
    if (v === G.BLOCK) { sfx("no"); toast("ブロックのマスです（置いた人の次の番に消えます）"); return; }
    if (v >= 0) { sfx("no"); toast(G.isTactics(S) ? "ほかの人の駒は、自分の駒を選んでから押せます" : "ほかの人の駒は動かせません"); return; }
    if (!G.canPlace(S, x, y)) { sfx("no"); if (G.outOfPieces(S, S.turn)) toast("駒を使いきりました。自分の駒を選んで動かしてください"); return; }
    pushHist();
    const res = G.place(S, x, y);
    sfx("put");
    after(res);
  }
  function pick(x, y) {
    const ms = G.movesOf(S, x, y), ps = G.pushesOf(S, x, y);
    if (!ms.length && !ps.length) { sfx("no"); toast("この駒は動けません"); return; }
    S.sel = { x, y }; sfx("pick"); renderGame();
  }
  function cellEl(x, y) { return $('#board .cell[data-x="' + x + '"][data-y="' + y + '"]'); }
  function flash(el, cls, ms) {
    if (!el) return;
    cls.forEach((c) => el.classList.remove(c)); void el.offsetWidth;
    cls.forEach((c) => el.classList.add(c));
    clearTimeout(el._ft); el._ft = setTimeout(() => cls.forEach((c) => el.classList.remove(c)), ms || 600);
  }
  function slideFrom(fromEl, toEl) {
    if (!fromEl || !toEl) return;
    const r1 = fromEl.getBoundingClientRect(), r2 = toEl.getBoundingClientRect();
    toEl.style.setProperty("--dx", (r1.left - r2.left) + "px");
    toEl.style.setProperty("--dy", (r1.top - r2.top) + "px");
    flash(toEl, ["slide"], 380);
  }
  function animate(res) {
    if (!res) return;
    const col = S.players[res.slot].color;
    if (res.kind === "place") { const el = cellEl(res.x, res.y); if (el) { el.style.setProperty("--rc", col); flash(el, ["put", "ripple"], 700); } }
    else if (res.kind === "move") slideFrom(cellEl(res.fx, res.fy), cellEl(res.x, res.y));
    else if (res.kind === "push") {
      slideFrom(cellEl(res.tx, res.ty), cellEl(res.x, res.y));
      const pe = cellEl(res.fx, res.fy);
      if (pe) { pe.style.setProperty("--nx", Math.sign(res.tx - res.fx) * 22 + "%"); pe.style.setProperty("--ny", Math.sign(res.ty - res.fy) * 22 + "%"); flash(pe, ["nudge"], 380); }
    }
    else if (res.kind === "block") { const el = cellEl(res.x, res.y); if (el) { el.style.setProperty("--rc", col); flash(el, ["ripple"], 700); } }
  }
  function after(res) {
    if (!res) return;
    UI.blockMode = false; UI.hold = false; UI.hint = null;
    renderGame(false, true);
    animate(res);
    if (S.phase === "end") { finish(); return; }
    /* 置く場所も動かせる駒もない人は、とばして次の人へ */
    let guard = 0;
    while (S.phase === "play" && G.stuck(S) && guard < S.players.length) {
      guard++;
      toast(esc(G.cur(S).name) + " は置く場所も動かせる駒もないので、次の人へ");
      G.pass(S);
    }
    if (guard) renderGame(false, true);
    if (S.phase === "end") { finish(); return; }
    sfx("turn");
    scheduleCpu();
  }

  /* ══ ★★ 2026-10-20 ご指定「途中離脱した人の分を途中から CPU として動かせるように」══
     メニュー →「プレイヤーの交代」：席ごとに 人／CPU を切りかえる（CPU にした席は「代打CPU」。人にもどすこともできる）。
     ・人は1人以上のこす（全員 CPU にはしない）。CPU の強さもここで変えられる。
     ・その人の番だったら、すぐ CPU が指す。CPU にした席は賞金・戦績の対象外（紐づけていても）。 */
  function openSeats() {
    if (!S || S.phase !== "play") return;
    $("#ov").classList.add("on");
    const humans = S.players.filter((q) => !isCpu(q)).length;
    $("#sheet").innerHTML = '<h2 class="svh">' + ICON.swap + "プレイヤーの交代</h2><p>途中で抜けた人の席を <b>CPU</b> にすると、つづきを CPU が指します（戻ってきたら <b>人</b> にもどせます）。CPU にした席は賞金・戦績の対象外です。</p>" +
      '<div class="seatlist">' + G.orderOf(S).map((slot) => {
        const q = S.players[slot], cpu = isCpu(q), last = !cpu && humans <= 1;
        return '<div class="seat" style="--c:' + q.color + '">' + pieceSVG(q) + avatarHTML(q, "mini") + '<span class="sn"><b>' + esc(q.name) + "</b><small>" + (q.sub ? "代打CPU（途中から）" : cpu ? "CPU" : q.uid ? "🔗 紐づけ" : "人") + (q.slot === S.turn ? "・いまの番" : "") + "</small></span>" +
          '<div class="ptype"><button class="' + (!cpu ? "on" : "") + '" data-a="seatType" data-s="' + slot + '" data-v="human">人</button><button class="' + (cpu ? "on" : "") + '" data-a="seatType" data-s="' + slot + '" data-v="cpu"' + (last ? ' disabled title="人は1人以上のこしてください"' : "") + ">CPU</button></div></div>";
      }).join("") + "</div>" +
      '<h3 class="sth">CPU の強さ</h3><div class="seg sm">' + CPU_LV.map((l, i) => '<button class="' + (i === (S.cpuLevel == null ? 1 : S.cpuLevel) ? "on" : "") + '" data-a="seatCpu" data-v="' + i + '">' + l[0] + "</button>").join("") + "</div>" +
      '<div class="wbtns"><button class="btn pri" data-a="closeSheet">' + IC2.play + "つづける</button></div>";
  }
  function seatType(slot, v) {
    if (!S || S.phase !== "play") return;
    const q = S.players[slot]; if (!q) return;
    if (v === "cpu" && S.players.filter((x) => !isCpu(x)).length <= 1 && !isCpu(q)) { toast("人は1人以上のこしてください"); return; }
    if (!G.setType(S, slot, v)) { openSeats(); return; }
    if (q.slot === S.turn) { UI.hint = null; S.sel = null; UI.blockMode = false; UI.hold = false; }
    G.save(S, HIST);
    renderGame();
    openSeats();
    toast(v === "cpu" ? "🤖 <b>" + esc(q.name) + "</b> の席は CPU が指します" : "🙋 <b>" + esc(q.name) + "</b> の席を人にもどしました");
  }

  /* ══ CPU ══ */
  let cpuT = 0;
  function scheduleCpu() {
    clearTimeout(cpuT);
    if (!S || S.phase !== "play" || !isCpu(G.cur(S)) || UI.hold || UI.review) return;
    if (!$("#game").classList.contains("on")) return;
    cpuT = setTimeout(cpuStep, opt.slow ? 1200 : 700);
  }
  function cpuStep() {
    if (!S || S.phase !== "play" || !isCpu(G.cur(S)) || UI.hold) return;
    if ($("#ov").classList.contains("on") || !$("#game").classList.contains("on")) { cpuT = setTimeout(cpuStep, 600); return; }
    const a = G.AI.choose(S);
    if (!a) { G.pass(S); renderGame(false, true); scheduleCpu(); return; }
    const go = () => {
      if (!S || S.phase !== "play" || !isCpu(G.cur(S)) || UI.hold) return;   /* ★ 選んだ駒を見せているあいだに「1手もどる」が押されたとき */
      S.sel = null;
      pushHist();
      const res = G.AI.play(S, a);
      sfx(a.t === "place" ? "put" : a.t === "move" ? "move" : a.t === "push" ? "push" : "block");
      after(res);
    };
    /* 動かす・押すときは、どの駒を選んだかを一瞬見せてから */
    if (a.t === "move" || a.t === "push") { S.sel = { x: a.fx, y: a.fy }; paintBoard(); cpuT = setTimeout(go, opt.slow ? 700 : 420); }
    else go();
  }

  /* ══ ⑤ 勝利と結果 ══ */
  function confetti() {
    const fx = $("#fx"); if (!fx) return;
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cols = S.players.map((p) => p.color).concat(["#ffd34d", "#ffffff"]);
    let h = "";
    for (let i = 0; i < 46; i++) {
      h += '<i style="left:' + (Math.random() * 100).toFixed(1) + "%;--cc:" + cols[i % cols.length] + ";--du:" + (1.6 + Math.random() * 1.2).toFixed(2) + "s;--sx:" + ((Math.random() - 0.5) * 120).toFixed(0) + "px;--rr:" + ((Math.random() - 0.5) * 900).toFixed(0) + "deg;animation-delay:" + (Math.random() * 0.4).toFixed(2) + 's"></i>';
    }
    fx.innerHTML = h;
    setTimeout(() => { fx.innerHTML = ""; }, 3400);
  }
  function finish() {
    clearTimeout(cpuT);
    S.sel = null;
    renderGame();
    /* ★★ 2026-10-24 見返し用に、手ごとの盤面（HIST）と最終盤面を残す（試しの対局のときは試しのぶん） */
    UI.rv = { list: HIST.map((h) => h.s), fin: JSON.stringify(Object.assign({}, S, { sel: null })), at: HIST.length, sand: !!S.sandbox };
    if (!S.sandbox) { UI.main = { rv: UI.rv }; G.remove(S.gid); }     /* ★★ 2026-10-14 この試合の枠だけ消す（ほかの中断はそのまま） */
    HIST = [];
    if (S.draw) { sfx("draw"); setTimeout(winScreen, 500); }
    else { sfx("win"); confetti(); setTimeout(winScreen, 1100); }
    if (!S.sandbox) report();
  }
  /* ══ ★★ 2026-10-24 ご指定「勝負がついたときに最終盤面を確認したり、戻して操作して見られるように」══
     ・勝利の板・結果の画面の「盤面を見る」→ 盤の上で <b>最初／1手もどる／1手すすむ／最終盤面</b> を行き来（見るだけ・CPU も動かない）。
     ・「ここから試す」で、見ている局面から続きを指して試せる（<b>試しの対局</b>：保存しない・賞金も戦績もなし・CPU の席は CPU が指す）。
       試しの対局が決着したら、その盤面も見返せる。「本番の結果へ」でいつでも本番の結果にもどる。
     ・見返しの記録は決着のときの HIST（手を指す直前の盤面・最大300手）＋最終盤面（UI.rv）。 */
  function reviewShow(at) {
    const R0 = UI.rv; if (!R0) return;
    const n = R0.list.length;
    at = Math.max(0, Math.min(n, at));
    let R = null;
    try { R = JSON.parse(at >= n ? R0.fin : R0.list[at]); } catch (e) { R = null; }
    if (!R || !R.cells) return;
    R.sel = null; R.log = R.log || [];
    R0.at = at;
    UI.review = true; UI.blockMode = false; UI.hint = null; UI.hold = true;
    clearTimeout(cpuT);
    S = R;
    $("#win").hidden = true;
    show("game");
    renderGame(true);
  }
  function reviewStart() { if (!UI.rv) return; reviewShow(UI.rv.list.length); toast("🔍 盤面の見返し：◀ ▶ で1手ずつ。「ここから試す」で続きを指して試せます", 2600); }
  function reviewTry() {
    const R0 = UI.rv; if (!R0 || !S || S.phase !== "play") return;
    UI.review = false; UI.hold = false;
    S.sandbox = true; S.gid = "sandbox";
    HIST = R0.list.slice(0, R0.at).map((s) => ({ s: s, ll: 0, h: 1 }));
    renderGame(true);
    toast("🧪 試しの対局：ここから続きを指せます（保存しない・賞金なし）", 2400);
    scheduleCpu();
  }
  function reviewMain() {
    const M = UI.main && UI.main.rv; if (!M) { renderTitle(); return; }
    UI.rv = M; UI.review = false; UI.hold = false; clearTimeout(cpuT);
    try { S = JSON.parse(M.fin); } catch (e) { renderTitle(); return; }
    resultScreen();
  }
  function reviewBarHTML() {
    const R0 = UI.rv, n = R0 ? R0.list.length : 0, at = R0 ? R0.at : 0, fin = at >= n;
    const who = S && S.phase === "play" ? G.cur(S) : null;
    return '<div class="tb-who rv">' + ICON.undo + "<b>" + (R0 && R0.sand ? "試しの対局の見返し" : "盤面の見返し") + "</b><small>" + (fin ? "最終盤面（" + n + "手）" : at + " / " + n + " 手目" + (who ? "・次は " + esc(who.name) : "")) + "</small></div>" +
      '<div class="tb-acts rvb">' +
        '<button class="tbtn" data-a="rvFirst"' + (at > 0 ? "" : " disabled") + ' aria-label="最初"><span class="tl">最初</span><b>⏮</b></button>' +
        '<button class="tbtn" data-a="rvPrev"' + (at > 0 ? "" : " disabled") + ' aria-label="1手もどる"><span class="tl">1手もどる</span><b>◀</b></button>' +
        '<button class="tbtn" data-a="rvNext"' + (!fin ? "" : " disabled") + ' aria-label="1手すすむ"><span class="tl">1手すすむ</span><b>▶</b></button>' +
        '<button class="tbtn" data-a="rvLast"' + (!fin ? "" : " disabled") + ' aria-label="最終盤面"><span class="tl">最終盤面</span><b>⏭</b></button>' +
        '<button class="tbtn go" data-a="rvTry"' + (!fin ? "" : " disabled") + ' title="この局面から続きを指して試す（保存しない・賞金なし）">' + ICON.play + '<span class="tl">ここから試す</span></button>' +
        '<button class="tbtn" data-a="rvEnd">' + IC2.list + '<span class="tl">本番の結果へ</span></button>' +
      "</div>";
  }
  async function report() {
    if (UI.reported) return; UI.reported = true;
    const st = G.standings(S);
    const rep = await G.Account.report(S, st).catch(() => ({ prizes: [] }));
    if (rep && rep.prizes && rep.prizes.length) {
      setTimeout(() => toast("🎁 " + rep.prizes.map((p) => p.rank + "位 " + esc(p.name) + " +" + p.amount + " XEVA").join(" ／ "), 4200), 1400);
    }
  }
  /* ★★ 2026-10-20 ご指定「試合が終わったあとに TOP3 の人は、結果のボタンを押さなくても表示」：勝利の板に 1〜3位（同じ順位も）・最長・賞金 */
  function podiumHTML() {
    const st = G.standings(S).filter((p) => p.rank <= 3).slice(0, 4);
    const PZ = (window.GameLink && GameLink.PRIZES) || [250, 200, 150, 100, 50];
    const medal = ["", "🥇", "🥈", "🥉"];
    return '<div class="podium">' + st.map((p, i) => {
      const a = S.draw ? 0 : PZ[p.rank - 1] || 0, paid = a && !isCpu(p) && p.uid;
      return '<div class="pdr r' + p.rank + '" style="--c:' + p.color + ";animation-delay:" + (0.25 + i * 0.12).toFixed(2) + 's">' +
        '<span class="pdm">' + (medal[p.rank] || p.rank) + '</span><span class="pdk">' + p.rank + "位" + (p.tie ? "<i>同順</i>" : "") + "</span>" + pieceSVG(p) + avatarHTML(p, "mini") +
        '<span class="pdn"><b>' + esc(p.name) + "</b><small>" + (p.rank === 1 && !S.draw ? "そろえた！" : "守り " + (p.def || 0) + "・最長 " + p.line) + "</small></span>" +
        '<span class="pdz' + (paid ? "" : " no") + '">' + (S.draw ? "—" : paid ? "+" + a + " XEVA" : a ? (isCpu(p) ? "CPU" : "紐づけなし") : "—") + "</span></div>";
    }).join("") + "</div>";
  }
  function winScreen() {
    if (!S) return;
    if (S.draw) {
      $("#winbox").innerHTML = '<div class="winttl draw">DRAW</div><h2>引き分け</h2><p>CPU どうしで ' + MAXR + "周しても決着がつきませんでした。順位は「長さ3割・守り7割」の点の順です。</p>" +
        podiumHTML() +
        '<div class="wbtns"><button class="btn pri" data-a="again">' + IC2.redo + 'もう一度</button><button class="btn" data-a="review">' + ICON.undo + '盤面を見る</button><button class="btn" data-a="result">' + IC2.list + "結果を見る</button></div>";
    } else {
      const w = S.players[S.winner];
      $("#winbox").style.setProperty("--c", w.color);
      $("#winbox").innerHTML = '<div class="crown">' + ICON.crown + '</div><div class="winttl">WIN!</div>' +
        '<div class="winp">' + avatarHTML(w) + pieceSVG(w) + "</div>" +
        "<h2>" + esc(w.name) + " の勝ち！" + (S.sandbox ? "<small>（試しの対局）</small>" : "") + "</h2><p>" + (S.sandbox ? "試しの対局なので、保存も賞金もありません。" : isCpu(w) ? "CPU の勝ちです。もう一度挑戦しよう！" : "おめでとうございます！") + "</p>" +
        (S.sandbox ? "" : podiumHTML()) +
        (S.sandbox
          ? '<div class="wbtns"><button class="btn pri" data-a="review">' + ICON.undo + '盤面を見る</button><button class="btn" data-a="rvEnd">' + IC2.list + "本番の結果へ</button></div>"
          : '<div class="wbtns"><button class="btn pri" data-a="again">' + IC2.redo + 'もう一度</button><button class="btn" data-a="review">' + ICON.undo + '盤面を見る</button><button class="btn" data-a="result">' + IC2.list + "結果を見る</button></div>");
    }
    $("#win").hidden = false;
  }
  function resultScreen() {
    if (!S) { renderTitle(); return; }
    const st = G.standings(S);
    const sec = Math.max(1, Math.round(((S.endedAt || Date.now()) - S.startedAt) / 1000));
    /* ★★ 2026-10-16 ご指定「2位以降の決めかたと、もらえる XEVA を表示」：行ごとに 最長・駒の数・賞金、下に決めかたの札 */
    const PZ = (window.GameLink && GameLink.PRIZES) || [250, 200, 150, 100, 50];
    const prizeOf = (p) => {
      if (S.draw) return '<em class="pz no">引き分け・賞金なし</em>';
      const a = PZ[p.rank - 1];
      if (!a) return '<em class="pz no">賞金なし（6位〜）</em>';
      if (isCpu(p)) return '<em class="pz no">CPU（' + a + ' XEVA の枠）</em>';
      if (!p.uid) return '<em class="pz no">紐づけなし（' + a + ' XEVA の枠）</em>';
      return '<em class="pz">+' + a + " XEVA</em>";
    };
    $("#resultList").innerHTML = st.map((p, i) => '<div class="rrow' + (p.rank === 1 && !S.draw ? " top" : "") + '" style="--c:' + p.color + ";animation-delay:" + (i * 0.06) + 's">' +
      '<span class="rk">' + p.rank + "位" + (p.tie ? '<i class="tie">同順</i>' : "") + "</span>" + pieceSVG(p) + avatarHTML(p) +
      '<span class="pn"><b>' + esc(p.name) + "</b><small>" + (p.acct && p.acct !== p.name ? "🔗 " + esc(p.acct) : p.uid ? "🔗 紐づけ" : isCpu(p) ? "CPU（" + CPU_LV[S.cpuLevel || 0][0] + "）" : "") + "</small>" + prizeOf(p) + "</span>" +
      '<span class="rl">' + (p.rank === 1 && !S.draw ? "<b>勝ち</b>" : "<b>" + (p.score || 0) + "点</b>") + (p.rank === 1 && !S.draw ? "最長 " + p.line + "・守り " + (p.def || 0) : "守り " + (p.def || 0) + "・最長 " + p.line + '<small class="rlb">長さ ' + (p.lp || 0) + " ＋ 守り " + (p.dp || 0) + "</small>") + "</span></div>").join("") +
      rankRuleHTML(PZ);
    /* ★★ 2026-10-24 結果の画面からも盤面の見返しへ */
    if (UI.rv && !UI.rv.sand) $("#resultList").insertAdjacentHTML("beforeend", '<button class="btn rvgo" data-a="review">' + ICON.undo + "盤面を見る（最終盤面・1手ずつ見返す・ここから試す）</button>");
    $("#resultMeta").innerHTML = "<div><small>対戦人数</small><b>" + S.players.length + "人</b></div>" +
      "<div><small>ルール</small><b>" + (G.MODES[S.mode] || G.MODES.normal).nm + "</b></div>" +
      "<div><small>盤面・勝利条件</small><b>" + S.size + "×" + S.size + "・" + S.win + "つ</b></div>" +
      "<div><small>プレイ時間</small><b>" + Math.floor(sec / 60) + "分" + (sec % 60) + "秒</b></div>";
    show("result");
  }

  /* ══ 設定・ルール・戦績 ══ */
  function renderSettings() {
    const r = G.RULES[setup.n] || G.RULES[4];
    $("#setSize").innerHTML = [0, 5, 6, 7, 8, 9, 10].map((n) => '<button class="chip' + ((opt.size || 0) === n ? " on" : "") + '" data-a="setsize" data-v="' + n + '">' + (n ? n + "×" + n : "人数どおり") + "</button>").join("");
    $("#setWin").innerHTML = [0, 3, 4, 5, 6].map((n) => '<button class="chip' + ((opt.win || 0) === n ? " on" : "") + '" data-a="setwin" data-v="' + n + '">' + (n ? n + "つ" : "人数どおり") + "</button>").join("");
    $("#setPieces").innerHTML = [0, 5, 6, 7, 8, 10, 99].map((n) => '<button class="chip' + ((opt.pieces || 0) === n ? " on" : "") + '" data-a="setpieces" data-v="' + n + '">' + (n === 99 ? "上限なし" : n ? n + "個" : "人数どおり") + "</button>").join("") +
      '<span class="note" style="width:100%;margin-top:6px">いまの人数（' + setup.n + "人）の初期値は <b>" + r.size + "×" + r.size + "・" + r.win + "つ並べ・" + r.pieces + "個</b>です。変えた設定は次の試合から使われます。</span>";
    /* ★★ 2026-10-14 あと1つでそろうマスの印（標準は表示しない） */
    const rb = $("#setReach");
    if (rb) rb.innerHTML = [[0, "表示しない（標準）"], [1, "いまの番の人だけ"], [2, "全員"]].map((c) => '<button class="chip' + ((opt.reach || 0) === c[0] ? " on" : "") + '" data-a="setreach" data-v="' + c[0] + '">' + c[1] + "</button>").join("");
    /* ★★ 2026-10-20 戦況バー（標準は表示） */
    const wb = $("#setWar");
    if (wb) wb.innerHTML = [[1, "表示する（標準）"], [0, "表示しない"]].map((c) => '<button class="chip' + ((opt.war == null ? 1 : opt.war) === c[0] ? " on" : "") + '" data-a="setwar" data-v="' + c[0] + '">' + c[1] + "</button>").join("");
    $("#setSe").checked = !!opt.se;
    $("#setBgm").checked = !!opt.bgm;
    $("#setSlow").checked = !!opt.slow;
  }
  function openSettings() { renderSettings(); show("settings"); }
  function mini(n, spec) {
    /* spec: { "x,y": "p0" | "p1" | "c" | "s" | "p" | "b" } の小さな図 */
    let h = '<div class="mb" style="--n:' + n + '">';
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const v = spec[x + "," + y] || "";
      const cls = v.split(" ").filter((c) => c === "c" || c === "s" || c === "p").join(" ");
      const pm = v.match(/p(\d)/), b = v.indexOf("b") >= 0;
      h += '<i class="' + cls + '">' + (pm ? pieceSVG(G.COLORS[+pm[1]]) : b ? blkHTML(G.COLORS[0].color) : "") + "</i>";
    }
    return h + "</div>";
  }
  /* ★★ 2026-10-16 順位の決めかたと賞金の札（結果の画面・ルールの画面で同じものを出す） */
  function rankRuleHTML(PZ) {
    PZ = PZ || (window.GameLink && GameLink.PRIZES) || [250, 200, 150, 100, 50];
    return '<div class="card rkrule"><h4>🏅 順位の決めかた</h4><ol>' +
      "<li><b>1位</b>：決められた数を先にそろえた人</li>" +
      "<li><b>2位から</b>：<b>守り7割・長さ3割</b>の点（100点満点）が高い順。<b>守り</b>＝ほかの人の「あと1つでそろう」マスに自分で置いて（動かして・ブロックして）防いだ回数（試合中は名前の横の 🛡）、<b>長さ</b>＝盤に残った自分の駒のいちばん長い並び（最長）" +
        /* ★★ 2026-10-24 ご指定「2位以降の順位の計算方法をはっきり」 */
        '<div class="rkf"><b>点 ＝ 長さの点 ＋ 守りの点</b>' +
          "<span>長さの点 ＝ 30 × 最長 ÷（並べる数 − 1）<small>（30点まで。4つ並べなら最長3で30点）</small></span>" +
          "<span>守りの点 ＝ 70 × 自分の守り ÷ いちばん多い人の守り<small>（いちばん多い人が70点。だれも守っていなければ全員0点）</small></span>" +
          "<em>例：4つ並べで 最長2・守り3（いちばん多い人は6）→ 30×2÷3 ＋ 70×3÷6 ＝ 20 ＋ 35 ＝ <b>55点</b></em></div></li>" +
      "<li>点が同じなら最長 → 盤の上の<b>自分の駒の数</b>が多い順</li>" +
      "<li>それでも同じなら<b>同じ順位</b>（例：2位・2位・4位）。賞金も同じ額です</li></ol>" +
      '<h4>🎁 もらえる XEVA</h4><div class="pztab">' + PZ.map((a, i) => "<span><small>" + (i + 1) + "位</small><b>" + a + "</b></span>").join("") + "</div>" +
      "<p>XEVARION のアカウントを<b>🔗 紐づけた人だけ</b>が受け取れます（CPU・紐づけなしの席はもらえません）。6位からと、引き分けのときは賞金なし。</p></div>";
  }
  function renderRules() {
    const rows = [2, 3, 4, 5, 6, 7, 8].map((n) => { const r = G.RULES[n]; return "<tr><td><b>" + n + "人</b></td><td>" + r.size + "×" + r.size + "</td><td>" + r.win + "つ</td><td>" + r.pieces + "個</td></tr>"; }).join("");
    $("#rulesBody").innerHTML =
      '<div class="card rl-card"><div class="rl-tx"><h4>🎯 勝ちかた</h4><p>自分の駒を<b>たて・よこ・ななめ</b>のどれかに、決められた数だけ並べたら勝ちです。数は人数で変わります（設定で変えられます）。</p></div>' +
        mini(5, { "0,4": "p0", "1,3": "p0", "2,2": "p0", "3,1": "p0", "1,1": "p1", "3,3": "p1" }) + "</div>" +
      '<div class="card rl-card"><div class="rl-tx"><h4>👆 手番でできること <span class="rl-tag">どちらか1つ</span></h4><p>① 空いているマスに<b>駒を置く</b><br>② 自分の駒を1つ選んで<b>動かす</b>：たて・よこ・ななめに<b>2マスまで</b>。<b>あいだにほかの駒があっても飛びこえられます</b>（行き先は空いているマスだけ）。</p></div>' +
        mini(5, { "1,2": "p0 s", "2,2": "p1", "3,2": "c", "0,2": "c", "2,1": "c", "2,3": "c", "0,0": "c", "0,4": "c", "1,1": "c", "1,3": "c", "3,0": "c", "3,4": "c", "1,0": "c", "1,4": "c", "0,1": "c", "0,3": "c", "2,0": "c", "2,4": "c" }) + "</div>" +
      '<div class="card rl-card"><div class="rl-tx"><h4>🧩 駒の数</h4><p>1人が置ける駒の数には上限があります。<b>使いきったら、置けずに動かすだけ</b>。置いた駒をどう動かして並びを作るかが、このゲームの読み合いです。</p></div></div>' +
      '<div class="card rl-card"><div class="rl-tx"><h4>🛡️ タクティクス <span class="rl-tag">もうひとつのルール</span></h4><p>守りに行くとき「そこに置くしかない」にならないよう、手番の選択肢が2つ増えます。<br>' +
        "③ <b>押す</b>：自分の駒を選ぶと、<b>となり（たて・よこ・ななめ）にあるほかの人の駒</b>に矢印が出ます。押すとその駒が<b>1マス押し出されます</b>（押した先が空いているときだけ。自分の駒は動きません）。押した先で<b>その人の駒がそろうと、その人の勝ち</b>なので気をつけて。<br>" +
        "④ <b>ブロック</b>：空いているマスに<b>だれのものでもない壁</b>を置きます（1人2個まで）。壁には置けず、押せません（動かすときは飛びこえられます）。<b>置いた人の次の番が来ると消えます</b>。</p></div>" +
        mini(5, { "1,2": "p0 s", "2,2": "p1 p", "3,2": "", "2,1": "p1 p", "4,4": "b" }) + "</div>" +
      '<div class="card rl-card"><div class="rl-tx"><h4>🤖 CPU</h4><p>準備の画面で席ごとに「人／CPU」を選べます。強さは <b>よわい・ふつう・つよい</b> の3段階。CPU は相手のリーチを止め、自分のリーチを作ろうとします。</p></div></div>' +
      '<div class="card rl-card"><div class="rl-tx"><h4>⏱️ 決着がつかないとき</h4><p><b>CPU だけの対戦</b>で ' + MAXR + "周しても決着がつかないときは<b>引き分け</b>です（順位は、いちばん長く並べた人から）。人が1人でもいる対戦は、決着がつくまで続きます。置く場所も動かせる駒もない人は、その番をとばします。</p></div></div>" +
      /* ★★ 2026-10-14 便利な機能（1手もどる・あと1つの印・いくつもの中断） */
      '<div class="card rl-card"><div class="rl-tx"><h4>🧰 便利な機能</h4><p>' +
        "<b>↩ 1手もどる</b>：手番の板のボタンで、<b>だれの手でも、押すたびに1手ずつ</b>戻せます。CPU の手を戻したときは CPU が止まるので、続けて戻すか「▶ 再開」を押してください。決着がついたあとは戻せません。<br>" +
        "<b>◎ あと1つでそろう印</b>：設定で「いまの番の人だけ」か「全員」を選ぶと、そこに置けばそろうマスに、その人の色の輪が出ます（標準は表示しない）。<br>" +
        "<b>💾 中断</b>：試合はいつも自動でセーブされ、<b>いくつでも（" + G.MAX_SAVES + "件まで）</b>中断しておけます。タイトルの「つづきから」で選べます。<br>" +
        /* ★★ 2026-10-20 ヒント・手番の時計・戦況バー・プレイヤーの交代 */
        "<b>💡 ヒント</b>：手番の板の電球を押すと、いちばん良さそうな手が光り、理由（勝てる・リーチを止める・ふたまた など）が出ます。<br>" +
        "<b>⏱ 手番の時計</b>：その人の番になってからの時間です。次の人の番になると 0 にもどります。<br>" +
        "<b>📊 戦況バー</b>：札の下の帯で、だれが優勢か（形のよさ・あと1つでそろう所）が分かります。設定で消せます。<br>" +
        "<b>🔁 プレイヤーの交代</b>：メニューから、途中で抜けた人の席を CPU にできます（戻ってきたら人にもどせます）。CPU にした席は賞金・戦績の対象外です。</p></div></div>" +
      rankRuleHTML() +
      '<div class="card"><h3>人数ごとの決まり<small>設定で盤面・並べる数・駒の数を変えられます</small></h3><table class="rtable"><tr><th>人数</th><th>盤面</th><th>並べる数</th><th>1人の駒</th></tr>' + rows + "</table></div>";
  }
  function openRules() { if (!$("#rulesBody").childElementCount) renderRules(); show("rules"); }
  function statsScreen() {
    const st = G.Account.stats();
    const rows = Object.keys(st).map((k) => st[k]).sort((a, b) => b.wins - a.wins || b.games - a.games);
    $("#statList").innerHTML = rows.length ? rows.map((r, i) => '<div class="rrow" style="animation-delay:' + (i * 0.04) + 's"><span class="rk">' + (i + 1) + '</span><span class="pn"><b>' + esc(r.name) + "</b><small>" + r.games + "戦 " + r.wins + "勝</small></span>" +
      '<span class="rl">最高<b>' + (r.best < 99 ? r.best + "位" : "—") + "</b></span></div>").join("") : '<p class="empty">まだ記録がありません。<br>遊ぶと、ここに名前ごとの戦績が残ります。</p>';
    show("stats");
  }

  /* ══ 操作 ══ */
  function goBack() {
    if (UI.prev === "game" && S && S.phase === "play") { show("game"); renderGame(); scheduleCpu(); return; }
    if (UI.prev === "setup") { openSetup(); return; }
    if (UI.prev === "result" && S) { resultScreen(); return; }
    renderTitle();
  }
  const ACT = {
    start: () => openSetup(),
    title: () => renderTitle(),
    back: () => goBack(),
    setN: (b) => { setup.n = +b.dataset.v; saveSetup(); renderSetup(); },
    setMode: (b) => { setup.mode = b.dataset.v; saveSetup(); renderSetup(); },
    setType: (b) => { const p = setup.all[+b.dataset.i]; p.type = b.dataset.v; saveSetup(); renderSetup(); },
    setCpu: (b) => { setup.cpuLevel = +b.dataset.v; saveSetup(); renderSetup(); },
    seatlink: (b) => seatLink(+b.dataset.i),
    begin: () => begin(),
    /* ★★ 2026-10-14 中断が1件ならそのまま、2件以上なら一覧から */
    cont: () => { const l = G.list(); if (l.length === 1) resume(l[0].gid); else openSaves(); },
    contGid: (b) => resume(b.dataset.g),
    delAsk: (b) => {
      const row = b.closest(".svrow"); if (!row) return;
      const box = row.querySelector(".svb");
      box.innerHTML = '<span class="svq">消しますか？</span><button class="btn sm danger" data-a="delGid" data-g="' + esc(b.dataset.g) + '">' + IC2.trash + "消す</button>" +
        '<button class="btn sm" data-a="delNo">やめる</button>';
      row.classList.add("ask");
    },
    delNo: () => openSaves(),
    delGid: (b) => { G.remove(b.dataset.g); toast("🗑 セーブを消しました"); if (G.list().length) openSaves(); else { $("#ov").classList.remove("on"); renderTitle(); } },
    undo: () => undo(),
    cpuGo: () => cpuResume(),
    /* ★★ 2026-10-20 ヒント・席の交代・戦況バー */
    hint: () => showHint(),
    seats: () => openSeats(),
    seatType: (b) => seatType(+b.dataset.s, b.dataset.v),
    seatCpu: (b) => { if (!S) return; S.cpuLevel = +b.dataset.v; G.save(S, HIST); openSeats(); },
    setwar: (b) => { opt.war = +b.dataset.v ? 1 : 0; saveOpt(); renderSettings(); },
    orderPick: (b) => orderPick(+b.dataset.k),
    orderAuto: () => { if (!OD || OD.done) return; OD.auto = true; $("#orderAuto").hidden = true; clearTimeout(orderTimer); orderTurn(); },
    cell: (b) => onCell(+b.dataset.x, +b.dataset.y),
    cancel: () => { if (!S) return; S.sel = null; UI.blockMode = false; renderGame(); },
    blockMode: () => { if (!S || isCpu(G.cur(S))) return; UI.blockMode = !UI.blockMode; S.sel = null; renderGame(); },
    again: () => {
      /* 同じ顔ぶれでもう一度。確認ずみの紐づけはそのまま引きつぐ（つづきからの試合でも同じ顔ぶれになるよう、S から席を写す） */
      if (S) {
        setup.n = S.players.length; setup.mode = S.mode || "normal"; setup.cpuLevel = S.cpuLevel == null ? 1 : S.cpuLevel;
        S.players.forEach((p, i) => {
          const seat = setup.all[i]; if (!seat) return;
          seat.name = p.name; seat.type = p.type === "cpu" ? "cpu" : "human";
          if (p.uid) seat.link = { uid: p.uid, name: p.acct || p.name, charFile: p.charFile || "", charId: p.charId || "", confirmed: true };
        });
      }
      begin();
    },
    result: () => resultScreen(),
    /* ★★ 2026-10-24 盤面の見返し・試し */
    review: () => reviewStart(),
    rvFirst: () => reviewShow(0),
    rvPrev: () => { if (UI.rv) reviewShow(UI.rv.at - 1); },
    rvNext: () => { if (UI.rv) reviewShow(UI.rv.at + 1); },
    rvLast: () => { if (UI.rv) reviewShow(UI.rv.list.length); },
    rvTry: () => reviewTry(),
    rvBack: () => { if (UI.rv) reviewShow(UI.rv.at); },
    rvEnd: () => reviewMain(),
    /* ★★ 2026-10-14 消すのは<b>この試合の枠だけ</b>（結果の画面の「タイトルへ」も同じボタン。決着した試合の枠はもう無い） */
    menu: () => { if (S) G.remove(S.gid); HIST = []; renderTitle(); },
    settings: () => openSettings(),
    stats: () => statsScreen(),
    rules: () => openRules(),
    setsize: (b) => { opt.size = +b.dataset.v; saveOpt(); renderSettings(); },
    setwin: (b) => { opt.win = +b.dataset.v; saveOpt(); renderSettings(); },
    setpieces: (b) => { opt.pieces = +b.dataset.v; saveOpt(); renderSettings(); },
    setreach: (b) => { opt.reach = +b.dataset.v || 0; saveOpt(); renderSettings(); },
    setreset: () => { opt = { size: 0, win: 0, pieces: 0, se: true, bgm: false, slow: false, reach: 0, war: 1 }; saveOpt(); bgmStop(); renderSettings(); toast("初期設定に戻しました"); },
    gmenu: () => {
      $("#ov").classList.add("on");
      $("#sheet").innerHTML = "<h2>メニュー</h2><p>いまの試合はいつでも<b>セーブして中断</b>できます。つづきはタイトルの「つづきから」で始められます。</p>" +
        '<div class="wbtns col"><button class="btn pri" data-a="closeSheet">' + IC2.play + "つづける</button>" +
        '<button class="btn" data-a="saveQuit">' + IC2.save + "セーブして中断</button>" +
        /* ★★ 2026-10-20 途中で抜けた人を CPU に */
        '<button class="btn" data-a="seats">' + ICON.swap + "プレイヤーの交代（途中で抜けた人を CPU に）</button>" +
        '<div class="wrow"><button class="btn" data-a="rules">' + IC2.book + "ルール</button>" +
        '<button class="btn" data-a="settings">' + IC2.gear + "設定</button></div>" +
        '<button class="btn danger" data-a="giveup">' + IC2.exit + "セーブせずにやめる</button></div>";
    },
    /* ★★ 2026-09-21 ご指定：途中でセーブして、あとからつづきを遊べるようにした。 */
    saveQuit: () => {
      if (!S) { renderTitle(); return; }
      S.sel = null; G.save(S, HIST);
      const n = G.list().length;
      toast("💾 セーブしました。タイトルの「つづきから」でつづけられます" + (n > 1 ? "（中断中 " + n + "件）" : ""));
      renderTitle();
    },
    /* ★ confirm() が出ない環境があるので（MagiLex・MagiTier で踏んだ）、確認は画面の中で聞く */
    giveup: () => {
      $("#ov").classList.add("on");
      $("#sheet").innerHTML = "<h2>この試合をやめますか？</h2><p>セーブも消えるので、つづきからは遊べなくなります。</p>" +
        '<div class="wbtns"><button class="btn" data-a="gmenu">' + IC2.back + 'もどる</button><button class="btn danger" data-a="menu">' + IC2.trash + "やめる（セーブを消す）</button></div>";
    },
    closeSheet: () => { $("#ov").classList.remove("on"); scheduleCpu(); },
    orderGo: () => startGame(),
    orderRedo: () => drawOrder(),
    orderBack: () => { clearTimeout(orderTimer); OD = null; openSetup(); },
  };
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-a]");
    if (!b || b.disabled) return;
    const f = ACT[b.dataset.a];
    if (!f) return;
    e.preventDefault();
    /* シートを開いたままにする操作（盤・メニュー・中断の一覧の消す確認）。それ以外はシートを閉じてから */
    if (["cell", "gmenu", "giveup", "delAsk", "delNo", "delGid", "seats", "seatType", "seatCpu"].indexOf(b.dataset.a) < 0) $("#ov").classList.remove("on");
    ac();
    f(b);
  });
  /* シートの外側を押したら閉じる */
  $("#ov").addEventListener("click", (e) => { if (e.target.id === "ov") { $("#ov").classList.remove("on"); scheduleCpu(); } });
  document.addEventListener("change", (e) => {
    if (e.target.id === "setSe") { opt.se = e.target.checked; saveOpt(); }
    if (e.target.id === "setBgm") { opt.bgm = e.target.checked; saveOpt(); if (!opt.bgm) bgmStop(); }
    if (e.target.id === "setSlow") { opt.slow = e.target.checked; saveOpt(); }
  });
  /* 画面の向き・大きさが変わったら、プレイヤーの札の列を数え直す */
  window.addEventListener("resize", () => { if (S && $("#game").classList.contains("on")) renderGame(); });
  /* iPhone のアプリ表示では文書のスクロールを 0 に留める（中身は各画面の板がスクロールする） */
  function pinDoc() {
    if (!window.scrollY && !window.scrollX) return;
    const a = document.activeElement;
    if (a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA") && !a.readOnly) return;
    window.scrollTo(0, 0);
  }
  window.addEventListener("scroll", pinDoc, { passive: true });
  document.addEventListener("focusout", () => { setTimeout(pinDoc, 60); setTimeout(pinDoc, 360); });

  loadSetup();
  renderTitle();
  window.MShiftUI = { render: renderGame, state: () => S, setup };
})();
