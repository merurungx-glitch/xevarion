/* ============================================================
   MagiQuiz — 画面（2026-10-23 新作）
   ------------------------------------------------------------
   タイトル → 準備（1画面：あそびかた・個人/チーム・プレイヤー・出題範囲・細かいルール）
   → 手番（「〇〇の番！」iPad をわたす）→ ミリオネア／ばくだん → 結果（表彰台・賞金・見直し）
   ・ミリオネア：1人（1チーム）ずつ10問のはしご。100→…→32,000 pt。安全ライン＝3問目（300）・7問目（4,000）。
     ライフライン（各1回）：50:50／ヒント（ChemLex のヒント。無い問題は選択肢を1つ消す）／みんなに聞く（まわりの人がタップで投票）。
     答えを選ぶ →「決定」→ すぐに正解発表（★★ 2026-10-24 ご指定「運命の答えなどの演出は要らない」で、ためる演出をやめた）。2問目からは「ここでやめる」（いまの pt で終わる）。
     制限時間（なし／30秒／60秒）。時間切れはまちがいと同じ。
   ・ばくだん：見えない時間で爆発する爆弾を回す。持っている人が答えて、正解→となりへ／まちがい→その人にもう1問（時間は進む）。
     爆発したときに持っていた人（チーム）はハート −1。0 になったら脱落。最後まで残った人（チーム）の勝ち。
   ・学習：答えるたびに正解と「ポイント」（ChemLex の q.k）。試合のあと、まちがえた問題を解説つきで見直せる。
   ・紐づけ・賞金・戦績は quiz-account.js（MagiShift と同じ GameLink）。
   ============================================================ */
