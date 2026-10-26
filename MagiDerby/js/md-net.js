/* ============================================================
   MagiDerby — データの読みこみ・時刻・レースの状態（★★ 2026-10-21）
   ------------------------------------------------------------
   ・自動取得（derby.py）が GitHub の magiscope-data ブランチの derby/ に置いた JSON を読む。
       index.json            … 今年の GⅠ 24レース（日程・race_id・発走時刻・状態・勝ち馬・配当の一部）
       race/<race_id>.json   … 出馬表・出走馬（プロフィール・血統・近走）・オッズ（単勝・複勝）・結果・払戻金
       odds/<race_id>.json   … 前日〜当日のオッズ（枠連・馬連・ワイド・馬単・3連複・3連単）
       silks/<馬主id>.gif    … 勝負服
   ・一度読んだものは端末に控える（オフラインでも出馬表・結果が見られる）。確定したレースは取り直さない。
   ・レースの状態は「自動取得の状態」＋「サーバーの時刻」で決める（締切は発走の CLOSE_BEFORE 秒前）。
   ============================================================ */
(function () {
  "use strict";
  const D = window.MD_DATA;
  const N = (window.MD_NET = {});

  N.base = function () {
    try { const o = localStorage.getItem("md_data_base"); if (o) return String(o).replace(/\/?$/, "/"); } catch (e) {}
    return D.DATA_DEFAULT;
  };
  N.silk = (oid) => (oid ? N.base() + "silks/" + oid + ".gif" : "");

  /* ── 端末の控え（localStorage）── */
  const CK = "md_cache_v1:";
  function cget(k) { try { const r = localStorage.getItem(CK + k); return r ? JSON.parse(r) : null; } catch (e) { return null; } }
  function cset(k, v) {
    const s = JSON.stringify(v);
    try { localStorage.setItem(CK + k, s); return; } catch (e) {}
    /* いっぱい → 確定していない古いレースの控えから消す */
    try {
      const ks = []; for (let i = 0; i < localStorage.length; i++) { const x = localStorage.key(i); if (x && x.indexOf(CK + "race/") === 0) ks.push(x); }
      ks.sort((a, b) => ((cget(a.slice(CK.length)) || {}).at || 0) - ((cget(b.slice(CK.length)) || {}).at || 0));
      for (let i = 0; i < Math.min(6, ks.length); i++) localStorage.removeItem(ks[i]);
      localStorage.setItem(CK + k, s);
    } catch (e) {}
  }
  const mem = new Map(), inflight = new Map();
  N.online = null;
  /* valid：控えをそのまま使ってよいか（確定したレースなのに結果の無い古い控え、を使わないため） */
  async function getJSON(name, ttl, persist, valid) {
    const m = mem.get(name);
    if (m && Date.now() - m.at < ttl && (!valid || valid(m.data))) return m.data;
    if (inflight.has(name)) return inflight.get(name);
    const p = (async () => {
      try {
        const r = await fetch(N.base() + name + "?t=" + Math.floor(Date.now() / 60000), { cache: "no-cache" });
        if (r.status === 404) { const e = new Error("nodata"); e.code = "nodata"; throw e; }
        if (!r.ok) throw new Error("HTTP " + r.status);
        const j = await r.json();
        mem.set(name, { at: Date.now(), data: j });
        if (persist) cset(name, { at: Date.now(), data: j });
        N.online = true;
        return j;
      } catch (e) {
        if (e.code !== "nodata") N.online = false;
        if (m) { m.at = Date.now() - ttl + 30000; return m.data; }
        const c = persist ? cget(name) : null;
        if (c && c.data) { mem.set(name, { at: Date.now() - ttl + 30000, data: c.data, stale: true }); return c.data; }
        throw e;
      } finally { inflight.delete(name); }
    })();
    inflight.set(name, p);
    return p;
  }
  /* いま手元にあるもの（通信しない） */
  N.peek = function (name) { const m = mem.get(name); if (m) return m.data; const c = cget(name); return c ? c.data : null; };
  N.index = (force) => getJSON("index.json", force ? 0 : 60000, true);
  /* ★★ 2026-10-26 結果が途中（速報で上位だけ）の控えは「確定した控え」として使わない（全頭そろうまで読み直す） */
  N.race = (rid, final, force) => getJSON("race/" + rid + ".json", force ? 0 : final ? 1e13 : 60000, true, final ? (d) => !!(d && d.result && !N.partial(d)) : null);
  N.odds = (rid, force) => getJSON("odds/" + rid + ".json", force ? 0 : 60000, false);
  N.peekRace = (rid) => N.peek("race/" + rid + ".json");
  N.peekIndex = () => N.peek("index.json");

  /* ══════════ 時刻（JST） ══════════ */
  const JST = 9 * 3600000;
  N.postAt = function (r) {
    const d = String(r.date || "").split("-").map(Number), t = String(r.post || "15:40").split(":").map(Number);
    return Date.UTC(d[0], d[1] - 1, d[2], t[0], t[1]) - JST;
  };
  N.closeAt = (r) => N.postAt(r) - D.CLOSE_BEFORE * 1000;
  /* その日の 0:00（JST）から days 日ずらした時刻 */
  N.dayAt = function (date, days) { const d = String(date || "").split("-").map(Number); return Date.UTC(d[0], d[1] - 1, d[2] + (days || 0), 0, 0) - JST; };
  /* ══ ★★ 2026-10-22 ご指定「馬券の注文は実際の開始日時と同じに」＝ JRA のネット投票（即PAT）と同じ発売の時間
     （JRA 公式「即PAT 会員の発売時間（2026年）」：GⅠ の前日発売＝金曜 18:30〜土曜 17:30／日曜のレースの当日発売＝土曜 19:30〜／
       土曜のレース＝金曜 18:30〜／月曜のレース＝日曜 19:30〜（月曜の重賞の前日発売＝土曜 19:30〜日曜 17:30））
     ・日曜のレース … [金曜 18:30, 土曜 17:30) と [土曜 19:30, 締切)。土曜 17:30〜19:30 は前日発売と当日発売の切りかえで<b>発売していない</b>（JRA と同じ）
     ・土曜のレース … [金曜 18:30, 締切)
     ・月曜のレース … [土曜 19:30, 日曜 17:30) と [日曜 19:30, 締切)
     ・そのほかの曜日（年末などの特別な開催日）… [前日 19:30, 締切)
     締切は今までどおり発走の CLOSE_BEFORE 前（2分前）。判定はサーバーの時刻（B.clock）。
     ★ 夏の「競走時間帯の拡大」期間（7〜8月）に GⅠ は無いので扱わない。 */
  N.at = function (date, days, hh, mm) { const d = String(date || "").split("-").map(Number); return Date.UTC(d[0], d[1] - 1, d[2] + (days || 0), hh || 0, mm || 0) - JST; };
  /* ══ ★★ 2026-10-24 ご指定「馬券を購入できる日時を少し早く（金曜日の 0:00 からや木曜日からなど）」══
     → 土・日・月曜のレースは<b>その週の木曜 0:00</b> から、ほかの曜日（年末などの特別な開催日）は<b>2日前の 0:00</b> から、
       締切（発走の2分前）まで<b>ずっと</b>発売（前日発売と当日発売のあいだの休みもなくした）。
     ★★ 2026-10-24 ご指定「木曜の 0:00 から、枠順が出ていなくても買えるように」：枠順（馬番）の発表前も発売中。
       そのあいだは馬に<b>仮の番号</b>を付けて馬名で買い（N.betRace）、発表されたら券の番号を本当の馬番へ差し替える（md-bet の B.fixPre）。
     ★ ホームの「発売中」の札（home-mate.js の derbySale）も同じ決まり。片方を変えたらもう一方も。 */
  /* ★★ 2026-10-26 ご指定「馬券の購入を発走から三日前からできるように」
     → どの曜日のレースも<b>レースの日の3日前の 0:00</b>（D.SALE_DAYS_BEFORE）から締切までずっと（日曜のレース＝木曜 0:00・土曜＝水曜 0:00）。 */
  /* ★★ 2026-10-27 ご指定「馬券を水曜日の 0:00 から」→ レースの日の前の水曜 0:00（D.saleBack）から締切までずっと */
  N.saleWins = function (r) {
    return [[N.at(r.date, -D.saleBack(r.date), 0, 0), N.closeAt(r)]];
  };
  N.saleAt = (r) => N.saleWins(r)[0][0];                     /* 発売開始（いちばん最初の窓） */
  /* いま発売しているか（窓の中か）／次に発売が始まる時刻（無ければ null） */
  N.onSale = (r, t) => N.saleWins(r).some((w) => t >= w[0] && t < w[1]);
  N.nextSaleAt = function (r, t) { const w = N.saleWins(r).find((x) => t < x[0]); return w ? w[0] : null; };
  /* ★★ 2026-10-26 ご指定「結果や払い戻しは端末が情報を受信でき次第行って」→ 待つ時刻は無し（＝発走の時刻。結果のデータが届けばすぐ精算）。
     そのかわり画面に「データが届きしだい・取得の時刻は前後する」と出す（md-ui の PAY_NOTE） */
  N.payAt = (r) => N.postAt(r);
  N.dtStr = function (ms) { return N.dateStr(N.ymd(ms)) + " " + N.hm(ms); };
  N.WD = ["日", "月", "火", "水", "木", "金", "土"];
  N.dateStr = function (date, withWd) {
    const p = String(date).split("-").map(Number); if (p.length < 3) return date;
    const wd = new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay();
    return p[1] + "/" + p[2] + (withWd === false ? "" : "(" + N.WD[wd] + ")");
  };
  N.hms = function (ms) { const d = new Date(ms + JST); return [d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()].map((x) => String(x).padStart(2, "0")).join(":"); };
  N.hm = function (ms) { const d = new Date(ms + JST); return String(d.getUTCHours()).padStart(2, "0") + ":" + String(d.getUTCMinutes()).padStart(2, "0"); };
  N.ymd = function (ms) { const d = new Date(ms + JST); return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0") + "-" + String(d.getUTCDate()).padStart(2, "0"); };
  /* 残り時間 → 「2日 03:12:05」「12:05」 */
  N.left = function (ms) {
    if (ms <= 0) return "0:00";
    const s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    if (d > 0) return d + "日 " + String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0") + ":" + String(x).padStart(2, "0");
    if (h > 0) return h + ":" + String(m).padStart(2, "0") + ":" + String(x).padStart(2, "0");
    return m + ":" + String(x).padStart(2, "0");
  };

  /* ══════════ レースの状態 ══════════
     sched 出走登録の前／entry 枠順確定の前（馬番がまだない）／sale 発売中／closed 締切（発走待ち）
     run 発走（走っている）／wait 結果待ち（自動取得を待っている）／final 確定 */
  N.STATUS = { sched: "登録前", entry: "枠順確定前", pre: "発売前", gap: "当日発売前", sale: "発売中", closed: "締切", run: "発走", wait: "結果待ち", final: "確定" };   /* ★★ 2026-10-22 gap＝前日発売の締切（土曜 17:30）〜当日発売（土曜 19:30） */
  N.status = function (r, now) {
    if (!r) return "sched";
    if (r.st === "result") return "final";
    const post = N.postAt(r);
    if (now >= post) return now < post + 4 * 60000 ? "run" : "wait";
    if (!r.rid || r.st === "sched") return "sched";
    if (now >= N.closeAt(r)) return "closed";
    /* ★★ 2026-10-24 枠順の発表前（r.st＝entry）でも、発売の時刻（★ 2026-10-27 から水曜 0:00）を過ぎていれば発売中（馬名で買う） */
    if (now < N.saleAt(r)) return r.st === "entry" ? "entry" : "pre";
    if (!N.onSale(r, now)) return "gap";                     /* ★★ 2026-10-22 前日発売と当日発売のあいだ（JRA と同じく買えない） */
    return "sale";
  };
  /* いちばん大事なレース（走っている・結果待ち → 次に発走する → 最後に確定したもの） */
  N.focusRace = function (races, now) {
    const list = races || [];
    const live = list.find((r) => { const s = N.status(r, now); return s === "run" || s === "wait"; });
    if (live) return live;
    const next = list.find((r) => N.postAt(r) > now);
    if (next) return next;
    for (let i = list.length - 1; i >= 0; i--) if (list[i].st === "result") return list[i];
    return list[list.length - 1] || null;
  };

  /* ══════════ 出馬表・結果の読みかえ ══════════ */
  /* ══ ★★ 2026-10-24 枠順の発表前の発売 ══
     preDraw … 出馬表はあるが、出走する馬にまだ馬番が無い（結果が出ていない）
     betRace … 発表前なら、出走する馬を出馬表の並び（登録の順）で 1,2,3… の<b>仮の番号</b>にした写し（枠は無し・pre:true）。
               買う画面はこれを使うので、選び方・組み合わせの作り方は発表後と同じ。券には「仮の番号 → 馬（hid）」を残す（B.buy）。 */
  N.preDraw = function (race) {
    if (!race || (race.result && race.result.rows && race.result.rows.length)) return false;
    const act = (race.entries || []).filter((e) => !e.cx);
    return act.length > 0 && act.some((e) => !e.no);
  };
  N.betRace = function (race) {
    if (!N.preDraw(race)) return race;
    const act = (race.entries || []).filter((e) => !e.cx).slice().sort((a, b) => (a.idx || 0) - (b.idx || 0));
    /* ★★ 2026-10-27 単勝の予想オッズ（馬の id で引く yoso）は残す＝発表前でも単勝の予想と、ほかの券種の試算（md-bet の B.est）が出せる */
    return Object.assign({}, race, { pre: true, odds: race.odds && race.odds.kind === "yoso" ? race.odds : null, entries: act.map((e, i) => Object.assign({}, e, { no: i + 1, waku: null, pno: i + 1 })) });
  };
  /* ★★ 2026-10-26 結果の表が途中か（自動取得の part の印・または出走頭数より行が少ない＝速報で上位だけ） */
  N.partial = function (race) {
    const res = race && race.result; if (!res) return false;
    if (res.part) return true;
    const need = race.heads || 0;
    return need > 0 && (res.rows || []).length < need;
  };
  N.runners = function (race) {
    /* 確定していれば結果の並び（取消・除外も含む）、そうでなければ出馬表 */
    if (race && race.result && race.result.rows && race.result.rows.length) {
      const ents = {}; (race.entries || []).forEach((e) => { ents[e.hid] = e; });
      const out = race.result.rows.map((x) => Object.assign({}, ents[x.hid] || {}, { hid: x.hid, nm: x.nm, waku: x.waku, no: x.no, sa: x.sa, kg: x.kg, j: x.j, jid: x.jid, tr: x.tr, trb: x.trb, bw: x.bw, cx: /取消|除外/.test(x.pos) ? 1 : 0, res: x }));
      /* ★★ 2026-10-26 結果の表が途中まで（速報で上位だけ）のときは、出馬表の残りの馬もうしろにつなぐ（名前・馬番の引き当て用） */
      const seen = {}; out.forEach((x) => { if (x.hid) seen[x.hid] = 1; });
      (race.entries || []).forEach((e) => { if (e.hid && !seen[e.hid]) out.push(Object.assign({}, e)); });
      return out;
    }
    return (race && race.entries) || [];
  };
  /* 単勝オッズ・人気（予想オッズのときは馬の id で引く） */
  N.winOdds = function (race, e) {
    if (!race || !e) return null;
    if (e.res && e.res.odds) return [e.res.odds, e.res.pop];
    const o = race.odds;
    if (!o) return null;
    if (o.kind === "yoso") return (o.winH && o.winH[e.hid]) || null;
    return (o.win && e.no && o.win[String(e.no)]) || null;
  };
  N.placeOdds = function (race, e) {
    const o = race && race.odds;
    if (!o || o.kind === "yoso" || !o.place || !e || !e.no) return null;
    return o.place[String(e.no)] || null;
  };
  N.oddsKindNm = { yoso: "予想オッズ", middle: "発売中", result: "確定オッズ" };
  N.going = (g) => D.GOING_FULL[g] || g || "";
  /* 着順の数（1着＝1）。取消・除外・中止は 99 */
  N.posNum = (p) => { const n = parseInt(p, 10); return isFinite(n) ? n : 99; };
  /* 馬体重 "452(+2)" → [452, 2] */
  N.bw = function (s) { const m = String(s || "").match(/(\d+)\(([+-]?\d+)\)/); return m ? [Number(m[1]), Number(m[2])] : null; };
})();
