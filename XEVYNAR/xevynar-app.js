/* ============================================================
   XEVYNAR — 画面の組み立てと操作
   ------------------------------------------------------------
   ・「提供：XEVYNAR」は <b>生成した中身</b>（プラン・編成・解説・出題・分析）にだけ付ける。
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
  const PAGES = { chat: "xvChatPage", study: "xvStudyPage", timer: "xvTimerPage", report: "xvReportPage", config: "xvConfigPage" };
  let page = "chat";
  function go(p) {
    if (!PAGES[p]) return;
    page = p;
    Object.keys(PAGES).forEach((k) => el(PAGES[k]).classList.toggle("on", k === p));
    document.querySelectorAll(".xv-tab").forEach((t) => t.classList.toggle("on", t.dataset.p === p));
    document.body.classList.toggle("xv-chat", p === "chat");   // 入力欄は相談タブだけ出す
    if (p === "study") renderStudy();
    if (p === "report") renderReport();
    if (p === "config") renderConfig();
    if (p === "timer") renderTimer();
    if (p === "chat") setTimeout(scrollLog, 30);
    else window.scrollTo(0, 0);
  }
  window.xvGo = go;

  /* ══════════ チャット ══════════ */
  const AVATAR = "xevynar-mark.png";
  /* byline=true のときだけ「提供：XEVYNAR」を出す。
     何でも付けると読みにくくなるので、XEVYNAR が組み立てた中身に限る。 */
  function bubble(role, html, acts, byline) {
    const row = document.createElement("div");
    row.className = "xv-msg " + (role === "me" ? "me" : "ai");
    let inner = "";
    if (role !== "me") inner += '<img class="xv-av" src="' + AVATAR + '" alt="XEVYNAR">';
    inner += '<div class="xv-bub">' + html;
    if (acts && acts.length) {
      inner += '<div class="xv-acts">' + acts.map((a) => '<button onclick="' + esc(a[1]) + '">' + esc(a[0]) + "</button>").join("") + "</div>";
    }
    if (role !== "me" && byline === true) inner += '<div class="xv-by"><i></i>提供：XEVYNAR</div>';
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

  /* 質問された問題の解説。MagiLex のデータに載っていればそのまま答え、
     載っていなければ「作らない」と断ったうえで解き方の道すじを出す。 */
  async function answerExplain(text) {
    const tp = typing();
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
        + '<div class="xv-by"><i></i>提供：XEVYNAR</div></div>';
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
        + '<div class="xv-by"><i></i>提供：XEVYNAR</div>'
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

  go("chat");
})();
