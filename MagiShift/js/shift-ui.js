/* ============================================================
   MagiShift — 画面（2026-09-21 新作）
   ------------------------------------------------------------
   1台の iPad をみんなで囲んで遊ぶ。画面は5つだけ。
     タイトル → 人数えらび → プレイヤー登録 → 対戦 → 結果
   ・いま誰の番かを<b>いつも大きく</b>出す。できること（置く／動かす）も文字で出す。
   ・自分以外の駒は押しても反応しない（1台を回して使うので、まちがい操作を防ぐ）。
   ・ルールは shift-core.js、アカウントは shift-account.js。ここは見た目だけ。
   ============================================================ */
(function () {
  "use strict";
  const G = window.MShift;
  const $ = (q, el) => (el || document).querySelector(q);
  const $$ = (q, el) => Array.from((el || document).querySelectorAll(q));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  let S = null;                 /* いまの試合 */
  let setup = { n: 4, players: [] };
  let opt = { size: 0, win: 0, pieces: 0, se: true, bgm: false };
  const OPT_KEY = "magishift_opt_v1";
  try { opt = Object.assign(opt, JSON.parse(localStorage.getItem(OPT_KEY) || "{}")); } catch (e) {}
  const saveOpt = () => { try { localStorage.setItem(OPT_KEY, JSON.stringify(opt)); } catch (e) {} };

  /* ══ 駒の印（色だけに頼らない） ══ */
  const MARK = {
    circle: '<circle cx="12" cy="12" r="6.4"/>',
    cross: '<path d="M7.5 7.5l9 9M16.5 7.5l-9 9"/>',
    triangle: '<path d="M12 6l6 11H6z"/>',
    square: '<rect x="6.6" y="6.6" width="10.8" height="10.8" rx="1.6"/>',
    star: '<path d="M12 5.6l2 4.3 4.7.6-3.4 3.3.8 4.6L12 16.2 7.9 18.4l.8-4.6-3.4-3.3 4.7-.6z"/>',
    hex: '<path d="M12 5.4l5.6 3.3v6.6L12 18.6l-5.6-3.3V8.7z"/>',
  };
  const pieceSVG = (p, cls) => '<svg class="pc ' + (cls || "") + '" viewBox="0 0 24 24" style="--pc:' + p.color + '">' +
    '<circle class="bg" cx="12" cy="12" r="10.4"/><g class="mk">' + (MARK[p.mark] || MARK.circle) + "</g></svg>";
  const avatarHTML = (p) => {
    const a = G.Account.avatar(p);
    return a ? '<img class="av" src="' + esc(a) + '" alt="">' : '<span class="av ph">' + esc((p.name || "P")[0]) + "</span>";
  };

  /* ══ 音（短く・軽く） ══ */
  let AC = null;
  function beep(kind) {
    if (!opt.se) return;
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      const o = AC.createOscillator(), g = AC.createGain();
      const f = { put: 520, move: 660, win: 880, no: 180 }[kind] || 440;
      o.type = kind === "no" ? "square" : "sine";
      o.frequency.setValueAtTime(f, AC.currentTime);
      if (kind === "win") { o.frequency.setValueAtTime(660, AC.currentTime); o.frequency.linearRampToValueAtTime(1320, AC.currentTime + .28); }
      g.gain.setValueAtTime(.001, AC.currentTime);
      g.gain.exponentialRampToValueAtTime(.16, AC.currentTime + .01);
      g.gain.exponentialRampToValueAtTime(.001, AC.currentTime + (kind === "win" ? .45 : .16));
      o.connect(g); g.connect(AC.destination); o.start(); o.stop(AC.currentTime + (kind === "win" ? .5 : .2));
    } catch (e) {}
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
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      if (AC.state === "suspended") AC.resume();
      const gain = AC.createGain();
      gain.gain.setValueAtTime(.0001, AC.currentTime);
      gain.gain.linearRampToValueAtTime(.05, AC.currentTime + 1.2);
      gain.connect(AC.destination);
      const oscs = BG_CHORD[0].map((f) => {
        const o = AC.createOscillator(); o.type = "triangle";
        o.frequency.setValueAtTime(f, AC.currentTime); o.connect(gain); o.start(); return o;
      });
      let i = 0;
      const timer = setInterval(() => {
        i = (i + 1) % BG_CHORD.length;
        oscs.forEach((o, k) => o.frequency.linearRampToValueAtTime(BG_CHORD[i][k], AC.currentTime + 1.6));
      }, 3200);
      BG = { gain: gain, oscs: oscs, timer: timer };
    } catch (e) { BG = null; }
  }

  function toast(t) { const el = $("#toast"); el.textContent = t; el.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => { el.hidden = true; }, 1800); }
  function show(id) {
    $$(".scr").forEach((s) => s.classList.toggle("on", s.id === id));
    window.scrollTo(0, 0);
    /* BGM は対戦中だけ。ほかの画面では止める。 */
    if (id === "game" && opt.bgm) bgmStart(); else bgmStop();
  }

  /* ══ ① タイトル ══ */
  function renderTitle() {
    const saved = G.load();
    $("#btnCont").hidden = !(saved && saved.S && saved.S.phase === "play");
    show("title");
  }

  /* ══ ② 人数えらび ══ */
  function renderCount() {
    const box = $("#counts");
    box.innerHTML = [2, 3, 4, 5, 6].map((n) => {
      const r = G.RULES[n];
      return '<button class="cnt" data-a="count" data-n="' + n + '" style="--c:' + G.COLORS[n - 2].color + '">' +
        '<span class="ppl">' + Array.from({ length: Math.min(n, 3) }, () => "👤").join("") + "</span>" +
        '<b>' + n + "人</b><small>" + r.size + "×" + r.size + "・" + r.win + "つ並べ<br>駒 " + r.pieces + "個</small></button>";
    }).join("");
    show("count");
  }

  /* ══ ③ プレイヤー登録（XEVARION と紐づけ） ══ */
  function startSetup(n) {
    setup.n = n;
    setup.players = Array.from({ length: n }, (_, i) => ({ name: "Player " + (i + 1), uid: "", charFile: "" }));
    const me = G.Account.portalAccount();
    if (me) setup.players[0] = Object.assign({}, me);      /* 1人目はこの端末の人を初期値に */
    renderSetup();
  }
  function renderSetup() {
    const r = G.RULES[setup.n];
    $("#setupSub").textContent = setup.n + "人 ／ " + (opt.size || r.size) + "×" + (opt.size || r.size) +
      " ／ " + (opt.win || r.win) + "つ並べて勝ち ／ 1人 " + (opt.pieces || r.pieces) + "個まで";
    $("#plist").innerHTML = setup.players.map((p, i) => {
      const c = G.COLORS[i];
      return '<div class="prow" style="--c:' + c.color + '">' + pieceSVG(c) +
        '<span class="pinfo">' + avatarHTML(p) + '<span class="pn"><b>Player ' + (i + 1) + "</b><small>" + esc(p.name) + "</small></span></span>" +
        '<button class="btn sm" data-a="link" data-i="' + i + '">' + (p.uid ? "変更" : "XEVARIONで選択") + "</button>" +
        (p.uid ? '<button class="btn sm ghost" data-a="unlink" data-i="' + i + '">外す</button>' : "") + "</div>";
    }).join("");
    show("setup");
  }
  async function linkPlayer(i) {
    const acc = await G.Account.pick(setup.players[i]);
    if (!acc) return;
    if (acc.remove) { setup.players[i] = { name: "Player " + (i + 1), uid: "", charFile: "" }; renderSetup(); return; }
    if (setup.players.some((p, j) => j !== i && p.uid === acc.uid)) { toast("そのアカウントはもう使われています"); return; }
    setup.players[i] = acc;
    renderSetup();
    toast("🔗 " + acc.name + " を登録しました");
  }

  /* ══ ④ 対戦 ══ */
  function begin() {
    S = G.newGame(setup.players.map((p) => ({ uid: p.uid || "", name: p.name, charFile: p.charFile || "", charId: p.charId || "" })),
      { size: opt.size || 0, win: opt.win || 0, pieces: opt.pieces || 0 });
    G.save(S);
    renderGame(true);
    show("game");
  }
  function resume() {
    const d = G.load();
    if (!d || !d.S) return;
    S = d.S;
    renderGame(true);
    show("game");
  }
  function renderGame(full) {
    if (!S) return;
    $("#gmeta").textContent = S.players.length + "人 / " + S.size + "×" + S.size + " / " + S.win + "つ並べて勝ち";
    $("#gplayers").innerHTML = S.players.map((p) => {
      const on = p.slot === S.turn && S.phase === "play";
      return '<div class="pcard' + (on ? " on" : "") + '" style="--c:' + p.color + '">' + pieceSVG(p) +
        '<span class="pn"><b>Player ' + (p.slot + 1) + "</b><small>" + esc(p.name) + "</small></span>" +
        (on ? '<span class="youturn">あなたのターン</span>' : "") +
        '<span class="cnt2' + (G.outOfPieces(S, p.slot) ? " out" : "") + '">' + G.countOf(S, p.slot) +
        (S.maxPieces ? "/" + S.maxPieces : "") + "個</span></div>";
    }).join("");
    if (full) buildBoard();
    paintBoard();
    paintTurn();
    G.save(S);
  }
  function buildBoard() {
    const b = $("#board");
    b.style.setProperty("--n", S.size);
    b.innerHTML = Array.from({ length: S.size * S.size }, (_, i) =>
      '<button class="cell" data-a="cell" data-x="' + (i % S.size) + '" data-y="' + Math.floor(i / S.size) + '"></button>').join("");
  }
  function paintBoard() {
    const cells = $$("#board .cell");
    const sel = S.sel;
    const moves = sel ? G.movesOf(S, sel.x, sel.y) : [];
    cells.forEach((el) => {
      const x = +el.dataset.x, y = +el.dataset.y, v = G.at(S, x, y);
      const p = v >= 0 ? S.players[v] : null;
      el.innerHTML = p ? pieceSVG(p, "on-board") : "";
      el.classList.toggle("mine", !!p && v === S.turn && S.phase === "play");
      el.classList.toggle("sel", !!sel && sel.x === x && sel.y === y);
      el.classList.toggle("cand", moves.some((m) => m.x === x && m.y === y));
      el.classList.toggle("win", !!(S.line && S.line.some((c) => c.x === x && c.y === y)));
      el.disabled = S.phase !== "play";
    });
  }
  function paintTurn() {
    const p = G.cur(S);
    const t = $("#turnbar");
    if (S.phase !== "play") { t.innerHTML = ""; return; }
    t.innerHTML = '<span class="tp" style="--c:' + p.color + '">' + pieceSVG(p) + "<b>Player " + (p.slot + 1) + "</b><small>" + esc(p.name) + "</small></span>" +
      '<span class="thint">' + (S.sel ? "移動先の光っているマスを押してください"
        : G.outOfPieces(S, p.slot) ? "駒を使いきりました。<b>自分の駒を押して動かします</b>"
        : "空いているマスを押すと<b>置く</b>／自分の駒を押すと<b>動かす</b>" +
          (G.leftOf(S, p.slot) != null ? '<span class="left">あと ' + G.leftOf(S, p.slot) + " 個おけます</span>" : "")) + "</span>" +
      (S.sel ? '<button class="btn sm" data-a="cancel">キャンセル</button>' : "");
  }

  function onCell(x, y) {
    if (!S || S.phase !== "play") return;
    if (S.sel) {
      if (S.sel.x === x && S.sel.y === y) { S.sel = null; renderGame(); return; }      /* もう一度押すと取り消し */
      if (G.canMove(S, S.sel.x, S.sel.y, x, y)) {
        const from = S.sel;
        const res = G.move(S, from.x, from.y, x, y);
        beep("move");
        animate(from, { x, y });
        after(res, "移動しました！");
        return;
      }
      if (G.canPick(S, x, y)) { S.sel = { x, y }; renderGame(); return; }
      beep("no"); toast("そこへは動かせません"); return;
    }
    if (G.canPick(S, x, y)) {
      const ms = G.movesOf(S, x, y);
      if (!ms.length) { beep("no"); toast("この駒は動けません"); return; }
      S.sel = { x, y }; renderGame(); return;
    }
    if (G.at(S, x, y) >= 0) { beep("no"); toast("ほかの人の駒は動かせません"); return; }
    if (!G.canPlace(S, x, y)) {
      beep("no");
      if (G.outOfPieces(S, S.turn)) toast("駒を使いきりました。自分の駒を押して動かしてください");
      return;
    }
    const res = G.place(S, x, y);
    beep("put");
    after(res, "置きました！");
  }
  function after(res, msg) {
    renderGame();
    if (res && res.win) { setTimeout(() => winScreen(), 650); beep("win"); return; }
    if (G.stuck(S)) { toast("置く場所も動かせる駒もありません。次の人へ"); G.pass(S); renderGame(); return; }
    toast(msg);
  }
  /* 駒が動いたことが分かるように、小さく動かして見せる */
  function animate(from, to) {
    const b = $("#board");
    const a = b.querySelector('.cell[data-x="' + to.x + '"][data-y="' + to.y + '"]');
    if (!a) return;
    const f = b.querySelector('.cell[data-x="' + from.x + '"][data-y="' + from.y + '"]');
    if (!f) return;
    const r1 = f.getBoundingClientRect(), r2 = a.getBoundingClientRect();
    a.style.setProperty("--dx", (r1.left - r2.left) + "px");
    a.style.setProperty("--dy", (r1.top - r2.top) + "px");
    a.classList.add("moved");
    setTimeout(() => a.classList.remove("moved"), 320);
  }

  /* ══ ⑤ 勝利と結果 ══ */
  async function winScreen() {
    const w = S.players[S.winner];
    $("#winbox").innerHTML = '<div class="crown">👑</div><div class="winttl">WIN!</div>' +
      '<div class="winp" style="--c:' + w.color + '">' + avatarHTML(w) + pieceSVG(w) + "</div>" +
      "<h2>Player " + (w.slot + 1) + "（" + esc(w.name) + "）</h2><p>" + (w.uid ? "" : "") + "おめでとうございます！</p>" +
      '<div class="wbtns"><button class="btn pri" data-a="again">もう一度遊ぶ</button><button class="btn" data-a="result">結果を見る</button></div>';
    show("win");
    /* 結果を XEVARION へ（紐づけた人には順位に応じた XEVA） */
    const st = G.standings(S);
    const rep = await G.Account.report(S, st).catch(() => ({ prizes: [] }));
    if (rep && rep.prizes && rep.prizes.length) {
      toast("🎁 " + rep.prizes.map((p) => p.rank + "位 " + p.name + " +" + p.amount + " XEVA").join(" / "));
    }
  }
  function resultScreen() {
    const st = G.standings(S);
    const sec = Math.max(1, Math.round(((S.endedAt || Date.now()) - S.startedAt) / 1000));
    $("#resultList").innerHTML = st.map((p) => '<div class="rrow' + (p.rank === 1 ? " top" : "") + '" style="--c:' + p.color + '">' +
      '<span class="rk">' + p.rank + "位</span>" + pieceSVG(p) + avatarHTML(p) +
      '<span class="pn"><b>Player ' + (p.slot + 1) + "</b><small>" + esc(p.name) + "</small></span>" +
      '<span class="rw">' + (p.rank === 1 ? "勝ち" : "—") + "</span><span class=\"rl\">最長 " + p.line + "</span></div>").join("");
    $("#resultMeta").innerHTML = "<div><small>対戦人数</small><b>" + S.players.length + "人</b></div>" +
      "<div><small>盤面サイズ</small><b>" + S.size + "×" + S.size + "</b></div>" +
      "<div><small>勝利条件</small><b>" + S.win + "つ並べ</b></div>" +
      "<div><small>プレイ時間</small><b>" + Math.floor(sec / 60) + "分" + (sec % 60) + "秒</b></div>";
    show("result");
  }

  /* ══ 設定・ルール ══ */
  function renderSettings() {
    const r = G.RULES[setup.n] || G.RULES[4];
    $("#setSize").innerHTML = [5, 6, 7, 8, 9].map((n) => '<button class="chip' + ((opt.size || r.size) === n ? " on" : "") + '" data-a="setsize" data-v="' + n + '">' + n + "×" + n + "</button>").join("");
    $("#setWin").innerHTML = [3, 4, 5, 6].map((n) => '<button class="chip' + ((opt.win || r.win) === n ? " on" : "") + '" data-a="setwin" data-v="' + n + '">' + n + "つ</button>").join("");
    const pb = $("#setPieces");
    if (pb) pb.innerHTML = [0, 5, 6, 7, 8, 10, 99].map((n) => '<button class="chip' + ((opt.pieces || 0) === n ? " on" : "") + '" data-a="setpieces" data-v="' + n + '">' + (n === 99 ? "上限なし" : n ? n + "個" : "人数どおり") + "</button>").join("") +
      '<span class="note" style="width:100%;margin-top:6px">いまの人数の初期値は <b>' + r.pieces + "個</b>です。</span>";
    $("#setSe").checked = !!opt.se;
    $("#setBgm").checked = !!opt.bgm;
    show("settings");
  }
  function statsScreen() {
    const st = G.Account.stats();
    const rows = Object.keys(st).map((k) => st[k]).sort((a, b) => b.wins - a.wins || b.games - a.games);
    $("#statList").innerHTML = rows.length ? rows.map((r) => '<div class="rrow"><span class="pn"><b>' + esc(r.name) + "</b><small>" + r.games + "戦 " + r.wins + "勝</small></span>" +
      '<span class="rl">最高 ' + (r.best < 99 ? r.best + "位" : "—") + "</span></div>").join("") : '<p class="note">まだ記録がありません。</p>';
    show("stats");
  }

  /* ══ 操作 ══ */
  const ACT = {
    start: () => renderCount(),
    count: (b) => { setup.n = +b.dataset.n; startSetup(setup.n); },
    link: (b) => linkPlayer(+b.dataset.i),
    unlink: (b) => { const i = +b.dataset.i; setup.players[i] = { name: "Player " + (i + 1), uid: "", charFile: "" }; renderSetup(); },
    begin: () => begin(),
    cont: () => resume(),
    cell: (b) => onCell(+b.dataset.x, +b.dataset.y),
    cancel: () => { S.sel = null; renderGame(); },
    again: () => { setup.players = S.players.map((p) => ({ name: p.name, uid: p.uid, charFile: p.charFile, charId: p.charId })); setup.n = S.players.length; begin(); },
    result: () => resultScreen(),
    menu: () => { G.clear(); renderTitle(); },
    settings: () => renderSettings(),
    stats: () => statsScreen(),
    rules: () => show("rules"),
    title: () => renderTitle(),
    setsize: (b) => { opt.size = +b.dataset.v; saveOpt(); renderSettings(); },
    setwin: (b) => { opt.win = +b.dataset.v; saveOpt(); renderSettings(); },
    setpieces: (b) => { opt.pieces = +b.dataset.v; saveOpt(); renderSettings(); },
    /* ★★ 2026-09-21 ご指定：アカウントを紐づけなくても遊べる。
       もともと紐づけなしでも「ゲーム開始」は押せるが、分かりにくいので入口を用意した。 */
    noacc: () => {
      setup.players = setup.players.map((p, i) => ({ name: "Player " + (i + 1), uid: "", charFile: "" }));
      renderSetup();
      toast("アカウントを使わずに始めます");
    },
    setreset: () => { opt = { size: 0, win: 0, pieces: 0, se: true, bgm: false }; saveOpt(); bgmStop(); renderSettings(); toast("初期設定に戻しました"); },
    gmenu: () => {
      $("#ov").classList.add("on");
      $("#sheet").innerHTML = "<h2>メニュー</h2><p>いまの試合はいつでも<b>セーブして中断</b>できます。つづきはタイトルの「つづきから」で始められます。</p>" +
        '<div class="wbtns"><button class="btn" data-a="closeSheet">つづける</button>' +
        '<button class="btn pri" data-a="saveQuit">セーブして中断</button>' +
        '<button class="btn" data-a="settings">設定</button>' +
        '<button class="btn ghost" data-a="giveup">セーブせずにやめる</button></div>';
    },
    /* ★★ 2026-09-21 ご指定：途中でセーブして、あとからつづきを遊べるようにした。
       盤面・手番・並び・駒の数はぜんぶ S に入っているので、S をそのまま保存すれば足りる。 */
    saveQuit: () => {
      if (!S) { renderTitle(); return; }
      G.save(S);
      toast("💾 セーブしました。タイトルの「つづきから」でつづけられます");
      renderTitle();
    },
    /* ★ confirm() が出ない環境があるので（MagiLex・MagiTier で踏んだ）、確認は画面の中で聞く */
    giveup: () => {
      $("#ov").classList.add("on");
      $("#sheet").innerHTML = "<h2>この試合をやめますか？</h2><p>セーブも消えるので、つづきからは遊べなくなります。</p>" +
        '<div class="wbtns"><button class="btn" data-a="gmenu">もどる</button><button class="btn ghost" data-a="menu">やめる（セーブを消す）</button></div>';
    },
    closeSheet: () => $("#ov").classList.remove("on"),
  };
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-a]");
    if (!b) return;
    const f = ACT[b.dataset.a];
    if (!f) return;
    e.preventDefault();
    if (b.dataset.a !== "cell") $("#ov").classList.remove("on");
    f(b);
  });
  document.addEventListener("change", (e) => {
    if (e.target.id === "setSe") { opt.se = e.target.checked; saveOpt(); }
    if (e.target.id === "setBgm") { opt.bgm = e.target.checked; saveOpt(); if (!opt.bgm) bgmStop(); }
  });
  /* iPhone のアプリ表示では文書のスクロールを 0 に留める（中身は各画面がスクロールする） */
  window.addEventListener("scroll", () => { if (window.scrollY && document.documentElement.classList.contains("xv-full")) window.scrollTo(0, 0); }, { passive: true });

  renderTitle();
  window.MShiftUI = { render: renderGame, state: () => S };
})();
