/* ============================================================
   XEVYNAR — 画面の組み立てと操作
   ------------------------------------------------------------
   ・「提供：XEVYNAR」の帯は 2026-08-19 に廃止した（毎回出て読みにくかった）。
     あいさつや操作の返事にまで付けると、ただのノイズになって本文が読みにくい。
   ・タイマーは <b>科目・目的の入力なし</b>で始められ、<b>時間は自由</b>に決められる。
     終わっても勝手に学習記録へは残さない（記録はあくまで任意）。
   ・iPhone でシートやチャット欄が画面外に出ないよう、
     実際に見えている高さ（visualViewport）を --xv-vph に流し込む。
   ============================================================ */
(function () {
  "use strict";
  const X = window.XV, T = window.XVTalk, esc = X.esc;
  const el = (id) => document.getElementById(id);

  /* ── 見えている高さを CSS へ（キーボードを出しても閉じるボタンが押せるように） ── */
  function syncVh() {
    const vv = window.visualViewport;
    if (!vv) return;
    document.documentElement.style.setProperty("--xv-vph", Math.max(240, Math.round(vv.height)) + "px");
  }
  if (window.visualViewport) {
    visualViewport.addEventListener("resize", syncVh);
    visualViewport.addEventListener("scroll", syncVh);
    syncVh();
  }
  window.addEventListener("orientationchange", () => setTimeout(syncVh, 250));

  /* ── トースト ── */
  let toastT = null;
  function toast(msg, ms) {
    const t = el("xvToast");
    t.innerHTML = msg; t.classList.add("on");
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), ms || 2400);
  }
  window.xvToast = toast;

  /* ══════════ タブ ══════════ */
  const PAGES = { chat: "xvChatPage", study: "xvStudyPage", solve: "xvSolvePage",
                  timer: "xvTimerPage", report: "xvReportPage", config: "xvConfigPage" };
  let page = "chat";
  function go(p) {
    if (!PAGES[p]) return;
    page = p;
    Object.keys(PAGES).forEach((k) => el(PAGES[k]).classList.toggle("on", k === p));
    document.querySelectorAll(".xv-tab").forEach((t) => t.classList.toggle("on", t.dataset.p === p));
    document.body.classList.toggle("xv-chat", p === "chat");   // 入力欄は相談タブだけ出す
    if (p === "study") renderStudy();
    if (p === "solve") renderSolve();
    if (p === "report") renderReport();
    if (p === "config") renderConfig();
    if (p === "timer") renderTimer();
    if (p === "chat") setTimeout(scrollLog, 30);
    else window.scrollTo(0, 0);
  }
  window.xvGo = go;

  /* ══════════════════════════════════════════════════════════
     ★★ 2026-08-18 解法（難問をステップで学ぶ）

     ・XVSteps（xevynar-steps.js）が持っている<b>定石</b>を、1手ずつ見せる。
     ・1手ごとに「わからない」を開くと、その手の<b>ヒント・使う公式・
       その手だけのかんたんな例題</b>が出る。
       ＝ 全部読まなくても、詰まったところだけ戻れる。
     ・MagiLex の難問からは #solve=<定石id> か #learn=<問題文> で飛んでくる。
       #learn の場合は問題文から合いそうな定石を並べて選ばせる。
     ・どこまで見たかは端末に控える（xevynar_steps_v1）。
     ══════════════════════════════════════════════════════════ */
  const SOLVE_KEY = "xevynar_steps_v1";
  let solveState = { id: null, step: 0, open: {}, sub: "all", q: "" };
  function solveLog() {
    try { return JSON.parse(localStorage.getItem(SOLVE_KEY) || "null") || { done: {}, at: 0 }; }
    catch (e) { return { done: {}, at: 0 }; }
  }
  function solveLogSave(l) { try { l.at = Date.now(); localStorage.setItem(SOLVE_KEY, JSON.stringify(l)); } catch (e) {} }
  function solveMarkDone(id, step) {
    const l = solveLog();
    l.done[id] = Math.max(l.done[id] | 0, step + 1);
    solveLogSave(l);
  }
  function S() { return window.XVSteps || null; }

  /* 一覧（分野からえらぶ） */
  function renderSolveList() {
    const st = S();
    const top = el("xvSolveTop"), body = el("xvSolveBody");
    if (!st) { top.innerHTML = ""; body.innerHTML = '<div class="xv-card"><div class="xv-p">解法の台帳を読み込めませんでした。</div></div>'; return; }
    const c = st.count(), l = solveLog();
    const subs = [["all", "すべて"], ["math", "数学"], ["phys", "物理"], ["chem", "化学"]];
    top.innerHTML =
      '<div class="xv-card">' +
        '<div class="xv-h">難問をステップで学ぶ</div>' +
        '<div class="xv-p">答えを見ても次に解けるようにならないのは、<b>手の順番</b>が身についていないからです。' +
        'ここでは「この形を見たら、まずこれをする」を<b>1手ずつ</b>たどれます。' +
        'どの手でも<b>わからない</b>を押せば、その手だけの<b>ヒント・公式・かんたんな例題</b>が開きます。</div>' +
        '<div class="xv-p" style="opacity:.75">いま <b>' + c.methods + '</b> の定石／<b>' + c.steps +
        '</b> 手／<b>' + c.formulas + '</b> の公式が入っています。</div>' +
      '</div>' +
      '<div class="xv-chipline">' + subs.map(([k, nm]) =>
        '<button class="xv-chip' + (solveState.sub === k ? " on" : "") + '" onclick="xvSolveSub(\'' + k + '\')">' + nm + "</button>").join("") + "</div>";

    const groups = st.topics(solveState.sub === "all" ? null : solveState.sub);
    body.innerHTML = groups.map((g) =>
      '<div class="xv-lab">' + esc(g.subNm) + " ・ " + esc(g.topic) + "</div>" +
      '<div class="xv-list">' + g.list.map((m) => {
        const seen = (l.done[m.id] | 0), all = (m.steps || []).length;
        const badge = seen >= all ? "見おわった" : seen > 0 ? (seen + "/" + all + " まで") : (all + " 手");
        return '<button class="xv-row" onclick="xvSolveOpen(\'' + m.id + '\')">' +
          '<span class="xv-row-t">' + esc(m.nm) + "</span>" +
          '<span class="xv-row-s">' + esc(st.LV_NM[m.lv] || "") + " ・ " + badge + "</span></button>";
      }).join("") + "</div>").join("") ||
      '<div class="xv-card"><div class="xv-p">この分野の定石はまだありません。</div></div>';
  }
  window.xvSolveSub = (k) => { solveState.sub = k; solveState.id = null; renderSolve(); };

  /* 問題文から候補を出す（MagiLex からの #learn= で使う） */
  function renderSolveCandidates(q) {
    const st = S(); if (!st) return renderSolveList();
    const hits = st.find(q, 8);
    const top = el("xvSolveTop"), body = el("xvSolveBody");
    top.innerHTML = '<div class="xv-card"><div class="xv-h">この問題に合いそうな解きかた</div>' +
      '<div class="xv-p">' + esc(String(q).slice(0, 160)) + "</div></div>";
    if (!hits.length) {
      body.innerHTML = '<div class="xv-card"><div class="xv-p">ぴったりの定石がまだありません。' +
        '下の一覧から分野をえらんでください。</div>' +
        '<div class="xv-acts"><button onclick="xvSolveAll()">分野からえらぶ</button>' +
        '<button onclick="xvGo(\'chat\')">そのまま質問する</button></div></div>';
      return;
    }
    body.innerHTML = '<div class="xv-list">' + hits.map((m) =>
      '<button class="xv-row" onclick="xvSolveOpen(\'' + m.id + '\')">' +
      '<span class="xv-row-t">' + esc(m.nm) + "</span>" +
      '<span class="xv-row-s">' + esc(st.SUB_NM[m.sub]) + " ・ " + esc(m.topic) + "</span></button>").join("") +
      "</div>" +
      '<div class="xv-card"><div class="xv-acts"><button onclick="xvSolveAll()">分野からえらぶ</button></div></div>';
  }
  window.xvSolveAll = () => { deep.view = ""; solveState.q = ""; solveState.id = null; renderSolveList(); };

  /* 1つの定石を、1手ずつ見せる */
  function renderSolveOne(m) {
    const st = S();
    const top = el("xvSolveTop"), body = el("xvSolveBody");
    const steps = m.steps || [], n = steps.length;
    const i = Math.max(0, Math.min(n - 1, solveState.step));
    const sp = steps[i] || {};
    const opened = !!solveState.open[i];
    top.innerHTML =
      '<div class="xv-card">' +
        '<div class="xv-acts" style="margin:0 0 8px"><button onclick="xvSolveAll()">← ほかの解きかた</button></div>' +
        '<div class="xv-h">' + esc(m.nm) + "</div>" +
        '<div class="xv-p" style="opacity:.75">' + esc(st.SUB_NM[m.sub]) + " ・ " + esc(m.topic) +
          " ・ " + esc(st.LV_NM[m.lv] || "") + "</div>" +
        '<div class="xv-p" style="margin-top:6px">' + m.idea + "</div>" +
      "</div>" +
      '<div class="xv-steps-bar">' + steps.map((s, k) =>
        '<button class="xv-sdot' + (k === i ? " on" : "") + (k < i ? " done" : "") +
        '" onclick="xvSolveStep(' + k + ')" title="' + esc(s.t) + '">' + (k + 1) + "</button>").join("") + "</div>";

    let html = '<div class="xv-card xv-step">' +
      '<div class="xv-step-n">STEP ' + (i + 1) + " / " + n + "</div>" +
      '<div class="xv-h">' + esc(sp.t || "") + "</div>" +
      '<div class="xv-p">' + (sp.d || "") + "</div>";
    /* わからない → その手だけのヒント・公式・例題 */
    html += '<div class="xv-acts"><button class="' + (opened ? "on" : "") + '" onclick="xvSolveHint(' + i + ')">' +
      (opened ? "とじる" : "？ この手がわからない") + "</button></div>";
    if (opened) {
      html += '<div class="xv-hintbox">';
      if (sp.hint) html += '<div class="xv-hb"><b>言いかえると</b><p>' + sp.hint + "</p></div>";
      const fs = st.formsOf(m);
      if (fs.length) {
        html += '<div class="xv-hb"><b>ここで使う公式</b>' + fs.map((f) =>
          '<p class="xv-form"><i>' + esc(f.nm) + "</i>" + esc(f.body) +
          (f.body2 ? "<br>" + esc(f.body2) : "") +
          (f.note ? '<span class="xv-note">' + esc(f.note) + "</span>" : "") + "</p>").join("") + "</div>";
      }
      /* ★ 2026-08-19 その手でつまずいたときは、絵を見るのがいちばん早いことが多い */
      const FH = window.XVFigs;
      if (FH && (m.figs || []).length) {
        const fid = m.figs[0], fg = FH.info(fid);
        if (fg) html += '<div class="xv-hb"><b>絵で見ると</b>' +
          '<div class="xv-figbox">' + FH.make(fid) +
          '<div class="xv-note">' + esc(fg.cap) + "</div></div></div>";
      }
      if (sp.ex) {
        html += '<div class="xv-hb"><b>この手だけの、かんたんな例題</b>' +
          "<p>" + esc(sp.ex.q) + "</p>" +
          '<p class="xv-ans">答え： ' + esc(sp.ex.a) + "</p>" +
          (sp.ex.how ? '<p class="xv-note">' + esc(sp.ex.how) + "</p>" : "") + "</div>";
      }
      html += "</div>";
    }
    html += '<div class="xv-acts xv-stepnav">' +
      '<button onclick="xvSolveStep(' + (i - 1) + ')"' + (i <= 0 ? " disabled" : "") + ">← まえの手</button>" +
      (i < n - 1
        ? '<button class="on" onclick="xvSolveStep(' + (i + 1) + ')">わかった、つぎへ →</button>'
        : '<button class="on" onclick="xvSolveFinish()">通しで解いてみる →</button>') +
      "</div></div>";

    /* ★★ 2026-08-19 その解きかたの「絵」。
       公式だけ見てもピンと来ない形（グラフ・力の向き・回路・表）を1枚出す。
       手順を見ているあいだ<b>ずっと</b>出しておきたいので、STEP のカードの直後に置く。 */
    const F2 = window.XVFigs;
    if (F2 && (m.figs || []).length) {
      html += '<div class="xv-card"><div class="xv-h">図で見る</div>' +
        m.figs.map((fid) => {
          const fg = F2.info(fid); if (!fg) return "";
          return '<div class="xv-figbox"><div class="xv-figt">' + esc(fg.nm) + "</div>" +
            F2.make(fid) + '<div class="xv-note">' + esc(fg.cap) + "</div></div>";
        }).join("") + "</div>";
    }
    /* 最後まで来たら、通しの例題・落とし穴・つぎに進む先 */
    if (i >= n - 1 && m.demo) {
      html += '<div class="xv-card"><div class="xv-h">通しの例題</div>' +
        '<div class="xv-p"><b>' + esc(m.demo.q) + "</b></div>" +
        '<ol class="xv-sol">' + (m.demo.sol || []).map((x) => "<li>" + x + "</li>").join("") + "</ol></div>";
    }
    if (i >= n - 1 && (m.traps || []).length) {
      html += '<div class="xv-card"><div class="xv-h">よくある落とし穴</div><ul class="xv-sol">' +
        m.traps.map((x) => "<li>" + esc(x) + "</li>").join("") + "</ul></div>";
    }
    if (i >= n - 1) {
      const nx = (m.next || []).map((id) => st.byId(id)).filter(Boolean);
      html += '<div class="xv-card"><div class="xv-h">つぎに読むとよいもの</div>' +
        (nx.length
          ? '<div class="xv-list">' + nx.map((x) =>
              '<button class="xv-row" onclick="xvSolveOpen(\'' + x.id + '\')"><span class="xv-row-t">' +
              esc(x.nm) + '</span><span class="xv-row-s">' + esc(x.topic) + "</span></button>").join("") + "</div>"
          : '<div class="xv-p">この分野はここまでです。</div>') +
        '<div class="xv-acts"><button onclick="xvStartQuiz(5)">似た問題を解いてみる</button>' +
        '<button onclick="xvSolveAll()">ほかの解きかたを見る</button></div>' +
        "</div>";
    }
    body.innerHTML = html;
    window.scrollTo(0, 0);
  }
  window.xvSolveStep = (k) => {
    const st = S(); if (!st) return;
    const m = st.byId(solveState.id); if (!m) return;
    const n = (m.steps || []).length;
    solveState.step = Math.max(0, Math.min(n - 1, k));
    solveState.open = {};
    solveMarkDone(m.id, solveState.step);
    renderSolveOne(m);
  };
  window.xvSolveHint = (k) => {
    solveState.open[k] = !solveState.open[k];
    const st = S(); const m = st && st.byId(solveState.id);
    if (m) renderSolveOne(m);
  };
  window.xvSolveOpen = (id) => {
    const st = S(); if (!st) return;
    const m = st.byId(id); if (!m) return;
    solveState.id = id; solveState.step = 0; solveState.open = {};
    go("solve");
    solveMarkDone(id, 0);
    renderSolveOne(m);
  };
  window.xvSolveFinish = () => {
    const st = S(); const m = st && st.byId(solveState.id); if (!m) return;
    solveMarkDone(m.id, (m.steps || []).length - 1);
    toast("この解きかたを最後まで見ました");
    renderSolveOne(m);
  };
  function renderSolve() {
    if (!el("xvSolvePage")) return;
    const st = S();
    /* ★★ 2026-08-18b 1問ごとの「くわしい解説」を先に見る（MagiLex から来るのはこちら） */
    if (deep.view) { renderDeep(); return; }
    if (st && solveState.id && st.byId(solveState.id)) { renderSolveOne(st.byId(solveState.id)); return; }
    if (solveState.q) { renderSolveCandidates(solveState.q); return; }
    renderSolveMenu();
  }

  /* ══════════════════════════════════════════════════════════
     ★★ 2026-08-18b 1問ごとの「くわしい解説」

     MagiLex の 数学・物理・化学γ の<b>すべての問題</b>について、
     答えの下に出る短い解説より詳しい解説を、その場で組み立てて見せる。
     組み立ては XVDeep（xevynar-deep.js）、図は XVFigs、用語は XVTerms。

     画面は4段:
       menu → 科目 → セット → 問題一覧 → くわしい解説
     MagiLex からは <b>#q=sid:qi</b> でいきなり最後の段へ入る。
     ══════════════════════════════════════════════════════════ */
  const deep = { view: "", sub: "", sid: "", qi: 0, open: {}, ladder: {},
                 /* ★ 2026-08-19 MagiLex で「まちがえた問題をまとめて見る」から来たときの並び */
                 miss: null, missAt: -1 };
  /* MagiLex が控えた「まちがえた問題」を読む（1回きり。読んだら消す） */
  function loadMissed() {
    try {
      const r = JSON.parse(localStorage.getItem("xevynar_missed_v1") || "null");
      localStorage.removeItem("xevynar_missed_v1");
      if (r && Array.isArray(r.list) && r.list.length) return r.list;
    } catch (e) {}
    return null;
  }
  function D() { return window.XVDeep || null; }

  /* 入口（解法タブを開いたときの最初の画面） */
  function renderSolveMenu() {
    const st = S();
    const top = el("xvSolveTop"), body = el("xvSolveBody");
    top.innerHTML = '<div class="xv-card"><div class="xv-h">わからない問題を、わかるまで</div>' +
      '<div class="xv-p">「答えは見たけれど、次も解ける気がしない」を無くすための場所です。' +
      '<b>1問ずつのくわしい解説</b>と、<b>その形ぜんぶに効く解きかた</b>の2つから入れます。</div></div>';
    const c = st ? st.count() : { methods: 0, steps: 0, formulas: 0 };
    body.innerHTML =
      '<button class="xv-big" onclick="xvDeepGo(\'sub\')">' +
        '<b>📘 問題ごとの くわしい解説</b>' +
        '<span>MagiLex の 数学・物理・化学の<b>最難関</b>の1問1問について、' +
        '何を聞かれているか → 方針 → 手順 → 図 → 確かめかた → 誤答の理由 まで出します。' +
        '分からない言葉は、その場でやさしい例題までさかのぼれます。</span></button>' +
      '<button class="xv-big alt" onclick="xvSolveAll()">' +
        '<b>🧭 解きかた（定石）から</b>' +
        '<span>「この形を見たら、まずこれをする」を1手ずつ。' +
        'いま ' + c.methods + ' の定石／' + c.steps + ' 手／' + c.formulas + ' の公式。</span></button>';
  }
  window.xvSolveMenu = () => { deep.view = ""; solveState.id = null; solveState.q = ""; renderSolve(); };

  window.xvDeepGo = async (view, a, b) => {
    const dp = D();
    if (!dp) { toast("解説の台帳を読み込めませんでした"); return; }
    go("solve");
    if (!dp.ready()) {
      el("xvSolveTop").innerHTML = '<div class="xv-card"><div class="xv-p">問題を読み込んでいます…</div></div>';
      el("xvSolveBody").innerHTML = "";
      await dp.load();
    }
    deep.view = view;
    if (view === "set") deep.sub = a;
    if (view === "qlist") deep.sid = a;
    if (view === "q") { deep.sid = a; deep.qi = b | 0; deep.open = {}; deep.ladder = {}; }
    renderDeep();
    window.scrollTo(0, 0);
  };

  function subChip(k, nm, n) {
    return '<button class="xv-row" onclick="xvDeepGo(\'set\',\'' + k + '\')">' +
      '<span class="xv-row-t">' + nm + '</span><span class="xv-row-s">' + n + ' 問</span></button>';
  }
  function renderDeep() {
    const dp = D(); if (!dp) return;
    if (deep.view === "sub") return renderDeepSubs();
    if (deep.view === "set") return renderDeepSets();
    if (deep.view === "qlist") return renderDeepQList();
    if (deep.view === "q") return renderDeepOne();
    deep.view = ""; renderSolve();
  }
  function renderDeepSubs() {
    const dp = D();
    const all = dp.sets();
    const cnt = { math: 0, phys: 0, chem: 0 };
    all.forEach((s) => { cnt[s.sub] = (cnt[s.sub] || 0) + s.n; });
    el("xvSolveTop").innerHTML =
      '<div class="xv-card"><div class="xv-acts" style="margin:0 0 8px"><button onclick="xvSolveMenu()">← もどる</button></div>' +
      '<div class="xv-h">問題ごとの くわしい解説</div>' +
      '<div class="xv-p">科目をえらんでください。<b>最難関</b>の' +
      '<b>' + all.reduce((a, s) => a + s.n, 0) + ' 問</b>に解説が出ます。' +
      'それ以外の段（入門・中堅・難関）は、答えの下の解説と<b>解きかた（定石）</b>で扱います。</div></div>';
    el("xvSolveBody").innerHTML = '<div class="xv-list">' +
      subChip("math", "数学", cnt.math) + subChip("phys", "物理", cnt.phys) + subChip("chem", "化学", cnt.chem) +
      "</div>";
  }
  function renderDeepSets() {
    const dp = D();
    const list = dp.sets(deep.sub);
    el("xvSolveTop").innerHTML =
      '<div class="xv-card"><div class="xv-acts" style="margin:0 0 8px"><button onclick="xvDeepGo(\'sub\')">← 科目</button></div>' +
      '<div class="xv-h">' + esc(dp.SUB_NM[deep.sub] || "") + '</div>' +
      '<div class="xv-p">分野をえらぶと、問題の一覧が出ます。</div></div>';
    el("xvSolveBody").innerHTML = '<div class="xv-list">' + list.map((s) =>
      '<button class="xv-row" onclick="xvDeepGo(\'qlist\',\'' + s.sid + '\')">' +
      '<span class="xv-row-t">' + esc(s.icon + " " + s.nm) + '</span>' +
      '<span class="xv-row-s">' + esc(s.lvNm) + " ・ " + s.n + " 問</span></button>").join("") + "</div>";
  }
  function renderDeepQList() {
    const dp = D();
    const sec = dp.secOf(deep.sid); if (!sec) { deep.view = "sub"; return renderDeep(); }
    el("xvSolveTop").innerHTML =
      '<div class="xv-card"><div class="xv-acts" style="margin:0 0 8px">' +
        '<button onclick="xvDeepGo(\'set\',\'' + (dp.sets().find((x) => x.sid === deep.sid) || {}).sub + '\')">← 分野</button></div>' +
      '<div class="xv-h">' + esc(sec.name) + '</div>' +
      '<div class="xv-p">問題を押すと、その1問のくわしい解説が開きます。</div></div>';
    el("xvSolveBody").innerHTML = '<div class="xv-list">' + (sec.questions || []).map((q, i) => {
      const st = dp.stateOf(deep.sid, i);
      const badge = st === "done" ? "習得ずみ" : st === "learning" ? "習得中" : "未着手";
      return '<button class="xv-row" onclick="xvDeepGo(\'q\',\'' + deep.sid + '\',' + i + ')">' +
        '<span class="xv-row-t"><i class="xv-qn">' + (i + 1) + '</i>' + esc(String(q.stem).slice(0, 46)) +
        (String(q.stem).length > 46 ? "…" : "") + '</span>' +
        '<span class="xv-row-s">' + badge + "</span></button>";
    }).join("") + "</div>";
  }

  /* 用語の「やさしい例題 → もう少し」のはしご */
  function ladderHTML(t, key) {
    const lv = deep.ladder[key] | 0;
    let h = '<div class="xv-term"><b>' + esc(t.nm) + "</b>" +
      '<p class="xv-def">' + esc(t.def) + "</p>" +
      '<p class="xv-note">' + esc(t.why) + "</p>";
    if (lv >= 1 && t.ex1) {
      h += '<div class="xv-drill"><i>やさしい例題</i><p>' + esc(t.ex1.q) + "</p>" +
        '<p class="xv-ans">答え： ' + esc(t.ex1.a) + "</p>" +
        (t.ex1.how ? '<p class="xv-note">' + esc(t.ex1.how) + "</p>" : "") + "</div>";
    }
    if (lv >= 2 && t.ex2) {
      h += '<div class="xv-drill"><i>もう少し本番に近い例題</i><p>' + esc(t.ex2.q) + "</p>" +
        '<p class="xv-ans">答え： ' + esc(t.ex2.a) + "</p>" +
        (t.ex2.how ? '<p class="xv-note">' + esc(t.ex2.how) + "</p>" : "") + "</div>";
    }
    h += '<div class="xv-acts">';
    if (lv < 2) h += '<button class="on" onclick="xvLadder(\'' + key + '\')">' +
      (lv === 0 ? "やさしい例題で確かめる" : "もう1問、本番に近いもの") + "</button>";
    if (t.method && window.XVSteps && window.XVSteps.byId(t.method))
      h += '<button onclick="xvSolveOpen(\'' + t.method + '\')">この形の解きかたを見る</button>';
    h += '<button onclick="xvAskTerm(\'' + esc(t.nm) + '\')">XEVYNAR に聞く</button>';
    h += "</div></div>";
    return h;
  }
  window.xvLadder = (key) => { deep.ladder[key] = (deep.ladder[key] | 0) + 1; renderDeep(); };
  window.xvAskTerm = (nm) => { go("chat"); setTimeout(() => say(nm + " が分かりません。やさしく教えてください"), 250); };
  window.xvDeepToggle = (k) => { deep.open[k] = !deep.open[k]; renderDeep(); };

  function renderDeepOne() {
    const dp = D();
    const b = dp.build(deep.sid, deep.qi);
    if (!b) { deep.view = "qlist"; return renderDeep(); }
    const q = b.q;
    const F = window.XVFigs;

    el("xvSolveTop").innerHTML =
      '<div class="xv-card xv-qhead">' +
        '<div class="xv-acts" style="margin:0 0 8px">' +
          '<button onclick="xvDeepGo(\'qlist\',\'' + q.sid + '\')">← 一覧</button>' +
          (q.qi > 0 ? '<button onclick="xvDeepGo(\'q\',\'' + q.sid + '\',' + (q.qi - 1) + ')">← まえの問題</button>' : "") +
          (q.qi < q.total - 1 ? '<button onclick="xvDeepGo(\'q\',\'' + q.sid + '\',' + (q.qi + 1) + ')">つぎの問題 →</button>' : "") +
        "</div>" +
        (deep.miss
          ? '<div class="xv-missbar">まちがえた問題 ' + (deep.missAt + 1) + " / " + deep.miss.length +
            '　<button onclick="xvMissNext()">' +
            (deep.missAt < deep.miss.length - 1 ? "つぎのまちがい →" : "おわり") + "</button></div>"
          : "") +
        '<div class="xv-qtag">' + esc(q.subNm) + " ・ " + esc(q.secNm) + " ・ " + esc(q.lvNm) +
          " ・ 第" + (q.qi + 1) + "問 / " + q.total + "</div>" +
        '<div class="xv-qstem">' + esc(q.stem) + "</div>" +
        (q.reading ? '<div class="xv-qread">' + esc(q.reading) + "</div>" : "") +
        '<div class="xv-qans">正解： <b>' + esc(q.answer) + "</b></div>" +
        (q.extra ? '<div class="xv-qextra">MagiLex の解説： ' + esc(q.extra) + "</div>" : "") +
      "</div>";

    let h = "";
    /* ① 何を聞かれているか */
    h += '<div class="xv-card"><div class="xv-h">① この問題は何を聞かれているか</div>' +
      (b.ask ? '<div class="xv-p">' + b.ask + "</div>"
             : '<div class="xv-p">求めるのは <b>' + esc(b.want) + "</b> です。</div>") +
      (b.given.length ? '<div class="xv-p"><b>与えられているもの</b><br>' +
        b.given.map((g) => "・" + esc(g)).join("<br>") + "</div>" : "") + "</div>";

    /* ② 方針 */
    h += '<div class="xv-card"><div class="xv-h">② 方針（どこから手をつけるか）</div>' +
      (b.plan ? '<div class="xv-p">' + b.plan + "</div>" : "") +
      (b.reading ? '<div class="xv-p"><b>手がかり：</b>' + esc(b.reading) + "</div>" : "") +
      (b.methods.length
        ? '<div class="xv-p">この問題は <b>' + b.methods.map((m) => esc(m.nm)).join("</b>／<b>") +
          "</b> の形です。</div>" + b.methods.map((m) =>
          '<div class="xv-acts"><button onclick="xvSolveOpen(\'' + m.id + '\')">「' + esc(m.nm) + '」を1手ずつ見る</button></div>').join("")
        : "") + "</div>";

    /* ③ 使う道具 */
    if (b.forms.length) {
      h += '<div class="xv-card"><div class="xv-h">③ ここで使う公式</div>' +
        b.forms.map((f) => '<p class="xv-form"><i>' + esc(f.nm) + "</i>" + esc(f.body) +
          (f.body2 ? "<br>" + esc(f.body2) : "") +
          (f.note ? '<span class="xv-note">' + esc(f.note) + "</span>" : "") + "</p>").join("") + "</div>";
    }

    /* ④ 手順 */
    h += '<div class="xv-card"><div class="xv-h">④ 手順（1行ずつ）</div>';
    if (!b.steps.length) {
      h += '<div class="xv-p">この問題は、上の方針をそのまま当てはめれば1手で終わります。' +
        '詰まったら下の「分からない言葉」から戻ってください。</div>';
    }
    b.steps.forEach((s, i) => {
      const key = "s" + i;
      const open = !!deep.open[key];
      h += '<div class="xv-wstep"><div class="xv-wn">' + esc(s.t) + "</div>" +
        '<div class="xv-wd">' + (b.hand ? s.text : esc(s.text)) + "</div>";
      if (s.terms.length || s.forms.length) {
        h += '<div class="xv-acts"><button class="' + (open ? "on" : "") + '" onclick="xvDeepToggle(\'' + key + '\')">' +
          (open ? "とじる" : "？ この行がわからない") + "</button></div>";
        if (open) {
          h += '<div class="xv-hintbox">';
          s.forms.forEach((f) => {
            h += '<p class="xv-form"><i>' + esc(f.nm) + "</i>" + esc(f.body) +
              (f.note ? '<span class="xv-note">' + esc(f.note) + "</span>" : "") + "</p>";
          });
          s.terms.forEach((t, j) => { h += ladderHTML(t, key + "t" + j); });
          h += "</div>";
        }
      }
      h += "</div>";
    });
    h += "</div>";

    /* ⑤ 図・グラフ */
    if (b.figs.length && F) {
      h += '<div class="xv-card"><div class="xv-h">⑤ 図で見る</div>' +
        b.figs.map((fg) => '<div class="xv-figbox"><div class="xv-figt">' + esc(fg.nm) + "</div>" +
          F.make(fg.id, { p: fg.p || {} }) + '<div class="xv-note">' + esc(fg.cap) + "</div></div>").join("") + "</div>";
    }

    /* ⑥ 確かめかた */
    h += '<div class="xv-card"><div class="xv-h">⑥ 答えの確かめかた</div>' +
      (b.check ? '<div class="xv-p">' + b.check + "</div>" : "") +
      '<ul class="xv-sol">' + b.checks.map((c) => "<li>" + c + "</li>").join("") + "</ul></div>";

    /* ⑦ 誤答の理由 */
    if (b.wrongs.length) {
      h += '<div class="xv-card"><div class="xv-h">⑦ ほかの選択肢がなぜ違うのか</div>' +
        b.wrongs.map((w) => '<div class="xv-wrong"><b>' + esc(w.w) + "</b><p>" + w.why + "</p></div>").join("") + "</div>";
    }
    /* 落とし穴（手書きがあるとき） */
    if (b.traps.length) {
      h += '<div class="xv-card"><div class="xv-h">よくある落とし穴</div><ul class="xv-sol">' +
        b.traps.map((t) => "<li>" + esc(t) + "</li>").join("") + "</ul></div>";
    }

    /* ⑧ 分からない言葉 */
    if (b.terms.length) {
      h += '<div class="xv-card"><div class="xv-h">⑧ この問題に出てくる言葉</div>' +
        '<div class="xv-p">押すと、意味 →（なぜ大事か）→ やさしい例題 → 本番に近い例題 の順に降りていけます。</div>' +
        b.terms.map((t, j) => {
          const key = "T" + j, open = !!deep.open[key];
          return '<div class="xv-acts"><button class="' + (open ? "on" : "") + '" onclick="xvDeepToggle(\'' + key + '\')">' +
            esc(t.nm) + (open ? " をとじる" : " が分からない") + "</button></div>" +
            (open ? ladderHTML(t, key + "L") : "");
        }).join("") + "</div>";
    }

    /* ⑨ 類題・つぎへ */
    h += '<div class="xv-card"><div class="xv-h">⑨ 続けて解く</div>' +
      (b.sib.length ? '<div class="xv-list">' + b.sib.map((s) =>
        '<button class="xv-row" onclick="xvDeepGo(\'q\',\'' + s.sid + '\',' + s.qi + ')">' +
        '<span class="xv-row-t">' + esc(String(s.stem).slice(0, 44)) + "</span>" +
        '<span class="xv-row-s">第' + (s.qi + 1) + "問</span></button>").join("") + "</div>" : "") +
      '<div class="xv-acts">' +
        '<button onclick="xvAskThis()">この問題について XEVYNAR に聞く</button>' +
        '<button onclick="xvDeepGo(\'qlist\',\'' + q.sid + '\')">一覧へ</button>' +
      "</div>" +
      "</div>";

    el("xvSolveBody").innerHTML = h;
  }
  /* まちがえた問題を順にたどる */
  window.xvMissNext = () => {
    if (!deep.miss) return;
    if (deep.missAt >= deep.miss.length - 1) {
      deep.miss = null; deep.missAt = -1;
      toast("まちがえた問題を最後まで見ました");
      renderDeep();
      return;
    }
    deep.missAt++;
    const m = deep.miss[deep.missAt];
    deep.sid = m.sid; deep.qi = m.qi | 0; deep.open = {}; deep.ladder = {};
    renderDeep();
    window.scrollTo(0, 0);
  };
  window.xvAskThis = () => {
    const dp = D(); const q = dp && dp.get(deep.sid, deep.qi);
    go("chat");
    setTimeout(() => say((q ? q.stem : "") + " が分かりません"), 250);
  };



  /* ══════════ チャット ══════════ */
  const AVATAR = "xevynar-mark.png";
  /* ★ 2026-08-19 byline（「提供：XEVYNAR」の帯）は廃止した。
     引数は呼び出し側にたくさん残っているので受け取るだけにしてある。 */
  function bubble(role, html, acts, byline) {
    const row = document.createElement("div");
    row.className = "xv-msg " + (role === "me" ? "me" : "ai");
    let inner = "";
    if (role !== "me") inner += '<img class="xv-av" src="' + AVATAR + '" alt="XEVYNAR">';
    inner += '<div class="xv-bub">' + html;
    if (acts && acts.length) {
      inner += '<div class="xv-acts">' + acts.map((a) => '<button onclick="' + esc(a[1]) + '">' + esc(a[0]) + "</button>").join("") + "</div>";
    }
    /* ★★ 2026-08-19 「提供：XEVYNAR」の帯は廃止（ユーザー指示）。
       毎回の吹き出しに出ていて、読むじゃまになっていた。
       byline の引数は呼び出し側にたくさん残っているので、受け取るだけにして何もしない。 */
    inner += "</div>";
    row.innerHTML = inner;
    el("xvLog").appendChild(row);
    scrollLog();
    return row;
  }
  function scrollLog() {
    try { window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }); } catch (e) { window.scrollTo(0, document.body.scrollHeight); }
  }

  function pushChat(r, t) { X.S.chat.push({ r, t, at: Date.now() }); X.save(); }

  function typing() {
    const row = document.createElement("div");
    row.className = "xv-msg ai";
    row.innerHTML = '<img class="xv-av" src="' + AVATAR + '" alt=""><div class="xv-bub" style="padding:0"><div class="xv-typing"><i></i><i></i><i></i></div></div>';
    el("xvLog").appendChild(row); scrollLog();
    return row;
  }

  async function say(text) {
    text = String(text || "").trim();
    if (!text) return;
    bubble("me", esc(text));
    pushChat("me", text);
    const tp = typing();
    /* ★★ 2026-08-20 編成を聞かれたときのために、先に
       「みんなのクリア編成」と「MagiTier の公開表」を読んでおく。
       ★ 答えを組み立てる stageAnswer は同期なので、ここで読み終えていないと
         その回だけ根拠が1つ減ってしまう。0.9秒で打ち切るので待たせすぎない。 */
    try {
      const K = window.XEVYNAR_KB;
      const stg = (K && K.findStage) ? K.findStage(text) : null;
      if (window.XV && window.XV.primeParty && /編成|パーティ|おすすめ|勝て|クリア|攻略/.test(text)) {
        await Promise.race([window.XV.primeParty(stg || {}), new Promise((r2) => setTimeout(r2, 900))]);
      }
    } catch (e) {}
    /* ★★ 2026-08-20 問題文をそのまま貼られたときは、意図を当てにいかずに
       <b>先に問題そのものをさがす</b>。
       ★ ここを route より前に置くのが肝心。
         「〜は最大何 mol か」のような問題文には
         「〜を教えて」といった意図の言葉が1つも無いので、
         route に通すと help（できること）に落ちてしまっていた。 */
    if (text.length >= 12) {
      try {
        const dp = D();
        if (dp) {
          if (!dp.ready()) await dp.load();
          const p0 = findProblemByText(text);
          if (p0) { tp.remove(); if (await startChatSteps(p0.sid, p0.qi)) { renderQuick(); return; } }
        }
      } catch (e) {}
    }
    await new Promise((r) => setTimeout(r, 220));
    let r;
    try { r = T.respond(text); } catch (e) { r = { html: "うまく答えられませんでした。もう一度、別の言い方で聞いてもらえますか。" }; }
    tp.remove();
    if (r.learned && r.learned.length) {
      bubble("ai", "🧠 " + r.learned.map(esc).join("<br>🧠 "));
    }
    /* 「わからない問題」は MagiLex のデータを読んでから答える（非同期） */
    if (r.explain) { await answerExplain(r.explain); renderQuick(); return; }
    bubble("ai", r.html, r.acts, r.byline === true);
    pushChat("ai", String(r.html).replace(/<[^>]*>/g, ""));
    renderQuick();
  }
  window.xvSay = (t) => { say(t); };


  /* ══════════════════════════════════════════════════════════════
     ★★ 2026-08-20 チャットの中で「1手ずつ」解説する

     これまでチャットで問題を聞くと、解説カードを<b>まるごと1枚</b>返していた。
     読む側からすると、いきなり全部出されても
     「どこから見ればいいのか」「自分がどこで詰まったのか」が分からない。

     そこで解説タブと同じ中身を、チャットでも
       ねらい → 手順①（図つき） → 手順② → … → 確かめ → 誤答の理由
     と<b>1手ずつ</b>送る形にした。
     ・「次の手 →」を押すと次の1手が新しい吹き出しで出る
     ・「ここが分からない」で、その手に出てくる言葉のやさしい例題へ
     ・図はその手に関係するものだけを出す（毎回2枚出すと邪魔になる）
     ★ 中身は XVDeep.build 1本から取る。解説タブとチャットで話が食いちがわないようにするため。
     ══════════════════════════════════════════════════════════════ */
  const chatStep = { on: false, sid: "", qi: 0, i: 0, d: null };

  /* 質問文から MagiLex の問題を1つさがす（文字の重なりで採点する） */
  function findProblemByText(text) {
    const dp = D(); if (!dp || !dp.ready()) return null;
    const q = String(text || "").replace(/[\s　]/g, "");
    if (q.length < 4) return null;
    /* 2文字ずつに割って、重なった数を数える（短い言葉での誤爆を避ける） */
    const grams = [];
    for (let i = 0; i + 2 <= q.length; i++) grams.push(q.slice(i, i + 2));
    if (!grams.length) return null;
    let best = null;
    (window.LEX_SECTIONS || []).forEach((sec) => {
      if (!dp.has(sec.id)) return;              /* 解説があるのは最難関だけ */
      (sec.questions || []).forEach((qq, i) => {
        const t = String(qq.stem || "") + String(qq.reading || "");
        let n = 0;
        grams.forEach((g) => { if (t.indexOf(g) >= 0) n++; });
        const s = n / grams.length;
        if (!best || s > best.s) best = { s, sid: sec.id, qi: i, stem: qq.stem };
      });
    });
    /* 半分以上重なっていなければ「その問題だ」とは言い切らない */
    return best && best.s >= 0.5 ? best : null;
  }

  /* 1手ずつの中身を組み立てる（吹き出し1つぶんの配列にする） */
  function stepCards(d) {
    const cards = [];
    const q = d.q;
    /* ① 何を聞かれているか */
    cards.push({
      t: "① 何を聞かれているか",
      h: '<div class="xv-p">' + esc(d.ask || d.want || q.stem) + "</div>"
        + (d.given ? '<div class="xv-sub">わかっていること：' + esc(d.given) + "</div>" : ""),
    });
    /* ② 方針（使う定石・公式） */
    if (d.plan || (d.methods && d.methods.length) || (d.forms && d.forms.length)) {
      let h = d.plan ? '<div class="xv-p">' + esc(d.plan) + "</div>" : "";
      if (d.methods && d.methods.length) {
        h += '<div class="xv-p">使う定石：<b>' + d.methods.map((m) => esc(m.nm || m.name || "")).filter(Boolean).join("</b> ／ <b>") + "</b></div>";
      }
      if (d.forms && d.forms.length) {
        h += '<div class="xv-forms">' + d.forms.slice(0, 4).map((f) =>
          '<div class="xv-form"><b>' + esc(f.nm || "") + "</b><code>" + esc(f.f || f.formula || "") + "</code></div>").join("") + "</div>";
      }
      cards.push({ t: "② 方針", h });
    }
    /* ③〜 手順。図はいちばん最初の手順に付ける（そこで形が見えるのがいちばん効く） */
    (d.steps || []).forEach((s, i) => {
      let h = '<div class="xv-p">' + esc(s.text || "") + "</div>";
      if (i === 0 && d.figs && d.figs.length && window.XVFigs) {
        const fg = d.figs[0];
        h += '<div class="xv-figbox"><div class="xv-figt">' + esc(fg.nm || "") + "</div>"
          + window.XVFigs.make(fg.id, { p: fg.p || {} })
          + '<div class="xv-figc">' + esc(fg.cap || "") + "</div></div>";
      }
      cards.push({ t: s.t || "手順 " + (i + 1), h, terms: s.terms || [] });
    });
    /* 確かめかた */
    if ((d.checks && d.checks.length) || d.check) {
      const list = d.check ? [d.check] : d.checks;
      cards.push({ t: "確かめかた", h: '<div class="xv-p">' + list.map(esc).join("<br>") + "</div>" });
    }
    /* 答えと、ほかの選択肢がなぜちがうか */
    let wh = '<div class="xv-p">答え：<b>' + esc(q.answer) + "</b></div>";
    if (d.wrongs && d.wrongs.length) {
      wh += '<div class="xv-wrongs">' + d.wrongs.map((w) =>
        '<div class="xv-wrong"><b>' + esc(w.w) + "</b><span>" + w.why + "</span></div>").join("") + "</div>";
    }
    cards.push({ t: "答えと、ほかの選択肢のちがい", h: wh });
    return cards;
  }

  /* 1手ずつの解説をはじめる */
  async function startChatSteps(sid, qi) {
    const dp = D(); if (!dp) return false;
    if (!dp.ready()) await dp.load();
    const d = dp.build(sid, qi);
    if (!d) return false;
    chatStep.on = true; chatStep.sid = sid; chatStep.qi = qi; chatStep.i = 0; chatStep.d = d;
    chatStep.cards = stepCards(d);
    const h = '<div class="xv-h">' + esc(d.q.secNm) + "</div>"
      + '<div class="xv-p">' + esc(d.q.stem) + "</div>"
      + '<div class="xv-sub">' + esc(d.q.subNm) + " ・ " + esc(d.q.lvNm)
      + " ・ 全 " + chatStep.cards.length + " 手</div>";
    bubble("ai", h, [["はじめから1手ずつ", "xvStepNext()"],
                     ["まとめて全部見る", "xvDeepGo('q','" + sid + "'," + qi + ")"]]);
    pushChat("ai", String(h).replace(/<[^>]*>/g, ""));
    return true;
  }
  /* 次の1手 */
  window.xvStepNext = () => {
    if (!chatStep.on || !chatStep.cards) return;
    const c = chatStep.cards[chatStep.i];
    if (!c) { chatStep.on = false; return; }
    const last = chatStep.i >= chatStep.cards.length - 1;
    const acts = [];
    if (!last) acts.push(["次の手 →", "xvStepNext()"]);
    if (c.terms && c.terms.length) acts.push(["「" + c.terms[0].nm + "」が分からない", "xvStepTerm(" + chatStep.i + ")"]);
    if (last) {
      acts.push(["まとめて見なおす", "xvDeepGo('q','" + chatStep.sid + "'," + chatStep.qi + ")"]);
      acts.push(["似た問題を出して", "xvStartQuiz(5)"]);
    }
    const h = '<div class="xv-h">' + esc(c.t) + "</div>" + c.h
      + '<div class="xv-sub">' + (chatStep.i + 1) + " / " + chatStep.cards.length + "</div>";
    bubble("ai", h, acts);
    pushChat("ai", String(h).replace(/<[^>]*>/g, ""));
    chatStep.i++;
  };
  /* その手に出てくる言葉を、やさしい例題までさかのぼって説明する */
  window.xvStepTerm = (i) => {
    const c = chatStep.cards && chatStep.cards[i]; if (!c || !c.terms || !c.terms.length) return;
    const t = c.terms[0];
    let h = '<div class="xv-h">' + esc(t.nm) + "</div>"
      + '<div class="xv-p">' + esc(t.def) + "</div>"
      + (t.why ? '<div class="xv-sub">' + esc(t.why) + "</div>" : "");
    if (t.ex1) h += '<div class="xv-drill"><i>やさしい例題</i><p>' + esc(t.ex1.q) + "</p><p><b>答え</b> " + esc(t.ex1.a) + "</p></div>";
    if (t.ex2) h += '<div class="xv-drill"><i>もう少し</i><p>' + esc(t.ex2.q) + "</p><p><b>答え</b> " + esc(t.ex2.a) + "</p></div>";
    bubble("ai", h, [["続きへもどる", "xvStepNext()"]]);
    pushChat("ai", String(h).replace(/<[^>]*>/g, ""));
  };

  /* 解法（定石）を1手ずつ。問題そのものが見つからなかったときの受け皿。 */
  function startChatMethod(text) {
    const st = S(); if (!st) return false;
    let m = null;
    try { m = (st.find ? st.find(text, 1) : [])[0] || null; } catch (e) {}
    if (!m) return false;
    /* 図は、その定石があらかじめ持っているもの（figs）を優先する */
    const F = window.XVFigs;
    let figs = [];
    if (F) {
      if (m.figs && m.figs.length && F.info) figs = m.figs.slice(0, 1).map((id) => F.info(id)).filter(Boolean);
      if (!figs.length && F.forProblem) figs = F.forProblem({ stem: text + " " + (m.nm || ""), sid: "" }, 1);
    }
    let h = '<div class="xv-h">' + esc(m.nm || "") + "</div>"
      + '<div class="xv-p">' + (m.idea || "") + "</div>";
    if (figs.length && window.XVFigs) {
      h += '<div class="xv-figbox"><div class="xv-figt">' + esc(figs[0].nm || "") + "</div>"
        + window.XVFigs.make(figs[0].id, { p: figs[0].p || {} })
        + '<div class="xv-figc">' + esc(figs[0].cap || "") + "</div></div>";
    }
    if (m.steps && m.steps.length) {
      h += '<div class="xv-p">手順は <b>' + m.steps.length + " 手</b>です。</div>";
    }
    bubble("ai", h, [["この解きかたを1手ずつ", "xvSolveOpen('" + esc(m.id || "") + "')"],
                     ["似た問題を出して", "xvStartQuiz(5)"]]);
    pushChat("ai", String(h).replace(/<[^>]*>/g, ""));
    return true;
  }

  /* 質問された問題の解説。MagiLex のデータに載っていればそのまま答え、
     載っていなければ「作らない」と断ったうえで解き方の道すじを出す。 */
  async function answerExplain(text) {
    const tp = typing();
    /* ★★ 2026-08-20 まず「その問題そのもの」をさがして、見つかれば1手ずつに入る。
       用語の説明より先に見るのは、聞かれているのがたいてい問題だから。 */
    try {
      const dp = D();
      if (dp) {
        if (!dp.ready()) await dp.load();
        const p = findProblemByText(text);
        if (p) { tp.remove(); if (await startChatSteps(p.sid, p.qi)) return; }
      }
    } catch (e) {}
    let hit = null;
    try {
      if (window.XVLex) { await window.XVLex.load(); hit = window.XVLex.explain(text); }
    } catch (e) {}
    tp.remove();
    if (hit) {
      const card = T.explainCard(hit);
      bubble("ai", card, [["似た問題を出して", "xvStartQuiz(5)"], ["MagiLex で解く", "location.href='../MagiLex/MagiLex.html'"]], true);
      pushChat("ai", String(card).replace(/<[^>]*>/g, ""));
      return;
    }
    /* 語句そのものが見つからなくても、近い語があれば候補として出す */
    /* ★ 2026-08-20 問題も用語も当たらなければ、近い<b>解きかた（定石）</b>を図つきで出す。
       「わかりません」で終わらせず、必ず次の一歩を渡すため。 */
    try { if (startChatMethod(text)) return; } catch (e) {}
    let near = [];
    try { if (window.XVLex) near = window.XVLex.search(text, 4); } catch (e) {}
    let h = T.solvePath(text);
    if (near.length) {
      h += '<div class="xv-sub">近い項目なら見つかりました：<br>'
        + near.map((n) => "・" + esc(n.word) + " — " + esc(n.meaning) + "（" + esc(n.subjName) + "）").join("<br>") + "</div>";
    }
    bubble("ai", h, [["苦手問題を出して", "xvStartQuiz(5)"], ["MagiLex をひらく", "location.href='../MagiLex/MagiLex.html'"]], true);
    pushChat("ai", String(h).replace(/<[^>]*>/g, ""));
  }

  /* ══════════════════════════════════════════════════════════════
     ★★ 2026-08-20 Transformer で台帳を「意味」でひく

     クエスト名・キャラ名・アプリ名を XVTF のベクトルにしておくと、
     「12の間」「じゅうにのま」「12番目のところ」のように
     文字が一致しなくても、近いものを見つけられる。
     ★ 一致で見つかったときはそちらが正しいので、
       ここは<b>見つからなかったときだけ</b>使う。
     ══════════════════════════════════════════════════════════════ */
  function buildTfIndex() {
    const tf = window.XVTF, K = window.XEVYNAR_KB;
    if (!tf || !K || !tf.index) return;
    try {
      if (K.STAGES) tf.index("stage", K.STAGES.map((s) => ({ key: s.id, text: s.nm + " " + (s.diff || "") })));
      if (K.CHARS) tf.index("char", K.CHARS.map((c) => ({ key: c.id, text: c.nm + " " + (c.el || "") + " " + (c.type || "") })));
      if (K.APPS) tf.index("app", K.APPS.map((a) => ({ key: a.id, text: a.nm + " " + (a.cat || "") + " " + (a.desc || "") })));
    } catch (e) {}
  }
  /* 起動して落ち着いてから作る（台帳の読み込みを待つ） */
  setTimeout(buildTfIndex, 2500);

  window.xvSend = function () {
    const i = el("xvInp");
    const v = i.value.trim();
    if (!v) return;
    i.value = ""; i.style.height = "";
    say(v);
  };

  /* 外部AIへ直接投げる（設定した人だけ） */
  window.xvAskApi = async function () {
    if (!X.apiReady()) { go("config"); toast("先に AI 接続の URL を設定してください"); return; }
    const last = [...X.S.chat].reverse().find((m) => m.r === "me");
    if (!last) return;
    const tp = typing();
    const a = await X.askApi(last.t);
    tp.remove();
    if (!a) { bubble("ai", "接続できませんでした。設定の URL を確認してください。"); return; }
    bubble("ai", esc(a).replace(/\n/g, "<br>") + '<div class="xv-sub">※ 設定した外部AIに問い合わせた結果です</div>');
    pushChat("ai", a);
  };

  const QUICKS = [
    ["苦手問題を出して", "苦手な問題を出して"],
    ["25分はかって", "25分はかって"],
    ["編成のコツ", "編成のコツ"],
    ["王城 第12の間", "黄昏の王城 第12の間の編成"],
    ["迷宮 第22の間", "禁忌の迷宮 第22の間の編成"],
    ["庭園 第7ノ園", "幽冥の庭園 第7ノ園の編成"],
    ["勝てないとき", "勝てない"],
    ["ジェムって何？", "ジェムって何？"],
    ["いまの状況", "いまの状況"],
    ["できること", "できること"],
  ];
  function renderQuick() {
    el("xvQuick").innerHTML = QUICKS.map((q) => '<button onclick="xvSay(\'' + esc(q[1]) + '\')">' + esc(q[0]) + "</button>").join("");
  }

  /* ══════════════════════════════════════════
     出題（MagiLex の苦手問題）
     ══════════════════════════════════════════ */
  let QZ = null;   // { list, i, ok, ng }

  window.xvOpenQuizPick = async function () {
    openSheet("科目・コンテンツを選ぶ", '<div class="xv-p">読み込んでいます…</div>');
    let rows = [];
    try { if (window.XVLex) { await window.XVLex.load(); rows = window.XVLex.catalog(); } } catch (e) {}
    if (!rows.length) { el("xvSheetB").innerHTML = '<div class="xv-p">問題データを読み込めませんでした。オンラインのときにもう一度お試しください。</div>'; return; }
    /* 未習得が多い順＝伸びしろが大きい順に並べる */
    rows.sort((a, b) => (b.total - b.done) - (a.total - a.done));
    el("xvSheetB").innerHTML =
      '<div class="xv-p">選んだ範囲から、まだ習得していない問題を優先して出します。</div>'
      + '<div class="xv-list" style="margin-top:10px">'
      + rows.slice(0, 40).map((r) =>
        '<button class="xv-item" style="width:100%;text-align:left;border:none;background:none;font-family:inherit;cursor:pointer" '
        + "onclick=\"xvCloseSheet();xvStartQuiz(5,'" + esc(r.nm).replace(/'/g, "") + "')\">"
        + '<div class="ic">' + r.icon + '</div><div class="bd"><div class="t1">' + esc(r.nm) + "</div>"
        + '<div class="t2">全' + r.total + "問／習得 " + r.done + "・習得中 " + r.learn + "</div></div>"
        + '<div class="rt">▶</div></button>').join("")
      + "</div>";
  };

  window.xvStartQuiz = async function (n, subject) {
    go("chat");
    const tp = typing();
    let list = [];
    try {
      if (window.XVLex) { await window.XVLex.load(); list = window.XVLex.makeQuiz(n || 5, subject ? { subject } : null); }
    } catch (e) {}
    tp.remove();
    if (!list.length) {
      bubble("ai", "問題データを読み込めませんでした。オンラインのときにもう一度お試しください。",
        [["MagiLex をひらく", "location.href='../MagiLex/MagiLex.html'"]]);
      return;
    }
    QZ = { list, i: 0, ok: 0, ng: 0 };
    const st = list.filter((x) => x.src.state === "learning").length;
    bubble("ai", "全 " + list.length + "問。" + (st ? "そのうち " + st + "問は<b>まだ習得できていない問題</b>です。" : "")
      + "<br>まちがえても大丈夫です。解説を出します。", null, true);
    askQuiz();
  };

  function askQuiz() {
    if (!QZ) return;
    if (QZ.i >= QZ.list.length) { finishQuiz(); return; }
    const q = QZ.list[QZ.i];
    const h = '<div class="xv-qmeta">第' + (QZ.i + 1) + "問 / " + QZ.list.length + "　" + esc(q.topic) + "</div>"
      + '<div class="xv-qstem">' + esc(q.q) + "</div>"
      + '<div class="xv-qask">' + esc(q.ask) + "</div>"
      + '<div class="xv-qchoices">'
      + q.choices.map((c, i) => '<button onclick="xvAnswerQuiz(' + i + ')">' + esc(c) + "</button>").join("")
      + "</div>";
    bubble("ai", h, null, true);
  }

  window.xvAnswerQuiz = function (i) {
    if (!QZ) return;
    const q = QZ.list[QZ.i];
    if (!q) return;
    const chosen = q.choices[i];
    const ok = chosen === q.answer;
    /* 押したあとのボタンは無効化して、二重回答を防ぐ */
    const rows = el("xvLog").querySelectorAll(".xv-qchoices");
    const last = rows[rows.length - 1];
    if (last) {
      [...last.children].forEach((btn, k) => {
        btn.disabled = true;
        if (q.choices[k] === q.answer) btn.classList.add("ok");
        else if (k === i) btn.classList.add("ng");
      });
    }
    bubble("me", esc(chosen));
    if (ok) QZ.ok++; else QZ.ng++;
    /* ★ MagiLex 側のセーブ（magilex_v2）は触らない。
       あちらは MagiLex 専用 Firebase が同期しており、ここから書くと競合して巻き戻る。
       XEVYNAR は自分の正答率だけを記録する。 */
    X.markWeak(q.topic, ok);

    let h = ok ? "⭕ 正解！" : "❌ 正解は " + "<b>" + esc(q.answer) + "</b>";
    if (q.extra) h += '<div class="xv-sub">💡 ' + esc(q.extra) + "</div>";
    QZ.i++;
    const acts = QZ.i < QZ.list.length ? [["次の問題", "xvNextQuiz()"], ["やめる", "xvStopQuiz()"]]
                                       : [["結果を見る", "xvNextQuiz()"]];
    bubble("ai", h, acts, true);
  };
  window.xvNextQuiz = function () { askQuiz(); };
  window.xvStopQuiz = function () { if (QZ) finishQuiz(); };

  function finishQuiz() {
    const r = QZ; QZ = null;
    if (!r) return;
    const done = r.ok + r.ng;
    if (!done) { bubble("ai", "またいつでも出します。"); return; }
    const rate = Math.round(r.ok / done * 100);
    let h = "おつかれさまでした。<br>" + "正解 " + "<b>" + r.ok + " / " + done + "</b>（" + rate + "%）";
    if (rate === 100) h += "<br>完璧です！ 同じ範囲は MagiLex 本体で完全習得まで進めると XEVA がもらえます。";
    else if (rate >= 60) h += "<br>いい調子です。まちがえた分だけもう一度出しますか？";
    else h += "<br>ここは伸びしろです。少ない問題数で何度も回す方が定着します。";
    bubble("ai", h, [["もう5問", "xvStartQuiz(5)"], ["MagiLex で解く", "location.href='../MagiLex/MagiLex.html'"],
                     ["記録に残す", "xvOpenLog()"]], true);
  }

  /* ══════════════════════════════════════════
     タイマー（科目・目的の入力なし／時間は自由）
     ══════════════════════════════════════════ */
  let TM = { sec: 1500, left: 1500, run: false, tick: null, endAt: 0 };
  const PRESETS = [5, 10, 15, 25, 30, 45, 50, 60, 90];

  function renderTimer() {
    el("xvPresets").innerHTML = PRESETS.map((m) =>
      '<button class="xv-chip' + (TM.sec === m * 60 ? " on" : "") + '" onclick="xvSetTimer(' + m * 60 + ')">' + m + "分</button>").join("");
    const h = el("xvTH"), mn = el("xvTM"), s = el("xvTS");
    if (h && !TM.run) {
      const sec = TM.sec;
      h.value = Math.floor(sec / 3600) || "";
      mn.value = Math.floor((sec % 3600) / 60) || "";
      s.value = sec % 60 || "";
    }
    paintTimer();
  }
  function paintTimer() {
    const s = Math.max(0, Math.round(TM.left));
    const hh = Math.floor(s / 3600);
    el("xvClock").textContent = (hh ? hh + ":" : "") + X.pad(Math.floor((s % 3600) / 60)) + ":" + X.pad(s % 60);
    const p = TM.sec ? 1 - s / TM.sec : 0;
    el("xvArc").setAttribute("stroke-dashoffset", String(326.7 * (1 - p)));
    const g = el("xvTGo"); if (g) g.textContent = TM.run ? "一時停止" : (TM.left < TM.sec ? "再開" : "スタート");
    const lb = el("xvTLabel"); if (lb) lb.textContent = TM.run ? "計測中" : "";
  }
  window.xvSetTimer = function (sec) {
    if (TM.run) return;
    TM.sec = Math.max(5, Math.round(sec || 0)); TM.left = TM.sec;
    renderTimer();
  };
  /* 入力欄（時／分／秒）から時間を作る。自由な長さを受け付ける。 */
  window.xvApplyTimerInput = function () {
    const n = (id) => Math.max(0, Number((el(id) || {}).value) || 0);
    const sec = n("xvTH") * 3600 + n("xvTM") * 60 + n("xvTS");
    if (sec < 5) { toast("5秒以上で設定してください"); return; }
    TM.sec = Math.round(sec); TM.left = TM.sec;
    paintTimer();
    toast("⏱ " + X.fmtSec(TM.sec) + " に設定しました");
  };
  /* 会話からも呼べる。ラベルは受け取らない（＝目的の入力は不要）。 */
  window.xvStartTimer = function (sec) {
    go("timer");
    TM.sec = Math.max(5, Math.round(sec || 0)); TM.left = TM.sec;
    renderTimer();
    startTick();
    toast("⏱ " + X.fmtSec(TM.sec) + " のタイマーを始めました");
  };
  window.xvToggleTimer = function () {
    if (TM.run) { stopTick(); return; }
    /* スタート前に入力欄の値を取り込む（押す前に数字を変えた人の意図を拾う） */
    if (TM.left >= TM.sec) {
      const n = (id) => Math.max(0, Number((el(id) || {}).value) || 0);
      const sec = n("xvTH") * 3600 + n("xvTM") * 60 + n("xvTS");
      if (sec >= 5) { TM.sec = Math.round(sec); TM.left = TM.sec; }
    }
    startTick();
  };
  window.xvStopTimer = function () { stopTick(); TM.left = TM.sec; paintTimer(); };
  function startTick() {
    TM.run = true; TM.endAt = Date.now() + TM.left * 1000;
    clearInterval(TM.tick);
    TM.tick = setInterval(() => {
      TM.left = Math.max(0, (TM.endAt - Date.now()) / 1000);
      paintTimer();
      if (TM.left <= 0) finishTimer();
    }, 250);
    paintTimer();
  }
  function stopTick() { TM.run = false; clearInterval(TM.tick); TM.tick = null; paintTimer(); }

  function finishTimer() {
    stopTick();
    const sec = TM.sec;
    const min = Math.max(1, Math.round(sec / 60));
    TM.left = TM.sec; paintTimer();
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.18, 0.36].forEach((d, i) => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.frequency.value = [880, 1046, 1318][i]; o.connect(g); g.connect(ac.destination);
        g.gain.setValueAtTime(0.0001, ac.currentTime + d);
        g.gain.exponentialRampToValueAtTime(0.22, ac.currentTime + d + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + d + 0.3);
        o.start(ac.currentTime + d); o.stop(ac.currentTime + d + 0.32);
      });
    } catch (e) {}
    toast("⏱ " + X.fmtSec(sec) + " 完了！", 3600);
    go("chat");
    /* ★ 勝手に学習記録へ残さない。残したい人だけボタンで残せるようにする。 */
    bubble("ai", "おつかれさまでした！ <b>" + X.fmtSec(sec) + "</b> 完了です。",
      [["もう1回", "xvStartTimer(" + sec + ")"],
       ["5分休憩", "xvStartTimer(300)"],
       ["この時間を記録に残す", "xvLogMinutes(" + min + ")"]]);
  }
  /* 押されたときだけ記録する */
  window.xvLogMinutes = function (min) {
    X.addSession(min, "", "");
    toast("記録しました：" + X.fmtMin(min));
    bubble("ai", "記録しました：<b>" + X.fmtMin(min) + "</b>（今日の合計 " + X.fmtMin(X.todayMin()) + "）",
      [["記録を見る", "xvGo('report')"]]);
  };

  /* ══════════ 学習ページ ══════════ */
  const TARGETS = [30, 60, 90, 120, 180];
  function renderStudy() {
    const p = X.S.plan;
    const box = el("xvPlanBox");
    if (!p || p.date !== X.ymd(new Date()) || !p.items.length) {
      box.innerHTML = '<div class="xv-card"><div class="xv-p">今日のプランはまだありません。<br>あなたの苦手・MagiLex の進みぐあいから組み立てます。</div>'
        + '<button class="xv-btn sm" style="margin-top:10px" onclick="xvMakePlan()">今日のプランを作る</button></div>';
    } else {
      const done = p.items.filter((i) => i.done).length;
      box.innerHTML = '<div class="xv-card"><div class="xv-h">合計 ' + X.fmtMin(p.items.reduce((a, i) => a + i.min, 0))
        + ' <span style="font-size:11px;color:#6b7597;font-weight:700">（' + done + "/" + p.items.length + ' 完了）</span></div>'
        + '<div class="xv-list" style="margin-top:10px">'
        + p.items.map((i, k) => '<div class="xv-item"><button class="ic" onclick="xvTogglePlan(' + k + ')" style="' + (i.done ? "background:rgba(55,199,143,.18)" : "") + '">' + (i.done ? "✓" : "○") + "</button>"
            + '<div class="bd"><div class="t1" style="' + (i.done ? "opacity:.5;text-decoration:line-through" : "") + '">' + esc(i.t) + "</div>"
            + '<div class="t2">' + esc(i.subject || "") + "</div></div>"
            + '<button class="rt" onclick="xvStartTimer(' + i.min * 60 + ')">' + X.fmtMin(i.min) + " ▶</button></div>").join("")
        + "</div>"
        + (p.why && p.why.length ? '<div class="xv-p" style="margin-top:10px">▸ ' + p.why.join("<br>▸ ") + "</div>" : "")
        + "</div>";
    }
    const cur = Number(X.recall("1日の目標(分)")) || X.S.profile.dailyMin || 60;
    el("xvTargetChips").innerHTML = TARGETS.map((m) =>
      '<button class="xv-chip' + (cur === m ? " on" : "") + '" onclick="xvSetTarget(' + m + ')">' + X.fmtMin(m) + "</button>").join("");
    el("xvExamName").value = X.S.profile.examName || "";
    el("xvExamDate").value = X.S.profile.examDate || "";
    const d = examDays();
    el("xvExamInfo").innerHTML = d == null ? "" :
      (esc(X.S.profile.examName || "本番") + "まで <b>" + d + "日</b>" + (d > 0 ? "（1日 " + X.fmtMin(cur) + " なら 合計 " + X.fmtMin(cur * d) + "）" : ""));
    renderMem();
  }
  function examDays() {
    const d = X.S.profile.examDate; if (!d) return null;
    const t = new Date(d + "T00:00:00").getTime(); if (isNaN(t)) return null;
    const t0 = new Date(); t0.setHours(0, 0, 0, 0);
    return Math.max(0, Math.round((t - t0.getTime()) / 86400000));
  }
  window.xvMakePlan = function () { X.buildPlan(0); renderStudy(); toast("プランを作りました"); };
  window.xvTogglePlan = function (k) { const p = X.S.plan; if (!p || !p.items[k]) return; p.items[k].done = !p.items[k].done; X.save(); renderStudy(); };
  window.xvSetTarget = function (m) { X.remember("1日の目標(分)", String(m)); X.S.profile.dailyMin = m; X.save(); renderStudy(); };
  window.xvSaveExam = function () {
    X.S.profile.examName = el("xvExamName").value.trim();
    X.S.profile.examDate = el("xvExamDate").value;
    X.save(); renderStudy(); toast("保存しました");
  };

  function renderMem() {
    const m = X.S.memory;
    el("xvMemList").innerHTML = m.length
      ? '<div class="xv-list">' + m.slice().reverse().map((x) =>
          '<div class="xv-item"><div class="ic">🧠</div><div class="bd"><div class="t1">' + esc(x.v) + '</div><div class="t2">' + esc(x.k) + "</div></div>"
          + '<button class="xv-x" onclick="xvDelMem(\'' + esc(x.k).replace(/'/g, "") + "')\">✕</button></div>").join("") + "</div>"
      : '<div class="xv-p">まだ何も覚えていません。「数学が苦手」「志望校は〇〇大学」のように話しかけると覚えます。</div>';
  }
  window.xvDelMem = function (k) { X.S.memory = X.S.memory.filter((x) => x.k !== k); X.save(); renderMem(); };
  window.xvClearMem = function () {
    if (!confirm("XEVYNAR が覚えていることをすべて消します。よろしいですか？")) return;
    X.forgetAll(); renderMem(); toast("消しました");
  };

  /* ══════════ 記録・分析 ══════════ */
  function renderReport() {
    const w = X.weekSeries();
    const total = w.reduce((a, x) => a + x.min, 0);
    const days = w.filter((x) => x.min > 0).length;
    el("xvStats").innerHTML =
      '<div><div class="n">' + X.fmtMin(total).replace("時間", "<span style=\"font-size:11px\">h</span>").replace("分", "<span style=\"font-size:11px\">m</span>") + '</div><div class="l">今週の合計</div></div>'
      + '<div><div class="n">' + days + '</div><div class="l">学習した日</div></div>'
      + '<div><div class="n">' + X.streakDays() + '</div><div class="l">連続日数</div></div>';
    const max = Math.max(60, ...w.map((x) => x.min));
    el("xvBars").innerHTML = w.map((x) =>
      '<div><div class="b" style="height:' + Math.max(3, Math.round(x.min / max * 84)) + 'px" title="' + X.fmtMin(x.min) + '"></div>'
      + '<div class="d">' + "日月火水木金土"[x.d.getDay()] + "</div></div>").join("");

    const weak = X.weakList();
    el("xvWeakBox").innerHTML = weak.length
      ? weak.slice(0, 8).map((x) =>
          '<div class="xv-weak' + (x.rate >= 0.7 ? " ok" : "") + '"><div class="nm">' + esc(x.topic) + "</div>"
          + '<div class="tr"><i style="width:' + Math.round(x.rate * 100) + '%"></i></div>'
          + '<div class="pc">' + Math.round(x.rate * 100) + "%</div></div>").join("")
        + '<div class="xv-p" style="margin-top:8px">正答率の低いものから出題します。</div>'
        + '<button class="xv-btn sm" style="margin-top:10px" onclick="xvStartQuiz(5)">この苦手から5問出す</button>'
      : '<div class="xv-p">まだ苦手の記録がありません。<br>出題に答えると自動でたまります。</div>'
        + '<button class="xv-btn sm" style="margin-top:10px" onclick="xvStartQuiz(5)">苦手問題を5問出す</button>';

    const ss = X.S.sessions.slice(-24).reverse();
    el("xvSessList").innerHTML = ss.length
      ? ss.map((s) => {
          const d = new Date(s.at);
          return '<div class="xv-item"><div class="ic">📘</div><div class="bd"><div class="t1">' + esc(s.topic || s.subject || "学習") + "</div>"
            + '<div class="t2">' + (d.getMonth() + 1) + "/" + d.getDate() + " " + X.pad(d.getHours()) + ":" + X.pad(d.getMinutes()) + (s.subject ? "・" + esc(s.subject) : "") + "</div></div>"
            + '<div class="rt">' + X.fmtMin(s.min) + "</div>"
            + '<button class="xv-x" onclick="xvDelSess(\'' + s.id + "')\">✕</button></div>";
        }).join("")
      : '<div class="xv-empty">記録はまだありません。<br>記録は任意なので、つけなくても XEVYNAR は使えます。</div>';
  }
  window.xvDelSess = function (id) { X.S.sessions = X.S.sessions.filter((s) => s.id !== id); X.save(); renderReport(); };

  /* ══════════ 設定 ══════════ */
  function renderConfig() {
    const lex = X.lexSummary();
    const rows = [
      ["XEVA ウォレット", X.DATA.xeva().toLocaleString() + " XEVA", "🪙", true],
      ["ジェム", X.DATA.gem().toLocaleString() + " ジェム", '<img class="xv-gemico" src="../gem.png" alt="">', true],
      ["MagiLex", lex ? "完全習得 " + lex.masteredContents + " コンテンツ" : "データなし（出題は可能）", "📘", !!lex],
      ["MagiBurst", X.burstOwned().length ? "所持 " + X.burstOwned().length + " 体" + (window.XEVYNAR_KB && window.XEVYNAR_KB.isLive ? "（最新の知識で同期ずみ）" : "") : "データなし", "💥", !!X.burstOwned().length],
      ["MagiFocus", X.DATA.focus() ? "連携ずみ" : "データなし", "🎯", !!X.DATA.focus()],
      ["MagiLink", Object.keys(X.S.link).length ? "会話 " + Object.keys(X.S.link).length + " 件を記憶" : "未登録", "💬", !!Object.keys(X.S.link).length],
    ];
    el("xvSources").innerHTML = rows.map((r) =>
      '<div class="xv-item"><div class="ic">' + r[2] + '</div><div class="bd"><div class="t1">' + esc(r[0]) + '</div>'
      + '<div class="t2">' + esc(r[1]) + "</div></div>"
      + '<div class="rt" style="color:' + (r[3] ? "#37c78f" : "#9aa3c0") + '">' + (r[3] ? "●" : "○") + "</div></div>").join("");

    const names = Object.keys(X.S.link);
    el("xvLinkList").innerHTML = names.length
      ? '<div class="xv-list">' + names.map((n) =>
          '<div class="xv-item"><div class="ic">💬</div><div class="bd"><div class="t1">' + esc(n) + '</div>'
          + '<div class="t2">' + (X.S.link[n].msgs || []).length + " 件</div></div>"
          + '<button class="xv-x" onclick="xvDelLink(\'' + esc(n).replace(/'/g, "") + "')\">✕</button></div>").join("") + "</div>"
      : '<div class="xv-p">まだ登録がありません。</div>';

    el("xvApiUrl").value = X.S.cfg.api.url || "";
    el("xvApiModel").value = X.S.cfg.api.model || "";
    el("xvApiState").innerHTML = X.apiReady()
      ? "接続先が設定されています。自由記述の質問を回せます。"
      : "未設定です。設定しなくても XEVYNAR の機能はすべて使えます。";
  }
  window.xvSaveApi = function () {
    X.S.cfg.api.url = el("xvApiUrl").value.trim();
    X.S.cfg.api.model = el("xvApiModel").value.trim();
    X.save(); renderConfig(); toast("保存しました");
  };
  window.xvDelLink = function (n) { delete X.S.link[n]; X.save(); renderConfig(); };

  /* ══════════ シート（入力ダイアログ） ══════════ */
  function openSheet(title, html) {
    el("xvSheetT").textContent = title;
    el("xvSheetB").innerHTML = html;
    syncVh();
    el("xvSheet").classList.add("on");
  }
  window.xvCloseSheet = function () { el("xvSheet").classList.remove("on"); };

  window.xvOpenLog = function () {
    openSheet("学習を記録する",
      '<div class="xv-p">記録は<b>任意</b>です。残しておくと、あとから振り返れます。</div>'
      + '<label class="xv-p" style="display:block;margin-top:11px">なにをやった？（空でもOK）</label>'
      + '<input class="xv-in" id="xvLogT" placeholder="例：英単語 / 数学の問題集" style="margin:5px 0 11px">'
      + '<label class="xv-p">何分？</label>'
      + '<input class="xv-in" id="xvLogM" type="number" inputmode="numeric" placeholder="45" style="margin:5px 0 11px">'
      + '<div class="xv-chipline" style="margin-bottom:12px">'
      + [15, 25, 30, 45, 60, 90].map((m) => '<button class="xv-chip" onclick="document.getElementById(\'xvLogM\').value=' + m + '">' + m + "分</button>").join("")
      + "</div>"
      + '<button class="xv-btn" onclick="xvDoLog()">記録する</button>');
  };
  window.xvDoLog = function () {
    const t = el("xvLogT").value.trim();
    const m = Number(el("xvLogM").value);
    if (!m || m <= 0) { toast("時間を入れてください"); return; }
    X.addSession(m, X.pickSubject(t), t);
    xvCloseSheet(); toast("記録しました：" + X.fmtMin(m));
    if (page === "report") renderReport(); else if (page === "study") renderStudy();
  };

  window.xvOpenWeak = function () {
    openSheet("苦手を登録する",
      '<div class="xv-p">登録した項目は、今日のプランと出題で先に扱います。</div>'
      + '<input class="xv-in" id="xvWkT" placeholder="例：三角関数 / 英熟語" style="margin:11px 0">'
      + '<div class="xv-row2"><button class="xv-btn sm" onclick="xvDoWeak(true)">できた</button>'
      + '<button class="xv-btn sm ghost" onclick="xvDoWeak(false)">できなかった</button></div>');
  };
  window.xvDoWeak = function (ok) {
    const t = el("xvWkT").value.trim();
    if (!t) { toast("項目を入れてください"); return; }
    X.markWeak(t, ok);
    toast((ok ? "できた" : "できなかった") + "を記録：" + esc(t));
    el("xvWkT").value = "";
    if (page === "report") renderReport();
  };

  window.xvOpenMem = function () {
    openSheet("覚えてほしいこと",
      '<label class="xv-p">項目（例：苦手:数学、志望校）</label>'
      + '<input class="xv-in" id="xvMemK" placeholder="志望校" style="margin:5px 0 11px">'
      + '<label class="xv-p">内容</label>'
      + '<input class="xv-in" id="xvMemV" placeholder="〇〇大学" style="margin:5px 0 13px">'
      + '<button class="xv-btn" onclick="xvDoMem()">覚えてもらう</button>');
  };
  window.xvDoMem = function () {
    const k = el("xvMemK").value.trim(), v = el("xvMemV").value.trim();
    if (!k || !v) { toast("両方入れてください"); return; }
    X.remember(k, v); xvCloseSheet(); renderStudy(); toast("覚えました");
  };

  window.xvOpenLink = function () {
    openSheet("MagiLink の会話を登録",
      '<div class="xv-p">相手の名前と、届いたメッセージを貼り付けてください。口調をまねた返信案を作ります。<br>'
      + "内容はあなたのアカウントにだけ保存され、相手には送られません。</div>"
      + '<input class="xv-in" id="xvLnN" placeholder="相手の名前" style="margin:11px 0">'
      + '<textarea class="xv-in" id="xvLnT" placeholder="届いたメッセージを貼り付け"></textarea>'
      + '<button class="xv-btn" style="margin-top:11px" onclick="xvDoLink()">登録して返信案を見る</button>');
  };
  window.xvDoLink = function () {
    const n = el("xvLnN").value.trim() || "相手";
    const t = el("xvLnT").value.trim();
    if (!t) { toast("メッセージを入れてください"); return; }
    const e = X.S.link[n] || { msgs: [] };
    e.msgs.push({ who: n, t, at: Date.now() });
    if (e.msgs.length > 40) e.msgs = e.msgs.slice(-40);
    X.S.link[n] = e; X.save();
    xvCloseSheet(); go("chat");
    bubble("ai", T.replyDrafts(t, n), [["別の案", "xvSay('別の返信案')"], ["会話を追加", "xvOpenLink()"]], true);
  };

  /* ══════════ 起動 ══════════ */
  function paintWallet() {
    try {
      el("xvBal").textContent = (X.DATA.xeva() || 0).toLocaleString();
      const g = el("xvGem"); if (g) g.textContent = (X.DATA.gem() || 0).toLocaleString();
    } catch (e) {}
  }
  window.addEventListener("xeva:change", paintWallet);
  window.addEventListener("xeva:gem", paintWallet);
  window.addEventListener("xeva:synced", () => { X.load(); paintWallet(); if (page !== "chat") go(page); });

  const inp = el("xvInp");
  inp.addEventListener("input", () => { inp.style.height = "auto"; inp.style.height = Math.min(120, inp.scrollHeight) + "px"; });
  inp.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); window.xvSend(); }
  });

  paintWallet();
  renderQuick();
  renderTimer();

  /* これまでの会話を復元（長い履歴は末尾だけ）。復元分に提供表示は付けない。 */
  const hist = X.S.chat.slice(-16);
  if (hist.length) {
    hist.forEach((m) => bubble(m.r, m.r === "me" ? esc(m.t) : esc(m.t).replace(/\n/g, "<br>")));
    bubble("ai", "続きから始めましょう。何でも聞いてください。",
      [["苦手問題を出して", "xvStartQuiz(5)"], ["いまの状況", "xvSay('いまの状況')"]]);
  } else {
    const h = T.helpAnswer();
    bubble("ai", h.html, h.acts);
  }

  /* ホームから「この質問を渡す」で来たときは、そのまま聞く（#ask=...）
     ★ 区切りは & だけでなく ? と # も含める。
       hash と search を単純につなぐと "…#ask=質問" + "?cb=1" のように
       後ろにクエリがぶら下がり、[^&]+ だと質問文に "?cb=1" まで混ざってしまう。 */
  try {
    const m = /[#&?]ask=([^&#?]+)/.exec(location.hash + location.search);
    if (m) {
      const qtext = decodeURIComponent(m[1]).trim();
      history.replaceState(null, "", location.pathname);
      if (qtext) setTimeout(() => say(qtext), 500);
    }
  } catch (e) {}

  /* ★ 2026-08-18 MagiLex の「XEVYNARで学ぶ」から来たとき。
       #solve=<定石id>  … その解きかたを1手目から開く
       #learn=<問題文>  … 問題文から合いそうな解きかたを並べる
     区切りは #ask= と同じ理由で & ? # の3つを見る。 */
  try {
    const hs = location.hash + location.search;
    /* ★★ 2026-08-18b #q=<セットid>:<問題番号> … MagiLex の1問から、その問題のくわしい解説へ */
    /* ★★ 2026-08-19 #miss=1 … MagiLex の結果画面「まとめて見る」から。
       まちがえた問題の並びを受け取り、1問目から順にたどれるようにする。 */
    if (/[#&?]miss=1/.test(hs)) {
      history.replaceState(null, "", location.pathname);
      const list = loadMissed();
      if (list && list.length) {
        setTimeout(async () => {
          deep.miss = list; deep.missAt = 0;
          await window.xvDeepGo("q", list[0].sid, list[0].qi);
        }, 200);
        return;
      }
    }
    const sq = /[#&?]q=([A-Za-z0-9_]+):(\d+)/.exec(hs);
    if (sq) {
      history.replaceState(null, "", location.pathname);
      const sid = sq[1], qi = parseInt(sq[2], 10) || 0;
      setTimeout(() => { window.xvDeepGo("q", sid, qi); }, 200);
      return;
    }
    const s1 = /[#&?]solve=([^&#?]+)/.exec(hs);
    const s2 = /[#&?]learn=([^&#?]+)/.exec(hs);
    if (s1 || s2) {
      history.replaceState(null, "", location.pathname);
      if (s1) {
        const id = decodeURIComponent(s1[1]).trim();
        /* 見つからない id（ホームからの "#solve=all" など）は、分野の一覧を出す */
        setTimeout(() => {
          if (window.XVSteps && window.XVSteps.byId(id)) window.xvSolveOpen(id);
          else { solveState.id = null; solveState.q = ""; go("solve"); }
        }, 300);
      } else {
        solveState.q = decodeURIComponent(s2[1]).trim();
        setTimeout(() => go("solve"), 300);
      }
      return;   /* 解法タブで始めるので、下の go("chat") は通さない */
    }
  } catch (e) {}

  go("chat");
})();
