/* ============================================================
   Magi Lotto — 抽選サーバー層
   ------------------------------------------------------------
   ★ ここだけが「結果を決める」場所。画面（ml-games.js / ml-grand.js）は
     結果をもらって演出するだけで、出目には一切さわらない。

   ══ どうやって「サーバーが決めている」と言えるのか ══
   この製品には Cloud Functions が無く、使えるのは Realtime Database だけ。
   そこで <b>クライアントが選べない値でしか結果が決まらない</b>ようにしてある。

     ① 購入を「作るだけ（create-only）」のノードへ1回で書きこむ。
        中身は「どのゲームを・いくらで・どの数字で買ったか」＋ at: serverTimestamp()。
        Firebase のルールで<b>すでにある tx は上書きも削除もできない</b>ので、
        同じ txId で引き直すことはできない。
     ② 書きこんだあと読み返すと、at が<b>サーバーの時刻</b>に解決されている。
        これはクライアントが選べない値で、しかも
        <b>賭けを確定させたあとでしか分からない</b>。
        （＝「結果を見てからやめる」ができない。賭けは先に確定している）
     ③ 出目は sha256(uid | txId | サーバー時刻 | その回の塩) から決める。
        塩（salt）もサーバーに1回だけ書かれる共有の値。
        クライアントの乱数は1ビットも使わない。あとから誰でも同じ手順で検算できる。
     ④ 結果は tx/{txId}/result へ（これも作るだけ）。
        <b>結果を書いてから通貨を動かす</b>ので、途中で通信が切れても
        当選が消えることはない（次に開いたときに未精算ぶんを精算する）。

   ★ オフライン／アカウント未作成のとき
     サーバーが使えないので、その場の安全な乱数（crypto.getRandomValues）で決める。
     この回は「ローカル抽選」として履歴に印を残す。通信が戻ればサーバー台帳へ写す。

   ★ 二重購入・二重付与をどう防ぐか
     ・購入のたびに端末側で txId を作り、<b>先に支払いを済ませてから</b>
       pending（未精算）として保存する。
     ・pending は「支払い済み・結果まだ」の状態。次の起動時に必ず再開する。
     ・サーバー側は create-only なので、同じ txId を2回書いても2回目は無視される。
     ・付与が済んだら paid の印を立て、pending から外す。
   ============================================================ */
