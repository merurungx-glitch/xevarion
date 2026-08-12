/* ============================================================
   チェインパーティ CHAIN PARTY
   iPadを2〜6人で囲む連鎖バクハツの陣取り頭脳戦（CPU対戦対応）
   ============================================================ */

const $  = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const COLORS = ["#ff4d6d", "#2e8bff", "#13c08a", "#ffab17", "#9b5bff", "#ff7a00"];
const NAMES  = ["あか", "あお", "みどり", "きいろ", "むらさき", "だいだい"];
const FACES  = ["🔴", "🔵", "🟢", "🟡", "🟣", "🟠"];

// 人数ごとの「席（盤のどの辺に座るか）」
const SEATS = {
  2: ["bottom", "top"],
  3: ["bottom", "left", "right"],
  4: ["bottom", "right", "top", "left"],
  5: ["bottomL", "right", "top", "left", "bottomR"],
  6: ["bottomL", "bottomR", "right", "topR", "topL", "left"],
};

let S = {};
let setup = { n: 3, size: 8, players: [], cpuLevel: 1, roundLimit: 0 };
let muted = false;
let ONLINE = null; // オンライン対戦中は { roomPlayers, mySlot, isHost, entered, ... } を保持
const SAVE_KEY = "chainparty_save_v1";
const SETUP_KEY = "chainparty_setup_v1";   // 名前・紐づけ・人数などの前回設定（クラウド同期対象）

/* ============================================================
   前回の設定（名前・紐づけ・人数など）の保存と引き継ぎ
   ・紐づけは「引き継ぎ候補」として復元し、必ず4桁パスワードの再入力で確認する
     （link.confirmed=true になるまで賞金の対象にはならない）
   ============================================================ */
function saveSetup() {
  try {
    localStorage.setItem(SETUP_KEY, JSON.stringify({
      v: 1, n: setup.n, size: setup.size, cpuLevel: setup.cpuLevel, roundLimit: setup.roundLimit,
      players: setup.players.map((p) => ({
        name: p.name, type: p.type,
        link: (p.link && p.link.uid) ? { uid: p.link.uid, name: p.link.name, charFile: p.link.charFile || "" } : null,
      })),
    }));
  } catch (e) {}
}
function loadSetup() {
  try {
    const d = JSON.parse(localStorage.getItem(SETUP_KEY) || "null");
    if (!d || !Array.isArray(d.players)) return false;
    setup.n = [2, 3, 4, 5, 6].includes(d.n) ? d.n : setup.n;
    setup.size = [6, 8, 10].includes(d.size) ? d.size : setup.size;
    setup.cpuLevel = [0, 1, 2].includes(d.cpuLevel) ? d.cpuLevel : setup.cpuLevel;
    setup.roundLimit = [0, 10, 15, 20].includes(d.roundLimit) ? d.roundLimit : setup.roundLimit;
    d.players.slice(0, NAMES.length).forEach((sp, i) => {
      if (!setup.players[i]) return;
      if (sp.name) setup.players[i].name = String(sp.name).slice(0, 6);
      if (sp.type === "cpu" || sp.type === "human") setup.players[i].type = sp.type;
      /* ★ 紐づけは「未確認」で復元 → タップして4桁パスワードを入力すると有効になる */
      if (sp.link && sp.link.uid) setup.players[i].link = { uid: sp.link.uid, name: sp.link.name, charFile: sp.link.charFile || "", confirmed: false };
    });
    return true;
  } catch (e) { return false; }
}
/* セグメントUIを setup の値に合わせる（前回設定の復元用） */
function applySetupToUI() {
  $$("#player-seg button").forEach((b) => b.classList.toggle("on", +b.dataset.n === setup.n));
  $$("#size-seg button").forEach((b) => b.classList.toggle("on", +b.dataset.s === setup.size));
  $$("#cpu-seg button").forEach((b) => b.classList.toggle("on", +b.dataset.l === setup.cpuLevel));
  $$("#round-seg button").forEach((b) => b.classList.toggle("on", +b.dataset.r === setup.roundLimit));
}

/* ============================================================
   ダブルタップ拡大の無効化（iPad）
   ============================================================ */
function preventZoom() {
  let last = 0;
  document.addEventListener("touchend", (e) => {
    const now = Date.now();
    if (now - last <= 320) e.preventDefault();
    last = now;
  }, { passive: false });
  ["gesturestart", "gesturechange", "gestureend"].forEach((ev) =>
    document.addEventListener(ev, (e) => e.preventDefault()));
  document.addEventListener("dblclick", (e) => e.preventDefault());
}

/* ============================================================
   セットアップ画面
   ============================================================ */
function initSetup() {
  // デフォルトのプレイヤー設定 → 前回の設定（名前・紐づけ・人数など）があれば引き継ぐ
  setup.players = NAMES.map((nm, i) => ({ name: nm, type: i === 0 ? "human" : "human" }));
  const restored = loadSetup();
  applySetupToUI();
  renderPlayers();
  if (restored && setup.players.some((p) => p.link && p.link.uid && !p.link.confirmed)) {
    setTimeout(() => toast("🔗 前回の紐づけを引き継ぎました。ボタンをタップしてパスワードを確認してください", "#8b5bff"), 900);
  }

  $("#player-seg").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    $$("#player-seg button").forEach((x) => x.classList.remove("on"));
    b.classList.add("on");
    setup.n = +b.dataset.n;
    renderPlayers(); saveSetup();
  });
  $("#size-seg").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    $$("#size-seg button").forEach((x) => x.classList.remove("on"));
    b.classList.add("on");
    setup.size = +b.dataset.s;
    saveSetup();
  });
  $("#cpu-seg").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    $$("#cpu-seg button").forEach((x) => x.classList.remove("on"));
    b.classList.add("on");
    setup.cpuLevel = +b.dataset.l;
    saveSetup();
  });
  $("#round-seg").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    $$("#round-seg button").forEach((x) => x.classList.remove("on"));
    b.classList.add("on");
    setup.roundLimit = +b.dataset.r;
    saveSetup();
  });
  $("#resume-btn").addEventListener("click", resumeGame);

  $("#players-list").addEventListener("click", (e) => {
    const lk = e.target.closest(".gl-link-btn");
    if (lk) { openSeatLink(+lk.closest(".prow").dataset.i); return; }
    const b = e.target.closest(".type-seg button"); if (!b) return;
    const i = +b.closest(".prow").dataset.i;
    setup.players[i].type = b.dataset.t;
    renderPlayers(); saveSetup();
  });
  $("#players-list").addEventListener("input", (e) => {
    if (e.target.matches(".pname-in")) {
      const i = +e.target.closest(".prow").dataset.i;
      setup.players[i].name = e.target.value;
      saveSetup();
    }
  });

  $("#start").addEventListener("click", beginOrder);
  $("#show-rules").addEventListener("click", openRules);
  $("#tut-x").addEventListener("click", () => toggleModal("#rules", false));
  $("#tut-prev").addEventListener("click", () => gotoStep(tutIndex - 1));
  $("#tut-next").addEventListener("click", () => { if (tutIndex >= STEPS.length - 1) toggleModal("#rules", false); else gotoStep(tutIndex + 1); });
  $("#tut-replay").addEventListener("click", () => gotoStep(tutIndex));
  $("#order-go").addEventListener("click", enterGame);
  $("#order-redo").addEventListener("click", () => beginOrder());
  $("#play-again").addEventListener("click", () => { toggleModal("#win", false); if (ONLINE) return leaveOnlineToSetup(); beginOrder(); });
  $("#back-setup").addEventListener("click", () => { toggleModal("#win", false); if (ONLINE) return leaveOnlineToSetup(); showScreen("#setup"); });
  $("#menu-btn").addEventListener("click", openMenu);
  $("#undo-btn").addEventListener("click", undoMove);
  buildMenu();
  refreshResume();
  initOnline();
  initOfflinePwa();
}

/* ============================================================
   オフライン対応（PWA）
   ・オフライン中：ローカル対戦はそのまま遊べる／オンライン対戦・紐づけは不可
   ・オンライン復帰：クラウドへ自動同期（xeva-cloud.js の flushPush）
   ============================================================ */
function updateOnlineAvail() {
  const off = navigator.onLine === false;
  const btn = $("#open-online");
  if (btn) {
    btn.classList.toggle("offline", off);
    const tx = btn.querySelector(".ob-tx");
    if (tx) tx.innerHTML = off
      ? "<b>オンライン対戦 — オフライン中は利用できません</b><small>オンラインに戻ると自動で使えるようになります</small>"
      : "<b>オンラインで対戦</b><small>部屋番号でつながる・XEVA賞金つき</small>";
  }
}
function initOfflinePwa() {
  updateOnlineAvail();
  window.addEventListener("offline", () => {
    updateOnlineAvail();
    toast("📴 オフラインになりました — ローカル対戦はこのまま遊べます", "#ff8c42");
  });
  window.addEventListener("online", () => {
    updateOnlineAvail();
    toast("📡 オンラインに復帰 — データをクラウドと同期します", "#13c08a");
    /* オフライン中に進んだセーブ・設定をクラウドへ反映 */
    try { if (window.XevaCloud && XevaCloud.flushPush) XevaCloud.flushPush(); } catch (e) {}
  });
  /* PWA インストール（オフラインでも遊べるようにダウンロード） */
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); window._mcpInstall = e;
    const b = $("#mcp-install"); if (b) b.classList.remove("hidden");
  });
  const ib = $("#mcp-install");
  if (ib) {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    if (standalone) ib.classList.add("hidden");
    else if (/iPad|iPhone|iPod/.test(navigator.userAgent)) ib.classList.remove("hidden");
    ib.addEventListener("click", () => {
      if (window._mcpInstall) {
        window._mcpInstall.prompt();
        window._mcpInstall.userChoice.finally(() => { window._mcpInstall = null; ib.classList.add("hidden"); });
        return;
      }
      alert("このブラウザでは次の手順でインストールできます：\n\n【iPad / iPhone（Safari）】\n① 共有ボタン（□↑）をタップ\n②「ホーム画面に追加」を選ぶ\n\n【PC（Chrome / Edge）】\nアドレスバー右端のインストールアイコンをクリック\n\nインストール後はオフラインでもローカル対戦が遊べます（オンライン対戦はオンライン時のみ）。オンラインに戻るとデータは自動でクラウドに同期されます。");
    });
  }
}

