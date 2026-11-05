/* ============================================================
   MagiQuiz — アカウント・賞金・戦績（ゲーム本体と切りはなす）
   ★★ 2026-11-05 全面作り直し
   ------------------------------------------------------------
   ・席のつなぎかたは2つ：
     ① <b>この端末の本人</b>（チェックだけ）… XEVA をこの端末の財布に直接入れる＝<b>オフラインでも入る</b>（ご指定）。
        財布（xeva_wallet）は同期キーなので、オンラインに戻ると XEVA.add のぶんがクラウドへ足される（3方向マージ）。
     ② <b>アカウント連携</b>（表示名で検索 → 4桁パスワード）… まわりの人の賞金。実体は XEVARION 共通の GameLink / XEVARIONFB。
        ★ オフラインで試合が終わったときは<b>送り待ち</b>（magiquiz_prizeq_v1）に入れて、次にオンラインになったら送る。
   ・賞金は順位そのまま（1位 250・2位 200・3位 150・4位 100・5位 50 XEVA）。チーム戦はチームの順位をメンバー全員に。
     同じ順位＝同じ額。★ 3問以上答えた人だけ（RULE.PRIZE_MIN_ANS）。ひとりで遊んだときは 正解数×10（最大100）。
   ・戦績はこの端末に（連携した人は uid ごと・本人は "me"・ほかは名前ごと）。
   ・パスワードは保存しない（確認に使うだけ）。
   ============================================================ */
