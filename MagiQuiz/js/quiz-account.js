/* ============================================================
   MagiQuiz — XEVARION アカウントの紐づけ・賞金・戦績（ゲーム本体と切りはなす）
   ------------------------------------------------------------
   ・MagiShift（shift-account.js）と同じしくみ。実体は XEVARION 共通の GameLink（../game-link.js）。
     表示名で検索 → 候補から選ぶ → 4桁パスワード。パスワードは保存しない（GameLink が確認に使うだけ）。
   ・賞金は GameLink.awardPrizes に<b>順位そのまま</b>（1位250・2位200・3位150・4位100・5位50 XEVA）。
     チーム戦は、チームの順位を<b>メンバー全員</b>に（紐づけた人だけ）。
   ・戦績はこの端末に（紐づけた人は uid ごと・紐づけていない人は名前ごと）。
   ============================================================ */
(function () {
  "use strict";
  const MQ = (window.MQ = window.MQ || {});
  const KEY = "magiquiz_link_v1";       /* この端末で前に紐づけた人（次回の候補） */
  const STATS = "magiquiz_stats_v1";

  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || "[]") || []; } catch (e) { return []; } };
  const save = (a) => { try { localStorage.setItem(KEY, JSON.stringify(a.slice(0, 12))); } catch (e) {} };
  function remember(acc) {
    if (!acc || !acc.uid) return;
    const a = load().filter((x) => x.uid !== acc.uid);
    a.unshift({ uid: acc.uid, name: acc.name, charFile: acc.charFile || "", charId: acc.charId || "" });
    save(a);
  }
  /* 小さいアイコン（MagiShift の thumb と同じ組み立て） */
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

  /* 試合の結果：戦績をためて、紐づけた人に賞金。
     rows＝[{ uid, name, rank, ok:正解数, n:答えた数, pt:ミリオネアの賞金 }]（チーム戦はメンバー1人ずつ） */
  async function report(rows, opt) {
    const out = { prizes: [], saved: false };
    try {
      const st = stats();
      rows.forEach((p) => {
        const id = p.uid || ("local:" + p.name);
        const r = st[id] || { name: p.name, games: 0, wins: 0, ok: 0, n: 0, best: 0, at: 0 };
        r.name = p.name; r.games++; r.at = Date.now();
        if (p.rank === 1) r.wins++;
        r.ok += p.ok || 0; r.n += p.n || 0;
        if ((p.pt || 0) > (r.best || 0)) r.best = p.pt;
        st[id] = r;
      });
      localStorage.setItem(STATS, JSON.stringify(st));
      out.saved = true;
    } catch (e) {}
    /* XEVA ミッション「MagiQuiz でクイズ対戦をあそぼう」 */
    try { if (window.XEVA && XEVA.completeMission) XEVA.completeMission("magiquiz_play"); } catch (e) {}
    const linked = rows.filter((p) => p.uid && p.rank <= 5);
    if (!linked.length || (opt && opt.noPrize)) return out;
    try {
      if (window.GameLink && navigator.onLine !== false) {
        out.prizes = await window.GameLink.awardPrizes(linked.map((p) => ({ uid: p.uid, name: p.name, rank: p.rank, game: "MagiQuiz" })));
      }
    } catch (e) {}
    return out;
  }
  function stats() { try { return JSON.parse(localStorage.getItem(STATS) || "{}") || {}; } catch (e) { return {}; } }

  MQ.Account = { recent: load, remember, thumb, refresh, report, stats };
})();
