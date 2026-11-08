/* ============================================================
   MagiQuiz — quiz-play.js（試合）
   ★★ 2026-11-05 全面作り直し
   ------------------------------------------------------------
   どの遊び方も同じ流れ（＝画面も操作も1つで覚えられる）：
     手番の画面（★自動で進む・早押しには無い）→ 問題（時間が進む・メモ／電卓）→ 答えを選んでブザー → 結果と解説（★時間は止まる）→ 次へ
   ご指定「基本的に交互に近い形」：早押し以外は1問ごとに次の人へ回る。順番は試合のはじめにくじ引きで決め、その順に並べる（orderDraw）。

   ・見えない爆弾（bomb）… 爆弾は絵に出さない。B.fuse は問題に答えている間だけ進む（解説・手番の受けわたしでは止まる）。
       正解→次の人／まちがい→ミス+1・同じ人にもう1問／ミス上限→ライフ−1（ミスは0に戻って爆弾は次の人へ）／爆発→ライフ−1（0でアウト）。最後の1人（1チーム）が勝ち。
       次のラウンドは爆発した人から（アウトならその次の人）。
   ・クイズタワー（tower）… 自分のタワーを1問ずつ交互に登る。まちがえるとチェックポイント（3階・7階）まで転落＋ライフ−1（G.opt.miss − u.miss がライフ）。
       ライフ0で終わり。「降りる」でいまの点を確定（問題の答えも見られる）。全員が終わったら点の順に順位。
   ・スコアアタック（score）… 全員が同じ数の問題に交互に挑戦。正解の点＋速さ＋連続正解。
   ・早押しバトル（rush）… 文が1文字ずつ出て、わかった人が自分のブザーを押して答える。下の「早押しバトル」の節。

   ★ 1回の解答時間（RULE.LIMIT）：時間切れ＝まちがいと同じ。計算問題は長い。長い文・図などは Data.limitOf が少し足す。
   ★ 試合は1手ごとに保存（magiquiz_game_v2）＝アプリが閉じても「つづきから」で戻れる。_ で始まる項目は保存しない。
   ★ 賞金は結果の画面を出すときに1回だけ（quiz-result.js）。保存を先に消すので二重にならない。
   ============================================================ */
