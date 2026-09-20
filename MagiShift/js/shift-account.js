/* ============================================================
   MagiShift — XEVARION アカウントの紐づけ（ゲーム本体と切りはなす）
   ------------------------------------------------------------
   ★ ご指定どおり、<b>ゲームの中身とは別のファイル</b>にしてある。
     XEVARION 側のしくみが変わっても、ここだけ直せばよい。
   ・実体は XEVARION 共通の GameLink（../game-link.js）。
     表示名で検索 → 候補から選ぶ → 4桁パスワード、という XEVARION と同じ流れ。
   ・パスワードはここでも保存しない（GameLink が確認に使うだけ）。
   ・アカウントを使わずに「Player 1」のまま遊ぶこともできる。
   ============================================================ */
(function () {
  "use strict";
  const MS = (window.MShift = window.MShift || {});
  const KEY = "magishift_link_v1";     /* この端末で前に紐づけた人（次回の候補に出す） */

  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || "[]") || []; } catch (e) { return []; } };
  const save = (a) => { try { localStorage.setItem(KEY, JSON.stringify(a.slice(0, 12))); } catch (e) {} };

  function remember(acc) {
    if (!acc || !acc.uid) return;
    const a = load().filter((x) => x.uid !== acc.uid);
    a.unshift({ uid: acc.uid, name: acc.name, charFile: acc.charFile || "", charId: acc.charId || "" });
    save(a);
  }

  /* この端末のポータルのアカウント（ログインしている人） */
  function portalAccount() {
    try {
      const a = JSON.parse(localStorage.getItem("xeva_account_v1") || "null");
      if (a && a.xvUid && a.name) {
        let cf = a.charFile || "";
        if (!cf && window.XEVA && XEVA.account && XEVA.account.getChar) { const ch = XEVA.account.getChar(); if (ch && ch.file) cf = ch.file; }
        return { uid: a.xvUid, name: a.name, charFile: cf, charId: a.charId || "" };
      }
    } catch (e) {}
    return null;
  }

  /* アカウントを選ぶ（GameLink の画面を借りる）。戻り値は { uid, name, charFile } か null */
  async function pick(current) {
    if (!window.GameLink) return null;
    const res = await window.GameLink.link(current ? current.name : "");
    if (!res) return null;
    if (res.remove) return { remove: true };
    if (!res.uid) return null;
    const acc = { uid: res.uid, name: String(res.name || "プレイヤー").slice(0, 10), charFile: res.charFile || "", charId: res.charId || "" };
    remember(acc);
    return acc;
  }

  const avatar = (acc) => {
    if (!acc || !acc.charFile) return "";
    let cf = acc.charFile;
    if (window.XEVA && XEVA.canonCharFile) cf = XEVA.canonCharFile(cf, acc.charId);
    return cf ? "../chars/" + cf : "";
  };

  /* 試合の結果を XEVARION へ（順位に応じた XEVA と、戦績の保存）
     ★ 遊ぶのに必要のない個人情報は送らない（uid と表示名と順位だけ）。 */
  async function report(state, standings) {
    const linked = standings.filter((p) => p.uid);
    const out = { prizes: [], saved: false };
    if (!linked.length) return out;
    /* 戦績（この端末にためる。XEVARION 側で見るときのために同じ形で持つ） */
    try {
      const k = "magishift_stats_v1";
      const st = JSON.parse(localStorage.getItem(k) || "{}");
      standings.forEach((p) => {
        const id = p.uid || ("local:" + p.slot);
        const r = st[id] || { name: p.name, games: 0, wins: 0, best: 99, at: 0 };
        r.name = p.name; r.games++; r.at = Date.now();
        if (p.rank === 1) r.wins++;
        if (p.rank < r.best) r.best = p.rank;
        st[id] = r;
      });
      localStorage.setItem(k, JSON.stringify(st));
      out.saved = true;
    } catch (e) {}
    /* 賞金（1位から順に。紐づけた人だけ） */
    try {
      if (window.GameLink && navigator.onLine !== false) {
        out.prizes = await window.GameLink.awardPrizes(linked.map((p) => ({ uid: p.uid, name: p.name, game: "MagiShift" })));
      }
    } catch (e) {}
    return out;
  }

  function stats() {
    try { return JSON.parse(localStorage.getItem("magishift_stats_v1") || "{}"); } catch (e) { return {}; }
  }

  MS.Account = { pick, portalAccount, recent: load, remember, avatar, report, stats };
})();
