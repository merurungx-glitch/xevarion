/* ============================================================
   MagiShareCore — 陣地シェア × 境界線引きゲーム
   ・手番でやること：ドットとドットを結び「線を1本」引くだけ
   ・線で囲まれた部屋(セル)が閉じると、中のコア(得点)を
     線を引いたプレイヤーたちに貢献度で分配
   ・【独占禁止】自分の色だけで部屋を閉じるのは反則（2人以上で共有が必須）
   ・保存 / 「一手もどす」対応
   MagiOneX Series / XEVARION（製作パートナー: ISHIDA Production）
   ============================================================ */
"use strict";
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const SAVE_KEY = "magisharecore_save_v1";

const COLORS = ["#ff5d8f", "#37c8ff", "#12b886", "#ffab17", "#8b5bff"];
const FACES  = ["🍓", "💧", "🍀", "⭐", "🔮"];
const SIZES  = { S: { cols: 4, rows: 4 }, M: { cols: 5, rows: 5 }, L: { cols: 6, rows: 6 }, XL: { cols: 8, rows: 8 } };

let setup = { n: 3, size: "M", players: null };
let S = null;               // 実行中のゲーム状態
let audioCtx = null;

/* ---------- 効果音 ---------- */
function blip(freq, dur, type) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = type || "sine"; o.frequency.value = freq;
    g.gain.value = 0.06; o.connect(g); g.connect(audioCtx.destination);
    o.start(); g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + (dur || 0.12));
    o.stop(audioCtx.currentTime + (dur || 0.12));
  } catch (e) {}
}
function chime() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => blip(f, 0.22, "triangle"), i * 110)); }

/* ---------- ユーティリティ ---------- */
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m])); }
function toast(msg, color) {
  const t = $("#toast"); if (!t) return;
  t.textContent = msg; t.style.setProperty("--tc", color || "#8b5bff");
  t.classList.add("show"); clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("show"), 2600);
}
function showScreen(id) { $$(".screen").forEach((s) => s.classList.remove("active")); $(id).classList.add("active"); if (id === "#setup") refreshResume(); }
function toggleModal(id, show) { $(id).classList.toggle("hidden", !show); }

/* ============================================================
   セットアップ
   ============================================================ */
