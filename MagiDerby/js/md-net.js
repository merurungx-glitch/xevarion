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
  N.race = (rid, final, force) => getJSON("race/" + rid + ".json", force ? 0 : final ? 1e13 : 60000, true, final ? (d) => !!(d && d.result) : null);
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
  N.saleAt = (r) => N.dayAt(r.date, -D.SALE_OPEN_DAY);      /* 発売開始（レースの日の 0:00） */
  N.payAt = (r) => N.dayAt(r.date, D.PAYOUT_DAY);           /* 払い戻し（次の日の 0:00） */
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
  N.STATUS = { sched: "登録前", entry: "枠順確定前", pre: "発売前", sale: "発売中", closed: "締切", run: "発走", wait: "結果待ち", final: "確定" };
  N.status = function (r, now) {
    if (!r) return "sched";
    if (r.st === "result") return "final";
    const post = N.postAt(r);
    if (now >= post) return now < post + 4 * 60000 ? "run" : "wait";
    if (!r.rid || r.st === "sched") return "sched";
    if (now >= N.closeAt(r)) return "closed";
    if (r.st === "entry") return "entry";
    if (now < N.saleAt(r)) return "pre";                     /* 枠順は決まったが、発売（当日の 0:00）の前 */
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
  N.runners = function (race) {
    /* 確定していれば結果の並び（取消・除外も含む）、そうでなければ出馬表 */
    if (race && race.result && race.result.rows && race.result.rows.length) {
      const ents = {}; (race.entries || []).forEach((e) => { ents[e.hid] = e; });
      return race.result.rows.map((x) => Object.assign({}, ents[x.hid] || {}, { hid: x.hid, nm: x.nm, waku: x.waku, no: x.no, sa: x.sa, kg: x.kg, j: x.j, jid: x.jid, tr: x.tr, trb: x.trb, bw: x.bw, cx: /取消|除外/.test(x.pos) ? 1 : 0, res: x }));
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