/* ============================================================
   一手もどす（置き間違えたとき、直前の人間の手を取り消す）
   ============================================================ */
function pushHistory() {
  if (!S) return;
  if (!S.history) S.history = [];
  S.history.push(serializeState());
  if (S.history.length > 30) S.history.shift();  // メモリ節約
  updateUndoBtn();
}
function updateUndoBtn() {
  const b = $("#undo-btn"); if (!b) return;
  const can = !!(S && !S.busy && !S.over && S.history && S.history.length);
  b.disabled = !can;
  b.classList.toggle("disabled", !can);
}
function undoMove() {
  if (!S || S.busy || S.over) return;
  if (!S.history || !S.history.length) { toast("もう戻せる手がありません", "#8892a6"); return; }
  const d = S.history.pop();
  // 盤面と手番を巻き戻す（プレイヤーの色/名前などは維持し、可変フィールドのみ復元）
  S.board = d.board.map((row) => row.map((c) => ({ owner: c.owner, count: c.count })));
  S.orderPos = d.orderPos; S.turn = d.turn;
  S.deaths = d.deaths || 0; S.round = d.round || 1; S.moves = d.moves || 0;
  S.players.forEach((p) => {
    const sp = d.players.find((x) => x.id === p.id);
    if (sp) { p.started = sp.started; p.dead = sp.dead; p.deadAt = sp.deadAt || 0; }
  });
  S.busy = false; S.over = false;
  paintAll(); updatePanels(); setBoardFrame(); updateRoundInfo();
  saveGame(); updateUndoBtn();
  toast("↩ 一手もどしました", "#2e8bff");
}

function renderPlayers() {
  const list = $("#players-list");
  list.innerHTML = "";
  for (let i = 0; i < setup.n; i++) {
    const p = setup.players[i];
    const row = document.createElement("div");
    row.className = "prow";
    row.dataset.i = i;
    row.style.setProperty("--c", COLORS[i]);
    const linked = p.link && p.link.uid;
    const confirmed = linked && p.link.confirmed !== false;
    const linkBtn = !linked
      ? '<button class="gl-link-btn" title="XEVARIONアカウントを紐づけて賞金を受け取る">🔗</button>'
      : confirmed
        ? `<button class="gl-link-btn on" title="タップで紐づけを解除">✓ ${escapeHtml(p.link.name)}</button>`
        : `<button class="gl-link-btn pending" title="前回の紐づけ — タップして4桁パスワードで確認">🔒 ${escapeHtml(p.link.name)}（要確認）</button>`;
    row.innerHTML = `
      <span class="pdot"></span>
      <input class="pname-in" maxlength="6" value="${escapeHtml(p.name)}" />
      <div class="type-seg">
        <button data-t="human" class="${p.type === "human" ? "on" : ""}">人</button>
        <button data-t="cpu" class="${p.type === "cpu" ? "on" : ""}">CPU</button>
      </div>
      ${p.type === "human" ? linkBtn : ""}`;
    list.appendChild(row);
  }
}
function openSeatLink(idx) {
  if (!window.GameLink) { toast("紐づけ機能を準備中です…", "#8892a6"); return; }
  const p = setup.players[idx];
  if (navigator.onLine === false) { toast("オフライン中は紐づけできません（オンラインで可能になります）", "#ff8c42"); return; }
  /* 前回から引き継いだ紐づけ → 検索をとばして4桁パスワードの確認だけ行う */
  if (p.link && p.link.uid && p.link.confirmed === false) {
    GameLink.confirm(p.link).then((res) => {
      if (res && res.remove) { p.link = null; renderPlayers(); saveSetup(); toast("紐づけを解除しました", "#8892a6"); return; }
      if (res && res.uid) {
        p.link = { uid: res.uid, name: res.name, charFile: res.charFile || "", confirmed: true };
        renderPlayers(); saveSetup();
        toast("🔗 " + res.name + " の紐づけを確認しました", "#13c08a");
      }
    });
    return;
  }
  if (p.link && p.link.uid) { p.link = null; renderPlayers(); saveSetup(); toast("紐づけを解除しました", "#8892a6"); return; }
  GameLink.link(p.name).then((res) => {
    if (res && res.uid) {
      setup.players[idx].link = { uid: res.uid, name: res.name, charFile: res.charFile || "", confirmed: true };
      renderPlayers(); saveSetup();
      toast("🔗 " + res.name + " を紐づけました", "#13c08a");
    }
  });
}

function showScreen(id) { $$(".screen").forEach((s) => s.classList.remove("active")); $(id).classList.add("active"); if (id === "#setup") refreshResume(); }
function toggleModal(id, show) { $(id).classList.toggle("hidden", !show); }

/* つづきからボタンの表示更新 */
function refreshResume() {
  const btn = $("#resume-btn"); if (!btn) return;
  const d = loadSave();
  if (d) { btn.classList.remove("hidden"); btn.textContent = `▶ つづきから（${d.n}人・R${d.round || 1}${d.roundLimit ? "/" + d.roundLimit : ""}）`; }
  else btn.classList.add("hidden");
}

/* ============================================================
   順番きめ（コイントス／抽選）
   ============================================================ */
function beginOrder() {
  // 状態を作る（席は固定、順番はこれから抽選）
  const n = setup.n, size = setup.size;
  const board = [];
  for (let r = 0; r < size; r++) { const row = []; for (let c = 0; c < size; c++) row.push({ owner: null, count: 0 }); board.push(row); }
  const players = [];
  let unconfirmed = 0;
  for (let i = 0; i < n; i++) {
    const lk = setup.players[i].link;
    /* ★ 賞金の対象になる紐づけは「パスワード確認済み」のものだけ（前回引き継ぎの未確認は無効） */
    const ok = lk && lk.uid && lk.confirmed !== false;
    if (lk && lk.uid && !ok) unconfirmed++;
    players.push({
      id: i, color: COLORS[i], face: FACES[i], seat: SEATS[n][i],
      name: (setup.players[i].name || NAMES[i]).trim() || NAMES[i],
      type: setup.players[i].type, started: false, dead: false,
      xvUid: ok ? lk.uid : null,
      xvName: ok ? lk.name : null,
    });
  }
  if (unconfirmed) toast(`🔒 パスワード未確認の紐づけ ${unconfirmed} 件は今回は無効です（設定画面で確認できます）`, "#ff8c42");
  saveSetup();
  S = { board, players, size, n, order: [], orderPos: 0, turn: 0, busy: false, over: false, moves: 0, deaths: 0,
        round: 1, roundLimit: setup.roundLimit || 0, cpuLevel: (setup.cpuLevel == null ? 1 : setup.cpuLevel), history: [] };

  showScreen("#order");
  $("#order-actions").classList.add("hidden");
  $("#order-result").innerHTML = "";
  $("#order-title").textContent = (n === 2 ? "コイントス中…" : "順番を抽選中…");
  $("#order-dice").textContent = (n === 2 ? "🪙" : "🎲");
  $("#order-dice").classList.add("spin");

  setTimeout(revealOrder, 1300);
}

function revealOrder() {
  if (ONLINE) return; // オンラインの順番はホストの抽選結果を使う（showOnlineOrder が演出）
  if (!$("#order").classList.contains("active")) return; // ゲーム開始後の保留タイマーで順番を壊さない
  const order = [...Array(S.n).keys()];
  for (let i = order.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0;[order[i], order[j]] = [order[j], order[i]]; }
  S.order = order;

  $("#order-dice").classList.remove("spin");
  $("#order-title").textContent = "順番が決まりました！";
  const res = $("#order-result");
  res.innerHTML = "";
  order.forEach((pid, rank) => {
    const p = S.players[pid];
    const item = document.createElement("div");
    item.className = "order-item";
    item.style.setProperty("--c", p.color);
    item.style.animationDelay = (rank * 0.12) + "s";
    item.innerHTML = `
      <span class="rank">${rank + 1}</span>
      <span class="pdot"></span>
      <span class="nm">${escapeHtml(p.name)}</span>
      ${p.type === "cpu" ? '<span class="tag-cpu">CPU</span>' : ""}`;
    res.appendChild(item);
  });
  setTimeout(() => $("#order-actions").classList.remove("hidden"), order.length * 120 + 250);
}

/* ============================================================
   ゲーム開始
   ============================================================ */