function initSetup() {
  $("#n-seg").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    setup.n = +b.dataset.n; markSeg("#n-seg", b); renderPlayers();
  });
  $("#size-seg").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    setup.size = b.dataset.s; markSeg("#size-seg", b);
  });
  $("#players-list").addEventListener("click", (e) => {
    const lk = e.target.closest(".gl-link-btn");
    if (lk) { openSeatLink(+lk.dataset.p); return; }
    const b = e.target.closest(".type-seg button"); if (!b) return;
    const idx = +b.dataset.p; setup.players[idx].type = b.dataset.t;
    renderPlayers();
  });
  $("#players-list").addEventListener("input", (e) => {
    if (e.target.matches("input")) setup.players[+e.target.dataset.p].name = e.target.value;
  });
  $("#start").addEventListener("click", startGame);
  $("#show-rules").addEventListener("click", openTutorial);
  $("#rules-ok").addEventListener("click", () => toggleModal("#rules", false));
  $("#tut-prev").addEventListener("click", () => tutGoto(tutIndex - 1));
  $("#tut-next").addEventListener("click", () => { if (tutIndex >= TUT_STEPS.length - 1) toggleModal("#rules", false); else tutGoto(tutIndex + 1); });
  $("#tut-replay").addEventListener("click", () => tutGoto(tutIndex));
  $("#resume-btn").addEventListener("click", resumeGame);
  $("#order-go").addEventListener("click", enterGame);
  $("#order-redo").addEventListener("click", beginOrder);

  $("#undo-btn").addEventListener("click", undoMove);
  $("#menu-btn").addEventListener("click", () => toggleModal("#menu", true));
  $("#m-close").addEventListener("click", () => toggleModal("#menu", false));
  $("#m-rules").addEventListener("click", () => { toggleModal("#menu", false); openTutorial(); });
  $("#m-suspend").addEventListener("click", () => { saveGame(); toggleModal("#menu", false); showScreen("#setup"); toast("💾 保存しました。「つづきから」で再開できます", "#12b886"); });
  $("#m-restart").addEventListener("click", () => { toggleModal("#menu", false); startGame(); });
  $("#m-setup").addEventListener("click", () => { toggleModal("#menu", false); showScreen("#setup"); });
  $("#play-again").addEventListener("click", () => { toggleModal("#win", false); startGame(); });
  $("#back-setup").addEventListener("click", () => { toggleModal("#win", false); showScreen("#setup"); });

  setup.players = defaultPlayers(5);
  renderPlayers();
  refreshResume();
}
function markSeg(sel, btn) { $$(sel + " button").forEach((x) => x.classList.remove("on")); btn.classList.add("on"); }
function defaultPlayers(max) {
  const names = ["プレイヤー1", "プレイヤー2", "プレイヤー3", "プレイヤー4", "プレイヤー5"];
  return Array.from({ length: max }, (_, i) => ({ color: COLORS[i], face: FACES[i], name: names[i], type: i === 0 ? "human" : (i < 2 ? "human" : "cpu") }));
}
function renderPlayers() {
  const box = $("#players-list"); box.innerHTML = "";
  for (let i = 0; i < setup.n; i++) {
    const p = setup.players[i];
    const row = document.createElement("div");
    row.className = "prow"; row.style.setProperty("--c", p.color);
    const linked = p.link && p.link.uid;
    row.innerHTML = `
      <span class="pdot"></span>
      <input data-p="${i}" maxlength="10" value="${escapeHtml(p.name)}">
      <span class="type-seg">
        <button data-p="${i}" data-t="human" class="${p.type === "human" ? "on" : ""}" style="--c:${p.color}">人</button>
        <button data-p="${i}" data-t="cpu" class="${p.type === "cpu" ? "on" : ""}" style="--c:${p.color}">CPU</button>
      </span>
      ${p.type === "human" ? `<button class="gl-link-btn ${linked ? "on" : ""}" data-p="${i}" title="XEVARIONアカウントを紐づけて賞金を受け取る">${linked ? "✓ " + escapeHtml(p.link.name) : "🔗 紐づけ"}</button>` : ""}`;
    box.appendChild(row);
  }
}
function openSeatLink(idx) {
  if (!window.GameLink) { toast("紐づけ機能を準備中です…", "#8a819c"); return; }
  const p = setup.players[idx];
  if (p.link && p.link.uid) {   // 解除
    p.link = null; renderPlayers(); toast("紐づけを解除しました", "#8a819c"); return;
  }
  GameLink.link(p.name).then((res) => {
    if (res && res.uid) {
      setup.players[idx].link = { uid: res.uid, name: res.name };
      renderPlayers();
      toast("🔗 " + res.name + " を紐づけました", "#12b886");
    }
  });
}
function refreshResume() {
  const btn = $("#resume-btn"); if (!btn) return;
  btn.classList.toggle("hidden", !loadSave());
}

/* ============================================================
   コア生成 & 盤面初期化
   ============================================================ */
function genCores(cols, rows) {
  const cores = [];
  for (let r = 0; r < rows; r++) {
    cores[r] = [];
    for (let c = 0; c < cols; c++) {
      // 約62%のセルにコアを配置。低得点多め・高得点少なめ。
      if (Math.random() < 0.62) {
        const roll = Math.random();
        let v;
        if (roll < 0.5) v = 1 + ((Math.random() * 3) | 0);      // 1-3
        else if (roll < 0.85) v = 4 + ((Math.random() * 3) | 0); // 4-6
        else v = 7 + ((Math.random() * 3) | 0);                  // 7-9
        cores[r][c] = v;
      } else cores[r][c] = 0;
    }
  }
  return cores;
}

function startGame() {
  const { cols, rows } = SIZES[setup.size];
  const players = [];
  for (let i = 0; i < setup.n; i++) {
    const p = setup.players[i];
    players.push({ id: i, color: p.color, face: p.face, name: (p.name || `プレイヤー${i + 1}`).slice(0, 10), type: p.type, score: 0,
      xvUid: (p.link && p.link.uid) || null, xvName: (p.link && p.link.name) || null });
  }
  S = {
    cols, rows, n: setup.n,
    cores: genCores(cols, rows),
    edges: {},                                   // key -> pid
    cells: mkCells(cols, rows),                  // {claimed, top}
    players, order: players.map((p) => p.id), turnPos: 0,
    drawn: 0, totalEdges: (rows + 1) * cols + rows * (cols + 1),
    busy: false, over: false, history: [], rewarded: false,
  };
  _edgeKeysCache = null;
  document.body.classList.toggle("wide-board", cols >= 6);
  beginOrder();
}

