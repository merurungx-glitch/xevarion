/* ============================================================
   MagiChemLex — mcl-flash.js（フラッシュカード）★★ 2026-10-15 新規
   ------------------------------------------------------------
   ご指定「MagiLex のようなフラッシュカードを、独自で より使いやすく。解説も見られるように・メモも活用できるように」
   ・問題をカードにして「表＝問題（設定・図・選択肢）」→ めくると「裏＝正解・解説（図・ポイント）・自分のメモ」。
   ・自己採点は3つ：もう一度（このあと、もう一度出る）・あやしい・覚えた。記録はこの端末の mcl_fc_v1（習得の記録＝SRS は変えない）。
   ・演習の画面（#play）をそのまま使う＝下の「メモ」で 手書き・文字・電卓・公式 が使える（MagiLex より便利なところ）。
     裏の「自分のメモ」は問題ごとの文字メモ（M.setMemo・アカウントで同期）。表にも「メモあり」と出る。
   ・めくる：カードをタップ／スペース。前後：‹ ›・左右スワイプ・← →。採点：1・2・3。ヒント：H。メモ：M。
   ・入口：ホームの「フラッシュカード」（デッキえらび）・問題セット・単元・問題一覧（その条件のまま）。
   ・設定：シャッフル／覚えたカードを出さない／選択肢を表に出す。
   ============================================================ */
