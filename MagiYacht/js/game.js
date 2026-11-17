/* ============================================================
   MagiYacht — ゲームの進行（番・スコア表・CPU・途中保存・リタイア・結果）
   ★★ 2026-11-18 新作
   ------------------------------------------------------------
   ・1回の番：カップでふる（3回まで）→ キープ → スコア表の欄をえらぶ（もう一度タップか「書く」で決定）→ 次の人。
   ・全員が12の欄をうめたら結果。順位で XEVA（account.js）。
   ・途中保存（ご指定）：止まっているところ（番のはじめ・サイコロが止まった・キープ・書いた・リタイア）でいつも保存
     → magiyacht_game_v1。はじめの画面に「つづきから」。メニューの「あとでつづける」でも。
   ・リタイア（ご指定）：メニューから、だれでもリタイアできる（その人の番はとばす・順位は最後・賞金なし）。
     人が全員リタイアしたら試合は終わり。「この試合をやめる」は保存を消してはじめの画面へ。
   ・CPU：rules.js の cpuMove（よわい・ふつう・つよい）。ふるのは「カップ」を使った同じ物理。
   ・T.tok：番が変わったら +1（古い待ち時間の続きを動かさない）。
   ============================================================ */
(function (root) {
  'use strict';
  const MY = root.MY, R = MY.Rules, D = MY.Dice, AU = MY.Audio, A = MY.Account, U = MY.Setup, HT = MY.Howto;
  const $ = (id) => document.getElementById(id);
  const esc = U.esc, IC = U.IC;
  const KEY = 'magiyacht_game_v1';
  let G = null;
  const T = { sel: null, tok: 0, cpuT: 0, plan: null, dInit: false, res: null, rep: null, bnT: 0, bnRes: null, lastWrite: '' };
  const cur = () => (G ? G.players[G.order[G.ti]] : null);
  const spd = (ms) => (G && G.speed === 'fast' ? ms * 0.45 : ms);
  const sleep = (ms) => new Promise((r) => { T.cpuT = setTimeout(r, ms); });

  /* ══ 保存 ══ */
  function save() { if (!G || G.done) return; G.at = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(G)); } catch (e) { /* 保存できない環境でも遊べる */ } }
  function loadSave() {
    try {
      const g = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (g && g.v === 1 && Array.isArray(g.players) && g.players.length && Array.isArray(g.order) && !g.done) return g;
    } catch (e) { /* こわれていたら無いことに */ }
    return null;
  }
  function dropSave() { try { localStorage.removeItem(KEY); } catch (e) { /* なし */ } }
  function savedInfo() {
    const g = loadSave(); if (!g) return null;
    const p = g.players[g.order[g.ti]] || g.players[0];
    return { round: Math.min(12, R.totals(p.sc).filled + 1), n: g.players.length, cur: p ? p.name : '' };
  }

  /* ══ 見た目の部品 ══ */
  const av = (p, cls) => U.avatar({ name: p.name, color: p.color, img: p.img, cpu: p.cpu }, cls);
  const roundOf = (p) => Math.min(R.ROUNDS, R.totals(p.sc).filled + 1);
  const CAT_IC = { ch: '∑', fk: '4', fh: '3+2', ss: 'S', bs: 'B', ya: '★' };

  /* ══════════════════════════════════════════════════════════════
     はじめる・つづける
     ══════════════════════════════════════════════════════════════ */
  function ensureDice() {
    if (T.dInit) { D.layout(); return; }
    T.dInit = true;
    D.init($('tray'), $('cv'));
    /* ★ ふった回数（G.roll）は「サイコロが止まったとき」に数える。転がっている途中で保存しても、
         回数と目がいつもそろう（途中でとじたら、その1回はなかったことになる）。
         T.throwTok：その投げを始めた番の印。番・試合が変わったあとに届いた「止まった」は使わない */
    D.on('throw', () => {
      if (!G) return;
      T.rolling = true; T.throwTok = T.tok;
      T.sel = null; D.highlight([]); D.hint(false); D.allow({ throw: false, keep: false });
      render();
    });
    D.on('settled', (vals) => {
      if (!G || T.throwTok !== T.tok) return;
      T.rolling = false;
      G.roll++; G.dice = vals.slice(); G.keep = D.keeps(); save();
      if (T.live) afterSettle();
    });
    D.on('keep', (i, on) => { if (!G) return; G.keep[i] = !!on; save(); if (on) AU.keep(); else AU.unkeep(); T.sel = null; D.highlight([]); render(); });
    D.on('hit', (k, s) => AU.hit(k, s));
    D.on('rattle', (I) => AU.rattle(I));
    D.on('grab', () => AU.grab());
    D.on('call', () => { AU.tap(); render(); });
    D.on('cupDown', () => render());
    D.on('inCup', () => AU.hit('die', 0.25));
    D.on('needShake', () => U.toast('カップを押さえたまま、指を左右に動かして<b>ふって</b>から、はなしてね'));
    D.on('noFree', () => U.toast('5個ともキープしています。ふり直すなら、棚のサイコロをタップしてもどしてね'));
    D.on('tapDie', () => {
      const p = cur(); if (!p || p.cpu) return;
      if (G.roll >= 3) U.toast('もうふれません。スコア表の欄をえらんで点を書こう');
      else if (G.roll === 0) U.toast('まずはカップでふろう');
    });
  }
  function showGame() {
    T.live = true; T.rolling = false;
    $('game').classList.add('on');
    document.body.dataset.scr = 'play';
    layoutMode();
    ensureDice();
    if (MY.Bgm) MY.Bgm.scene('play');
  }
  function hideGame() { T.live = false; T.rolling = false; $('game').classList.remove('on'); $('result').classList.add('hidden'); }

  function start(players, opt) {
    opt = opt || {};
    T.tok++; clearTimeout(T.cpuT); T.sel = null; T.plan = null; T.rep = null;
    G = {
      v: 1, id: 'y' + Date.now().toString(36), at: Date.now(), speed: opt.speed === 'fast' ? 'fast' : 'normal', draw: opt.order === 'draw',
      players: players.map((p) => ({ name: String(p.name || '?').slice(0, 8), color: p.color, img: p.img || '', uid: p.uid || '', owner: !!p.owner, cpu: p.cpu || 0, sc: {}, retired: false, yachts: 0 })),
      order: players.map((p, i) => i), ti: 0, roll: 0, dice: [1, 2, 3, 4, 5], keep: [false, false, false, false, false], log: []
    };
    $('result').classList.add('hidden');
    showGame();
    if (G.draw && G.players.length > 1) {
      for (let i = G.order.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = G.order[i]; G.order[i] = G.order[j]; G.order[j] = t; }
      save(); render();
      drawAnim().then(() => beginTurn());
    } else { save(); beginTurn(); }
  }
  function resume() {
    const g = loadSave(); if (!g) { U.showTitle(); return; }
    G = g; T.tok++; clearTimeout(T.cpuT); T.sel = null; T.plan = null; T.rep = null;
    $('result').classList.add('hidden');
    showGame();
    /* 書いた直後に閉じていた → その番はもう終わり。次の人から */
    if (G.wrote) { D.restore(G.dice, G.keep, true); render(); nextTurn(); return; }
    D.restore(G.dice, G.keep, G.roll > 0);
    D.allow({ throw: false, keep: false });
    render();
    const p = cur(), tok = T.tok;
    banner(p, 'つづきから').then(() => {
      if (tok !== T.tok) return;
      if (p.cpu) { if (G.roll === 0) cpuRoll(tok); else T.cpuT = setTimeout(() => cpuThink(tok), spd(500)); }
      else humanReady();
    });
  }
  function beginTurn() {
    const tok = ++T.tok;
    clearTimeout(T.cpuT);
    T.sel = null; T.plan = null; T.rolling = false;
    G.roll = 0; G.keep = [false, false, false, false, false]; G.wrote = false;
    save();
    D.allow({ throw: false, keep: false });
    D.highlight([]);
    D.newTurn();
    render();
    const p = cur();
    banner(p).then(() => {
      if (tok !== T.tok) return;
      if (p.cpu) cpuRoll(tok);
      else humanReady();
    });
  }
  function humanReady() {
    const left = 3 - G.roll;
    D.allow({ throw: left > 0, keep: G.roll > 0 && left > 0 });
    D.hint(G.roll === 0);
    render();
  }
  function afterSettle() {
    const p = cur(), tok = T.tok;
    if (R.score('ya', G.dice)) { flash('<b>ヨット！</b><small>5つそろった</small>', 'ya'); AU.yacht(); }
    if (p.cpu) { render(); T.cpuT = setTimeout(() => cpuThink(tok), spd(700)); return; }
    humanReady();
  }

  /* ══ 書く ══ */
  /* ★ G.wrote：この番で書いたか（書いたあと次の人へ移るまでの間に、もう1つ書けてしまうのを防ぐ・保存にも残す） */
  function canPick(id) {
    const p = cur();
    return !!(G && p && !p.cpu && !G.wrote && G.roll > 0 && !T.rolling && p.sc[id] == null && !D.busy());
  }
  function select(id) {
    if (!canPick(id)) {
      const p = cur();
      if (p && !p.cpu && G.roll === 0) U.toast('まずはカップでふろう');
      return;
    }
    if (T.sel === id) { commit(id); return; }
    T.sel = id;
    D.highlight(R.usedDice(id, G.dice));
    AU.pick();
    render();
  }
  function commit(id) {
    if (!G) return;
    const p = cur(); if (!p || p.sc[id] != null || G.roll === 0 || G.wrote) return;
    const tok = ++T.tok; clearTimeout(T.cpuT);
    const before = R.totals(p.sc), pts = R.score(id, G.dice);
    p.sc[id] = pts; G.wrote = true;
    if (id === 'ya' && pts) p.yachts = (p.yachts || 0) + 1;
    G.log = (G.log || []).concat([{ p: G.order[G.ti], id, pts, d: G.dice.slice() }]).slice(-120);
    T.sel = null; D.highlight([]); D.allow({ throw: false, keep: false }); D.hint(false);
    T.lastWrite = G.order[G.ti] + ':' + id;
    save();
    AU.write(pts);
    render();
    const after = R.totals(p.sc);
    let delay = 950;
    if (id === 'ya' && pts) { flash('<b>ヨット</b><small>50点！</small>', 'ya'); delay = 1700; }
    else if (!before.bonus && after.bonus) { flash('<b>ボーナス</b><small>+35点！</small>', 'bonus'); AU.bonus(); delay = 1600; }
    else if (pts >= 30 && id !== 'ch') { flash('<b>' + R.CAT[id].name + '</b><small>' + pts + '点</small>', 'big'); delay = 1300; }
    else if (!pts) { flash('<b>0点</b><small>' + R.CAT[id].name + 'を捨てた</small>', 'zero'); }
    T.cpuT = setTimeout(() => { if (tok === T.tok) nextTurn(); }, delay);
  }
  function nextTurn() {
    const n = G.order.length;
    const hadHuman = G.players.some((p) => !p.cpu);
    if (hadHuman && !G.players.some((p) => !p.cpu && !p.retired)) { endGame(); return; }
    for (let k = 1; k <= n; k++) {
      const ti = (G.ti + k) % n, p = G.players[G.order[ti]];
      if (!p.retired && R.openCats(p.sc).length) { G.ti = ti; beginTurn(); return; }
    }
    endGame();
  }

  /* ══ CPU ══ */
  function cpuRoll(tok) {
    if (tok !== T.tok) return;
    render();
    T.cpuT = setTimeout(() => { if (tok === T.tok) D.autoThrow({ shake: G.speed === 'fast' ? 0.35 : 0.65 }); }, spd(500));
  }
  function cpuThink(tok) {
    if (tok !== T.tok || !G) return;
    const p = cur(); if (!p || !p.cpu) return;
    if (!T.plan) T.plan = R.planner(p.sc);
    const mv = R.cpuMove(p.sc, G.dice, 3 - G.roll, p.cpu, T.plan);
    if (mv.act === 'score') {
      T.sel = mv.id; D.highlight(R.usedDice(mv.id, G.dice)); AU.pick(); render();
      T.cpuT = setTimeout(() => { if (tok === T.tok) commit(mv.id); }, spd(1000));
      return;
    }
    const ch = [];
    mv.keep.forEach((k, i) => { if (!!G.keep[i] !== !!k) ch.push([i, k]); });
    let n = 0;
    const step = () => {
      if (tok !== T.tok) return;
      if (n < ch.length) {
        const [i, k] = ch[n++];
        D.setKeep(i, k); G.keep[i] = k; if (k) AU.keep(); else AU.unkeep(); render();
        T.cpuT = setTimeout(step, spd(300));
        return;
      }
      save();
      T.cpuT = setTimeout(() => cpuRoll(tok), spd(380));
    };
    T.cpuT = setTimeout(step, spd(200));
  }

  /* ══ リタイア・やめる ══ */
  function retire(pi) {
    const p = G && G.players[pi]; if (!p || p.retired) return;
    p.retired = true;
    save();
    AU.unkeep();
    const hadHuman = G.players.some((q) => !q.cpu), act = G.players.filter((q) => !q.retired);
    if (!act.length || (hadHuman && !act.some((q) => !q.cpu))) { U.toast('<b>' + esc(p.name) + '</b> がリタイア。のこりの人がいないので、試合はここで終わりです', 3200); endGame(); return; }
    /* ★ 目に見えるように：大きな札で知らせる（番の人だけの表では、ほかの人のリタイアが見えないため） */
    flash('<b>リタイア</b><small>' + esc(p.name) + '（のこり ' + act.length + '人）</small>', 'zero');
    U.toast('<b>' + esc(p.name) + '</b> がリタイアしました。その人の番はとばします（「みんなの点」で確認できます）', 3200);
    if (G.order[G.ti] === pi) { T.tok++; clearTimeout(T.cpuT); T.sel = null; D.highlight([]); T.cpuT = setTimeout(nextTurn, 900); }
    else render();
  }
  function later() {
    save();
    T.tok++; clearTimeout(T.cpuT);
    D.allow({ throw: false, keep: false }); D.hint(false);
    hideGame(); U.closeSheet(); U.showTitle();
    U.toast('試合を保存しました。「つづきから」で続きを遊べます');
  }
  function quit() {
    T.tok++; clearTimeout(T.cpuT);
    D.allow({ throw: false, keep: false }); D.hint(false);
    G = null; dropSave();
    hideGame(); U.closeSheet(); U.showTitle();
  }

  /* ══ 結果 ══ */
  function ranking() {
    const ps = G.players.map((p, i) => ({ i, p, t: R.totals(p.sc) }));
    const act = ps.filter((x) => !x.p.retired).sort((a, b) => b.t.total - a.t.total);
    const ret = ps.filter((x) => x.p.retired).sort((a, b) => b.t.total - a.t.total);
    let rk = 0, last = null;
    act.forEach((x, k) => { if (x.t.total !== last) { rk = k + 1; last = x.t.total; } x.rank = rk; });
    ret.forEach((x, k) => { x.rank = act.length + k + 1; });
    return act.concat(ret);
  }
  async function endGame() {
    T.tok++; clearTimeout(T.cpuT); T.rolling = false;
    D.allow({ throw: false, keep: false }); D.hint(false); D.highlight([]);
    if (!G) return;
    G.done = true; dropSave();
    const rows = ranking();
    T.rep = null;
    showResult(rows, true);
    let rep = null;
    try {
      rep = await A.report(rows.map((x) => ({ name: x.p.name, uid: x.p.uid, owner: x.p.owner, cpu: !!x.p.cpu, rank: x.rank, total: x.t.total, retired: x.p.retired, yachts: x.p.yachts || 0 })), { gid: G.id });
    } catch (e) { rep = { prizes: [] }; }
    T.rep = rep;
    showResult(rows, false);
  }
  function prizeOf(x) {
    if (!T.rep) return null;
    return (T.rep.prizes || []).find((z) => z.name === x.p.name && z.rank === x.rank) || null;
  }
  function showResult(rows, first) {
    const el = $('result');
    const solo = G.players.length === 1, win = rows[0];
    const coin = '<img class="rs-coin" src="../XEVA.png" alt="" onerror="this.remove()">';
    const pz = (x) => {
      if (x.p.cpu) return '';
      if (x.p.retired) return '<i class="rs-pz no">リタイア</i>';
      if (!x.p.owner && !x.p.uid) return '';
      if (!T.rep) return '<i class="rs-pz wait">…</i>';
      const z = prizeOf(x);
      if (!z) return '';
      return '<i class="rs-pz ' + z.kind + '">' + coin + '+' + z.amount + '<small>' + (z.kind === 'me' ? 'この端末' : z.kind === 'cloud' ? '送りました' : 'あとで送ります') + '</small></i>';
    };
    const list = rows.map((x, k) => '<li class="rs-r rk' + x.rank + (x.p.retired ? ' ret' : '') + '" style="--c:' + x.p.color + ';--d:' + ((rows.length - 1 - k) * 0.45 + 0.3) + 's">' +
      '<span class="rs-rk">' + (x.p.retired ? '—' : x.rank) + '</span>' + av(x.p, 'md') +
      '<span class="rs-nm"><b>' + esc(x.p.name) + (x.p.cpu ? '<em>CPU</em>' : '') + '</b><small>上 ' + x.t.up + (x.t.bonus ? '＋35' : '') + '・下 ' + x.t.low + (x.p.yachts ? '・ヨット' + x.p.yachts : '') + '</small></span>' +
      '<span class="rs-tt">' + x.t.total + '<small>点</small></span>' + pz(x) + '</li>').join('');
    const note = solo ? 'ひとりのときは点数で XEVA（' + A.SOLO_MIN + '点から・最大 ' + A.SOLO_MAX + '）。'
      : '順位で XEVA（「この端末の本人」か連携した人。CPU・リタイアはなし）。';
    el.innerHTML = '<div class="rs-bg" aria-hidden="true"><i class="bg-rays"></i></div>' +
      '<div class="rs-card">' +
        '<div class="rs-top"><span class="rs-badge">RESULT</span><h2>' + (solo ? 'スコア' : 'けっか発表') + '</h2></div>' +
        (win && !win.p.retired ? '<div class="rs-win" style="--c:' + win.p.color + '"><span class="rs-crown">👑</span>' + av(win.p, 'xl') + '<b>' + esc(win.p.name) + '</b><span>' + win.t.total + '<small>点</small></span></div>' : '') +
        '<ol class="rs-list' + (first ? ' anim' : '') + '">' + list + '</ol>' +
        '<p class="rs-note">' + note + '</p>' +
        '<div class="rs-btns"><button class="btn" data-g="rsSheet">' + IC.book + 'スコア表</button><button class="buzz" data-g="rsAgain"><span>もういちど</span></button><button class="btn" data-g="rsTitle">はじめの画面へ</button></div>' +
      '</div>';
    el.classList.remove('hidden');
    if (first) {
      AU.drum();
      setTimeout(() => { if (!el.classList.contains('hidden')) { AU.win(); confetti(); } }, (rows.length - 1) * 450 + 900);
    }
  }
  function again() {
    if (!G) return;
    const ps = G.players.map((p) => ({ name: p.name, color: p.color, img: p.img, uid: p.uid, owner: p.owner, cpu: p.cpu }));
    start(ps, { order: G.draw ? 'draw' : 'fixed', speed: G.speed });
  }
  function confetti() {
    const box = $('result');
    const cols = ['#ffd447', '#ff5d6c', '#3f9bff', '#2fcf7d', '#a77bff', '#ffffff'];
    for (let i = 0; i < 46; i++) {
      const s = document.createElement('i');
      s.className = 'cf';
      s.style.cssText = 'left:' + (Math.random() * 100) + '%;background:' + cols[i % cols.length] + ';animation-delay:' + (Math.random() * 0.6).toFixed(2) + 's;animation-duration:' + (2.2 + Math.random() * 1.6).toFixed(2) + 's;--r:' + ((Math.random() * 720 - 360) | 0) + 'deg;--x:' + ((Math.random() * 160 - 80) | 0) + 'px';
      box.appendChild(s);
      setTimeout(() => s.remove(), 4400);
    }
  }

  /* ══════════════════════════════════════════════════════════════
     画面
     ══════════════════════════════════════════════════════════════ */
  function layoutMode() {
    const w = root.innerWidth, h = root.innerHeight;
    $('game').classList.toggle('wide', w >= 700 && w / h >= 1.05);
  }
  function render() {
    if (!G) return;
    const p = cur(), human = p && !p.cpu, t = R.totals(p.sc);
    /* 上の帯 */
    $('gRound').innerHTML = '<b>' + roundOf(p) + '</b><small>/' + R.ROUNDS + '</small>';
    $('gTurn').innerHTML = av(p, 'sm') + '<b>' + esc(p.name) + '</b><span>の番</span>' + (p.cpu ? '<em>CPU</em>' : '');
    $('gTurn').style.setProperty('--c', p.color);
    /* トレイの上の案内（転がっている間は、その1回も使ったものとして見せる） */
    const left = 3 - G.roll - (T.rolling ? 1 : 0), cs = D.cupState();
    $('gRolls').innerHTML = '<span>ふれる</span>' + [0, 1, 2].map((k) => '<i class="' + (k < left ? 'on' : '') + '"></i>').join('');
    let tip = '';
    if (G.wrote) tip = 'つぎの人の番へ…';
    else if (!human) tip = '<b>' + esc(p.name) + '</b> がふっています…';
    else if (D.busy() && G.roll > 0 && !T.sel) tip = '';
    else if (G.roll === 0) tip = '<b>カップを押さえて</b>、指を左右に動かしてふる → <b>はなすと落ちる</b>';
    else if (T.sel) tip = '<b>' + R.CAT[T.sel].name + '</b> に書く？ もう一度タップか「書く」で決定';
    else if (left > 0) tip = 'のこすサイコロを<b>タップでキープ</b> → 右下の<b>カップ</b>でふり直す／スコア表の欄に<b>書く</b>';
    else tip = 'スコア表の欄をえらんで<b>点を書こう</b>';
    $('gTip').innerHTML = tip;
    $('gTip').classList.toggle('on', !!tip);
    const showCup = human && G.roll > 0 && left > 0 && (cs === 'off' || cs === 'leave');
    $('gCup').classList.toggle('on', showCup);
    $('gCup').querySelector('small').textContent = 'のこり ' + left + '回';
    /* いまのサイコロ（小さく） */
    $('scDice').innerHTML = G.roll > 0
      ? '<span>いまの目</span>' + G.dice.map((v, i) => HT.die(v, 'mini' + (G.keep[i] ? ' kp' : ''))).join('') + '<em>合計 ' + R.sum(G.dice) + '</em>'
      : '<span>' + (human ? 'カップでふろう' : 'CPU の番') + '</span>';
    renderSheet();
    /* 書くボタン */
    const act = $('scAct');
    if (human && T.sel) {
      const pts = R.score(T.sel, G.dice);
      act.innerHTML = '<button class="buzz wide' + (pts ? '' : ' zero') + '" data-g="commit"><span><em>' + R.CAT[T.sel].name + '</em> に <b>' + pts + '点</b> を書く' + (pts ? '' : '（捨てる）') + '</span></button><button class="btn sm" data-g="unsel">やめる</button>';
      act.classList.add('on');
    } else { act.innerHTML = ''; act.classList.remove('on'); }
    void t;
  }
  /* ★ 2026-11-18 ご指定「大人数のとき全員の結果がずっと表示されると見づらい → その時の番の人の結果だけ表示し、
       ボタンで他の人の数を見られるように」「みんなの点の表示は大きく表示でよい」
       → スコア表はいつも番の人の列だけ。表の左上の「みんなの点」で、全員の点を大きな表（順位つき）で出す（openAll） */
  function renderSheet() {
    const all = G.order.map((i) => ({ i, p: G.players[i] }));
    const curI = G.order[G.ti], p0 = cur(), human = p0 && !p0.cpu;
    const many = all.length > 1, ps = many ? all.filter((x) => x.i === curI) : all;
    const showPv = G.roll > 0 && !D.busy() && !G.wrote;
    $('game').classList.toggle('sc-one', many);
    const tg = many ? '<button class="sc-tg" data-g="all">' + IC.people + '<span>みんなの点<small>' + all.length + '人</small></span></button>' : '役';
    const head = '<tr><th class="lab">' + tg + '</th>' + ps.map(({ i, p }) => '<th class="pl' + (i === curI ? ' cur' : '') + (p.retired ? ' ret' : '') + '" style="--c:' + p.color + '">' + av(p, 'sm') + '<span>' + esc(p.name) + '</span>' + (p.retired ? '<em>リタイア</em>' : '') + '</th>').join('') + '</tr>';
    const cell = (i, p, id) => {
      const v = p.sc[id];
      const cls = [];
      if (i === curI) cls.push('cur');
      if (v != null) {
        if (T.lastWrite === i + ':' + id) cls.push('nw');
        return '<td class="' + cls.concat(['fl', v ? '' : 'z']).join(' ') + '">' + v + '</td>';
      }
      if (i === curI && showPv && !p.retired) {
        const pv = R.score(id, G.dice);
        cls.push('pv'); if (!pv) cls.push('z'); if (T.sel === id) cls.push('sel'); if (!human) cls.push('cpu');
        return '<td class="' + cls.join(' ') + '" data-c="' + id + '">' + pv + '</td>';
      }
      return '<td class="' + cls.join(' ') + '"' + (i === curI && human && !p.retired && !G.wrote ? ' data-c="' + id + '"' : '') + '></td>';
    };
    const lab = (c) => '<th class="lab" data-l="' + c.id + '">' + (c.up ? HT.die(c.face, 'mini') : '<i class="lic">' + CAT_IC[c.id] + '</i>') + '<span>' + c.name + '<small>' + c.desc + '</small></span></th>';
    let body = '';
    R.CATS.forEach((c) => {
      if (c.id === 'ch') {
        body += '<tr class="sum"><th class="lab"><span>小計<small>63点以上で +35</small></span></th>' + ps.map(({ i, p }) => {
          const t = R.totals(p.sc);
          return '<td class="' + (i === curI ? 'cur' : '') + '">' + t.up + (t.bonusState === 'open' && t.up ? '<small>あと' + t.need + '</small>' : '') + '</td>';
        }).join('') + '</tr>';
        body += '<tr class="bon"><th class="lab"><span>ボーナス<small>+35</small></span></th>' + ps.map(({ i, p }) => {
          const t = R.totals(p.sc);
          return '<td class="' + (i === curI ? 'cur ' : '') + (t.bonus ? 'got' : t.bonusState === 'lost' ? 'lost' : '') + '">' + (t.bonus ? '+35' : t.bonusState === 'lost' ? '0' : '') + '</td>';
        }).join('') + '</tr>';
      }
      body += '<tr class="ct ' + (c.up ? 'up' : 'lo') + (T.sel === c.id ? ' rsel' : '') + '">' + lab(c) + ps.map(({ i, p }) => cell(i, p, c.id)).join('') + '</tr>';
    });
    body += '<tr class="tot"><th class="lab"><span>合計</span></th>' + ps.map(({ i, p }) => '<td class="' + (i === curI ? 'cur' : '') + '">' + R.totals(p.sc).total + '</td>').join('') + '</tr>';
    const wrap = $('scWrap'), sx = wrap.scrollLeft, sy = wrap.scrollTop;
    $('sc').innerHTML = '<thead>' + head + '</thead><tbody>' + body + '</tbody>';
    $('sc').style.setProperty('--n', ps.length);
    wrap.scrollLeft = sx; wrap.scrollTop = sy;
    /* いまの人の列が見えるように */
    const th = $('sc').querySelector('th.pl.cur');
    if (th) {
      const l = th.offsetLeft, w = th.offsetWidth, labW = ($('sc').querySelector('th.lab') || {}).offsetWidth || 0;
      if (l - labW < wrap.scrollLeft) wrap.scrollLeft = Math.max(0, l - labW - 6);
      else if (l + w > wrap.scrollLeft + wrap.clientWidth) wrap.scrollLeft = l + w - wrap.clientWidth + 6;
    }
  }
  /* 番の札（中央に少しだけ出る・タップで消える） */
  function banner(p, sub) {
    const el = $('banner');
    el.innerHTML = '<div class="bn" style="--c:' + p.color + '">' + av(p, 'lg') + '<div><small>' + (sub ? sub + '・' : '') + 'ラウンド ' + roundOf(p) + ' / ' + R.ROUNDS + '</small><b>' + esc(p.name) + '<span> の番</span></b></div></div>';
    el.classList.remove('hidden'); el.classList.remove('out'); void el.offsetWidth; el.classList.add('in');
    AU.turn();
    return new Promise((res) => {
      clearTimeout(T.bnT);
      const done = () => { clearTimeout(T.bnT); el.classList.add('out'); setTimeout(() => { el.classList.add('hidden'); el.classList.remove('in', 'out'); }, 260); T.bnRes = null; res(); };
      T.bnRes = done;
      T.bnT = setTimeout(done, p.cpu ? spd(1050) : 1150);
    });
  }
  /* くじ引き（順番） */
  function drawAnim() {
    const el = $('banner');
    const ps = G.order.map((i) => G.players[i]);
    el.innerHTML = '<div class="dr"><h3>順番をきめます</h3><ol>' + ps.map((p, k) => '<li style="--k:' + k + ';--c:' + p.color + '"><i>' + (k + 1) + '</i>' + av(p, 'sm') + '<b>' + esc(p.name) + '</b></li>').join('') + '</ol></div>';
    el.classList.remove('hidden', 'out'); void el.offsetWidth; el.classList.add('in');
    AU.drum();
    return new Promise((res) => {
      clearTimeout(T.bnT);
      const done = () => { clearTimeout(T.bnT); el.classList.add('out'); setTimeout(() => { el.classList.add('hidden'); el.classList.remove('in', 'out'); }, 260); T.bnRes = null; res(); };
      T.bnRes = done;
      T.bnT = setTimeout(done, 1500 + ps.length * 220);
    });
  }
  function flash(html, kind) {
    const box = $('fx'), el = document.createElement('div');
    el.className = 'fl-' + (kind || 'big');
    el.innerHTML = html + (kind === 'ya' || kind === 'bonus' ? '<i class="sp"></i><i class="sp s2"></i><i class="sp s3"></i>' : '');
    box.appendChild(el);
    setTimeout(() => el.remove(), 1900);
  }

  /* ══ メニュー ══ */
  function menu() {
    const p = cur();
    const B = MY.Bgm ? MY.Bgm.info() : { mode: 'off' };
    U.sheet('<h3 class="sh-t">' + IC.gear + 'メニュー</h3>' +
      '<div class="mn-l">' +
        '<button class="buzz wide" data-a="shClose"><span>つづける</span></button>' +
        '<button class="mn" data-a="g-how">' + IC.book + '<span>あそび方<small>アニメで見る</small></span></button>' +
        '<button class="mn" data-a="g-retire">' + IC.x + '<span>リタイア<small>だれかがぬける（その人は最下位・賞金なし）</small></span></button>' +
        '<button class="mn" data-a="g-later">' + IC.save + '<span>あとでつづける<small>保存して、はじめの画面へ（「つづきから」で再開）</small></span></button>' +
        '<button class="mn danger" data-a="g-quit">' + IC.x + '<span>この試合をやめる<small>保存を消して、はじめの画面へ</small></span></button>' +
      '</div>' +
      '<div class="ru"><div class="ru-l">' + IC.music + '<b>BGM</b></div><div class="su-seg">' + [['orig', 'オリジナル曲'], ['mine', '自分の曲'], ['off', 'オフ']].map((o) => '<button class="' + (B.mode === o[0] ? 'on' : '') + '" data-a="g-bgm" data-v="' + o[0] + '"' + (o[0] === 'mine' && !B.has ? ' disabled' : '') + '>' + o[1] + '</button>').join('') + '</div></div>' +
      '<div class="ru"><div class="ru-l">' + IC.sound + '<b>効果音</b></div><div class="su-seg"><button class="' + (AU.isOn() ? 'on' : '') + '" data-a="g-se" data-v="on">ON</button><button class="' + (AU.isOn() ? '' : 'on') + '" data-a="g-se" data-v="off">OFF</button></div></div>' +
      (p ? '<p class="sh-p center">いま：' + esc(p.name) + ' の番・ラウンド ' + roundOf(p) + '/' + R.ROUNDS + '（自動で保存しています）</p>' : ''), 'menu');
  }
  function retireSheet() {
    const list = G.order.map((i) => ({ i, p: G.players[i] })).filter((x) => !x.p.retired);
    U.sheet('<h3 class="sh-t">' + IC.x + 'だれがリタイアする？</h3><p class="sh-p">リタイアした人の番はとばします。点はそのまま残り、順位は<b>いちばん下</b>（賞金なし）。</p>' +
      '<div class="lk-l">' + list.map((x) => '<button class="lk-r" data-a="g-ret" data-i="' + x.i + '">' + av(x.p, 'sm') + '<b>' + esc(x.p.name) + (x.p.cpu ? '（CPU）' : '') + '</b><span class="rt-t">' + R.totals(x.p.sc).total + '点</span></button>').join('') + '</div>' +
      '<div class="sh-b"><button class="btn" data-a="g-menu">もどる</button></div>', 'ret');
  }
  /* みんなの点（大きな表・いまの順位つき）。結果の画面の「スコア表」も同じもの */
  function openAll() {
    if (!G) return;
    const ps = G.order.map((i) => ({ i, p: G.players[i], t: R.totals(G.players[i].sc) }));
    const curI = G.done ? -1 : G.order[G.ti];
    const rk = ps.slice().sort((a, b) => (a.p.retired - b.p.retired) || (b.t.total - a.t.total));
    let r = 0, last = null;
    rk.forEach((x, k) => { if (x.p.retired) { x.r = '—'; return; } if (x.t.total !== last) { r = k + 1; last = x.t.total; } x.r = r; });
    const strip = '<div class="bg-rk">' + rk.map((x) => '<div class="bg-r' + (x.i === curI ? ' cur' : '') + (x.p.retired ? ' ret' : '') + (x.r === 1 ? ' top' : '') + '" style="--c:' + x.p.color + '"><i>' + x.r + '</i>' + av(x.p, 'sm') + '<b>' + esc(x.p.name) + '</b><span>' + x.t.total + '<small>点</small></span></div>').join('') + '</div>';
    const td = (x, inner, cls) => '<td class="' + (x.i === curI ? 'cur ' : '') + (cls || '') + '">' + inner + '</td>';
    let h = '<div class="bt-w"><table class="bt"><thead><tr><th class="lab"></th>' + ps.map((x) => '<th class="' + (x.i === curI ? 'cur' : '') + (x.p.retired ? ' ret' : '') + '" style="--c:' + x.p.color + '">' + av(x.p, 'md') + '<span>' + esc(x.p.name) + '</span>' + (x.p.retired ? '<em>リタイア</em>' : x.i === curI ? '<em class="now">いまの番</em>' : '') + '</th>').join('') + '</tr></thead><tbody>';
    R.CATS.forEach((c) => {
      if (c.id === 'ch') {
        h += '<tr class="sum"><th class="lab">小計<small>63点以上で +35</small></th>' + ps.map((x) => td(x, x.t.up + (x.t.bonusState === 'open' && x.t.up ? '<small>あと' + x.t.need + '</small>' : ''))).join('') + '</tr>';
        h += '<tr class="sum"><th class="lab">ボーナス</th>' + ps.map((x) => td(x, x.t.bonus ? '+35' : x.t.bonusState === 'lost' ? '0' : '', x.t.bonus ? 'got' : '')).join('') + '</tr>';
      }
      h += '<tr><th class="lab">' + (c.up ? HT.die(c.face, 'mini') : '<i class="lic">' + CAT_IC[c.id] + '</i>') + c.name + '</th>' +
        ps.map((x) => { const v = x.p.sc[c.id]; return v == null ? td(x, '−', 'e') : td(x, v, v ? '' : 'z'); }).join('') + '</tr>';
    });
    h += '<tr class="tot"><th class="lab">合計</th>' + ps.map((x) => td(x, x.t.total)).join('') + '</tr></tbody></table></div>';
    const p = cur();
    const sub = G.done ? '最後の点' : 'ラウンド ' + (p ? roundOf(p) : '') + ' / ' + R.ROUNDS + '・いまの順位';
    U.sheet('<h3 class="sh-t">' + IC.people + (G.done ? 'スコア表' : 'みんなの点') + '<small class="sh-sub">' + sub + '</small></h3>' + strip + h + '<div class="sh-b"><button class="btn" data-a="shClose">とじる</button></div>', 'big');
  }
  /* setup.js のシートから来る合図 */
  function act(a, b) {
    if (a === 'g-how') { U.closeSheet(); HT.open(); }
    else if (a === 'g-retire') retireSheet();
    else if (a === 'g-menu') menu();
    else if (a === 'g-ret') {
      const i = +b.dataset.i, p = G && G.players[i]; if (!p) return;
      U.confirmSheet(p.name + ' がリタイア', esc(p.name) + ' はこの試合からぬけます（いまの点は残り、順位はいちばん下・賞金なし）。よろしいですか？', 'リタイアする', () => retire(i));
    } else if (a === 'g-later') { AU.tap(); later(); }
    else if (a === 'g-quit') U.confirmSheet('この試合をやめる', '保存している試合を消して、はじめの画面にもどります（記録・賞金はありません）。', '試合をやめる', quit);
    else if (a === 'g-bgm') { if (MY.Bgm) { MY.Bgm.kick(); MY.Bgm.setMode(b.dataset.v); } AU.tap(); menu(); }
    else if (a === 'g-se') { AU.setOn(b.dataset.v === 'on'); AU.tap(); menu(); }
  }

  /* ══ さわる ══ */
  function onGameClick(e) {
    const b = e.target.closest ? e.target.closest('[data-g],[data-c],[data-l]') : null; if (!b) return;
    if (b.dataset.c) { select(b.dataset.c); return; }
    if (b.dataset.l) { const c = R.CAT[b.dataset.l]; if (c) U.toast('<b>' + c.name + '</b>：' + c.desc); return; }
    const a = b.dataset.g;
    if (a === 'menu') { AU.tap(); menu(); }
    else if (a === 'commit') { if (T.sel) commit(T.sel); }
    else if (a === 'unsel') { T.sel = null; D.highlight([]); AU.tap(); render(); }
    else if (a === 'all') { AU.tap(); openAll(); }
    else if (a === 'how') { AU.tap(); HT.open(); }
  }
  function onResultClick(e) {
    const b = e.target.closest ? e.target.closest('[data-g]') : null; if (!b) return;
    const a = b.dataset.g;
    if (a === 'rsSheet') { AU.tap(); openAll(); }
    else if (a === 'rsAgain') { AU.tap(); again(); }
    else if (a === 'rsTitle') { AU.tap(); G = null; hideGame(); U.showTitle(); }
  }
  function init() {
    $('game').addEventListener('click', onGameClick);
    $('result').addEventListener('click', onResultClick);
    $('banner').addEventListener('pointerdown', () => { if (T.bnRes) T.bnRes(); });
    $('gCup').addEventListener('pointerdown', (e) => { e.preventDefault(); AU.unlock(); D.callCup(e); });
    let rt = 0;
    root.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { layoutMode(); if (G && $('game').classList.contains('on')) { D.layout(); renderSheet(); } }, 80); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  }

  MY.Game = {
    init, start, resume, savedInfo, dropSave, act, syncOpts() { /* メニューを開いたときに読み直す */ },
    onSheetClose() { /* 何もしない */ }, onHowtoClose() { /* 何もしない */ },
    peek: () => ({ G, T })
  };
})(window);