/* ── サイコロで順番きめ（MagiChainParty式） ── */
function beginOrder() {
  showScreen("#order");
  const dice = $("#order-dice");
  dice.classList.add("spin");
  dice.textContent = (S.n === 2 ? "🪙" : "🎲");
  $("#order-actions").classList.add("hidden");
  $("#order-result").innerHTML = "";
  $("#order-title").textContent = (S.n === 2 ? "コイントス中…" : "順番を抽選中…");
  blip(420, 0.06, "square");
  setTimeout(revealOrder, 1200);
}
function revealOrder() {
  if (!$("#order").classList.contains("active")) return;
  const order = S.players.map((p) => p.id);
  for (let i = order.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0;[order[i], order[j]] = [order[j], order[i]]; }
  S.order = order; S.turnPos = 0;
  $("#order-dice").classList.remove("spin");
  $("#order-title").textContent = "順番が決まりました！";
  chime();
  const res = $("#order-result"); res.innerHTML = "";
  order.forEach((pid, rank) => {
    const p = S.players.find((x) => x.id === pid);
    const item = document.createElement("div");
    item.className = "order-item"; item.style.setProperty("--c", p.color);
    item.style.animationDelay = (rank * 0.12) + "s";
    item.innerHTML = `<span class="rank">${rank + 1}</span><span class="pdot"></span><span class="nm">${p.face} ${escapeHtml(p.name)}</span>${p.type === "cpu" ? '<span class="tag-cpu">CPU</span>' : ""}`;
    res.appendChild(item);
  });
  setTimeout(() => $("#order-actions").classList.remove("hidden"), order.length * 120 + 320);
}

function enterGame() {
  // XEVA ミッション
  try { if (window.XEVA) { const rw = window.XEVA.completeMission("magisharecore_play"); if (rw > 0) setTimeout(() => toast("🎉 ミッション達成！ +" + rw + " XEVA を獲得（XEVARION）", "#ffab17"), 700); } } catch (e) {}

  showScreen("#game");
  renderBoard();
  renderScorebar();
  updateUndoBtn();
  saveGame();
  toast("🎯 線を1本引いて、コアを囲もう！（独占はダメ）", "#ff5d8f");
  maybeCpu();
}
function mkCells(cols, rows) {
  const a = [];
  for (let r = 0; r < rows; r++) { a[r] = []; for (let c = 0; c < cols; c++) a[r][c] = { claimed: false, top: null }; }
  return a;
}

/* ============================================================
   エッジ / セルのヘルパー
   ============================================================ */
function cellEdges(r, c) { return [`H:${r}:${c}`, `H:${r + 1}:${c}`, `V:${r}:${c}`, `V:${r}:${c + 1}`]; }
function edgeCells(key) {
  const [t, a, b] = key.split(":"); const r = +a, c = +b; const out = [];
  if (t === "H") { if (r > 0) out.push([r - 1, c]); if (r < S.rows) out.push([r, c]); }
  else { if (c > 0) out.push([r, c - 1]); if (c < S.cols) out.push([r, c]); }
  return out;
}
function edgeOwners(r, c, overrideKey, overridePid) {
  return cellEdges(r, c).map((k) => (k === overrideKey ? overridePid : (S.edges[k] != null ? S.edges[k] : null)));
}
function cur() { return S.players[S.order[S.turnPos]]; }

// エッジ key を pid が引けるか（独占禁止：自分の色だけで部屋を閉じるのは反則）
function isLegal(key, pid) {
  if (S.edges[key] != null) return false;
  for (const [r, c] of edgeCells(key)) {
    if (S.cells[r][c].claimed) continue;
    const owners = edgeOwners(r, c, key, pid);
    if (owners.every((o) => o != null)) {                 // このエッジで4辺が揃う＝部屋が閉じる
      const distinct = new Set(owners);
      if (distinct.size < 2) return false;                // 全部同じ色 → 独占 → 反則
    }
  }
  return true;
}
let _edgeKeysCache = null;
function allEdgeKeys() {
  if (_edgeKeysCache && _edgeKeysCache._c === S.cols && _edgeKeysCache._r === S.rows) return _edgeKeysCache.list;
  const list = [];
  for (let r = 0; r <= S.rows; r++) for (let c = 0; c < S.cols; c++) list.push(`H:${r}:${c}`);
  for (let r = 0; r < S.rows; r++) for (let c = 0; c <= S.cols; c++) list.push(`V:${r}:${c}`);
  _edgeKeysCache = { _c: S.cols, _r: S.rows, list };
  return list;
}
function anyLegalKey(pid) {
  for (const k of allEdgeKeys()) if (S.edges[k] == null && isLegal(k, pid)) return k;
  return null;
}
function legalKeysFor(pid) { return allEdgeKeys().filter((k) => S.edges[k] == null && isLegal(k, pid)); }

/* ============================================================
   分配ロジック（最大剰余法で整数配分）
   ============================================================ */