function enterGame() {
  // XEVA ミッション「MagiChainParty でゲームにチャレンジしよう」(+150 XEVA)
  try {
    if (window.XEVA) {
      var rw = window.XEVA.completeMission("magichainparty_play");
      if (rw > 0) toast("🎉 ミッション達成！ +" + rw + " XEVA を獲得（XEVARION）", "#f0c040");
    }
  } catch (e) {}
  showScreen("#game");
  buildBoardSkeleton();
  buildPanels();
  paintAll();
  S.orderPos = 0; S.turn = S.order[0];
  S.over = false; S.round = 1; S.history = [];
  updatePanels();
  setBoardFrame();
  updateRoundInfo();
  updateUndoBtn();
  saveGame();
  toast(S.roundLimit ? `🎯 ${S.roundLimit}ラウンドで領土の多い人が勝ち！` : "🎯 相手の色を全部消したら勝ち！", "#ff7a59");
  maybeCpu();
}

function updateRoundInfo() {
  const el = $("#round-info"); if (!el) return;
  if (S.roundLimit > 0) { el.classList.remove("hidden"); el.textContent = `R ${S.round} / ${S.roundLimit}`; }
  else el.classList.add("hidden");
}

function buildBoardSkeleton() {
  const b = $("#board");
  b.classList.toggle("sides", S.n >= 3); // 横に席がある時だけ横幅を多く確保
  b.style.gridTemplateColumns = `repeat(${S.size},1fr)`;
  b.style.gridTemplateRows = `repeat(${S.size},1fr)`;
  b.innerHTML = "";
  S.cellEls = [];
  for (let r = 0; r < S.size; r++) {
    const row = [];
    for (let c = 0; c < S.size; c++) {
      const el = document.createElement("div");
      el.className = "cell";
      el.addEventListener("click", () => onTap(r, c));
      b.appendChild(el);
      row.push(el);
    }
    S.cellEls.push(row);
  }
}

function buildPanels() {
  const bar = $("#player-bar");
  if (bar) bar.innerHTML = "";
  /* ★ さいころで決まった手番の順（S.order）どおりに上部の名前を並べる */
  const seq = (S.order && S.order.length === S.n)
    ? S.order.map((pid) => S.players[pid]).filter(Boolean)
    : S.players;
  seq.forEach((p) => {
    const el = document.createElement("div");
    el.className = "pside";
    el.dataset.pid = p.id;
    el.style.setProperty("--c", p.color);
    el.innerHTML = `
      <span class="pdot"></span>
      <span class="pname">${escapeHtml(p.name)}</span>
      <span class="pbadge">${p.type === "cpu" ? "🤖" : ""}</span>
      <span class="pscore">0</span>
      <span class="pturn"></span>`;
    if (bar) bar.appendChild(el);
    p.el = el;
  });
}

/* ============================================================
   盤面ユーティリティ（size を引数化してデモ/AIでも使う）
   ============================================================ */
function neighborsN(r, c, size) {
  const a = [];
  if (r > 0) a.push([r - 1, c]);
  if (r < size - 1) a.push([r + 1, c]);
  if (c > 0) a.push([r, c - 1]);
  if (c < size - 1) a.push([r, c + 1]);
  return a;
}
function critN(r, c, size) { return neighborsN(r, c, size).length; }
const neighbors = (r, c) => neighborsN(r, c, S.size);
const critical  = (r, c) => critN(r, c, S.size);
function cur() { return S.players[S.turn]; }

function ownedCount(b, size, pid) { let n = 0; for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (b[r][c].owner === pid) n++; return n; }
function gemCountB(b, size, pid) { let n = 0; for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (b[r][c].owner === pid) n += b[r][c].count; return n; }
function gemCount(pid) { return gemCountB(S.board, S.size, pid); }
function activeOwnersB(b, size) {
  const set = new Set();
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (b[r][c].owner !== null && b[r][c].count > 0) set.add(b[r][c].owner);
  return set;
}

/* ============================================================
   描画
   ============================================================ */
function paintCell(r, c) {
  const el = S.cellEls[r][c];
  const cell = S.board[r][c];
  el.className = "cell";
  el.style.removeProperty("--c");
  if (cell.owner === null || cell.count === 0) {
    el.style.background = "var(--cell)";
    el.innerHTML = "";
    return;
  }
  const color = S.players[cell.owner].color;
  el.style.setProperty("--c", color);
  el.style.background = `color-mix(in srgb, ${color} 22%, #fff)`;
  if (cell.count === critical(r, c) - 1) el.classList.add("ready");
  el.innerHTML = gemsHtml(cell.count, color);
}
function gemsHtml(count, color) {
  const k = Math.min(count, 4);
  let g = `<div class="gems n${k}">`;
  for (let i = 0; i < k; i++) g += `<div class="gem" style="--c:${color}"></div>`;
  return g + "</div>";
}
function paintAll() { for (let r = 0; r < S.size; r++) for (let c = 0; c < S.size; c++) paintCell(r, c); }

function updatePanels() {
  S.players.forEach((p) => {
    if (!p.el) return;
    p.el.classList.toggle("active", S.turn === p.id && !S.over);
    p.el.classList.toggle("dead", p.dead);
    p.el.querySelector(".pscore").textContent = gemCount(p.id);
    p.el.querySelector(".pturn").textContent = p.dead ? "💀 脱落" : ((S.turn === p.id && !S.over) ? "▶ 番" : "");
  });
}
function setBoardFrame() {
  const color = S.over ? "transparent" : cur().color;
  $("#board").style.borderColor = color;
  $("#board").style.boxShadow = S.over ? "0 10px 30px rgba(70,90,160,.16)" : `0 0 24px ${color}55, 0 10px 30px rgba(70,90,160,.16)`;
}

/* ============================================================
   入力 → 配置 → 連鎖
   ============================================================ */
function onTap(r, c) {
  if (S.busy || S.over) return;
  if (ONLINE && !isMyOnlineTurn()) { toast("いまは相手の番です", "#8892a6"); return; }
  const cell = S.board[r][c];
  if (cell.owner != null && cell.owner !== S.turn) {
    S.cellEls[r][c].classList.add("invalid");
    setTimeout(() => S.cellEls[r][c].classList.remove("invalid"), 300);
    return;
  }
  if (!ONLINE && cur().type !== "cpu") pushHistory();   // 人間の手だけ記録（間違えたら「一手もどす」で戻せる。オンラインでは無効）
  cell.owner = S.turn; cell.count += 1;
  cur().started = true; S.moves++;
  blip(540, 0.05, "triangle");
  paintCell(r, c);
  resolve();
}

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

async function resolve() {
  S.busy = true;
  updateUndoBtn();
  // 連鎖中に「色が消えた（マス0になった）順番」を記録（早く消えた人ほど先に脱落＝下位）
  S.chainDeathSeq = [];
  const deathSeen = new Set();
  const recordDeaths = () => {
    S.players.forEach((p) => {
      if (p.started && !p.dead && !deathSeen.has(p.id) && ownedCount(S.board, S.size, p.id) === 0) {
        deathSeen.add(p.id); S.chainDeathSeq.push(p.id);
      }
    });
  };
  let guard = 0;
  while (true) {
    const unstable = [];
    for (let r = 0; r < S.size; r++) for (let c = 0; c < S.size; c++)
      if (S.board[r][c].count >= critical(r, c) && S.board[r][c].count > 0) unstable.push([r, c]);
    if (!unstable.length) break;
    if (activeOwnersB(S.board, S.size).size <= 1) break;

    unstable.forEach(([r, c]) => S.cellEls[r][c].classList.add("pop"));
    blip(170 - Math.min(unstable.length * 6, 90), 0.08, "sawtooth");
    await sleep(150);

    const delta = new Map(), touched = new Set();
    const add = (k, d) => delta.set(k, (delta.get(k) || 0) + d);
    for (const [r, c] of unstable) {
      const key = r * S.size + c;
      add(key, -critical(r, c)); touched.add(key);
      for (const [nr, nc] of neighbors(r, c)) { const k2 = nr * S.size + nc; add(k2, +1); touched.add(k2); }
    }
    delta.forEach((d, key) => { S.board[(key / S.size) | 0][key % S.size].count += d; });
    touched.forEach((key) => {
      const cell = S.board[(key / S.size) | 0][key % S.size];
      if (cell.count <= 0) { cell.count = 0; cell.owner = null; } else cell.owner = S.turn;
    });

    recordDeaths();   // このステップで色が消えた人を、消えた順に記録
    unstable.forEach(([r, c]) => S.cellEls[r][c].classList.remove("pop"));
    touched.forEach((key) => paintCell((key / S.size) | 0, key % S.size));
    updatePanels();
    await sleep(105);
    if (++guard > 600) break;
  }
  paintAll();
  S.busy = false;
  postMove();
}

/* ============================================================
   手番終了 / 勝敗
   ============================================================ */
function postMove() {
  const justDead = [];
  const kill = (p) => {
    if (p.started && !p.dead && ownedCount(S.board, S.size, p.id) === 0) { p.dead = true; p.deadAt = ++S.deaths; justDead.push(p); blip(120, 0.25, "sine"); }
  };
  // 連鎖中に色が消えた順（早い順）に脱落を確定 → 同じ連鎖でも消えた順で順位が付く
  (S.chainDeathSeq || []).forEach((pid) => { const p = S.players.find((x) => x.id === pid); if (p) kill(p); });
  S.players.forEach(kill);   // 取りこぼし（同時消滅など）はスロット順で
  S.chainDeathSeq = [];
  justDead.forEach((p, i) => setTimeout(() => toast(`${p.face} ${p.name} の色が消えた！脱落！`, p.color), 200 + i * 1300));

  const allStarted = S.players.every((p) => p.started);
  const alive = S.players.filter((p) => !p.dead);
  if (allStarted && alive.length === 1) return endGame(alive[0]);

  let wrapped = false;
  do { S.orderPos = (S.orderPos + 1) % S.n; if (S.orderPos === 0) wrapped = true; } while (S.players[S.order[S.orderPos]].dead);
  if (wrapped) {
    S.round++;
    if (S.roundLimit > 0 && S.round > S.roundLimit) return endByTerritory();
  }
  S.turn = S.order[S.orderPos];

  updatePanels();
  setBoardFrame();
  updateRoundInfo();
  if (ONLINE) { afterMoveOnline(); }
  else { saveGame(); updateUndoBtn(); maybeCpu(); }
}