(function () {
  "use strict";
  const MQ = window.MQ, Q = MQ.Data, A = MQ.Account, FX = MQ.FX, U = MQ.U, Pad = MQ.Pad, M = window.MCL;
  const { $, $$, esc, fmtN, ic, avatar, buzzBtn, sheet, closeSheet, sheetOpen, show, toast, COLORS, TEAMS, LET, MODES, UI } = U;
  const lab = (k) => P.lab[k];   /* 見えている順番 k の札（A・B… か 1・2…） */
  const R = Q.RULE;
  const GAME_KEY = "magiquiz_game_v2";

  let G = null;
  const P = { phase: "idle", x: null, q: null, ord: [], sel: null, hidden: {}, hint: "", lim: 0, left: 0, spent: 0, paused: false, sec: -1, res: null, votes: null, solOpen: false };
  let raf = 0, last = 0;
  const cur = () => G.units[G.cur];
  const alive = () => G.units.filter((u) => !u.out);
  const member = (u) => u.members[(u.mi || 0) % u.members.length];
  const GOOD = '<svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="44" fill="none" stroke="#fff" stroke-width="16"/></svg>';
  const BAD = '<svg viewBox="0 0 120 120"><path d="M28 28l64 64M92 28l-64 64" fill="none" stroke="#fff" stroke-width="18" stroke-linecap="round"/></svg>';
  const songOf = () => (G.mode === "bomb" ? "bomb" : G.mode === "rush" ? "rush" : "play");
  /* ★★ 2026-11-08 司会キャラ（quiz-host.js）。オフなら何もしない */
  const host = (ev, v, o) => { try { if (MQ.Host) MQ.Host.say(ev, v, o); } catch (e) {} };
  const nmOf = (u) => (u ? (G && G.team ? u.name + "（" + member(u).name + "）" : u.name) : "");
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  /* ══ 保存 ══ */
  function saveGame() { if (!G || G.done) return; try { localStorage.setItem(GAME_KEY, JSON.stringify(G, (k, v) => (k[0] === "_" ? undefined : v))); } catch (e) {} }
  function clearSave() { try { localStorage.removeItem(GAME_KEY); } catch (e) {} }
  function saved() {
    try {
      const g = JSON.parse(localStorage.getItem(GAME_KEY) || "null");
      if (!g || g.v !== 2 || !g.units || !MODES[g.mode]) return null;
      const u = g.units[g.cur] || g.units[0];
      return { mode: g.mode, who: g.units.length + (g.team ? "チーム" : "人") + "・" + (g.mode === "rush" ? "第 " + g.round + " 問" : u.name + " の番") };
    } catch (e) { return null; }
  }

  /* ══ はじめる ══ */
  function makeUnits(S, list) {
    const ps = list.map((p, i) => {
      const lk = !p.owner && p.link && p.link.uid && p.link.confirmed !== false ? p.link : null;
      return { i, name: String(p.name || "プレイヤー" + (i + 1)).slice(0, 8), color: COLORS[i], owner: !!p.owner, uid: lk ? lk.uid : null, acc: p.owner ? A.me() : lk };
    });
    let units;
    if (!S.team) units = ps.map((p) => ({ name: p.name, color: p.color, members: [p] }));
    else {
      units = TEAMS.slice(0, S.nTeams).map((t) => ({ name: t.nm, color: t.c, members: [] }));
      list.forEach((p, i) => units[Math.min(p.team, S.nTeams - 1)].members.push(ps[i]));
      units = units.filter((u) => u.members.length);
    }
    /* ★★ 2026-11-05 ご指定「順番はランダムで何かで決めて、順番で並べて」→ 毎回くじ引き（orderDraw で見せる）。G.units の並び＝順番 */
    shuffle(units);
    units.forEach((u, k) => Object.assign(u, { k, lives: S.mode === "rush" ? S.rhearts : S.hearts, miss: 0, score: 0, floor: 0, out: false, done: false, stopped: false, outAt: 0, ok: 0, n: 0, combo: 0, best: 0, boom: 0, asked: 0, mi: 0, ms: 0, calcOk: 0, calcN: 0, fs: {}, ts: {}, near: 0,
      items: S.items && S.mode === "bomb" ? { ff: 1, hint: 1, swap: 1 } : S.items && S.mode === "tower" ? { ff: 1, hint: 1, ask: 1 } : {} }));
    return units;
  }
  function attach() { G._pool = Q.pool(G.range); G._used = new Set(G.used || []); }
  function start(S, list) {
    G = { v: 2, id: Date.now(), mode: S.mode, team: !!S.team, opt: { limit: S.limit, fuse: S.fuse, hearts: S.mode === "rush" ? S.rhearts : S.mode === "tower" ? S.tmiss : S.hearts, miss: S.mode === "bomb" ? S.miss : S.mode === "tower" ? S.tmiss : 0, rounds: S.rounds, items: S.items && (S.mode === "bomb" || S.mode === "tower"), target: S.rtarget, speed: S.rspeed },
      range: { sets: S.sets.slice(), fields: S.fields.slice(), calc: S.calc }, units: makeUnits(S, list), cur: 0, used: [], log: [], outN: 0, b: null, round: 0, done: false, pend: null, lastCtx: "" };
    attach();
    Pad.reset(); buildShell();
    saveGame();
    opening();
  }
  function resume() {
    try { G = JSON.parse(localStorage.getItem(GAME_KEY) || "null"); } catch (e) { G = null; }
    if (!G) { U.openTitle(); return; }
    attach(); Pad.reset(); buildShell();
    FX.music(songOf());
    document.body.dataset.mode = G.mode;
    if (G.pend) { P.res = G.pend; proceed(); return; }
    if (G.mode === "rush") { rushNext(); return; }
    if (G.mode === "bomb") {
      if (!G.b) { bombRound(); return; }
      FX.ambOn(true); bombTurn("再開");
    } else nextTurn();
  }
  /* 試合のはじめ：遊び方の名前と順番 */
  function opening() {
    const m = MODES[G.mode];
    document.body.dataset.mode = G.mode;
    FX.music(songOf());
    P.phase = "intro";
    show("turn");
    const box = $("#turn"); box.style.setProperty("--c", m.c);
    const rule = G.mode === "bomb" ? "正解で次の人へ。爆発したらライフ −1。"
      : G.mode === "tower" ? "1問ずつ交互に10階をめざす。まちがえると転落。"
      : G.mode === "rush" ? "わかった瞬間にブザー！ 先に " + G.opt.target + " 問正解で勝ち。"
      : "1人 " + G.opt.rounds + " 問。速く正確に答えて点を積み上げる。";
    const draw = G.units.length > 1 && G.mode !== "rush";
    box.innerHTML = `<div class="tn-w"></div><div class="tn-in opn"><p class="opn-en">${m.en}</p><h2 class="opn-nm">${esc(m.nm)}</h2><p class="opn-rule">${rule}</p>
      ${draw ? '<p class="odh" id="odH">順番を決めています…</p><div class="odb" id="odB"></div>' : ""}<div class="odg" id="odG"></div></div>`;
    UI.turnGo = () => { if (G.mode === "bomb") bombRound(); else if (G.mode === "rush") rushNext(); else nextTurn(); };
    const ready = () => { $("#odG").innerHTML = buzzBtn("turnGo", "スタート", "lg"); if (draw) setTimeout(() => host("order", { p: G.units[0].name }), 250); };
    if (draw) orderDraw(ready); else ready();
    FX.sfx("turn");
    setTimeout(() => host("start", {}), 450);
  }
  /* ★★ 2026-11-05 順番ぎめ：光がカードの上を回って止まった人から 1番・2番…（タップで飛ばせる）。最後に順番どおりに並びかわる。
     答えは makeUnits で決まっている（G.units の並び）。ここは見せるだけ。 */
  function orderDraw(done) {
    const box = $("#odB"), hd = $("#odH");
    const seat = G.units.slice().sort((a, b) => a.members[0].i - b.members[0].i);
    box.innerHTML = seat.map((u) => `<div class="odc" data-k="${u.k}" style="--c:${u.color}"><i class="odn"></i>${avatar({ name: u.name, color: u.color, acc: G.team ? null : u.members[0].acc, icon: G.team ? "team" : null }, "sm")}<b>${esc(u.name)}</b></div>`).join("");
    const el = (k) => box.querySelector('.odc[data-k="' + k + '"]');
    let pos = 0, timer = 0, over = false;
    const fix = (u, i) => { const c = el(u.k); c.classList.add("fix"); c.querySelector(".odn").textContent = i + 1; };
    const sortCards = () => {
      const first = {}; G.units.forEach((u) => { first[u.k] = el(u.k).getBoundingClientRect(); });
      G.units.forEach((u) => box.appendChild(el(u.k)));
      if (FX.RM()) return;
      G.units.forEach((u) => {
        const c = el(u.k), a = first[u.k], b = c.getBoundingClientRect(), dx = a.left - b.left, dy = a.top - b.top;
        if ((dx || dy) && c.animate) c.animate([{ transform: "translate(" + dx + "px," + dy + "px)" }, { transform: "none" }], { duration: 460, easing: "cubic-bezier(.2,.8,.2,1)" });
      });
    };
    const finishAll = () => {
      if (over) return; over = true; clearTimeout(timer); box.onclick = null;
      $$(".hl", box).forEach((x) => x.classList.remove("hl"));
      G.units.forEach(fix); sortCards();
      hd.textContent = "この順番で回ります"; FX.sfx("check");
      saveGame(); done();
    };
    const spin = () => {
      if (pos >= G.units.length - 1) { finishAll(); return; }
      const left = G.units.slice(pos), goal = left[0], ticks = 8 + Math.floor(Math.random() * 4);
      let t = 0, i = Math.floor(Math.random() * left.length);
      const hop = () => {
        $$(".hl", box).forEach((x) => x.classList.remove("hl"));
        if (++t >= ticks) { el(goal.k).classList.add("hl"); fix(goal, pos); FX.sfx("stamp"); pos++; timer = setTimeout(spin, 300); return; }
        i = (i + 1) % left.length; el(left[i].k).classList.add("hl"); FX.sfx("tick");
        timer = setTimeout(hop, 55 + t * 8);
      };
      hop();
    };
    box.onclick = finishAll;
    timer = setTimeout(spin, 420);
  }

  /* ══ 手番の画面（端末をわたす・ここでは時間は進まない） ══
     ★★ 2026-11-05 ご指定「順番が変わる際にスタートを毎度押す必要はありません」→ 少し見せて自動で問題へ（画面を押すとすぐ進む）。
     o.ms＝見せる時間。止めるのは一時停止だけ（pause）。 */
  function goTurn() { clearTimeout(P.turnT); P.turnT = 0; const f = UI.turnGo; UI.turnGo = null; if (f) f(); }
  function turnArm(ms) { clearTimeout(P.turnT); P.turnT = setTimeout(goTurn, ms); }
  function turnScreen(o) {
    P.phase = "intro"; stopLoop(); Pad.close(); FX.ambCalm(true);
    const u = o.u, box = $("#turn"), mb = member(u), ms = o.ms || 1100;
    show("turn");
    box.style.setProperty("--c", u.color);
    box.innerHTML = `<button class="tn-menu" data-a="pause" aria-label="メニュー">${ic("pause")}</button><div class="tn-w"></div><div class="tn-in" data-a="turnGo">
      <p class="tn-h">${o.head}</p>
      ${avatar({ name: u.name, color: u.color, acc: G.team ? null : mb.acc, icon: G.team ? "team" : null }, "xl")}
      <h2 class="tn-n">${esc(u.name)}<small>の番</small></h2>
      ${G.team ? `<p class="tn-m">こたえる人：<b>${esc(mb.name)}</b>（相談OK）</p>` : ""}
      ${o.sub ? `<p class="tn-s">${o.sub}</p>` : ""}${o.extra || ""}
      <i class="tn-prog" style="--d:${ms}ms"></i></div>`;
    UI.turnGo = o.go;
    FX.sfx("turn");
    turnArm(ms);
    if (G.units.length > 1 && o.say !== false) host(o.say || "turn", { p: nmOf(u) }, { ms: Math.max(1400, ms + 400) });
  }
  /* ★ 並びはいつも順番どおり（ご指定） */
  function standings() {
    return `<div class="tn-st">${G.units.map((u, i) => `<span class="${u.k === G.cur ? "on" : ""}${u.out ? " out" : ""}" style="--c:${u.color}"><i>${i + 1}</i><b>${esc(u.name)}</b><em>${statusText(u)}</em></span>`).join("")}</div>`;
  }
  const towerLife = (u) => Math.max(0, G.opt.miss - u.miss);
  function statusText(u) {
    if (G.mode === "bomb") return u.out ? "OUT" : "♥".repeat(Math.max(0, u.lives)) + (G.opt.miss ? " ✕" + u.miss + "/" + G.opt.miss : u.miss ? " ✕" + u.miss : "");
    if (G.mode === "tower") return (u.floor ? u.floor + "階 " : "") + fmtN(u.score) + " pt" + (u.out ? " OUT" : u.stopped ? " 確定" : " " + "♥".repeat(towerLife(u)));
    if (G.mode === "rush") return u.score + " 問" + (u.out ? " OUT" : " " + "♥".repeat(Math.max(0, u.lives)));
    return fmtN(u.score) + " 点";
  }
  /* タワーの絵（全員の位置） */
  function towerHTML() {
    const rows = [];
    for (let f = R.LADDER.length; f >= 1; f--) {
      const us = G.units.filter((u) => u.floor === f);
      rows.push(`<div class="tw-r${R.SAFE[f] ? " safe" : ""}${f === R.LADDER.length ? " top" : ""}"><span class="tw-f">${f}</span><span class="tw-p">${fmtN(R.LADDER[f - 1])}</span><span class="tw-t">${us.map((u) => `<i class="${u.k === G.cur ? "on" : ""}${u.out || u.stopped ? " end" : ""}" style="--c:${u.color}" title="${esc(u.name)}">${esc(u.name.slice(0, 1))}</i>`).join("")}</span></div>`);
    }
    const g = G.units.filter((u) => u.floor === 0);
    rows.push(`<div class="tw-r gd"><span class="tw-f">S</span><span class="tw-p">スタート</span><span class="tw-t">${g.map((u) => `<i class="${u.k === G.cur ? "on" : ""}${u.out ? " end" : ""}" style="--c:${u.color}">${esc(u.name.slice(0, 1))}</i>`).join("")}</span></div>`);
    return `<div class="tw">${rows.join("")}</div>`;
  }
  function nextActive() {
    const n = G.units.length;
    for (let s = 1; s <= n; s++) {
      const j = (G.cur + s) % n, u = G.units[j];
      if (G.mode === "tower" && !u.done) return j;
      if (G.mode === "score" && !u.out && u.asked < G.opt.rounds) return j;
      if (G.mode === "bomb" && !u.out) return j;
    }
    return -1;
  }
  function nextTurn() {
    const u = cur();
    if (G.units.length === 1) { askFor(); return; }
    if (G.mode === "tower") {
      turnScreen({ u, head: (u.floor + 1) + "階に挑戦", sub: fmtN(R.LADDER[u.floor]) + " pt" + (R.SAFE[u.floor + 1] ? "・チェックポイント" : ""), extra: towerHTML(), ms: 1700, go: askFor });
    } else {
      turnScreen({ u, head: "第 " + (u.asked + 1) + " 問 / " + G.opt.rounds, extra: standings(), go: askFor });
    }
  }
  function askFor() {
    const u = cur(), want = { notCtx: G.lastCtx };
    if (G.mode === "tower") { const f = u.floor + 1; want.lv = f <= 3 ? [1] : f <= 7 ? [1, 2] : [2, 3]; }
    const x = Q.pick(G._pool, G._used, want);
    if (!x) { toast("問題がありません"); finish(); return; }
    ask(x);
  }

  /* ══ 問題 ══ */
  function buildShell() {
    const box = $("#play");
    if (box.dataset.built) return;
    box.dataset.built = "1";
    box.innerHTML = `<i class="pl-heat" aria-hidden="true"></i>
      <header class="pl-top"><button class="pl-ib" data-a="pause" aria-label="一時停止">${ic("pause")}</button><div class="pl-lb" id="plLb"></div><div class="pl-tm" id="plTm"></div></header>
      <div class="pl-bar" id="plBar"><i></i></div>
      <div class="pl-strip" id="plStrip"></div>
      <div class="pl-main" id="plMain"><div class="pl-q" id="plQ"></div><div class="pl-a" id="plA"></div></div>
      <footer class="pl-bot" id="plBot"></footer>
      <div class="pl-res" id="plRes" hidden></div>
      <div class="pd" id="pad" data-tab="draw"></div>`;
  }
  function ask(x) {
    Object.assign(P, { x, q: x.q, ord: Q.order(x.q), lab: Q.labels(x.q), sel: x.q.type === "m" ? [] : x.q.type === "n" ? "" : null, hidden: {}, hint: "", spent: 0, sec: -1, res: null, paused: false, lim: Q.limitOf(x, G.opt.limit) });
    P.left = P.lim;
    G._used.add(x.id); G.used = Array.from(G._used); G.lastCtx = x.q.ctx || "";
    Q.markUsed(x.id);
    Pad.next(x.q.t);
    show("play");
    hideResult();
    $("#play").classList.remove("paused");
    renderTop(); renderStrip(); renderQ(); renderBot();
    $("#plMain").scrollTop = 0; $("#plQ").scrollTop = 0; $("#plA").scrollTop = 0;
    const qc = $("#plQ"); qc.classList.remove("in"); void qc.offsetWidth; qc.classList.add("in");
    P.phase = "ask";
    FX.ambCalm(false);
    startLoop();
    FX.sfx("qin");
    FX.bgmDuck(false);
    saveGame();
  }
  function renderTop() {
    if (G.mode === "rush") {
      const w = P.rp && P.rp.who >= 0 && P.phase !== "result" ? G.units[P.rp.who] : null;
      $("#plLb").innerHTML = `<b>${w ? esc(G.team ? w.name + "・" + member(w).name : w.name) + " が回答中" : "早押しバトル"}</b><small>第 ${G.round} 問・先に ${G.opt.target} 問正解で勝ち</small>`;
      $("#plBar").hidden = !P.lim;
      paintTime(true);
      return;
    }
    const u = cur(), mb = member(u);
    const sub = G.mode === "bomb" ? "ROUND " + G.round : G.mode === "tower" ? (u.floor + 1) + "階・" + fmtN(R.LADDER[u.floor]) + " pt に挑戦" + (R.SAFE[u.floor + 1] ? "（チェックポイント）" : "") : "第 " + (u.asked + 1) + " 問 / " + G.opt.rounds + (u.combo >= 2 ? "・" + u.combo + "問連続中" : "");
    $("#plLb").innerHTML = `<b style="--c:${u.color}">${esc(G.team ? u.name + "・" + mb.name : u.name)}</b><small>${sub}</small>`;
    $("#plBar").hidden = !P.lim;
    paintTime(true);
  }
  function renderStrip() {
    if (G.units.length < 2) { $("#plStrip").hidden = true; return; }
    $("#plStrip").hidden = false;
    $("#plStrip").classList.toggle("dense", G.units.length >= 4);
    /* ★★ 2026-11-05 ご指定「上に表示されるプレイヤーのサイズは同じに」「順番で並べて」→ 同じ幅の札を順番どおりに（CSS は grid-auto-columns） */
    const onK = G.mode === "rush" ? (P.rp ? P.rp.who : -1) : G.cur;
    $("#plStrip").innerHTML = G.units.map((u, i) => `<div class="uc${u.k === onK ? " on" : ""}${u.out ? " out" : ""}${u.stopped ? " stop" : ""}" style="--c:${u.color}"><i class="uc-n">${i + 1}</i>${avatar({ name: u.name, color: u.color, acc: G.team ? null : u.members[0].acc, icon: G.team ? "team" : null }, "xs")}<span class="uc-t"><b>${esc(u.name)}</b><em>${statusHTML(u)}</em></span></div>`).join("");
    const st = $("#plStrip"), on = $("#plStrip .uc.on"); if (on) st.scrollLeft = on.offsetLeft - (st.clientWidth - on.offsetWidth) / 2;
  }
  const heartsHTML = (max, left) => Array.from({ length: max }, (_, i) => `<u class="h${i < left ? " on" : ""}">♥</u>`).join("");
  function statusHTML(u) {
    if (u.out && G.mode !== "tower") return '<u class="o">OUT</u>';
    if (G.mode === "bomb") return heartsHTML(G.opt.hearts, u.lives) + (u.miss ? `<u class="m">✕${u.miss}${G.opt.miss ? "/" + G.opt.miss : ""}</u>` : "");
    if (G.mode === "rush") return `<u class="p">${u.score}</u><u class="q">/${G.opt.target}</u>` + heartsHTML(G.opt.hearts, u.lives);
    if (G.mode === "tower") return `<u class="p">${u.floor}階</u>` + (u.stopped ? '<u class="q">確定</u>' : u.out ? '<u class="o">終了</u>' : heartsHTML(G.opt.miss, towerLife(u)));
    return esc(statusText(u));
  }
  function renderQ() {
    const x = P.x, q = x.q;
    const tags = [Q.fieldName(q.f), Q.topicName(q.t)].filter(Boolean).map((t) => `<span>${esc(t)}</span>`).join("");
    $("#plQ").innerHTML = `<div class="q-tags">${tags}${x.calc ? `<span class="calc">${ic("calc")}計算</span>` : ""}${q.type === "m" ? '<span class="multi">すべて選ぶ</span>' : ""}</div>` +
      (q.ctx ? `<div class="q-ctx">${Q.fmt(q.ctx)}</div>` : "") +
      `<div class="q-tx">${Q.fmt(q.q)}</div>` +
      (q.fig && F() ? `<div class="fig">${F().make(q.fig) || ""}</div>` : "") +
      (P.hint ? `<div class="q-hint">${ic("hint")}<span>${Q.fmt(P.hint)}</span></div>` : "");
    renderOpts();
  }
  const F = () => window.MCLFig;
  function renderOpts() {
    const q = P.q, box = $("#plA");
    if (q.type === "n") {
      box.innerHTML = `<div class="ansn"><input id="numIn" inputmode="decimal" autocomplete="off" placeholder="数値を入力" value="${esc(P.sel || "")}"><span>${q.u ? Q.fmt(q.u) : ""}</span></div>`;
      const inp = $("#numIn"); inp.addEventListener("input", () => { P.sel = inp.value; paintGo(); });
      return;
    }
    const vis = P.ord.filter((i) => !P.hidden[i]);
    const short = vis.every((i) => Q.plain(q.o[i]).length <= 9), n = vis.length;
    box.innerHTML = (q.type === "m" ? `<p class="ans-n">${ic("check")}あてはまるものを<b>すべて</b>選んでから、ブザーを押してください</p>` : "") +
      `<div class="ans${short ? " two" : ""}${n > 6 ? " many" : ""}">` + P.ord.map((i, k) => {
        if (P.hidden[i]) return "";
        const st = isSel(i) ? " sel" : "";
        return `<button class="op${st}" data-a="pick" data-i="${i}"><span class="op-l">${lab(k)}</span><span class="op-t">${Q.fmtOpt(q, q.o[i])}</span></button>`;
      }).join("") + "</div>";
  }
  const isSel = (i) => (P.q.type === "m" ? P.sel.indexOf(i) >= 0 : P.sel === i);
  function canSubmit() {
    const q = P.q;
    if (q.type === "m") return P.sel.length > 0;
    if (q.type === "n") return !!(M && isFinite(M.parseNum(P.sel)));
    return P.sel != null;
  }
  const ITEM = { ff: ["half", "しぼる"], hint: ["hint", "ヒント"], swap: ["swap", "チェンジ"], ask: ["people", "みんなの声"] };
  function renderBot() {
    const u = cur(), items = Object.keys(ITEM).filter((k) => u.items && k in u.items);
    $("#plBot").innerHTML = `<div class="bt-go" id="btGo"></div><div class="bt-r">` +
      `<button class="tl" data-a="pad" data-v="draw">${ic("pen")}<span>メモ</span></button><button class="tl" data-a="pad" data-v="calc">${ic("calc")}<span>電卓</span></button><button class="tl" data-a="pad" data-v="const">${ic("table")}<span>公式</span></button>` +
      (items.length ? '<i class="bt-sp"></i>' : "") +
      items.map((k) => `<button class="tl it" data-a="item" data-v="${k}"${u.items[k] ? "" : " disabled"}>${ic(ITEM[k][0])}<span>${ITEM[k][1]}</span></button>`).join("") +
      (G.mode === "tower" && u.floor >= 1 ? `<i class="bt-sp"></i><button class="tl dr" data-a="drop">${ic("stop")}<span>降りる</span></button>` : "") + "</div>";
    paintGo();
    Pad.paintBtn();
  }
  function paintGo() {
    const b = $("#btGo"); if (!b) return;
    const ok = P.phase !== "result" && canSubmit();
    b.classList.toggle("on", ok);
    if (ok) {
      const q = P.q, lb = q.type === "m" ? P.sel.map((i) => P.ord.indexOf(i)).sort((a, b) => a - b).map(lab).join("・") : q.type === "n" ? P.sel : lab(P.ord.indexOf(P.sel));
      b.innerHTML = buzzBtn("decide", `<em>${esc(lb)}</em> で決定`, "wide");
    } else b.innerHTML = "";
  }
  function pick(i) {
    if (P.phase !== "ask" || P.paused || P.hidden[i]) return;
    const q = P.q;
    if (q.type === "m") { const k = P.sel.indexOf(i); if (k >= 0) P.sel.splice(k, 1); else P.sel.push(i); }
    else P.sel = P.sel === i ? null : i;
    FX.sfx("sel");
    $$("#plA .op").forEach((b) => b.classList.toggle("sel", isSel(+b.dataset.i)));
    paintGo();
  }
  function decide() {
    if (P.phase !== "ask" || P.paused || !canSubmit()) return;
    FX.sfx("buzz");
    const b = $("#btGo .buzz"); if (b) b.classList.add("hit");
    reveal(Q.judge(P.q, P.sel), "");
  }

  /* ══ 時間 ══ */
  function startLoop() { if (raf) return; last = performance.now(); raf = requestAnimationFrame(tick); }
  function stopLoop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
  function tick(now) {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.25, (now - last) / 1000); last = now;
    if ((P.phase !== "ask" && P.phase !== "rush") || P.paused || sheetOpen() || document.visibilityState === "hidden") return;
    if (P.phase === "rush") { rushTick(dt); return; }
    P.spent += dt;
    if (P.lim) { P.left -= dt; paintTime(); if (P.left <= 0) { P.left = 0; reveal(false, "time"); return; } }
    if (G.mode === "bomb") bombTick(dt);
  }
  function paintTime(force) {
    const el = $("#plTm"), bar = $("#plBar i");
    if (!P.lim) { el.innerHTML = ""; el.className = "pl-tm"; return; }
    const s = Math.ceil(Math.max(0, P.left)), p = Math.max(0, P.left / P.lim);
    bar.style.transform = "scaleX(" + p.toFixed(4) + ")";
    if (s !== P.sec || force) {
      P.sec = s;
      el.innerHTML = ic("timer") + "<b>" + s + "</b>";
      const warn = s <= 10;
      el.className = "pl-tm" + (warn ? " warn" : "");
      $("#plBar").classList.toggle("warn", warn);
      if (warn && s > 0 && !force) FX.sfx("warn");
    }
  }

  /* ══ 見えない爆弾 ══ */
  function bombRound() {
    G.round++;
    const f = R.FUSE[G.opt.fuse] || R.FUSE.mid;
    G.b = { fuse: 0, max: f.r[0] + Math.random() * (f.r[1] - f.r[0]), k: 0.82 + Math.random() * 0.42, s: Math.random() * 6, ph: 0, tick: 0.6, beat: 2, tk: false,
      quiet: Math.random() < 0.55 ? 3 + Math.random() * 4 : 0, passAt: -1, passBy: "" };
    if (cur().out) G.cur = nextActive();
    FX.ambOn(false);
    saveGame();
    turnScreen({ u: cur(), head: "ROUND " + G.round, sub: "どこかに爆弾がある。<br>いつ爆発するかは、だれにも見えない。", extra: standings(), ms: 2000, say: false,
      go: () => { FX.sfx("ignite"); FX.ambOn(true); FX.ambSet(0, 1); askFor(); } });
  }
  function bombTurn(head) {
    turnScreen({ u: cur(), head: head || "次はあなた", extra: standings(), go: askFor, say: head && /パス/.test(head) ? "pass" : "turn" });
  }
  function bombTick(dt) {
    const B = G.b;
    B.fuse += dt; B.ph += dt;
    const p = B.fuse / B.max;
    /* 見せる危なさ：本当の進みを k でずらして、ゆっくりゆらす＝のこり時間は読めない */
    const v = Math.max(0, Math.min(1, p * B.k + Math.sin(B.ph * 0.31 + B.s) * 0.06 + Math.sin(B.ph * 0.83) * 0.02));
    FX.ambSet(v, dt);
    /* チクタクと鼓動はだんだん速く。爆発の直前に、ふっと音が消えることがある */
    const silent = B.quiet && B.fuse > B.max - B.quiet;
    B.tick -= dt;
    if (B.tick <= 0) { if (!silent) FX.sfx(B.tk ? "tick" : "tock"); B.tk = !B.tk; B.tick = Math.max(0.2, 0.95 - 0.72 * v + (Math.random() - 0.5) * 0.08); }
    B.beat -= dt;
    if (B.beat <= 0 && v > 0.35) { if (!silent) { FX.sfx("beat"); if (v > 0.7) FX.vib(30); } B.beat = Math.max(0.6, 2.4 - 1.9 * v); }
    if (B.fuse >= B.max) explode();
  }
  function explode() {
    const u = cur(), B = G.b, q = P.q;
    P.phase = "boom"; stopLoop(); Pad.close();
    if (sheetOpen()) closeSheet("silent");
    u.boom++; u.lives = Math.max(0, u.lives - 1); u.combo = 0;
    /* 間一髪：爆発の15秒以内にパスした人（称号） */
    if (B.passAt >= 0 && B.fuse - B.passAt <= 15) { const pu = G.units.find((x) => x.name === B.passBy); if (pu && pu !== u) pu.near = (pu.near || 0) + 1; }
    const isOut = u.lives <= 0;
    if (isOut) { u.out = true; u.outAt = ++G.outN; }
    G.log.push({ id: q.id, u: u.k, m: u.mi || 0, ok: null, sel: null, ord: P.ord.slice(), why: "boom", ms: Math.round(P.spent * 1000) });
    FX.ambOn(false); FX.bgmStop(); FX.sfx("boom"); FX.vib([220, 70, 260]);
    $("#play").classList.add("blast");
    FX.explode(); FX.shake("bshake");
    FX.stamp("<b>BOOM!</b>", "boom", 1700);
    setTimeout(() => host(isOut ? "out" : "boom", { p: nmOf(u) }), 1650);
    const r = { kind: "boom", ok: false, after: "round", isOut, len: B.max, gap: B.passAt >= 0 ? B.fuse - B.passAt : -1, by: B.passBy };
    G.pend = { after: "round", kind: "boom" };
    saveGame();
    setTimeout(() => {
      $("#play").classList.remove("blast");
      markOpts();
      P.phase = "result"; P.res = r;
      renderStrip(); showResult(r);
      FX.music("bomb");
      if (isOut) { FX.sfx("out"); FX.stamp("OUT", "out", 1300); }
    }, 1500);
  }

  /* ══ 答え合わせ（ここから先は時間が止まっている） ══ */
  function reveal(ok, why) {
    const u = cur(), x = P.x, q = P.q;
    const rush = G.mode === "rush";
    if (!rush) { P.phase = "result"; Pad.close(); FX.ambCalm(true); }
    if (sheetOpen()) closeSheet("silent");
    $("#plQ").classList.remove("in");
    u.n++; if (ok) u.ok++;
    u.ms += P.spent * 1000;
    if (x.calc) { u.calcN++; if (ok) u.calcOk++; }
    const fa = u.fs[x.f] || (u.fs[x.f] = { ok: 0, n: 0 }); fa.n++; if (ok) fa.ok++;
    const ta = u.ts[q.t] || (u.ts[q.t] = { ok: 0, n: 0 }); ta.n++; if (ok) ta.ok++;
    G.log.push({ id: x.id, u: u.k, m: u.mi || 0, ok: !!ok, sel: Array.isArray(P.sel) ? P.sel.slice() : P.sel, ord: P.ord.slice(), why, ms: Math.round(P.spent * 1000) });
    if (ok) { u.combo++; u.best = Math.max(u.best, u.combo); } else u.combo = 0;
    if (rush) { rushJudge(ok, why); return; }
    const r = { kind: ok ? "ok" : why === "time" ? "time" : "ng", ok, gain: 0, after: "next" };

    if (G.mode === "bomb") {
      if (ok) {
        r.after = "pass"; const B = G.b; B.passAt = B.fuse; B.passBy = u.name;
      } else {
        u.miss++;
        /* ★★ 2026-11-05 ご指定「間違えすぎのアウトはハートが一つなくなるように」→ ミスの上限でライフ −1。ミスは0に戻り、爆弾は次の人へ。ライフ0でアウト */
        if (G.opt.miss && u.miss >= G.opt.miss) {
          u.miss = 0; u.lives = Math.max(0, u.lives - 1); r.heart = true; r.after = "pass";
          if (u.lives <= 0) { u.out = true; u.outAt = ++G.outN; r.isOut = true; }
        } else r.after = "again";
      }
    } else if (G.mode === "tower") {
      if (ok) {
        u.floor++; u.score = R.LADDER[u.floor - 1];
        r.safe = !!R.SAFE[u.floor]; r.floor = u.floor;
        if (u.floor >= R.LADDER.length) { u.done = true; r.top = true; }
      } else {
        const from = u.floor; let f = 0;
        Object.keys(R.SAFE).forEach((k) => { if (from >= +k) f = Math.max(f, +k); });
        u.floor = f; u.score = f ? R.LADDER[f - 1] : 0; r.fell = from - f; r.floor = f;
        u.miss++;
        if (G.opt.miss && u.miss >= G.opt.miss) { u.out = true; u.done = true; u.outAt = ++G.outN; r.isOut = true; }
      }
    } else {
      u.asked++;
      if (ok) {
        const S = R.SCORE, base = S.base[x.lv] + (x.calc ? S.calc : 0), tm = P.lim ? Math.round(S.time * Math.max(0, P.left) / P.lim) : Math.round(S.time * 0.5), cb = Math.min(S.comboMax, (u.combo - 1) * S.comboStep);
        r.gain = base + tm + cb; r.parts = [base, tm, cb]; u.score += r.gain;
      }
      if (G.opt.miss && !ok) u.miss++;
    }

    G.pend = { after: r.after, kind: r.kind };
    P.res = r;
    markOpts();
    renderStrip();
    FX.bgmDuck(true);
    /* 演出 */
    const rc = $("#plMain").getBoundingClientRect();
    if (ok) {
      FX.sfx("ok"); FX.vib(20);
      FX.stamp(GOOD, "good", 750);
      FX.burst(rc.left + rc.width / 2, rc.top + rc.height * 0.4, 30, ["#ffe33d", "#fff", "#6df0b2"], 460);
      if (r.top) { setTimeout(() => { FX.sfx("win"); FX.confetti(160); }, 300); }
      else if (r.safe) setTimeout(() => FX.sfx("check"), 260);
      else if (G.mode === "tower") setTimeout(() => FX.sfx("climb", u.floor), 240);
    } else {
      FX.sfx(why === "time" ? "time" : "ng"); FX.vib([30, 40, 30]);
      FX.stamp(BAD, "bad", 750);
      FX.shake("nshake");
      if (r.fell) setTimeout(() => FX.sfx("fall"), 260);
      if (r.isOut) setTimeout(() => { FX.sfx("out"); FX.stamp("OUT", "out", 1300); }, 620);
      else if (r.heart) setTimeout(() => { FX.sfx("out"); FX.stamp("♥ −1", "heart", 1100); }, 620);
    }
    saveGame();
    setTimeout(() => { if (P.res === r) showResult(r); }, ok ? 520 : 640);
    /* ★★ 2026-11-08 司会キャラのひとこと */
    const hv = { p: nmOf(u), n: u.combo, f: u.floor };
    setTimeout(() => {
      if (r.isOut) host("out", hv);
      else if (r.top) host("top", hv);
      else if (r.heart) host("heart", hv);
      else if (r.fell) host("fall", hv);
      else if (r.safe) host("safe", hv);
      else if (ok && u.combo >= 3) host("combo", hv, u.combo >= 5 ? { cut: true } : {});
      else if (ok && G.mode === "tower") host("climb", hv);
      else host(ok ? "ok" : why === "time" ? "time" : "ng", hv);
    }, ok ? 380 : 700);
  }
  function markOpts() {
    const q = P.q, cor = Q.answers(q);
    if (q.type === "n") { const i = $("#numIn"); if (i) { i.readOnly = true; i.classList.add(P.res && P.res.ok ? "ok" : "ng"); } }
    /* 消した選択肢も、答え合わせでは見せる */
    if (Object.keys(P.hidden).length) { P.hidden = {}; renderOpts(); }
    $$("#plA .op").forEach((b) => {
      const i = +b.dataset.i, picked = P.q.type === "m" ? (P.sel || []).indexOf(i) >= 0 : P.sel === i;
      b.disabled = true; b.classList.remove("sel");
      if (cor.indexOf(i) >= 0) b.classList.add("cor", ...(picked || q.type !== "m" ? [] : ["miss"]));
      else if (picked) b.classList.add("wr"); else b.classList.add("dim");
    });
    $$("#plBot button").forEach((b) => { b.disabled = true; });
    paintGo();
  }
  function showResult(r) {
    const q = P.q, u = cur(), cor = Q.answers(q), lets = q.type === "n" ? M.answerText(q) : cor.map((i) => P.ord.indexOf(i)).sort((a, b) => a - b).map(lab).join("・");
    const ansTx = q.type === "n" ? M.answerText(q) : cor.map((i) => Q.fmtOpt(q, q.o[i])).join("、");
    const H = { ok: ["正解！", "good"], ng: ["ざんねん…", "bad"], time: ["時間切れ", "bad"], boom: ["ドカーン！", "boom"], drop: ["ここで降りる", "drop"], none: ["だれも答えられず", "bad"] }[r.kind];
    const nx = nextInfo(r);
    let sub = "";
    if (r.kind === "boom") {
      sub = `<b>${esc(u.name)}</b> ${r.isOut ? "はライフがなくなって<b>アウト</b>" : "のライフ −1（のこり " + u.lives + "）"}<br><small>爆弾の長さ ${U.mmss(r.len)}${r.gap >= 0 && r.by ? "・" + esc(r.by) + " が渡してから " + Math.round(r.gap) + " 秒" : ""}</small>`;
    } else if (G.mode === "bomb") {
      sub = r.ok ? "" : r.isOut ? `ミスが上限に達してライフ −1。<b>アウト</b>` : r.heart ? `ミスが上限に達して<b>ライフ −1</b>（のこり ${u.lives}）` : `ミス ${u.miss}${G.opt.miss ? " / " + G.opt.miss : ""}`;
    } else if (G.mode === "rush") {
      sub = r.ok ? `<b>${esc(u.name)}</b> +1（${u.score} / ${G.opt.target}）${r.win ? "<br><b>先取達成！</b>" : ""}` : "次の問題へ進みます";
    } else if (G.mode === "tower") {
      sub = r.kind === "drop" ? `<b>${fmtN(u.score)} pt</b> で確定しました`
        : r.top ? `<b>てっぺん到達！ ${fmtN(u.score)} pt</b>`
        : r.ok ? `<b>${r.floor}階</b>へ！ ${fmtN(u.score)} pt${r.safe ? "<br><small>チェックポイント通過：ここより下には落ちません</small>" : ""}`
        : `${r.fell ? r.fell + "階ぶん転落 → " : ""}<b>${r.floor}階</b>（${fmtN(u.score)} pt）・ライフ −1（のこり ${towerLife(u)}）${r.isOut ? "<br><b>ここで終わり</b>" : ""}`;
    } else if (r.ok) {
      sub = `<b>+${fmtN(r.gain)} 点</b><br><small>正解 ${r.parts[0]}・速さ ${r.parts[1]}${r.parts[2] ? "・連続 " + r.parts[2] : ""}</small>`;
    } else sub = "連続正解がとぎれました";
    /* 解説：まちがえたとき・設定「いつも開く」・横に広い画面（場所があるので）は最初から開く */
    const open = !r.ok || FX.opt.sol || matchMedia("(min-width:900px) and (orientation:landscape)").matches;
    const sol = `<details class="rs-sol"${open ? " open" : ""}><summary>${ic("book")}解説を見る</summary><div class="rs-tx">${Q.fmt(q.s)}</div>${q.sfig && F() && F().make(q.sfig) ? `<div class="fig">${F().make(q.sfig)}</div>` : ""}</details>`;
    const box = $("#plRes");
    box.className = "pl-res " + r.kind;
    box.innerHTML = `<button class="rs-grip" data-a="resMin" aria-label="問題を見る"><i></i></button>
      <div class="rs-sc"><div class="rs-h"><span class="rs-m ${H[1]}">${r.ok ? ic("check") : r.kind === "boom" ? ic("flame") : r.kind === "drop" ? ic("stop") : r.kind === "time" ? ic("timer") : ic("x")}</span><div class="rs-t"><b>${H[0]}</b>${sub ? `<p>${sub}</p>` : ""}</div></div>
      ${r.ok ? "" : `<div class="rs-a"><span>正解 ${esc(q.type === "n" ? "" : lets)}</span><b>${ansTx}</b></div>`}
      ${q.k ? `<div class="rs-k"><span>ポイント</span>${Q.fmt(q.k)}</div>` : ""}
      ${sol}</div>
      <div class="rs-f"><p class="rs-stop">${ic("pause")}時間は止まっています。ゆっくり確認してね</p>${buzzBtn("next", nx.label, "wide")}</div>`;
    box.hidden = false;
    box.classList.remove("min");
    $("#play").classList.add("res-on");
    void box.offsetWidth; box.classList.add("in");
  }
  function hideResult() {
    const box = $("#plRes"); if (!box) return;
    box.hidden = true; box.classList.remove("in", "min"); $("#play").classList.remove("res-on");
  }
  /* 次のボタンの文字 */
  function nextInfo(r) {
    const after = r.after;
    if (G.mode === "rush") return { label: rushOver() ? "結果発表へ" : "次の問題へ" };
    if (G.mode === "bomb") {
      if (after === "again") return { label: "もう1問" };
      if (after === "round") {
        const left = alive().length;
        return { label: left <= 1 ? "結果発表へ" : "次のラウンドへ" };
      }
      if (alive().length <= 1) return { label: "結果発表へ" };
      const n = nextActive();
      return { label: esc(G.units[n].name) + " へパス" };
    }
    const n = nextActive();
    if (n < 0) return { label: "結果発表へ" };
    if (G.units.length === 1) return { label: "次の問題へ" };
    return { label: "次は " + esc(G.units[n].name) };
  }
  const rushOver = () => G.units.some((u) => u.score >= G.opt.target) || alive().length <= 1 || G.round >= RU.maxQ;
  function proceed() {
    const r = P.res; if (!r) return;
    P.res = null; G.pend = null;
    hideResult(); FX.bgmDuck(false);
    if (G.mode === "rush") { if (rushOver()) finish(); else rushNext(); return; }
    if (G.mode === "bomb") {
      if (r.after === "again") { askFor(); return; }
      if (alive().length <= 1) { finish(); return; }
      if (r.after === "round") { bombRound(); return; }
      const from = cur(), n = nextActive();
      G.cur = n; const u = cur(); u.mi = (u.mi || 0) + 1;
      FX.sfx("pass"); FX.sweep("PASS", u.color);
      saveGame();
      setTimeout(() => bombTurn(esc(from.name) + " からパス"), 260);
      return;
    }
    const n = nextActive();
    if (n < 0) { finish(); return; }
    if (n !== G.cur || G.units.length === 1) { G.cur = n; const u = cur(); u.mi = (u.mi || 0) + 1; }
    saveGame();
    nextTurn();
  }


  /* ══════════════════════════════════════════════════════════════
     ★★ 2026-11-05 早押しバトル（ご指定「提案の早押しモードを最初に追加実装」）
     ・問題文が1文字ずつ出る（P.rp.st＝"read"）→ 文が出おわると選択肢をみんなに見せて、少しのあいだ押せる（"wait"）。
     ・ブザーを押した人だけが答える（"answer"＝P.phase は "ask"・選ぶ→決定は ほかの遊び方と同じ）。★文は押したところで止まる。
     ・正解 +1。先に G.opt.target 問正解で勝ち。
     ・お手つき（まちがい・時間切れ）＝ライフ −1＋その問題はもう押せない。文のつづきが出て、のこりの人が押せる。
     ・だれも正解しないまま終わったら答えと解説を見せて次の問題へ。解説のあいだは時間が止まる。
     ・ブザーは click ではなく pointerdown（2人が同時に押しても、先に届いた1人だけ）。パソコンは数字キー 1〜8 でも押せる。
     ══════════════════════════════════════════════════════════════ */
  const RU = R.RUSH;
  const resetSel = () => { P.sel = P.q.type === "m" ? [] : P.q.type === "n" ? "" : null; };
  /* 文字を1文字ずつの span に分ける（opacity で出すので、文の位置は最初から動かない） */
  function splitChars(root, out) {
    Array.from(root.childNodes).forEach((n) => {
      if (n.nodeType === 3) {
        const f = document.createDocumentFragment();
        Array.from(n.nodeValue).forEach((ch) => { const s = document.createElement("span"); s.className = "rc"; s.textContent = ch; f.appendChild(s); out.push(s); });
        n.parentNode.replaceChild(f, n);
      } else if (n.nodeType === 1 && n.tagName !== "BR") splitChars(n, out);
    });
  }
  function rushNext() {
    G.round++;
    const x = G.round > RU.maxQ ? null : Q.pick(G._pool, G._used, { notCtx: G.lastCtx });
    if (!x) { finish(); return; }
    Object.assign(P, { x, q: x.q, ord: Q.order(x.q), lab: Q.labels(x.q), hidden: {}, hint: "", spent: 0, sec: -1, res: null, paused: false, lim: 0, left: 0 });
    resetSel();
    P.rp = { st: "read", pos: 0, shown: 0, spans: [], lock: {}, who: -1, from: "read" };
    G._used.add(x.id); G.used = Array.from(G._used); G.lastCtx = x.q.ctx || "";
    Q.markUsed(x.id);
    Pad.close(); Pad.next(x.q.t);
    show("play");
    hideResult();
    const pl = $("#play"); pl.classList.remove("paused"); pl.classList.add("rush-read");
    renderTop(); renderStrip(); renderQ();
    $("#plA").innerHTML = "";
    $$("#plQ .q-ctx, #plQ .q-tx").forEach((el) => splitChars(el, P.rp.spans));
    rushBot();
    $("#plMain").scrollTop = 0; $("#plQ").scrollTop = 0;
    const qc = $("#plQ"); qc.classList.remove("in"); void qc.offsetWidth; qc.classList.add("in");
    P.phase = "rush";
    startLoop();
    FX.sfx("qin"); FX.bgmDuck(false);
    saveGame();
  }
  function rushBot() {
    const n = G.units.length;
    $("#plBot").innerHTML = `<div class="bz n${n}">` + G.units.map((u) => {
      const lock = u.out || P.rp.lock[u.k];
      return `<button class="bz-b${lock ? " lock" : ""}" data-u="${u.k}" style="--c:${u.color}"${lock ? " disabled" : ""}><b>${esc(u.name)}</b><small>${u.out ? "OUT" : P.rp.lock[u.k] ? "お手つき" : u.score + " / " + G.opt.target}</small></button>`;
    }).join("") + "</div>";
  }
  function rushTick(dt) {
    const rp = P.rp;
    if (rp.st === "read") {
      rp.pos += (RU.read[G.opt.speed] || RU.read.mid).cps * dt;
      const to = Math.min(rp.spans.length, Math.floor(rp.pos));
      while (rp.shown < to) rp.spans[rp.shown++].classList.add("on");
      /* 読んでいるところが画面の外に出たら、ついていく（長い文のとき） */
      if (rp.shown && rp.shown % 12 === 0) {
        const box = window.matchMedia("(min-width:900px) and (orientation:landscape)").matches ? $("#plQ") : $("#plMain"), b = box.getBoundingClientRect(), r = rp.spans[rp.shown - 1].getBoundingClientRect();
        if (r.bottom > b.bottom - 10) box.scrollTop += r.bottom - b.bottom + 40;
      }
      if (rp.shown >= rp.spans.length) rushWait();
    } else if (rp.st === "wait") {
      P.left -= dt; paintTime();
      if (P.left <= 0) { P.left = 0; FX.sfx("time"); rushEnd({ kind: "none", ok: false }); }
    }
  }
  /* 文が出おわった：選択肢をみんなに見せて、少しのあいだ押せる */
  function rushWait() {
    const rp = P.rp;
    rp.st = "wait"; rp.spans.forEach((s) => s.classList.add("on"));
    P.lim = P.left = P.x.calc ? RU.lastCalc : RU.last; P.sec = -1;
    $("#play").classList.remove("rush-read");
    renderTop(); renderOpts();
    $$("#plA .op").forEach((b) => { b.disabled = true; });
  }
  function rushBuzz(k) {
    const rp = P.rp;
    if (P.phase !== "rush" || P.paused || !rp || sheetOpen()) return;
    const u = G.units[k]; if (!u || u.out || rp.lock[k]) return;
    rp.from = rp.st; rp.st = "answer"; rp.who = k; rp.tried = true; G.cur = k;
    u.mi = (u.mi || 0) + 1;
    P.phase = "ask"; P.spent = 0; P.sec = -1; resetSel();
    P.lim = P.left = Q.rushLimit(P.x, G.opt.limit);
    const b = $('.bz-b[data-u="' + k + '"]'); if (b) b.classList.add("hit");
    /* ブザーのあとに出るボタン（メモなど）を、押した指の click で押してしまわないように */
    P.noClick = performance.now() + 450;
    host("buzz", { p: nmOf(u) }, { ms: 1500 });
    FX.sfx("buzz"); FX.vib(40);
    FX.flash(u.color, 200);
    FX.stamp(esc(u.name), "who", 800);
    $("#play").classList.remove("rush-read");
    renderTop(); renderStrip(); renderOpts(); renderBot();
  }
  function rushJudge(ok, why) {
    const u = cur(), rp = P.rp;
    if (ok) { u.score++; rushEnd({ kind: "ok", ok: true, win: u.score >= G.opt.target }); return; }
    u.lives = Math.max(0, u.lives - 1); rp.lock[u.k] = 1;
    if (u.lives <= 0) { u.out = true; u.outAt = ++G.outN; }
    FX.sfx(why === "time" ? "time" : "ng"); FX.vib([30, 40, 30]);
    FX.stamp(BAD, "bad", 750);
    if (u.out) setTimeout(() => { FX.sfx("out"); FX.stamp("OUT", "out", 1300); }, 620);
    setTimeout(() => host(u.out ? "out" : "otetsuki", { p: nmOf(u) }), 500);
    const rest = G.units.filter((v) => !v.out && !rp.lock[v.k]);
    if (!rest.length || alive().length <= 1) { rushEnd({ kind: "none", ok: false, last: u.k }); return; }
    /* のこりの人で、文のつづきから */
    Pad.close();
    rp.who = -1; rp.st = rp.from; resetSel(); P.phase = "rush"; P.spent = 0;
    if (rp.st === "read") { P.lim = P.left = 0; $("#plA").innerHTML = ""; $("#play").classList.add("rush-read"); }
    else { P.lim = P.left = P.x.calc ? RU.lastCalc : RU.last; P.sec = -1; renderOpts(); $$("#plA .op").forEach((b) => { b.disabled = true; }); }
    renderTop(); renderStrip(); rushBot();
    saveGame();
  }
  /* この問題はおしまい：文と選択肢をぜんぶ見せて、答えと解説へ（時間は止まる） */
  function rushEnd(r) {
    const rp = P.rp;
    P.phase = "result"; rp.st = "end"; Pad.close();
    rp.spans.forEach((s) => s.classList.add("on"));
    $("#play").classList.remove("rush-read");
    r.after = "rush";
    /* 結果の画面で「回答中」の文字と時間を残さない（11-05 に試して直したもの） */
    if (!r.ok) rp.who = -1;
    P.lim = 0; renderTop();
    if (r.kind === "none") resetSel();
    /* お手つきのあとの「だれも答えず」は、見直しに二重に入れない */
    if (r.kind === "none" && !rp.tried) { G.log.push({ id: P.x.id, u: -1, m: 0, ok: null, sel: null, ord: P.ord.slice(), why: "skip", ms: 0 }); }
    G.pend = { after: "rush", kind: r.kind };
    P.res = r;
    renderOpts(); markOpts(); renderStrip();
    FX.bgmDuck(true);
    if (r.ok) {
      const rc = $("#plMain").getBoundingClientRect();
      FX.sfx("ok"); FX.vib(20); FX.stamp(GOOD, "good", 750);
      FX.burst(rc.left + rc.width / 2, rc.top + rc.height * 0.4, 30, ["#ffe33d", "#fff", "#6df0b2"], 460);
      if (r.win) setTimeout(() => { FX.sfx("win"); FX.confetti(160); }, 300);
    }
    const ww = r.ok ? cur() : null;
    setTimeout(() => host(r.win ? "rushwin" : r.ok ? (ww.combo >= 3 ? "combo" : "ok") : "none", { p: nmOf(ww), n: ww ? ww.combo : 0 }, r.win ? {} : { noCut: true }), r.ok ? 420 : 760);
    saveGame();
    setTimeout(() => { if (P.res === r) showResult(r); }, r.ok ? 520 : 640);
  }

  /* ══ アイテム ══ */
  function useItem(k) {
    const u = cur(), q = P.q;
    if (P.phase !== "ask" || P.paused || !u.items[k]) return;
    if (k === "ff") {
      if (q.type === "n") { toast("この問題では使えません"); return; }
      const cor = Q.answers(q), wrong = P.ord.filter((i) => cor.indexOf(i) < 0 && !P.hidden[i]);
      if (wrong.length < 2) { toast("これ以上しぼれません"); return; }
      const hide = wrong.length === 2 ? 1 : Math.ceil(wrong.length / 2);
      shuffle(wrong).slice(0, hide).forEach((i) => { P.hidden[i] = 1; if (q.type === "m") { const j = P.sel.indexOf(i); if (j >= 0) P.sel.splice(j, 1); } else if (P.sel === i) P.sel = null; });
      u.items[k] = 0; renderOpts();
    } else if (k === "hint") {
      const h = Array.isArray(q.h) && q.h.length ? q.h[0] : "";
      if (!h) { toast("この問題にはヒントがありません"); return; }
      P.hint = h; u.items[k] = 0; renderQ();
      const hb = $("#plQ .q-hint"); if (hb && hb.scrollIntoView) hb.scrollIntoView({ block: "nearest", behavior: "smooth" });
    } else if (k === "swap") {
      u.items[k] = 0; FX.sfx("item"); saveGame();
      askFor(); toast("問題をかえました"); return;
    } else if (k === "ask") {
      u.items[k] = 0; openVote();
    }
    FX.sfx("item"); renderBot(); saveGame();
  }
  /* みんなの声：まわりの人が、正しいと思う答えをタップして投票（時間は止まる） */
  function openVote() {
    const q = P.q, vis = P.ord.filter((i) => !P.hidden[i]);
    P.votes = {}; vis.forEach((i) => { P.votes[i] = 0; });
    const draw = (res) => {
      const tot = Object.keys(P.votes).reduce((a, k) => a + P.votes[k], 0);
      sheet(`<h3 class="sh-t">${ic("people")}みんなの声</h3>` + (res ? `<p class="sh-p">投票の結果（${tot}票）</p>` : '<p class="sh-p">まわりのみんなは、正しいと思う答えをタップしてね（何回でも）。</p>') +
        `<div class="vt${res ? " res" : ""}">` + vis.map((i) => {
          const k = P.ord.indexOf(i), v = P.votes[i] || 0, p = tot ? Math.round(v / tot * 100) : 0;
          return `<button class="vt-b" data-a="vote" data-i="${i}" style="--p:${p}%"${res ? " disabled" : ""}><i></i><span class="op-l">${lab(k)}</span><span class="vt-t">${Q.fmtOpt(q, q.o[i])}</span><span class="vt-n">${res ? p + "%" : v}</span></button>`;
        }).join("") + "</div>" +
        `<div class="sh-b">${res ? '<button class="btn pri" data-a="close">とじる</button>' : '<button class="btn pri" data-a="voteRes">結果を見る</button>'}</div>`, { cls: "ask", lock: !res });
    };
    P.voteDraw = draw;
    draw(false);
  }

  /* ══ タワー：降りる ══ */
  function drop() {
    const u = cur();
    if (P.phase !== "ask" || G.mode !== "tower" || u.floor < 1) return;
    sheet(`<h3 class="sh-t">${ic("stop")}ここで降りますか？</h3><p class="sh-p"><b>${fmtN(u.score)} pt</b> で確定して、このタワーは終わりです。この問題の答えと解説は見られます。</p>
      <div class="sh-b"><button class="btn pri" data-a="dropYes">${fmtN(u.score)} pt で降りる</button><button class="btn" data-a="close">つづける</button></div>`);
  }
  function dropYes() {
    closeSheet("silent");
    const u = cur();
    P.phase = "result"; u.done = true; u.stopped = true;
    G.log.push({ id: P.x.id, u: u.k, m: u.mi || 0, ok: null, sel: null, ord: P.ord.slice(), why: "drop", ms: Math.round(P.spent * 1000) });
    const r = { kind: "drop", ok: false, after: "next" };
    G.pend = { after: "next", kind: "drop" };
    markOpts(); renderStrip();
    FX.bgmDuck(true); FX.sfx("check");
    P.res = r; saveGame();
    showResult(r);
    host("drop", { p: nmOf(u) });
  }

  /* ══ 一時停止 ══ */
  function pause() {
    if (!G) return;
    const running = P.phase === "ask" || P.phase === "rush";
    if (running) { P.paused = true; $("#play").classList.add("paused"); FX.ambCalm(true); }
    /* 手番の画面なら、自動で進むのを止める（つづけるを押したら進む） */
    const onTurn = P.phase === "intro" && !!P.turnT;
    if (onTurn) { clearTimeout(P.turnT); P.turnT = 0; }
    FX.bgmDuck(true);
    const back = () => { if (running) { P.paused = false; $("#play").classList.remove("paused"); FX.ambCalm(false); last = performance.now(); } if (onTurn && P.phase === "intro") turnArm(500); FX.bgmDuck(false); };
    sheet(`<h3 class="sh-t">${ic("pause")}一時停止</h3><p class="sh-p">時間は止まっています。</p>
      <div class="mn"><button class="btn" data-a="pRules">${ic("book")}あそび方</button><button class="btn" data-a="pOpts">${ic("gear")}設定</button>
      <button class="btn" data-a="pHold">${ic("home")}中断してタイトルへ<small>「つづきから」で再開できます</small></button><button class="btn danger" data-a="pQuit">${ic("x")}試合をやめる<small>記録も賞金もなし</small></button></div>
      <div class="sh-b">${buzzBtn("close", "つづける", "wide")}</div>`, { onClose: back });
    UI.pauseBack = back;
  }

  function finish() {
    if (!G || G.done) return;
    G.done = true; stopLoop(); Pad.close(); hideResult();
    FX.ambOn(false);
    clearSave();
    const g = G; G = null;
    delete document.body.dataset.mode;
    MQ.Result.open(g);
  }
  /* 試合を閉じる */
  function leave(keep) {
    clearTimeout(P.turnT); P.turnT = 0; UI.turnGo = null;
    stopLoop(); Pad.close(); hideResult(); FX.ambOn(false);
    if (keep) saveGame(); else clearSave();
    G = null; P.phase = "idle"; P.res = null;
    delete document.body.dataset.mode;
    U.openTitle();
  }

  /* ══ 操作 ══ */
  Object.assign(U.ACT, {
    turnGo: () => { FX.sfx("buzz"); goTurn(); },
    pick: (el) => pick(+el.dataset.i),
    decide: () => decide(),
    next: () => { FX.sfx("buzz"); proceed(); },
    item: (el) => useItem(el.dataset.v),
    drop: () => drop(),
    dropYes: () => dropYes(),
    pad: (el) => { FX.sfx("tap"); Pad.toggle(el.dataset.v); Pad.paintBtn(); },
    pause: () => { FX.sfx("tap"); pause(); },
    pRules: () => { const f = UI.pauseBack; closeSheet("silent"); UI.rulesBack = () => pauseAgain(f); U.openRules(); },
    pOpts: () => { const f = UI.pauseBack; closeSheet("silent"); UI.optBack = () => pauseAgain(f); U.openOpts(); },
    pHold: () => { closeSheet("silent"); leave(true); },
    pQuit: () => { const f = UI.pauseBack; closeSheet("silent"); sheet(`<h3 class="sh-t">${ic("x")}試合をやめますか？</h3><p class="sh-p">この試合の記録と賞金はなくなります。</p><div class="sh-b"><button class="btn danger" data-a="pQuitYes">やめる</button><button class="btn" data-a="close">もどる</button></div>`, { onClose: () => pauseAgain(f) }); },
    pQuitYes: () => { closeSheet("silent"); leave(false); },
    vote: (el) => { const i = +el.dataset.i; P.votes[i] = (P.votes[i] || 0) + 1; FX.sfx("tap"); const n = el.querySelector(".vt-n"); if (n) n.textContent = P.votes[i]; },
    voteRes: () => { FX.sfx("item"); P.voteDraw(true); },
    resMin: () => { const b = $("#plRes"); if (b) b.classList.toggle("min"); FX.sfx("tap"); },
  });
  function pauseAgain(f) { UI.rulesBack = null; UI.optBack = null; if (f) f(); pause(); }

  document.addEventListener("keydown", (e) => {
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if (document.body.dataset.scr === "turn" && (e.key === "Enter" || e.key === " ") && !sheetOpen()) { e.preventDefault(); U.ACT.turnGo(); return; }
    if (document.body.dataset.scr !== "play" || sheetOpen()) return;
    const k = e.key.toUpperCase();
    if (P.phase === "rush") {
      if (/^[1-8]$/.test(k) && G.units[+k - 1]) rushBuzz(+k - 1);
      else if (e.key === "Escape") pause();
      return;
    }
    if (P.phase === "ask") {
      const idx = /^[1-9]$/.test(k) ? +k - 1 : k === "0" ? 9 : LET.indexOf(k);
      if (idx >= 0 && P.ord[idx] != null) { pick(P.ord[idx]); return; }
      if (e.key === "Enter") { decide(); return; }
      if (e.key === "Escape") { pause(); return; }
    } else if (P.phase === "result" && e.key === "Enter") { U.ACT.next(); }
  });

  document.addEventListener("click", (e) => { if (performance.now() < (P.noClick || 0)) { e.stopPropagation(); e.preventDefault(); } }, true);
  /* ブザーは click だと遅れて、同時に押すと取りこぼすので pointerdown で受ける */
  document.addEventListener("pointerdown", (e) => {
    const b = e.target && e.target.closest ? e.target.closest(".bz-b") : null;
    if (!b || b.disabled) return;
    e.preventDefault();
    rushBuzz(+b.dataset.u);
  });

  MQ.Play = { start, resume, saved, mode: () => (G ? G.mode : ""), peek: () => ({ G, P }) };
})();