function distribute(V, counts) {
  const base = Object.keys(counts).map((pid) => { const exact = V * counts[pid] / 4; return { pid: +pid, amt: Math.floor(exact), rem: exact - Math.floor(exact) }; });
  let left = V - base.reduce((s, x) => s + x.amt, 0);
  base.sort((a, b) => b.rem - a.rem);
  for (let i = 0; i < base.length && left > 0; i++) { base[i].amt++; left--; }
  const out = {}; base.forEach((x) => { if (x.amt > 0) out[x.pid] = x.amt; });
  return out;
}

/* ============================================================
   1手を打つ
   ============================================================ */
function attemptMove(key, isCpu) {
  if (S.busy || S.over) return;
  if (!isCpu && cur().type === "cpu") return;              // CPU手番は人のタップ無効
  const pid = cur().id;
  if (S.edges[key] != null) return;
  if (!isLegal(key, pid)) {
    blinkEdge(key); blip(160, 0.12, "square");
    toast("❌ 独占はできません（他の色と共有して閉じてね）", "#ff5d5d");
    return;
  }
  if (!isCpu) pushHistory();                               // 人間の手だけ記録（間違えたら「一手もどす」で戻せる）

  S.edges[key] = pid; S.drawn++;
  blip(560, 0.05, "triangle");
  paintEdge(key);

  // このエッジで閉じた部屋を精算
  const claimedNow = [];
  for (const [r, c] of edgeCells(key)) {
    const cell = S.cells[r][c];
    if (cell.claimed) continue;
    const owners = edgeOwners(r, c);
    if (owners.every((o) => o != null)) {
      const counts = {}; owners.forEach((o) => counts[o] = (counts[o] || 0) + 1);
      cell.claimed = true;
      const V = S.cores[r][c];
      let topPid = pid, topShare = -1;
      if (V > 0) {
        const dist = distribute(V, counts);
        Object.keys(dist).forEach((p) => { S.players.find((x) => x.id === +p).score += dist[p]; if (dist[p] > topShare) { topShare = dist[p]; topPid = +p; } });
        cell.top = topPid;
        claimedNow.push({ r, c, V, dist });
      } else {
        // コアなしの部屋：貢献最多の色で塗る（得点0）
        let mx = -1; Object.keys(counts).forEach((p) => { if (counts[p] > mx) { mx = counts[p]; topPid = +p; } });
        cell.top = topPid;
      }
      paintCell(r, c);
    }
  }
  if (claimedNow.length) {
    chime();
    claimedNow.forEach((cl, i) => {
      const parts = Object.keys(cl.dist).map((p) => `${S.players.find((x) => x.id === +p).face}+${cl.dist[p]}`).join(" / ");
      setTimeout(() => toast(`🎁 コア ${cl.V} を分配： ${parts}`, "#12b886"), 150 + i * 900);
    });
  }

  renderScorebar();
  saveGame();

  // 終了判定 / 手番送り
  if (S.drawn >= S.totalEdges) return endGame();
  nextTurn();
}

function nextTurn() {
  let steps = 0;
  do {
    S.turnPos = (S.turnPos + 1) % S.n;
    steps++;
    if (steps > S.n) return endGame();                     // 誰も打てない → 終了
  } while (anyLegalKey(cur().id) == null);
  renderScorebar();
  updateUndoBtn();
  maybeCpu();
}

/* ============================================================
   終了 / 勝敗
   ============================================================ */
function endGame() {
  S.over = true; clearSave();
  chime();
  const ranked = [...S.players].sort((a, b) => b.score - a.score);
  const win = ranked[0];
  $("#win-emoji").textContent = win.face;
  $("#win-title").textContent = `${win.name} の勝ち！`;
  $("#win-title").style.color = win.color;
  $("#win-sub").textContent = "コアの得点がいちばん多いプレイヤーの勝利 🎉";
  const stats = $("#win-stats"); stats.innerHTML = "";
  const medal = ["🥇", "🥈", "🥉"];
  ranked.forEach((p, i) => {
    const row = document.createElement("div");
    row.className = "win-row"; row.style.setProperty("--c", p.color);
    row.innerHTML = `<span class="pdot"></span><span class="nm">${medal[i] || (i + 1) + "位"} ${escapeHtml(p.name)}${i === 0 ? "（優勝）" : ""}${p.xvUid ? " 🔗" : ""}</span><span class="sc">${p.score}点</span>`;
    stats.appendChild(row);
  });
  renderScorebar(); updateUndoBtn();
  awardPrizes(ranked);
  setTimeout(() => toggleModal("#win", true), 700);
}