function endGame(winner) {
  if (ONLINE) return endOnline("last");
  S.over = true; clearSave();
  updatePanels(); setBoardFrame(); winChime();
  $("#win-emoji").textContent = winner.face;
  $("#win-title").textContent = `${winner.name} の勝ち！`;
  $("#win-title").style.color = winner.color;
  $("#win-sub").textContent = "ほかの色をすべて消しました 🎉 順位は『長く生き残った順』！";
  const stats = $("#win-stats"); stats.innerHTML = "";
  // 順位＝生き残り順。優勝者(未脱落)が1位、あとは脱落が遅いほど上位。
  const rankKey = (p) => p.dead ? p.deadAt : Infinity;
  const medal = ["🥇", "🥈", "🥉"];
  const ranked = [...S.players].sort((a, b) => rankKey(b) - rankKey(a));
  ranked.forEach((p, i) => {
    const row = document.createElement("div");
    row.className = "win-row"; row.style.setProperty("--c", p.color);
    const badge = medal[i] || (i + 1) + "位";
    const right = p.dead ? `${p.deadAt}番目に脱落` : `${gemCount(p.id)}個で制覇 🏆`;
    row.innerHTML = `<span class="pdot"></span><span class="nm">${badge} ${escapeHtml(p.name)}${i === 0 ? "（優勝）" : ""}${p.xvUid ? " 🔗" : ""}</span><span>${right}</span>`;
    stats.appendChild(row);
  });
  awardChainPrizes(ranked);
  setTimeout(() => toggleModal("#win", true), 750);
}

// 紐づけ済みプレイヤーへ順位賞金XEVAを配布（1位150/2位50、ポータルで受取）
function awardChainPrizes(ranked) {
  if (!S || S.chainRewarded) return; S.chainRewarded = true;
  const top = ranked.slice(0, 5).map((p) => ({ uid: p.xvUid || null, name: p.name, game: "MagiChainParty" }));
  if (!window.GameLink || !top.some((t) => t && t.uid)) return;
  GameLink.awardPrizes(top).then((list) => {
    if (list && list.length) list.forEach((r, i) => setTimeout(() => toast(`🏆 ${r.name} に賞金 ${r.amount} XEVA！（ポータルで受取）`, "#f0c040"), 1100 + i * 1200));
  });
}

/* ラウンド制限の打ち切り → 領土(マス数)の多い順で順位決定 */
function endByTerritory() {
  if (ONLINE) return endOnline("territory");
  S.over = true; clearSave();
  updatePanels(); setBoardFrame(); winChime();
  const terr = (p) => ownedCount(S.board, S.size, p.id);
  const ranked = [...S.players].sort((a, b) => (terr(b) - terr(a)) || (gemCount(b.id) - gemCount(a.id)));
  const win = ranked[0];
  $("#win-emoji").textContent = win.face;
  $("#win-title").textContent = `${win.name} の勝ち！`;
  $("#win-title").style.color = win.color;
  $("#win-sub").textContent = `${S.roundLimit}ラウンド終了！ 領土（マス数）の多い順で順位を決定`;
  const stats = $("#win-stats"); stats.innerHTML = "";
  const medal = ["🥇", "🥈", "🥉"];
  ranked.forEach((p, i) => {
    const row = document.createElement("div");
    row.className = "win-row"; row.style.setProperty("--c", p.color);
    const badge = medal[i] || (i + 1) + "位";
    row.innerHTML = `<span class="pdot"></span><span class="nm">${badge} ${escapeHtml(p.name)}${i === 0 ? "（優勝）" : ""}${p.dead ? "・脱落" : ""}${p.xvUid ? " 🔗" : ""}</span><span>${terr(p)} マス</span>`;
    stats.appendChild(row);
  });
  awardChainPrizes(ranked);
  setTimeout(() => toggleModal("#win", true), 750);
}

/* ============================================================
   途中保存 / 再開
   ============================================================ */
function serializeState() {
  return {
    v: 1, size: S.size, n: S.n, order: S.order.slice(), orderPos: S.orderPos, turn: S.turn,
    deaths: S.deaths, round: S.round, moves: S.moves, roundLimit: S.roundLimit, cpuLevel: S.cpuLevel,
    board: S.board.map((row) => row.map((c) => ({ owner: c.owner, count: c.count }))),
    players: S.players.map((p) => ({ id: p.id, color: p.color, face: p.face, seat: p.seat, name: p.name, type: p.type, started: p.started, dead: p.dead, deadAt: p.deadAt || 0 })),
  };
}
function saveGame() { if (!S || S.over) return; try { localStorage.setItem(SAVE_KEY, JSON.stringify(serializeState())); } catch (e) {} }
function loadSave() { try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} refreshResume(); }

function resumeGame() {
  const d = loadSave(); if (!d) { refreshResume(); return; }
  S = {
    board: d.board, size: d.size, n: d.n, order: d.order, orderPos: d.orderPos, turn: d.turn,
    busy: false, over: false, moves: d.moves || 0, deaths: d.deaths || 0, round: d.round || 1,
    roundLimit: d.roundLimit || 0, cpuLevel: (d.cpuLevel == null ? 1 : d.cpuLevel),
    players: d.players.map((p) => ({ ...p })), history: [],
  };
  // メニューの「やり直す」用に設定も合わせておく
  setup.n = d.n; setup.size = d.size; setup.cpuLevel = S.cpuLevel; setup.roundLimit = S.roundLimit;
  showScreen("#game");
  buildBoardSkeleton();
  buildPanels();
  paintAll();
  updatePanels();
  setBoardFrame();
  updateRoundInfo();
  updateUndoBtn();
  toast("▶ つづきから再開！", "#13c08a");
  maybeCpu();
}

/* ============================================================
   CPU（1手先＋連鎖シミュレーションで最善手）
   ============================================================ */
function maybeCpu() {
  if (S.over) return;
  if (cur().type === "cpu") { $("#thinking").classList.remove("hidden"); setTimeout(cpuMove, 620); }
  else $("#thinking").classList.add("hidden");
}
function cpuMove() {
  if (S.over || S.busy) return;
  const me = S.turn;
  if (cur().type !== "cpu") { $("#thinking").classList.add("hidden"); return; }
  const mv = bestMove(me);
  $("#thinking").classList.add("hidden");
  if (mv) onTap(mv.r, mv.c);
}
function cloneBoard(b) { return b.map((row) => row.map((c) => ({ owner: c.owner, count: c.count }))); }
function simResolve(b, size, player) {
  let guard = 0;
  while (true) {
    const unstable = [];
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++)
      if (b[r][c].count >= critN(r, c, size) && b[r][c].count > 0) unstable.push([r, c]);
    if (!unstable.length) break;
    if (activeOwnersB(b, size).size <= 1) break;
    const delta = new Map(), touched = new Set();
    const add = (k, d) => delta.set(k, (delta.get(k) || 0) + d);
    for (const [r, c] of unstable) {
      const key = r * size + c;
      add(key, -critN(r, c, size)); touched.add(key);
      for (const [nr, nc] of neighborsN(r, c, size)) { const k2 = nr * size + nc; add(k2, +1); touched.add(k2); }
    }
    delta.forEach((d, key) => { b[(key / size) | 0][key % size].count += d; });
    touched.forEach((key) => { const cell = b[(key / size) | 0][key % size]; if (cell.count <= 0) { cell.count = 0; cell.owner = null; } else cell.owner = player; });
    if (++guard > 800) break;
  }
}
function scoreBoard(b, size, me) {
  let myG = 0, myC = 0, otherG = 0, otherC = 0, pos = 0;
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
    const cell = b[r][c]; if (cell.owner === null || cell.count === 0) continue;
    const crit = critN(r, c, size);
    if (cell.owner === me) { myG += cell.count; myC++; pos += (crit === 2 ? 0.5 : crit === 3 ? 0.2 : 0); }
    else { otherG += cell.count; otherC++; }
  }
  return myG * 1.0 + myC * 0.35 - otherG * 0.95 - otherC * 0.25 + pos;
}
// つよいCPU用：自分のマスのとなりに「あと1個で爆発する敵マス」があると次に奪われる危険
function threatPenalty(b, size, me) {
  let pen = 0;
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
    const cell = b[r][c];
    if (cell.owner === null || cell.owner === me) continue;
    if (cell.count === critN(r, c, size) - 1) { // 敵が次の手で爆発させられる
      for (const [nr, nc] of neighborsN(r, c, size)) {
        const nb = b[nr][nc];
        if (nb.owner === me && nb.count > 0) pen += nb.count * 0.6 + 0.6;
      }
    }
  }
  return pen;
}
function bestMove(me) {
  const level = (S.cpuLevel == null) ? 1 : S.cpuLevel; // 0=よわい 1=ふつう 2=つよい
  const legal = [];
  for (let r = 0; r < S.size; r++) for (let c = 0; c < S.size; c++) {
    const cell = S.board[r][c];
    if (cell.owner === null || cell.owner === me) legal.push([r, c]);
  }
  if (!legal.length) return null;
  // よわい：半分くらいは適当に置く
  if (level === 0 && Math.random() < 0.55) { const m = legal[(Math.random() * legal.length) | 0]; return { r: m[0], c: m[1] }; }

  const noise = level === 0 ? 2.5 : level === 1 ? 0.4 : 0.05;
  let best = null, bestScore = -1e9;
  for (const [r, c] of legal) {
    const b = cloneBoard(S.board);
    b[r][c].owner = me; b[r][c].count += 1;
    simResolve(b, S.size, me);
    let sc = scoreBoard(b, S.size, me) + Math.random() * noise;
    if (level === 2) sc -= threatPenalty(b, S.size, me); // つよい：危険手を避ける
    if (sc > bestScore) { bestScore = sc; best = { r, c }; }
  }
  return best;
}

