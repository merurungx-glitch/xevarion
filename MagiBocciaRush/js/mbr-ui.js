/* ══════════════════════════════════════════════════════════════
   Magi: Boccia Rush — 画面（描画・タッチ・遷移）
   ──────────────────────────────────────────────────────────────
   ★ ルールと物理は mbr-core.js（window.MBR）。ここは<b>見せかたと入力</b>だけ。
   ★ 画面の流れ
       HOME → PLAY（試合のえらび）→ MATCH → RESULT → HOME
       CHARACTER / GACHA（ポータルへ）/ FRIEND / PROFILE / RULE / SETTINGS
   ★ 引っぱって離す操作は<b>モンスト式</b>。
     ボールを引っぱると、引いた向きの<b>反対</b>へ飛ぶ。
     引いた長さが強さ。指を離すと投げる。
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const B = window.MBR;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const C = B.COURT;

  /* ══════════ 言葉 ══════════ */
  function lang() { try { return localStorage.getItem("xeva_lang_v1") === "en" ? "en" : "ja"; } catch (e) { return "ja"; } }
  function L(o) { return typeof o === "string" ? o : (o && o[lang()] != null ? o[lang()] : (o && o.ja) || ""); }
  const T = {
    play: { ja: "PLAY", en: "PLAY" },
    quick: { ja: "クイックマッチ", en: "Quick match" },
    cpu: { ja: "CPU対戦", en: "CPU match" },
    friend: { ja: "フレンド対戦", en: "Friend match" },
    room: { ja: "プライベートルーム", en: "Private room" },
    team: { ja: "チーム戦", en: "Team match" },
    ranked: { ja: "ランクマッチ", en: "Ranked" },
    tourney: { ja: "トーナメント", en: "Tournament" },
    practice: { ja: "練習", en: "Practice" },
    rule: { ja: "ルールブック", en: "Rule book" },
    settings: { ja: "設定", en: "Settings" },
    chars: { ja: "キャラクター", en: "Characters" },
    gacha: { ja: "ガチャ", en: "Gacha" },
    profile: { ja: "プロフィール", en: "Profile" },
    home: { ja: "ホーム", en: "Home" },
    back: { ja: "もどる", en: "Back" },
    start: { ja: "はじめる", en: "Start" },
    yourTurn: { ja: "あなたの番", en: "Your turn" },
    cpuTurn: { ja: "CPU の番", en: "CPU's turn" },
    throwJack: { ja: "ジャックボールを投げる", en: "Throw the jack" },
    pull: { ja: "ボールを引っぱって、はなす", en: "Pull the ball back and release" },
    end: { ja: "エンド", en: "End" },
    result: { ja: "リザルト", en: "Result" },
    victory: { ja: "VICTORY", en: "VICTORY" },
    defeat: { ja: "DEFEAT", en: "DEFEAT" },
    draw: { ja: "DRAW", en: "DRAW" },
    toHome: { ja: "ホームへ", en: "Back to home" },
    replay: { ja: "リプレイ", en: "Replay" },
    again: { ja: "もう一度", en: "Play again" },
    skill: { ja: "スキル", en: "Skill" },
    used: { ja: "使用ずみ", en: "Used" },
    diff: { ja: "難易度", en: "Difficulty" },
    ends: { ja: "エンド数", en: "Ends" },
    guide: { ja: "ルール説明", en: "Rule guide" },
    comp: { ja: "競技モード", en: "Competition mode" },
    compD: {
      ja: "キャラクターの能力を<b>3分の1</b>に弱め、壁も外して<b>公式ルールに近い</b>試合にします。ランクマッチはこのモードで行います。",
      en: "Character stats are cut to a third and the bumpers are removed for a rules-accurate match. Ranked always uses this mode.",
    },
    myTeam: { ja: "使うキャラクター", en: "Your characters" },
    pickChar: { ja: "キャラクターをえらぶ", en: "Choose a character" },
    noChar: {
      ja: "まだキャラクターを持っていません。XEVARION のガチャでキャラクターを手に入れると、ここに並びます。",
      en: "You don't have any characters yet. Pull in the XEVARION gacha and they will appear here.",
    },
    dist: { ja: "ジャックまで", en: "To jack" },
    winner: { ja: "現在リード", en: "Currently ahead" },
    nobody: { ja: "まだ誰もいません", en: "Nobody yet" },
    tutorial: { ja: "はじめてのボッチャ", en: "Boccia basics" },
    knowIt: { ja: "知っている", en: "I know boccia" },
    firstTime: { ja: "はじめて", en: "First time" },
    askKnow: { ja: "ボッチャを知っていますか？", en: "Do you know boccia?" },
  };
  const t = (k) => L(T[k] || { ja: k, en: k });

  /* ══════════ 状態 ══════════ */
  let ROSTER = [];        // 持っているキャラ
  let M = null;           // 試合
  let cur = "home";
  let raf = 0;
  let aim = null;         // { x, y, dragging }
  let ballSpot = null;    // 投げる位置（画面座標）
  let slot = 2;           // 投球ボックス
  let busy = false;       // 玉が転がっている
  /* ★★ CPU が「考えている」あいだの旗。
     これが無いと、まだ投げていない（動いている玉が無い）のに
     「止まった」と見なされて手番が進み、CPU が<b>何十発も連投する</b>。 */
  let thinking = false;
  let camera = { y: 0 };
  let pendingCfg = null;
  let lastGuide = null;

  /* ══════════ キャラ ══════════ */
  function ownedIds() {
    try {
      const db = JSON.parse(localStorage.getItem("magiburst_v1") || "null");
      return db && db.chars ? Object.keys(db.chars) : [];
    } catch (e) { return []; }
  }
  function loadRoster() {
    const all = B.buildRoster();
    const own = new Set(ownedIds());
    ROSTER = all.filter((c) => own.has(c.id));
    if (!ROSTER.length) ROSTER = all.slice(0, 8);   /* 何も持っていなくても遊べるように */
    return ROSTER;
  }
  function myChar() {
    const s = B.load();
    const id = s.team[0] || (ROSTER[0] && ROSTER[0].id);
    return ROSTER.find((c) => c.id === id) || ROSTER[0] || null;
  }
  function charById(id) { return ROSTER.find((c) => c.id === id) || null; }
  function charImg(c) {
    if (!c) return "";
    const p = c.th || c.img || "";
    if (!p) return "";
    return p.startsWith("http") || p.startsWith("../") || p.startsWith("img/") ? p : ("../img/" + p);
  }

  /* ══════════ 画面のきりかえ ══════════ */
  function go(id) {
    cur = id;
    $$(".scr").forEach((s) => s.classList.toggle("on", s.id === "s-" + id));
    $$("#nav button").forEach((b) => b.classList.toggle("on", b.dataset.go === id));
    window.scrollTo(0, 0);
    if (id === "home") renderHome();
    else if (id === "play") renderPlay();
    else if (id === "chars") renderChars();
    else if (id === "friend") renderFriend();
    else if (id === "profile") renderProfile();
  }

  /* ══════════════════════════════════════════════════════════════
     ① ホーム
     ══════════════════════════════════════════════════════════════ */
  function renderHome() {
    const s = B.load();
    const r = B.rankOf(s.rp), nx = B.nextRank(s.rp);
    const ch = myChar();
    $("#s-home").innerHTML = ''
      + '<div class="hero"><div class="m">Magi</div><div class="s">BOCCIA RUSH</div>'
      + '<div class="p">' + (lang() === "en"
        ? "Real boccia, pull-and-release controls, and your XEVARION characters.<br>Pull the ball, aim, release — the rest is physics and nerve."
        : "本物のボッチャを、引っぱって離すだけで。<br>キャラクターは XEVARION と共通です。") + "</div></div>"

      + '<div class="menu">'
      + mi("PLAY", t("play"), lang() === "en" ? "Choose a match" : "試合をえらぶ", "MBRUI.go('play')", true)
      + mi("01", t("quick"), lang() === "en" ? "Jump straight in" : "すぐに1試合", "MBRUI.quick()")
      + mi("02", t("ranked"), "RP " + s.rp, "MBRUI.setup('ranked')")
      + mi("03", t("team"), lang() === "en" ? "2v2 – 4v4" : "2vs2 〜 4vs4", "MBRUI.setup('team')")
      + mi("04", t("practice"), lang() === "en" ? "Free throws" : "自由に投げる", "MBRUI.setup('practice')")
      + "</div>"

      + '<div class="hd">' + (lang() === "en" ? "YOUR RANK" : "ランク") + "</div>"
      + '<div class="slab"><div style="display:flex;align-items:center;gap:12px">'
      + '<div style="font-family:\'Orbitron\',sans-serif;font-style:italic;font-weight:900;font-size:20px;color:'
      + r.c + '">' + r.ja + "</div>"
      + '<div style="margin-left:auto;text-align:right"><div style="font-family:\'Orbitron\',sans-serif;font-weight:900;font-size:20px">'
      + s.rp + '</div><div class="note">RP</div></div></div>'
      + (nx ? '<div class="stat" style="margin-top:9px;grid-template-columns:1fr"><div class="bar"><i style="width:'
        + Math.round(Math.max(0, Math.min(1, (s.rp - r.need) / (nx.need - r.need))) * 100) + '%"></i></div></div>'
        + '<div class="note" style="margin-top:4px">' + (lang() === "en" ? "Next: " : "次のランク：")
        + nx.ja + "（" + (nx.need - s.rp) + " RP）</div>" : "")
      + "</div>"

      + '<div class="hd">' + (lang() === "en" ? "YOUR CHARACTER" : "使うキャラクター")
      + '<span class="more" onclick="MBRUI.go(\'chars\')">' + (lang() === "en" ? "Change ›" : "変更 ›") + "</span></div>"
      + (ch ? charSlab(ch) : '<div class="slab"><div class="empty">' + L(T.noChar) + "</div></div>")

      + '<div class="hd">' + (lang() === "en" ? "MORE" : "そのほか") + "</div>"
      + '<div class="menu">'
      + mi("05", t("rule"), lang() === "en" ? "Learn boccia" : "ボッチャを学ぶ", "MBRUI.openRule()")
      + mi("06", t("gacha"), lang() === "en" ? "XEVARION gacha" : "XEVARION のガチャ", "location.href='../gacha.html'")
      + mi("07", t("friend"), lang() === "en" ? "Rooms & friends" : "部屋とフレンド", "MBRUI.go('friend')")
      + mi("08", t("settings"), lang() === "en" ? "Guide, sound…" : "説明・音など", "MBRUI.openSettings()")
      + "</div>";
  }
  function mi(no, k, j, fn, big) {
    return '<div class="mi' + (big ? " big" : "") + '" onclick="' + fn + '">'
      + (big ? "" : '<div class="n">' + no + "</div>")
      + '<div class="k">' + esc(k) + '</div><div class="j">' + esc(j) + "</div></div>";
  }
  function charSlab(c) {
    const ty = B.TYPES[c.type];
    return '<div class="slab"><div style="display:flex;gap:12px;align-items:center">'
      + '<img src="' + charImg(c) + '" alt="" style="width:64px;height:64px;object-fit:cover;'
      + 'clip-path:polygon(10px 0,100% 0,calc(100% - 10px) 100%,0 100%)">'
      + '<div style="min-width:0;flex:1"><div style="font-weight:900;font-size:15px">' + esc(c.nm) + "</div>"
      + '<div style="display:flex;gap:6px;margin-top:4px"><span class="tag" style="color:' + ty.c + '">'
      + ty.ja + '</span><span class="tag">' + c.rarity + "</span></div></div></div>"
      + '<div class="stat" style="margin-top:10px">' + statRows(c) + "</div></div>";
  }
  const STAT_KEYS = [["power", "POWER"], ["control", "CONTROL"], ["friction", "FRICTION"],
                     ["hit", "HIT"], ["jack", "JACK"], ["technique", "TECHNIQUE"], ["support", "SUPPORT"]];
  function statRows(c) {
    return STAT_KEYS.map((k) => '<div class="k">' + k[1] + '</div><div class="bar"><i style="width:'
      + c.st[k[0]] + '%"></i></div><div class="v">' + c.st[k[0]] + "</div>").join("");
  }

  /* ══════════════════════════════════════════════════════════════
     ② 試合のえらび
     ══════════════════════════════════════════════════════════════ */
  function renderPlay() {
    $("#s-play").innerHTML = ''
      + '<div class="hd">MATCH SELECT</div>'
      + '<div class="menu">'
      + mi("01", t("quick"), lang() === "en" ? "CPU, normal, 6 ends" : "CPU・ふつう・6エンド", "MBRUI.quick()", true)
      + mi("02", t("cpu"), "EASY 〜 MASTER", "MBRUI.setup('cpu')")
      + mi("03", t("ranked"), lang() === "en" ? "Competition rules" : "競技モード", "MBRUI.setup('ranked')")
      + mi("04", t("team"), "2v2 / 3v3 / 4v4", "MBRUI.setup('team')")
      + mi("05", t("friend"), lang() === "en" ? "Same device" : "1台で交代", "MBRUI.setup('local')")
      + mi("06", t("room"), lang() === "en" ? "Room code" : "ルームID", "MBRUI.go('friend')")
      + mi("07", t("tourney"), lang() === "en" ? "4 rounds" : "4回戦", "MBRUI.setup('tourney')")
      + mi("08", t("practice"), lang() === "en" ? "No score" : "得点なし", "MBRUI.setup('practice')")
      + "</div>";
  }

  /* 試合の設定画面（モーダル） */
  function setup(mode) {
    const s = B.load();
    const ranked = mode === "ranked";
    pendingCfg = {
      mode: mode === "practice" ? "practice" : (mode === "local" || mode === "team" ? "local" : "cpu"),
      kind: mode,
      difficulty: s.lastDiff || "normal",
      ends: mode === "practice" ? 1 : 6,
      vs: mode === "team" ? 2 : 1,
      competition: ranked ? true : !!s.competition,
      guide: s.guide,
    };
    drawSetup();
  }
  function drawSetup() {
    const p = pendingCfg;
    const ch = myChar();
    const DIFF = [["easy", "EASY"], ["normal", "NORMAL"], ["hard", "HARD"], ["expert", "EXPERT"], ["master", "MASTER"]];
    let h = '<div class="hd" style="margin-top:2px">' + esc(kindName(p.kind)) + "</div>";
    if (p.kind === "cpu" || p.kind === "quick" || p.kind === "ranked" || p.kind === "tourney") {
      h += '<div class="slab tight"><div class="note" style="margin-bottom:6px"><b>' + esc(t("diff")) + "</b></div>"
        + '<div class="seg">' + DIFF.map((d) => '<button class="' + (p.difficulty === d[0] ? "on" : "") + '" '
          + 'onclick="MBRUI.setCfg(\'difficulty\',\'' + d[0] + '\')">' + d[1] + "</button>").join("") + "</div></div>";
    }
    if (p.kind === "team") {
      h += '<div class="slab tight"><div class="note" style="margin-bottom:6px"><b>'
        + (lang() === "en" ? "Players per side" : "1チームの人数") + "</b></div>"
        + '<div class="seg">' + [1, 2, 3, 4].map((n) => '<button class="' + (p.vs === n ? "on" : "") + '" '
          + 'onclick="MBRUI.setCfg(\'vs\',' + n + ')">' + n + " vs " + n + "</button>").join("") + "</div>"
        + '<div class="note" style="margin-top:6px">'
        + (lang() === "en" ? "One device, players take turns. Each player uses their own character."
                          : "1台で交代しながら遊びます。プレイヤーごとに使うキャラクターを設定できます。") + "</div></div>";
    }
    if (p.kind !== "practice") {
      h += '<div class="slab tight"><div class="note" style="margin-bottom:6px"><b>' + esc(t("ends")) + "</b></div>"
        + '<div class="seg">' + [4, 6, 8].map((n) => '<button class="' + (p.ends === n ? "on" : "") + '" '
          + 'onclick="MBRUI.setCfg(\'ends\',' + n + ')">' + n + "</button>").join("") + "</div></div>";
    }
    h += '<div class="slab tight"><div style="display:flex;align-items:center;gap:9px">'
      + '<b style="font-size:12px">' + esc(t("comp")) + "</b>"
      + '<button class="b sm ' + (p.competition ? "pri" : "gh") + '" style="margin-left:auto" '
      + (p.kind === "ranked" ? "disabled" : "onclick=\"MBRUI.setCfg('competition'," + (!p.competition) + ")\"")
      + ">" + (p.competition ? "ON" : "OFF") + "</button></div>"
      + '<div class="note" style="margin-top:6px">' + L(T.compD) + "</div></div>";
    h += '<div class="hd">' + esc(t("myTeam")) + "</div>"
      + (ch ? charSlab(ch) : '<div class="slab"><div class="empty">' + L(T.noChar) + "</div></div>")
      + '<button class="b gh sm" style="width:100%;margin-bottom:10px" onclick="MBRUI.go(\'chars\');MBRUI.close()">'
      + esc(t("pickChar")) + "</button>"
      + '<button class="b pri" onclick="MBRUI.startMatch()">▶ ' + esc(t("start")) + "</button>";
    open(h);
  }
  function kindName(k) {
    const M2 = { quick: t("quick"), cpu: t("cpu"), ranked: t("ranked"), team: t("team"),
                 local: t("friend"), practice: t("practice"), tourney: t("tourney") };
    return M2[k] || k;
  }

  /* ══════════════════════════════════════════════════════════════
     ③ 試合をはじめる
     ══════════════════════════════════════════════════════════════ */
  function quick() { setup("quick"); }
  function startMatch() {
    const s = B.load();
    const p = pendingCfg || { kind: "quick", difficulty: "normal", ends: 6, vs: 1, competition: false };
    s.lastDiff = p.difficulty; B.save();
    const ch = myChar();
    const n = p.kind === "team" ? p.vs : 1;
    const mk = (side, i) => {
      const isCpu = (p.kind !== "local" && p.kind !== "team") ? (side === "blue") : false;
      return { name: side.toUpperCase() + (n > 1 ? " " + (i + 1) : ""), side,
               charId: side === "red" ? (ch ? ch.id : "") : pickRival(i), cpu: isCpu };
    };
    const players = { red: [], blue: [] };
    for (let i = 0; i < n; i++) { players.red.push(mk("red", i)); players.blue.push(mk("blue", i)); }
    M = B.newMatch({
      mode: p.kind === "practice" ? "practice" : (p.kind === "local" || p.kind === "team" ? "local" : "cpu"),
      ends: p.kind === "practice" ? 1 : p.ends,
      perSide: 6, players, competition: p.competition, first: "red",
      difficulty: p.difficulty, guide: s.guide,
      seed: (Date.now() ^ (Math.random() * 1e9)) >>> 0,
    });
    M.kind = p.kind;
    M.practice = p.kind === "practice";
    busy = false; thinking = false; aim = null; slot = 2; lastGuide = null;
    if (p.online) {
      M.online = p.online;
      M.cfg.seed = p.online.seed;
      M.rand = B.mkRand(p.online.seed);          /* ★ 両方の端末で同じ乱数にする */
      M.cfg.players.red[0].name = p.online.red;
      M.cfg.players.blue[0].name = p.online.blue;
      M.cfg.players.red[0].cpu = false;
      M.cfg.players.blue[0].cpu = false;
    }
    close();
    go("match");
    window.scrollTo(0, 0);
    fitCanvas();
    renderMatch();
    startLoop();
  }
  /* 相手のキャラ（持っていない子からも選ぶ＝相手はいろいろ出てくる） */
  function pickRival(i) {
    const all = B.buildRoster();
    if (!all.length) return "";
    return all[Math.floor(Math.random() * all.length)].id;
  }

  /* ══════════════════════════════════════════════════════════════
     ④ コートの描画
     ══════════════════════════════════════════════════════════════ */
  let cv = null, ctx = null, PX = 40, OX = 0, OY = 0;
  function fitCanvas() {
    cv = $("#court"); if (!cv) return;
    ctx = cv.getContext("2d");
    const wrap = cv.parentNode;
    const w = wrap.clientWidth;
    /* 画面の高さから、上下のバーぶんを引いた残りを使う */
    /* ★ 上（得点・手番）と下（キャラ・スキル・ナビ）が入る高さにする。
       ここを大きくしすぎると、得点が画面の外へ行ってしまう。 */
    const h = Math.max(240, Math.min(window.innerHeight - 330, w * 1.62));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.style.width = w + "px"; cv.style.height = h + "px";
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    /* コート全体が入る倍率 */
    PX = Math.min((w - 16) / C.W, (h - 16) / C.L);
    OX = (w - C.W * PX) / 2;
    OY = (h - C.L * PX) / 2;
    cv._w = w; cv._h = h;
  }
  const sx = (x) => OX + x * PX;
  const sy = (y) => OY + (C.L - y) * PX;      /* 手前（投球エリア）が下に来るように上下反転 */
  const ux = (px) => (px - OX) / PX;
  const uy = (py) => C.L - (py - OY) / PX;

  function drawCourt() {
    if (!ctx || !M) return;
    const w = cv._w, h = cv._h;
    ctx.clearRect(0, 0, w, h);
    /* 地 */
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#0a142c"); g.addColorStop(1, "#060b18");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    /* コート面 */
    ctx.fillStyle = "#123a63";
    ctx.fillRect(sx(0), sy(C.L), C.W * PX, C.L * PX);
    /* 板張りの目 */
    ctx.strokeStyle = "rgba(255,255,255,.045)"; ctx.lineWidth = 1;
    for (let i = 1; i < 24; i++) {
      const yy = sy(C.L * i / 24);
      ctx.beginPath(); ctx.moveTo(sx(0), yy); ctx.lineTo(sx(C.W), yy); ctx.stroke();
    }
    /* 外わく */
    ctx.strokeStyle = "#7cd4ff"; ctx.lineWidth = 2.4;
    ctx.strokeRect(sx(0), sy(C.L), C.W * PX, C.L * PX);
    /* 投球エリア（6ボックス） */
    ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(sx(0), sy(C.BOXD)); ctx.lineTo(sx(C.W), sy(C.BOXD)); ctx.stroke();
    for (let i = 1; i < C.BOXES; i++) {
      const x = sx(C.W * i / C.BOXES);
      ctx.beginPath(); ctx.moveTo(x, sy(0)); ctx.lineTo(x, sy(C.BOXD)); ctx.stroke();
    }
    /* Vライン */
    ctx.strokeStyle = "#ffd257"; ctx.lineWidth = 2; ctx.setLineDash([9, 7]);
    ctx.beginPath(); ctx.moveTo(sx(0), sy(C.VLINE)); ctx.lineTo(sx(C.W), sy(C.VLINE)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(255,210,87,.85)"; ctx.font = "900 10px 'Orbitron',sans-serif";
    ctx.fillText("V LINE", sx(0) + 5, sy(C.VLINE) - 5);
    /* クロス（センターマーク） */
    ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 1.6;
    const cxp = sx(C.W / 2), cyp = sy(C.CROSS), s2 = 9;
    ctx.beginPath(); ctx.moveTo(cxp - s2, cyp); ctx.lineTo(cxp + s2, cyp);
    ctx.moveTo(cxp, cyp - s2); ctx.lineTo(cxp, cyp + s2); ctx.stroke();

    /* ボール */
    const r = B.ballR(M) * PX;
    B.live(M).forEach((b) => {
      const X = sx(b.x), Y = sy(b.y);
      /* 影 */
      ctx.beginPath(); ctx.ellipse(X, Y + r * 0.5, r * 0.95, r * 0.45, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fill();
      const col = b.jack ? "#ffffff" : (b.side === "red" ? "#ff3b52" : "#2f8fff");
      const lit = b.jack ? "#ffffff" : (b.side === "red" ? "#ff9aa4" : "#9fd8ff");
      const gg = ctx.createRadialGradient(X - r * 0.35, Y - r * 0.4, r * 0.1, X, Y, r);
      gg.addColorStop(0, lit); gg.addColorStop(1, col);
      ctx.beginPath(); ctx.arc(X, Y, r, 0, Math.PI * 2);
      ctx.fillStyle = gg; ctx.fill();
      ctx.lineWidth = 1.4; ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.stroke();
      if (b.jack) {
        ctx.beginPath(); ctx.arc(X, Y, r * 0.45, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(120,150,190,.75)"; ctx.lineWidth = 1.2; ctx.stroke();
      }
    });
    /* ジャックまでの線（いちばん近い自分のボール） */
    const j = B.jackOf(M);
    if (j && !busy) {
      const mine = B.live(M).filter((b) => !b.jack);
      mine.sort((a, b2) => B.dist(a, j) - B.dist(b2, j));
      if (mine[0]) {
        ctx.setLineDash([4, 5]); ctx.lineWidth = 1.4;
        ctx.strokeStyle = mine[0].side === "red" ? "rgba(255,59,82,.7)" : "rgba(47,143,255,.75)";
        ctx.beginPath(); ctx.moveTo(sx(j.x), sy(j.y)); ctx.lineTo(sx(mine[0].x), sy(mine[0].y)); ctx.stroke();
        ctx.setLineDash([]);
        const d = B.dist(mine[0], j);
        ctx.fillStyle = "#e9f2ff"; ctx.font = "900 10px 'Orbitron',sans-serif";
        ctx.fillText(Math.round(d * 100) + "cm", (sx(j.x) + sx(mine[0].x)) / 2 + 5, (sy(j.y) + sy(mine[0].y)) / 2);
      }
    }
    /* 投げるボール（手元）と引っぱりの矢印。
       ★ 自分の番のときは<b>必ず</b>出す（ここがないと何を引っぱるのか分からない）。 */
    if (!busy && M.phase !== "over" && !isCpuTurn()) {
      drawAim(r);
    }
  }
  function drawAim(r) {
    const sp = B.throwSpot(M, M.turn, slot);
    const X = sx(sp.x), Y = sy(sp.y);
    const isJack = M.phase === "jack";
    const col = isJack ? "#ffffff" : (M.turn === "red" ? "#ff3b52" : "#2f8fff");
    /* 手元のボール */
    ctx.beginPath(); ctx.arc(X, Y, r, 0, Math.PI * 2);
    ctx.fillStyle = col; ctx.globalAlpha = .95; ctx.fill(); ctx.globalAlpha = 1;
    ctx.lineWidth = 2; ctx.strokeStyle = "#fff"; ctx.stroke();
    if (!aim || !aim.dragging) {
      ctx.fillStyle = "rgba(233,242,255,.6)"; ctx.font = "900 10px 'Noto Sans JP',sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(t("pull"), X, Y + r + 16);
      ctx.textAlign = "left";
      return;
    }
    /* 引っぱり */
    const dx = aim.x - X, dy = aim.y - Y;
    const len = Math.hypot(dx, dy);
    const maxLen = Math.min(cv._w, cv._h) * 0.42;
    const p = Math.max(0, Math.min(1, len / maxLen));
    const ang = Math.atan2(-(dy), -(dx));          /* 反対向きに飛ぶ */
    /* 矢印 */
    ctx.save();
    ctx.translate(X, Y);
    ctx.rotate(ang);
    const L2 = 46 + p * 120;
    const grd = ctx.createLinearGradient(0, 0, L2, 0);
    grd.addColorStop(0, col); grd.addColorStop(1, "rgba(255,255,255,.15)");
    ctx.strokeStyle = grd; ctx.lineWidth = 5 + p * 5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(r + 3, 0); ctx.lineTo(L2, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(L2 + 10, 0); ctx.lineTo(L2 - 8, -9); ctx.lineTo(L2 - 8, 9); ctx.closePath();
    ctx.fillStyle = col; ctx.fill();
    ctx.restore();
    /* 強さゲージ */
    ctx.fillStyle = "rgba(6,12,26,.75)";
    ctx.fillRect(X - 40, Y + r + 8, 80, 8);
    ctx.fillStyle = p > .8 ? "#ff3b52" : p > .5 ? "#ffd257" : "#7cd4ff";
    ctx.fillRect(X - 39, Y + r + 9, 78 * p, 6);
    /* 軌道予測（キャラの TECHNIQUE と難易度で見える長さが変わる） */
    const ch = curChar();
    const mod = B.shotMods(M, M.turn, ch);
    let vis = mod.preview;
    if (M.cfg.competition) vis = Math.min(vis, 0.35);
    if (M.cfg.difficulty === "expert") vis *= 0.7;
    if (M.cfg.difficulty === "master") vis *= 0.45;
    const pr = B.predict(M, { side: M.turn, jack: isJack, angle: ang, power: p, char: ch, slot });
    const pts = pr.path;
    const n = Math.max(2, Math.round(pts.length * Math.max(0.12, vis)));
    ctx.setLineDash([5, 6]); ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(233,242,255,.55)";
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const q = pts[i];
      if (i === 0) ctx.moveTo(sx(q.x), sy(q.y)); else ctx.lineTo(sx(q.x), sy(q.y));
    }
    ctx.stroke(); ctx.setLineDash([]);
    /* 止まる位置（見えるときだけ） */
    if (vis >= 0.9) {
      ctx.beginPath(); ctx.arc(sx(pr.stop.x), sy(pr.stop.y), r, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.lineWidth = 1.6; ctx.setLineDash([3, 4]);
      ctx.stroke(); ctx.setLineDash([]);
    }
  }
  function curChar() {
    if (!M) return null;
    const list = M.cfg.players[M.turn] || [];
    const p = list[M.idx[M.turn] % Math.max(1, list.length)];
    return p ? charById(p.charId) || charFromAll(p.charId) : null;
  }
  let ALL = null;
  function charFromAll(id) {
    if (!ALL) ALL = B.buildRoster();
    return ALL.find((c) => c.id === id) || null;
  }

  /* ══════════════════════════════════════════════════════════════
     ⑤ 試合のループと操作
     ══════════════════════════════════════════════════════════════ */
  function startLoop() {
    cancelAnimationFrame(raf);
    const tick = () => {
      if (cur !== "match") { raf = 0; return; }
      if (busy && !thinking && M && M.phase !== "over") {
        let moved = false;
        for (let i = 0; i < 4; i++) moved = B.step(M) || moved;
        if (!moved) onSettled();
      }
      drawCourt();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }
  function bindCourt() {
    const el = $("#court");
    if (!el || el._bound) return;
    el._bound = 1;
    const pos = (e) => {
      const r = el.getBoundingClientRect();
      const p = e.touches ? e.touches[0] : e;
      return { x: p.clientX - r.left, y: p.clientY - r.top };
    };
    const down = (e) => {
      if (busy || !M || M.phase === "over") return;
      if (isCpuTurn()) return;
      e.preventDefault();
      const q = pos(e);
      aim = { x: q.x, y: q.y, dragging: true };
      /* 投球ボックスは、押した場所の左右で決める */
      const sp = B.throwSpot(M, M.turn, slot);
      const X = sx(sp.x), Y = sy(sp.y);
      if (Math.hypot(q.x - X, q.y - Y) > 90 && q.y > sy(C.BOXD)) {
        slot = Math.max(0, Math.min(C.BOXES - 1, Math.floor(ux(q.x) / (C.W / C.BOXES))));
        aim = null;
      }
    };
    const move = (e) => { if (aim && aim.dragging) { e.preventDefault(); const q = pos(e); aim.x = q.x; aim.y = q.y; } };
    const up = (e) => {
      if (!aim || !aim.dragging) { aim = null; return; }
      e.preventDefault();
      const sp = B.throwSpot(M, M.turn, slot);
      const X = sx(sp.x), Y = sy(sp.y);
      const dx = aim.x - X, dy = aim.y - Y;
      const len = Math.hypot(dx, dy);
      const maxLen = Math.min(cv._w, cv._h) * 0.42;
      const p = Math.max(0, Math.min(1, len / maxLen));
      aim = null;
      if (p < 0.06) return;                  /* ほとんど引いていない＝投げない */
      doThrow(Math.atan2(-dy, -dx), p);
    };
    el.addEventListener("mousedown", down); el.addEventListener("touchstart", down, { passive: false });
    window.addEventListener("mousemove", move); el.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("mouseup", up); el.addEventListener("touchend", up, { passive: false });
  }
  function isCpuTurn() {
    if (!M) return false;
    /* ★ オンラインでは「自分の番でない」を同じように扱う（操作を受けつけない） */
    if (M.online) return M.turn !== M.online.side;
    if (M.replay) return true;
    const list = M.cfg.players[M.turn] || [];
    const p = list[M.idx[M.turn] % Math.max(1, list.length)];
    return !!(p && p.cpu);
  }
  /* 画面の角度（右が0・下が+）をコートの角度へ直す。
     コートは上下反転して描いているので、y を反転する。 */
  function toCourtAngle(a) { return Math.atan2(-Math.sin(a), Math.cos(a)); }
  function doThrow(screenAngle, power) {
    if (busy || !M) return;
    const ang = toCourtAngle(screenAngle);
    const ch = curChar();
    const isJack = M.phase === "jack";
    B.throwBall(M, { side: M.turn, jack: isJack, angle: ang, power, char: ch, slot,
                     playerIdx: M.idx[M.turn], noJitter: !!M.online });
    /* ★ オンラインは<b>角度・強さ・ボックス</b>だけを送る。
       盤面は両方の端末が自分で計算するので、結果を書きかえられない。
       ★ ぶれ（jitter）は入れない——入れると両方の盤面がずれる。 */
    if (M.online && window.MBROnline) {
      window.MBROnline.sendShot({ angle: ang, power, slot, jack: isJack });
    }
    busy = true;
    renderMatch();
  }
  /* 相手が投げた（オンライン） */
  function remoteShot(s) {
    if (!M || !M.online) return;
    if (s.side !== M.turn) return;                 /* 順番でない投球は捨てる */
    const ch = curChar();
    B.throwBall(M, { side: s.side, jack: !!s.jack, angle: s.angle, power: s.power,
                     char: ch, slot: s.slot, noJitter: true });
    busy = true;
    renderMatch();
  }
  /* 玉が止まったあとの処理 */
  function onSettled() {
    busy = false;
    B.live(M).forEach((b) => { b.moved = 0; });
    if (M.phase === "jack") {
      if (!B.jackValid(M)) {
        /* 無効なら投げ直し */
        M.balls = M.balls.filter((b) => !b.jack);
        B.pushHint(M, "jackline", true);
        renderMatch();
        return;
      }
      M.phase = "play";
      B.pushHint(M, "firstcolor");
      M.turn = M.first;
      renderMatch();
      maybeCpu();
      return;
    }
    /* デッドボールが出たら教える */
    if (M.balls.some((b) => b.dead && !b._noted)) {
      M.balls.forEach((b) => { if (b.dead) b._noted = 1; });
      B.pushHint(M, "deadball");
    }
    /* 練習モードは点をつけない */
    if (M.practice) {
      if (M.left.red <= 0 && M.left.blue <= 0) { M.balls = []; M.left = { red: 6, blue: 6 }; M.phase = "jack"; }
      else M.turn = M.left[M.turn] > 0 ? M.turn : B.other(M.turn);
      renderMatch();
      return;
    }
    hintByBoard();
    const nx = B.nextTurn(M);
    if (!nx) { showEnd(); return; }
    if (nx !== M.turn) B.pushHint(M, "farthrows");
    M.turn = nx;
    M.idx[nx] = (M.idx[nx] + 1) % Math.max(1, (M.cfg.players[nx] || []).length);
    renderMatch();
    maybeCpu();
  }
  /* 盤面を見て、いま役に立つ説明を出す */
  function hintByBoard() {
    const j = B.jackOf(M); if (!j) return;
    const last = M.balls.filter((b) => !b.jack).slice(-1)[0];
    if (!last) return;
    const d = B.dist(last, j);
    if (d > 1.6) B.pushHint(M, "tooweak");
    else if (last.y > j.y + 1.6) B.pushHint(M, "toostrong");
    const mine = B.live(M).filter((b) => b.side === last.side);
    const near = mine.filter((b) => B.dist(b, j) < 0.7).length;
    if (near >= 2) B.pushHint(M, "guarding");
    const opp = B.live(M).filter((b) => b.side !== last.side && !b.jack);
    if (opp.length && B.dist(opp[0], j) < 0.5) B.pushHint(M, "canhit");
  }
  /* CPU の番なら少し考えてから投げる */
  function maybeCpu() {
    if (!M || M.online || M.replay || !isCpuTurn() || M.phase === "over") return;
    busy = true; thinking = true;
    renderMatch();
    setTimeout(() => {
      if (!M) { thinking = false; return; }
      const ch = curChar();
      let shot;
      if (M.phase === "jack") {
        const sp = B.throwSpot(M, M.turn, slot);
        const ty = C.VLINE + 1.2 + Math.random() * 3.5;
        const tx = 1.2 + Math.random() * (C.W - 2.4);
        const d = Math.hypot(tx - sp.x, ty - sp.y);
        const v = Math.sqrt(2 * B.FRICTION_A * d);
        shot = { angle: Math.atan2(ty - sp.y, tx - sp.x),
                 power: Math.max(0.05, Math.min(1, (v - B.V_MIN) / (B.V_MAX - B.V_MIN))) };
      } else {
        shot = B.cpuPick(M, M.turn, ch, M.cfg.difficulty);
      }
      B.throwBall(M, { side: M.turn, jack: M.phase === "jack", angle: shot.angle,
                       power: shot.power, char: ch, slot, playerIdx: M.idx[M.turn] });
      busy = true; thinking = false;                 /* ★ ここではじめて珠が動きだす */
      renderMatch();
    }, 620 + Math.random() * 420);
  }

  /* ══════════════════════════════════════════════════════════════
     ⑥ 試合画面の HTML
     ══════════════════════════════════════════════════════════════ */
  function renderMatch() {
    if (!M) return;
    const ch = curChar();
    const ty = ch ? B.TYPES[ch.type] : null;
    const s = B.load();
    const g = B.takeHint(M);
    if (g) lastGuide = g;
    const cs = B.closestSide(M);
    const el = $("#s-match");
    el.innerHTML = ''
      + '<div class="mtop">'
      + '<div class="mscore"><span class="msn cr">RED</span><span class="msv" style="color:#ff7a86">' + M.score.red + "</span></div>"
      + '<div class="mend">' + esc(t("end")) + " " + M.end + " / " + M.cfg.ends + "</div>"
      + '<div class="mscore"><span class="msv" style="color:#9fd8ff">' + M.score.blue + '</span><span class="msn cb">BLUE</span></div>'
      + "</div>"
      + '<div class="turnbar"><span class="who" style="color:' + (M.turn === "red" ? "#ff7a86" : "#9fd8ff") + '">'
      + (isCpuTurn() ? esc(t("cpuTurn")) : esc(t("yourTurn"))) + " — " + M.turn.toUpperCase() + "</span>"
      + '<span class="tip">' + (M.phase === "jack" ? esc(t("throwJack"))
          : (cs ? esc(t("winner")) + "：" + cs.toUpperCase() : esc(t("nobody")))) + "</span></div>"
      + (lastGuide ? '<div class="guide"><button class="gx" onclick="MBRUI.clearGuide()">✕</button>' + L(lastGuide) + "</div>" : "")
      + '<div class="slab tight" style="padding:6px"><canvas id="court"></canvas></div>'
      + '<div class="mbot">'
      + '<div class="mchar">' + (ch ? '<img src="' + charImg(ch) + '" alt="">' : "")
      + '<div style="min-width:0"><div class="nm">' + esc(ch ? ch.nm : "—") + "</div>"
      + (ty ? '<div class="ty" style="color:' + ty.c + '">' + ty.ja + "</div>" : "")
      + '<div class="mballs">' + ballDots("red") + ballDots("blue") + "</div></div></div>"
      + '<button class="skbtn" ' + (M.skillUsed[M.turn] || isCpuTurn() || busy ? "disabled" : "")
      + ' onclick="MBRUI.useSkill()">' + (M.skillUsed[M.turn] ? esc(t("used"))
          : (ch ? L(B.SKILLS[ch.skill].nm) : esc(t("skill")))) + "</button>"
      + "</div>"
      + '<div class="brow"><button class="b sm gh" onclick="MBRUI.quit()">✕ ' + esc(t("back")) + "</button>"
      + '<button class="b sm gh" onclick="MBRUI.openRule()">?</button></div>';
    fitCanvas();
    bindCourt();
  }
  function ballDots(side) {
    let h = "";
    for (let i = 0; i < M.cfg.perSide; i++) {
      h += '<i class="' + (side === "red" ? "cr" : "cb") + (i < M.left[side] ? "" : " off") + '"></i>';
    }
    return h;
  }
  function useSkill() {
    if (!M || M.skillUsed[M.turn]) return;
    const ch = curChar(); if (!ch) return;
    M.skillUsed[M.turn] = true;
    const k = ch.skill;
    M.buffs[M.turn][k] = true;
    /* 1投だけのものは、投げたら消える（次の投球で使い切る） */
    B.pushHint(M, "skill");
    toast(L(B.SKILLS[k].nm) + " " + (lang() === "en" ? "activated" : "発動！"));
    renderMatch();
  }

  /* ══════════════════════════════════════════════════════════════
     ⑦ エンドの得点（動的な解説つき）
     ══════════════════════════════════════════════════════════════ */
  function showEnd() {
    const res = B.scoreEnd(M);
    const j = B.jackOf(M);
    const rows = res.rows || [];
    const maxd = rows.length ? Math.max(0.4, rows[rows.length - 1].d) : 1;
    B.pushHint(M, "scoring");
    let h = '<div class="hd" style="margin-top:2px">' + esc(t("end")) + " " + M.end + " — SCORE</div>"
      + '<div class="slab" style="text-align:center">'
      + '<div class="bigpts" style="color:' + (res.side === "red" ? "#ff7a86" : "#9fd8ff") + '">'
      + (res.side ? "+" + res.pts : "0") + "</div>"
      + '<div style="font-family:\'Orbitron\',sans-serif;font-weight:900;letter-spacing:.14em;margin-top:2px">'
      + (res.side ? res.side.toUpperCase() : "—") + "</div></div>"
      + '<div class="slab"><div class="sc-row"><span class="sc-dot cj"></span>'
      + '<b style="font-size:11.5px">JACK</b><span class="sc-d">0cm</span></div>'
      + rows.slice(0, 12).map((x) => '<div class="sc-row"><span class="sc-dot ' + (x.b.side === "red" ? "cr" : "cb") + '"></span>'
        + '<span class="sc-bar ' + (x.b.side === "red" ? "cr" : "") + '"><i style="width:'
        + Math.round(Math.max(4, Math.min(100, x.d / maxd * 100))) + '%"></i></span>'
        + '<span class="sc-d">' + Math.round(x.d * 100) + "cm</span></div>").join("")
      + "</div>"
      + '<div class="guide">' + esc(B.scoreText(M, res, lang())) + "</div>"
      + '<button class="b pri" onclick="MBRUI.nextEnd()">' + (M.end >= M.cfg.ends && M.score.red !== M.score.blue
        ? esc(t("result")) : (lang() === "en" ? "Next end" : "次のエンドへ")) + "</button>";
    open(h, true);
  }
  function nextEnd() {
    close();
    const before = M.phase;
    B.closeEnd(M);
    if (M.phase === "over") { showResult(); return; }
    lastGuide = null;
    renderMatch();
    maybeCpu();
  }

  /* ══════════════════════════════════════════════════════════════
     ⑧ 結果
     ══════════════════════════════════════════════════════════════ */
  function showResult() {
    const s = B.load();
    const win = M.score.red > M.score.blue ? "red" : (M.score.blue > M.score.red ? "blue" : null);
    const mine = "red";
    const won = win === mine;
    /* 戦績 */
    s.matches++; if (won) s.wins++;
    if (M.kind === "cpu" || M.kind === "quick" || M.kind === "ranked" || M.kind === "tourney") {
      s.cpuMatches++; if (won) s.cpuWins++;
    }
    if (M.kind === "team") { s.teamMatches++; if (won) s.teamWins++; }
    const st = M.stats.red;
    s.throws += st.throws; s.hits += st.hits; s.jackHits += st.jackHits;
    s.sumDist += st.sumDist; s.nDist += st.nDist;
    /* ランクポイント */
    let rp = 0;
    if (M.kind === "ranked") {
      const base = { easy: 12, normal: 20, hard: 28, expert: 38, master: 50 }[M.cfg.difficulty] || 20;
      rp = won ? base : -Math.round(base * 0.45);
      B.addRp(rp);
    }
    /* リプレイを控える（最新5件） */
    s.replays.unshift({ at: Date.now(), kind: M.kind, score: Object.assign({}, M.score),
                        log: M.log.slice(0, 200), seed: M.cfg.seed, ends: M.cfg.ends });
    s.replays = s.replays.slice(0, 5);
    B.save();

    const mvp = st.jackHits > st.hits ? (lang() === "en" ? "Jack control" : "ジャックコントロール")
              : (st.hits ? (lang() === "en" ? "Hit master" : "ヒットマスター")
                         : (lang() === "en" ? "Steady placement" : "堅実な置き"));
    const h = '<div class="hd" style="margin-top:2px">' + esc(t("result")) + "</div>"
      + '<div class="slab" style="text-align:center;padding:20px 14px">'
      + '<div class="victory' + (won ? "" : " lose") + '">' + (win ? (won ? t("victory") : t("defeat")) : t("draw")) + "</div>"
      + '<div style="display:flex;align-items:center;justify-content:center;gap:14px;margin-top:12px">'
      + '<span class="msn cr">RED</span><span class="msv" style="font-size:34px">' + M.score.red + "</span>"
      + '<span style="color:var(--sub)">-</span>'
      + '<span class="msv" style="font-size:34px">' + M.score.blue + '</span><span class="msn cb">BLUE</span></div>'
      + (rp ? '<div style="margin-top:10px;font-family:\'Orbitron\',sans-serif;font-weight:900;color:'
        + (rp > 0 ? "#7cd4ff" : "#ff7a86") + '">RP ' + (rp > 0 ? "+" : "") + rp + "</div>" : "")
      + "</div>"
      + '<div class="hd">' + (lang() === "en" ? "YOUR NUMBERS" : "この試合の記録") + "</div>"
      + '<div class="slab"><div class="kv">'
      + '<span class="k">' + (lang() === "en" ? "Throws" : "投球数") + '</span><span>' + st.throws + "</span>"
      + '<span class="k">' + (lang() === "en" ? "Hits" : "相手に当てた") + '</span><span>' + st.hits + "</span>"
      + '<span class="k">' + (lang() === "en" ? "Jack hits" : "ジャックに当てた") + '</span><span>' + st.jackHits + "</span>"
      + '<span class="k">' + (lang() === "en" ? "Best distance" : "最短距離") + '</span><span>'
      + (st.best < 90 ? Math.round(st.best * 100) + "cm" : "—") + "</span>"
      + '<span class="k">' + (lang() === "en" ? "Average" : "平均") + '</span><span>'
      + (st.nDist ? Math.round(st.sumDist / st.nDist * 100) + "cm" : "—") + "</span>"
      + '<span class="k">MVP</span><span>' + esc(mvp) + "</span>"
      + "</div></div>"
      + '<div class="bgrid"><button class="b" onclick="MBRUI.openReplay(0)">▶ ' + esc(t("replay")) + "</button>"
      + '<button class="b" onclick="MBRUI.close();MBRUI.startMatch()">' + esc(t("again")) + "</button></div>"
      + '<button class="b pri" style="margin-top:9px" onclick="MBRUI.close();MBRUI.go(\'home\')">'
      + esc(t("toHome")) + "</button>";
    open(h, true);
  }

  /* ══════════════════════════════════════════════════════════════
     ⑨ リプレイ（記録した投球をもう一度流す）
     ══════════════════════════════════════════════════════════════ */
  function openReplay(i) {
    const s = B.load();
    const rep = s.replays[i || 0];
    if (!rep) { open('<div class="empty">' + (lang() === "en" ? "No replay yet." : "リプレイはまだありません。") + "</div>"); return; }
    close();
    /* 記録どおりに投げなおす（同じ seed・同じ角度と強さなので、同じ結果になる） */
    M = B.newMatch({ mode: "cpu", ends: rep.ends, perSide: 6, seed: rep.seed,
                     players: { red: [{ name: "RED" }], blue: [{ name: "BLUE" }] }, guide: "off" });
    M.replay = { log: rep.log.slice(), i: 0 };
    go("match");
    fitCanvas(); renderMatch(); startLoop();
    stepReplay();
  }
  function stepReplay() {
    if (!M || !M.replay) return;
    const r = M.replay;
    if (r.i >= r.log.length) { toast(lang() === "en" ? "Replay finished" : "リプレイ終了"); return; }
    const e = r.log[r.i++];
    if (e.end !== M.end) { B.closeEnd(M); }
    B.throwBall(M, { side: e.side, jack: e.jack, angle: e.angle, power: e.power,
                     slot: e.slot == null ? 2 : e.slot, noJitter: true });
    busy = true;
    const wait = setInterval(() => {
      if (!busy) { clearInterval(wait); setTimeout(stepReplay, 420); }
    }, 120);
  }

  /* ══════════════════════════════════════════════════════════════
     ⑩ キャラクター
     ══════════════════════════════════════════════════════════════ */
  function renderChars() {
    loadRoster();
    const s = B.load();
    const sel = s.team[0] || (ROSTER[0] && ROSTER[0].id);
    $("#s-chars").innerHTML = ''
      + '<div class="hd" style="margin-top:2px">CHARACTER</div>'
      + (ROSTER.length ? '<div class="cgrid">' + ROSTER.map((c) =>
          '<div class="cc' + (c.id === sel ? " on" : "") + '" onclick="MBRUI.openChar(\'' + c.id + '\')">'
          + '<span class="rr' + (c.rarity === "SR" ? " sr" : "") + '">' + c.rarity + "</span>"
          + '<span class="ty" style="color:' + B.TYPES[c.type].c + '">' + B.TYPES[c.type].ja + "</span>"
          + (c.id === sel ? '<span class="lead">USE</span>' : "")
          + '<img src="' + charImg(c) + '" alt="" loading="lazy">'
          + '<div class="nm">' + esc(c.nm) + "</div></div>").join("") + "</div>"
        : '<div class="slab"><div class="empty">' + L(T.noChar)
          + '<br><br><button class="b sm pri" onclick="location.href=\'../gacha.html\'">'
          + esc(t("gacha")) + "</button></div></div>")
      + '<div class="slab tight" style="margin-top:10px"><div class="note">'
      + (lang() === "en"
        ? "Characters and the gacha are <b>shared with XEVARION</b>. Anything you pull there can be used here."
        : "キャラクターとガチャは <b>XEVARION と共通</b>です。あちらで引いた子は、そのままここで使えます。")
      + "</div></div>";
  }
  function openChar(id) {
    const c = charById(id); if (!c) return;
    const ty = B.TYPES[c.type];
    const sk = B.SKILLS[c.skill], ab = B.ABILS[c.ability];
    open('<div style="display:flex;gap:12px;align-items:center;margin:4px 0 10px">'
      + '<img src="' + charImg(c) + '" alt="" style="width:84px;height:84px;object-fit:cover;'
      + 'clip-path:polygon(12px 0,100% 0,calc(100% - 12px) 100%,0 100%)">'
      + '<div><div style="font-size:19px;font-weight:900">' + esc(c.nm) + "</div>"
      + '<div style="display:flex;gap:6px;margin-top:5px"><span class="tag" style="color:' + ty.c + '">'
      + ty.ja + '</span><span class="tag">' + c.rarity + "</span></div></div></div>"
      + '<div class="slab"><div class="stat">' + statRows(c) + "</div></div>"
      + '<div class="hd">ABILITY</div><div class="slab"><b>' + L(ab.nm) + "</b><div class=\"note\" style=\"margin-top:4px\">"
      + L(ab.d) + "</div></div>"
      + '<div class="hd">ACTIVE SKILL</div><div class="slab"><b style="color:var(--gold)">' + L(sk.nm)
      + '</b><div class="note" style="margin-top:4px">' + L(sk.d) + "</div>"
      + '<div class="note" style="margin-top:5px">'
      + (lang() === "en" ? "Once per match." : "1試合に1回だけ使えます。") + "</div></div>"
      + '<div class="slab tight"><div class="note">' + L(ty.d) + "</div></div>"
      + '<button class="b pri" onclick="MBRUI.pick(\'' + c.id + '\')">'
      + (lang() === "en" ? "Use this character" : "このキャラクターを使う") + "</button>");
  }
  function pick(id) {
    const s = B.load();
    s.team[0] = id; B.save();
    close(); renderChars();
    toast(lang() === "en" ? "Set as your character" : "使うキャラクターにしました");
  }

  /* ══════════════════════════════════════════════════════════════
     ⑪ フレンド・部屋
     ══════════════════════════════════════════════════════════════ */
  function renderFriend() {
    const s = B.load();
    $("#s-friend").innerHTML = ''
      + '<div class="hd" style="margin-top:2px">' + esc(t("room")) + "</div>"
      + '<div class="slab"><div class="note" style="margin-bottom:8px">'
      + (lang() === "en" ? "Create a room and share the ID, or enter a friend's room ID."
                        : "部屋を作って ID を伝えるか、友達の部屋 ID を入れてください。") + "</div>"
      + '<button class="b pri" onclick="MBRUI.roomCreate()">'
      + (lang() === "en" ? "Create a room" : "部屋を作る") + "</button>"
      + '<div style="margin-top:10px"><input class="inp code" id="roomIn" maxlength="6" placeholder="A82K91" '
      + 'value="' + esc(s.lastRoom || "") + '"></div>'
      + '<button class="b" style="margin-top:8px" onclick="MBRUI.roomJoin()">'
      + (lang() === "en" ? "Join" : "参加する") + "</button></div>"
      + '<div id="roomBox"></div>'
      + '<div class="hd">' + (lang() === "en" ? "FRIENDS" : "フレンド") + "</div>"
      + '<div class="slab"><div class="note">'
      + (lang() === "en"
        ? "Friends are shared with XEVARION. Open the portal's community tab to add friends."
        : "フレンドは XEVARION と共通です。ポータルのコミュニティから追加できます。")
      + '</div><button class="b sm gh" style="width:100%;margin-top:8px" onclick="location.href=\'../community.html\'">'
      + (lang() === "en" ? "Open community" : "コミュニティを開く") + "</button></div>";
  }

  /* ══════════════════════════════════════════════════════════════
     ⑫ プロフィール・戦績
     ══════════════════════════════════════════════════════════════ */
  function renderProfile() {
    const s = B.load();
    const r = B.rankOf(s.rp);
    const wr = s.matches ? Math.round(s.wins / s.matches * 100) : 0;
    let nm = "PLAYER";
    try { const a = JSON.parse(localStorage.getItem("xeva_account_v1") || "null"); if (a && a.name) nm = a.name; } catch (e) {}
    const ch = myChar();
    $("#s-profile").innerHTML = ''
      + '<div class="hd" style="margin-top:2px">PROFILE</div>'
      + '<div class="slab"><div style="display:flex;align-items:center;gap:12px">'
      + (ch ? '<img src="' + charImg(ch) + '" alt="" style="width:60px;height:60px;object-fit:cover;'
        + 'clip-path:polygon(10px 0,100% 0,calc(100% - 10px) 100%,0 100%)">' : "")
      + '<div><div style="font-size:17px;font-weight:900">' + esc(nm) + "</div>"
      + '<div style="font-family:\'Orbitron\',sans-serif;font-weight:900;color:' + r.c + '">' + r.ja + " " + s.rp + " RP</div></div>"
      + '<div style="margin-left:auto;text-align:right"><div style="font-family:\'Orbitron\',sans-serif;font-weight:900;font-size:26px">'
      + wr + '%</div><div class="note">' + (lang() === "en" ? "Win rate" : "勝率") + "</div></div></div></div>"
      + '<div class="hd">' + (lang() === "en" ? "RECORDS" : "戦績") + "</div>"
      + '<div class="slab"><div class="kv">'
      + kv(lang() === "en" ? "Matches" : "試合数", s.matches)
      + kv(lang() === "en" ? "Wins" : "勝利数", s.wins)
      + kv(lang() === "en" ? "CPU" : "CPU戦", s.cpuWins + " / " + s.cpuMatches)
      + kv(lang() === "en" ? "Team" : "チーム戦", s.teamWins + " / " + s.teamMatches)
      + kv(lang() === "en" ? "Online" : "オンライン", s.onWins + " / " + s.onMatches)
      + kv(lang() === "en" ? "Throws" : "投球数", s.throws)
      + kv(lang() === "en" ? "Hit rate" : "ヒット率", s.throws ? Math.round(s.hits / s.throws * 100) + "%" : "—")
      + kv(lang() === "en" ? "Jack hits" : "ジャックヒット", s.jackHits)
      + kv(lang() === "en" ? "Avg. distance" : "平均ジャック距離",
           s.nDist ? Math.round(s.sumDist / s.nDist * 100) + "cm" : "—")
      + "</div></div>"
      + '<div class="hd">' + esc(t("replay")) + "</div>"
      + (s.replays.length ? s.replays.map((r2, i) =>
          '<div class="slab tight" style="display:flex;align-items:center;gap:10px">'
          + '<div><div style="font-weight:900;font-size:12px">' + r2.score.red + " - " + r2.score.blue + "</div>"
          + '<div class="note">' + new Date(r2.at).toLocaleString() + "</div></div>"
          + '<button class="b sm" style="margin-left:auto" onclick="MBRUI.openReplay(' + i + ')">▶</button></div>').join("")
        : '<div class="slab"><div class="empty">' + (lang() === "en" ? "No replays yet." : "リプレイはまだありません。") + "</div></div>");
  }
  function kv(k, v) { return '<span class="k">' + esc(k) + '</span><span>' + esc(String(v)) + "</span>"; }

  /* ══════════════════════════════════════════════════════════════
     ⑬ ルールブック・設定・チュートリアル
     ══════════════════════════════════════════════════════════════ */
  function openRule() {
    const en = lang() === "en";
    open('<div class="hd" style="margin-top:2px">RULE BOOK</div>'
      + rb(en ? "The court" : "コート",
          en ? "12.5m long and 6m wide. The <b>V line</b> at 3m is the minimum distance for the jack. The cross at 5m is where the jack is replaced if it goes out."
             : "長さ 12.5m・幅 6m。<b>Vライン</b>（3m）はジャックボールが越えなければならない線です。5m のクロスは、ジャックが外に出たときに置きなおす場所です。")
      + rb(en ? "The jack" : "ジャックボール",
          en ? "The white ball. Both sides try to get their balls as close to it as possible."
             : "白いボールです。両チームは、このボールにできるだけ自分のボールを近づけます。")
      + rb(en ? "Throwing order" : "投げる順番",
          en ? "The starting side throws the jack, then their first coloured ball. After that, <b>the side farther from the jack throws</b> until they run out of balls."
             : "先攻がジャックを投げ、続けて最初の色ボールを投げます。そのあとは<b>ジャックから遠いほうのチーム</b>が投げ続けます。")
      + rb(en ? "Scoring" : "得点",
          en ? "At the end of an end, the side with the closest ball scores <b>one point for every ball closer than the opponent's nearest</b>."
             : "エンドの終わりに、ジャックにいちばん近いチームが、<b>相手の最短より近いボールの数だけ</b>得点します。")
      + rb(en ? "Ends" : "エンド",
          en ? "A match is 4, 6 or 8 ends. The starting side swaps every end. If the scores are level at the end, a tie-break end is played."
             : "1試合は 4・6・8 エンド。先攻はエンドごとに入れかわります。同点なら<b>タイブレークのエンド</b>を行います。")
      + rb(en ? "Dead balls" : "デッドボール",
          en ? "A ball that leaves the court is removed. In character mode the court has bumpers, so you can play <b>bank shots</b> instead."
             : "コートの外に出たボールは取り除かれます。キャラクターモードでは壁があるので、<b>バンクショット</b>が使えます。")
      + rb(en ? "Shots" : "ショットの種類",
          en ? "<b>NORMAL</b> place it near the jack / <b>POWER</b> strong / <b>PUSH</b> move your own ball / <b>HIT</b> knock the opponent away / <b>JACK</b> move the jack / <b>BANK</b> use the wall / <b>STOP</b> stop it short."
             : "<b>ノーマル</b>＝ジャックの近くに置く／<b>パワー</b>＝強く／<b>プッシュ</b>＝味方を押す／<b>ヒット</b>＝相手を弾く／<b>ジャック</b>＝ジャックを動かす／<b>バンク</b>＝壁を使う／<b>ストップ</b>＝手前で止める。")
      + rb(en ? "Characters" : "キャラクター",
          en ? "Characters change how a ball flies and stops, and each has one skill per match. In <b>competition mode</b> their effect is cut to a third so that skill decides the match."
             : "キャラクターはボールの飛びかた・止まりかたを変え、1試合に1回だけスキルを使えます。<b>競技モード</b>では効きが3分の1になり、勝敗はほぼ腕前で決まります。")
      + '<button class="b pri" onclick="MBRUI.close();MBRUI.tutorial()">'
      + (en ? "Play the tutorial" : "チュートリアルをやる") + "</button>");
  }
  function rb(k, v) {
    return '<div class="slab"><b style="font-size:12.5px;color:var(--blue2)">' + esc(k) + "</b>"
      + '<div class="note" style="margin-top:5px">' + v + "</div></div>";
  }
  function openSettings() {
    const s = B.load();
    const G = [["full", lang() === "en" ? "Full" : "くわしく"], ["normal", lang() === "en" ? "Normal" : "ふつう"],
               ["minimal", lang() === "en" ? "Minimal" : "少なめ"], ["off", "OFF"]];
    open('<div class="hd" style="margin-top:2px">SETTINGS</div>'
      + '<div class="slab"><div class="note" style="margin-bottom:6px"><b>' + esc(t("guide")) + "</b></div>"
      + '<div class="seg">' + G.map((g) => '<button class="' + (s.guide === g[0] ? "on" : "") + '" '
        + 'onclick="MBRUI.setSet(\'guide\',\'' + g[0] + '\')">' + g[1] + "</button>").join("") + "</div>"
      + '<div class="note" style="margin-top:6px">'
      + (lang() === "en" ? "How much of the rules is explained while you play."
                        : "遊びながらルールをどれくらい説明するかです。慣れたら「少なめ」に。") + "</div></div>"
      + '<div class="slab"><div style="display:flex;align-items:center;gap:9px">'
      + '<b style="font-size:12px">' + esc(t("comp")) + '</b><button class="b sm ' + (s.competition ? "pri" : "gh")
      + '" style="margin-left:auto" onclick="MBRUI.setSet(\'competition\',' + (!s.competition) + ')">'
      + (s.competition ? "ON" : "OFF") + "</button></div>"
      + '<div class="note" style="margin-top:6px">' + L(T.compD) + "</div></div>"
      + '<div class="slab"><div style="display:flex;align-items:center;gap:9px">'
      + '<b style="font-size:12px">' + (lang() === "en" ? "Language" : "言語") + '</b>'
      + '<button class="b sm gh" style="margin-left:auto" onclick="MBRUI.toggleLang()">'
      + (lang() === "en" ? "日本語" : "English") + "</button></div></div>");
  }
  function setSet(k, v) { const s = B.load(); s[k] = v; B.save(); openSettings(); }

  /* はじめてのボッチャ（実際に投げながら覚える） */
  function tutorial() {
    const en = lang() === "en";
    open('<div class="hd" style="margin-top:2px">' + esc(t("tutorial")) + "</div>"
      + '<div class="slab"><div class="note">'
      + (en ? "You will actually throw as you learn. Seven short steps:"
            : "文章だけではなく、<b>実際に投げながら</b>覚えます。7つのステップです。") + "</div>"
      + '<div class="kv" style="margin-top:8px">'
      + kv("STEP 1", en ? "What the jack is" : "ジャックボールとは")
      + kv("STEP 2", en ? "Throwing a ball" : "ボールを投げる")
      + kv("STEP 3", en ? "Pull and release" : "引っぱり操作")
      + kv("STEP 4", en ? "Hitting the opponent" : "相手のボールを狙う")
      + kv("STEP 5", en ? "How scoring works" : "得点判定")
      + kv("STEP 6", en ? "Character skills" : "キャラクターの能力")
      + kv("STEP 7", en ? "A real match" : "実戦")
      + "</div></div>"
      + '<button class="b pri" onclick="MBRUI.close();MBRUI.startTutorial()">'
      + (en ? "Start" : "はじめる") + "</button>");
  }
  function startTutorial() {
    const s = B.load();
    s.guide = "full"; s.tutorial = true; B.save();
    pendingCfg = { kind: "practice", difficulty: "easy", ends: 1, vs: 1, competition: false };
    startMatch();
    toast(lang() === "en" ? "Pull the ball back and release to throw." : "ボールを引っぱって、はなすと投げられます。");
  }

  /* ══════════ モーダル・トースト ══════════ */
  function open(html, noClose) {
    $("#ovc").innerHTML = '<div class="grip"></div>'
      + (noClose ? "" : '<button class="ovx" onclick="MBRUI.close()">✕</button>') + html;
    $("#ov").classList.add("on");
    $("#ovc").scrollTop = 0;
  }
  function close() { $("#ov").classList.remove("on"); }
  function toast(tx) {
    let e = $("#toast");
    if (!e) {
      e = document.createElement("div"); e.id = "toast";
      e.style.cssText = "position:fixed;left:50%;transform:translateX(-50%);bottom:calc(var(--navh) + 20px);"
        + "z-index:95;background:#0b1730;border:1.5px solid rgba(120,180,255,.35);color:#e9f2ff;font-size:12px;"
        + "font-weight:900;padding:9px 16px;opacity:0;transition:opacity .2s;"
        + "clip-path:polygon(9px 0,100% 0,calc(100% - 9px) 100%,0 100%)";
      document.body.appendChild(e);
    }
    e.textContent = tx; e.style.opacity = "1";
    clearTimeout(e._t); e._t = setTimeout(() => { e.style.opacity = "0"; }, 2200);
  }

  /* ══════════ 公開 ══════════ */
  const API = {
    go, quick, setup, startMatch, useSkill, nextEnd, openReplay, openChar, pick,
    openRule, openSettings, setSet, tutorial, startTutorial, close,
    setCfg(k, v) { pendingCfg[k] = v; if (k === "competition") pendingCfg.competition = !!v; drawSetup(); },
    clearGuide() { lastGuide = null; renderMatch(); },
    quit() {
      if (!confirm(lang() === "en" ? "Leave the match?" : "試合をやめますか？")) return;
      M = null; busy = false; thinking = false; cancelAnimationFrame(raf); raf = 0; go("home");
    },
    toggleLang() {
      try { localStorage.setItem("xeva_lang_v1", lang() === "en" ? "ja" : "en"); } catch (e) {}
      document.documentElement.lang = lang();
      close(); paintTop(); go(cur);
    },
    roomCreate() {
      if (!window.MBROnline) return toast(lang() === "en" ? "Online is unavailable." : "オンラインに接続できません。");
      window.MBROnline.create();
    },
    roomJoin() {
      const v = ($("#roomIn") || {}).value || "";
      if (!window.MBROnline) return toast(lang() === "en" ? "Online is unavailable." : "オンラインに接続できません。");
      window.MBROnline.join(v.trim().toUpperCase());
    },
    /* オンライン側から呼ばれる */
    _toast: toast, _open: open, _close: close,
    _startOnline(cfg) { pendingCfg = cfg; startMatch(); },
    _remoteShot(s) { remoteShot(s); },
  };
  window.MBRUI = API;

  /* ══════════ 起動 ══════════ */
  function paintTop() {
    const N = [["home", "H", t("home")], ["play", "P", t("play")], ["chars", "C", t("chars")],
               ["friend", "F", lang() === "en" ? "Friends" : "フレンド"], ["profile", "R", t("profile")]];
    $("#nav").innerHTML = N.map((x) => '<button data-go="' + x[0] + '" onclick="MBRUI.go(\'' + x[0] + '\')">'
      + '<span class="ni">' + x[1] + '</span><span>' + esc(x[2]) + "</span></button>").join("");
  }
  function boot() {
    document.documentElement.lang = lang();
    loadRoster();
    paintTop();
    go("home");
    window.addEventListener("resize", () => { if (cur === "match") { fitCanvas(); } });
    $("#ov").addEventListener("click", (e) => { if (e.target.id === "ov") close(); });
    /* はじめて開いた人には「ボッチャを知っていますか？」 */
    const s = B.load();
    if (!s.tutorial) {
      setTimeout(() => {
        open('<div class="hd" style="margin-top:2px">' + esc(t("askKnow")) + "</div>"
          + '<div class="bgrid"><button class="b pri" onclick="MBRUI.close();MBRUI.tutorial()">'
          + esc(t("firstTime")) + '</button><button class="b" onclick="MBRUI.skipTutorial()">'
          + esc(t("knowIt")) + "</button></div>");
      }, 700);
    }
  }
  API.skipTutorial = function () { const s = B.load(); s.tutorial = true; B.save(); close(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
