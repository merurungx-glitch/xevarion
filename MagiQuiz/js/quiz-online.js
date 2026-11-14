/* ============================================================
   MagiQuiz — quiz-online.js（2台で対戦）
   ★★ 2026-11-08 ご指定「以前の提案の 5 の2台での対戦（それぞれの端末で遊べるように）」
   ------------------------------------------------------------
   ・それぞれの端末で、<b>同じ問題に同時に</b>答えるスピード勝負（2〜4台）。
     正解 100 点（計算 +50）＋速さ 最大 +100＋いちばん早く正解した人 +30。決めた問題数（5・10・15）の合計で順位。
   ・部屋：「部屋をつくる」→ 4桁の番号を相手に伝える →「部屋に入る」で番号を入れる。ルールは部屋をつくった人（ホスト）が決めて開始。
   ・問題の並び（id と選択肢の順）はホストが最初に決めて state.list に置く。問題の中身は各端末の MagiChemLex のデータを読む（通信量が少ない）。
   ・時刻はサーバーの時刻（MQNet.now）。ホストが「全員が答えた／時間切れ」で答え合わせ（rv）、「全員が次へ／45秒」で次の問題へ。
     ホストの通信が切れたら、つながっている人のうち席の番号がいちばん小さい人がホストを引きつぐ。
   ・XEVA：自分の端末の自分の分だけ（XEVARION のアカウントがあれば。オフラインになっても財布へ直接）。1試合1回（magiquiz_online_paid_v1）。
     賞金・戦績は quiz-account.js の report（本人＝owner）。
   ・データ：rooms/Q<4桁>/{ meta:{host,status:"wait"|"play"|"end",createdAt,app,gen}, players/{pid}:{name,charFile,slot,ready,online,left,joinedAt},
             state:{cfg,list,seats,qi,phase:"q"|"rv"|"end",at,rvAt}, acts/{qi}/{pid}:{a,sel,ok,ms,nx} }
   ============================================================ */
