/* ============================================================
   MagiChemLex — mcl-book.js（模試の冊子）★★ 2026-10-27 新規
   ------------------------------------------------------------
   ご指定「各セットに模試モードは要りません。その代わり、それぞれ基礎1のようにまとめて
          実際の模試の冊子のようにすべての問題を解けるモードを追加して、解答解説も見られるように」
   ・1つの組（難関セット1・標準セット2・基礎セット1 …）の大問をぜんぶ、本物の冊子のように上から順に並べる。
       表紙（注意事項）→ 第1問 … 第n問（設定は変わったところで1回だけ・図・選択肢は ①②… の固定の順）→ 各問の下に解答欄。
   ・上のバー：解答ずみの数・時間（目安）。下のバー：メモ（手書き・電卓・公式）・解答用紙（番号の一覧→押すとその問へ）・提出。
   ・途中の答えはこの端末に保存（mcl_book_v1）→ 閉じても表紙から「続きから」。
   ・提出 → 採点（各問を M.answer で記録＝習得の記録も進む）→ その組の「総合」の模試の記録（M.finishSet：
     はじめて 60%・80%・100% をこえると XEVA）→ 解答・解説の冊子（あなたの答え・正解・○×・解説）。
     表紙から「解答・解説だけを見る」もできる（解かずに見る）。
   ・演習の画面（#play）をそのまま使う＝メモ（手書き・文字・電卓・公式）が使える（フラッシュカードと同じ作り）。
   ============================================================ */