(function () {
  "use strict";
  const MQ = window.MQ || {}, Q = MQ.Data, A = MQ.Account;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtN = (n) => Number(n || 0).toLocaleString("ja-JP");

  /* ══ アイコン（線の絵） ══ */
  const IC = {
    play: '<path class="fl" d="M8 5.5v13l10.5-6.5z"/>',
    book: '<path d="M5 4.5h9.5a2 2 0 0 1 2 2v13H7a2 2 0 0 1-2-2z"/><path d="M5 17.5a2 2 0 0 1 2-2h9.5"/><path d="M8.5 8.5h5M8.5 11.5h4"/>',
    trophy: '<path d="M7 4.5h10v4a5 5 0 0 1-10 0z"/><path d="M7 6H4.5a2.5 2.5 0 0 0 2.6 3.6M17 6h2.5a2.5 2.5 0 0 1-2.6 3.6"/><path d="M12 13.5v3M8.5 19.5h7"/>',
    help: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.6"/><path d="M12 16.6v.4"/>',
    menu: '<path d="M5 7h14M5 12h14M5 17h14"/>',
    again: '<path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4.5V9h-4.5"/>',
    home: '<path d="M4 11.2 12 4.5l8 6.7"/><path d="M6.5 9.5v9.5h11V9.5"/><path d="M10 19v-5h4v5"/>',
    crown: '<path d="M4 17.5 3 7.5l5 4 4-6.5 4 6.5 5-4-1 10z"/><path d="M5 20h14"/>',
    bomb: '<circle class="fl" cx="10" cy="14.5" r="6.6"/><path d="M14.4 9.8l1.9-1.9"/><path d="M15.6 7.5c.9-1.7 2.6-2.2 4.1-1.3"/><path d="M20.6 2.6v1.7M22.3 4.3h-1.7M18.9 2.9l.8.9"/>',
    hint: '<path d="M9 18h6M10 21h4"/><path d="M12 3.5a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V17h5v-.6c0-.8.4-1.5 1-2A6 6 0 0 0 12 3.5z"/>',
    people: '<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19c.6-3.3 2.7-5 5.5-5s4.9 1.7 5.5 5"/><circle cx="17" cy="9.5" r="2.4"/><path d="M15.6 14.4c2.5-.3 4.3 1.2 4.9 4.1"/>',
    half: '<circle cx="12" cy="12" r="8.5"/><path class="fl" d="M12 3.5a8.5 8.5 0 0 1 0 17z"/>',
    stop: '<path d="M6 20V5M6 5.5c4-2.5 7 2 12-.5v8c-5 2.5-8-2-12 .5"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    heart: '<path class="fl" d="M12 20.2C10.9 19.2 3.6 14.7 3.6 9.3 3.6 6.5 5.6 4.6 8.1 4.6c1.6 0 3 .9 3.9 2.2.9-1.3 2.3-2.2 3.9-2.2 2.5 0 4.5 1.9 4.5 4.7 0 5.4-7.3 9.9-8.4 10.9Z"/>',
    star: '<path class="fl" d="m12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/>',
    check: '<path d="M5 12.5l4.2 4.2L19 7"/>',
    x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    seon: '<path class="fl" d="M4.5 9.5h3.5l4.5-4v13l-4.5-4H4.5z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
    seoff: '<path class="fl" d="M4.5 9.5h3.5l4.5-4v13l-4.5-4H4.5z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
    team: '<circle cx="8" cy="9" r="2.6"/><circle cx="16" cy="9" r="2.6"/><path d="M3.5 18.5c.5-2.8 2.2-4.3 4.5-4.3s4 1.5 4.5 4.3M11.5 18.5c.5-2.8 2.2-4.3 4.5-4.3s4 1.5 4.5 4.3"/>',
    solo: '<circle cx="12" cy="8.5" r="3.2"/><path d="M5.5 19.5c.7-3.6 3-5.5 6.5-5.5s5.8 1.9 6.5 5.5"/>',
    shuffle: '<path d="M4 7h3l10 10h3M4 17h3l2.6-2.6M14.4 9.6 17 7h3"/><path d="M18 4.5 20.5 7 18 9.5M18 14.5l2.5 2.5-2.5 2.5"/>',
    timer: '<circle cx="12" cy="13" r="7.5"/><path d="M12 9v4l2.5 2M9.5 3h5"/>',
  };
  const ic = (n, cls) => '<svg class="ic' + (cls ? " " + cls : "") + '" viewBox="0 0 24 24" aria-hidden="true">' + (IC[n] || "") + "</svg>";
  function paintIcons(root) { $$("[data-ic]", root).forEach((el) => { if (!el.firstChild) el.innerHTML = ic(el.dataset.ic); }); }

  /* ══ 色・決まり ══ */
  const COLORS = [
    { nm: "あか", c: "#ff5a5f" }, { nm: "あお", c: "#3b82f6" }, { nm: "みどり", c: "#22b35e" }, { nm: "きいろ", c: "#f2b200" },
    { nm: "むらさき", c: "#9b5cf6" }, { nm: "だいだい", c: "#fb8a1e" }, { nm: "みずいろ", c: "#13b5d0" }, { nm: "ピンク", c: "#ff6fb5" },
  ];
  const TEAMS = [{ nm: "あかチーム", c: "#ff5a5f" }, { nm: "あおチーム", c: "#3b82f6" }, { nm: "みどりチーム", c: "#22b35e" }, { nm: "きいろチーム", c: "#f2b200" }];
  /* 選択肢の色（アイコンのタイルの色：青・赤・緑・黄＋紫・水色） */
  const OPT_C = ["#2f6bff", "#ff4d6d", "#1fae5b", "#f2a300", "#8b5cf6", "#12aecb"];
  const LET = "ABCDEF";
  const LADDER = [100, 200, 300, 500, 1000, 2000, 4000, 8000, 16000, 32000];
  const SAFE = { 3: 1, 7: 1 };          /* 3問目・7問目は安全ライン（まちがえてもそこまでは残る） */
  const FUSE = { short: [18, 30], mid: [28, 45], long: [40, 65] };

  /* ══ 設定（効果音）・音 ══ */
  const OPT_KEY = "magiquiz_opt_v1";
  const opt = (function () { try { return Object.assign({ se: true }, JSON.parse(localStorage.getItem(OPT_KEY) || "{}")); } catch (e) { return { se: true }; } })();
  const saveOpt = () => { try { localStorage.setItem(OPT_KEY, JSON.stringify(opt)); } catch (e) {} };
  let AC = null;
  function ac() {
    if (!opt.se) return null;
    if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } }
    if (AC && AC.state === "suspended") { try { AC.resume(); } catch (e) {} }
    return AC;
  }
  function tone(f, t0, dur, type, vol, f2) {
    const a = ac(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain(), now = a.currentTime + (t0 || 0);
    o.type = type || "sine"; o.frequency.setValueAtTime(f, now);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, now + dur);
    g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(vol || 0.08, now + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.connect(g); g.connect(a.destination); o.start(now); o.stop(now + dur + 0.05);
  }
  function noise(dur, vol) {
    const a = ac(); if (!a) return;
    const n = Math.floor(a.sampleRate * dur), b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.2);
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    f.type = "lowpass"; f.frequency.value = 900; g.gain.value = vol || 0.3;
    s.buffer = b; s.connect(f); f.connect(g); g.connect(a.destination); s.start();
  }
  function sfx(k) {
    if (!opt.se) return;
    switch (k) {
      case "tap": tone(660, 0, 0.06, "triangle", 0.045); break;
      case "sel": tone(540, 0, 0.07, "triangle", 0.06); tone(810, 0.05, 0.08, "triangle", 0.05); break;
      case "final": for (let i = 0; i < 9; i++) tone(120 + i * 9, i * 0.13, 0.11, "square", 0.035); break;
      case "ok": [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.07, 0.2, "triangle", 0.085)); break;
      case "ng": tone(233, 0, 0.42, "sawtooth", 0.055, 130); break;
      case "tick": tone(1650, 0, 0.028, "square", 0.022); break;
      case "boom": noise(1.1, 0.42); tone(95, 0, 0.7, "sine", 0.28, 38); break;
      case "pass": tone(420, 0, 0.14, "sine", 0.06, 900); break;
      case "life": tone(880, 0, 0.12, "sine", 0.06); tone(1320, 0.08, 0.15, "sine", 0.05); break;
      case "win": [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tone(f, i * 0.11, 0.24, "triangle", 0.085)); break;
      case "turn": tone(392, 0, 0.12, "triangle", 0.06); tone(587, 0.1, 0.18, "triangle", 0.06); break;
    }
  }
  function paintSe() { const b = $("#seBtn"); if (b) b.innerHTML = ic(opt.se ? "seon" : "seoff"); }

  /* ══ 画面・シート・トースト・紙ふぶき ══ */
  function show(id) {
    $$(".scr").forEach((s) => s.classList.toggle("on", s.id === id));
    document.body.dataset.scr = id;
    const s = $("#" + id); if (s) s.scrollTop = 0;
  }
  function sheet(html, cls) {
    const sh = $("#sheet"); sh.className = "sheet" + (cls ? " " + cls : ""); sh.innerHTML = html; paintIcons(sh);
    $("#ov").classList.add("on"); return sh;
  }
  function closeSheet() { $("#ov").classList.remove("on"); if (UI.onClose) { const f = UI.onClose; UI.onClose = null; f(); } }
  let toastT = 0;
  function toast(h, ms) { const t = $("#toast"); t.innerHTML = h; t.hidden = false; t.classList.remove("on"); void t.offsetWidth; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => { t.classList.remove("on"); setTimeout(() => { t.hidden = true; }, 250); }, ms || 2200); }
  function confetti(n) {
    const fx = $("#fx"); if (!fx) return;
    for (let i = 0; i < (n || 60); i++) {
      const p = document.createElement("i");
      p.style.left = Math.random() * 100 + "%"; p.style.background = OPT_C[i % OPT_C.length];
      p.style.setProperty("--dx", (Math.random() - 0.5) * 160 + "px"); p.style.setProperty("--r", Math.random() * 720 - 360 + "deg");
      p.style.animationDelay = Math.random() * 0.4 + "s"; p.style.animationDuration = 1.6 + Math.random() * 1.2 + "s";
      fx.appendChild(p); setTimeout(() => p.remove(), 3400);
    }
  }
  const UI = { onClose: null };

  /* ══ ① タイトル ══ */
  function openTitle() {
    show("title");
    const n = Q && Q.ok ? Q.all().length : 0;
    $("#tSrc").innerHTML = n ? "出題：MagiChemLex の基礎セット（選択問題 <b>" + fmtN(n) + "</b>問）" : "問題を読みこめませんでした。通信のあるところで開き直してください";
    paintSe();
  }

  /* ══ ② 準備 ══
     MagiShift と同じ：人数・名前・🔗 紐づけ・前回の紐づけは「🔒 要確認」で引きつぎ（4桁パスワードで有効）。 */
  const SETUP_KEY = "magiquiz_setup_v1";
  const setup = {
    mode: "mil", team: false, nTeams: 2, n: 2,
    all: COLORS.map((c, i) => ({ name: "プレイヤー" + (i + 1), team: i % 2, link: null })),   /* チームの色の名前とまぎれないように番号で */
    sets: Q && Q.SETS ? Q.SETS.map((s) => s[0]) : [], fields: Q && Q.FIELDS ? Q.FIELDS.map((f) => f[0]) : [],
    limit: 60, hearts: 3, fuse: "mid", order: "seat", restored: false,
  };
  function saveSetup() {
    try {
      localStorage.setItem(SETUP_KEY, JSON.stringify({ v: 1, mode: setup.mode, team: setup.team, nTeams: setup.nTeams, n: setup.n, sets: setup.sets, fields: setup.fields,
        limit: setup.limit, hearts: setup.hearts, fuse: setup.fuse, order: setup.order,
        players: setup.all.map((p) => ({ name: p.name, team: p.team, link: p.link && p.link.uid ? { uid: p.link.uid, name: p.link.name, charFile: p.link.charFile || "", charId: p.link.charId || "" } : null })) }));
    } catch (e) {}
  }
  function loadSetup() {
    try {
      const d = JSON.parse(localStorage.getItem(SETUP_KEY) || "null"); if (!d) return;
      if (d.mode === "mil" || d.mode === "bomb") setup.mode = d.mode;
      setup.team = !!d.team;
      if (d.nTeams >= 2 && d.nTeams <= 4) setup.nTeams = d.nTeams;
      if (d.n >= 1 && d.n <= 8) setup.n = d.n;
      if (Array.isArray(d.sets) && d.sets.length) setup.sets = d.sets.filter((v) => Q.SETS.some((s) => s[0] === v));
      if (Array.isArray(d.fields) && d.fields.length) setup.fields = d.fields.filter((v) => Q.FIELDS.some((s) => s[0] === v));
      if (!setup.sets.length) setup.sets = Q.SETS.map((s) => s[0]);
      if (!setup.fields.length) setup.fields = Q.FIELDS.map((f) => f[0]);
      if ([0, 30, 60].indexOf(d.limit) >= 0) setup.limit = d.limit;
      if ([1, 2, 3].indexOf(d.hearts) >= 0) setup.hearts = d.hearts;
      if (FUSE[d.fuse]) setup.fuse = d.fuse;
      if (d.order === "seat" || d.order === "rand") setup.order = d.order;
      if (Array.isArray(d.players)) d.players.slice(0, 8).forEach((sp, i) => {
        const p = setup.all[i]; if (!sp) return;
        if (sp.name) p.name = String(sp.name).slice(0, 6);
        if (sp.team >= 0 && sp.team < 4) p.team = sp.team;
        if (sp.link && sp.link.uid) p.link = { uid: sp.link.uid, name: sp.link.name, charFile: sp.link.charFile || "", charId: sp.link.charId || "", confirmed: false };
      });
      setup.restored = true;
    } catch (e) {}
  }
  const seats = () => setup.all.slice(0, setup.n);
  function avatarHTML(link, color, cls) {
    const th = link && A && A.thumb ? A.thumb(link) : "";
    return th ? '<img class="av' + (cls ? " " + cls : "") + '" src="' + esc(th) + '" alt="" style="--c:' + color + '" loading="lazy">' : "";
  }
  function markHTML(color, txt, cls) { return '<span class="mk' + (cls ? " " + cls : "") + '" style="--c:' + color + '">' + esc(txt || "") + "</span>"; }
  function minPlayers() { return setup.mode === "bomb" || setup.team ? 2 : 1; }
  function renderSetup() {
    const MODES = [
      ["mil", "crown", "ミリオネア", "1人（1チーム）ずつ<b>10問のはしご</b>に挑戦。正解するたびに pt が上がり、まちがえると安全ラインまで落ちます。ライフライン3つ。"],
      ["bomb", "bomb", "ばくだん", "<b>いつ爆発するか分からない爆弾</b>を回します。正解したらとなりへ、まちがえたらもう1問。爆発したときに持っていたらハート −1。"],
    ];
    $("#segMode").innerHTML = MODES.map((m) => '<button class="mode ' + m[0] + (setup.mode === m[0] ? " on" : "") + '" data-a="setMode" data-v="' + m[0] + '"><span class="mt">' + ic(m[1]) + m[2] + "</span><small>" + m[3] + "</small></button>").join("");
    $("#segTeam").innerHTML = [[false, "solo", "個人戦"], [true, "team", "チーム戦"]].map((t) => '<button class="' + (setup.team === t[0] ? "on" : "") + '" data-a="setTeam" data-v="' + (t[0] ? 1 : 0) + '">' + ic(t[1]) + t[2] + "</button>").join("");
    $("#segTeams").hidden = !setup.team;
    { const tn = $("#teamDrawNote"); if (tn) tn.hidden = !setup.team; }
    $("#segTeams").innerHTML = setup.team ? [2, 3, 4].map((k) => '<button class="' + (setup.nTeams === k ? "on" : "") + '" data-a="setTeams" data-v="' + k + '"' + (k > Math.max(2, setup.n) ? " disabled" : "") + ">" + k + "チーム</button>").join("") : "";
    const mn = minPlayers();
    if (setup.n < mn) setup.n = mn;
    if (setup.team && setup.nTeams > setup.n) setup.nTeams = Math.max(2, setup.n);
    $("#segN").innerHTML = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => '<button class="' + (n === setup.n ? "on" : "") + '" data-a="setN" data-v="' + n + '"' + (n < mn ? " disabled" : "") + ">" + n + "人</button>").join("");
    $("#plist").innerHTML = seats().map((p, i) => {
      const col = COLORS[i].c;
      const linked = p.link && p.link.uid, ok = linked && p.link.confirmed !== false;
      const btn = !linked ? '<button class="gl-link-btn" data-a="seatlink" data-i="' + i + '" title="XEVARIONアカウントを紐づけて賞金を受け取る">🔗</button>'
        : ok ? '<button class="gl-link-btn on" data-a="seatlink" data-i="' + i + '" title="タップで紐づけを解除">✓ ' + esc(p.link.name) + "</button>"
        : '<button class="gl-link-btn pending" data-a="seatlink" data-i="' + i + '" title="前回の紐づけ — タップして4桁パスワードで確認">🔒 ' + esc(p.link.name) + "（要確認）</button>";
      /* ★★ 2026-10-24 ご指定「チーム分けは名前を入力してから抽選に」→ 席ごとのチームの札はやめた（「はじめる」で抽選） */
      const tm = "";
      return '<div class="prow" data-i="' + i + '" style="--c:' + col + ";animation-delay:" + (i * 0.035) + 's">' + markHTML(col, String(i + 1)) + (linked ? avatarHTML(p.link, col) : "") +
        '<input class="pname-in" maxlength="6" value="' + esc(p.name) + '" aria-label="' + (i + 1) + '人目の名前">' + tm + btn + "</div>";
    }).join("");
    /* 出題範囲 */
    const pc = (list, key, cnt) => list.map((s) => '<button class="chip' + (setup[key].indexOf(s[0]) >= 0 ? " on" : "") + '" data-a="chip" data-k="' + key + '" data-v="' + s[0] + '">' + esc(s[1]) + "<small>" + cnt(s[0]) + "</small></button>").join("");
    $("#chipSets").innerHTML = pc(Q.SETS, "sets", (v) => Q.count([v], setup.fields));
    $("#chipFields").innerHTML = pc(Q.FIELDS, "fields", (v) => Q.count(setup.sets, [v]));
    const n = Q.count(setup.sets, setup.fields);
    $("#poolInfo").innerHTML = n >= 20 ? "この範囲から <b>" + n + "問</b>（答えるたびに正解とポイントを表示）" : '<span class="warn">この範囲は ' + n + "問しかありません。範囲を広げてください（20問以上）</span>";
    /* 遊び方ごとのルール */
    $("#optTitle").textContent = setup.mode === "mil" ? "ミリオネアのルール" : "ばくだんのルール";
    const seg = (key, list) => '<div class="seg sm">' + list.map((o) => '<button class="' + (setup[key] === o[0] ? "on" : "") + '" data-a="setOpt" data-k="' + key + '" data-v="' + o[0] + '">' + o[1] + "</button>").join("") + "</div>";
    const ordRow = '<div class="orow"><b>' + ic("shuffle") + "順番</b>" + seg("order", [["seat", "席の順"], ["rand", "ランダム"]]) + "</div>";
    $("#modeOpts").innerHTML = setup.mode === "mil"
      ? '<div class="orow"><b>' + ic("timer") + "1問の制限時間</b>" + seg("limit", [[0, "なし"], [30, "30秒"], [60, "60秒"]]) + "</div>" + ordRow +
        '<p class="note">はしご：' + LADDER.map((v, i) => (SAFE[i + 1] ? "<b>★" + fmtN(v) + "</b>" : fmtN(v))).join(" → ") + " pt（★＝安全ライン）</p>"
      : '<div class="orow"><b>' + ic("heart") + "ハート</b>" + seg("hearts", [[1, "1つ"], [2, "2つ"], [3, "3つ"]]) + "</div>" +
        '<div class="orow"><b>' + ic("bomb") + "爆発までの時間</b>" + seg("fuse", [["short", "みじかめ"], ["mid", "ふつう"], ["long", "ながめ"]]) + "</div>" + ordRow +
        '<p class="note">爆発までの時間はラウンドごとに変わり、だれにも分かりません（' + FUSE[setup.fuse][0] + "〜" + FUSE[setup.fuse][1] + "秒）。</p>";
    $("#beginTx").textContent = setup.mode === "mil" ? "ミリオネアをはじめる" : "ばくだんをはじめる";
    paintIcons($("#setup"));
  }
  function openSetup() {
    renderSetup(); show("setup");
    if (setup.restored && !openSetup._told && seats().some((p) => p.link && p.link.uid && p.link.confirmed === false)) {
      openSetup._told = true;
      setTimeout(() => toast("🔗 前回の紐づけを引きつぎました。<b>🔒 要確認</b>を押してパスワードを確認してください", 3600), 450);
    }
    refreshProfiles();
  }
  let profDone = false;
  function refreshProfiles() {
    if (profDone || !A || !A.refresh) return;
    profDone = true;
    const jobs = setup.all.filter((p) => p.link && p.link.uid).map((p) => A.refresh(p.link).then((v) => {
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
        if (res && res.uid) { p.link = { uid: res.uid, name: res.name, charFile: res.charFile || "", charId: res.charId || "", confirmed: true }; renderSetup(); saveSetup(); toast("🔗 " + esc(res.name) + " の紐づけを確認しました"); }
      });
      return;
    }
    if (p.link && p.link.uid) { p.link = null; renderSetup(); saveSetup(); toast("紐づけを解除しました"); return; }
    GameLink.link(p.name).then((res) => {
      if (!res || !res.uid) return;
      if (setup.all.some((q, j) => j !== i && j < setup.n && q.link && q.link.uid === res.uid)) { toast("そのアカウントはもう使われています"); return; }
      p.link = { uid: res.uid, name: res.name, charFile: res.charFile || "", charId: res.charId || "", confirmed: true };
      if (A && A.remember) A.remember(p.link);
      renderSetup(); saveSetup(); toast("🔗 " + esc(res.name) + " を紐づけました");
    });
  }
  document.addEventListener("input", (e) => {
    if (!e.target.matches || !e.target.matches(".pname-in")) return;
    const i = +e.target.closest(".prow").dataset.i;
    setup.all[i].name = e.target.value.slice(0, 6);
    saveSetup();
  });

  /* ══ 試合の土台 ══
     unit＝答える単位（個人戦＝1人・チーム戦＝1チーム）。members＝そのメンバー（紐づけは1人ずつ） */
  let G = null;
  function makeUnits() {
    const ps = seats().map((p, i) => ({ name: (p.name || "プレイヤー" + (i + 1)).slice(0, 6), link: p.link && p.link.uid && p.link.confirmed !== false ? p.link : null, color: COLORS[i].c, i }));
    let units;
    if (!setup.team) units = ps.map((p) => ({ name: p.name, color: p.color, members: [p] }));
    else {
      units = TEAMS.slice(0, setup.nTeams).map((t) => ({ name: t.nm, color: t.c, members: [] }));
      seats().forEach((p, i) => units[Math.min(p.team, setup.nTeams - 1)].members.push(ps[i]));
      units = units.filter((u) => u.members.length);
    }
    units.forEach((u, k) => Object.assign(u, { k, score: 0, ok: 0, n: 0, lives: setup.hearts, out: false, outAt: 0, used: {}, reach: 0 }));
    if (setup.order === "rand") for (let i = units.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [units[i], units[j]] = [units[j], units[i]]; }
    return units;
  }
  function begin() {
    if (!Q || !Q.ok) { toast("問題を読みこめませんでした"); return; }
    const pool = Q.pool(setup.sets, setup.fields);
    if (pool.length < 20) { toast("出題範囲の問題が少なすぎます（20問以上にしてください）"); return; }
    if (setup.mode === "bomb" && (setup.team ? 2 : setup.n) < 2) { toast("ばくだんは2人以上で遊べます"); return; }
    /* ★★ 2026-10-24 チーム戦は、名前を入れたあとの「はじめる」で<b>チームを抽選</b>（ご指定）→ 決まったら beginGo */
    if (setup.team) { teamDraw(); return; }
    beginGo();
  }
  /* チームの抽選：席をまぜて、チームの人数がなるべく同じになるように順に配る（2〜4チーム） */
  function teamDraw() {
    const ps = seats(), k = Math.max(2, Math.min(setup.nTeams, ps.length));
    const ix = ps.map((p, i) => i);
    for (let i = ix.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ix[i], ix[j]] = [ix[j], ix[i]]; }
    ix.forEach((pi, n) => { setup.all[pi].team = n % k; });
    saveSetup();
    sfx("sel");
    let delay = 0;
    sheet('<h3 class="sh-t center">' + ic("shuffle") + "チーム抽選</h3>" +
      '<p class="sh-p center">' + ps.length + "人を " + k + "チームに分けました</p>" +
      '<div class="tdraw">' + TEAMS.slice(0, k).map((t, ti) => '<div class="tdt" style="--c:' + t.c + '"><b>' + esc(t.nm) + "</b>" +
        ps.map((p, i) => ({ p, i })).filter((o) => setup.all[o.i].team === ti).map((o) => '<span style="animation-delay:' + ((delay++) * 0.12).toFixed(2) + 's">' + esc((o.p.name || "プレイヤー" + (o.i + 1)).slice(0, 6)) + "</span>").join("") + "</div>").join("") + "</div>" +
      '<div class="sh-b"><button class="btn pri big" data-a="tdGo">' + ic("check") + 'このチームではじめる</button><button class="btn" data-a="tdAgain">' + ic("shuffle") + "もう一度抽選</button></div>", "tdsh");
  }
  function beginGo() {
    if (!Q || !Q.ok) return;
    const pool = Q.pool(setup.sets, setup.fields);
    saveSetup();
    G = { mode: setup.mode, team: setup.team, units: makeUnits(), pool, used: new Set(), log: [], cur: 0, outN: 0, done: false, reported: false, t0: Date.now() };
    if (G.mode === "bomb" && G.units.length < 2) { toast("ばくだんは2つ以上の席（チーム）で遊べます"); G = null; return; }
    if (G.mode === "mil") milStart(); else bombStart();
  }
  const curU = () => G.units[G.cur];
  const unitNames = (u) => (G.team ? u.members.map((m) => m.name).join("・") : "");
  function unitBadge(u, cls) {
    const m = u.members[0], av = !G.team && m.link ? avatarHTML(m.link, u.color, "sm") : "";
    return '<span class="ub' + (cls ? " " + cls : "") + '" style="--c:' + u.color + '">' + (av || markHTML(u.color, G.team ? "" : String(m.i + 1), "sm")) + "<b>" + esc(u.name) + "</b></span>";
  }

  /* ══ 手番（iPad をわたす） ══ */
  function turnScreen(u, sub, go) {
    show("turn");
    const m = u.members[0], av = !G.team && m.link ? avatarHTML(m.link, u.color, "big") : "";
    $("#turnBox").innerHTML = '<div class="tc-in" style="--c:' + u.color + '">' + (av || '<span class="tbig" style="--c:' + u.color + '">' + ic(G.team ? "team" : "solo") + "</span>") +
      '<p class="t1">' + esc(u.name) + " の番！</p>" + (G.team ? '<p class="t3">' + esc(unitNames(u)) + "</p>" : "") +
      '<p class="t2">' + sub + "</p>" +
      '<button class="btn pri big" data-a="turnGo">' + ic("play") + "スタート</button></div>";
    UI.turnGo = go;
    sfx("turn");
  }

  /* ══════════════════════════════════════════════════════════════
     ④ ミリオネア
     ══════════════════════════════════════════════════════════════ */
  const M = { step: 0, amount: 0, x: null, q: null, ord: [], sel: -1, hidden: {}, phase: "", left: 0, timer: 0, paused: false, hint: "" };
  function milStart() {
    G.cur = 0;
    milTurn();
  }
  function milTurn() {
    const u = curU();
    turnScreen(u, (G.units.length > 1 ? (G.cur + 1) + " / " + G.units.length + " 番目・" : "") + "iPad を <b>" + esc(u.name) + "</b> にわたしてね<br><small>10問のはしごに挑戦！ 2問目からは「ここでやめる」もできます</small>", () => {
      M.step = 0; M.amount = 0; u.used = {};
      show("mil"); milNext();
    });
  }
  function safeAmount(stepDone) {   /* stepDone 問まで正解しているとき、まちがえたら残る pt */
    let v = 0; Object.keys(SAFE).forEach((k) => { if (stepDone >= +k) v = Math.max(v, LADDER[k - 1]); }); return v;
  }
  function milNext() {
    M.step++;
    const lv = M.step <= 3 ? [1] : M.step <= 7 ? [2, 1] : [3, 2];
    const x = Q.pick(G.pool, G.used, { lv, minOpt: 3, maxLen: 190 });
    if (!x) { milEndTurn(); return; }
    G.used.add(x.id); Q.markUsed(x.id);
    Object.assign(M, { x, q: x.q, ord: Q.order(x.q), sel: -1, hidden: {}, phase: "q", hint: "" });
    renderMil();
    startTimer();
  }
  function qHTML(x, extra) {
    const q = x.q, top = [Q.fieldName(q.f), Q.topicName(q.t)].filter(Boolean).join("・");
    return '<div class="qtag">' + esc(top) + "</div>" + (q.ctx ? '<div class="qctx">' + Q.fmt(q.ctx) + "</div>" : "") + '<div class="qtx">' + Q.fmt(q.q) + "</div>" + (extra || "");
  }
  function optsHTML(q, ord, opt2) {
    opt2 = opt2 || {};
    const vis = ord.filter((i) => !(opt2.hidden && opt2.hidden[i]));
    const long = vis.some((i) => String(q.o[i]).replace(/<[^>]+>|[{}^_]/g, "").length > 20);
    return '<div class="og' + (long ? " long" : "") + " n" + vis.length + '">' + ord.map((i, k) => {
      if (opt2.hidden && opt2.hidden[i]) return '<button class="opt gone" disabled aria-hidden="true"><span class="ol" style="--oc:' + OPT_C[k] + '">' + LET[k] + '</span><span class="ot"></span></button>';
      const st = opt2.state ? opt2.state(i) : "";
      return '<button class="opt' + (st ? " " + st : "") + '" data-a="' + opt2.act + '" data-i="' + i + '" style="--oc:' + OPT_C[k] + '"><span class="ol">' + LET[k] + '</span><span class="ot">' + Q.fmtOpt(q, q.o[i]) + "</span></button>";
    }).join("") + "</div>";
  }
  function letterOf(ord, i) { const k = ord.indexOf(i); return k >= 0 ? LET[k] : ""; }
  function renderMil() {
    const u = curU(), q = M.q;
    $("#mWho").innerHTML = unitBadge(u);
    $("#mStep").innerHTML = '<span class="ms-n">第 <b>' + M.step + "</b> 問</span><span class=\"ms-a\">" + fmtN(LADDER[M.step - 1]) + " pt に挑戦</span>" + (SAFE[M.step] ? '<span class="ms-s">' + ic("star") + "安全ライン</span>" : "") +
      (M.amount ? '<span class="ms-c">いま ' + fmtN(M.amount) + " pt</span>" : "");
    $("#mProg").innerHTML = LADDER.map((v, i) => '<i class="' + (i + 1 < M.step ? "done" : i + 1 === M.step ? "cur" : "") + (SAFE[i + 1] ? " safe" : "") + '"></i>').join("");
    $("#mQ").innerHTML = qHTML(M.x, M.hint ? '<div class="qhint">' + ic("hint") + "<span>" + Q.fmt(M.hint) + "</span></div>" : "");
    const locked = M.phase !== "q";
    $("#mOpts").innerHTML = optsHTML(q, M.ord, {
      act: "mpick", hidden: M.hidden,
      state: (i) => {
        if (M.phase === "reveal") return i === q.a ? "ok" : i === M.sel ? "ng" : "dim";
        if (M.phase === "lock") return i === M.sel ? "lock" : "dim";
        return i === M.sel ? "sel" : "";
      },
    });
    if (locked) $$("#mOpts .opt").forEach((b) => { b.disabled = true; });
    const L = u.used || {};
    const lb = (k, icn, nm) => '<button class="life' + (L[k] ? " used" : "") + '" data-a="mlife" data-v="' + k + '"' + (L[k] || locked ? " disabled" : "") + ">" + (icn === "50" ? '<span class="l50">50:50</span>' : ic(icn)) + "<span>" + nm + "</span></button>";
    $("#mLife").innerHTML = lb("ff", "50", "半分にする") + lb("hint", "hint", "ヒント") + lb("ask", "people", "みんなに聞く") +
      '<button class="life drop" data-a="mdrop"' + (M.step < 2 || locked ? " disabled" : "") + ">" + ic("stop") + "<span>ここでやめる</span></button>";
    renderMilBar();
    renderLadder();
    paintIcons($("#mil"));
  }
  function renderMilBar() {
    const bar = $("#mBar"), q = M.q;
    if (M.phase === "q") {
      bar.className = "mbar" + (M.sel >= 0 ? " ask" : "");
      bar.innerHTML = M.sel >= 0
        ? '<p class="fa-q">' + LET[M.ord.indexOf(M.sel)] + " で決定しますか？</p><div class=\"fa-b\"><button class=\"btn pri big\" data-a=\"mfinal\">" + ic("check") + "決定</button><button class=\"btn\" data-a=\"munsel\">えらびなおす</button></div>"
        : '<p class="fa-h">答えをえらんでください' + (setup.limit ? "（" + setup.limit + "秒）" : "") + "</p>";
      return;
    }
    if (M.phase === "lock") { bar.className = "mbar lock"; bar.innerHTML = '<p class="fa-q drum">運命の答えは…</p>'; return; }
    if (M.phase === "reveal") {
      const ok = M.lastOk, last = M.step >= LADDER.length && ok, ansL = letterOf(M.ord, q.a);
      const head = ok ? (last ? "🎉 全問正解！ MagiQuiz 王！" : "正解！ " + fmtN(M.amount) + " pt 獲得") : M.timeout ? "時間切れ…" : M.dropped ? "ここでやめました（" + fmtN(M.amount) + " pt）" : "ざんねん… " + fmtN(M.amount) + " pt で終了";
      const nextLb = ok && !last ? "次の問題へ（" + fmtN(LADDER[M.step]) + " pt）" : G.cur + 1 < G.units.length ? "次の人へ" : "結果を見る";
      bar.className = "mbar res " + (ok ? "ok" : "ng");
      bar.innerHTML = '<p class="rs-h">' + (ok ? ic("check") : ic("x")) + "<b>" + head + "</b></p>" +
        (ok ? "" : '<p class="rs-a">正解は <b>' + ansL + "</b>：" + Q.fmtOpt(q, q.o[q.a]) + "</p>") +
        (q.k ? '<p class="rs-k"><span>ポイント</span>' + Q.fmt(q.k) + "</p>" : "") +
        '<button class="btn pri big" data-a="mnext">' + nextLb + "</button>";
    }
  }
  function renderLadder() {
    $("#mLadder").innerHTML = '<p class="lh">' + ic("crown") + "はしご</p>" + LADDER.map((v, i) => i).reverse().map((i) => {
      const st = i + 1, cls = st < M.step || (M.phase === "reveal" && M.lastOk && st === M.step) ? "done" : st === M.step ? "cur" : "";
      return '<div class="lr ' + cls + (SAFE[st] ? " safe" : "") + '"><span class="ln">' + st + '</span><b>' + fmtN(LADDER[i]) + "</b>" + (SAFE[st] ? ic("star") : "") + "</div>";
    }).join("");
  }
  /* 制限時間 */
  function startTimer() {
    stopTimer();
    const el = $("#mTimer");
    if (!setup.limit) { el.hidden = true; return; }
    M.left = setup.limit; M.paused = false; el.hidden = false;
    let last = performance.now();
    const loop = (now) => {
      if (!M.timer) return;
      const dt = Math.min(0.25, (now - last) / 1000); last = now;
      if (!M.paused && M.phase === "q" && !$("#ov").classList.contains("on")) M.left -= dt;
      const p = Math.max(0, M.left / setup.limit);
      el.innerHTML = '<svg viewBox="0 0 40 40"><circle class="tb" cx="20" cy="20" r="17"/><circle class="tf" cx="20" cy="20" r="17" style="stroke-dasharray:' + (p * 106.8).toFixed(1) + ' 200"/></svg><b>' + Math.ceil(Math.max(0, M.left)) + "</b>";
      el.classList.toggle("warn", M.left <= 10);
      if (M.left <= 0 && M.phase === "q") { stopTimer(); M.timeout = true; milReveal(false); return; }
      M.timer = requestAnimationFrame(loop);
    };
    M.timer = requestAnimationFrame(loop);
  }
  function stopTimer() { if (M.timer) cancelAnimationFrame(M.timer); M.timer = 0; }
  function milPick(i) {
    if (M.phase !== "q" || M.hidden[i]) return;
    M.sel = M.sel === i ? -1 : i; sfx("sel");
    renderMil();
  }
  /* ★★ 2026-10-24 ご指定「運命の答えなどの演出は要りません」→「運命の答えは…」とためる時間・太鼓の音をやめ、決定したらすぐ発表 */
  function milFinal() {
    if (M.phase !== "q" || M.sel < 0) return;
    stopTimer();
    milReveal(M.sel === M.q.a);
  }
  function milReveal(ok) {
    const u = curU(), q = M.q;
    M.phase = "reveal"; M.lastOk = ok; stopTimer();
    $("#mTimer").hidden = true;
    u.n++; if (ok) u.ok++;
    G.log.push({ id: q.id, u: u.k, ok, pick: M.sel, ord: M.ord.slice(), timeout: !!M.timeout });
    if (ok) {
      M.amount = LADDER[M.step - 1];
      sfx(M.step >= LADDER.length ? "win" : "ok");
      confetti(M.step >= LADDER.length ? 140 : SAFE[M.step] ? 70 : 34);
    } else { M.amount = safeAmount(M.step - 1); sfx("ng"); }
    renderMil();
    M.timeout = false;
  }
  function milAfter() {
    if (M.phase !== "reveal") return;
    if (M.lastOk && !M.dropped && M.step < LADDER.length) { milNext(); return; }
    milEndTurn();
  }
  function milEndTurn() {
    const u = curU();
    u.score = M.amount; u.reach = M.lastOk ? M.step : M.step - 1;
    M.dropped = false; stopTimer();
    if (G.cur + 1 < G.units.length) { G.cur++; milTurn(); } else finish();
  }
  function milDrop() {
    if (M.phase !== "q" || M.step < 2) return;
    sheet('<h3 class="sh-t">' + ic("stop") + "ここでやめますか？</h3><p class=\"sh-p\">いまの <b>" + fmtN(M.amount) + " pt</b> で終わります（この問題の答えは、やめたあとに見られます）。</p>" +
      '<div class="sh-b"><button class="btn pri" data-a="mdropYes">' + fmtN(M.amount) + ' pt でやめる</button><button class="btn" data-a="close">つづける</button></div>');
  }
  function milDropYes() {
    closeSheet();
    const u = curU(), q = M.q;
    M.dropped = true; M.phase = "reveal"; M.lastOk = false; stopTimer();
    G.log.push({ id: q.id, u: u.k, ok: null, pick: -1, ord: M.ord.slice(), drop: true });
    renderMil();
  }
  /* ライフライン */
  function milLife(k) {
    const u = curU(), q = M.q;
    if (M.phase !== "q" || (u.used && u.used[k])) return;
    const wrong = M.ord.filter((i) => i !== q.a && !M.hidden[i]);
    /* ヒントの無い問題で、もう消せる選択肢も無いときは使わずにおく */
    if (k === "hint" && !(Array.isArray(q.h) && q.h.length) && wrong.length <= 1) { toast("この問題にはヒントがありません（ヒントは残しておきます）"); return; }
    u.used[k] = 1; sfx("life");
    if (k === "ff") {
      const keep = wrong[Math.floor(Math.random() * wrong.length)];
      wrong.forEach((i) => { if (i !== keep) M.hidden[i] = 1; });
      if (M.hidden[M.sel]) M.sel = -1;
      toast("50:50 — 選択肢を2つにしました");
    } else if (k === "hint") {
      const h = Array.isArray(q.h) && q.h.length ? q.h[0] : "";
      if (h) M.hint = h;
      else if (wrong.length > 1) { const i = wrong[Math.floor(Math.random() * wrong.length)]; M.hidden[i] = 1; if (M.sel === i) M.sel = -1; toast("この問題にはヒントがないので、まちがいの選択肢を1つ消しました"); }
    } else if (k === "ask") { openAsk(); }
    renderMil();
  }
  /* みんなに聞く：まわりの人が、正しいと思う答えをタップして投票（何回でも）→ 結果のグラフ */
  function openAsk() {
    M.paused = true;
    const q = M.q, vis = M.ord.filter((i) => !M.hidden[i]);
    M.votes = {}; vis.forEach((i) => { M.votes[i] = 0; });
    const draw = (res) => {
      const tot = Object.keys(M.votes).reduce((a, k) => a + M.votes[k], 0);
      sheet('<h3 class="sh-t">' + ic("people") + "みんなに聞く</h3>" +
        (res ? '<p class="sh-p">投票の結果（' + tot + "票）</p>" : '<p class="sh-p">まわりのみんなは、正しいと思う答えをタップしてね（何回でも）。<br>終わったら「結果を見る」。</p>') +
        '<div class="vote' + (res ? " res" : "") + '">' + vis.map((i) => {
          const k = M.ord.indexOf(i), v = M.votes[i] || 0, p = tot ? Math.round(v / tot * 100) : 0;
          return '<button class="vb" data-a="vote" data-i="' + i + '" style="--oc:' + OPT_C[k] + ";--p:" + p + '%"' + (res ? " disabled" : "") + '><span class="ol">' + LET[k] + '</span><span class="vt">' + Q.fmtOpt(q, q.o[i]) + '</span><span class="vn">' + (res ? p + "%" : v) + "</span><i></i></button>";
        }).join("") + "</div>" +
        '<div class="sh-b">' + (res ? '<button class="btn pri" data-a="close">とじる</button>' : '<button class="btn pri" data-a="voteRes">結果を見る</button>') + "</div>", "ask");
    };
    UI.voteDraw = draw;
    UI.onClose = () => { M.paused = false; };
    draw(false);
  }

  /* ══════════════════════════════════════════════════════════════
     ⑤ ばくだん
     ══════════════════════════════════════════════════════════════ */
  const B = { holder: 0, round: 0, fuse: 0, max: 0, run: false, raf: 0, last: 0, tickAt: 0, x: null, q: null, ord: [], busy: false, k: 1, from: -1 };
  const alive = () => G.units.filter((u) => !u.out);
  function nextAlive(k) { const n = G.units.length; for (let s = 1; s <= n; s++) { const j = (k + s) % n; if (!G.units[j].out) return j; } return k; }
  function bombStart() {
    G.units.forEach((u) => { u.lives = setup.hearts; });
    B.round = 0; B.holder = 0;
    show("bomb");
    bombRound();
  }
  function bombRound() {
    B.round++; B.run = false; B.busy = true; glowOn(false);
    if (G.units[B.holder].out) B.holder = nextAlive(B.holder);
    const r = FUSE[setup.fuse] || FUSE.mid;
    B.max = r[0] + Math.random() * (r[1] - r[0]); B.fuse = 0; B.k = 0.78 + Math.random() * 0.5;
    renderBombTop(); drawBomb(0);
    $("#bQ").innerHTML = ""; $("#bOpts").innerHTML = ""; $("#bFb").hidden = true;
    const u = G.units[B.holder];
    $("#bHolder").innerHTML = unitBadge(u, "big") + "<span>から スタート！</span>";
    const st = $("#bStart");
    st.hidden = false;
    st.innerHTML = '<div class="bs-in"><p class="bs-r">ラウンド ' + B.round + "</p><p class=\"bs-t\">" + unitBadge(u) + " から！</p><p class=\"bs-s\">爆発までの時間はひみつ。正解したら となりへ、まちがえたら もう1問。</p>" +
      '<button class="btn pri big" data-a="bgo">' + ic("bomb") + "点火！</button></div>";
    paintIcons($("#bomb"));
  }
  /* ══ ★★ 2026-10-24 ご指定「爆弾は大きく表示されると邪魔なので小さく、iPad の画面まわりがきれいにライトアップされ、危機が迫っていることを表現」══
     画面のふち全体（#bGlow）が光る：はじめは淡い金色 → だんだん橙・赤へ、強く・速く脈打つ。光の帯がふちをまわる。
     ★ 強さは導火線と同じ「ずらした進み」（B.k）で決める＝のこり時間は読めない（爆発の時間はひみつのまま）。 */
  function glowPaint(p) {
    const g = $("#bGlow"); if (!g) return;
    const v = Math.max(0, Math.min(1, p * B.k + Math.sin(p * 13) * 0.03));
    g.style.setProperty("--dz", v.toFixed(3));
    g.style.setProperty("--bp", (1.7 - 1.35 * v).toFixed(2) + "s");
    g.classList.toggle("hot", v > 0.7);
  }
  function glowOn(on) { const g = $("#bGlow"); if (g) { g.classList.toggle("on", !!on); if (!on) g.classList.remove("hot"); } }
  function bombGo() {
    $("#bStart").hidden = true;
    glowPaint(0); glowOn(true);
    B.run = true; B.last = performance.now(); B.tickAt = 0;
    cancelAnimationFrame(B.raf); B.raf = requestAnimationFrame(bombLoop);
    bombAsk();
  }
  function renderBombTop() {
    $("#bRound").innerHTML = '<span class="rd">ラウンド <b>' + B.round + "</b></span>";
    $("#bPlayers").innerHTML = G.units.map((u, k) => {
      const hs = [...Array(setup.hearts)].map((_, i) => '<i class="h' + (i < u.lives ? " on" : "") + '">' + ic("heart") + "</i>").join("");
      return '<div class="bp' + (k === B.holder && !u.out ? " cur" : "") + (u.out ? " out" : "") + '" style="--c:' + u.color + '">' + unitBadge(u) + '<span class="hs">' + hs + "</span>" + (u.out ? '<em class="outb">脱落</em>' : "") + (k === B.holder && !u.out ? '<span class="bi">' + ic("bomb") + "</span>" : "") + "</div>";
    }).join("");
  }
  /* 爆弾の絵：導火線の長さは時間どおりに減らない（B.k で少しずらす＝のこり時間は読めない） */
  function drawBomb(p) {
    const el = $("#bBomb"); if (!el) return;
    const vis = Math.min(0.93, p * B.k + Math.sin(p * 17) * 0.02), L = 92 * (1 - vis);
    if (!el.firstChild) el.innerHTML = '<svg viewBox="0 0 200 170" class="bsvg"><defs><radialGradient id="bg1" cx="38%" cy="34%" r="70%"><stop offset="0" stop-color="#6b7591"/><stop offset=".45" stop-color="#2c3350"/><stop offset="1" stop-color="#141a2e"/></radialGradient></defs>' +
      '<ellipse cx="88" cy="158" rx="52" ry="7" fill="rgba(20,30,60,.12)"/>' +
      '<circle cx="88" cy="100" r="54" fill="url(#bg1)"/><ellipse cx="68" cy="78" rx="16" ry="10" fill="rgba(255,255,255,.28)" transform="rotate(-30 68 78)"/>' +
      '<rect x="112" y="40" width="26" height="20" rx="5" fill="#3a4262" transform="rotate(40 125 50)"/>' +
      '<path id="bFuse" d="M132 40 C 150 18, 172 30, 176 10 S 190 -4, 196 6" fill="none" stroke="#c9a36a" stroke-width="5" stroke-linecap="round" pathLength="92"/>' +
      '<g id="bSpark"><circle r="9" fill="#ffd34a" opacity=".55"/><circle r="5" fill="#fff4b0"/><path d="M-11 0h22M0-11v22M-8-8l16 16M8-8l-16 16" stroke="#ffb020" stroke-width="2"/></g></svg>';
    const fu = el.querySelector("#bFuse"), sp = el.querySelector("#bSpark");
    if (!fu || !sp) return;
    fu.style.strokeDasharray = L.toFixed(1) + " 200";
    try { const pt = fu.getPointAtLength(Math.max(0.1, (fu.getTotalLength ? fu.getTotalLength() : 92) * (L / 92))); sp.setAttribute("transform", "translate(" + pt.x.toFixed(1) + "," + pt.y.toFixed(1) + ") scale(" + (0.85 + Math.random() * 0.4).toFixed(2) + ")"); } catch (e) {}
    el.classList.toggle("hot", p > 0.72);
  }
  function bombLoop(now) {
    if (!B.run) return;
    const dt = Math.min(0.25, (now - B.last) / 1000); B.last = now;
    if (!$("#ov").classList.contains("on") && document.visibilityState !== "hidden") B.fuse += dt;
    const p = B.fuse / B.max;
    drawBomb(p); glowPaint(p);
    /* チクタク：だんだん速く（でも少しゆらぐ） */
    B.tickAt -= dt;
    if (B.tickAt <= 0) { sfx("tick"); B.tickAt = Math.max(0.16, 0.6 - 0.36 * p + (Math.random() - 0.5) * 0.08); }
    if (B.fuse >= B.max) { boom(); return; }
    B.raf = requestAnimationFrame(bombLoop);
  }
  function bombAsk() {
    if (!B.run) return;
    const x = Q.pick(G.pool, G.used, { lv: [1, 2], minOpt: 2, maxLen: 140 });
    if (!x) { G.used.clear(); return bombAsk(); }
    G.used.add(x.id); Q.markUsed(x.id);
    Object.assign(B, { x, q: x.q, ord: Q.order(x.q), busy: false });
    const u = G.units[B.holder];
    $("#bHolder").innerHTML = unitBadge(u, "big") + "<span>が答える！</span>";
    $("#bQ").innerHTML = qHTML(x);
    $("#bOpts").innerHTML = optsHTML(B.q, B.ord, { act: "bpick" });
    $("#bFb").hidden = true;
    renderBombTop(); paintIcons($("#bomb"));
    $("#bQ").classList.remove("pop"); void $("#bQ").offsetWidth; $("#bQ").classList.add("pop");
  }
  function bombPick(i) {
    if (!B.run || B.busy) return;
    B.busy = true;
    const u = G.units[B.holder], q = B.q, ok = i === q.a;
    u.n++; if (ok) u.ok++;
    G.log.push({ id: q.id, u: u.k, ok, pick: i, ord: B.ord.slice() });
    $$("#bOpts .opt").forEach((b) => { const k = +b.dataset.i; b.disabled = true; b.classList.add(k === q.a ? "ok" : k === i ? "ng" : "dim"); });
    const fb = $("#bFb");
    fb.hidden = false;
    if (ok) {
      sfx("ok");
      const nx = nextAlive(B.holder);
      fb.className = "bfb ok"; fb.innerHTML = ic("check") + "<b>正解！</b><span>→ " + esc(G.units[nx].name) + " へ！</span>";
      setTimeout(() => { if (!B.run) return; B.holder = nx; sfx("pass"); bombAsk(); }, 750);
    } else {
      sfx("ng");
      fb.className = "bfb ng"; fb.innerHTML = ic("x") + "<b>ざんねん！ もう1問</b>" + (q.k ? '<span class="k">' + Q.fmt(q.k) + "</span>" : "");
      setTimeout(() => { if (!B.run) return; bombAsk(); }, q.k ? 2100 : 1300);
    }
  }
  function boom() {
    glowOn(false);
    B.run = false; cancelAnimationFrame(B.raf);
    const u = G.units[B.holder], q = B.q;
    sfx("boom");
    const sec = $("#bomb"); sec.classList.remove("boom"); void sec.offsetWidth; sec.classList.add("boom");
    u.lives = Math.max(0, u.lives - 1);
    if (u.lives <= 0) { u.out = true; u.outAt = ++G.outN; }
    /* 答えている途中だった問題の答えも出す（学習） */
    if (q && !B.busy) G.log.push({ id: q.id, u: u.k, ok: null, pick: -1, ord: B.ord.slice(), boom: true });
    renderBombTop();
    const left = alive().length;
    const ansL = q ? letterOf(B.ord, q.a) : "";
    setTimeout(() => {
      sheet('<div class="boomv">💥</div><h3 class="sh-t center">ドカーン！</h3><p class="sh-p center">' + unitBadge(u) + " のハートが1つへった" + (u.out ? "…<b>脱落！</b>" : "（のこり " + u.lives + "）") + "</p>" +
        (q && !B.busy ? '<div class="ansbox"><p class="ab-h">いまの問題の答え</p><p class="ab-a"><b>' + ansL + "</b>：" + Q.fmtOpt(q, q.o[q.a]) + "</p>" + (q.k ? '<p class="ab-k">' + Q.fmt(q.k) + "</p>" : "") + "</div>" : "") +
        '<div class="sh-b"><button class="btn pri big" data-a="bnext">' + (left <= 1 ? "結果を見る" : "次のラウンドへ") + "</button></div>", "boomsh");
      UI.onClose = () => { bombAfterBoom(); };
    }, 650);
  }
  function bombAfterBoom() {
    if (!G || G.done) return;
    if (alive().length <= 1) { finish(); return; }
    /* 次のラウンドは、爆発した人から（脱落したら その次の人から） */
    if (G.units[B.holder].out) B.holder = nextAlive(B.holder);
    bombRound();
  }

  /* ══════════════════════════════════════════════════════════════
     ⑥ 結果・見直し
     ══════════════════════════════════════════════════════════════ */
  function ranked() {
    const us = G.units.slice();
    if (G.mode === "mil") {
      us.sort((a, b) => b.score - a.score || b.ok - a.ok);
      us.forEach((u, i) => { u.rank = i && us[i - 1].score === u.score && us[i - 1].ok === u.ok ? us[i - 1].rank : i + 1; });
    } else {
      us.sort((a, b) => (a.out === b.out ? (a.out ? b.outAt - a.outAt : b.lives - a.lives || b.ok - a.ok) : a.out ? 1 : -1));
      us.forEach((u, i) => { u.rank = i + 1; });
    }
    return us;
  }
  function finish() {
    if (!G || G.done) return;
    G.done = true; stopTimer(); B.run = false; cancelAnimationFrame(B.raf);
    const us = ranked();
    show("result");
    sfx("win"); confetti(120);
    const scoreTx = (u) => G.mode === "mil" ? fmtN(u.score) + " pt" : u.out ? u.outAt + "番目に脱落" : "のこり ♥" + u.lives;
    const top = us.slice(0, 3);
    const podOrder = top.length >= 3 ? [top[1], top[0], top[2]] : top.length === 2 ? [top[1], top[0]] : [top[0]];
    $("#podium").innerHTML = podOrder.map((u) => {
      const m = u.members[0], av = !G.team && m.link ? avatarHTML(m.link, u.color, "pod") : '<span class="pmk" style="--c:' + u.color + '">' + ic(G.team ? "team" : "solo") + "</span>";
      return '<div class="pd r' + u.rank + '" style="--c:' + u.color + '"><div class="pd-a">' + (u.rank === 1 ? '<span class="pd-cr">' + ic("crown") + "</span>" : "") + av + "</div><b>" + esc(u.name) + "</b><small>" + scoreTx(u) + '</small><div class="pd-b"><span>' + u.rank + "</span></div></div>";
    }).join("");
    $("#resultList").innerHTML = '<div class="rlist">' + us.map((u) => '<div class="rr" style="--c:' + u.color + '"><span class="rk">' + u.rank + "</span>" + unitBadge(u) +
      '<span class="rs">' + scoreTx(u) + '</span><span class="ra">正解 ' + u.ok + "/" + u.n + "</span>" + (G.team ? '<small class="rm">' + esc(unitNames(u)) + "</small>" : "") + "</div>").join("") + "</div>";
    const wrong = G.log.filter((l) => l.ok !== true).length;
    $("#btnReviewTx").textContent = "見直す（" + (wrong || G.log.length) + "問）";
    $("#resultMeta").innerHTML = '<p class="rmeta">' + ic("link") + "賞金を確認しています…</p>";
    paintIcons($("#result"));
    /* 戦績・賞金（紐づけた人だけ・順位そのまま） */
    if (!G.reported) {
      G.reported = true;
      const rows = [];
      us.forEach((u) => u.members.forEach((m) => rows.push({ uid: m.link ? m.link.uid : null, name: m.link ? m.link.name : m.name, rank: u.rank, ok: u.ok, n: u.n, pt: G.mode === "mil" ? u.score : 0 })));
      const anyLink = rows.some((r) => r.uid);
      A.report(rows).then((res) => {
        const pz = (res && res.prizes) || [];
        $("#resultMeta").innerHTML = pz.length ? '<div class="prz"><p>' + ic("trophy") + "賞金を受け取りました</p>" + pz.map((p) => "<span>" + p.rank + "位 " + esc(p.name) + " <b>+" + fmtN(p.amount) + " XEVA</b></span>").join("") + "</div>"
          : '<p class="rmeta">' + (anyLink ? (navigator.onLine === false ? "オフラインのため賞金は受け取れませんでした" : "賞金の対象（5位まで）はいませんでした") : "🔗 準備の画面で XEVARION アカウントを紐づけると、順位に応じた XEVA（1位 250〜5位 50）を受け取れます") + "</p>";
        paintIcons($("#resultMeta"));
      });
    }
  }
  function openReview(all) {
    if (!G) return;
    const list = G.log.filter((l) => all || l.ok !== true);
    const D = window.MCL_DATA, byId = (D && D.BY) || {};
    const rows = list.map((l) => {
      const q = byId[l.id]; if (!q) return "";
      const u = G.units.find((x) => x.k === l.u), ansL = letterOf(l.ord, q.a), pk = l.pick >= 0 ? letterOf(l.ord, l.pick) : "";
      const st = l.ok === true ? '<span class="rv-st ok">' + ic("check") + "正解</span>" : l.drop ? '<span class="rv-st">やめた問題</span>' : l.boom ? '<span class="rv-st ng">爆発</span>' : l.timeout ? '<span class="rv-st ng">時間切れ</span>' : '<span class="rv-st ng">' + ic("x") + "まちがい</span>";
      return '<div class="rv">' + '<div class="rv-h">' + st + (u ? unitBadge(u, "sm") : "") + "</div>" + (q.ctx ? '<div class="qctx">' + Q.fmt(q.ctx) + "</div>" : "") + '<div class="qtx">' + Q.fmt(q.q) + "</div>" +
        '<div class="rv-o">' + l.ord.map((i, k) => '<span class="' + (i === q.a ? "ok" : i === l.pick ? "ng" : "") + '"><i style="--oc:' + OPT_C[k] + '">' + LET[k] + "</i><em>" + Q.fmtOpt(q, q.o[i]) + "</em></span>").join("") + "</div>" +
        (pk && l.ok === false ? '<p class="rv-p">えらんだ答え：<b>' + pk + "</b>／正解：<b>" + ansL + "</b></p>" : "") +
        (q.s ? '<details class="rv-s"><summary>' + ic("book") + "解説</summary><div>" + Q.fmt(q.s) + "</div></details>" : "") +
        (q.k ? '<p class="rv-k"><span>ポイント</span>' + Q.fmt(q.k) + "</p>" : "") + "</div>";
    }).join("");
    sheet('<h3 class="sh-t">' + ic("book") + (all ? "出た問題（全" + list.length + "問）" : "まちがえた問題（" + list.length + "問）") + "</h3>" +
      '<div class="seg sm rvseg"><button class="' + (all ? "" : "on") + '" data-a="reviewMode" data-v="0">まちがえた問題</button><button class="' + (all ? "on" : "") + '" data-a="reviewMode" data-v="1">ぜんぶ</button></div>' +
      (rows || '<p class="sh-p center">' + (all ? "まだ問題が出ていません" : "まちがえた問題はありません 🎉") + "</p>") +
      '<p class="sh-note">もっとくわしく練習したいときは MagiChemLex の「基礎セット」で。</p><div class="sh-b"><button class="btn pri" data-a="close">とじる</button></div>', "review");
  }

  /* ══ 戦績・ルール・メニュー ══ */
  function openStats() {
    show("stats");
    const st = A.stats(), rows = Object.keys(st).map((k) => Object.assign({ id: k }, st[k])).sort((a, b) => b.wins - a.wins || b.games - a.games);
    $("#statList").innerHTML = rows.length ? '<div class="stl">' + rows.map((r) => '<div class="str"><b>' + esc(r.name) + (/^local:/.test(r.id) ? "" : ' <span class="lk">🔗</span>') + "</b>" +
      "<span>" + r.games + "試合</span><span>優勝 <b>" + r.wins + "</b></span><span>正答率 <b>" + (r.n ? Math.round(r.ok / r.n * 100) : 0) + "%</b></span><span>ミリオネア最高 <b>" + fmtN(r.best || 0) + "</b> pt</span></div>").join("") + "</div>"
      : '<p class="empty">まだ戦績がありません。遊ぶとここにたまります。</p>';
  }
  function openRules() {
    sheet('<h3 class="sh-t">' + ic("book") + "ルール</h3>" +
      '<div class="rul"><h4>' + ic("crown") + "ミリオネア</h4><ul>" +
      "<li>1人（チーム戦は1チーム）ずつ、<b>10問のはしご</b>に挑戦します。正解するたびに pt が上がります（100 → … → <b>32,000 pt</b>）。</li>" +
      "<li>答えをえらんで「<b>決定</b>」を押すと、すぐに正解を発表します。</li>" +
      "<li>まちがえると<b>安全ライン</b>（3問目 300 pt・7問目 4,000 pt）まで落ちて、次の人の番へ。</li>" +
      "<li>2問目からは「<b>ここでやめる</b>」で、いまの pt のまま終われます。</li>" +
      "<li>ライフライン（1回ずつ）：<b>50:50</b>（選択肢を2つに）／<b>ヒント</b>／<b>みんなに聞く</b>（まわりの人がタップで投票）。</li>" +
      "<li>みんなが挑戦したら、pt の高い順に順位がつきます。</li></ul>" +
      "<h4>" + ic("bomb") + "ばくだん</h4><ul>" +
      "<li>爆弾を持っている人（チーム）が問題に答えます。<b>正解したら となりへ</b>、まちがえたら<b>もう1問</b>（そのあいだも時間は進みます）。</li>" +
      "<li>爆発までの時間はラウンドごとに変わり、だれにも分かりません。</li>" +
      "<li>爆発したときに持っていた人は<b>ハートが1つへります</b>。0 になったら脱落。最後まで残った人の勝ち。</li></ul>" +
      "<h4>" + ic("team") + "チーム戦</h4><ul><li>準備の画面で全員の名前を入れて「はじめる」を押すと、<b>チームを抽選</b>で分けます（2〜4チーム・人数はなるべく同じに）。気に入らなければ「もう一度抽選」。チームで相談して答えます。</li></ul>" +
      "<h4>" + ic("link") + "紐づけ・ごほうび</h4><ul><li>🔗 で XEVARION アカウントを紐づけると、順位に応じて <b>1位 250・2位 200・3位 150・4位 100・5位 50 XEVA</b>（チーム戦はチームの順位をメンバー全員に）。</li>" +
      "<li>問題は MagiChemLex の基礎セットの選択問題です。答えるたびに正解とポイントが出て、試合のあとに<b>まちがえた問題を解説つきで見直せます</b>。</li></ul></div>" +
      '<div class="sh-b"><button class="btn pri" data-a="close">とじる</button></div>', "rules");
  }
  function openMenu() {
    if (G && G.mode === "mil") M.paused = true;
    UI.onClose = () => { M.paused = false; };
    sheet('<h3 class="sh-t">' + ic("menu") + "メニュー</h3>" +
      '<div class="mnu"><button class="btn" data-a="rules">' + ic("book") + "ルール</button>" +
      '<button class="btn" data-a="se">' + ic(opt.se ? "seon" : "seoff") + "効果音：" + (opt.se ? "オン" : "オフ") + "</button>" +
      '<button class="btn danger" data-a="quit">' + ic("home") + "試合をやめてタイトルへ</button></div>" +
      '<div class="sh-b"><button class="btn pri" data-a="close">つづける</button></div>');
  }

  /* ══ data-a の表 ══ */
  const ACT = {
    start: () => { sfx("tap"); openSetup(); },
    title: () => { closeSheet(); stopTimer(); B.run = false; cancelAnimationFrame(B.raf); openTitle(); },
    rules: () => openRules(),
    stats: () => openStats(),
    se: () => { opt.se = !opt.se; saveOpt(); paintSe(); if ($("#ov").classList.contains("on") && $("#sheet .mnu")) { UI.onClose = null; closeSheet(); openMenu(); } sfx("tap"); },
    close: () => closeSheet(),
    setMode: (el) => { setup.mode = el.dataset.v; renderSetup(); saveSetup(); sfx("tap"); },
    setTeam: (el) => { setup.team = el.dataset.v === "1"; if (setup.team && setup.n < 2) setup.n = 2; renderSetup(); saveSetup(); sfx("tap"); },
    /* チームの数を変えたら、席の順に均等に分けなおす（あとから札を押して入れかえられる） */
    setTeams: (el) => { setup.nTeams = +el.dataset.v; setup.all.forEach((p, i) => { p.team = i % setup.nTeams; }); renderSetup(); saveSetup(); sfx("tap"); },
    setN: (el) => { setup.n = +el.dataset.v; renderSetup(); saveSetup(); sfx("tap"); },
    pteam: (el) => { const p = setup.all[+el.dataset.i]; p.team = (Math.min(p.team, setup.nTeams - 1) + 1) % setup.nTeams; renderSetup(); saveSetup(); sfx("tap"); },
    chip: (el) => {
      const k = el.dataset.k, v = k === "sets" ? +el.dataset.v : el.dataset.v, a = setup[k], i = a.indexOf(v);
      if (i >= 0) { if (a.length <= 1) { toast("1つ以上えらんでください"); return; } a.splice(i, 1); } else a.push(v);
      renderSetup(); saveSetup(); sfx("tap");
    },
    setOpt: (el) => { const k = el.dataset.k, v = el.dataset.v; setup[k] = /^\d+$/.test(v) ? +v : v; renderSetup(); saveSetup(); sfx("tap"); },
    seatlink: (el) => seatLink(+el.dataset.i),
    begin: () => begin(),
    /* ★★ 2026-10-24 チーム抽選 */
    tdGo: () => { closeSheet(); beginGo(); },
    tdAgain: () => teamDraw(),
    turnGo: () => { const f = UI.turnGo; UI.turnGo = null; if (f) f(); },
    gmenu: () => openMenu(),
    quit: () => { UI.onClose = null; closeSheet(); stopTimer(); B.run = false; cancelAnimationFrame(B.raf); G = null; openTitle(); },
    mpick: (el) => milPick(+el.dataset.i),
    munsel: () => { if (M.phase === "q") { M.sel = -1; renderMil(); } },
    mfinal: () => milFinal(),
    mnext: () => { sfx("tap"); milAfter(); },
    mlife: (el) => milLife(el.dataset.v),
    mdrop: () => milDrop(),
    mdropYes: () => milDropYes(),
    vote: (el) => { const i = +el.dataset.i; M.votes[i] = (M.votes[i] || 0) + 1; sfx("tap"); const n = el.querySelector(".vn"); if (n) n.textContent = M.votes[i]; el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); },
    voteRes: () => { sfx("life"); UI.voteDraw(true); },
    bgo: () => { sfx("tap"); bombGo(); },
    bpick: (el) => bombPick(+el.dataset.i),
    bnext: () => closeSheet(),
    again: () => { sfx("tap"); begin(); },
    review: () => openReview(false),
    reviewMode: (el) => { UI.onClose = null; openReview(el.dataset.v === "1"); },
  };
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-a]");
    if (el && !el.disabled) { const f = ACT[el.dataset.a]; if (f) { e.preventDefault(); f(el); } return; }
    if (e.target === $("#ov")) { const sh = $("#sheet"); if (!sh.classList.contains("boomsh")) closeSheet(); }
  });
  document.addEventListener("keydown", (e) => {
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    const k = e.key.toUpperCase(), idx = LET.indexOf(k);
    if (document.body.dataset.scr === "mil" && !$("#ov").classList.contains("on")) {
      if (idx >= 0 && M.phase === "q" && M.ord[idx] != null) milPick(M.ord[idx]);
      else if (e.key === "Enter" && M.phase === "q" && M.sel >= 0) milFinal();
      else if (e.key === "Enter" && M.phase === "reveal") milAfter();
    } else if (document.body.dataset.scr === "bomb" && !$("#ov").classList.contains("on")) {
      if (idx >= 0 && B.ord[idx] != null) bombPick(B.ord[idx]);
    }
  });

  /* ══ はじめ ══ */
  paintIcons(document);
  loadSetup();
  openTitle();
})();