// 紐づけ済みプレイヤーへ順位賞金XEVAを配布（1位150/2位50、ポータルで受取）
function awardPrizes(ranked) {
  if (S.rewarded) return; S.rewarded = true;
  const top = ranked.slice(0, 5).map((p) => ({ uid: p.xvUid || null, name: p.name, game: "MagiShareCore" }));
  if (!window.GameLink || !top.some((t) => t && t.uid)) return;
  GameLink.awardPrizes(top).then((list) => {
    if (list && list.length) list.forEach((r, i) => setTimeout(() => toast(`🏆 ${r.name} に賞金 ${r.amount} XEVA！（ポータルで受取）`, "#ffab17"), 900 + i * 1200));
  });
}

/* ============================================================
   一手もどす
   ============================================================ */
function serializeState() {
  return {
    v: 1, cols: S.cols, rows: S.rows, n: S.n,
    cores: S.cores.map((row) => row.slice()),
    edges: Object.assign({}, S.edges),
    cells: S.cells.map((row) => row.map((c) => ({ claimed: c.claimed, top: c.top }))),
    players: S.players.map((p) => ({ id: p.id, color: p.color, face: p.face, name: p.name, type: p.type, score: p.score })),
    order: S.order.slice(), turnPos: S.turnPos, drawn: S.drawn, totalEdges: S.totalEdges,
    rewarded: S.rewarded || false, linked: S.linked || {},
  };
}
function pushHistory() {
  if (!S.history) S.history = [];
  S.history.push(serializeState());
  if (S.history.length > 30) S.history.shift();
  updateUndoBtn();
}
function updateUndoBtn() {
  const b = $("#undo-btn"); if (!b) return;
  b.disabled = !(S && !S.busy && !S.over && S.history && S.history.length);
}
function applySnapshot(d) {
  S.cores = d.cores.map((row) => row.slice());
  S.edges = Object.assign({}, d.edges);
  S.cells = d.cells.map((row) => row.map((c) => ({ claimed: c.claimed, top: c.top })));
  S.players.forEach((p) => { const sp = d.players.find((x) => x.id === p.id); if (sp) p.score = sp.score; });
  S.order = d.order.slice(); S.turnPos = d.turnPos; S.drawn = d.drawn;
  S.over = false;
}
function undoMove() {
  if (!S || S.busy || S.over) return;
  if (!S.history || !S.history.length) { toast("もう戻せる手がありません", "#8a819c"); return; }
  const d = S.history.pop();
  applySnapshot(d);
  renderBoard(); renderScorebar(); updateUndoBtn(); saveGame();
  toast("↩ 一手もどしました", "#37c8ff");
  // 巻き戻し先が人間手番でない場合でも、ここでは自動で打たせない（プレイヤーが考え直せるように）
}

/* ============================================================
   保存 / 再開
   ============================================================ */
function saveGame() { if (!S || S.over) return; try { localStorage.setItem(SAVE_KEY, JSON.stringify(serializeState())); } catch (e) {} }
function loadSave() { try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} refreshResume(); }
function resumeGame() {
  const d = loadSave(); if (!d) { refreshResume(); return; }
  S = {
    cols: d.cols, rows: d.rows, n: d.n,
    cores: d.cores.map((row) => row.slice()),
    edges: Object.assign({}, d.edges),
    cells: d.cells.map((row) => row.map((c) => ({ claimed: c.claimed, top: c.top }))),
    players: d.players.map((p) => ({ ...p })),
    order: d.order.slice(), turnPos: d.turnPos, drawn: d.drawn, totalEdges: d.totalEdges,
    busy: false, over: false, history: [], rewarded: d.rewarded || false,
    linked: d.linked || {},
  };
  _edgeKeysCache = null;
  document.body.classList.toggle("wide-board", S.cols >= 6);
  showScreen("#game");
  renderBoard(); renderScorebar(); updateUndoBtn();
  toast("▶ つづきから再開！", "#12b886");
  maybeCpu();
}

/* ============================================================
   CPU（貪欲：即得点を最大化しつつ、高コアを安く渡さない）
   ============================================================ */
function maybeCpu() {
  if (S.over) return;
  if (cur().type === "cpu") { $("#thinking").classList.remove("hidden"); setTimeout(cpuMove, 640); }
  else $("#thinking").classList.add("hidden");
}
function cpuMove() {
  $("#thinking").classList.add("hidden");
  if (S.over || S.busy) return;
  if (cur().type !== "cpu") return;
  const me = cur().id;
  const legal = legalKeysFor(me);
  if (!legal.length) { nextTurn(); return; }
  let best = null, bestScore = -1e9;
  for (const key of legal) {
    let gain = 0, risk = 0;
    for (const [r, c] of edgeCells(key)) {
      const cell = S.cells[r][c]; if (cell.claimed) continue;
      const owners = edgeOwners(r, c, key, me);
      const filled = owners.filter((o) => o != null).length;
      const V = S.cores[r][c];
      if (filled === 4) {                                   // 自分がこの部屋を閉じる
        const counts = {}; owners.forEach((o) => counts[o] = (counts[o] || 0) + 1);
        const dist = distribute(V, counts); gain += (dist[me] || 0);
      } else if (filled === 3) {                            // 3辺にしてしまう＝相手が閉じられる状態を作る
        risk += V * 0.25;
      }
    }
    const sc = gain * 1.0 - risk * 0.7 + Math.random() * 0.3;
    if (sc > bestScore) { bestScore = sc; best = key; }
  }
  if (best) attemptMove(best, true); else nextTurn();
}