/* ============================================================
   あそびかた（自分のペースで進むステップ式・複数色で実演）
   ============================================================ */
const DSIZE = 4;
let dB = null, dEls = null, dBusy = false, dTimers = [], demoTurn = 0, tutIndex = 0;
const DCOL = [COLORS[0], COLORS[1]]; // 0=あか 1=あお

const cap = (t) => { $("#tut-cap").textContent = t; };
const after = (ms, fn) => dTimers.push(setTimeout(fn, ms));

function openRules() { toggleModal("#rules", true); gotoStep(0); }

function mountDemo() { $("#tut-stage").innerHTML = '<div id="demo-board"></div>'; buildDemo(); }
function buildDemo() {
  const host = $("#demo-board"); host.innerHTML = ""; dEls = [];
  dB = Array.from({ length: DSIZE }, () => Array.from({ length: DSIZE }, () => ({ owner: null, count: 0 })));
  for (let r = 0; r < DSIZE; r++) {
    const row = [];
    for (let c = 0; c < DSIZE; c++) {
      const el = document.createElement("div"); el.className = "cell";
      el.addEventListener("click", () => demoTap(r, c));
      host.appendChild(el); row.push(el);
    }
    dEls.push(row);
  }
}
function mountZone() {
  const size = 5;
  let h = `<div class="zone-board" style="grid-template-columns:repeat(${size},1fr);grid-template-rows:repeat(${size},1fr)">`;
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
    const cr = critN(r, c, size);
    const cls = cr === 2 ? "z-corner" : cr === 3 ? "z-edge" : "z-center";
    const label = cr === 2 ? "角" : cr === 3 ? "辺" : "中央";
    h += `<div class="zcell ${cls}"><span class="zn">${cr}</span><span class="zl">${label}</span></div>`;
  }
  $("#tut-stage").innerHTML = h + "</div>";
}
function paintD(r, c) {
  const el = dEls[r][c], cell = dB[r][c];
  el.className = "cell"; el.style.removeProperty("--c");
  if (cell.owner === null || cell.count === 0) { el.style.background = "var(--cell)"; el.innerHTML = ""; return; }
  const color = DCOL[cell.owner];
  el.style.setProperty("--c", color);
  el.style.background = `color-mix(in srgb, ${color} 22%, #fff)`;
  if (cell.count === critN(r, c, DSIZE) - 1) el.classList.add("ready");
  el.innerHTML = gemsHtml(cell.count, color);
}
function paintDAll() { for (let r = 0; r < DSIZE; r++) for (let c = 0; c < DSIZE; c++) paintD(r, c); }
function dClear() { dB = Array.from({ length: DSIZE }, () => Array.from({ length: DSIZE }, () => ({ owner: null, count: 0 }))); paintDAll(); }
function dSet(r, c, o, n) { dB[r][c] = { owner: o, count: n }; paintD(r, c); }

/* --- ステップ定義（自分のペースで／ゆっくり再生） --- */
const STEPS = [
  { cap: "① 自分の番がきたら、自分の色のマスか空きマスをタップしてジェムを置きます。",
    extra: "置けるのは「空きマス」か「自分の色のマス」だけ。相手の色には置けません。",
    run() {
      mountDemo(); dClear(); dBusy = true;
      after(1400, () => { dSet(1, 1, 0, 1); blip(540, .05, "triangle"); });
      after(3600, () => { dSet(2, 2, 1, 1); blip(500, .05, "triangle"); cap("① あかも あおも、それぞれ自分の番に1個ずつ置いていきます。"); });
    } },

  { cap: "② マスは『となりの数』ぶんジェムが集まると爆発します。場所で爆発しやすさがちがう！",
    extra: '<span class="zone-legend"><span><i style="background:#ff6a4d"></i>角＝2こで爆発(最速)</span><span><i style="background:#3d8bff"></i>辺＝3こ</span><span><i style="background:#b9c6e6"></i>中央＝4こ</span></span>',
    run() { mountZone(); } },

  { cap: "③ 限界の数になると『バクハツ』！上下左右のとなりへジェムが1個ずつ飛びます。",
    extra: "角は2こで爆発。角や辺はとても強い！",
    run() {
      mountDemo(); dClear(); dBusy = true;
      after(1200, () => { dSet(0, 0, 0, 1); cap("③ 角のマスに、あと1こ置くと…"); });
      after(3600, () => { cap("③ 2こでバクハツ！となりへ1個ずつ飛んだ！"); dB[0][0] = { owner: 0, count: 2 }; paintD(0, 0); demoResolve(0); });
    } },

  { cap: "④ 飛んだ先が相手のマスでも、自分の色に『奪える』のがポイント！",
    extra: "あおのマスに あかのバクハツが飛ぶと、あお→あか に変わります。",
    run() {
      mountDemo(); dClear(); dBusy = true;
      dSet(0, 1, 1, 1); dSet(1, 0, 1, 1);
      after(1400, () => { dSet(0, 0, 0, 1); cap("④ あかが角で爆発しそう。まわりは あおのマス…"); });
      after(4000, () => { cap("④ バクハツ！となりの あお を2マスとも奪った！"); dB[0][0] = { owner: 0, count: 2 }; paintD(0, 0); demoResolve(0); });
    } },

  { cap: "⑤ バクハツのとき、となりのマスの『数』はこうなります。",
    extra: "相手の色＝<b>うばって＋1</b>／自分の色＝<b>＋1</b>／空き＝<b>自分の色で1個</b>。元のジェムは消えません！",
    run() {
      mountDemo(); dClear(); dBusy = true;
      dSet(1, 1, 0, 3); // 中央のあか（あと1で爆発）
      dSet(0, 1, 0, 1); // 上＝同じ色 あか(1)
      dSet(1, 2, 1, 2); // 右＝ちがう色 あお(2)
      dSet(2, 1, 1, 1); // 下＝ちがう色 あお(1)
      // 左(1,0)＝空き
      after(2600, () => { cap("⑤ 中央が4でバクハツ！4方向へ1個ずつ配られる…"); dB[1][1] = { owner: 0, count: 4 }; paintD(1, 1); demoResolve(0); });
      after(5200, () => { cap("⑤ あお2→うばって あか3 ／ あか1→2 ／ 空き→あか1。元の数は残る！"); });
    } },

  { cap: "⑥ バクハツが次のバクハツを呼ぶ＝『連鎖』。うまく狙うと一気に大逆転！",
    extra: "あかの1手が、あおの陣地をまとめてのみこみます。",
    run() {
      mountDemo(); dClear(); dBusy = true;
      dSet(1, 1, 0, 3); dSet(0, 1, 0, 2); dSet(1, 0, 0, 2); dSet(0, 0, 0, 1);
      dSet(0, 2, 1, 1); dSet(2, 1, 1, 1); dSet(1, 2, 1, 1); dSet(2, 0, 1, 1);
      after(2800, () => { cap("⑥ 連鎖スタート！ドドドッと大逆転！"); dB[0][0] = { owner: 0, count: 2 }; paintD(0, 0); demoResolve(0); });
    } },

  { cap: "⑦【勝ちかた】盤の上から相手の色を“全部”消したら勝ち！",
    extra: "自分の色のマスが0こになると<b>脱落</b>。最後に1色だけ残った人が優勝です 🏆",
    run() {
      mountDemo(); dClear(); dBusy = true;
      dSet(3, 3, 1, 1); dSet(3, 2, 0, 2);
      after(1400, () => { cap("⑦ 盤に残った最後の あお を、あかが消しにいく…"); });
      after(3600, () => { cap("⑦ バクハツ！最後の あお が消えた…！"); dB[3][2] = { owner: 0, count: 3 }; paintD(3, 2); demoResolve(0); });
      after(6000, () => { cap("⑦ 盤に残ったのは あか だけ → あかの勝ち！🏆"); });
    } },

  { cap: "▶ さいごに、このデモ盤で自由にためそう！タップで あか→あお と交互に置けます。",
    extra: "角をねらう／相手の連鎖を止める…色々ためしてOK。「とじる」でゲームへ。",
    run() { mountDemo(); dClear(); demoTurn = 0; dBusy = false; cap("▶ いまは『あか』の番。マスをタップ！"); } },
];

function gotoStep(i) {
  i = Math.max(0, Math.min(STEPS.length - 1, i));
  tutIndex = i;
  dTimers.forEach(clearTimeout); dTimers = [];
  const st = STEPS[i];
  $("#tut-n").textContent = i + 1;
  $("#tut-total").textContent = STEPS.length;
  $("#tut-extra").innerHTML = st.extra || "";
  $("#tut-prev").disabled = i === 0;
  $("#tut-next").textContent = (i === STEPS.length - 1) ? "とじる ✓" : "つぎへ ▶";
  cap(st.cap);
  st.run();
}