(function () {
  "use strict";
  const MQ = window.MQ, Q = MQ.Data, A = MQ.Account, FX = MQ.FX, U = MQ.U;
  const { $, $$, esc, fmtN, ic, avatar, buzzBtn, sheet, closeSheet, sheetOpen, show, toast, COLORS, LET } = U;
  const M = window.MCL;
  const NET = () => window.MQNet;
  const HOST = () => MQ.Host;
  const ROOT = "rooms/";
  const PID_KEY = "magiquiz_pid_v1", PAID_KEY = "magiquiz_online_paid_v1";
  const MAXP = 4;
  const O = { code: "", pid: "", room: null, unsub: null, loop: 0, view: "", qi: -1, phase: "", sel: null, sent: false, hostBusy: false, said: {}, lastBuild: "" };

  /* ══ 自分 ══ */
  function myPid() {
    /* 1台のパソコンの2つのタブで試すとき（タブごとに別の人になる）。ふだんは使わない */
    try { const s = sessionStorage.getItem("magiquiz_pid_s"); if (s) return s; } catch (e) {}
    const a = A.me();
    if (a && a.uid) return "u" + String(a.uid).replace(/[^A-Za-z0-9_-]/g, "");
    try {
      let p = localStorage.getItem(PID_KEY);
      if (!p) { p = "g" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); localStorage.setItem(PID_KEY, p); }
      return p;
    } catch (e) { return "g" + Math.random().toString(36).slice(2, 10); }
  }
  function myProfile() {
    const a = A.me();
    let nm = a && a.name ? a.name : "プレイヤー";
    try { const s = sessionStorage.getItem("magiquiz_name_s"); if (s) nm = s; } catch (e) {}
    return { name: String(nm).slice(0, 12), charFile: a && a.charFile ? String(a.charFile) : "" };
  }
  const path = (s) => ROOT + O.code + (s ? "/" + s : "");
  const now = () => (NET() ? NET().now() : Date.now());

  /* ══ 部屋の情報 ══ */
  const R = () => O.room || {};
  const players = () => R().players || {};
  const isHost = () => !!(R().meta && R().meta.host === O.pid);
  const pinfo = (pid) => players()[pid] || { name: "?", slot: 0 };
  const colorOf = (pid) => COLORS[(pinfo(pid).slot | 0) % COLORS.length];
  const seatList = () => Object.keys(players()).filter((p) => !players()[p].left).sort((a, b) => (players()[a].slot | 0) - (players()[b].slot | 0));
  const activeList = () => seatList().filter((p) => players()[p].online !== false);
  let IDX = null;
  function item(id) {
    if (!IDX) { IDX = {}; Q.all().forEach((x) => { IDX[x.id] = x; }); }
    return IDX[id] || null;
  }
  const limOf = (x) => Math.max(15, Q.limitOf(x, (R().state && R().state.cfg && R().state.cfg.limit) || "mid") || 45);
  const actsAt = (qi) => ((R().acts || {})[qi]) || {};

  /* ══ 入口 ══ */
  function waitNet(ms) {
    if (NET()) return Promise.resolve(NET());
    return new Promise((ok) => {
      const t = setTimeout(() => ok(NET() || null), ms || 6000);
      window.addEventListener("mqnet:ready", () => { clearTimeout(t); ok(NET()); }, { once: true });
    });
  }
  async function openEntry() {
    if (navigator.onLine === false) { toast("2台で対戦はインターネットが必要です（オフラインのときは1台で遊べます）", 3200); return; }
    if (!Q || !Q.ok) { toast("問題を読みこめませんでした"); return; }
    sheet('<h3 class="sh-t">' + ic("people") + "2台で対戦</h3>" +
      '<p class="sh-p">それぞれの端末で、<b>同じ問題に同時に</b>答えるスピード勝負です（2〜4台）。速く正解するほど高得点。</p>' +
      '<div class="ol-entry"><button class="ol-big" data-a="olCreate">' + ic("plus") + "<b>部屋をつくる</b><small>4桁の番号を相手に伝えます</small></button>" +
      '<button class="ol-big" data-a="olJoinOpen">' + ic("link") + "<b>部屋に入る</b><small>相手から聞いた番号を入れます</small></button></div>" +
      (A.me() ? '<p class="ol-note">' + ic("gift") + "順位の XEVA は、それぞれの端末の XEVARION アカウントに入ります。</p>" : '<p class="ol-note">' + ic("gift") + "XEVARION にログインしていると、順位の XEVA がもらえます。</p>") +
      '<div class="sh-b"><button class="btn" data-a="close">とじる</button></div>', { cls: "ol-sh" });
  }
  function openJoin(msg, val) {
    const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "bs"];
    const v = String(val || "");
    sheet('<h3 class="sh-t">' + ic("link") + "部屋に入る</h3><p class=\"sh-p center\">部屋の番号（4桁）</p>" +
      '<div class="ol-code-in">' + [0, 1, 2, 3].map((k) => "<i>" + esc(v[k] || "") + "</i>").join("") + "</div>" +
      '<p class="lk-msg center">' + esc(msg || " ") + "</p>" +
      '<div class="lk-pad">' + keys.map((k) => (k === "" ? "<span></span>" : '<button data-a="olKey" data-v="' + k + '">' + (k === "bs" ? ic("back") : k) + "</button>")).join("") + "</div>" +
      '<div class="sh-b"><button class="btn" data-a="close">やめる</button></div>', { cls: "lk ol-sh" });
    O.typing = v;
  }
  async function create() {
    const N = await waitNet(); if (!N || !N.ok()) { toast("通信の準備ができませんでした。少し待ってからもう一度"); return; }
    O.pid = myPid();
    const pf = myProfile(), t = now();
    for (let k = 0; k < 8; k++) {
      const code = "Q" + String(1000 + Math.floor(Math.random() * 9000));
      let meta = null;
      try { meta = await N.get(ROOT + code + "/meta"); } catch (e) { toast("通信できませんでした"); return; }
      if (meta && t - (meta.createdAt || 0) < 6 * 3600000) continue;
      const S = U.setup;
      const cfg = { n: 10, limit: S.limit === "off" ? "mid" : S.limit || "mid", sets: S.sets.slice(), fields: S.fields.slice(), calc: S.calc !== false };
      try {
        await N.set(ROOT + code, {
          meta: { host: O.pid, status: "wait", createdAt: t, app: "magiquiz", gen: 1 },
          players: { [O.pid]: { name: pf.name, charFile: pf.charFile, slot: 0, ready: true, online: true, left: false, joinedAt: t } },
          state: { cfg },
        });
      } catch (e) { toast("部屋をつくれませんでした"); return; }
      closeSheet("silent");
      attach(code);
      setTimeout(() => { const H = HOST(); if (H) H.say("wait"); }, 700);
      return;
    }
    toast("部屋の番号がとれませんでした。もう一度ためしてください");
  }
  async function join(code) {
    const N = await waitNet(); if (!N || !N.ok()) { openJoin("通信の準備ができませんでした", code); return; }
    O.pid = myPid();
    const full = "Q" + code;
    let room = null;
    try { room = await N.get(ROOT + full); } catch (e) { openJoin("通信できませんでした", code); return; }
    if (!room || !room.meta || room.meta.app !== "magiquiz") { openJoin("その番号の部屋が見つかりません", ""); return; }
    const ps = room.players || {}, mine = ps[O.pid];
    if (!mine) {
      if (room.meta.status !== "wait") { openJoin("その部屋はもう始まっています", ""); return; }
      const used = {}; Object.keys(ps).forEach((p) => { if (!ps[p].left) used[ps[p].slot | 0] = 1; });
      let slot = -1; for (let s = 0; s < MAXP; s++) if (!used[s]) { slot = s; break; }
      if (slot < 0) { openJoin("その部屋は満員です（4人まで）", ""); return; }
      const pf = myProfile();
      try { await N.set(ROOT + full + "/players/" + O.pid, { name: pf.name, charFile: pf.charFile, slot, ready: true, online: true, left: false, joinedAt: now() }); }
      catch (e) { openJoin("部屋に入れませんでした", code); return; }
    } else {
      try { await N.update(ROOT + full + "/players/" + O.pid, { online: true, left: false }); } catch (e) {}
    }
    closeSheet("silent");
    attach(full);
    FX.sfx("ok");
  }
  function attach(code) {
    detach();
    O.code = code; O.view = ""; O.qi = -1; O.phase = ""; O.said = {};
    const N = NET();
    try { N.onDrop(path("players/" + O.pid), { online: false }); } catch (e) {}
    O.unsub = N.watch(path(), onRoom);
    O.loop = setInterval(tick, 250);
    try { sessionStorage.setItem("magiquiz_online_room", code); } catch (e) {}
    show("online");
    $("#online").innerHTML = '<div class="ol-load">' + ic("people") + "<p>部屋に接続しています…</p></div>";
  }
  function detach() {
    if (O.unsub) { try { O.unsub(); } catch (e) {} O.unsub = null; }
    clearInterval(O.loop); O.loop = 0;
    if (O.code && NET()) { try { NET().onDropCancel(path("players/" + O.pid)); } catch (e) {} }
    try { sessionStorage.removeItem("magiquiz_online_room"); } catch (e) {}
  }
  async function leave() {
    const N = NET(), st = R().meta && R().meta.status;
    const code = O.code;
    detach();
    if (N && code) {
      try {
        const alone = seatList().filter((p) => p !== O.pid).length === 0;
        if ((isHost() && st === "wait") || alone) await N.remove(ROOT + code);
        else await N.update(ROOT + code + "/players/" + O.pid, { left: true, online: false });
      } catch (e) {}
    }
    O.code = ""; O.room = null; O.view = "";
    HOST() && HOST().hide();
    U.openTitle();
  }

  /* ══ 部屋が変わった ══ */
  function onRoom(room) {
    if (room === undefined) return;   /* 読めなかった（通信が切れた）→ そのまま待つ */
    if (!room) {
      if (O.code) { detach(); O.code = ""; O.room = null; toast("部屋がなくなりました"); U.openTitle(); }
      return;
    }
    O.room = room;
    if (!players()[O.pid] || players()[O.pid].left) { detach(); O.code = ""; toast("部屋から出ました"); U.openTitle(); return; }
    takeOverHost();
    const st = room.state || {}, status = room.meta.status;
    if (status === "wait") { if (O.view !== "lobby") { O.view = "lobby"; FX.music("title"); } renderLobby(); return; }
    if (status === "end" || st.phase === "end") { if (O.view !== "end") { O.view = "end"; renderEnd(); } return; }
    /* play */
    if (st.qi !== O.qi) { O.qi = st.qi; O.phase = ""; O.sel = null; O.sent = false; }
    if (st.phase === "q" && O.phase !== "q") { O.phase = "q"; O.view = "play"; buildPlay(); }
    else if (st.phase === "rv" && O.phase !== "rv") { if (O.view !== "play") { O.view = "play"; buildPlay(); } O.phase = "rv"; showReveal(); }
    else if (O.view === "play") paintStrip();
    if (st.phase === "rv") paintRevealNext();
    if (isHost()) hostCheck();
  }
  /* ホストの通信が切れたら、つながっている人のうち席の番号がいちばん小さい人が引きつぐ */
  let takeT = 0;
  function takeOverHost() {
    const meta = R().meta || {}, h = players()[meta.host];
    const hostGone = !h || h.left || h.online === false;
    if (!hostGone) { takeT = 0; return; }
    if (!takeT) { takeT = Date.now(); return; }
    if (Date.now() - takeT < 6000) return;
    const cand = activeList()[0];
    if (cand !== O.pid) return;
    const old = meta.host;
    NET().tx(path("meta/host"), (cur) => (cur === old ? O.pid : cur)).catch(() => {});
    takeT = 0;
  }

  /* ══ ロビー ══ */
  function cfg() { return (R().state && R().state.cfg) || { n: 10, limit: "mid", sets: [], fields: [], calc: true }; }
  function renderLobby() {
    const c = cfg(), host = isHost(), list = seatList();
    const seg = (key, label, opts) => '<div class="ru"><div class="ru-l">' + ic(key === "n" ? "list" : key === "limit" ? "timer" : "calc") + "<b>" + label + '</b></div><div class="su-seg sm">' +
      opts.map((o) => '<button class="' + (String(c[key]) === String(o[0]) ? "on" : "") + '" data-a="olCfg" data-k="' + key + '" data-v="' + o[0] + '"' + (host ? "" : " disabled") + ">" + o[1] + "</button>").join("") + "</div></div>";
    const pool = Q.count({ sets: c.sets || [], fields: c.fields || [], calc: c.calc !== false });
    const slots = [];
    for (let s = 0; s < MAXP; s++) {
      const pid = list.find((p) => (players()[p].slot | 0) === s);
      if (pid) {
        const p = players()[pid];
        slots.push('<div class="ol-pl" style="--c:' + COLORS[s] + '">' + avatar({ name: p.name, color: COLORS[s], acc: p.charFile ? { charFile: p.charFile } : null }, "md") +
          "<b>" + esc(p.name) + "</b>" + (pid === R().meta.host ? '<em class="h">ホスト</em>' : "") + (pid === O.pid ? '<em class="me">あなた</em>' : "") + (p.online === false ? '<em class="off">通信なし</em>' : "") + "</div>");
      } else slots.push('<div class="ol-pl empty"><i>' + ic("plus") + "</i><b>参加を待っています</b></div>");
    }
    const can = host && list.length >= 2 && pool >= 5;
    $("#online").className = "scr on ol-lobby";
    $("#online").innerHTML = '<div class="su-top"><button class="su-back" data-a="olLeaveAsk" aria-label="部屋を出る">' + ic("back") + '</button><h2 class="rc-h">2台で対戦</h2><button class="su-help" data-a="olHelp" aria-label="あそび方">' + ic("help") + "</button></div>" +
      '<div class="su-body">' +
      '<section class="ol-code"><small>部屋の番号</small><b>' + esc(O.code.slice(1)) + "</b><p>" + (host ? "相手の端末で「2台で対戦」→「部屋に入る」から、この番号を入れてもらってください。" : "ホストが始めるのを待っています。") + "</p></section>" +
      '<section class="ol-pls">' + slots.join("") + "</section>" +
      '<section class="ru-c">' + '<h3 class="ol-h">' + ic("gear") + "ルール" + (host ? "" : "<small>（ホストが決めます）</small>") + "</h3>" +
      seg("n", "問題数", [[5, "5問"], [10, "10問"], [15, "15問"]]) +
      seg("limit", "1問の解答時間", [["short", "みじかめ"], ["mid", "ふつう"], ["long", "ながめ"]]) +
      seg("calc", "計算問題", [[true, "出す"], [false, "出さない"]]) +
      '<p class="ru-n">出題：MagiChemLex 基礎セットの改題 <b>' + pool + "問</b>から（範囲はホストの「準備」の設定）。<br>正解 100 点（計算 +50）＋速さ 最大 +100＋いちばん早い正解 +30。</p></section>" +
      "</div>" +
      '<div class="su-foot">' + (host ? buzzBtn("olStart", list.length >= 2 ? "対戦スタート" : "相手を待っています…", "wide" + (can ? "" : " off")) : '<p class="ol-wait">' + ic("timer") + "ホストが始めるのを待っています…</p>") + "</div>";
  }
  async function setCfg(k, v) {
    if (!isHost()) return;
    const c = Object.assign({}, cfg());
    c[k] = v === "true" ? true : v === "false" ? false : /^\d+$/.test(v) ? +v : v;
    try { await NET().update(path("state"), { cfg: c }); FX.sfx("tap"); } catch (e) { toast("通信できませんでした"); }
  }
  async function startGame() {
    if (!isHost()) return;
    const c = cfg(), list = seatList();
    if (list.length < 2) { toast("2人以上で始められます"); return; }
    const pool = Q.pool({ sets: c.sets || [], fields: c.fields || [], calc: c.calc !== false });
    if (pool.length < 5) { toast("出題範囲の問題が少なすぎます"); return; }
    const used = new Set(), qs = [];
    let ctx = "";
    for (let i = 0; i < (c.n || 10); i++) {
      const x = Q.pick(pool, used, { notCtx: ctx }); if (!x) break;
      used.add(x.id); ctx = x.q.ctx || "";
      qs.push({ id: x.id, ord: Q.order(x.q) });
    }
    const gen = ((R().meta && R().meta.gen) | 0) + 1;
    try {
      await NET().update(path(), {
        acts: null,
        state: { cfg: c, list: qs, seats: list, qi: 0, phase: "q", at: now() + 3600 },
        "meta/status": "play", "meta/gen": gen,
      });
      FX.sfx("buzz");
    } catch (e) { toast("始められませんでした（通信）"); }
  }

  /* ══ 試合 ══ */
  function buildPlay() {
    const st = R().state, q0 = st.list[st.qi], x = item(q0.id);
    if (!x) { toast("問題が見つかりません（アプリを最新にしてください）"); return; }
    O.x = x; O.q = x.q; O.ord = q0.ord || Q.order(x.q); O.lab = Q.labels(x.q); O.sel = x.q.type === "m" ? [] : x.q.type === "n" ? "" : null;
    O.lim = limOf(x);
    const box = $("#online");
    box.className = "scr on ol-play";
    box.innerHTML = '<header class="pl-top"><button class="pl-ib" data-a="olLeaveAsk" aria-label="部屋を出る">' + ic("x") + '</button><div class="pl-lb" id="olLb"></div><div class="pl-tm" id="olTm"></div></header>' +
      '<div class="pl-bar" id="olBar"><i></i></div><div class="pl-strip" id="olStrip"></div>' +
      '<div class="pl-main" id="olMain"><div class="pl-q" id="olQ"></div><div class="pl-a" id="olA"></div></div>' +
      '<footer class="pl-bot" id="olBot"><div class="bt-go" id="olGo"></div><p class="ol-sent" id="olSent" hidden>' + ic("check") + "<span>回答しました。ほかの人を待っています…</span></p></footer>" +
      '<div class="pl-res" id="olRes" hidden></div><div class="ol-cd" id="olCd" hidden></div>';
    const k = st.qi + 1, n = st.list.length;
    $("#olLb").innerHTML = "<b>第 " + k + " 問 / " + n + "</b><small>" + esc(Q.fieldName(x.q.f)) + (x.calc ? "・計算" : "") + "・あなた " + fmtN(totals()[O.pid] ? totals()[O.pid].pt : 0) + " 点</small>";
    renderQ(); paintStrip();
    const mine = actsAt(st.qi)[O.pid];
    O.sent = !!(mine && mine.a);
    if (O.sent) lockAfterSend();
    /* はじまる前は、カウントダウンの幕 */
    if (now() < st.at) {
      const cd = $("#olCd"); cd.hidden = false;
      cd.innerHTML = '<div class="ol-cd-in"><small>QUESTION</small><b>' + k + '</b><i id="olCdN"></i></div>';
      FX.sfx("turn");
      if (st.qi === 0 && !O.said.start) { O.said.start = 1; const H = HOST(); if (H) H.say("online"); }
    }
    FX.music("play");
    paintTime(true);
  }
  function renderQ() {
    const x = O.x, q = O.q, F = window.MCLFig;
    const tags = [Q.fieldName(q.f), Q.topicName(q.t)].filter(Boolean).map((t) => "<span>" + esc(t) + "</span>").join("");
    $("#olQ").innerHTML = '<div class="q-tags">' + tags + (x.calc ? '<span class="calc">' + ic("calc") + "計算</span>" : "") + (q.type === "m" ? '<span class="multi">すべて選ぶ</span>' : "") + "</div>" +
      (q.ctx ? '<div class="q-ctx">' + Q.fmt(q.ctx) + "</div>" : "") + '<div class="q-tx">' + Q.fmt(q.q) + "</div>" +
      (q.fig && F ? '<div class="fig">' + (F.make(q.fig) || "") + "</div>" : "");
    renderOpts();
  }
  const isSel = (i) => (O.q.type === "m" ? O.sel.indexOf(i) >= 0 : O.sel === i);
  function renderOpts() {
    const q = O.q, box = $("#olA");
    if (q.type === "n") {
      box.innerHTML = '<div class="ansn"><input id="olNum" inputmode="decimal" autocomplete="off" placeholder="数値を入力" value="' + esc(O.sel || "") + '"><span>' + (q.u ? Q.fmt(q.u) : "") + "</span></div>";
      const inp = $("#olNum"); inp.addEventListener("input", () => { O.sel = inp.value; paintGo(); });
      return;
    }
    const short = O.ord.every((i) => Q.plain(q.o[i]).length <= 9);
    box.innerHTML = (q.type === "m" ? '<p class="ans-n">' + ic("check") + "あてはまるものを<b>すべて</b>選んでから、ブザーを押してください</p>" : "") +
      '<div class="ans' + (short ? " two" : "") + (O.ord.length > 6 ? " many" : "") + '">' + O.ord.map((i, k) =>
        '<button class="op' + (isSel(i) ? " sel" : "") + '" data-a="olPick" data-i="' + i + '"><span class="op-l">' + O.lab[k] + '</span><span class="op-t">' + Q.fmtOpt(q, q.o[i]) + "</span></button>").join("") + "</div>";
  }
  function canSubmit() {
    const q = O.q;
    if (q.type === "m") return O.sel.length > 0;
    if (q.type === "n") return !!(M && isFinite(M.parseNum(O.sel)));
    return O.sel != null;
  }
  function paintGo() {
    const b = $("#olGo"); if (!b) return;
    const ok = O.phase === "q" && !O.sent && canSubmit();
    b.classList.toggle("on", ok);
    if (!ok) { b.innerHTML = ""; return; }
    const q = O.q, lab = (i) => O.lab[O.ord.indexOf(i)];
    const lb = q.type === "m" ? O.sel.slice().sort((a, c) => O.ord.indexOf(a) - O.ord.indexOf(c)).map(lab).join("・") : q.type === "n" ? O.sel : lab(O.sel);
    b.innerHTML = buzzBtn("olDecide", "<em>" + esc(lb) + "</em> で決定", "wide");
  }
  function pick(i) {
    if (O.phase !== "q" || O.sent || now() < R().state.at) return;
    const q = O.q;
    if (q.type === "m") { const k = O.sel.indexOf(i); if (k >= 0) O.sel.splice(k, 1); else O.sel.push(i); }
    else O.sel = O.sel === i ? null : i;
    FX.sfx("sel");
    $$("#olA .op").forEach((b) => b.classList.toggle("sel", isSel(+b.dataset.i)));
    paintGo();
  }
  async function send(timeout) {
    if (O.sent || O.phase !== "q") return;
    const st = R().state;
    O.sent = true;
    const ok = !timeout && Q.judge(O.q, O.sel);
    const ms = Math.max(0, Math.min(O.lim * 1000, Math.round(now() - st.at)));
    const sel = timeout ? null : Array.isArray(O.sel) ? O.sel.slice() : O.sel;
    const rec = { a: 1, ok: !!ok, ms };
    if (sel != null && sel !== "") rec.sel = sel;
    if (timeout) rec.to = 1;
    lockAfterSend();
    FX.sfx(timeout ? "time" : "buzz");
    try { await NET().update(path("acts/" + st.qi + "/" + O.pid), rec); }
    catch (e) { O.sent = false; toast("送れませんでした。もう一度押してください"); paintGo(); unlock(); }
  }
  function lockAfterSend() {
    $$("#olA .op").forEach((b) => { b.disabled = true; });
    const n = $("#olNum"); if (n) n.readOnly = true;
    paintGo();
    const s = $("#olSent"); if (s) s.hidden = false;
  }
  function unlock() { $$("#olA .op").forEach((b) => { b.disabled = false; }); const s = $("#olSent"); if (s) s.hidden = true; }
  function paintStrip() {
    const el = $("#olStrip"); if (!el) return;
    const st = R().state || {}, a = actsAt(st.qi), T = totals(), list = (st.seats || seatList());
    el.classList.toggle("dense", list.length >= 4);
    el.innerHTML = list.map((pid, i) => {
      const p = pinfo(pid), done = a[pid] && a[pid].a, off = p.left || p.online === false;
      const stx = st.phase === "rv" ? (a[pid] && a[pid].ok ? '<u class="p">○</u>' : '<u class="o">×</u>') : done ? '<u class="p">回答ずみ</u>' : off ? '<u class="o">通信なし</u>' : "<u>考え中…</u>";
      return '<div class="uc' + (pid === O.pid ? " on" : "") + (off ? " out" : "") + '" style="--c:' + colorOf(pid) + '"><i class="uc-n">' + (i + 1) + "</i>" +
        avatar({ name: p.name, color: colorOf(pid), acc: p.charFile ? { charFile: p.charFile } : null }, "xs") +
        '<span class="uc-t"><b>' + esc(p.name) + "</b><em>" + fmtN(T[pid] ? T[pid].pt : 0) + " 点 " + stx + "</em></span></div>";
    }).join("");
  }
  function paintTime(force) {
    const st = R().state; if (!st || O.view !== "play") return;
    const el = $("#olTm"), bar = $("#olBar i"); if (!el || !bar) return;
    const t = now(), cd = $("#olCd");
    if (t < st.at) {
      if (cd) { cd.hidden = false; const n = $("#olCdN"); if (n) n.textContent = Math.ceil((st.at - t) / 1000); }
      el.innerHTML = ""; bar.style.transform = "scaleX(1)"; return;
    }
    if (cd && !cd.hidden) { cd.hidden = true; FX.sfx("qin"); const qc = $("#olQ"); if (qc) { qc.classList.remove("in"); void qc.offsetWidth; qc.classList.add("in"); } }
    if (O.phase !== "q") { el.innerHTML = ""; el.className = "pl-tm"; return; }
    const left = Math.max(0, O.lim - (t - st.at) / 1000), s = Math.ceil(left);
    bar.style.transform = "scaleX(" + (left / O.lim).toFixed(4) + ")";
    if (force || s !== O.sec) {
      O.sec = s; el.innerHTML = ic("timer") + "<b>" + s + "</b>";
      const warn = s <= 10; el.className = "pl-tm" + (warn ? " warn" : ""); $("#olBar").classList.toggle("warn", warn);
      if (warn && s > 0 && !force && !O.sent) FX.sfx("warn");
    }
    if (left <= 0 && !O.sent) send(true);
  }

  /* ══ 点数（全員が同じ計算をする） ══ */
  function scoreOne(x, r, fastest, pid) {
    if (!r || !r.ok) return 0;
    const lim = limOf(x) * 1000;
    return 100 + (x.calc ? 50 : 0) + Math.round(100 * Math.max(0, 1 - (r.ms || 0) / lim)) + (fastest === pid ? 30 : 0);
  }
  function fastestOf(a, seats) {
    const ok = seats.filter((p) => a[p] && a[p].ok).sort((p, q) => (a[p].ms || 0) - (a[q].ms || 0));
    return ok[0] || "";
  }
  function totals() {
    const st = R().state || {}, list = st.list || [], seats = st.seats || seatList(), out = {};
    seats.forEach((p) => { out[p] = { pt: 0, ok: 0, n: 0, ms: 0, fs: {}, ts: {} }; });
    const upto = st.phase === "rv" || st.phase === "end" ? st.qi : st.qi - 1;
    for (let i = 0; i <= upto && i < list.length; i++) {
      const x = item(list[i].id); if (!x) continue;
      const a = actsAt(i), f = fastestOf(a, seats);
      seats.forEach((p) => {
        const r = a[p], o = out[p]; if (!o || !r || !r.a) return;
        o.n++; o.ms += r.ms || 0;
        if (r.ok) o.ok++;
        o.pt += scoreOne(x, r, f, p);
        const fa = o.fs[x.f] || (o.fs[x.f] = { ok: 0, n: 0 }); fa.n++; if (r.ok) fa.ok++;
        const ta = o.ts[x.q.t] || (o.ts[x.q.t] = { ok: 0, n: 0 }); ta.n++; if (r.ok) ta.ok++;
      });
    }
    return out;
  }

  /* ══ 答え合わせ ══ */
  function showReveal() {
    const st = R().state, a = actsAt(st.qi), x = O.x, q = O.q; if (!x) return;
    const seats = st.seats || seatList(), f = fastestOf(a, seats), mine = a[O.pid] || {};
    const cor = Q.answers(q);
    /* 選択肢に色 */
    if (q.type === "n") { const i = $("#olNum"); if (i) { i.readOnly = true; i.classList.add(mine.ok ? "ok" : "ng"); } }
    $$("#olA .op").forEach((b) => {
      const i = +b.dataset.i, picked = q.type === "m" ? (mine.sel || []).indexOf(i) >= 0 : mine.sel === i;
      b.disabled = true; b.classList.remove("sel");
      if (cor.indexOf(i) >= 0) b.classList.add("cor"); else if (picked) b.classList.add("wr"); else b.classList.add("dim");
    });
    $("#olGo").classList.remove("on"); $("#olGo").innerHTML = ""; $("#olSent").hidden = true;
    const lab = (i) => O.lab[O.ord.indexOf(i)];
    const lets = q.type === "n" ? M.answerText(q) : cor.slice().sort((i, j) => O.ord.indexOf(i) - O.ord.indexOf(j)).map(lab).join("・");
    const ansTx = q.type === "n" ? M.answerText(q) : cor.map((i) => Q.fmtOpt(q, q.o[i])).join("、");
    const H = mine.ok ? ["正解！", "good", "check"] : mine.to ? ["時間切れ", "bad", "timer"] : ["ざんねん…", "bad", "x"];
    const rows = seats.map((pid) => {
      const r = a[pid], p = pinfo(pid), pt = scoreOne(x, r, f, pid);
      return '<div class="ol-rr' + (pid === O.pid ? " me" : "") + '" style="--c:' + colorOf(pid) + '">' + avatar({ name: p.name, color: colorOf(pid), acc: p.charFile ? { charFile: p.charFile } : null }, "xs") +
        "<b>" + esc(p.name) + "</b><span>" + (r && r.a ? (r.ok ? '<i class="o">○</i>' : '<i class="x">×</i>') + (r.to ? "時間切れ" : ((r.ms || 0) / 1000).toFixed(1) + " 秒") : "—") + "</span>" +
        "<em>" + (pt ? "+" + pt : "0") + (f === pid ? '<small>いちばん早い</small>' : "") + "</em></div>";
    }).join("");
    const F = window.MCLFig;
    const open = !mine.ok || FX.opt.sol || matchMedia("(min-width:900px) and (orientation:landscape)").matches;
    const box = $("#olRes");
    box.className = "pl-res " + (mine.ok ? "ok" : "ng");
    box.innerHTML = '<button class="rs-grip" data-a="olResMin" aria-label="問題を見る"><i></i></button>' +
      '<div class="rs-sc"><div class="rs-h"><span class="rs-m ' + H[1] + '">' + ic(H[2]) + '</span><div class="rs-t"><b>' + H[0] + "</b><p>" + (mine.ok ? "<b>+" + scoreOne(x, mine, f, O.pid) + " 点</b>" : "この問題は 0 点") + "</p></div></div>" +
      '<div class="ol-rrs">' + rows + "</div>" +
      (mine.ok ? "" : '<div class="rs-a"><span>正解 ' + esc(q.type === "n" ? "" : lets) + "</span><b>" + ansTx + "</b></div>") +
      (q.k ? '<div class="rs-k"><span>ポイント</span>' + Q.fmt(q.k) + "</div>" : "") +
      '<details class="rs-sol"' + (open ? " open" : "") + "><summary>" + ic("book") + '解説を見る</summary><div class="rs-tx">' + Q.fmt(q.s) + "</div>" + (q.sfig && F && F.make(q.sfig) ? '<div class="fig">' + F.make(q.sfig) + "</div>" : "") + "</details></div>" +
      '<div class="rs-f"><p class="rs-stop">' + ic("people") + '全員が「次へ」を押すと進みます</p><div id="olNx"></div></div>';
    box.hidden = false; box.classList.remove("min");
    $("#online").classList.add("res-on");
    void box.offsetWidth; box.classList.add("in");
    paintRevealNext(); paintStrip(); paintTime(true);
    if (mine.ok) { FX.sfx("ok"); FX.vib(20); } else { FX.sfx(mine.to ? "time" : "ng"); FX.vib([30, 40, 30]); }
    FX.bgmDuck(true);
    const Hh = HOST();
    if (Hh) {
      if (f) Hh.say("first", { p: pinfo(f).name });
      else Hh.say(mine.to ? "time" : "ng", { p: pinfo(O.pid).name });
    }
  }
  function paintRevealNext() {
    const el = $("#olNx"); if (!el) return;
    const st = R().state, a = actsAt(st.qi), last = st.qi >= (st.list || []).length - 1;
    const mine = a[O.pid] || {};
    const wait = activeList().filter((p) => !(a[p] && a[p].nx)).length;
    if (mine.nx) el.innerHTML = '<button class="btn wide" disabled>' + ic("timer") + "ほかの人を待っています…" + (wait ? "（あと " + wait + " 人）" : "") + "</button>";
    else el.innerHTML = buzzBtn("olNext", last ? "結果発表へ" : "次の問題へ", "wide");
  }
  async function next() {
    const st = R().state;
    try { await NET().update(path("acts/" + st.qi + "/" + O.pid), { nx: true }); FX.sfx("buzz"); } catch (e) { toast("通信できませんでした"); }
  }

  /* ══ ホストの仕事（時間で進める） ══ */
  async function hostCheck() {
    if (!isHost() || O.hostBusy) return;
    const room = R(), st = room.state || {}, meta = room.meta || {};
    if (meta.status !== "play" || !st.list) return;
    const t = now(), a = actsAt(st.qi), act = activeList();
    let upd = null;
    if (st.phase === "q" && t >= st.at) {
      const x = item(st.list[st.qi].id), lim = x ? limOf(x) : 60;
      const all = act.length > 0 && act.every((p) => a[p] && a[p].a);
      if (all || t >= st.at + lim * 1000 + 1500) upd = { "state/phase": "rv", "state/rvAt": t };
    } else if (st.phase === "rv") {
      const all = act.length > 0 && act.every((p) => a[p] && a[p].nx);
      if (all || t >= (st.rvAt || t) + 45000) {
        if (st.qi + 1 < st.list.length) upd = { "state/qi": st.qi + 1, "state/phase": "q", "state/at": t + 1800, "state/rvAt": null };
        else upd = { "state/phase": "end", "meta/status": "end" };
      }
    }
    if (!upd) return;
    O.hostBusy = true;
    try { await NET().update(path(), upd); } catch (e) {}
    setTimeout(() => { O.hostBusy = false; }, 400);
  }
  function tick() {
    if (!O.code || !O.room) return;
    if (O.view === "play") paintTime();
    if (isHost()) hostCheck();
  }

  /* ══ 結果 ══ */
  function ranking() {
    const st = R().state || {}, T = totals(), seats = st.seats || seatList();
    const L = seats.map((pid) => Object.assign({ pid, name: pinfo(pid).name, left: !!pinfo(pid).left }, T[pid] || { pt: 0, ok: 0, n: 0, ms: 0 }));
    L.sort((a, b) => b.pt - a.pt || b.ok - a.ok || a.ms - b.ms);
    L.forEach((u, i) => { const p = L[i - 1]; u.rank = p && p.pt === u.pt && p.ok === u.ok ? p.rank : i + 1; });
    return L;
  }
  function paidLoad() { try { return JSON.parse(localStorage.getItem(PAID_KEY) || "{}") || {}; } catch (e) { return {}; } }
  async function renderEnd() {
    FX.bgmDuck(false);
    const L = ranking(), meU = L.find((u) => u.pid === O.pid), top = L[0];
    const box = $("#online");
    box.className = "scr on ol-end";
    const po = L.slice(0, 3), order = po.length >= 3 ? [po[1], po[0], po[2]] : po.length === 2 ? [po[1], po[0]] : po;
    box.innerHTML = '<div class="re-sc"><h2 class="re-h">結果発表</h2>' +
      '<section class="re-pod n' + order.length + '">' + order.map((u) => { const p = pinfo(u.pid), c = colorOf(u.pid);
        return '<div class="pod r' + u.rank + ' up" data-r="' + u.rank + '" style="--c:' + c + '"><div class="pod-a">' + (u.rank === 1 ? '<span class="pod-cr">' + ic("crown") + "</span>" : "") + avatar({ name: p.name, color: c, acc: p.charFile ? { charFile: p.charFile } : null }, u.rank === 1 ? "xl" : "lg") +
          "</div><b>" + esc(p.name) + "</b><small>" + fmtN(u.pt) + ' 点</small><div class="pod-b"><span>' + u.rank + "</span></div></div>"; }).join("") + "</section>" +
      '<div class="re-rest in"><section class="re-list">' + L.map((u) => '<div class="rr' + (u.pid === O.pid ? " me" : "") + '" style="--c:' + colorOf(u.pid) + '"><span class="rr-k">' + u.rank + "</span>" +
        avatar({ name: u.name, color: colorOf(u.pid), acc: pinfo(u.pid).charFile ? { charFile: pinfo(u.pid).charFile } : null }, "xs") + '<span class="rr-n"><b>' + esc(u.name) + "</b>" + (u.left ? "<small>退出</small>" : "") + '</span><span class="rr-s">' + fmtN(u.pt) + ' 点</span><span class="rr-a">' + u.ok + "/" + u.n + "</span></div>").join("") + "</section>" +
      '<section class="re-prz" id="olPrz"><p class="re-pm">' + ic("gift") + "XEVA を確認しています…</p></section></div></div>" +
      '<div class="re-foot">' + (isHost() ? buzzBtn("olAgain", "もう一度（この部屋で）", "") : '<p class="ol-wait">' + ic("timer") + "ホストが「もう一度」を押すと、同じ部屋で続けられます</p>") + '<button class="btn" data-a="olDetail">' + ic("list") + "<span>結果詳細</span></button>" + '<button class="btn" data-a="olLeave">' + ic("home") + "<span>部屋を出る</span></button></div>";
    FX.music("result"); FX.sfx("win"); FX.confetti(120);
    const Hh = HOST(); if (Hh && top) setTimeout(() => Hh.say("final", { p: top.name }), 900);
    /* XEVA（自分の分だけ・1試合1回） */
    const meta = R().meta || {}, gid = O.code + ":" + (meta.createdAt || 0) + ":" + (meta.gen || 0);
    const prz = $("#olPrz");
    const paid = paidLoad();
    if (!meU) { prz.innerHTML = ""; return; }
    if (paid[gid]) { prz.innerHTML = '<h3>' + ic("gift") + "XEVA</h3><div class=\"pz\"><span class=\"pz-r\">" + meU.rank + "位</span><b>" + esc(meU.name) + "</b><em>+" + fmtN(paid[gid]) + '</em><img src="../XEVA.png" alt="XEVA"><small>受け取りずみ</small></div>'; return; }
    const me = A.me();
    const row = { owner: !!me, uid: null, name: meU.name, rank: meU.rank, ok: meU.ok, n: meU.n, played: meU.n, fields: meU.fs, topics: meU.ts, pt: 0, score: meU.pt, boom: 0 };
    const res = await A.report([row], { mode: "online", gid }).catch(() => ({ prizes: [] }));
    const pz = (res.prizes || [])[0];
    if (pz) {
      try { paid[gid] = pz.amount; const ks = Object.keys(paid); if (ks.length > 60) delete paid[ks[0]]; localStorage.setItem(PAID_KEY, JSON.stringify(paid)); } catch (e) {}
      prz.innerHTML = "<h3>" + ic("gift") + 'XEVA</h3><div class="pz"><span class="pz-r">' + pz.rank + "位</span><b>" + esc(pz.name) + "</b><em>+" + fmtN(pz.amount) + '</em><img src="../XEVA.png" alt="XEVA"><small>この端末に入りました</small></div>';
      setTimeout(() => FX.sfx("coin"), 1400);
    } else {
      prz.innerHTML = '<p class="re-pm">' + ic("gift") + (me ? (res.short ? "賞金は3問以上答えた人だけです" : "賞金の対象ではありませんでした") : "XEVARION にログインしていると XEVA がもらえます") + "</p>";
    }
  }
  async function again() {
    if (!isHost()) return;
    try { await NET().update(path(), { acts: null, "state/phase": null, "state/list": null, "state/qi": null, "state/seats": null, "state/at": null, "meta/status": "wait" }); FX.sfx("buzz"); }
    catch (e) { toast("通信できませんでした"); }
  }

  /* ══ ★★ 2026-11-13 結果詳細（結果発表の「結果詳細」ボタン）：人ごとの成績・点の内訳と、1問ごとの全員の ◯✕・時間・点 ══ */
  function openDetail() {
    const st = R().state || {}, list = st.list || [], seats = st.seats || seatList(), L = ranking();
    const sec = (ms) => ((ms || 0) / 1000).toFixed(1) + "秒";
    const cards = L.map((u) => {
      let base = 0, sp = 0, fast = 0, okMs = 0, okN = 0;
      list.forEach((it, i) => {
        const x = item(it.id); if (!x) return;
        const a = actsAt(i), r = a[u.pid]; if (!r || !r.ok) return;
        base += 100 + (x.calc ? 50 : 0); sp += Math.round(100 * Math.max(0, 1 - (r.ms || 0) / (limOf(x) * 1000)));
        if (fastestOf(a, seats) === u.pid) fast += 30;
        okMs += r.ms || 0; okN++;
      });
      const rows = [["正解", u.ok + " / " + u.n + (u.n ? "（" + Math.round(u.ok / u.n * 100) + "%）" : "")], ["答えた時間", "合計 " + sec(u.ms) + (okN ? "・正解の平均 " + sec(okMs / okN) : "")],
        ["点の内訳", "正解 " + fmtN(base) + " ＋ 速さ " + fmtN(sp) + " ＋ いちばん早い " + fmtN(fast)]];
      return '<section class="rd-u" style="--c:' + colorOf(u.pid) + '"><div class="rd-uh"><span class="rd-k">' + u.rank + "</span><b>" + esc(u.name) + (u.pid === O.pid ? "（自分）" : "") + "</b><em>" + fmtN(u.pt) + " 点</em></div><dl>" +
        rows.map((r) => "<div><dt>" + r[0] + "</dt><dd>" + r[1] + "</dd></div>").join("") + "</dl></section>";
    }).join("");
    const tl = list.map((it, i) => {
      const x = item(it.id); if (!x) return "";
      const a = actsAt(i), f = fastestOf(a, seats);
      const ps = seats.map((pid) => {
        const r = a[pid], pt = scoreOne(x, r, f, pid);
        return '<span class="rd-op" style="--c:' + colorOf(pid) + '"><i>' + esc(pinfo(pid).name) + "</i>" +
          (r && r.a ? '<b class="' + (r.ok ? "o" : "x") + '">' + (r.ok ? "◯" : "✕") + "</b><small>" + (r.to ? "時間切れ" : sec(r.ms)) + "</small><em>" + (pt ? "+" + pt : "0") + "</em>" + (f === pid ? "<u>最速</u>" : "<u></u>") : "<small>答えなし</small>") + "</span>";
      }).join("");
      return '<li class="ol"><span class="rd-n">' + (i + 1) + '</span><span class="rd-w"><em>' + esc(Q.topicName(x.q.t)) + "</em><small>" + (x.calc ? "計算問題（正解で +50点）" : "") + '</small><span class="rd-ops">' + ps + "</span></span></li>";
    }).join("");
    sheet('<h3 class="sh-t">' + ic("list") + "結果詳細<small>2台で対戦・" + list.length + "問</small></h3>" +
      '<details class="rd-how" open><summary>点数のしくみ（2台で対戦）</summary><ul><li><b>正解</b>：100点（計算問題は +50点）</li><li><b>速さ</b>：早く答えるほど高く、最大 +100点</li>' +
      "<li><b>いちばん早い正解</b>：その問題でいちばん早く正解した人に +30点</li><li>まちがい・時間切れは 0点</li></ul></details>" +
      '<div class="rd-us">' + cards + '</div><h4 class="rd-h">1問ごとの記録</h4><ol class="rd-tl">' + (tl || '<li class="rd-none">記録がありません</li>') + "</ol>" +
      '<div class="sh-b"><button class="btn pri" data-a="close">とじる</button></div>', { cls: "review" });
  }

  /* ══ 操作 ══ */
  Object.assign(U.ACT, {
    olDetail: () => { FX.sfx("tap"); openDetail(); },
    online: () => { FX.sfx("buzz"); openEntry(); },
    olCreate: () => { FX.sfx("buzz"); create(); },
    olJoinOpen: () => { FX.sfx("tap"); openJoin("", ""); },
    olKey: (el) => {
      const v = el.dataset.v; let s = O.typing || "";
      if (v === "bs") s = s.slice(0, -1); else if (s.length < 4) s += v;
      FX.sfx("tap");
      if (s.length === 4) { openJoin("確認しています…", s); join(s); return; }
      openJoin("", s);
    },
    olCfg: (el) => setCfg(el.dataset.k, el.dataset.v),
    olStart: () => startGame(),
    olPick: (el) => pick(+el.dataset.i),
    olDecide: () => { if (canSubmit()) send(false); },
    olNext: () => next(),
    olResMin: () => { const b = $("#olRes"); if (b) b.classList.toggle("min"); FX.sfx("tap"); },
    olAgain: () => again(),
    olLeave: () => { FX.sfx("tap"); leave(); },
    olLeaveAsk: () => {
      FX.sfx("tap");
      const playing = R().meta && R().meta.status === "play";
      sheet('<h3 class="sh-t">' + ic("x") + "部屋を出ますか？</h3><p class=\"sh-p\">" + (playing ? "対戦の途中で出ると、この試合の XEVA はもらえません。" : isHost() ? "ホストが出ると部屋はなくなります。" : "あとから同じ番号で入りなおせます。") + "</p>" +
        '<div class="sh-b"><button class="btn danger" data-a="olLeave">出る</button><button class="btn" data-a="close">もどる</button></div>');
    },
    olHelp: () => {
      FX.sfx("tap");
      sheet('<h3 class="sh-t">' + ic("book") + "2台で対戦</h3><ul class=\"rl\"><li>それぞれの端末で、<b>同じ問題に同時に</b>答えます（2〜4台）。</li><li>正解 100 点（計算問題は +50）。<b>速く答えるほど</b>最大 +100、いちばん早く正解した人は +30。</li>" +
        "<li>全員が答えるか時間切れになると答え合わせ。解説を読んで、全員が「次へ」を押すと次の問題です。</li><li>決めた問題数の合計点で順位が決まり、順位の XEVA がそれぞれの端末に入ります（3問以上答えた人）。</li>" +
        "<li>途中で通信が切れても、同じ番号で入りなおせます。ホストの通信が切れたときは、ほかの人がホストを引きつぎます。</li></ul><div class=\"sh-b\"><button class=\"btn pri\" data-a=\"close\">とじる</button></div>", { cls: "rules" });
    },
  });
  document.addEventListener("keydown", (e) => {
    if (document.body.dataset.scr !== "online" || sheetOpen() || O.view !== "play") return;
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) { if (e.key === "Enter" && O.phase === "q" && canSubmit()) send(false); return; }
    const k = e.key.toUpperCase();
    if (O.phase === "q") {
      const idx = /^[1-9]$/.test(k) ? +k - 1 : LET.indexOf(k);
      if (idx >= 0 && O.ord && O.ord[idx] != null) { pick(O.ord[idx]); return; }
      if (e.key === "Enter" && canSubmit()) send(false);
    } else if (O.phase === "rv" && e.key === "Enter") next();
  });

  MQ.Online = { openEntry, leave, peek: () => O };
})();