(function () {
  "use strict";
  const MQ = (window.MQ = window.MQ || {});
  const KEY = "magiquiz_link_v1";        /* この端末で前に連携した人（次回の候補） */
  const STATS = "magiquiz_stats_v1";
  const PRIZEQ = "magiquiz_prizeq_v1";   /* オンラインになったら送る賞金 */

  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || "[]") || []; } catch (e) { return []; } };
  const save = (a) => { try { localStorage.setItem(KEY, JSON.stringify(a.slice(0, 12))); } catch (e) {} };
  function remember(acc) {
    if (!acc || !acc.uid) return;
    const a = load().filter((x) => x.uid !== acc.uid);
    a.unshift({ uid: acc.uid, name: acc.name, charFile: acc.charFile || "", charId: acc.charId || "" });
    save(a);
  }
  /* この端末のアカウント（本人のチェックで使う） */
  function me() {
    try {
      const a = window.XEVA && XEVA.account ? XEVA.account.get() : JSON.parse(localStorage.getItem("xeva_account_v1") || "null");
      if (!a || !a.name) return null;
      return { uid: a.xvUid || "", name: a.name, charFile: a.charFile || "", charId: a.charId || "" };
    } catch (e) { return null; }
  }
  /* 小さいアイコン（XEVARION のアカウントのキャラの絵） */
  const thumb = (acc) => {
    if (!acc || !acc.charFile) return "";
    const X = window.XEVA || {};
    const f = X.canonCharFile ? X.canonCharFile(acc.charFile, acc.charId) : String(acc.charFile);
    if (!f) return "";
    const isMb = X.isMbCharFile ? X.isMbCharFile(f) : /^\.\.\/(img|MagiBurst\/img)\//.test(f);
    const th = isMb ? (X.charThumbFile ? X.charThumbFile(f) : f.replace(/\/([^/]+)$/, "/t_$1")) : f.replace(/\.(png|jpe?g)$/i, "") + ".jpg";
    return "../chars_s/" + th;
  };
  function refresh(acc) {
    if (!window.GameLink || !window.GameLink.refresh || !acc || !acc.uid || navigator.onLine === false) return Promise.resolve(null);
    return window.GameLink.refresh(acc).catch(() => null);
  }

  /* ══ 連携の手続き（画面は quiz-ui.js・ここは通信だけ） ══ */
  const fb = (ms) => (window.GameLink && GameLink.whenFB ? GameLink.whenFB(ms || 5000) : Promise.resolve(window.XEVARIONFB || null));
  async function search(name) {
    const FB = await fb();
    if (!FB) return { error: "net" };
    try {
      const rows = FB.searchAccounts ? await FB.searchAccounts(name) : await FB.findByName(name).then((u) => (u ? [u] : []));
      return { rows: rows || [] };
    } catch (e) { return { error: "net" }; }
  }
  async function verify(uid, pin) {
    const FB = await fb();
    if (!FB) return { error: "net" };
    try { const h = await FB.hashPw(pin); return { ok: !!(await FB.verifyGamePw(uid, h)) }; } catch (e) { return { error: "net" }; }
  }

  /* ══ 賞金 ══ */
  const PRIZES = () => (window.GameLink && GameLink.PRIZES) || [250, 200, 150, 100, 50];
  function queueLoad() { try { return JSON.parse(localStorage.getItem(PRIZEQ) || "[]") || []; } catch (e) { return []; } }
  function queueSave(a) { try { if (a.length) localStorage.setItem(PRIZEQ, JSON.stringify(a.slice(0, 80))); else localStorage.removeItem(PRIZEQ); } catch (e) {} }
  /* 送り待ちの賞金を送る（1件ずつ・送れたものだけ消す＝二重に送らない） */
  let flushing = false;
  async function flushQueue() {
    if (flushing || navigator.onLine === false) return 0;
    const q = queueLoad(); if (!q.length) return 0;
    flushing = true;
    let sent = 0;
    try {
      const FB = await fb(4000);
      if (FB && FB.awardXeva) {
        for (const it of q.slice()) {
          const r = await FB.awardXeva(it.uid, it.amt, it.why).catch(() => null);
          if (r && r.ok) { const cur = queueLoad(); const i = cur.findIndex((x) => x.id === it.id); if (i >= 0) { cur.splice(i, 1); queueSave(cur); } sent++; }
          else break;
        }
      }
    } catch (e) {}
    flushing = false;
    return sent;
  }
  window.addEventListener("online", () => { setTimeout(flushQueue, 1500); });

  /* 試合の結果：戦績をためて、賞金を配る。
     rows＝[{ id, uid, owner, name, rank, ok, n, pt, score, boom, fields:{f:{ok,n}}, topics:{t:{ok,n}} }]（チーム戦はメンバー1人ずつ）
     opt＝{ solo, mode, gid }  戻り値＝{ prizes:[{rank,name,amount,kind:"me"|"cloud"|"wait"}], note } */
  async function report(rows, opt) {
    opt = opt || {};
    const out = { prizes: [] };
    try {
      const st = stats();
      rows.forEach((p) => {
        const id = p.owner ? "me" : p.uid ? p.uid : "local:" + p.name;
        const r = st[id] || { name: p.name, games: 0, wins: 0, ok: 0, n: 0, best: 0, bestS: 0, boom: 0, fields: {}, topics: {}, at: 0 };
        r.name = p.name; r.games++; r.at = Date.now();
        if (p.rank === 1 && rows.length > 1) r.wins++;
        r.ok += p.ok || 0; r.n += p.n || 0; r.boom = (r.boom || 0) + (p.boom || 0);
        if (opt.mode === "tower" && (p.pt || 0) > (r.best || 0)) r.best = p.pt;
        if (opt.mode === "score" && (p.score || 0) > (r.bestS || 0)) r.bestS = p.score;
        r.fields = r.fields || {}; r.topics = r.topics || {};
        Object.keys(p.fields || {}).forEach((k) => { const a = r.fields[k] || (r.fields[k] = { ok: 0, n: 0 }); a.ok += p.fields[k].ok; a.n += p.fields[k].n; });
        Object.keys(p.topics || {}).forEach((k) => { const a = r.topics[k] || (r.topics[k] = { ok: 0, n: 0 }); a.ok += p.topics[k].ok; a.n += p.topics[k].n; });
        st[id] = r;
      });
      localStorage.setItem(STATS, JSON.stringify(st));
    } catch (e) {}
    /* XEVA ミッション「MagiQuiz でクイズ対戦をあそぼう」 */
    try { if (window.XEVA && XEVA.completeMission) XEVA.completeMission("magiquiz_play"); } catch (e) {}

    const RULE = MQ.Data.RULE, P = PRIZES();
    const pay = rows.map((p) => {
      if (!p.owner && !p.uid) return null;
      if (opt.solo) { const amt = Math.min(RULE.SOLO_MAX, (p.ok || 0) * RULE.SOLO_PER_OK); return amt > 0 ? { p, amt, why: "MagiQuiz ひとりプレイ" } : null; }
      if ((p.played != null ? p.played : p.n || 0) < RULE.PRIZE_MIN_ANS) { out.short = true; return null; }
      const amt = P[p.rank - 1];
      return amt ? { p, amt, why: p.rank + "位 賞金（MagiQuiz）" } : null;
    }).filter(Boolean);

    const queue = queueLoad();
    let online = navigator.onLine !== false, FB = null;
    if (pay.some((x) => !x.p.owner) && online) { try { FB = await fb(3000); } catch (e) { FB = null; } }
    for (const x of pay) {
      if (x.p.owner) {
        /* ご指定「その端末本人であれば、XEVA がオフラインでも入るように」→ この端末の財布へ直接 */
        try { if (window.XEVA) XEVA.add(x.amt, x.why); } catch (e) {}
        out.prizes.push({ rank: x.p.rank, name: x.p.name, amount: x.amt, kind: "me" });
        continue;
      }
      let done = false;
      if (FB && FB.awardXeva) { const r = await FB.awardXeva(x.p.uid, x.amt, x.why).catch(() => null); done = !!(r && r.ok); }
      if (!done) queue.push({ id: (opt.gid || Date.now()) + ":" + x.p.uid, uid: x.p.uid, amt: x.amt, why: x.why, at: Date.now() });
      out.prizes.push({ rank: x.p.rank, name: x.p.name, amount: x.amt, kind: done ? "cloud" : "wait" });
    }
    queueSave(queue);
    return out;
  }
  function stats() { try { return JSON.parse(localStorage.getItem(STATS) || "{}") || {}; } catch (e) { return {}; } }

  setTimeout(flushQueue, 4000);
  MQ.Account = { recent: load, remember, me, thumb, refresh, search, verify, report, stats, flushQueue, queueLoad };
})();