async function demoTap(r, c) {
  if (dBusy) return;
  const cell = dB[r][c];
  if (cell.owner !== null && cell.owner !== demoTurn) { dEls[r][c].classList.add("invalid"); setTimeout(() => dEls[r][c].classList.remove("invalid"), 300); return; }
  cell.owner = demoTurn; cell.count += 1; blip(540, .05, "triangle"); paintD(r, c);
  await demoResolve(demoTurn);
  demoTurn = demoTurn === 0 ? 1 : 0;
  cap(`▶ つぎは『${demoTurn === 0 ? "あか" : "あお"}』の番。マスをタップ！`);
}

async function demoResolve(player) {
  dBusy = true; let guard = 0;
  while (true) {
    const unstable = [];
    for (let r = 0; r < DSIZE; r++) for (let c = 0; c < DSIZE; c++)
      if (dB[r][c].count >= critN(r, c, DSIZE) && dB[r][c].count > 0) unstable.push([r, c]);
    if (!unstable.length) break;
    if (activeOwnersB(dB, DSIZE).size <= 1) break;
    unstable.forEach(([r, c]) => dEls[r][c].classList.add("pop"));
    blip(160, .08, "sawtooth");
    await sleep(420); // デモはゆっくり見せる
    const delta = new Map(), touched = new Set();
    const add = (k, d) => delta.set(k, (delta.get(k) || 0) + d);
    for (const [r, c] of unstable) {
      const key = r * DSIZE + c; add(key, -critN(r, c, DSIZE)); touched.add(key);
      for (const [nr, nc] of neighborsN(r, c, DSIZE)) { const k2 = nr * DSIZE + nc; add(k2, +1); touched.add(k2); }
    }
    delta.forEach((d, key) => { dB[(key / DSIZE) | 0][key % DSIZE].count += d; });
    touched.forEach((key) => { const cell = dB[(key / DSIZE) | 0][key % DSIZE]; if (cell.count <= 0) { cell.count = 0; cell.owner = null; } else cell.owner = player; });
    unstable.forEach(([r, c]) => dEls[r][c].classList.remove("pop"));
    touched.forEach((key) => paintD((key / DSIZE) | 0, key % DSIZE));
    await sleep(340); // 連鎖の各ステップをゆっくり
    if (++guard > 100) break;
  }
  paintDAll(); dBusy = false;
}

/* ============================================================
   お知らせトースト（脱落・勝利目標などを大きく表示）
   ============================================================ */
let toastTimer = null;
function toast(msg, color) {
  const t = $("#toast");
  if (!t) return;
  t.textContent = msg;
  t.style.borderColor = color || "var(--line)";
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 1900);
}

/* ============================================================
   メニュー（≡）
   ============================================================ */
function buildMenu() {
  const m = document.createElement("div");
  m.id = "menu"; m.className = "modal hidden";
  m.innerHTML = `
    <div class="modal-card" style="max-width:340px;text-align:center;">
      <h2>メニュー</h2>
      <button class="primary" id="m-rules">あそびかた</button>
      <button class="ghost" id="m-suspend">⏸ 中断してタイトルへ（再開できます）</button>
      <button class="ghost" id="m-sound">🔊 音：ON</button>
      <button class="ghost" id="m-restart">同じ設定でやり直す</button>
      <button class="ghost" id="m-setup">設定にもどる</button>
      <button class="ghost" id="m-close">とじる</button>
    </div>`;
  document.body.appendChild(m);
  $("#m-rules").addEventListener("click", () => { toggleModal("#menu", false); openRules(); });
  $("#m-suspend").addEventListener("click", () => { saveGame(); toggleModal("#menu", false); showScreen("#setup"); toast("💾 保存しました。タイトルの「つづきから」で再開できます", "#13c08a"); });
  $("#m-sound").addEventListener("click", () => { muted = !muted; $("#m-sound").textContent = muted ? "🔇 音：OFF" : "🔊 音：ON"; });
  $("#m-restart").addEventListener("click", () => { toggleModal("#menu", false); beginOrder(); });
  $("#m-setup").addEventListener("click", () => { toggleModal("#menu", false); showScreen("#setup"); });
  $("#m-close").addEventListener("click", () => toggleModal("#menu", false));
}
function openMenu() { toggleModal("#menu", true); }

/* ============================================================
   サウンド（WebAudio）
   ============================================================ */
let actx = null;
function ac() { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } return actx; }
function blip(freq, dur, type) {
  if (muted) return; const ctx = ac(); if (!ctx) return;
  try {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || "sine"; o.frequency.value = freq; g.gain.value = 0.0001;
    o.connect(g); g.connect(ctx.destination);
    const t = ctx.currentTime;
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o.stop(t + dur + 0.02);
  } catch (e) {}
}
function winChime() { if (muted) return;[523, 659, 784, 1046].forEach((f, i) => setTimeout(() => blip(f, 0.25, "triangle"), i * 120)); }

/* ============================================================ */
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m])); }

/* ============================================================
   オンライン対戦（部屋番号でつながる・アカウント紐づけ・報酬）
   ・状態は magichainparty Firebase(js/online.js=window.MCPOnline)に保存
   ・手番プレイヤーの端末が連鎖を計算して盤面を書き込み、他端末は受信して再描画
   ============================================================ */
function whenMCP(timeout) {
  return new Promise((res) => {
    if (window.MCPOnline) return res(window.MCPOnline);
    let done = false; const fin = () => { if (!done) { done = true; res(window.MCPOnline || null); } };
    window.addEventListener("mcponline:ready", fin, { once: true });
    setTimeout(fin, timeout || 6000);
  });
}
function myOnlineAccount() {
  try {
    const a = JSON.parse(localStorage.getItem("xeva_account_v1") || "null");
    if (!a || !a.xvUid) return null;
    let charFile = a.charFile || "";
    if (!charFile && window.XEVA && XEVA.account && XEVA.account.getChar) {
      const ch = XEVA.account.getChar(); if (ch && ch.file) charFile = ch.file;
    }
    return { uid: a.xvUid, name: (a.name || "プレイヤー").slice(0, 6), charFile };
  } catch (e) { return null; }
}
function isMyOnlineTurn() {
  return !!(ONLINE && ONLINE.entered && window.MCPOnline && S.players && S.players[S.turn] &&
            S.players[S.turn].uid === MCPOnline.myUid());
}

function initOnline() {
  const btn = $("#open-online");
  if (btn) btn.addEventListener("click", openOnline);
  const back = $("#ol-back"); if (back) back.addEventListener("click", () => { showScreen("#setup"); });
  const create = $("#ol-create"); if (create) create.addEventListener("click", onCreateRoom);
  const join = $("#ol-join-btn"); if (join) join.addEventListener("click", onJoinRoom);
  const ready = $("#ol-ready"); if (ready) ready.addEventListener("click", onToggleReady);
  const start = $("#ol-start"); if (start) start.addEventListener("click", startOnline);
  const leave = $("#ol-leave"); if (leave) leave.addEventListener("click", leaveOnlineToSetup);
  const sizeSeg = $("#ol-size-seg");
  if (sizeSeg) sizeSeg.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b || !ONLINE || !ONLINE.isHost) return;
    MCPOnline.setOptions({ size: +b.dataset.s });
  });
  const roundSeg = $("#ol-round-seg");
  if (roundSeg) roundSeg.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b || !ONLINE || !ONLINE.isHost) return;
    MCPOnline.setOptions({ roundLimit: +b.dataset.r });
  });
}

function olMsg(t, color) { const m = $("#ol-msg"); if (m) { m.textContent = t || ""; m.style.color = color || "#8892a6"; } }

function openOnline() {
  /* ★ オフライン中はオンライン対戦に入れない */
  if (navigator.onLine === false) {
    toast("📴 オフライン中はオンライン対戦できません（ローカル対戦は遊べます）", "#ff8c42");
    return;
  }
  const acc = myOnlineAccount();
  showScreen("#online");
  $("#ol-lobby").classList.add("hidden");
  $("#ol-home").classList.remove("hidden");
  const st = $("#ol-sticky"); if (st) st.classList.add("hidden");
  $("#ol-ready").classList.add("hidden");
  $("#ol-start").classList.add("hidden");
  $("#ol-code").value = "";
  if (!acc) { olMsg("オンライン対戦にはポータルでのアカウント設定が必要です。", "#ff5d5d"); $("#ol-create").disabled = true; $("#ol-join-btn").disabled = true; }
  else { olMsg("部屋をつくるか、4桁の番号で参加してください。"); $("#ol-create").disabled = false; $("#ol-join-btn").disabled = false; }
  whenMCP().then((M) => { if (!M) olMsg("オンライン接続を準備できませんでした。通信環境を確認してください。", "#ff5d5d"); });
}