(function () {
  "use strict";
  const D = window.MCL_DATA, M = window.MCL, F = window.MCLFig, U = window.MCLUI;
  if (!D || !M || !U) return;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = M.esc, fmt = M.fmt, ic = U.ic;
  const CIR = "①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳";
  const mmss = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };

  /* ══ 途中の答え（この端末だけ）：{ [組]: { ans:{id:答え}, el:かかった時間, at } } ══ */
  const KEY = "mcl_book_v1";
  function loadAll() { try { const o = JSON.parse(localStorage.getItem(KEY) || "null"); return o && typeof o === "object" ? o : {}; } catch (e) { return {}; } }
  function saveAll(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }
  function saved(g) { const o = loadAll()[g]; return o && o.ans && Object.keys(o.ans).length ? o : null; }

  /* ══ 組の中身 ══ */
  function fullKey(g) { return Object.keys(D.SETS).find((k) => D.SETS[k].full && D.SETS[k].grp === g) || null; }
  function daiKeys(g) { return Object.keys(D.SETS).filter((k) => !D.SETS[k].full && D.SETS[k].grp === g); }
  function idsOf(g) {
    const fk = fullKey(g);
    if (fk && D.SETS[fk].ids) return D.SETS[fk].ids.filter((id) => D.BY[id]);
    return daiKeys(g).reduce((a, k) => a.concat((D.SETS[k].ids || []).filter((id) => D.BY[id])), []);
  }
  const grpName = (g) => (D.GRP && D.GRP[g]) || "模試";
  function minOf(g) { const fk = fullKey(g); return fk ? D.SETS[fk].min || 60 : 60; }
  /* 「第1問 マーク」→ 見出しの「第1問」と残り */
  function daiHead(k) {
    const S = D.SETS[k] || {}, nm = String(S.nm0 || S.nm || "").replace(/（.*$/, "");
    const m = /^(第\d+問)\s*(.*)$/.exec(nm);
    return { no: m ? m[1] : nm, nm: m ? m[2] : "", sub: S.sub || "" };
  }
  /* 問の見出し：出典の「第1問」より後ろ（「問4」「(1)A」「A 問2」） */
  function qLabel(q, i) { const m = /第\d+問\s*(.*)$/.exec(q.src || ""); return (m && m[1].trim()) || "問" + (i + 1); }
  const shortOpts = (q) => (q.o || []).every((o) => String(o).replace(/<[^>]+>/g, "").length <= 3);

  /* ══ セッション ══
     BK = { g, key, ids, ans:{id:答え}, el, t0, ph:"cover"|"solve"|"review", rows（採点の結果・解かずに見たときは null）, only, open } */
  let BK = null, tickId = 0, saveT = 0;
  function open(g) {
    g = Number(g);
    const ids = idsOf(g);
    if (!ids.length) { U.toast("この組には問題がありません"); return; }
    U.closeSheet();
    const sv = saved(g);
    BK = { g, key: fullKey(g), ids, ans: sv ? Object.assign({}, sv.ans) : {}, el: sv ? sv.el || 0 : 0, t0: 0, ph: "cover", rows: null, only: "", fin: null, earned: [] };
    const pl = U.playShell(); pl.hidden = false; pl.classList.remove("exam", "fcm"); pl.classList.add("bkm");
    document.body.classList.add("playing");
    render();
  }
  function persist() {
    if (!BK || BK.ph !== "solve") return;
    const all = loadAll();
    all[BK.g] = { ans: BK.ans, el: elapsed(), at: Date.now() };
    saveAll(all);
  }
  function persistSoon() { clearTimeout(saveT); saveT = setTimeout(persist, 350); }
  function elapsed() { return BK ? BK.el + (BK.t0 ? Date.now() - BK.t0 : 0) : 0; }
  function pauseClock() { if (BK && BK.t0) { BK.el += Date.now() - BK.t0; BK.t0 = 0; } }
  function stopClock() { pauseClock(); clearInterval(tickId); tickId = 0; }
  function close() {
    if (BK && BK.ph === "solve") { stopClock(); persist(); if (Object.keys(BK.ans).length) U.toast("答えを保存しました（表紙の「続きから」で再開できます）"); }
    reset(); U.closePlay();
  }
  function reset() {
    clearInterval(tickId); tickId = 0; clearTimeout(saveT);
    BK = null;
    const pl = $("#play"); if (pl) pl.classList.remove("bkm");
  }

  /* ══ 画面 ══ */
  function nAns() { return BK.ids.filter((id) => isAnswered(id)).length; }
  function isAnswered(id) { const a = BK.ans[id]; return a != null && !(Array.isArray(a) && !a.length) && !(typeof a === "string" && !a.trim()); }
  function timeText() {
    const ms = elapsed(), lim = minOf(BK.g) * 60000;
    return BK.ph === "solve" ? (ms > lim ? "+" + mmss(ms - lim) : mmss(lim - ms)) : mmss(ms);
  }
  function paintTop() {
    const n = BK.ids.length, a = nAns();
    const tt = BK.ph === "review" ? (BK.rows ? "解答・解説" : "解答・解説（見るだけ）") : "模試の冊子";
    $("#plTop").innerHTML = '<button class="pl-x" data-a="bkClose" aria-label="閉じる">' + ic("x") + "</button>" +
      '<div class="pl-prog"><div class="pl-tt">' + ic("exam", "fct") + esc(grpName(BK.g)) + " ・ " + tt + '</div><div class="pl-bar"><i style="width:' + (BK.ph === "review" ? 100 : a / n * 100).toFixed(1) + '%"></i></div></div>' +
      (BK.ph === "solve" ? '<span class="pl-cnt">' + a + "<small>/" + n + "</small></span>" +
        '<span class="pl-time ex' + (elapsed() > minOf(BK.g) * 60000 ? " over" : "") + '" id="bkTime" title="目安の時間までの残り（こえたら＋）">' + timeText() + "</span>" : "");
  }
  function botHTML() {
    const memo = '<button class="bb tool memo' + (U.padHas() ? " has" : "") + (U.padOpenNow ? " on" : "") + '" data-a="pad" aria-label="メモ・電卓">' + ic("memo") + "<span>メモ</span></button>";
    if (BK.ph === "cover") return "";
    if (BK.ph === "solve") return memo + '<button class="bb tool" data-a="bkSheet">' + ic("grid") + "<span>解答用紙</span></button>" +
      '<button class="bb main" data-a="bkSubmit">' + ic("check") + "提出する</button>";
    const wrong = BK.rows ? BK.rows.filter((r) => !r.ok).map((r) => r.id) : [];
    return memo + (wrong.length ? '<button class="bb ghost" data-a="bkRedo">' + ic("review") + "<span>まちがい直し（" + wrong.length + "問）</span></button>" : "") +
      '<button class="bb main" data-a="bkAgain">' + ic("undo") + (BK.rows ? "もう一度解く" : "解きはじめる") + "</button>";
  }
  function render(keepScroll) {
    if (!BK) return;
    const body = $("#plBody"), y = keepScroll && body ? body.scrollTop : 0;
    paintTop();
    body.innerHTML = '<div class="pl-in bk-in">' + (BK.ph === "cover" ? coverHTML() : bookHTML()) + "</div>";
    body.scrollTop = y;
    $("#plBot").innerHTML = botHTML();
    $("#play").classList.toggle("bk-cv", BK.ph === "cover");
    if (BK.ph === "solve") $$(".bk-num").forEach((inp) => paintNum(inp.dataset.id));
  }

  /* ── 表紙 ── */
  function coverHTML() {
    const g = BK.g, n = BK.ids.length, dk = daiKeys(g), sv = saved(g), fk = BK.key;
    const b = fk ? M.bestRun(fk) : null, tries = fk ? (M.get().runs || []).filter((r) => r.set === fk).length : 0;
    const nCalc = BK.ids.filter((id) => M.isCalc(D.BY[id])).length;
    const R = M.REWARD, m = M.mult();
    const lv = M.lvOf ? M.lvOf(g) : "o";
    return '<section class="bk-cover">' +
      '<div class="bkc-top"><span>MagiChemLex</span><span>模試</span></div>' +
      '<div class="bkc-sub">' + (lv === "b" ? "基礎" : lv === "s" ? "標準" : "難関") + "レベル</div>" +
      '<h1 class="bkc-ttl">化 学</h1>' +
      '<div class="bkc-grp">' + esc(grpName(g)) + "</div>" +
      '<div class="bkc-meta"><span><b>' + dk.length + "</b>大問</span><span><b>" + n + "</b>問</span><span><b>" + minOf(g) + "</b>分（目安）</span></div>" +
      '<div class="bkc-dai">' + dk.map((k) => { const h = daiHead(k), c = (D.SETS[k].ids || []).length; return "<div><b>" + esc(h.no) + "</b><span>" + esc(h.nm || h.sub) + "</span><em>" + c + "問</em></div>"; }).join("") + "</div>" +
      '<div class="bkc-note"><h3>注意事項</h3><ol>' +
        "<li>この冊子は " + esc(daiHead(dk[0]).no) + "〜" + esc(daiHead(dk[dk.length - 1]).no) + "、全 " + n + " 問です（うち計算 " + nCalc + " 問）。</li>" +
        "<li>解答は各問いの下の<b>解答欄</b>にマーク（数値はキーで入力）してください。あとから何度でも直せます。</li>" +
        "<li>計算やメモには、下の「メモ」（手書き・文字・電卓・公式）を使えます。</li>" +
        "<li>途中でやめても、答えはこの端末に保存されます（表紙の「続きから」で再開）。</li>" +
        "<li>「提出する」で採点し、<b>解答・解説</b>を見られます。はじめて 60%・80%・100% をこえると +" + R.set60 * m + "・+" + R.set80 * m + "・+" + R.set100 * m + " XEVA" + (m > 1 ? "（いまは" + m + "倍）" : "") + "。</li>" +
      "</ol></div>" +
      '<div class="bkc-rec">' + (b ? "ベスト <b>" + Math.round(b.score / b.total * 100) + "%</b>（" + b.score + " / " + b.total + "）・挑戦 " + tries + "回" : "まだ挑戦していません") + "</div>" +
      '<div class="bkc-btns">' +
        (sv ? '<button class="btn main" data-a="bkStart" data-v="resume">' + ic("play") + " 続きから（" + Object.keys(sv.ans).length + " / " + n + " 解答ずみ・" + mmss(sv.el || 0) + "）</button>" +
          '<button class="btn" data-a="bkStart" data-v="new">' + ic("undo") + " はじめから解く</button>"
          : '<button class="btn main" data-a="bkStart" data-v="new">' + ic("play") + " 解答をはじめる</button>") +
        '<button class="btn ghost" data-a="bkView">' + ic("hint") + " 解答・解説だけを見る</button>" +
        '<button class="btn ghost" data-a="bkClose">' + ic("x") + " 閉じる</button>" +
      "</div>" +
      '<div class="bkc-foot">' + F.mascot("smile") + "<p>冊子をめくるように、上から順に解いていこう。わからない問題はとばして、最後にもどってきてね。</p></div>" +
      "</section>";
  }

  /* ── 冊子（解く／解答・解説） ── */
  function bookHTML() {
    const rv = BK.ph === "review";
    let h = "";
    if (rv) h += reviewTop();
    let idx = 0;
    daiKeys(BK.g).forEach((k) => {
      const ids = BK.ids.filter((id) => D.BY[id].set === k);
      if (!ids.length) return;
      const hd = daiHead(k);
      let dOk = 0;
      if (rv && BK.rows) ids.forEach((id) => { const r = BK.rows.find((x) => x.id === id); if (r && r.ok) dOk++; });
      h += '<section class="bk-dai"><h2 class="bk-dh"><b>' + esc(hd.no) + "</b><span>" + esc(hd.nm) + "</span>" + (rv && BK.rows ? "<em>" + dOk + " / " + ids.length + "</em>" : "<em>" + ids.length + "問</em>") + "</h2>" +
        (hd.sub ? '<p class="bk-dsub">' + esc(hd.sub) + "</p>" : "");
      let ctx = "";
      ids.forEach((id) => {
        const q = D.BY[id], i = BK.ids.indexOf(id);
        idx++;
        if (q.ctx && q.ctx !== ctx) { h += '<div class="bk-ctx">' + fmt(q.ctx) + "</div>"; }
        ctx = q.ctx || ctx;
        if (rv && BK.only === "ng" && BK.rows) { const r = BK.rows.find((x) => x.id === id); if (r && r.ok) return; }
        h += qHTML(q, i, rv);
      });
      h += "</section>";
    });
    if (!rv) h += '<div class="bk-end"><p>' + ic("flag") + " ここで終わりです。見直しがすんだら「提出する」。</p><button class=\"btn main\" data-a=\"bkSubmit\">" + ic("check") + " 提出する（解答 " + nAns() + " / " + BK.ids.length + "）</button></div>";
    return '<div class="bk' + (rv ? " rv" : "") + '">' + h + "</div>";
  }
  function qHTML(q, i, rv) {
    const a = BK.ans[q.id], r = rv && BK.rows ? BK.rows.find((x) => x.id === q.id) : null;
    const st = r ? (r.ok ? "ok" : isAnswered(q.id) ? "ng" : "na") : "";
    let h = '<article class="bk-q' + (st ? " " + st : "") + '" id="bkq' + i + '" data-i="' + i + '">' +
      '<div class="bk-qh"><span class="bk-no">' + (i + 1) + "</span><b>" + esc(qLabel(q, i)) + "</b>" +
      (M.isCalc(q) ? '<small class="bk-calc">計算</small>' : "") +
      (r ? '<span class="bk-res ' + st + '">' + ic(st === "ok" ? "check" : "x") + (st === "ok" ? "正解" : st === "ng" ? "不正解" : "未解答") + "</span>" : "") + "</div>" +
      '<div class="qtext">' + fmt(q.q) + "</div>" + (q.fig ? '<div class="fig">' + F.make(q.fig) + "</div>" : "");
    if (q.type !== "n" && !shortOpts(q)) {
      h += '<ol class="bk-opts">' + q.o.map((o, k) => {
        const cor = rv && (q.type === "m" ? q.a.indexOf(k) >= 0 : q.a === k), mine = Array.isArray(a) ? a.indexOf(k) >= 0 : a === k;
        return '<li class="' + (cor ? "cor" : "") + (mine && rv && !cor ? " my" : "") + '"><i>' + CIR[k] + "</i><span>" + M.fmtOpt(q, o) + "</span></li>";
      }).join("") + "</ol>";
    }
    h += '<div class="bk-ans">' + (rv ? ansReview(q, a) : ansInput(q, a)) + "</div>";
    if (rv) h += '<details class="bk-sol"' + (st !== "ok" ? " open" : "") + "><summary>" + ic("hint") + " 解説</summary>" + U.solHTML(q) + "</details>";
    return h + "</article>";
  }
  function markLabel(q, k) { return shortOpts(q) ? M.fmtOpt(q, q.o[k]) : CIR[k]; }
  function ansInput(q, a) {
    const i = BK.ids.indexOf(q.id);
    if (q.type === "n") {
      const v = typeof a === "string" ? a : "";
      return '<div class="bk-ah">解答欄<small>数値で（単位：' + (q.u ? fmt(q.u) : "なし") + "）</small></div>" +
        '<div class="bk-nrow"><label class="bk-nbox"><input class="bk-num" data-id="' + esc(q.id) + '"' + (U.isTouch ? " readonly" : "") + ' inputmode="decimal" autocomplete="off" spellcheck="false" placeholder="数値" value="' + esc(v) + '"><span>' + (q.u ? fmt(q.u) : "") + "</span></label>" +
        '<button class="bk-kpo" data-a="bkKp" data-id="' + esc(q.id) + '">' + ic("calc") + "<span>キー</span></button></div>" +
        '<div class="bk-prev" id="bkp' + i + '"></div>' +
        (BK.kp === q.id ? kpHTML(q.id) : "");
    }
    const sel = (k) => (q.type === "m" ? Array.isArray(a) && a.indexOf(k) >= 0 : a === k);
    return '<div class="bk-ah">解答欄<small>' + (q.type === "m" ? "あてはまるものを<b>すべて</b>" : "1つ選ぶ") + "</small></div>" +
      '<div class="bk-marks' + (shortOpts(q) ? " sh" : "") + '">' + q.o.map((o, k) => '<button class="bk-mk' + (sel(k) ? " on" : "") + '" data-a="bkPick" data-id="' + esc(q.id) + '" data-k="' + k + '">' + markLabel(q, k) + "</button>").join("") + "</div>";
  }
  function ansReview(q, a) {
    const your = !isAnswered(q.id) ? "<i>未解答</i>"
      : q.type === "c" ? markLabel(q, a) + (shortOpts(q) ? "" : "") : q.type === "m" ? a.map((k) => markLabel(q, k)).join("・") : esc(a) + (q.u ? " " + fmt(q.u) : "");
    const cor = q.type === "c" ? markLabel(q, q.a) + (shortOpts(q) ? "" : "<small>（" + M.fmtOpt(q, q.o[q.a]) + "）</small>") : q.type === "m" ? q.a.map((k) => markLabel(q, k)).join("・") : M.answerText(q);
    return '<div class="bk-rv">' + (BK.rows ? '<p class="ya"><span>あなたの答え</span><b>' + your + "</b></p>" : "") + '<p class="ca"><span>正解</span><b>' + cor + "</b></p></div>";
  }
  const KP = [["7"], ["8"], ["9"], ["bs", "⌫", "fn"], ["4"], ["5"], ["6"], ["-", "−", "fn"], ["1"], ["2"], ["3"], ["e", "×10ⁿ", "fn"], ["0", "0", "w2"], ["."], ["c", "C", "fn"]];
  function kpHTML(id) { return '<div class="kp bk-kp">' + KP.map((k) => '<button class="kpk' + (k[2] ? " " + k[2] : "") + '" data-a="bkKey" data-id="' + esc(id) + '" data-k="' + k[0] + '">' + (k[1] || k[0]) + "</button>").join("") + "</div>"; }
  function paintNum(id) {
    const i = BK.ids.indexOf(id), pv = $("#bkp" + i), q = D.BY[id]; if (!pv || !q) return;
    const v = BK.ans[id] || "", n = M.parseNum(v);
    pv.innerHTML = v ? (isFinite(n) ? "＝ " + (U.fmtNum ? U.fmtNum(n) : String(n)) + (q.u ? " " + fmt(q.u) : "") : '<span class="bad">数値として読めません</span>') : "";
  }
  function setAns(id, v) {
    if (v == null || (Array.isArray(v) && !v.length) || (typeof v === "string" && !v.trim())) delete BK.ans[id]; else BK.ans[id] = v;
    persistSoon(); paintTop();
  }

  /* ── 解答・解説の上（採点の結果） ── */
  function reviewTop() {
    if (!BK.rows) return '<section class="bk-sum view"><p>' + ic("hint") + " 解かずに<b>解答・解説</b>を見ています。下の「解きはじめる」で、この冊子を解けます。</p>" + filterHTML() + "</section>";
    const rows = BK.rows, ok = rows.filter((r) => r.ok).length, n = rows.length, pct = n ? ok / n : 0;
    const fin = BK.fin || { tiers: [] };
    const byD = daiKeys(BK.g).map((k) => { const rs = rows.filter((r) => D.BY[r.id].set === k); return { h: daiHead(k), ok: rs.filter((r) => r.ok).length, n: rs.length }; }).filter((x) => x.n);
    return '<section class="bk-sum">' +
      '<div class="bk-sum-h">' + U.ringW(pct, 120, 12, "<b>" + Math.round(pct * 100) + "%</b><small>" + ok + " / " + n + "</small>", "big") +
      '<div class="res-m">' + F.mascot(pct >= 0.8 ? "happy" : pct >= 0.6 ? "smile" : "think") + "<p>" + (pct >= 1 ? "パーフェクト！文句なし！" : pct >= 0.8 ? "すごい！合格ラインだよ！" : pct >= 0.6 ? "いい感じ！あと少し！" : "まちがえた問題の解説を読んでみよう。") + "</p><small>時間 " + mmss(BK.ms || 0) + "（目安 " + minOf(BK.g) + "分）</small></div></div>" +
      (fin.tiers && fin.tiers.length ? '<div class="fbn mas">' + ic("trophy") + "はじめて " + fin.tiers.map((t) => t + "%").join("・") + " をこえました！</div>" : "") +
      (U.earnHTML ? U.earnHTML(BK.earned) : "") +
      '<div class="bk-dsum">' + byD.map((x) => '<div><b>' + esc(x.h.no) + "</b><span>" + esc(x.h.nm) + '</span><div class="mini"><i style="width:' + (x.ok / x.n * 100).toFixed(0) + '%"></i></div><em>' + x.ok + "/" + x.n + "</em></div>").join("") + "</div>" +
      filterHTML() + "</section>";
  }
  function filterHTML() {
    return '<div class="bk-flt">' + (BK.rows ? '<button class="' + (BK.only ? "" : "on") + '" data-a="bkOnly" data-v="">すべて</button><button class="' + (BK.only === "ng" ? "on" : "") + '" data-a="bkOnly" data-v="ng">まちがえた問題だけ</button>' : "") +
      '<button data-a="bkSolAll" data-v="1">解説をすべて開く</button><button data-a="bkSolAll" data-v="0">すべて閉じる</button></div>';
  }

  /* ── 解答用紙（番号の一覧） ── */
  function openSheet(msg) {
    const n = BK.ids.length, a = nAns();
    U.sheet('<h2 class="sh-t">' + ic("grid") + " 解答用紙</h2>" + (msg ? '<p class="sh-warn">' + msg + "</p>" : "") +
      '<p class="sh-sub">解答ずみ <b>' + a + "</b> / " + n + "　時間 " + timeText() + "（目安 " + minOf(BK.g) + "分）</p>" +
      daiKeys(BK.g).map((k) => {
        const ids = BK.ids.filter((id) => D.BY[id].set === k); if (!ids.length) return "";
        return '<h3 class="sh-h3">' + esc(daiHead(k).no) + '</h3><div class="navg">' + ids.map((id) => { const i = BK.ids.indexOf(id); return '<button class="navb' + (isAnswered(id) ? " a" : "") + '" data-a="bkJump" data-i="' + i + '">' + (i + 1) + "</button>"; }).join("") + "</div>";
      }).join("") +
      '<div class="navlg"><span class="a">解答ずみ</span><span>未解答</span></div>' +
      '<button class="btn main wide" data-a="bkSubmit">' + ic("check") + (a < n ? " 提出する（未解答 " + (n - a) + "問）" : " 提出して採点する") + "</button>");
  }
  function jump(i) {
    U.closeSheet();
    const el = $("#bkq" + i), body = $("#plBody");
    if (el && body) body.scrollTo({ top: Math.max(0, el.offsetTop - 10), behavior: "smooth" });
  }

  /* ── 提出・採点 ── */
  function askSubmit() {
    const n = BK.ids.length, a = nAns();
    U.sheet('<h2 class="sh-t">' + ic("check") + " 提出しますか？</h2>" +
      '<p class="sh-sub">解答ずみ <b>' + a + "</b> / " + n + (a < n ? "（未解答の " + (n - a) + "問は不正解になります）" : "") + "。採点のあと、解答・解説を見られます。</p>" +
      '<div class="sh-btns"><button class="btn main" data-a="bkGrade">提出して採点する</button><button class="btn" data-a="bkSheet">解答用紙を見る</button><button class="btn ghost" data-a="shclose">つづける</button></div>');
  }
  function grade() {
    U.closeSheet();
    stopClock();
    const ms = BK.el;
    const rows = BK.ids.map((id) => { const q = D.BY[id], a = BK.ans[id]; return { id, ok: isAnswered(id) && M.judge(q, a) }; });
    rows.forEach((r) => { M.answer(r.id, r.ok, { ms: Math.round(ms / rows.length), exam: true }); });
    const score = rows.filter((r) => r.ok).length, total = rows.length;
    BK.fin = BK.key ? M.finishSet(BK.key, { score, total, ms, wrong: rows.filter((r) => !r.ok).map((r) => r.id), nm: grpName(BK.g) + "の冊子" }) : { tiers: [] };
    BK.earned = M.takeEarned();
    try { M.takeWp && M.takeWp(); } catch (e) {}
    const all = loadAll(); delete all[BK.g]; saveAll(all);
    BK.rows = rows; BK.ms = ms; BK.ph = "review"; BK.only = "";
    U.closeSheet();
    render();
    U.SFX && U.SFX.done && U.SFX.done();
    if (total && score / total >= 0.8) setTimeout(() => U.confetti(60), 200);
    try { U.paintHeader && U.paintHeader(); } catch (e) {}
  }

  /* ══ data-a ══ */
  const A = U.act;
  A.bookOpen = (el) => open(el.dataset.g);
  A.bkClose = () => close();
  A.bkStart = (el) => {
    if (!BK) return;
    if (el.dataset.v === "new") { BK.ans = {}; BK.el = 0; const all = loadAll(); delete all[BK.g]; saveAll(all); }
    BK.ph = "solve"; BK.t0 = Date.now(); BK.kp = null;
    render();
    clearInterval(tickId);
    tickId = setInterval(() => {
      if (!BK || BK.ph !== "solve") return;
      const t = $("#bkTime"); if (t) { t.textContent = timeText(); t.classList.toggle("over", elapsed() > minOf(BK.g) * 60000); }
      if (!BK.warned && elapsed() > minOf(BK.g) * 60000) { BK.warned = true; U.toast("⏰ 目安の時間になりました。このまま続けることもできます"); }
    }, 1000);
    if (el.dataset.v === "resume") setTimeout(() => { const k = BK.ids.findIndex((id) => !isAnswered(id)); if (k > 0) jump(k); }, 120);
  };
  A.bkView = () => {
    if (!BK) return;
    if (!Object.keys(BK.ans).length && !(BK.key && M.bestRun(BK.key))) {
      U.sheet('<h2 class="sh-t">' + ic("hint") + " 解答・解説を見ますか？</h2><p class=\"sh-sub\">まだこの冊子を解いていません。先に答えを見ると、模試としての練習にはなりにくくなります。</p>" +
        '<div class="sh-btns"><button class="btn main" data-a="bkViewGo">解答・解説を見る</button><button class="btn ghost" data-a="shclose">やめる</button></div>');
      return;
    }
    A.bkViewGo();
  };
  A.bkViewGo = () => { if (!BK) return; U.closeSheet(); BK.ph = "review"; BK.rows = null; BK.only = ""; render(); };
  A.bkPick = (el) => {
    if (!BK || BK.ph !== "solve") return;
    const id = el.dataset.id, k = +el.dataset.k, q = D.BY[id]; if (!q) return;
    let v;
    if (q.type === "m") { v = Array.isArray(BK.ans[id]) ? BK.ans[id].slice() : []; const p = v.indexOf(k); if (p >= 0) v.splice(p, 1); else v.push(k); }
    else v = BK.ans[id] === k ? null : k;
    setAns(id, v);
    const box = el.parentElement;
    $$(".bk-mk", box).forEach((b) => { const kk = +b.dataset.k; b.classList.toggle("on", q.type === "m" ? Array.isArray(v) && v.indexOf(kk) >= 0 : v === kk); });
    U.SFX && U.SFX.tap && U.SFX.tap();
  };
  A.bkKp = (el) => { if (!BK) return; BK.kp = BK.kp === el.dataset.id ? null : el.dataset.id; render(true); };
  A.bkKey = (el) => {
    if (!BK || BK.ph !== "solve") return;
    const id = el.dataset.id, k = el.dataset.k;
    let v = String(BK.ans[id] || "");
    if (/^\d$/.test(k)) v += k;
    else if (k === ".") { const part = v.split("×10^"); const cur = part[part.length - 1]; if (part.length === 1 && cur.indexOf(".") < 0) v += (cur === "" || cur === "-" ? "0." : "."); }
    else if (k === "-") { if (/×10\^$/.test(v)) v += "-"; else if (/×10\^-$/.test(v)) v = v.slice(0, -1); else if (v.indexOf("×10^") < 0) v = v[0] === "-" ? v.slice(1) : "-" + v; else { const p = v.split("×10^"); p[1] = p[1][0] === "-" ? p[1].slice(1) : "-" + p[1]; v = p.join("×10^"); } }
    else if (k === "e") { if (v.indexOf("×10^") < 0 && /\d/.test(v)) v += "×10^"; }
    else if (k === "bs") v = /×10\^$/.test(v) ? v.slice(0, -4) : v.slice(0, -1);
    else if (k === "c") v = "";
    setAns(id, v);
    const inp = $('.bk-num[data-id="' + id + '"]'); if (inp) inp.value = v;
    paintNum(id);
    U.SFX && U.SFX.tap && U.SFX.tap();
  };
  A.bkSheet = () => { if (BK && BK.ph === "solve") openSheet(); };
  A.bkJump = (el) => jump(+el.dataset.i);
  A.bkSubmit = () => { if (BK && BK.ph === "solve") askSubmit(); };
  A.bkGrade = () => { if (BK && BK.ph === "solve") grade(); };
  A.bkOnly = (el) => { if (!BK) return; BK.only = el.dataset.v || ""; render(true); };
  A.bkSolAll = (el) => { $$(".bk-sol").forEach((d) => { d.open = el.dataset.v === "1"; }); };
  A.bkRedo = () => {
    if (!BK || !BK.rows) return;
    const w = BK.rows.filter((r) => !r.ok).map((r) => r.id), t = grpName(BK.g) + "（冊子のまちがい直し）";
    reset(); U.closePlay(); U.startSession(M.shuffle(w), { title: t });
  };
  /* 採点のあと＝答えを消して表紙へ／解かずに見ていたとき＝途中の答えはそのまま表紙へ（「続きから」で再開） */
  A.bkAgain = () => {
    if (!BK) return;
    if (BK.rows) { const all = loadAll(); delete all[BK.g]; saveAll(all); BK.ans = {}; BK.el = 0; }
    else { const sv = saved(BK.g); BK.ans = sv ? Object.assign({}, sv.ans) : {}; BK.el = sv ? sv.el || 0 : 0; }
    BK.rows = null; BK.ph = "cover"; render();
  };

  /* 数値の欄に直接打ったとき（PC） */
  document.addEventListener("input", (e) => {
    const t = e.target; if (!BK || BK.ph !== "solve" || !t || !t.classList || !t.classList.contains("bk-num")) return;
    setAns(t.dataset.id, t.value); paintNum(t.dataset.id);
  });
  /* 裏にいるあいだは時間を止める（もどったら再開）・答えはすぐ保存 */
  window.addEventListener("pagehide", () => { if (BK && BK.ph === "solve") { pauseClock(); persist(); } });
  document.addEventListener("visibilitychange", () => {
    if (!BK || BK.ph !== "solve") return;
    if (document.hidden) { pauseClock(); persist(); } else if (!BK.t0) BK.t0 = Date.now();
  });

  window.MCLBook = { open, on: () => !!BK, reset, idsOf, fullKey, saved };
})();