(function () {
  "use strict";
  const ML = window.ML;
  if (!ML) return;

  const PEND_KEY = "ml_pending_v1";   // ★ 端末ローカル（同期しない。その端末で払ったぶんの後始末）

  /* ── 未精算リスト（支払い済み・結果まだ／結果あり・付与まだ）── */
  function loadPend() {
    try { const r = localStorage.getItem(PEND_KEY); if (r) { const p = JSON.parse(r); if (Array.isArray(p)) return p; } } catch (e) {}
    return [];
  }
  function savePend(a) { try { localStorage.setItem(PEND_KEY, JSON.stringify(a.slice(0, 40))); } catch (e) {} }
  function addPend(o) { const a = loadPend(); a.push(o); savePend(a); }
  function dropPend(txId) { savePend(loadPend().filter((x) => x.txId !== txId)); }
  function patchPend(txId, patch) {
    const a = loadPend();
    const i = a.findIndex((x) => x.txId === txId);
    if (i >= 0) { a[i] = Object.assign(a[i], patch); savePend(a); }
  }

  /* ── sha256（16進）。サーバー側と同じ手順＝どちらで計算しても同じ ── */
  async function sha256hex(s) {
    try {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(s)));
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch (e) { return ""; }
  }

  /* ── ハッシュから乱数の列を作る ──
     足りなくなったら base に連番を足して再ハッシュする（無限に伸ばせる）。
     同じ base からは必ず同じ列が出る＝検算できる。 */
  function stream(base) {
    let buf = [], idx = 0, round = 0;
    async function fill() {
      const h = await sha256hex(base + "|" + (round++));
      if (!h) {                                  // crypto.subtle が使えない環境の保険
        const a = new Uint32Array(8); crypto.getRandomValues(a);
        for (let i = 0; i < 8; i++) buf.push(a[i]);
        return;
      }
      for (let i = 0; i < 8; i++) buf.push(parseInt(h.substr(i * 8, 8), 16));
    }
    const api = {
      async u32() { if (idx >= buf.length) await fill(); return buf[idx++]; },
      async f() { return (await api.u32()) / 4294967296; },
      async i(n) { return Math.floor((await api.f()) * n); },
    };
    return api;
  }

  /* ══════════════════════════════════════════════════════════
     出目を決める（ゲームごと）
     ★ 引数の rng は上の stream。await で1つずつ取り出す。
     ══════════════════════════════════════════════════════════ */

  /* ── SCRATCH ──
     まず「どのランクか」を決め、そのあと 3×3 の絵柄を組み立てる。
     ★ 絵柄は結果の“見せ方”であって、結果そのものではない。
       ここで大事なのは<b>ウソをつかないこと</b>——
       ・当たりのランクの絵柄はきっちり3つ置く
       ・ほかの絵柄は<b>絶対に3つ置かない</b>（見た目と結果が食いちがわない）
       ・ハズレでも「あと1つで揃う（2つ並び）」を必ず1つ以上作る
         → 最後の1マスを削る瞬間のドキドキが、毎回ちゃんと来る。 */
  async function rollScratch(rng) {
    const c = ML.cfg().scratch;
    let r = await rng.f();
    let tier = null;
    for (const t of c.tiers) { if (r < t.prob) { tier = t; break; } r -= t.prob; }
    const grid = await buildScratchGrid(rng, tier);
    return {
      tier: tier ? tier.id : "miss",
      mul: tier ? tier.mul : 0,
      nm: tier ? tier.nm : "はずれ",
      grid,
    };
  }
  /* 絵柄の並び順は「弱い→強い」。ハズレのときの“2つ並び”にも使う。 */
  const SC_SYM = ["s1", "s2", "s3", "s4", "s5", "s6"];
  async function buildScratchGrid(rng, tier) {
    const cells = new Array(9).fill(null);
    const idx = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    /* シャッフル（並べる位置をばらす） */
    for (let i = idx.length - 1; i > 0; i--) { const j = await rng.i(i + 1); const t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
    let p = 0;
    const used = {};                                  // 絵柄 → いま何個置いたか
    const put = (sym, n) => { for (let k = 0; k < n; k++) { cells[idx[p++]] = sym; } used[sym] = (used[sym] || 0) + n; };
    if (tier) put(tier.id, 3);
    /* ★ あと1つで揃う（2つ並び）を1〜2組つくる。当たりの絵柄より“弱い”ものを選ぶと
       「惜しかった」ではなく「上を狙えた」感じになるので、上下どちらからも選ぶ。 */
    const teaseN = tier ? 1 : (await rng.f()) < 0.45 ? 2 : 1;
    for (let t = 0; t < teaseN; t++) {
      if (9 - p < 2) break;
      let s = null;
      for (let tryN = 0; tryN < 12 && !s; tryN++) {
        const cand = SC_SYM[await rng.i(SC_SYM.length)];
        if ((used[cand] || 0) === 0 && !(tier && cand === tier.id)) s = cand;
      }
      if (s) put(s, 2);
    }
    /* 残りを埋める。★ ここで3つ目が揃わないよう、必ず 2個未満の絵柄から選ぶ */
    while (p < 9) {
      let s = null;
      for (let tryN = 0; tryN < 30 && !s; tryN++) {
        const cand = SC_SYM[await rng.i(SC_SYM.length)];
        if ((used[cand] || 0) < 2 && !(tier && cand === tier.id)) s = cand;
      }
      if (!s) s = SC_SYM.find((x) => (used[x] || 0) < 2 && !(tier && x === tier.id)) || SC_SYM[0];
      put(s, 1);
    }
    return cells;
  }

  /* ── NUMBERS（3桁）──
     抽選は「0〜9 を3つ」引くだけ。判定は pick と突き合わせる。 */
  async function rollNumbers(rng, pick) {
    const c = ML.cfg().numbers;
    const win = [];
    for (let i = 0; i < c.digits; i++) win.push(await rng.i(10));
    return Object.assign({ win }, judgeNumbers(pick, win));
  }
  function judgeNumbers(pick, win) {
    const c = ML.cfg().numbers;
    const pat = ML.numPattern(pick);
    let posHit = 0;
    for (let i = 0; i < win.length; i++) if (pick[i] === win[i]) posHit++;
    const sortedEq = pick.slice().sort().join("") === win.slice().sort().join("");
    if (posHit === win.length) return { tier: "straight", mul: c.straight[pat] || 0, nm: "ストレート（完全一致）", posHit, pat };
    if (sortedEq) return { tier: "box", mul: c.box[pat] || 0, nm: "ボックス（順不同一致）", posHit, pat };
    if (posHit === 2) return { tier: "pos2", mul: c.pos2, nm: "2桁一致", posHit, pat };
    if (posHit === 1) return { tier: "pos1", mul: c.pos1, nm: "1桁一致", posHit, pat };
    return { tier: "miss", mul: 0, nm: "はずれ", posHit, pat };
  }

  /* ── LOTTO（1〜36 から6個）── */
  async function rollLotto(rng, pick) {
    const c = ML.cfg().lotto;
    const bag = [];
    for (let i = 1; i <= c.range; i++) bag.push(i);
    const win = [];
    for (let i = 0; i < c.pick; i++) { const j = await rng.i(bag.length); win.push(bag.splice(j, 1)[0]); }
    win.sort((a, b) => a - b);
    return Object.assign({ win }, judgeLotto(pick, win));
  }
  function judgeLotto(pick, win) {
    const c = ML.cfg().lotto;
    const hit = pick.filter((n) => win.indexOf(n) >= 0);
    const k = hit.length;
    const mul = c.mul[k] || 0;
    return { tier: mul ? "m" + k : "miss", mul, nm: mul ? (c.nm[k] || k + "個一致") : "はずれ", hit, k };
  }

  /* ── MAGI GRAND DRAW ──
     購入時点では結果を出さない（発表は毎月1日・16日）。
     ここでは「口」を登録するだけ。判定は下の settleGrand。 */
  function judgeGrand(pick, draw) {
    const c = ML.cfg().grand;
    const hit = pick.filter((n) => draw.main.indexOf(n) >= 0);
    const k = hit.length;
    const magi = pick.indexOf(draw.magi) >= 0;
    if (k === c.pick) return { tier: "r1", rank: 1, mul: 0, jackpot: true, nm: "1等（" + c.pick + "個一致）", hit, magi };
    if (k === c.pick - 1 && magi) return { tier: "r2", rank: 2, mul: c.mul.r2, nm: "2等（" + (c.pick - 1) + "個＋MAGIボール）", hit, magi };
    if (k === c.pick - 1) return { tier: "r3", rank: 3, mul: c.mul.r3, nm: "3等（" + (c.pick - 1) + "個一致）", hit, magi };
    if (k === c.pick - 2 && magi) return { tier: "r4", rank: 4, mul: c.mul.r4, nm: "4等（" + (c.pick - 2) + "個＋MAGIボール）", hit, magi };
    if (k === c.pick - 2) return { tier: "r5", rank: 5, mul: c.mul.r5, nm: "5等（" + (c.pick - 2) + "個一致）", hit, magi };
    return { tier: "miss", rank: 0, mul: 0, nm: "はずれ", hit, magi };
  }

  /* ── FREE MAGI（無料・1日1回）── */
  async function rollFree(rng) {
    const list = ML.cfg().free.wheel;
    let tot = 0; list.forEach((x) => { tot += x.w; });
    let r = (await rng.f()) * tot;
    for (let i = 0; i < list.length; i++) { r -= list[i].w; if (r < 0) return { i, item: list[i] }; }
    return { i: 0, item: list[0] };
  }

  /* ══════════════════════════════════════════════════════════
     購入 → 抽選 → 付与（この1本にまとめる）
     ══════════════════════════════════════════════════════════ */
  function newTxId() {
    const a = new Uint32Array(2); crypto.getRandomValues(a);
    return Date.now().toString(36) + "-" + a[0].toString(36) + a[1].toString(36);
  }

  /* サーバーへ購入を書きこみ、結果を決める種（サーバー時刻＋塩）をもらう。
     取れなければ null を返す（＝ローカル抽選に落ちる）。 */
  async function serverSeed(txId, body) {
    const F = ML.fb(), uid = ML.uid();
    if (!F || !uid || ML.offline() || !F.mlCommit) return null;
    try {
      const r = await F.mlCommit(uid, txId, body);
      if (!r || r.error || !r.at) return null;
      const salt = (await F.mlSalt(ML.today())) || "";
      return { at: r.at, salt, uid };
    } catch (e) { return null; }
  }

  /* 1回ぶんの抽選を走らせる（支払いは済んでいる前提） */
  async function runOne(p) {
    /* p = { txId, game, stake, pick } */
    const body = { game: p.game, bet: p.stake, pay: "xeva", n: 1 };
    if (p.pick) body.pick = p.pick.join(",");
    const seed = await serverSeed(p.txId, body);
    let base, srv = false;
    if (seed) { base = seed.uid + "|" + p.txId + "|" + seed.at + "|" + seed.salt; srv = true; }
    else {
      /* オフライン／アカウント未作成。その場の安全な乱数で決める（履歴に印を残す） */
      const a = new Uint32Array(4); crypto.getRandomValues(a);
      base = "local|" + p.txId + "|" + Array.from(a).join("-");
    }
    const rng = stream(base);
    let out;
    if (p.game === "scratch") out = await rollScratch(rng);
    else if (p.game === "numbers") out = await rollNumbers(rng, p.pick);
    else if (p.game === "lotto") out = await rollLotto(rng, p.pick);
    else if (p.game === "free") out = await rollFree(rng);
    else out = { tier: "miss", mul: 0 };
    out.server = srv;
    /* 結果をサーバー台帳へ（作るだけ・以後は変えられない） */
    if (srv) {
      const F = ML.fb();
      try {
        const w = await F.mlCommitResult(ML.uid(), p.txId, {
          tier: out.tier || "miss", mul: out.mul || 0,
          win: out.win ? out.win.join(",") : "", grid: out.grid ? out.grid.join(",") : "",
        });
        /* すでに結果が入っていたら、そちらが正（別端末で先に引いていた） */
        if (w && w.dup && w.result) {
          out.tier = w.result.tier; out.mul = w.result.mul;
          if (w.result.win) out.win = w.result.win.split(",").map(Number);
          if (w.result.grid) out.grid = w.result.grid.split(",");
          if (p.game === "numbers" && out.win) Object.assign(out, judgeNumbers(p.pick, out.win));
          if (p.game === "lotto" && out.win) Object.assign(out, judgeLotto(p.pick, out.win));
        }
      } catch (e) {}
    }
    return out;
  }

  /* 当選金を払う（結果が確定したあとに1回だけ）。戻り値は付与した XEVA。 */
  function payout(p, out) {
    const win = Math.round((p.stake || 0) * (out.mul || 0));
    if (win > 0) ML.winXeva(win, gameName(p.game) + "：" + (out.nm || ""));
    const F = ML.fb();
    if (F && F.mlMarkPaid && ML.uid()) { try { F.mlMarkPaid(ML.uid(), p.txId); } catch (e) {} }
    return win;
  }
  function gameName(g) {
    return { scratch: "SCRATCH", numbers: "NUMBERS", lotto: "LOTTO", grand: "MAGI GRAND DRAW", free: "FREE MAGI" }[g] || g;
  }

  /* ══ 表の入口：1枚（1口）買って結果をもらう ══
     ★ 支払いは XEVA だけ（2026-08-13〜）。値段がそのまま賭け金になる。
     戻り値 { ok, out, win, stake, txId } / 買えないときは { ok:false, why } */
  async function buy(game, pick) {
    const c = ML.cfg();
    const stake = game === "scratch" ? c.scratch.price
      : game === "numbers" ? c.numbers.price
      : game === "lotto" ? c.lotto.price
      : game === "grand" ? c.grand.price : 0;
    if (!ML.canPay(stake)) return { ok: false, why: "poor", stake };
    const txId = newTxId();
    /* ① 先に支払う。ここで失敗したら何も起きない。 */
    if (!ML.pay(stake, gameName(game))) return { ok: false, why: "poor", stake };
    /* ② 未精算として残す（この先どこで止まっても、次の起動でやり直せる） */
    const p = { txId, game, stake, pick: pick || null, at: Date.now() };
    addPend(p);
    /* ③ 賞金プールへ積む（購入額の一部。Magi Grand Draw の原資） */
    ML.poolAccrue(stake);
    /* XEVARION のスターターミッション「くじを1枚買ってみよう」。
       支払いが通った時点で達成（抽選の結果は問わない）。 */
    try { if (window.XEVA && window.XEVA.completeMission) window.XEVA.completeMission("magilotto_buy"); } catch (e) {}
    /* ④ 抽選 → 付与 */
    const out = await runOne(p);
    const win = payout(p, out);
    dropPend(txId);
    ML.record({
      game, txId, betXeva: stake,
      win, tier: out.tier, tierNm: out.nm, mul: out.mul || 0,
      detail: detailOf(game, p, out), server: !!out.server,
    });
    return { ok: true, out, win, stake, txId };
  }

  function detailOf(game, p, out) {
    if (game === "numbers") return { pick: p.pick, win: out.win, posHit: out.posHit };
    if (game === "lotto") return { pick: p.pick, win: out.win, k: out.k };
    if (game === "scratch") return { grid: out.grid };
    return {};
  }

  /* ══ FREE MAGI（無料・1日1回）══ */
  async function spinFree() {
    const S = ML.state();
    const d = ML.today();
    if (S.freeDay === d) return { ok: false, why: "done" };
    const txId = newTxId();
    const p = { txId, game: "free", stake: 0, at: Date.now() };
    /* 先に「今日は引いた」を確定させる（演出の途中で閉じても二重に引けない） */
    const prev = S.freeDay;
    S.freeDay = d;
    S.freeStreak = isYesterday(prev) ? (S.freeStreak || 0) + 1 : 1;
    S.freeTotal = (S.freeTotal || 0) + 1;
    ML.saveNow();
    addPend(p);
    const out = await runOne(p);
    const it = out.item || {};
    const gotX = it.xeva ? ML.winXeva(it.xeva, "FREE MAGI") : 0;
    const gotG = it.gem ? ML.winGem(it.gem, "FREE MAGI") : 0;
    const F = ML.fb();
    if (F && F.mlMarkPaid && ML.uid()) { try { F.mlMarkPaid(ML.uid(), txId); } catch (e) {} }
    dropPend(txId);
    ML.record({ game: "free", txId, betXeva: 0, win: gotX, winGem: gotG,
      tier: it.id || "f1", tierNm: it.nm || "", mul: 0, detail: { i: out.i }, server: !!out.server });
    return { ok: true, i: out.i, item: it, xeva: gotX, gem: gotG, streak: S.freeStreak };
  }
  function isYesterday(dstr) {
    if (!dstr) return false;
    const y = new Date(); y.setDate(y.getDate() - 1);
    return ML.ymd(y) === dstr;
  }
  function freeReady() { return ML.state().freeDay !== ML.today(); }
  /* 次に引けるまでの残り（0:00 リセット） */
  function freeLeftText() {
    const n = new Date(); n.setHours(24, 0, 0, 0);
    const ms = n - Date.now();
    const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? h + "時間" + m + "分" : m + "分";
  }

  /* ══════════════════════════════════════════════════════════
     MAGI GRAND DRAW
     ══════════════════════════════════════════════════════════ */
  /* 口を買う（結果は発表日まで出ない） */
  async function buyGrand(pick) {
    const c = ML.cfg().grand;
    const stake = c.price;
    if (!ML.canPay(stake)) return { ok: false, why: "poor", stake };
    const txId = newTxId();
    if (!ML.pay(stake, "MAGI GRAND DRAW")) return { ok: false, why: "poor", stake };
    const pid = ML.periodId();
    /* サーバーの台帳にも「この回のこの口を買った」を残す（作るだけ） */
    const F = ML.fb();
    if (F && F.mlCommit && ML.uid() && !ML.offline()) {
      try { await F.mlCommit(ML.uid(), txId, { game: "grand", bet: stake, pay: "xeva", n: 1, pick: pick.join(",") }); } catch (e) {}
    }
    ML.poolAccrue(stake);
    try { if (window.XEVA && window.XEVA.completeMission) window.XEVA.completeMission("magilotto_buy"); } catch (e) {}
    const S = ML.state();
    if (!S.entries[pid]) S.entries[pid] = [];
    S.entries[pid].push({ id: txId, nums: pick.slice(), at: Date.now(), stake });
    S.lastGrand = pick.slice();
    ML.saveNow();
    ML.record({ game: "grand", txId, betXeva: stake,
      win: 0, tier: "entry", tierNm: "受付（" + pid + " の回）", mul: 0, detail: { pick: pick.slice(), period: pid } });
    return { ok: true, txId, pid, stake };
  }

  /* 発表日を過ぎた回を精算する。
     ★ 1等（プール全額）は runTransaction で払い出すので、二重には出ない。
     ★ 「その回を精算したか」は端末のセーブ（grandSeen）だけでなく、
       サーバーの settle-{period} という tx（作るだけ）でも守る。 */
  async function settleGrand() {
    const S = ML.state();
    const c = ML.cfg().grand;
    const out = [];
    const pids = Object.keys(S.entries || {}).sort();
    for (const pid of pids) {
      /* まだ発表前の回はそのまま置いておく */
      const drawAt = new Date(pid + "T00:00:00");
      if (Date.now() < drawAt.getTime()) continue;
      const list = S.entries[pid] || [];
      if (!list.length) { delete S.entries[pid]; continue; }
      /* 当せん番号（サーバーに1回だけ書かれ、以後は全員が同じものを読む） */
      const draw = await grandDrawOf(pid);
      if (!draw) continue;                       // まだ取れない（オフラインなど）。次の機会に
      /* 二重精算よけ：この回の精算 tx を1回だけ作る */
      const F = ML.fb(), sid = "settle-" + pid;
      let already = false;
      if (F && F.mlCommit && ML.uid() && !ML.offline()) {
        try {
          const r = await F.mlCommit(ML.uid(), sid, { game: "grand", bet: 0, n: 1 });
          if (r && r.dup) already = true;
        } catch (e) {}
      }
      const rows = [];
      let total = 0, jackpot = 0, best = "miss";
      for (const e of list) {
        const j = judgeGrand(e.nums, draw);
        let win = 0;
        if (j.jackpot) {
          if (!already) {
            win = await claimJackpot();
            jackpot += win;
          }
        } else if (j.mul > 0 && !already) {
          win = Math.round(e.stake * j.mul);
        }
        if (win > 0) ML.winXeva(win, "MAGI GRAND DRAW：" + j.nm);
        total += win;
        rows.push({ nums: e.nums, tier: j.tier, rank: j.rank, nm: j.nm, hit: j.hit, magi: j.magi, win, mul: j.mul });
        if (j.rank && (best === "miss" || j.rank < (rankOf(best) || 9))) best = j.tier;
      }
      delete S.entries[pid];
      /* ★ already＝別の端末ですでに精算済み。金額は向こうで受け取っているので、
         ここで払い直さないかわりに「受取済み」の印を残す（履歴に「はずれ」と出ないように）。 */
      S.grandSeen[pid] = { at: Date.now(), draw, rows, total, jackpot, n: list.length, already: !!already };
      ML.saveNow();
      if (!already) {
        ML.record({ game: "grand", txId: sid, betXeva: 0, win: total,
          tier: best, tierNm: "結果発表（" + pid + "）", mul: 0, detail: { period: pid, n: list.length } });
      }
      out.push({ pid, draw, rows, total, jackpot, n: list.length, already });
    }
    return out;
  }
  function rankOf(tier) { return { r1: 1, r2: 2, r3: 3, r4: 4, r5: 5 }[tier] || 0; }

  /* その回の当せん番号。サーバーに無ければ作って書く（先に書いた1つだけが残る）。 */
  async function grandDrawOf(pid) {
    const c = ML.cfg().grand;
    const F = ML.fb();
    if (F && F.mlGrandDraw && !ML.offline()) {
      try { const d = await F.mlGrandDraw(pid, c.range, c.pick); if (d && d.main) return d; } catch (e) {}
    }
    /* オフラインのときは、発表日そのものから決まる番号を使う（誰が計算しても同じ）。
       ★ サーバーに書かれた本物とは食いちがう可能性があるので、
         この値では<b>精算しない</b>（settleGrand は null のとき何もしない）。 */
    return null;
  }
  /* 1等の払い出し（プールを空にして、最低保証で底上げした額を受け取る） */
  async function claimJackpot() {
    const c = ML.cfg().grand;
    const F = ML.fb();
    if (F && F.mlPoolClaim && ML.uid() && !ML.offline()) {
      try { return await F.mlPoolClaim(ML.uid(), ML.myName(), c.minGuarantee); } catch (e) {}
    }
    return c.minGuarantee;      // 通信できないときも最低保証は必ず出す
  }

  /* ══════════════════════════════════════════════════════════
     未精算の後始末（起動時に1回）
     ★ 「買ったのに結果が出ないまま閉じた」を必ず拾う。
     ══════════════════════════════════════════════════════════ */
  async function resumePending() {
    const list = loadPend();
    if (!list.length) return [];
    const done = [];
    for (const p of list) {
      /* 30日以上前のものは、さすがに拾わない（履歴だけ残す） */
      if (Date.now() - (p.at || 0) > 30 * 86400000) { dropPend(p.txId); continue; }
      try {
        const out = await runOne(p);
        let win = 0, gotG = 0;
        if (p.game === "free") {
          const it = out.item || {};
          win = it.xeva ? ML.winXeva(it.xeva, "FREE MAGI（未精算ぶん）") : 0;
          gotG = it.gem ? ML.winGem(it.gem, "FREE MAGI（未精算ぶん）") : 0;
          const F = ML.fb();
          if (F && F.mlMarkPaid && ML.uid()) { try { F.mlMarkPaid(ML.uid(), p.txId); } catch (e) {} }
        } else {
          win = payout(p, out);
        }
        dropPend(p.txId);
        ML.record({ game: p.game, txId: p.txId, betXeva: p.stake,
          win, winGem: gotG, tier: out.tier, tierNm: (out.nm || "") + "（未精算ぶんの精算）", mul: out.mul || 0,
          detail: detailOf(p.game, p, out), server: !!out.server, resumed: true });
        done.push({ p, out, win, gem: gotG });
      } catch (e) { /* 次の起動でまた試す */ }
    }
    return done;
  }

  ML.draw = {
    buy, buyGrand, settleGrand, grandDrawOf, judgeGrand, judgeNumbers, judgeLotto,
    spinFree, freeReady, freeLeftText,
    resumePending, pending: loadPend, newTxId, stream, sha256hex, gameName,
  };
})();
