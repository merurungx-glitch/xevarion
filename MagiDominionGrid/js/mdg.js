/* ══════════════════════════════════════════════════════════════
   Magi Dominion Grid — 1台のiPadを2〜10人で囲む、運のないボードゲーム
   ──────────────────────────────────────────────────────────────
   ★ 最優先事項（ご指定）:
     「誰が一番運が良かったか」ではなく
     「誰が一番盤面を読み、最適な判断をしたか」で勝者が決まること。
     → <b>サイコロもランダムイベントも戦闘乱数も無い</b>。
       盤面（障害物・スタート位置）も<b>毎回まったく同じ</b>にしてある。
       Math.random() はこのファイルのどこでも使っていない。

   ★ 1ターンの流れ
     ① 計画フェーズ … 全員が同時に、他の人に見せずに1つ行動をえらぶ
     ② 実行フェーズ … 全員ぶんをまとめて処理し、短い演出で結果を見せる

   ★ 行動は3種類（ご指定）
     ・移動      … 上下左右に1マス
     ・領地      … となりの<b>空きマスを取る</b>／となりの<b>敵の領地を攻める</b>
                    （どちらも「となりのマスを1つ指す」ひとつの操作なので同じ枠）
     ・特殊行動  … BREAKTHROUGH / FORTRESS / DOUBLE CLAIM / SACRIFICE
                    ＋ 終盤だけ使える FINAL STRATEGY（1回だけの切り札）

   ★ 同時処理の決めごと（＝ここが「運が無い」の要）
     ・同じ空きマスを2人以上が取ろうとしたら<b>だれも取れない</b>（中立のまま）
     ・同じマスへ2人以上が動こうとしたら<b>だれも動かない</b>
     ・攻撃の勝ち負けは<b>攻撃前の盤面</b>で全員ぶん同時に計算する
       （先に処理した人が有利、が起きない）
     ・攻撃力＝そのマスに隣接する自分の領地の数（＋自分のコマが隣なら+1）
       防御力＝同じ数え方を持ち主で。<b>同点なら守り勝ち</b>。
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  /* ══════════ 決めごと（バランスはここだけ見ればよい） ══════════ */
  const N = 7;                       /* 盤は 7×7 */
  const MAX_PLAYERS = 10;
  const MIN_PLAYERS = 2;
  const TURN_CHOICES = [20, 30, 40];
  const TIME_CHOICES = [20, 25, 30, 0];      /* 0 ＝ 時間制限なし */
  /* 連結ボーナス（つながっている領地のかたまり1つにつき、いちばん上の1つだけ乗る） */
  const CHAIN_BONUS = [
    { n: 8, pt: 10 },
    { n: 5, pt: 5 },
    { n: 3, pt: 2 },
  ];
  const SPECIAL_MAX = { breakthrough: 2, fortress: 1, doubleclaim: 1, sacrifice: 1 };
  const FINAL_FROM_LEFT = 8;          /* 残りこのターン数から FINAL STRATEGY が使える */
  const BREAK_RANGE = 2;              /* BREAKTHROUGH の射程（マンハッタン距離） */
  const SACRIFICE_COST = 3;           /* SACRIFICE で失う自分の領地の数 */
  const RETREAT_STEPS = 3;            /* 撤退で動ける距離 */
  const RETREAT_COST = 2;             /* 撤退で失う領地の数 */

  /* 10人ぶんの色。並んでいても見分けられるように色相を散らしてある。 */
  const COLORS = [
    "#e2564f", "#3f83e8", "#25a06a", "#f5b421", "#9b5bdd",
    "#ef7ab0", "#17b0b8", "#f0803c", "#6b7fd7", "#7fae2f",
  ];
  const NAMES = ["プレイヤー1", "プレイヤー2", "プレイヤー3", "プレイヤー4", "プレイヤー5",
                 "プレイヤー6", "プレイヤー7", "プレイヤー8", "プレイヤー9", "プレイヤー10"];

  /* ══ 障害物（毎回まったく同じ・上下左右に対称）══
     対称にしてあるので「置かれた場所で有利不利が出る」ことがない。 */
  const ROCKS = [
    [1, 1], [1, 5], [5, 1], [5, 5],
    [3, 2], [3, 4], [2, 3], [4, 3],
  ];
  /* 中央エリア（公開目標で使う 3×3） */
  function centerCells() {
    const out = [];
    for (let y = 2; y <= 4; y++) for (let x = 2; x <= 4; x++) out.push(y * N + x);
    return out;
  }

  /* ══ スタート位置（人数ごとに決め打ち・回転対称）══
     外周を等間隔に取る。人数が変わっても「特定の人だけ中央に近い」が起きない。 */
  const RING = [
    [0, 0], [3, 0], [6, 0], [6, 3], [6, 6], [3, 6], [0, 6], [0, 3],
    [1, 2], [5, 4],
  ];

  /* ══ 公開目標（全員に見せる。1つだけ） ══ */
  const GOALS = [
    { k: "center", nm: "中央エリアを支配", pt: 15,
      desc: "中央の 3×3（★のまわり）のうち <b>5マス以上</b> を自分の領地にする",
      check: (S, p) => centerCells().filter((i) => S.own[i] === p.i).length >= 5 },
    { k: "chain5", nm: "5マス以上つなげる", pt: 10,
      desc: "つながった領地のかたまりを <b>5マス以上</b> つくる",
      check: (S, p) => maxChain(S, p.i) >= 5 },
    { k: "hold8", nm: "終了時に8マス以上", pt: 10,
      desc: "ゲーム終了時に領地を <b>8マス以上</b> 持っている",
      check: (S, p) => countOwn(S, p.i) >= 8 },
    { k: "corner", nm: "3つのかどを取る", pt: 12,
      desc: "盤の4すみのうち <b>3つ以上</b> を自分の領地にする",
      check: (S, p) => [0, N - 1, N * (N - 1), N * N - 1].filter((i) => S.own[i] === p.i).length >= 3 },
    { k: "line", nm: "一列を貫く", pt: 15,
      desc: "たて or よこの<b>一列</b>を、障害物をのぞいて全部自分の領地にする",
      check: (S, p) => {
        for (let y = 0; y < N; y++) {
          let ok = true;
          for (let x = 0; x < N; x++) { const i = y * N + x; if (S.rock[i]) continue; if (S.own[i] !== p.i) { ok = false; break; } }
          if (ok) return true;
        }
        for (let x = 0; x < N; x++) {
          let ok = true;
          for (let y = 0; y < N; y++) { const i = y * N + x; if (S.rock[i]) continue; if (S.own[i] !== p.i) { ok = false; break; } }
          if (ok) return true;
        }
        return false;
      } },
  ];

  /* ══ 特殊行動 ══ */
  const SPECIALS = [
    { k: "breakthrough", nm: "BREAKTHROUGH", ic: "⚔",
      d: "コマから" + BREAK_RANGE + "マス以内の<b>敵の領地を1つ奪う</b>（守りは関係なし）" },
    { k: "fortress", nm: "FORTRESS", ic: "🛡",
      d: "自分の領地を1つえらび、<b>このターンは絶対に奪われない</b>" },
    { k: "doubleclaim", nm: "DOUBLE CLAIM", ic: "🚩",
      d: "となりの<b>空きマスを2つ同時に</b>領地にする" },
    { k: "sacrifice", nm: "SACRIFICE", ic: "💥",
      d: "自分の領地を" + SACRIFICE_COST + "つ失うかわりに、<b>盤上のどこの敵領地でも1つ奪う</b>" },
  ];
  /* ══ FINAL STRATEGY（ゲーム中1回だけ・終盤のみ） ══ */
  const FINALS = [
    { k: "blitz", nm: "電撃併合", ic: "⚡",
      d: "自分の領地ととなり合う<b>空きマスを3つ同時に</b>取る" },
    { k: "split", nm: "分断", ic: "✂",
      d: "敵の領地を<b>2つ中立にもどす</b>（連結ボーナスを崩せる）" },
    { k: "seize", nm: "強奪", ic: "👑",
      d: "盤上の<b>どこの敵領地でも1つ、守りを無視して奪う</b>" },
    { k: "scorch", nm: "焦土", ic: "🔥",
      d: "自分の領地の<b>半分を失う</b>かわりに、失った1マスにつき <b>+3ポイント</b>" },
  ];

  /* ══════════ 状態 ══════════ */
  let S = null;                 /* いまのゲーム。null ＝ 遊んでいない */
  let cfg = { turns: 30, time: 25, goal: "center" };
  let lobby = [];               /* [{name}] ロビーの参加者 */
  let planFor = -1;             /* いま行動をえらんでいる人（本人だけが見る） */
  let draft = null;             /* えらびかけの行動 */
  let timerId = null;

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const xy = (i) => ({ x: i % N, y: (i / N) | 0 });
  const idx = (x, y) => y * N + x;
  const inb = (x, y) => x >= 0 && y >= 0 && x < N && y < N;
  function neigh(i) {
    const { x, y } = xy(i), out = [];
    if (inb(x, y - 1)) out.push(idx(x, y - 1));
    if (inb(x, y + 1)) out.push(idx(x, y + 1));
    if (inb(x - 1, y)) out.push(idx(x - 1, y));
    if (inb(x + 1, y)) out.push(idx(x + 1, y));
    return out;
  }
  function manhattan(a, b) { const A = xy(a), B = xy(b); return Math.abs(A.x - B.x) + Math.abs(A.y - B.y); }
  function toast(t, ms) {
    const el = $("toast"); if (!el) return;
    el.innerHTML = t; el.classList.add("on");
    clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove("on"), ms || 2000);
  }
  function show(id) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("on", s.id === id));
  }

  /* ══════════ 得点の計算（画面のどこでもこの1本を使う） ══════════ */
  function countOwn(st, pi) { let n = 0; for (let i = 0; i < N * N; i++) if (st.own[i] === pi) n++; return n; }
  /* つながった領地のかたまりの大きさを全部返す */
  function chains(st, pi) {
    const seen = new Uint8Array(N * N), out = [];
    for (let i = 0; i < N * N; i++) {
      if (st.own[i] !== pi || seen[i]) continue;
      let n = 0; const stack = [i]; seen[i] = 1;
      while (stack.length) {
        const c = stack.pop(); n++;
        neigh(c).forEach((k) => { if (!seen[k] && st.own[k] === pi) { seen[k] = 1; stack.push(k); } });
      }
      out.push(n);
    }
    return out;
  }
  function maxChain(st, pi) { const c = chains(st, pi); return c.length ? Math.max.apply(null, c) : 0; }
  function chainBonus(st, pi) {
    return chains(st, pi).reduce((a, n) => {
      const hit = CHAIN_BONUS.find((b) => n >= b.n);
      return a + (hit ? hit.pt : 0);
    }, 0);
  }
  /* いまの持ち点。基本＋連結ボーナス＋公開目標＋積み上げぶん（焦土など） */
  function scoreOf(st, p) {
    const base = countOwn(st, p.i);
    const chain = chainBonus(st, p.i);
    const g = GOALS.find((x) => x.k === st.goal);
    const goal = (g && g.check(st, p)) ? g.pt : 0;
    return { base, chain, goal, extra: p.extra | 0, total: base + chain + goal + (p.extra | 0) };
  }

  /* ══════════ ロビー ══════════ */
  function goTitle() { stopTimer(); S = null; show("scr-title"); }
  function goLobby() {
    if (!lobby.length) lobby = [{ name: NAMES[0] }, { name: NAMES[1] }];
    show("scr-lobby");
    renderLobby();
  }
  function renderLobby() {
    $("lbCount").textContent = lobby.length + " / " + MAX_PLAYERS;
    $("lbList").innerHTML =
      lobby.map((p, i) =>
        `<div class="pslot" style="--c:${COLORS[i]}">
           <span class="no" style="background:${COLORS[i]}">${i + 1}</span>
           <input class="pnm" maxlength="8" value="${esc(p.name)}" oninput="MDG.rename(${i},this.value)">
           ${lobby.length > MIN_PLAYERS ? `<button class="x" onclick="MDG.removeP(${i})" aria-label="はずす">✕</button>` : ""}
         </div>`).join("") +
      (lobby.length < MAX_PLAYERS
        ? `<div class="pslot add" onclick="MDG.addP()">＋ プレイヤーを足す</div>` : "");
    $("optTurns").innerHTML = TURN_CHOICES.map((t) =>
      `<button class="${cfg.turns === t ? "on" : ""}" onclick="MDG.setCfg('turns',${t})">${t} ターン</button>`).join("");
    $("optTime").innerHTML = TIME_CHOICES.map((t) =>
      `<button class="${cfg.time === t ? "on" : ""}" onclick="MDG.setCfg('time',${t})">${t ? t + " 秒" : "制限なし"}</button>`).join("");
    $("optGoal").innerHTML = GOALS.map((g) =>
      `<button class="${cfg.goal === g.k ? "on" : ""}" onclick="MDG.setCfg('goal','${g.k}')">${g.nm}</button>`).join("");
    const g = GOALS.find((x) => x.k === cfg.goal);
    $("goalNote").innerHTML = g
      ? `⭐ <b>${esc(g.nm)}</b>（達成すると <b>+${g.pt}</b> ポイント）… ${g.desc}<br>
         目標は<b>全員に公開</b>されます。かくし持ちの情報はありません。`
      : "";
    $("lbStart").disabled = lobby.length < MIN_PLAYERS;
  }
  function addP() { if (lobby.length < MAX_PLAYERS) { lobby.push({ name: NAMES[lobby.length] }); renderLobby(); } }
  function removeP(i) { if (lobby.length > MIN_PLAYERS) { lobby.splice(i, 1); renderLobby(); } }
  function rename(i, v) { if (lobby[i]) lobby[i].name = String(v || "").slice(0, 8); }
  function setCfg(k, v) { cfg[k] = v; renderLobby(); }

  /* ══════════ ゲームを始める ══════════ */
  function startGame() {
    if (lobby.length < MIN_PLAYERS) return;
    const own = new Int8Array(N * N).fill(-1);
    const rock = new Uint8Array(N * N);
    ROCKS.forEach(([x, y]) => { rock[idx(x, y)] = 1; });
    const players = lobby.map((p, i) => {
      const [x, y] = RING[i];
      return {
        i, name: (p.name || NAMES[i]).slice(0, 8) || NAMES[i], c: COLORS[i],
        at: idx(x, y), extra: 0,
        sp: Object.assign({}, SPECIAL_MAX),
        final: true, attacked: false, fort: -1, dbl: false,
      };
    });
    /* スタートのマスは、そのまま最初の領地にする（0からだと動きようがないため） */
    players.forEach((p) => { rock[p.at] = 0; own[p.at] = p.i; });
    S = {
      own, rock, players, turn: 1, maxTurn: cfg.turns, time: cfg.time,
      goal: cfg.goal, phase: "plan", plans: {}, left: cfg.time, log: [],
    };
    show("scr-game");
    beginPlan();
  }

  /* ══════════ 計画フェーズ ══════════ */
  function beginPlan() {
    S.phase = "plan";
    S.plans = {};
    S.players.forEach((p) => { p.fort = -1; });
    S.left = S.time;
    $("gExec").classList.remove("on");
    $("gExec").innerHTML = "";
    renderAll();
    startTimer();
  }
  function startTimer() {
    stopTimer();
    if (!S.time) { $("gTime").textContent = "時間制限なし"; return; }
    timerId = setInterval(() => {
      if (!S || S.phase !== "plan") return stopTimer();
      S.left--;
      paintTime();
      if (S.left <= 0) { stopTimer(); runExec(); }
    }, 1000);
    paintTime();
  }
  function stopTimer() { if (timerId) { clearInterval(timerId); timerId = null; } }
  function paintTime() {
    const t = $("gTime"); if (!t) return;
    if (!S.time) { t.textContent = "時間制限なし"; t.classList.remove("hot"); return; }
    t.textContent = "のこり " + Math.max(0, S.left) + " 秒";
    t.classList.toggle("hot", S.left <= 5);
  }

  /* ══════════ 描画 ══════════ */
  function renderAll() {
    paintTop(); paintBoard(); paintBottom(); paintRank(); paintGoal();
    /* ★ 描いた直後は上下の欄の高さがまだ確定していないことがあるので、
       次のフレームと少しあとでも測り直す（盤がはみ出さないように）。 */
    fitBoard();
    requestAnimationFrame(fitBoard);
    setTimeout(fitBoard, 160);
  }
  window.addEventListener("resize", () => { try { if (S) fitBoard(); } catch (e) {} });

  function paintGoal() {
    const g = GOALS.find((x) => x.k === S.goal);
    $("gGoal").innerHTML = g ? `⭐ 公開目標：<b>${esc(g.nm)}</b>（+${g.pt}）` : "";
    $("gTurn").textContent = S.turn + " / " + S.maxTurn;
  }
  function paintTop() {
    $("gTop").innerHTML = S.players.map((p) => {
      const sc = scoreOf(S, p);
      const spLeft = Object.keys(p.sp).reduce((a, k) => a + p.sp[k], 0);
      const done = S.phase === "plan" && S.plans[p.i];
      return `<div class="pcard" style="--pc:${p.c}">
        <div class="n"><span>${esc(p.name)}</span>${done ? '<span class="ck">✓</span>' : ""}</div>
        <div class="r"><b>${sc.total}</b><i>点</i><b style="font-size:12.5px;color:var(--sub)">${sc.base}</b><i>領地</i></div>
        <div class="sp">特殊 ${spLeft}${p.final ? " ／ 切札あり" : ""}</div>
      </div>`;
    }).join("");
  }
  function paintRank() {
    const rows = S.players.map((p) => ({ p, s: scoreOf(S, p) }))
      .sort((a, b) => b.s.total - a.s.total || b.s.base - a.s.base || a.p.i - b.p.i);
    const html = rows.map((r, k) =>
      `<div class="rk"><span class="no">${k + 1}</span><span class="d" style="background:${r.p.c}"></span>
        <span class="nm">${esc(r.p.name)}</span><span class="pt" style="color:${r.p.c}">${r.s.total}</span></div>`).join("");
    $("gRankL").innerHTML = html;
    $("gRankR").innerHTML = html;
  }
  /* ══ ★★ 盤の大きさを画面の残りから決める ══
     CSS の media query だけだと、上のプレイヤー欄と下の行動欄の高さを
     引けないので、人数が増えると盤が<b>画面の下へはみ出す</b>。
     ここで .g-mid の実寸を測って 1マスの大きさを出す。 */
  function fitBoard() {
    const mid = document.querySelector(".g-mid");
    const wrap = document.querySelector(".g-boardwrap");
    const b = $("board");
    if (!mid || !b || !wrap) return;
    const gapPad = 34;                      /* 盤の内側の余白＋枠 */
    const goalH = (document.querySelector(".g-goal") || {}).offsetHeight || 26;
    const turnH = (document.querySelector(".g-turnbadge") || {}).offsetHeight || 20;
    const other = goalH + turnH + 22;       /* 公開目標の帯＋ターン表示＋すきま */
    const sides = Array.from(document.querySelectorAll(".g-side"))
      .reduce((a, e) => a + (e.offsetParent ? e.offsetWidth + 8 : 0), 0);
    const availW = mid.clientWidth - sides - 16;
    const availH = mid.clientHeight - other - 16;
    const cell = Math.floor(Math.min((availW - gapPad) / N, (availH - gapPad) / N));
    b.style.setProperty("--cell", Math.max(26, Math.min(96, cell)) + "px");
  }
  function paintBoard(fx) {
    const b = $("board");
    let h = "";
    for (let i = 0; i < N * N; i++) {
      const o = S.own[i];
      const cls = ["cell"];
      if (S.rock[i]) cls.push("rock");
      if (o >= 0) cls.push("own");
      if (i === idx(3, 3)) cls.push("star");
      if (fx && fx.gain && fx.gain.indexOf(i) >= 0) cls.push("gain");
      if (fx && fx.hit && fx.hit.indexOf(i) >= 0) cls.push("hitfx");
      const pawn = S.players.find((p) => p.at === i);
      const fort = S.players.find((p) => p.fort === i);
      h += `<div class="${cls.join(" ")}" data-i="${i}"${o >= 0 ? ` style="--c:${S.players[o].c}"` : ""}>`
        + (fort ? '<span class="fort">🛡</span>' : "")
        + (pawn ? `<span class="pawn" style="--p:${pawn.c}"></span>` : "")
        + "</div>";
    }
    b.innerHTML = h;
  }
  function paintBottom() {
    $("gPhase").textContent = S.phase === "plan" ? "計画フェーズ" : "実行フェーズ";
    const waiting = S.players.filter((p) => !S.plans[p.i]).length;
    $("gMsg").textContent = S.phase === "plan"
      ? (waiting ? "自分の名前を押して行動をえらんでください（のこり " + waiting + " 人）" : "全員そろいました")
      : "結果を処理しています";
    $("gChips").innerHTML = S.phase !== "plan" ? "" : S.players.map((p) =>
      `<button class="pchip ${S.plans[p.i] ? "ok" : ""}" style="--pc:${p.c}" onclick="MDG.openPlan(${p.i})">
        <span class="d"></span>${esc(p.name)}${S.plans[p.i] ? " ✓" : ""}</button>`).join("");
    paintTime();
  }

  /* ══════════════════════════════════════════════════════════════
     行動をえらぶパネル（本人だけが見る）
     ──────────────────────────────────────────────────────────────
     ★ 1台をみんなで見ているので、えらんでいる中身が他の人に見えないよう
       <b>小さなパネルを開いて、決めたらすぐ閉じる</b>形にしてある。
       だれが決めたかだけが「✓」で分かり、<b>中身は実行フェーズまで出ない</b>。
     ══════════════════════════════════════════════════════════════ */
  function openPlan(pi) {
    if (S.phase !== "plan") return;
    planFor = pi;
    const p = S.players[pi];
    draft = S.plans[pi] ? JSON.parse(JSON.stringify(S.plans[pi])) : { type: "move" };
    $("ovPlan").classList.add("on");
    renderPlan();
  }
  function closePlan() { $("ovPlan").classList.remove("on"); planFor = -1; draft = null; }

  function renderPlan() {
    const p = S.players[planFor];
    const card = $("planCard");
    card.style.setProperty("--pc", p.c);
    const spLeft = Object.keys(p.sp).reduce((a, k) => a + p.sp[k], 0);
    const finalOpen = p.final && (S.maxTurn - S.turn) < FINAL_FROM_LEFT;
    let body = "";
    if (draft.type === "move") body = planMove(p);
    else if (draft.type === "claim") body = planClaim(p);
    else if (draft.type === "special") body = planSpecial(p, finalOpen);
    const ok = planReady(p);
    card.innerHTML = `
      <h3 style="color:${p.c}">${esc(p.name)} の行動</h3>
      <p class="sub">他の人には見えません。決めたらすぐ閉じます。<br>
        <b>ターン ${S.turn} / ${S.maxTurn}</b> ・ 領地 <b>${countOwn(S, p.i)}</b> ・ 得点 <b>${scoreOf(S, p).total}</b></p>
      <div class="acts">
        <button class="act ${draft.type === "move" ? "on" : ""}" onclick="MDG.setType('move')">
          <div class="ic">🚶</div><div class="t">移動</div><div class="d">コマを1マス</div></button>
        <button class="act ${draft.type === "claim" ? "on" : ""}" onclick="MDG.setType('claim')">
          <div class="ic">🚩</div><div class="t">領地</div><div class="d">となりを取る／攻める</div></button>
        <button class="act ${draft.type === "special" ? "on" : ""}" ${(spLeft || finalOpen) ? "" : "disabled"} onclick="MDG.setType('special')">
          <div class="ic">✨</div><div class="t">特殊行動</div><div class="d">のこり ${spLeft}${finalOpen ? " ＋切札" : ""}</div></button>
      </div>
      ${body}
      <div class="row">
        <button class="mbtn" onclick="MDG.closePlan()">キャンセル</button>
        <button class="mbtn pri" ${ok ? "" : "disabled"} onclick="MDG.decide()">決定</button>
      </div>`;
  }

  /* ── 移動 ── */
  function canMoveTo(p, i) {
    if (i < 0 || S.rock[i]) return false;
    if (S.players.some((q) => q !== p && q.at === i)) return false;     /* 人がいる */
    const o = S.own[i];
    if (o >= 0 && o !== p.i) return false;                              /* 敵の領地は通れない */
    return true;
  }
  function planMove(p) {
    const { x, y } = xy(p.at);
    const dirs = [
      { k: "up", ic: "▲", i: inb(x, y - 1) ? idx(x, y - 1) : -1 },
      { k: "left", ic: "◀", i: inb(x - 1, y) ? idx(x - 1, y) : -1 },
      { k: "right", ic: "▶", i: inb(x + 1, y) ? idx(x + 1, y) : -1 },
      { k: "down", ic: "▼", i: inb(x, y + 1) ? idx(x, y + 1) : -1 },
    ];
    const btn = (d) => `<button class="${draft.dir === d.k ? "on" : ""}" ${canMoveTo(p, d.i) ? "" : "disabled"}
      onclick="MDG.setDir('${d.k}',${d.i})">${d.ic}</button>`;
    const up = dirs[0], lf = dirs[1], rt = dirs[2], dn = dirs[3];
    let h = `<div class="pad">
      <span class="sp"></span>${btn(up)}<span class="sp"></span>
      ${btn(lf)}<span class="sp"></span>${btn(rt)}
      <span class="sp"></span>${btn(dn)}<span class="sp"></span>
    </div>
    <p class="hintline">ななめには動けません。<b>敵の領地・障害物・人のいるマス</b>には入れません。</p>`;
    /* ── 撤退（前のターンに攻められた人だけ） ── */
    if (p.attacked) {
      h += `<button class="spitem ${draft.retreat ? "on" : ""}" onclick="MDG.toggleRetreat()">
        <span class="si">🏳</span>
        <span><span class="sn">撤退する</span>
        <span class="sd">前のターンに攻められたので使えます。領地を <b>${RETREAT_COST}</b> つ失うかわりに、
          コマを <b>${RETREAT_STEPS}マスぶん</b> 動かして安全な場所へ逃げられます。</span></span>
        <span class="sl">${draft.retreat ? "使う" : "使わない"}</span></button>`;
      if (draft.retreat) {
        h += miniBoard(p, retreatCells(p), draft.to, "MDG.setTo");
        h += `<p class="hintline">逃げ先をえらんでください（${RETREAT_STEPS}マス以内・敵の領地は通れません）。</p>`;
      }
    }
    return h;
  }
  /* 撤退で行ける場所（歩ける道をたどる） */
  function retreatCells(p) {
    const dist = new Int8Array(N * N).fill(-1);
    dist[p.at] = 0;
    const q = [p.at];
    while (q.length) {
      const c = q.shift();
      if (dist[c] >= RETREAT_STEPS) continue;
      neigh(c).forEach((k) => {
        if (dist[k] >= 0) return;
        if (!canMoveTo(p, k)) return;
        dist[k] = dist[c] + 1; q.push(k);
      });
    }
    const out = [];
    for (let i = 0; i < N * N; i++) if (dist[i] > 0) out.push(i);
    return out;
  }

  /* ── 領地（取る／攻める） ── */
  function claimTargets(p) {
    /* 自分の領地・自分のコマのとなりにあるマス */
    const from = [p.at];
    for (let i = 0; i < N * N; i++) if (S.own[i] === p.i) from.push(i);
    const set = {};
    from.forEach((i) => neigh(i).forEach((k) => {
      if (S.rock[k]) return;
      if (S.own[k] === p.i) return;
      set[k] = 1;
    }));
    return Object.keys(set).map(Number);
  }
  function planClaim(p) {
    const tg = claimTargets(p);
    let h = miniBoard(p, tg, draft.to, "MDG.setTo");
    if (draft.to != null) {
      const o = S.own[draft.to];
      if (o < 0) {
        h += `<p class="hintline">🚩 <b>空きマス</b>を領地にします。
          ${p.dbl ? "（DOUBLE CLAIM が乗っているので<b>2マス</b>取れます）" : ""}</p>`;
      } else {
        const a = power(S, p.i, draft.to), d = power(S, o, draft.to);
        h += `<p class="hintline">⚔ <b>${esc(S.players[o].name)}</b> の領地を攻めます。<br>
          いまの見こみ： 攻撃力 <b>${a}</b> ／ 防御力 <b>${d}</b> —
          <b style="color:${a > d ? "#25a06a" : "#e2564f"}">${a > d ? "奪える" : "はね返される"}</b><br>
          <span style="color:#5c6b88">※ ほかの人の行動しだいで数字は変わります（同点なら守り勝ち）</span></p>`;
      }
    } else {
      h += `<p class="hintline">となりのマスを1つえらんでください。<br>
        <b>空きマス</b>なら領地になり、<b>敵の領地</b>なら攻撃になります。</p>`;
    }
    if (!tg.length) h += `<p class="warnline">取れるとなりのマスがありません。ほかの行動をえらんでください。</p>`;
    return h;
  }

  /* ── 特殊行動 ── */
  function planSpecial(p, finalOpen) {
    let h = '<div class="splist">';
    SPECIALS.forEach((s) => {
      h += `<button class="spitem ${draft.sp === s.k ? "on" : ""}" ${p.sp[s.k] > 0 ? "" : "disabled"}
        onclick="MDG.setSp('${s.k}')">
        <span class="si">${s.ic}</span>
        <span><span class="sn">${s.nm}</span><span class="sd">${s.d}</span></span>
        <span class="sl">のこり ${p.sp[s.k]}</span></button>`;
    });
    if (finalOpen) {
      h += `<div style="height:6px"></div>`;
      FINALS.forEach((f) => {
        h += `<button class="spitem ${draft.sp === "final:" + f.k ? "on" : ""}" onclick="MDG.setSp('final:${f.k}')">
          <span class="si">${f.ic}</span>
          <span><span class="sn">FINAL — ${f.nm}</span><span class="sd">${f.d}</span></span>
          <span class="sl">1回だけ</span></button>`;
      });
    } else if (p.final) {
      h += `<p class="hintline">🏁 <b>FINAL STRATEGY</b> は、のこり <b>${FINAL_FROM_LEFT}</b> ターンになると使えます。</p>`;
    }
    h += "</div>";
    /* 目標のマスをえらぶもの */
    const need = spNeed(p);
    if (need) {
      h += miniBoard(p, need.cells, draft.to, "MDG.setTo", need.multi ? (draft.list || []) : null);
      h += `<p class="hintline">${need.hint}</p>`;
      if (!need.cells.length) h += `<p class="warnline">えらべるマスがありません。</p>`;
    }
    return h;
  }
  /* その特殊行動が「どのマスをえらぶ必要があるか」 */
  function spNeed(p) {
    const k = draft.sp;
    if (!k) return null;
    const enemies = () => { const o = []; for (let i = 0; i < N * N; i++) if (S.own[i] >= 0 && S.own[i] !== p.i) o.push(i); return o; };
    const mine = () => { const o = []; for (let i = 0; i < N * N; i++) if (S.own[i] === p.i) o.push(i); return o; };
    if (k === "breakthrough") {
      return { cells: enemies().filter((i) => manhattan(i, p.at) <= BREAK_RANGE),
               hint: "コマから " + BREAK_RANGE + " マス以内の<b>敵の領地</b>を1つえらんでください。" };
    }
    if (k === "fortress") return { cells: mine(), hint: "このターン<b>絶対に守る</b>自分の領地を1つえらんでください。" };
    if (k === "sacrifice") {
      if (countOwn(S, p.i) <= SACRIFICE_COST) return { cells: [], hint: "領地が足りません（" + (SACRIFICE_COST + 1) + "マス以上必要）。" };
      return { cells: enemies(), hint: "奪う<b>敵の領地</b>を1つえらんでください（自分の領地を " + SACRIFICE_COST + " つ失います）。" };
    }
    if (k === "doubleclaim") {
      return { cells: claimTargets(p).filter((i) => S.own[i] < 0), multi: 2,
               hint: "取る<b>空きマスを2つ</b>えらんでください。" };
    }
    if (k === "final:seize") return { cells: enemies(), hint: "奪う<b>敵の領地</b>を1つえらんでください（守りは無視されます）。" };
    if (k === "final:split") return { cells: enemies(), multi: 2, hint: "中立にもどす<b>敵の領地を2つ</b>えらんでください。" };
    if (k === "final:blitz") {
      return { cells: claimTargets(p).filter((i) => S.own[i] < 0), multi: 3,
               hint: "取る<b>空きマスを3つ</b>えらんでください。" };
    }
    if (k === "final:scorch") return null;
    return null;
  }

  /* 小さい盤（パネルの中でマスをえらぶ） */
  function miniBoard(p, cells, sel, fn, list) {
    const can = {};
    cells.forEach((i) => { can[i] = 1; });
    let h = '<div class="mini">';
    for (let i = 0; i < N * N; i++) {
      const o = S.own[i];
      const cls = [];
      if (S.rock[i]) cls.push("rock");
      if (o >= 0) cls.push("own");
      if (can[i]) cls.push("pick");
      if (list ? list.indexOf(i) >= 0 : sel === i) cls.push("sel");
      h += `<div class="${cls.join(" ")}"${o >= 0 ? ` style="--c:${S.players[o].c}"` : ""}`
        + (can[i] ? ` onclick="${fn}(${i})"` : "") + "></div>";
    }
    return h + "</div>";
  }

  /* パネルの操作 */
  function setType(t) { draft = { type: t }; renderPlan(); }
  function setDir(k, i) { draft.dir = k; draft.to = i; draft.retreat = false; renderPlan(); }
  function toggleRetreat() { draft.retreat = !draft.retreat; draft.dir = null; draft.to = null; renderPlan(); }
  function setSp(k) { draft.sp = k; draft.to = null; draft.list = []; renderPlan(); }
  function setTo(i) {
    const need = draft.type === "special" ? spNeed(S.players[planFor]) : null;
    if (need && need.multi) {
      draft.list = draft.list || [];
      const at = draft.list.indexOf(i);
      if (at >= 0) draft.list.splice(at, 1);
      else if (draft.list.length < need.multi) draft.list.push(i);
      draft.to = draft.list[0];
    } else {
      draft.to = i;
    }
    renderPlan();
  }
  function planReady(p) {
    if (draft.type === "move") {
      if (draft.retreat) return draft.to != null;
      return draft.dir && draft.to != null && canMoveTo(p, draft.to);
    }
    if (draft.type === "claim") return draft.to != null;
    if (draft.type === "special") {
      if (!draft.sp) return false;
      if (draft.sp === "final:scorch") return countOwn(S, p.i) >= 2;
      const need = spNeed(p);
      if (!need) return false;
      if (need.multi) return (draft.list || []).length === need.multi;
      return draft.to != null;
    }
    return false;
  }
  function decide() {
    const p = S.players[planFor];
    if (!planReady(p)) return;
    S.plans[p.i] = JSON.parse(JSON.stringify(draft));
    closePlan();
    paintTop(); paintBottom();
    /* ★ 全員そろったらすぐ実行フェーズへ（待たせない・ご指定） */
    if (S.players.every((q) => S.plans[q.i])) { stopTimer(); setTimeout(runExec, 320); }
  }

  /* ══════════════════════════════════════════════════════════════
     実行フェーズ — 全員ぶんを「同じ盤面」から一度に処理する
     ★ 順番による有利不利が出ないよう、判定は<b>処理前の盤面</b>で行い、
       書きこみだけを後からまとめて行う。
     ══════════════════════════════════════════════════════════════ */
  /* そのマスに対する、あるプレイヤーの力（隣接する自分の領地の数＋コマが隣なら+1）
     ★★ コマの位置は<b>渡された盤面（st.at）</b>を見る。
       生のプレイヤーを見ると、同じターンに<b>先に処理した移動</b>が攻撃力に効いてしまい、
       「処理の順番で強さが変わる」＝運が入るのと同じことになる。 */
  function power(st, pi, i) {
    let n = 0;
    const ns = neigh(i);
    ns.forEach((k) => { if (st.own[k] === pi) n++; });
    const at = st.at ? st.at[pi] : (st.players[pi] || {}).at;
    if (at != null && ns.indexOf(at) >= 0) n++;
    return n;
  }

  function runExec() {
    stopTimer();
    S.phase = "exec";
    S.players.forEach((p) => { p.attacked = false; });
    /* 判定にはこの「処理前の盤面」だけを使う（コマの位置も控える） */
    const before = { own: S.own.slice(), rock: S.rock, players: S.players,
                     at: S.players.map((q) => q.at) };
    const logs = [];
    const gain = [], hit = [];

    /* ── ⓪ FORTRESS を先に立てる（守りの計算に効かせるため） ── */
    S.players.forEach((p) => {
      const pl = S.plans[p.i];
      if (pl && pl.type === "special" && pl.sp === "fortress" && p.sp.fortress > 0) {
        p.fort = pl.to; p.sp.fortress--;
        logs.push({ p, ic: "🛡", t: `<b>FORTRESS</b> — 領地を1つ、このターン完全に守る` });
      }
    });

    /* ── ① 移動（同じマスを取り合ったら、だれも動かない） ── */
    const want = {};
    S.players.forEach((p) => {
      const pl = S.plans[p.i];
      if (!pl || pl.type !== "move") return;
      const to = pl.to;
      if (to == null) return;
      (want[to] = want[to] || []).push(p);
    });
    Object.keys(want).forEach((k) => {
      const list = want[k];
      if (list.length > 1) {
        list.forEach((p) => logs.push({ p, ic: "🚧", t: "同じマスへ動こうとして<b>ぶつかった</b>（動けません）" }));
        return;
      }
      const p = list[0], pl = S.plans[p.i];
      if (pl.retreat) {
        /* 撤退：領地を失って逃げる。失うのは「コマからいちばん遠い領地」＝盤面から決まる（運なし） */
        const lost = farthestOwn(p, RETREAT_COST);
        lost.forEach((i) => { S.own[i] = -1; hit.push(i); });
        p.at = +k;
        logs.push({ p, ic: "🏳", t: `<b>撤退</b> — 領地を ${lost.length} つ失って、安全な場所へ逃げた`, cls: "lose" });
      } else {
        p.at = +k;
        logs.push({ p, ic: "🚶", t: "移動しました" });
      }
    });

    /* ── ② 領地獲得（同じ空きマスを取り合ったら、だれも取れない） ── */
    const claims = {};
    S.players.forEach((p) => {
      const pl = S.plans[p.i];
      if (!pl) return;
      let cells = null;
      if (pl.type === "claim" && before.own[pl.to] < 0) cells = [pl.to];
      else if (pl.type === "special" && pl.sp === "doubleclaim" && p.sp.doubleclaim > 0) { cells = (pl.list || []).slice(); p.sp.doubleclaim--; }
      else if (pl.type === "special" && pl.sp === "final:blitz" && p.final) { cells = (pl.list || []).slice(); p.final = false; }
      if (!cells) return;
      cells.forEach((i) => { if (i != null && before.own[i] < 0 && !S.rock[i]) (claims[i] = claims[i] || []).push(p); });
      if (pl.type === "special") {
        logs.push({ p, ic: pl.sp === "final:blitz" ? "⚡" : "🚩",
          t: pl.sp === "final:blitz" ? "<b>FINAL — 電撃併合</b>！" : "<b>DOUBLE CLAIM</b> — 2マスまとめて獲得" });
      }
    });
    Object.keys(claims).forEach((k) => {
      const list = claims[k];
      if (list.length > 1) {
        list.forEach((p) => logs.push({ p, ic: "🤝", t: "同じ空きマスを取り合って<b>だれも取れなかった</b>" }));
        return;
      }
      const p = list[0];
      S.own[+k] = p.i; gain.push(+k);
      if ((S.plans[p.i] || {}).type === "claim") logs.push({ p, ic: "🚩", t: "領地を<b>獲得</b>しました", cls: "win" });
    });

    /* ── ③ 攻撃（判定はすべて「攻撃前の盤面」で。同点なら守り勝ち） ── */
    const atks = {};
    S.players.forEach((p) => {
      const pl = S.plans[p.i];
      if (!pl || pl.type !== "claim") return;
      const t = pl.to;
      if (t == null || before.own[t] < 0 || before.own[t] === p.i) return;
      (atks[t] = atks[t] || []).push(p);
    });
    Object.keys(atks).forEach((k) => {
      const i = +k, def = before.own[i];
      const dp = S.players[def];
      const guard = S.players.some((q) => q.fort === i);
      /* 同じマスを複数人が攻めたら、いちばん攻撃力が高い人だけが通る（同点なら不成立） */
      const list = atks[k].map((p) => ({ p, a: power(before, p.i, i) })).sort((x, y) => y.a - x.a);
      const top = list[0];
      const tie = list.length > 1 && list[1].a === top.a;
      const d = power(before, def, i);
      hit.push(i);
      if (dp) dp.attacked = true;
      if (guard) {
        list.forEach((x) => logs.push({ p: x.p, ic: "🛡", t: `<b>${esc(dp.name)}</b> の FORTRESS にはね返された`, cls: "lose" }));
        return;
      }
      if (tie) {
        list.forEach((x) => logs.push({ p: x.p, ic: "⚔", t: "攻撃が重なり、<b>どちらも奪えなかった</b>" }));
        return;
      }
      if (top.a > d) {
        S.own[i] = top.p.i; gain.push(i);
        logs.push({ p: top.p, ic: "⚔", t: `<b>${esc(dp.name)}</b> の領地を奪った（攻 ${top.a} ＞ 防 ${d}）`, cls: "win" });
      } else {
        logs.push({ p: top.p, ic: "🛡", t: `<b>${esc(dp.name)}</b> に守られた（攻 ${top.a} ≦ 防 ${d}）`, cls: "lose" });
      }
      list.slice(1).forEach((x) => logs.push({ p: x.p, ic: "⚔", t: "同じマスを攻めたが、届かなかった" }));
    });

    /* ── ④ 残りの特殊行動・FINAL ── */
    S.players.forEach((p) => {
      const pl = S.plans[p.i];
      if (!pl || pl.type !== "special") return;
      const k = pl.sp;
      if (k === "breakthrough" && p.sp.breakthrough > 0 && pl.to != null && before.own[pl.to] >= 0 && before.own[pl.to] !== p.i) {
        p.sp.breakthrough--;
        const victim = S.players[before.own[pl.to]];
        if (victim) victim.attacked = true;
        S.own[pl.to] = p.i; gain.push(pl.to);
        logs.push({ p, ic: "⚔", t: `<b>BREAKTHROUGH</b> — ${esc(victim ? victim.name : "")} の領地を1つ突破して奪った`, cls: "win" });
      } else if (k === "sacrifice" && p.sp.sacrifice > 0 && pl.to != null && before.own[pl.to] >= 0 && before.own[pl.to] !== p.i) {
        p.sp.sacrifice--;
        const lost = farthestOwn(p, SACRIFICE_COST);
        lost.forEach((i) => { S.own[i] = -1; hit.push(i); });
        const victim = S.players[before.own[pl.to]];
        if (victim) victim.attacked = true;
        S.own[pl.to] = p.i; gain.push(pl.to);
        logs.push({ p, ic: "💥", t: `<b>SACRIFICE</b> — 領地を ${lost.length} つ捨てて、${esc(victim ? victim.name : "")} の重要領地を奪った`, cls: "win" });
      } else if (k === "final:seize" && p.final && pl.to != null && before.own[pl.to] >= 0 && before.own[pl.to] !== p.i) {
        p.final = false;
        const victim = S.players[before.own[pl.to]];
        if (victim) victim.attacked = true;
        S.own[pl.to] = p.i; gain.push(pl.to);
        logs.push({ p, ic: "👑", t: `<b>FINAL — 強奪</b>！ ${esc(victim ? victim.name : "")} の要衝を力ずくで奪った`, cls: "win" });
      } else if (k === "final:split" && p.final) {
        p.final = false;
        let n = 0;
        (pl.list || []).forEach((i) => {
          if (before.own[i] >= 0 && before.own[i] !== p.i) {
            const victim = S.players[before.own[i]];
            if (victim) victim.attacked = true;
            S.own[i] = -1; hit.push(i); n++;
          }
        });
        logs.push({ p, ic: "✂", t: `<b>FINAL — 分断</b>！ 敵の領地 ${n} つを中立にもどした`, cls: "win" });
      } else if (k === "final:scorch" && p.final) {
        p.final = false;
        const mineAll = [];
        for (let i = 0; i < N * N; i++) if (S.own[i] === p.i) mineAll.push(i);
        const cut = Math.floor(mineAll.length / 2);
        const lost = farthestOwn(p, cut);
        lost.forEach((i) => { S.own[i] = -1; hit.push(i); });
        p.extra += lost.length * 3;
        logs.push({ p, ic: "🔥", t: `<b>FINAL — 焦土</b>！ 領地 ${lost.length} つを焼き払って <b>+${lost.length * 3}</b> ポイント`, cls: "win" });
      }
    });

    /* 何もしなかった人 */
    S.players.forEach((p) => { if (!S.plans[p.i]) logs.push({ p, ic: "💤", t: "時間切れ — 何もしませんでした" }); });

    paintBoard({ gain, hit });
    paintTop(); paintRank(); fitBoard();
    playLog(logs);
  }

  /* コマからいちばん遠い自分の領地を n 個返す（＝盤面だけで決まる／運なし） */
  function farthestOwn(p, n) {
    const mine = [];
    for (let i = 0; i < N * N; i++) if (S.own[i] === p.i) mine.push(i);
    mine.sort((a, b) => manhattan(b, p.at) - manhattan(a, p.at) || b - a);
    /* コマが乗っているマスは残す（そこを失うと立つ場所がなくなる） */
    return mine.filter((i) => i !== p.at).slice(0, Math.max(0, n));
  }

  /* 実行フェーズの演出（1行ずつ出す。スキップできる） */
  function playLog(logs) {
    const box = $("gExec");
    box.classList.add("on");
    box.innerHTML = "";
    $("gPhase").textContent = "実行フェーズ";
    $("gMsg").textContent = "結果を処理しています";
    $("gChips").innerHTML = `<button class="pchip" style="--pc:#5c6b88" onclick="MDG.skipLog()"><span class="d"></span>スキップ</button>`;
    let k = 0;
    const step = () => {
      if (!S || S.phase !== "exec") return;
      if (k >= logs.length) { playLog._t = null; setTimeout(endTurn, 600); return; }
      const L = logs[k++];
      const row = document.createElement("div");
      row.className = "exrow " + (L.cls || "");
      row.innerHTML = `<span class="d" style="background:${L.p.c}"></span>
        <span>${L.ic} <b style="color:${L.p.c}">${esc(L.p.name)}</b> が ${L.t}</span>`;
      box.appendChild(row);
      box.scrollTop = box.scrollHeight;
      playLog._t = setTimeout(step, 620);
    };
    playLog._all = logs;
    step();
    if (!logs.length) setTimeout(endTurn, 500);
  }
  function skipLog() {
    if (playLog._t) { clearTimeout(playLog._t); playLog._t = null; }
    const box = $("gExec");
    box.innerHTML = (playLog._all || []).map((L) =>
      `<div class="exrow ${L.cls || ""}"><span class="d" style="background:${L.p.c}"></span>
        <span>${L.ic} <b style="color:${L.p.c}">${esc(L.p.name)}</b> が ${L.t}</span></div>`).join("");
    setTimeout(endTurn, 400);
  }

  function endTurn() {
    if (!S || S.phase !== "exec") return;
    S.players.forEach((p) => { p.fort = -1; });
    if (S.turn >= S.maxTurn) return finishGame();
    S.turn++;
    beginPlan();
    if (S.maxTurn - S.turn === FINAL_FROM_LEFT - 1) {
      toast("🏁 <b>FINAL STRATEGY</b> が使えるようになりました（1人1回）", 3200);
    }
  }

  /* ══════════ 終了・スコア ══════════ */
  function finishGame() {
    stopTimer();
    S.phase = "end";
    const rows = S.players.map((p) => ({ p, s: scoreOf(S, p) }))
      .sort((a, b) => b.s.total - a.s.total || b.s.base - a.s.base || a.p.i - b.p.i);
    saveRecord(rows);
    const g = GOALS.find((x) => x.k === S.goal);
    const w = rows[0];
    $("dlgCard").innerHTML = `
      <h3>🏁 ゲーム終了</h3>
      <div class="winbig">
        <div class="cr">👑</div>
        <div class="nm" style="color:${w.p.c}">${esc(w.p.name)}</div>
        <div class="pt">${w.s.total} ポイント（領地 ${w.s.base}・連結 +${w.s.chain}・目標 +${w.s.goal}${w.s.extra ? "・その他 +" + w.s.extra : ""}）</div>
      </div>
      <table class="scoretbl">
        <tr><th>順位</th><th style="text-align:left">プレイヤー</th><th class="r">領地</th><th class="r">連結</th><th class="r">目標</th><th class="r">合計</th></tr>
        ${rows.map((r, k) => `<tr class="${k === 0 ? "top" : ""}">
          <td>${k + 1}</td>
          <td><span class="d" style="background:${r.p.c}"></span>${esc(r.p.name)}</td>
          <td class="r">${r.s.base}</td><td class="r">+${r.s.chain}</td>
          <td class="r">${r.s.goal ? "+" + r.s.goal : "—"}</td>
          <td class="r"><b>${r.s.total}</b></td></tr>`).join("")}
      </table>
      <p class="hintline">公開目標：<b>${g ? esc(g.nm) : ""}</b>（+${g ? g.pt : 0}）</p>
      <div class="row">
        <button class="mbtn" onclick="MDG.closeDlg();MDG.goTitle()">タイトルへ</button>
        <button class="mbtn pri" onclick="MDG.closeDlg();MDG.goLobby()">もう1回あそぶ</button>
      </div>`;
    $("ovDlg").classList.add("on");
  }

  /* ══════════ 記録（この端末に残す） ══════════ */
  const REC_KEY = "mdg_records_v1";
  function saveRecord(rows) {
    try {
      const all = JSON.parse(localStorage.getItem(REC_KEY) || "[]");
      all.unshift({
        at: new Date().toLocaleDateString("sv-SE"),
        n: rows.length, turns: S.maxTurn, goal: S.goal,
        rank: rows.slice(0, 3).map((r) => ({ nm: r.p.name, pt: r.s.total })),
      });
      localStorage.setItem(REC_KEY, JSON.stringify(all.slice(0, 30)));
    } catch (e) {}
  }
  function openRecords() {
    let all = [];
    try { all = JSON.parse(localStorage.getItem(REC_KEY) || "[]"); } catch (e) {}
    $("dlgCard").innerHTML = `
      <h3>🏆 これまでの記録</h3>
      <p class="sub">この端末で遊んだぶんだけを残しています（最大30件）。</p>
      ${all.length ? `<table class="scoretbl">
        <tr><th style="text-align:left">日付</th><th style="text-align:left">1位</th><th class="r">点</th><th class="r">人数</th></tr>
        ${all.map((r) => `<tr><td>${esc(r.at)}</td><td>${esc((r.rank[0] || {}).nm || "")}</td>
          <td class="r">${(r.rank[0] || {}).pt || 0}</td><td class="r">${r.n}人</td></tr>`).join("")}
      </table>` : '<p class="hintline">まだ記録がありません。</p>'}
      <div class="row"><button class="mbtn pri" onclick="MDG.closeDlg()">とじる</button></div>`;
    $("ovDlg").classList.add("on");
  }

  /* ══════════ あそびかた ══════════ */
  function openRules() {
    const g = GOALS.find((x) => x.k === (S ? S.goal : cfg.goal));
    $("dlgCard").innerHTML = `
      <h3>📖 あそびかた</h3>
      <div class="rules">
        <h4>ゲームの目的</h4>
        <p>領地を広げ、つなげ、ときには奪って、<b>いちばん多くのポイント</b>を取った人が勝ちです。
          サイコロもランダムイベントもありません。<b>盤面を読んだ人が勝ちます。</b></p>
        <h4>1ターンの流れ</h4>
        <ul>
          <li><b>計画フェーズ</b> … 自分の名前を押して行動をえらぶ（他の人には見えません）</li>
          <li><b>実行フェーズ</b> … 全員ぶんを同時に処理して、結果を見せます</li>
        </ul>
        <h4>3つの行動</h4>
        <ul>
          <li>🚶 <b>移動</b> … 上下左右に1マス。ななめ・敵の領地・障害物には行けません</li>
          <li>🚩 <b>領地</b> … となりの<b>空きマスを取る</b>／となりの<b>敵の領地を攻める</b></li>
          <li>✨ <b>特殊行動</b> … 回数がかぎられた強い手。<b>いつ使うか</b>が勝負どころ</li>
        </ul>
        <h4>攻撃の勝ち負け（運なし）</h4>
        <p>攻撃力＝そのマスに<b>となり合う自分の領地の数</b>（自分のコマがとなりなら＋1）。<br>
          防御力＝同じ数え方を、持ち主で。<br>
          <b>攻撃力が防御力より大きいときだけ奪えます</b>（同点なら守り勝ち）。<br>
          だから「どこに領地を作るか」が、そのまま強さになります。</p>
        <h4>同時に同じマスをねらったら</h4>
        <ul>
          <li>空きマスの取り合い → <b>だれも取れません</b></li>
          <li>同じマスへの移動 → <b>だれも動きません</b></li>
          <li>同じマスへの攻撃 → <b>攻撃力がいちばん高い人だけ</b>（同点なら不成立）</li>
        </ul>
        <h4>ポイント</h4>
        <ul>
          <li>領地 1マス ＝ <b>1点</b></li>
          ${CHAIN_BONUS.slice().reverse().map((b) => `<li>つながった領地 <b>${b.n}マス</b>以上のかたまり ＝ <b>+${b.pt}点</b></li>`).join("")}
          <li>公開目標の達成 ＝ その目標のポイント</li>
        </ul>
        <h4>撤退</h4>
        <p>前のターンに攻められた人は、移動のかわりに<b>撤退</b>できます。
          領地を ${RETREAT_COST} つ失うかわりに、コマを ${RETREAT_STEPS} マスぶん動かして逃げられます。</p>
        <h4>特殊行動</h4>
        <ul>${SPECIALS.map((s) => `<li>${s.ic} <b>${s.nm}</b>（${SPECIAL_MAX[s.k]}回）… ${s.d}</li>`).join("")}</ul>
        <h4>FINAL STRATEGY（1回だけの切り札）</h4>
        <p>のこり <b>${FINAL_FROM_LEFT}</b> ターンになると、1人1回だけ使えます。
          最下位でも、盤面を正しく読めば逆転できます。</p>
        <ul>${FINALS.map((f) => `<li>${f.ic} <b>${f.nm}</b> … ${f.d}</li>`).join("")}</ul>
        ${g ? `<h4>いまの公開目標</h4><p>⭐ <b>${esc(g.nm)}</b>（+${g.pt}）… ${g.desc}</p>` : ""}
      </div>
      <div class="row"><button class="mbtn pri" onclick="MDG.closeDlg()">とじる</button></div>`;
    $("ovDlg").classList.add("on");
  }
  function closeDlg() { $("ovDlg").classList.remove("on"); }

  function quit() {
    $("dlgCard").innerHTML = `
      <h3>ゲームをやめますか？</h3>
      <p class="sub">とちゅうの盤面は残りません。</p>
      <div class="row">
        <button class="mbtn" onclick="MDG.closeDlg()">つづける</button>
        <button class="mbtn dan" onclick="MDG.closeDlg();MDG.goTitle()">やめる</button>
      </div>`;
    $("ovDlg").classList.add("on");
  }

  /* ══════════ 公開 ══════════ */
  window.MDG = {
    goTitle, goLobby, startGame, addP, removeP, rename, setCfg,
    openPlan, closePlan, setType, setDir, toggleRetreat, setSp, setTo, decide,
    skipLog, openRules, openRecords, closeDlg, quit,
  };

  /* 起動 */
  document.addEventListener("DOMContentLoaded", () => { show("scr-title"); });
  if (document.readyState !== "loading") show("scr-title");
})();
