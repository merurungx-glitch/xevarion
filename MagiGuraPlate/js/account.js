/* ============================================================
   MagiGura Plate — アカウント・賞金・戦績（ゲーム本体と切りはなす）
   ★★ 2026-11-17 XEVARION へ（ご指定「MagiQuiz のようなアカウント紐づけと、名前やアイコンなどを設定する機能も」）
   ------------------------------------------------------------
   ・席のつなぎかたは MagiQuiz と同じ2つ：
     ① この端末の本人（チェックだけ）… XEVA をこの端末の財布に直接入れる＝オフラインでも入る。
     ② アカウント連携（表示名で検索 → 4桁 PIN）… まわりの人の賞金。実体は XEVARION 共通の GameLink / XEVARIONFB。
        オフラインで試合が終わったときは送り待ち（guraplate_prizeq_v1）に入れて、次にオンラインになったら送る。
   ・賞金は順位そのまま（XEVARION の 1台を囲むゲームの共通表 GameLink.PRIZES＝1位 250・2位 200・3位 150・4位 100・5位 50）。
     同じ順位＝同じ額。人数が2人以上で、全員が2回以上置いた試合だけ（すぐ終わる試合で稼げないように）。
   ・戦績はこの端末に（連携した人は uid ごと・本人は "me"・ほかは名前ごと）。
   ・PIN は保存しない（確認に使うだけ）。
   ============================================================ */