function onCreateRoom() {
  const acc = myOnlineAccount(); if (!acc) return;
  olMsg("部屋を作成中…");
  whenMCP().then((M) => {
    if (!M) { olMsg("オンライン接続がありません。", "#ff5d5d"); return; }
    M.createRoom(acc, { size: setup.size || 8, roundLimit: setup.roundLimit || 0 }).then((r) => {
      if (r && r.code) { startOnlineSession(); }
      else if (r && r.error === "denied") olMsg("サーバーに接続できません（データベースのルール設定が必要です）。", "#ff5d5d");
      else olMsg("部屋を作成できませんでした。通信環境を確認してもう一度お試しください。", "#ff5d5d");
    });
  });
}
function onJoinRoom() {
  const acc = myOnlineAccount(); if (!acc) return;
  const code = ($("#ol-code").value || "").trim();
  if (!/^\d{4}$/.test(code)) { olMsg("4桁の部屋番号を入力してください。", "#ff5d5d"); return; }
  olMsg("参加中…");
  whenMCP().then((M) => {
    if (!M) { olMsg("オンライン接続がありません。", "#ff5d5d"); return; }
    M.joinRoom(code, acc).then((r) => {
      if (r && r.ok) { startOnlineSession(); }
      else if (r && r.error === "nofound") olMsg("その番号の部屋が見つかりません。", "#ff5d5d");
      else if (r && r.error === "full") olMsg("その部屋は満員です（最大6人）。", "#ff5d5d");
      else if (r && r.error === "started") olMsg("その部屋はすでにゲーム中です。", "#ff5d5d");
      else if (r && r.error === "denied") olMsg("サーバーに接続できません（データベースのルール設定が必要です）。", "#ff5d5d");
      else olMsg("参加できませんでした。通信環境を確認してもう一度お試しください。", "#ff5d5d");
    });
  });
}

/* 部屋に入ったら購読を開始 */
function startOnlineSession() {
  ONLINE = { roomPlayers: [], mySlot: -1, isHost: false, entered: false, room: null, pendingState: null, pushedSeq: 0, _pOnline: null, _connInit: false };
  const M = window.MCPOnline;
  $("#ol-home").classList.add("hidden");
  $("#ol-lobby").classList.remove("hidden");
  const st = $("#ol-sticky"); if (st) st.classList.remove("hidden");
  $("#ol-ready").classList.remove("hidden");
  $("#ol-roomnum").textContent = M.code();
  M.watchRoom(onlineRoomUpdate);
  M.watchState(onlineStateUpdate);
  if (M.watchConnected) M.watchConnected(onlineConnChange);
}

/* ── 自分の接続状態（Firebase .info/connected）── 切れたらバナー表示 */
function onlineConnChange(ok) {
  if (!ONLINE) return;
  if (!ONLINE._connInit) { ONLINE._connInit = true; if (ok) return; } // 初回の connected=true は無視
  let b = document.getElementById("ol-connbar");
  if (!ok) {
    if (!b) {
      b = document.createElement("div");
      b.id = "ol-connbar";
      b.textContent = "⚠️ 接続が切れました — 再接続しています…";
      document.body.appendChild(b);
    }
    b.classList.add("show");
  } else {
    if (b) b.classList.remove("show");
    toast("✅ 再接続しました", "#13c08a");
  }
}
function hideConnBar() { const b = document.getElementById("ol-connbar"); if (b) b.classList.remove("show"); }

function onlineRoomUpdate(room) {
  if (!room) {
    if (ONLINE && !ONLINE.entered) { toast("部屋が解散されました", "#ff5d5d"); softLeaveToSetup(); }
    return;
  }
  if (!ONLINE) return;
  ONLINE.room = room;
  ONLINE.isHost = !!(room.meta && room.meta.host === MCPOnline.myUid());
  const players = room.players ? Object.keys(room.players).map((uid) => ({ uid, ...room.players[uid] })) : [];
  players.sort((a, b) => (a.slot - b.slot) || ((a.joinedAt || 0) - (b.joinedAt || 0)));
  ONLINE.roomPlayers = players;
  ONLINE.mySlot = players.findIndex((p) => p.uid === MCPOnline.myUid());
  // 相手の接続状態の変化を通知（切断＝onDisconnect で online:false になる）
  if (ONLINE._pOnline) {
    players.forEach((p) => {
      if (p.uid === MCPOnline.myUid()) return;
      const was = ONLINE._pOnline[p.uid], now = p.online !== false;
      if (was !== undefined && was !== now) {
        toast(now ? `📡 ${p.name} が再接続しました` : `📡 ${p.name} の接続が切れました`, now ? "#13c08a" : "#ff8c42");
      }
    });
  }
  ONLINE._pOnline = {}; players.forEach((p) => { ONLINE._pOnline[p.uid] = p.online !== false; });
  if (!ONLINE.entered) renderLobby(room, players);
  if (!ONLINE.entered && ONLINE.pendingState && players.length) {
    const st = ONLINE.pendingState; ONLINE.pendingState = null; enterOnlineGame(st);
  }
}
function onlineStateUpdate(state) {
  if (!state || !ONLINE) return;
  if (!ONLINE.entered) {
    if (!ONLINE.roomPlayers || !ONLINE.roomPlayers.length) { ONLINE.pendingState = state; return; }
    enterOnlineGame(state); return;
  }
  applyOnlineState(state);
}

function renderLobby(room, players) {
  const host = room.meta && room.meta.host;
  const list = $("#ol-players"); if (list) {
    list.innerHTML = players.map((p, i) => {
      const isHostP = p.uid === host, me = p.uid === MCPOnline.myUid();
      const off = p.online === false;
      return `<div class="ol-prow" style="--c:${COLORS[i] || "#888"}">
        <span class="pdot"></span>
        <span class="ol-pname">${escapeHtml(p.name || "?")}${me ? "（あなた）" : ""}${isHostP ? " 👑" : ""}${off ? " ⚪️" : ""}</span>
        <span class="ol-pready">${p.ready ? "✅ 準備OK" : "…待機中"}</span>
      </div>`;
    }).join("") + (players.length < (MCPOnline.MAX_PLAYERS || 6)
      ? `<div class="ol-prow empty"><span class="ol-pname">空き（あと ${(MCPOnline.MAX_PLAYERS || 6) - players.length} 人まで）</span></div>` : "");
  }
  // ホスト設定
  $("#ol-host-opts").classList.toggle("hidden", !ONLINE.isHost);
  if (ONLINE.isHost && room.meta) {
    $$("#ol-size-seg button").forEach((b) => b.classList.toggle("on", +b.dataset.s === (room.meta.size || 8)));
    $$("#ol-round-seg button").forEach((b) => b.classList.toggle("on", +b.dataset.r === (room.meta.roundLimit || 0)));
  }
  // 自分の準備ボタン（ホストは常に準備OKなので非表示）
  const meP = players.find((p) => p.uid === MCPOnline.myUid());
  const rb = $("#ol-ready");
  if (rb) {
    rb.classList.toggle("hidden", !!ONLINE.isHost);
    rb.textContent = (meP && meP.ready) ? "✋ 準備OK（タップで解除）" : "✋ 準備する";
    rb.classList.toggle("on", !!(meP && meP.ready));
  }
  // 開始ボタン（ホスト・2人以上・全員準備OK）
  const allReady = players.length >= 2 && players.every((p) => p.ready);
  const sb = $("#ol-start");
  if (sb) { sb.classList.toggle("hidden", !ONLINE.isHost); sb.disabled = !allReady; sb.textContent = allReady ? "▶ ゲーム開始（ホスト）" : "▶ 全員の準備を待っています…"; }
}

function onToggleReady() {
  if (!ONLINE) return;
  const meP = ONLINE.roomPlayers.find((p) => p.uid === MCPOnline.myUid());
  MCPOnline.setReady(!(meP && meP.ready));
}

function startOnline() {
  if (!ONLINE || !ONLINE.isHost) return;
  const players = ONLINE.roomPlayers.slice();
  if (players.length < 2) { toast("2人以上必要です", "#ff5d5d"); return; }
  const meta = (ONLINE.room && ONLINE.room.meta) || {};
  const size = meta.size || 8, roundLimit = meta.roundLimit || 0, n = players.length;
  const board = [];
  for (let r = 0; r < size; r++) { const row = []; for (let c = 0; c < size; c++) row.push({ owner: null, count: 0 }); board.push(row); }
  const order = [...Array(n).keys()];
  for (let i = order.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0;[order[i], order[j]] = [order[j], order[i]]; }
  const slotUpdates = {}; players.forEach((p, i) => { slotUpdates[p.uid] = i; });
  const state = {
    seq: 1, writer: -1, size, n, roundLimit,
    order, orderPos: 0, turnSlot: order[0],
    round: 1, deaths: 0, moves: 0, over: false,
    board: board.map((row) => row.map((c) => ({ owner: c.owner, count: c.count }))),
    players: players.map((p, i) => ({ slot: i, started: false, dead: false, deadAt: 0 })),
    result: null,
  };
  MCPOnline.startGame(state, slotUpdates);
}