/* ============================================================
   描画（SVG）
   ============================================================ */
const UNIT = 84, MARGIN = 30;
function boardPx() { return { w: MARGIN * 2 + S.cols * UNIT, h: MARGIN * 2 + S.rows * UNIT }; }
function dotXY(r, c) { return { x: MARGIN + c * UNIT, y: MARGIN + r * UNIT }; }
function cellCenter(r, c) { return { x: MARGIN + (c + 0.5) * UNIT, y: MARGIN + (r + 0.5) * UNIT }; }
function edgeGeom(key) {
  const [t, a, b] = key.split(":"); const r = +a, c = +b;
  if (t === "H") { const p1 = dotXY(r, c), p2 = dotXY(r, c + 1); return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y }; }
  const p1 = dotXY(r, c), p2 = dotXY(r + 1, c); return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y };
}
function colorOf(pid) { const p = S.players.find((x) => x.id === pid); return p ? p.color : "#999"; }

function renderBoard() {
  const { w, h } = boardPx();
  const NS = "http://www.w3.org/2000/svg";
  let svg = `<svg viewBox="0 0 ${w} ${h}" xmlns="${NS}">`;
  // セル塗り + コア
  for (let r = 0; r < S.rows; r++) for (let c = 0; c < S.cols; c++) {
    const p = dotXY(r, c);
    svg += `<rect class="cell-fill" id="fill-${r}-${c}" x="${p.x}" y="${p.y}" width="${UNIT}" height="${UNIT}" rx="10" fill="#8b5bff"></rect>`;
  }
  // コア（円 + 数字）
  for (let r = 0; r < S.rows; r++) for (let c = 0; c < S.cols; c++) {
    const V = S.cores[r][c]; if (!V) continue;
    const ct = cellCenter(r, c);
    svg += `<circle class="core" id="core-${r}-${c}" cx="${ct.x}" cy="${ct.y}" r="${UNIT * 0.29}" stroke="#c9bcdd"></circle>`;
    svg += `<text class="core-txt" id="coretxt-${r}-${c}" x="${ct.x}" y="${ct.y + UNIT * 0.11}" font-size="${UNIT * 0.34}" fill="#5a4b74">${V}</text>`;
  }
  // エッジ（線 + 透明ヒット）
  for (const key of allEdgeKeys()) {
    const g = edgeGeom(key);
    const drawn = S.edges[key] != null;
    const col = drawn ? colorOf(S.edges[key]) : "#eee3f0";
    svg += `<line class="edge-line ${drawn ? "" : "open"}" id="line-${key.replace(/:/g, "_")}" x1="${g.x1}" y1="${g.y1}" x2="${g.x2}" y2="${g.y2}" stroke="${col}"></line>`;
    svg += `<line class="edge-hit" data-key="${key}" x1="${g.x1}" y1="${g.y1}" x2="${g.x2}" y2="${g.y2}"></line>`;
  }
  // ドット
  for (let r = 0; r <= S.rows; r++) for (let c = 0; c <= S.cols; c++) {
    const p = dotXY(r, c);
    svg += `<circle class="dot" cx="${p.x}" cy="${p.y}" r="7"></circle>`;
  }
  svg += `</svg>`;
  const wrap = $("#board"); wrap.innerHTML = svg;
  // クリック委譲
  wrap.querySelector("svg").addEventListener("click", (e) => {
    const hit = e.target.closest(".edge-hit"); if (!hit) return;
    attemptMove(hit.dataset.key, false);
  });
  // 塗り済みセルを反映
  for (let r = 0; r < S.rows; r++) for (let c = 0; c < S.cols; c++) if (S.cells[r][c].claimed) paintCell(r, c);
}
function paintEdge(key) {
  const line = $("#line-" + key.replace(/:/g, "_")); if (!line) return;
  line.classList.remove("open");
  line.setAttribute("stroke", colorOf(S.edges[key]));
}
function paintCell(r, c) {
  const cell = S.cells[r][c];
  const fill = $("#fill-" + r + "-" + c);
  if (fill && cell.claimed && cell.top != null) { fill.setAttribute("fill", colorOf(cell.top)); fill.classList.add("claimed"); }
  const core = $("#core-" + r + "-" + c), txt = $("#coretxt-" + r + "-" + c);
  if (core && cell.claimed && cell.top != null) { core.setAttribute("stroke", colorOf(cell.top)); core.setAttribute("stroke-width", "6"); }
  if (txt && cell.claimed && cell.top != null) txt.setAttribute("fill", colorOf(cell.top));
}
function blinkEdge(key) {
  const line = $("#line-" + key.replace(/:/g, "_")); if (!line) return;
  line.classList.add("illegal-blink"); setTimeout(() => line.classList.remove("illegal-blink"), 320);
}