(function (root) {
  'use strict';
  const GP = root.GP = root.GP || {};
  const LINK = 'guraplate_link_v1';       /* この端末で前に連携した人（次回の候補） */
  const STATS = 'guraplate_stats_v1';
  const PRIZEQ = 'guraplate_prizeq_v1';   /* オンラインになったら送る賞金 */
  const MIN_TURNS = 2;                     /* 賞金の条件：全員がこの回数以上置いた */

  const jget = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
  const jset = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 保存できない環境でも遊べる */ } };

  function recent() { const a = jget(LINK, []); return Array.isArray(a) ? a : []; }
  function remember(acc) {
    if (!acc || !acc.uid) return;
    const a = recent().filter((x) => x.uid !== acc.uid);
    a.unshift({ uid: acc.uid, name: acc.name, charFile: acc.charFile || '', charId: acc.charId || '' });
    jset(LINK, a.slice(0, 12));
  }
  /* この端末のアカウント（本人のチェックで使う） */
  function me() {
    try {
      const a = root.XEVA && XEVA.account ? XEVA.account.get() : JSON.parse(localStorage.getItem('xeva_account_v1') || 'null');
      if (!a || !a.name) return null;
      return { uid: a.xvUid || '', name: a.name, charFile: a.charFile || '', charId: a.charId || '' };
    } catch (e) { return null; }
  }
  /* 小さいアイコン（XEVORA アカウントのキャラの絵）。MagiQuiz の MQ.Account.thumb と同じ組み立て */
  function thumb(acc) {
    if (!acc || !acc.charFile) return '';
    const X = root.XEVA || {};
    const f = X.canonCharFile ? X.canonCharFile(acc.charFile, acc.charId) : String(acc.charFile);
    if (!f) return '';
    const isMb = X.isMbCharFile ? X.isMbCharFile(f) : /^\.\.\/(img|MagiBurst\/img)\//.test(f);
    const th = isMb ? (X.charThumbFile ? X.charThumbFile(f) : f.replace(/\/([^/]+)$/, '/t_$1')) : f.replace(/\.(png|jpe?g)$/i, '') + '.jpg';
    return '../chars_s/' + th;
  }
  /* アイコンにえらべる UR キャラ（XEVARION に実装されているもの・新しい順）。MagiQuiz と同じ */
  function urList() {
    let L = []; try { L = (root.XEVA && XEVA.MB_CHARS) || []; } catch (e) { L = []; }
    return L.filter((c) => c && c.rarLabel === 'UR' && c.mbId && c.file).slice().sort((a, b) => String(b.since || '').localeCompare(String(a.since || '')));
  }
  function picSrc(id) { const c = id ? urList().find((x) => x.mbId === id) : null; return c ? c.file : ''; }
  function refresh(acc) {
    if (!root.GameLink || !GameLink.refresh || !acc || !acc.uid || navigator.onLine === false) return Promise.resolve(null);
    return GameLink.refresh(acc).catch(() => null);
  }

  /* ══ 連携の手続き（画面は setup.js・ここは通信だけ） ══ */
  const fb = (ms) => (root.GameLink && GameLink.whenFB ? GameLink.whenFB(ms || 5000) : Promise.resolve(root.XEVARIONFB || null));
  async function search(name) {
    const FB = await fb();
    if (!FB) return { error: 'net' };
    try {
      const rows = FB.searchAccounts ? await FB.searchAccounts(name) : await FB.findByName(name).then((u) => (u ? [u] : []));
      return { rows: rows || [] };
    } catch (e) { return { error: 'net' }; }
  }
  async function verify(uid, pin) {
    const FB = await fb();
    if (!FB) return { error: 'net' };
    try { const h = await FB.hashPw(pin); return { ok: !!(await FB.verifyGamePw(uid, h)) }; } catch (e) { return { error: 'net' }; }
  }

  /* ══ 賞金 ══ */
  const PRIZES = () => (root.GameLink && GameLink.PRIZES) || [250, 200, 150, 100, 50];
  function queueLoad() { const a = jget(PRIZEQ, []); return Array.isArray(a) ? a : []; }
  function queueSave(a) { try { if (a.length) localStorage.setItem(PRIZEQ, JSON.stringify(a.slice(0, 80))); else localStorage.removeItem(PRIZEQ); } catch (e) { /* 同上 */ } }
  let flushing = false;
  /* 送り待ちの賞金を送る（1件ずつ・送れたものだけ消す＝二重に送らない） */
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
    } catch (e) { /* 次にオンラインになったときにもう一度 */ }
    flushing = false;
    return sent;
  }
  root.addEventListener('online', () => { setTimeout(flushQueue, 1500); });
  setTimeout(flushQueue, 4000);

  function stats() { const s = jget(STATS, {}); return s && typeof s === 'object' ? s : {}; }
  /* 試合の結果：戦績をためて、賞金を配る。
     rows＝[{ name, uid, owner, rank, left, turns }]（順位は同じ数なら同じ順位）
     opt＝{ gid }  戻り値＝{ prizes:[{ rank, name, amount, kind:"me"|"cloud"|"wait" }], short } */
  async function report(rows, opt) {
    opt = opt || {};
    const out = { prizes: [], short: false };
    try {
      const st = stats();
      rows.forEach((p) => {
        const id = p.owner ? 'me' : p.uid ? p.uid : 'local:' + p.name;
        const r = st[id] || { name: p.name, games: 0, wins: 0, at: 0 };
        r.name = p.name; r.games++; r.at = Date.now();
        if (p.rank === 1) r.wins++;
        st[id] = r;
      });
      jset(STATS, st);
    } catch (e) { /* 戦績が書けなくても賞金は配る */ }

    const humans = rows.length;
    const short = humans < 2 || rows.some((p) => (p.turns || 0) < MIN_TURNS);
    if (short) { out.short = true; return out; }
    const P = PRIZES();
    const pay = rows.map((p) => {
      if (!p.owner && !p.uid) return null;
      const amt = P[p.rank - 1];
      return amt ? { p, amt, why: p.rank + '位 賞金（MagiGura Plate）' } : null;
    }).filter(Boolean);
    const queue = queueLoad();
    let FB = null;
    if (pay.some((x) => !x.p.owner) && navigator.onLine !== false) { try { FB = await fb(3000); } catch (e) { FB = null; } }
    for (const x of pay) {
      if (x.p.owner) {
        /* その端末の本人：この端末の財布へ直接（オフラインでも入る。オンラインに戻ると同期で足される） */
        try { if (root.XEVA) XEVA.add(x.amt, x.why); } catch (e) { /* 財布が使えない */ }
        out.prizes.push({ rank: x.p.rank, name: x.p.name, amount: x.amt, kind: 'me' });
        continue;
      }
      let done = false;
      if (FB && FB.awardXeva) { const r = await FB.awardXeva(x.p.uid, x.amt, x.why).catch(() => null); done = !!(r && r.ok); }
      if (!done) queue.push({ id: (opt.gid || Date.now()) + ':' + x.p.uid, uid: x.p.uid, amt: x.amt, why: x.why, at: Date.now() });
      out.prizes.push({ rank: x.p.rank, name: x.p.name, amount: x.amt, kind: done ? 'cloud' : 'wait' });
    }
    queueSave(queue);
    return out;
  }

  GP.Account = { recent, remember, me, thumb, urList, picSrc, refresh, search, verify, report, stats, flushQueue, queueLoad, PRIZES, MIN_TURNS };
})(window);
