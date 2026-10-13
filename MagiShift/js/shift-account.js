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
  /* ★★ 2026-10-13 小さいアイコン用（MagiChainParty の olCharImg と同じ組み立て）。
     MagiBurst のキャラは "../img/Xxx.webp" → "../chars_s/../img/t_Xxx.webp"＝img/t_Xxx.webp。
     読めないときはページ全体の img onerror（xeva.js）が原寸へ差し戻す。 */
  const thumb = (acc) => {
    if (!acc || !acc.charFile) return "";
    const X = window.XEVA || {};
    const f = X.canonCharFile ? X.canonCharFile(acc.charFile, acc.charId) : String(acc.charFile);
    if (!f) return "";
    const isMb = X.isMbCharFile ? X.isMbCharFile(f) : /^\.\.\/(img|MagiBurst\/img)\//.test(f);
    const th = isMb ? (X.charThumbFile ? X.charThumbFile(f) : f.replace(/\/([^/]+)$/, "/t_$1")) : f.replace(/\.(png|jpe?g)$/i, "") + ".jpg";
    return "../chars_s/" + th;
  };

  /* 試合の結果を XEVARION へ（順位に応じた XEVA と、戦績の保存）
     ★ 遊ぶのに必要のない個人情報は送らない（uid と表示名と順位だけ）。 */
  async function report(state, standings) {
    const linked = standings.filter((p) => p.uid);
    const out = { prizes: [], saved: false };
    const draw = !!(state && state.draw);
    /* 戦績（この端末にためる。XEVARION 側で見るときのために同じ形で持つ）
       ★★ 2026-10-13 紐づけていない人のぶんもためる（前は紐づけた人がいないと何も残らなかった）。CPU はためない。 */
    try {
      const k = "magishift_stats_v1";
      const st = JSON.parse(localStorage.getItem(k) || "{}");
      standings.forEach((p) => {
        if (p.type === "cpu") return;
        const id = p.uid || ("local:" + p.name);
        const r = st[id] || { name: p.name, games: 0, wins: 0, best: 99, at: 0 };
        r.name = p.name; r.games++; r.at = Date.now();
        if (!draw && p.rank === 1) r.wins++;
        if (!draw && p.rank < r.best) r.best = p.rank;
        st[id] = r;
      });
      localStorage.setItem(k, JSON.stringify(st));
      out.saved = true;
    } catch (e) {}
    /* 賞金（紐づけた人だけ・引き分けはなし）。
       ★★ 2026-10-13 順位は<b>そのままの順位</b>で渡す（紐づけていない人・CPU は uid なし＝飛ばす）。
       前は紐づけた人だけを詰めて渡していたので、CPU に負けた3位の人が「1位の賞金」を受け取れてしまった
       （MagiChainParty と同じ渡しかたにそろえた）。 */
    if (!linked.length || draw) return out;
    try {
      if (window.GameLink && navigator.onLine !== false) {
        out.prizes = await window.GameLink.awardPrizes(standings.slice(0, 5).map((p) => ({ uid: p.uid || null, name: p.name, game: "MagiShift" })));
      }
    } catch (e) {}
    return out;
  }

  /* ★★ 2026-10-13 紐づけたアカウントの「今の」名前・キャラを取り直す（MagiChainParty と同じ）。
     取れなかったときは null（前の値のまま使う）。 */
  function refresh(acc) {
    if (!window.GameLink || !window.GameLink.refresh || !acc || !acc.uid || navigator.onLine === false) return Promise.resolve(null);
    return window.GameLink.refresh(acc).catch(() => null);
  }

  function stats() {
    try { return JSON.parse(localStorage.getItem("magishift_stats_v1") || "{}"); } catch (e) { return {}; }
  }

  MS.Account = { pick, portalAccount, recent: load, remember, avatar, thumb, report, stats, refresh };
})();