function renderScorebar() {
  const bar = $("#scorebar"); bar.innerHTML = "";
  S.order.forEach((pid) => {
    const p = S.players.find((x) => x.id === pid);
    const active = !S.over && cur().id === pid;
    const chip = document.createElement("div");
    chip.className = "pchip" + (active ? " active" : "");
    chip.style.setProperty("--c", p.color);
    chip.innerHTML = `<span class="cdot"></span>
      <span class="cinfo"><span class="cname">${p.face} ${escapeHtml(p.name)}${p.type === "cpu" ? " <span style='color:var(--muted)'>CPU</span>" : ""}</span>
      <span class="cturn">${active ? "▶ あなたの番" : ""}</span></span>
      <span class="cscore">${p.score}</span>`;
    bar.appendChild(chip);
  });
}

/* ============================================================
   動的チュートリアル（ミニ盤でアニメ実演）
   ============================================================ */
const TU = 92, TM = 26;
const TC = { pink: "#ff5d8f", blue: "#37c8ff", open: "#e6dcef", ink: "#3a2a4a" };
function tDot(r, c) { return { x: TM + c * TU, y: TM + r * TU }; }
function tBW(cols) { return TM * 2 + cols * TU; }
function tGrid(rows, cols) { let s = ""; for (let r = 0; r <= rows; r++) for (let c = 0; c <= cols; c++) { const p = tDot(r, c); s += `<circle cx="${p.x}" cy="${p.y}" r="6" fill="${TC.ink}"></circle>`; } return s; }
function tEdge(id, r1, c1, r2, c2, color) { const a = tDot(r1, c1), b = tDot(r2, c2); return `<line id="${id}" class="t-edge" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${color}"></line>`; }
function tCore(r, c, v, color) { const x = TM + (c + .5) * TU, y = TM + (r + .5) * TU; return `<circle id="tcore-${r}-${c}" cx="${x}" cy="${y}" r="${TU * .27}" fill="#fff" stroke="${color || "#c9bcdd"}" stroke-width="4"></circle><text id="tcoretx-${r}-${c}" x="${x}" y="${y + TU * .11}" text-anchor="middle" font-size="${TU * .32}" font-weight="900" font-family="'Segoe UI',Arial" fill="${color || "#5a4b74"}">${v}</text>`; }
function tFill(id, r, c, color) { const p = tDot(r, c); return `<rect id="${id}" class="t-fill" x="${p.x}" y="${p.y}" width="${TU}" height="${TU}" rx="10" fill="${color}"></rect>`; }
function tSvg(rows, cols, inner) { return `<svg viewBox="0 0 ${tBW(cols)} ${tBW(rows)}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`; }
function tSet(id, attr, val) { const el = document.getElementById(id); if (el) el.setAttribute(attr, val); }
function tShow(id) { const el = document.getElementById(id); if (el) el.classList.add("show"); }

let tutIndex = 0, _tutToken = 0;
function later(fn, ms) { const tk = _tutToken; setTimeout(() => { if (tk === _tutToken && $("#rules") && !$("#rules").classList.contains("hidden")) fn(); }, ms); }