/* オンライン用に S を構築してゲーム画面へ */
function enterOnlineGame(state) {
  const rp = ONLINE.roomPlayers.slice().sort((a, b) => a.slot - b.slot);
  const n = state.n || rp.length;
  S = {
    // 注意: Firebase は null 値を保存しない＝空マスの owner:null が欠落して届く。
    // owner を必ず null に正規化しないと「自分の番なのに置けない」バグになる。
    board: state.board.map((row) => row.map((c) => ({ owner: (c && c.owner != null) ? c.owner : null, count: (c && c.count) || 0 }))),
    size: state.size, n,
    order: state.order.slice(), orderPos: state.orderPos, turn: state.turnSlot,
    busy: false, over: false, moves: state.moves || 0, deaths: state.deaths || 0,
    round: state.round || 1, roundLimit: state.roundLimit || 0, cpuLevel: 0,
    players: rp.slice(0, n).map((p, i) => ({
      id: i, color: COLORS[i], face: FACES[i], seat: SEATS[n][i],
      name: p.name || NAMES[i], type: "human", started: false, dead: false, deadAt: 0,
      uid: p.uid, xvUid: p.uid, xvName: p.name,
    })),
    history: [], onlineSeqApplied: state.seq || 0, onlineWinShown: false,
  };
  ONLINE.mySlot = S.players.findIndex((p) => p.uid === MCPOnline.myUid());
  applyPlayersMeta(state);
  buildBoardSkeleton();
  buildPanels();
  paintAll();
  updatePanels();
  setBoardFrame();
  updateRoundInfo();
  const ub = $("#undo-btn"); if (ub) ub.style.display = "none";
  ONLINE.entered = true;
  // XEVA ミッション（初回プレイ）
  try { if (window.XEVA) { const rw = XEVA.completeMission("magichainparty_play"); if (rw > 0) toast("🎉 ミッション達成！ +" + rw + " XEVA", "#f0c040"); } } catch (e) {}
  // 開幕（まだ誰も打っていない）なら順番抽選の演出を見せてからゲーム画面へ
  if (!state.over && (state.moves || 0) === 0) {
    showOnlineOrder();
  } else {
    showScreen("#game");
    onlineStartToasts(state);
  }
}

/* オンラインの順番抽選演出（順番自体はホストが抽選済み＝S.order を発表するだけ） */
function showOnlineOrder() {
  showScreen("#order");
  $("#order-actions").classList.add("hidden");
  $("#order-result").innerHTML = "";
  $("#order-title").textContent = "順番を抽選中…";
  $("#order-dice").textContent = (S.n === 2 ? "🪙" : "🎲");
  $("#order-dice").classList.add("spin");
  setTimeout(() => {
    if (!ONLINE || !$("#order").classList.contains("active")) return;
    $("#order-dice").classList.remove("spin");
    $("#order-title").textContent = "順番が決まりました！";
    const res = $("#order-result"); res.innerHTML = "";
    S.order.forEach((pid, rank) => {
      const p = S.players[pid]; if (!p) return;
      const me = window.MCPOnline && p.uid === MCPOnline.myUid();
      const item = document.createElement("div");
      item.className = "order-item";
      item.style.setProperty("--c", p.color);
      item.style.animationDelay = (rank * 0.12) + "s";
      item.innerHTML = `<span class="rank">${rank + 1}</span><span class="pdot"></span><span class="nm">${escapeHtml(p.name)}${me ? "（あなた）" : ""}</span>`;
      res.appendChild(item);
    });
    setTimeout(() => {
      if (!ONLINE || !$("#order").classList.contains("active")) return;
      showScreen("#game");
      onlineStartToasts(null);
    }, S.order.length * 120 + 1500);
  }, 1400);
}

function onlineStartToasts(state) {
  toast(S.roundLimit ? `🎯 ${S.roundLimit}ラウンド制・オンライン対戦！` : "🎯 オンライン対戦スタート！全部の色を消したら勝ち", "#7c5bff");
  if (state && state.over) showOnlineWin(state);
  else if (S.over && S.result) showOnlineWin({ result: S.result });
  else if (isMyOnlineTurn()) setTimeout(() => toast("▶ あなたの番です！", "#13c08a"), 700);
}

function applyPlayersMeta(state) {
  if (!state.players) return;
  state.players.forEach((sp) => {
    const p = S.players[sp.slot];
    if (p) { p.started = !!sp.started; p.dead = !!sp.dead; p.deadAt = sp.deadAt || 0; }
  });
}

/* 受信した権威状態を反映（再描画） */
function applyOnlineState(state) {
  if (!state) return;
  if (state.seq && state.seq <= (S.onlineSeqApplied || 0) && ONLINE.entered && !state.over && !S.over) return;
  S.onlineSeqApplied = state.seq || 0;
  // Firebase は null を保存しないため owner を null に正規化（enterOnlineGame と同じ）
  S.board = state.board.map((row) => row.map((c) => ({ owner: (c && c.owner != null) ? c.owner : null, count: (c && c.count) || 0 })));
  S.order = state.order.slice(); S.orderPos = state.orderPos; S.turn = state.turnSlot;
  S.round = state.round || 1; S.deaths = state.deaths || 0; S.moves = state.moves || 0;
  const prevDead = new Set(S.players.filter((p) => p.dead).map((p) => p.id));
  applyPlayersMeta(state);
  if (state.result) S.result = state.result;
  S.over = !!state.over;
  paintAll(); updatePanels(); setBoardFrame(); updateRoundInfo();
  S.players.forEach((p) => { if (p.dead && !prevDead.has(p.id)) toast(`${p.face} ${p.name} の色が消えた！脱落！`, p.color); });
  if (state.over) showOnlineWin(state);
  else if (isMyOnlineTurn()) setTimeout(() => { if (isMyOnlineTurn() && !S.busy) toast("▶ あなたの番です！", "#13c08a"); }, 250);
}

/* 手番の手を打ち終えた後、確定盤面をFBへ送信 */
function afterMoveOnline() {
  const seq = (S.onlineSeqApplied || 0) + 1;
  S.onlineSeqApplied = seq; ONLINE.pushedSeq = seq;
  const state = {
    seq, writer: ONLINE.mySlot,
    size: S.size, n: S.n, roundLimit: S.roundLimit,
    order: S.order.slice(), orderPos: S.orderPos, turnSlot: S.turn,
    round: S.round, deaths: S.deaths, moves: S.moves, over: !!S.over,
    board: S.board.map((row) => row.map((c) => ({ owner: c.owner, count: c.count }))),
    players: S.players.map((p) => ({ slot: p.id, started: !!p.started, dead: !!p.dead, deadAt: p.deadAt || 0 })),
    result: S.over ? (S.result || null) : null,
  };
  MCPOnline.pushState(state);
}

/* オンライン終局：順位を決めて result をセットし送信（勝敗表示は showOnlineWin が全端末で行う） */
function endOnline(kind) {
  S.over = true;
  let ranked;
  if (kind === "territory") {
    const terr = (p) => ownedCount(S.board, S.size, p.id);
    ranked = [...S.players].sort((a, b) => (terr(b) - terr(a)) || (gemCount(b.id) - gemCount(a.id)));
  } else {
    const rankKey = (p) => p.dead ? p.deadAt : Infinity;
    ranked = [...S.players].sort((a, b) => rankKey(b) - rankKey(a));
  }
  S.result = { kind, rankedSlots: ranked.map((p) => p.id) };
  updatePanels(); setBoardFrame();
  afterMoveOnline();
}

function showOnlineWin(state) {
  if (S.onlineWinShown) return; S.onlineWinShown = true;
  winChime();
  const result = (state && state.result) || { kind: "last", rankedSlots: S.players.map((p) => p.id) };
  const ranked = result.rankedSlots.map((slot) => S.players[slot]).filter(Boolean);
  const win = ranked[0];
  $("#win-emoji").textContent = win.face;
  $("#win-title").textContent = `${win.name} の勝ち！`;
  $("#win-title").style.color = win.color;
  $("#win-sub").textContent = result.kind === "territory"
    ? `${S.roundLimit}ラウンド終了！ 領土（マス数）の多い順で順位を決定`
    : "ほかの色をすべて消しました 🎉 順位は『長く生き残った順』！";
  const stats = $("#win-stats"); stats.innerHTML = "";
  const medal = ["🥇", "🥈", "🥉"];
  ranked.forEach((p, i) => {
    const row = document.createElement("div");
    row.className = "win-row"; row.style.setProperty("--c", p.color);
    const badge = medal[i] || (i + 1) + "位";
    const right = result.kind === "territory"
      ? `${ownedCount(S.board, S.size, p.id)} マス`
      : (p.dead ? `${p.deadAt}番目に脱落` : `${gemCount(p.id)}個で制覇 🏆`);
    row.innerHTML = `<span class="pdot"></span><span class="nm">${badge} ${escapeHtml(p.name)}${i === 0 ? "（優勝）" : ""} 🔗</span><span>${right}</span>`;
    stats.appendChild(row);
  });
  awardOnlinePrizes(ranked);
  $("#play-again") && ($("#play-again").textContent = "ロビーにもどる");
  setTimeout(() => toggleModal("#win", true), 700);
}

/* ホストのみ順位賞金を配布（awardOnce 内でも二重防止） */
function awardOnlinePrizes(ranked) {
  if (!ONLINE || !ONLINE.isHost || !window.MCPOnline) return;
  const top = ranked.map((p) => ({ uid: p.uid, name: p.name }));
  MCPOnline.awardOnce(top).then((list) => {
    if (list && list.length) list.forEach((r, i) => setTimeout(() => toast(`🏆 ${r.name} に賞金 ${r.amount} XEVA！（ポータルで受取）`, "#f0c040"), 1200 + i * 1200));
  });
}

/* 退出処理 */
function softLeaveToSetup() {
  ONLINE = null;
  hideConnBar();
  const ub = $("#undo-btn"); if (ub) ub.style.display = "";
  const pa = $("#play-again"); if (pa) pa.textContent = "もう一度あそぶ";
  toggleModal("#win", false);
  showScreen("#setup");
}
function leaveOnlineToSetup() {
  try { if (window.MCPOnline) MCPOnline.leaveRoom(); } catch (e) {}
  try { if (window.XevaPresence) XevaPresence.leave(); } catch (e) {}
  softLeaveToSetup();
}

window.addEventListener("DOMContentLoaded", () => { preventZoom(); initSetup(); });