(function () {
  "use strict";
  const D = window.MCL_DATA, M = window.MCL, F = window.MCLFig, U = window.MCLUI;
  if (!D || !M || !U) return;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = M.esc, fmt = M.fmt, ic = U.ic;

  /* ══ 記録（この端末だけ） ══
     b[id] = { r: 0 もう一度・1 あやしい・2 覚えた, n: めくった回数, at } ／ opt = { shuf, hide, opts } */
  const KEY = "mcl_fc_v1";
  let ST = { b: {}, opt: { shuf: 1, hide: 0, opts: 1 } };
  try { const o = JSON.parse(localStorage.getItem(KEY) || "null"); if (o && typeof o === "object") { ST.b = o.b || {}; ST.opt = Object.assign(ST.opt, o.opt || {}); } } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(ST)); } catch (e) {} };
  const RT = [
    { k: 0, nm: "もう一度", cls: "ag", ic: "undo" },
    { k: 1, nm: "あやしい", cls: "fhd", ic: "help" },
    { k: 2, nm: "覚えた", cls: "ok", ic: "check" },
  ];

  /* ══ セッション ══ */
  let FC = null;
  const cur = () => (FC ? D.BY[FC.ids[FC.i]] : null);
  function start(ids, opt) {
    opt = opt || {};
    ids = (ids || []).filter((id, k, a) => D.BY[id] && a.indexOf(id) === k);
    if (!ids.length) { U.toast(opt.empty || "めくれるカードがありません"); return; }
    let note = "";
    if (ST.opt.hide && !opt.all) {
      const rest = ids.filter((id) => !(ST.b[id] && ST.b[id].r === 2));
      if (!rest.length) { U.toast("🎉 ぜんぶ「覚えた」です（設定の「覚えたカードを出さない」を切ると全部めくれます）"); return; }
      if (rest.length < ids.length) { note = "覚えた " + (ids.length - rest.length) + "枚を除いて " + rest.length + "枚"; ids = rest; }
    }
    if (ST.opt.shuf && !opt.keep) ids = M.shuffle(ids);
    const MAX = 150;
    if (ids.length > MAX) { note = (note ? note + "・" : "") + "多いので " + MAX + "枚まで"; ids = ids.slice(0, MAX); }
    U.closeSheet();
    FC = { ids, i: 0, back: false, hint: 0, title: opt.title || "フラッシュカード", res: {}, again: {}, done: false, src: opt.src || null };
    const pl = U.playShell(); pl.hidden = false; pl.classList.remove("exam"); pl.classList.add("fcm");
    document.body.classList.add("playing");
    render();
    if (note) setTimeout(() => U.toast(note), 300);
  }
  function close() { FC = null; U.closePlay(); }
  function reset() { FC = null; const pl = $("#play"); if (pl) pl.classList.remove("fcm"); }

  /* ══ 画面 ══ */
  function counts() { const c = [0, 0, 0]; Object.keys(FC.res).forEach((id) => { c[FC.res[id]]++; }); return c; }
  function paintTop() {
    const n = FC.ids.length, c = counts(), seen = Object.keys(FC.res).length;
    $("#plTop").innerHTML = '<button class="pl-x" data-a="fcClose" aria-label="やめる">' + ic("x") + "</button>" +
      '<div class="pl-prog"><div class="pl-tt">' + ic("flash", "fct") + esc(FC.title) + '</div><div class="pl-bar"><i style="width:' + (FC.done ? 100 : seen / n * 100).toFixed(1) + '%"></i></div></div>' +
      (FC.done ? "" : '<span class="pl-flip"><button class="plf" data-a="fcPrev"' + (FC.i === 0 ? " disabled" : "") + ' aria-label="前のカード">' + ic("chevL") + '</button><span class="pl-cnt">' + (FC.i + 1) + "<small>/" + n + '</small></span><button class="plf" data-a="fcNext"' + (FC.i >= n - 1 ? " disabled" : "") + ' aria-label="次のカード">' + ic("chevR") + "</button></span>") +
      '<span class="fc-tally" title="覚えた・あやしい・もう一度"><i class="ok">' + c[2] + '</i><i class="fhd">' + c[1] + '</i><i class="ag">' + c[0] + "</i></span>";
  }
  function lastTag(id) {
    const b = ST.b[id]; if (!b || b.r == null) return '<span class="fc-last new">はじめて</span>';
    return '<span class="fc-last r' + b.r + '">前回：' + RT[b.r].nm + "</span>";
  }
  function optsHTML(q, showCor) {
    if (q.type === "n") return '<p class="fc-num">' + ic("pen") + "数値で答える問題" + (q.u ? "（単位：" + fmt(q.u) + "）" : "") + "</p>";
    if (!q.o || !q.o.length) return "";
    return '<ol class="fc-o' + (q.type === "m" ? " multi" : "") + '">' + q.o.map((o, i) => {
      const cor = showCor && (q.type === "m" ? q.a.indexOf(i) >= 0 : q.a === i);
      return '<li class="' + (cor ? "cor" : "") + '">' + M.fmtOpt(q, o) + "</li>";
    }).join("") + "</ol>";
  }
  function frontHTML(q) {
    const memo = (M.get().memo || {})[q.id], hs = q.h || [];
    return '<div class="fc-face fc-front">' +
      '<div class="fc-meta">' + lastTag(q.id) + (memo && memo.t ? '<span class="fc-hasmemo">' + ic("memo") + "メモあり</span>" : "") + "</div>" +
      U.chipsHTML(q, null, true) + '<div class="qsrc">' + esc(q.src) + "</div>" +
      (q.ctx ? '<details class="ctx"><summary>' + ic("list") + " 設定（大問の条件）</summary><div>" + fmt(q.ctx) + "</div></details>" : "") +
      '<div class="qtext">' + fmt(q.q) + "</div>" + (q.fig ? '<div class="fig">' + F.make(q.fig) + "</div>" : "") +
      (ST.opt.opts ? optsHTML(q, false) : (q.type === "n" ? optsHTML(q, false) : '<p class="fc-num">' + ic("list") + "選択肢はかくしています（設定で表示）</p>")) +
      (FC.hint ? '<div class="hints">' + hs.slice(0, FC.hint).map((h, k) => '<div class="hint-c"><b>ヒント ' + (k + 1) + "</b>" + fmt(h) + "</div>").join("") + "</div>" : "") +
      '<button class="fc-tap" data-a="fcFlip">' + ic("flash") + "<span>タップして答え・解説を見る</span><small>スペースキーでもめくれます</small></button>" +
      "</div>";
  }
  function backHTML(q) {
    const memo = ((M.get().memo || {})[q.id] || {}).t || "";
    return '<div class="fc-face fc-back">' +
      '<div class="fc-bk-h"><button class="fc-turn" data-a="fcFlip">' + ic("undo") + "表にもどす</button>" + lastTag(q.id) + "</div>" +
      '<div class="fc-ans"><span>' + ic("check") + "正解</span><b>" + M.answerText(q) + "</b></div>" +
      '<details class="fc-qagain"><summary>' + ic("list") + " 問題をもう一度見る</summary>" +
        (q.ctx ? '<div class="fc-ctx">' + fmt(q.ctx) + "</div>" : "") + '<div class="qtext">' + fmt(q.q) + "</div>" + (q.fig ? '<div class="fig">' + F.make(q.fig) + "</div>" : "") + "</details>" +
      (q.type !== "n" ? optsHTML(q, true) : "") +
      U.solHTML(q) +
      '<section class="fc-memo"><h3>' + ic("memo") + '自分のメモ<small id="fcMemoSt">' + (memo ? "保存ずみ" : "書くと自動で保存（同期されます）") + "</small></h3>" +
        '<textarea id="fcMemo" data-id="' + q.id + '" rows="3" placeholder="覚え方・まちがえたところ・自分の言葉でのまとめ…">' + esc(memo) + "</textarea>" +
        '<div class="fc-mrow"><button class="btn sm" data-a="fcPad" data-v="draw">' + ic("pen") + "手書き</button><button class=\"btn sm\" data-a=\"fcPad\" data-v=\"calc\">" + ic("calc") + "電卓</button><button class=\"btn sm\" data-a=\"fcPad\" data-v=\"const\">" + ic("table") + "公式・定数</button></div>" +
      "</section>" +
      "</div>";
  }
  function botHTML() {
    const memo = '<button class="bb tool memo' + (U.padHas() ? " has" : "") + (U.padOpenNow ? " on" : "") + '" data-a="pad" aria-label="メモ・電卓">' + ic("memo") + "<span>メモ</span></button>";
    if (FC.done) return '<button class="bb tool" data-a="fcClose">' + ic("x") + "<span>閉じる</span></button>" + memo;
    if (!FC.back) {
      const q = cur(), nh = (q.h || []).length;
      return memo + '<button class="bb tool hint" data-a="fcHint"' + (FC.hint >= nh ? " disabled" : "") + ' aria-label="ヒント">' + ic("hint") + "<span>ヒント<i>" + FC.hint + "/" + nh + "</i></span></button>" +
        '<button class="bb main" data-a="fcFlip">' + ic("flash") + "答えを見る</button>";
    }
    return memo + RT.map((r) => '<button class="bb fcr ' + r.cls + '" data-a="fcRate" data-v="' + r.k + '">' + ic(r.ic) + "<span>" + r.nm + "</span><kbd>" + (r.k + 1) + "</kbd></button>").join("");
  }
  function render(anim) {
    if (!FC) return;
    paintTop();
    const body = $("#plBody");
    if (FC.done) { body.innerHTML = doneHTML(); body.scrollTop = 0; $("#plBot").innerHTML = botHTML(); return; }
    const q = cur();
    const card = '<div class="fc-stage"><div class="fc-card ' + (FC.back ? "is-back" : "is-front") + (anim ? " " + anim : "") + '" id="fcCard" style="--fc:' + D.F[q.f].c + '">' + (FC.back ? backHTML(q) : frontHTML(q)) + "</div></div>";
    body.innerHTML = '<div class="pl-in fc-in" data-qid="' + q.id + '">' + card + "</div>";
    body.scrollTop = 0;
    $("#plBot").innerHTML = botHTML();
    bindCard();
  }
  /* カードの操作：表はタップでめくる・左右スワイプで前後 */
  function bindCard() {
    const c = $("#fcCard"); if (!c) return;
    let x0 = 0, y0 = 0, t0 = 0, on = false;
    c.addEventListener("touchstart", (e) => { if (e.touches.length !== 1) { on = false; return; } const t = e.touches[0]; x0 = t.clientX; y0 = t.clientY; t0 = Date.now(); on = !e.target.closest(".fig, table, textarea, input, details"); }, { passive: true });
    c.addEventListener("touchend", (e) => {
      if (!on) return; on = false;
      const t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0;
      if (Date.now() - t0 < 600 && Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6) { move(dx < 0 ? 1 : -1); }
    }, { passive: true });
    if (!FC.back) c.addEventListener("click", (e) => {
      if (e.target.closest("button, a, details, summary, textarea, input, .fig, table")) return;
      const sel = window.getSelection && String(window.getSelection()); if (sel && sel.length > 1) return;   /* 文字を選んでいるときはめくらない */
      flip();
    });
    const ta = $("#fcMemo");
    if (ta) {
      let tm = 0;
      const doSave = () => { clearTimeout(tm); M.setMemo(ta.dataset.id, ta.value); const st = $("#fcMemoSt"); if (st) st.textContent = ta.value.trim() ? "保存しました" : "メモを消しました"; };
      ta.addEventListener("input", () => { clearTimeout(tm); tm = setTimeout(doSave, 500); const st = $("#fcMemoSt"); if (st) st.textContent = "…"; });
      ta.addEventListener("blur", doSave);
    }
  }
  function flip() {
    if (!FC || FC.done) return;
    const c = $("#fcCard");
    U.SFX.tap();
    if (!c || (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)) { FC.back = !FC.back; render(); return; }
    c.classList.add("turn-out");
    setTimeout(() => { if (!FC) return; FC.back = !FC.back; render("turn-in"); }, 150);
  }
  function move(d) {
    if (!FC || FC.done) return;
    const ni = FC.i + d; if (ni < 0 || ni >= FC.ids.length) return;
    FC.i = ni; FC.back = false; FC.hint = 0; U.padNext();
    render(d > 0 ? "slide-l" : "slide-r");
  }
  function rate(k) {
    if (!FC || FC.done || !FC.back) return;
    const id = FC.ids[FC.i];
    FC.res[id] = k;
    const b = ST.b[id] || (ST.b[id] = { n: 0 });
    b.r = k; b.n = (b.n || 0) + 1; b.at = Date.now(); save();
    /* もう一度：このあと（5枚あと）にもう一度出す（同じカードは2回まで） */
    if (k === 0 && (FC.again[id] || 0) < 2) {
      FC.again[id] = (FC.again[id] || 0) + 1;
      const at = Math.min(FC.ids.length, FC.i + 1 + 5);
      if (FC.ids.indexOf(id, FC.i + 1) < 0) FC.ids.splice(at, 0, id);
    }
    if (k === 2) U.SFX.ok(); else U.SFX.tap();
    if (FC.i >= FC.ids.length - 1) { FC.done = true; U.padNext(); render(); U.SFX.done(); const c = counts(); if (c[2] === Object.keys(FC.res).length) U.confetti(30); return; }
    FC.i++; FC.back = false; FC.hint = 0; U.padNext();
    render("slide-l");
  }
  function hint() {
    if (!FC || FC.done || FC.back) return;
    const q = cur(), nh = (q.h || []).length;
    if (FC.hint >= nh) return;
    FC.hint++; render();
    const h = $$(".fc-front .hint-c"); if (h.length) { try { h[h.length - 1].scrollIntoView({ block: "nearest", behavior: "smooth" }); } catch (e) {} }
  }
  function doneHTML() {
    const ids = Object.keys(FC.res), c = counts(), weak = ids.filter((id) => FC.res[id] < 2);
    const row = (id) => { const q = D.BY[id], r = FC.res[id]; return '<button class="qrow fc-r' + r + '" data-a="detail" data-id="' + id + '"><span class="fc-rd">' + RT[r].nm + '</span><span class="qtx">' + esc(U.short(id, 60)) + '</span><span class="qmeta"><span class="qd">' + "★".repeat(q.d) + "</span></span></button>"; };
    return '<div class="pl-in fc-done">' +
      '<div class="fc-sum">' + F.mascot(c[0] ? "think" : "happy") + "<div><h2>おつかれさま！</h2><p>" + ids.length + "枚めくりました</p></div></div>" +
      '<div class="fc-sumc"><div class="ok"><b>' + c[2] + "</b><span>覚えた</span></div><div class=\"fhd\"><b>" + c[1] + "</b><span>あやしい</span></div><div class=\"ag\"><b>" + c[0] + "</b><span>もう一度</span></div></div>" +
      '<div class="fc-acts">' +
        (weak.length ? '<button class="cta sm" data-a="fcRedoWeak">' + ic("undo") + "<span>あやしい・もう一度の " + weak.length + "枚だけ、もう一周</span></button>" : "") +
        '<button class="btn" data-a="fcSolve">' + ic("play") + "<span>" + (weak.length ? "この " + weak.length + "問を演習で解く" : "めくった問題を演習で解く") + "</span></button>" +
        '<button class="btn ghost" data-a="fcAgainAll">' + ic("shuffle") + "<span>全部をもう一度めくる</span></button>" +
      "</div>" +
      '<p class="fc-note">' + ic("help") + "フラッシュカードの「覚えた」は自分用の目じるしです（習得の記録は、演習で正解したときだけ進みます）。</p>" +
      '<section class="lg glist fc-list">' + ids.map(row).join("") + "</section></div>";
  }

  /* ══ デッキえらび（ホームの「フラッシュカード」） ══ */
  function deckIds(k) {
    if (k === "due") return M.build("due", { n: 400 });
    if (k === "wrong") return M.build("wrong", { n: 400 });
    if (k === "bm") return M.build("bm");
    if (k === "unsure") return M.build("unsure", { n: 400 });
    if (k === "ok") return D.Q.filter((x) => M.status(x.id) === "ok").map((x) => x.id);
    if (k === "fcweak") return Object.keys(ST.b).filter((id) => D.BY[id] && ST.b[id].r != null && ST.b[id].r < 2);
    if (k === "memo") { const mm = M.get().memo || {}; return Object.keys(mm).filter((id) => D.BY[id] && mm[id] && mm[id].t); }
    if (k === "rand") return M.shuffle(D.Q.map((x) => x.id)).slice(0, 20);
    return [];
  }
  const DECKS = [
    ["due", "review", "今日の復習", "復習の予定が来ている問題"],
    ["wrong", "x", "まちがえた問題", "最後にまちがえた問題"],
    ["fcweak", "undo", "「もう一度」「あやしい」のカード", "フラッシュカードで覚えきれていないもの"],
    ["bm", "bm", "ブックマーク", "印をつけた問題"],
    ["memo", "memo", "メモを書いた問題", "自分のメモつき"],
    ["ok", "spark", "習得中の問題", "1回正解した問題（もう一歩で習得）"],
    ["rand", "shuffle", "ランダム 20枚", "全問題からおまかせ"],
  ];
  function openPicker() {
    const tg = (k, t, sub) => '<button class="tg' + (ST.opt[k] ? " on" : "") + '" data-a="fcOpt" data-k="' + k + '"><span><b>' + t + "</b>" + (sub ? "<small>" + sub + "</small>" : "") + '</span><i class="sw"></i></button>';
    const known = Object.keys(ST.b).filter((id) => D.BY[id] && ST.b[id].r === 2).length;
    const fields = Object.keys(D.F).map((f) => {
      const ts = Object.keys(D.T).filter((t) => D.T[t].f === f);
      return '<div class="fc-tf"><h4 style="--c:' + D.F[f].c + '"><i></i>' + esc(D.F[f].nm) + '</h4><div class="fc-tg">' + ts.map((t) => {
        const n = D.Q.filter((x) => x.t === t).length;
        return n ? '<button class="fc-t" data-a="fcTopic" data-t="' + t + '">' + U.sym(t, "xs") + "<span>" + esc(D.T[t].nm) + "</span><em>" + n + "</em></button>" : "";
      }).join("") + "</div></div>";
    }).join("");
    U.sheet('<p class="sh-pre">MagiChemLex</p><h2 class="sh-t">' + ic("flash") + " フラッシュカード</h2>" +
      '<p class="sh-sub">問題をカードにして、<b>答え・解説</b>をめくって確認します。裏には<b>自分のメモ</b>、下の「メモ」で手書き・電卓・公式も使えます。</p>' +
      '<div class="fc-decks">' + DECKS.map((d) => {
        const n = deckIds(d[0]).length;
        return '<button class="fc-dk" data-a="fcDeck" data-k="' + d[0] + '"' + (n ? "" : " disabled") + ">" + ic(d[1]) + "<span><b>" + d[2] + "</b><small>" + d[3] + "</small></span><em>" + (d[0] === "rand" ? "20" : n) + "</em></button>";
      }).join("") + "</div>" +
      '<h3 class="sh-h3">単元から</h3><div class="fc-tfs">' + fields + "</div>" +
      '<p class="sh-note">' + ic("help") + " 問題セットの画面・問題一覧（しぼりこみの条件のまま）からも始められます。</p>" +
      '<h3 class="sh-h3">設定</h3>' +
      tg("shuf", "シャッフル", "カードの順番を混ぜる") +
      tg("opts", "選択肢を表に出す", "オフにすると、選択肢なしで答えを思い出す練習に") +
      tg("hide", "覚えたカードを出さない", known ? "いま「覚えた」は " + known + "枚" : "「覚えた」にしたカードをとばす") +
      (known ? '<button class="btn ghost sm fc-rst" data-a="fcResetKnown">' + ic("undo") + "「覚えた」の印を全部もどす</button>" : ""), { cls: "fcsh" });
  }

  /* ══ キー操作（mcl-ui.js の keydown から） ══ */
  function key(e) {
    if (!FC) return false;
    const tg = e.target, typing = tg && (tg.tagName === "INPUT" || tg.tagName === "TEXTAREA");
    if (typing) return false;
    if (FC.done) return false;
    if (e.key === " " || e.code === "Space") { if (U.padOpenNow) return false; e.preventDefault(); flip(); return true; }
    if (e.key === "Enter") { e.preventDefault(); if (!FC.back) flip(); return true; }
    if (e.key === "ArrowRight") { e.preventDefault(); move(1); return true; }
    if (e.key === "ArrowLeft") { e.preventDefault(); move(-1); return true; }
    if (FC.back && /^[123]$/.test(e.key)) { e.preventDefault(); rate(+e.key - 1); return true; }
    if (e.key === "h" || e.key === "H") { hint(); return true; }
    if (e.key === "m" || e.key === "M") { if (U.padOpenNow) U.padClose(); else U.padOpen(); return true; }
    return false;
  }

  /* ══ data-a ══ */
  const A = U.act;
  A.fcPick = () => openPicker();
  A.fcDeck = (el) => { const k = el.dataset.k, d = DECKS.find((x) => x[0] === k); start(deckIds(k), { title: d ? d[2] : "フラッシュカード", keep: k === "due" }); };
  A.fcTopic = (el) => { const t = el.dataset.t; start(D.Q.filter((x) => x.t === t).map((x) => x.id), { title: D.T[t].nm }); };
  A.fcGroup = (el) => { const g = M.groupById(el.dataset.g); if (g) start(g.ids.slice(), { title: g.nm }); };
  A.fcLib = () => { const dom = $$('#libList [data-a="one"][data-id]').map((b) => b.dataset.id); start(dom, { title: "問題一覧から" }); };
  A.fcClose = () => close();
  A.fcFlip = () => flip();
  A.fcPrev = () => move(-1);
  A.fcNext = () => move(1);
  A.fcRate = (el) => rate(+el.dataset.v);
  A.fcHint = () => hint();
  A.fcPad = (el) => U.padOpen(el.dataset.v);
  A.fcOpt = (el) => { const k = el.dataset.k; ST.opt[k] = ST.opt[k] ? 0 : 1; save(); el.classList.toggle("on", !!ST.opt[k]); };
  A.fcResetKnown = (el) => {
    if (!el.dataset.arm) { el.dataset.arm = "1"; el.innerHTML = ic("undo") + "もう一度押すと、もどします"; setTimeout(() => { if (el.isConnected) { delete el.dataset.arm; el.innerHTML = ic("undo") + "「覚えた」の印を全部もどす"; } }, 3000); return; }
    Object.keys(ST.b).forEach((id) => { if (ST.b[id].r === 2) ST.b[id].r = 1; }); save(); openPicker(); U.toast("「覚えた」の印をもどしました");
  };
  A.fcRedoWeak = () => { const w = Object.keys(FC.res).filter((id) => FC.res[id] < 2); const t = FC.title; start(w, { title: t + "（もう一周）", all: true }); };
  A.fcAgainAll = () => { const all = Object.keys(FC.res); const t = FC.title; start(all, { title: t, all: true }); };
  A.fcSolve = () => {
    const ids = Object.keys(FC.res), w = ids.filter((id) => FC.res[id] < 2), t = FC.title;
    const go = w.length ? w : ids;
    FC = null; U.closePlay(); U.startSession(M.shuffle(go), { title: t + "（演習）" });
  };

  window.MCLFlash = { start, on: () => !!FC, key, reset, open: openPicker };
})();