const TUT_STEPS = [
  { // 1: 線を引く
    cap: "手番でやることは、ドットとドットを結んで <b>線を1本</b> 引くだけ。テンポよく進みます。",
    build: () => tSvg(2, 2, tFill("f11", 1, 1, TC.pink) + tCore(0, 1, 3) + tCore(1, 0, 5) +
      tEdge("e1", 0, 0, 0, 1, TC.open) + tGrid(2, 2)),
    run: () => { later(() => { tSet("e1", "stroke", TC.pink); blip(560, 0.05, "triangle"); }, 500); }
  },
  { // 2: 部屋を閉じて分配
    cap: "部屋が閉じると中の<b>コア</b>を、辺を引いた人へ<b>貢献度で分配</b>（例: この部屋は <span class='blue'>青</span>+2 ／ <b>桃</b>+4）。",
    build: () => tSvg(2, 2, tFill("f00", 0, 0, TC.pink) + tCore(0, 0, 6) +
      tEdge("t", 0, 0, 0, 1, TC.pink) + tEdge("l", 0, 0, 1, 0, TC.pink) +
      tEdge("r", 0, 1, 1, 1, TC.blue) + tEdge("b", 1, 0, 1, 1, TC.open) + tGrid(2, 2)),
    run: () => {
      later(() => { tSet("b", "stroke", TC.blue); blip(560, 0.05, "triangle"); }, 600);
      later(() => { tShow("f00"); tSet("tcore-0-0", "stroke", TC.pink); tSet("tcoretx-0-0", "fill", TC.pink); chime(); }, 1150);
    }
  },
  { // 3: 独占禁止
    cap: "自分（<b>桃</b>）の色<b>だけ</b>で部屋を閉じるのは<b>反則</b>。必ず他の色と協力して閉じます。",
    build: () => tSvg(2, 2, tCore(0, 0, 5) +
      tEdge("t", 0, 0, 0, 1, TC.pink) + tEdge("l", 0, 0, 1, 0, TC.pink) + tEdge("b", 1, 0, 1, 1, TC.pink) +
      tEdge("r", 0, 1, 1, 1, TC.open) + tGrid(2, 2) +
      `<line id="x1" class="t-x" x1="${TM + 18}" y1="${TM + 18}" x2="${TM + TU - 18}" y2="${TM + TU - 18}"></line>` +
      `<line id="x2" class="t-x" x1="${TM + TU - 18}" y1="${TM + 18}" x2="${TM + 18}" y2="${TM + TU - 18}"></line>`),
    run: () => { later(() => { tSet("r", "stroke", TC.pink); }, 500); later(() => { tShow("x1"); tShow("x2"); blip(150, 0.14, "square"); }, 900); }
  },
  { // 4: 相乗りの読み合い
    cap: "相手（<span class='blue'>青</span>）の線の近くに引けば、高得点コアを<b>相乗りで山分け</b>。<b>誰と組むか</b>の読み合いがカギ！",
    build: () => tSvg(2, 2, tFill("f01", 0, 1, TC.blue) + tCore(0, 1, 9) +
      tEdge("bt", 0, 1, 0, 2, TC.blue) + tEdge("br", 0, 2, 1, 2, TC.blue) +
      tEdge("bl", 0, 1, 1, 1, TC.open) + tEdge("bb", 1, 1, 1, 2, TC.open) + tGrid(2, 2)),
    run: () => {
      later(() => { tSet("bl", "stroke", TC.pink); blip(520, 0.05, "triangle"); }, 500);
      later(() => { tSet("bb", "stroke", TC.pink); blip(560, 0.05, "triangle"); }, 950);
      later(() => { tShow("f01"); tSet("tcore-0-1", "stroke", TC.pink); chime(); }, 1400);
    }
  },
  { // 5: 勝敗
    cap: "すべての線が引き終わったら終了。<b>合計得点が一番多い人の勝ち！</b> さあ、始めよう。",
    build: () => tSvg(2, 2,
      tFill("g00", 0, 0, TC.pink) + tFill("g01", 0, 1, TC.blue) + tFill("g10", 1, 0, TC.blue) + tFill("g11", 1, 1, TC.pink) +
      tCore(0, 0, 6) + tCore(0, 1, 3) + tCore(1, 0, 4) + tCore(1, 1, 7) + tGrid(2, 2)),
    run: () => { ["g00", "g01", "g10", "g11"].forEach((id, i) => later(() => { tShow(id); blip(500 + i * 60, 0.05, "triangle"); }, 300 + i * 220)); }
  }
];

function openTutorial() { toggleModal("#rules", true); tutGoto(0); }
function tutGoto(i) {
  i = Math.max(0, Math.min(TUT_STEPS.length - 1, i));
  tutIndex = i; _tutToken++;
  const step = TUT_STEPS[i];
  $("#tut-n").textContent = i + 1;
  $("#tut-total").textContent = TUT_STEPS.length;
  $("#tut-stage").innerHTML = step.build();
  $("#tut-cap").innerHTML = step.cap;
  $("#tut-prev").style.visibility = i === 0 ? "hidden" : "visible";
  $("#tut-next").textContent = i >= TUT_STEPS.length - 1 ? "とじる ✓" : "つぎへ ▶";
  requestAnimationFrame(() => { try { step.run(); } catch (e) {} });
}

/* ---------- boot ---------- */
window.addEventListener("DOMContentLoaded", initSetup);
